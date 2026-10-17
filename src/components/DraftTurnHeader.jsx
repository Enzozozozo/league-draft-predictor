import React from 'react';
import { GripVertical, MousePointerClick } from 'lucide-react';

export default function DraftTurnHeader({
  activeSlot,
  bluePicks,
  redPicks,
}) {
  const isBlue = activeSlot.team === 'blue';
  const activeRoleName = isBlue
    ? bluePicks[activeSlot.index]?.role || 'TOP'
    : redPicks[activeSlot.index]?.role || 'TOP';

  return (
    <div className="bg-[#091428]/90 border border-slate-800 rounded-xl px-4 py-1.5 shadow-xl backdrop-blur flex flex-col sm:flex-row items-center justify-between gap-2 flex-shrink-0">
      <div className="font-hextech text-sm sm:text-base font-bold tracking-widest text-hextech-gold">
        CHAMPION SELECT
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-center">
        <div className="px-3 py-1 rounded-lg bg-slate-950/90 border border-slate-800 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
          <MousePointerClick className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">Selected Position:</span>
          <span className={isBlue ? 'text-[#0AC8B9] font-bold' : 'text-[#E84057] font-bold'}>
            {activeSlot.team.toUpperCase()} {activeRoleName}
          </span>
        </div>
        <span className="text-slate-400 text-[11px] font-mono hidden md:flex items-center gap-1">
          <GripVertical className="w-3.5 h-3.5 text-amber-400/80" />
          Select position & click, or drag & drop any champion into a slot
        </span>
      </div>
    </div>
  );
}
