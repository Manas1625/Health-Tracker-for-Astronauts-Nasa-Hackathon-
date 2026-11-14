
import requests

from backend.db import get_connection

NASA_RADLAB_URL = (
    "https://visualization.osdr.nasa.gov/radlab/api/"
)


def fetch_radiation_data():

    url = (
        NASA_RADLAB_URL
        + "?spacecraft=ISS"
        + "&instrument=DosTel"
        + "&timestamp%3E=2022-04-01T23%3A00"
        + "&timestamp%3C2022-04-02T01%3A05"
        + "&absorbed_dose_rate"
        + "&dose_equivalent_rate"
        + "&flux"
        + "&format=json"
    )

    try:

        response = requests.get(
            url,
            timeout=(10, 60)
        )

        response.raise_for_status()

        return {
            "success": True,
            "source": "NASA OSDR RadLab",
            "data": response.json()
        }

    except requests.HTTPError as error:

        return {
            "success": False,
            "error": str(error),
            "server_response": response.text[:2000]
        }

    except requests.Timeout:

        return {
            "success": False,
            "error": "NASA API request timed out."
        }

    except requests.RequestException as error:

        return {
            "success": False,
            "error": str(error)
        }

    except ValueError:

        return {
            "success": False,
            "error": "Invalid JSON response from NASA."
        }
        
def parse_radiation_data(raw_data):
    """
    Convert NASA API response into clean records.
    """

    if not raw_data or "data" not in raw_data:
        return []

    columns = raw_data.get("columns", [])
    rows = raw_data.get("data", [])

    records = []

    for row in rows:

        record = dict(zip(columns, row))

        records.append({
            "timestamp": record.get("timestamp"),
            "instrument_id": record.get("instrument_id"),
            "absorbed_dose_rate": record.get("absorbed_dose_rate"),
            "dose_equivalent_rate": record.get("dose_equivalent_rate"),
            "flux": record.get("flux"),
            "instrument": record.get("instrument"),
            "spacecraft": record.get("spacecraft")
        })

    return records

def save_radiation_data(records):
    """
    Save NASA radiation records into SQLite.
    Avoid duplicate records using timestamp and instrument_id.
    """

    inserted = 0

    with get_connection() as conn:

        for record in records:

            cursor = conn.execute("""
                INSERT OR IGNORE INTO radiation_readings (
                    timestamp,
                    instrument_id,
                    absorbed_dose_rate,
                    dose_equivalent_rate,
                    flux,
                    instrument,
                    spacecraft
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                record["timestamp"],
                record["instrument_id"],
                record["absorbed_dose_rate"],
                record["dose_equivalent_rate"],
                record["flux"],
                record["instrument"],
                record["spacecraft"]
            ))

            inserted += cursor.rowcount

    return inserted
