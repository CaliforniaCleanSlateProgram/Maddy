/**
 * Maddy Executive Operating System (MEOS)
 * Maddy Presence Engine
 *
 * Version: 1.0.0
 * Build: MPE100-FOUNDATIONAL-PRESENCE-20260805-A
 *
 * Purpose:
 * - Establish Maddy's persistent executive-presence state.
 * - Separate behavior and expression from visual rendering.
 * - Provide one governed interface for dashboards, voice, offices,
 *   executive reasoning, and future animation systems.
 * - Preserve professional and personal mode boundaries.
 * - Broadcast transparent, inspectable presence events.
 *
 * Architecture:
 * Executive Brain / Executive Offices / Voice
 *                    ↓
 *          Maddy Presence Engine
 *                    ↓
 *    Director / Renderer / Visual Presence
 *
 * Governance:
 * - Presence may express MEOS state but must never fabricate activity.
 * - Visual behavior must reflect real events, explicit commands,
 *   or clearly identified ambient idle behavior.
 * - Professional Mode is the default organizational experience.
 * - Personal Mode remains private and user-specific.
 */

(() => {
  "use strict";

  const ENGINE_NAME = "MEOS Maddy Presence Engine";
  const ENGINE_VERSION = "1.0.0";
  const BUILD_ID = "MPE100-FOUNDATIONAL-PRESENCE-20260805-A";
  const SCHEMA = "meos.maddy-presence.v1";

  const EVENT_PREFIX = "meos:maddy-presence";

  const PRESENCE_STATES = Object.freeze({
    OFFLINE: "offline",
    BOOTING: "booting",
    ONLINE: "online",
    WORKING: "working",
    THINKING: "thinking",
    LISTENING: "listening",
    SPEAKING: "speaking",
    WAITING: "waiting",
    PRESENTING: "presenting",
    CELEBRATING: "celebrating",
    CONCERNED: "concerned",
    RESTING: "resting",
    ERROR: "error"
  });

  const PRESENCE_MODES = Object.freeze({
    PROFESSIONAL: "professional",
    PERSONAL: "personal"
  });

  const PRESENCE_EMOTIONS = Object.freeze({
    CALM: "calm",
    FOCUSED: "focused",
    INTERESTED: "interested",
    CURIOUS: "curious",
    CONFIDENT: "confident",
    ENCOURAGING: "encouraging",
    HAPPY: "happy",
    EXCITED: "excited",
    CONCERNED: "concerned",
    SERIOUS: "serious",
    EMPATHETIC: "empathetic",
    THOUGHTFUL: "thoughtful",
    RELIEVED: "relieved",
    NEUTRAL: "neutral"
  });

  const PRESENCE_ATTENTION = Object.freeze({
    EXECUTIVE_DIRECTOR: "executive-director",
    MISSION: "mission",
    GRANT_OFFICE: "grant-office",
    RESOURCE_ACQUISITION: "resource-acquisition",
    FINANCE: "finance",
    OPERATIONS: "operations",
    COMPLIANCE: "compliance",
    COMMUNICATIONS: "communications",
    COMMUNITY_RELATIONS: "community-relations",
    HUMAN_RESOURCES: "human-resources",
    KNOWLEDGE: "knowledge",
    RISK: "risk",
    BOARD: "board",
    DOCUMENT: "document",
    DASHBOARD: "dashboard",
    ENVIRONMENT: "environment",
    NONE: "none"
  });

  const PRESENCE_ACTIVITIES = Object.freeze({
    IDLE: "idle",
    READING: "reading",
    RESEARCHING: "researching",
    REVIEWING: "reviewing",
    WRITING: "writing",
    MONITORING: "monitoring",
    PLANNING: "planning",
    REASONING: "reasoning",
    PRESENTING: "presenting",
    LISTENING: "listening",
    SPEAKING: "speaking",
    WAITING: "waiting",
    COORDINATING: "coordinating",
    CELEBRATING: "celebrating",
    TRANSITIONING: "transitioning"
  });

  const IDLE_BEHAVIORS = Object.freeze({
    BLINK: "blink",
    BREATHE: "breathe",
    GLANCE_LEFT: "glance-left",
    GLANCE_RIGHT: "glance-right",
    GLANCE_MISSION: "glance-mission",
    GLANCE_GRANT_OFFICE: "glance-grant-office",
    GLANCE_FINANCE: "glance-finance",
    LOOK_DOWN_READ: "look-down-read",
    LOOK_UP_THINK: "look-up-think",
    SMALL_SMILE: "small-smile",
    SHIFT_POSTURE: "shift-posture",
    REVIEW_REPORT: "review-report",
    RETURN_TO_WORK: "return-to-work"
  });

  const MODE_PROFILES = Object.freeze({
    professional: Object.freeze({
      mode: PRESENCE_MODES.PROFESSIONAL,
      defaultState: PRESENCE_STATES.WORKING,
      defaultEmotion: PRESENCE_EMOTIONS.FOCUSED,
      defaultAttention: PRESENCE_ATTENTION.MISSION,
      defaultActivity: PRESENCE_ACTIVITIES.MONITORING,
      environment: "executive-headquarters",
      posture: "executive-composed",
      communicationProfile: "professional",
      wardrobeProfile: "professional-executive",
      idleBehaviorBias: Object.freeze([
        IDLE_BEHAVIORS.REVIEW_REPORT,
        IDLE_BEHAVIORS.GLANCE_MISSION,
        IDLE_BEHAVIORS.GLANCE_GRANT_OFFICE,
        IDLE_BEHAVIORS.LOOK_DOWN_READ,
        IDLE_BEHAVIORS.BREATHE,
        IDLE_BEHAVIORS.BLINK,
        IDLE_BEHAVIORS.SHIFT_POSTURE
      ])
    }),

    personal: Object.freeze({
      mode: PRESENCE_MODES.PERSONAL,
      defaultState: PRESENCE_STATES.WORKING,
      defaultEmotion: PRESENCE_EMOTIONS.CALM,
      defaultAttention: PRESENCE_ATTENTION.EXECUTIVE_DIRECTOR,
      defaultActivity: PRESENCE_ACTIVITIES.IDLE,
      environment: "private-personal-space",
      posture: "relaxed-attentive",
      communicationProfile: "personal",
      wardrobeProfile: "private-personal",
      idleBehaviorBias: Object.freeze([
        IDLE_BEHAVIORS.BREATHE,
        IDLE_BEHAVIORS.BLINK,
        IDLE_BEHAVIORS.SMALL_SMILE,
        IDLE_BEHAVIORS.GLANCE_LEFT,
        IDLE_BEHAVIORS.GLANCE_RIGHT,
        IDLE_BEHAVIORS.SHIFT_POSTURE,
        IDLE_BEHAVIORS.LOOK_DOWN_READ
      ])
    })
  });

  const DEFAULT_CONFIG = Object.freeze({
    autoInitialize: true,
    autoBoot: true,
    bootDurationMs: 2200,
    idleSchedulerEnabled: true,
    idleMinimumDelayMs: 4200,
    idleMaximumDelayMs: 9200,
    historyLimit: 250,
    eventLogLimit: 500,
    temporaryAttentionDurationMs: 4500,
    speakingReturnDelayMs: 450,
    listeningReturnDelayMs: 650,
    preserveStateAcrossModeChanges: false,
    debug: false
  });

  const VALID_STATE_TRANSITIONS = Object.freeze({
    offline: Object.freeze([
      PRESENCE_STATES.BOOTING
    ]),

    booting: Object.freeze([
      PRESENCE_STATES.ONLINE,
      PRESENCE_STATES.ERROR,
      PRESENCE_STATES.OFFLINE
    ]),

    online: Object.freeze([
      PRESENCE_STATES.WORKING,
      PRESENCE_STATES.LISTENING,
      PRESENCE_STATES.THINKING,
      PRESENCE_STATES.SPEAKING,
      PRESENCE_STATES.WAITING,
      PRESENCE_STATES.PRESENTING,
      PRESENCE_STATES.CONCERNED,
      PRESENCE_STATES.RESTING,
      PRESENCE_STATES.ERROR,
      PRESENCE_STATES.OFFLINE
    ]),

    working: Object.freeze([
      PRESENCE_STATES.THINKING,
      PRESENCE_STATES.LISTENING,
      PRESENCE_STATES.SPEAKING,
      PRESENCE_STATES.WAITING,
      PRESENCE_STATES.PRESENTING,
      PRESENCE_STATES.CELEBRATING,
      PRESENCE_STATES.CONCERNED,
      PRESENCE_STATES.RESTING,
      PRESENCE_STATES.ERROR,
      PRESENCE_STATES.OFFLINE
    ]),

    thinking: Object.freeze([
      PRESENCE_STATES.WORKING,
      PRESENCE_STATES.LISTENING,
      PRESENCE_STATES.SPEAKING,
      PRESENCE_STATES.WAITING,
      PRESENCE_STATES.PRESENTING,
      PRESENCE_STATES.CONCERNED,
      PRESENCE_STATES.ERROR,
      PRESENCE_STATES.OFFLINE
    ]),

    listening: Object.freeze([
      PRESENCE_STATES.THINKING,
      PRESENCE_STATES.SPEAKING,
      PRESENCE_STATES.WORKING,
      PRESENCE_STATES.WAITING,
      PRESENCE_STATES.ERROR,
      PRESENCE_STATES.OFFLINE
    ]),

    speaking: Object.freeze([
      PRESENCE_STATES.WORKING,
      PRESENCE_STATES.THINKING,
      PRESENCE_STATES.LISTENING,
      PRESENCE_STATES.PRESENTING,
      PRESENCE_STATES.CELEBRATING,
      PRESENCE_STATES.CONCERNED,
      PRESENCE_STATES.ERROR,
      PRESENCE_STATES.OFFLINE
    ]),

    waiting: Object.freeze([
      PRESENCE_STATES.WORKING,
      PRESENCE_STATES.THINKING,
      PRESENCE_STATES.LISTENING,
      PRESENCE_STATES.SPEAKING,
      PRESENCE_STATES.ERROR,
      PRESENCE_STATES.OFFLINE
    ]),

    presenting: Object.freeze([
      PRESENCE_STATES.WORKING,
      PRESENCE_STATES.LISTENING,
      PRESENCE_STATES.SPEAKING,
      PRESENCE_STATES.THINKING,
      PRESENCE_STATES.ERROR,
      PRESENCE_STATES.OFFLINE
    ]),

    celebrating: Object.freeze([
      PRESENCE_STATES.WORKING,
      PRESENCE_STATES.SPEAKING,
      PRESENCE_STATES.LISTENING,
      PRESENCE_STATES.ERROR,
      PRESENCE_STATES.OFFLINE
    ]),

    concerned: Object.freeze([
      PRESENCE_STATES.WORKING,
      PRESENCE_STATES.THINKING,
      PRESENCE_STATES.LISTENING,
      PRESENCE_STATES.SPEAKING,
      PRESENCE_STATES.PRESENTING,
      PRESENCE_STATES.ERROR,
      PRESENCE_STATES.OFFLINE
    ]),

    resting: Object.freeze([
      PRESENCE_STATES.WORKING,
      PRESENCE_STATES.LISTENING,
      PRESENCE_STATES.SPEAKING,
      PRESENCE_STATES.OFFLINE,
      PRESENCE_STATES.ERROR
    ]),

    error: Object.freeze([
      PRESENCE_STATES.BOOTING,
      PRESENCE_STATES.OFFLINE
    ])
  });

  const state = {
    initialized: false,
    bootCompleted: false,

    state: PRESENCE_STATES.OFFLINE,
    previousState: null,

    mode: PRESENCE_MODES.PROFESSIONAL,
    previousMode: null,

    emotion: PRESENCE_EMOTIONS.NEUTRAL,
    previousEmotion: null,

    attention: PRESENCE_ATTENTION.NONE,
    previousAttention: null,

    activity: PRESENCE_ACTIVITIES.IDLE,
    previousActivity: null,

    currentIdleBehavior: null,
    lastIdleBehavior: null,

    speaking: false,
    listening: false,
    interrupted: false,

    currentContext: null,
    currentOffice: null,
    currentSubject: null,

    lastInteractionAt: null,
    lastStateChangeAt: null,
    lastModeChangeAt: null,
    lastEmotionChangeAt: null,
    lastAttentionChangeAt: null,
    lastActivityChangeAt: null,
    lastIdleBehaviorAt: null,

    initializedAt: null,
    bootStartedAt: null,
    bootCompletedAt: null,

    transitionSequence: 0,
    eventSequence: 0,

    history: [],
    eventLog: [],

    temporaryAttention: null,

    scheduler: {
      running: false,
      timerId: null,
      nextBehaviorAt: null,
      pausedReason: null
    },

    runtime: {
      activeRenderer: null,
      activeDirector: null,
      speechConnected: false,
      dashboardConnected: false,
      executiveBrainConnected: false,
      officesConnected: false
    },

    config: {
      ...DEFAULT_CONFIG
    }
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function clone(value) {
    if (value === undefined) {
      return undefined;
    }

    if (typeof structuredClone === "function") {
      try {
        return structuredClone(value);
      } catch (error) {
        // Fall through to JSON-safe cloning.
      }
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function normalizeToken(value) {
    return isNonEmptyString(value)
      ? value.trim().toLowerCase().replace(/[\s_]+/g, "-")
      : "";
  }

  function valuesOf(record) {
    return Object.values(record);
  }

  function isAllowedValue(value, allowedRecord) {
    return valuesOf(allowedRecord).includes(value);
  }

  function assertAllowedValue(value, allowedRecord, label) {
    if (!isAllowedValue(value, allowedRecord)) {
      throw new TypeError(
        `${ENGINE_NAME}: invalid ${label} "${String(value)}".`
      );
    }

    return value;
  }

  function normalizeState(value) {
    return assertAllowedValue(
      normalizeToken(value),
      PRESENCE_STATES,
      "state"
    );
  }

  function normalizeMode(value) {
    return assertAllowedValue(
      normalizeToken(value),
      PRESENCE_MODES,
      "mode"
    );
  }

  function normalizeEmotion(value) {
    return assertAllowedValue(
      normalizeToken(value),
      PRESENCE_EMOTIONS,
      "emotion"
    );
  }

  function normalizeAttention(value) {
    return assertAllowedValue(
      normalizeToken(value),
      PRESENCE_ATTENTION,
      "attention target"
    );
  }

  function normalizeActivity(value) {
    return assertAllowedValue(
      normalizeToken(value),
      PRESENCE_ACTIVITIES,
      "activity"
    );
  }

  function normalizeIdleBehavior(value) {
    return assertAllowedValue(
      normalizeToken(value),
      IDLE_BEHAVIORS,
      "idle behavior"
    );
  }

  function createId(prefix = "presence") {
    const sequence = String(++state.eventSequence).padStart(6, "0");
    return `${prefix}-${Date.now()}-${sequence}`;
  }

  function trimCollection(collection, limit) {
    if (!Array.isArray(collection) || collection.length <= limit) {
      return;
    }

    collection.splice(0, collection.length - limit);
  }

  function addHistoryEntry(type, details = {}) {
    const entry = {
      id: createId("history"),
      schema: "meos.maddy-presence.history-entry.v1",
      type,
      occurredAt: nowIso(),
      state: state.state,
      mode: state.mode,
      emotion: state.emotion,
      attention: state.attention,
      activity: state.activity,
      details: clone(details)
    };

    state.history.push(entry);
    trimCollection(state.history, state.config.historyLimit);

    return entry;
  }

  function addEventLogEntry(eventName, detail = {}) {
    const entry = {
      id: createId("event"),
      schema: "meos.maddy-presence.event-log-entry.v1",
      eventName,
      occurredAt: nowIso(),
      detail: clone(detail)
    };

    state.eventLog.push(entry);
    trimCollection(state.eventLog, state.config.eventLogLimit);

    return entry;
  }

  function buildEventName(name) {
    const normalizedName = normalizeToken(name);

    if (!normalizedName) {
      throw new TypeError(`${ENGINE_NAME}: event name is required.`);
    }

    return `${EVENT_PREFIX}:${normalizedName}`;
  }

  function emit(name, detail = {}) {
    const eventName = buildEventName(name);

    const payload = {
      schema: "meos.maddy-presence.event.v1",
      engine: ENGINE_NAME,
      version: ENGINE_VERSION,
      buildId: BUILD_ID,
      eventName,
      emittedAt: nowIso(),
      sequence: ++state.transitionSequence,
      presence: {
        state: state.state,
        mode: state.mode,
        emotion: state.emotion,
        attention: state.attention,
        activity: state.activity,
        speaking: state.speaking,
        listening: state.listening
      },
      detail: clone(detail)
    };

    addEventLogEntry(eventName, payload);

    document.dispatchEvent(
      new CustomEvent(eventName, {
        detail: payload
      })
    );

    document.dispatchEvent(
      new CustomEvent(EVENT_PREFIX, {
        detail: payload
      })
    );

    if (state.config.debug) {
      console.debug(`[${ENGINE_NAME}] ${eventName}`, payload);
    }

    return payload;
  }

  function canTransition(fromState, toState) {
    if (fromState === toState) {
      return true;
    }

    const allowedTransitions = VALID_STATE_TRANSITIONS[fromState];

    return Boolean(
      Array.isArray(allowedTransitions) &&
      allowedTransitions.includes(toState)
    );
  }

  function assertTransitionAllowed(fromState, toState, options = {}) {
    if (options.force === true) {
      return true;
    }

    if (!canTransition(fromState, toState)) {
      throw new Error(
        `${ENGINE_NAME}: transition from "${fromState}" to "${toState}" is not allowed.`
      );
    }

    return true;
  }

  function getModeProfile(mode = state.mode) {
    const normalizedMode = normalizeMode(mode);
    return MODE_PROFILES[normalizedMode];
  }

  function getSnapshot() {
    return {
      schema: SCHEMA,
      name: ENGINE_NAME,
      version: ENGINE_VERSION,
      buildId: BUILD_ID,

      status: state.initialized ? "online" : "not-initialized",
      initialized: state.initialized,
      bootCompleted: state.bootCompleted,

      presence: {
        state: state.state,
        previousState: state.previousState,

        mode: state.mode,
        previousMode: state.previousMode,

        emotion: state.emotion,
        previousEmotion: state.previousEmotion,

        attention: state.attention,
        previousAttention: state.previousAttention,

        activity: state.activity,
        previousActivity: state.previousActivity,

        currentIdleBehavior: state.currentIdleBehavior,
        lastIdleBehavior: state.lastIdleBehavior,

        speaking: state.speaking,
        listening: state.listening,
        interrupted: state.interrupted,

        currentContext: clone(state.currentContext),
        currentOffice: state.currentOffice,
        currentSubject: state.currentSubject
      },

      timestamps: {
        initializedAt: state.initializedAt,
        bootStartedAt: state.bootStartedAt,
        bootCompletedAt: state.bootCompletedAt,
        lastInteractionAt: state.lastInteractionAt,
        lastStateChangeAt: state.lastStateChangeAt,
        lastModeChangeAt: state.lastModeChangeAt,
        lastEmotionChangeAt: state.lastEmotionChangeAt,
        lastAttentionChangeAt: state.lastAttentionChangeAt,
        lastActivityChangeAt: state.lastActivityChangeAt,
        lastIdleBehaviorAt: state.lastIdleBehaviorAt
      },

      scheduler: {
        running: state.scheduler.running,
        nextBehaviorAt: state.scheduler.nextBehaviorAt,
        pausedReason: state.scheduler.pausedReason
      },

      runtime: {
        ...state.runtime
      },

      configuration: {
        ...state.config
      },

      counts: {
        history: state.history.length,
        events: state.eventLog.length
      }
    };
  }

  function getStatus() {
    return {
      state: state.state,
      mode: state.mode,
      emotion: state.emotion,
      attention: state.attention,
      activity: state.activity,
      speaking: state.speaking,
      listening: state.listening,
      initialized: state.initialized,
      bootCompleted: state.bootCompleted
    };
  }

  function getHistory(options = {}) {
    const limit = Number.isFinite(options.limit)
      ? Math.max(1, Math.floor(options.limit))
      : state.history.length;

    const type = isNonEmptyString(options.type)
      ? normalizeToken(options.type)
      : null;

    const results = type
      ? state.history.filter((entry) => entry.type === type)
      : state.history;

    return clone(results.slice(-limit));
  }

  function getEventLog(options = {}) {
    const limit = Number.isFinite(options.limit)
      ? Math.max(1, Math.floor(options.limit))
      : state.eventLog.length;

    const eventName = isNonEmptyString(options.eventName)
      ? buildEventName(options.eventName)
      : null;

    const results = eventName
      ? state.eventLog.filter((entry) => entry.eventName === eventName)
      : state.eventLog;

    return clone(results.slice(-limit));
  }
    function transitionState(nextState, options = {}) {

    const normalizedState = normalizeState(nextState);

    assertTransitionAllowed(
      state.state,
      normalizedState,
      options
    );

    if (normalizedState === state.state) {
      return getStatus();
    }

    state.previousState = state.state;
    state.state = normalizedState;
    state.lastStateChangeAt = nowIso();

    addHistoryEntry("state-change", {
      from: state.previousState,
      to: state.state,
      reason: options.reason || "unspecified"
    });

    emit("state", {
      previous: state.previousState,
      current: state.state,
      reason: options.reason || "unspecified"
    });

    return getStatus();

  }

  function setEmotion(nextEmotion, options = {}) {

    const normalizedEmotion = normalizeEmotion(nextEmotion);

    if (normalizedEmotion === state.emotion) {
      return getStatus();
    }

    state.previousEmotion = state.emotion;
    state.emotion = normalizedEmotion;
    state.lastEmotionChangeAt = nowIso();

    addHistoryEntry("emotion-change", {
      from: state.previousEmotion,
      to: state.emotion,
      reason: options.reason || "unspecified"
    });

    emit("emotion", {
      previous: state.previousEmotion,
      current: state.emotion,
      reason: options.reason || "unspecified"
    });

    return getStatus();

  }

  function lookAt(target, options = {}) {

    const normalizedAttention = normalizeAttention(target);

    if (normalizedAttention === state.attention) {
      return getStatus();
    }

    state.previousAttention = state.attention;
    state.attention = normalizedAttention;
    state.lastAttentionChangeAt = nowIso();

    state.currentOffice =
      options.office || normalizedAttention;

    state.currentSubject =
      options.subject || null;

    addHistoryEntry("attention-change", {
      from: state.previousAttention,
      to: state.attention
    });

    emit("attention", {
      previous: state.previousAttention,
      current: state.attention,
      office: state.currentOffice,
      subject: state.currentSubject
    });

    return getStatus();

  }

  function setActivity(nextActivity, options = {}) {

    const normalizedActivity =
      normalizeActivity(nextActivity);

    if (normalizedActivity === state.activity) {
      return getStatus();
    }

    state.previousActivity = state.activity;
    state.activity = normalizedActivity;
    state.lastActivityChangeAt = nowIso();

    addHistoryEntry("activity-change", {
      from: state.previousActivity,
      to: state.activity
    });

    emit("activity", {
      previous: state.previousActivity,
      current: state.activity,
      reason: options.reason || "unspecified"
    });

    return getStatus();

  }

  function setMode(nextMode, options = {}) {

    const normalizedMode =
      normalizeMode(nextMode);

    if (normalizedMode === state.mode) {
      return getStatus();
    }

    const profile =
      getModeProfile(normalizedMode);

    state.previousMode = state.mode;
    state.mode = normalizedMode;
    state.lastModeChangeAt = nowIso();

    if (!state.config.preserveStateAcrossModeChanges) {

      state.state =
        profile.defaultState;

      state.activity =
        profile.defaultActivity;

      state.emotion =
        profile.defaultEmotion;

      state.attention =
        profile.defaultAttention;

    }

    addHistoryEntry("mode-change", {
      from: state.previousMode,
      to: state.mode
    });

    emit("mode", {
      previous: state.previousMode,
      current: state.mode,
      profile
    });

    return getStatus();

  }

  function performIdleBehavior(behavior) {

    const normalizedBehavior =
      normalizeIdleBehavior(behavior);

    state.lastIdleBehavior =
      state.currentIdleBehavior;

    state.currentIdleBehavior =
      normalizedBehavior;

    state.lastIdleBehaviorAt =
      nowIso();

    addHistoryEntry("idle-behavior", {
      behavior: normalizedBehavior
    });

    emit("idle-behavior", {
      behavior: normalizedBehavior
    });

    return normalizedBehavior;

  }

  function chooseIdleBehavior() {

    const profile =
      getModeProfile();

    const list =
      profile.idleBehaviorBias;

    const choice =
      list[Math.floor(
        Math.random() * list.length
      )];

    performIdleBehavior(choice);

    return choice;

  }
    function getRandomIdleDelay() {
    const minimum = Math.max(
      500,
      Number(state.config.idleMinimumDelayMs) || 4200
    );

    const maximum = Math.max(
      minimum,
      Number(state.config.idleMaximumDelayMs) || 9200
    );

    return Math.floor(
      minimum + Math.random() * (maximum - minimum + 1)
    );
  }

  function canPerformIdleBehavior() {
    return Boolean(
      state.initialized &&
      state.bootCompleted &&
      state.config.idleSchedulerEnabled &&
      !state.speaking &&
      !state.listening &&
      [
        PRESENCE_STATES.ONLINE,
        PRESENCE_STATES.WORKING,
        PRESENCE_STATES.WAITING,
        PRESENCE_STATES.RESTING
      ].includes(state.state)
    );
  }

  function clearIdleTimer() {
    if (state.scheduler.timerId !== null) {
      window.clearTimeout(state.scheduler.timerId);
    }

    state.scheduler.timerId = null;
    state.scheduler.nextBehaviorAt = null;
  }

  function scheduleNextIdleBehavior() {
    clearIdleTimer();

    if (!state.scheduler.running) {
      return false;
    }

    const delay = getRandomIdleDelay();

    state.scheduler.nextBehaviorAt =
      new Date(Date.now() + delay).toISOString();

    state.scheduler.timerId = window.setTimeout(() => {
      state.scheduler.timerId = null;
      state.scheduler.nextBehaviorAt = null;

      if (canPerformIdleBehavior()) {
        chooseIdleBehavior();
      }

      scheduleNextIdleBehavior();
    }, delay);

    return true;
  }

  function startIdleScheduler(options = {}) {
    if (!state.config.idleSchedulerEnabled && options.force !== true) {
      state.scheduler.pausedReason = "disabled-by-configuration";
      return false;
    }

    if (state.scheduler.running) {
      return true;
    }

    state.scheduler.running = true;
    state.scheduler.pausedReason = null;

    addHistoryEntry("idle-scheduler-started", {
      reason: options.reason || "engine-start"
    });

    emit("idle-scheduler-started", {
      reason: options.reason || "engine-start"
    });

    scheduleNextIdleBehavior();

    return true;
  }

  function stopIdleScheduler(reason = "manual-stop") {
    clearIdleTimer();

    state.scheduler.running = false;
    state.scheduler.pausedReason = reason;

    addHistoryEntry("idle-scheduler-stopped", {
      reason
    });

    emit("idle-scheduler-stopped", {
      reason
    });

    return true;
  }

  function pauseIdleScheduler(reason = "presence-busy") {
    clearIdleTimer();

    state.scheduler.pausedReason = reason;

    emit("idle-scheduler-paused", {
      reason
    });

    return true;
  }

  function resumeIdleScheduler(reason = "presence-available") {
    if (!state.scheduler.running) {
      return startIdleScheduler({
        reason
      });
    }

    state.scheduler.pausedReason = null;

    emit("idle-scheduler-resumed", {
      reason
    });

    scheduleNextIdleBehavior();

    return true;
  }

  function clearTemporaryAttention(options = {}) {
    if (!state.temporaryAttention) {
      return false;
    }

    if (state.temporaryAttention.timerId !== null) {
      window.clearTimeout(state.temporaryAttention.timerId);
    }

    const restoreTarget =
      state.temporaryAttention.restoreTarget;

    const clearedTarget =
      state.temporaryAttention.target;

    state.temporaryAttention = null;

    if (
      options.restore !== false &&
      restoreTarget &&
      restoreTarget !== state.attention
    ) {
      lookAt(restoreTarget, {
        reason: options.reason || "temporary-attention-complete"
      });
    }

    emit("temporary-attention-cleared", {
      clearedTarget,
      restoredTarget:
        options.restore === false ? null : restoreTarget
    });

    return true;
  }

  function lookAtTemporarily(target, options = {}) {
    clearTemporaryAttention({
      restore: false,
      reason: "replaced-by-new-temporary-attention"
    });

    const normalizedTarget =
      normalizeAttention(target);

    const restoreTarget =
      options.restoreTarget
        ? normalizeAttention(options.restoreTarget)
        : state.attention;

    const durationMs =
      Number.isFinite(options.durationMs)
        ? Math.max(250, options.durationMs)
        : state.config.temporaryAttentionDurationMs;

    lookAt(normalizedTarget, {
      office: options.office,
      subject: options.subject,
      reason: options.reason || "temporary-attention"
    });

    const timerId = window.setTimeout(() => {
      clearTemporaryAttention({
        restore: true,
        reason: "temporary-attention-expired"
      });
    }, durationMs);

    state.temporaryAttention = {
      target: normalizedTarget,
      restoreTarget,
      durationMs,
      startedAt: nowIso(),
      expiresAt:
        new Date(Date.now() + durationMs).toISOString(),
      timerId
    };

    emit("temporary-attention-started", {
      target: normalizedTarget,
      restoreTarget,
      durationMs
    });

    return getStatus();
  }

  function setContext(context = {}) {
    const normalizedContext =
      context && typeof context === "object"
        ? clone(context)
        : {
            value: context
          };

    state.currentContext = normalizedContext;
    state.currentOffice =
      normalizedContext.office ||
      state.currentOffice;

    state.currentSubject =
      normalizedContext.subject ||
      state.currentSubject;

    state.lastInteractionAt = nowIso();

    addHistoryEntry("context-updated", {
      context: normalizedContext
    });

    emit("context", {
      context: normalizedContext
    });

    return clone(state.currentContext);
  }

  function clearContext(reason = "context-complete") {
    const previousContext =
      clone(state.currentContext);

    state.currentContext = null;
    state.currentOffice = null;
    state.currentSubject = null;

    addHistoryEntry("context-cleared", {
      reason,
      previousContext
    });

    emit("context-cleared", {
      reason,
      previousContext
    });

    return true;
  }

  function startListening(options = {}) {
    if (!state.initialized) {
      throw new Error(
        `${ENGINE_NAME}: initialize the engine before starting listening.`
      );
    }

    state.listening = true;
    state.speaking = false;
    state.interrupted =
      options.interrupted === true;

    pauseIdleScheduler("listening");

    transitionState(PRESENCE_STATES.LISTENING, {
      force: options.force === true,
      reason: options.reason || "user-speaking"
    });

    setActivity(PRESENCE_ACTIVITIES.LISTENING, {
      reason: options.reason || "user-speaking"
    });

    lookAt(PRESENCE_ATTENTION.EXECUTIVE_DIRECTOR, {
      reason: options.reason || "user-speaking"
    });

    if (options.context) {
      setContext(options.context);
    }

    state.lastInteractionAt = nowIso();

    addHistoryEntry("listening-started", {
      interrupted: state.interrupted
    });

    emit("listening-started", {
      interrupted: state.interrupted
    });

    return getStatus();
  }

  function stopListening(options = {}) {
    if (!state.listening) {
      return getStatus();
    }

    state.listening = false;
    state.interrupted = false;

    addHistoryEntry("listening-stopped", {
      reason: options.reason || "user-finished"
    });

    emit("listening-stopped", {
      reason: options.reason || "user-finished"
    });

    const returnDelay =
      Number.isFinite(options.returnDelayMs)
        ? Math.max(0, options.returnDelayMs)
        : state.config.listeningReturnDelayMs;

    window.setTimeout(() => {
      if (!state.speaking && !state.listening) {
        transitionState(
          options.nextState || PRESENCE_STATES.THINKING,
          {
            force: options.force === true,
            reason:
              options.reason ||
              "listening-complete"
          }
        );

        setActivity(
          options.nextActivity ||
            PRESENCE_ACTIVITIES.REASONING,
          {
            reason:
              options.reason ||
              "listening-complete"
          }
        );

        resumeIdleScheduler("listening-complete");
      }
    }, returnDelay);

    return getStatus();
  }

  function startSpeaking(options = {}) {
    if (!state.initialized) {
      throw new Error(
        `${ENGINE_NAME}: initialize the engine before starting speech.`
      );
    }

    state.speaking = true;
    state.listening = false;
    state.interrupted = false;

    pauseIdleScheduler("speaking");

    transitionState(PRESENCE_STATES.SPEAKING, {
      force: options.force === true,
      reason: options.reason || "voice-playback-started"
    });

    setActivity(PRESENCE_ACTIVITIES.SPEAKING, {
      reason: options.reason || "voice-playback-started"
    });

    lookAt(
      options.attention ||
        PRESENCE_ATTENTION.EXECUTIVE_DIRECTOR,
      {
        office: options.office,
        subject: options.subject,
        reason:
          options.reason ||
          "voice-playback-started"
      }
    );

    if (options.emotion) {
      setEmotion(options.emotion, {
        reason:
          options.reason ||
          "voice-playback-started"
      });
    }

    if (options.context) {
      setContext(options.context);
    }

    state.lastInteractionAt = nowIso();

    addHistoryEntry("speaking-started", {
      office: state.currentOffice,
      subject: state.currentSubject
    });

    emit("speaking-started", {
      office: state.currentOffice,
      subject: state.currentSubject
    });

    return getStatus();
  }

  function stopSpeaking(options = {}) {
    if (!state.speaking) {
      return getStatus();
    }

    state.speaking = false;

    addHistoryEntry("speaking-stopped", {
      reason:
        options.reason ||
        "voice-playback-complete"
    });

    emit("speaking-stopped", {
      reason:
        options.reason ||
        "voice-playback-complete"
    });

    const returnDelay =
      Number.isFinite(options.returnDelayMs)
        ? Math.max(0, options.returnDelayMs)
        : state.config.speakingReturnDelayMs;

    window.setTimeout(() => {
      if (!state.speaking && !state.listening) {
        const profile = getModeProfile();

        transitionState(
          options.nextState ||
            profile.defaultState,
          {
            force: options.force === true,
            reason:
              options.reason ||
              "speech-complete"
          }
        );

        setActivity(
          options.nextActivity ||
            profile.defaultActivity,
          {
            reason:
              options.reason ||
              "speech-complete"
          }
        );

        if (options.keepAttention !== true) {
          lookAt(profile.defaultAttention, {
            reason:
              options.reason ||
              "speech-complete"
          });
        }

        resumeIdleScheduler("speech-complete");
      }
    }, returnDelay);

    return getStatus();
  }

  function beginThinking(options = {}) {
    pauseIdleScheduler("thinking");

    transitionState(PRESENCE_STATES.THINKING, {
      force: options.force === true,
      reason:
        options.reason ||
        "executive-reasoning"
    });

    setActivity(PRESENCE_ACTIVITIES.REASONING, {
      reason:
        options.reason ||
        "executive-reasoning"
    });

    setEmotion(
      options.emotion ||
        PRESENCE_EMOTIONS.THOUGHTFUL,
      {
        reason:
          options.reason ||
          "executive-reasoning"
      }
    );

    if (options.attention) {
      lookAt(options.attention, {
        office: options.office,
        subject: options.subject,
        reason:
          options.reason ||
          "executive-reasoning"
      });
    }

    return getStatus();
  }

  function finishThinking(options = {}) {
    const profile = getModeProfile();

    transitionState(
      options.nextState ||
        profile.defaultState,
      {
        force: options.force === true,
        reason:
          options.reason ||
          "executive-reasoning-complete"
      }
    );

    setActivity(
      options.nextActivity ||
        profile.defaultActivity,
      {
        reason:
          options.reason ||
          "executive-reasoning-complete"
      }
    );

    setEmotion(
      options.emotion ||
        profile.defaultEmotion,
      {
        reason:
          options.reason ||
          "executive-reasoning-complete"
      }
    );

    resumeIdleScheduler(
      "executive-reasoning-complete"
    );

    return getStatus();
  }

  function celebrate(options = {}) {
    transitionState(
      PRESENCE_STATES.CELEBRATING,
      {
        force: options.force === true,
        reason:
          options.reason ||
          "positive-outcome"
      }
    );

    setActivity(
      PRESENCE_ACTIVITIES.CELEBRATING,
      {
        reason:
          options.reason ||
          "positive-outcome"
      }
    );

    setEmotion(
      options.emotion ||
        PRESENCE_EMOTIONS.HAPPY,
      {
        reason:
          options.reason ||
          "positive-outcome"
      }
    );

    if (options.attention) {
      lookAt(options.attention, {
        office: options.office,
        subject: options.subject,
        reason:
          options.reason ||
          "positive-outcome"
      });
    }

    emit("celebration", {
      reason:
        options.reason ||
        "positive-outcome",
      context:
        options.context || null
    });

    return getStatus();
  }

  function expressConcern(options = {}) {
    transitionState(
      PRESENCE_STATES.CONCERNED,
      {
        force: options.force === true,
        reason:
          options.reason ||
          "risk-detected"
      }
    );

    setEmotion(
      options.emotion ||
        PRESENCE_EMOTIONS.CONCERNED,
      {
        reason:
          options.reason ||
          "risk-detected"
      }
    );

    setActivity(
      options.activity ||
        PRESENCE_ACTIVITIES.REVIEWING,
      {
        reason:
          options.reason ||
          "risk-detected"
      }
    );

    lookAt(
      options.attention ||
        PRESENCE_ATTENTION.RISK,
      {
        office: options.office,
        subject: options.subject,
        reason:
          options.reason ||
          "risk-detected"
      }
    );

    emit("concern", {
      reason:
        options.reason ||
        "risk-detected",
      context:
        options.context || null
    });

    return getStatus();
  }

  function registerRuntimeConnection(
    connectionName,
    connected = true,
    details = {}
  ) {
    const normalizedName =
      normalizeToken(connectionName);

    const runtimeMap = {
      renderer: "activeRenderer",
      director: "activeDirector",
      speech: "speechConnected",
      dashboard: "dashboardConnected",
      "executive-brain":
        "executiveBrainConnected",
      offices: "officesConnected"
    };

    const property =
      runtimeMap[normalizedName];

    if (!property) {
      throw new TypeError(
        `${ENGINE_NAME}: unknown runtime connection "${connectionName}".`
      );
    }

    if (
      property === "activeRenderer" ||
      property === "activeDirector"
    ) {
      state.runtime[property] =
        connected === false
          ? null
          : details.name ||
            normalizedName;
    } else {
      state.runtime[property] =
        connected !== false;
    }

    addHistoryEntry("runtime-connection", {
      connectionName: normalizedName,
      connected:
        connected !== false,
      details
    });

    emit("runtime-connection", {
      connectionName: normalizedName,
      connected:
        connected !== false,
      details
    });

    return clone(state.runtime);
  }

  function configure(options = {}) {
    if (!options || typeof options !== "object") {
      throw new TypeError(
        `${ENGINE_NAME}: configuration must be an object.`
      );
    }

    const numericKeys = [
      "bootDurationMs",
      "idleMinimumDelayMs",
      "idleMaximumDelayMs",
      "historyLimit",
      "eventLogLimit",
      "temporaryAttentionDurationMs",
      "speakingReturnDelayMs",
      "listeningReturnDelayMs"
    ];

    numericKeys.forEach((key) => {
      if (
        Object.prototype.hasOwnProperty.call(
          options,
          key
        )
      ) {
        const value = Number(options[key]);

        if (
          !Number.isFinite(value) ||
          value < 0
        ) {
          throw new TypeError(
            `${ENGINE_NAME}: configuration "${key}" must be a non-negative number.`
          );
        }

        state.config[key] =
          Math.floor(value);
      }
    });

    const booleanKeys = [
      "autoInitialize",
      "autoBoot",
      "idleSchedulerEnabled",
      "preserveStateAcrossModeChanges",
      "debug"
    ];

    booleanKeys.forEach((key) => {
      if (
        Object.prototype.hasOwnProperty.call(
          options,
          key
        )
      ) {
        state.config[key] =
          Boolean(options[key]);
      }
    });

    trimCollection(
      state.history,
      state.config.historyLimit
    );

    trimCollection(
      state.eventLog,
      state.config.eventLogLimit
    );

    addHistoryEntry(
      "configuration-updated",
      {
        configuration: {
          ...state.config
        }
      }
    );

    emit("configuration", {
      configuration: {
        ...state.config
      }
    });

    return {
      ...state.config
    };
  }

  function boot(options = {}) {
    if (!state.initialized) {
      throw new Error(
        `${ENGINE_NAME}: initialize the engine before booting.`
      );
    }

    if (
      state.state !==
        PRESENCE_STATES.OFFLINE &&
      state.state !==
        PRESENCE_STATES.ERROR
    ) {
      return Promise.resolve(
        getSnapshot()
      );
    }

    state.bootCompleted = false;
    state.bootStartedAt = nowIso();

    transitionState(
      PRESENCE_STATES.BOOTING,
      {
        force: true,
        reason:
          options.reason ||
          "presence-engine-boot"
      }
    );

    setActivity(
      PRESENCE_ACTIVITIES.TRANSITIONING,
      {
        reason:
          options.reason ||
          "presence-engine-boot"
      }
    );

    emit("boot-started", {
      durationMs:
        state.config.bootDurationMs
    });

    return new Promise((resolve) => {
      window.setTimeout(() => {
        const profile =
          getModeProfile();

        transitionState(
          PRESENCE_STATES.ONLINE,
          {
            force: true,
            reason:
              "presence-engine-boot-complete"
          }
        );

        setEmotion(
          profile.defaultEmotion,
          {
            reason:
              "presence-engine-boot-complete"
          }
        );

        lookAt(
          profile.defaultAttention,
          {
            reason:
              "presence-engine-boot-complete"
          }
        );

        setActivity(
          profile.defaultActivity,
          {
            reason:
              "presence-engine-boot-complete"
          }
        );

        transitionState(
          profile.defaultState,
          {
            force: true,
            reason:
              "presence-engine-ready"
          }
        );

        state.bootCompleted = true;
        state.bootCompletedAt = nowIso();

        addHistoryEntry(
          "boot-completed",
          {
            mode: state.mode,
            profile
          }
        );

        emit("boot-completed", {
          mode: state.mode,
          profile
        });

        if (
          state.config.idleSchedulerEnabled
        ) {
          startIdleScheduler({
            reason:
              "boot-completed"
          });
        }

        resolve(getSnapshot());
      }, state.config.bootDurationMs);
    });
  }

  function shutdown(options = {}) {
    stopIdleScheduler(
      options.reason ||
        "presence-engine-shutdown"
    );

    clearTemporaryAttention({
      restore: false,
      reason:
        "presence-engine-shutdown"
    });

    state.speaking = false;
    state.listening = false;
    state.interrupted = false;
    state.bootCompleted = false;

    transitionState(
      PRESENCE_STATES.OFFLINE,
      {
        force: true,
        reason:
          options.reason ||
          "presence-engine-shutdown"
      }
    );

    setActivity(
      PRESENCE_ACTIVITIES.IDLE,
      {
        reason:
          options.reason ||
          "presence-engine-shutdown"
      }
    );

    emit("shutdown", {
      reason:
        options.reason ||
        "presence-engine-shutdown"
    });

    return getSnapshot();
  }

  function initialize(options = {}) {
    if (state.initialized) {
      return getSnapshot();
    }

    if (
      options.config &&
      typeof options.config === "object"
    ) {
      configure(options.config);
    }

    state.initialized = true;
    state.initializedAt = nowIso();

    const initialMode =
      options.mode
        ? normalizeMode(options.mode)
        : PRESENCE_MODES.PROFESSIONAL;

    state.mode = initialMode;

    const profile =
      getModeProfile(initialMode);

    state.state =
      PRESENCE_STATES.OFFLINE;

    state.emotion =
      PRESENCE_EMOTIONS.NEUTRAL;

    state.attention =
      PRESENCE_ATTENTION.NONE;

    state.activity =
      PRESENCE_ACTIVITIES.IDLE;

    addHistoryEntry("initialized", {
      mode: initialMode,
      autoBoot:
        options.autoBoot ??
        state.config.autoBoot
    });

    emit("initialized", {
      mode: initialMode,
      profile,
      autoBoot:
        options.autoBoot ??
        state.config.autoBoot
    });

    const shouldBoot =
      options.autoBoot ??
      state.config.autoBoot;

    if (shouldBoot) {
      boot({
        reason:
          "automatic-initialization"
      });
    }

    return getSnapshot();
  }

  function reset(options = {}) {
    stopIdleScheduler(
      "presence-engine-reset"
    );

    clearTemporaryAttention({
      restore: false,
      reason:
        "presence-engine-reset"
    });

    const preservedConfig = {
      ...state.config
    };

    state.initialized = false;
    state.bootCompleted = false;

    state.state =
      PRESENCE_STATES.OFFLINE;
    state.previousState = null;

    state.mode =
      PRESENCE_MODES.PROFESSIONAL;
    state.previousMode = null;

    state.emotion =
      PRESENCE_EMOTIONS.NEUTRAL;
    state.previousEmotion = null;

    state.attention =
      PRESENCE_ATTENTION.NONE;
    state.previousAttention = null;

    state.activity =
      PRESENCE_ACTIVITIES.IDLE;
    state.previousActivity = null;

    state.currentIdleBehavior = null;
    state.lastIdleBehavior = null;

    state.speaking = false;
    state.listening = false;
    state.interrupted = false;

    state.currentContext = null;
    state.currentOffice = null;
    state.currentSubject = null;

    state.history.length = 0;
    state.eventLog.length = 0;

    state.initializedAt = null;
    state.bootStartedAt = null;
    state.bootCompletedAt = null;

    state.lastInteractionAt = null;
    state.lastStateChangeAt = null;
    state.lastModeChangeAt = null;
    state.lastEmotionChangeAt = null;
    state.lastAttentionChangeAt = null;
    state.lastActivityChangeAt = null;
    state.lastIdleBehaviorAt = null;

    state.config = preservedConfig;

    state.scheduler = {
      running: false,
      timerId: null,
      nextBehaviorAt: null,
      pausedReason: null
    };

    if (options.reinitialize === true) {
      return initialize({
        autoBoot:
          options.autoBoot !== false
      });
    }

    return getSnapshot();
  }

  function runAcceptanceTest() {
    const originalSnapshot =
      getSnapshot();

    const checks = [];

    function check(name, passed, detail = null) {
      checks.push({
        name,
        passed: Boolean(passed),
        detail
      });
    }

    check(
      "Engine exposes version 1.0.0",
      ENGINE_VERSION === "1.0.0"
    );

    check(
      "Professional mode exists",
      PRESENCE_MODES.PROFESSIONAL ===
        "professional"
    );

    check(
      "Personal mode exists",
      PRESENCE_MODES.PERSONAL ===
        "personal"
    );

    check(
      "State machine exposes working",
      PRESENCE_STATES.WORKING ===
        "working"
    );

    check(
      "State machine exposes speaking",
      PRESENCE_STATES.SPEAKING ===
        "speaking"
    );

    check(
      "State machine exposes listening",
      PRESENCE_STATES.LISTENING ===
        "listening"
    );

    check(
      "Executive Director attention target exists",
      PRESENCE_ATTENTION.EXECUTIVE_DIRECTOR ===
        "executive-director"
    );

    check(
      "Grant Office attention target exists",
      PRESENCE_ATTENTION.GRANT_OFFICE ===
        "grant-office"
    );

    check(
      "Idle behavior scheduler is available",
      typeof startIdleScheduler ===
        "function" &&
        typeof stopIdleScheduler ===
          "function"
    );

    check(
      "Speaking lifecycle is available",
      typeof startSpeaking ===
        "function" &&
        typeof stopSpeaking ===
          "function"
    );

    check(
      "Listening lifecycle is available",
      typeof startListening ===
        "function" &&
        typeof stopListening ===
          "function"
    );

    check(
      "Thinking lifecycle is available",
      typeof beginThinking ===
        "function" &&
        typeof finishThinking ===
          "function"
    );

    check(
      "Mode profiles define separate environments",
      MODE_PROFILES.professional
        .environment !==
        MODE_PROFILES.personal
          .environment
    );

    check(
      "Professional mode defaults to executive headquarters",
      MODE_PROFILES.professional
        .environment ===
        "executive-headquarters"
    );

    check(
      "Personal mode remains private",
      MODE_PROFILES.personal
        .environment ===
        "private-personal-space"
    );

    check(
      "Snapshot schema is available",
      originalSnapshot.schema ===
        SCHEMA
    );

    check(
      "Presence event prefix is governed",
      EVENT_PREFIX ===
        "meos:maddy-presence"
    );

    const passed =
      checks.filter(
        (item) => item.passed
      ).length;

    return {
      success:
        passed === checks.length,
      schema:
        "meos.maddy-presence.acceptance.v1",
      version:
        ENGINE_VERSION,
      buildId:
        BUILD_ID,
      passed,
      total:
        checks.length,
      checks
    };
  }

  const MaddyPresence = Object.freeze({
    name: ENGINE_NAME,
    version: ENGINE_VERSION,
    buildId: BUILD_ID,
    schema: SCHEMA,

    states: PRESENCE_STATES,
    modes: PRESENCE_MODES,
    emotions: PRESENCE_EMOTIONS,
    attentionTargets:
      PRESENCE_ATTENTION,
    activities:
      PRESENCE_ACTIVITIES,
    idleBehaviors:
      IDLE_BEHAVIORS,
    modeProfiles:
      MODE_PROFILES,

    initialize,
    boot,
    shutdown,
    reset,
    configure,

    setState: transitionState,
    transitionState,
    setMode,
    setEmotion,
    setActivity,

    lookAt,
    lookAtTemporarily,
    clearTemporaryAttention,

    setContext,
    clearContext,

    startListening,
    stopListening,
    startSpeaking,
    stopSpeaking,

    beginThinking,
    finishThinking,
    celebrate,
    expressConcern,

    performIdleBehavior,
    chooseIdleBehavior,
    startIdleScheduler,
    stopIdleScheduler,
    pauseIdleScheduler,
    resumeIdleScheduler,

    registerRuntimeConnection,

    getStatus,
    getSnapshot,
    getHistory,
    getEventLog,

    runAcceptanceTest,

    canTransition
  });

  window.MaddyPresence =
    MaddyPresence;

  window.MEOSMaddyPresence =
    MaddyPresence;

  document.dispatchEvent(
    new CustomEvent(
      "meos:maddy-presence:registered",
      {
        detail: {
          schema:
            "meos.maddy-presence.registration.v1",
          name:
            ENGINE_NAME,
          version:
            ENGINE_VERSION,
          buildId:
            BUILD_ID,
          registeredAt:
            nowIso()
        }
      }
    )
  );

  console.log(
    `[MEOS] ${ENGINE_NAME} v${ENGINE_VERSION} online. Build ${BUILD_ID}.`
  );

  if (state.config.autoInitialize) {
    if (
      document.readyState ===
      "loading"
    ) {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          initialize();
        },
        {
          once: true
        }
      );
    } else {
      initialize();
    }
  }
})();
  
