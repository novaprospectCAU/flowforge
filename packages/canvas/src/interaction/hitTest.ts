import type { FlowNode, Position, PortDefinition } from '@flowforge/types';

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
