"""cPanel Phusion Passenger WSGI entry point for League Draft Predictor.

This file is automatically discovered and loaded by cPanel's "Setup Python App"
via Phusion Passenger WSGI runner. It delegates request handling to Flask.
"""

import sys
import os

# Ensure the project root directory is in the Python module search path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

from flask import Flask, request, jsonify
from flask_cors import CORS

from src.backend.server import (
    run_prediction,
    run_coach_analysis,
    model,
    cdm,
)

app = Flask(__name__)
# Enable Cross-Origin Resource Sharing for frontend domain calls
CORS(app)


@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "status": "online",
        "service": "League Draft Predictor API",
        "model_loaded": bool(model and model.is_loaded),
        "version": getattr(cdm, "latest_version", "unknown"),
    })


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "model_loaded": bool(model and model.is_loaded),
        "model_name": model.get_model_name() if model else "none",
        "champions_count": len(cdm.id_to_name) if cdm else 0,
        "ddragon_version": getattr(cdm, "latest_version", "unknown"),
    })


@app.route("/api/predict", methods=["POST"])
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
    app.run(host="127.0.0.1", port=5001, debug=True)
