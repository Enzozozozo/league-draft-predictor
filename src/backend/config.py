"""Configuration module for the League of Legends Draft AI application.

Handles API credentials, mock mode, routing, caching, and model paths.
"""

import os
from pathlib import Path
from dataclasses import dataclass

# Base directory paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
CACHE_DIR = BASE_DIR / ".cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Path to the user's trained joblib model
DEFAULT_MODEL_PATH = BASE_DIR / "models" / "league_mobalytics_clone.joblib"


def get_model_path() -> Path:
    """Return an existing path to the trained model artifact."""
    return DEFAULT_MODEL_PATH


@dataclass(frozen=True)
class RiotConfig:
    """Riot API connection and routing settings."""
    api_key: str = os.getenv("RIOT_API_KEY", "RGAPI-MOCK-DEV-KEY-0000-0000-000000000000")
    default_platform: str = os.getenv("RIOT_PLATFORM", "sg2")  # e.g. sg2, na1, euw1, kr
    default_region: str = os.getenv("RIOT_REGION", "sea")       # e.g. sea, americas, europe, asia
    rate_limit_short: int = 20    # max requests per 1 second
    rate_limit_long: int = 100    # max requests per 120 seconds
    cache_ttl_seconds: int = 86400 * 7  # Matches are immutable; cache for 7 days
    use_mock: bool = os.getenv("RIOT_USE_MOCK", "").lower() in ("true", "1", "yes")

    @property
    def is_mock(self) -> bool:
        """Determines if the client should run in mock mode without making live network calls."""
        if self.use_mock:
            return True
        key = self.api_key.strip()
        if (
            not key
            or key.startswith("RGAPI-MOCK")
            or "fake" in key.lower()
            or "your" in key.lower()
        ):
            return True
        return False


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


def get_regional_route(platform: str) -> str:
    """Resolve platform (e.g. sg2) to continental routing (e.g. sea)."""
    return PLATFORM_TO_REGIONAL.get(platform.lower(), "sea")
