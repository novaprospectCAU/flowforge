import type { FlowNode, FlowEdge } from '@flowforge/types';
import type {
  ExecutionState,
  ExecutionOptions,
  ExecutionEvent,
  NodeState,
  ExecutionContext,
  NodeRetryConfig,
} from './types';
import { topologicalLevels } from './topologicalSort';
import { executorRegistry } from './executorRegistry';
import { nodeTypeRegistry } from '../nodeTypes';

/** 기본 재시도 설정 */
const DEFAULT_RETRY: NodeRetryConfig = {
  maxAttempts: 1,
  baseDelayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * 플로우 실행 엔진
 * 노드들을 올바른 순서로 실행하고 데이터를 전파
 */
export class ExecutionEngine {
  private state: ExecutionState;
  private abortController: AbortController | null = null;

  constructor() {
    this.state = {
      status: 'idle',
      nodeStates: new Map(),
    };
  }

  /**
   * 현재 실행 상태 반환
   */
  getState(): ExecutionState {
    return this.state;
  }

  /**
   * 특정 노드의 출력값 반환
   */
  getNodeOutputs(nodeId: string): Record<string, unknown> | undefined {
    return this.state.nodeStates.get(nodeId)?.outputs;
  }

  /**
   * 실행 중단
   */
  abort(): void {
    this.abortController?.abort();
  }

  /**
   * 플로우 실행
   */
  async execute(
    nodes: FlowNode[],
    edges: FlowEdge[],
    options: ExecutionOptions = {}
  ): Promise<ExecutionState> {
    const { onEvent, signal, errorMode = 'stop-all' } = options;

    // 내부 abort controller (외부 signal과 연결)
    this.abortController = new AbortController();
    if (signal) {
      signal.addEventListener('abort', () => this.abortController?.abort());
    }

    const emit = (event: ExecutionEvent) => {
      onEvent?.(event);
    };

    // 상태 초기화
    this.state = {
      status: 'running',
      nodeStates: new Map(),
      startTime: Date.now(),
    };

    emit({ type: 'start' });

    // 실패한 노드 ID 추적 (skip-and-continue 모드용)
    const failedNodes = new Set<string>();

    try {
      // 위상 정렬로 레벨별 실행 순서 결정
      const levels = topologicalLevels(nodes, edges);

      // 노드 맵 생성
      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      // 레벨별 실행 (같은 레벨은 병렬)
      for (const level of levels) {
        // 중단 확인
        if (this.abortController.signal.aborted) {
          throw new Error('Execution aborted');
        }

        const nodePromises = level.map(async (nodeId) => {
          const node = nodeMap.get(nodeId);
          if (!node) return;

          // skip-and-continue 모드: 상위 노드가 실패한 경우
          if (errorMode === 'skip-and-continue' && this.hasFailedDependency(nodeId, edges, failedNodes)) {
            const typeDef = nodeTypeRegistry.get(node.type);
            if (typeDef?.errorResilient) {
              // errorResilient 노드: 에러 정보를 주입하여 실행
              await this.executeErrorResilientNode(node, edges, failedNodes, emit, options);
            } else {
              failedNodes.add(nodeId);
              const nodeState: NodeState = {
                status: 'error',
                outputs: {},
                error: 'Skipped due to failed dependency',
                startTime: Date.now(),
                endTime: Date.now(),
              };
              this.state.nodeStates.set(nodeId, nodeState);
              emit({ type: 'node-skipped', nodeId, reason: 'Dependency failed' });
            }
            return;
          }

          try {
            await this.executeWithRetry(node, edges, emit, options);
          } catch (error) {
            if (errorMode === 'skip-and-continue') {
              failedNodes.add(nodeId);
              // 에러를 삼킴 - 이미 nodeState에 기록됨
            } else {
              throw error;
            }
          }
        });

        if (errorMode === 'stop-all') {
          await Promise.all(nodePromises);
        } else {
          await Promise.allSettled(nodePromises);
        }
      }

      // 완료
      this.state.status = failedNodes.size > 0 ? 'error' : 'success';
      this.state.endTime = Date.now();
      emit({ type: 'complete' });

    } catch (error) {
      this.state.status = 'error';
      this.state.endTime = Date.now();
      const message = error instanceof Error ? error.message : String(error);
      emit({ type: 'error', error: message });

      // stop-all 후 미실행 errorResilient 노드 처리
      await this.runErrorResilientPostPass(nodes, edges, emit, options);
    }

    return this.state;
  }

  /**
   * 재시도 로직이 포함된 노드 실행
   */
  private async executeWithRetry(
    node: FlowNode,
    edges: FlowEdge[],
    emit: (event: ExecutionEvent) => void,
    options: ExecutionOptions
  ): Promise<void> {
    const retryConfig = this.getRetryConfig(node.type, options);
    const { maxAttempts, baseDelayMs, backoffMultiplier } = retryConfig;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.executeNode(node, edges, emit, options);
        return; // 성공
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (attempt < maxAttempts) {
          // 재시도 이벤트
          emit({
            type: 'node-retry',
            nodeId: node.id,
            attempt,
            maxAttempts,
            error: message,
          });

          // exponential backoff 대기
          const delayMs = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1);
          await this.abortableSleep(delayMs);
        } else {
          throw error; // 마지막 시도 실패
        }
      }
    }
  }

  /**
   * 단일 노드 실행
   */
  private async executeNode(
    node: FlowNode,
    edges: FlowEdge[],
    emit: (event: ExecutionEvent) => void,
    options: ExecutionOptions = {}
  ): Promise<void> {
    const nodeState: NodeState = {
      status: 'running',
      outputs: {},
      startTime: Date.now(),
    };
    this.state.nodeStates.set(node.id, nodeState);

    emit({ type: 'node-start', nodeId: node.id });

    try {
      // 입력값 수집
      const inputs = this.collectInputs(node.id, edges);

      // 입력 검증
      if (!options.skipValidation) {
        this.validateInputs(node, inputs);
      }

      // 실행자 찾기
      const executor = executorRegistry.get(node.type);
      if (!executor) {
        throw new Error(`No executor found for node type: ${node.type}`);
      }

      // 타임아웃 설정
      const timeoutMs = options.timeouts?.[node.type] ?? options.defaultTimeoutMs ?? 0;

      // 노드별 AbortController (타임아웃용)
      const nodeController = new AbortController();
      const parentSignal = this.abortController?.signal;
      if (parentSignal) {
        if (parentSignal.aborted) {
          throw new Error('Execution aborted');
        }
        parentSignal.addEventListener('abort', () => nodeController.abort(), { once: true });
      }

      // 실행 컨텍스트 생성
      const ctx: ExecutionContext = {
        nodeId: node.id,
        nodeType: node.type,
        nodeData: node.data,
        inputs,
        signal: nodeController.signal,
      };

      // 타임아웃이 있으면 Promise.race로 감싸기
      let result;
      if (timeoutMs > 0) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timer = setTimeout(() => {
            nodeController.abort();
            reject(new Error(`Node execution timed out after ${timeoutMs}ms`));
          }, timeoutMs);
          // 실행 완료 시 타이머 정리
          nodeController.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
        });
        result = await Promise.race([executor(ctx), timeoutPromise]);
      } else {
        result = await executor(ctx);
      }

      if (result.error) {
        throw new Error(result.error);
      }

      // 출력값 저장
      nodeState.status = 'success';
      nodeState.outputs = result.outputs;
      nodeState.endTime = Date.now();

      // nodeDataUpdate가 있으면 이벤트 발생 (UI에서 노드 데이터 업데이트용)
      if (result.nodeDataUpdate) {
        emit({ type: 'node-data-update', nodeId: node.id, data: result.nodeDataUpdate });
      }

      emit({ type: 'node-complete', nodeId: node.id, outputs: result.outputs });

    } catch (error) {
      nodeState.status = 'error';
      nodeState.error = error instanceof Error ? error.message : String(error);
      nodeState.endTime = Date.now();

      emit({ type: 'node-error', nodeId: node.id, error: nodeState.error });

      // 에러 전파
      throw error;
    }
  }

  /**
   * errorResilient 노드를 업스트림 에러 정보와 함께 실행
   */
  private async executeErrorResilientNode(
    node: FlowNode,
    edges: FlowEdge[],
    failedNodes: Set<string>,
    emit: (event: ExecutionEvent) => void,
    _options: ExecutionOptions
  ): Promise<void> {
    const nodeState: NodeState = {
      status: 'running',
      outputs: {},
      startTime: Date.now(),
    };
    this.state.nodeStates.set(node.id, nodeState);
    emit({ type: 'node-start', nodeId: node.id });

    try {
      const inputs = this.collectInputs(node.id, edges);
      const upstreamErrors = this.collectUpstreamErrors(node.id, edges);
      inputs.__upstreamErrors = upstreamErrors;

      const executor = executorRegistry.get(node.type);
      if (!executor) {
        throw new Error(`No executor found for node type: ${node.type}`);
      }

      const ctx: ExecutionContext = {
        nodeId: node.id,
        nodeType: node.type,
        nodeData: node.data,
        inputs,
        signal: this.abortController?.signal,
      };

      const result = await executor(ctx);

      nodeState.status = 'success';
      nodeState.outputs = result.outputs;
      nodeState.endTime = Date.now();

      if (result.nodeDataUpdate) {
        emit({ type: 'node-data-update', nodeId: node.id, data: result.nodeDataUpdate });
      }
      emit({ type: 'node-complete', nodeId: node.id, outputs: result.outputs });
    } catch (error) {
      nodeState.status = 'error';
      nodeState.error = error instanceof Error ? error.message : String(error);
      nodeState.endTime = Date.now();
      emit({ type: 'node-error', nodeId: node.id, error: nodeState.error });
      failedNodes.add(node.id);
    }
  }

  /**
   * 실패한 업스트림 노드의 에러 정보 수집
   */
  private collectUpstreamErrors(
    nodeId: string,
    edges: FlowEdge[]
  ): Array<{ nodeId: string; nodeType: string; error: string; timing?: { start?: number; end?: number } }> {
    const errors: Array<{ nodeId: string; nodeType: string; error: string; timing?: { start?: number; end?: number } }> = [];
    const dependencies = edges.filter(e => e.target === nodeId).map(e => e.source);

    for (const depId of dependencies) {
      const depState = this.state.nodeStates.get(depId);
      if (depState?.status === 'error' && depState.error) {
        // depState에서 nodeType을 알 수 없으므로 'unknown' 사용 가능하지만
        // 이를 개선하기 위해 edges에서 소스 노드 타입 정보를 전달받는 것이 좋음
        errors.push({
          nodeId: depId,
          nodeType: 'unknown',
          error: depState.error,
          timing: { start: depState.startTime, end: depState.endTime },
        });
      }
    }

    return errors;
  }

  /**
   * stop-all 후 미실행 errorResilient 노드 찾아서 실행
   */
  private async runErrorResilientPostPass(
    nodes: FlowNode[],
    edges: FlowEdge[],
    emit: (event: ExecutionEvent) => void,
    options: ExecutionOptions
  ): Promise<void> {
    const failedNodes = new Set<string>();
    for (const [nodeId, state] of this.state.nodeStates) {
      if (state.status === 'error') {
        failedNodes.add(nodeId);
      }
    }

    for (const node of nodes) {
      // 아직 실행되지 않은 errorResilient 노드
      if (this.state.nodeStates.has(node.id)) continue;
      const typeDef = nodeTypeRegistry.get(node.type);
      if (!typeDef?.errorResilient) continue;

      // 업스트림에 실패한 노드가 있는 경우에만
      if (this.hasFailedDependency(node.id, edges, failedNodes)) {
        await this.executeErrorResilientNode(node, edges, failedNodes, emit, options);
      }
    }
  }

  /**
   * 노드의 입력값 수집 (이전 노드들의 출력에서)
   */
  private collectInputs(nodeId: string, edges: FlowEdge[]): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};

    // 이 노드로 들어오는 엣지들 찾기
    const incomingEdges = edges.filter(e => e.target === nodeId);

    for (const edge of incomingEdges) {
      // 소스 노드의 출력값 가져오기
      const sourceState = this.state.nodeStates.get(edge.source);
      if (sourceState?.outputs) {
        const value = sourceState.outputs[edge.sourcePort];
        inputs[edge.targetPort] = value;
      }
    }

    return inputs;
  }

  /**
   * 입력 검증
   * 노드 타입 정의의 required 필드와 dataType을 확인
   */
  private validateInputs(node: FlowNode, inputs: Record<string, unknown>): void {
    const typeDef = nodeTypeRegistry.get(node.type);
    if (!typeDef) return; // 타입 정의 없으면 검증 건너뛰기

    for (const portDef of typeDef.inputs) {
      if (!portDef.required) continue;

      const value = inputs[portDef.id];

      // required 필드가 없거나 undefined/null인 경우
      if (value === undefined || value === null) {
        throw new Error(
          `Missing required input '${portDef.name}' for node '${typeDef.title}' (${node.id})`
        );
      }

      // dataType 기반 타입 매칭 (any는 모든 타입 허용)
      if (portDef.dataType !== 'any') {
        const valid = this.checkDataType(value, portDef.dataType);
        if (!valid) {
          throw new Error(
            `Type mismatch for input '${portDef.name}': expected ${portDef.dataType}, got ${typeof value}`
          );
        }
      }
    }
  }

  /**
   * 값의 데이터 타입 확인
   */
  private checkDataType(value: unknown, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && !Array.isArray(value);
      case 'image':
        return typeof value === 'object' && value !== null && 'imageData' in (value as Record<string, unknown>);
      case 'any':
        return true;
      default:
        return true;
    }
  }

  /**
   * 상위 노드 중 실패한 노드가 있는지 확인
   */
  private hasFailedDependency(
    nodeId: string,
    edges: FlowEdge[],
    failedNodes: Set<string>
  ): boolean {
    const dependencies = edges
      .filter(e => e.target === nodeId)
      .map(e => e.source);

    return dependencies.some(depId => failedNodes.has(depId));
  }

  /**
   * 노드 타입별 재시도 설정 결정
   */
  private getRetryConfig(nodeType: string, options: ExecutionOptions): NodeRetryConfig {
    const override = options.retries?.[nodeType];
    const defaultConfig = options.defaultRetry ?? DEFAULT_RETRY;

    if (override) {
      return {
        maxAttempts: override.maxAttempts ?? defaultConfig.maxAttempts,
        baseDelayMs: override.baseDelayMs ?? defaultConfig.baseDelayMs,
        backoffMultiplier: override.backoffMultiplier ?? defaultConfig.backoffMultiplier,
      };
    }

    return defaultConfig;
  }

  /**
   * abort-aware sleep
   */
  private abortableSleep(ms: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const signal = this.abortController?.signal;
      if (signal?.aborted) {
        reject(new Error('Execution aborted'));
        return;
      }

      const timer = setTimeout(resolve, ms);

      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Execution aborted'));
      }, { once: true });
    });
  }
}

// 편의 함수: 플로우 실행
export async function executeFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: ExecutionOptions = {}
): Promise<ExecutionState> {
  const engine = new ExecutionEngine();
  return engine.execute(nodes, edges, options);
}
