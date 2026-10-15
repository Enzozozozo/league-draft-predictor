# League Draft Predictor

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A calibrated machine learning pipeline and live Riot Games API (`MATCH-V5`) integration that predicts pre-game win probabilities directly from champion select draft compositions.

Trained on over 500,000 ranked matches, the model reconstructs 15 draft momentum signals (role allotments, archetype baseline rates, keystone synergies, and pick phase swings) through an isotonically calibrated random forest.

---

### Sample Output (Batch Evaluation on Live Match History)

| Match ID | Player Archetype (Role) | Side | Win Prob | Draft Edge (Δ) | Draft Tier | Actual Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SG2_178116877` | Frontline Disrupter (Support) | Blue | **54.2%** | `+4.2%` | `Heavy Advantage` | **WIN** |
| `SG2_168486597` | Frontline Disrupter (Support) | Blue | **47.1%** | `-2.9%` | `Slight Disadvantage` | **LOSS** |
| `SG2_168483294` | Channeled Tank (Jungle) | Red | **56.5%** | `+6.5%` | `Heavy Advantage` | **LOSS** |
| `SG2_168470680` | Channeled Tank (Jungle) | Red | **58.8%** | `+8.8%` | `Heavy Advantage` | **LOSS** |

---

## Key Highlights

* **Zero-Leakage Training**: Multi-player group split (`GroupShuffleSplit` on `MatchFk`) ensuring all 10 players from a match stay together. All target encodings were calculated strictly within the training fold.
* **Isotonic Calibration**: Resolves random forest probability compression, aligning raw model outputs with empirical draft win rates (44% to 56%).
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

However, flat statistical win rates cannot capture direct tactical kit counters:
* **Targeted Hard CC**: The blue side mid laner had point-and-click stuns that repeatedly canceled the red jungler's channeled movement and ultimate abilities.
* **Predator into Immobile Targets**: The blue stealth assassin jungler repeatedly punished the red side's immobile, low-peel marksman and support duo.
* **Reset Cleanups**: The blue side secondary assassin secured continuous resets whenever the red frontline was halted.
* **Conclusion**: Statistical draft advantage provides a measurable macro baseline (+/- 6%), but hard archetype counters and mechanical execution dictate high-variance solo-queue outcomes.

</details>

---

## License
Distributed under the [MIT License](LICENSE).
