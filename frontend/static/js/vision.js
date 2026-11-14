/* =========================================
   ASTROHEALTH - ALERTNESS SCAN (MediaPipe)
   Uses the MediaPipe Face Landmarker task in the browser to estimate
   eye closure (PERCLOS), blink rate and yawns during a 30-second scan.
   Everything runs locally; no video leaves the device.
   Experimental: not a medical test.
========================================= */

import { getState } from "./state.js";

const MP_VERSION = "0.10.14";
const MP_BUNDLE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/vision_bundle.mjs`;
const MP_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MP_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const SCAN_SECONDS = 30;
const EYE_CLOSED = 0.55;      // blink blendshape above this = eye closed
const YAWN_OPEN = 0.6;        // jawOpen above this for YAWN_HOLD ms = yawn
const YAWN_HOLD = 1200;
const STORAGE_PREFIX = "astrohealth-vision-v1";

/* ---------- local history ---------- */

function storageKey(id) { return `${STORAGE_PREFIX}:${id || "AH-001"}`; }

function readHistory(id) {
    try {
        const data = JSON.parse(localStorage.getItem(storageKey(id)));
        return Array.isArray(data) ? data : [];
    } catch { return []; }
}

function saveSession(id, session) {
    const list = [session, ...readHistory(id)].slice(0, 20);
    try { localStorage.setItem(storageKey(id), JSON.stringify(list)); }
    catch (error) { console.warn("Scan could not be saved:", error); }
    return list;
}

/* ---------- scoring ---------- */

function scoreScan({ perclos, blinksPerMin, yawns }) {
    let score = 100;
    score -= Math.min(60, perclos * 150);                       // eyes closed too long
    if (blinksPerMin > 30) score -= Math.min(15, (blinksPerMin - 30) * 0.8);
    if (blinksPerMin < 6) score -= 8;                           // staring, low blink rate
    score -= Math.min(20, yawns * 8);
    return Math.max(0, Math.min(100, Math.round(score)));
}

function describe(score) {
    if (score >= 80) return "Eyes look alert. Compare with your own baseline over time.";
    if (score >= 60) return "Some signs of tiredness. Consider a short break and scan again later.";
    return "Signs of fatigue. Consider rest and a later re-check. This is not a diagnosis.";
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
}

function shape(result, name) {
    const found = result.faceBlendshapes?.[0]?.categories?.find(c => c.categoryName === name);
    return found ? found.score : 0;
}

/* ---------- page ---------- */

export function renderVisionPage(main, showToast = () => {}) {

    const astronaut = getState().astronaut || "AH-001";
    let history = readHistory(astronaut);

    main.innerHTML = `
      <section class="page-header">
        <div>
          <p class="page-eyebrow">MISSION MODULE / FATIGUE &amp; ALERTNESS</p>
          <h2 class="page-title">Alertness <span>Scan</span></h2>
          <p class="page-description">A 30-second camera check of eye closure, blinking and yawning using MediaPipe face tracking.</p>
        </div>
        <span class="badge badge-cyan">MEDIAPIPE · ON-DEVICE</span>
      </section>

      <div class="focus-disclaimer" role="note">
        <strong>ⓘ Experimental fatigue check.</strong>
        Not a medical test or diagnosis. Video is processed in your browser and is never uploaded.
      </div>

      <div class="vision-layout">
        <section class="panel" aria-label="Camera scan">
          <div class="panel-heading">
            <div><h3>Face tracking</h3><p>FACE LANDMARKER · LIVE CAMERA</p></div>
            <span class="badge badge-cyan" id="vs-state">IDLE</span>
          </div>

          <div class="vision-stage">
            <video id="vs-video" playsinline muted></video>
            <canvas id="vs-canvas"></canvas>
            <span class="vision-timer" id="vs-timer" hidden>30s</span>
            <div class="vision-overlay" id="vs-overlay">
              <strong>CAMERA OFF</strong>
              <span>Press Start camera and allow access.<br>Face the camera in good light.</span>
            </div>
          </div>

          <div class="vision-controls">
            <button class="btn btn-primary" id="vs-start" type="button">Start camera</button>
            <button class="btn" id="vs-scan" type="button" disabled>Begin 30s scan</button>
            <button class="btn" id="vs-stop" type="button" disabled>Stop camera</button>
          </div>
        </section>

        <section class="panel" aria-label="Scan results">
          <div class="panel-heading">
            <div><h3>Live readings</h3><p>UPDATES DURING THE SCAN</p></div>
            <span class="badge badge-green">${escapeHTML(astronaut)}</span>
          </div>

          <div class="vision-metrics">
            <div class="vision-metric"><small>EYES CLOSED (PERCLOS)</small><strong id="vs-perclos">--</strong></div>
            <div class="vision-metric"><small>BLINKS / MIN</small><strong id="vs-blinks">--</strong></div>
            <div class="vision-metric"><small>YAWNS</small><strong id="vs-yawns">--</strong></div>
            <div class="vision-metric"><small>HEAD PITCH</small><strong id="vs-pitch">--</strong></div>
          </div>

          <div class="vision-score">
            <div class="vision-score-value" id="vs-score">--<small>/100</small></div>
            <p id="vs-message">Run a scan to get an alertness score.</p>
          </div>
        </section>
      </div>

      <section class="panel">
        <div class="panel-heading">
          <div><h3>Recent scans</h3><p>SAVED ON THIS DEVICE</p></div>
          <span class="badge badge-cyan">LOCAL DEMO HISTORY</span>
        </div>
        <ul class="vision-history" id="vs-history"></ul>
      </section>
    `;

    const $ = id => main.querySelector(id);
    const video = $("#vs-video");
    const canvas = $("#vs-canvas");
    const overlay = $("#vs-overlay");
    const stateBadge = $("#vs-state");
    const timerEl = $("#vs-timer");
    const startBtn = $("#vs-start");
    const scanBtn = $("#vs-scan");
    const stopBtn = $("#vs-stop");

    let landmarker = null;
    let stream = null;
    let rafId = 0;
    let disposed = false;
    let lastVideoTime = -1;
    let scan = null;

    const setOverlay = (title, text) => {
        overlay.hidden = !title;
        overlay.innerHTML = title ? `<strong>${escapeHTML(title)}</strong><span>${escapeHTML(text || "")}</span>` : "";
    };

    function renderHistory() {
        const el = $("#vs-history");
        el.innerHTML = history.length
            ? history.slice(0, 6).map(item => `
                <li><span>${new Date(item.timestamp).toLocaleString()}</span>
                    <span>SCORE ${item.score} · PERCLOS ${item.perclos}% · ${item.blinksPerMin} BPM</span></li>`).join("")
            : `<li><span>No scans yet</span><span>Run your first scan</span></li>`;
    }
    renderHistory();

    /* ----- MediaPipe loading (only when this page is opened) ----- */

    async function loadLandmarker() {
        if (landmarker) return landmarker;
        const vision = await import(MP_BUNDLE);
        const fileset = await vision.FilesetResolver.forVisionTasks(MP_WASM);
        const options = {
            baseOptions: { modelAssetPath: MP_MODEL },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true
        };
        try {
            landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
                ...options, baseOptions: { ...options.baseOptions, delegate: "GPU" }
            });
        } catch {
            landmarker = await vision.FaceLandmarker.createFromOptions(fileset, options);
        }
        landmarker.__draw = new vision.DrawingUtils(canvas.getContext("2d"));
        landmarker.__tess = vision.FaceLandmarker.FACE_LANDMARKS_CONTOURS;
        return landmarker;
    }

    async function startCamera() {
        startBtn.disabled = true;
        stateBadge.textContent = "LOADING";
        setOverlay("LOADING MEDIAPIPE", "Downloading the face model (first time only)...");

        try {
            await loadLandmarker();
            if (disposed) return;

            stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: "user" }, audio: false
            });
            if (disposed) { stopStream(); return; }

            video.srcObject = stream;
            await video.play();
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;

            setOverlay("");
            stateBadge.textContent = "READY";
            scanBtn.disabled = false;
            stopBtn.disabled = false;
            loop();
        } catch (error) {
            console.error("[AstroHealth] Alertness scan failed to start:", error);
            const denied = error?.name === "NotAllowedError";
            setOverlay(
                denied ? "CAMERA BLOCKED" : "COULD NOT START",
                denied ? "Allow camera access in the browser and try again."
                       : "Check your internet connection (MediaPipe loads from a CDN) and camera, then retry."
            );
            stateBadge.textContent = "ERROR";
            startBtn.disabled = false;
            showToast(denied ? "Camera permission was denied." : "Could not start the alertness scan.", "error");
        }
    }

    function stopStream() {
        stream?.getTracks().forEach(track => track.stop());
        stream = null;
        video.srcObject = null;
    }

    function stopCamera() {
        cancelAnimationFrame(rafId);
        stopStream();
        scan = null;
        timerEl.hidden = true;
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
        scanBtn.disabled = true;
        stopBtn.disabled = true;
        startBtn.disabled = false;
        stateBadge.textContent = "IDLE";
        setOverlay("CAMERA OFF", "Press Start camera and allow access.");
    }

    /* ----- detection loop ----- */

    function loop() {
        if (disposed || !stream) return;
        rafId = requestAnimationFrame(loop);

        if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
        lastVideoTime = video.currentTime;

        const now = performance.now();
        const result = landmarker.detectForVideo(video, now);
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const face = result.faceLandmarks?.[0];

        if (!face) {
            if (scan) scan.noFaceFrames += 1;
            stateBadge.textContent = scan ? "NO FACE" : "READY";
            return;
        }

        landmarker.__draw.drawConnectors(face, landmarker.__tess, { color: "#32d5e9aa", lineWidth: 1 });

        const eyes = (shape(result, "eyeBlinkLeft") + shape(result, "eyeBlinkRight")) / 2;
        const jaw = shape(result, "jawOpen");

        // head pitch from the facial transformation matrix (column-major 4x4)
        const m = result.facialTransformationMatrixes?.[0]?.data;
        if (m) {
            const pitch = Math.round(Math.asin(Math.max(-1, Math.min(1, -m[9]))) * 180 / Math.PI);
            $("#vs-pitch").textContent = `${pitch}°`;
        }

        if (!scan) return;

        scan.frames += 1;
        const closed = eyes > EYE_CLOSED;
        if (closed) scan.closedFrames += 1;
        if (closed && !scan.eyesWereClosed) scan.blinks += 1;
        scan.eyesWereClosed = closed;

        if (jaw > YAWN_OPEN) {
            scan.jawOpenSince ??= now;
            if (!scan.yawnCounted && now - scan.jawOpenSince > YAWN_HOLD) {
                scan.yawns += 1;
                scan.yawnCounted = true;
            }
        } else {
            scan.jawOpenSince = null;
            scan.yawnCounted = false;
        }

        updateLive();
    }

    function liveStats() {
        const seconds = Math.max(1, (performance.now() - scan.startedAt) / 1000);
        return {
            perclos: scan.frames ? Math.round((scan.closedFrames / scan.frames) * 100) : 0,
            blinksPerMin: Math.round((scan.blinks / seconds) * 60),
            yawns: scan.yawns,
            seconds
        };
    }

    function updateLive() {
        const stats = liveStats();
        $("#vs-perclos").textContent = `${stats.perclos}%`;
        $("#vs-blinks").textContent = stats.blinksPerMin;
        $("#vs-yawns").textContent = stats.yawns;
        timerEl.textContent = `${Math.max(0, Math.ceil(SCAN_SECONDS - stats.seconds))}s`;

        if (stats.seconds >= SCAN_SECONDS) finishScan();
    }

    function beginScan() {
        scan = {
            startedAt: performance.now(),
            frames: 0, closedFrames: 0, blinks: 0, yawns: 0,
            eyesWereClosed: false, jawOpenSince: null, yawnCounted: false, noFaceFrames: 0
        };
        scanBtn.disabled = true;
        timerEl.hidden = false;
        timerEl.textContent = `${SCAN_SECONDS}s`;
        stateBadge.textContent = "SCANNING";
        $("#vs-score").innerHTML = `--<small>/100</small>`;
        $("#vs-message").textContent = "Look at the screen and blink naturally.";
    }

    function finishScan() {
        const stats = liveStats();
        const enough = scan.frames >= 30;
        scan = null;
        timerEl.hidden = true;
        scanBtn.disabled = false;
        stateBadge.textContent = "READY";

        if (!enough) {
            $("#vs-message").textContent = "Not enough face data. Move closer, improve lighting and try again.";
            showToast("Scan incomplete: face not visible enough.", "error");
            return;
        }

        const score = scoreScan(stats);
        $("#vs-score").innerHTML = `${score}<small>/100</small>`;
        $("#vs-message").textContent = describe(score);

        history = saveSession(astronaut, {
            timestamp: new Date().toISOString(),
            score, perclos: stats.perclos, blinksPerMin: stats.blinksPerMin, yawns: stats.yawns
        });
        renderHistory();
        showToast(`Alertness scan complete · score ${score}/100`, "success");
    }

    startBtn.addEventListener("click", startCamera);
    scanBtn.addEventListener("click", beginScan);
    stopBtn.addEventListener("click", stopCamera);

    /* router calls this when leaving the page: release the camera */
    return () => {
        disposed = true;
        cancelAnimationFrame(rafId);
        stopStream();
        try { landmarker?.close(); } catch { /* already closed */ }
        landmarker = null;
    };
}
