"""Direct test of _generate_recipe_image (Gemini Nano Banana) helper."""
import base64
import sys
import asyncio

sys.path.insert(0, '/app/backend')


def test_generate_recipe_image_returns_realistic_jpeg():
    from server import _generate_recipe_image

    async def run():
        return await _generate_recipe_image(
            recipe_title="Aloo Paratha",
            description="A wholesome Indian breakfast with mashed spiced potato stuffing.",
            tags=["breakfast", "north indian"],
            region="North Indian",
        )
    cover = asyncio.run(run())
    assert isinstance(cover, str) and cover.startswith('data:image/'), f"Unexpected: {cover[:80]}"
    assert not cover.startswith('data:image/svg'), (
        "Fell back to SVG emoji cover — Gemini image generation failed"
    )
    b64 = cover.split(',', 1)[1]
    raw = base64.b64decode(b64)
    assert len(raw) > 50_000, f"Cover too small: {len(raw)} bytes"
    print(f"OK — cover size {len(raw)/1024:.0f} KB, mime {cover.split(';')[0]}")
