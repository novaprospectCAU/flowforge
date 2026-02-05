import type { FlowNode, FlowEdge, NodeGroup, Viewport } from '@flowforge/types';

/**
 * 저장 가능한 플로우 데이터 형식
 */
export interface SerializedFlow {
  version: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  groups: NodeGroup[];
  viewport: Viewport;
  createdAt: string;
  updatedAt: string;
}

const CURRENT_VERSION = '1.0.0';

/**
 * 플로우를 JSON 문자열로 직렬화
 */
export function serializeFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  groups: NodeGroup[],
  viewport: Viewport,
  name: string = 'Untitled Flow'
): string {
  const flow: SerializedFlow = {
    version: CURRENT_VERSION,
    name,
    nodes,
    edges,
    groups,
    viewport,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
  if (!flow.viewport) flow.viewport = { x: 0, y: 0, zoom: 1 };

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
  filename: string = 'flow.json'
): void {
  const json = serializeFlow(nodes, edges, groups, viewport, filename.replace('.json', ''));
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
