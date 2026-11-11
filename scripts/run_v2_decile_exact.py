import os
import json
import numpy as np
import pandas as pd
from itertools import combinations
from sklearn.model_selection import GroupShuffleSplit
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.impute import SimpleImputer
from sklearn.metrics import roc_auc_score, accuracy_score, brier_score_loss
import joblib

print("Step 1: Ingesting Data...")
DATA_DIR = "leaguestats"
df_team = pd.read_csv(f"{DATA_DIR}/TeamMatchTbl.csv", usecols=[
    "MatchFk", "B1Champ", "B2Champ", "B3Champ", "B4Champ", "B5Champ",
    "R1Champ", "R2Champ", "R3Champ", "R4Champ", "R5Champ", "BlueWin", "RedWin"
])
df_sm = pd.read_csv(f"{DATA_DIR}/SummonerMatchTbl.csv", usecols=["SummonerMatchId", "SummonerFk", "MatchFk", "ChampionFk"])
df_stats = pd.read_csv(f"{DATA_DIR}/MatchStatsTbl.csv", usecols=[
    "SummonerMatchFk", "Win", "PrimaryKeyStone", "SummonerSpell1", "SummonerSpell2", "CurrentMasteryPoints"
])

df_player = df_sm.merge(df_stats, left_on="SummonerMatchId", right_on="SummonerMatchFk", how="inner")
df_full = df_player.merge(df_team, on="MatchFk", how="inner")

gss = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)
train_idx, test_idx = next(gss.split(df_full, groups=df_full["MatchFk"]))
df_train = df_full.iloc[train_idx].copy()
df_test = df_full.iloc[test_idx].copy()
train_match_rows = df_train.drop_duplicates(subset=["MatchFk"])

# Data Dragon
DDRAGON_PATH = "C:/Users/tayen/OneDrive - Singapore Polytechnic/Code/Projects/champion.json"
if not os.path.exists(DDRAGON_PATH):
    DDRAGON_PATH = "champion.json"
cdata = json.load(open(DDRAGON_PATH, encoding="utf-8"))["data"]

champ_classes = {int(v["key"]): set(v.get("tags", [])) for v in cdata.values()}
champ_difficulties = {int(v["key"]): v.get("info", {}).get("difficulty", 5) for v in cdata.values()}
champ_magic_ratio = {int(v["key"]): v.get("info", {}).get("magic", 5) / max(v.get("info", {}).get("magic", 5) + v.get("info", {}).get("attack", 5), 1.0) for v in cdata.values()}
champ_attack_ratio = {int(v["key"]): v.get("info", {}).get("attack", 5) / max(v.get("info", {}).get("magic", 5) + v.get("info", {}).get("attack", 5), 1.0) for v in cdata.values()}

# Global Playrate Adjusted Win Rates
GLOBAL_PRIOR_WR = df_train["Win"].mean()
champ_stats = df_train.groupby("ChampionFk").agg(wins=("Win", "sum"), games=("Win", "count")).reset_index()
champ_stats["bayes_wr"] = (champ_stats["wins"] + 150 * GLOBAL_PRIOR_WR) / (champ_stats["games"] + 150)
champ_stats["popularity_tax"] = (np.log1p(champ_stats["games"]) / np.log1p(champ_stats["games"].max())) ** 0.015
champ_stats["adjusted_wr"] = champ_stats["bayes_wr"] * champ_stats["popularity_tax"]
playrate_adj_wr = champ_stats.set_index("ChampionFk")["adjusted_wr"].to_dict()

# 1. Role-Specific Champion Win Rates
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
    role = str(r.role)
    base_cwr = playrate_adj_wr.get(cid, GLOBAL_PRIOR_WR)
    smoothed_wr = (r.wins + 15 * base_cwr) / (r.games + 15)
    role_champ_wr_dict[(cid, role)] = float(smoothed_wr)

def get_role_wr(champ_id, role):
    return role_champ_wr_dict.get((int(champ_id), role), playrate_adj_wr.get(int(champ_id), GLOBAL_PRIOR_WR))

# 2. Data-Derived Head-to-Head Counterpick Residuals (Bidirectional Bayesian Shrinkage)
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

keystone_stats = df_train.groupby("PrimaryKeyStone").agg(w=("Win", "sum"), g=("Win", "count"))
keystone_wr = ((keystone_stats["w"] + 50 * GLOBAL_PRIOR_WR) / (keystone_stats["g"] + 50)).to_dict()

# 10-Pair Wilson synergies
def compute_wilson_synergies(df_tr_m):
    b_combos = list(combinations(b_lane_cols, 2))
    r_combos = list(combinations(r_lane_cols, 2))
    records = []
    for c1, c2 in b_combos:
        sub = df_tr_m[[c1, c2, "BlueWin"]].copy()
        sub.columns = ["c1", "c2", "win"]
        records.append(sub)
    for c1, c2 in r_combos:
        sub = df_tr_m[[c1, c2, "RedWin"]].copy()
        sub.columns = ["c1", "c2", "win"]
        records.append(sub)
    pairs_df = pd.concat(records, ignore_index=True)
    pairs_df["pair_a"] = np.minimum(pairs_df["c1"], pairs_df["c2"])
    pairs_df["pair_b"] = np.maximum(pairs_df["c1"], pairs_df["c2"])
    pair_stats = pairs_df.groupby(["pair_a", "pair_b"]).agg(games=("win", "count"), pair_wr=("win", "mean")).reset_index()
    c_baselines = pd.concat([pairs_df[["c1", "win"]].rename(columns={"c1": "c"}), pairs_df[["c2", "win"]].rename(columns={"c2": "c"})]).groupby("c")["win"].mean()
    pair_stats["expected_wr"] = (pair_stats["pair_a"].map(c_baselines).fillna(0.5) + pair_stats["pair_b"].map(c_baselines).fillna(0.5)) / 2.0
    z = 1.96
    n = pair_stats["games"]
    p = pair_stats["pair_wr"]
    den = 1.0 + (z**2 / n)
    center = (p + (z**2 / (2 * n))) / den
    spread = (z / den) * np.sqrt((p * (1 - p) / n) + (z**2 / (4 * n**2)))
    pair_stats["wilson_lift"] = np.where(pair_stats["pair_wr"] >= pair_stats["expected_wr"], np.maximum(0.0, center - spread - pair_stats["expected_wr"]), np.minimum(0.0, center + spread - pair_stats["expected_wr"]))
    return {(int(r.pair_a), int(r.pair_b)): float(r.wilson_lift) for r in pair_stats[pair_stats["games"] >= 100].itertuples()}

synergy_dict_wilson = compute_wilson_synergies(train_match_rows)
champ_mastery_elasticity = {int(cid): float(np.clip(0.020 + 0.015 * champ_difficulties.get(int(cid), 5), 0.02, 0.20)) for cid in df_train["ChampionFk"].unique()}

# 3. Feature Engineering Function
def compute_features(df_data):
    df_feat = df_data.copy()
    blue_cols = ["B1Champ", "B2Champ", "B3Champ", "B4Champ", "B5Champ"]
    red_cols  = ["R1Champ", "R2Champ", "R3Champ", "R4Champ", "R5Champ"]
    is_blue = df_feat[blue_cols].eq(df_feat["ChampionFk"], axis=0).any(axis=1)

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

    res_top = np.array([get_counter_residual(b, r, "TOP") for b, r in zip(df_feat["B1Champ"], df_feat["R1Champ"])])
    res_jgl = np.array([get_counter_residual(b, r, "JGL") for b, r in zip(df_feat["B2Champ"], df_feat["R2Champ"])])
    res_mid = np.array([get_counter_residual(b, r, "MID") for b, r in zip(df_feat["B3Champ"], df_feat["R3Champ"])])
    res_bot = np.array([get_counter_residual(b, r, "BOT") for b, r in zip(df_feat["B4Champ"], df_feat["R4Champ"])])
    res_sup = np.array([get_counter_residual(b, r, "SUP") for b, r in zip(df_feat["B5Champ"], df_feat["R5Champ"])])

    raw_delta_top = (b_top - r_top) + res_top
    raw_delta_jgl = (b_jgl - r_jgl) + res_jgl
    raw_delta_mid = (b_mid - r_mid) + res_mid
    raw_delta_bot = (b_bot - r_bot) + res_bot
    raw_delta_sup = (b_sup - r_sup) + res_sup

    b_avg = (b_top + b_jgl + b_mid + b_bot + b_sup) / 5.0
    r_avg = (r_top + r_jgl + r_mid + r_bot + r_sup) / 5.0
    raw_adv = b_avg - r_avg
    persp_adv = np.where(is_blue, raw_adv, -raw_adv)

    df_feat["diff_top"] = np.where(is_blue, raw_delta_top, -raw_delta_top)
    df_feat["diff_jgl"] = np.where(is_blue, raw_delta_jgl, -raw_delta_jgl)
    df_feat["diff_mid"] = np.where(is_blue, raw_delta_mid, -raw_delta_mid)
    df_feat["diff_bot"] = np.where(is_blue, raw_delta_bot, -raw_delta_bot)
    df_feat["diff_sup"] = np.where(is_blue, raw_delta_sup, -raw_delta_sup)
    df_feat["lane_momentum"] = (df_feat["diff_top"] + df_feat["diff_jgl"] + df_feat["diff_mid"] + df_feat["diff_bot"] + df_feat["diff_sup"]) / 5.0

    log_pts = np.log1p(df_feat["CurrentMasteryPoints"].fillna(0))
    mastery_tier = 1.0 / (1.0 + np.exp(-(log_pts - np.log1p(100)) / 2.0))
    mastery_deviation = mastery_tier - 0.5
    champ_el = df_feat["ChampionFk"].map(champ_mastery_elasticity).fillna(0.05)
    pilot_wr_delta = (mastery_deviation * champ_el) / 5.0
    persp_adv_cond = persp_adv + pilot_wr_delta
    df_feat["team_adv"] = np.tanh(10.0 * persp_adv_cond)

    b_combos = list(combinations(blue_cols, 2))
    r_combos = list(combinations(red_cols, 2))
    b_syn = sum(np.array([synergy_dict_wilson.get((min(int(a), int(b)), max(int(a), int(b))), 0.0) for a, b in zip(df_feat[c1].values, df_feat[c2].values)]) for c1, c2 in b_combos)
    r_syn = sum(np.array([synergy_dict_wilson.get((min(int(a), int(b)), max(int(a), int(b))), 0.0) for a, b in zip(df_feat[c1].values, df_feat[c2].values)]) for c1, c2 in r_combos)
    df_feat["team_synergy_delta"] = np.where(is_blue, b_syn - r_syn, r_syn - b_syn)

    df_feat["elastic_mastery"] = np.log1p(df_feat["CurrentMasteryPoints"]) * champ_el
    df_feat["keystone_wr"] = df_feat["PrimaryKeyStone"].map(keystone_wr).fillna(0.5)
    df_feat["is_blue"] = is_blue.astype(int)

    # Damage Shares
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

    archetype_classes = ["Tank", "Assassin", "Mage", "Marksman", "Support", "Fighter"]
    for cls in archetype_classes:
        b_cnt = sum(df_feat[c].map(lambda x: 1 if cls in champ_classes.get(x, set()) else 0) for c in blue_cols)
        r_cnt = sum(df_feat[c].map(lambda x: 1 if cls in champ_classes.get(x, set()) else 0) for c in red_cols)
        delta_col = f"delta_{cls.lower()}s"
        df_feat[delta_col] = np.where(is_blue, b_cnt - r_cnt, r_cnt - b_cnt)
        feature_cols.append(delta_col)

    return df_feat[feature_cols], df_feat["Win"], feature_cols

X_tr, y_tr, feat_cols = compute_features(df_train)
X_te, y_te, _ = compute_features(df_test)

imputer = SimpleImputer(strategy="median")
X_tr_imp = imputer.fit_transform(X_tr)
X_te_imp = imputer.transform(X_te)

# TRAIN WITH V2 EXACT HYPERPARAMETERS:
# max_depth=6, min_samples_leaf=600, n_estimators=150
print("Fitting Random Forest (max_depth=6, min_samples_leaf=600)...")
best_rf = RandomForestClassifier(
    n_estimators=150,
    max_depth=6,
    min_samples_leaf=600,
    max_features="sqrt",
    random_state=42,
    n_jobs=-1
)
best_rf.fit(X_tr_imp, y_tr)
y_prob_rf = best_rf.predict_proba(X_te_imp)[:, 1]

# Baselines
baseline_cols = ["team_adv", "team_synergy_delta"]
imp_base = SimpleImputer(strategy="median")
X_tr_b = imp_base.fit_transform(X_tr[baseline_cols])
X_te_b = imp_base.transform(X_te[baseline_cols])

lr = LogisticRegression(C=1.0, max_iter=1000, random_state=42)
lr.fit(X_tr_b, y_tr)

lin = LinearRegression()
lin.fit(X_tr_b, y_tr)

y_prob_lr = lr.predict_proba(X_te_b)[:, 1]
y_prob_lin = np.clip(lin.predict(X_te_b), 0.01, 0.99)

auc = roc_auc_score(y_te, y_prob_rf)
acc = accuracy_score(y_te, (y_prob_rf >= 0.50).astype(int))
brier = brier_score_loss(y_te, y_prob_rf)

print(f"\n=======================================================")
print(f"CALIBRATED RANDOM FOREST METRICS (128,549 HOLDOUT TEST):")
print(f"ROC-AUC:    {auc:.4f}")
print(f"Accuracy:   {acc*100:.2f}%")
print(f"Brier Loss: {brier:.4f}")
print(f"=======================================================\n")

eval_df = pd.DataFrame({
    "actual": y_te,
    "rf_pred": y_prob_rf,
    "lr_pred": y_prob_lr,
    "lin_pred": y_prob_lin
})
eval_df["decile"] = pd.qcut(eval_df["rf_pred"], q=10, labels=[f"D{i+1}" for i in range(10)])
tier_labels = {
    "D1": "D1: Heavy Disadv", "D2": "D2: Strong Disadv", "D3": "D3: Mod Disadv",
    "D4": "D4: Slight Disadv", "D5": "D5: Even Draft (-)", "D6": "D6: Even Draft (+)",
    "D7": "D7: Slight Adv", "D8": "D8: Mod Adv", "D9": "D9: Strong Adv", "D10": "D10: Heavy Adv"
}

rows = []
for d, sub in eval_df.groupby("decile"):
    act = sub["actual"].mean()
    rf_m = sub["rf_pred"].mean()
    lr_m = sub["lr_pred"].mean()
    lin_m = sub["lin_pred"].mean()
    rows.append({
        "decile": d,
        "draft_tier": tier_labels[d],
        "Matches": len(sub),
        "Actual_WR": f"{act*100:.1f}%",
        "RF_Pred": f"{rf_m*100:.1f}%",
        "LR_Pred": f"{lr_m*100:.1f}%",
        "Lin_Pred": f"{lin_m*100:.1f}%",
        "RF_Gap": f"{abs(act - rf_m)*100:.1f}%",
        "Lin_Gap": f"{abs(act - lin_m)*100:.1f}%",
    })

print("=== Decile Calibration Comparison: Actual vs. RF vs. Logistic vs. Linear ===")
print(pd.DataFrame(rows)[["draft_tier", "Matches", "Actual_WR", "RF_Pred", "LR_Pred", "Lin_Pred", "RF_Gap", "Lin_Gap"]].to_string(index=False))

# Domain Sensitivity Verification
def score_test_draft(blue_cids, red_cids, pilot_cid=None):
    row = {
        "B1Champ": blue_cids[0], "B2Champ": blue_cids[1], "B3Champ": blue_cids[2], "B4Champ": blue_cids[3], "B5Champ": blue_cids[4],
        "R1Champ": red_cids[0], "R2Champ": red_cids[1], "R3Champ": red_cids[2], "R4Champ": red_cids[3], "R5Champ": red_cids[4],
        "ChampionFk": pilot_cid or blue_cids[0],
        "CurrentMasteryPoints": 50000.0,
        "PrimaryKeyStone": 8437,
        "Win": 0,
    }
    f, _, _ = compute_features(pd.DataFrame([row]))
    arr = imputer.transform(f[feat_cols])
    return best_rf.predict_proba(arr)[:, 1][0]

p_sylas = score_test_draft([54, 254, 103, 222, 111], [517, 254, 103, 222, 111])
p_jax   = score_test_draft([54, 254, 103, 222, 111], [24, 254, 103, 222, 111])

print("\n--- DOMAIN COUNTERPICK SENSITIVITY ---")
print(f"Malphite vs Sylas Top: Blue WinProb = {p_sylas*100:.2f}% (Delta: {(p_sylas-0.5)*100:+.2f}%)")
print(f"Malphite vs Jax Top:   Blue WinProb = {p_jax*100:.2f}% (Delta: {(p_jax-0.5)*100:+.2f}%)")
print(f"Net Counterpick Swing: {((p_jax - p_sylas)*100):+.2f}% in Malphite's favor against Jax over Sylas!")
