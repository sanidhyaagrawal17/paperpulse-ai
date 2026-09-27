from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class Paper(BaseModel):
    arxiv_id: str
    title: str
    abstract: str
    authors: List[str] = Field(default_factory=list)
    published: str = ""
    pdf_url: str = ""
    entry_url: str = ""
    categories: List[str] = Field(default_factory=list)

class IngestRequest(BaseModel):
    topic: str = Field(..., description="Research topic or keyword e.g. 'Multi-agent RAG systems'")
    max_results: int = Field(default=25, ge=5, le=50, description="Number of papers to fetch from arXiv")

class IngestResponse(BaseModel):
    topic: str
    papers_indexed: int
    graph_nodes: int
    graph_edges: int
    density: float
    message: str

class QueryRequest(BaseModel):
    question: str = Field(..., description="Research question or query")
    top_k: int = Field(default=4, ge=1, le=10)
    expand_neighbors: bool = Field(default=True, description="Expand retrieval context using 1-hop NetworkX neighbors")
    model_preference: Optional[str] = Field(default="auto", description="auto | ollama | openrouter | deterministic")

class Citation(BaseModel):
    tag: str = Field(..., description="Tag as rendered in text e.g. [arXiv:2305.12345]")
    arxiv_id: str
    title: str
    is_verified: bool
    overlap_score: float
    matching_tokens: List[str] = Field(default_factory=list)
    source_chunk: str
    authors: List[str] = Field(default_factory=list)
    published: str = ""
    pdf_url: str = ""
    reason: Optional[str] = None

class QueryResponse(BaseModel):
    question: str
    answer: str
    citations: List[Citation]
    expanded_neighbors: List[str]
    direct_hits: List[str]
    context_papers_count: int
    verification_rate: float
    latency_ms: float
    model_used: str

class GraphNode(BaseModel):
    id: str
    title: str
    authors: List[str] = Field(default_factory=list)
    published: str = ""
    x: float
    y: float
    degree: int
    cluster: int = 0
    pdf_url: str = ""

class GraphEdge(BaseModel):
    source: str
    target: str
    weight: float

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    density: float
    num_nodes: int
    num_edges: int

class VerifyRequest(BaseModel):
    sentence: str
    arxiv_id: str

class VerifyResponse(BaseModel):
    is_verified: bool
    overlap_score: float
    matching_tokens: List[str]
    reason: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    chroma_papers_count: int
    graph_nodes: int
    graph_edges: int
    ollama_available: bool
    openrouter_available: bool
