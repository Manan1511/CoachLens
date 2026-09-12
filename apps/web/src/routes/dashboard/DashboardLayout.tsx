import { Navigate, NavLink, Outlet } from 'react-router';
import { LogoMark } from '@/components/icons';
import { useCoach } from '@/lib/auth/mock-auth';

/** The dashboard shell: a persistent sidebar (roster link, coach identity,
 *  sign out) and a content outlet. Deliberately not the marketing page's
 *  visual language — see DESIGN.md §7. No Lenis, no GSAP, no scroll
 *  choreography; native scroll, instant interaction.
 *
 *  Mobile-first: below the `sm` breakpoint the sidebar collapses into a
 *  slim top bar — there's only one nav item today (Roster), so a drawer
 *  would be more chrome than the content justifies. */
export function DashboardLayout() {
  const { coach, signOut } = useCoach();

  if (!coach) return <Navigate to="/app/login" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink sm:flex-row">
      <aside className="flex shrink-0 flex-row items-center justify-between border-b border-line px-md py-3 sm:w-60 sm:flex-col sm:items-stretch sm:justify-start sm:border-b-0 sm:border-r sm:py-lg">
        <NavLink
          to="/"
          className="flex items-center gap-2.5 text-body text-ink sm:mb-xl"
          aria-label="Back to CoachLens site"
        >
          <LogoMark className="size-5 shrink-0" />
          <span className="font-heading font-semibold tracking-[-0.02em]">
            <span className="font-normal">Coach</span>Lens
          </span>
        </NavLink>

        <nav className="flex flex-row gap-1 sm:flex-col">
          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-small font-medium transition-colors duration-200 ${
                isActive ? 'bg-white/6 text-ink' : 'text-ink-secondary hover:text-ink'
              }`
            }
          >
            Roster
          </NavLink>
        </nav>

        <div className="sm:mt-auto sm:border-t sm:border-line sm:pt-md">
          <p className="mb-0.5 hidden text-small font-medium text-ink sm:block">{coach.name}</p>
          <p className="mb-sm hidden truncate text-caption text-ink-dim sm:block">
            {coach.email}
          </p>
          <button
            type="button"
            onClick={signOut}
            className="text-caption font-semibold uppercase tracking-[0.08em] text-ink-dim transition-colors duration-200 hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-md py-md sm:px-xl sm:py-lg">
        <Outlet />
      </main>
    </div>
  );
}
