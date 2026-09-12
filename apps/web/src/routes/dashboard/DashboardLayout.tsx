import { Navigate, NavLink, Outlet } from 'react-router';
import { LogoMark } from '@/components/icons';
import { useCoach } from '@/lib/auth/mock-auth';

/** The dashboard shell: a floating top nav (not a sidebar) and a full-width
 *  content outlet. Deliberately not the marketing page's visual language —
 *  see DESIGN.md §7 — but it borrows the marketing nav's one proven
 *  pattern: a detached pill bar rather than an edge-to-edge one, which
 *  reads lighter than a docked toolbar. No Lenis, no GSAP, no scroll
 *  choreography; native scroll, instant interaction. */
export function DashboardLayout() {
  const { coach, signOut } = useCoach();

  if (!coach) return <Navigate to="/app/login" replace />;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="fixed inset-x-0 top-4 z-1000 flex justify-center px-md">
        <nav className="flex w-full max-w-[52rem] items-center justify-between gap-md rounded-full border border-line bg-glass px-md py-2.5 backdrop-blur-[20px]">
          <NavLink
            to="/"
            className="flex shrink-0 items-center gap-2 text-body text-ink"
            aria-label="Back to CoachLens site"
          >
            <LogoMark className="size-5 shrink-0" />
            <span className="hidden font-heading font-semibold tracking-[-0.02em] sm:inline">
              <span className="font-normal">Coach</span>Lens
            </span>
          </NavLink>

          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `rounded-full px-3.5 py-1.5 text-small font-medium transition-colors duration-200 ${
                isActive ? 'bg-white/8 text-ink' : 'text-ink-secondary hover:text-ink'
              }`
            }
          >
            Roster
          </NavLink>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden truncate text-small text-ink-secondary sm:inline">
              {coach.name}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="text-caption font-semibold uppercase tracking-[0.08em] text-ink-dim transition-colors duration-200 hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </nav>
      </header>

      {/* No max-width here — pages set their own, since the athlete page
          needs a wider three-column layout than the roster/report pages. */}
      <main className="px-md pt-24 pb-2xl sm:pt-28">
        <Outlet />
      </main>
    </div>
  );
}
