/**
 * Performance utilities tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
  getViewportBounds,
  isNodeInViewport,
  cullNodesByViewport,
  cullCommentsByViewport,
  memoizeOne,
  debounce,
  throttle,
} from './performance';
import type { FlowNode, Viewport, CanvasSize, Comment } from '@flowforge/types';

describe('getViewportBounds', () => {
  it('should calculate viewport bounds correctly', () => {
    const viewport: Viewport = { x: 500, y: 300, zoom: 1 };
    const canvasSize: CanvasSize = { width: 1000, height: 600 };

    const bounds = getViewportBounds(viewport, canvasSize, 0);

    expect(bounds.minX).toBe(0);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxX).toBe(1000);
    expect(bounds.maxY).toBe(600);
  });

  it('should account for zoom level', () => {
    const viewport: Viewport = { x: 500, y: 300, zoom: 2 };
    const canvasSize: CanvasSize = { width: 1000, height: 600 };

    const bounds = getViewportBounds(viewport, canvasSize, 0);

    // At zoom 2, visible area is half the size
    expect(bounds.minX).toBe(250);
    expect(bounds.minY).toBe(150);
    expect(bounds.maxX).toBe(750);
    expect(bounds.maxY).toBe(450);
  });

  it('should add margin', () => {
    const viewport: Viewport = { x: 500, y: 300, zoom: 1 };
    const canvasSize: CanvasSize = { width: 1000, height: 600 };

    const bounds = getViewportBounds(viewport, canvasSize, 100);

    expect(bounds.minX).toBe(-100);
    expect(bounds.minY).toBe(-100);
    expect(bounds.maxX).toBe(1100);
    expect(bounds.maxY).toBe(700);
  });
});

describe('isNodeInViewport', () => {
  const bounds = { minX: 0, minY: 0, maxX: 1000, maxY: 600 };

  it('should return true for node inside viewport', () => {
    const node: FlowNode = {
      id: '1',
      type: 'Test',
      position: { x: 100, y: 100 },
      size: { width: 200, height: 100 },
      data: {},
    };

    expect(isNodeInViewport(node, bounds)).toBe(true);
  });

  it('should return false for node completely outside viewport', () => {
    const node: FlowNode = {
      id: '1',
      type: 'Test',
      position: { x: 1200, y: 100 },
      size: { width: 200, height: 100 },
      data: {},
    };

    expect(isNodeInViewport(node, bounds)).toBe(false);
  });

  it('should return true for node partially inside viewport', () => {
    const node: FlowNode = {
      id: '1',
      type: 'Test',
      position: { x: -100, y: 100 },
      size: { width: 200, height: 100 },
      data: {},
    };

    expect(isNodeInViewport(node, bounds)).toBe(true);
  });
});

describe('cullNodesByViewport', () => {
  it('should filter out nodes outside viewport', () => {
    const nodes: FlowNode[] = [
      { id: '1', type: 'Test', position: { x: 100, y: 100 }, size: { width: 100, height: 100 }, data: {} },
      { id: '2', type: 'Test', position: { x: 2000, y: 100 }, size: { width: 100, height: 100 }, data: {} },
      { id: '3', type: 'Test', position: { x: 500, y: 300 }, size: { width: 100, height: 100 }, data: {} },
    ];

    const viewport: Viewport = { x: 500, y: 300, zoom: 1 };
    const canvasSize: CanvasSize = { width: 1000, height: 600 };

    const culled = cullNodesByViewport(nodes, viewport, canvasSize, 0);

    expect(culled).toHaveLength(2);
    expect(culled.map(n => n.id)).toEqual(['1', '3']);
  });
});

describe('cullCommentsByViewport', () => {
  it('should filter out comments outside viewport', () => {
    const comments: Comment[] = [
      { id: '1', text: 'Test', position: { x: 100, y: 100 }, size: { width: 100, height: 50 } },
      { id: '2', text: 'Test', position: { x: 3000, y: 100 }, size: { width: 100, height: 50 } },
    ];

    const viewport: Viewport = { x: 500, y: 300, zoom: 1 };
    const canvasSize: CanvasSize = { width: 1000, height: 600 };

    const culled = cullCommentsByViewport(comments, viewport, canvasSize, 0);

    expect(culled).toHaveLength(1);
    expect(culled[0].id).toBe('1');
  });
});

describe('memoizeOne', () => {
  it('should cache result for same arguments', () => {
    const fn = vi.fn((a: number, b: number) => a + b);
    const memoized = memoizeOne(fn);

    expect(memoized(1, 2)).toBe(3);
    expect(memoized(1, 2)).toBe(3);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should recalculate for different arguments', () => {
    const fn = vi.fn((a: number, b: number) => a + b);
    const memoized = memoizeOne(fn);

    expect(memoized(1, 2)).toBe(3);
    expect(memoized(2, 3)).toBe(5);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('debounce', () => {
  it('should delay function execution', async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

describe('throttle', () => {
  it('should limit function calls', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();

    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
