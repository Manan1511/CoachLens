import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

/** Stands in for Supabase Auth. The real backend expects a bearer JWT from
 *  the Supabase Auth JS SDK (services/coaching-api/.env.example already has
 *  the project's SUPABASE_URL and anon key for that swap) — there's no
 *  password check here, just an identity a coach can sign in as, so the
 *  dashboard has someone to attribute actions and baseline confirmations
 *  to. Swap this file for a supabase-js session behind the same
 *  useCoach() shape when auth is ready to go live. */

export interface Coach {
  id: string;
  name: string;
  email: string;
}

interface CoachAuthValue {
  coach: Coach | null;
  signIn: (name: string, email: string) => void;
  signOut: () => void;
}

const STORAGE_KEY = 'coachlens.mock-coach';

const CoachAuthContext = createContext<CoachAuthValue | null>(null);

function loadStoredCoach(): Coach | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Coach) : null;
  } catch {
    return null;
  }
}

export function CoachAuthProvider({ children }: { children: ReactNode }) {
  // Read synchronously on first render, not in an effect - restoring the
  // session a tick late caused a real bug: a hard reload of a nested route
  // like /app/deliveries/:id would render with coach=null just long enough
  // to redirect to /app/login, which then bounced straight back to /app
  // once the session loaded, losing the deep link entirely.
  const [coach, setCoach] = useState<Coach | null>(() => loadStoredCoach());

  const signIn = useCallback((name: string, email: string) => {
    const next: Coach = { id: `coach-${email.split('@')[0]}`, name, email };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setCoach(next);
  }, []);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setCoach(null);
  }, []);

  return (
    <CoachAuthContext.Provider value={{ coach, signIn, signOut }}>
      {children}
    </CoachAuthContext.Provider>
  );
}

export function useCoach(): CoachAuthValue {
  const ctx = useContext(CoachAuthContext);
  if (!ctx) throw new Error('useCoach must be used within a CoachAuthProvider');
  return ctx;
}
