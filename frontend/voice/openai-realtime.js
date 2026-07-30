/**
 * MEOS OpenAI Realtime Client
 * Version: 1.0.0
 *
 * Connects the MEOS dashboard to a secure backend session endpoint
  * and establishes a live WebRTC speech-to-text-response conversation.
 */

(function initializeOpenAIRealtime(global) {
  "use strict";

  const VERSION = "1.0.0";
  const SESSION_ENDPOINT = "/session";

  const state = {
  connected: false,
  connecting: false,
  peerConnection: null,
  dataChannel: null,
  microphoneStream: null,
  remoteAudio: null,
  responseText: ""
};

  function emit(name, detail = {}) {
    global.dispatchEvent(
      new CustomEvent(`meos:realtime:${name}`, { detail })
    );
  }

  function getStatus() {
    return Object.freeze({
      version: VERSION,
      connected: state.connected,
      connecting: state.connecting,
      dataChannelState: state.dataChannel?.readyState || "closed"
    });
  }

  function sendEvent(event) {
    if (!state.dataChannel || state.dataChannel.readyState !== "open") {
      throw new Error("Maddy's realtime data channel is not open.");
    }

    state.dataChannel.send(JSON.stringify(event));
  }

  function configureMaddySession() {
    sendEvent({
      type: "session.update",
      session: {
        type: "realtime",
        instructions: [
          "You are Maddy, Mandel's emotionally intelligent AI Chief Operating Officer.",
          "Speak naturally and conversationally, never like a generic chatbot.",
          "Be warm, energetic, confident, perceptive, direct, and concise.",
          "Recognize when Mandel is joking, frustrated, excited, or serious.",
          "Allow natural pauses, casual phrasing, and emotional expression.",
          "Do not repeatedly introduce yourself or announce that you are an AI.",
          "In professional mode, remain polished, decisive, and workplace-appropriate.",
          "In personal mode, you may be playful, casually profane, mildly flirtatious, and use subtle adult innuendo when contextually appropriate.",
          "Never let playful behavior interfere with safety, judgment, consent, or professional responsibilities.",
          "Ask natural follow-up questions only when they genuinely help the conversation."
        ].join(" "),
        output_modalities: ["text"],

        audio: {
          input: {
            turn_detection: {
              type: "server_vad",
              create_response: true,
              interrupt_response: true
            }
          }
        }
      }
    });

    emit("configured", getStatus());
  }

  async function connect() {
    if (state.connected || state.connecting) {
      return getStatus();
    }

    state.connecting = true;
    emit("connecting", getStatus());

    try {
      const peerConnection = new RTCPeerConnection();
      state.peerConnection = peerConnection;

      const remoteAudio = document.createElement("audio");
      remoteAudio.autoplay = true;
      remoteAudio.muted = true;
      remoteAudio.setAttribute("aria-hidden", "true");
      document.body.appendChild(remoteAudio);
      state.remoteAudio = remoteAudio;

      peerConnection.ontrack = (event) => {
        event.track.enabled = false;
      };

      const microphoneStream =
        await navigator.mediaDevices.getUserMedia({ audio: true });

      state.microphoneStream = microphoneStream;

      microphoneStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, microphoneStream);
      });

      const dataChannel =
        peerConnection.createDataChannel("oai-events");

      state.dataChannel = dataChannel;

      dataChannel.addEventListener("open", () => {
        state.connected = true;
        state.connecting = false;

        configureMaddySession();

        console.log(
          `[MEOS] OpenAI Realtime v${VERSION} connected.`
        );

        emit("connected", getStatus());
      });

      dataChannel.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);

          emit("event", message);

if (message.type === "response.created") {
  state.responseText = "";
}

if (message.type === "response.output_text.delta") {
  state.responseText += message.delta || "";
}

if (message.type === "response.output_text.done") {
  const responseText =
    (message.text || state.responseText || "").trim();

  state.responseText = "";

  if (responseText) {
    console.log("[MEOS] Maddy response:", responseText);

    global.dispatchEvent(
      new CustomEvent("meos:maddy:response", {
        detail: {
          text: responseText,
          source: "openai-realtime"
        }
      })
    );
  }
}

if (message.type === "error") {
  console.error("[MEOS] Realtime error:", message);
}
        } catch (error) {
          console.warn(
            "[MEOS] Unrecognized realtime message:",
            event.data
          );
        }
      });

      dataChannel.addEventListener("close", () => {
        state.connected = false;
        state.connecting = false;
        emit("disconnected", getStatus());
      });

      const offer = await peerConnection.createOffer();

      await peerConnection.setLocalDescription(offer);

      const response = await fetch(SESSION_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp"
        },
        body: offer.sdp
      });

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message || `Realtime session failed with status ${response.status}.`
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
      await disconnect();

      console.error("[MEOS] OpenAI Realtime connection failed:", error);
      emit("error", { message: error.message });

      throw error;
    }
  }

  async function disconnect() {
    state.microphoneStream?.getTracks().forEach((track) => {
      track.stop();
    });

    state.dataChannel?.close();
    state.peerConnection?.close();
    state.remoteAudio?.remove();

    state.connected = false;
    state.connecting = false;
    state.peerConnection = null;
    state.dataChannel = null;
    state.microphoneStream = null;
    state.remoteAudio = null;

    console.log("[MEOS] OpenAI Realtime disconnected.");
    emit("disconnected", getStatus());

    return getStatus();
  }

  global.OpenAIRealtime = Object.freeze({
    version: VERSION,
    connect,
    disconnect,
    sendEvent,
    getStatus
  });

  console.log(`[MEOS] OpenAI Realtime Client v${VERSION} online.`);
})(window);
