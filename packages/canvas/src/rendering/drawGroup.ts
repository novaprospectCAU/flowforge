import type { IRenderer } from '../renderer/types';
import type { FlowNode, NodeGroup, Color, Position } from '@flowforge/types';
import { hexToColor } from '../theme/colors';
import { getCanvasTheme } from '../theme/canvasTheme';
import { calculateBoundsMinMax } from '../utils/bounds';

const GROUP_STYLE = {
  padding: 20,
  headerHeight: 28,
  borderRadius: 8,
  titleFontSize: 12,
};

/**
 * 그룹의 바운딩 박스 계산
 */
export function getGroupBounds(
  group: NodeGroup,
  nodes: FlowNode[]
): { x: number; y: number; width: number; height: number } | null {
  const groupNodes = nodes.filter(n => group.nodeIds.includes(n.id));
  const bounds = calculateBoundsMinMax(groupNodes);
  if (!bounds) return null;

  return {
    x: bounds.minX - GROUP_STYLE.padding,
    y: bounds.minY - GROUP_STYLE.padding - GROUP_STYLE.headerHeight,
    width: bounds.maxX - bounds.minX + GROUP_STYLE.padding * 2,
    height: bounds.maxY - bounds.minY + GROUP_STYLE.padding * 2 + GROUP_STYLE.headerHeight,
  };
}

// 그룹 기본 색상
const DEFAULT_GROUP_COLOR: Color = { r: 74, g: 85, b: 104, a: 255 };

/**
 * 단일 그룹 렌더링
 */
export function drawGroup(
  renderer: IRenderer,
  group: NodeGroup,
  nodes: FlowNode[],
  isSelected: boolean = false
): void {
  const bounds = getGroupBounds(group, nodes);
  if (!bounds) return;

  const baseColor = hexToColor(group.color ?? '#4a5568', 255, DEFAULT_GROUP_COLOR);

  // 그룹 배경 (반투명)
  const bgColor: Color = { ...baseColor, a: 30 };
  renderer.drawRoundedRect(
    bounds.x, bounds.y,
    bounds.width, bounds.height,
    GROUP_STYLE.borderRadius,
    bgColor
  );

  // 그룹 테두리
  const borderColor: Color = isSelected
    ? { r: 59, g: 130, b: 246, a: 255 } // 선택 시 파란색
    : { ...baseColor, a: 150 };

  const borderWidth = isSelected ? 2 : 1;

  // 테두리 그리기 (4개의 선)
  const { x, y, width, height } = bounds;
  renderer.drawLine(x, y + GROUP_STYLE.borderRadius, x, y + height - GROUP_STYLE.borderRadius, borderColor, borderWidth);
  renderer.drawLine(x + GROUP_STYLE.borderRadius, y, x + width - GROUP_STYLE.borderRadius, y, borderColor, borderWidth);
  renderer.drawLine(x + width, y + GROUP_STYLE.borderRadius, x + width, y + height - GROUP_STYLE.borderRadius, borderColor, borderWidth);
  renderer.drawLine(x + GROUP_STYLE.borderRadius, y + height, x + width - GROUP_STYLE.borderRadius, y + height, borderColor, borderWidth);

  // 헤더 배경
  const headerColor: Color = { ...baseColor, a: 80 };
  renderer.drawRoundedRect(
    bounds.x, bounds.y,
    bounds.width, GROUP_STYLE.headerHeight,
    GROUP_STYLE.borderRadius,
    headerColor
  );

  // 그룹 이름
  renderer.drawText(
    group.name,
    bounds.x + 12,
    bounds.y + GROUP_STYLE.headerHeight / 2 + 4,
    getCanvasTheme().groupText,
    GROUP_STYLE.titleFontSize
  );
}

/**
 * 모든 그룹 렌더링
 */
export function drawGroups(
  renderer: IRenderer,
  groups: NodeGroup[],
  nodes: FlowNode[],
  selectedGroupId?: string
): void {
  for (const group of groups) {
    drawGroup(renderer, group, nodes, group.id === selectedGroupId);
  }
}

/**
 * 월드 좌표가 그룹 헤더 영역 내에 있는지 확인
 */
export function hitTestGroupHeader(
  worldPos: Position,
  group: NodeGroup,
  nodes: FlowNode[]
): boolean {
  const bounds = getGroupBounds(group, nodes);
  if (!bounds) return false;

  return (
    worldPos.x >= bounds.x &&
    worldPos.x <= bounds.x + bounds.width &&
    worldPos.y >= bounds.y &&
    worldPos.y <= bounds.y + GROUP_STYLE.headerHeight
  );
}

/**
 * 그룹 헤더 히트 테스트
 */
export function hitTestGroups(
  worldPos: Position,
  groups: NodeGroup[],
  nodes: FlowNode[]
): NodeGroup | null {
  // 역순으로 검사 (위에 그려진 것 우선)
  for (let i = groups.length - 1; i >= 0; i--) {
    if (hitTestGroupHeader(worldPos, groups[i], nodes)) {
      return groups[i];
    }
  }
  return null;
}
