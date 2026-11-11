"""
Update script for C:/Users/tayen/OneDrive - Singapore Polytechnic/Code/Projects/leagueguessing_v2.ipynb
"""
import json
import os
import shutil

nb_path = "C:/Users/tayen/OneDrive - Singapore Polytechnic/Code/Projects/leagueguessing_v2.ipynb"
nb = json.load(open(nb_path, encoding="utf-8"))

# 1. Update Cell 4: Add Role-Specific Win Rates, Counterpick Residuals, and Damage Ratios
cell4_code = '''# =============================================================================
# 4. Training-Derived Priors, Class Archetypes & Play-Rate Adjusted Win Rates
# =============================================================================
# 1. Fetch Riot Data Dragon Champion Metadata Directly from Public CDN
DDRAGON_PATH = "champion.json"
champ_classes = {}
champ_difficulties = {}
champ_magic_ratio = {}
champ_attack_ratio = {}

try:
    with urllib.request.urlopen("https://ddragon.leagueoflegends.com/api/versions.json", timeout=5) as resp:
        latest_version = json.loads(resp.read().decode())[0]
    cdn_url = f"https://ddragon.leagueoflegends.com/cdn/{latest_version}/data/en_US/champion.json"
    print(f"Fetching official Riot Data Dragon metadata (v{latest_version}) from CDN...")
    with urllib.request.urlopen(cdn_url, timeout=5) as resp:
        ddragon_data = json.loads(resp.read().decode())
    with open(DDRAGON_PATH, "w", encoding="utf-8") as f:
        json.dump(ddragon_data, f)
    for champ_name, c_info in ddragon_data["data"].items():
        cid = int(c_info["key"])
        champ_classes[cid] = set(c_info.get("tags", []))
        champ_difficulties[cid] = c_info.get("info", {}).get("difficulty", 5)
        mag = c_info.get("info", {}).get("magic", 5)
        att = c_info.get("info", {}).get("attack", 5)
        champ_magic_ratio[cid] = mag / max(mag + att, 1.0)
        champ_attack_ratio[cid] = att / max(mag + att, 1.0)
    print(f"[OK] Successfully mapped Riot archetype classes for {len(champ_classes)} champions.")
except Exception as e:
    print(f"[WARN] CDN fetch encountered an error: {e}. Checking local cache '{DDRAGON_PATH}'...")
    if os.path.exists(DDRAGON_PATH):
        with open(DDRAGON_PATH, "r", encoding="utf-8") as f:
            ddragon_data = json.load(f)
        for champ_name, c_info in ddragon_data["data"].items():
            cid = int(c_info["key"])
            champ_classes[cid] = set(c_info.get("tags", []))
            champ_difficulties[cid] = c_info.get("info", {}).get("difficulty", 5)
            mag = c_info.get("info", {}).get("magic", 5)
            att = c_info.get("info", {}).get("attack", 5)
            champ_magic_ratio[cid] = mag / max(mag + att, 1.0)
            champ_attack_ratio[cid] = att / max(mag + att, 1.0)
        print(f"[OK] Fallback successful: mapped {len(champ_classes)} champions from local cache.")
    else:
        print("[WARN] Warning: No Data Dragon cache available. Falling back to empty archetypes.")

# 2. Empirical Bayes Beta-Binomial Shrinkage with Popularity Tax Compensation
GLOBAL_PRIOR_WR = df_train["Win"].mean()
M_CHAMP = 150
POPULARITY_EXP = 0.015

champ_stats = df_train.groupby("ChampionFk").agg(
    wins=("Win", "sum"),
    games=("Win", "count")
).reset_index()

champ_stats["bayes_wr"] = (champ_stats["wins"] + M_CHAMP * GLOBAL_PRIOR_WR) / (champ_stats["games"] + M_CHAMP)
champ_stats["popularity_tax"] = (np.log1p(champ_stats["games"]) / np.log1p(champ_stats["games"].max())) ** POPULARITY_EXP
champ_stats["adjusted_wr"] = champ_stats["bayes_wr"] * champ_stats["popularity_tax"]

playrate_adj_wr = champ_stats.set_index("ChampionFk")["adjusted_wr"].to_dict()

# 3. Role-Specific Champion Win Rates (Empirical Bayes M=15)
# Fixes Off-Role / Troll Picks: maps (champion, assigned_role) to true empirical lane performance
train_match_rows = df_train.drop_duplicates(subset=["MatchFk"])
roles = ["TOP", "JGL", "MID", "BOT", "SUP"]
b_lane_cols = ["B1Champ", "B2Champ", "B3Champ", "B4Champ", "B5Champ"]
r_lane_cols = ["R1Champ", "R2Champ", "R3Champ", "R4Champ", "R5Champ"]

role_records = []
for role, b_c, r_c in zip(roles, b_lane_cols, r_lane_cols):
    b_df = train_match_rows[[b_c, "BlueWin"]].copy()
    b_df.columns = ["champ", "win"]
    b_df["role"] = role
    role_records.append(b_df)
    r_df = train_match_rows[[r_c, "RedWin"]].copy()
    r_df.columns = ["champ", "win"]
    r_df["role"] = role
    role_records.append(r_df)

all_role_df = pd.concat(role_records, ignore_index=True)
role_stats = all_role_df.groupby(["champ", "role"]).agg(wins=("win", "sum"), games=("win", "count")).reset_index()

role_champ_wr_dict = {}
for r in role_stats.itertuples():
    cid = int(r.champ)
    role_str = str(r.role)
    base_cwr = playrate_adj_wr.get(cid, GLOBAL_PRIOR_WR)
    smoothed_wr = (r.wins + 15 * base_cwr) / (r.games + 15)
    role_champ_wr_dict[(cid, role_str)] = float(smoothed_wr)

def get_role_wr(champ_id, role):
    return role_champ_wr_dict.get((int(champ_id), role), playrate_adj_wr.get(int(champ_id), GLOBAL_PRIOR_WR))

# 4. Data-Derived Head-to-Head Counterpick Residuals (Bidirectional Bayesian Shrinkage, M=60)
# Residual = Smoothed Winrate(A vs B) - Expected Winrate(A vs B)
# Combines both map sides to eliminate data sparsity and shrinks small sample noise towards 0.0
counter_residual_dict = {}
M_SHRINK = 60

for role, b_c, r_c in zip(roles, b_lane_cols, r_lane_cols):
    b_pairs = train_match_rows[[b_c, r_c, "BlueWin"]].rename(columns={b_c: "c1", r_c: "c2", "BlueWin": "c1_win"})
    r_pairs = train_match_rows[[r_c, b_c, "RedWin"]].rename(columns={r_c: "c1", b_c: "c2", "RedWin": "c1_win"})
    all_pairs = pd.concat([b_pairs, r_pairs], ignore_index=True)
    grp = all_pairs.groupby(["c1", "c2"]).agg(n=("c1_win", "count"), w=("c1_win", "sum")).reset_index()
    
    for row in grp.itertuples():
        c1, c2, n, w = int(row.c1), int(row.c2), row.n, row.w
        if c1 == c2 or n < 15:
            continue
        exp_wr = 0.50 + (get_role_wr(c1, role) - get_role_wr(c2, role))
        shrunk_wr = (w + M_SHRINK * exp_wr) / (n + M_SHRINK)
        res = np.clip(shrunk_wr - exp_wr, -0.08, 0.08)
        counter_residual_dict[(c1, c2, role)] = float(res)

def get_counter_residual(c1, c2, role):
    if int(c1) == int(c2):
        return 0.0
    return counter_residual_dict.get((int(c1), int(c2), role), 0.0)

# 5. Keystone & Summoner Spell Viability Dictionaries
keystone_stats = df_train.groupby("PrimaryKeyStone").agg(w=("Win", "sum"), g=("Win", "count"))
keystone_wr = ((keystone_stats["w"] + 50 * GLOBAL_PRIOR_WR) / (keystone_stats["g"] + 50)).to_dict()

spell1_stats = df_train.groupby("SummonerSpell1").agg(w=("Win", "sum"), g=("Win", "count"))
spell1_wr = ((spell1_stats["w"] + 50 * GLOBAL_PRIOR_WR) / (spell1_stats["g"] + 50)).to_dict()

spell2_stats = df_train.groupby("SummonerSpell2").agg(w=("Win", "sum"), g=("Win", "count"))
spell2_wr = ((spell2_stats["w"] + 50 * GLOBAL_PRIOR_WR) / (spell2_stats["g"] + 50)).to_dict()

# 6. Leak-Free Pairwise Synergy Discovery (Wilson Score)
def compute_team_pair_synergies(df_train_matches, min_count=100, z=1.96):
    b_combos = list(combinations(b_lane_cols, 2))
    r_combos = list(combinations(r_lane_cols, 2))
    records = []
    for c1, c2 in b_combos:
        sub = df_train_matches[[c1, c2, "BlueWin"]].copy()
        sub.columns = ["c1", "c2", "win"]
        records.append(sub)
    for c1, c2 in r_combos:
        sub = df_train_matches[[c1, c2, "RedWin"]].copy()
        sub.columns = ["c1", "c2", "win"]
        records.append(sub)
    pairs_df = pd.concat(records, ignore_index=True)
    pairs_df["pair_a"] = np.minimum(pairs_df["c1"], pairs_df["c2"])
    pairs_df["pair_b"] = np.maximum(pairs_df["c1"], pairs_df["c2"])
    pair_stats = pairs_df.groupby(["pair_a", "pair_b"]).agg(games=("win", "count"), pair_wr=("win", "mean")).reset_index()
    c_baselines = pd.concat([pairs_df[["c1", "win"]].rename(columns={"c1": "c"}), pairs_df[["c2", "win"]].rename(columns={"c2": "c"})]).groupby("c")["win"].mean()
    pair_stats["expected_wr"] = (pair_stats["pair_a"].map(c_baselines).fillna(0.5) + pair_stats["pair_b"].map(c_baselines).fillna(0.5)) / 2.0
    n = pair_stats["games"]
    p = pair_stats["pair_wr"]
    den = 1.0 + (z**2 / n)
    center = (p + (z**2 / (2 * n))) / den
    spread = (z / den) * np.sqrt((p * (1 - p) / n) + (z**2 / (4 * n**2)))
    pair_stats["wilson_lift"] = np.where(pair_stats["pair_wr"] >= pair_stats["expected_wr"], np.maximum(0.0, center - spread - pair_stats["expected_wr"]), np.minimum(0.0, center + spread - pair_stats["expected_wr"]))
    credible_pairs = pair_stats[pair_stats["games"] >= min_count].copy()
    synergy_dict = {(int(r.pair_a), int(r.pair_b)): float(r.wilson_lift) for r in credible_pairs.itertuples()}
    return synergy_dict, credible_pairs, pair_stats

synergy_dict_wilson, credible_synergies, all_pair_stats = compute_team_pair_synergies(train_match_rows, min_count=100)

# 7. Empirical Champion Mastery Elasticity
champ_mastery_elasticity = {
    int(cid): float(np.clip(0.020 + 0.015 * champ_difficulties.get(int(cid), 5), 0.02, 0.20))
    for cid in df_train["ChampionFk"].unique()
}

print(f"Priors & Synergy Dictionaries Generated:")
print(f"  * Role-Specific Champion Win Rates: {len(role_champ_wr_dict):,} entries.")
print(f"  * Counterpick Matchup Residuals:    {len(counter_residual_dict):,} learned pairs.")
print(f"  * Wilson Synergy Entries (N >= 100): {len(synergy_dict_wilson):,}")
print(f"  * Mastery Elasticity Computed For:  {len(champ_mastery_elasticity)} champions.")
'''
nb["cells"][4]["source"] = [line + "\n" for line in cell4_code.split("\n")]

# 2. Update Cell 6: Feature Engineering
cell6_code = '''# =============================================================================
# 6. Leak-Free Feature Engineering (Role Counterparts, Residuals & Damage Shares)
# =============================================================================
def compute_draft_features_v2(data, champ_wr_map, keystone_wr_map, spell1_wr_map, spell2_wr_map, 
                              synergy_map=None, elasticity_map=None):
    df_feat = data.copy()
    
    blue_cols = ["B1Champ", "B2Champ", "B3Champ", "B4Champ", "B5Champ"]
    red_cols  = ["R1Champ", "R2Champ", "R3Champ", "R4Champ", "R5Champ"]
    is_blue = df_feat[blue_cols].eq(df_feat["ChampionFk"], axis=0).any(axis=1)
    
    # 1. Role-specific baseline win rates
    b_top = df_feat["B1Champ"].map(lambda c: get_role_wr(c, "TOP"))
    b_jgl = df_feat["B2Champ"].map(lambda c: get_role_wr(c, "JGL"))
    b_mid = df_feat["B3Champ"].map(lambda c: get_role_wr(c, "MID"))
    b_bot = df_feat["B4Champ"].map(lambda c: get_role_wr(c, "BOT"))
    b_sup = df_feat["B5Champ"].map(lambda c: get_role_wr(c, "SUP"))
    
    r_top = df_feat["R1Champ"].map(lambda c: get_role_wr(c, "TOP"))
    r_jgl = df_feat["R2Champ"].map(lambda c: get_role_wr(c, "JGL"))
    r_mid = df_feat["R3Champ"].map(lambda c: get_role_wr(c, "MID"))
    r_bot = df_feat["R4Champ"].map(lambda c: get_role_wr(c, "BOT"))
    r_sup = df_feat["R5Champ"].map(lambda c: get_role_wr(c, "SUP"))
    
    # 2. Data-Derived Head-to-Head Counterpick Residuals (Zero Default)
    res_top = np.array([get_counter_residual(b, r, "TOP") for b, r in zip(df_feat["B1Champ"], df_feat["R1Champ"])])
    res_jgl = np.array([get_counter_residual(b, r, "JGL") for b, r in zip(df_feat["B2Champ"], df_feat["R2Champ"])])
    res_mid = np.array([get_counter_residual(b, r, "MID") for b, r in zip(df_feat["B3Champ"], df_feat["R3Champ"])])
    res_bot = np.array([get_counter_residual(b, r, "BOT") for b, r in zip(df_feat["B4Champ"], df_feat["R4Champ"])])
    res_sup = np.array([get_counter_residual(b, r, "SUP") for b, r in zip(df_feat["B5Champ"], df_feat["R5Champ"])])
    
    # Direct role counterpart differentials with counterpick lift
    raw_delta_top = (b_top - r_top) + res_top
    raw_delta_jgl = (b_jgl - r_jgl) + res_jgl
    raw_delta_mid = (b_mid - r_mid) + res_mid
    raw_delta_bot = (b_bot - r_bot) + res_bot
    raw_delta_sup = (b_sup - r_sup) + res_sup
    
    b_avg = (b_top + b_jgl + b_mid + b_bot + b_sup) / 5.0
    r_avg = (r_top + r_jgl + r_mid + r_bot + r_sup) / 5.0
    raw_adv = b_avg - r_avg
    persp_adv = np.where(is_blue, raw_adv, -raw_adv)
    
    # Perspective-aligned role differentials
    df_feat["diff_top"] = np.where(is_blue, raw_delta_top, -raw_delta_top)
    df_feat["diff_jgl"] = np.where(is_blue, raw_delta_jgl, -raw_delta_jgl)
    df_feat["diff_mid"] = np.where(is_blue, raw_delta_mid, -raw_delta_mid)
    df_feat["diff_bot"] = np.where(is_blue, raw_delta_bot, -raw_delta_bot)
    df_feat["diff_sup"] = np.where(is_blue, raw_delta_sup, -raw_delta_sup)
    df_feat["lane_momentum"] = (df_feat["diff_top"] + df_feat["diff_jgl"] + df_feat["diff_mid"] + df_feat["diff_bot"] + df_feat["diff_sup"]) / 5.0
    
    # Pilot Mastery Conditioning on team_adv
    log_pts = np.log1p(df_feat["CurrentMasteryPoints"].fillna(0))
    mastery_tier = 1.0 / (1.0 + np.exp(-(log_pts - np.log1p(100)) / 2.0))
    mastery_deviation = mastery_tier - 0.5
    
    if elasticity_map:
        champ_elasticities = df_feat["ChampionFk"].map(elasticity_map).fillna(0.05)
    else:
        champ_elasticities = 0.05
        
    pilot_wr_delta = (mastery_deviation * champ_elasticities) / 5.0
    persp_adv_conditioned = persp_adv + pilot_wr_delta
    df_feat["team_adv"] = np.tanh(10.0 * persp_adv_conditioned)
    
    # 3. Vectorized 10-Pair Synergy Delta
    if synergy_map:
        b_combos = list(combinations(blue_cols, 2))
        r_combos = list(combinations(red_cols, 2))
        
        blue_syn = sum(
            np.array([synergy_map.get((min(int(a), int(b)), max(int(a), int(b))), 0.0) 
                      for a, b in zip(df_feat[c1].values, df_feat[c2].values)])
            for c1, c2 in b_combos
        )
        red_syn = sum(
            np.array([synergy_map.get((min(int(a), int(b)), max(int(a), int(b))), 0.0) 
                      for a, b in zip(df_feat[c1].values, df_feat[c2].values)])
            for c1, c2 in r_combos
        )
        raw_synergy_delta = blue_syn - red_syn
    else:
        raw_synergy_delta = np.zeros(len(df_feat))
        
    df_feat["team_synergy_delta"] = np.where(is_blue, raw_synergy_delta, -raw_synergy_delta)
    
    # 4. Pilot Experience & Loadout
    df_feat["elastic_mastery"] = np.log1p(df_feat["CurrentMasteryPoints"]) * champ_elasticities
    df_feat["keystone_wr"] = df_feat["PrimaryKeyStone"].map(keystone_wr_map).fillna(0.5)
    df_feat["is_blue"] = is_blue.astype(int)
    
    # 5. Continuous Team Damage Profile Shares (Physical vs. Magic)
    b_mag = sum(df_feat[c].map(lambda x: champ_magic_ratio.get(x, 0.5)) for c in blue_cols) / 5.0
    b_phys = sum(df_feat[c].map(lambda x: champ_attack_ratio.get(x, 0.5)) for c in blue_cols) / 5.0
    r_mag = sum(df_feat[c].map(lambda x: champ_magic_ratio.get(x, 0.5)) for c in red_cols) / 5.0
    r_phys = sum(df_feat[c].map(lambda x: champ_attack_ratio.get(x, 0.5)) for c in red_cols) / 5.0
    
    df_feat["my_magic_share"] = np.where(is_blue, b_mag, r_mag)
    df_feat["my_physical_share"] = np.where(is_blue, b_phys, r_phys)
    df_feat["enemy_magic_share"] = np.where(is_blue, r_mag, b_mag)
    df_feat["enemy_physical_share"] = np.where(is_blue, r_phys, b_phys)
    
    feature_cols = [
        "team_adv", "diff_top", "diff_jgl", "diff_mid", "diff_bot", "diff_sup",
        "lane_momentum", "team_synergy_delta", "elastic_mastery", "keystone_wr", "is_blue",
        "my_magic_share", "my_physical_share", "enemy_magic_share", "enemy_physical_share"
    ]
    
    # 6. Pruned Class Archetype Vectors (Net Deltas Only)
    archetype_classes = ["Tank", "Assassin", "Mage", "Marksman", "Support", "Fighter"]
    for cls in archetype_classes:
        b_cnt = sum(df_feat[c].map(lambda x: 1 if cls in champ_classes.get(x, set()) else 0) for c in blue_cols)
        r_cnt = sum(df_feat[c].map(lambda x: 1 if cls in champ_classes.get(x, set()) else 0) for c in red_cols)
        delta_col = f"delta_{cls.lower()}s"
        df_feat[delta_col] = np.where(is_blue, b_cnt - r_cnt, r_cnt - b_cnt)
        feature_cols.append(delta_col)
        
    return df_feat[feature_cols], df_feat["Win"], feature_cols

# Generate clean matrices
X_train_v2, y_train, feature_cols = compute_draft_features_v2(
    df_train, playrate_adj_wr, keystone_wr, spell1_wr, spell2_wr, 
    synergy_map=synergy_dict_wilson, elasticity_map=champ_mastery_elasticity
)
X_test_v2, y_test, _ = compute_draft_features_v2(
    df_test, playrate_adj_wr, keystone_wr, spell1_wr, spell2_wr, 
    synergy_map=synergy_dict_wilson, elasticity_map=champ_mastery_elasticity
)

print(f"Feature Matrices Computed: Training: {X_train_v2.shape} | Test: {X_test_v2.shape}")
print(f"Active Features ({len(feature_cols)} Total - Orthogonal set):")
for f_name in feature_cols:
    print(f"  * {f_name}")
'''
nb["cells"][6]["source"] = [line + "\n" for line in cell6_code.split("\n")]

# 3. Update Cell 11: Production Serialization
cell11_code = '''# =============================================================================
# 11. Model Iteration 1 Serialization & Live Inspector (Candidate Baseline)
# =============================================================================
model_filename_joblib = "league_draft_iter1.joblib"
model_filename_clone = "league_mobalytics_clone.joblib"

production_bundle = {
    "model": rf_model,
    "imputer": imp_v2,
    "feature_names": feature_cols,
    "champ_wr_dict": playrate_adj_wr,
    "role_champ_wr_dict": role_champ_wr_dict,
    "counter_residual_dict": counter_residual_dict,
    "champ_magic_ratio": champ_magic_ratio,
    "champ_attack_ratio": champ_attack_ratio,
    "synergy_dict": synergy_dict_wilson,
    "keystone_wr_dict": keystone_wr,
    "spell1_wr_dict": spell1_wr,
    "spell2_wr_dict": spell2_wr,
    "champ_classes": champ_classes,
    "champ_mastery_elasticity": champ_mastery_elasticity,
    "optimal_threshold": optimal_threshold,
    "model_version": "v2.1.0-counterpick-residuals-and-role-priors",
}

# 1. Save locally in notebook directory
joblib.dump(production_bundle, model_filename_joblib)
joblib.dump(production_bundle, model_filename_clone)

# 2. Save into project models directory if available
for repo_target in ["models", "../../models", "../models"]:
    if os.path.exists(repo_target):
        joblib.dump(production_bundle, os.path.join(repo_target, model_filename_joblib))
        joblib.dump(production_bundle, os.path.join(repo_target, model_filename_clone))

print(f"[OK] Calibrated model artifact successfully serialized to '{model_filename_joblib}'.")
print(f"Features: {len(feature_cols)} orthogonal predictors.")
'''
nb["cells"][11]["source"] = [line + "\n" for line in cell11_code.split("\n")]

# Save back to OneDrive notebook
with open(nb_path, "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=2)
print(f"Successfully updated {nb_path}")

# Sync to repo notebook
repo_nb_path = "notebooks/01_model_training_and_calibration.ipynb"
shutil.copyfile(nb_path, repo_nb_path)
print(f"Successfully synced to {repo_nb_path}")
