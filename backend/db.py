
"""
db.py

SQLite database operations for AstroHealth.

Each operation opens its own database connection.
This makes the database safe to use across threads.
"""

import sqlite3

from contextlib import contextmanager

# from backend.alerts import process_health_status
# from backend.detection import evaluate_reading
from backend.config import DATABASE_PATH

@contextmanager
def get_connection():
    """
    Create one SQLite connection per operation/thread.
    """

    connection = sqlite3.connect(
        DATABASE_PATH,
        timeout=30
    )

    connection.row_factory = sqlite3.Row

    try:
        yield connection
        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

def init_db():
    """
    Create database tables on first application run.
    """

    with get_connection() as conn:

        conn.execute("PRAGMA journal_mode=WAL")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS readings (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                astronaut_id TEXT NOT NULL,

                timestamp TEXT NOT NULL,

                heart_rate REAL NOT NULL,

                spo2 REAL NOT NULL,

                temperature REAL NOT NULL,

                systolic REAL NOT NULL,

                diastolic REAL NOT NULL,

                blood_glucose REAL NOT NULL,

                sleep_hours REAL NOT NULL,

                mood INTEGER NOT NULL,

                stress INTEGER NOT NULL,

                scenario TEXT NOT NULL,

                data_source TEXT NOT NULL DEFAULT 'SIMULATED'

            )
        """)

        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_readings_astronaut_time
            ON readings(astronaut_id, timestamp)
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS scenarios (

                astronaut_id TEXT PRIMARY KEY,

                mode TEXT NOT NULL

            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                astronaut_id TEXT NOT NULL,
                indicator TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                recommended_action TEXT DEFAULT '',
                timestamp TEXT NOT NULL,
                acknowledged INTEGER DEFAULT 0
            );
        """)

        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_alerts_timestamp
            ON alerts(timestamp);
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS radiation_readings (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                timestamp TEXT NOT NULL,

                instrument_id TEXT NOT NULL,

                absorbed_dose_rate REAL,

                dose_equivalent_rate REAL,

                flux REAL,

                instrument TEXT,

                spacecraft TEXT,

                data_source TEXT NOT NULL DEFAULT 'NASA OSDR RadLab',

                UNIQUE(timestamp, instrument_id)
            )
        """)

        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_radiation_timestamp
            ON radiation_readings(timestamp)
        """)

def insert_reading(reading):
    """
    Save one astronaut reading.
    """

    with get_connection() as conn:
        conn.execute("""
            INSERT INTO readings (
                astronaut_id,
                timestamp,
                heart_rate,
                spo2,
                temperature,
                systolic,
                diastolic,
                blood_glucose,
                sleep_hours,
                mood,
                stress,
                scenario,
                data_source
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            reading["astronaut_id"],
            reading["timestamp"],
            reading["heart_rate"],
            reading["spo2"],
            reading["temperature"],
            reading["systolic"],
            reading["diastolic"],
            reading["blood_glucose"],
            reading["sleep_hours"],
            reading["mood"],
            reading["stress"],
            reading["scenario"],
            "SIMULATED"
        ))

def get_latest_reading(astronaut_id):
    """
    Retrieve the latest reading for one astronaut.
    """

    with get_connection() as conn:

        row = conn.execute("""
            SELECT *
            FROM readings
            WHERE astronaut_id = ?
            ORDER BY id DESC
            LIMIT 1
        """, (astronaut_id,)).fetchone()

        return dict(row) if row else None

def get_reading_count(astronaut_id=None):
    """
    Return total readings or readings for one astronaut.
    """

    with get_connection() as conn:

        if astronaut_id:

            row = conn.execute("""
                SELECT COUNT(*) AS total
                FROM readings
                WHERE astronaut_id = ?
            """, (astronaut_id,)).fetchone()

        else:

            row = conn.execute("""
                SELECT COUNT(*) AS total
                FROM readings
            """).fetchone()

        return row["total"]

def get_all_latest_readings():
    """
    Get the latest reading for every astronaut.
    """

    with get_connection() as conn:

        rows = conn.execute("""
            SELECT r.*
            FROM readings r
            INNER JOIN (
                SELECT astronaut_id, MAX(id) AS latest_id
                FROM readings
                GROUP BY astronaut_id
            ) latest
            ON r.id = latest.latest_id
        """).fetchall()

        return [dict(row) for row in rows]

def create_alert(alert):
    """Save an alert and return its database ID."""
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO alerts (
                astronaut_id,
                indicator,
                severity,
                message,
                recommended_action,
                timestamp,
                acknowledged
            )
            VALUES (?, ?, ?, ?, ?, ?, 0)
            """,
            (
                alert["astronaut_id"],
                alert["indicator"],
                alert["severity"],
                alert["message"],
                alert.get("recommended_action", ""),
                alert["timestamp"],
            ),
        )
        return cursor.lastrowid


def get_alerts(astronaut_id=None, limit=100, unacknowledged_only=False):
    """Return recent alerts, optionally filtered by astronaut."""
    query = "SELECT * FROM alerts WHERE 1=1"
    params = []

    if astronaut_id:
        query += " AND astronaut_id = ?"
        params.append(astronaut_id)

    if unacknowledged_only:
        query += " AND acknowledged = 0"

    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]


def acknowledge_alert(alert_id):
    """Mark an alert as acknowledged."""
    with get_connection() as conn:
        cursor = conn.execute(
            "UPDATE alerts SET acknowledged = 1 WHERE id = ?",
            (alert_id,),
        )
        return cursor.rowcount > 0
    
def get_latest_radiation_reading(instrument_id=None):
    """Get the latest NASA radiation reading."""

    query = """
        SELECT *
        FROM radiation_readings
    """
    params = []

    if instrument_id:
        query += " WHERE instrument_id = ?"
        params.append(instrument_id)

    query += " ORDER BY timestamp DESC, id DESC LIMIT 1"

    with get_connection() as conn:
        row = conn.execute(query, params).fetchone()
        return dict(row) if row else None


def get_radiation_readings(limit=100, instrument_id=None):
    """Get recent NASA radiation readings."""

    query = """
        SELECT *
        FROM radiation_readings
    """
    params = []

    if instrument_id:
        query += " WHERE instrument_id = ?"
        params.append(instrument_id)

    query += " ORDER BY timestamp DESC, id DESC LIMIT ?"
    params.append(limit)

    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]
