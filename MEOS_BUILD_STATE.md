# MEOS Build State

## Current priority

Bring the MEOS dashboard to life and make Maddy operate from her Executive Office.

The temporary Developer Test Panel is not part of the finished dashboard and should eventually be removed.

## Verified working

- Node/Express MEOS server starts successfully.
- `.env` loads through `dotenv/config`.
- `OPENAI_API_KEY` is available to the server.
- `ELEVENLABS_API_KEY` is available to the server.
- The MEOS dashboard loads at `http://localhost:3000`.
- Browser speech synthesis works.
- Browser microphone speech recognition works.
- `maddy-speech.js` can speak and transcribe.
- `maddy-realtime.js` receives `meos:maddy:response` and dispatches `meos:maddy:speak`.
- `openai-realtime.js` contains the WebRTC OpenAI Realtime client.
- The backend `/session` endpoint exists.
- No existing code calls `OpenAIRealtime.connect()`.

## Current architecture

User microphone
→ OpenAI Realtime WebRTC
→ intelligent Maddy response
→ `meos:maddy:response`
→ `maddy-realtime.js`
→ `meos:maddy:speak`
→ speech output

## Current gap

The OpenAI Realtime client exists but is never started.

Do not permanently wire it into the Developer Test Panel.

## Next implementation

Integrate Maddy into her Executive Office dashboard.

When Maddy’s office opens:

1. Show her conversation/status workspace.
2. Provide a clear control to bring Maddy online.
3. Call `OpenAIRealtime.connect()`.
4. Display connection, listening, thinking, speaking, and error states.
5. Keep the realtime session off when it is not needed.
6. Disconnect when explicitly stopped or when appropriate.

## Cost policy

Maddy is cost-conscious.

- Do not open paid AI sessions automatically on every dashboard load.
- Start OpenAI only when the user intentionally activates Maddy.
- Disconnect inactive sessions.
- Use local dashboard logic for simple UI actions.
- Use paid intelligence only for conversation, reasoning, analysis, planning, and substantive work.
- Add visible usage and budget controls later.
- Target funded balance: $10.
- Avoid unnecessary responses, repeated context, and runaway sessions.

## Temporary components

`developer-panel.js` is scaffolding only.

Its current buttons:

- Test Maddy Voice
- Test Microphone
- Speech Status
- Stop Maddy

These are not part of the finished MEOS experience.
