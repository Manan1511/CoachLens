import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { LogoMark, Wordmark } from '@/components/icons';
import { NAV_LINKS } from '@/content/nav';
import { useActiveSection } from '@/hooks/useActiveSection';
import { useStickyNav } from '@/hooks/useStickyNav';
import { scrollToSection } from '@/lib/lenis';
import { MobileMenu } from './MobileMenu';

const NAV_OFFSET = 20;

export function Nav() {
  const scrolled = useStickyNav();
  const [menuOpen, setMenuOpen] = useState(false);

  const ids = useMemo(() => NAV_LINKS.map((link) => link.id), []);
  const active = useActiveSection(ids);

  const goTo = (id: string) => {
    const navHeight = document.getElementById('nav')?.offsetHeight ?? 0;
    scrollToSection(id, navHeight + NAV_OFFSET);
    setMenuOpen(false);
  };

  return (
    <>
      <nav
        id="nav"
        className={`fixed inset-x-0 top-0 z-1000 border-b border-line bg-glass backdrop-blur-[20px] transition-[padding] duration-[400ms] ease-smooth ${
          scrolled ? 'py-3' : 'py-4'
        }`}
      >
        <div className="mx-auto flex max-w-(--container-max) items-center justify-between px-[var(--container-padding)]">
          <a
            href="#hero"
            className="flex items-center gap-2.5 text-[1.3rem] text-ink"
            aria-label="CoachLens home"
            onClick={(e) => {
              e.preventDefault();
              goTo('hero');
            }}
          >
            <LogoMark className="size-[26px] shrink-0" />
            <Wordmark className="font-heading font-semibold tracking-[-0.025em]" />
          </a>

          <div className="flex items-center gap-1 rounded-full border border-line bg-white/3 p-1 max-tablet:hidden">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                data-active={active === link.id}
                className="rounded-full px-4 py-2 text-small font-medium text-ink-secondary transition-all duration-200 ease-smooth hover:bg-ink hover:text-canvas data-[active=true]:bg-accent data-[active=true]:text-canvas"
                onClick={(e) => {
                  e.preventDefault();
                  goTo(link.id);
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 max-tablet:hidden">
            <Link
              to="/app/login"
              className="whitespace-nowrap rounded-full border border-line px-4 py-2 text-small font-medium text-ink-secondary transition-all duration-200 ease-smooth hover:border-ink hover:bg-ink hover:text-canvas"
            >
              Sign in
            </Link>
            <Link
              to="/app/login?mode=sign-up"
              className="whitespace-nowrap rounded-full border border-line px-4 py-2 text-small font-medium text-ink-secondary transition-all duration-200 ease-smooth hover:border-ink hover:bg-ink hover:text-canvas"
            >
              Sign up
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="hidden w-7 flex-col gap-[5px] py-1 max-tablet:flex"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span
                className={`block h-0.5 w-full origin-center rounded-[1px] bg-ink transition-all duration-[400ms] ease-smooth ${
                  menuOpen ? 'translate-x-[5px] translate-y-[5px] rotate-45' : ''
                }`}
              />
              <span
                className={`block h-0.5 w-full rounded-[1px] bg-ink transition-all duration-[400ms] ease-smooth ${
                  menuOpen ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`block h-0.5 w-full origin-center rounded-[1px] bg-ink transition-all duration-[400ms] ease-smooth ${
                  menuOpen ? 'translate-x-[5px] -translate-y-[5px] -rotate-45' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </nav>

      <MobileMenu open={menuOpen} onNavigate={goTo} />
    </>
  );
}
