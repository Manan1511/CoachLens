import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
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
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'sign-up' ? 'sign-up' : 'sign-in');
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
    // items-center still centers a card that fits; overflow-y-auto means a
    // card taller than the viewport (sign-up's extra field) scrolls into
    // view instead of clipping. py-sm (not the design system's 2xl, which
    // is 9rem/144px - a marketing-section token, not a form-page one) is
    // just enough that a scrolled card never sits flush against the edge,
    // without pushing a short sign-in card down far enough to need
    // scrolling itself, which defeats the point.
    <div className="flex min-h-screen items-center justify-center overflow-y-auto bg-canvas px-[var(--container-padding)] py-sm">
      <div className="page-transition w-full max-w-[24rem]">
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
        {/* mb-md, not lg - lg left sign-up's extra field short of fitting a
            typical laptop window without scroll (verified: needed ~740px on
            a 700px-tall viewport before this pass). */}
        <div className="mb-md flex items-center gap-2.5">
          <LogoMark className="size-6 shrink-0 text-ink" />
          <Wordmark className="font-heading text-h4 font-semibold tracking-[-0.02em] text-ink" />
        </div>

        <div className="mb-md flex gap-1 rounded-full border border-line bg-canvas p-1">
          <button
            type="button"
            onClick={() => switchMode('sign-in')}
            className={`flex-1 rounded-full py-1.5 text-caption font-semibold uppercase tracking-[0.08em] transition-colors duration-200 ${
              mode === 'sign-in' ? 'bg-white/8 text-ink' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchMode('sign-up')}
            className={`flex-1 rounded-full py-1.5 text-caption font-semibold uppercase tracking-[0.08em] transition-colors duration-200 ${
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

        {/* grid-rows 0fr/1fr is the CSS trick for animating to/from "auto"
            height, which a plain height/max-height transition can't do
            without guessing a pixel value. Confirm-password mounting only in
            sign-up mode used to make the whole card snap taller instantly;
            this grows it open instead. The inner div needs its own
            min-h-0/overflow-hidden or the grid row won't actually collapse -
            a flex or block child clamps to content size regardless of the
            row track. */}
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${
            mode === 'sign-up' ? 'mb-md grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <label className="block pt-sm">
              <span className="mb-1 block text-small text-ink-secondary">Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={mode === 'sign-up'}
                minLength={6}
                autoComplete="new-password"
                tabIndex={mode === 'sign-up' ? 0 : -1}
                className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-body text-ink outline-none focus-visible:border-line-strong"
              />
            </label>
          </div>
        </div>

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
