import { WebGPURenderer } from './WebGPURenderer';
import { WebGL2Renderer } from './WebGL2Renderer';
import type { IRenderer } from './types';

// roundRect 폴리필 (Safari < 16, Firefox < 112 등 구형 브라우저 지원)
if (typeof CanvasRenderingContext2D !== 'undefined' &&
    !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (
    x: number, y: number, w: number, h: number,
    radii?: number | number[]
  ) {
    const r = typeof radii === 'number' ? radii : Array.isArray(radii) ? radii[0] ?? 0 : 0;
    const clampedR = Math.min(r, w / 2, h / 2);
    this.moveTo(x + clampedR, y);
    this.arcTo(x + w, y, x + w, y + h, clampedR);
    this.arcTo(x + w, y + h, x, y + h, clampedR);
    this.arcTo(x, y + h, x, y, clampedR);
    this.arcTo(x, y, x + w, y, clampedR);
    this.closePath();
  };
}

export interface CreateRendererOptions {
  force?: 'webgpu' | 'webgl2';
  /** Enable debug logging for renderer initialization */
  debug?: boolean;
}

/**
 * 렌더러 생성 (자동 fallback)
 *
 * 1. WebGPU 시도
 * 2. 실패 시 WebGL2 fallback
 */
export async function createRenderer(
  canvas: HTMLCanvasElement,
  options: CreateRendererOptions = {}
): Promise<IRenderer> {
  const log = options.debug ? console.log.bind(console) : () => {};

  // 강제 모드
  if (options.force === 'webgl2') {
    const renderer = new WebGL2Renderer();
    const success = await renderer.init(canvas);
    if (success) {
      log('[Renderer] Using WebGL2 (forced)');
      return renderer;
    }
    throw new Error('WebGL2 renderer initialization failed');
  }

  // 1. WebGPU 시도
  if ('gpu' in navigator) {
    try {
      const webgpuRenderer = new WebGPURenderer();
      const success = await webgpuRenderer.init(canvas);
      if (success) {
        const caps = webgpuRenderer.getCapabilities();
        log(`[Renderer] Using ${caps.type}`);
        return webgpuRenderer;
      }
    } catch (e) {
      log('[Renderer] WebGPU initialization failed, trying WebGL2:', e);
    }
  }

  // 2. WebGL2 Fallback
  const webgl2Renderer = new WebGL2Renderer();
  const success = await webgl2Renderer.init(canvas);
  if (success) {
    log('[Renderer] Using WebGL2 (fallback)');
    return webgl2Renderer;
  }

  throw new Error('No suitable renderer available');
}

// Re-export types
export type { IRenderer } from './types';
export { snapToHalfPixel, snapLineCoords } from './types';
