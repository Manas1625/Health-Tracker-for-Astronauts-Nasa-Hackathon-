/*
 * AstroHealth — NASA OSDR RadLab radiation card.
 * Values are historical ISS instrument measurements returned by the Flask backend.
 * NASA RadLab units: absorbed dose rate = μGy/hour; dose equivalent rate = μSv/hour.
 */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
}

function statusPresentation(anomaly) {
    const status = String(anomaly?.status || "INSUFFICIENT_BASELINE").toUpperCase();

    if (status === "ANOMALY_DETECTED") {
        return { color: "ORANGE", label: "ANOMALY", symbol: "▲" };
    }
    if (status === "NORMAL") {
        return { color: "GREEN", label: "WITHIN BASELINE", symbol: "✓" };
    }
    if (status === "NO_DATA") {
        return { color: "YELLOW", label: "NO DATA", symbol: "!" };
    }
    return { color: "YELLOW", label: "BASELINE FORMING", symbol: "!" };
}

export function radiationCardHTML(reading, anomaly, helpers) {
    const { badgeClass } = helpers;
    const presentation = statusPresentation(anomaly);

    if (!reading) {
        return `
            <article class="vital-card radiation-card" data-indicator="radiation">
                <div class="vital-card-top">
                    <span class="vital-name">NASA RADIATION</span>
                    <span class="vital-icon">☢</span>
                </div>
                <div class="vital-reading">-- <small>μGy/hour</small></div>
                <p class="trend-text">NASA OSDR RADLAB · NO STORED RECORDS</p>
                <div class="vital-bottom">
                    <span class="badge badge-yellow">! WAITING FOR NASA DATA</span>
                    <span class="trend-text">HISTORICAL ISS</span>
                </div>
            </article>
        `;
    }

    const absorbed = reading.absorbed_dose_rate;
    const equivalent = reading.dose_equivalent_rate;
    const flux = reading.flux;
    const timestamp = reading.timestamp
        ? new Date(reading.timestamp).toLocaleString()
        : "Timestamp unavailable";

    return `
        <article class="vital-card radiation-card" data-indicator="radiation">
            <div class="vital-card-top">
                <span class="vital-name">NASA RADIATION · ${escapeHTML(reading.instrument_id || "ISS")}</span>
                <span class="vital-icon">☢</span>
            </div>

            <div class="vital-reading">
                ${absorbed == null ? "--" : Number(absorbed).toFixed(3)}
                <small>μGy/hour</small>
            </div>

            <div class="radiation-nasa-details">
                <div><span>DOSE EQUIVALENT</span><strong>${equivalent == null ? "--" : Number(equivalent).toFixed(3)} μSv/hour</strong></div>
                <div><span>PARTICLE FLUX</span><strong>${flux == null ? "--" : Number(flux).toFixed(3)}</strong></div>
            </div>

            <div class="vital-bottom">
                <span class="badge ${badgeClass(presentation.color)}">
                    ${presentation.symbol} ${presentation.label}
                </span>
                <span class="trend-text">NASA OSDR RADLAB</span>
            </div>

            <p class="radiation-timestamp">
                ${escapeHTML(timestamp)} · ${escapeHTML(reading.spacecraft || "ISS")}
            </p>
            <p class="radiation-disclaimer">
                Historical instrument data. Not a real-time crew dosimeter or individual exposure estimate.
            </p>
        </article>
    `;
}
