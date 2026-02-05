import { useEffect, useRef } from 'react';

export interface MenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        background: '#252526',
        border: '1px solid #3c3c3c',
        borderRadius: 4,
        padding: '4px 0',
        minWidth: 160,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        zIndex: 1000,
      }}
    >
      {items.map((item, index) =>
        item.divider ? (
          <div
            key={index}
            style={{
              height: 1,
              background: '#3c3c3c',
              margin: '4px 0',
            }}
          />
        ) : (
          <div
            key={index}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose();
              }
            }}
            style={{
              padding: '6px 12px',
              cursor: item.disabled ? 'default' : 'pointer',
              color: item.disabled ? '#6e6e6e' : '#cccccc',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.background = '#094771';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {item.label}
          </div>
        )
      )}
    </div>
  );
}
