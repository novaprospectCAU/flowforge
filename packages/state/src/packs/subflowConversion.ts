/**
 * 서브플로우 → 커스텀 노드 변환
 */

import type { Subflow, FlowNode, FlowEdge } from '@flowforge/types';
import type { NodeTypeDefinition } from '../nodeTypes';
import { NODE_SIZES } from '../nodeTypes';
import type { SubflowNodeDefinition } from './types';

export interface ConvertConfig {
  packId: string;
  title: string;
  category: string;
  description?: string;
  color?: string;
}

export interface ConvertResult {
  nodeType: NodeTypeDefinition;
  subflowDef: SubflowNodeDefinition;
}

/**
 * 서브플로우를 팩 노드로 변환
 */
export function convertSubflowToPackNode(
  subflow: Subflow,
  nodes: FlowNode[],
  edges: FlowEdge[],
  config: ConvertConfig
): ConvertResult {
  // 내부 노드 추출
  const internalNodes = nodes.filter(n => subflow.nodeIds.includes(n.id));
  const internalEdges = edges.filter(e => subflow.internalEdgeIds.includes(e.id));

  // 좌표 정규화 (최소 x,y를 0,0으로)
  const normalizedNodes = normalizePositions(internalNodes);

  // 타입명 생성: {packId}:{TitleWithoutSpaces}
  const typeName = `${config.packId}:${config.title.replace(/\s+/g, '')}`;

  // 순환 참조 감지
  detectCircularReference(normalizedNodes, typeName);

  // 포트 정의 생성
  const inputs = subflow.inputMappings.map(m => ({
    id: m.exposedPortId,
    name: m.exposedPortName,
    dataType: m.dataType,
  }));

  const outputs = subflow.outputMappings.map(m => ({
    id: m.exposedPortId,
    name: m.exposedPortName,
    dataType: m.dataType,
  }));

  // 높이 계산 (포트 수 기반)
  const maxPorts = Math.max(inputs.length, outputs.length, 1);
  const height = Math.max(80, 40 + maxPorts * 24);

  const nodeType: NodeTypeDefinition = {
    type: typeName,
    title: config.title,
    category: config.category || 'Custom',
    description: config.description || `Custom node: ${config.title}`,
    inputs,
    outputs,
    defaultSize: { width: NODE_SIZES.STANDARD_MEDIUM.width, height },
    color: config.color,
  };

  const subflowDef: SubflowNodeDefinition = {
    nodes: normalizedNodes,
    edges: internalEdges,
    inputMappings: subflow.inputMappings,
    outputMappings: subflow.outputMappings,
  };

  return { nodeType, subflowDef };
}

/**
 * 노드 좌표를 상대 좌표로 정규화
 */
function normalizePositions(nodes: FlowNode[]): FlowNode[] {
  if (nodes.length === 0) return [];

  const minX = Math.min(...nodes.map(n => n.position.x));
  const minY = Math.min(...nodes.map(n => n.position.y));

  return nodes.map(n => ({
    ...n,
    position: {
      x: n.position.x - minX,
      y: n.position.y - minY,
    },
    data: { ...n.data },
  }));
}

/**
 * 순환 참조 감지 — 내부 노드 중 자기 자신 타입이 있으면 에러
 */
function detectCircularReference(nodes: FlowNode[], targetType: string): void {
  for (const node of nodes) {
    if (node.type === targetType) {
      throw new Error(
        `Circular reference detected: node "${node.id}" has type "${targetType}" which is the same as the custom node being created.`
      );
    }
  }
}
