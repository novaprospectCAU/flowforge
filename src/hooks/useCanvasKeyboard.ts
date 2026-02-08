import { useEffect, type Dispatch, type SetStateAction, type MutableRefObject } from 'react';
import {
  downloadFlow,
  loadFlowFromFile,
  generateId,
  type FlowStore,
} from '@flowforge/state';
import {
  screenToWorld,
  exportFlowToImage,
  downloadImage,
  type EdgeStyle,
} from '@flowforge/canvas';
import type { FlowNode, FlowEdge, Comment, NodeGroup, Position } from '@flowforge/types';
import { alignNodes, distributeNodes, autoArrangeNodes } from '../utils/canvasLayout';

interface ClipboardState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  groups: NodeGroup[];
  comments: Comment[];
}

export interface NodePaletteState {
  x: number;
  y: number;
  worldPos: Position;
}

export interface TemplateBrowserState {
  x: number;
  y: number;
  worldPos: Position;
}

export interface ContextMenuState {
  x: number;
  y: number;
  worldPos: Position;
  targetNode: FlowNode | null;
  targetCommentId?: string;
}

export interface UseCanvasKeyboardParams {
  refs: {
    storeRef: MutableRefObject<FlowStore | null>;
    selectedNodeIdsRef: MutableRefObject<Set<string>>;
    selectedCommentIdRef: MutableRefObject<string | null>;
    selectedSubflowIdRef: MutableRefObject<string | null>;
    clipboardRef: MutableRefObject<ClipboardState | null>;
    canvasRef: MutableRefObject<HTMLCanvasElement | null>;
    snapToGridRef: MutableRefObject<boolean>;
    edgeStyleRef: MutableRefObject<string>;
  };
  setters: {
    setSpacePressed: Dispatch<SetStateAction<boolean>>;
    setShowSearch: Dispatch<SetStateAction<boolean>>;
    setShowHelp: Dispatch<SetStateAction<boolean>>;
    setShowHistory: Dispatch<SetStateAction<boolean>>;
    setNodePalette: Dispatch<SetStateAction<NodePaletteState | null>>;
    setTemplateBrowser: Dispatch<SetStateAction<TemplateBrowserState | null>>;
    setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
    setSnapToGrid: Dispatch<SetStateAction<boolean>>;
    setCurrentZoom: Dispatch<SetStateAction<number>>;
  };
  callbacks: {
    setSelectedNodes: (ids: Set<string>) => void;
    forceRender: Dispatch<SetStateAction<number>>;
    toggleThemeRef: MutableRefObject<() => void>;
  };
  gridSize: number;
}

export function useCanvasKeyboard({ refs, setters, callbacks, gridSize }: UseCanvasKeyboardParams): void {
  const {
    storeRef, selectedNodeIdsRef, selectedCommentIdRef, selectedSubflowIdRef,
    clipboardRef, canvasRef, snapToGridRef, edgeStyleRef,
  } = refs;
  const {
    setSpacePressed, setShowSearch, setShowHelp, setShowHistory,
    setNodePalette, setTemplateBrowser, setContextMenu, setSnapToGrid, setCurrentZoom,
  } = setters;
  const { setSelectedNodes, forceRender, toggleThemeRef } = callbacks;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = storeRef.current;
      if (!store) return;

      // 입력 필드에서는 일부 단축키 무시 (Delete, Backspace, 일반 문자 등)
      const target = e.target as HTMLElement;
      const isInputFocused = (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );

      // 입력 중일 때는 Ctrl/Cmd 조합 외의 단축키 무시
      if (isInputFocused && !e.ctrlKey && !e.metaKey) {
        return;
      }

      // Space = Pan 모드 (Figma 스타일)
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        store.getState().undo();
        return;
      }

      // Redo: Ctrl+Y / Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        store.getState().redo();
        return;
      }

      // Save: Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const state = store.getState();
        downloadFlow(state.nodes, state.edges, state.groups, state.viewport, 'flow.json', state.comments);
        return;
      }

      // Open: Ctrl+O / Cmd+O
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        loadFlowFromFile()
          .then((flow) => {
            const state = store.getState();
            state.loadFlow(flow.nodes, flow.edges, flow.groups, flow.viewport, flow.comments);
            setSelectedNodes(new Set());
            forceRender(n => n + 1);
          })
          .catch((err) => {
            console.error('Failed to load flow:', err);
          });
        return;
      }

      // New: Ctrl+N / Cmd+N (새 플로우)
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        const state = store.getState();
        state.clearFlow();
        setSelectedNodes(new Set());
        forceRender(n => n + 1);
        return;
      }

      // Export Image: Ctrl+Shift+E / Cmd+Shift+E
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const state = store.getState();
        if (state.nodes.length === 0) return;

        exportFlowToImage(
          canvas,
          state.nodes,
          state.edges,
          state.groups,
          state.viewport,
          edgeStyleRef.current as EdgeStyle
        )
          .then((blob) => {
            downloadImage(blob, 'flow.png');
          })
          .catch((err) => {
            console.error('Failed to export image:', err);
          });
        return;
      }

      // Search: Ctrl+F / Cmd+F
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
        return;
      }

      // Tab: 노드 팔레트 열기
      if (e.key === 'Tab') {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const state = store.getState();
        const worldPos = screenToWorld(
          { x: rect.width / 2, y: rect.height / 2 },
          state.viewport,
          { width: rect.width, height: rect.height }
        );

        setNodePalette({
          x: rect.left + rect.width / 2 - 140,
          y: rect.top + rect.height / 2 - 200,
          worldPos,
        });
        return;
      }

      // T: 템플릿 브라우저 열기
      if (e.key === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const state = store.getState();
        const worldPos = screenToWorld(
          { x: rect.width / 2, y: rect.height / 2 },
          state.viewport,
          { width: rect.width, height: rect.height }
        );

        setTemplateBrowser({
          x: rect.left + rect.width / 2 - 150,
          y: rect.top + rect.height / 2 - 200,
          worldPos,
        });
        return;
      }

      // Copy: Ctrl+C / Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        const selectedIds = selectedNodeIdsRef.current;
        const selectedCommentId = selectedCommentIdRef.current;

        // 노드나 코멘트가 선택되어야 복사 가능
        if (selectedIds.size === 0 && !selectedCommentId) return;

        const state = store.getState();
        const selectedNodes = state.nodes.filter(n => selectedIds.has(n.id));
        const selectedNodeIdSet = new Set(selectedNodes.map(n => n.id));

        // 선택된 노드들 사이의 엣지만 복사
        const selectedEdges = state.edges.filter(
          e => selectedNodeIdSet.has(e.source) && selectedNodeIdSet.has(e.target)
        );

        // 모든 노드가 선택된 그룹만 복사
        const selectedGroups = state.groups.filter(
          g => g.nodeIds.length > 0 && g.nodeIds.every(id => selectedNodeIdSet.has(id))
        );

        // 코멘트 복사: 선택된 코멘트 또는 선택된 노드들의 바운딩 박스 내 코멘트
        let selectedComments: Comment[] = [];
        if (selectedCommentId) {
          const comment = state.comments.find(c => c.id === selectedCommentId);
          if (comment) {
            selectedComments = [comment];
          }
        } else if (selectedNodes.length > 0) {
          // 선택된 노드들의 바운딩 박스 계산
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const node of selectedNodes) {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + node.size.width);
            maxY = Math.max(maxY, node.position.y + node.size.height);
          }
          // 바운딩 박스 내 코멘트 찾기
          selectedComments = state.comments.filter(c => {
            const cx = c.position.x + c.size.width / 2;
            const cy = c.position.y + c.size.height / 2;
            return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
          });
        }

        clipboardRef.current = {
          nodes: selectedNodes,
          edges: selectedEdges,
          groups: selectedGroups,
          comments: selectedComments,
        };

        // 시스템 클립보드에도 저장 (다른 창/앱과 공유 가능)
        const clipboardData = {
          type: 'flowforge-clipboard',
          version: 1,
          nodes: selectedNodes,
          edges: selectedEdges,
          groups: selectedGroups,
          comments: selectedComments,
        };
        navigator.clipboard.writeText(JSON.stringify(clipboardData)).catch(() => {
          // 시스템 클립보드 접근 실패 시 무시 (내부 클립보드는 이미 설정됨)
        });
        return;
      }

      // Paste: Ctrl+V / Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();

        // 시스템 클립보드에서 먼저 읽기 시도
        const handlePaste = async () => {
          let clipboardContent = clipboardRef.current;

          try {
            const text = await navigator.clipboard.readText();
            const parsed = JSON.parse(text);
            if (parsed.type === 'flowforge-clipboard' && parsed.version === 1) {
              clipboardContent = {
                nodes: parsed.nodes || [],
                edges: parsed.edges || [],
                groups: parsed.groups || [],
                comments: parsed.comments || [],
              };
            }
          } catch {
            // 시스템 클립보드 읽기 실패 시 내부 클립보드 사용
          }

          if (!clipboardContent) return;

          const { nodes: copiedNodes, edges: copiedEdges, groups: copiedGroups, comments: copiedComments } = clipboardContent;

          // 노드나 코멘트가 있어야 붙여넣기 가능
          if (copiedNodes.length === 0 && copiedComments.length === 0) return;

          const state = store.getState();
          const canvas = canvasRef.current;
          if (!canvas) return;

          // 복사된 모든 요소의 바운딩 박스 중앙 계산
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const node of copiedNodes) {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + node.size.width);
            maxY = Math.max(maxY, node.position.y + node.size.height);
          }
          for (const comment of copiedComments) {
            minX = Math.min(minX, comment.position.x);
            minY = Math.min(minY, comment.position.y);
            maxX = Math.max(maxX, comment.position.x + comment.size.width);
            maxY = Math.max(maxY, comment.position.y + comment.size.height);
          }
          const copiedCenterX = (minX + maxX) / 2;
          const copiedCenterY = (minY + maxY) / 2;

          // 뷰포트 중앙 (월드 좌표) - 이것이 붙여넣기 위치
          const viewportCenterX = state.viewport.x;
          const viewportCenterY = state.viewport.y;

          // 오프셋 계산: 뷰포트 중앙으로 이동
          const offsetX = viewportCenterX - copiedCenterX;
          const offsetY = viewportCenterY - copiedCenterY;

          // ID 매핑 (원본 ID -> 새 ID)
          const idMap = new Map<string, string>();
          const newNodes: FlowNode[] = [];
          const newNodeIds: string[] = [];

          for (const node of copiedNodes) {
            const newId = generateId('node');
            idMap.set(node.id, newId);

            const newNode: FlowNode = {
              ...node,
              id: newId,
              position: {
                x: node.position.x + offsetX,
                y: node.position.y + offsetY,
              },
            };
            newNodes.push(newNode);
            newNodeIds.push(newId);
          }

          // 노드 추가
          for (const node of newNodes) {
            state.addNode(node);
          }

          // 엣지 추가 (ID 매핑 적용)
          for (const edge of copiedEdges) {
            const newSourceId = idMap.get(edge.source);
            const newTargetId = idMap.get(edge.target);
            if (newSourceId && newTargetId) {
              const newEdge: FlowEdge = {
                id: generateId('edge'),
                source: newSourceId,
                sourcePort: edge.sourcePort,
                target: newTargetId,
                targetPort: edge.targetPort,
              };
              state.addEdge(newEdge);
            }
          }

          // 그룹 추가 (ID 매핑 적용)
          const newGroups: NodeGroup[] = [];
          for (const group of copiedGroups) {
            const newNodeIdsForGroup = group.nodeIds
              .map(id => idMap.get(id))
              .filter((id): id is string => id !== undefined);
            if (newNodeIdsForGroup.length > 0) {
              state.createGroup(group.name, newNodeIdsForGroup, group.color);
              newGroups.push({
                ...group,
                id: generateId('group'),
                nodeIds: newNodeIdsForGroup,
              });
            }
          }

          // 코멘트 추가
          const newComments: Comment[] = [];
          const commentIdMap = new Map<string, string>();
          for (const comment of copiedComments) {
            const newId = generateId('comment');
            commentIdMap.set(comment.id, newId);
            const now = Date.now();
            const newComment: Comment = {
              ...comment,
              id: newId,
              position: {
                x: comment.position.x + offsetX,
                y: comment.position.y + offsetY,
              },
              createdAt: now,
              updatedAt: now,
            };
            newComments.push(newComment);
            state.addComment(newComment);
          }

          // 새로 붙여넣은 노드들 선택
          setSelectedNodes(new Set(newNodeIds));
          // 코멘트만 복사한 경우, 첫 번째 코멘트 선택
          if (newNodeIds.length === 0 && newComments.length > 0) {
            selectedCommentIdRef.current = newComments[0].id;
          }

          // 클립보드 위치 업데이트 (연속 붙여넣기 시 계속 오프셋)
          clipboardRef.current = {
            nodes: newNodes,
            edges: copiedEdges.map(e => ({
              ...e,
              source: idMap.get(e.source) || e.source,
              target: idMap.get(e.target) || e.target,
            })),
            groups: copiedGroups.map(g => ({
              ...g,
              nodeIds: g.nodeIds.map(id => idMap.get(id) || id),
            })),
            comments: newComments,
          };
        };

        handlePaste();
        return;
      }

      // Duplicate: Ctrl+D / Cmd+D (복사 + 붙여넣기)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        const selectedIds = selectedNodeIdsRef.current;
        const selectedCommentId = selectedCommentIdRef.current;

        // 노드나 코멘트가 선택되어야 복제 가능
        if (selectedIds.size === 0 && !selectedCommentId) return;

        const state = store.getState();
        const selectedNodes = state.nodes.filter(n => selectedIds.has(n.id));
        const selectedNodeIdSet = new Set(selectedNodes.map(n => n.id));
        const selectedEdges = state.edges.filter(
          e => selectedNodeIdSet.has(e.source) && selectedNodeIdSet.has(e.target)
        );

        // 코멘트 선택: 선택된 코멘트 또는 선택된 노드들의 바운딩 박스 내 코멘트
        let commentsToDuplicate: Comment[] = [];
        if (selectedCommentId) {
          const comment = state.comments.find(c => c.id === selectedCommentId);
          if (comment) {
            commentsToDuplicate = [comment];
          }
        } else if (selectedNodes.length > 0) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const node of selectedNodes) {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + node.size.width);
            maxY = Math.max(maxY, node.position.y + node.size.height);
          }
          commentsToDuplicate = state.comments.filter(c => {
            const cx = c.position.x + c.size.width / 2;
            const cy = c.position.y + c.size.height / 2;
            return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
          });
        }

        const offset = 30;
        const idMap = new Map<string, string>();
        const newNodeIds: string[] = [];

        for (const node of selectedNodes) {
          const newId = generateId('node');
          idMap.set(node.id, newId);

          const newNode: FlowNode = {
            ...node,
            id: newId,
            position: {
              x: node.position.x + offset,
              y: node.position.y + offset,
            },
          };
          state.addNode(newNode);
          newNodeIds.push(newId);
        }

        for (const edge of selectedEdges) {
          const newSourceId = idMap.get(edge.source);
          const newTargetId = idMap.get(edge.target);
          if (newSourceId && newTargetId) {
            state.addEdge({
              id: generateId('edge'),
              source: newSourceId,
              sourcePort: edge.sourcePort,
              target: newTargetId,
              targetPort: edge.targetPort,
            });
          }
        }

        // 코멘트 복제
        let newCommentId: string | null = null;
        for (const comment of commentsToDuplicate) {
          const newId = generateId('comment');
          if (!newCommentId) newCommentId = newId;
          const now = Date.now();
          state.addComment({
            ...comment,
            id: newId,
            position: {
              x: comment.position.x + offset,
              y: comment.position.y + offset,
            },
            createdAt: now,
            updatedAt: now,
          });
        }

        // 선택 업데이트
        if (newNodeIds.length > 0) {
          setSelectedNodes(new Set(newNodeIds));
        } else if (newCommentId) {
          selectedCommentIdRef.current = newCommentId;
          forceRender(n => n + 1);
        }
        return;
      }

      // Delete: 선택된 노드 또는 코멘트 삭제
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const state = store.getState();

        // 코멘트가 선택되어 있으면 코멘트 삭제
        if (selectedCommentIdRef.current) {
          state.deleteComment(selectedCommentIdRef.current);
          selectedCommentIdRef.current = null;
          return;
        }

        // 노드 삭제
        const selectedIds = selectedNodeIdsRef.current;
        if (selectedIds.size === 0) return;

        for (const nodeId of selectedIds) {
          state.deleteNode(nodeId);
        }
        setSelectedNodes(new Set());
        return;
      }

      // Select All: Ctrl+A / Cmd+A
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const state = store.getState();
        setSelectedNodes(new Set(state.nodes.map(n => n.id)));
        return;
      }

      // Escape: 선택 해제 및 메뉴 닫기
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedNodes(new Set());
        setContextMenu(null);
        setNodePalette(null);
        setTemplateBrowser(null);
        return;
      }

      // Fit View: F 키 - 선택된 노드 또는 모든 노드가 보이도록 뷰 조정
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const state = store.getState();
        const canvas = canvasRef.current;
        if (state.nodes.length === 0 || !canvas) return;

        // 선택된 노드가 있으면 선택된 노드만, 없으면 모든 노드
        const selectedIds = selectedNodeIdsRef.current;
        const targetNodes = selectedIds.size > 0
          ? state.nodes.filter(n => selectedIds.has(n.id))
          : state.nodes;

        if (targetNodes.length === 0) return;

        // 바운딩 박스 계산
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const node of targetNodes) {
          minX = Math.min(minX, node.position.x);
          minY = Math.min(minY, node.position.y);
          maxX = Math.max(maxX, node.position.x + node.size.width);
          maxY = Math.max(maxY, node.position.y + node.size.height);
        }

        const padding = 50;
        const contentWidth = maxX - minX + padding * 2;
        const contentHeight = maxY - minY + padding * 2;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / contentWidth;
        const scaleY = rect.height / contentHeight;
        const zoom = Math.min(scaleX, scaleY, 2); // 최대 200%

        state.setViewport({ x: centerX, y: centerY, zoom });
        setCurrentZoom(zoom);
        return;
      }

      // Reset Zoom: Ctrl+0 / Cmd+0
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        const state = store.getState();
        state.setViewport({ ...state.viewport, zoom: 1 });
        return;
      }

      // Alt + Arrow: 노드 정렬
      if (e.altKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'ArrowLeft') alignNodes(store, selectedNodeIdsRef.current, 'left');
        if (e.key === 'ArrowRight') alignNodes(store, selectedNodeIdsRef.current, 'right');
        if (e.key === 'ArrowUp') alignNodes(store, selectedNodeIdsRef.current, 'top');
        if (e.key === 'ArrowDown') alignNodes(store, selectedNodeIdsRef.current, 'bottom');
        return;
      }

      // Alt + Shift + Arrow: 중앙 정렬
      if (e.altKey && e.shiftKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') alignNodes(store, selectedNodeIdsRef.current, 'center');
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') alignNodes(store, selectedNodeIdsRef.current, 'middle');
        return;
      }

      // Ctrl + Shift + H/V: 균등 분배
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          distributeNodes(store, selectedNodeIdsRef.current, 'horizontal');
          return;
        }
        if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          distributeNodes(store, selectedNodeIdsRef.current, 'vertical');
          return;
        }
      }

      // Arrow Keys: 선택된 노드 이동 또는 노드 탐색
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !e.altKey) {
        const selectedIds = selectedNodeIdsRef.current;
        const state = store.getState();

        // 노드가 선택되지 않았으면 해당 방향의 가장 가까운 노드 선택
        if (selectedIds.size === 0) {
          e.preventDefault();
          if (state.nodes.length === 0) return;

          const viewCenter = { x: state.viewport.x, y: state.viewport.y };

          // 방향 벡터
          let dirX = 0, dirY = 0;
          if (e.key === 'ArrowUp') dirY = -1;
          if (e.key === 'ArrowDown') dirY = 1;
          if (e.key === 'ArrowLeft') dirX = -1;
          if (e.key === 'ArrowRight') dirX = 1;

          // 해당 방향에 있는 노드 중 가장 가까운 노드 찾기
          let bestNode: FlowNode | null = null;
          let bestScore = Infinity;

          for (const node of state.nodes) {
            const nodeCenter = {
              x: node.position.x + node.size.width / 2,
              y: node.position.y + node.size.height / 2,
            };
            const dx = nodeCenter.x - viewCenter.x;
            const dy = nodeCenter.y - viewCenter.y;

            // 방향 체크 (내적이 양수면 해당 방향)
            const dotProduct = dx * dirX + dy * dirY;
            if (dotProduct <= 0) continue;

            // 거리 계산
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < bestScore) {
              bestScore = distance;
              bestNode = node;
            }
          }

          // 해당 방향에 노드가 없으면 가장 가까운 노드 선택
          if (!bestNode) {
            let minDist = Infinity;
            for (const node of state.nodes) {
              const nodeCenter = {
                x: node.position.x + node.size.width / 2,
                y: node.position.y + node.size.height / 2,
              };
              const dist = Math.sqrt(
                Math.pow(nodeCenter.x - viewCenter.x, 2) +
                Math.pow(nodeCenter.y - viewCenter.y, 2)
              );
              if (dist < minDist) {
                minDist = dist;
                bestNode = node;
              }
            }
          }

          if (bestNode) {
            setSelectedNodes(new Set([bestNode.id]));
          }
          return;
        }

        // 노드가 선택되어 있으면 이동
        e.preventDefault();
        const step = e.shiftKey ? 1 : (snapToGridRef.current ? gridSize : 10);

        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;

        for (const nodeId of selectedIds) {
          const node = state.nodes.find(n => n.id === nodeId);
          if (node) {
            state.updateNode(nodeId, {
              position: {
                x: node.position.x + dx,
                y: node.position.y + dy,
              },
            });
          }
        }
        return;
      }

      // [ / ]: 이전/다음 노드 선택 (순환)
      if (e.key === '[' || e.key === ']') {
        e.preventDefault();
        const state = store.getState();
        if (state.nodes.length === 0) return;

        const selectedIds = selectedNodeIdsRef.current;
        const currentIndex = selectedIds.size === 1
          ? state.nodes.findIndex(n => selectedIds.has(n.id))
          : -1;

        let nextIndex: number;
        if (e.key === ']') {
          // 다음 노드
          nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % state.nodes.length;
        } else {
          // 이전 노드
          nextIndex = currentIndex < 0
            ? state.nodes.length - 1
            : (currentIndex - 1 + state.nodes.length) % state.nodes.length;
        }

        const nextNode = state.nodes[nextIndex];
        setSelectedNodes(new Set([nextNode.id]));

        // 선택된 노드로 뷰포트 이동
        const nodeCenter = {
          x: nextNode.position.x + nextNode.size.width / 2,
          y: nextNode.position.y + nextNode.size.height / 2,
        };
        state.setViewport({ ...state.viewport, x: nodeCenter.x, y: nodeCenter.y });
        return;
      }

      // Enter: 선택된 노드로 뷰 이동 (단일 노드 선택 시)
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        const selectedIds = selectedNodeIdsRef.current;
        if (selectedIds.size !== 1) return;

        e.preventDefault();
        const state = store.getState();
        const nodeId = Array.from(selectedIds)[0];
        const node = state.nodes.find(n => n.id === nodeId);
        if (!node) return;

        const nodeCenter = {
          x: node.position.x + node.size.width / 2,
          y: node.position.y + node.size.height / 2,
        };
        state.setViewport({ ...state.viewport, x: nodeCenter.x, y: nodeCenter.y });
        return;
      }

      // Create Group: Ctrl+G / Cmd+G
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        const selectedIds = selectedNodeIdsRef.current;
        if (selectedIds.size >= 2) {
          const state = store.getState();
          state.createGroup('New Group', Array.from(selectedIds));
          forceRender(n => n + 1);
        }
        return;
      }

      // Create Subflow: Ctrl+Shift+G / Cmd+Shift+G
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        const selectedIds = selectedNodeIdsRef.current;
        if (selectedIds.size >= 2) {
          const state = store.getState();
          const subflowId = state.createSubflow('New Subflow', Array.from(selectedIds));
          if (subflowId) {
            selectedSubflowIdRef.current = subflowId;
            setSelectedNodes(new Set());
            forceRender(n => n + 1);
          }
        }
        return;
      }

      // Ungroup: Ctrl+Shift+U / Cmd+Shift+U
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        const selectedIds = selectedNodeIdsRef.current;
        if (selectedIds.size > 0) {
          const state = store.getState();
          const nodeId = Array.from(selectedIds)[0];
          const group = state.getGroupForNode(nodeId);
          if (group) {
            state.deleteGroup(group.id);
            forceRender(n => n + 1);
          }
        }
        return;
      }

      // Auto-arrange selected: Ctrl+Shift+A / Cmd+Shift+A
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        autoArrangeNodes(store, selectedNodeIdsRef.current, false);
        return;
      }

      // Auto-arrange all: Alt+A
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        autoArrangeNodes(store, selectedNodeIdsRef.current, true);
        return;
      }

      // Toggle Snap: G 키 (단독)
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        setSnapToGrid(prev => !prev);
        return;
      }

      // Add Comment: C 키 (단독)
      if (e.key === 'c' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        const state = store.getState();
        const commentId = generateId('comment');
        const newComment: Comment = {
          id: commentId,
          text: '',
          position: { x: state.viewport.x - 100, y: state.viewport.y - 40 },
          size: { width: 200, height: 80 },
          color: '#fff8dc',
          createdAt: Date.now(),
        };
        state.addComment(newComment);
        selectedCommentIdRef.current = commentId;
        setSelectedNodes(new Set());
        forceRender(n => n + 1);
        return;
      }

      // History: Ctrl+H / Cmd+H
      if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H') && !e.shiftKey) {
        e.preventDefault();
        setShowHistory(prev => !prev);
        return;
      }

      // Theme Toggle: Ctrl+Shift+T / Cmd+Shift+T
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        toggleThemeRef.current();
        return;
      }

      // Help: ? 키 또는 F1
      if (e.key === '?' || e.key === 'F1') {
        e.preventDefault();
        setShowHelp(prev => !prev);
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Space 해제
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
}
