import type { IRenderer } from './types';
import type { Viewport, CanvasSize, Color, BezierPoints, RendererCapabilities } from '@flowforge/types';

// WebGPU 타입 (브라우저 내장, 타입만 선언)
declare global {
  interface Navigator {
    gpu?: {
      requestAdapter(): Promise<GPUAdapter | null>;
    };
  }
  interface GPUAdapter {
    requestDevice(): Promise<GPUDevice>;
  }
  interface GPUDevice {}
}

/**
 * WebGPU 렌더러
 * 
 * MVP에서는 Canvas2D로 구현 (WebGPU 셰이더는 Week 2+)
 * WebGPU 지원 여부만 체크하고 실제 렌더링은 Canvas2D
 */
export class WebGPURenderer implements IRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private _isWebGPU: boolean = false;
  
  async init(canvas: HTMLCanvasElement): Promise<boolean> {
    this.canvas = canvas;
    
    // WebGPU 지원 체크
    if ('gpu' in navigator) {
      try {
        const adapter = await navigator.gpu!.requestAdapter();
        if (adapter) {
          const device = await adapter.requestDevice();
          if (device) {
            this._isWebGPU = true;
            console.log('WebGPU available, using Canvas2D for MVP rendering');
          }
        }
      } catch (e) {
        console.log('WebGPU not available:', e);
      }
    }
    
    // MVP: Canvas2D로 렌더링
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
    
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  endFrame(): void {
    // Canvas2D는 자동 flush
  }
  
  setTransform(viewport: Viewport, canvasSize: CanvasSize, dpr: number): void {
    if (!this.ctx) return;
    
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
      type: this._isWebGPU ? 'webgpu' : 'webgl2',
      maxTextureSize: 8192,
      supportsInstancing: this._isWebGPU,
    };
  }
}
