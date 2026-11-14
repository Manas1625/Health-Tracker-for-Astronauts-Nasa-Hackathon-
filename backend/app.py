
"""
app.py

AstroHealth Flask API.

This is a separate development server.
It runs on port 5001 so your existing frontend
on port 5000 remains untouched.
"""

from flask import Flask, jsonify, request

from flask_cors import CORS

from backend.config import (
    ASTRONAUTS,
    DISCLAIMER
)

from backend.db import (
    get_latest_reading,
    get_reading_count,
    acknowledge_alert
)

from backend.alerts import list_alerts
from backend.simulator import simulator

app = Flask(__name__)

CORS(app)

# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.route("/api/health-check", methods=["GET"])
def health_check():

    return jsonify({

        "success": True,

        "application": "AstroHealth",

        "backend": "ONLINE",

        "database": "SQLite",

        "simulation": "RUNNING" if simulator.running else "STOPPED",

        "astronauts": len(ASTRONAUTS),

        "data_source": "SIMULATED",

        "disclaimer": DISCLAIMER

    }), 200

# --------------------------------------------------
# LATEST VITALS
# --------------------------------------------------

@app.route("/api/vitals/latest", methods=["GET"])
def latest_vitals():

    astronaut_id = request.args.get(
        "astronaut",
        "AH-001"
    )

    if astronaut_id not in ASTRONAUTS:

        return jsonify({

            "success": False,

            "error": "Unknown astronaut ID."

        }), 404

    reading = get_latest_reading(astronaut_id)

    if reading is None:

        return jsonify({

            "success": False,

            "error": "No readings available."

        }), 404

    return jsonify({

        "success": True,

        "data": reading,

        "readings_stored": get_reading_count(astronaut_id),

        "disclaimer": DISCLAIMER

    }), 200

# --------------------------------------------------
# SCENARIO CONTROL
# --------------------------------------------------

@app.route("/api/scenario", methods=["POST"])
def change_scenario():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):

        return jsonify({

            "success": False,

            "error": "Request body must be valid JSON."

        }), 400

    mode = data.get("mode")

    astronaut = data.get("astronaut", "all")

    if not isinstance(mode, str):

        return jsonify({

            "success": False,

            "error": "Mode must be a string."

        }), 400

    mode = mode.upper()

    if mode not in ("NORMAL", "WARNING", "CRITICAL"):

        return jsonify({

            "success": False,

            "error": "Mode must be normal, warning or critical."

        }), 400

    if not isinstance(astronaut, str):

        return jsonify({

            "success": False,

            "error": "Astronaut must be a string."

        }), 400

    if astronaut != "all" and astronaut not in ASTRONAUTS:

        return jsonify({

            "success": False,

            "error": "Unknown astronaut ID."

        }), 404

    simulator.set_scenario(mode, astronaut)

    return jsonify({

        "success": True,

        "message": "Simulation scenario updated.",

        "mode": mode,

        "astronaut": astronaut,

        "data_source": "SIMULATED",

        "disclaimer": DISCLAIMER

    }), 200
    
# --------------------------------------------------
# ALERTS
# --------------------------------------------------

@app.route("/api/alerts", methods=["GET"])
def get_alerts_route():

    astronaut_id = request.args.get("astronaut")

    if astronaut_id and astronaut_id not in ASTRONAUTS:
        return jsonify({
            "success": False,
            "error": "Unknown astronaut ID."
        }), 404

    unacknowledged_only = (
        request.args.get("unacknowledged_only", "false").lower()
        == "true"
    )

    try:
        limit = int(request.args.get("limit", 100))
    except ValueError:
        return jsonify({
            "success": False,
            "error": "Limit must be a number."
        }), 400

    if not 1 <= limit <= 500:
        return jsonify({
            "success": False,
            "error": "Limit must be between 1 and 500."
        }), 400

    alerts = list_alerts(
        astronaut_id=astronaut_id,
        limit=limit,
        unacknowledged_only=unacknowledged_only
    )

    return jsonify({
        "success": True,
        "count": len(alerts),
        "data": alerts,
        "disclaimer": DISCLAIMER
    }), 200
    
@app.route("/api/alerts/<int:alert_id>/acknowledge", methods=["POST"])
def acknowledge_alert_route(alert_id):

    success = acknowledge_alert(alert_id)

    if not success:
        return jsonify({
            "success": False,
            "error": "Alert not found."
        }), 404

    return jsonify({
        "success": True,
        "message": "Alert acknowledged.",
        "alert_id": alert_id
    }), 200

# --------------------------------------------------
# START SERVER
# --------------------------------------------------

if __name__ == "__main__":

    simulator.start()

    app.run(

        host="127.0.0.1",

        port=5001,

        debug=False,

        use_reloader=False,

        threaded=True

    )