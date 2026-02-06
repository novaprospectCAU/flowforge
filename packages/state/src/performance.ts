/**
 * 성능 최적화 유틸리티
 * - 뷰포트 컬링
 * - 메모이제이션
 * - 디바운싱/스로틀링
 */

import type { FlowNode, Viewport, CanvasSize, FlowEdge, Comment } from '@flowforge/types';

/**
 * 뷰포트 바운드 (월드 좌표)
 */
export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * 뷰포트의 월드 좌표 바운드 계산
 * 약간의 마진을 추가하여 노드가 화면 가장자리에서 갑자기 나타나지 않도록 함
 */
export function getViewportBounds(
  viewport: Viewport,
  canvasSize: CanvasSize,
  margin = 100
): ViewportBounds {
  const halfWidth = (canvasSize.width / 2) / viewport.zoom;
  const halfHeight = (canvasSize.height / 2) / viewport.zoom;

  return {
    minX: viewport.x - halfWidth - margin,
    minY: viewport.y - halfHeight - margin,
    maxX: viewport.x + halfWidth + margin,
    maxY: viewport.y + halfHeight + margin,
  };
}

/**
 * 노드가 뷰포트 내에 있는지 확인
 */
export function isNodeInViewport(
  node: FlowNode,
  bounds: ViewportBounds
): boolean {
  const nodeRight = node.position.x + node.size.width;
  const nodeBottom = node.position.y + node.size.height;

  // AABB 충돌 검사
  return !(
    nodeRight < bounds.minX ||
    node.position.x > bounds.maxX ||
    nodeBottom < bounds.minY ||
    node.position.y > bounds.maxY
  );
}

/**
 * 뷰포트 내에 보이는 노드만 필터링 (뷰포트 컬링)
 */
export function cullNodesByViewport(
  nodes: FlowNode[],
  viewport: Viewport,
  canvasSize: CanvasSize,
  margin = 100
): FlowNode[] {
  const bounds = getViewportBounds(viewport, canvasSize, margin);
  return nodes.filter(node => isNodeInViewport(node, bounds));
}

/**
 * 코멘트가 뷰포트 내에 있는지 확인
 */
export function isCommentInViewport(
  comment: Comment,
  bounds: ViewportBounds
): boolean {
  const right = comment.position.x + comment.size.width;
  const bottom = comment.position.y + comment.size.height;

  return !(
    right < bounds.minX ||
    comment.position.x > bounds.maxX ||
    bottom < bounds.minY ||
    comment.position.y > bounds.maxY
  );
}

/**
 * 뷰포트 내에 보이는 코멘트만 필터링
 */
export function cullCommentsByViewport(
  comments: Comment[],
  viewport: Viewport,
  canvasSize: CanvasSize,
  margin = 100
): Comment[] {
  const bounds = getViewportBounds(viewport, canvasSize, margin);
  return comments.filter(comment => isCommentInViewport(comment, bounds));
}

/**
 * 엣지가 뷰포트 내에 있는지 확인
 * 엣지의 두 끝점 중 하나라도 뷰포트 내에 있으면 true
 */
export function isEdgeInViewport(
  edge: FlowEdge,
  nodeMap: Map<string, FlowNode>,
  bounds: ViewportBounds
): boolean {
  const sourceNode = nodeMap.get(edge.source);
  const targetNode = nodeMap.get(edge.target);

  if (!sourceNode || !targetNode) return false;

  // 두 노드 중 하나라도 뷰포트 내에 있으면 엣지도 보임
  return isNodeInViewport(sourceNode, bounds) || isNodeInViewport(targetNode, bounds);
}

/**
 * 뷰포트 내에 보이는 엣지만 필터링
 */
export function cullEdgesByViewport(
  edges: FlowEdge[],
  nodes: FlowNode[],
  viewport: Viewport,
  canvasSize: CanvasSize,
  margin = 100
): FlowEdge[] {
  const bounds = getViewportBounds(viewport, canvasSize, margin);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  return edges.filter(edge => isEdgeInViewport(edge, nodeMap, bounds));
}

