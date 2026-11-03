"""Official Riot Games API Client with Regional Routing, Rate Limiting, and Caching.

Complies strictly with Riot Developer guidelines:
- Account-v1 (Riot ID -> PUUID)
- Match-v5 (PUUID -> Match IDs, Match ID -> Match Details)
- Built-in disk caching for immutable match payloads
- Local rate-limiting & backoff
- Explicit error propagation (no fallback mock games)
"""

import json
import logging
import os
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
from urllib.parse import quote

import requests

from .config import RiotConfig, CACHE_DIR, get_regional_route, resolve_continental_region

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
        self.short_history = [t for t in self.short_history if now - t < 1.0]
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
            "RiotClient initialized (Has API Key: %s, Platform: %s, Region: %s)",
            self.config.has_valid_api_key,
            self.config.default_platform,
            self.config.default_region,
        )

    def _get_headers(self) -> Dict[str, str]:
        if not self.config.has_valid_api_key:
            raise RiotAPIError(401, "No valid Riot API Key configured. Please add your real RIOT_API_KEY in the .env file.")
        return {
            "X-Riot-Token": self.config.api_key,
            "User-Agent": "DraftJudge/1.0.0 (Research & Draft Analysis Application)",
            "Accept-Language": "en-US,en;q=0.9",
        }

    # -------------------------------------------------------------------------
    # 1. ACCOUNT-V1: Lookup Player PUUID via Riot ID (GameName + TagLine)
    # -------------------------------------------------------------------------
    def get_account_by_riot_id(self, game_name: str, tag_line: str, region: Optional[str] = None) -> Dict[str, Any]:
        """Look up player PUUID using official Riot ID (e.g. 'Faker#T1')."""
        if not self.config.has_valid_api_key:
            raise RiotAPIError(401, "No valid Riot API Key configured. Please add your real RIOT_API_KEY in the .env file.")

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

        # Account-v1 clusters: 'asia', 'americas', 'europe'. SEA players use 'asia'.
        continental = resolve_continental_region(region or self.config.default_region)
        account_region = "asia" if continental in ("sea", "asia") else continental
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
        else:
            self._handle_api_error(resp, context=f"account '{game_name}#{tag_line}'")
            return {}

    # -------------------------------------------------------------------------
    # 2. MATCH-V5: Retrieve Match IDs for a Player PUUID
    # -------------------------------------------------------------------------
    def get_match_ids_by_puuid(
        self,
        puuid: str,
        region: Optional[str] = None,
        count: int = 10,
        queue_id: Optional[int] = None,
    ) -> List[str]:
        """Fetch list of historical match IDs for a player."""
        if not self.config.has_valid_api_key:
            raise RiotAPIError(401, "No valid Riot API Key configured. Please add your real RIOT_API_KEY in the .env file.")

        continental = resolve_continental_region(region or self.config.default_region)
        url = f"https://{continental}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
        params: Dict[str, Any] = {"start": 0, "count": count}
        if queue_id is not None:
            params["queue"] = queue_id

        self.rate_limiter.wait_if_needed()
        logger.info("HTTP GET Match-v5 Match History for PUUID: %s (Count: %d)", puuid[:12] + "...", count)
        resp = requests.get(url, headers=self._get_headers(), params=params, timeout=10)

        if resp.status_code == 200:
            return resp.json()
        else:
            self._handle_api_error(resp, context="match history")
            return []

    # -------------------------------------------------------------------------
    # 3. MATCH-V5: Retrieve Historical Match Details
    # -------------------------------------------------------------------------
    def get_match_by_id(self, match_id: str, region: Optional[str] = None) -> Dict[str, Any]:
        """Fetch detailed match data (picks, bans, participants, metadata)."""
        if not self.config.has_valid_api_key:
            raise RiotAPIError(401, "No valid Riot API Key configured. Please add your real RIOT_API_KEY in the .env file.")

        # Resolve continental region from match_id prefix if available (e.g. SG2_123 -> sea, NA1_123 -> americas)
        if not region:
            prefix = match_id.split("_")[0].lower() if "_" in match_id else ""
            region = get_regional_route(prefix) if prefix else self.config.default_region

        continental = resolve_continental_region(region)
        cache_file = self.match_cache_dir / f"{match_id}.json"
        if cache_file.exists():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    logger.info("Serving match %s from immutable local cache", match_id)
                    return json.load(f)
            except Exception as e:
                logger.warning("Cache read error for %s: %s", cache_file, e)

        url = f"https://{continental}.api.riotgames.com/lol/match/v5/matches/{match_id}"
        self.rate_limiter.wait_if_needed()
        logger.info("HTTP GET Match-v5 Match Details: %s", url)
        resp = requests.get(url, headers=self._get_headers(), timeout=12)

        if resp.status_code == 200:
            data = resp.json()
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            return data
        else:
            self._handle_api_error(resp, context=f"match ID {match_id}")
            return {}

    # -------------------------------------------------------------------------
    # Error Handler
    # -------------------------------------------------------------------------
    def _handle_api_error(self, resp: requests.Response, context: str = ""):
        status = resp.status_code
        try:
            err_json = resp.json()
            msg = err_json.get("status", {}).get("message", resp.text)
        except Exception:
            msg = resp.text

        detail = f" for {context}" if context else ""

        if status == 400:
            raise RiotAPIError(400, f"Bad Request ({status}): {msg}")
        elif status == 401:
            raise RiotAPIError(401, "Unauthorized (401): Invalid Riot API Key. Please update RIOT_API_KEY in .env.")
        elif status == 403:
            raise RiotAPIError(403, "Forbidden (403): Riot API Key has expired or was rejected. Generate a new key at developer.riotgames.com and paste it in .env.")
        elif status == 404:
            raise RiotAPIError(404, f"Not Found (404){detail}. Check spelling and selected region.")
        elif status == 429:
            retry_after = resp.headers.get("Retry-After", "10")
            raise RiotAPIError(429, f"Rate Limit Exceeded (429). Retry after {retry_after}s.")
        elif status >= 500:
            raise RiotAPIError(status, f"Riot Server Error ({status}): {msg}")
        else:
            raise RiotAPIError(status, f"Riot API Error ({status}): {msg}")
