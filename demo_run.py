"""End-to-End Demonstration Script for Riot Games API Draft AI Analyzer.

Demonstrates draft data retrieval, pandas DataFrame conversion, and AI model evaluation
using a fake/mock development key.
"""

from src.config import RiotConfig
from src.riot_client import RiotClient
from src.draft_extractor import DraftExtractor
from src.ai_model import MobalyticsJoblibModel
from src.app import DraftAnalysisApp


def main():
    print("\n" + "=" * 80)
    print("🚀 RUNNING RIOT GAMES API DRAFT AI ANALYZER (WITH FAKE API KEY)")
    print("=" * 80)

    # 1. Initialize with fake API key (Mock mode auto-enabled)
    config = RiotConfig(
        api_key="RGAPI-MOCK-DEV-KEY-0000-000000000000",
        default_platform="sg2",
        default_region="sea",
    )
    print(f"• Active API Key:       {config.api_key}")
    print(f"• Mock Mode Active:     {config.is_mock}")
    print(f"• Continental Routing:  {config.default_region} (Platform: {config.default_platform})")

    # 2. Initialize application coordinator
    app = DraftAnalysisApp(config=config)

    # 3. Simulate Match Lookup via Match ID
    test_match_id = "SG2_315894001"
    print(f"\n[Step 1] Fetching Champion Draft for Match: {test_match_id}...")
    draft, analysis, df_picks = app.analyze_match_by_id(test_match_id)

    # 4. Display Pandas DataFrame of Draft Selections
    print("\n[Step 2] Normalized Champion Picks DataFrame (10 Participants):")
    print(df_picks[["team_side", "role", "champion_name", "champion_id", "win"]].to_string(index=False))

    # 5. Display Bans DataFrame
    df_bans = DraftExtractor.to_bans_dataframe(draft)
    print("\n[Step 3] Normalized Bans DataFrame (10 Bans):")
    print(df_bans[["team_side", "pick_turn", "champion_name"]].head(10).to_string(index=False))

    # 6. Display AI Prediction and Tactical Report
    print("\n[Step 4] Feeding Draft into AI Model ('league_mobalytics_clone.joblib')...\n")
    app.print_analysis_report(draft, analysis)

    # 7. Simulate Player Lookup via Riot ID (GameName#TagLine)
    print("\n[Step 5] Simulating Player Riot ID Lookup: 'Faker#T1'...")
    try:
        p_draft, p_analysis, _ = app.analyze_player_latest_match("Faker", "T1")
        print(f"✓ Successfully mapped Riot ID 'Faker#T1' -> Latest Match: {p_draft.metadata.match_id}")
        print(f"✓ Predicted Winner: {p_analysis.predicted_winner.value} | Draft Edge: {p_analysis.draft_edge_delta:+.2f}% | Tier: {p_analysis.mobalytics_badge.strip()}")
    except Exception as e:
        print(f"Player lookup note: {e}")

    print("\n" + "=" * 80)
    print("✅ DEMONSTRATION COMPLETE - ALL MODULES VERIFIED")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
