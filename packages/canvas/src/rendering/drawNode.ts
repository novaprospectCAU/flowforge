import type { IRenderer } from '../renderer/types';
import type { FlowNode, Color } from '@flowforge/types';

// 노드 스타일 상수
const NODE_COLORS = {
  background: { r: 45, g: 45, b: 48, a: 255 } as Color,
  header: { r: 80, g: 80, b: 85, a: 255 } as Color,
  border: { r: 100, g: 100, b: 105, a: 255 } as Color,
  text: { r: 255, g: 255, b: 255, a: 255 } as Color,
};

const NODE_STYLE = {
  borderRadius: 8,
  headerHeight: 28,
  padding: 12,
  fontSize: 13,
};

/**
 * 단일 노드 렌더링
 */
export function drawNode(renderer: IRenderer, node: FlowNode): void {
  const { x, y } = node.position;
  const { width, height } = node.size;
  const title = (node.data.title as string) || node.type;

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
}

/**
 * 여러 노드 렌더링
 */
export function drawNodes(renderer: IRenderer, nodes: FlowNode[]): void {
  for (const node of nodes) {
    drawNode(renderer, node);
  }
}
