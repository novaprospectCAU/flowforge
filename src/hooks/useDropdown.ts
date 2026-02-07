import { useState, useRef, useCallback, RefObject } from 'react';
import { useClickOutside } from './useClickOutside';

interface UseDropdownResult<T extends HTMLElement> {
  /** 드롭다운 열림 상태 */
  isOpen: boolean;
  /** 드롭다운 열기 */
  open: () => void;
  /** 드롭다운 닫기 */
  close: () => void;
  /** 드롭다운 토글 */
  toggle: () => void;
  /** 드롭다운 요소에 연결할 ref */
  ref: RefObject<T>;
}

/**
 * 드롭다운 상태 관리 훅
 * - 열림/닫힘 상태 관리
 * - 외부 클릭 시 자동 닫힘
 * - ref 자동 생성
 *
 * @example
 * ```tsx
 * const dropdown = useDropdown<HTMLDivElement>();
 *
 * return (
 *   <div ref={dropdown.ref}>
 *     <button onClick={dropdown.toggle}>Toggle</button>
 *     {dropdown.isOpen && <Menu />}
 *   </div>
 * );
 * ```
 */
export function useDropdown<T extends HTMLElement = HTMLDivElement>(): UseDropdownResult<T> {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<T>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  useClickOutside(ref, close, isOpen);

  return {
    isOpen,
    open,
    close,
    toggle,
    ref,
  };
}
