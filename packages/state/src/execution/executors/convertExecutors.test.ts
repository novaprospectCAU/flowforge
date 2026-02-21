import { describe, it, expect } from 'vitest';
import { executorRegistry } from '../executorRegistry';
import '../executors';
import type { ExecutionContext } from '../types';

function ctx(inputs: Record<string, unknown>, nodeData: Record<string, unknown> = {}): ExecutionContext {
  return { nodeId: 'test', nodeType: 'Test', inputs, nodeData };
}

describe('ToString executor', () => {
  const exec = executorRegistry.get('ToString')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  it('should convert a number to string', async () => {
    const result = await exec(ctx({ value: 42 }));
    expect(result.outputs.out).toBe('42');
  });

  it('should convert a float to string', async () => {
    const result = await exec(ctx({ value: 3.14 }));
    expect(result.outputs.out).toBe('3.14');
  });

  it('should convert boolean true to string', async () => {
    const result = await exec(ctx({ value: true }));
    expect(result.outputs.out).toBe('true');
  });

  it('should convert boolean false to string', async () => {
    const result = await exec(ctx({ value: false }));
    expect(result.outputs.out).toBe('false');
  });

  it('should convert null to empty string', async () => {
    const result = await exec(ctx({ value: null }));
    expect(result.outputs.out).toBe('');
  });

  it('should convert undefined to empty string', async () => {
    const result = await exec(ctx({}));
    expect(result.outputs.out).toBe('');
  });

  it('should JSON.stringify an object', async () => {
    const result = await exec(ctx({ value: { a: 1, b: 'two' } }));
    expect(result.outputs.out).toBe('{"a":1,"b":"two"}');
  });

  it('should JSON.stringify an array', async () => {
    const result = await exec(ctx({ value: [1, 2, 3] }));
    expect(result.outputs.out).toBe('[1,2,3]');
  });

  it('should pass through a string as-is', async () => {
    const result = await exec(ctx({ value: 'hello' }));
    expect(result.outputs.out).toBe('hello');
  });

  it('should convert 0 to string "0"', async () => {
    const result = await exec(ctx({ value: 0 }));
    expect(result.outputs.out).toBe('0');
  });
});

describe('ToNumber executor', () => {
  const exec = executorRegistry.get('ToNumber')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  it('should convert string to number', async () => {
    const result = await exec(ctx({ value: '42.5' }));
    expect(result.outputs.out).toBe(42.5);
  });

  it('should convert integer string to number', async () => {
    const result = await exec(ctx({ value: '100' }));
    expect(result.outputs.out).toBe(100);
  });

  it('should pass through a number as-is', async () => {
    const result = await exec(ctx({ value: 99 }));
    expect(result.outputs.out).toBe(99);
  });

  it('should convert boolean true to 1', async () => {
    const result = await exec(ctx({ value: true }));
    expect(result.outputs.out).toBe(1);
  });

  it('should convert boolean false to 0', async () => {
    const result = await exec(ctx({ value: false }));
    expect(result.outputs.out).toBe(0);
  });

  it('should return 0 for NaN string', async () => {
    const result = await exec(ctx({ value: 'not-a-number' }));
    // parseFloat('not-a-number') returns NaN, NaN || 0 = 0
    expect(result.outputs.out).toBe(0);
  });

  it('should return 0 for null', async () => {
    const result = await exec(ctx({ value: null }));
    expect(result.outputs.out).toBe(0);
  });

  it('should return 0 for undefined', async () => {
    const result = await exec(ctx({}));
    expect(result.outputs.out).toBe(0);
  });

  it('should return 0 for an object', async () => {
    const result = await exec(ctx({ value: { a: 1 } }));
    expect(result.outputs.out).toBe(0);
  });

  it('should return 0 for an array', async () => {
    const result = await exec(ctx({ value: [1, 2, 3] }));
    expect(result.outputs.out).toBe(0);
  });

  it('should parse string with leading number', async () => {
    const result = await exec(ctx({ value: '123abc' }));
    // parseFloat('123abc') = 123
    expect(result.outputs.out).toBe(123);
  });

  it('should return 0 for empty string', async () => {
    const result = await exec(ctx({ value: '' }));
    // parseFloat('') = NaN, NaN || 0 = 0
    expect(result.outputs.out).toBe(0);
  });
});

describe('ToBoolean executor', () => {
  const exec = executorRegistry.get('ToBoolean')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  describe('truthy values', () => {
    it('should return true for non-empty string', async () => {
      const result = await exec(ctx({ value: 'hello' }));
      expect(result.outputs.out).toBe(true);
    });

    it('should return true for positive number', async () => {
      const result = await exec(ctx({ value: 42 }));
      expect(result.outputs.out).toBe(true);
    });

    it('should return true for negative number', async () => {
      const result = await exec(ctx({ value: -1 }));
      expect(result.outputs.out).toBe(true);
    });

    it('should return true for boolean true', async () => {
      const result = await exec(ctx({ value: true }));
      expect(result.outputs.out).toBe(true);
    });

    it('should return true for string "true"', async () => {
      const result = await exec(ctx({ value: 'true' }));
      // 'true' is NOT in the falsy list... wait, let me check: falsy = [false, 0, '', null, undefined, 'false', '0', 'no', 'off']
      // 'true' is not in falsy, so result is true
      expect(result.outputs.out).toBe(true);
    });

    it('should return true for string "yes"', async () => {
      const result = await exec(ctx({ value: 'yes' }));
      expect(result.outputs.out).toBe(true);
    });

    it('should return true for string "on"', async () => {
      const result = await exec(ctx({ value: 'on' }));
      expect(result.outputs.out).toBe(true);
    });

    it('should return true for string "1"', async () => {
      const result = await exec(ctx({ value: '1' }));
      expect(result.outputs.out).toBe(true);
    });

    it('should return true for non-empty array', async () => {
      const result = await exec(ctx({ value: [1, 2, 3] }));
      expect(result.outputs.out).toBe(true);
    });

    it('should return true for object', async () => {
      const result = await exec(ctx({ value: { a: 1 } }));
      expect(result.outputs.out).toBe(true);
    });
  });

  describe('falsy values', () => {
    it('should return false for boolean false', async () => {
      const result = await exec(ctx({ value: false }));
      expect(result.outputs.out).toBe(false);
    });

    it('should return false for 0', async () => {
      const result = await exec(ctx({ value: 0 }));
      expect(result.outputs.out).toBe(false);
    });

    it('should return false for empty string', async () => {
      const result = await exec(ctx({ value: '' }));
      expect(result.outputs.out).toBe(false);
    });

    it('should return false for null', async () => {
      const result = await exec(ctx({ value: null }));
      expect(result.outputs.out).toBe(false);
    });

    it('should return false for undefined', async () => {
      const result = await exec(ctx({}));
      expect(result.outputs.out).toBe(false);
    });

    it('should return false for string "false"', async () => {
      const result = await exec(ctx({ value: 'false' }));
      expect(result.outputs.out).toBe(false);
    });

    it('should return false for string "0"', async () => {
      const result = await exec(ctx({ value: '0' }));
      expect(result.outputs.out).toBe(false);
    });

    it('should return false for string "no"', async () => {
      const result = await exec(ctx({ value: 'no' }));
      expect(result.outputs.out).toBe(false);
    });

    it('should return false for string "off"', async () => {
      const result = await exec(ctx({ value: 'off' }));
      expect(result.outputs.out).toBe(false);
    });
  });
});
