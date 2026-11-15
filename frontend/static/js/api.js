
import { getMockData, setMockScenario } from "./mock.js";
import { getState, setState } from "./state.js";

const API_BASE = "https://health-tracker-for-astronauts-nasa.onrender.com";

let mockActive = false;

export function isMockActive() {
    return mockActive;
}

async function request(path, options = {}) {

    try {
        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers
            },
            signal: AbortSignal.timeout(3500)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();

        mockActive = false;
        setState({ mockMode: false });

        return {
            data: result,
            isMock: false
        };

    } catch (error) {

        console.warn(
            `[AstroHealth] Using mock data for ${path}:`,
            error.message
        );

        mockActive = true;
        setState({ mockMode: true });

        return {
            data: getMockData(path),
            isMock: true
        };
    }
}

export async function getLatestVitals() {
    const { astronaut } = getState();
    const result = await request(
        `/api/vitals/latest?astronaut=${encodeURIComponent(astronaut)}`
    );

    // Adapt the backend's database field names to the existing UI's field names.
    if (result.isMock || !result.data?.data) return result;

    const envelope = result.data;
    const reading = envelope.data;
    const indicators = reading.health_status?.indicators || {};

    const statusFor = (...keys) => {
        const statuses = keys
            .map(key => indicators[key]?.status)
            .filter(Boolean);
        const order = ["GREEN", "YELLOW", "ORANGE", "RED"];
        return statuses.sort((a, b) => order.indexOf(b) - order.indexOf(a))[0] || "GREEN";
    };

    const normalized = {
        ...reading,
        blood_pressure: `${reading.systolic ?? "--"}/${reading.diastolic ?? "--"}`,
        glucose: reading.blood_glucose,
        sleep: reading.sleep_hours,
        health_status: {
            ...reading.health_status,
            overall: reading.health_status?.overall_status || "NORMAL",
            indicators: {
                ...indicators,
                blood_pressure: statusFor("systolic", "diastolic"),
                glucose: indicators.blood_glucose?.status || "GREEN",
                sleep: indicators.sleep_hours?.status || "GREEN"
            }
        }
    };

    return {
        ...result,
        data: { ...envelope, data: normalized }
    };
}

export async function getCrew() {
    return request("/api/crew");
}

export async function getStatus() {
    const { astronaut } = getState();

    return request(
        `/api/status?astronaut=${encodeURIComponent(astronaut)}`
    );
}

export async function getAlerts() {
    const { astronaut } = getState();

    return request(
        `/api/alerts?astronaut=${encodeURIComponent(astronaut)}&unacknowledged_only=true`
    );
}

export async function getHistory() {
    const { astronaut } = getState();

    return request(
        `/api/vitals/history?astronaut=${encodeURIComponent(astronaut)}&limit=30`
    );
}

export async function getGuidance(indicator) {
    return request(`/api/guidance/${encodeURIComponent(indicator)}`);
}

export async function setScenario(mode) {

    setMockScenario(mode);

    const { astronaut } = getState();

    return request("/api/scenario", {
        method: "POST",
        body: JSON.stringify({
            mode,
            astronaut
        })
    });
}

export async function setDelay(minutes = 20) {
    return request("/api/delay", {
        method: "POST",
        body: JSON.stringify({ minutes })
    });
}

export async function getBaseline() {
    const { astronaut } = getState();

    return request(
        `/api/baseline?astronaut=${encodeURIComponent(astronaut)}`
    );
}

export async function acknowledgeAlert(id) {
    return request(`/api/alerts/${encodeURIComponent(id)}/acknowledge`, {
        method: "POST"
    });
}


/* NASA OSDR RadLab radiation data — historical ISS instrument measurements. */
export async function getLatestRadiation(instrument = "") {
    const query = instrument ? `?instrument=${encodeURIComponent(instrument)}` : "";
    return request(`/api/radiation/latest${query}`);
}

export async function getRadiationHistory(limit = 100, instrument = "") {
    const params = new URLSearchParams({ limit: String(limit) });
    if (instrument) params.set("instrument", instrument);
    return request(`/api/radiation/history?${params.toString()}`);
}

export async function getRadiationAnomaly() {
    return request("/api/radiation/anomaly");
}
