
"""
detection.py

AstroHealth health status evaluation engine.

Uses illustrative thresholds from config.py.

No machine learning is used in this module.
This is a transparent, rule-based system.
"""

import math

from backend.config import STATUS_THRESHOLDS, STATUS_PRIORITY, OVERALL_STATUS


# --------------------------------------------------
# INDICATOR INFORMATION
# --------------------------------------------------

INDICATOR_INFO = {

    "heart_rate": {
        "unit": "bpm",
        "name": "Heart Rate",
        "messages": {
            "GREEN": "Heart rate is within the illustrative normal range.",
            "YELLOW": "Heart rate is slightly outside the expected range. Continue monitoring.",
            "ORANGE": "Heart rate is significantly outside the expected range. Follow the approved medical protocol.",
            "RED": "Heart rate has reached the prototype's highest alert level. Contact the flight surgeon."
        }
    },

    "spo2": {
        "unit": "%",
        "name": "Oxygen Saturation",
        "messages": {
            "GREEN": "Oxygen saturation is within the illustrative expected range.",
            "YELLOW": "Oxygen saturation is slightly reduced. Recheck the measurement.",
            "ORANGE": "Oxygen saturation is significantly reduced. Follow the approved medical protocol.",
            "RED": "Oxygen saturation has reached the prototype's highest alert level. Contact the flight surgeon."
        }
    },

    "temperature": {
        "unit": "°C",
        "name": "Body Temperature",
        "messages": {
            "GREEN": "Body temperature is within the illustrative expected range.",
            "YELLOW": "Body temperature is slightly outside the expected range.",
            "ORANGE": "Body temperature is significantly outside the expected range.",
            "RED": "Body temperature has reached the prototype's highest alert level. Contact the flight surgeon."
        }
    },

    "systolic": {
        "unit": "mmHg",
        "name": "Systolic Blood Pressure",
        "messages": {
            "GREEN": "Systolic pressure is within the illustrative expected range.",
            "YELLOW": "Systolic pressure requires monitoring.",
            "ORANGE": "Systolic pressure is significantly outside the expected range.",
            "RED": "Systolic pressure has reached the prototype's highest alert level. Contact the flight surgeon."
        }
    },

    "diastolic": {
        "unit": "mmHg",
        "name": "Diastolic Blood Pressure",
        "messages": {
            "GREEN": "Diastolic pressure is within the illustrative expected range.",
            "YELLOW": "Diastolic pressure requires monitoring.",
            "ORANGE": "Diastolic pressure is significantly outside the expected range.",
            "RED": "Diastolic pressure has reached the prototype's highest alert level. Contact the flight surgeon."
        }
    },

    "blood_glucose": {
        "unit": "mg/dL",
        "name": "Blood Glucose",
        "messages": {
            "GREEN": "Blood glucose is within the illustrative expected range.",
            "YELLOW": "Blood glucose requires monitoring and a repeat measurement.",
            "ORANGE": "Blood glucose is significantly outside the expected range.",
            "RED": "Blood glucose has reached the prototype's highest alert level. Contact the flight surgeon."
        }
    },

    "sleep_hours": {
        "unit": "hours",
        "name": "Sleep Duration",
        "messages": {
            "GREEN": "Sleep duration is within the illustrative target range.",
            "YELLOW": "Sleep duration is below or above the illustrative target.",
            "ORANGE": "Sleep duration is significantly outside the illustrative target.",
            "RED": "Sleep duration has reached the prototype's highest alert level. Review with the medical team."
        }
    },

    "mood": {
        "unit": "/5",
        "name": "Mood",
        "messages": {
            "GREEN": "Reported mood is positive.",
            "YELLOW": "Reported mood suggests increased behavioral health monitoring may be useful.",
            "ORANGE": "Reported mood suggests additional crew support should be considered.",
            "RED": "Reported mood requires prompt attention from the medical and behavioral health team."
        }
    },

    "stress": {
        "unit": "/5",
        "name": "Stress",
        "messages": {
            "GREEN": "Reported stress is within the illustrative expected range.",
            "YELLOW": "Reported stress is elevated. Consider a wellbeing check.",
            "ORANGE": "Reported stress is significantly elevated. Consider additional crew support.",
            "RED": "Reported stress has reached the prototype's highest alert level. Contact the appropriate medical team."
        }
    }
}


# --------------------------------------------------
# RECOMMENDED ACTIONS
# --------------------------------------------------

RECOMMENDED_ACTIONS = {

    "GREEN": [
        "Continue routine health monitoring.",
        "Maintain normal mission wellness activities."
    ],

    "YELLOW": [
        "Repeat the measurement to confirm the reading.",
        "Record symptoms and relevant activities.",
        "Continue monitoring."
    ],

    "ORANGE": [
        "Repeat the measurement if safe and appropriate.",
        "Check for associated symptoms.",
        "Follow the mission's approved medical protocol.",
        "Notify the medical team according to mission procedures."
    ],

    "RED": [
        "Contact the flight surgeon immediately according to mission procedures.",
        "Follow approved emergency medical protocols.",
        "Do not rely on this prototype for diagnosis or treatment."
    ]
}


# --------------------------------------------------
# INTERNAL VALIDATION
# --------------------------------------------------

def validate_number(value):

    if isinstance(value, bool):

        raise ValueError("Boolean values are not valid readings.")

    try:

        number = float(value)

    except (TypeError, ValueError):

        raise ValueError("Reading must be a valid number.")

    if not math.isfinite(number):

        raise ValueError("Reading must be finite.")

    return number


# --------------------------------------------------
# SINGLE INDICATOR EVALUATION
# --------------------------------------------------

def evaluate_indicator(indicator, value):
    """
    Evaluate one health indicator.

    Returns:
        indicator
        name
        value
        unit
        status
        message
        recommended_actions
    """

    if indicator not in STATUS_THRESHOLDS:

        raise ValueError(
            f"Unknown indicator: {indicator}"
        )

    number = validate_number(value)

    thresholds = STATUS_THRESHOLDS[indicator]

    status = None

    # Check severity ranges.
    for severity in (
        "RED",
        "ORANGE",
        "YELLOW",
        "GREEN"
    ):

        ranges = thresholds[severity]

        for lower, upper in ranges:

            lower_match = (
                lower is None or number >= lower
            )

            upper_match = (
                upper is None or number <= upper
            )

            if lower_match and upper_match:

                status = severity

                break

        if status is not None:

            break

    if status is None:

        raise ValueError(
            f"No status configured for {indicator}={number}"
        )

    info = INDICATOR_INFO[indicator]

    return {

        "indicator": indicator,

        "name": info["name"],

        "value": number,

        "unit": info["unit"],

        "status": status,

        "message": info["messages"][status],

        "recommended_actions": (
            RECOMMENDED_ACTIONS[status].copy()
        ),

        "data_source": "SIMULATED",

        "disclaimer": DISCLAIMER

    }


# --------------------------------------------------
# COMPLETE READING EVALUATION
# --------------------------------------------------

def evaluate_reading(reading):
    """
    Evaluate every available configured indicator.

    Returns an overall astronaut health status.
    """

    results = {}

    for indicator in STATUS_THRESHOLDS:

        if indicator not in reading:

            raise ValueError(
                f"Missing indicator: {indicator}"
            )

        results[indicator] = evaluate_indicator(
            indicator,
            reading[indicator]
        )

    # Find the most severe indicator.
    worst_indicator = max(

        results,

        key=lambda key: STATUS_PRIORITY[
            results[key]["status"]
        ]

    )

    worst_status = results[
        worst_indicator
    ]["status"]

    overall_flag = OVERALL_STATUS[worst_status]

    return {

        "astronaut_id": reading.get(
            "astronaut_id"
        ),

        "overall_status": overall_flag,

        "worst_indicator": worst_indicator,

        "worst_severity": worst_status,

        "indicators": results,

        "data_source": "SIMULATED",

        "disclaimer": DISCLAIMER

    }


# --------------------------------------------------
# ALL ASTRONAUTS
# --------------------------------------------------

def evaluate_crew(latest_readings):
    """
    Evaluate the latest readings for multiple astronauts.
    """

    crew_results = []

    for reading in latest_readings:

        result = evaluate_reading(reading)

        crew_results.append(result)

    return crew_results
