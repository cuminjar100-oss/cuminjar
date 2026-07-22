from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import asyncio
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SARVAM_API_KEY = os.environ.get('SARVAM_API_KEY')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Demo user (no auth)
DEMO_USER_ID = 'demo-user'
DEMO_USER = {
    'id': DEMO_USER_ID,
    'name': 'Meera R.',
    'firstName': 'Meera',
    'email': 'meera.rao@family.com',
    'avatar': 'https://images.unsplash.com/photo-1489278353717-f64c6ee8a4d2?w=100&auto=format&fit=crop&q=60'
}

app = FastAPI()
api = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


# --------------------- Models ---------------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


class FamilyIn(BaseModel):
    name: str
    description: str = ''
    language: str = 'English'
    coverPhoto: Optional[str] = None  # base64 data URL


class RecipeIn(BaseModel):
    title: str
    author: str
    region: str = ''
    serves: str = ''
    time: str = ''
    tags: List[str] = []
    cover: Optional[str] = None
    ingredients: List[str] = []
    steps: List[str] = []


class StoryIn(BaseModel):
    title: str
    author: str
    excerpt: str
    mins: int = 4


class AlbumIn(BaseModel):
    title: str
    cover: Optional[str] = None


class FamilyMemberIn(BaseModel):
    name: str
    role: str
    level: int = 0  # 0=grandparents, 1=parents, 2=you, 3=children
    avatar: Optional[str] = None


# --------------------- Helpers ---------------------
def _strip_id(doc):
    if not doc:
        return doc
    doc.pop('_id', None)
    return doc


async def _seed_if_empty():
    """Seed demo content once so UI is not empty on first load."""
    if await db.recipes.count_documents({'user_id': DEMO_USER_ID}) == 0:
        seed_recipes = [
            {'title': "Paati's Sambar", 'author': 'Lakshmi Paati', 'region': 'South Indian', 'serves': '4-5', 'time': '45 mins', 'tags': ['Lentils', 'Traditional'], 'cover': 'https://images.unsplash.com/photo-1600728257188-480e132c1610?w=800&auto=format&fit=crop&q=60'},
            {'title': "Nani's Rajma Chawal", 'author': 'Sunita Nani', 'region': 'North Indian', 'serves': '4', 'time': '60 mins', 'tags': ['Rajma', 'Comfort'], 'cover': 'https://images.pexels.com/photos/34941860/pexels-photo-34941860.jpeg?w=800&auto=format&fit=crop&q=60'},
            {'title': "Amma's Fish Curry", 'author': 'Rukmini Amma', 'region': 'Coastal', 'serves': '3', 'time': '30 mins', 'tags': ['Seafood', 'Spicy'], 'cover': 'https://images.pexels.com/photos/35295143/pexels-photo-35295143.jpeg?w=800&auto=format&fit=crop&q=60'},
            {'title': "Dadi's Aloo Paratha", 'author': 'Kamla Dadi', 'region': 'Punjabi', 'serves': '4', 'time': '40 mins', 'tags': ['Breakfast'], 'cover': 'https://images.unsplash.com/photo-1533128361669-69c065857a13?w=800&auto=format&fit=crop&q=60'},
        ]
        for r in seed_recipes:
            r.update({'id': str(uuid.uuid4()), 'user_id': DEMO_USER_ID, 'liked': False, 'created_at': now_iso(), 'ingredients': [], 'steps': []})
        await db.recipes.insert_many(seed_recipes)

    if await db.stories.count_documents({'user_id': DEMO_USER_ID}) == 0:
        seed_stories = [
            {'title': 'The Monsoon Kitchen', 'author': 'Lakshmi Paati', 'excerpt': 'The rains would come every June, and our kitchen would fill with the scent of pakoras...', 'mins': 6},
            {'title': 'Grandma\u2019s Diwali', 'author': 'Kamla Dadi', 'excerpt': 'She would begin preparations two weeks before, cleaning the copper pots by hand...', 'mins': 4},
            {'title': 'The Family Almirah', 'author': 'Rukmini Amma', 'excerpt': 'Inside our old wooden almirah lived every festival we ever cooked for...', 'mins': 5},
        ]
        for s in seed_stories:
            s.update({'id': str(uuid.uuid4()), 'user_id': DEMO_USER_ID, 'created_at': now_iso()})
        await db.stories.insert_many(seed_stories)

    if await db.albums.count_documents({'user_id': DEMO_USER_ID}) == 0:
        seed_albums = [
            {'title': 'Diwali 2024', 'count': 42, 'cover': 'https://images.unsplash.com/photo-1533128361669-69c065857a13?w=800&auto=format&fit=crop&q=60'},
            {'title': "Paati's Kitchen", 'count': 28, 'cover': 'https://images.unsplash.com/photo-1600728257188-480e132c1610?w=800&auto=format&fit=crop&q=60'},
            {'title': 'Handwritten Recipes', 'count': 15, 'cover': 'https://images.pexels.com/photos/34941860/pexels-photo-34941860.jpeg?w=800&auto=format&fit=crop&q=60'},
            {'title': 'Family Portraits', 'count': 61, 'cover': 'https://images.pexels.com/photos/35295143/pexels-photo-35295143.jpeg?w=800&auto=format&fit=crop&q=60'},
        ]
        for a in seed_albums:
            a.update({'id': str(uuid.uuid4()), 'user_id': DEMO_USER_ID, 'created_at': now_iso()})
        await db.albums.insert_many(seed_albums)

    if await db.family_tree.count_documents({'user_id': DEMO_USER_ID}) == 0:
        avatars = [
            'https://images.pexels.com/photos/32995728/pexels-photo-32995728.jpeg?w=100&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1662850886700-4ec19bd30d11?w=100&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1489278353717-f64c6ee8a4d2?w=100&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1533128361669-69c065857a13?w=100&auto=format&fit=crop&q=60',
        ]
        seed_tree = [
            {'name': 'Ramanathan Thatha', 'role': 'Grandfather', 'level': 0, 'avatar': avatars[0]},
            {'name': 'Lakshmi Paati', 'role': 'Grandmother', 'level': 0, 'avatar': avatars[2]},
            {'name': 'Suresh Rao', 'role': 'Father', 'level': 1, 'avatar': avatars[1]},
            {'name': 'Kavita Rao', 'role': 'Mother', 'level': 1, 'avatar': avatars[3]},
            {'name': 'Meera R.', 'role': 'You', 'level': 2, 'avatar': avatars[2]},
            {'name': 'Arjun R.', 'role': 'Brother', 'level': 2, 'avatar': avatars[1]},
        ]
        for m in seed_tree:
            m.update({'id': str(uuid.uuid4()), 'user_id': DEMO_USER_ID, 'created_at': now_iso()})
        await db.family_tree.insert_many(seed_tree)

    if await db.notifications.count_documents({'user_id': DEMO_USER_ID}) == 0:
        seed_notifs = [
            {'icon': 'Mic', 'title': 'Lakshmi Paati added a new voice recipe', 'desc': '\u201cPaati\u2019s Sambar\u201d is ready to listen.', 'when': '2h ago', 'read': False},
            {'icon': 'Sparkles', 'title': 'AI transcription complete', 'desc': 'Your recording \u201cKitchen Wisdom\u201d has been transcribed.', 'when': '5h ago', 'read': False},
            {'icon': 'Users', 'title': 'Arjun R. joined your family group', 'desc': 'Welcome him with a recipe or a story.', 'when': 'Yesterday', 'read': False},
            {'icon': 'Heart', 'title': 'Priya S. loved your recipe', 'desc': '\u201cRajma Chawal\u201d received a heart.', 'when': '2 days ago', 'read': True},
        ]
        for n in seed_notifs:
            n.update({'id': str(uuid.uuid4()), 'user_id': DEMO_USER_ID, 'created_at': now_iso()})
        await db.notifications.insert_many(seed_notifs)


# --------------------- Health & User ---------------------
@api.get("/")
async def root():
    return {"message": "CuminJar API", "user": DEMO_USER['name']}


@api.get("/me")
async def me():
    await _seed_if_empty()
    return DEMO_USER


# --------------------- Family ---------------------
@api.get("/family")
async def get_family():
    doc = await db.families.find_one({'user_id': DEMO_USER_ID})
    return _strip_id(doc)


@api.post("/family")
async def create_family(payload: FamilyIn):
    existing = await db.families.find_one({'user_id': DEMO_USER_ID})
    data = payload.dict()
    data.update({'user_id': DEMO_USER_ID, 'updated_at': now_iso()})
    if existing:
        await db.families.update_one({'user_id': DEMO_USER_ID}, {'$set': data})
        doc = await db.families.find_one({'user_id': DEMO_USER_ID})
    else:
        data.update({'id': str(uuid.uuid4()), 'created_at': now_iso()})
        await db.families.insert_one(data)
        doc = data
    return _strip_id(doc)


@api.put("/family")
async def update_family(payload: FamilyIn):
    return await create_family(payload)


# --------------------- Recipes ---------------------
@api.get("/recipes")
async def list_recipes():
    await _seed_if_empty()
    items = await db.recipes.find({'user_id': DEMO_USER_ID}).sort('created_at', -1).to_list(500)
    return [_strip_id(i) for i in items]


@api.post("/recipes")
async def create_recipe(payload: RecipeIn):
    doc = payload.dict()
    doc.update({'id': str(uuid.uuid4()), 'user_id': DEMO_USER_ID, 'liked': False, 'created_at': now_iso()})
    await db.recipes.insert_one(doc)
    return _strip_id(doc)


@api.post("/recipes/{recipe_id}/like")
async def like_recipe(recipe_id: str):
    doc = await db.recipes.find_one({'id': recipe_id, 'user_id': DEMO_USER_ID})
    if not doc:
        raise HTTPException(404, 'Recipe not found')
    new_liked = not doc.get('liked', False)
    await db.recipes.update_one({'id': recipe_id}, {'$set': {'liked': new_liked}})
    doc['liked'] = new_liked
    return _strip_id(doc)


# --------------------- Stories ---------------------
@api.get("/stories")
async def list_stories():
    await _seed_if_empty()
    items = await db.stories.find({'user_id': DEMO_USER_ID}).sort('created_at', -1).to_list(500)
    return [_strip_id(i) for i in items]


@api.post("/stories")
async def create_story(payload: StoryIn):
    doc = payload.dict()
    doc.update({'id': str(uuid.uuid4()), 'user_id': DEMO_USER_ID, 'created_at': now_iso()})
    await db.stories.insert_one(doc)
    return _strip_id(doc)


# --------------------- Albums ---------------------
@api.get("/albums")
async def list_albums():
    await _seed_if_empty()
    items = await db.albums.find({'user_id': DEMO_USER_ID}).sort('created_at', -1).to_list(500)
    return [_strip_id(i) for i in items]


@api.post("/albums")
async def create_album(payload: AlbumIn):
    doc = payload.dict()
    doc.update({'id': str(uuid.uuid4()), 'user_id': DEMO_USER_ID, 'count': 0, 'created_at': now_iso()})
    await db.albums.insert_one(doc)
    return _strip_id(doc)


# --------------------- Family Tree ---------------------
@api.get("/family-tree")
async def get_family_tree():
    await _seed_if_empty()
    items = await db.family_tree.find({'user_id': DEMO_USER_ID}).to_list(500)
    return [_strip_id(i) for i in items]


@api.post("/family-tree")
async def add_family_member(payload: FamilyMemberIn):
    doc = payload.dict()
    doc.update({'id': str(uuid.uuid4()), 'user_id': DEMO_USER_ID, 'created_at': now_iso()})
    await db.family_tree.insert_one(doc)
    return _strip_id(doc)


# --------------------- Notifications ---------------------
@api.get("/notifications")
async def list_notifications():
    await _seed_if_empty()
    items = await db.notifications.find({'user_id': DEMO_USER_ID}).sort('created_at', -1).to_list(200)
    unread = await db.notifications.count_documents({'user_id': DEMO_USER_ID, 'read': False})
    return {'items': [_strip_id(i) for i in items], 'unread': unread}


@api.post("/notifications/mark-read")
async def mark_read():
    await db.notifications.update_many({'user_id': DEMO_USER_ID}, {'$set': {'read': True}})
    return {'ok': True}


# --------------------- Voice Recipes (Sarvam STT + Gemini translate) ---------------------
async def _sarvam_transcribe(audio_bytes: bytes, language_code: str, filename: str) -> dict:
    """Run Sarvam STT in a thread (SDK is sync)."""
    def _run():
        from sarvamai import SarvamAI
        client = SarvamAI(api_subscription_key=SARVAM_API_KEY)
        buf = io.BytesIO(audio_bytes)
        buf.name = filename or 'audio.webm'
        try:
            resp = client.speech_to_text.transcribe(
                file=buf,
                model='saarika:v2.5',
                language_code=language_code if language_code and language_code != 'auto' else 'unknown',
            )
            transcript = getattr(resp, 'transcript', None) or getattr(resp, 'text', None) or ''
            detected = getattr(resp, 'language_code', None) or language_code
            return {'transcript': transcript, 'language': detected}
        except Exception as e:
            logger.exception('Sarvam STT failed')
            return {'transcript': '', 'language': language_code, 'error': str(e)}
    return await asyncio.to_thread(_run)


async def _translate_to_english(text: str, source_lang: str) -> str:
    if not text.strip():
        return ''
    if source_lang and source_lang.startswith('en'):
        return text
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f'translate-{uuid.uuid4()}',
            system_message='You are a professional translator. Translate the given text to natural, fluent English. Preserve the meaning, tone and any recipe/cooking instructions. Return ONLY the translated English text, no preface.',
        ).with_model('gemini', 'gemini-2.5-flash')
        parts = []
        async for ev in chat.stream_message(UserMessage(text=text)):
            content = getattr(ev, 'content', None)
            if content:
                parts.append(content)
        translated = ''.join(parts).strip()
        return translated or text
    except Exception:
        logger.exception('Translation failed')
        return text


@api.get("/voice-recipes")
async def list_voice_recipes():
    items = await db.voice_recipes.find({'user_id': DEMO_USER_ID}).sort('created_at', -1).to_list(200)
    return [_strip_id(i) for i in items]


@api.post("/voice-recipes")
async def create_voice_recipe(
    audio: UploadFile = File(...),
    title: str = Form(...),
    author: str = Form('You'),
    language_code: str = Form('unknown'),
    duration: float = Form(0.0),
):
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(400, 'Empty audio file')

    stt = await _sarvam_transcribe(audio_bytes, language_code, audio.filename or 'audio.webm')
    transcript = stt.get('transcript', '') or ''
    detected_lang = stt.get('language', language_code) or language_code
    error = stt.get('error')

    transcript_en = ''
    if transcript:
        if detected_lang and str(detected_lang).lower().startswith('en'):
            transcript_en = transcript
        else:
            transcript_en = await _translate_to_english(transcript, str(detected_lang))

    dur_str = f"{int(duration)//60}:{int(duration)%60:02d}"

    doc = {
        'id': str(uuid.uuid4()),
        'user_id': DEMO_USER_ID,
        'title': title,
        'author': author,
        'language': detected_lang,
        'duration': dur_str,
        'transcript': transcript,
        'transcript_en': transcript_en,
        'error': error,
        'created_at': now_iso(),
    }
    await db.voice_recipes.insert_one(doc)

    # Create a notification
    await db.notifications.insert_one({
        'id': str(uuid.uuid4()),
        'user_id': DEMO_USER_ID,
        'icon': 'Sparkles',
        'title': 'AI transcription complete',
        'desc': f'Your recording \u201c{title}\u201d has been transcribed.',
        'when': 'just now',
        'read': False,
        'created_at': now_iso(),
    })
    return _strip_id(doc)


@api.delete("/voice-recipes/{vid}")
async def delete_voice_recipe(vid: str):
    res = await db.voice_recipes.delete_one({'id': vid, 'user_id': DEMO_USER_ID})
    if res.deleted_count == 0:
        raise HTTPException(404, 'Not found')
    return {'ok': True}


# --------------------- App wiring ---------------------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
