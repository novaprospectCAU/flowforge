/**
 * Debug 노드용 에러 설명 데이터
 * AI 에러 코드별 사용자 친화적 설명 제공
 */

export interface ErrorExplanation {
  title: string;
  explanation: string;
  suggestion: string;
}

/** 에러 코드별 설명 매핑 */
const ERROR_EXPLANATIONS: Record<string, ErrorExplanation> = {
  INVALID_API_KEY: {
    title: 'Invalid API Key',
    explanation: 'The API key is missing, expired, or incorrectly formatted.',
    suggestion: 'Check your API key in Settings. Make sure it starts with "sk-" (OpenAI) or is a valid Anthropic key.',
  },
  RATE_LIMIT: {
    title: 'Rate Limited',
    explanation: 'Too many requests sent in a short time. The API provider is throttling your requests.',
    suggestion: 'Wait a moment and retry. Consider adding a Delay node or reducing parallel requests.',
  },
  QUOTA_EXCEEDED: {
    title: 'Quota Exceeded',
    explanation: 'Your API usage quota or credit limit has been reached.',
    suggestion: 'Check your billing dashboard and add credits or upgrade your plan.',
  },
  CONTEXT_LENGTH: {
    title: 'Context Too Long',
    explanation: 'The input text exceeds the model\'s maximum token limit.',
    suggestion: 'Shorten your prompt or use a model with a larger context window (e.g., gpt-4o, claude-3.5-sonnet).',
  },
  MODEL_NOT_FOUND: {
    title: 'Model Not Found',
    explanation: 'The specified model ID does not exist or you don\'t have access to it.',
    suggestion: 'Check the model name in the LLM Chat node settings. Use a supported model like "gpt-4o" or "claude-3.5-sonnet".',
  },
  NETWORK_ERROR: {
    title: 'Network Error',
    explanation: 'Failed to connect to the API server. This could be a network issue or the service may be down.',
    suggestion: 'Check your internet connection. If the problem persists, the API service may be experiencing outages.',
  },
  TIMEOUT: {
    title: 'Request Timeout',
    explanation: 'The API request took too long and was cancelled.',
    suggestion: 'Try a shorter prompt, or increase the timeout setting in execution options.',
  },
  SERVER_ERROR: {
    title: 'Server Error',
    explanation: 'The API server returned an internal error (5xx).',
    suggestion: 'This is usually temporary. Wait a moment and retry.',
  },
  CONTENT_FILTER: {
    title: 'Content Filtered',
    explanation: 'The request or response was blocked by the provider\'s content safety filter.',
    suggestion: 'Revise your prompt to avoid content that may trigger safety filters.',
  },
  INVALID_REQUEST: {
    title: 'Invalid Request',
    explanation: 'The request parameters are malformed or contain invalid values.',
    suggestion: 'Check your node configuration (model, temperature, max tokens, etc.).',
  },
};

/** 패턴 기반 fallback 매칭 */
const PATTERN_FALLBACKS: { pattern: RegExp; explanation: ErrorExplanation }[] = [
  {
    pattern: /api.?key|auth|unauthorized|401/i,
    explanation: ERROR_EXPLANATIONS.INVALID_API_KEY,
  },
  {
    pattern: /rate.?limit|429|too many requests/i,
    explanation: ERROR_EXPLANATIONS.RATE_LIMIT,
  },
  {
    pattern: /quota|billing|insufficient.?funds|402/i,
    explanation: ERROR_EXPLANATIONS.QUOTA_EXCEEDED,
  },
  {
    pattern: /context.?length|token.?limit|too.?long|maximum.?context/i,
    explanation: ERROR_EXPLANATIONS.CONTEXT_LENGTH,
  },
  {
    pattern: /model.*not.*found|does not exist|404/i,
    explanation: ERROR_EXPLANATIONS.MODEL_NOT_FOUND,
  },
  {
    pattern: /network|fetch|ECONNREFUSED|ENOTFOUND|ERR_CONNECTION/i,
    explanation: ERROR_EXPLANATIONS.NETWORK_ERROR,
  },
  {
    pattern: /timeout|timed?\s*out|ETIMEDOUT/i,
    explanation: ERROR_EXPLANATIONS.TIMEOUT,
  },
  {
    pattern: /5\d{2}|internal.?server|server.?error/i,
    explanation: ERROR_EXPLANATIONS.SERVER_ERROR,
  },
  {
    pattern: /content.?filter|safety|moderation|blocked/i,
    explanation: ERROR_EXPLANATIONS.CONTENT_FILTER,
  },
  {
    pattern: /Missing required input/i,
    explanation: {
      title: 'Missing Input',
      explanation: 'A required input port has no value. The upstream node may not have produced output.',
      suggestion: 'Connect all required input ports or check that upstream nodes completed successfully.',
    },
  },
  {
    pattern: /Type mismatch/i,
    explanation: {
      title: 'Type Mismatch',
      explanation: 'The input value type does not match what the node expects.',
      suggestion: 'Use a Convert node (To String, To Number, etc.) to convert the value to the correct type.',
    },
  },
];

/**
 * 에러 메시지에서 AI 에러 코드 추출
 * 형식: "[ERROR_CODE] message" → 'ERROR_CODE'
 */
export function parseAIErrorCode(error: string): string | null {
  const match = error.match(/^\[([A-Z_]+)\]/);
  return match ? match[1] : null;
}

/**
 * 에러 메시지에 대한 사용자 친화적 설명 반환
 */
export function getErrorExplanation(error: string): ErrorExplanation {
  // 1. 코드 기반 매칭
  const code = parseAIErrorCode(error);
  if (code && ERROR_EXPLANATIONS[code]) {
    return ERROR_EXPLANATIONS[code];
  }

  // 2. 패턴 기반 fallback
  for (const { pattern, explanation } of PATTERN_FALLBACKS) {
    if (pattern.test(error)) {
      return explanation;
    }
  }

  // 3. 기본 fallback
  return {
    title: 'Execution Error',
    explanation: error.length > 200 ? error.slice(0, 200) + '...' : error,
    suggestion: 'Check the node configuration and upstream connections.',
  };
}
