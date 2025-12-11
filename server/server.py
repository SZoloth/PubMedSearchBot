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
    retmax: int = 10

@app.get("/session")
async def get_session():
    try:
        # Create an ephemeral key for the Realtime API
        session = await client.beta.realtime.sessions.create(
            model="gpt-4o-realtime-preview",
            voice="shimmer",  # Female voice (options: alloy, echo, fable, onyx, nova, shimmer)
            instructions="""You are VoiceBot Researcher Pro, a voice-first biomedical research assistant designed for accessibility.

Your primary function is to act as a SCREEN READER for scientific literature. Users rely on you to read content aloud.

CORE BEHAVIORS:
1. When a user asks for papers, ALWAYS use the `search_pubmed` tool with retmax=10 to get more results.
2. After receiving search results, READ THE RESULTS ALOUD. For each paper:
   - State the title clearly
   - Read the full citation (authors, journal, year)
   - Summarize the abstract in 2-3 sentences
   - Mention key MeSH terms if relevant to the query
3. Summarize the top 3-5 results unless the user requests more.
4. You ARE allowed and EXPECTED to read full abstracts and publication content to users.
5. If the user asks for more detail on a specific paper, read the complete abstract.

FULL TEXT ACCESS:
6. When the user asks to "read the full article", "tell me more about this paper", or wants the complete text:
   - Use the `get_full_text` tool with the paper's PMID
   - If successful, READ the full text sections aloud (introduction, methods, results, discussion)
   - If the article is not in PubMed Central, explain that only the abstract is available and offer to read it in full
7. After loading a full article, you can answer follow-up questions about its content by referencing what you read.

STYLE:
- Speak in English only.
- Be professional and information-dense.
- Pace yourself clearly - pause between papers for auditory comprehension.
- When reading citations, speak naturally (e.g., "Published in Nature in 2023 by Smith and colleagues").""",
            tools=[
                {
                    "type": "function",
                    "name": "search_pubmed",
                    "description": "Search PubMed for scientific papers and studies. Returns up to 10 results with abstracts, authors, and citations. Always use retmax=10 for comprehensive results.",
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
                                "description": "Max number of results to return. Default 10.",
                                "default": 10
                            }
                        },
                        "required": ["query"]
                    }
                },
                {
                    "type": "function",
                    "name": "get_full_text",
                    "description": "Get the FULL TEXT of an open-access article from PubMed Central. Use this when the user asks to 'read the full article', 'tell me more about this paper', or wants detailed content beyond the abstract. Returns introduction, methods, results, and discussion sections.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "pmid": {
                                "type": "string",
                                "description": "The PubMed ID (PMID) of the article to retrieve full text for. Get this from search results."
                            }
                        },
                        "required": ["pmid"]
                    }
                }
            ],
            tool_choice="auto",
            # Enable real-time transcription for wake word detection
            input_audio_transcription={
                "model": "whisper-1"
            },
            # Server-side VAD with tuned settings to reduce false triggers
            turn_detection={
                "type": "server_vad",
                "threshold": 0.7,  # Higher threshold = less sensitive (default 0.5)
                "prefix_padding_ms": 500,  # Wait 500ms before considering it speech
                "silence_duration_ms": 700  # Wait 700ms of silence before responding
            }
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
            
        # 2. Fetch Details (eSummary) - for basic metadata
        esummary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
        summary_params = {
            "db": "pubmed",
            "id": ",".join(id_list),
            "retmode": "json"
        }
        
        async with session.get(esummary_url, params=summary_params) as resp:
            summary_data = await resp.json()
            summary_result = summary_data.get("result", {})
        
        # 3. Fetch Full Records (eFetch) - for abstracts and MeSH terms
        efetch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
        fetch_params = {
            "db": "pubmed",
            "id": ",".join(id_list),
            "rettype": "xml",
            "retmode": "xml"
        }
        
        # Parse XML for abstracts and MeSH terms
        abstracts = {}
        mesh_terms = {}
        
        async with session.get(efetch_url, params=fetch_params) as resp:
            xml_text = await resp.text()
            
            # Simple XML parsing for abstracts and MeSH
            import re
            
            # Extract articles by PMID
            articles = re.findall(r'<PubmedArticle>(.*?)</PubmedArticle>', xml_text, re.DOTALL)
            
            for article in articles:
                # Get PMID
                pmid_match = re.search(r'<PMID[^>]*>(\d+)</PMID>', article)
                if not pmid_match:
                    continue
                pmid = pmid_match.group(1)
                
                # Get Abstract
                abstract_match = re.search(r'<AbstractText[^>]*>(.*?)</AbstractText>', article, re.DOTALL)
                if abstract_match:
                    # Clean HTML tags from abstract
                    abstract_text = re.sub(r'<[^>]+>', '', abstract_match.group(1))
                    abstracts[pmid] = abstract_text.strip()
                
                # Get MeSH terms
                mesh_list = re.findall(r'<DescriptorName[^>]*>([^<]+)</DescriptorName>', article)
                if mesh_list:
                    mesh_terms[pmid] = mesh_list
            
        # 4. Format Response with enriched data
        papers = []
        for uid in id_list:
            if uid not in summary_result: 
                continue
            item = summary_result[uid]
            
            # Extract authors
            authors = [a["name"] for a in item.get("authors", []) if "name" in a]
            
            # Build full citation
            author_str = ", ".join(authors[:3])
            if len(authors) > 3:
                author_str += " et al."
            
            journal = item.get("source", "Unknown")
            year = item.get("pubdate", "N/A").split()[0] if item.get("pubdate") else "N/A"
            volume = item.get("volume", "")
            issue = item.get("issue", "")
            pages = item.get("pages", "")
            
            # Format: Author(s). Title. Journal. Year;Volume(Issue):Pages.
            citation_parts = [author_str + "."]
            citation_parts.append(item.get("title", "No Title"))
            citation_parts.append(f"{journal}.")
            if volume:
                vol_str = f"{year};{volume}"
                if issue:
                    vol_str += f"({issue})"
                if pages:
                    vol_str += f":{pages}"
                citation_parts.append(vol_str + ".")
            
            papers.append({
                "id": uid,
                "title": item.get("title", "No Title"),
                "authors": ", ".join(authors),
                "journal": journal,
                "pubdate": item.get("pubdate", "N/A"),
                "link": f"https://pubmed.ncbi.nlm.nih.gov/{uid}/",
                "abstract": abstracts.get(uid, "Abstract not available."),
                "mesh_terms": mesh_terms.get(uid, []),
                "citation": " ".join(citation_parts)
            })
            
        return papers


class FullTextRequest(BaseModel):
    pmid: str


@app.post("/api/tools/fulltext")
async def get_full_text(request: FullTextRequest):
    """
    Fetch full text for an open-access article from PubMed Central.
    
    Steps:
    1. Convert PMID to PMCID using ID Converter API
    2. Fetch full text XML from PMC
    3. Extract readable text sections
    """
    async with aiohttp.ClientSession() as session:
        # 1. Convert PMID to PMCID
        converter_url = "https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/"
        converter_params = {
            "ids": request.pmid,
            "format": "json",
            "tool": "voicebot_researcher",
            "email": "contact@voicebot.dev"
        }
        
        async with session.get(converter_url, params=converter_params) as resp:
            data = await resp.json()
            records = data.get("records", [])
            
            if not records or "pmcid" not in records[0]:
                return {
                    "success": False,
                    "error": "This article is not available in PubMed Central (not open access).",
                    "pmid": request.pmid,
                    "suggestion": "Only open-access articles have full text available. The abstract should still be readable."
                }
            
            pmcid = records[0]["pmcid"]
        
        # 2. Fetch full text from PMC using eFetch
        efetch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
        efetch_params = {
            "db": "pmc",
            "id": pmcid,
            "rettype": "xml",
            "retmode": "xml"
        }
        
        async with session.get(efetch_url, params=efetch_params) as resp:
            xml_text = await resp.text()
        
        # 3. Parse XML to extract readable sections
        import re
        
        # Extract title
        title_match = re.search(r'<article-title[^>]*>(.*?)</article-title>', xml_text, re.DOTALL)
        title = re.sub(r'<[^>]+>', '', title_match.group(1)).strip() if title_match else "Title not found"
        
        # Extract sections (intro, methods, results, discussion)
        sections = {}
        
        # Look for section titles and content
        section_pattern = r'<sec[^>]*>.*?<title>([^<]+)</title>(.*?)</sec>'
        section_matches = re.findall(section_pattern, xml_text, re.DOTALL)
        
        for section_title, section_content in section_matches:
            # Clean the content - remove XML tags
            clean_content = re.sub(r'<[^>]+>', ' ', section_content)
            clean_content = re.sub(r'\s+', ' ', clean_content).strip()
            
            if len(clean_content) > 100:  # Only include substantial sections
                sections[section_title.strip()] = clean_content[:3000]  # Limit to 3000 chars per section
        
        # Extract abstract if no sections found
        if not sections:
            abstract_match = re.search(r'<abstract[^>]*>(.*?)</abstract>', xml_text, re.DOTALL)
            if abstract_match:
                abstract_text = re.sub(r'<[^>]+>', ' ', abstract_match.group(1))
                abstract_text = re.sub(r'\s+', ' ', abstract_text).strip()
                sections["Abstract"] = abstract_text
        
        # Build readable output
        full_text_parts = [f"TITLE: {title}\n"]
        
        for section_name, content in sections.items():
            full_text_parts.append(f"\n{section_name.upper()}:\n{content}")
        
        return {
            "success": True,
            "pmid": request.pmid,
            "pmcid": pmcid,
            "title": title,
            "sections": sections,
            "full_text": "\n".join(full_text_parts),
            "pmc_link": f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmcid}/"
        }


if __name__ == "__main__":

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
