/**
 * SSE 스트리밍 응답 처리 유틸리티
 */

import type { StreamChunkCallback, TokenUsage } from './types';

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
    text: string;
  };
  delta?: {
    type: string;
    text?: string;
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
  finishReason?: 'stop' | 'length' | 'content_filter';
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

          if (chunk.choices[0]?.finish_reason) {
            const reason = chunk.choices[0].finish_reason;
            if (reason === 'stop' || reason === 'length' || reason === 'content_filter') {
              finishReason = reason;
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

  return { content, model, usage, finishReason };
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

            case 'content_block_delta':
              if (event.delta?.text) {
                content += event.delta.text;
                onChunk(event.delta.text);
              }
              break;

            case 'message_delta':
              if (event.delta?.stop_reason) {
                const reason = event.delta.stop_reason;
                if (reason === 'end_turn' || reason === 'stop_sequence') {
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

  return { content, model, usage, finishReason };
}
