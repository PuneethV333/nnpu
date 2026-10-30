import { useEffect } from 'react';

const SUFFIX = 'NNPU Academy';

/**
 * Sets `document.title` for the current screen. The browser tab is part of the
 * interface: "Sign in" and "Dashboard" are how someone finds this tab again
 * among twenty.
 */
export const usePageTitle = (title: string): void => {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · ${SUFFIX}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
};
