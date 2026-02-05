import type { IRenderer } from '../renderer/types';
import type { FlowNode, Viewport, CanvasSize, Color } from '@flowforge/types';

const MINIMAP = {
  width: 180,
  height: 120,
  margin: 16,
  padding: 10,
};

const COLORS = {
  bg: { r: 30, g: 30, b: 32, a: 230 } as Color,
  node: { r: 70, g: 70, b: 75, a: 255 } as Color,
  viewport: { r: 0, g: 122, b: 204, a: 200 } as Color,
};

/**
 * 미니맵 렌더링 (화면 오른쪽 하단)
 *
 * Note: setTransform 이후 호출되므로 역변환 필요
 */
export function drawMinimap(
  renderer: IRenderer,
  nodes: FlowNode[],
  viewport: Viewport,
  canvasSize: CanvasSize
): { x: number; y: number; width: number; height: number } {
  // 미니맵 위치 (스크린 좌표)
  const mmScreenX = canvasSize.width - MINIMAP.width - MINIMAP.margin;
  const mmScreenY = canvasSize.height - MINIMAP.height - MINIMAP.margin;

  // 스크린 좌표 → 월드 좌표 변환
  const toWorld = (sx: number, sy: number) => ({
    x: (sx - canvasSize.width / 2) / viewport.zoom + viewport.x,
    y: (sy - canvasSize.height / 2) / viewport.zoom + viewport.y,
  });

  const mmTopLeft = toWorld(mmScreenX, mmScreenY);
  const mmBottomRight = toWorld(mmScreenX + MINIMAP.width, mmScreenY + MINIMAP.height);
  const mmWorldWidth = mmBottomRight.x - mmTopLeft.x;
  const mmWorldHeight = mmBottomRight.y - mmTopLeft.y;

  // 미니맵 배경
  renderer.drawRoundedRect(
    mmTopLeft.x, mmTopLeft.y,
    mmWorldWidth, mmWorldHeight,
    4 / viewport.zoom,
    COLORS.bg
  );

  if (nodes.length === 0) {
    return { x: mmScreenX, y: mmScreenY, width: MINIMAP.width, height: MINIMAP.height };
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

  // 전체 영역 계산 (노드 + 현재 뷰포트)
  const vpHalfW = canvasSize.width / 2 / viewport.zoom;
  const vpHalfH = canvasSize.height / 2 / viewport.zoom;
  minX = Math.min(minX, viewport.x - vpHalfW) - 50;
  minY = Math.min(minY, viewport.y - vpHalfH) - 50;
  maxX = Math.max(maxX, viewport.x + vpHalfW) + 50;
  maxY = Math.max(maxY, viewport.y + vpHalfH) + 50;

  const worldW = maxX - minX;
  const worldH = maxY - minY;

  // 미니맵 내부 영역
  const innerPad = MINIMAP.padding / viewport.zoom;
  const innerX = mmTopLeft.x + innerPad;
  const innerY = mmTopLeft.y + innerPad;
  const innerW = mmWorldWidth - innerPad * 2;
  const innerH = mmWorldHeight - innerPad * 2;

  // 스케일
  const scale = Math.min(innerW / worldW, innerH / worldH);

  // 월드 → 미니맵 내부 좌표
  const toMinimap = (wx: number, wy: number) => ({
    x: innerX + innerW / 2 + (wx - (minX + maxX) / 2) * scale,
    y: innerY + innerH / 2 + (wy - (minY + maxY) / 2) * scale,
  });

  // 노드 렌더링
  for (const node of nodes) {
    const pos = toMinimap(node.position.x, node.position.y);
    renderer.drawRect(
      pos.x, pos.y,
      node.size.width * scale, node.size.height * scale,
      COLORS.node
    );
  }

  // 현재 뷰포트 영역
  const vpTopLeft = toMinimap(viewport.x - vpHalfW, viewport.y - vpHalfH);
  const vpW = vpHalfW * 2 * scale;
  const vpH = vpHalfH * 2 * scale;

  // 뷰포트 테두리 (4개 라인)
  const lineWidth = 1.5 / viewport.zoom;
  renderer.drawLine(vpTopLeft.x, vpTopLeft.y, vpTopLeft.x + vpW, vpTopLeft.y, COLORS.viewport, lineWidth);
  renderer.drawLine(vpTopLeft.x + vpW, vpTopLeft.y, vpTopLeft.x + vpW, vpTopLeft.y + vpH, COLORS.viewport, lineWidth);
  renderer.drawLine(vpTopLeft.x + vpW, vpTopLeft.y + vpH, vpTopLeft.x, vpTopLeft.y + vpH, COLORS.viewport, lineWidth);
  renderer.drawLine(vpTopLeft.x, vpTopLeft.y + vpH, vpTopLeft.x, vpTopLeft.y, COLORS.viewport, lineWidth);

  return { x: mmScreenX, y: mmScreenY, width: MINIMAP.width, height: MINIMAP.height };
}
