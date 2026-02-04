import type { Viewport, CanvasSize, Position } from '@flowforge/types';

/**
 * Screen → World 변환
 * 마우스 클릭 위치를 노드 좌표로 변환
 * 
 * viewport.x/y = 화면 중심의 월드 좌표
 */
export function screenToWorld(
  screenPos: Position,
  viewport: Viewport,
  canvasSize: CanvasSize
): Position {
  return {
    x: (screenPos.x - canvasSize.width / 2) / viewport.zoom + viewport.x,
    y: (screenPos.y - canvasSize.height / 2) / viewport.zoom + viewport.y,
  };
}

/**
 * World → Screen 변환
 * 노드를 화면에 그릴 때 사용
 */
export function worldToScreen(
  worldPos: Position,
  viewport: Viewport,
  canvasSize: CanvasSize
): Position {
  return {
    x: (worldPos.x - viewport.x) * viewport.zoom + canvasSize.width / 2,
    y: (worldPos.y - viewport.y) * viewport.zoom + canvasSize.height / 2,
  };
}

/**
 * 현재 뷰포트의 월드 영역 (AABB)
 */
export function getViewportBounds(
  viewport: Viewport,
  canvasSize: CanvasSize
): { minX: number; minY: number; maxX: number; maxY: number } {
  const halfWidth = (canvasSize.width / 2) / viewport.zoom;
  const halfHeight = (canvasSize.height / 2) / viewport.zoom;
  
  return {
    minX: viewport.x - halfWidth,
    minY: viewport.y - halfHeight,
    maxX: viewport.x + halfWidth,
    maxY: viewport.y + halfHeight,
  };
}
