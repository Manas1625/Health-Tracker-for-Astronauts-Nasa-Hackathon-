
"""
app.py

AstroHealth Flask API.

This is a separate development server.
It runs on port 5001 so your existing frontend
on port 5000 remains untouched.
"""

from flask import Flask, jsonify, request
from datetime import datetime, timezone
import threading
from backend.detection import (
    detect_radiation_anomaly,
    evaluate_reading
)

from flask_cors import CORS

from backend.config import (
    ASTRONAUTS,
    DISCLAIMER
)

from backend.db import (
    get_latest_reading,
    get_reading_count,
    acknowledge_alert,
    get_latest_radiation_reading,
    get_radiation_readings,
    get_readings_history,
    get_baseline_readings
)
from backend.detection import detect_radiation_anomaly

from backend.alerts import list_alerts
from backend.simulator import simulator
from backend.radiation import fetch_radiation_data, parse_radiation_data, save_radiation_data
from backend.detection import INDICATOR_INFO, RECOMMENDED_ACTIONS

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
    
@app.route("/api/crew", methods=["GET"])
def get_crew():

    crew = []

    for astronaut_id, profile in ASTRONAUTS.items():

        crew.append({
            "id": astronaut_id,
            "name": profile["name"],
            "role": profile["role"],
            "mission": profile["mission"]
        })

    return jsonify({
        "success": True,
        "data": crew
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
        
    reading["health_status"] = evaluate_reading(reading)

    return jsonify({

        "success": True,

        "data": reading,

        "readings_stored": get_reading_count(astronaut_id),

        "disclaimer": DISCLAIMER

    }), 200



# --------------------------------------------------
# FRONTEND SUPPORT ENDPOINTS
# --------------------------------------------------

@app.route("/api/status", methods=["GET"])
def latest_status():
    astronaut_id = request.args.get("astronaut", "AH-001")
    if astronaut_id not in ASTRONAUTS:
        return jsonify({"success": False, "error": "Unknown astronaut ID."}), 404
    reading = get_latest_reading(astronaut_id)
    if reading is None:
        return jsonify({"success": False, "error": "No readings available."}), 404
    status = evaluate_reading(reading)
    status["overall"] = status.get("overall_status", "NORMAL")
    return jsonify({"success": True, "data": status}), 200


@app.route("/api/vitals/history", methods=["GET"])
def vitals_history():
    astronaut_id = request.args.get("astronaut", "AH-001")
    if astronaut_id not in ASTRONAUTS:
        return jsonify({"success": False, "error": "Unknown astronaut ID."}), 404
    try:
        limit = int(request.args.get("limit", 30))
    except ValueError:
        return jsonify({"success": False, "error": "Limit must be a number."}), 400
    if not 1 <= limit <= 500:
        return jsonify({"success": False, "error": "Limit must be between 1 and 500."}), 400
    return jsonify({
        "success": True,
        "data": get_readings_history(astronaut_id, limit),
        "count": len(get_readings_history(astronaut_id, limit)),
        "data_source": "SIMULATED"
    }), 200


@app.route("/api/baseline", methods=["GET"])
def astronaut_baseline():
    astronaut_id = request.args.get("astronaut", "AH-001")
    if astronaut_id not in ASTRONAUTS:
        return jsonify({"success": False, "error": "Unknown astronaut ID."}), 404
    rows = get_baseline_readings(astronaut_id, 30)
    if not rows:
        return jsonify({"success": False, "error": "Baseline readings are not available yet."}), 404
    fields = ("heart_rate", "spo2", "temperature", "blood_glucose", "sleep_hours", "mood", "stress")
    baseline = {
        field: round(sum(float(row[field]) for row in rows) / len(rows), 2)
        for field in fields
    }
    return jsonify({
        "success": True,
        "data": baseline,
        "sample_count": len(rows),
        "method": "MEAN OF FIRST 30 STORED READINGS",
        "data_source": "SIMULATED"
    }), 200


@app.route("/api/guidance/<indicator>", methods=["GET"])
def indicator_guidance(indicator):
    if indicator not in INDICATOR_INFO:
        return jsonify({"success": False, "error": "Unknown health indicator."}), 404
    info = INDICATOR_INFO[indicator]
    return jsonify({
        "success": True,
        "data": {
            "title": info["name"],
            "explanation": info["messages"]["GREEN"],
            "measurement": "Use approved onboard measurement equipment and follow mission procedures.",
            "actions": RECOMMENDED_ACTIONS["YELLOW"]
        }
    }), 200


@app.route("/api/delay", methods=["POST"])
def set_communication_delay():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"success": False, "error": "Request body must be valid JSON."}), 400
    try:
        minutes = int(payload.get("minutes", 20))
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Minutes must be an integer."}), 400
    if not 0 <= minutes <= 240:
        return jsonify({"success": False, "error": "Minutes must be between 0 and 240."}), 400
    return jsonify({
        "success": True,
        "message": "Communication delay setting accepted by the prototype.",
        "minutes": minutes,
        "note": "This endpoint records the UI setting; it does not delay network traffic."
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
# NASA RADIATION DATA
# --------------------------------------------------

@app.route("/api/radiation/latest", methods=["GET"])
def latest_radiation():
    instrument_id = request.args.get("instrument")
    if instrument_id and instrument_id not in ("DosTel1", "DosTel2"):
        return jsonify({"success": False, "error": "Invalid instrument ID."}), 400

    reading = get_latest_radiation_reading(instrument_id)
    if reading is None:
        return jsonify({
            "success": True,
            "source": "NASA OSDR RadLab",
            "data_type": "HISTORICAL ISS ENVIRONMENTAL MEASUREMENT",
            "data": None,
            "message": "No NASA RadLab records are stored yet. The backend will attempt a NASA data sync at startup."
        }), 200

    instrument_history = get_radiation_readings(limit=1000, instrument_id=reading["instrument_id"])
    anomaly = detect_radiation_anomaly(reading, instrument_history)
    return jsonify({
        "success": True,
        "source": "NASA OSDR RadLab",
        "data_type": "HISTORICAL ISS ENVIRONMENTAL MEASUREMENT",
        "data": reading,
        "anomaly": anomaly
    }), 200


@app.route("/api/radiation/history", methods=["GET"])
def radiation_history():

    instrument_id = request.args.get("instrument")

    if instrument_id and instrument_id not in ("DosTel1", "DosTel2"):
        return jsonify({
            "success": False,
            "error": "Invalid instrument ID."
        }), 400

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

    readings = get_radiation_readings(
        limit=limit,
        instrument_id=instrument_id
    )

    return jsonify({
        "success": True,
        "source": "NASA OSDR RadLab",
        "data_type": "HISTORICAL ISS ENVIRONMENTAL MEASUREMENTS",
        "count": len(readings),
        "data": readings
    }), 200
    
@app.route("/api/radiation/anomaly", methods=["GET"])
def radiation_anomaly():

    results = {}

    instruments = ["DosTel1", "DosTel2"]

    for instrument_id in instruments:

        reading = get_latest_radiation_reading(instrument_id)

        if reading is None:
            results[instrument_id] = {
                "status": "NO_DATA",
                "message": "No radiation readings available."
            }
            continue

        history = get_radiation_readings(
            limit=1000,
            instrument_id=instrument_id
        )

        result = detect_radiation_anomaly(
            reading,
            history
        )

        results[instrument_id] = result

    return jsonify({
        "success": True,
        "source": "NASA OSDR RadLab",
        "data_type": "HISTORICAL ISS ENVIRONMENTAL MEASUREMENTS",
        "data": results
    }), 200
    
    


def sync_nasa_radiation():
    """Fetch the configured historical ISS DosTel sample from NASA RadLab and persist it."""
    try:
        result = fetch_radiation_data()
        if not result.get("success"):
            print("NASA RADLAB SYNC FAILED:", result.get("error", "Unknown error"))
            return
        records = parse_radiation_data(result.get("data"))
        inserted = save_radiation_data(records)
        print(
            "NASA RADLAB SYNC:",
            len(records), "records parsed;",
            inserted, "new records stored."
        )
    except Exception as error:
        print("NASA RADLAB SYNC ERROR:", error)


# --------------------------------------------------
# START SERVER
# --------------------------------------------------

if __name__ == "__main__":

    simulator.start()

    # NASA RadLab data is historical ISS instrument data, not live astronaut telemetry.
    threading.Thread(target=sync_nasa_radiation, name="NASARadLabSync", daemon=True).start()

    app.run(

        host="0.0.0.0",

        port=5001,

        debug=False,

        use_reloader=False,

        threaded=True

    )