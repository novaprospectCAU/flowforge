import { useLanguage } from '../i18n';
import { shortcutsTranslations } from '../i18n/translations';
import { useTheme } from '../hooks/useTheme';
import { SHADOWS } from '../theme/shadows';
import { IconClose } from './Icons';

interface ShortcutsHelpProps {
  onClose: () => void;
}

export function ShortcutsHelp({ onClose }: ShortcutsHelpProps) {
  const lang = useLanguage();
  const t = shortcutsTranslations[lang];
  const { colors } = useTheme();

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
    dialog: {
      width: 720,
      maxHeight: '85vh',
      background: colors.bgSecondary,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      boxShadow: SHADOWS.xlarge,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      padding: '16px 20px',
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      margin: 0,
      fontSize: 18,
      fontWeight: 600,
      color: colors.textPrimary,
    },
    closeBtn: {
      width: 32,
      height: 32,
      background: 'transparent',
      border: 'none',
      borderRadius: 6,
      color: colors.textMuted,
      fontSize: 24,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      overflowY: 'auto',
      padding: '8px 20px 20px',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 12,
    },
    group: {
      background: colors.bgTertiary,
      borderRadius: 8,
      padding: 12,
    },
    groupTitle: {
      margin: '0 0 10px 0',
      fontSize: 11,
      fontWeight: 600,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    shortcuts: {
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
    },
    shortcut: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    keys: {
      minWidth: 80,
      padding: '3px 6px',
      background: colors.bgHover,
      border: `1px solid ${colors.borderLight}`,
      borderRadius: 4,
      color: colors.textSecondary,
      fontSize: 10,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      textAlign: 'center',
    },
    desc: {
      color: colors.textMuted,
      fontSize: 11,
    },
    footer: {
      padding: '12px 20px',
      borderTop: `1px solid ${colors.border}`,
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 12,
    },
    footerKey: {
      padding: '2px 6px',
      background: colors.bgHover,
      border: `1px solid ${colors.borderLight}`,
      borderRadius: 3,
      color: colors.textMuted,
      fontSize: 11,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
      <div style={styles.dialog} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 id="shortcuts-title" style={styles.title}>{t.title}</h2>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close">{IconClose({ size: 16 })}</button>
        </div>
        <div style={styles.content}>
          {t.groups.map(group => (
            <div key={group.title} style={styles.group}>
              <h3 style={styles.groupTitle}>{group.title}</h3>
              <div style={styles.shortcuts}>
                {group.shortcuts.map((shortcut, i) => (
                  <div key={i} style={styles.shortcut}>
                    <kbd style={styles.keys}>{shortcut.keys}</kbd>
                    <span style={styles.desc}>{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={styles.footer}>
          {lang === 'en' ? (
            <>Press <kbd style={styles.footerKey}>Escape</kbd> or <kbd style={styles.footerKey}>?</kbd> to close</>
          ) : (
            <><kbd style={styles.footerKey}>Escape</kbd> 또는 <kbd style={styles.footerKey}>?</kbd> 키를 눌러 닫기</>
          )}
        </div>
      </div>
    </div>
  );
}
