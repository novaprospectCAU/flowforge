/**
 * AI 모듈 타입 정의
 */

// =============================================================================
// API 키 관리
// =============================================================================

/** 지원하는 AI 프로바이더 */
export type AIProviderType = 'openai' | 'anthropic';

/** API 키 엔트리 */
export interface APIKeyEntry {
  id: string;
  provider: AIProviderType;
  name: string;
  key: string; // 암호화된 키
  createdAt: number;
  lastUsedAt?: number;
}

/** 마스킹된 API 키 (UI 표시용) */
export interface MaskedAPIKeyEntry {
  id: string;
  provider: AIProviderType;
  name: string;
  maskedKey: string; // sk-...xxxx
  createdAt: number;
  lastUsedAt?: number;
}

// =============================================================================
// LLM Chat
// =============================================================================

/** 채팅 메시지 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** LLM 채팅 요청 */
export interface LLMChatRequest {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  signal?: AbortSignal;
}

/** 토큰 사용량 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** LLM 채팅 응답 */
export interface LLMChatResponse {
  content: string;
  usage?: TokenUsage;
  model: string;
  finishReason?: 'stop' | 'length' | 'content_filter';
}

/** 스트리밍 청크 콜백 */
export type StreamChunkCallback = (chunk: string) => void;

// =============================================================================
// 이미지 생성
// =============================================================================

/** 이미지 크기 */
export type ImageSize = '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';

/** 이미지 생성 요청 */
export interface ImageGenerateRequest {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  size?: ImageSize;
  quality?: 'standard' | 'hd';
  n?: number;
  signal?: AbortSignal;
}

/** 이미지 생성 응답 */
export interface ImageGenerateResponse {
  url: string;
  revisedPrompt?: string;
}

// =============================================================================
// AI 프로바이더 인터페이스
// =============================================================================

/** AI 프로바이더 인터페이스 */
export interface AIProvider {
  /** 프로바이더 이름 */
  name: AIProviderType;

  /** 지원하는 모델 목록 */
  models: string[];

  /** 채팅 API 호출 */
  chat(request: LLMChatRequest, apiKey: string): Promise<LLMChatResponse>;

  /** 스트리밍 채팅 API 호출 */
  chatStream?(
    request: LLMChatRequest,
    apiKey: string,
    onChunk: StreamChunkCallback
  ): Promise<LLMChatResponse>;

  /** 이미지 생성 API 호출 */
  generateImage?(
    request: ImageGenerateRequest,
    apiKey: string
  ): Promise<ImageGenerateResponse>;

  /** API 키 검증 */
  validateKey?(apiKey: string): Promise<boolean>;
}

// =============================================================================
// 에러 처리
// =============================================================================

/** AI 에러 코드 */
export type AIErrorCode =
  | 'INVALID_API_KEY'
  | 'RATE_LIMIT'
  | 'QUOTA_EXCEEDED'
  | 'CONTENT_POLICY'
  | 'MODEL_NOT_FOUND'
  | 'CONTEXT_LENGTH'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'UNKNOWN';

/** AI 에러 클래스 */
export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: AIErrorCode,
    public readonly provider: AIProviderType,
    public readonly retryable: boolean = false,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'AIError';
  }

  /** HTTP 상태 코드에서 AIError 생성 */
  static fromHttpStatus(
    status: number,
    provider: AIProviderType,
    message?: string
  ): AIError {
    switch (status) {
      case 401:
        return new AIError(
          message || 'Invalid API key',
          'INVALID_API_KEY',
          provider,
          false,
          status
        );
      case 429:
        return new AIError(
          message || 'Rate limit exceeded',
          'RATE_LIMIT',
          provider,
          true,
          status
        );
      case 402:
        return new AIError(
          message || 'Quota exceeded',
          'QUOTA_EXCEEDED',
          provider,
          false,
          status
        );
      case 400:
        return new AIError(
          message || 'Bad request',
          'CONTENT_POLICY',
          provider,
          false,
          status
        );
      case 404:
        return new AIError(
          message || 'Model not found',
          'MODEL_NOT_FOUND',
          provider,
          false,
          status
        );
      default:
        return new AIError(
          message || `HTTP ${status}`,
          'UNKNOWN',
          provider,
          status >= 500,
          status
        );
    }
  }
}

// =============================================================================
// 노드 설정
// =============================================================================

/** LLM Chat 노드 설정 */
export interface LLMChatNodeConfig {
  provider: AIProviderType;
  apiKeyId?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
}

/** Image Generate 노드 설정 */
export interface ImageGenerateNodeConfig {
  provider: AIProviderType;
  apiKeyId?: string;
  model: string;
  size: ImageSize;
  quality: 'standard' | 'hd';
}

/** Prompt Template 노드 설정 */
export interface PromptTemplateNodeConfig {
  template: string;
}
