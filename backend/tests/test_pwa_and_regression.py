"""PWA static-asset checks + Sarvam dual-transcribe code-path verification + auth/vault regression.

Scope:
  - Verifies all PWA static assets (manifest, sw, icons) are reachable with correct content-types.
  - Validates manifest.json fields (name, display, theme_color, start_url, icons incl. maskable).
  - Validates service worker contains install/activate/fetch event handlers.
  - Verifies index.html <head> ships the required PWA <meta> + <link> tags.
  - Static code check: backend/server.py _sarvam_transcribe returns segments_en; _structure_recipe_with_llm accepts segments_en kwarg.
  - Smoke regression: /auth/me and vault PDF require Bearer token.

No Sarvam / LLM API is called here.
"""
import os
import re

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
REPO_ROOT = "/app"


# ---------- PWA static assets ----------
class TestPwaAssets:
    def test_manifest_json_served(self):
        r = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        assert r.status_code == 200
        assert "application/json" in (r.headers.get("content-type") or "").lower()
        m = r.json()
        assert m["name"] == "Mamascript"
        assert m["display"] == "standalone"
        assert m["theme_color"] == "#D8744C"
        assert m["start_url"] == "/"
        sizes = {(i["sizes"], i.get("purpose", "any")) for i in m["icons"]}
        # At least 192x192 + 512x512 + a maskable 512
        assert ("192x192", "any") in sizes
        assert ("512x512", "any") in sizes
        assert any(s == "512x512" and "maskable" in p for s, p in sizes), f"missing maskable 512: {sizes}"

    def test_service_worker_served(self):
        r = requests.get(f"{BASE_URL}/sw.js", timeout=10)
        assert r.status_code == 200
        ct = (r.headers.get("content-type") or "").lower()
        assert "javascript" in ct
        body = r.text
        # Must register the three core lifecycle/event listeners
        for evt in ("install", "activate", "fetch"):
            assert f'addEventListener("{evt}"' in body or f"addEventListener('{evt}'" in body, (
                f"sw.js missing {evt} listener"
            )

    @pytest.mark.parametrize("path,ct", [
        ("/icon-192.png", "image/png"),
        ("/icon-512.png", "image/png"),
        ("/icon-maskable-512.png", "image/png"),
        ("/apple-touch-icon.png", "image/png"),
    ])
    def test_icon_served(self, path, ct):
        r = requests.get(f"{BASE_URL}{path}", timeout=10)
        assert r.status_code == 200, f"{path} -> {r.status_code}"
        assert ct in (r.headers.get("content-type") or "").lower()
        # PNG magic header
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n", f"{path} content is not a PNG"

    def test_index_html_pwa_meta(self):
        r = requests.get(f"{BASE_URL}/", timeout=10)
        assert r.status_code == 200
        html = r.text
        assert re.search(r'<link[^>]+rel="manifest"[^>]+href="/manifest.json"', html)
        assert re.search(r'<link[^>]+rel="apple-touch-icon"', html)
        assert re.search(r'<meta[^>]+name="theme-color"[^>]+content="#D8744C"', html)
        assert re.search(r'<meta[^>]+name="apple-mobile-web-app-capable"[^>]+content="yes"', html)
        assert re.search(r'<meta[^>]+name="viewport"[^>]+viewport-fit=cover', html)


# ---------- Static backend code path verification ----------
class TestSarvamDualTranscribeCodePath:
    """Verify Sarvam returns segments_en and Stage-2 accepts it (no API call)."""

    def test_sarvam_returns_segments_en(self):
        with open(f"{REPO_ROOT}/backend/server.py", "r") as f:
            src = f.read()
        assert "async def _sarvam_transcribe" in src
        # The return dict must include a segments_en key
        body_after = src.split("async def _sarvam_transcribe", 1)[1]
        # Find the next function definition to bound the search
        next_fn = re.search(r"\nasync def |\ndef ", body_after)
        scope = body_after[: next_fn.start()] if next_fn else body_after
        assert '"segments_en"' in scope, "_sarvam_transcribe must include 'segments_en' in its return"
        assert "all_segments_en" in scope, "_sarvam_transcribe must build all_segments_en list"

    def test_structure_recipe_accepts_segments_en(self):
        with open(f"{REPO_ROOT}/backend/server.py", "r") as f:
            src = f.read()
        # signature must include segments_en kwarg
        m = re.search(r"async def _structure_recipe_with_llm\((.*?)\):", src, re.DOTALL)
        assert m, "_structure_recipe_with_llm definition not found"
        sig = m.group(1)
        assert "segments_en" in sig, f"_structure_recipe_with_llm missing segments_en kwarg: {sig}"
        # And it must be propagated by the orchestrator
        assert re.search(r"segments_en\s*=\s*segments_en", src), (
            "orchestrator must pass segments_en into _structure_recipe_with_llm"
        )


# ---------- Regression smoke ----------
class TestRegressionSmoke:
    def test_auth_me_requires_token(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401, f"expected 401 without Bearer token, got {r.status_code}"

    def test_vault_pdf_requires_auth(self):
        r = requests.get(f"{API}/vaults/00000000-0000-0000-0000-000000000001/pdf", timeout=15)
        assert r.status_code == 401, f"expected 401 for unauth PDF, got {r.status_code}"

    def test_api_root(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("message") == "Mamascript API"
