import { useFloatingCta } from '@/hooks/useFloatingCta';
import { scrollToSection } from '@/lib/lenis';

/** Was a bare div with cursor:pointer and no handler — now a real link. */
export function FloatingCta() {
  const visible = useFloatingCta();

  return (
    <a
      id="floating-cta"
      href="#cta"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`group fixed right-8 bottom-8 z-900 flex items-center gap-3 rounded-md border border-line bg-surface px-5 py-3 shadow-card backdrop-blur-[20px] transition-all duration-[800ms] ease-out-expo hover:border-accent hover:shadow-glow ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-[120px] opacity-0'
      }`}
      onClick={(e) => {
        e.preventDefault();
        scrollToSection('cta');
      }}
    >
      <span className="animate-pulse-dot size-2 rounded-full bg-ink" />
      <span className="text-small font-semibold">Request early access</span>
      <span className="text-ink-dim transition-colors duration-200 group-hover:text-accent">
        →
      </span>
    </a>
  );
}
