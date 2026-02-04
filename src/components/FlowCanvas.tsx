import { useEffect, useRef, useCallback } from 'react';
import { createRenderer, drawNodes, screenToWorld, type IRenderer } from '@flowforge/canvas';
import { createFlowStore, type FlowStore } from '@flowforge/state';
import type { FlowNode, CanvasSize } from '@flowforge/types';

// 테스트용 노드들
const DEMO_NODES: FlowNode[] = [
  {
    id: 'node-1',
    type: 'Input',
    position: { x: -200, y: -100 },
    size: { width: 180, height: 120 },
    data: { title: 'Load Image' },
  },
  {
    id: 'node-2',
    type: 'Process',
    position: { x: 50, y: -50 },
    size: { width: 180, height: 140 },
    data: { title: 'Resize' },
  },
  {
    id: 'node-3',
    type: 'Output',
    position: { x: 300, y: 0 },
    size: { width: 180, height: 100 },
    data: { title: 'Save Image' },
  },
];

export function FlowCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<IRenderer | null>(null);
  const storeRef = useRef<FlowStore | null>(null);
  const rafRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

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

    // 렌더링
    renderer.beginFrame();
    renderer.setTransform(state.viewport, canvasSize, dpr);
    drawNodes(renderer, state.nodes);
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

      // 렌더 루프 시작
      rafRef.current = requestAnimationFrame(render);
    })();

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      rendererRef.current?.dispose();
    };
  }, [render]);

  // Pan 시작
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) { // 좌클릭 또는 휠클릭
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  // Pan 중
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current || !storeRef.current) return;

    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    const state = storeRef.current.getState();
    // 화면 이동량을 월드 좌표로 변환 (zoom 고려)
    state.pan(-dx / state.viewport.zoom, -dy / state.viewport.zoom);
  }, []);

  // Pan 종료
  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
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
        cursor: isDraggingRef.current ? 'grabbing' : 'grab',
      }}
    />
  );
}
