/**
 * 공유 그림자 상수
 * UI 컴포넌트에서 일관된 그림자 스타일 사용
 */

export const SHADOWS = {
  /** 작은 그림자 - 툴팁, 작은 팝업 */
  small: '0 2px 8px rgba(0, 0, 0, 0.3)',

  /** 중간 그림자 - 드롭다운, 툴바, 패널 */
  medium: '0 4px 12px rgba(0, 0, 0, 0.3)',

  /** 중간 그림자 (진함) - 컨텍스트 메뉴, 프로퍼티 패널 */
  mediumDark: '0 4px 12px rgba(0, 0, 0, 0.4)',

  /** 큰 그림자 - 팔레트, 검색창 */
  large: '0 8px 24px rgba(0, 0, 0, 0.4)',

  /** 큰 그림자 (진함) - 모달, 다이얼로그 */
  largeDark: '0 8px 24px rgba(0, 0, 0, 0.5)',

  /** 매우 큰 그림자 - 히스토리 패널, 단축키 도움말 */
  xlarge: '0 16px 48px rgba(0, 0, 0, 0.5)',

  /** 초대형 그림자 - 온보딩 튜토리얼 */
  xxlarge: '0 24px 64px rgba(0, 0, 0, 0.5)',
} as const;

export type ShadowKey = keyof typeof SHADOWS;
