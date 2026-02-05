import type { FlowNode, FlowEdge } from '@flowforge/types';

/**
 * 그래프를 위상 정렬하여 실행 순서를 결정
 * @param nodes 노드 목록
 * @param edges 엣지 목록
 * @returns 정렬된 노드 ID 배열 (실행 순서)
 * @throws 순환 의존성이 있으면 에러
 */
export function topologicalSort(nodes: FlowNode[], edges: FlowEdge[]): string[] {
  // 인접 리스트 및 진입 차수 계산
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // 초기화
  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  // 엣지 정보로 그래프 구성
  for (const edge of edges) {
    const targets = adjacency.get(edge.source);
    if (targets) {
      targets.push(edge.target);
    }
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // 진입 차수가 0인 노드들로 시작 (입력 노드들)
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const result: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);

    // 이 노드에서 나가는 엣지들의 대상 노드들의 진입 차수 감소
    const targets = adjacency.get(nodeId) ?? [];
    for (const targetId of targets) {
      const newDegree = (inDegree.get(targetId) ?? 1) - 1;
      inDegree.set(targetId, newDegree);

      if (newDegree === 0) {
        queue.push(targetId);
      }
    }
  }

  // 모든 노드가 결과에 포함되지 않았다면 순환 의존성 존재
  if (result.length !== nodes.length) {
    throw new Error('Cycle detected in graph - cannot execute');
  }

  return result;
}

/**
 * 특정 노드의 의존성 (부모) 노드들을 찾음
 */
export function getDependencies(nodeId: string, edges: FlowEdge[]): string[] {
  return edges
    .filter(e => e.target === nodeId)
    .map(e => e.source);
}

/**
 * 특정 노드의 하위 (자식) 노드들을 찾음
 */
export function getDependents(nodeId: string, edges: FlowEdge[]): string[] {
  return edges
    .filter(e => e.source === nodeId)
    .map(e => e.target);
}
