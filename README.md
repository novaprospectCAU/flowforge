# FlowForge

**AI-Native Visual Node Editor for Building Workflows**

FlowForge는 AI 워크플로우를 시각적으로 설계하고 실행할 수 있는 노드 기반 에디터입니다. ComfyUI와 유사한 인터페이스로, LLM 채팅, 이미지 생성 등 다양한 AI 작업을 노드로 연결하여 복잡한 파이프라인을 구축할 수 있습니다.

## Quick Start

```bash
git clone https://github.com/novaprospectCAU/flowforge.git
cd flowforge
npm install
npm run dev
```

브라우저에서 http://localhost:1420 접속

## Features

### Core
- **Visual Node Editor** - 드래그 앤 드롭으로 노드 연결
- **Real-time Execution** - 플로우 실행 및 스트리밍 결과 확인
- **Auto-save** - localStorage 자동 저장
- **Undo/Redo** - 무제한 실행 취소/다시 실행 (Yjs 기반)
- **Export/Import** - JSON 파일로 플로우 저장 및 불러오기

### AI Integration
- **LLM Chat** - OpenAI GPT, Anthropic Claude, Google Gemini 지원
- **Image Generation** - DALL-E, Gemini Imagen
- **Prompt Templates** - 변수 치환 템플릿 (`{{variable}}`)
- **Streaming Response** - 실시간 스트리밍 응답 표시
- **Function Calling / Tool Use** - OpenAI, Anthropic 도구 호출 지원
- **API Key Management** - 안전한 API 키 저장 (Web Crypto API 암호화)

### Node Pack System
- **Pack Browser** - 노드 팩 활성화/비활성화, JSON import/export
- **Mathematician Pack** - 삼각함수, 통계, 수식 파서 등 21개 수학 노드
- **AI Engineer Pack** - 영상 생성, 인페인팅, 업스케일 등 8개 AI 노드
- **Custom Node Editor** - 서브플로우를 단일 커스텀 노드로 변환

### Organization
- **Groups** - 노드 그룹화 및 색상 지정
- **Subflows** - 노드 그룹을 재사용 가능한 서브플로우로 변환
- **Templates** - 서브플로우 템플릿 저장 및 재사용
- **Comments** - 스티키 노트 스타일 코멘트

### UX
- **Multi-language** - 한국어/영어 지원
- **Mobile Support** - 터치 기기 최적화 (핀치 줌, 제스처)
- **Auto-layout** - 계층적 자동 노드 정렬
- **Minimap** - 전체 플로우 미니맵
- **History Panel** - 시각적 Undo/Redo 히스토리
- **Dark/Light Theme** - 테마 전환 지원

---

## Usage Guide

### 기본 사용법

#### 1. 노드 추가하기

캔버스에 노드를 추가하는 방법은 여러 가지입니다:

- **`Tab` 키** — 노드 팔레트가 열립니다. 검색하거나 카테고리별로 노드를 찾아 클릭하면 추가됩니다.
- **더블클릭** — 빈 캔버스를 더블클릭하면 노드 팔레트가 열립니다.
- **우클릭 메뉴** — 캔버스를 우클릭하면 "Add Node" 메뉴가 나타납니다.

#### 2. 노드 연결하기

1. 노드의 **출력 포트** (오른쪽 원)를 클릭한 채로 드래그합니다.
2. 다른 노드의 **입력 포트** (왼쪽 원)에 놓으면 엣지가 생성됩니다.
3. 호환되는 데이터 타입끼리만 연결됩니다 (`any` 타입은 모든 타입과 연결 가능).

#### 3. 플로우 실행하기

- 상단 툴바의 **Play 버튼**을 클릭하거나 `Ctrl+Enter`를 누릅니다.
- 노드가 순서대로 실행되며, 각 노드에 실행 상태 (초록=성공, 빨강=에러)가 표시됩니다.
- Display 노드에서 결과를 확인할 수 있습니다.

#### 4. 캔버스 이동/줌

- **팬 (이동)**: `Space` 키를 누른 채 드래그, 또는 마우스 가운데 버튼 드래그
- **줌**: 마우스 휠 스크롤
- **전체 보기**: `F` 키
- **줌 리셋**: `Ctrl+0`

#### 5. 저장/불러오기

- **자동 저장**: 변경사항이 자동으로 localStorage에 저장됩니다.
- **파일로 저장**: `Ctrl+S` → JSON 파일 다운로드
- **파일 열기**: `Ctrl+O` → JSON 파일 선택
- **이미지 내보내기**: `Ctrl+Shift+E` → 캔버스를 PNG로 내보내기

---

### AI 노드 사용법

#### API 키 설정

AI 노드를 사용하려면 먼저 API 키를 등록해야 합니다:

1. `Ctrl+K`를 누르거나 툴바에서 **API Keys** 버튼을 클릭합니다.
2. **+ Add Key** 버튼을 클릭합니다.
3. Provider (OpenAI / Anthropic / Gemini)를 선택하고, 키 이름과 API 키를 입력합니다.
4. 키는 Web Crypto API로 암호화되어 IndexedDB에 안전하게 저장됩니다.

#### LLM Chat 노드

텍스트 기반 AI 대화를 수행합니다:

1. `Tab` → "LLM Chat" 검색 → 클릭하여 추가
2. 노드를 클릭하면 오른쪽에 **Property Panel**이 열립니다.
3. **Provider** (OpenAI / Anthropic / Gemini), **Model**, **API Key**를 선택합니다.
4. **prompt** 입력 포트에 텍스트를 연결하거나, TextInput 노드를 연결합니다.
5. 실행하면 **response** 출력에 AI 응답이 나옵니다.
6. **stream** 옵션을 켜면 실시간으로 응답이 표시됩니다.

#### Image Generate 노드

AI 이미지 생성:

1. `Tab` → "Image Generate" 검색 → 추가
2. Provider, Model, API Key 설정
3. prompt 입력에 이미지 설명 텍스트 연결
4. 실행하면 생성된 이미지가 노드에 표시됩니다.

#### Prompt Template 노드

변수를 포함한 프롬프트 템플릿:

1. `Tab` → "Prompt Template" 검색 → 추가
2. 템플릿 텍스트에 `{{var1}}`, `{{var2}}` 형태로 변수를 작성합니다.
3. var1, var2 입력 포트에 값을 연결하면 자동으로 치환됩니다.

---

### Node Pack System

FlowForge는 플러그인 형태의 **Node Pack** 시스템을 지원합니다. 팩을 활성화하면 해당 팩의 노드들이 팔레트에 추가됩니다.

#### Pack Browser 열기

- `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)를 누르면 **Pack Browser** 모달이 열립니다.

#### 빌트인 팩 활성화하기

1. `Ctrl+Shift+P`로 Pack Browser를 엽니다.
2. **Mathematician Pack** 또는 **AI Engineer Pack** 카드를 찾습니다.
3. 카드 오른쪽의 **Enable** 버튼을 클릭합니다.
4. 활성화되면 `Tab`으로 노드 팔레트를 열었을 때 해당 팩의 노드들이 나타납니다.
5. 비활성화하려면 같은 버튼 (**Enabled** 상태)을 다시 클릭합니다.

#### Mathematician Pack (21 nodes)

수학 연산을 위한 노드들입니다. 활성화 후 `Tab` → "math" 또는 "sin", "cos" 등으로 검색하세요.

| 카테고리 | 노드 | 설명 |
|---------|------|------|
| **Math/Basic** | Power, Sqrt, Abs, Floor, Ceil, Round, Log, Exp, Modulo | 기본 수학 함수 |
| **Math/Trig** | Sin, Cos, Tan, Atan2 | 삼각함수 (라디안 입력) |
| **Math/Stats** | Mean, Median, Sum, StdDev, MinMax | 배열 통계 함수 |
| **Math/Const** | Pi, E | 수학 상수 |
| **Math/Basic** | Expression | 수식 문자열 평가 (안전한 파서) |

**Expression 노드 사용법:**
- `expression` 입력에 수식 문자열을 연결합니다 (예: `"sqrt(x^2 + y^2)"`)
- `vars` 입력에 변수 객체를 연결합니다 (예: `{"x": 3, "y": 4}`)
- 지원 연산: `+`, `-`, `*`, `/`, `^`, `%`, `()`
- 지원 함수: `sqrt`, `sin`, `cos`, `tan`, `log`, `abs`, `floor`, `ceil`, `round`, `min`, `max`
- 지원 상수: `pi`, `e`

#### AI Engineer Pack (8 nodes)

영상/이미지 AI 처리 노드들입니다. 일부 노드는 Gemini API 통합이 필요합니다.

| 카테고리 | 노드 | 설명 |
|---------|------|------|
| **AI/Video** | ImageToVideo, VideoToVideo | Veo 기반 영상 생성/변환 |
| **AI/Image** | Inpainting, ImageUpscale, BackgroundRemove, StyleTransfer | Gemini Imagen 이미지 처리 |
| **AI/Vision** | DepthMap | 깊이맵 추출 |
| **AI/Image** | ImageBlend | 두 이미지 블렌딩 (로컬 처리, API 불필요) |

**ImageBlend 노드 사용법:**
- image1, image2 입력에 이미지를 연결합니다.
- Property Panel에서 **mode** (normal, multiply, screen, overlay, darken, lighten)와 **alpha** (0~1)를 설정합니다.
- 이 노드는 API 호출 없이 브라우저 Canvas로 로컬 처리됩니다.

#### 팩 Import / Export

커스텀 팩을 JSON 파일로 공유할 수 있습니다:

- **Export**: Pack Browser에서 커스텀 팩 선택 → 상세 패널의 **Export JSON** 버튼 클릭 → JSON 파일 다운로드
- **Import**: Pack Browser 하단의 입력란에 JSON을 붙여넣고 **Import** 버튼 클릭

---

### Custom Node 만들기

서브플로우를 단일 커스텀 노드로 변환하여 재사용할 수 있습니다.

#### Step 1: 서브플로우 만들기

1. 여러 노드를 드래그로 선택합니다.
2. `Ctrl+Shift+G`를 누르면 선택된 노드들이 **서브플로우**로 묶입니다.
3. 외부와 연결된 엣지가 자동으로 입출력 포트로 변환됩니다.

#### Step 2: 서브플로우 설정

1. 서브플로우를 클릭하면 화면 왼쪽 상단에 **Subflow Panel**이 나타납니다.
2. **Name**: 서브플로우 이름을 지정합니다.
3. **Input Ports / Output Ports**: 포트 이름을 변경하거나, 불필요한 포트를 제거할 수 있습니다.
4. **Collapse/Expand**: 서브플로우를 접으면 단일 노드처럼 보입니다.

#### Step 3: 커스텀 노드로 퍼블리시

1. Subflow Panel 하단의 **"Publish as Custom Node"** 버튼을 클릭합니다.
2. 퍼블리시 다이얼로그에서 설정합니다:
   - **Title**: 노드 이름 (예: "My Processor")
   - **Category**: 팔레트 카테고리 (예: "Custom", "AI/Pipeline")
   - **Description**: 노드 설명
   - **Color**: 노드 색상
   - **Target Pack**: 기존 커스텀 팩을 선택하거나 "Create new pack"으로 새 팩 생성
3. 포트 미리보기에서 입출력이 올바른지 확인합니다.
4. **Publish** 버튼을 클릭합니다.
5. 이후 `Tab` → 노드 팔레트에서 퍼블리시한 노드를 검색하여 사용할 수 있습니다.

---

### Subflows & Templates

#### 서브플로우 (Subflow)

서브플로우는 여러 노드를 하나의 단위로 묶는 기능입니다:

1. 노드 여러 개를 선택합니다.
2. `Ctrl+Shift+G` → 서브플로우 생성
3. 서브플로우는 **접기/펼치기** 가능 (Subflow Panel에서 Collapse/Expand)
4. 접힌 서브플로우는 하나의 노드처럼 동작하며, 입출력 포트를 통해 데이터가 흐릅니다.

#### 템플릿 (Template)

서브플로우를 템플릿으로 저장하여 재사용할 수 있습니다:

1. 서브플로우 클릭 → Subflow Panel 열기
2. **"Save as Template"** 버튼 클릭
3. `T` 키를 누르면 **Template Browser**가 열립니다.
4. 저장된 템플릿을 클릭하면 현재 캔버스에 인스턴스가 추가됩니다.

---

### Groups & Comments

#### 그룹 (Groups)

관련 노드들을 시각적으로 묶어 정리합니다:

1. 노드를 여러 개 선택합니다.
2. `Ctrl+G` → 그룹 생성
3. 그룹에 색상을 지정하여 구분할 수 있습니다.
4. 그룹 해제: `Ctrl+Shift+U`

#### 코멘트 (Comments)

캔버스에 메모를 남길 수 있습니다:

1. `C` 키를 누르면 마우스 위치에 코멘트가 생성됩니다.
2. 코멘트를 더블클릭하면 텍스트를 편집할 수 있습니다.
3. 코멘트의 크기를 드래그로 조절할 수 있습니다.

---

### Node Types (30+ built-in)

| Category | Nodes | Description |
|----------|-------|-------------|
| **Input** | Number, Text, Image | 값 입력 노드 |
| **AI** | LLM Chat, Image Generate, Prompt Template | AI 통합 노드 |
| **Process** | Math, Resize, Filter, Merge | 데이터/이미지 처리 |
| **Logic** | Condition, Compare, Gate, Switch, ForEach, Range | 조건 분기, 반복 |
| **Text** | Join, Split, Replace, Length, Case | 텍스트 조작 |
| **Data** | HTTPRequest, JSONParse, JSONStringify, GetProperty, ArrayGet, ArrayLength, CreateArray | 데이터 처리 |
| **Utility** | Delay, Debug, Random, Timestamp, Comment | 유틸리티 |
| **Convert** | ToString, ToNumber, ToBoolean | 타입 변환 |
| **Output** | Display, Save Image | 결과 출력 |

---

## Keyboard Shortcuts

### General
| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Save to file |
| `Ctrl+O` | Open file |
| `Ctrl+N` | New flow |
| `Ctrl+A` | Select all |
| `Ctrl+Shift+E` | Export as image |
| `Delete` / `Backspace` | Delete selected |
| `Escape` | Deselect all / Close panel |

### Nodes
| Shortcut | Action |
|----------|--------|
| `Tab` | Open node palette |
| `Double-click` | Quick add node |
| `Ctrl+C` | Copy |
| `Ctrl+V` | Paste |
| `Ctrl+D` | Duplicate |
| `Ctrl+F` | Search nodes |
| `Arrow keys` | Move selected nodes |

### Navigation
| Shortcut | Action |
|----------|--------|
| `Space+Drag` | Pan canvas |
| `Scroll` | Zoom in/out |
| `F` | Fit view to all nodes |
| `Ctrl+0` | Reset zoom to 100% |

### Organization
| Shortcut | Action |
|----------|--------|
| `Ctrl+G` | Group selected nodes |
| `Ctrl+Shift+G` | Create subflow |
| `Ctrl+Shift+U` | Ungroup |
| `C` | Add comment |
| `T` | Template browser |
| `G` | Toggle snap to grid |

### Layout
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+A` | Auto-layout selected |
| `Alt+A` | Auto-layout all |
| `Alt+Arrow` | Align nodes (direction) |
| `Alt+Shift+Arrow` | Center-align nodes |

### Panels & Tools
| Shortcut | Action |
|----------|--------|
| `Ctrl+H` | History panel |
| `Ctrl+K` | API Key manager |
| `Ctrl+Shift+P` | Pack Browser |
| `Ctrl+Shift+T` | Toggle dark/light theme |
| `?` / `F1` | Shortcuts help |

---

## Project Structure

```
flowforge/
├── src/                          # React application
│   ├── components/               # UI components
│   │   ├── FlowCanvas.tsx        # Main canvas component
│   │   ├── ai/                   # AI node widgets
│   │   ├── packs/                # Pack Browser, Publish Dialog
│   │   └── ...
│   ├── hooks/                    # Custom React hooks
│   └── i18n/                     # Internationalization (en/ko)
├── packages/
│   ├── canvas/                   # Canvas rendering engine
│   │   └── src/
│   │       ├── renderer/         # WebGPU/WebGL2 renderers
│   │       ├── drawing/          # Draw functions
│   │       └── viewport/         # Coordinate transforms
│   └── state/                    # State management
│       └── src/
│           ├── store.ts          # Zustand + Yjs store
│           ├── ai/               # AI providers & executors
│           ├── execution/        # Flow execution engine
│           ├── packs/            # Node Pack system
│           │   ├── packRegistry.ts    # Pack lifecycle management
│           │   ├── builtin/           # Math Pack, AI Engineer Pack
│           │   ├── subflowExecutor.ts # Subflow → executor conversion
│           │   └── subflowConversion.ts # Subflow → custom node
│           └── performance.ts    # Performance utilities
├── shared/
│   └── types/                    # Shared TypeScript types
└── src-tauri/                    # Tauri desktop app (optional)
```

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 5
- **State**: Zustand + Yjs (CRDT for undo/redo)
- **Rendering**: WebGPU (primary) + WebGL2 (fallback)
- **AI**: OpenAI API, Anthropic API, Google Gemini API
- **Storage**: localStorage + IndexedDB (API keys)
- **Desktop**: Tauri (optional)

## Development

```bash
npm run dev        # Development server (http://localhost:1420)
npm run typecheck  # TypeScript type check
npm run build      # Production build
npm run test:run   # Run tests (vitest)
npm run tauri:dev  # Tauri desktop app (requires Rust)
```

## Browser Support

- Chrome/Edge 113+ (WebGPU)
- Firefox 120+ (WebGPU behind flag)
- Safari 17+ (WebGPU)
- Older browsers fall back to WebGL2

## License

MIT

---

**FlowForge** - Build AI workflows visually
