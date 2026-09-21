import os
import sys
from unittest.mock import MagicMock

import pytest
from supabase import create_client


def _is_integration_test():
    """Check if integration test credentials are available."""
    return bool(
        os.environ.get("RUN_INTEGRATION_TESTS") == "1"
        and
        os.environ.get("SUPABASE_URL")
        and os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    )


# Keep the application client mocked for all tests. Integration tests request a
# real client explicitly through `require_integration` instead of changing the
# dependency used by every unit test in the suite.
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
    """Return a service-role client for tests that explicitly need Supabase."""
    if not _is_integration_test():
        pytest.skip("Integration test: requires real DB (CI main only)")
    return create_client(
        os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )


@pytest.fixture
def supabase_mock():
    return mock_supabase_client


@pytest.fixture(autouse=True)
def reset_supabase_mock():
    mock_supabase_client.reset_mock()
    yield
