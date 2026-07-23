"""Tests for email+password auth endpoints (register/login/forgot/reset) and first-run
onboarding data scoping. Directly seeds Mongo (email_otps, password_reset_otps, users)
using MONGO_URL/DB_NAME to bypass Resend inbox delivery.
"""
import os
import secrets
import hashlib
from datetime import datetime, timezone, timedelta

import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get(
    'REACT_APP_BACKEND_URL') else 'https://ui-template-build.preview.emergentagent.com'
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']


# ---- Fixtures ----
@pytest.fixture(scope='module')
def db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture()
def new_email(db):
    """Yield a fresh test email; ensure it's cleaned up from users/otps."""
    email = f"test_epw_{secrets.token_hex(6)}@cuminjar.test"
    try:
        yield email
    finally:
        db.users.delete_many({'email': email})
        db.email_otps.delete_many({'email': email})
        db.password_reset_otps.delete_many({'email': email})
        db.login_attempts.delete_many({'email': email})
        # also clean up any sessions we created — session_token is not indexed by email
        # so we rely on user_id lookup via the email we've just deleted; do a best-effort
        # by tracking a separate cleanup in per-test helpers where needed.


def _seed_verified_otp(db, email: str, code: str = '123456'):
    now = datetime.now(timezone.utc)
    db.email_otps.insert_one({
        'id': str(secrets.token_hex(8)),
        'email': email,
        'code_hash': hashlib.sha256(code.encode()).hexdigest(),
        'attempts': 0,
        'verified': True,
        'verified_at': now.isoformat(),
        'used': False,
        'created_at': now.isoformat(),
        'expires_at': (now + timedelta(minutes=10)).isoformat(),
    })


def _seed_verified_reset_otp(db, email: str, code: str = '654321'):
    now = datetime.now(timezone.utc)
    db.password_reset_otps.insert_one({
        'id': str(secrets.token_hex(8)),
        'email': email,
        'code_hash': hashlib.sha256(code.encode()).hexdigest(),
        'attempts': 0,
        'used': False,
        'created_at': now.isoformat(),
        'expires_at': (now + timedelta(minutes=15)).isoformat(),
    })


# ---- Register ----
class TestRegister:
    def test_register_without_verified_otp_returns_400(self, new_email):
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            'email': new_email, 'password': 'Passw0rd!', 'name': 'Test User'
        })
        assert r.status_code == 400, r.text
        assert 'verify' in r.text.lower()

    def test_register_with_verified_otp_returns_200_and_cookie(self, db, new_email):
        _seed_verified_otp(db, new_email)
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            'email': new_email, 'password': 'Passw0rd!', 'name': 'Test User'
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert 'user' in data
        assert data['user']['email'] == new_email
        assert data['user']['name'] == 'Test User'
        assert '_id' not in data['user']
        assert 'password_hash' not in data['user']
        # Cookie: session_token set httpOnly
        assert 'session_token' in r.cookies
        # verify the session persists — the follow-up GET uses cookie jar
        session = requests.Session()
        session.cookies.update(r.cookies)
        me = session.get(f"{BASE_URL}/api/auth/me")
        assert me.status_code == 200
        assert me.json()['email'] == new_email
        # cleanup session
        uid = me.json().get('user_id')
        if uid:
            db.user_sessions.delete_many({'user_id': uid})

    def test_register_duplicate_returns_409(self, db, new_email):
        _seed_verified_otp(db, new_email)
        r1 = requests.post(f"{BASE_URL}/api/auth/register", json={
            'email': new_email, 'password': 'Passw0rd!', 'name': 'Test User'
        })
        assert r1.status_code == 200
        # Register again with a different verified OTP → should 409
        _seed_verified_otp(db, new_email, code='222222')
        r2 = requests.post(f"{BASE_URL}/api/auth/register", json={
            'email': new_email, 'password': 'Passw0rd!', 'name': 'Test User'
        })
        assert r2.status_code == 409
        # cleanup
        user = db.users.find_one({'email': new_email})
        if user:
            db.user_sessions.delete_many({'user_id': user['user_id']})


# ---- Login ----
class TestLogin:
    def _register(self, db, email, password='Passw0rd!', name='Test User'):
        _seed_verified_otp(db, email)
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            'email': email, 'password': password, 'name': name
        })
        assert r.status_code == 200, r.text
        return r.json()['user']

    def test_login_success(self, db, new_email):
        self._register(db, new_email)
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            'email': new_email, 'password': 'Passw0rd!'
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data['user']['email'] == new_email
        assert '_id' not in data['user']
        assert 'password_hash' not in data['user']
        assert 'session_token' in r.cookies
        # Cleanup sessions
        db.user_sessions.delete_many({'user_id': data['user']['user_id']})

    def test_login_wrong_password_returns_401(self, db, new_email):
        self._register(db, new_email)
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            'email': new_email, 'password': 'WrongPass1'
        })
        assert r.status_code == 401
        user = db.users.find_one({'email': new_email})
        if user:
            db.user_sessions.delete_many({'user_id': user['user_id']})

    def test_login_brute_force_lockout_returns_429(self, db, new_email):
        self._register(db, new_email)
        # Clear any prior attempts for this email to ensure a deterministic start
        db.login_attempts.delete_many({'email': new_email})
        codes = []
        for i in range(6):
            r = requests.post(f"{BASE_URL}/api/auth/login", json={
                'email': new_email, 'password': f'Wrong{i}!!'
            })
            codes.append(r.status_code)
        # First 5 must be 401; the 6th must be 429
        assert codes[:5] == [401, 401, 401, 401, 401], codes
        assert codes[5] == 429, codes
        # Cleanup
        db.login_attempts.delete_many({'email': new_email})
        user = db.users.find_one({'email': new_email})
        if user:
            db.user_sessions.delete_many({'user_id': user['user_id']})


# ---- Forgot / Reset password ----
class TestForgotReset:
    def _register(self, db, email, password='Passw0rd!'):
        _seed_verified_otp(db, email)
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            'email': email, 'password': password, 'name': 'Reset Tester'
        })
        assert r.status_code == 200, r.text
        return r.json()['user']

    def test_forgot_password_nonexistent_email_returns_ok(self):
        fake = f"nonexistent_{secrets.token_hex(4)}@cuminjar.test"
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={'email': fake})
        assert r.status_code == 200
        assert r.json() == {'ok': True}

    def test_reset_password_flow(self, db, new_email):
        user = self._register(db, new_email)
        # Directly seed a verified reset OTP (we already know sending would call Resend)
        _seed_verified_reset_otp(db, new_email, code='654321')

        r = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            'email': new_email, 'code': '654321', 'password': 'NewPass9!'
        })
        assert r.status_code == 200, r.text
        assert 'session_token' in r.cookies
        data = r.json()
        assert data['user']['email'] == new_email

        # Old password should now fail
        r_old = requests.post(f"{BASE_URL}/api/auth/login", json={
            'email': new_email, 'password': 'Passw0rd!'
        })
        assert r_old.status_code == 401

        # New password must succeed
        r_new = requests.post(f"{BASE_URL}/api/auth/login", json={
            'email': new_email, 'password': 'NewPass9!'
        })
        assert r_new.status_code == 200

        db.user_sessions.delete_many({'user_id': user['user_id']})
        db.login_attempts.delete_many({'email': new_email})

    def test_reset_password_wrong_code_returns_400(self, db, new_email):
        user = self._register(db, new_email)
        _seed_verified_reset_otp(db, new_email, code='777777')
        r = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            'email': new_email, 'code': '000000', 'password': 'AnotherPw9!'
        })
        assert r.status_code == 400
        db.user_sessions.delete_many({'user_id': user['user_id']})


# ---- First-Run scoping (backend prep for frontend test) ----
class TestFirstRunEmptyScoping:
    """A newly-registered user must have empty families/recipes/stories,
    which is what triggers the FirstRunEmptyState UI on /app."""

    def test_new_user_has_empty_collections(self, db, new_email):
        _seed_verified_otp(db, new_email)
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            'email': new_email, 'password': 'Passw0rd!', 'name': 'Brand New'
        })
        assert r.status_code == 200
        token = r.cookies.get('session_token')
        assert token
        h = {'Authorization': f'Bearer {token}'}
        assert requests.get(f"{BASE_URL}/api/families", headers=h).json() == []
        assert requests.get(f"{BASE_URL}/api/recipes", headers=h).json() == []
        assert requests.get(f"{BASE_URL}/api/stories", headers=h).json() == []
        # cleanup
        db.user_sessions.delete_many({'user_id': r.json()['user']['user_id']})
