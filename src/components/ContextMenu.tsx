import { useRef, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useClickOutside, useEscapeKey } from '../hooks/useClickOutside';
import { SHADOWS } from '../theme/shadows';

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
  const { colors } = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useClickOutside(menuRef, onClose);
  useEscapeKey(onClose);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        background: colors.bgSecondary,
        border: `1px solid ${colors.border}`,
        borderRadius: 4,
        padding: '4px 0',
        minWidth: 160,
        boxShadow: SHADOWS.mediumDark,
        zIndex: 1000,
      }}
      role="menu"
      aria-label="Context menu"
    >
      {items.map((item, index) =>
        item.divider ? (
          <div
            key={index}
            style={{
              height: 1,
              background: colors.border,
              margin: '4px 0',
            }}
            role="separator"
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
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              padding: '6px 12px',
              cursor: item.disabled ? 'default' : 'pointer',
              color: item.disabled ? colors.textMuted : colors.textSecondary,
              background: !item.disabled && hoveredIndex === index ? colors.accent : 'transparent',
            }}
            role="menuitem"
            aria-disabled={item.disabled}
          >
            {item.label}
          </div>
        )
      )}
    </div>
  );
}
