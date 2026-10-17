import unittest
from src.backend.riot_client import RiotClient
from src.backend.draft_extractor import DraftExtractor
from src.backend.ai_model import MobalyticsJoblibModel, DraftModelInterface
from src.backend.schemas import TeamSide, DraftAnalysisResult


class TestAIModel(unittest.TestCase):
    def setUp(self):
        self.client = RiotClient()
        self.raw_match = self.client.get_match_by_id("SG2_315894001")
        self.draft = DraftExtractor.extract_draft(self.raw_match)
        self.model = MobalyticsJoblibModel()

    def test_model_interface(self):
        self.assertIsInstance(self.model, DraftModelInterface)
        self.assertTrue(len(self.model.get_model_name()) > 0)

    def test_feature_vector_generation(self):
        df_feat = self.model.build_feature_vector(self.draft, player_side=TeamSide.BLUE)
        self.assertEqual(len(df_feat), 1)
        expected_features = [
            "champ_adv", "my_champ_wr", "team_adv", "my_team_wr", "enemy_team_wr",
            "adv_p1", "adv_p2", "adv_p3", "draft_momentum", "total_synergy",
            "log_mastery", "mastery_champ_synergy", "spell_synergy", "keystone_wr", "is_blue"
        ]
        for f in expected_features:
            self.assertIn(f, df_feat.columns)

    def test_predict_draft(self):
        result = self.model.predict_draft(self.draft)
        self.assertIsInstance(result, DraftAnalysisResult)
        self.assertGreaterEqual(result.blue_win_probability, 0.0)
        self.assertLessEqual(result.blue_win_probability, 100.0)
        self.assertAlmostEqual(result.blue_win_probability + result.red_win_probability, 100.0, places=1)
        self.assertIn(result.predicted_winner, [TeamSide.BLUE, TeamSide.RED])
        self.assertTrue(len(result.mobalytics_badge) > 0)

    def test_tactical_composition_metrics(self):
        result = self.model.predict_draft(self.draft)
        bm = result.blue_composition
        rm = result.red_composition
        for metric in (bm.engage, bm.disengage, bm.poke, bm.scaling, bm.teamfight):
            self.assertTrue(0.0 <= metric <= 10.0)
        self.assertAlmostEqual(bm.physical_dmg_pct + bm.magic_dmg_pct + bm.true_dmg_pct, 100.0, places=0)

    def test_lane_matchups(self):
        result = self.model.predict_draft(self.draft)
        self.assertGreaterEqual(len(result.lane_matchups), 5)
        for lm in result.lane_matchups:
            self.assertTrue(len(lm.blue_champ_name) > 0)
            self.assertTrue(len(lm.red_champ_name) > 0)
            self.assertTrue(len(lm.tactical_summary) > 0)


if __name__ == "__main__":
    unittest.main()
