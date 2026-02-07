/**
 * CommentWidgets - 모든 코멘트의 편집 위젯을 렌더링
 */

import { ZOOM_CONFIG, type Comment, type Viewport, type CanvasSize } from '@flowforge/types';
import { CommentWidget } from './CommentWidget';
import { Z_INDEX } from '../constants/zIndex';

interface CommentWidgetsProps {
  comments: Comment[];
  viewport: Viewport;
  canvasSize: CanvasSize;
  editingCommentId: string | null;
  onUpdateComment: (commentId: string, text: string, updatedAt: number) => void;
  onEditingEnd: () => void;
  onWidgetInteraction?: (interacting: boolean) => void;
}

export function CommentWidgets({
  comments,
  viewport,
  canvasSize,
  editingCommentId,
  onUpdateComment,
  onEditingEnd,
  onWidgetInteraction,
}: CommentWidgetsProps) {
  // 줌이 위젯 가시성 임계값 미만이면 위젯 숨김
  if (viewport.zoom < ZOOM_CONFIG.WIDGET_VISIBILITY_THRESHOLD) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: Z_INDEX.COMMENT_WIDGET, // 노드 위젯보다 아래
      }}
    >
      {comments.map(comment => (
        <CommentWidget
          key={comment.id}
          comment={comment}
          viewport={viewport}
          canvasSize={canvasSize}
          isEditing={editingCommentId === comment.id}
          onUpdate={(text) => onUpdateComment(comment.id, text, Date.now())}
          onEditingEnd={onEditingEnd}
          onInteraction={onWidgetInteraction}
        />
      ))}
    </div>
  );
}
