import React from 'react';
import DraftTurnHeader from './DraftTurnHeader';
import DraftSlotCard from './DraftSlotCard';
import ChampionGrid from './ChampionGrid';

export default function Phase1DraftLobby({
  bluePicks,
  redPicks,
  activeSlot,
  setActiveSlot,
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  onSelectChampion,
  onPredictWinrate,
}) {
  const handleSelectSlot = (team, index) => {
    setActiveSlot({ team, index });
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Champion Select Turn Header (No bans, clean turn state) */}
      <DraftTurnHeader
        activeSlot={activeSlot}
        bluePicks={bluePicks}
        redPicks={redPicks}
      />

      {/* 2. Symmetrical 3-Column 5v5 Drafting Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Blue Team (3 Columns on Large) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between px-2 pb-1 border-b border-sky-500/20">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0AC8B9] shadow-sm shadow-[#0AC8B9]" />
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#0AC8B9]">
                Blue Side (Team 100)
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">First Pick</span>
          </div>

          <div className="space-y-2.5">
            {bluePicks.map((pick, idx) => (
              <DraftSlotCard
                key={`blue-slot-${idx}`}
                team="blue"
                index={idx}
                pick={pick}
                isActive={activeSlot.team === 'blue' && activeSlot.index === idx}
                onSelectSlot={handleSelectSlot}
              />
            ))}
          </div>
        </div>

        {/* Center Column: Champion Grid & Action Hub (6 Columns on Large) */}
        <div className="lg:col-span-6">
          <ChampionGrid
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            activeSlot={activeSlot}
            bluePicks={bluePicks}
            redPicks={redPicks}
            onSelectChampion={onSelectChampion}
            onPredictWinrate={onPredictWinrate}
          />
        </div>

        {/* Right Column: Red Team (3 Columns on Large) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between px-2 pb-1 border-b border-rose-500/20">
            <span className="text-[11px] font-mono text-slate-400">Counter Pick</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#E84057]">
                Red Side (Team 200)
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#E84057] shadow-sm shadow-[#E84057]" />
            </div>
          </div>

          <div className="space-y-2.5">
            {redPicks.map((pick, idx) => (
              <DraftSlotCard
                key={`red-slot-${idx}`}
                team="red"
                index={idx}
                pick={pick}
                isActive={activeSlot.team === 'red' && activeSlot.index === idx}
                onSelectSlot={handleSelectSlot}
              />
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
