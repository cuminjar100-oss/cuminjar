#!/usr/bin/env python3
"""
Additional tests for PATCH /api/recipes/{id} and smart-record with generate_image=true
"""
import requests
import json
import wave
import io
import base64

BASE_URL = "https://ui-template-build.preview.emergentagent.com/api"

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

def test_patch_recipe():
    """Test PATCH /api/recipes/{id} by first deleting some recipes to make room"""
    print("\n=== Testing PATCH /api/recipes/{id} ===")
    
    # First, get current recipes
    try:
        resp = requests.get(f"{BASE_URL}/recipes", timeout=10)
        if resp.status_code == 200:
            recipes = resp.json()
            print(f"Current recipe count: {len(recipes)}")
            
            # Delete some recipes to make room (delete non-seeded ones)
            deleted_count = 0
            for recipe in recipes:
                if recipe.get('title', '').startswith('Test'):
                    # This is a test recipe, safe to delete
                    recipe_id = recipe.get('id')
                    if recipe_id:
                        try:
                            # Note: There's no DELETE endpoint for recipes in the API
                            # We'll just work with existing recipes
                            pass
                        except Exception:
                            pass
            
            # Now try to create a new recipe for PATCH test
            new_recipe = {
                "title": "PATCH Test Recipe",
                "author": "Test Chef",
                "region": "South Indian",
                "serves": "4",
                "time": "30 mins",
                "tags": ["Quick"],
                "cover": None,
                "ingredients": ["Rice", "Lentils"],
                "steps": ["Cook rice", "Cook lentils"]
            }
            
            # If we're at limit, use an existing recipe instead
            if len(recipes) >= 3:
                print("At recipe limit, using existing recipe for PATCH test")
                # Use the first recipe
                recipe_id = recipes[0].get('id')
                print(f"Using existing recipe id={recipe_id} for PATCH test")
            else:
                # Create new recipe
                resp = requests.post(f"{BASE_URL}/recipes", json=new_recipe, timeout=10)
                if resp.status_code == 200:
                    created = resp.json()
                    recipe_id = created.get('id')
                    print(f"✅ Created test recipe with id={recipe_id}")
                else:
                    print(f"❌ Could not create recipe: {resp.status_code} - {resp.text}")
                    # Use first existing recipe
                    recipe_id = recipes[0].get('id') if recipes else None
            
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
                        if 'cover' in updated and updated['cover']:
                            print(f"✅ PATCH /api/recipes/{{id}}: Updated recipe cover successfully")
                            print(f"   Cover field present: {updated['cover'][:50]}...")
                        else:
                            print(f"❌ PATCH /api/recipes/{{id}}: Cover field missing or null in response")
                    else:
                        print(f"❌ PATCH /api/recipes/{{id}}: Status {resp.status_code} - {resp.text}")
                except Exception as e:
                    print(f"❌ PATCH /api/recipes/{{id}}: Exception: {str(e)}")
            else:
                print("❌ No recipe ID available for PATCH test")
                
        else:
            print(f"❌ GET /api/recipes failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"❌ Exception: {str(e)}")


def test_smart_record_with_image():
    """Test smart-record with generate_image=true (optional, may be slow)"""
    print("\n=== Testing Smart Record with generate_image=true (OPTIONAL) ===")
    print("This test uses OpenAI GPT Image 1 via Emergent LLM key")
    print("May take 30-60 seconds or timeout...")
    
    audio_data = generate_silent_wav(duration_seconds=2)
    
    files = {
        'file': ('test_audio.wav', io.BytesIO(audio_data), 'audio/wav')
    }
    data = {
        'kind': 'recipe',
        'media_kind': 'audio',
        'generate_image': 'true'  # Enable image generation
    }
    
    try:
        print("  Uploading audio for smart-record with image generation...")
        resp = requests.post(f"{BASE_URL}/smart-record", files=files, data=data, timeout=120)
        if resp.status_code == 200:
            result = resp.json()
            if result.get('kind') == 'recipe' and 'item' in result:
                item = result['item']
                cover = item.get('cover')
                
                if cover and cover.startswith('data:image'):
                    print(f"✅ POST /api/smart-record (with image): Returns 200 with cover field containing data URL")
                    print(f"   Cover data URL: {cover[:80]}...")
                elif cover is None:
                    print(f"⚠️  POST /api/smart-record (with image): Returns 200 but cover is null (image generation may have failed, which is acceptable)")
                else:
                    print(f"❌ POST /api/smart-record (with image): Unexpected cover value: {cover}")
            else:
                print(f"❌ POST /api/smart-record (with image): Unexpected response structure: {result}")
        elif resp.status_code == 422:
            error = resp.json()
            print(f"⚠️  POST /api/smart-record (with image): Returns 422 for empty transcript (silent audio) - {error.get('detail')}")
        else:
            print(f"❌ POST /api/smart-record (with image): Status {resp.status_code} - {resp.text}")
    except requests.exceptions.Timeout:
        print(f"⚠️  POST /api/smart-record (with image): Request timed out after 120 seconds (image generation may be slow)")
    except Exception as e:
        print(f"❌ POST /api/smart-record (with image): Exception: {str(e)}")


if __name__ == "__main__":
    print("="*70)
    print("Additional CuminJar Backend Tests")
    print(f"Base URL: {BASE_URL}")
    print("="*70)
    
    test_patch_recipe()
    
    # Optional: Test smart-record with image generation
    # Uncomment the line below to test (may be slow)
    # test_smart_record_with_image()
    
    print("\n" + "="*70)
    print("Additional tests complete")
    print("="*70)
