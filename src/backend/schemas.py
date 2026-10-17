"""Data schemas for League of Legends Champion Draft details and AI analysis.

Strongly typed dataclasses defining picks, bans, teams, metadata, and analysis outputs.
Explicitly distinguishes between objective API fields and inferred heuristics.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from enum import Enum


class TeamSide(str, Enum):
    BLUE = "Blue"  # Team ID 100
    RED = "Red"    # Team ID 200


class Role(str, Enum):
    TOP = "TOP"
    JUNGLE = "JUNGLE"
    MIDDLE = "MIDDLE"
    BOTTOM = "BOTTOM"
    UTILITY = "UTILITY"
    UNKNOWN = "UNKNOWN"


@dataclass
class DraftBan:
    """Represents a banned champion during the draft."""
    team_id: int            # 100 = Blue, 200 = Red (Objective)
    team_side: TeamSide     # Blue or Red (Objective)
    pick_turn: int          # 1..10 (Objective)
    champion_id: int        # -1 if ban was skipped/empty (Objective)
    champion_name: str      # Resolved via static Data Dragon (Objective)
    is_inferred: bool = False


@dataclass
class DraftPick:
    """Represents a champion selection for a player."""
    team_id: int                    # 100 = Blue, 200 = Red (Objective)
    team_side: TeamSide             # Blue or Red (Objective)
    participant_id: int             # 1..10 (Objective)
    puuid: str                      # Player unique identifier (Objective)
    riot_id: str                    # GameName#TagLine (Objective)
    champion_id: int                # Champion ID (Objective)
    champion_name: str              # Champion name (Objective)
    assigned_role: Role             # TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY (Inferred by Riot position algorithm)
    role_is_inferred: bool = True   # Explicit flag: Match-v5 teamPosition is inferred post-game
    pick_order_inferred: int = 0    # Inferred draft slot (1..5 per team; Match-v5 does NOT log chronological pick turn)
    summoner1_id: int = 0           # Flash, Teleport, Ignite, etc. (Objective)
    summoner2_id: int = 0           # Flash, Teleport, Ignite, etc. (Objective)
    primary_keystone_id: int = 0    # Primary Rune Keystone (Objective)
    champion_mastery_points: int = 0  # Inferred/retrieved from Champion Mastery API if queried
    win: bool = False               # Objective outcome


@dataclass
class TeamDraft:
    """Champion picks and bans for one side."""
    team_id: int
    team_side: TeamSide
    won: bool
    bans: List[DraftBan] = field(default_factory=list)
    picks: List[DraftPick] = field(default_factory=list)

    @property
    def champion_ids(self) -> List[int]:
        return [p.champion_id for p in self.picks]

    @property
    def champion_names(self) -> List[str]:
        return [p.champion_name for p in self.picks]


@dataclass
class MatchDraftMetadata:
    """Metadata regarding the match and queue rules."""
    match_id: str
    game_mode: str              # CLASSIC, ARAM, etc. (Objective)
    queue_id: int               # 420 (Ranked Solo), 440 (Ranked Flex), etc. (Objective)
    queue_description: str      # Human readable name
    patch_version: str          # e.g. "14.10.1" (Objective)
    game_duration_seconds: int  # Duration (Objective)
    bans_supported: bool        # True for Draft Pick & Ranked, False for Blind/ARAM (Objective)


@dataclass
class MatchDraft:
    """Complete consolidated champion draft representation."""
    metadata: MatchDraftMetadata
    blue_team: TeamDraft
    red_team: TeamDraft
    direct_api_fields: List[str] = field(default_factory=lambda: [
        "match_id", "patch_version", "game_mode", "queue_id",
        "team_id", "win", "champion_id", "champion_name",
        "ban.championId", "ban.pickTurn", "summoner_spells", "keystone_perks"
    ])
    inferred_fields: List[str] = field(default_factory=lambda: [
        "teamPosition (role assignment inferred by Riot algorithm, not pre-locked)",
        "chronological_pick_sequence (Match-v5 returns participants 1..10, not B1->R1R2 order)",
        "lane_matchup_pairing (derived from matching roles)",
        "champion_mastery (requires separate mastery API lookup)"
    ])


@dataclass
class CompositionMetrics:
    """Tactical composition strengths and capability scores (0-10 scale)."""
    engage: float          # Hard initiation and crowd control
    disengage: float       # Peel, zoning, and counter-engage
    poke: float            # Long-range harass and siege
    scaling: float         # Late-game statistical scaling and kit multipliers
    teamfight: float       # 5v5 area-of-effect teamfight strength
    physical_dmg_pct: float  # Estimated AD distribution
    magic_dmg_pct: float     # Estimated AP distribution
    true_dmg_pct: float      # Estimated True damage distribution


@dataclass
class LaneMatchupAnalysis:
    """Lane matchup interaction and statistical differential."""
    role: Role
    blue_champ_name: str
    blue_champ_id: int
    blue_champ_wr: float
    red_champ_name: str
    red_champ_id: int
    red_champ_wr: float
    edge_side: TeamSide
    lane_differential: float
    tactical_summary: str


@dataclass
class DraftAnalysisResult:
    """Unified output from the AI Draft Model and tactical analyzer."""
    match_id: str
    predicted_winner: TeamSide
    blue_win_probability: float
    red_win_probability: float
    draft_edge_delta: float           # Relative to 50.0% baseline (e.g. +4.2%)
    mobalytics_badge: str             # e.g. [Heavy Advantage], [Even / Skill Match]
    blue_composition: CompositionMetrics
    red_composition: CompositionMetrics
    lane_matchups: List[LaneMatchupAnalysis]
    team_synergies: Dict[str, Any]
    win_conditions: Dict[str, List[str]]
    model_name: str
    objective_vs_inferred_notes: List[str]
    api_limitations: List[str]
