/**
 * Undo/Redo 히스토리 패널
 * 히스토리 스택을 시각화하고 특정 시점으로 이동 가능
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../i18n';
import { useTheme } from '../hooks/useTheme';
import { SHADOWS } from '../theme/shadows';
import { Z_INDEX } from '../constants/zIndex';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  undoStackLength: number;
  redoStackLength: number;
  onUndoToIndex: (index: number) => void;
  onRedoToIndex: (index: number) => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function HistoryPanel({
  isOpen,
  onClose,
  undoStackLength,
  redoStackLength,
  onUndoToIndex,
  onRedoToIndex,
  onUndo,
  onRedo,
}: HistoryPanelProps) {
  const lang = useLanguage();
  const { colors } = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleUndoClick = useCallback((index: number) => {
    onUndoToIndex(index);
  }, [onUndoToIndex]);

  const handleRedoClick = useCallback((index: number) => {
    onRedoToIndex(index);
  }, [onRedoToIndex]);

  if (!isOpen) return null;

  const totalSteps = undoStackLength + redoStackLength;
  const currentPosition = undoStackLength;

  // 번역
  const t = {
    title: lang === 'ko' ? '히스토리' : 'History',
    current: lang === 'ko' ? '현재' : 'Current',
    empty: lang === 'ko' ? '히스토리가 비어있습니다' : 'History is empty',
    undo: lang === 'ko' ? '실행 취소' : 'Undo',
    redo: lang === 'ko' ? '다시 실행' : 'Redo',
    step: lang === 'ko' ? '단계' : 'Step',
    clickToJump: lang === 'ko' ? '클릭하여 이동' : 'Click to jump',
  };

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: colors.bgOverlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    panel: {
      width: 320,
      maxHeight: '70vh',
      background: colors.bgSecondary,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      boxShadow: SHADOWS.xlarge,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    header: {
      padding: '14px 16px',
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      margin: 0,
      fontSize: 15,
      fontWeight: 600,
      color: colors.textPrimary,
    },
    closeBtn: {
      width: 28,
      height: 28,
      background: 'transparent',
      border: 'none',
      borderRadius: 6,
      color: colors.textMuted,
      fontSize: 20,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    controls: {
      padding: '10px 16px',
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      gap: 8,
    },
    controlBtn: {
      flex: 1,
      padding: '8px 12px',
      background: colors.bgHover,
      border: 'none',
      borderRadius: 6,
      color: colors.textSecondary,
      fontSize: 12,
      cursor: 'pointer',
    },
    timeline: {
      flex: 1,
      overflowY: 'auto',
      padding: '12px 16px',
    },
    empty: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 13,
      padding: '20px 0',
    },
    section: {
      marginBottom: 12,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: 600,
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    item: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 10px',
      borderRadius: 6,
      cursor: 'pointer',
      transition: 'background 0.15s',
      marginBottom: 2,
    },
    itemHover: {
      background: colors.bgHover,
    },
    undoItem: {
      borderLeft: `2px solid ${colors.info}`,
      marginLeft: 8,
    },
    redoItem: {
      borderLeft: `2px solid ${colors.success}`,
      marginLeft: 8,
    },
    itemDot: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: colors.textMuted,
    },
    itemLabel: {
      flex: 1,
      fontSize: 12,
      color: colors.textMuted,
    },
    itemHint: {
      fontSize: 10,
      color: colors.textMuted,
      opacity: 0.6,
    },
    currentState: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 12px',
      background: colors.bgTertiary,
      borderRadius: 6,
      marginBottom: 12,
      border: `1px solid ${colors.border}`,
    },
    currentDot: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: colors.success,
    },
    currentLabel: {
      fontSize: 12,
      fontWeight: 600,
      color: colors.success,
    },
    footer: {
      padding: '10px 16px',
      borderTop: `1px solid ${colors.border}`,
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 11,
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="history-title">
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={styles.header}>
          <h3 id="history-title" style={styles.title}>{t.title}</h3>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close">×</button>
        </div>

        {/* Undo/Redo 버튼 */}
        <div style={styles.controls}>
          <button
            onClick={onUndo}
            disabled={undoStackLength === 0}
            style={{
              ...styles.controlBtn,
              opacity: undoStackLength === 0 ? 0.4 : 1,
              cursor: undoStackLength === 0 ? 'not-allowed' : 'pointer',
            }}
            aria-label={t.undo}
          >
            ↶ {t.undo}
          </button>
          <button
            onClick={onRedo}
            disabled={redoStackLength === 0}
            style={{
              ...styles.controlBtn,
              opacity: redoStackLength === 0 ? 0.4 : 1,
              cursor: redoStackLength === 0 ? 'not-allowed' : 'pointer',
            }}
            aria-label={t.redo}
          >
            ↷ {t.redo}
          </button>
        </div>

        {/* 히스토리 타임라인 */}
        <div style={styles.timeline} role="list">
          {totalSteps === 0 ? (
            <div style={styles.empty}>{t.empty}</div>
          ) : (
            <>
              {/* Redo 스택 (위쪽, 미래) */}
              {redoStackLength > 0 && (
                <div style={styles.section}>
                  <div style={styles.sectionLabel}>
                    {t.redo} ({redoStackLength})
                  </div>
                  {Array.from({ length: redoStackLength }).map((_, i) => {
                    const redoIndex = redoStackLength - 1 - i;
                    const stepNumber = currentPosition + i + 1;
                    return (
                      <div
                        key={`redo-${i}`}
                        style={{
                          ...styles.item,
                          ...styles.redoItem,
                          ...(hoveredIndex === stepNumber ? styles.itemHover : {}),
                        }}
                        onClick={() => handleRedoClick(redoIndex)}
                        onMouseEnter={() => setHoveredIndex(stepNumber)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        role="listitem"
                      >
                        <div style={styles.itemDot} />
                        <span style={styles.itemLabel}>
                          {t.step} {stepNumber}
                        </span>
                        <span style={styles.itemHint}>{t.clickToJump}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 현재 상태 */}
              <div style={styles.currentState} aria-current="step">
                <div style={styles.currentDot} />
                <span style={styles.currentLabel}>
                  ● {t.current} ({t.step} {currentPosition})
                </span>
              </div>

              {/* Undo 스택 (아래쪽, 과거) */}
              {undoStackLength > 0 && (
                <div style={styles.section}>
                  <div style={styles.sectionLabel}>
                    {t.undo} ({undoStackLength})
                  </div>
                  {Array.from({ length: undoStackLength }).map((_, i) => {
                    const undoIndex = undoStackLength - 1 - i;
                    const stepNumber = undoStackLength - i - 1;
                    return (
                      <div
                        key={`undo-${i}`}
                        style={{
                          ...styles.item,
                          ...styles.undoItem,
                          ...(hoveredIndex === stepNumber ? styles.itemHover : {}),
                        }}
                        onClick={() => handleUndoClick(undoIndex)}
                        onMouseEnter={() => setHoveredIndex(stepNumber)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        role="listitem"
                      >
                        <div style={styles.itemDot} />
                        <span style={styles.itemLabel}>
                          {t.step} {stepNumber}
                        </span>
                        <span style={styles.itemHint}>{t.clickToJump}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* 하단 정보 */}
        <div style={styles.footer}>
          {lang === 'ko' ? (
            <>Ctrl+Z: 실행 취소 | Ctrl+Y: 다시 실행</>
          ) : (
            <>Ctrl+Z: Undo | Ctrl+Y: Redo</>
          )}
        </div>
      </div>
    </div>
  );
}
