import type { NodeExecutor, ExecutionContext, ExecutionResult } from './types';

// === 이미지 처리 헬퍼 함수들 ===

/**
 * 이미지 데이터 URL을 ImageBitmap으로 로드
 */
async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Canvas에서 이미지 데이터 URL 추출
 */
function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

/**
 * 이미지 리사이즈
 */
async function resizeImage(dataUrl: string, scale: number): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvasToDataUrl(canvas);
}

/**
 * 이미지 필터 적용
 */
async function applyFilter(dataUrl: string, filterType: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // 필터 적용
  switch (filterType) {
    case 'grayscale':
      ctx.filter = 'grayscale(100%)';
      break;
    case 'blur':
      ctx.filter = 'blur(3px)';
      break;
    case 'sharpen':
      // CSS filter doesn't have sharpen, use contrast instead
      ctx.filter = 'contrast(150%)';
      break;
    case 'invert':
      ctx.filter = 'invert(100%)';
      break;
    case 'sepia':
      ctx.filter = 'sepia(100%)';
      break;
    case 'brightness':
      ctx.filter = 'brightness(150%)';
      break;
    default:
      ctx.filter = 'none';
  }

  ctx.drawImage(img, 0, 0);
  return canvasToDataUrl(canvas);
}

/**
 * 이미지 다운로드
 */
function downloadImage(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

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

// Resize: 이미지 리사이즈
executorRegistry.register('Resize', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const image = ctx.inputs.image as { type: string; imageData: string; fileName?: string } | undefined;
  const scale = Number(ctx.nodeData.scale ?? ctx.inputs.scale ?? 1);

  if (!image || !image.imageData) {
    throw new Error('No image input');
  }

  // Canvas로 리사이즈
  const resizedData = await resizeImage(image.imageData, scale);

  return {
    outputs: {
      out: { type: 'image', imageData: resizedData, fileName: image.fileName, scale },
    },
  };
});

// Filter: 이미지 필터
executorRegistry.register('Filter', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const image = ctx.inputs.image as { type: string; imageData: string; fileName?: string } | undefined;
  const filterType = String(ctx.nodeData.filter ?? 'none');

  if (!image || !image.imageData) {
    throw new Error('No image input');
  }

  // 필터 적용
  const filteredData = await applyFilter(image.imageData, filterType);

  return {
    outputs: {
      out: { type: 'image', imageData: filteredData, fileName: image.fileName, filter: filterType },
    },
  };
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

// Display: 결과 표시
executorRegistry.register('Display', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const input = ctx.inputs.in;
  console.log('[Display]', ctx.nodeId, ':', input);

  // 결과를 displayValue로 저장 (UI에서 표시용)
  return {
    outputs: {},
    nodeDataUpdate: { displayValue: input },
  };
});

// SaveImage: 이미지 저장 (다운로드)
executorRegistry.register('SaveImage', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const image = ctx.inputs.image as { type: string; imageData: string } | undefined;
  const path = String(ctx.nodeData.path ?? 'output.png');

  if (!image || !image.imageData) {
    throw new Error('No image input');
  }

  // 이미지 다운로드
  downloadImage(image.imageData, path);
  console.log('[SaveImage]', ctx.nodeId, ':', path);

  return { outputs: {} };
});

// Condition: 조건부 분기
executorRegistry.register('Condition', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const condition = Boolean(ctx.inputs.condition);
  const trueValue = ctx.inputs.true;
  const falseValue = ctx.inputs.false;

  return { outputs: { out: condition ? trueValue : falseValue } };
});
