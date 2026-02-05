import { useLanguage } from '../i18n';
import { shortcutsTranslations } from '../i18n/translations';

interface ShortcutsHelpProps {
  onClose: () => void;
}

export function ShortcutsHelp({ onClose }: ShortcutsHelpProps) {
  const lang = useLanguage();
  const t = shortcutsTranslations[lang];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>{t.title}</h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
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

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    width: 720,
    maxHeight: '85vh',
    background: '#252526',
    border: '1px solid #3c3c3c',
    borderRadius: 12,
    boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #3c3c3c',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: '#ffffff',
  },
  closeBtn: {
    width: 32,
    height: 32,
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    color: '#808080',
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
    background: '#2d2d2d',
    borderRadius: 8,
    padding: 12,
  },
  groupTitle: {
    margin: '0 0 10px 0',
    fontSize: 11,
    fontWeight: 600,
    color: '#808080',
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
    background: '#3c3c3c',
    border: '1px solid #4a4a4a',
    borderRadius: 4,
    color: '#cccccc',
    fontSize: 10,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    textAlign: 'center',
  },
  desc: {
    color: '#a0a0a0',
    fontSize: 11,
  },
  footer: {
    padding: '12px 20px',
    borderTop: '1px solid #3c3c3c',
    textAlign: 'center',
    color: '#606060',
    fontSize: 12,
  },
  footerKey: {
    padding: '2px 6px',
    background: '#3c3c3c',
    border: '1px solid #4a4a4a',
    borderRadius: 3,
    color: '#a0a0a0',
    fontSize: 11,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
};
