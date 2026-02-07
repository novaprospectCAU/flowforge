import type { IRenderer } from '../renderer/types';
import type { FlowNode, Viewport, CanvasSize, Color, Position, Subflow } from '@flowforge/types';
import { calculateBoundsMinMax, expandBounds, mergeBounds, getBoundsCenter } from '../utils/bounds';

export const MINIMAP = {
  width: 180,
  height: 120,
  margin: 16,
  padding: 10,
};

// 미니맵 월드 영역 패딩
const MINIMAP_WORLD_PADDING = 50;

import { getCanvasTheme } from '../theme/canvasTheme';

// 모드 무관 accent 색상
const COLORS = {
  nodeSelected: { r: 66, g: 135, b: 245, a: 255 } as Color,  // 선택된 노드
  subflow: { r: 66, g: 165, b: 245, a: 255 } as Color,       // 접힌 서브플로우
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
  dpr: number,
  selectedIds?: Set<string>,
  subflows?: Subflow[]
): void {
  // transform 리셋
  renderer.resetTransform(dpr);

  // 미니맵 위치 (스크린 좌표)
  const mmX = canvasSize.width - MINIMAP.width - MINIMAP.margin;
  const mmY = canvasSize.height - MINIMAP.height - MINIMAP.margin;

  const theme = getCanvasTheme();

  // 미니맵 배경
  renderer.drawRoundedRect(
    mmX, mmY,
    MINIMAP.width, MINIMAP.height,
    4,
    theme.minimapBg
  );

  // 노드 바운딩 박스
  const nodeBounds = calculateBoundsMinMax(nodes);
  if (!nodeBounds) return;

  // 현재 뷰포트 영역
  const vpHalfW = canvasSize.width / 2 / viewport.zoom;
  const vpHalfH = canvasSize.height / 2 / viewport.zoom;
  const viewportBounds = {
    minX: viewport.x - vpHalfW,
    minY: viewport.y - vpHalfH,
    maxX: viewport.x + vpHalfW,
    maxY: viewport.y + vpHalfH,
  };

  // 전체 영역 (노드 + 뷰포트) + 패딩
  const worldBounds = expandBounds(mergeBounds(nodeBounds, viewportBounds), MINIMAP_WORLD_PADDING);

  const worldW = worldBounds.maxX - worldBounds.minX;
  const worldH = worldBounds.maxY - worldBounds.minY;
  const worldCenter = getBoundsCenter(worldBounds);

  // 미니맵 내부 영역
  const innerX = mmX + MINIMAP.padding;
  const innerY = mmY + MINIMAP.padding;
  const innerW = MINIMAP.width - MINIMAP.padding * 2;
  const innerH = MINIMAP.height - MINIMAP.padding * 2;

  // 스케일
  const scale = Math.min(innerW / worldW, innerH / worldH);

  // 월드 → 미니맵 좌표
  const toMinimap = (wx: number, wy: number) => ({
    x: innerX + innerW / 2 + (wx - worldCenter.x) * scale,
    y: innerY + innerH / 2 + (wy - worldCenter.y) * scale,
  });

  // 노드 렌더링 (선택되지 않은 노드 먼저, 선택된 노드 나중에 - 레이어링)
  const unselectedNodes = nodes.filter(n => !selectedIds?.has(n.id));
  const selectedNodes = nodes.filter(n => selectedIds?.has(n.id));

  // 선택되지 않은 노드
  for (const node of unselectedNodes) {
    const pos = toMinimap(node.position.x, node.position.y);
    renderer.drawRect(
      pos.x, pos.y,
      Math.max(2, node.size.width * scale),
      Math.max(2, node.size.height * scale),
      theme.minimapNode
    );
  }

  // 선택된 노드 (하이라이트)
  for (const node of selectedNodes) {
    const pos = toMinimap(node.position.x, node.position.y);
    const nodeW = Math.max(2, node.size.width * scale);
    const nodeH = Math.max(2, node.size.height * scale);

    // 선택 테두리 (약간 크게)
    renderer.drawRect(
      pos.x - 1, pos.y - 1,
      nodeW + 2, nodeH + 2,
      COLORS.nodeSelected
    );
    // 노드 본체
    renderer.drawRect(
      pos.x, pos.y,
      nodeW, nodeH,
      COLORS.nodeSelected
    );
  }

  // 접힌 서브플로우 렌더링
  if (subflows) {
    for (const subflow of subflows) {
      if (subflow.collapsed && subflow.collapsedPosition && subflow.collapsedSize) {
        const pos = toMinimap(subflow.collapsedPosition.x, subflow.collapsedPosition.y);
        const sfW = Math.max(3, subflow.collapsedSize.width * scale);
        const sfH = Math.max(3, subflow.collapsedSize.height * scale);

        renderer.drawRect(
          pos.x, pos.y,
          sfW, sfH,
          COLORS.subflow
        );
      }
    }
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

  // 노드 바운딩 박스
  const nodeBounds = calculateBoundsMinMax(nodes);
  if (!nodeBounds) {
    // 노드가 없으면 현재 뷰포트 기준
    return { x: viewport.x, y: viewport.y };
  }

  // 현재 뷰포트 영역
  const vpHalfW = canvasSize.width / 2 / viewport.zoom;
  const vpHalfH = canvasSize.height / 2 / viewport.zoom;
  const viewportBounds = {
    minX: viewport.x - vpHalfW,
    minY: viewport.y - vpHalfH,
    maxX: viewport.x + vpHalfW,
    maxY: viewport.y + vpHalfH,
  };

  // 전체 영역 (노드 + 뷰포트) + 패딩 50
  const worldBounds = expandBounds(mergeBounds(nodeBounds, viewportBounds), MINIMAP_WORLD_PADDING);

  const worldW = worldBounds.maxX - worldBounds.minX;
  const worldH = worldBounds.maxY - worldBounds.minY;
  const worldCenter = getBoundsCenter(worldBounds);

  // 스케일
  const scale = Math.min(innerW / worldW, innerH / worldH);

  // 미니맵 → 월드 좌표
  const relX = screenPos.x - (innerX + innerW / 2);
  const relY = screenPos.y - (innerY + innerH / 2);

  return {
    x: worldCenter.x + relX / scale,
    y: worldCenter.y + relY / scale,
  };
}
