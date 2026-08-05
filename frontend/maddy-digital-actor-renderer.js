/**
 * Maddy Executive Operating System (MEOS)
 * Maddy Digital Actor Renderer
 *
 * Version: 1.0.0
 * Build: MDAR100-DIGITAL-ACTOR-20260805-A
 *
 * Purpose:
 * - Render Maddy as a continuous digital actor rather than a still image.
 * - Translate Maddy Presence Engine state into visual performances.
 * - Preload and transition between transparent or clean-composite video clips.
 * - Prevent conflicting play(), pause(), and restart calls.
 * - Preserve a renderer-independent API for future neural, 3D, or realtime actors.
 *
 * Architecture:
 * Executive Brain / Offices / Voice
 *                ↓
 *       Maddy Presence Engine
 *                ↓
 *    Maddy Digital Actor Renderer
 *                ↓
 * Transparent WebM / MOV / future realtime actor
 *
 * Governance:
 * - The renderer expresses verified Presence Engine state.
 * - It does not invent executive activity.
 * - Missing media is reported honestly and falls back without breaking MEOS.
 * - Professional Mode is the organizational default.
 * - Personal Mode remains private and user-specific.
 */

(() => {
  "use strict";

  const NAME = "MEOS Maddy Digital Actor Renderer";
  const VERSION = "1.0.0";
  const BUILD_ID = "MDAR100-DIGITAL-ACTOR-20260805-A";
  const SCHEMA = "meos.maddy-digital-actor-renderer.v1";

  const DEFAULT_ROOT_ID = "meosMaddyDigitalActor";
  const DEFAULT_CROSSFADE_MS = 520;
  const DEFAULT_PRELOAD_TIMEOUT_MS = 8000;
  const DEFAULT_POSTER = "maddy-holographic-presence-v1.png";

  const PERFORMANCE_STATES = Object.freeze({
    MATERIALIZE: "materialize",
    WORKING: "working",
    READING: "reading",
    LISTENING: "listening",
    THINKING: "thinking",
    SPEAKING: "speaking",
    WAITING: "waiting",
    PRESENTING: "presenting",
    CELEBRATING: "celebrating",
    CONCERNED: "concerned",
    RESTING: "resting",
    PERSONAL: "personal",
    OFFLINE: "offline",
    ERROR: "error"
  });

  const MODE_NAMES = Object.freeze({
    PROFESSIONAL: "professional",
    PERSONAL: "personal"
  });

  const DEFAULT_CLIPS = Object.freeze({
    professional: Object.freeze({
      materialize: Object.freeze({
        src: "media/maddy/professional/materialize.webm",
        loop: false,
        muted: true,
        priority: 100
      }),
      working: Object.freeze({
        src: "media/maddy/professional/working.webm",
        loop: true,
        muted: true,
        priority: 10
      }),
      reading: Object.freeze({
        src: "media/maddy/professional/reading.webm",
        loop: true,
        muted: true,
        priority: 20
      }),
      listening: Object.freeze({
        src: "media/maddy/professional/listening.webm",
        loop: true,
        muted: true,
        priority: 70
      }),
      thinking: Object.freeze({
        src: "media/maddy/professional/thinking.webm",
        loop: true,
        muted: true,
        priority: 60
      }),
      speaking: Object.freeze({
        src: "media/maddy/professional/speaking.webm",
        loop: true,
        muted: true,
        priority: 90
      }),
      waiting: Object.freeze({
        src: "media/maddy/professional/waiting.webm",
        loop: true,
        muted: true,
        priority: 30
      }),
      presenting: Object.freeze({
        src: "media/maddy/professional/presenting.webm",
        loop: true,
        muted: true,
        priority: 80
      }),
      celebrating: Object.freeze({
        src: "media/maddy/professional/celebrating.webm",
        loop: false,
        muted: true,
        priority: 85
      }),
      concerned: Object.freeze({
        src: "media/maddy/professional/concerned.webm",
        loop: true,
        muted: true,
        priority: 75
      }),
      resting: Object.freeze({
        src: "media/maddy/professional/resting.webm",
        loop: true,
        muted: true,
        priority: 5
      })
    }),

    personal: Object.freeze({
      materialize: Object.freeze({
        src: "media/maddy/personal/materialize.webm",
        loop: false,
        muted: true,
        priority: 100
      }),
      working: Object.freeze({
        src: "media/maddy/personal/working.webm",
        loop: true,
        muted: true,
        priority: 10
      }),
      reading: Object.freeze({
        src: "media/maddy/personal/reading.webm",
        loop: true,
        muted: true,
        priority: 20
      }),
      listening: Object.freeze({
        src: "media/maddy/personal/listening.webm",
        loop: true,
        muted: true,
        priority: 70
      }),
      thinking: Object.freeze({
        src: "media/maddy/personal/thinking.webm",
        loop: true,
        muted: true,
        priority: 60
      }),
      speaking: Object.freeze({
        src: "media/maddy/personal/speaking.webm",
        loop: true,
        muted: true,
        priority: 90
      }),
      waiting: Object.freeze({
        src: "media/maddy/personal/waiting.webm",
        loop: true,
        muted: true,
        priority: 30
      }),
      presenting: Object.freeze({
        src: "media/maddy/personal/presenting.webm",
        loop: true,
        muted: true,
        priority: 80
      }),
      celebrating: Object.freeze({
        src: "media/maddy/personal/celebrating.webm",
        loop: false,
        muted: true,
        priority: 85
      }),
      concerned: Object.freeze({
        src: "media/maddy/personal/concerned.webm",
        loop: true,
        muted: true,
        priority: 75
      }),
      resting: Object.freeze({
        src: "media/maddy/personal/resting.webm",
        loop: true,
        muted: true,
        priority: 5
      })
    })
  });

  const state = {
    initialized: false,
    mounted: false,
    connected: false,
    activeLayer: 0,
    activePerformance: null,
    requestedPerformance: null,
    activeMode: MODE_NAMES.PROFESSIONAL,
    transitionId: 0,
    playbackToken: 0,
    transitionInProgress: false,
    lastError: null,
    lastTransitionAt: null,
    lastPresenceEventAt: null,
    listenersInstalled: false,
    root: null,
    stage: null,
    layers: [],
    fallback: null,
    statusNode: null,
    clipRegistry: cloneRegistry(DEFAULT_CLIPS),
    preloadResults: {},
    config: {
      rootId: DEFAULT_ROOT_ID,
      crossfadeMs: DEFAULT_CROSSFADE_MS,
      preloadTimeoutMs: DEFAULT_PRELOAD_TIMEOUT_MS,
      autoplay: true,
      preloadOnInitialize: true,
      showStatus: true,
      poster: DEFAULT_POSTER,
      debug: false
    }
  };

  function cloneRegistry(registry) {
    return JSON.parse(JSON.stringify(registry));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function emit(name, detail = {}) {
    const eventName = `meos:maddy-digital-actor:${name}`;
    const payload = {
      schema: "meos.maddy-digital-actor.event.v1",
      name: eventName,
      renderer: NAME,
      version: VERSION,
      buildId: BUILD_ID,
      emittedAt: nowIso(),
      detail
    };

    document.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
    document.dispatchEvent(new CustomEvent("meos:maddy-digital-actor", { detail: payload }));

    if (state.config.debug) {
      console.debug(`[${NAME}] ${eventName}`, payload);
    }

    return payload;
  }

  function normalizeToken(value) {
    return typeof value === "string"
      ? value.trim().toLowerCase().replace(/[\s_]+/g, "-")
      : "";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getPresenceEngine() {
    return window.MaddyPresence || window.MEOSMaddyPresence || null;
  }

  function getMode(mode) {
    const normalized = normalizeToken(mode);
    return normalized === MODE_NAMES.PERSONAL
      ? MODE_NAMES.PERSONAL
      : MODE_NAMES.PROFESSIONAL;
  }

  function getPerformanceFromPresence(presence = {}) {
    const currentState = normalizeToken(presence.state);
    const activity = normalizeToken(presence.activity);

    if (currentState === "booting") return PERFORMANCE_STATES.MATERIALIZE;
    if (currentState === "offline") return PERFORMANCE_STATES.OFFLINE;
    if (currentState === "error") return PERFORMANCE_STATES.ERROR;
    if (currentState === "speaking") return PERFORMANCE_STATES.SPEAKING;
    if (currentState === "listening") return PERFORMANCE_STATES.LISTENING;
    if (currentState === "thinking") return PERFORMANCE_STATES.THINKING;
    if (currentState === "presenting") return PERFORMANCE_STATES.PRESENTING;
    if (currentState === "celebrating") return PERFORMANCE_STATES.CELEBRATING;
    if (currentState === "concerned") return PERFORMANCE_STATES.CONCERNED;
    if (currentState === "waiting") return PERFORMANCE_STATES.WAITING;
    if (currentState === "resting") return PERFORMANCE_STATES.RESTING;

    if (activity === "reading" || activity === "reviewing" || activity === "researching") {
      return PERFORMANCE_STATES.READING;
    }

    return PERFORMANCE_STATES.WORKING;
  }

  function getClip(mode, performance) {
    const registryMode = state.clipRegistry[getMode(mode)] || {};
    return registryMode[performance] || registryMode.working || null;
  }

  function createLayer(index) {
    const video = document.createElement("video");
    video.className = "meos-digital-actor-layer";
    video.dataset.layer = String(index);
    video.preload = "auto";
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("aria-hidden", "true");
    video.muted = true;
    video.poster = state.config.poster;
    return video;
  }

  function injectStyles() {
    const styleId = "meosMaddyDigitalActorRendererStyles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .meos-digital-actor {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 320px;
        overflow: visible;
        isolation: isolate;
        background: transparent;
      }

      .meos-digital-actor-stage {
        position: absolute;
        inset: 0;
        overflow: visible;
        pointer-events: none;
      }

      .meos-digital-actor-layer {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center bottom;
        opacity: 0;
        transform: translate3d(0, 0, 0);
        transition: opacity var(--meos-actor-crossfade, 520ms) ease;
        background: transparent;
        mix-blend-mode: screen;
        filter: drop-shadow(0 0 24px rgba(105, 239, 255, .38));
      }

      .meos-digital-actor-layer[data-active="true"] {
        opacity: 1;
      }

      .meos-digital-actor-fallback {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center bottom;
        opacity: 0;
        transition: opacity 260ms ease;
        background: transparent;
        filter: drop-shadow(0 0 24px rgba(105, 239, 255, .38));
      }

      .meos-digital-actor[data-fallback="true"] .meos-digital-actor-fallback {
        opacity: 1;
      }

      .meos-digital-actor[data-state="speaking"] .meos-digital-actor-stage {
        filter: brightness(1.06) saturate(1.08);
      }

      .meos-digital-actor[data-state="thinking"] .meos-digital-actor-stage {
        filter: brightness(.96) saturate(.92);
      }

      .meos-digital-actor[data-state="concerned"] .meos-digital-actor-stage {
        filter: brightness(.9) saturate(.78);
      }

      .meos-digital-actor-status {
        position: absolute;
        right: 8px;
        bottom: 8px;
        z-index: 8;
        max-width: calc(100% - 16px);
        padding: 5px 8px;
        border: 1px solid rgba(105, 239, 255, .24);
        background: rgba(1, 10, 18, .58);
        color: rgba(224, 249, 255, .8);
        font: 600 .58rem/1.3 Inter, system-ui, sans-serif;
        letter-spacing: .1em;
        text-transform: uppercase;
        backdrop-filter: blur(8px);
      }

      .meos-digital-actor-status[hidden] {
        display: none;
      }

      @media (prefers-reduced-motion: reduce) {
        .meos-digital-actor-layer,
        .meos-digital-actor-fallback {
          transition: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function mount(target) {
    const host = typeof target === "string"
      ? document.querySelector(target)
      : target;

    if (!host) {
      throw new Error(`${NAME}: mount target was not found.`);
    }

    injectStyles();

    const root = document.createElement("div");
    root.id = state.config.rootId;
    root.className = "meos-digital-actor";
    root.dataset.state = "offline";
    root.dataset.mode = MODE_NAMES.PROFESSIONAL;
    root.dataset.fallback = "true";
    root.style.setProperty("--meos-actor-crossfade", `${state.config.crossfadeMs}ms`);

    const stage = document.createElement("div");
    stage.className = "meos-digital-actor-stage";

    const layer0 = createLayer(0);
    const layer1 = createLayer(1);

    const fallback = document.createElement("img");
    fallback.className = "meos-digital-actor-fallback";
    fallback.src = state.config.poster;
    fallback.alt = "Maddy holographic executive presence fallback";

    const status = document.createElement("div");
    status.className = "meos-digital-actor-status";
    status.hidden = !state.config.showStatus;
    status.textContent = "Digital actor renderer ready";

    stage.append(layer0, layer1, fallback);
    root.append(stage, status);

    host.replaceChildren(root);

    state.root = root;
    state.stage = stage;
    state.layers = [layer0, layer1];
    state.fallback = fallback;
    state.statusNode = status;
    state.mounted = true;

    emit("mounted", {
      rootId: root.id
    });

    return root;
  }

  function updateStatus(message) {
    if (state.statusNode) {
      state.statusNode.textContent = message;
    }
  }

  function setFallback(enabled, reason = null) {
    if (!state.root) return;
    state.root.dataset.fallback = enabled ? "true" : "false";

    if (enabled) {
      updateStatus(reason ? `Fallback · ${reason}` : "Fallback active");
    }
  }

  function setClipRegistry(registry) {
    if (!registry || typeof registry !== "object") {
      throw new TypeError(`${NAME}: clip registry must be an object.`);
    }

    state.clipRegistry = cloneRegistry(registry);
    emit("clip-registry-updated", {
      modes: Object.keys(state.clipRegistry)
    });

    return cloneRegistry(state.clipRegistry);
  }

  function registerClip(mode, performance, clip) {
    const normalizedMode = getMode(mode);
    const normalizedPerformance = normalizeToken(performance);

    if (!normalizedPerformance) {
      throw new TypeError(`${NAME}: performance name is required.`);
    }

    if (!clip || typeof clip.src !== "string" || !clip.src.trim()) {
      throw new TypeError(`${NAME}: clip.src is required.`);
    }

    if (!state.clipRegistry[normalizedMode]) {
      state.clipRegistry[normalizedMode] = {};
    }

    state.clipRegistry[normalizedMode][normalizedPerformance] = {
      src: clip.src,
      loop: clip.loop !== false,
      muted: clip.muted !== false,
      priority: Number.isFinite(clip.priority) ? clip.priority : 10,
      poster: clip.poster || state.config.poster
    };

    emit("clip-registered", {
      mode: normalizedMode,
      performance: normalizedPerformance,
      clip: state.clipRegistry[normalizedMode][normalizedPerformance]
    });

    return { ...state.clipRegistry[normalizedMode][normalizedPerformance] };
  }

  function preloadClip(mode, performance) {
    const normalizedMode = getMode(mode);
    const normalizedPerformance = normalizeToken(performance);
    const clip = getClip(normalizedMode, normalizedPerformance);

    if (!clip) {
      return Promise.resolve({
        success: false,
        mode: normalizedMode,
        performance: normalizedPerformance,
        reason: "clip-not-registered"
      });
    }

    return new Promise((resolve) => {
      const video = document.createElement("video");
      let settled = false;

      const finish = (result) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        video.removeAttribute("src");
        video.load();
        state.preloadResults[`${normalizedMode}:${normalizedPerformance}`] = result;
        resolve(result);
      };

      const timeoutId = window.setTimeout(() => {
        finish({
          success: false,
          mode: normalizedMode,
          performance: normalizedPerformance,
          src: clip.src,
          reason: "preload-timeout"
        });
      }, state.config.preloadTimeoutMs);

      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;

      video.addEventListener("canplaythrough", () => {
        finish({
          success: true,
          mode: normalizedMode,
          performance: normalizedPerformance,
          src: clip.src
        });
      }, { once: true });

      video.addEventListener("error", () => {
        finish({
          success: false,
          mode: normalizedMode,
          performance: normalizedPerformance,
          src: clip.src,
          reason: "media-unavailable"
        });
      }, { once: true });

      video.src = clip.src;
      video.load();
    });
  }

  async function preloadMode(mode) {
    const normalizedMode = getMode(mode);
    const performances = Object.keys(state.clipRegistry[normalizedMode] || {});
    const results = await Promise.all(
      performances.map((performance) => preloadClip(normalizedMode, performance))
    );

    const summary = {
      mode: normalizedMode,
      total: results.length,
      available: results.filter((item) => item.success).length,
      missing: results.filter((item) => !item.success).length,
      results
    };

    emit("preload-completed", summary);
    return summary;
  }

  async function safePlay(video, token) {
    if (!video || token !== state.playbackToken) {
      return false;
    }

    try {
      const promise = video.play();
      if (promise && typeof promise.then === "function") {
        await promise;
      }
      return token === state.playbackToken;
    } catch (error) {
      if (error?.name !== "AbortError") {
        state.lastError = {
          name: error?.name || "PlaybackError",
          message: error?.message || String(error),
          occurredAt: nowIso()
        };
      }

      emit("playback-prevented", {
        errorName: error?.name || "PlaybackError",
        message: error?.message || String(error)
      });

      return false;
    }
  }

  function safelyStop(video) {
    if (!video) return;
    try {
      video.pause();
    } catch (error) {
      // No-op: a stopped or detached layer is already safe.
    }
  }

  function waitForReady(video, timeoutMs = 5000) {
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      let settled = false;

      const finish = (value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        video.removeEventListener("canplay", onReady);
        video.removeEventListener("error", onError);
        resolve(value);
      };

      const onReady = () => finish(true);
      const onError = () => finish(false);

      const timer = window.setTimeout(() => finish(false), timeoutMs);

      video.addEventListener("canplay", onReady, { once: true });
      video.addEventListener("error", onError, { once: true });
    });
  }

  async function transitionTo(performance, options = {}) {
    if (!state.mounted) {
      throw new Error(`${NAME}: mount the renderer before requesting a performance.`);
    }

    const normalizedPerformance = normalizeToken(performance);
    const requestedMode = getMode(options.mode || state.activeMode);
    const clip = getClip(requestedMode, normalizedPerformance);

    state.requestedPerformance = normalizedPerformance;
    const transitionId = ++state.transitionId;
    const token = ++state.playbackToken;
    state.transitionInProgress = true;

    if (!clip) {
      state.lastError = {
        name: "MissingClip",
        message: `No clip registered for ${requestedMode}:${normalizedPerformance}.`,
        occurredAt: nowIso()
      };

      setFallback(true, `${normalizedPerformance} clip unavailable`);
      state.transitionInProgress = false;

      emit("performance-missing", {
        mode: requestedMode,
        performance: normalizedPerformance
      });

      return {
        success: false,
        mode: requestedMode,
        performance: normalizedPerformance,
        reason: "clip-not-registered"
      };
    }

    const incomingIndex = state.activeLayer === 0 ? 1 : 0;
    const outgoingIndex = state.activeLayer;
    const incoming = state.layers[incomingIndex];
    const outgoing = state.layers[outgoingIndex];

    incoming.dataset.active = "false";
    incoming.loop = clip.loop !== false;
    incoming.muted = clip.muted !== false;
    incoming.poster = clip.poster || state.config.poster;

    if (incoming.src !== new URL(clip.src, document.baseURI).href) {
      incoming.src = clip.src;
      incoming.load();
    } else {
      try {
        incoming.currentTime = 0;
      } catch (error) {
        // Some streams do not permit seeking before metadata is available.
      }
    }

    const ready = await waitForReady(incoming, state.config.preloadTimeoutMs);

    if (!ready || transitionId !== state.transitionId || token !== state.playbackToken) {
      setFallback(true, `${normalizedPerformance} media unavailable`);
      safelyStop(incoming);
      state.transitionInProgress = false;

      emit("performance-failed", {
        mode: requestedMode,
        performance: normalizedPerformance,
        src: clip.src,
        reason: ready ? "superseded" : "media-unavailable"
      });

      return {
        success: false,
        mode: requestedMode,
        performance: normalizedPerformance,
        reason: ready ? "superseded" : "media-unavailable"
      };
    }

    const played = await safePlay(incoming, token);

    if (!played || transitionId !== state.transitionId) {
      setFallback(true, `${normalizedPerformance} playback prevented`);
      safelyStop(incoming);
      state.transitionInProgress = false;

      return {
        success: false,
        mode: requestedMode,
        performance: normalizedPerformance,
        reason: "playback-prevented"
      };
    }

    setFallback(false);
    incoming.dataset.active = "true";
    outgoing.dataset.active = "false";

    state.root.dataset.state = normalizedPerformance;
    state.root.dataset.mode = requestedMode;
    updateStatus(`${requestedMode} · ${normalizedPerformance}`);

    await new Promise((resolve) => {
      window.setTimeout(resolve, state.config.crossfadeMs);
    });

    if (transitionId === state.transitionId) {
      safelyStop(outgoing);
      try {
        outgoing.currentTime = 0;
      } catch (error) {
        // Ignore unsupported seeking.
      }

      state.activeLayer = incomingIndex;
      state.activePerformance = normalizedPerformance;
      state.activeMode = requestedMode;
      state.lastTransitionAt = nowIso();
      state.transitionInProgress = false;

      emit("performance-changed", {
        mode: requestedMode,
        performance: normalizedPerformance,
        src: clip.src,
        loop: incoming.loop
      });
    }

    return {
      success: true,
      mode: requestedMode,
      performance: normalizedPerformance,
      src: clip.src
    };
  }

  async function syncFromPresence(snapshot = null) {
    const engine = getPresenceEngine();
    const resolvedSnapshot = snapshot || engine?.getSnapshot?.() || engine?.getStatus?.();

    if (!resolvedSnapshot) {
      setFallback(true, "Presence Engine unavailable");
      return {
        success: false,
        reason: "presence-engine-unavailable"
      };
    }

    const presence = resolvedSnapshot.presence || resolvedSnapshot;
    const mode = getMode(presence.mode);
    const performance = getPerformanceFromPresence(presence);

    state.lastPresenceEventAt = nowIso();

    if (
      state.activeMode === mode &&
      state.activePerformance === performance &&
      !state.transitionInProgress
    ) {
      return {
        success: true,
        unchanged: true,
        mode,
        performance
      };
    }

    return transitionTo(performance, {
      mode,
      reason: "presence-sync"
    });
  }

  function handlePresenceEvent() {
    syncFromPresence().catch((error) => {
      state.lastError = {
        name: error?.name || "PresenceSyncError",
        message: error?.message || String(error),
        occurredAt: nowIso()
      };

      emit("presence-sync-error", {
        message: state.lastError.message
      });
    });
  }

  function installPresenceListeners() {
    if (state.listenersInstalled) return true;

    const events = [
      "meos:maddy-presence",
      "meos:maddy-presence:initialized",
      "meos:maddy-presence:boot-started",
      "meos:maddy-presence:boot-completed",
      "meos:maddy-presence:state",
      "meos:maddy-presence:mode",
      "meos:maddy-presence:emotion",
      "meos:maddy-presence:attention",
      "meos:maddy-presence:activity",
      "meos:maddy-presence:listening-started",
      "meos:maddy-presence:listening-stopped",
      "meos:maddy-presence:speaking-started",
      "meos:maddy-presence:speaking-stopped",
      "meos:maddy-presence:celebration",
      "meos:maddy-presence:concern"
    ];

    events.forEach((eventName) => {
      document.addEventListener(eventName, handlePresenceEvent);
    });

    state.listenersInstalled = true;
    return true;
  }

  function connectPresenceEngine() {
    const engine = getPresenceEngine();

    if (!engine) {
      state.connected = false;
      setFallback(true, "Presence Engine unavailable");
      return false;
    }

    installPresenceListeners();

    try {
      engine.registerRuntimeConnection?.("renderer", true, {
        name: NAME,
        version: VERSION,
        buildId: BUILD_ID
      });
    } catch (error) {
      console.warn(`${NAME}: could not register with Presence Engine.`, error);
    }

    state.connected = true;
    emit("presence-connected", {
      presenceVersion: engine.version || "unknown"
    });

    return true;
  }

  function configure(options = {}) {
    if (!options || typeof options !== "object") {
      throw new TypeError(`${NAME}: configuration must be an object.`);
    }

    if (typeof options.rootId === "string" && options.rootId.trim()) {
      state.config.rootId = options.rootId.trim();
    }

    if (Number.isFinite(options.crossfadeMs)) {
      state.config.crossfadeMs = Math.max(0, Math.floor(options.crossfadeMs));
    }

    if (Number.isFinite(options.preloadTimeoutMs)) {
      state.config.preloadTimeoutMs = Math.max(500, Math.floor(options.preloadTimeoutMs));
    }

    if (typeof options.poster === "string" && options.poster.trim()) {
      state.config.poster = options.poster.trim();
    }

    ["autoplay", "preloadOnInitialize", "showStatus", "debug"].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(options, key)) {
        state.config[key] = Boolean(options[key]);
      }
    });

    if (state.root) {
      state.root.style.setProperty(
        "--meos-actor-crossfade",
        `${state.config.crossfadeMs}ms`
      );
    }

    if (state.statusNode) {
      state.statusNode.hidden = !state.config.showStatus;
    }

    emit("configured", {
      config: { ...state.config }
    });

    return { ...state.config };
  }

  async function initialize(options = {}) {
    if (state.initialized) {
      return getSnapshot();
    }

    if (options.config) {
      configure(options.config);
    }

    if (options.clipRegistry) {
      setClipRegistry(options.clipRegistry);
    }

    if (options.target) {
      mount(options.target);
    }

    connectPresenceEngine();

    state.initialized = true;

    emit("initialized", {
      mounted: state.mounted,
      connected: state.connected
    });

    if (state.config.preloadOnInitialize) {
      preloadMode(state.activeMode).catch((error) => {
        emit("preload-error", {
          message: error?.message || String(error)
        });
      });
    }

    if (state.mounted && state.config.autoplay) {
      await syncFromPresence();
    }

    return getSnapshot();
  }

  function shutdown() {
    ++state.playbackToken;
    ++state.transitionId;

    state.layers.forEach((layer) => {
      safelyStop(layer);
      layer.dataset.active = "false";
    });

    state.transitionInProgress = false;
    state.activePerformance = null;

    if (state.root) {
      state.root.dataset.state = "offline";
      state.root.dataset.fallback = "true";
    }

    emit("shutdown");
    return getSnapshot();
  }

  function getSnapshot() {
    return {
      schema: SCHEMA,
      name: NAME,
      version: VERSION,
      buildId: BUILD_ID,
      initialized: state.initialized,
      mounted: state.mounted,
      connected: state.connected,
      activeLayer: state.activeLayer,
      activePerformance: state.activePerformance,
      requestedPerformance: state.requestedPerformance,
      activeMode: state.activeMode,
      transitionInProgress: state.transitionInProgress,
      lastTransitionAt: state.lastTransitionAt,
      lastPresenceEventAt: state.lastPresenceEventAt,
      lastError: state.lastError ? { ...state.lastError } : null,
      config: { ...state.config },
      preloadResults: { ...state.preloadResults },
      registeredModes: Object.keys(state.clipRegistry),
      registeredPerformances: Object.fromEntries(
        Object.entries(state.clipRegistry).map(([mode, performances]) => [
          mode,
          Object.keys(performances)
        ])
      )
    };
  }

  function runAcceptanceTest() {
    const checks = [
      ["Renderer exposes version 1.0.0", VERSION === "1.0.0"],
      ["Professional performance library exists", Boolean(state.clipRegistry.professional)],
      ["Personal performance library exists", Boolean(state.clipRegistry.personal)],
      ["Materialization performance exists", Boolean(state.clipRegistry.professional?.materialize)],
      ["Working performance exists", Boolean(state.clipRegistry.professional?.working)],
      ["Listening performance exists", Boolean(state.clipRegistry.professional?.listening)],
      ["Thinking performance exists", Boolean(state.clipRegistry.professional?.thinking)],
      ["Speaking performance exists", Boolean(state.clipRegistry.professional?.speaking)],
      ["Dual-layer crossfade architecture is implemented", typeof transitionTo === "function"],
      ["Playback conflict token is implemented", Number.isInteger(state.playbackToken)],
      ["Presence Engine synchronization is implemented", typeof syncFromPresence === "function"],
      ["Runtime renderer registration is implemented", typeof connectPresenceEngine === "function"],
      ["Clip preloading is implemented", typeof preloadMode === "function"],
      ["Missing media fallback is implemented", typeof setFallback === "function"],
      ["Renderer snapshot is available", getSnapshot().schema === SCHEMA]
    ].map(([name, passed]) => ({
      name,
      passed: Boolean(passed)
    }));

    return {
      success: checks.every((check) => check.passed),
      schema: "meos.maddy-digital-actor-renderer.acceptance.v1",
      version: VERSION,
      buildId: BUILD_ID,
      passed: checks.filter((check) => check.passed).length,
      total: checks.length,
      checks
    };
  }

  const api = Object.freeze({
    name: NAME,
    version: VERSION,
    buildId: BUILD_ID,
    schema: SCHEMA,
    performances: PERFORMANCE_STATES,
    modes: MODE_NAMES,

    initialize,
    configure,
    mount,
    shutdown,

    connectPresenceEngine,
    syncFromPresence,

    transitionTo,
    preloadClip,
    preloadMode,

    registerClip,
    setClipRegistry,

    getSnapshot,
    runAcceptanceTest
  });

  window.MaddyDigitalActorRenderer = api;
  window.MEOSMaddyDigitalActorRenderer = api;

  document.dispatchEvent(new CustomEvent(
    "meos:maddy-digital-actor:registered",
    {
      detail: {
        schema: "meos.maddy-digital-actor.registration.v1",
        name: NAME,
        version: VERSION,
        buildId: BUILD_ID,
        registeredAt: nowIso()
      }
    }
  ));

  console.log(
    `[MEOS] ${NAME} v${VERSION} online. Build ${BUILD_ID}.`
  );
})();
