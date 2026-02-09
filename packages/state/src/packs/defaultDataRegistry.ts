/**
 * 통합 기본 데이터 조회
 * 팩 레지스트리 → AI 노드 → null 순서로 조회
 */

import { getAINodeDefaultData } from '../ai/nodeTypes';
import { packRegistry } from './packRegistry';

/**
 * 노드 타입에 대한 기본 데이터 조회
 * 1. 팩 레지스트리에서 조회 (네임스페이스 ":" 포함 노드)
 * 2. 폴백: getAINodeDefaultData()
 * 3. null
 */
export function getNodeDefaultData(nodeType: string): Record<string, unknown> | null {
  // 팩 노드 (네임스페이스:타입 형식) 확인
  const allPacks = packRegistry.getAllPacks();
  for (const { manifest, state } of allPacks) {
    if (!state.enabled) continue;
    const packNodes = packRegistry.getPackNodes(manifest.id);
    for (const nodeDef of packNodes) {
      if (nodeDef.nodeType.type === nodeType && nodeDef.defaultData) {
        return { ...nodeDef.defaultData };
      }
    }
  }

  // AI 노드 폴백
  const aiData = getAINodeDefaultData(nodeType);
  if (aiData) return aiData;

  return null;
}
