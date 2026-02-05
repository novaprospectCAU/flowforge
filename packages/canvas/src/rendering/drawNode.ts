import type { IRenderer } from '../renderer/types';
import type { FlowNode, Color, ExecutionStatus, DataType } from '@flowforge/types';

// 노드 스타일 상수
const NODE_COLORS = {
  background: { r: 45, g: 45, b: 48, a: 255 } as Color,
  header: { r: 80, g: 80, b: 85, a: 255 } as Color,
  border: { r: 100, g: 100, b: 105, a: 255 } as Color,
  selected: { r: 66, g: 135, b: 245, a: 255 } as Color,
  text: { r: 255, g: 255, b: 255, a: 255 } as Color,
  portLabel: { r: 180, g: 180, b: 185, a: 255 } as Color,  // 포트 라벨 (회색)
  port: { r: 160, g: 160, b: 165, a: 255 } as Color,
  portHover: { r: 100, g: 180, b: 255, a: 255 } as Color,
  portCompatible: { r: 72, g: 199, b: 142, a: 255 } as Color,  // 연결 가능 (초록)
  portIncompatible: { r: 100, g: 100, b: 105, a: 100 } as Color,  // 연결 불가 (어두움)
  // 실행 상태 색상
  running: { r: 255, g: 193, b: 7, a: 255 } as Color,   // 노란색
  success: { r: 40, g: 167, b: 69, a: 255 } as Color,   // 초록색
  error: { r: 220, g: 53, b: 69, a: 255 } as Color,     // 빨간색
};

// 데이터 타입별 포트 색상
const PORT_TYPE_COLORS: Record<DataType, Color> = {
  image: { r: 100, g: 149, b: 237, a: 255 },   // 파랑 (Cornflower Blue)
  number: { r: 144, g: 238, b: 144, a: 255 },  // 연두 (Light Green)
  string: { r: 255, g: 182, b: 108, a: 255 },  // 주황 (Peach)
  boolean: { r: 255, g: 105, b: 180, a: 255 }, // 분홍 (Hot Pink)
  array: { r: 186, g: 85, b: 211, a: 255 },    // 보라 (Medium Orchid)
  object: { r: 64, g: 224, b: 208, a: 255 },   // 청록 (Turquoise)
  any: { r: 160, g: 160, b: 165, a: 255 },     // 회색 (기본)
};

/**
 * 데이터 타입에 따른 포트 색상 반환
 */
function getPortColorByType(dataType: DataType): Color {
  return PORT_TYPE_COLORS[dataType] || PORT_TYPE_COLORS.any;
}

// 연결 가능한 포트 정보
export interface CompatiblePorts {
  nodeId: string;
  portIds: Set<string>;
  isOutput: boolean;
}

export const NODE_STYLE = {
  borderRadius: 8,
  headerHeight: 28,
  padding: 12,
  fontSize: 13,
  portRadius: 6,
  portSpacing: 24,
  portLabelFontSize: 10,
  portLabelOffset: 12, // 포트에서 라벨까지의 거리
};

/**
 * 단일 노드 렌더링
 */
export function drawNode(
  renderer: IRenderer,
  node: FlowNode,
  selected: boolean = false,
  execStatus?: ExecutionStatus,
  compatiblePorts?: CompatiblePorts | null,
  hoveredPortId?: string | null
): void {
  const { x, y } = node.position;
  const { width, height } = node.size;
  const title = (node.data.title as string) || node.type;

  // 0. 실행 상태 또는 선택 테두리
  const border = 3;
  let borderColor: Color | null = null;

  if (execStatus === 'running') {
    borderColor = NODE_COLORS.running;
  } else if (execStatus === 'success') {
    borderColor = NODE_COLORS.success;
  } else if (execStatus === 'error') {
    borderColor = NODE_COLORS.error;
  } else if (selected) {
    borderColor = NODE_COLORS.selected;
  }

  if (borderColor) {
    renderer.drawRoundedRect(
      x - border, y - border,
      width + border * 2, height + border * 2,
      NODE_STYLE.borderRadius + border,
      borderColor
    );
  }

  // 1. 노드 배경 (rounded rect)
  renderer.drawRoundedRect(
    x, y, width, height,
    NODE_STYLE.borderRadius,
    NODE_COLORS.background
  );

  // 2. 헤더 영역
  renderer.drawRoundedRect(
    x, y, width, NODE_STYLE.headerHeight,
    NODE_STYLE.borderRadius,
    NODE_COLORS.header
  );

  // 3. 헤더 아래 부분 채우기 (모서리 겹침 방지)
  renderer.drawRect(
    x, y + NODE_STYLE.headerHeight - NODE_STYLE.borderRadius,
    width, NODE_STYLE.borderRadius,
    NODE_COLORS.header
  );

  // 4. 타이틀 텍스트
  renderer.drawText(
    title,
    x + NODE_STYLE.padding,
    y + (NODE_STYLE.headerHeight - NODE_STYLE.fontSize) / 2,
    NODE_COLORS.text,
    NODE_STYLE.fontSize
  );

  // 연결 중인 경우 호환성 체크
  const isConnecting = compatiblePorts !== undefined && compatiblePorts !== null;
  const isCompatibleNode = isConnecting && compatiblePorts.nodeId === node.id;

  // 5. 입력 포트 (왼쪽)
  const inputs = node.inputs || [];
  for (let i = 0; i < inputs.length; i++) {
    const port = inputs[i];
    const portY = y + NODE_STYLE.headerHeight + NODE_STYLE.portSpacing * (i + 0.5);

    // 기본 색상: 데이터 타입 기반
    let portColor = getPortColorByType(port.dataType);

    if (isConnecting) {
      // 연결 중일 때: 출력 포트에서 드래그 중이면 입력 포트만 표시
      if (!compatiblePorts.isOutput) {
        // 입력에서 드래그 중이면 입력 포트는 흐리게
        portColor = NODE_COLORS.portIncompatible;
      } else if (isCompatibleNode && compatiblePorts.portIds.has(port.id)) {
        // 호환 가능한 입력 포트 - 밝게 강조
        portColor = NODE_COLORS.portCompatible;
      } else if (isCompatibleNode) {
        // 같은 노드의 비호환 포트
        portColor = NODE_COLORS.portIncompatible;
      }
    }

    // 호버 상태
    if (hoveredPortId === port.id) {
      portColor = NODE_COLORS.portHover;
    }

    renderer.drawCircle(x, portY, NODE_STYLE.portRadius, portColor);

    // 포트 라벨 (포트 오른쪽에 표시) - 데이터 타입 색상 사용
    renderer.drawText(
      port.name,
      x + NODE_STYLE.portLabelOffset,
      portY - NODE_STYLE.portLabelFontSize / 2,
      getPortColorByType(port.dataType),
      NODE_STYLE.portLabelFontSize
    );
  }

  // 6. 출력 포트 (오른쪽)
  const outputs = node.outputs || [];
  for (let i = 0; i < outputs.length; i++) {
    const port = outputs[i];
    const portY = y + NODE_STYLE.headerHeight + NODE_STYLE.portSpacing * (i + 0.5);

    // 기본 색상: 데이터 타입 기반
    let portColor = getPortColorByType(port.dataType);

    if (isConnecting) {
      // 연결 중일 때: 입력 포트에서 드래그 중이면 출력 포트만 표시
      if (compatiblePorts.isOutput) {
        // 출력에서 드래그 중이면 출력 포트는 흐리게
        portColor = NODE_COLORS.portIncompatible;
      } else if (isCompatibleNode && compatiblePorts.portIds.has(port.id)) {
        // 호환 가능한 출력 포트 - 밝게 강조
        portColor = NODE_COLORS.portCompatible;
      } else if (isCompatibleNode) {
        // 같은 노드의 비호환 포트
        portColor = NODE_COLORS.portIncompatible;
      }
    }

    // 호버 상태
    if (hoveredPortId === port.id) {
      portColor = NODE_COLORS.portHover;
    }

    renderer.drawCircle(x + width, portY, NODE_STYLE.portRadius, portColor);

    // 포트 라벨 (포트 왼쪽에 표시, 오른쪽 정렬) - 데이터 타입 색상 사용
    renderer.drawText(
      port.name,
      x + width - NODE_STYLE.portLabelOffset,
      portY - NODE_STYLE.portLabelFontSize / 2,
      getPortColorByType(port.dataType),
      NODE_STYLE.portLabelFontSize,
      'right'
    );
  }
}

/**
 * 여러 노드 렌더링
 */
export function drawNodes(
  renderer: IRenderer,
  nodes: FlowNode[],
  selectedIds: Set<string> = new Set(),
  nodeExecStates?: Map<string, ExecutionStatus>,
  compatiblePortsMap?: Map<string, CompatiblePorts> | null,
  hoveredPortInfo?: { nodeId: string; portId: string } | null
): void {
  for (const node of nodes) {
    const execStatus = nodeExecStates?.get(node.id);
    const compatiblePorts = compatiblePortsMap?.get(node.id) || null;
    const hoveredPortId = hoveredPortInfo?.nodeId === node.id ? hoveredPortInfo.portId : null;
    drawNode(renderer, node, selectedIds.has(node.id), execStatus, compatiblePorts, hoveredPortId);
  }
}
