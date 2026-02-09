/**
 * OpenAI 프로바이더 (GPT, DALL-E)
 */

import { BaseProvider, providerRegistry, API_TIMEOUTS } from './base';
import type {
  LLMChatRequest,
  LLMChatResponse,
  ImageGenerateRequest,
  ImageGenerateResponse,
  StreamChunkCallback,
  ChatMessage,
  ToolDefinition,
  ToolCall,
} from '../types';
import { AIError } from '../types';
import { processOpenAIStream } from '../streaming';

const OPENAI_API_URL = 'https://api.openai.com/v1';

/**
 * OpenAI API 응답 타입
 */
interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIImageResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

interface OpenAIErrorResponse {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

/**
 * ChatMessage를 OpenAI API 형식으로 변환
 */
function convertMessages(messages: ChatMessage[]): unknown[] {
  return messages.map(msg => {
    if (msg.role === 'tool') {
      return {
        role: 'tool',
        tool_call_id: msg.toolCallId,
        content: msg.content,
      };
    }

    if (msg.role === 'assistant' && msg.toolCalls?.length) {
      return {
        role: 'assistant',
        content: msg.content || null,
        tool_calls: msg.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: tc.arguments,
          },
        })),
      };
    }

    return {
      role: msg.role,
      content: msg.content,
    };
  });
}

/**
 * ToolDefinition을 OpenAI API 형식으로 변환
 */
function convertTools(tools: ToolDefinition[]): unknown[] {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * toolChoice를 OpenAI API 형식으로 변환
 */
function convertToolChoice(
  toolChoice: LLMChatRequest['toolChoice']
): unknown {
  if (!toolChoice) return undefined;
  if (toolChoice === 'auto' || toolChoice === 'none') return toolChoice;
  return { type: 'function', function: { name: toolChoice.name } };
}

/**
 * OpenAI 프로바이더
 */
class OpenAIProvider extends BaseProvider {
  name = 'openai' as const;

  models = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
    'o1',
    'o1-mini',
    'o1-preview',
  ];

  imageModels = ['dall-e-3', 'dall-e-2'];

  constructor() {
    super(5); // OpenAI: maxConcurrent 5
  }

  /**
   * 에러 응답 처리
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let message = `HTTP ${response.status}`;
    try {
      const error: OpenAIErrorResponse = await response.json();
      message = error.error?.message || message;
    } catch {
      // JSON 파싱 실패 무시
    }
    throw AIError.fromHttpStatus(response.status, 'openai', message);
  }

  /**
   * 채팅 API 호출
   */
  async chat(request: LLMChatRequest, apiKey: string): Promise<LLMChatResponse> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: convertMessages(request.messages),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
    };

    if (request.tools?.length) {
      body.tools = convertTools(request.tools);
      const tc = convertToolChoice(request.toolChoice);
      if (tc !== undefined) body.tool_choice = tc;
    }

    const response = await this.fetchWithTimeout(
      `${OPENAI_API_URL}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: request.signal,
      }
    );

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const data: OpenAIChatResponse = await response.json();
    const choice = data.choices[0];

    // tool_calls 파싱
    let toolCalls: ToolCall[] | undefined;
    if (choice?.message?.tool_calls?.length) {
      toolCalls = choice.message.tool_calls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
      }));
    }

    return {
      content: choice?.message?.content || '',
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      finishReason: choice?.finish_reason,
      toolCalls,
    };
  }

  /**
   * 스트리밍 채팅 API 호출
   */
  async chatStream(
    request: LLMChatRequest,
    apiKey: string,
    onChunk: StreamChunkCallback
  ): Promise<LLMChatResponse> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: convertMessages(request.messages),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    };

    if (request.tools?.length) {
      body.tools = convertTools(request.tools);
      const tc = convertToolChoice(request.toolChoice);
      if (tc !== undefined) body.tool_choice = tc;
    }

    const response = await this.fetchWithTimeout(
      `${OPENAI_API_URL}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: request.signal,
      }
    );

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const result = await processOpenAIStream(response, onChunk);

    return {
      content: result.content,
      model: result.model,
      usage: result.usage,
      finishReason: result.finishReason,
      toolCalls: result.toolCalls,
    };
  }

  /**
   * 이미지 생성 API 호출
   */
  async generateImage(
    request: ImageGenerateRequest,
    apiKey: string
  ): Promise<ImageGenerateResponse> {
    const model = request.model || 'dall-e-3';
    const size = request.size || '1024x1024';

    const response = await this.fetchWithTimeout(
      `${OPENAI_API_URL}/images/generations`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: request.prompt,
          n: request.n || 1,
          size,
          quality: request.quality || 'standard',
        }),
        signal: request.signal,
      },
      API_TIMEOUTS.IMAGE_GENERATION
    );

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const data: OpenAIImageResponse = await response.json();

    if (!data.data?.[0]) {
      throw new AIError('No image generated', 'UNKNOWN', 'openai', false);
    }

    const imageData = data.data[0];
    return {
      url: imageData.url || '',
      revisedPrompt: imageData.revised_prompt,
    };
  }

  /**
   * API 키 검증
   */
  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(
        `${OPENAI_API_URL}/models`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
        API_TIMEOUTS.VALIDATION
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}

// 프로바이더 등록
const openaiProvider = new OpenAIProvider();
providerRegistry.register(openaiProvider);

export { openaiProvider };
