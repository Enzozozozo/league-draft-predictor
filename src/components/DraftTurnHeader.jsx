import React from 'react';

export default function DraftTurnHeader({ activeSlot, bluePicks, redPicks }) {
  const isBlue = activeSlot.team === 'blue';
  const activeRoleName = isBlue
    ? bluePicks[activeSlot.index]?.role || 'PICK'
    : redPicks[activeSlot.index]?.role || 'PICK';

  return (
    <div className="bg-[#091428]/90 border border-slate-800 rounded-2xl px-6 py-3.5 shadow-xl backdrop-blur flex flex-col sm:flex-row items-center justify-between gap-3">
      {/* Title */}
      <div className="font-hextech text-base sm:text-lg font-bold tracking-widest text-hextech-gold">
        CHAMPION SELECT
      </div>

      {/* Active Turn text without blinking circle */}
      <div className="flex items-center gap-3">
        <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono uppercase tracking-wider">
          <span className="text-slate-400">Active Selection: </span>
          <span className={isBlue ? 'text-[#0AC8B9] font-bold' : 'text-[#E84057] font-bold'}>
            {activeSlot.team.toUpperCase()} {activeRoleName} (Slot {activeSlot.index + 1})
          </span>
        </div>
        <span className="text-slate-500 text-xs font-mono hidden md:inline">
          Pick {activeSlot.index + (isBlue ? 1 : 6)} of 10
        </span>
      </div>
    </div>
  );
}
