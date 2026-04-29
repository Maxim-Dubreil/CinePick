"""
Fixtures pytest partagées par tous les tests du dossier.

Le rôle principal de ce fichier : mocker le client Supabase AVANT que
main.py ne l'importe, pour que les tests tournent sans connexion réelle.
"""
import sys
from unittest.mock import MagicMock

import pytest

# On crée un faux module supabase_client AVANT que main.py ne soit importé.
# Quand main.py fera `from supabase_client import supabase`, il récupèrera
# notre mock à la place du vrai client.
mock_supabase_client = MagicMock()
sys.modules["supabase_client"] = MagicMock(supabase=mock_supabase_client)


@pytest.fixture
def mock_supabase():
    """Fixture pour configurer le comportement du mock Supabase dans un test."""
    return mock_supabase_client


@pytest.fixture(autouse=True)
def reset_mock_supabase():
    """Reset automatique du mock entre chaque test pour éviter les fuites d'état."""
    mock_supabase_client.reset_mock()
    yield
