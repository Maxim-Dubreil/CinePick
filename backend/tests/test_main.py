from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "CinePick API is running"}


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_ready_endpoint_success(mock_supabase):
    """Quand Supabase répond, /health/ready retourne 200."""
    # Le MagicMock par défaut accepte .table().select().limit().execute() sans crasher
    response = client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["checks"]["database"] == "ok"


def test_health_ready_endpoint_failure(mock_supabase):
    """Quand Supabase crashe, /health/ready retourne 503."""
    # On configure le mock pour qu'il lève une exception au .table()
    mock_supabase.table.side_effect = Exception("DB unreachable")

    response = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json()["detail"]["status"] == "not_ready"
