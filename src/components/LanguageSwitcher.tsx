import { useLanguage, setLanguage, type Language } from '../i18n';

export function LanguageSwitcher() {
  const lang = useLanguage();

  const handleChange = (newLang: Language) => {
    setLanguage(newLang);
  };

  return (
    <div style={styles.container}>
      <button
        onClick={() => handleChange('en')}
        style={{
          ...styles.btn,
          ...(lang === 'en' ? styles.active : {}),
        }}
        title="English"
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
      >
        한
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    border: '1px solid #4a5568',
    borderRadius: 4,
    overflow: 'hidden',
  },
  btn: {
    padding: '8px 10px',
    background: '#2d3748',
    color: '#a0aec0',
    border: 'none',
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  active: {
    background: '#4a5568',
    color: '#ffffff',
  },
};
