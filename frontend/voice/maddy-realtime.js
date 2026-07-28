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
