import { create } from 'zustand';
import * as Y from 'yjs';
import type { FlowNode, FlowEdge, Viewport } from '@flowforge/types';
import type { FlowYjsDoc } from './yjsDoc';
import {
  createFlowDoc,
  getViewportFromYjs,
  setViewportToYjs,
  getNodesFromYjs,
  getEdgesFromYjs,
} from './yjsDoc';

export interface FlowState {
  // Yjs 문서
  yjsDoc: FlowYjsDoc;

  // 파생 상태 (Yjs에서 동기화)
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: Viewport;

  // 노드 액션
  addNode: (node: FlowNode) => void;
  updateNode: (id: string, partial: Partial<FlowNode>) => void;
  deleteNode: (id: string) => void;

  // 엣지 액션
  addEdge: (edge: FlowEdge) => void;
  deleteEdge: (id: string) => void;

  // 뷰포트 액션
  setViewport: (viewport: Viewport) => void;
  pan: (dx: number, dy: number) => void;
  zoom: (factor: number, centerX?: number, centerY?: number) => void;

  // Yjs 동기화
  syncFromYjs: () => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const createFlowStore = (initialDoc?: FlowYjsDoc) => {
  const yjsDoc = initialDoc ?? createFlowDoc();

  // UndoManager 생성 (nodes, edges만 추적, viewport는 제외)
  const undoManager = new Y.UndoManager([yjsDoc.nodes, yjsDoc.edges], {
    trackedOrigins: new Set([null]),
  });

  return create<FlowState>((set, get) => {
    // Yjs 변경 감지 및 동기화
    const syncFromYjs = () => {
      const { yjsDoc } = get();
      set({
        nodes: getNodesFromYjs(yjsDoc.nodes),
        edges: getEdgesFromYjs(yjsDoc.edges),
        viewport: getViewportFromYjs(yjsDoc.viewport),
      });
    };

    // Yjs 이벤트 리스너 등록
    yjsDoc.nodes.observe(syncFromYjs);
    yjsDoc.edges.observe(syncFromYjs);
    yjsDoc.viewport.observe(syncFromYjs);

    return {
      yjsDoc,
      nodes: getNodesFromYjs(yjsDoc.nodes),
      edges: getEdgesFromYjs(yjsDoc.edges),
      viewport: getViewportFromYjs(yjsDoc.viewport),

      addNode: (node) => {
        const { yjsDoc } = get();
        yjsDoc.nodes.set(node.id, node);
      },

      updateNode: (id, partial) => {
        const { yjsDoc } = get();
        const existing = yjsDoc.nodes.get(id);
        if (existing) {
          yjsDoc.nodes.set(id, { ...existing, ...partial });
        }
      },

      deleteNode: (id) => {
        const { yjsDoc } = get();
        yjsDoc.nodes.delete(id);
        // 연결된 엣지도 삭제
        yjsDoc.edges.forEach((edge, edgeId) => {
          if (edge.source === id || edge.target === id) {
            yjsDoc.edges.delete(edgeId);
          }
        });
      },

      addEdge: (edge) => {
        const { yjsDoc } = get();
        yjsDoc.edges.set(edge.id, edge);
      },

      deleteEdge: (id) => {
        const { yjsDoc } = get();
        yjsDoc.edges.delete(id);
      },

      setViewport: (viewport) => {
        const { yjsDoc } = get();
        setViewportToYjs(yjsDoc.viewport, viewport);
      },

      pan: (dx, dy) => {
        const { viewport, setViewport } = get();
        setViewport({
          ...viewport,
          x: viewport.x + dx,
          y: viewport.y + dy,
        });
      },

      zoom: (factor, centerX, centerY) => {
        const { viewport, setViewport } = get();
        const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * factor));

        if (centerX !== undefined && centerY !== undefined) {
          // 줌 센터를 기준으로 뷰포트 조정
          const scale = newZoom / viewport.zoom;
          setViewport({
            x: centerX + (viewport.x - centerX) * scale,
            y: centerY + (viewport.y - centerY) * scale,
            zoom: newZoom,
          });
        } else {
          setViewport({ ...viewport, zoom: newZoom });
        }
      },

      syncFromYjs,

      undo: () => {
        undoManager.undo();
      },

      redo: () => {
        undoManager.redo();
      },

      canUndo: () => undoManager.undoStack.length > 0,

      canRedo: () => undoManager.redoStack.length > 0,
    };
  });
};

// 기본 스토어 인스턴스
export type FlowStore = ReturnType<typeof createFlowStore>;
