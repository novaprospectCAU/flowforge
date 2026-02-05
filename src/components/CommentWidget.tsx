/**
 * Comment 위젯 - 코멘트 편집 및 시간 표시
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Comment, Viewport, CanvasSize } from '@flowforge/types';
import { worldToScreen } from '@flowforge/canvas';

interface CommentWidgetProps {
  comment: Comment;
  viewport: Viewport;
  canvasSize: CanvasSize;
  onUpdate: (text: string) => void;
  onInteraction?: (interacting: boolean) => void;
}

/**
 * 시간 포맷팅 (상대 시간 또는 절대 시간)
 */
function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  // 1분 이내
  if (diff < 60 * 1000) {
    return 'just now';
  }

  // 1시간 이내
  if (diff < 60 * 60 * 1000) {
    const mins = Math.floor(diff / (60 * 1000));
    return `${mins}m ago`;
  }

  // 24시간 이내
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}h ago`;
  }

  // 그 외: 날짜 표시
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hour}:${minute}`;
}

export function CommentWidget({
  comment,
  viewport,
  canvasSize,
  onUpdate,
  onInteraction,
}: CommentWidgetProps) {
  const [localText, setLocalText] = useState(comment.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInitialRender = useRef(true);

  // 외부 변경 반영
  useEffect(() => {
    if (!isInitialRender.current) {
      setLocalText(comment.text);
    }
    isInitialRender.current = false;
  }, [comment.text]);

  // 스크린 좌표 계산
  const screenPos = worldToScreen(comment.position, viewport, canvasSize);
  const scaledWidth = comment.size.width * viewport.zoom;
  const scaledHeight = comment.size.height * viewport.zoom;

  // 화면 밖이면 렌더링 안 함
  if (
    screenPos.x + scaledWidth < 0 ||
    screenPos.x > canvasSize.width ||
    screenPos.y + scaledHeight < 0 ||
    screenPos.y > canvasSize.height
  ) {
    return null;
  }

  // 줌이 너무 작으면 숨김
  if (viewport.zoom < 0.5) {
    return null;
  }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setLocalText(newText);
      onUpdate(newText);
    },
    [onUpdate]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInteraction?.(true);
  };

  const handleMouseUp = () => {
    onInteraction?.(false);
  };

  // 시간 표시
  const isUpdated = comment.updatedAt && comment.updatedAt !== comment.createdAt;
  const displayTime = isUpdated ? comment.updatedAt : comment.createdAt;

  // 스타일 계산
  const fontSize = Math.max(10, 12 * viewport.zoom);
  const padding = 8 * viewport.zoom;

  return (
    <div
      style={{
        position: 'absolute',
        left: screenPos.x,
        top: screenPos.y,
        width: scaledWidth,
        height: scaledHeight,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 텍스트 입력 영역 */}
      <textarea
        ref={textareaRef}
        value={localText}
        onChange={handleChange}
        placeholder="New comment / 새로운 코멘트"
        style={{
          flex: 1,
          width: '100%',
          padding: padding,
          paddingBottom: displayTime ? padding / 2 : padding,
          fontSize: fontSize,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          lineHeight: 1.4,
          color: '#3c3c3c',
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'none',
          overflow: 'hidden',
        }}
      />

      {/* 시간 표시 */}
      {displayTime && (
        <div
          style={{
            padding: `0 ${padding}px ${padding / 2}px`,
            fontSize: Math.max(8, 10 * viewport.zoom),
            color: '#999',
            textAlign: 'right',
            lineHeight: 1,
          }}
        >
          {isUpdated && <span>(updated) </span>}
          {formatTime(displayTime)}
        </div>
      )}
    </div>
  );
}
