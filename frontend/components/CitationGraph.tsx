'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Search,
  Sliders,
  Crosshair,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Maximize2,
  Play,
  Pause,
  Layers,
  LayoutGrid
} from 'lucide-react';

export interface GraphNode {
  id: string;
  title: string;
  authors: string[];
  published: string;
  x: number;
  y: number;
  degree: number;
  cluster: number;
  pdf_url?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

interface CitationGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  citedPaperIds: string[];
  selectedArxivId?: string;
  onSelectNode: (arxivId: string) => void;
}

// 4 Thematic Domain Clusters
export const CLUSTER_CONFIGS = [
  {
    id: 0,
    name: 'Multi-Agent',
    fullName: 'Multi-Agent Consensus',
    sectorTitle: '// SECTOR 01: MULTI-AGENT ARCHITECTURES',
    color: '#10b981',       // Emerald
    glow: 'rgba(16, 185, 129, 0.35)',
    boxBg: 'rgba(16, 185, 129, 0.05)',
    boxBorder: 'rgba(16, 185, 129, 0.35)',
  },
  {
    id: 1,
    name: 'GraphRAG',
    fullName: 'GraphRAG Modularity',
    sectorTitle: '// SECTOR 02: GRAPHRAG TOPOLOGY',
    color: '#a855f7',       // Purple
    glow: 'rgba(168, 85, 247, 0.35)',
    boxBg: 'rgba(168, 85, 247, 0.05)',
    boxBorder: 'rgba(168, 85, 247, 0.35)',
  },
  {
    id: 2,
    name: 'Dense Vectors',
    fullName: 'Dense Vectors & HNSW',
    sectorTitle: '// SECTOR 03: DENSE VECTORS & HNSW',
    color: '#06b6d4',       // Cyan
    glow: 'rgba(6, 182, 212, 0.35)',
    boxBg: 'rgba(6, 182, 212, 0.05)',
    boxBorder: 'rgba(6, 182, 212, 0.35)',
  },
  {
    id: 3,
    name: 'Context Tuning',
    fullName: 'Context & Attention Gating',
    sectorTitle: '// SECTOR 04: CONTEXT & ATTENTION GATING',
    color: '#f59e0b',       // Amber
    glow: 'rgba(245, 158, 11, 0.35)',
    boxBg: 'rgba(245, 158, 11, 0.05)',
    boxBorder: 'rgba(245, 158, 11, 0.35)',
  },
];

interface SimulationNode extends GraphNode {
  vx: number;
  vy: number;
  curX: number;
  curY: number;
  physicsX: number;
  physicsY: number;
  boxX: number;
  boxY: number;
  isDragging?: boolean;
}

// Pre-render glowing photon sprite offscreen for locked 60 FPS performance
function createOffscreenPhotonSprite(): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = 32;
  sprite.height = 32;
  const sCtx = sprite.getContext('2d');
  if (sCtx) {
    const grad = sCtx.createRadialGradient(16, 16, 2, 16, 16, 14);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.3, 'rgba(56, 189, 248, 0.85)');
    grad.addColorStop(0.7, 'rgba(16, 185, 129, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.beginPath();
    sCtx.arc(16, 16, 14, 0, Math.PI * 2);
    sCtx.fill();
  }
  return sprite;
}

export default function CitationGraph({
  nodes,
  edges,
  citedPaperIds,
  selectedArxivId,
  onSelectNode,
}: CitationGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);

  // Simulation state
  const simNodesRef = useRef<SimulationNode[]>([]);
  const isDraggingNodeRef = useRef<SimulationNode | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const clickedCandidateRef = useRef<SimulationNode | null>(null);

  // Pre-rendered photon sprite ref
  const photonSpriteRef = useRef<HTMLCanvasElement | null>(null);

  // Camera & viewport
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Interactive controls
  const [searchQuery, setSearchQuery] = useState('');
  const [minSimilarity, setMinSimilarity] = useState(0.40);
  const [activeClusterFilter, setActiveClusterFilter] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimulationNode | null>(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState({ x: 0, y: 0 });
  const [enablePhysics, setEnablePhysics] = useState(true);
  const [focusCitedOnly, setFocusCitedOnly] = useState(false);

  const citedSet = useMemo(() => new Set(citedPaperIds), [citedPaperIds]);

  // Card Dimensions (Classic tactile design: 215px x 58px)
  const CARD_W = 215;
  const CARD_H = 58;

  // Initialize pre-rendered sprite once
  useEffect(() => {
    if (typeof window !== 'undefined' && !photonSpriteRef.current) {
      photonSpriteRef.current = createOffscreenPhotonSprite();
    }
  }, []);

  // Initialize or update simulation nodes with both Physics constellation & Boxed sector targets
  useEffect(() => {
    const existingMap = new Map<string, SimulationNode>();
    simNodesRef.current.forEach((n) => existingMap.set(n.id, n));

    const totalNodes = nodes.length || 8;
    const clusterCounters = new Map<number, number>();

    simNodesRef.current = nodes.map((node, idx) => {
      const existing = existingMap.get(node.id);
      const clusterIdx = node.cluster % 4;
      const countInCluster = clusterCounters.get(clusterIdx) || 0;
      clusterCounters.set(clusterIdx, countInCluster + 1);

      // 1. Constellation elliptical physics coordinate
      const angle = (idx / Math.max(totalNodes, 1)) * 2 * Math.PI - Math.PI / 2;
      const defaultPhysicsX = 540 + 310 * Math.cos(angle);
      const defaultPhysicsY = 320 + 190 * Math.sin(angle);

      // 2. Classified box slot coordinate (4 distinct structured domain columns)
      const boxColX = 180 + clusterIdx * 255;
      const boxRowY = 175 + countInCluster * 78;

      const pX = existing ? existing.physicsX : defaultPhysicsX;
      const pY = existing ? existing.physicsY : defaultPhysicsY;

      return {
        ...node,
        curX: existing ? existing.curX : pX,
        curY: existing ? existing.curY : pY,
        physicsX: pX,
        physicsY: pY,
        boxX: boxColX,
        boxY: boxRowY,
        vx: existing ? existing.vx : 0,
        vy: existing ? existing.vy : 0,
      };
    });
  }, [nodes]);

  // Filter edges based on similarity, cluster, and cited focus
  const filteredEdges = useMemo(() => {
    return edges.filter((e) => {
      if (e.weight < minSimilarity) return false;
      if (focusCitedOnly && (!citedSet.has(e.source) || !citedSet.has(e.target))) {
        return false;
      }
      if (activeClusterFilter !== null) {
        const sNode = simNodesRef.current.find((n) => n.id === e.source);
        const tNode = simNodesRef.current.find((n) => n.id === e.target);
        if (sNode?.cluster !== activeClusterFilter && tNode?.cluster !== activeClusterFilter) {
          return false;
        }
      }
      return true;
    });
  }, [edges, minSimilarity, focusCitedOnly, citedSet, activeClusterFilter]);

  // 1-Hop neighbors for focus mode
  const activeFocusId = selectedArxivId || hoveredNode?.id;
  const connectedNeighborIds = useMemo(() => {
    const set = new Set<string>();
    if (activeFocusId) {
      set.add(activeFocusId);
      filteredEdges.forEach((e) => {
        if (e.source === activeFocusId) set.add(e.target);
        if (e.target === activeFocusId) set.add(e.source);
      });
    }
    return set;
  }, [activeFocusId, filteredEdges]);

  // Center camera on initial load
  const resetView = useCallback(() => {
    if (containerRef.current) {
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const fitScale = Math.min(w / 1100, h / 660, 1.0);
      setScale(fitScale);
      setOffset({
        x: (w - 1080 * fitScale) / 2,
        y: (h - 640 * fitScale) / 2,
      });
    }
  }, []);

  useEffect(() => {
    resetView();
  }, [resetView]);

  // Smooth Physics step or Box Classification ease
  const stepPhysics = useCallback(() => {
    const simNodes = simNodesRef.current;
    const n = simNodes.length;
    if (n === 0) return;

    if (enablePhysics) {
      // --- MODE A: ACTIVE FLUID PHYSICS (Calibrated & Smooth, Zero Jitter) ---
      // 1. Soft Elliptical Repulsion (Cards repel like magnetic cushions without jitter)
      for (let i = 0; i < n; i++) {
        const a = simNodes[i];
        for (let j = i + 1; j < n; j++) {
          const b = simNodes[j];
          const dx = b.curX - a.curX;
          const dy = b.curY - a.curY;

          // Normalized elliptical distance reflecting the 215x58 card aspect ratio
          const normDist = Math.sqrt((dx * 0.42) ** 2 + dy ** 2) || 1;
          const minNormDist = 72; // Safe separation envelope

          if (normDist < minNormDist) {
            const overlapRatio = (minNormDist - normDist) / minNormDist;
            // Gentle acceleration force (never teleports position!)
            const force = overlapRatio * 0.95;
            const fx = (dx / (Math.abs(dx) + 12)) * force * 1.5;
            const fy = (dy / (Math.abs(dy) + 12)) * force;

            if (!a.isDragging) {
              a.vx -= fx;
              a.vy -= fy;
            }
            if (!b.isDragging) {
              b.vx += fx;
              b.vy += fy;
            }
          }
        }
      }

      // 2. Edge Spring Attraction (Hooke's Law)
      filteredEdges.forEach((edge) => {
        const source = simNodes.find((nd) => nd.id === edge.source);
        const target = simNodes.find((nd) => nd.id === edge.target);
        if (!source || !target) return;

        const dx = target.curX - source.curX;
        const dy = target.curY - source.curY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const desiredDist = 310 + (1.0 - edge.weight) * 90;
        const springForce = (dist - desiredDist) * 0.0018;

        const fx = (dx / dist) * springForce;
        const fy = (dy / dist) * springForce;

        if (!source.isDragging) {
          source.vx += fx;
          source.vy += fy;
        }
        if (!target.isDragging) {
          target.vx -= fx;
          target.vy -= fy;
        }
      });

      // 3. Center Gravity, Velocity Clamping & Damping
      for (let i = 0; i < n; i++) {
        const node = simNodes[i];
        if (node.isDragging) {
          node.vx = 0;
          node.vy = 0;
          continue;
        }

        // Gentle centering pull
        const cDx = 540 - node.curX;
        const cDy = 320 - node.curY;
        node.vx += cDx * 0.0008;
        node.vy += cDy * 0.0008;

        // Heavy damping & velocity clamping (prevents oscillation)
        node.vx = Math.max(-4.5, Math.min(4.5, node.vx)) * 0.82;
        node.vy = Math.max(-4.5, Math.min(4.5, node.vy)) * 0.82;

        if (Math.abs(node.vx) < 0.02) node.vx = 0;
        if (Math.abs(node.vy) < 0.02) node.vy = 0;

        node.curX += node.vx;
        node.curY += node.vy;

        // Save last active physics coordinates
        node.physicsX = node.curX;
        node.physicsY = node.curY;
      }
    } else {
      // --- MODE B: PHYSICS OFF -> SMOOTHLY GLIDE INTO STRUCTURED SECTOR BOXES ---
      for (let i = 0; i < n; i++) {
        const node = simNodes[i];
        if (node.isDragging) continue;

        // Smooth cubic-like easing to its designated box coordinate
        node.curX += (node.boxX - node.curX) * 0.12;
        node.curY += (node.boxY - node.curY) * 0.12;
        node.vx = 0;
        node.vy = 0;
      }
    }
  }, [enablePhysics, filteredEdges]);

  // Main 60 FPS Render Loop
  const draw = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const now = timestamp * 0.001;

      stepPhysics();

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // Deep obsidian void background
      ctx.fillStyle = '#060810';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);

      // Background ambient cosmic grid
      const gridSize = 50;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.022)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= 1200; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 800);
      }
      for (let y = 0; y <= 800; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(1200, y);
      }
      ctx.stroke();

      const simNodes = simNodesRef.current;
      const nodeMap = new Map<string, SimulationNode>();
      simNodes.forEach((n) => nodeMap.set(n.id, n));

      // --- 1. RENDER STRUCTURED SECTOR BOXES WHEN PHYSICS IS OFF ---
      if (!enablePhysics) {
        for (let s = 0; s < 4; s++) {
          const cfg = CLUSTER_CONFIGS[s];
          const colX = 180 + s * 255;
          const sNodes = simNodes.filter((n) => (n.cluster % 4) === s);
          const boxHeight = Math.max(380, sNodes.length * 80 + 130);

          // Sector container box
          ctx.fillStyle = cfg.boxBg;
          ctx.strokeStyle = cfg.boxBorder;
          ctx.lineWidth = 1.2;

          ctx.beginPath();
          ctx.roundRect(colX - CARD_W / 2 - 14, 110, CARD_W + 28, boxHeight, 16);
          ctx.fill();
          ctx.stroke();

          // Sector Header Tag
          ctx.font = '700 9.5px JetBrains Mono, monospace';
          ctx.fillStyle = cfg.color;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(cfg.sectorTitle, colX - CARD_W / 2 - 4, 122);

          // Paper Count Subtitle
          ctx.font = '500 8.5px JetBrains Mono, monospace';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fillText(`${sNodes.length} INDEXED PAPERS`, colX - CARD_W / 2 - 4, 137);
        }
      }

      // --- 2. RENDER ENERGY EDGES & PRE-RENDERED FLOWING PARTICLES ---
      filteredEdges.forEach((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) return;

        const isConnectedToFocus =
          activeFocusId && (edge.source === activeFocusId || edge.target === activeFocusId);
        const isDimmed =
          activeFocusId && !isConnectedToFocus && !connectedNeighborIds.has(edge.source);

        // Edge line
        ctx.beginPath();
        ctx.moveTo(source.curX, source.curY);
        ctx.lineTo(target.curX, target.curY);

        if (isConnectedToFocus) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
          ctx.lineWidth = 2.4;
        } else {
          const alpha = isDimmed ? 0.05 : 0.22 + (edge.weight - 0.4) * 0.45;
          ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
          ctx.lineWidth = 1.2;
        }
        ctx.stroke();

        // High-performance Flowing Photon Pulse using Pre-Rendered Sprite
        if (!isDimmed && photonSpriteRef.current) {
          const pulseCount = edge.weight >= 0.68 ? 2 : 1;
          const speed = 0.4 + edge.weight * 0.6;

          for (let p = 0; p < pulseCount; p++) {
            const t = (now * speed + p / pulseCount) % 1;
            const px = (1 - t) * source.curX + t * target.curX;
            const py = (1 - t) * source.curY + t * target.curY;

            // Draw pre-rendered glowing photon sprite (zero canvas blur cost!)
            ctx.drawImage(photonSpriteRef.current, px - 16, py - 16, 32, 32);
          }
        }

        // --- 3. HIGH-CONTRAST, CRISP SIMILARITY BADGE (FIX VISIBILITY) ---
        const edgeLength = Math.hypot(target.curX - source.curX, target.curY - source.curY);
        // Only draw similarity badge if cards are sufficiently separated (>155px) to prevent colliding with card bodies
        if (edgeLength >= 155 && !isDimmed) {
          const midX = (source.curX + target.curX) / 2;
          const midY = (source.curY + target.curY) / 2;
          const simPct = `${Math.round(edge.weight * 100)}% Sim`;

          ctx.font = '700 10.5px JetBrains Mono, monospace';
          const txtW = ctx.measureText(simPct).width;
          const bW = txtW + 12;
          const bH = 17;

          // Solid opaque dark background so text is 100% decipherable
          ctx.fillStyle = '#080a14';
          ctx.strokeStyle = isConnectedToFocus
            ? '#38bdf8'
            : edge.weight >= 0.70
            ? '#10b981'
            : edge.weight >= 0.52
            ? '#06b6d4'
            : '#475569';
          ctx.lineWidth = isConnectedToFocus ? 1.8 : 1.2;

          ctx.beginPath();
          ctx.roundRect(midX - bW / 2, midY - bH / 2, bW, bH, 5);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isConnectedToFocus
            ? '#38bdf8'
            : edge.weight >= 0.70
            ? '#34d399'
            : '#e2e8f0';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(simPct, midX, midY + 0.5);
        }
      });

      // --- 4. RENDER FIRST VISUAL MAP CARDS (215px x 58px) ---
      simNodes.forEach((node) => {
        const isCited = citedSet.has(node.id);
        const isSelected = selectedArxivId === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const isNeighbor = connectedNeighborIds.has(node.id);
        const isDimmed = activeFocusId && !isNeighbor && !isSelected;

        const clusterCfg = CLUSTER_CONFIGS[node.cluster % CLUSTER_CONFIGS.length];
        const pubYear = node.published ? node.published.substring(0, 4) : '2023';

        const cardX = node.curX - CARD_W / 2;
        const cardY = node.curY - CARD_H / 2;

        ctx.save();
        if (isDimmed) {
          ctx.globalAlpha = 0.22;
        }

        // Outer Glowing Pulse Ring for Cited Papers
        if (isCited) {
          const pulse = (Math.sin(now * 3.5) + 1) / 2;
          const haloSize = 4 + pulse * 4;

          ctx.beginPath();
          ctx.roundRect(
            cardX - haloSize,
            cardY - haloSize,
            CARD_W + haloSize * 2,
            CARD_H + haloSize * 2,
            14
          );
          ctx.strokeStyle = `rgba(16, 185, 129, ${0.45 * (1 - pulse * 0.5)})`;
          ctx.lineWidth = 2.0;
          ctx.stroke();
        }

        // Card Base Gradient
        const bgGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + CARD_H);
        bgGrad.addColorStop(0, 'rgba(18, 22, 34, 0.96)');
        bgGrad.addColorStop(1, 'rgba(8, 10, 16, 0.98)');
        ctx.fillStyle = bgGrad;

        // Specular Border
        ctx.strokeStyle = isSelected
          ? '#38bdf8'
          : isCited
          ? '#10b981'
          : isHovered
          ? clusterCfg.color
          : 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = isSelected ? 2.5 : isCited ? 2.2 : 1.3;

        ctx.beginPath();
        ctx.roundRect(cardX, cardY, CARD_W, CARD_H, 11);
        ctx.fill();
        ctx.stroke();

        // Cluster Dot Beacon (top-left)
        ctx.fillStyle = isCited ? '#10b981' : clusterCfg.color;
        ctx.beginPath();
        ctx.arc(cardX + 16, cardY + 18, 5, 0, Math.PI * 2);
        ctx.fill();

        // Top Row: Clean arXiv ID (e.g. arXiv:2308.10144)
        const cleanId = node.id.replace(/^arxiv:/i, '');
        ctx.font = '700 11px JetBrains Mono, monospace';
        ctx.fillStyle = isCited ? '#34d399' : '#f8fafc';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`arXiv:${cleanId}`, cardX + 28, cardY + 18);

        // Top Right: Year & Degree Pill
        ctx.font = '600 10px JetBrains Mono, monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'right';
        ctx.fillText(`${pubYear} · d:${node.degree}`, cardX + CARD_W - 12, cardY + 18);

        // Bottom Row: Paper Title (Crisp single-line)
        ctx.font = '500 11px Inter, sans-serif';
        ctx.fillStyle = isHovered ? '#38bdf8' : '#e2e8f0';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        let displayTitle = node.title || `Paper ${node.id}`;
        if (displayTitle.length > 25) {
          displayTitle = displayTitle.substring(0, 23) + '...';
        }
        ctx.fillText(displayTitle, cardX + 14, cardY + 40);

        // Cited Ribbon Badge on top right
        if (isCited) {
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.roundRect(cardX + CARD_W - 56, cardY - 9, 56, 16, 4);
          ctx.fill();

          ctx.font = '800 8.5px JetBrains Mono, monospace';
          ctx.fillStyle = '#06070a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✓ CITED', cardX + CARD_W - 28, cardY - 1);
        }

        ctx.restore();
      });

      ctx.restore();

      // --- 5. RENDER RADAR MINIMAP ---
      renderMinimap();
    },
    [
      offset,
      scale,
      stepPhysics,
      filteredEdges,
      citedSet,
      selectedArxivId,
      hoveredNode,
      connectedNeighborIds,
      activeFocusId,
      enablePhysics,
    ]
  );

  // Radar Mini-Map Renderer
  const renderMinimap = () => {
    const mini = minimapRef.current;
    if (!mini) return;
    const mCtx = mini.getContext('2d');
    if (!mCtx) return;

    const mW = mini.width;
    const mH = mini.height;

    mCtx.clearRect(0, 0, mW, mH);
    mCtx.fillStyle = 'rgba(6, 8, 16, 0.92)';
    mCtx.fillRect(0, 0, mW, mH);

    mCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    mCtx.strokeRect(0, 0, mW, mH);

    const minX = 0;
    const maxX = 1200;
    const minY = 0;
    const maxY = 700;

    simNodesRef.current.forEach((n) => {
      const isCited = citedSet.has(n.id);
      const isSelected = selectedArxivId === n.id;
      const clusterCfg = CLUSTER_CONFIGS[n.cluster % CLUSTER_CONFIGS.length];

      const mx = ((n.curX - minX) / (maxX - minX)) * mW;
      const my = ((n.curY - minY) / (maxY - minY)) * mH;

      mCtx.beginPath();
      mCtx.arc(mx, my, isSelected ? 4 : isCited ? 3 : 2.2, 0, Math.PI * 2);
      mCtx.fillStyle = isSelected ? '#38bdf8' : isCited ? '#10b981' : clusterCfg.color;
      mCtx.fill();
    });
  };

  // 60 FPS RequestAnimationFrame Loop
  useEffect(() => {
    let animId: number;
    const render = (time: number) => {
      draw(time);
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [draw]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- HIT DETECTION HELPER (100% RELIABLE CLICKING & HOVERING) ---
  const getNodeAtCanvasCoord = (canvasX: number, canvasY: number): SimulationNode | null => {
    const hitPadding = 12; // Generous hit padding
    for (const node of simNodesRef.current) {
      if (
        canvasX >= node.curX - CARD_W / 2 - hitPadding &&
        canvasX <= node.curX + CARD_W / 2 + hitPadding &&
        canvasY >= node.curY - CARD_H / 2 - hitPadding &&
        canvasY <= node.curY + CARD_H / 2 + hitPadding
      ) {
        return node;
      }
    }
    return null;
  };

  // Mouse Interaction: Reliable Click vs Drag Separation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };

    const canvasX = (e.clientX - rect.left - offset.x) / scale;
    const canvasY = (e.clientY - rect.top - offset.y) / scale;

    const hit = getNodeAtCanvasCoord(canvasX, canvasY);
    clickedCandidateRef.current = hit;

    if (hit) {
      // Start drag candidate
      isDraggingNodeRef.current = hit;
    } else {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = (e.clientX - rect.left - offset.x) / scale;
    const canvasY = (e.clientY - rect.top - offset.y) / scale;
    setMouseCanvasPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    // Dragging an active card
    if (isDraggingNodeRef.current) {
      const dragDist = mouseDownPosRef.current
        ? Math.hypot(e.clientX - mouseDownPosRef.current.x, e.clientY - mouseDownPosRef.current.y)
        : 0;

      if (dragDist > 4) {
        isDraggingNodeRef.current.isDragging = true;
        isDraggingNodeRef.current.curX = canvasX;
        isDraggingNodeRef.current.curY = canvasY;
        isDraggingNodeRef.current.physicsX = canvasX;
        isDraggingNodeRef.current.physicsY = canvasY;
        isDraggingNodeRef.current.vx = 0;
        isDraggingNodeRef.current.vy = 0;
      }
      return;
    }

    // Panning canvas
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    // Hover detection
    const found = getNodeAtCanvasCoord(canvasX, canvasY);
    setHoveredNode(found);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const clickCandidate = clickedCandidateRef.current;
    const startPos = mouseDownPosRef.current;

    if (startPos) {
      const moveDist = Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y);

      // Clean, un-finicky click!
      if (moveDist < 6 && clickCandidate) {
        onSelectNode(clickCandidate.id);
      }
    }

    if (isDraggingNodeRef.current) {
      isDraggingNodeRef.current.isDragging = false;
      isDraggingNodeRef.current = null;
    }
    clickedCandidateRef.current = null;
    mouseDownPosRef.current = null;
    setIsPanning(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[640px] bg-[#060810] rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden select-none"
    >
      {/* 60 FPS HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full h-full ${
          isDraggingNodeRef.current?.isDragging
            ? 'cursor-grabbing'
            : isPanning
            ? 'cursor-grabbing'
            : hoveredNode
            ? 'cursor-pointer'
            : 'cursor-grab'
        }`}
      />

      {/* Top Floating Controls HUD */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Left: Domain Cluster Filter Pills */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#0a0d18]/90 backdrop-blur-md border border-white/[0.1] shadow-lg pointer-events-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveClusterFilter(null)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border whitespace-nowrap ${
              activeClusterFilter === null
                ? 'bg-white/15 text-white border-white/30'
                : 'text-zinc-400 hover:text-white bg-transparent border-transparent'
            }`}
          >
            All Clusters
          </button>
          {CLUSTER_CONFIGS.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveClusterFilter(activeClusterFilter === c.id ? null : c.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border whitespace-nowrap ${
                activeClusterFilter === c.id
                  ? 'bg-white/15 text-white border-white/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white bg-transparent border-transparent'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: c.color }}
              />
              <span>{c.name}</span>
            </button>
          ))}
        </div>

        {/* Right: Actions (Focus Cited, Physics Toggle, Zoom) */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#0a0d18]/90 backdrop-blur-md border border-white/[0.1] shadow-lg pointer-events-auto shrink-0">
          {/* Focus Cited Toggle */}
          <button
            type="button"
            onClick={() => setFocusCitedOnly(!focusCitedOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
              focusCitedOnly
                ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/60 shadow-sm shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-white bg-zinc-900/60 border-white/[0.08]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Focus Cited ({citedPaperIds.length})</span>
          </button>

          {/* Physics ON / Classified Boxes Toggle */}
          <button
            type="button"
            onClick={() => setEnablePhysics(!enablePhysics)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
              enablePhysics
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
            title="Toggle between Free Physics Simulation and Classified Domain Boxes"
          >
            {enablePhysics ? <Pause className="w-3 h-3 text-purple-400" /> : <LayoutGrid className="w-3 h-3 text-emerald-400" />}
            <span>{enablePhysics ? 'Physics ON' : 'Classified Boxes'}</span>
          </button>

          {/* Camera Buttons */}
          <div className="flex items-center gap-1 pl-1 border-l border-white/[0.1]">
            <button
              onClick={() => setScale((s) => Math.min(s * 1.2, 2.5))}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setScale((s) => Math.max(s * 0.8, 0.4))}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetView}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              title="Reset View"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Left Corner: Legend & Mode Indicator */}
      <div className="absolute bottom-4 left-4 p-3 bg-zinc-950/85 backdrop-blur-md rounded-xl border border-white/[0.1] text-[11px] font-mono text-zinc-400 space-y-1.5 pointer-events-none shadow-xl">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          <span className="text-zinc-300 font-semibold">Cited Paper (Grounded Claim)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span>Topological 1-Hop Neighbor Card</span>
        </div>
        <div className="text-[10px] text-zinc-500 pt-0.5 border-t border-white/[0.06] flex items-center justify-between gap-4">
          <span>{enablePhysics ? '● Mode: Dynamic Physics Constellation' : '■ Mode: Structured Classified Domain Boxes'}</span>
          <span>60 FPS</span>
        </div>
      </div>

      {/* Bottom Right Corner: Radar Mini-Map */}
      <div className="absolute bottom-4 right-4 rounded-xl overflow-hidden border border-white/[0.12] shadow-2xl pointer-events-none">
        <canvas
          ref={minimapRef}
          width={130}
          height={85}
          className="block"
        />
      </div>
    </div>
  );
}
