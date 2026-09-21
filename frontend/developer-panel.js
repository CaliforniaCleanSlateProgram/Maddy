/**
 * MEOS — Developer Panel
 *
 * File Version: 2.1.0
 * Voice Engine Release: 2.0.0
 * Build: DP210-MADDY-WORLD-WINDOW-20260920-A
 *
 * Temporary production-integration panel for the MEOS Voice Engine.
 *
 * Responsibilities:
 * - Start one intentional OpenAI Realtime session.
 * - Stop the complete voice pipeline cleanly.
 * - Display Voice Engine component status.
 * - Run one authorized speech-output test without bypassing safeguards.
 * - Prevent repeated button clicks from creating duplicate sessions.
 *
 * This panel is temporary scaffolding and is not part of the final
 * Executive Office user experience.
 */

(function initializeMEOSDeveloperPanel(global) {
  "use strict";

  const VERSION = "2.1.0";
  const VOICE_ENGINE_VERSION = "2.0.0";
  const BUILD_ID = "DP210-MADDY-WORLD-WINDOW-20260920-A";

  const PANEL_ID = "meos-developer-panel";
  const STATUS_ID = "meos-developer-status";
  const WORLD_WINDOW_ID = "meos-maddy-world-window";
  const WORLD_WINDOW_BODY_ID = "meos-maddy-world-window-body";
  const WORLD_WINDOW_MAX_TIMELINE = 80;

  const state = {
    initialized: false,
    busy: false,
    sessionStarting: false,
    sessionActive: false,
    lastError: null,
    subscriptionsInstalled: false,
    worldWindowOpen: false,
    worldWindowTimer: null,
    worldWindowTimeline: []
  };

  function createElement(tagName, properties = {}) {
    const element = document.createElement(tagName);

    Object.entries(properties).forEach(([key, value]) => {
      if (key === "text") {
        element.textContent = value;
      } else if (key === "className") {
        element.className = value;
      } else if (key === "style" && value && typeof value === "object") {
        Object.assign(element.style, value);
      } else if (value !== undefined && value !== null) {
        element.setAttribute(key, String(value));
      }
    });

    return element;
  }

  function getPanel() {
    return document.getElementById(PANEL_ID);
  }

  function getStatusElement() {
    return document.getElementById(STATUS_ID);
  }

  function setStatus(message, type = "information") {
    const status = getStatusElement();

    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.type = type;

    const backgrounds = {
      information: "rgba(255, 255, 255, 0.08)",
      working: "rgba(59, 130, 246, 0.20)",
      success: "rgba(34, 197, 94, 0.20)",
      warning: "rgba(245, 158, 11, 0.20)",
      error: "rgba(239, 68, 68, 0.22)"
    };

    status.style.background =
      backgrounds[type] || backgrounds.information;
  }

  function setButtonsDisabled(disabled) {
    const panel = getPanel();

    if (!panel) {
      return;
    }

    panel
      .querySelectorAll("button[data-meos-action]")
      .forEach((button) => {
        button.disabled = disabled;
        button.style.opacity = disabled ? "0.55" : "1";
        button.style.cursor = disabled ? "not-allowed" : "pointer";
      });
  }

  async function runExclusive(operation) {
    if (state.busy) {
      setStatus(
        "A Voice Engine operation is already running.",
        "warning"
      );
      return;
    }

    state.busy = true;
    setButtonsDisabled(true);

    try {
      await operation();
    } finally {
      state.busy = false;
      setButtonsDisabled(false);
    }
  }

  function callFirstAvailable(target, methodNames, ...args) {
    if (!target) {
      return {
        called: false,
        result: undefined,
        method: null
      };
    }

    for (const methodName of methodNames) {
      if (typeof target[methodName] === "function") {
        return {
          called: true,
          result: target[methodName](...args),
          method: methodName
        };
      }
    }

    return {
      called: false,
      result: undefined,
      method: null
    };
  }

  async function stopRealtimeClient() {
    const realtime = global.OpenAIRealtime;

    if (!realtime) {
      return false;
    }

    const call = callFirstAvailable(
      realtime,
      [
        "disconnect",
        "stop",
        "close",
        "endSession",
        "stopSession"
      ]
    );

    if (!call.called) {
      return false;
    }

    await Promise.resolve(call.result);
    return true;
  }

  function stopSpeechEngine(reason = "developer-panel-stop") {
    const speech = global.MaddySpeech;

    if (!speech) {
      return false;
    }

    let stopped = false;

    if (typeof speech.stopSpeaking === "function") {
      stopped =
        speech.stopSpeaking(reason) || stopped;
    }

    if (typeof speech.stopListening === "function") {
      stopped =
        speech.stopListening() || stopped;
    }

    return stopped;
  }

  function dispatchInterrupt(reason) {
    global.dispatchEvent(
      new CustomEvent("meos:maddy:interrupt", {
        detail: {
          reason,
          source: "developer-panel",
          voiceEngineVersion: VOICE_ENGINE_VERSION
        }
      })
    );
  }

  async function startMaddy() {
    await runExclusive(async () => {
      if (!global.OpenAIRealtime) {
        setStatus(
          "OpenAI Realtime is not available.",
          "error"
        );
        return;
      }

      if (state.sessionStarting) {
        setStatus(
          "Maddy is already connecting.",
          "warning"
        );
        return;
      }

      if (state.sessionActive) {
        setStatus(
          "Maddy is already connected and ready.",
          "success"
        );
        return;
      }

      if (
        typeof global.OpenAIRealtime.connect !==
        "function"
      ) {
        setStatus(
          "OpenAI Realtime does not expose connect().",
          "error"
        );
        return;
      }

      state.sessionStarting = true;
      state.lastError = null;

      setStatus(
        "Starting one intentional Voice Engine session…",
        "working"
      );

      try {
        const result =
          await global.OpenAIRealtime.connect();

        state.sessionActive = true;
        state.sessionStarting = false;

        setStatus(
          "Maddy is connected. Speak when you are ready.",
          "success"
        );

        console.log(
          `[MEOS Developer Panel v${VERSION}] Voice session started.`,
          result || ""
        );
      } catch (error) {
        state.sessionActive = false;
        state.sessionStarting = false;
        state.lastError =
          error?.message ||
          "Unable to connect to OpenAI Realtime.";

        setStatus(state.lastError, "error");

        console.error(
          `[MEOS Developer Panel v${VERSION}] Voice session start failed:`,
          error
        );
      }
    });
  }

  async function stopMaddy() {
    await runExclusive(async () => {
      setStatus(
        "Stopping the complete Voice Engine…",
        "working"
      );

      dispatchInterrupt("developer-panel-stop");
      stopSpeechEngine("developer-panel-stop");

      let realtimeStopped = false;

      try {
        realtimeStopped =
          await stopRealtimeClient();
      } catch (error) {
        state.lastError =
          error?.message ||
          "Realtime shutdown reported an error.";

        console.error(
          `[MEOS Developer Panel v${VERSION}] Realtime shutdown failed:`,
          error
        );
      }

      state.sessionStarting = false;
      state.sessionActive = false;

      setStatus(
        realtimeStopped
          ? "Maddy's realtime session, microphone, and speech were stopped."
          : "Maddy's microphone and speech were stopped. No realtime stop method was exposed.",
        realtimeStopped ? "success" : "warning"
      );
    });
  }

  async function testMaddyVoice() {
    await runExclusive(async () => {
      const speech = global.MaddySpeech;

      if (!speech) {
        setStatus(
          "Maddy Speech is not available.",
          "error"
        );
        return;
      }

      if (typeof speech.speak !== "function") {
        setStatus(
          "Maddy Speech does not expose speak().",
          "error"
        );
        return;
      }

      const responseId =
        `developer-voice-test-${Date.now()}`;
      const turnId =
        `developer-turn-${Date.now()}`;

      setStatus(
        "Running one authorized speech-output test…",
        "working"
      );

      try {
        const result = await speech.speak(
          "Hey Mandel. Maddy's Voice Engine version two is online, protected from duplicate playback, and ready for the full conversation test.",
          {
            authorized: true,
            turnId,
            responseId,
            source: "developer-panel"
          }
        );

        if (result?.blocked) {
          setStatus(
            `Voice test was blocked: ${
              result.reason || "unknown reason"
            }.`,
            "warning"
          );
          return;
        }

        setStatus(
          "Maddy completed one authorized voice test.",
          "success"
        );
      } catch (error) {
        state.lastError =
          error?.message ||
          "The authorized voice test failed.";

        setStatus(state.lastError, "error");

        console.error(
          `[MEOS Developer Panel v${VERSION}] Voice test failed:`,
          error
        );
      }
    });
  }

  function getComponentVersion(component) {
    return (
      component?.version ||
      component?.voiceEngineVersion ||
      "unknown"
    );
  }

  function safeGetStatus(component) {
    if (
      component &&
      typeof component.getStatus === "function"
    ) {
      try {
        return component.getStatus();
      } catch (error) {
        return {
          error:
            error?.message ||
            "Status unavailable"
        };
      }
    }

    return null;
  }

  function safeRead(target, methodName, ...args) {
    if (!target || typeof target[methodName] !== "function") return null;
    try {
      return target[methodName](...args);
    } catch (error) {
      return { error: error?.message || String(error) };
    }
  }

  function componentIdentity(component) {
    if (!component) return null;
    return {
      name: component.name || null,
      version: component.version || component.voiceEngineVersion || null,
      buildId: component.buildId || null,
      schema: component.schema || null
    };
  }

  function buildWorldWindowSnapshot() {
    const brain = global.ExecutiveBrain || global.MEOSExecutiveBrain || null;
    const hallway = global.MEOSExecutiveHallway || global.ExecutiveHallway || null;
    const voice = global.OpenAIRealtime || null;
    const speech = global.MaddySpeech || null;
    const realtime = global.MaddyRealtime || null;
    const autonomy = global.MaddyAutonomy || global.MEOSAutonomyAuthority || null;
    const learning = global.ExecutiveLearning || global.MEOSExecutiveLearning || null;
    const mission = global.MEOSMissionEngine || global.MissionEngine || null;
    const resource = global.ExecutiveResourceAcquisitionEngine || global.MEOSExecutiveResourceAcquisitionEngine || null;
    const customer = global.MEOSActiveCustomerContext || null;

    const activeWork = safeRead(hallway, "listWork", { includeTerminal: false });
    const autobiography = safeRead(brain, "getAutobiographicalMemory", 8);
    const selfModel = safeRead(brain, "getSelfModel", { refresh: false });
    const worldModel = safeRead(brain, "getWorldModel", { refresh: false });

    return Object.freeze({
      schema: "meos.maddy.world-window.snapshot.v1",
      capturedAt: new Date().toISOString(),
      doctrine: Object.freeze({
        observabilityOnly: true,
        chainOfThoughtExposed: false,
        structuredStateOnly: true,
        stateMutationAuthorized: false,
        providerCallsAuthorized: false,
        externalActionsAuthorized: false,
        selfModificationAuthorized: false,
        automaticSpendUsd: 0
      }),
      activeContext: customer ? {
        customer: customer.customer?.displayName || customer.customer || null,
        organization: customer.organization?.name || customer.organization?.displayName || customer.organization || null,
        representative: customer.representative?.displayName || customer.representative || null,
        cognition: customer.cognitionIdentity?.preferredName || customer.cognition || "Maddy"
      } : null,
      organs: {
        executiveBrain: { identity: componentIdentity(brain), status: safeGetStatus(brain) },
        executiveHallway: { identity: componentIdentity(hallway), status: safeGetStatus(hallway) },
        voice: { identity: componentIdentity(voice), status: safeGetStatus(voice) },
        realtimeBridge: { identity: componentIdentity(realtime), status: safeGetStatus(realtime) },
        speech: { identity: componentIdentity(speech), status: safeGetStatus(speech) },
        autonomy: { identity: componentIdentity(autonomy), status: safeRead(autonomy, "getSnapshot") || safeRead(autonomy, "status") },
        learning: { identity: componentIdentity(learning), status: safeGetStatus(learning) },
        mission: { identity: componentIdentity(mission), status: safeGetStatus(mission) },
        resourceAcquisition: { identity: componentIdentity(resource), status: safeGetStatus(resource) }
      },
      cognition: {
        selfModel,
        worldModel,
        autobiographicalMemory: Array.isArray(autobiography) ? autobiography : [],
        recentVoiceEvidence: voice?.getStatus ? {
          rawTranscript: safeGetStatus(voice)?.lastRawTranscript || null,
          interpretedTranscript: safeGetStatus(voice)?.lastInterpretedTranscript || null,
          route: safeGetStatus(voice)?.lastRoute || null,
          researchReturn: safeGetStatus(voice)?.researchReturn || null
        } : null
      },
      work: {
        active: Array.isArray(activeWork) ? activeWork.slice(0, 20) : [],
        hallwayStatus: safeGetStatus(hallway)
      },
      timeline: state.worldWindowTimeline.slice(-WORLD_WINDOW_MAX_TIMELINE)
    });
  }

  function appendWorldWindowTimeline(type, detail = {}) {
    state.worldWindowTimeline.push({
      at: new Date().toISOString(),
      type: String(type || "event"),
      detail: detail && typeof detail === "object" ? detail : { value: detail }
    });
    if (state.worldWindowTimeline.length > WORLD_WINDOW_MAX_TIMELINE) {
      state.worldWindowTimeline.splice(0, state.worldWindowTimeline.length - WORLD_WINDOW_MAX_TIMELINE);
    }
  }

  function renderWorldWindow() {
    const body = document.getElementById(WORLD_WINDOW_BODY_ID);
    if (!body) return null;
    const snapshot = buildWorldWindowSnapshot();
    body.textContent = JSON.stringify(snapshot, null, 2);
    return snapshot;
  }

  function closeWorldWindow() {
    const windowElement = document.getElementById(WORLD_WINDOW_ID);
    if (windowElement) windowElement.remove();
    state.worldWindowOpen = false;
    if (state.worldWindowTimer) {
      global.clearInterval?.(state.worldWindowTimer);
      state.worldWindowTimer = null;
    }
  }

  function showWorldWindow() {
    const existing = document.getElementById(WORLD_WINDOW_ID);
    if (existing) {
      existing.style.display = "flex";
      state.worldWindowOpen = true;
      renderWorldWindow();
      return existing;
    }

    const overlay = createElement("section", {
      id: WORLD_WINDOW_ID,
      "aria-label": "Maddy World Window structured organism observatory"
    });
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "24px",
      zIndex: "10050",
      display: "flex",
      flexDirection: "column",
      minWidth: "min(920px, calc(100vw - 48px))",
      maxWidth: "1200px",
      margin: "0 auto",
      border: "1px solid rgba(255,255,255,0.18)",
      borderRadius: "16px",
      background: "rgba(5, 12, 18, 0.985)",
      color: "#eef7f2",
      boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
      fontFamily: "Arial, Helvetica, sans-serif",
      overflow: "hidden"
    });

    const header = createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.12)" } });
    const titles = createElement("div");
    titles.append(
      createElement("strong", { text: "Maddy World Window" }),
      createElement("div", { text: "Founder observatory — structured state, evidence, work and organism health; not private chain-of-thought.", style: { marginTop: "3px", fontSize: "11px", opacity: "0.7" } })
    );
    const controls = createElement("div", { style: { display: "flex", gap: "8px" } });
    const refresh = createElement("button", { type: "button", text: "Refresh" });
    const close = createElement("button", { type: "button", text: "Close" });
    [refresh, close].forEach(button => Object.assign(button.style, { border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", padding: "7px 10px", background: "rgba(255,255,255,0.08)", color: "inherit", cursor: "pointer" }));
    refresh.addEventListener("click", renderWorldWindow);
    close.addEventListener("click", closeWorldWindow);
    controls.append(refresh, close);
    header.append(titles, controls);

    const body = createElement("pre", { id: WORLD_WINDOW_BODY_ID });
    Object.assign(body.style, { flex: "1", margin: "0", padding: "16px", overflow: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: "11px", lineHeight: "1.45", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" });
    overlay.append(header, body);
    document.body.appendChild(overlay);
    state.worldWindowOpen = true;
    renderWorldWindow();
    if (typeof global.setInterval === "function") {
      state.worldWindowTimer = global.setInterval(() => {
        if (state.worldWindowOpen) renderWorldWindow();
      }, 1000);
    }
    return overlay;
  }

  function runWorldWindowAcceptanceTest() {
    const checks = [];
    const check = (name, passed) => checks.push({ name, passed: Boolean(passed) });
    const originals = {
      brain: global.ExecutiveBrain,
      hallway: global.MEOSExecutiveHallway,
      autonomy: global.MaddyAutonomy,
      voice: global.OpenAIRealtime
    };
    let mutations = 0;
    try {
      global.ExecutiveBrain = {
        version: "fixture-brain",
        buildId: "fixture",
        getStatus: () => ({ status: "online" }),
        getSelfModel: () => ({ fingerprint: "self-fixture" }),
        getWorldModel: () => ({ fingerprint: "world-fixture" }),
        getAutobiographicalMemory: () => [{ episodeId: "episode-fixture" }],
        persist: () => { mutations += 1; }
      };
      global.MEOSExecutiveHallway = {
        version: "fixture-hallway",
        getStatus: () => ({ status: "online" }),
        listWork: () => [{ id: "work-fixture", state: "executing" }],
        submitWork: () => { mutations += 1; }
      };
      global.MaddyAutonomy = {
        version: "fixture-autonomy",
        getSnapshot: () => ({ master: true, automaticSpendUsd: 0 }),
        setMasterEnabled: () => { mutations += 1; }
      };
      global.OpenAIRealtime = {
        version: "fixture-voice",
        getStatus: () => ({ lastRawTranscript: "raw", lastInterpretedTranscript: "interpreted", lastRoute: "fixture-route" }),
        connect: () => { mutations += 1; }
      };
      const snapshot = buildWorldWindowSnapshot();
      check("World Window observes the persistent self-model", snapshot.cognition?.selfModel?.fingerprint === "self-fixture");
      check("World Window observes the world model", snapshot.cognition?.worldModel?.fingerprint === "world-fixture");
      check("World Window observes autobiographical episodes", snapshot.cognition?.autobiographicalMemory?.[0]?.episodeId === "episode-fixture");
      check("World Window observes active Hallway work", snapshot.work?.active?.[0]?.id === "work-fixture");
      check("World Window exposes raw and interpreted speech as separate evidence", snapshot.cognition?.recentVoiceEvidence?.rawTranscript === "raw" && snapshot.cognition?.recentVoiceEvidence?.interpretedTranscript === "interpreted");
      check("World Window is explicitly structured observability rather than chain-of-thought exposure", snapshot.doctrine?.observabilityOnly === true && snapshot.doctrine?.chainOfThoughtExposed === false && snapshot.doctrine?.structuredStateOnly === true);
      check("World Window snapshot grants no mutation, provider, spend, external-action, or self-modification authority", snapshot.doctrine?.stateMutationAuthorized === false && snapshot.doctrine?.providerCallsAuthorized === false && snapshot.doctrine?.automaticSpendUsd === 0 && snapshot.doctrine?.externalActionsAuthorized === false && snapshot.doctrine?.selfModificationAuthorized === false);
      check("Snapshot collection calls no mutating fixture methods", mutations === 0);
    } finally {
      global.ExecutiveBrain = originals.brain;
      global.MEOSExecutiveHallway = originals.hallway;
      global.MaddyAutonomy = originals.autonomy;
      global.OpenAIRealtime = originals.voice;
    }
    const passed = checks.filter(item => item.passed).length;
    return Object.freeze({ success: passed === checks.length, commission: "DP210", schema: "meos.maddy.world-window.acceptance.v1", version: VERSION, buildId: BUILD_ID, passed, total: checks.length, checks: Object.freeze(checks.map(item => Object.freeze({ ...item }))) });
  }

  function showVoiceStatus() {
    const realtime = global.OpenAIRealtime;
    const bridge = global.MaddyRealtime;
    const speech = global.MaddySpeech;

    const realtimeStatus =
      safeGetStatus(realtime);
    const bridgeStatus =
      safeGetStatus(bridge);
    const speechStatus =
      safeGetStatus(speech);

    const parts = [
      `OpenAI: ${
        realtime
          ? `v${getComponentVersion(realtime)}`
          : "missing"
      }`,
      `Bridge: ${
        bridge
          ? `v${getComponentVersion(bridge)}`
          : "missing"
      }`,
      `Speech: ${
        speech
          ? `v${getComponentVersion(speech)}`
          : "missing"
      }`
    ];

    if (speechStatus) {
      parts.push(
        `Speaking: ${
          speechStatus.speaking ? "yes" : "no"
        }`,
        `Mode: ${
          speechStatus.activeMode || "idle"
        }`,
        `TTS requests: ${
          speechStatus.requestCount ?? "n/a"
        }`,
        `Playback: ${
          speechStatus.playbackCount ?? "n/a"
        }`,
        `Duplicates blocked: ${
          speechStatus.duplicateBlockedCount ??
          "n/a"
        }`,
        `Fallbacks: ${
          speechStatus.fallbackCount ?? "n/a"
        }`
      );
    }

    setStatus(parts.join(" | "), "information");

    console.group(
      `[MEOS Developer Panel v${VERSION}] Voice Engine status`
    );
    console.log("OpenAIRealtime:", realtimeStatus || realtime || "missing");
    console.log("MaddyRealtime:", bridgeStatus || bridge || "missing");
    console.log("MaddySpeech:", speechStatus || speech || "missing");
    console.groupEnd();
  }

  function resetSpeechDiagnostics() {
    const speech = global.MaddySpeech;

    if (
      !speech ||
      typeof speech.resetResponseHistory !==
        "function"
    ) {
      setStatus(
        "Speech diagnostics reset is not available.",
        "warning"
      );
      return;
    }

    speech.resetResponseHistory();

    setStatus(
      "Speech diagnostics and response history were reset.",
      "success"
    );
  }

  function createButton(label, actionName, handler) {
    const button = createElement("button", {
      type: "button",
      text: label,
      "data-meos-action": actionName
    });

    Object.assign(button.style, {
      border:
        "1px solid rgba(255, 255, 255, 0.25)",
      borderRadius: "8px",
      padding: "10px 12px",
      background:
        "rgba(255, 255, 255, 0.10)",
      color: "#ffffff",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "600",
      transition:
        "opacity 120ms ease, background 120ms ease"
    });

    button.addEventListener(
      "mouseenter",
      () => {
        if (!button.disabled) {
          button.style.background =
            "rgba(255, 255, 255, 0.17)";
        }
      }
    );

    button.addEventListener(
      "mouseleave",
      () => {
        button.style.background =
          "rgba(255, 255, 255, 0.10)";
      }
    );

    button.addEventListener("click", handler);

    return button;
  }

  function installEventSubscriptions() {
    if (state.subscriptionsInstalled) {
      return;
    }

    state.subscriptionsInstalled = true;

    global.addEventListener(
      "meos:maddy:speech-started",
      (event) => {
        const responseId =
          event.detail?.responseId ||
          "unknown";

        setStatus(
          `Maddy is speaking response ${responseId}.`,
          "working"
        );
      }
    );

    global.addEventListener(
      "meos:maddy:speech-ended",
      (event) => {
        const reason =
          event.detail?.reason ||
          "completed";

        if (reason === "completed") {
          setStatus(
            "Maddy finished speaking.",
            "success"
          );
        }
      }
    );

    global.addEventListener(
      "maddy-speech:request-blocked",
      (event) => {
        setStatus(
          `Speech request blocked: ${
            event.detail?.reason ||
            "unknown reason"
          }.`,
          "warning"
        );
      }
    );

    global.addEventListener(
      "maddy-speech:error",
      (event) => {
        const message =
          event.detail?.message ||
          "Maddy Speech reported an error.";

        state.lastError = message;
        setStatus(message, "error");
      }
    );

    global.addEventListener(
      "meos:realtime:connected",
      () => {
        state.sessionStarting = false;
        state.sessionActive = true;

        setStatus(
          "Maddy is connected. Speak when you are ready.",
          "success"
        );
      }
    );

    global.addEventListener(
      "meos:realtime:disconnected",
      () => {
        state.sessionStarting = false;
        state.sessionActive = false;

        setStatus(
          "Maddy's realtime session is disconnected.",
          "information"
        );
      }
    );

    const worldEvents = [
      "meos:hallway:work-updated",
      "meos:hallway:deliverable-ready",
      "meos:realtime:research-return-ready",
      "meos:realtime:research-return-failed",
      "meos:realtime:research-return-pending"
    ];
    worldEvents.forEach(eventName => {
      global.addEventListener(eventName, event => {
        appendWorldWindowTimeline(eventName, event?.detail || {});
        if (state.worldWindowOpen) renderWorldWindow();
      });
    });
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) {
      return;
    }

    installEventSubscriptions();

    const panel = createElement("section", {
      id: PANEL_ID,
      "aria-label":
        "MEOS Voice Engine Developer Panel"
    });

    Object.assign(panel.style, {
      position: "fixed",
      right: "18px",
      bottom: "18px",
      width: "340px",
      maxWidth: "calc(100vw - 36px)",
      padding: "16px",
      borderRadius: "14px",
      background:
        "rgba(15, 23, 42, 0.97)",
      color: "#ffffff",
      boxShadow:
        "0 12px 35px rgba(0, 0, 0, 0.38)",
      zIndex: "9999",
      fontFamily:
        "Arial, Helvetica, sans-serif"
    });

    const header = createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        marginBottom: "12px"
      }
    });

    const titleGroup = createElement("div");

    const title = createElement("strong", {
      text: "MEOS Voice Engine"
    });

    const subtitle = createElement("div", {
      text: "Production integration panel"
    });

    Object.assign(subtitle.style, {
      marginTop: "2px",
      opacity: "0.65",
      fontSize: "10px"
    });

    titleGroup.append(title, subtitle);

    const closeButton = createElement("button", {
      type: "button",
      text: "×",
      "aria-label": "Close developer panel"
    });

    Object.assign(closeButton.style, {
      border: "none",
      background: "transparent",
      color: "#ffffff",
      cursor: "pointer",
      fontSize: "22px",
      lineHeight: "1"
    });

    closeButton.addEventListener("click", () => {
      panel.style.display = "none";
    });

    header.append(titleGroup, closeButton);

    const buttons = createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "8px"
      }
    });

    buttons.append(
      createButton(
        "Start Maddy",
        "start",
        startMaddy
      ),
      createButton(
        "Stop Maddy",
        "stop",
        stopMaddy
      ),
      createButton(
        "Voice Test",
        "voice-test",
        testMaddyVoice
      ),
      createButton(
        "Engine Status",
        "status",
        showVoiceStatus
      ),
      createButton(
        "World Window",
        "world-window",
        showWorldWindow
      ),
      createButton(
        "Reset Diagnostics",
        "reset",
        resetSpeechDiagnostics
      )
    );

    const status = createElement("div", {
      id: STATUS_ID,
      text:
        "Ready. Install all Voice Engine v2 files before starting Maddy."
    });

    Object.assign(status.style, {
      marginTop: "12px",
      padding: "10px",
      minHeight: "34px",
      borderRadius: "8px",
      background:
        "rgba(255, 255, 255, 0.08)",
      fontSize: "12px",
      lineHeight: "1.45",
      overflowWrap: "anywhere"
    });

    const version = createElement("div", {
      text:
        `Panel v${VERSION} • ${BUILD_ID}`
    });

    Object.assign(version.style, {
      marginTop: "8px",
      textAlign: "right",
      opacity: "0.55",
      fontSize: "9px"
    });

    panel.append(
      header,
      buttons,
      status,
      version
    );

    document.body.appendChild(panel);

    state.initialized = true;

    console.log(
      `[MEOS Developer Panel v${VERSION}] Online. Build ${BUILD_ID}.`
    );
  }

  function initialize() {
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        createPanel,
        { once: true }
      );
    } else {
      createPanel();
    }
  }

  global.MEOSDeveloperPanel = Object.freeze({
    version: VERSION,
    voiceEngineVersion:
      VOICE_ENGINE_VERSION,
    buildId: BUILD_ID,

    show() {
      const panel = getPanel();

      if (panel) {
        panel.style.display = "block";
      }
    },

    hide() {
      const panel = getPanel();

      if (panel) {
        panel.style.display = "none";
      }
    },

    start: startMaddy,
    stop: stopMaddy,
    status: showVoiceStatus,
    showWorldWindow,
    closeWorldWindow,
    getWorldWindowSnapshot: buildWorldWindowSnapshot,
    runWorldWindowAcceptanceTest,

    getStatus() {
      return {
        version: VERSION,
        voiceEngineVersion:
          VOICE_ENGINE_VERSION,
        buildId: BUILD_ID,
        initialized: state.initialized,
        busy: state.busy,
        sessionStarting:
          state.sessionStarting,
        sessionActive:
          state.sessionActive,
        worldWindowOpen: state.worldWindowOpen,
        worldWindowTimelineCount: state.worldWindowTimeline.length,
        lastError: state.lastError
      };
    }
  });

  initialize();
})(window);
