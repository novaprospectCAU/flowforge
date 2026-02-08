import type { Dispatch, SetStateAction } from 'react';
import type { FlowStore } from '@flowforge/state';
import { nodeTypeRegistry, generateId } from '@flowforge/state';
import type { FlowNode, Position, Comment } from '@flowforge/types';
import type { MenuItem } from '../components/ContextMenu';
import { alignNodes, distributeNodes } from './canvasLayout';

export interface NodePaletteState {
  x: number;
  y: number;
  worldPos: Position;
}

export interface MenuContext {
  store: FlowStore;
  selectedNodeIds: Set<string>;
  selectedCommentIdRef: React.MutableRefObject<string | null>;
  selectedSubflowIdRef: React.MutableRefObject<string | null>;
  targetNode: FlowNode | null;
  targetCommentId?: string;
  worldPos: Position;
  contextMenuPos: { x: number; y: number } | null;
  // 콜백
  setSelectedNodes: (ids: Set<string>) => void;
  setNodePalette: (state: NodePaletteState | null) => void;
  setEditingCommentId: (id: string | null) => void;
  forceRender: Dispatch<SetStateAction<number>>;
}

export function getMenuItems(ctx: MenuContext): MenuItem[] {
  const {
    store, selectedNodeIds, selectedCommentIdRef, selectedSubflowIdRef,
    targetNode, targetCommentId, worldPos, contextMenuPos,
    setSelectedNodes, setNodePalette, setEditingCommentId, forceRender,
  } = ctx;

  // 코멘트 메뉴
  if (targetCommentId) {
    return [
      {
        label: 'Edit Comment',
        action: () => {
          setEditingCommentId(targetCommentId);
          selectedCommentIdRef.current = targetCommentId;
          forceRender(n => n + 1);
        },
      },
      { label: '', action: () => {}, divider: true },
      {
        label: 'Delete Comment',
        action: () => {
          store.getState().deleteComment(targetCommentId);
          if (selectedCommentIdRef.current === targetCommentId) {
            selectedCommentIdRef.current = null;
          }
          forceRender(n => n + 1);
        },
      },
    ];
  }

  if (targetNode) {
    // 노드 위에서 우클릭
    const items: MenuItem[] = [
      {
        label: 'Delete Node',
        action: () => {
          store.getState().deleteNode(targetNode.id);
          selectedNodeIds.delete(targetNode.id);
          forceRender(n => n + 1);
        },
      },
      { label: '', action: () => {}, divider: true },
      {
        label: 'Duplicate',
        action: () => {
          const newNode: FlowNode = {
            ...targetNode,
            id: generateId('node'),
            position: {
              x: targetNode.position.x + 20,
              y: targetNode.position.y + 20,
            },
          };
          store.getState().addNode(newNode);
          setSelectedNodes(new Set([newNode.id]));
        },
      },
    ];

    // 다중 선택 시 정렬 옵션 추가
    if (selectedNodeIds.size >= 2) {
      items.push({ label: '', action: () => {}, divider: true });
      items.push({ label: 'Align Left', action: () => alignNodes(store, selectedNodeIds, 'left') });
      items.push({ label: 'Align Center', action: () => alignNodes(store, selectedNodeIds, 'center') });
      items.push({ label: 'Align Right', action: () => alignNodes(store, selectedNodeIds, 'right') });
      items.push({ label: '', action: () => {}, divider: true });
      items.push({ label: 'Align Top', action: () => alignNodes(store, selectedNodeIds, 'top') });
      items.push({ label: 'Align Middle', action: () => alignNodes(store, selectedNodeIds, 'middle') });
      items.push({ label: 'Align Bottom', action: () => alignNodes(store, selectedNodeIds, 'bottom') });

      if (selectedNodeIds.size >= 3) {
        items.push({ label: '', action: () => {}, divider: true });
        items.push({ label: 'Distribute Horizontal', action: () => distributeNodes(store, selectedNodeIds, 'horizontal') });
        items.push({ label: 'Distribute Vertical', action: () => distributeNodes(store, selectedNodeIds, 'vertical') });
      }

      // 그룹 옵션
      items.push({ label: '', action: () => {}, divider: true });
      const state = store.getState();
      const existingGroup = state.getGroupForNode(targetNode.id);
      if (existingGroup) {
        items.push({
          label: `Ungroup "${existingGroup.name}"`,
          action: () => {
            state.deleteGroup(existingGroup.id);
            forceRender(n => n + 1);
          },
        });
      } else {
        items.push({
          label: 'Group Selected (Ctrl+G)',
          action: () => {
            state.createGroup('New Group', Array.from(selectedNodeIds));
            forceRender(n => n + 1);
          },
        });
      }

      // 서브플로우 옵션
      const existingSubflow = state.getSubflowForNode(targetNode.id);
      if (existingSubflow) {
        items.push({
          label: existingSubflow.collapsed ? 'Expand Subflow' : 'Collapse Subflow',
          action: () => {
            if (existingSubflow.collapsed) {
              state.expandSubflow(existingSubflow.id);
            } else {
              state.collapseSubflow(existingSubflow.id);
            }
            selectedSubflowIdRef.current = existingSubflow.id;
            forceRender(n => n + 1);
          },
        });
        items.push({
          label: `Delete Subflow "${existingSubflow.name}"`,
          action: () => {
            state.deleteSubflow(existingSubflow.id);
            selectedSubflowIdRef.current = null;
            forceRender(n => n + 1);
          },
        });
      } else {
        items.push({
          label: 'Create Subflow (Ctrl+Shift+G)',
          action: () => {
            const subflowId = state.createSubflow('New Subflow', Array.from(selectedNodeIds));
            if (subflowId) {
              selectedSubflowIdRef.current = subflowId;
              setSelectedNodes(new Set());
              forceRender(n => n + 1);
            }
          },
        });
      }
    }

    return items;
  } else {
    // 빈 공간에서 우클릭 - 카테고리별 노드 추가 메뉴
    const categories = nodeTypeRegistry.getCategories();
    const items: MenuItem[] = [];

    for (const category of categories) {
      const types = nodeTypeRegistry.getByCategory(category);
      items.push({
        label: `Add ${category}`,
        action: () => {
          // 해당 카테고리의 첫 번째 노드 추가
          if (types[0]) {
            // addNodeFromType is handled via the NodePalette callback pattern
            // For the category shortcut, we directly create the node
            const typeDef = types[0];
            const rawPosition = {
              x: worldPos.x - typeDef.defaultSize.width / 2,
              y: worldPos.y - typeDef.defaultSize.height / 2,
            };
            const newNode: FlowNode = {
              id: generateId('node'),
              type: typeDef.type,
              position: rawPosition,
              size: typeDef.defaultSize,
              data: { title: typeDef.title },
              inputs: typeDef.inputs,
              outputs: typeDef.outputs,
            };
            store.getState().addNode(newNode);
            setSelectedNodes(new Set([newNode.id]));
          }
        },
      });
    }

    items.push({ label: '', action: () => {}, divider: true });
    items.push({
      label: 'Search Nodes... (Tab)',
      action: () => {
        setNodePalette({
          x: contextMenuPos?.x ?? 0,
          y: contextMenuPos?.y ?? 0,
          worldPos,
        });
      },
    });
    items.push({ label: '', action: () => {}, divider: true });
    items.push({
      label: 'Add Comment (C)',
      action: () => {
        const state = store.getState();
        const commentId = generateId('comment');
        const newComment: Comment = {
          id: commentId,
          text: '',
          position: worldPos,
          size: { width: 200, height: 80 },
          color: '#fff8dc',
          createdAt: Date.now(),
        };
        state.addComment(newComment);
        selectedCommentIdRef.current = commentId;
        setSelectedNodes(new Set());
        forceRender(n => n + 1);
      },
    });

    return items;
  }
}
