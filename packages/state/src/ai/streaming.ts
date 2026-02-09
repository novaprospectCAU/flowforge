/**
 * SSE 스트리밍 응답 처리 유틸리티
 */

import type { StreamChunkCallback, TokenUsage, ToolCall } from './types';

/**
 * OpenAI SSE 스트리밍 청크
 */
interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Anthropic SSE 스트리밍 이벤트
 */
interface AnthropicStreamEvent {
  type:
    | 'message_start'
    | 'content_block_start'
    | 'content_block_delta'
    | 'content_block_stop'
    | 'message_delta'
    | 'message_stop'
    | 'ping'
    | 'error';
  message?: {
    id: string;
    model: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  index?: number;
  content_block?: {
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: string;
  };
  delta?: {
    type: string;
    text?: string;
    partial_json?: string;
    stop_reason?: string;
    usage?: {
      output_tokens: number;
    };
  };
  error?: {
    type: string;
    message: string;
  };
}

/**
 * 스트리밍 결과
 */
export interface StreamResult {
  content: string;
  model: string;
  usage?: TokenUsage;
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls';
  toolCalls?: ToolCall[];
}

/**
 * SSE 라인 파서
 */
export async function* parseSSELines(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        yield line;
      }
    }
  }

  // 남은 버퍼 처리
  if (buffer.trim()) {
    yield buffer;
  }
}

/**
 * OpenAI SSE 스트림 처리
 */
export async function processOpenAIStream(
  response: Response,
  onChunk: StreamChunkCallback
): Promise<StreamResult> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  let content = '';
  let model = '';
  let usage: TokenUsage | undefined;
  let finishReason: StreamResult['finishReason'];

  // 스트리밍 중 tool_calls 누적 (인덱스별)
  const toolCallAccumulators = new Map<number, { id: string; name: string; arguments: string }>();

  try {
    for await (const line of parseSSELines(reader)) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);

        if (data === '[DONE]') {
          break;
        }

        try {
          const chunk: OpenAIStreamChunk = JSON.parse(data);
          model = chunk.model;

          if (chunk.choices[0]?.delta?.content) {
            const text = chunk.choices[0].delta.content;
            content += text;
            onChunk(text);
          }

          // tool_calls 스트리밍 누적
          if (chunk.choices[0]?.delta?.tool_calls) {
            for (const tc of chunk.choices[0].delta.tool_calls) {
              const existing = toolCallAccumulators.get(tc.index);
              if (existing) {
                if (tc.id) existing.id = tc.id;
                if (tc.function?.name) existing.name = tc.function.name;
                if (tc.function?.arguments) {
                  existing.arguments += tc.function.arguments;
                }
              } else {
                toolCallAccumulators.set(tc.index, {
                  id: tc.id || '',
                  name: tc.function?.name || '',
                  arguments: tc.function?.arguments || '',
                });
              }
            }
          }

          if (chunk.choices[0]?.finish_reason) {
            const reason = chunk.choices[0].finish_reason;
            if (reason === 'stop' || reason === 'length' || reason === 'content_filter') {
              finishReason = reason;
            } else if (reason === 'tool_calls') {
              finishReason = 'tool_calls';
            }
          }

          if (chunk.usage) {
            usage = {
              promptTokens: chunk.usage.prompt_tokens,
              completionTokens: chunk.usage.completion_tokens,
              totalTokens: chunk.usage.total_tokens,
            };
          }
        } catch {
          // JSON 파싱 실패 무시
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // tool_calls 결과 정리
  let toolCalls: ToolCall[] | undefined;
  if (toolCallAccumulators.size > 0) {
    toolCalls = Array.from(toolCallAccumulators.entries())
      .sort(([a], [b]) => a - b)
      .map(([, tc]) => tc);
  }

  return { content, model, usage, finishReason, toolCalls };
}

/**
 * Gemini SSE 스트리밍 청크
 */
interface GeminiStreamChunk {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        functionCall?: {
          name: string;
          args: Record<string, unknown>;
        };
      }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Gemini SSE 스트림 처리
 */
export async function processGeminiStream(
  response: Response,
  onChunk: StreamChunkCallback
): Promise<StreamResult> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  let content = '';
  let model = '';
  let usage: TokenUsage | undefined;
  let finishReason: StreamResult['finishReason'];
  const toolCalls: ToolCall[] = [];
  let toolCallIndex = 0;

  try {
    for await (const line of parseSSELines(reader)) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);

        try {
          const chunk: GeminiStreamChunk = JSON.parse(data);
          const candidate = chunk.candidates?.[0];

          if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
              if (part.text) {
                content += part.text;
                onChunk(part.text);
              }
              if (part.functionCall) {
                toolCalls.push({
                  id: `call_${toolCallIndex++}`,
                  name: part.functionCall.name,
                  arguments: JSON.stringify(part.functionCall.args ?? {}),
                });
              }
            }
          }

          if (candidate?.finishReason) {
            const reason = candidate.finishReason;
            if (reason === 'STOP') {
              finishReason = toolCalls.length > 0 ? 'tool_calls' : 'stop';
            } else if (reason === 'MAX_TOKENS') {
              finishReason = 'length';
            } else if (reason === 'SAFETY') {
              finishReason = 'content_filter';
            }
          }

          if (chunk.usageMetadata) {
            usage = {
              promptTokens: chunk.usageMetadata.promptTokenCount ?? 0,
              completionTokens: chunk.usageMetadata.candidatesTokenCount ?? 0,
              totalTokens: chunk.usageMetadata.totalTokenCount ?? 0,
            };
          }
        } catch {
          // JSON 파싱 실패 무시
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    content,
    model,
    usage,
    finishReason,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

/**
 * Anthropic SSE 스트림 처리
 */
export async function processAnthropicStream(
  response: Response,
  onChunk: StreamChunkCallback
): Promise<StreamResult> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  let content = '';
  let model = '';
  let usage: TokenUsage | undefined;
  let finishReason: StreamResult['finishReason'];
  let inputTokens = 0;
  let outputTokens = 0;

  // Anthropic tool_use 스트리밍 누적
  const toolCallAccumulators = new Map<number, { id: string; name: string; arguments: string }>();
  let currentBlockIndex = -1;

  try {
    for await (const line of parseSSELines(reader)) {
      if (line.startsWith('event: ')) {
        // 이벤트 타입 저장 (다음 data 라인에서 사용)
        continue;
      }

      if (line.startsWith('data: ')) {
        const data = line.slice(6);

        try {
          const event: AnthropicStreamEvent = JSON.parse(data);

          switch (event.type) {
            case 'message_start':
              if (event.message) {
                model = event.message.model;
                if (event.message.usage) {
                  inputTokens = event.message.usage.input_tokens;
                }
              }
              break;

            case 'content_block_start':
              if (event.index !== undefined && event.content_block) {
                currentBlockIndex = event.index;

                if (event.content_block.type === 'tool_use') {
                  toolCallAccumulators.set(event.index, {
                    id: event.content_block.id || '',
                    name: event.content_block.name || '',
                    arguments: '',
                  });
                }
              }
              break;

            case 'content_block_delta':
              if (event.delta?.type === 'text_delta' && event.delta.text) {
                content += event.delta.text;
                onChunk(event.delta.text);
              } else if (event.delta?.type === 'input_json_delta' && event.delta.partial_json) {
                // tool_use arguments 점진적 누적
                const idx = event.index ?? currentBlockIndex;
                const existing = toolCallAccumulators.get(idx);
                if (existing) {
                  existing.arguments += event.delta.partial_json;
                }
              }
              break;

            case 'content_block_stop':
              break;

            case 'message_delta':
              if (event.delta?.stop_reason) {
                const reason = event.delta.stop_reason;
                if (reason === 'tool_use') {
                  finishReason = 'tool_calls';
                } else if (reason === 'end_turn' || reason === 'stop_sequence') {
                  finishReason = 'stop';
                } else if (reason === 'max_tokens') {
                  finishReason = 'length';
                }
              }
              if (event.delta?.usage) {
                outputTokens = event.delta.usage.output_tokens;
              }
              break;

            case 'error':
              if (event.error) {
                throw new Error(event.error.message);
              }
              break;
          }
        } catch (e) {
          if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
            throw e;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (inputTokens || outputTokens) {
    usage = {
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }

  // tool_calls 결과 정리
  let toolCalls: ToolCall[] | undefined;
  if (toolCallAccumulators.size > 0) {
    toolCalls = Array.from(toolCallAccumulators.entries())
      .sort(([a], [b]) => a - b)
      .map(([, tc]) => tc);
  }

  return { content, model, usage, finishReason, toolCalls };
}
