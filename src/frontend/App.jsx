import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Phase1DraftLobby from './components/Phase1DraftLobby';
import Phase2AnalyticsDashboard from './components/Phase2AnalyticsDashboard';
import {
  DEFAULT_BLUE_PICKS,
  DEFAULT_RED_PICKS,
  EMPTY_BLUE_PICKS,
  EMPTY_RED_PICKS,
  CHAMPIONS,
} from './data/championsData';
import {
  calculateDraftPrediction,
  predictDraftWithBackend,
  fetchAsyncCoachAnalysis,
} from './utils/draftModel';

export default function App() {
  const [currentPhase, setCurrentPhase] = useState('draft'); // 'draft' | 'analytics'
  const [bluePicks, setBluePicks] = useState(DEFAULT_BLUE_PICKS);
  const [redPicks, setRedPicks] = useState(DEFAULT_RED_PICKS);
  const [activeSlot, setActiveSlot] = useState(null); // null on initial load = no role selected
  const [predictionData, setPredictionData] = useState(() =>
    calculateDraftPrediction(DEFAULT_BLUE_PICKS, DEFAULT_RED_PICKS)
  );

  const [draggedChampion, setDraggedChampion] = useState(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);

  // Recalculate prediction data locally as instant preview in draft mode
  useEffect(() => {
    if (currentPhase === 'draft') {
      const result = calculateDraftPrediction(bluePicks, redPicks);
      setPredictionData(result);
    }
  }, [bluePicks, redPicks, currentPhase]);

  // Prevent global Ctrl+A from selecting the entire application window outside of text inputs
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        const tag = e.target?.tagName;
        const isInput =
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          Boolean(e.target?.isContentEditable);
        if (!isInput) {
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Assign a champion to a specific (team, index) position slot (via click or drag-and-drop)
  const handleAssignChampionToSlot = useCallback(
    (champ, targetTeam = activeSlot?.team, targetIndex = activeSlot?.index, sourceSlot = null) => {
      if (!champ) return;
      if (!targetTeam || targetIndex == null || targetIndex < 0) return;

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

  // Clicking a champion in the grid assigns it to the currently selected position slot (or first unfilled slot)
  const handleSelectChampion = useCallback(
    (champ) => {
      if (!champ) return;
      if (activeSlot && activeSlot.team && activeSlot.index != null) {
        handleAssignChampionToSlot(champ, activeSlot.team, activeSlot.index);
        return;
      }
      // If no slot is selected yet, assign to first unfilled slot on Blue, then Red
      const blueEmptyIdx = bluePicks.findIndex((p) => !p.champion);
      if (blueEmptyIdx !== -1) {
        handleAssignChampionToSlot(champ, 'blue', blueEmptyIdx);
        return;
      }
      const redEmptyIdx = redPicks.findIndex((p) => !p.champion);
      if (redEmptyIdx !== -1) {
        handleAssignChampionToSlot(champ, 'red', redEmptyIdx);
        return;
      }
      // If all are filled and user clicks a champion without a selection, select Blue TOP
      handleAssignChampionToSlot(champ, 'blue', 0);
    },
    [handleAssignChampionToSlot, activeSlot, bluePicks, redPicks]
  );

  // Merges the LLM coach's response into the current prediction without blocking the UI
  const streamCoachInsights = useCallback((blue, red, result) => {
    setIsCoachLoading(true);
    fetchAsyncCoachAnalysis(
      blue,
      red,
      result.tacticalDimensions,
      result.blueDamage,
      result.redDamage,
      result.powerSpikes
    ).then((coachResult) => {
      if (coachResult) {
        setPredictionData((prev) => {
          if (!prev) return prev;
          const notes = coachResult.spikeNotes;
          return {
            ...prev,
            powerSpikes: notes
              ? prev.powerSpikes.map((spike, i) => ({ ...spike, details: notes[i] || spike.details }))
              : prev.powerSpikes,
            primaryWinCondition: {
              ...prev.primaryWinCondition,
              title: coachResult.title || prev.primaryWinCondition.title,
              summary: coachResult.summary || prev.primaryWinCondition.summary,
              blueExecution: coachResult.blueExecution || prev.primaryWinCondition.blueExecution,
              redExecution: coachResult.redExecution || prev.primaryWinCondition.redExecution,
              coachModel: coachResult.isLLM ? coachResult.model : prev.primaryWinCondition.coachModel,
            },
          };
        });
      }
    }).finally(() => {
      setIsCoachLoading(false);
    });
  }, []);

  // Switch to the analytics view immediately using the local prediction, then upgrade it with the
  // backend model and stream the LLM coach in the background. Nothing here blocks the redirect.
  const handlePredictWinrate = useCallback(async () => {
    setCurrentPhase('analytics');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const result = await predictDraftWithBackend(bluePicks, redPicks);
    setPredictionData(result);
    streamCoachInsights(bluePicks, redPicks, result);
  }, [bluePicks, redPicks, streamCoachInsights]);

  // Reset clears all champion picks to empty slate (reactive effect updates predictionData automatically)
  const handleResetDefault = useCallback(() => {
    setBluePicks(EMPTY_BLUE_PICKS);
    setRedPicks(EMPTY_RED_PICKS);
    setActiveSlot(null);
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

      {/* Main Interactive Container: Both the draft and analytics views fit on a single screen with generous edge padding */}
      <main className="flex-1 min-h-0 w-full max-w-[1800px] mx-auto px-6 sm:px-10 lg:px-14 xl:px-16 py-1.5 flex flex-col">
        
        {/* Phase State Machine Switching */}
        {currentPhase === 'draft' ? (
          <Phase1DraftLobby
            bluePicks={bluePicks}
            redPicks={redPicks}
            activeSlot={activeSlot}
            setActiveSlot={setActiveSlot}
            onSelectChampion={handleSelectChampion}
            onAssignChampionToSlot={handleAssignChampionToSlot}
            draggedChampion={draggedChampion}
            setDraggedChampion={setDraggedChampion}
            onPredictWinrate={handlePredictWinrate}
          />
        ) : (
          <Phase2AnalyticsDashboard
            predictionData={predictionData}
            isCoachLoading={isCoachLoading}
          />
        )}

      </main>

    </div>
  );
}
