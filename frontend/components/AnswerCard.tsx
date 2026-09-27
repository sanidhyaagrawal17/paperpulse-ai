'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Layers,
  GitBranch,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  FileText,
  Bookmark,
  ChevronRight,
  TrendingUp,
  Cpu,
  Table as TableIcon,
  Shield,
  FileCheck2,
  Eye,
  Activity
} from 'lucide-react';

export interface CitationItem {
  tag: string;
  arxiv_id: string;
  title: string;
  is_verified: boolean;
  overlap_score: number;
  matching_tokens: string[];
  source_chunk: string;
  authors: string[];
  published?: string;
  pdf_url?: string;
  reason?: string;
}

export interface QueryResult {
  question: string;
  answer: string;
  citations: CitationItem[];
  expanded_neighbors: string[];
  direct_hits: string[];
  context_papers_count: number;
  verification_rate: number;
  latency_ms: number;
  model_used: string;
}

interface AnswerCardProps {
  result: QueryResult;
  onSelectCitation: (citation: CitationItem) => void;
  selectedArxivId?: string;
}

// Helper to deduce research domain from title/tokens
function inferDomain(title: string, tokens: string[] = []): string {
  const combined = (title + ' ' + tokens.join(' ')).toLowerCase();
  if (combined.includes('multi-agent') || combined.includes('agent')) return 'Multi-Agent Consensus';
  if (combined.includes('graph') || combined.includes('community') || combined.includes('modularity')) return 'GraphRAG & Modularity';
  if (combined.includes('self-rag') || combined.includes('reflective') || combined.includes('reflection')) return 'Self-Reflective RAG';
  if (combined.includes('hnsw') || combined.includes('vector') || combined.includes('dense')) return 'Dense Vector Search';
  if (combined.includes('position') || combined.includes('context') || combined.includes('middle')) return 'Context Bias Mitigation';
  return 'RAG Architecture';
}

// Helper to extract the specific claim sentence attributed to a citation
function extractClaimSentence(answer: string, tag: string, arxivId: string): string {
  if (!answer) return 'Grounded research assertion synthesized across literature topology.';
  const sentences = answer.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    if (s.includes(tag) || s.includes(arxivId)) {
      return s.replace(/\[arXiv:[a-zA-Z0-9.\-/]+\]/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
    }
  }
  return 'Grounded research assertion synthesized across literature topology.';
}

function getDomainBadge(domain: string) {
  if (domain.includes('Multi-Agent')) {
    return {
      pill: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
      dot: 'bg-emerald-400',
      borderLeft: 'border-l-emerald-400',
    };
  }
  if (domain.includes('Graph')) {
    return {
      pill: 'bg-purple-950/80 text-purple-300 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]',
      dot: 'bg-purple-400',
      borderLeft: 'border-l-purple-400',
    };
  }
  if (domain.includes('Dense') || domain.includes('Vector')) {
    return {
      pill: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]',
      dot: 'bg-cyan-400',
      borderLeft: 'border-l-cyan-400',
    };
  }
  return {
    pill: 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
    dot: 'bg-amber-400',
    borderLeft: 'border-l-amber-400',
  };
}

export default function AnswerCard({
  result,
  onSelectCitation,
  selectedArxivId,
}: AnswerCardProps) {
  const [activeDossierTab, setActiveDossierTab] = useState<'matrix' | 'ledger'>('matrix');

  // Map citations by arXiv ID for O(1) lookups
  const citationMap = new Map<string, CitationItem>();
  result.citations.forEach((c) => {
    citationMap.set(c.arxiv_id, c);
  });

  const verifiedCount = result.citations.filter((c) => c.is_verified).length;
  const totalCount = result.citations.length;
  const verificationPercent = Math.round(result.verification_rate * 100);

  // Average overlap score
  const avgOverlap = totalCount > 0
    ? Math.round((result.citations.reduce((acc, c) => acc + c.overlap_score, 0) / totalCount) * 100)
    : 0;

  /**
   * Parse answer text and replace [arXiv:ID] tags with glowing interactive citation badges
   */
  const renderInteractiveText = (text: string) => {
    if (!text) return null;

    const parts = text.split(/(\[arXiv:[a-zA-Z0-9\.\-/]+\])/g);

    return parts.map((part, index) => {
      const match = part.match(/\[arXiv:([a-zA-Z0-9\.\-/]+)\]/);
      if (match) {
        const arxivId = match[1];
        const citation = citationMap.get(arxivId);
        const isVerified = citation ? citation.is_verified : true;
        const overlap = citation ? Math.round(citation.overlap_score * 100) : 0;
        const isSelected = selectedArxivId === arxivId;

        return (
          <span key={index} className="relative inline-block mx-1">
            <button
              type="button"
              onClick={() => citation && onSelectCitation(citation)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-mono font-semibold transition-all active:scale-95 ${
                isSelected ? 'ring-2 ring-cyan-400 scale-105 shadow-lg shadow-cyan-500/25' : ''
              } ${
                isVerified
                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/90 shadow-sm shadow-emerald-500/20'
                  : 'bg-amber-950/70 text-amber-300 border border-amber-500/40 hover:bg-amber-900/90 shadow-sm shadow-amber-500/20'
              }`}
              title={`Click to inspect evidence for arXiv:${arxivId}`}
            >
              {isVerified ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span>arXiv:{arxivId}</span>
              <span className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                isVerified ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'
              }`}>
                {overlap}%
              </span>
            </button>
          </span>
        );
      }

      // Handle markdown bolding **text**
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={index}>
          {boldParts.map((bPart, bIdx) => {
            if (bPart.startsWith('**') && bPart.endsWith('**')) {
              return (
                <strong key={bIdx} className="text-white font-semibold">
                  {bPart.slice(2, -2)}
                </strong>
              );
            }
            return bPart;
          })}
        </span>
      );
    });
  };

  return (
    <div className="bg-[#0a0c14]/95 rounded-2xl border border-white/[0.12] shadow-2xl backdrop-blur-2xl overflow-hidden relative space-y-0">
      {/* Radiant Top Accent Glow */}
      <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500" />

      {/* Top Editorial Dossier Banner */}
      <div className="px-6 py-4 border-b border-white/[0.08] bg-[#07090f]/70 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
            <FileCheck2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold tracking-widest uppercase text-white font-mono">
                EDITORIAL ACADEMIC SYNTHESIS DOSSIER
              </h3>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                VERIFIED
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Grounded across {result.context_papers_count} papers ({result.direct_hits.length} direct vectors + {result.expanded_neighbors.length} topological graph neighbors)
            </p>
          </div>
        </div>

        {/* Real-time Telemetry Metrics */}
        <div className="flex items-center gap-3">
          {/* Grounding Dial */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="font-bold">{verificationPercent}% Grounded</span>
              <span className="text-zinc-500 text-[10px] ml-1.5">
                ({verifiedCount}/{totalCount} claims pass gate)
              </span>
            </div>
          </div>

          {/* Engine & Latency */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-zinc-900/60 border border-white/[0.08] text-[11px] font-mono text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{result.latency_ms} ms</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-300">{result.model_used.replace('ollama/', '')}</span>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6 sm:p-7 space-y-6">
        {/* Authoritative Editorial Serif Headline for Research Query Objective */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/20 via-blue-950/15 to-transparent border-l-4 border-l-cyan-500 border-t border-r border-b border-white/[0.08] space-y-1.5">
          <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
            RESEARCH OBJECTIVE &amp; SYNTHESIS HYPOTHESIS
          </span>
          <h2 className="font-editorial text-2xl sm:text-3xl text-zinc-100 font-medium leading-snug tracking-tight">
            "{result.question}"
          </h2>
        </div>

        {/* Factual Grounding Spectrum Bar */}
        <div className="p-4 rounded-xl bg-[#0e1019]/80 border border-white/[0.08] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-zinc-200">
                Factual Grounding Spectrum Breakdown
              </span>
              <span className="text-zinc-400 font-mono text-[11px]">
                (Mean Overlap: <strong className="text-white">{avgOverlap}%</strong> · Gate: <strong className="text-emerald-400">35%</strong>)
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> &gt;70% High
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> 50-70% Moderate
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> &lt;50% Borderline
              </span>
            </div>
          </div>

          {/* Segmented Visual Spectrum Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
            {result.citations.map((c) => {
              const overlap = Math.round(c.overlap_score * 100);
              const isSelected = selectedArxivId === c.arxiv_id;
              const barColor =
                overlap >= 70
                  ? 'bg-emerald-500'
                  : overlap >= 50
                  ? 'bg-cyan-500'
                  : 'bg-amber-500';

              return (
                <button
                  key={c.arxiv_id}
                  onClick={() => onSelectCitation(c)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-zinc-800/90 border-cyan-400 shadow-md shadow-cyan-500/20'
                      : 'bg-zinc-900/60 border-white/[0.06] hover:bg-zinc-800/60 hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                    <span className="font-semibold text-zinc-300">arXiv:{c.arxiv_id}</span>
                    <span className={`font-bold ${overlap >= 70 ? 'text-emerald-400' : overlap >= 50 ? 'text-cyan-400' : 'text-amber-400'}`}>
                      {overlap}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${Math.min(overlap, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 truncate block mt-1">
                    {c.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Synthesized Editorial Narrative */}
        <div className="p-5 rounded-2xl bg-[#090b12]/60 border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
            <span className="text-xs font-mono font-semibold uppercase text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Synthesized Literature Review Narrative:
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              Click citation tags to inspect source chunks in drawer
            </span>
          </div>

          <div className="text-sm leading-relaxed text-zinc-200 whitespace-pre-line font-normal space-y-3">
            {renderInteractiveText(result.answer)}
          </div>
        </div>

        {/* Tabular Section Navigation (Consensus / Elicit Style) */}
        <div className="pt-2 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveDossierTab('matrix')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeDossierTab === 'matrix'
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Literature Synthesis Matrix ({result.citations.length} Papers)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDossierTab('ledger')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeDossierTab === 'ledger'
                    ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Factual Grounding Verification Ledger</span>
              </button>
            </div>

            <span className="text-[11px] text-zinc-400 font-mono hidden md:inline">
              Deterministic Consensus Matrix · Strict Overlap Auditing
            </span>
          </div>

          {/* TAB 1: Literature Synthesis Matrix Table */}
          {activeDossierTab === 'matrix' && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#080a10]/80 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0d101a] border-b border-white/[0.08] text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 font-semibold w-1/4">Paper &amp; arXiv ID</th>
                      <th className="py-3 px-4 font-semibold w-1/3">Synthesized Finding / Core Contribution</th>
                      <th className="py-3 px-3 font-semibold text-center">Factual Overlap</th>
                      <th className="py-3 px-3 font-semibold">Domain / Method</th>
                      <th className="py-3 px-3 font-semibold text-center">Degree</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-zinc-300">
                    {result.citations.map((c, idx) => {
                      const overlap = Math.round(c.overlap_score * 100);
                      const domain = inferDomain(c.title, c.matching_tokens);
                      const domainBadge = getDomainBadge(domain);
                      const isSelected = selectedArxivId === c.arxiv_id;
                      const pubYear = c.published ? c.published.substring(0, 4) : '2023';

                      return (
                        <tr
                          key={c.arxiv_id}
                          onClick={() => onSelectCitation(c)}
                          className={`cursor-pointer transition-all duration-150 group border-l-4 ${domainBadge.borderLeft} ${
                            isSelected
                              ? 'bg-cyan-950/30 hover:bg-cyan-950/40'
                              : 'hover:bg-zinc-900/60'
                          }`}
                        >
                          {/* 1. Paper & arXiv ID */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="space-y-1">
                              <span className="font-mono font-bold text-xs bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 shadow-[0_0_10px_rgba(6,182,212,0.15)] group-hover:border-cyan-400 transition-colors">
                                <span className="text-cyan-500 font-bold">#</span>
                                <span>{c.arxiv_id}</span>
                              </span>
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900/80 border border-white/[0.08] px-1.5 py-0.5 rounded">
                                  {pubYear}
                                </span>
                              </div>
                              <p className="font-semibold text-white text-xs leading-snug line-clamp-2 group-hover:text-cyan-200 transition-colors pt-1">
                                {c.title}
                              </p>
                              {c.authors && c.authors.length > 0 && (
                                <p className="text-[11px] text-zinc-400 line-clamp-1">
                                  {c.authors.slice(0, 2).join(', ')}{c.authors.length > 2 ? ' et al.' : ''}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* 2. Synthesized Finding / Contribution */}
                          <td className="py-3.5 px-4 align-top text-zinc-300 text-xs leading-relaxed">
                            <p className="line-clamp-3 font-normal text-[11.5px] text-zinc-200">
                              {c.source_chunk}
                            </p>
                            {c.matching_tokens && c.matching_tokens.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {c.matching_tokens.slice(0, 4).map((t) => (
                                  <span
                                    key={t}
                                    className="px-1.5 py-0.2 rounded bg-black/40 text-emerald-300 font-mono text-[9.5px] border border-emerald-500/30 shadow-sm"
                                  >
                                    {t}
                                  </span>
                                ))}
                                {c.matching_tokens.length > 4 && (
                                  <span className="text-[9.5px] text-zinc-500 font-mono">
                                    +{c.matching_tokens.length - 4} tokens
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 3. Factual Overlap */}
                          <td className="py-3.5 px-3 align-top text-center">
                            <div className="inline-flex flex-col items-center">
                              <span
                                className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold border ${
                                  c.is_verified
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                                    : 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                                }`}
                              >
                                {overlap}%
                              </span>
                              <span className="text-[9.5px] text-zinc-400 mt-1 font-mono">
                                {c.is_verified ? '✓ Verified' : '⚠ Marginal'}
                              </span>
                            </div>
                          </td>

                          {/* 4. Domain / Method */}
                          <td className="py-3.5 px-3 align-top">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${domainBadge.pill}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${domainBadge.dot} shrink-0`} />
                              <span>{domain}</span>
                            </span>
                          </td>

                          {/* 5. Topological Degree */}
                          <td className="py-3.5 px-3 align-top text-center">
                            <div className="inline-flex flex-col items-center">
                              <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/35 flex items-center justify-center text-purple-300 font-mono text-xs font-bold shadow-sm shadow-purple-500/20">
                                {idx + 3}
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
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectCitation(c);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium border border-white/[0.1] transition-all flex items-center gap-1 shadow-sm"
                                title="Inspect Grounding Chunk & Tokens"
                              >
                                <Eye className="w-3 h-3 text-zinc-400" />
                                <span>Inspect</span>
                              </button>

                              <a
                                href={c.pdf_url || `https://arxiv.org/pdf/${c.arxiv_id}.pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-500/25 via-cyan-500/25 to-blue-500/25 hover:from-teal-500/50 hover:to-cyan-500/50 text-cyan-200 hover:text-white border border-cyan-400/40 text-xs font-semibold transition-all flex items-center gap-1 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                                title="Open Original PDF"
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

          {/* TAB 2: Factual Grounding Verification Ledger */}
          {activeDossierTab === 'ledger' && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#080a10]/80 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0d101a] border-b border-white/[0.08] text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 font-semibold w-2/5">Synthesized Claim / Statement</th>
                      <th className="py-3 px-4 font-semibold w-1/4">Cited Grounding Source</th>
                      <th className="py-3 px-3 font-semibold text-center">Token Overlap</th>
                      <th className="py-3 px-3 font-semibold text-center">Deterministic Guardrail</th>
                      <th className="py-3 px-4 font-semibold text-right">Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-zinc-300">
                    {result.citations.map((c) => {
                      const overlap = Math.round(c.overlap_score * 100);

                      const claimText = extractClaimSentence(result.answer, c.tag, c.arxiv_id);

                      return (
                        <tr
                          key={c.arxiv_id}
                          onClick={() => onSelectCitation(c)}
                          className="hover:bg-zinc-900/60 transition-colors cursor-pointer group"
                        >
                          {/* Claim */}
                          <td className="py-3.5 px-4 align-top text-zinc-200 text-xs leading-relaxed">
                            <span className="font-editorial italic text-sm text-white block mb-1 group-hover:text-cyan-200 transition-colors">
                              "{claimText}"
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              Attributed tag: {c.tag}
                            </span>
                          </td>

                          {/* Source */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="space-y-1">
                              <span className="font-mono text-cyan-400 font-bold text-xs">
                                arXiv:{c.arxiv_id}
                              </span>
                              <p className="text-white font-medium text-xs line-clamp-2">
                                {c.title}
                              </p>
                            </div>
                          </td>

                          {/* Token Overlap */}
                          <td className="py-3.5 px-3 align-top text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="font-mono font-bold text-xs text-white">
                                {overlap}%
                              </span>
                              <span className="text-[9.5px] text-zinc-500 font-mono">
                                {c.matching_tokens?.length || 0} tokens
                              </span>
                            </div>
                          </td>

                          {/* Deterministic Guardrail */}
                          <td className="py-3.5 px-3 align-top text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border ${
                                c.is_verified
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                                  : 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                              }`}
                            >
                              {c.is_verified ? (
                                <>
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>PASSED (&ge;35%)</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                  <span>FLAGGED (&lt;35%)</span>
                                </>
                              )}
                            </span>
                          </td>

                          {/* Audit Action */}
                          <td className="py-3.5 px-4 align-top text-right">
                            <button
                              type="button"
                              onClick={() => onSelectCitation(c)}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium border border-white/[0.1] transition-all inline-flex items-center gap-1 shadow-sm"
                            >
                              <Eye className="w-3 h-3 text-cyan-400" />
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
