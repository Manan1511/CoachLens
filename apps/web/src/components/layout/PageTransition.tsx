import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps route views in a smooth fade + upward-glide page transition
 * and resets scroll position on navigation.
 */
export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div key={pathname} className={`page-transition ${className}`}>
      {children}
    </div>
  );
}
