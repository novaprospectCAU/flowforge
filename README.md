# FlowForge

**AI-Native Visual Node Editor for Building Workflows**

FlowForge는 AI 워크플로우를 시각적으로 설계하고 실행할 수 있는 노드 기반 에디터입니다. ComfyUI와 유사한 인터페이스로, LLM 채팅, 이미지 생성 등 다양한 AI 작업을 노드로 연결하여 복잡한 파이프라인을 구축할 수 있습니다.

## Features

### Core
- **Visual Node Editor** - 드래그 앤 드롭으로 노드 연결
- **Real-time Execution** - 플로우 실행 및 스트리밍 결과 확인
- **Auto-save** - localStorage 자동 저장
- **Undo/Redo** - 무제한 실행 취소/다시 실행 (Yjs 기반)
- **Export/Import** - JSON 파일로 플로우 저장 및 불러오기

### AI Integration
- **LLM Chat** - OpenAI GPT, Anthropic Claude 지원
- **Image Generation** - DALL-E 이미지 생성
- **Prompt Templates** - 변수 치환 템플릿 (`{{variable}}`)
- **Streaming Response** - 실시간 스트리밍 응답 표시
- **API Key Management** - 안전한 API 키 저장 (Web Crypto API)

### Node Types (30+)
| Category | Nodes |
|----------|-------|
| **Input** | Number, Text, Image |
| **AI** | LLM Chat, Image Generate, Prompt Template |
| **Logic** | Condition, Compare, Gate, Switch |
| **Text** | Join, Split, Replace, Length, Case |
| **Data** | JSON Parse/Stringify, Get Property, Array operations |
| **Utility** | Delay, Debug, Random, Timestamp |
| **Convert** | To String, To Number, To Boolean |
| **Process** | Math, Resize, Filter, Merge |
| **Output** | Display, Save Image |

### Organization
- **Groups** - 노드 그룹화 및 색상 지정
- **Subflows** - 노드 그룹을 재사용 가능한 서브플로우로 변환
- **Templates** - 서브플로우 템플릿 저장 및 재사용
- **Comments** - 스티키 노트 스타일 코멘트

### UX
- **Keyboard Shortcuts** - 40+ 단축키 지원
- **Multi-language** - 한국어/영어 지원
- **Mobile Support** - 터치 기기 최적화 (핀치 줌, 제스처)
- **Auto-layout** - 계층적 자동 노드 정렬
- **Minimap** - 전체 플로우 미니맵
- **History Panel** - 시각적 Undo/Redo 히스토리

## Installation

```bash
# Clone repository
git clone https://github.com/novaprospectCAU/flowforge.git
cd flowforge

# Install dependencies
npm install

# Start development server
npm run dev
```

브라우저에서 http://localhost:1420 접속

## Keyboard Shortcuts

### General
| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+H` | History panel |
| `Ctrl+S` | Save to file |
| `Ctrl+O` | Open file |
| `Ctrl+A` | Select all |
| `Delete` | Delete selected |
| `?` / `F1` | Show shortcuts help |

### Nodes
| Shortcut | Action |
|----------|--------|
| `Tab` | Open node palette |
| `Double-click` | Quick add node |
| `Ctrl+C/V` | Copy/Paste |
| `Ctrl+D` | Duplicate |
| `Ctrl+Shift+A` | Auto-layout selected |
| `Alt+A` | Auto-layout all |

### Navigation
| Shortcut | Action |
|----------|--------|
| `Space+Drag` | Pan canvas |
| `Scroll` | Zoom |
| `F` | Fit view |
| `Ctrl+0` | Reset zoom |

### Organization
| Shortcut | Action |
|----------|--------|
| `Ctrl+G` | Group nodes |
| `Ctrl+Shift+G` | Create subflow |
| `Ctrl+Shift+U` | Ungroup |
| `C` | Add comment |
| `T` | Template browser |

## Project Structure

```
flowforge/
├── src/                      # React application
│   ├── components/           # UI components
│   │   ├── FlowCanvas.tsx    # Main canvas component
│   │   ├── ai/               # AI node widgets
│   │   └── ...
│   ├── hooks/                # Custom React hooks
│   └── i18n/                 # Internationalization
├── packages/
│   ├── canvas/               # Canvas rendering engine
│   │   └── src/
│   │       ├── renderer/     # WebGPU/WebGL2 renderers
│   │       ├── drawing/      # Draw functions
│   │       └── viewport/     # Coordinate transforms
│   └── state/                # State management
│       └── src/
│           ├── store.ts      # Zustand + Yjs store
│           ├── ai/           # AI providers & executors
│           ├── execution/    # Flow execution engine
│           └── performance.ts # Performance utilities
├── shared/
│   └── types/                # Shared TypeScript types
└── src-tauri/                # Tauri desktop app (optional)
```

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 5
- **State**: Zustand + Yjs (CRDT for undo/redo)
- **Rendering**: WebGPU (primary) + WebGL2 (fallback)
- **AI**: OpenAI API, Anthropic API
- **Storage**: localStorage + IndexedDB (API keys)
- **Desktop**: Tauri (optional)

## Development

```bash
# Type check
npm run typecheck

# Build
npm run build

# Tauri desktop app (requires Rust)
npm run tauri:dev
```

## API Keys Setup

1. Press `Ctrl+K` or click "API Keys" in toolbar
2. Add your OpenAI or Anthropic API key
3. Keys are encrypted and stored locally in IndexedDB

## Browser Support

- Chrome/Edge 113+ (WebGPU)
- Firefox 120+ (WebGPU behind flag)
- Safari 17+ (WebGPU)
- Older browsers fall back to WebGL2

## License

MIT

---

**FlowForge** - Build AI workflows visually
