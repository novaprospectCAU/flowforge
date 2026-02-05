import { useEffect, useRef, useCallback, useState } from 'react';
import {
  createRenderer,
  drawGrid,
  drawNodes,
  drawEdges,
  drawTempEdge,
  screenToWorld,
  hitTestNode,
  hitTestPort,
  type IRenderer,
  type PortHitResult,
} from '@flowforge/canvas';
import { createFlowStore, type FlowStore } from '@flowforge/state';
import type { FlowNode, FlowEdge, CanvasSize, Position } from '@flowforge/types';

type DragMode = 'none' | 'pan' | 'node' | 'edge';

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
  const selectedNodeIdRef = useRef<string | null>(null);
  const edgeDragRef = useRef<{
    startPort: PortHitResult;
    currentPos: Position;
  } | null>(null);
  const [, forceRender] = useState(0);

  const setSelectedNodeId = (id: string | null) => {
    selectedNodeIdRef.current = id;
    forceRender(n => n + 1);
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
    const selectedIds = selectedNodeIdRef.current
      ? new Set([selectedNodeIdRef.current])
      : new Set<string>();

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

    // 노드
    drawNodes(renderer, state.nodes, selectedIds);
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

    const hitNode = hitTestNode(worldPos, state.nodes);
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    if (hitNode) {
      // 노드 드래그 모드
      dragModeRef.current = 'node';
      setSelectedNodeId(hitNode.id);
    } else {
      // Pan 모드
      dragModeRef.current = 'pan';
      setSelectedNodeId(null);
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
    const selectedId = selectedNodeIdRef.current;

    if (dragModeRef.current === 'pan') {
      state.pan(-dx / state.viewport.zoom, -dy / state.viewport.zoom);
    } else if (dragModeRef.current === 'node' && selectedId) {
      const node = state.nodes.find(n => n.id === selectedId);
      if (node) {
        state.updateNode(selectedId, {
          position: {
            x: node.position.x + dx / state.viewport.zoom,
            y: node.position.y + dy / state.viewport.zoom,
          },
        });
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

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        background: '#1e1e1e',
        cursor: dragModeRef.current !== 'none' ? 'grabbing' : 'grab',
      }}
    />
  );
}
