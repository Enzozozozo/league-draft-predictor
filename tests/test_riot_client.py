import unittest
from src.config import RiotConfig, get_regional_route
from src.riot_client import RiotClient, RateLimiter


class TestRiotClient(unittest.TestCase):
    def setUp(self):
        # Configure with a fake development key
        self.config = RiotConfig(
            api_key="RGAPI-MOCK-DEV-KEY-0000-000000000000",
            default_platform="sg2",
            default_region="sea",
            use_mock=True,
        )
        self.client = RiotClient(self.config)

    def test_regional_routing(self):
        self.assertEqual(get_regional_route("sg2"), "sea")
        self.assertEqual(get_regional_route("na1"), "americas")
        self.assertEqual(get_regional_route("kr"), "asia")
        self.assertEqual(get_regional_route("euw1"), "europe")

    def test_mock_account_lookup(self):
        account = self.client.get_account_by_riot_id("Faker", "T1")
        self.assertIn("puuid", account)
        self.assertEqual(account["gameName"], "Faker")
        self.assertEqual(account["tagLine"], "T1")

    def test_mock_match_ids(self):
        match_ids = self.client.get_match_ids_by_puuid("mock-puuid-123", count=5)
        self.assertEqual(len(match_ids), 5)
        self.assertTrue(all(mid.startswith("SG2_") for mid in match_ids))

    def test_mock_match_details(self):
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
