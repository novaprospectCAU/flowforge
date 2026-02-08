/**
 * Debug 노드 위젯
 * idle / success / error 3가지 상태 표시
 */

import type { FlowNode } from '@flowforge/types';
import { getErrorExplanation } from '@flowforge/state';
import { useTheme } from '../hooks/useTheme';

interface DebugWidgetProps {
  node: FlowNode;
  fontSize: number;
}

export function DebugWidget({ node, fontSize }: DebugWidgetProps) {
  const { colors } = useTheme();
  const debugMode = node.data.debugMode as string | undefined;

  // idle 상태
  if (!debugMode) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        color: colors.textMuted,
        fontFamily: 'monospace',
      }}>
        Waiting for execution...
      </div>
    );
  }

  // 에러 상태
  if (debugMode === 'error') {
    const debugError = node.data.debugError as
      { nodeId: string; nodeType: string; error: string } | undefined;
    const errorMsg = debugError?.error ?? 'Unknown error';
    const explanation = getErrorExplanation(errorMsg);

    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        overflow: 'auto',
        fontFamily: 'monospace',
        fontSize,
      }}>
        {/* 헤더 */}
        <div style={{
          background: '#dc262620',
          borderRadius: 3,
          padding: '2px 6px',
          color: '#f87171',
          fontWeight: 600,
          fontSize: fontSize * 0.9,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flexShrink: 0,
        }}>
          <span>{explanation.title}</span>
        </div>

        {/* 설명 */}
        <div style={{
          color: colors.textSecondary,
          fontSize: fontSize * 0.85,
          lineHeight: 1.3,
        }}>
          {explanation.explanation}
        </div>

        {/* 제안 */}
        <div style={{
          color: '#60a5fa',
          fontSize: fontSize * 0.85,
          lineHeight: 1.3,
        }}>
          {explanation.suggestion}
        </div>
      </div>
    );
  }

  // 성공 상태
  const debugValue = node.data.debugValue;
  const debugMeta = node.data.debugMeta as
    { type: string; size: string; timestamp: number } | undefined;

  const preview = debugValue === undefined ? 'undefined'
    : debugValue === null ? 'null'
    : typeof debugValue === 'object' ? JSON.stringify(debugValue, null, 1)
    : String(debugValue);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      overflow: 'hidden',
      fontFamily: 'monospace',
      fontSize,
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
      }}>
        <span style={{
          background: '#22c55e20',
          color: '#4ade80',
          borderRadius: 3,
          padding: '1px 5px',
          fontSize: fontSize * 0.8,
          fontWeight: 600,
        }}>
          {debugMeta?.type ?? 'unknown'}
        </span>
        <span style={{
          color: colors.textMuted,
          fontSize: fontSize * 0.8,
        }}>
          {debugMeta?.size ?? ''}
        </span>
      </div>

      {/* 값 프리뷰 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        background: colors.bgPrimary,
        borderRadius: 3,
        padding: 4,
        color: colors.textSecondary,
        fontSize: fontSize * 0.9,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        lineHeight: 1.3,
      }}>
        {preview.length > 500 ? preview.slice(0, 500) + '...' : preview}
      </div>
    </div>
  );
}
