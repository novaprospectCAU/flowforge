// === Viewport (통일) ===
/**
 * x, y: 월드 좌표에서 화면 중심 위치
 * zoom: 줌 레벨 (1.0 = 100%)
 */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// === 기본 타입 ===
export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type DataType = 'string' | 'number' | 'boolean' | 'array' | 'any';

// === 캔버스 ===
export interface CanvasSize {
  width: number;   // CSS px
  height: number;  // CSS px
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// === 색상 ===
export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

// === 노드 ===
export interface FlowNode {
  id: string;
  type: string;
  position: Position;
  size: Size;
  data: Record<string, unknown>;
}

// === 엣지 ===
export interface FlowEdge {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
}

// === 그래프 ===
export interface FlowGraph {
  id: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: Viewport;
}

// === 실행 ===
export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error';

export interface NodeExecutionState {
  nodeId: string;
  status: ExecutionStatus;
  output?: Record<string, unknown>;
  error?: string;
  startTime?: number;
  endTime?: number;
}

// === 포트 정의 ===
export interface PortDefinition {
  id: string;
  name: string;
  dataType: DataType;
  defaultValue?: unknown;
  required?: boolean;
  multi?: boolean;
}

// === 렌더러 ===
export interface RendererCapabilities {
  type: 'webgpu' | 'webgl2' | 'none';
  maxTextureSize: number;
  supportsInstancing: boolean;
}

// === 베지어 ===
export interface BezierPoints {
  x1: number;
  y1: number;
  cx1: number;
  cy1: number;
  cx2: number;
  cy2: number;
  x2: number;
  y2: number;
}
