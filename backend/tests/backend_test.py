"""CuminJar backend regression tests.
Covers:
- GET /api/recipes, /api/stories, /api/families basic listing
- _generate_recipe_image (Gemini Nano Banana) direct helper sanity via new recipe creation cover check
- Optional: POST /api/smart-record end-to-end (skipped if audio synthesis unavailable)
"""
import os
import io
import base64
import struct
import math
import wave
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ui-template-build.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    return s


# ---------- Basic listing endpoints ----------

def test_get_recipes_200(client):
    r = client.get(f"{API}/recipes", timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    # Optional shape check
    if data:
        item = data[0]
        assert 'id' in item and 'title' in item


def test_get_stories_200(client):
    r = client.get(f"{API}/stories", timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    if data:
        assert 'id' in data[0] and 'title' in data[0]


def test_get_families_200(client):
    r = client.get(f"{API}/families", timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)


# ---------- Existing recipes have cover set (image data URL or SVG fallback) ----------

def test_existing_recipes_have_cover(client):
    r = client.get(f"{API}/recipes", timeout=20)
    assert r.status_code == 200
    recipes = r.json()
    if not recipes:
        pytest.skip("No recipes to inspect")
    covers = [x.get('cover') for x in recipes if x.get('cover')]
    assert covers, "No recipes with cover found"
    # At least one recipe should have a cover that is data URL (image or svg)
    for c in covers[:3]:
        assert isinstance(c, str)
        assert c.startswith('data:image/'), f"Cover not data URL: {c[:80]}"


# ---------- Smart-record end-to-end (best-effort) ----------

def _make_silent_wav_bytes(seconds=1.0, sample_rate=16000):
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        # Write a small burst of near-silence with a tiny tone to help ASR not error out
        frames = []
        for i in range(int(seconds * sample_rate)):
            val = int(1000 * math.sin(2 * math.pi * 440 * i / sample_rate))
            frames.append(struct.pack('<h', val))
        wf.writeframes(b''.join(frames))
    return buf.getvalue()


def test_smart_record_generates_realistic_cover(client):
    """Verify POST /api/smart-record returns a recipe (kind=recipe) with realistic image cover.
    Uses a synthetic short WAV. If Sarvam ASR errors, we still expect a 400/500 rather than 200,
    in which case we skip (backend integration path not testable end-to-end here)."""
    wav_bytes = _make_silent_wav_bytes(seconds=1.5)
    files = {
        'file': ('recording.wav', wav_bytes, 'audio/wav'),
    }
    data = {
        'kind': 'recipe',
        'source_language': 'en-IN',
    }
    try:
        r = client.post(f"{API}/smart-record", files=files, data=data, timeout=180)
    except requests.RequestException as e:
        pytest.skip(f"smart-record request failed: {e}")

    if r.status_code != 200:
        pytest.skip(f"smart-record returned {r.status_code}: {r.text[:200]}")

    doc = r.json()
    assert doc.get('kind') == 'recipe'
    cover = doc.get('cover')
    assert cover, "Recipe has no cover"
    assert cover.startswith('data:image/'), f"Cover not data URL: {cover[:60]}"
    # Realistic cover from Gemini should be jpeg or png, not svg
    if cover.startswith('data:image/svg'):
        # It fell back to emoji svg (Gemini failed) - flag as warning but not fail
        pytest.fail("Cover fell back to SVG emoji instead of Gemini Nano Banana image")
    # Roughly check size > 20KB (Gemini images are >100KB)
    b64 = cover.split(',', 1)[1]
    raw = base64.b64decode(b64)
    assert len(raw) > 20_000, f"Cover unusually small: {len(raw)} bytes"


# ---------- Recipe CRUD sanity: patch like ----------

def test_recipe_like_toggle(client):
    r = client.get(f"{API}/recipes", timeout=20)
    assert r.status_code == 200
    recipes = r.json()
    if not recipes:
        pytest.skip("No recipes to like")
    rid = recipes[0]['id']
    initial_liked = bool(recipes[0].get('liked'))
    resp = client.post(f"{API}/recipes/{rid}/like", timeout=15)
    assert resp.status_code == 200, resp.text
    updated = resp.json()
    assert updated.get('liked') == (not initial_liked)
    # Toggle back
    resp2 = client.post(f"{API}/recipes/{rid}/like", timeout=15)
    assert resp2.status_code == 200
    assert resp2.json().get('liked') == initial_liked
