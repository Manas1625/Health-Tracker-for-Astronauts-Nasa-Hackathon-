/* =========================================
   ASTROHEALTH - NASA RADIATION DATA CARD
   Displays the latest historical reading returned by the backend.
   No synthetic dose values are generated in the frontend.
========================================= */

export function radiationCardHTML(reading) {

    if (!reading) {
        return `
            <article class="vital-card radiation-card" data-indicator="radiation">
                <div class="vital-card-top">
                    <span class="vital-name">RADIATION</span>
                    <span class="vital-icon">☢</span>
                </div>
                <div class="vital-reading">NO DATA</div>
                <div class="vital-bottom">
                    <span class="badge badge-cyan">UNAVAILABLE</span>
                    <span class="trend-text">NASA OSDR RADLAB</span>
                </div>
            </article>
        `;
    }

    const absorbed = reading.absorbed_dose_rate;
    const equivalent = reading.dose_equivalent_rate;
    const flux = reading.flux;

    const formatValue = value =>
        value === null || value === undefined
            ? "--"
            : Number.isFinite(Number(value))
                ? Number(value).toPrecision(5)
                : String(value);

    return `
        <article class="vital-card radiation-card" data-indicator="radiation">
            <div class="vital-card-top">
                <span class="vital-name">RADIATION</span>
                <span class="vital-icon">☢</span>
            </div>

            <div class="vital-reading">
                ${formatValue(absorbed)}
                <small>absorbed dose rate</small>
            </div>

            <div class="trend-text">
                Dose equivalent: ${formatValue(equivalent)}
            </div>
            <div class="trend-text">
                Flux: ${formatValue(flux)}
            </div>

            <div class="vital-bottom">
                <span class="badge badge-cyan">HISTORICAL DATA</span>
                <span class="trend-text">${escapeHTML(reading.instrument_id || "NASA RADLAB")}</span>
            </div>
        </article>
    `;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}
