"""cPanel Phusion Passenger WSGI entry point for DRAFTJUDGE.

This file is automatically discovered and loaded by cPanel's "Setup Python App"
via Phusion Passenger WSGI runner. It delegates request handling to Flask.
"""

import sys
import os

# Ensure the project root directory is in the Python module search path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# On shared cPanel hosts (/dev/shm is restricted), ensure temp folder is in home directory
os.environ.setdefault("JOBLIB_TEMP_FOLDER", os.path.join(PROJECT_ROOT, ".cache"))

from dotenv import load_dotenv

# Search for .env in common cPanel deployment paths
for env_path in [
    os.path.join(PROJECT_ROOT, ".env"),
    os.path.join(os.path.dirname(PROJECT_ROOT), ".env"),
    os.path.join(PROJECT_ROOT, "public_html", "draft", ".env"),
    os.path.join(os.path.expanduser("~"), ".env"),
]:
    if os.path.exists(env_path):
        load_dotenv(env_path, override=True)

from flask import Flask, request, jsonify
from flask_cors import CORS

from src.backend.server import (
    run_prediction,
    run_coach_analysis,
    handle_player_match_request,
    model,
    cdm,
)

app = Flask(__name__)
# Enable Cross-Origin Resource Sharing for frontend domain calls
CORS(app)


@app.route("/", methods=["GET"])
@app.route("/draft", methods=["GET"])
def index():
    return jsonify({
        "status": "online",
        "service": "DRAFTJUDGE API Server",
        "model_loaded": bool(model and model.is_loaded),
        "version": getattr(cdm, "latest_version", "unknown"),
    })


@app.route("/api/health", methods=["GET"])
@app.route("/draft/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "model_loaded": bool(model and model.is_loaded),
        "model_name": model.get_model_name() if model else "none",
        "champions_count": len(cdm.id_to_name) if cdm else 0,
        "ddragon_version": getattr(cdm, "latest_version", "unknown"),
    })


@app.route("/api/player-match", methods=["POST"])
@app.route("/draft/api/player-match", methods=["POST"])
@app.route("/api/summoner-draft", methods=["POST"])
@app.route("/draft/api/summoner-draft", methods=["POST"])
def player_match():
    try:
        data = request.get_json(silent=True) or {}
        riot_id = data.get("riotId", "").strip()
        region = data.get("region", "SEA").strip()
        result = handle_player_match_request(riot_id, region)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 200


@app.route("/api/predict", methods=["POST"])
@app.route("/draft/api/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(silent=True) or {}
        blue_picks = data.get("bluePicks", [])
        red_picks = data.get("redPicks", [])
        result = run_prediction(blue_picks, red_picks)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/coach", methods=["POST"])
@app.route("/draft/api/coach", methods=["POST"])
def coach():
    try:
        data = request.get_json(silent=True) or {}
        blue_picks = data.get("bluePicks", [])
        red_picks = data.get("redPicks", [])
        tactical = data.get("tacticalDimensions", [])
        blue_dmg = data.get("blueDamage", {})
        red_dmg = data.get("redDamage", {})
        power_spikes = data.get("powerSpikes", [])
        result = run_coach_analysis(
            blue_picks,
            red_picks,
            tactical,
            blue_dmg,
            red_dmg,
            power_spikes,
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Phusion Passenger looks for the WSGI callable named `application`
application = app

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=False, use_reloader=False)
