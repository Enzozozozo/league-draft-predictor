import sys, os
sys.path.insert(0, os.path.abspath("."))
from src.backend.ai_model import MobalyticsJoblibModel
from src.backend.schemas import MatchDraft, MatchDraftMetadata, TeamDraft, DraftPick, TeamSide, Role

model = MobalyticsJoblibModel()

def build_test_draft(blue_cids, red_cids):
    b_picks = [DraftPick(team_id=100, team_side=TeamSide.BLUE, participant_id=i+1, puuid='', riot_id='', champion_id=cid, champion_name='', assigned_role=Role.TOP, champion_mastery_points=50000) for i, cid in enumerate(blue_cids)]
    r_picks = [DraftPick(team_id=200, team_side=TeamSide.RED, participant_id=i+6, puuid='', riot_id='', champion_id=cid, champion_name='', assigned_role=Role.TOP, champion_mastery_points=50000) for i, cid in enumerate(red_cids)]
    meta = MatchDraftMetadata(match_id='test', game_mode='CLASSIC', queue_id=420, queue_description='Ranked Solo', patch_version='14.10', game_duration_seconds=1800, bans_supported=True)
    return MatchDraft(
        metadata=meta,
        blue_team=TeamDraft(team_id=100, team_side=TeamSide.BLUE, won=False, picks=b_picks),
        red_team=TeamDraft(team_id=200, team_side=TeamSide.RED, won=False, picks=r_picks)
    )

# 1. Malphite vs Sylas Top
d_sylas = build_test_draft([54, 254, 103, 222, 111], [517, 254, 103, 222, 111])
# 2. Malphite vs Jax Top
d_jax   = build_test_draft([54, 254, 103, 222, 111], [24, 254, 103, 222, 111])
# 3. Troll Comp: Blue has Fiddlesticks Top, full squishy vs solid Red comp
d_troll = build_test_draft([9, 245, 127, 222, 497], [54, 164, 8, 21, 412])

res_sylas = model.predict_draft(d_sylas)
res_jax = model.predict_draft(d_jax)
res_troll = model.predict_draft(d_troll)

print("\n=== LIVE INFERENCE TEST RESULTS ===")
print(f"Malphite vs Sylas Top: Blue WR = {res_sylas.blue_win_probability*100:.2f}% | Edge = {res_sylas.draft_edge_delta:+.2f}% | Tier: {res_sylas.mobalytics_badge}")
print(f"Malphite vs Jax Top:   Blue WR = {res_jax.blue_win_probability*100:.2f}% | Edge = {res_jax.draft_edge_delta:+.2f}% | Tier: {res_jax.mobalytics_badge}")
print(f"Net Counterpick Swing: {(res_jax.blue_win_probability - res_sylas.blue_win_probability)*100:+.2f}%")
print(f"Troll/Squishy Draft:   Blue WR = {res_troll.blue_win_probability*100:.2f}% | Edge = {res_troll.draft_edge_delta:+.2f}% | Tier: {res_troll.mobalytics_badge}")
