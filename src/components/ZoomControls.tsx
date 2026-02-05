interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitView: () => void;
}

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitView,
}: ZoomControlsProps) {
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div style={styles.container}>
      <button
        onClick={onZoomOut}
        style={styles.button}
        title="Zoom Out (Scroll Down)"
      >
        −
      </button>
      <button
        onClick={onZoomReset}
        style={styles.zoomLevel}
        title="Reset to 100% (Ctrl+0)"
      >
        {zoomPercent}%
      </button>
      <button
        onClick={onZoomIn}
        style={styles.button}
        title="Zoom In (Scroll Up)"
      >
        +
      </button>
      <div style={styles.divider} />
      <button
        onClick={onFitView}
        style={styles.button}
        title="Fit View (F)"
      >
        ⊡
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    background: '#252526',
    border: '1px solid #3c3c3c',
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
    color: '#cccccc',
    fontSize: 16,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  zoomLevel: {
    minWidth: 50,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: 4,
    color: '#cccccc',
    fontSize: 12,
    fontFamily: 'monospace',
    cursor: 'pointer',
  },
  divider: {
    width: 1,
    height: 20,
    background: '#3c3c3c',
    margin: '0 4px',
  },
};
