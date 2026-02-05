import { useState } from 'react';
import { useLanguage } from '../i18n';
import { onboardingTranslations } from '../i18n/translations';

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

  return (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        {/* Progress dots */}
        <div style={styles.progress}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                ...(i === currentStep ? styles.dotActive : {}),
                ...(i < currentStep ? styles.dotCompleted : {}),
              }}
              onClick={() => setCurrentStep(i)}
            />
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          <div style={styles.icon}>{step.icon}</div>
          <h2 style={styles.title}>{step.title}</h2>
          <p style={styles.description}>{step.description}</p>

          {step.tips && (
            <div style={styles.tips}>
              {step.tips.map((tip, i) => (
                <div key={i} style={styles.tip}>
                  <span style={styles.tipBullet}>•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={handleSkip} style={styles.skipBtn}>
            {t.skipButton}
          </button>
          <div style={styles.navBtns}>
            {currentStep > 0 && (
              <button onClick={handlePrev} style={styles.prevBtn}>
                {t.backButton}
              </button>
            )}
            <button onClick={handleNext} style={styles.nextBtn}>
              {isLastStep ? t.getStartedButton : t.nextButton}
            </button>
          </div>
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
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  dialog: {
    width: 480,
    background: '#252526',
    border: '1px solid #3c3c3c',
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
    background: '#3c3c3c',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  dotActive: {
    background: '#0078d4',
    transform: 'scale(1.25)',
  },
  dotCompleted: {
    background: '#4a9eff',
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
    color: '#ffffff',
  },
  description: {
    margin: '0 0 24px 0',
    fontSize: 14,
    color: '#a0a0a0',
    lineHeight: 1.6,
  },
  tips: {
    textAlign: 'left',
    background: '#2d2d30',
    borderRadius: 8,
    padding: '16px 20px',
  },
  tip: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
    fontSize: 13,
    color: '#cccccc',
  },
  tipBullet: {
    color: '#0078d4',
    fontWeight: 'bold',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderTop: '1px solid #3c3c3c',
    background: '#1e1e1e',
  },
  skipBtn: {
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    color: '#606060',
    fontSize: 13,
    cursor: 'pointer',
  },
  navBtns: {
    display: 'flex',
    gap: 8,
  },
  prevBtn: {
    padding: '10px 20px',
    background: '#3c3c3c',
    border: 'none',
    borderRadius: 6,
    color: '#cccccc',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  nextBtn: {
    padding: '10px 24px',
    background: '#0078d4',
    border: 'none',
    borderRadius: 6,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
};
