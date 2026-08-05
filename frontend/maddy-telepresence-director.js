/**
 * Maddy Executive Operating System (MEOS)
 * Maddy Telepresence Director
 *
 * Version: 1.0.0
 * Build: MTD100-WELCOME-BACK-20260805-A
 *
 * Purpose:
 * - Direct Maddy's first interactive telepresence performance.
 * - Treat MEOS startup as reconnecting to Headquarters, not launching a chatbot.
 * - Coordinate materialization, working, recognition, greeting, and return-to-work.
 * - Prefer the user's known preferred name without assuming a job title.
 * - Keep behavior governed by the Presence Engine and visual performance governed
 *   by the Maddy Digital Actor Renderer.
 *
 * Experience Standard:
 * Headquarters is already operating.
 * Maddy is already working.
 * The user reconnects.
 * Maddy notices them naturally.
 * She makes eye contact.
 * She offers a warm professional smile.
 * She says "Welcome back" and uses the preferred name when known.
 * She returns to work unless executive context requires continued attention.
 */

(() => {
  "use strict";

  const NAME = "MEOS Maddy Telepresence Director";
  const VERSION = "1.0.0";
  const BUILD_ID = "MTD100-WELCOME-BACK-20260805-A";
  const SCHEMA = "meos.maddy-telepresence-director.v1";

  const DIRECTOR_STATES = Object.freeze({
    IDLE: "idle",
    PREPARING: "preparing",
    MATERIALIZING: "materializing",
    WORKING: "working",
    NOTICING_USER: "noticing-user",
    GREETING: "greeting",
    BRIEFING: "briefing",
    RETURNING_TO_WORK: "returning-to-work",
    COMPLETE: "complete",
    INTERRUPTED: "interrupted",
    ERROR: "error"
  });

  const DEFAULT_CONFIG = Object.freeze({
    enabled: true,
    autoRunOncePerPage: false,
    usePreferredName: true,
    materializeDurationMs: 9000,
    preNoticeWorkingDurationMs: 1100,
    recognitionPauseMs: 850,
    smileHoldMs: 700,
    postGreetingHoldMs: 900,
    returnToWorkDelayMs: 550,
    greetingCooldownMs: 180000,
    speakingTimeoutMs: 30000,
    debug: false
  });

  const state = {
    initialized: false,
    running: false,
    completedThisPage: false,
    currentState: DIRECTOR_STATES.IDLE,
    previousState: null,
    sequenceId: 0,
    activeSequenceId: null,
    startedAt: null,
    completedAt: null,
    lastGreetingAt: null,
    lastGreetingText: null,
    lastResolvedName: null,
    lastError: null,
    listenersInstalled: false,
    speechConnected: false,
    rendererConnected: false,
    presenceConnected: false,
    config: {
      ...DEFAULT_CONFIG
    },
    history: []
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function clone(value) {
    if (value === undefined) return undefined;

    if (typeof structuredClone === "function") {
      try {
        return structuredClone(value);
      } catch (error) {
        // Fall through to JSON cloning.
      }
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function normalizeWhitespace(value) {
    return typeof value === "string"
      ? value.replace(/\s+/g, " ").trim()
      : "";
  }

  function wait(durationMs) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, Math.max(0, Number(durationMs) || 0));
    });
  }

  function emit(name, detail = {}) {
    const eventName = `meos:maddy-telepresence:${name}`;
    const payload = {
      schema: "meos.maddy-telepresence.event.v1",
      director: NAME,
      version: VERSION,
      buildId: BUILD_ID,
      eventName,
      emittedAt: nowIso(),
      state: state.currentState,
      detail: clone(detail)
    };

    document.dispatchEvent(new CustomEvent(eventName, {
      detail: payload
    }));

    document.dispatchEvent(new CustomEvent("meos:maddy-telepresence", {
      detail: payload
    }));

    if (state.config.debug) {
      console.debug(`[${NAME}] ${eventName}`, payload);
    }

    return payload;
  }

  function addHistory(type, detail = {}) {
    const entry = {
      id: `telepresence-${Date.now()}-${state.history.length + 1}`,
      type,
      occurredAt: nowIso(),
      state: state.currentState,
      detail: clone(detail)
    };

    state.history.push(entry);

    if (state.history.length > 200) {
      state.history.splice(0, state.history.length - 200);
    }

    return entry;
  }

  function transition(nextState, detail = {}) {
    if (!Object.values(DIRECTOR_STATES).includes(nextState)) {
      throw new TypeError(`${NAME}: invalid director state "${String(nextState)}".`);
    }

    if (state.currentState === nextState) {
      return getSnapshot();
    }

    state.previousState = state.currentState;
    state.currentState = nextState;

    addHistory("state-change", {
      from: state.previousState,
      to: nextState,
      ...detail
    });

    emit("state", {
      previous: state.previousState,
      current: nextState,
      ...detail
    });

    return getSnapshot();
  }

  function getPresenceEngine() {
    return window.MaddyPresence || window.MEOSMaddyPresence || null;
  }

  function getRenderer() {
    return window.MaddyDigitalActorRenderer ||
      window.MEOSMaddyDigitalActorRenderer ||
      null;
  }

  function getSpeechEngine() {
    return window.MaddySpeech ||
      window.MEOSMaddySpeech ||
      window.maddySpeech ||
      null;
  }

  function readNameCandidate(value) {
    if (typeof value === "string") {
      return normalizeWhitespace(value);
    }

    if (!value || typeof value !== "object") {
      return "";
    }

    const candidates = [
      value.preferredName,
      value.displayName,
      value.firstName,
      value.givenName,
      value.name
    ];

    for (const candidate of candidates) {
      const resolved = normalizeWhitespace(candidate);
      if (resolved) return resolved;
    }

    return "";
  }

  function resolvePreferredName(options = {}) {
    const explicit = readNameCandidate(options.preferredName || options.user);
    if (explicit) {
      state.lastResolvedName = explicit;
      return explicit;
    }

    const sources = [
      window.MEOSUserProfile,
      window.MaddyUserProfile,
      window.UserProfile,
      window.MEOSFounderProfile,
      window.FounderProfile,
      window.CCSPFounderProfile,
      window.currentUser,
      window.user
    ];

    for (const source of sources) {
      const resolved = readNameCandidate(source);
      if (resolved) {
        state.lastResolvedName = resolved;
        return resolved;
      }
    }

    const bodyName = normalizeWhitespace(
      document.body?.dataset?.preferredName ||
      document.documentElement?.dataset?.preferredName
    );

    if (bodyName) {
      state.lastResolvedName = bodyName;
      return bodyName;
    }

    state.lastResolvedName = null;
    return null;
  }

  function buildGreeting(options = {}) {
    const name = state.config.usePreferredName
      ? resolvePreferredName(options)
      : null;

    const baseGreeting = normalizeWhitespace(options.greeting) || "Welcome back";

    const text = name
      ? `${baseGreeting}, ${name}.`
      : `${baseGreeting}.`;

    state.lastGreetingText = text;

    return {
      text,
      preferredName: name,
      personalized: Boolean(name)
    };
  }

  function canGreetNow(options = {}) {
    if (options.force === true) {
      return true;
    }

    if (!state.lastGreetingAt) {
      return true;
    }

    const elapsed = Date.now() - new Date(state.lastGreetingAt).getTime();
    return elapsed >= state.config.greetingCooldownMs;
  }

  async function requestPerformance(performance, options = {}) {
    const renderer = getRenderer();

    if (!renderer) {
      emit("performance-unavailable", {
        performance,
        reason: "renderer-unavailable"
      });

      return {
        success: false,
        reason: "renderer-unavailable",
        performance
      };
    }

    try {
      const snapshot = renderer.getSnapshot?.();

      if (!snapshot?.initialized || !snapshot?.mounted) {
        emit("performance-unavailable", {
          performance,
          reason: "renderer-not-mounted"
        });

        return {
          success: false,
          reason: "renderer-not-mounted",
          performance
        };
      }

      const result = await renderer.transitionTo(performance, {
        mode: options.mode || "professional",
        reason: options.reason || "telepresence-direction"
      });

      return result;
    } catch (error) {
      state.lastError = {
        name: error?.name || "PerformanceDirectionError",
        message: error?.message || String(error),
        occurredAt: nowIso()
      };

      emit("performance-error", {
        performance,
        error: state.lastError
      });

      return {
        success: false,
        reason: "performance-error",
        error: state.lastError
      };
    }
  }

  function setPresenceState(stateName, options = {}) {
    const presence = getPresenceEngine();

    if (!presence) {
      return false;
    }

    try {
      presence.transitionState?.(stateName, {
        force: options.force === true,
        reason: options.reason || "telepresence-direction"
      });

      return true;
    } catch (error) {
      if (options.force !== true) {
        try {
          presence.transitionState?.(stateName, {
            force: true,
            reason: options.reason || "telepresence-direction-forced"
          });

          return true;
        } catch (forcedError) {
          state.lastError = {
            name: forcedError?.name || "PresenceDirectionError",
            message: forcedError?.message || String(forcedError),
            occurredAt: nowIso()
          };
        }
      }

      return false;
    }
  }

  function setPresenceEmotion(emotion, reason) {
    const presence = getPresenceEngine();

    try {
      presence?.setEmotion?.(emotion, {
        reason: reason || "telepresence-direction"
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  function setPresenceActivity(activity, reason) {
    const presence = getPresenceEngine();

    try {
      presence?.setActivity?.(activity, {
        reason: reason || "telepresence-direction"
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  function setPresenceAttention(attention, reason) {
    const presence = getPresenceEngine();

    try {
      presence?.lookAt?.(attention, {
        reason: reason || "telepresence-direction"
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async function speakText(text, options = {}) {
    const speech = getSpeechEngine();

    if (!speech) {
      emit("speech-unavailable", {
        text,
        reason: "speech-engine-unavailable"
      });

      return {
        success: false,
        reason: "speech-engine-unavailable"
      };
    }

    const candidates = [
      "speak",
      "say",
      "speakText",
      "enqueue"
    ];

    const methodName = candidates.find((name) => typeof speech[name] === "function");

    if (!methodName) {
      emit("speech-unavailable", {
        text,
        reason: "compatible-speech-method-unavailable"
      });

      return {
        success: false,
        reason: "compatible-speech-method-unavailable"
      };
    }

    const speakingStartedAt = Date.now();

    try {
      const result = speech[methodName](text, {
        mode: options.mode || "professional",
        emotion: options.emotion || "warm",
        reason: options.reason || "telepresence-greeting"
      });

      if (result && typeof result.then === "function") {
        const timeout = new Promise((resolve) => {
          window.setTimeout(() => {
            resolve({
              success: false,
              reason: "speech-timeout"
            });
          }, state.config.speakingTimeoutMs);
        });

        const resolved = await Promise.race([
          result.then((value) => ({
            success: true,
            value
          })),
          timeout
        ]);

        return {
          ...resolved,
          durationMs: Date.now() - speakingStartedAt
        };
      }

      return {
        success: true,
        value: result,
        durationMs: Date.now() - speakingStartedAt
      };
    } catch (error) {
      state.lastError = {
        name: error?.name || "SpeechDirectionError",
        message: error?.message || String(error),
        occurredAt: nowIso()
      };

      emit("speech-error", {
        text,
        error: state.lastError
      });

      return {
        success: false,
        reason: "speech-error",
        error: state.lastError
      };
    }
  }

  function assertActiveSequence(sequenceId) {
    if (state.activeSequenceId !== sequenceId) {
      const error = new Error(`${NAME}: sequence was superseded.`);
      error.name = "TelepresenceSequenceInterrupted";
      throw error;
    }
  }

  async function runWelcomeBackSequence(options = {}) {
    if (!state.config.enabled) {
      return {
        success: false,
        reason: "director-disabled"
      };
    }

    if (state.running && options.force !== true) {
      return {
        success: false,
        reason: "sequence-already-running"
      };
    }

    if (!canGreetNow(options)) {
      return {
        success: false,
        reason: "greeting-cooldown-active",
        lastGreetingAt: state.lastGreetingAt
      };
    }

    if (state.running && options.force === true) {
      interrupt("replaced-by-forced-sequence");
    }

    const sequenceId = ++state.sequenceId;
    state.activeSequenceId = sequenceId;
    state.running = true;
    state.startedAt = nowIso();
    state.completedAt = null;
    state.lastError = null;

    const mode = options.mode === "personal"
      ? "personal"
      : "professional";

    const greeting = buildGreeting(options);

    addHistory("welcome-sequence-started", {
      sequenceId,
      mode,
      greeting
    });

    emit("welcome-started", {
      sequenceId,
      mode,
      greeting
    });

    try {
      transition(DIRECTOR_STATES.PREPARING, {
        sequenceId
      });

      const presence = getPresenceEngine();
      const renderer = getRenderer();

      state.presenceConnected = Boolean(presence);
      state.rendererConnected = Boolean(renderer);
      state.speechConnected = Boolean(getSpeechEngine());

      if (presence?.setMode) {
        presence.setMode(mode, {
          reason: "telepresence-welcome-sequence"
        });
      }

      transition(DIRECTOR_STATES.MATERIALIZING, {
        sequenceId
      });

      setPresenceState("booting", {
        force: true,
        reason: "telepresence-materialization"
      });
      setPresenceActivity("transitioning", "telepresence-materialization");
      setPresenceEmotion("calm", "telepresence-materialization");
      setPresenceAttention("environment", "telepresence-materialization");

      await requestPerformance("materialize", {
        mode,
        reason: "telepresence-materialization"
      });

      await wait(
        Number.isFinite(options.materializeDurationMs)
          ? options.materializeDurationMs
          : state.config.materializeDurationMs
      );

      assertActiveSequence(sequenceId);

      transition(DIRECTOR_STATES.WORKING, {
        sequenceId
      });

      setPresenceState("working", {
        force: true,
        reason: "telepresence-already-working"
      });
      setPresenceActivity("reviewing", "telepresence-already-working");
      setPresenceEmotion("focused", "telepresence-already-working");
      setPresenceAttention(
        options.initialAttention || "document",
        "telepresence-already-working"
      );

      await requestPerformance(
        options.initialPerformance || "reading",
        {
          mode,
          reason: "telepresence-already-working"
        }
      );

      await wait(
        Number.isFinite(options.preNoticeWorkingDurationMs)
          ? options.preNoticeWorkingDurationMs
          : state.config.preNoticeWorkingDurationMs
      );

      assertActiveSequence(sequenceId);

      transition(DIRECTOR_STATES.NOTICING_USER, {
        sequenceId
      });

      setPresenceState("listening", {
        force: true,
        reason: "telepresence-user-arrived"
      });
      setPresenceActivity("listening", "telepresence-user-arrived");
      setPresenceEmotion("interested", "telepresence-user-arrived");
      setPresenceAttention("executive-director", "telepresence-user-arrived");

      await requestPerformance("listening", {
        mode,
        reason: "telepresence-user-arrived"
      });

      await wait(
        Number.isFinite(options.recognitionPauseMs)
          ? options.recognitionPauseMs
          : state.config.recognitionPauseMs
      );

      assertActiveSequence(sequenceId);

      setPresenceEmotion(
        options.greetingEmotion || "happy",
        "telepresence-welcoming-smile"
      );

      emit("welcoming-smile", {
        sequenceId,
        preferredName: greeting.preferredName,
        personalized: greeting.personalized
      });

      await wait(
        Number.isFinite(options.smileHoldMs)
          ? options.smileHoldMs
          : state.config.smileHoldMs
      );

      assertActiveSequence(sequenceId);

      transition(DIRECTOR_STATES.GREETING, {
        sequenceId,
        greeting
      });

      setPresenceState("speaking", {
        force: true,
        reason: "telepresence-welcome-back"
      });
      setPresenceActivity("speaking", "telepresence-welcome-back");
      setPresenceAttention("executive-director", "telepresence-welcome-back");

      await requestPerformance("speaking", {
        mode,
        reason: "telepresence-welcome-back"
      });

      const speechResult = options.silent === true
        ? {
            success: true,
            silent: true
          }
        : await speakText(greeting.text, {
            mode,
            emotion: "warm",
            reason: "telepresence-welcome-back"
          });

      state.lastGreetingAt = nowIso();

      emit("greeting-delivered", {
        sequenceId,
        greeting,
        speechResult
      });

      await wait(
        Number.isFinite(options.postGreetingHoldMs)
          ? options.postGreetingHoldMs
          : state.config.postGreetingHoldMs
      );

      assertActiveSequence(sequenceId);

      if (options.briefingText) {
        transition(DIRECTOR_STATES.BRIEFING, {
          sequenceId
        });

        const briefingText = normalizeWhitespace(options.briefingText);

        if (briefingText) {
          await speakText(briefingText, {
            mode,
            emotion: options.briefingEmotion || "focused",
            reason: "telepresence-opening-brief"
          });
        }
      }

      transition(DIRECTOR_STATES.RETURNING_TO_WORK, {
        sequenceId
      });

      await wait(
        Number.isFinite(options.returnToWorkDelayMs)
          ? options.returnToWorkDelayMs
          : state.config.returnToWorkDelayMs
      );

      assertActiveSequence(sequenceId);

      setPresenceState("working", {
        force: true,
        reason: "telepresence-welcome-complete"
      });
      setPresenceActivity(
        options.returnActivity || "monitoring",
        "telepresence-welcome-complete"
      );
      setPresenceEmotion(
        options.returnEmotion || "focused",
        "telepresence-welcome-complete"
      );
      setPresenceAttention(
        options.returnAttention || "mission",
        "telepresence-welcome-complete"
      );

      await requestPerformance(
        options.returnPerformance || "working",
        {
          mode,
          reason: "telepresence-welcome-complete"
        }
      );

      transition(DIRECTOR_STATES.COMPLETE, {
        sequenceId
      });

      state.running = false;
      state.completedThisPage = true;
      state.completedAt = nowIso();
      state.activeSequenceId = null;

      addHistory("welcome-sequence-completed", {
        sequenceId,
        greeting,
        completedAt: state.completedAt
      });

      emit("welcome-completed", {
        sequenceId,
        greeting,
        completedAt: state.completedAt
      });

      return {
        success: true,
        sequenceId,
        greeting,
        speechResult,
        completedAt: state.completedAt
      };
    } catch (error) {
      const interrupted = error?.name === "TelepresenceSequenceInterrupted";

      state.running = false;
      state.activeSequenceId = null;
      state.lastError = {
        name: error?.name || "TelepresenceSequenceError",
        message: error?.message || String(error),
        occurredAt: nowIso()
      };

      transition(
        interrupted
          ? DIRECTOR_STATES.INTERRUPTED
          : DIRECTOR_STATES.ERROR,
        {
          sequenceId,
          error: state.lastError
        }
      );

      emit(
        interrupted
          ? "welcome-interrupted"
          : "welcome-error",
        {
          sequenceId,
          error: state.lastError
        }
      );

      return {
        success: false,
        sequenceId,
        reason: interrupted
          ? "sequence-interrupted"
          : "sequence-error",
        error: state.lastError
      };
    }
  }

  function interrupt(reason = "manual-interruption") {
    if (!state.running) {
      return false;
    }

    const interruptedSequenceId = state.activeSequenceId;

    state.activeSequenceId = null;
    state.running = false;

    transition(DIRECTOR_STATES.INTERRUPTED, {
      sequenceId: interruptedSequenceId,
      reason
    });

    emit("interrupted", {
      sequenceId: interruptedSequenceId,
      reason
    });

    return true;
  }

  function configure(options = {}) {
    if (!options || typeof options !== "object") {
      throw new TypeError(`${NAME}: configuration must be an object.`);
    }

    const numericKeys = [
      "materializeDurationMs",
      "preNoticeWorkingDurationMs",
      "recognitionPauseMs",
      "smileHoldMs",
      "postGreetingHoldMs",
      "returnToWorkDelayMs",
      "greetingCooldownMs",
      "speakingTimeoutMs"
    ];

    numericKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(options, key)) {
        const value = Number(options[key]);

        if (!Number.isFinite(value) || value < 0) {
          throw new TypeError(`${NAME}: "${key}" must be a non-negative number.`);
        }

        state.config[key] = Math.floor(value);
      }
    });

    [
      "enabled",
      "autoRunOncePerPage",
      "usePreferredName",
      "debug"
    ].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(options, key)) {
        state.config[key] = Boolean(options[key]);
      }
    });

    addHistory("configuration-updated", {
      config: {
        ...state.config
      }
    });

    emit("configured", {
      config: {
        ...state.config
      }
    });

    return {
      ...state.config
    };
  }

  function installListeners() {
    if (state.listenersInstalled) {
      return true;
    }

    document.addEventListener(
      "meos:dashboard:digital-actor-mounted",
      () => {
        state.rendererConnected = Boolean(getRenderer());

        if (
          state.config.autoRunOncePerPage &&
          !state.completedThisPage &&
          !state.running
        ) {
          runWelcomeBackSequence().catch((error) => {
            console.error(`${NAME}: automatic welcome sequence failed.`, error);
          });
        }
      }
    );

    document.addEventListener(
      "meos:maddy-presence:listening-started",
      () => {
        if (state.running && state.currentState === DIRECTOR_STATES.GREETING) {
          interrupt("user-barged-in");
        }
      }
    );

    state.listenersInstalled = true;
    return true;
  }

  function initialize(options = {}) {
    if (state.initialized) {
      return getSnapshot();
    }

    if (options.config) {
      configure(options.config);
    }

    installListeners();

    state.presenceConnected = Boolean(getPresenceEngine());
    state.rendererConnected = Boolean(getRenderer());
    state.speechConnected = Boolean(getSpeechEngine());
    state.initialized = true;

    addHistory("initialized", {
      presenceConnected: state.presenceConnected,
      rendererConnected: state.rendererConnected,
      speechConnected: state.speechConnected
    });

    emit("initialized", {
      presenceConnected: state.presenceConnected,
      rendererConnected: state.rendererConnected,
      speechConnected: state.speechConnected
    });

    return getSnapshot();
  }

  function reset(options = {}) {
    interrupt("director-reset");

    state.completedThisPage = false;
    state.currentState = DIRECTOR_STATES.IDLE;
    state.previousState = null;
    state.startedAt = null;
    state.completedAt = null;
    state.lastGreetingAt = options.keepGreetingCooldown === true
      ? state.lastGreetingAt
      : null;
    state.lastGreetingText = null;
    state.lastResolvedName = null;
    state.lastError = null;
    state.history.length = 0;

    emit("reset");

    return getSnapshot();
  }

  function getSnapshot() {
    return {
      schema: SCHEMA,
      name: NAME,
      version: VERSION,
      buildId: BUILD_ID,
      initialized: state.initialized,
      running: state.running,
      completedThisPage: state.completedThisPage,
      currentState: state.currentState,
      previousState: state.previousState,
      sequenceId: state.sequenceId,
      activeSequenceId: state.activeSequenceId,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      lastGreetingAt: state.lastGreetingAt,
      lastGreetingText: state.lastGreetingText,
      lastResolvedName: state.lastResolvedName,
      lastError: state.lastError
        ? {
            ...state.lastError
          }
        : null,
      connections: {
        presence: state.presenceConnected,
        renderer: state.rendererConnected,
        speech: state.speechConnected
      },
      config: {
        ...state.config
      },
      historyCount: state.history.length
    };
  }

  function getHistory(limit = state.history.length) {
    const normalizedLimit = Number.isFinite(limit)
      ? Math.max(1, Math.floor(limit))
      : state.history.length;

    return clone(state.history.slice(-normalizedLimit));
  }

  function runAcceptanceTest() {
    const anonymousGreeting = buildGreeting({
      preferredName: null,
      greeting: "Welcome back"
    });

    const namedGreeting = buildGreeting({
      preferredName: "Mandel",
      greeting: "Welcome back"
    });

    const checks = [
      ["Director exposes version 1.0.0", VERSION === "1.0.0"],
      ["Welcome sequence is available", typeof runWelcomeBackSequence === "function"],
      ["Materialization state exists", DIRECTOR_STATES.MATERIALIZING === "materializing"],
      ["Working state exists", DIRECTOR_STATES.WORKING === "working"],
      ["User recognition state exists", DIRECTOR_STATES.NOTICING_USER === "noticing-user"],
      ["Greeting state exists", DIRECTOR_STATES.GREETING === "greeting"],
      ["Return-to-work state exists", DIRECTOR_STATES.RETURNING_TO_WORK === "returning-to-work"],
      ["Anonymous greeting does not assume a title", anonymousGreeting.text === "Welcome back."],
      ["Known preferred name is used naturally", namedGreeting.text === "Welcome back, Mandel."],
      ["Preferred name resolver is available", typeof resolvePreferredName === "function"],
      ["Presence Engine direction is available", typeof setPresenceState === "function"],
      ["Digital Actor performance direction is available", typeof requestPerformance === "function"],
      ["Speech direction is available", typeof speakText === "function"],
      ["Greeting cooldown protection is available", typeof canGreetNow === "function"],
      ["Barge-in interruption is available", typeof interrupt === "function"],
      ["Director snapshot is available", getSnapshot().schema === SCHEMA]
    ].map(([name, passed]) => ({
      name,
      passed: Boolean(passed)
    }));

    state.lastGreetingText = null;
    state.lastResolvedName = null;

    return {
      success: checks.every((check) => check.passed),
      schema: "meos.maddy-telepresence-director.acceptance.v1",
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
    states: DIRECTOR_STATES,

    initialize,
    configure,
    reset,

    runWelcomeBackSequence,
    interrupt,

    resolvePreferredName,
    buildGreeting,

    getSnapshot,
    getHistory,
    runAcceptanceTest
  });

  window.MaddyTelepresenceDirector = api;
  window.MEOSMaddyTelepresenceDirector = api;

  document.dispatchEvent(new CustomEvent(
    "meos:maddy-telepresence:registered",
    {
      detail: {
        schema: "meos.maddy-telepresence.registration.v1",
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
