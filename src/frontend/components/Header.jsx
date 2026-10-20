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
          <div className="relative group cursor-pointer">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 via-amber-600 to-amber-900 p-0.5 shadow-md shadow-amber-500/20">
              <div className="w-full h-full bg-[#091428] rounded-[6px] flex items-center justify-center border border-amber-500/40">
                <span className="font-hextech font-bold text-xs tracking-wider text-amber-300">
                  LDP
                </span>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#091428]" title="Model Active" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-wider font-hextech text-slate-100 flex items-center gap-2">
                <span className="text-hextech-gold">League Draft Predictor</span>
              </h1>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                v14.10.1 Calibrated
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {currentPhase === 'draft' ? 'Phase 1: Hextech Tournament Draft Lobby' : 'Phase 2: SaaS Calibrated Studio'}
            </p>
          </div>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 hover:border-amber-400 transition-all active:scale-95 shadow-md shadow-amber-500/10"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
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
