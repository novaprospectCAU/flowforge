import type { FlowNode, FlowEdge, Position, PortDefinition, Subflow } from '@flowforge/types';
import { calculateCollapsedSize, SUBFLOW_STYLE } from '../rendering/drawSubflow';
import { getPortPosition } from '../rendering/drawEdge';

const NODE_STYLE = {
  headerHeight: 28,
  portRadius: 6,
  portSpacing: 24,
};

export interface PortHitResult {
  node: FlowNode;
  port: PortDefinition;
  isOutput: boolean;
  position: Position;
}

export type ResizeHandle =
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right';

export interface ResizeHitResult {
  node: FlowNode;
  handle: ResizeHandle;
}

/**
 * 월드 좌표에서 노드 찾기 (위에서부터, 즉 나중에 그려진 것 우선)
 */
export function hitTestNode(
  worldPos: Position,
  nodes: FlowNode[]
): FlowNode | null {
  // 역순으로 검사 (위에 있는 노드 우선)
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const { x, y } = node.position;
    const { width, height } = node.size;

    if (
      worldPos.x >= x &&
      worldPos.x <= x + width &&
      worldPos.y >= y &&
      worldPos.y <= y + height
    ) {
      return node;
    }
  }
  return null;
}

/**
 * 월드 좌표에서 포트 찾기
 */
export function hitTestPort(
  worldPos: Position,
  nodes: FlowNode[]
): PortHitResult | null {
  const hitRadius = NODE_STYLE.portRadius + 4; // 클릭 여유

  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const { x, y } = node.position;
    const { width } = node.size;

    // 입력 포트 (왼쪽)
    const inputs = node.inputs || [];
    for (let j = 0; j < inputs.length; j++) {
      const portX = x;
      const portY = y + NODE_STYLE.headerHeight + NODE_STYLE.portSpacing * (j + 0.5);
      const dist = Math.sqrt((worldPos.x - portX) ** 2 + (worldPos.y - portY) ** 2);
      if (dist <= hitRadius) {
        return {
          node,
          port: inputs[j],
          isOutput: false,
          position: { x: portX, y: portY },
        };
      }
    }

    // 출력 포트 (오른쪽)
    const outputs = node.outputs || [];
    for (let j = 0; j < outputs.length; j++) {
      const portX = x + width;
      const portY = y + NODE_STYLE.headerHeight + NODE_STYLE.portSpacing * (j + 0.5);
      const dist = Math.sqrt((worldPos.x - portX) ** 2 + (worldPos.y - portY) ** 2);
      if (dist <= hitRadius) {
        return {
          node,
          port: outputs[j],
          isOutput: true,
          position: { x: portX, y: portY },
        };
      }
    }
  }

  return null;
}

/**
 * 점과 베지어 커브 사이의 거리 (근사치)
 */
function distanceToBezier(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number,
  controlOffset: number
): number {
  // 베지어 커브를 여러 점으로 샘플링하여 최소 거리 계산
  let minDist = Infinity;
  const samples = 20;

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    // 베지어 컨트롤 포인트
    const cx1 = x1 + controlOffset;
    const cy1 = y1;
    const cx2 = x2 - controlOffset;
    const cy2 = y2;

    // 베지어 포인트
    const bx = mt3 * x1 + 3 * mt2 * t * cx1 + 3 * mt * t2 * cx2 + t3 * x2;
    const by = mt3 * y1 + 3 * mt2 * t * cy1 + 3 * mt * t2 * cy2 + t3 * y2;

    const dist = Math.sqrt((px - bx) ** 2 + (py - by) ** 2);
    minDist = Math.min(minDist, dist);
  }

  return minDist;
}

/**
 * 월드 좌표에서 엣지 찾기
 */
/**
 * 선택된 노드의 리사이즈 핸들 히트 테스트
 */
export function hitTestResizeHandle(
  worldPos: Position,
  nodes: FlowNode[],
  selectedIds: Set<string>
): ResizeHitResult | null {
  const handleSize = 8; // 핸들 크기
  const edgeThreshold = 6; // 가장자리 감지 두께

  // 선택된 노드만 검사 (역순)
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (!selectedIds.has(node.id)) continue;

    const { x, y } = node.position;
    const { width, height } = node.size;
    const right = x + width;
    const bottom = y + height;

    // 코너 핸들 체크 (우선순위 높음)
    const corners: { handle: ResizeHandle; cx: number; cy: number }[] = [
      { handle: 'top-left', cx: x, cy: y },
      { handle: 'top-right', cx: right, cy: y },
      { handle: 'bottom-left', cx: x, cy: bottom },
      { handle: 'bottom-right', cx: right, cy: bottom },
    ];

    for (const corner of corners) {
      if (
        Math.abs(worldPos.x - corner.cx) <= handleSize &&
        Math.abs(worldPos.y - corner.cy) <= handleSize
      ) {
        return { node, handle: corner.handle };
      }
    }

    // 가장자리 핸들 체크
    const isInHorizontalRange = worldPos.x >= x + handleSize && worldPos.x <= right - handleSize;
    const isInVerticalRange = worldPos.y >= y + handleSize && worldPos.y <= bottom - handleSize;

    // 상단 가장자리
    if (isInHorizontalRange && Math.abs(worldPos.y - y) <= edgeThreshold) {
      return { node, handle: 'top' };
    }
    // 하단 가장자리
    if (isInHorizontalRange && Math.abs(worldPos.y - bottom) <= edgeThreshold) {
      return { node, handle: 'bottom' };
    }
    // 좌측 가장자리
    if (isInVerticalRange && Math.abs(worldPos.x - x) <= edgeThreshold) {
      return { node, handle: 'left' };
    }
    // 우측 가장자리
    if (isInVerticalRange && Math.abs(worldPos.x - right) <= edgeThreshold) {
      return { node, handle: 'right' };
    }
  }

  return null;
}

export function hitTestEdge(
  worldPos: Position,
  edges: FlowEdge[],
  nodes: FlowNode[]
): FlowEdge | null {
  const hitDistance = 8;

  for (const edge of edges) {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    if (!sourceNode || !targetNode) continue;

    const sourcePos = getPortPosition(sourceNode, edge.sourcePort, true);
    const targetPos = getPortPosition(targetNode, edge.targetPort, false);
    if (!sourcePos || !targetPos) continue;

    const dx = Math.abs(targetPos.x - sourcePos.x);
    const controlOffset = Math.max(50, dx * 0.5);

    const dist = distanceToBezier(
      worldPos.x, worldPos.y,
      sourcePos.x, sourcePos.y,
      targetPos.x, targetPos.y,
      controlOffset
    );

    if (dist <= hitDistance) {
      return edge;
    }
  }

  return null;
}

/**
 * 접힌 서브플로우 히트 테스트
 */
export interface CollapsedSubflowHitResult {
  subflow: Subflow;
  isHeader: boolean;
}

export function hitTestCollapsedSubflow(
  worldPos: Position,
  subflows: Subflow[]
): CollapsedSubflowHitResult | null {
  // 역순으로 검사 (위에 있는 것 우선)
  for (let i = subflows.length - 1; i >= 0; i--) {
    const subflow = subflows[i];
    if (!subflow.collapsed || !subflow.collapsedPosition) continue;

    const { x, y } = subflow.collapsedPosition;
    const size = calculateCollapsedSize(subflow);
    const { width, height } = size;

    if (
      worldPos.x >= x &&
      worldPos.x <= x + width &&
      worldPos.y >= y &&
      worldPos.y <= y + height
    ) {
      const isHeader = worldPos.y <= y + SUBFLOW_STYLE.headerHeight;
      return { subflow, isHeader };
    }
  }

  return null;
}

/**
 * 접힌 서브플로우의 포트 히트 테스트
 */
export interface SubflowPortHitResult {
  subflow: Subflow;
  portId: string;
  isOutput: boolean;
  position: Position;
  dataType: string;
}

export function hitTestSubflowPort(
  worldPos: Position,
  subflows: Subflow[]
): SubflowPortHitResult | null {
  const hitRadius = SUBFLOW_STYLE.portRadius + 4;

  for (let i = subflows.length - 1; i >= 0; i--) {
    const subflow = subflows[i];
    if (!subflow.collapsed || !subflow.collapsedPosition) continue;

    const { x, y } = subflow.collapsedPosition;
    const size = calculateCollapsedSize(subflow);
    const { width } = size;

    // 입력 포트 (왼쪽)
    for (let j = 0; j < subflow.inputMappings.length; j++) {
      const mapping = subflow.inputMappings[j];
      const portX = x;
      const portY = y + SUBFLOW_STYLE.headerHeight + SUBFLOW_STYLE.portSpacing * (j + 0.5);
      const dist = Math.sqrt((worldPos.x - portX) ** 2 + (worldPos.y - portY) ** 2);
      if (dist <= hitRadius) {
        return {
          subflow,
          portId: mapping.exposedPortId,
          isOutput: false,
          position: { x: portX, y: portY },
          dataType: mapping.dataType,
        };
      }
    }

    // 출력 포트 (오른쪽)
    for (let j = 0; j < subflow.outputMappings.length; j++) {
      const mapping = subflow.outputMappings[j];
      const portX = x + width;
      const portY = y + SUBFLOW_STYLE.headerHeight + SUBFLOW_STYLE.portSpacing * (j + 0.5);
      const dist = Math.sqrt((worldPos.x - portX) ** 2 + (worldPos.y - portY) ** 2);
      if (dist <= hitRadius) {
        return {
          subflow,
          portId: mapping.exposedPortId,
          isOutput: true,
          position: { x: portX, y: portY },
          dataType: mapping.dataType,
        };
      }
    }
  }

  return null;
}
