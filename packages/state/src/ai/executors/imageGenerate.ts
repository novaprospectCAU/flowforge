/**
 * Image Generate 노드 실행자
 */

import { executorRegistry } from '../../execution/executorRegistry';
import type { ExecutionContext, ExecutionResult } from '../../execution/types';
import { providerRegistry } from '../providers';
import { keyManager } from '../keyManager';
import type { AIProviderType, ImageSize } from '../types';
import { AIError } from '../types';

/**
 * Image Generate 노드 실행자 등록
 */
executorRegistry.register(
  'ImageGenerate',
  async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const { nodeData, inputs, signal } = ctx;

    // 입력 값 추출
    const prompt = inputs.prompt as string | undefined;
    const negativePrompt = inputs.negative as string | undefined;

    if (!prompt) {
      return {
        outputs: { image: null },
        error: 'No prompt provided',
      };
    }

    // 노드 설정 추출
    const providerType = (nodeData.provider as AIProviderType) || 'openai';
    const apiKeyId = nodeData.apiKeyId as string | undefined;
    const model = (nodeData.model as string) || 'dall-e-3';
    const size = (nodeData.size as ImageSize) || '1024x1024';
    const quality = (nodeData.quality as 'standard' | 'hd') || 'standard';

    // 프로바이더 조회
    const provider = providerRegistry.get(providerType);
    if (!provider || !provider.generateImage) {
      return {
        outputs: { image: null },
        error: `Provider ${providerType} does not support image generation`,
      };
    }

    // API 키 조회
    let apiKey: string | null = null;

    if (apiKeyId) {
      apiKey = await keyManager.getKey(apiKeyId);
    }

    if (!apiKey) {
      apiKey = keyManager.getEnvKey(providerType);
    }

    if (!apiKey) {
      return {
        outputs: { image: null },
        error: 'No API key configured. Add a key in Settings > API Keys.',
      };
    }

    try {
      // 이미지 생성 요청
      const response = await provider.generateImage(
        {
          prompt,
          negativePrompt,
          model,
          size,
          quality,
          signal,
        },
        apiKey
      );

      // 이미지 URL을 데이터 URL로 변환 (캔버스에 표시하기 위해)
      const imageData = await fetchImageAsDataUrl(response.url, signal);

      return {
        outputs: {
          image: {
            type: 'image',
            imageData,
            url: response.url,
            revisedPrompt: response.revisedPrompt,
          },
        },
        nodeDataUpdate: {
          generatedImage: imageData,
          generatedUrl: response.url,
          revisedPrompt: response.revisedPrompt,
          isComplete: true,
        },
      };
    } catch (error) {
      if (error instanceof AIError) {
        return {
          outputs: { image: null },
          error: `[${error.code}] ${error.message}`,
          nodeDataUpdate: {
            generatedImage: '',
            isComplete: true,
            lastError: error.message,
          },
        };
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            outputs: { image: null },
            error: 'Request cancelled',
          };
        }

        return {
          outputs: { image: null },
          error: error.message,
          nodeDataUpdate: {
            generatedImage: '',
            isComplete: true,
            lastError: error.message,
          },
        };
      }

      return {
        outputs: { image: null },
        error: 'Unknown error',
      };
    }
  }
);

/**
 * 이미지 URL을 데이터 URL로 변환
 */
async function fetchImageAsDataUrl(
  url: string,
  signal?: AbortSignal
): Promise<string> {
  try {
    const response = await fetch(url, { signal });
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    // 직접 fetch 실패 시 URL 반환 (CORS 문제 등)
    return url;
  }
}
