import type { IRenderer } from '../renderer/types';
import type { FlowNode, Subflow, Color, Position } from '@flowforge/types';
import { getDataTypeColor, hexToColor } from '../theme/colors';

// 서브플로우 스타일 상수
export const SUBFLOW_STYLE = {
  padding: 24,
  headerHeight: 28,
  borderRadius: 8,
  titleFontSize: 13,
  portRadius: 6,
  portSpacing: 24,
  portLabelFontSize: 10,
  portLabelOffset: 12,
  iconSize: 16,
  collapsedWidth: 180,      // 접힌 상태 기본 너비
  collapsedPaddingBottom: 12, // 접힌 상태 하단 패딩
};

const SUBFLOW_COLORS = {
  background: { r: 45, g: 55, b: 72, a: 255 } as Color,      // 어두운 파란색 배경
  header: { r: 59, g: 130, b: 246, a: 255 } as Color,        // 파란색 헤더
  headerText: { r: 255, g: 255, b: 255, a: 255 } as Color,
  border: { r: 59, g: 130, b: 246, a: 150 } as Color,
  borderSelected: { r: 255, g: 255, b: 255, a: 255 } as Color,
  expandedBorder: { r: 59, g: 130, b: 246, a: 100 } as Color, // 펼쳐진 상태 점선용
  expandedBg: { r: 59, g: 130, b: 246, a: 20 } as Color,
  port: { r: 160, g: 160, b: 165, a: 255 } as Color,
  portLabel: { r: 180, g: 180, b: 185, a: 255 } as Color,
};


/**
 * 서브플로우의 확장된 바운딩 박스 계산 (내부 노드 기반)
 */
export function getSubflowBounds(
  subflow: Subflow,
  nodes: FlowNode[]
): { x: number; y: number; width: number; height: number } | null {
  const subflowNodes = nodes.filter(n => subflow.nodeIds.includes(n.id));
  if (subflowNodes.length === 0) return null;

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const node of subflowNodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + node.size.width);
    maxY = Math.max(maxY, node.position.y + node.size.height);
  }

  return {
    x: minX - SUBFLOW_STYLE.padding,
    y: minY - SUBFLOW_STYLE.padding - SUBFLOW_STYLE.headerHeight,
    width: maxX - minX + SUBFLOW_STYLE.padding * 2,
    height: maxY - minY + SUBFLOW_STYLE.padding * 2 + SUBFLOW_STYLE.headerHeight,
  };
}

/**
 * 접힌 서브플로우의 크기 계산
 */
export function calculateCollapsedSize(subflow: Subflow): { width: number; height: number } {
  if (subflow.collapsedSize) {
    return subflow.collapsedSize;
  }
  const portCount = Math.max(subflow.inputMappings.length, subflow.outputMappings.length, 1);
  return {
    width: SUBFLOW_STYLE.collapsedWidth,
    height: SUBFLOW_STYLE.headerHeight + portCount * SUBFLOW_STYLE.portSpacing + SUBFLOW_STYLE.collapsedPaddingBottom,
  };
}

/**
 * 접힌 서브플로우의 포트 위치 계산
 */
export function getCollapsedSubflowPortPosition(
  subflow: Subflow,
  portId: string,
  isOutput: boolean
): Position | null {
  if (!subflow.collapsed || !subflow.collapsedPosition) return null;

  const mappings = isOutput ? subflow.outputMappings : subflow.inputMappings;
  const index = mappings.findIndex(m => m.exposedPortId === portId);
  if (index === -1) return null;

  const size = calculateCollapsedSize(subflow);
  const { x, y } = subflow.collapsedPosition;

  return {
    x: isOutput ? x + size.width : x,
    y: y + SUBFLOW_STYLE.headerHeight + SUBFLOW_STYLE.portSpacing * (index + 0.5),
  };
}

/**
 * 접힌 서브플로우 렌더링 (노드처럼)
 */
export function drawCollapsedSubflow(
  renderer: IRenderer,
  subflow: Subflow,
  isSelected: boolean = false
): void {
  if (!subflow.collapsed || !subflow.collapsedPosition) return;

  const { x, y } = subflow.collapsedPosition;
  const size = calculateCollapsedSize(subflow);
  const { width, height } = size;
  const headerColor = hexToColor(subflow.color, 255, SUBFLOW_COLORS.header);

  // 선택 테두리
  if (isSelected) {
    const border = 3;
    renderer.drawRoundedRect(
      x - border, y - border,
      width + border * 2, height + border * 2,
      SUBFLOW_STYLE.borderRadius + border,
      SUBFLOW_COLORS.borderSelected
    );
  }

  // 배경
  renderer.drawRoundedRect(
    x, y, width, height,
    SUBFLOW_STYLE.borderRadius,
    SUBFLOW_COLORS.background
  );

  // 헤더
  renderer.drawRoundedRect(
    x, y, width, SUBFLOW_STYLE.headerHeight,
    SUBFLOW_STYLE.borderRadius,
    headerColor
  );

  // 헤더 아래 부분 채우기
  renderer.drawRect(
    x, y + SUBFLOW_STYLE.headerHeight - SUBFLOW_STYLE.borderRadius,
    width, SUBFLOW_STYLE.borderRadius,
    headerColor
  );

  // 육각형 아이콘 (서브플로우 구분용)
  const iconX = x + 10;
  const iconY = y + SUBFLOW_STYLE.headerHeight / 2;
  // 간단한 육각형 대신 작은 사각형으로 표시
  renderer.drawRect(
    iconX - 3, iconY - 3,
    6, 6,
    { r: 255, g: 255, b: 255, a: 200 }
  );

  // 타이틀
  renderer.drawText(
    subflow.name,
    x + 22,
    y + (SUBFLOW_STYLE.headerHeight - SUBFLOW_STYLE.titleFontSize) / 2,
    SUBFLOW_COLORS.headerText,
    SUBFLOW_STYLE.titleFontSize
  );

  // 입력 포트 (왼쪽)
  for (let i = 0; i < subflow.inputMappings.length; i++) {
    const mapping = subflow.inputMappings[i];
    const portY = y + SUBFLOW_STYLE.headerHeight + SUBFLOW_STYLE.portSpacing * (i + 0.5);
    const portColor = getDataTypeColor(mapping.dataType);

    renderer.drawCircle(x, portY, SUBFLOW_STYLE.portRadius, portColor);
    renderer.drawText(
      mapping.exposedPortName,
      x + SUBFLOW_STYLE.portLabelOffset,
      portY - SUBFLOW_STYLE.portLabelFontSize / 2,
      portColor,
      SUBFLOW_STYLE.portLabelFontSize
    );
  }

  // 출력 포트 (오른쪽)
  for (let i = 0; i < subflow.outputMappings.length; i++) {
    const mapping = subflow.outputMappings[i];
    const portY = y + SUBFLOW_STYLE.headerHeight + SUBFLOW_STYLE.portSpacing * (i + 0.5);
    const portColor = getDataTypeColor(mapping.dataType);

    renderer.drawCircle(x + width, portY, SUBFLOW_STYLE.portRadius, portColor);
    renderer.drawText(
      mapping.exposedPortName,
      x + width - SUBFLOW_STYLE.portLabelOffset,
      portY - SUBFLOW_STYLE.portLabelFontSize / 2,
      portColor,
      SUBFLOW_STYLE.portLabelFontSize,
      'right'
    );
  }
}

/**
 * 펼쳐진 서브플로우 렌더링 (점선 테두리로 그룹과 구분)
 */
export function drawExpandedSubflow(
  renderer: IRenderer,
  subflow: Subflow,
  nodes: FlowNode[],
  isSelected: boolean = false
): void {
  if (subflow.collapsed) return;

  const bounds = getSubflowBounds(subflow, nodes);
  if (!bounds) return;

  const headerColor = hexToColor(subflow.color, 80, SUBFLOW_COLORS.header);
  const bgColor: Color = { ...hexToColor(subflow.color, 255, SUBFLOW_COLORS.header), a: 20 };

  // 배경 (반투명)
  renderer.drawRoundedRect(
    bounds.x, bounds.y,
    bounds.width, bounds.height,
    SUBFLOW_STYLE.borderRadius,
    bgColor
  );

  // 테두리 (점선 대신 실선으로 - 점선은 복잡하므로)
  const borderColor = isSelected
    ? SUBFLOW_COLORS.borderSelected
    : { ...hexToColor(subflow.color, 255, SUBFLOW_COLORS.header), a: 150 };
  const borderWidth = isSelected ? 2 : 1;

  // 상/하/좌/우 테두리
  const { x, y, width, height } = bounds;
  const r = SUBFLOW_STYLE.borderRadius;
  renderer.drawLine(x, y + r, x, y + height - r, borderColor, borderWidth);
  renderer.drawLine(x + r, y, x + width - r, y, borderColor, borderWidth);
  renderer.drawLine(x + width, y + r, x + width, y + height - r, borderColor, borderWidth);
  renderer.drawLine(x + r, y + height, x + width - r, y + height, borderColor, borderWidth);

  // 헤더 배경
  renderer.drawRoundedRect(
    bounds.x, bounds.y,
    bounds.width, SUBFLOW_STYLE.headerHeight,
    SUBFLOW_STYLE.borderRadius,
    headerColor
  );

  // 육각형 아이콘
  const iconX = bounds.x + 10;
  const iconY = bounds.y + SUBFLOW_STYLE.headerHeight / 2;
  renderer.drawRect(
    iconX - 3, iconY - 3,
    6, 6,
    { r: 255, g: 255, b: 255, a: 200 }
  );

  // 서브플로우 이름
  renderer.drawText(
    subflow.name,
    bounds.x + 22,
    bounds.y + SUBFLOW_STYLE.headerHeight / 2 + 4,
    { r: 255, g: 255, b: 255, a: 230 },
    SUBFLOW_STYLE.titleFontSize
  );
}

/**
 * 모든 서브플로우 렌더링
 */
export function drawSubflows(
  renderer: IRenderer,
  subflows: Subflow[],
  nodes: FlowNode[],
  selectedSubflowId?: string
): void {
  for (const subflow of subflows) {
    const isSelected = subflow.id === selectedSubflowId;
    if (subflow.collapsed) {
      drawCollapsedSubflow(renderer, subflow, isSelected);
    } else {
      drawExpandedSubflow(renderer, subflow, nodes, isSelected);
    }
  }
}

/**
 * 서브플로우 헤더 히트 테스트 (펼쳐진 상태)
 */
export function hitTestSubflowHeader(
  worldPos: Position,
  subflow: Subflow,
  nodes: FlowNode[]
): boolean {
  if (subflow.collapsed) return false;

  const bounds = getSubflowBounds(subflow, nodes);
  if (!bounds) return false;

  return (
    worldPos.x >= bounds.x &&
    worldPos.x <= bounds.x + bounds.width &&
    worldPos.y >= bounds.y &&
    worldPos.y <= bounds.y + SUBFLOW_STYLE.headerHeight
  );
}
