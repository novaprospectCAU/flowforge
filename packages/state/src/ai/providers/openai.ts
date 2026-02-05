/**
 * OpenAI 프로바이더 (GPT, DALL-E)
 */

import { BaseProvider, providerRegistry } from './base';
import type {
  LLMChatRequest,
  LLMChatResponse,
  ImageGenerateRequest,
  ImageGenerateResponse,
  StreamChunkCallback,
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
      content: string;
    };
    finish_reason: 'stop' | 'length' | 'content_filter';
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
    const response = await this.fetchWithTimeout(
      `${OPENAI_API_URL}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
        }),
        signal: request.signal,
      }
    );

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const data: OpenAIChatResponse = await response.json();

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      finishReason: data.choices[0]?.finish_reason,
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
    const response = await this.fetchWithTimeout(
      `${OPENAI_API_URL}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          stream: true,
          stream_options: { include_usage: true },
        }),
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
      120000 // 이미지 생성은 더 긴 타임아웃
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
        10000
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
