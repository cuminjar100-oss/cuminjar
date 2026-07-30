"""Tests for the 'Ask family via WhatsApp' recipe request flow."""
import os
import io
import struct
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ui-template-build.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


def _tiny_wav_bytes(seconds: float = 1.0, rate: int = 8000) -> bytes:
    """Return a minimal PCM WAV blob (silence)."""
    n_samples = int(seconds * rate)
    data = b'\x00\x00' * n_samples
    chunk_size = 36 + len(data)
    header = b'RIFF' + struct.pack('<I', chunk_size) + b'WAVE'
    fmt = b'fmt ' + struct.pack('<IHHIIHH', 16, 1, 1, rate, rate * 2, 2, 16)
    data_chunk = b'data' + struct.pack('<I', len(data)) + data
    return header + fmt + data_chunk


@pytest.fixture(scope='module')
def created_request():
    r = requests.post(f"{API}/recipe-requests", json={'dish_name': 'biriyani'}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


class TestCreateRecipeRequest:
    def test_dish_only_creates_request(self, created_request):
        data = created_request
        assert 'token' in data and len(data['token']) > 5
        assert 'wa_link' in data
        assert 'record_url' in data
        assert 'message_text' in data

    def test_wa_link_has_no_phone(self, created_request):
        # No phone => wa.me/?text=... (empty path segment)
        assert created_request['wa_link'].startswith('https://wa.me/?text=')

    def test_record_url_contains_token(self, created_request):
        assert f"/record/{created_request['token']}" in created_request['record_url']

    def test_message_contains_dish(self, created_request):
        assert 'biriyani' in created_request['message_text'].lower()


class TestPublicMetadata:
    def test_public_meta_no_auth(self, created_request):
        # Use a fresh session with no cookies to be sure
        s = requests.Session()
        r = s.get(f"{API}/public/recipe-request/{created_request['token']}", timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d['dish_name'].lower() == 'biriyani'
        assert d['status'] == 'pending'
        assert d.get('target_name') == ''  # empty since not provided
        assert d.get('requester_name')

    def test_public_meta_bad_token(self):
        r = requests.get(f"{API}/public/recipe-request/does-not-exist-xyz", timeout=10)
        assert r.status_code == 404


class TestSubmitRecording:
    def test_submit_audio_creates_recipe(self, created_request):
        wav = _tiny_wav_bytes(1.0)
        files = {'audio': ('note.wav', io.BytesIO(wav), 'audio/wav')}
        r = requests.post(
            f"{API}/public/recipe-request/{created_request['token']}/record",
            files=files,
            timeout=120,
        )
        # Silence may fail STT with 422 - that's acceptable behavior per system prompt.
        # But primary success path expected: 200.
        assert r.status_code in (200, 422), r.text
        if r.status_code == 422:
            pytest.skip(f"STT returned empty transcript for silence WAV: {r.text}")
        data = r.json()
        assert data.get('ok') is True
        assert data.get('recipe_id')
        # Save for downstream tests
        pytest.recipe_id = data['recipe_id']

    def test_status_now_completed(self, created_request):
        if not getattr(pytest, 'recipe_id', None):
            pytest.skip('Recipe was not created (STT skip)')
        r = requests.get(f"{API}/public/recipe-request/{created_request['token']}", timeout=10)
        assert r.status_code == 200
        assert r.json()['status'] == 'completed'

    def test_double_submit_returns_409(self, created_request):
        if not getattr(pytest, 'recipe_id', None):
            pytest.skip('Recipe was not created (STT skip)')
        wav = _tiny_wav_bytes(1.0)
        files = {'audio': ('note.wav', io.BytesIO(wav), 'audio/wav')}
        r = requests.post(
            f"{API}/public/recipe-request/{created_request['token']}/record",
            files=files,
            timeout=30,
        )
        assert r.status_code == 409, r.text
        assert 'already' in r.text.lower()
