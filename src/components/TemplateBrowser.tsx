import { useState, useEffect } from 'react';
import type { SubflowTemplate, Position } from '@flowforge/types';
import { loadTemplates, deleteTemplate } from '@flowforge/state';

interface TemplateBrowserProps {
  position: Position;
  onInsert: (template: SubflowTemplate) => void;
  onClose: () => void;
}

export function TemplateBrowser({ position, onInsert, onClose }: TemplateBrowserProps) {
  const [templates, setTemplates] = useState<SubflowTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this template?')) {
      deleteTemplate(templateId);
      setTemplates(loadTemplates());
    }
  };

  return (
    <div
      style={{
        ...styles.container,
        left: position.x,
        top: position.y,
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={styles.header}>
        <span style={styles.title}>Templates</span>
        <button onClick={onClose} style={styles.closeBtn}>×</button>
      </div>

      <input
        type="text"
        placeholder="Search templates..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        style={styles.searchInput}
        autoFocus
      />

      <div style={styles.list}>
        {filteredTemplates.length === 0 ? (
          <div style={styles.emptyMessage}>
            {templates.length === 0
              ? 'No templates saved yet. Save a subflow as template to see it here.'
              : 'No templates match your search.'}
          </div>
        ) : (
          filteredTemplates.map(template => (
            <div
              key={template.id}
              style={styles.templateItem}
              onClick={() => onInsert(template)}
            >
              <div style={styles.templateHeader}>
                <span style={styles.templateName}>{template.name}</span>
                <button
                  onClick={e => handleDelete(template.id, e)}
                  style={styles.deleteBtn}
                  title="Delete template"
                >
                  ×
                </button>
              </div>
              {template.description && (
                <div style={styles.templateDesc}>{template.description}</div>
              )}
              <div style={styles.templateMeta}>
                <span>{template.nodes.length} nodes</span>
                <span>•</span>
                <span>{template.inputMappings.length} in</span>
                <span>•</span>
                <span>{template.outputMappings.length} out</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={styles.footer}>
        <span style={styles.hint}>Click to insert • Esc to close</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    width: 300,
    maxHeight: 400,
    background: '#252526',
    border: '1px solid #3c3c3c',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    zIndex: 200,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid #3c3c3c',
    background: '#1e3a5f',
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: '#ffffff',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#808080',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
  },
  searchInput: {
    margin: 8,
    padding: '8px 12px',
    background: '#3c3c3c',
    border: '1px solid #4a4a4a',
    borderRadius: 4,
    color: '#cccccc',
    fontSize: 13,
    outline: 'none',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 8px 8px',
  },
  emptyMessage: {
    padding: 16,
    textAlign: 'center',
    color: '#606060',
    fontSize: 12,
    lineHeight: 1.5,
  },
  templateItem: {
    padding: 10,
    marginBottom: 4,
    background: '#2d2d30',
    borderRadius: 4,
    cursor: 'pointer',
    border: '1px solid transparent',
  },
  templateHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#e0e0e0',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#606060',
    fontSize: 14,
    cursor: 'pointer',
    padding: '0 4px',
    opacity: 0.6,
  },
  templateDesc: {
    marginTop: 4,
    fontSize: 11,
    color: '#808080',
  },
  templateMeta: {
    marginTop: 6,
    fontSize: 10,
    color: '#505050',
    display: 'flex',
    gap: 6,
  },
  footer: {
    padding: '8px 12px',
    borderTop: '1px solid #3c3c3c',
    background: '#1e1e1e',
  },
  hint: {
    fontSize: 11,
    color: '#505050',
  },
};
