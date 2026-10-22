"""Live end-to-end verification of the memory ingestion pipeline."""

import uuid
from backend.app.models.database import get_supabase_admin_client
from backend.app.services.memory_service import memory_service
from backend.app.services.vector_service import vector_service
from backend.app.services.embedding_service import embedding_service


def test_live_pipeline():
    db = get_supabase_admin_client()

    # 1. Setup a test user and avatar
    test_user_id = str(uuid.uuid4())
    test_avatar_id = str(uuid.uuid4())

    print(f"Creating test auth user...")
    auth_user = db.auth.admin.create_user({
        "email": f"test_{uuid.uuid4().hex[:8]}@eternia.ai",
        "password": "TemporaryPassword123!",
        "email_confirm": True,
        "user_metadata": {"full_name": "Test User"}
    })
    test_user_id = auth_user.user.id
    print(f"Auth user created with ID: {test_user_id}")

    print(f"Creating test avatar {test_avatar_id}...")
    db.table("avatars").insert({
        "id": test_avatar_id,
        "owner_id": test_user_id,
        "name": "Dadi (Grandmother)",
        "relationship": "Grandmother",
        "subject_type": "deceased",
        "bio": "Loved gardening and making sweets on Diwali.",
        "personality_traits": ["gentle", "wise"],
        "catchphrases": ["Khush raho beta"],
        "consent_status": "verified"
    }).execute()

    # 2. Ingest Memory
    sample_text = (
        "Every Sunday morning, Dadi would sit in the veranda sipping ginger tea "
        "and tending to her sacred tulsi plant. She always told us stories about her childhood in Varanasi."
    )
    print("\nIngesting sample memory...")
    mem = memory_service.ingest_single_memory(
        user_id=test_user_id,
        avatar_id=test_avatar_id,
        content=sample_text,
        source_type="journal",
        custom_tags=["childhood", "tea"],
    )

    print(f"[OK] Memory stored in Postgres with ID: {mem.id}")
    print(f"[OK] Extracted Entities: {mem.extracted_entities}")
    print(f"[OK] Extracted Tags: {mem.tags}")
    print(f"[OK] Confidence Score: {mem.confidence_score}")

    # 3. Verify in Qdrant via Semantic Search
    print("\nSearching memories via Qdrant Cloud...")
    query_text = "What did grandma do in the veranda on Sundays?"
    query_vector = embedding_service.embed_text(query_text)
    results = vector_service.search_memories(
        user_id=test_user_id,
        avatar_id=test_avatar_id,
        query_vector=query_vector,
        limit=1,
    )

    assert len(results) > 0, "No results returned from Qdrant search!"
    top_result = results[0]
    print(f"[OK] Qdrant search returned match! Score: {top_result['score']:.4f}")
    print(f"  Matched Content: {top_result['content']}")

    # 4. Cleanup
    print("\nCleaning up test records...")
    memory_service.delete_memory(mem.id)
    vector_service.delete_avatar_memories(test_avatar_id)
    db.table("avatars").delete().eq("id", test_avatar_id).execute()
    db.auth.admin.delete_user(test_user_id)
    print("[OK] Cleanup complete. Pipeline test PASSED 100%!")


if __name__ == "__main__":
    test_live_pipeline()
