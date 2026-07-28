/**
 * MEOS — Maddy Speech
 * Version: 1.0.0
 *
 * Gives Maddy the ability to:
 * - Speak text aloud
 * - Stop, pause, and resume speaking
 * - Listen through the microphone
 * - Convert speech into text
 * - Report speech and listening status
 *
 * This file handles speech technology.
 * Maddy's identity and personality remain separate.
 */

(function initializeMaddySpeech(global) {
  "use strict";

  const VERSION = "1.0.0";

  const SpeechRecognition =
    global.SpeechRecognition || global.webkitSpeechRecognition || null;

  const state = {
    initialized: false,
    speaking: false,
    listening: false,
    paused: false,
    supported: {
      speech: "speechSynthesis" in global,
      listening: Boolean(SpeechRecognition)
    },
    selectedVoice: null,
    recognition: null,
    lastSpokenText: "",
    lastHeardText: "",
    lastError: null
  };

  const listeners = new Map();

  const DEFAULT_VOICE_PROFILE = {
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
  };

  function emit(eventName, detail = {}) {
    const eventListeners = listeners.get(eventName);

    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener(detail);
        } catch (error) {
          console.error(
            `[Maddy Speech] Listener failed for "${eventName}":`,
            error
          );
        }
      });
    }

    global.dispatchEvent(
      new CustomEvent(`maddy-speech:${eventName}`, {
        detail
      })
    );
  }

  function on(eventName, listener) {
    if (typeof listener !== "function") {
      throw new TypeError("MaddySpeech.on requires a function.");
    }

    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set());
    }

    listeners.get(eventName).add(listener);

    return function unsubscribe() {
      listeners.get(eventName)?.delete(listener);
    };
  }

  function getExternalVoiceProfile() {
    const possibleProfiles = [
      global.ThatsMaddyVoice,
      global.thatsMaddyVoice,
      global.MaddyVoice
    ];

    for (const profile of possibleProfiles) {
      if (profile && typeof profile === "object") {
        return profile;
      }
    }

    return {};
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

  function selectBestVoice(settings = getVoiceSettings()) {
    if (!state.supported.speech) {
      return null;
    }

    const voices = global.speechSynthesis.getVoices();

    if (!voices.length) {
      return null;
    }

    const preferredNames = Array.isArray(settings.preferredNames)
      ? settings.preferredNames
      : [];

    for (const preferredName of preferredNames) {
      const preferredVoice = voices.find((voice) =>
        voice.name.toLowerCase().includes(preferredName.toLowerCase())
      );

      if (preferredVoice) {
        state.selectedVoice = preferredVoice;
        return preferredVoice;
      }
    }

    const matchingFemaleVoice = voices.find((voice) => {
      const name = voice.name.toLowerCase();

      return (
        voice.lang.startsWith("en-US") &&
        ["aria", "jenny", "samantha", "zira", "female"].some((word) =>
          name.includes(word)
        )
      );
    });

    const matchingLanguageVoice = voices.find((voice) =>
      voice.lang.startsWith(settings.language || "en-US")
    );

    state.selectedVoice =
      matchingFemaleVoice || matchingLanguageVoice || voices[0];

    return state.selectedVoice;
  }

  function speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      const cleanText = String(text || "").trim();

      if (!cleanText) {
        const error = new Error("Maddy needs text before she can speak.");
        state.lastError = error.message;
        reject(error);
        return;
      }

      if (!state.supported.speech) {
        const error = new Error(
          "Speech synthesis is not supported in this browser."
        );
        state.lastError = error.message;
        emit("error", { area: "speech", message: error.message });
        reject(error);
        return;
      }

      const settings = getVoiceSettings(options);

      if (options.interrupt !== false) {
        global.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);

      utterance.lang = settings.language;
      utterance.rate = Number(settings.rate) || DEFAULT_VOICE_PROFILE.rate;
      utterance.pitch = Number(settings.pitch) || DEFAULT_VOICE_PROFILE.pitch;
      utterance.volume =
        typeof settings.volume === "number"
          ? settings.volume
          : DEFAULT_VOICE_PROFILE.volume;

      utterance.voice = selectBestVoice(settings);

      utterance.onstart = () => {
        state.speaking = true;
        state.paused = false;
        state.lastSpokenText = cleanText;
        state.lastError = null;

        emit("speaking-started", {
          text: cleanText,
          voice: utterance.voice?.name || "Browser default"
        });
      };

      utterance.onend = () => {
        state.speaking = false;
        state.paused = false;

        emit("speaking-ended", {
          text: cleanText
        });

        resolve({
          text: cleanText,
          voice: utterance.voice?.name || "Browser default"
        });
      };

      utterance.onerror = (event) => {
        state.speaking = false;
        state.paused = false;

        const message =
          event.error === "interrupted" || event.error === "canceled"
            ? "Maddy's speech was stopped."
            : `Maddy could not speak: ${event.error || "unknown error"}`;

        state.lastError = message;

        emit("error", {
          area: "speech",
          message,
          browserError: event.error
        });

        reject(new Error(message));
      };

      global.speechSynthesis.speak(utterance);
    });
  }

  function stopSpeaking() {
    if (!state.supported.speech) {
      return false;
    }

    global.speechSynthesis.cancel();
    state.speaking = false;
    state.paused = false;

    emit("speaking-stopped");

    return true;
  }

  function pauseSpeaking() {
    if (!state.supported.speech || !state.speaking) {
      return false;
    }

    global.speechSynthesis.pause();
    state.paused = true;

    emit("speaking-paused");

    return true;
  }

  function resumeSpeaking() {
    if (!state.supported.speech || !state.paused) {
      return false;
    }

    global.speechSynthesis.resume();
    state.paused = false;
    state.speaking = true;

    emit("speaking-resumed");

    return true;
  }

  function createRecognition() {
    if (!SpeechRecognition) {
      return null;
    }

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

        if (event.results[index].isFinal) {
          finalText += `${transcript} `;
        } else {
          interimText += `${transcript} `;
        }
      }

      interimText = interimText.trim();
      finalText = finalText.trim();

      if (interimText) {
        emit("hearing-interim", {
          text: interimText
        });
      }

      if (finalText) {
        state.lastHeardText = finalText;

        emit("heard", {
          text: finalText
        });
      }
    };

    recognition.onerror = (event) => {
      state.listening = false;

      const messages = {
        "not-allowed":
          "Microphone permission was denied. Allow microphone access and try again.",
        "no-speech": "Maddy did not hear any speech.",
        "audio-capture": "No working microphone was found.",
        network: "The browser speech service could not connect."
      };

      const message =
        messages[event.error] ||
        `Maddy could not listen: ${event.error || "unknown error"}`;

      state.lastError = message;

      emit("error", {
        area: "listening",
        message,
        browserError: event.error
      });
    };

    recognition.onend = () => {
      state.listening = false;

      emit("listening-ended", {
        text: state.lastHeardText
      });
    };

    return recognition;
  }

  function startListening(options = {}) {
    return new Promise((resolve, reject) => {
      if (!state.supported.listening) {
        const error = new Error(
          "Speech recognition is not supported in this browser."
        );

        state.lastError = error.message;
        emit("error", { area: "listening", message: error.message });
        reject(error);
        return;
      }

      if (state.listening) {
        reject(new Error("Maddy is already listening."));
        return;
      }

      if (options.stopSpeaking !== false) {
        stopSpeaking();
      }

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

      const unsubscribeError = on("error", (errorDetail) => {
        if (errorDetail.area === "listening") {
          unsubscribeError();
          unsubscribeHeard();
          reject(new Error(errorDetail.message));
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
    if (!state.recognition || !state.listening) {
      return false;
    }

    state.recognition.stop();
    state.listening = false;

    emit("listening-stopped");

    return true;
  }

  function getAvailableVoices() {
    if (!state.supported.speech) {
      return [];
    }

    return global.speechSynthesis.getVoices().map((voice) => ({
      name: voice.name,
      language: voice.lang,
      default: voice.default,
      local: voice.localService
    }));
  }

  function getStatus() {
    return {
      version: VERSION,
      initialized: state.initialized,
      speaking: state.speaking,
      listening: state.listening,
      paused: state.paused,
      supported: { ...state.supported },
      selectedVoice: state.selectedVoice?.name || null,
      lastSpokenText: state.lastSpokenText,
      lastHeardText: state.lastHeardText,
      lastError: state.lastError
    };
  }

  function initialize() {
    if (state.initialized) {
      return getStatus();
    }

    state.initialized = true;

    if (state.supported.speech) {
      selectBestVoice();

      global.speechSynthesis.addEventListener("voiceschanged", () => {
        const selectedVoice = selectBestVoice();

        emit("voices-ready", {
          selectedVoice: selectedVoice?.name || null,
          voices: getAvailableVoices()
        });
      });
    }

    console.log(`[MEOS] Maddy Speech v${VERSION} online.`);
    console.log(
      `[MEOS] Speaking: ${
        state.supported.speech ? "available" : "not supported"
      }`
    );
    console.log(
      `[MEOS] Listening: ${
        state.supported.listening ? "available" : "not supported"
      }`
    );

    emit("ready", getStatus());

    return getStatus();
  }

  const MaddySpeech = Object.freeze({
    version: VERSION,
    initialize,
    speak,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    startListening,
    stopListening,
    getAvailableVoices,
    getStatus,
    on
  });

  global.MaddySpeech = MaddySpeech;

  initialize();
})(window);
