import pytest
import os
import sys
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Force import from local directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from server import app

client = TestClient(app)



@pytest.mark.asyncio
async def test_get_session_returns_ephemeral_key():
    """
    Asserts that GET /session:
    1. Returns 200 OK
    2. Returns a JSON object with 'client_secret'
    3. Mocks the OpenAI API call to avoid real network requests during testing.
    """
    mock_response = MagicMock()
    mock_response.client_secret = {"value": "ek_mock_12345"}
    
    # Mock the AsyncOpenAI client structure
    with patch("server.client.beta.realtime.sessions.create", return_value=mock_response) as mock_create:
        response = client.get("/session")

        
        assert response.status_code == 200
        data = response.json()
        assert "client_secret" in data
        assert data["client_secret"]["value"] == "ek_mock_12345"
        mock_create.assert_called_once()
        
        # Verify strict arguments to ensure System Prompt and Tools are injected
        call_kwargs = mock_create.call_args.kwargs
        assert "instructions" in call_kwargs
        assert "VoiceBot Researcher Pro" in call_kwargs["instructions"]
        assert "tools" in call_kwargs
        assert call_kwargs["tools"][0]["name"] == "search_pubmed"
        assert call_kwargs["tool_choice"] == "auto"

