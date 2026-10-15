import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import Phase1DraftLobby from './components/Phase1DraftLobby';
import Phase2AnalyticsDashboard from './components/Phase2AnalyticsDashboard';
import {
  DEFAULT_BLUE_PICKS,
  DEFAULT_RED_PICKS,
  CHAMPIONS,
  getChampion,
} from './data/championsData';
import { calculateDraftPrediction, predictDraftWithBackend } from './utils/draftModel';

export default function App() {
  // Required React State (Per Specification)
  const [currentPhase, setCurrentPhase] = useState('draft'); // 'draft' | 'analytics'
  const [bluePicks, setBluePicks] = useState(DEFAULT_BLUE_PICKS);
  const [redPicks, setRedPicks] = useState(DEFAULT_RED_PICKS);
  const [activeSlot, setActiveSlot] = useState({ team: 'blue', index: 0 }); // { team: 'blue' | 'red', index: 0-4 }
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'TOP' | 'JGL' | 'MID' | 'BOT' | 'SUP'
  const [predictionData, setPredictionData] = useState(() =>
    calculateDraftPrediction(DEFAULT_BLUE_PICKS, DEFAULT_RED_PICKS)
  );

  // Recalculate prediction data whenever picks change
  useEffect(() => {
    const result = calculateDraftPrediction(bluePicks, redPicks);
    setPredictionData(result);
  }, [bluePicks, redPicks]);

  // Handle champion assignment to active team slot
  const handleSelectChampion = useCallback(
    (champ) => {
      const { team, index } = activeSlot;
      const currentTeamPicks = team === 'blue' ? bluePicks : redPicks;

      // Force distinct champions in each team slot:
      // Red and Blue can pick the same champion, but within each team slots must be unique.
      const isAlreadyOnThisTeam = currentTeamPicks.some(
        (p, idx) => idx !== index && p.champion?.toLowerCase() === champ.name.toLowerCase()
      );

      if (isAlreadyOnThisTeam) {
        return;
      }

      const targetRole =
        team === 'blue' ? bluePicks[index].role : redPicks[index].role;

      const newSlotData = {
        role: targetRole,
        champion: champ.name,
        archetype: champ.archetype || 'Specialist',
        winRate: champ.winRate || 50.0,
      };

      if (team === 'blue') {
        const nextBlue = [...bluePicks];
        nextBlue[index] = newSlotData;
        setBluePicks(nextBlue);
      } else {
        const nextRed = [...redPicks];
        nextRed[index] = newSlotData;
        setRedPicks(nextRed);
      }

      // Smooth auto-advancement to next logical draft slot
      if (index < 4) {
        setActiveSlot({ team, index: index + 1 });
      } else if (team === 'blue') {
        setActiveSlot({ team: 'red', index: 0 });
      } else {
        // Kept at Red 4 if all slots filled
        setActiveSlot({ team: 'red', index: 4 });
      }
    },
    [activeSlot, bluePicks, redPicks]
  );

  // Trigger inference and transition to Phase 2 (Analytics)
  const handlePredictWinrate = useCallback(async () => {
    // Tries Python backend first, then client calibrated fallback
    const result = await predictDraftWithBackend(bluePicks, redPicks);
    setPredictionData(result);
    setCurrentPhase('analytics');
    // Scroll smoothly to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [bluePicks, redPicks]);

  // Reset to default draft
  const handleResetDefault = useCallback(() => {
    setBluePicks(DEFAULT_BLUE_PICKS);
    setRedPicks(DEFAULT_RED_PICKS);
    setActiveSlot({ team: 'blue', index: 0 });
    setSearchQuery('');
    setRoleFilter('ALL');
    const result = calculateDraftPrediction(
      DEFAULT_BLUE_PICKS,
      DEFAULT_RED_PICKS
    );
    setPredictionData(result);
  }, []);

  // Randomize competitive drafts
  const handleRandomizeDraft = useCallback(() => {
    const rolesList = ['TOP', 'JGL', 'MID', 'BOT', 'SUP'];

    const pickForRole = (role, usedChamps) => {
      const candidates = CHAMPIONS.filter(
        (c) =>
          (c.roles?.includes(role) || c.primaryRole === role) &&
          !usedChamps.has(c.name.toLowerCase())
      );
      const chosen =
        candidates[Math.floor(Math.random() * candidates.length)] ||
        CHAMPIONS[Math.floor(Math.random() * CHAMPIONS.length)];
      usedChamps.add(chosen.name.toLowerCase());
      return {
        role,
        champion: chosen.name,
        archetype: chosen.archetype,
        winRate: chosen.winRate,
      };
    };

    // Separate used sets so red and blue can pick the same champion, but within each team all 5 are distinct
    const blueUsed = new Set();
    const newBlue = rolesList.map((r) => pickForRole(r, blueUsed));
    const redUsed = new Set();
    const newRed = rolesList.map((r) => pickForRole(r, redUsed));

    setBluePicks(newBlue);
    setRedPicks(newRed);
    const result = calculateDraftPrediction(newBlue, newRed);
    setPredictionData(result);
  }, []);

  return (
    <div className="min-h-screen bg-[#070B13] bg-hextech-grid flex flex-col text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Global Application Header */}
      <Header
        currentPhase={currentPhase}
        setCurrentPhase={setCurrentPhase}
        onResetDefault={handleResetDefault}
        onRandomizeDraft={handleRandomizeDraft}
      />

      {/* Main Interactive Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Phase State Machine Switching */}
        {currentPhase === 'draft' ? (
          <Phase1DraftLobby
            bluePicks={bluePicks}
            redPicks={redPicks}
            activeSlot={activeSlot}
            setActiveSlot={setActiveSlot}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            onSelectChampion={handleSelectChampion}
            onPredictWinrate={handlePredictWinrate}
          />
        ) : (
          <Phase2AnalyticsDashboard
            predictionData={predictionData}
            onModifyDraft={() => setCurrentPhase('draft')}
          />
        )}

      </main>

      {/* Footer / Engineering Signature */}
      <footer className="border-t border-slate-900 bg-[#050811]/90 py-5 px-6 text-xs text-slate-500 font-mono mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>GroupShuffleSplit Zero-Leakage • Isotonically Calibrated RF</span>
          </div>
          <div>
            Data Dragon CDN v14.10.1 • 173 Champions • Match-V5 Schema Ingestion
          </div>
        </div>
      </footer>

    </div>
  );
}
