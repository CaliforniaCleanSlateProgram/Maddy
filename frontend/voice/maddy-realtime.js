/**
 * Maddy Realtime Conversation Engine
 * Version: 1.0.0
 *
 * Purpose:
 * Provides the foundation for natural, continuous voice
 * conversations with Maddy.
 *
 * NOTE:
 * This file intentionally contains no API keys and makes
 * no provider-specific assumptions. Voice providers are
 * connected through adapters in later versions.
 */

(function initializeMaddyRealtime(global) {
    "use strict";

    const VERSION = "1.0.0";

    const state = {
        connected: false,
        listening: false,
        speaking: false,
        provider: null,
        sessionStarted: null
    };

    function status() {
        return Object.freeze({
            version: VERSION,
            ...state
        });
    }

    async function connect(providerName = "unassigned") {

        state.provider = providerName;
        state.connected = true;
        state.sessionStarted = new Date().toISOString();

        console.log(
            `[MEOS] Maddy Realtime v${VERSION} connected (${providerName}).`
        );

        return status();
    }

    function disconnect() {

        state.connected = false;
        state.listening = false;
        state.speaking = false;

        console.log("[MEOS] Maddy Realtime disconnected.");

        return status();
    }

    function beginConversation() {

        if (!state.connected) {
            throw new Error(
                "Realtime provider has not been connected."
            );
        }

        state.listening = true;

        console.log("[MEOS] Conversation started.");

        return status();
    }

    function endConversation() {

        state.listening = false;
        state.speaking = false;

        console.log("[MEOS] Conversation ended.");

        return status();
    }
    function handleMaddyResponse(event) {

    const responseText =
        event.detail?.text?.trim();

    if (!responseText) {
        return;
    }

    state.speaking = true;

    console.log(
        "[MEOS] Maddy Realtime received response:",
        responseText
    );

    global.dispatchEvent(
        new CustomEvent("meos:maddy:speak", {
            detail: {
                text: responseText,
                provider: state.provider
            }
        })
    );
}

function handleSpeechStarted() {
    state.speaking = true;
}

function handleSpeechEnded() {
    state.speaking = false;
}

global.addEventListener(
    "meos:maddy:response",
    handleMaddyResponse
);

global.addEventListener(
    "meos:maddy:speech-started",
    handleSpeechStarted
);

global.addEventListener(
    "meos:maddy:speech-ended",
    handleSpeechEnded
);
    global.MaddyRealtime = Object.freeze({

        version: VERSION,

        connect,

        disconnect,

        beginConversation,

        endConversation,

        getStatus: status

    });

    console.log(
        `[MEOS] Maddy Realtime Conversation Engine v${VERSION} online.`
    );

})(window);
