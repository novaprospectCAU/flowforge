import { useEffect, RefObject } from 'react';

/**
 * 요소 외부 클릭 감지 훅
 * @param ref - 감지할 요소의 ref
 * @param handler - 외부 클릭 시 호출할 콜백
 * @param enabled - 활성화 여부 (기본값: true)
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, handler, enabled]);
}

/**
 * Escape 키 감지 훅
 * @param handler - Escape 키 누를 때 호출할 콜백
 * @param enabled - 활성화 여부 (기본값: true)
 */
export function useEscapeKey(
  handler: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handler();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handler, enabled]);
}
