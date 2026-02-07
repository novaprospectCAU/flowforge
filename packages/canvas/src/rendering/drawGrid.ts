import type { IRenderer } from '../renderer/types';
import type { Viewport, CanvasSize } from '@flowforge/types';
import { getCanvasTheme } from '../theme/canvasTheme';

const GRID_SIZE = 20; // 기본 그리드 간격
const MAJOR_EVERY = 5; // 5칸마다 major 라인

/**
 * 무한 그리드 배경 렌더링
 */
export function drawGrid(
  renderer: IRenderer,
  viewport: Viewport,
  canvasSize: CanvasSize
): void {
  const { zoom } = viewport;

  // 줌 레벨에 따라 그리드 크기 조정
  let gridSize = GRID_SIZE;
  if (zoom < 0.5) gridSize = GRID_SIZE * 4;
  else if (zoom < 0.25) gridSize = GRID_SIZE * 8;

  // 뷰포트 경계 계산 (월드 좌표)
  const halfWidth = canvasSize.width / 2 / zoom;
  const halfHeight = canvasSize.height / 2 / zoom;

  const left = viewport.x - halfWidth;
  const right = viewport.x + halfWidth;
  const top = viewport.y - halfHeight;
  const bottom = viewport.y + halfHeight;

  // 그리드 시작점 (그리드에 맞춤)
  const startX = Math.floor(left / gridSize) * gridSize;
  const startY = Math.floor(top / gridSize) * gridSize;

  // 세로 라인
  for (let x = startX; x <= right; x += gridSize) {
    const isMajor = Math.round(x / gridSize) % MAJOR_EVERY === 0;
    renderer.drawLine(
      x, top, x, bottom,
      isMajor ? getCanvasTheme().gridMajor : getCanvasTheme().gridMinor,
      1
    );
  }

  // 가로 라인
  for (let y = startY; y <= bottom; y += gridSize) {
    const isMajor = Math.round(y / gridSize) % MAJOR_EVERY === 0;
    renderer.drawLine(
      left, y, right, y,
      isMajor ? getCanvasTheme().gridMajor : getCanvasTheme().gridMinor,
      1
    );
  }
}
