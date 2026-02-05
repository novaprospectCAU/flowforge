import type { IRenderer } from '../renderer/types';
import type { FlowNode, Viewport, CanvasSize, Color, Position } from '@flowforge/types';

export const MINIMAP = {
  width: 180,
  height: 120,
  margin: 16,
  padding: 10,
};

const COLORS = {
  bg: { r: 30, g: 30, b: 32, a: 230 } as Color,
  node: { r: 100, g: 100, b: 105, a: 255 } as Color,
  viewport: { r: 0, g: 122, b: 204, a: 255 } as Color,
};

/**
 * 미니맵 렌더링 (화면 오른쪽 하단, 스크린 좌표)
 *
 * resetTransform 호출 후 사용해야 함
 */
export function drawMinimap(
  renderer: IRenderer,
  nodes: FlowNode[],
  viewport: Viewport,
  canvasSize: CanvasSize,
  dpr: number
): void {
  // transform 리셋
  renderer.resetTransform(dpr);

  // 미니맵 위치 (스크린 좌표)
  const mmX = canvasSize.width - MINIMAP.width - MINIMAP.margin;
  const mmY = canvasSize.height - MINIMAP.height - MINIMAP.margin;

  // 미니맵 배경
  renderer.drawRoundedRect(
    mmX, mmY,
    MINIMAP.width, MINIMAP.height,
    4,
    COLORS.bg
  );

  if (nodes.length === 0) return;

  // 노드 바운딩 박스
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + node.size.width);
    maxY = Math.max(maxY, node.position.y + node.size.height);
  }

  // 현재 뷰포트 영역
  const vpHalfW = canvasSize.width / 2 / viewport.zoom;
  const vpHalfH = canvasSize.height / 2 / viewport.zoom;

  // 전체 영역 (노드 + 뷰포트)
  minX = Math.min(minX, viewport.x - vpHalfW) - 50;
  minY = Math.min(minY, viewport.y - vpHalfH) - 50;
  maxX = Math.max(maxX, viewport.x + vpHalfW) + 50;
  maxY = Math.max(maxY, viewport.y + vpHalfH) + 50;

  const worldW = maxX - minX;
  const worldH = maxY - minY;
  const worldCenterX = (minX + maxX) / 2;
  const worldCenterY = (minY + maxY) / 2;

  // 미니맵 내부 영역
  const innerX = mmX + MINIMAP.padding;
  const innerY = mmY + MINIMAP.padding;
  const innerW = MINIMAP.width - MINIMAP.padding * 2;
  const innerH = MINIMAP.height - MINIMAP.padding * 2;

  // 스케일
  const scale = Math.min(innerW / worldW, innerH / worldH);

  // 월드 → 미니맵 좌표
  const toMinimap = (wx: number, wy: number) => ({
    x: innerX + innerW / 2 + (wx - worldCenterX) * scale,
    y: innerY + innerH / 2 + (wy - worldCenterY) * scale,
  });

  // 노드 렌더링
  for (const node of nodes) {
    const pos = toMinimap(node.position.x, node.position.y);
    renderer.drawRect(
      pos.x, pos.y,
      Math.max(2, node.size.width * scale),
      Math.max(2, node.size.height * scale),
      COLORS.node
    );
  }

  // 뷰포트 영역
  const vpTopLeft = toMinimap(viewport.x - vpHalfW, viewport.y - vpHalfH);
  const vpW = vpHalfW * 2 * scale;
  const vpH = vpHalfH * 2 * scale;

  // 뷰포트 테두리
  renderer.drawLine(vpTopLeft.x, vpTopLeft.y, vpTopLeft.x + vpW, vpTopLeft.y, COLORS.viewport, 1.5);
  renderer.drawLine(vpTopLeft.x + vpW, vpTopLeft.y, vpTopLeft.x + vpW, vpTopLeft.y + vpH, COLORS.viewport, 1.5);
  renderer.drawLine(vpTopLeft.x + vpW, vpTopLeft.y + vpH, vpTopLeft.x, vpTopLeft.y + vpH, COLORS.viewport, 1.5);
  renderer.drawLine(vpTopLeft.x, vpTopLeft.y + vpH, vpTopLeft.x, vpTopLeft.y, COLORS.viewport, 1.5);
}

/**
 * 스크린 좌표가 미니맵 영역 내에 있는지 확인
 */
export function isInMinimap(
  screenPos: Position,
  canvasSize: CanvasSize
): boolean {
  const mmX = canvasSize.width - MINIMAP.width - MINIMAP.margin;
  const mmY = canvasSize.height - MINIMAP.height - MINIMAP.margin;

  return (
    screenPos.x >= mmX &&
    screenPos.x <= mmX + MINIMAP.width &&
    screenPos.y >= mmY &&
    screenPos.y <= mmY + MINIMAP.height
  );
}

/**
 * 미니맵 클릭 위치를 월드 좌표로 변환
 */
export function minimapToWorld(
  screenPos: Position,
  nodes: FlowNode[],
  viewport: Viewport,
  canvasSize: CanvasSize
): Position {
  // 미니맵 위치
  const mmX = canvasSize.width - MINIMAP.width - MINIMAP.margin;
  const mmY = canvasSize.height - MINIMAP.height - MINIMAP.margin;

  // 미니맵 내부 영역
  const innerX = mmX + MINIMAP.padding;
  const innerY = mmY + MINIMAP.padding;
  const innerW = MINIMAP.width - MINIMAP.padding * 2;
  const innerH = MINIMAP.height - MINIMAP.padding * 2;

  if (nodes.length === 0) {
    // 노드가 없으면 현재 뷰포트 기준
    return { x: viewport.x, y: viewport.y };
  }

  // 노드 바운딩 박스
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + node.size.width);
    maxY = Math.max(maxY, node.position.y + node.size.height);
  }

  // 현재 뷰포트 영역
  const vpHalfW = canvasSize.width / 2 / viewport.zoom;
  const vpHalfH = canvasSize.height / 2 / viewport.zoom;

  // 전체 영역
  minX = Math.min(minX, viewport.x - vpHalfW) - 50;
  minY = Math.min(minY, viewport.y - vpHalfH) - 50;
  maxX = Math.max(maxX, viewport.x + vpHalfW) + 50;
  maxY = Math.max(maxY, viewport.y + vpHalfH) + 50;

  const worldW = maxX - minX;
  const worldH = maxY - minY;
  const worldCenterX = (minX + maxX) / 2;
  const worldCenterY = (minY + maxY) / 2;

  // 스케일
  const scale = Math.min(innerW / worldW, innerH / worldH);

  // 미니맵 → 월드 좌표
  const relX = screenPos.x - (innerX + innerW / 2);
  const relY = screenPos.y - (innerY + innerH / 2);

  return {
    x: worldCenterX + relX / scale,
    y: worldCenterY + relY / scale,
  };
}
