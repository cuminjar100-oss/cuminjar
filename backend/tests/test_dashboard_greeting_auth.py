"""Tests for the Dashboard greeting bug fix:
1. /api/auth/me returns 401 without cookie/bearer
2. Anonymous /api/recipes and /api/families continue to return demo user's data (Morkuzhambu + Rao Family)
3. When a seeded user's session_token is passed as Bearer, /api/auth/me returns that user's name
4. Seeded user gets empty recipes/families (no data owned by that user_id)

Seeds directly into MongoDB `users` + `user_sessions` collections using pymongo
against the same MONGO_URL / DB_NAME that the backend uses. Cleans up after.
"""
import os
import secrets
from datetime import datetime, timezone, timedelta

import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

# Load backend env so we get MONGO_URL / DB_NAME identical to the API server
load_dotenv('/app/backend/.env')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ui-template-build.preview.emergentagent.com').rstrip('/')
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

TEST_EMAIL = 'test_priya_sharma@cuminjar.test'
TEST_EMAIL_SINGLE = 'test_karthik@cuminjar.test'


# ---- fixtures ---------------------------------------------------------------
@pytest.fixture(scope='module')
def mongo_db():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    yield db
    client.close()


@pytest.fixture()
def seeded_user(mongo_db):
    """Seed a fake authenticated user + valid session. Yields (user_id, session_token, name).
    Cleans up both docs after the test."""
    user_id = f"test_user_{secrets.token_hex(6)}"
    session_token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=7)
    mongo_db.users.insert_one({
        'user_id': user_id,
        'email': TEST_EMAIL,
        'name': 'Priya Sharma',
        'picture': '',
        'created_at': now.isoformat(),
        'last_login_at': now.isoformat(),
    })
    mongo_db.user_sessions.insert_one({
        'user_id': user_id,
        'session_token': session_token,
        'created_at': now.isoformat(),
        'expires_at': expires.isoformat(),
    })
    try:
        yield user_id, session_token, 'Priya Sharma'
    finally:
        mongo_db.user_sessions.delete_many({'user_id': user_id})
        mongo_db.users.delete_many({'user_id': user_id})


@pytest.fixture()
def seeded_user_single(mongo_db):
    """Seed a user with a single-word name."""
    user_id = f"test_user_{secrets.token_hex(6)}"
    session_token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=7)
    mongo_db.users.insert_one({
        'user_id': user_id,
        'email': TEST_EMAIL_SINGLE,
        'name': 'Karthik',
        'picture': '',
        'created_at': now.isoformat(),
        'last_login_at': now.isoformat(),
    })
    mongo_db.user_sessions.insert_one({
        'user_id': user_id,
        'session_token': session_token,
        'created_at': now.isoformat(),
        'expires_at': expires.isoformat(),
    })
    try:
        yield user_id, session_token, 'Karthik'
    finally:
        mongo_db.user_sessions.delete_many({'user_id': user_id})
        mongo_db.users.delete_many({'user_id': user_id})


# ---- Auth /me ---------------------------------------------------------------
class TestAuthMe:
    def test_auth_me_401_without_cookie(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_auth_me_returns_seeded_user_with_bearer(self, seeded_user):
        user_id, token, name = seeded_user
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={'Authorization': f'Bearer {token}'},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get('user_id') == user_id
        assert data.get('name') == name
        assert data.get('email') == TEST_EMAIL
        # Must NOT expose Mongo _id
        assert '_id' not in data

    def test_auth_me_single_name(self, seeded_user_single):
        user_id, token, name = seeded_user_single
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={'Authorization': f'Bearer {token}'},
        )
        assert r.status_code == 200
        assert r.json()['name'] == name


# ---- Regression: anonymous vs authed data scoping ---------------------------
class TestDataScoping:
    def test_anonymous_recipes_include_morkuzhambu(self):
        r = requests.get(f"{BASE_URL}/api/recipes")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) > 0
        titles = [i.get('title') for i in items]
        assert 'Morkuzhambu' in titles, f"Expected demo Morkuzhambu in anonymous recipes; got {titles}"
        # Should be scoped to demo-user
        assert all(i.get('user_id') == 'demo-user' for i in items)

    def test_anonymous_families_include_rao_family(self):
        r = requests.get(f"{BASE_URL}/api/families")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) > 0
        names = [i.get('name') for i in items]
        assert 'Rao Family' in names, f"Expected Rao Family in anonymous families; got {names}"
        assert all(i.get('user_id') == 'demo-user' for i in items)

    def test_seeded_user_sees_empty_recipes(self, seeded_user):
        _, token, _ = seeded_user
        r = requests.get(
            f"{BASE_URL}/api/recipes",
            headers={'Authorization': f'Bearer {token}'},
        )
        assert r.status_code == 200
        items = r.json()
        assert items == [], f"Expected empty list for seeded user; got {len(items)} items"

    def test_seeded_user_sees_empty_families(self, seeded_user):
        _, token, _ = seeded_user
        r = requests.get(
            f"{BASE_URL}/api/families",
            headers={'Authorization': f'Bearer {token}'},
        )
        assert r.status_code == 200
        items = r.json()
        assert items == [], f"Expected empty list for seeded user; got {len(items)} items"
