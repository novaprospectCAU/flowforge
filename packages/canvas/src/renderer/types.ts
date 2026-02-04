import type { Viewport, CanvasSize, Color, BezierPoints, RendererCapabilities } from '@flowforge/types';

/**
 * 렌더러 추상화 인터페이스
 * WebGPU와 WebGL2가 동일한 API 구현
 */
export interface IRenderer {
  // 초기화
  init(canvas: HTMLCanvasElement): Promise<boolean>;
  dispose(): void;
  
  // 프레임
  beginFrame(): void;
  endFrame(): void;
  
  // 변환 설정
  setTransform(viewport: Viewport, canvasSize: CanvasSize, dpr: number): void;
  
  // 기본 도형
  drawRect(x: number, y: number, width: number, height: number, color: Color): void;
  drawRoundedRect(x: number, y: number, width: number, height: number, radius: number, color: Color): void;
  drawCircle(x: number, y: number, radius: number, color: Color): void;
  drawLine(x1: number, y1: number, x2: number, y2: number, color: Color, lineWidth: number): void;
  drawBezier(points: BezierPoints, color: Color, lineWidth: number): void;
  
  // 상태
  getCapabilities(): RendererCapabilities;
}

/**
 * 라인/사각형용 half-pixel 스냅
 */
export function snapToHalfPixel(value: number): number {
  return Math.round(value) + 0.5;
}

export function snapLineCoords(
  x1: number, y1: number, x2: number, y2: number
): { x1: number; y1: number; x2: number; y2: number } {
  return {
    x1: snapToHalfPixel(x1),
    y1: snapToHalfPixel(y1),
    x2: snapToHalfPixel(x2),
    y2: snapToHalfPixel(y2),
  };
}
