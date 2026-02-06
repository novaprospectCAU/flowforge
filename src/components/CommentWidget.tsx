/**
 * Comment 위젯 - 코멘트 편집 및 시간 표시
 * - 한 번 클릭: 선택 (캔버스에서 처리)
 * - 더블클릭: 편집 모드
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Comment, Viewport, CanvasSize } from '@flowforge/types';
import { worldToScreen } from '@flowforge/canvas';
import { useLanguage } from '../i18n';
import { useTheme } from '../hooks/useTheme';

interface CommentWidgetProps {
  comment: Comment;
  viewport: Viewport;
  canvasSize: CanvasSize;
  isEditing: boolean;
  onUpdate: (text: string) => void;
  onEditingEnd: () => void;
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
  isEditing,
  onUpdate,
  onEditingEnd,
  onInteraction,
}: CommentWidgetProps) {
  // === 모든 훅은 early return 전에 호출해야 함 ===
  const [localText, setLocalText] = useState(comment.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const language = useLanguage();
  const { mode } = useTheme();

  // 외부 변경 반영
  useEffect(() => {
    setLocalText(comment.text);
  }, [comment.text]);

  // 편집 모드 진입 시 자동 포커스
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      // iOS에서 키보드가 뜨도록 약간의 지연 후 포커스
      const textarea = textareaRef.current;
      requestAnimationFrame(() => {
        textarea.focus();
        // 커서를 끝으로 이동
        const len = textarea.value.length;
        textarea.setSelectionRange(len, len);
      });
    }
  }, [isEditing]);

  // 이벤트 핸들러 (useCallback은 early return 전에 호출)
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setLocalText(newText);
      onUpdate(newText);
    },
    [onUpdate]
  );

  const handleTextareaMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing) {
        e.stopPropagation();
        onInteraction?.(true);
      }
    },
    [isEditing, onInteraction]
  );

  // 터치 기기에서 편집 모드일 때 터치하면 포커스
  const handleTextareaTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isEditing) {
        e.stopPropagation();
        onInteraction?.(true);
        // iOS에서 키보드가 뜨도록 직접 포커스
        textareaRef.current?.focus();
      }
    },
    [isEditing, onInteraction]
  );

  const handleTextareaBlur = useCallback(() => {
    onInteraction?.(false);
    onEditingEnd();
  }, [onInteraction, onEditingEnd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      textareaRef.current?.blur();
      return;
    }
    e.stopPropagation();
  }, []);

  // === Early returns (훅 호출 이후) ===

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

  // === 렌더링 계산 ===
  const placeholder = language === 'ko' ? '새로운 코멘트' : 'New comment';
  const isUpdated = comment.updatedAt && comment.updatedAt !== comment.createdAt;
  const displayTime = isUpdated ? comment.updatedAt : comment.createdAt;
  const fontSize = Math.max(10, 12 * viewport.zoom);
  const padding = 8 * viewport.zoom;
  const timestampHeight = displayTime ? Math.max(14, 18 * viewport.zoom) : 0;

  // Theme-aware colors for comment text (comments are on yellow/light background)
  const textColor = mode === 'dark' ? '#3c3c3c' : '#2d2d2d';
  const timestampColor = mode === 'dark' ? '#666' : '#888';

  return (
    <div
      style={{
        position: 'absolute',
        left: screenPos.x,
        top: screenPos.y,
        width: scaledWidth,
        height: scaledHeight,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <textarea
        ref={textareaRef}
        value={localText}
        onChange={handleChange}
        placeholder={placeholder}
        onMouseDown={handleTextareaMouseDown}
        onTouchStart={handleTextareaTouchStart}
        onBlur={handleTextareaBlur}
        onKeyDown={handleKeyDown}
        readOnly={!isEditing}
        aria-label={language === 'ko' ? '코멘트' : 'Comment'}
        style={{
          flex: 1,
          width: '100%',
          padding: padding,
          paddingBottom: displayTime ? 0 : padding,
          fontSize: fontSize,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          lineHeight: 1.4,
          color: textColor,
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'none',
          overflow: 'hidden',
          pointerEvents: isEditing ? 'auto' : 'none',
          cursor: isEditing ? 'text' : 'default',
        }}
      />

      {displayTime && (
        <div
          style={{
            height: timestampHeight,
            padding: `0 ${padding}px ${padding / 2}px`,
            fontSize: Math.max(8, 10 * viewport.zoom),
            color: timestampColor,
            textAlign: 'right',
            lineHeight: 1,
            pointerEvents: 'none',
          }}
        >
          {isUpdated && <span>(updated) </span>}
          {formatTime(displayTime)}
        </div>
      )}
    </div>
  );
}
