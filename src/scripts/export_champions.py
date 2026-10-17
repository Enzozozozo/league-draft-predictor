import json
from pathlib import Path
from src.backend.ai_model import MobalyticsJoblibModel, MonotonicCalibratedForest
from src.backend.champion_data import ChampionDataManager

def main():
    cdm = ChampionDataManager()
    model = MobalyticsJoblibModel()

    with open('.cache/ddragon/champions.json', 'r', encoding='utf-8') as f:
        champs_raw = json.load(f)

    # Archetype heuristics based on tags, stats, and canonical LoL classes
    def get_archetype(champ_data):
        tags = champ_data.get("tags", [])
        info = champ_data.get("info", {})
        name = champ_data.get("name", "")
        attack = info.get("attack", 5)
        defense = info.get("defense", 5)
        magic = info.get("magic", 5)

        # Explicit overrides for famous champions
        known = {
            "Aatrox": "Juggernaut", "Darius": "Juggernaut", "Garen": "Juggernaut", "Mordekaiser": "Juggernaut",
            "Illaoi": "Juggernaut", "Sett": "Juggernaut", "Urgot": "Juggernaut", "Dr. Mundo": "Juggernaut",
            "Lee Sin": "Diver", "Camille": "Diver", "Hecarim": "Diver", "Jarvan IV": "Diver", "Vi": "Diver",
            "Ahri": "Burst Mage", "Syndra": "Burst Mage", "Annie": "Burst Mage", "Veigar": "Burst Mage", "LeBlanc": "Burst Assassin",
            "Jinx": "Hypercarry", "Kog'Maw": "Hypercarry", "Vayne": "Hypercarry", "Twitch": "Hypercarry", "Aphelios": "Hypercarry",
            "Ezreal": "Poke Marksman", "Varus": "Poke Marksman", "Corki": "Artillery Marksman",
            "Malphite": "Vanguard Tank", "Leona": "Vanguard Tank", "Nautilus": "Vanguard Tank", "Ornn": "Vanguard Tank",
            "Thresh": "Catcher", "Blitzcrank": "Catcher", "Pyke": "Assassin Catcher", "Morgana": "Catcher Mage",
            "Lulu": "Enchanter", "Nami": "Enchanter", "Janna": "Enchanter", "Sona": "Enchanter", "Soraka": "Enchanter",
            "Wukong": "Skirmisher", "Sylas": "Burst Bruiser", "Yasuo": "Skirmisher", "Yone": "Skirmisher",
            "Fiora": "Duelist", "Jax": "Skirmisher", "Riven": "Skirmisher", "Irelia": "Diver",
            "Zed": "AD Assassin", "Talon": "AD Assassin", "Akali": "AP Assassin", "Kha'Zix": "AD Assassin",
            "Karthus": "Battlemage", "Aurelion Sol": "Battlemage", "Cassiopeia": "Battlemage", "Ryze": "Battlemage",
            "Xerath": "Artillery Mage", "Vel'Koz": "Artillery Mage", "Lux": "Artillery Mage", "Ziggs": "Artillery Mage",
            "Warwick": "Diver Bruiser", "Nunu & Willump": "Vanguard Tank", "Rengar": "AD Assassin", "Samira": "Skirmisher ADC",
            "Shaco": "Trickster Assassin", "Alistar": "Vanguard Tank", "Braum": "Warden Tank"
        }
        if name in known:
            return known[name]

        if "Support" in tags:
            return "Enchanter" if magic > defense else "Catcher / Warden"
        if "Tank" in tags:
            return "Vanguard Tank" if attack > 4 else "Warden Tank"
        if "Marksman" in tags:
            return "Hypercarry" if attack > 7 else "Poke Marksman"
        if "Assassin" in tags:
            return "Burst Assassin" if magic > attack else "Lethality Assassin"
        if "Mage" in tags:
            return "Artillery Mage" if attack < 3 else "Battlemage"
        if "Fighter" in tags:
            return "Juggernaut" if defense > 6 else "Skirmisher"
        return "Specialist"

    # Role heuristics (TOP, JGL, MID, BOT, SUP)
    def get_roles(champ_data):
        tags = champ_data.get("tags", [])
        name = champ_data.get("name", "")

        known_roles = {
            "Aatrox": ["TOP"], "Lee Sin": ["JGL"], "Ahri": ["MID"], "Jinx": ["BOT"], "Thresh": ["SUP"],
            "Malphite": ["TOP", "MID"], "Wukong": ["JGL", "TOP"], "Sylas": ["MID", "TOP"],
            "Ezreal": ["BOT", "MID"], "Leona": ["SUP"], "Akali": ["MID", "TOP"], "Zed": ["MID", "JGL"],
            "K'Sante": ["TOP"], "Nautilus": ["SUP"], "Fiora": ["TOP"], "Blitzcrank": ["SUP"],
            "Ornn": ["TOP"], "Yasuo": ["MID", "TOP", "BOT"], "Warwick": ["JGL", "TOP"],
            "Nunu & Willump": ["JGL"], "Karthus": ["JGL", "BOT", "MID"], "Rengar": ["JGL", "TOP"],
            "Samira": ["BOT"], "Shaco": ["JGL", "SUP"], "Talon": ["MID", "JGL"], "Alistar": ["SUP"],
            "Aurelion Sol": ["MID"], "Darius": ["TOP"], "Garen": ["TOP"], "Sett": ["TOP", "MID"],
            "Vayne": ["BOT", "TOP"], "Kai'Sa": ["BOT"], "Caitlyn": ["BOT"], "Lucian": ["BOT", "MID"],
            "Lulu": ["SUP"], "Janna": ["SUP"], "Nami": ["SUP"], "Soraka": ["SUP"], "Milio": ["SUP"],
            "Hecarim": ["JGL"], "Kayn": ["JGL"], "Vi": ["JGL"], "Jarvan IV": ["JGL"], "Sejuani": ["JGL", "TOP"],
            "Syndra": ["MID"], "Orianna": ["MID"], "Viktor": ["MID"], "Veigar": ["MID", "BOT"],
            "Lux": ["SUP", "MID"], "Xerath": ["SUP", "MID"], "Brand": ["SUP", "JGL", "MID"],
            "Morgana": ["SUP", "JGL"], "Pyke": ["SUP", "MID"], "Senna": ["SUP", "BOT"]
        }
        if name in known_roles:
            return known_roles[name]

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

        # Deduplicate while preserving order
        seen = set()
        clean_roles = []
        for r in roles:
            if r not in seen:
                seen.add(r)
                clean_roles.append(r)
        return clean_roles if clean_roles else ["MID"]

    result = []
    for key, c in champs_raw.items():
        cid = int(c["key"])
        cname = c["name"]
        raw_wr = model.champ_wr_dict.get(cid, 0.50)
        win_rate = round(raw_wr * 100.0, 1)

        profile = cdm.get_profile(cid)
        archetype = get_archetype(c)
        roles = get_roles(c)

        result.append({
            "id": c["id"],
            "key": cid,
            "name": cname,
            "title": c.get("title", ""),
            "image": f"https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/{c['id']}.png",
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

    out_path = Path("src/frontend/data/champions.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"Successfully exported {len(result)} champions to {out_path}!")

if __name__ == "__main__":
    main()
