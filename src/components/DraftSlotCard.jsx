import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { getChampion } from '../data/championsData';

export default function DraftSlotCard({
  team, // 'blue' | 'red'
  index, // 0-4
  pick, // { role: 'TOP', champion: 'Aatrox', archetype: 'Juggernaut', winRate: 51.2 }
  isActive,
  onSelectSlot,
}) {
  const isBlue = team === 'blue';
  const champData = getChampion(pick.champion);

  // Fallback image url
  const imgUrl =
    champData?.image ||
    `https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/${pick.champion}.png`;

  const roleNameMap = {
    TOP: 'TOP',
    JGL: 'JUNGLE',
    MID: 'MIDDLE',
    BOT: 'BOTTOM',
    SUP: 'UTILITY',
  };

  const fullRoleName = roleNameMap[pick.role] || pick.role;

  return (
    <div
      onClick={() => onSelectSlot(team, index)}
      className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
        isActive
          ? isBlue
            ? 'bg-slate-900/90 border-[#0AC8B9] shadow-hextech-blue ring-2 ring-[#0AC8B9]/60'
            : 'bg-slate-900/90 border-[#E84057] shadow-hextech-red ring-2 ring-[#E84057]/60'
          : isBlue
          ? 'bg-[#0B121E]/90 border-slate-800 hover:border-[#0AC8B9]/50 hover:bg-slate-900/50'
          : 'bg-[#0B121E]/90 border-slate-800 hover:border-[#E84057]/50 hover:bg-slate-900/50'
      }`}
    >
      {/* Active slot indicator badge */}
      {isActive && (
        <div
          className={`absolute -top-2.5 ${
            isBlue ? 'left-3' : 'right-3'
          } px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider text-slate-950 shadow-md ${
            isBlue ? 'bg-[#0AC8B9]' : 'bg-[#E84057]'
          }`}
        >
          Active Slot
        </div>
      )}

      <div
        className={`flex items-center gap-3.5 ${
          isBlue ? 'flex-row text-left' : 'flex-row-reverse text-right'
        }`}
      >
        {/* Champion Square Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 bg-slate-950 transition-transform duration-200 group-hover:scale-105 ${
              isActive
                ? isBlue
                  ? 'border-[#0AC8B9] shadow-lg shadow-[#0AC8B9]/30'
                  : 'border-[#E84057] shadow-lg shadow-[#E84057]/30'
                : isBlue
                ? 'border-sky-500/40'
                : 'border-rose-500/40'
            }`}
          >
            <img
              src={imgUrl}
              alt={pick.champion}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src =
                  'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Aatrox.png';
              }}
            />
          </div>

          {/* Micro slot number */}
          <span
            className={`absolute -bottom-1 ${
              isBlue ? '-right-1' : '-left-1'
            } w-4 h-4 rounded-full text-[9px] font-mono font-bold flex items-center justify-center text-slate-950 shadow ${
              isBlue ? 'bg-sky-400' : 'bg-rose-400'
            }`}
          >
            {index + 1}
          </span>
        </div>

        {/* Details: Role, Champion Name, Archetype & Win Rate */}
        <div className="flex-1 min-w-0">
          <div
            className={`flex items-center gap-1.5 ${
              isBlue ? 'justify-start' : 'justify-end'
            }`}
          >
            <span
              className={`text-[10px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                isBlue
                  ? 'bg-sky-500/10 text-[#0AC8B9] border-[#0AC8B9]/30'
                  : 'bg-rose-500/10 text-[#E84057] border-[#E84057]/30'
              }`}
            >
              {fullRoleName}
            </span>
          </div>

          <div className="text-sm sm:text-base font-bold text-slate-100 truncate mt-0.5 group-hover:text-amber-200 transition-colors">
            {pick.champion}
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
            <span className="truncate text-slate-300 font-medium">
              {pick.archetype || champData?.archetype || 'Bruiser'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-[11px] font-semibold text-amber-300/90 whitespace-nowrap">
              {pick.winRate}% WR
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
