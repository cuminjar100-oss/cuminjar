#!/usr/bin/env python3
"""
CuminJar Plan Limits Testing
Tests the "Family Free" plan limits enforcement
"""
import requests
import json
import wave
import io

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

def test_free_plan_family_limit():
    """Test 1: Free plan family limit - max 1 family group"""
    print("\n=== Test 1: Free Plan Family Limit (max 1 family group) ===")
    
    # Step 1: Clean up - GET /api/families and DELETE extras until 0
    print("  Step 1: Cleaning up existing families...")
    try:
        resp = requests.get(f"{BASE_URL}/families", timeout=10)
        if resp.status_code == 200:
            families = resp.json()
            print(f"    Found {len(families)} existing families")
            
            # Delete all existing families
            for family in families:
                family_id = family.get('id')
                if family_id:
                    del_resp = requests.delete(f"{BASE_URL}/family/{family_id}", timeout=10)
                    if del_resp.status_code == 200:
                        print(f"    Deleted family: {family.get('name')} (id={family_id})")
                    else:
                        print(f"    Failed to delete family {family_id}: {del_resp.status_code}")
            
            # Verify all deleted
            verify_resp = requests.get(f"{BASE_URL}/families", timeout=10)
            if verify_resp.status_code == 200:
                remaining = verify_resp.json()
                if len(remaining) == 0:
                    log_pass("Cleanup families", f"All families deleted. Starting with 0 families.")
                else:
                    log_warning("Cleanup families", f"Still have {len(remaining)} families after cleanup")
        else:
            log_fail("Cleanup families", f"GET /api/families failed: {resp.status_code}")
    except Exception as e:
        log_fail("Cleanup families", f"Exception: {str(e)}")
    
    # Step 2: POST /api/family with "First Family" -> should succeed (200 OK)
    print("  Step 2: Creating first family (should succeed)...")
    first_family_data = {
        "name": "First Family",
        "description": "",
        "language": "English"
    }
    
    first_family_id = None
    try:
        resp = requests.post(f"{BASE_URL}/family", json=first_family_data, timeout=10)
        if resp.status_code == 200:
            family = resp.json()
            first_family_id = family.get('id')
            log_pass("POST /api/family (1st family)", f"Created 'First Family' with id={first_family_id} - Status 200 OK")
        else:
            log_fail("POST /api/family (1st family)", f"Expected 200, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/family (1st family)", f"Exception: {str(e)}")
    
    # Step 3: POST /api/family again with "Second Family" -> should fail with 402
    print("  Step 3: Creating second family (should fail with 402)...")
    second_family_data = {
        "name": "Second Family",
        "description": "",
        "language": "Hindi"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/family", json=second_family_data, timeout=10)
        if resp.status_code == 402:
            error = resp.json()
            detail = error.get('detail', '')
            if 'free plan' in detail.lower() and '1 family group' in detail.lower() and 'upgrade to plus' in detail.lower():
                log_pass("POST /api/family (2nd family - LIMIT)", f"✅ LIMIT ENFORCED: Returns 402 with correct message: '{detail}'")
            else:
                log_fail("POST /api/family (2nd family - LIMIT)", f"Returns 402 but wrong message: '{detail}'")
        else:
            log_fail("POST /api/family (2nd family - LIMIT)", f"Expected 402, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/family (2nd family - LIMIT)", f"Exception: {str(e)}")
    
    # Step 4: DELETE first family, then POST again -> should succeed
    print("  Step 4: Delete first family, then create new family (should succeed)...")
    if first_family_id:
        try:
            del_resp = requests.delete(f"{BASE_URL}/family/{first_family_id}", timeout=10)
            if del_resp.status_code == 200:
                print(f"    Deleted first family (id={first_family_id})")
                
                # Now try to create a new family
                new_family_data = {
                    "name": "New Family After Delete",
                    "description": "",
                    "language": "English"
                }
                
                create_resp = requests.post(f"{BASE_URL}/family", json=new_family_data, timeout=10)
                if create_resp.status_code == 200:
                    new_family = create_resp.json()
                    log_pass("POST /api/family (after delete)", f"✅ LIMIT RESET: Created new family after delete with id={new_family.get('id')}")
                else:
                    log_fail("POST /api/family (after delete)", f"Expected 200, got {create_resp.status_code}: {create_resp.text}")
            else:
                log_fail("DELETE /api/family (cleanup)", f"Failed to delete: {del_resp.status_code}")
        except Exception as e:
            log_fail("POST /api/family (after delete)", f"Exception: {str(e)}")

def test_free_plan_recipe_limit():
    """Test 2: Free plan recipe limit - max 3 recipes"""
    print("\n=== Test 2: Free Plan Recipe Limit (max 3 recipes) ===")
    
    # Step 1: Check current recipe count
    print("  Step 1: Checking current recipe count...")
    try:
        resp = requests.get(f"{BASE_URL}/recipes", timeout=10)
        if resp.status_code == 200:
            recipes = resp.json()
            current_count = len(recipes)
            print(f"    Current recipe count: {current_count}")
            
            if current_count >= 3:
                log_warning("Recipe baseline", f"Already have {current_count} recipes (>= 3 from seeding). This is expected behavior. Will test if POST returns 402.")
            else:
                log_pass("Recipe baseline", f"Current count: {current_count} recipes (< 3)")
        else:
            log_fail("GET /api/recipes", f"Status {resp.status_code}: {resp.text}")
            current_count = 0
    except Exception as e:
        log_fail("GET /api/recipes", f"Exception: {str(e)}")
        current_count = 0
    
    # Step 2: Try to POST a new recipe
    print("  Step 2: Attempting to create new recipe...")
    new_recipe = {
        "title": "Test Recipe for Limit",
        "author": "Test Chef",
        "region": "Test Region",
        "serves": "4",
        "time": "30 mins",
        "tags": ["Test"],
        "cover": None,
        "ingredients": ["Test ingredient"],
        "steps": ["Test step"]
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/recipes", json=new_recipe, timeout=10)
        if current_count < 3:
            # Should succeed
            if resp.status_code == 200:
                created = resp.json()
                log_pass("POST /api/recipes (under limit)", f"Created recipe with id={created.get('id')} (count was {current_count} < 3)")
            else:
                log_fail("POST /api/recipes (under limit)", f"Expected 200, got {resp.status_code}: {resp.text}")
        else:
            # Should fail with 402
            if resp.status_code == 402:
                error = resp.json()
                detail = error.get('detail', '')
                if 'free plan' in detail.lower() and '3 recipes' in detail.lower() and 'upgrade to plus' in detail.lower():
                    log_pass("POST /api/recipes (at limit)", f"✅ LIMIT ENFORCED: Returns 402 with correct message: '{detail}' (current count: {current_count})")
                else:
                    log_fail("POST /api/recipes (at limit)", f"Returns 402 but wrong message: '{detail}'")
            else:
                log_fail("POST /api/recipes (at limit)", f"Expected 402 (count={current_count} >= 3), got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/recipes", f"Exception: {str(e)}")

def test_free_plan_invite_limit():
    """Test 3: Free plan invite limit - max 1 family member (blocks all invites)"""
    print("\n=== Test 3: Free Plan Invite Limit (max 1 family member - blocks invites) ===")
    
    # Step 1: Clean up - DELETE all existing invites
    print("  Step 1: Cleaning up existing invites...")
    try:
        resp = requests.get(f"{BASE_URL}/invites", timeout=10)
        if resp.status_code == 200:
            invites = resp.json()
            print(f"    Found {len(invites)} existing invites")
            
            # Delete all existing invites
            for invite in invites:
                invite_id = invite.get('id')
                if invite_id:
                    del_resp = requests.delete(f"{BASE_URL}/invites/{invite_id}", timeout=10)
                    if del_resp.status_code == 200:
                        print(f"    Deleted invite: {invite.get('email')} (id={invite_id})")
                    else:
                        print(f"    Failed to delete invite {invite_id}: {del_resp.status_code}")
            
            # Verify all deleted
            verify_resp = requests.get(f"{BASE_URL}/invites", timeout=10)
            if verify_resp.status_code == 200:
                remaining = verify_resp.json()
                if len(remaining) == 0:
                    log_pass("Cleanup invites", f"All invites deleted. Starting with 0 invites.")
                else:
                    log_warning("Cleanup invites", f"Still have {len(remaining)} invites after cleanup")
        else:
            log_fail("Cleanup invites", f"GET /api/invites failed: {resp.status_code}")
    except Exception as e:
        log_fail("Cleanup invites", f"Exception: {str(e)}")
    
    # Step 2: POST /api/invites -> should fail with 402 immediately
    # (max_family_members = 1, which is the demo user, so no invites allowed)
    print("  Step 2: Attempting to create invite (should fail with 402)...")
    invite_data = {
        "email": "test@example.com",
        "name": "Test User",
        "relation": "Cousin"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/invites", json=invite_data, timeout=10)
        if resp.status_code == 402:
            error = resp.json()
            detail = error.get('detail', '')
            if 'free plan' in detail.lower() and 'family member' in detail.lower() and 'upgrade to plus' in detail.lower():
                log_pass("POST /api/invites (LIMIT)", f"✅ LIMIT ENFORCED: Returns 402 with correct message: '{detail}'")
            else:
                log_fail("POST /api/invites (LIMIT)", f"Returns 402 but wrong message: '{detail}'")
        else:
            log_fail("POST /api/invites (LIMIT)", f"Expected 402, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/invites (LIMIT)", f"Exception: {str(e)}")

def test_regression_endpoints():
    """Test 4: Regression - ensure existing endpoints still work"""
    print("\n=== Test 4: Regression - Existing Endpoints ===")
    
    # Test GET /api/
    try:
        resp = requests.get(f"{BASE_URL}/", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if 'message' in data and 'user' in data:
                log_pass("GET /api/ (regression)", f"Returns {data}")
            else:
                log_fail("GET /api/ (regression)", f"Missing fields: {data}")
        else:
            log_fail("GET /api/ (regression)", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("GET /api/ (regression)", f"Exception: {str(e)}")
    
    # Test GET /api/me (should return plan='free' and limits object)
    try:
        resp = requests.get(f"{BASE_URL}/me", timeout=10)
        if resp.status_code == 200:
            user = resp.json()
            plan = user.get('plan')
            limits = user.get('limits')
            
            if plan == 'free' and limits:
                max_families = limits.get('max_families')
                max_recipes = limits.get('max_recipes')
                max_members = limits.get('max_family_members')
                
                if max_families == 1 and max_recipes == 3 and max_members == 1:
                    log_pass("GET /api/me (regression)", f"Returns plan='free' with correct limits: max_families=1, max_recipes=3, max_family_members=1")
                else:
                    log_fail("GET /api/me (regression)", f"Limits incorrect: {limits}")
            else:
                log_fail("GET /api/me (regression)", f"Missing plan or limits: plan={plan}, limits={limits}")
        else:
            log_fail("GET /api/me (regression)", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("GET /api/me (regression)", f"Exception: {str(e)}")
    
    # Test GET /api/family (backward compat)
    try:
        resp = requests.get(f"{BASE_URL}/family", timeout=10)
        if resp.status_code == 200:
            family = resp.json()
            log_pass("GET /api/family (regression)", f"Returns most recent family (backward compat)")
        else:
            log_fail("GET /api/family (regression)", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("GET /api/family (regression)", f"Exception: {str(e)}")
    
    # Test GET /api/families
    try:
        resp = requests.get(f"{BASE_URL}/families", timeout=10)
        if resp.status_code == 200:
            families = resp.json()
            log_pass("GET /api/families (regression)", f"Returns list with {len(families)} families")
        else:
            log_fail("GET /api/families (regression)", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("GET /api/families (regression)", f"Exception: {str(e)}")
    
    # Test PUT /api/family/{id} (should NOT be gated by plan limit)
    print("  Testing PUT /api/family/{id} (should NOT be gated)...")
    try:
        # First get a family to update
        get_resp = requests.get(f"{BASE_URL}/families", timeout=10)
        if get_resp.status_code == 200:
            families = get_resp.json()
            if len(families) > 0:
                family_id = families[0].get('id')
                update_data = {
                    "name": "Updated Family Name",
                    "description": "",
                    "language": "English"
                }
                
                put_resp = requests.put(f"{BASE_URL}/family/{family_id}", json=update_data, timeout=10)
                if put_resp.status_code == 200:
                    log_pass("PUT /api/family/{id} (regression)", f"Update works (NOT gated by plan limit)")
                else:
                    log_fail("PUT /api/family/{id} (regression)", f"Status {put_resp.status_code}: {put_resp.text}")
            else:
                log_warning("PUT /api/family/{id} (regression)", "No families to update")
        else:
            log_fail("PUT /api/family/{id} (regression)", f"GET families failed: {get_resp.status_code}")
    except Exception as e:
        log_fail("PUT /api/family/{id} (regression)", f"Exception: {str(e)}")
    
    # Test DELETE /api/family/{id}
    try:
        # Create a family to delete
        create_resp = requests.post(f"{BASE_URL}/family", json={"name": "Family to Delete", "description": "", "language": "English"}, timeout=10)
        if create_resp.status_code == 200:
            family = create_resp.json()
            family_id = family.get('id')
            
            # Now delete it
            del_resp = requests.delete(f"{BASE_URL}/family/{family_id}", timeout=10)
            if del_resp.status_code == 200:
                log_pass("DELETE /api/family/{id} (regression)", f"Delete works")
            else:
                log_fail("DELETE /api/family/{id} (regression)", f"Status {del_resp.status_code}")
        elif create_resp.status_code == 402:
            # Expected if we're at limit - just test delete with existing family
            get_resp = requests.get(f"{BASE_URL}/families", timeout=10)
            if get_resp.status_code == 200:
                families = get_resp.json()
                if len(families) > 0:
                    family_id = families[0].get('id')
                    del_resp = requests.delete(f"{BASE_URL}/family/{family_id}", timeout=10)
                    if del_resp.status_code == 200:
                        log_pass("DELETE /api/family/{id} (regression)", f"Delete works")
                    else:
                        log_fail("DELETE /api/family/{id} (regression)", f"Status {del_resp.status_code}")
                else:
                    log_warning("DELETE /api/family/{id} (regression)", "No families to delete")
    except Exception as e:
        log_fail("DELETE /api/family/{id} (regression)", f"Exception: {str(e)}")
    
    # Test POST /api/transcribe with audio (should NOT be gated)
    print("  Testing POST /api/transcribe (should NOT be gated)...")
    try:
        audio_data = generate_silent_wav(duration_seconds=2)
        files = {
            'file': ('test_audio.wav', io.BytesIO(audio_data), 'audio/wav')
        }
        data = {
            'kind': 'audio',
            'language_code': 'en-IN'
        }
        
        resp = requests.post(f"{BASE_URL}/transcribe", files=files, data=data, timeout=60)
        if resp.status_code == 200:
            result = resp.json()
            if 'transcript' in result and 'transcript_en' in result:
                log_pass("POST /api/transcribe (regression)", f"Transcription works (NOT gated by plan limit)")
            else:
                log_fail("POST /api/transcribe (regression)", f"Missing fields: {result}")
        else:
            log_fail("POST /api/transcribe (regression)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /api/transcribe (regression)", f"Exception: {str(e)}")
    
    # Test POST /api/contact (should NOT be gated)
    try:
        contact_data = {
            "name": "Test User",
            "email": "test@example.com",
            "subject": "Test",
            "message": "Test message"
        }
        
        resp = requests.post(f"{BASE_URL}/contact", json=contact_data, timeout=10)
        if resp.status_code == 200:
            result = resp.json()
            if result.get('ok') == True:
                log_pass("POST /api/contact (regression)", f"Contact form works (NOT gated by plan limit)")
            else:
                log_fail("POST /api/contact (regression)", f"Unexpected response: {result}")
        else:
            log_fail("POST /api/contact (regression)", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("POST /api/contact (regression)", f"Exception: {str(e)}")

def print_summary():
    """Print test summary"""
    print("\n" + "="*70)
    print("PLAN LIMITS TEST SUMMARY")
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
    print("CuminJar Plan Limits Test Suite")
    print(f"Base URL: {BASE_URL}")
    print("Testing 'Family Free' plan limits enforcement")
    print("="*70)
    
    # Run all tests in order
    test_free_plan_family_limit()
    test_free_plan_recipe_limit()
    test_free_plan_invite_limit()
    test_regression_endpoints()
    
    # Print summary
    print_summary()
    
    # Exit with appropriate code
    exit(0 if len(test_results['failed']) == 0 else 1)
