import { useState } from 'react';
import { useLanguage, setLanguage } from '../i18n';
import { uiTranslations } from '../i18n/translations';
import { useTheme } from '../hooks/useTheme';

interface MobileToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onRun: () => void;
  isRunning: boolean;
  onHelp: () => void;
  onAPIKeys: () => void;
  onExport: () => void;
  onImport: () => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  snapToGrid: boolean;
  onToggleSnap: () => void;
  onSearch?: () => void;
  onTemplates?: () => void;
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
  onExport,
  onImport,
  saveStatus,
  snapToGrid,
  onToggleSnap,
  onSearch,
  onTemplates,
}: MobileToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const lang = useLanguage();
  const t = uiTranslations[lang];
  const { colors, mode, toggleTheme } = useTheme();

  const styles: Record<string, React.CSSProperties> = {
    topBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 48,
      background: mode === 'dark' ? 'rgba(30, 30, 32, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderBottom: `1px solid ${colors.border}`,
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
      color: colors.textMuted,
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
      color: colors.textMuted,
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
      background: colors.accent,
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
      background: colors.bgOverlay,
      zIndex: 150,
    },
    menu: {
      position: 'absolute',
      top: 56,
      left: 8,
      width: 220,
      background: colors.bgSecondary,
      border: `1px solid ${colors.border}`,
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
      color: colors.textSecondary,
      fontSize: 14,
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      textAlign: 'left',
    },
    menuDivider: {
      height: 1,
      background: colors.border,
    },
    menuSection: {
      padding: '8px 16px 4px',
      fontSize: 10,
      fontWeight: 600,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  };

  const statusColor = saveStatus === 'saved' ? colors.success
    : saveStatus === 'saving' ? colors.warning
    : colors.textMuted;

  return (
    <>
      {/* 상단 간소화 툴바 */}
      <div style={styles.topBar}>
        {/* 왼쪽: 메뉴 버튼 */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={styles.menuBtn}
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          ☰
        </button>

        {/* 중앙: 저장 상태 */}
        <div style={{ ...styles.saveIndicator, color: statusColor }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: statusColor,
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
            aria-label="Undo"
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
            aria-label="Redo"
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
          background: isRunning ? colors.bgHover : colors.accent,
        }}
        aria-label={isRunning ? 'Running...' : 'Run flow'}
      >
        {isRunning ? '...' : '▶'}
      </button>

      {/* 드롭다운 메뉴 */}
      {menuOpen && (
        <>
          <div
            style={styles.menuOverlay}
            onClick={() => setMenuOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && setMenuOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close menu"
          />
          <div style={styles.menu} role="menu">
            {/* 검색 & 템플릿 */}
            {(onSearch || onTemplates) && (
              <>
                <div style={styles.menuSection}>
                  {lang === 'en' ? 'Quick Access' : '빠른 접근'}
                </div>
                {onSearch && (
                  <button
                    onClick={() => { onSearch(); setMenuOpen(false); }}
                    style={styles.menuItem}
                    role="menuitem"
                  >
                    <span>{lang === 'en' ? 'Search Nodes' : '노드 검색'}</span>
                    <span>🔍</span>
                  </button>
                )}
                {onTemplates && (
                  <button
                    onClick={() => { onTemplates(); setMenuOpen(false); }}
                    style={styles.menuItem}
                    role="menuitem"
                  >
                    <span>{lang === 'en' ? 'Templates' : '템플릿'}</span>
                    <span>📋</span>
                  </button>
                )}
                <div style={styles.menuDivider} />
              </>
            )}

            {/* 설정 */}
            <div style={styles.menuSection}>
              {lang === 'en' ? 'Settings' : '설정'}
            </div>
            <button
              onClick={() => { onToggleSnap(); setMenuOpen(false); }}
              style={styles.menuItem}
              role="menuitem"
            >
              <span>Grid Snap</span>
              <span style={{ color: snapToGrid ? colors.success : colors.textMuted }}>
                {snapToGrid ? 'ON' : 'OFF'}
              </span>
            </button>
            <button
              onClick={() => { toggleTheme(); setMenuOpen(false); }}
              style={styles.menuItem}
              role="menuitem"
            >
              <span>{lang === 'en' ? 'Theme' : '테마'}</span>
              <span>{mode === 'dark' ? '☀️' : '🌙'}</span>
            </button>
            <button
              onClick={() => { setLanguage(lang === 'en' ? 'ko' : 'en'); setMenuOpen(false); }}
              style={styles.menuItem}
              role="menuitem"
            >
              <span>{t.language}</span>
              <span>{lang === 'en' ? '한국어' : 'English'}</span>
            </button>
            <div style={styles.menuDivider} />

            {/* API & 데이터 */}
            <div style={styles.menuSection}>
              {lang === 'en' ? 'Data' : '데이터'}
            </div>
            <button
              onClick={() => { onAPIKeys(); setMenuOpen(false); }}
              style={styles.menuItem}
              role="menuitem"
            >
              <span>API Keys</span>
              <span>🔑</span>
            </button>
            <button
              onClick={() => { onExport(); setMenuOpen(false); }}
              style={styles.menuItem}
              role="menuitem"
            >
              <span>{lang === 'en' ? 'Export Flow' : '플로우 내보내기'}</span>
              <span>↓</span>
            </button>
            <button
              onClick={() => { onImport(); setMenuOpen(false); }}
              style={styles.menuItem}
              role="menuitem"
            >
              <span>{lang === 'en' ? 'Import Flow' : '플로우 가져오기'}</span>
              <span>↑</span>
            </button>
            <div style={styles.menuDivider} />

            {/* 도움말 */}
            <button
              onClick={() => { onHelp(); setMenuOpen(false); }}
              style={styles.menuItem}
              role="menuitem"
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
