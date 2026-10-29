import { useCallback, useRef } from 'react';

/** How long after the first tap a second one still counts as a double tap. */
const DOUBLE_TAP_WINDOW_MS = 300;

/**
 * Returns an `onPress` handler that fires only on a double tap.
 *
 * Deliberately plain `Pressable` timing rather than
 * `Gesture.Tap().numberOfTaps(2)` from react-native-gesture-handler: that
 * gesture only works under a `GestureHandlerRootView`, which this app does not
 * mount at its root, and a gesture that silently never fires is exactly the
 * kind of bug a profile screen would ship with unnoticed.
 *
 * The timestamp is reset when the pair completes so a third tap starts a fresh
 * pair instead of firing again off the second one.
 */
export const useDoubleTap = (onDoubleTap: () => void): (() => void) => {
  const lastTapAt = useRef(0);

  return useCallback(() => {
    const now = Date.now();

    if (now - lastTapAt.current < DOUBLE_TAP_WINDOW_MS) {
      lastTapAt.current = 0;
      onDoubleTap();
      return;
    }

    lastTapAt.current = now;
  }, [onDoubleTap]);
};
