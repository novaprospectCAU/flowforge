/**
 * AI 모듈 익스포트
 *
 * 사용법:
 * import { keyManager, providerRegistry, registerAINodeTypes } from '@flowforge/state';
 *
 * // 앱 초기화 시 AI 노드 타입 등록
 * registerAINodeTypes();
 *
 * // AI 실행자 로드 (import 시 자동 등록)
 * import '@flowforge/state/ai/executors';
 */

// 타입
export type {
  AIProviderType,
  APIKeyEntry,
  MaskedAPIKeyEntry,
  ChatMessage,
  LLMChatRequest,
  LLMChatResponse,
  TokenUsage,
  StreamChunkCallback,
  ImageSize,
  ImageGenerateRequest,
  ImageGenerateResponse,
  AIProvider,
  AIErrorCode,
  LLMChatNodeConfig,
  ImageGenerateNodeConfig,
  PromptTemplateNodeConfig,
  ToolDefinition,
  ToolCall,
} from './types';

// 에러 클래스
export { AIError } from './types';

// 키 관리
export { keyManager } from './keyManager';

// Rate Limiting
export { RequestQueue } from './rateLimiter';

// 프로바이더
export { providerRegistry, BaseProvider } from './providers';
export { openaiProvider } from './providers/openai';
export { anthropicProvider } from './providers/anthropic';

// 노드 타입
export {
  AI_NODE_TYPES,
  registerAINodeTypes,
  getAINodeDefaultData,
  DEFAULT_LLM_CHAT_DATA,
  DEFAULT_IMAGE_GENERATE_DATA,
  DEFAULT_PROMPT_TEMPLATE_DATA,
} from './nodeTypes';

// 스트리밍 유틸리티
export {
  parseSSELines,
  processOpenAIStream,
  processAnthropicStream,
} from './streaming';

// 실행자 (import 시 자동 등록)
// 사용: import '@flowforge/state/ai/executors';
export { extractVariables, substituteTemplate } from './executors';

// 실행자 등록을 위해 import
import './executors';
