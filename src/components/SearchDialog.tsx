import { useState, useEffect, useRef } from 'react';
import type { FlowNode } from '@flowforge/types';
import { useLanguage } from '../i18n';

interface SearchDialogProps {
  nodes: FlowNode[];
  onSelect: (node: FlowNode) => void;
  onClose: () => void;
}

export function SearchDialog({ nodes, onSelect, onClose }: SearchDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lang = useLanguage();

  const filteredNodes = search
    ? nodes.filter(node => {
        const title = String(node.data.title || node.type).toLowerCase();
        const type = node.type.toLowerCase();
        const query = search.toLowerCase();
        return title.includes(query) || type.includes(query);
      })
    : nodes;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // 선택된 항목이 보이도록 스크롤
  useEffect(() => {
    if (listRef.current && filteredNodes.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, filteredNodes.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredNodes.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredNodes[selectedIndex]) {
        onSelect(filteredNodes[selectedIndex]);
      }
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div style={styles.header}>
          <input
            ref={inputRef}
            type="text"
            placeholder={lang === 'en' ? 'Search nodes by name or type...' : '이름 또는 타입으로 노드 검색...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={styles.input}
          />
        </div>
        <div ref={listRef} style={styles.list}>
          {filteredNodes.length > 0 ? (
            filteredNodes.map((node, index) => {
              const isSelected = index === selectedIndex;
              const title = String(node.data.title || node.type);
              return (
                <div
                  key={node.id}
                  onClick={() => onSelect(node)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    ...styles.item,
                    background: isSelected ? '#094771' : 'transparent',
                  }}
                >
                  <div style={styles.itemTitle}>{title}</div>
                  <div style={styles.itemMeta}>
                    <span style={styles.itemType}>{node.type}</span>
                    <span style={styles.itemId}>#{node.id.slice(-6)}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={styles.empty}>
              {search
                ? (lang === 'en' ? 'No nodes found' : '노드를 찾을 수 없습니다')
                : (lang === 'en' ? 'No nodes in graph' : '그래프에 노드가 없습니다')}
            </div>
          )}
        </div>
        <div style={styles.footer}>
          <span style={styles.hint}>↑↓ {lang === 'en' ? 'Navigate' : '이동'}</span>
          <span style={styles.hint}>Enter {lang === 'en' ? 'Select' : '선택'}</span>
          <span style={styles.hint}>Esc {lang === 'en' ? 'Close' : '닫기'}</span>
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
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 100,
    zIndex: 1000,
  },
  dialog: {
    width: 400,
    maxHeight: 500,
    background: '#252526',
    border: '1px solid #3c3c3c',
    borderRadius: 8,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: 12,
    borderBottom: '1px solid #3c3c3c',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: '#3c3c3c',
    border: '1px solid #4a4a4a',
    borderRadius: 6,
    color: '#ffffff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    maxHeight: 350,
  },
  item: {
    padding: '10px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid #2d2d2d',
  },
  itemTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 4,
  },
  itemMeta: {
    display: 'flex',
    gap: 12,
  },
  itemType: {
    color: '#808080',
    fontSize: 12,
  },
  itemId: {
    color: '#606060',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  empty: {
    padding: 24,
    textAlign: 'center',
    color: '#808080',
    fontSize: 14,
  },
  footer: {
    padding: '8px 12px',
    borderTop: '1px solid #3c3c3c',
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
  },
  hint: {
    color: '#606060',
    fontSize: 11,
  },
};
