import React from 'react';
import ExecutiveSummaryBar from './ExecutiveSummaryBar';
import ExecutiveKpiCards from './ExecutiveKpiCards';
import TacticalSpreadCard from './TacticalSpreadCard';
import LaneCounterMatrixCard from './LaneCounterMatrixCard';

export default function Phase2AnalyticsDashboard({
  predictionData,
  onModifyDraft,
}) {
  return (
    <div className="space-y-6">
      
      {/* 1. Top Executive Summary Bar with Tug-of-War Probability */}
      <ExecutiveSummaryBar
        predictionData={predictionData}
        onModifyDraft={onModifyDraft}
      />

      {/* 2. Executive KPI Cards Row (3 Cards) */}
      <ExecutiveKpiCards
        predictionData={predictionData}
      />

      {/* 3. Tactical Composition Breakdown (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Column: Teamfight & Tactical Spreads + Damage Profile */}
        <TacticalSpreadCard
          predictionData={predictionData}
        />

        {/* Right Column: Lane Counter Matrix + Primary Win Condition */}
        <LaneCounterMatrixCard
          predictionData={predictionData}
        />

      </div>

    </div>
  );
}
