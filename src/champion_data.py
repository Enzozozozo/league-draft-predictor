"""Champion metadata and official Riot Games Data Dragon API integration.

Dynamically fetches the latest champion dataset, IDs, names, and tags from Riot's
official Data Dragon API (https://ddragon.leagueoflegends.com) instead of hardcoding.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import requests

from .config import CACHE_DIR

logger = logging.getLogger("ChampionData")

DDRAGON_VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json"
DDRAGON_CHAMPIONS_URL_TEMPLATE = "https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json"


class ChampionDataManager:
    """Manages official Riot Games champion metadata via Data Dragon."""

    def __init__(self, cache_dir: Optional[Path] = None):
        self.cache_dir = cache_dir or (CACHE_DIR / "ddragon")
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.id_to_name: Dict[int, str] = {}
        self.id_to_data: Dict[int, Dict[str, Any]] = {}
        self.latest_version: str = "14.10.1"

        self._load_or_fetch_champions()

    def _load_or_fetch_champions(self):
        """Fetches latest version and champion dataset from Riot Games API."""
        cache_file = self.cache_dir / "champions.json"
        version_cache_file = self.cache_dir / "latest_version.txt"

        # Check local cache first
        if cache_file.exists() and version_cache_file.exists():
            try:
                with open(version_cache_file, "r", encoding="utf-8") as f:
                    self.latest_version = f.read().strip()
                with open(cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._populate_dictionaries(data)
                    logger.info("Loaded %d champions from Riot Data Dragon cache (Version: %s)", len(self.id_to_name), self.latest_version)
                    return
            except Exception as e:
                logger.warning("Cache load failed: %s. Fetching fresh from Riot API...", e)

        # Fetch fresh from Riot Data Dragon API
        try:
            logger.info("Fetching latest patch version from Riot API: %s", DDRAGON_VERSIONS_URL)
            v_resp = requests.get(DDRAGON_VERSIONS_URL, timeout=8)
            if v_resp.status_code == 200:
                self.latest_version = v_resp.json()[0]

            champ_url = DDRAGON_CHAMPIONS_URL_TEMPLATE.format(version=self.latest_version)
            logger.info("Fetching all champions from official Riot API: %s", champ_url)
            c_resp = requests.get(champ_url, timeout=12)

            if c_resp.status_code == 200:
                full_json = c_resp.json()
                champs = full_json.get("data", {})
                self._populate_dictionaries(champs)

                # Save to disk cache
                with open(cache_file, "w", encoding="utf-8") as f:
                    json.dump(champs, f, indent=2)
                with open(version_cache_file, "w", encoding="utf-8") as f:
                    f.write(self.latest_version)

                logger.info("Successfully loaded and cached %d champions from Riot Data Dragon", len(self.id_to_name))
        except Exception as e:
            logger.warning("Could not reach Riot Data Dragon (%s); initializing empty/fallback resolver.", e)

    def _populate_dictionaries(self, champ_dict: Dict[str, Any]):
        for key, champ in champ_dict.items():
            try:
                cid = int(champ["key"])
                self.id_to_name[cid] = champ["name"]
                self.id_to_data[cid] = champ
            except (KeyError, ValueError):
                continue

    def get_name(self, champion_id: int) -> str:
        """Dynamically resolves champion ID to official English name."""
        if champion_id == -1:
            return "None (No Ban)"
        return self.id_to_name.get(champion_id, f"Champion #{champion_id}")

    def get_profile(self, champion_id: int) -> Dict[str, Any]:
        """Derives tactical parameters dynamically from Riot champion stats/tags."""
        champ = self.id_to_data.get(champion_id)
        if not champ:
            return {
                "name": self.get_name(champion_id),
                "engage": 5.0, "disengage": 5.0, "poke": 5.0, "scaling": 5.0, "teamfight": 5.0,
                "ap": 0.5, "ad": 0.5
            }

        tags = champ.get("tags", [])  # Tank, Fighter, Mage, Assassin, Support, Marksman
        info = champ.get("info", {})  # attack, defense, magic, difficulty (scale 1-10)

        attack = info.get("attack", 5)
        defense = info.get("defense", 5)
        magic = info.get("magic", 5)

        # Tactical derivations based on Riot's official stats
        engage = 4.0
        if "Tank" in tags:
            engage += 4.0
        if "Fighter" in tags:
            engage += 2.0
        if "Support" in tags and defense > 5:
            engage += 2.0

        disengage = 3.0
        if "Support" in tags:
            disengage += 4.0
        if "Mage" in tags:
            disengage += 2.0

        poke = 3.0
        if "Mage" in tags or "Marksman" in tags:
            poke += 3.0
        if attack > 7 or magic > 7:
            poke += 2.0

        scaling = 5.0
        if "Marksman" in tags or "Mage" in tags:
            scaling += 2.5
        if "Fighter" in tags:
            scaling += 1.5

        teamfight = 4.0
        if "Mage" in tags or "Tank" in tags:
            teamfight += 3.5
        if "Marksman" in tags:
            teamfight += 2.0

        tot_dmg = max(attack + magic, 1)
        ad_pct = attack / tot_dmg
        ap_pct = magic / tot_dmg

        return {
            "name": champ.get("name", self.get_name(champion_id)),
            "engage": min(round(engage, 1), 10.0),
            "disengage": min(round(disengage, 1), 10.0),
            "poke": min(round(poke, 1), 10.0),
            "scaling": min(round(scaling, 1), 10.0),
            "teamfight": min(round(teamfight, 1), 10.0),
            "ad": round(ad_pct, 2),
            "ap": round(ap_pct, 2),
        }


# Global manager instance
_manager = ChampionDataManager()

def get_champion_name(champion_id: int) -> str:
    return _manager.get_name(champion_id)

def get_champion_profile(champion_id: int) -> Dict[str, Any]:
    return _manager.get_profile(champion_id)
