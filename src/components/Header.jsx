import React from 'react';
import { Shield, Sparkles, RotateCcw, Shuffle, Layers, BarChart3 } from 'lucide-react';

export default function Header({
  currentPhase,
  setCurrentPhase,
  onResetDefault,
  onRandomizeDraft,
}) {
  return (
    <header className="sticky top-0 z-40 bg-[#070D18]/95 backdrop-blur border-b border-slate-800/80 px-4 sm:px-6 py-3 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Brand & Crest */}
        <div className="flex items-center gap-3.5">
          <div className="relative group cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 via-amber-600 to-amber-900 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-[#091428] rounded-[7px] flex items-center justify-center border border-amber-500/40">
                <span className="font-hextech font-bold text-sm tracking-wider text-amber-300">
                  LDP
                </span>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#091428]" title="Model Active" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-wider font-hextech text-slate-100 flex items-center gap-2">
                <span className="text-hextech-gold">League Draft Predictor</span>
              </h1>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                v14.10.1 Calibrated
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Hextech Tournament Draft Lobby to Calibrated SaaS Analytics Studio
            </p>
          </div>
        </div>

        {/* Phase State Controller & Utility Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          
          {/* Phase 1 vs Phase 2 Toggle Pills */}
          <div className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setCurrentPhase('draft')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                currentPhase === 'draft'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Phase 1: Draft Lobby</span>
            </button>
            <button
              onClick={() => setCurrentPhase('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                currentPhase === 'analytics'
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Phase 2: SaaS Studio</span>
            </button>
          </div>

          {/* Quick Draft Actions */}
          <button
            onClick={onRandomizeDraft}
            title="Randomize competitive team compositions"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-all active:scale-95"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Shuffle</span>
          </button>

          <button
            onClick={onResetDefault}
            title="Reset to default pre-loaded composition"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Reset</span>
          </button>

        </div>

      </div>
    </header>
  );
}
