import type { IRenderer } from '../renderer/types';
import type { Color, Position } from '@flowforge/types';

const SELECTION_COLORS = {
  fill: { r: 66, g: 135, b: 245, a: 30 } as Color,
  stroke: { r: 66, g: 135, b: 245, a: 200 } as Color,
};

/**
 * 선택 박스 렌더링
 */
export function drawSelectionBox(
  renderer: IRenderer,
  start: Position,
  end: Position
): void {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  // 채우기
  renderer.drawRect(x, y, width, height, SELECTION_COLORS.fill);

  // 테두리 (4개의 선)
  const strokeWidth = 1;
  renderer.drawRect(x, y, width, strokeWidth, SELECTION_COLORS.stroke); // 상단
  renderer.drawRect(x, y + height - strokeWidth, width, strokeWidth, SELECTION_COLORS.stroke); // 하단
  renderer.drawRect(x, y, strokeWidth, height, SELECTION_COLORS.stroke); // 좌측
  renderer.drawRect(x + width - strokeWidth, y, strokeWidth, height, SELECTION_COLORS.stroke); // 우측
}

/**
 * 선택 박스와 노드의 교차 여부 확인
 */
export function isNodeInSelectionBox(
  nodePos: Position,
  nodeWidth: number,
  nodeHeight: number,
  boxStart: Position,
  boxEnd: Position
): boolean {
  const boxX = Math.min(boxStart.x, boxEnd.x);
  const boxY = Math.min(boxStart.y, boxEnd.y);
  const boxWidth = Math.abs(boxEnd.x - boxStart.x);
  const boxHeight = Math.abs(boxEnd.y - boxStart.y);

  // AABB 충돌 검사
  return !(
    nodePos.x + nodeWidth < boxX ||
    nodePos.x > boxX + boxWidth ||
    nodePos.y + nodeHeight < boxY ||
    nodePos.y > boxY + boxHeight
  );
}
