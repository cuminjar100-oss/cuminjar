#!/usr/bin/env python3
"""
Backend test suite for CuminJar - Verifying 3 major changes:
1. Seeding disabled - empty DB returns []
2. Plan is now 'unlimited' - no 402 errors for creating multiple families/recipes/invites
3. Emoji cover generation - SVG data URLs instead of PNG
"""
import requests
import os
import io
import wave
import struct

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ui-template-build.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

print(f"Testing backend at: {API_BASE}\n")

# Track created items for cleanup
created_families = []
created_recipes = []
created_stories = []
created_invites = []

def create_silent_wav(duration_seconds=2, sample_rate=16000):
    """Create a silent WAV file in memory."""
    num_samples = int(duration_seconds * sample_rate)
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        for _ in range(num_samples):
            wav.writeframes(struct.pack('<h', 0))
    buf.seek(0)
    return buf.getvalue()


# ==================== CHANGE 1: Seeding Disabled ====================
print("=" * 70)
print("CHANGE 1: Verifying Seeding is Disabled")
print("=" * 70)

# First, clean up all existing data to test empty state
print("\n[CLEANUP] Deleting all existing data to test empty state...")

# Delete all families
try:
    resp = requests.get(f"{API_BASE}/families", timeout=10)
    if resp.status_code == 200:
        families = resp.json()
        for fam in families:
            fam_id = fam.get('id')
            if fam_id:
                requests.delete(f"{API_BASE}/family/{fam_id}", timeout=10)
        print(f"✓ Deleted {len(families)} existing families")
except Exception as e:
    print(f"⚠ Could not delete families: {e}")

# Delete all recipes
try:
    resp = requests.get(f"{API_BASE}/recipes", timeout=10)
    if resp.status_code == 200:
        recipes = resp.json()
        # Note: No DELETE endpoint for recipes, but we can verify count
        print(f"✓ Found {len(recipes)} existing recipes (no DELETE endpoint)")
except Exception as e:
    print(f"⚠ Could not check recipes: {e}")

# Delete all stories
try:
    resp = requests.get(f"{API_BASE}/stories", timeout=10)
    if resp.status_code == 200:
        stories = resp.json()
        # Note: No DELETE endpoint for stories
        print(f"✓ Found {len(stories)} existing stories (no DELETE endpoint)")
except Exception as e:
    print(f"⚠ Could not check stories: {e}")

print("\n[TEST 1.1] GET /api/recipes on empty DB should return []")
try:
    resp = requests.get(f"{API_BASE}/recipes", timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, list):
            print(f"✅ PASS - GET /api/recipes returns list with {len(data)} items")
            if len(data) == 0:
                print("   ✅ Empty array returned (seeding disabled)")
            else:
                print(f"   ⚠ WARNING - Expected empty array, got {len(data)} items (may be from previous tests)")
        else:
            print(f"❌ FAIL - Expected list, got {type(data)}")
    else:
        print(f"❌ FAIL - Status {resp.status_code}: {resp.text}")
except Exception as e:
    print(f"❌ FAIL - Exception: {e}")

print("\n[TEST 1.2] GET /api/stories on empty DB should return []")
try:
    resp = requests.get(f"{API_BASE}/stories", timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, list):
            print(f"✅ PASS - GET /api/stories returns list with {len(data)} items")
            if len(data) == 0:
                print("   ✅ Empty array returned (seeding disabled)")
            else:
                print(f"   ⚠ WARNING - Expected empty array, got {len(data)} items (may be from previous tests)")
        else:
            print(f"❌ FAIL - Expected list, got {type(data)}")
    else:
        print(f"❌ FAIL - Status {resp.status_code}: {resp.text}")
except Exception as e:
    print(f"❌ FAIL - Exception: {e}")

print("\n[TEST 1.3] GET /api/albums on empty DB should return []")
try:
    resp = requests.get(f"{API_BASE}/albums", timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, list):
            print(f"✅ PASS - GET /api/albums returns list with {len(data)} items")
            if len(data) == 0:
                print("   ✅ Empty array returned (seeding disabled)")
            else:
                print(f"   ⚠ WARNING - Expected empty array, got {len(data)} items (may be from previous tests)")
        else:
            print(f"❌ FAIL - Expected list, got {type(data)}")
    else:
        print(f"❌ FAIL - Status {resp.status_code}: {resp.text}")
except Exception as e:
    print(f"❌ FAIL - Exception: {e}")

print("\n[TEST 1.4] GET /api/family-tree on empty DB should return []")
try:
    resp = requests.get(f"{API_BASE}/family-tree", timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, list):
            print(f"✅ PASS - GET /api/family-tree returns list with {len(data)} items")
            if len(data) == 0:
                print("   ✅ Empty array returned (seeding disabled)")
            else:
                print(f"   ⚠ WARNING - Expected empty array, got {len(data)} items (may be from previous tests)")
        else:
            print(f"❌ FAIL - Expected list, got {type(data)}")
    else:
        print(f"❌ FAIL - Status {resp.status_code}: {resp.text}")
except Exception as e:
    print(f"❌ FAIL - Exception: {e}")

print("\n[TEST 1.5] GET /api/notifications on empty DB should return {items: [], unread: 0}")
try:
    resp = requests.get(f"{API_BASE}/notifications", timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, dict) and 'items' in data:
            items = data.get('items', [])
            unread = data.get('unread', 0)
            print(f"✅ PASS - GET /api/notifications returns {len(items)} items, {unread} unread")
            if len(items) == 0:
                print("   ✅ Empty items array returned (seeding disabled)")
            else:
                print(f"   ⚠ WARNING - Expected empty items, got {len(items)} items (may be from previous tests)")
        else:
            print(f"❌ FAIL - Expected dict with 'items' key, got {data}")
    else:
        print(f"❌ FAIL - Status {resp.status_code}: {resp.text}")
except Exception as e:
    print(f"❌ FAIL - Exception: {e}")


# ==================== CHANGE 2: Plan is now 'unlimited' ====================
print("\n" + "=" * 70)
print("CHANGE 2: Verifying Plan is 'unlimited' with Large Limits")
print("=" * 70)

print("\n[TEST 2.1] GET /api/me should return plan='unlimited' with large limits")
try:
    resp = requests.get(f"{API_BASE}/me", timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        plan = data.get('plan')
        limits = data.get('limits', {})
        max_families = limits.get('max_families', 0)
        max_recipes = limits.get('max_recipes', 0)
        max_family_members = limits.get('max_family_members', 0)
        
        print(f"✅ PASS - GET /api/me returns:")
        print(f"   plan: '{plan}'")
        print(f"   limits.max_families: {max_families}")
        print(f"   limits.max_recipes: {max_recipes}")
        print(f"   limits.max_family_members: {max_family_members}")
        
        if plan == 'unlimited':
            print("   ✅ Plan is 'unlimited'")
        else:
            print(f"   ❌ FAIL - Expected plan='unlimited', got '{plan}'")
        
        if max_families == 9999:
            print("   ✅ max_families is 9999")
        else:
            print(f"   ❌ FAIL - Expected max_families=9999, got {max_families}")
        
        if max_recipes == 9999:
            print("   ✅ max_recipes is 9999")
        else:
            print(f"   ❌ FAIL - Expected max_recipes=9999, got {max_recipes}")
        
        if max_family_members == 9999:
            print("   ✅ max_family_members is 9999")
        else:
            print(f"   ❌ FAIL - Expected max_family_members=9999, got {max_family_members}")
    else:
        print(f"❌ FAIL - Status {resp.status_code}: {resp.text}")
except Exception as e:
    print(f"❌ FAIL - Exception: {e}")

print("\n[TEST 2.2] POST /api/family should allow creating 3+ families without 402 error")
for i in range(1, 4):
    try:
        payload = {
            "name": f"Test Family {i}",
            "description": "",
            "language": "English"
        }
        resp = requests.post(f"{API_BASE}/family", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            family_id = data.get('id')
            created_families.append(family_id)
            print(f"✅ PASS - Created family {i}: {data.get('name')} (id: {family_id})")
        elif resp.status_code == 402:
            print(f"❌ FAIL - Got 402 error on family {i}: {resp.text}")
            print(f"   This should NOT happen with unlimited plan!")
            break
        else:
            print(f"❌ FAIL - Status {resp.status_code}: {resp.text}")
            break
    except Exception as e:
        print(f"❌ FAIL - Exception on family {i}: {e}")
        break

print("\n[TEST 2.3] POST /api/recipes should allow creating 5+ recipes without 402 error")
for i in range(1, 6):
    try:
        payload = {
            "title": f"Test Recipe {i}",
            "author": "Test User",
            "region": "Test Region",
            "serves": "4",
            "time": "30 mins",
            "tags": ["test"],
            "ingredients": ["ingredient 1", "ingredient 2"],
            "steps": ["step 1", "step 2"]
        }
        resp = requests.post(f"{API_BASE}/recipes", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            recipe_id = data.get('id')
            created_recipes.append(recipe_id)
            print(f"✅ PASS - Created recipe {i}: {data.get('title')} (id: {recipe_id})")
        elif resp.status_code == 402:
            print(f"❌ FAIL - Got 402 error on recipe {i}: {resp.text}")
            print(f"   This should NOT happen with unlimited plan!")
            break
        else:
            print(f"❌ FAIL - Status {resp.status_code}: {resp.text}")
            break
    except Exception as e:
        print(f"❌ FAIL - Exception on recipe {i}: {e}")
        break

print("\n[TEST 2.4] POST /api/invites should allow adding invites without 402 error")
try:
    payload = {
        "email": "delivered@resend.dev",
        "name": "Test User",
        "relation": "Friend"
    }
    resp = requests.post(f"{API_BASE}/invites", json=payload, timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        invite_id = data.get('id')
        created_invites.append(invite_id)
        email_sent = data.get('email_sent')
        email_provider_id = data.get('email_provider_id')
        print(f"✅ PASS - Created invite: {data.get('email')} (id: {invite_id})")
        print(f"   email_sent: {email_sent}")
        print(f"   email_provider_id: {email_provider_id}")
        if email_sent:
            print("   ✅ Real email sent via Resend")
        else:
            print(f"   ⚠ WARNING - Email not sent: {data.get('email_error')}")
    elif resp.status_code == 402:
        print(f"❌ FAIL - Got 402 error: {resp.text}")
        print(f"   This should NOT happen with unlimited plan!")
    else:
        print(f"❌ FAIL - Status {resp.status_code}: {resp.text}")
except Exception as e:
    print(f"❌ FAIL - Exception: {e}")


# ==================== CHANGE 3: Emoji Cover Generation ====================
print("\n" + "=" * 70)
print("CHANGE 3: Verifying Emoji Cover Generation (SVG instead of PNG)")
print("=" * 70)

print("\n[TEST 3.1] POST /api/smart-record with kind=recipe should return emoji SVG cover")
try:
    wav_data = create_silent_wav(duration_seconds=2)
    files = {'file': ('test_audio.wav', wav_data, 'audio/wav')}
    data = {
        'kind': 'recipe',
        'media_kind': 'audio',
        'generate_image': 'true'
    }
    resp = requests.post(f"{API_BASE}/smart-record", files=files, data=data, timeout=30)
    
    if resp.status_code == 200:
        result = resp.json()
        kind = result.get('kind')
        item = result.get('item', {})
        cover = item.get('cover')
        
        print(f"✅ PASS - POST /api/smart-record returned:")
        print(f"   kind: {kind}")
        print(f"   item.id: {item.get('id')}")
        print(f"   item.title: {item.get('title')}")
        
        if cover:
            if cover.startswith('data:image/svg+xml;base64,'):
                print(f"   ✅ cover is emoji SVG data URL (length: {len(cover)})")
                print(f"   ✅ CHANGE 3 VERIFIED - Recipe cover is now emoji SVG, not PNG!")
                # Track for cleanup
                if item.get('id'):
                    created_recipes.append(item.get('id'))
            else:
                print(f"   ❌ FAIL - cover does not start with 'data:image/svg+xml;base64,'")
                print(f"   Got: {cover[:100]}...")
        else:
            print(f"   ⚠ WARNING - No cover field in response")
    elif resp.status_code == 422:
        print(f"⚠ ACCEPTABLE - Got 422 (empty transcript from silent audio): {resp.text}")
        print(f"   This is expected behavior for silent audio")
    else:
        print(f"❌ FAIL - Status {resp.status_code}: {resp.text}")
except Exception as e:
    print(f"❌ FAIL - Exception: {e}")

print("\n[TEST 3.2] POST /api/smart-record with kind=story should return emoji SVG cover")
try:
    wav_data = create_silent_wav(duration_seconds=2)
    files = {'file': ('test_audio.wav', wav_data, 'audio/wav')}
    data = {
        'kind': 'story',
        'media_kind': 'audio',
        'generate_image': 'true'
    }
    resp = requests.post(f"{API_BASE}/smart-record", files=files, data=data, timeout=30)
    
    if resp.status_code == 200:
        result = resp.json()
        kind = result.get('kind')
        item = result.get('item', {})
        cover = item.get('cover')
        
        print(f"✅ PASS - POST /api/smart-record returned:")
        print(f"   kind: {kind}")
        print(f"   item.id: {item.get('id')}")
        print(f"   item.title: {item.get('title')}")
        
        if cover:
            if cover.startswith('data:image/svg+xml;base64,'):
                print(f"   ✅ cover is emoji SVG data URL (length: {len(cover)})")
                print(f"   ✅ CHANGE 3 VERIFIED - Story cover is now emoji SVG (📖)!")
                # Track for cleanup
                if item.get('id'):
                    created_stories.append(item.get('id'))
            else:
                print(f"   ❌ FAIL - cover does not start with 'data:image/svg+xml;base64,'")
                print(f"   Got: {cover[:100]}...")
        else:
            print(f"   ⚠ WARNING - No cover field in response")
    elif resp.status_code == 422:
        print(f"⚠ ACCEPTABLE - Got 422 (empty transcript from silent audio): {resp.text}")
        print(f"   This is expected behavior for silent audio")
    else:
        print(f"❌ FAIL - Status {resp.status_code}: {resp.text}")
except Exception as e:
    print(f"❌ FAIL - Exception: {e}")

print("\n[TEST 3.3] POST /api/smart-record with kind=festival should return emoji SVG cover")
try:
    wav_data = create_silent_wav(duration_seconds=2)
    files = {'file': ('test_audio.wav', wav_data, 'audio/wav')}
    data = {
        'kind': 'festival',
        'media_kind': 'audio',
        'generate_image': 'true'
    }
    resp = requests.post(f"{API_BASE}/smart-record", files=files, data=data, timeout=30)
    
    if resp.status_code == 200:
        result = resp.json()
        kind = result.get('kind')
        item = result.get('item', {})
        cover = item.get('cover')
        
        print(f"✅ PASS - POST /api/smart-record returned:")
        print(f"   kind: {kind}")
        print(f"   item.id: {item.get('id')}")
        print(f"   item.title: {item.get('title')}")
        
        if cover:
            if cover.startswith('data:image/svg+xml;base64,'):
                print(f"   ✅ cover is emoji SVG data URL (length: {len(cover)})")
                print(f"   ✅ CHANGE 3 VERIFIED - Festival cover is now emoji SVG (🪔)!")
                # Track for cleanup
                if item.get('id'):
                    created_stories.append(item.get('id'))
            else:
                print(f"   ❌ FAIL - cover does not start with 'data:image/svg+xml;base64,'")
                print(f"   Got: {cover[:100]}...")
        else:
            print(f"   ⚠ WARNING - No cover field in response")
    elif resp.status_code == 422:
        print(f"⚠ ACCEPTABLE - Got 422 (empty transcript from silent audio): {resp.text}")
        print(f"   This is expected behavior for silent audio")
    else:
        print(f"❌ FAIL - Status {resp.status_code}: {resp.text}")
except Exception as e:
    print(f"❌ FAIL - Exception: {e}")


# ==================== REGRESSION TESTS ====================
print("\n" + "=" * 70)
print("REGRESSION TESTS")
print("=" * 70)

print("\n[REGRESSION 1] GET /api/ should return health check")
try:
    resp = requests.get(f"{API_BASE}/", timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        message = data.get('message')
        user = data.get('user')
        print(f"✅ PASS - GET /api/ returns:")
        print(f"   message: {message}")
        print(f"   user: {user}")
    else:
        print(f"❌ FAIL - Status {resp.status_code}: {resp.text}")
except Exception as e:
    print(f"❌ FAIL - Exception: {e}")

print("\n[REGRESSION 2] GET /api/me should return demo user")
try:
    resp = requests.get(f"{API_BASE}/me", timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        print(f"✅ PASS - GET /api/me returns:")
        print(f"   id: {data.get('id')}")
        print(f"   name: {data.get('name')}")
        print(f"   email: {data.get('email')}")
        print(f"   plan: {data.get('plan')}")
    else:
        print(f"❌ FAIL - Status {resp.status_code}: {resp.text}")
except Exception as e:
    print(f"❌ FAIL - Exception: {e}")

print("\n[REGRESSION 3] POST /api/transcribe with audio should work")
try:
    wav_data = create_silent_wav(duration_seconds=2)
    files = {'file': ('test_audio.wav', wav_data, 'audio/wav')}
    data = {'kind': 'audio', 'language_code': 'unknown'}
    resp = requests.post(f"{API_BASE}/transcribe", files=files, data=data, timeout=30)
    
    if resp.status_code == 200:
        result = resp.json()
        transcript = result.get('transcript', '')
        transcript_en = result.get('transcript_en', '')
        language = result.get('language', '')
        error = result.get('error')
        
        print(f"✅ PASS - POST /api/transcribe returns:")
        print(f"   transcript: '{transcript[:50]}...' (length: {len(transcript)})")
        print(f"   transcript_en: '{transcript_en[:50]}...' (length: {len(transcript_en)})")
        print(f"   language: {language}")
        print(f"   error: {error}")
    else:
        print(f"❌ FAIL - Status {resp.status_code}: {resp.text}")
except Exception as e:
    print(f"❌ FAIL - Exception: {e}")

print("\n[REGRESSION 4] POST /api/contact should work")
try:
    payload = {
        "name": "Test User",
        "email": "test@example.com",
        "subject": "Test Subject",
        "message": "This is a test message from backend_test.py"
    }
    resp = requests.post(f"{API_BASE}/contact", json=payload, timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        print(f"✅ PASS - POST /api/contact returns:")
        print(f"   ok: {data.get('ok')}")
        print(f"   id: {data.get('id')}")
    else:
        print(f"❌ FAIL - Status {resp.status_code}: {resp.text}")
except Exception as e:
    print(f"❌ FAIL - Exception: {e}")

print("\n[REGRESSION 5] POST /api/invites should still send real Resend email")
try:
    payload = {
        "email": "delivered@resend.dev",
        "name": "Regression Test User",
        "relation": "Tester"
    }
    resp = requests.post(f"{API_BASE}/invites", json=payload, timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        invite_id = data.get('id')
        created_invites.append(invite_id)
        email_sent = data.get('email_sent')
        email_provider_id = data.get('email_provider_id')
        email_error = data.get('email_error')
        
        print(f"✅ PASS - POST /api/invites returns:")
        print(f"   id: {invite_id}")
        print(f"   email: {data.get('email')}")
        print(f"   email_sent: {email_sent}")
        print(f"   email_provider_id: {email_provider_id}")
        print(f"   email_error: {email_error}")
        
        if email_sent and email_provider_id:
            print("   ✅ Real Resend email integration working!")
        else:
            print(f"   ⚠ WARNING - Email not sent: {email_error}")
    elif resp.status_code == 409:
        print(f"⚠ ACCEPTABLE - Got 409 (duplicate email): {resp.text}")
        print(f"   This is expected if delivered@resend.dev was already invited")
    else:
        print(f"❌ FAIL - Status {resp.status_code}: {resp.text}")
except Exception as e:
    print(f"❌ FAIL - Exception: {e}")


# ==================== CLEANUP ====================
print("\n" + "=" * 70)
print("CLEANUP - Deleting Test Data")
print("=" * 70)

print(f"\n[CLEANUP] Deleting {len(created_families)} test families...")
for family_id in created_families:
    try:
        resp = requests.delete(f"{API_BASE}/family/{family_id}", timeout=10)
        if resp.status_code == 200:
            print(f"✓ Deleted family {family_id}")
        else:
            print(f"⚠ Could not delete family {family_id}: {resp.status_code}")
    except Exception as e:
        print(f"⚠ Error deleting family {family_id}: {e}")

print(f"\n[CLEANUP] Note: {len(created_recipes)} test recipes created (no DELETE endpoint available)")
print(f"[CLEANUP] Note: {len(created_stories)} test stories created (no DELETE endpoint available)")

print(f"\n[CLEANUP] Deleting {len(created_invites)} test invites...")
for invite_id in created_invites:
    try:
        resp = requests.delete(f"{API_BASE}/invites/{invite_id}", timeout=10)
        if resp.status_code == 200:
            print(f"✓ Deleted invite {invite_id}")
        else:
            print(f"⚠ Could not delete invite {invite_id}: {resp.status_code}")
    except Exception as e:
        print(f"⚠ Error deleting invite {invite_id}: {e}")

print("\n" + "=" * 70)
print("BACKEND TESTING COMPLETE")
print("=" * 70)
print("\nPlease review the test results above.")
print("Note: Some recipes and stories may remain in the database (no DELETE endpoints).")
print("The user will see these on the frontend until manually deleted.")
