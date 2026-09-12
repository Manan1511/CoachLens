import { supabase } from '@/lib/auth/supabase-client';

/** Thrown for any non-2xx response. The real backend isn't consistent
 *  about its error body shape — some HTTPException calls pass a bare
 *  string as `detail`, others pass `{code, message}` — so this normalizes
 *  both into one readable `.message` rather than surfacing
 *  "[object Object]" to a coach. */
export class ApiError extends Error {
  status: number;
  code: string | null;

  constructor(status: number, message: string, code: string | null = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function extractErrorMessage(detail: unknown): { message: string; code: string | null } {
  if (typeof detail === 'string') return { message: detail, code: null };
  if (detail && typeof detail === 'object' && 'message' in detail) {
    const code = 'code' in detail && typeof detail.code === 'string' ? detail.code : null;
    return { message: String((detail as { message: unknown }).message), code };
  }
  return { message: 'Something went wrong.', code: null };
}

/** Every real API call goes through this — attaches the coach's current
 *  Supabase access token as `Authorization: Bearer ...`
 *  (coaching/auth.py's require_coach verifies it via
 *  supabase.auth.get_user), and normalizes errors. `path` is relative to
 *  VITE_API_BASE_URL, e.g. "/api/v1/athletes". */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const { message, code } = extractErrorMessage(body?.detail);
    throw new ApiError(response.status, message, code);
  }

  return body as T;
}
