import pytest
from unittest.mock import patch, MagicMock
from groq_client import get_ai_analysis, validate_key, reload_key


@patch('groq_client.http.client.HTTPSConnection')
def test_get_ai_analysis(mock_conn):
    mock_response = MagicMock()
    mock_response.read.return_value = b'{"choices": [{"message": {"content": "Test analysis"}}]}'
    mock_conn.return_value.getresponse.return_value = mock_response

    result = get_ai_analysis("test prompt")
    assert "Test analysis" in result


@patch('groq_client._load_key')
def test_validate_key(mock_load):
    mock_load.return_value = "valid_key"
    with patch('groq_client.http.client.HTTPSConnection') as mock_conn:
        mock_response = MagicMock()
        mock_response.status = 200
        mock_conn.return_value.getresponse.return_value = mock_response
        assert validate_key() == True


def test_reload_key():
    # Test reload_key function
    with patch('groq_client._load_key', return_value="new_key"):
        result = reload_key()
        assert result == "new_key"