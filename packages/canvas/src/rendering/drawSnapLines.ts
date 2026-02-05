import type { IRenderer } from '../renderer/types';
import type { FlowNode, Color, Position } from '@flowforge/types';

const SNAP_THRESHOLD = 8; // 스냅 감지 거리 (px)

const SNAP_LINE_COLOR: Color = { r: 59, g: 130, b: 246, a: 200 }; // 파란색

export interface SnapResult {
  x: number | null; // 스냅된 X 좌표 (null이면 스냅 안 됨)
  y: number | null; // 스냅된 Y 좌표 (null이면 스냅 안 됨)
  lines: SnapLine[]; // 표시할 스냅 라인들
}

export interface SnapLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * 드래그 중인 노드에 대한 스냅 계산
 * @param draggedNodes 드래그 중인 노드들
 * @param allNodes 모든 노드들
 * @param draggedPosition 드래그 중인 노드의 현재 위치 (첫 번째 노드 기준)
 */
export function calculateSnap(
  draggedNodes: FlowNode[],
  allNodes: FlowNode[],
  draggedPosition: Position
): SnapResult {
  if (draggedNodes.length === 0) {
    return { x: null, y: null, lines: [] };
  }

  const draggedIds = new Set(draggedNodes.map(n => n.id));
  const otherNodes = allNodes.filter(n => !draggedIds.has(n.id));

  if (otherNodes.length === 0) {
    return { x: null, y: null, lines: [] };
  }

  // 드래그 중인 노드들의 바운딩 박스 계산 (첫 번째 노드 위치 기준)
  const firstNode = draggedNodes[0];
  const offsetX = draggedPosition.x - firstNode.position.x;
  const offsetY = draggedPosition.y - firstNode.position.y;

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const node of draggedNodes) {
    const x = node.position.x + offsetX;
    const y = node.position.y + offsetY;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + node.size.width);
    maxY = Math.max(maxY, y + node.size.height);
  }

  const draggedLeft = minX;
  const draggedRight = maxX;
  const draggedTop = minY;
  const draggedBottom = maxY;
  const draggedCenterX = (minX + maxX) / 2;
  const draggedCenterY = (minY + maxY) / 2;

  // 스냅 후보들 수집
  const xCandidates: { value: number; diff: number; type: 'left' | 'center' | 'right' }[] = [];
  const yCandidates: { value: number; diff: number; type: 'top' | 'center' | 'bottom' }[] = [];

  for (const node of otherNodes) {
    const nodeLeft = node.position.x;
    const nodeRight = node.position.x + node.size.width;
    const nodeTop = node.position.y;
    const nodeBottom = node.position.y + node.size.height;
    const nodeCenterX = (nodeLeft + nodeRight) / 2;
    const nodeCenterY = (nodeTop + nodeBottom) / 2;

    // X축 스냅 체크 (left-left, left-right, center-center, right-left, right-right)
    const xChecks = [
      { draggedVal: draggedLeft, nodeVal: nodeLeft, type: 'left' as const },
      { draggedVal: draggedLeft, nodeVal: nodeRight, type: 'left' as const },
      { draggedVal: draggedCenterX, nodeVal: nodeCenterX, type: 'center' as const },
      { draggedVal: draggedRight, nodeVal: nodeLeft, type: 'right' as const },
      { draggedVal: draggedRight, nodeVal: nodeRight, type: 'right' as const },
    ];

    for (const check of xChecks) {
      const diff = Math.abs(check.draggedVal - check.nodeVal);
      if (diff <= SNAP_THRESHOLD) {
        xCandidates.push({ value: check.nodeVal, diff, type: check.type });
      }
    }

    // Y축 스냅 체크 (top-top, top-bottom, center-center, bottom-top, bottom-bottom)
    const yChecks = [
      { draggedVal: draggedTop, nodeVal: nodeTop, type: 'top' as const },
      { draggedVal: draggedTop, nodeVal: nodeBottom, type: 'top' as const },
      { draggedVal: draggedCenterY, nodeVal: nodeCenterY, type: 'center' as const },
      { draggedVal: draggedBottom, nodeVal: nodeTop, type: 'bottom' as const },
      { draggedVal: draggedBottom, nodeVal: nodeBottom, type: 'bottom' as const },
    ];

    for (const check of yChecks) {
      const diff = Math.abs(check.draggedVal - check.nodeVal);
      if (diff <= SNAP_THRESHOLD) {
        yCandidates.push({ value: check.nodeVal, diff, type: check.type });
      }
    }
  }

  // 가장 가까운 스냅 선택
  let snapX: number | null = null;
  let snapY: number | null = null;
  let bestXCandidate: typeof xCandidates[0] | null = null;
  let bestYCandidate: typeof yCandidates[0] | null = null;

  if (xCandidates.length > 0) {
    bestXCandidate = xCandidates.reduce((a, b) => a.diff < b.diff ? a : b);
    // 스냅 보정값 계산
    if (bestXCandidate.type === 'left') {
      snapX = draggedPosition.x + (bestXCandidate.value - draggedLeft);
    } else if (bestXCandidate.type === 'center') {
      snapX = draggedPosition.x + (bestXCandidate.value - draggedCenterX);
    } else {
      snapX = draggedPosition.x + (bestXCandidate.value - draggedRight);
    }
  }

  if (yCandidates.length > 0) {
    bestYCandidate = yCandidates.reduce((a, b) => a.diff < b.diff ? a : b);
    if (bestYCandidate.type === 'top') {
      snapY = draggedPosition.y + (bestYCandidate.value - draggedTop);
    } else if (bestYCandidate.type === 'center') {
      snapY = draggedPosition.y + (bestYCandidate.value - draggedCenterY);
    } else {
      snapY = draggedPosition.y + (bestYCandidate.value - draggedBottom);
    }
  }

  // 스냅 라인 생성
  const lines: SnapLine[] = [];
  const lineExtend = 1000; // 라인 확장 길이

  if (bestXCandidate) {
    lines.push({
      x1: bestXCandidate.value,
      y1: -lineExtend,
      x2: bestXCandidate.value,
      y2: lineExtend,
    });
  }

  if (bestYCandidate) {
    lines.push({
      x1: -lineExtend,
      y1: bestYCandidate.value,
      x2: lineExtend,
      y2: bestYCandidate.value,
    });
  }

  return { x: snapX, y: snapY, lines };
}

/**
 * 스냅 라인 렌더링
 */
export function drawSnapLines(
  renderer: IRenderer,
  lines: SnapLine[]
): void {
  for (const line of lines) {
    renderer.drawLine(line.x1, line.y1, line.x2, line.y2, SNAP_LINE_COLOR, 1);
  }
}
