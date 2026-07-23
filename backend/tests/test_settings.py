"""Backend tests for Settings-page auth endpoints.

Covers:
- PATCH /api/auth/me    (name/language/notification_prefs/picture, 400/401 paths)
- POST  /api/auth/logout-all-devices (removes all sessions, clears cookie)
- GET   /api/auth/me    (baseline, used to seed & verify persistence)
"""
import os
import sys
import uuid
import pytest
import requests
import asyncio
from datetime import datetime, timedelta, timezone

# Ensure we can import seed helpers
sys.path.insert(0, '/app/scripts')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    # fallback to frontend/.env
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
                break

API = f"{BASE_URL}/api"


def _seed_user_and_session():
    """Seed a user + session directly in Mongo (async motor). Returns (user_id, session_token, email)."""
    from dotenv import load_dotenv
    from motor.motor_asyncio import AsyncIOMotorClient
    load_dotenv('/app/backend/.env')
    mongo_url = os.environ['MONGO_URL'].strip('"')
    db_name = os.environ['DB_NAME'].strip('"')

    async def _do():
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        now = datetime.now(timezone.utc)
        uid = f"user_TEST_settings_{uuid.uuid4().hex[:8]}"
        tok = f"tok_TEST_settings_{uuid.uuid4().hex}"
        email = f"TEST_settings_{uuid.uuid4().hex[:6]}@cuminjar.test"
        await db.users.insert_one({
            'user_id': uid,
            'email': email,
            'name': 'Ananya Sharma',
            'picture': 'https://api.dicebear.com/7.x/avataaars/svg?seed=ananya',
            'created_at': now.isoformat(),
            'last_login_at': now.isoformat(),
        })
        await db.user_sessions.insert_one({
            'user_id': uid,
            'session_token': tok,
            'created_at': now.isoformat(),
            'expires_at': (now + timedelta(days=7)).isoformat(),
        })
        client.close()
        return uid, tok, email

    return asyncio.get_event_loop().run_until_complete(_do()) if not asyncio.get_event_loop().is_running() else asyncio.run(_do())


def _add_extra_session(user_id: str) -> str:
    """Insert an additional session row for the given user_id. Returns the new token."""
    from dotenv import load_dotenv
    from motor.motor_asyncio import AsyncIOMotorClient
    load_dotenv('/app/backend/.env')
    mongo_url = os.environ['MONGO_URL'].strip('"')
    db_name = os.environ['DB_NAME'].strip('"')

    async def _do():
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        now = datetime.now(timezone.utc)
        tok = f"tok_TEST_settings_extra_{uuid.uuid4().hex}"
        await db.user_sessions.insert_one({
            'user_id': user_id,
            'session_token': tok,
            'created_at': now.isoformat(),
            'expires_at': (now + timedelta(days=7)).isoformat(),
        })
        client.close()
        return tok

    return asyncio.run(_do())


def _count_sessions(user_id: str) -> int:
    from dotenv import load_dotenv
    from motor.motor_asyncio import AsyncIOMotorClient
    load_dotenv('/app/backend/.env')
    mongo_url = os.environ['MONGO_URL'].strip('"')
    db_name = os.environ['DB_NAME'].strip('"')

    async def _do():
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        n = await db.user_sessions.count_documents({'user_id': user_id})
        client.close()
        return n

    return asyncio.run(_do())


def _cleanup():
    from dotenv import load_dotenv
    from motor.motor_asyncio import AsyncIOMotorClient
    load_dotenv('/app/backend/.env')
    mongo_url = os.environ['MONGO_URL'].strip('"')
    db_name = os.environ['DB_NAME'].strip('"')

    async def _do():
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        await db.users.delete_many({'user_id': {'$regex': '^user_TEST_settings_'}})
        await db.user_sessions.delete_many({'user_id': {'$regex': '^user_TEST_settings_'}})
        await db.user_sessions.delete_many({'session_token': {'$regex': '^tok_TEST_settings_'}})
        client.close()

    asyncio.run(_do())


@pytest.fixture(scope='module')
def seeded():
    uid, tok, email = _seed_user_and_session()
    yield {'user_id': uid, 'session_token': tok, 'email': email}
    _cleanup()


@pytest.fixture()
def auth_session(seeded):
    s = requests.Session()
    s.cookies.set('session_token', seeded['session_token'])
    return s


# ---------- GET /auth/me baseline ----------
class TestAuthMe:
    def test_get_me_requires_session(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_get_me_returns_user(self, auth_session, seeded):
        r = auth_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert data['user_id'] == seeded['user_id']
        assert data['email'] == seeded['email']
        assert data['name'] == 'Ananya Sharma'
        assert '_id' not in data  # never leak mongo id


# ---------- PATCH /auth/me ----------
class TestPatchMe:
    def test_patch_requires_session(self):
        r = requests.patch(f"{API}/auth/me", json={'name': 'X'})
        assert r.status_code == 401

    def test_patch_empty_body_400(self, auth_session):
        r = auth_session.patch(f"{API}/auth/me", json={})
        assert r.status_code == 400
        assert 'No updatable' in (r.json().get('detail') or '')

    def test_patch_empty_name_400(self, auth_session):
        r = auth_session.patch(f"{API}/auth/me", json={'name': ''})
        assert r.status_code == 400
        assert 'empty' in (r.json().get('detail') or '').lower()

    def test_patch_whitespace_name_400(self, auth_session):
        r = auth_session.patch(f"{API}/auth/me", json={'name': '   '})
        assert r.status_code == 400

    def test_patch_name_success_and_persists(self, auth_session, seeded):
        r = auth_session.patch(f"{API}/auth/me", json={'name': 'Ananya S.'})
        assert r.status_code == 200
        assert r.json()['name'] == 'Ananya S.'
        # verify persistence
        r2 = auth_session.get(f"{API}/auth/me")
        assert r2.status_code == 200
        assert r2.json()['name'] == 'Ananya S.'

    def test_patch_language_success_and_persists(self, auth_session):
        r = auth_session.patch(f"{API}/auth/me", json={'language': 'hi-IN'})
        assert r.status_code == 200
        assert r.json()['language'] == 'hi-IN'
        r2 = auth_session.get(f"{API}/auth/me")
        assert r2.json()['language'] == 'hi-IN'

    def test_patch_notification_prefs(self, auth_session):
        prefs = {'email': False, 'inapp': True, 'weekly_digest': True}
        r = auth_session.patch(f"{API}/auth/me", json={'notification_prefs': prefs})
        assert r.status_code == 200
        got = r.json().get('notification_prefs')
        assert got == prefs
        # persist
        r2 = auth_session.get(f"{API}/auth/me")
        assert r2.json()['notification_prefs'] == prefs

    def test_patch_picture_success(self, auth_session):
        url = 'https://example.com/avatar.png'
        r = auth_session.patch(f"{API}/auth/me", json={'picture': url})
        assert r.status_code == 200
        assert r.json()['picture'] == url


# ---------- POST /auth/logout-all-devices ----------
class TestLogoutAll:
    def test_logout_all_requires_session(self):
        r = requests.post(f"{API}/auth/logout-all-devices")
        assert r.status_code == 401

    def test_logout_all_deletes_all_sessions(self):
        # Use an isolated seeded user (not `seeded` module fixture) so parallel
        # tests using the shared session cookie aren't invalidated by this test.
        uid, tok, _email = _seed_user_and_session()
        try:
            extra1 = _add_extra_session(uid)
            _add_extra_session(uid)
            pre_count = _count_sessions(uid)
            assert pre_count >= 3

            s = requests.Session()
            s.cookies.set('session_token', extra1)
            r = s.post(f"{API}/auth/logout-all-devices")
            assert r.status_code == 200
            assert r.json().get('ok') is True
            set_cookie = r.headers.get('set-cookie', '').lower()
            assert 'session_token=' in set_cookie
            assert _count_sessions(uid) == 0

            # subsequent request with the (now-invalidated) main token must be 401
            r2 = requests.get(f"{API}/auth/me", cookies={'session_token': tok})
            assert r2.status_code == 401
        finally:
            # local cleanup handled by module-scope _cleanup at end
            pass


# ---------- POST /auth/logout ----------
class TestLogout:
    def test_logout_ok_without_session(self):
        # logout endpoint should still return 200 (no-op)
        r = requests.post(f"{API}/auth/logout")
        assert r.status_code == 200
