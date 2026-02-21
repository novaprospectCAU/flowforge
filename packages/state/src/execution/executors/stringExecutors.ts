import type { ExecutionContext, ExecutionResult } from '../types';
import { executorRegistry } from '../executorRegistry';

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
    } catch (e) {
      throw new Error(`Invalid regex pattern: ${find} - ${e instanceof Error ? e.message : String(e)}`);
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
