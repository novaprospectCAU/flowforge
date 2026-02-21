import { useCallback, type MutableRefObject } from 'react';
import {
  screenToWorld,
  hitTestNode,
  hitTestPort,
  hitTestCollapsedSubflow,
  hitTestComment,
  isInMinimap,
  minimapToWorld,
  type PortHitResult,
  type CompatiblePorts,
} from '@flowforge/canvas';
import {
  getVisibleNodes,
  generateId,
  type FlowStore,
} from '@flowforge/state';
import { ZOOM_CONFIG, type FlowNode, type FlowEdge, type CanvasSize, type Position, type DataType, type Comment, type Subflow } from '@flowforge/types';

type DragMode = 'none' | 'pan' | 'node' | 'edge' | 'box' | 'minimap' | 'resize' | 'group' | 'comment' | 'subflow';

function isTypeCompatible(sourceType: DataType, targetType: DataType): boolean {
  if (sourceType === 'any' || targetType === 'any') return true;
  return sourceType === targetType;
}

export interface UseCanvasTouchHandlersParams {
  refs: {
    canvasRef: MutableRefObject<HTMLCanvasElement | null>;
    storeRef: MutableRefObject<FlowStore | null>;
    dragModeRef: MutableRefObject<DragMode>;
    edgeDragRef: MutableRefObject<{ startPort: PortHitResult; currentPos: Position } | null>;
    selectedNodeIdsRef: MutableRefObject<Set<string>>;
    selectedCommentIdRef: MutableRefObject<string | null>;
    selectedSubflowIdRef: MutableRefObject<string | null>;
    nodeDragPositionsRef: MutableRefObject<Map<string, Position>>;
    snapLinesRef: MutableRefObject<unknown[]>;
    compatiblePortsMapRef: MutableRefObject<Map<string, CompatiblePorts> | null>;
    commentDragRef: MutableRefObject<{ comment: Comment; startPos: Position } | null>;
    subflowDragRef: MutableRefObject<{ subflow: Subflow; startPos: Position } | null>;
    touchStartRef: MutableRefObject<{ x: number; y: number; time: number } | null>;
    lastTouchRef: MutableRefObject<{ x: number; y: number }>;
    pinchStartRef: MutableRefObject<{
      distance: number;
      zoom: number;
      viewportX: number;
      viewportY: number;
      centerX: number;
      centerY: number;
    } | null>;
    longPressTimerRef: MutableRefObject<number | null>;
    lastTapTimeRef: MutableRefObject<number>;
    isTouchDeviceRef: MutableRefObject<boolean>;
    snapToGridRef: MutableRefObject<boolean>;
  };
  setters: {
    setContextMenu: (menu: { x: number; y: number; worldPos: Position; targetNode: FlowNode | null; targetCommentId?: string } | null) => void;
    setNodePalette: (palette: { x: number; y: number; worldPos: Position } | null) => void;
    setEditingCommentId: (id: string | null) => void;
    setCurrentZoom: (zoom: number) => void;
    setDraggingNodeIds: (ids: Set<string>) => void;
    setIsCanvasDragging: (dragging: boolean) => void;
  };
  callbacks: {
    setSelectedNodes: (ids: Set<string>) => void;
    forceRender: (fn: (n: number) => number) => void;
  };
  widgetInteracting: boolean;
  gridSize: number;
}

export function useCanvasTouchHandlers(params: UseCanvasTouchHandlersParams) {
  const { refs, setters, callbacks, widgetInteracting, gridSize } = params;

  const getTouchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: React.TouchList): { x: number; y: number } => {
    if (touches.length < 2) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (widgetInteracting) return;

    const canvas = refs.canvasRef.current;
    const store = refs.storeRef.current;
    if (!canvas || !store) return;

    // 롱프레스 타이머 취소
    if (refs.longPressTimerRef.current) {
      clearTimeout(refs.longPressTimerRef.current);
      refs.longPressTimerRef.current = null;
    }

    const rect = canvas.getBoundingClientRect();
    const state = store.getState();

    // 두 손가락 터치 = 핀치 줌/팬
    if (e.touches.length === 2) {
      e.preventDefault();
      const center = getTouchCenter(e.touches);
      refs.pinchStartRef.current = {
        distance: getTouchDistance(e.touches),
        zoom: state.viewport.zoom,
        viewportX: state.viewport.x,
        viewportY: state.viewport.y,
        centerX: center.x - rect.left,
        centerY: center.y - rect.top,
      };
      refs.lastTouchRef.current = center;
      refs.dragModeRef.current = 'pan';
      return;
    }

    // 한 손가락 터치
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    const canvasSize: CanvasSize = { width: rect.width, height: rect.height };

    refs.touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    refs.lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

    const worldPos = screenToWorld({ x: touchX, y: touchY }, state.viewport, canvasSize);

    // 미니맵 터치
    if (!refs.isTouchDeviceRef.current && isInMinimap({ x: touchX, y: touchY }, canvasSize)) {
      refs.dragModeRef.current = 'minimap';
      const mapWorldPos = minimapToWorld({ x: touchX, y: touchY }, state.nodes, state.viewport, canvasSize);
      state.setViewport({ ...state.viewport, x: mapWorldPos.x, y: mapWorldPos.y });
      callbacks.forceRender(n => n + 1);
      return;
    }

    // 포트 히트 테스트
    const hitPort = hitTestPort(worldPos, state.nodes);
    if (hitPort) {
      refs.dragModeRef.current = 'edge';
      refs.edgeDragRef.current = {
        startPort: hitPort,
        currentPos: worldPos,
      };

      // 호환 가능한 포트 계산
      const compatibleMap = new Map<string, CompatiblePorts>();
      const sourceNode = hitPort.node;
      const sourcePort = hitPort.port;
      const isOutput = hitPort.isOutput;
      const sourceDataType = sourcePort.dataType;

      for (const node of state.nodes) {
        if (node.id === sourceNode.id) continue;
        const targetPorts = isOutput ? node.inputs : node.outputs;
        if (!targetPorts || targetPorts.length === 0) continue;

        const portIds = new Set<string>();
        for (const port of targetPorts) {
          if (!isTypeCompatible(sourceDataType, port.dataType)) continue;
          if (!isOutput) {
            portIds.add(port.id);
          } else {
            const alreadyConnected = state.edges.some(
              edge => edge.target === node.id && edge.targetPort === port.id
            );
            if (!alreadyConnected) portIds.add(port.id);
          }
        }
        if (portIds.size > 0) {
          compatibleMap.set(node.id, { nodeId: node.id, portIds, isOutput });
        }
      }
      refs.compatiblePortsMapRef.current = compatibleMap;
      return;
    }

    // 서브플로우 히트 테스트
    const hitSubflow = hitTestCollapsedSubflow(worldPos, state.subflows);
    if (hitSubflow) {
      refs.dragModeRef.current = 'subflow';
      refs.selectedSubflowIdRef.current = hitSubflow.subflow.id;
      refs.selectedCommentIdRef.current = null;
      callbacks.setSelectedNodes(new Set());
      refs.subflowDragRef.current = {
        subflow: hitSubflow.subflow,
        startPos: hitSubflow.subflow.collapsedPosition ? { ...hitSubflow.subflow.collapsedPosition } : { x: 0, y: 0 },
      };
      return;
    }

    // 코멘트 히트 테스트
    const hitComment = hitTestComment(worldPos, state.comments);
    if (hitComment) {
      if (refs.selectedCommentIdRef.current === hitComment.id) {
        setters.setEditingCommentId(hitComment.id);
        callbacks.forceRender(n => n + 1);
        return;
      }
      refs.dragModeRef.current = 'comment';
      refs.selectedCommentIdRef.current = hitComment.id;
      refs.selectedSubflowIdRef.current = null;
      callbacks.setSelectedNodes(new Set());
      refs.commentDragRef.current = {
        comment: hitComment,
        startPos: { ...hitComment.position },
      };

      // 롱프레스 타이머 (코멘트 삭제 메뉴)
      refs.longPressTimerRef.current = window.setTimeout(() => {
        setters.setContextMenu({
          x: touch.clientX,
          y: touch.clientY,
          worldPos,
          targetNode: null,
          targetCommentId: hitComment.id,
        });
        refs.dragModeRef.current = 'none';
        refs.commentDragRef.current = null;
        setters.setIsCanvasDragging(false);
        refs.longPressTimerRef.current = null;
      }, 500);
      return;
    }

    // 노드 히트 테스트
    const visibleNodes = getVisibleNodes(state.nodes, state.subflows);
    const hitNode = hitTestNode(worldPos, visibleNodes);

    if (hitNode) {
      refs.dragModeRef.current = 'node';
      refs.selectedCommentIdRef.current = null;

      const isAlreadySelected = refs.selectedNodeIdsRef.current.has(hitNode.id);
      if (!isAlreadySelected) {
        callbacks.setSelectedNodes(new Set([hitNode.id]));
      }

      const dragPositions = new Map<string, Position>();
      const selectedIds = isAlreadySelected ? refs.selectedNodeIdsRef.current : new Set([hitNode.id]);
      for (const nodeId of selectedIds) {
        const node = state.nodes.find(n => n.id === nodeId);
        if (node) {
          dragPositions.set(nodeId, { ...node.position });
        }
      }
      refs.nodeDragPositionsRef.current = dragPositions;
      setters.setDraggingNodeIds(new Set(selectedIds));

      // 롱프레스 타이머 (컨텍스트 메뉴)
      refs.longPressTimerRef.current = window.setTimeout(() => {
        setters.setContextMenu({
          x: touch.clientX,
          y: touch.clientY,
          worldPos,
          targetNode: hitNode,
        });
        refs.dragModeRef.current = 'none';
        setters.setDraggingNodeIds(new Set());
        setters.setIsCanvasDragging(false);
        refs.longPressTimerRef.current = null;
      }, 500);
    } else {
      // 빈 공간 - 팬
      refs.dragModeRef.current = 'pan';
      refs.selectedCommentIdRef.current = null;

      // 롱프레스 타이머 (빈 공간 컨텍스트 메뉴)
      refs.longPressTimerRef.current = window.setTimeout(() => {
        setters.setContextMenu({
          x: touch.clientX,
          y: touch.clientY,
          worldPos,
          targetNode: null,
        });
        refs.dragModeRef.current = 'none';
        setters.setIsCanvasDragging(false);
        refs.longPressTimerRef.current = null;
      }, 500);
    }
  }, [widgetInteracting]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const canvas = refs.canvasRef.current;
    const store = refs.storeRef.current;
    if (!canvas || !store) return;

    // 롱프레스 타이머 취소
    if (refs.longPressTimerRef.current) {
      clearTimeout(refs.longPressTimerRef.current);
      refs.longPressTimerRef.current = null;
    }

    const rect = canvas.getBoundingClientRect();
    const state = store.getState();
    const canvasSize: CanvasSize = { width: rect.width, height: rect.height };

    // 핀치 줌
    if (e.touches.length === 2 && refs.pinchStartRef.current) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      const pinchStart = refs.pinchStartRef.current;

      const scale = currentDistance / pinchStart.distance;
      const newZoom = Math.max(ZOOM_CONFIG.MIN, Math.min(ZOOM_CONFIG.MAX, pinchStart.zoom * scale));

      const currentCenterX = center.x - rect.left;
      const currentCenterY = center.y - rect.top;

      const initialWorldX = pinchStart.viewportX + (pinchStart.centerX - canvasSize.width / 2) / pinchStart.zoom;
      const initialWorldY = pinchStart.viewportY + (pinchStart.centerY - canvasSize.height / 2) / pinchStart.zoom;

      const newX = initialWorldX - (currentCenterX - canvasSize.width / 2) / newZoom;
      const newY = initialWorldY - (currentCenterY - canvasSize.height / 2) / newZoom;

      state.setViewport({ x: newX, y: newY, zoom: newZoom });
      setters.setCurrentZoom(newZoom);
      callbacks.forceRender(n => n + 1);
      return;
    }

    // 한 손가락 터치
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - refs.lastTouchRef.current.x;
      const dy = touch.clientY - refs.lastTouchRef.current.y;
      refs.lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      if (refs.dragModeRef.current === 'pan' || refs.dragModeRef.current === 'minimap') {
        if (refs.dragModeRef.current === 'minimap') {
          const MINIMAP_SIZE = 180;
          const MINIMAP_INNER = MINIMAP_SIZE - 20;

          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const node of state.nodes) {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + node.size.width);
            maxY = Math.max(maxY, node.position.y + node.size.height);
          }

          const vpHalfW = canvasSize.width / 2 / state.viewport.zoom;

          if (state.nodes.length > 0) {
            minX = Math.min(minX, state.viewport.x - vpHalfW) - 50;
            maxX = Math.max(maxX, state.viewport.x + vpHalfW) + 50;
          }

          const worldW = maxX - minX;
          const worldH = maxY - minY;
          const mmScale = Math.min(MINIMAP_INNER / worldW, MINIMAP_INNER / (worldH || 1));

          const worldDx = dx / mmScale;
          const worldDy = dy / mmScale;

          state.setViewport({
            ...state.viewport,
            x: state.viewport.x + worldDx,
            y: state.viewport.y + worldDy,
          });
        } else {
          state.pan(-dx / state.viewport.zoom, -dy / state.viewport.zoom);
        }
        callbacks.forceRender(n => n + 1);
      } else if (refs.dragModeRef.current === 'node') {
        const dragPositions = refs.nodeDragPositionsRef.current;

        for (const [nodeId, startPos] of dragPositions) {
          const node = state.nodes.find(n => n.id === nodeId);
          if (!node) continue;

          const totalDx = (touch.clientX - (refs.touchStartRef.current?.x || 0)) / state.viewport.zoom;
          const totalDy = (touch.clientY - (refs.touchStartRef.current?.y || 0)) / state.viewport.zoom;

          let newX = startPos.x + totalDx;
          let newY = startPos.y + totalDy;

          if (refs.snapToGridRef.current) {
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
          }

          state.updateNode(nodeId, { position: { x: newX, y: newY } });
        }
        callbacks.forceRender(n => n + 1);
      } else if (refs.dragModeRef.current === 'edge' && refs.edgeDragRef.current) {
        const worldPos = screenToWorld({ x: touchX, y: touchY }, state.viewport, canvasSize);
        refs.edgeDragRef.current.currentPos = worldPos;
      } else if (refs.dragModeRef.current === 'comment' && refs.commentDragRef.current) {
        const comment = refs.commentDragRef.current.comment;
        const startPos = refs.commentDragRef.current.startPos;
        const totalDx = (touch.clientX - (refs.touchStartRef.current?.x || 0)) / state.viewport.zoom;
        const totalDy = (touch.clientY - (refs.touchStartRef.current?.y || 0)) / state.viewport.zoom;

        state.updateComment(comment.id, {
          position: { x: startPos.x + totalDx, y: startPos.y + totalDy },
        });
        callbacks.forceRender(n => n + 1);
      } else if (refs.dragModeRef.current === 'subflow' && refs.subflowDragRef.current) {
        const subflow = refs.subflowDragRef.current.subflow;
        const startPos = refs.subflowDragRef.current.startPos;
        const totalDx = (touch.clientX - (refs.touchStartRef.current?.x || 0)) / state.viewport.zoom;
        const totalDy = (touch.clientY - (refs.touchStartRef.current?.y || 0)) / state.viewport.zoom;

        state.updateSubflow(subflow.id, {
          collapsedPosition: { x: startPos.x + totalDx, y: startPos.y + totalDy },
        });
        callbacks.forceRender(n => n + 1);
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // 롱프레스 타이머 취소
    if (refs.longPressTimerRef.current) {
      clearTimeout(refs.longPressTimerRef.current);
      refs.longPressTimerRef.current = null;
    }

    const canvas = refs.canvasRef.current;
    const store = refs.storeRef.current;

    // 핀치 종료
    if (refs.pinchStartRef.current) {
      refs.pinchStartRef.current = null;
      if (e.touches.length === 1) {
        const remainingTouch = e.touches[0];
        refs.lastTouchRef.current = { x: remainingTouch.clientX, y: remainingTouch.clientY };
      }
      refs.dragModeRef.current = 'none';
      setters.setIsCanvasDragging(false);
      return;
    }

    // 엣지 드래그 완료
    if (refs.dragModeRef.current === 'edge' && refs.edgeDragRef.current && canvas && store) {
      const rect = canvas.getBoundingClientRect();
      const state = store.getState();
      const canvasSize: CanvasSize = { width: rect.width, height: rect.height };

      const touch = e.changedTouches[0];
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
      const worldPos = screenToWorld({ x: touchX, y: touchY }, state.viewport, canvasSize);
      const targetPort = hitTestPort(worldPos, state.nodes);
      const startPort = refs.edgeDragRef.current.startPort;

      if (
        targetPort &&
        targetPort.node.id !== startPort.node.id &&
        targetPort.isOutput !== startPort.isOutput &&
        isTypeCompatible(startPort.port.dataType, targetPort.port.dataType)
      ) {
        const isFromOutput = startPort.isOutput;
        const newEdge: FlowEdge = {
          id: generateId('edge'),
          source: isFromOutput ? startPort.node.id : targetPort.node.id,
          sourcePort: isFromOutput ? startPort.port.id : targetPort.port.id,
          target: isFromOutput ? targetPort.node.id : startPort.node.id,
          targetPort: isFromOutput ? targetPort.port.id : startPort.port.id,
        };
        state.addEdge(newEdge);
      }

      refs.edgeDragRef.current = null;
      refs.compatiblePortsMapRef.current = null;
    }

    // 더블 탭 감지
    const now = Date.now();
    const touchStart = refs.touchStartRef.current;
    if (touchStart && canvas && store) {
      const touchDuration = now - touchStart.time;
      const touchDistance = Math.sqrt(
        Math.pow(refs.lastTouchRef.current.x - touchStart.x, 2) +
        Math.pow(refs.lastTouchRef.current.y - touchStart.y, 2)
      );

      if (touchDuration < 300 && touchDistance < 10) {
        const timeSinceLastTap = now - refs.lastTapTimeRef.current;

        if (timeSinceLastTap < 300) {
          const rect = canvas.getBoundingClientRect();
          const state = store.getState();
          const touchX = touchStart.x - rect.left;
          const touchY = touchStart.y - rect.top;
          const canvasSize: CanvasSize = { width: rect.width, height: rect.height };
          const worldPos = screenToWorld({ x: touchX, y: touchY }, state.viewport, canvasSize);

          const hitSubflow = hitTestCollapsedSubflow(worldPos, state.subflows);
          if (hitSubflow) {
            state.expandSubflow(hitSubflow.subflow.id);
            refs.selectedSubflowIdRef.current = hitSubflow.subflow.id;
          } else {
            const hitComment = hitTestComment(worldPos, state.comments);
            if (hitComment) {
              setters.setEditingCommentId(hitComment.id);
              refs.selectedCommentIdRef.current = hitComment.id;
              callbacks.forceRender(n => n + 1);
            } else {
              const visibleNodes = getVisibleNodes(state.nodes, state.subflows);
              const hitNode = hitTestNode(worldPos, visibleNodes);
              if (!hitNode) {
                setters.setNodePalette({
                  x: touchStart.x - 140,
                  y: touchStart.y - 100,
                  worldPos,
                });
              }
            }
          }
          refs.lastTapTimeRef.current = 0;
        } else {
          refs.lastTapTimeRef.current = now;
        }
      }
    }

    // 드래그 상태 정리
    if (refs.dragModeRef.current === 'node') {
      refs.nodeDragPositionsRef.current.clear();
      refs.snapLinesRef.current = [];
    }
    if (refs.dragModeRef.current === 'subflow') {
      refs.subflowDragRef.current = null;
    }
    if (refs.dragModeRef.current === 'comment') {
      refs.commentDragRef.current = null;
    }

    refs.dragModeRef.current = 'none';
    setters.setDraggingNodeIds(new Set());
    setters.setIsCanvasDragging(false);
    refs.touchStartRef.current = null;
  }, []);

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}
