import { useEffect, useRef, useCallback, useState } from 'react';
import {
  createRenderer,
  drawGrid,
  drawNodes,
  drawEdges,
  drawTempEdge,
  drawMinimap,
  drawSelectionBox,
  drawGroups,
  drawSnapLines,
  drawComments,
  calculateSnap,
  isNodeInSelectionBox,
  isInMinimap,
  minimapToWorld,
  screenToWorld,
  hitTestNode,
  hitTestPort,
  hitTestEdge,
  hitTestResizeHandle,
  hitTestGroups,
  hitTestComment,
  type IRenderer,
  type PortHitResult,
  type EdgeStyle,
  type ResizeHandle,
  type SnapLine,
  type CompatiblePorts,
  exportFlowToImage,
  downloadImage,
} from '@flowforge/canvas';
import {
  createFlowStore,
  nodeTypeRegistry,
  executeFlow,
  downloadFlow,
  loadFlowFromFile,
  saveToLocalStorage,
  loadFromLocalStorage,
  validateNodes,
  type FlowStore,
  type NodeTypeDefinition,
  type ExecutionState,
} from '@flowforge/state';
import type { FlowNode, FlowEdge, CanvasSize, Position, ExecutionStatus, DataType, Comment } from '@flowforge/types';
import { ContextMenu, type MenuItem } from './ContextMenu';
import { NodePalette } from './NodePalette';
import { PropertyPanel } from './PropertyPanel';
import { ZoomControls } from './ZoomControls';
import { SearchDialog } from './SearchDialog';
import { ShortcutsHelp } from './ShortcutsHelp';
import { SelectionBar } from './SelectionBar';
import { NodeWidgets } from './NodeWidgets';

type DragMode = 'none' | 'pan' | 'node' | 'edge' | 'box' | 'minimap' | 'resize' | 'group' | 'comment';

/**
 * 데이터 타입 호환성 검사
 * - 'any'는 모든 타입과 호환
 * - 같은 타입끼리 호환
 * - 다른 특정 타입끼리는 비호환
 */
function isTypeCompatible(sourceType: DataType, targetType: DataType): boolean {
  if (sourceType === 'any' || targetType === 'any') {
    return true;
  }
  return sourceType === targetType;
}

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
      { id: 'out-1', name: 'image', dataType: 'image' },
    ],
  },
  {
    id: 'node-2',
    type: 'Process',
    position: { x: 100, y: -80 },
    size: { width: 180, height: 120 },
    data: { title: 'Resize' },
    inputs: [
      { id: 'in-1', name: 'image', dataType: 'image' },
      { id: 'in-2', name: 'scale', dataType: 'number' },
    ],
    outputs: [
      { id: 'out-1', name: 'image', dataType: 'image' },
    ],
  },
  {
    id: 'node-3',
    type: 'Output',
    position: { x: 400, y: -60 },
    size: { width: 180, height: 100 },
    data: { title: 'Save Image' },
    inputs: [
      { id: 'in-1', name: 'image', dataType: 'image' },
      { id: 'in-2', name: 'path', dataType: 'string' },
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
  const selectedCommentIdRef = useRef<string | null>(null);
  const commentDragRef = useRef<{ comment: Comment; startPos: Position } | null>(null);
  const edgeDragRef = useRef<{
    startPort: PortHitResult;
    currentPos: Position;
  } | null>(null);
  const boxSelectRef = useRef<{
    start: Position;
    end: Position;
  } | null>(null);
  // 드래그 중 노드의 "실제" 위치 (스냅 전)
  const nodeDragPositionsRef = useRef<Map<string, Position>>(new Map());
  // 리사이즈 상태
  const resizeRef = useRef<{
    node: FlowNode;
    handle: ResizeHandle;
    startPos: Position;
    startSize: { width: number; height: number };
    startNodePos: Position;
  } | null>(null);
  // 스냅 라인 (드래그 중에만 사용)
  const snapLinesRef = useRef<SnapLine[]>([]);
  const clipboardRef = useRef<{
    nodes: FlowNode[];
    edges: FlowEdge[];
  } | null>(null);
  // 연결 프리뷰 - 호환 가능한 포트
  const compatiblePortsMapRef = useRef<Map<string, CompatiblePorts> | null>(null);
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
  const [currentZoom, setCurrentZoom] = useState(1);
  const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>('bezier');
  const [showSearch, setShowSearch] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [cursorStyle, setCursorStyle] = useState<string>('grab');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const autoSaveTimerRef = useRef<number | null>(null);
  const canvasSizeRef = useRef<CanvasSize>({ width: 0, height: 0 });
  const [widgetInteracting, setWidgetInteracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const lastSaveRef = useRef<string>(''); // 마지막 저장 상태 해시
  const GRID_SIZE = 20; // 스냅 그리드 크기
  const MIN_NODE_SIZE = { width: 100, height: 60 }; // 최소 노드 크기
  const AUTO_SAVE_INTERVAL = 30000; // 30초

  // Refs for use in callbacks (to avoid stale closures)
  const snapToGridRef = useRef(snapToGrid);
  const edgeStyleRef = useRef(edgeStyle);

  // Keep refs in sync with state
  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);

  useEffect(() => {
    edgeStyleRef.current = edgeStyle;
  }, [edgeStyle]);

  // 줌 컨트롤 핸들러
  const handleZoomIn = useCallback(() => {
    const store = storeRef.current;
    if (!store) return;
    const state = store.getState();
    const newZoom = Math.min(5, state.viewport.zoom * 1.2);
    state.setViewport({ ...state.viewport, zoom: newZoom });
    setCurrentZoom(newZoom);
  }, []);

  const handleZoomOut = useCallback(() => {
    const store = storeRef.current;
    if (!store) return;
    const state = store.getState();
    const newZoom = Math.max(0.1, state.viewport.zoom / 1.2);
    state.setViewport({ ...state.viewport, zoom: newZoom });
    setCurrentZoom(newZoom);
  }, []);

  const handleZoomReset = useCallback(() => {
    const store = storeRef.current;
    if (!store) return;
    const state = store.getState();
    state.setViewport({ ...state.viewport, zoom: 1 });
    setCurrentZoom(1);
  }, []);

  const handleZoomTo = useCallback((targetZoom: number) => {
    const store = storeRef.current;
    if (!store) return;
    const state = store.getState();
    const clampedZoom = Math.max(0.1, Math.min(5, targetZoom));
    state.setViewport({ ...state.viewport, zoom: clampedZoom });
    setCurrentZoom(clampedZoom);
  }, []);

  const handleFitView = useCallback(() => {
    const store = storeRef.current;
    const canvas = canvasRef.current;
    if (!store || !canvas) return;

    const state = store.getState();
    if (state.nodes.length === 0) return;

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
    const zoom = Math.min(scaleX, scaleY, 2);

    state.setViewport({ x: centerX, y: centerY, zoom });
    setCurrentZoom(zoom);
  }, []);

  // 특정 노드로 이동
  const navigateToNode = useCallback((node: FlowNode) => {
    const store = storeRef.current;
    if (!store) return;

    const state = store.getState();
    const centerX = node.position.x + node.size.width / 2;
    const centerY = node.position.y + node.size.height / 2;

    state.setViewport({ ...state.viewport, x: centerX, y: centerY });
    setSelectedNodes(new Set([node.id]));
  }, []);

  // 그리드에 스냅 (useRef를 사용하여 항상 최신 값 참조)
  const snapPosition = useCallback((pos: Position): Position => {
    if (!snapToGridRef.current) return pos;
    return {
      x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE,
    };
  }, []);

  // 리사이즈 핸들에 따른 커서 스타일
  const getResizeCursor = (handle: ResizeHandle): string => {
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

  // 노드 정렬 함수들
  type AlignType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
  type DistributeType = 'horizontal' | 'vertical';

  const alignNodes = (type: AlignType) => {
    const store = storeRef.current;
    if (!store) return;

    const selectedIds = selectedNodeIdsRef.current;
    if (selectedIds.size < 2) return;

    const state = store.getState();
    const selectedNodes = state.nodes.filter(n => selectedIds.has(n.id));

    let targetValue: number;

    switch (type) {
      case 'left':
        targetValue = Math.min(...selectedNodes.map(n => n.position.x));
        for (const node of selectedNodes) {
          state.updateNode(node.id, { position: { ...node.position, x: targetValue } });
        }
        break;
      case 'center':
        const centers = selectedNodes.map(n => n.position.x + n.size.width / 2);
        targetValue = (Math.min(...centers) + Math.max(...centers)) / 2;
        for (const node of selectedNodes) {
          state.updateNode(node.id, { position: { ...node.position, x: targetValue - node.size.width / 2 } });
        }
        break;
      case 'right':
        targetValue = Math.max(...selectedNodes.map(n => n.position.x + n.size.width));
        for (const node of selectedNodes) {
          state.updateNode(node.id, { position: { ...node.position, x: targetValue - node.size.width } });
        }
        break;
      case 'top':
        targetValue = Math.min(...selectedNodes.map(n => n.position.y));
        for (const node of selectedNodes) {
          state.updateNode(node.id, { position: { ...node.position, y: targetValue } });
        }
        break;
      case 'middle':
        const middles = selectedNodes.map(n => n.position.y + n.size.height / 2);
        targetValue = (Math.min(...middles) + Math.max(...middles)) / 2;
        for (const node of selectedNodes) {
          state.updateNode(node.id, { position: { ...node.position, y: targetValue - node.size.height / 2 } });
        }
        break;
      case 'bottom':
        targetValue = Math.max(...selectedNodes.map(n => n.position.y + n.size.height));
        for (const node of selectedNodes) {
          state.updateNode(node.id, { position: { ...node.position, y: targetValue - node.size.height } });
        }
        break;
    }
  };

  const distributeNodes = (type: DistributeType) => {
    const store = storeRef.current;
    if (!store) return;

    const selectedIds = selectedNodeIdsRef.current;
    if (selectedIds.size < 3) return; // 최소 3개 필요

    const state = store.getState();
    const selectedNodes = state.nodes.filter(n => selectedIds.has(n.id));

    if (type === 'horizontal') {
      // X 위치로 정렬
      const sorted = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalWidth = last.position.x + last.size.width - first.position.x;
      const nodesWidth = sorted.reduce((sum, n) => sum + n.size.width, 0);
      const gap = (totalWidth - nodesWidth) / (sorted.length - 1);

      let currentX = first.position.x;
      for (const node of sorted) {
        state.updateNode(node.id, { position: { ...node.position, x: currentX } });
        currentX += node.size.width + gap;
      }
    } else {
      // Y 위치로 정렬
      const sorted = [...selectedNodes].sort((a, b) => a.position.y - b.position.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalHeight = last.position.y + last.size.height - first.position.y;
      const nodesHeight = sorted.reduce((sum, n) => sum + n.size.height, 0);
      const gap = (totalHeight - nodesHeight) / (sorted.length - 1);

      let currentY = first.position.y;
      for (const node of sorted) {
        state.updateNode(node.id, { position: { ...node.position, y: currentY } });
        currentY += node.size.height + gap;
      }
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
    canvasSizeRef.current = canvasSize;

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

    // 그룹 (노드/엣지 아래)
    drawGroups(renderer, state.groups, state.nodes);

    // 코멘트 (노드 아래)
    const selectedCommentIds = selectedCommentIdRef.current
      ? new Set([selectedCommentIdRef.current])
      : new Set<string>();
    drawComments(renderer, state.comments, selectedCommentIds);

    // 엣지 (노드 아래)
    drawEdges(renderer, state.edges, state.nodes, edgeStyleRef.current);

    // 드래그 중인 임시 엣지
    const edgeDrag = edgeDragRef.current;
    if (edgeDrag) {
      drawTempEdge(
        renderer,
        edgeDrag.startPort.position,
        edgeDrag.currentPos,
        edgeDrag.startPort.isOutput,
        edgeStyleRef.current,
        edgeDrag.startPort.port.dataType
      );
    }

    // 노드 - 실행 상태 맵 생성
    const nodeExecStates = new Map<string, ExecutionStatus>();
    if (executionState) {
      for (const [nodeId, nodeState] of executionState.nodeStates) {
        nodeExecStates.set(nodeId, nodeState.status);
      }
    }

    // 노드 검증 (미연결 필수 포트 경고)
    const validationMap = validateNodes(state.nodes, state.edges);

    drawNodes(renderer, state.nodes, selectedIds, nodeExecStates, compatiblePortsMapRef.current, null, validationMap);

    // 스냅 라인 (노드 드래그 중에만)
    if (dragModeRef.current === 'node' && snapLinesRef.current.length > 0) {
      drawSnapLines(renderer, snapLinesRef.current);
    }

    // 박스 선택
    const boxSelect = boxSelectRef.current;
    if (boxSelect) {
      drawSelectionBox(renderer, boxSelect.start, boxSelect.end);
    }

    // 미니맵 (스크린 좌표로 그림, 선택된 노드 하이라이트)
    drawMinimap(renderer, state.nodes, state.viewport, canvasSize, dpr, selectedIds);

    renderer.endFrame();

    rafRef.current = requestAnimationFrame(render);
  }, []);

  // 초기화
  // 자동 저장 함수
  const performAutoSave = useCallback(() => {
    const store = storeRef.current;
    if (!store) return;

    const state = store.getState();
    // 상태가 변경되었는지 확인 (간단한 해시)
    const currentHash = JSON.stringify({
      nodes: state.nodes.length,
      edges: state.edges.length,
      groups: state.groups.length,
      comments: state.comments.length,
    });

    if (currentHash !== lastSaveRef.current) {
      setSaveStatus('saving');
      saveToLocalStorage(state.nodes, state.edges, state.groups, state.viewport, state.comments);
      lastSaveRef.current = currentHash;
      setTimeout(() => setSaveStatus('saved'), 500);
    }
  }, []);

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

      // 스토어 생성
      const store = createFlowStore();
      storeRef.current = store;

      // localStorage에서 불러오기 시도
      const savedFlow = loadFromLocalStorage();
      if (savedFlow && savedFlow.nodes.length > 0) {
        // 저장된 데이터 불러오기
        store.getState().loadFlow(
          savedFlow.nodes,
          savedFlow.edges,
          savedFlow.groups,
          savedFlow.viewport,
          savedFlow.comments
        );
        setCurrentZoom(savedFlow.viewport.zoom);
      } else {
        // 저장된 데이터가 없으면 데모 노드 추가
        for (const node of DEMO_NODES) {
          store.getState().addNode(node);
        }
        for (const edge of DEMO_EDGES) {
          store.getState().addEdge(edge);
        }
      }

      // 렌더 루프 시작
      rafRef.current = requestAnimationFrame(render);

      // 자동 저장 타이머 시작
      autoSaveTimerRef.current = window.setInterval(() => {
        performAutoSave();
      }, AUTO_SAVE_INTERVAL);
    })();

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      rendererRef.current?.dispose();
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [performAutoSave]);

  // 마우스 다운 - 포트/노드 선택 또는 Pan 시작
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 위젯 인터랙션 중이면 캔버스 이벤트 무시
    if (widgetInteracting) return;

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

    // 미니맵 클릭 체크 (먼저)
    if (isInMinimap({ x: mouseX, y: mouseY }, canvasSize)) {
      dragModeRef.current = 'minimap';
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      // 클릭 위치로 즉시 이동
      const worldPos = minimapToWorld({ x: mouseX, y: mouseY }, state.nodes, state.viewport, canvasSize);
      state.setViewport({ ...state.viewport, x: worldPos.x, y: worldPos.y });
      return;
    }

    const worldPos = screenToWorld({ x: mouseX, y: mouseY }, state.viewport, canvasSize);

    // 리사이즈 핸들 체크 (선택된 노드가 있을 때만)
    const selectedIds = selectedNodeIdsRef.current;
    if (selectedIds.size > 0) {
      const resizeHit = hitTestResizeHandle(worldPos, state.nodes, selectedIds);
      if (resizeHit) {
        dragModeRef.current = 'resize';
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        resizeRef.current = {
          node: resizeHit.node,
          handle: resizeHit.handle,
          startPos: worldPos,
          startSize: { ...resizeHit.node.size },
          startNodePos: { ...resizeHit.node.position },
        };
        return;
      }
    }

    // 포트 히트 테스트
    const hitPort = hitTestPort(worldPos, state.nodes);
    if (hitPort) {
      dragModeRef.current = 'edge';
      edgeDragRef.current = {
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

      compatiblePortsMapRef.current = compatibleMap;
      return;
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
      setSelectedNodes(groupNodeIds);
      dragModeRef.current = 'node';
      setIsDragging(true);
      lastMouseRef.current = { x: e.clientX, y: e.clientY };

      // 드래그 시작 시 선택된 노드들의 현재 위치 저장
      const dragPositions = new Map<string, Position>();
      for (const nodeId of groupNodeIds) {
        const node = state.nodes.find(n => n.id === nodeId);
        if (node) {
          dragPositions.set(nodeId, { ...node.position });
        }
      }
      nodeDragPositionsRef.current = dragPositions;
      return;
    }

    // 코멘트 히트 테스트 (노드보다 먼저)
    const hitComment = hitTestComment(worldPos, state.comments);
    if (hitComment) {
      dragModeRef.current = 'comment';
      setIsDragging(true);
      selectedCommentIdRef.current = hitComment.id;
      setSelectedNodes(new Set()); // 노드 선택 해제
      commentDragRef.current = {
        comment: hitComment,
        startPos: { ...hitComment.position },
      };
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const hitNode = hitTestNode(worldPos, state.nodes);
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    if (hitNode) {
      // 노드 드래그 모드
      dragModeRef.current = 'node';
      setIsDragging(true);
      selectedCommentIdRef.current = null; // 코멘트 선택 해제

      // 이미 선택된 노드면 선택 유지, 아니면 선택 변경
      const isAlreadySelected = selectedNodeIdsRef.current.has(hitNode.id);
      if (e.shiftKey) {
        toggleNodeSelection(hitNode.id, true);
      } else if (!isAlreadySelected) {
        setSelectedNodes(new Set([hitNode.id]));
      }
      // 이미 선택된 노드를 Shift 없이 클릭하면 선택 유지

      // 드래그 시작 시 선택된 노드들의 현재 위치 저장
      const dragPositions = new Map<string, Position>();
      const selectedIds = isAlreadySelected ? selectedNodeIdsRef.current : new Set([hitNode.id]);
      for (const nodeId of selectedIds) {
        const node = state.nodes.find(n => n.id === nodeId);
        if (node) {
          dragPositions.set(nodeId, { ...node.position });
        }
      }
      nodeDragPositionsRef.current = dragPositions;
    } else {
      selectedCommentIdRef.current = null; // 빈 공간 클릭 시 코멘트 선택 해제
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

  // 마우스 이동 - 노드/엣지 드래그 또는 Pan, 커서 변경
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !storeRef.current) return;

    const state = storeRef.current.getState();

    // 드래그 중이 아닐 때 커서 업데이트
    if (dragModeRef.current === 'none') {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const canvasSize: CanvasSize = { width: rect.width, height: rect.height };
      const worldPos = screenToWorld({ x: mouseX, y: mouseY }, state.viewport, canvasSize);

      const selectedIds = selectedNodeIdsRef.current;
      if (selectedIds.size > 0) {
        const resizeHit = hitTestResizeHandle(worldPos, state.nodes, selectedIds);
        if (resizeHit) {
          setCursorStyle(getResizeCursor(resizeHit.handle));
          return;
        }
      }
      setCursorStyle('grab');
      return;
    }

    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    if (dragModeRef.current === 'pan') {
      state.pan(-dx / state.viewport.zoom, -dy / state.viewport.zoom);
    } else if (dragModeRef.current === 'node') {
      // 선택된 모든 노드 이동
      const dragPositions = nodeDragPositionsRef.current;
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
      if (!snapToGridRef.current) {
        const snapResult = calculateSnap(draggedNodes, state.nodes, newFirstPos);
        snapLinesRef.current = snapResult.lines;

        // 스냅 적용
        if (snapResult.x !== null) {
          newFirstPos.x = snapResult.x;
        }
        if (snapResult.y !== null) {
          newFirstPos.y = snapResult.y;
        }
      } else {
        snapLinesRef.current = [];
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
        if (snapToGridRef.current) {
          displayPos = snapPosition(displayPos);
        }

        state.updateNode(nodeId, { position: displayPos });
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
    } else if (dragModeRef.current === 'minimap') {
      // 미니맵 드래그 - 뷰포트 이동
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const canvasSize: CanvasSize = { width: rect.width, height: rect.height };
      const worldPos = minimapToWorld({ x: mouseX, y: mouseY }, state.nodes, state.viewport, canvasSize);
      state.setViewport({ ...state.viewport, x: worldPos.x, y: worldPos.y });
    } else if (dragModeRef.current === 'resize' && resizeRef.current) {
      // 노드 리사이즈
      const resize = resizeRef.current;
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
        newWidth = Math.max(MIN_NODE_SIZE.width, resize.startSize.width + deltaX);
        if (snapToGridRef.current) {
          newWidth = Math.round(newWidth / GRID_SIZE) * GRID_SIZE;
        }
      } else if (resizesLeft) {
        newWidth = Math.max(MIN_NODE_SIZE.width, resize.startSize.width - deltaX);
        if (snapToGridRef.current) {
          newWidth = Math.round(newWidth / GRID_SIZE) * GRID_SIZE;
        }
        // 오른쪽 가장자리 고정
        newX = rightEdge - newWidth;
      }

      // 세로 크기 계산
      if (resizesBottom) {
        newHeight = Math.max(MIN_NODE_SIZE.height, resize.startSize.height + deltaY);
        if (snapToGridRef.current) {
          newHeight = Math.round(newHeight / GRID_SIZE) * GRID_SIZE;
        }
      } else if (resizesTop) {
        newHeight = Math.max(MIN_NODE_SIZE.height, resize.startSize.height - deltaY);
        if (snapToGridRef.current) {
          newHeight = Math.round(newHeight / GRID_SIZE) * GRID_SIZE;
        }
        // 아래쪽 가장자리 고정
        newY = bottomEdge - newHeight;
      }

      state.updateNode(resize.node.id, {
        size: { width: newWidth, height: newHeight },
        position: { x: newX, y: newY },
      });
    } else if (dragModeRef.current === 'comment' && commentDragRef.current) {
      // 코멘트 드래그
      const commentDrag = commentDragRef.current;
      const newPos = {
        x: commentDrag.startPos.x + dx / state.viewport.zoom,
        y: commentDrag.startPos.y + dy / state.viewport.zoom,
      };
      commentDragRef.current.startPos = newPos;
      state.updateComment(commentDrag.comment.id, { position: newPos });
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

      // 유효한 연결인지 확인 (출력→입력 또는 입력→출력, 다른 노드, 타입 호환)
      if (
        targetPort &&
        targetPort.node.id !== startPort.node.id &&
        targetPort.isOutput !== startPort.isOutput &&
        isTypeCompatible(startPort.port.dataType, targetPort.port.dataType)
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
      compatiblePortsMapRef.current = null; // 호환 포트 맵 정리
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

    // 노드 드래그 종료 시 위치 맵 및 스냅 라인 정리
    if (dragModeRef.current === 'node') {
      nodeDragPositionsRef.current.clear();
      snapLinesRef.current = [];
    }

    // 리사이즈 종료 시 정리
    if (dragModeRef.current === 'resize') {
      resizeRef.current = null;
    }

    // 코멘트 드래그 종료 시 정리
    if (dragModeRef.current === 'comment') {
      commentDragRef.current = null;
    }

    dragModeRef.current = 'none';
    setIsDragging(false);
    setCursorStyle('grab');
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
      setCurrentZoom(newZoom);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  // 키보드 이벤트
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
          edgeStyleRef.current
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
        if (e.key === 'ArrowLeft') alignNodes('left');
        if (e.key === 'ArrowRight') alignNodes('right');
        if (e.key === 'ArrowUp') alignNodes('top');
        if (e.key === 'ArrowDown') alignNodes('bottom');
        return;
      }

      // Alt + Shift + Arrow: 중앙 정렬
      if (e.altKey && e.shiftKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') alignNodes('center');
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') alignNodes('middle');
        return;
      }

      // Ctrl + Shift + H/V: 균등 분배
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          distributeNodes('horizontal');
          return;
        }
        if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          distributeNodes('vertical');
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
        const step = e.shiftKey ? 1 : (snapToGridRef.current ? GRID_SIZE : 10);

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

      // Ungroup: Ctrl+Shift+G / Cmd+Shift+G
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'g' || e.key === 'G')) {
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
        const commentId = `comment-${Date.now()}`;
        const newComment: Comment = {
          id: commentId,
          text: 'New comment',
          position: { x: state.viewport.x - 100, y: state.viewport.y - 40 },
          size: { width: 200, height: 80 },
          color: '#fff8dc',
        };
        state.addComment(newComment);
        selectedCommentIdRef.current = commentId;
        setSelectedNodes(new Set());
        forceRender(n => n + 1);
        return;
      }

      // Help: ? 키 또는 F1
      if (e.key === '?' || e.key === 'F1') {
        e.preventDefault();
        setShowHelp(prev => !prev);
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

  // 더블클릭 - 빈 공간에서 노드 팔레트 열기
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const store = storeRef.current;
    if (!canvas || !store) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const canvasSize: CanvasSize = { width: rect.width, height: rect.height };

    const state = store.getState();
    const worldPos = screenToWorld({ x: mouseX, y: mouseY }, state.viewport, canvasSize);

    // 노드 위에서 더블클릭하면 무시 (노드 편집용으로 예약)
    const hitNode = hitTestNode(worldPos, state.nodes);
    if (hitNode) return;

    // 빈 공간에서 더블클릭 - 노드 팔레트 열기
    setNodePalette({
      x: e.clientX - 140, // 팔레트 중앙 정렬
      y: e.clientY - 100,
      worldPos,
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
      position: snapToGridRef.current ? snapPosition(rawPosition) : rawPosition,
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
      const items: MenuItem[] = [
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

      // 다중 선택 시 정렬 옵션 추가
      if (selectedNodeIdsRef.current.size >= 2) {
        items.push({ label: '', action: () => {}, divider: true });
        items.push({ label: 'Align Left', action: () => alignNodes('left') });
        items.push({ label: 'Align Center', action: () => alignNodes('center') });
        items.push({ label: 'Align Right', action: () => alignNodes('right') });
        items.push({ label: '', action: () => {}, divider: true });
        items.push({ label: 'Align Top', action: () => alignNodes('top') });
        items.push({ label: 'Align Middle', action: () => alignNodes('middle') });
        items.push({ label: 'Align Bottom', action: () => alignNodes('bottom') });

        if (selectedNodeIdsRef.current.size >= 3) {
          items.push({ label: '', action: () => {}, divider: true });
          items.push({ label: 'Distribute Horizontal', action: () => distributeNodes('horizontal') });
          items.push({ label: 'Distribute Vertical', action: () => distributeNodes('vertical') });
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
              state.createGroup('New Group', Array.from(selectedNodeIdsRef.current));
              forceRender(n => n + 1);
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
      items.push({ label: '', action: () => {}, divider: true });
      items.push({
        label: 'Add Comment (C)',
        action: () => {
          const state = store.getState();
          const commentId = `comment-${Date.now()}`;
          const newComment: Comment = {
            id: commentId,
            text: 'New comment',
            position: worldPos,
            size: { width: 200, height: 80 },
            color: '#fff8dc',
          };
          state.addComment(newComment);
          selectedCommentIdRef.current = commentId;
          setSelectedNodes(new Set());
          forceRender(n => n + 1);
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
        {/* Undo/Redo 버튼 */}
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            onClick={() => {
              storeRef.current?.getState().undo();
              forceRender(n => n + 1);
            }}
            disabled={!storeRef.current?.getState().canUndo()}
            title="Undo (Ctrl+Z)"
            style={{
              padding: '8px 10px',
              background: '#2d3748',
              color: storeRef.current?.getState().canUndo() ? '#a0aec0' : '#4a5568',
              border: '1px solid #4a5568',
              borderRadius: '4px 0 0 4px',
              fontSize: 14,
              cursor: storeRef.current?.getState().canUndo() ? 'pointer' : 'not-allowed',
              opacity: storeRef.current?.getState().canUndo() ? 1 : 0.5,
            }}
          >
            ↶
          </button>
          <button
            onClick={() => {
              storeRef.current?.getState().redo();
              forceRender(n => n + 1);
            }}
            disabled={!storeRef.current?.getState().canRedo()}
            title="Redo (Ctrl+Y)"
            style={{
              padding: '8px 10px',
              background: '#2d3748',
              color: storeRef.current?.getState().canRedo() ? '#a0aec0' : '#4a5568',
              border: '1px solid #4a5568',
              borderLeft: 'none',
              borderRadius: '0 4px 4px 0',
              fontSize: 14,
              cursor: storeRef.current?.getState().canRedo() ? 'pointer' : 'not-allowed',
              opacity: storeRef.current?.getState().canRedo() ? 1 : 0.5,
            }}
          >
            ↷
          </button>
        </div>
        {/* 자동 저장 상태 */}
        <div
          title="Auto-save status"
          style={{
            padding: '8px 12px',
            background: '#2d3748',
            color: saveStatus === 'saved' ? '#68d391' : saveStatus === 'saving' ? '#f6e05e' : '#a0aec0',
            border: '1px solid #4a5568',
            borderRadius: 4,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: saveStatus === 'saved' ? '#68d391' : saveStatus === 'saving' ? '#f6e05e' : '#a0aec0',
          }} />
          {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
        </div>
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
        {/* 엣지 스타일 토글 */}
        <button
          onClick={() => {
            const styles: EdgeStyle[] = ['bezier', 'straight', 'step'];
            const currentIndex = styles.indexOf(edgeStyle);
            setEdgeStyle(styles[(currentIndex + 1) % styles.length]);
          }}
          title="Edge Style (Click to cycle)"
          style={{
            padding: '8px 12px',
            background: '#4a5568',
            color: '#a0aec0',
            border: '1px solid #4a5568',
            borderRadius: 4,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Edge: {edgeStyle.charAt(0).toUpperCase() + edgeStyle.slice(1)}
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
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          background: '#1e1e1e',
          cursor: dragModeRef.current !== 'none' ? 'grabbing' : cursorStyle,
        }}
      />
      {/* 노드 인라인 위젯 */}
      {storeRef.current && canvasSizeRef.current.width > 0 && (
        <NodeWidgets
          nodes={storeRef.current.getState().nodes}
          viewport={storeRef.current.getState().viewport}
          canvasSize={canvasSizeRef.current}
          onUpdateNode={(nodeId, data) => {
            storeRef.current?.getState().updateNode(nodeId, { data });
          }}
          onWidgetInteraction={setWidgetInteracting}
          isDragging={isDragging}
        />
      )}
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
      {/* 선택 정보 바 - 다중 선택 시 */}
      <SelectionBar
        selectedCount={selectedNodeIdsRef.current.size}
        onDelete={() => {
          const store = storeRef.current;
          if (!store) return;
          const state = store.getState();
          for (const nodeId of selectedNodeIdsRef.current) {
            state.deleteNode(nodeId);
          }
          setSelectedNodes(new Set());
        }}
        onGroup={() => {
          const store = storeRef.current;
          if (!store) return;
          const state = store.getState();
          state.createGroup('New Group', Array.from(selectedNodeIdsRef.current));
          forceRender(n => n + 1);
        }}
        onDuplicate={() => {
          const store = storeRef.current;
          if (!store) return;
          const state = store.getState();
          const selectedIds = selectedNodeIdsRef.current;
          const selectedNodes = state.nodes.filter(n => selectedIds.has(n.id));
          const selectedNodeIdSet = new Set(selectedNodes.map(n => n.id));
          const selectedEdges = state.edges.filter(
            e => selectedNodeIdSet.has(e.source) && selectedNodeIdSet.has(e.target)
          );

          const offset = 30;
          const idMap = new Map<string, string>();
          const newNodeIds: string[] = [];

          for (const node of selectedNodes) {
            const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            idMap.set(node.id, newId);
            state.addNode({
              ...node,
              id: newId,
              position: { x: node.position.x + offset, y: node.position.y + offset },
            });
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
        }}
        onAlignLeft={() => alignNodes('left')}
        onAlignCenter={() => alignNodes('center')}
        onAlignRight={() => alignNodes('right')}
        onDistributeH={() => distributeNodes('horizontal')}
        onDistributeV={() => distributeNodes('vertical')}
        onDeselect={() => setSelectedNodes(new Set())}
      />
      {/* 줌 컨트롤 */}
      <ZoomControls
        zoom={currentZoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onFitView={handleFitView}
        onZoomTo={handleZoomTo}
      />
      {/* 검색 다이얼로그 */}
      {showSearch && storeRef.current && (
        <SearchDialog
          nodes={storeRef.current.getState().nodes}
          onSelect={(node) => {
            navigateToNode(node);
            setShowSearch(false);
          }}
          onClose={() => setShowSearch(false)}
        />
      )}
      {/* 단축키 도움말 */}
      {showHelp && (
        <ShortcutsHelp onClose={() => setShowHelp(false)} />
      )}
    </div>
  );
}
