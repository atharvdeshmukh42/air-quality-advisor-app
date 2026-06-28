"""Firebase Authentication — server-side signup/login and token verification.

Uses Firebase Admin SDK exclusively. No Firebase REST API or Web API Key needed.
- Signup: creates user via Admin SDK, generates a custom token
- Login: verifies password by attempting to get user + custom token
- Token verification: verifies ID tokens on protected endpoints
"""

import os
import logging
import hashlib
import hmac
import json
import time

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel

# pyrefly: ignore [missing-import]
import firebase_admin
# pyrefly: ignore [missing-import]
from firebase_admin import credentials, auth as firebase_auth
from dotenv import load_dotenv

logger = logging.getLogger("uvicorn.error")

# ─── Firebase Admin SDK Initialisation ──────────────────────────────────────────

_BASE_DIR = os.path.dirname(os.path.dirname(__file__))
_ENV_PATH = os.path.join(_BASE_DIR, ".env")

_firebase_app = None


def _get_firebase_credentials() -> dict:
    """Build Firebase credentials dictionary from environment variables."""
    load_dotenv(_ENV_PATH, override=True)

    private_key = os.environ.get("FIREBASE_PRIVATE_KEY")
    if private_key:
        private_key = private_key.strip("'\"").replace("\\n", "\n")

    client_email = os.environ.get("FIREBASE_CLIENT_EMAIL")

    if not private_key or not client_email:
        logger.error("Missing Firebase credentials (FIREBASE_PRIVATE_KEY or FIREBASE_CLIENT_EMAIL) in environment.")
        raise RuntimeError("Missing Firebase configuration in environment variables")

    return {
        "type": os.environ.get("FIREBASE_TYPE", "service_account"),
        "project_id": os.environ.get("FIREBASE_PROJECT_ID"),
        "private_key_id": os.environ.get("FIREBASE_PRIVATE_KEY_ID"),
        "private_key": private_key,
        "client_email": client_email,
        "client_id": os.environ.get("FIREBASE_CLIENT_ID"),
        "auth_uri": os.environ.get("FIREBASE_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"),
        "token_uri": os.environ.get("FIREBASE_TOKEN_URI", "https://oauth2.googleapis.com/token"),
        "auth_provider_x509_cert_url": os.environ.get("FIREBASE_AUTH_PROVIDER_X509_CERT_URL", "https://www.googleapis.com/oauth2/v1/certs"),
        "client_x509_cert_url": os.environ.get("FIREBASE_CLIENT_X509_CERT_URL"),
        "universe_domain": os.environ.get("FIREBASE_UNIVERSE_DOMAIN", "googleapis.com"),
    }


def init_firebase():
    """Initialise the Firebase Admin SDK (idempotent)."""
    global _firebase_app
    if _firebase_app is not None:
        return

    try:
        cred_dict = _get_firebase_credentials()
        cred = credentials.Certificate(cred_dict)
        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("✅  Firebase Admin SDK initialised")
    except Exception as e:
        logger.error(f"❌ Failed to initialise Firebase Admin SDK: {e}")
        raise


# ─── JWT Token Helpers (server-issued tokens) ──────────────────────────────────

# Since we can't use the Firebase REST API without a Web API Key,
# we generate our own JWT-like tokens using the service account private key.
# These tokens are verified server-side on every request.

_JWT_SECRET = None


def _get_jwt_secret():
    """Derive a signing secret from the service account private key."""
    global _JWT_SECRET
    if _JWT_SECRET is not None:
        return _JWT_SECRET

    cred_dict = _get_firebase_credentials()
    private_key = cred_dict["private_key"]

    # Use a hash of the private key as the HMAC secret
    _JWT_SECRET = hashlib.sha256(private_key.encode()).digest()
    return _JWT_SECRET


def _create_session_token(uid: str, email: str) -> str:
    """Create a simple HMAC-signed session token."""
    payload = {
        "uid": uid,
        "email": email,
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600 * 24 * 7,  # 7 days
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode()

    import base64
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode().rstrip("=")
    signature = hmac.new(_get_jwt_secret(), payload_bytes, hashlib.sha256).hexdigest()

    return f"{payload_b64}.{signature}"


def _verify_session_token(token: str) -> dict:
    """Verify and decode a session token."""
    import base64

    parts = token.split(".")
    if len(parts) != 2:
        raise ValueError("Invalid token format")

    payload_b64, signature = parts

    # Restore padding
    padding = 4 - len(payload_b64) % 4
    if padding != 4:
        payload_b64 += "=" * padding

    payload_bytes = base64.urlsafe_b64decode(payload_b64)

    expected_sig = hmac.new(_get_jwt_secret(), payload_bytes, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected_sig):
        raise ValueError("Invalid token signature")

    payload = json.loads(payload_bytes)

    if payload.get("exp", 0) < time.time():
        raise ValueError("Token has expired")

    return payload


# ─── Auth Dependency (token verification for protected routes) ──────────────────

async def get_current_user(authorization: str = Header(None)) -> dict:
    """
    FastAPI dependency: extract and verify the session token
    from the Authorization header.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")

    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Invalid Authorization header format. Expected 'Bearer <token>'.",
        )

    token = parts[1]

    try:
        payload = _verify_session_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")

    return {
        "uid": payload["uid"],
        "email": payload.get("email", ""),
    }


# ─── Password Hashing Helpers ──────────────────────────────────────────────────

_USERS_FILE = os.path.join(_BASE_DIR, "data", "users.json")


def _load_users() -> dict:
    """Load the users database."""
    if os.path.isfile(_USERS_FILE):
        with open(_USERS_FILE) as f:
            return json.load(f)
    return {}


def _save_users(users: dict):
    """Persist the users database."""
    os.makedirs(os.path.dirname(_USERS_FILE), exist_ok=True)
    with open(_USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)


def _hash_password(password: str, salt: str = None) -> tuple[str, str]:
    """Hash a password with a salt. Returns (hash, salt)."""
    if salt is None:
        salt = os.urandom(16).hex()
    pw_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return pw_hash, salt


# ─── Request / Response Models ──────────────────────────────────────────────────

class AuthRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    uid: str
    email: str


# ─── Router ─────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
async def signup(request: AuthRequest):
    """Create a new user with email + password and return a session token."""
    email = request.email.strip().lower()
    password = request.password

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    # Check if user already exists
    users = _load_users()
    if email in users:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    # Create user in Firebase Auth (for record keeping)
    try:
        fb_user = firebase_auth.create_user(email=email, password=password)
        uid = fb_user.uid
    except firebase_auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

    # Store password hash locally for login verification
    pw_hash, salt = _hash_password(password)
    users[email] = {"uid": uid, "pw_hash": pw_hash, "salt": salt}
    _save_users(users)

    # Generate session token
    token = _create_session_token(uid, email)

    return AuthResponse(token=token, uid=uid, email=email)


@router.post("/login", response_model=AuthResponse)
async def login(request: AuthRequest):
    """Sign in with email + password and return a session token."""
    email = request.email.strip().lower()
    password = request.password

    users = _load_users()

    if email not in users:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user_data = users[email]
    pw_hash, _ = _hash_password(password, user_data["salt"])

    if not hmac.compare_digest(pw_hash, user_data["pw_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    uid = user_data["uid"]
    token = _create_session_token(uid, email)

    return AuthResponse(token=token, uid=uid, email=email)


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return the current authenticated user's info (token verification check)."""
    return {"uid": user["uid"], "email": user["email"]}
