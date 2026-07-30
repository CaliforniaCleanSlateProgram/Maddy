/**
 * MEOS — Developer Panel
 *
 * File Version: 2.0.0
 * Voice Engine Release: 2.0.0
 * Build: VE200-DEVELOPER-PANEL-20260730-A
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

  const VERSION = "2.0.0";
  const VOICE_ENGINE_VERSION = "2.0.0";
  const BUILD_ID = "VE200-DEVELOPER-PANEL-20260730-A";

  const PANEL_ID = "meos-developer-panel";
  const STATUS_ID = "meos-developer-status";

  const state = {
    initialized: false,
    busy: false,
    sessionStarting: false,
    sessionActive: false,
    lastError: null,
    subscriptionsInstalled: false
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
        lastError: state.lastError
      };
    }
  });

  initialize();
})(window);
