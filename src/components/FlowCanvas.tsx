import { useEffect, useRef, useCallback, useState } from 'react';
import {
  createRenderer,
  drawGrid,
  drawNodes,
  drawEdges,
  drawTempEdge,
  drawMinimap,
  drawSelectionBox,
  isNodeInSelectionBox,
  screenToWorld,
  hitTestNode,
  hitTestPort,
  hitTestEdge,
  type IRenderer,
  type PortHitResult,
} from '@flowforge/canvas';
import {
  createFlowStore,
  nodeTypeRegistry,
  executeFlow,
  type FlowStore,
  type NodeTypeDefinition,
  type ExecutionState,
} from '@flowforge/state';
import type { FlowNode, FlowEdge, CanvasSize, Position, ExecutionStatus } from '@flowforge/types';
import { ContextMenu, type MenuItem } from './ContextMenu';
import { NodePalette } from './NodePalette';
import { PropertyPanel } from './PropertyPanel';

type DragMode = 'none' | 'pan' | 'node' | 'edge' | 'box';

// 테스트용 노드들
const DEMO_NODES: FlowNode[] = [
  {
    id: 'node-1',
    type: 'Input',
    position: { x: -200, y: -100 },
    size: { width: 180, height: 100 },
    data: { title: 'Load Image' },
    inputs: [],
    outputs: [
      { id: 'out-1', name: 'image', dataType: 'any' },
    ],
  },
  {
    id: 'node-2',
    type: 'Process',
    position: { x: 100, y: -80 },
    size: { width: 180, height: 120 },
    data: { title: 'Resize' },
    inputs: [
      { id: 'in-1', name: 'image', dataType: 'any' },
      { id: 'in-2', name: 'scale', dataType: 'number' },
    ],
    outputs: [
      { id: 'out-1', name: 'image', dataType: 'any' },
    ],
  },
  {
    id: 'node-3',
    type: 'Output',
    position: { x: 400, y: -60 },
    size: { width: 180, height: 100 },
    data: { title: 'Save Image' },
    inputs: [
      { id: 'in-1', name: 'image', dataType: 'any' },
    ],
    outputs: [],
  },
];

// 테스트용 엣지
const DEMO_EDGES: FlowEdge[] = [
  {
    id: 'edge-1',
    source: 'node-1',
    sourcePort: 'out-1',
    target: 'node-2',
    targetPort: 'in-1',
  },
];

export function FlowCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<IRenderer | null>(null);
  const storeRef = useRef<FlowStore | null>(null);
  const rafRef = useRef<number>(0);
  const dragModeRef = useRef<DragMode>('none');
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const selectedNodeIdsRef = useRef<Set<string>>(new Set());
  const edgeDragRef = useRef<{
    startPort: PortHitResult;
    currentPos: Position;
  } | null>(null);
  const boxSelectRef = useRef<{
    start: Position;
    end: Position;
  } | null>(null);
  const clipboardRef = useRef<{
    nodes: FlowNode[];
    edges: FlowEdge[];
  } | null>(null);
  const [, forceRender] = useState(0);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    worldPos: Position;
    targetNode: FlowNode | null;
  } | null>(null);
  const [nodePalette, setNodePalette] = useState<{
    x: number;
    y: number;
    worldPos: Position;
  } | null>(null);
  const [executionState, setExecutionState] = useState<ExecutionState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const GRID_SIZE = 20; // 스냅 그리드 크기

  // 그리드에 스냅
  const snapPosition = (pos: Position): Position => {
    if (!snapToGrid) return pos;
    return {
      x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE,
    };
  };

  const setSelectedNodes = (ids: Set<string>) => {
    selectedNodeIdsRef.current = ids;
    forceRender(n => n + 1);
  };

  const toggleNodeSelection = (id: string, addToSelection: boolean) => {
    const current = selectedNodeIdsRef.current;
    if (addToSelection) {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setSelectedNodes(next);
    } else {
      setSelectedNodes(new Set([id]));
    }
  };

  // 렌더 루프
  const render = useCallback(() => {
    const renderer = rendererRef.current;
    const store = storeRef.current;
    const canvas = canvasRef.current;

    if (!renderer || !store || !canvas) return;

    const state = store.getState();
    const dpr = window.devicePixelRatio || 1;
    const canvasSize = {
      width: canvas.clientWidth,
      height: canvas.clientHeight,
    };

    // 캔버스 크기 조정
    if (canvas.width !== canvasSize.width * dpr || canvas.height !== canvasSize.height * dpr) {
      canvas.width = canvasSize.width * dpr;
      canvas.height = canvasSize.height * dpr;
    }

    // 선택된 노드 Set (ref에서 읽기)
    const selectedIds = selectedNodeIdsRef.current;

    // 렌더링
    renderer.beginFrame();
    renderer.setTransform(state.viewport, canvasSize, dpr);

    // 그리드 배경
    drawGrid(renderer, state.viewport, canvasSize);

    // 엣지 (노드 아래)
    drawEdges(renderer, state.edges, state.nodes);

    // 드래그 중인 임시 엣지
    const edgeDrag = edgeDragRef.current;
    if (edgeDrag) {
      drawTempEdge(
        renderer,
        edgeDrag.startPort.position,
        edgeDrag.currentPos,
        edgeDrag.startPort.isOutput
      );
    }

    // 노드 - 실행 상태 맵 생성
    const nodeExecStates = new Map<string, ExecutionStatus>();
    if (executionState) {
      for (const [nodeId, nodeState] of executionState.nodeStates) {
        nodeExecStates.set(nodeId, nodeState.status);
      }
    }
    drawNodes(renderer, state.nodes, selectedIds, nodeExecStates);

    // 박스 선택
    const boxSelect = boxSelectRef.current;
    if (boxSelect) {
      drawSelectionBox(renderer, boxSelect.start, boxSelect.end);
    }

    // 미니맵 (스크린 좌표로 그림)
    drawMinimap(renderer, state.nodes, state.viewport, canvasSize, dpr);

    renderer.endFrame();

    rafRef.current = requestAnimationFrame(render);
  }, []);

  // 초기화
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let mounted = true;

    (async () => {
      // 렌더러 생성
      const renderer = await createRenderer(canvas);
      if (!mounted) {
        renderer.dispose();
        return;
      }
      rendererRef.current = renderer;

      // 스토어 생성 및 데모 노드 추가
      const store = createFlowStore();
      storeRef.current = store;

      // 데모 노드 추가
      for (const node of DEMO_NODES) {
        store.getState().addNode(node);
      }

      // 데모 엣지 추가
      for (const edge of DEMO_EDGES) {
        store.getState().addEdge(edge);
      }

      // 렌더 루프 시작
      rafRef.current = requestAnimationFrame(render);
    })();

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      rendererRef.current?.dispose();
    };
  }, []);

  // 마우스 다운 - 포트/노드 선택 또는 Pan 시작
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 중간 버튼 (휠 클릭) = Pan
    if (e.button === 1) {
      e.preventDefault();
      dragModeRef.current = 'pan';
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button !== 0) return; // 좌클릭만

    const canvas = canvasRef.current;
    const store = storeRef.current;
    if (!canvas || !store) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const canvasSize: CanvasSize = { width: rect.width, height: rect.height };

    const state = store.getState();
    const worldPos = screenToWorld({ x: mouseX, y: mouseY }, state.viewport, canvasSize);

    // 포트 히트 테스트 먼저
    const hitPort = hitTestPort(worldPos, state.nodes);
    if (hitPort) {
      dragModeRef.current = 'edge';
      edgeDragRef.current = {
        startPort: hitPort,
        currentPos: worldPos,
      };
      return;
    }

    // 엣지 클릭 확인 (삭제)
    const hitEdge = hitTestEdge(worldPos, state.edges, state.nodes);
    if (hitEdge) {
      state.deleteEdge(hitEdge.id);
      return;
    }

    const hitNode = hitTestNode(worldPos, state.nodes);
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    if (hitNode) {
      // 노드 드래그 모드
      dragModeRef.current = 'node';

      // 이미 선택된 노드면 선택 유지, 아니면 선택 변경
      const isAlreadySelected = selectedNodeIdsRef.current.has(hitNode.id);
      if (e.shiftKey) {
        toggleNodeSelection(hitNode.id, true);
      } else if (!isAlreadySelected) {
        setSelectedNodes(new Set([hitNode.id]));
      }
      // 이미 선택된 노드를 Shift 없이 클릭하면 선택 유지
    } else {
      // Alt 키 = Pan, 그 외 = 박스 선택
      if (e.altKey) {
        dragModeRef.current = 'pan';
      } else {
        // 박스 선택 모드 (빈 공간 드래그)
        dragModeRef.current = 'box';
        boxSelectRef.current = {
          start: worldPos,
          end: worldPos,
        };
        if (!e.shiftKey) {
          setSelectedNodes(new Set());
        }
      }
    }
  }, []);

  // 마우스 이동 - 노드/엣지 드래그 또는 Pan
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragModeRef.current === 'none' || !storeRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    const state = storeRef.current.getState();

    if (dragModeRef.current === 'pan') {
      state.pan(-dx / state.viewport.zoom, -dy / state.viewport.zoom);
    } else if (dragModeRef.current === 'node') {
      // 선택된 모든 노드 이동
      const selectedIds = selectedNodeIdsRef.current;
      for (const nodeId of selectedIds) {
        const node = state.nodes.find(n => n.id === nodeId);
        if (node) {
          const newPos = {
            x: node.position.x + dx / state.viewport.zoom,
            y: node.position.y + dy / state.viewport.zoom,
          };
          state.updateNode(nodeId, {
            position: snapToGrid ? snapPosition(newPos) : newPos,
          });
        }
      }
    } else if (dragModeRef.current === 'edge' && edgeDragRef.current) {
      // 엣지 드래그 중 - 현재 마우스 위치 업데이트
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const canvasSize: CanvasSize = { width: rect.width, height: rect.height };
      edgeDragRef.current.currentPos = screenToWorld(
        { x: mouseX, y: mouseY },
        state.viewport,
        canvasSize
      );
    } else if (dragModeRef.current === 'box' && boxSelectRef.current) {
      // 박스 선택 드래그 중
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const canvasSize: CanvasSize = { width: rect.width, height: rect.height };
      boxSelectRef.current.end = screenToWorld(
        { x: mouseX, y: mouseY },
        state.viewport,
        canvasSize
      );
    }
  }, []);

  // 마우스 업 - 드래그 종료, 엣지 생성
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const store = storeRef.current;

    // 엣지 드래그 완료 시 연결 시도
    if (dragModeRef.current === 'edge' && edgeDragRef.current && canvas && store) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const canvasSize: CanvasSize = { width: rect.width, height: rect.height };

      const state = store.getState();
      const worldPos = screenToWorld({ x: mouseX, y: mouseY }, state.viewport, canvasSize);
      const targetPort = hitTestPort(worldPos, state.nodes);

      const startPort = edgeDragRef.current.startPort;

      // 유효한 연결인지 확인 (출력→입력 또는 입력→출력, 다른 노드)
      if (
        targetPort &&
        targetPort.node.id !== startPort.node.id &&
        targetPort.isOutput !== startPort.isOutput
      ) {
        const isFromOutput = startPort.isOutput;
        const newEdge: FlowEdge = {
          id: `edge-${Date.now()}`,
          source: isFromOutput ? startPort.node.id : targetPort.node.id,
          sourcePort: isFromOutput ? startPort.port.id : targetPort.port.id,
          target: isFromOutput ? targetPort.node.id : startPort.node.id,
          targetPort: isFromOutput ? targetPort.port.id : startPort.port.id,
        };
        state.addEdge(newEdge);
      }

      edgeDragRef.current = null;
    }

    // 박스 선택 완료 시 노드 선택
    if (dragModeRef.current === 'box' && boxSelectRef.current && store) {
      const box = boxSelectRef.current;
      const state = store.getState();
      const newSelection = new Set<string>(e.shiftKey ? selectedNodeIdsRef.current : []);

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

      setSelectedNodes(newSelection);
      boxSelectRef.current = null;
    }

    dragModeRef.current = 'none';
  }, []);

  // Zoom (passive: false로 등록해야 preventDefault 가능)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!storeRef.current) return;

      const state = storeRef.current.getState();
      const rect = canvas.getBoundingClientRect();

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const canvasSize: CanvasSize = { width: rect.width, height: rect.height };

      const worldPos = screenToWorld({ x: mouseX, y: mouseY }, state.viewport, canvasSize);

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, state.viewport.zoom * zoomFactor));

      const newX = worldPos.x - (mouseX - canvasSize.width / 2) / newZoom;
      const newY = worldPos.y - (mouseY - canvasSize.height / 2) / newZoom;

      state.setViewport({ x: newX, y: newY, zoom: newZoom });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  // 키보드 이벤트
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = storeRef.current;
      if (!store) return;

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

      // Copy: Ctrl+C / Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        const selectedIds = selectedNodeIdsRef.current;
        if (selectedIds.size === 0) return;

        const state = store.getState();
        const selectedNodes = state.nodes.filter(n => selectedIds.has(n.id));
        const selectedNodeIds = new Set(selectedNodes.map(n => n.id));

        // 선택된 노드들 사이의 엣지만 복사
        const selectedEdges = state.edges.filter(
          e => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
        );

        clipboardRef.current = {
          nodes: selectedNodes,
          edges: selectedEdges,
        };
        return;
      }

      // Paste: Ctrl+V / Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        if (!clipboardRef.current || clipboardRef.current.nodes.length === 0) return;

        const state = store.getState();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const { nodes: copiedNodes, edges: copiedEdges } = clipboardRef.current;

        // 붙여넣기 오프셋 (20px씩 이동)
        const offset = 30;

        // ID 매핑 (원본 ID -> 새 ID)
        const idMap = new Map<string, string>();
        const newNodes: FlowNode[] = [];
        const newNodeIds: string[] = [];

        for (const node of copiedNodes) {
          const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          idMap.set(node.id, newId);

          const newNode: FlowNode = {
            ...node,
            id: newId,
            position: {
              x: node.position.x + offset,
              y: node.position.y + offset,
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
              id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              source: newSourceId,
              sourcePort: edge.sourcePort,
              target: newTargetId,
              targetPort: edge.targetPort,
            };
            state.addEdge(newEdge);
          }
        }

        // 새로 붙여넣은 노드들 선택
        setSelectedNodes(new Set(newNodeIds));

        // 클립보드 위치 업데이트 (연속 붙여넣기 시 계속 오프셋)
        clipboardRef.current = {
          nodes: newNodes,
          edges: copiedEdges.map(e => ({
            ...e,
            source: idMap.get(e.source) || e.source,
            target: idMap.get(e.target) || e.target,
          })),
        };
        return;
      }

      // Duplicate: Ctrl+D / Cmd+D (복사 + 붙여넣기)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        const selectedIds = selectedNodeIdsRef.current;
        if (selectedIds.size === 0) return;

        const state = store.getState();
        const selectedNodes = state.nodes.filter(n => selectedIds.has(n.id));
        const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
        const selectedEdges = state.edges.filter(
          e => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
        );

        const offset = 30;
        const idMap = new Map<string, string>();
        const newNodeIds: string[] = [];

        for (const node of selectedNodes) {
          const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
              id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              source: newSourceId,
              sourcePort: edge.sourcePort,
              target: newTargetId,
              targetPort: edge.targetPort,
            });
          }
        }

        setSelectedNodes(new Set(newNodeIds));
        return;
      }

      // Delete: 선택된 노드 삭제
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedIds = selectedNodeIdsRef.current;
        if (selectedIds.size === 0) return;

        const state = store.getState();
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
        return;
      }

      // Fit View: F 키 - 모든 노드가 보이도록 뷰 조정
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const state = store.getState();
        const canvas = canvasRef.current;
        if (state.nodes.length === 0 || !canvas) return;

        // 모든 노드의 바운딩 박스 계산
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const node of state.nodes) {
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
        return;
      }

      // Reset Zoom: Ctrl+0 / Cmd+0
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        const state = store.getState();
        state.setViewport({ ...state.viewport, zoom: 1 });
        return;
      }

      // Arrow Keys: 선택된 노드 이동 (그리드 또는 10px, Shift 누르면 1px)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const selectedIds = selectedNodeIdsRef.current;
        if (selectedIds.size === 0) return;

        e.preventDefault();
        const state = store.getState();
        const step = e.shiftKey ? 1 : (snapToGrid ? GRID_SIZE : 10);

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

      // Toggle Snap: G 키
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setSnapToGrid(prev => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 우클릭 컨텍스트 메뉴
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    const store = storeRef.current;
    if (!canvas || !store) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const canvasSize: CanvasSize = { width: rect.width, height: rect.height };

    const state = store.getState();
    const worldPos = screenToWorld({ x: mouseX, y: mouseY }, state.viewport, canvasSize);
    const targetNode = hitTestNode(worldPos, state.nodes);

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      worldPos,
      targetNode,
    });
  }, []);

  // 플로우 실행
  const handleRunFlow = useCallback(async () => {
    const store = storeRef.current;
    if (!store || isRunning) return;

    setIsRunning(true);
    const state = store.getState();

    try {
      const result = await executeFlow(state.nodes, state.edges, {
        onEvent: (event) => {
          if (event.type === 'node-start' || event.type === 'node-complete' || event.type === 'node-error') {
            forceRender(n => n + 1);
          }
        },
      });
      setExecutionState(result);
    } catch (error) {
      console.error('Execution error:', error);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning]);

  // 노드 추가 함수 (레지스트리 기반)
  const addNodeFromType = useCallback((typeDef: NodeTypeDefinition, worldPos: Position) => {
    const store = storeRef.current;
    if (!store) return;

    const rawPosition = {
      x: worldPos.x - typeDef.defaultSize.width / 2,
      y: worldPos.y - typeDef.defaultSize.height / 2,
    };

    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      type: typeDef.type,
      position: snapToGrid ? snapPosition(rawPosition) : rawPosition,
      size: typeDef.defaultSize,
      data: { title: typeDef.title },
      inputs: typeDef.inputs,
      outputs: typeDef.outputs,
    };

    store.getState().addNode(newNode);
    setSelectedNodes(new Set([newNode.id]));
  }, []);

  // 컨텍스트 메뉴 아이템 생성
  const getMenuItems = (): MenuItem[] => {
    const store = storeRef.current;
    if (!store || !contextMenu) return [];

    const { worldPos, targetNode } = contextMenu;

    if (targetNode) {
      // 노드 위에서 우클릭
      return [
        {
          label: 'Delete Node',
          action: () => {
            store.getState().deleteNode(targetNode.id);
            selectedNodeIdsRef.current.delete(targetNode.id);
            forceRender(n => n + 1);
          },
        },
        { label: '', action: () => {}, divider: true },
        {
          label: 'Duplicate',
          action: () => {
            const newNode: FlowNode = {
              ...targetNode,
              id: `node-${Date.now()}`,
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
              addNodeFromType(types[0], worldPos);
            }
          },
        });
      }

      items.push({ label: '', action: () => {}, divider: true });
      items.push({
        label: 'Search Nodes... (Tab)',
        action: () => {
          setNodePalette({
            x: contextMenu?.x ?? 0,
            y: contextMenu?.y ?? 0,
            worldPos,
          });
        },
      });

      return items;
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 실행 버튼 */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 100,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        {/* 스냅 토글 */}
        <button
          onClick={() => setSnapToGrid(prev => !prev)}
          title={`Snap to Grid: ${snapToGrid ? 'ON' : 'OFF'} (G)`}
          style={{
            padding: '8px 12px',
            background: snapToGrid ? '#4a5568' : '#2d3748',
            color: snapToGrid ? '#68d391' : '#a0aec0',
            border: snapToGrid ? '1px solid #68d391' : '1px solid #4a5568',
            borderRadius: 4,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Grid: {snapToGrid ? 'ON' : 'OFF'}
        </button>
        {executionState && (
          <div
            style={{
              padding: '8px 12px',
              background: executionState.status === 'success' ? '#28a745' :
                         executionState.status === 'error' ? '#dc3545' : '#6c757d',
              color: '#fff',
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            {executionState.status === 'success' ? 'Completed' :
             executionState.status === 'error' ? 'Error' : 'Running...'}
          </div>
        )}
        <button
          onClick={handleRunFlow}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            background: isRunning ? '#4a5568' : '#3182ce',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {isRunning ? 'Running...' : 'Run Flow'}
        </button>
      </div>
      <canvas
        tabIndex={0}
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          background: '#1e1e1e',
          cursor: dragModeRef.current !== 'none' ? 'grabbing' : 'grab',
        }}
      />
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
      {nodePalette && (
        <NodePalette
          x={nodePalette.x}
          y={nodePalette.y}
          onSelect={(typeDef) => {
            addNodeFromType(typeDef, nodePalette.worldPos);
            setNodePalette(null);
          }}
          onClose={() => setNodePalette(null)}
        />
      )}
      {/* 프로퍼티 패널 - 단일 노드 선택 시 */}
      {(() => {
        const selectedIds = selectedNodeIdsRef.current;
        if (selectedIds.size !== 1 || !storeRef.current) return null;
        const nodeId = Array.from(selectedIds)[0];
        const node = storeRef.current.getState().nodes.find(n => n.id === nodeId);
        if (!node) return null;
        return (
          <PropertyPanel
            node={node}
            onUpdate={(id, data) => {
              storeRef.current?.getState().updateNode(id, { data });
            }}
          />
        );
      })()}
    </div>
  );
}
