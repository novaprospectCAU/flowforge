/**
 * AI 노드 타입 정의
 */

import { nodeTypeRegistry, NODE_SIZES, DEFAULT_COLORS, type NodeTypeDefinition } from '../nodeTypes';

/**
 * AI 노드 타입 정의
 */
export const AI_NODE_TYPES: NodeTypeDefinition[] = [
  {
    type: 'LLMChat',
    title: 'LLM Chat',
    category: 'AI',
    description: 'Chat with GPT, Claude, or other LLMs',
    inputs: [
      { id: 'prompt', name: 'prompt', dataType: 'string', required: true },
      { id: 'systemPrompt', name: 'system', dataType: 'string' },
    ],
    outputs: [
      { id: 'response', name: 'response', dataType: 'string' },
      { id: 'tokens', name: 'tokens', dataType: 'number' },
    ],
    defaultSize: NODE_SIZES.AI_CHAT,
    color: DEFAULT_COLORS.AI_OPENAI,
  },
  {
    type: 'ImageGenerate',
    title: 'Image Generate',
    category: 'AI',
    description: 'Generate images with DALL-E',
    inputs: [
      { id: 'prompt', name: 'prompt', dataType: 'string', required: true },
      { id: 'negative', name: 'negative', dataType: 'string' },
    ],
    outputs: [{ id: 'image', name: 'image', dataType: 'image' }],
    defaultSize: NODE_SIZES.AI_IMAGE,
    color: DEFAULT_COLORS.AI_IMAGE,
  },
  {
    type: 'PromptTemplate',
    title: 'Prompt Template',
    category: 'AI',
    description: 'Template with {{variable}} substitution',
    inputs: [
      { id: 'var1', name: 'var1', dataType: 'string' },
      { id: 'var2', name: 'var2', dataType: 'string' },
      { id: 'var3', name: 'var3', dataType: 'string' },
    ],
    outputs: [{ id: 'prompt', name: 'prompt', dataType: 'string' }],
    defaultSize: NODE_SIZES.AI_TEMPLATE,
    color: DEFAULT_COLORS.AI_TEMPLATE,
  },
];

/**
 * AI 노드 타입 등록
 */
export function registerAINodeTypes(): void {
  for (const nodeType of AI_NODE_TYPES) {
    nodeTypeRegistry.register(nodeType);
  }
}

/**
 * LLM Chat 노드 기본 데이터
 */
export const DEFAULT_LLM_CHAT_DATA = {
  provider: 'openai',
  apiKeyId: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2048,
  stream: true,
  streamingResponse: '',
  isComplete: false,
};

/**
 * Image Generate 노드 기본 데이터
 */
export const DEFAULT_IMAGE_GENERATE_DATA = {
  provider: 'openai',
  apiKeyId: '',
  model: 'dall-e-3',
  size: '1024x1024',
  quality: 'standard',
  generatedImage: '',
};

/**
 * Prompt Template 노드 기본 데이터
 */
export const DEFAULT_PROMPT_TEMPLATE_DATA = {
  template: 'Hello {{var1}}, please {{var2}}.',
};

/**
 * 노드 타입별 기본 데이터 조회
 */
export function getAINodeDefaultData(
  nodeType: string
): Record<string, unknown> | null {
  switch (nodeType) {
    case 'LLMChat':
      return { ...DEFAULT_LLM_CHAT_DATA };
    case 'ImageGenerate':
      return { ...DEFAULT_IMAGE_GENERATE_DATA };
    case 'PromptTemplate':
      return { ...DEFAULT_PROMPT_TEMPLATE_DATA };
    default:
      return null;
  }
}
