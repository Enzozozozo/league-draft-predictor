import React from 'react';
import { TrendingUp, Target, Cpu, CheckCircle } from 'lucide-react';

export default function ExecutiveKpiCards({ predictionData }) {
  const blueProb = predictionData?.blueWinProb ?? 54.2;
  const redProb = predictionData?.redWinProb ?? 45.8;
  const delta = predictionData?.deltaSpread ?? 4.2;
  const classification = predictionData?.classification ?? 'Heavy Advantage';
  const favoredTeam = blueProb >= 50 ? 'Blue Side' : 'Red Side';

  const isAdvantage = delta > 0;
  const isHeavy = Math.abs(delta) >= 4.0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      
      {/* Card 1: Estimated Win Probability (Static, clean surface) */}
      <div className="bg-[#0B121E]/95 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Estimated Win Probability
            </span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-cyan-400 tracking-tight">
              {blueProb}% <span className="text-sm sm:text-base font-semibold text-slate-300">({favoredTeam})</span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800/80">
          <p className="text-[11px] font-sans text-emerald-400 flex items-center gap-1.5 font-medium">
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Isotonically Calibrated Random Forest Confidence
          </p>
        </div>
      </div>

      {/* Card 2: Draft Classification (Static, clean surface) */}
      <div className="bg-[#0B121E]/95 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Draft Classification
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Target className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5">
            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              isAdvantage
                ? isHeavy
                  ? 'text-cyan-300'
                  : 'text-emerald-400'
                : isHeavy
                ? 'text-rose-400'
                : 'text-amber-300'
            }`}>
              {classification}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800/80">
          <p className="text-[11px] font-mono text-slate-300">
            Delta Spread: <span className="font-bold text-cyan-300">{delta >= 0 ? `+${delta}%` : `${delta}%`}</span> relative to 50% baseline
          </p>
        </div>
      </div>

      {/* Card 3: Model Specification (Static, clean surface) */}
      <div className="bg-[#0B121E]/95 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Pipeline Architecture
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Cpu className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-100 tracking-tight">
              15 Pre-Game Signals
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800/80">
          <p className="text-[11px] font-sans text-slate-400">
            GroupShuffleSplit zero-leakage validation
          </p>
        </div>
      </div>

    </div>
  );
}
