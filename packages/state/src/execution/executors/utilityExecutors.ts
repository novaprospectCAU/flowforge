import type { ExecutionContext, ExecutionResult } from '../types';
import { executorRegistry } from '../executorRegistry';

// Display: 결과 표시
executorRegistry.register('Display', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const input = ctx.inputs.in;
  console.log('[Display]', ctx.nodeId, ':', input);

  return {
    outputs: {},
    nodeDataUpdate: { displayValue: input },
  };
});

// Debug: 값 검사 + 에러 캡처
executorRegistry.register('Debug', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const input = ctx.inputs.input;
  const label = String(ctx.nodeData.label ?? ctx.nodeId);
  const upstreamErrors = ctx.inputs.__upstreamErrors as
    Array<{ nodeId: string; nodeType: string; error: string; timing?: { start?: number; end?: number } }> | undefined;

  // 에러 모드: 업스트림에서 에러가 전파됨
  if (upstreamErrors && upstreamErrors.length > 0) {
    const primaryError = upstreamErrors[0];
    console.warn(`[Debug ${label}] Upstream error:`, primaryError.error);
    return {
      outputs: { out: undefined },
      nodeDataUpdate: {
        debugMode: 'error',
        debugError: primaryError,
        debugAllErrors: upstreamErrors,
      },
    };
  }

  // 성공 모드: 값 메타데이터 수집
  const type = input === null ? 'null'
    : input === undefined ? 'undefined'
    : Array.isArray(input) ? 'array'
    : typeof input;

  let size: string;
  if (typeof input === 'string') {
    size = `${input.length} chars`;
  } else if (Array.isArray(input)) {
    size = `${input.length} items`;
  } else if (input && typeof input === 'object') {
    size = `${Object.keys(input).length} keys`;
  } else {
    size = '-';
  }

  console.log(`[Debug ${label}]`, input);
  return {
    outputs: { out: input },
    nodeDataUpdate: {
      debugMode: 'success',
      debugValue: input,
      debugMeta: { type, size, timestamp: Date.now() },
    },
  };
});

// Comment: 주석 노드 (실행 안 함)
executorRegistry.register('Comment', async (): Promise<ExecutionResult> => {
  return { outputs: {} };
});

// Delay: 지연
executorRegistry.register('Delay', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const input = ctx.inputs.input;
  const ms = Math.max(0, Math.floor(Number(ctx.nodeData.ms ?? ctx.inputs.ms ?? 1000)));

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    ctx.signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('Execution aborted'));
    }, { once: true });
  });
  return { outputs: { out: input } };
});
