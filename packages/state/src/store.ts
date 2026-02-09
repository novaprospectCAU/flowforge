import { create } from 'zustand';
import * as Y from 'yjs';
import type { FlowNode, FlowEdge, Viewport, NodeGroup, Comment, Subflow, SubflowPortMapping } from '@flowforge/types';
import type { FlowYjsDoc } from './yjsDoc';
import { DEFAULT_COLORS, SUBFLOW_LAYOUT } from './nodeTypes';
import { generateId } from './utils';
import {
  createFlowDoc,
  getViewportFromYjs,
  setViewportToYjs,
  getNodesFromYjs,
  getEdgesFromYjs,
  getGroupsFromYjs,
  getCommentsFromYjs,
  getSubflowsFromYjs,
} from './yjsDoc';

export interface FlowState {
  // Yjs 문서
  yjsDoc: FlowYjsDoc;

  // 파생 상태 (Yjs에서 동기화)
  nodes: FlowNode[];
  edges: FlowEdge[];
  groups: NodeGroup[];
  comments: Comment[];
  subflows: Subflow[];
  viewport: Viewport;

  // 노드 액션
  addNode: (node: FlowNode) => void;
  updateNode: (id: string, partial: Partial<FlowNode>) => void;
  deleteNode: (id: string) => void;

  // 엣지 액션
  addEdge: (edge: FlowEdge) => void;
  deleteEdge: (id: string) => void;

  // 그룹 액션
  createGroup: (name: string, nodeIds: string[], color?: string) => string;
  deleteGroup: (id: string) => void;
  updateGroup: (id: string, partial: Partial<NodeGroup>) => void;
  addNodesToGroup: (groupId: string, nodeIds: string[]) => void;
  removeNodesFromGroup: (groupId: string, nodeIds: string[]) => void;
  getGroupForNode: (nodeId: string) => NodeGroup | undefined;

  // 코멘트 액션
  addComment: (comment: Comment) => void;
  updateComment: (id: string, partial: Partial<Comment>) => void;
  deleteComment: (id: string) => void;

  // 서브플로우 액션
  createSubflow: (name: string, nodeIds: string[]) => string | null;
  deleteSubflow: (id: string) => void;
  updateSubflow: (id: string, partial: Partial<Subflow>) => void;
  collapseSubflow: (id: string) => void;
  expandSubflow: (id: string) => void;
  getSubflowForNode: (nodeId: string) => Subflow | undefined;

  // 뷰포트 액션
  setViewport: (viewport: Viewport) => void;
  pan: (dx: number, dy: number) => void;
  zoom: (factor: number, centerX?: number, centerY?: number) => void;

  // Yjs 동기화
  syncFromYjs: () => void;

  // 플로우 관리
  clearFlow: () => void;
  loadFlow: (nodes: FlowNode[], edges: FlowEdge[], groups: NodeGroup[], viewport: Viewport, comments?: Comment[], subflows?: Subflow[]) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getUndoStackLength: () => number;
  getRedoStackLength: () => number;
  undoToIndex: (index: number) => void;
  redoToIndex: (index: number) => void;
}

export const createFlowStore = (initialDoc?: FlowYjsDoc) => {
  const yjsDoc = initialDoc ?? createFlowDoc();

  // UndoManager 생성 (nodes, edges, groups, comments, subflows 추적, viewport는 제외)
  const undoManager = new Y.UndoManager([yjsDoc.nodes, yjsDoc.edges, yjsDoc.groups, yjsDoc.comments, yjsDoc.subflows], {
    trackedOrigins: new Set([null]),
  });

  return create<FlowState>((set, get) => {
    // Yjs 변경 감지 및 동기화
    const syncFromYjs = () => {
      const { yjsDoc } = get();
      set({
        nodes: getNodesFromYjs(yjsDoc.nodes),
        edges: getEdgesFromYjs(yjsDoc.edges),
        groups: getGroupsFromYjs(yjsDoc.groups),
        comments: getCommentsFromYjs(yjsDoc.comments),
        subflows: getSubflowsFromYjs(yjsDoc.subflows),
        viewport: getViewportFromYjs(yjsDoc.viewport),
      });
    };

    // Yjs 이벤트 리스너 등록
    yjsDoc.nodes.observe(syncFromYjs);
    yjsDoc.edges.observe(syncFromYjs);
    yjsDoc.groups.observe(syncFromYjs);
    yjsDoc.comments.observe(syncFromYjs);
    yjsDoc.subflows.observe(syncFromYjs);
    yjsDoc.viewport.observe(syncFromYjs);

    return {
      yjsDoc,
      nodes: getNodesFromYjs(yjsDoc.nodes),
      edges: getEdgesFromYjs(yjsDoc.edges),
      groups: getGroupsFromYjs(yjsDoc.groups),
      comments: getCommentsFromYjs(yjsDoc.comments),
      subflows: getSubflowsFromYjs(yjsDoc.subflows),
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
        yjsDoc.doc.transact(() => {
          yjsDoc.nodes.delete(id);
          // 연결된 엣지도 삭제
          yjsDoc.edges.forEach((edge, edgeId) => {
            if (edge.source === id || edge.target === id) {
              yjsDoc.edges.delete(edgeId);
            }
          });
          // 그룹에서도 제거
          yjsDoc.groups.forEach((group, groupId) => {
            if (group.nodeIds.includes(id)) {
              const newNodeIds = group.nodeIds.filter(nid => nid !== id);
              if (newNodeIds.length === 0) {
                yjsDoc.groups.delete(groupId);
              } else {
                yjsDoc.groups.set(groupId, { ...group, nodeIds: newNodeIds });
              }
            }
          });
          // 서브플로우에서도 제거
          yjsDoc.subflows.forEach((subflow, subflowId) => {
            if (subflow.nodeIds.includes(id)) {
              const newNodeIds = subflow.nodeIds.filter(nid => nid !== id);
              if (newNodeIds.length === 0) {
                yjsDoc.subflows.delete(subflowId);
              } else {
                yjsDoc.subflows.set(subflowId, { ...subflow, nodeIds: newNodeIds });
              }
            }
          });
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

      // 그룹 생성
      createGroup: (name, nodeIds, color) => {
        const { yjsDoc } = get();
        const groupId = generateId('group', false);
        const group: NodeGroup = {
          id: groupId,
          name,
          nodeIds: [...nodeIds],
          color: color ?? DEFAULT_COLORS.GROUP,
        };
        yjsDoc.groups.set(groupId, group);
        return groupId;
      },

      // 그룹 삭제
      deleteGroup: (id) => {
        const { yjsDoc } = get();
        yjsDoc.groups.delete(id);
      },

      // 그룹 업데이트
      updateGroup: (id, partial) => {
        const { yjsDoc } = get();
        const existing = yjsDoc.groups.get(id);
        if (existing) {
          yjsDoc.groups.set(id, { ...existing, ...partial });
        }
      },

      // 그룹에 노드 추가
      addNodesToGroup: (groupId, nodeIds) => {
        const { yjsDoc } = get();
        const group = yjsDoc.groups.get(groupId);
        if (group) {
          const newNodeIds = new Set([...group.nodeIds, ...nodeIds]);
          yjsDoc.groups.set(groupId, { ...group, nodeIds: Array.from(newNodeIds) });
        }
      },

      // 그룹에서 노드 제거
      removeNodesFromGroup: (groupId, nodeIds) => {
        const { yjsDoc } = get();
        const group = yjsDoc.groups.get(groupId);
        if (group) {
          const nodeIdSet = new Set(nodeIds);
          const newNodeIds = group.nodeIds.filter(id => !nodeIdSet.has(id));
          if (newNodeIds.length === 0) {
            // 노드가 없으면 그룹 삭제
            yjsDoc.groups.delete(groupId);
          } else {
            yjsDoc.groups.set(groupId, { ...group, nodeIds: newNodeIds });
          }
        }
      },

      // 노드가 속한 그룹 찾기
      getGroupForNode: (nodeId) => {
        const { groups } = get();
        return groups.find(g => g.nodeIds.includes(nodeId));
      },

      // 코멘트 추가
      addComment: (comment) => {
        const { yjsDoc } = get();
        yjsDoc.comments.set(comment.id, comment);
      },

      // 코멘트 업데이트
      updateComment: (id, partial) => {
        const { yjsDoc } = get();
        const existing = yjsDoc.comments.get(id);
        if (existing) {
          yjsDoc.comments.set(id, { ...existing, ...partial });
        }
      },

      // 코멘트 삭제
      deleteComment: (id) => {
        const { yjsDoc } = get();
        yjsDoc.comments.delete(id);
      },

      // 서브플로우 생성
      createSubflow: (name, nodeIds) => {
        if (nodeIds.length < 2) return null;

        const { yjsDoc, nodes, edges } = get();
        const subflowId = generateId('subflow', false);
        const nodeIdSet = new Set(nodeIds);

        // 선택된 노드들 가져오기
        const selectedNodes = nodes.filter(n => nodeIdSet.has(n.id));
        if (selectedNodes.length < 2) return null;

        // 엣지 분류: 내부, 외부에서 들어오는, 외부로 나가는
        const internalEdgeIds: string[] = [];
        const inputMappings: SubflowPortMapping[] = [];
        const outputMappings: SubflowPortMapping[] = [];

        for (const edge of edges) {
          const sourceInSubflow = nodeIdSet.has(edge.source);
          const targetInSubflow = nodeIdSet.has(edge.target);

          if (sourceInSubflow && targetInSubflow) {
            // 내부 엣지
            internalEdgeIds.push(edge.id);
          } else if (!sourceInSubflow && targetInSubflow) {
            // 외부에서 들어오는 엣지 → 입력 포트 매핑
            const targetNode = selectedNodes.find(n => n.id === edge.target);
            const targetPort = targetNode?.inputs?.find(p => p.id === edge.targetPort);
            if (targetNode && targetPort) {
              // 중복 방지
              const existing = inputMappings.find(
                m => m.internalNodeId === edge.target && m.internalPortId === edge.targetPort
              );
              if (!existing) {
                inputMappings.push({
                  exposedPortId: `subflow-in-${inputMappings.length}`,
                  exposedPortName: targetPort.name,
                  internalNodeId: edge.target,
                  internalPortId: edge.targetPort,
                  dataType: targetPort.dataType,
                  isOutput: false,
                });
              }
            }
          } else if (sourceInSubflow && !targetInSubflow) {
            // 외부로 나가는 엣지 → 출력 포트 매핑
            const sourceNode = selectedNodes.find(n => n.id === edge.source);
            const sourcePort = sourceNode?.outputs?.find(p => p.id === edge.sourcePort);
            if (sourceNode && sourcePort) {
              // 중복 방지
              const existing = outputMappings.find(
                m => m.internalNodeId === edge.source && m.internalPortId === edge.sourcePort
              );
              if (!existing) {
                outputMappings.push({
                  exposedPortId: `subflow-out-${outputMappings.length}`,
                  exposedPortName: sourcePort.name,
                  internalNodeId: edge.source,
                  internalPortId: edge.sourcePort,
                  dataType: sourcePort.dataType,
                  isOutput: true,
                });
              }
            }
          }
        }

        // 바운딩 박스 계산 (접힌 위치용)
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        for (const node of selectedNodes) {
          minX = Math.min(minX, node.position.x);
          minY = Math.min(minY, node.position.y);
          maxX = Math.max(maxX, node.position.x + node.size.width);
          maxY = Math.max(maxY, node.position.y + node.size.height);
        }
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // 접힌 크기 계산 (포트 수 기반)
        const portCount = Math.max(inputMappings.length, outputMappings.length, 1);
        const collapsedHeight = SUBFLOW_LAYOUT.HEADER_HEIGHT + portCount * SUBFLOW_LAYOUT.PORT_SPACING + SUBFLOW_LAYOUT.PADDING_BOTTOM;
        const collapsedWidth = SUBFLOW_LAYOUT.COLLAPSED_WIDTH;

        const subflow: Subflow = {
          id: subflowId,
          name,
          nodeIds: [...nodeIds],
          internalEdgeIds,
          inputMappings,
          outputMappings,
          collapsed: false,
          collapsedPosition: { x: centerX - collapsedWidth / 2, y: centerY - collapsedHeight / 2 },
          collapsedSize: { width: collapsedWidth, height: collapsedHeight },
          color: DEFAULT_COLORS.SUBFLOW,
        };

        yjsDoc.subflows.set(subflowId, subflow);
        return subflowId;
      },

      // 서브플로우 삭제 (노드는 유지)
      deleteSubflow: (id) => {
        const { yjsDoc } = get();
        yjsDoc.subflows.delete(id);
      },

      // 서브플로우 업데이트
      updateSubflow: (id, partial) => {
        const { yjsDoc } = get();
        const existing = yjsDoc.subflows.get(id);
        if (existing) {
          yjsDoc.subflows.set(id, { ...existing, ...partial });
        }
      },

      // 서브플로우 접기
      collapseSubflow: (id) => {
        const { yjsDoc } = get();
        const subflow = yjsDoc.subflows.get(id);
        if (subflow && !subflow.collapsed) {
          yjsDoc.subflows.set(id, { ...subflow, collapsed: true });
        }
      },

      // 서브플로우 펼치기
      expandSubflow: (id) => {
        const { yjsDoc } = get();
        const subflow = yjsDoc.subflows.get(id);
        if (subflow && subflow.collapsed) {
          yjsDoc.subflows.set(id, { ...subflow, collapsed: false });
        }
      },

      // 노드가 속한 서브플로우 찾기
      getSubflowForNode: (nodeId) => {
        const { subflows } = get();
        return subflows.find(s => s.nodeIds.includes(nodeId));
      },

      setViewport: (viewport) => {
        const { yjsDoc } = get();
        const clamped = {
          ...viewport,
          zoom: Math.max(0.1, Math.min(5, viewport.zoom)),
        };
        setViewportToYjs(yjsDoc.viewport, clamped);
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
        if (!Number.isFinite(factor) || factor <= 0) return;
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

      // 플로우 초기화 (모든 노드, 엣지, 그룹, 코멘트, 서브플로우 삭제)
      clearFlow: () => {
        const { yjsDoc } = get();
        yjsDoc.doc.transact(() => {
          yjsDoc.nodes.clear();
          yjsDoc.edges.clear();
          yjsDoc.groups.clear();
          yjsDoc.comments.clear();
          yjsDoc.subflows.clear();
        });
      },

      // 플로우 불러오기
      loadFlow: (nodes, edges, groups, viewport, comments = [], subflows = []) => {
        const { yjsDoc } = get();
        yjsDoc.doc.transact(() => {
          // 기존 데이터 삭제
          yjsDoc.nodes.clear();
          yjsDoc.edges.clear();
          yjsDoc.groups.clear();
          yjsDoc.comments.clear();
          yjsDoc.subflows.clear();

          // 새 데이터 추가
          for (const node of nodes) {
            yjsDoc.nodes.set(node.id, node);
          }
          for (const edge of edges) {
            yjsDoc.edges.set(edge.id, edge);
          }
          for (const group of groups) {
            yjsDoc.groups.set(group.id, group);
          }
          for (const comment of comments) {
            yjsDoc.comments.set(comment.id, comment);
          }
          for (const subflow of subflows) {
            yjsDoc.subflows.set(subflow.id, subflow);
          }

          // 뷰포트 설정
          setViewportToYjs(yjsDoc.viewport, viewport);
        });
      },

      undo: () => {
        undoManager.undo();
      },

      redo: () => {
        undoManager.redo();
      },

      canUndo: () => undoManager.undoStack.length > 0,

      canRedo: () => undoManager.redoStack.length > 0,

      getUndoStackLength: () => undoManager.undoStack.length,

      getRedoStackLength: () => undoManager.redoStack.length,

      undoToIndex: (targetIndex: number) => {
        const currentLength = undoManager.undoStack.length;
        const steps = currentLength - targetIndex - 1;
        for (let i = 0; i < steps; i++) {
          undoManager.undo();
        }
      },

      redoToIndex: (targetIndex: number) => {
        const steps = targetIndex + 1;
        for (let i = 0; i < steps; i++) {
          undoManager.redo();
        }
      },
    };
  });
};

// 기본 스토어 인스턴스
export type FlowStore = ReturnType<typeof createFlowStore>;
