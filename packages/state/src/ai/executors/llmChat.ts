/**
 * LLM Chat 노드 실행자
 */

import { executorRegistry } from '../../execution/executorRegistry';
import type { ExecutionContext, ExecutionResult } from '../../execution/types';
import { providerRegistry } from '../providers';
import { keyManager } from '../keyManager';
import type { AIProviderType, ChatMessage } from '../types';
import { AIError } from '../types';

/**
 * LLM Chat 노드 실행자 등록
 */
executorRegistry.register(
  'LLMChat',
  async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const { nodeData, inputs, signal } = ctx;

    // 입력 값 추출
    const prompt = inputs.prompt as string | undefined;
    const systemPrompt = inputs.systemPrompt as string | undefined;

    if (!prompt) {
      return {
        outputs: { response: '', tokens: 0 },
        error: 'No prompt provided',
      };
    }

    // 노드 설정 추출
    const providerType = (nodeData.provider as AIProviderType) || 'openai';
    const apiKeyId = nodeData.apiKeyId as string | undefined;
    const model = (nodeData.model as string) || 'gpt-4o-mini';
    const temperature = (nodeData.temperature as number) ?? 0.7;
    const maxTokens = (nodeData.maxTokens as number) ?? 2048;
    const stream = (nodeData.stream as boolean) ?? true;

    // 프로바이더 조회
    const provider = providerRegistry.get(providerType);
    if (!provider) {
      return {
        outputs: { response: '', tokens: 0 },
        error: `Unknown provider: ${providerType}`,
      };
    }

    // API 키 조회
    let apiKey: string | null = null;

    // 1. 저장된 키 ID로 조회
    if (apiKeyId) {
      apiKey = await keyManager.getKey(apiKeyId);
    }

    // 2. 환경 변수에서 조회
    if (!apiKey) {
      apiKey = keyManager.getEnvKey(providerType);
    }

    if (!apiKey) {
      return {
        outputs: { response: '', tokens: 0 },
        error: 'No API key configured. Add a key in Settings > API Keys.',
      };
    }

    // 메시지 구성
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    try {
      if (stream && provider.chatStream) {
        // 스트리밍 모드
        let accumulated = '';
        const response = await provider.chatStream(
          {
            messages,
            model,
            temperature,
            maxTokens,
            signal,
          },
          apiKey,
          chunk => {
            accumulated += chunk;
            // 스트리밍 중간 결과는 nodeDataUpdate로 UI 업데이트
            // 참고: 실제로는 ExecutionEngine에서 이벤트를 통해 처리해야 함
          }
        );

        return {
          outputs: {
            response: response.content,
            tokens: response.usage?.totalTokens ?? 0,
          },
          nodeDataUpdate: {
            streamingResponse: response.content,
            isComplete: true,
            lastModel: response.model,
            lastUsage: response.usage,
          },
        };
      } else {
        // 비스트리밍 모드
        const response = await provider.chat(
          {
            messages,
            model,
            temperature,
            maxTokens,
            signal,
          },
          apiKey
        );

        return {
          outputs: {
            response: response.content,
            tokens: response.usage?.totalTokens ?? 0,
          },
          nodeDataUpdate: {
            streamingResponse: response.content,
            isComplete: true,
            lastModel: response.model,
            lastUsage: response.usage,
          },
        };
      }
    } catch (error) {
      if (error instanceof AIError) {
        return {
          outputs: { response: '', tokens: 0 },
          error: `[${error.code}] ${error.message}`,
          nodeDataUpdate: {
            streamingResponse: '',
            isComplete: true,
            lastError: error.message,
          },
        };
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            outputs: { response: '', tokens: 0 },
            error: 'Request cancelled',
            nodeDataUpdate: {
              isComplete: true,
            },
          };
        }

        return {
          outputs: { response: '', tokens: 0 },
          error: error.message,
          nodeDataUpdate: {
            streamingResponse: '',
            isComplete: true,
            lastError: error.message,
          },
        };
      }

      return {
        outputs: { response: '', tokens: 0 },
        error: 'Unknown error',
      };
    }
  }
);
