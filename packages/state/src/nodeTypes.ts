import type { PortDefinition } from '@flowforge/types';

/**
 * 노드 타입 정의
 */
export interface NodeTypeDefinition {
  type: string;
  title: string;
  category: string;
  description?: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  defaultSize: { width: number; height: number };
  color?: string;
}

/**
 * 기본 노드 타입들
 */
const BUILTIN_NODE_TYPES: NodeTypeDefinition[] = [
  // Input 카테고리
  {
    type: 'NumberInput',
    title: 'Number',
    category: 'Input',
    description: 'Outputs a number value',
    inputs: [],
    outputs: [{ id: 'out', name: 'value', dataType: 'number' }],
    defaultSize: { width: 160, height: 80 },
  },
  {
    type: 'TextInput',
    title: 'Text',
    category: 'Input',
    description: 'Outputs a text value',
    inputs: [],
    outputs: [{ id: 'out', name: 'text', dataType: 'string' }],
    defaultSize: { width: 160, height: 80 },
  },
  {
    type: 'ImageInput',
    title: 'Load Image',
    category: 'Input',
    description: 'Load an image file',
    inputs: [],
    outputs: [{ id: 'out', name: 'image', dataType: 'image' }],
    defaultSize: { width: 180, height: 140 },
  },

  // Process 카테고리
  {
    type: 'Math',
    title: 'Math',
    category: 'Process',
    description: 'Perform math operations',
    inputs: [
      { id: 'a', name: 'A', dataType: 'number', required: true },
      { id: 'b', name: 'B', dataType: 'number', required: true },
    ],
    outputs: [{ id: 'out', name: 'result', dataType: 'number' }],
    defaultSize: { width: 160, height: 100 },
  },
  {
    type: 'Resize',
    title: 'Resize',
    category: 'Process',
    description: 'Resize an image',
    inputs: [
      { id: 'image', name: 'image', dataType: 'image', required: true },
      { id: 'scale', name: 'scale', dataType: 'number' },
    ],
    outputs: [{ id: 'out', name: 'image', dataType: 'image' }],
    defaultSize: { width: 180, height: 120 },
  },
  {
    type: 'Filter',
    title: 'Filter',
    category: 'Process',
    description: 'Apply filter to image',
    inputs: [{ id: 'image', name: 'image', dataType: 'image', required: true }],
    outputs: [{ id: 'out', name: 'image', dataType: 'image' }],
    defaultSize: { width: 180, height: 100 },
  },
  {
    type: 'Merge',
    title: 'Merge',
    category: 'Process',
    description: 'Merge multiple inputs',
    inputs: [
      { id: 'a', name: 'A', dataType: 'any', required: true },
      { id: 'b', name: 'B', dataType: 'any' },
    ],
    outputs: [{ id: 'out', name: 'output', dataType: 'any' }],
    defaultSize: { width: 160, height: 100 },
  },

  // Output 카테고리
  {
    type: 'Display',
    title: 'Display',
    category: 'Output',
    description: 'Display result',
    inputs: [{ id: 'in', name: 'input', dataType: 'any', required: true }],
    outputs: [],
    defaultSize: { width: 180, height: 140 },
  },
  {
    type: 'SaveImage',
    title: 'Save Image',
    category: 'Output',
    description: 'Save image to file',
    inputs: [
      { id: 'image', name: 'image', dataType: 'image', required: true },
      { id: 'path', name: 'path', dataType: 'string' },
    ],
    outputs: [],
    defaultSize: { width: 180, height: 120 },
  },

  // Logic 카테고리
  {
    type: 'Condition',
    title: 'Condition',
    category: 'Logic',
    description: 'Branch based on condition',
    inputs: [
      { id: 'condition', name: 'condition', dataType: 'boolean', required: true },
      { id: 'true', name: 'if true', dataType: 'any' },
      { id: 'false', name: 'if false', dataType: 'any' },
    ],
    outputs: [{ id: 'out', name: 'output', dataType: 'any' }],
    defaultSize: { width: 180, height: 140 },
  },
  {
    type: 'Compare',
    title: 'Compare',
    category: 'Logic',
    description: 'Compare two values (==, !=, <, >, <=, >=)',
    inputs: [
      { id: 'a', name: 'A', dataType: 'any', required: true },
      { id: 'b', name: 'B', dataType: 'any', required: true },
    ],
    outputs: [{ id: 'result', name: 'result', dataType: 'boolean' }],
    defaultSize: { width: 160, height: 100 },
  },
  {
    type: 'Gate',
    title: 'Gate',
    category: 'Logic',
    description: 'Pass through value when enabled',
    inputs: [
      { id: 'input', name: 'input', dataType: 'any', required: true },
      { id: 'enable', name: 'enable', dataType: 'boolean', required: true },
    ],
    outputs: [{ id: 'out', name: 'output', dataType: 'any' }],
    defaultSize: { width: 160, height: 100 },
  },
  {
    type: 'Switch',
    title: 'Switch',
    category: 'Logic',
    description: 'Route input to one of multiple outputs',
    inputs: [
      { id: 'input', name: 'input', dataType: 'any', required: true },
      { id: 'index', name: 'index', dataType: 'number', required: true },
    ],
    outputs: [
      { id: 'out0', name: 'out 0', dataType: 'any' },
      { id: 'out1', name: 'out 1', dataType: 'any' },
      { id: 'out2', name: 'out 2', dataType: 'any' },
    ],
    defaultSize: { width: 160, height: 140 },
  },

  // Text 카테고리
  {
    type: 'TextJoin',
    title: 'Join Text',
    category: 'Text',
    description: 'Join multiple texts with separator',
    inputs: [
      { id: 'text1', name: 'text 1', dataType: 'string', required: true },
      { id: 'text2', name: 'text 2', dataType: 'string' },
      { id: 'text3', name: 'text 3', dataType: 'string' },
      { id: 'separator', name: 'separator', dataType: 'string' },
    ],
    outputs: [{ id: 'out', name: 'result', dataType: 'string' }],
    defaultSize: { width: 180, height: 140 },
  },
  {
    type: 'TextSplit',
    title: 'Split Text',
    category: 'Text',
    description: 'Split text by delimiter',
    inputs: [
      { id: 'text', name: 'text', dataType: 'string', required: true },
      { id: 'delimiter', name: 'delimiter', dataType: 'string' },
    ],
    outputs: [{ id: 'out', name: 'array', dataType: 'array' }],
    defaultSize: { width: 180, height: 100 },
  },
  {
    type: 'TextReplace',
    title: 'Replace',
    category: 'Text',
    description: 'Find and replace in text',
    inputs: [
      { id: 'text', name: 'text', dataType: 'string', required: true },
      { id: 'find', name: 'find', dataType: 'string', required: true },
      { id: 'replace', name: 'replace', dataType: 'string' },
    ],
    outputs: [{ id: 'out', name: 'result', dataType: 'string' }],
    defaultSize: { width: 180, height: 120 },
  },
  {
    type: 'TextLength',
    title: 'Text Length',
    category: 'Text',
    description: 'Get character count of text',
    inputs: [{ id: 'text', name: 'text', dataType: 'string', required: true }],
    outputs: [{ id: 'out', name: 'length', dataType: 'number' }],
    defaultSize: { width: 160, height: 80 },
  },
  {
    type: 'TextCase',
    title: 'Change Case',
    category: 'Text',
    description: 'Convert to upper/lower/title case',
    inputs: [{ id: 'text', name: 'text', dataType: 'string', required: true }],
    outputs: [{ id: 'out', name: 'result', dataType: 'string' }],
    defaultSize: { width: 180, height: 100 },
  },

  // Data 카테고리
  {
    type: 'JSONParse',
    title: 'Parse JSON',
    category: 'Data',
    description: 'Parse JSON string to object',
    inputs: [{ id: 'json', name: 'json', dataType: 'string', required: true }],
    outputs: [{ id: 'out', name: 'object', dataType: 'object' }],
    defaultSize: { width: 180, height: 80 },
  },
  {
    type: 'JSONStringify',
    title: 'To JSON',
    category: 'Data',
    description: 'Convert object to JSON string',
    inputs: [{ id: 'object', name: 'object', dataType: 'any', required: true }],
    outputs: [{ id: 'out', name: 'json', dataType: 'string' }],
    defaultSize: { width: 180, height: 80 },
  },
  {
    type: 'GetProperty',
    title: 'Get Property',
    category: 'Data',
    description: 'Get property from object by key',
    inputs: [
      { id: 'object', name: 'object', dataType: 'object', required: true },
      { id: 'key', name: 'key', dataType: 'string', required: true },
    ],
    outputs: [{ id: 'out', name: 'value', dataType: 'any' }],
    defaultSize: { width: 180, height: 100 },
  },
  {
    type: 'ArrayGet',
    title: 'Get Item',
    category: 'Data',
    description: 'Get item from array by index',
    inputs: [
      { id: 'array', name: 'array', dataType: 'array', required: true },
      { id: 'index', name: 'index', dataType: 'number', required: true },
    ],
    outputs: [{ id: 'out', name: 'item', dataType: 'any' }],
    defaultSize: { width: 160, height: 100 },
  },
  {
    type: 'ArrayLength',
    title: 'Array Length',
    category: 'Data',
    description: 'Get length of array',
    inputs: [{ id: 'array', name: 'array', dataType: 'array', required: true }],
    outputs: [{ id: 'out', name: 'length', dataType: 'number' }],
    defaultSize: { width: 160, height: 80 },
  },
  {
    type: 'CreateArray',
    title: 'Create Array',
    category: 'Data',
    description: 'Create array from inputs',
    inputs: [
      { id: 'item0', name: 'item 0', dataType: 'any' },
      { id: 'item1', name: 'item 1', dataType: 'any' },
      { id: 'item2', name: 'item 2', dataType: 'any' },
      { id: 'item3', name: 'item 3', dataType: 'any' },
    ],
    outputs: [{ id: 'out', name: 'array', dataType: 'array' }],
    defaultSize: { width: 160, height: 140 },
  },

  // Utility 카테고리
  {
    type: 'Delay',
    title: 'Delay',
    category: 'Utility',
    description: 'Wait for specified milliseconds',
    inputs: [
      { id: 'input', name: 'input', dataType: 'any', required: true },
      { id: 'ms', name: 'ms', dataType: 'number' },
    ],
    outputs: [{ id: 'out', name: 'output', dataType: 'any' }],
    defaultSize: { width: 160, height: 100 },
  },
  {
    type: 'Debug',
    title: 'Debug',
    category: 'Utility',
    description: 'Log value to console',
    inputs: [{ id: 'input', name: 'input', dataType: 'any', required: true }],
    outputs: [{ id: 'out', name: 'pass', dataType: 'any' }],
    defaultSize: { width: 160, height: 80 },
  },
  {
    type: 'Comment',
    title: 'Note',
    category: 'Utility',
    description: 'Documentation note (no execution)',
    inputs: [],
    outputs: [],
    defaultSize: { width: 200, height: 100 },
  },
  {
    type: 'Random',
    title: 'Random',
    category: 'Utility',
    description: 'Generate random number',
    inputs: [
      { id: 'min', name: 'min', dataType: 'number' },
      { id: 'max', name: 'max', dataType: 'number' },
    ],
    outputs: [{ id: 'out', name: 'value', dataType: 'number' }],
    defaultSize: { width: 160, height: 100 },
  },
  {
    type: 'Timestamp',
    title: 'Timestamp',
    category: 'Utility',
    description: 'Get current timestamp',
    inputs: [],
    outputs: [
      { id: 'ms', name: 'milliseconds', dataType: 'number' },
      { id: 'iso', name: 'ISO string', dataType: 'string' },
    ],
    defaultSize: { width: 180, height: 100 },
  },

  // Convert 카테고리
  {
    type: 'ToString',
    title: 'To String',
    category: 'Convert',
    description: 'Convert value to string',
    inputs: [{ id: 'value', name: 'value', dataType: 'any', required: true }],
    outputs: [{ id: 'out', name: 'string', dataType: 'string' }],
    defaultSize: { width: 160, height: 80 },
  },
  {
    type: 'ToNumber',
    title: 'To Number',
    category: 'Convert',
    description: 'Convert value to number',
    inputs: [{ id: 'value', name: 'value', dataType: 'any', required: true }],
    outputs: [{ id: 'out', name: 'number', dataType: 'number' }],
    defaultSize: { width: 160, height: 80 },
  },
  {
    type: 'ToBoolean',
    title: 'To Boolean',
    category: 'Convert',
    description: 'Convert value to boolean',
    inputs: [{ id: 'value', name: 'value', dataType: 'any', required: true }],
    outputs: [{ id: 'out', name: 'boolean', dataType: 'boolean' }],
    defaultSize: { width: 160, height: 80 },
  },
];

/**
 * 노드 타입 레지스트리
 */
class NodeTypeRegistry {
  private types: Map<string, NodeTypeDefinition> = new Map();

  constructor() {
    // 기본 노드 타입 등록
    for (const type of BUILTIN_NODE_TYPES) {
      this.register(type);
    }
  }

  register(definition: NodeTypeDefinition): void {
    this.types.set(definition.type, definition);
  }

  get(type: string): NodeTypeDefinition | undefined {
    return this.types.get(type);
  }

  getAll(): NodeTypeDefinition[] {
    return Array.from(this.types.values());
  }

  getByCategory(category: string): NodeTypeDefinition[] {
    return this.getAll().filter(t => t.category === category);
  }

  getCategories(): string[] {
    const categories = new Set(this.getAll().map(t => t.category));
    return Array.from(categories);
  }
}

// 싱글톤 인스턴스
export const nodeTypeRegistry = new NodeTypeRegistry();
