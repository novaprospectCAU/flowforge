import { useEffect, useRef, useCallback, useState } from 'react';
import {
  createRenderer,
  drawGrid,
  drawNodes,
  drawEdges,
  drawTempEdge,
  drawMinimap,
  screenToWorld,
  hitTestNode,
  hitTestPort,
  hitTestEdge,
  type IRenderer,
  type PortHitResult,
} from '@flowforge/canvas';
import { createFlowStore, nodeTypeRegistry, type FlowStore, type NodeTypeDefinition } from '@flowforge/state';
import type { FlowNode, FlowEdge, CanvasSize, Position } from '@flowforge/types';
import { ContextMenu, type MenuItem } from './ContextMenu';
import { NodePalette } from './NodePalette';

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
  const selectedNodeIdsRef = useRef<Set<string>>(new Set());
  const edgeDragRef = useRef<{
    startPort: PortHitResult;
    currentPos: Position;
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

    // 노드
    drawNodes(renderer, state.nodes, selectedIds);

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
      // Pan 모드
      dragModeRef.current = 'pan';
      if (!e.shiftKey) {
        setSelectedNodes(new Set());
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
          state.updateNode(nodeId, {
            position: {
              x: node.position.x + dx / state.viewport.zoom,
              y: node.position.y + dy / state.viewport.zoom,
            },
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

      // Delete: 선택된 노드 삭제
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedIds = selectedNodeIdsRef.current;
        if (selectedIds.size === 0) return;

        const state = store.getState();
        for (const nodeId of selectedIds) {
          state.deleteNode(nodeId);
        }
        setSelectedNodes(new Set());
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

  // 노드 추가 함수 (레지스트리 기반)
  const addNodeFromType = useCallback((typeDef: NodeTypeDefinition, worldPos: Position) => {
    const store = storeRef.current;
    if (!store) return;

    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      type: typeDef.type,
      position: {
        x: worldPos.x - typeDef.defaultSize.width / 2,
        y: worldPos.y - typeDef.defaultSize.height / 2,
      },
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
    </div>
  );
}
