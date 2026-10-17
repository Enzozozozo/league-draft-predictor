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

export const DEFAULT_BLUE_PICKS = [
  { role: 'TOP', champion: 'Aatrox', archetype: 'Juggernaut', winRate: 51.2 },
  { role: 'JGL', champion: 'Lee Sin', archetype: 'Diver', winRate: 50.4 },
  { role: 'MID', champion: 'Ahri', archetype: 'Burst Mage', winRate: 51.8 },
  { role: 'BOT', champion: 'Jinx', archetype: 'Hypercarry', winRate: 48.9 },
  { role: 'SUP', champion: 'Thresh', archetype: 'Catcher', winRate: 49.5 },
];

export const DEFAULT_RED_PICKS = [
  { role: 'TOP', champion: 'Malphite', archetype: 'Vanguard Tank', winRate: 49.8 },
  { role: 'JGL', champion: 'Wukong', archetype: 'Skirmisher', winRate: 53.1 },
  { role: 'MID', champion: 'Sylas', archetype: 'Burst Bruiser', winRate: 50.2 },
  { role: 'BOT', champion: 'Ezreal', archetype: 'Poke Marksman', winRate: 52.4 },
  { role: 'SUP', champion: 'Leona', archetype: 'Vanguard Tank', winRate: 51.1 },
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
