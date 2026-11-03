import React from 'react';
import { RotateCcw, Shuffle, ChevronLeft } from 'lucide-react';

export default function Header({
  currentPhase,
  setCurrentPhase,
  onResetDefault,
  onRandomizeDraft,
  onLogoClick,
}) {
  const handleLogoPress = () => {
    if (onLogoClick) {
      onLogoClick();
    } else {
      setCurrentPhase('draft');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#070D18]/95 backdrop-blur border-b border-slate-800/80 shadow-2xl flex-shrink-0 px-6 sm:px-10 lg:px-14 xl:px-16 py-2">
      <div className="w-full max-w-[1800px] mx-auto flex items-center justify-between gap-3">
        
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

        {/* 2. Right: Contextual Mode Controls (Prominent, clean action buttons, no glow, minimal tactile feedback) */}
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
