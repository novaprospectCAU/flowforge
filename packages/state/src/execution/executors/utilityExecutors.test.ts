import { describe, it, expect } from 'vitest';
import { executorRegistry } from '../executorRegistry';
import '../executors';
import type { ExecutionContext } from '../types';

function ctx(inputs: Record<string, unknown>, nodeData: Record<string, unknown> = {}): ExecutionContext {
  return { nodeId: 'test', nodeType: 'Test', inputs, nodeData };
}

describe('Display executor', () => {
  const exec = executorRegistry.get('Display')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  it('should store displayValue in nodeDataUpdate', async () => {
    const result = await exec(ctx({ in: 'hello' }));
    expect(result.nodeDataUpdate).toBeDefined();
    expect(result.nodeDataUpdate!.displayValue).toBe('hello');
  });

  it('should store numeric displayValue', async () => {
    const result = await exec(ctx({ in: 42 }));
    expect(result.nodeDataUpdate!.displayValue).toBe(42);
  });

  it('should store object displayValue', async () => {
    const obj = { a: 1, b: 2 };
    const result = await exec(ctx({ in: obj }));
    expect(result.nodeDataUpdate!.displayValue).toEqual(obj);
  });

  it('should store undefined displayValue when no input', async () => {
    const result = await exec(ctx({}));
    expect(result.nodeDataUpdate!.displayValue).toBeUndefined();
  });

  it('should store null displayValue', async () => {
    const result = await exec(ctx({ in: null }));
    expect(result.nodeDataUpdate!.displayValue).toBeNull();
  });

  it('should return empty outputs', async () => {
    const result = await exec(ctx({ in: 'test' }));
    expect(result.outputs).toEqual({});
  });
});

describe('Debug executor', () => {
  const exec = executorRegistry.get('Debug')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  describe('success mode', () => {
    it('should pass input through to output', async () => {
      const result = await exec(ctx({ input: 'data' }));
      expect(result.outputs.out).toBe('data');
    });

    it('should set debugMode to success', async () => {
      const result = await exec(ctx({ input: 'data' }));
      expect(result.nodeDataUpdate!.debugMode).toBe('success');
    });

    it('should store debugValue', async () => {
      const result = await exec(ctx({ input: 'data' }));
      expect(result.nodeDataUpdate!.debugValue).toBe('data');
    });

    it('should report type as "string" for string input', async () => {
      const result = await exec(ctx({ input: 'hello' }));
      const meta = result.nodeDataUpdate!.debugMeta as { type: string; size: string };
      expect(meta.type).toBe('string');
      expect(meta.size).toBe('5 chars');
    });

    it('should report type as "number" for number input', async () => {
      const result = await exec(ctx({ input: 42 }));
      const meta = result.nodeDataUpdate!.debugMeta as { type: string; size: string };
      expect(meta.type).toBe('number');
      expect(meta.size).toBe('-');
    });

    it('should report type as "boolean" for boolean input', async () => {
      const result = await exec(ctx({ input: true }));
      const meta = result.nodeDataUpdate!.debugMeta as { type: string; size: string };
      expect(meta.type).toBe('boolean');
      expect(meta.size).toBe('-');
    });

    it('should report type as "array" for array input', async () => {
      const result = await exec(ctx({ input: [1, 2, 3] }));
      const meta = result.nodeDataUpdate!.debugMeta as { type: string; size: string };
      expect(meta.type).toBe('array');
      expect(meta.size).toBe('3 items');
    });

    it('should report type as "object" for object input', async () => {
      const result = await exec(ctx({ input: { a: 1, b: 2 } }));
      const meta = result.nodeDataUpdate!.debugMeta as { type: string; size: string };
      expect(meta.type).toBe('object');
      expect(meta.size).toBe('2 keys');
    });

    it('should report type as "null" for null input', async () => {
      const result = await exec(ctx({ input: null }));
      const meta = result.nodeDataUpdate!.debugMeta as { type: string; size: string };
      expect(meta.type).toBe('null');
      expect(meta.size).toBe('-');
    });

    it('should report type as "undefined" for undefined input', async () => {
      const result = await exec(ctx({}));
      const meta = result.nodeDataUpdate!.debugMeta as { type: string; size: string };
      expect(meta.type).toBe('undefined');
      expect(meta.size).toBe('-');
    });

    it('should include a timestamp in debugMeta', async () => {
      const before = Date.now();
      const result = await exec(ctx({ input: 'test' }));
      const after = Date.now();
      const meta = result.nodeDataUpdate!.debugMeta as { timestamp: number };
      expect(meta.timestamp).toBeGreaterThanOrEqual(before);
      expect(meta.timestamp).toBeLessThanOrEqual(after);
    });

    it('should use nodeData.label for label when provided', async () => {
      // This test verifies the label is used in the console output.
      // The label is only used for logging, but we verify the executor runs without error.
      const result = await exec(ctx({ input: 'test' }, { label: 'MyLabel' }));
      expect(result.nodeDataUpdate!.debugMode).toBe('success');
    });
  });

  describe('error mode (upstream errors)', () => {
    it('should enter error mode when upstream errors present', async () => {
      const upstreamErrors = [
        { nodeId: 'n1', nodeType: 'Math', error: 'Division by zero' },
      ];
      const result = await exec(ctx({ input: 'data', __upstreamErrors: upstreamErrors }));
      expect(result.nodeDataUpdate!.debugMode).toBe('error');
    });

    it('should store the primary error', async () => {
      const upstreamErrors = [
        { nodeId: 'n1', nodeType: 'Math', error: 'Division by zero' },
      ];
      const result = await exec(ctx({ __upstreamErrors: upstreamErrors }));
      expect(result.nodeDataUpdate!.debugError).toEqual(upstreamErrors[0]);
    });

    it('should store all upstream errors', async () => {
      const upstreamErrors = [
        { nodeId: 'n1', nodeType: 'Math', error: 'Error 1' },
        { nodeId: 'n2', nodeType: 'Text', error: 'Error 2' },
      ];
      const result = await exec(ctx({ __upstreamErrors: upstreamErrors }));
      expect(result.nodeDataUpdate!.debugAllErrors).toEqual(upstreamErrors);
    });

    it('should return undefined output in error mode', async () => {
      const upstreamErrors = [
        { nodeId: 'n1', nodeType: 'Math', error: 'Fail' },
      ];
      const result = await exec(ctx({ __upstreamErrors: upstreamErrors }));
      expect(result.outputs.out).toBeUndefined();
    });

    it('should not enter error mode for empty upstream errors array', async () => {
      const result = await exec(ctx({ input: 'data', __upstreamErrors: [] }));
      expect(result.nodeDataUpdate!.debugMode).toBe('success');
    });
  });
});

describe('Comment executor', () => {
  const exec = executorRegistry.get('Comment')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  it('should return empty outputs', async () => {
    const result = await exec(ctx({}));
    expect(result.outputs).toEqual({});
  });

  it('should not return nodeDataUpdate', async () => {
    const result = await exec(ctx({}));
    expect(result.nodeDataUpdate).toBeUndefined();
  });
});

describe('Delay executor', () => {
  const exec = executorRegistry.get('Delay')!;

  it('should be registered', () => {
    expect(exec).toBeDefined();
  });

  it('should pass input through after delay', async () => {
    const result = await exec(ctx({ input: 'data' }, { ms: 10 }));
    expect(result.outputs.out).toBe('data');
  });

  it('should pass through any type of input', async () => {
    const result = await exec(ctx({ input: { key: 'value' } }, { ms: 10 }));
    expect(result.outputs.out).toEqual({ key: 'value' });
  });

  it('should pass through undefined when no input', async () => {
    const result = await exec(ctx({}, { ms: 10 }));
    expect(result.outputs.out).toBeUndefined();
  });

  it('should accept ms from inputs', async () => {
    const result = await exec(ctx({ input: 'data', ms: 10 }));
    expect(result.outputs.out).toBe('data');
  });

  it('should actually delay execution', async () => {
    const start = Date.now();
    await exec(ctx({ input: 'data' }, { ms: 50 }));
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40); // Allow small timing variance
  });

  it('should handle zero ms delay', async () => {
    const result = await exec(ctx({ input: 'data' }, { ms: 0 }));
    expect(result.outputs.out).toBe('data');
  });

  it('should handle negative ms as zero', async () => {
    const result = await exec(ctx({ input: 'data' }, { ms: -100 }));
    expect(result.outputs.out).toBe('data');
  });

  it('should be abortable via signal', async () => {
    const controller = new AbortController();
    const context: ExecutionContext = {
      nodeId: 'test',
      nodeType: 'Test',
      inputs: { input: 'data' },
      nodeData: { ms: 5000 },
      signal: controller.signal,
    };

    // Abort after a short delay
    setTimeout(() => controller.abort(), 20);

    await expect(exec(context)).rejects.toThrow('Execution aborted');
  });
});
