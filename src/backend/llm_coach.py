"""LLM Coaching & Strategic Analysis Pipeline.

Extracts DDragon tactical metadata and macro composition differentials,
structures them into a prompt template, and invokes Groq (qwen/qwen3.8-27b)
with strict JSON validation and a deterministic heuristic fallback.
"""

import json
import logging
import os
from typing import Dict, Any, List
import requests
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("LLMCoach")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

COACH_SYSTEM_PROMPT = """Challenger LoL analyst. Return JSON only matching schema.
Rules:
1. Base advice on champion tags and differentials.
2. Focus on wave tempo, choke points, flank vision. No ability/item names.
3. Max 18 words per bullet. Raw JSON only.
4. Each spikeNote explains why the favored side leads that game phase, max 10 words.
"""

COACH_USER_PROMPT_TEMPLATE = """Blue: {blue_team_summary}
Red: {red_team_summary}
Diffs: Dmg(B:{blue_ad}%AD/{blue_ap}%AP, R:{red_ad}%AD/{red_ap}%AP), Engage({engage_adv}), Peel({disengage_adv}), Poke({poke_adv}), Scaling({scaling_adv})
Power curve: {spike_summary}

Schema:
{{
  "title": "Strategy title (max 4 words)",
  "summary": "1-sentence macro directive",
  "blueExecution": ["Priority 1", "Priority 2", "Priority 3"],
  "redExecution": ["Priority 1", "Priority 2", "Priority 3"],
  "spikeNotes": ["Early game note", "Mid game note", "Late game note"]
}}"""


def _format_spike_summary(power_spikes: List[Dict[str, Any]]) -> str:
    if not power_spikes:
        return "n/a"
    return ", ".join(
        f"{s.get('phase', 'Phase')} {s.get('favoredSide', 'Even')} {s.get('delta', '')}".strip()
        for s in power_spikes
    )


def _fallback_spike_notes(power_spikes: List[Dict[str, Any]]) -> List[str]:
    """Deterministic per-phase notes used when the LLM is offline or returns malformed data."""
    templates = [
        "{side} lane priority and jungle tempo lead.",
        "{side} sets up objectives and wins first fights.",
        "{side} scaling and teamfight edge takes over.",
    ]
    return [
        templates[i].format(side=(power_spikes[i].get("favoredSide", "Blue") if i < len(power_spikes) else "Blue"))
        for i in range(3)
    ]


def _generate_heuristic_fallback(
    blue_profiles: List[Dict[str, Any]],
    red_profiles: List[Dict[str, Any]],
    tactical_dims: List[Dict[str, Any]],
    blue_dmg: Dict[str, Any],
    red_dmg: Dict[str, Any],
    power_spikes: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Generates a high-signal deterministic coaching response if LLM is offline or unconfigured."""
    b_names = [p.get("name", "Ally") for p in blue_profiles]
    r_names = [p.get("name", "Enemy") for p in red_profiles]

    engage_dim = next((d for d in tactical_dims if d.get("name") == "Hard Engage"), {})
    scaling_dim = next((d for d in tactical_dims if d.get("name") == "Late-Game Scaling"), {})

    b_engage = engage_dim.get("blue", 5.0)
    r_engage = engage_dim.get("red", 5.0)
    b_scaling = scaling_dim.get("blue", 5.0)
    r_scaling = scaling_dim.get("red", 5.0)

    # Determine core macro themes
    if b_engage > r_engage + 1.0:
        title = "Hard Engage & Choke Control Priority"
        summary = f"Blue controls primary teamfight initiation with superior front-to-back engage ({b_engage:.1f} vs {r_engage:.1f})."
        blue_exec = [
            f"Establish river vision 60s before Dragons to force fights in narrow choke points.",
            f"Layer frontline crowd control onto {r_names[3] if len(r_names) > 3 else 'enemy carries'} before they can space.",
            f"Nullify enemy poke by committing decisively rather than taking free siege damage."
        ]
        red_exec = [
            f"Kite backwards and disengage initial collapse with perimeter vision.",
            f"Whittle down Blue frontline with long-range poke before neutral spawns.",
            f"Look for side-lane split pressure to prevent grouped 5v5 teamfights."
        ]
    elif r_engage > b_engage + 1.0:
        title = "Disengage & Defensive Spacing Priority"
        summary = f"Red brings high-threat engage ({r_engage:.1f}); Blue must prioritize defensive peel and counter-collapse."
        blue_exec = [
            f"Track flank teleport wards around Baron and Dragon pits.",
            f"Reserve key crowd control tools strictly to peel incoming divers off the backline.",
            f"Bait enemy over-commitment into counter-engage opportunities."
        ]
        red_exec = [
            f"Collapse on isolated Blue carries before peel anchors can react.",
            f"Force high-tempo fights before Blue reaches multi-item power spikes.",
            f"Clear Blue defensive vision to create unseen flank angles."
        ]
    elif b_scaling >= r_scaling:
        title = "Late-Game Scaling & Tempo Control"
        summary = "Blue holds superior late-game scaling; stabilize early neutral trades and play for 3-item spikes."
        blue_exec = [
            f"Avoid coin-flip skirmishes pre-15 minutes and secure cross-map wave farm.",
            f"Trade early dragons for tower plates to accelerate carry item completions.",
            f"Group tightly for 5v5 front-to-back teamfights in the late game."
        ]
        red_exec = [
            f"Snowball early Rift Heralds and aggressively invade Blue jungle camps.",
            f"Force neutral fights before Blue carries attain 2-3 core items.",
            f"Accelerate match pace through relentless side-lane dives."
        ]
    else:
        title = "Early Tempo & Skirmish Advantage"
        summary = "Red outscales in late-game teamfights; Blue must play for early objectives and aggressive plate denial."
        blue_exec = [
            f"Leverage early laning priority to stack Dragons and invade enemy camps.",
            f"Break outer turrets quickly to open up the jungle for rotational picks.",
            f"Close out match before enemy carries hit level 16 scaling thresholds."
        ]
        red_exec = [
            f"Concede contested early dragons to absorb waves safely under tower.",
            f"Ward jungle entrances defensively to survive early dive pressure.",
            f"Stall match out to 30+ minutes for late-game teamfight dominance."
        ]

    # Specific damage profile warnings
    if blue_dmg.get("ad", 50) >= 80:
        blue_exec[2] = f"Heavy AD draft ({blue_dmg.get('ad')}%): prioritize Armor Shred items early to prevent tank walling."
    elif blue_dmg.get("ap", 50) >= 75:
        blue_exec[2] = f"Heavy AP draft ({blue_dmg.get('ap')}%): enemy will stack Magic Resist; build early Magic Penetration."

    return {
        "title": title,
        "summary": summary,
        "blueExecution": blue_exec,
        "redExecution": red_exec,
        "spikeNotes": _fallback_spike_notes(power_spikes),
        "isLLM": False,
        "model": "Tactical Engine",
    }


def analyze_draft_with_coach(
    blue_picks: List[Dict[str, Any]],
    red_picks: List[Dict[str, Any]],
    blue_profiles: List[Dict[str, Any]],
    red_profiles: List[Dict[str, Any]],
    tactical_dims: List[Dict[str, Any]],
    blue_dmg: Dict[str, Any],
    red_dmg: Dict[str, Any],
    power_spikes: List[Dict[str, Any]],
    cdm_id_to_data: Dict[int, Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Coordinates context extraction, LLM prompt generation, Groq API call, and validation."""
    api_key = os.getenv("GROQ_API_KEY", "").strip('"\' ')

    # Format champion summaries with DDragon tags and roles in compact notation
    def _format_team(picks, profiles):
        items = []
        for i, p in enumerate(picks):
            cname = p.get("champion", "Unknown")
            role = p.get("role", "ROLE")
            prof = profiles[i] if i < len(profiles) else {}
            tags = prof.get("tags", [])
            tag_str = f"({','.join(tags[:2])})" if tags else ""
            items.append(f"{role}:{cname}{tag_str}")
        return ", ".join(items)

    blue_summary = _format_team(blue_picks, blue_profiles)
    red_summary = _format_team(red_picks, red_profiles)

    def _get_dim(name: str):
        return next((d for d in tactical_dims if d.get("name") == name), {"blue": 5.0, "red": 5.0, "advantageText": "Even"})

    eng = _get_dim("Hard Engage")
    dis = _get_dim("Disengage & Peel")
    poke = _get_dim("Poke & Siege")
    scal = _get_dim("Late-Game Scaling")

    # If no Groq API key is configured, return the deterministic heuristic fallback immediately
    if not api_key:
        logger.info("No GROQ_API_KEY found in environment; using deterministic heuristic coach.")
        return _generate_heuristic_fallback(blue_profiles, red_profiles, tactical_dims, blue_dmg, red_dmg, power_spikes)

    user_prompt = COACH_USER_PROMPT_TEMPLATE.format(
        blue_team_summary=blue_summary,
        red_team_summary=red_summary,
        blue_ad=round(blue_dmg.get("ad", 50)),
        blue_ap=round(blue_dmg.get("ap", 50)),
        red_ad=round(red_dmg.get("ad", 50)),
        red_ap=round(red_dmg.get("ap", 50)),
        engage_adv=eng.get("advantageText", "Even"),
        disengage_adv=dis.get("advantageText", "Even"),
        poke_adv=poke.get("advantageText", "Even"),
        scaling_adv=scal.get("advantageText", "Even"),
        spike_summary=_format_spike_summary(power_spikes),
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": COACH_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 400,
        "response_format": {"type": "json_object"},
    }

    try:
        logger.info("Calling Groq API (%s) for draft tactical coaching...", DEFAULT_MODEL)
        resp = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=6)

        if resp.status_code == 200:
            content = resp.json()["choices"][0]["message"]["content"]
            parsed = json.loads(content)

            # Validate schema
            title = parsed.get("title", "Tactical Draft Win Condition")
            summary = parsed.get("summary", "Execute strategic map movements around key objective timers.")
            b_exec = parsed.get("blueExecution", [])
            r_exec = parsed.get("redExecution", [])
            spike_notes = parsed.get("spikeNotes", [])
            if not (isinstance(spike_notes, list) and len(spike_notes) >= 3):
                spike_notes = _fallback_spike_notes(power_spikes)

            if isinstance(b_exec, list) and len(b_exec) >= 2 and isinstance(r_exec, list) and len(r_exec) >= 2:
                logger.info("Successfully received LLM draft analysis from Groq.")
                return {
                    "title": title,
                    "summary": summary,
                    "blueExecution": b_exec[:3],
                    "redExecution": r_exec[:3],
                    "spikeNotes": [str(n) for n in spike_notes[:3]],
                    "isLLM": True,
                    "model": DEFAULT_MODEL,
                }
            else:
                logger.warning("Groq response JSON missed required execution arrays; falling back.")
        else:
            logger.warning("Groq API returned HTTP %d: %s", resp.status_code, resp.text)
    except Exception as e:
        logger.warning("Groq API call encountered exception (%s); deploying deterministic fallback.", e)

    return _generate_heuristic_fallback(blue_profiles, red_profiles, tactical_dims, blue_dmg, red_dmg, power_spikes)
