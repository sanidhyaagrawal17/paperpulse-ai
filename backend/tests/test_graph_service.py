import pytest
import networkx as nx
from services.graph_service import GraphService

def test_graph_construction_and_neighbor_expansion():
    service = GraphService()
    ids = ["paper_1", "paper_2", "paper_3", "paper_4"]
    
    # 4 dummy normalized vectors:
    # paper_1 and paper_2 are very close (dot product = 0.96)
    # paper_3 is moderately close to paper_2 (dot product = 0.75)
    # paper_4 is orthogonal (dot product = 0.0)
    embeddings = [
        [0.98, 0.20, 0.0],
        [0.95, 0.31, 0.0],
        [0.70, 0.71, 0.0],
        [0.0,  0.0,  1.0]
    ]
    metadatas = [
        {"title": "Paper 1", "authors": "Alice"},
        {"title": "Paper 2", "authors": "Bob"},
        {"title": "Paper 3", "authors": "Charlie"},
        {"title": "Paper 4", "authors": "Dave"}
    ]

    res = service.build_graph_from_embeddings(ids, embeddings, metadatas, similarity_threshold=0.70)
    
    assert res.num_nodes == 4
    # paper_1-paper_2 (>0.70) and paper_2-paper_3 (>0.70) should have edges
    assert res.num_edges >= 2
    assert service.G.has_edge("paper_1", "paper_2")
    
    # Test 1-hop topological neighbor expansion
    # Direct hit is paper_1 -> neighbor should expand to paper_2
    expanded = service.expand_retrieval_context(["paper_1"], max_expansion=1)
    assert "paper_1" in expanded
    assert "paper_2" in expanded
    assert len(expanded) == 2

def test_spring_layout_coordinates_normalized():
    service = GraphService()
    ids = ["p1", "p2", "p3"]
    embeddings = [[1.0, 0.0], [0.8, 0.6], [0.0, 1.0]]
    metadatas = [{"title": "T1"}, {"title": "T2"}, {"title": "T3"}]
    
    res = service.build_graph_from_embeddings(ids, embeddings, metadatas, similarity_threshold=0.5)
    for node in res.nodes:
        assert 100.0 <= node.x <= 900.0
        assert 100.0 <= node.y <= 900.0
