import type { EdgeStyle } from '@flowforge/canvas';
import type { ExecutionState } from '@flowforge/state';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { IconUndo, IconRedo, IconDownload, IconUpload, IconKey } from './Icons';
import { useLanguage } from '../i18n';
import { uiTranslations } from '../i18n/translations';

interface ThemeColors {
  bgTertiary: string;
  bgActive: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
}

export interface DesktopToolbarProps {
  colors: ThemeColors;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  snapToGrid: boolean;
  onToggleSnap: () => void;
  edgeStyle: EdgeStyle;
  onEdgeStyleChange: () => void;
  onExport: () => void;
  onImport: () => void;
  onAPIKeys: () => void;
  onRun: () => void;
  isRunning: boolean;
  executionState: ExecutionState | null;
}

export function DesktopToolbar({
  colors,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  saveStatus,
  snapToGrid,
  onToggleSnap,
  edgeStyle,
  onEdgeStyleChange,
  onExport,
  onImport,
  onAPIKeys,
  onRun,
  isRunning,
  executionState,
}: DesktopToolbarProps) {
  const lang = useLanguage();
  const t = uiTranslations[lang];

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 100,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      {/* Undo/Redo 버튼 */}
      <div style={{ display: 'flex', gap: 2 }}>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title={t.undoShortcut}
          style={{
            padding: '8px 10px',
            background: colors.bgTertiary,
            color: canUndo ? colors.textSecondary : colors.textMuted,
            border: `1px solid ${colors.border}`,
            borderRadius: '4px 0 0 4px',
            fontSize: 14,
            cursor: canUndo ? 'pointer' : 'not-allowed',
            opacity: canUndo ? 1 : 0.5,
          }}
        >
          {IconUndo({ size: 14 })}
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title={t.redoShortcut}
          style={{
            padding: '8px 10px',
            background: colors.bgTertiary,
            color: canRedo ? colors.textSecondary : colors.textMuted,
            border: `1px solid ${colors.border}`,
            borderLeft: 'none',
            borderRadius: '0 4px 4px 0',
            fontSize: 14,
            cursor: canRedo ? 'pointer' : 'not-allowed',
            opacity: canRedo ? 1 : 0.5,
          }}
        >
          {IconRedo({ size: 14 })}
        </button>
      </div>
      {/* 자동 저장 상태 */}
      <div
        title={t.autoSaveStatus}
        style={{
          padding: '8px 12px',
          background: colors.bgTertiary,
          color: saveStatus === 'saved' ? colors.success : saveStatus === 'saving' ? colors.warning : colors.textSecondary,
          border: `1px solid ${colors.border}`,
          borderRadius: 4,
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: saveStatus === 'saved' ? colors.success : saveStatus === 'saving' ? colors.warning : colors.textSecondary,
        }} />
        {saveStatus === 'saved' ? t.saved : saveStatus === 'saving' ? t.saving : t.unsaved}
      </div>
      {/* 스냅 토글 */}
      <button
        onClick={onToggleSnap}
        title={`${t.snapToGrid}: ${snapToGrid ? 'ON' : 'OFF'} (G)`}
        style={{
          padding: '8px 12px',
          background: snapToGrid ? colors.bgActive : colors.bgTertiary,
          color: snapToGrid ? colors.success : colors.textSecondary,
          border: snapToGrid ? `1px solid ${colors.success}` : `1px solid ${colors.border}`,
          borderRadius: 4,
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        {snapToGrid ? t.gridOn : t.gridOff}
      </button>
      {/* 엣지 스타일 토글 */}
      <button
        onClick={onEdgeStyleChange}
        title={t.edgeStyle}
        style={{
          padding: '8px 12px',
          background: colors.bgActive,
          color: colors.textSecondary,
          border: `1px solid ${colors.border}`,
          borderRadius: 4,
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Edge: {edgeStyle.charAt(0).toUpperCase() + edgeStyle.slice(1)}
      </button>
      {/* 언어 선택 */}
      <LanguageSwitcher />
      {/* 테마 토글 */}
      <ThemeToggle />
      {/* 내보내기/가져오기 */}
      <div style={{ display: 'flex', gap: 2 }}>
        <button
          onClick={onExport}
          title={t.exportFlow}
          style={{
            padding: '8px 10px',
            background: colors.bgTertiary,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            borderRadius: '4px 0 0 4px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          {IconDownload({ size: 12 })} {t.export}
        </button>
        <button
          onClick={onImport}
          title={t.importFlow}
          style={{
            padding: '8px 10px',
            background: colors.bgTertiary,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            borderLeft: 'none',
            borderRadius: '0 4px 4px 0',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          {IconUpload({ size: 12 })} {t.import}
        </button>
      </div>
      {/* API 키 관리 */}
      <button
        onClick={onAPIKeys}
        title={t.apiKeys}
        style={{
          padding: '8px 12px',
          background: colors.bgTertiary,
          color: colors.textSecondary,
          border: `1px solid ${colors.border}`,
          borderRadius: 4,
          fontSize: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {IconKey({ size: 14 })} {t.apiKeys}
      </button>
      {executionState && (
        <div
          style={{
            padding: '8px 12px',
            background: executionState.status === 'success' ? '#28a745' :
                       executionState.status === 'error' ? '#dc3545' : '#6c757d',
            color: '#fff',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {executionState.status === 'success' ? t.completed :
           executionState.status === 'error' ? t.error : t.running}
        </div>
      )}
      <button
        onClick={onRun}
        disabled={isRunning}
        style={{
          padding: '10px 20px',
          background: isRunning ? '#4a5568' : '#3182ce',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 500,
          cursor: isRunning ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {isRunning ? t.running : t.runFlow}
      </button>
    </div>
  );
}
