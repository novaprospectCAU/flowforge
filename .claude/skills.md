# FlowForge Skills

## 프로젝트 개요
FlowForge는 AI 워크플로우를 위한 노드 에디터 플랫폼입니다.

## 기술 스택
- **Frontend**: React 18 + Vite 5 + TypeScript
- **Canvas**: Canvas2D (WebGPU/WebGL2 인터페이스 준비)
- **State**: Yjs (CRDT) + Zustand
- **Package Manager**: pnpm workspace

## 패키지 구조
```
flowforge/
├── packages/
│   ├── canvas/          # @flowforge/canvas - 렌더링 엔진
│   │   └── src/
│   │       ├── renderer/     # WebGPU/WebGL2 렌더러
│   │       ├── rendering/    # 노드, 엣지, 그리드, 미니맵
│   │       ├── interaction/  # 히트 테스트
│   │       └── viewport/     # 좌표 변환
│   └── state/           # @flowforge/state - 상태 관리
│       └── src/
│           ├── store.ts      # Zustand 스토어
│           └── yjsDoc.ts     # Yjs 문서
├── shared/
│   └── types/           # @flowforge/types - 공유 타입
└── src/                 # React 앱
    └── components/
        └── FlowCanvas.tsx
```

## 구현된 기능

### 렌더링
- **노드 렌더링**: 둥근 모서리 + 헤더 + 타이틀 + 포트
- **엣지 렌더링**: 베지어 커브
- **그리드 배경**: 무한 그리드 (minor/major 라인)
- **미니맵**: 오른쪽 하단, 뷰포트 표시

### 인터랙션
- **Pan**: 빈 공간 드래그
- **Zoom**: 마우스 휠 (마우스 위치 기준)
- **노드 선택**: 클릭
- **다중 선택**: Shift + 클릭
- **노드 드래그**: 선택된 노드 이동
- **엣지 연결**: 포트에서 드래그하여 연결
- **노드 삭제**: Delete 키
- **엣지 삭제**: 엣지 클릭

### 상태 관리
- **Yjs**: CRDT 기반 실시간 동기화 준비
- **Zustand**: React 상태 관리
- **노드 CRUD**: addNode, updateNode, deleteNode
- **엣지 CRUD**: addEdge, deleteEdge
- **뷰포트**: setViewport, pan, zoom

## 주요 API

### @flowforge/canvas
```typescript
// 렌더러
createRenderer(canvas: HTMLCanvasElement): Promise<IRenderer>

// 렌더링
drawNodes(renderer, nodes, selectedIds)
drawEdges(renderer, edges, nodes)
drawGrid(renderer, viewport, canvasSize)
drawMinimap(renderer, nodes, viewport, canvasSize, dpr)

// 좌표 변환
screenToWorld(screenPos, viewport, canvasSize): Position
worldToScreen(worldPos, viewport, canvasSize): Position

// 히트 테스트
hitTestNode(worldPos, nodes): FlowNode | null
hitTestPort(worldPos, nodes): PortHitResult | null
hitTestEdge(worldPos, edges, nodes): FlowEdge | null
```

### @flowforge/state
```typescript
// 스토어 생성
createFlowStore(): FlowStore

// 상태
interface FlowState {
  nodes: FlowNode[]
  edges: FlowEdge[]
  viewport: Viewport

  // 액션
  addNode(node: FlowNode): void
  updateNode(id: string, partial: Partial<FlowNode>): void
  deleteNode(id: string): void
  addEdge(edge: FlowEdge): void
  deleteEdge(id: string): void
  setViewport(viewport: Viewport): void
  pan(dx: number, dy: number): void
  zoom(factor: number, centerX?: number, centerY?: number): void
}
```

### @flowforge/types
```typescript
interface FlowNode {
  id: string
  type: string
  position: Position
  size: Size
  data: Record<string, unknown>
  inputs?: PortDefinition[]
  outputs?: PortDefinition[]
}

interface FlowEdge {
  id: string
  source: string
  sourcePort: string
  target: string
  targetPort: string
}

interface Viewport {
  x: number  // 화면 중심의 월드 좌표
  y: number
  zoom: number
}
```

## 개발 명령어
```bash
pnpm install          # 의존성 설치
pnpm dev              # 개발 서버 (http://localhost:1420)
pnpm typecheck        # 타입 체크
pnpm build            # 프로덕션 빌드
```

## 다음 단계 (예정)
- 컨텍스트 메뉴
- 노드 타입 시스템
- 실행 엔진
- Undo/Redo
- 실시간 협업 (Yjs provider)
