import type { ExecutionContext, ExecutionResult } from '../types';
import { executorRegistry } from '../executorRegistry';

// NumberInput: 숫자 값 출력
executorRegistry.register('NumberInput', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const value = ctx.nodeData.value ?? 0;
  return { outputs: { out: Number(value) } };
});

// TextInput: 텍스트 값 출력
executorRegistry.register('TextInput', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const text = ctx.nodeData.text ?? '';
  return { outputs: { out: String(text) } };
});

// ImageInput: 이미지 로드
executorRegistry.register('ImageInput', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const imageData = ctx.nodeData.imageData as string | undefined;
  const fileName = ctx.nodeData.fileName as string | undefined;

  if (!imageData) {
    throw new Error('No image loaded');
  }

  return {
    outputs: {
      out: { type: 'image', imageData, fileName },
    },
  };
});
