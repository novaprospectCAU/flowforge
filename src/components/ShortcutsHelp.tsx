interface ShortcutsHelpProps {
  onClose: () => void;
}

interface ShortcutItem {
  keys: string;
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutItem[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: 'Ctrl+Z', description: 'Undo' },
      { keys: 'Ctrl+Y', description: 'Redo' },
      { keys: 'Ctrl+A', description: 'Select all nodes' },
      { keys: 'Escape', description: 'Deselect / Close menus' },
      { keys: 'Delete', description: 'Delete selected nodes' },
      { keys: '?', description: 'Show this help' },
    ],
  },
  {
    title: 'Clipboard',
    shortcuts: [
      { keys: 'Ctrl+C', description: 'Copy selected nodes' },
      { keys: 'Ctrl+V', description: 'Paste nodes' },
      { keys: 'Ctrl+D', description: 'Duplicate selected nodes' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: 'Ctrl+F', description: 'Search nodes' },
      { keys: 'F', description: 'Fit view to all nodes' },
      { keys: 'Ctrl+0', description: 'Reset zoom to 100%' },
      { keys: 'Scroll', description: 'Zoom in/out' },
      { keys: 'Middle Drag', description: 'Pan canvas' },
      { keys: 'Alt+Drag', description: 'Pan canvas' },
    ],
  },
  {
    title: 'Nodes',
    shortcuts: [
      { keys: 'Tab', description: 'Open node palette' },
      { keys: 'Arrow Keys', description: 'Move selected nodes (grid)' },
      { keys: 'Shift+Arrows', description: 'Move nodes by 1px' },
      { keys: 'G', description: 'Toggle snap to grid' },
    ],
  },
  {
    title: 'Alignment',
    shortcuts: [
      { keys: 'Alt+←/→', description: 'Align left/right' },
      { keys: 'Alt+↑/↓', description: 'Align top/bottom' },
      { keys: 'Ctrl+Shift+H', description: 'Distribute horizontal' },
      { keys: 'Ctrl+Shift+V', description: 'Distribute vertical' },
    ],
  },
  {
    title: 'Selection',
    shortcuts: [
      { keys: 'Click', description: 'Select node' },
      { keys: 'Shift+Click', description: 'Add to selection' },
      { keys: 'Drag (empty)', description: 'Box select' },
      { keys: 'Shift+Box', description: 'Add to selection' },
    ],
  },
  {
    title: 'Grouping',
    shortcuts: [
      { keys: 'Ctrl+G', description: 'Group selected nodes' },
      { keys: 'Ctrl+Shift+G', description: 'Ungroup' },
      { keys: 'Group header', description: 'Click to select all' },
    ],
  },
];

export function ShortcutsHelp({ onClose }: ShortcutsHelpProps) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Keyboard Shortcuts</h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>
        <div style={styles.content}>
          {SHORTCUT_GROUPS.map(group => (
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
          Press <kbd style={styles.footerKey}>Escape</kbd> or <kbd style={styles.footerKey}>?</kbd> to close
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
    width: 600,
    maxHeight: '80vh',
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
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
  },
  group: {
    background: '#2d2d2d',
    borderRadius: 8,
    padding: 12,
  },
  groupTitle: {
    margin: '0 0 10px 0',
    fontSize: 12,
    fontWeight: 600,
    color: '#808080',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shortcuts: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  shortcut: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  keys: {
    minWidth: 90,
    padding: '4px 8px',
    background: '#3c3c3c',
    border: '1px solid #4a4a4a',
    borderRadius: 4,
    color: '#cccccc',
    fontSize: 11,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    textAlign: 'center',
  },
  desc: {
    color: '#a0a0a0',
    fontSize: 12,
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
