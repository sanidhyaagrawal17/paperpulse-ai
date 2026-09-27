import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture(scope="module")
def client():
    # Using TestClient as context manager triggers the FastAPI lifespan handler
    with TestClient(app) as test_client:
        yield test_client

def test_root_endpoint(client):
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert "PaperPulse AI" in data["service"]

def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["chroma_papers_count"] > 0

def test_graph_endpoint(client):
    res = client.get("/api/graph")
    assert res.status_code == 200
    data = res.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) > 0

def test_verify_claim_endpoint(client):
    papers_res = client.get("/api/papers")
    assert papers_res.status_code == 200
    papers = papers_res.json()["papers"]
    assert len(papers) > 0
    
    target_id = papers[0]["arxiv_id"]
    sentence = f"The research explores {papers[0]['title']} [arXiv:{target_id}]."
    res = client.post("/api/verify", json={"sentence": sentence, "arxiv_id": target_id})
    assert res.status_code == 200
    assert "is_verified" in res.json()
    assert "overlap_score" in res.json()

def test_query_endpoint(client):
    res = client.post("/api/query", json={
        "question": "How does RAG reduce hallucinations in language models?",
        "top_k": 2,
        "expand_neighbors": True,
        "model_preference": "deterministic"
    })
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "citations" in data
    assert "latency_ms" in data
    assert len(data["citations"]) > 0
    assert data["verification_rate"] >= 0.0
