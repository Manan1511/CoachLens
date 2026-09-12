import { Link } from 'react-router';

/** Reserved for the coach dashboard. It consumes the same design tokens
 *  as the marketing page but is otherwise a separate surface — screens are
 *  built against services/coaching-api, not grown out of this page. */
export function DashboardPlaceholder() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-[var(--container-padding)]">
      <div className="max-w-[520px] text-center">
        <p className="mb-sm text-caption font-bold tracking-[0.12em] uppercase text-ink-dim">
          Coach dashboard
        </p>
        <h1 className="mb-md text-h1">Not built yet</h1>
        <p className="mb-lg text-ink-secondary">
          This route is reserved for the coach review surface. Nothing here talks to the
          API yet.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-xs rounded-full border border-white/28 px-7 py-3.5 text-small font-medium transition-all duration-[400ms] ease-smooth hover:border-ink hover:bg-white/6"
        >
          Back to the site
        </Link>
      </div>
    </main>
  );
}
