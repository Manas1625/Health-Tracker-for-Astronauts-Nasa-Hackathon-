
import { getMockData, setMockScenario } from "./mock.js";
import { getState, setState } from "./state.js";

const API_BASE = "http://127.0.0.1:5001";

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

        const result = await response.json();

        if (!response.ok && response.status !== 404) {
            throw new Error(`API error: ${response.status}`);
        }

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

    return request(
        `/api/vitals/latest?astronaut=${encodeURIComponent(astronaut)}`
    );
}

export async function getCrew() {
    return request("/api/crew");
}

export async function getLatestRadiation() {
    return request("/api/radiation/latest");
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
    // The backend has no communication-delay endpoint.
    // Keep this as a local UI preference without fabricating an API call.
    return {
        isMock: false,
        localOnly: true,
        minutes
    };
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
