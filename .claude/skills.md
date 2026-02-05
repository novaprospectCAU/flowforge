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
│           ├── yjsDoc.ts     # Yjs 문서
│           ├── nodeTypes.ts  # 노드 타입 레지스트리
│           └── execution/    # 실행 엔진
├── shared/
│   └── types/           # @flowforge/types - 공유 타입
└── src/                 # React 앱
    └── components/
        └── FlowCanvas.tsx
```

## 구현된 기능

### 렌더링
- **노드 렌더링**: 둥근 모서리 + 헤더 + 타이틀 + 포트 + 포트 라벨
- **포트 라벨**: 각 포트 옆에 이름 표시 (입력 포트: 오른쪽, 출력 포트: 왼쪽)
- **포트 타입 색상**: 데이터 타입별 색상 (image=파랑, number=연두, string=주황, boolean=분홍, array=보라, object=청록, any=회색)
- **엣지 렌더링**: 베지어, 직선, 직각 스타일 (토글 가능), 데이터 타입별 색상
- **그리드 배경**: 무한 그리드 (minor/major 라인)
- **미니맵**: 오른쪽 하단, 클릭/드래그로 뷰포트 이동, 선택된 노드 파란색 하이라이트

### 인터랙션
- **Pan**: 휠 클릭 드래그 또는 Alt + 드래그
- **Zoom**: 마우스 휠 (마우스 위치 기준)
- **노드 선택**: 클릭
- **다중 선택**: Shift + 클릭, 또는 박스 선택 (빈 공간 드래그)
- **선택 정보 바**: 2개 이상 선택 시 하단에 표시 (노드 수, 정렬, 분배, 그룹화, 복제, 삭제 버튼)
- **노드 드래그**: 선택된 노드 이동
- **엣지 연결**: 포트에서 드래그하여 연결
- **연결 프리뷰**: 포트 드래그 시 호환 가능한 포트 초록색 하이라이트, 비호환 포트 어둡게 표시
- **타입 호환성 검사**: 같은 타입 또는 'any' 타입끼리만 연결 가능, 비호환 타입 연결 방지
- **노드 삭제**: Delete 키
- **엣지 삭제**: 엣지 클릭
- **컨텍스트 메뉴**: 우클릭 (노드 추가/삭제/복제)
- **Undo/Redo**: Ctrl+Z / Ctrl+Y (Cmd+Z / Cmd+Shift+Z), 상단 툴바에 버튼 제공
- **복사/붙여넣기**: Ctrl+C / Ctrl+V (Cmd+C / Cmd+V)
- **복제**: Ctrl+D (Cmd+D) - 선택된 노드와 연결된 엣지 복제
- **전체 선택**: Ctrl+A (Cmd+A)
- **선택 해제**: Escape
- **뷰 맞춤**: F - 선택된 노드 또는 모든 노드가 화면에 보이도록 조정
- **줌 리셋**: Ctrl+0 (Cmd+0) - 100%로 리셋
- **노드 미세 이동**: 화살표 키 (그리드 또는 10px), Shift+화살표 (1px)
- **스냅 토글**: G 키 또는 우측 상단 버튼 - 20px 그리드에 맞춤
- **스냅 라인**: 그리드 스냅 OFF 시, 다른 노드와 정렬되면 파란색 가이드 라인 표시
- **노드 정렬**: Alt+화살표 (좌/우/상/하 정렬), 우클릭 메뉴
- **균등 분배**: Ctrl+Shift+H (수평), Ctrl+Shift+V (수직)
- **줌 컨트롤**: 좌측 하단 UI (+/- 버튼, 퍼센트 클릭 시 프리셋 드롭다운 25%~300%, Fit View)
- **노드 검색**: Ctrl+F (Cmd+F) - 이름/타입으로 검색, Enter로 이동
- **단축키 도움말**: ? 또는 F1 - 모든 단축키 보기
- **노드 리사이즈**: 선택된 노드의 모서리/가장자리 드래그 (최소 100x60)
- **노드 그룹화**: Ctrl+G (그룹 생성), Ctrl+Shift+G (그룹 해제), 그룹 헤더 클릭으로 전체 선택
- **키보드 노드 탐색**: [ / ] 이전/다음 노드, 화살표 키 (미선택 시) 해당 방향 노드 선택, Enter 선택 노드로 뷰 이동
- **파일 저장/불러오기**: Ctrl+S (저장), Ctrl+O (열기), Ctrl+N (새 플로우)
- **자동 저장**: 30초마다 localStorage에 자동 저장, 브라우저 새로고침 후에도 데이터 유지
- **이미지 내보내기**: Ctrl+Shift+E - PNG 이미지로 내보내기 (2x 해상도)

### 상태 관리
- **Yjs**: CRDT 기반 실시간 동기화 준비
- **Zustand**: React 상태 관리
- **노드 CRUD**: addNode, updateNode, deleteNode
- **엣지 CRUD**: addEdge, deleteEdge
- **뷰포트**: setViewport, pan, zoom

### 노드 타입 시스템
- **노드 레지스트리**: 타입별 정의 관리
- **내장 타입**: NumberInput, TextInput, ImageInput, Math, Resize, Filter, Merge, Display, SaveImage, Condition
- **카테고리**: Input, Process, Output, Logic
- **검색 팔레트**: Tab 키 또는 빈 공간 더블클릭으로 노드 검색 및 추가

### 실행 엔진
- **위상 정렬**: 노드 실행 순서 결정 (순환 감지)
- **실행자 레지스트리**: 노드 타입별 실행 함수
- **이벤트 시스템**: 실행 상태 변화 콜백
- **Run 버튼**: 플로우 실행 UI
- **실행 상태 시각화**: 노드 테두리 색상 (노란색=실행중, 초록색=완료, 빨간색=에러)

### 프로퍼티 패널
- **노드 설정**: 단일 노드 선택 시 좌측에 패널 표시
- **공통 필드**: Title 편집
- **타입별 필드**: NumberInput(값), TextInput(텍스트), Math(연산), Filter(필터), Merge(모드), SaveImage(경로)
- **노드 정보**: ID, Position, Size 표시

### 인라인 위젯
- **노드 위젯**: 노드 위에 HTML 오버레이로 인라인 편집 지원
- **NumberInput**: 숫자 입력 (드래그로 값 조절 가능)
- **TextInput**: 텍스트 영역
- **드롭다운**: Math(연산), Filter(필터), Resize(스케일 슬라이더), Merge(모드), Condition(조건)
- **줌 적응**: 줌 레벨에 따라 위젯 크기 조절, 50% 미만에서 숨김
- **인터랙션 분리**: 위젯 편집 중 캔버스 이벤트 차단

### 노드 검증
- **필수 포트 검증**: 연결되지 않은 필수 입력 포트 자동 감지
- **경고 표시**: 검증 실패 노드에 주황색 테두리
- **포트 경고**: 미연결 필수 포트에 빨간 링 + 라벨에 * 표시
- **필수 포트 정의**: Math(A,B), Resize(image), Filter(image), Merge(A), Display(input), SaveImage(image), Condition(condition)

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
  undo(): void
  redo(): void
}

// 노드 타입 레지스트리
nodeTypeRegistry.register(definition: NodeTypeDefinition): void
nodeTypeRegistry.get(type: string): NodeTypeDefinition | undefined
nodeTypeRegistry.getAll(): NodeTypeDefinition[]
nodeTypeRegistry.getByCategory(category: string): NodeTypeDefinition[]

// 실행 엔진
executeFlow(nodes, edges, options): Promise<ExecutionState>
executorRegistry.register(nodeType: string, executor: NodeExecutor): void
topologicalSort(nodes, edges): string[]  // 실행 순서 반환
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
- 실시간 협업 (Yjs provider)
- 커스텀 노드 타입 플러그인
