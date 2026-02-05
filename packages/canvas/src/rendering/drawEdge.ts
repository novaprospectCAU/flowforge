import type { IRenderer } from '../renderer/types';
import type { FlowNode, FlowEdge, Color, Position } from '@flowforge/types';
import { NODE_STYLE } from './drawNode';

const EDGE_COLORS = {
  default: { r: 150, g: 150, b: 155, a: 255 } as Color,
  active: { r: 100, g: 180, b: 255, a: 255 } as Color,
};

/**
 * 포트의 월드 좌표 계산
 */
export function getPortPosition(
  node: FlowNode,
  portId: string,
  isOutput: boolean
): Position | null {
  const ports = isOutput ? (node.outputs || []) : (node.inputs || []);
  const portIndex = ports.findIndex(p => p.id === portId);
  if (portIndex === -1) return null;

  const { x, y } = node.position;
  const { width } = node.size;

  return {
    x: isOutput ? x + width : x,
    y: y + NODE_STYLE.headerHeight + NODE_STYLE.portSpacing * (portIndex + 0.5),
  };
}

/**
 * 단일 엣지 렌더링 (베지어 커브)
 */
export function drawEdge(
  renderer: IRenderer,
  edge: FlowEdge,
  nodes: FlowNode[],
  active: boolean = false
): void {
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);
  if (!sourceNode || !targetNode) return;

  const sourcePos = getPortPosition(sourceNode, edge.sourcePort, true);
  const targetPos = getPortPosition(targetNode, edge.targetPort, false);
  if (!sourcePos || !targetPos) return;

  // 베지어 커브 컨트롤 포인트
  const dx = Math.abs(targetPos.x - sourcePos.x);
  const controlOffset = Math.max(50, dx * 0.5);

  renderer.drawBezier(
    {
      x1: sourcePos.x,
      y1: sourcePos.y,
      cx1: sourcePos.x + controlOffset,
      cy1: sourcePos.y,
      cx2: targetPos.x - controlOffset,
      cy2: targetPos.y,
      x2: targetPos.x,
      y2: targetPos.y,
    },
    active ? EDGE_COLORS.active : EDGE_COLORS.default,
    2
  );
}

/**
 * 여러 엣지 렌더링
 */
export function drawEdges(
  renderer: IRenderer,
  edges: FlowEdge[],
  nodes: FlowNode[]
): void {
  for (const edge of edges) {
    drawEdge(renderer, edge, nodes);
  }
}

/**
 * 드래그 중인 임시 엣지 렌더링
 */
export function drawTempEdge(
  renderer: IRenderer,
  startPos: Position,
  endPos: Position,
  isFromOutput: boolean
): void {
  const dx = Math.abs(endPos.x - startPos.x);
  const controlOffset = Math.max(50, dx * 0.5);

  const points = isFromOutput
    ? {
        x1: startPos.x,
        y1: startPos.y,
        cx1: startPos.x + controlOffset,
        cy1: startPos.y,
        cx2: endPos.x - controlOffset,
        cy2: endPos.y,
        x2: endPos.x,
        y2: endPos.y,
      }
    : {
        x1: endPos.x,
        y1: endPos.y,
        cx1: endPos.x + controlOffset,
        cy1: endPos.y,
        cx2: startPos.x - controlOffset,
        cy2: startPos.y,
        x2: startPos.x,
        y2: startPos.y,
      };

  renderer.drawBezier(points, EDGE_COLORS.active, 2);
}
