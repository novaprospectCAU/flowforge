import type { ExecutionContext, ExecutionResult } from '../types';
import { executorRegistry } from '../executorRegistry';

/**
 * URL 검증 함수 (SSRF 방지)
 * 허용되지 않는 프로토콜 및 내부 네트워크 주소를 차단
 */
function validateUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: '${url}'`);
  }

  // 프로토콜 검증: http/https만 허용
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `URL protocol '${parsed.protocol}' is not allowed. Only HTTP and HTTPS are supported.`
    );
  }

  // 호스트네임 추출 (IPv6 브라켓 제거)
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');

  // 내부 네트워크 주소 차단
  const privatePatterns: Array<{ pattern: RegExp; description: string }> = [
    { pattern: /^localhost$/i, description: 'localhost' },
    { pattern: /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, description: 'loopback (127.x.x.x)' },
    { pattern: /^0\.0\.0\.0$/, description: '0.0.0.0' },
    { pattern: /^::1$/, description: 'IPv6 loopback (::1)' },
    { pattern: /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, description: 'private network (10.x.x.x)' },
    {
      pattern: /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
      description: 'private network (172.16-31.x.x)',
    },
    { pattern: /^192\.168\.\d{1,3}\.\d{1,3}$/, description: 'private network (192.168.x.x)' },
    { pattern: /^169\.254\.\d{1,3}\.\d{1,3}$/, description: 'link-local (169.254.x.x)' },
  ];

  for (const { pattern, description } of privatePatterns) {
    if (pattern.test(hostname)) {
      throw new Error(
        `URL points to a private/internal network address (${description}) which is not allowed.`
      );
    }
  }
}

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

// HTTPRequest: HTTP 요청
executorRegistry.register('HTTPRequest', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
  const url = String(ctx.inputs.url ?? '');
  const method = String(ctx.nodeData.method ?? 'GET').toUpperCase();
  const inputHeaders = ctx.inputs.headers as Record<string, string> | undefined;
  const body = ctx.inputs.body;

  if (!url) {
    throw new Error('URL is required');
  }

  // URL 검증 (SSRF 방지)
  validateUrl(url);

  const fetchOptions: RequestInit = {
    method,
    signal: ctx.signal,
  };

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

  const contentType = response.headers.get('content-type') || '';
  let responseData: unknown;
  if (contentType.includes('application/json')) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return {
    outputs: {
      response: responseData,
      status: response.status,
      headers: responseHeaders,
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
    },
  };
});
