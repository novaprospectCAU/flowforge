/**
 * Anthropic 프로바이더 (Claude)
 */

import { BaseProvider, providerRegistry, API_TIMEOUTS } from './base';
import type {
  LLMChatRequest,
  LLMChatResponse,
  StreamChunkCallback,
  ChatMessage,
  ToolDefinition,
  ToolCall,
} from '../types';
import { AIError } from '../types';
import { processAnthropicStream } from '../streaming';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Anthropic API 응답 타입
 */
interface AnthropicChatResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: unknown;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicErrorResponse {
  type: string;
  error: {
    type: string;
    message: string;
  };
}

/**
 * Anthropic 프로바이더
 */
class AnthropicProvider extends BaseProvider {
  name = 'anthropic' as const;

  constructor() {
    super(3); // Anthropic: maxConcurrent 3
  }

  models = [
    'claude-opus-4-20250514',
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ];

  /**
   * 에러 응답 처리
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let message = `HTTP ${response.status}`;
    try {
      const error: AnthropicErrorResponse = await response.json();
      message = error.error?.message || message;
    } catch {
      // JSON 파싱 실패 무시
    }
    throw AIError.fromHttpStatus(response.status, 'anthropic', message);
  }

  /**
   * 메시지 형식 변환 (내부 → Anthropic API)
   * tool role 메시지는 user role + tool_result content block으로 변환
   */
  private convertMessages(
    messages: ChatMessage[]
  ): { system?: string; messages: unknown[] } {
    let system: string | undefined;
    const converted: unknown[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system = (system ? system + '\n' : '') + msg.content;
      } else if (msg.role === 'tool') {
        // tool 결과 → user role + tool_result content block
        converted.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: msg.toolCallId,
            content: msg.content,
          }],
        });
      } else if (msg.role === 'assistant' && msg.toolCalls?.length) {
        // assistant + tool_calls → content blocks
        const content: unknown[] = [];
        if (msg.content) {
          content.push({ type: 'text', text: msg.content });
        }
        for (const tc of msg.toolCalls) {
          let input: unknown;
          try { input = JSON.parse(tc.arguments); } catch { input = {}; }
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input,
          });
        }
        converted.push({ role: 'assistant', content });
      } else {
        converted.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    return { system, messages: converted };
  }

  /**
   * ToolDefinition을 Anthropic API 형식으로 변환
   */
  private convertTools(tools: ToolDefinition[]): unknown[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  }

  /**
   * 채팅 API 호출
   */
  async chat(request: LLMChatRequest, apiKey: string): Promise<LLMChatResponse> {
    const { system, messages } = this.convertMessages(request.messages);

    const body: Record<string, unknown> = {
      model: request.model,
      messages,
      max_tokens: request.maxTokens || 4096,
    };

    if (system) {
      body.system = system;
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    if (request.tools?.length) {
      body.tools = this.convertTools(request.tools);
      if (request.toolChoice) {
        if (request.toolChoice === 'auto') {
          body.tool_choice = { type: 'auto' };
        } else if (request.toolChoice === 'none') {
          // Anthropic doesn't have 'none', skip tools
        } else {
          body.tool_choice = { type: 'tool', name: request.toolChoice.name };
        }
      }
    }

    const response = await this.fetchWithTimeout(
      `${ANTHROPIC_API_URL}/messages`,
      {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: request.signal,
      }
    );

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const data: AnthropicChatResponse = await response.json();

    // text content 추출
    const content = data.content
      .filter(c => c.type === 'text')
      .map(c => c.text ?? '')
      .join('');

    // tool_use content blocks → ToolCall[]
    let toolCalls: ToolCall[] | undefined;
    const toolUseBlocks = data.content.filter(c => c.type === 'tool_use');
    if (toolUseBlocks.length > 0) {
      toolCalls = toolUseBlocks.map(block => ({
        id: block.id ?? '',
        name: block.name ?? '',
        arguments: JSON.stringify(block.input ?? {}),
      }));
    }

    let finishReason: LLMChatResponse['finishReason'];
    if (data.stop_reason === 'tool_use') {
      finishReason = 'tool_calls';
    } else if (data.stop_reason === 'end_turn' || data.stop_reason === 'stop_sequence') {
      finishReason = 'stop';
    } else if (data.stop_reason === 'max_tokens') {
      finishReason = 'length';
    }

    return {
      content,
      model: data.model,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      finishReason,
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
    const { system, messages } = this.convertMessages(request.messages);

    const body: Record<string, unknown> = {
      model: request.model,
      messages,
      max_tokens: request.maxTokens || 4096,
      stream: true,
    };

    if (system) {
      body.system = system;
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    if (request.tools?.length) {
      body.tools = this.convertTools(request.tools);
      if (request.toolChoice) {
        if (request.toolChoice === 'auto') {
          body.tool_choice = { type: 'auto' };
        } else if (request.toolChoice !== 'none') {
          body.tool_choice = { type: 'tool', name: request.toolChoice.name };
        }
      }
    }

    const response = await this.fetchWithTimeout(
      `${ANTHROPIC_API_URL}/messages`,
      {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: request.signal,
      }
    );

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const result = await processAnthropicStream(response, onChunk);

    return {
      content: result.content,
      model: result.model,
      usage: result.usage,
      finishReason: result.finishReason,
      toolCalls: result.toolCalls,
    };
  }

  /**
   * API 키 검증
   */
  async validateKey(apiKey: string): Promise<boolean> {
    try {
      // Anthropic은 별도의 API 키 검증 엔드포인트가 없으므로
      // 간단한 메시지 요청으로 검증
      const response = await this.fetchWithTimeout(
        `${ANTHROPIC_API_URL}/messages`,
        {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': ANTHROPIC_VERSION,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1,
          }),
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
const anthropicProvider = new AnthropicProvider();
providerRegistry.register(anthropicProvider);

export { anthropicProvider };
