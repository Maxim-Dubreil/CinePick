"""Real Supabase RLS checks, skipped unless integration credentials are configured."""

import os
from uuid import uuid4

import pytest
from supabase import Client, create_client

pytestmark = pytest.mark.integration


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
    film = admin.table("films").select("id").limit(1).execute().data[0]

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
    except Exception:
        return

    assert response.data == []
    assert response.count in (None, 0)
