'use client';

import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  FileText,
  CheckCircle2,
  User,
  Calendar,
  Sparkles,
  Send,
  Loader2,
  Scale
} from 'lucide-react';
import { CitationItem } from './AnswerCard';

interface EvidenceDrawerProps {
  citation: CitationItem | null;
  onClose: () => void;
}

export default function EvidenceDrawer({ citation, onClose }: EvidenceDrawerProps) {
  const [sandboxClaim, setSandboxClaim] = useState('');
  const [sandboxResult, setSandboxResult] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!citation) return null;

  const overlapPercent = Math.round(citation.overlap_score * 100);

  const handleSandboxVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxClaim.trim()) return;

    setIsVerifying(true);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: sandboxClaim.trim(),
          arxiv_id: citation.arxiv_id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSandboxResult(data);
      }
    } catch (err) {
      console.error('Verification error:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] bg-[#0c0e17]/95 border-l border-white/[0.12] shadow-2xl backdrop-blur-2xl flex flex-col animate-in slide-in-from-right duration-250">
      {/* Top Header Bar */}
      <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-zinc-950/70">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-white tracking-wider uppercase block">
              Evidence Dossier
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              arXiv:{citation.arxiv_id}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Close dossier"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
        {/* Verification Status Banner */}
        <div
          className={`p-4 rounded-xl border backdrop-blur-md ${
            citation.is_verified
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              {citation.is_verified ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Grounding Confirmed</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span>Potential Drift Flag</span>
                </>
              )}
            </div>
            <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-md bg-black/50 border border-current">
              {overlapPercent}% Overlap
            </span>
          </div>

          <p className="text-zinc-300 text-[11px] leading-relaxed">
            {citation.is_verified
              ? `The claim sentence matches the source paper's entity vocabulary at ${overlapPercent}%, safely clearing the 35% factual threshold.`
              : `Token intersection against the stored paper chunk is below the 35% threshold (${overlapPercent}%). Flagged as potentially ungrounded.`}
          </p>
        </div>

        {/* Paper Details */}
        <div className="space-y-2.5 bg-zinc-900/40 p-4 rounded-xl border border-white/[0.06]">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-blue-400 font-bold">
              arXiv:{citation.arxiv_id}
            </span>
            {citation.published && (
              <span className="text-zinc-400 flex items-center gap-1 font-mono">
                <Calendar className="w-3 h-3 text-zinc-500" />
                {citation.published.split('T')[0]}
              </span>
            )}
          </div>

          <h3 className="text-sm font-semibold text-white leading-snug">
            {citation.title}
          </h3>

          {citation.authors && citation.authors.length > 0 && (
            <div className="flex items-start gap-1.5 text-zinc-400 text-[11px] pt-1 border-t border-white/[0.04]">
              <User className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{citation.authors.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Grounding Lexical Tokens */}
        {citation.matching_tokens && citation.matching_tokens.length > 0 && (
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300 font-semibold text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Deterministic Grounding Tokens
              </span>
              <span className="font-mono text-[10px] text-emerald-400">
                {citation.matching_tokens.length} matched
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {citation.matching_tokens.map((token) => (
                <span
                  key={token}
                  className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] flex items-center gap-1 shadow-sm"
                >
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                  {token}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stored ChromaDB Chunk */}
        <div className="space-y-2">
          <span className="text-zinc-300 font-semibold text-xs block">
            Stored Abstract Chunk (ChromaDB Vector Memory):
          </span>
          <div className="p-4 rounded-xl bg-[#090a10] border border-white/[0.08] text-zinc-300 font-normal leading-relaxed text-[11px] max-h-52 overflow-y-auto">
            {citation.source_chunk}
          </div>
        </div>

        {/* Interactive Claim Grounding Sandbox */}
        <div className="p-4 rounded-xl bg-gradient-to-b from-blue-950/20 to-zinc-900/40 border border-blue-500/20 space-y-3">
          <div className="flex items-center gap-1.5 text-blue-300 font-semibold text-xs">
            <Scale className="w-3.5 h-3.5 text-blue-400" />
            <span>Interactive Verification Sandbox</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Type any claim to test deterministic grounding against this paper in real time:
          </p>

          <form onSubmit={handleSandboxVerify} className="space-y-2">
            <textarea
              rows={2}
              value={sandboxClaim}
              onChange={(e) => setSandboxClaim(e.target.value)}
              placeholder="e.g. Models reduce hallucinations by querying parametric dense vectors..."
              className="w-full p-2.5 rounded-lg bg-zinc-950/80 border border-white/[0.1] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isVerifying || !sandboxClaim.trim()}
              className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Overlap...</span>
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  <span>Verify Claim Overlap</span>
                </>
              )}
            </button>
          </form>

          {sandboxResult && (
            <div
              className={`p-3 rounded-lg border text-[11px] space-y-1 ${
                sandboxResult.is_verified
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span>{sandboxResult.is_verified ? '✓ Verified' : '⚠ Rejected / Low Overlap'}</span>
                <span className="font-mono">{Math.round(sandboxResult.overlap_score * 100)}%</span>
              </div>
              <p className="text-zinc-300 text-[10px]">{sandboxResult.reason}</p>
              {sandboxResult.matching_tokens && sandboxResult.matching_tokens.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {sandboxResult.matching_tokens.map((t: string) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-black/40 text-[9px] font-mono">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* External Links */}
        <div className="pt-2 flex gap-3">
          <a
            href={`https://arxiv.org/abs/${citation.arxiv_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-colors border border-white/[0.08]"
          >
            <span>arXiv Abstract</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </a>

          <a
            href={citation.pdf_url || `https://arxiv.org/pdf/${citation.arxiv_id}.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors shadow-lg shadow-blue-600/30"
          >
            <span>Read PDF</span>
            <ExternalLink className="w-3.5 h-3.5 text-white/80" />
          </a>
        </div>
      </div>
    </div>
  );
}
