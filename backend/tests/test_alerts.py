
import os
import sys
import unittest
import tempfile

sys.path.insert(
    0,
    os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
)

import db
import alerts


class AlertEngineTests(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        db.DATABASE_PATH = os.path.join(
            self.temp_dir.name, "test.db"
        )
        db.init_db()
        alerts._active_alerts.clear()

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_red_status_creates_alert(self):
        result = alerts.process_health_status(
            "AH-001",
            {
                "indicators": {
                    "heart_rate": {
                        "status": "RED",
                        "message": "Heart rate is elevated.",
                        "recommended_action": "Review immediately."
                    }
                }
            }
        )
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["severity"], "RED")

    def test_duplicate_alert_is_suppressed(self):
        status = {
            "indicators": {
                "heart_rate": {"status": "RED"}
            }
        }
        first = alerts.process_health_status("AH-001", status)
        second = alerts.process_health_status("AH-001", status)

        self.assertEqual(len(first), 1)
        self.assertEqual(len(second), 0)

    def test_severity_change_creates_new_alert(self):
        alerts.process_health_status(
            "AH-001",
            {"indicators": {"heart_rate": {"status": "YELLOW"}}}
        )
        result = alerts.process_health_status(
            "AH-001",
            {"indicators": {"heart_rate": {"status": "RED"}}}
        )
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["severity"], "RED")

    def test_green_status_clears_active_alert(self):
        alerts.process_health_status(
            "AH-001",
            {"indicators": {"heart_rate": {"status": "RED"}}}
        )
        result = alerts.process_health_status(
            "AH-001",
            {"indicators": {"heart_rate": {"status": "GREEN"}}}
        )
        self.assertEqual(result, [])

        # A later warning should create a fresh alert.
        result = alerts.process_health_status(
            "AH-001",
            {"indicators": {"heart_rate": {"status": "YELLOW"}}}
        )
        self.assertEqual(len(result), 1)

    def test_alerts_are_stored(self):
        alerts.process_health_status(
            "AH-001",
            {"indicators": {"spo2": {"status": "RED"}}}
        )
        saved = alerts.list_alerts("AH-001")
        self.assertEqual(len(saved), 1)
        self.assertEqual(saved[0]["indicator"], "spo2")


if __name__ == "__main__":
    unittest.main()
