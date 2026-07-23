from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import asyncio
import io
import re
from contextvars import ContextVar

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')

# Per-request user context (set by AuthContextMiddleware from cookie or Bearer)
current_uid: ContextVar[str] = ContextVar('current_uid', default='demo-user')
current_user_name: ContextVar[str] = ContextVar('current_user_name', default='Meera R.')
current_user_picture: ContextVar[Optional[str]] = ContextVar('current_user_picture', default=None)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SARVAM_API_KEY = os.environ.get('SARVAM_API_KEY')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
RESEND_FROM_EMAIL = os.environ.get('RESEND_FROM_EMAIL', 'CuminJar <onboarding@resend.dev>')
APP_BASE_URL = os.environ.get('APP_BASE_URL', 'https://cuminjar.com')

# Demo user (no auth)
DEMO_USER_ID = 'demo-user'
DEMO_USER = {
    'id': DEMO_USER_ID,
    'name': 'Meera R.',
    'firstName': 'Meera',
    'email': 'meera.rao@family.com',
    'avatar': 'https://images.unsplash.com/photo-1489278353717-f64c6ee8a4d2?w=100&auto=format&fit=crop&q=60',
    'plan': 'unlimited',
    'limits': {
        'max_families': 9999,
        'max_recipes': 9999,
        'max_family_members': 9999,
    },
}

app = FastAPI()
api = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


# --------------------- Models ---------------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


class FamilyIn(BaseModel):
    name: str
    description: str = ''
    language: str = 'English'
    coverPhoto: Optional[str] = None  # base64 data URL


class RecipeIn(BaseModel):
    title: str
    author: str
    region: str = ''
    serves: str = ''
    time: str = ''
    tags: List[str] = []
    cover: Optional[str] = None
    ingredients: List[str] = []
    steps: List[str] = []
    transcript_en: Optional[str] = None  # from voice or photo
    source_kind: Optional[str] = None    # 'text' | 'voice' | 'photo'
    source_language: Optional[str] = None


class StoryIn(BaseModel):
    title: str
    author: str
    excerpt: str
    mins: int = 4
    transcript_en: Optional[str] = None
    source_kind: Optional[str] = None
    source_language: Optional[str] = None


class AlbumIn(BaseModel):
    title: str
    cover: Optional[str] = None


class FamilyMemberIn(BaseModel):
    name: str
    role: str
    level: int = 0  # 0=grandparents, 1=parents, 2=you, 3=children
    avatar: Optional[str] = None


class InviteIn(BaseModel):
    email: str
    name: Optional[str] = None
    relation: Optional[str] = None


class ContactIn(BaseModel):
    name: str
    email: str
    subject: Optional[str] = ''
    message: str


# --------------------- Helpers ---------------------
def _strip_id(doc):
    if not doc:
        return doc
    doc.pop('_id', None)
    return doc


async def _seed_if_empty():
    """Seeding is DISABLED. Kept for backwards compatibility."""
    return
    if await db.recipes.count_documents({'user_id': DEMO_USER_ID}) == 0:
        seed_recipes = [
            {'title': "Paati's Sambar", 'author': 'Lakshmi Paati', 'region': 'South Indian', 'serves': '4-5', 'time': '45 mins', 'tags': ['Lentils', 'Traditional'], 'cover': 'https://images.unsplash.com/photo-1600728257188-480e132c1610?w=800&auto=format&fit=crop&q=60'},
            {'title': "Nani's Rajma Chawal", 'author': 'Sunita Nani', 'region': 'North Indian', 'serves': '4', 'time': '60 mins', 'tags': ['Rajma', 'Comfort'], 'cover': 'https://images.pexels.com/photos/34941860/pexels-photo-34941860.jpeg?w=800&auto=format&fit=crop&q=60'},
            {'title': "Amma's Fish Curry", 'author': 'Rukmini Amma', 'region': 'Coastal', 'serves': '3', 'time': '30 mins', 'tags': ['Seafood', 'Spicy'], 'cover': 'https://images.pexels.com/photos/35295143/pexels-photo-35295143.jpeg?w=800&auto=format&fit=crop&q=60'},
            {'title': "Dadi's Aloo Paratha", 'author': 'Kamla Dadi', 'region': 'Punjabi', 'serves': '4', 'time': '40 mins', 'tags': ['Breakfast'], 'cover': 'https://images.unsplash.com/photo-1533128361669-69c065857a13?w=800&auto=format&fit=crop&q=60'},
        ]
        for r in seed_recipes:
            r.update({'id': str(uuid.uuid4()), 'user_id': DEMO_USER_ID, 'liked': False, 'created_at': now_iso(), 'ingredients': [], 'steps': []})
        await db.recipes.insert_many(seed_recipes)

    if await db.stories.count_documents({'user_id': DEMO_USER_ID}) == 0:
        seed_stories = [
            {'title': 'The Monsoon Kitchen', 'author': 'Lakshmi Paati', 'excerpt': 'The rains would come every June, and our kitchen would fill with the scent of pakoras...', 'mins': 6},
            {'title': 'Grandma\u2019s Diwali', 'author': 'Kamla Dadi', 'excerpt': 'She would begin preparations two weeks before, cleaning the copper pots by hand...', 'mins': 4},
            {'title': 'The Family Almirah', 'author': 'Rukmini Amma', 'excerpt': 'Inside our old wooden almirah lived every festival we ever cooked for...', 'mins': 5},
        ]
        for s in seed_stories:
            s.update({'id': str(uuid.uuid4()), 'user_id': DEMO_USER_ID, 'created_at': now_iso()})
        await db.stories.insert_many(seed_stories)

    if await db.albums.count_documents({'user_id': DEMO_USER_ID}) == 0:
        seed_albums = [
            {'title': 'Diwali 2024', 'count': 42, 'cover': 'https://images.unsplash.com/photo-1533128361669-69c065857a13?w=800&auto=format&fit=crop&q=60'},
            {'title': "Paati's Kitchen", 'count': 28, 'cover': 'https://images.unsplash.com/photo-1600728257188-480e132c1610?w=800&auto=format&fit=crop&q=60'},
            {'title': 'Handwritten Recipes', 'count': 15, 'cover': 'https://images.pexels.com/photos/34941860/pexels-photo-34941860.jpeg?w=800&auto=format&fit=crop&q=60'},
            {'title': 'Family Portraits', 'count': 61, 'cover': 'https://images.pexels.com/photos/35295143/pexels-photo-35295143.jpeg?w=800&auto=format&fit=crop&q=60'},
        ]
        for a in seed_albums:
            a.update({'id': str(uuid.uuid4()), 'user_id': DEMO_USER_ID, 'created_at': now_iso()})
        await db.albums.insert_many(seed_albums)

    if await db.family_tree.count_documents({'user_id': DEMO_USER_ID}) == 0:
        avatars = [
            'https://images.pexels.com/photos/32995728/pexels-photo-32995728.jpeg?w=100&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1662850886700-4ec19bd30d11?w=100&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1489278353717-f64c6ee8a4d2?w=100&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1533128361669-69c065857a13?w=100&auto=format&fit=crop&q=60',
        ]
        seed_tree = [
            {'name': 'Ramanathan Thatha', 'role': 'Grandfather', 'level': 0, 'avatar': avatars[0]},
            {'name': 'Lakshmi Paati', 'role': 'Grandmother', 'level': 0, 'avatar': avatars[2]},
            {'name': 'Suresh Rao', 'role': 'Father', 'level': 1, 'avatar': avatars[1]},
            {'name': 'Kavita Rao', 'role': 'Mother', 'level': 1, 'avatar': avatars[3]},
            {'name': 'Meera R.', 'role': 'You', 'level': 2, 'avatar': avatars[2]},
            {'name': 'Arjun R.', 'role': 'Brother', 'level': 2, 'avatar': avatars[1]},
        ]
        for m in seed_tree:
            m.update({'id': str(uuid.uuid4()), 'user_id': DEMO_USER_ID, 'created_at': now_iso()})
        await db.family_tree.insert_many(seed_tree)

    if await db.notifications.count_documents({'user_id': DEMO_USER_ID}) == 0:
        seed_notifs = [
            {'icon': 'Mic', 'title': 'Lakshmi Paati added a new voice recipe', 'desc': '\u201cPaati\u2019s Sambar\u201d is ready to listen.', 'when': '2h ago', 'read': False},
            {'icon': 'Sparkles', 'title': 'AI transcription complete', 'desc': 'Your recording \u201cKitchen Wisdom\u201d has been transcribed.', 'when': '5h ago', 'read': False},
            {'icon': 'Users', 'title': 'Arjun R. joined your family group', 'desc': 'Welcome him with a recipe or a story.', 'when': 'Yesterday', 'read': False},
            {'icon': 'Heart', 'title': 'Priya S. loved your recipe', 'desc': '\u201cRajma Chawal\u201d received a heart.', 'when': '2 days ago', 'read': True},
        ]
        for n in seed_notifs:
            n.update({'id': str(uuid.uuid4()), 'user_id': DEMO_USER_ID, 'created_at': now_iso()})
        await db.notifications.insert_many(seed_notifs)


# --------------------- Health & User ---------------------
@api.get("/")
async def root():
    return {"message": "CuminJar API", "user": current_user_name.get()}


@api.get("/me")
async def me():
    await _seed_if_empty()
    return DEMO_USER


# --------------------- Family ---------------------
@api.get("/family")
async def get_family():
    """Return the most-recent family group (backwards compatible)."""
    doc = await db.families.find_one({'user_id': current_uid.get()}, sort=[('created_at', -1)])
    return _strip_id(doc)


@api.get("/families")
async def list_families():
    items = await db.families.find({'user_id': current_uid.get()}).sort('created_at', -1).to_list(200)
    return [_strip_id(i) for i in items]


@api.post("/family")
async def create_family(payload: FamilyIn):
    """Create a NEW family group. Free plan is limited to 1 family group."""
    limits = DEMO_USER.get('limits', {})
    max_families = limits.get('max_families', 1)
    existing_count = await db.families.count_documents({'user_id': current_uid.get()})
    if DEMO_USER.get('plan') == 'free' and existing_count >= max_families:
        raise HTTPException(
            402,
            f"Free plan allows only {max_families} family group. Upgrade to Plus to create more.",
        )
    data = payload.dict()
    data.update({
        'id': str(uuid.uuid4()),
        'user_id': current_uid.get(),
        'created_at': now_iso(),
        'updated_at': now_iso(),
    })
    await db.families.insert_one(data)
    return _strip_id(data)


@api.put("/family/{family_id}")
async def update_family(family_id: str, payload: FamilyIn):
    existing = await db.families.find_one({'id': family_id, 'user_id': current_uid.get()})
    if not existing:
        raise HTTPException(404, 'Family not found')
    data = payload.dict()
    data['updated_at'] = now_iso()
    await db.families.update_one({'id': family_id, 'user_id': current_uid.get()}, {'$set': data})
    doc = await db.families.find_one({'id': family_id, 'user_id': current_uid.get()})
    return _strip_id(doc)


@api.delete("/family/{family_id}")
async def delete_family(family_id: str):
    res = await db.families.delete_one({'id': family_id, 'user_id': current_uid.get()})
    if res.deleted_count == 0:
        raise HTTPException(404, 'Family not found')
    return {'ok': True}


# --------------------- Public cookbook sharing ---------------------
import secrets as _secrets
import hashlib as _hashlib
import random as _random


# --------------------- Email OTP (signup verification) ---------------------
async def _send_otp_email(email: str, code: str) -> dict:
    if not RESEND_API_KEY:
        return {'ok': False, 'error': 'RESEND_API_KEY not configured'}
    subject = f"Your CuminJar verification code: {code}"
    html = f"""<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FBF7F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1F1B16;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7F1;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ececec;">
          <tr><td style="padding:32px 40px 8px 40px;">
            <div style="font-family:'Fraunces',Georgia,serif;font-size:24px;font-weight:600;">
              <span style="color:#C46B4A;">Cumin</span><span style="color:#3D5A3A;">Jar</span>
            </div>
          </td></tr>
          <tr><td style="padding:12px 40px 8px 40px;">
            <h1 style="font-family:'Fraunces',Georgia,serif;font-size:22px;line-height:1.3;margin:0 0 12px 0;color:#1F1B16;font-weight:600;">Verify your email</h1>
            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#4b5563;">
              Welcome to CuminJar! Enter this 6-digit code to finish creating your account.
            </p>
            <div style="margin:24px 0;padding:20px;background:#F5EDDD;border-radius:12px;text-align:center;">
              <div style="font-family:'SF Mono','Consolas',monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#3D5A3A;">{code}</div>
            </div>
            <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#6b7280;">This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.</p>
          </td></tr>
          <tr><td style="padding:20px 40px 32px 40px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Preserve. Share. Treasure. — The CuminJar Team</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""

    def _send():
        import resend
        resend.api_key = RESEND_API_KEY
        try:
            resp = resend.Emails.send({
                'from': RESEND_FROM_EMAIL,
                'to': [email],
                'subject': subject,
                'html': html,
            })
            return {'ok': True, 'id': (resp or {}).get('id')}
        except Exception as e:
            logger.exception('OTP email send failed')
            return {'ok': False, 'error': str(e)}
    return await asyncio.to_thread(_send)


@api.post("/auth/request-otp")
async def request_otp(payload: dict):
    email = (payload.get('email') or '').strip().lower()
    name = (payload.get('name') or '').strip()
    if not email or not EMAIL_RE.match(email):
        raise HTTPException(400, 'Please provide a valid email address')

    # Rate-limit: max 3 requests per email per 10 minutes
    now = datetime.now(timezone.utc)
    since = (now - timedelta(minutes=10)).isoformat()
    recent = await db.email_otps.count_documents({'email': email, 'created_at': {'$gt': since}})
    if recent >= 3:
        raise HTTPException(429, 'Too many attempts. Please wait a few minutes before trying again.')

    code = f"{_random.randint(0, 999999):06d}"
    expires_at = (now + timedelta(minutes=10)).isoformat()
    doc = {
        'id': str(uuid.uuid4()),
        'email': email,
        'name': name or None,
        'code_hash': _hashlib.sha256(code.encode()).hexdigest(),
        'attempts': 0,
        'verified': False,
        'created_at': now.isoformat(),
        'expires_at': expires_at,
    }
    # Invalidate any previous unverified codes for this email
    await db.email_otps.update_many({'email': email, 'verified': False}, {'$set': {'expires_at': now.isoformat()}})
    await db.email_otps.insert_one(doc)

    result = await _send_otp_email(email, code)
    if not result.get('ok'):
        raise HTTPException(500, f"Could not send verification email: {result.get('error')}")
    return {'ok': True, 'expires_in_minutes': 10}


@api.post("/auth/verify-otp")
async def verify_otp(payload: dict):
    email = (payload.get('email') or '').strip().lower()
    code = (payload.get('code') or '').strip()
    if not email or not code:
        raise HTTPException(400, 'Email and code are required')
    if not code.isdigit() or len(code) != 6:
        raise HTTPException(400, 'Enter the 6-digit code from your email')

    now = datetime.now(timezone.utc)
    otp = await db.email_otps.find_one(
        {'email': email, 'verified': False, 'expires_at': {'$gt': now.isoformat()}},
        sort=[('created_at', -1)],
    )
    if not otp:
        raise HTTPException(400, 'Code expired. Please request a new one.')

    if otp.get('attempts', 0) >= 5:
        await db.email_otps.update_one({'id': otp['id']}, {'$set': {'expires_at': now.isoformat()}})
        raise HTTPException(429, 'Too many wrong attempts. Please request a new code.')

    provided_hash = _hashlib.sha256(code.encode()).hexdigest()
    if provided_hash != otp['code_hash']:
        await db.email_otps.update_one({'id': otp['id']}, {'$inc': {'attempts': 1}})
        remaining = 5 - (otp.get('attempts', 0) + 1)
        raise HTTPException(400, f'Incorrect code. {max(remaining, 0)} attempts left.')

    await db.email_otps.update_one({'id': otp['id']}, {'$set': {'verified': True, 'verified_at': now.isoformat()}})
    return {'ok': True, 'email': email}


# --------------------- Emergent Google Auth (session-based) ---------------------
from fastapi import Cookie, Request
from fastapi.responses import JSONResponse
import httpx as _httpx

EMERGENT_AUTH_SESSION_URL = 'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data'


async def _get_authed_user(request: Request):
    """Return the current user document from session_token cookie or Authorization header. None if not signed in."""
    token = request.cookies.get('session_token')
    if not token:
        auth = request.headers.get('authorization') or request.headers.get('Authorization')
        if auth and auth.lower().startswith('bearer '):
            token = auth.split(' ', 1)[1].strip()
    if not token:
        return None
    session = await db.user_sessions.find_one({'session_token': token}, {'_id': 0})
    if not session:
        return None
    expires_at = session.get('expires_at')
    if isinstance(expires_at, str):
        try:
            expires_at = datetime.fromisoformat(expires_at)
        except Exception:
            return None
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None
    user = await db.users.find_one({'user_id': session['user_id']}, {'_id': 0, 'password_hash': 0})
    return user


@api.post('/auth/session')
async def auth_session(payload: dict):
    """Exchange an Emergent session_id for a persistent session_token cookie."""
    session_id = (payload or {}).get('session_id')
    if not session_id:
        raise HTTPException(400, 'Missing session_id')
    try:
        async with _httpx.AsyncClient(timeout=15) as client:
            r = await client.get(EMERGENT_AUTH_SESSION_URL, headers={'X-Session-ID': session_id})
    except Exception as e:
        raise HTTPException(502, f'Auth service unreachable: {e}')
    if r.status_code != 200:
        raise HTTPException(401, 'Invalid or expired session_id')
    data = r.json() or {}
    email = (data.get('email') or '').lower()
    name = data.get('name') or ''
    picture = data.get('picture') or ''
    session_token = data.get('session_token')
    if not email or not session_token:
        raise HTTPException(502, 'Auth service returned incomplete data')

    now = datetime.now(timezone.utc)
    existing = await db.users.find_one({'email': email}, {'_id': 0})
    if existing:
        user_id = existing['user_id']
        await db.users.update_one({'user_id': user_id}, {'$set': {'name': name, 'picture': picture, 'last_login_at': now.isoformat()}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            'user_id': user_id,
            'email': email,
            'name': name,
            'picture': picture,
            'created_at': now.isoformat(),
            'last_login_at': now.isoformat(),
        })

    expires_at = now + timedelta(days=7)
    await db.user_sessions.insert_one({
        'user_id': user_id,
        'session_token': session_token,
        'created_at': now.isoformat(),
        'expires_at': expires_at.isoformat(),
    })

    user_doc = await db.users.find_one({'user_id': user_id}, {'_id': 0})
    resp = JSONResponse({'user': user_doc})
    resp.set_cookie(
        key='session_token',
        value=session_token,
        max_age=7 * 24 * 3600,
        httponly=True,
        secure=True,
        samesite='none',
        path='/',
    )
    return resp


@api.get('/auth/me')
async def auth_me(request: Request):
    user = await _get_authed_user(request)
    if not user:
        raise HTTPException(401, 'Not authenticated')
    return user


@api.post('/auth/logout')
async def auth_logout(request: Request):
    token = request.cookies.get('session_token')
    if token:
        await db.user_sessions.delete_one({'session_token': token})
    resp = JSONResponse({'ok': True})
    resp.delete_cookie('session_token', path='/', samesite='none', secure=True)
    return resp


# --------------------- Email + Password Auth ---------------------
import bcrypt as _bcrypt


def _hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode('utf-8'), _bcrypt.gensalt()).decode('utf-8')


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


async def _issue_session(user_id: str) -> tuple[str, datetime]:
    """Create a fresh session_token bound to a user_id, 7-day expiry."""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=7)
    session_token = _secrets.token_urlsafe(32)
    await db.user_sessions.insert_one({
        'user_id': user_id,
        'session_token': session_token,
        'created_at': now.isoformat(),
        'expires_at': expires_at.isoformat(),
    })
    return session_token, expires_at


def _cookie_response(payload: dict, session_token: str):
    resp = JSONResponse(payload)
    resp.set_cookie(
        key='session_token',
        value=session_token,
        max_age=7 * 24 * 3600,
        httponly=True,
        secure=True,
        samesite='none',
        path='/',
    )
    return resp


def _client_ip(request: Request) -> str:
    """Real client IP from X-Forwarded-For (behind ingress) with fallback."""
    xff = request.headers.get('x-forwarded-for') or request.headers.get('X-Forwarded-For')
    if xff:
        # First IP in the list is the real client
        return xff.split(',')[0].strip() or 'unknown'
    real_ip = request.headers.get('x-real-ip') or request.headers.get('X-Real-IP')
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else 'unknown'


async def _check_brute_force(email: str, request: Request):
    """Lock out after 5 failed attempts within 15 minutes.
    We check both (ip+email) AND email-only counters so behind a reverse-proxy that
    rotates source IPs (K8s ingress) an attacker still gets throttled.
    """
    ip = _client_ip(request)
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
    ip_email_fails = await db.login_attempts.count_documents({'identifier': f"{ip}:{email}", 'ts': {'$gt': cutoff}, 'success': False})
    email_fails = await db.login_attempts.count_documents({'email': email, 'ts': {'$gt': cutoff}, 'success': False})
    if ip_email_fails >= 5 or email_fails >= 5:
        raise HTTPException(429, 'Too many failed attempts. Please try again in 15 minutes.')


async def _record_attempt(email: str, request: Request, success: bool):
    ip = _client_ip(request)
    await db.login_attempts.insert_one({
        'identifier': f"{ip}:{email}",
        'ip': ip,
        'email': email,
        'success': success,
        'ts': datetime.now(timezone.utc).isoformat(),
    })


async def _ensure_auth_indexes():
    try:
        await db.users.create_index('email', unique=True)
        await db.login_attempts.create_index('identifier')
        await db.password_reset_otps.create_index('email')
    except Exception:
        logger.exception('Failed to create auth indexes')


@api.post('/auth/register')
async def auth_register(payload: dict, request: Request):
    """Create a new user with email + password. Requires OTP to have been verified first."""
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password') or ''
    name = (payload.get('name') or '').strip()
    if not email or not EMAIL_RE.match(email):
        raise HTTPException(400, 'Please provide a valid email address')
    if len(password) < 6:
        raise HTTPException(400, 'Password must be at least 6 characters long')

    # Require a verified OTP for this email
    verified_otp = await db.email_otps.find_one({'email': email, 'verified': True}, sort=[('verified_at', -1)])
    if not verified_otp:
        raise HTTPException(400, 'Please verify your email first with the 6-digit code.')

    existing = await db.users.find_one({'email': email}, {'_id': 0})
    if existing and existing.get('password_hash'):
        raise HTTPException(409, 'An account with this email already exists. Please log in instead.')

    now = datetime.now(timezone.utc)
    password_hash = _hash_password(password)

    if existing:
        # A Google-created user linking a password
        user_id = existing['user_id']
        await db.users.update_one({'user_id': user_id}, {'$set': {'password_hash': password_hash, 'name': name or existing.get('name') or '', 'email_verified': True, 'updated_at': now.isoformat()}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            'user_id': user_id,
            'email': email,
            'name': name or email.split('@')[0],
            'picture': None,
            'password_hash': password_hash,
            'email_verified': True,
            'created_at': now.isoformat(),
            'last_login_at': now.isoformat(),
        })

    session_token, _ = await _issue_session(user_id)
    user_doc = await db.users.find_one({'user_id': user_id}, {'_id': 0, 'password_hash': 0})
    return _cookie_response({'user': user_doc}, session_token)


@api.post('/auth/login')
async def auth_login(payload: dict, request: Request):
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password') or ''
    if not email or not password:
        raise HTTPException(400, 'Email and password are required')

    await _check_brute_force(email, request)

    user = await db.users.find_one({'email': email}, {'_id': 0})
    if not user or not user.get('password_hash'):
        await _record_attempt(email, request, False)
        raise HTTPException(401, 'Invalid email or password')

    if not _verify_password(password, user['password_hash']):
        await _record_attempt(email, request, False)
        raise HTTPException(401, 'Invalid email or password')

    await _record_attempt(email, request, True)
    # Clear all prior failures for this identifier
    ip = _client_ip(request)
    await db.login_attempts.delete_many({'identifier': f"{ip}:{email}", 'success': False})

    await db.users.update_one({'user_id': user['user_id']}, {'$set': {'last_login_at': datetime.now(timezone.utc).isoformat()}})
    session_token, _ = await _issue_session(user['user_id'])
    user_doc = await db.users.find_one({'user_id': user['user_id']}, {'_id': 0, 'password_hash': 0})
    return _cookie_response({'user': user_doc}, session_token)


@api.post('/auth/forgot-password')
async def auth_forgot_password(payload: dict):
    """Send a password-reset OTP to the user's email via Resend. Always returns ok=True
    to avoid leaking which emails have accounts.
    """
    email = (payload.get('email') or '').strip().lower()
    if not email or not EMAIL_RE.match(email):
        raise HTTPException(400, 'Please provide a valid email address')

    user = await db.users.find_one({'email': email}, {'_id': 0})
    # Silently succeed even when no account exists so we don't leak emails
    if not user:
        return {'ok': True}

    now = datetime.now(timezone.utc)
    code = f"{_random.randint(0, 999999):06d}"
    doc = {
        'id': str(uuid.uuid4()),
        'email': email,
        'code_hash': _hashlib.sha256(code.encode()).hexdigest(),
        'attempts': 0,
        'used': False,
        'created_at': now.isoformat(),
        'expires_at': (now + timedelta(minutes=15)).isoformat(),
    }
    # Invalidate previous unused reset codes
    await db.password_reset_otps.update_many({'email': email, 'used': False}, {'$set': {'expires_at': now.isoformat()}})
    await db.password_reset_otps.insert_one(doc)

    result = await _send_otp_email(email, code)  # reuse the branded OTP mailer
    if not result.get('ok'):
        # Do NOT surface delivery failure to the client — it would leak which
        # emails have accounts. Log server-side and still return ok:true so the
        # UI can transition to the reset stage.
        logger.warning('Reset email delivery failed for %s: %s', email, result.get('error'))
    return {'ok': True}


@api.post('/auth/reset-password')
async def auth_reset_password(payload: dict):
    email = (payload.get('email') or '').strip().lower()
    code = (payload.get('code') or '').strip()
    new_password = payload.get('password') or ''
    if not email or not code or not new_password:
        raise HTTPException(400, 'Email, code and new password are required')
    if len(new_password) < 6:
        raise HTTPException(400, 'Password must be at least 6 characters long')
    if not code.isdigit() or len(code) != 6:
        raise HTTPException(400, 'Enter the 6-digit code from your email')

    now = datetime.now(timezone.utc)
    otp = await db.password_reset_otps.find_one(
        {'email': email, 'used': False, 'expires_at': {'$gt': now.isoformat()}},
        sort=[('created_at', -1)],
    )
    if not otp:
        raise HTTPException(400, 'Reset code expired. Please request a new one.')
    if otp.get('attempts', 0) >= 5:
        await db.password_reset_otps.update_one({'id': otp['id']}, {'$set': {'expires_at': now.isoformat()}})
        raise HTTPException(429, 'Too many wrong attempts. Please request a new reset code.')
    if _hashlib.sha256(code.encode()).hexdigest() != otp['code_hash']:
        await db.password_reset_otps.update_one({'id': otp['id']}, {'$inc': {'attempts': 1}})
        raise HTTPException(400, 'Incorrect reset code.')

    user = await db.users.find_one({'email': email}, {'_id': 0})
    if not user:
        raise HTTPException(404, 'No account found for this email')

    await db.users.update_one({'user_id': user['user_id']}, {'$set': {'password_hash': _hash_password(new_password), 'updated_at': now.isoformat()}})
    await db.password_reset_otps.update_one({'id': otp['id']}, {'$set': {'used': True, 'used_at': now.isoformat()}})

    session_token, _ = await _issue_session(user['user_id'])
    user_doc = await db.users.find_one({'user_id': user['user_id']}, {'_id': 0, 'password_hash': 0})
    return _cookie_response({'user': user_doc}, session_token)




@api.post("/family/{family_id}/share")
async def enable_family_share(family_id: str):
    """Generate (or reuse) a public share token for a family cookbook."""
    fam = await db.families.find_one({'id': family_id, 'user_id': current_uid.get()})
    if not fam:
        raise HTTPException(404, 'Family not found')
    token = fam.get('share_token') or _secrets.token_urlsafe(12)
    await db.families.update_one({'id': family_id}, {'$set': {'share_token': token, 'shared_at': now_iso()}})
    return {'share_token': token, 'path': f'/cookbook/{token}'}


@api.post("/family/{family_id}/unshare")
async def disable_family_share(family_id: str):
    fam = await db.families.find_one({'id': family_id, 'user_id': current_uid.get()})
    if not fam:
        raise HTTPException(404, 'Family not found')
    await db.families.update_one({'id': family_id}, {'$set': {'share_token': None, 'shared_at': None}})
    return {'ok': True}


@api.get("/public/cookbook/{token}")
async def public_cookbook(token: str):
    """Read-only public view of a family cookbook by share token."""
    fam = await db.families.find_one({'share_token': token})
    if not fam:
        raise HTTPException(404, 'Cookbook not found or link revoked')
    family = _strip_id(dict(fam))
    # Only expose safe fields
    safe_family = {
        'id': family['id'],
        'name': family.get('name'),
        'description': family.get('description'),
        'language': family.get('language'),
        'coverPhoto': family.get('coverPhoto'),
    }
    recipes = await db.recipes.find({'family_id': family['id']}).sort('created_at', -1).to_list(500)
    stories = await db.stories.find({'family_id': family['id']}).sort('created_at', -1).to_list(500)

    def _clean(doc):
        d = _strip_id(dict(doc))
        d.pop('user_id', None)
        return d

    return {
        'family': safe_family,
        'recipes': [_clean(r) for r in recipes],
        'stories': [_clean(s) for s in stories],
    }


# --------------------- Public voice playback (for QR codes) ---------------------
from fastapi.responses import Response, HTMLResponse, StreamingResponse


@api.get("/public/cookbook/{token}/voice/{kind}/{item_id}")
async def public_voice_page(token: str, kind: str, item_id: str):
    """Small mobile-friendly page that plays a single recipe/story voice recording.
    Rendered when a QR code from the printed book is scanned.
    """
    fam = await db.families.find_one({'share_token': token})
    if not fam:
        return HTMLResponse('<h1>Link revoked</h1>', status_code=404)
    coll = db.recipes if kind == 'recipe' else db.stories
    item = await coll.find_one({'id': item_id, 'family_id': fam['id']})
    if not item:
        return HTMLResponse('<h1>Not found</h1>', status_code=404)
    audio_src = item.get('audio_src') or ''
    title = (item.get('title') or 'Family voice').replace('<', '&lt;').replace('>', '&gt;')
    author = (item.get('author') or '').replace('<', '&lt;').replace('>', '&gt;')
    if not audio_src:
        return HTMLResponse(
            f'''<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{title}</title></head>
<body style="font-family:-apple-system,sans-serif;background:#FBF7F1;color:#1F1B16;padding:40px 20px;text-align:center;">
  <h1 style="font-family:Georgia,serif;">{title}</h1>
  <p>No voice recording available for this entry.</p>
</body></html>''', status_code=200)

    html = f'''<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{title} · CuminJar</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#FBF7F1;color:#1F1B16;padding:40px 20px;max-width:520px;margin:0 auto;">
  <div style="text-align:center;">
    <div style="font-family:Georgia,serif;font-size:22px;font-weight:600;"><span style="color:#C46B4A;">Cumin</span><span style="color:#3D5A3A;">Jar</span></div>
    <p style="margin-top:8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#C46B4A;">Family voice</p>
    <h1 style="font-family:Georgia,serif;font-size:28px;margin:12px 0 4px 0;">{title}</h1>
    <p style="margin:0;color:#6b7280;font-size:14px;">By {author}</p>
  </div>
  <div style="margin-top:32px;background:#fff;border:1px solid #E9DEC6;border-radius:16px;padding:20px;">
    <audio autoplay controls src="{audio_src}" style="width:100%;">Your browser cannot play this audio.</audio>
  </div>
  <p style="margin-top:24px;font-size:12px;color:#9ca3af;text-align:center;">Preserved on CuminJar 🫙</p>
</body></html>'''
    return HTMLResponse(html)


# --------------------- Printable Cookbook (PDF with QR voice codes) ---------------------
def _fetch_recipe_cover_bytes(cover: str) -> Optional[bytes]:
    if not cover:
        return None
    if cover.startswith('data:'):
        try:
            import base64 as _b64
            return _b64.b64decode(cover.split(',', 1)[1])
        except Exception:
            return None
    return None


def _build_cookbook_pdf(base_url: str, token: str, family: dict, recipes: list, stories: list) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, Table, TableStyle, KeepTogether
    )
    import qrcode as _qr

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2.2 * cm, rightMargin=2.2 * cm,
        topMargin=2.0 * cm, bottomMargin=2.0 * cm,
        title=f"{family.get('name', 'Family')} Cookbook",
    )

    green = HexColor('#3D5A3A')
    terracotta = HexColor('#C46B4A')
    cream = HexColor('#FBF7F1')
    ink = HexColor('#1F1B16')

    styles = getSampleStyleSheet()
    h_family = ParagraphStyle('h_family', parent=styles['Title'], fontName='Times-Bold', fontSize=44, leading=50, textColor=ink, alignment=1)
    kicker = ParagraphStyle('kicker', parent=styles['Normal'], fontSize=10, textColor=terracotta, alignment=1, spaceAfter=8)
    subtitle = ParagraphStyle('sub', parent=styles['Normal'], fontSize=12, textColor=HexColor('#6b7280'), alignment=1, spaceAfter=6, leading=18)
    h_recipe = ParagraphStyle('h_recipe', parent=styles['Heading1'], fontName='Times-Bold', fontSize=26, leading=30, textColor=ink, spaceAfter=6)
    h_section = ParagraphStyle('h_sec', parent=styles['Heading2'], fontName='Times-Bold', fontSize=14, textColor=green, spaceBefore=10, spaceAfter=4)
    meta = ParagraphStyle('meta', parent=styles['Normal'], fontSize=10, textColor=HexColor('#6b7280'), spaceAfter=10)
    ing_style = ParagraphStyle('ing', parent=styles['Normal'], fontSize=11, textColor=ink, leading=16)
    step_style = ParagraphStyle('step', parent=styles['Normal'], fontSize=11, textColor=ink, leading=16, spaceAfter=6)
    story_text = ParagraphStyle('story', parent=styles['Normal'], fontSize=11, textColor=ink, leading=16, spaceAfter=6)
    qr_caption = ParagraphStyle('qrcap', parent=styles['Normal'], fontSize=9, textColor=HexColor('#6b7280'), alignment=1, leading=12)

    def make_qr(url: str, size_cm: float = 3.2) -> Image:
        img = _qr.make(url)
        b = io.BytesIO()
        img.save(b, format='PNG')
        b.seek(0)
        return Image(b, width=size_cm * cm, height=size_cm * cm)

    story_pdf = []

    # Cover page
    story_pdf.append(Spacer(1, 5 * cm))
    story_pdf.append(Paragraph('THE FAMILY COOKBOOK', kicker))
    story_pdf.append(Paragraph(family.get('name') or 'Our Family', h_family))
    story_pdf.append(Spacer(1, 0.4 * cm))
    if family.get('description'):
        story_pdf.append(Paragraph(family['description'], subtitle))
    story_pdf.append(Spacer(1, 1 * cm))
    story_pdf.append(Paragraph('Preserved with love · Voices, recipes and stories', subtitle))
    story_pdf.append(Spacer(1, 3 * cm))
    story_pdf.append(Paragraph('Scan any QR code inside to hear your loved one\'s voice.', subtitle))
    story_pdf.append(Paragraph('Preserved on CuminJar 🫙', qr_caption))

    # Table of contents
    if recipes or stories:
        story_pdf.append(PageBreak())
        story_pdf.append(Paragraph('Contents', h_recipe))
        story_pdf.append(Spacer(1, 0.3 * cm))
        if recipes:
            story_pdf.append(Paragraph('Recipes', h_section))
            for r in recipes:
                story_pdf.append(Paragraph(f"• {r.get('title', 'Untitled')}", ing_style))
        if stories:
            story_pdf.append(Paragraph('Stories & Festivals', h_section))
            for s in stories:
                story_pdf.append(Paragraph(f"• {s.get('title', 'Untitled')}", ing_style))

    # Recipe pages
    for r in recipes:
        story_pdf.append(PageBreak())
        story_pdf.append(Paragraph('RECIPE', kicker))
        story_pdf.append(Paragraph(r.get('title') or 'Untitled Recipe', h_recipe))
        meta_bits = []
        if r.get('author'):
            meta_bits.append(f"By {r['author']}")
        if r.get('region'):
            meta_bits.append(r['region'])
        if r.get('serves'):
            meta_bits.append(f"Serves {r['serves']}")
        if r.get('time'):
            meta_bits.append(str(r['time']))
        if meta_bits:
            story_pdf.append(Paragraph(' · '.join(meta_bits), meta))

        cover_bytes = _fetch_recipe_cover_bytes(r.get('cover') or '')
        qr_url = f"{base_url}/api/public/cookbook/{token}/voice/recipe/{r['id']}"
        has_audio = bool(r.get('audio_src'))
        top_cells = []
        if cover_bytes:
            try:
                img = Image(io.BytesIO(cover_bytes), width=9 * cm, height=6 * cm, kind='proportional')
                top_cells.append(img)
            except Exception:
                top_cells.append(Paragraph('', ing_style))
        else:
            top_cells.append(Paragraph('', ing_style))
        if has_audio:
            qr_cell = [make_qr(qr_url), Paragraph('Scan to hear this in the family voice', qr_caption)]
            top_cells.append(qr_cell)
        else:
            top_cells.append(Paragraph('', ing_style))
        if any(top_cells):
            tbl = Table([top_cells], colWidths=[10 * cm, 5.6 * cm])
            tbl.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story_pdf.append(tbl)

        story_pdf.append(Paragraph('Ingredients', h_section))
        ings = r.get('ingredients') or []
        if ings:
            for ing in ings:
                story_pdf.append(Paragraph(f"•&nbsp;&nbsp;{ing}", ing_style))
        else:
            story_pdf.append(Paragraph('—', ing_style))

        story_pdf.append(Paragraph('Method', h_section))
        steps = r.get('steps') or []
        if steps:
            for i, step in enumerate(steps, 1):
                story_pdf.append(Paragraph(f"<b>{i}.</b>&nbsp;&nbsp;{step}", step_style))
        else:
            transcript = r.get('transcript_en') or ''
            for para in [p for p in transcript.split('\n') if p.strip()]:
                story_pdf.append(Paragraph(para, step_style))

    # Story pages
    for s in stories:
        story_pdf.append(PageBreak())
        story_pdf.append(Paragraph('STORY' if s.get('kind') != 'festival' else 'FESTIVAL', kicker))
        story_pdf.append(Paragraph(s.get('title') or 'Untitled', h_recipe))
        if s.get('author'):
            story_pdf.append(Paragraph(f"By {s['author']}", meta))

        qr_url = f"{base_url}/api/public/cookbook/{token}/voice/story/{s['id']}"
        if s.get('audio_src'):
            qr_block = KeepTogether([make_qr(qr_url), Paragraph('Scan to hear this in the family voice', qr_caption), Spacer(1, 0.4 * cm)])
            story_pdf.append(qr_block)

        text = s.get('excerpt') or s.get('transcript_en') or ''
        for para in [p for p in text.split('\n') if p.strip()]:
            story_pdf.append(Paragraph(para, story_text))

    def _bg(canvas, _doc):
        canvas.saveState()
        canvas.setFillColor(cream)
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        # Footer
        canvas.setFillColor(HexColor('#9ca3af'))
        canvas.setFont('Helvetica', 8)
        canvas.drawCentredString(A4[0] / 2, 1.2 * cm, f"CuminJar · {family.get('name', 'Family')} Cookbook")
        canvas.restoreState()

    doc.build(story_pdf, onFirstPage=_bg, onLaterPages=_bg)
    return buf.getvalue()


@api.get("/public/cookbook/{token}/book.pdf")
async def public_cookbook_pdf(token: str):
    fam = await db.families.find_one({'share_token': token})
    if not fam:
        raise HTTPException(404, 'Cookbook not found or link revoked')
    family = {
        'id': fam['id'],
        'name': fam.get('name'),
        'description': fam.get('description'),
    }
    recipes = await db.recipes.find({'family_id': fam['id']}).sort('created_at', 1).to_list(500)
    stories = await db.stories.find({'family_id': fam['id']}).sort('created_at', 1).to_list(500)
    base_url = APP_BASE_URL.rstrip('/')
    pdf_bytes = await asyncio.to_thread(_build_cookbook_pdf, base_url, token, family, recipes, stories)
    safe = ''.join(c for c in (family.get('name') or 'Family') if c.isalnum() or c in ' -_').strip() or 'Family'
    return Response(
        content=pdf_bytes,
        media_type='application/pdf',
        headers={'Content-Disposition': f'inline; filename="{safe}-Cookbook.pdf"'},
    )



# --------------------- Transcribe helper endpoint (voice + photo → English) ---------------------
@api.post("/smart-record")
async def smart_record(
    file: UploadFile = File(...),
    kind: str = Form('recipe'),   # recipe | story | festival
    media_kind: str = Form('audio'),  # audio | photo
    family_id: Optional[str] = Form(None),
    generate_image: bool = Form(True),
):
    """One-shot endpoint: transcribe (auto-detect language) -> translate to English -> structure -> generate image -> save.
    Returns the saved recipe/story doc.
    """
    data = await file.read()
    if not data:
        raise HTTPException(400, 'Empty file')

    # 1. Transcribe (auto-detect language)
    tr = await transcribe_media(
        media_kind='photo' if media_kind == 'photo' else 'audio',
        file_bytes=data,
        filename=file.filename or 'upload',
        mime_type=file.content_type or ('image/jpeg' if media_kind == 'photo' else 'audio/wav'),
        language_code='unknown',
    )
    english = tr.get('transcript_en', '') or tr.get('transcript', '')
    detected_lang = tr.get('language') or 'unknown'
    error = tr.get('error')

    if not english:
        raise HTTPException(422, f"Could not understand the {media_kind}. {error or ''}".strip())

    if kind == 'recipe':
        # Plan limit check
        limits = DEMO_USER.get('limits', {})
        max_recipes = limits.get('max_recipes', 3)
        if DEMO_USER.get('plan') == 'free':
            existing_count = await db.recipes.count_documents({'user_id': current_uid.get()})
            if existing_count >= max_recipes:
                raise HTTPException(402, f"Free plan allows only {max_recipes} recipes. Upgrade to Plus.")

        structured = await _gemini_structure_recipe(english)
        title = structured.get('title') or english.split('.')[0][:60] or 'Untitled Recipe'
        ingredients = structured.get('ingredients') or []
        steps = structured.get('steps') or []
        servings = structured.get('servings') or ''
        time_min = structured.get('time_minutes') or 0
        region = structured.get('region') or ''
        tags = structured.get('tags') or []

        cover = None
        if generate_image:
            cover = await _generate_recipe_image(title, english[:200], tags, region)

        # Store the original audio as a data URL so we can play it back later
        audio_src = None
        if media_kind == 'audio':
            try:
                import base64
                mime = file.content_type or 'audio/webm'
                audio_src = f"data:{mime};base64,{base64.b64encode(data).decode('ascii')}"
            except Exception:
                logger.exception('Failed to encode audio for playback')

        doc = {
            'id': str(uuid.uuid4()),
            'user_id': current_uid.get(),
            'family_id': family_id,
            'title': title,
            'author': current_user_name.get(),
            'region': region,
            'serves': str(servings),
            'time': f"{time_min} mins" if time_min else '',
            'tags': tags,
            'cover': cover,
            'ingredients': ingredients,
            'steps': steps,
            'transcript_en': english,
            'source_kind': media_kind,
            'source_language': detected_lang,
            'audio_src': audio_src,
            'liked': False,
            'created_at': now_iso(),
        }
        await db.recipes.insert_one(doc)
        return {'kind': 'recipe', 'item': _strip_id(doc)}

    else:
        # Story or Festival
        title = english.split('.')[0][:60] or ('Festival memory' if kind == 'festival' else 'Untitled Story')
        approx_mins = max(1, len(english.split()) // 130)
        story_emoji = '🪔' if kind == 'festival' else '📖'
        cover = _emoji_cover_svg(story_emoji, FAMILY_TINTS[(hash(title) % len(FAMILY_TINTS))])
        audio_src = None
        if media_kind == 'audio':
            try:
                import base64
                mime = file.content_type or 'audio/webm'
                audio_src = f"data:{mime};base64,{base64.b64encode(data).decode('ascii')}"
            except Exception:
                logger.exception('Failed to encode audio for playback')
        doc = {
            'id': str(uuid.uuid4()),
            'user_id': current_uid.get(),
            'family_id': family_id,
            'title': title,
            'author': current_user_name.get(),
            'excerpt': english,
            'mins': approx_mins,
            'kind': kind,
            'cover': cover,
            'transcript_en': english,
            'source_kind': media_kind,
            'source_language': detected_lang,
            'audio_src': audio_src,
            'created_at': now_iso(),
        }
        await db.stories.insert_one(doc)
        return {'kind': kind, 'item': _strip_id(doc)}


@api.patch("/recipes/{recipe_id}")
async def update_recipe_cover(recipe_id: str, payload: dict):
    """Update recipe (currently supports cover update)."""
    doc = await db.recipes.find_one({'id': recipe_id, 'user_id': current_uid.get()})
    if not doc:
        raise HTTPException(404, 'Recipe not found')
    allowed = {'cover', 'title', 'region', 'serves', 'time', 'tags', 'ingredients', 'steps'}
    updates = {k: v for k, v in payload.items() if k in allowed}
    if updates:
        await db.recipes.update_one({'id': recipe_id}, {'$set': updates})
    doc = await db.recipes.find_one({'id': recipe_id, 'user_id': current_uid.get()})
    return _strip_id(doc)


@api.post("/transcribe")
async def transcribe_media_endpoint(
    file: UploadFile = File(...),
    kind: str = Form('audio'),  # 'audio' or 'photo'
    language_code: str = Form('unknown'),
):
    """Universal transcription endpoint used by Recipes and Stories.
    kind='audio' -> Sarvam STT (chunked) + Gemini translation to English
    kind='photo' -> Gemini vision OCR + translation to English
    Returns {transcript, transcript_en, language, error}
    """
    data = await file.read()
    if not data:
        raise HTTPException(400, 'Empty file')
    result = await transcribe_media(
        media_kind='photo' if kind == 'photo' else 'audio',
        file_bytes=data,
        filename=file.filename or 'upload',
        mime_type=file.content_type or ('image/jpeg' if kind == 'photo' else 'audio/wav'),
        language_code=language_code,
    )
    return result


# --------------------- Recipes ---------------------
@api.get("/recipes")
async def list_recipes():
    await _seed_if_empty()
    items = await db.recipes.find({'user_id': current_uid.get()}).sort('created_at', -1).to_list(500)
    return [_strip_id(i) for i in items]


@api.post("/recipes")
async def create_recipe(payload: RecipeIn):
    limits = DEMO_USER.get('limits', {})
    max_recipes = limits.get('max_recipes', 3)
    existing_count = await db.recipes.count_documents({'user_id': current_uid.get()})
    if DEMO_USER.get('plan') == 'free' and existing_count >= max_recipes:
        raise HTTPException(
            402,
            f"Free plan allows only {max_recipes} recipes. Upgrade to Plus for unlimited recipes.",
        )
    doc = payload.dict()
    doc.update({'id': str(uuid.uuid4()), 'user_id': current_uid.get(), 'liked': False, 'created_at': now_iso()})
    await db.recipes.insert_one(doc)
    return _strip_id(doc)


@api.post("/recipes/{recipe_id}/like")
async def like_recipe(recipe_id: str):
    doc = await db.recipes.find_one({'id': recipe_id, 'user_id': current_uid.get()})
    if not doc:
        raise HTTPException(404, 'Recipe not found')
    new_liked = not doc.get('liked', False)
    await db.recipes.update_one({'id': recipe_id}, {'$set': {'liked': new_liked}})
    doc['liked'] = new_liked
    return _strip_id(doc)


@api.post("/recipes/{recipe_id}/regenerate-cover")
async def regenerate_recipe_cover(recipe_id: str):
    """Regenerate the AI cover image for a recipe using Gemini Nano Banana."""
    doc = await db.recipes.find_one({'id': recipe_id, 'user_id': current_uid.get()})
    if not doc:
        raise HTTPException(404, 'Recipe not found')
    title = doc.get('title') or 'Recipe'
    description = doc.get('transcript_en') or ''
    tags = doc.get('tags') or []
    region = doc.get('region') or ''
    cover = await _generate_recipe_image(title, description[:250], tags, region)
    if not cover:
        raise HTTPException(500, 'Could not generate cover')
    await db.recipes.update_one({'id': recipe_id}, {'$set': {'cover': cover}})
    doc['cover'] = cover
    return _strip_id(doc)


@api.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str):
    res = await db.recipes.delete_one({'id': recipe_id, 'user_id': current_uid.get()})
    if res.deleted_count == 0:
        raise HTTPException(404, 'Recipe not found')
    return {'ok': True}


@api.delete("/stories/{story_id}")
async def delete_story(story_id: str):
    res = await db.stories.delete_one({'id': story_id, 'user_id': current_uid.get()})
    if res.deleted_count == 0:
        raise HTTPException(404, 'Story not found')
    return {'ok': True}


# --------------------- Stories ---------------------
@api.get("/stories")
async def list_stories():
    await _seed_if_empty()
    items = await db.stories.find({'user_id': current_uid.get()}).sort('created_at', -1).to_list(500)
    return [_strip_id(i) for i in items]


@api.post("/stories")
async def create_story(payload: StoryIn):
    doc = payload.dict()
    doc.update({'id': str(uuid.uuid4()), 'user_id': current_uid.get(), 'created_at': now_iso()})
    await db.stories.insert_one(doc)
    return _strip_id(doc)


# --------------------- Albums ---------------------
@api.get("/albums")
async def list_albums():
    await _seed_if_empty()
    items = await db.albums.find({'user_id': current_uid.get()}).sort('created_at', -1).to_list(500)
    return [_strip_id(i) for i in items]


@api.post("/albums")
async def create_album(payload: AlbumIn):
    doc = payload.dict()
    doc.update({'id': str(uuid.uuid4()), 'user_id': current_uid.get(), 'count': 0, 'created_at': now_iso()})
    await db.albums.insert_one(doc)
    return _strip_id(doc)


# --------------------- Invites (email invitations) ---------------------


def _build_invite_email_html(inviter_name: str, family_name: str, invitee_name: str | None, relation: str | None, join_url: str) -> str:
    display_name = invitee_name or 'there'
    relation_line = f'as their <strong>{relation}</strong>' if relation else 'to their family'
    return f"""<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FBF7F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1F1B16;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7F1;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ececec;">
          <tr><td style="padding:32px 40px 8px 40px;">
            <div style="font-family:'Fraunces',Georgia,serif;font-size:24px;font-weight:600;">
              <span style="color:#C46B4A;">Cumin</span><span style="color:#3D5A3A;">Jar</span>
            </div>
          </td></tr>
          <tr><td style="padding:16px 40px 8px 40px;">
            <h1 style="font-family:'Fraunces',Georgia,serif;font-size:26px;line-height:1.2;margin:0 0 12px 0;color:#1F1B16;font-weight:600;">
              Hi {display_name}, you're invited to join <em style="color:#C46B4A;">{family_name}</em> on CuminJar
            </h1>
            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#4b5563;">
              {inviter_name} invited you {relation_line}'s private family space on CuminJar &mdash; a place to preserve family recipes, stories &amp; traditions in the voices of your loved ones.
            </p>
            <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#4b5563;">
              Recipes are more than ingredients. They're your history, your love, and your way of staying close. Come join the jar.
            </p>
            <p style="margin:0 0 28px 0;">
              <a href="{join_url}" style="display:inline-block;background:#3D5A3A;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:10px;font-size:15px;">Accept invitation</a>
            </p>
            <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">Or copy this link into your browser:</p>
            <p style="margin:0 0 24px 0;font-size:13px;color:#3D5A3A;word-break:break-all;">{join_url}</p>
          </td></tr>
          <tr><td style="padding:24px 40px 32px 40px;border-top:1px solid #f0eadf;background:#F7EFE3;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">If you weren't expecting this invitation, you can safely ignore this email. Your family space is always private and secure.</p>
            <p style="margin:8px 0 0 0;font-size:12px;color:#9ca3af;">&copy; CuminJar &middot; Made with love, for families.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""


async def _send_invite_email(email: str, invitee_name: str | None, relation: str | None, family_name: str, inviter_name: str) -> dict:
    """Send invite email via Resend. Returns {ok, id?, error?}."""
    if not RESEND_API_KEY:
        return {'ok': False, 'error': 'RESEND_API_KEY not configured'}
    join_url = f"{APP_BASE_URL}/get-started?invite={email}"
    subject = f"{inviter_name} invited you to {family_name} on CuminJar"
    html = _build_invite_email_html(inviter_name, family_name, invitee_name, relation, join_url)

    def _send():
        import resend
        resend.api_key = RESEND_API_KEY
        try:
            resp = resend.Emails.send({
                'from': RESEND_FROM_EMAIL,
                'to': [email],
                'subject': subject,
                'html': html,
            })
            return {'ok': True, 'id': (resp or {}).get('id')}
        except Exception as e:
            logger.exception('Resend send failed')
            return {'ok': False, 'error': str(e)}
    return await asyncio.to_thread(_send)


@api.get("/invites")
async def list_invites():
    items = await db.invites.find({'user_id': current_uid.get()}).sort('created_at', -1).to_list(200)
    return [_strip_id(i) for i in items]


@api.post("/invites")
async def create_invite(payload: InviteIn):
    email = (payload.email or '').strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(400, 'Invalid email address')

    # Free plan can only have 1 family member (themselves) — no invites allowed
    limits = DEMO_USER.get('limits', {})
    max_members = limits.get('max_family_members', 1)
    current_invites = await db.invites.count_documents({'user_id': current_uid.get()})
    if DEMO_USER.get('plan') == 'free' and (max_members - 1) <= current_invites:
        raise HTTPException(
            402,
            "Free plan doesn't allow inviting more family members. Upgrade to Plus to invite family.",
        )

    existing = await db.invites.find_one({'user_id': current_uid.get(), 'email': email})
    if existing:
        raise HTTPException(409, 'This email is already invited')

    # Determine family + inviter names
    family_doc = await db.families.find_one({'user_id': current_uid.get()})
    family_name = (family_doc or {}).get('name') or 'our family'
    inviter_name = current_user_name.get()

    # Send email via Resend
    send_result = await _send_invite_email(
        email=email,
        invitee_name=(payload.name or '').strip() or None,
        relation=(payload.relation or '').strip() or None,
        family_name=family_name,
        inviter_name=inviter_name,
    )

    doc = {
        'id': str(uuid.uuid4()),
        'user_id': current_uid.get(),
        'email': email,
        'name': (payload.name or '').strip() or None,
        'relation': (payload.relation or '').strip() or None,
        'status': 'pending',
        'email_sent': bool(send_result.get('ok')),
        'email_error': send_result.get('error'),
        'email_provider_id': send_result.get('id'),
        'created_at': now_iso(),
    }
    await db.invites.insert_one(doc)

    # Notification
    if send_result.get('ok'):
        notif_desc = f'Invitation email sent to {email}.'
    else:
        notif_desc = f'Invite saved for {email} (email delivery pending: {send_result.get("error", "unknown error")})'
    await db.notifications.insert_one({
        'id': str(uuid.uuid4()),
        'user_id': current_uid.get(),
        'icon': 'Users',
        'title': 'Family invite sent' if send_result.get('ok') else 'Family invite saved',
        'desc': notif_desc,
        'when': 'just now',
        'read': False,
        'created_at': now_iso(),
    })
    return _strip_id(doc)


@api.delete("/invites/{invite_id}")
async def delete_invite(invite_id: str):
    res = await db.invites.delete_one({'id': invite_id, 'user_id': current_uid.get()})
    if res.deleted_count == 0:
        raise HTTPException(404, 'Invite not found')
    return {'ok': True}


# --------------------- Contact ---------------------
@api.post("/contact")
async def create_contact(payload: ContactIn):
    email = (payload.email or '').strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(400, 'Invalid email address')
    if not payload.message.strip():
        raise HTTPException(400, 'Message required')
    doc = {
        'id': str(uuid.uuid4()),
        'name': payload.name.strip(),
        'email': email,
        'subject': (payload.subject or '').strip(),
        'message': payload.message.strip(),
        'created_at': now_iso(),
    }
    await db.contact_messages.insert_one(doc)
    return {'ok': True, 'id': doc['id']}


# --------------------- Family Tree ---------------------
@api.get("/family-tree")
async def get_family_tree():
    await _seed_if_empty()
    items = await db.family_tree.find({'user_id': current_uid.get()}).to_list(500)
    return [_strip_id(i) for i in items]


@api.post("/family-tree")
async def add_family_member(payload: FamilyMemberIn):
    doc = payload.dict()
    doc.update({'id': str(uuid.uuid4()), 'user_id': current_uid.get(), 'created_at': now_iso()})
    await db.family_tree.insert_one(doc)
    return _strip_id(doc)


# --------------------- Notifications ---------------------
@api.get("/notifications")
async def list_notifications():
    await _seed_if_empty()
    items = await db.notifications.find({'user_id': current_uid.get()}).sort('created_at', -1).to_list(200)
    unread = await db.notifications.count_documents({'user_id': current_uid.get(), 'read': False})
    return {'items': [_strip_id(i) for i in items], 'unread': unread}


@api.post("/notifications/mark-read")
async def mark_read():
    await db.notifications.update_many({'user_id': current_uid.get()}, {'$set': {'read': True}})
    return {'ok': True}


# --------------------- Voice Recipes (Sarvam STT + Gemini translate) ---------------------
SARVAM_MAX_CHUNK_S = 25  # keep under Sarvam's 30-second real-time limit


def _split_audio_bytes(audio_bytes: bytes) -> list[bytes]:
    """Split audio into <= SARVAM_MAX_CHUNK_S second WAV chunks."""
    from pydub import AudioSegment
    audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
    chunk_ms = SARVAM_MAX_CHUNK_S * 1000
    chunks: list[bytes] = []
    for start in range(0, len(audio), chunk_ms):
        chunk = audio[start:start + chunk_ms]
        buf = io.BytesIO()
        chunk.export(buf, format='wav')
        chunks.append(buf.getvalue())
    return chunks or [audio_bytes]


def _sarvam_transcribe_sync(audio_bytes: bytes, language_code: str, filename: str) -> dict:
    from sarvamai import SarvamAI
    client = SarvamAI(api_subscription_key=SARVAM_API_KEY)
    buf = io.BytesIO(audio_bytes)
    buf.name = filename or 'audio.wav'
    try:
        resp = client.speech_to_text.transcribe(
            file=buf,
            model='saarika:v2.5',
            language_code=language_code if language_code and language_code != 'auto' else 'unknown',
        )
        transcript = getattr(resp, 'transcript', None) or getattr(resp, 'text', None) or ''
        detected = getattr(resp, 'language_code', None) or language_code
        return {'transcript': transcript, 'language': detected}
    except Exception as e:
        logger.exception('Sarvam STT failed')
        return {'transcript': '', 'language': language_code, 'error': str(e)}


async def _sarvam_transcribe(audio_bytes: bytes, language_code: str, filename: str) -> dict:
    """Chunk audio if needed and transcribe each chunk, then concatenate."""
    def _run():
        try:
            chunks = _split_audio_bytes(audio_bytes)
        except Exception as e:
            logger.exception('Audio chunking failed')
            # Fall back to a single call with the raw bytes
            return _sarvam_transcribe_sync(audio_bytes, language_code, filename)
        parts: list[str] = []
        detected = language_code
        last_error = None
        for idx, chunk_bytes in enumerate(chunks):
            r = _sarvam_transcribe_sync(chunk_bytes, language_code, f'chunk_{idx}.wav')
            if r.get('error'):
                last_error = r['error']
            if r.get('transcript'):
                parts.append(r['transcript'].strip())
            if r.get('language'):
                detected = r['language']
        transcript = ' '.join(p for p in parts if p).strip()
        return {'transcript': transcript, 'language': detected, 'error': last_error if not transcript else None}
    return await asyncio.to_thread(_run)


async def _translate_to_english(text: str, source_lang: str) -> str:
    if not text.strip():
        return ''
    if source_lang and source_lang.startswith('en'):
        return text
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f'translate-{uuid.uuid4()}',
            system_message='You are a professional translator. Translate the given text to natural, fluent English. Preserve the meaning, tone and any recipe/cooking instructions. Return ONLY the translated English text, no preface.',
        ).with_model('gemini', 'gemini-2.5-flash')
        try:
            translated = (await chat.send_message(UserMessage(text=text))) or ''
        except Exception:
            parts = []
            async for ev in chat.stream_message(UserMessage(text=text)):
                content = getattr(ev, 'content', None)
                if content:
                    parts.append(content)
            translated = ''.join(parts)
        translated = (translated or '').strip()
        return translated or text
    except Exception:
        logger.exception('Translation failed')
        return text


async def _gemini_structure_recipe(text: str) -> dict:
    """Take a raw English transcript and structure it into a recipe card via Gemini."""
    if not text.strip():
        return {}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import json as _json
        import re as _re
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f'structure-{uuid.uuid4()}',
            system_message=(
                'You convert raw English recipe transcripts into a STRICT, VALID JSON object — nothing else.\n'
                'The JSON MUST match this exact shape:\n'
                '{"title": string, "ingredients": [string], "steps": [string], "servings": string, "time_minutes": integer, "region": string, "tags": [string]}\n\n'
                'Rules:\n'
                '1. Return ONLY the JSON object, no prose, no code fences, no comments.\n'
                '2. Use double quotes only. No trailing commas. No single quotes.\n'
                '3. Escape any double-quote inside a string with a backslash.\n'
                '4. "ingredients" MUST be an ordered list of strings where each item includes the QUANTITY + UNIT + NAME (e.g. "2 tbsp grated coconut", "1/2 tsp cumin seeds", "1 cup thick curd"). Extract quantities from the transcript; if a quantity is vague, use "to taste" or a reasonable inferred amount.\n'
                '5. "steps" MUST be an ordered list of concise, complete instruction sentences (no numbering, no bullet points — the array position IS the number).\n'
                '6. "time_minutes" is an integer total minutes.\n'
                '7. "servings" is a string like "4" or "3-4".\n'
                '8. "region" is one of: South Indian, North Indian, Coastal, Punjabi, Gujarati, Bengali, Other.\n'
                '9. "tags" 2–4 short labels (e.g., "Lentils", "Vegan", "Comfort").\n'
                '10. "title" is a clean recipe name (e.g., "Morkuzhambu"), NOT the transcript preamble.'
            ),
        ).with_model('gemini', 'gemini-2.5-flash')
        try:
            raw = (await chat.send_message(UserMessage(text=text))) or ''
        except Exception:
            # Fallback to streaming if non-streaming fails
            parts = []
            async for ev in chat.stream_message(UserMessage(text=text)):
                content = getattr(ev, 'content', None)
                if content:
                    parts.append(content)
            raw = ''.join(parts)
        raw = (raw or '').strip()
        # Clean common wrappers
        raw = raw.replace('```json', '').replace('```', '').strip()
        # Extract the first top-level { ... } if there's stray prose
        start = raw.find('{')
        end = raw.rfind('}')
        if start >= 0 and end > start:
            raw = raw[start:end + 1]
        # Attempt parse; fall back through progressively lenient repairs
        for candidate in (
            raw,
            _re.sub(r',(\s*[\]}])', r'\1', raw),  # strip trailing commas
            _re.sub(r'([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:', r'\1"\2":', _re.sub(r',(\s*[\]}])', r'\1', raw)),  # quote unquoted keys
        ):
            try:
                return _json.loads(candidate)
            except Exception:
                continue
        logger.warning('Gemini structuring: could not parse JSON. Raw head: %s', raw[:300])
        return {}
    except Exception:
        logger.exception('Recipe structuring failed')
        return {}


RECIPE_EMOJIS = {
    'south indian': '🥘', 'north indian': '🍛', 'coastal': '🐟', 'punjabi': '🫓',
    'gujarati': '🥟', 'bengali': '🐟', 'sweet': '🍮', 'dessert': '🍮', 'breakfast': '🥞',
    'snack': '🥟', 'dal': '🍲', 'sambar': '🍲', 'curry': '🍛', 'rice': '🍚', 'paratha': '🫓',
    'chicken': '🍗', 'fish': '🐟', 'egg': '🍳', 'chai': '☕', 'tea': '☕',
}
FAMILY_TINTS = ['#FBE3D2', '#DFEAD8', '#E4DEF4', '#F9E4C3', '#F7D9DA']


def _pick_emoji(title: str, tags, region: str) -> str:
    text = f"{title} {' '.join(tags or [])} {region or ''}".lower()
    for k, v in RECIPE_EMOJIS.items():
        if k in text:
            return v
    return '🍽️'


def _emoji_cover_svg(emoji: str, tint: str = '#FBE3D2') -> str:
    """Return a data URL for a soft square SVG with a big centered emoji."""
    import base64
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{tint}"/>
      <stop offset="100%" stop-color="#FBF7F1"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#g)"/>
  <circle cx="80" cy="80" r="40" fill="#ffffff" opacity="0.25"/>
  <circle cx="330" cy="330" r="70" fill="#ffffff" opacity="0.2"/>
  <text x="200" y="245" font-size="200" text-anchor="middle" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">{emoji}</text>
</svg>'''
    b64 = base64.b64encode(svg.encode('utf-8')).decode('ascii')
    return f"data:image/svg+xml;base64,{b64}"


async def _generate_recipe_image(recipe_title: str, description: str, tags=None, region: str = '') -> Optional[str]:
    """Generate a realistic recipe cover using Gemini Nano Banana.
    Falls back to emoji SVG if generation fails.
    """
    # Build a rich, photorealistic prompt tuned for food photography
    tag_str = ', '.join(tags or [])
    region_str = region or 'Indian'
    prompt = (
        f"A photorealistic overhead food photography shot of \"{recipe_title}\", "
        f"a homemade {region_str} dish. {description[:250]}. "
        f"Styled on a rustic wooden table with soft natural window light, garnished traditionally, "
        f"served in a ceramic or brass bowl, warm inviting colours, shallow depth of field, "
        f"appetising and mouth-watering, editorial cookbook style, sharp focus, high detail. "
        f"No text, no watermark, no logos, no hands, square composition."
        + (f" Cuisine notes: {tag_str}." if tag_str else '')
    )
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import base64
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f'recipe-img-{uuid.uuid4()}',
            system_message='You are a professional food photographer producing photorealistic images.',
        )
        chat.with_model('gemini', 'gemini-3.1-flash-image-preview').with_params(modalities=['image', 'text'])
        msg = UserMessage(text=prompt)
        _text, images = await chat.send_message_multimodal_response(msg)
        if images:
            first = images[0]
            mime = first.get('mime_type', 'image/png')
            data = first.get('data', '')
            if data:
                return f"data:{mime};base64,{data}"
    except Exception:
        logger.exception('Gemini image generation failed; falling back to emoji cover')
    # Fallback
    emoji = _pick_emoji(recipe_title or '', tags or [], region or '')
    tint = FAMILY_TINTS[(hash(recipe_title or '') % len(FAMILY_TINTS))]
    return _emoji_cover_svg(emoji, tint)


async def _gemini_ocr_image(image_bytes: bytes, mime_type: str = 'image/jpeg') -> str:
    """Extract text from an image (e.g., handwritten recipe page) using Gemini vision. Returns English text."""
    if not image_bytes:
        return ''
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        import base64
        b64 = base64.b64encode(image_bytes).decode('utf-8')
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f'ocr-{uuid.uuid4()}',
            system_message=(
                'You are a helpful assistant that reads photographs of handwritten or printed recipe/story pages. '
                'Extract ALL text from the image, translate it to natural fluent English if it is in another language, '
                'and preserve the structure (ingredients as a list, steps numbered, headings kept). '
                'Return ONLY the extracted and translated text. No preface, no commentary.'
            ),
        ).with_model('gemini', 'gemini-2.5-flash')
        msg = UserMessage(
            text='Please transcribe and translate this image to English.',
            file_contents=[ImageContent(image_base64=b64)],
        )
        try:
            out = (await chat.send_message(msg)) or ''
        except Exception:
            parts = []
            async for ev in chat.stream_message(msg):
                content = getattr(ev, 'content', None)
                if content:
                    parts.append(content)
            out = ''.join(parts)
        return (out or '').strip()
    except Exception:
        logger.exception('Gemini OCR failed')
        return ''


async def transcribe_media(
    media_kind: str,
    file_bytes: bytes,
    filename: str,
    mime_type: str,
    language_code: str = 'unknown',
) -> dict:
    """
    Unified transcription helper for both audio and photo.
    Returns: {transcript, transcript_en, language, error}
    """
    if media_kind == 'audio':
        stt = await _sarvam_transcribe(file_bytes, language_code, filename)
        transcript = stt.get('transcript', '') or ''
        lang = stt.get('language', language_code) or language_code
        error = stt.get('error')
        if transcript and lang and str(lang).lower().startswith('en'):
            transcript_en = transcript
        elif transcript:
            transcript_en = await _translate_to_english(transcript, str(lang))
        else:
            transcript_en = ''
        return {'transcript': transcript, 'transcript_en': transcript_en, 'language': lang, 'error': error}
    elif media_kind == 'photo':
        english = await _gemini_ocr_image(file_bytes, mime_type)
        return {'transcript': english, 'transcript_en': english, 'language': 'en-IN', 'error': None if english else 'Could not read text from image'}
    else:
        return {'transcript': '', 'transcript_en': '', 'language': language_code, 'error': f'Unknown media kind: {media_kind}'}


@api.get("/voice-recipes")
async def list_voice_recipes():
    items = await db.voice_recipes.find({'user_id': current_uid.get()}).sort('created_at', -1).to_list(200)
    return [_strip_id(i) for i in items]


@api.post("/voice-recipes")
async def create_voice_recipe(
    audio: UploadFile = File(...),
    title: str = Form(...),
    author: str = Form('You'),
    language_code: str = Form('unknown'),
    duration: float = Form(0.0),
):
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(400, 'Empty audio file')

    result = await transcribe_media(
        media_kind='audio',
        file_bytes=audio_bytes,
        filename=audio.filename or 'audio.webm',
        mime_type=audio.content_type or 'audio/webm',
        language_code=language_code,
    )
    dur_str = f"{int(duration)//60}:{int(duration)%60:02d}"

    doc = {
        'id': str(uuid.uuid4()),
        'user_id': current_uid.get(),
        'title': title,
        'author': author,
        'language': result.get('language') or language_code,
        'duration': dur_str,
        'transcript': result.get('transcript', ''),
        'transcript_en': result.get('transcript_en', ''),
        'error': result.get('error'),
        'created_at': now_iso(),
    }
    await db.voice_recipes.insert_one(doc)

    await db.notifications.insert_one({
        'id': str(uuid.uuid4()),
        'user_id': current_uid.get(),
        'icon': 'Sparkles',
        'title': 'AI transcription complete',
        'desc': f'Your recording \u201c{title}\u201d has been transcribed.',
        'when': 'just now',
        'read': False,
        'created_at': now_iso(),
    })
    return _strip_id(doc)


@api.delete("/voice-recipes/{vid}")
async def delete_voice_recipe(vid: str):
    res = await db.voice_recipes.delete_one({'id': vid, 'user_id': current_uid.get()})
    if res.deleted_count == 0:
        raise HTTPException(404, 'Not found')
    return {'ok': True}


# --------------------- App wiring ---------------------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def auth_context_middleware(request, call_next):
    """Resolve the current user from the session cookie (or Bearer) and set ContextVars.
    Falls back to the demo user when no valid session is present, preserving the demo experience
    for anonymous browsing.
    """
    token = request.cookies.get('session_token')
    if not token:
        auth = request.headers.get('authorization') or request.headers.get('Authorization')
        if auth and auth.lower().startswith('bearer '):
            token = auth.split(' ', 1)[1].strip()

    uid_token = None
    name_token = None
    pic_token = None
    if token:
        try:
            session = await db.user_sessions.find_one({'session_token': token}, {'_id': 0})
        except Exception:
            session = None
        if session:
            expires_at = session.get('expires_at')
            if isinstance(expires_at, str):
                try:
                    expires_at = datetime.fromisoformat(expires_at)
                except Exception:
                    expires_at = None
            if expires_at and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at and expires_at > datetime.now(timezone.utc):
                try:
                    user = await db.users.find_one({'user_id': session['user_id']}, {'_id': 0})
                except Exception:
                    user = None
                if user:
                    uid_token = current_uid.set(user['user_id'])
                    name_token = current_user_name.set(user.get('name') or user.get('email') or 'You')
                    pic_token = current_user_picture.set(user.get('picture'))

    try:
        response = await call_next(request)
    finally:
        if uid_token is not None:
            current_uid.reset(uid_token)
        if name_token is not None:
            current_user_name.reset(name_token)
        if pic_token is not None:
            current_user_picture.reset(pic_token)
    return response


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
