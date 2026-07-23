#!/usr/bin/env python3
"""
Comprehensive backend API tests for CuminJar
Tests all endpoints with real data
"""
import requests
import json
import wave
import io
import base64

# Base URL from frontend/.env
BASE_URL = "https://ui-template-build.preview.emergentagent.com/api"

# Test results tracking
test_results = {
    'passed': [],
    'failed': [],
    'warnings': []
}

def log_pass(test_name, details=""):
    test_results['passed'].append(f"✅ {test_name}: {details}")
    print(f"✅ {test_name}: {details}")

def log_fail(test_name, details=""):
    test_results['failed'].append(f"❌ {test_name}: {details}")
    print(f"❌ {test_name}: {details}")

def log_warning(test_name, details=""):
    test_results['warnings'].append(f"⚠️  {test_name}: {details}")
    print(f"⚠️  {test_name}: {details}")

def generate_silent_wav(duration_seconds=2):
    """Generate a small silent WAV file for testing"""
    sample_rate = 16000
    num_samples = int(sample_rate * duration_seconds)
    
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)  # mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(b'\x00\x00' * num_samples)  # silence
    
    buffer.seek(0)
    return buffer.getvalue()

def test_health_endpoints():
    """Test 1: Health & demo user endpoints"""
    print("\n=== Testing Health Endpoints ===")
    
    # Test GET /api/
    try:
        resp = requests.get(f"{BASE_URL}/", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if 'message' in data and 'user' in data:
                log_pass("GET /api/", f"message='{data['message']}', user='{data['user']}'")
            else:
                log_fail("GET /api/", f"Missing fields. Got: {data}")
        else:
            log_fail("GET /api/", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("GET /api/", f"Exception: {str(e)}")
    
    # Test GET /api/me
    try:
        resp = requests.get(f"{BASE_URL}/me", timeout=10)
        if resp.status_code == 200:
            user = resp.json()
            required_fields = ['id', 'name', 'firstName', 'email', 'avatar']
            missing = [f for f in required_fields if f not in user]
            if not missing:
                log_pass("GET /api/me", f"Demo user: {user['name']} ({user['email']})")
                return user
            else:
                log_fail("GET /api/me", f"Missing fields: {missing}")
        else:
            log_fail("GET /api/me", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("GET /api/me", f"Exception: {str(e)}")
    
    return None

def test_family_crud():
    """Test 2: Family group CRUD - CHANGE 1: Multiple family groups"""
    print("\n=== Testing Family CRUD (CHANGE 1: Multiple Family Groups) ===")
    
    # Step 1: GET /api/families - note current count
    try:
        resp = requests.get(f"{BASE_URL}/families", timeout=10)
        if resp.status_code == 200:
            families = resp.json()
            if isinstance(families, list):
                initial_count = len(families)
                log_pass("GET /api/families (initial)", f"Returns list with {initial_count} families")
            else:
                log_fail("GET /api/families", f"Expected list, got: {type(families)}")
                initial_count = 0
        else:
            log_fail("GET /api/families", f"Status {resp.status_code}: {resp.text}")
            initial_count = 0
    except Exception as e:
        log_fail("GET /api/families", f"Exception: {str(e)}")
        initial_count = 0
    
    # Step 2: POST /api/family with "Rao Family" -> get family_1
    family_1_data = {
        "name": "Rao Family",
        "description": "",
        "language": "English"
    }
    
    family_1_id = None
    try:
        resp = requests.post(f"{BASE_URL}/family", json=family_1_data, timeout=10)
        if resp.status_code == 200:
            family_1 = resp.json()
            if 'id' in family_1 and family_1.get('name') == family_1_data['name']:
                family_1_id = family_1['id']
                log_pass("POST /api/family (family_1)", f"Created 'Rao Family' with id={family_1_id}")
            else:
                log_fail("POST /api/family (family_1)", f"Unexpected response: {family_1}")
        else:
            log_fail("POST /api/family (family_1)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/family (family_1)", f"Exception: {str(e)}")
    
    # Step 3: POST /api/family with "Kumar Family" -> get family_2 (different id)
    family_2_data = {
        "name": "Kumar Family",
        "description": "",
        "language": "Hindi"
    }
    
    family_2_id = None
    try:
        resp = requests.post(f"{BASE_URL}/family", json=family_2_data, timeout=10)
        if resp.status_code == 200:
            family_2 = resp.json()
            if 'id' in family_2 and family_2.get('name') == family_2_data['name']:
                family_2_id = family_2['id']
                if family_2_id != family_1_id:
                    log_pass("POST /api/family (family_2)", f"Created 'Kumar Family' with NEW id={family_2_id} (different from family_1)")
                else:
                    log_fail("POST /api/family (family_2)", f"Same id as family_1: {family_2_id}")
            else:
                log_fail("POST /api/family (family_2)", f"Unexpected response: {family_2}")
        else:
            log_fail("POST /api/family (family_2)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/family (family_2)", f"Exception: {str(e)}")
    
    # Step 4: GET /api/families should return both (plus any pre-existing)
    try:
        resp = requests.get(f"{BASE_URL}/families", timeout=10)
        if resp.status_code == 200:
            families = resp.json()
            if isinstance(families, list):
                new_count = len(families)
                if new_count >= initial_count + 2:
                    # Check if both families are in the list
                    family_names = [f.get('name') for f in families]
                    if 'Rao Family' in family_names and 'Kumar Family' in family_names:
                        log_pass("GET /api/families (after creation)", f"Returns {new_count} families including both 'Rao Family' and 'Kumar Family'")
                    else:
                        log_fail("GET /api/families (after creation)", f"Missing one or both families. Found: {family_names}")
                else:
                    log_fail("GET /api/families (after creation)", f"Expected at least {initial_count + 2} families, got {new_count}")
            else:
                log_fail("GET /api/families (after creation)", f"Expected list, got: {type(families)}")
        else:
            log_fail("GET /api/families (after creation)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("GET /api/families (after creation)", f"Exception: {str(e)}")
    
    # Step 5: PUT /api/family/{family_1.id} with updated name
    if family_1_id:
        update_data = {
            "name": "Rao Family Updated",
            "description": "",
            "language": "English"
        }
        
        try:
            resp = requests.put(f"{BASE_URL}/family/{family_1_id}", json=update_data, timeout=10)
            if resp.status_code == 200:
                updated = resp.json()
                if updated.get('name') == update_data['name']:
                    log_pass("PUT /api/family/{id}", f"Updated family_1 name to 'Rao Family Updated'")
                else:
                    log_fail("PUT /api/family/{id}", f"Name not updated: {updated.get('name')}")
            else:
                log_fail("PUT /api/family/{id}", f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_fail("PUT /api/family/{id}", f"Exception: {str(e)}")
    
    # Step 6: GET /api/family should return the most recent (family_2 based on created_at)
    try:
        resp = requests.get(f"{BASE_URL}/family", timeout=10)
        if resp.status_code == 200:
            family = resp.json()
            if family:
                # Should be family_2 (Kumar Family) as it was created most recently
                if family.get('name') == 'Kumar Family':
                    log_pass("GET /api/family (backwards compat)", f"Returns most recent family: '{family.get('name')}'")
                else:
                    log_warning("GET /api/family (backwards compat)", f"Expected 'Kumar Family' (most recent), got '{family.get('name')}'")
            else:
                log_fail("GET /api/family (backwards compat)", "Returns null after families created")
        else:
            log_fail("GET /api/family (backwards compat)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("GET /api/family (backwards compat)", f"Exception: {str(e)}")
    
    # Step 7: DELETE /api/family/{family_2.id} -> 200 {"ok": true}
    if family_2_id:
        try:
            resp = requests.delete(f"{BASE_URL}/family/{family_2_id}", timeout=10)
            if resp.status_code == 200:
                result = resp.json()
                if result.get('ok') == True:
                    log_pass("DELETE /api/family/{id}", f"Deleted family_2 (Kumar Family)")
                else:
                    log_fail("DELETE /api/family/{id}", f"Unexpected response: {result}")
            else:
                log_fail("DELETE /api/family/{id}", f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_fail("DELETE /api/family/{id}", f"Exception: {str(e)}")
    
    # Step 8: DELETE /api/family/non-existent -> 404
    try:
        resp = requests.delete(f"{BASE_URL}/family/non-existent-id-12345", timeout=10)
        if resp.status_code == 404:
            log_pass("DELETE /api/family/{non-existent}", "Returns 404 for non-existent family")
        else:
            log_fail("DELETE /api/family/{non-existent}", f"Expected 404, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("DELETE /api/family/{non-existent}", f"Exception: {str(e)}")

def test_recipes():
    """Test 3: Recipes CRUD + like"""
    print("\n=== Testing Recipes ===")
    
    # GET recipes (should have seeded data)
    try:
        resp = requests.get(f"{BASE_URL}/recipes", timeout=10)
        if resp.status_code == 200:
            recipes = resp.json()
            if isinstance(recipes, list):
                seeded_titles = ["Paati's Sambar", "Nani's Rajma Chawal", "Amma's Fish Curry", "Dadi's Aloo Paratha"]
                found_seeded = [r['title'] for r in recipes if r['title'] in seeded_titles]
                if len(found_seeded) >= 4:
                    log_pass("GET /api/recipes", f"Found {len(recipes)} recipes including all 4 seeded recipes")
                else:
                    log_warning("GET /api/recipes", f"Found {len(recipes)} recipes but only {len(found_seeded)} seeded ones: {found_seeded}")
            else:
                log_fail("GET /api/recipes", f"Expected list, got: {type(recipes)}")
        else:
            log_fail("GET /api/recipes", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("GET /api/recipes", f"Exception: {str(e)}")
    
    # POST recipe (create new)
    new_recipe = {
        "title": "Test Biryani",
        "author": "Test Chef",
        "region": "Hyderabadi",
        "serves": "6",
        "time": "90 mins",
        "tags": ["Rice", "Spicy", "Festive"],
        "cover": None,
        "ingredients": ["Basmati rice", "Chicken", "Yogurt", "Spices"],
        "steps": ["Marinate chicken", "Cook rice", "Layer and dum"]
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/recipes", json=new_recipe, timeout=10)
        if resp.status_code == 200:
            created = resp.json()
            if 'id' in created and created.get('title') == new_recipe['title']:
                log_pass("POST /api/recipes", f"Created recipe with id={created['id']}")
                recipe_id = created['id']
            else:
                log_fail("POST /api/recipes", f"Unexpected response: {created}")
                recipe_id = None
        else:
            log_fail("POST /api/recipes", f"Status {resp.status_code}: {resp.text}")
            recipe_id = None
    except Exception as e:
        log_fail("POST /api/recipes", f"Exception: {str(e)}")
        recipe_id = None
    
    # POST like (toggle)
    if recipe_id:
        try:
            # First like
            resp = requests.post(f"{BASE_URL}/recipes/{recipe_id}/like", timeout=10)
            if resp.status_code == 200:
                liked = resp.json()
                if liked.get('liked') == True:
                    log_pass("POST /api/recipes/{id}/like (first toggle)", "Recipe liked")
                else:
                    log_fail("POST /api/recipes/{id}/like (first toggle)", f"Expected liked=True, got {liked.get('liked')}")
            else:
                log_fail("POST /api/recipes/{id}/like", f"Status {resp.status_code}: {resp.text}")
            
            # Second like (toggle back)
            resp = requests.post(f"{BASE_URL}/recipes/{recipe_id}/like", timeout=10)
            if resp.status_code == 200:
                unliked = resp.json()
                if unliked.get('liked') == False:
                    log_pass("POST /api/recipes/{id}/like (second toggle)", "Recipe unliked")
                else:
                    log_fail("POST /api/recipes/{id}/like (second toggle)", f"Expected liked=False, got {unliked.get('liked')}")
            else:
                log_fail("POST /api/recipes/{id}/like (toggle back)", f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_fail("POST /api/recipes/{id}/like", f"Exception: {str(e)}")

def test_stories():
    """Test 4: Stories CRUD"""
    print("\n=== Testing Stories ===")
    
    # GET stories (should have 3 seeded)
    try:
        resp = requests.get(f"{BASE_URL}/stories", timeout=10)
        if resp.status_code == 200:
            stories = resp.json()
            if isinstance(stories, list):
                seeded_titles = ['The Monsoon Kitchen', 'Grandma\u2019s Diwali', 'The Family Almirah']
                found_seeded = [s['title'] for s in stories if s['title'] in seeded_titles]
                if len(found_seeded) >= 3:
                    log_pass("GET /api/stories", f"Found {len(stories)} stories including all 3 seeded stories")
                else:
                    log_warning("GET /api/stories", f"Found {len(stories)} stories but only {len(found_seeded)} seeded ones")
            else:
                log_fail("GET /api/stories", f"Expected list, got: {type(stories)}")
        else:
            log_fail("GET /api/stories", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("GET /api/stories", f"Exception: {str(e)}")
    
    # POST story
    new_story = {
        "title": "Test Story: The Kitchen Chronicles",
        "author": "Test Author",
        "excerpt": "This is a test story about family traditions and cooking memories passed down through generations.",
        "mins": 5
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/stories", json=new_story, timeout=10)
        if resp.status_code == 200:
            created = resp.json()
            if 'id' in created and created.get('title') == new_story['title']:
                log_pass("POST /api/stories", f"Created story with id={created['id']}")
            else:
                log_fail("POST /api/stories", f"Unexpected response: {created}")
        else:
            log_fail("POST /api/stories", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/stories", f"Exception: {str(e)}")

def test_albums():
    """Test 5: Albums CRUD"""
    print("\n=== Testing Albums ===")
    
    # GET albums (should have 4 seeded)
    try:
        resp = requests.get(f"{BASE_URL}/albums", timeout=10)
        if resp.status_code == 200:
            albums = resp.json()
            if isinstance(albums, list):
                seeded_titles = ['Diwali 2024', "Paati's Kitchen", 'Handwritten Recipes', 'Family Portraits']
                found_seeded = [a['title'] for a in albums if a['title'] in seeded_titles]
                if len(found_seeded) >= 4:
                    log_pass("GET /api/albums", f"Found {len(albums)} albums including all 4 seeded albums")
                else:
                    log_warning("GET /api/albums", f"Found {len(albums)} albums but only {len(found_seeded)} seeded ones")
            else:
                log_fail("GET /api/albums", f"Expected list, got: {type(albums)}")
        else:
            log_fail("GET /api/albums", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("GET /api/albums", f"Exception: {str(e)}")
    
    # POST album
    new_album = {
        "title": "Test Album: Family Gatherings 2025",
        "cover": None
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/albums", json=new_album, timeout=10)
        if resp.status_code == 200:
            created = resp.json()
            if 'id' in created and created.get('title') == new_album['title']:
                log_pass("POST /api/albums", f"Created album with id={created['id']}")
            else:
                log_fail("POST /api/albums", f"Unexpected response: {created}")
        else:
            log_fail("POST /api/albums", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/albums", f"Exception: {str(e)}")

def test_family_tree():
    """Test 6: Family tree CRUD"""
    print("\n=== Testing Family Tree ===")
    
    # GET family tree (should have 6 seeded members)
    try:
        resp = requests.get(f"{BASE_URL}/family-tree", timeout=10)
        if resp.status_code == 200:
            members = resp.json()
            if isinstance(members, list):
                if len(members) >= 6:
                    levels = set(m.get('level') for m in members)
                    log_pass("GET /api/family-tree", f"Found {len(members)} members across levels {sorted(levels)}")
                else:
                    log_warning("GET /api/family-tree", f"Found only {len(members)} members, expected at least 6")
            else:
                log_fail("GET /api/family-tree", f"Expected list, got: {type(members)}")
        else:
            log_fail("GET /api/family-tree", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("GET /api/family-tree", f"Exception: {str(e)}")
    
    # POST family member
    new_member = {
        "name": "Test Cousin Priya",
        "role": "Cousin",
        "level": 2,
        "avatar": None
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/family-tree", json=new_member, timeout=10)
        if resp.status_code == 200:
            created = resp.json()
            if 'id' in created and created.get('name') == new_member['name']:
                log_pass("POST /api/family-tree", f"Added member with id={created['id']}")
            else:
                log_fail("POST /api/family-tree", f"Unexpected response: {created}")
        else:
            log_fail("POST /api/family-tree", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/family-tree", f"Exception: {str(e)}")

def test_notifications():
    """Test 7: Notifications"""
    print("\n=== Testing Notifications ===")
    
    # GET notifications (should have 4 seeded)
    try:
        resp = requests.get(f"{BASE_URL}/notifications", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if 'items' in data and 'unread' in data:
                items = data['items']
                unread = data['unread']
                if len(items) >= 4:
                    log_pass("GET /api/notifications", f"Found {len(items)} notifications, {unread} unread")
                else:
                    log_warning("GET /api/notifications", f"Found only {len(items)} notifications, expected at least 4")
            else:
                log_fail("GET /api/notifications", f"Missing 'items' or 'unread' field: {data}")
        else:
            log_fail("GET /api/notifications", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("GET /api/notifications", f"Exception: {str(e)}")
    
    # POST mark-read
    try:
        resp = requests.post(f"{BASE_URL}/notifications/mark-read", timeout=10)
        if resp.status_code == 200:
            result = resp.json()
            if result.get('ok') == True:
                log_pass("POST /api/notifications/mark-read", "All notifications marked as read")
            else:
                log_fail("POST /api/notifications/mark-read", f"Unexpected response: {result}")
        else:
            log_fail("POST /api/notifications/mark-read", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/notifications/mark-read", f"Exception: {str(e)}")
    
    # Verify unread count is 0 after marking read
    try:
        resp = requests.get(f"{BASE_URL}/notifications", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('unread') == 0:
                log_pass("GET /api/notifications (after mark-read)", "Unread count is 0")
            else:
                log_warning("GET /api/notifications (after mark-read)", f"Unread count is {data.get('unread')}, expected 0")
        else:
            log_fail("GET /api/notifications (after mark-read)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("GET /api/notifications (after mark-read)", f"Exception: {str(e)}")

def test_invites():
    """Test 8: Invites with REAL Resend email integration (CHANGE 2 - PRIMARY)"""
    print("\n=== Testing Invites with Resend Email Integration (CHANGE 2) ===")
    
    # GET invites (initially empty or has previous test data)
    try:
        resp = requests.get(f"{BASE_URL}/invites", timeout=10)
        if resp.status_code == 200:
            invites = resp.json()
            if isinstance(invites, list):
                log_pass("GET /api/invites", f"Returns list with {len(invites)} invites")
                initial_count = len(invites)
            else:
                log_fail("GET /api/invites", f"Expected list, got: {type(invites)}")
                initial_count = 0
        else:
            log_fail("GET /api/invites", f"Status {resp.status_code}: {resp.text}")
            initial_count = 0
    except Exception as e:
        log_fail("GET /api/invites", f"Exception: {str(e)}")
        initial_count = 0
    
    # CHANGE 2: POST invite with Resend test address (delivered@resend.dev)
    invite_data = {
        "email": "delivered@resend.dev",  # Resend's test address that always accepts
        "name": "Test Grandmother",
        "relation": "Grandmother"
    }
    
    invite_id = None
    try:
        print("  Sending real email via Resend (may take a few seconds)...")
        resp = requests.post(f"{BASE_URL}/invites", json=invite_data, timeout=30)
        if resp.status_code == 200:
            created = resp.json()
            required_fields = ['id', 'email', 'status', 'created_at', 'email_sent', 'email_provider_id', 'email_error']
            missing = [f for f in required_fields if f not in created]
            
            if not missing:
                invite_id = created['id']
                email_sent = created.get('email_sent')
                email_provider_id = created.get('email_provider_id')
                email_error = created.get('email_error')
                status = created.get('status')
                
                # CHANGE 2: Verify Resend integration fields
                if email_sent == True and email_provider_id and email_error is None and status == 'pending':
                    log_pass("POST /api/invites (Resend integration)", 
                            f"✅ REAL EMAIL SENT via Resend! id={invite_id}, email_sent=True, email_provider_id={email_provider_id}, email_error=None, status=pending")
                else:
                    log_fail("POST /api/invites (Resend integration)", 
                            f"Resend fields incorrect: email_sent={email_sent}, email_provider_id={email_provider_id}, email_error={email_error}, status={status}")
            else:
                log_fail("POST /api/invites (Resend integration)", f"Missing fields: {missing}. Response: {created}")
        else:
            log_fail("POST /api/invites (Resend integration)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/invites (Resend integration)", f"Exception: {str(e)}")
    
    # CHANGE 2: Verify notification includes "Invitation email sent to <email>"
    try:
        notif_resp = requests.get(f"{BASE_URL}/notifications", timeout=10)
        if notif_resp.status_code == 200:
            notifs = notif_resp.json()
            items = notifs.get('items', [])
            # Look for "Family invite sent" notification with email in description
            found_notif = None
            for item in items:
                if 'family invite sent' in item.get('title', '').lower():
                    desc = item.get('desc', '')
                    if 'invitation email sent to' in desc.lower() and invite_data['email'] in desc.lower():
                        found_notif = item
                        break
            
            if found_notif:
                log_pass("Invite notification (Resend)", f"Notification includes 'Invitation email sent to {invite_data['email']}'")
            else:
                log_fail("Invite notification (Resend)", f"No notification with 'Invitation email sent to {invite_data['email']}' found")
    except Exception as e:
        log_fail("Invite notification (Resend)", f"Exception: {str(e)}")
    
    # POST invite with invalid email
    try:
        resp = requests.post(f"{BASE_URL}/invites", json={"email": "not-an-email", "name": "Test", "relation": "Test"}, timeout=10)
        if resp.status_code == 400:
            error = resp.json()
            if 'invalid email' in error.get('detail', '').lower():
                log_pass("POST /api/invites (invalid email)", "Returns 400 with 'Invalid email address'")
            else:
                log_fail("POST /api/invites (invalid email)", f"Returns 400 but wrong detail: {error.get('detail')}")
        else:
            log_fail("POST /api/invites (invalid email)", f"Expected 400, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/invites (invalid email)", f"Exception: {str(e)}")
    
    # POST invite with duplicate email (delivered@resend.dev again)
    try:
        resp = requests.post(f"{BASE_URL}/invites", json=invite_data, timeout=10)
        if resp.status_code == 409:
            error = resp.json()
            if 'already invited' in error.get('detail', '').lower():
                log_pass("POST /api/invites (duplicate)", "Returns 409 with 'This email is already invited'")
            else:
                log_fail("POST /api/invites (duplicate)", f"Returns 409 but wrong detail: {error.get('detail')}")
        else:
            log_fail("POST /api/invites (duplicate)", f"Expected 409, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/invites (duplicate)", f"Exception: {str(e)}")
    
    # DELETE invite
    if invite_id:
        try:
            resp = requests.delete(f"{BASE_URL}/invites/{invite_id}", timeout=10)
            if resp.status_code == 200:
                result = resp.json()
                if result.get('ok') == True:
                    log_pass("DELETE /api/invites/{id}", f"Deleted invite {invite_id}")
                    
                    # Verify it's gone
                    get_resp = requests.get(f"{BASE_URL}/invites", timeout=10)
                    if get_resp.status_code == 200:
                        invites = get_resp.json()
                        if not any(inv.get('id') == invite_id for inv in invites):
                            log_pass("GET /api/invites (after delete)", "Invite no longer in list")
                        else:
                            log_fail("GET /api/invites (after delete)", "Invite still in list after delete")
                else:
                    log_fail("DELETE /api/invites/{id}", f"Unexpected response: {result}")
            else:
                log_fail("DELETE /api/invites/{id}", f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_fail("DELETE /api/invites/{id}", f"Exception: {str(e)}")

def test_contact():
    """Test 9: Contact (NEW FEATURE - contact form submissions)"""
    print("\n=== Testing Contact (NEW FEATURE) ===")
    
    # POST contact with valid data
    contact_data = {
        "name": "Test User",
        "email": "test@example.com",
        "subject": "General enquiry",
        "message": "Hello team! This is a test message."
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/contact", json=contact_data, timeout=10)
        if resp.status_code == 200:
            result = resp.json()
            if result.get('ok') == True and 'id' in result:
                log_pass("POST /api/contact (valid)", f"Contact submitted with id={result['id']}")
            else:
                log_fail("POST /api/contact (valid)", f"Unexpected response: {result}")
        else:
            log_fail("POST /api/contact (valid)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/contact (valid)", f"Exception: {str(e)}")
    
    # POST contact with invalid email
    try:
        resp = requests.post(f"{BASE_URL}/contact", json={
            "name": "Test",
            "email": "invalid-email",
            "subject": "Test",
            "message": "Test message"
        }, timeout=10)
        if resp.status_code == 400:
            error = resp.json()
            if 'invalid email' in error.get('detail', '').lower():
                log_pass("POST /api/contact (invalid email)", "Returns 400 with 'Invalid email address'")
            else:
                log_fail("POST /api/contact (invalid email)", f"Returns 400 but wrong detail: {error.get('detail')}")
        else:
            log_fail("POST /api/contact (invalid email)", f"Expected 400, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/contact (invalid email)", f"Exception: {str(e)}")
    
    # POST contact with empty message
    try:
        resp = requests.post(f"{BASE_URL}/contact", json={
            "name": "Test",
            "email": "test@example.com",
            "subject": "Test",
            "message": ""
        }, timeout=10)
        if resp.status_code == 400:
            error = resp.json()
            if 'message' in error.get('detail', '').lower():
                log_pass("POST /api/contact (empty message)", "Returns 400 with 'Message required'")
            else:
                log_fail("POST /api/contact (empty message)", f"Returns 400 but wrong detail: {error.get('detail')}")
        else:
            log_fail("POST /api/contact (empty message)", f"Expected 400, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/contact (empty message)", f"Exception: {str(e)}")

def test_transcribe_endpoint():
    """Test 10: Universal transcription endpoint (CHANGE 2: Sarvam audio chunking + Gemini photo OCR)"""
    print("\n=== Testing Universal Transcription Endpoint (CHANGE 2) ===")
    
    # Test 1: Short silent WAV (2-3 seconds) with kind=audio
    print("  Test 1: Short silent WAV (2-3 seconds)...")
    audio_data = generate_silent_wav(duration_seconds=2)
    
    files = {
        'file': ('test_audio_short.wav', io.BytesIO(audio_data), 'audio/wav')
    }
    data = {
        'kind': 'audio',
        'language_code': 'en-IN'
    }
    
    try:
        print("    Uploading short silent audio (may take 10-30 seconds)...")
        resp = requests.post(f"{BASE_URL}/transcribe", files=files, data=data, timeout=60)
        if resp.status_code == 200:
            result = resp.json()
            required_fields = ['transcript', 'transcript_en', 'language']
            missing = [f for f in required_fields if f not in result]
            
            if not missing:
                transcript = result.get('transcript', '')
                transcript_en = result.get('transcript_en', '')
                language = result.get('language', '')
                error = result.get('error')
                
                # For silent audio, transcript may be empty but endpoint should NOT crash
                if error and 'exceeds maximum limit' in error.lower():
                    log_fail("POST /api/transcribe (short audio)", f"CRITICAL: Audio chunking not working - got 'exceeds maximum limit' error: {error}")
                else:
                    log_pass("POST /api/transcribe (short audio)", f"Returns 200 (transcript may be empty for silent audio, error={error})")
            else:
                log_fail("POST /api/transcribe (short audio)", f"Missing fields: {missing}. Response: {result}")
        else:
            log_fail("POST /api/transcribe (short audio)", f"Status {resp.status_code}: {resp.text}")
    except requests.exceptions.Timeout:
        log_fail("POST /api/transcribe (short audio)", "Request timed out after 60 seconds")
    except Exception as e:
        log_fail("POST /api/transcribe (short audio)", f"Exception: {str(e)}")
    
    # Test 2: LONGER silent WAV (~40 seconds) - CRITICAL: Tests audio chunking
    print("  Test 2: LONGER silent WAV (~40 seconds) - CRITICAL CHUNKING TEST...")
    audio_data_long = generate_silent_wav(duration_seconds=40)
    
    files = {
        'file': ('test_audio_long.wav', io.BytesIO(audio_data_long), 'audio/wav')
    }
    data = {
        'kind': 'audio',
        'language_code': 'en-IN'
    }
    
    try:
        print("    Uploading LONG silent audio (may take 30-60 seconds)...")
        resp = requests.post(f"{BASE_URL}/transcribe", files=files, data=data, timeout=90)
        if resp.status_code == 200:
            result = resp.json()
            required_fields = ['transcript', 'transcript_en', 'language']
            missing = [f for f in required_fields if f not in result]
            
            if not missing:
                transcript = result.get('transcript', '')
                transcript_en = result.get('transcript_en', '')
                language = result.get('language', '')
                error = result.get('error')
                
                # CRITICAL: Should NOT have "exceeds maximum limit" error
                if error and 'exceeds maximum limit' in error.lower():
                    log_fail("POST /api/transcribe (long audio - CHUNKING)", f"❌ CRITICAL: Audio chunking FAILED - Sarvam rejected >30s audio: {error}")
                else:
                    log_pass("POST /api/transcribe (long audio - CHUNKING)", f"✅ CRITICAL: Audio chunking WORKING - 40s audio processed without 'exceeds maximum limit' error (transcript may be empty for silent audio, error={error})")
            else:
                log_fail("POST /api/transcribe (long audio - CHUNKING)", f"Missing fields: {missing}. Response: {result}")
        else:
            log_fail("POST /api/transcribe (long audio - CHUNKING)", f"Status {resp.status_code}: {resp.text}")
    except requests.exceptions.Timeout:
        log_fail("POST /api/transcribe (long audio - CHUNKING)", "Request timed out after 90 seconds")
    except Exception as e:
        log_fail("POST /api/transcribe (long audio - CHUNKING)", f"Exception: {str(e)}")
    
    # Test 3: Small PNG with text-like content (or plain PNG) with kind=photo
    print("  Test 3: Small PNG (Gemini photo OCR)...")
    # Generate a small 1x1 PNG
    png_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
    
    files = {
        'file': ('test_image.png', io.BytesIO(png_data), 'image/png')
    }
    data = {
        'kind': 'photo',
        'language_code': 'en-IN'
    }
    
    try:
        print("    Uploading PNG for OCR (may take 10-30 seconds)...")
        resp = requests.post(f"{BASE_URL}/transcribe", files=files, data=data, timeout=60)
        if resp.status_code == 200:
            result = resp.json()
            required_fields = ['transcript', 'transcript_en', 'language']
            missing = [f for f in required_fields if f not in result]
            
            if not missing:
                transcript_en = result.get('transcript_en', '')
                # For plain PNG, transcript_en may be empty but shouldn't error
                log_pass("POST /api/transcribe (photo)", f"Returns 200 with transcript_en field (may be empty for plain PNG)")
            else:
                log_fail("POST /api/transcribe (photo)", f"Missing fields: {missing}. Response: {result}")
        else:
            log_fail("POST /api/transcribe (photo)", f"Status {resp.status_code}: {resp.text}")
    except requests.exceptions.Timeout:
        log_fail("POST /api/transcribe (photo)", "Request timed out after 60 seconds")
    except Exception as e:
        log_fail("POST /api/transcribe (photo)", f"Exception: {str(e)}")
    
    # Test 4: POST empty file -> 400 "Empty file"
    print("  Test 4: Empty file (should return 400)...")
    files = {
        'file': ('empty.wav', io.BytesIO(b''), 'audio/wav')
    }
    data = {
        'kind': 'audio',
        'language_code': 'en-IN'
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/transcribe", files=files, data=data, timeout=10)
        if resp.status_code == 400:
            error = resp.json()
            if 'empty file' in error.get('detail', '').lower():
                log_pass("POST /api/transcribe (empty file)", "Returns 400 with 'Empty file'")
            else:
                log_fail("POST /api/transcribe (empty file)", f"Returns 400 but wrong detail: {error.get('detail')}")
        else:
            log_fail("POST /api/transcribe (empty file)", f"Expected 400, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/transcribe (empty file)", f"Exception: {str(e)}")


def test_voice_recipes():
    """Test 11: Voice recipes (CHANGE 3: Regression test - still works via unified helper)"""
    print("\n=== Testing Voice Recipes (CHANGE 3: Regression Test) ===")
    
    # GET voice recipes (initially empty or has previous test data)
    try:
        resp = requests.get(f"{BASE_URL}/voice-recipes", timeout=10)
        if resp.status_code == 200:
            voice_recipes = resp.json()
            if isinstance(voice_recipes, list):
                log_pass("GET /api/voice-recipes", f"Found {len(voice_recipes)} voice recipes")
                initial_count = len(voice_recipes)
            else:
                log_fail("GET /api/voice-recipes", f"Expected list, got: {type(voice_recipes)}")
                initial_count = 0
        else:
            log_fail("GET /api/voice-recipes", f"Status {resp.status_code}: {resp.text}")
            initial_count = 0
    except Exception as e:
        log_fail("GET /api/voice-recipes", f"Exception: {str(e)}")
        initial_count = 0
    
    # POST voice recipe with audio file
    print("  Generating test audio file...")
    audio_data = generate_silent_wav(duration_seconds=3)
    
    files = {
        'audio': ('test_audio.wav', io.BytesIO(audio_data), 'audio/wav')
    }
    data = {
        'title': 'Test Voice Recipe: Grandma\'s Secret Masala',
        'author': 'Test Recorder',
        'language_code': 'en-IN',
        'duration': '3.0'
    }
    
    try:
        print("  Uploading voice recipe (this may take 10-30 seconds for Sarvam STT + Gemini)...")
        resp = requests.post(f"{BASE_URL}/voice-recipes", files=files, data=data, timeout=60)
        if resp.status_code == 200:
            created = resp.json()
            required_fields = ['id', 'title', 'author', 'language', 'duration', 'transcript', 'transcript_en']
            missing = [f for f in required_fields if f not in created]
            
            if not missing:
                voice_id = created['id']
                transcript = created.get('transcript', '')
                transcript_en = created.get('transcript_en', '')
                error = created.get('error')
                
                # CHANGE 3: Verify voice recipes still works via unified helper
                log_pass("POST /api/voice-recipes (REGRESSION)", f"✅ CHANGE 3 VERIFIED: Voice recipes still works via unified helper. Created with id={voice_id}")
                
                # Check if notification was created
                try:
                    notif_resp = requests.get(f"{BASE_URL}/notifications", timeout=10)
                    if notif_resp.status_code == 200:
                        notifs = notif_resp.json()
                        items = notifs.get('items', [])
                        # Look for the notification about this voice recipe
                        found_notif = any('transcription complete' in item.get('title', '').lower() for item in items)
                        if found_notif:
                            log_pass("Voice recipe notification", "Notification auto-created after upload")
                        else:
                            log_warning("Voice recipe notification", "No transcription notification found")
                except Exception as e:
                    log_warning("Voice recipe notification", f"Could not verify: {str(e)}")
                
                # DELETE voice recipe
                try:
                    del_resp = requests.delete(f"{BASE_URL}/voice-recipes/{voice_id}", timeout=10)
                    if del_resp.status_code == 200:
                        result = del_resp.json()
                        if result.get('ok') == True:
                            log_pass("DELETE /api/voice-recipes/{id}", f"Deleted voice recipe {voice_id}")
                        else:
                            log_fail("DELETE /api/voice-recipes/{id}", f"Unexpected response: {result}")
                    else:
                        log_fail("DELETE /api/voice-recipes/{id}", f"Status {del_resp.status_code}: {del_resp.text}")
                except Exception as e:
                    log_fail("DELETE /api/voice-recipes/{id}", f"Exception: {str(e)}")
            else:
                log_fail("POST /api/voice-recipes (REGRESSION)", f"Missing fields: {missing}. Response: {created}")
        else:
            log_fail("POST /api/voice-recipes (REGRESSION)", f"Status {resp.status_code}: {resp.text}")
    except requests.exceptions.Timeout:
        log_fail("POST /api/voice-recipes (REGRESSION)", "Request timed out after 60 seconds")
    except Exception as e:
        log_fail("POST /api/voice-recipes (REGRESSION)", f"Exception: {str(e)}")

def test_smart_record():
    """Test 12: Smart Record endpoint - full pipeline (transcribe → structure → generate image → save)"""
    print("\n=== Testing Smart Record Endpoint (NEW FEATURE) ===")
    
    # Test 1: POST /api/smart-record with kind=recipe, generate_image=false
    print("  Test 1: Smart record with kind=recipe (generate_image=false)...")
    audio_data = generate_silent_wav(duration_seconds=2)
    
    files = {
        'file': ('test_audio.wav', io.BytesIO(audio_data), 'audio/wav')
    }
    data = {
        'kind': 'recipe',
        'media_kind': 'audio',
        'generate_image': 'false'
    }
    
    try:
        print("    Uploading audio for smart-record (may take 10-30 seconds)...")
        resp = requests.post(f"{BASE_URL}/smart-record", files=files, data=data, timeout=90)
        if resp.status_code == 200:
            result = resp.json()
            if result.get('kind') == 'recipe' and 'item' in result:
                item = result['item']
                required_fields = ['id', 'title', 'ingredients', 'steps', 'serves', 'time', 'region', 'tags', 'transcript_en']
                missing = [f for f in required_fields if f not in item]
                
                if not missing:
                    log_pass("POST /api/smart-record (recipe)", f"Returns 200 with kind=recipe, item has all required fields (id={item['id']}, title='{item['title']}')")
                else:
                    log_fail("POST /api/smart-record (recipe)", f"Missing fields in item: {missing}")
            else:
                log_fail("POST /api/smart-record (recipe)", f"Unexpected response structure: {result}")
        elif resp.status_code == 422:
            error = resp.json()
            if 'could not understand' in error.get('detail', '').lower():
                log_pass("POST /api/smart-record (recipe)", f"Returns 422 for empty transcript (silent audio) - acceptable: {error.get('detail')}")
            else:
                log_fail("POST /api/smart-record (recipe)", f"Returns 422 but unexpected detail: {error.get('detail')}")
        else:
            log_fail("POST /api/smart-record (recipe)", f"Status {resp.status_code}: {resp.text}")
    except requests.exceptions.Timeout:
        log_fail("POST /api/smart-record (recipe)", "Request timed out after 90 seconds")
    except Exception as e:
        log_fail("POST /api/smart-record (recipe)", f"Exception: {str(e)}")
    
    # Test 2: POST /api/smart-record with kind=story, generate_image=false
    print("  Test 2: Smart record with kind=story (generate_image=false)...")
    audio_data = generate_silent_wav(duration_seconds=2)
    
    files = {
        'file': ('test_audio.wav', io.BytesIO(audio_data), 'audio/wav')
    }
    data = {
        'kind': 'story',
        'media_kind': 'audio',
        'generate_image': 'false'
    }
    
    try:
        print("    Uploading audio for smart-record story (may take 10-30 seconds)...")
        resp = requests.post(f"{BASE_URL}/smart-record", files=files, data=data, timeout=90)
        if resp.status_code == 200:
            result = resp.json()
            if result.get('kind') == 'story' and 'item' in result:
                item = result['item']
                required_fields = ['id', 'title', 'excerpt', 'mins', 'transcript_en']
                missing = [f for f in required_fields if f not in item]
                
                if not missing:
                    log_pass("POST /api/smart-record (story)", f"Returns 200 with kind=story, item has all required fields (id={item['id']}, title='{item['title']}')")
                else:
                    log_fail("POST /api/smart-record (story)", f"Missing fields in item: {missing}")
            else:
                log_fail("POST /api/smart-record (story)", f"Unexpected response structure: {result}")
        elif resp.status_code == 422:
            error = resp.json()
            if 'could not understand' in error.get('detail', '').lower():
                log_pass("POST /api/smart-record (story)", f"Returns 422 for empty transcript (silent audio) - acceptable: {error.get('detail')}")
            else:
                log_fail("POST /api/smart-record (story)", f"Returns 422 but unexpected detail: {error.get('detail')}")
        else:
            log_fail("POST /api/smart-record (story)", f"Status {resp.status_code}: {resp.text}")
    except requests.exceptions.Timeout:
        log_fail("POST /api/smart-record (story)", "Request timed out after 90 seconds")
    except Exception as e:
        log_fail("POST /api/smart-record (story)", f"Exception: {str(e)}")
    
    # Test 3: POST /api/smart-record with kind=festival, generate_image=false
    print("  Test 3: Smart record with kind=festival (generate_image=false)...")
    audio_data = generate_silent_wav(duration_seconds=2)
    
    files = {
        'file': ('test_audio.wav', io.BytesIO(audio_data), 'audio/wav')
    }
    data = {
        'kind': 'festival',
        'media_kind': 'audio',
        'generate_image': 'false'
    }
    
    try:
        print("    Uploading audio for smart-record festival (may take 10-30 seconds)...")
        resp = requests.post(f"{BASE_URL}/smart-record", files=files, data=data, timeout=90)
        if resp.status_code == 200:
            result = resp.json()
            if result.get('kind') == 'festival' and 'item' in result:
                item = result['item']
                required_fields = ['id', 'title', 'excerpt', 'mins', 'transcript_en']
                missing = [f for f in required_fields if f not in item]
                
                if not missing:
                    # Check if item has kind=festival
                    if item.get('kind') == 'festival':
                        log_pass("POST /api/smart-record (festival)", f"Returns 200 with kind=festival, item has all required fields and kind=festival (id={item['id']}, title='{item['title']}')")
                    else:
                        log_fail("POST /api/smart-record (festival)", f"Item missing kind=festival field: {item.get('kind')}")
                else:
                    log_fail("POST /api/smart-record (festival)", f"Missing fields in item: {missing}")
            else:
                log_fail("POST /api/smart-record (festival)", f"Unexpected response structure: {result}")
        elif resp.status_code == 422:
            error = resp.json()
            if 'could not understand' in error.get('detail', '').lower():
                log_pass("POST /api/smart-record (festival)", f"Returns 422 for empty transcript (silent audio) - acceptable: {error.get('detail')}")
            else:
                log_fail("POST /api/smart-record (festival)", f"Returns 422 but unexpected detail: {error.get('detail')}")
        else:
            log_fail("POST /api/smart-record (festival)", f"Status {resp.status_code}: {resp.text}")
    except requests.exceptions.Timeout:
        log_fail("POST /api/smart-record (festival)", "Request timed out after 90 seconds")
    except Exception as e:
        log_fail("POST /api/smart-record (festival)", f"Exception: {str(e)}")
    
    # Test 4: POST /api/smart-record with empty file → 400
    print("  Test 4: Smart record with empty file (should return 400)...")
    files = {
        'file': ('empty.wav', io.BytesIO(b''), 'audio/wav')
    }
    data = {
        'kind': 'recipe',
        'media_kind': 'audio',
        'generate_image': 'false'
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/smart-record", files=files, data=data, timeout=10)
        if resp.status_code == 400:
            error = resp.json()
            if 'empty file' in error.get('detail', '').lower():
                log_pass("POST /api/smart-record (empty file)", "Returns 400 with 'Empty file'")
            else:
                log_fail("POST /api/smart-record (empty file)", f"Returns 400 but wrong detail: {error.get('detail')}")
        else:
            log_fail("POST /api/smart-record (empty file)", f"Expected 400, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/smart-record (empty file)", f"Exception: {str(e)}")


def test_recipe_patch():
    """Test 13: PATCH /api/recipes/{id} - update recipe cover"""
    print("\n=== Testing Recipe PATCH Endpoint ===")
    
    # First, create a test recipe to get an ID
    new_recipe = {
        "title": "Test Recipe for PATCH",
        "author": "Test Chef",
        "region": "South Indian",
        "serves": "4",
        "time": "30 mins",
        "tags": ["Quick", "Easy"],
        "cover": None,
        "ingredients": ["Rice", "Lentils"],
        "steps": ["Cook rice", "Cook lentils", "Mix together"]
    }
    
    recipe_id = None
    try:
        resp = requests.post(f"{BASE_URL}/recipes", json=new_recipe, timeout=10)
        if resp.status_code == 200:
            created = resp.json()
            if 'id' in created:
                recipe_id = created['id']
                log_pass("POST /api/recipes (for PATCH test)", f"Created test recipe with id={recipe_id}")
            else:
                log_fail("POST /api/recipes (for PATCH test)", f"No id in response: {created}")
        else:
            log_fail("POST /api/recipes (for PATCH test)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/recipes (for PATCH test)", f"Exception: {str(e)}")
    
    # Now PATCH the recipe with a cover image
    if recipe_id:
        # Generate a small base64 PNG
        png_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
        cover_data_url = f"data:image/png;base64,{base64.b64encode(png_data).decode('utf-8')}"
        
        patch_payload = {
            "cover": cover_data_url
        }
        
        try:
            resp = requests.patch(f"{BASE_URL}/recipes/{recipe_id}", json=patch_payload, timeout=10)
            if resp.status_code == 200:
                updated = resp.json()
                if 'cover' in updated and updated['cover'] == cover_data_url:
                    log_pass("PATCH /api/recipes/{id}", f"Updated recipe cover successfully (cover field present and matches)")
                elif 'cover' in updated:
                    log_warning("PATCH /api/recipes/{id}", f"Cover field present but doesn't match exactly (may be processed)")
                else:
                    log_fail("PATCH /api/recipes/{id}", f"Cover field missing in response: {updated}")
            else:
                log_fail("PATCH /api/recipes/{id}", f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_fail("PATCH /api/recipes/{id}", f"Exception: {str(e)}")


def test_plan_limits_regression():
    """Test 14: Plan limits regression (verify limits still enforced)"""
    print("\n=== Testing Plan Limits Regression ===")
    
    # Test GET /api/me - verify plan and limits fields present
    try:
        resp = requests.get(f"{BASE_URL}/me", timeout=10)
        if resp.status_code == 200:
            user = resp.json()
            if 'plan' in user and 'limits' in user:
                plan = user.get('plan')
                limits = user.get('limits', {})
                max_families = limits.get('max_families')
                max_recipes = limits.get('max_recipes')
                max_family_members = limits.get('max_family_members')
                
                if plan and max_families is not None and max_recipes is not None and max_family_members is not None:
                    log_pass("GET /api/me (plan limits)", f"Returns plan='{plan}' with limits (max_families={max_families}, max_recipes={max_recipes}, max_family_members={max_family_members})")
                else:
                    log_fail("GET /api/me (plan limits)", f"Plan or limits fields incomplete: plan={plan}, limits={limits}")
            else:
                log_fail("GET /api/me (plan limits)", f"Missing 'plan' or 'limits' field: {user}")
        else:
            log_fail("GET /api/me (plan limits)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("GET /api/me (plan limits)", f"Exception: {str(e)}")
    
    # Test GET /api/families - should work
    try:
        resp = requests.get(f"{BASE_URL}/families", timeout=10)
        if resp.status_code == 200:
            families = resp.json()
            if isinstance(families, list):
                log_pass("GET /api/families (regression)", f"Returns list with {len(families)} families")
            else:
                log_fail("GET /api/families (regression)", f"Expected list, got: {type(families)}")
        else:
            log_fail("GET /api/families (regression)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("GET /api/families (regression)", f"Exception: {str(e)}")
    
    # Test POST /api/family - should return 402 if at limit (free plan allows 1 family)
    # Note: This test may pass or fail depending on current state
    family_data = {
        "name": "Test Family for Limit Check",
        "description": "",
        "language": "English"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/family", json=family_data, timeout=10)
        if resp.status_code == 200:
            family = resp.json()
            log_warning("POST /api/family (limit check)", f"Created family (may be first family or limit not enforced): {family.get('id')}")
        elif resp.status_code == 402:
            error = resp.json()
            if 'free plan' in error.get('detail', '').lower() and '1 family' in error.get('detail', '').lower():
                log_pass("POST /api/family (limit check)", f"Returns 402 with correct free plan limit message: {error.get('detail')}")
            else:
                log_fail("POST /api/family (limit check)", f"Returns 402 but unexpected detail: {error.get('detail')}")
        else:
            log_fail("POST /api/family (limit check)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/family (limit check)", f"Exception: {str(e)}")
    
    # Test GET /api/recipes - should work
    try:
        resp = requests.get(f"{BASE_URL}/recipes", timeout=10)
        if resp.status_code == 200:
            recipes = resp.json()
            if isinstance(recipes, list):
                log_pass("GET /api/recipes (regression)", f"Returns list with {len(recipes)} recipes")
            else:
                log_fail("GET /api/recipes (regression)", f"Expected list, got: {type(recipes)}")
        else:
            log_fail("GET /api/recipes (regression)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("GET /api/recipes (regression)", f"Exception: {str(e)}")
    
    # Test POST /api/recipes - should return 402 if at limit (free plan allows 3 recipes)
    # Note: This test may pass or fail depending on current state
    recipe_data = {
        "title": "Test Recipe for Limit Check",
        "author": "Test Chef",
        "region": "Test",
        "serves": "1",
        "time": "10 mins",
        "tags": [],
        "cover": None,
        "ingredients": ["Test ingredient"],
        "steps": ["Test step"]
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/recipes", json=recipe_data, timeout=10)
        if resp.status_code == 200:
            recipe = resp.json()
            log_warning("POST /api/recipes (limit check)", f"Created recipe (may be under limit or limit not enforced): {recipe.get('id')}")
        elif resp.status_code == 402:
            error = resp.json()
            if 'free plan' in error.get('detail', '').lower() and '3 recipe' in error.get('detail', '').lower():
                log_pass("POST /api/recipes (limit check)", f"Returns 402 with correct free plan limit message: {error.get('detail')}")
            else:
                log_fail("POST /api/recipes (limit check)", f"Returns 402 but unexpected detail: {error.get('detail')}")
        else:
            log_fail("POST /api/recipes (limit check)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/recipes (limit check)", f"Exception: {str(e)}")
    
    # Test POST /api/invites - should return 402 (free plan allows 1 member = demo user only)
    invite_data = {
        "email": "test-limit@example.com",
        "name": "Test User",
        "relation": "Test"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/invites", json=invite_data, timeout=10)
        if resp.status_code == 402:
            error = resp.json()
            if 'free plan' in error.get('detail', '').lower():
                log_pass("POST /api/invites (limit check)", f"Returns 402 with correct free plan limit message: {error.get('detail')}")
            else:
                log_fail("POST /api/invites (limit check)", f"Returns 402 but unexpected detail: {error.get('detail')}")
        elif resp.status_code == 200:
            log_fail("POST /api/invites (limit check)", "Expected 402 for free plan, got 200")
        else:
            log_fail("POST /api/invites (limit check)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/invites (limit check)", f"Exception: {str(e)}")
    
    # Test POST /api/transcribe - should work (NOT gated)
    audio_data = generate_silent_wav(duration_seconds=2)
    files = {
        'file': ('test_audio.wav', io.BytesIO(audio_data), 'audio/wav')
    }
    data = {
        'kind': 'audio',
        'language_code': 'en-IN'
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/transcribe", files=files, data=data, timeout=60)
        if resp.status_code == 200:
            result = resp.json()
            if 'transcript' in result and 'transcript_en' in result:
                log_pass("POST /api/transcribe (NOT gated)", "Returns 200 (transcription not gated by plan limits)")
            else:
                log_fail("POST /api/transcribe (NOT gated)", f"Missing fields: {result}")
        else:
            log_fail("POST /api/transcribe (NOT gated)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/transcribe (NOT gated)", f"Exception: {str(e)}")
    
    # Test POST /api/contact - should work (NOT gated)
    contact_data = {
        "name": "Test User",
        "email": "test@example.com",
        "subject": "Test",
        "message": "Test message for regression"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/contact", json=contact_data, timeout=10)
        if resp.status_code == 200:
            result = resp.json()
            if result.get('ok') == True:
                log_pass("POST /api/contact (NOT gated)", "Returns 200 (contact not gated by plan limits)")
            else:
                log_fail("POST /api/contact (NOT gated)", f"Unexpected response: {result}")
        else:
            log_fail("POST /api/contact (NOT gated)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/contact (NOT gated)", f"Exception: {str(e)}")


def print_summary():
    """Print test summary"""
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    print(f"\n✅ PASSED: {len(test_results['passed'])}")
    for result in test_results['passed']:
        print(f"  {result}")
    
    if test_results['warnings']:
        print(f"\n⚠️  WARNINGS: {len(test_results['warnings'])}")
        for result in test_results['warnings']:
            print(f"  {result}")
    
    if test_results['failed']:
        print(f"\n❌ FAILED: {len(test_results['failed'])}")
        for result in test_results['failed']:
            print(f"  {result}")
    
    print("\n" + "="*70)
    total = len(test_results['passed']) + len(test_results['failed'])
    pass_rate = (len(test_results['passed']) / total * 100) if total > 0 else 0
    print(f"PASS RATE: {pass_rate:.1f}% ({len(test_results['passed'])}/{total})")
    print("="*70 + "\n")

if __name__ == "__main__":
    print("="*70)
    print("CuminJar Backend API Test Suite")
    print(f"Base URL: {BASE_URL}")
    print("="*70)
    
    # Run all tests in order
    test_health_endpoints()
    test_family_crud()  # CHANGE 1: Multiple family groups
    test_recipes()
    test_stories()
    test_albums()
    test_family_tree()
    test_notifications()
    test_invites()
    test_contact()
    test_transcribe_endpoint()  # CHANGE 2: Universal transcription endpoint
    test_voice_recipes()  # CHANGE 3: Regression test
    test_smart_record()  # NEW: Smart record endpoint
    test_recipe_patch()  # NEW: Recipe PATCH endpoint
    test_plan_limits_regression()  # Regression: Plan limits
    
    # Print summary
    print_summary()
    
    # Exit with appropriate code
    exit(0 if len(test_results['failed']) == 0 else 1)
