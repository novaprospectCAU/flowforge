/**
 * PackBrowser — 팩 브라우저/마켓 UI
 * Ctrl+Shift+P로 토글
 */

import { useState, useEffect, useCallback } from 'react';
import { packRegistry, type PackManifest, type PackState } from '@flowforge/state';
import { useTheme } from '../../hooks/useTheme';
import { SHADOWS } from '../../theme/shadows';
import { Z_INDEX } from '../../constants/zIndex';

interface PackBrowserProps {
  onClose: () => void;
}

type TabId = 'all' | 'builtin' | 'custom' | 'installed';

export function PackBrowser({ onClose }: PackBrowserProps) {
  const { colors } = useTheme();
  const [tab, setTab] = useState<TabId>('all');
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [, setVersion] = useState(0); // 리렌더 트리거
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = packRegistry.subscribe(() => setVersion(v => v + 1));
    return unsub;
  }, []);

  const allPacks = packRegistry.getAllPacks();

  const filteredPacks = allPacks.filter(p => {
    switch (tab) {
      case 'builtin': return p.manifest.kind === 'builtin';
      case 'custom': return p.manifest.kind === 'custom';
      case 'installed': return p.state.enabled;
      default: return true;
    }
  });

  const handleToggle = useCallback((packId: string) => {
    if (packRegistry.isEnabled(packId)) {
      packRegistry.disablePack(packId);
    } else {
      packRegistry.enablePack(packId);
    }
  }, []);

  const handleExport = useCallback((packId: string) => {
    const data = packRegistry.exportPack(packId);
    if (data) {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${packId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Pack exported!');
      setTimeout(() => setMessage(null), 2000);
    }
  }, []);

  const handleImport = useCallback(() => {
    setImportError(null);
    const preview = packRegistry.previewImport(importJson);
    if (!preview) {
      setImportError('Invalid pack JSON. Must be a custom pack with valid manifest.');
      return;
    }
    packRegistry.installCustomPack(preview);
    setImportJson('');
    setMessage(`Pack "${preview.manifest.name}" imported!`);
    setTimeout(() => setMessage(null), 2000);
  }, [importJson]);

  const handleUninstall = useCallback((packId: string) => {
    packRegistry.uninstallPack(packId);
    if (selectedPackId === packId) setSelectedPackId(null);
  }, [selectedPackId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  const selectedPack = selectedPackId
    ? allPacks.find(p => p.manifest.id === selectedPackId)
    : null;

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: Z_INDEX.MODAL,
    },
    dialog: {
      width: 680,
      maxHeight: '85vh',
      background: colors.bgSecondary,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      boxShadow: SHADOWS.mediumDark,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      borderBottom: `1px solid ${colors.border}`,
    },
    title: {
      fontSize: 18,
      fontWeight: 600,
      color: colors.textPrimary,
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      color: colors.textMuted,
      fontSize: 20,
      cursor: 'pointer',
      padding: '4px 8px',
    },
    tabs: {
      display: 'flex',
      gap: 0,
      borderBottom: `1px solid ${colors.border}`,
    },
    tab: {
      padding: '10px 20px',
      fontSize: 13,
      color: colors.textMuted,
      background: 'none',
      border: 'none',
      borderBottom: '2px solid transparent',
      cursor: 'pointer',
    },
    tabActive: {
      color: colors.accent,
      borderBottomColor: colors.accent,
    },
    body: {
      display: 'flex',
      flex: 1,
      overflow: 'hidden',
    },
    list: {
      flex: 1,
      overflowY: 'auto',
      padding: 12,
    },
    card: {
      padding: 12,
      marginBottom: 8,
      background: colors.bgTertiary,
      border: `1px solid ${colors.borderLight}`,
      borderRadius: 8,
      cursor: 'pointer',
      transition: 'border-color 0.15s',
    },
    cardSelected: {
      borderColor: colors.accent,
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    cardName: {
      fontSize: 14,
      fontWeight: 600,
      color: colors.textPrimary,
    },
    cardIcon: {
      width: 28,
      height: 28,
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 12,
      fontWeight: 700,
      color: '#fff',
    },
    cardDesc: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 8,
    },
    cardMeta: {
      display: 'flex',
      gap: 12,
      alignItems: 'center',
    },
    badge: {
      fontSize: 10,
      padding: '2px 6px',
      borderRadius: 4,
      background: colors.bgHover,
      color: colors.textMuted,
    },
    toggle: {
      padding: '4px 10px',
      borderRadius: 4,
      border: 'none',
      fontSize: 11,
      cursor: 'pointer',
      fontWeight: 500,
    },
    toggleEnabled: {
      background: colors.success + '22',
      color: colors.success,
    },
    toggleDisabled: {
      background: colors.bgHover,
      color: colors.textMuted,
    },
    detail: {
      width: 280,
      borderLeft: `1px solid ${colors.border}`,
      overflowY: 'auto',
      padding: 16,
    },
    detailTitle: {
      fontSize: 16,
      fontWeight: 600,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    detailDesc: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 16,
    },
    detailSection: {
      marginBottom: 16,
    },
    detailLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    nodeItem: {
      padding: '6px 8px',
      marginBottom: 4,
      background: colors.bgHover,
      borderRadius: 4,
      fontSize: 12,
      color: colors.textSecondary,
    },
    importSection: {
      padding: '12px 16px',
      borderTop: `1px solid ${colors.border}`,
    },
    importRow: {
      display: 'flex',
      gap: 8,
    },
    importInput: {
      flex: 1,
      padding: '8px 12px',
      background: colors.bgHover,
      border: `1px solid ${colors.borderLight}`,
      borderRadius: 6,
      color: colors.textSecondary,
      fontSize: 12,
      outline: 'none',
    },
    importBtn: {
      padding: '8px 16px',
      background: colors.accent,
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      fontSize: 12,
      cursor: 'pointer',
    },
    importError: {
      marginTop: 8,
      fontSize: 11,
      color: colors.error,
    },
    message: {
      padding: '8px 16px',
      background: colors.success + '22',
      color: colors.success,
      fontSize: 12,
      textAlign: 'center' as const,
    },
    detailActions: {
      display: 'flex',
      gap: 8,
      marginTop: 12,
    },
    detailBtn: {
      flex: 1,
      padding: '6px 12px',
      borderRadius: 4,
      border: `1px solid ${colors.borderLight}`,
      background: colors.bgHover,
      color: colors.textSecondary,
      fontSize: 11,
      cursor: 'pointer',
    },
    detailDeleteBtn: {
      background: colors.error + '22',
      borderColor: colors.error + '44',
      color: colors.error,
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: 40,
      color: colors.textMuted,
      fontSize: 13,
    },
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'builtin', label: 'Built-in' },
    { id: 'custom', label: 'Custom' },
    { id: 'installed', label: 'Installed' },
  ];

  return (
    <div style={styles.overlay} onClick={onClose} onKeyDown={handleKeyDown} tabIndex={-1}>
      <div style={styles.dialog} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.title}>Pack Browser</span>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">x</button>
        </div>

        {message && <div style={styles.message}>{message}</div>}

        {/* Tabs */}
        <div style={styles.tabs}>
          {tabs.map(t => (
            <button
              key={t.id}
              style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Pack list */}
          <div style={styles.list}>
            {filteredPacks.length === 0 && (
              <div style={styles.emptyState}>No packs found</div>
            )}
            {filteredPacks.map(({ manifest, state }) => (
              <div
                key={manifest.id}
                style={{
                  ...styles.card,
                  ...(selectedPackId === manifest.id ? styles.cardSelected : {}),
                }}
                onClick={() => setSelectedPackId(manifest.id)}
              >
                <div style={styles.cardHeader}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ ...styles.cardIcon, background: manifest.color || '#6b7280' }}>
                      {manifest.icon || manifest.name.charAt(0)}
                    </div>
                    <div>
                      <div style={styles.cardName}>{manifest.name}</div>
                      <div style={styles.cardDesc}>{manifest.description}</div>
                    </div>
                  </div>
                  <button
                    style={{
                      ...styles.toggle,
                      ...(state.enabled ? styles.toggleEnabled : styles.toggleDisabled),
                    }}
                    onClick={(e) => { e.stopPropagation(); handleToggle(manifest.id); }}
                  >
                    {state.enabled ? 'Enabled' : 'Enable'}
                  </button>
                </div>
                <div style={styles.cardMeta}>
                  <span style={styles.badge}>{manifest.kind}</span>
                  <span style={styles.badge}>v{manifest.version}</span>
                  <span style={styles.badge}>
                    {packRegistry.getPackNodes(manifest.id).length} nodes
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selectedPack && (
            <PackDetail
              manifest={selectedPack.manifest}
              state={selectedPack.state}
              styles={styles}
              onExport={handleExport}
              onUninstall={handleUninstall}
            />
          )}
        </div>

        {/* Import section */}
        <div style={styles.importSection}>
          <div style={styles.importRow}>
            <input
              style={styles.importInput}
              value={importJson}
              onChange={e => setImportJson(e.target.value)}
              placeholder="Paste pack JSON to import..."
            />
            <button
              style={styles.importBtn}
              onClick={handleImport}
              disabled={!importJson.trim()}
            >
              Import
            </button>
          </div>
          {importError && <div style={styles.importError}>{importError}</div>}
        </div>
      </div>
    </div>
  );
}

// === PackDetail sub-component ===

function PackDetail({
  manifest,
  state,
  styles,
  onExport,
  onUninstall,
}: {
  manifest: PackManifest;
  state: PackState;
  styles: Record<string, React.CSSProperties>;
  onExport: (packId: string) => void;
  onUninstall: (packId: string) => void;
}) {
  const nodes = packRegistry.getPackNodes(manifest.id);

  return (
    <div style={styles.detail}>
      <div style={styles.detailTitle}>{manifest.name}</div>
      <div style={styles.detailDesc}>{manifest.description}</div>

      <div style={styles.detailSection}>
        <div style={styles.detailLabel}>Info</div>
        <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>
          <div>Version: {manifest.version}</div>
          <div>Author: {manifest.author}</div>
          <div>Category: {manifest.category}</div>
          <div>Installed: {new Date(state.installedAt).toLocaleDateString()}</div>
        </div>
      </div>

      <div style={styles.detailSection}>
        <div style={styles.detailLabel}>Nodes ({nodes.length})</div>
        {nodes.map(n => (
          <div key={n.nodeType.type} style={styles.nodeItem}>
            <strong>{n.nodeType.title}</strong>
            <span style={{ marginLeft: 6, opacity: 0.6 }}>{n.nodeType.category}</span>
            <div style={{ marginTop: 2, opacity: 0.5 }}>
              In: {n.nodeType.inputs.map(i => i.name).join(', ') || 'none'}
              {' | '}
              Out: {n.nodeType.outputs.map(o => o.name).join(', ') || 'none'}
            </div>
          </div>
        ))}
      </div>

      <div style={styles.detailActions}>
        {manifest.kind === 'custom' && (
          <>
            <button
              style={styles.detailBtn}
              onClick={() => onExport(manifest.id)}
            >
              Export JSON
            </button>
            <button
              style={{ ...styles.detailBtn, ...styles.detailDeleteBtn }}
              onClick={() => onUninstall(manifest.id)}
            >
              Uninstall
            </button>
          </>
        )}
      </div>
    </div>
  );
}
