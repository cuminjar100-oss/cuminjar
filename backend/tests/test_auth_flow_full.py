"""Iteration 11 — Comprehensive auth flow tests (OTP + session + logout + PATCH me + cookie flags).
Complements test_email_password_auth.py which already covers register/login/forgot/reset.
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
load_dotenv('/app/frontend/.env')

BASE_URL = (os.environ.get('REACT_APP_BACKEND_URL') or 'https://ui-template-build.preview.emergentagent.com').rstrip('/')
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

SEED_EMAIL = 'testuser2@example.com'
SEED_PASSWORD = 'TestPass123'


@pytest.fixture(scope='module')
def db():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture()
def new_email(db):
    email = f"test_flow_{secrets.token_hex(6)}@cuminjar.test"
    try:
        yield email
    finally:
        # cleanup
        u = db.users.find_one({'email': email})
        if u:
            db.user_sessions.delete_many({'user_id': u['user_id']})
        db.users.delete_many({'email': email})
        db.email_otps.delete_many({'email': email})
        db.password_reset_otps.delete_many({'email': email})
        db.login_attempts.delete_many({'email': email})


def _seed_verified_otp(db, email, code='123456'):
    now = datetime.now(timezone.utc)
    db.email_otps.insert_one({
        'id': secrets.token_hex(8),
        'email': email,
        'code_hash': hashlib.sha256(code.encode()).hexdigest(),
        'attempts': 0,
        'verified': True,
        'verified_at': now.isoformat(),
        'created_at': now.isoformat(),
        'expires_at': (now + timedelta(minutes=10)).isoformat(),
    })


def _register(db, email, password='Passw0rd!', name='Flow Tester'):
    _seed_verified_otp(db, email)
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        'email': email, 'password': password, 'name': name
    })
    assert r.status_code == 200, r.text
    return r


# ---------------- OTP request / verify ----------------
class TestOtpFlow:
    def test_request_otp_invalid_email(self):
        r = requests.post(f"{BASE_URL}/api/auth/request-otp", json={'email': 'not-an-email'})
        assert r.status_code == 400

    def test_verify_otp_wrong_code_increments_attempts(self, db, new_email):
        # Seed an unverified OTP with known code
        now = datetime.now(timezone.utc)
        db.email_otps.insert_one({
            'id': secrets.token_hex(8),
            'email': new_email,
            'code_hash': hashlib.sha256('123456'.encode()).hexdigest(),
            'attempts': 0,
            'verified': False,
            'created_at': now.isoformat(),
            'expires_at': (now + timedelta(minutes=10)).isoformat(),
        })
        r = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={'email': new_email, 'code': '000000'})
        assert r.status_code == 400
        doc = db.email_otps.find_one({'email': new_email, 'verified': False})
        assert doc['attempts'] == 1

    def test_verify_otp_after_5_wrong_attempts_locks_429(self, db, new_email):
        now = datetime.now(timezone.utc)
        db.email_otps.insert_one({
            'id': secrets.token_hex(8),
            'email': new_email,
            'code_hash': hashlib.sha256('123456'.encode()).hexdigest(),
            'attempts': 5,
            'verified': False,
            'created_at': now.isoformat(),
            'expires_at': (now + timedelta(minutes=10)).isoformat(),
        })
        r = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={'email': new_email, 'code': '111111'})
        assert r.status_code == 429

    def test_verify_otp_expired_returns_400(self, db, new_email):
        now = datetime.now(timezone.utc)
        db.email_otps.insert_one({
            'id': secrets.token_hex(8),
            'email': new_email,
            'code_hash': hashlib.sha256('123456'.encode()).hexdigest(),
            'attempts': 0,
            'verified': False,
            'created_at': (now - timedelta(minutes=20)).isoformat(),
            'expires_at': (now - timedelta(minutes=10)).isoformat(),
        })
        r = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={'email': new_email, 'code': '123456'})
        assert r.status_code == 400

    def test_verify_otp_correct_marks_verified(self, db, new_email):
        now = datetime.now(timezone.utc)
        db.email_otps.insert_one({
            'id': secrets.token_hex(8),
            'email': new_email,
            'code_hash': hashlib.sha256('987654'.encode()).hexdigest(),
            'attempts': 0,
            'verified': False,
            'created_at': now.isoformat(),
            'expires_at': (now + timedelta(minutes=10)).isoformat(),
        })
        r = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={'email': new_email, 'code': '987654'})
        assert r.status_code == 200, r.text
        doc = db.email_otps.find_one({'email': new_email})
        assert doc['verified'] is True


# ---------------- Seeded user login (preferred credentials) ----------------
class TestSeedUserLogin:
    def test_login_seed_user_success(self, db):
        # Ensure clean brute-force state so this deterministic test can pass
        db.login_attempts.delete_many({'email': SEED_EMAIL})
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            'email': SEED_EMAIL, 'password': SEED_PASSWORD
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data['user']['email'] == SEED_EMAIL
        assert 'password_hash' not in data['user']
        assert '_id' not in data['user']
        assert 'session_token' in r.cookies

        cookie = r.cookies.get('session_token')
        # Cookie header checks: HttpOnly, Secure, SameSite=None, Path=/
        set_cookie = r.headers.get('set-cookie', '').lower()
        assert 'httponly' in set_cookie
        assert 'secure' in set_cookie
        assert 'samesite=none' in set_cookie
        assert 'path=/' in set_cookie
        assert 'max-age=604800' in set_cookie  # 7 days

        # Cleanup
        db.user_sessions.delete_one({'session_token': cookie})

    def test_login_wrong_password_seed_user(self, db):
        db.login_attempts.delete_many({'email': SEED_EMAIL})
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            'email': SEED_EMAIL, 'password': 'WrongPass!'
        })
        assert r.status_code == 401
        db.login_attempts.delete_many({'email': SEED_EMAIL})

    def test_login_nonexistent_user_same_401(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            'email': f'ghost_{secrets.token_hex(4)}@cuminjar.test', 'password': 'whatever'
        })
        assert r.status_code == 401
        assert 'invalid' in r.text.lower()


# ---------------- /auth/me GET + PATCH ----------------
class TestAuthMe:
    def test_get_me_without_cookie_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_get_me_with_fake_cookie_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", cookies={'session_token': 'fake-not-a-real-token'})
        assert r.status_code == 401

    def test_get_me_returns_user_and_no_password_hash(self, db, new_email):
        r = _register(db, new_email)
        sess = requests.Session()
        sess.cookies.update(r.cookies)
        me = sess.get(f"{BASE_URL}/api/auth/me")
        assert me.status_code == 200
        data = me.json()
        assert data['email'] == new_email
        assert 'password_hash' not in data
        assert '_id' not in data

    def test_patch_me_updates_name_and_language(self, db, new_email):
        r = _register(db, new_email)
        sess = requests.Session()
        sess.cookies.update(r.cookies)
        upd = sess.patch(f"{BASE_URL}/api/auth/me", json={
            'name': 'Updated Name',
            'language': 'hi',
            'not_whitelisted_field': 'should_be_ignored',
        })
        assert upd.status_code == 200, upd.text
        d = upd.json()
        assert d['name'] == 'Updated Name'
        assert d.get('language') == 'hi'
        assert 'not_whitelisted_field' not in d
        # Verify persistence via GET
        me = sess.get(f"{BASE_URL}/api/auth/me").json()
        assert me['name'] == 'Updated Name'
        assert me.get('language') == 'hi'

    def test_patch_me_without_cookie_401(self):
        r = requests.patch(f"{BASE_URL}/api/auth/me", json={'name': 'Hacker'})
        assert r.status_code == 401


# ---------------- Logout ----------------
class TestLogout:
    def test_logout_deletes_session_and_subsequent_me_returns_401(self, db, new_email):
        r = _register(db, new_email)
        sess = requests.Session()
        sess.cookies.update(r.cookies)
        # verify pre-logout /auth/me works
        assert sess.get(f"{BASE_URL}/api/auth/me").status_code == 200
        token = r.cookies.get('session_token')
        assert db.user_sessions.find_one({'session_token': token}) is not None

        out = sess.post(f"{BASE_URL}/api/auth/logout")
        assert out.status_code == 200
        assert out.json() == {'ok': True}
        # DB session removed
        assert db.user_sessions.find_one({'session_token': token}) is None
        # Explicitly use the old token to hit /auth/me — should be 401
        r_me = requests.get(f"{BASE_URL}/api/auth/me", cookies={'session_token': token})
        assert r_me.status_code == 401

    def test_logout_all_devices_deletes_all_sessions(self, db, new_email):
        r = _register(db, new_email)
        user_id = r.json()['user']['user_id']
        first_cookie = r.cookies.get('session_token')

        # Log the same user in a second time to produce a 2nd session
        r2 = requests.post(f"{BASE_URL}/api/auth/login", json={
            'email': new_email, 'password': 'Passw0rd!'
        })
        assert r2.status_code == 200
        second_cookie = r2.cookies.get('session_token')
        assert first_cookie != second_cookie
        assert db.user_sessions.count_documents({'user_id': user_id}) >= 2

        # Logout all devices using first cookie
        out = requests.post(f"{BASE_URL}/api/auth/logout-all-devices",
                            cookies={'session_token': first_cookie})
        assert out.status_code == 200
        assert db.user_sessions.count_documents({'user_id': user_id}) == 0
        # Both cookies should now be invalid
        assert requests.get(f"{BASE_URL}/api/auth/me",
                            cookies={'session_token': second_cookie}).status_code == 401


# ---------------- Forgot password ----------------
class TestForgotPasswordUserEnum:
    def test_forgot_password_existing_returns_ok(self, db):
        # Use seed user — must not error even if resend is stubbed
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={'email': SEED_EMAIL})
        assert r.status_code == 200
        assert r.json() == {'ok': True}
        # DB should have a fresh reset-otp doc
        latest = db.password_reset_otps.find_one({'email': SEED_EMAIL}, sort=[('created_at', -1)])
        assert latest is not None
        # cleanup
        db.password_reset_otps.delete_many({'email': SEED_EMAIL})

    def test_forgot_password_nonexistent_returns_ok(self):
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            'email': f'noone_{secrets.token_hex(4)}@cuminjar.test'
        })
        assert r.status_code == 200
        assert r.json() == {'ok': True}


# ---------------- Reset password extras ----------------
class TestResetPasswordExtras:
    def test_reset_password_short_password_400(self, db, new_email):
        _register(db, new_email)
        # Seed a reset otp
        now = datetime.now(timezone.utc)
        db.password_reset_otps.insert_one({
            'id': secrets.token_hex(8),
            'email': new_email,
            'code_hash': hashlib.sha256('654321'.encode()).hexdigest(),
            'attempts': 0,
            'used': False,
            'created_at': now.isoformat(),
            'expires_at': (now + timedelta(minutes=15)).isoformat(),
        })
        r = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            'email': new_email, 'code': '654321', 'password': '123'
        })
        assert r.status_code == 400

    def test_reset_password_after_5_wrong_attempts_locks_429(self, db, new_email):
        _register(db, new_email)
        now = datetime.now(timezone.utc)
        db.password_reset_otps.insert_one({
            'id': secrets.token_hex(8),
            'email': new_email,
            'code_hash': hashlib.sha256('654321'.encode()).hexdigest(),
            'attempts': 5,
            'used': False,
            'created_at': now.isoformat(),
            'expires_at': (now + timedelta(minutes=15)).isoformat(),
        })
        r = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            'email': new_email, 'code': '000000', 'password': 'GoodPass9!'
        })
        assert r.status_code == 429
