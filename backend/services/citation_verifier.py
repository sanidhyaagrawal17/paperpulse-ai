import re
from typing import Dict, List, Any, Optional
from config import settings
from models.schemas import Citation

STOPWORDS = {
    "the", "a", "an", "is", "in", "of", "and", "to", "for", "with", "that", "this",
    "by", "on", "as", "are", "was", "were", "it", "at", "be", "from", "or", "which",
    "their", "they", "our", "we", "can", "also", "using", "used", "into", "more",
    "such", "than", "have", "has", "been", "these", "those", "both", "such"
}

ARXIV_TAG_REGEX = re.compile(r'\[arXiv:([0-9]{4}\.[0-9]{4,5}|[a-zA-Z\-]+/[0-9]{7}|[0-9]{7})\]', re.IGNORECASE)

class CitationVerifier:
    def __init__(self, threshold: float = settings.CITATION_OVERLAP_THRESHOLD):
        self.threshold = threshold

    def verify_citation(
        self,
        sentence: str,
        arxiv_id: str,
        source_chunks: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Deterministically verifies if a claim is grounded in the retrieved paper chunk.
        Zero non-deterministic layers. Zero math traps.
        """
        chunk = source_chunks.get(arxiv_id, "")
        if not chunk:
            return {
                "is_verified": False,
                "overlap_score": 0.0,
                "matching_tokens": [],
                "reason": "Source chunk missing from index"
            }

        # 1. Clean and tokenize claim sentence (excluding citations, stopwords, short words)
        claim_clean = re.sub(r'\[arXiv:[^\]]+\]', '', sentence).lower()
        claim_tokens = {
            w.strip('.,():;"`\'[]{}?!')
            for w in claim_clean.split()
            if w.strip('.,():;"`\'[]{}?!') not in STOPWORDS and len(w.strip('.,():;"`\'[]{}?!')) > 3
        }

        # 2. Clean and tokenize source abstract chunk
        chunk_tokens = {
            w.strip('.,():;"`\'[]{}?!')
            for w in chunk.lower().split()
            if w.strip('.,():;"`\'[]{}?!') not in STOPWORDS
        }

        if not claim_tokens:
            return {
                "is_verified": True,
                "overlap_score": 1.0,
                "matching_tokens": [],
                "reason": "No heavy entity claims in sentence"
            }

        # 3. Calculate deterministic set intersection
        matching_tokens = claim_tokens.intersection(chunk_tokens)
        overlap_ratio = len(matching_tokens) / len(claim_tokens)

        is_verified = overlap_ratio >= self.threshold

        return {
            "is_verified": is_verified,
            "overlap_score": round(overlap_ratio, 2),
            "matching_tokens": sorted(list(matching_tokens)),
            "reason": "Grounded in source chunk" if is_verified else "Low token overlap against source abstract"
        }

    def verify_all_citations(
        self,
        text: str,
        source_chunks: Dict[str, str],
        metadata_dict: Dict[str, Dict[str, Any]]
    ) -> List[Citation]:
        """
        Extract all [arXiv:ID] citations from synthesized text, split into sentences,
        and run deterministic verification on each claim.
        """
        citations: List[Citation] = []
        if not text:
            return citations

        # Split text into candidate sentences (handling standard punctuation and line breaks)
        raw_sentences = re.split(r'(?<=[.!?])\s+', text)

        seen_tags = set()

        for sent in raw_sentences:
            matches = ARXIV_TAG_REGEX.findall(sent)
            for raw_id in matches:
                clean_id = raw_id.strip()
                tag = f"[arXiv:{clean_id}]"

                # Run deterministic verification
                verification = self.verify_citation(sent, clean_id, source_chunks)
                meta = metadata_dict.get(clean_id, {})

                # Extract concise snippet from chunk
                chunk = source_chunks.get(clean_id, "")
                source_excerpt = (chunk[:280] + "...") if len(chunk) > 280 else chunk

                citation_item = Citation(
                    tag=tag,
                    arxiv_id=clean_id,
                    title=meta.get("title", f"arXiv Paper {clean_id}"),
                    is_verified=verification["is_verified"],
                    overlap_score=verification["overlap_score"],
                    matching_tokens=verification["matching_tokens"],
                    source_chunk=source_excerpt or meta.get("abstract", "Abstract unavailable"),
                    authors=meta.get("authors", []),
                    published=meta.get("published", ""),
                    pdf_url=meta.get("pdf_url", f"https://arxiv.org/pdf/{clean_id}.pdf"),
                    reason=verification.get("reason")
                )
                citations.append(citation_item)
                seen_tags.add(tag)

        # Fallback: Check if there were inline tags not caught by sentence splitting
        all_tags = ARXIV_TAG_REGEX.findall(text)
        for raw_id in all_tags:
            tag = f"[arXiv:{raw_id}]"
            if tag not in seen_tags:
                verification = self.verify_citation(text, raw_id, source_chunks)
                meta = metadata_dict.get(raw_id, {})
                chunk = source_chunks.get(raw_id, "")
                source_excerpt = (chunk[:280] + "...") if len(chunk) > 280 else chunk

                citations.append(
                    Citation(
                        tag=tag,
                        arxiv_id=raw_id,
                        title=meta.get("title", f"arXiv Paper {raw_id}"),
                        is_verified=verification["is_verified"],
                        overlap_score=verification["overlap_score"],
                        matching_tokens=verification["matching_tokens"],
                        source_chunk=source_excerpt,
                        authors=meta.get("authors", []),
                        published=meta.get("published", ""),
                        pdf_url=meta.get("pdf_url", f"https://arxiv.org/pdf/{raw_id}.pdf"),
                        reason=verification.get("reason")
                    )
                )
                seen_tags.add(tag)

        return citations

citation_verifier = CitationVerifier()
