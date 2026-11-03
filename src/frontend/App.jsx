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
  getChampion,
} from './data/championsData';
import {
  calculateDraftPrediction,
  predictDraftWithBackend,
  fetchAsyncCoachAnalysis,
  fetchLatestPlayerDraft,
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
  const [isPredicting, setIsPredicting] = useState(false);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [isSearchingSummoner, setIsSearchingSummoner] = useState(false);
  const [searchNotification, setSearchNotification] = useState(null);

  // Auto-dismiss search status after 5 seconds
  useEffect(() => {
    if (searchNotification) {
      const timer = setTimeout(() => setSearchNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchNotification]);

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
              coachModel: coachResult.model || (coachResult.isLLM ? 'Groq AI' : 'Tactical Engine'),
            },
          };
        });
      }
    }).finally(() => {
      setIsCoachLoading(false);
    });
  }, []);

  // Run predictions first while showing loading indicator on the hero button, then transition to analytics smoothly
  const handlePredictWinrate = useCallback(async () => {
    setIsPredicting(true);
    try {
      const result = await predictDraftWithBackend(bluePicks, redPicks);
      setPredictionData(result);
      setCurrentPhase('analytics');
      setIsCoachLoading(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      streamCoachInsights(bluePicks, redPicks, result);
    } catch (err) {
      console.error('Backend prediction failed, using fallback:', err);
      const fallback = calculateDraftPrediction(bluePicks, redPicks);
      setPredictionData(fallback);
      setCurrentPhase('analytics');
    } finally {
      setIsPredicting(false);
    }
  }, [bluePicks, redPicks, streamCoachInsights]);

  // Reset clears all champion picks to empty slate (no champion icon)
  const handleResetDefault = useCallback(() => {
    const emptyBlue = EMPTY_BLUE_PICKS.map((p) => ({ ...p }));
    const emptyRed = EMPTY_RED_PICKS.map((p) => ({ ...p }));
    setBluePicks(emptyBlue);
    setRedPicks(emptyRed);
    setActiveSlot(null);
    setPredictionData(calculateDraftPrediction(emptyBlue, emptyRed));
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

  const handleLogoClick = useCallback(() => {
    setCurrentPhase('draft');
    setActiveSlot(null);
  }, []);

  // Fetch summoner's most recent match draft and populate the lobby
  const handleSearchSummoner = useCallback(async ({ summonerId, region }) => {
    if (!summonerId?.trim() || isSearchingSummoner) return;
    setIsSearchingSummoner(true);
    setSearchNotification(null);

    try {
      const res = await fetchLatestPlayerDraft(summonerId.trim(), region);
      if (res && res.success && res.bluePicks && res.redPicks) {
        // Normalize picks through frontend getChampion to ensure exact assets and metrics match
        const normalizePick = (p) => {
          const c = getChampion(p.champion);
          return {
            role: p.role,
            champion: c ? c.name : p.champion,
            archetype: c?.archetype || p.archetype || 'Specialist',
            winRate: c?.winRate ?? p.winRate ?? 50.0,
          };
        };

        const newBlue = res.bluePicks.map(normalizePick);
        const newRed = res.redPicks.map(normalizePick);

        setBluePicks(newBlue);
        setRedPicks(newRed);
        setActiveSlot(null);

        // Immediate local calculation
        const localPred = calculateDraftPrediction(newBlue, newRed);
        setPredictionData(localPred);

        const playerNote = res.searchedPlayer
          ? ` (${res.searchedPlayer.champion} · ${res.searchedPlayer.teamSide} Team)`
          : '';
        const matchLabel = res.matchId ? `[${res.matchId}] ` : '';
        setSearchNotification({
          type: 'success',
          message: `${matchLabel}Loaded latest match draft${playerNote}`,
        });

        // Trigger ML backend prediction in background if server is online
        predictDraftWithBackend(newBlue, newRed).then((backendPred) => {
          if (backendPred) {
            setPredictionData(backendPred);
          }
        });
      } else {
        setSearchNotification({
          type: 'error',
          message: res?.error || `No recent matches found for ${summonerId}.`,
        });
      }
    } catch (err) {
      setSearchNotification({
        type: 'error',
        message: err.message || 'Error communicating with API.',
      });
    } finally {
      setIsSearchingSummoner(false);
    }
  }, [isSearchingSummoner]);

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#070B13] bg-hextech-grid flex flex-col text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Global Application Header */}
      <Header
        currentPhase={currentPhase}
        setCurrentPhase={setCurrentPhase}
        onResetDefault={handleResetDefault}
        onRandomizeDraft={handleRandomizeDraft}
        onLogoClick={handleLogoClick}
        onSearchSummoner={handleSearchSummoner}
        isSearchingSummoner={isSearchingSummoner}
        searchNotification={searchNotification}
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
            isPredicting={isPredicting}
          />
        ) : (
          <Phase2AnalyticsDashboard
            predictionData={predictionData}
            isCoachLoading={isCoachLoading}
          />
        )}

      </main>

      {/* Riot Games Compliance Footer */}
      <footer className="w-full flex-shrink-0 py-1.5 px-4 text-center border-t border-slate-900/80 bg-[#05080E]/90 backdrop-blur-sm">
        <p className="text-[10px] leading-relaxed text-slate-500 max-w-4xl mx-auto font-sans tracking-wide">
          DRAFTJUDGE is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
        </p>
      </footer>

    </div>
  );
}
