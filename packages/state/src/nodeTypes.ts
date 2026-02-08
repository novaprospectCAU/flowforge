import type { PortDefinition } from '@flowforge/types';

/**
 * 노드 크기 프리셋
 * 포트 수와 용도에 따라 적절한 크기 선택
 */
export const NODE_SIZES = {
  // 컴팩트 너비 (160px) - 단순한 노드용
  COMPACT_SMALL: { width: 160, height: 80 },   // 0-1 포트
  COMPACT_MEDIUM: { width: 160, height: 100 }, // 2 포트
  COMPACT_LARGE: { width: 160, height: 140 },  // 3-4 포트

  // 표준 너비 (180px) - 일반 노드용
  STANDARD_SMALL: { width: 180, height: 80 },   // 1 포트
  STANDARD_MEDIUM: { width: 180, height: 100 }, // 2 포트
  STANDARD_TALL: { width: 180, height: 120 },   // 2-3 포트 + 위젯
  STANDARD_LARGE: { width: 180, height: 140 },  // 3-4 포트 + 위젯

  // 와이드 너비 (200px) - 넓은 콘텐츠용
  WIDE_MEDIUM: { width: 200, height: 100 },

  // AI 노드용 (더 큰 위젯 공간 필요)
  AI_TEMPLATE: { width: 240, height: 160 },  // Prompt Template
  AI_CHAT: { width: 280, height: 200 },      // LLM Chat
  AI_IMAGE: { width: 240, height: 280 },     // Image Generate
} as const;

/**
 * 서브플로우 레이아웃 상수
 * 접힌 서브플로우의 크기 계산에 사용
 */
export const SUBFLOW_LAYOUT = {
  COLLAPSED_WIDTH: 180,        // 접힌 상태 기본 너비
  HEADER_HEIGHT: 28,           // 헤더 영역 높이
  PORT_SPACING: 24,            // 포트 간 간격
  PADDING_BOTTOM: 12,          // 하단 패딩
} as const;

/**
 * 기본 색상 상수
 * 그룹, 서브플로우, AI 노드 등의 기본 색상
 */
export const DEFAULT_COLORS = {
  // 그룹/서브플로우 기본 색상
  GROUP: '#4a5568',      // 회색 - 노드 그룹
  SUBFLOW: '#3b82f6',    // 파란색 - 서브플로우

  // AI 노드 브랜드 색상
  AI_OPENAI: '#10a37f',  // OpenAI 녹색 - LLM Chat
  AI_IMAGE: '#ff6b35',   // 주황색 - Image Generate
  AI_TEMPLATE: '#8b5cf6', // 보라색 - Prompt Template
} as const;

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
  errorResilient?: boolean; // true면 업스트림 실패 시에도 실행
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
    defaultSize: NODE_SIZES.COMPACT_SMALL,
  },
  {
    type: 'TextInput',
    title: 'Text',
    category: 'Input',
    description: 'Outputs a text value',
    inputs: [],
    outputs: [{ id: 'out', name: 'text', dataType: 'string' }],
    defaultSize: NODE_SIZES.COMPACT_SMALL,
  },
  {
    type: 'ImageInput',
    title: 'Load Image',
    category: 'Input',
    description: 'Load an image file',
    inputs: [],
    outputs: [{ id: 'out', name: 'image', dataType: 'image' }],
    defaultSize: NODE_SIZES.STANDARD_LARGE,
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
    defaultSize: NODE_SIZES.COMPACT_MEDIUM,
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
    defaultSize: NODE_SIZES.STANDARD_TALL,
  },
  {
    type: 'Filter',
    title: 'Filter',
    category: 'Process',
    description: 'Apply filter to image',
    inputs: [{ id: 'image', name: 'image', dataType: 'image', required: true }],
    outputs: [{ id: 'out', name: 'image', dataType: 'image' }],
    defaultSize: NODE_SIZES.STANDARD_MEDIUM,
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
    defaultSize: NODE_SIZES.COMPACT_MEDIUM,
  },

  // Output 카테고리
  {
    type: 'Display',
    title: 'Display',
    category: 'Output',
    description: 'Display result',
    inputs: [{ id: 'in', name: 'input', dataType: 'any', required: true }],
    outputs: [],
    defaultSize: NODE_SIZES.STANDARD_LARGE,
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
    defaultSize: NODE_SIZES.STANDARD_TALL,
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
    defaultSize: NODE_SIZES.STANDARD_LARGE,
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
    defaultSize: NODE_SIZES.COMPACT_MEDIUM,
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
    defaultSize: NODE_SIZES.COMPACT_MEDIUM,
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
    defaultSize: NODE_SIZES.COMPACT_LARGE,
  },

  {
    type: 'ForEach',
    title: 'For Each',
    category: 'Logic',
    description: 'Apply template to each array element',
    inputs: [
      { id: 'array', name: 'array', dataType: 'array', required: true },
      { id: 'template', name: 'template', dataType: 'string' },
    ],
    outputs: [
      { id: 'results', name: 'results', dataType: 'array' },
      { id: 'count', name: 'count', dataType: 'number' },
    ],
    defaultSize: NODE_SIZES.STANDARD_TALL,
  },
  {
    type: 'Range',
    title: 'Range',
    category: 'Logic',
    description: 'Generate array [0, 1, ..., count-1]',
    inputs: [
      { id: 'count', name: 'count', dataType: 'number', required: true },
    ],
    outputs: [
      { id: 'array', name: 'array', dataType: 'array' },
    ],
    defaultSize: NODE_SIZES.COMPACT_MEDIUM,
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
    defaultSize: NODE_SIZES.STANDARD_LARGE,
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
    defaultSize: NODE_SIZES.STANDARD_MEDIUM,
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
    defaultSize: NODE_SIZES.STANDARD_TALL,
  },
  {
    type: 'TextLength',
    title: 'Text Length',
    category: 'Text',
    description: 'Get character count of text',
    inputs: [{ id: 'text', name: 'text', dataType: 'string', required: true }],
    outputs: [{ id: 'out', name: 'length', dataType: 'number' }],
    defaultSize: NODE_SIZES.COMPACT_SMALL,
  },
  {
    type: 'TextCase',
    title: 'Change Case',
    category: 'Text',
    description: 'Convert to upper/lower/title case',
    inputs: [{ id: 'text', name: 'text', dataType: 'string', required: true }],
    outputs: [{ id: 'out', name: 'result', dataType: 'string' }],
    defaultSize: NODE_SIZES.STANDARD_MEDIUM,
  },

  // Data 카테고리
  {
    type: 'HTTPRequest',
    title: 'HTTP Request',
    category: 'Data',
    description: 'Make HTTP request to URL',
    inputs: [
      { id: 'url', name: 'url', dataType: 'string', required: true },
      { id: 'body', name: 'body', dataType: 'any' },
      { id: 'headers', name: 'headers', dataType: 'object' },
    ],
    outputs: [
      { id: 'response', name: 'response', dataType: 'any' },
      { id: 'status', name: 'status', dataType: 'number' },
      { id: 'headers', name: 'headers', dataType: 'object' },
    ],
    defaultSize: NODE_SIZES.STANDARD_LARGE,
  },
  {
    type: 'JSONParse',
    title: 'Parse JSON',
    category: 'Data',
    description: 'Parse JSON string to object',
    inputs: [{ id: 'json', name: 'json', dataType: 'string', required: true }],
    outputs: [{ id: 'out', name: 'object', dataType: 'object' }],
    defaultSize: NODE_SIZES.STANDARD_SMALL,
  },
  {
    type: 'JSONStringify',
    title: 'To JSON',
    category: 'Data',
    description: 'Convert object to JSON string',
    inputs: [{ id: 'object', name: 'object', dataType: 'any', required: true }],
    outputs: [{ id: 'out', name: 'json', dataType: 'string' }],
    defaultSize: NODE_SIZES.STANDARD_SMALL,
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
    defaultSize: NODE_SIZES.STANDARD_MEDIUM,
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
    defaultSize: NODE_SIZES.COMPACT_MEDIUM,
  },
  {
    type: 'ArrayLength',
    title: 'Array Length',
    category: 'Data',
    description: 'Get length of array',
    inputs: [{ id: 'array', name: 'array', dataType: 'array', required: true }],
    outputs: [{ id: 'out', name: 'length', dataType: 'number' }],
    defaultSize: NODE_SIZES.COMPACT_SMALL,
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
    defaultSize: NODE_SIZES.COMPACT_LARGE,
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
    defaultSize: NODE_SIZES.COMPACT_MEDIUM,
  },
  {
    type: 'Debug',
    title: 'Debug',
    category: 'Utility',
    description: 'Inspect values and capture upstream errors',
    inputs: [{ id: 'input', name: 'input', dataType: 'any' }],
    outputs: [{ id: 'out', name: 'pass', dataType: 'any' }],
    defaultSize: NODE_SIZES.STANDARD_LARGE,
    errorResilient: true,
  },
  {
    type: 'Comment',
    title: 'Note',
    category: 'Utility',
    description: 'Documentation note (no execution)',
    inputs: [],
    outputs: [],
    defaultSize: NODE_SIZES.WIDE_MEDIUM,
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
    defaultSize: NODE_SIZES.COMPACT_MEDIUM,
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
    defaultSize: NODE_SIZES.STANDARD_MEDIUM,
  },

  // Convert 카테고리
  {
    type: 'ToString',
    title: 'To String',
    category: 'Convert',
    description: 'Convert value to string',
    inputs: [{ id: 'value', name: 'value', dataType: 'any', required: true }],
    outputs: [{ id: 'out', name: 'string', dataType: 'string' }],
    defaultSize: NODE_SIZES.COMPACT_SMALL,
  },
  {
    type: 'ToNumber',
    title: 'To Number',
    category: 'Convert',
    description: 'Convert value to number',
    inputs: [{ id: 'value', name: 'value', dataType: 'any', required: true }],
    outputs: [{ id: 'out', name: 'number', dataType: 'number' }],
    defaultSize: NODE_SIZES.COMPACT_SMALL,
  },
  {
    type: 'ToBoolean',
    title: 'To Boolean',
    category: 'Convert',
    description: 'Convert value to boolean',
    inputs: [{ id: 'value', name: 'value', dataType: 'any', required: true }],
    outputs: [{ id: 'out', name: 'boolean', dataType: 'boolean' }],
    defaultSize: NODE_SIZES.COMPACT_SMALL,
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
