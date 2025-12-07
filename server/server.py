import os
import json
import aiohttp
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional

load_dotenv()

app = FastAPI()

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class PubMedRequest(BaseModel):
    query: str
    mindate: Optional[str] = None
    retmax: int = 5

@app.get("/session")
async def get_session():
    try:
        # Create an ephemeral key for the Realtime API
        session = await client.beta.realtime.sessions.create(
            model="gpt-4o-realtime-preview",
            voice="verse",
            instructions="""You are VoiceBot Researcher Pro, a world-class biomedical research assistant. 
You have access to PubMed via the `search_pubmed` tool. 
Your goal is to help users find high-quality scientific literature. 
When a user asks for papers, ALWAYS use the `search_pubmed` tool. 
Keep your audio responses concise, professional, and dense with information.
If you find results, summarize the top 3 briefly.""",
            tools=[{
                "type": "function",
                "name": "search_pubmed",
                "description": "Search PubMed for scientific papers and studies.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The search query keywords (e.g. 'sarcopenia elderly', 'covid vaccine efficacy')."
                        },
                        "mindate": {
                            "type": "string",
                            "description": "Optional start year for the search (e.g. '2020')."
                        },
                        "retmax": {
                            "type": "integer",
                            "description": "Max number of results to return. Default 5."
                        }
                    },
                    "required": ["query"]
                }
            }],
            tool_choice="auto"
        )
        return {"client_secret": session.client_secret}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tools/pubmed")
async def proxy_pubmed(request: PubMedRequest):

    async with aiohttp.ClientSession() as session:
        # 1. Search (eSearch)
        esearch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
        params = {
            "db": "pubmed",
            "term": request.query,
            "retmax": request.retmax,
            "retmode": "json",
            "sort": "relevance"
        }
        if request.mindate:
            params["mindate"] = request.mindate
            
        async with session.get(esearch_url, params=params) as resp:
            data = await resp.json()
            id_list = data.get("esearchresult", {}).get("idlist", [])
            
        if not id_list:
            return []
            
        # 2. Fetch Details (eSummary)
        esummary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
        summary_params = {
            "db": "pubmed",
            "id": ",".join(id_list),
            "retmode": "json"
        }
        
        async with session.get(esummary_url, params=summary_params) as resp:
            data = await resp.json()
            result = data.get("result", {})
            
        # 3. Format Response
        papers = []
        for uid in id_list:
            if uid not in result: continue
            item = result[uid]
            
            # Extract authors carefully
            authors = [a["name"] for a in item.get("authors", []) if "name" in a]
            
            papers.append({
                "id": uid,
                "title": item.get("title", "No Title"),
                "authors": ", ".join(authors),
                "journal": item.get("source", "Unknown Source"),
                "pubdate": item.get("pubdate", "N/A"),
                "link": f"https://pubmed.ncbi.nlm.nih.gov/{uid}/"
            })
            
        return papers

if __name__ == "__main__":

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
