import { describe, it, expect } from 'vitest';
import { executorRegistry } from '../executorRegistry';
import '../executors';
import type { ExecutionContext } from '../types';

function ctx(inputs: Record<string, unknown>, nodeData: Record<string, unknown> = {}): ExecutionContext {
  return { nodeId: 'test', nodeType: 'Test', inputs, nodeData };
}

describe('TextJoin executor', () => {
  const exec = executorRegistry.get('TextJoin')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  it('should join texts with a separator', async () => {
    const result = await exec(ctx(
      { text1: 'Hello', text2: 'World' },
      { separator: ' ' },
    ));
    expect(result.outputs.out).toBe('Hello World');
  });

  it('should join texts without separator', async () => {
    const result = await exec(ctx(
      { text1: 'foo', text2: 'bar', text3: 'baz' },
    ));
    expect(result.outputs.out).toBe('foobarbaz');
  });

  it('should filter out null values', async () => {
    const result = await exec(ctx(
      { text1: 'a', text2: null, text3: 'b' },
      { separator: ',' },
    ));
    expect(result.outputs.out).toBe('a,b');
  });

  it('should filter out undefined values', async () => {
    const result = await exec(ctx(
      { text1: 'a', text3: 'b' },
      { separator: ',' },
    ));
    expect(result.outputs.out).toBe('a,b');
  });

  it('should handle a single text input', async () => {
    const result = await exec(ctx(
      { text1: 'only' },
      { separator: ',' },
    ));
    expect(result.outputs.out).toBe('only');
  });

  it('should return empty string when no texts provided', async () => {
    const result = await exec(ctx({}));
    expect(result.outputs.out).toBe('');
  });

  it('should accept separator from inputs', async () => {
    const result = await exec(ctx(
      { text1: 'a', text2: 'b', separator: '-' },
    ));
    expect(result.outputs.out).toBe('a-b');
  });

  it('should prefer nodeData separator over inputs', async () => {
    const result = await exec(ctx(
      { text1: 'a', text2: 'b', separator: '-' },
      { separator: '|' },
    ));
    expect(result.outputs.out).toBe('a|b');
  });

  it('should convert non-string inputs to strings', async () => {
    const result = await exec(ctx(
      { text1: 123, text2: true },
      { separator: ',' },
    ));
    expect(result.outputs.out).toBe('123,true');
  });
});

describe('TextSplit executor', () => {
  const exec = executorRegistry.get('TextSplit')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  it('should split by comma (default delimiter)', async () => {
    const result = await exec(ctx({ text: 'a,b,c' }));
    expect(result.outputs.out).toEqual(['a', 'b', 'c']);
  });

  it('should split by custom delimiter', async () => {
    const result = await exec(ctx(
      { text: 'hello world foo' },
      { delimiter: ' ' },
    ));
    expect(result.outputs.out).toEqual(['hello', 'world', 'foo']);
  });

  it('should accept delimiter from inputs', async () => {
    const result = await exec(ctx(
      { text: 'a|b|c', delimiter: '|' },
    ));
    expect(result.outputs.out).toEqual(['a', 'b', 'c']);
  });

  it('should split empty string', async () => {
    const result = await exec(ctx({ text: '' }, { delimiter: ',' }));
    expect(result.outputs.out).toEqual(['']);
  });

  it('should return single-element array when delimiter not found', async () => {
    const result = await exec(ctx(
      { text: 'no-commas' },
      { delimiter: ',' },
    ));
    expect(result.outputs.out).toEqual(['no-commas']);
  });

  it('should handle undefined text as empty string', async () => {
    const result = await exec(ctx({}));
    expect(result.outputs.out).toEqual(['']);
  });
});

describe('TextReplace executor', () => {
  const exec = executorRegistry.get('TextReplace')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  it('should replace plain text (all occurrences)', async () => {
    const result = await exec(ctx(
      { text: 'hello world hello', find: 'hello', replace: 'hi' },
    ));
    expect(result.outputs.out).toBe('hi world hi');
  });

  it('should handle case-sensitive replacement', async () => {
    const result = await exec(ctx(
      { text: 'Hello hello HELLO', find: 'hello', replace: 'X' },
    ));
    expect(result.outputs.out).toBe('Hello X HELLO');
  });

  it('should replace with regex mode', async () => {
    const result = await exec(ctx(
      { text: 'foo123bar456', find: '\\d+', replace: '#' },
      { useRegex: true },
    ));
    expect(result.outputs.out).toBe('foo#bar#');
  });

  it('should throw on invalid regex', async () => {
    await expect(exec(ctx(
      { text: 'test', find: '[invalid', replace: '' },
      { useRegex: true },
    ))).rejects.toThrow('Invalid regex pattern');
  });

  it('should replace empty find with nothing in plain mode', async () => {
    const result = await exec(ctx(
      { text: 'abc', find: '', replace: 'X' },
    ));
    // split('').join('X') inserts X between each character
    expect(result.outputs.out).toBe('aXbXc');
  });

  it('should handle no find input (defaults to empty string)', async () => {
    const result = await exec(ctx({ text: 'abc' }));
    // find defaults to '', replace defaults to ''
    expect(result.outputs.out).toBe('abc');
  });
});

describe('TextLength executor', () => {
  const exec = executorRegistry.get('TextLength')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  it('should return the length of a normal string', async () => {
    const result = await exec(ctx({ text: 'hello' }));
    expect(result.outputs.out).toBe(5);
  });

  it('should return 0 for empty string', async () => {
    const result = await exec(ctx({ text: '' }));
    expect(result.outputs.out).toBe(0);
  });

  it('should return 0 for null input (coerced to empty string)', async () => {
    const result = await exec(ctx({ text: null }));
    // String(null) would be "null" but null ?? '' is '', so String('') = ''
    // Actually: ctx.inputs.text ?? '' => null ?? '' => null is not undefined/null for ?? ...
    // Wait: null ?? '' => ''. So String('') = '', length = 0
    expect(result.outputs.out).toBe(0);
  });

  it('should return 0 for undefined input', async () => {
    const result = await exec(ctx({}));
    // ctx.inputs.text is undefined, undefined ?? '' = '', length = 0
    expect(result.outputs.out).toBe(0);
  });

  it('should handle numeric input coerced to string', async () => {
    const result = await exec(ctx({ text: 12345 }));
    // 12345 ?? '' = 12345, String(12345) = '12345', length = 5
    expect(result.outputs.out).toBe(5);
  });
});

describe('TextCase executor', () => {
  const exec = executorRegistry.get('TextCase')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  it('should convert to uppercase', async () => {
    const result = await exec(ctx({ text: 'hello world' }, { case: 'upper' }));
    expect(result.outputs.out).toBe('HELLO WORLD');
  });

  it('should convert to lowercase', async () => {
    const result = await exec(ctx({ text: 'HELLO WORLD' }, { case: 'lower' }));
    expect(result.outputs.out).toBe('hello world');
  });

  it('should convert to title case', async () => {
    const result = await exec(ctx({ text: 'hello world foo' }, { case: 'title' }));
    expect(result.outputs.out).toBe('Hello World Foo');
  });

  it('should convert to sentence case', async () => {
    const result = await exec(ctx({ text: 'hELLO WORLD' }, { case: 'sentence' }));
    expect(result.outputs.out).toBe('Hello world');
  });

  it('should default to upper case when no case specified', async () => {
    const result = await exec(ctx({ text: 'hello' }));
    expect(result.outputs.out).toBe('HELLO');
  });

  it('should return text unchanged for unknown case type', async () => {
    const result = await exec(ctx({ text: 'Hello' }, { case: 'unknown' }));
    expect(result.outputs.out).toBe('Hello');
  });

  it('should handle empty string', async () => {
    const result = await exec(ctx({ text: '' }, { case: 'upper' }));
    expect(result.outputs.out).toBe('');
  });
});
