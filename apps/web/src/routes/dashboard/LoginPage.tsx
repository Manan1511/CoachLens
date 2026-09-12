import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { LogoMark } from '@/components/icons';
import { useCoach } from '@/lib/auth/mock-auth';

/** Stands in for Supabase Auth's sign-in — see lib/auth/mock-auth.tsx. No
 *  password check; this exists so the dashboard has a coach identity to
 *  attribute actions and baseline confirmations to. */
export function LoginPage() {
  const { coach, signIn } = useCoach();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  if (coach) return <Navigate to="/app" replace />;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    signIn(name.trim(), email.trim());
    navigate('/app');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-[var(--container-padding)]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[24rem] rounded-lg border border-line bg-surface p-lg"
      >
        <div className="mb-lg flex items-center gap-2.5">
          <LogoMark className="size-6 shrink-0 text-ink" />
          <span className="font-heading text-h4 font-semibold tracking-[-0.02em] text-ink">
            <span className="font-normal">Coach</span>Lens
          </span>
        </div>

        <p className="mb-md text-caption font-bold uppercase tracking-[0.12em] text-ink-dim">
          Coach sign in
        </p>

        <label className="mb-sm block">
          <span className="mb-1 block text-small text-ink-secondary">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-body text-ink outline-none focus-visible:border-line-strong"
            placeholder="Jordan Smith"
          />
        </label>

        <label className="mb-lg block">
          <span className="mb-1 block text-small text-ink-secondary">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-body text-ink outline-none focus-visible:border-line-strong"
            placeholder="jordan@academy.dev"
          />
        </label>

        <Button as="button" type="submit" className="w-full justify-center">
          Sign in
        </Button>

        <p className="mt-md text-caption text-ink-dim">
          Demo sign-in only — no password check yet. Any name and email works.
        </p>
      </form>
    </div>
  );
}
