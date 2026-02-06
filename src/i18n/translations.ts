// FlowForge translations

import type { Language } from './index';

// ============ Onboarding Tutorial ============
export const onboardingTranslations: Record<Language, {
  steps: Array<{
    title: string;
    description: string;
    icon: string;
    tips: string[];
  }>;
  skipButton: string;
  backButton: string;
  nextButton: string;
  getStartedButton: string;
}> = {
  en: {
    steps: [
      {
        title: 'Welcome to FlowForge!',
        description: 'FlowForge is a visual node editor for building AI workflows. Let\'s learn the basics.',
        icon: '👋',
        tips: [
          'Create flows by connecting nodes',
          'Each node performs a specific operation',
          'Data flows from left to right',
        ],
      },
      {
        title: 'Adding Nodes',
        description: 'Press Tab or double-click on the canvas to open the node palette and add new nodes.',
        icon: '➕',
        tips: [
          'Tab → Opens node search palette',
          'Type to search for nodes',
          'Click to add the selected node',
        ],
      },
      {
        title: 'Connecting Nodes',
        description: 'Drag from an output port (right side) to an input port (left side) to connect nodes.',
        icon: '🔗',
        tips: [
          'Ports show compatible connections in green',
          'Data types must match (or use "any")',
          'Click an edge to delete it',
        ],
      },
      {
        title: 'Navigation',
        description: 'Navigate around your canvas easily with these controls.',
        icon: '🧭',
        tips: [
          'Space + Drag → Pan canvas',
          'Scroll → Zoom in/out',
          'F → Fit all nodes in view',
        ],
      },
      {
        title: 'Organizing',
        description: 'Keep your flows organized with groups and subflows.',
        icon: '📁',
        tips: [
          'Ctrl+G → Group selected nodes',
          'Ctrl+Shift+G → Create subflow (2+ nodes)',
          'C → Add a comment/sticky note',
        ],
      },
      {
        title: 'Running Flows',
        description: 'Execute your flow to see the results. Node borders show execution status.',
        icon: '▶️',
        tips: [
          'Click Run button to execute',
          'Yellow = Running',
          'Green = Success, Red = Error',
        ],
      },
      {
        title: 'You\'re Ready!',
        description: 'That\'s the basics! Press ? anytime to see all keyboard shortcuts.',
        icon: '🎉',
        tips: [
          'Ctrl+S → Save your flow',
          '? → Show all shortcuts',
          'Have fun building!',
        ],
      },
    ],
    skipButton: 'Skip Tutorial',
    backButton: 'Back',
    nextButton: 'Next',
    getStartedButton: 'Get Started',
  },
  ko: {
    steps: [
      {
        title: 'FlowForge에 오신 것을 환영합니다!',
        description: 'FlowForge는 AI 워크플로우를 만들기 위한 비주얼 노드 에디터입니다. 기본 사용법을 알아봅시다.',
        icon: '👋',
        tips: [
          '노드를 연결하여 플로우를 만듭니다',
          '각 노드는 특정 작업을 수행합니다',
          '데이터는 왼쪽에서 오른쪽으로 흐릅니다',
        ],
      },
      {
        title: '노드 추가하기',
        description: 'Tab 키를 누르거나 캔버스를 더블클릭하여 노드 팔레트를 열고 새 노드를 추가하세요.',
        icon: '➕',
        tips: [
          'Tab → 노드 검색 팔레트 열기',
          '입력하여 노드 검색',
          '클릭하여 선택한 노드 추가',
        ],
      },
      {
        title: '노드 연결하기',
        description: '출력 포트(오른쪽)에서 입력 포트(왼쪽)로 드래그하여 노드를 연결하세요.',
        icon: '🔗',
        tips: [
          '호환 가능한 포트는 초록색으로 표시됩니다',
          '데이터 타입이 일치해야 합니다 (또는 "any" 사용)',
          '엣지를 클릭하면 삭제됩니다',
        ],
      },
      {
        title: '화면 이동',
        description: '이 컨트롤로 캔버스를 쉽게 탐색할 수 있습니다.',
        icon: '🧭',
        tips: [
          'Space + 드래그 → 캔버스 이동',
          '스크롤 → 확대/축소',
          'F → 모든 노드를 화면에 맞춤',
        ],
      },
      {
        title: '정리하기',
        description: '그룹과 서브플로우로 플로우를 깔끔하게 정리하세요.',
        icon: '📁',
        tips: [
          'Ctrl+G → 선택한 노드 그룹화',
          'Ctrl+Shift+G → 서브플로우 생성 (2개 이상 노드)',
          'C → 코멘트/메모 추가',
        ],
      },
      {
        title: '플로우 실행하기',
        description: '플로우를 실행하여 결과를 확인하세요. 노드 테두리가 실행 상태를 보여줍니다.',
        icon: '▶️',
        tips: [
          'Run 버튼 클릭으로 실행',
          '노란색 = 실행 중',
          '초록색 = 성공, 빨간색 = 오류',
        ],
      },
      {
        title: '준비 완료!',
        description: '기본 사용법을 모두 배웠습니다! ? 키를 누르면 언제든 모든 단축키를 볼 수 있습니다.',
        icon: '🎉',
        tips: [
          'Ctrl+S → 플로우 저장',
          '? → 모든 단축키 보기',
          '즐겁게 만들어보세요!',
        ],
      },
    ],
    skipButton: '튜토리얼 건너뛰기',
    backButton: '이전',
    nextButton: '다음',
    getStartedButton: '시작하기',
  },
};

// ============ Shortcuts Help ============
export const shortcutsTranslations: Record<Language, {
  title: string;
  closeHint: string;
  groups: Array<{
    title: string;
    shortcuts: Array<{ keys: string; description: string }>;
  }>;
}> = {
  en: {
    title: 'Keyboard Shortcuts & Help',
    closeHint: 'Press {escape} or {question} to close',
    groups: [
      {
        title: 'File',
        shortcuts: [
          { keys: 'Ctrl+S', description: 'Save flow to file' },
          { keys: 'Ctrl+O', description: 'Open flow from file' },
          { keys: 'Ctrl+N', description: 'New flow (clear all)' },
          { keys: 'Ctrl+Shift+E', description: 'Export as PNG image' },
        ],
      },
      {
        title: 'General',
        shortcuts: [
          { keys: 'Ctrl+Z', description: 'Undo' },
          { keys: 'Ctrl+Y', description: 'Redo' },
          { keys: 'Ctrl+H', description: 'Show history panel' },
          { keys: 'Ctrl+A', description: 'Select all nodes' },
          { keys: 'Escape', description: 'Deselect / Close menus' },
          { keys: 'Delete', description: 'Delete selected' },
          { keys: '? / F1', description: 'Show this help' },
        ],
      },
      {
        title: 'Clipboard',
        shortcuts: [
          { keys: 'Ctrl+C', description: 'Copy (nodes, groups, comments)' },
          { keys: 'Ctrl+V', description: 'Paste to viewport center' },
          { keys: 'Ctrl+D', description: 'Duplicate selected' },
        ],
      },
      {
        title: 'Navigation',
        shortcuts: [
          { keys: 'Space+Drag', description: 'Pan canvas (Figma style)' },
          { keys: 'Middle Drag', description: 'Pan canvas' },
          { keys: 'Alt+Drag', description: 'Pan canvas' },
          { keys: 'Scroll', description: 'Zoom in/out' },
          { keys: 'Ctrl+0', description: 'Reset zoom to 100%' },
          { keys: 'F', description: 'Fit view (selection or all)' },
          { keys: 'Ctrl+F', description: 'Search nodes' },
          { keys: '[ / ]', description: 'Previous/next node' },
          { keys: 'Arrows', description: 'Select nearest node' },
          { keys: 'Enter', description: 'Center on selection' },
        ],
      },
      {
        title: 'Nodes',
        shortcuts: [
          { keys: 'Tab', description: 'Open node palette' },
          { keys: 'Double-click', description: 'Quick add node' },
          { keys: 'Arrow Keys', description: 'Move nodes (grid snap)' },
          { keys: 'Shift+Arrows', description: 'Move nodes by 1px' },
          { keys: 'G', description: 'Toggle snap to grid' },
        ],
      },
      {
        title: 'Alignment',
        shortcuts: [
          { keys: 'Alt+←/→', description: 'Align left/right' },
          { keys: 'Alt+↑/↓', description: 'Align top/bottom' },
          { keys: 'Ctrl+Shift+H', description: 'Distribute horizontal' },
          { keys: 'Ctrl+Shift+V', description: 'Distribute vertical' },
          { keys: 'Ctrl+Shift+A', description: 'Auto-layout selected' },
          { keys: 'Alt+A', description: 'Auto-layout all nodes' },
        ],
      },
      {
        title: 'Selection',
        shortcuts: [
          { keys: 'Click', description: 'Select node' },
          { keys: 'Shift+Click', description: 'Add to selection' },
          { keys: 'Drag (empty)', description: 'Box select' },
          { keys: 'Shift+Box', description: 'Add box to selection' },
        ],
      },
      {
        title: 'Groups',
        shortcuts: [
          { keys: 'Ctrl+G', description: 'Group selected nodes' },
          { keys: 'Ctrl+Shift+U', description: 'Ungroup' },
          { keys: 'Group header', description: 'Click to select all' },
        ],
      },
      {
        title: 'Subflows',
        shortcuts: [
          { keys: 'Ctrl+Shift+G', description: 'Create subflow (2+ nodes)' },
          { keys: 'Double-click', description: 'Expand/collapse subflow' },
          { keys: 'T', description: 'Open template browser' },
        ],
      },
      {
        title: 'Comments',
        shortcuts: [
          { keys: 'C', description: 'Add comment/sticky note' },
          { keys: 'Drag edges', description: 'Resize comment' },
        ],
      },
      {
        title: 'Execution',
        shortcuts: [
          { keys: 'Run button', description: 'Execute flow' },
          { keys: 'Yellow border', description: 'Node running' },
          { keys: 'Green border', description: 'Node completed' },
          { keys: 'Red border', description: 'Node error' },
        ],
      },
    ],
  },
  ko: {
    title: '키보드 단축키 & 도움말',
    closeHint: '{escape} 또는 {question} 키를 눌러 닫기',
    groups: [
      {
        title: '파일',
        shortcuts: [
          { keys: 'Ctrl+S', description: '플로우를 파일로 저장' },
          { keys: 'Ctrl+O', description: '파일에서 플로우 열기' },
          { keys: 'Ctrl+N', description: '새 플로우 (모두 삭제)' },
          { keys: 'Ctrl+Shift+E', description: 'PNG 이미지로 내보내기' },
        ],
      },
      {
        title: '일반',
        shortcuts: [
          { keys: 'Ctrl+Z', description: '실행 취소' },
          { keys: 'Ctrl+Y', description: '다시 실행' },
          { keys: 'Ctrl+H', description: '히스토리 패널 표시' },
          { keys: 'Ctrl+A', description: '모든 노드 선택' },
          { keys: 'Escape', description: '선택 해제 / 메뉴 닫기' },
          { keys: 'Delete', description: '선택 항목 삭제' },
          { keys: '? / F1', description: '이 도움말 표시' },
        ],
      },
      {
        title: '클립보드',
        shortcuts: [
          { keys: 'Ctrl+C', description: '복사 (노드, 그룹, 코멘트)' },
          { keys: 'Ctrl+V', description: '뷰포트 중앙에 붙여넣기' },
          { keys: 'Ctrl+D', description: '선택 항목 복제' },
        ],
      },
      {
        title: '화면 이동',
        shortcuts: [
          { keys: 'Space+드래그', description: '캔버스 이동 (Figma 스타일)' },
          { keys: '휠 클릭 드래그', description: '캔버스 이동' },
          { keys: 'Alt+드래그', description: '캔버스 이동' },
          { keys: '스크롤', description: '확대/축소' },
          { keys: 'Ctrl+0', description: '줌 100%로 리셋' },
          { keys: 'F', description: '화면에 맞춤 (선택 또는 전체)' },
          { keys: 'Ctrl+F', description: '노드 검색' },
          { keys: '[ / ]', description: '이전/다음 노드' },
          { keys: '화살표', description: '가장 가까운 노드 선택' },
          { keys: 'Enter', description: '선택 항목으로 이동' },
        ],
      },
      {
        title: '노드',
        shortcuts: [
          { keys: 'Tab', description: '노드 팔레트 열기' },
          { keys: '더블클릭', description: '빠른 노드 추가' },
          { keys: '화살표 키', description: '노드 이동 (그리드 스냅)' },
          { keys: 'Shift+화살표', description: '노드 1px 이동' },
          { keys: 'G', description: '그리드 스냅 토글' },
        ],
      },
      {
        title: '정렬',
        shortcuts: [
          { keys: 'Alt+←/→', description: '왼쪽/오른쪽 정렬' },
          { keys: 'Alt+↑/↓', description: '위/아래 정렬' },
          { keys: 'Ctrl+Shift+H', description: '수평 분배' },
          { keys: 'Ctrl+Shift+V', description: '수직 분배' },
          { keys: 'Ctrl+Shift+A', description: '선택 노드 자동 정렬' },
          { keys: 'Alt+A', description: '모든 노드 자동 정렬' },
        ],
      },
      {
        title: '선택',
        shortcuts: [
          { keys: '클릭', description: '노드 선택' },
          { keys: 'Shift+클릭', description: '선택에 추가' },
          { keys: '드래그 (빈 공간)', description: '박스 선택' },
          { keys: 'Shift+박스', description: '박스를 선택에 추가' },
        ],
      },
      {
        title: '그룹',
        shortcuts: [
          { keys: 'Ctrl+G', description: '선택한 노드 그룹화' },
          { keys: 'Ctrl+Shift+U', description: '그룹 해제' },
          { keys: '그룹 헤더', description: '클릭하여 모두 선택' },
        ],
      },
      {
        title: '서브플로우',
        shortcuts: [
          { keys: 'Ctrl+Shift+G', description: '서브플로우 생성 (2개 이상 노드)' },
          { keys: '더블클릭', description: '서브플로우 펼치기/접기' },
          { keys: 'T', description: '템플릿 브라우저 열기' },
        ],
      },
      {
        title: '코멘트',
        shortcuts: [
          { keys: 'C', description: '코멘트/메모 추가' },
          { keys: '가장자리 드래그', description: '코멘트 크기 조절' },
        ],
      },
      {
        title: '실행',
        shortcuts: [
          { keys: 'Run 버튼', description: '플로우 실행' },
          { keys: '노란색 테두리', description: '노드 실행 중' },
          { keys: '초록색 테두리', description: '노드 완료' },
          { keys: '빨간색 테두리', description: '노드 오류' },
        ],
      },
    ],
  },
};

// ============ Context Hints ============
export const contextHintsTranslations: Record<Language, {
  emptyCanvas: { text: string; shortcut?: string }[];
  emptyCanvasWithTemplates: { text: string; shortcut?: string }[];
  noSelection: { text: string; shortcut?: string }[];
  singleSelection: { text: string; shortcut?: string }[];
  multiSelection: { text: string; shortcut?: string }[];
  showShortcuts: { text: string; shortcut?: string };
}> = {
  en: {
    emptyCanvas: [
      { text: 'Press Tab or double-click to add nodes', shortcut: 'Tab' },
    ],
    emptyCanvasWithTemplates: [
      { text: 'Press T to insert from templates', shortcut: 'T' },
    ],
    noSelection: [
      { text: 'Click to select, drag to pan' },
      { text: 'Tab to add nodes', shortcut: 'Tab' },
    ],
    singleSelection: [
      { text: 'Drag to move, Shift+click to multi-select' },
      { text: 'Delete to remove', shortcut: 'Del' },
    ],
    multiSelection: [
      { text: 'Ctrl+G to group', shortcut: 'Ctrl+G' },
      { text: 'Ctrl+Shift+G to create subflow', shortcut: 'Ctrl+Shift+G' },
      { text: 'Alt+arrows to align' },
    ],
    showShortcuts: { text: 'Press ? for all shortcuts', shortcut: '?' },
  },
  ko: {
    emptyCanvas: [
      { text: 'Tab 또는 더블클릭으로 노드 추가', shortcut: 'Tab' },
    ],
    emptyCanvasWithTemplates: [
      { text: 'T 키로 템플릿에서 삽입', shortcut: 'T' },
    ],
    noSelection: [
      { text: '클릭으로 선택, 드래그로 이동' },
      { text: 'Tab으로 노드 추가', shortcut: 'Tab' },
    ],
    singleSelection: [
      { text: '드래그로 이동, Shift+클릭으로 다중 선택' },
      { text: 'Delete로 삭제', shortcut: 'Del' },
    ],
    multiSelection: [
      { text: 'Ctrl+G로 그룹화', shortcut: 'Ctrl+G' },
      { text: 'Ctrl+Shift+G로 서브플로우 생성', shortcut: 'Ctrl+Shift+G' },
      { text: 'Alt+화살표로 정렬' },
    ],
    showShortcuts: { text: '? 키로 모든 단축키 보기', shortcut: '?' },
  },
};

// ============ UI Labels ============
export const uiTranslations: Record<Language, {
  // Toolbar
  undo: string;
  redo: string;
  saved: string;
  saving: string;
  unsaved: string;
  gridOn: string;
  gridOff: string;
  run: string;
  running: string;
  help: string;
  // Zoom controls
  zoomIn: string;
  zoomOut: string;
  fitView: string;
  // Selection bar
  selected: string;
  nodes: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  distributeH: string;
  distributeV: string;
  group: string;
  duplicate: string;
  delete: string;
  // Context menu
  addNode: string;
  deleteNode: string;
  duplicateNode: string;
  createSubflow: string;
  collapseSubflow: string;
  expandSubflow: string;
  deleteSubflow: string;
  addComment: string;
  // Node palette
  searchNodes: string;
  // Search dialog
  searchPlaceholder: string;
  noResults: string;
  // Template browser
  templates: string;
  insertTemplate: string;
  deleteTemplate: string;
  noTemplates: string;
  // Subflow panel
  subflowInputs: string;
  subflowOutputs: string;
  saveAsTemplate: string;
  removePort: string;
  // Property panel
  properties: string;
  nodeId: string;
  position: string;
  size: string;
  // Language
  language: string;
}> = {
  en: {
    undo: 'Undo',
    redo: 'Redo',
    saved: 'Saved',
    saving: 'Saving...',
    unsaved: 'Unsaved',
    gridOn: 'Grid: ON',
    gridOff: 'Grid: OFF',
    run: 'Run',
    running: 'Running...',
    help: 'Help',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    fitView: 'Fit View',
    selected: 'selected',
    nodes: 'nodes',
    alignLeft: 'Align Left',
    alignCenter: 'Align Center',
    alignRight: 'Align Right',
    distributeH: 'Distribute Horizontally',
    distributeV: 'Distribute Vertically',
    group: 'Group',
    duplicate: 'Duplicate',
    delete: 'Delete',
    addNode: 'Add Node',
    deleteNode: 'Delete',
    duplicateNode: 'Duplicate',
    createSubflow: 'Create Subflow',
    collapseSubflow: 'Collapse Subflow',
    expandSubflow: 'Expand Subflow',
    deleteSubflow: 'Delete Subflow',
    addComment: 'Add Comment',
    searchNodes: 'Search nodes...',
    searchPlaceholder: 'Search by name or type...',
    noResults: 'No results',
    templates: 'Templates',
    insertTemplate: 'Insert',
    deleteTemplate: 'Delete',
    noTemplates: 'No templates saved yet',
    subflowInputs: 'Inputs',
    subflowOutputs: 'Outputs',
    saveAsTemplate: 'Save as Template',
    removePort: 'Remove',
    properties: 'Properties',
    nodeId: 'Node ID',
    position: 'Position',
    size: 'Size',
    language: 'Language',
  },
  ko: {
    undo: '실행 취소',
    redo: '다시 실행',
    saved: '저장됨',
    saving: '저장 중...',
    unsaved: '저장 안됨',
    gridOn: '그리드: ON',
    gridOff: '그리드: OFF',
    run: '실행',
    running: '실행 중...',
    help: '도움말',
    zoomIn: '확대',
    zoomOut: '축소',
    fitView: '화면에 맞춤',
    selected: '선택됨',
    nodes: '개 노드',
    alignLeft: '왼쪽 정렬',
    alignCenter: '가운데 정렬',
    alignRight: '오른쪽 정렬',
    distributeH: '수평 분배',
    distributeV: '수직 분배',
    group: '그룹',
    duplicate: '복제',
    delete: '삭제',
    addNode: '노드 추가',
    deleteNode: '삭제',
    duplicateNode: '복제',
    createSubflow: '서브플로우 생성',
    collapseSubflow: '서브플로우 접기',
    expandSubflow: '서브플로우 펼치기',
    deleteSubflow: '서브플로우 삭제',
    addComment: '코멘트 추가',
    searchNodes: '노드 검색...',
    searchPlaceholder: '이름 또는 타입으로 검색...',
    noResults: '결과 없음',
    templates: '템플릿',
    insertTemplate: '삽입',
    deleteTemplate: '삭제',
    noTemplates: '저장된 템플릿이 없습니다',
    subflowInputs: '입력',
    subflowOutputs: '출력',
    saveAsTemplate: '템플릿으로 저장',
    removePort: '제거',
    properties: '속성',
    nodeId: '노드 ID',
    position: '위치',
    size: '크기',
    language: '언어',
  },
};
