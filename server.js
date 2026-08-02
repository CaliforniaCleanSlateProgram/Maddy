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
 * - Operate the autonomous Funding Intelligence Network.
 */

import express from "express";
import path from "path";
import crypto from "crypto";
import dns from "dns/promises";
import net from "net";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const VERSION = "2.3.0";
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
 * MEOS Funding Intelligence Network v1.0
 *
 * The Funding Office continuously secures resource intelligence across:
 * - government grants;
 * - private and community foundations;
 * - corporate giving and corporate foundations;
 * - sponsorships, matching gifts, volunteer grants, and in-kind programs;
 * - partnerships, RFPs, contracts, awards, and innovation challenges.
 *
 * The network uses authoritative structured APIs where available and safely
 * monitors public program pages for newly referenced funding sources.
 */
const FUNDING_INTELLIGENCE_VERSION = "1.0.0";
const FUNDING_SOURCE_COLLECTION = "discovered-sources";
const FUNDING_OPPORTUNITY_COLLECTION = "grant-recommendations";
const FUNDING_HISTORY_COLLECTION = "investigation-history";

const FUNDING_DISCOVERY_MAX_SOURCES_PER_RUN = Number(
  process.env.MEOS_FUNDING_MAX_SOURCES_PER_RUN || 12
);
const FUNDING_DISCOVERY_MAX_OPPORTUNITIES_PER_QUERY = Number(
  process.env.MEOS_FUNDING_MAX_OPPORTUNITIES_PER_QUERY || 25
);
const FUNDING_DISCOVERY_SOURCE_REFRESH_MS = Number(
  process.env.MEOS_FUNDING_SOURCE_REFRESH_MS || 24 * 60 * 60_000
);
const FUNDING_PUBLIC_FETCH_TIMEOUT_MS = Number(
  process.env.MEOS_FUNDING_PUBLIC_FETCH_TIMEOUT_MS || 15_000
);
const FUNDING_PUBLIC_FETCH_MAX_BYTES = Number(
  process.env.MEOS_FUNDING_PUBLIC_FETCH_MAX_BYTES || 1_500_000
);
const FUNDING_PUBLIC_FETCH_MAX_REDIRECTS = Number(
  process.env.MEOS_FUNDING_PUBLIC_FETCH_MAX_REDIRECTS || 5
);

const FUNDING_SEARCH_TERMS = String(
  process.env.MEOS_FUNDING_SEARCH_TERMS ||
    [
      "homelessness",
      "mobile hygiene",
      "substance use recovery",
      "community development",
      "water quality",
      "watershed",
      "workforce development"
    ].join("|")
)
  .split("|")
  .map(value => value.trim())
  .filter(Boolean)
  .slice(0, 20);

const FUNDING_SOURCE_SEEDS = Object.freeze([
  {
    id: "funding-source-grants-gov",
    name: "Grants.gov",
    category: "government",
    authorityType: "federal-government",
    sourceType: "structured-api",
    homepage: "https://www.grants.gov/",
    endpoint: "https://api.grants.gov/v1/api/search2",
    trustScore: 1,
    priority: 100,
    investigationFrequencyMs: 6 * 60 * 60_000,
    capabilities: ["grants", "forecasted-opportunities", "posted-opportunities"]
  },
  {
    id: "funding-source-california-grants",
    name: "California Grants Portal",
    category: "government",
    authorityType: "state-government",
    sourceType: "public-portal",
    homepage: "https://www.grants.ca.gov/",
    trustScore: 1,
    priority: 98,
    investigationFrequencyMs: 12 * 60 * 60_000,
    capabilities: ["grants", "loans", "california-state-opportunities"]
  },
  {
    id: "funding-source-sam-assistance",
    name: "SAM.gov Assistance Listings",
    category: "government",
    authorityType: "federal-government",
    sourceType: "public-portal",
    homepage: "https://sam.gov/assistance-listings",
    trustScore: 1,
    priority: 90,
    investigationFrequencyMs: 24 * 60 * 60_000,
    capabilities: ["assistance-programs", "grants", "loans"]
  },
  {
    id: "funding-source-walmart-org",
    name: "Walmart.org",
    category: "corporate-giving",
    authorityType: "corporation",
    sourceType: "public-program-page",
    homepage: "https://walmart.org/how-we-give/local-community-grants",
    trustScore: 0.95,
    priority: 90,
    investigationFrequencyMs: 24 * 60 * 60_000,
    capabilities: ["corporate-grants", "community-giving"]
  },
  {
    id: "funding-source-home-depot-foundation",
    name: "The Home Depot Foundation",
    category: "corporate-giving",
    authorityType: "corporate-foundation",
    sourceType: "public-program-page",
    homepage: "https://corporate.homedepot.com/page/home-depot-foundation",
    trustScore: 0.95,
    priority: 88,
    investigationFrequencyMs: 24 * 60 * 60_000,
    capabilities: ["corporate-grants", "housing", "community-support"]
  },
  {
    id: "funding-source-lowes-foundation",
    name: "Lowe's Foundation",
    category: "corporate-giving",
    authorityType: "corporate-foundation",
    sourceType: "public-program-page",
    homepage: "https://www.lowes.com/l/about/lowes-foundation",
    trustScore: 0.95,
    priority: 86,
    investigationFrequencyMs: 24 * 60 * 60_000,
    capabilities: ["corporate-grants", "workforce-development", "community-projects"]
  },
  {
    id: "funding-source-bank-of-america-charitable",
    name: "Bank of America Charitable Foundation",
    category: "corporate-giving",
    authorityType: "corporate-foundation",
    sourceType: "public-program-page",
    homepage: "https://about.bankofamerica.com/en/making-an-impact/charitable-foundation-funding",
    trustScore: 0.95,
    priority: 86,
    investigationFrequencyMs: 24 * 60 * 60_000,
    capabilities: ["corporate-grants", "community-development", "economic-mobility"]
  },
  {
    id: "funding-source-wells-fargo-foundation",
    name: "Wells Fargo Foundation",
    category: "corporate-giving",
    authorityType: "corporate-foundation",
    sourceType: "public-program-page",
    homepage: "https://www.wellsfargo.com/about/corporate-responsibility/community-giving/",
    trustScore: 0.95,
    priority: 84,
    investigationFrequencyMs: 24 * 60 * 60_000,
    capabilities: ["corporate-grants", "housing", "financial-health"]
  },
  {
    id: "funding-source-google-org",
    name: "Google.org",
    category: "corporate-giving",
    authorityType: "corporate-foundation",
    sourceType: "public-program-page",
    homepage: "https://www.google.org/",
    trustScore: 0.95,
    priority: 80,
    investigationFrequencyMs: 48 * 60 * 60_000,
    capabilities: ["corporate-grants", "technology", "innovation-challenges"]
  },
  {
    id: "funding-source-microsoft-nonprofits",
    name: "Microsoft for Nonprofits",
    category: "in-kind-giving",
    authorityType: "corporation",
    sourceType: "public-program-page",
    homepage: "https://www.microsoft.com/en-us/nonprofits",
    trustScore: 0.95,
    priority: 78,
    investigationFrequencyMs: 48 * 60 * 60_000,
    capabilities: ["in-kind-technology", "discounts", "nonprofit-resources"]
  },
  {
    id: "funding-source-cisco-foundation",
    name: "Cisco Foundation",
    category: "corporate-giving",
    authorityType: "corporate-foundation",
    sourceType: "public-program-page",
    homepage: "https://www.cisco.com/c/en/us/about/csr/community/nonprofits.html",
    trustScore: 0.95,
    priority: 76,
    investigationFrequencyMs: 48 * 60 * 60_000,
    capabilities: ["corporate-grants", "technology", "community-partnerships"]
  },
  {
    id: "funding-source-candid",
    name: "Candid",
    category: "foundation-intelligence",
    authorityType: "nonprofit",
    sourceType: "public-program-page",
    homepage: "https://candid.org/find-funding",
    trustScore: 0.9,
    priority: 72,
    investigationFrequencyMs: 72 * 60 * 60_000,
    capabilities: ["foundation-research", "funder-intelligence"]
  }
]);

const fundingIntelligenceState = {
  status: "initializing",
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  sourcesInvestigated: 0,
  sourcesDiscovered: 0,
  opportunitiesDiscovered: 0,
  duplicatesRejected: 0
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



function normalizeFundingUrl(value) {
  try {
    const target = new URL(String(value || ""));
    target.hash = "";

    if (!["http:", "https:"].includes(target.protocol)) {
      return "";
    }

    if (
      (target.protocol === "https:" && target.port === "443") ||
      (target.protocol === "http:" && target.port === "80")
    ) {
      target.port = "";
    }

    target.hostname = target.hostname.toLowerCase();

    if (target.pathname !== "/") {
      target.pathname = target.pathname.replace(/\/+$/, "");
    }

    return target.href;
  } catch {
    return "";
  }
}

function fundingSourceIdFromUrl(value) {
  const normalized = normalizeFundingUrl(value);

  if (!normalized) {
    return "";
  }

  return `funding-source-${crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex")
    .slice(0, 24)}`;
}

function fundingOpportunityId(provider, externalId, url = "") {
  const identity = [
    String(provider || "").trim().toLowerCase(),
    String(externalId || "").trim().toLowerCase(),
    normalizeFundingUrl(url)
  ].join("|");

  return `funding-opportunity-${crypto
    .createHash("sha256")
    .update(identity)
    .digest("hex")
    .slice(0, 28)}`;
}

async function validatePublicFundingUrl(value) {
  let target;

  try {
    target = new URL(String(value || ""));
  } catch {
    const error = new Error("A valid public funding URL is required.");
    error.code = "FUNDING_PUBLIC_URL_INVALID";
    throw error;
  }

  target.hash = "";

  if (!["http:", "https:"].includes(target.protocol)) {
    const error = new Error(
      "Only HTTP and HTTPS funding sources are allowed."
    );
    error.code = "FUNDING_PUBLIC_PROTOCOL_BLOCKED";
    throw error;
  }

  let addresses;

  try {
    addresses = await dns.lookup(target.hostname, {
      all: true,
      verbatim: true
    });
  } catch {
    const error = new Error(
      "The public funding hostname could not be resolved."
    );
    error.code = "FUNDING_PUBLIC_DNS_FAILED";
    throw error;
  }

  if (
    addresses.length === 0 ||
    addresses.some(record => isPrivateOrReservedIp(record.address))
  ) {
    const error = new Error(
      "The funding source resolved to a blocked network address."
    );
    error.code = "FUNDING_PUBLIC_PRIVATE_NETWORK_BLOCKED";
    throw error;
  }

  return target;
}

async function fetchPublicFundingResource(
  initialUrl,
  options = {}
) {
  let target = await validatePublicFundingUrl(initialUrl);
  const visited = new Set();
  const method = options.method || "GET";
  const requestBody = options.body || undefined;
  const headers = {
    Accept:
      options.accept ||
      "application/json,text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.4",
    "User-Agent":
      "MEOS-Funding-Intelligence/1.0 (+public-resource-discovery)",
    ...(options.headers || {})
  };

  for (
    let redirectCount = 0;
    redirectCount <= FUNDING_PUBLIC_FETCH_MAX_REDIRECTS;
    redirectCount += 1
  ) {
    if (visited.has(target.href)) {
      const error = new Error(
        "The public funding source returned a redirect loop."
      );
      error.code = "FUNDING_PUBLIC_REDIRECT_LOOP";
      throw error;
    }

    visited.add(target.href);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      FUNDING_PUBLIC_FETCH_TIMEOUT_MS
    );

    let providerResponse;

    try {
      providerResponse = await fetch(target, {
        method,
        redirect: "manual",
        signal: controller.signal,
        headers,
        body: requestBody
      });
    } catch (error) {
      const fetchError = new Error(
        error?.name === "AbortError"
          ? "The public funding request timed out."
          : "The public funding source could not be retrieved."
      );
      fetchError.code =
        error?.name === "AbortError"
          ? "FUNDING_PUBLIC_TIMEOUT"
          : "FUNDING_PUBLIC_FETCH_FAILED";
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
        const error = new Error(
          "The public funding source returned an invalid redirect."
        );
        error.code = "FUNDING_PUBLIC_REDIRECT_INVALID";
        throw error;
      }

      if (redirectCount === FUNDING_PUBLIC_FETCH_MAX_REDIRECTS) {
        const error = new Error(
          "The public funding source exceeded the redirect limit."
        );
        error.code = "FUNDING_PUBLIC_TOO_MANY_REDIRECTS";
        throw error;
      }

      target = await validatePublicFundingUrl(
        new URL(location, target).href
      );
      continue;
    }

    if (!providerResponse.ok) {
      const error = new Error(
        `The public funding source returned HTTP ${providerResponse.status}.`
      );
      error.code = "FUNDING_PUBLIC_UPSTREAM_HTTP_ERROR";
      error.details = {
        upstreamStatus: providerResponse.status,
        url: target.href
      };
      throw error;
    }

    const declaredLength = Number(
      providerResponse.headers.get("content-length") || 0
    );

    if (
      Number.isFinite(declaredLength) &&
      declaredLength > FUNDING_PUBLIC_FETCH_MAX_BYTES
    ) {
      const error = new Error(
        "The public funding response exceeds the size limit."
      );
      error.code = "FUNDING_PUBLIC_RESPONSE_TOO_LARGE";
      throw error;
    }

    const body = await readLimitedFundingResponseBody(providerResponse);

    return {
      requestedUrl: initialUrl,
      finalUrl: target.href,
      status: providerResponse.status,
      contentType:
        providerResponse.headers.get("content-type") ||
        "application/octet-stream",
      body,
      headers: providerResponse.headers
    };
  }

  const error = new Error(
    "The public funding request could not be completed."
  );
  error.code = "FUNDING_PUBLIC_INCOMPLETE";
  throw error;
}

async function readLimitedFundingResponseBody(providerResponse) {
  if (!providerResponse.body) {
    return Buffer.alloc(0);
  }

  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of providerResponse.body) {
    const buffer = Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > FUNDING_PUBLIC_FETCH_MAX_BYTES) {
      const error = new Error(
        "The public funding response exceeded the size limit."
      );
      error.code = "FUNDING_PUBLIC_RESPONSE_TOO_LARGE";
      throw error;
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

function decodeBasicHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(value) {
  return decodeBasicHtmlEntities(
    String(value || "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function extractFundingLinks(html, baseUrl) {
  const links = [];
  const pattern =
    /<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  const relevant =
    /\b(grant|funding|foundation|giving|sponsor|donat|community|nonprofit|rfp|request for proposal|matching gift|volunteer grant|in-kind|challenge|award|partnership|apply|application)\b/i;
  let match;

  while ((match = pattern.exec(String(html || "")))) {
    const rawHref = match[1] || match[2] || match[3] || "";
    const label = stripHtml(match[4] || "");

    if (!rawHref || rawHref.startsWith("#")) {
      continue;
    }

    let resolved;

    try {
      resolved = new URL(rawHref, baseUrl);
    } catch {
      continue;
    }

    if (!["http:", "https:"].includes(resolved.protocol)) {
      continue;
    }

    const combined = `${resolved.href} ${label}`;

    if (!relevant.test(combined)) {
      continue;
    }

    const normalizedUrl = normalizeFundingUrl(resolved.href);

    if (!normalizedUrl) {
      continue;
    }

    links.push({
      url: normalizedUrl,
      label: label.slice(0, 220),
      relationship:
        resolved.origin === new URL(baseUrl).origin
          ? "program-link"
          : "referenced-funding-source"
    });
  }

  const unique = new Map();

  for (const link of links) {
    if (!unique.has(link.url)) {
      unique.set(link.url, link);
    }
  }

  return [...unique.values()].slice(0, 75);
}

function normalizeFundingSource(seed, existing = null) {
  const now = continuousOperationsNow();
  const homepage = normalizeFundingUrl(
    seed.homepage || existing?.homepage || ""
  );
  const endpoint = normalizeFundingUrl(
    seed.endpoint || existing?.endpoint || ""
  );
  const id =
    normalizeIdentifier(seed.id || existing?.id || "") ||
    fundingSourceIdFromUrl(endpoint || homepage);

  if (!id || (!homepage && !endpoint)) {
    throw new Error(
      "Funding intelligence sources require an ID and public URL."
    );
  }

  return normalizeExecutiveMemoryRecord(
    {
      ...existing,
      ...seed,
      id,
      schema: "meos.funding-intelligence.source.v1",
      type: "funding-intelligence-source",
      office: "Funding Office",
      category: seed.category || existing?.category || "funding",
      authorityType:
        seed.authorityType ||
        existing?.authorityType ||
        "unknown",
      sourceType:
        seed.sourceType ||
        existing?.sourceType ||
        "public-program-page",
      homepage,
      endpoint,
      trustScore: Math.max(
        0,
        Math.min(
          1,
          Number(seed.trustScore ?? existing?.trustScore ?? 0.7)
        )
      ),
      priority: Math.max(
        1,
        Math.min(
          100,
          Number(seed.priority ?? existing?.priority ?? 50)
        )
      ),
      status: seed.status || existing?.status || "active",
      investigationFrequencyMs: Math.max(
        60_000,
        Number(
          seed.investigationFrequencyMs ??
            existing?.investigationFrequencyMs ??
            FUNDING_DISCOVERY_SOURCE_REFRESH_MS
        )
      ),
      lastInvestigatedAt:
        seed.lastInvestigatedAt ||
        existing?.lastInvestigatedAt ||
        null,
      nextInvestigationAt:
        seed.nextInvestigationAt ||
        existing?.nextInvestigationAt ||
        now,
      discoveryMethod:
        seed.discoveryMethod ||
        existing?.discoveryMethod ||
        "commissioned-seed",
      discoveredFromSourceId:
        seed.discoveredFromSourceId ||
        existing?.discoveredFromSourceId ||
        null,
      capabilities: Array.from(
        new Set([
          ...(existing?.capabilities || []),
          ...(seed.capabilities || [])
        ])
      ),
      relationshipIds: Array.from(
        new Set([
          ...(existing?.relationshipIds || []),
          ...(seed.relationshipIds || [])
        ])
      ),
      evidence: {
        ...(existing?.evidence || {}),
        ...(seed.evidence || {})
      },
      createdAt: existing?.createdAt || seed.createdAt || now,
      updatedAt: now
    },
    existing
  );
}

async function ensureFundingSourceRegistry() {
  return withExecutiveMemoryWriteLock(
    FUNDING_SOURCE_COLLECTION,
    async () => {
      const records = await readExecutiveMemoryCollection(
        FUNDING_SOURCE_COLLECTION
      );
      const indexById = new Map(
        records.map((record, index) => [record.id, index])
      );
      let added = 0;
      let updated = 0;

      for (const seed of FUNDING_SOURCE_SEEDS) {
        const index = indexById.get(seed.id);
        const existing = index === undefined ? null : records[index];
        const normalized = normalizeFundingSource(seed, existing);

        if (index === undefined) {
          records.push(normalized);
          indexById.set(normalized.id, records.length - 1);
          added += 1;
        } else {
          records[index] = normalized;
          updated += 1;
        }
      }

      await writeExecutiveMemoryCollection(
        FUNDING_SOURCE_COLLECTION,
        records
      );

      return {
        added,
        updated,
        total: records.filter(
          record => record?.type === "funding-intelligence-source"
        ).length
      };
    }
  );
}

async function upsertFundingSources(sources) {
  return withExecutiveMemoryWriteLock(
    FUNDING_SOURCE_COLLECTION,
    async () => {
      const records = await readExecutiveMemoryCollection(
        FUNDING_SOURCE_COLLECTION
      );
      const indexById = new Map(
        records.map((record, index) => [record.id, index])
      );
      let added = 0;
      let updated = 0;

      for (const source of sources) {
        const candidateId =
          normalizeIdentifier(source.id || "") ||
          fundingSourceIdFromUrl(
            source.endpoint || source.homepage
          );

        if (!candidateId) {
          continue;
        }

        const index = indexById.get(candidateId);
        const existing = index === undefined ? null : records[index];
        const normalized = normalizeFundingSource(
          {
            ...source,
            id: candidateId
          },
          existing
        );

        if (index === undefined) {
          records.push(normalized);
          indexById.set(normalized.id, records.length - 1);
          added += 1;
        } else {
          records[index] = normalized;
          updated += 1;
        }
      }

      await writeExecutiveMemoryCollection(
        FUNDING_SOURCE_COLLECTION,
        records
      );

      return {
        added,
        updated,
        total: records.filter(
          record => record?.type === "funding-intelligence-source"
        ).length
      };
    }
  );
}

async function upsertFundingOpportunities(opportunities) {
  return withExecutiveMemoryWriteLock(
    FUNDING_OPPORTUNITY_COLLECTION,
    async () => {
      const records = await readExecutiveMemoryCollection(
        FUNDING_OPPORTUNITY_COLLECTION
      );
      const indexById = new Map(
        records.map((record, index) => [record.id, index])
      );
      let added = 0;
      let updated = 0;
      let duplicates = 0;

      for (const opportunity of opportunities) {
        if (!opportunity?.id) {
          continue;
        }

        const index = indexById.get(opportunity.id);
        const existing = index === undefined ? null : records[index];

        const normalized = normalizeExecutiveMemoryRecord(
          {
            ...existing,
            ...opportunity,
            schema:
              "meos.funding-intelligence.opportunity.v1",
            type: "funding-opportunity",
            office: "Funding Office",
            status:
              opportunity.status ||
              existing?.status ||
              "discovered-unqualified",
            firstDiscoveredAt:
              existing?.firstDiscoveredAt ||
              opportunity.firstDiscoveredAt ||
              continuousOperationsNow(),
            lastSeenAt: continuousOperationsNow()
          },
          existing
        );

        if (index === undefined) {
          records.push(normalized);
          indexById.set(normalized.id, records.length - 1);
          added += 1;
        } else {
          records[index] = normalized;
          updated += 1;
          duplicates += 1;
        }
      }

      await writeExecutiveMemoryCollection(
        FUNDING_OPPORTUNITY_COLLECTION,
        records
      );

      return {
        added,
        updated,
        duplicates,
        total: records.filter(
          record => record?.type === "funding-opportunity"
        ).length
      };
    }
  );
}

function parseGrantsGovOpportunity(hit, searchTerm, sourceId) {
  const externalId = String(
    hit?.id || hit?.number || ""
  ).trim();

  if (!externalId) {
    return null;
  }

  const opportunityUrl = hit?.id
    ? `https://www.grants.gov/search-results-detail/${encodeURIComponent(
        hit.id
      )}`
    : "https://www.grants.gov/search-grants";

  return {
    id: fundingOpportunityId(
      "grants.gov",
      externalId,
      opportunityUrl
    ),
    provider: "Grants.gov",
    sourceId,
    externalId,
    opportunityNumber: hit?.number || "",
    title: hit?.title || "Untitled federal funding opportunity",
    agencyCode: hit?.agencyCode || "",
    agencyName: hit?.agencyName || "",
    openDate: hit?.openDate || null,
    deadline: hit?.closeDate || null,
    opportunityStatus: hit?.oppStatus || "",
    documentType: hit?.docType || "",
    assistanceListings: Array.isArray(hit?.alnist)
      ? hit.alnist
      : [],
    url: opportunityUrl,
    discoveryQuery: searchTerm,
    category: "government-grant",
    authorityType: "federal-government",
    trustScore: 1,
    qualificationStatus: "pending-opportunity-office",
    status: "discovered-unqualified",
    humanApprovalRequiredBeforeApplication: true,
    evidence: {
      providerEndpoint:
        "https://api.grants.gov/v1/api/search2",
      retrievedAt: continuousOperationsNow()
    }
  };
}

async function investigateGrantsGov(source) {
  const opportunities = [];
  const queryResults = [];
  const errors = [];

  for (const searchTerm of FUNDING_SEARCH_TERMS) {
    try {
      const result = await fetchPublicFundingResource(
        source.endpoint,
        {
          method: "POST",
          accept: "application/json",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            rows:
              FUNDING_DISCOVERY_MAX_OPPORTUNITIES_PER_QUERY,
            keyword: searchTerm,
            oppStatuses: "forecasted|posted",
            startRecordNum: 0
          })
        }
      );

      const payload = JSON.parse(result.body.toString("utf8"));
      const hits = Array.isArray(payload?.data?.oppHits)
        ? payload.data.oppHits
        : [];

      for (const hit of hits) {
        const normalized = parseGrantsGovOpportunity(
          hit,
          searchTerm,
          source.id
        );

        if (normalized) {
          opportunities.push(normalized);
        }
      }

      queryResults.push({
        searchTerm,
        hitCount: Number(payload?.data?.hitCount || hits.length),
        returned: hits.length,
        success: true
      });
    } catch (error) {
      errors.push({
        searchTerm,
        code: error?.code || "GRANTS_GOV_QUERY_FAILED",
        message: error?.message || String(error)
      });
    }
  }

  const unique = new Map();

  for (const opportunity of opportunities) {
    unique.set(opportunity.id, opportunity);
  }

  return {
    success: errors.length < FUNDING_SEARCH_TERMS.length,
    sourceId: source.id,
    opportunities: [...unique.values()],
    discoveredSources: [],
    queryResults,
    errors
  };
}

async function investigateFundingProgramPage(source) {
  const targetUrl = source.homepage || source.endpoint;
  const result = await fetchPublicFundingResource(targetUrl, {
    method: "GET",
    accept:
      "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.4"
  });
  const html = result.body.toString("utf8");
  const pageText = stripHtml(html).slice(0, 12_000);
  const links = extractFundingLinks(html, result.finalUrl);
  const sourceDomain = new URL(result.finalUrl).hostname;
  const discoveredSources = links.map(link => {
    const targetDomain = new URL(link.url).hostname;
    const external = targetDomain !== sourceDomain;

    return {
      id: fundingSourceIdFromUrl(link.url),
      name:
        link.label ||
        `${targetDomain} funding resource`,
      category:
        source.category || "funding",
      authorityType: external
        ? "referenced-organization"
        : source.authorityType,
      sourceType: "discovered-public-program-page",
      homepage: link.url,
      trustScore: external
        ? Math.max(0.55, source.trustScore * 0.75)
        : Math.max(0.7, source.trustScore * 0.9),
      priority: Math.max(
        25,
        Number(source.priority || 50) - (external ? 15 : 5)
      ),
      investigationFrequencyMs:
        FUNDING_DISCOVERY_SOURCE_REFRESH_MS,
      discoveryMethod: "public-link-discovery",
      discoveredFromSourceId: source.id,
      capabilities: [
        "funding-program-page",
        link.relationship
      ],
      evidence: {
        referringUrl: result.finalUrl,
        referringLabel: link.label,
        discoveredAt: continuousOperationsNow()
      }
    };
  });

  const pageSignals = [
    "grant",
    "funding",
    "foundation",
    "sponsorship",
    "matching gift",
    "volunteer grant",
    "in-kind",
    "partnership",
    "application"
  ].filter(signal =>
    pageText.toLowerCase().includes(signal)
  );

  return {
    success: true,
    sourceId: source.id,
    opportunities: [],
    discoveredSources,
    page: {
      requestedUrl: targetUrl,
      finalUrl: result.finalUrl,
      contentType: result.contentType,
      byteLength: result.body.length,
      relevantSignals: pageSignals,
      discoveredLinkCount: links.length
    },
    errors: []
  };
}

async function investigateFundingSource(source) {
  if (
    source.id === "funding-source-grants-gov" &&
    source.endpoint
  ) {
    return investigateGrantsGov(source);
  }

  return investigateFundingProgramPage(source);
}

async function markFundingSourceInvestigated(
  source,
  investigation
) {
  const now = continuousOperationsNow();
  const nextInvestigationAt = new Date(
    Date.now() +
      Math.max(
        60_000,
        Number(
          source.investigationFrequencyMs ||
            FUNDING_DISCOVERY_SOURCE_REFRESH_MS
        )
      )
  ).toISOString();

  return upsertFundingSources([
    {
      ...source,
      lastInvestigatedAt: now,
      nextInvestigationAt,
      lastInvestigationStatus:
        investigation.success ? "success" : "failed",
      lastOpportunityCount:
        investigation.opportunities?.length || 0,
      lastDiscoveredSourceCount:
        investigation.discoveredSources?.length || 0,
      lastError:
        investigation.success
          ? null
          : investigation.errors?.[0] || null,
      evidence: {
        ...(source.evidence || {}),
        lastInvestigationAt: now,
        lastInvestigationSummary: {
          opportunityCount:
            investigation.opportunities?.length || 0,
          discoveredSourceCount:
            investigation.discoveredSources?.length || 0,
          errorCount:
            investigation.errors?.length || 0
        }
      }
    }
  ]);
}

async function writeFundingInvestigationRecord(record) {
  return withExecutiveMemoryWriteLock(
    FUNDING_HISTORY_COLLECTION,
    async () => {
      const records = await readExecutiveMemoryCollection(
        FUNDING_HISTORY_COLLECTION
      );
      const normalized = normalizeExecutiveMemoryRecord(record);
      records.push(normalized);
      await writeExecutiveMemoryCollection(
        FUNDING_HISTORY_COLLECTION,
        records
      );
      return normalized;
    }
  );
}

async function getFundingIntelligenceStatus() {
  const sources = (
    await readExecutiveMemoryCollection(
      FUNDING_SOURCE_COLLECTION
    )
  ).filter(
    record => record?.type === "funding-intelligence-source"
  );
  const opportunities = (
    await readExecutiveMemoryCollection(
      FUNDING_OPPORTUNITY_COLLECTION
    )
  ).filter(
    record => record?.type === "funding-opportunity"
  );
  const history = (
    await readExecutiveMemoryCollection(
      FUNDING_HISTORY_COLLECTION
    )
  )
    .filter(
      record => record?.type === "funding-intelligence-run"
    )
    .sort((left, right) =>
      String(right.completedAt || "").localeCompare(
        String(left.completedAt || "")
      )
    )
    .slice(0, 10);

  const categories = {};

  for (const source of sources) {
    const category = source.category || "uncategorized";
    categories[category] = (categories[category] || 0) + 1;
  }

  return {
    schema: "meos.funding-intelligence.status.v1",
    version: FUNDING_INTELLIGENCE_VERSION,
    status: fundingIntelligenceState.status,
    lastRunAt: fundingIntelligenceState.lastRunAt,
    lastSuccessAt: fundingIntelligenceState.lastSuccessAt,
    lastError: fundingIntelligenceState.lastError,
    searchTerms: FUNDING_SEARCH_TERMS,
    totals: {
      sources: sources.length,
      opportunities: opportunities.length
    },
    categories,
    runtimeMetrics: {
      sourcesInvestigated:
        fundingIntelligenceState.sourcesInvestigated,
      sourcesDiscovered:
        fundingIntelligenceState.sourcesDiscovered,
      opportunitiesDiscovered:
        fundingIntelligenceState.opportunitiesDiscovered,
      duplicatesRejected:
        fundingIntelligenceState.duplicatesRejected
    },
    recentInvestigations: history
  };
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
        "Continuously discover, investigate, preserve, and expand government, foundation, corporate-giving, sponsorship, partnership, RFP, contract, matching-gift, volunteer-grant, in-kind, award, and innovation-challenge resource intelligence.",
      handler: "funding-intelligence-network",
      intervalMs: CONTINUOUS_OPERATIONS_DEFAULT_INTERVAL_MS,
      nextRunAt: now,
      priority: 100,
      requiresHumanApproval: false,
      autonomousAuthority:
        "research-record-organize-recommend",
      metadata: {
        standingMission: true,
        organizationNeutral: true,
        commissionedCapability:
          "independent-public-source-discovery",
        fundingIntelligenceVersion:
          FUNDING_INTELLIGENCE_VERSION
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

async function fundingIntelligenceNetworkHandler(context) {
  fundingIntelligenceState.status = "running";
  fundingIntelligenceState.lastRunAt =
    continuousOperationsNow();
  fundingIntelligenceState.lastError = null;

  const runStartedAt = continuousOperationsNow();
  const runStartedMs = Date.now();

  try {
    const registry = await ensureFundingSourceRegistry();
    const allRecords = await readExecutiveMemoryCollection(
      FUNDING_SOURCE_COLLECTION
    );
    const now = Date.now();

    const dueSources = allRecords
      .filter(
        record =>
          record?.type === "funding-intelligence-source" &&
          record.status !== "rejected" &&
          record.status !== "disabled"
      )
      .filter(source => {
        const dueAt = Date.parse(
          source.nextInvestigationAt || 0
        );

        return !Number.isFinite(dueAt) || dueAt <= now;
      })
      .sort(
        (left, right) =>
          Number(right.priority || 0) -
            Number(left.priority || 0) ||
          String(left.nextInvestigationAt || "").localeCompare(
            String(right.nextInvestigationAt || "")
          )
      )
      .slice(0, FUNDING_DISCOVERY_MAX_SOURCES_PER_RUN);

    const investigations = [];
    const allDiscoveredSources = [];
    const allOpportunities = [];

    for (const source of dueSources) {
      let investigation;

      try {
        investigation = await investigateFundingSource(source);
      } catch (error) {
        investigation = {
          success: false,
          sourceId: source.id,
          opportunities: [],
          discoveredSources: [],
          errors: [
            {
              code:
                error?.code ||
                "FUNDING_SOURCE_INVESTIGATION_FAILED",
              message: error?.message || String(error)
            }
          ]
        };
      }

      investigations.push({
        sourceId: source.id,
        sourceName: source.name,
        success: investigation.success,
        opportunityCount:
          investigation.opportunities?.length || 0,
        discoveredSourceCount:
          investigation.discoveredSources?.length || 0,
        queryResults:
          investigation.queryResults || null,
        page: investigation.page || null,
        errors: investigation.errors || []
      });

      allDiscoveredSources.push(
        ...(investigation.discoveredSources || [])
      );
      allOpportunities.push(
        ...(investigation.opportunities || [])
      );

      await markFundingSourceInvestigated(
        source,
        investigation
      );
    }

    const sourceWriteResult = await upsertFundingSources(
      allDiscoveredSources
    );
    const opportunityWriteResult =
      await upsertFundingOpportunities(
        allOpportunities
      );

    const completedAt = continuousOperationsNow();
    const successfulInvestigations =
      investigations.filter(item => item.success).length;
    const failedInvestigations =
      investigations.length - successfulInvestigations;

    const investigationRecord =
      await writeFundingInvestigationRecord({
        id: `funding-intelligence-run-${context.runId}`,
        schema:
          "meos.funding-intelligence.run.v1",
        type: "funding-intelligence-run",
        office: "Funding Office",
        missionId: context.job.id,
        continuousOperationsRunId: context.runId,
        startedAt: runStartedAt,
        completedAt,
        durationMs: Date.now() - runStartedMs,
        status:
          failedInvestigations === 0
            ? "complete"
            : successfulInvestigations > 0
              ? "partial"
              : "failed",
        registry,
        metrics: {
          dueSources: dueSources.length,
          sourcesInvestigated:
            investigations.length,
          successfulInvestigations,
          failedInvestigations,
          newSources: sourceWriteResult.added,
          updatedSources: sourceWriteResult.updated,
          newOpportunities:
            opportunityWriteResult.added,
          updatedOpportunities:
            opportunityWriteResult.updated,
          duplicatesRejected:
            opportunityWriteResult.duplicates
        },
        investigations,
        authorityBoundary:
          "The Funding Office researched, recorded, and queued intelligence only. No application, external message, commitment, expenditure, or representation was made."
      });

    fundingIntelligenceState.status =
      failedInvestigations === investigations.length &&
      investigations.length > 0
        ? "degraded"
        : "online";
    fundingIntelligenceState.lastSuccessAt =
      successfulInvestigations > 0 ||
      investigations.length === 0
        ? completedAt
        : fundingIntelligenceState.lastSuccessAt;
    fundingIntelligenceState.sourcesInvestigated +=
      investigations.length;
    fundingIntelligenceState.sourcesDiscovered +=
      sourceWriteResult.added;
    fundingIntelligenceState.opportunitiesDiscovered +=
      opportunityWriteResult.added;
    fundingIntelligenceState.duplicatesRejected +=
      opportunityWriteResult.duplicates;

    return {
      success:
        investigations.length === 0 ||
        successfulInvestigations > 0,
      summary:
        `Funding Intelligence investigated ${investigations.length} source` +
        `${investigations.length === 1 ? "" : "s"}, added ` +
        `${sourceWriteResult.added} source` +
        `${sourceWriteResult.added === 1 ? "" : "s"}, and discovered ` +
        `${opportunityWriteResult.added} new ` +
        `${opportunityWriteResult.added === 1 ? "opportunity" : "opportunities"}.`,
      metrics:
        investigationRecord.metrics,
      investigationRecordId:
        investigationRecord.id,
      nextAction:
        opportunityWriteResult.added > 0
          ? "Opportunity Office qualification is required."
          : "Continue monitoring and expand the funding intelligence network.",
      authorityBoundary:
        investigationRecord.authorityBoundary
    };
  } catch (error) {
    fundingIntelligenceState.status = "degraded";
    fundingIntelligenceState.lastError =
      error?.message || String(error);

    return {
      success: false,
      error: {
        code:
          error?.code ||
          "FUNDING_INTELLIGENCE_RUN_FAILED",
        message: error?.message || String(error)
      }
    };
  }
}

registerContinuousOperationsHandler(
  "funding-intelligence-network",
  fundingIntelligenceNetworkHandler
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
 * Funding Intelligence Network API
 *
 * Read-only operational view plus a controlled registry refresh endpoint.
 */
app.get(
  "/api/funding-intelligence",
  async (request, response) => {
    try {
      response.status(200).json(
        await getFundingIntelligenceStatus()
      );
    } catch (error) {
      response.status(500).json({
        error:
          error?.message ||
          "Funding Intelligence status could not be read.",
        code:
          error?.code ||
          "FUNDING_INTELLIGENCE_STATUS_FAILED"
      });
    }
  }
);

app.post(
  "/api/funding-intelligence/registry/seed",
  express.json({
    limit: "16kb",
    strict: true
  }),
  async (request, response) => {
    try {
      const result = await ensureFundingSourceRegistry();

      response.status(200).json({
        schema:
          "meos.funding-intelligence.registry.v1",
        version: FUNDING_INTELLIGENCE_VERSION,
        result
      });
    } catch (error) {
      response.status(500).json({
        error:
          error?.message ||
          "Funding Intelligence registry could not be commissioned.",
        code:
          error?.code ||
          "FUNDING_INTELLIGENCE_REGISTRY_FAILED"
      });
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
  const fundingIntelligence =
    await getFundingIntelligenceStatus().catch(error => ({
      version: FUNDING_INTELLIGENCE_VERSION,
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
    fundingIntelligence,
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

  ensureFundingSourceRegistry()
    .then(result => {
      fundingIntelligenceState.status = "online";
      console.log(
        `[MEOS] Funding Intelligence Network ` +
          `v${FUNDING_INTELLIGENCE_VERSION} registry ready. ` +
          `sources=${result.total}.`
      );
    })
    .catch(error => {
      fundingIntelligenceState.status = "degraded";
      fundingIntelligenceState.lastError =
        error?.message || String(error);

      console.error(
        "[MEOS] Funding Intelligence registry failed to initialize:",
        error
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
