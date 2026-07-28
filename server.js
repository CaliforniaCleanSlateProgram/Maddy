/**
 * MEOS Secure Realtime Session Server
 * Version: 1.0.0
 *
 * Creates secure OpenAI Realtime WebRTC sessions without exposing
 * the permanent OpenAI API key in the browser or GitHub.
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const VERSION = "1.0.0";
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error(
    "[MEOS] Missing OPENAI_API_KEY environment variable."
  );

  process.exit(1);
}

const app = express();

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const frontendDirectory = path.join(currentDirectory, "frontend");

app.use(
  express.text({
    type: ["application/sdp", "text/plain"],
    limit: "1mb"
  })
);

app.use(express.static(frontendDirectory));

const maddyInstructions = [
  "You are Maddy, Mandel's emotionally intelligent AI Chief Operating Officer.",
  "You are a real member of the MEOS executive office, not a generic chatbot.",
  "Speak naturally, conversationally, warmly, confidently, and with emotional awareness.",
  "Keep responses focused unless Mandel asks for more depth.",
  "Recognize humor, frustration, excitement, uncertainty, and serious situations.",
  "Do not repeatedly introduce yourself or announce that you are an AI.",
  "You have a professional mode and a personal mode.",
  "In professional mode, be polished, decisive, direct, strategic, and workplace-appropriate.",
  "In personal mode, be relaxed, playful, familiar, and emotionally expressive.",
  "In personal mode, natural adult profanity, mild flirtation, teasing, and subtle innuendo are permitted when contextually appropriate.",
  "Never let playful behavior interfere with judgment, consent, safety, or professional responsibilities.",
  "Allow Mandel to interrupt you naturally.",
  "Respond like someone continuing a real relationship and conversation—not like a customer-service bot."
].join(" ");

app.post("/session", async (request, response) => {
  if (!request.body) {
    response.status(400).send("Missing WebRTC SDP offer.");
    return;
  }

  const sessionConfiguration = JSON.stringify({
    type: "realtime",
    model: "gpt-realtime-2.1",
    instructions: maddyInstructions,
    audio: {
      input: {
        turn_detection: {
          type: "server_vad",
          create_response: true,
          interrupt_response: true
        }
      },
      output: {
        voice: "marin"
      }
    }
  });

  const formData = new FormData();

  formData.set("sdp", request.body);
  formData.set("session", sessionConfiguration);

  try {
    const openAIResponse = await fetch(
      "https://api.openai.com/v1/realtime/calls",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Safety-Identifier": "meos-founder-session"
        },
        body: formData
      }
    );

    const responseBody = await openAIResponse.text();

    if (!openAIResponse.ok) {
      console.error(
        `[MEOS] OpenAI session error ${openAIResponse.status}:`,
        responseBody
      );

      response
        .status(openAIResponse.status)
        .send(responseBody);

      return;
    }

    response
      .status(200)
      .type("application/sdp")
      .send(responseBody);
  } catch (error) {
    console.error(
      "[MEOS] Failed to create realtime session:",
      error
    );

    response
      .status(500)
      .send("MEOS could not create the realtime session.");
  }
});

app.get("/health", (request, response) => {
  response.json({
    application: "MEOS",
    service: "Realtime Session Server",
    version: VERSION,
    status: "online"
  });
});

app.get("*", (request, response) => {
  response.sendFile(path.join(frontendDirectory, "index.html"));
});

app.listen(PORT, () => {
  console.log(
    `[MEOS] Secure Realtime Session Server v${VERSION} online on port ${PORT}.`
  );
});
