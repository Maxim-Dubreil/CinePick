"""Real Supabase RLS checks, skipped unless integration credentials are configured."""

import os
from uuid import uuid4

import pytest
from postgrest.exceptions import APIError
from supabase import Client, create_client

pytestmark = pytest.mark.integration

# Postgres error code for "new row violates row-level security policy" —
# what a WITH CHECK failure raises. Any other error must fail the test.
_RLS_VIOLATION_CODE = "42501"


@pytest.fixture
def rls_clients() -> tuple[Client, Client, Client, str, str]:
    url = os.environ.get("SUPABASE_URL")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    anon_key = os.environ.get("SUPABASE_ANON_KEY")
    if not url or not service_role_key or not anon_key:
        pytest.skip("RLS integration tests require SUPABASE_URL, service role and anon keys")

    admin = create_client(url, service_role_key)
    suffix = uuid4().hex
    users = []
    clients = []
    try:
        for label in ("one", "two"):
            response = admin.auth.admin.create_user(
                {
                    "email": f"rls-{label}-{suffix}@example.com",
                    "password": f"Test-password-{suffix}",
                    "email_confirm": True,
                }
            )
            users.append(response.user)

        for user in users:
            client = create_client(url, anon_key)
            client.auth.sign_in_with_password(
                {
                    "email": user.email,
                    "password": f"Test-password-{suffix}",
                }
            )
            clients.append(client)

        yield admin, clients[0], clients[1], str(users[0].id), str(users[1].id)
    finally:
        for user in users:
            admin.auth.admin.delete_user(str(user.id))


def test_user_cannot_reassign_watchlist_item_to_another_user(
    rls_clients: tuple[Client, Client, Client, str, str]
):
    admin, first_client, _, first_user_id, second_user_id = rls_clients
    film = (
        admin.table("films")
        .insert({"letterboxd_slug": f"rls-test-{uuid4().hex}", "title": "RLS test film"})
        .execute()
        .data[0]
    )
    try:
        first_client.table("user_watchlist_items").insert(
            {"user_id": first_user_id, "film_id": film["id"]}
        ).execute()
        try:
            response = (
                first_client.table("user_watchlist_items")
                .update({"user_id": second_user_id})
                .eq("user_id", first_user_id)
                .eq("film_id", film["id"])
                .execute()
            )
        except APIError as exc:
            assert exc.code == _RLS_VIOLATION_CODE, f"unexpected error: {exc!r}"
            return

        assert response.data == []
        assert response.count in (None, 0)
    finally:
        admin.table("films").delete().eq("id", film["id"]).execute()


def test_user_can_update_own_profile(rls_clients: tuple[Client, Client, Client, str, str]):
    admin, first_client, _, first_user_id, _ = rls_clients

    first_client.table("users").update(
        {"full_name": "Edited name", "avatar_url": "https://example.com/avatar.png"}
    ).eq("id", first_user_id).execute()

    row = admin.table("users").select("full_name, avatar_url").eq("id", first_user_id).execute()
    assert row.data == [
        {"full_name": "Edited name", "avatar_url": "https://example.com/avatar.png"}
    ]


def test_user_cannot_update_another_users_profile(
    rls_clients: tuple[Client, Client, Client, str, str]
):
    admin, first_client, _, _, second_user_id = rls_clients
    before = (
        admin.table("users").select("full_name, avatar_url").eq("id", second_user_id).execute()
    )

    # The update policy's USING clause hides the other user's row, so the
    # update silently matches nothing rather than raising.
    response = (
        first_client.table("users")
        .update({"full_name": "Hijacked", "avatar_url": "https://example.com/evil.png"})
        .eq("id", second_user_id)
        .execute()
    )

    assert response.data == []
    after = admin.table("users").select("full_name, avatar_url").eq("id", second_user_id).execute()
    assert after.data == before.data
