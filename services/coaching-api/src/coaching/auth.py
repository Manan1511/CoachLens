"""Coach identity verification via Supabase Auth. The backend never handles
passwords or issues tokens itself - coaches sign in client-side against the
Supabase Auth SDK, and every request here just carries the resulting JWT in
an `Authorization: Bearer <token>` header for us to verify.
"""

from dataclasses import dataclass

from fastapi import Header, HTTPException
from gotrue.errors import AuthError

from src.db.client import get_supabase


@dataclass
class Coach:
    id: str
    email: str | None


def require_coach(authorization: str | None = Header(default=None)) -> Coach:
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or malformed Authorization header. Expected 'Bearer <supabase-jwt>'.",
        )
    token = authorization.removeprefix("Bearer ").strip()

    # get_user() calls Supabase Auth to verify the token (signature, expiry,
    # revocation) rather than decoding it locally against a shared secret -
    # slower, but always correct even if a token was just revoked.
    try:
        response = get_supabase().auth.get_user(token)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token.") from exc

    if response is None or response.user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    return Coach(id=response.user.id, email=response.user.email)
