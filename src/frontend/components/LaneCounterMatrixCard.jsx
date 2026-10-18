import React from 'react';
import { Lightbulb } from 'lucide-react';

const ROLE_ICON_URLS = {
  TOP: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-top.png',
  JGL: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-jungle.png',
  MID: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-middle.png',
  BOT: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-bottom.png',
  SUP: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-utility.png',
};

export default function LaneCounterMatrixCard({ predictionData, onEditSlot }) {
  const laneMatchups = predictionData?.laneMatchups || [];
  const winCondition = predictionData?.primaryWinCondition || {
    title: 'Disengage & Zone Control Priority',
    summary: 'Enemy engage is vulnerable to hard crowd control.',
    details:
      'Red team brings high-commitment initiation (Malphite Unstoppable Force + Leona Solar Flare). Blue composition possesses superior disengage & peel (+3.5) with Thresh Flay/Box and Ahri Charm. Blue wins by nullifying initial dives and letting Jinx reach lethal reset thresholds.',
    blueKeys: ['Thresh Flay & Lantern', 'Ahri Charm Peel', 'Jinx Hypercarry Tethering'],
    redKeys: ['Malphite Blind Flank', 'Wukong Cyclone Follow-up', 'Bursting Jinx Pre-Teamfight'],
  };

  return (
    <div className="bg-[#0B121E]/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col justify-between h-full min-h-0 gap-3">
      
      {/* Top Section: 5 Lane Matchups */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 flex-shrink-0">
          <div>
            <h3 className="text-sm sm:text-base font-bold font-mono text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Lane Matchup Breakdown
            </h3>
            <p className="text-[11px] text-slate-400">
              Click any champion below to jump back and swap that lane pick
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700/60">
            Role vs Role
          </span>
        </div>

        {/* 5 Lane Rows */}
        <div className="mt-3 flex-1 flex flex-col justify-between gap-2">
          {laneMatchups.map((matchup, idx) => {
            const isBlue = matchup.isBlueLean;
            const role = matchup.role || 'TOP';
            const roleIcon = ROLE_ICON_URLS[role] || ROLE_ICON_URLS.TOP;

            return (
              <div
                key={`matchup-${role}-${idx}`}
                className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 grid grid-cols-[1fr_auto_1fr] items-center gap-2 hover:border-slate-700 transition-colors"
              >
                {/* Blue Side Champion (Click to Swap) */}
                <button
                  type="button"
                  onClick={() => onEditSlot && onEditSlot('blue', idx, role)}
                  title={`Click to swap Blue ${role} (${matchup.blueChampion})`}
                  className="flex items-center gap-2.5 min-w-0 text-left group rounded-lg p-1 -m-1 hover:bg-[#0AC8B9]/10 transition-colors"
                >
                  <img
                    src={matchup.blueImage}
                    alt={matchup.blueChampion}
                    className="w-9 h-9 rounded-lg border border-[#0AC8B9]/60 group-hover:border-[#0AC8B9] object-cover flex-shrink-0 transition-transform group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://ddragon.leagueoflegends.com/cdn/16.20.1/img/champion/Aatrox.png';
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-[#0AC8B9] truncate transition-colors">
                      {matchup.blueChampion}
                    </div>
                    <div className="text-[10px] font-mono text-[#0AC8B9]">
                      {matchup.blueWinRate}% WR
                    </div>
                  </div>
                </button>

                {/* Center Role Icon + Edge Pill */}
                <div className="flex flex-col items-center justify-center px-2">
                  <img
                    src={roleIcon}
                    alt={role}
                    className="w-5 h-5 object-contain opacity-85 mb-0.5"
                  />
                  <span
                    className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                      isBlue
                        ? 'bg-[#0AC8B9]/10 text-[#0AC8B9] border-[#0AC8B9]/30'
                        : 'bg-[#E84057]/10 text-[#E84057] border-[#E84057]/30'
                    }`}
                  >
                    {matchup.badgeText}
                  </span>
                </div>

                {/* Red Side Champion (Click to Swap) */}
                <button
                  type="button"
                  onClick={() => onEditSlot && onEditSlot('red', idx, role)}
                  title={`Click to swap Red ${role} (${matchup.redChampion})`}
                  className="flex items-center justify-end gap-2.5 min-w-0 text-right group rounded-lg p-1 -m-1 hover:bg-[#E84057]/10 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-[#E84057] truncate transition-colors">
                      {matchup.redChampion}
                    </div>
                    <div className="text-[10px] font-mono text-[#E84057]">
                      {matchup.redWinRate}% WR
                    </div>
                  </div>
                  <img
                    src={matchup.redImage}
                    alt={matchup.redChampion}
                    className="w-9 h-9 rounded-lg border border-[#E84057]/60 group-hover:border-[#E84057] object-cover flex-shrink-0 transition-transform group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://ddragon.leagueoflegends.com/cdn/16.20.1/img/champion/Malphite.png';
                    }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Primary Win Condition & Strategic Execution */}
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900 to-[#0A1628] border border-amber-500/30 shadow-lg space-y-2 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-300">
            <Lightbulb className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">
              Win Condition: {winCondition.summary}
            </span>
          </div>
        </div>

        <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-sans">
          {winCondition.details}
        </p>

        {/* Tactical Key Levers */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-[#0AC8B9] block mb-1">
              Blue Side Keys:
            </span>
            <ul className="space-y-0.5 text-slate-300 text-[11px]">
              {(winCondition.blueKeys || []).map((k, i) => (
                <li key={`b-key-${i}`} className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0AC8B9] flex-shrink-0" />
                  <span className="truncate">{k}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-[#E84057] block mb-1">
              Red Side Keys:
            </span>
            <ul className="space-y-0.5 text-slate-300 text-[11px]">
              {(winCondition.redKeys || []).map((k, i) => (
                <li key={`r-key-${i}`} className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E84057] flex-shrink-0" />
                  <span className="truncate">{k}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
