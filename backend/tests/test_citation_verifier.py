import pytest
from services.citation_verifier import citation_verifier, CitationVerifier

def test_grounded_citation_verified():
    source_chunks = {
        "2005.11401": "We explore Retrieval-Augmented Generation architectures that combine pre-trained parametric memory with non-parametric dense vector index memory using DPR to reduce hallucinations in NLP tasks."
    }
    grounded_sentence = "RAG architectures combine parametric memory with non-parametric dense vector memory to reduce hallucinations [arXiv:2005.11401]."
    
    result = citation_verifier.verify_citation(grounded_sentence, "2005.11401", source_chunks)
    assert result["is_verified"] is True
    assert result["overlap_score"] >= 0.35
    assert "parametric" in result["matching_tokens"]
    assert "memory" in result["matching_tokens"]
    assert "hallucinations" in result["matching_tokens"]

def test_hallucinated_citation_rejected():
    source_chunks = {
        "2005.11401": "We explore Retrieval-Augmented Generation architectures that combine pre-trained parametric memory with non-parametric dense vector index memory using DPR to reduce hallucinations in NLP tasks."
    }
    # Completely hallucinated claim about blockchain smart contracts
    drifted_sentence = "This system utilizes decentralized blockchain ethereum consensus protocols for quantum cryptographic security [arXiv:2005.11401]."
    
    result = citation_verifier.verify_citation(drifted_sentence, "2005.11401", source_chunks)
    assert result["is_verified"] is False
    assert result["overlap_score"] < 0.35
    assert len(result["matching_tokens"]) == 0

def test_missing_source_chunk_handling():
    source_chunks = {}
    sentence = "A claim with an unindexed paper [arXiv:9999.99999]."
    result = citation_verifier.verify_citation(sentence, "9999.99999", source_chunks)
    assert result["is_verified"] is False
    assert result["overlap_score"] == 0.0
    assert "missing" in result["reason"].lower()

def test_verify_all_citations_extraction():
    source_chunks = {
        "2312.10997": "Retrieval-Augmented Generation combines dense vector retrieval with large language models to overcome static parameters.",
        "2404.16130": "Graph RAG extracts knowledge graphs and community clusters using Leiden algorithms."
    }
    metadata = {
        "2312.10997": {"title": "RAG Survey", "authors": ["Author A"], "abstract": source_chunks["2312.10997"]},
        "2404.16130": {"title": "Graph RAG", "authors": ["Author B"], "abstract": source_chunks["2404.16130"]}
    }
    text = (
        "Dense vector retrieval mitigates static parameters [arXiv:2312.10997]. "
        "Furthermore, community clusters are extracted using graph algorithms [arXiv:2404.16130]."
    )
    citations = citation_verifier.verify_all_citations(text, source_chunks, metadata)
    assert len(citations) == 2
    assert citations[0].is_verified is True
    assert citations[1].is_verified is True
    assert citations[0].arxiv_id == "2312.10997"
    assert citations[1].arxiv_id == "2404.16130"
