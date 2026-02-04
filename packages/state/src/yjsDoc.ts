import * as Y from 'yjs';
import type { FlowNode, FlowEdge, Viewport } from '@flowforge/types';

/**
 * Yjs 문서 구조:
 * - nodes: Y.Map<FlowNode>  (id -> node)
 * - edges: Y.Map<FlowEdge>  (id -> edge)
 * - viewport: Y.Map<number> (x, y, zoom)
 */
export interface FlowYjsDoc {
  doc: Y.Doc;
  nodes: Y.Map<FlowNode>;
  edges: Y.Map<FlowEdge>;
  viewport: Y.Map<number>;
}

export function createFlowDoc(): FlowYjsDoc {
  const doc = new Y.Doc();
  const nodes = doc.getMap<FlowNode>('nodes');
  const edges = doc.getMap<FlowEdge>('edges');
  const viewport = doc.getMap<number>('viewport');

  // 기본 뷰포트 초기화
  if (!viewport.has('x')) {
    doc.transact(() => {
      viewport.set('x', 0);
      viewport.set('y', 0);
      viewport.set('zoom', 1);
    });
  }

  return { doc, nodes, edges, viewport };
}

export function getViewportFromYjs(viewport: Y.Map<number>): Viewport {
  return {
    x: viewport.get('x') ?? 0,
    y: viewport.get('y') ?? 0,
    zoom: viewport.get('zoom') ?? 1,
  };
}

export function setViewportToYjs(viewport: Y.Map<number>, v: Viewport): void {
  viewport.doc?.transact(() => {
    viewport.set('x', v.x);
    viewport.set('y', v.y);
    viewport.set('zoom', v.zoom);
  });
}

export function getNodesFromYjs(nodes: Y.Map<FlowNode>): FlowNode[] {
  return Array.from(nodes.values());
}

export function getEdgesFromYjs(edges: Y.Map<FlowEdge>): FlowEdge[] {
  return Array.from(edges.values());
}
