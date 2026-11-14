
from datetime import datetime, timezone

from db import create_alert, get_alerts


# Prevent repeated alerts for the same astronaut and indicator.
# A new alert can be generated if severity changes.
_active_alerts = {}


def process_health_status(astronaut_id, health_status):
    """
    Convert health-status results into persistent alerts.

    Expected health_status format:
    {
        "indicators": {
            "heart_rate": {
                "status": "RED",
                "message": "...",
                "recommended_action": "..."
            }
        }
    }
    """
    created = []

    indicators = health_status.get("indicators", {})

    for indicator, result in indicators.items():
        severity = str(result.get("status", "GREEN")).upper()

        if severity not in ("YELLOW", "ORANGE", "RED"):
            _active_alerts.pop((astronaut_id, indicator), None)
            continue

        key = (astronaut_id, indicator)

        # Avoid creating duplicate alerts at every simulation tick.
        if _active_alerts.get(key) == severity:
            continue

        alert = {
            "astronaut_id": astronaut_id,
            "indicator": indicator,
            "severity": severity,
            "message": result.get(
                "message",
                f"{indicator} requires attention."
            ),
            "recommended_action": result.get(
                "recommended_action",
                "; ".join(result.get(
                "recommended_actions",
                ["Review the latest readings."]
                ))
            ),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        alert_id = create_alert(alert)
        alert["id"] = alert_id
        alert["acknowledged"] = 0

        created.append(alert)
        _active_alerts[key] = severity

    return created


def list_alerts(astronaut_id=None, limit=100, unacknowledged_only=False):
    return get_alerts(
        astronaut_id=astronaut_id,
        limit=limit,
        unacknowledged_only=unacknowledged_only,
    )
