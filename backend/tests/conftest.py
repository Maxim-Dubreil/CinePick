import os
import sys
from unittest.mock import MagicMock

import pytest
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
IS_INTEGRATION_TEST = bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)

if IS_INTEGRATION_TEST:
    supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    sys.modules["supabase_client"] = MagicMock(supabase=supabase_client)
else:
    mock_supabase_client = MagicMock()
    sys.modules["supabase_client"] = MagicMock(supabase=mock_supabase_client)


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "integration: requires real DB (CI main only)"
    )


def pytest_collection_modifyitems(config, items):
    if not IS_INTEGRATION_TEST:
        skip_integration = pytest.mark.skip(
            reason="Integration tests only run in CI with real DB"
        )
        for item in items:
            if "integration" in item.keywords:
                item.add_marker(skip_integration)


@pytest.fixture
def supabase_mock():
    if not IS_INTEGRATION_TEST:
        return sys.modules["supabase_client"].supabase
    return None


@pytest.fixture(autouse=True)
def reset_supabase_mock():
    if not IS_INTEGRATION_TEST:
        sys.modules["supabase_client"].supabase.reset_mock()
    yield
