import React from 'react';
import { ArrowLeft, Activity, CheckCircle2 } from 'lucide-react';

export default function ExecutiveSummaryBar({
  predictionData,
  onModifyDraft,
}) {
  const blueProb = predictionData?.blueWinProb ?? 54.2;
  const redProb = predictionData?.redWinProb ?? 45.8;

  return (
    <div className="bg-[#0B121E]/95 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Title and Model Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold font-mono tracking-tight text-slate-100">
                Draft Analysis Report
              </h2>
              <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                Inference Complete
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Calibrated win probability & tactical composition evaluation
            </p>
          </div>
        </div>

        {/* Tug-of-war horizontal bar */}
        <div className="flex-1 w-full max-w-lg px-2">
          <div className="flex items-center justify-between text-xs font-mono mb-1.5 font-bold">
            <span className="text-[#0AC8B9] flex items-center gap-1">
              Blue Side: {blueProb}%
            </span>
            <span className="text-slate-500 text-[10px] uppercase font-normal">
              50% Baseline
            </span>
            <span className="text-[#E84057] flex items-center gap-1">
              Red Side: {redProb}%
            </span>
          </div>

          <div className="relative h-3.5 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700/80 shadow-inner flex">
            {/* Blue Tug Bar */}
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-[#0AC8B9] rounded-l-full transition-all duration-700 ease-out shadow-sm"
              style={{ width: `${blueProb}%` }}
              title={`Blue Side: ${blueProb}%`}
            />
            {/* Red Tug Bar */}
            <div
              className="h-full bg-gradient-to-r from-[#E84057] to-rose-600 rounded-r-full transition-all duration-700 ease-out shadow-sm"
              style={{ width: `${redProb}%` }}
              title={`Red Side: ${redProb}%`}
            />

            {/* Center 50% Baseline Line */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-950/80 -translate-x-1/2 z-10 pointer-events-none" />
          </div>
        </div>

        {/* Modify Draft Button */}
        <div>
          <button
            onClick={onModifyDraft}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold font-mono border border-slate-700 hover:border-cyan-500/60 transition-all shadow-md active:scale-95 group"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Modify Draft</span>
          </button>
        </div>

      </div>
    </div>
  );
}
