import type { Color } from '@flowforge/types';

export interface CanvasThemeColors {
  canvasBg: Color;
  gridMinor: Color;
  gridMajor: Color;
  nodeBg: Color;
  nodeHeader: Color;
  nodeBorder: Color;
  nodeText: Color;
  nodePortLabel: Color;
  minimapBg: Color;
  minimapNode: Color;
  groupText: Color;
}

export const darkCanvasTheme: CanvasThemeColors = {
  canvasBg: { r: 30, g: 30, b: 32, a: 255 },
  gridMinor: { r: 40, g: 40, b: 45, a: 255 },
  gridMajor: { r: 55, g: 55, b: 60, a: 255 },
  nodeBg: { r: 45, g: 45, b: 48, a: 255 },
  nodeHeader: { r: 80, g: 80, b: 85, a: 255 },
  nodeBorder: { r: 100, g: 100, b: 105, a: 255 },
  nodeText: { r: 255, g: 255, b: 255, a: 255 },
  nodePortLabel: { r: 180, g: 180, b: 185, a: 255 },
  minimapBg: { r: 30, g: 30, b: 32, a: 230 },
  minimapNode: { r: 100, g: 100, b: 105, a: 255 },
  groupText: { r: 255, g: 255, b: 255, a: 230 },
};

export const lightCanvasTheme: CanvasThemeColors = {
  canvasBg: { r: 248, g: 248, b: 248, a: 255 },
  gridMinor: { r: 200, g: 200, b: 200, a: 255 },
  gridMajor: { r: 170, g: 170, b: 170, a: 255 },
  nodeBg: { r: 255, g: 255, b: 255, a: 255 },
  nodeHeader: { r: 240, g: 240, b: 240, a: 255 },
  nodeBorder: { r: 208, g: 208, b: 208, a: 255 },
  nodeText: { r: 26, g: 26, b: 26, a: 255 },
  nodePortLabel: { r: 102, g: 102, b: 102, a: 255 },
  minimapBg: { r: 232, g: 232, b: 232, a: 230 },
  minimapNode: { r: 176, g: 176, b: 176, a: 255 },
  groupText: { r: 51, g: 51, b: 51, a: 230 },
};

let currentTheme: CanvasThemeColors = darkCanvasTheme;

export function getCanvasTheme(): CanvasThemeColors {
  return currentTheme;
}

export function setCanvasTheme(mode: 'dark' | 'light'): void {
  currentTheme = mode === 'dark' ? darkCanvasTheme : lightCanvasTheme;
}
