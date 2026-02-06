import { useState } from 'react';
import { useLanguage, setLanguage } from '../i18n';
import { uiTranslations } from '../i18n/translations';

interface MobileToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onRun: () => void;
  isRunning: boolean;
  onHelp: () => void;
  onAPIKeys: () => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  snapToGrid: boolean;
  onToggleSnap: () => void;
}

export function MobileToolbar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onRun,
  isRunning,
  onHelp,
  onAPIKeys,
  saveStatus,
  snapToGrid,
  onToggleSnap,
}: MobileToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const lang = useLanguage();
  const t = uiTranslations[lang];

  return (
    <>
      {/* 상단 간소화 툴바 */}
      <div style={styles.topBar}>
        {/* 왼쪽: 메뉴 버튼 */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={styles.menuBtn}
        >
          ☰
        </button>

        {/* 중앙: 저장 상태 */}
        <div style={{
          ...styles.saveIndicator,
          color: saveStatus === 'saved' ? '#68d391' : saveStatus === 'saving' ? '#f6e05e' : '#a0aec0',
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: saveStatus === 'saved' ? '#68d391' : saveStatus === 'saving' ? '#f6e05e' : '#a0aec0',
          }} />
        </div>

        {/* 오른쪽: Undo/Redo */}
        <div style={styles.undoRedo}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            style={{
              ...styles.iconBtn,
              opacity: canUndo ? 1 : 0.4,
            }}
          >
            ↶
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            style={{
              ...styles.iconBtn,
              opacity: canRedo ? 1 : 0.4,
            }}
          >
            ↷
          </button>
        </div>
      </div>

      {/* 플로팅 실행 버튼 */}
      <button
        onClick={onRun}
        disabled={isRunning}
        style={{
          ...styles.fab,
          background: isRunning ? '#4a5568' : '#3182ce',
        }}
      >
        {isRunning ? '...' : '▶'}
      </button>

      {/* 드롭다운 메뉴 */}
      {menuOpen && (
        <>
          <div style={styles.menuOverlay} onClick={() => setMenuOpen(false)} />
          <div style={styles.menu}>
            <button
              onClick={() => { onToggleSnap(); setMenuOpen(false); }}
              style={styles.menuItem}
            >
              <span>Grid Snap</span>
              <span style={{ color: snapToGrid ? '#68d391' : '#a0aec0' }}>
                {snapToGrid ? 'ON' : 'OFF'}
              </span>
            </button>
            <div style={styles.menuDivider} />
            <button
              onClick={() => { setLanguage(lang === 'en' ? 'ko' : 'en'); setMenuOpen(false); }}
              style={styles.menuItem}
            >
              <span>{t.language}</span>
              <span>{lang === 'en' ? '한국어' : 'English'}</span>
            </button>
            <div style={styles.menuDivider} />
            <button
              onClick={() => { onAPIKeys(); setMenuOpen(false); }}
              style={styles.menuItem}
            >
              <span>API Keys</span>
              <span>🔑</span>
            </button>
            <div style={styles.menuDivider} />
            <button
              onClick={() => { onHelp(); setMenuOpen(false); }}
              style={styles.menuItem}
            >
              <span>{t.help}</span>
              <span>?</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    background: 'rgba(30, 30, 32, 0.95)',
    borderBottom: '1px solid #3c3c3c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px',
    zIndex: 100,
  },
  menuBtn: {
    width: 40,
    height: 40,
    background: 'transparent',
    border: 'none',
    color: '#a0aec0',
    fontSize: 20,
    cursor: 'pointer',
    borderRadius: 8,
  },
  saveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
  },
  undoRedo: {
    display: 'flex',
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    background: 'transparent',
    border: 'none',
    color: '#a0aec0',
    fontSize: 18,
    cursor: 'pointer',
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    background: '#3182ce',
    border: 'none',
    color: '#fff',
    fontSize: 24,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  menuOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.3)',
    zIndex: 150,
  },
  menu: {
    position: 'absolute',
    top: 56,
    left: 8,
    width: 200,
    background: '#252526',
    border: '1px solid #3c3c3c',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    zIndex: 200,
    overflow: 'hidden',
  },
  menuItem: {
    width: '100%',
    padding: '14px 16px',
    background: 'transparent',
    border: 'none',
    color: '#e0e0e0',
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'left',
  },
  menuDivider: {
    height: 1,
    background: '#3c3c3c',
  },
};
