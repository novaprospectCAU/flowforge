import { describe, it, expect } from 'vitest';
import { executorRegistry } from '../executorRegistry';
import '../executors';
import type { ExecutionContext } from '../types';

function ctx(inputs: Record<string, unknown>, nodeData: Record<string, unknown> = {}): ExecutionContext {
  return { nodeId: 'test', nodeType: 'Test', inputs, nodeData };
}

describe('Condition executor', () => {
  const exec = executorRegistry.get('Condition')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  it('should return true path value when condition is true', async () => {
    const result = await exec(ctx({ condition: true, true: 'yes', false: 'no' }));
    expect(result.outputs.out).toBe('yes');
  });

  it('should return false path value when condition is false', async () => {
    const result = await exec(ctx({ condition: false, true: 'yes', false: 'no' }));
    expect(result.outputs.out).toBe('no');
  });

  it('should treat truthy values as true (non-zero number)', async () => {
    const result = await exec(ctx({ condition: 42, true: 'yes', false: 'no' }));
    expect(result.outputs.out).toBe('yes');
  });

  it('should treat truthy values as true (non-empty string)', async () => {
    const result = await exec(ctx({ condition: 'hello', true: 'yes', false: 'no' }));
    expect(result.outputs.out).toBe('yes');
  });

  it('should treat 0 as falsy', async () => {
    const result = await exec(ctx({ condition: 0, true: 'yes', false: 'no' }));
    expect(result.outputs.out).toBe('no');
  });

  it('should treat empty string as falsy', async () => {
    const result = await exec(ctx({ condition: '', true: 'yes', false: 'no' }));
    expect(result.outputs.out).toBe('no');
  });

  it('should treat null as falsy', async () => {
    const result = await exec(ctx({ condition: null, true: 'yes', false: 'no' }));
    expect(result.outputs.out).toBe('no');
  });

  it('should treat undefined as falsy', async () => {
    const result = await exec(ctx({ true: 'yes', false: 'no' }));
    expect(result.outputs.out).toBe('no');
  });
});

describe('Compare executor', () => {
  const exec = executorRegistry.get('Compare')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  describe('== operator', () => {
    it('should return true for loosely equal values', async () => {
      const result = await exec(ctx({ a: 5, b: 5 }, { operator: '==' }));
      expect(result.outputs.result).toBe(true);
    });

    it('should use type coercion', async () => {
      const result = await exec(ctx({ a: '5', b: 5 }, { operator: '==' }));
      expect(result.outputs.result).toBe(true);
    });

    it('should return false for unequal values', async () => {
      const result = await exec(ctx({ a: 5, b: 6 }, { operator: '==' }));
      expect(result.outputs.result).toBe(false);
    });
  });

  describe('=== operator', () => {
    it('should return true for strictly equal values', async () => {
      const result = await exec(ctx({ a: 5, b: 5 }, { operator: '===' }));
      expect(result.outputs.result).toBe(true);
    });

    it('should return false for different types', async () => {
      const result = await exec(ctx({ a: '5', b: 5 }, { operator: '===' }));
      expect(result.outputs.result).toBe(false);
    });
  });

  describe('!= operator', () => {
    it('should return true for unequal values', async () => {
      const result = await exec(ctx({ a: 5, b: 6 }, { operator: '!=' }));
      expect(result.outputs.result).toBe(true);
    });

    it('should return false for loosely equal values', async () => {
      const result = await exec(ctx({ a: '5', b: 5 }, { operator: '!=' }));
      expect(result.outputs.result).toBe(false);
    });
  });

  describe('!== operator', () => {
    it('should return true for different types', async () => {
      const result = await exec(ctx({ a: '5', b: 5 }, { operator: '!==' }));
      expect(result.outputs.result).toBe(true);
    });

    it('should return false for strictly equal values', async () => {
      const result = await exec(ctx({ a: 5, b: 5 }, { operator: '!==' }));
      expect(result.outputs.result).toBe(false);
    });
  });

  describe('< operator', () => {
    it('should return true when a < b', async () => {
      const result = await exec(ctx({ a: 3, b: 5 }, { operator: '<' }));
      expect(result.outputs.result).toBe(true);
    });

    it('should return false when a >= b', async () => {
      const result = await exec(ctx({ a: 5, b: 3 }, { operator: '<' }));
      expect(result.outputs.result).toBe(false);
    });

    it('should return false for equal values', async () => {
      const result = await exec(ctx({ a: 5, b: 5 }, { operator: '<' }));
      expect(result.outputs.result).toBe(false);
    });

    it('should throw for non-numeric values', async () => {
      await expect(exec(ctx({ a: 'abc', b: 5 }, { operator: '<' }))).rejects.toThrow(
        'Cannot compare non-numeric values',
      );
    });
  });

  describe('> operator', () => {
    it('should return true when a > b', async () => {
      const result = await exec(ctx({ a: 7, b: 3 }, { operator: '>' }));
      expect(result.outputs.result).toBe(true);
    });

    it('should return false when a <= b', async () => {
      const result = await exec(ctx({ a: 3, b: 7 }, { operator: '>' }));
      expect(result.outputs.result).toBe(false);
    });

    it('should throw for non-numeric values', async () => {
      await expect(exec(ctx({ a: 'xyz', b: 'abc' }, { operator: '>' }))).rejects.toThrow(
        'Cannot compare non-numeric values',
      );
    });
  });

  describe('<= operator', () => {
    it('should return true when a < b', async () => {
      const result = await exec(ctx({ a: 3, b: 5 }, { operator: '<=' }));
      expect(result.outputs.result).toBe(true);
    });

    it('should return true when a equals b', async () => {
      const result = await exec(ctx({ a: 5, b: 5 }, { operator: '<=' }));
      expect(result.outputs.result).toBe(true);
    });

    it('should return false when a > b', async () => {
      const result = await exec(ctx({ a: 7, b: 5 }, { operator: '<=' }));
      expect(result.outputs.result).toBe(false);
    });

    it('should throw for non-numeric values', async () => {
      await expect(exec(ctx({ a: 'abc', b: 5 }, { operator: '<=' }))).rejects.toThrow(
        'Cannot compare non-numeric values',
      );
    });
  });

  describe('>= operator', () => {
    it('should return true when a > b', async () => {
      const result = await exec(ctx({ a: 7, b: 5 }, { operator: '>=' }));
      expect(result.outputs.result).toBe(true);
    });

    it('should return true when a equals b', async () => {
      const result = await exec(ctx({ a: 5, b: 5 }, { operator: '>=' }));
      expect(result.outputs.result).toBe(true);
    });

    it('should return false when a < b', async () => {
      const result = await exec(ctx({ a: 3, b: 5 }, { operator: '>=' }));
      expect(result.outputs.result).toBe(false);
    });

    it('should throw for non-numeric values', async () => {
      await expect(exec(ctx({ a: undefined, b: 5 }, { operator: '>=' }))).rejects.toThrow(
        'Cannot compare non-numeric values',
      );
    });
  });

  describe('default operator', () => {
    it('should default to == when operator is unknown', async () => {
      const result = await exec(ctx({ a: 5, b: 5 }, { operator: 'unknown' }));
      expect(result.outputs.result).toBe(true);
    });

    it('should default to == when no operator provided', async () => {
      const result = await exec(ctx({ a: 5, b: 5 }));
      expect(result.outputs.result).toBe(true);
    });
  });
});

describe('Gate executor', () => {
  const exec = executorRegistry.get('Gate')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  it('should pass input through when enabled', async () => {
    const result = await exec(ctx({ input: 'data', enable: true }));
    expect(result.outputs.out).toBe('data');
  });

  it('should return undefined when disabled', async () => {
    const result = await exec(ctx({ input: 'data', enable: false }));
    expect(result.outputs.out).toBeUndefined();
  });

  it('should treat falsy enable as disabled', async () => {
    const result = await exec(ctx({ input: 'data', enable: 0 }));
    expect(result.outputs.out).toBeUndefined();
  });

  it('should treat truthy enable as enabled', async () => {
    const result = await exec(ctx({ input: 'data', enable: 1 }));
    expect(result.outputs.out).toBe('data');
  });

  it('should return undefined when enable is not provided', async () => {
    const result = await exec(ctx({ input: 'data' }));
    expect(result.outputs.out).toBeUndefined();
  });
});

describe('Switch executor', () => {
  const exec = executorRegistry.get('Switch')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  it('should route input to out0 when index is 0', async () => {
    const result = await exec(ctx({ input: 'data', index: 0 }));
    expect(result.outputs.out0).toBe('data');
    expect(result.outputs.out1).toBeUndefined();
    expect(result.outputs.out2).toBeUndefined();
  });

  it('should route input to out1 when index is 1', async () => {
    const result = await exec(ctx({ input: 'data', index: 1 }));
    expect(result.outputs.out0).toBeUndefined();
    expect(result.outputs.out1).toBe('data');
    expect(result.outputs.out2).toBeUndefined();
  });

  it('should route input to out2 when index is 2', async () => {
    const result = await exec(ctx({ input: 'data', index: 2 }));
    expect(result.outputs.out0).toBeUndefined();
    expect(result.outputs.out1).toBeUndefined();
    expect(result.outputs.out2).toBe('data');
  });

  it('should route to no output when index is out of range (negative)', async () => {
    const result = await exec(ctx({ input: 'data', index: -1 }));
    expect(result.outputs.out0).toBeUndefined();
    expect(result.outputs.out1).toBeUndefined();
    expect(result.outputs.out2).toBeUndefined();
  });

  it('should route to no output when index is out of range (too high)', async () => {
    const result = await exec(ctx({ input: 'data', index: 3 }));
    expect(result.outputs.out0).toBeUndefined();
    expect(result.outputs.out1).toBeUndefined();
    expect(result.outputs.out2).toBeUndefined();
  });

  it('should default index to 0', async () => {
    const result = await exec(ctx({ input: 'data' }));
    expect(result.outputs.out0).toBe('data');
  });

  it('should floor fractional index', async () => {
    const result = await exec(ctx({ input: 'data', index: 1.7 }));
    expect(result.outputs.out1).toBe('data');
    expect(result.outputs.out0).toBeUndefined();
    expect(result.outputs.out2).toBeUndefined();
  });
});

describe('ForEach executor', () => {
  const exec = executorRegistry.get('ForEach')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  it('should apply template with {{item}} replacement', async () => {
    const result = await exec(ctx(
      { array: ['a', 'b', 'c'] },
      { template: 'Item: {{item}}' },
    ));
    expect(result.outputs.results).toEqual(['Item: a', 'Item: b', 'Item: c']);
    expect(result.outputs.count).toBe(3);
  });

  it('should apply template with {{index}} replacement', async () => {
    const result = await exec(ctx(
      { array: ['x', 'y'] },
      { template: '{{index}}: {{item}}' },
    ));
    expect(result.outputs.results).toEqual(['0: x', '1: y']);
  });

  it('should use default template {{item}} when no template provided', async () => {
    const result = await exec(ctx({ array: [1, 2, 3] }));
    expect(result.outputs.results).toEqual(['1', '2', '3']);
  });

  it('should JSON.stringify object items in template', async () => {
    const result = await exec(ctx(
      { array: [{ name: 'a' }] },
      { template: '{{item}}' },
    ));
    expect(result.outputs.results).toEqual([JSON.stringify({ name: 'a' })]);
  });

  it('should return empty results for empty array', async () => {
    const result = await exec(ctx({ array: [] }, { template: '{{item}}' }));
    expect(result.outputs.results).toEqual([]);
    expect(result.outputs.count).toBe(0);
  });

  it('should throw error for non-array input', async () => {
    await expect(exec(ctx({ array: 'not an array' }))).rejects.toThrow('Input must be an array');
  });

  it('should throw error when array is undefined', async () => {
    await expect(exec(ctx({}))).rejects.toThrow('Input must be an array');
  });

  it('should throw error when array is a number', async () => {
    await expect(exec(ctx({ array: 42 }))).rejects.toThrow('Input must be an array');
  });

  it('should accept template from inputs', async () => {
    const result = await exec(ctx({ array: ['a'], template: 'val={{item}}' }));
    expect(result.outputs.results).toEqual(['val=a']);
  });

  it('should prefer nodeData template over inputs template', async () => {
    const result = await exec(ctx(
      { array: ['a'], template: 'from-input={{item}}' },
      { template: 'from-data={{item}}' },
    ));
    expect(result.outputs.results).toEqual(['from-data=a']);
  });

  it('should replace multiple occurrences of {{item}}', async () => {
    const result = await exec(ctx(
      { array: ['x'] },
      { template: '{{item}}-{{item}}' },
    ));
    expect(result.outputs.results).toEqual(['x-x']);
  });
});

describe('Range executor', () => {
  const exec = executorRegistry.get('Range')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  it('should generate a range of numbers', async () => {
    const result = await exec(ctx({ count: 5 }));
    expect(result.outputs.array).toEqual([0, 1, 2, 3, 4]);
  });

  it('should accept count from nodeData', async () => {
    const result = await exec(ctx({}, { count: 3 }));
    expect(result.outputs.array).toEqual([0, 1, 2]);
  });

  it('should return empty array for zero count', async () => {
    const result = await exec(ctx({ count: 0 }));
    expect(result.outputs.array).toEqual([]);
  });

  it('should return empty array for negative count', async () => {
    const result = await exec(ctx({ count: -5 }));
    expect(result.outputs.array).toEqual([]);
  });

  it('should floor fractional count', async () => {
    const result = await exec(ctx({ count: 3.7 }));
    expect(result.outputs.array).toEqual([0, 1, 2]);
  });

  it('should throw error when count exceeds MAX_RANGE', async () => {
    await expect(exec(ctx({ count: 100001 }))).rejects.toThrow(
      'Range count 100001 exceeds maximum of 100000',
    );
  });

  it('should allow exactly MAX_RANGE count', async () => {
    const result = await exec(ctx({ count: 100000 }));
    expect(result.outputs.array).toHaveLength(100000);
  });

  it('should default count to 0 when not provided', async () => {
    const result = await exec(ctx({}));
    expect(result.outputs.array).toEqual([]);
  });
});
