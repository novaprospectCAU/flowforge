/**
 * AI 프로바이더 공통 인터페이스 및 유틸리티
 */

import type {
  AIProvider,
  AIProviderType,
  LLMChatRequest,
  LLMChatResponse,
  ImageGenerateRequest,
  ImageGenerateResponse,
  StreamChunkCallback,
} from '../types';

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
 * 기본 프로바이더 추상 클래스
 */
export abstract class BaseProvider implements AIProvider {
  abstract name: AIProviderType;
  abstract models: string[];

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
   * HTTP 요청 헬퍼
   */
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs = 60000
  ): Promise<Response> {
    const controller = new AbortController();
    const signal = options.signal;

    // 원본 signal과 타임아웃 signal을 합성
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
