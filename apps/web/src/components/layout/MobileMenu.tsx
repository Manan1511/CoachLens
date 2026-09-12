import { useEffect } from 'react';
import { NAV_LINKS } from '@/content/nav';
import { getLenis } from '@/lib/lenis';

/** Full-screen overlay menu. Renders the same NAV_LINKS as the desktop
 *  nav, so the two can't drift apart the way they had. */
export function MobileMenu({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate: (id: string) => void;
}) {
  useEffect(() => {
    if (!open) return;

    const lenis = getLenis();
    lenis?.stop();
    document.body.style.overflow = 'hidden';

    return () => {
      lenis?.start();
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div
      id="mobile-menu"
      data-open={open}
      aria-hidden={!open}
      className={`fixed inset-0 z-999 flex flex-col justify-center bg-canvas p-[var(--container-padding)] transition-all duration-[800ms] ease-out-expo ${
        open ? 'visible opacity-100' : 'invisible opacity-0'
      }`}
    >
      {NAV_LINKS.map((link) => (
        <a
          key={link.id}
          href={`#${link.id}`}
          tabIndex={open ? 0 : -1}
          className="mobile-menu-link block py-2 font-heading text-menu-link font-normal text-ink-secondary hover:text-accent"
          onClick={(e) => {
            e.preventDefault();
            onNavigate(link.id);
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
