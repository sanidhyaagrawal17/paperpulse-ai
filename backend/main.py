import os
import time
from contextlib import asynccontextmanager
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx

from config import settings
from models.schemas import (
    IngestRequest,
    IngestResponse,
    QueryRequest,
    QueryResponse,
    GraphResponse,
    VerifyRequest,
    VerifyResponse,
    HealthResponse,
    Paper
)
from services.arxiv_service import arxiv_service
from services.vector_store import vector_store
from services.graph_service import graph_service
from services.citation_verifier import citation_verifier
from services.rag_service import rag_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed initial literature dataset if vector store is empty
    count = vector_store.count()
    if count == 0:
        print("[PaperPulse AI] Initializing index with seed literature on RAG & Multi-Agent systems...")
        seed_papers = arxiv_service._get_curated_fallback_papers("Multi-agent RAG systems", max_results=8)
        vector_store.add_papers(seed_papers)
        
        # Build initial NetworkX graph
        data = vector_store.get_all_embeddings_and_metadata()
        graph_service.build_graph_from_embeddings(
            ids=data["ids"],
            embeddings=data["embeddings"],
            metadatas=data["metadatas"],
            similarity_threshold=settings.SIMILARITY_EDGE_THRESHOLD
        )
        print(f"[PaperPulse AI] Startup complete: {vector_store.count()} papers indexed in ChromaDB.")
    else:
        # Reconstruct graph from stored ChromaDB embeddings
        data = vector_store.get_all_embeddings_and_metadata()
        graph_service.build_graph_from_embeddings(
            ids=data["ids"],
            embeddings=data["embeddings"],
            metadatas=data["metadatas"],
            similarity_threshold=settings.SIMILARITY_EDGE_THRESHOLD
        )
        print(f"[PaperPulse AI] Rebuilt NetworkX graph with {len(data['ids'])} existing nodes.")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Agentic Literature Review Engine with ChromaDB, Citation Guardrails, NetworkX, & Next.js 14",
    lifespan=lifespan
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["General"])
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "endpoints": ["/api/ingest", "/api/query", "/api/graph", "/api/verify", "/api/papers", "/api/health"]
    }

@app.get("/api/health", response_model=HealthResponse, tags=["General"])
async def health():
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            ollama_ok = (res.status_code == 200)
    except Exception:
        ollama_ok = False

    graph_res = graph_service.get_graph_response()

    return HealthResponse(
        status="healthy",
        chroma_papers_count=vector_store.count(),
        graph_nodes=graph_res.num_nodes,
        graph_edges=graph_res.num_edges,
        ollama_available=ollama_ok,
        openrouter_available=bool(settings.OPENROUTER_API_KEY)
    )

@app.post("/api/ingest", response_model=IngestResponse, tags=["Ingestion"])
async def ingest_papers(req: IngestRequest):
    """
    Fetch papers from arXiv API for the given topic, store in ChromaDB,
    and compute pairwise cosine similarities to construct the NetworkX graph.
    """
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="Topic must not be empty.")

    papers = await arxiv_service.fetch_papers(req.topic, max_results=req.max_results)
    if not papers:
        raise HTTPException(status_code=502, detail="Failed to fetch papers from arXiv.")

    # 1. Upsert into ChromaDB
    indexed_count = vector_store.add_papers(papers)

    # 2. Recompute NetworkX graph with all documents in ChromaDB
    data = vector_store.get_all_embeddings_and_metadata()
    graph_res = graph_service.build_graph_from_embeddings(
        ids=data["ids"],
        embeddings=data["embeddings"],
        metadatas=data["metadatas"],
        similarity_threshold=settings.SIMILARITY_EDGE_THRESHOLD
    )

    return IngestResponse(
        topic=req.topic,
        papers_indexed=indexed_count,
        graph_nodes=graph_res.num_nodes,
        graph_edges=graph_res.num_edges,
        density=graph_res.density,
        message=f"Successfully indexed {indexed_count} papers from arXiv on '{req.topic}'."
    )

@app.post("/api/query", response_model=QueryResponse, tags=["RAG"])
async def query_literature(req: QueryRequest):
    """
    Run grounded RAG query:
    1. Retrieve top-k chunks from ChromaDB
    2. Expand context to 1-hop topological neighbors in NetworkX graph
    3. Synthesize literature review
    4. Deterministically verify claims against retrieved chunks
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    response = await rag_service.query(
        question=req.question,
        top_k=req.top_k,
        expand_neighbors=req.expand_neighbors,
        model_preference=req.model_preference or "auto"
    )
    return response

@app.get("/api/graph", response_model=GraphResponse, tags=["Graph"])
async def get_graph():
    """
    Returns the NetworkX literature similarity graph (nodes, 2D spring layout coordinates,
    edges with weights, cluster assignments) for HTML5 Canvas visualization.
    """
    return graph_service.get_graph_response()

@app.post("/api/verify", response_model=VerifyResponse, tags=["Guardrails"])
async def verify_claim(req: VerifyRequest):
    """
    Direct deterministic verification endpoint for any arbitrary sentence against an arXiv chunk.
    """
    paper_data = vector_store.get_paper(req.arxiv_id)
    if not paper_data:
        raise HTTPException(status_code=404, detail=f"Paper arXiv:{req.arxiv_id} not found in index.")

    source_chunks = {req.arxiv_id: paper_data["abstract"]}
    res = citation_verifier.verify_citation(req.sentence, req.arxiv_id, source_chunks)

    return VerifyResponse(
        is_verified=res["is_verified"],
        overlap_score=res["overlap_score"],
        matching_tokens=res["matching_tokens"],
        reason=res.get("reason")
    )

@app.get("/api/papers", tags=["Papers"])
async def list_papers(limit: int = Query(default=50, ge=1, le=100)):
    """
    List all papers currently stored in ChromaDB vector store.
    """
    data = vector_store.get_all_embeddings_and_metadata()
    papers = []
    for i, pid in enumerate(data["ids"][:limit]):
        meta = data["metadatas"][i] if i < len(data["metadatas"]) else {}
        authors = [a.strip() for a in meta.get("authors", "").split(",") if a.strip()]
        papers.append({
            "arxiv_id": pid,
            "title": meta.get("title", ""),
            "authors": authors,
            "published": meta.get("published", ""),
            "pdf_url": meta.get("pdf_url", f"https://arxiv.org/pdf/{pid}.pdf"),
            "entry_url": meta.get("entry_url", f"https://arxiv.org/abs/{pid}"),
            "abstract": meta.get("abstract", "")
        })
    return {"total": len(data["ids"]), "papers": papers}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
