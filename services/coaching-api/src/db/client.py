from functools import lru_cache

from supabase import Client, create_client

from src.settings import settings


@lru_cache
def get_supabase() -> Client:
    key = settings.supabase_service_role_key or settings.supabase_key
    return create_client(settings.supabase_url, key)
