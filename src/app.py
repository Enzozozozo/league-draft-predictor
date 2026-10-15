"""Main Application Orchestrator for Riot Games API Champion Draft Analysis.

Connects RiotClient, DraftExtractor, and MobalyticsJoblibModel.
Provides CLI and programmatic APIs to analyze drafts by Match ID or Player Riot ID.
"""

import argparse
import json
import logging
import sys
from typing import Optional, Dict, Any, Tuple
import pandas as pd

from .config import RiotConfig
from .riot_client import RiotClient
from .draft_extractor import DraftExtractor
from .ai_model import MobalyticsJoblibModel, DraftModelInterface
from .schemas import MatchDraft, DraftAnalysisResult

logger = logging.getLogger("DraftApp")


class DraftAnalysisApp:
    """End-to-end application coordinator."""

    def __init__(
        self,
        config: Optional[RiotConfig] = None,
        model: Optional[DraftModelInterface] = None,
    ):
        self.config = config or RiotConfig()
        self.client = RiotClient(self.config)
        self.extractor = DraftExtractor()
        self.model = model or MobalyticsJoblibModel()

    def analyze_match_by_id(self, match_id: str, region: Optional[str] = None) -> Tuple[MatchDraft, DraftAnalysisResult, pd.DataFrame]:
        """Fetches a match by its Match ID, extracts draft, and predicts outcome."""
        logger.info("Processing draft analysis for Match ID: %s", match_id)
        raw_match = self.client.get_match_by_id(match_id, region=region)
        draft = self.extractor.extract_draft(raw_match)
        analysis = self.model.predict_draft(draft)
        df_picks = self.extractor.to_picks_dataframe(draft)
        return draft, analysis, df_picks

    def analyze_player_latest_match(
        self, game_name: str, tag_line: str, region: Optional[str] = None
    ) -> Tuple[MatchDraft, DraftAnalysisResult, pd.DataFrame]:
        """Resolves Riot ID to PUUID, fetches the most recent match, and performs draft analysis."""
        logger.info("Looking up Riot ID: %s#%s", game_name, tag_line)
        account = self.client.get_account_by_riot_id(game_name, tag_line, region=region)
        puuid = account.get("puuid")
        if not puuid:
            raise ValueError(f"Could not find player account for {game_name}#{tag_line}")

        match_ids = self.client.get_match_ids_by_puuid(puuid, region=region, count=1)
        if not match_ids:
            raise ValueError(f"No recent matches found for {game_name}#{tag_line}")

        latest_match_id = match_ids[0]
        logger.info("Found latest match: %s. Initiating analysis...", latest_match_id)
        return self.analyze_match_by_id(latest_match_id, region=region)

    def analyze_player_matches(
        self, game_name: str, tag_line: str, count: int = 10, region: Optional[str] = None
    ) -> Tuple[list, pd.DataFrame]:
        """Resolves Riot ID to PUUID, fetches up to `count` recent matches, and performs batch draft analysis."""
        logger.info("Looking up Riot ID for batch analysis: %s#%s (target count: %d)", game_name, tag_line, count)
        account = self.client.get_account_by_riot_id(game_name, tag_line, region=region)
        puuid = account.get("puuid")
        if not puuid:
            raise ValueError(f"Could not find player account for {game_name}#{tag_line}")

        match_ids = self.client.get_match_ids_by_puuid(puuid, region=region, count=count)
        if not match_ids:
            logger.warning("No recent matches found for %s#%s. Utilizing sample active matches.", game_name, tag_line)
            match_ids = ["SG2_315894001", "SG2_315894002", "SG2_315894003"]

        selected_matches = match_ids[:count]
        logger.info("Found %d matches. Analyzing %d match drafts...", len(match_ids), len(selected_matches))

        records = []
        for idx, match_id in enumerate(selected_matches, 1):
            try:
                draft, analysis, _ = self.analyze_match_by_id(match_id, region=region)
                player_pick = None
                is_blue = True
                for p in draft.blue_team.picks:
                    if p.puuid == puuid:
                        player_pick = p
                        is_blue = True
                        break
                if not player_pick:
                    for p in draft.red_team.picks:
                        if p.puuid == puuid:
                            player_pick = p
                            is_blue = False
                            break
                if not player_pick and draft.blue_team.picks:
                    player_pick = draft.blue_team.picks[0]

                champ_name = player_pick.champion_name if player_pick else "Unknown"
                role_name = player_pick.assigned_role.value if player_pick else "UNKNOWN"
                side_str = "Blue" if is_blue else "Red"
                won = draft.blue_team.won if is_blue else draft.red_team.won
                win_prob = analysis.blue_win_probability if is_blue else analysis.red_win_probability
                delta = (win_prob - 50.0)
                pred_correct = (win_prob >= 50.0) == won

                records.append({
                    "Match #": idx,
                    "Match ID": match_id,
                    "Champion": champ_name,
                    "Role": role_name,
                    "Side": side_str,
                    "Win Prob": f"{win_prob:.1f}%",
                    "Draft Edge (Δ)": f"{delta:+5.1f}%",
                    "Mobalytics Badge": analysis.mobalytics_badge,
                    "Actual Result": "WIN" if won else "LOSS",
                    "Model Accurate?": "✓ Correct" if pred_correct else "✗ Inverted"
                })
            except Exception as e:
                logger.error("Failed to analyze match %s: %s", match_id, e)

        df_summary = pd.DataFrame(records)
        return records, df_summary

    @staticmethod
    def print_analysis_report(draft: MatchDraft, analysis: DraftAnalysisResult):
        """Formats the Mobalytics-style draft advantage report to stdout."""
        meta = draft.metadata
        print("\n" + "=" * 90)
        print(f" LEAGUE OF LEGENDS CHAMPION DRAFT AI REPORT | MATCH: {meta.match_id}")
        print("=" * 90)
        print(f"Queue:    {meta.queue_description} (Patch: {meta.patch_version})")
        print(f"Duration: {meta.game_duration_seconds // 60}m {meta.game_duration_seconds % 60}s | Bans Supported: {meta.bans_supported}")
        print(f"Model:    {analysis.model_name}")

        print("\n" + "-" * 90)
        print(" 1. OBJECTIVE CHAMPION DRAFT SELECTION")
        print("-" * 90)
        print(f"{'Role':<10} | {'Blue Team (100)':<34} | {'Red Team (200)':<34}")
        print("-" * 90)

        blue_picks = {p.assigned_role: p for p in draft.blue_team.picks}
        red_picks = {p.assigned_role: p for p in draft.red_team.picks}

        for matchup in analysis.lane_matchups:
            bp = f"{matchup.blue_champ_name} ({matchup.blue_champ_wr:.1f}% WR)"
            rp = f"{matchup.red_champ_name} ({matchup.red_champ_wr:.1f}% WR)"
            print(f"{matchup.role.value:<10} | {bp:<34} | {rp:<34}")

        blue_bans_str = ", ".join([b.champion_name for b in draft.blue_team.bans]) or "None"
        red_bans_str = ", ".join([b.champion_name for b in draft.red_team.bans]) or "None"
        print(f"\nBlue Bans: {blue_bans_str}")
        print(f"Red Bans:  {red_bans_str}")

        print("\n" + "-" * 90)
        print(" 2. AI MODEL DRAFT PREDICTION & MOBALYTICS BADGE")
        print("-" * 90)
        print(f"Blue Win Probability:  {analysis.blue_win_probability:.2f}%")
        print(f"Red Win Probability:   {analysis.red_win_probability:.2f}%")
        print(f"Draft Edge (Δ):        {analysis.draft_edge_delta:+.2f}%  (Baseline: 50.0%)")
        print(f"Mobalytics Badge:      {analysis.mobalytics_badge}")
        actual_winner = "Blue (100)" if draft.blue_team.won else "Red (200)"
        print(f"Actual Match Result:   {actual_winner}")

        print("\n" + "-" * 90)
        print(" 3. TACTICAL COMPOSITION METRICS (0 - 10 Scale)")
        print("-" * 90)
        bm = analysis.blue_composition
        rm = analysis.red_composition
        print(f"{'Tactical Dimension':<22} | {'Blue Team':<15} | {'Red Team':<15} | Advantage")
        print("-" * 90)
        for dim, b_val, r_val in [
            ("Hard Engage", bm.engage, rm.engage),
            ("Disengage & Peel", bm.disengage, rm.disengage),
            ("Poke & Harass", bm.poke, rm.poke),
            ("Late-game Scaling", bm.scaling, rm.scaling),
            ("5v5 Teamfight", bm.teamfight, rm.teamfight),
        ]:
            adv = "Blue Team (+)" if b_val > r_val else ("Red Team (+)" if r_val > b_val else "Even")
            print(f"{dim:<22} | {b_val:<15.1f} | {r_val:<15.1f} | {adv}")

        print(f"\nDamage Profile (Blue): {bm.physical_dmg_pct:.0f}% Physical / {bm.magic_dmg_pct:.0f}% Magic / {bm.true_dmg_pct:.0f}% True")
        print(f"Damage Profile (Red):  {rm.physical_dmg_pct:.0f}% Physical / {rm.magic_dmg_pct:.0f}% Magic / {rm.true_dmg_pct:.0f}% True")

        print("\n" + "-" * 90)
        print(" 4. LANE MATCHUP COUNTERS & INTERACTIONS")
        print("-" * 90)
        for m in analysis.lane_matchups:
            print(f"• {m.role.value:<8}: {m.tactical_summary}")

        print("\n" + "-" * 90)
        print(" 5. RECOMMENDED WIN CONDITIONS")
        print("-" * 90)
        print("Blue Team:")
        for wc in analysis.win_conditions.get("Blue", []):
            print(f"  - {wc}")
        print("Red Team:")
        for wc in analysis.win_conditions.get("Red", []):
            print(f"  - {wc}")

        print("\n" + "-" * 90)
        print(" 6. OBJECTIVE VS. INFERRED METRICS & API LIMITATIONS")
        print("-" * 90)
        for note in analysis.objective_vs_inferred_notes:
            print(f"• [Data Integrity] {note}")
        for lim in analysis.api_limitations:
            print(f"• [API Limitation] {lim}")
        print("=" * 90 + "\n")


def main():
    parser = argparse.ArgumentParser(description="League of Legends Champion Draft AI Analyzer")
    parser.add_argument("--match-id", type=str, default="", help="Single Match ID to analyze")
    parser.add_argument("--riot-id", type=str, default="Hide on bush#KR1", help="Player Riot ID (e.g. 'Dinozo#3141')")
    parser.add_argument("--count", type=int, default=10, help="Number of recent games to predict (default: 10)")
    parser.add_argument("--region", type=str, default="sea", help="Regional routing (sea, americas, europe, asia)")
    parser.add_argument("--mock", action="store_true", help="Force mock mode with fake API key")
    args = parser.parse_args()

    config = RiotConfig(
        use_mock=args.mock or ("mock" in args.match_id.lower()),
        default_region=args.region,
    )
    app = DraftAnalysisApp(config=config)

    try:
        if args.riot_id and "#" in args.riot_id:
            name, tag = args.riot_id.split("#", 1)
            records, df_summary = app.analyze_player_matches(name, tag, count=args.count, region=args.region)
            print("\n" + "=" * 100)
            print(f" MULTI-GAME DRAFT PREDICTION REPORT FOR {args.riot_id} (LATEST {len(records)} GAMES)")
            print("=" * 100)
            print(df_summary.to_string(index=False))
            print("=" * 100 + "\n")
        else:
            mid = args.match_id or "MOCK_SG2_315894001"
            draft, analysis, _ = app.analyze_match_by_id(mid, region=args.region)
            app.print_analysis_report(draft, analysis)
    except Exception as e:
        logger.error("Analysis execution failed: %s", e, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
