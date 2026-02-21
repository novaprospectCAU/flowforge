import type { ExecutionContext, ExecutionResult } from '../types';
import { executorRegistry } from '../executorRegistry';

// Condition: 조건부 분기
executorRegistry.register('Condition', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const condition = Boolean(ctx.inputs.condition);
  const trueValue = ctx.inputs.true;
  const falseValue = ctx.inputs.false;

  return { outputs: { out: condition ? trueValue : falseValue } };
});

// Compare: 두 값 비교
executorRegistry.register('Compare', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const a = ctx.inputs.a;
  const b = ctx.inputs.b;
  const operator = String(ctx.nodeData.operator ?? '==');

  let result: boolean;
  switch (operator) {
    case '==':
      result = a == b;
      break;
    case '===':
      result = a === b;
      break;
    case '!=':
      result = a != b;
      break;
    case '!==':
      result = a !== b;
      break;
    case '<': {
      const numA = Number(a);
      const numB = Number(b);
      if (isNaN(numA) || isNaN(numB)) {
        throw new Error(`Cannot compare non-numeric values: ${String(a)}, ${String(b)}`);
      }
      result = numA < numB;
      break;
    }
    case '>': {
      const numA = Number(a);
      const numB = Number(b);
      if (isNaN(numA) || isNaN(numB)) {
        throw new Error(`Cannot compare non-numeric values: ${String(a)}, ${String(b)}`);
      }
      result = numA > numB;
      break;
    }
    case '<=': {
      const numA = Number(a);
      const numB = Number(b);
      if (isNaN(numA) || isNaN(numB)) {
        throw new Error(`Cannot compare non-numeric values: ${String(a)}, ${String(b)}`);
      }
      result = numA <= numB;
      break;
    }
    case '>=': {
      const numA = Number(a);
      const numB = Number(b);
      if (isNaN(numA) || isNaN(numB)) {
        throw new Error(`Cannot compare non-numeric values: ${String(a)}, ${String(b)}`);
      }
      result = numA >= numB;
      break;
    }
    default:
      result = a == b;
  }

  return { outputs: { result } };
});

// Gate: 조건부 통과
executorRegistry.register('Gate', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const input = ctx.inputs.input;
  const enable = Boolean(ctx.inputs.enable);

  return { outputs: { out: enable ? input : undefined } };
});

// Switch: 인덱스 기반 라우팅
executorRegistry.register('Switch', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const input = ctx.inputs.input;
  const index = Math.floor(Number(ctx.inputs.index ?? 0));

  const outputs: Record<string, unknown> = {
    out0: undefined,
    out1: undefined,
    out2: undefined,
  };

  if (index >= 0 && index <= 2) {
    outputs[`out${index}`] = input;
  }

  return { outputs };
});

// ForEach: 배열 반복 처리
executorRegistry.register('ForEach', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const array = ctx.inputs.array;
  const template = String(ctx.nodeData.template ?? ctx.inputs.template ?? '{{item}}');

  if (!Array.isArray(array)) {
    throw new Error('Input must be an array');
  }

  const results = array.map((item, index) => {
    let result = template;
    result = result.replace(/\{\{item\}\}/g, typeof item === 'object' ? JSON.stringify(item) : String(item));
    result = result.replace(/\{\{index\}\}/g, String(index));
    return result;
  });

  return {
    outputs: {
      results,
      count: results.length,
    },
  };
});

// Range: 숫자 범위 배열 생성
executorRegistry.register('Range', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const MAX_RANGE = 100_000;
  const count = Math.max(0, Math.floor(Number(ctx.inputs.count ?? ctx.nodeData.count ?? 0)));
  if (count > MAX_RANGE) {
    throw new Error(`Range count ${count} exceeds maximum of ${MAX_RANGE}`);
  }

  const array = Array.from({ length: count }, (_, i) => i);

  return {
    outputs: { array },
  };
});
