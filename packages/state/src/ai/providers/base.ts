/**
 * AI 프로바이더 공통 인터페이스 및 유틸리티
 */

/**
 * API 타임아웃 상수 (밀리초)
 */
export const API_TIMEOUTS = {
  /** 기본 요청 타임아웃 */
  DEFAULT: 60000,
  /** API 키 검증용 짧은 타임아웃 */
  VALIDATION: 10000,
  /** 이미지 생성용 긴 타임아웃 */
  IMAGE_GENERATION: 120000,
} as const;

import type {
  AIProvider,
  AIProviderType,
  LLMChatRequest,
  LLMChatResponse,
  ImageGenerateRequest,
  ImageGenerateResponse,
  StreamChunkCallback,
} from '../types';
import { RequestQueue } from '../rateLimiter';

/**
 * 재시도 설정
 */
export interface RetryConfig {
  maxRetries: number;     // default: 3
  baseDelayMs: number;    // default: 1000
  maxDelayMs: number;     // default: 60000
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
};

/** 재시도 가능한 HTTP 상태 코드 */
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);

/**
 * 프로바이더 레지스트리
 */
class ProviderRegistry {
  private providers: Map<AIProviderType, AIProvider> = new Map();

  /**
   * 프로바이더 등록
   */
  register(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * 프로바이더 조회
   */
  get(name: AIProviderType): AIProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * 모든 프로바이더 조회
   */
  getAll(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 채팅 지원 프로바이더 조회
   */
  getChatProviders(): AIProvider[] {
    return this.getAll().filter(p => p.chat !== undefined);
  }

  /**
   * 이미지 생성 지원 프로바이더 조회
   */
  getImageProviders(): AIProvider[] {
    return this.getAll().filter(p => p.generateImage !== undefined);
  }
}

// 싱글톤 인스턴스
export const providerRegistry = new ProviderRegistry();

/**
 * Retry-After 헤더를 파싱하여 대기 시간(ms) 반환
 */
function parseRetryAfter(response: Response): number | null {
  const retryAfter = response.headers.get('Retry-After');
  if (!retryAfter) return null;

  // 초 단위 숫자
  const seconds = Number(retryAfter);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // HTTP-date 형식
  const date = Date.parse(retryAfter);
  if (!isNaN(date)) {
    return Math.max(0, date - Date.now());
  }

  return null;
}

/**
 * abort-aware sleep
 * AbortSignal이 abort되면 즉시 reject
 */
function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timer = setTimeout(resolve, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(signal!.reason ?? new DOMException('Aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * 기본 프로바이더 추상 클래스
 */
export abstract class BaseProvider implements AIProvider {
  abstract name: AIProviderType;
  abstract models: string[];

  protected requestQueue: RequestQueue;
  protected retryConfig: RetryConfig;

  constructor(maxConcurrent: number = 3, retryConfig?: Partial<RetryConfig>) {
    this.requestQueue = new RequestQueue(maxConcurrent);
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  abstract chat(request: LLMChatRequest, apiKey: string): Promise<LLMChatResponse>;

  chatStream?(
    request: LLMChatRequest,
    apiKey: string,
    onChunk: StreamChunkCallback
  ): Promise<LLMChatResponse>;

  generateImage?(
    request: ImageGenerateRequest,
    apiKey: string
  ): Promise<ImageGenerateResponse>;

  validateKey?(apiKey: string): Promise<boolean>;

  /**
   * HTTP 요청 헬퍼 (자동 재시도 + Rate Limiting)
   */
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs = 60000
  ): Promise<Response> {
    await this.requestQueue.acquire();

    try {
      return await this.fetchWithRetry(url, options, timeoutMs);
    } finally {
      this.requestQueue.release();
    }
  }

  /**
   * 재시도 로직이 포함된 fetch
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    const { maxRetries, baseDelayMs, maxDelayMs } = this.retryConfig;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const signal = options.signal;

      // 원본 signal과 타임아웃 signal을 합성
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      if (signal) {
        if (signal.aborted) {
          clearTimeout(timeoutId);
          throw signal.reason ?? new DOMException('Aborted', 'AbortError');
        }
        signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        // 재시도 불가능한 응답이거나 마지막 시도면 그대로 반환
        if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === maxRetries) {
          return response;
        }

        // 재시도 가능한 에러 → 대기 후 재시도
        const retryAfterMs = parseRetryAfter(response);
        const backoffMs = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        const delayMs = retryAfterMs ?? backoffMs;

        await abortableSleep(delayMs, options.signal as AbortSignal | undefined);
      } catch (error) {
        clearTimeout(timeoutId);

        // AbortError는 재시도하지 않음
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }

        // 마지막 시도면 에러 전파
        if (attempt === maxRetries) {
          throw error;
        }

        // 네트워크 에러 등 재시도
        const backoffMs = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        await abortableSleep(backoffMs, options.signal as AbortSignal | undefined);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // 도달 불가 (타입 안정성)
    throw new Error('Retry loop exhausted');
  }
}
