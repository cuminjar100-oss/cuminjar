"""Seed a test user + session for the iteration_5 flash bug test.
Usage:
    python /app/scripts/seed_flash_user.py seed  -> prints session_token + user JSON
    python /app/scripts/seed_flash_user.py clean -> removes all TEST_it5_* rows
"""
import os
import sys
import uuid
import json
import asyncio
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')
MONGO_URL = os.environ['MONGO_URL'].strip('"')
DB_NAME = os.environ['DB_NAME'].strip('"')

TEST_EMAIL = 'test_it5_flash@cuminjar.test'
TEST_NAME = 'Ananya Sharma'
TEST_PICTURE = 'https://api.dicebear.com/7.x/avataaars/svg?seed=ananya'


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    now = datetime.now(timezone.utc)

    user_id = f"user_test_it5_{uuid.uuid4().hex[:8]}"
    session_token = f"tok_test_it5_{uuid.uuid4().hex}"

    # Clean any prior copy
    await db.users.delete_many({'email': TEST_EMAIL})
    await db.user_sessions.delete_many({'user_id': {'$regex': '^user_test_it5_'}})

    await db.users.insert_one({
        'user_id': user_id,
        'email': TEST_EMAIL,
        'name': TEST_NAME,
        'picture': TEST_PICTURE,
        'created_at': now.isoformat(),
        'last_login_at': now.isoformat(),
    })
    await db.user_sessions.insert_one({
        'user_id': user_id,
        'session_token': session_token,
        'created_at': now.isoformat(),
        'expires_at': (now + timedelta(days=7)).isoformat(),
    })
    print(json.dumps({
        'user_id': user_id,
        'email': TEST_EMAIL,
        'name': TEST_NAME,
        'picture': TEST_PICTURE,
        'session_token': session_token,
    }))
    client.close()


async def clean():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    r1 = await db.users.delete_many({'email': {'$regex': '^test_it5_'}})
    r2 = await db.user_sessions.delete_many({'user_id': {'$regex': '^user_test_it5_'}})
    r3 = await db.user_sessions.delete_many({'session_token': {'$regex': '^tok_test_it5_'}})
    print(f"cleaned users={r1.deleted_count} sessions_by_uid={r2.deleted_count} sessions_by_tok={r3.deleted_count}")
    client.close()


if __name__ == '__main__':
    op = sys.argv[1] if len(sys.argv) > 1 else 'seed'
    if op == 'seed':
        asyncio.run(seed())
    elif op == 'clean':
        asyncio.run(clean())
    else:
        print('unknown op', op); sys.exit(1)
