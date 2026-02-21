/**
 * Node Type Registry tests
 */

import { describe, it, expect } from 'vitest';
import { nodeTypeRegistry } from './nodeTypes';

describe('nodeTypeRegistry', () => {
  it('should have builtin node types registered', () => {
    const all = nodeTypeRegistry.getAll();
    expect(all.length).toBeGreaterThan(20);
  });

  it('should retrieve a specific node type', () => {
    const numberInput = nodeTypeRegistry.get('NumberInput');
    expect(numberInput).toBeDefined();
    expect(numberInput!.title).toBe('Number');
    expect(numberInput!.category).toBe('Input');
  });

  it('should return undefined for unknown type', () => {
    expect(nodeTypeRegistry.get('NonExistentNode')).toBeUndefined();
  });

  it('should list all categories', () => {
    const categories = nodeTypeRegistry.getCategories();
    expect(categories).toContain('Input');
    expect(categories).toContain('Process');
    expect(categories).toContain('Output');
    expect(categories).toContain('Logic');
    expect(categories).toContain('Text');
    expect(categories).toContain('Data');
    expect(categories).toContain('Utility');
    expect(categories).toContain('Convert');
  });

  it('should filter by category', () => {
    const inputNodes = nodeTypeRegistry.getByCategory('Input');
    expect(inputNodes.length).toBeGreaterThan(0);
    for (const node of inputNodes) {
      expect(node.category).toBe('Input');
    }
  });

  it('should register and unregister custom types', () => {
    const customType = {
      type: 'test:CustomNode',
      title: 'Custom',
      category: 'Test',
      inputs: [],
      outputs: [{ id: 'out', name: 'out', dataType: 'any' as const }],
      defaultSize: { width: 160, height: 80 },
    };

    nodeTypeRegistry.register(customType);
    expect(nodeTypeRegistry.get('test:CustomNode')).toBeDefined();
    expect(nodeTypeRegistry.get('test:CustomNode')!.title).toBe('Custom');

    const removed = nodeTypeRegistry.unregister('test:CustomNode');
    expect(removed).toBe(true);
    expect(nodeTypeRegistry.get('test:CustomNode')).toBeUndefined();
  });

  it('should filter by namespace', () => {
    // Register some namespaced nodes for testing
    nodeTypeRegistry.register({
      type: 'ns:NodeA',
      title: 'A',
      category: 'Test',
      inputs: [],
      outputs: [],
      defaultSize: { width: 160, height: 80 },
    });
    nodeTypeRegistry.register({
      type: 'ns:NodeB',
      title: 'B',
      category: 'Test',
      inputs: [],
      outputs: [],
      defaultSize: { width: 160, height: 80 },
    });

    const nsNodes = nodeTypeRegistry.getByNamespace('ns');
    expect(nsNodes).toHaveLength(2);

    // Cleanup
    nodeTypeRegistry.unregister('ns:NodeA');
    nodeTypeRegistry.unregister('ns:NodeB');
  });

  it('should have valid port definitions for all builtin types', () => {
    const all = nodeTypeRegistry.getAll();
    for (const def of all) {
      // Every node should have a type and title
      expect(def.type).toBeTruthy();
      expect(def.title).toBeTruthy();
      expect(def.category).toBeTruthy();

      // Port IDs should be unique within inputs/outputs
      const inputIds = def.inputs.map(p => p.id);
      expect(new Set(inputIds).size).toBe(inputIds.length);

      const outputIds = def.outputs.map(p => p.id);
      expect(new Set(outputIds).size).toBe(outputIds.length);

      // Default size should be positive
      expect(def.defaultSize.width).toBeGreaterThan(0);
      expect(def.defaultSize.height).toBeGreaterThan(0);
    }
  });

  it('should have matching executors for all builtin types', async () => {
    // Import executor registry to check alignment
    const { executorRegistry } = await import('./execution/executorRegistry');
    await import('./execution/executors');

    const all = nodeTypeRegistry.getAll();
    const typesWithoutExecutor: string[] = [];

    for (const def of all) {
      // Skip namespaced pack types
      if (def.type.includes(':')) continue;
      if (!executorRegistry.has(def.type)) {
        typesWithoutExecutor.push(def.type);
      }
    }

    // All builtin types should have executors
    expect(typesWithoutExecutor).toEqual([]);
  });
});
