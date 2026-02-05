/**
 * CommentWidgets - 모든 코멘트의 편집 위젯을 렌더링
 */

import type { Comment, Viewport, CanvasSize } from '@flowforge/types';
import { CommentWidget } from './CommentWidget';

interface CommentWidgetsProps {
  comments: Comment[];
  viewport: Viewport;
  canvasSize: CanvasSize;
  onUpdateComment: (commentId: string, text: string, updatedAt: number) => void;
  onWidgetInteraction?: (interacting: boolean) => void;
}

export function CommentWidgets({
  comments,
  viewport,
  canvasSize,
  onUpdateComment,
  onWidgetInteraction,
}: CommentWidgetsProps) {
  // 줌이 너무 작으면 위젯 숨김
  if (viewport.zoom < 0.5) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5, // 노드 위젯(10)보다 아래
      }}
    >
      {comments.map(comment => (
        <CommentWidget
          key={comment.id}
          comment={comment}
          viewport={viewport}
          canvasSize={canvasSize}
          onUpdate={(text) => onUpdateComment(comment.id, text, Date.now())}
          onInteraction={onWidgetInteraction}
        />
      ))}
    </div>
  );
}
