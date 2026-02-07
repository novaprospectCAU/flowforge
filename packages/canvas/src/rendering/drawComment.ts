import type { IRenderer } from '../renderer/types';
import type { Comment, Color } from '@flowforge/types';
import { hexToColor } from '../theme/colors';

// 코멘트 스타일 상수
const COMMENT_STYLE = {
  borderRadius: 4,
  padding: 8,
  fontSize: 12,
  minWidth: 100,
  minHeight: 40,
};

const COMMENT_COLORS = {
  background: { r: 255, g: 248, b: 220, a: 230 } as Color,  // 밝은 노란색
  border: { r: 200, g: 180, b: 100, a: 255 } as Color,
  selected: { r: 66, g: 135, b: 245, a: 255 } as Color,
  text: { r: 60, g: 60, b: 60, a: 255 } as Color,
};

/**
 * 단일 코멘트 렌더링
 * @param skipText - true면 텍스트를 렌더링하지 않음 (위젯이 대신 표시할 때)
 */
export function drawComment(
  renderer: IRenderer,
  comment: Comment,
  selected: boolean = false,
  skipText: boolean = false
): void {
  const { x, y } = comment.position;
  const { width, height } = comment.size;

  // 선택 테두리
  if (selected) {
    const border = 2;
    renderer.drawRoundedRect(
      x - border, y - border,
      width + border * 2, height + border * 2,
      COMMENT_STYLE.borderRadius + border,
      COMMENT_COLORS.selected
    );
  }

  // 배경
  const bgColor = hexToColor(comment.color, 230, COMMENT_COLORS.background);
  renderer.drawRoundedRect(
    x, y, width, height,
    COMMENT_STYLE.borderRadius,
    bgColor
  );

  // 테두리
  const borderColor = hexToColor(comment.color, 255, COMMENT_COLORS.border);
  // 상단 라인
  renderer.drawLine(
    x + COMMENT_STYLE.borderRadius, y,
    x + width - COMMENT_STYLE.borderRadius, y,
    borderColor, 1
  );
  // 하단 라인
  renderer.drawLine(
    x + COMMENT_STYLE.borderRadius, y + height,
    x + width - COMMENT_STYLE.borderRadius, y + height,
    borderColor, 1
  );
  // 좌측 라인
  renderer.drawLine(
    x, y + COMMENT_STYLE.borderRadius,
    x, y + height - COMMENT_STYLE.borderRadius,
    borderColor, 1
  );
  // 우측 라인
  renderer.drawLine(
    x + width, y + COMMENT_STYLE.borderRadius,
    x + width, y + height - COMMENT_STYLE.borderRadius,
    borderColor, 1
  );

  // 텍스트 (여러 줄 지원) - skipText가 true면 위젯이 대신 표시
  if (!skipText) {
    const lines = comment.text.split('\n');
    const lineHeight = COMMENT_STYLE.fontSize + 4;
    const maxLines = Math.floor((height - COMMENT_STYLE.padding * 2) / lineHeight);
    const visibleLines = lines.slice(0, maxLines);

    for (let i = 0; i < visibleLines.length; i++) {
      renderer.drawText(
        visibleLines[i],
        x + COMMENT_STYLE.padding,
        y + COMMENT_STYLE.padding + i * lineHeight,
        COMMENT_COLORS.text,
        COMMENT_STYLE.fontSize
      );
    }
  }
}

/**
 * 여러 코멘트 렌더링
 * @param skipText - true면 텍스트를 렌더링하지 않음 (위젯이 대신 표시할 때)
 */
export function drawComments(
  renderer: IRenderer,
  comments: Comment[],
  selectedIds: Set<string> = new Set(),
  skipText: boolean = false
): void {
  for (const comment of comments) {
    drawComment(renderer, comment, selectedIds.has(comment.id), skipText);
  }
}

/**
 * 코멘트 히트 테스트
 */
export function hitTestComment(
  worldPos: { x: number; y: number },
  comments: Comment[]
): Comment | null {
  // 역순으로 검사 (나중에 그려진 것이 위에 있음)
  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i];
    const { x, y } = comment.position;
    const { width, height } = comment.size;

    if (
      worldPos.x >= x &&
      worldPos.x <= x + width &&
      worldPos.y >= y &&
      worldPos.y <= y + height
    ) {
      return comment;
    }
  }
  return null;
}

export { COMMENT_STYLE };
