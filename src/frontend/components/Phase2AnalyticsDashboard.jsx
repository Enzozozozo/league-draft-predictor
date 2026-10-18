import React, { useState } from 'react';
import { ArrowLeft, Trophy, TrendingUp } from 'lucide-react';

const ROLE_ICON_URLS = {
  TOP: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-top.png',
  JGL: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-jungle.png',
  MID: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-middle.png',
  BOT: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-bottom.png',
  SUP: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-utility.png',
};

const SHORT_DIM_NAMES = {
  'Hard Engage': 'Engage',
  'Disengage & Peel': 'Peel & Disengage',
  'Poke & Siege': 'Poke & Siege',
  'Late-Game Scaling': 'Scaling',
};

function VerdictHeader({
  blueProb,
  redProb,
  delta,
  classification,
  onModifyDraft,
}) {
  const isBlueFavored = blueProb >= redProb;
  const favoredTeam = isBlueFavored ? 'Blue Side' : 'Red Side';
  const favoredProb = isBlueFavored ? blueProb : redProb;
  const absDelta = Math.abs(delta).toFixed(1);

  return (
    <div className="bg-[#0B121E]/95 border border-slate-800/90 rounded-2xl px-5 py-2.5 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
            isBlueFavored
              ? 'bg-[#0AC8B9]/10 border-[#0AC8B9]/40 text-[#0AC8B9]'
              : 'bg-[#E84057]/10 border-[#E84057]/40 text-[#E84057]'
          }`}
        >
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className={`text-2xl font-extrabold font-mono tracking-tight ${
                isBlueFavored ? 'text-[#0AC8B9]' : 'text-[#E84057]'
              }`}
            >
              {favoredProb.toFixed(1)}% {favoredTeam}
            </span>
            <span
              className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border ${
                isBlueFavored
                  ? 'bg-[#0AC8B9]/15 text-[#0AC8B9] border-[#0AC8B9]/35'
                  : 'bg-[#E84057]/15 text-[#E84057] border-[#E84057]/35'
              }`}
            >
              {classification} (+{absDelta}%)
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-xl">
        <div className="flex items-center justify-between text-xs font-mono font-bold mb-1.5">
          <span className="text-[#0AC8B9]">Blue {blueProb.toFixed(1)}%</span>
          <span className="text-[#E84057]">{redProb.toFixed(1)}% Red</span>
        </div>
        <div className="relative h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-teal-600 to-[#0AC8B9] transition-all duration-700"
            style={{ width: `${blueProb}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-[#E84057] to-rose-700 transition-all duration-700"
            style={{ width: `${redProb}%` }}
          />
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/80 -translate-x-1/2" />
        </div>
      </div>

      <button
        onClick={onModifyDraft}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold font-mono border border-slate-700 hover:border-[#C89B3C] transition-all active:scale-95 group"
      >
        <ArrowLeft className="w-4 h-4 text-[#C89B3C] group-hover:-translate-x-0.5 transition-transform" />
        <span>Modify Draft</span>
      </button>
    </div>
  );
}

function LaneMatchupsCard({ laneMatchups, onEditSlot }) {
  return (
    <div className="bg-[#0B121E]/95 border border-slate-800/90 rounded-2xl p-3.5 flex flex-col justify-between h-full shadow-lg">
      <div className="grid grid-cols-[1fr_80px_40px_80px_1fr] items-center text-xs font-mono uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800/80">
        <span className="text-[#0AC8B9] font-bold text-left pl-1">Blue Side Pick</span>
        <span />
        <span className="text-slate-400 font-semibold text-center text-[11px]">Lane</span>
        <span />
        <span className="text-[#E84057] font-bold text-right pr-1">Red Side Pick</span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-between py-1.5 gap-2">
        {laneMatchups.map((m, idx) => {
          const role = m.role || 'TOP';
          const isBlue = m.isBlueLean;
          const absDiff = Math.abs(m.differential ?? 0).toFixed(1);
          const goldVal = m.goldDiff15 ?? Math.round((m.differential ?? 0) * 85);
          const absGold = Math.abs(goldVal);
          const goldText = goldVal >= 0 ? `+${absGold}g @15m` : `-${absGold}g @15m`;
          const dynamicText = m.laneDynamic || (isBlue ? 'Wave Priority' : 'Defensive Farming');

          return (
            <div
              key={role}
              className="grid grid-cols-[1fr_80px_40px_80px_1fr] items-center px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-750 transition-colors"
            >
              {/* 1. Blue Champion: Name, WR, and Lane Dynamic Badge */}
              <button
                type="button"
                onClick={() => onEditSlot?.('blue', idx, role)}
                className="flex items-center justify-end gap-3 group text-right min-w-0"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-100 group-hover:text-[#0AC8B9] transition-colors truncate">
                    {m.blueChampion}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <span className="text-[11px] font-mono text-[#0AC8B9]/90 font-semibold">
                      {m.blueWinRate}% WR
                    </span>
                    {isBlue && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#0AC8B9]/15 text-[#0AC8B9] border border-[#0AC8B9]/30">
                        {dynamicText}
                      </span>
                    )}
                  </div>
                </div>

                {/* Outer frame: clean color border, clips internal black sprite border */}
                <div className="w-11 h-11 rounded-xl overflow-hidden border-2 border-[#0AC8B9]/70 group-hover:border-[#0AC8B9] bg-slate-950 flex-shrink-0 transition-transform group-hover:scale-105 shadow-md">
                  <img
                    src={m.blueImage}
                    alt={m.blueChampion}
                    className="w-full h-full object-cover scale-[1.08]"
                  />
                </div>
              </button>

              {/* 2. Blue Winrate & Gold Differential: Centered between Blue portrait & Role Icon */}
              <div className="flex flex-col items-center justify-center select-none">
                <span
                  className={`text-xs font-mono font-bold whitespace-nowrap ${
                    isBlue ? 'text-[#0AC8B9]' : 'text-transparent'
                  }`}
                >
                  {isBlue ? `+${absDiff}%` : ''}
                </span>
                <span
                  className={`text-[9px] font-mono whitespace-nowrap mt-0.5 ${
                    isBlue ? 'text-amber-400 font-semibold' : 'text-transparent'
                  }`}
                >
                  {isBlue ? goldText : ''}
                </span>
              </div>

              {/* 3. Center Role Icon */}
              <div className="flex items-center justify-center select-none">
                <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <img
                    src={ROLE_ICON_URLS[role] || ROLE_ICON_URLS.TOP}
                    alt={role}
                    className="w-4 h-4 object-contain opacity-90"
                  />
                </div>
              </div>

              {/* 4. Red Winrate & Gold Differential: Centered between Role Icon & Red portrait */}
              <div className="flex flex-col items-center justify-center select-none">
                <span
                  className={`text-xs font-mono font-bold whitespace-nowrap ${
                    !isBlue ? 'text-[#E84057]' : 'text-transparent'
                  }`}
                >
                  {!isBlue ? `+${absDiff}%` : ''}
                </span>
                <span
                  className={`text-[9px] font-mono whitespace-nowrap mt-0.5 ${
                    !isBlue ? 'text-amber-400 font-semibold' : 'text-transparent'
                  }`}
                >
                  {!isBlue ? `+${absGold}g @15m` : ''}
                </span>
              </div>

              {/* 5. Red Champion: Portrait, Name, WR, and Lane Dynamic Badge */}
              <button
                type="button"
                onClick={() => onEditSlot?.('red', idx, role)}
                className="flex items-center justify-start gap-3 group text-left min-w-0"
              >
                {/* Outer frame: clean color border, clips internal black sprite border */}
                <div className="w-11 h-11 rounded-xl overflow-hidden border-2 border-[#E84057]/70 group-hover:border-[#E84057] bg-slate-950 flex-shrink-0 transition-transform group-hover:scale-105 shadow-md">
                  <img
                    src={m.redImage}
                    alt={m.redChampion}
                    className="w-full h-full object-cover scale-[1.08]"
                  />
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-100 group-hover:text-[#E84057] transition-colors truncate">
                    {m.redChampion}
                  </div>
                  <div className="flex items-center justify-start gap-1.5 mt-0.5">
                    {!isBlue && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#E84057]/15 text-[#E84057] border border-[#E84057]/30">
                        {dynamicText}
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-[#E84057]/90 font-semibold">
                      {m.redWinRate}% WR
                    </span>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}



function WinConditionCard({ winCondition }) {
  if (!winCondition) return null;

  return (
    <div className="bg-[#0B121E]/95 border border-slate-800/90 rounded-2xl p-3 shadow-lg flex flex-col justify-between">
      <div className="border-b border-slate-800/70 pb-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
              Draft Win Condition
            </h3>
          </div>
          <span className="text-[10px] font-mono text-amber-300/80">Macro Priority</span>
        </div>
        <div className="text-sm font-bold text-amber-300/90 mt-1">
          {winCondition.title}
        </div>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug">
          {winCondition.summary}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1.5">
        <div className="p-2 px-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <div className="text-[10px] font-mono font-bold text-[#0AC8B9] uppercase mb-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0AC8B9]" />
            Blue Execution
          </div>
          <ul className="space-y-0.5 text-[11px] text-slate-400">
            <li className="truncate">• Lorem ipsum dolor sit</li>
            <li className="truncate">• Lorem consectetur elit</li>
            <li className="truncate">• Lorem tempor incidunt</li>
          </ul>
        </div>
        <div className="p-2 px-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <div className="text-[10px] font-mono font-bold text-[#E84057] uppercase mb-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E84057]" />
            Red Execution
          </div>
          <ul className="space-y-0.5 text-[11px] text-slate-400">
            <li className="truncate">• Lorem ipsum dolor sit</li>
            <li className="truncate">• Lorem consectetur elit</li>
            <li className="truncate">• Lorem tempor incidunt</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function PowerCurvesCard({ powerSpikes }) {
  if (!powerSpikes || powerSpikes.length === 0) return null;

  const earlySpike = powerSpikes.find((p) => p.phase.includes('Early')) || powerSpikes[0];
  const midSpike = powerSpikes.find((p) => p.phase.includes('Mid')) || powerSpikes[1];
  const lateSpike = powerSpikes.find((p) => p.phase.includes('Late')) || powerSpikes[2];

  // Spread (Blue advantage minus Red advantage). Positive = Blue leads (Top), Negative = Red leads (Bottom)
  const dEarly = (earlySpike?.blueAdv ?? 50) - (earlySpike?.redAdv ?? 50); // e.g. -4
  const dMid = (midSpike?.blueAdv ?? 50) - (midSpike?.redAdv ?? 50);       // e.g. +10
  const dLate = (lateSpike?.blueAdv ?? 50) - (lateSpike?.redAdv ?? 50);     // e.g. +24

  // Height = 60, Midpoint Baseline Y = 30
  // Top region (y < 30) = Blue
  // Bottom region (y > 30) = Red
  const clampY = (spread) => {
    const raw = 30 - spread * 0.65;
    return Math.min(48, Math.max(12, raw));
  };

  const p0 = { x: 20, y: Math.round(clampY(dEarly * 0.35)) };
  const p1 = { x: 105, y: Math.round(clampY(dEarly)) };
  const p2 = { x: 215, y: Math.round(clampY(dMid)) };
  const p3 = { x: 335, y: Math.round(clampY(dLate)) };

  const cp01x = Math.round((p0.x + p1.x) / 2);
  const cp12x = Math.round((p1.x + p2.x) / 2);
  const cp23x = Math.round((p2.x + p3.x) / 2);

  const curvePath = `M ${p0.x} ${p0.y} C ${cp01x} ${p0.y}, ${cp01x} ${p1.y}, ${p1.x} ${p1.y} C ${cp12x} ${p1.y}, ${cp12x} ${p2.y}, ${p2.x} ${p2.y} C ${cp23x} ${p2.y}, ${cp23x} ${p3.y}, ${p3.x} ${p3.y}`;
  const areaPath = `${curvePath} L ${p3.x} 30 L ${p0.x} 30 Z`;

  return (
    <div className="bg-[#0B121E]/95 border border-slate-800/90 rounded-2xl p-3 shadow-lg flex flex-col justify-between">
      {/* Header with clear team orientation */}
      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-400 pb-1.5 border-b border-slate-800/70">
        <span className="font-bold text-slate-300">Game Phase Power Curve</span>
        <div className="flex items-center gap-3 text-[10px] font-normal">
          <span className="flex items-center gap-1 text-[#0AC8B9]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0AC8B9]" /> Blue (Top)
          </span>
          <span className="flex items-center gap-1 text-[#E84057]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E84057]" /> Red (Bottom)
          </span>
        </div>
      </div>

      {/* Clean Minimalist Line Graph */}
      <div className="w-full py-1 select-none">
        <svg viewBox="0 0 360 60" className="w-full h-auto max-h-[56px] overflow-visible">
          <defs>
            {/* Instant color switch at exact midpoint Y = 30 (50%): Top Blue, Bottom Red */}
            <linearGradient id="curveLineGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="60">
              <stop offset="0" stopColor="#0AC8B9" />
              <stop offset="0.5" stopColor="#0AC8B9" />
              <stop offset="0.5" stopColor="#E84057" />
              <stop offset="1" stopColor="#E84057" />
            </linearGradient>

            <linearGradient id="curveAreaGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="60">
              <stop offset="0" stopColor="#0AC8B9" stopOpacity="0.16" />
              <stop offset="0.5" stopColor="#0AC8B9" stopOpacity="0.02" />
              <stop offset="0.5" stopColor="#E84057" stopOpacity="0.02" />
              <stop offset="1" stopColor="#E84057" stopOpacity="0.16" />
            </linearGradient>
          </defs>

          {/* Neutral Baseline (Parity at y = 30) */}
          <line
            x1="18"
            y1="30"
            x2="342"
            y2="30"
            stroke="#334155"
            strokeDasharray="3 3"
            strokeWidth="1"
          />

          {/* Vertical Guides */}
          {[105, 215, 335].map((x) => (
            <line
              key={x}
              x1={x}
              y1="8"
              x2={x}
              y2="50"
              stroke="#1E293B"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
          ))}

          {/* Subtle Area Fill */}
          <path d={areaPath} fill="url(#curveAreaGrad)" />

          {/* Simple Clean Curve Line */}
          <path
            d={curvePath}
            fill="none"
            stroke="url(#curveLineGrad)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />

          {/* Datapoint Dots: Color strictly follows position relative to midpoint */}
          {[
            { p: p1, isBlue: p1.y < 30 },
            { p: p2, isBlue: p2.y < 30 },
            { p: p3, isBlue: p3.y < 30 },
          ].map((node, i) => {
            const color = node.isBlue ? '#0AC8B9' : '#E84057';
            return (
              <circle
                key={i}
                cx={node.p.x}
                cy={node.p.y}
                r="3.5"
                fill={color}
                stroke="#0B121E"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Clean X-Axis Time Labels */}
          <text x="20" y="58" textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="monospace">
            0m
          </text>
          <text x="105" y="58" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="monospace">
            15m
          </text>
          <text x="215" y="58" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="monospace">
            25m
          </text>
          <text x="335" y="58" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="monospace">
            35m+
          </text>
        </svg>
      </div>

      {/* Phase Summary Cards: 3 Columns matching TacticalCompositionCard */}
      <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-800/70">
        {powerSpikes.map((ps) => {
          const isBlue = ps.favoredSide === 'Blue';
          return (
            <div
              key={ps.phase}
              className="p-1.5 px-2 rounded-xl bg-slate-900/60 border border-slate-800/60 flex flex-col justify-between min-h-[46px]"
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-300 font-medium">
                  {ps.phase.replace(' Game', '')}
                </span>
                <span className="font-mono text-slate-500 text-[9px]">
                  {ps.timeframe}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span
                  className={`text-[11px] font-mono font-extrabold ${
                    isBlue ? 'text-[#0AC8B9]' : 'text-[#E84057]'
                  }`}
                >
                  {ps.favoredSide} {ps.delta}
                </span>
                <span className="text-[9px] text-slate-400 truncate max-w-[80px] text-right">
                  {ps.details}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TacticalCompositionCard({ tactical }) {
  return (
    <div className="bg-[#0B121E]/95 border border-slate-800/90 rounded-2xl p-3 shadow-lg">
      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-400 pb-1.5 border-b border-slate-800/70">
        <span className="font-bold text-slate-300">Tactical Composition Edge</span>
        <span className="text-[10px] text-slate-500 font-normal">Score (0 - 10)</span>
      </div>
      <div className="grid grid-cols-4 gap-2 pt-1.5">
        {tactical.map((dim) => {
          const isBlue = dim.advantageSide === 'Blue';
          const totalScore = Math.max(dim.blue + dim.red, 0.1);
          const bluePct = Math.round((dim.blue / totalScore) * 100);
          const redPct = 100 - bluePct;

          return (
            <div
              key={dim.name}
              className="p-1.5 px-2 rounded-xl bg-slate-900/60 border border-slate-800/60 flex flex-col items-center text-center justify-between min-h-[76px]"
            >
              <span className="text-[10px] text-slate-300 font-medium truncate w-full">
                {SHORT_DIM_NAMES[dim.name] || dim.name}
              </span>
              <span
                className={`text-xs font-mono font-extrabold my-0.5 ${
                  isBlue ? 'text-[#0AC8B9]' : 'text-[#E84057]'
                }`}
              >
                {dim.advantageText}
              </span>

              {/* Micro Ratio Bar */}
              <div className="w-full px-1">
                <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-0.5">
                  <span className={isBlue ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                    {dim.blue.toFixed(1)}
                  </span>
                  <span className={!isBlue ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                    {dim.red.toFixed(1)}
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden flex bg-slate-950 border border-slate-800">
                  <div
                    style={{ width: `${bluePct}%` }}
                    className="bg-[#0AC8B9]"
                  />
                  <div
                    style={{ width: `${redPct}%` }}
                    className="bg-[#E84057]"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DamageSplitCard({ blueDmg, redDmg }) {
  return (
    <div className="bg-[#0B121E]/95 border border-slate-800/90 rounded-2xl p-3 shadow-lg">
      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-400 pb-1.5 border-b border-slate-800/70">
        <span>Damage Type Breakdown</span>
        <div className="flex items-center gap-2.5 text-[10px]">
          <span className="flex items-center gap-1 text-[orange]">
            <span className="w-1.5 h-1.5 rounded-full bg-[orange]" /> Physical (AD)
          </span>
          <span className="flex items-center gap-1 text-[#7A6DFF]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7A6DFF]" /> Magic (AP)
          </span>
          <span className="flex items-center gap-1 text-[#ECE8E1]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ECE8E1]" /> True
          </span>
        </div>
      </div>
      <div className="space-y-1.5 pt-1.5">
        {[
          { label: 'Blue', color: '#0AC8B9', d: blueDmg },
          { label: 'Red', color: '#E84057', d: redDmg },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-2.5">
            <span
              className="text-[11px] font-mono font-bold w-12 uppercase"
              style={{ color: row.color }}
            >
              {row.label}
            </span>
            <div className="flex-1 h-2 rounded-full overflow-hidden flex bg-slate-950 border border-slate-800">
              <div style={{ width: `${row.d.ad}%` }} className="bg-[orange]" />
              <div style={{ width: `${row.d.ap}%` }} className="bg-[#7A6DFF]" />
              <div style={{ width: `${row.d.trueDmg}%` }} className="bg-[#ECE8E1]" />
            </div>
            <div className="text-[11px] font-mono text-slate-300 w-44 text-right">
              <span className="text-[orange]">{row.d.ad}% AD</span> ·{' '}
              <span className="text-[#7A6DFF]">{row.d.ap}% AP</span> ·{' '}
              <span className="text-[#ECE8E1]/80">{row.d.trueDmg}% True</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Phase2AnalyticsDashboard({
  predictionData,
  onModifyDraft,
  onEditSlot,
}) {
  const blueProb = predictionData?.blueWinProb ?? 54.2;
  const redProb = predictionData?.redWinProb ?? 45.8;
  const delta = predictionData?.deltaSpread ?? 4.2;
  const classification = predictionData?.classification ?? 'Heavy Advantage';
  const laneMatchups = predictionData?.laneMatchups || [];
  const tactical = predictionData?.tacticalDimensions || [];
  const blueDmg = predictionData?.blueDamage || { ad: 45, ap: 50, trueDmg: 5 };
  const redDmg = predictionData?.redDamage || { ad: 65, ap: 30, trueDmg: 5 };
  const winCondition = predictionData?.primaryWinCondition;
  const powerSpikes = predictionData?.powerSpikes || [];

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5 max-w-7xl mx-auto w-full h-full max-h-full">
      {/* 1. Verdict Top Bar */}
      <div className="flex-shrink-0">
        <VerdictHeader
          blueProb={blueProb}
          redProb={redProb}
          delta={delta}
          classification={classification}
          onModifyDraft={onModifyDraft}
        />
      </div>

      {/* 2. Main Analytics Body: 2-Column Balanced Arena bounded to screen limits */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-1 gap-3 items-stretch h-full max-h-full overflow-hidden">
        {/* Left Column (7 cols): Hero Lane Matchups */}
        <div className="lg:col-span-7 flex flex-col min-h-0 h-full max-h-full">
          <LaneMatchupsCard
            laneMatchups={laneMatchups}
            onEditSlot={onEditSlot}
          />
        </div>

        {/* Right Column (5 cols): Screen-limited Tactical Cards with smooth Hextech scroll container */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-2 min-h-0 h-full max-h-full overflow-y-auto pr-1">
          <div className="flex-shrink-0"><WinConditionCard winCondition={winCondition} /></div>
          <div className="flex-shrink-0"><PowerCurvesCard powerSpikes={powerSpikes} /></div>
          <div className="flex-shrink-0"><TacticalCompositionCard tactical={tactical} /></div>
          <div className="flex-shrink-0"><DamageSplitCard blueDmg={blueDmg} redDmg={redDmg} /></div>
        </div>
      </div>
    </div>
  );
}
