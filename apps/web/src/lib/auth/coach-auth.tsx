import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase-client';

/** Real Supabase Auth — coaching/auth.py verifies whatever access token we
 *  hand it via `supabase.auth.get_user(token)`, so this is the only place
 *  in the app that needs to know Supabase Auth exists at all. A real
 *  Supabase user has no free-text `name` field (unless one was set in
 *  user_metadata at sign-up, which nothing here does), so `Coach` is just
 *  `{ id, email }` — DashboardLayout shows the email, not a name. */

export interface Coach {
  id: string;
  email: string | null;
}

interface CoachAuthValue {
  coach: Coach | null;
  /** True only while the initial session restore is in flight — lets
   *  DashboardLayout avoid bouncing to /login for a split second on every
   *  hard reload before Supabase has had a chance to answer. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /** `needsConfirmation` is true when this Supabase project requires email
   *  confirmation (the default for a new project) — `signUp` then returns
   *  no session yet, so there's nothing to sign the coach into until they
   *  click the link Supabase just emailed them. */
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const CoachAuthContext = createContext<CoachAuthValue | null>(null);

function toCoach(session: Session | null): Coach | null {
  if (!session?.user) return null;
  return { id: session.user.id, email: session.user.email ?? null };
}

export function CoachAuthProvider({ children }: { children: ReactNode }) {
  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCoach(toCoach(data.session));
      setLoading(false);
    });

    // Keeps `coach` in sync with token refresh and sign-out from another
    // tab, not just this component's own signIn/signOut calls.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setCoach(toCoach(session));
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message, needsConfirmation: false };
    // A session comes back immediately only when this project has email
    // confirmation turned off; otherwise Supabase just sent a confirmation
    // link and there's nothing to sign in to yet.
    return { error: null, needsConfirmation: data.session === null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <CoachAuthContext.Provider value={{ coach, loading, signIn, signUp, signOut }}>
      {children}
    </CoachAuthContext.Provider>
  );
}

export function useCoach(): CoachAuthValue {
  const ctx = useContext(CoachAuthContext);
  if (!ctx) throw new Error('useCoach must be used within a CoachAuthProvider');
  return ctx;
}
