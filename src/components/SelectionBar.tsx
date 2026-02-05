import { useLanguage } from '../i18n';
import { uiTranslations } from '../i18n/translations';

interface SelectionBarProps {
  selectedCount: number;
  hasGroup: boolean; // 선택된 노드 중 그룹에 속한 노드가 있는지
  onDelete: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onDuplicate: () => void;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onDistributeH: () => void;
  onDistributeV: () => void;
  onAutoArrange: () => void;
  onDeselect: () => void;
}

export function SelectionBar({
  selectedCount,
  hasGroup,
  onDelete,
  onGroup,
  onUngroup,
  onDuplicate,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onDistributeH,
  onDistributeV,
  onAutoArrange,
  onDeselect,
}: SelectionBarProps) {
  const lang = useLanguage();
  const t = uiTranslations[lang];

  if (selectedCount < 2) return null;

  return (
    <div style={styles.container}>
      <div style={styles.info}>
        <span style={styles.count}>{selectedCount}</span>
        <span style={styles.label}>
          {lang === 'en' ? 'nodes selected' : '개 노드 선택됨'}
        </span>
      </div>

      <div style={styles.divider} />

      {/* 정렬 버튼 */}
      <div style={styles.group}>
        <span style={styles.groupLabel}>{lang === 'en' ? 'Align' : '정렬'}</span>
        <button onClick={onAlignLeft} style={styles.button} title={`${t.alignLeft} (Alt+←)`}>
          ⫷
        </button>
        <button onClick={onAlignCenter} style={styles.button} title={t.alignCenter}>
          ⫿
        </button>
        <button onClick={onAlignRight} style={styles.button} title={`${t.alignRight} (Alt+→)`}>
          ⫸
        </button>
      </div>

      {selectedCount >= 3 && (
        <>
          <div style={styles.divider} />
          <div style={styles.group}>
            <span style={styles.groupLabel}>{lang === 'en' ? 'Distribute' : '분배'}</span>
            <button onClick={onDistributeH} style={styles.button} title={`${t.distributeH} (Ctrl+Shift+H)`}>
              ⋯
            </button>
            <button onClick={onDistributeV} style={styles.button} title={`${t.distributeV} (Ctrl+Shift+V)`}>
              ⋮
            </button>
          </div>
        </>
      )}

      <div style={styles.divider} />

      {/* 자동 배치 */}
      <div style={styles.group}>
        <button onClick={onAutoArrange} style={styles.actionButton} title={lang === 'en' ? 'Auto Arrange' : '자동 배치'}>
          {lang === 'en' ? 'Arrange' : '배치'}
        </button>
      </div>

      <div style={styles.divider} />

      {/* 액션 버튼 */}
      <div style={styles.group}>
        {hasGroup ? (
          <button onClick={onUngroup} style={styles.actionButton} title={lang === 'en' ? 'Ungroup (Ctrl+Shift+U)' : '그룹 해제 (Ctrl+Shift+U)'}>
            {lang === 'en' ? 'Ungroup' : '그룹 해제'}
          </button>
        ) : (
          <button onClick={onGroup} style={styles.actionButton} title={`${t.group} (Ctrl+G)`}>
            {t.group}
          </button>
        )}
        <button onClick={onDuplicate} style={styles.actionButton} title={`${t.duplicate} (Ctrl+D)`}>
          {t.duplicate}
        </button>
        <button onClick={onDelete} style={{ ...styles.actionButton, ...styles.deleteButton }} title={`${t.delete} (Del)`}>
          {t.delete}
        </button>
      </div>

      <div style={styles.spacer} />

      <button onClick={onDeselect} style={styles.closeButton} title={lang === 'en' ? 'Deselect (Esc)' : '선택 해제 (Esc)'}>
        ×
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#252526',
    border: '1px solid #3c3c3c',
    borderRadius: 8,
    padding: '8px 12px',
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  info: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  count: {
    background: '#0078d4',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  label: {
    color: '#a0a0a0',
    fontSize: 12,
  },
  divider: {
    width: 1,
    height: 24,
    background: '#3c3c3c',
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  groupLabel: {
    color: '#808080',
    fontSize: 10,
    textTransform: 'uppercase',
    marginRight: 4,
  },
  button: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 4,
    color: '#cccccc',
    fontSize: 14,
    cursor: 'pointer',
  },
  actionButton: {
    padding: '6px 12px',
    background: '#3c3c3c',
    border: '1px solid #4a4a4a',
    borderRadius: 4,
    color: '#cccccc',
    fontSize: 11,
    cursor: 'pointer',
  },
  deleteButton: {
    background: '#5a2d2d',
    borderColor: '#7a3d3d',
    color: '#ff6b6b',
  },
  spacer: {
    flex: 1,
    minWidth: 8,
  },
  closeButton: {
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: 4,
    color: '#808080',
    fontSize: 16,
    cursor: 'pointer',
  },
};
