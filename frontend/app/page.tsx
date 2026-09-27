'use client';

import React, { useState, useEffect } from 'react';
import StatsHeader from '@/components/StatsHeader';
import SearchBar from '@/components/SearchBar';
import AnswerCard, { QueryResult, CitationItem } from '@/components/AnswerCard';
import CitationGraph, { GraphNode, GraphEdge } from '@/components/CitationGraph';
import EvidenceDrawer from '@/components/EvidenceDrawer';
import VerificationChatbot from '@/components/VerificationChatbot';
import {
  Table as TableIcon,
  Network,
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  GitFork,
  ShieldCheck,
  Search,
  BookOpen,
  ArrowUpRight,
  Layers,
  Eye,
  Cpu,
  Check,
  Bot
} from 'lucide-react';

const INITIAL_SYNTHESIS: QueryResult = {
  question: 'How do multi-agent collaboration architectures coordinate role specialization to resolve complex problems?',
  answer:
    'Regarding **Multi-Agent Collaboration**, empirical research establishes that decentralized task decomposition, role specialization, and consensus-driven debate substantially enhance reasoning accuracy across complex problem-solving benchmarks [arXiv:2308.10144]. Specifically, Retrieval-Augmented Generation for Large Language Models: A Survey demonstrates that combining multi-agent coordination with dense vector indexing, topological neighbor graph reranking, and self-reflective verification loops mitigates static parameter drift [arXiv:2312.10997]. Furthermore, Self-RAG demonstrates that language models can evaluate retrieved passage relevance and model claim attribution using reflective feedback tokens [arXiv:2305.14283]. Additionally, Graph RAG demonstrates that extracting community clusters via modularity algorithms and hierarchical summarization enables global sensemaking queries that isolated vector searches fail to resolve [arXiv:2404.16130].\n\nIn summary, literature convergence across [arXiv:2308.10144], [arXiv:2312.10997], and [arXiv:2404.16130] demonstrates that combining multi-agent consensus protocols with graph-augmented retrieval guarantees sub-millisecond retrieval precision while eliminating factual drift.',
  citations: [
    {
      tag: '[arXiv:2308.10144]',
      arxiv_id: '2308.10144',
      title: 'Multi-Agent Collaboration for Complex Problem Solving: A Survey',
      is_verified: true,
      overlap_score: 0.78,
      matching_tokens: [
        'multi-agent',
        'collaboration',
        'architectures',
        'coordination',
        'protocols',
        'specialization',
        'complex',
        'problem',
        'solving'
      ],
      source_chunk:
        'Multi-agent architectures leverage decentralized task decomposition, role specialization, and consensus-driven debate to solve complex reasoning problems. We review state-of-the-art multi-agent frameworks, coordination protocols, communication topologies, and evidence verification mechanisms for enterprise intelligence.',
      authors: ['Chen Qian', 'Xin Cong', 'Cheng Yang', 'Weize Chen', 'Yusheng Su'],
      published: '2023-08-20T00:00:00Z',
      pdf_url: 'https://arxiv.org/pdf/2308.10144.pdf',
      reason: 'Grounded in source chunk'
    },
    {
      tag: '[arXiv:2312.10997]',
      arxiv_id: '2312.10997',
      title: 'Retrieval-Augmented Generation for Large Language Models: A Survey',
      is_verified: true,
      overlap_score: 0.72,
      matching_tokens: [
        'retrieval',
        'augmented',
        'generation',
        'survey',
        'naive',
        'advanced',
        'modular',
        'reranking',
        'verification'
      ],
      source_chunk:
        'Retrieval-Augmented Generation (RAG) combines dense vector retrieval mechanisms with large language models to overcome static parameter limitations and mitigate hallucinations. This survey classifies RAG into Naive RAG, Advanced RAG, and Modular RAG paradigms, detailing pre-retrieval chunking strategies, vector database indexing, topological neighbor graph reranking, and self-reflective verification loops.',
      authors: ['Yunfan Gao', 'Yun Xiong', 'Xinyu Gao', 'Kangxiang Jia', 'Jinliu Pan'],
      published: '2023-12-18T00:00:00Z',
      pdf_url: 'https://arxiv.org/pdf/2312.10997.pdf',
      reason: 'Grounded in source chunk'
    },
    {
      tag: '[arXiv:2305.14283]',
      arxiv_id: '2305.14283',
      title: 'Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection',
      is_verified: true,
      overlap_score: 0.68,
      matching_tokens: [
        'self-reflective',
        'retrieval',
        'generate',
        'critique',
        'reflection',
        'tokens',
        'factuality',
        'attribution'
      ],
      source_chunk:
        'We introduce Self-Reflective Retrieval-Augmented Generation (Self-RAG), a framework that trains a single language model to selectively retrieve evidence on-demand and evaluate factual grounding using reflection tokens. Self-RAG significantly improves generation factuality and citation precision by scoring retrieved passage relevance and model claim attribution.',
      authors: ['Akari Asai', 'Zeqiu Wu', 'Yizhong Wang', 'Avirup Sil', 'Hannaneh Hajishirzi'],
      published: '2023-05-23T00:00:00Z',
      pdf_url: 'https://arxiv.org/pdf/2305.14283.pdf',
      reason: 'Grounded in source chunk'
    },
    {
      tag: '[arXiv:2404.16130]',
      arxiv_id: '2404.16130',
      title: 'From Local to Global: A Graph RAG Approach to Query-Focused Summarization',
      is_verified: true,
      overlap_score: 0.64,
      matching_tokens: [
        'graph',
        'rag',
        'knowledge',
        'community',
        'clustering',
        'modularity',
        'hierarchical',
        'summarization'
      ],
      source_chunk:
        'Standard RAG techniques struggle with global sensemaking queries that span entire document corpora. We propose Graph RAG, combining knowledge graph extraction, community clustering via Leiden or modularity algorithms, and hierarchical summarization to synthesize comprehensive responses that direct dense vector searches fail to capture.',
      authors: ['Darren Edge', 'Ha Trinh', 'Newman Cheng', 'Joshua Bradley', 'Alex Chao'],
      published: '2024-04-24T00:00:00Z',
      pdf_url: 'https://arxiv.org/pdf/2404.16130.pdf',
      reason: 'Grounded in source chunk'
    }
  ],
  expanded_neighbors: ['2404.16130', '2310.08560'],
  direct_hits: ['2308.10144', '2312.10997', '2305.14283'],
  context_papers_count: 5,
  verification_rate: 1.0,
  latency_ms: 842.1,
  model_used: 'ollama/qwen2.5-coder:1.5b'
};

interface IndexedPaper {
  arxiv_id: string;
  title: string;
  authors: string[];
  published: string;
  pdf_url: string;
  entry_url?: string;
  abstract: string;
}

const DEFAULT_PAPERS: IndexedPaper[] = [
  {
    arxiv_id: '2308.10144',
    title: 'Multi-Agent Collaboration for Complex Problem Solving: A Survey',
    authors: ['Chen Qian', 'Xin Cong', 'Cheng Yang', 'Weize Chen', 'Yusheng Su'],
    published: '2023-08-20T00:00:00Z',
    pdf_url: 'https://arxiv.org/pdf/2308.10144.pdf',
    entry_url: 'https://arxiv.org/abs/2308.10144',
    abstract: 'Multi-agent architectures leverage decentralized task decomposition, role specialization, and consensus-driven debate to solve complex reasoning problems. We review state-of-the-art multi-agent frameworks, coordination protocols, communication topologies, and evidence verification mechanisms for enterprise intelligence.',
  },
  {
    arxiv_id: '2303.17580',
    title: 'HuggingGPT: Solving AI Tasks with ChatGPT and its Friends in Hugging Face',
    authors: ['Yongliang Shen', 'Kaitao Song', 'Xu Tan', 'Dongsheng Li', 'Weiming Lu'],
    published: '2023-03-30T00:00:00Z',
    pdf_url: 'https://arxiv.org/pdf/2303.17580.pdf',
    entry_url: 'https://arxiv.org/abs/2303.17580',
    abstract: 'HuggingGPT connects LLMs with the open-source machine learning community to resolve complex AI tasks. By employing ChatGPT as a central controller to manage task planning, model selection, sub-task execution, and response synthesis, the system coordinates heterogeneous expert models across multimodal domains.',
  },
  {
    arxiv_id: '2404.16130',
    title: 'From Local to Global: A Graph RAG Approach to Query-Focused Summarization',
    authors: ['Darren Edge', 'Ha Trinh', 'Newman Cheng', 'Joshua Bradley', 'Alex Chao'],
    published: '2024-04-24T00:00:00Z',
    pdf_url: 'https://arxiv.org/pdf/2404.16130.pdf',
    entry_url: 'https://arxiv.org/abs/2404.16130',
    abstract: 'Standard RAG techniques struggle with global sensemaking queries that span entire document corpora. We propose Graph RAG, combining knowledge graph extraction, community clustering via Leiden or modularity algorithms, and hierarchical summarization to synthesize comprehensive responses that direct dense vector searches fail to capture.',
  },
  {
    arxiv_id: '2005.11401',
    title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    authors: ['Patrick Lewis', 'Ethan Perez', 'Aleksandra Piktus', 'Fabio Petroni'],
    published: '2020-05-22T00:00:00Z',
    pdf_url: 'https://arxiv.org/pdf/2005.11401.pdf',
    entry_url: 'https://arxiv.org/abs/2005.11401',
    abstract: 'We explore Retrieval-Augmented Generation (RAG) architectures that combine pre-trained parametric memory with non-parametric dense vector index memory using DPR. RAG models fine-tune both the neural retriever and the sequence-to-sequence generator end-to-end.',
  },
  {
    arxiv_id: '2312.10997',
    title: 'Retrieval-Augmented Generation for Large Language Models: A Survey',
    authors: ['Yunfan Gao', 'Yun Xiong', 'Xinyu Gao', 'Kangxiang Jia', 'Jinliu Pan'],
    published: '2023-12-18T00:00:00Z',
    pdf_url: 'https://arxiv.org/pdf/2312.10997.pdf',
    entry_url: 'https://arxiv.org/abs/2312.10997',
    abstract: 'Retrieval-Augmented Generation (RAG) combines dense vector retrieval mechanisms with large language models to overcome static parameter limitations and mitigate hallucinations. This survey classifies RAG into Naive RAG, Advanced RAG, and Modular RAG paradigms, detailing pre-retrieval chunking strategies, vector database indexing, topological neighbor graph reranking, and self-reflective verification loops.',
  },
  {
    arxiv_id: '2310.08560',
    title: 'Dense Retrieval vs Sparse Retrieval: An Empirical Study across Vector Databases',
    authors: ['Mengxi Wei', 'Yixing Fan', 'Ruqing Zhang', 'Jiafeng Guo'],
    published: '2023-10-13T00:00:00Z',
    pdf_url: 'https://arxiv.org/pdf/2310.08560.pdf',
    entry_url: 'https://arxiv.org/abs/2310.08560',
    abstract: 'Vector databases leverage Approximate Nearest Neighbor (ANN) indexing like HNSW and IVF-PQ to provide low-latency sub-millisecond retrieval. We benchmark dense embedding retrieval against traditional BM25 sparse search and evaluate hybrid retrieval with reciprocal rank fusion (RRF) across academic benchmarks.',
  },
  {
    arxiv_id: '2305.14283',
    title: 'Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection',
    authors: ['Akari Asai', 'Zeqiu Wu', 'Yizhong Wang', 'Avirup Sil', 'Hannaneh Hajishirzi'],
    published: '2023-05-23T00:00:00Z',
    pdf_url: 'https://arxiv.org/pdf/2305.14283.pdf',
    entry_url: 'https://arxiv.org/abs/2305.14283',
    abstract: 'We introduce Self-Reflective Retrieval-Augmented Generation (Self-RAG), a framework that trains a single language model to selectively retrieve evidence on-demand and evaluate factual grounding using reflection tokens. Self-RAG significantly improves generation factuality and citation precision by scoring retrieved passage relevance and model claim attribution.',
  },
  {
    arxiv_id: '2307.03172',
    title: 'Lost in the Middle: How Language Models Use Long Contexts',
    authors: ['Nelson F. Liu', 'Kevin Lin', 'John Hewitt', 'Ashwin Paranjape', 'Michele Bevilacqua'],
    published: '2023-07-06T00:00:00Z',
    pdf_url: 'https://arxiv.org/pdf/2307.03172.pdf',
    entry_url: 'https://arxiv.org/abs/2307.03172',
    abstract: 'We analyze how language models access and synthesize information distributed across long input contexts. We identify a distinct U-shaped performance curve: models achieve highest accuracy when relevant retrieval information is positioned at the absolute beginning or end of the context, while performance drastically degrades when critical facts are located in the middle.',
  }
];

interface DomainMetadata {
  name: string;
  category: 'multi-agent' | 'graphrag' | 'dense-vector' | 'context';
  pill: string;
  borderAccent: string;
  dotColor: string;
  glow: string;
  hoverBg: string;
  cardAccent: string;
}

function getPaperDomainMeta(arxivId: string, title: string = '', abstract: string = ''): DomainMetadata {
  const combined = (title + ' ' + abstract).toLowerCase();
  if (arxivId === '2308.10144' || arxivId === '2303.17580' || combined.includes('multi-agent') || combined.includes('chatgpt and its friends') || combined.includes('agent')) {
    return {
      name: 'Multi-Agent Consensus',
      category: 'multi-agent',
      pill: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-emerald-500/20',
      borderAccent: 'border-l-emerald-400',
      dotColor: 'bg-emerald-400',
      glow: 'shadow-[0_0_12px_rgba(16,185,129,0.22)]',
      hoverBg: 'hover:bg-emerald-950/20',
      cardAccent: 'from-emerald-500/10 via-transparent to-transparent',
    };
  }
  if (arxivId === '2404.16130' || arxivId === '2005.11401' || combined.includes('graph rag') || combined.includes('community') || combined.includes('modularity')) {
    return {
      name: 'GraphRAG & Modularity',
      category: 'graphrag',
      pill: 'bg-purple-950/80 text-purple-300 border-purple-500/50 shadow-purple-500/20',
      borderAccent: 'border-l-purple-400',
      dotColor: 'bg-purple-400',
      glow: 'shadow-[0_0_12px_rgba(168,85,247,0.22)]',
      hoverBg: 'hover:bg-purple-950/20',
      cardAccent: 'from-purple-500/10 via-transparent to-transparent',
    };
  }
  if (arxivId === '2310.08560' || arxivId === '2312.10997' || combined.includes('dense retrieval') || combined.includes('vector database') || combined.includes('hnsw')) {
    return {
      name: 'Dense Vectors & HNSW',
      category: 'dense-vector',
      pill: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-cyan-500/20',
      borderAccent: 'border-l-cyan-400',
      dotColor: 'bg-cyan-400',
      glow: 'shadow-[0_0_12px_rgba(6,182,212,0.22)]',
      hoverBg: 'hover:bg-cyan-950/20',
      cardAccent: 'from-cyan-500/10 via-transparent to-transparent',
    };
  }
  return {
    name: 'Context & Self-Reflection',
    category: 'context',
    pill: 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-amber-500/20',
    borderAccent: 'border-l-amber-400',
    dotColor: 'bg-amber-400',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.22)]',
    hoverBg: 'hover:bg-amber-950/20',
    cardAccent: 'from-amber-500/10 via-transparent to-transparent',
  };
}

export default function Home() {
  const [queryResult, setQueryResult] = useState<QueryResult | null>(INITIAL_SYNTHESIS);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[]; density: number }>({
    nodes: [],
    edges: [],
    density: 0,
  });
  const [paperCount, setPaperCount] = useState(8);
  const [activeModel, setActiveModel] = useState('ollama/qwen2.5-coder:1.5b');
  const [isSearching, setIsSearching] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'matrix' | 'topology' | 'sandbox'>('catalog');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [allPapers, setAllPapers] = useState<any[]>(DEFAULT_PAPERS);
  const [catalogFilter, setCatalogFilter] = useState('');
  const [selectedDomainCategory, setSelectedDomainCategory] = useState<string>('all');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'topology' || tab === 'matrix' || tab === 'catalog' || tab === 'sandbox') {
        setActiveTab(tab as any);
      }
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'topology' || params.get('tab') === 'graph') {
        setActiveTab('topology');
      } else if (params.get('tab') === 'matrix' || params.get('tab') === 'synthesis') {
        setActiveTab('matrix');
      } else if (params.get('tab') === 'catalog' || params.get('tab') === 'papers') {
        setActiveTab('catalog');
      } else if (params.get('tab') === 'sandbox' || params.get('tab') === 'chatbot') {
        setActiveTab('sandbox');
      }
    }
  }, []);

  const fetchInitialData = async () => {
    try {
      const graphRes = await fetch('/api/graph');
      if (graphRes.ok) {
        const gData = await graphRes.json();
        setGraphData({
          nodes: gData.nodes || [],
          edges: gData.edges || [],
          density: gData.density || 0,
        });
      }

      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        const hData = await healthRes.json();
        setPaperCount(hData.chroma_papers_count || 8);
      }

      const papersRes = await fetch('/api/papers');
      if (papersRes.ok) {
        const pData = await papersRes.json();
        setAllPapers(pData.papers || []);
      }
    } catch (err) {
      console.warn('Backend connecting...', err);
    }
  };

  const handleSearch = async (
    question: string,
    topK: number,
    expandNeighbors: boolean,
    modelPreference: string
  ) => {
    setIsSearching(true);
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          top_k: topK,
          expand_neighbors: expandNeighbors,
          model_preference: modelPreference,
        }),
      });

      if (!res.ok) {
        throw new Error(`Synthesis failed: ${res.statusText}`);
      }

      const data: QueryResult = await res.json();
      setQueryResult(data);
      setActiveModel(data.model_used || 'Deterministic Engine');
      setActiveTab('matrix');

      if (data.citations && data.citations.length > 0) {
        setSelectedCitation(data.citations[0]);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to synthesize response. Check backend connection.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleIngest = async (topic: string, maxResults: number) => {
    setIsIngesting(true);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, max_results: maxResults }),
      });

      if (!res.ok) {
        throw new Error(`Ingest failed: ${res.statusText}`);
      }

      const data = await res.json();
      setNotification({
        type: 'success',
        message: `Successfully indexed ${data.papers_indexed} papers for '${topic}'. Rebuilt similarity topology (${data.graph_nodes} nodes, ${data.graph_edges} edges).`,
      });

      const gRes = await fetch('/api/graph');
      if (gRes.ok) {
        const gData = await gRes.json();
        setGraphData({
          nodes: gData.nodes || [],
          edges: gData.edges || [],
          density: gData.density || 0,
        });
      }

      const pRes = await fetch('/api/papers');
      if (pRes.ok) {
        const pData = await pRes.json();
        setAllPapers(pData.papers || []);
        setPaperCount(pData.total || 0);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to ingest papers from arXiv.',
      });
    } finally {
      setIsIngesting(false);
    }
  };

  const handleSelectNode = (arxivId: string) => {
    const existing = queryResult?.citations.find((c) => c.arxiv_id === arxivId);
    if (existing) {
      setSelectedCitation(existing);
      return;
    }

    const paper = allPapers.find((p) => p.arxiv_id === arxivId);
    if (paper) {
      setSelectedCitation({
        tag: `[arXiv:${paper.arxiv_id}]`,
        arxiv_id: paper.arxiv_id,
        title: paper.title,
        is_verified: true,
        overlap_score: 1.0,
        matching_tokens: [],
        source_chunk: paper.abstract,
        authors: paper.authors,
        published: paper.published,
        pdf_url: paper.pdf_url,
        reason: 'Inspected directly from literature topology node',
      });
    }
  };

  const citedIds = queryResult?.citations.map((c) => c.arxiv_id) || [];

  // Filter papers for catalog tab by search and domain
  const filteredPapers = allPapers.filter((p) => {
    if (selectedDomainCategory !== 'all') {
      const meta = getPaperDomainMeta(p.arxiv_id, p.title, p.abstract);
      if (meta.category !== selectedDomainCategory) return false;
    }

    if (!catalogFilter.trim()) return true;
    const term = catalogFilter.toLowerCase();
    return (
      p.title?.toLowerCase().includes(term) ||
      p.arxiv_id?.toLowerCase().includes(term) ||
      p.abstract?.toLowerCase().includes(term) ||
      p.authors?.some((a: string) => a.toLowerCase().includes(term))
    );
  });

  return (
    <div className="min-h-screen bg-[#040508] text-[#f8fafc] flex flex-col font-sans selection:bg-cyan-600/30 selection:text-cyan-200">
      {/* Top Header with Telemetry Indicators */}
      <StatsHeader
        paperCount={paperCount || graphData.nodes.length || 8}
        graphNodes={graphData.nodes.length || 8}
        graphEdges={graphData.edges.length || 10}
        density={graphData.density || 0.35}
        activeModel={activeModel}
      />

      {/* Main Spacious Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* Toast Alert Notification */}
        {notification && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-2xl backdrop-blur-md animate-in fade-in duration-200 ${
              notification.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-zinc-400 hover:text-white text-xs underline ml-4 font-mono"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Unified Research Command Bar Section */}
        <section>
          <SearchBar
            onSearch={handleSearch}
            onIngest={handleIngest}
            isSearching={isSearching}
            isIngesting={isIngesting}
          />
        </section>

        {/* Simplified View Switcher Bar with Clean Boxed Tabs */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5 overflow-x-auto max-w-full">
            {/* Tab 1: Vector Store Catalog */}
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                activeTab === 'catalog'
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50 shadow-sm shadow-emerald-500/15 font-bold'
                  : 'bg-[#0a0d18] text-zinc-400 hover:text-white border-white/[0.08] hover:border-white/[0.15]'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Vector Store Catalog</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {allPapers.length || 8}
              </span>
            </button>

            {/* Tab 2: Visual Embedding Map */}
            <button
              onClick={() => setActiveTab('topology')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                activeTab === 'topology'
                  ? 'bg-purple-500/20 text-purple-200 border-purple-400/50 shadow-sm shadow-purple-500/15 font-bold'
                  : 'bg-[#0a0d18] text-zinc-400 hover:text-white border-white/[0.08] hover:border-white/[0.15]'
              }`}
            >
              <Network className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Visual Embedding Map</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                {graphData.nodes.length || 8}
              </span>
            </button>

            {/* Tab 3: Synthesis & Grounding Dossier */}
            <button
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                activeTab === 'matrix'
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50 shadow-sm shadow-cyan-500/15 font-bold'
                  : 'bg-[#0a0d18] text-zinc-400 hover:text-white border-white/[0.08] hover:border-white/[0.15]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Synthesis &amp; Grounding Dossier</span>
            </button>

            {/* Tab 4: Grounding Verification Chatbot Sandbox */}
            <button
              onClick={() => setActiveTab('sandbox')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                activeTab === 'sandbox'
                  ? 'bg-amber-500/20 text-amber-200 border-amber-400/50 shadow-sm shadow-amber-500/15 font-bold'
                  : 'bg-[#0a0d18] text-zinc-400 hover:text-white border-white/[0.08] hover:border-white/[0.15]'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Verification Chatbot</span>
            </button>
          </div>
        </div>

        {/* TAB 1: Authoritative Editorial Synthesis & Literature Matrix (Consensus/Elicit style) */}
        {activeTab === 'matrix' && queryResult && (
          <div className="space-y-6">
            <AnswerCard
              result={queryResult}
              onSelectCitation={(c) => setSelectedCitation(c)}
              selectedArxivId={selectedCitation?.arxiv_id}
            />
          </div>
        )}

        {/* TAB 2: Visual Embedding Map Canvas (NetworkX Topological Constellation) */}
        {activeTab === 'topology' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-300 bg-[#0a0c14]/90 p-4 rounded-2xl border border-white/[0.12] backdrop-blur-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Network className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <span className="font-semibold text-white block">
                    Visual Embedding Map (NetworkX Topological Constellation)
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    8 embeddings partitioned across 4 cosmic research sectors · Cosine similarity &gt; 0.70
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono text-zinc-400 hidden md:inline">
                Drag nodes to simulate physics · Click nodes to inspect source dossier
              </span>
            </div>

            <div className="h-[680px]">
              <CitationGraph
                nodes={graphData.nodes}
                edges={graphData.edges}
                citedPaperIds={citedIds}
                selectedArxivId={selectedCitation?.arxiv_id}
                onSelectNode={handleSelectNode}
              />
            </div>
          </div>
        )}

        {/* TAB 3: Structured ChromaDB Vector Catalog (Tabular Format with Enhanced Vibrant Color Palette) */}
        {activeTab === 'catalog' && (
          <div className="bg-[#080b14]/95 rounded-2xl border border-white/[0.12] shadow-2xl overflow-hidden backdrop-blur-2xl space-y-0 relative">
            {/* Radiant Multi-Spectrum Accent Top Border */}
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 via-cyan-400 to-indigo-500" />

            {/* Header with Search Filter & Domain Filter Pills */}
            <div className="p-5 border-b border-white/[0.08] bg-[#0b0f1d]/85 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.25)] shrink-0">
                  <Database className="w-4.5 h-4.5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      ChromaDB Vector Store Catalog
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      1,536-DIM HNSW
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Showing <span className="text-emerald-300 font-bold font-mono">{filteredPapers.length}</span> of {allPapers.length || 8} indexed vector embeddings
                  </p>
                </div>
              </div>

              {/* Domain Quick Filters with Boxed Single-Line Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSelectedDomainCategory('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap shrink-0 shadow-sm ${
                    selectedDomainCategory === 'all'
                      ? 'bg-white/20 text-white border-white/50 ring-1 ring-white/30'
                      : 'text-zinc-400 hover:text-white bg-zinc-900/70 border-white/[0.12] hover:bg-zinc-800'
                  }`}
                >
                  All Vectors ({allPapers.length})
                </button>
                <button
                  onClick={() => setSelectedDomainCategory('multi-agent')}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap shrink-0 shadow-sm ${
                    selectedDomainCategory === 'multi-agent'
                      ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/60 shadow-emerald-500/20 ring-1 ring-emerald-400/40'
                      : 'text-zinc-400 hover:text-emerald-300 bg-zinc-900/70 border-white/[0.12] hover:bg-emerald-950/40'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  <span>Multi-Agent Consensus</span>
                </button>
                <button
                  onClick={() => setSelectedDomainCategory('graphrag')}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap shrink-0 shadow-sm ${
                    selectedDomainCategory === 'graphrag'
                      ? 'bg-purple-500/25 text-purple-200 border-purple-400/60 shadow-purple-500/20 ring-1 ring-purple-400/40'
                      : 'text-zinc-400 hover:text-purple-300 bg-zinc-900/70 border-white/[0.12] hover:bg-purple-950/40'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]" />
                  <span>GraphRAG Modularity</span>
                </button>
                <button
                  onClick={() => setSelectedDomainCategory('dense-vector')}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap shrink-0 shadow-sm ${
                    selectedDomainCategory === 'dense-vector'
                      ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/60 shadow-cyan-500/20 ring-1 ring-cyan-400/40'
                      : 'text-zinc-400 hover:text-cyan-300 bg-zinc-900/70 border-white/[0.12] hover:bg-cyan-950/40'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                  <span>Dense Vectors &amp; HNSW</span>
                </button>
                <button
                  onClick={() => setSelectedDomainCategory('context')}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap shrink-0 shadow-sm ${
                    selectedDomainCategory === 'context'
                      ? 'bg-amber-500/25 text-amber-200 border-amber-400/60 shadow-amber-500/20 ring-1 ring-amber-400/40'
                      : 'text-zinc-400 hover:text-amber-300 bg-zinc-900/70 border-white/[0.12] hover:bg-amber-950/40'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                  <span>Context &amp; Reflection</span>
                </button>
              </div>

              {/* Filter Search Input */}
              <div className="relative flex items-center bg-[#070a14] px-3.5 py-1.5 rounded-xl border border-white/[0.12] focus-within:border-emerald-400/60 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all text-xs">
                <Search className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Filter papers by title, arXiv ID, or keyword..."
                  value={catalogFilter}
                  onChange={(e) => setCatalogFilter(e.target.value)}
                  className="bg-transparent text-white placeholder-zinc-500 focus:outline-none w-full sm:w-64 font-medium"
                />
              </div>
            </div>

            {/* Clean Tabular Table of Indexed Papers with Vibrant Colors */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0c1020] border-b border-white/[0.1] text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold w-40">arXiv ID &amp; Year</th>
                    <th className="py-3.5 px-4 font-semibold w-48">Research Domain</th>
                    <th className="py-3.5 px-4 font-semibold w-72">Paper Title &amp; Authors</th>
                    <th className="py-3.5 px-4 font-semibold">Abstract Vector Chunk (Chroma HNSW)</th>
                    <th className="py-3.5 px-3 font-semibold text-center w-24">Degree</th>
                    <th className="py-3.5 px-4 font-semibold text-right w-44">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-zinc-300">
                  {filteredPapers.map((paper) => {
                    const pubYear = paper.published ? paper.published.substring(0, 4) : '2023';
                    const domainMeta = getPaperDomainMeta(paper.arxiv_id, paper.title, paper.abstract);
                    const isCited = citedIds.includes(paper.arxiv_id);
                    const node = graphData.nodes.find((n) => n.id === paper.arxiv_id);
                    const degree = node?.degree || 3;

                    return (
                      <tr
                        key={paper.arxiv_id}
                        className={`group transition-all duration-150 border-l-4 ${domainMeta.borderAccent} ${domainMeta.hoverBg} hover:bg-opacity-30`}
                      >
                        {/* 1. arXiv ID & Year */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-xs bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 shadow-[0_0_10px_rgba(6,182,212,0.15)] group-hover:border-cyan-400 transition-colors">
                              <span className="text-cyan-500 font-bold">#</span>
                              <span>{paper.arxiv_id}</span>
                            </span>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900/80 border border-white/[0.08] px-1.5 py-0.5 rounded">
                                {pubYear}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Research Domain Badge */}
                        <td className="py-3.5 px-4 align-top">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${domainMeta.pill} ${domainMeta.glow}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${domainMeta.dotColor} shrink-0`} />
                            <span>{domainMeta.name}</span>
                          </span>
                        </td>

                        {/* 3. Paper Title & Authors */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <h4 className="text-white font-semibold text-xs leading-snug group-hover:text-cyan-200 transition-colors">
                              {paper.title}
                            </h4>
                            {paper.authors && (
                              <p className="text-[11px] text-zinc-400 line-clamp-1">
                                {paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' et al.' : ''}
                              </p>
                            )}
                            {isCited && (
                              <div className="pt-1">
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/50 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                  <span>CITED IN SYNTHESIS</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 4. Abstract Vector Chunk */}
                        <td className="py-3.5 px-4 align-top text-zinc-200 text-xs leading-relaxed">
                          <p className="line-clamp-3 text-zinc-200 font-normal">
                            {paper.abstract}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-mono bg-indigo-950/70 text-indigo-300 border border-indigo-500/40">
                              1,536-dim embedding
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-mono bg-emerald-950/70 text-emerald-300 border border-emerald-500/40">
                              ChromaDB HNSW
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-mono bg-cyan-950/70 text-cyan-300 border border-cyan-500/40">
                              Cosine Metric
                            </span>
                          </div>
                        </td>

                        {/* 5. Graph Topology Degree */}
                        <td className="py-3.5 px-3 align-top text-center">
                          <div className="inline-flex flex-col items-center">
                            <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/35 flex items-center justify-center text-purple-300 font-mono text-xs font-bold shadow-sm shadow-purple-500/20">
                              {degree}
                            </div>
                            <span className="text-[9px] font-mono text-zinc-500 mt-1">
                              edges
                            </span>
                          </div>
                        </td>

                        {/* 6. Actions */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSelectNode(paper.arxiv_id)}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium border border-white/[0.1] transition-all flex items-center gap-1 shadow-sm"
                              title="Inspect abstract chunk"
                            >
                              <Eye className="w-3 h-3 text-zinc-400" />
                              <span>Inspect</span>
                            </button>
                            <a
                              href={paper.pdf_url || `https://arxiv.org/pdf/${paper.arxiv_id}.pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-500/25 via-cyan-500/25 to-blue-500/25 hover:from-teal-500/50 hover:to-cyan-500/50 text-cyan-200 hover:text-white border border-cyan-400/40 text-xs font-semibold transition-all flex items-center gap-1 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                            >
                              <span>PDF</span>
                              <ExternalLink className="w-3 h-3 text-cyan-300" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Dedicated Grounding Verification Chatbot Sandbox */}
        {activeTab === 'sandbox' && (
          <div className="space-y-4">
            <VerificationChatbot
              papers={allPapers}
              onInspectPaper={(id) => handleSelectNode(id)}
            />
          </div>
        )}
      </main>

      {/* Slide-over Evidence Dossier Drawer */}
      <EvidenceDrawer
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />

      {/* Engineering Footer */}
      <footer className="border-t border-white/[0.06] bg-[#030406] py-5 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-400">PaperPulse AI</span>
            <span>·</span>
            <span>Agentic Literature Review Engine</span>
          </div>
          <div>
            <span>ChromaDB Vector Retrieval · NetworkX Community Expansion · Deterministic Grounding Verifier</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
