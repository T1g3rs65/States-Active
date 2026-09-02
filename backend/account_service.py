"""Email/password accounts + JWT. Open SaaS pattern, no Wasp.

Google OAuth is stubbed until GOOGLE_CLIENT_ID is set.
First account created becomes admin (bootstrap). Extra admins via
STATES_BOOTSTRAP_ADMIN_EMAIL or /admin/users promote.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import time
from datetime import datetime
from typing import Any, Dict, Optional

import jwt

JWT_SECRET = os.environ.get("STATES_JWT_SECRET") or os.environ.get("OPENCLAW_GATEWAY_TOKEN") or "dev-only-change-me"
JWT_ALG = "HS256"
TOKEN_TTL = 60 * 60 * 24 * 30  # 30 days
PBKDF2_ITERS = 210_000
BOOTSTRAP_ADMIN_EMAIL = (os.environ.get("STATES_BOOTSTRAP_ADMIN_EMAIL") or "").strip().lower()


def _hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ITERS)
    return f"{salt}${dk.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        salt, _hex = stored.split("$", 1)
    except ValueError:
        return False
    check = _hash_password(password, salt)
    return hmac.compare_digest(check, stored)


def make_token(user: Dict[str, Any]) -> str:
    now = int(time.time())
    payload = {
        "sub": user["id"],
        "email": user.get("email"),
        "is_admin": bool(user.get("is_admin")),
        "iat": now,
        "exp": now + TOKEN_TTL,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])


def public_user(doc: Dict[str, Any]) -> Dict[str, Any]:
    uid = str(doc.get("id") or doc.get("_id") or "")
    return {
        "id": uid,
        "email": doc.get("email"),
        "username": doc.get("username"),
        "is_admin": bool(doc.get("is_admin")),
        "google_linked": bool(doc.get("google_sub")),
        "email_verified": bool(doc.get("email_verified")),
        "is_banned": bool(doc.get("is_banned")),
        "ban_reason": doc.get("ban_reason") or None,
        "banned_at": doc.get("banned_at").isoformat() if isinstance(doc.get("banned_at"), datetime) else doc.get("banned_at"),
        "legacy_user_id": doc.get("legacy_user_id"),
        "created_at": doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }


async def count_users(db) -> int:
    return await db.users.count_documents({})


async def get_user_by_email(db, email: str) -> Optional[Dict[str, Any]]:
    if not email:
        return None
    doc = await db.users.find_one({"email": email.strip().lower()})
    if doc:
        doc["id"] = str(doc.get("id") or doc.get("_id"))
    return doc


async def get_user_by_id(db, user_id: str) -> Optional[Dict[str, Any]]:
    if not user_id:
        return None
    doc = await db.users.find_one({"id": user_id})
    if not doc:
        from bson import ObjectId
        try:
            doc = await db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            doc = None
    if doc:
        doc["id"] = str(doc.get("id") or doc.get("_id"))
    return doc


async def register_user(db, email: str, password: str, username: Optional[str] = None) -> Dict[str, Any]:
    email = (email or "").strip().lower()
    if not email or "@" not in email:
        raise ValueError("Valid email is required")
    if not password or len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    existing = await get_user_by_email(db, email)
    if existing:
        raise ValueError("An account with that email already exists")
    n = await count_users(db)
    is_admin = n == 0 or (BOOTSTRAP_ADMIN_EMAIL and email == BOOTSTRAP_ADMIN_EMAIL)
    uid = secrets.token_hex(16)
    doc = {
        "id": uid,
        "email": email,
        "username": (username or email.split("@")[0]).strip(),
        "password_hash": _hash_password(password),
        "is_admin": is_admin,
        "google_sub": None,
        "legacy_user_id": None,
        "email_verified": False,
        "verify_token": None,
        "verify_token_expires": None,
        "created_at": datetime.utcnow(),
    }
    await db.users.insert_one(doc)
    doc["id"] = uid
    return doc


async def login_user(db, email: str, password: str) -> Dict[str, Any]:
    email = (email or "").strip().lower()
    user = await get_user_by_email(db, email)
    if not user or not _verify_password(password, user.get("password_hash") or ""):
        raise ValueError("Invalid email or password")
    if user.get("is_banned"):
        reason = user.get("ban_reason") or "This account is banned."
        raise ValueError(reason)
    return user


async def list_users(db, limit: int = 100) -> list:
    out = []
    cursor = db.users.find({}).sort("created_at", -1).limit(limit)
    async for doc in cursor:
        doc["id"] = str(doc.get("id") or doc.get("_id"))
        out.append(public_user(doc))
    return out


async def set_admin(db, user_id: str, is_admin: bool) -> Optional[Dict[str, Any]]:
    user = await get_user_by_id(db, user_id)
    if not user:
        return None
    await db.users.update_one({"id": user["id"]}, {"$set": {"is_admin": bool(is_admin)}})
    user["is_admin"] = bool(is_admin)
    return user


async def delete_user(db, user_id: str) -> Optional[Dict[str, Any]]:
    user = await get_user_by_id(db, user_id)
    if not user:
        return None
    await db.users.delete_one({"id": user["id"]})
    try:
        from bson import ObjectId
        await db.users.delete_one({"_id": ObjectId(user_id)})
    except Exception:
        pass
    return user


async def set_banned(db, user_id: str, banned: bool, reason: str | None = None) -> Optional[Dict[str, Any]]:
    user = await get_user_by_id(db, user_id)
    if not user:
        return None
    fields = {
        "is_banned": bool(banned),
        "ban_reason": (reason or "").strip() or None if banned else None,
        "banned_at": datetime.utcnow() if banned else None,
    }
    await db.users.update_one({"id": user["id"]}, {"$set": fields})
    user.update(fields)
    return user


async def link_legacy_user_id(db, account_id: str, legacy_user_id: str) -> None:
    await db.users.update_one({"id": account_id}, {"$set": {"legacy_user_id": legacy_user_id}})
    # Point existing nation at the new account id if it was keyed by the old user_id
    if legacy_user_id:
        await db.nations.update_many(
            {"user_id": legacy_user_id},
            {"$set": {"user_id": account_id, "legacy_user_id": legacy_user_id}},
        )


async def create_verify_token(db, user_id: str, ttl_hours: int = 24) -> str:
    """Issue a fresh email-verification token for a user."""
    token = secrets.token_urlsafe(24)
    expires = datetime.utcnow().timestamp() + ttl_hours * 3600
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"verify_token": token, "verify_token_expires": expires, "email_verified": False}},
    )
    return token


async def verify_email(db, token: str) -> Optional[Dict[str, Any]]:
    """Mark a user's email verified if the token is valid & unexpired."""
    user = await db.users.find_one({"verify_token": token})
    if not user:
        return None
    expires = user.get("verify_token_expires") or 0
    if datetime.utcnow().timestamp() > expires:
        return None
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"email_verified": True, "verify_token": None, "verify_token_expires": None}},
    )
    user["email_verified"] = True
    return user
