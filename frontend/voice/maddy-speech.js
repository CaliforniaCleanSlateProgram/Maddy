/**
 * MEOS — Maddy Speech Engine
 *
 * File Version: 2.0.1
 * Voice Engine Release: 2.0.0
 * Status: Commissioned
 *
 * Responsibilities:
 * - Accept only authorized speech requests from Maddy Realtime.
 * - Allow one TTS request and one active audio owner per response ID.
 * - Block duplicate, stale, unauthorized, and malformed requests.
 * - Abort pending TTS work when interrupted or replaced.
 * - Stop and clean up active audio safely.
 * - Fall back to browser speech synthesis if remote TTS fails.
 * - Preserve Maddy's external ThatsMaddy voice profile.
 * - Expose runtime status, diagnostics, and compatibility methods.
 */

(function initializeMaddySpeech(global) {
  "use strict";

  const VERSION = "2.0.1";
  const VOICE_ENGINE_VERSION = "2.0.0";
  const BUILD_ID = "VE201-MADDY-SPEECH-20260730-A";
  const DEFAULT_TTS_ENDPOINT = "https://maddy-yy8o.onrender.com/tts";
  const MAX_COMPLETED_RESPONSE_IDS = 250;
  const MAX_TEXT_LENGTH = 12000;
  const REQUEST_TIMEOUT_MS = 45000;

  const SpeechRecognition =
    global.SpeechRecognition || global.webkitSpeechRecognition || null;

  const state = {
    initialized: false,
    speaking: false,
    listening: false,
    paused: false,
    interrupted: false,
    activeMode: null,
    activeTurnId: null,
    activeResponseId: null,
    activeAudio: null,
    activeObjectUrl: null,
    activeUtterance: null,
    activeAbortController: null,
    activeRequestToken: null,
    selectedVoice: null,
    recognition: null,
    lastSpokenText: "",
    lastHeardText: "",
    lastError: null,
    requestCount: 0,
    playbackCount: 0,
    fallbackCount: 0,
    duplicateBlockedCount: 0,
    unauthorizedBlockedCount: 0,
    staleBlockedCount: 0,
    interruptionCount: 0,
    completedResponseIds: new Set(),
    supported: {
      remoteTts: "fetch" in global && "AbortController" in global,
      browserSpeech: "speechSynthesis" in global,
      listening: Boolean(SpeechRecognition),
      audio: "Audio" in global
    }
  };

  const listeners = new Map();

  const DEFAULT_VOICE_PROFILE = Object.freeze({
    language: "en-US",
    rate: 1.08,
    pitch: 1.12,
    volume: 1,
    preferredNames: [
      "Microsoft Aria Online",
      "Microsoft Jenny Online",
      "Google US English",
      "Samantha"
    ]
  });

  function log(message, metadata) {
    metadata === undefined
      ? console.log(`[MEOS Maddy Speech v${VERSION}] ${message}`)
      : console.log(`[MEOS Maddy Speech v${VERSION}] ${message}`, metadata);
  }

  function warn(message, metadata) {
    metadata === undefined
      ? console.warn(`[MEOS Maddy Speech v${VERSION}] ${message}`)
      : console.warn(`[MEOS Maddy Speech v${VERSION}] ${message}`, metadata);
  }

  function reportError(message, metadata) {
    metadata === undefined
      ? console.error(`[MEOS Maddy Speech v${VERSION}] ${message}`)
      : console.error(`[MEOS Maddy Speech v${VERSION}] ${message}`, metadata);
  }

  function normalizeIdentifier(value) {
    if (typeof value !== "string") return "";
    const normalized = value.trim();
    if (!normalized || normalized.length > 200) return "";
    return normalized.replace(/[^a-zA-Z0-9._:-]/g, "");
  }

  function normalizeText(value) {
    const text = String(value || "").trim();
    return text ? text.slice(0, MAX_TEXT_LENGTH) : "";
  }

  function getExternalVoiceProfile() {
    const profiles = [
      global.ThatsMaddyVoice,
      global.thatsMaddyVoice,
      global.MaddyVoice
    ];
    return profiles.find((profile) => profile && typeof profile === "object") || {};
  }

  function getVoiceSettings(overrides = {}) {
    const externalProfile = getExternalVoiceProfile();
    return {
      ...DEFAULT_VOICE_PROFILE,
      ...externalProfile,
      ...overrides,
      preferredNames:
        overrides.preferredNames ||
        externalProfile.preferredNames ||
        DEFAULT_VOICE_PROFILE.preferredNames
    };
  }

  function getTtsEndpoint() {
    const profile = getExternalVoiceProfile();
    const endpoint = profile.ttsEndpoint || profile.endpoint || global.MEOS_TTS_ENDPOINT;
    return typeof endpoint === "string" && endpoint.trim()
      ? endpoint.trim()
      : DEFAULT_TTS_ENDPOINT;
  }

  function emit(eventName, detail = {}) {
    const enriched = {
      version: VERSION,
      voiceEngineVersion: VOICE_ENGINE_VERSION,
      buildId: BUILD_ID,
      ...detail
    };

    listeners.get(eventName)?.forEach((listener) => {
      try {
        listener(enriched);
      } catch (error) {
        reportError(`Listener failed for "${eventName}".`, error);
      }
    });

    global.dispatchEvent(
      new CustomEvent(`maddy-speech:${eventName}`, { detail: enriched })
    );

    const canonical = {
      "speaking-started": "meos:maddy:speech-started",
      "speaking-ended": "meos:maddy:speech-ended",
      "speaking-stopped": "meos:maddy:speech-ended"
    }[eventName];

    if (canonical) {
      global.dispatchEvent(new CustomEvent(canonical, { detail: enriched }));
    }
  }

  function on(eventName, listener) {
    if (typeof listener !== "function") {
      throw new TypeError("MaddySpeech.on requires a function.");
    }
    if (!listeners.has(eventName)) listeners.set(eventName, new Set());
    listeners.get(eventName).add(listener);
    return () => listeners.get(eventName)?.delete(listener);
  }

  function selectBestVoice(settings = getVoiceSettings()) {
    if (!state.supported.browserSpeech) return null;
    const voices = global.speechSynthesis.getVoices();
    if (!voices.length) return null;

    for (const preferredName of Array.isArray(settings.preferredNames)
      ? settings.preferredNames
      : []) {
      const match = voices.find((voice) =>
        voice.name.toLowerCase().includes(String(preferredName).toLowerCase())
      );
      if (match) {
        state.selectedVoice = match;
        return match;
      }
    }

    const female = voices.find((voice) => {
      const name = voice.name.toLowerCase();
      return voice.lang.startsWith("en-US") &&
        ["aria", "jenny", "samantha", "zira", "female"].some((word) =>
          name.includes(word)
        );
    });
    const language = voices.find((voice) =>
      voice.lang.startsWith(settings.language || "en-US")
    );
    state.selectedVoice = female || language || voices[0];
    return state.selectedVoice;
  }

  function trimCompletedResponseIds() {
    while (state.completedResponseIds.size > MAX_COMPLETED_RESPONSE_IDS) {
      const oldest = state.completedResponseIds.values().next().value;
      if (!oldest) break;
      state.completedResponseIds.delete(oldest);
    }
  }

  function revokeActiveObjectUrl() {
    if (!state.activeObjectUrl) return;
    try {
      URL.revokeObjectURL(state.activeObjectUrl);
    } catch (error) {
      warn("Could not revoke audio object URL.", error);
    }
    state.activeObjectUrl = null;
  }

  function detachActiveAudio() {
    if (!state.activeAudio) return;
    try {
      state.activeAudio.pause();
      state.activeAudio.removeAttribute("src");
      state.activeAudio.load();
    } catch (error) {
      warn("Could not fully detach active audio.", error);
    }
    state.activeAudio = null;
    revokeActiveObjectUrl();
  }

  function cancelBrowserSpeech() {
    if (!state.supported.browserSpeech) return;
    try {
      global.speechSynthesis.cancel();
    } catch (error) {
      warn("Browser speech cancellation failed.", error);
    }
    state.activeUtterance = null;
  }

  function abortPendingRequest(reason = "aborted") {
    if (!state.activeAbortController) return;
    try {
      state.activeAbortController.abort(reason);
    } catch (error) {
      warn("TTS request abort failed.", error);
    }
    state.activeAbortController = null;
  }

  function clearActiveOwnership() {
    state.activeMode = null;
    state.activeTurnId = null;
    state.activeResponseId = null;
    state.activeRequestToken = null;
    state.paused = false;
    state.speaking = false;
  }

  function stopActiveSpeech({
    reason = "stopped",
    emitEvent = true,
    preserveListening = true
  } = {}) {
    const turnId = state.activeTurnId;
    const responseId = state.activeResponseId;
    const mode = state.activeMode;

    abortPendingRequest(reason);
    detachActiveAudio();
    cancelBrowserSpeech();

    state.interrupted = reason === "interrupted" || reason === "user-interruption";
    if (state.interrupted) state.interruptionCount += 1;

    clearActiveOwnership();
    if (!preserveListening) state.listening = false;

    if (emitEvent && (turnId || responseId || mode)) {
      emit("speaking-stopped", {
        reason,
        mode,
        turnId,
        responseId,
        interrupted: state.interrupted
      });
    }
    return Boolean(turnId || responseId || mode);
  }

  function createRequestToken(responseId) {
    return `${responseId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  }

  function isCurrentRequest(token, responseId) {
    return Boolean(
      token &&
      state.activeRequestToken === token &&
      state.activeResponseId === responseId
    );
  }

  function markResponseComplete(responseId) {
    if (!responseId) return;
    state.completedResponseIds.add(responseId);
    trimCompletedResponseIds();
  }

  function getStatus() {
    return Object.freeze({
      version: VERSION,
      voiceEngineVersion: VOICE_ENGINE_VERSION,
      buildId: BUILD_ID,
      initialized: state.initialized,
      speaking: state.speaking,
      listening: state.listening,
      paused: state.paused,
      interrupted: state.interrupted,
      activeMode: state.activeMode,
      activeTurnId: state.activeTurnId,
      activeResponseId: state.activeResponseId,
      supported: { ...state.supported },
      selectedVoice: state.selectedVoice?.name || null,
      lastSpokenText: state.lastSpokenText,
      lastHeardText: state.lastHeardText,
      lastError: state.lastError,
      requestCount: state.requestCount,
      playbackCount: state.playbackCount,
      fallbackCount: state.fallbackCount,
      duplicateBlockedCount: state.duplicateBlockedCount,
      unauthorizedBlockedCount: state.unauthorizedBlockedCount,
      staleBlockedCount: state.staleBlockedCount,
      interruptionCount: state.interruptionCount,
      completedResponseCount: state.completedResponseIds.size
    });
  }

  function createTimeoutController() {
    const controller = new AbortController();
    const timeoutId = global.setTimeout(
      () => controller.abort("timeout"),
      REQUEST_TIMEOUT_MS
    );
    return {
      controller,
      clear: () => global.clearTimeout(timeoutId)
    };
  }

  async function requestRemoteAudio({ text, turnId, responseId, signal }) {
    const response = await fetch(getTtsEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MEOS-Voice-Engine": VOICE_ENGINE_VERSION,
        "X-MEOS-Response-ID": responseId,
        ...(turnId ? { "X-MEOS-Turn-ID": turnId } : {})
      },
      body: JSON.stringify({
        text,
        turnId: turnId || null,
        responseId,
        authorized: true,
        voiceEngineVersion: VOICE_ENGINE_VERSION
      }),
      signal,
      cache: "no-store",
      credentials: "omit"
    });

    if (!response.ok) {
      let message = "";
      try {
        const type = response.headers.get("content-type") || "";
        if (type.includes("application/json")) {
          const data = await response.json();
          message = data?.error || data?.message || "";
        } else {
          message = (await response.text()).slice(0, 300);
        }
      } catch (_error) {}
      throw new Error(
        `TTS request failed with HTTP ${response.status}${message ? `: ${message}` : ""}`
      );
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error("TTS server returned an empty audio response.");
    }
    return blob;
  }

  function playRemoteAudio({
    blob,
    text,
    turnId,
    responseId,
    requestToken,
    startedAt
  }) {
    return new Promise((resolve, reject) => {
      if (!isCurrentRequest(requestToken, responseId)) {
        state.staleBlockedCount += 1;
        reject(new DOMException("Stale audio response blocked.", "AbortError"));
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      state.activeObjectUrl = objectUrl;
      state.activeAudio = audio;
      state.activeMode = "remote";
      state.speaking = true;
      state.paused = false;
      state.interrupted = false;
      state.lastSpokenText = text;
      state.lastError = null;
      audio.preload = "auto";

      audio.addEventListener("playing", () => {
        if (!isCurrentRequest(requestToken, responseId)) {
          audio.pause();
          return;
        }
        state.playbackCount += 1;
        emit("speaking-started", {
          text,
          turnId,
          responseId,
          mode: "remote",
          provider: "backend-tts",
          latencyMs: Math.round(performance.now() - startedAt)
        });
        log("Remote audio playback started.", {
          turnId: turnId || "unknown",
          responseId,
          bytes: blob.size
        });
      }, { once: true });

      audio.addEventListener("ended", () => {
        const wasCurrent = isCurrentRequest(requestToken, responseId);
        markResponseComplete(responseId);
        if (wasCurrent) clearActiveOwnership();
        if (state.activeAudio === audio) state.activeAudio = null;
        if (state.activeObjectUrl === objectUrl) revokeActiveObjectUrl();
        else URL.revokeObjectURL(objectUrl);
        emit("speaking-ended", {
          text,
          turnId,
          responseId,
          mode: "remote",
          reason: "completed"
        });
        log("Remote audio playback completed.", {
          turnId: turnId || "unknown",
          responseId
        });
        resolve({ text, turnId, responseId, mode: "remote" });
      }, { once: true });

      audio.addEventListener("error", () => {
        const mediaError = audio.error?.message ||
          `Media error code ${audio.error?.code || "unknown"}`;
        if (isCurrentRequest(requestToken, responseId)) {
          state.speaking = false;
          state.lastError = mediaError;
        }
        try { URL.revokeObjectURL(objectUrl); } catch (_error) {}
        reject(new Error(`Remote audio playback failed: ${mediaError}`));
      }, { once: true });

      audio.play().catch(reject);
    });
  }

  function speakWithBrowser({
    text,
    turnId,
    responseId,
    options = {},
    requestToken,
    reason = "remote-tts-unavailable"
  }) {
    return new Promise((resolve, reject) => {
      if (!state.supported.browserSpeech) {
        reject(new Error("Browser speech synthesis is not supported."));
        return;
      }
      if (!isCurrentRequest(requestToken, responseId)) {
        state.staleBlockedCount += 1;
        reject(new DOMException("Stale browser speech blocked.", "AbortError"));
        return;
      }

      const settings = getVoiceSettings(options);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = settings.language;
      utterance.rate = Number(settings.rate) || DEFAULT_VOICE_PROFILE.rate;
      utterance.pitch = Number(settings.pitch) || DEFAULT_VOICE_PROFILE.pitch;
      utterance.volume = typeof settings.volume === "number"
        ? settings.volume
        : DEFAULT_VOICE_PROFILE.volume;
      utterance.voice = selectBestVoice(settings);

      state.activeMode = "browser";
      state.activeUtterance = utterance;
      state.speaking = true;
      state.paused = false;
      state.interrupted = false;
      state.lastSpokenText = text;
      state.lastError = null;
      state.fallbackCount += 1;

      utterance.onstart = () => {
        if (!isCurrentRequest(requestToken, responseId)) {
          global.speechSynthesis.cancel();
          return;
        }
        state.playbackCount += 1;
        emit("speaking-started", {
          text,
          turnId,
          responseId,
          mode: "browser",
          provider: utterance.voice?.name || "browser-default",
          fallbackReason: reason
        });
        warn("Browser voice fallback started.", {
          turnId: turnId || "unknown",
          responseId,
          reason
        });
      };

      utterance.onend = () => {
        const wasCurrent = isCurrentRequest(requestToken, responseId);
        markResponseComplete(responseId);
        if (wasCurrent) clearActiveOwnership();
        state.activeUtterance = null;
        emit("speaking-ended", {
          text,
          turnId,
          responseId,
          mode: "browser",
          reason: "completed"
        });
        resolve({ text, turnId, responseId, mode: "browser" });
      };

      utterance.onerror = (event) => {
        const errorName = event.error || "unknown-error";
        const stopped = errorName === "interrupted" || errorName === "canceled";
        const message = stopped
          ? "Maddy's speech was stopped."
          : `Browser speech failed: ${errorName}`;
        if (isCurrentRequest(requestToken, responseId)) {
          state.lastError = message;
          clearActiveOwnership();
        }
        state.activeUtterance = null;
        if (stopped) {
          resolve({ text, turnId, responseId, mode: "browser", stopped: true });
          return;
        }
        emit("error", {
          area: "speech",
          message,
          turnId,
          responseId,
          mode: "browser",
          browserError: errorName
        });
        reject(new Error(message));
      };

      global.speechSynthesis.speak(utterance);
    });
  }

  async function speak(text, options = {}) {
    const cleanText = normalizeText(text);
    const responseId = normalizeIdentifier(options.responseId);
    const turnId = normalizeIdentifier(options.turnId);
    const authorized = options.authorized === true;

    if (!cleanText) throw new Error("Maddy needs text before she can speak.");

    if (!authorized || !responseId) {
      state.unauthorizedBlockedCount += 1;
      const message = !authorized
        ? "Unauthorized speech request blocked."
        : "Speech request without a response ID was blocked.";
      state.lastError = message;
      emit("request-blocked", {
        reason: !authorized ? "authorization-missing" : "response-id-missing",
        turnId,
        responseId
      });
      throw new Error(message);
    }

    if (state.completedResponseIds.has(responseId) ||
        state.activeResponseId === responseId) {
      state.duplicateBlockedCount += 1;
      emit("request-blocked", {
        reason: "duplicate-response-id",
        turnId,
        responseId
      });
      warn(`Duplicate speech request blocked: ${responseId}.`);
      return { blocked: true, reason: "duplicate-response-id", turnId, responseId };
    }

    if (state.activeResponseId) {
      stopActiveSpeech({
        reason: "superseded",
        emitEvent: true,
        preserveListening: true
      });
    }

    const requestToken = createRequestToken(responseId);
    state.activeTurnId = turnId || null;
    state.activeResponseId = responseId;
    state.activeRequestToken = requestToken;
    state.activeMode = "requesting";
    state.speaking = false;
    state.paused = false;
    state.interrupted = false;
    state.lastError = null;

    const startedAt = performance.now();
    emit("request-started", {
      turnId,
      responseId,
      textLength: cleanText.length
    });

    if (options.preferRemote !== false &&
        state.supported.remoteTts &&
        state.supported.audio) {
      const timeout = createTimeoutController();
      state.activeAbortController = timeout.controller;
      state.requestCount += 1;

      log("Sending one authorized TTS request.", {
        turnId: turnId || "unknown",
        responseId,
        requestNumber: state.requestCount,
        characters: cleanText.length
      });

      try {
        const blob = await requestRemoteAudio({
          text: cleanText,
          turnId,
          responseId,
          signal: timeout.controller.signal
        });
        timeout.clear();
        if (state.activeAbortController === timeout.controller) {
          state.activeAbortController = null;
        }
        if (!isCurrentRequest(requestToken, responseId)) {
          state.staleBlockedCount += 1;
          return { blocked: true, reason: "stale-response", turnId, responseId };
        }
        return await playRemoteAudio({
          blob,
          text: cleanText,
          turnId,
          responseId,
          requestToken,
          startedAt
        });
      } catch (error) {
        timeout.clear();
        if (state.activeAbortController === timeout.controller) {
          state.activeAbortController = null;
        }
        const aborted = error?.name === "AbortError" || timeout.controller.signal.aborted;
        if (aborted) {
          if (isCurrentRequest(requestToken, responseId)) clearActiveOwnership();
          return { stopped: true, reason: "aborted", turnId, responseId };
        }
        if (!isCurrentRequest(requestToken, responseId)) {
          state.staleBlockedCount += 1;
          return { blocked: true, reason: "stale-response", turnId, responseId };
        }
        state.lastError = error?.message || "Remote TTS failed.";
        warn("Remote TTS failed; using browser fallback.", {
          turnId: turnId || "unknown",
          responseId,
          error: state.lastError
        });
        return speakWithBrowser({
          text: cleanText,
          turnId,
          responseId,
          options,
          requestToken,
          reason: state.lastError
        });
      }
    }

    return speakWithBrowser({
      text: cleanText,
      turnId,
      responseId,
      options,
      requestToken,
      reason: "remote-tts-disabled"
    });
  }

  function stopSpeaking(reason = "stopped") {
    return stopActiveSpeech({ reason, emitEvent: true, preserveListening: true });
  }

  function pauseSpeaking() {
    if (!state.speaking) return false;
    if (state.activeMode === "remote" && state.activeAudio) {
      state.activeAudio.pause();
      state.paused = true;
      state.speaking = false;
    } else if (state.activeMode === "browser" && state.supported.browserSpeech) {
      global.speechSynthesis.pause();
      state.paused = true;
      state.speaking = false;
    } else return false;
    emit("speaking-paused", {
      turnId: state.activeTurnId,
      responseId: state.activeResponseId,
      mode: state.activeMode
    });
    return true;
  }

  function resumeSpeaking() {
    if (!state.paused) return false;
    if (state.activeMode === "remote" && state.activeAudio) {
      state.activeAudio.play().catch((error) => {
        state.lastError = error.message;
        emit("error", { area: "speech", message: error.message, mode: "remote" });
      });
    } else if (state.activeMode === "browser" && state.supported.browserSpeech) {
      global.speechSynthesis.resume();
    } else return false;
    state.paused = false;
    state.speaking = true;
    emit("speaking-resumed", {
      turnId: state.activeTurnId,
      responseId: state.activeResponseId,
      mode: state.activeMode
    });
    return true;
  }

  function createRecognition() {
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      state.listening = true;
      state.lastError = null;
      emit("listening-started");
    };

    recognition.onresult = (event) => {
      let interimText = "";
      let finalText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript.trim();
        if (event.results[index].isFinal) finalText += `${transcript} `;
        else interimText += `${transcript} `;
      }
      interimText = interimText.trim();
      finalText = finalText.trim();
      if (interimText) emit("hearing-interim", { text: interimText });
      if (finalText) {
        state.lastHeardText = finalText;
        emit("heard", { text: finalText });
      }
    };

    recognition.onerror = (event) => {
      state.listening = false;
      const messages = {
        "not-allowed": "Microphone permission was denied. Allow microphone access and try again.",
        "no-speech": "Maddy did not hear any speech.",
        "audio-capture": "No working microphone was found.",
        network: "The browser speech service could not connect."
      };
      const message = messages[event.error] ||
        `Maddy could not listen: ${event.error || "unknown error"}`;
      state.lastError = message;
      emit("error", { area: "listening", message, browserError: event.error });
    };

    recognition.onend = () => {
      state.listening = false;
      emit("listening-ended", { text: state.lastHeardText });
    };
    return recognition;
  }

  function startListening(options = {}) {
    return new Promise((resolve, reject) => {
      if (!state.supported.listening) {
        const error = new Error("Speech recognition is not supported in this browser.");
        state.lastError = error.message;
        emit("error", { area: "listening", message: error.message });
        reject(error);
        return;
      }
      if (state.listening) {
        reject(new Error("Maddy is already listening."));
        return;
      }
      if (options.stopSpeaking !== false) stopSpeaking("listening-started");
      const recognition = createRecognition();
      recognition.lang = options.language || "en-US";
      recognition.continuous = Boolean(options.continuous);
      recognition.interimResults = options.interimResults !== false;
      state.recognition = recognition;
      state.lastHeardText = "";

      const unsubscribeHeard = on("heard", ({ text }) => {
        if (!recognition.continuous) {
          unsubscribeHeard();
          resolve(text);
        }
      });
      const unsubscribeError = on("error", (detail) => {
        if (detail.area === "listening") {
          unsubscribeError();
          unsubscribeHeard();
          reject(new Error(detail.message));
        }
      });

      try {
        recognition.start();
      } catch (error) {
        unsubscribeError();
        unsubscribeHeard();
        state.listening = false;
        state.lastError = error.message;
        reject(error);
      }
    });
  }

  function stopListening() {
    if (!state.recognition || !state.listening) return false;
    state.recognition.stop();
    state.listening = false;
    emit("listening-stopped");
    return true;
  }

  function getAvailableVoices() {
    if (!state.supported.browserSpeech) return [];
    return global.speechSynthesis.getVoices().map((voice) => ({
      name: voice.name,
      language: voice.lang,
      default: voice.default,
      local: voice.localService
    }));
  }

  function resetResponseHistory() {
    stopActiveSpeech({ reason: "history-reset", emitEvent: false });
    state.completedResponseIds.clear();
    state.requestCount = 0;
    state.playbackCount = 0;
    state.fallbackCount = 0;
    state.duplicateBlockedCount = 0;
    state.unauthorizedBlockedCount = 0;
    state.staleBlockedCount = 0;
    state.interruptionCount = 0;
    state.lastError = null;
    state.interrupted = false;
    log("Speech response history reset.");
    return getStatus();
  }

  function handleSpeakEvent(event) {
    const detail = event?.detail || {};
    const text = normalizeText(detail.text);
    const turnId = normalizeIdentifier(detail.turnId);
    const responseId = normalizeIdentifier(detail.responseId);
    if (!text) {
      warn("Empty meos:maddy:speak event ignored.");
      return;
    }
    speak(text, {
      ...detail,
      authorized: detail.authorized === true,
      turnId,
      responseId
    }).catch((error) => {
      if (error?.name === "AbortError") return;
      reportError("Maddy speech request failed.", {
        turnId: turnId || "unknown",
        responseId: responseId || "unknown",
        error: error?.message || error
      });
    });
  }

  function handleInterruptEvent(event) {
    stopActiveSpeech({
      reason: typeof event?.detail?.reason === "string"
        ? event.detail.reason
        : "interrupted",
      emitEvent: true,
      preserveListening: true
    });
  }

  function handleRealtimeSpeechStarted() {
    if (state.activeResponseId || state.activeMode) {
      stopActiveSpeech({
        reason: "user-interruption",
        emitEvent: true,
        preserveListening: true
      });
    }
  }

  function initialize() {
    if (state.initialized) return getStatus();
    state.initialized = true;

    if (state.supported.browserSpeech) {
      selectBestVoice();
      global.speechSynthesis.addEventListener("voiceschanged", () => {
        const selectedVoice = selectBestVoice();
        emit("voices-ready", {
          selectedVoice: selectedVoice?.name || null,
          voices: getAvailableVoices()
        });
      });
    }

    global.addEventListener("meos:maddy:speak", handleSpeakEvent);
    global.addEventListener("meos:maddy:interrupt", handleInterruptEvent);
    global.addEventListener("meos:realtime:speech-started", handleRealtimeSpeechStarted);

    log(`Speech Engine online. Build ${BUILD_ID}.`);
    log("Capabilities.", {
      remoteTts: state.supported.remoteTts,
      browserSpeech: state.supported.browserSpeech,
      listening: state.supported.listening,
      audio: state.supported.audio,
      externalVoiceProfile: Object.keys(getExternalVoiceProfile()).length > 0
    });
    emit("ready", getStatus());
    return getStatus();
  }

  global.MaddySpeech = Object.freeze({
    version: VERSION,
    voiceEngineVersion: VOICE_ENGINE_VERSION,
    buildId: BUILD_ID,
    initialize,
    speak,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    startListening,
    stopListening,
    getAvailableVoices,
    getStatus,
    resetResponseHistory,
    on
  });

  initialize();
})(window);
