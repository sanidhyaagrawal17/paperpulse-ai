import pytest
import shutil
from pathlib import Path
from models.schemas import Paper
from services.vector_store import VectorStoreService

TEST_CHROMA_PATH = "D:/paperpulse-ai/backend/data/test_unit_chroma"

@pytest.fixture(scope="module")
def clean_test_vector_store():
    # Setup test store
    store = VectorStoreService(persist_directory=TEST_CHROMA_PATH)
    yield store
    # Teardown
    try:
        shutil.rmtree(TEST_CHROMA_PATH, ignore_errors=True)
    except Exception:
        pass

def test_vector_store_add_and_query(clean_test_vector_store):
    store = clean_test_vector_store
    papers = [
        Paper(
            arxiv_id="test.001",
            title="Transformer Attention Networks",
            abstract="Attention mechanisms compute dynamic weighted sums across context vectors.",
            authors=["Vaswani et al."],
            published="2017-06-12",
            categories=["cs.CL"]
        ),
        Paper(
            arxiv_id="test.002",
            title="Convolutional Neural Networks",
            abstract="CNNs apply sliding spatial filters across image grid pixels for computer vision.",
            authors=["LeCun et al."],
            published="1998-01-01",
            categories=["cs.CV"]
        )
    ]

    added = store.add_papers(papers)
    assert added == 2
    assert store.count() >= 2

    # Query for attention
    results = store.query_similar("attention mechanism weights", n_results=1)
    assert len(results) == 1
    assert results[0]["arxiv_id"] == "test.001"
    assert "Transformer" in results[0]["title"]
