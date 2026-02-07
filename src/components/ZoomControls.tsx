import { ZOOM_CONFIG } from '@flowforge/types';
import { useTheme } from '../hooks/useTheme';
import { useDropdown } from '../hooks/useDropdown';
import { SHADOWS } from '../theme/shadows';
import { Z_INDEX } from '../constants/zIndex';

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
  const dropdown = useDropdown<HTMLDivElement>();
  const zoomPercent = Math.round(zoom * 100);

  const handleZoomPreset = (value: number) => {
    if (onZoomTo) {
      onZoomTo(value);
    } else if (value === 1) {
      onZoomReset();
    }
    dropdown.close();
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
      zIndex: Z_INDEX.TOOLBAR,
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
      boxShadow: SHADOWS.medium,
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
      <div style={{ position: 'relative' }} ref={dropdown.ref}>
        <button
          onClick={dropdown.toggle}
          style={{
            ...styles.zoomLevel,
            background: dropdown.isOpen ? colors.bgHover : 'transparent',
          }}
          title="Click for zoom presets"
          aria-label={`Zoom level ${zoomPercent}%`}
          aria-expanded={dropdown.isOpen}
        >
          {zoomPercent}%
          <span style={{ fontSize: 8, marginLeft: 4, opacity: 0.6 }}>▼</span>
        </button>
        {dropdown.isOpen && (
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
                dropdown.close();
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
