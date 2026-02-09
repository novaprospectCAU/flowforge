/**
 * 서브플로우 실행기 — 커스텀 노드 팩용
 * 서브플로우 정의를 NodeExecutor로 변환
 */

import type { FlowNode, FlowEdge } from '@flowforge/types';
import type { NodeExecutor, ExecutionContext, ExecutionResult } from '../execution/types';
import { ExecutionEngine } from '../execution/engine';
import { executorRegistry } from '../execution/executorRegistry';
import type { SubflowNodeDefinition } from './types';

const MAX_DEPTH = 10;
const VIRTUAL_INPUT_TYPE = '__VirtualInput';

// __VirtualInput executor 등록 (전역 1회)
let virtualInputRegistered = false;

function ensureVirtualInputRegistered(): void {
  if (virtualInputRegistered) return;
  virtualInputRegistered = true;

  executorRegistry.register(VIRTUAL_INPUT_TYPE, async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    return { outputs: { out: ctx.nodeData.__value } };
  });
}

/**
 * 서브플로우 정의로부터 NodeExecutor를 생성
 */
export function createSubflowExecutor(definition: SubflowNodeDefinition): NodeExecutor {
  ensureVirtualInputRegistered();

  return async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const currentDepth = ctx.depth ?? 0;
    if (currentDepth >= MAX_DEPTH) {
      throw new Error(`Subflow execution depth exceeded (max ${MAX_DEPTH}). Possible circular reference.`);
    }

    const ts = Date.now();

    // 1. 내부 노드/엣지를 고유 ID로 클론
    const idMap = new Map<string, string>();
    const innerNodes: FlowNode[] = definition.nodes.map((node, i) => {
      const newId = `__subexec_${node.id}_${ts}_${i}`;
      idMap.set(node.id, newId);
      return {
        ...node,
        id: newId,
        data: { ...node.data },
      };
    });

    const innerEdges: FlowEdge[] = definition.edges.map((edge, i) => ({
      ...edge,
      id: `__subedge_${edge.id}_${ts}_${i}`,
      source: idMap.get(edge.source) ?? edge.source,
      target: idMap.get(edge.target) ?? edge.target,
    }));

    // 2. 각 inputMapping에 대해 __VirtualInput 노드 + 엣지 생성
    for (const mapping of definition.inputMappings) {
      const virtualNodeId = `__vinput_${mapping.exposedPortId}_${ts}`;
      const inputValue = ctx.inputs[mapping.exposedPortId];

      innerNodes.push({
        id: virtualNodeId,
        type: VIRTUAL_INPUT_TYPE,
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
        data: { __value: inputValue },
      });

      const targetNodeId = idMap.get(mapping.internalNodeId) ?? mapping.internalNodeId;
      innerEdges.push({
        id: `__vedge_${mapping.exposedPortId}_${ts}`,
        source: virtualNodeId,
        sourcePort: 'out',
        target: targetNodeId,
        targetPort: mapping.internalPortId,
      });
    }

    // 3. 내부 실행
    const engine = new ExecutionEngine();
    const result = await engine.execute(innerNodes, innerEdges, {
      signal: ctx.signal,
      skipValidation: true,
      depth: currentDepth + 1,
    });

    if (result.status === 'error') {
      // 첫 번째 에러 노드 찾기
      for (const [, nodeState] of result.nodeStates) {
        if (nodeState.status === 'error' && nodeState.error) {
          throw new Error(`Subflow error: ${nodeState.error}`);
        }
      }
      throw new Error('Subflow execution failed');
    }

    // 4. outputMapping으로 내부 노드 출력 → 외부 출력 매핑
    const outputs: Record<string, unknown> = {};
    for (const mapping of definition.outputMappings) {
      const internalNodeId = idMap.get(mapping.internalNodeId) ?? mapping.internalNodeId;
      const nodeState = result.nodeStates.get(internalNodeId);
      if (nodeState?.outputs) {
        outputs[mapping.exposedPortId] = nodeState.outputs[mapping.internalPortId];
      }
    }

    return { outputs };
  };
}
