import { describe, it, expect } from 'vitest';
import { executorRegistry } from '../executorRegistry';
import '../executors';
import type { ExecutionContext } from '../types';

function ctx(inputs: Record<string, unknown>, nodeData: Record<string, unknown> = {}): ExecutionContext {
  return { nodeId: 'test', nodeType: 'Test', inputs, nodeData };
}

describe('Math executor', () => {
  const exec = executorRegistry.get('Math')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  describe('add', () => {
    it('should add two positive numbers', async () => {
      const result = await exec(ctx({ a: 5, b: 3 }, { operation: 'add' }));
      expect(result.outputs.out).toBe(8);
    });

    it('should add negative numbers', async () => {
      const result = await exec(ctx({ a: -5, b: -3 }, { operation: 'add' }));
      expect(result.outputs.out).toBe(-8);
    });

    it('should add decimal numbers', async () => {
      const result = await exec(ctx({ a: 1.5, b: 2.3 }, { operation: 'add' }));
      expect(result.outputs.out).toBeCloseTo(3.8);
    });
  });

  describe('subtract', () => {
    it('should subtract two numbers', async () => {
      const result = await exec(ctx({ a: 10, b: 4 }, { operation: 'subtract' }));
      expect(result.outputs.out).toBe(6);
    });

    it('should return negative result', async () => {
      const result = await exec(ctx({ a: 3, b: 7 }, { operation: 'subtract' }));
      expect(result.outputs.out).toBe(-4);
    });
  });

  describe('multiply', () => {
    it('should multiply two numbers', async () => {
      const result = await exec(ctx({ a: 6, b: 7 }, { operation: 'multiply' }));
      expect(result.outputs.out).toBe(42);
    });

    it('should multiply by zero', async () => {
      const result = await exec(ctx({ a: 100, b: 0 }, { operation: 'multiply' }));
      expect(result.outputs.out).toBe(0);
    });
  });

  describe('divide', () => {
    it('should divide two numbers', async () => {
      const result = await exec(ctx({ a: 20, b: 4 }, { operation: 'divide' }));
      expect(result.outputs.out).toBe(5);
    });

    it('should return 0 on division by zero', async () => {
      const result = await exec(ctx({ a: 10, b: 0 }, { operation: 'divide' }));
      expect(result.outputs.out).toBe(0);
    });

    it('should handle decimal division', async () => {
      const result = await exec(ctx({ a: 7, b: 2 }, { operation: 'divide' }));
      expect(result.outputs.out).toBe(3.5);
    });
  });

  describe('power', () => {
    it('should compute power', async () => {
      const result = await exec(ctx({ a: 2, b: 10 }, { operation: 'power' }));
      expect(result.outputs.out).toBe(1024);
    });

    it('should handle power of zero', async () => {
      const result = await exec(ctx({ a: 5, b: 0 }, { operation: 'power' }));
      expect(result.outputs.out).toBe(1);
    });

    it('should handle fractional exponents', async () => {
      const result = await exec(ctx({ a: 9, b: 0.5 }, { operation: 'power' }));
      expect(result.outputs.out).toBeCloseTo(3);
    });
  });

  describe('modulo', () => {
    it('should compute modulo', async () => {
      const result = await exec(ctx({ a: 17, b: 5 }, { operation: 'modulo' }));
      expect(result.outputs.out).toBe(2);
    });

    it('should return 0 on modulo by zero', async () => {
      const result = await exec(ctx({ a: 10, b: 0 }, { operation: 'modulo' }));
      expect(result.outputs.out).toBe(0);
    });
  });

  describe('default operation', () => {
    it('should default to add when operation is unknown', async () => {
      const result = await exec(ctx({ a: 3, b: 4 }, { operation: 'unknown' }));
      expect(result.outputs.out).toBe(7);
    });

    it('should default to add when no operation provided', async () => {
      const result = await exec(ctx({ a: 3, b: 4 }));
      expect(result.outputs.out).toBe(7);
    });
  });

  describe('NaN inputs', () => {
    it('should coerce undefined inputs to 0', async () => {
      const result = await exec(ctx({}, { operation: 'add' }));
      expect(result.outputs.out).toBe(0);
    });

    it('should coerce null inputs to 0', async () => {
      const result = await exec(ctx({ a: null, b: null }, { operation: 'add' }));
      expect(result.outputs.out).toBe(0);
    });

    it('should coerce string numbers', async () => {
      const result = await exec(ctx({ a: '5', b: '3' }, { operation: 'add' }));
      expect(result.outputs.out).toBe(8);
    });

    it('should produce NaN for non-numeric strings', async () => {
      const result = await exec(ctx({ a: 'hello', b: 3 }, { operation: 'add' }));
      expect(result.outputs.out).toBeNaN();
    });
  });
});

describe('Random executor', () => {
  const exec = executorRegistry.get('Random')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  it('should generate a number within range', async () => {
    const result = await exec(ctx({}, { min: 10, max: 20 }));
    const value = result.outputs.out as number;
    expect(value).toBeGreaterThanOrEqual(10);
    expect(value).toBeLessThan(20);
  });

  it('should generate an integer when integer mode is on', async () => {
    const result = await exec(ctx({}, { min: 0, max: 100, integer: true }));
    const value = result.outputs.out as number;
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(100);
  });

  it('should use default range 0 to 1 when no min/max provided', async () => {
    const result = await exec(ctx({}));
    const value = result.outputs.out as number;
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  it('should accept min/max from inputs', async () => {
    const result = await exec(ctx({ min: 50, max: 60 }));
    const value = result.outputs.out as number;
    expect(value).toBeGreaterThanOrEqual(50);
    expect(value).toBeLessThan(60);
  });

  it('should prefer nodeData over inputs for min/max', async () => {
    const result = await exec(ctx({ min: 0, max: 100 }, { min: 90, max: 95 }));
    const value = result.outputs.out as number;
    expect(value).toBeGreaterThanOrEqual(90);
    expect(value).toBeLessThan(95);
  });
});

describe('Timestamp executor', () => {
  const exec = executorRegistry.get('Timestamp')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  it('should return ms as a number', async () => {
    const before = Date.now();
    const result = await exec(ctx({}));
    const after = Date.now();

    const ms = result.outputs.ms as number;
    expect(typeof ms).toBe('number');
    expect(ms).toBeGreaterThanOrEqual(before);
    expect(ms).toBeLessThanOrEqual(after);
  });

  it('should return iso as a valid ISO 8601 string', async () => {
    const result = await exec(ctx({}));
    const iso = result.outputs.iso as string;
    expect(typeof iso).toBe('string');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should have ms and iso representing the same moment', async () => {
    const result = await exec(ctx({}));
    const ms = result.outputs.ms as number;
    const iso = result.outputs.iso as string;
    expect(new Date(iso).getTime()).toBe(ms);
  });
});
