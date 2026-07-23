import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls window to top on every route change.
 * Mounted once inside <BrowserRouter>.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Use instant behaviour to avoid a slow slide on marketing pages.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}
