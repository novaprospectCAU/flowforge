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
    const cycleNodeIds = nodes
      .filter(n => !result.includes(n.id))
      .map(n => n.id);
    const cyclePath = findCyclePath(cycleNodeIds, adjacency);
    throw new Error(`Circular dependency: ${cyclePath}`);
  }

  return result;
}

/**
 * 위상 정렬의 레벨별 그룹화 (병렬 실행용)
 * 같은 레벨의 노드는 서로 의존성이 없으므로 병렬 실행 가능
 *
 * @param nodes 노드 목록
 * @param edges 엣지 목록
 * @returns 레벨별 노드 ID 배열 (각 레벨은 병렬 실행 가능)
 * @throws 순환 의존성이 있으면 에러
 */
export function topologicalLevels(nodes: FlowNode[], edges: FlowEdge[]): string[][] {
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    const targets = adjacency.get(edge.source);
    if (targets) {
      targets.push(edge.target);
    }
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // 첫 번째 레벨: 진입 차수 0인 노드들
  let currentLevel: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      currentLevel.push(nodeId);
    }
  }

  const levels: string[][] = [];
  let processedCount = 0;

  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    processedCount += currentLevel.length;

    const nextLevel: string[] = [];

    for (const nodeId of currentLevel) {
      const targets = adjacency.get(nodeId) ?? [];
      for (const targetId of targets) {
        const newDegree = (inDegree.get(targetId) ?? 1) - 1;
        inDegree.set(targetId, newDegree);

        if (newDegree === 0) {
          nextLevel.push(targetId);
        }
      }
    }

    currentLevel = nextLevel;
  }

  if (processedCount !== nodes.length) {
    const cycleNodeIds = nodes
      .filter(n => !levels.flat().includes(n.id))
      .map(n => n.id);
    const cyclePath = findCyclePath(cycleNodeIds, adjacency);
    throw new Error(`Circular dependency: ${cyclePath}`);
  }

  return levels;
}

/**
 * DFS로 순환 경로를 찾아 문자열로 반환
 */
function findCyclePath(
  cycleNodeIds: string[],
  adjacency: Map<string, string[]>
): string {
  if (cycleNodeIds.length === 0) return 'unknown cycle';

  const nodeSet = new Set(cycleNodeIds);
  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string): boolean {
    if (path.includes(nodeId)) {
      // 순환 발견 - 순환 부분만 추출
      const cycleStart = path.indexOf(nodeId);
      const cycle = path.slice(cycleStart);
      cycle.push(nodeId); // 순환 완성
      path.length = 0;
      path.push(...cycle);
      return true;
    }

    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    path.push(nodeId);

    const targets = adjacency.get(nodeId) ?? [];
    for (const target of targets) {
      if (nodeSet.has(target) && dfs(target)) {
        return true;
      }
    }

    path.pop();
    return false;
  }

  for (const nodeId of cycleNodeIds) {
    visited.clear();
    path.length = 0;
    if (dfs(nodeId)) {
      return path.join(' -> ');
    }
  }

  // fallback: 관련 노드 ID 나열
  return cycleNodeIds.join(', ');
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
