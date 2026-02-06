import { useLanguage, setLanguage, type Language } from '../i18n';
import { useTheme } from '../hooks/useTheme';

export function LanguageSwitcher() {
  const lang = useLanguage();
  const { colors } = useTheme();

  const handleChange = (newLang: Language) => {
    setLanguage(newLang);
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      border: `1px solid ${colors.border}`,
      borderRadius: 4,
      overflow: 'hidden',
    },
    btn: {
      padding: '8px 10px',
      background: colors.bgTertiary,
      color: colors.textMuted,
      border: 'none',
      fontSize: 11,
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.15s',
    },
    active: {
      background: colors.bgHover,
      color: colors.textPrimary,
    },
  };

  return (
    <div style={styles.container} role="group" aria-label="Language selection">
      <button
        onClick={() => handleChange('en')}
        style={{
          ...styles.btn,
          ...(lang === 'en' ? styles.active : {}),
        }}
        title="English"
        aria-pressed={lang === 'en'}
      >
        EN
      </button>
      <button
        onClick={() => handleChange('ko')}
        style={{
          ...styles.btn,
          ...(lang === 'ko' ? styles.active : {}),
        }}
        title="한국어"
        aria-pressed={lang === 'ko'}
      >
        한
      </button>
    </div>
  );
}
