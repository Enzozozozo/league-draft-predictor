import React, { useState } from 'react';
import { getChampion } from '../data/championsData';

const ROLE_ICON_URLS = {
  TOP: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-top.png',
  JGL: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-jungle.png',
  MID: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-middle.png',
  BOT: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-bottom.png',
  SUP: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-utility.png',
};

function RoleIcon({ role, fullRoleName }) {
  const iconUrl = ROLE_ICON_URLS[role] || ROLE_ICON_URLS.TOP;
  return (
    <img
      src={iconUrl}
      alt={fullRoleName}
      draggable={false}
      className="w-7 h-7 xl:w-8 xl:h-8 object-contain pointer-events-none select-none"
    />
  );
}

export default function DraftSlotCard({
  team, // 'blue' | 'red'
  index, // 0-4
  pick, // { role: 'TOP', champion: 'Aatrox', archetype: 'Juggernaut', winRate: 51.2 }
  isActive,
  onSelectSlot,
  onDropChampion,
  draggedChampion,
  setDraggedChampion,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isBlue = team === 'blue';
  const champData = getChampion(pick.champion);

  // Fallback image url
  const imgUrl =
    champData?.image ||
    `https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/${pick.champion}.png`;

  const roleNameMap = {
    TOP: 'TOP',
    JGL: 'JUNGLE',
    MID: 'MIDDLE',
    BOT: 'BOTTOM',
    SUP: 'UTILITY',
  };

  const fullRoleName = roleNameMap[pick.role] || pick.role;

  const handleDragStart = (e) => {
    const champPayload = champData || {
      name: pick.champion,
      archetype: pick.archetype || 'Specialist',
      winRate: pick.winRate ?? 50.0,
    };
    const transferObj = {
      champion: champPayload,
      sourceSlot: { team, index },
    };
    e.dataTransfer.setData('application/json', JSON.stringify(transferObj));
    e.dataTransfer.effectAllowed = 'copyMove';
    if (setDraggedChampion) {
      setDraggedChampion(transferObj);
    }
  };

  const handleDragEnd = () => {
    setIsDragOver(false);
    if (setDraggedChampion) {
      setDraggedChampion(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    let payload = draggedChampion;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        payload = JSON.parse(raw);
      }
    } catch {
      // Fallback to state payload
    }

    const champToAssign = payload?.champion || payload;
    const sourceSlot = payload?.sourceSlot || null;

    if (champToAssign && onDropChampion) {
      onDropChampion(champToAssign, team, index, sourceSlot);
    }
    if (setDraggedChampion) {
      setDraggedChampion(null);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => onSelectSlot(team, index)}
      title={`Click to select ${team.toUpperCase()} ${fullRoleName}, or drop a champion here`}
      className={`group relative px-3 py-2 h-full flex flex-col justify-center rounded-xl border transition-all duration-150 cursor-pointer select-none ${
        isDragOver
          ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400 scale-[1.01]'
          : isActive
          ? isBlue
            ? 'bg-slate-900/95 border-2 border-[#0AC8B9]'
            : 'bg-slate-900/95 border-2 border-[#E84057]'
          : draggedChampion
          ? isBlue
            ? 'bg-[#0B121E]/90 border-[#0AC8B9]/40 border-dashed hover:border-[#0AC8B9]'
            : 'bg-[#0B121E]/90 border-[#E84057]/40 border-dashed hover:border-[#E84057]'
          : isBlue
          ? 'bg-[#0B121E]/90 border-slate-800 hover:border-[#0AC8B9]/50 hover:bg-slate-900/50'
          : 'bg-[#0B121E]/90 border-slate-800 hover:border-[#E84057]/50 hover:bg-slate-900/50'
      }`}
    >
      {/* Active or Drop Target badge */}
      {(isActive || isDragOver) && (
        <div
          className={`absolute -top-2 ${
            isBlue ? 'left-3' : 'right-3'
          } px-2 py-0.2 rounded-full text-[9px] font-sans font-bold uppercase tracking-wider text-slate-950 ${
            isDragOver
              ? 'bg-amber-400'
              : isBlue
              ? 'bg-[#0AC8B9]'
              : 'bg-[#E84057]'
          }`}
        >
          {isDragOver ? `Drop into ${fullRoleName}` : `Selected • ${fullRoleName}`}
        </div>
      )}

      <div
        className={`flex items-center justify-between gap-3.5 ${
          isBlue ? 'flex-row text-left' : 'flex-row-reverse text-right'
        }`}
      >
        {/* Champion Square Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-16 h-16 xl:w-[70px] xl:h-[70px] rounded-xl overflow-hidden border-2 bg-slate-950 ${
              isDragOver
                ? 'border-amber-400'
                : isActive
                ? isBlue
                  ? 'border-[#0AC8B9]'
                  : 'border-[#E84057]'
                : isBlue
                ? 'border-sky-500/40'
                : 'border-rose-500/40'
            }`}
          >
            <img
              src={imgUrl}
              alt={pick.champion}
              draggable={false}
              className="w-full h-full object-cover pointer-events-none"
              onError={(e) => {
                e.currentTarget.src =
                  'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Aatrox.png';
              }}
            />
          </div>
        </div>

        {/* Champion Name */}
        <div className="flex-1 min-w-0">
          <div className="text-base xl:text-lg font-bold font-sans text-slate-100 truncate group-hover:text-amber-200 transition-colors">
            {pick.champion}
          </div>
        </div>

        {/* Role Position Emblem Icon */}
        <div
          title={fullRoleName}
          className={`flex-shrink-0 p-1.5 rounded-lg border transition-colors ${
            isBlue
              ? 'bg-sky-500/10 border-[#0AC8B9]/30 group-hover:border-[#0AC8B9]/60'
              : 'bg-rose-500/10 border-[#E84057]/30 group-hover:border-[#E84057]/60'
          }`}
        >
          <RoleIcon role={pick.role} fullRoleName={fullRoleName} />
        </div>
      </div>
    </div>
  );
}
