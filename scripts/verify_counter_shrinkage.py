import pandas as pd
import numpy as np
import joblib

DATA_DIR = 'leaguestats'
df_team = pd.read_csv(f'{DATA_DIR}/TeamMatchTbl.csv', usecols=[
    'MatchFk', 'B1Champ', 'B2Champ', 'B3Champ', 'B4Champ', 'B5Champ',
    'R1Champ', 'R2Champ', 'R3Champ', 'R4Champ', 'R5Champ', 'BlueWin', 'RedWin'
])

roles = ['TOP', 'JGL', 'MID', 'BOT', 'SUP']
b_lane_cols = ['B1Champ', 'B2Champ', 'B3Champ', 'B4Champ', 'B5Champ']
r_lane_cols = ['R1Champ', 'R2Champ', 'R3Champ', 'R4Champ', 'R5Champ']

p = joblib.load('models/league_mobalytics_clone.joblib')
role_wr = p.get('role_champ_wr_dict', {})
c_wr = p.get('champ_wr_dict', {})

def get_role_wr(cid, role):
    return role_wr.get((int(cid), role), c_wr.get(int(cid), 0.50))

M = 60
counter_res_shrunk = {}

for role, b_c, r_c in zip(roles, b_lane_cols, r_lane_cols):
    b_pairs = df_team[[b_c, r_c, 'BlueWin']].rename(columns={b_c: 'c1', r_c: 'c2', 'BlueWin': 'c1_win'})
    r_pairs = df_team[[r_c, b_c, 'RedWin']].rename(columns={r_c: 'c1', b_c: 'c2', 'RedWin': 'c1_win'})
    all_pairs = pd.concat([b_pairs, r_pairs], ignore_index=True)
    grp = all_pairs.groupby(['c1', 'c2']).agg(n=('c1_win', 'count'), w=('c1_win', 'sum')).reset_index()
    
    for row in grp.itertuples():
        c1, c2, n, w = int(row.c1), int(row.c2), row.n, row.w
        if c1 == c2 or n < 15:
            continue
        exp_wr = 0.50 + (get_role_wr(c1, role) - get_role_wr(c2, role))
        shrunk_wr = (w + M * exp_wr) / (n + M)
        res = np.clip(shrunk_wr - exp_wr, -0.08, 0.08)
        counter_res_shrunk[(c1, c2, role)] = float(res)

print(f'Total regularized matchups: {len(counter_res_shrunk)}')
res_values = list(counter_res_shrunk.values())
print(f'Max residual: {max(res_values)*100:+.2f}%')
print(f'Min residual: {min(res_values)*100:+.2f}%')
print(f'Mean absolute residual: {np.mean(np.abs(res_values))*100:.2f}%')

p_res = counter_res_shrunk.get((80, 105, 'MID'), 0.0)
diff_panth = (get_role_wr(80, 'MID') - get_role_wr(105, 'MID') + p_res) * 100
print(f'\nPantheon vs Fizz MID: Residual = {p_res*100:+.2f}%, Total Edge = {diff_panth:+.2f}%')

m_res = counter_res_shrunk.get((54, 517, 'TOP'), 0.0)
diff_malph = (get_role_wr(54, 'TOP') - get_role_wr(517, 'TOP') + m_res) * 100
print(f'Malphite vs Sylas TOP: Residual = {m_res*100:+.2f}%, Total Edge = {diff_malph:+.2f}%')
