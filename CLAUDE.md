# FlowForge - AI-Native Node Editor

## Project Overview
FlowForge는 AI 워크플로우를 위한 비주얼 노드 에디터입니다.
ComfyUI와 유사한 인터페이스로 LLM, 이미지 생성 등 AI 작업을 노드로 연결합니다.

## Current Status
- MVP 기능 대부분 구현 완료
- 30+ 노드 타입, AI 통합, 서브플로우, 모바일 지원

## Tech Stack
- **Frontend**: React 18 + Vite 5 + TypeScript
- **State**: Zustand + Yjs (CRDT for undo/redo)
- **Canvas**: WebGPU (primary) + WebGL2 (fallback)
- **AI**: OpenAI API, Anthropic API
- **Storage**: localStorage + IndexedDB (encrypted API keys)
- **Desktop**: Tauri (optional)

## Project Structure
```
flowforge/
├── src/                      # React application
│   ├── components/           # UI components
│   │   ├── FlowCanvas.tsx    # Main canvas (3600+ lines)
│   │   ├── ai/               # AI node widgets
│   │   ├── ErrorBoundary.tsx # Error handling
│   │   └── ...
│   ├── hooks/                # useIsMobile, useIsTouchDevice
│   └── i18n/                 # Internationalization (en/ko)
├── packages/
│   ├── canvas/               # Canvas rendering
│   │   └── src/
│   │       ├── renderer/     # WebGPU/WebGL2 renderers
│   │       ├── drawing/      # Node, edge, grid drawing
│   │       └── viewport/     # Coordinate transforms
│   └── state/                # State management
│       └── src/
│           ├── store.ts      # Zustand + Yjs store
│           ├── ai/           # AI providers, key management
│           ├── execution/    # Flow execution engine
│           ├── nodeTypes.ts  # Node type definitions
│           └── performance.ts # Viewport culling, memoization
├── shared/
│   └── types/                # Shared TypeScript types
└── src-tauri/                # Tauri desktop app
```

## Key Files
- `src/components/FlowCanvas.tsx` - Main canvas with all interactions
- `packages/state/src/store.ts` - Yjs + Zustand state management
- `packages/state/src/nodeTypes.ts` - 30+ node type definitions
- `packages/state/src/ai/` - AI provider integrations
- `packages/canvas/src/drawing/` - Canvas rendering functions

## Commands
```bash
npm run dev        # Dev server (http://localhost:1420)
npm run build      # Production build
npm run typecheck  # Type check
npm run tauri:dev  # Tauri desktop app
```

## Architecture Notes

### State Management
- **Yjs**: CRDT for collaborative editing and undo/redo
- **Zustand**: React state management, synced with Yjs
- **UndoManager**: Yjs-based, supports history visualization

### Rendering
- **WebGPU/WebGL2**: Hardware-accelerated canvas
- **Viewport culling**: Only render visible nodes (performance.ts)
- **60fps target**: requestAnimationFrame render loop

### AI Integration
- API keys encrypted with Web Crypto API, stored in IndexedDB
- Streaming responses via SSE parsing
- Supports OpenAI (GPT-4, DALL-E) and Anthropic (Claude)

### Execution Engine
- Topological sort for dependency resolution
- Async node execution with streaming support
- Status visualization (running/success/error)

## Coding Conventions
- TypeScript strict mode
- Functional components with hooks
- Types in shared/types package
- CSS-in-JS with inline styles
- Korean comments allowed

## Keyboard Shortcuts (40+)
See `src/i18n/translations.ts` for full list.
Key ones:
- `Tab` - Node palette
- `Ctrl+Z/Y` - Undo/Redo
- `Ctrl+H` - History panel
- `Ctrl+G` - Group nodes
- `Ctrl+Shift+G` - Create subflow
- `Ctrl+Shift+A` - Auto-layout
- `?` - Shortcuts help
