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

/**
 * 줌 관련 상수
 */
export const ZOOM_CONFIG = {
  /** 최소 줌 레벨 */
  MIN: 0.1,
  /** 최대 줌 레벨 */
  MAX: 5,
  /** 버튼 클릭 시 줌 배율 */
  STEP: 1.2,
  /** 휠 줌인 배율 */
  WHEEL_IN: 1.1,
  /** 휠 줌아웃 배율 */
  WHEEL_OUT: 0.9,
  /** 위젯이 보이는 최소 줌 (이 미만에서는 숨김) */
  WIDGET_VISIBILITY_THRESHOLD: 0.5,
  /** 줌 값 비교 시 허용 오차 */
  COMPARISON_EPSILON: 0.01,
} as const;

// === 기본 타입 ===
export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type DataType = 'string' | 'number' | 'boolean' | 'array' | 'image' | 'object' | 'any';

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
  inputs?: PortDefinition[];
  outputs?: PortDefinition[];
}

// === 엣지 ===
export interface FlowEdge {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
}

// === 노드 그룹 ===
export interface NodeGroup {
  id: string;
  name: string;
  nodeIds: string[];
  color?: string; // 그룹 배경 색상
  collapsed?: boolean; // 접힌 상태
}

// === 코멘트 ===
export interface Comment {
  id: string;
  text: string;
  position: Position;
  size: Size;
  color?: string;  // 배경 색상 (hex)
  createdAt?: number;  // 생성 시간 (timestamp)
  updatedAt?: number;  // 수정 시간 (timestamp)
}

// === 서브플로우 ===
// 서브플로우 포트 매핑
export interface SubflowPortMapping {
  exposedPortId: string;      // 서브플로우에 노출된 포트 ID
  exposedPortName: string;    // 표시 이름
  internalNodeId: string;     // 내부 노드 ID
  internalPortId: string;     // 내부 노드의 포트 ID
  dataType: DataType;
  isOutput: boolean;
}

// 서브플로우 정의
export interface Subflow {
  id: string;
  name: string;
  nodeIds: string[];           // 포함된 노드 ID들
  internalEdgeIds: string[];   // 내부 엣지 ID들
  inputMappings: SubflowPortMapping[];
  outputMappings: SubflowPortMapping[];
  collapsed: boolean;
  collapsedPosition?: Position;
  collapsedSize?: Size;
  color?: string;
}

// 서브플로우 템플릿 (재사용 가능한 서브플로우)
export interface SubflowTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  nodes: FlowNode[];           // 템플릿에 포함된 노드들 (상대 좌표)
  edges: FlowEdge[];           // 내부 엣지들
  inputMappings: SubflowPortMapping[];
  outputMappings: SubflowPortMapping[];
  createdAt: string;
  updatedAt: string;
}

// === 그래프 ===
export interface FlowGraph {
  id: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  groups?: NodeGroup[];
  comments?: Comment[];
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

export interface NodePorts {
  inputs: PortDefinition[];
  outputs: PortDefinition[];
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
