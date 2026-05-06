import pytest
import os
import tempfile
from pathlib import Path
from app import app, init_db, _get_user_token
from unittest.mock import patch


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def temp_db():
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as f:
        db_path = Path(f.name)
    os.environ['NETGUARD_DB_PATH'] = str(db_path)
    init_db()
    yield db_path
    os.unlink(db_path)


def test_health_endpoint(client):
    response = client.get('/api/health')
    assert response.status_code == 200
    assert b'ok' in response.data


@patch('app.ALLOW_INSECURE', True)
def test_setup_endpoint(client, temp_db):
    response = client.post('/api/setup', json={})
    assert response.status_code == 200


def test_get_user_token():
    with app.test_request_context(headers={'Authorization': 'Bearer test_token'}):
        token = _get_user_token()
        assert token == 'test_token'