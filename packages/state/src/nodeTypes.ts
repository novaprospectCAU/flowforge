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
    defaultSize: { width: 180, height: 100 },
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
    defaultSize: { width: 180, height: 100 },
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
