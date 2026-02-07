/**
 * 공유 색상 상수
 * 데이터 타입별 포트/엣지 색상 정의
 */

import type { Color, DataType } from '@flowforge/types';

/**
 * 데이터 타입별 색상 (Color 객체)
 * 렌더러에서 사용
 */
export const DATA_TYPE_COLORS: Record<DataType, Color> = {
  image: { r: 100, g: 149, b: 237, a: 255 },   // 파랑 (Cornflower Blue)
  number: { r: 144, g: 238, b: 144, a: 255 },  // 연두 (Light Green)
  string: { r: 255, g: 182, b: 108, a: 255 },  // 주황 (Peach)
  boolean: { r: 255, g: 105, b: 180, a: 255 }, // 분홍 (Hot Pink)
  array: { r: 186, g: 85, b: 211, a: 255 },    // 보라 (Medium Orchid)
  object: { r: 64, g: 224, b: 208, a: 255 },   // 청록 (Turquoise)
  any: { r: 160, g: 160, b: 165, a: 255 },     // 회색 (기본)
};

/**
 * 데이터 타입별 색상 (CSS rgb 문자열)
 * Canvas 2D 및 CSS에서 사용
 */
export const DATA_TYPE_COLORS_CSS: Record<DataType, string> = {
  image: 'rgb(100, 149, 237)',   // 파랑 (Cornflower Blue)
  number: 'rgb(144, 238, 144)',  // 연두 (Light Green)
  string: 'rgb(255, 182, 108)',  // 주황 (Peach)
  boolean: 'rgb(255, 105, 180)', // 분홍 (Hot Pink)
  array: 'rgb(186, 85, 211)',    // 보라 (Medium Orchid)
  object: 'rgb(64, 224, 208)',   // 청록 (Turquoise)
  any: 'rgb(160, 160, 165)',     // 회색 (기본)
};

/**
 * 데이터 타입에 따른 색상 반환 (Color 객체)
 */
export function getDataTypeColor(dataType: DataType | string): Color {
  return DATA_TYPE_COLORS[dataType as DataType] || DATA_TYPE_COLORS.any;
}

/**
 * 데이터 타입에 따른 색상 반환 (CSS 문자열)
 */
export function getDataTypeColorCSS(dataType: DataType | string): string {
  return DATA_TYPE_COLORS_CSS[dataType as DataType] || DATA_TYPE_COLORS_CSS.any;
}

/**
 * 엣지 기본 색상
 */
export const EDGE_COLORS = {
  default: { r: 150, g: 150, b: 155, a: 255 } as Color,
  active: { r: 100, g: 180, b: 255, a: 255 } as Color,
};

/**
 * 기본 색상 (fallback)
 */
export const DEFAULT_COLOR: Color = { r: 128, g: 128, b: 128, a: 255 };

/**
 * 16진수 색상 문자열을 Color 객체로 변환
 * @param hex - #RRGGBB 형식의 색상 문자열
 * @param alpha - 알파 값 (0-255), 기본값 255
 * @param fallback - 파싱 실패 시 반환할 기본 색상
 */
export function hexToColor(
  hex: string | undefined,
  alpha: number = 255,
  fallback: Color = DEFAULT_COLOR
): Color {
  if (!hex) return fallback;

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: alpha,
    };
  }
  return fallback;
}
