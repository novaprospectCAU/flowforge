/**
 * z-Index 계층 상수
 * 일관된 레이어 순서를 위한 중앙 관리
 */

export const Z_INDEX = {
  /** 캔버스 위젯 레이어 */
  COMMENT_WIDGET: 5,      // 코멘트 위젯 (가장 낮음)
  NODE_WIDGET: 10,        // 노드 위젯

  /** 힌트/가이드 레이어 */
  CONTEXT_HINT: 50,       // 컨텍스트 힌트

  /** 툴바/컨트롤 레이어 */
  TOOLBAR: 100,           // 기본 툴바 (ZoomControls, SelectionBar, PropertyPanel 등)
  TOOLBAR_OVERLAY: 150,   // 툴바 오버레이
  FLOATING_MENU: 200,     // 플로팅 메뉴 (MobileToolbar 메뉴, TemplateBrowser)

  /** 모달/다이얼로그 레이어 */
  MODAL: 1000,            // 모달 (SearchDialog, HistoryPanel, ShortcutsHelp 등)
  TUTORIAL: 2000,         // 온보딩 튜토리얼

  /** 최상위 레이어 */
  ERROR: 9999,            // 에러 바운더리
  CRITICAL_MODAL: 10000,  // 중요 모달 (API Key 관리)
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;
