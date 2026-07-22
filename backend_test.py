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
    """Test 2: Family group CRUD"""
    print("\n=== Testing Family CRUD ===")
    
    # GET family (may be null initially)
    try:
        resp = requests.get(f"{BASE_URL}/family", timeout=10)
        if resp.status_code == 200:
            family = resp.json()
            if family is None:
                log_pass("GET /api/family (before creation)", "Returns null as expected")
            else:
                log_pass("GET /api/family (existing)", f"Family: {family.get('name', 'N/A')}")
        else:
            log_fail("GET /api/family", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("GET /api/family", f"Exception: {str(e)}")
    
    # POST family (create) - CHANGE 1: Test with empty description
    family_data = {
        "name": "Test Rao Family",
        "description": "",  # CHANGE 1: Empty description (field removed from Dashboard)
        "language": "English",
        "coverPhoto": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/family", json=family_data, timeout=10)
        if resp.status_code == 200:
            created = resp.json()
            if 'id' in created and created.get('name') == family_data['name']:
                log_pass("POST /api/family (empty description)", f"Created family with id={created['id']}, description='{created.get('description', '')}'")
                family_id = created['id']
            else:
                log_fail("POST /api/family", f"Unexpected response: {created}")
                family_id = None
        else:
            log_fail("POST /api/family", f"Status {resp.status_code}: {resp.text}")
            family_id = None
    except Exception as e:
        log_fail("POST /api/family", f"Exception: {str(e)}")
        family_id = None
    
    # PUT family (update)
    if family_id:
        update_data = family_data.copy()
        update_data['description'] = "Updated description for testing"
        
        try:
            resp = requests.put(f"{BASE_URL}/family", json=update_data, timeout=10)
            if resp.status_code == 200:
                updated = resp.json()
                if updated.get('description') == update_data['description']:
                    log_pass("PUT /api/family", "Family updated successfully")
                else:
                    log_fail("PUT /api/family", f"Description not updated: {updated.get('description')}")
            else:
                log_fail("PUT /api/family", f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_fail("PUT /api/family", f"Exception: {str(e)}")
    
    # GET family again to verify persistence
    try:
        resp = requests.get(f"{BASE_URL}/family", timeout=10)
        if resp.status_code == 200:
            family = resp.json()
            if family and family.get('name') == family_data['name']:
                log_pass("GET /api/family (after creation)", f"Family persisted: {family['name']}")
            else:
                log_fail("GET /api/family (after creation)", f"Family not persisted correctly: {family}")
        else:
            log_fail("GET /api/family (after creation)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("GET /api/family (after creation)", f"Exception: {str(e)}")

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

def test_voice_recipes():
    """Test 10: Voice recipes with Sarvam STT + Gemini translation (CRITICAL)"""
    print("\n=== Testing Voice Recipes (CRITICAL - Sarvam + Gemini) ===")
    
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
                
                if error:
                    log_warning("POST /api/voice-recipes", f"Created with error: {error}")
                elif not transcript:
                    log_warning("POST /api/voice-recipes", f"Created with id={voice_id} but transcript is empty (expected for silent audio)")
                else:
                    log_pass("POST /api/voice-recipes", f"Created with id={voice_id}, transcript length={len(transcript)}, transcript_en length={len(transcript_en)}")
                
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
                log_fail("POST /api/voice-recipes", f"Missing fields: {missing}. Response: {created}")
        else:
            log_fail("POST /api/voice-recipes", f"Status {resp.status_code}: {resp.text}")
    except requests.exceptions.Timeout:
        log_fail("POST /api/voice-recipes", "Request timed out after 60 seconds")
    except Exception as e:
        log_fail("POST /api/voice-recipes", f"Exception: {str(e)}")

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
    test_family_crud()
    test_recipes()
    test_stories()
    test_albums()
    test_family_tree()
    test_notifications()
    test_invites()  # NEW
    test_contact()  # NEW
    test_voice_recipes()
    
    # Print summary
    print_summary()
    
    # Exit with appropriate code
    exit(0 if len(test_results['failed']) == 0 else 1)
