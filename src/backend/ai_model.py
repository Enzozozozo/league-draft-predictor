"""AI Model Integration Module for League of Legends Champion Draft Analysis.

Implements:
1. `DraftModelInterface`: Abstract interface allowing model swaps without touching Riot API integration.
2. `MobalyticsJoblibModel`: Production implementation loading `league_mobalytics_clone.joblib`.
   Reconstructs the 15 pre-game features, runs the calibrated random forest,
   and computes the Mobalytics Draft Edge (Δ) & Tier Badges.
3. Tactical analysis for engage, disengage, poke, scaling, teamfights, lane counters, and win conditions.
"""

import sys
import os
import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from itertools import combinations

import numpy as np
import pandas as pd

from .schemas import (
    MatchDraft,
    DraftAnalysisResult,
    CompositionMetrics,
    LaneMatchupAnalysis,
    TeamSide,
    Role,
)
from .champion_data import get_champion_profile, get_champion_name
from .config import get_model_path

logger = logging.getLogger("AIModel")


# =============================================================================
# Helper Class: MonotonicCalibratedForest
# Needed to unpickle the user's custom wrapper class saved in the notebook
# =============================================================================
class MonotonicCalibratedForest:
    """Production wrapper saved in league_mobalytics_clone.joblib."""
    def __init__(self, base_model, calibrator):
        self.base_model = base_model
        self.calibrator = calibrator
        self.feature_importances_ = getattr(base_model, "feature_importances_", None)

    def predict_proba(self, X):
        proba = self.base_model.predict_proba(X)
        if proba.ndim == 2 and proba.shape[1] >= 2:
            row_sums = proba.sum(axis=1, keepdims=True)
            if np.any(row_sums > 1.01):
                proba = proba / np.maximum(row_sums, 1e-9)
            raw_p = proba[:, 1]
        elif proba.ndim == 2:
            raw_p = proba[:, 1]
        else:
            raw_p = proba
        if self.calibrator is not None:
            cal_p = np.clip(self.calibrator.transform(raw_p), 0.01, 0.99)
            return np.column_stack([1 - cal_p, cal_p])
        return np.column_stack([1 - raw_p, raw_p]) if proba.ndim == 1 or proba.shape[1] == 1 else proba

    def predict(self, X):
        return (self.predict_proba(X)[:, 1] >= 0.50).astype(int)


# Inject into __main__ so joblib/pickle unpickler resolves it seamlessly
import __main__
__main__.MonotonicCalibratedForest = MonotonicCalibratedForest


# =============================================================================
# Abstract Model Interface
# =============================================================================
class DraftModelInterface(ABC):
    """Abstract interface defining contract for any League draft prediction model."""

    @abstractmethod
    def predict_draft(self, draft: MatchDraft) -> DraftAnalysisResult:
        """Analyze a match draft and return complete analytical predictions."""
        pass

    @abstractmethod
    def get_model_name(self) -> str:
        """Return the identifier of the active model."""
        pass


# =============================================================================
# Concrete Implementation: Mobalytics Joblib Model
# =============================================================================
class MobalyticsJoblibModel(DraftModelInterface):
    """Integrates the trained `league_mobalytics_clone.joblib` pipeline artifact."""

    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = model_path or get_model_path()
        self.pipeline: Optional[Dict[str, Any]] = None
        self.model = None
        self.imputer = None
        self.feature_names: List[str] = []
        self.champ_wr_dict: Dict[int, float] = {}
        self.synergy_dict: Dict[Tuple[int, int], float] = {}
        self.keystone_wr_dict: Dict[int, float] = {}
        self.spell1_wr_dict: Dict[int, float] = {}
        self.spell2_wr_dict: Dict[int, float] = {}
        self.champ_classes: Dict[int, Any] = {}
        self.champ_mastery_elasticity: Dict[int, float] = {}
        self.optimal_threshold: float = 0.50
        self.is_loaded = False

        self._load_pipeline()

    def _load_pipeline(self):
        """Attempts to load the joblib production bundle."""
        if not self.model_path.exists():
            logger.warning("Model file not found at %s. Running in fallback heuristic mode.", self.model_path)
            return

        try:
            import joblib
            logger.info("Loading production pipeline: %s", self.model_path)
            self.pipeline = joblib.load(str(self.model_path))

            if isinstance(self.pipeline, dict):
                self.model = self.pipeline.get("model")
                self.imputer = self.pipeline.get("imputer")
                self.feature_names = self.pipeline.get("feature_names", [])
                self.champ_wr_dict = self.pipeline.get("champ_wr_dict", {})
                self.synergy_dict = self.pipeline.get("synergy_dict", {})
                self.keystone_wr_dict = self.pipeline.get("keystone_wr_dict", {})
                self.spell1_wr_dict = self.pipeline.get("spell1_wr_dict", {})
                self.spell2_wr_dict = self.pipeline.get("spell2_wr_dict", {})
                self.champ_classes = self.pipeline.get("champ_classes", {})
                self.champ_mastery_elasticity = self.pipeline.get("champ_mastery_elasticity", {})
                self.optimal_threshold = self.pipeline.get("optimal_threshold", 0.50)
                self.is_loaded = True
                logger.info(
                    "Pipeline loaded successfully! Feature count: %d, Champions: %d",
                    len(self.feature_names),
                    len(self.champ_wr_dict),
                )
            else:
                self.model = self.pipeline
                self.is_loaded = True

            # Backward-compatibility: scikit-learn 1.4+ added monotonic_cst to DecisionTreeClassifier
            base_rf = getattr(self.model, "base_model", self.model)
            if hasattr(base_rf, "estimators_"):
                for est in base_rf.estimators_:
                    if not hasattr(est, "monotonic_cst"):
                        est.monotonic_cst = None
        except Exception as e:
            logger.error("Failed to load model from %s: %s", self.model_path, e)
            self.is_loaded = False

    def get_model_name(self) -> str:
        return "league_draft_iter1 (Calibrated Random Forest - 11 Orthogonal Features)"

    # -------------------------------------------------------------------------
    # Feature Construction (Reproducing compute_draft_features from training)
    # -------------------------------------------------------------------------
    def build_feature_vector(self, draft: MatchDraft, player_side: TeamSide = TeamSide.BLUE) -> pd.DataFrame:
        """Converts the draft into the 11 orthogonal features from leagueguessing_v2.

        Features:
        1. team_adv: Tanh-saturated 5v5 draft advantage, with pilot mastery conditioning.
        2. team_synergy_delta: Vectorized net 10-pair Wilson score combo lift.
        3. elastic_mastery: Pilot log-mastery weighted by empirical champion elasticity.
        4. keystone_wr: Historical viability of the pilot's primary keystone rune.
        5. is_blue: Map side indicator (1 = Blue, 0 = Red).
        6-11. Net class archetype deltas (delta_tanks, delta_assassins, delta_mages,
              delta_marksmans, delta_supports, delta_fighters).
        """
        is_blue = (player_side == TeamSide.BLUE)

        # Champion IDs for Blue (B1..B5) and Red (R1..R5)
        blue_cids = draft.blue_team.champion_ids
        red_cids = draft.red_team.champion_ids

        while len(blue_cids) < 5:
            blue_cids.append(1)
        while len(red_cids) < 5:
            red_cids.append(1)

        def get_cwr(cid: int) -> float:
            return self.champ_wr_dict.get(cid, 0.50)

        # 1. 5v5 Team Overall Baseline Win Rates
        blue_total_wr = np.mean([get_cwr(c) for c in blue_cids[:5]])
        red_total_wr = np.mean([get_cwr(c) for c in red_cids[:5]])
        raw_team_adv = blue_total_wr - red_total_wr
        team_adv = raw_team_adv if is_blue else -raw_team_adv

        # 2. Pilot Mastery Conditioning on team_adv
        primary_picks = draft.blue_team.picks if is_blue else draft.red_team.picks
        pilot_cid = primary_picks[0].champion_id if primary_picks else (blue_cids[2] if is_blue else red_cids[2])
        pilot_mastery = getattr(primary_picks[0], "mastery_points", 50000.0) if primary_picks else 50000.0

        log_pts = np.log1p(pilot_mastery)
        mastery_tier = 1.0 / (1.0 + np.exp(-(log_pts - np.log1p(25000.0)) / 2.0))
        mastery_dev = mastery_tier - 0.5
        elasticity = self.champ_mastery_elasticity.get(pilot_cid, 0.05)
        pilot_wr_delta = (mastery_dev * elasticity) / 5.0
        persp_adv_conditioned = team_adv + pilot_wr_delta
        team_adv_saturated = float(np.tanh(10.0 * persp_adv_conditioned))

        # 3. Vectorized 10-Pair Synergy Delta (Wilson Score Lift)
        b_combos = list(combinations(blue_cids[:5], 2))
        r_combos = list(combinations(red_cids[:5], 2))
        blue_syn = sum(self.synergy_dict.get((min(int(a), int(b)), max(int(a), int(b))), 0.0) for a, b in b_combos)
        red_syn = sum(self.synergy_dict.get((min(int(a), int(b)), max(int(a), int(b))), 0.0) for a, b in r_combos)
        raw_synergy_delta = blue_syn - red_syn
        team_synergy_delta = raw_synergy_delta if is_blue else -raw_synergy_delta

        # 4. Pilot Elastic Mastery & Keystone Viability
        elastic_mastery = log_pts * elasticity
        keystone_wr = 0.50
        if primary_picks:
            sample_pick = primary_picks[0]
            keystone_wr = self.keystone_wr_dict.get(sample_pick.primary_keystone_id, 0.50)

        # 5. Net Class Archetype Deltas
        archetype_classes = ["Tank", "Assassin", "Mage", "Marksman", "Support", "Fighter"]
        archetype_deltas = {}
        for cls in archetype_classes:
            b_cnt = sum(1 if cls in self.champ_classes.get(c, set()) else 0 for c in blue_cids[:5])
            r_cnt = sum(1 if cls in self.champ_classes.get(c, set()) else 0 for c in red_cids[:5])
            delta_cnt = (b_cnt - r_cnt) if is_blue else (r_cnt - b_cnt)
            archetype_deltas[f"delta_{cls.lower()}s"] = delta_cnt

        features = {
            "team_adv": team_adv_saturated,
            "team_synergy_delta": team_synergy_delta,
            "elastic_mastery": elastic_mastery,
            "keystone_wr": keystone_wr,
            "is_blue": int(is_blue),
            **archetype_deltas,
        }

        ordered_cols = self.feature_names or list(features.keys())
        return pd.DataFrame([features])[ordered_cols]

    # -------------------------------------------------------------------------
    # Mobalytics Delta & Badge
    # -------------------------------------------------------------------------
    @staticmethod
    def get_mobalytics_badge(prob: float) -> Tuple[float, str]:
        """Calculates Draft Edge (Δ) and Mobalytics Tier Badge."""
        delta = (prob - 0.50) * 100.0
        if delta >= 4.0:
            badge = "[Heavy Advantage]"
        elif delta >= 1.5:
            badge = "[Slight Advantage]"
        elif delta <= -4.0:
            badge = "[Heavy Disadvantage]"
        elif delta <= -1.5:
            badge = "[Slight Disadvantage]"
        else:
            badge = "[Even / Skill Match]"
        return delta, badge

    # -------------------------------------------------------------------------
    # Composition Metrics: Engage, Disengage, Poke, Scaling, Teamfight
    # -------------------------------------------------------------------------
    @staticmethod
    def compute_composition_metrics(picks: List[Any]) -> CompositionMetrics:
        """Aggregates tactical scores across all 5 champions."""
        if not picks:
            return CompositionMetrics(5.0, 5.0, 5.0, 5.0, 5.0, 50.0, 45.0, 5.0)

        profiles = [get_champion_profile(p.champion_id) for p in picks]
        engage = float(np.mean([p["engage"] for p in profiles]))
        disengage = float(np.mean([p["disengage"] for p in profiles]))
        poke = float(np.mean([p["poke"] for p in profiles]))
        scaling = float(np.mean([p["scaling"] for p in profiles]))
        teamfight = float(np.mean([p["teamfight"] for p in profiles]))

        total_ad = sum(p["ad"] for p in profiles)
        total_ap = sum(p["ap"] for p in profiles)
        tot = max(total_ad + total_ap, 1e-6)

        ad_pct = round((total_ad / tot) * 100.0, 1)
        ap_pct = round(100.0 - ad_pct, 1)
        true_pct = 0.0

        return CompositionMetrics(
            engage=round(engage, 1),
            disengage=round(disengage, 1),
            poke=round(poke, 1),
            scaling=round(scaling, 1),
            teamfight=round(teamfight, 1),
            physical_dmg_pct=ad_pct,
            magic_dmg_pct=ap_pct,
            true_dmg_pct=true_pct,
        )

    # -------------------------------------------------------------------------
    # Lane Matchup Breakdown
    # -------------------------------------------------------------------------
    def analyze_lane_matchups(self, draft: MatchDraft) -> List[LaneMatchupAnalysis]:
        """Pairs Blue and Red champions by role and compares interactions."""
        roles_order = [Role.TOP, Role.JUNGLE, Role.MIDDLE, Role.BOTTOM, Role.UTILITY]
        matchups: List[LaneMatchupAnalysis] = []

        blue_role_map = {p.assigned_role: p for p in draft.blue_team.picks}
        red_role_map = {p.assigned_role: p for p in draft.red_team.picks}

        for idx, role in enumerate(roles_order):
            bp = blue_role_map.get(role) or (draft.blue_team.picks[idx] if idx < len(draft.blue_team.picks) else None)
            rp = red_role_map.get(role) or (draft.red_team.picks[idx] if idx < len(draft.red_team.picks) else None)

            if not bp or not rp:
                continue

            b_wr = self.champ_wr_dict.get(bp.champion_id, 0.50)
            r_wr = self.champ_wr_dict.get(rp.champion_id, 0.50)
            diff = (b_wr - r_wr) * 100.0

            edge_side = TeamSide.BLUE if diff >= 0 else TeamSide.RED
            summary = self._generate_lane_tactical_summary(role, bp.champion_name, rp.champion_name, diff)

            matchups.append(
                LaneMatchupAnalysis(
                    role=role,
                    blue_champ_name=bp.champion_name,
                    blue_champ_id=bp.champion_id,
                    blue_champ_wr=round(b_wr * 100, 2),
                    red_champ_name=rp.champion_name,
                    red_champ_id=rp.champion_id,
                    red_champ_wr=round(r_wr * 100, 2),
                    edge_side=edge_side,
                    lane_differential=round(abs(diff), 2),
                    tactical_summary=summary,
                )
            )

        return matchups

    @staticmethod
    def _generate_lane_tactical_summary(role: Role, blue_c: str, red_c: str, diff: float) -> str:
        favored = blue_c if diff > 0 else red_c
        abs_diff = abs(diff)
        if abs_diff >= 3.0:
            return f"{favored} has a strong {role.value} lane counter advantage (+{abs_diff:.1f}% baseline edge)."
        elif abs_diff >= 1.0:
            return f"Slight lane pacing lean towards {favored} (+{abs_diff:.1f}%)."
        else:
            return f"Skill matchup in {role.value}; lane outcome depends primarily on jungle intervention."

    # -------------------------------------------------------------------------
    # Win Conditions & Strategic Advice
    # -------------------------------------------------------------------------
    @staticmethod
    def derive_win_conditions(blue_m: CompositionMetrics, red_m: CompositionMetrics) -> Dict[str, List[str]]:
        blue_wc = []
        red_wc = []

        if blue_m.engage > red_m.disengage:
            blue_wc.append("Hard engage advantage: Group around Dragon/Baron and force decisive 5v5 initiations.")
        else:
            blue_wc.append("Enemy has sufficient disengage: Avoid blind group charges; play for pickoffs or lane splits.")

        if blue_m.scaling > red_m.scaling:
            blue_wc.append("Late game scaling edge: Neutralize early lane tempo and stall into high-impact item spikes.")
        else:
            blue_wc.append("Scaling deficit: Must establish early lane priority and close game out before 30 minutes.")

        if red_m.poke > blue_m.disengage:
            red_wc.append("Poke & Siege superiority: Control objective choke points early and whittle enemies down before contesting.")
        else:
            red_wc.append("Teamfight execution: Coordinate layered crowd control onto primary backline targets.")

        if red_m.physical_dmg_pct > 80.0:
            blue_wc.append("Defensive itemization: Stack early Armor (Tabis/Frozen Heart) to counter heavy AD red draft.")
        if blue_m.physical_dmg_pct > 80.0:
            red_wc.append("Defensive itemization: Stack early Armor to exploit all-AD blue draft.")

        return {"Blue": blue_wc, "Red": red_wc}

    # -------------------------------------------------------------------------
    # Main Prediction Pipeline
    # -------------------------------------------------------------------------
    def predict_draft(self, draft: MatchDraft) -> DraftAnalysisResult:
        """Processes draft data through the ML model and tactical rules."""
        # 1. Feature Vector
        X_blue = self.build_feature_vector(draft, player_side=TeamSide.BLUE)

        # 2. Model Prediction
        if self.is_loaded and self.model is not None:
            if self.imputer is not None:
                X_arr = self.imputer.transform(X_blue)
            else:
                X_arr = X_blue.values
            blue_prob = float(self.model.predict_proba(X_arr)[:, 1][0])
        else:
            # Calibrated heuristic fallback using team base win rates & tactical advantages
            b_wr = np.mean([self.champ_wr_dict.get(c, 0.50) for c in draft.blue_team.champion_ids])
            r_wr = np.mean([self.champ_wr_dict.get(c, 0.50) for c in draft.red_team.champion_ids])
            blue_prob = float(np.clip(0.50 + (b_wr - r_wr) * 1.5, 0.35, 0.65))

        red_prob = 1.0 - blue_prob
        delta, badge = self.get_mobalytics_badge(blue_prob)
        predicted_winner = TeamSide.BLUE if blue_prob >= 0.50 else TeamSide.RED

        # 3. Composition Metrics
        blue_comp = self.compute_composition_metrics(draft.blue_team.picks)
        red_comp = self.compute_composition_metrics(draft.red_team.picks)

        # 4. Lane Matchups
        lane_matchups = self.analyze_lane_matchups(draft)

        # 5. Win Conditions
        win_conditions = self.derive_win_conditions(blue_comp, red_comp)

        objective_notes = [
            "Match outcome (Win/Loss), champion selections, bans, and summoner spells are 100% objective API data.",
            "Lane roles (teamPosition) are derived by Riot's post-match positioning heuristic.",
            f"Draft Edge (Δ: {delta:+.2f}%) and Win Probability ({blue_prob*100:.1f}%) are analytical predictions produced by the AI model.",
        ]

        limitations = [
            "Match-v5 returns participants indexed 1..10, not the chronological pick order (e.g. B1 -> R1/R2 -> B2/B3).",
            "Champion bans are unavailable for Blind Pick (Queue 430) and ARAM (Queue 450).",
            "In-game execution, player tilt, and mechanics can override draft advantages (a +5% edge translates to ~55% Solo Queue win rate).",
        ]

        return DraftAnalysisResult(
            match_id=draft.metadata.match_id,
            predicted_winner=predicted_winner,
            blue_win_probability=round(blue_prob * 100.0, 2),
            red_win_probability=round(red_prob * 100.0, 2),
            draft_edge_delta=round(delta, 2),
            mobalytics_badge=badge,
            blue_composition=blue_comp,
            red_composition=red_comp,
            lane_matchups=lane_matchups,
            team_synergies={
                "blue_teamfight_score": blue_comp.teamfight,
                "red_teamfight_score": red_comp.teamfight,
                "blue_scaling_score": blue_comp.scaling,
                "red_scaling_score": red_comp.scaling,
            },
            win_conditions=win_conditions,
            model_name=self.get_model_name(),
            objective_vs_inferred_notes=objective_notes,
            api_limitations=limitations,
        )
