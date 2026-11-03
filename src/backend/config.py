"""Configuration module for the League of Legends Draft AI application.

Handles API credentials, routing, caching, and model paths.
All mock fallback game modes have been removed so all queries hit the real API or return an explicit error.
"""

import os
from pathlib import Path
from dataclasses import dataclass
from dotenv import load_dotenv

# Base directory paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")
CACHE_DIR = BASE_DIR / ".cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Path to the user's trained joblib model
DEFAULT_MODEL_PATH = BASE_DIR / "models" / "league_draft_iter1.joblib"


def get_model_path() -> Path:
    """Return an existing path to the trained model artifact."""
    return DEFAULT_MODEL_PATH


@dataclass
class RiotConfig:
    """Riot API connection and routing settings."""
    api_key: str = ""
    default_platform: str = "sg2"
    default_region: str = "sea"
    rate_limit_short: int = 20    # max requests per 1 second
    rate_limit_long: int = 100    # max requests per 120 seconds
    cache_ttl_seconds: int = 86400 * 7  # Matches are immutable; cache for 7 days

    def __post_init__(self):
        # Always reload from .env to pick up recent user edits
        load_dotenv(BASE_DIR / ".env", override=True)
        if not self.api_key:
            self.api_key = os.getenv("RIOT_API_KEY", "").strip()
        if not self.default_platform or self.default_platform == "sg2":
            self.default_platform = os.getenv("RIOT_PLATFORM", "sg2")
        if not self.default_region or self.default_region == "sea":
            self.default_region = os.getenv("RIOT_REGION", "sea")

    @property
    def has_valid_api_key(self) -> bool:
        """Checks if a valid, non-placeholder API key is set."""
        key = (self.api_key or "").strip()
        if not key or key.startswith("RGAPI-MOCK") or "fake" in key.lower() or "your" in key.lower():
            return False
        return True


# Region mapping from platform routing (Account/Mastery) to regional routing (Match-v5)
PLATFORM_TO_REGIONAL = {
    # SEA
    "sg2": "sea",
    "ph2": "sea",
    "vn2": "sea",
    "th2": "sea",
    "tw2": "sea",
    "oc1": "sea",
    # AMERICAS
    "na1": "americas",
    "br1": "americas",
    "la1": "americas",
    "la2": "americas",
    # EUROPE
    "euw1": "europe",
    "eun1": "europe",
    "tr1": "europe",
    "ru": "europe",
    # ASIA
    "kr": "asia",
    "jp1": "asia",
}


def resolve_continental_region(region_input: str) -> str:
    """Resolve user input (e.g. SEA, NA, EUW, KR, na1, etc.) to Riot Match-v5 continental routing."""
    r = (region_input or "").lower().strip()
    if r in ("na", "na1", "br", "br1", "lan", "la1", "las", "la2", "americas"):
        return "americas"
    if r in ("euw", "euw1", "eun", "eun1", "tr", "tr1", "ru", "europe"):
        return "europe"
    if r in ("kr", "jp", "jp1", "asia"):
        return "asia"
    if r in ("sea", "sg2", "ph2", "vn2", "th2", "tw2", "oc1"):
        return "sea"
    return PLATFORM_TO_REGIONAL.get(r, "sea")


def get_regional_route(platform: str) -> str:
    """Resolve platform (e.g. sg2) to continental routing (e.g. sea)."""
    return resolve_continental_region(platform)
