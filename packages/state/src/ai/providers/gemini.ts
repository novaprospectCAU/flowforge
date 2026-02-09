/**
 * Gemini 프로바이더 (Google AI)
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
import { processGeminiStream } from '../streaming';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Gemini API 응답 타입
 */
interface GeminiChatResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        functionCall?: {
          name: string;
          args: Record<string, unknown>;
        };
        inlineData?: {
          mimeType: string;
          data: string; // base64
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

interface GeminiErrorResponse {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * ChatMessage를 Gemini API 형식으로 변환
 */
function convertMessages(
  messages: ChatMessage[]
): { contents: unknown[]; systemInstruction?: unknown } {
  let systemInstruction: unknown = undefined;
  const contents: unknown[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = {
        parts: [{ text: msg.content }],
      };
    } else if (msg.role === 'tool') {
      contents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: msg.toolCallId || 'unknown',
            response: { result: msg.content },
          },
        }],
      });
    } else if (msg.role === 'assistant' && msg.toolCalls?.length) {
      const parts: unknown[] = [];
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      for (const tc of msg.toolCalls) {
        let args: unknown;
        try { args = JSON.parse(tc.arguments); } catch { args = {}; }
        parts.push({
          functionCall: {
            name: tc.name,
            args,
          },
        });
      }
      contents.push({ role: 'model', parts });
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  return { contents, systemInstruction };
}

/**
 * ToolDefinition을 Gemini API 형식으로 변환
 */
function convertTools(tools: ToolDefinition[]): unknown[] {
  return [{
    functionDeclarations: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    })),
  }];
}

/**
 * Gemini 프로바이더
 */
class GeminiProvider extends BaseProvider {
  name = 'gemini' as const;

  models = [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
  ];

  imageModels = ['gemini-2.5-flash-image'];

  constructor() {
    super(5); // Gemini: maxConcurrent 5
  }

  /**
   * 에러 응답 처리
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let message = `HTTP ${response.status}`;
    try {
      const error: GeminiErrorResponse = await response.json();
      message = error.error?.message || message;
    } catch {
      // JSON 파싱 실패 무시
    }
    throw AIError.fromHttpStatus(response.status, 'gemini', message);
  }

  /**
   * 채팅 API 호출
   */
  async chat(request: LLMChatRequest, apiKey: string): Promise<LLMChatResponse> {
    const { contents, systemInstruction } = convertMessages(request.messages);

    const body: Record<string, unknown> = { contents };

    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    if (request.temperature !== undefined) {
      body.generationConfig = {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
      };
    } else if (request.maxTokens) {
      body.generationConfig = { maxOutputTokens: request.maxTokens };
    }

    if (request.tools?.length) {
      body.tools = convertTools(request.tools);
    }

    const response = await this.fetchWithTimeout(
      `${GEMINI_API_URL}/models/${request.model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: request.signal,
      }
    );

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const data: GeminiChatResponse = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];

    // 텍스트 추출
    const content = parts
      .filter(p => p.text !== undefined)
      .map(p => p.text!)
      .join('');

    // tool calls 추출
    let toolCalls: ToolCall[] | undefined;
    const functionCallParts = parts.filter(p => p.functionCall);
    if (functionCallParts.length > 0) {
      toolCalls = functionCallParts.map((p, i) => ({
        id: `call_${i}`,
        name: p.functionCall!.name,
        arguments: JSON.stringify(p.functionCall!.args ?? {}),
      }));
    }

    // finishReason 변환
    let finishReason: LLMChatResponse['finishReason'];
    if (candidate?.finishReason) {
      const reason = candidate.finishReason;
      if (reason === 'STOP') {
        finishReason = toolCalls ? 'tool_calls' : 'stop';
      } else if (reason === 'MAX_TOKENS') {
        finishReason = 'length';
      } else if (reason === 'SAFETY') {
        finishReason = 'content_filter';
      }
    }

    return {
      content,
      model: request.model,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount ?? 0,
            completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: data.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
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
    const { contents, systemInstruction } = convertMessages(request.messages);

    const body: Record<string, unknown> = { contents };

    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    if (request.temperature !== undefined) {
      body.generationConfig = {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
      };
    } else if (request.maxTokens) {
      body.generationConfig = { maxOutputTokens: request.maxTokens };
    }

    if (request.tools?.length) {
      body.tools = convertTools(request.tools);
    }

    const response = await this.fetchWithTimeout(
      `${GEMINI_API_URL}/models/${request.model}:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: request.signal,
      }
    );

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const result = await processGeminiStream(response, onChunk);

    return {
      content: result.content,
      model: result.model || request.model,
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
    const model = request.model || 'gemini-2.5-flash-image';

    const body = {
      contents: [{
        parts: [{ text: request.prompt }],
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    };

    const response = await this.fetchWithTimeout(
      `${GEMINI_API_URL}/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: request.signal,
      },
      API_TIMEOUTS.IMAGE_GENERATION
    );

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const data: GeminiChatResponse = await response.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];

    // inlineData에서 base64 이미지 추출
    const imagePart = parts.find(p => p.inlineData);
    if (!imagePart?.inlineData) {
      throw new AIError('No image generated', 'UNKNOWN', 'gemini', false);
    }

    const { mimeType, data: base64Data } = imagePart.inlineData;
    const url = `data:${mimeType};base64,${base64Data}`;

    // 텍스트 부분에서 revised prompt 추출
    const textPart = parts.find(p => p.text);

    return {
      url,
      revisedPrompt: textPart?.text,
    };
  }

  /**
   * API 키 검증
   */
  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(
        `${GEMINI_API_URL}/models?key=${apiKey}`,
        {},
        API_TIMEOUTS.VALIDATION
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}

// 프로바이더 등록
const geminiProvider = new GeminiProvider();
providerRegistry.register(geminiProvider);

export { geminiProvider };
