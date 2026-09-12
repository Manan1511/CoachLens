from functools import lru_cache

from supabase import Client, create_client

from src.settings import settings


@lru_cache
def get_supabase() -> Client:
    """Server-side Supabase client using the service_role key.

    All tables have RLS enabled with no policies (deny-by-default for the
    anon/publishable key) — see the enable_rls_default_deny migration. The
    backend only ever talks to Supabase through service_role, which bypasses
    RLS, so we fail fast here rather than silently falling back to a key
    that would get empty/denied results on every query.
    """
    if not settings.supabase_service_role_key:
        raise RuntimeError(
            "SUPABASE_SERVICE_ROLE_KEY is not set. Get it from the Supabase "
            "dashboard (Project Settings > API) and set it in your local "
            ".env — the publishable/anon key cannot read or write these "
            "tables under the default-deny RLS policy."
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
