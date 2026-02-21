import type { ExecutionContext, ExecutionResult } from '../types';
import { executorRegistry } from '../executorRegistry';

// Math: 수학 연산
executorRegistry.register('Math', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const a = Number(ctx.inputs.a ?? 0);
  const b = Number(ctx.inputs.b ?? 0);
  const operation = String(ctx.nodeData.operation ?? 'add');

  let result: number;
  switch (operation) {
    case 'add':
      result = a + b;
      break;
    case 'subtract':
      result = a - b;
      break;
    case 'multiply':
      result = a * b;
      break;
    case 'divide':
      result = b !== 0 ? a / b : 0;
      break;
    case 'power':
      result = Math.pow(a, b);
      break;
    case 'modulo':
      result = b !== 0 ? a % b : 0;
      break;
    default:
      result = a + b;
  }

  return { outputs: { out: result } };
});

// Random: 난수 생성
executorRegistry.register('Random', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const min = Number(ctx.nodeData.min ?? ctx.inputs.min ?? 0);
  const max = Number(ctx.nodeData.max ?? ctx.inputs.max ?? 1);
  const isInteger = Boolean(ctx.nodeData.integer);

  let value = min + Math.random() * (max - min);
  if (isInteger) {
    value = Math.floor(value);
  }

  return { outputs: { out: value } };
});

// Timestamp: 현재 시간
executorRegistry.register('Timestamp', async (): Promise<ExecutionResult> => {
  const now = Date.now();
  return {
    outputs: {
      ms: now,
      iso: new Date(now).toISOString(),
    },
  };
});
