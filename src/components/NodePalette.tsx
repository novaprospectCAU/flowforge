import { useState, useEffect, useRef } from 'react';
import { nodeTypeRegistry, type NodeTypeDefinition } from '@flowforge/state';
import { useLanguage } from '../i18n';
import { uiTranslations } from '../i18n/translations';
import { useIsTouchDevice } from '../hooks/useIsTouchDevice';
import { useTheme } from '../hooks/useTheme';
import { useIsMobile } from '../hooks/useIsMobile';
import { useClickOutside } from '../hooks/useClickOutside';
import { SHADOWS } from '../theme/shadows';

interface NodePaletteProps {
  x: number;
  y: number;
  onSelect: (nodeType: NodeTypeDefinition) => void;
  onClose: () => void;
}

export function NodePalette({ x, y, onSelect, onClose }: NodePaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lang = useLanguage();
  const t = uiTranslations[lang];
  const isTouchDevice = useIsTouchDevice();
  const { colors } = useTheme();
  const isMobile = useIsMobile();

  useClickOutside(containerRef, onClose);

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
    // 터치 기기에서는 자동 포커스 안 함 (키보드가 바로 뜨는 것 방지)
    if (!isTouchDevice) {
      inputRef.current?.focus();
    }
  }, [isTouchDevice]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

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
      ref={containerRef}
      className="node-palette"
      style={{
        position: 'fixed',
        ...(isMobile
          ? { left: 16, right: 16, bottom: 16, width: 'auto', maxHeight: '50vh' }
          : {
              left: Math.min(x, window.innerWidth - 296),
              top: Math.min(y, window.innerHeight - 416),
              width: 280,
              maxHeight: 400,
            }),
        background: colors.bgSecondary,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        boxShadow: SHADOWS.largeDark,
        zIndex: 1000,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      onKeyDown={handleKeyDown}
      role="listbox"
      aria-label={lang === 'en' ? 'Node types' : '노드 타입'}
    >
      <div style={{ padding: isMobile ? 6 : 8, borderBottom: `1px solid ${colors.border}` }}>
        <input
          ref={inputRef}
          type="text"
          placeholder={t.searchNodes}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: isMobile ? '6px 10px' : '8px 12px',
            background: colors.bgHover,
            border: 'none',
            borderRadius: 4,
            color: colors.textSecondary,
            fontSize: isMobile ? 13 : 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
          aria-label={t.searchNodes}
        />
      </div>
      <div
        ref={listRef}
        style={{
          flex: 1,
          maxHeight: isMobile ? undefined : 320,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {Object.entries(grouped).map(([category, types]) => (
          <div key={category} role="group" aria-label={category}>
            <div
              style={{
                padding: isMobile ? '4px 10px' : '6px 12px',
                fontSize: isMobile ? 10 : 11,
                color: colors.textMuted,
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
                    padding: isMobile ? '5px 10px' : '8px 12px',
                    cursor: 'pointer',
                    background: isSelected ? colors.accent + '44' : 'transparent',
                    color: colors.textSecondary,
                    fontSize: isMobile ? 13 : undefined,
                  }}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div style={{ fontWeight: 500 }}>{type.title}</div>
                  {!isMobile && type.description && (
                    <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      {type.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {filteredTypes.length === 0 && (
          <div style={{ padding: 16, color: colors.textMuted, textAlign: 'center' }}>
            {lang === 'en' ? 'No nodes found' : '노드를 찾을 수 없습니다'}
          </div>
        )}
      </div>
    </div>
  );
}
