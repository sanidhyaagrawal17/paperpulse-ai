from typing import List, Dict, Any, Set
import numpy as np
import networkx as nx
from config import settings
from models.schemas import GraphNode, GraphEdge, GraphResponse

class GraphService:
    def __init__(self):
        self.G = nx.Graph()
        self.node_positions: Dict[str, Dict[str, float]] = {}
        self.paper_metadata: Dict[str, Dict[str, Any]] = {}

    def build_graph_from_embeddings(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
        similarity_threshold: float = settings.SIMILARITY_EDGE_THRESHOLD
    ) -> GraphResponse:
        """
        Builds a NetworkX similarity graph from paper vectors.
        Adds edge between two papers if pairwise cosine similarity > threshold.
        """
        self.G.clear()
        self.paper_metadata.clear()
        
        n = len(ids)
        if n == 0:
            return GraphResponse(nodes=[], edges=[], density=0.0, num_nodes=0, num_edges=0)

        # 1. Add all papers as nodes with metadata
        for i, pid in enumerate(ids):
            meta = metadatas[i] if i < len(metadatas) else {}
            authors = [a.strip() for a in meta.get("authors", "").split(",") if a.strip()]
            self.paper_metadata[pid] = {
                "id": pid,
                "title": meta.get("title", f"Paper {pid}"),
                "authors": authors,
                "published": meta.get("published", ""),
                "pdf_url": meta.get("pdf_url", "")
            }
            self.G.add_node(
                pid,
                title=meta.get("title", f"Paper {pid}"),
                authors=authors,
                published=meta.get("published", ""),
                pdf_url=meta.get("pdf_url", "")
            )

        # 2. Compute pairwise cosine similarity matrix
        if embeddings is not None and len(embeddings) > 0 and len(embeddings[0]) > 0:
            vecs = np.array(embeddings, dtype=np.float32)
            # Normalize vectors to unit length
            norms = np.linalg.norm(vecs, axis=1, keepdims=True)
            norms[norms == 0] = 1e-10
            norm_vecs = vecs / norms
            
            sim_matrix = np.dot(norm_vecs, norm_vecs.T)
            
            # Add edges for pairs with cosine similarity > threshold
            for i in range(n):
                for j in range(i + 1, n):
                    sim = float(sim_matrix[i, j])
                    if sim >= similarity_threshold:
                        self.G.add_edge(ids[i], ids[j], weight=round(sim, 3))

        # 3. Community detection for cluster coloring
        clusters = self._compute_clusters()

        # 4. Compute 2D node coordinates using Fruchterman-Reingold spring layout
        self._compute_spring_layout()

        # 5. Format response
        nodes = []
        for pid in self.G.nodes():
            pos = self.node_positions.get(pid, {"x": 500.0, "y": 500.0})
            meta = self.paper_metadata.get(pid, {})
            nodes.append(
                GraphNode(
                    id=pid,
                    title=meta.get("title", f"arXiv:{pid}"),
                    authors=meta.get("authors", []),
                    published=meta.get("published", ""),
                    x=round(pos["x"], 2),
                    y=round(pos["y"], 2),
                    degree=self.G.degree(pid),
                    cluster=clusters.get(pid, 0),
                    pdf_url=meta.get("pdf_url", "")
                )
            )

        edges = []
        for u, v, data in self.G.edges(data=True):
            edges.append(
                GraphEdge(
                    source=u,
                    target=v,
                    weight=data.get("weight", 0.75)
                )
            )

        density = nx.density(self.G) if n > 1 else 0.0

        return GraphResponse(
            nodes=nodes,
            edges=edges,
            density=round(float(density), 4),
            num_nodes=len(nodes),
            num_edges=len(edges)
        )

    def _compute_clusters(self) -> Dict[str, int]:
        """
        Group nodes into research clusters using greedy modularity communities
        or connected components.
        """
        clusters: Dict[str, int] = {}
        if len(self.G) == 0:
            return clusters

        try:
            communities = list(nx.community.greedy_modularity_communities(self.G))
            for cluster_idx, comm in enumerate(communities):
                for node in comm:
                    clusters[node] = cluster_idx
        except Exception:
            # Fallback to connected components
            for cluster_idx, comp in enumerate(nx.connected_components(self.G)):
                for node in comp:
                    clusters[node] = cluster_idx

        # Assign default cluster 0 for any unassigned node
        for node in self.G.nodes():
            if node not in clusters:
                clusters[node] = 0

        return clusters

    def _compute_spring_layout(self):
        """
        Calculate normalized 2D coordinates (100 to 900 on a 1000x1000 canvas)
        using NetworkX spring layout with deterministic seed.
        """
        n = len(self.G)
        if n == 0:
            self.node_positions = {}
            return

        if n == 1:
            node = list(self.G.nodes())[0]
            self.node_positions = {node: {"x": 500.0, "y": 500.0}}
            return

        # Fruchterman-Reingold force-directed algorithm
        pos = nx.spring_layout(self.G, k=1.2 / np.sqrt(n), iterations=60, seed=42)

        # Scale coordinates into range [100, 900]
        x_vals = [p[0] for p in pos.values()]
        y_vals = [p[1] for p in pos.values()]
        min_x, max_x = min(x_vals), max(x_vals)
        min_y, max_y = min(y_vals), max(y_vals)

        x_span = max(max_x - min_x, 1e-6)
        y_span = max(max_y - min_y, 1e-6)

        self.node_positions = {}
        for node, (raw_x, raw_y) in pos.items():
            norm_x = 100.0 + ((raw_x - min_x) / x_span) * 800.0
            norm_y = 100.0 + ((raw_y - min_y) / y_span) * 800.0
            self.node_positions[node] = {"x": norm_x, "y": norm_y}

    def expand_retrieval_context(
        self,
        top_paper_ids: List[str],
        max_expansion: int = settings.MAX_NEIGHBOR_EXPANSION
    ) -> List[str]:
        """
        Expands direct vector hits to 1-hop topological neighbors in the literature graph.
        Sorted by edge weight (cosine similarity).
        """
        expanded_set: Set[str] = set(top_paper_ids)
        for pid in top_paper_ids:
            if self.G.has_node(pid):
                neighbors = list(self.G.neighbors(pid))
                # Sort neighbors by edge weight descending
                sorted_neighbors = sorted(
                    neighbors,
                    key=lambda n: self.G[pid][n].get("weight", 0),
                    reverse=True
                )
                for n in sorted_neighbors[:max_expansion]:
                    expanded_set.add(n)
        return list(expanded_set)

    def get_graph_response(self) -> GraphResponse:
        """
        Returns cached or computed graph representation.
        """
        clusters = self._compute_clusters()
        nodes = []
        for pid in self.G.nodes():
            pos = self.node_positions.get(pid, {"x": 500.0, "y": 500.0})
            meta = self.paper_metadata.get(pid, {})
            nodes.append(
                GraphNode(
                    id=pid,
                    title=meta.get("title", f"arXiv:{pid}"),
                    authors=meta.get("authors", []),
                    published=meta.get("published", ""),
                    x=round(pos["x"], 2),
                    y=round(pos["y"], 2),
                    degree=self.G.degree(pid),
                    cluster=clusters.get(pid, 0),
                    pdf_url=meta.get("pdf_url", "")
                )
            )

        edges = []
        for u, v, data in self.G.edges(data=True):
            edges.append(
                GraphEdge(
                    source=u,
                    target=v,
                    weight=data.get("weight", 0.75)
                )
            )

        density = nx.density(self.G) if len(self.G) > 1 else 0.0

        return GraphResponse(
            nodes=nodes,
            edges=edges,
            density=round(float(density), 4),
            num_nodes=len(nodes),
            num_edges=len(edges)
        )

graph_service = GraphService()
