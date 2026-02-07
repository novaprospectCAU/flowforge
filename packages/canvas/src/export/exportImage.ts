import type { FlowNode, FlowEdge, NodeGroup } from '@flowforge/types';
import type { EdgeStyle } from '../rendering/drawEdge';
import { getDataTypeColorCSS } from '../theme/colors';
import { calculateBoundsMinMax, expandBounds, mergeBounds, expandBoundsAsymmetric } from '../utils/bounds';

export interface ExportImageOptions {
  padding?: number;
  backgroundColor?: string;
  scale?: number; // 1 = 100%, 2 = 200% (for high DPI)
}

/**
 * 플로우를 이미지로 내보내기
 */
export async function exportFlowToImage(
  _canvas: HTMLCanvasElement, // 현재는 미사용, 향후 현재 뷰 기반 내보내기용
  nodes: FlowNode[],
  edges: FlowEdge[],
  groups: NodeGroup[],
  _viewport: unknown, // 현재는 미사용, 향후 뷰포트 기반 내보내기용
  edgeStyle: EdgeStyle = 'bezier',
  options: ExportImageOptions = {}
): Promise<Blob> {
  const {
    padding = 50,
    backgroundColor = '#1e1e1e',
    scale = 2,
  } = options;

  // 노드들의 바운딩 박스 계산
  let bounds = calculateBoundsMinMax(nodes);
  if (!bounds) {
    throw new Error('No nodes to export');
  }

  // 그룹 바운딩도 포함
  for (const group of groups) {
    const groupNodes = nodes.filter(n => group.nodeIds.includes(n.id));
    const groupBounds = calculateBoundsMinMax(groupNodes);
    if (groupBounds) {
      // 그룹 패딩 (헤더 포함: top=48, sides=20)
      const expandedGroupBounds = expandBoundsAsymmetric(groupBounds, 48, 20, 20, 20);
      bounds = mergeBounds(bounds, expandedGroupBounds);
    }
  }

  // 최종 패딩 적용
  const finalBounds = expandBounds(bounds, padding);
  const contentWidth = finalBounds.maxX - finalBounds.minX;
  const contentHeight = finalBounds.maxY - finalBounds.minY;

  // 오프스크린 캔버스 생성
  const offscreen = document.createElement('canvas');
  offscreen.width = contentWidth * scale;
  offscreen.height = contentHeight * scale;

  const ctx = offscreen.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // 스케일 적용
  ctx.scale(scale, scale);

  // 배경 채우기
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, contentWidth, contentHeight);

  // 좌표 변환 (노드들이 패딩 위치에서 시작하도록)
  ctx.translate(padding - bounds.minX, padding - bounds.minY);

  // 그룹 그리기
  const GROUP_PADDING = 20;
  const GROUP_HEADER_HEIGHT = 28;

  for (const group of groups) {
    const groupNodes = nodes.filter(n => group.nodeIds.includes(n.id));
    const groupBounds = calculateBoundsMinMax(groupNodes);
    if (!groupBounds) continue;

    const gx = groupBounds.minX - GROUP_PADDING;
    const gy = groupBounds.minY - GROUP_PADDING - GROUP_HEADER_HEIGHT;
    const gw = groupBounds.maxX - groupBounds.minX + GROUP_PADDING * 2;
    const gh = groupBounds.maxY - groupBounds.minY + GROUP_PADDING * 2 + GROUP_HEADER_HEIGHT;

    // 그룹 배경
    ctx.fillStyle = 'rgba(74, 85, 104, 0.12)';
    ctx.beginPath();
    ctx.roundRect(gx, gy, gw, gh, 8);
    ctx.fill();

    // 그룹 헤더
    ctx.fillStyle = 'rgba(74, 85, 104, 0.3)';
    ctx.beginPath();
    ctx.roundRect(gx, gy, gw, GROUP_HEADER_HEIGHT, [8, 8, 0, 0]);
    ctx.fill();

    // 그룹 이름
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillText(group.name, gx + 12, gy + GROUP_HEADER_HEIGHT / 2 + 4);
  }

  // 엣지 그리기
  for (const edge of edges) {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    if (!sourceNode || !targetNode) continue;

    const sourcePort = sourceNode.outputs?.find(p => p.id === edge.sourcePort);
    const sourcePortIndex = sourceNode.outputs?.findIndex(p => p.id === edge.sourcePort) ?? 0;
    const targetPortIndex = targetNode.inputs?.findIndex(p => p.id === edge.targetPort) ?? 0;

    const GROUP_HEADER_HEIGHT = 28;
    const portSpacing = 24;

    const x1 = sourceNode.position.x + sourceNode.size.width;
    const y1 = sourceNode.position.y + GROUP_HEADER_HEIGHT + portSpacing * (sourcePortIndex + 0.5);
    const x2 = targetNode.position.x;
    const y2 = targetNode.position.y + GROUP_HEADER_HEIGHT + portSpacing * (targetPortIndex + 0.5);

    // 소스 포트의 데이터 타입 색상 사용
    const edgeColor = getDataTypeColorCSS(sourcePort?.dataType || 'any');
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();

    if (edgeStyle === 'straight') {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    } else if (edgeStyle === 'step') {
      const midX = (x1 + x2) / 2;
      ctx.moveTo(x1, y1);
      ctx.lineTo(midX, y1);
      ctx.lineTo(midX, y2);
      ctx.lineTo(x2, y2);
    } else {
      // bezier
      const dx = Math.abs(x2 - x1);
      const offset = Math.max(50, dx * 0.5);
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(x1 + offset, y1, x2 - offset, y2, x2, y2);
    }

    ctx.stroke();
  }

  // 노드 그리기
  for (const node of nodes) {
    const { x, y } = node.position;
    const { width, height } = node.size;
    const GROUP_HEADER_HEIGHT = 28;

    // 노드 배경
    ctx.fillStyle = '#2d2d30';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();

    // 노드 테두리
    ctx.strokeStyle = '#3c3c3c';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 헤더 배경
    ctx.fillStyle = '#3c3c3c';
    ctx.beginPath();
    ctx.roundRect(x, y, width, GROUP_HEADER_HEIGHT, [8, 8, 0, 0]);
    ctx.fill();

    // 타이틀
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    const title = (node.data?.title as string) || node.type;
    ctx.fillText(title, x + 10, y + GROUP_HEADER_HEIGHT / 2 + 4, width - 20);

    // 포트 그리기
    const portRadius = 6;

    // 입력 포트
    const inputs = node.inputs || [];
    for (let i = 0; i < inputs.length; i++) {
      const port = inputs[i];
      const py = y + GROUP_HEADER_HEIGHT + 24 * (i + 0.5);
      const portColor = getDataTypeColorCSS(port.dataType);

      ctx.fillStyle = portColor;
      ctx.beginPath();
      ctx.arc(x, py, portRadius, 0, Math.PI * 2);
      ctx.fill();

      // 포트 이름 (데이터 타입 색상)
      ctx.fillStyle = portColor;
      ctx.font = '10px system-ui, -apple-system, sans-serif';
      ctx.fillText(port.name, x + 10, py + 3);
    }

    // 출력 포트
    const outputs = node.outputs || [];
    for (let i = 0; i < outputs.length; i++) {
      const port = outputs[i];
      const py = y + GROUP_HEADER_HEIGHT + 24 * (i + 0.5);
      const portColor = getDataTypeColorCSS(port.dataType);

      ctx.fillStyle = portColor;
      ctx.beginPath();
      ctx.arc(x + width, py, portRadius, 0, Math.PI * 2);
      ctx.fill();

      // 포트 이름 (데이터 타입 색상)
      ctx.fillStyle = portColor;
      ctx.font = '10px system-ui, -apple-system, sans-serif';
      const textWidth = ctx.measureText(port.name).width;
      ctx.fillText(port.name, x + width - 10 - textWidth, py + 3);
    }
  }

  // Blob으로 변환
  return new Promise((resolve, reject) => {
    offscreen.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, 'image/png');
  });
}

/**
 * 이미지를 파일로 다운로드
 * @param source - Blob 또는 data URL 문자열
 * @param filename - 저장할 파일 이름
 */
export function downloadImage(source: Blob | string, filename: string = 'flow.png'): void {
  const a = document.createElement('a');

  if (source instanceof Blob) {
    // Blob인 경우: Object URL 생성 후 정리
    const url = URL.createObjectURL(source);
    a.href = url;
    a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    // data URL 문자열인 경우
    a.href = source;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
