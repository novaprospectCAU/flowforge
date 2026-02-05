/**
 * Comment 위젯 - 코멘트 편집 및 시간 표시
 * - 한 번 클릭: 선택 (캔버스에서 처리)
 * - 더블클릭: 편집 모드
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Comment, Viewport, CanvasSize } from '@flowforge/types';
import { worldToScreen } from '@flowforge/canvas';

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
  const [localText, setLocalText] = useState(comment.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 외부 변경 반영
  useEffect(() => {
    setLocalText(comment.text);
  }, [comment.text]);

  // 편집 모드 진입 시 자동 포커스
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // 커서를 끝으로 이동
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

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

  // textarea 이벤트 핸들러 (편집 모드에서만 활성화)
  const handleTextareaMouseDown = (e: React.MouseEvent) => {
    if (isEditing) {
      e.stopPropagation(); // 편집 중일 때만 캔버스 이벤트 차단
      onInteraction?.(true);
    }
  };

  const handleTextareaBlur = () => {
    onInteraction?.(false);
    onEditingEnd();
  };

  // 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Escape 키로 편집 종료
    if (e.key === 'Escape') {
      e.preventDefault();
      textareaRef.current?.blur();
      return;
    }

    // 편집 중일 때 모든 키보드 이벤트가 캔버스로 전파되지 않도록 차단
    // (Cmd+A, Cmd+C, Cmd+V 등이 텍스트에만 적용되도록)
    e.stopPropagation();
  };

  // 시간 표시
  const isUpdated = comment.updatedAt && comment.updatedAt !== comment.createdAt;
  const displayTime = isUpdated ? comment.updatedAt : comment.createdAt;

  // 스타일 계산
  const fontSize = Math.max(10, 12 * viewport.zoom);
  const padding = 8 * viewport.zoom;
  const timestampHeight = displayTime ? Math.max(14, 18 * viewport.zoom) : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: screenPos.x,
        top: screenPos.y,
        width: scaledWidth,
        height: scaledHeight,
        pointerEvents: 'none', // 컨테이너는 항상 클릭 통과
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 텍스트 입력 영역 - 편집 모드에서만 클릭 가능 */}
      <textarea
        ref={textareaRef}
        value={localText}
        onChange={handleChange}
        placeholder="New comment / 새로운 코멘트"
        onMouseDown={handleTextareaMouseDown}
        onBlur={handleTextareaBlur}
        onKeyDown={handleKeyDown}
        readOnly={!isEditing}
        style={{
          flex: 1,
          width: '100%',
          padding: padding,
          paddingBottom: displayTime ? 0 : padding,
          fontSize: fontSize,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          lineHeight: 1.4,
          color: '#3c3c3c',
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'none',
          overflow: 'hidden',
          pointerEvents: isEditing ? 'auto' : 'none', // 편집 모드에서만 클릭 가능
          cursor: isEditing ? 'text' : 'default',
        }}
      />

      {/* 시간 표시 */}
      {displayTime && (
        <div
          style={{
            height: timestampHeight,
            padding: `0 ${padding}px ${padding / 2}px`,
            fontSize: Math.max(8, 10 * viewport.zoom),
            color: '#999',
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
