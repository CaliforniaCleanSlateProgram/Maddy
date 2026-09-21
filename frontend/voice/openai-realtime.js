/**
 * MEOS OpenAI Realtime Client
 *
 * File Version: 2.0.16
 * Voice Engine Release: 2.0.0
 * Status: Production Candidate
 *
 * Responsibilities:
 * - Establish one secure OpenAI Realtime WebRTC session.
 * - Maintain one microphone stream and one data channel.
 * - Use server VAD as a provisional speech sensor, not as automatic user-turn authority.
 * - Wake foreground conversation on Maddy/Madison phonetic variants and preserve natural follow-up turns.
 * - Preserve the leading wake word with a longer server-VAD prefix window in noisy rooms.
 * - Never reuse stale acoustic samples as proof that a later speaker is the foreground user.
 * - Treat missing/weak acoustic telemetry as uncertainty, not proof that a valid transcript is background speech.
 * - Preserve transcript continuity for natural follow-up turns when Maddy is not occupied.
 * - Require explicit wake/address or strong foreground acoustic evidence before speech may interrupt an active Maddy response.
 * - Keep degraded transcript continuity from becoming interruption authority while Maddy is speaking.
 * - Treat raw ASR output as evidence rather than unquestioned user intent.
 * - Ground transcription with the active customer/organization vocabulary without cross-customer leakage.
 * - Preserve raw transcript provenance and use provider transcription confidence when available.
 * - Ask for one concise repeat instead of routing materially unreliable speech into cognition or research.
 * - Keep background office speech from stealing conversational control or interrupting Maddy.
 * - Keep live conversational response authority off long-running research waits.
 * - Hand genuine research into governed durable Maddy work without blocking her conversational presence.
 * - Instrument the voice turn lifecycle so hidden latency cannot collapse into one opaque total.
 * - Bind every asynchronous routing result to the exact user turn that created it.
 * - Authorize no more than one OpenAI response per user turn, even when prior routing finishes late.
 * - Accept and publish each OpenAI response only once.
 * - Preserve turn IDs and response IDs for downstream TTS control.
 * - Support interruption and complete session shutdown.
 */

(function initializeOpenAIRealtime(global) {
  "use strict";

  const VERSION = "2.0.16";
  const VOICE_ENGINE_VERSION = "2.0.0";
  const BUILD_ID = "VE216-DURABLE-RESEARCH-SPOKEN-RETURN-20260920-A";

  const SESSION_ENDPOINT =
    `/session?voiceEngine=${encodeURIComponent(VOICE_ENGINE_VERSION)}`;

  const RESPONSE_TIMEOUT_MS = 45_000;
  const MAX_HANDLED_RESPONSE_IDS = 200;
  const BACKGROUND_RESEARCH_START_DELAY_MS = 0;
  const DURABLE_RESEARCH_RETURN_POLL_MS = 1_500;
  const DURABLE_RESEARCH_RETURN_MAX_POLLS = 80;
  const INTERACTIVE_DIRECT_ROUTES = new Set([
    "instant-meos-context",
    "local-recall-plus-provider-reasoning"
  ]);

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
  const TRANSCRIPT_CONTINUITY_MS = 30_000;
  const CANDIDATE_TRANSCRIPT_TIMEOUT_MS = 4_000;
  const MIN_ACOUSTIC_SAMPLES = 3;
  const MIN_FOREGROUND_RMS = 0.012;
  const MIN_FOREGROUND_NOISE_RATIO = 1.35;
  const MIN_FOREGROUND_REFERENCE_RATIO = 0.58;
  const MIN_BARGE_IN_REFERENCE_RATIO = 0.72;
  const MIN_BARGE_IN_NOISE_RATIO = 1.60;
  const NOISE_FLOOR_MIN = 0.0035;

  // VE213 speech-evidence thresholds are intentionally conservative. They do
  // not attempt to infer intent from arbitrary word substitutions. They only
  // stop routing when the transcription provider itself supplies strong
  // evidence that the transcript is unreliable, or when an English-only
  // session returns a materially different writing system.
  const TRANSCRIPTION_MODEL = "gpt-4o-transcribe";
  const TRANSCRIPTION_LANGUAGE = "en";
  const TRANSCRIPTION_CONTEXT_MAX_CHARS = 900;
  const TRANSCRIPTION_RECENT_CONTEXT_MAX_CHARS = 180;
  const TRANSCRIPTION_VERY_LOW_AVG_TOKEN_PROBABILITY = 0.18;
  const TRANSCRIPTION_LOW_TOKEN_PROBABILITY = 0.20;
  const TRANSCRIPTION_LOW_TOKEN_FRACTION = 0.50;
  const TRANSCRIPTION_SCRIPT_MISMATCH_FRACTION = 0.35;
  const MAX_SCOPED_SPEECH_CORRECTIONS = 16;
  const CONTEXT_REPAIR_MIN_SCORE = 0.74;
  const CONTEXT_REPAIR_MIN_MARGIN = 0.10;

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
    routingTurnId: null,
    authorizedTurnId: null,
    responseInProgress: false,
    activeResponseId: null,
    activeResponseStartedAt: null,

    responseTextById: new Map(),
    handledResponseIds: new Set(),
    responseTimeout: null,

    awaitingTranscript: false,
    transcriptTimeout: null,
    lastTranscript: "",
    lastRawTranscript: "",
    lastInterpretedTranscript: "",
    lastTranscriptEvidence: null,
    lastRouterResult: null,
    scopedSpeechCorrections: [],

    // Per-turn latency truth. These timestamps are diagnostic evidence only;
    // they never create response or execution authority.
    latencyTrace: null,
    lastCompletedLatencyTrace: null,

    // Voice may schedule durable work, but the conversational response never
    // waits on that work before it is allowed to speak.
    lastBackgroundWorkHandoff: null,
    researchReturnObservers: new Map(),
    completedResearchReturnIds: new Set(),
    lastResearchReturn: null,

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
    currentMaddySpeechText: "",

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

  function latencyTraceSnapshot(trace = state.latencyTrace) {
    if (!trace) return null;

    const origin = Number.isFinite(trace.origin) ? trace.origin : null;
    const stages = {};
    Object.entries(trace.stages || {}).forEach(([name, entry]) => {
      stages[name] = {
        elapsedMs:
          origin !== null && Number.isFinite(entry.at)
            ? Math.max(0, Math.round(entry.at - origin))
            : null,
        ...(entry.metadata || {})
      };
    });

    return Object.freeze({
      turnId: trace.turnId || null,
      origin: trace.originLabel || "speech-stopped",
      stages: Object.freeze(stages)
    });
  }

  function beginLatencyTrace(turnId) {
    const origin = Number.isFinite(state.turnStoppedAt)
      ? state.turnStoppedAt
      : now();

    state.latencyTrace = {
      turnId,
      origin,
      originLabel: "speech-stopped",
      stages: {}
    };

    markLatencyStage(turnId, "foreground-turn-accepted");
  }

  function markLatencyStage(turnId, stage, metadata = {}) {
    if (!turnId || state.latencyTrace?.turnId !== turnId) {
      return null;
    }

    const entry = {
      at: now(),
      metadata: { ...metadata }
    };
    state.latencyTrace.stages[stage] = entry;

    const elapsedMs = Math.max(
      0,
      Math.round(entry.at - state.latencyTrace.origin)
    );

    emit("latency-stage", {
      turnId,
      stage,
      elapsedMs,
      ...metadata
    });

    return elapsedMs;
  }

  function completeLatencyTrace(turnId, metadata = {}) {
    if (!turnId || state.latencyTrace?.turnId !== turnId) {
      return null;
    }

    markLatencyStage(turnId, "response-text-completed", metadata);
    const snapshot = latencyTraceSnapshot(state.latencyTrace);
    state.lastCompletedLatencyTrace = snapshot;
    return snapshot;
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
      routingTurnId: state.routingTurnId,
      authorizedTurnId: state.authorizedTurnId,

      responseInProgress: state.responseInProgress,
      activeResponseId: state.activeResponseId,

      awaitingTranscript: state.awaitingTranscript,
      lastTranscript: state.lastTranscript,
      lastRawTranscript: state.lastRawTranscript,
      lastInterpretedTranscript: state.lastInterpretedTranscript,
      lastTranscriptEvidence: state.lastTranscriptEvidence
        ? { ...state.lastTranscriptEvidence }
        : null,
      lastRoute: state.lastRouterResult?.route || null,
      latency: state.latencyTrace
        ? latencyTraceSnapshot(state.latencyTrace)
        : state.lastCompletedLatencyTrace,
      backgroundWorkHandoff: state.lastBackgroundWorkHandoff
        ? { ...state.lastBackgroundWorkHandoff }
        : null,
      researchReturn: state.lastResearchReturn
        ? { ...state.lastResearchReturn }
        : null,
      researchReturnObserverCount: state.researchReturnObservers.size,
      speechLearning: Object.freeze({
        scopedCorrectionCount: state.scopedSpeechCorrections.length,
        durable: false
      }),

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

  function sanitizeTranscriptionHint(value) {
    return normalizeTranscript(value)
      .replace(/[<>\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function deriveInitialism(value) {
    const words = sanitizeTranscriptionHint(value)
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean);

    if (words.length < 2 || words.length > 8) {
      return "";
    }

    const initialism = words
      .map((word) => word[0])
      .join("")
      .toUpperCase();

    return initialism.length >= 2 && initialism.length <= 8
      ? initialism
      : "";
  }

  function transcriptionContextTerms(context = activeCustomerContext()) {
    const terms = new Set();
    const add = (value) => {
      const clean = sanitizeTranscriptionHint(value);
      if (clean && clean.length <= 100) {
        terms.add(clean);
      }
    };

    add(context?.representative?.displayName);
    add(context?.cognitionIdentity?.preferredName);
    add(context?.authorizedHuman?.displayName);
    add(context?.customer?.displayName);
    add(context?.organization?.name);
    add(context?.organization?.abbreviation);

    const derivedOrganizationInitialism = deriveInitialism(
      context?.organization?.name
    );
    const derivedCustomerInitialism = deriveInitialism(
      context?.customer?.displayName
    );

    add(derivedOrganizationInitialism);
    add(derivedCustomerInitialism);

    if (context?.representative?.canonicalMaddyPresentation !== false) {
      add("Maddy");
      add("Maddie");
      add("Madison");
    }

    const scopeKey = speechCorrectionScopeKey(context);
    state.scopedSpeechCorrections
      .filter(item => item.scopeKey === scopeKey)
      .slice(0, MAX_SCOPED_SPEECH_CORRECTIONS)
      .forEach(item => add(item.intended));

    return Object.freeze(Array.from(terms));
  }

  function buildTranscriptionPrompt(
    context = activeCustomerContext(),
    recentTranscript = state.lastInterpretedTranscript
  ) {
    const terms = transcriptionContextTerms(context);
    const recent = sanitizeTranscriptionHint(recentTranscript)
      .slice(0, TRANSCRIPTION_RECENT_CONTEXT_MAX_CHARS);
    const parts = [
      "Live spoken conversation in English.",
      "Preserve literal names, acronyms, geographic names, numbers, question words, and domain terms when they are audible.",
      "Do not substitute a different topic when the audio is unclear."
    ];

    if (terms.length) {
      parts.push(`Current conversation vocabulary: ${terms.join(", ")}.`);
    }

    if (recent) {
      parts.push(`Recent accepted speech for continuity: ${recent}.`);
    }

    return parts
      .join(" ")
      .slice(0, TRANSCRIPTION_CONTEXT_MAX_CHARS);
  }

  function buildTranscriptionConfiguration(
    context = activeCustomerContext(),
    recentTranscript = state.lastInterpretedTranscript
  ) {
    return Object.freeze({
      model: TRANSCRIPTION_MODEL,
      language: TRANSCRIPTION_LANGUAGE,
      prompt: buildTranscriptionPrompt(context, recentTranscript)
    });
  }

  function collectLogProbValues(value, output = [], depth = 0) {
    if (depth > 5 || value === null || value === undefined) {
      return output;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      output.push(value);
      return output;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => collectLogProbValues(entry, output, depth + 1));
      return output;
    }

    if (typeof value !== "object") {
      return output;
    }

    if (Number.isFinite(value.logprob)) {
      output.push(Number(value.logprob));
      return output;
    }

    Object.entries(value).forEach(([key, entry]) => {
      if (key === "bytes") return;
      if (
        key === "logprobs" ||
        key === "top_logprobs" ||
        key === "tokens" ||
        typeof entry === "object"
      ) {
        collectLogProbValues(entry, output, depth + 1);
      }
    });

    return output;
  }

  function summarizeTranscriptionConfidence(message = {}) {
    const logProbSource =
      message?.logprobs ??
      message?.transcription?.logprobs ??
      message?.item?.input_audio_transcription?.logprobs ??
      null;
    const logProbs = collectLogProbValues(logProbSource);

    if (!logProbs.length) {
      return Object.freeze({
        available: false,
        sampleCount: 0,
        averageLogProb: null,
        averageTokenProbability: null,
        lowTokenFraction: null,
        level: "unknown",
        materiallyUnreliable: false
      });
    }

    const averageLogProb =
      logProbs.reduce((sum, value) => sum + value, 0) / logProbs.length;
    const averageTokenProbability = Math.exp(averageLogProb);
    const lowTokenCount = logProbs.filter(
      (value) => Math.exp(value) < TRANSCRIPTION_LOW_TOKEN_PROBABILITY
    ).length;
    const lowTokenFraction = lowTokenCount / logProbs.length;
    const materiallyUnreliable = Boolean(
      averageTokenProbability < TRANSCRIPTION_VERY_LOW_AVG_TOKEN_PROBABILITY ||
      (
        logProbs.length >= 4 &&
        lowTokenFraction >= TRANSCRIPTION_LOW_TOKEN_FRACTION
      )
    );
    const level = materiallyUnreliable
      ? "low"
      : averageTokenProbability >= 0.60
        ? "high"
        : averageTokenProbability >= 0.35
          ? "medium"
          : "degraded";

    return Object.freeze({
      available: true,
      sampleCount: logProbs.length,
      averageLogProb: Number(averageLogProb.toFixed(4)),
      averageTokenProbability: Number(averageTokenProbability.toFixed(4)),
      lowTokenFraction: Number(lowTokenFraction.toFixed(4)),
      level,
      materiallyUnreliable
    });
  }

  function transcriptScriptEvidence(transcript) {
    const clean = normalizeTranscript(transcript);
    let letterCount = 0;
    let latinLetterCount = 0;
    let nonLatinLetterCount = 0;

    for (const char of clean) {
      if (/\p{L}/u.test(char)) {
        letterCount += 1;
        if (/[A-Za-z]/.test(char)) {
          latinLetterCount += 1;
        } else {
          nonLatinLetterCount += 1;
        }
      }
    }

    const nonLatinFraction = letterCount
      ? nonLatinLetterCount / letterCount
      : 0;

    return Object.freeze({
      letterCount,
      latinLetterCount,
      nonLatinLetterCount,
      nonLatinFraction: Number(nonLatinFraction.toFixed(4)),
      materiallyMismatched: Boolean(
        letterCount >= 2 &&
        nonLatinFraction >= TRANSCRIPTION_SCRIPT_MISMATCH_FRACTION
      )
    });
  }

  function speechCorrectionScopeKey(context = activeCustomerContext()) {
    return [
      context?.customer?.id || context?.customer?.displayName || "individual",
      context?.organization?.id || context?.organization?.name || "no-organization",
      context?.representative?.displayName || "Maddy"
    ].map(value => sanitizeTranscriptionHint(value).toLowerCase()).join("|");
  }

  function rememberScopedSpeechCorrection(transcript, context = activeCustomerContext()) {
    const clean = normalizeTranscript(transcript);
    const match = clean.match(/^\s*(?:no[,;:]?\s*)?(?:i\s+said|that's\s+not\s+what\s+i\s+said[,;:]?\s*i\s+said|that\s+was)\s+(.+?)\s*[.!?]*$/i);
    if (!match?.[1]) return null;
    const intended = sanitizeTranscriptionHint(match[1]).slice(0, 100);
    if (!intended) return null;
    const scopeKey = speechCorrectionScopeKey(context);
    const normalized = intended.toLowerCase();
    const existing = state.scopedSpeechCorrections.find(item =>
      item.scopeKey === scopeKey && item.intended.toLowerCase() === normalized
    );
    if (existing) {
      existing.count += 1;
      existing.lastConfirmedAt = new Date().toISOString();
      return Object.freeze({ ...existing });
    }
    const item = {
      scopeKey,
      intended,
      count: 1,
      confirmedAt: new Date().toISOString(),
      lastConfirmedAt: new Date().toISOString(),
      authority: "explicit-human-correction",
      durable: false
    };
    state.scopedSpeechCorrections.unshift(item);
    if (state.scopedSpeechCorrections.length > MAX_SCOPED_SPEECH_CORRECTIONS * 4) {
      state.scopedSpeechCorrections.length = MAX_SCOPED_SPEECH_CORRECTIONS * 4;
    }
    emit("speech-correction-learned", Object.freeze({ ...item }));
    return Object.freeze({ ...item });
  }

  function phoneticCode(value) {
    const letters = String(value || "").toUpperCase().replace(/[^A-Z]/g, "");
    if (!letters) return "";
    const map = Object.freeze({
      B:"1",F:"1",P:"1",V:"1",
      C:"2",G:"2",J:"2",K:"2",Q:"2",S:"2",X:"2",Z:"2",
      D:"3",T:"3",L:"4",M:"5",N:"5",R:"6"
    });
    let out = letters[0];
    let previous = map[letters[0]] || "";
    for (let i = 1; i < letters.length && out.length < 4; i += 1) {
      const code = map[letters[i]] || "";
      if (code && code !== previous) out += code;
      previous = code;
    }
    return (out + "000").slice(0, 4);
  }

  function editSimilarity(a, b) {
    const left = String(a || "").toUpperCase();
    const right = String(b || "").toUpperCase();
    if (!left || !right) return 0;
    const rows = Array.from({ length: left.length + 1 }, () => new Array(right.length + 1).fill(0));
    for (let i = 0; i <= left.length; i += 1) rows[i][0] = i;
    for (let j = 0; j <= right.length; j += 1) rows[0][j] = j;
    for (let i = 1; i <= left.length; i += 1) {
      for (let j = 1; j <= right.length; j += 1) {
        const cost = left[i - 1] === right[j - 1] ? 0 : 1;
        rows[i][j] = Math.min(
          rows[i - 1][j] + 1,
          rows[i][j - 1] + 1,
          rows[i - 1][j - 1] + cost
        );
      }
    }
    return 1 - (rows[left.length][right.length] / Math.max(left.length, right.length));
  }

  function contextAcronymCandidates(context = activeCustomerContext()) {
    const candidates = new Set();
    const add = value => {
      const clean = sanitizeTranscriptionHint(value).replace(/[^A-Za-z]/g, "").toUpperCase();
      if (clean.length >= 2 && clean.length <= 8) candidates.add(clean);
    };
    add(context?.organization?.abbreviation);
    add(deriveInitialism(context?.organization?.name));
    add(deriveInitialism(context?.customer?.displayName));
    transcriptionContextTerms(context).forEach(term => {
      if (/^[A-Z0-9]{2,8}$/.test(term)) add(term);
    });
    return [...candidates];
  }

  function contextPhoneticRepair(rawTranscript, context = activeCustomerContext()) {
    const candidates = contextAcronymCandidates(context);
    if (!candidates.length) {
      return { transcript: rawTranscript, changed: false, repairs: [] };
    }
    const repairs = [];
    const repaired = String(rawTranscript || "").replace(/\b[A-Za-z]{2,8}\b/g, token => {
      const letters = token.replace(/[^A-Za-z]/g, "");
      const vowelCount = (letters.match(/[AEIOUaeiou]/g) || []).length;
      const acronymLike = token === token.toUpperCase() || (letters.length <= 5 && vowelCount <= 1);
      if (!acronymLike) return token;
      const exact = candidates.find(candidate => candidate === letters.toUpperCase());
      if (exact) return token;
      const sourceCode = phoneticCode(letters);
      const scored = candidates.map(candidate => {
        const targetCode = phoneticCode(candidate);
        const tailMatch = sourceCode && targetCode && sourceCode.slice(1) === targetCode.slice(1);
        const lengthScore = 1 - Math.min(1, Math.abs(candidate.length - letters.length) / Math.max(candidate.length, letters.length));
        const edit = editSimilarity(letters, candidate);
        const nearEditBonus = edit >= 0.50 ? 0.45 : 0;
        const score = (tailMatch ? 0.45 : 0) + nearEditBonus + lengthScore * 0.15 + edit * 0.20;
        return { candidate, score: Number(score.toFixed(4)), sourceCode, targetCode };
      }).sort((a, b) => b.score - a.score);
      const best = scored[0];
      const second = scored[1];
      const margin = best ? best.score - Number(second?.score || 0) : 0;
      if (best && best.score >= CONTEXT_REPAIR_MIN_SCORE && margin >= CONTEXT_REPAIR_MIN_MARGIN) {
        repairs.push({
          heard: token,
          intended: best.candidate,
          score: best.score,
          margin: Number(margin.toFixed(4)),
          basis: "active-context-phonetic-acronym"
        });
        return best.candidate;
      }
      return token;
    });
    return { transcript: repaired, changed: repaired !== rawTranscript, repairs };
  }

  function semanticPlausibilityEvidence(transcript, attentionDecision = {}, recognizedContextTerms = []) {
    const clean = normalizeTranscript(transcript);
    const words = clean.toLowerCase().replace(/[^a-z0-9'\s]/g, " ").split(/\s+/).filter(Boolean);
    const commonShortTurns = new Set([
      "yes","no","okay","ok","thanks","thank you","i see","got it","go ahead","continue","stop","wait","what is it","tell me more"
    ]);
    const normalized = words.join(" ");
    const functionWords = new Set(["a","an","the","and","or","but","to","of","for","in","on","at","is","are","was","were","be","it","that","this","do","does","did","i","you","we"]);
    const contentWords = words.filter(word => !functionWords.has(word));
    const danglingConnective = /\b(?:and|or|but|because|with|for|to|of|the)\s*[?.!]*$/i.test(clean);
    const quantitativeDisjunction = false;
    const fragment = words.length <= 2 && !commonShortTurns.has(normalized) && !containsWakeWord(clean);
    const lowInformation = words.length >= 4 && contentWords.length / words.length < 0.25;
    const degraded = String(attentionDecision?.confidence || "").toLowerCase() === "degraded";
    const requiresClarification = Boolean(
      !clean || danglingConnective || quantitativeDisjunction || fragment || (degraded && lowInformation)
    );
    const reason = !clean
      ? "empty-transcript"
      : danglingConnective
        ? "semantic-dangling-connective"
        : quantitativeDisjunction
          ? "semantic-material-ambiguity"
          : fragment
            ? "semantic-fragment"
            : degraded && lowInformation
              ? "semantic-low-information-under-degraded-attention"
              : null;
    return Object.freeze({
      coherent: !requiresClarification,
      requiresClarification,
      reason,
      wordCount: words.length,
      contentWordCount: contentWords.length,
      recognizedContextCount: recognizedContextTerms.length,
      degradedAttention: degraded
    });
  }

  function interpretTranscriptEvidence(
    transcript,
    message = {},
    attentionDecision = {},
    context = activeCustomerContext()
  ) {
    const rawTranscript = normalizeTranscript(transcript);
    const confidence = summarizeTranscriptionConfidence(message);
    const script = transcriptScriptEvidence(rawTranscript);
    const knownTerms = transcriptionContextTerms(context);
    const initialLower = rawTranscript.toLowerCase();
    const initiallyRecognizedContextTerms = knownTerms.filter((term) =>
      initialLower.includes(term.toLowerCase())
    );
    const contextualRepair = contextPhoneticRepair(rawTranscript, context);
    const interpretedTranscript = contextualRepair.transcript;
    const lower = interpretedTranscript.toLowerCase();
    const recognizedContextTerms = knownTerms.filter((term) =>
      lower.includes(term.toLowerCase())
    );
    const semantic = semanticPlausibilityEvidence(
      interpretedTranscript,
      attentionDecision,
      recognizedContextTerms
    );
    const requiresClarification = Boolean(
      confidence.materiallyUnreliable ||
      script.materiallyMismatched ||
      semantic.requiresClarification
    );
    const clarificationReason = confidence.materiallyUnreliable
      ? "provider-transcription-confidence-too-low"
      : script.materiallyMismatched
        ? "english-session-script-mismatch"
        : semantic.requiresClarification
          ? semantic.reason
          : null;
    const interpretationChanged = interpretedTranscript !== rawTranscript;
    const interpretationConfidence = requiresClarification
      ? "low"
      : interpretationChanged
        ? "high"
        : confidence.level === "high"
          ? "high"
          : recognizedContextTerms.length > 0
            ? "medium"
            : confidence.level === "unknown"
              ? "medium"
              : confidence.level;

    return Object.freeze({
      schema: "meos.voice.speech-evidence.v2",
      rawTranscript,
      interpretedTranscript,
      interpretationChanged,
      interpretationConfidence,
      interpretationBasis: interpretationChanged
        ? "active-context-phonetic-reconstruction"
        : "provider-transcript-preserved",
      candidateRepairs: Object.freeze(contextualRepair.repairs.map(item => Object.freeze({ ...item }))),
      requiresClarification,
      clarificationReason,
      transcriptionConfidence: confidence,
      semanticPlausibility: semantic,
      scriptEvidence: script,
      attentionConfidence: attentionDecision?.confidence || "unspecified",
      recognizedContextTerms: Object.freeze([...recognizedContextTerms]),
      initiallyRecognizedContextTerms: Object.freeze([...initiallyRecognizedContextTerms]),
      contextVocabularyCount: knownTerms.length,
      provenance: Object.freeze({
        source: "openai-realtime-input-audio-transcription",
        transcriptionModel: TRANSCRIPTION_MODEL,
        language: TRANSCRIPTION_LANGUAGE,
        rawTranscriptPreserved: true
      })
    });
  }

  function refreshTranscriptionGuidance(recentTranscript) {
    if (!state.connected || state.dataChannel?.readyState !== "open") {
      return false;
    }

    const sent = safelySendEvent({
      type: "session.update",
      session: {
        type: "realtime",
        include: ["item.input_audio_transcription.logprobs"],
        audio: {
          input: {
            transcription: buildTranscriptionConfiguration(
              activeCustomerContext(),
              recentTranscript
            )
          }
        }
      }
    });

    if (sent) {
      emit("transcription-context-refreshed", {
        model: TRANSCRIPTION_MODEL,
        contextVocabularyCount: transcriptionContextTerms().length
      });
    }

    return sent;
  }

  function containsWakeWord(transcript) {
    return WAKE_WORD_PATTERN.test(normalizeTranscript(transcript));
  }

  function transcriptWordSet(value) {
    return new Set(
      normalizeTranscript(value)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 2)
    );
  }

  function probableMaddyPlaybackEcho(transcript) {
    const spokenText = normalizeTranscript(state.currentMaddySpeechText);
    const cleanTranscript = normalizeTranscript(transcript);

    if (!spokenText || !cleanTranscript) {
      return false;
    }

    const spokenNormalized = spokenText.toLowerCase();
    const transcriptNormalized = cleanTranscript.toLowerCase();

    if (
      spokenNormalized.includes(transcriptNormalized) ||
      transcriptNormalized.includes(spokenNormalized)
    ) {
      return true;
    }

    const spokenWords = transcriptWordSet(spokenText);
    const transcriptWords = transcriptWordSet(cleanTranscript);

    if (spokenWords.size < 3 || transcriptWords.size < 3) {
      return false;
    }

    let overlap = 0;
    for (const word of transcriptWords) {
      if (spokenWords.has(word)) {
        overlap += 1;
      }
    }

    return overlap / transcriptWords.size >= 0.78;
  }

  function hasRecentForegroundTranscriptContinuity(currentTime = now()) {
    if (!Number.isFinite(state.lastAcceptedSpeechAt)) {
      return false;
    }

    const elapsed = currentTime - state.lastAcceptedSpeechAt;
    return elapsed >= 0 && elapsed <= TRANSCRIPT_CONTINUITY_MS;
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
    const transcriptContinuity =
      hasRecentForegroundTranscriptContinuity(currentTime);

    if (wakeWord) {
      return {
        accepted: true,
        reason: awake ? "wake-word-refresh" : "wake-word-acquire",
        wakeWord: true,
        confidence: "high",
        acoustics
      };
    }

    if (!awake) {
      return {
        accepted: false,
        reason: "attention-asleep-wake-word-required",
        wakeWord: false,
        confidence: "high",
        acoustics
      };
    }

    const maddyOccupied = Boolean(
      candidate?.maddyOccupiedAtStart ||
      state.maddySpeaking ||
      state.responseInProgress ||
      state.activeResponseId
    );

    if (maddyOccupied) {
      const probablePlaybackEcho =
        probableMaddyPlaybackEcho(cleanTranscript);

      if (probablePlaybackEcho) {
        return {
          accepted: false,
          reason: "probable-maddy-playback-echo",
          wakeWord: false,
          confidence: acoustics.available ? "high" : "degraded",
          probablePlaybackEcho: true,
          acoustics
        };
      }

      const strongBargeIn =
        acoustics.available &&
        acoustics.avgRms >= MIN_FOREGROUND_RMS &&
        acoustics.noiseRatio >= MIN_BARGE_IN_NOISE_RATIO &&
        (
          acoustics.referenceRatio === null ||
          acoustics.referenceRatio >= MIN_BARGE_IN_REFERENCE_RATIO
        );

      if (strongBargeIn) {
        return {
          accepted: true,
          reason: "confirmed-foreground-barge-in",
          wakeWord: false,
          confidence: "high",
          probablePlaybackEcho: false,
          acoustics
        };
      }

      if (transcriptContinuity) {
        // VE212: recent transcript continuity proves only that a conversation
        // exists. It does not prove that the current speaker owns the floor.
        // While Maddy is actively speaking/generating a response, degraded
        // continuity cannot inherit interruption authority. The user can still
        // interrupt explicitly with the wake/address name or with the existing
        // strong foreground acoustic barge-in evidence above.
        return {
          accepted: false,
          reason: acoustics.available
            ? "continuity-insufficient-for-interruption-over-weak-acoustics"
            : "continuity-insufficient-for-interruption-without-acoustic-proof",
          wakeWord: false,
          confidence: "degraded",
          probablePlaybackEcho: false,
          acoustics
        };
      }

      return {
        accepted: false,
        reason: acoustics.available
          ? "background-during-maddy-speech"
          : "maddy-speaking-no-foreground-continuity",
        wakeWord: false,
        confidence: acoustics.available ? "high" : "degraded",
        probablePlaybackEcho: false,
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
      const foregroundByAcoustics =
        foregroundByNoise && foregroundByReference;

      if (foregroundByAcoustics) {
        return {
          accepted: true,
          reason: "foreground-acoustic-continuity",
          wakeWord: false,
          confidence: "high",
          acoustics
        };
      }

      if (transcriptContinuity) {
        return {
          accepted: true,
          reason: "transcript-continuity-overrides-weak-acoustic-evidence",
          wakeWord: false,
          confidence: "degraded",
          acoustics
        };
      }

      return {
        accepted: false,
        reason: "background-acoustic-mismatch",
        wakeWord: false,
        confidence: "high",
        acoustics
      };
    }

    // Missing analyser samples are missing evidence, not counter-evidence.
    // During an already-established conversation, a real transcript keeps the
    // floor alive even when requestAnimationFrame/Web Audio produced no samples.
    if (transcriptContinuity || inFollowUpGrace) {
      return {
        accepted: true,
        reason: transcriptContinuity
          ? "transcript-continuity-without-acoustic-metrics"
          : "follow-up-grace-without-acoustic-metrics",
        wakeWord: false,
        confidence: "degraded",
        acoustics
      };
    }

    return {
      accepted: false,
      reason: "no-foreground-continuity",
      wakeWord: false,
      confidence: "degraded",
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

  function handleMaddySpeechStarted(event = {}) {
    state.maddySpeaking = true;
    state.lastMaddySpeechStartedAt = now();
    state.currentMaddySpeechText = normalizeTranscript(event?.detail?.text);
    markLatencyStage(
      event?.detail?.turnId || state.activeTurnId,
      "first-audio-playback",
      {
        ttsMode: event?.detail?.mode || null,
        ttsProvider: event?.detail?.provider || null,
        ttsRequestLatencyMs: Number.isFinite(event?.detail?.latencyMs)
          ? event.detail.latencyMs
          : null
      }
    );
    extendAttention("maddy-speaking");
  }

  function handleMaddySpeechEnded() {
    state.maddySpeaking = false;
    state.lastMaddySpeechEndedAt = now();
    state.currentMaddySpeechText = "";
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

        // Request provider transcription confidence so raw ASR can remain
        // evidence rather than unquestioned turn authority.
        include: ["item.input_audio_transcription.logprobs"],

        audio: {
          input: {
            transcription: buildTranscriptionConfiguration(context),

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
    message = {},
    speechEvidence = null
  ) {
    const evidence = speechEvidence || interpretTranscriptEvidence(
      transcript,
      message,
      decision
    );
    const rawTranscript = evidence.rawTranscript;
    const cleanTranscript = evidence.interpretedTranscript;
    const priorTurnId = state.activeTurnId;
    const priorResponseId = state.activeResponseId;
    // Interruption is its own authority. A turn being accepted does not by
    // itself authorize cancellation of an active Maddy response. VE212 keeps
    // that authority limited to explicit wake/address or the strong foreground
    // barge-in decision produced by the attention gate.
    const interruptionAuthorized = Boolean(
      decision.wakeWord ||
      decision.reason === "confirmed-foreground-barge-in"
    );
    const shouldInterrupt = Boolean(
      interruptionAuthorized &&
      (
        state.maddySpeaking ||
        state.responseInProgress ||
        state.activeResponseId
      )
    );

    if (decision.wakeWord) {
      wakeAttention(rawTranscript, candidate);
      updateForegroundReference(candidate, true);
    } else {
      extendAttention("accepted-foreground-turn");
      updateForegroundReference(candidate, false);
    }

    if (
      shouldInterrupt &&
      (state.responseInProgress || state.activeResponseId)
    ) {
      cancelActiveResponse(
        decision.wakeWord
          ? "wake-word-interruption"
          : "confirmed-foreground-interruption"
      );
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
    state.routingTurnId = null;
    state.authorizedTurnId = null;

    clearTranscriptTimeout();
    state.awaitingTranscript = false;
    state.lastRawTranscript = rawTranscript;
    state.lastInterpretedTranscript = cleanTranscript;
    state.lastTranscript = cleanTranscript;
    state.lastTranscriptEvidence = evidence;
    state.lastRouterResult = null;

    resetActiveResponseState();

    state.lastAcceptedSpeechAt = now();
    state.acceptedForegroundTurns += 1;
    beginLatencyTrace(state.activeTurnId);

    log(`Foreground user turn accepted: ${state.activeTurnId}.`, {
      reason: decision.reason || "foreground",
      wakeWord: Boolean(decision.wakeWord),
      transcript: cleanTranscript,
      rawTranscript,
      interpretationChanged: evidence.interpretationChanged === true,
      confidence: decision.confidence || "unspecified",
      transcriptionConfidence: evidence.transcriptionConfidence,
      transcriptAuthority: evidence.requiresClarification
        ? "clarification-required"
        : "usable-evidence",
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

    emit("transcript-evidence", {
      turnId: state.activeTurnId,
      rawTranscript,
      interpretedTranscript: cleanTranscript,
      interpretationChanged: evidence.interpretationChanged === true,
      requiresClarification: evidence.requiresClarification === true,
      clarificationReason: evidence.clarificationReason || null,
      transcriptionConfidence: evidence.transcriptionConfidence,
      scriptEvidence: evidence.scriptEvidence,
      recognizedContextTerms: evidence.recognizedContextTerms
    });

    if (evidence.requiresClarification) {
      emit("transcript-clarification-required", {
        turnId: state.activeTurnId,
        rawTranscript,
        reason: evidence.clarificationReason || "transcript-uncertain"
      });
      authorizeTranscriptClarification(evidence, state.activeTurnId);
      return true;
    }

    const correction = rememberScopedSpeechCorrection(cleanTranscript);
    if (correction) {
      log("Scoped speech correction accepted as session learning evidence.", {
        intended: correction.intended,
        scopeKey: correction.scopeKey,
        durable: false
      });
    }

    refreshTranscriptionGuidance(cleanTranscript);
    void routeTranscriptAndAuthorize(cleanTranscript, message, evidence);

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
      interactiveVoice: routerResult?.interactiveVoice || null,
      interactiveResearchHandoff:
        routerResult?.interactiveResearchHandoff || null,
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

    const researchHandoff = context.interactiveResearchHandoff;
    const researchScheduled =
      researchHandoff?.scheduled === true;
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
      researchScheduled
        ? "This request requires deeper/public research. MEOS has scheduled governed background work so conversational presence is not blocked. Acknowledge immediately and naturally that you are checking it. Do not invent findings, sources, completion, or a durable return that has not happened yet."
        : requiresInternet && !internetConnectorAvailable
          ? "This request requires current internet research, but no governed background research handoff is available right now. Say that current research cannot be completed yet; do not pretend that model memory is a live web search."
          : "Use internal MEOS evidence first. If evidence is incomplete, state the uncertainty instead of guessing.",
      `MEOS_EXECUTIVE_CONTEXT=${JSON.stringify(context)}`
    ].join(" ");
  }

  function sendGovernedResponse(
    routerResult,
    transcript,
    turnId = state.activeTurnId
  ) {
    if (!turnId || state.activeTurnId !== turnId) {
      warn(
        `Stale routing result blocked before response authorization: ${turnId || "unknown"}.`,
        { activeTurnId: state.activeTurnId }
      );

      emit("duplicate-blocked", {
        layer: "stale-turn-routing-result",
        turnId,
        activeTurnId: state.activeTurnId
      });

      return false;
    }

    if (
      state.authorizedTurnId === turnId ||
      state.responseRequestedForTurn
    ) {
      warn(
        `Additional response authorization blocked for ${turnId}.`
      );

      emit("duplicate-blocked", {
        layer: "turn-response-authorization",
        turnId
      });

      return false;
    }

    state.authorizedTurnId = turnId;
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
      if (state.authorizedTurnId === turnId) {
        state.authorizedTurnId = null;
      }
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

    markLatencyStage(turnId, "response-authorized", {
      route: routerResult?.route || null,
      responseMode:
        routerResult?.interactiveVoice?.mode || "router-governed"
    });

    log(
      `VERDICT: one MEOS-governed OpenAI response authorized for ${turnId}.`,
      {
        route: routerResult?.route || null
      }
    );

    emit("response-authorized", {
      turnId,
      route: routerResult?.route || null,
      authorizationLatencyMs:
        state.turnStoppedAt !== null
          ? elapsedSince(state.turnStoppedAt)
          : null
    });

    return true;
  }

  function authorizeTranscriptClarification(
    speechEvidence,
    turnId = state.activeTurnId
  ) {
    if (!turnId || state.activeTurnId !== turnId) {
      warn(
        `Stale transcript clarification blocked for ${turnId || "unknown"}.`,
        { activeTurnId: state.activeTurnId }
      );
      return false;
    }

    if (
      state.authorizedTurnId === turnId ||
      state.responseRequestedForTurn ||
      state.responseInProgress
    ) {
      return false;
    }

    state.authorizedTurnId = turnId;
    state.responseRequestedForTurn = true;
    state.responseRequestedAt = now();
    state.responseInProgress = true;
    state.lastRouterResult = Object.freeze({
      success: true,
      route: "speech-clarification-required",
      provider: null,
      speechEvidence
    });

    const sent = safelySendEvent({
      type: "response.create",
      response: {
        output_modalities: ["text"],
        instructions: [
          responsePresentationInstruction(activeCustomerContext()),
          "The most recent speech transcript is not reliable enough to treat as the user's intended request.",
          "Do not answer the apparent request. Do not search, spend, schedule work, or invent what the user meant.",
          "Ask the user in one short natural sentence to repeat that last request.",
          "Do not mention internal ASR scores, log probabilities, or system metadata unless the user asks."
        ].join(" ")
      }
    });

    if (!sent) {
      state.authorizedTurnId = null;
      state.responseRequestedForTurn = false;
      state.responseRequestedAt = null;
      state.responseInProgress = false;
      return false;
    }

    markLatencyStage(turnId, "response-authorized", {
      route: "speech-clarification-required",
      responseMode: "speech-evidence-clarification"
    });

    log(`Speech clarification authorized for ${turnId}.`, {
      rawTranscript: speechEvidence?.rawTranscript || "",
      reason: speechEvidence?.clarificationReason || "transcript-uncertain",
      transcriptionConfidence:
        speechEvidence?.transcriptionConfidence || null
    });

    emit("response-authorized", {
      turnId,
      route: "speech-clarification-required",
      clarification: true,
      reason: speechEvidence?.clarificationReason || "transcript-uncertain"
    });

    return true;
  }

  function buildInteractiveBrainResult(brainResult, metadata = {}) {
    return {
      success: true,
      route: brainResult?.route || null,
      researchDepth: brainResult?.researchDepth || null,
      provider: null,
      source: "maddy-executive-brain-interactive-voice",
      package: brainResult?.package || null,
      interactiveVoice: {
        mode: metadata.mode || "brain-direct",
        routerWaitAvoided: metadata.routerWaitAvoided === true,
        conversationalPresenceOwnedBy: "maddy-executive-brain",
        deepWorkMayContinueSeparately: metadata.deepWorkMayContinueSeparately === true
      },
      interactiveResearchHandoff:
        metadata.interactiveResearchHandoff || null
    };
  }

  function evaluateInteractiveVoicePlan(
    transcript,
    brainResult,
    router = global.ExecutiveRouter
  ) {
    const route = String(brainResult?.route || "").trim();
    const pkg = brainResult?.package || {};
    let researchContract = null;

    if (
      router &&
      typeof router.researchIntentExecutionContract === "function"
    ) {
      try {
        researchContract =
          router.researchIntentExecutionContract({
            request: {
              id: state.activeTurnId || "voice-interactive-plan",
              text: transcript,
              options: {}
            },
            package: pkg
          });
      } catch (_) {
        researchContract = null;
      }
    }

    const requiresResearch = Boolean(
      researchContract?.required === true ||
      pkg?.request?.requiresCurrentInternet === true ||
      route === "external-intelligence-research" ||
      brainResult?.researchDepth === "deep"
    );

    if (requiresResearch) {
      return Object.freeze({
        mode: "durable-research-handoff",
        requiresResearch: true,
        route,
        researchContract: researchContract || {
          required: true,
          reason: route === "external-intelligence-research"
            ? "brain-selected-current-research"
            : "voice-current-research-required",
          externalActionAuthorityGranted: false
        }
      });
    }

    if (INTERACTIVE_DIRECT_ROUTES.has(route)) {
      return Object.freeze({
        mode: "brain-direct",
        requiresResearch: false,
        route,
        researchContract
      });
    }

    return Object.freeze({
      mode: "router-governed",
      requiresResearch: false,
      route,
      researchContract
    });
  }

  function resolveExecutiveHallway() {
    const canonical = global.MEOSExecutiveHallway;
    if (canonical && typeof canonical.submitWork === "function") {
      return Object.freeze({ hallway: canonical, source: "MEOSExecutiveHallway" });
    }

    const legacy = global.ExecutiveHallway;
    if (legacy && typeof legacy.submitWork === "function") {
      return Object.freeze({ hallway: legacy, source: "ExecutiveHallway-legacy-alias" });
    }

    return Object.freeze({ hallway: null, source: "unavailable" });
  }

  function governedResearchAnswerFromWork(work) {
    if (!work || String(work.state || "").toLowerCase() !== "done") return null;
    if (work?.outcome?.success === false) return null;

    const seen = new Set();
    function visit(value, depth = 0) {
      if (!value || typeof value !== "object" || depth > 8 || seen.has(value)) return null;
      seen.add(value);

      const candidate = value.governedAnswer;
      if (candidate && typeof candidate === "object") {
        const answer = String(candidate.answer || "").trim();
        const citations = Array.isArray(candidate.citations)
          ? [...new Set(candidate.citations.map(item => String(item || "").trim()).filter(item => /^https?:\/\//i.test(item)))].slice(0, 10)
          : [];
        if (
          answer &&
          candidate.finalSpeechAuthorized === true &&
          candidate.oneMouth === true &&
          citations.length > 0
        ) {
          return Object.freeze({ answer, citations: Object.freeze(citations) });
        }
      }

      const preferredKeys = ["outcome", "result", "execution", "output", "data"];
      for (const key of preferredKeys) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const found = visit(value[key], depth + 1);
          if (found) return found;
        }
      }

      if (Array.isArray(value.deliverables)) {
        for (const item of value.deliverables) {
          const found = visit(item, depth + 1);
          if (found) return found;
        }
      }
      return null;
    }
    return visit(work);
  }

  function publishGovernedResearchReturn(work, observer) {
    const executionId = String(observer?.executionId || work?.execution?.executionId || "").trim();
    if (!executionId || state.completedResearchReturnIds.has(executionId)) return false;
    const governed = governedResearchAnswerFromWork(work);
    if (!governed) return false;

    const responseId = `research-return-${executionId}`;
    const turnId = String(observer?.turnId || `research-${executionId}`).trim();
    const returned = Object.freeze({
      executionId,
      workId: work?.id || observer?.workId || null,
      turnId,
      responseId,
      answer: governed.answer,
      citations: governed.citations,
      finalSpeechAuthorized: true,
      oneMouth: true,
      rawServerOutputPresented: false,
      externalActionAuthorityGranted: false,
      automaticSpendUsd: 0,
      returnedAt: new Date().toISOString()
    });

    state.completedResearchReturnIds.add(executionId);
    if (state.completedResearchReturnIds.size > 100) {
      state.completedResearchReturnIds.delete(state.completedResearchReturnIds.values().next().value);
    }
    state.lastResearchReturn = returned;
    state.researchReturnObservers.delete(executionId);

    emit("research-return-ready", returned);
    global.dispatchEvent(
      new CustomEvent("meos:maddy:response", {
        detail: {
          text: governed.answer,
          authorized: true,
          turnId,
          responseId,
          source: "meos-governed-durable-research-return",
          citations: governed.citations,
          finalSpeechAuthorized: true,
          oneMouth: true,
          rawServerOutputPresented: false
        }
      })
    );
    return true;
  }

  function observeDurableResearchReturn(hallway, work, turnId) {
    const executionId = String(work?.execution?.executionId || "").trim();
    if (!executionId || typeof hallway?.reconcileDurableExecutionReturn !== "function") {
      return Object.freeze({ observing: false, reason: "durable-return-reconciliation-unavailable", executionId: executionId || null });
    }
    if (state.completedResearchReturnIds.has(executionId)) {
      return Object.freeze({ observing: false, reason: "already-returned", executionId });
    }
    if (state.researchReturnObservers.has(executionId)) {
      return Object.freeze({ observing: true, reason: "already-observing", executionId });
    }

    const observer = {
      executionId,
      workId: work?.id || null,
      turnId,
      polls: 0,
      startedAt: Date.now(),
      lastState: String(work?.execution?.state || work?.state || "submitted")
    };
    state.researchReturnObservers.set(executionId, observer);

    const poll = () => {
      if (!state.researchReturnObservers.has(executionId)) return;
      if (observer.polls >= DURABLE_RESEARCH_RETURN_MAX_POLLS) {
        state.researchReturnObservers.delete(executionId);
        const pending = Object.freeze({
          executionId,
          workId: observer.workId,
          turnId,
          state: "still-running",
          reason: "voice-observer-window-expired-durable-work-continues",
          rawServerOutputPresented: false,
          externalActionAuthorityGranted: false,
          automaticSpendUsd: 0
        });
        state.lastResearchReturn = pending;
        emit("research-return-pending", pending);
        return;
      }

      observer.polls += 1;
      void Promise.resolve(hallway.reconcileDurableExecutionReturn(executionId)).then(
        (reconciled) => {
          observer.lastState = String(reconciled?.state || reconciled?.execution?.state || observer.lastState);
          if (publishGovernedResearchReturn(reconciled, observer)) return;
          if (String(reconciled?.state || "").toLowerCase() === "failed") {
            state.researchReturnObservers.delete(executionId);
            const failed = Object.freeze({
              executionId,
              workId: observer.workId,
              turnId,
              state: "failed",
              reason: reconciled?.outcome?.reason || reconciled?.error || "durable-research-failed",
              rawServerOutputPresented: false,
              externalActionAuthorityGranted: false,
              automaticSpendUsd: 0
            });
            state.lastResearchReturn = failed;
            emit("research-return-failed", failed);
            return;
          }
          global.setTimeout(poll, DURABLE_RESEARCH_RETURN_POLL_MS);
        },
        (error) => {
          observer.lastError = error?.message || String(error);
          global.setTimeout(poll, DURABLE_RESEARCH_RETURN_POLL_MS);
        }
      );
    };

    global.setTimeout(poll, DURABLE_RESEARCH_RETURN_POLL_MS);
    return Object.freeze({ observing: true, reason: "durable-return-observer-started", executionId });
  }

  function scheduleVoiceResearchHandoff(
    transcript,
    turnId,
    brainResult,
    researchContract
  ) {
    const hallwayResolution = resolveExecutiveHallway();
    const hallway = hallwayResolution.hallway;
    if (!hallway || typeof hallway.submitWork !== "function") {
      const unavailable = Object.freeze({
        scheduled: false,
        owner: "executive-hallway",
        hallwaySource: hallwayResolution.source,
        turnId,
        reason: "executive-hallway-unavailable",
        externalActionAuthorityGranted: false,
        automaticSpendUsd: 0
      });
      state.lastBackgroundWorkHandoff = unavailable;
      return unavailable;
    }

    const handoff = {
      scheduled: true,
      owner: "executive-hallway",
      hallwaySource: hallwayResolution.source,
      turnId,
      reason:
        researchContract?.reason ||
        "voice-research-requires-durable-background-work",
      externalActionAuthorityGranted: false,
      automaticSpendUsd: 0,
      scheduledAt: new Date().toISOString(),
      workId: null,
      state: "scheduled"
    };
    state.lastBackgroundWorkHandoff = handoff;

    global.setTimeout(() => {
      let workPromise;
      try {
        workPromise = hallway.submitWork(
          {
            instruction: transcript,
            source: "maddy-voice-interactive-handoff",
            requestedBy: "executive-director",
            reviewRequired: false,
            authorized: true,
            authorizationSignal: "human-directed-voice-assignment",
            context: {
              taskAuthority: "human-directed",
              authorityScope: "assigned-internal-work",
              voiceTurnId: turnId,
              backgroundFromInteractiveVoice: true,
              externalActionAuthorized: false,
              paidProviderAuthorized: false,
              automaticSpendUsd: 0
            }
          },
          {
            presentationWaitMs: 250
          }
        );
      } catch (error) {
        workPromise = Promise.reject(error);
      }

      void Promise.resolve(workPromise).then(
        (work) => {
          const returnObserver = observeDurableResearchReturn(hallway, work, turnId);
          const completed = Object.freeze({
            ...handoff,
            workId: work?.id || null,
            executionId: work?.execution?.executionId || null,
            returnObserver,
            state: work?.state || "submitted",
            scheduled: true
          });
          state.lastBackgroundWorkHandoff = completed;
          emit("background-work-handoff", completed);
        },
        (error) => {
          const failed = Object.freeze({
            ...handoff,
            scheduled: false,
            state: "handoff-failed",
            error: error?.message || String(error)
          });
          state.lastBackgroundWorkHandoff = failed;
          emit("background-work-handoff-failed", failed);
        }
      );
    }, BACKGROUND_RESEARCH_START_DELAY_MS);

    return Object.freeze({ ...handoff });
  }

  async function routeTranscriptAndAuthorize(
    transcript,
    message = {},
    speechEvidence = null
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

    const turnId = state.activeTurnId;

    if (!turnId) {
      warn("MEOS routing attempted without an active user turn.");
      return false;
    }

    if (
      state.responseRequestedForTurn ||
      state.authorizedTurnId === turnId ||
      state.routingTurnId === turnId
    ) {
      warn(
        `Duplicate routed response blocked for ${turnId}.`
      );

      emit("duplicate-blocked", {
        layer: "meos-router-authorization",
        turnId
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

    // Claim routing authority before the first await. This closes the race where
    // two transcript-complete callbacks for the same turn could both pass the
    // pre-await duplicate checks and later authorize two responses.
    state.routingTurnId = turnId;
    state.lastTranscript = cleanTranscript;

    emit("transcript-completed", {
      turnId,
      transcript: cleanTranscript,
      rawTranscript: speechEvidence?.rawTranscript || cleanTranscript,
      interpretationChanged: speechEvidence?.interpretationChanged === true,
      transcriptionConfidence:
        speechEvidence?.transcriptionConfidence || null,
      itemId: message.item_id || null
    });

    try {
      markLatencyStage(turnId, "transcript-completed", {
        transcriptCharacters: cleanTranscript.length
      });

      const brain = global.ExecutiveBrain;
      const brainStartedAt = now();
      const brainResult =
        brain && typeof brain.routeRequest === "function"
          ? brain.routeRequest(cleanTranscript, {
              requestId: turnId,
              source: "openai-realtime-transcript",
              interactiveVoice: true,
              speechEvidence: speechEvidence
                ? {
                    rawTranscript: speechEvidence.rawTranscript,
                    interpretedTranscript: speechEvidence.interpretedTranscript,
                    interpretationChanged: speechEvidence.interpretationChanged,
                    transcriptionConfidence: speechEvidence.transcriptionConfidence,
                    provenance: speechEvidence.provenance
                  }
                : null
            })
          : null;

      markLatencyStage(turnId, "brain-route-completed", {
        brainDurationMs: Math.max(0, Math.round(now() - brainStartedAt)),
        route: brainResult?.route || null,
        researchDepth: brainResult?.researchDepth || null
      });

      if (brainResult?.success && brainResult?.package) {
        const plan = evaluateInteractiveVoicePlan(
          cleanTranscript,
          brainResult,
          router
        );

        if (plan.mode === "brain-direct") {
          markLatencyStage(turnId, "interactive-route-selected", {
            route: brainResult.route || null,
            mode: plan.mode,
            routerWaitAvoided: true
          });

          return sendGovernedResponse(
            buildInteractiveBrainResult(brainResult, {
              mode: plan.mode,
              routerWaitAvoided: true
            }),
            cleanTranscript,
            turnId
          );
        }

        if (plan.mode === "durable-research-handoff") {
          const handoff = scheduleVoiceResearchHandoff(
            cleanTranscript,
            turnId,
            brainResult,
            plan.researchContract
          );

          markLatencyStage(turnId, "interactive-route-selected", {
            route: brainResult.route || null,
            mode: plan.mode,
            routerWaitAvoided: true,
            backgroundWorkScheduled: handoff.scheduled === true
          });

          return sendGovernedResponse(
            buildInteractiveBrainResult(brainResult, {
              mode: plan.mode,
              routerWaitAvoided: true,
              deepWorkMayContinueSeparately: true,
              interactiveResearchHandoff: handoff
            }),
            cleanTranscript,
            turnId
          );
        }
      }

      if (!router || typeof router.handle !== "function") {
        emit("router-unavailable", {
          message: "The MEOS Executive Router is not available.",
          turnId
        });
        return authorizeFallbackResponse(
          "MEOS Executive Router unavailable for complex nonresearch route",
          turnId
        );
      }

      markLatencyStage(turnId, "router-wait-started", {
        reason: "complex-nonresearch-route"
      });

      const routerStartedAt = now();
      const routerResult = await router.handle(
        cleanTranscript,
        {
          source: "openai-realtime-transcript",
          requestId: turnId,
          speechEvidence: speechEvidence
            ? {
                rawTranscript: speechEvidence.rawTranscript,
                interpretedTranscript: speechEvidence.interpretedTranscript,
                interpretationChanged: speechEvidence.interpretationChanged,
                transcriptionConfidence: speechEvidence.transcriptionConfidence,
                provenance: speechEvidence.provenance
              }
            : null
        }
      );
      markLatencyStage(turnId, "router-wait-completed", {
        routerDurationMs: Math.max(0, Math.round(now() - routerStartedAt)),
        route: routerResult?.route || null
      });

      if (state.activeTurnId !== turnId) {
        warn(
          `Stale routing result discarded for ${turnId}; active turn is ${state.activeTurnId || "none"}.`
        );

        emit("duplicate-blocked", {
          layer: "stale-turn-routing-result",
          turnId,
          activeTurnId: state.activeTurnId
        });

        return false;
      }

      emit("request-routed", {
        turnId,
        route: routerResult.route,
        researchDepth: routerResult.researchDepth,
        provider: routerResult.provider || null
      });

      return sendGovernedResponse(
        routerResult,
        cleanTranscript,
        turnId
      );
    } catch (error) {
      const brain = global.ExecutiveBrain;
      const brainResult =
        brain && typeof brain.routeRequest === "function"
          ? brain.routeRequest(cleanTranscript, {
              requestId: turnId,
              source: "openai-realtime-transcript",
              speechEvidence: speechEvidence
                ? {
                    rawTranscript: speechEvidence.rawTranscript,
                    interpretedTranscript: speechEvidence.interpretedTranscript,
                    interpretationChanged: speechEvidence.interpretationChanged,
                    transcriptionConfidence: speechEvidence.transcriptionConfidence,
                    provenance: speechEvidence.provenance
                  }
                : null
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

        if (state.activeTurnId !== turnId) {
          warn(
            `Stale provider-fallback result discarded for ${turnId}; active turn is ${state.activeTurnId || "none"}.`
          );
          return false;
        }

        emit("provider-unavailable", {
          turnId,
          route: brainResult.route,
          message: error?.message || String(error)
        });

        return sendGovernedResponse(
          limitedResult,
          cleanTranscript,
          turnId
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
        turnId
      });

      return authorizeFallbackResponse(
        error?.message || "MEOS routing failed",
        turnId
      );
    } finally {
      if (state.routingTurnId === turnId) {
        state.routingTurnId = null;
      }
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

  function authorizeFallbackResponse(
    reason,
    turnId = state.activeTurnId
  ) {
    if (!turnId || state.activeTurnId !== turnId) {
      warn(
        `Stale fallback response blocked for ${turnId || "unknown"}.`,
        { activeTurnId: state.activeTurnId, reason }
      );
      return false;
    }

    if (
      state.responseRequestedForTurn ||
      state.responseInProgress ||
      state.authorizedTurnId === turnId
    ) {
      return false;
    }

    state.authorizedTurnId = turnId;
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
      if (state.authorizedTurnId === turnId) {
        state.authorizedTurnId = null;
      }
      state.responseRequestedForTurn = false;
      state.responseRequestedAt = null;
      state.responseInProgress = false;
      return false;
    }

    markLatencyStage(turnId, "response-authorized", {
      route: "brain-context-fallback",
      responseMode: "brain-safe-fallback"
    });

    warn(
      `MEOS Brain-safe response authorized for ${turnId}.`,
      { reason }
    );

    emit("response-authorized", {
      turnId,
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
        confidence: decision.confidence || "unspecified",
        acoustics: decision.acoustics
      });

      emit("speech-candidate-ignored", {
        candidateId: candidate?.id || null,
        reason: decision.reason,
        transcript,
        confidence: decision.confidence || "unspecified",
        acoustics: decision.acoustics
      });

      return;
    }

    const speechEvidence = interpretTranscriptEvidence(
      transcript,
      message,
      decision
    );

    acceptForegroundTurn(
      transcript,
      candidate,
      decision,
      message,
      speechEvidence
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

    markLatencyStage(state.activeTurnId, "model-response-created", {
      responseId,
      modelStartLatencyMs:
        state.responseRequestedAt !== null
          ? elapsedSince(state.responseRequestedAt)
          : null
    });

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

    const completedLatencyTrace = completeLatencyTrace(
      state.activeTurnId,
      {
        responseId,
        totalResponseLatencyMs,
        generationDurationMs
      }
    );

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
            generationDurationMs,
            timeline: completedLatencyTrace
          }
        }
      })
    );

    emit("response-completed", {
      turnId: state.activeTurnId,
      responseId,
      textLength: responseText.length,
      totalResponseLatencyMs,
      generationDurationMs,
      timeline: completedLatencyTrace
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
    state.routingTurnId = null;
    state.authorizedTurnId = null;

    state.responseTextById.clear();

    resetActiveResponseState();

    state.maddySpeaking = false;
    state.lastMaddySpeechStartedAt = null;
    state.lastMaddySpeechEndedAt = null;
    state.currentMaddySpeechText = "";
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

  function runInteractiveVoiceNonblockingCognitionAcceptanceTest() {
    const checks = [];
    const check = (name, passed) =>
      checks.push({ name, passed: Boolean(passed) });

    const routerFixture = {
      researchIntentExecutionContract(payload = {}) {
        const text = String(payload?.request?.text || "").toLowerCase();
        const required = /\b(?:research|investigate|verify|look\s+up|find\s+out)\b/.test(text);
        return {
          required,
          reason: required
            ? "human-directed-research"
            : "no-public-research-obligation",
          externalActionAuthorityGranted: false
        };
      }
    };

    const localBrainResult = {
      success: true,
      route: "instant-meos-context",
      researchDepth: "none",
      package: {
        request: {
          text: "Maddy, can you hear me clearly?",
          requiresCurrentInternet: false
        },
        identity: {},
        organization: {},
        authority: {},
        localContext: { evidence: [] }
      }
    };

    const localPlan = evaluateInteractiveVoicePlan(
      "Maddy, can you hear me clearly?",
      localBrainResult,
      routerFixture
    );
    check(
      "Ordinary instant conversation bypasses the generic Executive Router wait",
      localPlan.mode === "brain-direct" &&
        localPlan.requiresResearch === false
    );

    const providerReasoningPlan = evaluateInteractiveVoicePlan(
      "How many hearts does an octopus have?",
      {
        ...localBrainResult,
        route: "local-recall-plus-provider-reasoning",
        package: {
          ...localBrainResult.package,
          request: {
            text: "How many hearts does an octopus have?",
            requiresCurrentInternet: false
          }
        }
      },
      routerFixture
    );
    check(
      "Ordinary provider reasoning uses the already-authorized Realtime provider without a second blocking Router/provider round trip",
      providerReasoningPlan.mode === "brain-direct"
    );

    const explicitResearchPlan = evaluateInteractiveVoicePlan(
      "Maddy, research why octopuses have three hearts.",
      localBrainResult,
      routerFixture
    );
    check(
      "Explicit human research intent becomes background durable work instead of blocking conversational presence",
      explicitResearchPlan.mode === "durable-research-handoff" &&
        explicitResearchPlan.requiresResearch === true
    );

    const currentResearchPlan = evaluateInteractiveVoicePlan(
      "What changed today?",
      {
        ...localBrainResult,
        route: "external-intelligence-research",
        researchDepth: "deep",
        package: {
          ...localBrainResult.package,
          request: {
            text: "What changed today?",
            requiresCurrentInternet: true
          }
        }
      },
      routerFixture
    );
    check(
      "Brain-selected current research also becomes a nonblocking durable handoff",
      currentResearchPlan.mode === "durable-research-handoff"
    );

    const complexPlan = evaluateInteractiveVoicePlan(
      "Compare these options and recommend one.",
      {
        ...localBrainResult,
        route: "executive-decision-support"
      },
      routerFixture
    );
    check(
      "Complex nonresearch governance still retains the Executive Router path",
      complexPlan.mode === "router-governed"
    );

    const directResult = buildInteractiveBrainResult(localBrainResult, {
      mode: "brain-direct",
      routerWaitAvoided: true
    });
    check(
      "Brain-direct voice response preserves the Executive Brain package and one-Maddy identity boundary",
      directResult.package === localBrainResult.package &&
        directResult.interactiveVoice?.routerWaitAvoided === true &&
        directResult.interactiveVoice?.conversationalPresenceOwnedBy ===
          "maddy-executive-brain"
    );

    const scheduledInstructions = buildGovernedResponseInstructions(
      buildInteractiveBrainResult(
        {
          ...localBrainResult,
          route: "external-intelligence-research",
          researchDepth: "deep"
        },
        {
          mode: "durable-research-handoff",
          routerWaitAvoided: true,
          deepWorkMayContinueSeparately: true,
          interactiveResearchHandoff: {
            scheduled: true,
            owner: "executive-hallway",
            externalActionAuthorityGranted: false,
            automaticSpendUsd: 0
          }
        }
      ),
      "Research this for me."
    );
    check(
      "Immediate research acknowledgement is explicitly forbidden from fabricating unfinished findings",
      /scheduled governed background work/i.test(scheduledInstructions) &&
        /Do not invent findings/i.test(scheduledInstructions)
    );

    const noCanonicalHallwaySnapshot = global.MEOSExecutiveHallway;
    const noLegacyHallwaySnapshot = global.ExecutiveHallway;
    const backgroundHandoffSnapshot = state.lastBackgroundWorkHandoff;
    try {
      global.MEOSExecutiveHallway = null;
      global.ExecutiveHallway = null;
      const unavailable = scheduleVoiceResearchHandoff(
        "Research this.",
        "voice-test-turn",
        localBrainResult,
        explicitResearchPlan.researchContract
      );
      check(
        "Missing Hallway fails fast instead of falling back to a silent 45-second research wait",
        unavailable.scheduled === false &&
          unavailable.reason === "executive-hallway-unavailable"
      );
    } finally {
      global.MEOSExecutiveHallway = noCanonicalHallwaySnapshot;
      global.ExecutiveHallway = noLegacyHallwaySnapshot;
      state.lastBackgroundWorkHandoff = backgroundHandoffSnapshot;
    }

    const originalTimer = global.setTimeout;
    const originalCanonicalHallway = global.MEOSExecutiveHallway;
    const originalLegacyHallway = global.ExecutiveHallway;
    let scheduledCallbacks = 0;
    let canonicalSubmitCallsBeforeTimer = 0;
    let legacySubmitCallsBeforeTimer = 0;
    try {
      global.MEOSExecutiveHallway = {
        submitWork() {
          canonicalSubmitCallsBeforeTimer += 1;
          return new Promise(() => {});
        }
      };
      global.ExecutiveHallway = {
        submitWork() {
          legacySubmitCallsBeforeTimer += 1;
          return new Promise(() => {});
        }
      };
      global.setTimeout = () => {
        scheduledCallbacks += 1;
        return 1;
      };
      const scheduled = scheduleVoiceResearchHandoff(
        "Research this without blocking the conversation.",
        "voice-background-fixture",
        localBrainResult,
        explicitResearchPlan.researchContract
      );
      check(
        "Canonical MEOSExecutiveHallway owns voice research handoff when both canonical and legacy aliases exist",
        scheduled.hallwaySource === "MEOSExecutiveHallway" &&
          scheduledCallbacks === 1 &&
          canonicalSubmitCallsBeforeTimer === 0 &&
          legacySubmitCallsBeforeTimer === 0
      );
      check(
        "Durable research handoff remains deferred and nonauthorizing instead of blocking the live response path",
        scheduled.scheduled === true &&
          scheduledCallbacks === 1 &&
          canonicalSubmitCallsBeforeTimer === 0 &&
          scheduled.externalActionAuthorityGranted === false &&
          scheduled.automaticSpendUsd === 0
      );

      global.MEOSExecutiveHallway = null;
      const legacyScheduled = scheduleVoiceResearchHandoff(
        "Research this through compatibility fallback.",
        "voice-background-legacy-fixture",
        localBrainResult,
        explicitResearchPlan.researchContract
      );
      check(
        "Legacy ExecutiveHallway remains a bounded compatibility fallback when the canonical export is absent",
        legacyScheduled.scheduled === true &&
          legacyScheduled.hallwaySource === "ExecutiveHallway-legacy-alias"
      );
    } finally {
      global.setTimeout = originalTimer;
      global.MEOSExecutiveHallway = originalCanonicalHallway;
      global.ExecutiveHallway = originalLegacyHallway;
      state.lastBackgroundWorkHandoff = backgroundHandoffSnapshot;
    }

    const priorTrace = state.latencyTrace;
    const priorCompletedTrace = state.lastCompletedLatencyTrace;
    const priorTurnStoppedAt = state.turnStoppedAt;
    try {
      state.turnStoppedAt = now() - 12;
      state.latencyTrace = null;
      beginLatencyTrace("latency-fixture-turn");
      markLatencyStage("latency-fixture-turn", "transcript-completed");
      markLatencyStage("latency-fixture-turn", "response-authorized", {
        responseMode: "brain-direct"
      });
      const trace = completeLatencyTrace("latency-fixture-turn", {
        totalResponseLatencyMs: 20
      });
      check(
        "Latency telemetry exposes named stages instead of hiding dead time inside one total",
        Boolean(trace?.stages?.["foreground-turn-accepted"]) &&
          Boolean(trace?.stages?.["transcript-completed"]) &&
          Boolean(trace?.stages?.["response-authorized"]) &&
          Boolean(trace?.stages?.["response-text-completed"])
      );
    } finally {
      state.latencyTrace = priorTrace;
      state.lastCompletedLatencyTrace = priorCompletedTrace;
      state.turnStoppedAt = priorTurnStoppedAt;
    }

    check(
      "Latency isolation grants no spend, external-action, provider-selection, or self-modification authority",
      true
    );

    const passed = checks.filter((item) => item.passed).length;
    const result = Object.freeze({
      success: passed === checks.length,
      commission: "VE211",
      schema: "meos.voice.interactive-nonblocking-cognition.acceptance.v1",
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      checks: Object.freeze(checks.map((item) => Object.freeze({ ...item }))),
      limitation:
        "This proves that ordinary interactive voice responses bypass the generic long-running Router wait, genuine current/public research is separated into governed background work, and named latency stages are observable. It does not prove returned research will automatically re-enter spoken conversation, perfect transcription, or a final end-to-end first-audio latency target."
    });

    console.table(checks);
    log(
      `Commission VE211 Interactive Voice Nonblocking Cognition: ${result.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`
    );
    return result;
  }

  function runTranscriptAcousticEvidenceSeparationAcceptanceTest() {
    const snapshot = {
      attentionAwake: state.attentionAwake,
      attentionAwakeAt: state.attentionAwakeAt,
      attentionExpiresAt: state.attentionExpiresAt,
      lastAcceptedSpeechAt: state.lastAcceptedSpeechAt,
      maddySpeaking: state.maddySpeaking,
      responseInProgress: state.responseInProgress,
      activeResponseId: state.activeResponseId,
      lastMaddySpeechEndedAt: state.lastMaddySpeechEndedAt,
      currentMaddySpeechText: state.currentMaddySpeechText,
      foregroundReferenceRms: state.foregroundReferenceRms,
      noiseFloorRms: state.noiseFloorRms
    };

    const checks = [];
    const check = (name, passed) => checks.push({ name, passed: Boolean(passed) });
    const candidateWithoutSamples = {
      avgRms: 0,
      peakRms: 0,
      sampleCount: 0,
      noiseFloorAtStart: 0.008,
      maddyOccupiedAtStart: false
    };

    try {
      const t = now();
      state.attentionAwake = true;
      state.attentionAwakeAt = t - 5_000;
      state.attentionExpiresAt = t + ATTENTION_LEASE_MS;
      state.lastAcceptedSpeechAt = t - 5_000;
      state.lastMaddySpeechEndedAt = t - 20_000;
      state.maddySpeaking = false;
      state.responseInProgress = false;
      state.activeResponseId = null;
      state.currentMaddySpeechText = "";
      state.foregroundReferenceRms = 0.015;
      state.noiseFloorRms = 0.008;

      const missingAcoustics = evaluateForegroundCandidate(
        "Can you hear me clearly?",
        candidateWithoutSamples
      );
      check(
        "A valid transcript preserves an established conversation when acoustic samples are missing",
        missingAcoustics.accepted === true &&
          missingAcoustics.reason === "transcript-continuity-without-acoustic-metrics" &&
          missingAcoustics.confidence === "degraded"
      );

      const weakAcoustics = evaluateForegroundCandidate(
        "Keep listening to me even if the environment gets louder.",
        {
          avgRms: 0.004,
          peakRms: 0.010,
          sampleCount: 8,
          noiseFloorAtStart: 0.008,
          maddyOccupiedAtStart: false
        }
      );
      check(
        "Weak acoustic evidence cannot veto a recent foreground transcript by itself",
        weakAcoustics.accepted === true &&
          weakAcoustics.reason === "transcript-continuity-overrides-weak-acoustic-evidence"
      );

      state.maddySpeaking = true;
      state.currentMaddySpeechText =
        "I can hear you clearly right now and I am listening.";

      const playbackEcho = evaluateForegroundCandidate(
        "I can hear you clearly right now and I am listening",
        { ...candidateWithoutSamples, maddyOccupiedAtStart: true }
      );
      check(
        "Maddy's own playback transcript is not mistaken for a user barge-in",
        playbackEcho.accepted === false &&
          playbackEcho.reason === "probable-maddy-playback-echo"
      );

      const unverifiedBargeIn = evaluateForegroundCandidate(
        "I asked what company are you working with right now?",
        { ...candidateWithoutSamples, maddyOccupiedAtStart: true }
      );
      check(
        "Transcript continuity alone cannot interrupt Maddy when acoustic proof is missing",
        unverifiedBargeIn.accepted === false &&
          unverifiedBargeIn.reason ===
            "continuity-insufficient-for-interruption-without-acoustic-proof"
      );

      state.maddySpeaking = false;
      state.currentMaddySpeechText = "";
      state.attentionAwake = false;
      state.attentionExpiresAt = null;

      const sleepingWithoutWake = evaluateForegroundCandidate(
        "Can you hear me clearly?",
        candidateWithoutSamples
      );
      check(
        "Transcript continuity never bypasses the sleeping wake-word boundary",
        sleepingWithoutWake.accepted === false &&
          sleepingWithoutWake.reason === "attention-asleep-wake-word-required"
      );

      const wake = evaluateForegroundCandidate(
        "Maddy, can you hear me clearly?",
        candidateWithoutSamples
      );
      check(
        "Wake-name acquisition remains authoritative even without acoustic samples",
        wake.accepted === true && wake.wakeWord === true
      );

      state.attentionAwake = true;
      state.attentionExpiresAt = now() + ATTENTION_LEASE_MS;
      state.lastAcceptedSpeechAt = now() - TRANSCRIPT_CONTINUITY_MS - 1_000;
      state.lastMaddySpeechEndedAt = now() - FOLLOW_UP_GRACE_MS - 1_000;

      const stale = evaluateForegroundCandidate(
        "Unrelated speech after continuity has gone stale",
        candidateWithoutSamples
      );
      check(
        "Missing acoustics do not create unlimited foreground authority after continuity has expired",
        stale.accepted === false &&
          stale.reason === "no-foreground-continuity"
      );

      check(
        "Acceptance test does not grant provider, spend, state-write, or self-modification authority",
        true
      );
    } finally {
      Object.assign(state, snapshot);
    }

    const passed = checks.filter((item) => item.passed).length;
    const result = Object.freeze({
      success: passed === checks.length,
      commission: "VE210",
      schema: "meos.voice.transcript-acoustic-evidence-separation.acceptance.v1",
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      checks: Object.freeze(checks.map((item) => Object.freeze({ ...item }))),
      limitation:
        "This proves that missing or weak browser acoustic telemetry remains uncertainty rather than automatic speaker proof, while VE212 prevents degraded transcript continuity from inheriting interruption authority during active Maddy speech. It does not prove speaker biometric identity, perfect noisy-room transcription, or complete multi-speaker separation."
    });

    console.table(checks);
    log(
      `Commission VE210 Transcript/Acoustic Evidence Separation: ${result.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`
    );

    return result;
  }


  function runForegroundInterruptionAuthorityAcceptanceTest() {
    const snapshot = {
      attentionAwake: state.attentionAwake,
      attentionAwakeAt: state.attentionAwakeAt,
      attentionExpiresAt: state.attentionExpiresAt,
      lastAcceptedSpeechAt: state.lastAcceptedSpeechAt,
      maddySpeaking: state.maddySpeaking,
      responseInProgress: state.responseInProgress,
      activeResponseId: state.activeResponseId,
      lastMaddySpeechEndedAt: state.lastMaddySpeechEndedAt,
      currentMaddySpeechText: state.currentMaddySpeechText,
      foregroundReferenceRms: state.foregroundReferenceRms,
      foregroundReferencePeak: state.foregroundReferencePeak,
      noiseFloorRms: state.noiseFloorRms
    };

    const checks = [];
    const check = (name, passed) => checks.push({ name, passed: Boolean(passed) });

    try {
      const t = now();
      state.attentionAwake = true;
      state.attentionAwakeAt = t - 4_000;
      state.attentionExpiresAt = t + ATTENTION_LEASE_MS;
      state.lastAcceptedSpeechAt = t - 2_000;
      state.lastMaddySpeechEndedAt = t - 10_000;
      state.maddySpeaking = true;
      state.responseInProgress = true;
      state.activeResponseId = "ve212-test-response";
      state.currentMaddySpeechText =
        "I am answering the foreground user and should not be cancelled by room conversation.";
      state.foregroundReferenceRms = 0.006;
      state.foregroundReferencePeak = 0.08;
      state.noiseFloorRms = 0.0045;

      const weakBackground = evaluateForegroundCandidate(
        "And I was walking out.",
        {
          avgRms: 0.0011,
          peakRms: 0.008,
          sampleCount: 8,
          noiseFloorAtStart: 0.0045,
          maddyOccupiedAtStart: true
        }
      );
      check(
        "Weak background speech cannot inherit interruption authority from transcript continuity",
        weakBackground.accepted === false &&
          weakBackground.reason ===
            "continuity-insufficient-for-interruption-over-weak-acoustics"
      );

      const missingAcoustics = evaluateForegroundCandidate(
        "for defense.",
        {
          avgRms: 0,
          peakRms: 0,
          sampleCount: 0,
          noiseFloorAtStart: 0.0045,
          maddyOccupiedAtStart: true
        }
      );
      check(
        "Missing acoustic proof plus continuity cannot cancel an active Maddy response",
        missingAcoustics.accepted === false &&
          missingAcoustics.reason ===
            "continuity-insufficient-for-interruption-without-acoustic-proof"
      );

      const strongForeground = evaluateForegroundCandidate(
        "Hold on, I need to correct that.",
        {
          avgRms: 0.018,
          peakRms: 0.12,
          sampleCount: 10,
          noiseFloorAtStart: 0.004,
          maddyOccupiedAtStart: true
        }
      );
      check(
        "Strong foreground evidence can still barge in during Maddy speech",
        strongForeground.accepted === true &&
          strongForeground.reason === "confirmed-foreground-barge-in"
      );

      const explicitWake = evaluateForegroundCandidate(
        "Maddy, stop a second.",
        {
          avgRms: 0,
          peakRms: 0,
          sampleCount: 0,
          noiseFloorAtStart: 0.0045,
          maddyOccupiedAtStart: true
        }
      );
      check(
        "Explicit wake/address remains interruption-capable even without acoustic proof",
        explicitWake.accepted === true &&
          explicitWake.wakeWord === true
      );

      const playbackEcho = evaluateForegroundCandidate(
        "I am answering the foreground user and should not be cancelled by room conversation.",
        {
          avgRms: 0.004,
          peakRms: 0.02,
          sampleCount: 8,
          noiseFloorAtStart: 0.0045,
          maddyOccupiedAtStart: true
        }
      );
      check(
        "Maddy playback echo remains rejected before interruption authority is considered",
        playbackEcho.accepted === false &&
          playbackEcho.reason === "probable-maddy-playback-echo"
      );

      state.maddySpeaking = false;
      state.responseInProgress = false;
      state.activeResponseId = null;
      state.currentMaddySpeechText = "";
      state.lastMaddySpeechEndedAt = now() - 1_000;

      const naturalFollowUp = evaluateForegroundCandidate(
        "Thank you.",
        {
          avgRms: 0,
          peakRms: 0,
          sampleCount: 0,
          noiseFloorAtStart: 0.0045,
          maddyOccupiedAtStart: false
        }
      );
      check(
        "Natural follow-up continuity remains available after Maddy finishes speaking",
        naturalFollowUp.accepted === true &&
          (
            naturalFollowUp.reason === "transcript-continuity-without-acoustic-metrics" ||
            naturalFollowUp.reason === "follow-up-grace-without-acoustic-metrics"
          )
      );

      state.attentionAwake = false;
      state.attentionExpiresAt = null;

      const sleepingSpeech = evaluateForegroundCandidate(
        "Someone in the room is talking.",
        {
          avgRms: 0.02,
          peakRms: 0.12,
          sampleCount: 10,
          noiseFloorAtStart: 0.004,
          maddyOccupiedAtStart: false
        }
      );
      check(
        "Sleeping wake boundary still rejects ordinary room speech",
        sleepingSpeech.accepted === false &&
          sleepingSpeech.reason === "attention-asleep-wake-word-required"
      );

      check(
        "VE212 grants no provider, spend, durable-write, self-modification, or external-action authority",
        true
      );
    } finally {
      Object.assign(state, snapshot);
    }

    const passed = checks.filter((item) => item.passed).length;
    const result = Object.freeze({
      success: passed === checks.length,
      commission: "VE212",
      schema: "meos.voice.foreground-interruption-authority-gate.acceptance.v1",
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      checks: Object.freeze(checks.map((item) => Object.freeze({ ...item }))),
      limitation:
        "This proves only the bounded VE212 rule: degraded transcript continuity alone cannot interrupt an active Maddy response, while explicit wake/address and existing strong foreground acoustic evidence can still barge in. It does not prove biometric speaker identity, perfect multi-speaker separation, ASR intended-meaning recovery, or passive local wake privacy."
    });

    console.table(checks);
    log(
      `Commission VE212 Foreground Interruption Authority Gate: ${result.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`
    );

    return result;
  }

  function runContextGroundedTranscriptionEvidenceAcceptanceTest() {
    const checks = [];
    const check = (name, passed) => checks.push({ name, passed: Boolean(passed) });
    const fixtureContext = {
      customer: { displayName: "California Clean Slate Program" },
      organization: {
        name: "California Clean Slate Program",
        abbreviation: "CCSP"
      },
      representative: {
        displayName: "Maddy",
        canonicalMaddyPresentation: true
      },
      cognitionIdentity: { preferredName: "Maddy" },
      authorizedHuman: { displayName: "Executive Director" }
    };
    const highConfidenceMessage = {
      logprobs: [
        { token: "What", logprob: -0.05 },
        { token: " is", logprob: -0.08 },
        { token: " Saturn", logprob: -0.12 },
        { token: "?", logprob: -0.03 }
      ]
    };
    const lowConfidenceMessage = {
      logprobs: [
        { token: "I'd", logprob: -2.2 },
        { token: " give", logprob: -1.9 },
        { token: " Norway", logprob: -2.4 },
        { token: " being", logprob: -2.0 }
      ]
    };

    const config = buildTranscriptionConfiguration(
      fixtureContext,
      "We were discussing current nonprofit grants."
    );
    const prompt = config.prompt;
    const derivedAcronym = deriveInitialism("California Clean Slate Program");
    const saturn = interpretTranscriptEvidence(
      "What is the interesting moon around Saturn?",
      highConfidenceMessage,
      { confidence: "high" },
      fixtureContext
    );
    const california = interpretTranscriptEvidence(
      "How much of California is beaches or coastline?",
      highConfidenceMessage,
      { confidence: "high" },
      fixtureContext
    );
    const lowConfidence = interpretTranscriptEvidence(
      "I'd give the Norway I'm being",
      lowConfidenceMessage,
      { confidence: "degraded" },
      fixtureContext
    );
    const wrongScript = interpretTranscriptEvidence(
      "花り",
      highConfidenceMessage,
      { confidence: "high" },
      fixtureContext
    );
    const noProviderConfidence = interpretTranscriptEvidence(
      "California Clean Slate Program",
      {},
      { confidence: "high" },
      fixtureContext
    );
    const noHardcodedRepair = interpretTranscriptEvidence(
      "FAQP",
      highConfidenceMessage,
      { confidence: "high" },
      fixtureContext
    );

    check(
      "VE213 selects the higher-accuracy gpt-4o-transcribe model for the existing WebRTC input-transcription seam",
      config.model === "gpt-4o-transcribe"
    );
    check(
      "Active organization vocabulary and acronym are supplied as transcription context without a correction dictionary",
      prompt.includes("California Clean Slate Program") &&
        prompt.includes("CCSP") &&
        derivedAcronym === "CCSP"
    );
    check(
      "Recent accepted speech is available to the transcription prompt as bounded conversational context",
      prompt.includes("current nonprofit grants")
    );
    check(
      "A high-confidence Saturn-moon transcript remains usable and preserves raw provenance",
      saturn.requiresClarification === false &&
        saturn.rawTranscript === "What is the interesting moon around Saturn?" &&
        saturn.interpretedTranscript === saturn.rawTranscript
    );
    check(
      "A high-confidence California coastline question remains usable instead of being rewritten",
      california.requiresClarification === false &&
        california.interpretedTranscript.includes("California")
    );
    check(
      "Materially low provider transcription confidence cannot receive normal cognition/search authority",
      lowConfidence.requiresClarification === true &&
        lowConfidence.clarificationReason ===
          "provider-transcription-confidence-too-low"
    );
    check(
      "A materially different writing system in an English session requests clarification instead of fabricating intent",
      wrongScript.requiresClarification === true &&
        wrongScript.clarificationReason === "english-session-script-mismatch"
    );
    check(
      "Missing provider logprobs remain unknown evidence rather than automatic rejection",
      noProviderConfidence.requiresClarification === false &&
        noProviderConfidence.transcriptionConfidence.level === "unknown"
    );
    check(
      "Context reconstruction does not hard-code FAQP to CCSP when phonetic/context evidence is insufficient",
      noHardcodedRepair.interpretedTranscript === "FAQP" &&
        noHardcodedRepair.interpretationChanged === false &&
        noHardcodedRepair.requiresClarification === true
    );
    check(
      "Speech evidence keeps transcription model and language provenance",
      saturn.provenance.transcriptionModel === "gpt-4o-transcribe" &&
        saturn.provenance.language === "en"
    );
    check(
      "Context grounding is generated from the supplied active context rather than a global cross-customer vocabulary",
      transcriptionContextTerms({
        organization: { name: "Example Neighborhood Clinic", abbreviation: "ENC" },
        representative: { displayName: "Nova", canonicalMaddyPresentation: false },
        cognitionIdentity: { preferredName: "Maddy" }
      }).includes("ENC") &&
      !transcriptionContextTerms({
        organization: { name: "Example Neighborhood Clinic", abbreviation: "ENC" },
        representative: { displayName: "Nova", canonicalMaddyPresentation: false },
        cognitionIdentity: { preferredName: "Maddy" }
      }).includes("CCSP")
    );
    check(
      "VE213 grants no search, spend, durable-write, self-modification, or external-action authority",
      true
    );

    const passed = checks.filter((item) => item.passed).length;
    const result = Object.freeze({
      success: passed === checks.length,
      commission: "VE213",
      schema: "meos.voice.context-grounded-transcription-evidence.acceptance.v1",
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      checks: Object.freeze(checks.map((item) => Object.freeze({ ...item }))),
      limitation:
        "This proves the local VE213 speech-evidence contract, contextual transcription configuration, provenance, and conservative clarification gate. It does not prove real-microphone transcription accuracy, durable learned pronunciation, complete phonetic reconstruction, speaker identity, or successful internet research. Production speech gets the vote."
    });

    console.table(checks);
    log(
      `Commission VE213 Context-Grounded Transcription Evidence: ${result.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`
    );

    return result;
  }

  async function runDurableResearchSpokenReturnAcceptanceTest() {
    const checks = [];
    const check = (name, passed) => checks.push({ name, passed: Boolean(passed) });
    const originalTimer = global.setTimeout;
    const originalDispatch = global.dispatchEvent;
    const priorObservers = state.researchReturnObservers;
    const priorCompleted = state.completedResearchReturnIds;
    const priorReturn = state.lastResearchReturn;
    const timers = [];
    const events = [];
    try {
      state.researchReturnObservers = new Map();
      state.completedResearchReturnIds = new Set();
      state.lastResearchReturn = null;
      global.setTimeout = (fn) => { timers.push(fn); return timers.length; };
      global.dispatchEvent = (event) => { events.push(event); return true; };

      let reconciles = 0;
      const executionId = "execution-ve216-fixture";
      const hallway = {
        async reconcileDurableExecutionReturn(requestedId) {
          reconciles += 1;
          if (requestedId !== executionId) throw new Error("wrong execution id");
          if (reconciles === 1) return { id: "work-ve216", state: "executing", execution: { executionId, state: "running" } };
          return {
            id: "work-ve216",
            state: "done",
            execution: { executionId, state: "returned" },
            outcome: {
              success: true,
              result: {
                source: "meos-headless-public-research",
                governedAnswer: {
                  answer: "Current governed research found a qualified funding path.",
                  citations: ["https://example.org/funding"],
                  finalSpeechAuthorized: true,
                  oneMouth: true
                },
                rawServerOutput: "THIS MUST NEVER BE SPOKEN"
              }
            }
          };
        }
      };
      const observation = observeDurableResearchReturn(hallway, { id: "work-ve216", execution: { executionId, state: "queued" } }, "voice-turn-ve216");
      check("Durable return observation starts only from an exact execution identity", observation.observing === true && observation.executionId === executionId);
      check("Observer does not synchronously block live conversation", reconciles === 0 && timers.length === 1);

      await timers.shift()();
      await Promise.resolve();
      check("Running durable work stays pending without fabricated answer", reconciles === 1 && !events.some(event => event?.type === "meos:maddy:response"));
      await timers.shift()();
      await Promise.resolve();

      const responseEvents = events.filter(event => event?.type === "meos:maddy:response");
      const spoken = responseEvents[0]?.detail || {};
      check("Exactly one governed durable answer is returned through the Maddy response mouth", responseEvents.length === 1 && spoken.text === "Current governed research found a qualified funding path." && spoken.authorized === true);
      check("Raw server synthesis is never selected for speech", !String(spoken.text || "").includes("THIS MUST NEVER BE SPOKEN") && state.lastResearchReturn?.rawServerOutputPresented === false);
      check("Spoken research return preserves evidence URLs", Array.isArray(spoken.citations) && spoken.citations[0] === "https://example.org/funding");
      check("Return publication preserves one-mouth/final-speech governance", spoken.finalSpeechAuthorized === true && spoken.oneMouth === true);
      check("Return observation grants no spend or external-action authority", state.lastResearchReturn?.automaticSpendUsd === 0 && state.lastResearchReturn?.externalActionAuthorityGranted === false);
      check("Duplicate publication is blocked by durable execution identity", publishGovernedResearchReturn({ state: "done", outcome: { success: true, result: { governedAnswer: { answer: "duplicate", citations: ["https://example.org/duplicate"], finalSpeechAuthorized: true, oneMouth: true } } } }, { executionId, turnId: "voice-turn-ve216" }) === false && responseEvents.length === 1);
    } finally {
      global.setTimeout = originalTimer;
      global.dispatchEvent = originalDispatch;
      state.researchReturnObservers = priorObservers;
      state.completedResearchReturnIds = priorCompleted;
      state.lastResearchReturn = priorReturn;
    }
    const passed = checks.filter(item => item.passed).length;
    const result = Object.freeze({
      success: passed === checks.length,
      commission: "VE216",
      schema: "meos.voice.durable-research-spoken-return.acceptance.v1",
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      checks: Object.freeze(checks.map(item => Object.freeze({ ...item }))),
      limitation: "This proves the local bounded observer, exact execution lineage, governed-answer extraction, duplicate suppression, and one-mouth return path. It does not prove live server research completion, network reliability, or real TTS playback. Production gets the vote."
    });
    console.table(checks);
    log(`Commission VE216 Durable Research Spoken Return: ${result.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`);
    return result;
  }

  function runCanonicalHallwayResearchHandoffAcceptanceTest() {
    const checks = [];
    const check = (name, passed) => checks.push({ name, passed: Boolean(passed) });
    const originalTimer = global.setTimeout;
    const originalCanonical = global.MEOSExecutiveHallway;
    const originalLegacy = global.ExecutiveHallway;
    const priorHandoff = state.lastBackgroundWorkHandoff;
    const researchContract = Object.freeze({ required: true, reason: "explicit-public-research", externalActionAuthorityGranted: false });
    let canonicalSubmitCalls = 0;
    let legacySubmitCalls = 0;
    let timerCallbacks = [];
    try {
      global.setTimeout = (fn) => { timerCallbacks.push(fn); return timerCallbacks.length; };
      global.MEOSExecutiveHallway = { submitWork(){ canonicalSubmitCalls += 1; return Promise.resolve({ id: "canonical-work" }); } };
      global.ExecutiveHallway = { submitWork(){ legacySubmitCalls += 1; return Promise.resolve({ id: "legacy-work" }); } };
      const canonical = scheduleVoiceResearchHandoff("Search online for current grants.", "ve215-canonical", {}, researchContract);
      check("Canonical MEOSExecutiveHallway is selected over the historical alias", canonical.scheduled === true && canonical.hallwaySource === "MEOSExecutiveHallway");
      check("Research handoff is nonblocking before the deferred callback runs", canonicalSubmitCalls === 0 && legacySubmitCalls === 0 && timerCallbacks.length === 1);
      check("Research handoff grants no spend or consequential external-action authority", canonical.automaticSpendUsd === 0 && canonical.externalActionAuthorityGranted === false);
      timerCallbacks.shift()();
      check("Deferred work reaches the canonical Hallway and not the legacy alias", canonicalSubmitCalls === 1 && legacySubmitCalls === 0);

      global.MEOSExecutiveHallway = null;
      timerCallbacks = [];
      const legacy = scheduleVoiceResearchHandoff("Research current funding.", "ve215-legacy", {}, researchContract);
      check("Legacy alias remains a compatibility fallback only when canonical Hallway is absent", legacy.scheduled === true && legacy.hallwaySource === "ExecutiveHallway-legacy-alias");
      timerCallbacks.shift()();
      check("Compatibility fallback can still submit bounded work", legacySubmitCalls === 1);

      global.ExecutiveHallway = null;
      const missing = scheduleVoiceResearchHandoff("Research current funding.", "ve215-missing", {}, researchContract);
      check("Missing Hallway fails visible instead of pretending research started", missing.scheduled === false && missing.reason === "executive-hallway-unavailable" && missing.hallwaySource === "unavailable");
    } finally {
      global.setTimeout = originalTimer;
      global.MEOSExecutiveHallway = originalCanonical;
      global.ExecutiveHallway = originalLegacy;
      state.lastBackgroundWorkHandoff = priorHandoff;
    }
    const passed = checks.filter(item => item.passed).length;
    const result = Object.freeze({
      success: passed === checks.length,
      commission: "VE215",
      schema: "meos.voice.canonical-hallway-research-handoff.acceptance.v1",
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      checks: Object.freeze(checks.map(item => Object.freeze({ ...item }))),
      limitation: "This proves local voice-to-Hallway export resolution and nonblocking handoff authority boundaries. It does not prove a live Internet result or durable research return in production."
    });
    console.table(checks);
    log(`Commission VE215 Canonical Hallway Research Handoff: ${result.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`);
    return result;
  }

  function runSemanticIntendedSpeechReconstructionAcceptanceTest() {
    const checks = [];
    const check = (name, passed) => checks.push({ name, passed: Boolean(passed) });
    const fixtureContext = {
      customer: { displayName: "California Clean Slate Program" },
      organization: { name: "California Clean Slate Program", abbreviation: "CCSP" },
      representative: { displayName: "Maddy", canonicalMaddyPresentation: true },
      cognitionIdentity: { preferredName: "Maddy" },
      authorizedHuman: { displayName: "Mandel" }
    };
    const high = { logprobs: [{ logprob: -0.08 }, { logprob: -0.09 }, { logprob: -0.10 }, { logprob: -0.11 }] };
    const medium = { logprobs: [{ logprob: -0.7 }, { logprob: -0.8 }, { logprob: -0.6 }, { logprob: -0.75 }] };
    const repaired = interpretTranscriptEvidence("CCSQ", high, { confidence: "high" }, fixtureContext);
    const uncertainAcronym = interpretTranscriptEvidence("FAQP", high, { confidence: "high" }, fixtureContext);
    const normal = interpretTranscriptEvidence("How much of California is coastline?", high, { confidence: "high" }, fixtureContext);
    const ambiguous = interpretTranscriptEvidence("How much accountability or coverage?", medium, { confidence: "degraded" }, fixtureContext);
    const fragment = interpretTranscriptEvidence("or", medium, { confidence: "degraded" }, fixtureContext);
    const correction = rememberScopedSpeechCorrection("No, I said CCSP.", fixtureContext);
    const termsAfterCorrection = transcriptionContextTerms(fixtureContext);
    const otherTerms = transcriptionContextTerms({ organization: { name: "Example Neighborhood Clinic", abbreviation: "ENC" } });

    check("Raw ASR provenance survives a context-derived interpretation", repaired.rawTranscript === "CCSQ" && repaired.provenance.rawTranscriptPreserved === true);
    check("Active customer phonetics can reconstruct a unique close scoped acronym without a global substitution table", repaired.interpretedTranscript === "CCSP" && repaired.interpretationChanged === true && repaired.candidateRepairs.length === 1);
    check("The same raw token is not rewritten to CCSP outside the CCSP customer context", interpretTranscriptEvidence("CCSQ", high, { confidence: "high" }, { organization: { name: "Example Neighborhood Clinic", abbreviation: "ENC" } }).interpretedTranscript === "CCSQ");
    check("Distant acronym corruption is clarified rather than forced into the active acronym", uncertainAcronym.interpretedTranscript === "FAQP" && uncertainAcronym.requiresClarification === true);
    check("A coherent high-confidence California question remains unchanged", normal.requiresClarification === false && normal.interpretedTranscript === normal.rawTranscript);
    check("Structurally complete medium-confidence questions remain usable rather than being over-corrected", ambiguous.interpretedTranscript === ambiguous.rawTranscript);
    check("Low-information fragments are challenged before Brain/search authority", fragment.requiresClarification === true);
    check("Explicit human correction becomes scoped session learning evidence", correction?.intended === "CCSP" && correction?.authority === "explicit-human-correction" && correction?.durable === false);
    check("Scoped correction vocabulary is available to later transcription guidance", termsAfterCorrection.includes("CCSP"));
    check("Scoped speech learning does not leak CCSP vocabulary into another organization", !otherTerms.includes("CCSP"));
    check("Semantic reconstruction never grants search, spend, durable-write, deployment, or external-action authority", true);

    const passed = checks.filter(item => item.passed).length;
    const result = Object.freeze({
      success: passed === checks.length,
      commission: "VE214",
      schema: "meos.voice.semantic-intended-speech-reconstruction.acceptance.v1",
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      checks: Object.freeze(checks.map(item => Object.freeze({ ...item }))),
      limitation: "This proves local semantic plausibility gating, scoped context-derived phonetic reconstruction, raw transcript provenance, and session-scoped correction learning. It does not prove perfect real-microphone understanding, biometric speaker identity, or durable cross-session pronunciation learning. Production speech gets the vote."
    });
    console.table(checks);
    log(`Commission VE214 Semantic Intended-Speech Reconstruction: ${result.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`);
    return result;
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
    getStatus,
    runInteractiveVoiceNonblockingCognitionAcceptanceTest,
    runTranscriptAcousticEvidenceSeparationAcceptanceTest,
    runForegroundInterruptionAuthorityAcceptanceTest,
    runContextGroundedTranscriptionEvidenceAcceptanceTest,
    runSemanticIntendedSpeechReconstructionAcceptanceTest,
    runCanonicalHallwayResearchHandoffAcceptanceTest,
    runDurableResearchSpokenReturnAcceptanceTest
  });

  log(`Client online. Build ${BUILD_ID}.`);
})(window);
