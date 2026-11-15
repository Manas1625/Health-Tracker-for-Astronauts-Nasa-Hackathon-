
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function normalizeSeverity(value) {
    const status = String(value || "GREEN").toUpperCase();

    return ({
        NORMAL: "GREEN",
        WATCH: "YELLOW",
        WARNING: "ORANGE",
        CRITICAL: "RED"
    })[status] || status;
}

function getStatusClass(value) {
    return `report-${normalizeSeverity(value).toLowerCase()}`;
}

function getReadingStatus(status, key) {
    const item = status?.indicators?.[key];
    return normalizeSeverity(
        typeof item === "object" ? item?.status : item
    );
}

function getRecommendations(alerts) {
    if (!alerts.length) {
        return [
            "Continue routine physiological monitoring.",
            "Maintain regular sleep, hydration and exercise check-ins.",
            "Review the next scheduled health assessment."
        ];
    }

    const actions = [];

    alerts.forEach(alert => {
        const severity = normalizeSeverity(alert.severity);
        const indicator = String(alert.indicator || "health indicator");

        if (severity === "RED") {
            actions.push(
                `Contact the flight surgeon regarding the critical ${indicator} alert.`
            );
        } else if (severity === "ORANGE") {
            actions.push(
                `Review the ${indicator} reading and follow the mission medical escalation protocol.`
            );
        } else if (severity === "YELLOW") {
            actions.push(
                `Recheck ${indicator} and continue monitoring for changes.`
            );
        }
    });

    if (!actions.length) {
        actions.push("Continue routine monitoring and review open observations.");
    }

    return [...new Set(actions)];
}

export function renderGroundReport(main, data, showToast) {
    const astronautId = data.astronaut || "AH-001";
    const person = data.crew?.find(item => item.id === astronautId) || {};
    const vitals = data.vitals || {};
    const status = data.status || {};
    const alerts = Array.isArray(data.alerts) ? data.alerts : [];

    const overall = normalizeSeverity(status.overall || "UNKNOWN");

    const reportTime = new Date();
    const reportDate = reportTime.toLocaleString();

    const readings = [
        { label: "Heart Rate", key: "heart_rate", unit: "BPM" },
        { label: "Blood Oxygen", key: "spo2", unit: "%" },
        { label: "Body Temperature", key: "temperature", unit: "°C" },
        { label: "Blood Pressure", key: "blood_pressure", unit: "mmHg" },
        { label: "Blood Glucose", key: "glucose", unit: "mg/dL" },
        { label: "Sleep", key: "sleep", unit: "hours" },
        { label: "Mood", key: "mood", unit: "" }
    ];

    const recommendations = getRecommendations(alerts);

    const alertMarkup = alerts.length
        ? alerts.map(alert => {
            const severity = normalizeSeverity(alert.severity);

            return `
                <article class="report-alert">
                    <div>
                        <strong>${escapeHTML(alert.indicator || "Health observation")}</strong>
                        <p>${escapeHTML(alert.message || "No additional description available.")}</p>
                    </div>
                    <span class="report-status ${getStatusClass(severity)}">
                        ${escapeHTML(severity)}
                    </span>
                </article>
            `;
        }).join("")
        : `
            <div class="report-empty">
                ✓ No open alerts in the current telemetry snapshot.
            </div>
        `;

    main.innerHTML = `
        <div class="page-header">
            <div>
                <p class="page-eyebrow">MISSION CONTROL / MEDICAL DOCUMENTATION</p>
                <h2 class="page-title">Ground <span>Medical Report</span></h2>
                <p class="page-description">
                    Current astronaut health summary and mission observations.
                </p>
            </div>
            <span class="badge badge-cyan">SIMULATED DATA</span>
        </div>

        <section class="report-document">

            <header class="report-document-header">
                <div>
                    <p class="report-eyebrow">ASTROHEALTH / FLIGHT MEDICAL SYSTEM</p>
                    <h2>Mission Health Report</h2>
                    <p>ORBIT-01 · Mission medical record</p>
                </div>
                <div class="report-document-mark">AH</div>
            </header>

            <div class="report-meta">
                <div>
                    <span>ASTRONAUT</span>
                    <strong>${escapeHTML(person.name || astronautId)}</strong>
                </div>
                <div>
                    <span>CREW ID</span>
                    <strong>${escapeHTML(astronautId)}</strong>
                </div>
                <div>
                    <span>MISSION</span>
                    <strong>ORBIT-01</strong>
                </div>
                <div>
                    <span>GENERATED</span>
                    <strong>${escapeHTML(reportDate)}</strong>
                </div>
            </div>

            <section class="report-section">
                <div class="report-section-heading">
                    <div>
                        <p class="report-eyebrow">01 / HEALTH OVERVIEW</p>
                        <h3>Overall Health Status</h3>
                    </div>
                    <span class="report-status ${getStatusClass(overall)}">
                        ${escapeHTML(overall)}
                    </span>
                </div>

                <p class="report-copy">
                    This report summarizes the latest available simulated
                    telemetry and open mission health alerts for the selected crew member.
                </p>
            </section>

            <section class="report-section">
                <div class="report-section-heading">
                    <div>
                        <p class="report-eyebrow">02 / PHYSIOLOGICAL TELEMETRY</p>
                        <h3>Current Vital Readings</h3>
                    </div>
                    <span class="report-small-label">LATEST SNAPSHOT</span>
                </div>

                <div class="report-vitals">
                    ${readings.map(item => {
                        const value = vitals[item.key] ?? "--";
                        const readingStatus = getReadingStatus(status, item.key);

                        return `
                            <article class="report-vital">
                                <span>${escapeHTML(item.label)}</span>
                                <strong>
                                    ${escapeHTML(value)}
                                    <small>${escapeHTML(item.unit)}</small>
                                </strong>
                                <span class="report-status ${getStatusClass(readingStatus)}">
                                    ${escapeHTML(readingStatus)}
                                </span>
                            </article>
                        `;
                    }).join("")}
                </div>
            </section>

            <section class="report-section">
                <div class="report-section-heading">
                    <div>
                        <p class="report-eyebrow">03 / FLIGHT SURGEON REVIEW</p>
                        <h3>Open Health Alerts</h3>
                    </div>
                    <span class="report-small-label">${alerts.length} OPEN</span>
                </div>

                <div class="report-alert-list">
                    ${alertMarkup}
                </div>
            </section>

            <section class="report-section">
                <div class="report-section-heading">
                    <div>
                        <p class="report-eyebrow">04 / OBSERVATIONS</p>
                        <h3>Health Highlights</h3>
                    </div>
                </div>

                <ul class="report-observations">
                    <li>
                        Overall status:
                        <strong>${escapeHTML(overall)}</strong>
                    </li>
                    <li>
                        Current open alerts:
                        <strong>${alerts.length}</strong>
                    </li>
                    <li>
                        Recorded measurements:
                        <strong>${Number(vitals.readings_stored || 0)}</strong>
                    </li>
                </ul>

                <p class="report-note">
                    This is a current snapshot, not a historical trend analysis.
                    Historical comparison requires stored time-series readings.
                </p>
            </section>

            <section class="report-section">
                <div class="report-section-heading">
                    <div>
                        <p class="report-eyebrow">05 / FOLLOW-UP</p>
                        <h3>Recommended Actions</h3>
                    </div>
                </div>

                <ol class="report-recommendations">
                    ${recommendations.map(action => `
                        <li>${escapeHTML(action)}</li>
                    `).join("")}
                </ol>
            </section>

            <footer class="report-document-footer">
                <strong>ASTROHEALTH · MISSION HEALTH CONSOLE</strong>
                <p>
                    Experimental demonstration. Simulated data only.
                    Not a medical diagnosis or substitute for flight-surgeon assessment.
                </p>
            </footer>

        </section>

        <div class="report-actions">
            <button type="button" class="btn btn-primary" id="downloadGroundReport">
                ↓ Download Report
            </button>
            <button type="button" class="btn btn-secondary" id="printGroundReport">
                ⎙ Print / Save as PDF
            </button>
        </div>

        <p class="report-disclaimer">
            Report generated from the latest data available in AstroHealth.
            Verify information before using it for mission decisions.
        </p>
    `;

    // Download a local text report; no backend endpoint is assumed.
    main.querySelector("#downloadGroundReport").addEventListener("click", () => {
        const lines = [
            "ASTROHEALTH — MISSION HEALTH REPORT",
            `Astronaut: ${person.name || astronautId}`,
            `Crew ID: ${astronautId}`,
            "Mission: ORBIT-01",
            `Generated: ${reportDate}`,
            "",
            `Overall status: ${overall}`,
            "",
            "VITAL READINGS",
            ...readings.map(item =>
                `${item.label}: ${vitals[item.key] ?? "--"} ${item.unit} (${getReadingStatus(status, item.key)})`
            ),
            "",
            "OPEN ALERTS",
            ...(alerts.length
                ? alerts.map(alert =>
                    `${normalizeSeverity(alert.severity)} — ${alert.indicator}: ${alert.message}`
                )
                : ["No open alerts in current snapshot."]),
            "",
            "RECOMMENDED ACTIONS",
            ...recommendations.map((action, index) => `${index + 1}. ${action}`),
            "",
            "Current snapshot only. Simulated data. Not a medical diagnosis."
        ];

        const blob = new Blob([lines.join("\n")], {
            type: "text/plain;charset=utf-8"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `AstroHealth_Report_${astronautId}.txt`;
        link.click();

        URL.revokeObjectURL(url);

        showToast?.("Ground report downloaded.", "success");
    });

    main.querySelector("#printGroundReport").addEventListener("click", () => {
        window.print();
    });
}
