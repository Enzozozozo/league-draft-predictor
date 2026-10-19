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
  onAssignChampionToSlot,
  draggedChampion,
  setDraggedChampion,
  onPredictWinrate,
}) {
  const handleSelectSlot = (team, index) => {
    setActiveSlot({ team, index });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      
      {/* 1. Position Selector & Drag-and-Drop Status Bar */}
      <DraftTurnHeader
        activeSlot={activeSlot}
        bluePicks={bluePicks}
        redPicks={redPicks}
      />

      {/* 2. Single-Page 3-Column 5v5 Drafting Arena (22% Blue / 56% Grid / 22% Red) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[22fr_56fr_22fr] gap-4 items-stretch">
        
        {/* Left Column: Blue Team Positions */}
        <div className="flex flex-col min-h-0 gap-1.5">
          <div className="px-2 pb-1 border-b border-sky-500/20 flex-shrink-0">
            <h2 className="text-2xl leading-tight font-extrabold font-sans uppercase tracking-wider text-[#0AC8B9]">
              Blue Side
            </h2>
          </div>

          <div className="flex-1 min-h-0 grid grid-rows-5 gap-2">
            {bluePicks.map((pick, idx) => (
              <DraftSlotCard
                key={`blue-slot-${idx}`}
                team="blue"
                index={idx}
                pick={pick}
                isActive={activeSlot.team === 'blue' && activeSlot.index === idx}
                onSelectSlot={handleSelectSlot}
                onDropChampion={onAssignChampionToSlot}
                draggedChampion={draggedChampion}
                setDraggedChampion={setDraggedChampion}
              />
            ))}
          </div>
        </div>

        {/* Center Column: 5-Per-Row Champion Grid & Action Hub */}
        <div className="flex flex-col min-h-0">
          <ChampionGrid
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            activeSlot={activeSlot}
            bluePicks={bluePicks}
            redPicks={redPicks}
            onSelectChampion={onSelectChampion}
            draggedChampion={draggedChampion}
            setDraggedChampion={setDraggedChampion}
            onPredictWinrate={onPredictWinrate}
          />
        </div>

        {/* Right Column: Red Team Positions */}
        <div className="flex flex-col min-h-0 gap-1.5">
          <div className="px-2 pb-1 border-b border-rose-500/20 flex-shrink-0 text-right">
            <h2 className="text-2xl leading-tight font-extrabold font-sans uppercase tracking-wider text-[#E84057]">
              Red Side
            </h2>
          </div>

          <div className="flex-1 min-h-0 grid grid-rows-5 gap-2">
            {redPicks.map((pick, idx) => (
              <DraftSlotCard
                key={`red-slot-${idx}`}
                team="red"
                index={idx}
                pick={pick}
                isActive={activeSlot.team === 'red' && activeSlot.index === idx}
                onSelectSlot={handleSelectSlot}
                onDropChampion={onAssignChampionToSlot}
                draggedChampion={draggedChampion}
                setDraggedChampion={setDraggedChampion}
              />
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
