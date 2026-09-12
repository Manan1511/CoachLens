import { createClient } from '@supabase/supabase-js';

/** One Supabase client for the whole app — the anon/publishable key only,
 *  same project as services/coaching-api's SUPABASE_URL/SUPABASE_KEY. The
 *  backend never sees a password: a coach signs in here, and every API
 *  call carries the resulting access token as `Authorization: Bearer ...`,
 *  which coaching/auth.py verifies via `supabase.auth.get_user(token)`. */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
