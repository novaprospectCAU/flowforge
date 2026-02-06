import { useState } from 'react';
import { useLanguage } from '../i18n';
import { onboardingTranslations } from '../i18n/translations';
import { useTheme } from '../hooks/useTheme';

interface OnboardingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

const ONBOARDING_KEY = 'flowforge-onboarding-completed';

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}

export function OnboardingTutorial({ onComplete, onSkip }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const lang = useLanguage();
  const t = onboardingTranslations[lang];
  const { colors } = useTheme();
  const steps = t.steps;
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      markOnboardingComplete();
      onComplete();
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  const handleSkip = () => {
    markOnboardingComplete();
    onSkip();
  };

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    },
    dialog: {
      width: 480,
      background: colors.bgSecondary,
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      overflow: 'hidden',
    },
    progress: {
      display: 'flex',
      justifyContent: 'center',
      gap: 8,
      padding: '20px 20px 0',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: colors.bgHover,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    dotActive: {
      background: colors.accent,
      transform: 'scale(1.25)',
    },
    dotCompleted: {
      background: colors.accentHover,
    },
    content: {
      padding: '32px 40px',
      textAlign: 'center',
    },
    icon: {
      fontSize: 48,
      marginBottom: 16,
    },
    title: {
      margin: '0 0 12px 0',
      fontSize: 24,
      fontWeight: 600,
      color: colors.textPrimary,
    },
    description: {
      margin: '0 0 24px 0',
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 1.6,
    },
    tips: {
      textAlign: 'left',
      background: colors.bgTertiary,
      borderRadius: 8,
      padding: '16px 20px',
    },
    tip: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 8,
      fontSize: 13,
      color: colors.textSecondary,
    },
    tipBullet: {
      color: colors.accent,
      fontWeight: 'bold',
    },
    footer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 24px',
      borderTop: `1px solid ${colors.border}`,
      background: colors.bgPrimary,
    },
    skipBtn: {
      padding: '8px 16px',
      background: 'transparent',
      border: 'none',
      borderRadius: 6,
      color: colors.textMuted,
      fontSize: 13,
      cursor: 'pointer',
    },
    navBtns: {
      display: 'flex',
      gap: 8,
    },
    prevBtn: {
      padding: '10px 20px',
      background: colors.bgHover,
      border: 'none',
      borderRadius: 6,
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
    },
    nextBtn: {
      padding: '10px 24px',
      background: colors.accent,
      border: 'none',
      borderRadius: 6,
      color: '#ffffff',
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
    },
  };

  return (
    <div style={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div style={styles.dialog}>
        {/* Progress dots */}
        <div style={styles.progress} role="tablist" aria-label="Tutorial progress">
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                ...(i === currentStep ? styles.dotActive : {}),
                ...(i < currentStep ? styles.dotCompleted : {}),
              }}
              onClick={() => setCurrentStep(i)}
              role="tab"
              aria-selected={i === currentStep}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          <div style={styles.icon} aria-hidden="true">{step.icon}</div>
          <h2 id="onboarding-title" style={styles.title}>{step.title}</h2>
          <p style={styles.description}>{step.description}</p>

          {step.tips && (
            <div style={styles.tips}>
              {step.tips.map((tip, i) => (
                <div key={i} style={styles.tip}>
                  <span style={styles.tipBullet} aria-hidden="true">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={handleSkip} style={styles.skipBtn} aria-label={t.skipButton}>
            {t.skipButton}
          </button>
          <div style={styles.navBtns}>
            {currentStep > 0 && (
              <button onClick={handlePrev} style={styles.prevBtn} aria-label={t.backButton}>
                {t.backButton}
              </button>
            )}
            <button onClick={handleNext} style={styles.nextBtn} aria-label={isLastStep ? t.getStartedButton : t.nextButton}>
              {isLastStep ? t.getStartedButton : t.nextButton}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
