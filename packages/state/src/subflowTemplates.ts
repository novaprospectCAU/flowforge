import type { FlowNode, FlowEdge, Subflow, SubflowTemplate } from '@flowforge/types';

const TEMPLATES_KEY = 'flowforge-subflow-templates';

/**
 * 템플릿 목록 로드
 */
export function loadTemplates(): SubflowTemplate[] {
  try {
    const data = localStorage.getItem(TEMPLATES_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * 템플릿 목록 저장
 */
export function saveTemplates(templates: SubflowTemplate[]): void {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

/**
 * 서브플로우를 템플릿으로 저장
 */
export function saveAsTemplate(
  subflow: Subflow,
  nodes: FlowNode[],
  edges: FlowEdge[],
  description?: string,
  category?: string
): SubflowTemplate {
  // 서브플로우에 포함된 노드와 엣지 추출
  const subflowNodes = nodes.filter(n => subflow.nodeIds.includes(n.id));
  const subflowEdges = edges.filter(e => subflow.internalEdgeIds.includes(e.id));

  // 노드 위치를 상대 좌표로 변환 (첫 노드 기준)
  const baseX = subflowNodes.length > 0 ? subflowNodes[0].position.x : 0;
  const baseY = subflowNodes.length > 0 ? subflowNodes[0].position.y : 0;

  const relativeNodes = subflowNodes.map(n => ({
    ...n,
    position: {
      x: n.position.x - baseX,
      y: n.position.y - baseY,
    },
  }));

  const template: SubflowTemplate = {
    id: `template-${Date.now()}`,
    name: subflow.name,
    description,
    category,
    nodes: relativeNodes,
    edges: subflowEdges,
    inputMappings: subflow.inputMappings,
    outputMappings: subflow.outputMappings,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 기존 템플릿 목록에 추가
  const templates = loadTemplates();
  templates.push(template);
  saveTemplates(templates);

  return template;
}

/**
 * 템플릿에서 서브플로우 인스턴스 생성
 * @returns { nodes, edges, subflow } - 새로 생성된 노드, 엣지, 서브플로우
 */
export function instantiateTemplate(
  template: SubflowTemplate,
  position: { x: number; y: number }
): {
  nodes: FlowNode[];
  edges: FlowEdge[];
  subflow: Omit<Subflow, 'id'>;
} {
  const timestamp = Date.now();
  const idMap = new Map<string, string>();

  // 새 노드 생성 (ID 재할당, 위치 조정)
  const newNodes = template.nodes.map((n, i) => {
    const newId = `node-${timestamp}-${i}`;
    idMap.set(n.id, newId);
    return {
      ...n,
      id: newId,
      position: {
        x: position.x + n.position.x,
        y: position.y + n.position.y,
      },
    };
  });

  // 새 엣지 생성 (ID 재할당, 참조 업데이트)
  const newEdges = template.edges.map((e, i) => ({
    ...e,
    id: `edge-${timestamp}-${i}`,
    source: idMap.get(e.source) || e.source,
    target: idMap.get(e.target) || e.target,
  }));

  // 포트 매핑 업데이트
  const newInputMappings = template.inputMappings.map(m => ({
    ...m,
    exposedPortId: `port-in-${timestamp}-${m.exposedPortId}`,
    internalNodeId: idMap.get(m.internalNodeId) || m.internalNodeId,
  }));

  const newOutputMappings = template.outputMappings.map(m => ({
    ...m,
    exposedPortId: `port-out-${timestamp}-${m.exposedPortId}`,
    internalNodeId: idMap.get(m.internalNodeId) || m.internalNodeId,
  }));

  // 서브플로우 정보 (ID는 호출자가 생성)
  const subflow: Omit<Subflow, 'id'> = {
    name: template.name,
    nodeIds: newNodes.map(n => n.id),
    internalEdgeIds: newEdges.map(e => e.id),
    inputMappings: newInputMappings,
    outputMappings: newOutputMappings,
    collapsed: true,
    collapsedPosition: position,
  };

  return { nodes: newNodes, edges: newEdges, subflow };
}

/**
 * 템플릿 삭제
 */
export function deleteTemplate(templateId: string): void {
  const templates = loadTemplates().filter(t => t.id !== templateId);
  saveTemplates(templates);
}

/**
 * 템플릿 업데이트
 */
export function updateTemplate(templateId: string, updates: Partial<SubflowTemplate>): void {
  const templates = loadTemplates().map(t =>
    t.id === templateId
      ? { ...t, ...updates, updatedAt: new Date().toISOString() }
      : t
  );
  saveTemplates(templates);
}
