import type { CoachActionType } from './types';

/** The real POST /deliveries/{id}/action has no matching GET — a coach's
 *  approve/dismiss decision is written to `coach_actions` but never read
 *  back anywhere in the API. This is a purely local memory of what THIS
 *  browser did this session, backed by sessionStorage so it survives a
 *  reload — it is not server truth, and another coach (or this one, on a
 *  different device) won't see it. Remove this module the day a real
 *  action-readback endpoint exists; nothing else needs to change. */

const STORAGE_KEY = 'coachlens.action-memory';

interface ActionRecord {
  action: CoachActionType;
  note: string | null;
}

function readStore(): Record<string, ActionRecord> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ActionRecord>) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, ActionRecord>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // sessionStorage unavailable (private mode, etc.) — degrade to "no memory".
  }
}

export function rememberAction(deliveryId: string, record: ActionRecord): void {
  const store = readStore();
  store[deliveryId] = record;
  writeStore(store);
}

export function recallAction(deliveryId: string): ActionRecord | null {
  return readStore()[deliveryId] ?? null;
}
