from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# ".env" is relative to the process's cwd at launch, not to this file - and
# that cwd isn't reliably services/coaching-api. .claude/launch.json's
# uvicorn config uses --app-dir to point at this package for *imports*,
# which does not change the interpreter's actual working directory; running
# from the repo root (which has no .env of its own) silently left every
# setting at its empty-string default. That surfaced as a raw 500 on every
# request - get_supabase() correctly raises for a missing service_role key,
# but as an uncaught RuntimeError, not a clean error response - rather than
# the "SUPABASE_SERVICE_ROLE_KEY is not set" message actually being seen.
# Anchoring to this file's own location makes env-file resolution correct
# regardless of the launcher's cwd.
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")

    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_role_key: str = ""
    cors_origins: str = "*"

    @property
    def allowed_origins(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()

