import React from 'react';
import { Trophy } from 'lucide-react';
import { ROLE_ICON_URLS } from '../data/championsData';

const SHORT_DIM_NAMES = {
  'Hard Engage': 'Engage',
  'Disengage & Peel': 'Peel & Disengage',
  'Poke & Siege': 'Poke & Siege',
  'Late-Game Scaling': 'Scaling',
};

function VerdictHeader({ blueProb, redProb, delta, classification }) {
  const isBlueFavored = blueProb >= redProb;
  const favoredTeam = isBlueFavored ? 'Blue Side' : 'Red Side';
  const favoredProb = isBlueFavored ? blueProb : redProb;
  const absDelta = Math.abs(delta).toFixed(1);

  return (
    <div className="bg-[#0B121E]/95 border border-slate-800/90 rounded-2xl px-5 py-2 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 flex-shrink-0">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
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
              className={`text-xl font-extrabold font-mono tracking-tight ${
                isBlueFavored ? 'text-[#0AC8B9]' : 'text-[#E84057]'
              }`}
            >
              {favoredProb.toFixed(1)}% {favoredTeam}
            </span>
            <span
              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${
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

      <div className="flex-1 w-full max-w-2xl">
        <div className="flex items-center justify-between text-xs font-mono font-bold mb-1">
          <span className="text-[#0AC8B9]">Blue {blueProb.toFixed(1)}%</span>
          <span className="text-[#E84057]">{redProb.toFixed(1)}% Red</span>
        </div>
        <div className="relative h-2.5 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
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
    </div>
  );
}

function LaneChampionCell({ champion, image, badge, isBlue }) {
  const teamColor = isBlue ? '#0AC8B9' : '#E84057';

  const getBadgeClass = (tag) => {
    switch (tag) {
      case 'HARD COUNTER':
        return isBlue
          ? 'bg-[#0AC8B9]/20 text-[#0AC8B9] border-[#0AC8B9]/50 shadow-sm shadow-[#0AC8B9]/25 font-black'
          : 'bg-[#E84057]/20 text-[#E84057] border-[#E84057]/50 shadow-sm shadow-[#E84057]/25 font-black';
      case 'EARLY PRIO':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/40 font-bold';
      case 'OUTSCALES':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/40 font-bold';
      case 'SKILL':
      default:
        return 'bg-slate-800/80 text-slate-400 border-slate-700/80 font-semibold';
    }
  };

  const textContent = (
    <div className={`min-w-0 flex flex-col ${isBlue ? 'items-end text-right' : 'items-start text-left'}`}>
      <div className="text-sm font-bold text-slate-100 leading-tight break-words whitespace-normal max-w-[140px]">
        {champion || 'Empty'}
      </div>
      <div className={`flex items-center gap-1.5 mt-0.5 ${isBlue ? 'justify-end' : 'justify-start'}`}>
        {badge ? (
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border tracking-wider uppercase whitespace-nowrap ${getBadgeClass(
              badge
            )}`}
          >
            {badge}
          </span>
        ) : null}
      </div>
    </div>
  );

  const avatar = (
    <div
      className="w-10 h-10 rounded-xl overflow-hidden border-2 bg-slate-950 flex-shrink-0 shadow-md"
      style={{ borderColor: `${teamColor}B3` }}
    >
      <img src={image} alt={champion} className="w-full h-full object-cover scale-[1.08]" />
    </div>
  );

  return (
    <div
      className={`flex items-center gap-2.5 w-full min-w-0 select-none ${
        isBlue ? 'justify-end' : 'justify-start'
      }`}
    >
      {isBlue ? (
        <>
          {textContent}
          {avatar}
        </>
      ) : (
        <>
          {avatar}
          {textContent}
        </>
      )}
    </div>
  );
}

const LANE_ROLES_DEFAULT = ['TOP', 'JGL', 'MID', 'BOT', 'SUP'];

function normalizeRoleKey(rawRole, idx) {
  if (!rawRole) return LANE_ROLES_DEFAULT[idx] || 'TOP';
  const upper = String(rawRole).trim().toUpperCase();
  if (upper === 'JUNGLE') return 'JGL';
  if (upper === 'MIDDLE') return 'MID';
  if (upper === 'BOTTOM' || upper === 'ADC') return 'BOT';
  if (upper === 'UTILITY' || upper === 'SUPPORT') return 'SUP';
  return upper;
}

function LaneMatchupsCard({ laneMatchups }) {
  return (
    <div className="bg-[#0B121E]/95 border border-slate-800/90 rounded-2xl p-3 flex flex-col justify-between h-full shadow-lg">
      <div className="grid grid-cols-[1fr_130px_1fr] items-center text-xs font-mono uppercase tracking-wider text-slate-400 pb-1.5 border-b border-slate-800/80 px-2">
        <span className="text-[#0AC8B9] font-bold text-right pr-4">BLUE SIDE</span>
        <span className="text-slate-400 font-semibold text-center text-[11px]">PRIORITY</span>
        <span className="text-[#E84057] font-bold text-left pl-4">RED SIDE</span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-between py-1 gap-1.5">
        {laneMatchups.map((m, idx) => {
          const role = normalizeRoleKey(m.role, idx);
          const isBlue = m.isBlueLean;
          const absDiff = Math.abs(m.differential ?? 0).toFixed(1);
          const goldVal = m.goldDiff15 ?? Math.round((m.differential ?? 0) * 85);
          const absGold = Math.abs(goldVal);
          const goldText = goldVal >= 0 ? `+${absGold}g @15m` : `-${absGold}g @15m`;

          // Dynamic badge resolution from model differential
          const diffSigned = m.differential != null ? (m.isBlueLean ? m.differential : -m.differential) : 0;
          const blueBadge =
            m.blueBadge ||
            (diffSigned >= 3.0 ? 'HARD COUNTER' : diffSigned >= 1.2 ? 'EARLY PRIO' : Math.abs(diffSigned) < 1.2 ? 'SKILL' : null);
          const redBadge =
            m.redBadge ||
            (diffSigned <= -3.0 ? 'HARD COUNTER' : diffSigned <= -1.2 ? 'EARLY PRIO' : Math.abs(diffSigned) < 1.2 ? 'SKILL' : null);

          const isEven = Math.abs(Number(absDiff)) < 0.1;

          return (
            <div
              key={`${role}-${idx}`}
              className="grid grid-cols-[1fr_130px_1fr] items-center px-2.5 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/70"
            >
              <LaneChampionCell
                champion={m.blueChampion}
                image={m.blueImage}
                badge={blueBadge}
                isBlue={true}
              />

              {/* Solution B: Unified Center Comparison Hub */}
              <div className="flex flex-col items-center justify-center select-none px-1 text-center">
                <div className="w-6 h-6 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0 shadow-inner mb-0.5">
                  <img
                    src={ROLE_ICON_URLS[role] || ROLE_ICON_URLS[LANE_ROLES_DEFAULT[idx]] || ROLE_ICON_URLS.TOP}
                    alt={role}
                    className="w-3.5 h-3.5 object-contain opacity-90"
                  />
                </div>

                {!isEven ? (
                  <div className="flex flex-col items-center leading-tight">
                    <span
                      className={`text-[11px] font-mono font-extrabold flex items-center gap-1 ${
                        isBlue ? 'text-[#0AC8B9]' : 'text-[#E84057]'
                      }`}
                    >
                      {isBlue ? `◀ +${absDiff}%` : `+${absDiff}% ▶`}
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 font-semibold mt-0.5">
                      {isBlue ? goldText : `+${absGold}g @15m`}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center leading-tight text-slate-500 font-mono text-[10px]">
                    <span className="font-semibold text-slate-400">EVEN</span>
                    <span className="text-[9px] text-slate-500 mt-0.5">±0g @15m</span>
                  </div>
                )}
              </div>

              <LaneChampionCell
                champion={m.redChampion}
                image={m.redImage}
                badge={redBadge}
                isBlue={false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExecutionBlock({ title, color, items, isLoading, pulseTexts }) {
  return (
    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 flex flex-col justify-between">
      <div className="text-[10px] font-mono font-bold uppercase mb-1 flex items-center gap-1.5" style={{ color }}>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span>{title}</span>
      </div>
      {isLoading ? (
        <ul className="space-y-1.5 text-[11px] text-slate-400/80 font-mono">
          {pulseTexts.map((txt, i) => (
            <li key={i} className="flex items-center gap-2 animate-pulse" style={{ animationDelay: `${i * 150}ms` }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color, opacity: 0.6 }} />
              <span className="break-words whitespace-normal">{txt}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-1 text-[11px] text-slate-300">
          {(items || []).slice(0, 3).map((item, i) => (
            <li key={i} className="leading-snug break-words whitespace-normal">
              • {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WinConditionCard({ winCondition, isCoachLoading }) {
  if (!winCondition) return null;
  const isLoading = Boolean(isCoachLoading);

  return (
    <div className="bg-[#0B121E]/95 border border-slate-800/90 rounded-2xl p-2.5 shadow-lg flex flex-col justify-between">
      <div className="border-b border-slate-800/70 pb-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
              Draft Win Condition
            </h3>
          </div>
          <span className="text-[10px] font-mono text-amber-300/80">
            {winCondition.coachModel ? `AI Coach (${winCondition.coachModel})` : 'Macro Priority'}
          </span>
        </div>
        <div className="text-sm font-bold text-amber-300/90 mt-0.5 break-words whitespace-normal">
          {isLoading ? (
            <span className="flex items-center gap-2 text-amber-300/70 font-mono text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Evaluating draft strategy...</span>
            </span>
          ) : (
            winCondition.title
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed break-words whitespace-normal">
          {isLoading ? (
            <span className="text-slate-500 font-mono text-[11px] animate-pulse">
              Computing matchup interactions...
            </span>
          ) : (
            winCondition.summary
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1.5">
        <ExecutionBlock
          title="Blue Execution"
          color="#0AC8B9"
          items={winCondition.blueExecution}
          isLoading={isLoading}
          pulseTexts={['Checking objective priority...', 'Crashing herald into a wall...', 'Missing mythics...']}
        />
        <ExecutionBlock
          title="Red Execution"
          color="#E84057"
          items={winCondition.redExecution}
          isLoading={isLoading}
          pulseTexts={['Buying oracle lens...', 'Queueing ARAM...', '/all ggez...']}
        />
      </div>
    </div>
  );
}

function PowerCurvesCard({ powerSpikes, isCoachLoading }) {
  if (!powerSpikes || powerSpikes.length === 0) return null;

  const earlySpike = powerSpikes.find((p) => p.phase.includes('Early')) || powerSpikes[0];
  const midSpike = powerSpikes.find((p) => p.phase.includes('Mid')) || powerSpikes[1];
  const lateSpike = powerSpikes.find((p) => p.phase.includes('Late')) || powerSpikes[2];

  const dEarly = (earlySpike?.blueAdv ?? 50) - (earlySpike?.redAdv ?? 50);
  const dMid = (midSpike?.blueAdv ?? 50) - (midSpike?.redAdv ?? 50);
  const dLate = (lateSpike?.blueAdv ?? 50) - (lateSpike?.redAdv ?? 50);

  const clampY = (spread) => Math.min(50, Math.max(10, 30 - spread * 0.7));

  // Spans full width from x=0 to x=360
  const p0 = { x: 0, y: Math.round(clampY(dEarly * 0.25)) };
  const p1 = { x: 90, y: Math.round(clampY(dEarly)) };
  const p2 = { x: 210, y: Math.round(clampY(dMid)) };
  const p3 = { x: 330, y: Math.round(clampY(dLate)) };
  const p4 = { x: 360, y: Math.round(clampY(dLate * 1.05)) };

  const cp01x = Math.round((p0.x + p1.x) / 2);
  const cp12x = Math.round((p1.x + p2.x) / 2);
  const cp23x = Math.round((p2.x + p3.x) / 2);
  const cp34x = Math.round((p3.x + p4.x) / 2);

  const curvePath = `M ${p0.x} ${p0.y} C ${cp01x} ${p0.y}, ${cp01x} ${p1.y}, ${p1.x} ${p1.y} C ${cp12x} ${p1.y}, ${cp12x} ${p2.y}, ${p2.x} ${p2.y} C ${cp23x} ${p2.y}, ${cp23x} ${p3.y}, ${p3.x} ${p3.y} C ${cp34x} ${p3.y}, ${cp34x} ${p4.y}, ${p4.x} ${p4.y}`;
  const areaPath = `${curvePath} L 360 30 L 0 30 Z`;

  return (
    <div className="bg-[#0B121E]/95 border border-slate-800/90 rounded-2xl p-2.5 shadow-lg flex flex-col justify-between w-full">
      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800/70">
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

      <div className="w-full py-1 select-none">
        <svg
          viewBox="0 0 360 60"
          preserveAspectRatio="none"
          className="w-full h-14 overflow-visible block"
        >
          <defs>
            <linearGradient id="curveLineGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="60">
              <stop offset="0" stopColor="#0AC8B9" />
              <stop offset="0.5" stopColor="#0AC8B9" />
              <stop offset="0.5" stopColor="#E84057" />
              <stop offset="1" stopColor="#E84057" />
            </linearGradient>

            <linearGradient id="curveAreaGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="60">
              <stop offset="0" stopColor="#0AC8B9" stopOpacity="0.18" />
              <stop offset="0.5" stopColor="#0AC8B9" stopOpacity="0.02" />
              <stop offset="0.5" stopColor="#E84057" stopOpacity="0.02" />
              <stop offset="1" stopColor="#E84057" stopOpacity="0.18" />
            </linearGradient>
          </defs>

          {/* Baseline across full width */}
          <line x1="0" y1="30" x2="360" y2="30" stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />

          {/* Vertical Guides */}
          {[90, 210, 330].map((x) => (
            <line key={x} x1={x} y1="6" x2={x} y2="52" stroke="#1E293B" strokeDasharray="2 2" strokeWidth="1" />
          ))}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#curveAreaGrad)" />

          {/* Main Curve Line across entire width */}
          <path d={curvePath} fill="none" stroke="url(#curveLineGrad)" strokeWidth="2" strokeLinecap="round" />

          {/* Datapoints */}
          {[
            { p: p1, isBlue: p1.y < 30 },
            { p: p2, isBlue: p2.y < 30 },
            { p: p3, isBlue: p3.y < 30 },
          ].map((node, i) => (
            <circle
              key={i}
              cx={node.p.x}
              cy={node.p.y}
              r="3.5"
              fill={node.isBlue ? '#0AC8B9' : '#E84057'}
              stroke="#0B121E"
              strokeWidth="1.5"
            />
          ))}

          <text x="12" y="58" textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="monospace">0m</text>
          <text x="90" y="58" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="monospace">15m</text>
          <text x="210" y="58" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="monospace">25m</text>
          <text x="330" y="58" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="monospace">35m+</text>
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/70 w-full">
        {powerSpikes.map((ps) => {
          const isBlue = ps.favoredSide === 'Blue';
          return (
            <div
              key={ps.phase}
              className="p-1.5 px-2 rounded-xl bg-slate-900/60 border border-slate-800/60 flex flex-col justify-between"
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
              </div>
              <p className="text-[10px] leading-snug text-slate-400 mt-0.5 break-words whitespace-normal min-h-[2.5em]">
                {isCoachLoading && !ps.details ? (
                  <span className="text-slate-500 font-mono animate-pulse">Evaluating phase...</span>
                ) : (
                  ps.details
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TacticalCompositionCard({ tactical }) {
  return (
    <div className="bg-[#0B121E]/95 border border-slate-800/90 rounded-2xl p-2.5 shadow-lg w-full">
      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800/70">
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
              className="p-1.5 px-2 rounded-xl bg-slate-900/60 border border-slate-800/60 flex flex-col items-center text-center justify-between min-h-[66px]"
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
                  <div style={{ width: `${bluePct}%` }} className="bg-[#0AC8B9]" />
                  <div style={{ width: `${redPct}%` }} className="bg-[#E84057]" />
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
  const hasTrueDmg = (blueDmg?.trueDmg || 0) > 0 || (redDmg?.trueDmg || 0) > 0;

  return (
    <div className="bg-[#0B121E]/95 border border-slate-800/90 rounded-2xl p-2.5 shadow-lg w-full">
      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800/70">
        <span>Damage Type Breakdown</span>
        <div className="flex items-center gap-2.5 text-[10px]">
          <span className="flex items-center gap-1 text-amber-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Physical (AD)
          </span>
          <span className="flex items-center gap-1 text-indigo-400">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Magic (AP)
          </span>
          {hasTrueDmg && (
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> True
            </span>
          )}
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
              <div style={{ width: `${row.d.ad}%` }} className="bg-amber-500" />
              <div style={{ width: `${row.d.ap}%` }} className="bg-indigo-400" />
              {row.d.trueDmg > 0 && (
                <div style={{ width: `${row.d.trueDmg}%` }} className="bg-slate-300" />
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-300 w-36 text-right">
              <span className="text-amber-400">{row.d.ad}% AD</span> ·{' '}
              <span className="text-indigo-400">{row.d.ap}% AP</span>
              {row.d.trueDmg > 0 && (
                <> · <span className="text-slate-300">{row.d.trueDmg}% True</span></>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Phase2AnalyticsDashboard({
  predictionData,
  isCoachLoading,
}) {
  const blueProb = predictionData?.blueWinProb ?? 54.2;
  const redProb = predictionData?.redWinProb ?? 45.8;
  const delta = predictionData?.deltaSpread ?? 4.2;
  const classification = predictionData?.classification ?? 'Heavy Advantage';
  const laneMatchups = predictionData?.laneMatchups || [];
  const tactical = predictionData?.tacticalDimensions || [];
  const blueDmg = predictionData?.blueDamage || { ad: 57, ap: 43, trueDmg: 0 };
  const redDmg = predictionData?.redDamage || { ad: 52, ap: 48, trueDmg: 0 };
  const winCondition = predictionData?.primaryWinCondition;
  const powerSpikes = predictionData?.powerSpikes || [];

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 max-w-7xl mx-auto w-full h-full max-h-full">
      {/* 1. Verdict Top Bar */}
      <div className="flex-shrink-0">
        <VerdictHeader
          blueProb={blueProb}
          redProb={redProb}
          delta={delta}
          classification={classification}
        />
      </div>

      {/* 2. Main Analytics Body: 2-Column Balanced Arena */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch h-full max-h-full overflow-hidden">
        {/* Left Column (7 cols): Hero Lane Matchups */}
        <div className="lg:col-span-7 flex flex-col min-h-0 h-full max-h-full">
          <LaneMatchupsCard
            laneMatchups={laneMatchups}
          />
        </div>

        {/* Right Column (5 cols): 4 Tactical Cards cleanly fitted without vertical overflow */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-2 min-h-0 h-full max-h-full overflow-y-auto pr-0.5">
          <WinConditionCard winCondition={winCondition} isCoachLoading={isCoachLoading} />
          <PowerCurvesCard powerSpikes={powerSpikes} isCoachLoading={isCoachLoading} />
          <TacticalCompositionCard tactical={tactical} />
          <DamageSplitCard blueDmg={blueDmg} redDmg={redDmg} />
        </div>
      </div>
    </div>
  );
}
