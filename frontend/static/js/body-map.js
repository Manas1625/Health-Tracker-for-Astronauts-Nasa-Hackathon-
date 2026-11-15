

const SYSTEMS = {
    // 01 — Head
    sleep: {
        title: "Sleep & Neurobehavioral Health",
        description: "Tracks sleep duration and self-reported mood.",
        indicators: [
            ["Sleep", "sleep_hours", "hours"],
            ["Mood", "mood", ""]
        ],
        position: "head"
    },

    // 02 — Chest
    cardio: {
        title: "Cardiovascular System",
        description: "Monitors heart rate, blood pressure and blood oxygen.",
        indicators: [
            ["Heart Rate", "heart_rate", "BPM"],
            ["Systolic Pressure", "systolic", "mmHg"],
            ["Diastolic Pressure", "diastolic", "mmHg"],
            ["Blood Oxygen", "spo2", "%"]
        ],
        position: "chest"
    },

    // 03 — Lungs
    respiratory: {
        title: "Respiratory System",
        description: "Monitors blood oxygen as an indicator of oxygenation.",
        indicators: [
            ["Blood Oxygen", "spo2", "%"]
        ],
        position: "lungs"
    },

    // 04 — Abdomen
    metabolic: {
        title: "Metabolic System",
        description: "Tracks blood glucose levels.",
        indicators: [
            ["Blood Glucose", "blood_glucose", "mg/dL"]
        ],
        position: "abdomen"
    },

    // 05 — Lower body
    temperature: {
        title: "Thermoregulation",
        description: "Monitors body temperature.",
        indicators: [
            ["Body Temperature", "temperature", "°C"]
        ],
        position: "lower-body"
    }
};


function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function getStatus(status, key) {
    const item = status?.indicators?.[key];
    const value = typeof item === "object" ? item?.status : item;
    const normalized = String(value || "GREEN").toUpperCase();

    if (["GREEN", "YELLOW", "ORANGE", "RED"].includes(normalized)) {
        return normalized;
    }

    return ({
        NORMAL: "GREEN",
        WATCH: "YELLOW",
        WARNING: "ORANGE",
        CRITICAL: "RED"
    })[normalized] || "GREEN";
}

function statusLabel(status) {
    return ({
        GREEN: "✓ NORMAL",
        YELLOW: "! WATCH",
        ORANGE: "▲ WARNING",
        RED: "✕ CRITICAL"
    })[status] || "• UNKNOWN";
}

export function renderBodyMap(main, vitals = {}, status = {}) {
    let selectedSystem = "cardio";

    const renderDetails = systemKey => {
        const system = SYSTEMS[systemKey];

        const readings = system.indicators.map(([label, key, unit]) => {
            const value = vitals[key] ?? "--";
            const indicatorStatus = getStatus(status, key);

            return `
                <article class="bm-reading">
                    <div>
                        <span class="bm-reading-label">${escapeHTML(label)}</span>
                        <strong>${escapeHTML(value)} ${escapeHTML(unit)}</strong>
                    </div>
                    <span class="bm-status bm-${indicatorStatus.toLowerCase()}">
                        ${statusLabel(indicatorStatus)}
                    </span>
                </article>
            `;
        }).join("");

        return `
            <section class="bm-detail-panel" aria-live="polite">
                <p class="page-eyebrow">SELECTED BODY SYSTEM</p>
                <h3>${escapeHTML(system.title)}</h3>
                <p class="page-description">${escapeHTML(system.description)}</p>
                <div class="bm-reading-list">${readings}</div>
                <p class="bm-disclaimer">
                    Readings are simulated demonstration data, not a medical diagnosis.
                </p>
            </section>
        `;
    };

    main.innerHTML = `
        <div class="page-header">
            <div>
                <p class="page-eyebrow">MISSION MODULE / PHYSIOLOGICAL SYSTEMS</p>
                <h2 class="page-title">Astronaut <span>Body Map</span></h2>
                <p class="page-description">
                    Select a body region to inspect its available health indicators.
                </p>
            </div>
            <span class="badge badge-cyan">SIMULATED DATA</span>
        </div>

        <section class="bm-layout">
            <div class="bm-visual panel">
                <div class="panel-heading">
                    <div>
                        <h3>Human Body Systems</h3>
                        <p>INTERACTIVE HEALTH MAP</p>
                    </div>
                    <span class="badge badge-cyan">5 SYSTEMS</span>
                </div>

                <div class="bm-figure-wrap">
                   <img
    src="./assets/astronaut.webp"
    class="bm-astronaut-image"
    alt="Astronaut in spacesuit"
>

                        <circle cx="120" cy="48" r="32"
                                fill="#10283a" stroke="#39c9e8" stroke-width="2"/>
                        <path d="M90 90 Q120 78 150 90 L166 220
                                 L151 235 L158 365 L137 365
                                 L120 250 L103 365 L82 365
                                 L89 235 L74 220 Z"
                              fill="#10283a" stroke="#39c9e8" stroke-width="2"/>
                        <path d="M76 108 L48 225 L62 231 L95 145
                                 M164 108 L192 225 L178 231 L145 145"
                              fill="none" stroke="#39c9e8" stroke-width="13"
                              stroke-linecap="round"/>
                        <path d="M88 130 Q120 150 152 130"
                              fill="none" stroke="#39c9e8" stroke-width="2"
                              opacity=".6"/>
                        <path d="M100 175 Q120 160 140 175 L140 215
                                 Q120 230 100 215 Z"
                              fill="#123e4e" stroke="#49d9ef" stroke-width="2"/>
                        <path d="M104 238 L104 350 M136 238 L136 350"
                              stroke="#39c9e8" stroke-width="2" opacity=".6"/>
                        <circle cx="120" cy="48" r="9" fill="#f3c66b"/>
                        <circle cx="120" cy="184" r="8" fill="#39dca4"/>
                        <circle cx="120" cy="204" r="5" fill="#39c9e8"/>
                    </svg>

                    <button class="bm-hotspot bm-head" data-system="sleep"
                            aria-label="View sleep and neurobehavioral health">01</button>
                    <button class="bm-hotspot bm-chest" data-system="cardio"
                            aria-label="View cardiovascular system">02</button>
                    <button class="bm-hotspot bm-lungs" data-system="respiratory"
                            aria-label="View respiratory indicator">03</button>
                    <button class="bm-hotspot bm-abdomen" data-system="metabolic"
                            aria-label="View metabolic system">04</button>
                    <button class="bm-hotspot bm-temp" data-system="temperature"
                            aria-label="View thermoregulation">05</button>
                </div>

                <p class="bm-hint">SELECT A NUMBERED SENSOR TO VIEW DETAILS</p>
            </div>

            <div class="bm-side">
                <section class="panel">
                    <div class="panel-heading">
                        <div>
                            <h3>Body Systems</h3>
                            <p>AVAILABLE INDICATORS</p>
                        </div>
                    </div>

                    <div class="bm-system-list">
                        ${Object.entries(SYSTEMS).map(([key, system], index) => `
                            <button class="bm-system-button"
                                    data-system="${key}"
                                    type="button"
                                    aria-pressed="${key === selectedSystem}">
                                <span class="bm-system-number">
                                    ${String(index + 1).padStart(2, "0")}
                                </span>
                                <span>${escapeHTML(system.title)}</span>
                                <span>›</span>
                            </button>
                        `).join("")}
                    </div>
                </section>

                <div id="bodyMapDetails">
                    ${renderDetails(selectedSystem)}
                </div>
            </div>
        </section>

        <p class="bm-footer-note">
            Experimental mission health visualization. Simulated data for demonstration.
        </p>
    `;

    const updateSelection = key => {
        if (!SYSTEMS[key]) return;

        selectedSystem = key;

        main.querySelectorAll("[data-system]").forEach(button => {
            const active = button.dataset.system === key;

            if (button.classList.contains("bm-system-button")) {
                button.setAttribute("aria-pressed", String(active));
            }

            if (button.classList.contains("bm-hotspot")) {
                button.classList.toggle("selected", active);
            }
        });

        const details = main.querySelector("#bodyMapDetails");

        if (details) {
            details.innerHTML = renderDetails(key);
        }
    };

    main.querySelectorAll("[data-system]").forEach(button => {
        button.addEventListener("click", () => {
            updateSelection(button.dataset.system);
        });
    });

    updateSelection(selectedSystem);
}
