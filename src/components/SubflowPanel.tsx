import { useState, useEffect } from 'react';
import type { Subflow, SubflowPortMapping, FlowNode, FlowEdge } from '@flowforge/types';
import { saveAsTemplate } from '@flowforge/state';
import { useTheme } from '../hooks/useTheme';
import { SHADOWS } from '../theme/shadows';
import { Z_INDEX } from '../constants/zIndex';

interface SubflowPanelProps {
  subflow: Subflow;
  nodes: FlowNode[];
  edges: FlowEdge[];
  onUpdate: (id: string, partial: Partial<Subflow>) => void;
  onDelete: (id: string) => void;
  onCollapse: (id: string) => void;
  onExpand: (id: string) => void;
}

export function SubflowPanel({
  subflow,
  nodes,
  edges,
  onUpdate,
  onDelete,
  onCollapse,
  onExpand,
}: SubflowPanelProps) {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [localName, setLocalName] = useState(subflow.name);
  const [localInputs, setLocalInputs] = useState<SubflowPortMapping[]>(subflow.inputMappings);
  const [localOutputs, setLocalOutputs] = useState<SubflowPortMapping[]>(subflow.outputMappings);
  const { colors } = useTheme();

  // 서브플로우가 바뀌면 로컬 상태 갱신
  useEffect(() => {
    setLocalName(subflow.name);
    setLocalInputs(subflow.inputMappings);
    setLocalOutputs(subflow.outputMappings);
  }, [subflow.id, subflow.name, subflow.inputMappings, subflow.outputMappings]);

  const handleNameChange = (newName: string) => {
    setLocalName(newName);
    onUpdate(subflow.id, { name: newName });
  };

  const handlePortNameChange = (isOutput: boolean, portId: string, newName: string) => {
    if (isOutput) {
      const updated = localOutputs.map(p =>
        p.exposedPortId === portId ? { ...p, exposedPortName: newName } : p
      );
      setLocalOutputs(updated);
      onUpdate(subflow.id, { outputMappings: updated });
    } else {
      const updated = localInputs.map(p =>
        p.exposedPortId === portId ? { ...p, exposedPortName: newName } : p
      );
      setLocalInputs(updated);
      onUpdate(subflow.id, { inputMappings: updated });
    }
  };

  const handleRemovePort = (isOutput: boolean, portId: string) => {
    if (isOutput) {
      const updated = localOutputs.filter(p => p.exposedPortId !== portId);
      setLocalOutputs(updated);
      onUpdate(subflow.id, { outputMappings: updated });
    } else {
      const updated = localInputs.filter(p => p.exposedPortId !== portId);
      setLocalInputs(updated);
      onUpdate(subflow.id, { inputMappings: updated });
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    panel: {
      position: 'absolute',
      top: 16,
      left: 16,
      width: 280,
      background: colors.bgSecondary,
      border: `1px solid ${colors.border}`,
      borderRadius: 8,
      boxShadow: SHADOWS.mediumDark,
      zIndex: 100,
      overflow: 'hidden',
      maxHeight: 'calc(100vh - 100px)',
      overflowY: 'auto',
    },
    header: {
      padding: '12px 16px',
      borderBottom: `1px solid ${colors.border}`,
      background: colors.accent,
    },
    nodeType: {
      fontSize: 10,
      color: 'rgba(255,255,255,0.7)',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    nodeTitle: {
      fontSize: 16,
      fontWeight: 600,
      color: '#ffffff',
    },
    content: {
      padding: 16,
    },
    field: {
      marginBottom: 16,
    },
    label: {
      display: 'block',
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 6,
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      background: colors.bgHover,
      border: `1px solid ${colors.borderLight}`,
      borderRadius: 4,
      color: colors.textSecondary,
      fontSize: 14,
      outline: 'none',
      boxSizing: 'border-box',
    },
    section: {
      marginBottom: 16,
    },
    sectionHeader: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 8,
      fontWeight: 600,
    },
    portRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    portInput: {
      flex: 1,
      padding: '6px 10px',
      background: colors.bgHover,
      border: `1px solid ${colors.borderLight}`,
      borderRadius: 4,
      color: colors.textSecondary,
      fontSize: 12,
      outline: 'none',
    },
    portType: {
      fontSize: 10,
      color: colors.textMuted,
      padding: '2px 6px',
      background: colors.bgTertiary,
      borderRadius: 3,
    },
    removeBtn: {
      width: 20,
      height: 20,
      padding: 0,
      background: 'transparent',
      border: `1px solid ${colors.borderLight}`,
      borderRadius: 3,
      color: colors.textMuted,
      fontSize: 12,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyPorts: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: 'italic',
      padding: '8px 0',
    },
    actions: {
      display: 'flex',
      gap: 8,
      marginTop: 16,
    },
    actionBtn: {
      flex: 1,
      padding: '8px 12px',
      background: colors.bgHover,
      border: `1px solid ${colors.borderLight}`,
      borderRadius: 4,
      color: colors.textSecondary,
      fontSize: 12,
      cursor: 'pointer',
    },
    deleteBtn: {
      background: colors.error + '22',
      borderColor: colors.error + '44',
      color: colors.error,
    },
    templateSection: {
      marginTop: 12,
    },
    templateBtn: {
      width: '100%',
      background: colors.success + '22',
      borderColor: colors.success + '44',
      color: colors.success,
    },
    saveMessage: {
      marginTop: 8,
      fontSize: 11,
      color: colors.success,
      textAlign: 'center' as const,
    },
    info: {
      marginTop: 16,
      paddingTop: 16,
      borderTop: `1px solid ${colors.border}`,
    },
    infoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    infoLabel: {
      fontSize: 12,
      color: colors.textMuted,
    },
    infoValue: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: 'monospace',
    },
  };

  const renderPortList = (ports: SubflowPortMapping[], isOutput: boolean) => {
    if (ports.length === 0) {
      return <div style={styles.emptyPorts}>No {isOutput ? 'output' : 'input'} ports</div>;
    }

    return ports.map(port => (
      <div key={port.exposedPortId} style={styles.portRow}>
        <input
          type="text"
          value={port.exposedPortName}
          onChange={e => handlePortNameChange(isOutput, port.exposedPortId, e.target.value)}
          style={styles.portInput}
          aria-label={`${isOutput ? 'Output' : 'Input'} port name`}
        />
        <span style={styles.portType}>{port.dataType}</span>
        <button
          onClick={() => handleRemovePort(isOutput, port.exposedPortId)}
          style={styles.removeBtn}
          title="Remove port"
          aria-label={`Remove ${port.exposedPortName} port`}
        >
          x
        </button>
      </div>
    ));
  };

  return (
    <div style={styles.panel} role="region" aria-label="Subflow panel">
      <div style={styles.header}>
        <div style={styles.nodeType}>Subflow</div>
        <div style={styles.nodeTitle}>{localName || 'Untitled'}</div>
      </div>

      <div style={styles.content}>
        {/* 이름 편집 */}
        <div style={styles.field}>
          <label style={styles.label}>Name</label>
          <input
            type="text"
            value={localName}
            onChange={e => handleNameChange(e.target.value)}
            style={styles.input}
            placeholder="Subflow name"
            aria-label="Subflow name"
          />
        </div>

        {/* 입력 포트 */}
        <div style={styles.section} role="group" aria-label="Input ports">
          <div style={styles.sectionHeader}>Input Ports ({localInputs.length})</div>
          {renderPortList(localInputs, false)}
        </div>

        {/* 출력 포트 */}
        <div style={styles.section} role="group" aria-label="Output ports">
          <div style={styles.sectionHeader}>Output Ports ({localOutputs.length})</div>
          {renderPortList(localOutputs, true)}
        </div>

        {/* 액션 버튼 */}
        <div style={styles.actions} role="group" aria-label="Actions">
          <button
            onClick={() => subflow.collapsed ? onExpand(subflow.id) : onCollapse(subflow.id)}
            style={styles.actionBtn}
          >
            {subflow.collapsed ? 'Expand' : 'Collapse'}
          </button>
          <button
            onClick={() => onDelete(subflow.id)}
            style={{ ...styles.actionBtn, ...styles.deleteBtn }}
          >
            Delete
          </button>
        </div>

        {/* 템플릿 저장 */}
        <div style={styles.templateSection}>
          <button
            onClick={() => {
              saveAsTemplate(subflow, nodes, edges);
              setSaveMessage('Template saved!');
              setTimeout(() => setSaveMessage(null), 2000);
            }}
            style={{ ...styles.actionBtn, ...styles.templateBtn }}
          >
            Save as Template
          </button>
          {saveMessage && <div style={styles.saveMessage} role="status">{saveMessage}</div>}
        </div>

        {/* 서브플로우 정보 */}
        <div style={styles.info}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>ID</span>
            <span style={styles.infoValue}>{subflow.id}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Nodes</span>
            <span style={styles.infoValue}>{subflow.nodeIds.length}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Status</span>
            <span style={styles.infoValue}>{subflow.collapsed ? 'Collapsed' : 'Expanded'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
