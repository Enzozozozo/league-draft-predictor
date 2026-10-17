"""Official Riot Games API Client with Regional Routing, Rate Limiting, Caching, and Mock Support.

Complies strictly with Riot Developer guidelines:
- Account-v1 (Riot ID -> PUUID)
- Match-v5 (PUUID -> Match IDs, Match ID -> Match Details)
- Built-in disk caching for immutable match payloads
- Local rate-limiting & backoff
- Realistic offline Mock Mode for development with fake or expired API keys
"""

import json
import logging
import os
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
from urllib.parse import quote

import requests

from .config import RiotConfig, CACHE_DIR, get_regional_route

logger = logging.getLogger("RiotClient")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


class RiotAPIError(Exception):
    """Base exception for Riot API failures."""
    def __init__(self, status_code: int, message: str):
        super().__init__(f"Riot API Error ({status_code}): {message}")
        self.status_code = status_code
        self.message = message


class RateLimiter:
    """Sliding-window token bucket to prevent hitting Riot 20 req/1s and 100 req/2m limits."""
    def __init__(self, short_limit: int = 20, long_limit: int = 100):
        self.short_limit = short_limit
        self.long_limit = long_limit
        self.short_history: List[float] = []
        self.long_history: List[float] = []

    def wait_if_needed(self):
        now = time.time()
        # Clean timestamps older than 1 second
        self.short_history = [t for t in self.short_history if now - t < 1.0]
        # Clean timestamps older than 120 seconds
        self.long_history = [t for t in self.long_history if now - t < 120.0]

        if len(self.short_history) >= self.short_limit:
            sleep_time = 1.0 - (now - self.short_history[0]) + 0.05
            if sleep_time > 0:
                logger.warning("Approaching 1s rate limit; sleeping for %.2fs", sleep_time)
                time.sleep(sleep_time)
                now = time.time()

        if len(self.long_history) >= self.long_limit:
            sleep_time = 120.0 - (now - self.long_history[0]) + 0.1
            if sleep_time > 0:
                logger.warning("Approaching 120s rate limit; sleeping for %.2fs", sleep_time)
                time.sleep(sleep_time)
                now = time.time()

        now = time.time()
        self.short_history.append(now)
        self.long_history.append(now)


class RiotClient:
    """Production-grade client for the Riot Games Developer API."""

    def __init__(self, config: Optional[RiotConfig] = None):
        self.config = config or RiotConfig()
        self.rate_limiter = RateLimiter(
            short_limit=self.config.rate_limit_short,
            long_limit=self.config.rate_limit_long,
        )
        self.match_cache_dir = CACHE_DIR / "matches"
        self.account_cache_dir = CACHE_DIR / "accounts"
        self.match_cache_dir.mkdir(parents=True, exist_ok=True)
        self.account_cache_dir.mkdir(parents=True, exist_ok=True)

        logger.info(
            "RiotClient initialized (Mock Mode: %s, Platform: %s, Region: %s)",
            self.config.is_mock,
            self.config.default_platform,
            self.config.default_region,
        )

    def _get_headers(self) -> Dict[str, str]:
        return {
            "X-Riot-Token": self.config.api_key,
            "User-Agent": "LeagueDraftAI/1.0.0 (Research & Draft Analysis Application)",
            "Accept-Language": "en-US,en;q=0.9",
        }

    # -------------------------------------------------------------------------
    # 1. ACCOUNT-V1: Lookup Player PUUID via Riot ID (GameName + TagLine)
    # -------------------------------------------------------------------------
    def get_account_by_riot_id(self, game_name: str, tag_line: str, region: Optional[str] = None) -> Dict[str, Any]:
        """Look up player PUUID using official Riot ID (e.g. 'Faker#T1')."""
        region = region or self.config.default_region
        cache_key = f"{game_name.lower()}_{tag_line.lower()}_{region}.json"
        cache_file = self.account_cache_dir / cache_key

        if cache_file.exists():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    logger.info("Serving account %s#%s from disk cache", game_name, tag_line)
                    return json.load(f)
            except Exception as e:
                logger.warning("Cache read error for %s: %s", cache_file, e)

        if self.config.is_mock:
            mock_account = self._generate_mock_account(game_name, tag_line)
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(mock_account, f, indent=2)
            return mock_account

        # Official Account-v1 endpoint: Account-v1 only supports 'asia', 'americas', 'europe'
        # 'sea' is NOT a valid Account-v1 cluster; SEA players are resolved via 'asia'
        account_region = "asia" if (region and region.lower() in ("sea", "asia")) else (region or "americas")
        safe_name = quote(game_name)
        safe_tag = quote(tag_line)
        url = f"https://{account_region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{safe_name}/{safe_tag}"


        self.rate_limiter.wait_if_needed()
        logger.info("HTTP GET Account-v1: %s", url)
        resp = requests.get(url, headers=self._get_headers(), timeout=10)

        if resp.status_code == 200:
            data = resp.json()
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            return data
        elif resp.status_code in (401, 403) and ("mock" in self.config.api_key.lower() or "fake" in self.config.api_key.lower()):
            logger.warning("Received %d Unauthorized with fake key; falling back to mock account", resp.status_code)
            return self._generate_mock_account(game_name, tag_line)
        else:
            self._handle_api_error(resp)
            return {}

    # -------------------------------------------------------------------------
    # 2. MATCH-V5: Retrieve Match IDs for a Player PUUID
    # -------------------------------------------------------------------------
    def get_match_ids_by_puuid(
        self,
        puuid: str,
        region: Optional[str] = None,
        count: int = 10,
        queue_id: Optional[int] = 420,  # 420 = Ranked Solo/Duo
    ) -> List[str]:
        """Fetch list of historical match IDs for a player."""
        region = region or self.config.default_region

        if self.config.is_mock or puuid.startswith("mock-puuid-"):
            return self._generate_mock_match_ids(region, count)

        url = f"https://{region}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
        params: Dict[str, Any] = {"start": 0, "count": count}
        if queue_id:
            params["queue"] = queue_id

        self.rate_limiter.wait_if_needed()
        logger.info("HTTP GET Match-v5 Match History for PUUID: %s (Count: %d)", puuid[:12] + "...", count)
        resp = requests.get(url, headers=self._get_headers(), params=params, timeout=10)

        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code in (401, 403) and ("mock" in self.config.api_key.lower() or "fake" in self.config.api_key.lower()):
            logger.warning("Received %d with fake key; returning mock match IDs", resp.status_code)
            return self._generate_mock_match_ids(region, count)
        else:
            self._handle_api_error(resp)
            return []

    # -------------------------------------------------------------------------
    # 3. MATCH-V5: Retrieve Historical Match Details
    # -------------------------------------------------------------------------
    def get_match_by_id(self, match_id: str, region: Optional[str] = None) -> Dict[str, Any]:
        """Fetch detailed match data (picks, bans, participants, metadata)."""
        # Resolve continental region from match_id prefix if available (e.g. SG2_123 -> sea, NA1_123 -> americas)
        if not region:
            prefix = match_id.split("_")[0].lower() if "_" in match_id else ""
            region = get_regional_route(prefix) if prefix else self.config.default_region

        cache_file = self.match_cache_dir / f"{match_id}.json"
        if cache_file.exists():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    logger.info("Serving match %s from immutable local cache", match_id)
                    return json.load(f)
            except Exception as e:
                logger.warning("Cache read error for %s: %s", cache_file, e)

        if self.config.is_mock or match_id.startswith("MOCK_"):
            mock_data = self._generate_mock_match(match_id)
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(mock_data, f, indent=2)
            return mock_data

        url = f"https://{region}.api.riotgames.com/lol/match/v5/matches/{match_id}"
        self.rate_limiter.wait_if_needed()
        logger.info("HTTP GET Match-v5 Match Details: %s", url)
        resp = requests.get(url, headers=self._get_headers(), timeout=12)

        if resp.status_code == 200:
            data = resp.json()
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            return data
        elif resp.status_code in (401, 403) and ("mock" in self.config.api_key.lower() or "fake" in self.config.api_key.lower()):
            logger.warning("Received %d with fake key; serving high-fidelity mock match", resp.status_code)
            mock_data = self._generate_mock_match(match_id)
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(mock_data, f, indent=2)
            return mock_data
        else:
            self._handle_api_error(resp)
            return {}

    # -------------------------------------------------------------------------
    # Error Handler
    # -------------------------------------------------------------------------
    def _handle_api_error(self, resp: requests.Response):
        status = resp.status_code
        try:
            err_json = resp.json()
            msg = err_json.get("status", {}).get("message", resp.text)
        except Exception:
            msg = resp.text

        if status == 400:
            raise RiotAPIError(400, f"Bad Request: {msg}")
        elif status == 401:
            raise RiotAPIError(401, f"Unauthorized: Check your RIOT_API_KEY in .env. ({msg})")
        elif status == 403:
            raise RiotAPIError(403, f"Forbidden: API Key is expired or rejected by Riot. ({msg})")
        elif status == 404:
            raise RiotAPIError(404, f"Resource Not Found: {msg}")
        elif status == 429:
            retry_after = resp.headers.get("Retry-After", "10")
            raise RiotAPIError(429, f"Rate Limit Exceeded. Retry-After: {retry_after}s. ({msg})")
        elif status >= 500:
            raise RiotAPIError(status, f"Riot Server Error: {msg}")
        else:
            raise RiotAPIError(status, f"Unexpected response: {msg}")

    # -------------------------------------------------------------------------
    # High-Fidelity Mock Generators for Offline / Fake API Key Testing
    # -------------------------------------------------------------------------
    def _generate_mock_account(self, game_name: str, tag_line: str) -> Dict[str, Any]:
        """Generate official Account-v1 schema response."""
        return {
            "puuid": f"mock-puuid-{abs(hash(game_name + tag_line)):016x}",
            "gameName": game_name,
            "tagLine": tag_line,
        }

    def _generate_mock_match_ids(self, region: str, count: int) -> List[str]:
        """Generate realistic match IDs for the region."""
        prefix = "SG2" if region == "sea" else ("NA1" if region == "americas" else "KR")
        return [f"{prefix}_31589400{i:02d}" for i in range(1, count + 1)]

    def _generate_mock_match(self, match_id: str) -> Dict[str, Any]:
        """Generate official Match-v5 schema payload with full draft (picks & bans)."""
        # Blue Team: Aatrox (Top), Lee Sin (Jungle), Ahri (Mid), Jinx (Bot), Thresh (Sup)
        # Red Team:  Malphite (Top), Jarvan IV (Jungle), Sylas (Mid), Ezreal (Bot), Leona (Sup)
        return {
            "metadata": {
                "dataVersion": "2",
                "matchId": match_id,
                "participants": [
                    f"mock-puuid-{i:04d}" for i in range(1, 11)
                ],
            },
            "info": {
                "gameCreation": 1715690000000,
                "gameDuration": 1845,
                "gameEndTimestamp": 1715691845000,
                "gameId": 315894001,
                "gameMode": "CLASSIC",
                "gameName": "teambuilder-match-315894001",
                "gameStartTimestamp": 1715690060000,
                "gameType": "MATCHED_GAME",
                "gameVersion": "14.10.1.5888",
                "mapId": 11,
                "platformId": "SG2",
                "queueId": 420,  # Ranked Solo 5v5
                "tournamentCode": "",
                "teams": [
                    {
                        "teamId": 100,
                        "win": True,
                        "bans": [
                            {"championId": 157, "pickTurn": 1},  # Yasuo
                            {"championId": 238, "pickTurn": 3},  # Zed
                            {"championId": 897, "pickTurn": 5},  # K'Sante
                            {"championId": 222, "pickTurn": 7},  # Jinx
                            {"championId": 111, "pickTurn": 9},  # Nautilus
                        ],
                        "objectives": {"baron": {"first": True, "kills": 1}, "dragon": {"first": True, "kills": 3}},
                    },
                    {
                        "teamId": 200,
                        "win": False,
                        "bans": [
                            {"championId": 84, "pickTurn": 2},   # Akali
                            {"championId": 53, "pickTurn": 4},   # Blitzcrank
                            {"championId": 114, "pickTurn": 6},  # Fiora
                            {"championId": 516, "pickTurn": 8},  # Ornn
                            {"championId": 412, "pickTurn": 10}, # Thresh
                        ],
                        "objectives": {"baron": {"first": False, "kills": 0}, "dragon": {"first": False, "kills": 1}},
                    },
                ],
                "participants": [
                    # Blue Team (100)
                    {
                        "participantId": 1,
                        "teamId": 100,
                        "puuid": "mock-puuid-0001",
                        "riotIdGameName": "TopTitan",
                        "riotIdTagline": "SEA",
                        "championId": 266,
                        "championName": "Aatrox",
                        "teamPosition": "TOP",
                        "individualPosition": "TOP",
                        "summoner1Id": 4,  # Flash
                        "summoner2Id": 12, # Teleport
                        "win": True,
                        "perks": {"styles": [{"style": 8000, "selections": [{"perk": 8010}]}]},  # Conqueror
                    },
                    {
                        "participantId": 2,
                        "teamId": 100,
                        "puuid": "mock-puuid-0002",
                        "riotIdGameName": "JungleDiff",
                        "riotIdTagline": "SG",
                        "championId": 64,
                        "championName": "LeeSin",
                        "teamPosition": "JUNGLE",
                        "individualPosition": "JUNGLE",
                        "summoner1Id": 4,
                        "summoner2Id": 11, # Smite
                        "win": True,
                        "perks": {"styles": [{"style": 8000, "selections": [{"perk": 8010}]}]},
                    },
                    {
                        "participantId": 3,
                        "teamId": 100,
                        "puuid": "mock-puuid-0003",
                        "riotIdGameName": "MidMage",
                        "riotIdTagline": "KR",
                        "championId": 103,
                        "championName": "Ahri",
                        "teamPosition": "MIDDLE",
                        "individualPosition": "MIDDLE",
                        "summoner1Id": 4,
                        "summoner2Id": 14, # Ignite
                        "win": True,
                        "perks": {"styles": [{"style": 8100, "selections": [{"perk": 8112}]}]},  # Electrocute
                    },
                    {
                        "participantId": 4,
                        "teamId": 100,
                        "puuid": "mock-puuid-0004",
                        "riotIdGameName": "CarryQueen",
                        "riotIdTagline": "001",
                        "championId": 222,
                        "championName": "Jinx",
                        "teamPosition": "BOTTOM",
                        "individualPosition": "BOTTOM",
                        "summoner1Id": 4,
                        "summoner2Id": 7,  # Heal
                        "win": True,
                        "perks": {"styles": [{"style": 8000, "selections": [{"perk": 8008}]}]},  # Lethal Tempo
                    },
                    {
                        "participantId": 5,
                        "teamId": 100,
                        "puuid": "mock-puuid-0005",
                        "riotIdGameName": "HookMaster",
                        "riotIdTagline": "SUP",
                        "championId": 412,
                        "championName": "Thresh",
                        "teamPosition": "UTILITY",
                        "individualPosition": "UTILITY",
                        "summoner1Id": 4,
                        "summoner2Id": 14,
                        "win": True,
                        "perks": {"styles": [{"style": 8400, "selections": [{"perk": 8439}]}]},  # Aftershock
                    },
                    # Red Team (200)
                    {
                        "participantId": 6,
                        "teamId": 200,
                        "puuid": "mock-puuid-0006",
                        "riotIdGameName": "RockSolid",
                        "riotIdTagline": "RED",
                        "championId": 54,
                        "championName": "Malphite",
                        "teamPosition": "TOP",
                        "individualPosition": "TOP",
                        "summoner1Id": 4,
                        "summoner2Id": 12,
                        "win": False,
                        "perks": {"styles": [{"style": 8200, "selections": [{"perk": 8229}]}]},  # Arcane Comet
                    },
                    {
                        "participantId": 7,
                        "teamId": 200,
                        "puuid": "mock-puuid-0007",
                        "riotIdGameName": "DemaciaFirst",
                        "riotIdTagline": "PR",
                        "championId": 59,
                        "championName": "JarvanIV",
                        "teamPosition": "JUNGLE",
                        "individualPosition": "JUNGLE",
                        "summoner1Id": 4,
                        "summoner2Id": 11,
                        "win": False,
                        "perks": {"styles": [{"style": 8000, "selections": [{"perk": 8010}]}]},
                    },
                    {
                        "participantId": 8,
                        "teamId": 200,
                        "puuid": "mock-puuid-0008",
                        "riotIdGameName": "ChainsBreak",
                        "riotIdTagline": "MID",
                        "championId": 517,
                        "championName": "Sylas",
                        "teamPosition": "MIDDLE",
                        "individualPosition": "MIDDLE",
                        "summoner1Id": 4,
                        "summoner2Id": 14,
                        "win": False,
                        "perks": {"styles": [{"style": 8000, "selections": [{"perk": 8010}]}]},
                    },
                    {
                        "participantId": 9,
                        "teamId": 200,
                        "puuid": "mock-puuid-0009",
                        "riotIdGameName": "ArcaneShifter",
                        "riotIdTagline": "BOT",
                        "championId": 81,
                        "championName": "Ezreal",
                        "teamPosition": "BOTTOM",
                        "individualPosition": "BOTTOM",
                        "summoner1Id": 4,
                        "summoner2Id": 7,
                        "win": False,
                        "perks": {"styles": [{"style": 8000, "selections": [{"perk": 8010}]}]},
                    },
                    {
                        "participantId": 10,
                        "teamId": 200,
                        "puuid": "mock-puuid-0010",
                        "riotIdGameName": "PraiseTheSun",
                        "riotIdTagline": "SUPP",
                        "championId": 89,
                        "championName": "Leona",
                        "teamPosition": "UTILITY",
                        "individualPosition": "UTILITY",
                        "summoner1Id": 4,
                        "summoner2Id": 14,
                        "win": False,
                        "perks": {"styles": [{"style": 8400, "selections": [{"perk": 8439}]}]},
                    },
                ],
            },
        }
