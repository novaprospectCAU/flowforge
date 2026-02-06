/**
 * Prompt Template 노드 위젯
 * 템플릿 편집 및 변수 표시
 */

import type { FlowNode } from '@flowforge/types';
import { useTheme } from '../../hooks/useTheme';

interface PromptTemplateWidgetProps {
  node: FlowNode;
  zoom: number;
  onUpdate: (data: Record<string, unknown>) => void;
  onInteraction?: (interacting: boolean) => void;
}

/**
 * 템플릿에서 변수 추출
 */
function extractVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{(\w+)\}\}/g);
  const variables = new Set<string>();
  for (const match of matches) {
    variables.add(match[1]);
  }
  return Array.from(variables);
}

/**
 * Prompt Template 노드 위젯
 */
export function PromptTemplateWidget({
  node,
  zoom,
  onUpdate,
  onInteraction,
}: PromptTemplateWidgetProps) {
  const { colors } = useTheme();

  // 노드 데이터 추출
  const template = (node.data.template as string) || '';
  const lastResult = node.data.lastResult as string | undefined;
  const unsubstitutedVars = (node.data.unsubstitutedVars as string[]) || [];

  // 템플릿에서 변수 추출
  const variables = extractVariables(template);

  // 입력 핸들러
  const handleChange = (value: string) => {
    onUpdate({ template: value });
  };

  // 스타일 계산
  const baseFontSize = Math.max(10, Math.min(14, 12 * zoom));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6 * zoom,
        padding: 8 * zoom,
        fontSize: baseFontSize,
      }}
      onMouseDown={() => onInteraction?.(true)}
      onMouseUp={() => onInteraction?.(false)}
      onMouseLeave={() => onInteraction?.(false)}
    >
      {/* 템플릿 입력 */}
      <textarea
        style={{
          backgroundColor: colors.bgTertiary,
          border: `1px solid ${colors.borderLight}`,
          borderRadius: 4 * zoom,
          color: colors.textPrimary,
          padding: 8 * zoom,
          fontSize: baseFontSize,
          resize: 'vertical',
          minHeight: 60 * zoom,
          outline: 'none',
          fontFamily: 'monospace',
          lineHeight: 1.4,
        }}
        value={template}
        onChange={e => handleChange(e.target.value)}
        placeholder="Enter template with {{variables}}..."
        aria-label="Prompt template"
      />

      {/* 변수 목록 */}
      {variables.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4 * zoom,
          }}
          role="list"
          aria-label="Template variables"
        >
          {variables.map(v => (
            <span
              key={v}
              style={{
                backgroundColor: unsubstitutedVars.includes(v) ? colors.warning : colors.success,
                color: '#fff',
                padding: `${2 * zoom}px ${6 * zoom}px`,
                borderRadius: 3 * zoom,
                fontSize: baseFontSize * 0.85,
                fontFamily: 'monospace',
              }}
              role="listitem"
            >
              {v}
            </span>
          ))}
        </div>
      )}

      {/* 결과 미리보기 */}
      {lastResult && (
        <div
          style={{
            backgroundColor: colors.bgPrimary,
            border: `1px solid ${colors.border}`,
            borderRadius: 4 * zoom,
            padding: 8 * zoom,
            fontSize: baseFontSize * 0.9,
            color: colors.textSecondary,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 60 * zoom,
            overflowY: 'auto',
          }}
        >
          {lastResult}
        </div>
      )}
    </div>
  );
}
