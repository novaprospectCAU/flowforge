import { useCallback, useEffect, type MutableRefObject } from 'react';
import {
  screenToWorld,
  hitTestNode,
  hitTestPort,
  hitTestEdge,
  hitTestResizeHandle,
  hitTestGroups,
  hitTestCollapsedSubflow,
  hitTestComment,
  isNodeInSelectionBox,
  isInMinimap,
  minimapToWorld,
  calculateSnap,
  type PortHitResult,
  type ResizeHandle,
  type SnapLine,
  type CompatiblePorts,
} from '@flowforge/canvas';
import {
  getVisibleNodes,
  generateId,
  type FlowStore,
} from '@flowforge/state';
import { ZOOM_CONFIG, type FlowNode, type FlowEdge, type CanvasSize, type Position, type DataType, type Comment, type Subflow } from '@flowforge/types';

type DragMode = 'none' | 'pan' | 'node' | 'edge' | 'box' | 'minimap' | 'resize' | 'group' | 'comment' | 'subflow';

/**
 * 데이터 타입 호환성 검사
 */
function isTypeCompatible(sourceType: DataType, targetType: DataType): boolean {
  if (sourceType === 'any' || targetType === 'any') return true;
  return sourceType === targetType;
}

/**
 * 리사이즈 핸들에 따른 커서 스타일
 */
function getResizeCursor(handle: ResizeHandle): string {
  switch (handle) {
    case 'top-left':
    case 'bottom-right':
      return 'nwse-resize';
    case 'top-right':
    case 'bottom-left':
      return 'nesw-resize';
    case 'top':
    case 'bottom':
      return 'ns-resize';
    case 'left':
    case 'right':
      return 'ew-resize';
  }
}

export interface UseCanvasMouseHandlersParams {
  refs: {
    canvasRef: MutableRefObject<HTMLCanvasElement | null>;
    storeRef: MutableRefObject<FlowStore | null>;
    dragModeRef: MutableRefObject<DragMode>;
    lastMouseRef: MutableRefObject<{ x: number; y: number }>;
    selectedNodeIdsRef: MutableRefObject<Set<string>>;
    selectedCommentIdRef: MutableRefObject<string | null>;
    selectedSubflowIdRef: MutableRefObject<string | null>;
    edgeDragRef: MutableRefObject<{ startPort: PortHitResult; currentPos: Position } | null>;
    boxSelectRef: MutableRefObject<{ start: Position; end: Position } | null>;
    nodeDragPositionsRef: MutableRefObject<Map<string, Position>>;
    resizeRef: MutableRefObject<{
      node: FlowNode;
      handle: ResizeHandle;
      startPos: Position;
      startSize: { width: number; height: number };
      startNodePos: Position;
    } | null>;
    snapLinesRef: MutableRefObject<SnapLine[]>;
    compatiblePortsMapRef: MutableRefObject<Map<string, CompatiblePorts> | null>;
    commentDragRef: MutableRefObject<{ comment: Comment; startPos: Position } | null>;
    subflowDragRef: MutableRefObject<{ subflow: Subflow; startPos: Position } | null>;
    isTouchDeviceRef: MutableRefObject<boolean>;
    snapToGridRef: MutableRefObject<boolean>;
  };
  setters: {
    setContextMenu: (menu: { x: number; y: number; worldPos: Position; targetNode: FlowNode | null; targetCommentId?: string } | null) => void;
    setNodePalette: (palette: { x: number; y: number; worldPos: Position } | null) => void;
    setEditingCommentId: (id: string | null) => void;
    setCurrentZoom: (zoom: number) => void;
    setCursorStyle: (cursor: string) => void;
    setDraggingNodeIds: (ids: Set<string>) => void;
    setIsCanvasDragging: (dragging: boolean) => void;
  };
  callbacks: {
    setSelectedNodes: (ids: Set<string>) => void;
    toggleNodeSelection: (id: string, addToSelection: boolean) => void;
    snapPosition: (pos: Position) => Position;
    forceRender: (fn: (n: number) => number) => void;
  };
  spacePressed: boolean;
  widgetInteracting: boolean;
  gridSize: number;
  minNodeSize: { width: number; height: number };
}

export function useCanvasMouseHandlers(params: UseCanvasMouseHandlersParams) {
  const { refs, setters, callbacks, spacePressed, widgetInteracting, gridSize, minNodeSize } = params;

  // 마우스 다운 - 포트/노드 선택 또는 Pan 시작
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 위젯 인터랙션 중이면 캔버스 이벤트 무시
    if (widgetInteracting) return;

    // 중간 버튼 (휠 클릭) = Pan
    if (e.button === 1) {
      e.preventDefault();
      refs.dragModeRef.current = 'pan';
      refs.lastMouseRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button !== 0) return; // 좌클릭만

    // Space 키 + 좌클릭 = Pan (Figma 스타일)
    if (spacePressed) {
      refs.dragModeRef.current = 'pan';
      refs.lastMouseRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const canvas = refs.canvasRef.current;
    const store = refs.storeRef.current;
    if (!canvas || !store) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const canvasSize: CanvasSize = { width: rect.width, height: rect.height };

    const state = store.getState();

    // 미니맵 클릭 체크 (터치 기기에서는 미니맵 숨김)
    if (!refs.isTouchDeviceRef.current && isInMinimap({ x: mouseX, y: mouseY }, canvasSize)) {
      refs.dragModeRef.current = 'minimap';
      refs.lastMouseRef.current = { x: e.clientX, y: e.clientY };
      // 클릭 위치로 즉시 이동
      const worldPos = minimapToWorld({ x: mouseX, y: mouseY }, state.nodes, state.viewport, canvasSize);
      state.setViewport({ ...state.viewport, x: worldPos.x, y: worldPos.y });
      callbacks.forceRender(n => n + 1); // 위젯 위치 업데이트
      return;
    }

    const worldPos = screenToWorld({ x: mouseX, y: mouseY }, state.viewport, canvasSize);

    // 포트 히트 테스트 (리사이즈보다 우선)
    const selectedIds = refs.selectedNodeIdsRef.current;
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
        if (node.id === sourceNode.id) continue; // 같은 노드 제외

        // 출력에서 드래그 중이면 다른 노드의 입력 포트만 대상
        // 입력에서 드래그 중이면 다른 노드의 출력 포트만 대상
        const targetPorts = isOutput ? node.inputs : node.outputs;
        if (!targetPorts || targetPorts.length === 0) continue;

        const portIds = new Set<string>();
        for (const port of targetPorts) {
          // 데이터 타입 호환성 검사
          if (!isTypeCompatible(sourceDataType, port.dataType)) {
            continue; // 비호환 타입은 제외
          }

          if (!isOutput) {
            // 입력에서 드래그 → 출력 포트 대상
            portIds.add(port.id);
          } else {
            // 출력에서 드래그 → 입력 포트 대상
            // 이미 연결된 입력 포트는 제외
            const alreadyConnected = state.edges.some(
              e => e.target === node.id && e.targetPort === port.id
            );
            if (!alreadyConnected) {
              portIds.add(port.id);
            }
          }
        }

        if (portIds.size > 0) {
          compatibleMap.set(node.id, {
            nodeId: node.id,
            portIds,
            isOutput,
          });
        }
      }

      refs.compatiblePortsMapRef.current = compatibleMap;
      return;
    }

    // 리사이즈 핸들 체크 (선택된 노드가 있을 때만, 포트보다 후순위)
    if (selectedIds.size > 0) {
      const resizeHit = hitTestResizeHandle(worldPos, state.nodes, selectedIds);
      if (resizeHit) {
        refs.dragModeRef.current = 'resize';
        refs.lastMouseRef.current = { x: e.clientX, y: e.clientY };
        refs.resizeRef.current = {
          node: resizeHit.node,
          handle: resizeHit.handle,
          startPos: worldPos,
          startSize: { ...resizeHit.node.size },
          startNodePos: { ...resizeHit.node.position },
        };
        setters.setIsCanvasDragging(true); // 위젯 pointerEvents 비활성화 (mouseleave 방지)
        return;
      }
    }

    // 엣지 클릭 확인 (삭제)
    const hitEdge = hitTestEdge(worldPos, state.edges, state.nodes);
    if (hitEdge) {
      state.deleteEdge(hitEdge.id);
      return;
    }

    // 그룹 헤더 클릭 확인
    const hitGroup = hitTestGroups(worldPos, state.groups, state.nodes);
    if (hitGroup) {
      // 그룹의 모든 노드 선택
      const groupNodeIds = new Set(hitGroup.nodeIds);
      callbacks.setSelectedNodes(groupNodeIds);
      refs.dragModeRef.current = 'node';
      setters.setDraggingNodeIds(groupNodeIds); // 드래그 중인 노드 ID 설정
      refs.lastMouseRef.current = { x: e.clientX, y: e.clientY };

      // 드래그 시작 시 선택된 노드들의 현재 위치 저장
      const dragPositions = new Map<string, Position>();
      for (const nodeId of groupNodeIds) {
        const node = state.nodes.find(n => n.id === nodeId);
        if (node) {
          dragPositions.set(nodeId, { ...node.position });
        }
      }
      refs.nodeDragPositionsRef.current = dragPositions;
      return;
    }

    // 접힌 서브플로우 히트 테스트 (노드보다 먼저)
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
      refs.lastMouseRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // 코멘트 히트 테스트 (노드보다 먼저)
    const hitComment = hitTestComment(worldPos, state.comments);
    if (hitComment) {
      refs.dragModeRef.current = 'comment';
      refs.selectedCommentIdRef.current = hitComment.id;
      refs.selectedSubflowIdRef.current = null;
      callbacks.setSelectedNodes(new Set()); // 노드 선택 해제
      refs.commentDragRef.current = {
        comment: hitComment,
        startPos: { ...hitComment.position },
      };
      refs.lastMouseRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // 보이는 노드만 히트 테스트에 사용
    const visibleNodes = getVisibleNodes(state.nodes, state.subflows);
    const hitNode = hitTestNode(worldPos, visibleNodes);
    refs.lastMouseRef.current = { x: e.clientX, y: e.clientY };

    if (hitNode) {
      // 노드 드래그 모드
      refs.dragModeRef.current = 'node';
      refs.selectedCommentIdRef.current = null; // 코멘트 선택 해제

      // 이미 선택된 노드면 선택 유지, 아니면 선택 변경
      const isAlreadySelected = refs.selectedNodeIdsRef.current.has(hitNode.id);
      if (e.shiftKey) {
        callbacks.toggleNodeSelection(hitNode.id, true);
      } else if (!isAlreadySelected) {
        callbacks.setSelectedNodes(new Set([hitNode.id]));
      }
      // 이미 선택된 노드를 Shift 없이 클릭하면 선택 유지

      // 드래그 시작 시 선택된 노드들의 현재 위치 저장
      const dragPositions = new Map<string, Position>();
      const currentSelectedIds = isAlreadySelected ? refs.selectedNodeIdsRef.current : new Set([hitNode.id]);
      for (const nodeId of currentSelectedIds) {
        const node = state.nodes.find(n => n.id === nodeId);
        if (node) {
          dragPositions.set(nodeId, { ...node.position });
        }
      }
      refs.nodeDragPositionsRef.current = dragPositions;
      setters.setDraggingNodeIds(new Set(currentSelectedIds)); // 드래그 중인 노드 ID 설정
    } else {
      refs.selectedCommentIdRef.current = null; // 빈 공간 클릭 시 코멘트 선택 해제
      // Alt 키 = Pan, 그 외 = 박스 선택
      if (e.altKey) {
        refs.dragModeRef.current = 'pan';
        setters.setIsCanvasDragging(true);
      } else {
        // 박스 선택 모드 (빈 공간 드래그)
        refs.dragModeRef.current = 'box';
        setters.setIsCanvasDragging(true);
        refs.boxSelectRef.current = {
          start: worldPos,
          end: worldPos,
        };
        if (!e.shiftKey) {
          callbacks.setSelectedNodes(new Set());
        }
      }
    }
  }, [spacePressed, widgetInteracting]);

  // 마우스 이동 - 노드/엣지 드래그 또는 Pan, 커서 변경
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = refs.canvasRef.current;
    if (!canvas || !refs.storeRef.current) return;

    const state = refs.storeRef.current.getState();

    // 드래그 중이 아닐 때 커서 업데이트
    if (refs.dragModeRef.current === 'none') {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const canvasSize: CanvasSize = { width: rect.width, height: rect.height };
      const worldPos = screenToWorld({ x: mouseX, y: mouseY }, state.viewport, canvasSize);

      // 포트 히트 테스트 (리사이즈보다 우선)
      const hitPort = hitTestPort(worldPos, state.nodes);
      if (hitPort) {
        setters.setCursorStyle('crosshair');
        return;
      }

      // 리사이즈 핸들 체크 (선택된 노드가 있을 때만)
      const selectedIds = refs.selectedNodeIdsRef.current;
      if (selectedIds.size > 0) {
        const resizeHit = hitTestResizeHandle(worldPos, state.nodes, selectedIds);
        if (resizeHit) {
          setters.setCursorStyle(getResizeCursor(resizeHit.handle));
          return;
        }
      }
      setters.setCursorStyle('grab');
      return;
    }

    const dx = e.clientX - refs.lastMouseRef.current.x;
    const dy = e.clientY - refs.lastMouseRef.current.y;
    refs.lastMouseRef.current = { x: e.clientX, y: e.clientY };

    if (refs.dragModeRef.current === 'pan') {
      state.pan(-dx / state.viewport.zoom, -dy / state.viewport.zoom);
      callbacks.forceRender(n => n + 1); // 위젯 위치 업데이트를 위해 리렌더 트리거
    } else if (refs.dragModeRef.current === 'node') {
      // 선택된 모든 노드 이동
      const dragPositions = refs.nodeDragPositionsRef.current;
      const draggedNodeIds = Array.from(dragPositions.keys());
      const draggedNodes = state.nodes.filter(n => draggedNodeIds.includes(n.id));

      // 첫 번째 노드 기준으로 새 위치 계산
      const firstNodeId = draggedNodeIds[0];
      const firstFloatPos = dragPositions.get(firstNodeId)!;
      let newFirstPos = {
        x: firstFloatPos.x + dx / state.viewport.zoom,
        y: firstFloatPos.y + dy / state.viewport.zoom,
      };

      // 스냅 라인 계산 (그리드 스냅이 OFF일 때만)
      if (!refs.snapToGridRef.current) {
        const snapResult = calculateSnap(draggedNodes, state.nodes, newFirstPos);
        refs.snapLinesRef.current = snapResult.lines;

        // 스냅 적용
        if (snapResult.x !== null) {
          newFirstPos.x = snapResult.x;
        }
        if (snapResult.y !== null) {
          newFirstPos.y = snapResult.y;
        }
      } else {
        refs.snapLinesRef.current = [];
      }

      // 모든 노드 위치 업데이트
      const offsetX = newFirstPos.x - firstFloatPos.x;
      const offsetY = newFirstPos.y - firstFloatPos.y;

      for (const [nodeId, floatPos] of dragPositions) {
        const newFloatPos = {
          x: floatPos.x + dx / state.viewport.zoom,
          y: floatPos.y + dy / state.viewport.zoom,
        };
        dragPositions.set(nodeId, newFloatPos);

        // 화면 위치 계산
        let displayPos = {
          x: newFloatPos.x + (offsetX - dx / state.viewport.zoom),
          y: newFloatPos.y + (offsetY - dy / state.viewport.zoom),
        };

        // 그리드 스냅 적용
        if (refs.snapToGridRef.current) {
          displayPos = callbacks.snapPosition(displayPos);
        }

        state.updateNode(nodeId, { position: displayPos });
      }
    } else if (refs.dragModeRef.current === 'edge' && refs.edgeDragRef.current) {
      // 엣지 드래그 중 - 현재 마우스 위치 업데이트
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const canvasSize: CanvasSize = { width: rect.width, height: rect.height };
      refs.edgeDragRef.current.currentPos = screenToWorld(
        { x: mouseX, y: mouseY },
        state.viewport,
        canvasSize
      );
    } else if (refs.dragModeRef.current === 'box' && refs.boxSelectRef.current) {
      // 박스 선택 드래그 중
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const canvasSize: CanvasSize = { width: rect.width, height: rect.height };
      refs.boxSelectRef.current.end = screenToWorld(
        { x: mouseX, y: mouseY },
        state.viewport,
        canvasSize
      );
    } else if (refs.dragModeRef.current === 'minimap') {
      // 미니맵 드래그 - 델타 기반으로 뷰포트 이동 (더 부드럽게)
      // 미니맵의 스케일에 맞춰 마우스 delta를 월드 delta로 변환
      const MINIMAP_SIZE = 180; // 미니맵 너비
      const MINIMAP_INNER = MINIMAP_SIZE - 20; // padding 제외

      // 노드 바운딩 박스 계산
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const node of state.nodes) {
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + node.size.width);
        maxY = Math.max(maxY, node.position.y + node.size.height);
      }

      const rect = canvas.getBoundingClientRect();
      const canvasSize: CanvasSize = { width: rect.width, height: rect.height };
      const vpHalfW = canvasSize.width / 2 / state.viewport.zoom;
      const vpHalfH = canvasSize.height / 2 / state.viewport.zoom;

      if (state.nodes.length > 0) {
        minX = Math.min(minX, state.viewport.x - vpHalfW) - 50;
        minY = Math.min(minY, state.viewport.y - vpHalfH) - 50;
        maxX = Math.max(maxX, state.viewport.x + vpHalfW) + 50;
        maxY = Math.max(maxY, state.viewport.y + vpHalfH) + 50;
      } else {
        minX = state.viewport.x - vpHalfW - 50;
        maxX = state.viewport.x + vpHalfW + 50;
      }

      const worldW = maxX - minX;
      const worldH = maxY - minY;
      const scale = Math.min(MINIMAP_INNER / worldW, MINIMAP_INNER / (worldH || 1));

      // 마우스 델타를 월드 델타로 변환
      const worldDx = dx / scale;
      const worldDy = dy / scale;

      state.setViewport({
        ...state.viewport,
        x: state.viewport.x + worldDx,
        y: state.viewport.y + worldDy,
      });
      callbacks.forceRender(n => n + 1); // 위젯 위치 업데이트
    } else if (refs.dragModeRef.current === 'resize' && refs.resizeRef.current) {
      // 노드 리사이즈
      const resize = refs.resizeRef.current;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const canvasSize: CanvasSize = { width: rect.width, height: rect.height };
      const currentWorldPos = screenToWorld({ x: mouseX, y: mouseY }, state.viewport, canvasSize);

      const deltaX = currentWorldPos.x - resize.startPos.x;
      const deltaY = currentWorldPos.y - resize.startPos.y;

      // 고정되어야 할 가장자리 위치
      const rightEdge = resize.startNodePos.x + resize.startSize.width;
      const bottomEdge = resize.startNodePos.y + resize.startSize.height;

      let newWidth = resize.startSize.width;
      let newHeight = resize.startSize.height;
      let newX = resize.startNodePos.x;
      let newY = resize.startNodePos.y;

      // 핸들에 따라 어떤 방향으로 리사이즈하는지 결정
      const resizesLeft = resize.handle.includes('left');
      const resizesRight = resize.handle.includes('right') || resize.handle === 'right';
      const resizesTop = resize.handle.includes('top');
      const resizesBottom = resize.handle.includes('bottom') || resize.handle === 'bottom';

      // 가로 크기 계산
      if (resizesRight) {
        newWidth = Math.max(minNodeSize.width, resize.startSize.width + deltaX);
        if (refs.snapToGridRef.current) {
          newWidth = Math.round(newWidth / gridSize) * gridSize;
        }
      } else if (resizesLeft) {
        newWidth = Math.max(minNodeSize.width, resize.startSize.width - deltaX);
        if (refs.snapToGridRef.current) {
          newWidth = Math.round(newWidth / gridSize) * gridSize;
        }
        // 오른쪽 가장자리 고정
        newX = rightEdge - newWidth;
      }

      // 세로 크기 계산
      if (resizesBottom) {
        newHeight = Math.max(minNodeSize.height, resize.startSize.height + deltaY);
        if (refs.snapToGridRef.current) {
          newHeight = Math.round(newHeight / gridSize) * gridSize;
        }
      } else if (resizesTop) {
        newHeight = Math.max(minNodeSize.height, resize.startSize.height - deltaY);
        if (refs.snapToGridRef.current) {
          newHeight = Math.round(newHeight / gridSize) * gridSize;
        }
        // 아래쪽 가장자리 고정
        newY = bottomEdge - newHeight;
      }

      state.updateNode(resize.node.id, {
        size: { width: newWidth, height: newHeight },
        position: { x: newX, y: newY },
      });
    } else if (refs.dragModeRef.current === 'comment' && refs.commentDragRef.current) {
      // 코멘트 드래그
      const commentDrag = refs.commentDragRef.current;
      const newPos = {
        x: commentDrag.startPos.x + dx / state.viewport.zoom,
        y: commentDrag.startPos.y + dy / state.viewport.zoom,
      };
      refs.commentDragRef.current.startPos = newPos;
      state.updateComment(commentDrag.comment.id, { position: newPos });
      callbacks.forceRender(n => n + 1); // 위젯 위치 업데이트
    } else if (refs.dragModeRef.current === 'subflow' && refs.subflowDragRef.current) {
      // 서브플로우 드래그
      const subflowDrag = refs.subflowDragRef.current;
      const newPos = {
        x: subflowDrag.startPos.x + dx / state.viewport.zoom,
        y: subflowDrag.startPos.y + dy / state.viewport.zoom,
      };
      refs.subflowDragRef.current.startPos = newPos;
      state.updateSubflow(subflowDrag.subflow.id, { collapsedPosition: newPos });
    }
  }, []);

  // 마우스 업 - 드래그 종료, 엣지 생성
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const canvas = refs.canvasRef.current;
    const store = refs.storeRef.current;

    // 엣지 드래그 완료 시 연결 시도
    if (refs.dragModeRef.current === 'edge' && refs.edgeDragRef.current && canvas && store) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const canvasSize: CanvasSize = { width: rect.width, height: rect.height };

      const state = store.getState();
      const worldPos = screenToWorld({ x: mouseX, y: mouseY }, state.viewport, canvasSize);
      const targetPort = hitTestPort(worldPos, state.nodes);

      const startPort = refs.edgeDragRef.current.startPort;

      // 유효한 연결인지 확인 (출력→입력 또는 입력→출력, 다른 노드, 타입 호환)
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
      refs.compatiblePortsMapRef.current = null; // 호환 포트 맵 정리
    }

    // 박스 선택 완료 시 노드 선택
    if (refs.dragModeRef.current === 'box' && refs.boxSelectRef.current && store) {
      const box = refs.boxSelectRef.current;
      const state = store.getState();
      const newSelection = new Set<string>(e.shiftKey ? refs.selectedNodeIdsRef.current : []);

      for (const node of state.nodes) {
        if (isNodeInSelectionBox(
          node.position,
          node.size.width,
          node.size.height,
          box.start,
          box.end
        )) {
          newSelection.add(node.id);
        }
      }

      callbacks.setSelectedNodes(newSelection);
      refs.boxSelectRef.current = null;
    }

    // 노드 드래그 종료 시 위치 맵 및 스냅 라인 정리
    if (refs.dragModeRef.current === 'node') {
      refs.nodeDragPositionsRef.current.clear();
      refs.snapLinesRef.current = [];
    }

    // 서브플로우 드래그 종료 시 정리
    if (refs.dragModeRef.current === 'subflow') {
      refs.subflowDragRef.current = null;
    }

    // 리사이즈 종료 시 정리
    if (refs.dragModeRef.current === 'resize') {
      refs.resizeRef.current = null;
    }

    // 코멘트 드래그 종료 시 정리
    if (refs.dragModeRef.current === 'comment') {
      refs.commentDragRef.current = null;
    }

    refs.dragModeRef.current = 'none';
    setters.setDraggingNodeIds(new Set()); // 드래그 중인 노드 초기화
    setters.setIsCanvasDragging(false);
    setters.setCursorStyle('grab');
  }, []);

  // 우클릭 컨텍스트 메뉴
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    const canvas = refs.canvasRef.current;
    const store = refs.storeRef.current;
    if (!canvas || !store) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const canvasSize: CanvasSize = { width: rect.width, height: rect.height };

    const state = store.getState();
    const worldPos = screenToWorld({ x: mouseX, y: mouseY }, state.viewport, canvasSize);

    // 접힌 서브플로우 체크 먼저
    const hitSubflow = hitTestCollapsedSubflow(worldPos, state.subflows);
    if (hitSubflow) {
      // 서브플로우 컨텍스트 메뉴 (서브플로우 내 첫 노드를 타겟으로)
      const firstNodeId = hitSubflow.subflow.nodeIds[0];
      const firstNode = state.nodes.find(n => n.id === firstNodeId);
      refs.selectedSubflowIdRef.current = hitSubflow.subflow.id;
      setters.setContextMenu({
        x: e.clientX,
        y: e.clientY,
        worldPos,
        targetNode: firstNode ?? null,
      });
      return;
    }

    // 보이는 노드만 히트 테스트
    const visibleNodes = getVisibleNodes(state.nodes, state.subflows);
    const targetNode = hitTestNode(worldPos, visibleNodes);

    setters.setContextMenu({
      x: e.clientX,
      y: e.clientY,
      worldPos,
      targetNode,
    });
  }, []);

  // 더블클릭 - 코멘트 편집 또는 빈 공간에서 노드 팔레트 열기
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const canvas = refs.canvasRef.current;
    const store = refs.storeRef.current;
    if (!canvas || !store) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const canvasSize: CanvasSize = { width: rect.width, height: rect.height };

    const state = store.getState();
    const worldPos = screenToWorld({ x: mouseX, y: mouseY }, state.viewport, canvasSize);

    // 접힌 서브플로우 더블클릭 - 펼치기
    const hitSubflow = hitTestCollapsedSubflow(worldPos, state.subflows);
    if (hitSubflow) {
      state.expandSubflow(hitSubflow.subflow.id);
      refs.selectedSubflowIdRef.current = hitSubflow.subflow.id;
      return;
    }

    // 코멘트 더블클릭 - 편집 모드
    const hitComment = hitTestComment(worldPos, state.comments);
    if (hitComment) {
      setters.setEditingCommentId(hitComment.id);
      refs.selectedCommentIdRef.current = hitComment.id;
      callbacks.forceRender(n => n + 1);
      return;
    }

    // 보이는 노드만 히트 테스트
    const visibleNodes = getVisibleNodes(state.nodes, state.subflows);
    const hitNode = hitTestNode(worldPos, visibleNodes);
    if (hitNode) return;

    // 빈 공간에서 더블클릭 - 노드 팔레트 열기
    setters.setNodePalette({
      x: e.clientX - 140, // 팔레트 중앙 정렬
      y: e.clientY - 100,
      worldPos,
    });
  }, []);

  // Zoom (passive: false로 등록해야 preventDefault 가능)
  useEffect(() => {
    const canvas = refs.canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!refs.storeRef.current) return;

      const state = refs.storeRef.current.getState();
      const rect = canvas.getBoundingClientRect();

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const canvasSize: CanvasSize = { width: rect.width, height: rect.height };

      const worldPos = screenToWorld({ x: mouseX, y: mouseY }, state.viewport, canvasSize);

      const zoomFactor = e.deltaY > 0 ? ZOOM_CONFIG.WHEEL_OUT : ZOOM_CONFIG.WHEEL_IN;
      const newZoom = Math.max(ZOOM_CONFIG.MIN, Math.min(ZOOM_CONFIG.MAX, state.viewport.zoom * zoomFactor));

      const newX = worldPos.x - (mouseX - canvasSize.width / 2) / newZoom;
      const newY = worldPos.y - (mouseY - canvasSize.height / 2) / newZoom;

      state.setViewport({ x: newX, y: newY, zoom: newZoom });
      setters.setCurrentZoom(newZoom);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleDoubleClick,
  };
}
