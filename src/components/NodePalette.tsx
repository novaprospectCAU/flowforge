import { useState, useEffect, useRef } from 'react';
import { nodeTypeRegistry, type NodeTypeDefinition } from '@flowforge/state';

interface NodePaletteProps {
  x: number;
  y: number;
  onSelect: (nodeType: NodeTypeDefinition) => void;
  onClose: () => void;
}

export function NodePalette({ x, y, onSelect, onClose }: NodePaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allTypes = nodeTypeRegistry.getAll();
  const filteredTypes = search
    ? allTypes.filter(
        t =>
          t.title.toLowerCase().includes(search.toLowerCase()) ||
          t.type.toLowerCase().includes(search.toLowerCase()) ||
          t.category.toLowerCase().includes(search.toLowerCase())
      )
    : allTypes;

  // 카테고리별로 그룹화
  const grouped = filteredTypes.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, NodeTypeDefinition[]>);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.node-palette')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredTypes.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTypes[selectedIndex]) {
        onSelect(filteredTypes[selectedIndex]);
      }
    }
  };

  return (
    <div
      className="node-palette"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: 280,
        maxHeight: 400,
        background: '#252526',
        border: '1px solid #3c3c3c',
        borderRadius: 6,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        zIndex: 1000,
        overflow: 'hidden',
      }}
      onKeyDown={handleKeyDown}
    >
      <div style={{ padding: 8, borderBottom: '1px solid #3c3c3c' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search nodes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#3c3c3c',
            border: 'none',
            borderRadius: 4,
            color: '#cccccc',
            fontSize: 14,
            outline: 'none',
          }}
        />
      </div>
      <div
        ref={listRef}
        style={{
          maxHeight: 320,
          overflowY: 'auto',
        }}
      >
        {Object.entries(grouped).map(([category, types]) => (
          <div key={category}>
            <div
              style={{
                padding: '6px 12px',
                fontSize: 11,
                color: '#808080',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {category}
            </div>
            {types.map(type => {
              const globalIndex = filteredTypes.indexOf(type);
              const isSelected = globalIndex === selectedIndex;
              return (
                <div
                  key={type.type}
                  onClick={() => onSelect(type)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: isSelected ? '#094771' : 'transparent',
                    color: '#cccccc',
                  }}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                >
                  <div style={{ fontWeight: 500 }}>{type.title}</div>
                  {type.description && (
                    <div style={{ fontSize: 12, color: '#808080', marginTop: 2 }}>
                      {type.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {filteredTypes.length === 0 && (
          <div style={{ padding: 16, color: '#808080', textAlign: 'center' }}>
            No nodes found
          </div>
        )}
      </div>
    </div>
  );
}
