/* =========================================
   ASTROHEALTH - DASHBOARD EXTRAS
   1) ECG-style heart-rate trace (zig-zag line)
   2) Mood check-in: astronaut rates mood 0-5
========================================= */

/* -----------------------------------------
   ECG TRACE
   A synthetic ECG-style line drawn from the current BPM.
   It is a visual aid (SIMULATED), not a real ECG recording.
----------------------------------------- */

const ECG_TILE_SECONDS = 4;   // time covered by one tile (must match CSS animation)
const ECG_TILE_WIDTH = 400;   // SVG units per tile
const ECG_MID = 34;           // baseline y position (viewBox height is 60)

// One heartbeat: [position along the beat 0-1, vertical offset]
// P wave, Q dip, tall R spike, S dip, T wave.
const ECG_BEAT = [
    [0, 0], [0.10, 0], [0.15, -3], [0.20, 0], [0.27, 0],
    [0.30, 3], [0.34, -24], [0.38, 9], [0.42, 0],
    [0.55, 0], [0.62, -6], [0.70, 0], [1, 0]
];

function ecgPoints(bpm) {
    const valid = Number.isFinite(bpm) && bpm > 0;
    const rate = valid ? Math.min(200, Math.max(30, bpm)) : 0;
    const beats = valid
        ? Math.max(1, Math.round(rate * ECG_TILE_SECONDS / 60))
        : 0;

    const points = [];

    // Two identical tiles side by side so the CSS scroll loops seamlessly.
    for (let tile = 0; tile < 2; tile++) {
        const offset = tile * ECG_TILE_WIDTH;

        if (!beats) {
            // No reading yet: flat baseline
            points.push(`${offset},${ECG_MID}`, `${offset + ECG_TILE_WIDTH},${ECG_MID}`);
            continue;
        }

        const beatWidth = ECG_TILE_WIDTH / beats;

        for (let beat = 0; beat < beats; beat++) {
            for (const [fraction, dy] of ECG_BEAT) {
                const x = offset + beat * beatWidth + fraction * beatWidth;
                points.push(`${x.toFixed(1)},${ECG_MID + dy}`);
            }
        }
    }

    return points.join(" ");
}

export function ecgHTML(value, status = "GREEN") {

    const bpm = parseFloat(value);

    const safeStatus = ["GREEN", "YELLOW", "ORANGE", "RED"].includes(status)
        ? status
        : "GREEN";

    // The dashboard re-renders every 2.5 s. A negative delay based on the
    // clock keeps the trace in phase, so it does not restart on each refresh.
    const phase = ((Date.now() / 1000) % ECG_TILE_SECONDS).toFixed(2);

    const label = Number.isFinite(bpm)
        ? `Simulated ECG-style trace at ${Math.round(bpm)} beats per minute`
        : "Simulated ECG-style trace, waiting for heart rate";

    return `
        <div class="ecg-strip ecg-${safeStatus.toLowerCase()}"
             role="img"
             aria-label="${label}">

            <span class="ecg-label" aria-hidden="true">ECG · SIM</span>

            <svg class="ecg-svg"
                 viewBox="0 0 ${ECG_TILE_WIDTH * 2} 60"
                 preserveAspectRatio="none"
                 focusable="false"
                 aria-hidden="true"
                 style="animation-delay:-${phase}s">

                <polyline class="ecg-line"
                          fill="none"
                          points="${ecgPoints(bpm)}"></polyline>

            </svg>

        </div>
    `;
}


/* -----------------------------------------
   MOOD CHECK-IN (0-5)
----------------------------------------- */

const MOOD_STORAGE = "astrohealth-mood-v1";

export const MOOD_SCALE = [
    { score: 0, label: "Very low",  status: "ORANGE",
      tip: "Take a moment to rest. Consider talking with a crew member or the flight psychologist." },
    { score: 1, label: "Low",       status: "ORANGE",
      tip: "A short break, light exercise or a chat with the crew may help." },
    { score: 2, label: "Below average", status: "YELLOW",
      tip: "Keep an eye on sleep, activity and social time today." },
    { score: 3, label: "Neutral",   status: "GREEN",
      tip: "Steady is fine. Check in again later today." },
    { score: 4, label: "Good",      status: "GREEN",
      tip: "Good. Keep up your routine." },
    { score: 5, label: "Excellent", status: "GREEN",
      tip: "Excellent. Keep it up." }
];

// In-memory copy so the selection survives even if localStorage is blocked
const moodMemory = new Map();

function moodKey(astronautId) {
    return `${MOOD_STORAGE}:${astronautId || "AH-001"}`;
}

export function readMood(astronautId) {

    if (moodMemory.has(astronautId)) {
        return moodMemory.get(astronautId);
    }

    try {
        const saved = JSON.parse(localStorage.getItem(moodKey(astronautId)));
        const score = Number(saved?.score);

        if (Number.isInteger(score) && score >= 0 && score <= 5) {
            return { score, timestamp: saved.timestamp };
        }
    } catch {
        // ignore unreadable storage
    }

    return null;
}

function saveMood(astronautId, score) {

    const entry = { score, timestamp: new Date().toISOString() };

    moodMemory.set(astronautId, entry);

    try {
        localStorage.setItem(moodKey(astronautId), JSON.stringify(entry));
    } catch {
        // memory copy is enough for this session
    }

    return entry;
}

export function moodCardHTML(astronautId, helpers) {

    const { badgeClass, getStatusSymbol } = helpers;

    const entry = readMood(astronautId);
    const info = entry ? MOOD_SCALE[entry.score] : null;

    const buttons = MOOD_SCALE.map(item => `
        <button type="button"
                class="mood-btn"
                data-mood="${item.score}"
                aria-pressed="${entry?.score === item.score}"
                aria-label="Mood ${item.score} of 5, ${item.label}">
            ${item.score}
        </button>
    `).join("");

    const reading = info
        ? `${info.score}<small>/ 5 · ${info.label.toUpperCase()}</small>`
        : `<span class="mood-prompt">How are you feeling?</span>`;

    const badge = info
        ? `<span class="badge ${badgeClass(info.status)}">
               ${getStatusSymbol(info.status)} ${info.status}
           </span>`
        : `<span class="badge badge-cyan">TAP 0–5</span>`;

    const time = entry
        ? "LOGGED " + new Date(entry.timestamp)
            .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "SELF-REPORT";

    return `
        <article class="vital-card mood-card" data-indicator="mood">

            <div class="vital-card-top">
                <span class="vital-name">MOOD CHECK-IN</span>
                <span class="vital-icon">☻</span>
            </div>

            <div class="vital-reading">${reading}</div>

            <div class="mood-scale"
                 role="group"
                 aria-label="Rate your mood from 0 to 5">
                ${buttons}
            </div>

            <div class="mood-caption" aria-hidden="true">
                <span>0 VERY LOW</span>
                <span>5 EXCELLENT</span>
            </div>

            <p class="mood-tip" aria-live="polite">
                ${info ? info.tip : "Rate your mood today from 0 to 5."}
            </p>

            <div class="vital-bottom">
                ${badge}
                <span class="trend-text">${time}</span>
            </div>

        </article>
    `;
}

/**
 * One delegated click listener on the page container.
 * The dashboard is re-rendered every 2.5 s, so listeners on the buttons
 * themselves would be lost; the container survives re-renders.
 */
export function bindMoodInput(container, getAstronaut, onChange, notify = () => {}) {

    container.addEventListener("click", event => {

        const button = event.target.closest("[data-mood]");

        if (!button || !container.contains(button)) return;

        const score = Number(button.dataset.mood);

        if (!Number.isInteger(score) || score < 0 || score > 5) return;

        saveMood(getAstronaut(), score);

        onChange();

        // Re-rendering replaces the buttons, so restore keyboard focus
        container
            .querySelector(`[data-mood="${score}"]`)
            ?.focus({ preventScroll: true });

        notify(`Mood logged: ${score}/5 (${MOOD_SCALE[score].label}).`);
    });
}
