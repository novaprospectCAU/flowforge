import { useState, useEffect } from 'react';
import type { Subflow, SubflowPortMapping, FlowNode, FlowEdge } from '@flowforge/types';
import { saveAsTemplate } from '@flowforge/state';

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
        />
        <span style={styles.portType}>{port.dataType}</span>
        <button
          onClick={() => handleRemovePort(isOutput, port.exposedPortId)}
          style={styles.removeBtn}
          title="Remove port"
        >
          x
        </button>
      </div>
    ));
  };

  return (
    <div style={styles.panel}>
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
          />
        </div>

        {/* 입력 포트 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>Input Ports ({localInputs.length})</div>
          {renderPortList(localInputs, false)}
        </div>

        {/* 출력 포트 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>Output Ports ({localOutputs.length})</div>
          {renderPortList(localOutputs, true)}
        </div>

        {/* 액션 버튼 */}
        <div style={styles.actions}>
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
          {saveMessage && <div style={styles.saveMessage}>{saveMessage}</div>}
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

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 280,
    background: '#252526',
    border: '1px solid #3c3c3c',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    zIndex: 100,
    overflow: 'hidden',
    maxHeight: 'calc(100vh - 100px)',
    overflowY: 'auto',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #3c3c3c',
    background: '#1e3a5f',
  },
  nodeType: {
    fontSize: 10,
    color: '#80b0e0',
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
    color: '#808080',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    background: '#3c3c3c',
    border: '1px solid #4a4a4a',
    borderRadius: 4,
    color: '#cccccc',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 12,
    color: '#808080',
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
    background: '#3c3c3c',
    border: '1px solid #4a4a4a',
    borderRadius: 4,
    color: '#cccccc',
    fontSize: 12,
    outline: 'none',
  },
  portType: {
    fontSize: 10,
    color: '#606060',
    padding: '2px 6px',
    background: '#2d2d2d',
    borderRadius: 3,
  },
  removeBtn: {
    width: 20,
    height: 20,
    padding: 0,
    background: 'transparent',
    border: '1px solid #4a4a4a',
    borderRadius: 3,
    color: '#808080',
    fontSize: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPorts: {
    fontSize: 12,
    color: '#505050',
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
    background: '#3c3c3c',
    border: '1px solid #4a4a4a',
    borderRadius: 4,
    color: '#cccccc',
    fontSize: 12,
    cursor: 'pointer',
  },
  deleteBtn: {
    background: '#5c2d2d',
    borderColor: '#7a3a3a',
    color: '#e08080',
  },
  templateSection: {
    marginTop: 12,
  },
  templateBtn: {
    width: '100%',
    background: '#2d4a3c',
    borderColor: '#3a7a5a',
    color: '#80e0a0',
  },
  saveMessage: {
    marginTop: 8,
    fontSize: 11,
    color: '#80e0a0',
    textAlign: 'center' as const,
  },
  info: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: '1px solid #3c3c3c',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#606060',
  },
  infoValue: {
    fontSize: 12,
    color: '#808080',
    fontFamily: 'monospace',
  },
};
