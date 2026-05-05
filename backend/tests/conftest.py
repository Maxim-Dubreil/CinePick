import os
import sys
from unittest.mock import MagicMock

import pytest
from supabase import create_client


def _is_integration_test():
    """Check if integration test credentials are available."""
    return bool(
        os.environ.get("SUPABASE_URL")
        and os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    )


# Setup Supabase client based on credentials
if _is_integration_test():
    supabase_client = create_client(
        os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )
    sys.modules["supabase_client"] = MagicMock(supabase=supabase_client)
else:
    mock_supabase_client = MagicMock()
    sys.modules["supabase_client"] = MagicMock(supabase=mock_supabase_client)


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "integration: requires real DB (CI main only)"
    )


def pytest_collection_modifyitems(config, items):
    if not _is_integration_test():
        skip_integration = pytest.mark.skip(
            reason="Integration tests only run in CI with real DB"
        )
        for item in items:
            if "integration" in item.keywords:
                item.add_marker(skip_integration)


@pytest.fixture
def require_integration():
    """Fixture que les tests d'intégration doivent utiliser pour être skippés en PR."""
    if not _is_integration_test():
        pytest.skip("Integration test: requires real DB (CI main only)")


@pytest.fixture
def supabase_mock():
    if not _is_integration_test():
        return sys.modules["supabase_client"].supabase
    return None


@pytest.fixture(autouse=True)
def reset_supabase_mock():
    if not _is_integration_test():
        sys.modules["supabase_client"].supabase.reset_mock()
    yield
