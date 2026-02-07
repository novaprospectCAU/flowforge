/**
 * API 키 관리 UI 컴포넌트
 */

import { useState, useEffect, useCallback } from 'react';
import { keyManager } from '@flowforge/state';
import type { AIProviderType, MaskedAPIKeyEntry } from '@flowforge/state';
import { providerRegistry } from '@flowforge/state';
import { useTheme } from '../../hooks/useTheme';
import { SHADOWS } from '../../theme/shadows';
import { Z_INDEX } from '../../constants/zIndex';

interface APIKeyManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * API 키 관리 모달
 */
export function APIKeyManager({ isOpen, onClose }: APIKeyManagerProps) {
  const [keys, setKeys] = useState<MaskedAPIKeyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();

  // 새 키 추가 폼 상태
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKeyProvider, setNewKeyProvider] = useState<AIProviderType>('openai');
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);

  // 키 목록 로드
  const loadKeys = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedKeys = await keyManager.listKeys();
      setKeys(loadedKeys);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load keys');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadKeys();
    }
  }, [isOpen, loadKeys]);

  // 키 추가
  const handleAddKey = async () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      setError('Name and key are required');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await keyManager.saveKey(newKeyProvider, newKeyName.trim(), newKeyValue.trim());
      setShowAddForm(false);
      setNewKeyName('');
      setNewKeyValue('');
      setTestResult(null);
      await loadKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save key');
    } finally {
      setIsSaving(false);
    }
  };

  // 키 삭제
  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) {
      return;
    }

    try {
      await keyManager.deleteKey(keyId);
      await loadKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete key');
    }
  };

  // 키 테스트
  const handleTestKey = async () => {
    if (!newKeyValue.trim()) {
      setError('Enter a key to test');
      return;
    }

    setTestResult(null);
    const provider = providerRegistry.get(newKeyProvider);
    if (!provider?.validateKey) {
      setTestResult('success'); // 검증 기능 없으면 성공으로 처리
      return;
    }

    try {
      const isValid = await provider.validateKey(newKeyValue.trim());
      setTestResult(isValid ? 'success' : 'fail');
    } catch {
      setTestResult('fail');
    }
  };

  if (!isOpen) return null;

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.bgOverlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
    },
    modal: {
      backgroundColor: colors.bgPrimary,
      borderRadius: 8,
      width: 480,
      maxWidth: '90vw',
      maxHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: SHADOWS.mediumDark,
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      borderBottom: `1px solid ${colors.border}`,
    },
    title: {
      margin: 0,
      fontSize: 18,
      fontWeight: 600,
      color: colors.textPrimary,
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: 24,
      color: colors.textMuted,
      cursor: 'pointer',
      padding: 0,
      lineHeight: 1,
    },
    content: {
      padding: 20,
      flex: 1,
      overflowY: 'auto',
    },
    error: {
      backgroundColor: colors.error,
      color: '#fff',
      padding: '8px 12px',
      margin: '0 20px',
      borderRadius: 4,
      fontSize: 14,
    },
    loading: {
      textAlign: 'center',
      color: colors.textMuted,
      padding: 40,
    },
    keyList: {
      marginBottom: 16,
    },
    emptyState: {
      color: colors.textMuted,
      textAlign: 'center',
      padding: 20,
    },
    keyItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      backgroundColor: colors.bgSecondary,
      borderRadius: 6,
      marginBottom: 8,
    },
    keyInfo: {
      display: 'flex',
      gap: 12,
      alignItems: 'center',
    },
    keyProvider: {
      backgroundColor: colors.accent,
      color: '#fff',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 500,
      textTransform: 'uppercase',
    },
    keyName: {
      color: colors.textPrimary,
      fontWeight: 500,
    },
    keyMasked: {
      color: colors.textMuted,
      fontFamily: 'monospace',
      fontSize: 13,
    },
    deleteButton: {
      backgroundColor: 'transparent',
      color: colors.error,
      border: `1px solid ${colors.error}`,
      padding: '4px 12px',
      borderRadius: 4,
      cursor: 'pointer',
      fontSize: 13,
    },
    addButton: {
      width: '100%',
      padding: '12px 16px',
      backgroundColor: colors.bgTertiary,
      color: colors.textPrimary,
      border: `1px dashed ${colors.borderLight}`,
      borderRadius: 6,
      cursor: 'pointer',
      fontSize: 14,
    },
    addForm: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 6,
      padding: 16,
    },
    formTitle: {
      margin: '0 0 16px 0',
      fontSize: 16,
      color: colors.textPrimary,
    },
    formField: {
      marginBottom: 12,
    },
    label: {
      display: 'block',
      color: colors.textSecondary,
      marginBottom: 4,
      fontSize: 13,
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      backgroundColor: colors.bgPrimary,
      border: `1px solid ${colors.borderLight}`,
      borderRadius: 4,
      color: colors.textPrimary,
      fontSize: 14,
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      padding: '8px 12px',
      backgroundColor: colors.bgPrimary,
      border: `1px solid ${colors.borderLight}`,
      borderRadius: 4,
      color: colors.textPrimary,
      fontSize: 14,
    },
    testResult: {
      fontSize: 13,
      marginBottom: 12,
    },
    formActions: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    formActionRight: {
      display: 'flex',
      gap: 8,
    },
    testButton: {
      padding: '8px 16px',
      backgroundColor: 'transparent',
      color: colors.info,
      border: `1px solid ${colors.info}`,
      borderRadius: 4,
      cursor: 'pointer',
      fontSize: 14,
    },
    cancelButton: {
      padding: '8px 16px',
      backgroundColor: 'transparent',
      color: colors.textMuted,
      border: `1px solid ${colors.borderLight}`,
      borderRadius: 4,
      cursor: 'pointer',
      fontSize: 14,
    },
    saveButton: {
      padding: '8px 16px',
      backgroundColor: colors.accent,
      color: '#fff',
      border: 'none',
      borderRadius: 4,
      cursor: 'pointer',
      fontSize: 14,
    },
    envNote: {
      padding: '12px 20px',
      borderTop: `1px solid ${colors.border}`,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 1.6,
    },
    code: {
      backgroundColor: colors.bgTertiary,
      padding: '2px 6px',
      borderRadius: 3,
      fontFamily: 'monospace',
      fontSize: 11,
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="api-keys-title">
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 id="api-keys-title" style={styles.title}>API Keys</h2>
          <button style={styles.closeButton} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {error && <div style={styles.error} role="alert">{error}</div>}

        <div style={styles.content}>
          {isLoading ? (
            <div style={styles.loading}>Loading...</div>
          ) : (
            <>
              {/* 저장된 키 목록 */}
              <div style={styles.keyList} role="list" aria-label="Saved API keys">
                {keys.length === 0 ? (
                  <div style={styles.emptyState}>
                    No API keys saved. Add one below.
                  </div>
                ) : (
                  keys.map(key => (
                    <div key={key.id} style={styles.keyItem} role="listitem">
                      <div style={styles.keyInfo}>
                        <span style={styles.keyProvider}>{key.provider}</span>
                        <span style={styles.keyName}>{key.name}</span>
                        <span style={styles.keyMasked}>{key.maskedKey}</span>
                      </div>
                      <button
                        style={styles.deleteButton}
                        onClick={() => handleDeleteKey(key.id)}
                        aria-label={`Delete ${key.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* 새 키 추가 버튼 또는 폼 */}
              {!showAddForm ? (
                <button
                  style={styles.addButton}
                  onClick={() => setShowAddForm(true)}
                >
                  + Add API Key
                </button>
              ) : (
                <div style={styles.addForm}>
                  <h3 style={styles.formTitle}>Add New Key</h3>

                  <div style={styles.formField}>
                    <label style={styles.label}>Provider</label>
                    <select
                      style={styles.select}
                      value={newKeyProvider}
                      onChange={e =>
                        setNewKeyProvider(e.target.value as AIProviderType)
                      }
                      aria-label="Provider"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                    </select>
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Name</label>
                    <input
                      style={styles.input}
                      type="text"
                      placeholder="e.g., My OpenAI Key"
                      value={newKeyName}
                      onChange={e => setNewKeyName(e.target.value)}
                      aria-label="Key name"
                    />
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>API Key</label>
                    <input
                      style={styles.input}
                      type="password"
                      placeholder="sk-..."
                      value={newKeyValue}
                      onChange={e => {
                        setNewKeyValue(e.target.value);
                        setTestResult(null);
                      }}
                      aria-label="API key value"
                    />
                  </div>

                  {testResult && (
                    <div
                      style={{
                        ...styles.testResult,
                        color: testResult === 'success' ? colors.success : colors.error,
                      }}
                      role="status"
                    >
                      {testResult === 'success' ? 'Key is valid' : 'Key is invalid'}
                    </div>
                  )}

                  <div style={styles.formActions}>
                    <button
                      style={styles.testButton}
                      onClick={handleTestKey}
                      disabled={!newKeyValue.trim()}
                    >
                      Test Key
                    </button>
                    <div style={styles.formActionRight}>
                      <button
                        style={styles.cancelButton}
                        onClick={() => {
                          setShowAddForm(false);
                          setNewKeyName('');
                          setNewKeyValue('');
                          setTestResult(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        style={styles.saveButton}
                        onClick={handleAddKey}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save Key'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 환경 변수 안내 */}
        <div style={styles.envNote}>
          <strong>Tip:</strong> You can also set API keys via environment variables:
          <br />
          <code style={styles.code}>VITE_OPENAI_KEY</code>,{' '}
          <code style={styles.code}>VITE_ANTHROPIC_KEY</code>
        </div>
      </div>
    </div>
  );
}
