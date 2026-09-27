'use client';

import React from 'react';
import {
  Database,
  Network,
  ShieldCheck,
  Github,
  Cpu
} from 'lucide-react';

interface StatsHeaderProps {
  paperCount: number;
  graphNodes: number;
  graphEdges: number;
  density: number;
  activeModel?: string;
}

export default function StatsHeader({
  paperCount,
  graphNodes,
  graphEdges,
  density,
  activeModel = 'Deterministic Grounding Engine',
}: StatsHeaderProps) {
  return (
    <header className="border-b border-white/[0.08] bg-[#06070a]/95 backdrop-blur-2xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 py-2 flex items-center justify-between gap-3">
        {/* Left: Brand & Identity with New AI Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative group">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-cyan-500/40 shadow-md shadow-cyan-500/20 bg-[#08090f] flex items-center justify-center p-0.5">
              <img
                src="/logo.png"
                alt="PaperPulse AI Logo"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white whitespace-nowrap">
              PaperPulse AI
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-mono tracking-wider font-bold uppercase bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 whitespace-nowrap">
              ENGINE
            </span>
          </div>
        </div>

        {/* Right: Consolidated Telemetry + Status + GitHub */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 text-xs">
          {/* Streamlined Boxed Telemetry Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0b0d14]/90 border border-white/[0.1] text-zinc-300 font-mono text-[11px] whitespace-nowrap shadow-sm">
            <div className="flex items-center gap-1 text-cyan-300">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold">{paperCount}</span>
              <span className="text-zinc-500">vec</span>
            </div>
            <span className="text-zinc-600">·</span>
            <div className="flex items-center gap-1 text-purple-300">
              <Network className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-bold">{graphNodes}</span>
              <span className="text-zinc-500">nodes</span>
            </div>
            <span className="text-zinc-600">·</span>
            <div className="flex items-center gap-1 text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold">35% gate</span>
            </div>
          </div>

          {/* Model Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-zinc-300 text-[11px] font-mono whitespace-nowrap">
            <Cpu className="w-3 h-3 text-purple-400" />
            <span>{activeModel.replace('ollama/', '')}</span>
          </div>

          {/* Engine Status Light */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-[11px] text-zinc-300 font-mono whitespace-nowrap shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-semibold">Ready</span>
          </div>

          {/* GitHub Link */}
          <a
            href="https://github.com/sanidhyaagrawal17/paperpulse-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.08] hover:border-white/[0.2] transition-all text-xs font-medium whitespace-nowrap shrink-0"
            title="GitHub Repository"
          >
            <Github className="w-3.5 h-3.5 text-zinc-300" />
            <span className="hidden sm:inline font-mono text-[11px]">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
