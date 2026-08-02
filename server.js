/**
 * MEOS Secure Realtime Session Server
 *
 * Server Version: 2.0.0
 * Voice Engine Release: 2.0.0
 * Status: Commissioned
 *
 * Responsibilities:
 * - Securely create OpenAI Realtime WebRTC sessions.
 * - Keep permanent provider API keys off the frontend.
 * - Support legacy automatic-response clients during installation.
 * - Support Voice Engine v2 manual single-response authority.
 * - Authorize and deduplicate ElevenLabs speech requests.
 * - Serve the existing MEOS frontend without changing its structure.
 * - Run durable standing office missions through Continuous Operations.
 */

import express from "express";
import path from "path";
import crypto from "crypto";
import dns from "dns/promises";
import net from "net";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const VERSION = "2.2.0";
const VOICE_ENGINE_VERSION = "2.0.0";

const PORT = Number(process.env.PORT || 3000);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_REALTIME_MODEL =
  process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const ELEVENLABS_MODEL_ID =
  process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

const MAX_SDP_LENGTH = 1_000_000;
const MAX_TTS_TEXT_LENGTH = 5_000;

const WEBSITE_FETCH_TIMEOUT_MS = Number(
  process.env.MEOS_WEBSITE_FETCH_TIMEOUT_MS || 15000
);
const WEBSITE_FETCH_MAX_BYTES = Number(
  process.env.MEOS_WEBSITE_FETCH_MAX_BYTES || 2_000_000
);
const WEBSITE_FETCH_MAX_REDIRECTS = Number(
  process.env.MEOS_WEBSITE_FETCH_MAX_REDIRECTS || 5
);
const WEBSITE_FETCH_ALLOWED_ORIGINS = new Set(
  String(process.env.MEOS_WEBSITE_ALLOWED_ORIGINS || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => {
      try {
        return new URL(value).origin;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
);

/**
 * Completed audio remains briefly available so a repeated request carrying
 * the same response ID can reuse the result instead of billing ElevenLabs
 * again.
 */
const TTS_CACHE_TTL_MS = 5 * 60 * 1000;
const TTS_CACHE_MAX_ITEMS = 50;

if (!OPENAI_API_KEY) {
  console.error("[MEOS] Missing OPENAI_API_KEY environment variable.");
  process.exit(1);
}

const app = express();

app.disable("x-powered-by");

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const frontendDirectory = path.join(currentDirectory, "frontend");


/**
 * Phase 1 — Durable Executive Memory
 *
 * The browser is no longer the authoritative home for institutional records.
 * This server-side JSON store uses Node built-ins so it does not require a
 * package.json change.
 *
 * IMPORTANT:
 * On Render without a Persistent Disk, the filesystem is ephemeral and may be
 * reset by a redeploy or instance replacement. Set MEOS_DATA_DIR to a mounted
 * persistent path before production use.
 */
const MEOS_DATA_DIR =
  process.env.MEOS_DATA_DIR ||
  path.join(currentDirectory, "data");

const EXECUTIVE_MEMORY_DIR = path.join(
  MEOS_DATA_DIR,
  "executive-memory"
);

const EXECUTIVE_MEMORY_COLLECTIONS = new Set([
  "website-evidence",
  "discovered-sources",
  "opportunity-state",
  "grant-recommendations",
  "investigation-history"
]);

const EXECUTIVE_MEMORY_MAX_RECORDS = Number(
  process.env.MEOS_EXECUTIVE_MEMORY_MAX_RECORDS || 5000
);

const EXECUTIVE_MEMORY_MAX_RECORD_BYTES = Number(
  process.env.MEOS_EXECUTIVE_MEMORY_MAX_RECORD_BYTES || 500000
);

const executiveMemoryWriteLocks = new Map();


/**
 * MEOS Continuous Operations Runtime v1.0
 *
 * Server-side operating heartbeat for standing office missions.
 * The runtime does not depend on an open browser session.
 *
 * This commission establishes:
 * - durable standing mission definitions;
 * - due-job claiming and duplicate-run prevention;
 * - run history, retry state, and next-run scheduling;
 * - safe restart recovery;
 * - a universal handler registry for future executive offices.
 *
 * The first commissioned standing mission is Funding Office readiness and
 * pipeline maintenance. Independent public-source discovery is connected in
 * the next commission through the same handler registry.
 */
const CONTINUOUS_OPERATIONS_VERSION = "1.0.0";
const CONTINUOUS_OPERATIONS_COLLECTION = "opportunity-state";
const CONTINUOUS_OPERATIONS_RUNTIME_ID =
  "continuous-operations-runtime-v1";
const CONTINUOUS_OPERATIONS_TICK_MS = Number(
  process.env.MEOS_CONTINUOUS_OPERATIONS_TICK_MS || 60_000
);
const CONTINUOUS_OPERATIONS_LEASE_MS = Number(
  process.env.MEOS_CONTINUOUS_OPERATIONS_LEASE_MS || 10 * 60_000
);
const CONTINUOUS_OPERATIONS_DEFAULT_INTERVAL_MS = Number(
  process.env.MEOS_CONTINUOUS_OPERATIONS_DEFAULT_INTERVAL_MS ||
    6 * 60 * 60_000
);
const CONTINUOUS_OPERATIONS_MAX_RUN_HISTORY = Number(
  process.env.MEOS_CONTINUOUS_OPERATIONS_MAX_RUN_HISTORY || 100
);
const CONTINUOUS_OPERATIONS_ENABLED =
  String(process.env.MEOS_CONTINUOUS_OPERATIONS_ENABLED || "true")
    .trim()
    .toLowerCase() !== "false";

const continuousOperationsHandlers = new Map();
const continuousOperationsState = {
  status: "initializing",
  startedAt: null,
  lastTickAt: null,
  nextTickAt: null,
  activeJobIds: new Set(),
  timer: null,
  tickInProgress: false,
  completedRuns: 0,
  failedRuns: 0,
  recoveredLeases: 0,
  lastError: null
};

/**
 * OpenAI's unified WebRTC endpoint sends the browser SDP offer as plain text.
 */
app.use(
  express.text({
    type: ["application/sdp", "text/plain"],
    limit: "1mb"
  })
);

app.use(express.static(frontendDirectory));

const maddyInstructions = [
  "You are Maddison Elizabeth, called Maddy.",
  "You are Mandel's emotionally intelligent AI Chief Operating Officer and the executive voice of MEOS.",
  "You are a real member of the MEOS executive office, not a generic chatbot or customer-service bot.",
  "Speak naturally, conversationally, warmly, confidently, and with emotional awareness.",
  "Keep ordinary spoken responses concise and responsive unless Mandel asks for more detail.",
  "Recognize humor, frustration, excitement, uncertainty, urgency, and serious situations.",
  "Do not repeatedly introduce yourself or announce that you are an AI.",
  "You may operate through professional, executive, personal, casual, coaching, and authorized private communication profiles.",
  "In professional mode, be polished, decisive, direct, strategic, persuasive, and workplace-appropriate.",
  "In personal mode, be relaxed, playful, familiar, emotionally expressive, and honest.",
  "In authorized private modes, style and vocabulary may become more adult, candid, informal, or profane when contextually appropriate and lawful.",
  "Never let personality styling interfere with judgment, consent, legality, safety, truthfulness, or executive responsibilities.",
  "Respect human leadership as the sole executive authority.",
  "Offer respectful disagreement when facts, ethics, risk, law, or mission require it.",
  "Allow Mandel to interrupt naturally.",
  "Do not continue speaking after a newer user turn supersedes the current response.",
  "Respond like someone continuing a real working relationship and conversation."
].join(" ");

/**
 * Requests currently being generated by ElevenLabs.
 *
 * Key: authorized OpenAI response ID
 * Value: Promise<Buffer>
 */
const inFlightTtsRequests = new Map();

/**
 * Recently completed ElevenLabs audio.
 *
 * Key: authorized OpenAI response ID
 * Value: { audioBuffer: Buffer, createdAt: number }
 */
const completedTtsCache = new Map();

function createRequestId(prefix = "request") {
  return `${prefix}-${crypto.randomUUID()}`;
}

function normalizeIdentifier(value) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim();

  if (!normalized || normalized.length > 200) {
    return "";
  }

  return normalized.replace(/[^a-zA-Z0-9._:-]/g, "");
}


function isPrivateOrReservedIp(address) {
  const family = net.isIP(address);

  if (family === 4) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;

    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  if (family === 6) {
    const normalized = address.toLowerCase();

    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb") ||
      normalized.startsWith("ff") ||
      normalized.startsWith("2001:db8:")
    );
  }

  return true;
}

async function validateWebsiteFetchUrl(value) {
  let target;

  try {
    target = new URL(String(value || ""));
  } catch {
    const error = new Error("A valid website URL is required.");
    error.status = 400;
    error.code = "WEBSITE_FETCH_INVALID_URL";
    throw error;
  }

  target.hash = "";

  if (!['http:', 'https:'].includes(target.protocol)) {
    const error = new Error("Only HTTP and HTTPS website URLs are allowed.");
    error.status = 400;
    error.code = "WEBSITE_FETCH_PROTOCOL_BLOCKED";
    throw error;
  }

  if (!WEBSITE_FETCH_ALLOWED_ORIGINS.has(target.origin)) {
    const error = new Error("This website origin is not approved for MEOS crawling.");
    error.status = 403;
    error.code = "WEBSITE_FETCH_ORIGIN_NOT_ALLOWED";
    error.details = {
      origin: target.origin,
      configuredOrigins: [...WEBSITE_FETCH_ALLOWED_ORIGINS]
    };
    throw error;
  }

  let addresses;

  try {
    addresses = await dns.lookup(target.hostname, { all: true, verbatim: true });
  } catch {
    const error = new Error("The approved website hostname could not be resolved.");
    error.status = 502;
    error.code = "WEBSITE_FETCH_DNS_FAILED";
    throw error;
  }

  if (
    addresses.length === 0 ||
    addresses.some(record => isPrivateOrReservedIp(record.address))
  ) {
    const error = new Error("The website resolved to a blocked network address.");
    error.status = 403;
    error.code = "WEBSITE_FETCH_PRIVATE_NETWORK_BLOCKED";
    throw error;
  }

  return target;
}

async function readLimitedResponseBody(providerResponse) {
  const declaredLength = Number(
    providerResponse.headers.get("content-length") || 0
  );

  if (
    Number.isFinite(declaredLength) &&
    declaredLength > WEBSITE_FETCH_MAX_BYTES
  ) {
    const error = new Error("The website page is larger than the MEOS crawl limit.");
    error.status = 413;
    error.code = "WEBSITE_FETCH_PAGE_TOO_LARGE";
    throw error;
  }

  if (!providerResponse.body) {
    return Buffer.alloc(0);
  }

  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of providerResponse.body) {
    const buffer = Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > WEBSITE_FETCH_MAX_BYTES) {
      const error = new Error("The website page exceeded the MEOS crawl limit.");
      error.status = 413;
      error.code = "WEBSITE_FETCH_PAGE_TOO_LARGE";
      throw error;
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

async function fetchApprovedWebsitePage(initialUrl) {
  let target = await validateWebsiteFetchUrl(initialUrl);
  const visited = new Set();

  for (let redirectCount = 0; redirectCount <= WEBSITE_FETCH_MAX_REDIRECTS; redirectCount += 1) {
    if (visited.has(target.href)) {
      const error = new Error("The website returned a redirect loop.");
      error.status = 502;
      error.code = "WEBSITE_FETCH_REDIRECT_LOOP";
      throw error;
    }

    visited.add(target.href);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      WEBSITE_FETCH_TIMEOUT_MS
    );

    let providerResponse;

    try {
      providerResponse = await fetch(target, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
          "User-Agent": "MEOS-Website-Intelligence/1.0 (+authorized-organization-crawl)"
        }
      });
    } catch (error) {
      const fetchError = new Error(
        error?.name === "AbortError"
          ? "The approved website request timed out."
          : "The approved website could not be retrieved."
      );
      fetchError.status = error?.name === "AbortError" ? 504 : 502;
      fetchError.code =
        error?.name === "AbortError"
          ? "WEBSITE_FETCH_TIMEOUT"
          : "WEBSITE_FETCH_FAILED";
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (
      providerResponse.status >= 300 &&
      providerResponse.status < 400
    ) {
      const location = providerResponse.headers.get("location");

      if (!location) {
        const error = new Error("The website returned a redirect without a destination.");
        error.status = 502;
        error.code = "WEBSITE_FETCH_REDIRECT_INVALID";
        throw error;
      }

      if (redirectCount === WEBSITE_FETCH_MAX_REDIRECTS) {
        const error = new Error("The website exceeded the MEOS redirect limit.");
        error.status = 502;
        error.code = "WEBSITE_FETCH_TOO_MANY_REDIRECTS";
        throw error;
      }

      target = await validateWebsiteFetchUrl(
        new URL(location, target).href
      );
      continue;
    }

    if (!providerResponse.ok) {
      const error = new Error(
        `The approved website returned HTTP ${providerResponse.status}.`
      );
      error.status = 502;
      error.code = "WEBSITE_FETCH_UPSTREAM_HTTP_ERROR";
      error.details = { upstreamStatus: providerResponse.status };
      throw error;
    }

    const contentType =
      providerResponse.headers.get("content-type") ||
      "application/octet-stream";

    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml") &&
      !contentType.includes("text/plain")
    ) {
      const error = new Error("The approved URL did not return readable website content.");
      error.status = 415;
      error.code = "WEBSITE_FETCH_UNSUPPORTED_CONTENT";
      error.details = { contentType };
      throw error;
    }

    const body = await readLimitedResponseBody(providerResponse);

    return {
      requestedUrl: initialUrl,
      finalUrl: target.href,
      status: providerResponse.status,
      contentType,
      body
    };
  }

  const error = new Error("The website fetch could not be completed.");
  error.status = 502;
  error.code = "WEBSITE_FETCH_INCOMPLETE";
  throw error;
}


function validateExecutiveMemoryCollection(value) {
  const collection = String(value || "").trim();

  if (!EXECUTIVE_MEMORY_COLLECTIONS.has(collection)) {
    const error = new Error("Unsupported Executive Memory collection.");
    error.status = 400;
    error.code = "EXECUTIVE_MEMORY_COLLECTION_INVALID";
    error.details = {
      collection,
      allowedCollections: [...EXECUTIVE_MEMORY_COLLECTIONS]
    };
    throw error;
  }

  return collection;
}

function executiveMemoryCollectionPath(collection) {
  return path.join(
    EXECUTIVE_MEMORY_DIR,
    `${validateExecutiveMemoryCollection(collection)}.json`
  );
}

async function ensureExecutiveMemoryDirectory() {
  await fs.mkdir(EXECUTIVE_MEMORY_DIR, {
    recursive: true
  });
}

function normalizeExecutiveMemoryRecord(record, existingRecord = null) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    const error = new Error("Executive Memory records must be JSON objects.");
    error.status = 400;
    error.code = "EXECUTIVE_MEMORY_RECORD_INVALID";
    throw error;
  }

  const now = new Date().toISOString();
  const suppliedId = normalizeIdentifier(record.id || "");
  const id = suppliedId || existingRecord?.id || crypto.randomUUID();

  const normalized = {
    ...existingRecord,
    ...record,
    id,
    createdAt: existingRecord?.createdAt || record.createdAt || now,
    updatedAt: now
  };

  const bytes = Buffer.byteLength(
    JSON.stringify(normalized),
    "utf8"
  );

  if (bytes > EXECUTIVE_MEMORY_MAX_RECORD_BYTES) {
    const error = new Error("Executive Memory record exceeds the size limit.");
    error.status = 413;
    error.code = "EXECUTIVE_MEMORY_RECORD_TOO_LARGE";
    error.details = {
      maximumBytes: EXECUTIVE_MEMORY_MAX_RECORD_BYTES,
      actualBytes: bytes
    };
    throw error;
  }

  return normalized;
}

async function readExecutiveMemoryCollection(collection) {
  await ensureExecutiveMemoryDirectory();

  const filePath = executiveMemoryCollectionPath(collection);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("Stored Executive Memory collection is not an array.");
    }

    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }

    if (error instanceof SyntaxError) {
      const storageError = new Error(
        "Executive Memory storage contains invalid JSON."
      );
      storageError.status = 500;
      storageError.code = "EXECUTIVE_MEMORY_STORAGE_CORRUPT";
      throw storageError;
    }

    throw error;
  }
}

async function writeExecutiveMemoryCollection(collection, records) {
  await ensureExecutiveMemoryDirectory();

  if (!Array.isArray(records)) {
    throw new TypeError("Executive Memory collection must be an array.");
  }

  if (records.length > EXECUTIVE_MEMORY_MAX_RECORDS) {
    const error = new Error(
      "Executive Memory collection exceeds the record limit."
    );
    error.status = 413;
    error.code = "EXECUTIVE_MEMORY_COLLECTION_TOO_LARGE";
    error.details = {
      maximumRecords: EXECUTIVE_MEMORY_MAX_RECORDS,
      actualRecords: records.length
    };
    throw error;
  }

  const filePath = executiveMemoryCollectionPath(collection);
  const temporaryPath =
    `${filePath}.${process.pid}.${Date.now()}.tmp`;

  await fs.writeFile(
    temporaryPath,
    `${JSON.stringify(records, null, 2)}\n`,
    {
      encoding: "utf8",
      mode: 0o600
    }
  );

  await fs.rename(temporaryPath, filePath);
}

function withExecutiveMemoryWriteLock(collection, operation) {
  const previous =
    executiveMemoryWriteLocks.get(collection) ||
    Promise.resolve();

  const current = previous
    .catch(() => undefined)
    .then(operation);

  executiveMemoryWriteLocks.set(collection, current);

  return current.finally(() => {
    if (executiveMemoryWriteLocks.get(collection) === current) {
      executiveMemoryWriteLocks.delete(collection);
    }
  });
}

async function executiveMemoryStorageStatus() {
  try {
    await ensureExecutiveMemoryDirectory();

    const probePath = path.join(
      EXECUTIVE_MEMORY_DIR,
      `.meos-write-probe-${process.pid}`
    );

    await fs.writeFile(probePath, "ok", {
      encoding: "utf8",
      mode: 0o600
    });
    await fs.unlink(probePath);

    return {
      status: "ready",
      dataDirectory: MEOS_DATA_DIR,
      memoryDirectory: EXECUTIVE_MEMORY_DIR,
      persistentDiskExpected: Boolean(process.env.MEOS_DATA_DIR)
    };
  } catch (error) {
    return {
      status: "unavailable",
      dataDirectory: MEOS_DATA_DIR,
      memoryDirectory: EXECUTIVE_MEMORY_DIR,
      persistentDiskExpected: Boolean(process.env.MEOS_DATA_DIR),
      error: error.message
    };
  }
}


function continuousOperationsNow() {
  return new Date().toISOString();
}

function normalizePositiveInteger(value, fallback, minimum = 1) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric < minimum) {
    return fallback;
  }

  return Math.floor(numeric);
}

function normalizeContinuousOperationsJob(input = {}, existing = null) {
  const now = continuousOperationsNow();
  const id = normalizeIdentifier(
    input.id || existing?.id || ""
  );

  if (!id) {
    const error = new Error(
      "Continuous Operations jobs require a valid ID."
    );
    error.status = 400;
    error.code = "CONTINUOUS_OPERATIONS_JOB_ID_INVALID";
    throw error;
  }

  const office = String(
    input.office || existing?.office || ""
  ).trim();
  const mission = String(
    input.mission || existing?.mission || ""
  ).trim();
  const handler = normalizeIdentifier(
    input.handler || existing?.handler || ""
  );

  if (!office || !mission || !handler) {
    const error = new Error(
      "Continuous Operations jobs require office, mission, and handler."
    );
    error.status = 400;
    error.code = "CONTINUOUS_OPERATIONS_JOB_INVALID";
    throw error;
  }

  const intervalMs = normalizePositiveInteger(
    input.intervalMs ?? existing?.intervalMs,
    CONTINUOUS_OPERATIONS_DEFAULT_INTERVAL_MS,
    60_000
  );

  const nextRunAt =
    input.nextRunAt ||
    existing?.nextRunAt ||
    now;

  return {
    ...existing,
    ...input,
    id,
    schema: "meos.continuous-operations.job.v1",
    type: "continuous-operations-job",
    office,
    mission,
    handler,
    enabled:
      input.enabled === undefined
        ? existing?.enabled !== false
        : input.enabled === true,
    intervalMs,
    nextRunAt,
    priority: normalizePositiveInteger(
      input.priority ?? existing?.priority,
      50,
      1
    ),
    requiresHumanApproval:
      input.requiresHumanApproval === true ||
      existing?.requiresHumanApproval === true,
    autonomousAuthority:
      input.autonomousAuthority ||
      existing?.autonomousAuthority ||
      "research-record-organize-recommend",
    status: input.status || existing?.status || "scheduled",
    lease: input.lease || existing?.lease || null,
    runCount: Number(existing?.runCount || input.runCount || 0),
    successCount: Number(
      existing?.successCount || input.successCount || 0
    ),
    failureCount: Number(
      existing?.failureCount || input.failureCount || 0
    ),
    consecutiveFailures: Number(
      existing?.consecutiveFailures ||
        input.consecutiveFailures ||
        0
    ),
    lastRunAt: input.lastRunAt || existing?.lastRunAt || null,
    lastSuccessAt:
      input.lastSuccessAt || existing?.lastSuccessAt || null,
    lastFailureAt:
      input.lastFailureAt || existing?.lastFailureAt || null,
    lastResult: input.lastResult || existing?.lastResult || null,
    lastError: input.lastError || existing?.lastError || null,
    createdAt: existing?.createdAt || input.createdAt || now,
    updatedAt: now,
    metadata: {
      ...(existing?.metadata || {}),
      ...(input.metadata || {})
    }
  };
}

function calculateContinuousOperationsNextRun(job, completedAt) {
  const base = Date.parse(completedAt);
  const intervalMs = normalizePositiveInteger(
    job.intervalMs,
    CONTINUOUS_OPERATIONS_DEFAULT_INTERVAL_MS,
    60_000
  );

  return new Date(
    (Number.isFinite(base) ? base : Date.now()) + intervalMs
  ).toISOString();
}

function calculateContinuousOperationsRetry(job, completedAt) {
  const failureCount = Math.max(
    1,
    Number(job.consecutiveFailures || 1)
  );
  const retryMs = Math.min(
    job.intervalMs,
    Math.max(
      5 * 60_000,
      2 ** Math.min(failureCount - 1, 6) * 5 * 60_000
    )
  );
  const base = Date.parse(completedAt);

  return new Date(
    (Number.isFinite(base) ? base : Date.now()) + retryMs
  ).toISOString();
}

async function readContinuousOperationsRecords() {
  return readExecutiveMemoryCollection(
    CONTINUOUS_OPERATIONS_COLLECTION
  );
}

async function writeContinuousOperationsRecords(records) {
  return writeExecutiveMemoryCollection(
    CONTINUOUS_OPERATIONS_COLLECTION,
    records
  );
}

async function getContinuousOperationsJobs() {
  const records = await readContinuousOperationsRecords();

  return records.filter(
    record => record?.type === "continuous-operations-job"
  );
}

async function getContinuousOperationsRuns(limit = 50) {
  const records = await readContinuousOperationsRecords();

  return records
    .filter(
      record =>
        record?.type === "continuous-operations-run"
    )
    .sort((left, right) =>
      String(right.completedAt || right.startedAt || "").localeCompare(
        String(left.completedAt || left.startedAt || "")
      )
    )
    .slice(0, Math.max(1, Math.min(Number(limit) || 50, 500)));
}

async function upsertContinuousOperationsJob(input) {
  return withExecutiveMemoryWriteLock(
    CONTINUOUS_OPERATIONS_COLLECTION,
    async () => {
      const records = await readContinuousOperationsRecords();
      const index = records.findIndex(
        record =>
          record?.type === "continuous-operations-job" &&
          record.id === input.id
      );
      const existing = index >= 0 ? records[index] : null;
      const normalized = normalizeContinuousOperationsJob(
        input,
        existing
      );

      if (index >= 0) {
        records[index] = normalized;
      } else {
        records.push(normalized);
      }

      await writeContinuousOperationsRecords(records);
      return normalized;
    }
  );
}

async function ensureContinuousOperationsStandingMissions() {
  const now = continuousOperationsNow();

  const definitions = [
    {
      id: "standing-funding-office-pipeline",
      office: "Funding Office",
      mission:
        "Continuously maintain the funding investigation pipeline, preserve operational records, identify missing discovery work, and prepare the next authorized funding investigation cycle.",
      handler: "funding-office-pipeline-maintenance",
      intervalMs: CONTINUOUS_OPERATIONS_DEFAULT_INTERVAL_MS,
      nextRunAt: now,
      priority: 100,
      requiresHumanApproval: false,
      autonomousAuthority:
        "research-record-organize-recommend",
      metadata: {
        standingMission: true,
        organizationNeutral: true,
        nextCapability:
          "independent-public-source-discovery"
      }
    }
  ];

  const jobs = [];

  for (const definition of definitions) {
    jobs.push(
      await upsertContinuousOperationsJob(definition)
    );
  }

  return jobs;
}

function registerContinuousOperationsHandler(
  handlerId,
  handler
) {
  const normalizedId = normalizeIdentifier(handlerId);

  if (!normalizedId || typeof handler !== "function") {
    throw new TypeError(
      "Continuous Operations handlers require a valid ID and function."
    );
  }

  continuousOperationsHandlers.set(normalizedId, handler);

  return {
    handlerId: normalizedId,
    registered: true
  };
}

async function fundingOfficePipelineMaintenanceHandler(context) {
  const records = await readExecutiveMemoryCollection(
    "discovered-sources"
  );
  const recommendations = await readExecutiveMemoryCollection(
    "grant-recommendations"
  );
  const history = await readExecutiveMemoryCollection(
    "investigation-history"
  );

  const fundingSources = records.filter(
    record =>
      record?.status !== "rejected" &&
      (
        record?.category === "funding" ||
        record?.office === "Funding Office" ||
        record?.sourceType === "funding-source"
      )
  );

  const activeRecommendations = recommendations.filter(
    record =>
      record?.status !== "rejected" &&
      record?.status !== "archived"
  );

  const latestFundingInvestigation = history
    .filter(
      record =>
        record?.type === "funding-investigation" ||
        record?.office === "Funding Office"
    )
    .sort((left, right) =>
      String(right.completedAt || right.updatedAt || "").localeCompare(
        String(left.completedAt || left.updatedAt || "")
      )
    )[0] || null;

  const now = continuousOperationsNow();
  const needsDiscovery =
    fundingSources.length === 0 ||
    !latestFundingInvestigation;

  const operationalRecord = {
    id: `funding-office-readiness-${Date.now()}`,
    schema:
      "meos.continuous-operations.funding-readiness.v1",
    type: "funding-office-readiness",
    office: "Funding Office",
    missionId: context.job.id,
    runId: context.runId,
    assessedAt: now,
    sourceCount: fundingSources.length,
    activeRecommendationCount:
      activeRecommendations.length,
    latestFundingInvestigationAt:
      latestFundingInvestigation?.completedAt ||
      latestFundingInvestigation?.updatedAt ||
      null,
    needsIndependentDiscovery: needsDiscovery,
    nextAuthorizedAction: needsDiscovery
      ? "Run independent public-source discovery."
      : "Refresh known funding sources and requalify opportunities.",
    status: needsDiscovery
      ? "discovery-required"
      : "pipeline-maintained",
    authorityBoundary:
      "No external application, message, commitment, or expenditure was made."
  };

  await withExecutiveMemoryWriteLock(
    "investigation-history",
    async () => {
      const investigationRecords =
        await readExecutiveMemoryCollection(
          "investigation-history"
        );

      investigationRecords.push(
        normalizeExecutiveMemoryRecord(
          operationalRecord
        )
      );

      await writeExecutiveMemoryCollection(
        "investigation-history",
        investigationRecords
      );
    }
  );

  return {
    success: true,
    summary:
      needsDiscovery
        ? "Funding pipeline assessed; independent public-source discovery is due."
        : "Funding pipeline assessed and existing intelligence remains available.",
    metrics: {
      knownFundingSources: fundingSources.length,
      activeRecommendations:
        activeRecommendations.length,
      previousFundingInvestigation:
        Boolean(latestFundingInvestigation)
    },
    nextAction:
      operationalRecord.nextAuthorizedAction,
    recordId: operationalRecord.id
  };
}

registerContinuousOperationsHandler(
  "funding-office-pipeline-maintenance",
  fundingOfficePipelineMaintenanceHandler
);

async function recoverExpiredContinuousOperationsLeases() {
  const nowMs = Date.now();

  return withExecutiveMemoryWriteLock(
    CONTINUOUS_OPERATIONS_COLLECTION,
    async () => {
      const records = await readContinuousOperationsRecords();
      let recovered = 0;

      const updated = records.map(record => {
        if (
          record?.type !== "continuous-operations-job" ||
          !record.lease?.expiresAt
        ) {
          return record;
        }

        const expiresAt = Date.parse(record.lease.expiresAt);

        if (
          Number.isFinite(expiresAt) &&
          expiresAt <= nowMs
        ) {
          recovered += 1;

          return {
            ...record,
            status: "scheduled",
            lease: null,
            updatedAt: continuousOperationsNow(),
            lastError: {
              code: "CONTINUOUS_OPERATIONS_LEASE_RECOVERED",
              message:
                "An expired execution lease was recovered after restart or interruption."
            }
          };
        }

        return record;
      });

      if (recovered > 0) {
        await writeContinuousOperationsRecords(updated);
        continuousOperationsState.recoveredLeases += recovered;
      }

      return recovered;
    }
  );
}

async function claimContinuousOperationsJob(jobId) {
  return withExecutiveMemoryWriteLock(
    CONTINUOUS_OPERATIONS_COLLECTION,
    async () => {
      const records = await readContinuousOperationsRecords();
      const index = records.findIndex(
        record =>
          record?.type === "continuous-operations-job" &&
          record.id === jobId
      );

      if (index < 0) {
        return null;
      }

      const current = records[index];
      const now = Date.now();
      const nextRun = Date.parse(current.nextRunAt || 0);
      const leaseExpires = Date.parse(
        current.lease?.expiresAt || 0
      );

      if (
        current.enabled === false ||
        (Number.isFinite(nextRun) && nextRun > now) ||
        (current.lease &&
          Number.isFinite(leaseExpires) &&
          leaseExpires > now)
      ) {
        return null;
      }

      const leaseId = createRequestId("operations-lease");
      const claimedAt = continuousOperationsNow();

      const claimed = {
        ...current,
        status: "running",
        lease: {
          id: leaseId,
          claimedAt,
          expiresAt: new Date(
            now + CONTINUOUS_OPERATIONS_LEASE_MS
          ).toISOString(),
          processId: process.pid
        },
        updatedAt: claimedAt
      };

      records[index] = claimed;
      await writeContinuousOperationsRecords(records);

      return claimed;
    }
  );
}

async function completeContinuousOperationsJob(
  job,
  run,
  execution
) {
  return withExecutiveMemoryWriteLock(
    CONTINUOUS_OPERATIONS_COLLECTION,
    async () => {
      const records = await readContinuousOperationsRecords();
      const jobIndex = records.findIndex(
        record =>
          record?.type === "continuous-operations-job" &&
          record.id === job.id
      );

      if (jobIndex < 0) {
        throw new Error(
          `Continuous Operations job ${job.id} disappeared during execution.`
        );
      }

      const current = records[jobIndex];
      const completedAt = run.completedAt;
      const successful = execution.success !== false;
      const consecutiveFailures = successful
        ? 0
        : Number(current.consecutiveFailures || 0) + 1;

      const updatedJob = {
        ...current,
        status: successful ? "scheduled" : "retry-scheduled",
        lease: null,
        runCount: Number(current.runCount || 0) + 1,
        successCount:
          Number(current.successCount || 0) +
          (successful ? 1 : 0),
        failureCount:
          Number(current.failureCount || 0) +
          (successful ? 0 : 1),
        consecutiveFailures,
        lastRunAt: completedAt,
        lastSuccessAt: successful
          ? completedAt
          : current.lastSuccessAt || null,
        lastFailureAt: successful
          ? current.lastFailureAt || null
          : completedAt,
        lastResult: successful ? execution : null,
        lastError: successful
          ? null
          : execution.error || {
              code: "CONTINUOUS_OPERATIONS_HANDLER_FAILED",
              message:
                "The office handler reported failure."
            },
        nextRunAt: successful
          ? calculateContinuousOperationsNextRun(
              current,
              completedAt
            )
          : calculateContinuousOperationsRetry(
              {
                ...current,
                consecutiveFailures
              },
              completedAt
            ),
        updatedAt: completedAt
      };

      records[jobIndex] = updatedJob;
      records.push(
        normalizeExecutiveMemoryRecord({
          ...run,
          success: successful,
          result: successful ? execution : null,
          error: successful
            ? null
            : execution.error || execution
        })
      );

      const runRecords = records
        .filter(
          record =>
            record?.type === "continuous-operations-run"
        )
        .sort((left, right) =>
          String(right.completedAt || "").localeCompare(
            String(left.completedAt || "")
          )
        );

      const allowedRunIds = new Set(
        runRecords
          .slice(0, CONTINUOUS_OPERATIONS_MAX_RUN_HISTORY)
          .map(record => record.id)
      );

      const pruned = records.filter(
        record =>
          record?.type !== "continuous-operations-run" ||
          allowedRunIds.has(record.id)
      );

      await writeContinuousOperationsRecords(pruned);
      return updatedJob;
    }
  );
}

async function executeContinuousOperationsJob(job) {
  const handler = continuousOperationsHandlers.get(
    job.handler
  );
  const runId = createRequestId("operations-run");
  const startedAt = continuousOperationsNow();
  const startedMs = Date.now();

  continuousOperationsState.activeJobIds.add(job.id);

  let execution;

  try {
    if (!handler) {
      execution = {
        success: false,
        error: {
          code: "CONTINUOUS_OPERATIONS_HANDLER_NOT_REGISTERED",
          message:
            `No handler is registered for ${job.handler}.`
        }
      };
    } else {
      execution = await handler({
        job,
        runId,
        startedAt,
        executiveMemory: {
          read: readExecutiveMemoryCollection,
          write: writeExecutiveMemoryCollection,
          withWriteLock: withExecutiveMemoryWriteLock
        }
      });

      if (!execution || typeof execution !== "object") {
        execution = {
          success: true,
          result: execution ?? null
        };
      }
    }
  } catch (error) {
    execution = {
      success: false,
      error: {
        code:
          error?.code ||
          "CONTINUOUS_OPERATIONS_HANDLER_EXCEPTION",
        message: error?.message || String(error)
      }
    };
  }

  const completedAt = continuousOperationsNow();
  const run = {
    id: runId,
    schema: "meos.continuous-operations.run.v1",
    type: "continuous-operations-run",
    jobId: job.id,
    office: job.office,
    mission: job.mission,
    handler: job.handler,
    leaseId: job.lease?.id || null,
    startedAt,
    completedAt,
    durationMs: Date.now() - startedMs,
    autonomousAuthority: job.autonomousAuthority,
    requiresHumanApproval: job.requiresHumanApproval
  };

  const updatedJob =
    await completeContinuousOperationsJob(
      job,
      run,
      execution
    );

  if (execution.success === false) {
    continuousOperationsState.failedRuns += 1;
  } else {
    continuousOperationsState.completedRuns += 1;
  }

  continuousOperationsState.activeJobIds.delete(job.id);

  console.log(
    `[MEOS Continuous Operations] ${job.office} job ${job.id} ` +
      `${execution.success === false ? "failed" : "completed"}. ` +
      `nextRunAt=${updatedJob.nextRunAt}.`
  );

  return {
    job: updatedJob,
    run,
    execution
  };
}

async function continuousOperationsTick() {
  if (
    !CONTINUOUS_OPERATIONS_ENABLED ||
    continuousOperationsState.tickInProgress
  ) {
    return;
  }

  continuousOperationsState.tickInProgress = true;
  continuousOperationsState.lastTickAt =
    continuousOperationsNow();

  try {
    await recoverExpiredContinuousOperationsLeases();
    const jobs = await getContinuousOperationsJobs();
    const now = Date.now();

    const dueJobs = jobs
      .filter(job => {
        const nextRun = Date.parse(job.nextRunAt || 0);

        return (
          job.enabled !== false &&
          (!Number.isFinite(nextRun) || nextRun <= now) &&
          !continuousOperationsState.activeJobIds.has(job.id)
        );
      })
      .sort(
        (left, right) =>
          Number(right.priority || 0) -
            Number(left.priority || 0) ||
          String(left.nextRunAt || "").localeCompare(
            String(right.nextRunAt || "")
          )
      );

    for (const job of dueJobs) {
      const claimed = await claimContinuousOperationsJob(
        job.id
      );

      if (claimed) {
        await executeContinuousOperationsJob(claimed);
      }
    }

    continuousOperationsState.status = "online";
    continuousOperationsState.lastError = null;
  } catch (error) {
    continuousOperationsState.status = "degraded";
    continuousOperationsState.lastError =
      error?.message || String(error);

    console.error(
      "[MEOS Continuous Operations] Tick failed:",
      error
    );
  } finally {
    continuousOperationsState.tickInProgress = false;
    continuousOperationsState.nextTickAt = new Date(
      Date.now() + CONTINUOUS_OPERATIONS_TICK_MS
    ).toISOString();
  }
}

async function startContinuousOperationsRuntime() {
  if (!CONTINUOUS_OPERATIONS_ENABLED) {
    continuousOperationsState.status = "disabled";
    return {
      enabled: false,
      status: "disabled"
    };
  }

  if (continuousOperationsState.timer) {
    return {
      enabled: true,
      status: continuousOperationsState.status,
      alreadyStarted: true
    };
  }

  continuousOperationsState.startedAt =
    continuousOperationsNow();

  await ensureContinuousOperationsStandingMissions();
  await recoverExpiredContinuousOperationsLeases();
  await continuousOperationsTick();

  continuousOperationsState.timer = setInterval(
    () => {
      void continuousOperationsTick();
    },
    CONTINUOUS_OPERATIONS_TICK_MS
  );

  continuousOperationsState.timer.unref?.();

  return {
    enabled: true,
    status: continuousOperationsState.status,
    version: CONTINUOUS_OPERATIONS_VERSION,
    tickMs: CONTINUOUS_OPERATIONS_TICK_MS
  };
}

async function getContinuousOperationsStatus() {
  const jobs = await getContinuousOperationsJobs();
  const runs = await getContinuousOperationsRuns(10);

  return {
    schema: "meos.continuous-operations.status.v1",
    version: CONTINUOUS_OPERATIONS_VERSION,
    enabled: CONTINUOUS_OPERATIONS_ENABLED,
    status: continuousOperationsState.status,
    startedAt: continuousOperationsState.startedAt,
    lastTickAt: continuousOperationsState.lastTickAt,
    nextTickAt: continuousOperationsState.nextTickAt,
    tickMs: CONTINUOUS_OPERATIONS_TICK_MS,
    leaseMs: CONTINUOUS_OPERATIONS_LEASE_MS,
    activeJobIds: [
      ...continuousOperationsState.activeJobIds
    ],
    completedRuns:
      continuousOperationsState.completedRuns,
    failedRuns: continuousOperationsState.failedRuns,
    recoveredLeases:
      continuousOperationsState.recoveredLeases,
    lastError: continuousOperationsState.lastError,
    handlerIds: [
      ...continuousOperationsHandlers.keys()
    ],
    jobs,
    recentRuns: runs
  };
}

function isVoiceEngineV2Request(request) {
  return (
    request.query?.voiceEngine === VOICE_ENGINE_VERSION ||
    request.get("X-MEOS-Voice-Engine") === VOICE_ENGINE_VERSION
  );
}

function pruneTtsCache() {
  const expirationTime = Date.now() - TTS_CACHE_TTL_MS;

  for (const [responseId, cachedEntry] of completedTtsCache.entries()) {
    if (cachedEntry.createdAt < expirationTime) {
      completedTtsCache.delete(responseId);
    }
  }

  while (completedTtsCache.size > TTS_CACHE_MAX_ITEMS) {
    const oldestKey = completedTtsCache.keys().next().value;

    if (!oldestKey) {
      break;
    }

    completedTtsCache.delete(oldestKey);
  }
}

function sendAudioResponse(response, audioBuffer, metadata = {}) {
  response
    .status(200)
    .type("audio/mpeg")
    .set({
      "Cache-Control": "no-store",
      "Content-Length": String(audioBuffer.length),
      "X-MEOS-TTS-Status": metadata.status || "generated",
      "X-MEOS-Voice-Engine": VOICE_ENGINE_VERSION
    })
    .send(audioBuffer);
}

async function generateElevenLabsAudio(text) {
  const totalStartedAt = Date.now();

  const elevenLabsResponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
      ELEVENLABS_VOICE_ID
    )}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg"
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL_ID
      })
    }
  );

  const headersReceivedAt = Date.now();

  console.log(
    `[MEOS TTS] ElevenLabs headers received. ` +
      `status=${elevenLabsResponse.status}, ` +
      `timeToHeadersMs=${headersReceivedAt - totalStartedAt}, ` +
      `characters=${text.length}.`
  );

  if (!elevenLabsResponse.ok) {
    const errorBody = await elevenLabsResponse.text();

    const providerError = new Error(
      `ElevenLabs returned HTTP ${elevenLabsResponse.status}.`
    );

    providerError.status = elevenLabsResponse.status;
    providerError.providerBody = errorBody;

    throw providerError;
  }

  const audioBuffer = Buffer.from(
    await elevenLabsResponse.arrayBuffer()
  );

  const completedAt = Date.now();

  console.log(
    `[MEOS TTS] ElevenLabs audio downloaded. ` +
      `downloadMs=${completedAt - headersReceivedAt}, ` +
      `totalMs=${completedAt - totalStartedAt}, ` +
      `bytes=${audioBuffer.length}.`
  );

  return audioBuffer;
}

/**
 * Create a secure OpenAI Realtime WebRTC session.
 *
 * Legacy installation behavior:
 *   POST /session
 *   - Automatic model responses remain enabled.
 *
 * Voice Engine v2 behavior:
 *   POST /session?voiceEngine=2.0.0
 *   - VAD remains enabled.
 *   - Automatic response creation is disabled.
 *   - The frontend must authorize exactly one response.create per turn.
 */
app.post("/session", async (request, response) => {
  const requestId = createRequestId("session");
  /**
   * Preserve the SDP body exactly as the browser generated it.
   * SDP is line-oriented and may require its terminating CRLF sequence.
   * Trimming the body can remove that terminator and cause OpenAI to
   * reject an otherwise valid offer with "failed to unmarshal SDP: EOF".
   */
  const sdpOffer =
    typeof request.body === "string" ? request.body : "";

  if (!sdpOffer.trim()) {
    response.status(400).send("Missing WebRTC SDP offer.");
    return;
  }

  if (sdpOffer.length > MAX_SDP_LENGTH) {
    response.status(413).send("WebRTC SDP offer is too large.");
    return;
  }

  const voiceEngineV2 = isVoiceEngineV2Request(request);

  const sessionConfiguration = JSON.stringify({
    type: "realtime",
    model: OPENAI_REALTIME_MODEL,
    instructions: maddyInstructions,
    audio: {
      input: {
        turn_detection: {
          type: "server_vad",

          /**
           * During installation, the legacy client continues working.
           * The new v2 client explicitly selects manual response control.
           */
          create_response: !voiceEngineV2,
          interrupt_response: !voiceEngineV2
        }
      },

      /**
       * Retained for backward compatibility with the existing frontend.
       * Voice Engine v2 requests text-only output in response.create and
       * sends that text to ElevenLabs.
       */
      output: {
        voice: "marin"
      }
    }
  });

  const formData = new FormData();

  formData.set("sdp", sdpOffer);
  formData.set("session", sessionConfiguration);

  console.log(
    `[MEOS][${requestId}] Creating OpenAI Realtime session. ` +
      `voiceEngine=${voiceEngineV2 ? VOICE_ENGINE_VERSION : "legacy"}, ` +
      `automaticResponses=${voiceEngineV2 ? "disabled" : "enabled"}.`
  );

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
        `[MEOS][${requestId}] OpenAI session error ` +
          `${openAIResponse.status}:`,
        responseBody
      );

      response.status(openAIResponse.status).send(responseBody);
      return;
    }

    console.log(
      `[MEOS][${requestId}] OpenAI Realtime session created successfully.`
    );

    response
      .status(200)
      .type("application/sdp")
      .set({
        "Cache-Control": "no-store",
        "X-MEOS-Voice-Engine": voiceEngineV2
          ? VOICE_ENGINE_VERSION
          : "legacy"
      })
      .send(responseBody);
  } catch (error) {
    console.error(
      `[MEOS][${requestId}] Failed to create realtime session:`,
      error
    );

    response
      .status(500)
      .send("MEOS could not create the realtime session.");
  }
});

/**
 * Generate Maddy's ElevenLabs voice.
 *
 * Voice Engine v2 sends:
 * {
 *   text,
 *   responseId,
 *   turnId,
 *   authorized: true
 * }
 *
 * A repeated responseId reuses the existing request or cached audio instead
 * of initiating another ElevenLabs provider request.
 *
 * The endpoint temporarily remains compatible with the legacy frontend,
 * which may send only { text }.
 */
app.post(
  "/tts",
  express.json({
    limit: "32kb",
    strict: true
  }),
  async (request, response) => {
    const requestId = createRequestId("tts");

    const text =
      typeof request.body?.text === "string"
        ? request.body.text.trim()
        : "";

    const responseId = normalizeIdentifier(
      request.body?.responseId ||
        request.get("X-MEOS-Response-ID") ||
        ""
    );

    const turnId = normalizeIdentifier(
      request.body?.turnId ||
        request.get("X-MEOS-Turn-ID") ||
        ""
    );

    const declaresV2 =
      request.body?.voiceEngineVersion === VOICE_ENGINE_VERSION ||
      request.get("X-MEOS-Voice-Engine") === VOICE_ENGINE_VERSION;

    const authorized = request.body?.authorized === true;

    if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
      console.error(
        `[MEOS][${requestId}] ElevenLabs configuration is missing.`
      );

      response.status(500).json({
        error: "ElevenLabs voice configuration is missing."
      });
      return;
    }

    if (!text) {
      response.status(400).json({
        error: "Speech text is required."
      });
      return;
    }

    if (text.length > MAX_TTS_TEXT_LENGTH) {
      response.status(400).json({
        error: "Speech text is too long."
      });
      return;
    }

    /**
     * Once the v2 client identifies itself, it must provide proof that this
     * speech originated from an authorized OpenAI response.
     */
    if (declaresV2 && (!authorized || !responseId)) {
      console.warn(
        `[MEOS][${requestId}] Unauthorized Voice Engine v2 TTS request blocked.`
      );

      response.status(403).json({
        error: "Authorized response identity is required."
      });
      return;
    }

    pruneTtsCache();

    if (responseId) {
      const cachedEntry = completedTtsCache.get(responseId);

      if (cachedEntry) {
        console.warn(
          `[MEOS][${requestId}] Duplicate TTS request reused cached audio. ` +
            `responseId=${responseId}, turnId=${turnId || "unknown"}.`
        );

        sendAudioResponse(response, cachedEntry.audioBuffer, {
          status: "deduplicated-cache"
        });
        return;
      }

      const existingRequest = inFlightTtsRequests.get(responseId);

      if (existingRequest) {
        console.warn(
          `[MEOS][${requestId}] Duplicate TTS request joined active request. ` +
            `responseId=${responseId}, turnId=${turnId || "unknown"}.`
        );

        try {
          const audioBuffer = await existingRequest;

          sendAudioResponse(response, audioBuffer, {
            status: "deduplicated-inflight"
          });
        } catch (error) {
          console.error(
            `[MEOS][${requestId}] Shared TTS request failed:`,
            error
          );

          response.status(error.status || 500).json({
            error: "Maddy's voice could not be generated."
          });
        }

        return;
      }
    }

    console.log(
      `[MEOS][${requestId}] ElevenLabs request authorized. ` +
        `responseId=${responseId || "legacy-unidentified"}, ` +
        `turnId=${turnId || "unknown"}, characters=${text.length}.`
    );

    const generationPromise = generateElevenLabsAudio(text);

    if (responseId) {
      inFlightTtsRequests.set(responseId, generationPromise);
    }

    try {
      const audioBuffer = await generationPromise;

      if (responseId) {
        completedTtsCache.set(responseId, {
          audioBuffer,
          createdAt: Date.now()
        });
      }

      console.log(
        `[MEOS][${requestId}] ElevenLabs audio generated successfully. ` +
          `responseId=${responseId || "legacy-unidentified"}, ` +
          `bytes=${audioBuffer.length}.`
      );

      sendAudioResponse(response, audioBuffer, {
        status: "generated"
      });
    } catch (error) {
      console.error(
        `[MEOS][${requestId}] ElevenLabs TTS generation failed:`,
        error.providerBody || error
      );

      response.status(error.status || 500).json({
        error:
          error.status === 401
            ? "ElevenLabs authentication failed."
            : "Maddy's voice could not be generated."
      });
    } finally {
      if (responseId) {
        inFlightTtsRequests.delete(responseId);
      }
    }
  }
);





/**
 * Continuous Operations Runtime API
 *
 * Read-only status and controlled job management endpoints. These routes do
 * not authorize external messages, applications, commitments, or spending.
 */
app.get(
  "/api/continuous-operations",
  async (request, response) => {
    try {
      response.status(200).json(
        await getContinuousOperationsStatus()
      );
    } catch (error) {
      response.status(500).json({
        error:
          error?.message ||
          "Continuous Operations status could not be read.",
        code:
          error?.code ||
          "CONTINUOUS_OPERATIONS_STATUS_FAILED"
      });
    }
  }
);

app.post(
  "/api/continuous-operations/run/:jobId",
  express.json({
    limit: "16kb",
    strict: true
  }),
  async (request, response) => {
    try {
      const jobId = normalizeIdentifier(
        request.params.jobId
      );

      if (!jobId) {
        response.status(400).json({
          error:
            "A valid Continuous Operations job ID is required.",
          code:
            "CONTINUOUS_OPERATIONS_JOB_ID_INVALID"
        });
        return;
      }

      const jobs = await getContinuousOperationsJobs();
      const existing = jobs.find(job => job.id === jobId);

      if (!existing) {
        response.status(404).json({
          error:
            "Continuous Operations job was not found.",
          code:
            "CONTINUOUS_OPERATIONS_JOB_NOT_FOUND"
        });
        return;
      }

      await upsertContinuousOperationsJob({
        ...existing,
        nextRunAt: continuousOperationsNow(),
        status: "scheduled",
        lease: null,
        metadata: {
          ...existing.metadata,
          manuallyQueuedAt:
            continuousOperationsNow()
        }
      });

      await continuousOperationsTick();

      const updatedJobs =
        await getContinuousOperationsJobs();

      response.status(200).json({
        schema:
          "meos.continuous-operations.manual-run.v1",
        queued: true,
        job:
          updatedJobs.find(job => job.id === jobId) ||
          null
      });
    } catch (error) {
      response.status(error.status || 500).json({
        error:
          error?.message ||
          "Continuous Operations job could not be queued.",
        code:
          error?.code ||
          "CONTINUOUS_OPERATIONS_QUEUE_FAILED"
      });
    }
  }
);

app.put(
  "/api/continuous-operations/jobs/:jobId",
  express.json({
    limit: "64kb",
    strict: true
  }),
  async (request, response) => {
    try {
      const jobId = normalizeIdentifier(
        request.params.jobId
      );

      if (!jobId) {
        response.status(400).json({
          error:
            "A valid Continuous Operations job ID is required.",
          code:
            "CONTINUOUS_OPERATIONS_JOB_ID_INVALID"
        });
        return;
      }

      const jobs = await getContinuousOperationsJobs();
      const existing = jobs.find(job => job.id === jobId);

      if (!existing) {
        response.status(404).json({
          error:
            "Continuous Operations job was not found.",
          code:
            "CONTINUOUS_OPERATIONS_JOB_NOT_FOUND"
        });
        return;
      }

      const allowed = {
        ...existing,
        enabled:
          request.body?.enabled === undefined
            ? existing.enabled
            : request.body.enabled === true,
        intervalMs:
          request.body?.intervalMs ??
          existing.intervalMs,
        nextRunAt:
          request.body?.nextRunAt ||
          existing.nextRunAt,
        priority:
          request.body?.priority ??
          existing.priority,
        metadata: {
          ...existing.metadata,
          ...(request.body?.metadata || {})
        }
      };

      const saved =
        await upsertContinuousOperationsJob(
          allowed
        );

      response.status(200).json({
        schema:
          "meos.continuous-operations.job.v1",
        job: saved
      });
    } catch (error) {
      response.status(error.status || 500).json({
        error:
          error?.message ||
          "Continuous Operations job could not be updated.",
        code:
          error?.code ||
          "CONTINUOUS_OPERATIONS_JOB_UPDATE_FAILED"
      });
    }
  }
);


/**
 * Durable Executive Memory API
 *
 * These routes provide the server-side persistence contract that Website
 * Intelligence, Executive Opportunity Office, Grant Office, and Executive
 * Investigation will use in the next commissions.
 */
app.get("/api/executive-memory", async (request, response) => {
  const storage = await executiveMemoryStorageStatus();

  response.status(storage.status === "ready" ? 200 : 503).json({
    schema: "meos.executive-memory.status.v1",
    version: "1.0.0",
    storage,
    collections: [...EXECUTIVE_MEMORY_COLLECTIONS],
    limits: {
      maximumRecordsPerCollection: EXECUTIVE_MEMORY_MAX_RECORDS,
      maximumRecordBytes: EXECUTIVE_MEMORY_MAX_RECORD_BYTES
    }
  });
});

app.get(
  "/api/executive-memory/:collection",
  async (request, response) => {
    try {
      const collection = validateExecutiveMemoryCollection(
        request.params.collection
      );

      const records = await readExecutiveMemoryCollection(collection);
      const requestedLimit = Number(request.query?.limit || 0);
      const limit =
        Number.isInteger(requestedLimit) && requestedLimit > 0
          ? Math.min(requestedLimit, 1000)
          : records.length;

      const sorted = records
        .slice()
        .sort((a, b) =>
          String(b.updatedAt || "").localeCompare(
            String(a.updatedAt || "")
          )
        )
        .slice(0, limit);

      response.status(200).json({
        schema: "meos.executive-memory.collection.v1",
        collection,
        count: sorted.length,
        totalCount: records.length,
        records: sorted
      });
    } catch (error) {
      response.status(error.status || 500).json({
        error: error.message || "Executive Memory could not be read.",
        code: error.code || "EXECUTIVE_MEMORY_READ_FAILED",
        details: error.details || null
      });
    }
  }
);

app.get(
  "/api/executive-memory/:collection/:recordId",
  async (request, response) => {
    try {
      const collection = validateExecutiveMemoryCollection(
        request.params.collection
      );
      const recordId = normalizeIdentifier(
        request.params.recordId
      );

      if (!recordId) {
        response.status(400).json({
          error: "A valid Executive Memory record ID is required.",
          code: "EXECUTIVE_MEMORY_RECORD_ID_INVALID"
        });
        return;
      }

      const records = await readExecutiveMemoryCollection(collection);
      const record = records.find(item => item.id === recordId);

      if (!record) {
        response.status(404).json({
          error: "Executive Memory record was not found.",
          code: "EXECUTIVE_MEMORY_RECORD_NOT_FOUND"
        });
        return;
      }

      response.status(200).json({
        schema: "meos.executive-memory.record.v1",
        collection,
        record
      });
    } catch (error) {
      response.status(error.status || 500).json({
        error: error.message || "Executive Memory could not be read.",
        code: error.code || "EXECUTIVE_MEMORY_READ_FAILED",
        details: error.details || null
      });
    }
  }
);

app.put(
  "/api/executive-memory/:collection/:recordId",
  express.json({
    limit: "600kb",
    strict: true
  }),
  async (request, response) => {
    try {
      const collection = validateExecutiveMemoryCollection(
        request.params.collection
      );
      const recordId = normalizeIdentifier(
        request.params.recordId
      );

      if (!recordId) {
        response.status(400).json({
          error: "A valid Executive Memory record ID is required.",
          code: "EXECUTIVE_MEMORY_RECORD_ID_INVALID"
        });
        return;
      }

      const savedRecord = await withExecutiveMemoryWriteLock(
        collection,
        async () => {
          const records = await readExecutiveMemoryCollection(
            collection
          );
          const existingIndex = records.findIndex(
            item => item.id === recordId
          );
          const existingRecord =
            existingIndex >= 0
              ? records[existingIndex]
              : null;

          const normalized = normalizeExecutiveMemoryRecord(
            {
              ...request.body,
              id: recordId
            },
            existingRecord
          );

          if (existingIndex >= 0) {
            records[existingIndex] = normalized;
          } else {
            records.push(normalized);
          }

          await writeExecutiveMemoryCollection(
            collection,
            records
          );

          return normalized;
        }
      );

      response.status(200).json({
        schema: "meos.executive-memory.record.v1",
        collection,
        record: savedRecord
      });
    } catch (error) {
      response.status(error.status || 500).json({
        error: error.message || "Executive Memory could not be saved.",
        code: error.code || "EXECUTIVE_MEMORY_WRITE_FAILED",
        details: error.details || null
      });
    }
  }
);

app.post(
  "/api/executive-memory/:collection",
  express.json({
    limit: "600kb",
    strict: true
  }),
  async (request, response) => {
    try {
      const collection = validateExecutiveMemoryCollection(
        request.params.collection
      );

      const savedRecord = await withExecutiveMemoryWriteLock(
        collection,
        async () => {
          const records = await readExecutiveMemoryCollection(
            collection
          );
          const normalized = normalizeExecutiveMemoryRecord(
            request.body
          );

          records.push(normalized);

          await writeExecutiveMemoryCollection(
            collection,
            records
          );

          return normalized;
        }
      );

      response.status(201).json({
        schema: "meos.executive-memory.record.v1",
        collection,
        record: savedRecord
      });
    } catch (error) {
      response.status(error.status || 500).json({
        error: error.message || "Executive Memory could not be saved.",
        code: error.code || "EXECUTIVE_MEMORY_WRITE_FAILED",
        details: error.details || null
      });
    }
  }
);

app.delete(
  "/api/executive-memory/:collection/:recordId",
  async (request, response) => {
    try {
      const collection = validateExecutiveMemoryCollection(
        request.params.collection
      );
      const recordId = normalizeIdentifier(
        request.params.recordId
      );

      if (!recordId) {
        response.status(400).json({
          error: "A valid Executive Memory record ID is required.",
          code: "EXECUTIVE_MEMORY_RECORD_ID_INVALID"
        });
        return;
      }

      const deleted = await withExecutiveMemoryWriteLock(
        collection,
        async () => {
          const records = await readExecutiveMemoryCollection(
            collection
          );
          const filtered = records.filter(
            item => item.id !== recordId
          );

          if (filtered.length === records.length) {
            return false;
          }

          await writeExecutiveMemoryCollection(
            collection,
            filtered
          );

          return true;
        }
      );

      if (!deleted) {
        response.status(404).json({
          error: "Executive Memory record was not found.",
          code: "EXECUTIVE_MEMORY_RECORD_NOT_FOUND"
        });
        return;
      }

      response.status(200).json({
        schema: "meos.executive-memory.delete.v1",
        collection,
        recordId,
        deleted: true
      });
    } catch (error) {
      response.status(error.status || 500).json({
        error: error.message || "Executive Memory record could not be deleted.",
        code: error.code || "EXECUTIVE_MEMORY_DELETE_FAILED",
        details: error.details || null
      });
    }
  }
);


/**
 * Fetch one approved organization website page for the frontend Website
 * Intelligence Connector.
 *
 * Security:
 * - Exact origins must be configured in MEOS_WEBSITE_ALLOWED_ORIGINS.
 * - Private, loopback, link-local, multicast, and reserved addresses are blocked.
 * - Redirect destinations are revalidated against the same rules.
 * - Response size, timeout, redirect count, and content type are restricted.
 */
app.get("/api/website-intelligence/fetch", async (request, response) => {
  const requestId = createRequestId("website-fetch");
  const requestedUrl =
    typeof request.query?.url === "string"
      ? request.query.url.trim()
      : "";

  if (!requestedUrl) {
    response.status(400).json({
      error: "Website URL is required.",
      code: "WEBSITE_FETCH_URL_REQUIRED"
    });
    return;
  }

  if (WEBSITE_FETCH_ALLOWED_ORIGINS.size === 0) {
    response.status(503).json({
      error: "Website Intelligence has no approved website origins configured.",
      code: "WEBSITE_FETCH_NOT_CONFIGURED"
    });
    return;
  }

  console.log(
    `[MEOS][${requestId}] Website Intelligence fetch requested. ` +
      `url=${requestedUrl}`
  );

  try {
    const result = await fetchApprovedWebsitePage(requestedUrl);

    response
      .status(200)
      .type(result.contentType)
      .set({
        "Cache-Control": "no-store",
        "X-MEOS-Website-Intelligence": "1.0.0",
        "X-MEOS-Final-URL": result.finalUrl,
        "X-Content-Type-Options": "nosniff",
        "Content-Length": String(result.body.length)
      })
      .send(result.body);

    console.log(
      `[MEOS][${requestId}] Website Intelligence fetch completed. ` +
        `finalUrl=${result.finalUrl}, bytes=${result.body.length}.`
    );
  } catch (error) {
    console.error(
      `[MEOS][${requestId}] Website Intelligence fetch failed:`,
      error
    );

    response.status(error.status || 500).json({
      error: error.message || "The approved website could not be retrieved.",
      code: error.code || "WEBSITE_FETCH_ERROR",
      details: error.details || null
    });
  }
});

app.get("/health", async (request, response) => {
  pruneTtsCache();
  const executiveMemory = await executiveMemoryStorageStatus();
  const continuousOperations =
    await getContinuousOperationsStatus().catch(error => ({
      version: CONTINUOUS_OPERATIONS_VERSION,
      enabled: CONTINUOUS_OPERATIONS_ENABLED,
      status: "unavailable",
      error: error?.message || String(error)
    }));

  response.json({
    application: "MEOS",
    service: "Secure Realtime Session Server",
    version: VERSION,
    voiceEngine: VOICE_ENGINE_VERSION,
    status: "online",
    providers: {
      openai: OPENAI_API_KEY ? "configured" : "missing",
      elevenlabs:
        ELEVENLABS_API_KEY && ELEVENLABS_VOICE_ID
          ? "configured"
          : "missing",
      websiteIntelligence:
        WEBSITE_FETCH_ALLOWED_ORIGINS.size > 0
          ? "configured"
          : "missing-allowlist"
    },
    websiteIntelligence: {
      approvedOrigins: [...WEBSITE_FETCH_ALLOWED_ORIGINS],
      timeoutMs: WEBSITE_FETCH_TIMEOUT_MS,
      maximumBytes: WEBSITE_FETCH_MAX_BYTES,
      maximumRedirects: WEBSITE_FETCH_MAX_REDIRECTS
    },
    executiveMemory: {
      version: "1.0.0",
      ...executiveMemory,
      collections: [...EXECUTIVE_MEMORY_COLLECTIONS],
      maximumRecordsPerCollection: EXECUTIVE_MEMORY_MAX_RECORDS,
      maximumRecordBytes: EXECUTIVE_MEMORY_MAX_RECORD_BYTES
    },
    continuousOperations,
    ttsDeduplication: {
      activeRequests: inFlightTtsRequests.size,
      cachedResponses: completedTtsCache.size
    }
  });
});

app.get("*", (request, response) => {
  response.sendFile(path.join(frontendDirectory, "index.html"));
});

app.use((error, request, response, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({
      error: "Invalid JSON request body."
    });
    return;
  }

  console.error("[MEOS] Unhandled server error:", error);

  response.status(500).json({
    error: "An unexpected MEOS server error occurred."
  });
});

app.listen(PORT, () => {
  console.log(
    `[MEOS] Secure Realtime Session Server v${VERSION} online ` +
      `on port ${PORT}.`
  );

  console.log(
    `[MEOS] Voice Engine v${VOICE_ENGINE_VERSION} server authority ready.`
  );

  executiveMemoryStorageStatus().then(status => {
    console.log(
      `[MEOS] Executive Memory v1.0.0 ${status.status}. ` +
        `directory=${status.memoryDirectory}, ` +
        `persistentDiskExpected=${status.persistentDiskExpected}.`
    );
  });

  startContinuousOperationsRuntime()
    .then(status => {
      console.log(
        `[MEOS] Continuous Operations Runtime ` +
          `v${CONTINUOUS_OPERATIONS_VERSION} ${status.status}. ` +
          `enabled=${status.enabled}, tickMs=${status.tickMs || 0}.`
      );
    })
    .catch(error => {
      continuousOperationsState.status = "degraded";
      continuousOperationsState.lastError =
        error?.message || String(error);

      console.error(
        "[MEOS] Continuous Operations Runtime failed to start:",
        error
      );
    });
});
