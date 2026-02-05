import { useState, useEffect } from 'react';

/**
 * Detects if the device has touch capability (phones, tablets, touch laptops)
 * Used for keyboard auto-focus prevention on touch devices
 */
export function useIsTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  useEffect(() => {
    // Re-check on mount in case SSR detection was wrong
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (hasTouch !== isTouchDevice) {
      setIsTouchDevice(hasTouch);
    }
  }, []);

  return isTouchDevice;
}
