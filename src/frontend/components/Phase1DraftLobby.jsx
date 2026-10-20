import React from 'react';
import DraftSlotCard from './DraftSlotCard';
import ChampionGrid from './ChampionGrid';

export default function Phase1DraftLobby({
  bluePicks,
  redPicks,
  activeSlot,
  setActiveSlot,
  onSelectChampion,
  onAssignChampionToSlot,
  draggedChampion,
  setDraggedChampion,
  onPredictWinrate,
  isPredicting,
}) {
  const handleSelectSlot = (team, index) => {
    setActiveSlot((prev) => {
      if (prev?.team === team && prev?.index === index) {
        return null;
      }
      return { team, index };
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Single-Page 3-Column 5v5 Drafting Arena (22% Blue / 56% Grid / 22% Red) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[22fr_56fr_22fr] gap-4 items-stretch">
        
        {/* Left Column: Blue Team Positions */}
        <div className="flex-1 min-h-0 grid grid-rows-5 gap-2">
          {bluePicks.map((pick, idx) => (
            <DraftSlotCard
              key={`blue-slot-${idx}`}
              team="blue"
              index={idx}
              pick={pick}
              isActive={activeSlot?.team === 'blue' && activeSlot?.index === idx}
              onSelectSlot={handleSelectSlot}
              onDropChampion={onAssignChampionToSlot}
              draggedChampion={draggedChampion}
              setDraggedChampion={setDraggedChampion}
            />
          ))}
        </div>

        {/* Center Column: 5-Per-Row Champion Grid & Action Hub */}
        <div className="flex flex-col min-h-0">
          <ChampionGrid
            activeSlot={activeSlot}
            bluePicks={bluePicks}
            redPicks={redPicks}
            onSelectChampion={onSelectChampion}
            draggedChampion={draggedChampion}
            setDraggedChampion={setDraggedChampion}
            onPredictWinrate={onPredictWinrate}
            isPredicting={isPredicting}
          />
        </div>

        {/* Right Column: Red Team Positions */}
        <div className="flex-1 min-h-0 grid grid-rows-5 gap-2">
          {redPicks.map((pick, idx) => (
            <DraftSlotCard
              key={`red-slot-${idx}`}
              team="red"
              index={idx}
              pick={pick}
              isActive={activeSlot?.team === 'red' && activeSlot?.index === idx}
              onSelectSlot={handleSelectSlot}
              onDropChampion={onAssignChampionToSlot}
              draggedChampion={draggedChampion}
              setDraggedChampion={setDraggedChampion}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
