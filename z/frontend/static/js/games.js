import { getState } from "./state.js";

const STORAGE_PREFIX = "astrohealth-focus-v1";
const TRIALS = 6;

function storageKey(astronaut) {
    return `${STORAGE_PREFIX}:${astronaut || "AH-001"}`;
}

function readLocal(astronaut) {
    try {
        return JSON.parse(localStorage.getItem(storageKey(astronaut))) || {
            sessions: [], points: 0, streak: 0, lastPlayedDay: null
        };
    } catch {
        return { sessions: [], points: 0, streak: 0, lastPlayedDay: null };
    }
}

function saveLocal(astronaut, data) {
    try { localStorage.setItem(storageKey(astronaut), JSON.stringify(data)); }
    catch (error) { console.warn("Focus game progress could not be saved:", error); }
}

function dayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function scoreReaction(times, falseStarts) {
    if (!times.length) return 0;
    const med = median(times);
    const lapses = times.filter(value => value > 500).length;
    return Math.max(0, Math.min(100, Math.round(100 - Math.max(0, med - 200) * 0.12 - lapses * 5 - falseStarts * 3)));
}

function recordSession(astronaut, session) {
    const data = readLocal(astronaut);
    const today = dayKey();
    const previousBest = Math.max(0, ...data.sessions.filter(item => item.game === session.game).map(item => item.score));
    const bonus = session.score > previousBest ? 15 : 0;
    const earned = 25 + bonus;

    if (data.lastPlayedDay !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        data.streak = data.lastPlayedDay === dayKey(yesterday) ? data.streak + 1 : 1;
        data.lastPlayedDay = today;
    }

    data.points += earned;
    data.sessions.unshift({ ...session, astronaut, timestamp: new Date().toISOString(), points: earned });
    data.sessions = data.sessions.slice(0, 60);
    saveLocal(astronaut, data);
    return { data, earned, bonus, previousBest };
}

function getTodayScore(data) {
    const today = dayKey();
    const scores = data.sessions.filter(item => item.timestamp?.slice(0, 10) === today).map(item => item.score);
    return scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null;
}

function drawHistory(canvas, sessions) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.clientWidth || 320;
    const height = canvas.clientHeight || 86;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(135,170,195,.13)";
    ctx.lineWidth = 1;
    for (let y = 15; y < height; y += 22) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    const points = sessions.slice(0, 10).reverse();
    if (!points.length) {
        ctx.fillStyle = "#8296a9"; ctx.font = "11px monospace";
        ctx.fillText("Complete a game to start your trend", 8, height / 2 + 4);
        return;
    }
    const values = points.map(item => item.score);
    const xStep = points.length > 1 ? (width - 18) / (points.length - 1) : 0;
    const y = value => height - 10 - (value / 100) * (height - 22);
    ctx.strokeStyle = "rgba(66,201,232,.22)";
    ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(0, y(70)); ctx.lineTo(width, y(70)); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath();
    points.forEach((item, index) => {
        const px = 9 + index * xStep;
        if (index === 0) ctx.moveTo(px, y(item.score)); else ctx.lineTo(px, y(item.score));
    });
    ctx.strokeStyle = "#42c9e8"; ctx.lineWidth = 2; ctx.stroke();
    points.forEach((item, index) => {
        ctx.beginPath(); ctx.arc(9 + index * xStep, y(item.score), 3, 0, Math.PI * 2);
        ctx.fillStyle = "#45dda0"; ctx.fill();
    });
}

export function renderGamesPage(main, showToast = () => {}) {
    const astronaut = getState().astronaut || "AH-001";
    let local = readLocal(astronaut);
    let cleanup = null;

    const todayScore = getTodayScore(local);
    const bestFor = game => Math.max(0, ...local.sessions.filter(item => item.game === game).map(item => item.score));
    const lastFor = game => local.sessions.find(item => item.game === game);
    const dateLabel = item => item ? new Date(item.timestamp).toLocaleDateString() : "Not played yet";

    main.innerHTML = `
      <section class="page-header focus-page-header">
        <div><p class="page-eyebrow">MISSION MODULE / COGNITIVE READINESS</p>
          <h2 class="page-title">Focus <span>Games</span></h2>
          <p class="page-description">Short cognitive check-ins for mission alertness and readiness.</p>
        </div><span class="badge badge-cyan">SIMULATED DATA</span>
      </section>
      <div class="focus-disclaimer" role="note"><strong>ⓘ Experimental cognitive check-in.</strong> Not a medical test or diagnosis. NASA uses similar reaction-time vigilance tests to track alertness in crews.</div>
      <section class="focus-summary-grid" aria-label="Focus summary">
        <article class="panel focus-score-card"><div class="focus-label">TODAY'S FOCUS SCORE</div>
          <div class="focus-score-value">${todayScore === null ? "—" : todayScore}<small>/100</small></div>
          <p>${todayScore === null ? "Play one game to create today's score." : "Average of games completed today."}</p>
        </article>
        <article class="panel focus-stat-card"><div class="focus-label">MISSION STREAK</div><strong>${local.streak} <small>days</small></strong><p>Consecutive days with a check-in</p></article>
        <article class="panel focus-stat-card"><div class="focus-label">FOCUS POINTS</div><strong>${local.points}</strong><p>Earn 25 points per completed game</p></article>
      </section>
      <section class="panel focus-how"><div class="panel-heading"><div><h3>How it works</h3><p>WHY FOCUS MATTERS ON LONG MISSIONS</p></div><span class="badge badge-green">SELF-CHECK</span></div>
        <p>Fatigue, isolation and disrupted sleep can affect attention and reaction time. These short activities help you notice changes in your own performance. Results are intended to be compared with <strong>your personal baseline</strong>, not with another crew member.</p>
      </section>
      <section class="focus-games-section"><div class="panel-heading"><div><h3>Choose a cognitive check-in</h3><p>THREE SHORT ACTIVITIES · PLAY ANY, IN ANY ORDER</p></div><span class="badge badge-cyan">${astronaut}</span></div>
        <div class="focus-game-grid">
          <article class="panel focus-game-card"><div class="focus-game-icon" aria-hidden="true">◉</div><div class="focus-label">REACTION / VIGILANCE</div><h3>Reaction Pulse</h3><p>Measure how quickly you respond to a visual signal.</p><div class="focus-game-meta"><span>⏱ About 1 min</span><span>Best: ${bestFor("reaction") || "—"}</span></div><p class="focus-last-played">Last played: ${dateLabel(lastFor("reaction"))}</p><button class="btn btn-primary focus-play" data-game="reaction">Play Reaction Pulse <span aria-hidden="true">→</span></button></article>
          <article class="panel focus-game-card"><div class="focus-game-icon" aria-hidden="true">◈</div><div class="focus-label">SELECTIVE ATTENTION</div><h3>Color Clash</h3><p>Choose the ink color while ignoring the written word.</p><div class="focus-game-meta"><span>⏱ About 2 min</span><span>Best: ${bestFor("stroop") || "—"}</span></div><p class="focus-last-played">Last played: ${dateLabel(lastFor("stroop"))}</p><button class="btn btn-primary focus-play" data-game="stroop">Play Color Clash <span aria-hidden="true">→</span></button></article>
          <article class="panel focus-game-card"><div class="focus-game-icon" aria-hidden="true">▦</div><div class="focus-label">WORKING MEMORY</div><h3>Memory Grid</h3><p>Remember and repeat a growing sequence of lights.</p><div class="focus-game-meta"><span>⏱ About 2 min</span><span>Best: ${bestFor("memory") || "—"}</span></div><p class="focus-last-played">Last played: ${dateLabel(lastFor("memory"))}</p><button class="btn btn-primary focus-play" data-game="memory">Play Memory Grid <span aria-hidden="true">→</span></button></article>
        </div>
      </section>
      <section class="panel focus-history"><div class="panel-heading"><div><h3>Recent focus sessions</h3><p>YOUR RECENT SCORES · PERSONAL PROGRESS</p></div><span class="badge badge-cyan">LOCAL DEMO HISTORY</span></div><canvas class="focus-history-canvas" aria-label="Recent focus scores chart"></canvas><div class="focus-history-foot"><span>0</span><span>Personal session scores (0–100)</span><span>100</span></div></section>
      <div class="focus-game-stage" hidden></div>
      <p class="focus-footer-note">Experimental cognitive check-in. Not a medical test.</p>
    `;

    drawHistory(main.querySelector(".focus-history-canvas"), local.sessions);

    const stage = main.querySelector(".focus-game-stage");
    const starters = { reaction: startReaction, stroop: startStroop, memory: startMemory };
    const onPlay = event => {
        const button = event.target.closest("[data-game]");
        const start = button && starters[button.dataset.game];
        if (start) start();
    };
    main.addEventListener("click", onPlay);

    // Any game can be opened at any time; opening one closes whichever is running.
    function openStage(html) {
        if (cleanup) cleanup();
        cleanup = null;
        stage.hidden = false;
        stage.innerHTML = html;
        stage.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }

    function finishToHub() {
        local = readLocal(astronaut);
        drawHistory(main.querySelector(".focus-history-canvas"), local.sessions);
        stage.hidden = true;
        stage.innerHTML = "";
        cleanup = null;
        renderGamesSummaryRefresh(main, local);
    }

    function startReaction() {
        openStage(`
          <section class="panel reaction-panel" aria-label="Reaction Pulse game">
            <div class="panel-heading"><div><h3>Reaction Pulse</h3><p>PSYCHOMOTOR VIGILANCE · ${TRIALS} TRIALS</p></div><span class="badge badge-cyan" id="rp-progress">READY</span></div>
            <p class="reaction-instructions">Wait for the ring to turn cyan, then press <kbd>SPACE</kbd> or tap the ring as quickly as you can. Don't anticipate the signal.</p>
            <div class="reaction-ring-wrap"><button class="reaction-ring" type="button" id="rp-target" aria-label="Wait for the cyan signal, then press Space or activate this button"><span id="rp-target-text">READY</span></button></div>
            <div class="reaction-feedback" id="rp-feedback" aria-live="polite">${TRIALS} trials · Random signal delay 2–8 seconds</div>
            <div class="reaction-controls"><button class="btn btn-primary" id="rp-start">Start</button><button class="btn" id="rp-pause" disabled>Pause</button><button class="btn" id="rp-exit">Exit</button></div>
            <div class="reaction-last" id="rp-last">Your reaction time will appear here.</div>
          </section>`);
        setupReaction(stage, astronaut, showToast, finishToHub, startReaction, fn => { cleanup = fn; });
    }

    function startStroop() {
        openStage(`
          <section class="panel reaction-panel" aria-label="Color Clash game">
            <div class="panel-heading"><div><h3>Color Clash</h3><p>SELECTIVE ATTENTION · ${STROOP_TRIALS} TRIALS</p></div><span class="badge badge-cyan" id="cc-progress">READY</span></div>
            <p class="reaction-instructions">Pick the <strong>ink color</strong> of the word, not what the word says. Click a button or press <kbd>1</kbd>–<kbd>4</kbd>.</p>
            <div class="stroop-word" id="cc-word" aria-live="polite">READY</div>
            <div class="stroop-options" id="cc-options">${STROOP_COLORS.map((c, i) => `<button class="btn stroop-btn" type="button" data-color="${i}" disabled><kbd>${i + 1}</kbd><span class="stroop-dot" style="background:${c.css}" aria-hidden="true"></span>${c.name}</button>`).join("")}</div>
            <div class="reaction-feedback" id="cc-feedback" aria-live="polite">${STROOP_TRIALS} trials · answer as fast and accurately as you can</div>
            <div class="reaction-controls"><button class="btn btn-primary" id="cc-start">Start</button><button class="btn" id="cc-exit">Exit</button></div>
          </section>`);
        setupStroop(stage, astronaut, showToast, finishToHub, startStroop, fn => { cleanup = fn; });
    }

    function startMemory() {
        openStage(`
          <section class="panel reaction-panel" aria-label="Memory Grid game">
            <div class="panel-heading"><div><h3>Memory Grid</h3><p>WORKING MEMORY · ${MEMORY_ROUNDS} ROUNDS</p></div><span class="badge badge-cyan" id="mg-progress">READY</span></div>
            <p class="reaction-instructions">Watch the lights, then repeat the sequence in the same order. You have ${MEMORY_LIVES} lives.</p>
            <div class="memory-grid" id="mg-grid">${Array.from({ length: 9 }, (_, i) => `<button class="memory-cell" type="button" data-cell="${i}" aria-label="Cell ${i + 1}" disabled></button>`).join("")}</div>
            <div class="reaction-feedback" id="mg-feedback" aria-live="polite">Press Start when ready</div>
            <div class="reaction-controls"><button class="btn btn-primary" id="mg-start">Start</button><button class="btn" id="mg-exit">Exit</button></div>
          </section>`);
        setupMemory(stage, astronaut, showToast, finishToHub, startMemory, fn => { cleanup = fn; });
    }

    return () => {
        main.removeEventListener("click", onPlay);
        if (cleanup) cleanup();
    };
}

function renderGamesSummaryRefresh(main, local) {
    const score = getTodayScore(local);
    const scoreValue = main.querySelector(".focus-score-value");
    const scoreText = main.querySelector(".focus-score-card p");
    const streak = main.querySelector(".focus-stat-card strong");
    const points = main.querySelectorAll(".focus-stat-card strong")[1];
    if (scoreValue) scoreValue.innerHTML = `${score ?? "—"}<small>/100</small>`;
    if (scoreText) scoreText.textContent = score === null ? "Play one game to create today's score." : "Average of games completed today.";
    if (streak) streak.innerHTML = `${local.streak} <small>days</small>`;
    if (points) points.textContent = local.points;
}

function setupReaction(stage, astronaut, showToast, onFinish, onRestart, setCleanup) {
    const target = stage.querySelector("#rp-target");
    const targetText = stage.querySelector("#rp-target-text");
    const progress = stage.querySelector("#rp-progress");
    const feedback = stage.querySelector("#rp-feedback");
    const last = stage.querySelector("#rp-last");
    const startButton = stage.querySelector("#rp-start");
    const pauseButton = stage.querySelector("#rp-pause");
    const exitButton = stage.querySelector("#rp-exit");

    let phase = "idle";
    let timer = null;
    let startAt = 0;
    let trial = 0;
    let falseStarts = 0;
    let times = [];
    let countdown = 3;
    let disposed = false;
    let pausedRemaining = 0;
    let signalDelay = 0;
    let signalDue = 0;
    let countdownTimer = null;

    const clearTimers = () => { clearTimeout(timer); clearInterval(countdownTimer); timer = null; countdownTimer = null; };

    function updateProgress() { progress.textContent = phase === "complete" ? "COMPLETE" : `TRIAL ${Math.min(trial + 1, TRIALS)} / ${TRIALS}`; }

    function showResults() {
        phase = "complete"; clearTimers(); dispose(); target.disabled = true; target.classList.remove("is-ready", "is-waiting");
        const med = median(times); const fastest = Math.min(...times); const slowest = Math.max(...times);
        const lapses = times.filter(value => value > 500).length; const score = scoreReaction(times, falseStarts);
        const saved = recordSession(astronaut, { game: "reaction", score, details: { medianMs: med, fastestMs: fastest, slowestMs: slowest, lapses, falseStarts, trials: times.length } });
        stage.querySelector(".reaction-panel").innerHTML = `
          <div class="panel-heading"><div><h3>Reaction Pulse · Results</h3><p>SESSION COMPLETE · ${times.length} VALID TRIALS</p></div><span class="badge badge-green">SAVED LOCALLY</span></div>
          <div class="reaction-result-score"><div class="reaction-score-ring" style="--score:${score}"><strong>${score}</strong><span>/100</span></div><div><div class="focus-label">REACTION SCORE</div><p>${score >= 80 ? "Strong session. Keep comparing with your own baseline." : score >= 60 ? "A mixed session. Consider a short break and repeat later." : "Consider rest and a later re-check; this is not a diagnosis."}</p></div></div>
          <div class="reaction-result-grid"><div><small>MEDIAN</small><strong>${med} ms</strong></div><div><small>FASTEST</small><strong>${fastest} ms</strong></div><div><small>SLOWEST</small><strong>${slowest} ms</strong></div><div><small>LAPSES (&gt;500 ms)</small><strong>${lapses}</strong></div><div><small>FALSE STARTS</small><strong>${falseStarts}</strong></div></div>
          <p class="focus-disclaimer">This experimental check-in is not a medical test or diagnosis. Interpret results against your personal baseline.</p>
          <div class="reaction-controls"><button class="btn btn-primary" id="rp-again">Play again</button><button class="btn" id="rp-done">Return to Games</button></div>`;
        showToast(`Reaction Pulse complete · +${saved.earned} focus points${saved.bonus ? " · personal best bonus +15" : ""}`, "success");
        stage.querySelector("#rp-again").addEventListener("click", () => {
            dispose();
            onRestart();
        });
        stage.querySelector("#rp-done").addEventListener("click", onFinish);
        updateProgress();
    }

    function scheduleSignal(delay = 2000 + Math.random() * 6000) {
        phase = "waiting"; target.disabled = false; target.classList.remove("is-ready"); target.classList.add("is-waiting");
        targetText.textContent = "WAIT"; feedback.textContent = "Stay ready. Wait for the cyan signal.";
        signalDelay = delay; signalDue = Date.now() + delay;
        timer = setTimeout(() => {
            if (disposed || phase !== "waiting") return;
            phase = "ready"; startAt = performance.now(); target.classList.remove("is-waiting"); target.classList.add("is-ready");
            targetText.textContent = "PRESS!"; feedback.textContent = "Signal active — respond now!";
        }, delay);
        updateProgress();
    }

    function handleResponse() {
        if (disposed || phase === "idle" || phase === "paused" || phase === "countdown" || phase === "complete") return;
        if (phase === "waiting") {
            falseStarts += 1; clearTimeout(timer); target.classList.remove("is-waiting"); target.classList.add("is-false");
            targetText.textContent = "EARLY"; feedback.textContent = `False start ${falseStarts}. Wait for the signal.`;
            last.textContent = "False start recorded — the same trial will repeat.";
            timer = setTimeout(() => { if (!disposed && phase !== "paused") scheduleSignal(); }, 850);
            return;
        }
        if (phase === "ready") {
            const elapsed = Math.round(performance.now() - startAt); times.push(elapsed); trial += 1;
            phase = "feedback"; clearTimeout(timer); target.classList.remove("is-ready"); targetText.textContent = `${elapsed} ms`;
            feedback.textContent = elapsed > 500 ? "Lapse recorded (>500 ms)." : "Response recorded.";
            last.textContent = `Trial ${trial}/${TRIALS}: ${elapsed} ms`;
            updateProgress();
            if (trial >= TRIALS) { timer = setTimeout(showResults, 700); }
            else { timer = setTimeout(() => scheduleSignal(), 900); }
        }
    }

    function beginCountdown() {
        clearTimers(); phase = "countdown"; countdown = 3; trial = 0; falseStarts = 0; times = [];
        target.disabled = true; target.classList.remove("is-ready", "is-waiting", "is-false"); targetText.textContent = String(countdown);
        feedback.textContent = "Get ready…"; startButton.disabled = true; pauseButton.disabled = false; pauseButton.textContent = "Pause";
        countdownTimer = setInterval(() => {
            countdown -= 1;
            if (countdown > 0) targetText.textContent = String(countdown);
            else { clearInterval(countdownTimer); countdownTimer = null; startButton.disabled = false; scheduleSignal(); }
        }, 700);
    }

    function pauseGame() {
        if (["idle", "complete", "paused"].includes(phase)) return;
        if (phase === "waiting") pausedRemaining = Math.max(250, signalDue - Date.now());
        clearTimers(); phase = "paused"; target.disabled = true; target.classList.remove("is-ready", "is-waiting"); targetText.textContent = "PAUSED";
        feedback.textContent = "Game paused. Press Resume when ready."; pauseButton.textContent = "Resume"; startButton.disabled = true;
    }

    function resumeGame() {
        if (phase !== "paused") return;
        startButton.disabled = false; pauseButton.textContent = "Pause";
        if (times.length === 0 && trial === 0) beginCountdown();
        else scheduleSignal(pausedRemaining || 1000);
    }

    function onKey(event) {
        if (event.code === "Space" && !event.repeat && !disposed) {
            event.preventDefault(); handleResponse();
        }
    }
    function onVisibility() { if (document.hidden) pauseGame(); }
    function onStart() { if (phase === "paused") resumeGame(); else if (phase === "idle") beginCountdown(); }
    function onPause() { if (phase === "paused") resumeGame(); else pauseGame(); }
    function onExit() { dispose(); onFinish(); }
    function dispose() {
        if (disposed) return; disposed = true; clearTimers();
        target.removeEventListener("click", handleResponse); startButton.removeEventListener("click", onStart);
        pauseButton.removeEventListener("click", onPause); exitButton.removeEventListener("click", onExit);
        document.removeEventListener("keydown", onKey); document.removeEventListener("visibilitychange", onVisibility);
    }

    target.addEventListener("click", handleResponse); startButton.addEventListener("click", onStart);
    pauseButton.addEventListener("click", onPause); exitButton.addEventListener("click", onExit);
    document.addEventListener("keydown", onKey); document.addEventListener("visibilitychange", onVisibility);
    setCleanup(dispose);
}


/* ---------- shared results screen for Color Clash and Memory Grid ---------- */

function showGameResults(stage, { title, game, score, rows, message, astronaut, showToast, onFinish, onRestart, dispose }) {
    dispose();
    const saved = recordSession(astronaut, { game, score, details: Object.fromEntries(rows.map(([label, value]) => [label, value])) });
    stage.querySelector(".reaction-panel").innerHTML = `
      <div class="panel-heading"><div><h3>${title} · Results</h3><p>SESSION COMPLETE</p></div><span class="badge badge-green">SAVED LOCALLY</span></div>
      <div class="reaction-result-score"><div class="reaction-score-ring" style="--score:${score}"><strong>${score}</strong><span>/100</span></div><div><div class="focus-label">${title.toUpperCase()} SCORE</div><p>${message}</p></div></div>
      <div class="reaction-result-grid" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">${rows.map(([label, value]) => `<div><small>${label}</small><strong>${value}</strong></div>`).join("")}</div>
      <p class="focus-disclaimer">This experimental check-in is not a medical test or diagnosis. Interpret results against your personal baseline.</p>
      <div class="reaction-controls"><button class="btn btn-primary" id="gr-again">Play again</button><button class="btn" id="gr-done">Return to Games</button></div>`;
    showToast(`${title} complete · +${saved.earned} focus points${saved.bonus ? " · personal best bonus +15" : ""}`, "success");
    stage.querySelector("#gr-again").addEventListener("click", onRestart);
    stage.querySelector("#gr-done").addEventListener("click", onFinish);
}

/* ---------- Color Clash (Stroop) ---------- */

const STROOP_TRIALS = 8;
const STROOP_COLORS = [
    { name: "RED", css: "#ff596d" },
    { name: "BLUE", css: "#4aa3ff" },
    { name: "GREEN", css: "#37d99a" },
    { name: "YELLOW", css: "#f4c75b" }
];

function buildStroopTrials() {
    const trials = Array.from({ length: STROOP_TRIALS }, (_, index) => {
        const ink = Math.floor(Math.random() * STROOP_COLORS.length);
        const word = index % 2 === 0 ? ink : (ink + 1 + Math.floor(Math.random() * (STROOP_COLORS.length - 1))) % STROOP_COLORS.length;
        return { ink, word };
    });
    for (let i = trials.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [trials[i], trials[j]] = [trials[j], trials[i]];
    }
    return trials;
}

function setupStroop(stage, astronaut, showToast, onFinish, onRestart, setCleanup) {
    const wordEl = stage.querySelector("#cc-word");
    const progress = stage.querySelector("#cc-progress");
    const feedback = stage.querySelector("#cc-feedback");
    const startButton = stage.querySelector("#cc-start");
    const exitButton = stage.querySelector("#cc-exit");
    const optionButtons = [...stage.querySelectorAll("[data-color]")];

    const trials = buildStroopTrials();
    let index = 0, correct = 0, shownAt = 0, active = false, disposed = false, timer = null;
    const times = [];

    function setOptions(enabled) { optionButtons.forEach(button => { button.disabled = !enabled; }); }

    function showTrial() {
        if (disposed) return;
        const trial = trials[index];
        wordEl.textContent = STROOP_COLORS[trial.word].name;
        wordEl.style.color = STROOP_COLORS[trial.ink].css;
        progress.textContent = `TRIAL ${index + 1} / ${STROOP_TRIALS}`;
        feedback.textContent = "Which color is the ink?";
        setOptions(true);
        shownAt = performance.now();
        active = true;
    }

    function answer(choice) {
        if (!active || disposed) return;
        active = false;
        setOptions(false);
        const trial = trials[index];
        const elapsed = Math.round(performance.now() - shownAt);
        const ok = choice === trial.ink;
        if (ok) { correct += 1; times.push(elapsed); }
        feedback.textContent = ok ? `Correct · ${elapsed} ms` : `Wrong · it was ${STROOP_COLORS[trial.ink].name}`;
        index += 1;
        timer = setTimeout(index >= STROOP_TRIALS ? finish : showTrial, 650);
    }

    function finish() {
        if (disposed) return;
        const accuracy = Math.round((correct / STROOP_TRIALS) * 100);
        const med = times.length ? median(times) : 0;
        const speed = times.length ? Math.max(0, Math.min(30, 30 - Math.max(0, med - 600) * 0.02)) : 0;
        const score = Math.round(accuracy * 0.7 + speed);
        showGameResults(stage, {
            title: "Color Clash", game: "stroop", score,
            rows: [["ACCURACY", `${accuracy}%`], ["CORRECT", `${correct} / ${STROOP_TRIALS}`], ["MEDIAN TIME", med ? `${med} ms` : "—"]],
            message: score >= 80 ? "Sharp focus. Keep comparing with your own baseline." : score >= 60 ? "A mixed session. Consider a short break and repeat later." : "Consider rest and a later re-check; this is not a diagnosis.",
            astronaut, showToast, onFinish, onRestart, dispose
        });
    }

    function onKey(event) {
        const n = Number(event.key);
        if (n >= 1 && n <= STROOP_COLORS.length && !event.repeat) answer(n - 1);
    }
    function onOption(event) {
        const button = event.target.closest("[data-color]");
        if (button) answer(Number(button.dataset.color));
    }
    function onStart() {
        if (active || index > 0) return;
        startButton.disabled = true;
        showTrial();
    }
    function onExit() { dispose(); onFinish(); }
    function dispose() {
        if (disposed) return;
        disposed = true;
        clearTimeout(timer);
        document.removeEventListener("keydown", onKey);
        stage.querySelector("#cc-options")?.removeEventListener("click", onOption);
        startButton.removeEventListener("click", onStart);
        exitButton.removeEventListener("click", onExit);
    }

    document.addEventListener("keydown", onKey);
    stage.querySelector("#cc-options").addEventListener("click", onOption);
    startButton.addEventListener("click", onStart);
    exitButton.addEventListener("click", onExit);
    setCleanup(dispose);
}

/* ---------- Memory Grid ---------- */

const MEMORY_ROUNDS = 6;
const MEMORY_LIVES = 2;

function setupMemory(stage, astronaut, showToast, onFinish, onRestart, setCleanup) {
    const grid = stage.querySelector("#mg-grid");
    const cells = [...stage.querySelectorAll("[data-cell]")];
    const progress = stage.querySelector("#mg-progress");
    const feedback = stage.querySelector("#mg-feedback");
    const startButton = stage.querySelector("#mg-start");
    const exitButton = stage.querySelector("#mg-exit");

    let cleared = 0, lives = MEMORY_LIVES, mistakes = 0, sequence = [], position = 0;
    let accepting = false, started = false, disposed = false;
    const timers = new Set();

    function later(fn, ms) {
        const id = setTimeout(() => { timers.delete(id); if (!disposed) fn(); }, ms);
        timers.add(id);
    }
    function setCells(enabled) { cells.forEach(cell => { cell.disabled = !enabled; }); }
    function flash(index, ms = 420) {
        cells[index].classList.add("is-lit");
        later(() => cells[index].classList.remove("is-lit"), ms);
    }
    function updateProgress() { progress.textContent = `ROUND ${Math.min(cleared + 1, MEMORY_ROUNDS)} / ${MEMORY_ROUNDS} · LIVES ${lives}`; }

    function startRound() {
        updateProgress();
        accepting = false;
        setCells(false);
        position = 0;
        sequence = Array.from({ length: cleared + 3 }, () => Math.floor(Math.random() * 9));
        feedback.textContent = "Watch the sequence…";
        sequence.forEach((cell, i) => later(() => flash(cell), 700 + i * 750));
        later(() => {
            accepting = true;
            setCells(true);
            feedback.textContent = "Your turn — repeat the sequence";
        }, 700 + sequence.length * 750);
    }

    function press(index) {
        if (!accepting) return;
        flash(index, 220);
        if (index === sequence[position]) {
            position += 1;
            if (position < sequence.length) return;
            accepting = false;
            setCells(false);
            cleared += 1;
            feedback.textContent = "Correct!";
            later(cleared >= MEMORY_ROUNDS ? finish : startRound, 900);
        } else {
            accepting = false;
            setCells(false);
            lives -= 1;
            mistakes += 1;
            feedback.textContent = lives > 0 ? "Not quite — same length, new sequence." : "Out of lives.";
            later(lives > 0 ? startRound : finish, 1100);
        }
    }

    function finish() {
        const score = Math.round((cleared / MEMORY_ROUNDS) * 100);
        showGameResults(stage, {
            title: "Memory Grid", game: "memory", score,
            rows: [["ROUNDS CLEARED", `${cleared} / ${MEMORY_ROUNDS}`], ["LONGEST SEQUENCE", cleared ? cleared + 2 : "—"], ["MISTAKES", mistakes]],
            message: score >= 80 ? "Strong working memory today. Keep comparing with your own baseline." : score >= 50 ? "A mixed session. Consider a short break and repeat later." : "Consider rest and a later re-check; this is not a diagnosis.",
            astronaut, showToast, onFinish, onRestart, dispose
        });
    }

    function onCell(event) {
        const cell = event.target.closest("[data-cell]");
        if (cell) press(Number(cell.dataset.cell));
    }
    function onStart() {
        if (started) return;
        started = true;
        startButton.disabled = true;
        startRound();
    }
    function onExit() { dispose(); onFinish(); }
    function dispose() {
        if (disposed) return;
        disposed = true;
        timers.forEach(clearTimeout);
        timers.clear();
        grid.removeEventListener("click", onCell);
        startButton.removeEventListener("click", onStart);
        exitButton.removeEventListener("click", onExit);
    }

    grid.addEventListener("click", onCell);
    startButton.addEventListener("click", onStart);
    exitButton.addEventListener("click", onExit);
    setCleanup(dispose);
}
