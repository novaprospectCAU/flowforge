import type { NodeExecutor, ExecutionContext, ExecutionResult } from './types';
import { downloadImage } from '@flowforge/canvas';

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

// === 새로운 Logic 노드들 ===

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
  } else {
    console.warn(`[Switch ${ctx.nodeId}] Index ${index} out of range (0-2), input dropped`);
  }

  return { outputs };
});

// === Text 노드들 ===

// TextJoin: 텍스트 결합
executorRegistry.register('TextJoin', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const texts = [ctx.inputs.text1, ctx.inputs.text2, ctx.inputs.text3]
    .filter(t => t !== undefined && t !== null)
    .map(String);
  const separator = String(ctx.nodeData.separator ?? ctx.inputs.separator ?? '');

  return { outputs: { out: texts.join(separator) } };
});

// TextSplit: 텍스트 분할
executorRegistry.register('TextSplit', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const text = String(ctx.inputs.text ?? '');
  const delimiter = String(ctx.nodeData.delimiter ?? ctx.inputs.delimiter ?? ',');

  return { outputs: { out: text.split(delimiter) } };
});

// TextReplace: 텍스트 치환
executorRegistry.register('TextReplace', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const text = String(ctx.inputs.text ?? '');
  const find = String(ctx.inputs.find ?? '');
  const replace = String(ctx.inputs.replace ?? '');
  const useRegex = Boolean(ctx.nodeData.useRegex);

  let result: string;
  if (useRegex) {
    try {
      const regex = new RegExp(find, 'g');
      result = text.replace(regex, replace);
    } catch {
      result = text.split(find).join(replace);
    }
  } else {
    result = text.split(find).join(replace);
  }

  return { outputs: { out: result } };
});

// TextLength: 텍스트 길이
executorRegistry.register('TextLength', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const text = String(ctx.inputs.text ?? '');
  return { outputs: { out: text.length } };
});

// TextCase: 대소문자 변환
executorRegistry.register('TextCase', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const text = String(ctx.inputs.text ?? '');
  const caseType = String(ctx.nodeData.case ?? 'upper');

  let result: string;
  switch (caseType) {
    case 'upper':
      result = text.toUpperCase();
      break;
    case 'lower':
      result = text.toLowerCase();
      break;
    case 'title':
      result = text.replace(/\b\w/g, c => c.toUpperCase());
      break;
    case 'sentence':
      result = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      break;
    default:
      result = text;
  }

  return { outputs: { out: result } };
});

// === Data 노드들 ===

// JSONParse: JSON 파싱
executorRegistry.register('JSONParse', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const json = String(ctx.inputs.json ?? '{}');

  try {
    const parsed = JSON.parse(json);
    return { outputs: { out: parsed } };
  } catch (e) {
    throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
});

// JSONStringify: JSON 문자열화
executorRegistry.register('JSONStringify', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const object = ctx.inputs.object;
  const pretty = Boolean(ctx.nodeData.pretty);

  const json = pretty ? JSON.stringify(object, null, 2) : JSON.stringify(object);
  return { outputs: { out: json } };
});

// GetProperty: 객체 속성 접근
executorRegistry.register('GetProperty', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const object = ctx.inputs.object as Record<string, unknown> | undefined;
  const key = String(ctx.inputs.key ?? ctx.nodeData.key ?? '');

  if (!object || typeof object !== 'object') {
    return { outputs: { out: undefined } };
  }

  // 중첩 키 지원 (예: "user.name")
  const keys = key.split('.');
  let value: unknown = object;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      value = undefined;
      break;
    }
  }

  return { outputs: { out: value } };
});

// ArrayGet: 배열 인덱스 접근
executorRegistry.register('ArrayGet', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const array = ctx.inputs.array;
  const index = Math.floor(Number(ctx.inputs.index ?? 0));

  if (!Array.isArray(array)) {
    return { outputs: { out: undefined } };
  }

  // 음수 인덱스 지원
  const actualIndex = index < 0 ? array.length + index : index;
  return { outputs: { out: array[actualIndex] } };
});

// ArrayLength: 배열 길이
executorRegistry.register('ArrayLength', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const array = ctx.inputs.array;

  if (!Array.isArray(array)) {
    return { outputs: { out: 0 } };
  }

  return { outputs: { out: array.length } };
});

// CreateArray: 배열 생성
executorRegistry.register('CreateArray', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const items = [ctx.inputs.item0, ctx.inputs.item1, ctx.inputs.item2, ctx.inputs.item3]
    .filter(item => item !== undefined);

  return { outputs: { out: items } };
});

// === Utility 노드들 ===

// Delay: 지연
executorRegistry.register('Delay', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const input = ctx.inputs.input;
  const ms = Math.max(0, Math.floor(Number(ctx.nodeData.ms ?? ctx.inputs.ms ?? 1000)));

  await new Promise(resolve => setTimeout(resolve, ms));
  return { outputs: { out: input } };
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

// === Convert 노드들 ===

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

  // falsy 값들
  const falsy = [false, 0, '', null, undefined, 'false', '0', 'no', 'off'];
  const result = !falsy.includes(value as typeof falsy[number]);

  return { outputs: { out: result } };
});

// === Data 노드들 (추가) ===

// HTTPRequest: HTTP 요청
executorRegistry.register('HTTPRequest', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const url = String(ctx.inputs.url ?? '');
  const method = String(ctx.nodeData.method ?? 'GET').toUpperCase();
  const inputHeaders = ctx.inputs.headers as Record<string, string> | undefined;
  const body = ctx.inputs.body;

  if (!url) {
    throw new Error('URL is required');
  }

  const fetchOptions: RequestInit = {
    method,
    signal: ctx.signal,
  };

  // 헤더 설정
  const headers: Record<string, string> = { ...inputHeaders };
  if (body !== undefined && body !== null && method !== 'GET' && method !== 'HEAD') {
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  if (Object.keys(headers).length > 0) {
    fetchOptions.headers = headers;
  }

  const response = await fetch(url, fetchOptions);

  // 응답 본문 파싱 (JSON 또는 텍스트)
  const contentType = response.headers.get('content-type') || '';
  let responseData: unknown;
  if (contentType.includes('application/json')) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  // 응답 헤더를 object로 변환
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return {
    outputs: {
      response: responseData,
      status: response.status,
      headers: responseHeaders,
    },
  };
});

// === Logic 노드들 (추가) ===

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
