import type { ExecutionStatus } from '@flowforge/types';

/**
 * 노드 실행 컨텍스트
 */
export interface ExecutionContext {
  /** 노드 ID */
  nodeId: string;
  /** 노드 타입 */
  nodeType: string;
  /** 노드 데이터 */
  nodeData: Record<string, unknown>;
  /** 입력 포트 값들 */
  inputs: Record<string, unknown>;
  /** 실행 중단 시그널 */
  signal?: AbortSignal;
}

/**
 * 노드 실행 결과
 */
export interface ExecutionResult {
  /** 출력 포트 값들 */
  outputs: Record<string, unknown>;
  /** 에러 메시지 (실패 시) */
  error?: string;
  /** 노드 데이터 업데이트 (UI 반영용) */
  nodeDataUpdate?: Record<string, unknown>;
}

/**
 * 노드 실행자 함수
 */
export type NodeExecutor = (ctx: ExecutionContext) => Promise<ExecutionResult>;

/**
 * 노드 실행 상태
 */
export interface NodeState {
  status: ExecutionStatus;
  outputs: Record<string, unknown>;
  error?: string;
  startTime?: number;
  endTime?: number;
}

/**
 * 전체 실행 상태
 */
export interface ExecutionState {
  status: ExecutionStatus;
  nodeStates: Map<string, NodeState>;
  startTime?: number;
  endTime?: number;
}

/**
 * 실행 이벤트
 */
export type ExecutionEvent =
  | { type: 'start' }
  | { type: 'node-start'; nodeId: string }
  | { type: 'node-complete'; nodeId: string; outputs: Record<string, unknown> }
  | { type: 'node-error'; nodeId: string; error: string }
  | { type: 'node-data-update'; nodeId: string; data: Record<string, unknown> }
  | { type: 'complete' }
  | { type: 'error'; error: string };

/**
 * 실행 이벤트 핸들러
 */
export type ExecutionEventHandler = (event: ExecutionEvent) => void;

/**
 * 실행 엔진 옵션
 */
export interface ExecutionOptions {
  /** 이벤트 핸들러 */
  onEvent?: ExecutionEventHandler;
  /** 중단 시그널 */
  signal?: AbortSignal;
}
