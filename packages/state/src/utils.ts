/**
 * 공통 유틸리티 함수
 */

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
