import type { FlowNode, FlowEdge, NodeGroup, Viewport, Comment, Subflow } from '@flowforge/types';
import { STORAGE_KEYS } from './utils';
import { nodeTypeRegistry } from './nodeTypes';

/**
 * 저장 가능한 플로우 데이터 형식
 */
export interface SerializedFlow {
  version: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  groups: NodeGroup[];
  comments: Comment[];
  subflows: Subflow[];
  viewport: Viewport;
  createdAt: string;
  updatedAt: string;
  requiredPacks?: string[];
}

const CURRENT_VERSION = '1.2.0';

/**
 * 플로우를 JSON 문자열로 직렬화
 */
export function serializeFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  groups: NodeGroup[],
  viewport: Viewport,
  name: string = 'Untitled Flow',
  comments: Comment[] = [],
  subflows: Subflow[] = []
): string {
  // 사용된 팩 감지 (네임스페이스가 있는 노드 타입)
  const packIds = new Set<string>();
  for (const node of nodes) {
    const colonIdx = node.type.indexOf(':');
    if (colonIdx > 0) {
      packIds.add(node.type.substring(0, colonIdx));
    }
  }

  const flow: SerializedFlow = {
    version: CURRENT_VERSION,
    name,
    nodes,
    edges,
    groups,
    comments,
    subflows,
    viewport,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(packIds.size > 0 ? { requiredPacks: Array.from(packIds) } : {}),
  };

  return JSON.stringify(flow, null, 2);
}

/**
 * JSON 문자열에서 플로우 역직렬화
 */
export function deserializeFlow(json: string): SerializedFlow {
  const flow = JSON.parse(json) as SerializedFlow;

  // 버전 체크 및 마이그레이션 (필요시)
  if (!flow.version) {
    throw new Error('Invalid flow file: missing version');
  }

  // 기본값 설정
  if (!flow.nodes) flow.nodes = [];
  if (!flow.edges) flow.edges = [];
  if (!flow.groups) flow.groups = [];
  if (!flow.comments) flow.comments = [];
  if (!flow.subflows) flow.subflows = [];
  if (!flow.viewport) flow.viewport = { x: 0, y: 0, zoom: 1 };

  // 고아 노드 감지: 등록되지 않은 노드 타입 경고
  const orphanTypes = new Set<string>();
  for (const node of flow.nodes) {
    if (!nodeTypeRegistry.get(node.type)) {
      orphanTypes.add(node.type);
    }
  }
  if (orphanTypes.size > 0) {
    console.warn(
      `[FlowForge] Unregistered node types detected: ${Array.from(orphanTypes).join(', ')}. ` +
      `Enable the required packs to use these nodes.`
    );
  }

  return flow;
}

/**
 * 플로우를 파일로 다운로드
 */
export function downloadFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  groups: NodeGroup[],
  viewport: Viewport,
  filename: string = 'flow.json',
  comments: Comment[] = [],
  subflows: Subflow[] = []
): void {
  const json = serializeFlow(nodes, edges, groups, viewport, filename.replace('.json', ''), comments, subflows);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


/**
 * localStorage에 플로우 저장
 */
export function saveToLocalStorage(
  nodes: FlowNode[],
  edges: FlowEdge[],
  groups: NodeGroup[],
  viewport: Viewport,
  comments: Comment[] = [],
  subflows: Subflow[] = []
): void {
  try {
    const json = serializeFlow(nodes, edges, groups, viewport, 'Autosave', comments, subflows);
    localStorage.setItem(STORAGE_KEYS.AUTOSAVE, json);
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

/**
 * localStorage에서 플로우 불러오기
 */
export function loadFromLocalStorage(): SerializedFlow | null {
  try {
    const json = localStorage.getItem(STORAGE_KEYS.AUTOSAVE);
    if (!json) return null;
    return deserializeFlow(json);
  } catch (err) {
    console.error('Failed to load from localStorage:', err);
    return null;
  }
}

/**
 * localStorage의 자동 저장 데이터 삭제
 */
export function clearLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTOSAVE);
  } catch (err) {
    console.error('Failed to clear localStorage:', err);
  }
}

/**
 * 파일에서 플로우 불러오기 (Promise 반환)
 */
export function loadFlowFromFile(): Promise<SerializedFlow> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          const flow = deserializeFlow(json);
          resolve(flow);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };

    input.click();
  });
}
