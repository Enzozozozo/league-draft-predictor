import unittest
from unittest.mock import patch, MagicMock
from src.backend.config import RiotConfig, get_regional_route
from src.backend.riot_client import RiotClient, RateLimiter
from .sample_match import MOCK_MATCH_PAYLOAD


class TestRiotClient(unittest.TestCase):
    def setUp(self):
        self.config = RiotConfig(
            api_key="RGAPI-TEST-DEV-KEY-0000-000000000000",
            default_platform="sg2",
            default_region="sea",
        )
        self.client = RiotClient(self.config)

    def test_regional_routing(self):
        self.assertEqual(get_regional_route("sg2"), "sea")
        self.assertEqual(get_regional_route("na1"), "americas")
        self.assertEqual(get_regional_route("kr"), "asia")
        self.assertEqual(get_regional_route("euw1"), "europe")

    @patch("requests.get")
    def test_mock_account_lookup(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "puuid": "mock-puuid-123",
            "gameName": "Faker",
            "tagLine": "T1",
        }
        mock_get.return_value = mock_resp

        account = self.client.get_account_by_riot_id("Faker", "T1")
        self.assertIn("puuid", account)
        self.assertEqual(account["gameName"], "Faker")
        self.assertEqual(account["tagLine"], "T1")

    @patch("requests.get")
    def test_mock_match_ids(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = [f"SG2_31589400{i}" for i in range(1, 6)]
        mock_get.return_value = mock_resp

        match_ids = self.client.get_match_ids_by_puuid("mock-puuid-123", count=5)
        self.assertEqual(len(match_ids), 5)
        self.assertTrue(all(mid.startswith("SG2_") for mid in match_ids))

    @patch("requests.get")
    def test_mock_match_details(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = MOCK_MATCH_PAYLOAD
        mock_get.return_value = mock_resp

        match_data = self.client.get_match_by_id("SG2_315894001")
        self.assertIn("info", match_data)
        self.assertIn("metadata", match_data)
        info = match_data["info"]
        self.assertEqual(len(info["participants"]), 10)
        self.assertEqual(len(info["teams"]), 2)

    def test_rate_limiter(self):
        limiter = RateLimiter(short_limit=5, long_limit=10)
        for _ in range(3):
            limiter.wait_if_needed()
        self.assertEqual(len(limiter.short_history), 3)


if __name__ == "__main__":
    unittest.main()
