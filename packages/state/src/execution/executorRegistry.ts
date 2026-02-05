import type { NodeExecutor, ExecutionContext, ExecutionResult } from './types';

/**
 * 노드 실행자 레지스트리
 * 노드 타입별로 실행 함수를 등록하고 조회
 */
class ExecutorRegistry {
  private executors: Map<string, NodeExecutor> = new Map();

  /**
   * 노드 타입에 대한 실행자 등록
   */
  register(nodeType: string, executor: NodeExecutor): void {
    this.executors.set(nodeType, executor);
  }

  /**
   * 노드 타입에 대한 실행자 조회
   */
  get(nodeType: string): NodeExecutor | undefined {
    return this.executors.get(nodeType);
  }

  /**
   * 노드 타입에 대한 실행자가 있는지 확인
   */
  has(nodeType: string): boolean {
    return this.executors.has(nodeType);
  }

  /**
   * 등록된 모든 노드 타입 목록
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.executors.keys());
  }
}

// 싱글톤 인스턴스
export const executorRegistry = new ExecutorRegistry();

// === 기본 실행자들 ===

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

// ImageInput: 이미지 로드 (placeholder)
executorRegistry.register('ImageInput', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const src = ctx.nodeData.src ?? '';
  // 실제 구현에서는 이미지를 로드
  return { outputs: { out: { type: 'image', src } } };
});

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

// Resize: 이미지 리사이즈 (placeholder)
executorRegistry.register('Resize', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const image = ctx.inputs.image;
  const scale = Number(ctx.inputs.scale ?? 1);
  // 실제 구현에서는 이미지를 리사이즈
  return { outputs: { out: { ...image as object, scale } } };
});

// Filter: 이미지 필터 (placeholder)
executorRegistry.register('Filter', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const image = ctx.inputs.image;
  const filterType = String(ctx.nodeData.filter ?? 'none');
  // 실제 구현에서는 필터를 적용
  return { outputs: { out: { ...image as object, filter: filterType } } };
});

// Merge: 여러 입력 병합
executorRegistry.register('Merge', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const a = ctx.inputs.a;
  const b = ctx.inputs.b;
  const mode = String(ctx.nodeData.mode ?? 'array');

  let output: unknown;
  if (mode === 'object') {
    output = { a, b };
  } else {
    output = [a, b];
  }

  return { outputs: { out: output } };
});

// Display: 결과 표시 (출력 없음)
executorRegistry.register('Display', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const input = ctx.inputs.in;
  // 콘솔에 출력 (실제로는 UI에 표시)
  console.log('[Display]', ctx.nodeId, ':', input);
  return { outputs: {} };
});

// SaveImage: 이미지 저장 (placeholder)
executorRegistry.register('SaveImage', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const image = ctx.inputs.image;
  const path = String(ctx.nodeData.path ?? 'output.png');
  console.log('[SaveImage]', ctx.nodeId, ':', path, image);
  return { outputs: {} };
});

// Condition: 조건부 분기
executorRegistry.register('Condition', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const condition = Boolean(ctx.inputs.condition);
  const trueValue = ctx.inputs.true;
  const falseValue = ctx.inputs.false;

  return { outputs: { out: condition ? trueValue : falseValue } };
});
