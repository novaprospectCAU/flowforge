import type { FlowNode, FlowEdge } from '@flowforge/types';

/**
 * 노드 검증 결과
 */
export interface NodeValidationResult {
  hasWarning: boolean;
  unconnectedRequiredPorts: string[];
}

/**
 * 노드의 필수 입력 포트가 연결되어 있는지 검증
 */
export function validateNode(
  node: FlowNode,
  edges: FlowEdge[]
): NodeValidationResult {
  const unconnectedRequiredPorts: string[] = [];

  // 입력 포트 중 필수 포트 확인
  const inputs = node.inputs || [];
  for (const port of inputs) {
    if (port.required) {
      // 이 포트에 연결된 엣지가 있는지 확인
      const isConnected = edges.some(
        edge => edge.target === node.id && edge.targetPort === port.id
      );
      if (!isConnected) {
        unconnectedRequiredPorts.push(port.id);
      }
    }
  }

  return {
    hasWarning: unconnectedRequiredPorts.length > 0,
    unconnectedRequiredPorts,
  };
}

/**
 * 모든 노드 검증
 */
export function validateNodes(
  nodes: FlowNode[],
  edges: FlowEdge[]
): Map<string, NodeValidationResult> {
  const validationMap = new Map<string, NodeValidationResult>();

  for (const node of nodes) {
    const result = validateNode(node, edges);
    if (result.hasWarning) {
      validationMap.set(node.id, result);
    }
  }

  return validationMap;
}
