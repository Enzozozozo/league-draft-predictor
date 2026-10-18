import React from 'react';
import { ArrowLeft, Trophy } from 'lucide-react';

export default function ExecutiveSummaryBar({
  predictionData,
  onModifyDraft,
}) {
  const blueProb = predictionData?.blueWinProb ?? 54.2;
  const redProb = predictionData?.redWinProb ?? 45.8;
  const delta = predictionData?.deltaSpread ?? 4.2;
  const classification = predictionData?.classification ?? 'Heavy Advantage';

  const isBlueFavored = blueProb >= redProb;
  const favoredTeam = isBlueFavored ? 'Blue Side' : 'Red Side';
  const favoredProb = isBlueFavored ? blueProb : redProb;
  const absDelta = Math.abs(delta).toFixed(1);

  return (
    <div className="bg-[#0B121E]/95 border border-slate-800 rounded-2xl px-5 py-3.5 shadow-2xl backdrop-blur">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Left: Favored Team Verdict & Classification */}
        <div className="flex items-center gap-3.5 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${
                isBlueFavored
                  ? 'bg-[#0AC8B9]/10 border-[#0AC8B9]/40 text-[#0AC8B9]'
                  : 'bg-[#E84057]/10 border-[#E84057]/40 text-[#E84057]'
              }`}
            >
              <Trophy className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xl sm:text-2xl font-extrabold font-mono tracking-tight ${
                    isBlueFavored ? 'text-[#0AC8B9]' : 'text-[#E84057]'
                  }`}
                >
                  {favoredProb.toFixed(1)}% {favoredTeam}
                </span>
                <span
                  className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md border ${
                    isBlueFavored
                      ? 'bg-[#0AC8B9]/15 text-[#0AC8B9] border-[#0AC8B9]/35'
                      : 'bg-[#E84057]/15 text-[#E84057] border-[#E84057]/35'
                  }`}
                >
                  {classification} (+{absDelta}% Edge)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Favored composition based on lane matchups, scaling & teamfight synergy
              </p>
            </div>
          </div>
        </div>

        {/* Center: Tug-of-war horizontal bar */}
        <div className="flex-1 w-full max-w-2xl px-1">
          <div className="flex items-center justify-between text-xs font-mono mb-1 font-bold">
            <span className="text-[#0AC8B9] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0AC8B9]" />
              BLUE {blueProb.toFixed(1)}%
            </span>
            <span className="text-slate-500 text-[10px] uppercase font-normal tracking-wider">
              50% Even Split
            </span>
            <span className="text-[#E84057] flex items-center gap-1.5">
              {redProb.toFixed(1)}% RED
              <span className="w-2 h-2 rounded-full bg-[#E84057]" />
            </span>
          </div>

          <div className="relative h-3.5 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-700/80 shadow-inner flex">
            {/* Blue Tug Bar */}
            <div
              className="h-full bg-gradient-to-r from-teal-600 to-[#0AC8B9] rounded-l-full transition-all duration-700 ease-out"
              style={{ width: `${blueProb}%` }}
              title={`Blue Side: ${blueProb}%`}
            />
            {/* Red Tug Bar */}
            <div
              className="h-full bg-gradient-to-r from-[#E84057] to-rose-700 rounded-r-full transition-all duration-700 ease-out"
              style={{ width: `${redProb}%` }}
              title={`Red Side: ${redProb}%`}
            />

            {/* Center 50% Baseline Marker */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/70 -translate-x-1/2 z-10 pointer-events-none" />
          </div>
        </div>

        {/* Right: Modify Draft Button */}
        <div className="w-full lg:w-auto flex justify-end">
          <button
            onClick={onModifyDraft}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold font-mono border border-slate-700 hover:border-[#C89B3C] transition-all shadow-md active:scale-95 group"
          >
            <ArrowLeft className="w-4 h-4 text-[#C89B3C] group-hover:-translate-x-0.5 transition-transform" />
            <span>Modify Draft</span>
          </button>
        </div>

      </div>
    </div>
  );
}
