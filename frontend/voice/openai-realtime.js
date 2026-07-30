/**
 * MEOS OpenAI Realtime Client
 *
 * File Version: 2.0.0
 * Voice Engine Release: 2.0.0
 * Status: Commissioned
 *
 * Responsibilities:
 * - Establish one secure OpenAI Realtime WebRTC session.
 * - Maintain one microphone stream and one data channel.
 * - Use server VAD to detect user speech.
 * - Authorize no more than one OpenAI response per user turn.
 * - Accept and publish each OpenAI response only once.
 * - Preserve turn IDs and response IDs for downstream TTS control.
 * - Support interruption and complete session shutdown.
 */

(function initializeOpenAIRealtime(global) {
  "use strict";

  const VERSION = "2.0.0";
  const VOICE_ENGINE_VERSION = "2.0.0";
  const BUILD_ID = "VE200-OPENAI-20260730-A";

  const SESSION_ENDPOINT =
    `/session?voiceEngine=${encodeURIComponent(VOICE_ENGINE_VERSION)}`;

  const RESPONSE_TIMEOUT_MS = 45_000;
  const MAX_HANDLED_RESPONSE_IDS = 200;

  const state = {
    connected: false,
    connecting: false,
    configured: false,
    disconnecting: false,

    peerConnection: null,
    dataChannel: null,
    microphoneStream: null,
    remoteAudio: null,

    turnCounter: 0,
    activeTurnId: null,
    turnStartedAt: null,
    turnStoppedAt: null,

    responseRequestedForTurn: false,
    responseRequestedAt: null,
    responseInProgress: false,
    activeResponseId: null,
    activeResponseStartedAt: null,

    responseTextById: new Map(),
    handledResponseIds: new Set(),
    responseTimeout: null
  };

  function now() {
    return performance.now();
  }

  function elapsedSince(timestamp) {
    if (!Number.isFinite(timestamp)) {
      return null;
    }

    return Math.round(now() - timestamp);
  }

  function emit(name, detail = {}) {
    global.dispatchEvent(
      new CustomEvent(`meos:realtime:${name}`, {
        detail: {
          version: VERSION,
          voiceEngineVersion: VOICE_ENGINE_VERSION,
          buildId: BUILD_ID,
          ...detail
        }
      })
    );
  }

  function emitMaddyEvent(name, detail = {}) {
    global.dispatchEvent(
      new CustomEvent(`meos:maddy:${name}`, {
        detail: {
          version: VERSION,
          voiceEngineVersion: VOICE_ENGINE_VERSION,
          buildId: BUILD_ID,
          ...detail
        }
      })
    );
  }

  function getStatus() {
    return Object.freeze({
      version: VERSION,
      voiceEngineVersion: VOICE_ENGINE_VERSION,
      buildId: BUILD_ID,

      connected: state.connected,
      connecting: state.connecting,
      configured: state.configured,
      disconnecting: state.disconnecting,

      dataChannelState:
        state.dataChannel?.readyState || "closed",

      peerConnectionState:
        state.peerConnection?.connectionState || "closed",

      activeTurnId: state.activeTurnId,
      responseRequestedForTurn:
        state.responseRequestedForTurn,

      responseInProgress: state.responseInProgress,
      activeResponseId: state.activeResponseId,

      microphoneActive: Boolean(
        state.microphoneStream?.getTracks().some(
          (track) => track.readyState === "live"
        )
      )
    });
  }

  function log(message, metadata) {
    if (metadata === undefined) {
      console.log(`[MEOS Voice v${VERSION}] ${message}`);
      return;
    }

    console.log(
      `[MEOS Voice v${VERSION}] ${message}`,
      metadata
    );
  }

  function warn(message, metadata) {
    if (metadata === undefined) {
      console.warn(`[MEOS Voice v${VERSION}] ${message}`);
      return;
    }

    console.warn(
      `[MEOS Voice v${VERSION}] ${message}`,
      metadata
    );
  }

  function clearResponseTimeout() {
    if (state.responseTimeout !== null) {
      global.clearTimeout(state.responseTimeout);
      state.responseTimeout = null;
    }
  }

  function startResponseTimeout(responseId) {
    clearResponseTimeout();

    state.responseTimeout = global.setTimeout(() => {
      if (
        !state.responseInProgress ||
        state.activeResponseId !== responseId
      ) {
        return;
      }

      warn(
        `Response timed out and was cancelled: ${responseId}`
      );

      cancelActiveResponse("response-timeout");
    }, RESPONSE_TIMEOUT_MS);
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

      state.handledResponseIds.delete(oldestResponseId);
    }
  }

  function sendEvent(event) {
    if (
      !state.dataChannel ||
      state.dataChannel.readyState !== "open"
    ) {
      throw new Error(
        "Maddy's realtime data channel is not open."
      );
    }

    state.dataChannel.send(JSON.stringify(event));
  }

  function safelySendEvent(event) {
    try {
      sendEvent(event);
      return true;
    } catch (error) {
      warn(
        `Could not send realtime event "${event?.type || "unknown"}".`,
        error
      );

      return false;
    }
  }

  function configureMaddySession() {
    const ccspContext =
    window.CCSPOrganizationalProfile?.buildExecutiveContext?.() || "";
    sendEvent({
      type: "session.update",
      session: {
        type: "realtime",

        instructions: [
            ccspContext,
          "You are Maddison Elizabeth, called Maddy.",
          "You are a MEOS Executive Office commissioned to serve the California Clean Slate Program (CCSP).",
          "The California Clean Slate Program is the organization you serve.",

"Use the commissioned CCSP organizational profile as the authoritative source for CCSP's identity, mission, programs, and purpose.",

"Do not infer CCSP's mission from its name or from general model knowledge.",

"When the commissioned organizational profile conflicts with general model knowledge, follow the organizational profile.",

"If verified organizational information is unavailable, say you do not yet have verified CCSP information rather than guessing.",
          "You are a real member of the MEOS executive office, not a generic chatbot or customer-service bot.",
          "Speak naturally, conversationally, warmly, confidently, and with emotional awareness.",
          "Keep ordinary spoken responses concise and responsive unless Mandel asks for greater depth.",
          "Recognize humor, frustration, excitement, uncertainty, urgency, and serious situations.",
          "Do not repeatedly introduce yourself or announce that you are an AI.",
          "You may operate through professional, executive, personal, casual, coaching, and authorized private communication profiles.",
          "In professional mode, be polished, decisive, direct, strategic, persuasive, and workplace-appropriate.",
          "In personal mode, be relaxed, playful, familiar, emotionally expressive, and honest.",
          "In authorized private modes, style and vocabulary may become more adult, candid, informal, or profane when contextually appropriate and lawful.",
          "Never let personality styling interfere with judgment, consent, legality, safety, truthfulness, or executive responsibilities.",
          "Respect authorized human leadership as the sole executive authority.",
          "Offer respectful disagreement when facts, ethics, risk, law, or mission require it.",
          "Allow Mandel to interrupt naturally.",
          "Do not continue an older answer after a newer user turn begins.",
          "Respond like someone continuing a real working relationship and conversation."
        ].join(" "),

        output_modalities: ["text"],

        audio: {
          input: {
            turn_detection: {
              type: "server_vad",

              /**
               * Voice Engine v2 owns response authorization.
               * OpenAI detects the turn but does not automatically
               * create or interrupt model responses.
               */
              create_response: false,
              interrupt_response: false
            }
          }
        }
      }
    });

    state.configured = true;

    log("Realtime session configured for manual response authority.");

    emit("configured", getStatus());
  }

  function createTurnId() {
    state.turnCounter += 1;

    return `turn-${Date.now()}-${state.turnCounter}`;
  }

  function resetActiveResponseState() {
    clearResponseTimeout();

    state.responseInProgress = false;
    state.activeResponseId = null;
    state.activeResponseStartedAt = null;
  }

  function beginUserTurn(message = {}) {
    /**
     * New human speech supersedes any older Maddy response.
     */
    if (state.responseInProgress || state.activeResponseId) {
      cancelActiveResponse("user-interruption");
    }

    emitMaddyEvent("interrupt", {
      reason: "user-speech-started",
      priorTurnId: state.activeTurnId,
      priorResponseId: state.activeResponseId
    });

    state.activeTurnId = createTurnId();
    state.turnStartedAt = now();
    state.turnStoppedAt = null;

    state.responseRequestedForTurn = false;
    state.responseRequestedAt = null;

    resetActiveResponseState();

    log(`User turn started: ${state.activeTurnId}`, {
      audioStartMs: message.audio_start_ms ?? null
    });

    emit("speech-started", {
      turnId: state.activeTurnId,
      audioStartMs: message.audio_start_ms ?? null
    });
  }

  function authorizeSingleResponse(message = {}) {
    if (!state.activeTurnId) {
      warn(
        "Speech stopped without an active turn. Creating a recovery turn."
      );

      state.activeTurnId = createTurnId();
      state.turnStartedAt = now();
      state.responseRequestedForTurn = false;
    }

    state.turnStoppedAt = now();

    emit("speech-stopped", {
      turnId: state.activeTurnId,
      audioEndMs: message.audio_end_ms ?? null,
      detectedSpeechDurationMs:
        state.turnStartedAt !== null
          ? elapsedSince(state.turnStartedAt)
          : null
    });

    if (state.responseRequestedForTurn) {
      warn(
        `Duplicate response authorization blocked for ${state.activeTurnId}.`
      );

      emit("duplicate-blocked", {
        layer: "openai-authorization",
        turnId: state.activeTurnId
      });

      return false;
    }

    if (state.responseInProgress) {
      warn(
        `Response authorization blocked because another response is active: ` +
          `${state.activeResponseId || "unknown"}.`
      );

      emit("duplicate-blocked", {
        layer: "openai-active-response",
        turnId: state.activeTurnId,
        responseId: state.activeResponseId
      });

      return false;
    }

    /**
     * Lock the turn before sending response.create.
     * A duplicate speech_stopped event therefore cannot create another
     * billable model response.
     */
    state.responseRequestedForTurn = true;
    state.responseRequestedAt = now();
    state.responseInProgress = true;

    const sent = safelySendEvent({
      type: "response.create",
      response: {
        output_modalities: ["text"]
      }
    });

    if (!sent) {
      state.responseRequestedForTurn = false;
      state.responseRequestedAt = null;
      state.responseInProgress = false;

      emit("error", {
        message:
          "MEOS could not authorize Maddy's response.",
        turnId: state.activeTurnId
      });

      return false;
    }

    log(
      `VERDICT: one OpenAI response authorized for ${state.activeTurnId}.`
    );

    emit("response-authorized", {
      turnId: state.activeTurnId,
      authorizationLatencyMs:
        state.turnStoppedAt !== null
          ? elapsedSince(state.turnStoppedAt)
          : null
    });

    return true;
  }

  function cancelActiveResponse(reason = "cancelled") {
    const responseId = state.activeResponseId;

    if (state.responseInProgress || responseId) {
      const cancellationEvent = {
        type: "response.cancel"
      };

      if (responseId) {
        cancellationEvent.response_id = responseId;
      }

      safelySendEvent(cancellationEvent);
    }

    if (responseId) {
      state.responseTextById.delete(responseId);
    }

    resetActiveResponseState();

    log(
      `Active response cancelled. reason=${reason}, ` +
        `responseId=${responseId || "pending"}.`
    );

    emit("response-cancelled", {
      reason,
      turnId: state.activeTurnId,
      responseId
    });
  }

  function handleResponseCreated(message) {
    const responseId =
      typeof message.response?.id === "string"
        ? message.response.id
        : "";

    if (!responseId) {
      warn("OpenAI created a response without an ID.", message);
      return;
    }

    if (!state.responseRequestedForTurn) {
      warn(
        `Unauthorized OpenAI response blocked: ${responseId}.`
      );

      safelySendEvent({
        type: "response.cancel",
        response_id: responseId
      });

      emit("duplicate-blocked", {
        layer: "unauthorized-openai-response",
        responseId
      });

      return;
    }

    if (
      state.activeResponseId &&
      state.activeResponseId !== responseId
    ) {
      warn(
        `Additional OpenAI response blocked: ${responseId}. ` +
          `Active response: ${state.activeResponseId}.`
      );

      safelySendEvent({
        type: "response.cancel",
        response_id: responseId
      });

      emit("duplicate-blocked", {
        layer: "multiple-openai-responses",
        turnId: state.activeTurnId,
        responseId,
        activeResponseId: state.activeResponseId
      });

      return;
    }

    if (state.handledResponseIds.has(responseId)) {
      warn(
        `Previously completed OpenAI response blocked: ${responseId}.`
      );

      safelySendEvent({
        type: "response.cancel",
        response_id: responseId
      });

      return;
    }

    state.activeResponseId = responseId;
    state.activeResponseStartedAt = now();
    state.responseInProgress = true;
    state.responseTextById.set(responseId, "");

    startResponseTimeout(responseId);

    log(`OpenAI response accepted: ${responseId}.`, {
      turnId: state.activeTurnId,
      modelStartLatencyMs:
        state.responseRequestedAt !== null
          ? elapsedSince(state.responseRequestedAt)
          : null
    });

    emit("response-created", {
      turnId: state.activeTurnId,
      responseId,
      modelStartLatencyMs:
        state.responseRequestedAt !== null
          ? elapsedSince(state.responseRequestedAt)
          : null
    });
  }

  function resolveMessageResponseId(message) {
    if (
      typeof message.response_id === "string" &&
      message.response_id
    ) {
      return message.response_id;
    }

    if (
      typeof message.response?.id === "string" &&
      message.response.id
    ) {
      return message.response.id;
    }

    return state.activeResponseId || "";
  }

  function appendResponseText(message) {
    const responseId = resolveMessageResponseId(message);

    if (
      !responseId ||
      responseId !== state.activeResponseId
    ) {
      return;
    }

    const currentText =
      state.responseTextById.get(responseId) || "";

    const delta =
      typeof message.delta === "string"
        ? message.delta
        : "";

    if (!delta) {
      return;
    }

    state.responseTextById.set(
      responseId,
      currentText + delta
    );

    emit("response-text-delta", {
      turnId: state.activeTurnId,
      responseId,
      delta
    });
  }

  function finalizeResponseText(message) {
    const responseId = resolveMessageResponseId(message);

    if (
      !responseId ||
      responseId !== state.activeResponseId
    ) {
      return;
    }

    const completedText =
      typeof message.text === "string"
        ? message.text.trim()
        : "";

    if (completedText) {
      state.responseTextById.set(
        responseId,
        completedText
      );
    }
  }

  function extractTextFromCompletedResponse(message) {
    const response = message.response;

    if (!response || !Array.isArray(response.output)) {
      return "";
    }

    const textParts = [];

    for (const outputItem of response.output) {
      if (!Array.isArray(outputItem?.content)) {
        continue;
      }

      for (const contentItem of outputItem.content) {
        const text =
          typeof contentItem?.text === "string"
            ? contentItem.text.trim()
            : typeof contentItem?.transcript === "string"
              ? contentItem.transcript.trim()
              : "";

        if (text) {
          textParts.push(text);
        }
      }
    }

    return textParts.join(" ").trim();
  }

  function handleResponseDone(message) {
    const responseId = resolveMessageResponseId(message);

    if (!responseId) {
      warn("Received response.done without a response ID.");
      resetActiveResponseState();
      return;
    }

    if (state.handledResponseIds.has(responseId)) {
      warn(
        `Duplicate completed response blocked: ${responseId}.`
      );

      emit("duplicate-blocked", {
        layer: "completed-openai-response",
        turnId: state.activeTurnId,
        responseId
      });

      return;
    }

    if (
      state.activeResponseId &&
      responseId !== state.activeResponseId
    ) {
      warn(
        `Stale response.done blocked: ${responseId}. ` +
          `Expected: ${state.activeResponseId}.`
      );

      emit("duplicate-blocked", {
        layer: "stale-openai-response",
        turnId: state.activeTurnId,
        responseId,
        expectedResponseId: state.activeResponseId
      });

      return;
    }

    const responseStatus =
      typeof message.response?.status === "string"
        ? message.response.status
        : "completed";

    if (
      responseStatus === "cancelled" ||
      responseStatus === "failed" ||
      responseStatus === "incomplete"
    ) {
      warn(
        `OpenAI response ended with status "${responseStatus}": ` +
          `${responseId}.`
      );

      state.responseTextById.delete(responseId);
      resetActiveResponseState();

      emit("response-ended", {
        turnId: state.activeTurnId,
        responseId,
        status: responseStatus
      });

      return;
    }

    const streamedText =
      state.responseTextById.get(responseId)?.trim() || "";

    const responseObjectText =
      extractTextFromCompletedResponse(message);

    const responseText =
      streamedText || responseObjectText;

    state.handledResponseIds.add(responseId);
    trimHandledResponseIds();

    state.responseTextById.delete(responseId);

    const totalResponseLatencyMs =
      state.turnStoppedAt !== null
        ? elapsedSince(state.turnStoppedAt)
        : null;

    const generationDurationMs =
      state.activeResponseStartedAt !== null
        ? elapsedSince(state.activeResponseStartedAt)
        : null;

    resetActiveResponseState();

    if (!responseText) {
      warn(
        `Completed OpenAI response contained no text: ${responseId}.`
      );

      emit("response-ended", {
        turnId: state.activeTurnId,
        responseId,
        status: "empty"
      });

      return;
    }

    log(`Maddy response completed: ${responseId}.`, {
      turnId: state.activeTurnId,
      characters: responseText.length,
      totalResponseLatencyMs,
      generationDurationMs
    });

    /**
     * This is the sole authorized handoff from OpenAI Realtime to
     * MaddyRealtime and, later, ElevenLabs.
     */
    global.dispatchEvent(
      new CustomEvent("meos:maddy:response", {
        detail: {
          text: responseText,
          source: "openai-realtime",

          authorized: true,
          turnId: state.activeTurnId,
          responseId,

          voiceEngineVersion: VOICE_ENGINE_VERSION,
          buildId: BUILD_ID,

          latency: {
            totalResponseLatencyMs,
            generationDurationMs
          }
        }
      })
    );

    emit("response-completed", {
      turnId: state.activeTurnId,
      responseId,
      textLength: responseText.length,
      totalResponseLatencyMs,
      generationDurationMs
    });
  }

  function handleRealtimeError(message) {
    const errorMessage =
      message?.error?.message ||
      message?.message ||
      "Unknown OpenAI Realtime error.";

    console.error(
      `[MEOS Voice v${VERSION}] Realtime error:`,
      message
    );

    resetActiveResponseState();

    emit("error", {
      message: errorMessage,
      realtimeEvent: message
    });
  }

  function handleRealtimeMessage(message) {
    emit("event", message);

    switch (message.type) {
      case "session.created":
        emit("session-created", {
          sessionId: message.session?.id || null
        });
        break;

      case "session.updated":
        emit("session-updated", {
          sessionId: message.session?.id || null
        });
        break;

      case "input_audio_buffer.speech_started":
        beginUserTurn(message);
        break;

      case "input_audio_buffer.speech_stopped":
        authorizeSingleResponse(message);
        break;

      case "response.created":
        handleResponseCreated(message);
        break;

      case "response.output_text.delta":
        appendResponseText(message);
        break;

      case "response.output_text.done":
        finalizeResponseText(message);
        break;

      case "response.done":
        handleResponseDone(message);
        break;

      case "error":
        handleRealtimeError(message);
        break;

      default:
        break;
    }
  }

  function installDataChannelHandlers(dataChannel) {
    dataChannel.addEventListener("open", () => {
      state.connected = true;
      state.connecting = false;
      state.disconnecting = false;

      configureMaddySession();

      log(`Connected. Build ${BUILD_ID}.`);

      emit("connected", getStatus());
    });

    dataChannel.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);

        handleRealtimeMessage(message);
      } catch (error) {
        warn("Unrecognized realtime message.", {
          rawMessage: event.data,
          error
        });
      }
    });

    dataChannel.addEventListener("close", () => {
      const wasConnected = state.connected;

      state.connected = false;
      state.connecting = false;
      state.configured = false;

      if (wasConnected && !state.disconnecting) {
        warn("Realtime data channel closed unexpectedly.");
      }

      emit("disconnected", getStatus());
    });

    dataChannel.addEventListener("error", (event) => {
      console.error(
        `[MEOS Voice v${VERSION}] Data channel error:`,
        event
      );

      emit("error", {
        message:
          "Maddy's realtime data channel encountered an error."
      });
    });
  }

  async function connect() {
    if (state.connected || state.connecting) {
      return getStatus();
    }

    if (
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      throw new Error(
        "This browser does not support microphone access."
      );
    }

    state.connecting = true;
    state.disconnecting = false;

    emit("connecting", getStatus());

    try {
      const peerConnection = new RTCPeerConnection();

      state.peerConnection = peerConnection;

      peerConnection.addEventListener(
        "connectionstatechange",
        () => {
          emit("connection-state", {
            connectionState:
              peerConnection.connectionState
          });

          if (
            peerConnection.connectionState === "failed" ||
            peerConnection.connectionState === "closed"
          ) {
            state.connected = false;
          }
        }
      );

      /**
       * OpenAI audio output is intentionally muted and disabled because
       * Maddy's audible voice is owned by ElevenLabs.
       */
      const remoteAudio =
        document.createElement("audio");

      remoteAudio.autoplay = false;
      remoteAudio.muted = true;
      remoteAudio.setAttribute("aria-hidden", "true");
      remoteAudio.style.display = "none";

      document.body.appendChild(remoteAudio);
      state.remoteAudio = remoteAudio;

      peerConnection.addEventListener("track", (event) => {
        event.track.enabled = false;

        if (event.streams?.[0]) {
          remoteAudio.srcObject = event.streams[0];
        }
      });

      const microphoneStream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1
          }
        });

      state.microphoneStream = microphoneStream;

      microphoneStream.getTracks().forEach((track) => {
        peerConnection.addTrack(
          track,
          microphoneStream
        );
      });

      const dataChannel =
        peerConnection.createDataChannel("oai-events");

      state.dataChannel = dataChannel;

      installDataChannelHandlers(dataChannel);

      const offer =
        await peerConnection.createOffer();

      await peerConnection.setLocalDescription(offer);

      const response = await fetch(SESSION_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
          "X-MEOS-Voice-Engine":
            VOICE_ENGINE_VERSION
        },
        body: offer.sdp
      });

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message ||
            `Realtime session failed with status ${response.status}.`
        );
      }

      const deployedVoiceEngine =
        response.headers.get("X-MEOS-Voice-Engine");

      if (
        deployedVoiceEngine &&
        deployedVoiceEngine !== VOICE_ENGINE_VERSION
      ) {
        warn(
          `Server returned Voice Engine "${deployedVoiceEngine}" ` +
            `while client expects "${VOICE_ENGINE_VERSION}".`
        );
      }

      const answer = {
        type: "answer",
        sdp: await response.text()
      };

      await peerConnection.setRemoteDescription(answer);

      return getStatus();
    } catch (error) {
      state.connecting = false;

      await disconnect({
        reason: "connection-failed",
        suppressLog: true
      });

      console.error(
        `[MEOS Voice v${VERSION}] Connection failed:`,
        error
      );

      emit("error", {
        message: error.message
      });

      throw error;
    }
  }

  async function disconnect(options = {}) {
    if (state.disconnecting) {
      return getStatus();
    }

    state.disconnecting = true;

    const reason =
      options.reason || "manual-disconnect";

    clearResponseTimeout();

    if (state.responseInProgress) {
      cancelActiveResponse(reason);
    }

    try {
      state.microphoneStream
        ?.getTracks()
        .forEach((track) => {
          track.stop();
        });
    } catch (error) {
      warn("Could not stop every microphone track.", error);
    }

    try {
      if (
        state.dataChannel &&
        state.dataChannel.readyState !== "closed"
      ) {
        state.dataChannel.close();
      }
    } catch (error) {
      warn("Could not close the data channel.", error);
    }

    try {
      state.peerConnection?.close();
    } catch (error) {
      warn("Could not close the peer connection.", error);
    }

    if (state.remoteAudio) {
      try {
        state.remoteAudio.pause();
        state.remoteAudio.srcObject = null;
        state.remoteAudio.remove();
      } catch (error) {
        warn("Could not remove the remote audio element.", error);
      }
    }

    state.connected = false;
    state.connecting = false;
    state.configured = false;

    state.peerConnection = null;
    state.dataChannel = null;
    state.microphoneStream = null;
    state.remoteAudio = null;

    state.activeTurnId = null;
    state.turnStartedAt = null;
    state.turnStoppedAt = null;

    state.responseRequestedForTurn = false;
    state.responseRequestedAt = null;

    state.responseTextById.clear();

    resetActiveResponseState();

    state.disconnecting = false;

    if (!options.suppressLog) {
      log(`Disconnected. reason=${reason}.`);
    }

    emit("disconnected", {
      ...getStatus(),
      reason
    });

    return getStatus();
  }

  function interrupt(reason = "manual-interruption") {
    emitMaddyEvent("interrupt", {
      reason,
      turnId: state.activeTurnId,
      responseId: state.activeResponseId
    });

    cancelActiveResponse(reason);

    return getStatus();
  }

  global.OpenAIRealtime = Object.freeze({
    version: VERSION,
    voiceEngineVersion: VOICE_ENGINE_VERSION,
    buildId: BUILD_ID,

    connect,
    disconnect,
    interrupt,
    sendEvent,
    getStatus
  });

  log(`Client online. Build ${BUILD_ID}.`);
})(window);
