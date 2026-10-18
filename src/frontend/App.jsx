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

  const [draggedChampion, setDraggedChampion] = useState(null);

  // Recalculate prediction data whenever picks change
  useEffect(() => {
    const result = calculateDraftPrediction(bluePicks, redPicks);
    setPredictionData(result);
  }, [bluePicks, redPicks]);

  // Assign a champion to a specific (team, index) position slot (via click or drag-and-drop)
  const handleAssignChampionToSlot = useCallback(
    (champ, targetTeam = activeSlot.team, targetIndex = activeSlot.index, sourceSlot = null) => {
      if (!champ) return;

      const setTeamPicks = targetTeam === 'blue' ? setBluePicks : setRedPicks;

      setTeamPicks((prevPicks) => {
        const nextPicks = [...prevPicks];
        const targetRole = nextPicks[targetIndex]?.role || 'TOP';

        // Check if this champion is already in another slot on the target team
        const existingIdx = nextPicks.findIndex(
          (p, idx) => idx !== targetIndex && p.champion?.toLowerCase() === champ.name.toLowerCase()
        );

        // If dragged from another slot on the same team, or already in another slot on the same team, swap their champions
        const swapIdx =
          sourceSlot && sourceSlot.team === targetTeam && sourceSlot.index !== targetIndex
            ? sourceSlot.index
            : existingIdx;

        if (swapIdx !== -1 && swapIdx !== targetIndex) {
          const displaced = nextPicks[targetIndex];
          const sourceRole = nextPicks[swapIdx].role;
          nextPicks[swapIdx] = {
            ...displaced,
            role: sourceRole,
          };
        }

        nextPicks[targetIndex] = {
          role: targetRole,
          champion: champ.name,
          archetype: champ.archetype || 'Specialist',
          winRate: champ.winRate ?? 50.0,
        };

        return nextPicks;
      });

      // Keep focus on the position slot that was clicked or dropped into
      setActiveSlot({ team: targetTeam, index: targetIndex });
    },
    [activeSlot]
  );

  // Clicking a champion in the grid assigns it to the currently selected position slot
  const handleSelectChampion = useCallback(
    (champ) => {
      handleAssignChampionToSlot(champ, activeSlot.team, activeSlot.index);
    },
    [handleAssignChampionToSlot, activeSlot]
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

  const handleEditSlotFromAnalytics = useCallback((team, index, role) => {
    setActiveSlot({ team, index });
    if (role) {
      setRoleFilter(role);
    }
    setCurrentPhase('draft');
  }, []);

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#070B13] bg-hextech-grid flex flex-col text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Global Application Header */}
      <Header
        currentPhase={currentPhase}
        setCurrentPhase={setCurrentPhase}
        onResetDefault={handleResetDefault}
        onRandomizeDraft={handleRandomizeDraft}
      />

      {/* Main Interactive Container: Both Phase 1 and Phase 2 fit on a single screen with generous edge padding */}
      <main className="flex-1 min-h-0 w-full max-w-[1800px] mx-auto px-6 sm:px-10 lg:px-14 xl:px-16 py-1.5 flex flex-col">
        
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
            onAssignChampionToSlot={handleAssignChampionToSlot}
            draggedChampion={draggedChampion}
            setDraggedChampion={setDraggedChampion}
            onPredictWinrate={handlePredictWinrate}
          />
        ) : (
          <Phase2AnalyticsDashboard
            predictionData={predictionData}
            onModifyDraft={() => setCurrentPhase('draft')}
            onEditSlot={handleEditSlotFromAnalytics}
          />
        )}

      </main>

      {/* Footer / Engineering Signature */}
      <footer className="border-t border-slate-900 bg-[#050811]/90 text-xs text-slate-500 font-mono py-1.5 px-6 sm:px-10 lg:px-14 xl:px-16 flex-shrink-0">
        <div className="max-w-[1800px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>GroupShuffleSplit Zero-Leakage • Isotonically Calibrated RF</span>
          </div>
          <div>
            Data Dragon CDN v16.20.1 • 173 Champions • Match-V5 Schema Ingestion
          </div>
        </div>
      </footer>

    </div>
  );
}
