import type { IRenderer } from './types';
import type { Viewport, CanvasSize, Color, BezierPoints, RendererCapabilities } from '@flowforge/types';

/**
 * WebGL2 렌더러 (Fallback)
 * 
 * MVP에서는 Canvas2D로 구현하고 WebGL2 인터페이스만 유지
 * 실제 WebGL2 셰이더는 Week 2에서 추가
 */
export class WebGL2Renderer implements IRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private viewport: Viewport = { x: 0, y: 0, zoom: 1 };
  private canvasSize: CanvasSize = { width: 0, height: 0 };
  private dpr: number = 1;
  
  async init(canvas: HTMLCanvasElement): Promise<boolean> {
    this.canvas = canvas;
    
    // MVP: Canvas2D로 구현 (WebGL2는 Week 2)
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get 2d context');
      return false;
    }
    
    this.ctx = ctx;
    return true;
  }
  
  dispose(): void {
    this.canvas = null;
    this.ctx = null;
  }
  
  beginFrame(): void {
    if (!this.ctx || !this.canvas) return;
    
    // 전체 클리어
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  endFrame(): void {
    // Canvas2D는 자동 flush
  }
  
  setTransform(viewport: Viewport, canvasSize: CanvasSize, dpr: number): void {
    this.viewport = viewport;
    this.canvasSize = canvasSize;
    this.dpr = dpr;
    
    if (!this.ctx) return;
    
    // DPR + viewport 변환 적용
    // 1. DPR 스케일
    // 2. 화면 중심으로 이동
    // 3. 줌 적용
    // 4. 월드 원점으로 이동
    this.ctx.setTransform(
      dpr * viewport.zoom,
      0,
      0,
      dpr * viewport.zoom,
      dpr * (canvasSize.width / 2 - viewport.x * viewport.zoom),
      dpr * (canvasSize.height / 2 - viewport.y * viewport.zoom)
    );
  }
  
  drawRect(x: number, y: number, width: number, height: number, color: Color): void {
    if (!this.ctx) return;
    
    this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
    this.ctx.fillRect(x, y, width, height);
  }
  
  drawRoundedRect(x: number, y: number, width: number, height: number, radius: number, color: Color): void {
    if (!this.ctx) return;
    
    this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, radius);
    this.ctx.fill();
  }
  
  drawCircle(x: number, y: number, radius: number, color: Color): void {
    if (!this.ctx) return;
    
    this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  drawLine(x1: number, y1: number, x2: number, y2: number, color: Color, lineWidth: number): void {
    if (!this.ctx) return;
    
    // Half-pixel 스냅 for crisp lines
    const snappedX1 = Math.round(x1) + 0.5;
    const snappedY1 = Math.round(y1) + 0.5;
    const snappedX2 = Math.round(x2) + 0.5;
    const snappedY2 = Math.round(y2) + 0.5;
    
    this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(snappedX1, snappedY1);
    this.ctx.lineTo(snappedX2, snappedY2);
    this.ctx.stroke();
  }
  
  drawBezier(points: BezierPoints, color: Color, lineWidth: number): void {
    if (!this.ctx) return;
    
    this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(points.x1, points.y1);
    this.ctx.bezierCurveTo(
      points.cx1, points.cy1,
      points.cx2, points.cy2,
      points.x2, points.y2
    );
    this.ctx.stroke();
  }
  
  getCapabilities(): RendererCapabilities {
    return {
      type: 'webgl2',  // Canvas2D로 구현했지만 인터페이스는 webgl2
      maxTextureSize: 4096,
      supportsInstancing: false,
    };
  }
}
