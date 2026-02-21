import type { ExecutionContext, ExecutionResult } from '../types';
import { executorRegistry } from '../executorRegistry';

// ToString: 문자열 변환
executorRegistry.register('ToString', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const value = ctx.inputs.value;

  let result: string;
  if (value === null || value === undefined) {
    result = '';
  } else if (typeof value === 'object') {
    result = JSON.stringify(value);
  } else {
    result = String(value);
  }

  return { outputs: { out: result } };
});

// ToNumber: 숫자 변환
executorRegistry.register('ToNumber', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const value = ctx.inputs.value;

  let result: number;
  if (typeof value === 'number') {
    result = value;
  } else if (typeof value === 'string') {
    result = parseFloat(value) || 0;
  } else if (typeof value === 'boolean') {
    result = value ? 1 : 0;
  } else {
    result = 0;
  }

  return { outputs: { out: result } };
});

// ToBoolean: 불리언 변환
executorRegistry.register('ToBoolean', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const value = ctx.inputs.value;

  const falsy = [false, 0, '', null, undefined, 'false', '0', 'no', 'off'];
  const result = !falsy.includes(value as typeof falsy[number]);

  return { outputs: { out: result } };
});
