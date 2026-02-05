import type { FlowNode, FlowEdge, Position, PortDefinition } from '@flowforge/types';
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
