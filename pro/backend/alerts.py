from datetime import datetime, timezone

from backend.db import (
    create_alert,
    get_alerts,
    get_open_alert_for_indicator,
    resolve_open_alerts,
)


# Kept for compatibility with existing tests/tools; SQLite is the source of truth.
_active_alerts = {}


def process_health_status(astronaut_id, health_status):
    """
    Keep one open alert per astronaut/indicator.

    An alert is closed when its indicator returns to GREEN or when its
    severity changes. This prevents stale alerts from previous scenarios
    accumulating in the active Alert Centre.
    """
    created = []
    indicators = health_status.get("indicators", {})

    for indicator, result in indicators.items():
        severity = str(result.get("status", "GREEN")).upper()
        existing = get_open_alert_for_indicator(astronaut_id, indicator)

        if severity == "GREEN":
            if existing:
                resolve_open_alerts(astronaut_id, indicator)
            continue

        if severity not in ("YELLOW", "ORANGE", "RED"):
            continue

        # Keep the existing alert if the condition and severity are unchanged.
        if existing and str(existing.get("severity", "")).upper() == severity:
            continue

        # Close the previous severity before creating the current alert.
        if existing:
            resolve_open_alerts(astronaut_id, indicator)

        actions = result.get("recommended_actions", [])
        alert = {
            "astronaut_id": astronaut_id,
            "indicator": indicator,
            "severity": severity,
            "message": result.get(
                "message", f"{indicator} requires attention."
            ),
            "recommended_action": result.get(
                "recommended_action",
                "; ".join(actions) if actions else "Review the latest readings."
            ),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        alert_id = create_alert(alert)
        alert["id"] = alert_id
        alert["acknowledged"] = 0
        created.append(alert)

    return created


def list_alerts(astronaut_id=None, limit=100, unacknowledged_only=False):
    return get_alerts(
        astronaut_id=astronaut_id,
        limit=limit,
        unacknowledged_only=unacknowledged_only,
    )
