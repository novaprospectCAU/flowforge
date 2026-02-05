import { useState, useEffect } from 'react';
import type { FlowNode } from '@flowforge/types';
import { nodeTypeRegistry } from '@flowforge/state';

interface PropertyPanelProps {
  node: FlowNode;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
}

export function PropertyPanel({ node, onUpdate }: PropertyPanelProps) {
  const [localData, setLocalData] = useState<Record<string, unknown>>(node.data);

  // 노드가 바뀌면 로컬 데이터 갱신
  useEffect(() => {
    setLocalData(node.data);
  }, [node.id, node.data]);

  const typeDef = nodeTypeRegistry.get(node.type);

  const handleChange = (key: string, value: unknown) => {
    const newData = { ...localData, [key]: value };
    setLocalData(newData);
    onUpdate(node.id, newData);
  };

  // 노드 타입별 설정 UI
  const renderTypeSpecificFields = () => {
    switch (node.type) {
      case 'NumberInput':
        return (
          <div style={styles.field}>
            <label style={styles.label}>Value</label>
            <input
              type="number"
              value={Number(localData.value ?? 0)}
              onChange={e => handleChange('value', parseFloat(e.target.value) || 0)}
              style={styles.input}
            />
          </div>
        );

      case 'TextInput':
        return (
          <div style={styles.field}>
            <label style={styles.label}>Text</label>
            <input
              type="text"
              value={String(localData.text ?? '')}
              onChange={e => handleChange('text', e.target.value)}
              style={styles.input}
            />
          </div>
        );

      case 'Math':
        return (
          <div style={styles.field}>
            <label style={styles.label}>Operation</label>
            <select
              value={String(localData.operation ?? 'add')}
              onChange={e => handleChange('operation', e.target.value)}
              style={styles.select}
            >
              <option value="add">Add (+)</option>
              <option value="subtract">Subtract (-)</option>
              <option value="multiply">Multiply (*)</option>
              <option value="divide">Divide (/)</option>
              <option value="power">Power (^)</option>
              <option value="modulo">Modulo (%)</option>
            </select>
          </div>
        );

      case 'Filter':
        return (
          <div style={styles.field}>
            <label style={styles.label}>Filter Type</label>
            <select
              value={String(localData.filter ?? 'none')}
              onChange={e => handleChange('filter', e.target.value)}
              style={styles.select}
            >
              <option value="none">None</option>
              <option value="grayscale">Grayscale</option>
              <option value="blur">Blur</option>
              <option value="sharpen">Sharpen</option>
              <option value="invert">Invert</option>
            </select>
          </div>
        );

      case 'Merge':
        return (
          <div style={styles.field}>
            <label style={styles.label}>Merge Mode</label>
            <select
              value={String(localData.mode ?? 'array')}
              onChange={e => handleChange('mode', e.target.value)}
              style={styles.select}
            >
              <option value="array">Array</option>
              <option value="object">Object</option>
            </select>
          </div>
        );

      case 'SaveImage':
        return (
          <div style={styles.field}>
            <label style={styles.label}>File Path</label>
            <input
              type="text"
              value={String(localData.path ?? 'output.png')}
              onChange={e => handleChange('path', e.target.value)}
              style={styles.input}
              placeholder="output.png"
            />
          </div>
        );

      case 'ImageInput':
        return (
          <div style={styles.field}>
            <label style={styles.label}>Image Source</label>
            <input
              type="text"
              value={String(localData.src ?? '')}
              onChange={e => handleChange('src', e.target.value)}
              style={styles.input}
              placeholder="path/to/image.png"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.nodeType}>{typeDef?.category ?? 'Node'}</div>
        <div style={styles.nodeTitle}>{typeDef?.title ?? node.type}</div>
      </div>

      <div style={styles.content}>
        {/* 공통: 타이틀 편집 */}
        <div style={styles.field}>
          <label style={styles.label}>Title</label>
          <input
            type="text"
            value={String(localData.title ?? typeDef?.title ?? node.type)}
            onChange={e => handleChange('title', e.target.value)}
            style={styles.input}
          />
        </div>

        {/* 타입별 설정 */}
        {renderTypeSpecificFields()}

        {/* 노드 정보 */}
        <div style={styles.info}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>ID</span>
            <span style={styles.infoValue}>{node.id}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Position</span>
            <span style={styles.infoValue}>
              {Math.round(node.position.x)}, {Math.round(node.position.y)}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Size</span>
            <span style={styles.infoValue}>
              {node.size.width} x {node.size.height}
            </span>
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
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #3c3c3c',
    background: '#2d2d2d',
  },
  nodeType: {
    fontSize: 10,
    color: '#808080',
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
  select: {
    width: '100%',
    padding: '8px 12px',
    background: '#3c3c3c',
    border: '1px solid #4a4a4a',
    borderRadius: 4,
    color: '#cccccc',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  info: {
    marginTop: 20,
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
