import type { FlowStore } from '@flowforge/state';
import type { FlowNode } from '@flowforge/types';

export type AlignDirection = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type DistributeAxis = 'horizontal' | 'vertical';

export function alignNodes(store: FlowStore, selectedIds: Set<string>, direction: AlignDirection): void {
  if (selectedIds.size < 2) return;

  const state = store.getState();
  const selectedNodes = state.nodes.filter(n => selectedIds.has(n.id));

  let targetValue: number;

  switch (direction) {
    case 'left':
      targetValue = Math.min(...selectedNodes.map(n => n.position.x));
      for (const node of selectedNodes) {
        state.updateNode(node.id, { position: { ...node.position, x: targetValue } });
      }
      break;
    case 'center': {
      const centers = selectedNodes.map(n => n.position.x + n.size.width / 2);
      targetValue = (Math.min(...centers) + Math.max(...centers)) / 2;
      for (const node of selectedNodes) {
        state.updateNode(node.id, { position: { ...node.position, x: targetValue - node.size.width / 2 } });
      }
      break;
    }
    case 'right':
      targetValue = Math.max(...selectedNodes.map(n => n.position.x + n.size.width));
      for (const node of selectedNodes) {
        state.updateNode(node.id, { position: { ...node.position, x: targetValue - node.size.width } });
      }
      break;
    case 'top':
      targetValue = Math.min(...selectedNodes.map(n => n.position.y));
      for (const node of selectedNodes) {
        state.updateNode(node.id, { position: { ...node.position, y: targetValue } });
      }
      break;
    case 'middle': {
      const middles = selectedNodes.map(n => n.position.y + n.size.height / 2);
      targetValue = (Math.min(...middles) + Math.max(...middles)) / 2;
      for (const node of selectedNodes) {
        state.updateNode(node.id, { position: { ...node.position, y: targetValue - node.size.height / 2 } });
      }
      break;
    }
    case 'bottom':
      targetValue = Math.max(...selectedNodes.map(n => n.position.y + n.size.height));
      for (const node of selectedNodes) {
        state.updateNode(node.id, { position: { ...node.position, y: targetValue - node.size.height } });
      }
      break;
  }
}

export function distributeNodes(store: FlowStore, selectedIds: Set<string>, axis: DistributeAxis): void {
  if (selectedIds.size < 3) return; // 최소 3개 필요

  const state = store.getState();
  const selectedNodes = state.nodes.filter(n => selectedIds.has(n.id));

  if (axis === 'horizontal') {
    // X 위치로 정렬
    const sorted = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalWidth = last.position.x + last.size.width - first.position.x;
    const nodesWidth = sorted.reduce((sum, n) => sum + n.size.width, 0);
    const gap = (totalWidth - nodesWidth) / (sorted.length - 1);

    let currentX = first.position.x;
    for (const node of sorted) {
      state.updateNode(node.id, { position: { ...node.position, x: currentX } });
      currentX += node.size.width + gap;
    }
  } else {
    // Y 위치로 정렬
    const sorted = [...selectedNodes].sort((a, b) => a.position.y - b.position.y);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalHeight = last.position.y + last.size.height - first.position.y;
    const nodesHeight = sorted.reduce((sum, n) => sum + n.size.height, 0);
    const gap = (totalHeight - nodesHeight) / (sorted.length - 1);

    let currentY = first.position.y;
    for (const node of sorted) {
      state.updateNode(node.id, { position: { ...node.position, y: currentY } });
      currentY += node.size.height + gap;
    }
  }
}

// 자동 배치 - 플로우 방향(왼쪽→오른쪽) 기반 계층적 정렬
export function autoArrangeNodes(store: FlowStore, selectedIds: Set<string>, arrangeAll: boolean): void {
  const state = store.getState();

  // 대상 노드 결정: arrangeAll이면 모든 노드, 아니면 선택된 노드
  const targetNodes = arrangeAll
    ? state.nodes
    : state.nodes.filter(n => selectedIds.has(n.id));

  if (targetNodes.length < 2) return;

  const targetNodeIds = new Set(targetNodes.map(n => n.id));

  // 대상 노드들 사이의 엣지만 고려
  const relevantEdges = state.edges.filter(
    e => targetNodeIds.has(e.source) && targetNodeIds.has(e.target)
  );

  // 인접 리스트 및 진입 차수 계산
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of targetNodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of relevantEdges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // BFS로 레이어 할당 (가장 긴 경로 기준)
  const layers = new Map<string, number>();
  const queue: string[] = [];

  // 진입 차수가 0인 노드들이 첫 레이어
  for (const node of targetNodes) {
    if ((inDegree.get(node.id) || 0) === 0) {
      queue.push(node.id);
      layers.set(node.id, 0);
    }
  }

  // BFS로 레이어 전파
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const currentLayer = layers.get(nodeId) || 0;

    for (const targetId of adjacency.get(nodeId) || []) {
      const existingLayer = layers.get(targetId);
      const newLayer = currentLayer + 1;

      if (existingLayer === undefined || newLayer > existingLayer) {
        layers.set(targetId, newLayer);
      }

      // 모든 선행 노드 처리 후 큐에 추가
      const targetInDegree = inDegree.get(targetId) || 0;
      inDegree.set(targetId, targetInDegree - 1);
      if (targetInDegree - 1 === 0) {
        queue.push(targetId);
      }
    }
  }

  // 레이어가 할당되지 않은 노드 처리 (연결 안 된 노드들)
  let maxLayer = 0;
  for (const layer of layers.values()) {
    maxLayer = Math.max(maxLayer, layer);
  }
  for (const node of targetNodes) {
    if (!layers.has(node.id)) {
      layers.set(node.id, maxLayer + 1);
    }
  }

  // 레이어별로 노드 그룹화
  const layerGroups = new Map<number, FlowNode[]>();
  for (const node of targetNodes) {
    const layer = layers.get(node.id) || 0;
    if (!layerGroups.has(layer)) {
      layerGroups.set(layer, []);
    }
    layerGroups.get(layer)!.push(node);
  }

  // 각 레이어 내에서 Y 위치 기준 정렬 (기존 순서 유지)
  for (const nodes of layerGroups.values()) {
    nodes.sort((a, b) => a.position.y - b.position.y);
  }

  // 간격 설정
  const HORIZONTAL_GAP = 80;
  const VERTICAL_GAP = 30;

  // 기존 중심점 계산
  const centerX = targetNodes.reduce((sum, n) => sum + n.position.x + n.size.width / 2, 0) / targetNodes.length;
  const centerY = targetNodes.reduce((sum, n) => sum + n.position.y + n.size.height / 2, 0) / targetNodes.length;

  // 각 레이어의 최대 너비 계산
  const layerWidths: number[] = [];
  const sortedLayers = [...layerGroups.keys()].sort((a, b) => a - b);

  for (const layer of sortedLayers) {
    const nodes = layerGroups.get(layer) || [];
    const maxWidth = Math.max(...nodes.map(n => n.size.width));
    layerWidths.push(maxWidth);
  }

  // 전체 너비 계산
  const totalWidth = layerWidths.reduce((sum, w) => sum + w + HORIZONTAL_GAP, -HORIZONTAL_GAP);

  // 각 레이어의 X 시작 위치 계산
  const layerXPositions: number[] = [];
  let currentX = centerX - totalWidth / 2;
  for (let i = 0; i < sortedLayers.length; i++) {
    layerXPositions.push(currentX);
    currentX += layerWidths[i] + HORIZONTAL_GAP;
  }

  // 노드 배치
  for (let i = 0; i < sortedLayers.length; i++) {
    const layer = sortedLayers[i];
    const nodes = layerGroups.get(layer) || [];
    const layerX = layerXPositions[i];
    const layerWidth = layerWidths[i];

    // 레이어의 총 높이 계산
    const totalHeight = nodes.reduce((sum, n) => sum + n.size.height, 0) + VERTICAL_GAP * (nodes.length - 1);
    let y = centerY - totalHeight / 2;

    for (const node of nodes) {
      // X: 레이어 내 중앙 정렬
      const x = layerX + (layerWidth - node.size.width) / 2;

      state.updateNode(node.id, { position: { x, y } });
      y += node.size.height + VERTICAL_GAP;
    }
  }
}
