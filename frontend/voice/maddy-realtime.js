/**
 * MEOS Maddy Realtime Conversation Engine
 *
 * File Version: 2.0.0
 * Voice Engine Release: 2.0.0
 * Status: Commissioned
 *
 * Responsibilities:
 * - Receive authorized responses from OpenAI Realtime.
 * - Preserve turn and response identity.
 * - Block unauthorized, stale, or duplicate responses.
 * - Forward each accepted response to Maddy Speech exactly once.
 * - Track listening, speaking, interruption, and session state.
 * - Preserve compatibility with existing MEOS integration methods.
 */

(function initializeMaddyRealtime(global) {
  "use strict";

  const VERSION = "2.0.0";
  const VOICE_ENGINE_VERSION = "2.0.0";
  const BUILD_ID = "VE200-MADDY-REALTIME-20260730-A";

  const MAX_HANDLED_RESPONSE_IDS = 200;

  const state = {
    connected: false,
    listening: false,
    speaking: false,
    interrupted: false,

    provider: null,
    sessionStarted: null,
    sessionEnded: null,

    activeTurnId: null,
    activeResponseId: null,

    forwardedResponseCount: 0,
    duplicateBlockedCount: 0,
    unauthorizedBlockedCount: 0,

    handledResponseIds: new Set()
  };

  function emit(name, detail = {}) {
    global.dispatchEvent(
      new CustomEvent(`meos:maddy-realtime:${name}`, {
        detail: {
          version: VERSION,
          voiceEngineVersion: VOICE_ENGINE_VERSION,
          buildId: BUILD_ID,
          ...detail
        }
      })
    );
  }

  function log(message, metadata) {
    if (metadata === undefined) {
      console.log(
        `[MEOS Maddy Realtime v${VERSION}] ${message}`
      );
      return;
    }

    console.log(
      `[MEOS Maddy Realtime v${VERSION}] ${message}`,
      metadata
    );
  }

  function warn(message, metadata) {
    if (metadata === undefined) {
      console.warn(
        `[MEOS Maddy Realtime v${VERSION}] ${message}`
      );
      return;
    }

    console.warn(
      `[MEOS Maddy Realtime v${VERSION}] ${message}`,
      metadata
    );
  }

  function normalizeIdentifier(value) {
    if (typeof value !== "string") {
      return "";
    }

    const normalized = value.trim();

    if (!normalized || normalized.length > 200) {
      return "";
    }

    return normalized.replace(
      /[^a-zA-Z0-9._:-]/g,
      ""
    );
  }

  function status() {
    return Object.freeze({
      version: VERSION,
      voiceEngineVersion: VOICE_ENGINE_VERSION,
      buildId: BUILD_ID,

      connected: state.connected,
      listening: state.listening,
      speaking: state.speaking,
      interrupted: state.interrupted,

      provider: state.provider,
      sessionStarted: state.sessionStarted,
      sessionEnded: state.sessionEnded,

      activeTurnId: state.activeTurnId,
      activeResponseId: state.activeResponseId,

      forwardedResponseCount:
        state.forwardedResponseCount,

      duplicateBlockedCount:
        state.duplicateBlockedCount,

      unauthorizedBlockedCount:
        state.unauthorizedBlockedCount,

      handledResponseCount:
        state.handledResponseIds.size
    });
  }

  function trimHandledResponseIds() {
    while (
      state.handledResponseIds.size >
      MAX_HANDLED_RESPONSE_IDS
    ) {
      const oldestResponseId =
        state.handledResponseIds.values().next().value;

      if (!oldestResponseId) {
        break;
      }

      state.handledResponseIds.delete(
        oldestResponseId
      );
    }
  }

  async function connect(
    providerName = "openai-realtime"
  ) {
    if (state.connected) {
      return status();
    }

    state.provider =
      typeof providerName === "string" &&
      providerName.trim()
        ? providerName.trim()
        : "openai-realtime";

    state.connected = true;
    state.interrupted = false;
    state.sessionStarted =
      new Date().toISOString();

    state.sessionEnded = null;

    log(
      `Connected to ${state.provider}. Build ${BUILD_ID}.`
    );

    emit("connected", status());

    return status();
  }

  function disconnect() {
    const priorTurnId = state.activeTurnId;
    const priorResponseId =
      state.activeResponseId;

    state.connected = false;
    state.listening = false;
    state.speaking = false;
    state.interrupted = false;

    state.activeTurnId = null;
    state.activeResponseId = null;

    state.sessionEnded =
      new Date().toISOString();

    log("Disconnected.");

    emit("disconnected", {
      priorTurnId,
      priorResponseId,
      status: status()
    });

    return status();
  }

  function beginConversation() {
    /**
     * Preserve the existing public method while allowing the OpenAI
     * controller to be the actual realtime connection owner.
     */
    if (!state.connected) {
      state.connected = true;
      state.provider =
        state.provider || "openai-realtime";

      state.sessionStarted =
        state.sessionStarted ||
        new Date().toISOString();

      warn(
        "Conversation began before an explicit MaddyRealtime.connect call. " +
          "Compatibility connection was created."
      );
    }

    state.listening = true;
    state.interrupted = false;

    log("Conversation started.");

    emit("conversation-started", status());

    return status();
  }

  function endConversation() {
    state.listening = false;
    state.speaking = false;
    state.interrupted = false;

    state.activeTurnId = null;
    state.activeResponseId = null;

    log("Conversation ended.");

    emit("conversation-ended", status());

    return status();
  }

  function handleMaddyResponse(event) {
    const detail = event?.detail || {};

    const responseText =
      typeof detail.text === "string"
        ? detail.text.trim()
        : "";

    const turnId = normalizeIdentifier(
      detail.turnId
    );

    const responseId = normalizeIdentifier(
      detail.responseId
    );

    const authorized =
      detail.authorized === true;

    if (!responseText) {
      warn(
        "Empty Maddy response was blocked."
      );

      emit("response-blocked", {
        reason: "empty-text",
        turnId,
        responseId
      });

      return;
    }

    /**
     * Voice Engine v2 requires proof that this response was authorized by
     * the single-turn OpenAI controller.
     */
    if (!authorized || !responseId) {
      state.unauthorizedBlockedCount += 1;

      warn(
        "Unauthorized Maddy response blocked.",
        {
          authorized,
          turnId: turnId || "missing",
          responseId:
            responseId || "missing",
          source:
            detail.source || "unknown"
        }
      );

      emit("response-blocked", {
        reason:
          !authorized
            ? "authorization-missing"
            : "response-id-missing",

        turnId,
        responseId,
        source: detail.source || "unknown"
      });

      return;
    }

    if (
      state.handledResponseIds.has(responseId)
    ) {
      state.duplicateBlockedCount += 1;

      warn(
        `Duplicate Maddy response blocked: ${responseId}.`
      );

      emit("response-blocked", {
        reason: "duplicate-response-id",
        turnId,
        responseId
      });

      return;
    }

    /**
     * Lock the response ID before dispatching the speech event.
     * Even if the same browser event arrives again during dispatch,
     * it cannot trigger another ElevenLabs request.
     */
    state.handledResponseIds.add(responseId);
    trimHandledResponseIds();

    state.connected = true;
    state.listening = false;
    state.speaking = true;
    state.interrupted = false;

    state.activeTurnId =
      turnId || state.activeTurnId;

    state.activeResponseId = responseId;
    state.forwardedResponseCount += 1;

    log(
      `VERDICT: one authorized response forwarded to Maddy Speech.`,
      {
        turnId:
          state.activeTurnId || "unknown",
        responseId,
        characters: responseText.length,
        provider:
          state.provider ||
          detail.source ||
          "openai-realtime"
      }
    );

    emit("response-forwarded", {
      turnId: state.activeTurnId,
      responseId,
      textLength: responseText.length
    });

    global.dispatchEvent(
      new CustomEvent("meos:maddy:speak", {
        detail: {
          text: responseText,

          authorized: true,
          turnId: state.activeTurnId,
          responseId,

          provider:
            state.provider ||
            detail.source ||
            "openai-realtime",

          source: "maddy-realtime",

          voiceEngineVersion:
            VOICE_ENGINE_VERSION,

          buildId: BUILD_ID,

          latency:
            detail.latency || null
        }
      })
    );
  }

  function handleRealtimeSpeechStarted(
    event
  ) {
    const turnId = normalizeIdentifier(
      event?.detail?.turnId
    );

    state.connected = true;
    state.listening = true;
    state.speaking = false;
    state.interrupted = false;

    if (turnId) {
      state.activeTurnId = turnId;
    }

    emit("listening-started", {
      turnId: state.activeTurnId
    });
  }

  function handleRealtimeSpeechStopped(
    event
  ) {
    const turnId = normalizeIdentifier(
      event?.detail?.turnId
    );

    if (turnId) {
      state.activeTurnId = turnId;
    }

    state.listening = false;

    emit("listening-ended", {
      turnId: state.activeTurnId
    });
  }

  function handleInterrupt(event) {
    const reason =
      typeof event?.detail?.reason ===
        "string"
        ? event.detail.reason
        : "interrupted";

    const interruptedResponseId =
      normalizeIdentifier(
        event?.detail?.responseId ||
          state.activeResponseId
      );

    state.speaking = false;
    state.listening = true;
    state.interrupted = true;

    state.activeResponseId = null;

    log(
      `Speech interrupted. reason=${reason}.`,
      {
        turnId:
          state.activeTurnId || "unknown",
        responseId:
          interruptedResponseId ||
          "unknown"
      }
    );

    emit("interrupted", {
      reason,
      turnId: state.activeTurnId,
      responseId: interruptedResponseId
    });
  }

  function handleSpeechStarted(event) {
    const responseId = normalizeIdentifier(
      event?.detail?.responseId
    );

    const turnId = normalizeIdentifier(
      event?.detail?.turnId
    );

    state.connected = true;
    state.listening = false;
    state.speaking = true;
    state.interrupted = false;

    if (responseId) {
      state.activeResponseId = responseId;
    }

    if (turnId) {
      state.activeTurnId = turnId;
    }

    emit("speaking-started", {
      turnId: state.activeTurnId,
      responseId: state.activeResponseId
    });
  }

  function handleSpeechEnded(event) {
    const responseId = normalizeIdentifier(
      event?.detail?.responseId ||
        state.activeResponseId
    );

    const turnId = normalizeIdentifier(
      event?.detail?.turnId ||
        state.activeTurnId
    );

    state.speaking = false;
    state.interrupted = false;

    if (
      !responseId ||
      responseId === state.activeResponseId
    ) {
      state.activeResponseId = null;
    }

    emit("speaking-ended", {
      turnId,
      responseId
    });
  }

  function resetResponseHistory() {
    state.handledResponseIds.clear();

    state.forwardedResponseCount = 0;
    state.duplicateBlockedCount = 0;
    state.unauthorizedBlockedCount = 0;

    log("Response authorization history reset.");

    return status();
  }

  /**
   * Authorized OpenAI response handoff.
   */
  global.addEventListener(
    "meos:maddy:response",
    handleMaddyResponse
  );

  /**
   * Realtime microphone and turn state.
   */
  global.addEventListener(
    "meos:realtime:speech-started",
    handleRealtimeSpeechStarted
  );

  global.addEventListener(
    "meos:realtime:speech-stopped",
    handleRealtimeSpeechStopped
  );

  /**
   * New Voice Engine v2 interruption event.
   */
  global.addEventListener(
    "meos:maddy:interrupt",
    handleInterrupt
  );

  /**
   * Canonical Voice Engine v2 speech lifecycle events.
   */
  global.addEventListener(
    "meos:maddy:speech-started",
    handleSpeechStarted
  );

  global.addEventListener(
    "meos:maddy:speech-ended",
    handleSpeechEnded
  );

  /**
   * Temporary compatibility with Maddy Speech v1.0.0.
   * These listeners can remain harmlessly after v2 is installed.
   */
  global.addEventListener(
    "maddy-speech:speaking-started",
    handleSpeechStarted
  );

  global.addEventListener(
    "maddy-speech:speaking-ended",
    handleSpeechEnded
  );

  global.MaddyRealtime = Object.freeze({
    version: VERSION,
    voiceEngineVersion:
      VOICE_ENGINE_VERSION,

    buildId: BUILD_ID,

    connect,
    disconnect,
    beginConversation,
    endConversation,
    resetResponseHistory,

    getStatus: status
  });

  log(
    `Conversation Engine online. Build ${BUILD_ID}.`
  );
})(window);
