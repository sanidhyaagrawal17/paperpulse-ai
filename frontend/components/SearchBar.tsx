'use client';

import React, { useState } from 'react';
import {
  Search,
  DownloadCloud,
  SlidersHorizontal,
  Loader2,
  GitFork,
  ArrowRight,
  Database,
  Sparkles,
  X,
  Layers,
  ChevronDown
} from 'lucide-react';

interface SearchBarProps {
  onSearch: (question: string, topK: number, expandNeighbors: boolean, modelPreference: string) => void;
  onIngest: (topic: string, maxResults: number) => void;
  isSearching: boolean;
  isIngesting: boolean;
}

const PRESET_TOPICS = [
  {
    id: 'multi-agent',
    label: 'Multi-Agent Consensus',
    query: 'How do multi-agent collaboration architectures coordinate role specialization to resolve complex problems?'
  },
  {
    id: 'vector-search',
    label: 'Dense Vector Search',
    query: 'How do dense vector index structures like HNSW compare against sparse search for latency and recall?'
  },
  {
    id: 'graphrag',
    label: 'GraphRAG Modularity',
    query: 'How does Graph RAG leverage community clustering and modularity to handle global summarization queries?'
  },
  {
    id: 'self-rag',
    label: 'Self-Reflective RAG',
    query: 'How does Self-RAG evaluate retrieved passage relevance and model claim attribution using reflection tokens?'
  },
  {
    id: 'context-bias',
    label: 'Context Position Bias',
    query: 'How does positional context bias ("Lost in the Middle") affect model factual recall?'
  },
];

const SUGGESTED_INGESTS = [
  'Multi-Agent LLMs',
  'GraphRAG',
  'Self-RAG Reflection',
  'LoRA Fine-Tuning',
  'Speculative Decoding',
  'Vector Database HNSW'
];

export default function SearchBar({
  onSearch,
  onIngest,
  isSearching,
  isIngesting,
}: SearchBarProps) {
  const [activeTopicId, setActiveTopicId] = useState('multi-agent');
  const [question, setQuestion] = useState(PRESET_TOPICS[0].query);
  const [topK, setTopK] = useState(4);
  const [expandNeighbors, setExpandNeighbors] = useState(true);
  const [modelPreference, setModelPreference] = useState('auto');
  const [showParameters, setShowParameters] = useState(false);
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [ingestTopic, setIngestTopic] = useState('');
  const [ingestCount, setIngestCount] = useState(25);

  const handleTopicClick = (topic: typeof PRESET_TOPICS[0]) => {
    setActiveTopicId(topic.id);
    setQuestion(topic.query);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      onSearch(question.trim(), topK, expandNeighbors, modelPreference);
    }
  };

  const handleIngestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const topic = ingestTopic.trim();
    if (topic) {
      onIngest(topic, ingestCount);
      setShowIngestModal(false);
      setIngestTopic('');
    }
  };

  return (
    <div className="w-full space-y-3.5">
      {/* Top Curated Topic Navigation & Ingest Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Curated Research Topic Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
          <span className="text-[11px] font-mono text-zinc-400 font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1.5 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Curated Domains:
          </span>

          <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
            {PRESET_TOPICS.map((topic) => {
              const isSelected = activeTopicId === topic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => handleTopicClick(topic)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-cyan-500/15 text-cyan-200 border-cyan-500/40 shadow-sm shadow-cyan-500/20 font-semibold'
                      : 'bg-[#0e1017]/80 text-zinc-400 border-white/[0.08] hover:bg-zinc-800/80 hover:text-zinc-200 hover:border-white/[0.15]'
                  }`}
                >
                  {topic.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Trigger for arXiv Ingestion */}
        <button
          type="button"
          onClick={() => setShowIngestModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-xl font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 transition-all shadow-sm hover:border-cyan-500/50 shrink-0"
        >
          <DownloadCloud className="w-3.5 h-3.5 text-cyan-400" />
          <span>Ingest from arXiv</span>
        </button>
      </div>

      {/* Unified Commanding Research Bar */}
      <div className="relative">
        <form onSubmit={handleSearchSubmit} className="relative z-10">
          <div className="relative flex items-center bg-[#0a0c14]/95 backdrop-blur-xl rounded-2xl border border-white/[0.12] shadow-2xl focus-within:border-cyan-500/60 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
            <div className="pl-5 text-cyan-400 shrink-0">
              <Search className="w-5 h-5" />
            </div>

            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a literature review question or synthesis objective..."
              className="w-full py-4 pl-3.5 pr-52 sm:pr-56 text-sm bg-transparent text-white placeholder-zinc-500 focus:outline-none font-medium leading-relaxed"
            />

            <div className="absolute right-2.5 flex items-center gap-2 shrink-0">
              {/* Parameters Trigger */}
              <button
                type="button"
                onClick={() => setShowParameters(!showParameters)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono transition-all border whitespace-nowrap shrink-0 ${
                  showParameters
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-zinc-900/80 text-zinc-400 border-white/[0.08] hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Configure Retrieval & Model Parameters"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">k={topK}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showParameters ? 'rotate-180' : ''}`} />
              </button>

              {/* Synthesize Action Button */}
              <button
                type="submit"
                disabled={isSearching || !question.trim()}
                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <span>Synthesize</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Sleek Parameters Popover Panel */}
        {showParameters && (
          <div className="mt-2.5 p-5 rounded-2xl bg-[#0b0d17] border border-white/[0.12] shadow-2xl grid grid-cols-1 md:grid-cols-3 gap-6 text-xs animate-in fade-in slide-in-from-top-2 duration-150 z-20 relative backdrop-blur-2xl">
            {/* Top-K Retrieval Depth */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-zinc-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  Top-k Retrieval Depth:
                </span>
                <span className="font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                  {topK} papers
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="8"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-zinc-500 block leading-tight">
                Controls the number of direct vector chunks fetched from ChromaDB
              </span>
            </div>

            {/* 1-Hop Neighbor Expansion Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-zinc-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <GitFork className="w-3.5 h-3.5 text-indigo-400" />
                  1-Hop Neighbor Expansion:
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={expandNeighbors}
                    onChange={(e) => setExpandNeighbors(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              <span className="text-[10px] text-zinc-500 block leading-tight">
                Expands retrieval to topologically connected papers in NetworkX (cosine similarity &gt; 0.70)
              </span>
            </div>

            {/* Model Engine Selector */}
            <div className="space-y-2">
              <span className="block text-zinc-300 font-medium">Synthesis Engine:</span>
              <select
                value={modelPreference}
                onChange={(e) => setModelPreference(e.target.value)}
                className="w-full bg-zinc-900 border border-white/[0.1] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-cyan-500 text-xs font-mono"
              >
                <option value="auto">Auto (Ollama Local → OpenRouter → Fallback)</option>
                <option value="ollama">Ollama (Local Qwen2.5-Coder)</option>
                <option value="openrouter">OpenRouter API</option>
                <option value="deterministic">Deterministic Grounding Engine</option>
              </select>
              <span className="text-[10px] text-zinc-500 block leading-tight">
                Enforces strict [arXiv:ID] citation constraint verification
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Ingest from arXiv Modal Dialog */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0e1017] border border-white/[0.15] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setShowIngestModal(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <DownloadCloud className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Ingest Research from arXiv
                </h3>
                <p className="text-xs text-zinc-400">
                  Fetches papers via arXiv API, creates embeddings in ChromaDB, and updates NetworkX graph topology.
                </p>
              </div>
            </div>

            <form onSubmit={handleIngestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Research Topic or Search Query:
                </label>
                <input
                  type="text"
                  value={ingestTopic}
                  onChange={(e) => setIngestTopic(e.target.value)}
                  placeholder="e.g. Graph Neural Networks, Speculative Decoding..."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.1] text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-medium"
                  autoFocus
                />
              </div>

              {/* Quick Suggestion Chips */}
              <div>
                <span className="block text-[11px] text-zinc-400 mb-2">Quick topic suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_INGESTS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setIngestTopic(tag)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-[11px] border border-white/[0.06] transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ingest Quantity */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-xs">
                <span className="text-zinc-400">Batch Size:</span>
                <div className="flex items-center gap-2">
                  {[10, 25, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setIngestCount(num)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-medium border transition-all ${
                        ingestCount === num
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-zinc-900 text-zinc-400 border-white/[0.06] hover:text-white'
                      }`}
                    >
                      {num} papers
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isIngesting || !ingestTopic.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-600/25 transition-all disabled:opacity-50"
                >
                  {isIngesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Ingesting Papers...</span>
                    </>
                  ) : (
                    <>
                      <DownloadCloud className="w-3.5 h-3.5" />
                      <span>Start Ingestion</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
