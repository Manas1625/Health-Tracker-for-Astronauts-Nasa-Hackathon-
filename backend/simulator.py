
"""
simulator.py

Generates simulated astronaut health telemetry.

Features:
1. Four astronaut profiles.
2. Smooth random walk.
3. NORMAL, WARNING and CRITICAL scenarios.
4. Gradual transition between scenarios.
5. Automatic SQLite storage.
"""

import random
import threading
import time

from datetime import datetime, timezone

from backend.config import ASTRONAUTS, SCENARIO_TARGETS, SIMULATION_INTERVAL
from backend.db import insert_reading, init_db
from backend.detection import evaluate_reading
from backend.alerts import process_health_status

class HealthSimulator:

    def __init__(self):

        self.lock = threading.RLock()

        self.running = False

        self.thread = None

        self.scenarios = {}

        self.current_values = {}

        self.target_values = {}

        # Initialize every astronaut.
        for astronaut_id, astronaut in ASTRONAUTS.items():

            self.scenarios[astronaut_id] = "NORMAL"

            personal = astronaut["personal"].copy()

            self.current_values[astronaut_id] = personal.copy()

            self.target_values[astronaut_id] = personal.copy()

    def set_scenario(self, mode, astronaut="all"):
        """
        Change the simulation mode.

        Values gradually move toward the new targets.
        """

        mode = mode.upper()

        if mode not in SCENARIO_TARGETS:

            raise ValueError("Invalid simulation scenario.")

        if astronaut != "all" and astronaut not in ASTRONAUTS:

            raise ValueError("Unknown astronaut ID.")

        with self.lock:

            astronaut_ids = (
                list(ASTRONAUTS.keys())
                if astronaut == "all"
                else [astronaut]
            )

            for astronaut_id in astronaut_ids:

                self.scenarios[astronaut_id] = mode

                self.target_values[astronaut_id] = (
                    self.calculate_targets(astronaut_id, mode)
                )

    def calculate_targets(self, astronaut_id, mode):
        """
        Calculate target values for an astronaut.

        Each astronaut gets slightly different values
        within the selected scenario.
        """

        targets = SCENARIO_TARGETS[mode]

        personal = ASTRONAUTS[astronaut_id]["personal"]

        result = {}

        for indicator, (low, high) in targets.items():

            if indicator in ("mood", "stress"):

                result[indicator] = random.randint(
                    int(low),
                    int(high)
                )

            else:

                result[indicator] = round(
                    random.uniform(low, high),
                    2
                )

        return result

    def generate_next_reading(self, astronaut_id):
        """
        Generate one smooth reading.
        """

        current = self.current_values[astronaut_id]

        target = self.target_values[astronaut_id]

        next_values = {}

        for indicator, previous_value in current.items():

            target_value = target[indicator]

            # Gradually move 8% toward the target.
            movement = (target_value - previous_value) * 0.08

            # Add a small random variation.
            noise = random.gauss(0, 0.12)

            # Smaller noise for discrete indicators.
            if indicator in ("mood", "stress"):

                noise = 0

            new_value = previous_value + movement + noise

            # Keep discrete values as integers.
            if indicator in ("mood", "stress"):

                new_value = round(new_value)

                new_value = max(1, min(5, new_value))

            else:

                new_value = round(new_value, 2)

            next_values[indicator] = new_value

        self.current_values[astronaut_id] = next_values

        return next_values.copy()

    def generate_reading(self, astronaut_id):
        """
        Generate and persist one astronaut reading.
        """

        with self.lock:

            values = self.generate_next_reading(astronaut_id)

            reading = {

                "astronaut_id": astronaut_id,

                "timestamp": datetime.now(
                    timezone.utc
                ).isoformat(),

                **values,

                "scenario": self.scenarios[astronaut_id],

                "data_source": "SIMULATED"

            }

        insert_reading(reading)

        return reading

    def generate_all(self):
        """
        Generate one reading for every astronaut.
        """

        readings = []

        for astronaut_id in ASTRONAUTS:

            reading = self.generate_reading(astronaut_id)

            readings.append(reading)

        return readings

    def simulation_loop(self):
        """
        Background thread.

        Runs continuously until stopped.
        """

        while self.running:

            started = time.monotonic()

            try:

                self.generate_all()

            except Exception as error:

                print("SIMULATOR ERROR:", error)

            elapsed = time.monotonic() - started

            time.sleep(
                max(0, SIMULATION_INTERVAL - elapsed)
            )

    def start(self):
        """
        Initialize the database and start simulation.
        """

        if self.running:

            return

        init_db()

        self.running = True

        # Generate initial readings immediately.
        self.generate_all()

        self.thread = threading.Thread(

            target=self.simulation_loop,

            name="AstroHealthSimulator",

            daemon=True

        )

        self.thread.start()

        print("AstroHealth simulator started.")

        print("Astronauts:", len(ASTRONAUTS))

        print("Interval:", SIMULATION_INTERVAL, "seconds")

    def stop(self):

        self.running = False

        if self.thread:

            self.thread.join(timeout=5)

# Shared simulator instance.
simulator = HealthSimulator()