/**
 * Executor Registry tests
 */

import { describe, it, expect } from 'vitest';
import { executorRegistry } from './executorRegistry';
import type { ExecutionContext } from './types';

describe('executorRegistry', () => {
  it('should have NumberInput executor registered', () => {
    expect(executorRegistry.has('NumberInput')).toBe(true);
  });

  it('should have TextInput executor registered', () => {
    expect(executorRegistry.has('TextInput')).toBe(true);
  });

  it('should have Math executor registered', () => {
    expect(executorRegistry.has('Math')).toBe(true);
  });

  it('should return undefined for unknown executor', () => {
    expect(executorRegistry.get('UnknownNode')).toBeUndefined();
  });
});

describe('NumberInput executor', () => {
  it('should output the value', async () => {
    const executor = executorRegistry.get('NumberInput');
    expect(executor).toBeDefined();

    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'NumberInput',
      inputs: {},
      nodeData: { value: 42 },
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe(42);
  });

  it('should default to 0 if no value', async () => {
    const executor = executorRegistry.get('NumberInput');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'NumberInput',
      inputs: {},
      nodeData: {},
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe(0);
  });
});

describe('TextInput executor', () => {
  it('should output the text', async () => {
    const executor = executorRegistry.get('TextInput');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'TextInput',
      inputs: {},
      nodeData: { text: 'Hello World' },
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe('Hello World');
  });
});

describe('Math executor', () => {
  it('should add numbers', async () => {
    const executor = executorRegistry.get('Math');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'Math',
      inputs: { a: 5, b: 3 },
      nodeData: { operation: 'add' },
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe(8);
  });

  it('should subtract numbers', async () => {
    const executor = executorRegistry.get('Math');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'Math',
      inputs: { a: 10, b: 4 },
      nodeData: { operation: 'subtract' },
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe(6);
  });

  it('should multiply numbers', async () => {
    const executor = executorRegistry.get('Math');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'Math',
      inputs: { a: 6, b: 7 },
      nodeData: { operation: 'multiply' },
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe(42);
  });

  it('should divide numbers', async () => {
    const executor = executorRegistry.get('Math');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'Math',
      inputs: { a: 20, b: 4 },
      nodeData: { operation: 'divide' },
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe(5);
  });

  it('should handle division by zero', async () => {
    const executor = executorRegistry.get('Math');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'Math',
      inputs: { a: 10, b: 0 },
      nodeData: { operation: 'divide' },
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe(0);
  });
});

describe('Compare executor', () => {
  it('should compare equality', async () => {
    const executor = executorRegistry.get('Compare');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'Compare',
      inputs: { a: 5, b: 5 },
      nodeData: { operator: '==' },
    };

    const result = await executor!(ctx);
    expect(result.outputs.result).toBe(true);
  });

  it('should compare less than', async () => {
    const executor = executorRegistry.get('Compare');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'Compare',
      inputs: { a: 3, b: 5 },
      nodeData: { operator: '<' },
    };

    const result = await executor!(ctx);
    expect(result.outputs.result).toBe(true);
  });
});

describe('Condition executor', () => {
  it('should return true value when condition is true', async () => {
    const executor = executorRegistry.get('Condition');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'Condition',
      inputs: { condition: true, true: 'yes', false: 'no' },
      nodeData: {},
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe('yes');
  });

  it('should return false value when condition is false', async () => {
    const executor = executorRegistry.get('Condition');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'Condition',
      inputs: { condition: false, true: 'yes', false: 'no' },
      nodeData: {},
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe('no');
  });
});

describe('TextJoin executor', () => {
  it('should join texts with separator', async () => {
    const executor = executorRegistry.get('TextJoin');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'TextJoin',
      inputs: { text1: 'Hello', text2: 'World' },
      nodeData: { separator: ' ' },
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe('Hello World');
  });
});

describe('TextSplit executor', () => {
  it('should split text by delimiter', async () => {
    const executor = executorRegistry.get('TextSplit');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'TextSplit',
      inputs: { text: 'a,b,c' },
      nodeData: { delimiter: ',' },
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toEqual(['a', 'b', 'c']);
  });
});

describe('JSONParse executor', () => {
  it('should parse valid JSON', async () => {
    const executor = executorRegistry.get('JSONParse');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'JSONParse',
      inputs: { json: '{"name": "test", "value": 42}' },
      nodeData: {},
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toEqual({ name: 'test', value: 42 });
  });

  it('should throw on invalid JSON', async () => {
    const executor = executorRegistry.get('JSONParse');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'JSONParse',
      inputs: { json: 'invalid json' },
      nodeData: {},
    };

    await expect(executor!(ctx)).rejects.toThrow('Invalid JSON');
  });
});

describe('ArrayGet executor', () => {
  it('should get item at index', async () => {
    const executor = executorRegistry.get('ArrayGet');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'ArrayGet',
      inputs: { array: ['a', 'b', 'c'], index: 1 },
      nodeData: {},
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe('b');
  });

  it('should support negative index', async () => {
    const executor = executorRegistry.get('ArrayGet');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'ArrayGet',
      inputs: { array: ['a', 'b', 'c'], index: -1 },
      nodeData: {},
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe('c');
  });
});

describe('ToString executor', () => {
  it('should convert number to string', async () => {
    const executor = executorRegistry.get('ToString');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'ToString',
      inputs: { value: 42 },
      nodeData: {},
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe('42');
  });

  it('should stringify object', async () => {
    const executor = executorRegistry.get('ToString');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'ToString',
      inputs: { value: { a: 1 } },
      nodeData: {},
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe('{"a":1}');
  });
});

describe('ToNumber executor', () => {
  it('should convert string to number', async () => {
    const executor = executorRegistry.get('ToNumber');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'ToNumber',
      inputs: { value: '42.5' },
      nodeData: {},
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe(42.5);
  });

  it('should convert boolean to number', async () => {
    const executor = executorRegistry.get('ToNumber');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'ToNumber',
      inputs: { value: true },
      nodeData: {},
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe(1);
  });
});

describe('ToBoolean executor', () => {
  it('should convert truthy values', async () => {
    const executor = executorRegistry.get('ToBoolean');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'ToBoolean',
      inputs: { value: 'hello' },
      nodeData: {},
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe(true);
  });

  it('should convert falsy values', async () => {
    const executor = executorRegistry.get('ToBoolean');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'ToBoolean',
      inputs: { value: 0 },
      nodeData: {},
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBe(false);
  });
});

describe('Random executor', () => {
  it('should generate number within range', async () => {
    const executor = executorRegistry.get('Random');
    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'Random',
      inputs: {},
      nodeData: { min: 0, max: 10 },
    };

    const result = await executor!(ctx);
    expect(result.outputs.out).toBeGreaterThanOrEqual(0);
    expect(result.outputs.out).toBeLessThan(10);
  });
});

describe('Timestamp executor', () => {
  it('should return current timestamp', async () => {
    const executor = executorRegistry.get('Timestamp');
    const before = Date.now();

    const ctx: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'Timestamp',
      inputs: {},
      nodeData: {},
    };

    const result = await executor!(ctx);
    const after = Date.now();

    expect(result.outputs.ms).toBeGreaterThanOrEqual(before);
    expect(result.outputs.ms).toBeLessThanOrEqual(after);
    expect(typeof result.outputs.iso).toBe('string');
  });
});
