import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
from main import app

client = TestClient(app)

@pytest.mark.asyncio
async def test_pubmed_proxy_flow():
    """
    Asserts that POST /api/tools/pubmed:
    1. Accepts JSON query
    2. Calls NCBI eSearch (mocked)
    3. Calls NCBI eSummary (mocked)
    4. Returns formatted JSON list
    """
    
    # Mock responses for aiohttp
    mock_esearch_response = {
        "esearchresult": {
            "idlist": ["123456", "789012"]
        }
    }
    
    mock_esummary_response = {
        "result": {
            "123456": {
                "title": "Study on Sarcopenia",
                "authors": [{"name": "Smith J"}, {"name": "Doe A"}],
                "pubdate": "2024",
                "source": "Nature Medicine"
            },
            "789012": {
                "title": "Protein Intake in Elderly",
                "authors": [{"name": "Bond J"}],
                "pubdate": "2023",
                "source": "JAMA"
            },
            "uids": ["123456", "789012"]
        }
    }

    # We need to mock aiohttp.ClientSession.get -> return mock_response
    
    with patch("aiohttp.ClientSession.get") as mock_get:
        
        # Search Response Mock
        mock_resp_obj_search = AsyncMock()
        mock_resp_obj_search.json.return_value = mock_esearch_response
        mock_resp_obj_search.__aenter__.return_value = mock_resp_obj_search
        mock_resp_obj_search.__aexit__.return_value = None
        
        # Summary Response Mock
        mock_resp_obj_summary = AsyncMock()
        mock_resp_obj_summary.json.return_value = mock_esummary_response
        mock_resp_obj_summary.__aenter__.return_value = mock_resp_obj_summary
        mock_resp_obj_summary.__aexit__.return_value = None

        mock_get.side_effect = [mock_resp_obj_search, mock_resp_obj_summary]


        payload = {"query": "sarcopenia", "retmax": 2}
        response = client.post("/api/tools/pubmed", json=payload)

        # We expect failure here initially (404 Not Found) because the route doesn't exist
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 2
        assert data[0]["title"] == "Study on Sarcopenia"
        assert data[1]["title"] == "Protein Intake in Elderly"
