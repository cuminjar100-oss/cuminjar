"""Tests for the invite email-delivery fix.

Verifies that /api/invites explicitly surfaces Resend errors on the created doc
(status='email_failed', email_sent=false, email_error) instead of silently leaving
the invite in a 'pending' state; and that the new POST /api/invites/{id}/resend
retry endpoint works.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"


def _unique_email(tag: str = 'invite') -> str:
    # example.com is intentional — Resend sandbox rejects it.
    return f"TEST_{tag}_{uuid.uuid4().hex[:8]}@example.com"


@pytest.fixture(scope='module')
def session():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    yield s
    # Cleanup: purge every TEST_ invite created during this run
    try:
        r = s.get(f"{API}/invites", timeout=15)
        if r.status_code == 200:
            for inv in r.json():
                if (inv.get('email') or '').startswith('test_') or 'TEST_' in (inv.get('email') or '').upper():
                    try:
                        s.delete(f"{API}/invites/{inv['id']}", timeout=15)
                    except Exception:
                        pass
    except Exception:
        pass


# ---------------- create_invite ----------------
class TestCreateInvite:
    def test_create_invite_returns_email_failed_when_resend_rejects(self, session):
        """Resend sandbox rejects @example.com; invite must be persisted with
        status=email_failed + email_sent=false + non-empty email_error."""
        email = _unique_email('failfast')
        payload = {'email': email, 'name': 'Debug Recipient', 'relation': 'Mother'}
        r = session.post(f"{API}/invites", json=payload, timeout=30)
        assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
        body = r.json()
        assert body['email'] == email.lower()
        # Persisted with explicit failure fields
        assert body.get('status') == 'email_failed', body
        assert body.get('email_sent') is False, body
        assert body.get('email_error'), 'email_error must be a non-empty string'
        assert isinstance(body['email_error'], str)
        assert body.get('id')

        # GET verification — invite exists in DB
        r2 = session.get(f"{API}/invites", timeout=15)
        assert r2.status_code == 200
        ids = [i['id'] for i in r2.json()]
        assert body['id'] in ids

    def test_no_402_on_second_invite(self, session):
        """Regression: dead free-plan 402 restriction must be gone. A second invite
        for the same user must not return 402."""
        e1 = _unique_email('quota1')
        e2 = _unique_email('quota2')
        r1 = session.post(f"{API}/invites", json={'email': e1}, timeout=30)
        r2 = session.post(f"{API}/invites", json={'email': e2}, timeout=30)
        assert r1.status_code != 402
        assert r2.status_code != 402
        assert r1.status_code == 200 and r2.status_code == 200

    def test_invalid_email_returns_400(self, session):
        r = session.post(f"{API}/invites", json={'email': 'not-an-email'}, timeout=15)
        assert r.status_code == 400

    def test_duplicate_email_returns_409(self, session):
        email = _unique_email('dup')
        r1 = session.post(f"{API}/invites", json={'email': email}, timeout=30)
        assert r1.status_code == 200
        r2 = session.post(f"{API}/invites", json={'email': email}, timeout=30)
        assert r2.status_code == 409


# ---------------- resend_invite ----------------
class TestResendInvite:
    def test_resend_endpoint_exists_and_updates_invite(self, session):
        email = _unique_email('resend')
        r = session.post(f"{API}/invites", json={'email': email}, timeout=30)
        assert r.status_code == 200
        original = r.json()
        assert original['status'] == 'email_failed'
        original_created_at = original.get('created_at')

        time.sleep(0.5)
        r2 = session.post(f"{API}/invites/{original['id']}/resend", timeout=30)
        assert r2.status_code == 200, f"expected 200, got {r2.status_code}: {r2.text}"
        updated = r2.json()
        # Fresh doc returned
        assert updated['id'] == original['id']
        assert updated['email'] == email.lower()
        assert updated.get('resent_at'), 'resent_at must be populated after resend'
        # Because recipient still @example.com, still failed
        assert updated.get('status') == 'email_failed'
        assert updated.get('email_sent') is False
        assert updated.get('email_error')
        # created_at unchanged
        assert updated.get('created_at') == original_created_at
        # Ensure the mongo _id was stripped
        assert '_id' not in updated

    def test_resend_nonexistent_invite_returns_404(self, session):
        fake_id = str(uuid.uuid4())
        r = session.post(f"{API}/invites/{fake_id}/resend", timeout=15)
        assert r.status_code == 404


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
