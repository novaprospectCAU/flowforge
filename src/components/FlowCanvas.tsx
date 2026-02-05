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
  drawSubflows,
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
  hitTestCollapsedSubflow,
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
  getVisibleNodes,
  instantiateTemplate,
  registerAINodeTypes,
  getAINodeDefaultData,
  type FlowStore,
  type NodeTypeDefinition,
  type ExecutionState,
} from '@flowforge/state';

// AI 노드 타입 등록
registerAINodeTypes();
import type { FlowNode, FlowEdge, CanvasSize, Position, ExecutionStatus, DataType, Comment, Subflow, NodeGroup, SubflowTemplate } from '@flowforge/types';
import { ContextMenu, type MenuItem } from './ContextMenu';
import { NodePalette } from './NodePalette';
import { PropertyPanel } from './PropertyPanel';
import { SubflowPanel } from './SubflowPanel';
import { TemplateBrowser } from './TemplateBrowser';
import { ContextHints } from './ContextHints';
import { loadTemplates } from '@flowforge/state';
import { ZoomControls } from './ZoomControls';
import { SearchDialog } from './SearchDialog';
import { ShortcutsHelp } from './ShortcutsHelp';
import { SelectionBar } from './SelectionBar';
import { NodeWidgets } from './NodeWidgets';
import { CommentWidgets } from './CommentWidgets';
import { OnboardingTutorial, hasCompletedOnboarding } from './OnboardingTutorial';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileToolbar } from './MobileToolbar';
import { useIsMobile } from '../hooks/useIsMobile';
import { useIsTouchDevice } from '../hooks/useIsTouchDevice';

type DragMode = 'none' | 'pan' | 'node' | 'edge' | 'box' | 'minimap' | 'resize' | 'group' | 'comment' | 'subflow';

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

export function FlowCanvas() {
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();
  const isTouchDeviceRef = useRef(isTouchDevice);
  isTouchDeviceRef.current = isTouchDevice;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<IRenderer | null>(null);
  const storeRef = useRef<FlowStore | null>(null);
  const rafRef = useRef<number>(0);
  const dragModeRef = useRef<DragMode>('none');
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const selectedNodeIdsRef = useRef<Set<string>>(new Set());
  const selectedCommentIdRef = useRef<string | null>(null);
  const selectedSubflowIdRef = useRef<string | null>(null);
  const commentDragRef = useRef<{ comment: Comment; startPos: Position } | null>(null);
  const subflowDragRef = useRef<{ subflow: Subflow; startPos: Position } | null>(null);
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
    groups: NodeGroup[];
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
  const [templateBrowser, setTemplateBrowser] = useState<{
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
  const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding());
  const [cursorStyle, setCursorStyle] = useState<string>('grab');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const autoSaveTimerRef = useRef<number | null>(null);
  const canvasSizeRef = useRef<CanvasSize>({ width: 0, height: 0 });
  const [widgetInteracting, setWidgetInteracting] = useState(false);
  const [draggingNodeIds, setDraggingNodeIds] = useState<Set<string>>(new Set());
  const [spacePressed, setSpacePressed] = useState(false); // Space 키로 Pan 모드
  const lastSaveRef = useRef<string>(''); // 마지막 저장 상태 해시
  // 터치 관련 refs
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartRef = useRef<{
    distance: number;
    zoom: number;
    viewportX: number;
    viewportY: number;
    centerX: number;  // 핀치 중심 스크린 좌표
    centerY: number;
  } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);
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

    // 펼쳐진 서브플로우 배경 (노드 아래)
    const expandedSubflows = state.subflows.filter(s => !s.collapsed);
    drawSubflows(renderer, expandedSubflows, state.nodes, selectedSubflowIdRef.current ?? undefined);

    // 코멘트 (노드 아래)
    const selectedCommentIds = selectedCommentIdRef.current
      ? new Set([selectedCommentIdRef.current])
      : new Set<string>();
    drawComments(renderer, state.comments, selectedCommentIds);

    // 보이는 노드만 필터링 (접힌 서브플로우 내부 노드 제외)
    const visibleNodes = getVisibleNodes(state.nodes, state.subflows);

    // 엣지 (노드 아래) - 보이는 노드만 사용
    drawEdges(renderer, state.edges, visibleNodes, edgeStyleRef.current);

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

    // 보이는 노드만 렌더링
    drawNodes(renderer, visibleNodes, selectedIds, nodeExecStates, compatiblePortsMapRef.current, null, validationMap);

    // 접힌 서브플로우 렌더링 (노드 위에)
    const collapsedSubflows = state.subflows.filter(s => s.collapsed);
    drawSubflows(renderer, collapsedSubflows, state.nodes, selectedSubflowIdRef.current ?? undefined);

    // 스냅 라인 (노드 드래그 중에만)
    if (dragModeRef.current === 'node' && snapLinesRef.current.length > 0) {
      drawSnapLines(renderer, snapLinesRef.current);
    }

    // 박스 선택
    const boxSelect = boxSelectRef.current;
    if (boxSelect) {
      drawSelectionBox(renderer, boxSelect.start, boxSelect.end);
    }

    // 미니맵 (터치 기기에서는 숨김)
    if (!isTouchDeviceRef.current) {
      drawMinimap(renderer, state.nodes, state.viewport, canvasSize, dpr, selectedIds, state.subflows);
    }

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
      subflows: state.subflows.length,
    });

    if (currentHash !== lastSaveRef.current) {
      setSaveStatus('saving');
      saveToLocalStorage(state.nodes, state.edges, state.groups, state.viewport, state.comments, state.subflows);
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
          savedFlow.comments,
          savedFlow.subflows
        );
        setCurrentZoom(savedFlow.viewport.zoom);
      }
      // 저장된 데이터가 없으면 빈 캔버스로 시작

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

    // Space 키 + 좌클릭 = Pan (Figma 스타일)
    if (spacePressed) {
      dragModeRef.current = 'pan';
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const canvas = canvasRef.current;
    const store = storeRef.current;
    if (!canvas || !store) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const canvasSize: CanvasSize = { width: rect.width, height: rect.height };

    const state = store.getState();

    // 미니맵 클릭 체크 (터치 기기에서는 미니맵 숨김)
    if (!isTouchDeviceRef.current && isInMinimap({ x: mouseX, y: mouseY }, canvasSize)) {
      dragModeRef.current = 'minimap';
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      // 클릭 위치로 즉시 이동
      const worldPos = minimapToWorld({ x: mouseX, y: mouseY }, state.nodes, state.viewport, canvasSize);
      state.setViewport({ ...state.viewport, x: worldPos.x, y: worldPos.y });
      forceRender(n => n + 1); // 위젯 위치 업데이트
      return;
    }

    const worldPos = screenToWorld({ x: mouseX, y: mouseY }, state.viewport, canvasSize);

    // 포트 히트 테스트 (리사이즈보다 우선)
    const selectedIds = selectedNodeIdsRef.current;
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

    // 리사이즈 핸들 체크 (선택된 노드가 있을 때만, 포트보다 후순위)
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
            setDraggingNodeIds(groupNodeIds); // 드래그 중인 노드 ID 설정
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

    // 접힌 서브플로우 히트 테스트 (노드보다 먼저)
    const hitSubflow = hitTestCollapsedSubflow(worldPos, state.subflows);
    if (hitSubflow) {
      dragModeRef.current = 'subflow';
            selectedSubflowIdRef.current = hitSubflow.subflow.id;
      selectedCommentIdRef.current = null;
      setSelectedNodes(new Set());
      subflowDragRef.current = {
        subflow: hitSubflow.subflow,
        startPos: hitSubflow.subflow.collapsedPosition ? { ...hitSubflow.subflow.collapsedPosition } : { x: 0, y: 0 },
      };
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // 코멘트 히트 테스트 (노드보다 먼저)
    const hitComment = hitTestComment(worldPos, state.comments);
    if (hitComment) {
      dragModeRef.current = 'comment';
            selectedCommentIdRef.current = hitComment.id;
      selectedSubflowIdRef.current = null;
      setSelectedNodes(new Set()); // 노드 선택 해제
      commentDragRef.current = {
        comment: hitComment,
        startPos: { ...hitComment.position },
      };
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // 보이는 노드만 히트 테스트에 사용
    const visibleNodes = getVisibleNodes(state.nodes, state.subflows);
    const hitNode = hitTestNode(worldPos, visibleNodes);
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    if (hitNode) {
      // 노드 드래그 모드
      dragModeRef.current = 'node';
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
      setDraggingNodeIds(new Set(selectedIds)); // 드래그 중인 노드 ID 설정
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
  }, [spacePressed, widgetInteracting]);

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

      // 포트 히트 테스트 (리사이즈보다 우선)
      const hitPort = hitTestPort(worldPos, state.nodes);
      if (hitPort) {
        setCursorStyle('crosshair');
        return;
      }

      // 리사이즈 핸들 체크 (선택된 노드가 있을 때만)
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
      forceRender(n => n + 1); // 위젯 위치 업데이트를 위해 리렌더 트리거
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
      forceRender(n => n + 1); // 위젯 위치 업데이트
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
    } else if (dragModeRef.current === 'subflow' && subflowDragRef.current) {
      // 서브플로우 드래그
      const subflowDrag = subflowDragRef.current;
      const newPos = {
        x: subflowDrag.startPos.x + dx / state.viewport.zoom,
        y: subflowDrag.startPos.y + dy / state.viewport.zoom,
      };
      subflowDragRef.current.startPos = newPos;
      state.updateSubflow(subflowDrag.subflow.id, { collapsedPosition: newPos });
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

    // 서브플로우 드래그 종료 시 정리
    if (dragModeRef.current === 'subflow') {
      subflowDragRef.current = null;
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
        setDraggingNodeIds(new Set()); // 드래그 중인 노드 초기화
    setCursorStyle('grab');
  }, []);

  // 터치 헬퍼 함수: 두 터치 포인트 사이 거리
  const getTouchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 터치 헬퍼 함수: 두 터치 포인트 중심
  const getTouchCenter = (touches: React.TouchList): { x: number; y: number } => {
    if (touches.length < 2) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  // 터치 시작
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (widgetInteracting) return;

    const canvas = canvasRef.current;
    const store = storeRef.current;
    if (!canvas || !store) return;

    // 롱프레스 타이머 취소
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const rect = canvas.getBoundingClientRect();
    const state = store.getState();

    // 두 손가락 터치 = 핀치 줌/팬
    if (e.touches.length === 2) {
      e.preventDefault();
      const center = getTouchCenter(e.touches);
      pinchStartRef.current = {
        distance: getTouchDistance(e.touches),
        zoom: state.viewport.zoom,
        viewportX: state.viewport.x,
        viewportY: state.viewport.y,
        centerX: center.x - rect.left,
        centerY: center.y - rect.top,
      };
      lastTouchRef.current = center;
      dragModeRef.current = 'pan';
      return;
    }

    // 한 손가락 터치
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    const canvasSize: CanvasSize = { width: rect.width, height: rect.height };

    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

    const worldPos = screenToWorld({ x: touchX, y: touchY }, state.viewport, canvasSize);

    // 미니맵 터치 (터치 기기에서는 미니맵 숨김이므로 이 코드는 실행되지 않음)
    // Desktop 터치스크린 지원을 위해 남겨둠
    if (!isTouchDeviceRef.current && isInMinimap({ x: touchX, y: touchY }, canvasSize)) {
      dragModeRef.current = 'minimap';
      const mapWorldPos = minimapToWorld({ x: touchX, y: touchY }, state.nodes, state.viewport, canvasSize);
      state.setViewport({ ...state.viewport, x: mapWorldPos.x, y: mapWorldPos.y });
      forceRender(n => n + 1);
      return;
    }

    // 포트 히트 테스트
    const hitPort = hitTestPort(worldPos, state.nodes);
    if (hitPort) {
      dragModeRef.current = 'edge';
      edgeDragRef.current = {
        startPort: hitPort,
        currentPos: worldPos,
      };

      // 호환 가능한 포트 계산 (마우스 핸들러와 동일)
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
      compatiblePortsMapRef.current = compatibleMap;
      return;
    }

    // 서브플로우 히트 테스트
    const hitSubflow = hitTestCollapsedSubflow(worldPos, state.subflows);
    if (hitSubflow) {
      dragModeRef.current = 'subflow';
      selectedSubflowIdRef.current = hitSubflow.subflow.id;
      selectedCommentIdRef.current = null;
      setSelectedNodes(new Set());
      subflowDragRef.current = {
        subflow: hitSubflow.subflow,
        startPos: hitSubflow.subflow.collapsedPosition ? { ...hitSubflow.subflow.collapsedPosition } : { x: 0, y: 0 },
      };
      return;
    }

    // 코멘트 히트 테스트
    const hitComment = hitTestComment(worldPos, state.comments);
    if (hitComment) {
      dragModeRef.current = 'comment';
      selectedCommentIdRef.current = hitComment.id;
      selectedSubflowIdRef.current = null;
      setSelectedNodes(new Set());
      commentDragRef.current = {
        comment: hitComment,
        startPos: { ...hitComment.position },
      };
      return;
    }

    // 노드 히트 테스트
    const visibleNodes = getVisibleNodes(state.nodes, state.subflows);
    const hitNode = hitTestNode(worldPos, visibleNodes);

    if (hitNode) {
      dragModeRef.current = 'node';
      selectedCommentIdRef.current = null;

      const isAlreadySelected = selectedNodeIdsRef.current.has(hitNode.id);
      if (!isAlreadySelected) {
        setSelectedNodes(new Set([hitNode.id]));
      }

      const dragPositions = new Map<string, Position>();
      const selectedIds = isAlreadySelected ? selectedNodeIdsRef.current : new Set([hitNode.id]);
      for (const nodeId of selectedIds) {
        const node = state.nodes.find(n => n.id === nodeId);
        if (node) {
          dragPositions.set(nodeId, { ...node.position });
        }
      }
      nodeDragPositionsRef.current = dragPositions;
      setDraggingNodeIds(new Set(selectedIds));

      // 롱프레스 타이머 (컨텍스트 메뉴)
      longPressTimerRef.current = window.setTimeout(() => {
        setContextMenu({
          x: touch.clientX,
          y: touch.clientY,
          worldPos,
          targetNode: hitNode,
        });
        dragModeRef.current = 'none';
        setDraggingNodeIds(new Set());
        longPressTimerRef.current = null;
      }, 500);
    } else {
      // 빈 공간 - 팬 또는 박스 선택
      dragModeRef.current = 'pan';
      selectedCommentIdRef.current = null;

      // 롱프레스 타이머 (빈 공간 컨텍스트 메뉴)
      longPressTimerRef.current = window.setTimeout(() => {
        setContextMenu({
          x: touch.clientX,
          y: touch.clientY,
          worldPos,
          targetNode: null,
        });
        dragModeRef.current = 'none';
        longPressTimerRef.current = null;
      }, 500);
    }
  }, [widgetInteracting]);

  // 터치 이동
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    const store = storeRef.current;
    if (!canvas || !store) return;

    // 롱프레스 타이머 취소 (움직이면 롱프레스 아님)
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const rect = canvas.getBoundingClientRect();
    const state = store.getState();
    const canvasSize: CanvasSize = { width: rect.width, height: rect.height };

    // 핀치 줌
    if (e.touches.length === 2 && pinchStartRef.current) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      const pinchStart = pinchStartRef.current;

      // 새 줌 계산
      const scale = currentDistance / pinchStart.distance;
      const newZoom = Math.max(0.1, Math.min(5, pinchStart.zoom * scale));

      // 현재 핀치 중심 (스크린 좌표)
      const currentCenterX = center.x - rect.left;
      const currentCenterY = center.y - rect.top;

      // 초기 핀치 중심의 월드 좌표 (초기 viewport 기준)
      const initialWorldX = pinchStart.viewportX + (pinchStart.centerX - canvasSize.width / 2) / pinchStart.zoom;
      const initialWorldY = pinchStart.viewportY + (pinchStart.centerY - canvasSize.height / 2) / pinchStart.zoom;

      // 새 viewport: 초기 월드 좌표가 현재 핀치 중심에 오도록
      const newX = initialWorldX - (currentCenterX - canvasSize.width / 2) / newZoom;
      const newY = initialWorldY - (currentCenterY - canvasSize.height / 2) / newZoom;

      state.setViewport({ x: newX, y: newY, zoom: newZoom });
      setCurrentZoom(newZoom);
      forceRender(n => n + 1);
      return;
    }

    // 한 손가락 터치
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - lastTouchRef.current.x;
      const dy = touch.clientY - lastTouchRef.current.y;
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      if (dragModeRef.current === 'pan' || dragModeRef.current === 'minimap') {
        if (dragModeRef.current === 'minimap') {
          // 미니맵 드래그
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
          const scale = Math.min(MINIMAP_INNER / worldW, MINIMAP_INNER / (worldH || 1));

          const worldDx = dx / scale;
          const worldDy = dy / scale;

          state.setViewport({
            ...state.viewport,
            x: state.viewport.x + worldDx,
            y: state.viewport.y + worldDy,
          });
        } else {
          // 일반 팬
          state.pan(-dx / state.viewport.zoom, -dy / state.viewport.zoom);
        }
        forceRender(n => n + 1);
      } else if (dragModeRef.current === 'node') {
        // 노드 드래그
        const dragPositions = nodeDragPositionsRef.current;

        for (const [nodeId, startPos] of dragPositions) {
          const node = state.nodes.find(n => n.id === nodeId);
          if (!node) continue;

          const totalDx = (touch.clientX - (touchStartRef.current?.x || 0)) / state.viewport.zoom;
          const totalDy = (touch.clientY - (touchStartRef.current?.y || 0)) / state.viewport.zoom;

          let newX = startPos.x + totalDx;
          let newY = startPos.y + totalDy;

          if (snapToGridRef.current) {
            newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
            newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
          }

          state.updateNode(nodeId, { position: { x: newX, y: newY } });
        }
        forceRender(n => n + 1);
      } else if (dragModeRef.current === 'edge' && edgeDragRef.current) {
        // 엣지 드래그
        const worldPos = screenToWorld({ x: touchX, y: touchY }, state.viewport, canvasSize);
        edgeDragRef.current.currentPos = worldPos;
      } else if (dragModeRef.current === 'comment' && commentDragRef.current) {
        // 코멘트 드래그
        const comment = commentDragRef.current.comment;
        const startPos = commentDragRef.current.startPos;
        const totalDx = (touch.clientX - (touchStartRef.current?.x || 0)) / state.viewport.zoom;
        const totalDy = (touch.clientY - (touchStartRef.current?.y || 0)) / state.viewport.zoom;

        state.updateComment(comment.id, {
          position: { x: startPos.x + totalDx, y: startPos.y + totalDy },
        });
        forceRender(n => n + 1);
      } else if (dragModeRef.current === 'subflow' && subflowDragRef.current) {
        // 서브플로우 드래그
        const subflow = subflowDragRef.current.subflow;
        const startPos = subflowDragRef.current.startPos;
        const totalDx = (touch.clientX - (touchStartRef.current?.x || 0)) / state.viewport.zoom;
        const totalDy = (touch.clientY - (touchStartRef.current?.y || 0)) / state.viewport.zoom;

        state.updateSubflow(subflow.id, {
          collapsedPosition: { x: startPos.x + totalDx, y: startPos.y + totalDy },
        });
        forceRender(n => n + 1);
      }
    }
  }, []);

  // 터치 종료
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // 롱프레스 타이머 취소
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const canvas = canvasRef.current;
    const store = storeRef.current;

    // 핀치 종료
    if (pinchStartRef.current) {
      pinchStartRef.current = null;
      // 손가락이 남아있으면 그 위치로 lastTouchRef 업데이트 (점프 방지)
      if (e.touches.length === 1) {
        const remainingTouch = e.touches[0];
        lastTouchRef.current = { x: remainingTouch.clientX, y: remainingTouch.clientY };
      }
      // 핀치 후에는 항상 드래그 모드 리셋 (남은 손가락으로 갑자기 팬되는 것 방지)
      dragModeRef.current = 'none';
      return;
    }

    // 엣지 드래그 완료
    if (dragModeRef.current === 'edge' && edgeDragRef.current && canvas && store) {
      const rect = canvas.getBoundingClientRect();
      const state = store.getState();
      const canvasSize: CanvasSize = { width: rect.width, height: rect.height };

      const touch = e.changedTouches[0];
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
      const worldPos = screenToWorld({ x: touchX, y: touchY }, state.viewport, canvasSize);
      const targetPort = hitTestPort(worldPos, state.nodes);
      const startPort = edgeDragRef.current.startPort;

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
      compatiblePortsMapRef.current = null;
    }

    // 더블 탭 감지
    const now = Date.now();
    const touchStart = touchStartRef.current;
    if (touchStart && canvas && store) {
      const touchDuration = now - touchStart.time;
      const touchDistance = Math.sqrt(
        Math.pow(lastTouchRef.current.x - touchStart.x, 2) +
        Math.pow(lastTouchRef.current.y - touchStart.y, 2)
      );

      // 짧은 탭 (이동 거리 작음)
      if (touchDuration < 300 && touchDistance < 10) {
        const timeSinceLastTap = now - lastTapTimeRef.current;

        // 더블 탭 (300ms 내에 두 번째 탭)
        if (timeSinceLastTap < 300) {
          const rect = canvas.getBoundingClientRect();
          const state = store.getState();
          const touchX = touchStart.x - rect.left;
          const touchY = touchStart.y - rect.top;
          const canvasSize: CanvasSize = { width: rect.width, height: rect.height };
          const worldPos = screenToWorld({ x: touchX, y: touchY }, state.viewport, canvasSize);

          // 서브플로우 더블 탭 - 펼치기
          const hitSubflow = hitTestCollapsedSubflow(worldPos, state.subflows);
          if (hitSubflow) {
            state.expandSubflow(hitSubflow.subflow.id);
            selectedSubflowIdRef.current = hitSubflow.subflow.id;
          } else {
            // 빈 공간 더블 탭 - 노드 팔레트
            const visibleNodes = getVisibleNodes(state.nodes, state.subflows);
            const hitNode = hitTestNode(worldPos, visibleNodes);
            if (!hitNode) {
              setNodePalette({
                x: touchStart.x - 140,
                y: touchStart.y - 100,
                worldPos,
              });
            }
          }
          lastTapTimeRef.current = 0;
        } else {
          lastTapTimeRef.current = now;
        }
      }
    }

    // 드래그 상태 정리
    if (dragModeRef.current === 'node') {
      nodeDragPositionsRef.current.clear();
      snapLinesRef.current = [];
    }
    if (dragModeRef.current === 'subflow') {
      subflowDragRef.current = null;
    }
    if (dragModeRef.current === 'comment') {
      commentDragRef.current = null;
    }

    dragModeRef.current = 'none';
    setDraggingNodeIds(new Set());
    touchStartRef.current = null;
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
        if (selectedIds.size === 0) return;

        const state = store.getState();
        const selectedNodes = state.nodes.filter(n => selectedIds.has(n.id));
        const selectedNodeIds = new Set(selectedNodes.map(n => n.id));

        // 선택된 노드들 사이의 엣지만 복사
        const selectedEdges = state.edges.filter(
          e => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
        );

        // 모든 노드가 선택된 그룹만 복사
        const selectedGroups = state.groups.filter(
          g => g.nodeIds.length > 0 && g.nodeIds.every(id => selectedNodeIds.has(id))
        );

        clipboardRef.current = {
          nodes: selectedNodes,
          edges: selectedEdges,
          groups: selectedGroups,
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

        const { nodes: copiedNodes, edges: copiedEdges, groups: copiedGroups } = clipboardRef.current;

        // 복사된 노드들의 바운딩 박스 중앙 계산
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const node of copiedNodes) {
          minX = Math.min(minX, node.position.x);
          minY = Math.min(minY, node.position.y);
          maxX = Math.max(maxX, node.position.x + node.size.width);
          maxY = Math.max(maxY, node.position.y + node.size.height);
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
          const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
              id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
              id: `group-${Date.now()}`,
              nodeIds: newNodeIdsForGroup,
            });
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
          groups: copiedGroups.map(g => ({
            ...g,
            nodeIds: g.nodeIds.map(id => idMap.get(id) || id),
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

    // 접힌 서브플로우 체크 먼저
    const hitSubflow = hitTestCollapsedSubflow(worldPos, state.subflows);
    if (hitSubflow) {
      // 서브플로우 컨텍스트 메뉴 (서브플로우 내 첫 노드를 타겟으로)
      const firstNodeId = hitSubflow.subflow.nodeIds[0];
      const firstNode = state.nodes.find(n => n.id === firstNodeId);
      selectedSubflowIdRef.current = hitSubflow.subflow.id;
      setContextMenu({
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

    // 접힌 서브플로우 더블클릭 - 펼치기
    const hitSubflow = hitTestCollapsedSubflow(worldPos, state.subflows);
    if (hitSubflow) {
      state.expandSubflow(hitSubflow.subflow.id);
      selectedSubflowIdRef.current = hitSubflow.subflow.id;
      return;
    }

    // 보이는 노드만 히트 테스트
    const visibleNodes = getVisibleNodes(state.nodes, state.subflows);
    const hitNode = hitTestNode(worldPos, visibleNodes);
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
          // 노드 데이터 업데이트 이벤트 처리 (Display 노드 등에서 사용)
          if (event.type === 'node-data-update') {
            const node = store.getState().nodes.find(n => n.id === event.nodeId);
            if (node) {
              store.getState().updateNode(event.nodeId, {
                data: { ...node.data, ...event.data },
              });
            }
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

    // AI 노드의 경우 기본 데이터 가져오기
    const aiDefaultData = getAINodeDefaultData(typeDef.type);

    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      type: typeDef.type,
      position: snapToGridRef.current ? snapPosition(rawPosition) : rawPosition,
      size: typeDef.defaultSize,
      data: { title: typeDef.title, ...aiDefaultData },
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
              const subflowId = state.createSubflow('New Subflow', Array.from(selectedNodeIdsRef.current));
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
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 모바일 툴바 */}
      {isMobile && (
        <MobileToolbar
          onUndo={() => {
            storeRef.current?.getState().undo();
            forceRender(n => n + 1);
          }}
          onRedo={() => {
            storeRef.current?.getState().redo();
            forceRender(n => n + 1);
          }}
          canUndo={storeRef.current?.getState().canUndo() || false}
          canRedo={storeRef.current?.getState().canRedo() || false}
          onRun={handleRunFlow}
          isRunning={isRunning}
          onHelp={() => setShowHelp(true)}
          saveStatus={saveStatus}
          snapToGrid={snapToGrid}
          onToggleSnap={() => setSnapToGrid(prev => !prev)}
        />
      )}
      {/* 터치 기기에서 화면 중심 버튼 (미니맵 대체) */}
      {isTouchDevice && (
        <button
          onClick={() => {
            const store = storeRef.current;
            if (!store) return;
            const state = store.getState();
            if (state.nodes.length === 0) {
              // 노드가 없으면 원점으로
              state.setViewport({ x: 0, y: 0, zoom: 1 });
              setCurrentZoom(1);
            } else {
              // 노드가 있으면 모두 보이게
              handleFitView();
            }
            forceRender(n => n + 1);
          }}
          style={{
            position: 'absolute',
            bottom: 90,
            left: 16,
            width: 48,
            height: 48,
            borderRadius: 24,
            background: 'rgba(45, 55, 72, 0.9)',
            border: '1px solid #4a5568',
            color: '#e2e8f0',
            fontSize: 20,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
          title="Center View"
        >
          ⊙
        </button>
      )}
      {/* 데스크톱 툴바 */}
      {!isMobile && (
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
          {/* 언어 선택 */}
          <LanguageSwitcher />
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
      )}
      <canvas
        tabIndex={isTouchDevice ? -1 : 0}
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          background: '#1e1e1e',
          cursor: dragModeRef.current !== 'none' ? 'grabbing' : (spacePressed ? 'grab' : cursorStyle),
          touchAction: 'none', // 브라우저 기본 터치 동작 비활성화
        }}
      />
      {/* 코멘트 인라인 위젯 */}
      {storeRef.current && canvasSizeRef.current.width > 0 && (
        <CommentWidgets
          comments={storeRef.current.getState().comments}
          viewport={storeRef.current.getState().viewport}
          canvasSize={canvasSizeRef.current}
          onUpdateComment={(commentId, text, updatedAt) => {
            storeRef.current?.getState().updateComment(commentId, { text, updatedAt });
          }}
          onWidgetInteraction={setWidgetInteracting}
        />
      )}
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
          draggingNodeIds={draggingNodeIds.size > 0 ? draggingNodeIds : undefined}
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
      {/* 템플릿 브라우저 */}
      {templateBrowser && (
        <TemplateBrowser
          position={{ x: templateBrowser.x, y: templateBrowser.y }}
          onInsert={(template: SubflowTemplate) => {
            const store = storeRef.current;
            if (!store) return;

            const state = store.getState();
            const { nodes, edges, subflow } = instantiateTemplate(template, templateBrowser.worldPos);

            // 노드 추가
            for (const node of nodes) {
              state.addNode(node);
            }
            // 엣지 추가
            for (const edge of edges) {
              state.addEdge(edge);
            }
            // 서브플로우 생성
            const subflowId = `subflow-${Date.now()}`;
            state.yjsDoc.subflows.set(subflowId, {
              ...subflow,
              id: subflowId,
            } as Subflow);

            setTemplateBrowser(null);
            forceRender(n => n + 1);
          }}
          onClose={() => setTemplateBrowser(null)}
        />
      )}
      {/* 프로퍼티 패널 - 단일 노드 선택 시 (데스크톱만) */}
      {!isMobile && (() => {
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
      {/* 서브플로우 패널 - 서브플로우 선택 시 (데스크톱만) */}
      {!isMobile && (() => {
        const sfId = selectedSubflowIdRef.current;
        if (!sfId || !storeRef.current) return null;
        const subflow = storeRef.current.getState().subflows.find(s => s.id === sfId);
        if (!subflow) return null;
        const state = storeRef.current.getState();
        return (
          <SubflowPanel
            subflow={subflow}
            nodes={state.nodes}
            edges={state.edges}
            onUpdate={(id, partial) => state.updateSubflow(id, partial)}
            onDelete={(id) => {
              state.deleteSubflow(id);
              selectedSubflowIdRef.current = null;
              forceRender(n => n + 1);
            }}
            onCollapse={(id) => {
              state.collapseSubflow(id);
              forceRender(n => n + 1);
            }}
            onExpand={(id) => {
              state.expandSubflow(id);
              forceRender(n => n + 1);
            }}
          />
        );
      })()}
      {/* 컨텍스트 힌트 (데스크톱만) */}
      {!isMobile && storeRef.current && (
        <ContextHints
          nodeCount={storeRef.current.getState().nodes.length}
          selectedCount={selectedNodeIdsRef.current.size}
          hasSubflows={storeRef.current.getState().subflows.length > 0}
          hasTemplates={loadTemplates().length > 0}
        />
      )}
      {/* 선택 정보 바 - 다중 선택 시 (데스크톱만) */}
      {!isMobile && <SelectionBar
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
      />}
      {/* 줌 컨트롤 (데스크톱만 - 모바일은 핀치 줌 사용) */}
      {!isMobile && (
        <ZoomControls
          zoom={currentZoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onFitView={handleFitView}
          onZoomTo={handleZoomTo}
        />
      )}
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
      {/* 온보딩 튜토리얼 */}
      {showOnboarding && (
        <OnboardingTutorial
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
