# League Draft Predictor

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A calibrated machine learning pipeline and live Riot Games API (`MATCH-V5`) integration that predicts pre-game win probabilities directly from champion select draft compositions.

Trained on over 500,000 ranked matches, the model reconstructs 15 draft momentum signals (role allotments, archetype baseline rates, keystone synergies, and pick phase swings) through an isotonically calibrated random forest.

---

## Key Highlights

* **Zero-Leakage Training**: Multi-player group split (`GroupShuffleSplit` on `MatchFk`) ensuring all 10 players from a match stay together. All target encodings were calculated strictly within the training fold.
* **Isotonic Calibration**: Resolves random forest probability compression, aligning raw model outputs with empirical draft win rates (44% to 56%).
* **Baseline Rates vs. Pairwise Matchups**: Computes lane differentials using independent baseline win rates rather than head-to-head champion matchup histories. This prevents severe data sparsity across thousands of individual pairings while providing a stable macro baseline.
* **Live Riot API Ingestion**: Dynamically resolves Riot IDs via `ACCOUNT-V1`, ingests full pick, ban, and role payloads from `MATCH-V5`, and maps live patch metadata from Data Dragon.
* **Direct Role Allotments**: Reconstructed lane matchups so the model compares direct counterparts (Top vs. Top, Jungle vs. Jungle) rather than arbitrary lobby array indices.

---

## Quickstart

### 1. Install
```bash
git clone https://github.com/Enzozozozo/league-draft-predictor.git
cd league-draft-predictor
pip install -r requirements.txt
```

### 2. Run in Offline / Demo Mode (No API key needed)
```bash
python -m src.app
```

### 3. Run on Live Match History
Add your free key from [developer.riotgames.com](https://developer.riotgames.com/) to `.env`:
```bash
RIOT_API_KEY=RGAPI-your-key-here
python -m src.app --player "YourName#Tag" --region sea
```
*(Or explore `notebooks/02_live_riot_api_evaluation.ipynb` for the full 10-game batch analyzer).*

---

<details>
<summary><b>Engineering Deep-Dive: Group Leakage, Role Allotments, and Match Case Study (Click to expand)</b></summary>

<br>

### 1. The Multiplayer Group Leakage Trap
Standard random `train_test_split` causes massive leakage in 5v5 multiplayer games. If players from the same game end up split across train and test partitions, the model memorizes match outcomes rather than learning compositional patterns. Using `GroupShuffleSplit` on match IDs ensured strict zero-leakage holdout evaluation.

### 2. Role Allotments vs. Pick Order
In the raw database tables, columns labeled `B1` through `B5` and `R1` through `R5` were actually sorted by role allotments (Top, Jungle, Mid, Bot, Support) rather than chronological draft turn order. In the live API integration, selections are mapped strictly by `teamPosition` to ensure direct lane differentials are preserved.

### 3. Case Study: Why the Statistical Edge Failed (+6.5% Edge vs In-Game Outcome)
In one evaluated match, the model favored the red side by +6.5% because four out of five red champions had higher historical base win rates.

This highlights an intentional architectural trade-off: the model calculates lane differentials from independent historical win rates (`ally_win_rate - enemy_win_rate`) across all matches, rather than maintaining a sparse pairwise head-to-head matrix of Champion A directly against Champion B. Because champions are evaluated by general baseline strength in a vacuum, the model cannot account for direct tactical kit interactions:
* **Direct Counter**: The blue side mid laner had crowd control abilities that directly countered the red side jungler's engage.
* **Predator into Immobile Targets**: The blue side assassin jungler repeatedly punished the red side's immobile, undefensible marksman and support duo.
* **Reset Cleanups**: The blue side secondary assassin secured continuous resets whenever the red frontline was halted.
* **Conclusion**: Evaluating independent win rates provides a robust macro baseline (+/- 6%) without overfitting patch data, but specific head-to-head kit counters and mechanical execution dictate high-variance solo-queue outcomes.

</details>

---

## License
Distributed under the [MIT License](LICENSE).
