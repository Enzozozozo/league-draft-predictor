"""Draft Data Retrieval and Normalization Component.

Extracts objective picks, bans, teams, and metadata from raw Riot Match-v5 payloads.
Explicitly identifies and handles API limitations, role mapping, and draft order inference.
Can convert normalized draft data into structured Pandas DataFrames.
"""

import logging
from typing import Dict, Any, List, Tuple
import pandas as pd

from .schemas import (
    MatchDraft,
    MatchDraftMetadata,
    TeamDraft,
    DraftPick,
    DraftBan,
    TeamSide,
    Role,
)
from .champion_data import get_champion_name

logger = logging.getLogger("DraftExtractor")


# Official Queue IDs with draft/ban support
QUEUE_DESCRIPTIONS: Dict[int, Tuple[str, bool]] = {
    400: ("5v5 Draft Pick", True),
    420: ("5v5 Ranked Solo/Duo", True),
    440: ("5v5 Ranked Flex", True),
    700: ("Clash Tournament Draft", True),
    430: ("5v5 Blind Pick", False),
    450: ("5v5 ARAM", False),
}


class DraftExtractor:
    """Extracts, normalizes, and structures champion draft data from Riot API responses."""

    @staticmethod
    def extract_draft(raw_match_data: Dict[str, Any]) -> MatchDraft:
        """Parses a raw Match-v5 JSON payload into a structured MatchDraft entity."""
        info = raw_match_data.get("info", {})
        metadata = raw_match_data.get("metadata", {})
        match_id = metadata.get("matchId", str(info.get("gameId", "UNKNOWN")))

        queue_id = info.get("queueId", 0)
        queue_desc, bans_supported = QUEUE_DESCRIPTIONS.get(queue_id, (f"Queue #{queue_id}", False))

        match_meta = MatchDraftMetadata(
            match_id=match_id,
            game_mode=info.get("gameMode", "CLASSIC"),
            queue_id=queue_id,
            queue_description=queue_desc,
            patch_version=info.get("gameVersion", "Unknown"),
            game_duration_seconds=info.get("gameDuration", 0),
            bans_supported=bans_supported,
        )

        blue_team_data: Dict[str, Any] = {}
        red_team_data: Dict[str, Any] = {}
        for t in info.get("teams", []):
            if t.get("teamId") == 100:
                blue_team_data = t
            elif t.get("teamId") == 200:
                red_team_data = t

        blue_team = TeamDraft(
            team_id=100,
            team_side=TeamSide.BLUE,
            won=bool(blue_team_data.get("win", False)),
        )
        red_team = TeamDraft(
            team_id=200,
            team_side=TeamSide.RED,
            won=bool(red_team_data.get("win", False)),
        )

        # ---------------------------------------------------------------------
        # 1. Extract Bans (Objective Data)
        # ---------------------------------------------------------------------
        for b in blue_team_data.get("bans", []):
            cid = b.get("championId", -1)
            blue_team.bans.append(
                DraftBan(
                    team_id=100,
                    team_side=TeamSide.BLUE,
                    pick_turn=b.get("pickTurn", 0),
                    champion_id=cid,
                    champion_name=get_champion_name(cid),
                    is_inferred=False,
                )
            )

        for b in red_team_data.get("bans", []):
            cid = b.get("championId", -1)
            red_team.bans.append(
                DraftBan(
                    team_id=200,
                    team_side=TeamSide.RED,
                    pick_turn=b.get("pickTurn", 0),
                    champion_id=cid,
                    champion_name=get_champion_name(cid),
                    is_inferred=False,
                )
            )

        # ---------------------------------------------------------------------
        # 2. Extract Picks & Participants (Objective + Inferred Roles)
        # ---------------------------------------------------------------------
        participants = info.get("participants", [])
        blue_idx = 1
        red_idx = 1

        for p in participants:
            team_id = p.get("teamId", 100)
            side = TeamSide.BLUE if team_id == 100 else TeamSide.RED
            cid = p.get("championId", 0)
            cname = p.get("championName", get_champion_name(cid))

            # TeamPosition is inferred by Riot post-game
            pos_str = p.get("teamPosition") or p.get("individualPosition") or "UNKNOWN"
            try:
                assigned_role = Role(pos_str.upper())
            except ValueError:
                assigned_role = Role.UNKNOWN

            # Primary Keystone
            keystone_id = 0
            perk_styles = p.get("perks", {}).get("styles", [])
            if perk_styles and "selections" in perk_styles[0] and perk_styles[0]["selections"]:
                keystone_id = perk_styles[0]["selections"][0].get("perk", 0)

            riot_name = p.get("riotIdGameName") or p.get("summonerName") or f"Summoner_{p.get('participantId')}"
            riot_tag = p.get("riotIdTagline") or "NA"
            full_riot_id = f"{riot_name}#{riot_tag}"

            pick = DraftPick(
                team_id=team_id,
                team_side=side,
                participant_id=p.get("participantId", 0),
                puuid=p.get("puuid", ""),
                riot_id=full_riot_id,
                champion_id=cid,
                champion_name=cname,
                assigned_role=assigned_role,
                role_is_inferred=True,
                pick_order_inferred=blue_idx if side == TeamSide.BLUE else red_idx,
                summoner1_id=p.get("summoner1Id", 0),
                summoner2_id=p.get("summoner2Id", 0),
                primary_keystone_id=keystone_id,
                champion_mastery_points=0,  # Pre-game mastery signal
                win=bool(p.get("win", False)),
            )

            if side == TeamSide.BLUE:
                blue_team.picks.append(pick)
                blue_idx += 1
            else:
                red_team.picks.append(pick)
                red_idx += 1

        return MatchDraft(
            metadata=match_meta,
            blue_team=blue_team,
            red_team=red_team,
        )

    # -------------------------------------------------------------------------
    # 3. Pandas DataFrame Conversion
    # -------------------------------------------------------------------------
    @staticmethod
    def to_picks_dataframe(draft: MatchDraft) -> pd.DataFrame:
        """Convert all 10 champion selections to a Pandas DataFrame."""
        rows = []
        for team in (draft.blue_team, draft.red_team):
            for p in team.picks:
                rows.append({
                    "match_id": draft.metadata.match_id,
                    "team_side": p.team_side.value,
                    "team_id": p.team_id,
                    "participant_id": p.participant_id,
                    "riot_id": p.riot_id,
                    "champion_id": p.champion_id,
                    "champion_name": p.champion_name,
                    "role": p.assigned_role.value,
                    "role_inferred": p.role_is_inferred,
                    "spell1_id": p.summoner1_id,
                    "spell2_id": p.summoner2_id,
                    "keystone_id": p.primary_keystone_id,
                    "win": p.win,
                })
        return pd.DataFrame(rows)

    @staticmethod
    def to_bans_dataframe(draft: MatchDraft) -> pd.DataFrame:
        """Convert all bans to a Pandas DataFrame."""
        rows = []
        for team in (draft.blue_team, draft.red_team):
            for b in team.bans:
                rows.append({
                    "match_id": draft.metadata.match_id,
                    "team_side": b.team_side.value,
                    "team_id": b.team_id,
                    "pick_turn": b.pick_turn,
                    "champion_id": b.champion_id,
                    "champion_name": b.champion_name,
                })
        return pd.DataFrame(rows)

    @staticmethod
    def to_team_summary_dataframe(draft: MatchDraft) -> pd.DataFrame:
        """Produce a side-by-side composition summary."""
        blue_champs = ", ".join(draft.blue_team.champion_names)
        red_champs = ", ".join(draft.red_team.champion_names)
        blue_bans = ", ".join([b.champion_name for b in draft.blue_team.bans])
        red_bans = ", ".join([b.champion_name for b in draft.red_team.bans])

        return pd.DataFrame([
            {
                "match_id": draft.metadata.match_id,
                "patch": draft.metadata.patch_version,
                "queue": draft.metadata.queue_description,
                "blue_picks": blue_champs,
                "red_picks": red_champs,
                "blue_bans": blue_bans,
                "red_bans": red_bans,
                "winner": "Blue (100)" if draft.blue_team.won else "Red (200)",
            }
        ])
