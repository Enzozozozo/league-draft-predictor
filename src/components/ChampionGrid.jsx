import React, { useMemo, useState } from 'react';
import { Search, X, Sparkles, Filter, ChevronRight, Lock, AlertCircle } from 'lucide-react';
import { CHAMPIONS, ROLES } from '../data/championsData';

export default function ChampionGrid({
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  activeSlot,
  bluePicks,
  redPicks,
  onSelectChampion,
  onPredictWinrate,
}) {
  const [duplicateWarning, setDuplicateWarning] = useState('');

  const isBlue = activeSlot.team === 'blue';
  const activeTeamPicks = isBlue ? bluePicks : redPicks;
  const otherTeamPicks = isBlue ? redPicks : bluePicks;

  // Set of champion names already chosen in OTHER slots on this team
  const activeTeamPickedSet = useMemo(() => {
    const set = new Set();
    activeTeamPicks.forEach((p, idx) => {
      if (p.champion && idx !== activeSlot.index) {
        set.add(p.champion.toLowerCase());
      }
    });
    return set;
  }, [activeTeamPicks, activeSlot.index]);

  // Set of champion names picked on the other team (allowed for mirror pick!)
  const otherTeamPickedSet = useMemo(() => {
    const set = new Set();
    otherTeamPicks.forEach((p) => {
      if (p.champion) {
        set.add(p.champion.toLowerCase());
      }
    });
    return set;
  }, [otherTeamPicks]);

  // Filter champions based on search query and role filter
  const filteredChampions = useMemo(() => {
    return CHAMPIONS.filter((champ) => {
      // Role filter check
      if (roleFilter !== 'ALL') {
        const matchesRole =
          champ.roles?.includes(roleFilter) || champ.primaryRole === roleFilter;
        if (!matchesRole) return false;
      }

      // Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = champ.name.toLowerCase().includes(q);
        const matchesTitle = champ.title?.toLowerCase().includes(q);
        const matchesArchetype = champ.archetype?.toLowerCase().includes(q);
        return matchesName || matchesTitle || matchesArchetype;
      }

      return true;
    });
  }, [searchQuery, roleFilter]);

  const activeTargetName = `${activeSlot.team.toUpperCase()} Slot ${activeSlot.index + 1} (${
    activeTeamPicks[activeSlot.index]?.role
  })`;

  const handleChampionClick = (champ) => {
    const isAlreadyOnActiveTeam = activeTeamPickedSet.has(champ.name.toLowerCase());
    if (isAlreadyOnActiveTeam) {
      setDuplicateWarning(
        `${champ.name} is already picked on ${activeSlot.team.toUpperCase()} Side. Each team slot must be distinct.`
      );
      setTimeout(() => setDuplicateWarning(''), 3500);
      return;
    }
    setDuplicateWarning('');
    onSelectChampion(champ);
  };

  return (
    <div className="bg-[#0B121E]/95 rounded-2xl p-5 border border-slate-800 shadow-2xl flex flex-col space-y-4">
      
      {/* Search Header & Role Filter Pills */}
      <div className="space-y-3">
        
        {/* Active Target Banner */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono">Assigning to:</span>
            <span
              className={`font-mono font-bold uppercase ${
                isBlue ? 'text-[#0AC8B9]' : 'text-[#E84057]'
              }`}
            >
              {activeTargetName}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {filteredChampions.length} Available • Distinct per team
          </span>
        </div>

        {/* Duplicate Alert Notice */}
        {duplicateWarning && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {/* Search Input Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search champion by name, title, or archetype (e.g. Ahri, Aatrox, Tank)..."
            className="w-full bg-[#070B13] border border-slate-700/80 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-[#C89B3C] focus:ring-1 focus:ring-[#C89B3C]/50 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Role Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-amber-400" />
            Role:
          </span>
          {ROLES.map((r) => {
            const isSelected = roleFilter === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setRoleFilter(r.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-sm shadow-amber-500/20'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

      </div>

      {/* Scrollable Champion Avatar Grid */}
      <div className="flex-1 min-h-[300px] max-h-[380px] overflow-y-auto p-1.5 rounded-xl bg-slate-950/60 border border-slate-900 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-6 xl:grid-cols-7 gap-2.5">
        {filteredChampions.map((champ) => {
          const champLower = champ.name.toLowerCase();
          const isCurrentlyActiveSlot =
            activeTeamPicks[activeSlot.index]?.champion?.toLowerCase() === champLower;
          const isAlreadyOnActiveTeam = activeTeamPickedSet.has(champLower);
          const isPickedOnOtherTeam = otherTeamPickedSet.has(champLower);

          return (
            <div
              key={champ.id}
              onClick={() => handleChampionClick(champ)}
              title={
                isAlreadyOnActiveTeam
                  ? `${champ.name} is already picked on ${activeSlot.team.toUpperCase()} Side (Must be distinct)`
                  : `${champ.name} • ${champ.archetype} (${champ.winRate}% WR)${
                      isPickedOnOtherTeam ? ' (Mirror Pick Allowed)' : ''
                    }`
              }
              className={`group relative flex flex-col items-center p-1.5 rounded-lg border transition-all duration-150 ${
                isCurrentlyActiveSlot
                  ? 'border-amber-400 bg-amber-500/10 shadow-md shadow-amber-500/20 cursor-pointer'
                  : isAlreadyOnActiveTeam
                  ? 'border-slate-800/40 bg-slate-950/60 opacity-40 cursor-not-allowed'
                  : 'border-slate-800/80 bg-slate-900/60 hover:border-amber-400/80 hover:bg-slate-800/80 hover:scale-105 shadow-sm cursor-pointer'
              }`}
            >
              {/* Champion Square Image */}
              <div
                className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded overflow-hidden bg-slate-950 border transition-colors ${
                  isCurrentlyActiveSlot
                    ? 'border-amber-400'
                    : isAlreadyOnActiveTeam
                    ? 'border-slate-800 grayscale'
                    : 'border-slate-700/80 group-hover:border-amber-400'
                }`}
              >
                <img
                  src={champ.image}
                  alt={champ.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Aatrox.png';
                  }}
                />

                {/* Overlay for Current Slot */}
                {isCurrentlyActiveSlot && (
                  <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold uppercase tracking-wider text-slate-950 bg-amber-400/60 backdrop-blur-[1px]">
                    Current
                  </div>
                )}

                {/* Overlay for Duplicate on Active Team */}
                {isAlreadyOnActiveTeam && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-[8px] font-mono font-bold uppercase tracking-wider text-slate-300 bg-slate-950/75 backdrop-blur-[1px]">
                    <Lock className="w-3 h-3 text-slate-400 mb-0.5" />
                    Picked
                  </div>
                )}

                {/* Small Pill indicator if picked by Other Team (allowed for mirror) */}
                {isPickedOnOtherTeam && !isAlreadyOnActiveTeam && !isCurrentlyActiveSlot && (
                  <div
                    className={`absolute bottom-0 inset-x-0 text-[8px] font-mono font-bold text-center text-white py-0.2 ${
                      isBlue ? 'bg-rose-600/80' : 'bg-teal-600/80'
                    }`}
                  >
                    Mirror
                  </div>
                )}
              </div>

              {/* Champion Name */}
              <span className={`text-[11px] font-semibold block truncate w-full text-center mt-1 ${
                isAlreadyOnActiveTeam
                  ? 'text-slate-500'
                  : 'text-slate-300 group-hover:text-amber-200'
              }`}>
                {champ.name}
              </span>

              {/* Micro Winrate */}
              <span className="text-[9px] font-mono text-slate-500 group-hover:text-amber-300/80">
                {champ.winRate}%
              </span>
            </div>
          );
        })}

        {filteredChampions.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs font-mono">
            No champions found matching "{searchQuery}" in {roleFilter} category.
          </div>
        )}
      </div>

      {/* Large Bottom Action Button */}
      <div className="pt-2">
        <button
          onClick={onPredictWinrate}
          className="w-full group relative py-3.5 px-6 rounded-xl font-hextech font-bold text-sm tracking-widest uppercase text-slate-950 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:via-amber-300 hover:to-amber-500 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2.5 pulse-gold border border-amber-300/60"
        >
          <Sparkles className="w-4 h-4 text-slate-950 group-hover:rotate-12 transition-transform" />
          <span>PREDICT WINRATE & RUN INFERENCE</span>
          <ChevronRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

    </div>
  );
}
