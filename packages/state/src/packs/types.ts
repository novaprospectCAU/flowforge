/**
 * Node Pack 시스템 타입 정의
 */

import type { FlowNode, FlowEdge, SubflowPortMapping } from '@flowforge/types';
import type { NodeTypeDefinition } from '../nodeTypes';
import type { NodeExecutor } from '../execution/types';

// === Pack Manifest ===

export interface PackManifest {
  id: string;           // "aieng", "math", "custom-abc123"
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;     // 브라우저 그룹핑용
  icon?: string;
  color?: string;
  kind: 'builtin' | 'custom';
}

// === Pack Node Definition ===

export interface PackNodeDefinition {
  nodeType: NodeTypeDefinition;  // type은 네임스페이스 포함: "math:Sin"
  defaultData?: Record<string, unknown>;
}

// === Node Pack ===

export interface NodePack {
  manifest: PackManifest;
  nodes: PackNodeDefinition[];
}

export interface BuiltinNodePack extends NodePack {
  executors: Map<string, NodeExecutor>;  // JS 함수, 직렬화 불가
}

// === Subflow Node Definition ===

export interface SubflowNodeDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
  inputMappings: SubflowPortMapping[];
  outputMappings: SubflowPortMapping[];
}

export interface CustomNodePack extends NodePack {
  subflowDefinitions: Map<string, SubflowNodeDefinition>;
}

// === Serialization ===

export interface SerializedCustomPack {
  manifest: PackManifest & { kind: 'custom' };
  nodes: Array<{
    nodeType: NodeTypeDefinition;
    defaultData?: Record<string, unknown>;
    subflow: SubflowNodeDefinition;
  }>;
}

// === Pack State ===

export interface PackState {
  packId: string;
  enabled: boolean;
  installedAt: string;
  serializedPack?: SerializedCustomPack;  // custom 팩만
}
