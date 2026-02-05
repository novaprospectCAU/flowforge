import type { IRenderer } from '../renderer/types';
import type { FlowNode, FlowEdge, Color, Position } from '@flowforge/types';
import { NODE_STYLE } from './drawNode';

export type EdgeStyle = 'bezier' | 'straight' | 'step';

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
 * 베지어 커브로 엣지 그리기
 */
function drawBezierEdge(
  renderer: IRenderer,
  sourcePos: Position,
  targetPos: Position,
  color: Color
): void {
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
    color,
    2
  );
}

/**
 * 직선으로 엣지 그리기
 */
function drawStraightEdge(
  renderer: IRenderer,
  sourcePos: Position,
  targetPos: Position,
  color: Color
): void {
  renderer.drawLine(sourcePos.x, sourcePos.y, targetPos.x, targetPos.y, color, 2);
}

/**
 * 직각(Step)으로 엣지 그리기
 */
function drawStepEdge(
  renderer: IRenderer,
  sourcePos: Position,
  targetPos: Position,
  color: Color
): void {
  const midX = (sourcePos.x + targetPos.x) / 2;

  // 수평 -> 수직 -> 수평 경로
  renderer.drawLine(sourcePos.x, sourcePos.y, midX, sourcePos.y, color, 2);
  renderer.drawLine(midX, sourcePos.y, midX, targetPos.y, color, 2);
  renderer.drawLine(midX, targetPos.y, targetPos.x, targetPos.y, color, 2);
}

/**
 * 단일 엣지 렌더링
 */
export function drawEdge(
  renderer: IRenderer,
  edge: FlowEdge,
  nodes: FlowNode[],
  active: boolean = false,
  style: EdgeStyle = 'bezier'
): void {
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);
  if (!sourceNode || !targetNode) return;

  const sourcePos = getPortPosition(sourceNode, edge.sourcePort, true);
  const targetPos = getPortPosition(targetNode, edge.targetPort, false);
  if (!sourcePos || !targetPos) return;

  const color = active ? EDGE_COLORS.active : EDGE_COLORS.default;

  switch (style) {
    case 'straight':
      drawStraightEdge(renderer, sourcePos, targetPos, color);
      break;
    case 'step':
      drawStepEdge(renderer, sourcePos, targetPos, color);
      break;
    case 'bezier':
    default:
      drawBezierEdge(renderer, sourcePos, targetPos, color);
      break;
  }
}

/**
 * 여러 엣지 렌더링
 */
export function drawEdges(
  renderer: IRenderer,
  edges: FlowEdge[],
  nodes: FlowNode[],
  style: EdgeStyle = 'bezier'
): void {
  for (const edge of edges) {
    drawEdge(renderer, edge, nodes, false, style);
  }
}

/**
 * 드래그 중인 임시 엣지 렌더링
 */
export function drawTempEdge(
  renderer: IRenderer,
  startPos: Position,
  endPos: Position,
  isFromOutput: boolean,
  style: EdgeStyle = 'bezier'
): void {
  const sourcePos = isFromOutput ? startPos : endPos;
  const targetPos = isFromOutput ? endPos : startPos;

  switch (style) {
    case 'straight':
      drawStraightEdge(renderer, sourcePos, targetPos, EDGE_COLORS.active);
      break;
    case 'step':
      drawStepEdge(renderer, sourcePos, targetPos, EDGE_COLORS.active);
      break;
    case 'bezier':
    default:
      drawBezierEdge(renderer, sourcePos, targetPos, EDGE_COLORS.active);
      break;
  }
}
