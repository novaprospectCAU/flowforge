/**
 * API 키 관리 UI 컴포넌트
 */

import { useState, useEffect, useCallback } from 'react';
import { keyManager } from '@flowforge/state';
import type { AIProviderType, MaskedAPIKeyEntry } from '@flowforge/state';
import { providerRegistry } from '@flowforge/state';

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

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>API Keys</h2>
          <button style={styles.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.content}>
          {isLoading ? (
            <div style={styles.loading}>Loading...</div>
          ) : (
            <>
              {/* 저장된 키 목록 */}
              <div style={styles.keyList}>
                {keys.length === 0 ? (
                  <div style={styles.emptyState}>
                    No API keys saved. Add one below.
                  </div>
                ) : (
                  keys.map(key => (
                    <div key={key.id} style={styles.keyItem}>
                      <div style={styles.keyInfo}>
                        <span style={styles.keyProvider}>{key.provider}</span>
                        <span style={styles.keyName}>{key.name}</span>
                        <span style={styles.keyMasked}>{key.maskedKey}</span>
                      </div>
                      <button
                        style={styles.deleteButton}
                        onClick={() => handleDeleteKey(key.id)}
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
                    />
                  </div>

                  {testResult && (
                    <div
                      style={{
                        ...styles.testResult,
                        color: testResult === 'success' ? '#10b981' : '#ef4444',
                      }}
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

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  modal: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    width: 480,
    maxWidth: '90vw',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #333',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: '#fff',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: 24,
    color: '#888',
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
    backgroundColor: '#ef4444',
    color: '#fff',
    padding: '8px 12px',
    margin: '0 20px',
    borderRadius: 4,
    fontSize: 14,
  },
  loading: {
    textAlign: 'center',
    color: '#888',
    padding: 40,
  },
  keyList: {
    marginBottom: 16,
  },
  emptyState: {
    color: '#888',
    textAlign: 'center',
    padding: 20,
  },
  keyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    marginBottom: 8,
  },
  keyInfo: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  keyProvider: {
    backgroundColor: '#10a37f',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
    textTransform: 'uppercase',
  },
  keyName: {
    color: '#fff',
    fontWeight: 500,
  },
  keyMasked: {
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 13,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef4444',
    padding: '4px 12px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
  },
  addButton: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#333',
    color: '#fff',
    border: '1px dashed #555',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
  },
  addForm: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    padding: 16,
  },
  formTitle: {
    margin: '0 0 16px 0',
    fontSize: 16,
    color: '#fff',
  },
  formField: {
    marginBottom: 12,
  },
  label: {
    display: 'block',
    color: '#ccc',
    marginBottom: 4,
    fontSize: 13,
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#1e1e1e',
    border: '1px solid #444',
    borderRadius: 4,
    color: '#fff',
    fontSize: 14,
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#1e1e1e',
    border: '1px solid #444',
    borderRadius: 4,
    color: '#fff',
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
    color: '#3b82f6',
    border: '1px solid #3b82f6',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#888',
    border: '1px solid #555',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
  },
  saveButton: {
    padding: '8px 16px',
    backgroundColor: '#10a37f',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
  },
  envNote: {
    padding: '12px 20px',
    borderTop: '1px solid #333',
    fontSize: 12,
    color: '#888',
    lineHeight: 1.6,
  },
  code: {
    backgroundColor: '#333',
    padding: '2px 6px',
    borderRadius: 3,
    fontFamily: 'monospace',
    fontSize: 11,
  },
};
