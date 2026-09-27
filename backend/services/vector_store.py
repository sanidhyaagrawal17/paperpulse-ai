from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from config import settings
from models.schemas import Paper

class VectorStoreService:
    def __init__(self, persist_directory: Optional[str] = None):
        self.persist_directory = persist_directory or settings.CHROMA_PATH
        self.client = chromadb.PersistentClient(
            path=self.persist_directory,
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(
            name=settings.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )

    def count(self) -> int:
        return self.collection.count()

    def add_papers(self, papers: List[Paper]) -> int:
        """
        Upsert papers into ChromaDB collection.
        Uses composite doc (Title + Abstract) for semantic indexing.
        """
        if not papers:
            return 0

        ids = []
        documents = []
        metadatas = []

        for p in papers:
            ids.append(p.arxiv_id)
            # Combine title and abstract for dense semantic representation
            doc_text = f"Title: {p.title}\n\nAbstract: {p.abstract}"
            documents.append(doc_text)
            metadatas.append({
                "arxiv_id": p.arxiv_id,
                "title": p.title,
                "authors": ", ".join(p.authors) if p.authors else "Unknown",
                "published": p.published or "",
                "pdf_url": p.pdf_url or "",
                "entry_url": p.entry_url or "",
                "abstract": p.abstract
            })

        # Upsert ensures idempotent insertion without unique constraint collisions
        self.collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )
        return len(ids)

    def query_similar(self, query_text: str, n_results: int = 4) -> List[Dict[str, Any]]:
        """
        Query top-k most semantically similar paper chunks.
        """
        total = self.collection.count()
        if total == 0:
            return []

        k = min(n_results, total)
        results = self.collection.query(
            query_texts=[query_text],
            n_results=k,
            include=["documents", "metadatas", "distances"]
        )

        output = []
        if not results or not results["ids"] or not results["ids"][0]:
            return output

        ids = results["ids"][0]
        distances = results.get("distances", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        documents = results.get("documents", [[]])[0]

        for i in range(len(ids)):
            # With cosine distance in Chroma: similarity = 1 - distance
            dist = distances[i] if i < len(distances) else 0.5
            similarity = max(0.0, min(1.0, 1.0 - dist))
            meta = metadatas[i] if i < len(metadatas) else {}
            doc = documents[i] if i < len(documents) else ""

            output.append({
                "arxiv_id": ids[i],
                "title": meta.get("title", ""),
                "abstract": meta.get("abstract", doc),
                "authors": [a.strip() for a in meta.get("authors", "").split(",") if a.strip()],
                "published": meta.get("published", ""),
                "pdf_url": meta.get("pdf_url", ""),
                "entry_url": meta.get("entry_url", ""),
                "similarity_score": round(similarity, 4),
                "distance": round(dist, 4)
            })

        return output

    def get_all_embeddings_and_metadata(self) -> Dict[str, Any]:
        """
        Retrieve all stored paper IDs, embeddings, and metadata to construct
        the NetworkX graph.
        """
        total = self.collection.count()
        if total == 0:
            return {"ids": [], "embeddings": [], "metadatas": []}

        data = self.collection.get(
            include=["embeddings", "metadatas", "documents"]
        )
        return {
            "ids": data.get("ids", []),
            "embeddings": data.get("embeddings", []),
            "metadatas": data.get("metadatas", []),
            "documents": data.get("documents", [])
        }

    def get_paper(self, arxiv_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch exact stored chunk and metadata for a single arXiv paper.
        """
        try:
            res = self.collection.get(
                ids=[arxiv_id],
                include=["metadatas", "documents"]
            )
            if res and res["ids"] and len(res["ids"]) > 0:
                meta = res["metadatas"][0] if res["metadatas"] else {}
                doc = res["documents"][0] if res["documents"] else ""
                return {
                    "arxiv_id": arxiv_id,
                    "title": meta.get("title", ""),
                    "abstract": meta.get("abstract", doc),
                    "authors": [a.strip() for a in meta.get("authors", "").split(",") if a.strip()],
                    "published": meta.get("published", ""),
                    "pdf_url": meta.get("pdf_url", ""),
                    "entry_url": meta.get("entry_url", "")
                }
        except Exception as e:
            print(f"[VectorStoreService] Error fetching paper {arxiv_id}: {e}")
        return None

vector_store = VectorStoreService()
