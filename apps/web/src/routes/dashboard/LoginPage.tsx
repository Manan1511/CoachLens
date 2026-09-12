import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { LogoMark, Wordmark } from '@/components/icons';
import { useCoach } from '@/lib/auth/coach-auth';

type Mode = 'sign-in' | 'sign-up';

/** Real Supabase Auth — coaching/auth.py verifies the resulting access
 *  token on every request. Sign-up creates a real coach account in this
 *  Supabase project; if the project has email confirmation on (the
 *  default), the new coach lands on a "check your email" state instead of
 *  straight into the dashboard, since there's no session to sign in to
 *  until they click that link. */
export function LoginPage() {
  const { coach, loading, signIn, signUp } = useCoach();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (coach) return <Navigate to="/app" replace />;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNeedsConfirmation(false);
    setConfirmPassword('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (mode === 'sign-up' && password !== confirmPassword) {
      setError('Passwords don’t match.');
      return;
    }

    setSubmitting(true);
    if (mode === 'sign-in') {
      const { error: signInError } = await signIn(email.trim(), password);
      setSubmitting(false);
      if (signInError) {
        setError(signInError);
        return;
      }
      navigate('/app');
    } else {
      const { error: signUpError, needsConfirmation: pending } = await signUp(
        email.trim(),
        password,
      );
      setSubmitting(false);
      if (signUpError) {
        setError(signUpError);
        return;
      }
      if (pending) {
        setNeedsConfirmation(true);
        return;
      }
      navigate('/app');
    }
  };

  if (needsConfirmation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-[var(--container-padding)]">
        <div className="w-full max-w-[24rem]">
        <Link to="/" className="mb-md inline-block text-small text-ink-secondary hover:text-ink">
          ← Back to site
        </Link>
        <div className="rounded-lg border border-line bg-surface p-lg text-center">
          <div className="mb-lg flex items-center justify-center gap-2.5">
            <LogoMark className="size-6 shrink-0 text-ink" />
            <Wordmark className="font-heading text-h4 font-semibold tracking-[-0.02em] text-ink" />
          </div>
          <p className="mb-sm text-body text-ink">Check your email</p>
          <p className="text-small text-ink-secondary">
            We sent a confirmation link to <span className="text-ink">{email}</span>. Follow it,
            then sign in here.
          </p>
          <button
            type="button"
            onClick={() => switchMode('sign-in')}
            className="mt-md text-small text-ink-secondary underline hover:text-ink"
          >
            Back to sign in
          </button>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-[var(--container-padding)]">
      <div className="w-full max-w-[24rem]">
        <Link
          to="/"
          className="mb-md inline-block text-small text-ink-secondary hover:text-ink"
        >
          ← Back to site
        </Link>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-line bg-surface p-lg"
        >
        <div className="mb-lg flex items-center gap-2.5">
          <LogoMark className="size-6 shrink-0 text-ink" />
          <Wordmark className="font-heading text-h4 font-semibold tracking-[-0.02em] text-ink" />
        </div>

        <div className="mb-md flex gap-1 rounded-full border border-line bg-canvas p-1">
          <button
            type="button"
            onClick={() => switchMode('sign-in')}
            className={`flex-1 rounded-full py-1.5 text-caption font-semibold uppercase tracking-[0.08em] transition-colors ${
              mode === 'sign-in' ? 'bg-white/8 text-ink' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchMode('sign-up')}
            className={`flex-1 rounded-full py-1.5 text-caption font-semibold uppercase tracking-[0.08em] transition-colors ${
              mode === 'sign-up' ? 'bg-white/8 text-ink' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            Sign up
          </button>
        </div>

        <label className="mb-sm block">
          <span className="mb-1 block text-small text-ink-secondary">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-body text-ink outline-none focus-visible:border-line-strong"
            placeholder="jordan@academy.dev"
          />
        </label>

        <label className={mode === 'sign-up' ? 'mb-sm block' : 'mb-lg block'}>
          <span className="mb-1 block text-small text-ink-secondary">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-body text-ink outline-none focus-visible:border-line-strong"
          />
        </label>

        {mode === 'sign-up' && (
          <label className="mb-lg block">
            <span className="mb-1 block text-small text-ink-secondary">Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-body text-ink outline-none focus-visible:border-line-strong"
            />
          </label>
        )}

        {error && <p className="mb-sm text-small text-status-red">{error}</p>}

        <Button
          as="button"
          type="submit"
          className={`w-full justify-center ${submitting ? 'opacity-40' : ''}`}
        >
          {submitting
            ? mode === 'sign-in'
              ? 'Signing in…'
              : 'Creating account…'
            : mode === 'sign-in'
              ? 'Sign in'
              : 'Create account'}
        </Button>
        </form>
      </div>
    </div>
  );
}
