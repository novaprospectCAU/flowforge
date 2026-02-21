/**
 * Topological Sort tests
 */

import { describe, it, expect } from 'vitest';
import { topologicalSort, topologicalLevels, getDependencies, getDependents } from './topologicalSort';
import type { FlowNode, FlowEdge } from '@flowforge/types';

function makeNode(id: string): FlowNode {
  return {
    id,
    type: 'NumberInput',
    position: { x: 0, y: 0 },
    size: { width: 160, height: 80 },
    data: {},
    inputs: [{ id: 'in', name: 'in', dataType: 'any' }],
    outputs: [{ id: 'out', name: 'out', dataType: 'any' }],
  };
}

function makeEdge(source: string, target: string): FlowEdge {
  return {
    id: `${source}-${target}`,
    source,
    sourcePort: 'out',
    target,
    targetPort: 'in',
  };
}

describe('topologicalSort', () => {
  it('should sort a linear chain', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')];

    const result = topologicalSort(nodes, edges);

    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('should handle nodes with no edges', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const edges: FlowEdge[] = [];

    const result = topologicalSort(nodes, edges);

    expect(result).toHaveLength(3);
    expect(new Set(result)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('should handle a single node', () => {
    const nodes = [makeNode('a')];
    const edges: FlowEdge[] = [];

    const result = topologicalSort(nodes, edges);

    expect(result).toEqual(['a']);
  });

  it('should handle empty graph', () => {
    const result = topologicalSort([], []);
    expect(result).toEqual([]);
  });

  it('should handle diamond dependency (A -> B, A -> C, B -> D, C -> D)', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')];
    const edges = [
      makeEdge('a', 'b'),
      makeEdge('a', 'c'),
      makeEdge('b', 'd'),
      makeEdge('c', 'd'),
    ];

    const result = topologicalSort(nodes, edges);

    // a must come before b, c; b and c must come before d
    expect(result.indexOf('a')).toBeLessThan(result.indexOf('b'));
    expect(result.indexOf('a')).toBeLessThan(result.indexOf('c'));
    expect(result.indexOf('b')).toBeLessThan(result.indexOf('d'));
    expect(result.indexOf('c')).toBeLessThan(result.indexOf('d'));
  });

  it('should throw on circular dependency', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const edges = [
      makeEdge('a', 'b'),
      makeEdge('b', 'c'),
      makeEdge('c', 'a'),
    ];

    expect(() => topologicalSort(nodes, edges)).toThrow('Circular dependency');
  });

  it('should handle duplicate edges', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const edges = [makeEdge('a', 'b'), makeEdge('a', 'b')];

    const result = topologicalSort(nodes, edges);

    expect(result).toEqual(['a', 'b']);
  });

  it('should handle fan-out (one node -> multiple targets)', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')];
    const edges = [
      makeEdge('a', 'b'),
      makeEdge('a', 'c'),
      makeEdge('a', 'd'),
    ];

    const result = topologicalSort(nodes, edges);

    expect(result[0]).toBe('a');
    expect(result).toHaveLength(4);
  });

  it('should handle fan-in (multiple sources -> one target)', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')];
    const edges = [
      makeEdge('a', 'd'),
      makeEdge('b', 'd'),
      makeEdge('c', 'd'),
    ];

    const result = topologicalSort(nodes, edges);

    expect(result[result.length - 1]).toBe('d');
    expect(result).toHaveLength(4);
  });
});

describe('topologicalLevels', () => {
  it('should group independent nodes into the same level', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const edges: FlowEdge[] = [];

    const levels = topologicalLevels(nodes, edges);

    expect(levels).toHaveLength(1);
    expect(levels[0]).toHaveLength(3);
  });

  it('should create levels for a linear chain', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')];

    const levels = topologicalLevels(nodes, edges);

    expect(levels).toEqual([['a'], ['b'], ['c']]);
  });

  it('should group parallel nodes together', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')];
    const edges = [
      makeEdge('a', 'b'),
      makeEdge('a', 'c'),
      makeEdge('b', 'd'),
      makeEdge('c', 'd'),
    ];

    const levels = topologicalLevels(nodes, edges);

    expect(levels).toHaveLength(3);
    expect(levels[0]).toEqual(['a']);
    expect(new Set(levels[1])).toEqual(new Set(['b', 'c']));
    expect(levels[2]).toEqual(['d']);
  });

  it('should throw on circular dependency', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'a')];

    expect(() => topologicalLevels(nodes, edges)).toThrow('Circular dependency');
  });

  it('should handle empty graph', () => {
    const levels = topologicalLevels([], []);
    expect(levels).toEqual([]);
  });
});

describe('getDependencies', () => {
  it('should return source nodes for a given target', () => {
    const edges = [
      makeEdge('a', 'c'),
      makeEdge('b', 'c'),
      makeEdge('c', 'd'),
    ];

    const deps = getDependencies('c', edges);

    expect(new Set(deps)).toEqual(new Set(['a', 'b']));
  });

  it('should return empty array for root nodes', () => {
    const edges = [makeEdge('a', 'b')];

    const deps = getDependencies('a', edges);

    expect(deps).toEqual([]);
  });
});

describe('getDependents', () => {
  it('should return target nodes for a given source', () => {
    const edges = [
      makeEdge('a', 'b'),
      makeEdge('a', 'c'),
      makeEdge('b', 'd'),
    ];

    const deps = getDependents('a', edges);

    expect(new Set(deps)).toEqual(new Set(['b', 'c']));
  });

  it('should return empty array for leaf nodes', () => {
    const edges = [makeEdge('a', 'b')];

    const deps = getDependents('b', edges);

    expect(deps).toEqual([]);
  });
});
