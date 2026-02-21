/**
 * Execution Engine error path tests
 *
 * Covers: missing executor, timeout, abort/cancel, circular dependency,
 * input validation, node execution errors, empty/disconnected graphs,
 * retry logic, partial failure, skip-and-continue, errorResilient nodes,
 * type coercion, and event emission.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExecutionEngine, executeFlow } from './engine';
import { executorRegistry } from './executorRegistry';
import { nodeTypeRegistry } from '../nodeTypes';
import type { FlowNode, FlowEdge } from '@flowforge/types';
import type { ExecutionEvent, NodeExecutor } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(id: string, type = 'TestNode', data: Record<string, unknown> = {}): FlowNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    size: { width: 160, height: 80 },
    data,
    inputs: [{ id: 'in', name: 'in', dataType: 'any' }],
    outputs: [{ id: 'out', name: 'out', dataType: 'any' }],
  };
}

function makeEdge(source: string, target: string, sourcePort = 'out', targetPort = 'in'): FlowEdge {
  return {
    id: `${source}-${target}`,
    source,
    sourcePort,
    target,
    targetPort,
  };
}

/** Collect all events emitted during an execution. */
function collectEvents(): { events: ExecutionEvent[]; onEvent: (e: ExecutionEvent) => void } {
  const events: ExecutionEvent[] = [];
  return { events, onEvent: (e: ExecutionEvent) => events.push(e) };
}

/** A simple executor that passes through its inputs. */
const passThroughExecutor: NodeExecutor = async (ctx) => ({
  outputs: { out: ctx.inputs.in ?? ctx.nodeData.value ?? 'ok' },
});

/** An executor that always throws. */
const failingExecutor: NodeExecutor = async () => {
  throw new Error('Executor exploded');
};

/** An executor that returns a result with error field set. */
const softFailExecutor: NodeExecutor = async () => ({
  outputs: {},
  error: 'Soft failure from executor',
});

// ---------------------------------------------------------------------------
// Setup & teardown
// ---------------------------------------------------------------------------

const TEST_NODE_TYPES = [
  'TestNode', 'FailNode', 'SlowNode', 'SoftFail', 'ErrResilient',
  'TypedInput', 'StringThrow', 'RetryNode', 'AlwaysFail', 'StrSrc',
  'NumSrc', 'TrueSrc', 'BoolSrc', 'Source', 'Sink', 'Inspector',
  'Src1', 'Src2', 'Multi', 'Updater', 'DepthCheck', 'Output42',
  'Adder', 'Doubler', 'Tracker', 'FastTrack', 'TestNode_bool',
] as const;

beforeEach(() => {
  // Register reusable executors
  executorRegistry.register('TestNode', passThroughExecutor);
  executorRegistry.register('FailNode', failingExecutor);
  executorRegistry.register('SoftFail', softFailExecutor);
  executorRegistry.register('ErrResilient', async (ctx) => ({
    outputs: { out: ctx.inputs.__upstreamErrors ?? 'no-errors' },
  }));
});

afterEach(() => {
  // Clean up all test executors
  for (const t of TEST_NODE_TYPES) {
    executorRegistry.unregister(t);
  }
  // Clean up test node type definitions
  nodeTypeRegistry.unregister('TypedInput');
  nodeTypeRegistry.unregister('ErrResilient');
});

// ===========================================================================
// 1. Empty & trivial graphs
// ===========================================================================

describe('Empty and trivial graphs', () => {
  it('should succeed with no nodes', async () => {
    const engine = new ExecutionEngine();
    const result = await engine.execute([], []);
    expect(result.status).toBe('success');
  });

  it('should emit start and complete events for empty graph', async () => {
    const { events, onEvent } = collectEvents();
    await executeFlow([], [], { onEvent });
    expect(events.map(e => e.type)).toEqual(['start', 'complete']);
  });

  it('should succeed with a single node', async () => {
    const node = makeNode('a');
    const result = await executeFlow([node], []);
    expect(result.status).toBe('success');
    expect(result.nodeStates.get('a')?.status).toBe('success');
  });

  it('should succeed with disconnected nodes (no edges)', async () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const result = await executeFlow(nodes, []);
    expect(result.status).toBe('success');
    for (const n of nodes) {
      expect(result.nodeStates.get(n.id)?.status).toBe('success');
    }
  });
});

// ===========================================================================
// 2. Missing executor
// ===========================================================================

describe('Missing executor', () => {
  it('should error when node type has no registered executor', async () => {
    const node = makeNode('a', 'UnknownType');
    const result = await executeFlow([node], []);
    expect(result.status).toBe('error');
  });

  it('should emit node-error event for missing executor', async () => {
    const { events, onEvent } = collectEvents();
    const node = makeNode('a', 'NoSuchType');
    await executeFlow([node], [], { onEvent });

    const nodeError = events.find(e => e.type === 'node-error') as Extract<ExecutionEvent, { type: 'node-error' }>;
    expect(nodeError).toBeDefined();
    expect(nodeError.error).toContain('No executor found');
    expect(nodeError.error).toContain('NoSuchType');
  });

  it('should record error in nodeState for missing executor', async () => {
    const node = makeNode('a', 'GhostType');
    const result = await executeFlow([node], []);
    const state = result.nodeStates.get('a');
    expect(state?.status).toBe('error');
    expect(state?.error).toContain('No executor found');
  });
});

// ===========================================================================
// 3. Node execution errors (executor throws)
// ===========================================================================

describe('Node execution errors', () => {
  it('should set status to error when executor throws', async () => {
    const node = makeNode('a', 'FailNode');
    const result = await executeFlow([node], []);
    expect(result.status).toBe('error');
    expect(result.nodeStates.get('a')?.error).toBe('Executor exploded');
  });

  it('should emit node-error with correct message', async () => {
    const { events, onEvent } = collectEvents();
    const node = makeNode('a', 'FailNode');
    await executeFlow([node], [], { onEvent });

    const errEvt = events.find(e => e.type === 'node-error') as Extract<ExecutionEvent, { type: 'node-error' }>;
    expect(errEvt).toBeDefined();
    expect(errEvt.error).toBe('Executor exploded');
  });

  it('should treat executor result.error as a thrown error', async () => {
    const node = makeNode('a', 'SoftFail');
    const result = await executeFlow([node], []);
    expect(result.status).toBe('error');
    expect(result.nodeStates.get('a')?.error).toBe('Soft failure from executor');
  });

  it('should handle non-Error throws (string)', async () => {
    executorRegistry.register('StringThrow', async () => {
      throw 'plain string error'; // eslint-disable-line no-throw-literal
    });
    const node = makeNode('a', 'StringThrow');
    const result = await executeFlow([node], []);
    expect(result.nodeStates.get('a')?.error).toBe('plain string error');
  });

  it('should record endTime on error', async () => {
    const node = makeNode('a', 'FailNode');
    const result = await executeFlow([node], []);
    const state = result.nodeStates.get('a');
    expect(state?.endTime).toBeDefined();
    expect(state!.endTime!).toBeGreaterThanOrEqual(state!.startTime!);
  });
});

// ===========================================================================
// 4. Circular dependency
// ===========================================================================

describe('Circular dependency', () => {
  it('should error on a simple cycle (A -> B -> A)', async () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'a')];
    const result = await executeFlow(nodes, edges);
    expect(result.status).toBe('error');
  });

  it('should emit error event with circular dependency message', async () => {
    const { events, onEvent } = collectEvents();
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c'), makeEdge('c', 'a')];
    await executeFlow(nodes, edges, { onEvent });

    const errEvt = events.find(e => e.type === 'error') as Extract<ExecutionEvent, { type: 'error' }>;
    expect(errEvt).toBeDefined();
    expect(errEvt.error).toContain('Circular dependency');
  });
});

// ===========================================================================
// 5. Abort / cancel
// ===========================================================================

describe('Abort and cancellation', () => {
  it('should abort via external AbortSignal when executor respects signal', async () => {
    const controller = new AbortController();
    // Executor that properly listens to the abort signal
    executorRegistry.register('SlowNode', async (ctx) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ outputs: { out: 'done' } }), 5000);
        ctx.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Execution aborted'));
        }, { once: true });
      });
    });

    const node = makeNode('a', 'SlowNode');
    const promise = executeFlow([node], [], { signal: controller.signal });

    setTimeout(() => controller.abort(), 10);
    const result = await promise;

    expect(result.status).toBe('error');
  });

  it('should abort via engine.abort() when executor respects signal', async () => {
    executorRegistry.register('SlowNode', async (ctx) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ outputs: { out: 'done' } }), 5000);
        ctx.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Execution aborted'));
        }, { once: true });
      });
    });

    const engine = new ExecutionEngine();
    const node = makeNode('a', 'SlowNode');
    const promise = engine.execute([node], []);

    setTimeout(() => engine.abort(), 10);
    const result = await promise;

    expect(result.status).toBe('error');
  });

  it('should detect abort at node level when parent signal is aborted', async () => {
    // The parentSignal.aborted check inside executeNode catches abort even
    // when the signal was aborted between node scheduling.
    const controller = new AbortController();

    // First node aborts, second node (in next level) should detect abort
    executorRegistry.register('AborterNode', async () => {
      controller.abort();
      // Small delay so the abort propagates before returning
      await new Promise(r => setTimeout(r, 5));
      return { outputs: { out: 1 } };
    });

    const nodes = [
      makeNode('a', 'AborterNode'),
      makeNode('b', 'TestNode'),
      makeNode('c', 'TestNode'),
    ];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')];
    const result = await executeFlow(nodes, edges, { signal: controller.signal });

    expect(result.status).toBe('error');
    // Node c should not have been executed
    expect(result.nodeStates.has('c')).toBe(false);
    executorRegistry.unregister('AborterNode');
  });

  it('should abort between levels in a multi-level graph', async () => {
    const controller = new AbortController();

    let nodeACompleted = false;
    executorRegistry.register('FastTrack', async () => {
      nodeACompleted = true;
      controller.abort();
      return { outputs: { out: 1 } };
    });

    const nodes = [makeNode('a', 'FastTrack'), makeNode('b', 'TestNode')];
    const edges = [makeEdge('a', 'b')];
    const result = await executeFlow(nodes, edges, { signal: controller.signal });

    expect(nodeACompleted).toBe(true);
    expect(result.status).toBe('error');
  });

});

// ===========================================================================
// 6. Execution timeout
// ===========================================================================

describe('Execution timeout', () => {
  it('should timeout with defaultTimeoutMs', async () => {
    executorRegistry.register('SlowNode', async () => {
      await new Promise(r => setTimeout(r, 5000));
      return { outputs: { out: 'done' } };
    });

    const node = makeNode('a', 'SlowNode');
    const result = await executeFlow([node], [], { defaultTimeoutMs: 50 });

    expect(result.status).toBe('error');
    expect(result.nodeStates.get('a')?.error).toContain('timed out');
  });

  it('should timeout with per-type timeout override', async () => {
    executorRegistry.register('SlowNode', async () => {
      await new Promise(r => setTimeout(r, 5000));
      return { outputs: { out: 'done' } };
    });

    const node = makeNode('a', 'SlowNode');
    const result = await executeFlow([node], [], {
      timeouts: { SlowNode: 50 },
    });

    expect(result.status).toBe('error');
    expect(result.nodeStates.get('a')?.error).toContain('timed out');
  });

  it('should not timeout when execution is fast enough', async () => {
    const node = makeNode('a', 'TestNode', { value: 42 });
    const result = await executeFlow([node], [], { defaultTimeoutMs: 5000 });
    expect(result.status).toBe('success');
  });

  it('should include timeout duration in error message', async () => {
    executorRegistry.register('SlowNode', async () => {
      await new Promise(r => setTimeout(r, 5000));
      return { outputs: { out: 'done' } };
    });

    const node = makeNode('a', 'SlowNode');
    const result = await executeFlow([node], [], { defaultTimeoutMs: 100 });

    expect(result.nodeStates.get('a')?.error).toContain('100ms');
  });
});

// ===========================================================================
// 7. Input validation
// ===========================================================================

describe('Input validation', () => {
  beforeEach(() => {
    nodeTypeRegistry.register({
      type: 'TypedInput',
      title: 'Typed Input',
      category: 'Test',
      inputs: [
        { id: 'num', name: 'number input', dataType: 'number', required: true },
        { id: 'str', name: 'string input', dataType: 'string', required: false },
      ],
      outputs: [{ id: 'out', name: 'out', dataType: 'any' }],
      defaultSize: { width: 160, height: 80 },
    });

    executorRegistry.register('TypedInput', async (ctx) => ({
      outputs: { out: ctx.inputs.num },
    }));
  });

  it('should error on missing required input', async () => {
    const node = makeNode('a', 'TypedInput');
    const result = await executeFlow([node], []);

    expect(result.status).toBe('error');
    expect(result.nodeStates.get('a')?.error).toContain('Missing required input');
  });

  it('should error on type mismatch (expected number, got boolean)', async () => {
    executorRegistry.register('BoolSrc', async () => ({
      outputs: { out: true },
    }));
    const boolSrc = makeNode('src', 'BoolSrc');
    const typedNode = makeNode('a', 'TypedInput');
    const result = await executeFlow(
      [boolSrc, typedNode],
      [makeEdge('src', 'a', 'out', 'num')]
    );

    expect(result.status).toBe('error');
    expect(result.nodeStates.get('a')?.error).toContain('Type mismatch');
  });

  it('should skip validation when skipValidation is true', async () => {
    const node = makeNode('a', 'TypedInput');
    const result = await executeFlow([node], [], { skipValidation: true });

    // No validation error since validation was skipped
    const nodeError = result.nodeStates.get('a')?.error;
    if (nodeError) {
      expect(nodeError).not.toContain('Missing required input');
    }
  });

  it('should coerce string "42" to number 42', async () => {
    executorRegistry.register('StrSrc', async () => ({
      outputs: { out: '42' },
    }));

    const src = makeNode('src', 'StrSrc');
    const dst = makeNode('dst', 'TypedInput');
    const edge = makeEdge('src', 'dst', 'out', 'num');

    const result = await executeFlow([src, dst], [edge]);
    expect(result.status).toBe('success');
    expect(result.nodeStates.get('dst')?.outputs.out).toBe(42);
  });

  it('should fail coercion for non-numeric string', async () => {
    executorRegistry.register('StrSrc', async () => ({
      outputs: { out: 'not-a-number' },
    }));

    const src = makeNode('src', 'StrSrc');
    const dst = makeNode('dst', 'TypedInput');
    const edge = makeEdge('src', 'dst', 'out', 'num');

    const result = await executeFlow([src, dst], [edge]);
    expect(result.status).toBe('error');
    expect(result.nodeStates.get('dst')?.error).toContain('Type mismatch');
  });

  it('should not validate inputs for unregistered node types', async () => {
    // TestNode is not in nodeTypeRegistry, only in executorRegistry
    const node = makeNode('a', 'TestNode');
    const result = await executeFlow([node], []);
    expect(result.status).toBe('success');
  });
});

// ===========================================================================
// 8. Retry logic
// ===========================================================================

describe('Retry logic', () => {
  it('should retry failing executor up to maxAttempts', async () => {
    let attempts = 0;
    executorRegistry.register('RetryNode', async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error(`Attempt ${attempts} failed`);
      }
      return { outputs: { out: 'success' } };
    });

    const node = makeNode('a', 'RetryNode');
    const result = await executeFlow([node], [], {
      defaultRetry: { maxAttempts: 3, baseDelayMs: 10, backoffMultiplier: 1 },
    });

    expect(result.status).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should emit node-retry events between attempts', async () => {
    let attempts = 0;
    executorRegistry.register('RetryNode', async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error(`fail-${attempts}`);
      }
      return { outputs: { out: 'ok' } };
    });

    const { events, onEvent } = collectEvents();
    const node = makeNode('a', 'RetryNode');
    await executeFlow([node], [], {
      onEvent,
      defaultRetry: { maxAttempts: 3, baseDelayMs: 10, backoffMultiplier: 1 },
    });

    const retryEvents = events.filter(e => e.type === 'node-retry');
    expect(retryEvents).toHaveLength(2);
  });

  it('should fail after exhausting all retry attempts', async () => {
    executorRegistry.register('AlwaysFail', async () => {
      throw new Error('permanent failure');
    });

    const node = makeNode('a', 'AlwaysFail');
    const result = await executeFlow([node], [], {
      defaultRetry: { maxAttempts: 3, baseDelayMs: 10, backoffMultiplier: 1 },
    });

    expect(result.status).toBe('error');
    expect(result.nodeStates.get('a')?.error).toBe('permanent failure');
  });

  it('should use per-type retry override', async () => {
    let attempts = 0;
    executorRegistry.register('RetryNode', async () => {
      attempts++;
      if (attempts < 2) throw new Error('fail');
      return { outputs: { out: 'ok' } };
    });

    const node = makeNode('a', 'RetryNode');
    const result = await executeFlow([node], [], {
      retries: { RetryNode: { maxAttempts: 2, baseDelayMs: 10 } },
    });

    expect(result.status).toBe('success');
    expect(attempts).toBe(2);
  });

  it('should apply exponential backoff between retries', async () => {
    let attempts = 0;
    const timestamps: number[] = [];
    executorRegistry.register('RetryNode', async () => {
      timestamps.push(Date.now());
      attempts++;
      if (attempts < 3) throw new Error('fail');
      return { outputs: { out: 'ok' } };
    });

    const node = makeNode('a', 'RetryNode');
    await executeFlow([node], [], {
      defaultRetry: { maxAttempts: 3, baseDelayMs: 50, backoffMultiplier: 2 },
    });

    expect(timestamps).toHaveLength(3);
    const gap1 = timestamps[1] - timestamps[0];
    const gap2 = timestamps[2] - timestamps[1];
    // Allow some tolerance for timing
    expect(gap1).toBeGreaterThanOrEqual(30);  // ~50ms base
    expect(gap2).toBeGreaterThanOrEqual(60);  // ~100ms (50 * 2^1)
  });

  it('should abort retry sleep when aborted', async () => {
    const controller = new AbortController();
    let attempts = 0;
    executorRegistry.register('RetryNode', async () => {
      attempts++;
      throw new Error('always fail');
    });

    const node = makeNode('a', 'RetryNode');
    const promise = executeFlow([node], [], {
      signal: controller.signal,
      defaultRetry: { maxAttempts: 10, baseDelayMs: 5000, backoffMultiplier: 1 },
    });

    // Abort after first failure + short delay
    setTimeout(() => controller.abort(), 50);
    const result = await promise;

    expect(result.status).toBe('error');
    expect(attempts).toBeLessThan(10);
  });
});

// ===========================================================================
// 9. Partial failure (stop-all mode, the default)
// ===========================================================================

describe('Partial failure - stop-all mode', () => {
  it('should stop execution when one node fails in a chain', async () => {
    const nodes = [
      makeNode('a', 'TestNode', { value: 1 }),
      makeNode('b', 'FailNode'),
      makeNode('c', 'TestNode'),
    ];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')];

    const result = await executeFlow(nodes, edges);

    expect(result.status).toBe('error');
    expect(result.nodeStates.get('a')?.status).toBe('success');
    expect(result.nodeStates.get('b')?.status).toBe('error');
    // Node c should not have been executed
    expect(result.nodeStates.has('c')).toBe(false);
  });

  it('should record startTime and endTime on the state', async () => {
    const node = makeNode('a', 'FailNode');
    const result = await executeFlow([node], []);
    expect(result.startTime).toBeDefined();
    expect(result.endTime).toBeDefined();
    expect(result.endTime!).toBeGreaterThanOrEqual(result.startTime!);
  });

  it('should emit start, node events, then error for failed execution', async () => {
    const { events, onEvent } = collectEvents();
    const node = makeNode('a', 'FailNode');
    await executeFlow([node], [], { onEvent });

    const types = events.map(e => e.type);
    expect(types[0]).toBe('start');
    expect(types).toContain('node-start');
    expect(types).toContain('node-error');
    expect(types).toContain('error');
  });
});

// ===========================================================================
// 10. Skip-and-continue mode
// ===========================================================================

describe('Skip-and-continue mode', () => {
  it('should continue executing after a node fails', async () => {
    // A -> B (fail) -> C  but also  A -> D (independent)
    const nodes = [
      makeNode('a', 'TestNode', { value: 1 }),
      makeNode('b', 'FailNode'),
      makeNode('c', 'TestNode'),
      makeNode('d', 'TestNode'),
    ];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c'), makeEdge('a', 'd')];

    const result = await executeFlow(nodes, edges, { errorMode: 'skip-and-continue' });

    expect(result.status).toBe('error');
    expect(result.nodeStates.get('a')?.status).toBe('success');
    expect(result.nodeStates.get('b')?.status).toBe('error');
    expect(result.nodeStates.get('c')?.status).toBe('error');
    expect(result.nodeStates.get('c')?.error).toContain('Skipped due to failed dependency');
    expect(result.nodeStates.get('d')?.status).toBe('success');
  });

  it('should emit node-skipped event for skipped downstream nodes', async () => {
    const { events, onEvent } = collectEvents();
    const nodes = [makeNode('a', 'FailNode'), makeNode('b', 'TestNode')];
    const edges = [makeEdge('a', 'b')];

    await executeFlow(nodes, edges, { onEvent, errorMode: 'skip-and-continue' });

    const skipped = events.filter(e => e.type === 'node-skipped');
    expect(skipped).toHaveLength(1);
    expect((skipped[0] as Extract<ExecutionEvent, { type: 'node-skipped' }>).nodeId).toBe('b');
  });

  it('should set status to success when no nodes fail', async () => {
    const nodes = [makeNode('a', 'TestNode', { value: 1 }), makeNode('b', 'TestNode')];
    const edges = [makeEdge('a', 'b')];

    const result = await executeFlow(nodes, edges, { errorMode: 'skip-and-continue' });
    expect(result.status).toBe('success');
  });

  it('should skip multiple levels of downstream nodes', async () => {
    // A(fail) -> B -> C -> D
    const nodes = [
      makeNode('a', 'FailNode'),
      makeNode('b', 'TestNode'),
      makeNode('c', 'TestNode'),
      makeNode('d', 'TestNode'),
    ];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c'), makeEdge('c', 'd')];

    const result = await executeFlow(nodes, edges, { errorMode: 'skip-and-continue' });

    expect(result.nodeStates.get('a')?.status).toBe('error');
    expect(result.nodeStates.get('b')?.error).toContain('Skipped');
    expect(result.nodeStates.get('c')?.error).toContain('Skipped');
    expect(result.nodeStates.get('d')?.error).toContain('Skipped');
  });
});

// ===========================================================================
// 11. Error-resilient nodes
// ===========================================================================

describe('Error-resilient nodes', () => {
  beforeEach(() => {
    nodeTypeRegistry.register({
      type: 'ErrResilient',
      title: 'Error Resilient',
      category: 'Test',
      inputs: [{ id: 'in', name: 'in', dataType: 'any' }],
      outputs: [{ id: 'out', name: 'out', dataType: 'any' }],
      defaultSize: { width: 160, height: 80 },
      errorResilient: true,
    });
  });

  it('should execute errorResilient node even when dependency fails (skip-and-continue)', async () => {
    const nodes = [makeNode('a', 'FailNode'), makeNode('b', 'ErrResilient')];
    const edges = [makeEdge('a', 'b')];

    const result = await executeFlow(nodes, edges, { errorMode: 'skip-and-continue' });

    expect(result.nodeStates.get('b')?.status).toBe('success');
  });

  it('should inject __upstreamErrors into errorResilient node inputs', async () => {
    let receivedInputs: Record<string, unknown> = {};
    executorRegistry.register('ErrResilient', async (ctx) => {
      receivedInputs = ctx.inputs;
      return { outputs: { out: 'handled' } };
    });

    const nodes = [makeNode('a', 'FailNode'), makeNode('b', 'ErrResilient')];
    const edges = [makeEdge('a', 'b')];

    await executeFlow(nodes, edges, { errorMode: 'skip-and-continue' });

    expect(receivedInputs.__upstreamErrors).toBeDefined();
    expect(Array.isArray(receivedInputs.__upstreamErrors)).toBe(true);
    const errors = receivedInputs.__upstreamErrors as Array<{ nodeId: string; error: string }>;
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].nodeId).toBe('a');
  });

  it('should run errorResilient post-pass in stop-all mode', async () => {
    const nodes = [
      makeNode('a', 'FailNode'),
      makeNode('b', 'ErrResilient'),
    ];
    const edges = [makeEdge('a', 'b')];

    const result = await executeFlow(nodes, edges, { errorMode: 'stop-all' });

    // Even in stop-all, errorResilient nodes should be executed in post-pass
    expect(result.nodeStates.get('b')?.status).toBe('success');
  });

  it('should handle errorResilient node itself failing', async () => {
    executorRegistry.register('ErrResilient', async () => {
      throw new Error('resilient node also failed');
    });

    const nodes = [makeNode('a', 'FailNode'), makeNode('b', 'ErrResilient')];
    const edges = [makeEdge('a', 'b')];

    const result = await executeFlow(nodes, edges, { errorMode: 'skip-and-continue' });

    expect(result.nodeStates.get('b')?.status).toBe('error');
    expect(result.nodeStates.get('b')?.error).toBe('resilient node also failed');
  });
});

// ===========================================================================
// 12. Data propagation & input collection
// ===========================================================================

describe('Data propagation', () => {
  it('should pass outputs from source to target through edges', async () => {
    executorRegistry.register('Source', async () => ({
      outputs: { out: 42 },
    }));
    executorRegistry.register('Sink', async (ctx) => ({
      outputs: { out: ctx.inputs.in },
    }));

    const nodes = [makeNode('a', 'Source'), makeNode('b', 'Sink')];
    const edges = [makeEdge('a', 'b')];

    const result = await executeFlow(nodes, edges, { skipValidation: true });

    expect(result.nodeStates.get('b')?.outputs.out).toBe(42);
  });

  it('should provide empty inputs for nodes with no connected edges', async () => {
    let capturedInputs: Record<string, unknown> = {};
    executorRegistry.register('Inspector', async (ctx) => {
      capturedInputs = ctx.inputs;
      return { outputs: { out: 'ok' } };
    });

    const node = makeNode('a', 'Inspector');
    await executeFlow([node], [], { skipValidation: true });

    expect(Object.keys(capturedInputs)).toHaveLength(0);
  });

  it('should handle multiple inputs from different sources', async () => {
    executorRegistry.register('Src1', async () => ({
      outputs: { out: 'hello' },
    }));
    executorRegistry.register('Src2', async () => ({
      outputs: { val: 99 },
    }));

    let capturedInputs: Record<string, unknown> = {};
    executorRegistry.register('Multi', async (ctx) => {
      capturedInputs = ctx.inputs;
      return { outputs: { out: 'ok' } };
    });

    const nodes = [
      makeNode('s1', 'Src1'),
      makeNode('s2', 'Src2'),
      makeNode('m', 'Multi'),
    ];
    const edges = [
      makeEdge('s1', 'm', 'out', 'a'),
      makeEdge('s2', 'm', 'val', 'b'),
    ];

    await executeFlow(nodes, edges, { skipValidation: true });

    expect(capturedInputs.a).toBe('hello');
    expect(capturedInputs.b).toBe(99);
  });
});

// ===========================================================================
// 13. nodeDataUpdate event
// ===========================================================================

describe('nodeDataUpdate event', () => {
  it('should emit node-data-update when executor returns nodeDataUpdate', async () => {
    executorRegistry.register('Updater', async () => ({
      outputs: { out: 1 },
      nodeDataUpdate: { computed: true },
    }));

    const { events, onEvent } = collectEvents();
    const node = makeNode('a', 'Updater');
    await executeFlow([node], [], { onEvent });

    const updateEvt = events.find(e => e.type === 'node-data-update') as Extract<ExecutionEvent, { type: 'node-data-update' }>;
    expect(updateEvt).toBeDefined();
    expect(updateEvt.data).toEqual({ computed: true });
  });
});

// ===========================================================================
// 14. Depth (recursion prevention for subflows)
// ===========================================================================

describe('Execution depth', () => {
  it('should pass depth through to ExecutionContext', async () => {
    let receivedDepth: number | undefined;
    executorRegistry.register('DepthCheck', async (ctx) => {
      receivedDepth = ctx.depth;
      return { outputs: { out: ctx.depth } };
    });

    const node = makeNode('a', 'DepthCheck');
    await executeFlow([node], [], { depth: 5 });

    expect(receivedDepth).toBe(5);
  });

  it('should pass undefined depth when not specified', async () => {
    let receivedDepth: number | undefined = 999;
    executorRegistry.register('DepthCheck', async (ctx) => {
      receivedDepth = ctx.depth;
      return { outputs: { out: 'ok' } };
    });

    const node = makeNode('a', 'DepthCheck');
    await executeFlow([node], []);

    expect(receivedDepth).toBeUndefined();
  });
});

// ===========================================================================
// 15. Event lifecycle
// ===========================================================================

describe('Event lifecycle', () => {
  it('should emit events in correct order for successful single-node execution', async () => {
    const { events, onEvent } = collectEvents();
    const node = makeNode('a', 'TestNode', { value: 1 });
    await executeFlow([node], [], { onEvent });

    const types = events.map(e => e.type);
    expect(types).toEqual(['start', 'node-start', 'node-complete', 'complete']);
  });

  it('should emit events in correct order for successful multi-node chain', async () => {
    const { events, onEvent } = collectEvents();
    const nodes = [makeNode('a', 'TestNode', { value: 1 }), makeNode('b', 'TestNode')];
    const edges = [makeEdge('a', 'b')];
    await executeFlow(nodes, edges, { onEvent, skipValidation: true });

    const types = events.map(e => e.type);
    expect(types[0]).toBe('start');
    expect(types.indexOf('node-start')).toBeLessThan(types.indexOf('node-complete'));
    expect(types[types.length - 1]).toBe('complete');
  });

  it('should emit error event (not complete) when execution fails', async () => {
    const { events, onEvent } = collectEvents();
    const node = makeNode('a', 'FailNode');
    await executeFlow([node], [], { onEvent });

    const types = events.map(e => e.type);
    expect(types).toContain('error');
    expect(types).not.toContain('complete');
  });
});

// ===========================================================================
// 16. Engine state management
// ===========================================================================

describe('Engine state management', () => {
  it('should return idle state before execution', () => {
    const engine = new ExecutionEngine();
    expect(engine.getState().status).toBe('idle');
  });

  it('should return success state after successful execution', async () => {
    const engine = new ExecutionEngine();
    const node = makeNode('a', 'TestNode', { value: 1 });
    await engine.execute([node], []);
    expect(engine.getState().status).toBe('success');
  });

  it('should return error state after failed execution', async () => {
    const engine = new ExecutionEngine();
    const node = makeNode('a', 'FailNode');
    await engine.execute([node], []);
    expect(engine.getState().status).toBe('error');
  });

  it('getNodeOutputs should return outputs for executed nodes', async () => {
    const engine = new ExecutionEngine();
    executorRegistry.register('Output42', async () => ({
      outputs: { out: 42 },
    }));

    const node = makeNode('a', 'Output42');
    await engine.execute([node], []);

    expect(engine.getNodeOutputs('a')).toEqual({ out: 42 });
    expect(engine.getNodeOutputs('nonexistent')).toBeUndefined();
  });

  it('should reset state on each new execution', async () => {
    const engine = new ExecutionEngine();

    const node1 = makeNode('a', 'TestNode', { value: 1 });
    await engine.execute([node1], []);
    expect(engine.getNodeOutputs('a')).toBeDefined();

    const node2 = makeNode('b', 'TestNode', { value: 2 });
    await engine.execute([node2], []);
    expect(engine.getNodeOutputs('a')).toBeUndefined();
    expect(engine.getNodeOutputs('b')).toBeDefined();
  });
});

// ===========================================================================
// 17. executeFlow convenience function
// ===========================================================================

describe('executeFlow convenience function', () => {
  it('should work the same as ExecutionEngine.execute', async () => {
    const node = makeNode('a', 'TestNode', { value: 99 });
    const result = await executeFlow([node], []);
    expect(result.status).toBe('success');
    expect(result.nodeStates.get('a')?.outputs.out).toBe(99);
  });
});

// ===========================================================================
// 18. Type coercion edge cases
// ===========================================================================

describe('Type coercion', () => {
  beforeEach(() => {
    nodeTypeRegistry.register({
      type: 'TypedInput',
      title: 'Typed Input',
      category: 'Test',
      inputs: [
        { id: 'num', name: 'number input', dataType: 'number', required: true },
      ],
      outputs: [{ id: 'out', name: 'out', dataType: 'any' }],
      defaultSize: { width: 160, height: 80 },
    });
    executorRegistry.register('TypedInput', async (ctx) => ({
      outputs: { out: ctx.inputs.num },
    }));
  });

  it('should coerce numeric string to number for number input', async () => {
    executorRegistry.register('StrSrc', async () => ({
      outputs: { out: '3.14' },
    }));

    const src = makeNode('src', 'StrSrc');
    const dst = makeNode('dst', 'TypedInput');
    const edge = makeEdge('src', 'dst', 'out', 'num');

    const result = await executeFlow([src, dst], [edge]);
    expect(result.status).toBe('success');
    expect(result.nodeStates.get('dst')?.outputs.out).toBe(3.14);
  });

  it('should coerce number to string for string input', async () => {
    nodeTypeRegistry.unregister('TypedInput');
    nodeTypeRegistry.register({
      type: 'TypedInput',
      title: 'Typed Input',
      category: 'Test',
      inputs: [
        { id: 'str', name: 'string input', dataType: 'string', required: true },
      ],
      outputs: [{ id: 'out', name: 'out', dataType: 'any' }],
      defaultSize: { width: 160, height: 80 },
    });
    executorRegistry.register('TypedInput', async (ctx) => ({
      outputs: { out: ctx.inputs.str },
    }));
    executorRegistry.register('NumSrc', async () => ({
      outputs: { out: 42 },
    }));

    const src = makeNode('src', 'NumSrc');
    const dst = makeNode('dst', 'TypedInput');
    const edge = makeEdge('src', 'dst', 'out', 'str');

    const result = await executeFlow([src, dst], [edge]);
    expect(result.status).toBe('success');
    expect(result.nodeStates.get('dst')?.outputs.out).toBe('42');
  });

  it('should coerce "true"/"false" strings to boolean', async () => {
    nodeTypeRegistry.unregister('TypedInput');
    nodeTypeRegistry.register({
      type: 'TypedInput',
      title: 'Typed Input',
      category: 'Test',
      inputs: [
        { id: 'bool', name: 'bool input', dataType: 'boolean', required: true },
      ],
      outputs: [{ id: 'out', name: 'out', dataType: 'any' }],
      defaultSize: { width: 160, height: 80 },
    });
    executorRegistry.register('TypedInput', async (ctx) => ({
      outputs: { out: ctx.inputs.bool },
    }));
    executorRegistry.register('TrueSrc', async () => ({
      outputs: { out: 'true' },
    }));

    const src = makeNode('src', 'TrueSrc');
    const dst = makeNode('dst', 'TypedInput');
    const edge = makeEdge('src', 'dst', 'out', 'bool');

    const result = await executeFlow([src, dst], [edge]);
    expect(result.status).toBe('success');
    expect(result.nodeStates.get('dst')?.outputs.out).toBe(true);
  });
});

// ===========================================================================
// 19. Complex graph topologies
// ===========================================================================

describe('Complex graph topologies', () => {
  it('should handle diamond dependency correctly', async () => {
    executorRegistry.register('Adder', async (ctx) => ({
      outputs: { out: ((ctx.inputs.a as number) ?? 0) + ((ctx.inputs.b as number) ?? 0) },
    }));
    executorRegistry.register('Doubler', async (ctx) => ({
      outputs: { out: ((ctx.inputs.in as number) ?? 0) * 2 },
    }));

    const nodes = [
      makeNode('a', 'TestNode', { value: 5 }),
      makeNode('b', 'Doubler'),   // 5 * 2 = 10
      makeNode('c', 'TestNode'),   // passes through 5
      makeNode('d', 'Adder'),     // 10 + 5 = 15
    ];
    const edges = [
      makeEdge('a', 'b'),
      makeEdge('a', 'c'),
      makeEdge('b', 'd', 'out', 'a'),
      makeEdge('c', 'd', 'out', 'b'),
    ];

    const result = await executeFlow(nodes, edges, { skipValidation: true });
    expect(result.status).toBe('success');
    expect(result.nodeStates.get('d')?.outputs.out).toBe(15);
  });

  it('should execute parallel nodes at the same level concurrently', async () => {
    const executionOrder: string[] = [];
    executorRegistry.register('Tracker', async (ctx) => {
      executionOrder.push(ctx.nodeId);
      await new Promise(r => setTimeout(r, 10));
      return { outputs: { out: ctx.nodeId } };
    });

    // A -> B, A -> C, A -> D (B, C, D are parallel at level 1)
    const nodes = [
      makeNode('a', 'Tracker'),
      makeNode('b', 'Tracker'),
      makeNode('c', 'Tracker'),
      makeNode('d', 'Tracker'),
    ];
    const edges = [makeEdge('a', 'b'), makeEdge('a', 'c'), makeEdge('a', 'd')];

    const result = await executeFlow(nodes, edges, { skipValidation: true });
    expect(result.status).toBe('success');
    expect(executionOrder[0]).toBe('a');
    expect(executionOrder).toHaveLength(4);
  });
});

// ===========================================================================
// 20. Parallel node failure in stop-all mode
// ===========================================================================

describe('Parallel node failure in stop-all mode', () => {
  it('should propagate error when one parallel node fails', async () => {
    // A -> B (success), A -> C (fail) - both at same level
    const nodes = [
      makeNode('a', 'TestNode', { value: 1 }),
      makeNode('b', 'TestNode'),
      makeNode('c', 'FailNode'),
    ];
    const edges = [makeEdge('a', 'b'), makeEdge('a', 'c')];

    const result = await executeFlow(nodes, edges);
    expect(result.status).toBe('error');
  });
});
