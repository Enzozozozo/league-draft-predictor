import React from 'react';
import { AlertTriangle, Lightbulb, ShieldCheck, Crosshair } from 'lucide-react';

export default function LaneCounterMatrixCard({ predictionData }) {
  const laneMatchups = predictionData?.laneMatchups || [];
  const winCondition = predictionData?.primaryWinCondition || {
    title: 'Disengage & Zone Control Priority',
    summary: 'Enemy engage is vulnerable to hard crowd control.',
    details:
      'Red team brings high-commitment initiation (Malphite Unstoppable Force + Leona Solar Flare). Blue composition possesses superior disengage & peel (+3.5) with Thresh Flay/Box and Ahri Charm. Blue wins by nullifying initial dives and letting Jinx reach lethal reset thresholds.',
    blueKeys: ['Thresh Flay & Lantern', 'Ahri Charm Peel', 'Jinx Hypercarry Tethering'],
    redKeys: ['Malphite Blind Flank', 'Wukong Cyclone Follow-up', 'Bursting Jinx Pre-Teamfight'],
  };

  const roleNameMap = {
    TOP: 'TOP',
    JGL: 'JGL',
    MID: 'MID',
    BOT: 'BOT',
    SUP: 'SUP',
  };

  return (
    <div className="bg-[#0B121E]/95 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between space-y-6">
      
      {/* Header */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold font-mono text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Lane Counter Matrix & Direct Interactions
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Role-by-role differentials calculated via <code className="text-amber-300 font-mono text-[11px]">champ_adv = ally_wr - enemy_wr</code>
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700/60">
            5 Lanes
          </span>
        </div>

        {/* 5 Lane Rows */}
        <div className="mt-4 space-y-2.5">
          {laneMatchups.map((matchup, idx) => {
            const isBlue = matchup.isBlueLean;
            const role = roleNameMap[matchup.role] || matchup.role;

            return (
              <div
                key={`matchup-${role}-${idx}`}
                className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-2 hover:border-slate-700 transition-colors"
              >
                {/* Role Badge */}
                <div className="w-10 text-center flex-shrink-0">
                  <span className="text-[10px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {role}
                  </span>
                </div>

                {/* Blue Side Champion */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <img
                    src={matchup.blueImage}
                    alt={matchup.blueChampion}
                    className="w-8 h-8 rounded-md border border-sky-400/60 object-cover flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Aatrox.png';
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">
                      {matchup.blueChampion}
                    </div>
                    <div className="text-[10px] font-mono text-sky-400">
                      {matchup.blueWinRate}% WR
                    </div>
                  </div>
                </div>

                {/* VS Divider */}
                <div className="px-1 text-[10px] font-mono font-bold text-slate-600">
                  VS
                </div>

                {/* Red Side Champion */}
                <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-right">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">
                      {matchup.redChampion}
                    </div>
                    <div className="text-[10px] font-mono text-rose-400">
                      {matchup.redWinRate}% WR
                    </div>
                  </div>
                  <img
                    src={matchup.redImage}
                    alt={matchup.redChampion}
                    className="w-8 h-8 rounded-md border border-rose-400/60 object-cover flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Malphite.png';
                    }}
                  />
                </div>

                {/* Edge Badge */}
                <div className="w-28 text-right flex-shrink-0">
                  <span
                    className={`inline-block text-[11px] font-mono font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                      isBlue
                        ? 'bg-sky-500/10 text-[#0AC8B9] border-[#0AC8B9]/30'
                        : 'bg-rose-500/10 text-[#E84057] border-[#E84057]/30'
                    }`}
                  >
                    {matchup.badgeText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Win Condition Text Alert Card */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-[#0A1628] border border-amber-500/30 shadow-lg space-y-3">
        <div className="flex items-center gap-2 text-amber-300">
          <Lightbulb className="w-4 h-4 flex-shrink-0 text-amber-400 animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider">
            Primary Win Condition & Kit Interactions
          </span>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <span className="text-[#0AC8B9]">▶</span>
            {winCondition.summary}
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {winCondition.details}
          </p>
        </div>

        {/* Tactical Key Levers */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-[#0AC8B9] block mb-1">
              Blue Strategic Execution:
            </span>
            <ul className="space-y-0.5 text-slate-400 text-[11px]">
              {(winCondition.blueKeys || []).map((k, i) => (
                <li key={`b-key-${i}`} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0AC8B9]" />
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-[#E84057] block mb-1">
              Red Strategic Execution:
            </span>
            <ul className="space-y-0.5 text-slate-400 text-[11px]">
              {(winCondition.redKeys || []).map((k, i) => (
                <li key={`r-key-${i}`} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E84057]" />
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
