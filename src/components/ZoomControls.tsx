import { useState, useRef, useEffect } from 'react';
import { ZOOM_CONFIG } from '@flowforge/types';
import { useTheme } from '../hooks/useTheme';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitView: () => void;
  onZoomTo?: (zoom: number) => void;
}

const ZOOM_PRESETS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2 },
  { label: '300%', value: 3 },
];

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitView,
  onZoomTo,
}: ZoomControlsProps) {
  const { colors } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const zoomPercent = Math.round(zoom * 100);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleZoomPreset = (value: number) => {
    if (onZoomTo) {
      onZoomTo(value);
    } else if (value === 1) {
      onZoomReset();
    }
    setShowDropdown(false);
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      position: 'absolute',
      bottom: 16,
      left: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      background: colors.bgSecondary,
      border: `1px solid ${colors.border}`,
      borderRadius: 6,
      padding: 4,
      zIndex: 100,
    },
    button: {
      width: 32,
      height: 28,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      border: 'none',
      borderRadius: 4,
      color: colors.textSecondary,
      fontSize: 16,
      cursor: 'pointer',
      transition: 'background 0.15s',
    },
    zoomLevel: {
      minWidth: 58,
      height: 28,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      border: 'none',
      borderRadius: 4,
      color: colors.textSecondary,
      fontSize: 12,
      fontFamily: 'monospace',
      cursor: 'pointer',
    },
    divider: {
      width: 1,
      height: 20,
      background: colors.border,
      margin: '0 4px',
    },
    dropdown: {
      position: 'absolute',
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: 8,
      background: colors.bgSecondary,
      border: `1px solid ${colors.border}`,
      borderRadius: 6,
      padding: 4,
      minWidth: 100,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    },
    dropdownItem: {
      width: '100%',
      padding: '8px 12px',
      display: 'block',
      background: 'transparent',
      border: 'none',
      borderRadius: 4,
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: 'left',
      cursor: 'pointer',
    },
    dropdownDivider: {
      height: 1,
      background: colors.border,
      margin: '4px 0',
    },
  };

  return (
    <div style={styles.container}>
      <button
        onClick={onZoomOut}
        style={styles.button}
        title="Zoom Out (Scroll Down)"
        aria-label="Zoom out"
      >
        −
      </button>
      <div style={{ position: 'relative' }} ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            ...styles.zoomLevel,
            background: showDropdown ? colors.bgHover : 'transparent',
          }}
          title="Click for zoom presets"
          aria-label={`Zoom level ${zoomPercent}%`}
          aria-expanded={showDropdown}
        >
          {zoomPercent}%
          <span style={{ fontSize: 8, marginLeft: 4, opacity: 0.6 }}>▼</span>
        </button>
        {showDropdown && (
          <div style={styles.dropdown} role="menu">
            {ZOOM_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handleZoomPreset(preset.value)}
                style={{
                  ...styles.dropdownItem,
                  background: Math.abs(zoom - preset.value) < ZOOM_CONFIG.COMPARISON_EPSILON ? colors.bgHover : 'transparent',
                  fontWeight: Math.abs(zoom - preset.value) < ZOOM_CONFIG.COMPARISON_EPSILON ? 600 : 400,
                }}
                role="menuitem"
              >
                {preset.label}
              </button>
            ))}
            <div style={styles.dropdownDivider} />
            <button
              onClick={() => {
                onFitView();
                setShowDropdown(false);
              }}
              style={styles.dropdownItem}
              role="menuitem"
            >
              Fit to View
            </button>
          </div>
        )}
      </div>
      <button
        onClick={onZoomIn}
        style={styles.button}
        title="Zoom In (Scroll Up)"
        aria-label="Zoom in"
      >
        +
      </button>
      <div style={styles.divider} />
      <button
        onClick={onFitView}
        style={styles.button}
        title="Fit View (F)"
        aria-label="Fit view"
      >
        ⊡
      </button>
    </div>
  );
}
