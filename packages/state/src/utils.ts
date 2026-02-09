/**
 * 공통 유틸리티 및 상수
 */

/**
 * localStorage/IndexedDB 키 상수
 */
export const STORAGE_KEYS = {
  /** 플로우 자동 저장 */
  AUTOSAVE: 'flowforge_autosave',
  /** 서브플로우 템플릿 */
  SUBFLOW_TEMPLATES: 'flowforge-subflow-templates',
  /** 온보딩 완료 여부 */
  ONBOARDING_COMPLETED: 'flowforge-onboarding-completed',
  /** 언어 설정 */
  LANGUAGE: 'flowforge-language',
  /** 팩 상태 */
  PACK_STATES: 'flowforge-pack-states',
} as const;

/**
 * IndexedDB 설정 상수
 */
export const DB_CONFIG = {
  /** AI 모듈 DB 이름 */
  AI_DB_NAME: 'flowforge-ai',
  /** AI 모듈 DB 버전 */
  AI_DB_VERSION: 1,
  /** 로컬 키 암호화 솔트 */
  LOCAL_KEY_SALT: 'flowforge-local-key-v1',
} as const;

/**
 * 고유 ID 생성
 * @param prefix - ID 접두사 (예: 'node', 'edge', 'group')
 * @param includeRandom - 랜덤 문자열 포함 여부 (충돌 방지 강화)
 * @returns 고유 ID 문자열
 */
export function generateId(prefix: string, includeRandom = true): string {
  const timestamp = Date.now();
  if (includeRandom) {
    const random = Math.random().toString(36).slice(2, 7);
    return `${prefix}-${timestamp}-${random}`;
  }
  return `${prefix}-${timestamp}`;
}
