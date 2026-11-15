/* =========================================
   ASTROHEALTH - RADIATION DASHBOARD CARD
   Simulated absorbed-dose rate shown as a normal vital-style card.
   Thresholds are illustrative only (not medical or NASA limits).
========================================= */

// Illustrative baseline dose rate (mSv/day) for each mission environment
const BASE_DOSE = {
    spacecraft: 1.8,   // deep space: highest exposure
    station: 0.7,      // low Earth orbit
    rover: 0.5,
    mars: 0.67
};

const SCENARIO_FACTOR = { normal: 1, warning: 3, critical: 6 };

function statusFor(dose) {
    if (dose >= 10) return "RED";
    if (dose >= 5) return "ORANGE";
    if (dose >= 2.5) return "YELLOW";
    return "GREEN";
}

export function getRadiationReading(environmentId, scenario) {
    const base = BASE_DOSE[environmentId] ?? BASE_DOSE.spacecraft;
    const factor = SCENARIO_FACTOR[scenario] ?? 1;
    // gentle wobble so the value looks live, like the other simulated vitals
    const wobble = 1 + Math.sin(Date.now() / 4000) * 0.04;
    const dose = Number((base * factor * wobble).toFixed(2));
    return { dose, status: statusFor(dose) };
}

export function radiationCardHTML(environmentId, scenario, helpers) {

    const { badgeClass, getStatusSymbol } = helpers;
    const { dose, status } = getRadiationReading(environmentId, scenario);

    // gauge fill: 0 to 12 mSv/day maps to 0 to 100 percent
    const fill = Math.min(100, Math.round((dose / 12) * 100));

    return `
        <article class="vital-card radiation-card" data-indicator="radiation">

            <div class="vital-card-top">
                <span class="vital-name">RADIATION</span>
                <span class="vital-icon">☢</span>
            </div>

            <div class="vital-reading">
                ${dose}
                <small>mSv/day</small>
            </div>

            <div class="radiation-gauge ${"radiation-" + status.toLowerCase()}"
                 role="img"
                 aria-label="Simulated radiation dose rate ${dose} millisieverts per day, status ${status}">
                <span style="width:${fill}%"></span>
            </div>

            <div class="vital-bottom">
                <span class="badge ${badgeClass(status)}">
                    ${getStatusSymbol(status)}
                    ${status}
                </span>
                <span class="trend-text">SIMULATED</span>
            </div>

        </article>
    `;
}
