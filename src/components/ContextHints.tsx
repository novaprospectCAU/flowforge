import { useMemo } from 'react';
import { useLanguage } from '../i18n';
import { contextHintsTranslations } from '../i18n/translations';

interface ContextHintsProps {
  nodeCount: number;
  selectedCount: number;
  hasSubflows: boolean;
  hasTemplates: boolean;
}

interface Hint {
  text: string;
  shortcut?: string;
}

export function ContextHints({
  nodeCount,
  selectedCount,
  hasSubflows,
  hasTemplates,
}: ContextHintsProps) {
  const lang = useLanguage();
  const t = contextHintsTranslations[lang];

  const hints = useMemo(() => {
    const result: Hint[] = [];

    // Empty canvas
    if (nodeCount === 0) {
      result.push(...t.emptyCanvas);
      if (hasTemplates) {
        result.push(...t.emptyCanvasWithTemplates);
      }
      result.push(t.showShortcuts);
      return result;
    }

    // No selection
    if (selectedCount === 0) {
      result.push(...t.noSelection);
      return result;
    }

    // Single selection
    if (selectedCount === 1) {
      result.push(...t.singleSelection);
      return result;
    }

    // Multi selection
    if (selectedCount >= 2) {
      result.push(...t.multiSelection);
      return result;
    }

    return result;
  }, [nodeCount, selectedCount, hasSubflows, hasTemplates, t]);

  if (hints.length === 0) return null;

  return (
    <div style={styles.container}>
      {hints.map((hint, i) => (
        <div key={i} style={styles.hint}>
          {hint.shortcut && <kbd style={styles.shortcut}>{hint.shortcut}</kbd>}
          <span style={styles.text}>{hint.text}</span>
        </div>
      ))}
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
    gap: 16,
    padding: '8px 16px',
    background: 'rgba(30, 30, 32, 0.9)',
    borderRadius: 8,
    border: '1px solid #3c3c3c',
    zIndex: 50,
  },
  hint: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  shortcut: {
    padding: '2px 6px',
    background: '#3c3c3c',
    border: '1px solid #4a4a4a',
    borderRadius: 3,
    color: '#a0a0a0',
    fontSize: 10,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  text: {
    color: '#808080',
    fontSize: 11,
  },
};
