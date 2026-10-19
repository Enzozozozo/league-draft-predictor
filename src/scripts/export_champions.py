import json
from pathlib import Path
from urllib.request import urlopen, Request

MERAKI_CHAMPIONS_URL = "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json"

POSITION_MAP = {
    "TOP": "TOP",
    "JUNGLE": "JGL",
    "MIDDLE": "MID",
    "BOTTOM": "BOT",
    "SUPPORT": "SUP",
    "UTILITY": "SUP",
}

SUBCLASS_LABELS = {
    "JUGGERNAUT": "Juggernaut",
    "DIVER": "Diver",
    "SKIRMISHER": "Skirmisher",
    "VANGUARD": "Vanguard Tank",
    "WARDEN": "Warden Tank",
    "BURST": "Burst Mage",
    "BATTLEMAGE": "Battlemage",
    "ARTILLERY": "Artillery Mage",
    "ENCHANTER": "Enchanter",
    "CATCHER": "Catcher",
    "ASSASSIN": "Assassin",
    "MARKSMAN": "Marksman",
    "SPECIALIST": "Specialist",
    "FIGHTER": "Fighter",
    "MAGE": "Mage",
    "TANK": "Tank",
    "SUPPORT": "Support",
}

SUBCLASS_PRIORITY = [
    "JUGGERNAUT", "DIVER", "SKIRMISHER", "VANGUARD", "WARDEN",
    "BURST", "BATTLEMAGE", "ARTILLERY", "ENCHANTER", "CATCHER",
    "ASSASSIN", "MARKSMAN", "SPECIALIST", "FIGHTER", "MAGE", "TANK", "SUPPORT"
]


def fetch_meraki_positions(cache_dir: Path) -> dict:
    """Fetches live champion positions and subclasses from Meraki Analytics CDN with local cache fallback."""
    cache_file = cache_dir / "meraki_champions.json"
    try:
        req = Request(MERAKI_CHAMPIONS_URL, headers={"User-Agent": "LeagueDraftPredictor/1.0"})
        with urlopen(req, timeout=12) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                cache_dir.mkdir(parents=True, exist_ok=True)
                with open(cache_file, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
                return data
    except Exception:
        pass

    if cache_file.exists():
        with open(cache_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def derive_archetype(champ_data: dict, meraki_entry: dict) -> str:
    """Dynamically resolves champion subclass archetype from Meraki roles or Data Dragon stats/tags."""
    if meraki_entry:
        m_roles = meraki_entry.get("roles", [])
        for sub in SUBCLASS_PRIORITY:
            if sub in m_roles:
                return SUBCLASS_LABELS[sub]

    tags = champ_data.get("tags", [])
    info = champ_data.get("info", {})
    attack = info.get("attack", 5)
    defense = info.get("defense", 5)
    magic = info.get("magic", 5)

    if "Support" in tags:
        return "Enchanter" if magic > defense else "Catcher / Warden"
    if "Tank" in tags:
        return "Vanguard Tank" if attack > 4 else "Warden Tank"
    if "Marksman" in tags:
        return "Hypercarry" if attack > 7 else "Marksman"
    if "Assassin" in tags:
        return "AP Assassin" if magic > attack else "AD Assassin"
    if "Mage" in tags:
        return "Artillery Mage" if attack < 3 else "Battlemage"
    if "Fighter" in tags:
        return "Juggernaut" if defense > 6 else "Skirmisher"
    return "Specialist"


def derive_roles(champ_data: dict, meraki_entry: dict) -> list:
    """Dynamically resolves lane positions (TOP, JGL, MID, BOT, SUP) from Meraki Analytics or Data Dragon tags."""
    if meraki_entry:
        positions = meraki_entry.get("positions", [])
        mapped = []
        for pos in positions:
            code = POSITION_MAP.get(pos.upper())
            if code and code not in mapped:
                mapped.append(code)
        if mapped:
            return mapped

    # Fallback for newly released PBE champions not yet indexed in Meraki
    tags = champ_data.get("tags", [])
    roles = []
    if "Marksman" in tags:
        roles.append("BOT")
    if "Support" in tags:
        roles.append("SUP")
    if "Tank" in tags:
        roles.extend(["TOP", "SUP", "JGL"])
    if "Mage" in tags:
        roles.extend(["MID", "SUP"])
    if "Assassin" in tags:
        roles.extend(["MID", "JGL"])
    if "Fighter" in tags:
        roles.extend(["TOP", "JGL"])

    seen = set()
    clean_roles = [r for r in roles if not (r in seen or seen.add(r))]
    return clean_roles if clean_roles else ["MID"]


def compute_profile(champ: dict) -> dict:
    tags = champ.get("tags", [])
    info = champ.get("info", {})
    attack = info.get("attack", 5)
    defense = info.get("defense", 5)
    magic = info.get("magic", 5)

    engage = 4.0
    if "Tank" in tags:
        engage += 4.0
    if "Fighter" in tags:
        engage += 2.0
    if "Support" in tags and defense > 5:
        engage += 2.0

    disengage = 3.0
    if "Support" in tags:
        disengage += 4.0
    if "Mage" in tags:
        disengage += 2.0

    poke = 3.0
    if "Mage" in tags or "Marksman" in tags:
        poke += 3.0
    if attack > 7 or magic > 7:
        poke += 2.0

    scaling = 5.0
    if "Marksman" in tags or "Mage" in tags:
        scaling += 2.5
    if "Fighter" in tags:
        scaling += 1.5

    teamfight = 4.0
    if "Mage" in tags or "Tank" in tags:
        teamfight += 3.5
    if "Marksman" in tags:
        teamfight += 2.0

    atk_val = float(attack)
    mag_val = float(magic)

    cid = champ.get("id", "")
    cname = champ.get("name", "")

    AP_CHAMPIONS = {
        "Gwen", "Singed", "Sylas", "Mordekaiser", "Leona", "Amumu", "Zac",
        "Cho'Gath", "Sejuani", "Malphite", "Maokai", "Kassadin", "Rumble",
        "Diana", "Ekko", "Evelynn", "Katarina", "Elise", "Blitzcrank", "TahmKench"
    }

    if "Mage" in tags or cid in AP_CHAMPIONS or cname in AP_CHAMPIONS:
        mag_val += 3.5
    if "Marksman" in tags:
        atk_val += 3.5
    if "Assassin" in tags and "Mage" not in tags and cid not in AP_CHAMPIONS:
        atk_val += 2.5

    atk_pow = max(atk_val, 0.5) ** 3
    mag_pow = max(mag_val, 0.5) ** 3
    tot_dmg = max(atk_pow + mag_pow, 1.0)
    ad_pct = atk_pow / tot_dmg
    ap_pct = mag_pow / tot_dmg

    return {
        "engage": min(round(engage, 1), 10.0),
        "disengage": min(round(disengage, 1), 10.0),
        "poke": min(round(poke, 1), 10.0),
        "scaling": min(round(scaling, 1), 10.0),
        "teamfight": min(round(teamfight, 1), 10.0),
        "ad": round(ad_pct, 2),
        "ap": round(ap_pct, 2),
    }


def main():
    cache_dir = Path(".cache/ddragon")
    champ_wr_dict = {}
    latest_version = "16.20.1"

    try:
        from src.backend.ai_model import MobalyticsJoblibModel, MonotonicCalibratedForest
        from src.backend.champion_data import ChampionDataManager
        cdm = ChampionDataManager()
        model = MobalyticsJoblibModel()
        cache_dir = cdm.cache_dir
        latest_version = cdm.latest_version
        champ_wr_dict = model.champ_wr_dict or {}
    except Exception:
        version_file = cache_dir / "latest_version.txt"
        if version_file.exists():
            latest_version = version_file.read_text(encoding="utf-8").strip()

    meraki_data = fetch_meraki_positions(cache_dir)

    with open(cache_dir / "champions.json", "r", encoding="utf-8") as f:
        champs_raw = json.load(f)

    out_path = Path("src/frontend/data/champions.json")
    existing_wr = {}
    if out_path.exists():
        try:
            with open(out_path, "r", encoding="utf-8") as f:
                for item in json.load(f):
                    existing_wr[int(item["key"])] = item.get("winRate", 50.0)
        except Exception:
            pass

    result = []
    for key, c in champs_raw.items():
        cid = int(c["key"])
        cname = c["name"]
        if champ_wr_dict and cid in champ_wr_dict:
            win_rate = round(champ_wr_dict[cid] * 100.0, 1)
        else:
            win_rate = existing_wr.get(cid, 50.0)

        profile = compute_profile(c)
        meraki_entry = meraki_data.get(c["id"]) or meraki_data.get(key)
        archetype = derive_archetype(c, meraki_entry)
        roles = derive_roles(c, meraki_entry)

        result.append({
            "id": c["id"],
            "key": cid,
            "name": cname,
            "title": c.get("title", ""),
            "image": f"https://ddragon.leagueoflegends.com/cdn/{latest_version}/img/champion/{c['id']}.png",
            "roles": roles,
            "primaryRole": roles[0],
            "archetype": archetype,
            "winRate": win_rate,
            "engage": profile["engage"],
            "disengage": profile["disengage"],
            "poke": profile["poke"],
            "scaling": profile["scaling"],
            "teamfight": profile["teamfight"],
            "ad": profile["ad"],
            "ap": profile["ap"],
            "tags": c.get("tags", [])
        })

    # Sort alphabetically by champion name
    result.sort(key=lambda x: x["name"])

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"Successfully exported {len(result)} champions to {out_path} (Meraki positions loaded: {len(meraki_data)})!")


if __name__ == "__main__":
    main()

