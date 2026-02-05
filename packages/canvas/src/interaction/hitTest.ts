import type { FlowNode, Position } from '@flowforge/types';

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
