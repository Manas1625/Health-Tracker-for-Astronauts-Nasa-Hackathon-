
"""
config.py

Central configuration for AstroHealth.

IMPORTANT:
All thresholds are ILLUSTRATIVE demonstration values.
They are NOT medical advice or validated astronaut
clinical limits.
"""

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATABASE_PATH = os.path.join(BASE_DIR, "astrohealth.db")

SIMULATION_INTERVAL = 2.5
BASELINE_READINGS = 30

DEFAULT_HISTORY_LIMIT = 30
MAX_HISTORY_LIMIT = 500

ASTRONAUTS = {
    "AH-001": {
        "name": "Alex Morgan",
        "role": "Commander",
        "mission": "ORBIT-01",
        "personal": {
            "heart_rate": 75,
            "spo2": 98,
            "temperature": 36.7,
            "systolic": 115,
            "diastolic": 75,
            "blood_glucose": 95,
            "sleep_hours": 7.5,
            "mood": 4,
            "stress": 2
        }
    },
    "AH-002": {
        "name": "Sarah Chen",
        "role": "Flight Engineer",
        "mission": "ORBIT-01",
        "personal": {
            "heart_rate": 72,
            "spo2": 97,
            "temperature": 36.6,
            "systolic": 112,
            "diastolic": 74,
            "blood_glucose": 90,
            "sleep_hours": 8,
            "mood": 4,
            "stress": 2
        }
    },
    "AH-003": {
        "name": "James Wilson",
        "role": "Medical Officer",
        "mission": "ORBIT-01",
        "personal": {
            "heart_rate": 78,
            "spo2": 98,
            "temperature": 36.8,
            "systolic": 118,
            "diastolic": 78,
            "blood_glucose": 100,
            "sleep_hours": 7,
            "mood": 4,
            "stress": 3
        }
    },
    "AH-004": {
        "name": "Elena Rodriguez",
        "role": "Mission Specialist",
        "mission": "ORBIT-01",
        "personal": {
            "heart_rate": 70,
            "spo2": 99,
            "temperature": 36.5,
            "systolic": 110,
            "diastolic": 72,
            "blood_glucose": 92,
            "sleep_hours": 8,
            "mood": 5,
            "stress": 1
        }
    }
}

SCENARIO_TARGETS = {
    "NORMAL": {
        "heart_rate": (65, 85),
        "spo2": (96, 99),
        "temperature": (36.3, 37.2),
        "systolic": (105, 125),
        "diastolic": (65, 85),
        "blood_glucose": (80, 110),
        "sleep_hours": (7, 8.5),
        "mood": (3, 5),
        "stress": (1, 3)
    },
    "WARNING": {
        "heart_rate": (115, 130),
        "spo2": (90, 93),
        "temperature": (37.8, 38.5),
        "systolic": (130, 145),
        "diastolic": (85, 95),
        "blood_glucose": (130, 160),
        "sleep_hours": (4, 5.5),
        "mood": (2, 3),
        "stress": (4, 5)
    },
    "CRITICAL": {
        "heart_rate": (145, 165),
        "spo2": (82, 89),
        "temperature": (39.2, 40.0),
        "systolic": (155, 175),
        "diastolic": (100, 115),
        "blood_glucose": (180, 230),
        "sleep_hours": (2, 3.5),
        "mood": (1, 2),
        "stress": (4, 5)
    }
}

INDICATOR_LIMITS = {
    "heart_rate": (30, 220),
    "spo2": (50, 100),
    "temperature": (30, 43),
    "systolic": (50, 250),
    "diastolic": (30, 150),
    "blood_glucose": (20, 600),
    "sleep_hours": (0, 24),
    "mood": (1, 5),
    "stress": (1, 5)
}

# --------------------------------------------------
# HEALTH STATUS THRESHOLDS
#
# Each status contains inclusive ranges.
# None represents an unbounded end.
# --------------------------------------------------

STATUS_THRESHOLDS = {

    "heart_rate": {
        "GREEN": [(50, 110)],
        "YELLOW": [(45, 49.99), (110.01, 120)],
        "ORANGE": [(40, 44.99), (120.01, 140)],
        "RED": [(None, 39.99), (140.01, None)]
    },

    "spo2": {
        "GREEN": [(95, 100)],
        "YELLOW": [(92, 94.99)],
        "ORANGE": [(90, 91.99)],
        "RED": [(None, 89.99)]
    },

    "temperature": {
        "GREEN": [(35.5, 37.5)],
        "YELLOW": [(35.0, 35.49), (37.51, 38.0)],
        "ORANGE": [(34.0, 34.99), (38.01, 39.0)],
        "RED": [(None, 33.99), (39.01, None)]
    },

    "systolic": {
        "GREEN": [(90, 129)],
        "YELLOW": [(80, 89.99), (129.01, 139)],
        "ORANGE": [(70, 79.99), (139.01, 159)],
        "RED": [(None, 69.99), (159.01, None)]
    },

    "diastolic": {
        "GREEN": [(60, 84)],
        "YELLOW": [(50, 59.99), (84.01, 89)],
        "ORANGE": [(40, 49.99), (89.01, 109)],
        "RED": [(None, 39.99), (109.01, None)]
    },

    "blood_glucose": {
        "GREEN": [(70, 140)],
        "YELLOW": [(60, 69.99), (140.01, 180)],
        "ORANGE": [(50, 59.99), (180.01, 250)],
        "RED": [(None, 49.99), (250.01, None)]
    },

    "sleep_hours": {
        "GREEN": [(7, 12)],
        "YELLOW": [(5, 6.99), (12.01, 14)],
        "ORANGE": [(3, 4.99), (14.01, None)],
        "RED": [(None, 2.99)]
    },

    "mood": {
        "GREEN": [(4, 5)],
        "YELLOW": [(3, 3.99)],
        "ORANGE": [(2, 2.99)],
        "RED": [(None, 1.99)]
    },

    "stress": {
        "GREEN": [(1, 2)],
        "YELLOW": [(2.01, 3)],
        "ORANGE": [(3.01, 4)],
        "RED": [(4.01, None)]
    }
}

STATUS_PRIORITY = {
    "GREEN": 0,
    "YELLOW": 1,
    "ORANGE": 2,
    "RED": 3
}

OVERALL_STATUS = {
    "GREEN": "NORMAL",
    "YELLOW": "WATCH",
    "ORANGE": "WARNING",
    "RED": "CRITICAL"
}

DISCLAIMER = (
    "Prototype for demonstration, not medical advice."
)
