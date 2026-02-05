import type { FlowNode, FlowEdge } from '@flowforge/types';
import type {
  ExecutionState,
  ExecutionOptions,
  ExecutionEvent,
  NodeState,
  ExecutionContext,
} from './types';
import { topologicalSort } from './topologicalSort';
import { executorRegistry } from './executorRegistry';

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
    const { onEvent, signal } = options;

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

    try {
      // 위상 정렬로 실행 순서 결정
      const executionOrder = topologicalSort(nodes, edges);

      // 노드 맵 생성
      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      // 순서대로 실행
      for (const nodeId of executionOrder) {
        // 중단 확인
        if (this.abortController.signal.aborted) {
          throw new Error('Execution aborted');
        }

        const node = nodeMap.get(nodeId);
        if (!node) continue;

        await this.executeNode(node, edges, emit);
      }

      // 완료
      this.state.status = 'success';
      this.state.endTime = Date.now();
      emit({ type: 'complete' });

    } catch (error) {
      this.state.status = 'error';
      this.state.endTime = Date.now();
      const message = error instanceof Error ? error.message : String(error);
      emit({ type: 'error', error: message });
    }

    return this.state;
  }

  /**
   * 단일 노드 실행
   */
  private async executeNode(
    node: FlowNode,
    edges: FlowEdge[],
    emit: (event: ExecutionEvent) => void
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

      // 실행자 찾기
      const executor = executorRegistry.get(node.type);
      if (!executor) {
        throw new Error(`No executor found for node type: ${node.type}`);
      }

      // 실행 컨텍스트 생성
      const ctx: ExecutionContext = {
        nodeId: node.id,
        nodeType: node.type,
        nodeData: node.data,
        inputs,
        signal: this.abortController?.signal,
      };

      // 실행
      const result = await executor(ctx);

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
