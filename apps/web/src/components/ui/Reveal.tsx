import { useRef, type ElementType, type ReactNode } from 'react';
import { useReveal } from '@/hooks/useReveal';

/** Fades and lifts its children in on first scroll into view. */
export function Reveal({
  as,
  className = '',
  children,
  ...rest
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  [key: string]: unknown;
}) {
  const Tag = as ?? 'div';
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);

  return (
    <Tag ref={ref} className={`reveal ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/** Same, but its direct children come in on a stagger. */
export function Stagger({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, 'top 80%');

  return (
    <div ref={ref} className={`stagger ${className}`}>
      {children}
    </div>
  );
}
