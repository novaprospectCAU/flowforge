/**
 * 성능 최적화 유틸리티
 * - 뷰포트 컬링
 * - 메모이제이션
 * - 디바운싱/스로틀링
 */

import type { FlowNode, Viewport, CanvasSize, FlowEdge, Comment } from '@flowforge/types';

/**
 * 뷰포트 바운드 (월드 좌표)
 */
export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * 뷰포트의 월드 좌표 바운드 계산
 * 약간의 마진을 추가하여 노드가 화면 가장자리에서 갑자기 나타나지 않도록 함
 */
export function getViewportBounds(
  viewport: Viewport,
  canvasSize: CanvasSize,
  margin = 100
): ViewportBounds {
  const halfWidth = (canvasSize.width / 2) / viewport.zoom;
  const halfHeight = (canvasSize.height / 2) / viewport.zoom;

  return {
    minX: viewport.x - halfWidth - margin,
    minY: viewport.y - halfHeight - margin,
    maxX: viewport.x + halfWidth + margin,
    maxY: viewport.y + halfHeight + margin,
  };
}

/**
 * 노드가 뷰포트 내에 있는지 확인
 */
export function isNodeInViewport(
  node: FlowNode,
  bounds: ViewportBounds
): boolean {
  const nodeRight = node.position.x + node.size.width;
  const nodeBottom = node.position.y + node.size.height;

  // AABB 충돌 검사
  return !(
    nodeRight < bounds.minX ||
    node.position.x > bounds.maxX ||
    nodeBottom < bounds.minY ||
    node.position.y > bounds.maxY
  );
}

/**
 * 뷰포트 내에 보이는 노드만 필터링 (뷰포트 컬링)
 */
export function cullNodesByViewport(
  nodes: FlowNode[],
  viewport: Viewport,
  canvasSize: CanvasSize,
  margin = 100
): FlowNode[] {
  const bounds = getViewportBounds(viewport, canvasSize, margin);
  return nodes.filter(node => isNodeInViewport(node, bounds));
}

/**
 * 코멘트가 뷰포트 내에 있는지 확인
 */
export function isCommentInViewport(
  comment: Comment,
  bounds: ViewportBounds
): boolean {
  const right = comment.position.x + comment.size.width;
  const bottom = comment.position.y + comment.size.height;

  return !(
    right < bounds.minX ||
    comment.position.x > bounds.maxX ||
    bottom < bounds.minY ||
    comment.position.y > bounds.maxY
  );
}

/**
 * 뷰포트 내에 보이는 코멘트만 필터링
 */
export function cullCommentsByViewport(
  comments: Comment[],
  viewport: Viewport,
  canvasSize: CanvasSize,
  margin = 100
): Comment[] {
  const bounds = getViewportBounds(viewport, canvasSize, margin);
  return comments.filter(comment => isCommentInViewport(comment, bounds));
}

/**
 * 엣지가 뷰포트 내에 있는지 확인
 * 엣지의 두 끝점 중 하나라도 뷰포트 내에 있으면 true
 */
export function isEdgeInViewport(
  edge: FlowEdge,
  nodeMap: Map<string, FlowNode>,
  bounds: ViewportBounds
): boolean {
  const sourceNode = nodeMap.get(edge.source);
  const targetNode = nodeMap.get(edge.target);

  if (!sourceNode || !targetNode) return false;

  // 두 노드 중 하나라도 뷰포트 내에 있으면 엣지도 보임
  return isNodeInViewport(sourceNode, bounds) || isNodeInViewport(targetNode, bounds);
}

/**
 * 뷰포트 내에 보이는 엣지만 필터링
 */
export function cullEdgesByViewport(
  edges: FlowEdge[],
  nodes: FlowNode[],
  viewport: Viewport,
  canvasSize: CanvasSize,
  margin = 100
): FlowEdge[] {
  const bounds = getViewportBounds(viewport, canvasSize, margin);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  return edges.filter(edge => isEdgeInViewport(edge, nodeMap, bounds));
}

/**
 * 간단한 메모이제이션 함수
 * 마지막 입력과 결과를 캐시
 */
export function memoizeOne<T extends unknown[], R>(
  fn: (...args: T) => R
): (...args: T) => R {
  let lastArgs: T | null = null;
  let lastResult: R;

  return (...args: T): R => {
    // 인자가 같은지 얕은 비교
    if (lastArgs && args.length === lastArgs.length) {
      let same = true;
      for (let i = 0; i < args.length; i++) {
        if (args[i] !== lastArgs[i]) {
          same = false;
          break;
        }
      }
      if (same) return lastResult;
    }

    lastArgs = args;
    lastResult = fn(...args);
    return lastResult;
  };
}

/**
 * 디바운스 함수
 */
export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  wait: number
): (...args: T) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: T): void => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * 스로틀 함수
 */
export function throttle<T extends unknown[]>(
  fn: (...args: T) => void,
  limit: number
): (...args: T) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: T): void => {
    const now = Date.now();

    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    } else {
      // 마지막 호출이 실행되도록 보장
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        fn(...args);
        timeoutId = null;
      }, limit - (now - lastCall));
    }
  };
}

/**
 * 대량 노드 처리를 위한 청크 분할 함수
 * 렌더링 프레임을 블로킹하지 않도록 작업을 분할
 */
export async function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => R,
  chunkSize = 100,
  delayMs = 0
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    results.push(...chunk.map(processor));

    // 다음 청크 전에 브라우저에게 제어권 양보
    if (delayMs > 0 && i + chunkSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * 렌더링 성능 측정 유틸리티
 */
export class RenderStats {
  private frameTimes: number[] = [];
  private lastFrameTime = 0;
  private maxSamples = 60;

  recordFrame(): void {
    const now = performance.now();
    if (this.lastFrameTime > 0) {
      this.frameTimes.push(now - this.lastFrameTime);
      if (this.frameTimes.length > this.maxSamples) {
        this.frameTimes.shift();
      }
    }
    this.lastFrameTime = now;
  }

  getAverageFPS(): number {
    if (this.frameTimes.length === 0) return 0;
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
  }

  getMinFPS(): number {
    if (this.frameTimes.length === 0) return 0;
    const maxFrameTime = Math.max(...this.frameTimes);
    return maxFrameTime > 0 ? 1000 / maxFrameTime : 0;
  }

  reset(): void {
    this.frameTimes = [];
    this.lastFrameTime = 0;
  }
}
