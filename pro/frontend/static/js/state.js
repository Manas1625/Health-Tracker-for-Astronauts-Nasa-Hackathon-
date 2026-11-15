
const STORAGE_KEY = "astrohealth-state-v1";

const defaults = {
    astronaut: "AH-001",
    environment: "spacecraft",
    scenario: "normal",
    delayEnabled: false,
    delayMinutes: 20,
    route: "dashboard",
    mockMode: false,
    latestVitals: null,
    status: null,
    crew: [],
    readingsStored: 0
};

function loadSavedState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return saved && typeof saved === "object" ? saved : {};
    } catch {
        return {};
    }
}

const saved = loadSavedState();

const state = {
    ...defaults,
    ...saved,
    mockMode: false,
    latestVitals: null,
    status: null,
    crew: []
};

const listeners = new Set();

function notify() {
    listeners.forEach(callback => callback({ ...state }));
}

export function getState() {
    return { ...state };
}

export function setState(updates) {
    Object.assign(state, updates);

    try {
        const persistent = {
            astronaut: state.astronaut,
            environment: state.environment,
            scenario: state.scenario,
            delayEnabled: state.delayEnabled,
            delayMinutes: state.delayMinutes,
            route: state.route
        };

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(persistent)
        );
    } catch (error) {
        console.warn("State could not be persisted:", error);
    }

    notify();
}

export function subscribe(callback) {
    listeners.add(callback);

    return () => listeners.delete(callback);
}

export function resetState() {
    Object.assign(state, defaults);

    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {}

    notify();
}
