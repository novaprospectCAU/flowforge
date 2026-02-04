# FlowForge - AI-Native Node Editor

## 프로젝트 개요
FlowForge는 AI 워크플로우를 위한 노드 에디터 플랫폼입니다.
ComfyUI 같은 도구를 목표로 하며, 8주 MVP 일정으로 개발 중입니다.

## 현재 상태
- **Week 0.5**: 캔버스 계약 테스트 완료
- 브라우저에서 개발 중 (Tauri는 나중에)

## 기술 스택
- Frontend: React 18 + Vite 5 + TypeScript
- Canvas: WebGPU (primary) + WebGL2/Canvas2D (fallback)
- State: Yjs + Zustand (Week 1에서 추가)
- 데스크탑: Tauri (나중에)

## 프로젝트 구조
```
flowforge/
├── src/                    # React 앱
├── packages/
│   └── canvas/            # 캔버스 렌더러
│       └── src/
│           ├── renderer/  # WebGPU/WebGL2
│           └── viewport/  # 좌표 변환
├── shared/
│   └── types/             # 공유 타입
└── CLAUDE.md              # 이 파일
```

## 주요 파일
- `shared/types/src/index.ts` - Viewport, FlowNode, FlowEdge 등 핵심 타입
- `packages/canvas/src/renderer/` - 렌더러 구현
- `packages/canvas/src/viewport/transform.ts` - 좌표 변환 함수

## 개발 명령어
- `npm run dev` - 개발 서버 (http://localhost:1420)
- `npm run build` - 프로덕션 빌드
- `npm run typecheck` - 타입 체크

## 현재 마일스톤: Week 1
- [ ] 모노레포 구조 확장 (pnpm workspace)
- [ ] packages/state 추가 (Yjs + Zustand)
- [ ] 기본 노드 렌더링
- [ ] Pan/Zoom 인터랙션

## 코딩 규칙
- TypeScript strict mode
- 함수형 컴포넌트 + hooks
- 타입은 shared/types에 정의
- 좌표는 CSS px 기준 (DPR은 내부 처리)

## 참고: v3.4 설계서 핵심
- Viewport: `{ x, y, zoom }` - 화면 중심의 월드 좌표
- 좌표 변환: `screenToWorld()`, `worldToScreen()`
- 렌더러: IRenderer 인터페이스로 추상화
- 텍스트: 정수 스냅 (half-pixel은 라인만)