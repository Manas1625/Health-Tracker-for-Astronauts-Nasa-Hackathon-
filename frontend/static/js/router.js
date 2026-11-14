
import {
    getState,
    setState
} from "./state.js";

import {
    getLatestVitals,
    getCrew,
    getStatus,
    getAlerts,
    setScenario,
    setDelay,
    isMockActive
} from "./api.js";

import { getEnvironment } from "./environments.js";

/* =========================================
   ASTROHEALTH - APPLICATION ROUTER
========================================= */

const main = document.getElementById("mainContent");

let pollingTimer = null;
let lastVitals = null;
let lastStatus = null;
let lastAlerts = [];
let lastCrew = [];
let refreshInProgress = false;

const REFRESH_INTERVAL = 2500;

/* =========================================
   ROUTES
========================================= */

const routes = {
    dashboard: {
        title: "Mission Dashboard",
        icon: "◫",
        description: "Real-time astronaut health monitoring and mission telemetry."
    },

    body: {
        title: "Human Body Map",
        icon: "♙",
        description: "Explore health indicators and physiological systems."
    },

    log: {
        title: "Log Measurements",
        icon: "⊕",
        description: "Record and review onboard health measurements."
    },

    learn: {
        title: "Health Intelligence Library",
        icon: "▤",
        description: "Understand health indicators and spaceflight hazards."
    },

    crew: {
        title: "Crew Readiness",
        icon: "♧",
        description: "Monitor astronaut health and mission readiness."
    },

    report: {
        title: "Ground Medical Report",
        icon: "▧",
        description: "Mission health summary and medical observations."
    }
};


/* =========================================
   HELPER FUNCTIONS
========================================= */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


function showToast(message, type = "success") {

    const container = document.getElementById("toastContainer");

    if (!container) return;

    const toast = document.createElement("div");

    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3500);
}


function extractData(result) {

    const response = result?.data;

    if (response?.data !== undefined) {
        return response.data;
    }

    return response;
}


function badgeClass(status) {

    const map = {
        GREEN: "badge-green",
        YELLOW: "badge-yellow",
        ORANGE: "badge-orange",
        RED: "badge-red",

        NORMAL: "badge-green",
        WATCH: "badge-yellow",
        WARNING: "badge-orange",
        CRITICAL: "badge-red"
    };

    return map[String(status || "").toUpperCase()] || "badge-cyan";
}


function getStatusSymbol(status) {

    const symbols = {
        GREEN: "✓",
        YELLOW: "!",
        ORANGE: "▲",
        RED: "✕"
    };

    return symbols[String(status).toUpperCase()] || "•";
}


function normalizeStatus(status) {

    const value = String(status || "GREEN").toUpperCase();

    if (["GREEN", "YELLOW", "ORANGE", "RED"].includes(value)) {
        return value;
    }

    const mapping = {
        NORMAL: "GREEN",
        WATCH: "YELLOW",
        WARNING: "ORANGE",
        CRITICAL: "RED"
    };

    return mapping[value] || "GREEN";
}


/* =========================================
   CONNECTION STATUS
========================================= */

function updateSystemStatus() {

    const connection = document.getElementById("connectionStatus");

    const text = document.getElementById("connectionText");

    if (!connection || !text) return;

    const dot = connection.querySelector(".connection-dot");

    if (isMockActive()) {

        text.textContent = "MOCK DATA ACTIVE";

        connection.style.color = "var(--yellow)";

        if (dot) {
            dot.style.background = "var(--yellow)";
        }

    } else {

        text.textContent = "BACKEND CONNECTED";

        connection.style.color = "var(--green)";

        if (dot) {
            dot.style.background = "var(--green)";
        }
    }
}


/* =========================================
   VITAL STATUS
========================================= */

function getVitalStatus(indicator) {

    const indicators = lastStatus?.indicators || {};

    const status = indicators[indicator];

    if (typeof status === "string") {
        return normalizeStatus(status);
    }

    if (status && typeof status === "object") {
        return normalizeStatus(status.status);
    }

    return "GREEN";
}


/* =========================================
   DASHBOARD
========================================= */

function renderDashboard() {

    const currentState = getState();

    const astronautId = currentState.astronaut;

    const person = lastCrew.find(
        item => item.id === astronautId
    ) || {
        id: astronautId,
        name: "Alex Morgan",
        role: "Commander",
        mission: "ORBIT-01"
    };

    const vitals = lastVitals || {};

    const overall = lastStatus?.overall || "NORMAL";

    const environment = getEnvironment(
        currentState.environment
    );

    /* VITAL INDICATORS */

    const vitalItems = [

        {
            name: "HEART RATE",
            key: "heart_rate",
            unit: "BPM",
            icon: "♡",
            value: vitals.heart_rate
        },

        {
            name: "BLOOD OXYGEN",
            key: "spo2",
            unit: "%",
            icon: "◉",
            value: vitals.spo2
        },

        {
            name: "BODY TEMPERATURE",
            key: "temperature",
            unit: "°C",
            icon: "♨",
            value: vitals.temperature
        },

        {
            name: "BLOOD PRESSURE",
            key: "blood_pressure",
            unit: "mmHg",
            icon: "⌁",
            value: vitals.blood_pressure
        },

        {
            name: "BLOOD GLUCOSE",
            key: "glucose",
            unit: "mg/dL",
            icon: "◈",
            value: vitals.glucose
        },

        {
            name: "SLEEP",
            key: "sleep",
            unit: "hours",
            icon: "☾",
            value: vitals.sleep
        },

        {
            name: "MOOD",
            key: "mood",
            unit: "",
            icon: "☻",
            value: vitals.mood
        }

    ];


    /* GENERATE VITAL CARDS */

    const cards = vitalItems.map(item => {

        const status = getVitalStatus(item.key);

        const value = item.value ?? "--";

        return `
            <article
                class="vital-card"
                data-indicator="${escapeHTML(item.key)}"
            >

                <div class="vital-card-top">

                    <span class="vital-name">
                        ${escapeHTML(item.name)}
                    </span>

                    <span class="vital-icon">
                        ${item.icon}
                    </span>

                </div>

                <div class="vital-reading">

                    ${escapeHTML(value)}

                    <small>
                        ${escapeHTML(item.unit)}
                    </small>

                </div>

                <div class="vital-bottom">

                    <span class="badge ${badgeClass(status)}">

                        ${getStatusSymbol(status)}

                        ${status}

                    </span>

                    <span class="trend-text">
                        SIMULATED
                    </span>

                </div>

            </article>
        `;

    }).join("");


    /* ALERTS */

    const alerts = lastAlerts.length

        ? lastAlerts.map(alert => {

            const severity = normalizeStatus(alert.severity);

            return `
                <div class="alert-item">

                    <div>

                        <span class="badge ${badgeClass(severity)}">

                            ${getStatusSymbol(severity)}

                            ${escapeHTML(severity)}

                        </span>

                        <h4>
                            ${escapeHTML(alert.indicator)}
                        </h4>

                        <p>
                            ${escapeHTML(alert.message)}
                        </p>

                    </div>

                    <span class="trend-text">
                        OPEN
                    </span>

                </div>
            `;

        }).join("")

        : `
            <div class="empty-state">

                ✓ No open simulated alerts.

                <br>

                Continue regular health monitoring.

            </div>
        `;


    /* OVERALL HEALTH STATUS */

    const overallStatus = String(overall).toUpperCase();

    const overallClass = badgeClass(overallStatus);


    /* DASHBOARD HTML */

    main.innerHTML = `

        <!-- HERO -->

        <div class="page-header">

            <div>

                <p class="page-eyebrow">
                    MISSION CONTROL / HEALTH TELEMETRY
                </p>

                <h2 class="page-title">

                    Astronaut Health

                    <span>
                        Monitoring System
                    </span>

                </h2>

                <p class="page-description">

                    ${escapeHTML(environment.focus)}

                </p>

            </div>

            <span class="badge badge-cyan">
                SIMULATED DATA
            </span>

        </div>


        <!-- CREW PROFILE -->

        <section class="crew-profile">

            <div class="crew-avatar">
                ♙
            </div>

            <div>

                <p class="eyebrow">
                    ACTIVE CREW MEMBER
                </p>

                <h3>

                    ${escapeHTML(person.role)}

                    ${escapeHTML(person.name)}

                </h3>

                <p>

                    ${escapeHTML(person.mission)}

                    /

                    ${escapeHTML(person.id)}

                </p>

            </div>

            <span class="badge badge-green">
                ● ACTIVE
            </span>

        </section>


        <!-- SUMMARY CARDS -->

        <div class="dashboard-grid">

            <article class="stat-card">

                <p class="stat-label">
                    OVERALL HEALTH FLAG
                </p>

                <div class="stat-value">

                    <span class="badge ${overallClass}">

                        ${getStatusSymbol(normalizeStatus(overallStatus))}

                        ${escapeHTML(overallStatus)}

                    </span>

                </div>

                <p class="stat-description">
                    Current simulated health assessment
                </p>

            </article>


            <article class="stat-card">

                <p class="stat-label">
                    DATA SOURCE
                </p>

                <div class="stat-value">
                    LIVE
                </div>

                <p class="stat-description">
                    Simulated telemetry · 2.5-second refresh
                </p>

            </article>


            <article class="stat-card">

                <p class="stat-label">
                    READINGS STORED
                </p>

                <div class="stat-value">

                    ${Number(vitals.readings_stored || 128)}

                </div>

                <p class="stat-description">
                    Recorded mission measurements
                </p>

            </article>

        </div>


        <!-- VITALS -->

        <div class="panel-heading">

            <div>

                <h3>
                    Crew Vital Signs
                </h3>

                <p>
                    LIVE PHYSIOLOGICAL TELEMETRY
                </p>

            </div>

            <span class="simulated-label">
                ● SIMULATED
            </span>

        </div>


        <div class="vitals-grid">

            ${cards}

        </div>


        <!-- ENVIRONMENT -->

        <section class="section-space panel">

            <div class="panel-heading">

                <div>

                    <h3>
                        Environment Intelligence
                    </h3>

                    <p>
                        ${escapeHTML(environment.subtitle)}
                    </p>

                </div>

                <span class="badge badge-cyan">
                    MISSION CONTEXT
                </span>

            </div>

            <h3>
                ${escapeHTML(environment.name)}
            </h3>

            <p class="page-description">

                ${escapeHTML(environment.tip)}

            </p>

            <div style="
                display:flex;
                gap:8px;
                flex-wrap:wrap;
                margin-top:17px;
            ">

                ${environment.hazards.map(hazard => `

                    <span class="badge badge-yellow">

                        ${escapeHTML(hazard)}

                    </span>

                `).join("")}

            </div>

        </section>


        <!-- ALERT CENTRE -->

        <section class="section-space panel">

            <div class="panel-heading">

                <div>

                    <h3>
                        Alert Centre
                    </h3>

                    <p>
                        ACTIVE MISSION HEALTH ALERTS
                    </p>

                </div>

                <span class="badge badge-cyan">

                    ${lastAlerts.length} OPEN

                </span>

            </div>

            ${alerts}

        </section>


        <!-- SIMULATION CONTROLS -->

        <section class="section-space panel">

            <div class="panel-heading">

                <div>

                    <h3>
                        Simulation Controls
                    </h3>

                    <p>
                        CHANGE SCENARIO FOR DEMONSTRATION
                    </p>

                </div>

                <span class="badge badge-cyan">
                    DEMO MODE
                </span>

            </div>


            <div class="scenario-controls">

                <button
                    class="scenario-btn"
                    data-scenario="normal"
                    type="button"
                >
                    ✓ Normal
                </button>

                <button
                    class="scenario-btn"
                    data-scenario="warning"
                    type="button"
                >
                    ! Warning
                </button>

                <button
                    class="scenario-btn"
                    data-scenario="critical"
                    type="button"
                >
                    ▲ Critical
                </button>

            </div>


            <p class="page-description" id="scenarioLabel">

                Current scenario:

                ${escapeHTML(currentState.scenario.toUpperCase())}

            </p>

        </section>

    `;


    /* SCENARIO BUTTON EVENTS */

    document.querySelectorAll("[data-scenario]").forEach(button => {

        button.addEventListener("click", async () => {

            const mode = button.dataset.scenario;

            if (!["normal", "warning", "critical"].includes(mode)) {
                return;
            }

            setState({
                scenario: mode
            });

            showToast(
                `Switching to ${mode.toUpperCase()} scenario...`
            );

            await setScenario(mode);

            await refreshData();

            showToast(
                `${mode.toUpperCase()} scenario activated.`,
                "success"
            );

        });

    });

}


/* =========================================
   PLACEHOLDER PAGES
========================================= */

function renderPlaceholder(route) {

    const page = routes[route];

    if (!page) return;

    main.innerHTML = `

        <div class="page-header">

            <div>

                <p class="page-eyebrow">
                    MISSION MODULE
                </p>

                <h2 class="page-title">
                    ${escapeHTML(page.title)}
                </h2>

                <p class="page-description">
                    ${escapeHTML(page.description)}
                </p>

            </div>

            <span class="badge badge-cyan">
                SIMULATED DATA
            </span>

        </div>


        <section class="module-placeholder">

            <div class="placeholder-icon">
                ${page.icon}
            </div>

            <h2>
                ${escapeHTML(page.title)}
            </h2>

            <p>

                This mission module is scheduled for the next
                development stage.

                Its interactive features will be implemented
                in subsequent development steps.

            </p>

            <span
                class="badge badge-cyan"
                style="margin-top:20px"
            >
                MODULE INITIALIZED
            </span>

        </section>

    `;

}


/* =========================================
   NAVIGATION
========================================= */

function navigate(route) {

    if (!routes[route]) {
        route = "dashboard";
    }

    setState({
        route
    });

    document.querySelectorAll(".nav-link").forEach(link => {

        link.classList.toggle(
            "active",
            link.dataset.route === route
        );

    });

    if (route === "dashboard") {

        renderDashboard();

    } else {

        renderPlaceholder(route);

    }

}


/* =========================================
   DATA REFRESH
========================================= */

async function refreshData() {

    if (refreshInProgress) return;

    if (document.hidden) return;

    refreshInProgress = true;

    try {

        const results = await Promise.all([

            getLatestVitals(),

            getCrew(),

            getStatus(),

            getAlerts()

        ]);

        const [
            vitalsResult,
            crewResult,
            statusResult,
            alertsResult
        ] = results;


        /* VITALS */

        const vitals = extractData(vitalsResult);

        lastVitals = {
            ...(vitals && typeof vitals === "object" ? vitals : {}),

            readings_stored:
                vitalsResult.data?.readings_stored || 128
        };


        /* CREW */

        const crew = extractData(crewResult);

        lastCrew = Array.isArray(crew) ? crew : [];


        /* STATUS */

        lastStatus = extractData(statusResult) || {};

        if (typeof lastStatus !== "object") {
            lastStatus = {};
        }


        /* ALERTS */

        const alerts = extractData(alertsResult);

        lastAlerts = Array.isArray(alerts) ? alerts : [];


        /* UPDATE SHARED STATE */

        setState({

            latestVitals: lastVitals,

            crew: lastCrew,

            status: lastStatus,

            readingsStored: lastVitals.readings_stored

        });


        /* UPDATE HEADER */

        const person = lastCrew.find(
            item => item.id === getState().astronaut
        );

        const crewIdDisplay =
            document.getElementById("crewIdDisplay");

        if (crewIdDisplay) {

            crewIdDisplay.textContent =
                person?.id || getState().astronaut;

        }


        const lastUpdated =
            document.getElementById("lastUpdated");

        if (lastUpdated) {

            lastUpdated.textContent =
                "UPDATED " + new Date().toLocaleTimeString();

        }


        /* ONLY REFRESH CURRENT DASHBOARD */

        if (getState().route === "dashboard") {

            renderDashboard();

        }


        updateSystemStatus();

    } catch (error) {

        console.error(
            "[AstroHealth] Telemetry refresh failed:",
            error
        );

        showToast(
            "Unable to refresh mission telemetry.",
            "error"
        );

    } finally {

        refreshInProgress = false;

    }

}


/* =========================================
   GLOBAL POLLING
========================================= */

function startPolling() {

    if (pollingTimer) {

        clearInterval(pollingTimer);

    }

    pollingTimer = setInterval(() => {

        if (!document.hidden) {

            refreshData();

        }

    }, REFRESH_INTERVAL);

}


function stopPolling() {

    if (pollingTimer) {

        clearInterval(pollingTimer);

        pollingTimer = null;

    }

}


/* =========================================
   HEADER CONTROLS
========================================= */

function setupControls() {

    const astronautSelect =
        document.getElementById("astronautSelect");

    const environmentSelect =
        document.getElementById("environmentSelect");

    const delayButton =
        document.getElementById("delayToggle");

    const delayText =
        document.getElementById("delayText");


    const current = getState();


    /* RESTORE SAVED SETTINGS */

    astronautSelect.value = current.astronaut;

    environmentSelect.value = current.environment;


    /* ASTRONAUT SELECTOR */

    astronautSelect.addEventListener("change", async event => {

        setState({

            astronaut: event.target.value

        });

        showToast("Switching active crew member...");

        await refreshData();

        showToast("Active crew member updated.");

    });


    /* ENVIRONMENT SELECTOR */

    environmentSelect.addEventListener("change", event => {

        setState({

            environment: event.target.value

        });

        if (getState().route === "dashboard") {

            renderDashboard();

        }

        showToast("Mission environment updated.");

    });


    /* COMMUNICATION DELAY */

    function updateDelayButton() {

        const enabled = getState().delayEnabled;

        delayButton.classList.toggle(
            "enabled",
            enabled
        );

        delayButton.setAttribute(
            "aria-pressed",
            String(enabled)
        );

        delayText.textContent = enabled

            ? `COMM DELAY: ${getState().delayMinutes} MIN`

            : "COMM DELAY: OFF";

    }


    updateDelayButton();


    delayButton.addEventListener("click", async () => {

        const enabled = !getState().delayEnabled;

        setState({

            delayEnabled: enabled

        });


        updateDelayButton();


        if (enabled) {

            const result = await setDelay(
                getState().delayMinutes
            );

            if (result.isMock) {

                showToast(
                    "Delay mode enabled using simulation."
                );

            } else {

                showToast(
                    "Communication delay enabled."
                );

            }

        } else {

            showToast(
                "Communication delay disabled."
            );

        }

    });

}


/* =========================================
   HASH ROUTING
========================================= */

function setupNavigation() {

    window.addEventListener("hashchange", () => {

        const route =
            location.hash.replace("#/", "") || "dashboard";

        navigate(route);

    });


    document.querySelectorAll(".nav-link").forEach(link => {

        link.addEventListener("click", () => {

            const target = link.getAttribute("href");

            if (location.hash === target) {

                navigate(link.dataset.route);

            }

        });

    });


    const initialRoute =

        location.hash.replace("#/", "") ||

        getState().route ||

        "dashboard";


    if (!location.hash) {

        location.hash = `/${initialRoute}`;

    }


    navigate(initialRoute);

}


/* =========================================
   APPLICATION INITIALIZATION
========================================= */

async function initialize() {

    console.log(
        "ASTROHEALTH: Initializing mission systems..."
    );


    try {

        setupControls();

        setupNavigation();

        await refreshData();

        startPolling();


        /* PAUSE POLLING WHEN TAB IS HIDDEN */

        document.addEventListener(
            "visibilitychange",
            () => {

                if (document.hidden) {

                    stopPolling();

                } else {

                    refreshData();

                    startPolling();

                }

            }
        );


        console.log(
            "ASTROHEALTH: Mission systems initialized."
        );

    } catch (error) {

        console.error(
            "ASTROHEALTH initialization error:",
            error
        );

        main.innerHTML = `

            <section class="module-placeholder">

                <h2>
                    System Initialization Error
                </h2>

                <p>
                    Unable to initialize the AstroHealth interface.
                    Check the browser console for details.
                </p>

            </section>

        `;

    }

}


/* =========================================
   START APPLICATION
========================================= */

initialize();
