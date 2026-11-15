
"""
test_detection.py

Automated tests for AstroHealth status engine.
"""

import sys
import os
import unittest

# Allow tests to import backend modules.
sys.path.insert(
    0,
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)

from detection import (
    evaluate_indicator,
    evaluate_reading
)


class TestIndicatorStatus(unittest.TestCase):

    def test_normal_heart_rate(self):

        result = evaluate_indicator(
            "heart_rate",
            75
        )

        self.assertEqual(
            result["status"],
            "GREEN"
        )

    def test_warning_heart_rate(self):

        result = evaluate_indicator(
            "heart_rate",
            115
        )

        self.assertEqual(
            result["status"],
            "YELLOW"
        )

    def test_critical_heart_rate(self):

        result = evaluate_indicator(
            "heart_rate",
            150
        )

        self.assertEqual(
            result["status"],
            "RED"
        )

    def test_normal_spo2(self):

        result = evaluate_indicator(
            "spo2",
            98
        )

        self.assertEqual(
            result["status"],
            "GREEN"
        )

    def test_low_spo2(self):

        result = evaluate_indicator(
            "spo2",
            85
        )

        self.assertEqual(
            result["status"],
            "RED"
        )

    def test_high_temperature(self):

        result = evaluate_indicator(
            "temperature",
            39.5
        )

        self.assertEqual(
            result["status"],
            "RED"
        )

    def test_low_sleep(self):

        result = evaluate_indicator(
            "sleep_hours",
            4
        )

        self.assertEqual(
            result["status"],
            "ORANGE"
        )

    def test_high_stress(self):

        result = evaluate_indicator(
            "stress",
            5
        )

        self.assertEqual(
            result["status"],
            "RED"
        )

    def test_invalid_indicator(self):

        with self.assertRaises(ValueError):

            evaluate_indicator(
                "unknown_indicator",
                100
            )

    def test_invalid_numeric_value(self):

        with self.assertRaises(ValueError):

            evaluate_indicator(
                "heart_rate",
                float("nan")
            )

    def test_overall_critical_status(self):

        reading = {

            "astronaut_id": "AH-001",

            "heart_rate": 75,

            "spo2": 85,

            "temperature": 36.7,

            "systolic": 115,

            "diastolic": 75,

            "blood_glucose": 95,

            "sleep_hours": 8,

            "mood": 4,

            "stress": 2

        }

        result = evaluate_reading(reading)

        self.assertEqual(
            result["overall_status"],
            "CRITICAL"
        )

        self.assertEqual(
            result["worst_indicator"],
            "spo2"
        )

    def test_overall_normal_status(self):

        reading = {

            "astronaut_id": "AH-001",

            "heart_rate": 75,

            "spo2": 98,

            "temperature": 36.7,

            "systolic": 115,

            "diastolic": 75,

            "blood_glucose": 95,

            "sleep_hours": 8,

            "mood": 4,

            "stress": 2

        }

        result = evaluate_reading(reading)

        self.assertEqual(
            result["overall_status"],
            "NORMAL"
        )

    def test_missing_indicator(self):

        reading = {

            "astronaut_id": "AH-001",

            "heart_rate": 75

        }

        with self.assertRaises(ValueError):

            evaluate_reading(reading)


if __name__ == "__main__":

    unittest.main(verbosity=2)
