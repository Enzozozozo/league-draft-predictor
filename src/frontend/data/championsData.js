import championsJson from './champions.json';

export const CHAMPIONS = championsJson;

export const ROLES = [
  { key: 'ALL', label: 'All' },
  { key: 'TOP', label: 'Top' },
  { key: 'JGL', label: 'Jgl' },
  { key: 'MID', label: 'Mid' },
  { key: 'BOT', label: 'Bot' },
  { key: 'SUP', label: 'Sup' },
];

export const ROLE_ICON_URLS = {
  TOP: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-top.png',
  JGL: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-jungle.png',
  MID: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-middle.png',
  BOT: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-bottom.png',
  SUP: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-utility.png',
};

export const DEFAULT_BLUE_PICKS = [
  { role: 'TOP', champion: 'Yorick', archetype: 'Juggernaut', winRate: 54.1 },
  { role: 'JGL', champion: 'Sejuani', archetype: 'Vanguard Tank', winRate: 51.0 },
  { role: 'MID', champion: 'Smolder', archetype: 'Marksman', winRate: 49.9 },
  { role: 'BOT', champion: 'Ziggs', archetype: 'Artillery Mage', winRate: 52.5 },
  { role: 'SUP', champion: 'Nautilus', archetype: 'Vanguard Tank', winRate: 50.2 },
];

export const DEFAULT_RED_PICKS = [
  { role: 'TOP', champion: 'Camille', archetype: 'Diver', winRate: 50.1 },
  { role: 'JGL', champion: 'Pantheon', archetype: 'Diver', winRate: 49.3 },
  { role: 'MID', champion: 'Galio', archetype: 'Warden Tank', winRate: 51.6 },
  { role: 'BOT', champion: 'Miss Fortune', archetype: 'Marksman', winRate: 51.4 },
  { role: 'SUP', champion: 'Leona', archetype: 'Vanguard Tank', winRate: 52.5 },
];

export const EMPTY_BLUE_PICKS = [
  { role: 'TOP', champion: null, archetype: '', winRate: null },
  { role: 'JGL', champion: null, archetype: '', winRate: null },
  { role: 'MID', champion: null, archetype: '', winRate: null },
  { role: 'BOT', champion: null, archetype: '', winRate: null },
  { role: 'SUP', champion: null, archetype: '', winRate: null },
];

export const EMPTY_RED_PICKS = [
  { role: 'TOP', champion: null, archetype: '', winRate: null },
  { role: 'JGL', champion: null, archetype: '', winRate: null },
  { role: 'MID', champion: null, archetype: '', winRate: null },
  { role: 'BOT', champion: null, archetype: '', winRate: null },
  { role: 'SUP', champion: null, archetype: '', winRate: null },
];

const championMap = new Map(
  championsJson.flatMap((c) => [
    [c.name.toLowerCase(), c],
    [c.id.toLowerCase(), c],
  ])
);

export function getChampion(name) {
  if (!name) return null;
  return championMap.get(String(name).toLowerCase()) || null;
}
