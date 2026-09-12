import { useRef } from 'react';
import { useCounter } from '@/hooks/useCounter';

/** Counts up from zero when it first scrolls into view. */
export function Counter({ target, symbol }: { target: number; symbol?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useCounter(ref, target);

  return (
    <>
      <span ref={ref}>0</span>
      {symbol && <span className="text-ink-dim">{symbol}</span>}
    </>
  );
}
