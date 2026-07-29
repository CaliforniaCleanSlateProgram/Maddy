/**
 * MEOS Developer Panel
 * Version: 1.0.0
 *
 * Provides simple dashboard controls for testing MEOS capabilities
 * without requiring Chrome DevTools commands.
 */

(function initializeMEOSDeveloperPanel(global) {
  "use strict";

  const VERSION = "1.0.0";
  const PANEL_ID = "meos-developer-panel";

  function createElement(tagName, properties = {}) {
    const element = document.createElement(tagName);

    Object.entries(properties).forEach(([key, value]) => {
      if (key === "text") {
        element.textContent = value;
      } else if (key === "className") {
        element.className = value;
      } else {
        element.setAttribute(key, value);
      }
    });

    return element;
  }

  function setStatus(message, type = "information") {
    const status = document.getElementById("meos-developer-status");

    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.type = type;
  }

  async function testMaddyVoice() {
    if (!global.MaddySpeech) {
      setStatus("Maddy Speech is not available.", "error");
      return;
    }

    setStatus("Maddy is preparing to speak…", "working");

    try {
      await global.MaddySpeech.speak(
        "Hey Mandel! Maddy is online, and I can finally speak through the MEOS dashboard."
      );

      setStatus("Maddy completed the voice test.", "success");
    } catch (error) {
      setStatus(error.message || "The voice test failed.", "error");
    }
  }

  async function testMicrophone() {
    if (!global.OpenAIRealtime) {
        setStatus(
            "OpenAI Realtime is not available.",
            "error"
        );
        return;
    }

    setStatus(
        "Connecting Maddy to OpenAI Realtime..."
    );

    try {
        await global.OpenAIRealtime.connect();

        setStatus(
            "Maddy is connected to OpenAI Realtime.",
            "success"
        );
    } catch (error) {
        setStatus(
            error.message ||
            "Unable to connect to OpenAI Realtime.",
            "error"
        );
    }
}

    

  function showSpeechStatus() {
    if (!global.MaddySpeech) {
      setStatus("Maddy Speech is not available.", "error");
      return;
    }

    const status = global.MaddySpeech.getStatus();

    setStatus(
      `Speech: ${status.supported.speech ? "available" : "unavailable"} | ` +
        `Listening: ${status.supported.listening ? "available" : "unavailable"} | ` +
        `Voice: ${status.selectedVoice || "browser default"}`,
      "information"
    );
  }

  function stopMaddy() {
    if (!global.MaddySpeech) {
      setStatus("Maddy Speech is not available.", "error");
      return;
    }

    global.MaddySpeech.stopSpeaking();
    global.MaddySpeech.stopListening();

    setStatus("Maddy's speech and microphone were stopped.", "information");
  }

  function createButton(label, handler) {
    const button = createElement("button", {
      type: "button",
      text: label
    });

    Object.assign(button.style, {
      border: "1px solid rgba(255, 255, 255, 0.25)",
      borderRadius: "8px",
      padding: "9px 12px",
      background: "rgba(255, 255, 255, 0.1)",
      color: "#ffffff",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "600"
    });

    button.addEventListener("click", handler);

    return button;
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) {
      return;
    }

    const panel = createElement("section", {
      id: PANEL_ID,
      "aria-label": "MEOS Developer Test Panel"
    });

    Object.assign(panel.style, {
      position: "fixed",
      right: "18px",
      bottom: "18px",
      width: "310px",
      padding: "16px",
      borderRadius: "14px",
      background: "rgba(15, 23, 42, 0.96)",
      color: "#ffffff",
      boxShadow: "0 12px 35px rgba(0, 0, 0, 0.35)",
      zIndex: "9999",
      fontFamily: "Arial, sans-serif"
    });

    const header = createElement("div");

    Object.assign(header.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "12px"
    });

    const title = createElement("strong", {
      text: "MEOS Test Panel"
    });

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
      fontSize: "22px"
    });

    closeButton.addEventListener("click", () => {
      panel.style.display = "none";
    });

    header.append(title, closeButton);

    const buttons = createElement("div");

    Object.assign(buttons.style, {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "8px"
    });

    buttons.append(
      createButton("Test Maddy Voice", testMaddyVoice),
      createButton("Test Microphone", testMicrophone),
      createButton("Speech Status", showSpeechStatus),
      createButton("Stop Maddy", stopMaddy)
    );

    const status = createElement("div", {
      id: "meos-developer-status",
      text: "Ready for testing."
    });

    Object.assign(status.style, {
      marginTop: "12px",
      padding: "10px",
      borderRadius: "8px",
      background: "rgba(255, 255, 255, 0.08)",
      fontSize: "12px",
      lineHeight: "1.4"
    });

    const version = createElement("div", {
      text: `Developer Panel v${VERSION}`
    });

    Object.assign(version.style, {
      marginTop: "8px",
      textAlign: "right",
      opacity: "0.55",
      fontSize: "10px"
    });

    panel.append(header, buttons, status, version);
    document.body.appendChild(panel);

    console.log(`[MEOS] Developer Panel v${VERSION} online.`);
  }

  function initialize() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", createPanel, {
        once: true
      });
    } else {
      createPanel();
    }
  }

  global.MEOSDeveloperPanel = Object.freeze({
    version: VERSION,
    show() {
      const panel = document.getElementById(PANEL_ID);

      if (panel) {
        panel.style.display = "block";
      }
    },
    hide() {
      const panel = document.getElementById(PANEL_ID);

      if (panel) {
        panel.style.display = "none";
      }
    }
  });

  initialize();
})(window);
