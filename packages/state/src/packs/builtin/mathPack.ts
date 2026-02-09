/**
 * Mathematician Pack — 수학 노드 21개 + executors + 수식 파서
 */

import { NODE_SIZES } from '../../nodeTypes';
import type { BuiltinNodePack } from '../types';
import type { NodeExecutor, ExecutionContext, ExecutionResult } from '../../execution/types';

// === 수식 파서 (안전한 재귀 하강 파서, eval/Function 금지) ===

const MAX_EXPR_LENGTH = 1000;
const MAX_DEPTH = 50;

interface ParserState {
  expr: string;
  pos: number;
  vars: Record<string, number>;
  depth: number;
}

function parseExpression(state: ParserState): number {
  if (++state.depth > MAX_DEPTH) throw new Error('Expression too deeply nested');
  const result = parseAddSub(state);
  state.depth--;
  return result;
}

function parseAddSub(state: ParserState): number {
  let left = parseMulDiv(state);
  while (state.pos < state.expr.length) {
    skipWhitespace(state);
    const ch = state.expr[state.pos];
    if (ch === '+') { state.pos++; left = left + parseMulDiv(state); }
    else if (ch === '-') { state.pos++; left = left - parseMulDiv(state); }
    else break;
  }
  return left;
}

function parseMulDiv(state: ParserState): number {
  let left = parsePower(state);
  while (state.pos < state.expr.length) {
    skipWhitespace(state);
    const ch = state.expr[state.pos];
    if (ch === '*') { state.pos++; left = left * parsePower(state); }
    else if (ch === '/') {
      state.pos++;
      const right = parsePower(state);
      if (right === 0) throw new Error('Division by zero');
      left = left / right;
    }
    else if (ch === '%') {
      state.pos++;
      const right = parsePower(state);
      if (right === 0) throw new Error('Modulo by zero');
      left = left % right;
    }
    else break;
  }
  return left;
}

function parsePower(state: ParserState): number {
  const base = parseUnary(state);
  skipWhitespace(state);
  if (state.pos < state.expr.length && state.expr[state.pos] === '^') {
    state.pos++;
    const exp = parsePower(state); // 우결합
    return Math.pow(base, exp);
  }
  return base;
}

function parseUnary(state: ParserState): number {
  skipWhitespace(state);
  if (state.pos < state.expr.length && state.expr[state.pos] === '-') {
    state.pos++;
    return -parseUnary(state);
  }
  if (state.pos < state.expr.length && state.expr[state.pos] === '+') {
    state.pos++;
    return parseUnary(state);
  }
  return parseAtom(state);
}

function parseAtom(state: ParserState): number {
  skipWhitespace(state);

  // 괄호
  if (state.pos < state.expr.length && state.expr[state.pos] === '(') {
    state.pos++;
    const val = parseExpression(state);
    skipWhitespace(state);
    if (state.pos >= state.expr.length || state.expr[state.pos] !== ')') {
      throw new Error('Missing closing parenthesis');
    }
    state.pos++;
    return val;
  }

  // 숫자
  const numMatch = state.expr.slice(state.pos).match(/^(\d+\.?\d*|\.\d+)/);
  if (numMatch) {
    state.pos += numMatch[0].length;
    return parseFloat(numMatch[0]);
  }

  // 식별자 (함수 or 변수 or 상수)
  const idMatch = state.expr.slice(state.pos).match(/^[a-zA-Z_]\w*/);
  if (idMatch) {
    const name = idMatch[0].toLowerCase();
    state.pos += idMatch[0].length;
    skipWhitespace(state);

    // 상수
    if (name === 'pi') return Math.PI;
    if (name === 'e') return Math.E;

    // 함수: 괄호 필수
    if (state.pos < state.expr.length && state.expr[state.pos] === '(') {
      state.pos++;
      const args: number[] = [];
      skipWhitespace(state);
      if (state.pos < state.expr.length && state.expr[state.pos] !== ')') {
        args.push(parseExpression(state));
        while (state.pos < state.expr.length && state.expr[state.pos] === ',') {
          state.pos++;
          args.push(parseExpression(state));
        }
      }
      skipWhitespace(state);
      if (state.pos >= state.expr.length || state.expr[state.pos] !== ')') {
        throw new Error(`Missing closing parenthesis for function ${name}`);
      }
      state.pos++;
      return callFunction(name, args);
    }

    // 변수
    if (idMatch[0] in state.vars) {
      return state.vars[idMatch[0]];
    }

    throw new Error(`Unknown variable: ${idMatch[0]}`);
  }

  throw new Error(`Unexpected character at position ${state.pos}: '${state.expr[state.pos] ?? 'EOF'}'`);
}

function callFunction(name: string, args: number[]): number {
  switch (name) {
    case 'sqrt': return Math.sqrt(args[0] ?? 0);
    case 'sin': return Math.sin(args[0] ?? 0);
    case 'cos': return Math.cos(args[0] ?? 0);
    case 'tan': return Math.tan(args[0] ?? 0);
    case 'log': return Math.log(args[0] ?? 0);
    case 'abs': return Math.abs(args[0] ?? 0);
    case 'floor': return Math.floor(args[0] ?? 0);
    case 'ceil': return Math.ceil(args[0] ?? 0);
    case 'round': return Math.round(args[0] ?? 0);
    case 'min': return Math.min(...args);
    case 'max': return Math.max(...args);
    default: throw new Error(`Unknown function: ${name}`);
  }
}

function skipWhitespace(state: ParserState): void {
  while (state.pos < state.expr.length && /\s/.test(state.expr[state.pos])) {
    state.pos++;
  }
}

function evaluateExpression(expression: string, vars: Record<string, number> = {}): number {
  if (expression.length > MAX_EXPR_LENGTH) {
    throw new Error(`Expression too long (max ${MAX_EXPR_LENGTH} characters)`);
  }
  const state: ParserState = { expr: expression, pos: 0, vars, depth: 0 };
  const result = parseExpression(state);
  skipWhitespace(state);
  if (state.pos < state.expr.length) {
    throw new Error(`Unexpected character at position ${state.pos}: '${state.expr[state.pos]}'`);
  }
  return result;
}

// === Helper: 배열 입력 파싱 ===

function toNumberArray(input: unknown): number[] {
  if (Array.isArray(input)) return input.map(Number).filter(n => !isNaN(n));
  if (typeof input === 'string') {
    return input.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
  }
  return [];
}

// === Executor 생성 ===

function createMathExecutors(): Map<string, NodeExecutor> {
  const executors = new Map<string, NodeExecutor>();

  // Basic
  executors.set('math:Power', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const base = Number(ctx.inputs.base ?? 0);
    const exp = Number(ctx.inputs.exp ?? 2);
    return { outputs: { out: Math.pow(base, exp) } };
  });

  executors.set('math:Sqrt', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const x = Number(ctx.inputs.x ?? 0);
    return { outputs: { out: Math.sqrt(x) } };
  });

  executors.set('math:Abs', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const x = Number(ctx.inputs.x ?? 0);
    return { outputs: { out: Math.abs(x) } };
  });

  executors.set('math:Floor', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const x = Number(ctx.inputs.x ?? 0);
    return { outputs: { out: Math.floor(x) } };
  });

  executors.set('math:Ceil', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const x = Number(ctx.inputs.x ?? 0);
    return { outputs: { out: Math.ceil(x) } };
  });

  executors.set('math:Round', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const x = Number(ctx.inputs.x ?? 0);
    return { outputs: { out: Math.round(x) } };
  });

  executors.set('math:Log', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const x = Number(ctx.inputs.x ?? 0);
    if (x <= 0) throw new Error('Log of non-positive number');
    return { outputs: { out: Math.log(x) } };
  });

  executors.set('math:Exp', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const x = Number(ctx.inputs.x ?? 0);
    return { outputs: { out: Math.exp(x) } };
  });

  executors.set('math:Modulo', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const a = Number(ctx.inputs.a ?? 0);
    const b = Number(ctx.inputs.b ?? 1);
    if (b === 0) throw new Error('Modulo by zero');
    return { outputs: { out: a % b } };
  });

  // Trig
  executors.set('math:Sin', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const angle = Number(ctx.inputs.angle ?? 0);
    return { outputs: { out: Math.sin(angle) } };
  });

  executors.set('math:Cos', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const angle = Number(ctx.inputs.angle ?? 0);
    return { outputs: { out: Math.cos(angle) } };
  });

  executors.set('math:Tan', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const angle = Number(ctx.inputs.angle ?? 0);
    return { outputs: { out: Math.tan(angle) } };
  });

  executors.set('math:Atan2', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const y = Number(ctx.inputs.y ?? 0);
    const x = Number(ctx.inputs.x ?? 0);
    return { outputs: { out: Math.atan2(y, x) } };
  });

  // Stats
  executors.set('math:Mean', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const arr = toNumberArray(ctx.inputs.array);
    if (arr.length === 0) throw new Error('Empty array');
    return { outputs: { out: arr.reduce((a, b) => a + b, 0) / arr.length } };
  });

  executors.set('math:Median', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const arr = toNumberArray(ctx.inputs.array);
    if (arr.length === 0) throw new Error('Empty array');
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    return { outputs: { out: median } };
  });

  executors.set('math:Sum', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const arr = toNumberArray(ctx.inputs.array);
    return { outputs: { out: arr.reduce((a, b) => a + b, 0) } };
  });

  executors.set('math:StdDev', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const arr = toNumberArray(ctx.inputs.array);
    if (arr.length === 0) throw new Error('Empty array');
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((sum, x) => sum + (x - mean) ** 2, 0) / arr.length;
    return { outputs: { out: Math.sqrt(variance) } };
  });

  executors.set('math:MinMax', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const arr = toNumberArray(ctx.inputs.array);
    if (arr.length === 0) throw new Error('Empty array');
    return { outputs: { min: Math.min(...arr), max: Math.max(...arr) } };
  });

  // Constants
  executors.set('math:Pi', async (): Promise<ExecutionResult> => {
    return { outputs: { out: Math.PI } };
  });

  executors.set('math:E', async (): Promise<ExecutionResult> => {
    return { outputs: { out: Math.E } };
  });

  // Expression
  executors.set('math:Expression', async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const expression = String(ctx.inputs.expression ?? ctx.nodeData.expression ?? '0');
    const varsInput = ctx.inputs.vars ?? ctx.nodeData.vars ?? {};
    const vars: Record<string, number> = {};
    if (typeof varsInput === 'object' && varsInput !== null) {
      for (const [k, v] of Object.entries(varsInput as Record<string, unknown>)) {
        vars[k] = Number(v);
      }
    }
    const result = evaluateExpression(expression, vars);
    return { outputs: { out: result } };
  });

  return executors;
}

// === 노드 타입 정의 ===

export function createMathPack(): BuiltinNodePack {
  const S = NODE_SIZES;
  const COLOR = '#6366f1'; // indigo

  const nodes = [
    // Basic
    { type: 'math:Power', title: 'Power', category: 'Math/Basic', inputs: [{ id: 'base', name: 'base', dataType: 'number' as const }, { id: 'exp', name: 'exp', dataType: 'number' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.COMPACT_MEDIUM },
    { type: 'math:Sqrt', title: 'Sqrt', category: 'Math/Basic', inputs: [{ id: 'x', name: 'x', dataType: 'number' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.COMPACT_SMALL },
    { type: 'math:Abs', title: 'Abs', category: 'Math/Basic', inputs: [{ id: 'x', name: 'x', dataType: 'number' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.COMPACT_SMALL },
    { type: 'math:Floor', title: 'Floor', category: 'Math/Basic', inputs: [{ id: 'x', name: 'x', dataType: 'number' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.COMPACT_SMALL },
    { type: 'math:Ceil', title: 'Ceil', category: 'Math/Basic', inputs: [{ id: 'x', name: 'x', dataType: 'number' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.COMPACT_SMALL },
    { type: 'math:Round', title: 'Round', category: 'Math/Basic', inputs: [{ id: 'x', name: 'x', dataType: 'number' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.COMPACT_SMALL },
    { type: 'math:Log', title: 'Log', category: 'Math/Basic', inputs: [{ id: 'x', name: 'x', dataType: 'number' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.COMPACT_SMALL },
    { type: 'math:Exp', title: 'Exp', category: 'Math/Basic', inputs: [{ id: 'x', name: 'x', dataType: 'number' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.COMPACT_SMALL },
    { type: 'math:Modulo', title: 'Modulo', category: 'Math/Basic', inputs: [{ id: 'a', name: 'a', dataType: 'number' as const }, { id: 'b', name: 'b', dataType: 'number' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.COMPACT_MEDIUM },
    // Trig
    { type: 'math:Sin', title: 'Sin', category: 'Math/Trig', inputs: [{ id: 'angle', name: 'angle', dataType: 'number' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.COMPACT_SMALL },
    { type: 'math:Cos', title: 'Cos', category: 'Math/Trig', inputs: [{ id: 'angle', name: 'angle', dataType: 'number' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.COMPACT_SMALL },
    { type: 'math:Tan', title: 'Tan', category: 'Math/Trig', inputs: [{ id: 'angle', name: 'angle', dataType: 'number' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.COMPACT_SMALL },
    { type: 'math:Atan2', title: 'Atan2', category: 'Math/Trig', inputs: [{ id: 'y', name: 'y', dataType: 'number' as const }, { id: 'x', name: 'x', dataType: 'number' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.COMPACT_MEDIUM },
    // Stats
    { type: 'math:Mean', title: 'Mean', category: 'Math/Stats', inputs: [{ id: 'array', name: 'array', dataType: 'array' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.COMPACT_SMALL },
    { type: 'math:Median', title: 'Median', category: 'Math/Stats', inputs: [{ id: 'array', name: 'array', dataType: 'array' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.COMPACT_SMALL },
    { type: 'math:Sum', title: 'Sum', category: 'Math/Stats', inputs: [{ id: 'array', name: 'array', dataType: 'array' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.COMPACT_SMALL },
    { type: 'math:StdDev', title: 'Std Dev', category: 'Math/Stats', inputs: [{ id: 'array', name: 'array', dataType: 'array' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.COMPACT_SMALL },
    { type: 'math:MinMax', title: 'Min/Max', category: 'Math/Stats', inputs: [{ id: 'array', name: 'array', dataType: 'array' as const }], outputs: [{ id: 'min', name: 'min', dataType: 'number' as const }, { id: 'max', name: 'max', dataType: 'number' as const }], size: S.COMPACT_MEDIUM },
    // Constants
    { type: 'math:Pi', title: 'Pi', category: 'Math/Const', inputs: [] as { id: string; name: string; dataType: 'number' }[], outputs: [{ id: 'out', name: 'value', dataType: 'number' as const }], size: S.COMPACT_SMALL },
    { type: 'math:E', title: 'E', category: 'Math/Const', inputs: [] as { id: string; name: string; dataType: 'number' }[], outputs: [{ id: 'out', name: 'value', dataType: 'number' as const }], size: S.COMPACT_SMALL },
    // Expression
    { type: 'math:Expression', title: 'Expression', category: 'Math/Basic', inputs: [{ id: 'expression', name: 'expression', dataType: 'string' as const }, { id: 'vars', name: 'vars', dataType: 'object' as const }], outputs: [{ id: 'out', name: 'result', dataType: 'number' as const }], size: S.STANDARD_MEDIUM },
  ];

  const executors = createMathExecutors();

  return {
    manifest: {
      id: 'math',
      name: 'Mathematician Pack',
      description: 'Math functions: trig, stats, expressions, and constants',
      version: '1.0.0',
      author: 'FlowForge',
      category: 'Math',
      icon: 'f(x)',
      color: COLOR,
      kind: 'builtin',
    },
    nodes: nodes.map(n => ({
      nodeType: {
        type: n.type,
        title: n.title,
        category: n.category,
        description: `${n.title} operation`,
        inputs: n.inputs,
        outputs: n.outputs,
        defaultSize: n.size,
        color: COLOR,
      },
    })),
    executors,
  };
}
