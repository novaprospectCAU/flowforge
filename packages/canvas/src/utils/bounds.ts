/**
 * 바운딩 박스 계산 유틸리티
 */

import type { Position } from '@flowforge/types';

/**
 * 바운딩 박스 타입 (min/max 형식)
 */
export interface BoundsMinMax {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * 바운딩 박스 타입 (x/y/width/height 형식)
 */
export interface BoundsRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 위치와 크기를 가진 요소의 인터페이스
 */
export interface Bounded {
  position: Position;
  size: { width: number; height: number };
}

/**
 * 요소 배열에서 바운딩 박스 계산 (min/max 형식)
 * @returns null if items is empty
 */
export function calculateBoundsMinMax<T extends Bounded>(items: T[]): BoundsMinMax | null {
  if (items.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const item of items) {
    minX = Math.min(minX, item.position.x);
    minY = Math.min(minY, item.position.y);
    maxX = Math.max(maxX, item.position.x + item.size.width);
    maxY = Math.max(maxY, item.position.y + item.size.height);
  }

  return { minX, minY, maxX, maxY };
}

/**
 * 요소 배열에서 바운딩 박스 계산 (rect 형식)
 * @returns null if items is empty
 */
export function calculateBoundsRect<T extends Bounded>(items: T[]): BoundsRect | null {
  const bounds = calculateBoundsMinMax(items);
  if (!bounds) return null;

  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
}

/**
 * 바운딩 박스에 패딩 적용
 */
export function expandBounds(bounds: BoundsMinMax, padding: number): BoundsMinMax {
  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
  };
}

/**
 * 바운딩 박스에 비대칭 패딩 적용
 */
export function expandBoundsAsymmetric(
  bounds: BoundsMinMax,
  top: number,
  right: number,
  bottom: number,
  left: number
): BoundsMinMax {
  return {
    minX: bounds.minX - left,
    minY: bounds.minY - top,
    maxX: bounds.maxX + right,
    maxY: bounds.maxY + bottom,
  };
}

/**
 * min/max 형식을 rect 형식으로 변환
 */
export function boundsToRect(bounds: BoundsMinMax): BoundsRect {
  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
}

/**
 * 두 바운딩 박스 병합
 */
export function mergeBounds(a: BoundsMinMax, b: BoundsMinMax): BoundsMinMax {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/**
 * 바운딩 박스의 중심점 계산
 */
export function getBoundsCenter(bounds: BoundsMinMax): Position {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
}
