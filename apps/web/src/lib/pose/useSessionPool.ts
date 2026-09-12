import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { Athlete } from '@/lib/api/types';

/** CAPTURE_PLAN.md's session-pool model, carried over unchanged from the
 *  deleted native plan: pick who's actually at the nets once, resolve every
 *  member's session_id up front (not lazily on first selection - that would
 *  put a network round-trip in the one place that must never block, the
 *  moment a bowler taps their name mid-session), hold it locally so an app
 *  restart or accidental reload doesn't force a re-pick.
 *
 *  localStorage, not sessionStorage: a nets session can run for hours across
 *  multiple tab lifetimes on a shared device, unlike the coach's own sign-in
 *  (mock-auth.tsx), which deliberately uses sessionStorage instead. */

export interface PoolMember {
  athlete: Athlete;
  sessionId: string;
}

const STORAGE_KEY = 'coachlens.session-pool';

interface StoredPool {
  date: string;
  members: PoolMember[];
}

function loadStoredPool(): PoolMember[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw) as StoredPool;
    // A pool from a previous calendar day is stale - session_ids were
    // resolved via get-or-create-today's-session, so yesterday's ids don't
    // point at today's session even if the athletes are the same.
    const today = new Date().toISOString().slice(0, 10);
    return stored.date === today ? stored.members : [];
  } catch {
    return [];
  }
}

export function useSessionPool() {
  const [pool, setPool] = useState<PoolMember[]>(() => loadStoredPool());
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, members: pool }));
  }, [pool]);

  const setPoolFromAthletes = useCallback(async (athletes: Athlete[]) => {
    setResolving(true);
    setError(null);
    try {
      const members = await Promise.all(
        athletes.map(async (athlete) => {
          const { session_id } = await api.startSession(athlete.id);
          return { athlete, sessionId: session_id };
        }),
      );
      setPool(members);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setResolving(false);
    }
  }, []);

  const addToPool = useCallback(async (athlete: Athlete) => {
    setResolving(true);
    setError(null);
    try {
      const { session_id } = await api.startSession(athlete.id);
      setPool((prev) =>
        prev.some((m) => m.athlete.id === athlete.id)
          ? prev
          : [...prev, { athlete, sessionId: session_id }],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setResolving(false);
    }
  }, []);

  const clearPool = useCallback(() => setPool([]), []);

  return { pool, resolving, error, setPoolFromAthletes, addToPool, clearPool };
}
