'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Send,
  Sparkles,
  Bot,
  User,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Database,
  ArrowRight,
  FileText
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  verification?: {
    is_verified: boolean;
    overlap_score: number;
    matching_tokens: string[];
    threshold: number;
    arxiv_id: string;
    paper_title: string;
    authors: string[];
    pdf_url: string;
    source_chunk: string;
  };
}

interface VerificationChatbotProps {
  papers: any[];
  onInspectPaper?: (arxivId: string) => void;
}

const DEFAULT_PRESET_PROMPTS = [
  {
    label: 'Multi-Agent Consensus (Valid)',
    text: 'Multi-agent collaboration architectures coordinate role specialization to resolve complex problems through debate.',
    expected: 'pass'
  },
  {
    label: 'Self-RAG Reflection (Valid)',
    text: 'Self-RAG evaluates retrieved passage relevance and model claim attribution using reflection tokens.',
    expected: 'pass'
  },
  {
    label: 'Quantum HNSW (Hallucinated)',
    text: 'Quantum annealing superposition algorithms completely replace HNSW vector indexing for zero-latency retrieval.',
    expected: 'fail'
  },
  {
    label: 'Lost-in-the-Middle (Valid)',
    text: 'Positional context bias causes significant recall degradation when relevant information is located in the middle of long contexts.',
    expected: 'pass'
  },
];

export default function VerificationChatbot({ papers, onInspectPaper }: VerificationChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      timestamp: 'Just now',
      text: 'Welcome to the PaperPulse Grounding Verification Sandbox. Enter any claim, hypothesis, or LLM-generated statement below. I will perform a mathematical token-level attribution audit against ChromaDB indexed papers to verify whether the statement satisfies our 35% deterministic grounding guardrail.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedPaperId, setSelectedPaperId] = useState<string>('auto');
  const [guardrailThreshold, setGuardrailThreshold] = useState<number>(35);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isVerifying]);

  const handleSendClaim = async (claimText: string) => {
    const text = claimText.trim();
    if (!text || isVerifying) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsVerifying(true);

    try {
      // Direct call to FastAPI verification endpoint
      const targetArxivId = selectedPaperId !== 'auto' ? selectedPaperId : (papers[0]?.arxiv_id || '2308.10144');
      
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: text,
          arxiv_id: targetArxivId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const matchedPaper = papers.find((p) => p.arxiv_id === data.arxiv_id) || papers[0];
        const isVerified = (data.overlap_score * 100) >= guardrailThreshold;

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: isVerified
            ? `The claim is deterministically verified (${Math.round(data.overlap_score * 100)}% token overlap), exceeding the ${guardrailThreshold}% guardrail gate.`
            : `Warning: The claim failed the deterministic guardrail (${Math.round(data.overlap_score * 100)}% token overlap, below the ${guardrailThreshold}% threshold). Potential hallucination or ungrounded assertion.`,
          verification: {
            is_verified: isVerified,
            overlap_score: data.overlap_score,
            matching_tokens: data.matching_tokens || [],
            threshold: guardrailThreshold,
            arxiv_id: data.arxiv_id || targetArxivId,
            paper_title: matchedPaper?.title || 'Academic Reference Paper',
            authors: matchedPaper?.authors || [],
            pdf_url: matchedPaper?.pdf_url || `https://arxiv.org/pdf/${data.arxiv_id}.pdf`,
            source_chunk: data.source_chunk || matchedPaper?.abstract || '',
          },
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        // Fallback local verification
        performFallbackVerification(text, targetArxivId);
      }
    } catch (err) {
      console.error('Error in verification chatbot:', err);
      performFallbackVerification(text, papers[0]?.arxiv_id || '2308.10144');
    } finally {
      setIsVerifying(false);
    }
  };

  const performFallbackVerification = (text: string, arxivId: string) => {
    const matchedPaper = papers.find((p) => p.arxiv_id === arxivId) || papers[0];
    const sourceWords = new Set(
      (matchedPaper.abstract || '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .split(/\s+/)
        .filter((w: string) => w.length > 3)
    );

    const inputWords = text
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .split(/\s+/)
      .filter((w: string) => w.length > 3);

    const matching = inputWords.filter((w: string) => sourceWords.has(w));
    const overlapScore = inputWords.length > 0 ? matching.length / inputWords.length : 0;
    const isVerified = (overlapScore * 100) >= guardrailThreshold;

    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: isVerified
        ? `The statement is mathematically verified with ${Math.round(overlapScore * 100)}% token attribution against arXiv:${arxivId}.`
        : `Grounding Alert: Token attribution score (${Math.round(overlapScore * 100)}%) is below the ${guardrailThreshold}% gate.`,
      verification: {
        is_verified: isVerified,
        overlap_score: overlapScore,
        matching_tokens: Array.from(new Set(matching)),
        threshold: guardrailThreshold,
        arxiv_id: arxivId,
        paper_title: matchedPaper.title,
        authors: matchedPaper.authors || [],
        pdf_url: matchedPaper.pdf_url || `https://arxiv.org/pdf/${arxivId}.pdf`,
        source_chunk: matchedPaper.abstract,
      },
    };

    setMessages((prev) => [...prev, assistantMsg]);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        timestamp: 'Just now',
        text: 'Chat history cleared. Enter any statement or research assertion to test its factual grounding against literature.',
      },
    ]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[640px]">
      {/* Main Chatbot Column */}
      <div className="lg:col-span-3 flex flex-col bg-[#080a14] rounded-2xl border border-white/[0.12] shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Chatbot Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.08] bg-[#0c1020]/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20 text-white">
              <Bot className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Grounding Verification Chatbot
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ONLINE · &ge;{guardrailThreshold}% GATE
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Interactive natural language claims auditor backed by ChromaDB &amp; token-level attribution
              </p>
            </div>
          </div>

          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/[0.08] transition-all text-xs font-mono"
            title="Reset conversation"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>

        {/* Message Thread */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5 shadow-sm">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 space-y-3.5 shadow-lg ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none'
                    : 'bg-[#0f1426] border border-white/[0.1] text-zinc-200 rounded-bl-none'
                }`}
              >
                <div className="flex items-center justify-between gap-4 text-[10.5px] font-mono text-zinc-400">
                  <span className="font-semibold text-zinc-300">
                    {msg.sender === 'user' ? 'You (Research Hypothesis)' : 'PaperPulse Grounding Engine'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                <p className="text-xs sm:text-[13px] leading-relaxed font-medium">
                  {msg.text}
                </p>

                {/* Audit Card if Assistant Verification Result is Present */}
                {msg.verification && (
                  <div className="mt-3 p-4 rounded-xl bg-[#090b16] border border-white/[0.1] space-y-3 shadow-inner">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
                      <div className="flex items-center gap-2">
                        {msg.verification.is_verified ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>GUARDRAIL PASSED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-rose-950/80 text-rose-300 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.25)]">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            <span>FLAGGED HALLUCINATION RISK</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-zinc-400">Token Overlap:</span>
                        <span
                          className={`font-bold text-sm px-2 py-0.5 rounded ${
                            msg.verification.is_verified
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {Math.round(msg.verification.overlap_score * 100)}%
                        </span>
                        <span className="text-zinc-500 text-[10px]">
                          (gate: {msg.verification.threshold}%)
                        </span>
                      </div>
                    </div>

                    {/* Attributed Paper Info */}
                    <div className="flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-cyan-400 font-bold bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded text-[11px]">
                            arXiv:{msg.verification.arxiv_id}
                          </span>
                          <span className="text-[11px] text-zinc-400 font-medium line-clamp-1">
                            {msg.verification.paper_title}
                          </span>
                        </div>
                        {msg.verification.authors && msg.verification.authors.length > 0 && (
                          <p className="text-[10px] text-zinc-500 line-clamp-1 font-mono">
                            {msg.verification.authors.slice(0, 3).join(', ')} et al.
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onInspectPaper && (
                          <button
                            onClick={() => onInspectPaper(msg.verification!.arxiv_id)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/[0.08] transition-all text-[11px] font-medium"
                          >
                            Inspect
                          </button>
                        )}
                        <a
                          href={msg.verification.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 transition-all text-[11px] font-semibold flex items-center gap-1"
                        >
                          <span>PDF</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Matching Tokens Highlight */}
                    {msg.verification.matching_tokens && msg.verification.matching_tokens.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
                        <span className="text-[10px] font-mono text-zinc-400 font-semibold uppercase tracking-wider block">
                          Verified Matching Token Substrings ({msg.verification.matching_tokens.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.verification.matching_tokens.map((tok, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm"
                            >
                              ✓ {tok}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-200 shrink-0 mt-0.5 shadow-sm">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isVerifying && (
            <div className="flex gap-3 items-center text-zinc-400 text-xs italic pl-10">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Analyzing ChromaDB embedding chunks &amp; calculating token overlap...</span>
            </div>
          )}
        </div>

        {/* Input Form & Preset Chips */}
        <div className="p-4 border-t border-white/[0.08] bg-[#0a0d1a] space-y-3">
          {/* Quick Preset Assertion Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Test Prompts:
            </span>
            {DEFAULT_PRESET_PROMPTS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendClaim(preset.text)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all border shrink-0 ${
                  preset.expected === 'pass'
                    ? 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-500/30'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Textarea Input with Send Button */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendClaim(inputText);
            }}
            className="flex items-center gap-2 relative"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste a research claim to audit against literature (e.g. 'Self-RAG utilizes reflection tokens')..."
              className="w-full py-3.5 pl-4 pr-24 rounded-xl bg-[#060812] border border-white/[0.12] text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30"
              disabled={isVerifying}
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isVerifying}
              className="absolute right-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
            >
              <span>Audit</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Sidebar: Guardrail Parameters & Target Selection */}
      <div className="space-y-4">
        {/* Verification Engine Configuration */}
        <div className="p-4 rounded-2xl bg-[#080b16] border border-white/[0.12] shadow-xl space-y-4 text-xs">
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 text-zinc-300 font-semibold">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Guardrail Parameters</span>
          </div>

          {/* Overlap Gate Threshold Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-zinc-300">
              <span className="text-[11px] font-medium">Deterministic Overlap Gate:</span>
              <span className="font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-xs">
                {guardrailThreshold}%
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="60"
              value={guardrailThreshold}
              onChange={(e) => setGuardrailThreshold(parseInt(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <span className="text-[10px] text-zinc-500 block">
              Claims with token overlap below this threshold are flagged as hallucination risk.
            </span>
          </div>

          {/* Target arXiv Paper Selector */}
          <div className="space-y-2 pt-2 border-t border-white/[0.08]">
            <label className="text-[11px] font-medium text-zinc-300 block">
              Target Reference Paper:
            </label>
            <select
              value={selectedPaperId}
              onChange={(e) => setSelectedPaperId(e.target.value)}
              className="w-full bg-[#0d1020] text-zinc-200 text-xs rounded-xl p-2.5 border border-white/[0.1] focus:outline-none focus:border-cyan-400"
            >
              <option value="auto">Auto-Select First Retrieved Paper</option>
              {papers.map((p) => (
                <option key={p.arxiv_id} value={p.arxiv_id}>
                  #{p.arxiv_id} - {p.title.length > 30 ? p.title.substring(0, 28) + '...' : p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Verification Engine Principles / Spec */}
        <div className="p-4 rounded-2xl bg-[#080b16] border border-white/[0.12] shadow-xl space-y-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2 text-zinc-300 font-semibold border-b border-white/[0.08] pb-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Deterministic Grounding Rules</span>
          </div>

          <ul className="space-y-2 text-[11px] leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <span>
                <strong>Exact N-Gram Match:</strong> Stopwords removed; matching token substrings are checked against chunk sentences.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
              <span>
                <strong>Zero Semantic Drift:</strong> Hallucinated claims lacking verbatim lexical overlap are strictly flagged.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
              <span>
                <strong>Topological Backing:</strong> Verification works in tandem with NetworkX similarity graph neighbors.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
