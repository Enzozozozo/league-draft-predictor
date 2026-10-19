import React, { useMemo } from 'react';
import { Search, X, Sparkles, Filter, ChevronRight } from 'lucide-react';
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
  draggedChampion,
  setDraggedChampion,
  onPredictWinrate,
}) {
  const isBlue = activeSlot.team === 'blue';
  const activeTeamPicks = isBlue ? bluePicks : redPicks;

  // Map of champion name -> role on Blue and Red teams
  const blueRoleByChamp = useMemo(() => {
    const map = new Map();
    bluePicks.forEach((p) => {
      if (p.champion) map.set(p.champion.toLowerCase(), p.role);
    });
    return map;
  }, [bluePicks]);

  const redRoleByChamp = useMemo(() => {
    const map = new Map();
    redPicks.forEach((p) => {
      if (p.champion) map.set(p.champion.toLowerCase(), p.role);
    });
    return map;
  }, [redPicks]);

  // Filter champions based on search query (champion name only) and role filter
  const filteredChampions = useMemo(() => {
    const rawQuery = searchQuery.toLowerCase().trim();
    const cleanQuery = rawQuery.replace(/[^a-z0-9]/g, '');

    const matches = CHAMPIONS.filter((champ) => {
      // Role filter check
      if (roleFilter !== 'ALL') {
        const matchesRole =
          champ.roles?.includes(roleFilter) || champ.primaryRole === roleFilter;
        if (!matchesRole) return false;
      }

      // Search query check (champion name only, supporting both "kai'sa" and "kaisa")
      if (rawQuery) {
        const rawName = champ.name.toLowerCase();
        const cleanName = rawName.replace(/[^a-z0-9]/g, '');
        return (
          rawName.includes(rawQuery) ||
          (cleanQuery.length > 0 && cleanName.includes(cleanQuery))
        );
      }

      return true;
    });

    if (!rawQuery) return matches;

    // Prioritize champions whose name starts with the query
    return [...matches].sort((a, b) => {
      const aRaw = a.name.toLowerCase();
      const bRaw = b.name.toLowerCase();
      const aClean = aRaw.replace(/[^a-z0-9]/g, '');
      const bClean = bRaw.replace(/[^a-z0-9]/g, '');

      const aStarts =
        aRaw.startsWith(rawQuery) ||
        (cleanQuery.length > 0 && aClean.startsWith(cleanQuery));
      const bStarts =
        bRaw.startsWith(rawQuery) ||
        (cleanQuery.length > 0 && bClean.startsWith(cleanQuery));

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aRaw.localeCompare(bRaw);
    });
  }, [searchQuery, roleFilter]);

  const activeTargetName = `${activeSlot.team.toUpperCase()} ${
    activeTeamPicks[activeSlot.index]?.role || 'TOP'
  }`;

  const handleDragStart = (e, champ) => {
    const transferObj = {
      champion: champ,
      sourceSlot: null,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(transferObj));
    e.dataTransfer.effectAllowed = 'copyMove';
    if (setDraggedChampion) {
      setDraggedChampion(transferObj);
    }
  };

  const handleDragEnd = () => {
    if (setDraggedChampion) {
      setDraggedChampion(null);
    }
  };

  return (
    <div className="bg-[#0B121E]/95 rounded-2xl px-2.5 py-3 border border-slate-800 shadow-2xl flex flex-col gap-2.5 h-full min-h-0">
      
      {/* Search Header & Role Filter Pills */}
      <div className="space-y-2 flex-shrink-0 px-0.5">
        
        {/* Search & Role Filter Row */}
        <div className="flex flex-col gap-2">
          {/* Search Input Bar */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search champion (e.g. Ahri, Aatrox)..."
              className="w-full bg-[#070B13] border border-slate-700/80 rounded-xl pl-9 pr-8 py-1.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-[#C89B3C] focus:ring-1 focus:ring-[#C89B3C]/50 transition-all shadow-inner"
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
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-amber-400" />
              Role:
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {ROLES.map((r) => {
                const isSelected = roleFilter === r.key;
                return (
                  <button
                    key={r.key}
                    onClick={() => setRoleFilter(r.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold font-mono transition-all ${
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
        </div>

      </div>

      {/* Scrollable Champion Avatar Grid: 8 icons per row, name & winrate below, minimal horizontal padding */}
      <div className="flex-1 min-h-0 overflow-y-auto px-1 py-1.5 rounded-xl bg-slate-950/60 border border-slate-900 grid grid-cols-8 gap-x-1.5 gap-y-2.5 content-start">
        {filteredChampions.map((champ) => {
          const champLower = champ.name.toLowerCase();
          const isCurrentlyActiveSlot =
            activeTeamPicks[activeSlot.index]?.champion?.toLowerCase() === champLower;
          const blueRole = blueRoleByChamp.get(champLower);
          const redRole = redRoleByChamp.get(champLower);
          const isBeingDragged =
            draggedChampion?.champion?.name?.toLowerCase() === champLower;

          return (
            <div
              key={champ.id}
              draggable
              onDragStart={(e) => handleDragStart(e, champ)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectChampion(champ)}
              title={`${champ.name} (${champ.winRate}% WR) — Click to assign to ${activeTargetName}, or drag & drop into any position slot`}
              className={`group flex flex-col items-center select-none cursor-grab active:cursor-grabbing transition-transform duration-150 ${
                isBeingDragged ? 'opacity-50 scale-95' : 'hover:scale-[1.03]'
              }`}
            >
              {/* Champion Square Icon */}
              <div
                className={`relative w-full aspect-square rounded-lg overflow-hidden bg-slate-950 border-2 transition-all ${
                  isCurrentlyActiveSlot
                    ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-md shadow-amber-500/30'
                    : blueRole && redRole
                    ? 'border-amber-400 ring-1 ring-amber-400/40'
                    : blueRole
                    ? 'border-[#0AC8B9] ring-2 ring-[#0AC8B9]/50 shadow-md shadow-[#0AC8B9]/25'
                    : redRole
                    ? 'border-[#E84057] ring-2 ring-[#E84057]/50 shadow-md shadow-[#E84057]/25'
                    : 'border-slate-800 group-hover:border-amber-400'
                }`}
              >
                <img
                  src={champ.image}
                  alt={champ.name}
                  loading="lazy"
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Aatrox.png';
                  }}
                />

                {/* Pure Colour Bar Indicator on Blue / Red */}
                {(blueRole || redRole) && (
                  <div className="absolute bottom-0 inset-x-0 h-1.5 flex">
                    {blueRole ? (
                      <span className="bg-[#0AC8B9] flex-1 h-full" />
                    ) : null}
                    {redRole ? (
                      <span className="bg-[#E84057] flex-1 h-full" />
                    ) : null}
                  </div>
                )}
              </div>

              {/* Champion Name */}
              <span className="text-[11px] font-semibold block truncate w-full text-center mt-1 text-slate-200 group-hover:text-amber-200 leading-tight">
                {champ.name}
              </span>

              {/* Winrate Below */}
              <span className="text-[10px] font-mono text-slate-400 group-hover:text-amber-300/90 leading-tight">
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
      <div className="flex-shrink-0">
        <button
          onClick={onPredictWinrate}
          className="w-full group relative py-2.5 px-6 rounded-xl font-hextech font-bold text-sm tracking-widest uppercase text-slate-950 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:via-amber-300 hover:to-amber-500 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2.5 pulse-gold border border-amber-300/60"
        >
          <Sparkles className="w-4 h-4 text-slate-950 group-hover:rotate-12 transition-transform" />
          <span>PREDICT WINRATE & RUN INFERENCE</span>
          <ChevronRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

    </div>
  );
}
