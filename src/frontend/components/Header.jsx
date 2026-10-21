import React, { useState } from 'react';
import { RotateCcw, Shuffle, ChevronLeft, User } from 'lucide-react';

export default function Header({
  currentPhase,
  setCurrentPhase,
  onResetDefault,
  onRandomizeDraft,
}) {
  const [summonerId, setSummonerId] = useState('Dinozo#3141');
  const [region, setRegion] = useState('SEA');

  return (
    <header className="sticky top-0 z-40 bg-[#070D18]/95 backdrop-blur border-b border-slate-800/80 shadow-2xl flex-shrink-0 px-6 sm:px-10 lg:px-14 xl:px-16 py-2">
      <div className="w-full max-w-[1800px] mx-auto relative flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* 1. Left: Brand & Crest */}
        <div className="flex items-center gap-3">
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-100">
            <span className="text-hextech-gold">League Draft Predictor</span>
          </h1>
        </div>

        {/* 2. Center: Summoner / Riot ID Bar (Centered horizontally across navbar) */}
        <div className="w-full md:w-auto md:absolute md:left-1/2 md:-translate-x-1/2 flex items-center justify-center">
          <div className="relative flex items-center bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/40 transition-all shadow-inner w-full sm:w-72 md:w-80">
            <User className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={summonerId}
              onChange={(e) => setSummonerId(e.target.value)}
              placeholder="Riot ID (e.g. Dinozo#3141)"
              className="bg-transparent text-slate-100 placeholder-slate-500 font-mono text-xs w-full focus:outline-none"
            />
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="bg-slate-800 text-slate-300 font-mono text-[10px] uppercase rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none ml-1.5 cursor-pointer"
            >
              <option value="SEA">SEA</option>
              <option value="NA">NA</option>
              <option value="EUW">EUW</option>
              <option value="KR">KR</option>
            </select>
          </div>
        </div>

        {/* 3. Right: Contextual Mode Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {currentPhase === 'analytics' ? (
            <button
              onClick={() => setCurrentPhase('draft')}
              title="Return to draft lobby"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-all active:scale-95"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Edit Draft Lobby</span>
            </button>
          ) : (
            <>
              <button
                onClick={onRandomizeDraft}
                title="Randomize competitive team compositions"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-all active:scale-95"
              >
                <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Shuffle</span>
              </button>

              <button
                onClick={onResetDefault}
                title="Clear all champions to empty draft"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-all active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
