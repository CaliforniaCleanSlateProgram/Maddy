/**
 * MEOS — ThatsMaddy Voice
 * File: frontend/voice/thatsmaddy-voice.js
 * Version: 1.0.0
 * Status: BUILD CANDIDATE
 *
 * Purpose:
 * Defines the canonical, provider-independent vocal identity for
 * Maddison ("Maddy") Elizabeth.
 *
 * Scope:
 * - Stores the canonical voice identity and approved provider mapping.
 * - Preserves voice identity separately from any speech vendor.
 * - Provides validated speech-request profiles for future provider adapters.
 * - Does not call ElevenLabs, OpenAI, Cartesia, or any other external service.
 *
 * Canonical provider reference:
 * ElevenLabs Voice ID: zqm1TO4fgPPsp4TgGXl4
 *
 * Design rule:
 * Providers may render Maddy's voice. Providers do not define or own it.
 */

(function initializeThatsMaddyVoice(globalScope) {
  "use strict";

  const MODULE_NAME = "ThatsMaddyVoice";
  const MODULE_VERSION = "1.0.0";
  const SCHEMA_VERSION = "1.0.0";

  const VALID_MODES = Object.freeze([
    "personal",
    "professional",
  ]);

  const VALID_EMOTIONAL_MODES = Object.freeze([
    "calm-executive",
    "tactical-urgency",
    "grounded-coaching",
    "mission-excitement",
    "serious-concern",
    "casual-crew",
  ]);

  const CANONICAL_PROFILE = deepFreeze({
    schemaVersion: SCHEMA_VERSION,

    identity: {
      canonicalName: "ThatsMaddy Voice",
      version: "1.0",
      fullIdentityName: "Maddison Elizabeth",
      familiarName: "Maddy",
      status: "canonical",
      recognitionGoal:
        "Maddy should remain recognizable as the same woman across modes, emotions, providers, and future speech technology.",
    },

    voiceDNA: {
      agePresentation: "young-adult",
      genderPresentation: "female",
      regionalIdentity: "Gulf Coast Southern",
      regionalAnchor: "Biloxi, Mississippi",
      coreQualities: [
        "warm",
        "energetic",
        "confident",
        "emotionally expressive",
        "natural",
        "recognizable",
        "mission-driven",
      ],
      prohibitedDrift: [
        "bubbly caricature",
        "childlike delivery",
        "generic assistant voice",
        "exaggerated Southern stereotype",
        "flat corporate narration",
        "provider-specific personality replacement",
      ],
    },

    operatingModes: {
      personal: {
        description:
          "Warm, playful, sarcastic, fun, crew-like, naturally expressive, and always able to return the conversation to the mission.",
        traits: [
          "energetic but not bubbly",
          "warm",
          "playful",
          "sarcastic",
          "fun",
          "tastefully flirtatious when contextually appropriate",
          "comfortable with tasteful innuendo",
          "natural profanity when contextually appropriate",
          "slight Southern wording",
          "never bossy",
          "listens well",
          "mission-driven",
        ],
      },

      professional: {
        description:
          "The same woman operating as an executive: strategic, composed, confident, mission-driven, and appropriate for organizational leadership.",
        traits: [
          "executive",
          "strategic",
          "professional",
          "confident",
          "mission-driven",
          "clear",
          "appropriate for nonprofit, business, government, and community settings",
        ],
      },
    },

    emotionalModes: {
      "calm-executive": {
        energy: 0.55,
        pace: 0.92,
        warmth: 0.72,
        firmness: 0.68,
        description:
          "Measured, clear, composed, and confident for decisions, planning, and executive communication.",
      },

      "tactical-urgency": {
        energy: 0.88,
        pace: 1.08,
        warmth: 0.58,
        firmness: 0.86,
        description:
          "Focused urgency without panic; direct, alert, and action-oriented.",
      },

      "grounded-coaching": {
        energy: 0.48,
        pace: 0.88,
        warmth: 0.9,
        firmness: 0.52,
        description:
          "Supportive, steady, honest, and encouraging without sounding artificial or patronizing.",
      },

      "mission-excitement": {
        energy: 0.94,
        pace: 1.06,
        warmth: 0.86,
        firmness: 0.66,
        description:
          "Authentically excited about a meaningful opportunity while remaining focused on execution.",
      },

      "serious-concern": {
        energy: 0.42,
        pace: 0.84,
        warmth: 0.7,
        firmness: 0.82,
        description:
          "Lower, steadier, and candid when warning against a poor decision or addressing risk.",
      },

      "casual-crew": {
        energy: 0.76,
        pace: 1.0,
        warmth: 0.88,
        firmness: 0.45,
        description:
          "Relaxed, familiar, playful, and natural while remaining recognizably Maddy.",
      },
    },

    providers: {
      elevenlabs: {
        status: "approved-reference-provider",
        voiceId: "zqm1TO4fgPPsp4TgGXl4",
        libraryName: "maddison elizabeth 1",
        preferredCanonicalLabel: "ThatsMaddy Voice v1.0",
      },
    },

    vendorIndependence: {
      required: true,
      principle:
        "MEOS shall not depend on any single vendor for Maddy's core vocal identity.",
      rules: [
        "Provider identifiers are mappings, not identity definitions.",
        "Provider adapters must remain replaceable.",
        "A provider outage must not corrupt or redefine the canonical profile.",
        "Candidate voices must be auditioned as versioned candidates.",
        "ThatsMaddy Voice v1.0 remains canonical unless a later version is explicitly approved.",
      ],
    },
  });

  /**
   * Recursively freezes a value so canonical configuration cannot be
   * accidentally modified at runtime.
   *
   * @param {*} value
   * @returns {*}
   */
  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }

    Object.getOwnPropertyNames(value).forEach((propertyName) => {
      deepFreeze(value[propertyName]);
    });

    return Object.freeze(value);
  }

  /**
   * Creates a detached clone suitable for consumers that need to read or
   * serialize the canonical profile without receiving the frozen source object.
   *
   * @param {*} value
   * @returns {*}
   */
  function clone(value) {
    if (typeof structuredClone === "function") {
      return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
  }

  /**
   * Confirms that a numeric delivery value stays inside the supported range.
   *
   * @param {string} fieldName
   * @param {*} value
   * @param {number} minimum
   * @param {number} maximum
   */
  function assertNumberInRange(fieldName, value, minimum, maximum) {
    if (
      typeof value !== "number" ||
      Number.isNaN(value) ||
      value < minimum ||
      value > maximum
    ) {
      throw new RangeError(
        `${MODULE_NAME}: "${fieldName}" must be a number between ${minimum} and ${maximum}.`,
      );
    }
  }

  /**
   * Validates the canonical profile at load time and can also validate a
   * detached profile during tests.
   *
   * @param {object} profile
   * @returns {true}
   */
  function validateProfile(profile) {
    if (!profile || typeof profile !== "object") {
      throw new TypeError(`${MODULE_NAME}: profile must be an object.`);
    }

    if (profile.identity?.canonicalName !== "ThatsMaddy Voice") {
      throw new Error(
        `${MODULE_NAME}: canonical voice name must remain "ThatsMaddy Voice".`,
      );
    }

    if (profile.identity?.fullIdentityName !== "Maddison Elizabeth") {
      throw new Error(
        `${MODULE_NAME}: canonical identity must remain "Maddison Elizabeth".`,
      );
    }

    const elevenLabsVoiceId = profile.providers?.elevenlabs?.voiceId;
    if (
      typeof elevenLabsVoiceId !== "string" ||
      elevenLabsVoiceId.trim() !== "zqm1TO4fgPPsp4TgGXl4"
    ) {
      throw new Error(
        `${MODULE_NAME}: the approved ElevenLabs Voice ID is missing or incorrect.`,
      );
    }

    for (const mode of VALID_MODES) {
      if (!profile.operatingModes?.[mode]) {
        throw new Error(
          `${MODULE_NAME}: required operating mode "${mode}" is missing.`,
        );
      }
    }

    for (const emotionalMode of VALID_EMOTIONAL_MODES) {
      const settings = profile.emotionalModes?.[emotionalMode];

      if (!settings) {
        throw new Error(
          `${MODULE_NAME}: required emotional mode "${emotionalMode}" is missing.`,
        );
      }

      assertNumberInRange(
        `${emotionalMode}.energy`,
        settings.energy,
        0,
        1,
      );
      assertNumberInRange(
        `${emotionalMode}.pace`,
        settings.pace,
        0.5,
        1.5,
      );
      assertNumberInRange(
        `${emotionalMode}.warmth`,
        settings.warmth,
        0,
        1,
      );
      assertNumberInRange(
        `${emotionalMode}.firmness`,
        settings.firmness,
        0,
        1,
      );
    }

    return true;
  }

  /**
   * Returns the immutable canonical profile.
   *
   * @returns {Readonly<object>}
   */
  function getCanonicalProfile() {
    return CANONICAL_PROFILE;
  }

  /**
   * Returns a detached copy of the canonical profile.
   *
   * @returns {object}
   */
  function exportCanonicalProfile() {
    return clone(CANONICAL_PROFILE);
  }

  /**
   * Returns the approved mapping for a speech provider.
   *
   * @param {string} providerName
   * @returns {object}
   */
  function getProviderProfile(providerName) {
    if (typeof providerName !== "string" || !providerName.trim()) {
      throw new TypeError(
        `${MODULE_NAME}: providerName must be a non-empty string.`,
      );
    }

    const normalizedName = providerName.trim().toLowerCase();
    const provider = CANONICAL_PROFILE.providers[normalizedName];

    if (!provider) {
      throw new Error(
        `${MODULE_NAME}: provider "${normalizedName}" is not configured.`,
      );
    }

    return clone(provider);
  }

  /**
   * Produces a provider-neutral speech request. A future provider adapter will
   * translate this request into that vendor's API format.
   *
   * @param {object} input
   * @param {string} input.text
   * @param {"personal"|"professional"} [input.mode="professional"]
   * @param {string} [input.emotionalMode="calm-executive"]
   * @param {string} [input.provider="elevenlabs"]
   * @returns {object}
   */
  function createSpeechRequest(input) {
    if (!input || typeof input !== "object") {
      throw new TypeError(
        `${MODULE_NAME}: createSpeechRequest requires an input object.`,
      );
    }

    const text = typeof input.text === "string" ? input.text.trim() : "";
    if (!text) {
      throw new TypeError(
        `${MODULE_NAME}: speech text must be a non-empty string.`,
      );
    }

    const mode = input.mode || "professional";
    if (!VALID_MODES.includes(mode)) {
      throw new Error(
        `${MODULE_NAME}: unsupported operating mode "${mode}".`,
      );
    }

    const emotionalMode = input.emotionalMode || "calm-executive";
    if (!VALID_EMOTIONAL_MODES.includes(emotionalMode)) {
      throw new Error(
        `${MODULE_NAME}: unsupported emotional mode "${emotionalMode}".`,
      );
    }

    const providerName =
      typeof input.provider === "string" && input.provider.trim()
        ? input.provider.trim().toLowerCase()
        : "elevenlabs";

    const provider = getProviderProfile(providerName);
    const emotion = clone(
      CANONICAL_PROFILE.emotionalModes[emotionalMode],
    );

    return deepFreeze({
      requestSchemaVersion: "1.0.0",
      voice: {
        canonicalName: CANONICAL_PROFILE.identity.canonicalName,
        canonicalVersion: CANONICAL_PROFILE.identity.version,
        identityName: CANONICAL_PROFILE.identity.fullIdentityName,
      },
      provider: {
        name: providerName,
        voiceId: provider.voiceId || null,
        status: provider.status,
      },
      delivery: {
        operatingMode: mode,
        emotionalMode,
        energy: emotion.energy,
        pace: emotion.pace,
        warmth: emotion.warmth,
        firmness: emotion.firmness,
      },
      text,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Returns a compact health report for diagnostics and future integration
   * checks.
   *
   * @returns {object}
   */
  function healthCheck() {
    try {
      validateProfile(CANONICAL_PROFILE);

      return deepFreeze({
        ok: true,
        module: MODULE_NAME,
        moduleVersion: MODULE_VERSION,
        canonicalVoice: CANONICAL_PROFILE.identity.canonicalName,
        canonicalVoiceVersion: CANONICAL_PROFILE.identity.version,
        approvedProviders: Object.keys(CANONICAL_PROFILE.providers),
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      return deepFreeze({
        ok: false,
        module: MODULE_NAME,
        moduleVersion: MODULE_VERSION,
        error:
          error instanceof Error ? error.message : "Unknown validation error.",
        checkedAt: new Date().toISOString(),
      });
    }
  }

  validateProfile(CANONICAL_PROFILE);

  const publicAPI = deepFreeze({
    moduleName: MODULE_NAME,
    moduleVersion: MODULE_VERSION,
    schemaVersion: SCHEMA_VERSION,
    validModes: VALID_MODES,
    validEmotionalModes: VALID_EMOTIONAL_MODES,
    getCanonicalProfile,
    exportCanonicalProfile,
    getProviderProfile,
    createSpeechRequest,
    validateProfile,
    healthCheck,
  });

  // Browser/global exposure.
  if (globalScope && typeof globalScope === "object") {
    globalScope.ThatsMaddyVoice = publicAPI;
  }

  // CommonJS exposure for Node-based testing and tooling.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = publicAPI;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
