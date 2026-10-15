import React from 'react';
import { Swords, ShieldAlert, Zap, Flame } from 'lucide-react';

// Reusable SVG Donut Chart with stroke-width approx 10px using em units
function DonutChart({ ad, ap, trueDmg, teamLabel, teamColor }) {
  const r = 38;
  const c = 2 * Math.PI * r; // ~238.761

  const adLen = (ad / 100) * c;
  const apLen = (ap / 100) * c;
  const trueLen = (trueDmg / 100) * c;

  const dominant = ad >= ap ? `${ad}% AD` : `${ap}% AP`;

  return (
    <div className="flex flex-col items-center p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex-1">
      <span className="text-xs font-mono font-bold tracking-wider uppercase mb-2" style={{ color: teamColor }}>
        {teamLabel}
      </span>

      {/* Donut Chart SVG */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Background Ring */}
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#1E293B"
            style={{ strokeWidth: '0.65em' }}
          />

          {/* Physical (AD) Arc */}
          {ad > 0 && (
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#F59E0B"
              strokeDasharray={`${adLen} ${c - adLen}`}
              strokeDashoffset="0"
              strokeLinecap="butt"
              style={{ strokeWidth: '0.65em' }}
              className="transition-all duration-700"
            />
          )}

          {/* Magic (AP) Arc */}
          {ap > 0 && (
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#A855F7"
              strokeDasharray={`${apLen} ${c - apLen}`}
              strokeDashoffset={-adLen}
              strokeLinecap="butt"
              style={{ strokeWidth: '0.65em' }}
              className="transition-all duration-700"
            />
          )}

          {/* True Damage Arc */}
          {trueDmg > 0 && (
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#E2E8F0"
              strokeDasharray={`${trueLen} ${c - trueLen}`}
              strokeDashoffset={-(adLen + apLen)}
              strokeLinecap="butt"
              style={{ strokeWidth: '0.65em' }}
              className="transition-all duration-700"
            />
          )}
        </svg>

        {/* Center Text inside Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[11px] font-mono font-extrabold text-slate-100">
            {dominant}
          </span>
          <span className="text-[9px] font-mono text-slate-500 uppercase">
            Dominant
          </span>
        </div>
      </div>

      {/* Micro Legend below Donut */}
      <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center justify-center gap-2 flex-wrap">
        <span className="text-amber-400 font-semibold">{ad}% AD</span>
        <span className="text-slate-600">•</span>
        <span className="text-purple-400 font-semibold">{ap}% AP</span>
        <span className="text-slate-600">•</span>
        <span className="text-slate-300 font-semibold">{trueDmg}% True</span>
      </div>
    </div>
  );
}

export default function TacticalSpreadCard({ predictionData }) {
  const tactical = predictionData?.tacticalDimensions || [];
  const blueDmg = predictionData?.blueDamage || { ad: 45, ap: 50, trueDmg: 5 };
  const redDmg = predictionData?.redDamage || { ad: 65, ap: 30, trueDmg: 5 };

  const iconMap = {
    'Hard Engage': Swords,
    'Disengage & Peel': ShieldAlert,
    'Poke & Siege': Zap,
    'Late-Game Scaling': Flame,
  };

  return (
    <div className="bg-[#0B121E]/95 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between space-y-6">
      
      {/* Header */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold font-mono text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Teamfight & Tactical Spreads
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparative composition dimensions on a 0.0 – 10.0 scale
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700/60">
            5v5 Aggregate
          </span>
        </div>

        {/* 4 Dimension Comparison Meters */}
        <div className="mt-4 space-y-4">
          {tactical.map((dim, idx) => {
            const Icon = iconMap[dim.name] || Swords;
            const isBlueLead = dim.advantageSide === 'Blue';
            const blueScore = dim.blue;
            const redScore = dim.red;

            return (
              <div
                key={dim.name || idx}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-slate-800 text-slate-300">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-200">
                      {dim.name}
                    </span>
                  </div>

                  {/* Differential Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400">
                      ({blueScore.toFixed(1)} vs {redScore.toFixed(1)})
                    </span>
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                        isBlueLead
                          ? 'bg-sky-500/10 text-[#0AC8B9] border-[#0AC8B9]/30'
                          : 'bg-rose-500/10 text-[#E84057] border-[#E84057]/30'
                      }`}
                    >
                      {dim.advantageText}
                    </span>
                  </div>
                </div>

                {/* Dual Visual Meters */}
                <div className="space-y-1 pt-1">
                  {/* Blue bar */}
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <span className="w-8 text-[#0AC8B9] font-bold">BLUE</span>
                    <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-[#0AC8B9] rounded-full transition-all duration-500"
                        style={{ width: `${(blueScore / 10) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right font-bold text-slate-300">
                      {blueScore.toFixed(1)}
                    </span>
                  </div>

                  {/* Red bar */}
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <span className="w-8 text-[#E84057] font-bold">RED</span>
                    <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-rose-600 to-[#E84057] rounded-full transition-all duration-500"
                        style={{ width: `${(redScore / 10) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right font-bold text-slate-300">
                      {redScore.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Damage Distribution Profile as Donut Charts (width ~10px / 0.65em) */}
      <div className="pt-2 border-t border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              Damage Distribution Profile
            </span>
            <span className="text-[10px] text-slate-500 font-mono block">
              Donut width ~10px (0.65em)
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Physical (AD)
            </span>
            <span className="flex items-center gap-1 text-purple-400">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Magic (AP)
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-slate-200" />
              True
            </span>
          </div>
        </div>

        {/* Side-by-side Dual Donut Charts */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <DonutChart
            ad={blueDmg.ad}
            ap={blueDmg.ap}
            trueDmg={blueDmg.trueDmg}
            teamLabel="Blue Side Profile"
            teamColor="#0AC8B9"
          />

          <DonutChart
            ad={redDmg.ad}
            ap={redDmg.ap}
            trueDmg={redDmg.trueDmg}
            teamLabel="Red Side Profile"
            teamColor="#E84057"
          />
        </div>
      </div>

    </div>
  );
}
