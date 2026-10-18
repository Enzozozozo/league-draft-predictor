import React from 'react';
import { Swords, ShieldAlert, Zap, Flame } from 'lucide-react';

function DamageProfileCard({ ad, ap, trueDmg, teamLabel, teamColor }) {
  const r = 34;
  const c = 2 * Math.PI * r;

  const adLen = (ad / 100) * c;
  const apLen = (ap / 100) * c;
  const trueLen = (trueDmg / 100) * c;

  const dominant = ad >= ap ? `${ad}% AD` : `${ap}% AP`;
  const threatHint =
    ad >= 68
      ? 'Heavy AD — Vulnerable to Armor'
      : ap >= 68
      ? 'Heavy AP — Vulnerable to MR'
      : 'Balanced Mixed Damage';

  return (
    <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex-1">
      {/* Compact Donut SVG */}
      <div className="relative w-20 h-20 xl:w-24 xl:h-24 flex-shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#1E293B"
            strokeWidth="10"
          />
          {ad > 0 && (
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#F59E0B"
              strokeDasharray={`${adLen} ${c - adLen}`}
              strokeDashoffset="0"
              strokeWidth="10"
              className="transition-all duration-700"
            />
          )}
          {ap > 0 && (
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#A855F7"
              strokeDasharray={`${apLen} ${c - apLen}`}
              strokeDashoffset={-adLen}
              strokeWidth="10"
              className="transition-all duration-700"
            />
          )}
          {trueDmg > 0 && (
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#E2E8F0"
              strokeDasharray={`${trueLen} ${c - trueLen}`}
              strokeDashoffset={-(adLen + apLen)}
              strokeWidth="10"
              className="transition-all duration-700"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[11px] font-mono font-extrabold text-slate-100 leading-none">
            {dominant}
          </span>
          <span className="text-[8px] font-mono text-slate-500 uppercase mt-0.5">
            Primary
          </span>
        </div>
      </div>

      {/* Right Info & Breakdown */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-mono font-bold tracking-wider uppercase"
            style={{ color: teamColor }}
          >
            {teamLabel}
          </span>
        </div>

        {/* Stacked Horizontal Damage Bar */}
        <div className="h-2 w-full rounded-full overflow-hidden flex bg-slate-950 border border-slate-800">
          <div style={{ width: `${ad}%` }} className="bg-amber-400 transition-all duration-500" />
          <div style={{ width: `${ap}%` }} className="bg-purple-500 transition-all duration-500" />
          <div style={{ width: `${trueDmg}%` }} className="bg-slate-200 transition-all duration-500" />
        </div>

        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2 flex-wrap">
          <span className="text-amber-400 font-semibold">{ad}% AD</span>
          <span className="text-slate-600">•</span>
          <span className="text-purple-400 font-semibold">{ap}% AP</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 font-semibold">{trueDmg}% True</span>
        </div>

        <div className="text-[10px] font-sans text-slate-400 truncate">
          {threatHint}
        </div>
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
    <div className="bg-[#0B121E]/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col justify-between h-full min-h-0 gap-3">
      
      {/* Top Section: Mirrored Head-to-Head Tactical Spreads */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 flex-shrink-0">
          <div>
            <h3 className="text-sm sm:text-base font-bold font-mono text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Teamfight & Tactical Profile
            </h3>
            <p className="text-[11px] text-slate-400">
              Head-to-head composition ratings (0.0 – 10.0)
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono font-bold">
            <span className="text-[#0AC8B9]">← BLUE</span>
            <span className="text-slate-600">|</span>
            <span className="text-[#E84057]">RED →</span>
          </div>
        </div>

        {/* 4 Mirrored Dimension Rows */}
        <div className="mt-3 flex-1 flex flex-col justify-between gap-2">
          {tactical.map((dim, idx) => {
            const Icon = iconMap[dim.name] || Swords;
            const isBlueLead = dim.advantageSide === 'Blue';
            const blueScore = dim.blue;
            const redScore = dim.red;
            const isTie = Math.abs(blueScore - redScore) < 0.05;

            return (
              <div
                key={dim.name || idx}
                className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-center gap-1.5 hover:border-slate-700 transition-colors"
              >
                {/* Top Label Row: Blue Score | Dimension + Edge Badge | Red Score */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs sm:text-sm font-mono font-extrabold w-10 ${
                      isBlueLead && !isTie ? 'text-[#0AC8B9]' : 'text-slate-400'
                    }`}
                  >
                    {blueScore.toFixed(1)}
                  </span>

                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      {dim.name}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        isTie
                          ? 'bg-slate-800 text-slate-300 border-slate-700'
                          : isBlueLead
                          ? 'bg-[#0AC8B9]/10 text-[#0AC8B9] border-[#0AC8B9]/30'
                          : 'bg-[#E84057]/10 text-[#E84057] border-[#E84057]/30'
                      }`}
                    >
                      {dim.advantageText}
                    </span>
                  </div>

                  <span
                    className={`text-xs sm:text-sm font-mono font-extrabold w-10 text-right ${
                      !isBlueLead && !isTie ? 'text-[#E84057]' : 'text-slate-400'
                    }`}
                  >
                    {redScore.toFixed(1)}
                  </span>
                </div>

                {/* Mirrored Opposing Bars (Blue grows left from center, Red grows right from center) */}
                <div className="grid grid-cols-2 gap-1 items-center">
                  {/* Blue Left Half (right-aligned bar) */}
                  <div className="h-2 bg-slate-950 rounded-l-full overflow-hidden flex justify-end p-[1px] border border-r-0 border-slate-800/80">
                    <div
                      className={`h-full rounded-l-full transition-all duration-500 ${
                        isBlueLead
                          ? 'bg-gradient-to-l from-[#0AC8B9] to-teal-500'
                          : 'bg-[#0AC8B9]/45'
                      }`}
                      style={{ width: `${(blueScore / 10) * 100}%` }}
                    />
                  </div>

                  {/* Red Right Half (left-aligned bar) */}
                  <div className="h-2 bg-slate-950 rounded-r-full overflow-hidden flex justify-start p-[1px] border border-l-0 border-slate-800/80">
                    <div
                      className={`h-full rounded-r-full transition-all duration-500 ${
                        !isBlueLead && !isTie
                          ? 'bg-gradient-to-r from-[#E84057] to-rose-600'
                          : 'bg-[#E84057]/45'
                      }`}
                      style={{ width: `${(redScore / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Damage Distribution Profile */}
      <div className="pt-2.5 border-t border-slate-800/80 space-y-2.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Damage Split & Itemization Threat
          </span>

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

        <div className="flex flex-col sm:flex-row gap-3">
          <DamageProfileCard
            ad={blueDmg.ad}
            ap={blueDmg.ap}
            trueDmg={blueDmg.trueDmg}
            teamLabel="Blue Side"
            teamColor="#0AC8B9"
          />

          <DamageProfileCard
            ad={redDmg.ad}
            ap={redDmg.ap}
            trueDmg={redDmg.trueDmg}
            teamLabel="Red Side"
            teamColor="#E84057"
          />
        </div>
      </div>

    </div>
  );
}
