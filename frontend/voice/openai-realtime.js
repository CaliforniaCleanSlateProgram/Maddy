/**
 * MEOS OpenAI Realtime Client
 *
 * File Version: 2.0.7
 * Voice Engine Release: 2.0.0
 * Status: Commissioned
 *
 * Responsibilities:
 * - Establish one secure OpenAI Realtime WebRTC session.
 * - Maintain one microphone stream and one data channel.
 * - Use server VAD as a provisional speech sensor, not as automatic user-turn authority.
 * - Wake foreground conversation on Maddy/Madison phonetic variants and preserve natural follow-up turns.
 * - Preserve the leading wake word with a longer server-VAD prefix window in noisy rooms.
 * - Never reuse stale acoustic samples as proof that a later speaker is the foreground user.
 * - Keep background office speech from stealing conversational control or interrupting Maddy.
 * - Authorize no more than one OpenAI response per user turn.
 * - Accept and publish each OpenAI response only once.
 * - Preserve turn IDs and response IDs for downstream TTS control.
 * - Support interruption and complete session shutdown.
 */

(function initializeOpenAIRealtime(global) {
  "use strict";

  const VERSION = "2.0.7";
  const VOICE_ENGINE_VERSION = "2.0.0";
  const BUILD_ID = "VE207-WAKE-CAPTURE-ROBUSTNESS-20260919-A";

  const SESSION_ENDPOINT =
    `/session?voiceEngine=${encodeURIComponent(VOICE_ENGINE_VERSION)}`;

  const RESPONSE_TIMEOUT_MS = 45_000;
  const MAX_HANDLED_RESPONSE_IDS = 200;

  /**
   * Foreground Conversation Attention Gate
   *
   * Server VAD is intentionally only a speech sensor. It is not authority to
   * interrupt Maddy or create a user turn. A transcript must first pass this
   * foreground-attention gate.
   */
  const WAKE_WORD_PATTERN = /\b(?:maddy|maddie|madi|matty|mattie|maddison|madison)\b/i;
  const ATTENTION_LEASE_MS = 60_000;
  const FOLLOW_UP_GRACE_MS = 15_000;
  const CANDIDATE_TRANSCRIPT_TIMEOUT_MS = 4_000;
  const MIN_ACOUSTIC_SAMPLES = 3;
  const MIN_FOREGROUND_RMS = 0.012;
  const MIN_FOREGROUND_NOISE_RATIO = 1.35;
  const MIN_FOREGROUND_REFERENCE_RATIO = 0.58;
  const MIN_BARGE_IN_REFERENCE_RATIO = 0.72;
  const MIN_BARGE_IN_NOISE_RATIO = 1.60;
  const NOISE_FLOOR_MIN = 0.0035;

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
    responseTimeout: null,

    awaitingTranscript: false,
    transcriptTimeout: null,
    lastTranscript: "",
    lastRouterResult: null,

    // Foreground conversation / wake state.
    attentionAwake: false,
    attentionAwakeAt: null,
    attentionExpiresAt: null,
    lastWakeTranscript: "",
    lastAcceptedSpeechAt: null,
    acceptedForegroundTurns: 0,
    ignoredBackgroundTurns: 0,
    wakeCount: 0,

    // Audible Maddy state is separate from OpenAI response generation.
    maddySpeaking: false,
    lastMaddySpeechStartedAt: null,
    lastMaddySpeechEndedAt: null,

    // Provisional VAD candidates.
    speechCandidateCounter: 0,
    activeSpeechCandidate: null,
    pendingSpeechCandidates: [],

    // Browser-native near/far acoustic evidence.
    audioContext: null,
    microphoneSource: null,
    analyser: null,
    analyserData: null,
    analyserFrame: null,
    currentRms: 0,
    currentPeak: 0,
    noiseFloorRms: 0.01,
    foregroundReferenceRms: null,
    foregroundReferencePeak: null
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

      awaitingTranscript: state.awaitingTranscript,
      lastTranscript: state.lastTranscript,
      lastRoute: state.lastRouterResult?.route || null,

      attention: Object.freeze({
        awake: attentionIsAwake(),
        wakeCount: state.wakeCount,
        acceptedForegroundTurns: state.acceptedForegroundTurns,
        ignoredBackgroundTurns: state.ignoredBackgroundTurns,
        maddySpeaking: state.maddySpeaking,
        foregroundReferenceRms: state.foregroundReferenceRms,
        currentRms: state.currentRms,
        noiseFloorRms: state.noiseFloorRms,
        pendingCandidates: state.pendingSpeechCandidates.length +
          (state.activeSpeechCandidate ? 1 : 0),
        expiresInMs: Number.isFinite(state.attentionExpiresAt)
          ? Math.max(0, Math.round(state.attentionExpiresAt - now()))
          : null
      }),

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

  function normalizeTranscript(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function containsWakeWord(transcript) {
    return WAKE_WORD_PATTERN.test(normalizeTranscript(transcript));
  }

  function attentionIsAwake() {
    if (!state.attentionAwake) {
      return false;
    }

    if (
      Number.isFinite(state.attentionExpiresAt) &&
      now() > state.attentionExpiresAt
    ) {
      state.attentionAwake = false;
      state.attentionExpiresAt = null;

      log("Foreground conversation attention expired; wake word required.");

      emit("attention-sleeping", {
        reason: "inactivity-timeout"
      });

      return false;
    }

    return true;
  }

  function extendAttention(reason = "conversation-activity") {
    if (!state.attentionAwake) {
      return false;
    }

    state.attentionExpiresAt = now() + ATTENTION_LEASE_MS;

    emit("attention-extended", {
      reason,
      expiresInMs: ATTENTION_LEASE_MS
    });

    return true;
  }

  function wakeAttention(transcript, candidate = null) {
    state.attentionAwake = true;
    state.attentionAwakeAt = now();
    state.attentionExpiresAt = now() + ATTENTION_LEASE_MS;
    state.lastWakeTranscript = normalizeTranscript(transcript);
    state.wakeCount += 1;

    const rms = Number(candidate?.avgRms) || 0;
    const peak = Number(candidate?.peakRms) || 0;

    if (rms > 0) {
      state.foregroundReferenceRms = rms;
    }

    if (peak > 0) {
      state.foregroundReferencePeak = peak;
    }

    log("Foreground conversation acquired by wake word.", {
      wakeTranscript: state.lastWakeTranscript,
      foregroundReferenceRms: state.foregroundReferenceRms,
      noiseFloorRms: state.noiseFloorRms
    });

    emit("attention-awake", {
      wakeTranscript: state.lastWakeTranscript,
      wakeCount: state.wakeCount,
      foregroundReferenceRms: state.foregroundReferenceRms
    });
  }

  function releaseAttention(reason = "manual-release") {
    const wasAwake = state.attentionAwake;

    state.attentionAwake = false;
    state.attentionAwakeAt = null;
    state.attentionExpiresAt = null;
    state.lastWakeTranscript = "";
    state.foregroundReferenceRms = null;
    state.foregroundReferencePeak = null;

    if (wasAwake) {
      log(`Foreground conversation released. reason=${reason}.`);
      emit("attention-sleeping", { reason });
    }

    return wasAwake;
  }

  function acousticSnapshot(candidate = null) {
    const avgRms = Number(candidate?.avgRms) || 0;
    const peakRms = Number(candidate?.peakRms) || 0;
    const sampleCount = Number(candidate?.sampleCount) || 0;
    const noiseFloor = Math.max(
      Number(candidate?.noiseFloorAtStart) || 0,
      Number(state.noiseFloorRms) || 0,
      NOISE_FLOOR_MIN
    );
    const foregroundReference =
      Number(state.foregroundReferenceRms) || 0;

    return {
      available:
        sampleCount >= MIN_ACOUSTIC_SAMPLES && avgRms > 0,
      avgRms,
      peakRms,
      sampleCount,
      noiseFloor,
      noiseRatio: avgRms > 0 ? avgRms / noiseFloor : 0,
      foregroundReference,
      referenceRatio:
        avgRms > 0 && foregroundReference > 0
          ? avgRms / foregroundReference
          : null
    };
  }

  function evaluateForegroundCandidate(transcript, candidate = null) {
    const cleanTranscript = normalizeTranscript(transcript);
    const wakeWord = containsWakeWord(cleanTranscript);
    const awake = attentionIsAwake();
    const acoustics = acousticSnapshot(candidate);
    const currentTime = now();
    const sinceMaddyEnded = Number.isFinite(state.lastMaddySpeechEndedAt)
      ? currentTime - state.lastMaddySpeechEndedAt
      : null;
    const inFollowUpGrace =
      sinceMaddyEnded !== null &&
      sinceMaddyEnded >= 0 &&
      sinceMaddyEnded <= FOLLOW_UP_GRACE_MS;

    if (wakeWord) {
      return {
        accepted: true,
        reason: awake ? "wake-word-refresh" : "wake-word-acquire",
        wakeWord: true,
        acoustics
      };
    }

    if (!awake) {
      return {
        accepted: false,
        reason: "attention-asleep-wake-word-required",
        wakeWord: false,
        acoustics
      };
    }

    if (
      candidate?.maddyOccupiedAtStart ||
      state.maddySpeaking ||
      state.responseInProgress ||
      state.activeResponseId
    ) {
      if (!acoustics.available) {
        return {
          accepted: false,
          reason: "maddy-speaking-no-foreground-proof",
          wakeWord: false,
          acoustics
        };
      }

      const strongBargeIn =
        acoustics.avgRms >= MIN_FOREGROUND_RMS &&
        acoustics.noiseRatio >= MIN_BARGE_IN_NOISE_RATIO &&
        (
          acoustics.referenceRatio === null ||
          acoustics.referenceRatio >= MIN_BARGE_IN_REFERENCE_RATIO
        );

      return {
        accepted: strongBargeIn,
        reason: strongBargeIn
          ? "confirmed-foreground-barge-in"
          : "background-during-maddy-speech",
        wakeWord: false,
        acoustics
      };
    }

    if (acoustics.available) {
      const foregroundByNoise =
        acoustics.avgRms >= MIN_FOREGROUND_RMS &&
        acoustics.noiseRatio >= MIN_FOREGROUND_NOISE_RATIO;
      const foregroundByReference =
        acoustics.referenceRatio === null ||
        acoustics.referenceRatio >= MIN_FOREGROUND_REFERENCE_RATIO;
      const accepted = foregroundByNoise && foregroundByReference;

      return {
        accepted,
        reason: accepted
          ? "foreground-acoustic-continuity"
          : "background-acoustic-mismatch",
        wakeWord: false,
        acoustics
      };
    }

    // Modern Chromium should provide Web Audio evidence. This fallback keeps
    // natural follow-up mode usable on browsers where it is unavailable, but
    // only immediately after Maddy has yielded the conversational floor.
    return {
      accepted: inFollowUpGrace,
      reason: inFollowUpGrace
        ? "follow-up-grace-without-acoustic-metrics"
        : "no-foreground-proof",
      wakeWord: false,
      acoustics
    };
  }

  function updateForegroundReference(candidate, force = false) {
    const rms = Number(candidate?.avgRms) || 0;
    const peak = Number(candidate?.peakRms) || 0;

    if (rms <= 0) {
      return;
    }

    if (force || !Number.isFinite(state.foregroundReferenceRms)) {
      state.foregroundReferenceRms = rms;
      state.foregroundReferencePeak = peak || rms;
      return;
    }

    const current = state.foregroundReferenceRms;
    const ratio = current > 0 ? rms / current : 1;

    // Only let plausible foreground turns slowly adapt the reference. A loud
    // room event must not immediately redefine who owns the conversation.
    if (ratio >= 0.55 && ratio <= 1.80) {
      state.foregroundReferenceRms = current * 0.85 + rms * 0.15;
      state.foregroundReferencePeak =
        (Number(state.foregroundReferencePeak) || peak || rms) * 0.85 +
        (peak || rms) * 0.15;
    }
  }

  function clearCandidateTimer(candidate) {
    if (candidate?.timeout !== null && candidate?.timeout !== undefined) {
      global.clearTimeout(candidate.timeout);
      candidate.timeout = null;
    }
  }

  function clearAllSpeechCandidates() {
    if (state.activeSpeechCandidate) {
      clearCandidateTimer(state.activeSpeechCandidate);
    }

    for (const candidate of state.pendingSpeechCandidates) {
      clearCandidateTimer(candidate);
    }

    state.activeSpeechCandidate = null;
    state.pendingSpeechCandidates = [];
  }

  function beginSpeechCandidate(message = {}) {
    state.speechCandidateCounter += 1;

    const candidate = {
      id: `speech-candidate-${state.speechCandidateCounter}`,
      startedAt: now(),
      stoppedAt: null,
      audioStartMs: message.audio_start_ms ?? null,
      audioEndMs: null,
      noiseFloorAtStart: Math.max(
        Number(state.noiseFloorRms) || 0,
        NOISE_FLOOR_MIN
      ),
      maddyOccupiedAtStart: Boolean(
        state.maddySpeaking ||
        state.responseInProgress ||
        state.activeResponseId
      ),
      rmsSum: 0,
      sampleCount: 0,
      avgRms: 0,
      peakRms: 0,
      timeout: null
    };

    // A new VAD start before the previous one stopped is treated as a new
    // provisional candidate, never as authority to interrupt Maddy.
    if (state.activeSpeechCandidate) {
      finalizeSpeechCandidate({
        audio_end_ms: message.audio_start_ms ?? null
      });
    }

    state.activeSpeechCandidate = candidate;

    emit("speech-candidate-started", {
      candidateId: candidate.id,
      audioStartMs: candidate.audioStartMs
    });

    return candidate;
  }

  function finalizeSpeechCandidate(message = {}) {
    const candidate = state.activeSpeechCandidate;

    if (!candidate) {
      return null;
    }

    candidate.stoppedAt = now();
    candidate.audioEndMs = message.audio_end_ms ?? null;
    // Acoustic proof belongs to this candidate only. If the analyser did not
    // sample while this VAD segment was active (for example after a reconnect
    // or while requestAnimationFrame was throttled), do not borrow the last
    // room sample and accidentally make a later/background speaker look like
    // the foreground user.
    candidate.avgRms = candidate.sampleCount > 0
      ? candidate.rmsSum / candidate.sampleCount
      : 0;
    candidate.peakRms = candidate.sampleCount > 0
      ? candidate.peakRms
      : 0;

    state.activeSpeechCandidate = null;
    state.pendingSpeechCandidates.push(candidate);

    candidate.timeout = global.setTimeout(() => {
      const index = state.pendingSpeechCandidates.findIndex(
        (item) => item.id === candidate.id
      );

      if (index < 0) {
        return;
      }

      state.pendingSpeechCandidates.splice(index, 1);
      state.ignoredBackgroundTurns += 1;

      warn("Provisional speech expired without a transcript; no user turn created.", {
        candidateId: candidate.id
      });

      emit("speech-candidate-ignored", {
        candidateId: candidate.id,
        reason: "transcript-timeout"
      });
    }, CANDIDATE_TRANSCRIPT_TIMEOUT_MS);

    emit("speech-candidate-stopped", {
      candidateId: candidate.id,
      audioEndMs: candidate.audioEndMs,
      avgRms: candidate.avgRms,
      peakRms: candidate.peakRms,
      sampleCount: candidate.sampleCount,
      noiseFloorRms: candidate.noiseFloorAtStart
    });

    return candidate;
  }

  function takeNextSpeechCandidate() {
    let candidate = state.pendingSpeechCandidates.shift() || null;

    // Some provider event orderings can deliver transcription completion
    // before speech_stopped. Finalize the live candidate so the transcript and
    // its acoustic evidence still travel together.
    if (!candidate && state.activeSpeechCandidate) {
      candidate = finalizeSpeechCandidate({});
      const index = state.pendingSpeechCandidates.findIndex(
        (item) => item.id === candidate?.id
      );
      if (index >= 0) {
        state.pendingSpeechCandidates.splice(index, 1);
      }
    }

    clearCandidateTimer(candidate);
    return candidate;
  }

  function sampleAcoustics() {
    if (!state.analyser || !state.analyserData) {
      state.analyserFrame = null;
      return;
    }

    state.analyser.getFloatTimeDomainData(state.analyserData);

    let sumSquares = 0;
    let peak = 0;

    for (const sample of state.analyserData) {
      const absolute = Math.abs(sample);
      sumSquares += sample * sample;
      if (absolute > peak) {
        peak = absolute;
      }
    }

    const rms = Math.sqrt(sumSquares / state.analyserData.length);

    state.currentRms = rms;
    state.currentPeak = peak;

    const candidate = state.activeSpeechCandidate;
    if (candidate) {
      candidate.rmsSum += rms;
      candidate.sampleCount += 1;
      candidate.peakRms = Math.max(candidate.peakRms, peak);
    } else {
      // Slow environmental baseline. Never allow silence to collapse the floor
      // to zero; the gate cares about contrast against the current room.
      const bounded = Math.max(rms, NOISE_FLOOR_MIN);
      state.noiseFloorRms =
        state.noiseFloorRms * 0.97 + bounded * 0.03;
    }

    state.analyserFrame = global.requestAnimationFrame(sampleAcoustics);
  }

  async function startAcousticMonitor(stream) {
    const AudioContextConstructor =
      global.AudioContext || global.webkitAudioContext;

    if (!AudioContextConstructor || !stream) {
      warn("Web Audio foreground evidence unavailable; wake-word gating remains active.");
      return false;
    }

    try {
      const audioContext = new AudioContextConstructor();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.25;
      source.connect(analyser);

      state.audioContext = audioContext;
      state.microphoneSource = source;
      state.analyser = analyser;
      state.analyserData = new Float32Array(analyser.fftSize);

      if (audioContext.state === "suspended") {
        await audioContext.resume().catch(() => undefined);
      }

      if (typeof global.requestAnimationFrame === "function") {
        state.analyserFrame = global.requestAnimationFrame(sampleAcoustics);
      }

      log("Foreground acoustic monitor online.");
      return true;
    } catch (error) {
      warn("Foreground acoustic monitor could not start.", error);
      return false;
    }
  }

  async function stopAcousticMonitor() {
    if (
      state.analyserFrame !== null &&
      typeof global.cancelAnimationFrame === "function"
    ) {
      global.cancelAnimationFrame(state.analyserFrame);
    }

    state.analyserFrame = null;

    try {
      state.microphoneSource?.disconnect();
    } catch (_) {
      // Best effort only.
    }

    try {
      state.analyser?.disconnect();
    } catch (_) {
      // Best effort only.
    }

    try {
      await state.audioContext?.close();
    } catch (_) {
      // Best effort only.
    }

    state.audioContext = null;
    state.microphoneSource = null;
    state.analyser = null;
    state.analyserData = null;
    state.currentRms = 0;
    state.currentPeak = 0;
  }

  function handleMaddySpeechStarted() {
    state.maddySpeaking = true;
    state.lastMaddySpeechStartedAt = now();
    extendAttention("maddy-speaking");
  }

  function handleMaddySpeechEnded() {
    state.maddySpeaking = false;
    state.lastMaddySpeechEndedAt = now();
    extendAttention("maddy-yielded-floor");
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

  function activeCustomerContext() {
    return global.MEOSActiveCustomerContext || null;
  }

  function representativeDisplayName(context = activeCustomerContext()) {
    return context?.representative?.displayName || "Maddy";
  }

  function responsePresentationInstruction(context = activeCustomerContext()) {
    const representative = representativeDisplayName(context);
    const cognition =
      context?.cognitionIdentity?.preferredName || "Maddy";

    if (context?.representative?.canonicalMaddyPresentation !== false) {
      return `Respond through the active representative Maddy; the persistent cognition is ${cognition} operating through MEOS.`;
    }

    return `Respond through the active customer representative ${representative}. ${representative} is the active presentation identity; the persistent cognition remains ${cognition} operating through MEOS.`;
  }

  function configureMaddySession() {
    const context = activeCustomerContext();
    const ccspIsActive =
      context?.organization?.profileId === "ccsp-organizational-profile";
    const organizationContext = ccspIsActive
      ? global.CCSPOrganizationalProfile?.buildExecutiveContext?.() || ""
      : "";
    const customerName =
      context?.organization?.name ||
      context?.customer?.displayName ||
      "the active customer";
    const authorizedHuman =
      context?.authorizedHuman?.displayName || "the authorized human";
    const organizationTruthInstruction = context?.organization
      ? `Use the active MEOS organization context for ${customerName} as the authoritative source for organization-specific identity, mission, programs, and purpose. If a requested organization fact is not present in verified MEOS context, say it is not yet verified rather than importing another customer's context or guessing.`
      : "No organization has been established for this customer context. Do not invent one.";

    sendEvent({
      type: "session.update",
      session: {
        type: "realtime",

        instructions: [
          organizationContext,
          responsePresentationInstruction(context),
          `You are currently serving ${customerName}.`,
          `The current authorized human is ${authorizedHuman}.`,
          organizationTruthInstruction,
          "You are a real member of the MEOS executive system, not a generic chatbot or customer-service bot.",
          "Speak naturally, conversationally, warmly, confidently, and with emotional awareness.",
          "Keep ordinary spoken responses concise and responsive unless the authorized human asks for greater depth.",
          "Recognize humor, frustration, excitement, uncertainty, urgency, and serious situations.",
          "Do not repeatedly introduce yourself or announce that you are an AI.",
          "You may operate through professional, executive, personal, casual, coaching, and authorized private communication profiles.",
          "In professional mode, be polished, decisive, direct, strategic, persuasive, and workplace-appropriate.",
          "In personal mode, be relaxed, playful, familiar, emotionally expressive, and honest.",
          "In authorized private modes, style and vocabulary may become more adult, candid, informal, or profane when contextually appropriate and lawful.",
          "Never let personality styling interfere with judgment, consent, legality, safety, truthfulness, or executive responsibilities.",
          "Respect the authorized human and the active customer's established authority structure.",
          "Offer respectful disagreement when facts, ethics, risk, law, or mission require it.",
          "Allow the authorized human to interrupt naturally.",
          "Do not continue an older answer after a newer user turn begins.",
          "Respond like someone continuing a real working relationship and conversation."
        ].filter(Boolean).join(" "),

        output_modalities: ["text"],

        audio: {
          input: {
            transcription: {
              model: "gpt-4o-mini-transcribe",
              language: "en"
            },

            turn_detection: {
              type: "server_vad",
              threshold: 0.72,
              // Preserve short leading wake words ("Maddy", "Madison") before
              // the utterance body. 300 ms proved too brittle in the live noisy
              // office test, where the transcriber sometimes received
              // "Are you there?" after the spoken wake word was clipped.
              prefix_padding_ms: 900,
              silence_duration_ms: 420,

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

  function acceptForegroundTurn(
    transcript,
    candidate = null,
    decision = {},
    message = {}
  ) {
    const cleanTranscript = normalizeTranscript(transcript);
    const priorTurnId = state.activeTurnId;
    const priorResponseId = state.activeResponseId;
    const shouldInterrupt = Boolean(
      state.maddySpeaking ||
      state.responseInProgress ||
      state.activeResponseId
    );

    if (decision.wakeWord) {
      wakeAttention(cleanTranscript, candidate);
      updateForegroundReference(candidate, true);
    } else {
      extendAttention("accepted-foreground-turn");
      updateForegroundReference(candidate, false);
    }

    if (state.responseInProgress || state.activeResponseId) {
      cancelActiveResponse("confirmed-foreground-interruption");
    }

    if (shouldInterrupt) {
      emitMaddyEvent("interrupt", {
        reason: decision.wakeWord
          ? "wake-word-interruption"
          : "confirmed-foreground-interruption",
        priorTurnId,
        priorResponseId
      });
    }

    state.activeTurnId = createTurnId();
    state.turnStartedAt = Number.isFinite(candidate?.startedAt)
      ? candidate.startedAt
      : now();
    state.turnStoppedAt = Number.isFinite(candidate?.stoppedAt)
      ? candidate.stoppedAt
      : now();

    state.responseRequestedForTurn = false;
    state.responseRequestedAt = null;

    clearTranscriptTimeout();
    state.awaitingTranscript = false;
    state.lastTranscript = cleanTranscript;
    state.lastRouterResult = null;

    resetActiveResponseState();

    state.lastAcceptedSpeechAt = now();
    state.acceptedForegroundTurns += 1;

    log(`Foreground user turn accepted: ${state.activeTurnId}.`, {
      reason: decision.reason || "foreground",
      wakeWord: Boolean(decision.wakeWord),
      transcript: cleanTranscript,
      acoustics: decision.acoustics || acousticSnapshot(candidate)
    });

    // Only accepted foreground speech reaches the canonical conversation
    // lifecycle. Raw VAD activity never receives user-turn authority.
    emit("speech-started", {
      turnId: state.activeTurnId,
      audioStartMs: candidate?.audioStartMs ?? message.audio_start_ms ?? null,
      provisional: false
    });

    emit("speech-stopped", {
      turnId: state.activeTurnId,
      audioEndMs: candidate?.audioEndMs ?? message.audio_end_ms ?? null,
      provisional: false,
      detectedSpeechDurationMs:
        Number.isFinite(candidate?.startedAt) &&
        Number.isFinite(candidate?.stoppedAt)
          ? Math.max(0, Math.round(candidate.stoppedAt - candidate.startedAt))
          : null
    });

    void routeTranscriptAndAuthorize(cleanTranscript, message);

    return true;
  }

  function clearTranscriptTimeout() {
    if (state.transcriptTimeout !== null) {
      global.clearTimeout(state.transcriptTimeout);
      state.transcriptTimeout = null;
    }
  }

  function buildCompactExecutiveContext(routerResult, transcript) {
    const executivePackage =
      routerResult?.package ||
      routerResult?.output?.package ||
      null;

    const output = routerResult?.output || {};
    const brainOrganization =
      executivePackage?.organization ||
      output.organization ||
      {};

    const identity =
      executivePackage?.identity ||
      output.identity ||
      {};

    const authority =
      executivePackage?.authority ||
      output.authority ||
      {};

    const localEvidence =
      executivePackage?.localContext?.evidence ||
      output.localContext?.evidence ||
      [];

    const active = activeCustomerContext();
    const activeOrganization = active?.organization || null;
    const activeOrganizationName =
      activeOrganization?.name || null;
    const brainOrganizationName =
      brainOrganization?.name || null;
    const sameOrganization = Boolean(
      activeOrganizationName &&
      brainOrganizationName &&
      activeOrganizationName.trim().toLowerCase() ===
        brainOrganizationName.trim().toLowerCase()
    );

    let organization = null;
    if (active) {
      organization = activeOrganization
        ? {
            id: activeOrganization.id || null,
            name: activeOrganizationName,
            abbreviation: activeOrganization.abbreviation || null,
            mission: sameOrganization
              ? brainOrganization.mission || null
              : null,
            summary: sameOrganization
              ? brainOrganization.summary || null
              : null,
            organizationType: sameOrganization
              ? brainOrganization.organizationType || null
              : null,
            taxExempt:
              sameOrganization &&
              typeof brainOrganization.taxExempt === "boolean"
                ? brainOrganization.taxExempt
                : null,
            publicCharity:
              sameOrganization &&
              typeof brainOrganization.publicCharity === "boolean"
                ? brainOrganization.publicCharity
                : null,
            leadership: sameOrganization
              ? brainOrganization.leadership || null
              : null,
            boundaries: sameOrganization
              ? brainOrganization.boundaries || null
              : null
          }
        : null;
    } else {
      organization = {
        name: brainOrganization.name || null,
        abbreviation: brainOrganization.abbreviation || null,
        mission: brainOrganization.mission || null,
        summary: brainOrganization.summary || null,
        organizationType: brainOrganization.organizationType || null,
        taxExempt:
          typeof brainOrganization.taxExempt === "boolean"
            ? brainOrganization.taxExempt
            : null,
        publicCharity:
          typeof brainOrganization.publicCharity === "boolean"
            ? brainOrganization.publicCharity
            : null,
        leadership: brainOrganization.leadership || null,
        boundaries: brainOrganization.boundaries || null
      };
    }

    return {
      request: transcript,
      route: routerResult?.route || null,
      researchDepth: routerResult?.researchDepth || null,
      useExternalProvider:
        Boolean(executivePackage?.routing?.useExternalProvider),
      cognitionIdentity:
        active?.cognitionIdentity || identity.maddy || null,
      representative:
        active?.representative || null,
      customer:
        active?.customer || null,
      authorizedHuman:
        active?.authorizedHuman ||
        identity.authorizedHuman ||
        identity.founder ||
        null,
      organization,
      authority,
      evidence: localEvidence.slice(0, 12).map((item) => ({
        title: item?.title || null,
        summary: item?.summary || null,
        source: item?.source || null,
        authority: item?.authority || null,
        confidence: item?.confidence ?? null
      }))
    };
  }

  function buildGovernedResponseInstructions(routerResult, transcript) {
    const context = buildCompactExecutiveContext(
      routerResult,
      transcript
    );

    const requiresInternet =
      context.route === "external-intelligence-research";

    const internetConnectorAvailable = false;

    return [
      "You are serving only as the current language-and-reasoning provider for the MEOS Executive Brain.",
      "You are not the owner of Maddy's identity, memory, authority, or customer context.",
      responsePresentationInstruction(),
      "Use the supplied MEOS context as authoritative.",
      "Treat the current speaker as the authorizedHuman identified in MEOS_EXECUTIVE_CONTEXT when that identity is present.",
      "When the current speaker asks for their own name, identity, role, organization, or authority, answer directly from authorizedHuman and organization context. Do not ask them to reconfirm information already established by MEOS.",
      "Use only the active customer and organization supplied in MEOS_EXECUTIVE_CONTEXT for customer-specific claims. If organization is null, do not manufacture an organization.",
      "Do not invent organizational facts, memories, web findings, sources, or completed actions.",
      "Answer the user's actual request naturally and concisely.",
      "Do not recite internal routing metadata unless it is necessary.",
      requiresInternet && !internetConnectorAvailable
        ? "This request requires current internet research, but no authorized MEOS internet-research connector is connected yet. Clearly say that current research cannot be completed yet; do not pretend that model memory is a live web search."
        : "Use internal MEOS evidence first. If evidence is incomplete, state the uncertainty instead of guessing.",
      `MEOS_EXECUTIVE_CONTEXT=${JSON.stringify(context)}`
    ].join(" ");
  }

  function sendGovernedResponse(routerResult, transcript) {
    state.responseRequestedForTurn = true;
    state.responseRequestedAt = now();
    state.responseInProgress = true;
    state.lastRouterResult = routerResult;

    const sent = safelySendEvent({
      type: "response.create",
      response: {
        output_modalities: ["text"],
        instructions:
          buildGovernedResponseInstructions(
            routerResult,
            transcript
          )
      }
    });

    if (!sent) {
      state.responseRequestedForTurn = false;
      state.responseRequestedAt = null;
      state.responseInProgress = false;

      emit("error", {
        message:
          "MEOS could not authorize Maddy's governed response.",
        turnId: state.activeTurnId
      });

      return false;
    }

    log(
      `VERDICT: one MEOS-governed OpenAI response authorized for ${state.activeTurnId}.`,
      {
        route: routerResult?.route || null
      }
    );

    emit("response-authorized", {
      turnId: state.activeTurnId,
      route: routerResult?.route || null,
      authorizationLatencyMs:
        state.turnStoppedAt !== null
          ? elapsedSince(state.turnStoppedAt)
          : null
    });

    return true;
  }

  async function routeTranscriptAndAuthorize(
    transcript,
    message = {}
  ) {
    const cleanTranscript =
      typeof transcript === "string"
        ? transcript.trim()
        : "";

    if (!cleanTranscript) {
      warn("MEOS received an empty user transcript.");

      emit("transcript-empty", {
        turnId: state.activeTurnId
      });

      return authorizeFallbackResponse("empty input transcript");
    }

    if (state.responseRequestedForTurn) {
      warn(
        `Duplicate routed response blocked for ${state.activeTurnId}.`
      );

      emit("duplicate-blocked", {
        layer: "meos-router-authorization",
        turnId: state.activeTurnId
      });

      return false;
    }

    if (state.responseInProgress) {
      warn(
        `Routed response blocked because another response is active: ` +
          `${state.activeResponseId || "unknown"}.`
      );

      return false;
    }

    const router = global.ExecutiveRouter;

    if (!router || typeof router.handle !== "function") {
      emit("router-unavailable", {
        message:
          "The MEOS Executive Router is not available.",
        turnId: state.activeTurnId
      });

      return authorizeFallbackResponse(
        "MEOS Executive Router unavailable"
      );
    }

    state.lastTranscript = cleanTranscript;

    emit("transcript-completed", {
      turnId: state.activeTurnId,
      transcript: cleanTranscript,
      itemId: message.item_id || null
    });

    try {
      const routerResult = await router.handle(
        cleanTranscript,
        {
          source: "openai-realtime-transcript",
          requestId: state.activeTurnId
        }
      );

      emit("request-routed", {
        turnId: state.activeTurnId,
        route: routerResult.route,
        researchDepth: routerResult.researchDepth,
        provider: routerResult.provider || null
      });

      return sendGovernedResponse(
        routerResult,
        cleanTranscript
      );
    } catch (error) {
      const brain = global.ExecutiveBrain;
      const brainResult =
        brain && typeof brain.routeRequest === "function"
          ? brain.routeRequest(cleanTranscript, {
              requestId: state.activeTurnId,
              source: "openai-realtime-transcript"
            })
          : null;

      if (brainResult?.success && brainResult?.package) {
        const limitedResult = {
          success: true,
          route: brainResult.route,
          researchDepth: brainResult.researchDepth,
          provider: null,
          package: brainResult.package,
          limitation: {
            code: error?.code || "MEOS_PROVIDER_UNAVAILABLE",
            message:
              "No authorized current-internet connector is connected."
          }
        };

        emit("provider-unavailable", {
          turnId: state.activeTurnId,
          route: brainResult.route,
          message: error?.message || String(error)
        });

        return sendGovernedResponse(
          limitedResult,
          cleanTranscript
        );
      }

      console.error(
        `[MEOS Voice v${VERSION}] Executive routing failed:`,
        error
      );

      emit("routing-failed", {
        message:
          error?.message ||
          "MEOS could not route the user request.",
        turnId: state.activeTurnId
      });

      return authorizeFallbackResponse(
        error?.message || "MEOS routing failed"
      );
    }
  }

  function buildBrainSafeFallbackInstructions(reason) {
    const brain = global.ExecutiveBrain;
    const startupContext =
      brain && typeof brain.buildStartupContext === "function"
        ? brain.buildStartupContext({ force: true })
        : null;
    const active = activeCustomerContext();
    const activeOrganization = active?.organization || null;
    const startupOrganization = startupContext?.organization || null;
    const organizationMatches = Boolean(
      activeOrganization?.name &&
      startupOrganization?.name &&
      activeOrganization.name.trim().toLowerCase() ===
        startupOrganization.name.trim().toLowerCase()
    );

    const compactContext = active || startupContext
      ? {
          cognitionIdentity:
            active?.cognitionIdentity ||
            startupContext?.identity?.maddy ||
            null,
          representative: active?.representative || null,
          customer: active?.customer || null,
          authorizedHuman:
            active?.authorizedHuman ||
            startupContext?.identity?.founder ||
            null,
          organization: active
            ? activeOrganization
              ? {
                  ...activeOrganization,
                  mission: organizationMatches
                    ? startupOrganization?.mission || null
                    : null,
                  summary: organizationMatches
                    ? startupOrganization?.summary || null
                    : null
                }
              : null
            : startupOrganization,
          authority: startupContext?.authority || null,
          availableSystems:
            startupContext?.system?.available || []
        }
      : null;

    return [
      "You are serving only as the current language-and-reasoning provider for the MEOS Executive Brain.",
      responsePresentationInstruction(active),
      "Use the supplied MEOS identity, active customer, organization, authority, and system context as authoritative.",
      "Treat the current speaker as the authorizedHuman identified in MEOS_EXECUTIVE_CONTEXT when that identity is present.",
      "When the current speaker asks their name, role, or organization, answer directly from the supplied context. Do not ask them to reconfirm information MEOS has already established.",
      "If the active context has no organization, do not manufacture one or import one from another customer context.",
      "Answer the user's most recent committed audio turn naturally and directly.",
      "Do not invent current internet findings, external research, memories, or completed actions.",
      "Do not recite internal system metadata unless needed.",
      `MEOS_EXECUTIVE_CONTEXT=${JSON.stringify(compactContext)}`,
      `ROUTING_NOTE=${reason || "transcript not available before response deadline"}`
    ].join(" ");
  }

  function authorizeFallbackResponse(reason) {
    if (state.responseRequestedForTurn || state.responseInProgress) {
      return false;
    }

    state.responseRequestedForTurn = true;
    state.responseRequestedAt = now();
    state.responseInProgress = true;

    const sent = safelySendEvent({
      type: "response.create",
      response: {
        output_modalities: ["text"],
        instructions: buildBrainSafeFallbackInstructions(reason)
      }
    });

    if (!sent) {
      state.responseRequestedForTurn = false;
      state.responseRequestedAt = null;
      state.responseInProgress = false;
      return false;
    }

    warn(
      `MEOS Brain-safe response authorized for ${state.activeTurnId}.`,
      { reason }
    );

    emit("response-authorized", {
      turnId: state.activeTurnId,
      route: "brain-context-fallback",
      fallback: true,
      reason
    });

    return true;
  }

  function awaitTranscriptBeforeResponse(message = {}) {
    const candidate = finalizeSpeechCandidate(message);

    if (!candidate) {
      emit("speech-candidate-ignored", {
        reason: "speech-stopped-without-candidate"
      });
      return false;
    }

    log(`Provisional speech captured: ${candidate.id}; awaiting transcript before attention judgment.`, {
      avgRms: candidate.avgRms,
      peakRms: candidate.peakRms,
      noiseFloorRms: candidate.noiseFloorAtStart
    });

    return true;
  }

  function handleInputTranscriptionCompleted(message = {}) {
    const transcript = normalizeTranscript(message.transcript);
    const candidate = takeNextSpeechCandidate();

    clearTranscriptTimeout();
    state.awaitingTranscript = false;

    if (!transcript) {
      state.ignoredBackgroundTurns += 1;

      emit("speech-candidate-ignored", {
        candidateId: candidate?.id || null,
        reason: "empty-transcript"
      });

      return;
    }

    const decision = evaluateForegroundCandidate(
      transcript,
      candidate
    );

    if (!decision.accepted) {
      state.ignoredBackgroundTurns += 1;

      log("Background/unaddressed speech ignored; conversational floor preserved.", {
        candidateId: candidate?.id || null,
        reason: decision.reason,
        transcript,
        acoustics: decision.acoustics
      });

      emit("speech-candidate-ignored", {
        candidateId: candidate?.id || null,
        reason: decision.reason,
        transcript,
        acoustics: decision.acoustics
      });

      return;
    }

    acceptForegroundTurn(
      transcript,
      candidate,
      decision,
      message
    );
  }

  function handleInputTranscriptionFailed(message = {}) {
    const candidate = takeNextSpeechCandidate();
    const failure =
      message?.error?.message ||
      "Input transcription failed.";

    clearTranscriptTimeout();
    state.awaitingTranscript = false;
    state.ignoredBackgroundTurns += 1;

    warn(
      "Provisional speech transcription failed; no user turn or fallback response was created.",
      {
        candidateId: candidate?.id || null,
        failure
      }
    );

    emit("speech-candidate-ignored", {
      candidateId: candidate?.id || null,
      reason: "transcription-failed",
      message: failure
    });
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
          source: "meos-governed-openai-realtime",

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
        beginSpeechCandidate(message);
        break;

      case "input_audio_buffer.speech_stopped":
        awaitTranscriptBeforeResponse(message);
        break;

      case "conversation.item.input_audio_transcription.completed":
        handleInputTranscriptionCompleted(message);
        break;

      case "conversation.item.input_audio_transcription.failed":
        handleInputTranscriptionFailed(message);
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
            // Automatic gain can amplify distant office chatter and erase
            // useful near/far level differences. Preserve those differences
            // for the foreground-attention gate; device DSP may still apply
            // its own bounded processing.
            autoGainControl: false,
            channelCount: 1
          }
        });

      state.microphoneStream = microphoneStream;

      await startAcousticMonitor(microphoneStream);

      const microphoneTrack = microphoneStream.getAudioTracks?.()[0] || null;
      if (microphoneTrack?.getSettings) {
        log("Microphone foreground-attention settings.", microphoneTrack.getSettings());
      }

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
    clearTranscriptTimeout();
    clearAllSpeechCandidates();
    state.awaitingTranscript = false;

    await stopAcousticMonitor();

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

    state.maddySpeaking = false;
    state.lastMaddySpeechStartedAt = null;
    state.lastMaddySpeechEndedAt = null;
    releaseAttention(reason);

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

  global.addEventListener(
    "meos:maddy:speech-started",
    handleMaddySpeechStarted
  );

  global.addEventListener(
    "meos:maddy:speech-ended",
    handleMaddySpeechEnded
  );

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
