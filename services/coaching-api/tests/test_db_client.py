import pytest

from src.db.client import get_supabase


def test_get_supabase_fails_fast_without_service_role_key(monkeypatch):
    monkeypatch.setattr("src.db.client.settings.supabase_service_role_key", "")
    get_supabase.cache_clear()
    with pytest.raises(RuntimeError, match="SUPABASE_SERVICE_ROLE_KEY"):
        get_supabase()
    get_supabase.cache_clear()
