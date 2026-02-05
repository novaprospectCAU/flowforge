import type { FlowEdge, Subflow, Position } from '@flowforge/types';

/**
 * 엣지 분류 결과
 */
export interface ClassifiedEdges {
  internal: FlowEdge[];    // 서브플로우 내부 엣지
  incoming: FlowEdge[];    // 외부에서 들어오는 엣지
  outgoing: FlowEdge[];    // 외부로 나가는 엣지
}

/**
 * 해석된 엣지 엔드포인트
 */
export interface ResolvedEdgeEndpoint {
  nodeId: string;
  portId: string;
  isSubflowPort: boolean;   // 서브플로우의 exposed 포트인지
  subflowId?: string;       // 서브플로우 ID (isSubflowPort가 true일 때)
}

export interface ResolvedEdge {
  edge: FlowEdge;
  source: ResolvedEdgeEndpoint;
  target: ResolvedEdgeEndpoint;
  hidden: boolean;          // 접힌 서브플로우 내부 엣지는 hidden
}

/**
 * 엣지를 서브플로우 기준으로 분류
 */
export function classifyEdges(
  edges: FlowEdge[],
  nodeIds: string[]
): ClassifiedEdges {
  const nodeIdSet = new Set(nodeIds);
  const internal: FlowEdge[] = [];
  const incoming: FlowEdge[] = [];
  const outgoing: FlowEdge[] = [];

  for (const edge of edges) {
    const sourceInSet = nodeIdSet.has(edge.source);
    const targetInSet = nodeIdSet.has(edge.target);

    if (sourceInSet && targetInSet) {
      internal.push(edge);
    } else if (!sourceInSet && targetInSet) {
      incoming.push(edge);
    } else if (sourceInSet && !targetInSet) {
      outgoing.push(edge);
    }
    // 둘 다 없으면 무관한 엣지
  }

  return { internal, incoming, outgoing };
}

/**
 * 렌더링용 엣지 엔드포인트 해석
 * - collapsed 서브플로우의 내부 노드를 참조하는 엣지는 exposed 포트로 매핑
 * - collapsed 서브플로우의 내부 엣지는 hidden 처리
 */
export function resolveEdgeEndpoints(
  edges: FlowEdge[],
  subflows: Subflow[]
): ResolvedEdge[] {
  const result: ResolvedEdge[] = [];

  // 서브플로우별 노드 ID 맵 생성 (빠른 검색용)
  const nodeToSubflow = new Map<string, Subflow>();
  for (const subflow of subflows) {
    if (subflow.collapsed) {
      for (const nodeId of subflow.nodeIds) {
        nodeToSubflow.set(nodeId, subflow);
      }
    }
  }

  for (const edge of edges) {
    const sourceSubflow = nodeToSubflow.get(edge.source);
    const targetSubflow = nodeToSubflow.get(edge.target);

    // 둘 다 같은 collapsed 서브플로우 내부면 hidden
    if (sourceSubflow && targetSubflow && sourceSubflow.id === targetSubflow.id) {
      result.push({
        edge,
        source: {
          nodeId: edge.source,
          portId: edge.sourcePort,
          isSubflowPort: false,
        },
        target: {
          nodeId: edge.target,
          portId: edge.targetPort,
          isSubflowPort: false,
        },
        hidden: true,
      });
      continue;
    }

    // 소스 해석
    let source: ResolvedEdgeEndpoint;
    if (sourceSubflow) {
      // collapsed 서브플로우 내부 노드 → exposed 출력 포트 찾기
      const mapping = sourceSubflow.outputMappings.find(
        m => m.internalNodeId === edge.source && m.internalPortId === edge.sourcePort
      );
      if (mapping) {
        source = {
          nodeId: sourceSubflow.id,
          portId: mapping.exposedPortId,
          isSubflowPort: true,
          subflowId: sourceSubflow.id,
        };
      } else {
        // 매핑이 없으면 숨김 처리
        result.push({
          edge,
          source: { nodeId: edge.source, portId: edge.sourcePort, isSubflowPort: false },
          target: { nodeId: edge.target, portId: edge.targetPort, isSubflowPort: false },
          hidden: true,
        });
        continue;
      }
    } else {
      source = {
        nodeId: edge.source,
        portId: edge.sourcePort,
        isSubflowPort: false,
      };
    }

    // 타겟 해석
    let target: ResolvedEdgeEndpoint;
    if (targetSubflow) {
      // collapsed 서브플로우 내부 노드 → exposed 입력 포트 찾기
      const mapping = targetSubflow.inputMappings.find(
        m => m.internalNodeId === edge.target && m.internalPortId === edge.targetPort
      );
      if (mapping) {
        target = {
          nodeId: targetSubflow.id,
          portId: mapping.exposedPortId,
          isSubflowPort: true,
          subflowId: targetSubflow.id,
        };
      } else {
        // 매핑이 없으면 숨김 처리
        result.push({
          edge,
          source,
          target: { nodeId: edge.target, portId: edge.targetPort, isSubflowPort: false },
          hidden: true,
        });
        continue;
      }
    } else {
      target = {
        nodeId: edge.target,
        portId: edge.targetPort,
        isSubflowPort: false,
      };
    }

    result.push({
      edge,
      source,
      target,
      hidden: false,
    });
  }

  return result;
}

/**
 * 서브플로우의 노드 바운딩 박스 계산
 */
export function getSubflowNodesBounds(
  subflow: Subflow,
  nodes: { id: string; position: Position; size: { width: number; height: number } }[]
): { x: number; y: number; width: number; height: number } | null {
  const subflowNodes = nodes.filter(n => subflow.nodeIds.includes(n.id));
  if (subflowNodes.length === 0) return null;

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const node of subflowNodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + node.size.width);
    maxY = Math.max(maxY, node.position.y + node.size.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * collapsed 서브플로우에 속하지 않은 (보이는) 노드만 필터링
 */
export function getVisibleNodes<T extends { id: string }>(
  nodes: T[],
  subflows: Subflow[]
): T[] {
  // collapsed 서브플로우의 노드 ID 세트
  const hiddenNodeIds = new Set<string>();
  for (const subflow of subflows) {
    if (subflow.collapsed) {
      for (const nodeId of subflow.nodeIds) {
        hiddenNodeIds.add(nodeId);
      }
    }
  }

  return nodes.filter(n => !hiddenNodeIds.has(n.id));
}
