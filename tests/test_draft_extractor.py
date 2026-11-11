import unittest
from src.backend.draft_extractor import DraftExtractor
from src.backend.schemas import TeamSide, Role
from .sample_match import MOCK_MATCH_PAYLOAD


class TestDraftExtractor(unittest.TestCase):
    def setUp(self):
        self.raw_match = MOCK_MATCH_PAYLOAD
        self.extractor = DraftExtractor()
        self.draft = self.extractor.extract_draft(self.raw_match)

    def test_draft_structure(self):
        self.assertEqual(len(self.draft.blue_team.picks), 5)
        self.assertEqual(len(self.draft.red_team.picks), 5)
        self.assertEqual(len(self.draft.blue_team.bans), 5)
        self.assertEqual(len(self.draft.red_team.bans), 5)

    def test_objective_vs_inferred_distinction(self):
        self.assertTrue(len(self.draft.direct_api_fields) > 0)
        self.assertTrue(len(self.draft.inferred_fields) > 0)
        # Verify pick roles are marked as inferred
        for pick in self.draft.blue_team.picks:
            self.assertTrue(pick.role_is_inferred)
            self.assertIsInstance(pick.assigned_role, Role)

    def test_dataframe_conversion(self):
        df_picks = self.extractor.to_picks_dataframe(self.draft)
        self.assertEqual(len(df_picks), 10)
        self.assertIn("champion_name", df_picks.columns)
        self.assertIn("role", df_picks.columns)
        self.assertIn("team_side", df_picks.columns)

        df_bans = self.extractor.to_bans_dataframe(self.draft)
        self.assertEqual(len(df_bans), 10)
        self.assertIn("pick_turn", df_bans.columns)

        df_summary = self.extractor.to_team_summary_dataframe(self.draft)
        self.assertEqual(len(df_summary), 1)


if __name__ == "__main__":
    unittest.main()
