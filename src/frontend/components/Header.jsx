import React, { useState } from 'react';
import { RotateCcw, Shuffle, ChevronLeft, User, CornerDownLeft, Loader2 } from 'lucide-react';

export default function Header({
  currentPhase,
  setCurrentPhase,
  onResetDefault,
  onRandomizeDraft,
  onLogoClick,
  onSearchSummoner,
  isSearchingSummoner = false,
  searchNotification = null,
}) {
  const [summonerId, setSummonerId] = useState('');
  const [region, setRegion] = useState('SEA');

  const handleLogoPress = () => {
    if (onLogoClick) {
      onLogoClick();
    } else {
      setCurrentPhase('draft');
    }
  };

  const handleSearch = () => {
    if (onSearchSummoner && summonerId.trim()) {
      onSearchSummoner({ summonerId: summonerId.trim(), region });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#070D18]/95 backdrop-blur border-b border-slate-800/80 shadow-2xl flex-shrink-0 px-6 sm:px-10 lg:px-14 xl:px-16 py-2">
      <div className="w-full max-w-[1800px] mx-auto relative flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* 1. Left: Brand Name (Clickable to reset to landing page) */}
        <button
          onClick={handleLogoPress}
          className="text-left focus:outline-none transition-opacity hover:opacity-80 active:opacity-70"
          title="Reset to Landing Page"
        >
          <span className="text-base sm:text-lg font-black tracking-wider uppercase text-amber-400 font-sans">
            DRAFTJUDGE
          </span>
        </button>

        {/* 2. Center: Summoner / Riot ID Bar (Centered horizontally across navbar) */}
        <div className="w-full md:w-auto md:absolute md:left-1/2 md:-translate-x-1/2 flex flex-col items-center justify-center">
          <div className="relative flex items-center bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs focus-within:border-amber-400 transition-colors w-full sm:w-72 md:w-80">
            <User className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={summonerId}
              onChange={(e) => setSummonerId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              disabled={isSearchingSummoner}
              placeholder="Riot ID (e.g. GameName#TAG)"
              className="bg-transparent text-slate-100 placeholder-slate-500 font-mono text-xs w-full focus:outline-none disabled:opacity-50"
            />
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              disabled={isSearchingSummoner}
              className="bg-slate-800 text-slate-300 font-mono text-[10px] uppercase rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none ml-1.5 cursor-pointer disabled:opacity-50"
            >
              <option value="SEA">SEA</option>
              <option value="NA">NA</option>
              <option value="EUW">EUW</option>
              <option value="KR">KR</option>
            </select>
            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearchingSummoner || !summonerId.trim()}
              title="Import latest match draft (Enter)"
              className="ml-1.5 p-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/30 hover:border-amber-400/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0 active:opacity-75"
            >
              {isSearchingSummoner ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <CornerDownLeft className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {searchNotification && (
            <div
              className={`absolute top-full mt-1.5 px-3 py-1 rounded-lg text-[11px] font-mono tracking-tight shadow-xl border backdrop-blur-md z-50 transition-all ${
                searchNotification.type === 'error'
                  ? 'bg-rose-950/95 text-rose-200 border-rose-800'
                  : 'bg-emerald-950/95 text-emerald-200 border-emerald-800'
              }`}
            >
              {searchNotification.message}
            </div>
          )}
        </div>

        {/* 3. Right: Contextual Mode Controls (Prominent, clean action buttons, no glow, minimal tactile feedback) */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {currentPhase === 'analytics' ? (
            <button
              onClick={() => setCurrentPhase('draft')}
              title="Return to draft lobby"
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-amber-400" />
              <span>Edit Draft Lobby</span>
            </button>
          ) : (
            <>
              <button
                onClick={onRandomizeDraft}
                title="Randomize competitive team compositions"
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <Shuffle className="w-4 h-4 text-amber-400" />
                <span>Shuffle</span>
              </button>

              <button
                onClick={onResetDefault}
                title="Reset all picks to empty draft"
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-cyan-400" />
                <span>Reset</span>
              </button>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
