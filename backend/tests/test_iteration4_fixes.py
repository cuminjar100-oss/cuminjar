"""Regression tests for the four bug fixes in iteration_4:

FIX #1 (CRITICAL): GET /api/auth/me must NOT include password_hash
FIX #2 (HIGH):    Brute-force lockout must return 429 on the 6th attempt even when
                  X-Forwarded-For rotates (email-only counter enforced too)
FIX #3 (MEDIUM):  POST /api/auth/forgot-password must return 200 {ok:true} for
                  real, non-existent, and delivery-failing addresses (no 5xx, no
                  response-body variance)
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

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']


@pytest.fixture(scope='module')
def db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture()
def fresh_email(db):
    email = f"test_it4_{secrets.token_hex(6)}@cuminjar.test"
    try:
        yield email
    finally:
        user = db.users.find_one({'email': email})
        if user and 'user_id' in user:
            db.user_sessions.delete_many({'user_id': user['user_id']})
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
        'used': False,
        'created_at': now.isoformat(),
        'expires_at': (now + timedelta(minutes=10)).isoformat(),
    })


def _register(db, email, password='Passw0rd!'):
    _seed_verified_otp(db, email)
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        'email': email, 'password': password, 'name': 'IT4 Tester'
    })
    assert r.status_code == 200, r.text
    return r


# ---------- FIX #1 -----------------------------------------------------------
class TestFix1AuthMeNoPasswordHash:
    def test_auth_me_via_cookie_has_no_password_hash(self, db, fresh_email):
        r = _register(db, fresh_email)
        s = requests.Session()
        s.cookies.update(r.cookies)
        me = s.get(f"{BASE_URL}/api/auth/me")
        assert me.status_code == 200, me.text
        data = me.json()
        assert 'password_hash' not in data, f"password_hash LEAKED: {list(data.keys())}"
        assert '_id' not in data
        assert data['email'] == fresh_email

    def test_auth_me_via_bearer_has_no_password_hash(self, db, fresh_email):
        r = _register(db, fresh_email)
        token = r.cookies.get('session_token')
        assert token
        me = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={'Authorization': f'Bearer {token}'},
        )
        assert me.status_code == 200, me.text
        data = me.json()
        assert 'password_hash' not in data, f"password_hash LEAKED via Bearer: {list(data.keys())}"

    def test_register_response_has_no_password_hash(self, db, fresh_email):
        r = _register(db, fresh_email)
        assert 'password_hash' not in r.json().get('user', {})

    def test_login_response_has_no_password_hash(self, db, fresh_email):
        _register(db, fresh_email)
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            'email': fresh_email, 'password': 'Passw0rd!'
        })
        assert r.status_code == 200
        assert 'password_hash' not in r.json().get('user', {})


# ---------- FIX #2 -----------------------------------------------------------
class TestFix2BruteForceLockoutAcrossIPs:
    def test_lockout_with_rotating_x_forwarded_for(self, db, fresh_email):
        """Simulate 5 wrong logins each from a DIFFERENT X-Forwarded-For IP.
        Sixth attempt (from yet another IP) must return 429 because the
        email-only counter enforces the lockout regardless of source IP.
        """
        _register(db, fresh_email)
        db.login_attempts.delete_many({'email': fresh_email})

        codes = []
        for i in range(6):
            fake_ip = f"203.0.113.{i + 10}"
            r = requests.post(
                f"{BASE_URL}/api/auth/login",
                headers={'X-Forwarded-For': fake_ip},
                json={'email': fresh_email, 'password': f'WrongPwd{i}!!'},
            )
            codes.append(r.status_code)

        assert codes[:5] == [401, 401, 401, 401, 401], f"expected 5x401, got {codes}"
        assert codes[5] == 429, f"6th attempt should be 429 (locked out), got {codes}"

    def test_client_ip_reads_x_forwarded_for(self, db, fresh_email):
        """Wrong login carrying a specific X-Forwarded-For must be recorded
        against that IP (not the pod IP) in login_attempts."""
        _register(db, fresh_email)
        db.login_attempts.delete_many({'email': fresh_email})
        fake_ip = '198.51.100.42'
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            headers={'X-Forwarded-For': fake_ip},
            json={'email': fresh_email, 'password': 'WrongOne!!'},
        )
        assert r.status_code == 401
        # find recorded attempt
        rec = db.login_attempts.find_one({'email': fresh_email, 'success': False})
        assert rec is not None
        assert rec.get('ip') == fake_ip, f"expected ip={fake_ip} but got {rec.get('ip')}"


# ---------- FIX #3 -----------------------------------------------------------
class TestFix3ForgotPasswordUniformResponses:
    def test_nonexistent_email_returns_ok(self):
        fake = f"never_{secrets.token_hex(4)}@cuminjar.test"
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={'email': fake})
        assert r.status_code == 200, r.text
        assert r.json() == {'ok': True}

    def test_real_email_returns_ok(self, db, fresh_email):
        _register(db, fresh_email)
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={'email': fresh_email})
        assert r.status_code == 200, r.text
        assert r.json() == {'ok': True}

    def test_resend_delivery_failure_returns_ok(self, db):
        """Send forgot-password to an address Resend's sandbox rejects
        (e.g. arbitrary third-party address). The endpoint MUST still return
        200 {ok:true} — never a 5xx that would leak account existence."""
        # Directly seed a real user (bypass OTP) so a Resend send will be attempted
        user_email = f"test_it4_send_{secrets.token_hex(4)}@example.org"
        db.users.insert_one({
            'user_id': f"user_{secrets.token_hex(6)}",
            'email': user_email,
            'name': 'Send Failer',
            'password_hash': '$2b$12$abcdefghijklmnopqrstuv',
            'email_verified': True,
            'created_at': datetime.now(timezone.utc).isoformat(),
        })
        try:
            r = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={'email': user_email})
            assert r.status_code == 200, f"Should NEVER 5xx even on Resend failure. Got {r.status_code}: {r.text}"
            assert r.json() == {'ok': True}
        finally:
            db.users.delete_many({'email': user_email})
            db.password_reset_otps.delete_many({'email': user_email})

    def test_response_bodies_are_identical(self, db, fresh_email):
        """The three scenarios must return byte-identical JSON to prevent
        account enumeration via response-diffing."""
        # Scenario A: non-existent
        fake = f"never_{secrets.token_hex(4)}@cuminjar.test"
        a = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={'email': fake})
        # Scenario B: existing user
        _register(db, fresh_email)
        b = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={'email': fresh_email})
        assert a.status_code == b.status_code == 200
        assert a.json() == b.json() == {'ok': True}
