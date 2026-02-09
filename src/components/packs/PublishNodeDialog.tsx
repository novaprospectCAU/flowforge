/**
 * PublishNodeDialog — 서브플로우를 커스텀 노드로 퍼블리시
 */

import { useState, useEffect } from 'react';
import type { Subflow, FlowNode, FlowEdge } from '@flowforge/types';
import { packRegistry, convertSubflowToPackNode } from '@flowforge/state';
import { useTheme } from '../../hooks/useTheme';
import { useIsMobile } from '../../hooks/useIsMobile';
import { SHADOWS } from '../../theme/shadows';
import { Z_INDEX } from '../../constants/zIndex';

interface PublishNodeDialogProps {
  subflow: Subflow;
  nodes: FlowNode[];
  edges: FlowEdge[];
  onClose: () => void;
}

export function PublishNodeDialog({ subflow, nodes, edges, onClose }: PublishNodeDialogProps) {
  const { colors } = useTheme();
  const isMobile = useIsMobile();
  const [title, setTitle] = useState(subflow.name || 'Custom Node');
  const [category, setCategory] = useState('Custom');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#8b5cf6');
  const [targetPackId, setTargetPackId] = useState<string | '__new__'>('__new__');
  const [newPackName, setNewPackName] = useState('My Custom Pack');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const allPacks = packRegistry.getAllPacks().filter(p => p.manifest.kind === 'custom');

  useEffect(() => {
    if (allPacks.length > 0 && targetPackId === '__new__') {
      // 기존 커스텀 팩이 있으면 첫 번째를 선택
      setTargetPackId(allPacks[0].manifest.id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePublish = () => {
    try {
      setError(null);

      let packId: string;

      if (targetPackId === '__new__') {
        // 새 팩 생성
        packId = `custom-${Date.now()}`;
        packRegistry.createCustomPack({
          id: packId,
          name: newPackName,
          description: `Custom pack: ${newPackName}`,
          version: '1.0.0',
          author: 'User',
          category: 'Custom',
          kind: 'custom',
        });
      } else {
        packId = targetPackId;
      }

      // 서브플로우 → 노드 변환
      const { nodeType, subflowDef } = convertSubflowToPackNode(
        subflow, nodes, edges,
        { packId, title, category, description, color }
      );

      // 팩에 노드 추가
      packRegistry.addNodeToCustomPack(packId, nodeType, undefined, subflowDef);

      // 팩 활성화
      if (!packRegistry.isEnabled(packId)) {
        packRegistry.enablePack(packId);
      }

      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

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
      width: isMobile ? 'calc(100vw - 32px)' : 420,
      maxHeight: '80vh',
      overflowY: 'auto',
      background: colors.bgSecondary,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      boxShadow: SHADOWS.mediumDark,
      padding: isMobile ? 16 : 24,
    },
    title: {
      fontSize: 18,
      fontWeight: 600,
      color: colors.textPrimary,
      marginBottom: 20,
    },
    field: {
      marginBottom: 16,
    },
    label: {
      display: 'block',
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 6,
      fontWeight: 500,
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      background: colors.bgHover,
      border: `1px solid ${colors.borderLight}`,
      borderRadius: 6,
      color: colors.textSecondary,
      fontSize: 14,
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    select: {
      width: '100%',
      padding: '8px 12px',
      background: colors.bgHover,
      border: `1px solid ${colors.borderLight}`,
      borderRadius: 6,
      color: colors.textSecondary,
      fontSize: 14,
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    colorRow: {
      display: 'flex',
      gap: 8,
      alignItems: 'center',
    },
    colorInput: {
      width: 36,
      height: 36,
      border: `1px solid ${colors.borderLight}`,
      borderRadius: 6,
      cursor: 'pointer',
      padding: 0,
    },
    preview: {
      marginBottom: 20,
      padding: 12,
      background: colors.bgTertiary,
      borderRadius: 8,
      fontSize: 12,
      color: colors.textMuted,
    },
    previewTitle: {
      fontSize: 13,
      fontWeight: 600,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    portList: {
      margin: 0,
      paddingLeft: 16,
    },
    actions: {
      display: 'flex',
      gap: 12,
      justifyContent: 'flex-end',
    },
    btn: {
      padding: '10px 20px',
      borderRadius: 6,
      border: 'none',
      fontSize: 14,
      cursor: 'pointer',
      fontWeight: 500,
    },
    cancelBtn: {
      background: colors.bgHover,
      color: colors.textSecondary,
      border: `1px solid ${colors.borderLight}`,
    },
    publishBtn: {
      background: colors.accent,
      color: '#fff',
    },
    error: {
      padding: 8,
      background: colors.error + '22',
      borderRadius: 6,
      color: colors.error,
      fontSize: 12,
      marginBottom: 16,
    },
    success: {
      padding: 12,
      background: colors.success + '22',
      borderRadius: 6,
      color: colors.success,
      fontSize: 14,
      textAlign: 'center' as const,
      marginBottom: 16,
    },
  };

  if (success) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.dialog} onClick={e => e.stopPropagation()}>
          <div style={styles.success}>
            Custom node "{title}" published successfully!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={e => e.stopPropagation()}>
        <div style={styles.title}>Publish as Custom Node</div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.field}>
          <label style={styles.label}>Title</label>
          <input
            style={styles.input}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Node title"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Category</label>
          <input
            style={styles.input}
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="e.g. Custom, AI/Pipeline"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Description</label>
          <input
            style={styles.input}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What this node does"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Color</label>
          <div style={styles.colorRow}>
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              style={styles.colorInput}
            />
            <span style={{ fontSize: 12, color: colors.textMuted }}>{color}</span>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Target Pack</label>
          <select
            style={styles.select}
            value={targetPackId}
            onChange={e => setTargetPackId(e.target.value)}
          >
            <option value="__new__">+ Create new pack</option>
            {allPacks.map(p => (
              <option key={p.manifest.id} value={p.manifest.id}>
                {p.manifest.name}
              </option>
            ))}
          </select>
        </div>

        {targetPackId === '__new__' && (
          <div style={styles.field}>
            <label style={styles.label}>New Pack Name</label>
            <input
              style={styles.input}
              value={newPackName}
              onChange={e => setNewPackName(e.target.value)}
              placeholder="Pack name"
            />
          </div>
        )}

        {/* 포트 미리보기 */}
        <div style={styles.preview}>
          <div style={styles.previewTitle}>Port Preview</div>
          <div>
            <strong>Inputs ({subflow.inputMappings.length}):</strong>
            {subflow.inputMappings.length > 0 ? (
              <ul style={styles.portList}>
                {subflow.inputMappings.map(m => (
                  <li key={m.exposedPortId}>{m.exposedPortName} ({m.dataType})</li>
                ))}
              </ul>
            ) : <span> none</span>}
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Outputs ({subflow.outputMappings.length}):</strong>
            {subflow.outputMappings.length > 0 ? (
              <ul style={styles.portList}>
                {subflow.outputMappings.map(m => (
                  <li key={m.exposedPortId}>{m.exposedPortName} ({m.dataType})</li>
                ))}
              </ul>
            ) : <span> none</span>}
          </div>
        </div>

        <div style={styles.actions}>
          <button style={{ ...styles.btn, ...styles.cancelBtn }} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{ ...styles.btn, ...styles.publishBtn }}
            onClick={handlePublish}
            disabled={!title.trim()}
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}
