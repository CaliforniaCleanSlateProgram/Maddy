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
import ResourceDiscoveryNetwork from "./resource-discovery-network.js";
import CaliforniaGrantsPortalAdapter from "./california-grants-portal-adapter.js";
import LocalResourceDiscoveryAdapter from "./local-resource-discovery-adapter.js";
import LocalCSRDiscoveryAdapter from "./local-csr-discovery-adapter.js";
import CommunityFoundationDiscoveryAdapter from "./community-foundation-discovery-adapter.js";
import FamilyFoundationDiscoveryAdapter from "./family-foundation-discovery-adapter.js";
import WatershedCoastalResourceDiscoveryAdapter from "./watershed-coastal-resource-discovery-adapter.js";

const VERSION = "2.9.2";
const VOICE_ENGINE_VERSION = "2.0.0";

const RESOURCE_DISCOVERY_INTEGRATION_VERSION = "1.4.0";
const RESOURCE_DISCOVERY_INTEGRATION_BUILD_ID =
  "RDI140-WATERSHED-COASTAL-LIVE-20260803-A";

const resourceDiscoveryIntegrationState = {
  status: "initializing",
  registeredAdapters: [],
  lastRunAt: null,
  lastError: null,
  lastResultCount: 0
};

function registerResourceDiscoveryAdapters() {
  const californiaResult =
    CaliforniaGrantsPortalAdapter.register(
      ResourceDiscoveryNetwork
    );

  const localResult =
    LocalResourceDiscoveryAdapter.register(
      ResourceDiscoveryNetwork
    );

  const csrResult =
    LocalCSRDiscoveryAdapter.register(
      ResourceDiscoveryNetwork
    );

  const communityFoundationResult =
    CommunityFoundationDiscoveryAdapter.register(
      ResourceDiscoveryNetwork
    );

  const familyFoundationResult =
    FamilyFoundationDiscoveryAdapter.register(
      ResourceDiscoveryNetwork
    );

  const watershedCoastalResult =
    WatershedCoastalResourceDiscoveryAdapter.register(
      ResourceDiscoveryNetwork
    );

  resourceDiscoveryIntegrationState.registeredAdapters =
    ResourceDiscoveryNetwork.listAdapters();

  resourceDiscoveryIntegrationState.status = "online";
  resourceDiscoveryIntegrationState.lastError = null;

  return {
    results: {
      california: californiaResult,
      local: localResult,
      csr: csrResult,
      communityFoundation:
        communityFoundationResult,
      familyFoundation:
        familyFoundationResult,
      watershedCoastal:
        watershedCoastalResult
    },
    adapters:
      resourceDiscoveryIntegrationState.registeredAdapters
  };
}


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

const FUNDING_INVESTIGATION_CONCURRENCY = Math.max(
  1,
  Math.min(
    8,
    Number(process.env.MEOS_FUNDING_INVESTIGATION_CONCURRENCY || 4)
  )
);
const FUNDING_REINVESTIGATION_MAX_RECORDS = Math.max(
  1,
  Math.min(
    500,
    Number(process.env.MEOS_FUNDING_REINVESTIGATION_MAX_RECORDS || 500)
  )
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

const FUNDING_QUALIFICATION_VERSION = "2.0.0";

const fundingIntelligenceState = {
  status: "initializing",
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  sourcesInvestigated: 0,
  sourcesDiscovered: 0,
  opportunitiesDiscovered: 0,
  duplicatesRejected: 0,
  lastQualificationSummary: {
    total: 0,
    pursue: 0,
    prepare: 0,
    monitor: 0,
    partner: 0,
    humanReview: 0,
    decline: 0,
    executiveQualified: 0,
    executiveReviewRequired: 0,
    executiveRejected: 0
  }
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


const FUNDING_EXECUTIVE_RECOMMENDATIONS = Object.freeze({
  PURSUE: "pursue",
  PREPARE: "prepare",
  MONITOR: "monitor",
  PARTNER: "partner",
  HUMAN_REVIEW: "human-review",
  DECLINE: "decline"
});

const FUNDING_QUALIFICATION_STATUSES = Object.freeze({
  QUALIFIED: "executive-qualified",
  REVIEW_REQUIRED: "executive-review-required",
  REJECTED: "executive-rejected"
});

const FUNDING_GEOGRAPHY_LEVELS = Object.freeze({
  LOCAL: "local",
  REGIONAL: "regional",
  CALIFORNIA: "california",
  USA: "usa",
  INTERNATIONAL: "international",
  UNKNOWN: "unknown"
});

const FUNDING_PARTICIPATION_LABELS = Object.freeze({
  CAN_LEAD: "Can Lead",
  CAN_PARTNER: "Can Partner",
  LEAD_OR_PARTNER: "Lead or Partner",
  NEEDS_RESEARCH: "Needs Research",
  NOT_ELIGIBLE: "Not Eligible"
});

const CCSP_FUNDING_STRATEGY_SIGNALS = Object.freeze([
  {
    id: "mobile-hygiene",
    roadmap: "Mobile hygiene and low-barrier outreach",
    terms: [
      "mobile hygiene", "hygiene", "shower", "sanitation",
      "homeless outreach", "street outreach"
    ],
    weight: 24
  },
  {
    id: "substance-use-recovery",
    roadmap: "Stabilization, recovery navigation, and treatment",
    terms: [
      "substance use", "substance abuse", "sud", "recovery",
      "behavioral health", "treatment", "residential treatment",
      "medication assisted treatment", "opioid", "overdose"
    ],
    weight: 28
  },
  {
    id: "housing-and-stabilization",
    roadmap: "Sober living, supportive housing, and permanent stability",
    terms: [
      "homelessness", "housing", "supportive housing",
      "transitional housing", "sober living",
      "community stabilization", "permanent housing"
    ],
    weight: 26
  },
  {
    id: "workforce-development",
    roadmap: "Workforce readiness, employment, and self-sufficiency",
    terms: [
      "workforce", "employment", "job training", "apprenticeship",
      "skilled trades", "economic mobility", "career readiness"
    ],
    weight: 22
  },
  {
    id: "watershed-and-environment",
    roadmap: "Watershed protection and environmental stewardship",
    terms: [
      "watershed", "water quality", "environmental", "river",
      "monterey bay", "pollution prevention"
    ],
    weight: 20
  },
  {
    id: "organizational-capacity",
    roadmap: "Organizational capacity, infrastructure, and sustainability",
    terms: [
      "capacity building", "nonprofit", "community development",
      "technology", "infrastructure", "capital", "equipment",
      "operating support"
    ],
    weight: 16
  }
]);

const FUNDING_FOREIGN_COUNTRIES = Object.freeze([
  "afghanistan", "albania", "algeria", "andorra", "angola",
  "antigua and barbuda", "argentina", "armenia", "australia",
  "austria", "azerbaijan", "bahamas", "bahrain", "bangladesh",
  "barbados", "belarus", "belgium", "belize", "benin", "bhutan",
  "bolivia", "bosnia and herzegovina", "botswana", "brazil",
  "brunei", "bulgaria", "burkina faso", "burundi", "cabo verde",
  "cambodia", "cameroon", "canada", "central african republic",
  "chad", "chile", "china", "colombia", "comoros",
  "democratic republic of the congo", "republic of the congo",
  "costa rica", "cote d ivoire", "croatia", "cuba", "cyprus",
  "czechia", "denmark", "djibouti", "dominica",
  "dominican republic", "ecuador", "egypt", "el salvador",
  "equatorial guinea", "eritrea", "estonia", "eswatini",
  "ethiopia", "fiji", "finland", "france", "gabon", "gambia",
  "georgia", "germany", "ghana", "greece", "grenada",
  "guatemala", "guinea", "guinea bissau", "guyana", "haiti",
  "honduras", "hungary", "iceland", "india", "indonesia", "iran",
  "iraq", "ireland", "israel", "italy", "jamaica", "japan",
  "jordan", "kazakhstan", "kenya", "kiribati", "kosovo", "kuwait",
  "kyrgyzstan", "laos", "latvia", "lebanon", "lesotho", "liberia",
  "libya", "liechtenstein", "lithuania", "luxembourg",
  "madagascar", "malawi", "malaysia", "maldives", "mali", "malta",
  "marshall islands", "mauritania", "mauritius", "mexico",
  "micronesia", "moldova", "monaco", "mongolia", "montenegro",
  "morocco", "mozambique", "myanmar", "namibia", "nauru", "nepal",
  "netherlands", "new zealand", "nicaragua", "niger", "nigeria",
  "north korea", "north macedonia", "norway", "oman", "pakistan",
  "palau", "panama", "papua new guinea", "paraguay", "peru",
  "philippines", "poland", "portugal", "qatar", "romania", "russia",
  "rwanda", "saint kitts and nevis", "saint lucia",
  "saint vincent and the grenadines", "samoa", "san marino",
  "sao tome and principe", "saudi arabia", "senegal", "serbia",
  "seychelles", "sierra leone", "singapore", "slovakia",
  "slovenia", "solomon islands", "somalia", "south africa",
  "south korea", "south sudan", "spain", "sri lanka", "sudan",
  "suriname", "sweden", "switzerland", "syria", "taiwan",
  "tajikistan", "tanzania", "thailand", "timor leste", "togo",
  "tonga", "trinidad and tobago", "tunisia", "turkey",
  "turkmenistan", "tuvalu", "uganda", "ukraine",
  "united arab emirates", "united kingdom", "uruguay", "uzbekistan",
  "vanuatu", "vatican city", "venezuela", "vietnam", "yemen",
  "zambia", "zimbabwe"
]);

function normalizeFundingQualificationText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fundingQualificationText(opportunity = {}) {
  return normalizeFundingQualificationText(
    [
      opportunity.title,
      opportunity.description,
      opportunity.statedPurpose,
      opportunity.agencyName,
      opportunity.agencyCode,
      opportunity.category,
      opportunity.discoveryQuery,
      opportunity.geography,
      opportunity.location,
      opportunity.locations,
      opportunity.jurisdiction,
      opportunity.state,
      opportunity.states,
      opportunity.eligibleApplicants,
      opportunity.additionalEligibility,
      opportunity.additionalEligibilityInformation,
      opportunity.restrictions,
      opportunity.partnerRequirements,
      opportunity.requirements,
      opportunity.fundingAreas,
      opportunity.assistanceListings,
      opportunity.capabilities,
      opportunity.fullNotice,
      opportunity.url
    ]
      .flat(Infinity)
      .filter(Boolean)
      .map(value =>
        typeof value === "object"
          ? JSON.stringify(value)
          : String(value)
      )
      .join(" ")
  );
}

function fundingOpportunityLifecycle(opportunity) {
  const nowMs = Date.now();
  const openMs = Date.parse(
    opportunity.openDate || opportunity.postedDate || ""
  );
  const deadlineMs = Date.parse(
    opportunity.deadline || opportunity.closeDate || ""
  );
  const rawStatus = normalizeFundingQualificationText(
    opportunity.opportunityStatus || opportunity.status || ""
  );

  if (
    rawStatus.includes("forecast") ||
    rawStatus.includes("expected") ||
    (Number.isFinite(openMs) && openMs > nowMs)
  ) {
    return "coming-soon";
  }

  if (
    rawStatus.includes("closed") ||
    (Number.isFinite(deadlineMs) && deadlineMs < nowMs)
  ) {
    return "closed";
  }

  if (
    rawStatus.includes("posted") ||
    rawStatus.includes("open") ||
    !Number.isFinite(deadlineMs) ||
    deadlineMs >= nowMs
  ) {
    return "open";
  }

  return "unknown";
}

function determineFundingGeography(opportunity = {}) {
  const titleText = normalizeFundingQualificationText(
    [
      opportunity.title,
      opportunity.agencyName,
      opportunity.agencyCode
    ]
      .filter(Boolean)
      .join(" ")
  );

  const projectText = normalizeFundingQualificationText(
    [
      opportunity.title,
      opportunity.description,
      opportunity.statedPurpose,
      opportunity.geography,
      opportunity.location,
      opportunity.locations,
      opportunity.jurisdiction,
      opportunity.state,
      opportunity.states,
      opportunity.fundingActivityCategories,
      opportunity.fullNotice?.projectLocation,
      opportunity.fullNotice?.placeOfPerformance
    ]
      .flat(Infinity)
      .filter(Boolean)
      .map(value =>
        typeof value === "object"
          ? JSON.stringify(value)
          : String(value)
      )
      .join(" ")
  );

  const evidence = [];
  const addEvidence = value => {
    if (value && !evidence.includes(value)) {
      evidence.push(value);
    }
  };

  /*
   * International classification requires evidence about the funded work,
   * beneficiaries, or a foreign diplomatic program. Boilerplate eligibility
   * phrases such as "foreign entities are not eligible" are not project
   * geography and must not trigger an international classification.
   */
  const foreignMission = titleText.match(
    /\b(?:u s |united states )?(?:embassy|mission|consulate|american center|jefferson center) (?:to|in|at)? ?([a-z][a-z ]{2,60})\b/
  );

  const foreignCountryInTitle = FUNDING_FOREIGN_COUNTRIES.find(country =>
    titleText.includes(country)
  );

  const foreignProjectPhrase = projectText.match(
    /\b(?:work|services|program|project|activities|beneficiaries|implementation|assistance|capacity building|public diplomacy)\s+(?:in|for|across|within|throughout)\s+([a-z][a-z ]{2,60})\b/
  );

  const foreignCountryInProjectPhrase =
    foreignProjectPhrase &&
    FUNDING_FOREIGN_COUNTRIES.find(country =>
      foreignProjectPhrase[0].includes(country)
    );

  const explicitInternationalProgram = projectText.match(
    /\b(?:partner countries|developing countries|global health security|international development|foreign assistance|overseas program|public diplomacy program)\b/
  );

  if (
    foreignMission ||
    foreignCountryInTitle ||
    foreignCountryInProjectPhrase ||
    explicitInternationalProgram
  ) {
    addEvidence(
      foreignMission?.[0] ||
      foreignCountryInTitle ||
      foreignProjectPhrase?.[0] ||
      explicitInternationalProgram?.[0]
    );

    return {
      level: FUNDING_GEOGRAPHY_LEVELS.INTERNATIONAL,
      label: "International",
      priorityOrder: 99,
      eligibleOperatingFootprint: false,
      confirmed: true,
      restrictedRegion: null,
      evidence,
      explanation:
        "The funded work, beneficiaries, or diplomatic program are outside CCSP's approved United States operating footprint."
    };
  }

  const local = projectText.match(
    /\b(?:santa cruz county|city of santa cruz|watsonville|capitola|scotts valley|aptos|soquel|felton|ben lomond|boulder creek)\b/
  );

  if (local) {
    addEvidence(local[0]);
    return {
      level: FUNDING_GEOGRAPHY_LEVELS.LOCAL,
      label: "Local",
      priorityOrder: 1,
      eligibleOperatingFootprint: true,
      confirmed: true,
      restrictedRegion: null,
      evidence,
      explanation:
        "The opportunity is tied directly to Santa Cruz County or CCSP's immediate service area."
    };
  }

  const regional = projectText.match(
    /\b(?:monterey county|san benito county|santa clara county|central coast|monterey bay|tri county|bay area)\b/
  );

  if (regional) {
    addEvidence(regional[0]);
    return {
      level: FUNDING_GEOGRAPHY_LEVELS.REGIONAL,
      label: "Regional",
      priorityOrder: 2,
      eligibleOperatingFootprint: true,
      confirmed: true,
      restrictedRegion: null,
      evidence,
      explanation:
        "The opportunity falls within CCSP's established outward regional funding priority."
    };
  }

  const california = projectText.match(
    /\b(?:california|state of california|california nonprofits|california organizations)\b/
  );

  if (california) {
    addEvidence(california[0]);
    return {
      level: FUNDING_GEOGRAPHY_LEVELS.CALIFORNIA,
      label: "California",
      priorityOrder: 3,
      eligibleOperatingFootprint: true,
      confirmed: true,
      restrictedRegion: null,
      evidence,
      explanation:
        "The opportunity is available within California and fits CCSP's established outward funding priority."
    };
  }

  const restrictedDomestic = projectText.match(
    /\b(?:great lakes basin|appalachian region|delta states|new england|gulf coast states|pacific northwest|mid atlantic|tribal lands only|rural alaska|hawaii only|puerto rico only|eastern nevada|nevada only)\b/
  );

  if (restrictedDomestic) {
    addEvidence(restrictedDomestic[0]);
    return {
      level: FUNDING_GEOGRAPHY_LEVELS.USA,
      label: "USA — Restricted Region",
      priorityOrder: 5,
      eligibleOperatingFootprint: false,
      confirmed: true,
      restrictedRegion: restrictedDomestic[0],
      evidence,
      explanation:
        "The opportunity is domestic, but required project geography is outside CCSP's current viable service footprint."
    };
  }

  const domesticAuthority =
    opportunity.authorityType === "federal-government" ||
    opportunity.authorityType === "state-government" ||
    opportunity.authorityType === "county-government" ||
    opportunity.authorityType === "city-government" ||
    opportunity.provider === "Grants.gov";

  const usa = projectText.match(
    /\b(?:united states|u s |usa|nationwide|national|federal|domestic applicants|state governments|county governments|city or township governments)\b/
  );

  if (usa || domesticAuthority) {
    addEvidence(usa?.[0] || opportunity.authorityType || opportunity.provider);
    return {
      level: FUNDING_GEOGRAPHY_LEVELS.USA,
      label: "USA",
      priorityOrder: 4,
      eligibleOperatingFootprint: true,
      confirmed: Boolean(usa),
      restrictedRegion: null,
      evidence,
      explanation:
        "The opportunity is issued through a United States funding source and no foreign place of performance is established."
    };
  }

  return {
    level: FUNDING_GEOGRAPHY_LEVELS.UNKNOWN,
    label: "Unknown",
    priorityOrder: 6,
    eligibleOperatingFootprint: null,
    confirmed: false,
    restrictedRegion: null,
    evidence,
    explanation:
      "The available evidence does not support a reliable project-location conclusion."
  };
}

function determineFundingParticipation(opportunity = {}, geography) {
  const text = fundingQualificationText(opportunity);
  const evidence = [];

  if (geography?.eligibleOperatingFootprint === false) {
    return {
      label: FUNDING_PARTICIPATION_LABELS.NOT_ELIGIBLE,
      canLead: false,
      canPartner: false,
      partnershipRequired: false,
      confirmed: true,
      evidence: geography.evidence || [],
      explanation:
        "The required project geography is outside CCSP's approved operating footprint."
    };
  }

  const explicitExclusion = text.match(
    /\b(?:nonprofits are not eligible|nonprofit organizations are not eligible|for profit entities only|individuals only|foreign entities only)\b/
  );
  if (explicitExclusion) {
    evidence.push(explicitExclusion[0]);
    return {
      label: FUNDING_PARTICIPATION_LABELS.NOT_ELIGIBLE,
      canLead: false,
      canPartner: false,
      partnershipRequired: false,
      confirmed: true,
      evidence,
      explanation:
        "The available eligibility language excludes CCSP as an applicant or funded participant."
    };
  }

  const partnershipRequired = Boolean(
    text.match(
      /\b(?:mandatory partners|required partners|regional partnership|consortium required|coalition required|must partner|must include|collaborative agreement|required collaboration)\b/
    )
  );
  const partnerPath = Boolean(
    text.match(
      /\b(?:subaward|subrecipient|community based organization|community organization|optional partners|implementation partner|funded partner|contractor|coalition member|consortium member)\b/
    )
  );
  const nonprofitEligible = Boolean(
    text.match(
      /\b(?:nonprofits|nonprofit organizations|501 c 3|public charity|community based organizations|faith based and community organizations)\b/
    )
  );

  if (partnershipRequired) {
    evidence.push("mandatory partnership structure");
    return {
      label: FUNDING_PARTICIPATION_LABELS.CAN_PARTNER,
      canLead: nonprofitEligible ? null : false,
      canPartner: true,
      partnershipRequired: true,
      confirmed: true,
      evidence,
      explanation:
        nonprofitEligible
          ? "CCSP appears eligible to participate, but the opportunity requires partners. Lead eligibility and lead capacity require confirmation."
          : "CCSP may be viable as a funded partner, but the available evidence does not establish direct lead eligibility."
    };
  }

  if (nonprofitEligible && partnerPath) {
    evidence.push("nonprofit eligibility", "partner path");
    return {
      label: FUNDING_PARTICIPATION_LABELS.LEAD_OR_PARTNER,
      canLead: true,
      canPartner: true,
      partnershipRequired: false,
      confirmed: true,
      evidence,
      explanation:
        "The available notice permits nonprofit participation and identifies a partner or subrecipient path."
    };
  }

  if (nonprofitEligible) {
    evidence.push("nonprofit eligibility");
    return {
      label: FUNDING_PARTICIPATION_LABELS.CAN_LEAD,
      canLead: true,
      canPartner: partnerPath || null,
      partnershipRequired: false,
      confirmed: true,
      evidence,
      explanation:
        "The available notice permits nonprofit applicants and does not show a mandatory partnership structure."
    };
  }

  if (partnerPath) {
    evidence.push("partner or subrecipient path");
    return {
      label: FUNDING_PARTICIPATION_LABELS.CAN_PARTNER,
      canLead: null,
      canPartner: true,
      partnershipRequired: false,
      confirmed: true,
      evidence,
      explanation:
        "A funded partner or subrecipient path is visible, but direct lead eligibility is not established."
    };
  }

  return {
    label: FUNDING_PARTICIPATION_LABELS.NEEDS_RESEARCH,
    canLead: null,
    canPartner: null,
    partnershipRequired: null,
    confirmed: false,
    evidence,
    explanation:
      "The available evidence is not enough to decide whether CCSP should lead, partner, or decline."
  };
}

function calculateFundingStrategyAlignment(opportunity) {
  const text = fundingQualificationText(opportunity);
  const matches = CCSP_FUNDING_STRATEGY_SIGNALS
    .map(signal => {
      const matchedTerms = signal.terms.filter(term =>
        text.includes(normalizeFundingQualificationText(term))
      );
      return {
        id: signal.id,
        roadmap: signal.roadmap,
        matchedTerms,
        score:
          matchedTerms.length > 0
            ? Math.min(signal.weight, 8 + matchedTerms.length * 6)
            : 0
      };
    })
    .filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score);

  const score = Math.min(
    100,
    matches.reduce((total, match) => total + match.score, 0)
  );

  return {
    score,
    label:
      score >= 60 ? "strong" :
      score >= 30 ? "moderate" :
      score > 0 ? "weak" : "none",
    matches
  };
}

function calculateFundingOperationalReadiness(opportunity) {
  let score = 45;
  const text = fundingQualificationText(opportunity);

  if (/nonprofit|community organization|501 c 3|public charity/.test(text)) {
    score += 20;
  }
  if (/california|santa cruz|monterey|central coast/.test(text)) {
    score += 15;
  }
  if (/planning|capacity building|technical assistance|equipment|operating support/.test(text)) {
    score += 10;
  }
  if (/licensed facility|licensed provider|accreditation|required match|cost share/.test(text)) {
    score -= 20;
  }
  return Math.max(0, Math.min(100, score));
}

function analyzeFundingCostShare(opportunity) {
  const text = fundingQualificationText(opportunity);
  const explicit = opportunity.costSharing;
  const required =
    explicit === true ||
    /\b(?:cost sharing required|required match|matching requirement yes|cost share required)\b/.test(text);

  return {
    required,
    confirmed: explicit !== undefined && explicit !== null,
    type:
      required
        ? /\bin kind\b/.test(text)
          ? "cash-or-in-kind"
          : "unknown"
        : "none-known",
    percentage: null,
    plainEnglish:
      required
        ? "The funder requires part of the project value to come from CCSP, partners, or another allowed source. The exact percentage and whether cash or in-kind support counts must be confirmed from the full notice."
        : "No cost-share requirement is confirmed in the available notice.",
    feasibility:
      required ? "requires-partner-and-source-analysis" : "not-applicable"
  };
}

function analyzeFundingMoneyFlow(opportunity, participation) {
  const text = fundingQualificationText(opportunity);
  const subawardPath = /\b(?:subaward|subrecipient|contractor|implementation partner|funded partner)\b/.test(text);

  return {
    directAwardPossible:
      participation.canLead === true ? true :
      participation.canLead === false ? false : null,
    partnerFundingPossible:
      participation.canPartner === true && subawardPath ? true :
      participation.canPartner === false ? false : null,
    confirmed: participation.confirmed && (participation.canLead === true || subawardPath),
    plainEnglish:
      participation.canLead === true
        ? "CCSP may receive award funds directly if it serves as the approved lead applicant."
        : participation.canPartner === true
          ? "Money may flow to CCSP through a subaward, subcontract, or funded implementation-partner agreement, but the exact mechanism must be confirmed."
          : "The available evidence does not yet establish a lawful funding path into CCSP."
  };
}

function determineFundingRoadmap(strategy) {
  return strategy.matches.map(match => ({
    id: match.id,
    objective: match.roadmap,
    score: match.score,
    evidence: match.matchedTerms
  }));
}

function identifyFundingUnknowns(opportunity, geography, participation, costShare, moneyFlow) {
  const unknowns = [];
  if (!opportunity.description) {
    unknowns.push("Full opportunity description has not been retrieved.");
  }
  if (geography.level === FUNDING_GEOGRAPHY_LEVELS.UNKNOWN) {
    unknowns.push("Required project and beneficiary geography is not verified.");
  }
  if (participation.label === FUNDING_PARTICIPATION_LABELS.NEEDS_RESEARCH) {
    unknowns.push("Lead and partner eligibility are not verified.");
  }
  if (costShare.required && !costShare.confirmed) {
    unknowns.push("Cost-share percentage and eligible match sources are not verified.");
  }
  if (!moneyFlow.confirmed) {
    unknowns.push("The exact mechanism for funds to flow into CCSP is not verified.");
  }
  if (!opportunity.awardFloor && !opportunity.awardCeiling) {
    unknowns.push("Award range is not verified.");
  }
  if (!opportunity.deadline) {
    unknowns.push("Application deadline is not verified.");
  }
  return [...new Set(unknowns)];
}

function deriveFundingQualificationStatus(recommendation) {
  if (
    recommendation === FUNDING_EXECUTIVE_RECOMMENDATIONS.PURSUE ||
    recommendation === FUNDING_EXECUTIVE_RECOMMENDATIONS.PARTNER ||
    recommendation === FUNDING_EXECUTIVE_RECOMMENDATIONS.PREPARE
  ) {
    return {
      qualificationStatus: FUNDING_QUALIFICATION_STATUSES.QUALIFIED,
      status:
        recommendation === FUNDING_EXECUTIVE_RECOMMENDATIONS.PARTNER
          ? "partnership-required"
          : recommendation === FUNDING_EXECUTIVE_RECOMMENDATIONS.PREPARE
            ? "strategic-preparation"
            : "executive-priority"
    };
  }

  if (recommendation === FUNDING_EXECUTIVE_RECOMMENDATIONS.DECLINE) {
    return {
      qualificationStatus: FUNDING_QUALIFICATION_STATUSES.REJECTED,
      status: "declined"
    };
  }

  return {
    qualificationStatus: FUNDING_QUALIFICATION_STATUSES.REVIEW_REQUIRED,
    status:
      recommendation === FUNDING_EXECUTIVE_RECOMMENDATIONS.MONITOR
        ? "monitor"
        : "executive-review"
  };
}

function qualifyFundingOpportunity(opportunity) {
  const lifecycle = fundingOpportunityLifecycle(opportunity);
  const geography = determineFundingGeography(opportunity);
  const participation = determineFundingParticipation(opportunity, geography);
  const strategy = calculateFundingStrategyAlignment(opportunity);
  const readiness = calculateFundingOperationalReadiness(opportunity);
  const roadmap = determineFundingRoadmap(strategy);
  const costShare = analyzeFundingCostShare(opportunity);
  const moneyFlow = analyzeFundingMoneyFlow(opportunity, participation);
  const unknowns = identifyFundingUnknowns(
    opportunity,
    geography,
    participation,
    costShare,
    moneyFlow
  );

  const reasons = [];
  const requiredActions = [];
  let recommendation = FUNDING_EXECUTIVE_RECOMMENDATIONS.HUMAN_REVIEW;

  if (
    geography.eligibleOperatingFootprint === false ||
    participation.label === FUNDING_PARTICIPATION_LABELS.NOT_ELIGIBLE
  ) {
    recommendation = FUNDING_EXECUTIVE_RECOMMENDATIONS.DECLINE;
    reasons.push(
      geography.eligibleOperatingFootprint === false
        ? geography.explanation
        : participation.explanation
    );
  } else if (lifecycle === "closed" || lifecycle === "coming-soon") {
    recommendation = FUNDING_EXECUTIVE_RECOMMENDATIONS.MONITOR;
    reasons.push(
      lifecycle === "closed"
        ? "The current cycle is closed; preserve it for recurrence and replacement monitoring."
        : "The opportunity is forecasted or not yet actionable; prepare proportionately and monitor."
    );
  } else if (
    participation.canPartner === true &&
    participation.partnershipRequired &&
    strategy.score >= 30
  ) {
    recommendation = FUNDING_EXECUTIVE_RECOMMENDATIONS.PARTNER;
    reasons.push(
      "The opportunity has meaningful mission or roadmap value and requires a partnership structure."
    );
    requiredActions.push(
      "Confirm lead eligibility, mandatory partners, cost share, and the funded role available to CCSP."
    );
  } else if (
    strategy.score >= 60 &&
    participation.canLead === true &&
    readiness >= 65 &&
    lifecycle === "open"
  ) {
    recommendation = FUNDING_EXECUTIVE_RECOMMENDATIONS.PURSUE;
    reasons.push(
      "The opportunity strongly advances CCSP's mission or approved roadmap and appears actionable."
    );
  } else if (strategy.score >= 60) {
    recommendation = FUNDING_EXECUTIVE_RECOMMENDATIONS.PREPARE;
    reasons.push(
      "The opportunity strongly fits CCSP, but readiness, eligibility, partnership, or evidence gaps remain."
    );
  } else if (strategy.score >= 30) {
    recommendation = FUNDING_EXECUTIVE_RECOMMENDATIONS.HUMAN_REVIEW;
    reasons.push(
      "The opportunity has meaningful strategic value but requires executive review of the remaining evidence."
    );
  } else {
    recommendation =
      unknowns.length > 0
        ? FUNDING_EXECUTIVE_RECOMMENDATIONS.HUMAN_REVIEW
        : FUNDING_EXECUTIVE_RECOMMENDATIONS.DECLINE;
    reasons.push(
      unknowns.length > 0
        ? "Maddy has not completed enough evidence review for a defensible decision."
        : "The available evidence does not show a defensible mission or roadmap connection."
    );
  }

  const confidence = Math.max(
    0.2,
    Math.min(
      0.98,
      0.42 +
        strategy.score / 250 +
        readiness / 600 +
        (geography.confirmed ? 0.08 : 0) +
        (participation.confirmed ? 0.08 : 0) +
        (opportunity.investigation?.status === "complete" ? 0.12 : 0) -
        unknowns.length * 0.04
    )
  );

  const nextAction =
    requiredActions[0] ||
    (
      recommendation === FUNDING_EXECUTIVE_RECOMMENDATIONS.PURSUE
        ? "Open the application workspace and begin the authorized pursuit workflow."
        : recommendation === FUNDING_EXECUTIVE_RECOMMENDATIONS.PARTNER
          ? "Identify the strongest lead and funded-partner structure before authorizing pursuit."
          : recommendation === FUNDING_EXECUTIVE_RECOMMENDATIONS.PREPARE
            ? "Resolve the listed readiness and evidence gaps before the current or next viable cycle."
            : recommendation === FUNDING_EXECUTIVE_RECOMMENDATIONS.MONITOR
              ? "Track the opportunity and schedule the next evidence review."
              : recommendation === FUNDING_EXECUTIVE_RECOMMENDATIONS.DECLINE
                ? "Remove it from the active executive desk while preserving the reason."
                : "Complete the missing investigation steps and return a firm recommendation."
    );

  const whySeeingThis =
    recommendation === FUNDING_EXECUTIVE_RECOMMENDATIONS.DECLINE
      ? "Maddy completed enough review to keep this discovery off the active executive desk."
      : strategy.label === "strong"
        ? "Maddy found a strong connection to CCSP's current mission or approved five-year roadmap."
        : strategy.label === "moderate"
          ? "Maddy found a defensible strategic connection that requires executive judgment."
          : "Maddy is preserving this record only because important evidence remains unresolved.";

  const executiveBrief = {
    whySeeingThis,
    recommendation,
    reason: reasons[0],
    nextAction,
    unknowns,
    confidence,
    geography,
    participation,
    missionFit: {
      label: strategy.label,
      score: strategy.score,
      matches: strategy.matches
    },
    roadmap,
    costShare,
    moneyFlow,
    funding: {
      floor: opportunity.awardFloor || null,
      ceiling: opportunity.awardCeiling || null,
      estimatedTotal: opportunity.estimatedFunding || null,
      expectedAwards: opportunity.expectedAwards || null
    },
    timing: {
      lifecycle,
      postedDate: opportunity.postedDate || opportunity.openDate || null,
      deadline: opportunity.deadline || null,
      timeSensitive:
        lifecycle === "open" && Boolean(opportunity.deadline)
    }
  };

  return {
    schema: "meos.executive-funding-investigation-report.v1",
    version: FUNDING_QUALIFICATION_VERSION,
    generatedAt: continuousOperationsNow(),
    recommendation,
    lifecycle,
    geography,
    participation,
    missionFit: executiveBrief.missionFit,
    roadmap,
    costShare,
    moneyFlow,
    unknowns,
    executiveBrief,
    currentOperationalReadiness: readiness,
    purposeAndStrategyAlignment: strategy.score,
    strategyMatches: strategy.matches,
    reasons,
    requiredActions,
    confidence,
    evidenceBasis: {
      sourceId: opportunity.sourceId || null,
      provider: opportunity.provider || null,
      externalId: opportunity.externalId || null,
      url: opportunity.url || null,
      trustScore: opportunity.trustScore ?? null,
      fullNoticeRetrieved:
        opportunity.investigation?.status === "complete"
    },
    engine: {
      mode: "server-autonomous",
      compatibilityTarget: "MEOS Executive Opportunity Office v2.0",
      buildPortfolioContext: "server-investigation-v1"
    }
  };
}

function qualifyFundingOpportunities(opportunities) {
  const summary = {
    total: 0,
    pursue: 0,
    prepare: 0,
    monitor: 0,
    partner: 0,
    humanReview: 0,
    decline: 0,
    executiveQualified: 0,
    executiveReviewRequired: 0,
    executiveRejected: 0
  };

  const qualified = opportunities.map(opportunity => {
    const executiveQualification = qualifyFundingOpportunity(opportunity);
    const lifecycleState = deriveFundingQualificationStatus(
      executiveQualification.recommendation
    );

    summary.total += 1;
    const key =
      executiveQualification.recommendation === "human-review"
        ? "humanReview"
        : executiveQualification.recommendation;
    if (Object.hasOwn(summary, key)) summary[key] += 1;

    if (lifecycleState.qualificationStatus === FUNDING_QUALIFICATION_STATUSES.QUALIFIED) {
      summary.executiveQualified += 1;
    } else if (lifecycleState.qualificationStatus === FUNDING_QUALIFICATION_STATUSES.REJECTED) {
      summary.executiveRejected += 1;
    } else {
      summary.executiveReviewRequired += 1;
    }

    return {
      ...opportunity,
      ...lifecycleState,
      executiveQualification,
      executiveRecommendation: executiveQualification.recommendation,
      qualifiedAt: executiveQualification.generatedAt
    };
  });

  return { opportunities: qualified, summary };
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


function grantsGovValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  return value;
}

function normalizeGrantsGovDetail(opportunity, detailPayload) {
  const data = detailPayload?.data || detailPayload || {};
  const synopsis = data.synopsis || {};
  const applicantTypes = Array.isArray(synopsis.applicantTypes)
    ? synopsis.applicantTypes.map(item => item?.description).filter(Boolean)
    : [];
  const instruments = Array.isArray(synopsis.fundingInstruments)
    ? synopsis.fundingInstruments.map(item => item?.description).filter(Boolean)
    : [];
  const activities = Array.isArray(synopsis.fundingActivityCategories)
    ? synopsis.fundingActivityCategories.map(item => item?.description).filter(Boolean)
    : [];
  const alns = Array.isArray(data.alns)
    ? data.alns.map(item => ({
        number: item?.alnNumber || null,
        title: item?.programTitle || null
      }))
    : [];
  const attachments = Array.isArray(data.synopsisAttachmentFolders)
    ? data.synopsisAttachmentFolders.flatMap(folder =>
        Array.isArray(folder?.synopsisAttachments)
          ? folder.synopsisAttachments.map(item => ({
              id: item?.id || null,
              name: item?.fileName || null,
              description: item?.fileDescription || null,
              mimeType: item?.mimeType || null,
              size: item?.fileLobSize || null
            }))
          : []
      )
    : [];

  return {
    ...opportunity,
    title:
      grantsGovValue(data.opportunityTitle) ||
      opportunity.title,
    opportunityNumber:
      grantsGovValue(data.opportunityNumber) ||
      opportunity.opportunityNumber,
    agencyName:
      grantsGovValue(synopsis.agencyName) ||
      grantsGovValue(data.agencyDetails?.agencyName) ||
      opportunity.agencyName,
    description:
      grantsGovValue(synopsis.synopsisDesc) ||
      opportunity.description ||
      null,
    additionalEligibilityInformation:
      grantsGovValue(
        synopsis.applicantEligibilityDesc ||
        synopsis.additionalEligibilityDesc ||
        synopsis.eligibilityDesc
      ),
    eligibleApplicants: applicantTypes,
    fundingInstruments: instruments,
    fundingActivityCategories: activities,
    assistanceListings: alns.length > 0 ? alns : opportunity.assistanceListings,
    postedDate:
      grantsGovValue(synopsis.postingDate) ||
      opportunity.openDate ||
      null,
    deadline:
      grantsGovValue(
        synopsis.responseDate ||
        synopsis.responseDateDesc ||
        data.originalDueDateDesc
      ) ||
      opportunity.deadline ||
      null,
    costSharing:
      typeof synopsis.costSharing === "boolean"
        ? synopsis.costSharing
        : opportunity.costSharing,
    awardCeiling:
      grantsGovValue(
        synopsis.awardCeilingFormatted ||
        synopsis.awardCeiling
      ),
    awardFloor:
      grantsGovValue(
        synopsis.awardFloorFormatted ||
        synopsis.awardFloor
      ),
    expectedAwards:
      grantsGovValue(
        synopsis.expectedNumberOfAwards ||
        synopsis.numberOfAwards
      ),
    estimatedFunding:
      grantsGovValue(
        synopsis.estimatedFundingFormatted ||
        synopsis.estimatedFunding
      ),
    agencyContact: {
      name: grantsGovValue(synopsis.agencyContactName),
      email: grantsGovValue(synopsis.agencyContactEmail),
      phone:
        grantsGovValue(synopsis.agencyContactPhone) ||
        grantsGovValue(synopsis.agencyPhone),
      description: grantsGovValue(synopsis.agencyContactDesc)
    },
    attachments,
    relatedOpportunities: Array.isArray(data.relatedOpps)
      ? data.relatedOpps
      : [],
    fullNotice: {
      opportunityCategory:
        data.opportunityCategory?.description || null,
      documentType: data.docType || opportunity.documentType || null,
      originalDueDate: data.originalDueDateDesc || null,
      synopsisVersion: synopsis.version || null,
      attachmentCount: attachments.length,
      packageCount: Array.isArray(data.opportunityPkgs)
        ? data.opportunityPkgs.length
        : 0
    },
    investigation: {
      schema: "meos.funding-investigation.v1",
      status: "complete",
      provider: "Grants.gov fetchOpportunity",
      investigatedAt: continuousOperationsNow(),
      sourceOpportunityId:
        data.id || opportunity.externalId || null,
      evidenceCompleteness: {
        description: Boolean(synopsis.synopsisDesc),
        eligibility: applicantTypes.length > 0,
        geography:
          Boolean(synopsis.synopsisDesc) ||
          Boolean(
            synopsis.applicantEligibilityDesc ||
            synopsis.additionalEligibilityDesc
          ),
        costShare:
          typeof synopsis.costSharing === "boolean",
        awardRange:
          Boolean(synopsis.awardFloor || synopsis.awardCeiling),
        deadline:
          Boolean(
            synopsis.responseDate ||
            synopsis.responseDateDesc ||
            data.originalDueDateDesc
          ),
        attachments: attachments.length > 0
      }
    },
    evidence: {
      ...(opportunity.evidence || {}),
      detailEndpoint:
        "https://api.grants.gov/v1/api/fetchOpportunity",
      detailRetrievedAt: continuousOperationsNow()
    }
  };
}

async function fetchGrantsGovOpportunityDetail(opportunity) {
  const opportunityId = Number(opportunity.externalId);

  if (!Number.isFinite(opportunityId)) {
    return {
      ...opportunity,
      investigation: {
        schema: "meos.funding-investigation.v1",
        status: "incomplete",
        provider: "Grants.gov fetchOpportunity",
        investigatedAt: continuousOperationsNow(),
        error: {
          code: "GRANTS_GOV_OPPORTUNITY_ID_INVALID",
          message: "A numeric Grants.gov opportunity ID is required."
        }
      }
    };
  }

  try {
    const result = await fetchPublicFundingResource(
      "https://api.grants.gov/v1/api/fetchOpportunity",
      {
        method: "POST",
        accept: "application/json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId })
      }
    );
    const payload = JSON.parse(result.body.toString("utf8"));

    if (Number(payload?.errorcode || 0) !== 0 || !payload?.data) {
      throw Object.assign(
        new Error(payload?.msg || "Grants.gov detail response was incomplete."),
        { code: "GRANTS_GOV_DETAIL_INCOMPLETE" }
      );
    }

    return normalizeGrantsGovDetail(opportunity, payload);
  } catch (error) {
    return {
      ...opportunity,
      investigation: {
        schema: "meos.funding-investigation.v1",
        status: "incomplete",
        provider: "Grants.gov fetchOpportunity",
        investigatedAt: continuousOperationsNow(),
        error: {
          code: error?.code || "GRANTS_GOV_DETAIL_FAILED",
          message: error?.message || String(error)
        }
      }
    };
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      () => worker()
    )
  );

  return results;
}

async function investigateFundingOpportunities(opportunities) {
  return mapWithConcurrency(
    opportunities,
    FUNDING_INVESTIGATION_CONCURRENCY,
    async opportunity =>
      opportunity.provider === "Grants.gov"
        ? fetchGrantsGovOpportunityDetail(opportunity)
        : {
            ...opportunity,
            investigation: {
              schema: "meos.funding-investigation.v1",
              status:
                opportunity.description
                  ? "complete"
                  : "incomplete",
              provider:
                opportunity.provider || "public-source",
              investigatedAt: continuousOperationsNow(),
              evidenceCompleteness: {
                description: Boolean(opportunity.description),
                eligibility: Boolean(opportunity.eligibleApplicants),
                geography: Boolean(
                  opportunity.geography ||
                  opportunity.location ||
                  opportunity.description
                ),
                costShare:
                  opportunity.costSharing !== undefined,
                awardRange: Boolean(
                  opportunity.awardFloor ||
                  opportunity.awardCeiling
                ),
                deadline: Boolean(opportunity.deadline)
              }
            }
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
    qualification: {
      version: FUNDING_QUALIFICATION_VERSION,
      lastSummary:
        fundingIntelligenceState.lastQualificationSummary
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

    const investigatedOpportunities =
      await investigateFundingOpportunities(
        allOpportunities
      );

    const qualificationResult =
      qualifyFundingOpportunities(
        investigatedOpportunities
      );

    fundingIntelligenceState.lastQualificationSummary =
      qualificationResult.summary;

    const opportunityWriteResult =
      await upsertFundingOpportunities(
        qualificationResult.opportunities
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
            opportunityWriteResult.duplicates,
          qualification:
            qualificationResult.summary
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
          ? "Review the highest-priority Executive Qualification Reports and route approved work."
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


app.get(
  "/api/funding-intelligence/opportunities",
  async (request, response) => {
    try {
      const requestedLimit = Number(
        request.query.limit || 50
      );
      const limit = Math.max(
        1,
        Math.min(
          Number.isFinite(requestedLimit)
            ? Math.floor(requestedLimit)
            : 50,
          500
        )
      );
      const recommendation = String(
        request.query.recommendation || ""
      )
        .trim()
        .toLowerCase();

      const opportunities = (
        await readExecutiveMemoryCollection(
          FUNDING_OPPORTUNITY_COLLECTION
        )
      )
        .filter(
          record =>
            record?.type === "funding-opportunity"
        )
        .filter(
          record =>
            !recommendation ||
            record.executiveRecommendation ===
              recommendation
        )
        .sort((left, right) =>
          String(
            right.qualifiedAt ||
              right.lastSeenAt ||
              right.updatedAt ||
              ""
          ).localeCompare(
            String(
              left.qualifiedAt ||
                left.lastSeenAt ||
                left.updatedAt ||
                ""
            )
          )
        )
        .slice(0, limit);

      response.status(200).json({
        schema:
          "meos.funding-intelligence.opportunities.v1",
        version: FUNDING_INTELLIGENCE_VERSION,
        qualificationVersion:
          FUNDING_QUALIFICATION_VERSION,
        count: opportunities.length,
        recommendation:
          recommendation || null,
        opportunities
      });
    } catch (error) {
      response.status(500).json({
        error:
          error?.message ||
          "Funding Intelligence opportunities could not be read.",
        code:
          error?.code ||
          "FUNDING_INTELLIGENCE_OPPORTUNITIES_FAILED"
      });
    }
  }
);

app.post(
  "/api/funding-intelligence/reinvestigate",
  express.json({
    limit: "16kb",
    strict: true
  }),
  async (request, response) => {
    try {
      const requestedLimit = Number(
        request.body?.limit ||
        FUNDING_REINVESTIGATION_MAX_RECORDS
      );
      const limit = Math.max(
        1,
        Math.min(
          FUNDING_REINVESTIGATION_MAX_RECORDS,
          Number.isFinite(requestedLimit)
            ? Math.floor(requestedLimit)
            : FUNDING_REINVESTIGATION_MAX_RECORDS
        )
      );

      const stored = (
        await readExecutiveMemoryCollection(
          FUNDING_OPPORTUNITY_COLLECTION
        )
      )
        .filter(
          record =>
            record?.type === "funding-opportunity"
        )
        .sort((left, right) =>
          String(
            right.lastSeenAt ||
            right.updatedAt ||
            ""
          ).localeCompare(
            String(
              left.lastSeenAt ||
              left.updatedAt ||
              ""
            )
          )
        )
        .slice(0, limit);

      const investigated =
        await investigateFundingOpportunities(stored);
      const qualificationResult =
        qualifyFundingOpportunities(investigated);
      const writeResult =
        await upsertFundingOpportunities(
          qualificationResult.opportunities
        );

      fundingIntelligenceState.lastQualificationSummary =
        qualificationResult.summary;

      const resourceDevelopment =
        await executiveResourceDevelopmentOffice
          .rebuildPortfolio({
            trigger: "funding-reinvestigation"
          });

      response.status(200).json({
        schema:
          "meos.funding-intelligence.reinvestigation.v1",
        version: FUNDING_INTELLIGENCE_VERSION,
        qualificationVersion:
          FUNDING_QUALIFICATION_VERSION,
        requested: stored.length,
        completed:
          investigated.filter(
            item =>
              item.investigation?.status === "complete"
          ).length,
        incomplete:
          investigated.filter(
            item =>
              item.investigation?.status !== "complete"
          ).length,
        qualification:
          qualificationResult.summary,
        storage: writeResult,
        resourceDevelopment
      });
    } catch (error) {
      response.status(500).json({
        error:
          error?.message ||
          "Funding opportunities could not be reinvestigated.",
        code:
          error?.code ||
          "FUNDING_REINVESTIGATION_FAILED"
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



/* ========================================================================== */
/* MEOS Executive Resource Development Office v1.0.1 — Inline Server Module   */
/* ========================================================================== */

/**
 * MEOS Executive Resource Development Office v1.0.0
 *
 * Mission:
 * - Do not miss realistic money or resources.
 * - Do not waste executive time on opportunities CCSP cannot pursue.
 *
 * This server-side office sits after broad discovery and investigation.
 * It applies:
 *   1. Fast exclusion gate
 *   2. Full-investigation gate
 *   3. Executive priority gate
 *
 * It preserves unclear-but-potentially-valuable opportunities for research
 * instead of rejecting them without evidence.
 */

const RESOURCE_DEVELOPMENT_VERSION = "1.1.0";
const BUILD_ID = "ERDO112-PURSUIT-AUTHORIZATION-ORDER-20260804-A";
const JOB_ID = "standing-executive-resource-development-office";

const RESOURCE_CHANNELS = Object.freeze([
  "government-grant",
  "foundation-grant",
  "community-foundation",
  "family-foundation",
  "corporate-giving",
  "corporate-sponsorship",
  "major-donor",
  "donor-advised-fund",
  "government-contract",
  "rfp",
  "in-kind",
  "equipment",
  "vehicle",
  "property",
  "strategic-partnership",
  "earned-revenue",
  "other-lawful-resource"
]);

const DECISIONS = Object.freeze([
  "pursue",
  "prepare",
  "partner",
  "monitor",
  "research",
  "reject",
  "won",
  "lost"
]);


const FUNDING_PIPELINE_STAGES = Object.freeze({
  DISCOVERED: "discovered",
  QUALIFIED: "qualified",
  ON_DESK: "on-desk",
  PREPARING: "preparing",
  APPLICATION_INTELLIGENCE: "application-intelligence",
  PACKAGE_ASSEMBLED: "package-assembled",
  PORTAL_MAPPED: "portal-mapped",
  EXECUTIVE_APPROVED: "executive-approved",
  SUBMITTED: "submitted",
  AWARD_PENDING: "award-pending",
  AWARDED: "awarded",
  DECLINED: "declined",
  WITHDRAWN: "withdrawn",
  FUNDS_PARTIALLY_RECEIVED: "funds-partially-received",
  FUNDS_FULLY_RECEIVED: "funds-fully-received",
  ARCHIVED: "archived"
});

const FUNDING_PIPELINE_TRANSITIONS = Object.freeze({
  [FUNDING_PIPELINE_STAGES.DISCOVERED]: Object.freeze([
    FUNDING_PIPELINE_STAGES.QUALIFIED,
    FUNDING_PIPELINE_STAGES.ARCHIVED
  ]),
  [FUNDING_PIPELINE_STAGES.QUALIFIED]: Object.freeze([
    FUNDING_PIPELINE_STAGES.ON_DESK,
    FUNDING_PIPELINE_STAGES.ARCHIVED
  ]),
  [FUNDING_PIPELINE_STAGES.ON_DESK]: Object.freeze([
    FUNDING_PIPELINE_STAGES.PREPARING,
    FUNDING_PIPELINE_STAGES.ARCHIVED
  ]),
  [FUNDING_PIPELINE_STAGES.PREPARING]: Object.freeze([
    FUNDING_PIPELINE_STAGES.APPLICATION_INTELLIGENCE,
    FUNDING_PIPELINE_STAGES.WITHDRAWN,
    FUNDING_PIPELINE_STAGES.ARCHIVED
  ]),
  [FUNDING_PIPELINE_STAGES.APPLICATION_INTELLIGENCE]: Object.freeze([
    FUNDING_PIPELINE_STAGES.PACKAGE_ASSEMBLED,
    FUNDING_PIPELINE_STAGES.WITHDRAWN
  ]),
  [FUNDING_PIPELINE_STAGES.PACKAGE_ASSEMBLED]: Object.freeze([
    FUNDING_PIPELINE_STAGES.PORTAL_MAPPED,
    FUNDING_PIPELINE_STAGES.WITHDRAWN
  ]),
  [FUNDING_PIPELINE_STAGES.PORTAL_MAPPED]: Object.freeze([
    FUNDING_PIPELINE_STAGES.EXECUTIVE_APPROVED,
    FUNDING_PIPELINE_STAGES.WITHDRAWN
  ]),
  [FUNDING_PIPELINE_STAGES.EXECUTIVE_APPROVED]: Object.freeze([
    FUNDING_PIPELINE_STAGES.SUBMITTED,
    FUNDING_PIPELINE_STAGES.WITHDRAWN
  ]),
  [FUNDING_PIPELINE_STAGES.SUBMITTED]: Object.freeze([
    FUNDING_PIPELINE_STAGES.AWARD_PENDING,
    FUNDING_PIPELINE_STAGES.WITHDRAWN
  ]),
  [FUNDING_PIPELINE_STAGES.AWARD_PENDING]: Object.freeze([
    FUNDING_PIPELINE_STAGES.AWARDED,
    FUNDING_PIPELINE_STAGES.DECLINED,
    FUNDING_PIPELINE_STAGES.WITHDRAWN
  ]),
  [FUNDING_PIPELINE_STAGES.AWARDED]: Object.freeze([
    FUNDING_PIPELINE_STAGES.FUNDS_PARTIALLY_RECEIVED,
    FUNDING_PIPELINE_STAGES.FUNDS_FULLY_RECEIVED,
    FUNDING_PIPELINE_STAGES.ARCHIVED
  ]),
  [FUNDING_PIPELINE_STAGES.FUNDS_PARTIALLY_RECEIVED]: Object.freeze([
    FUNDING_PIPELINE_STAGES.FUNDS_FULLY_RECEIVED,
    FUNDING_PIPELINE_STAGES.ARCHIVED
  ]),
  [FUNDING_PIPELINE_STAGES.FUNDS_FULLY_RECEIVED]: Object.freeze([
    FUNDING_PIPELINE_STAGES.ARCHIVED
  ]),
  [FUNDING_PIPELINE_STAGES.DECLINED]: Object.freeze([
    FUNDING_PIPELINE_STAGES.ARCHIVED
  ]),
  [FUNDING_PIPELINE_STAGES.WITHDRAWN]: Object.freeze([
    FUNDING_PIPELINE_STAGES.ARCHIVED
  ]),
  [FUNDING_PIPELINE_STAGES.ARCHIVED]: Object.freeze([])
});

const FUNDING_PIPELINE_ARTIFACT_TYPES = Object.freeze({
  APPLICATION_INTELLIGENCE: "application-intelligence",
  EXECUTIVE_REVIEW_PACKAGE: "executive-review-package",
  EXECUTIVE_APPLICATION_PACKAGE: "executive-application-package",
  SUBMISSION_PORTAL_INTELLIGENCE: "submission-portal-intelligence",
  PORTAL_SUBMISSION_PACKAGE: "portal-submission-package",
  SUBMISSION_EXECUTION: "submission-execution",
  AWARD_TRACKING: "award-tracking",
  FUNDING_RECEIPT: "funding-receipt"
});

function clamp(value, minimum = 0, maximum = 100) {
  return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function opportunityText(opportunity = {}) {
  return normalizeText(
    [
      opportunity.title,
      opportunity.description,
      opportunity.category,
      opportunity.provider,
      opportunity.agencyName,
      opportunity.eligibleApplicants,
      opportunity.additionalEligibilityInformation,
      opportunity.fullNotice,
      opportunity.executiveQualification,
      opportunity.investigation
    ]
      .flat(Infinity)
      .filter(Boolean)
      .map(value =>
        typeof value === "object" ? JSON.stringify(value) : String(value)
      )
      .join(" ")
  );
}

function inferResourceChannel(opportunity = {}) {
  const category = normalizeText(opportunity.category);
  const authority = normalizeText(opportunity.authorityType);
  const provider = normalizeText(opportunity.provider);
  const sourceType = normalizeText(
    opportunity.sourceType ||
    opportunity.investigation?.provider
  );
  const capabilities = normalizeText(
    Array.isArray(opportunity.capabilities)
      ? opportunity.capabilities.join(" ")
      : opportunity.capabilities
  );
  const title = normalizeText(opportunity.title);
  const text = opportunityText(opportunity);

  /*
   * Authoritative source and category fields take priority. A grant that
   * mentions partnerships remains a grant; a notice that mentions resources
   * does not become an in-kind opportunity.
   */
  const governmentAuthority =
    /federal government|state government|county government|city government/.test(authority);

  const grantAuthority =
    governmentAuthority ||
    provider === "grants gov" ||
    sourceType.includes("grants gov") ||
    category.includes("government grant");

  if (
    grantAuthority &&
    (
      category.includes("grant") ||
      /grant|cooperative agreement|funding opportunity/.test(
        `${title} ${category}`
      )
    )
  ) {
    return "government-grant";
  }

  if (
    category.includes("contract") ||
    category.includes("procurement") ||
    sourceType.includes("procurement") ||
    provider === "sam gov contract opportunities"
  ) {
    return "government-contract";
  }

  if (
    category === "rfp" ||
    category.includes("request for proposal") ||
    sourceType.includes("rfp")
  ) {
    return "rfp";
  }

  if (
    category.includes("community foundation") ||
    sourceType.includes("community foundation")
  ) {
    return "community-foundation";
  }

  if (
    category.includes("family foundation") ||
    sourceType.includes("family foundation")
  ) {
    return "family-foundation";
  }

  if (
    category.includes("foundation grant") ||
    category.includes("private foundation") ||
    (
      authority.includes("foundation") &&
      /grant|funding opportunity/.test(`${title} ${category}`)
    )
  ) {
    return "foundation-grant";
  }

  if (
    category.includes("corporate giving") ||
    category.includes("corporate grant") ||
    sourceType.includes("corporate giving") ||
    authority.includes("corporate foundation")
  ) {
    return "corporate-giving";
  }

  if (
    category.includes("sponsorship") ||
    sourceType.includes("sponsorship")
  ) {
    return "corporate-sponsorship";
  }

  if (
    category.includes("donor advised") ||
    sourceType.includes("donor advised")
  ) {
    return "donor-advised-fund";
  }

  if (
    category.includes("major donor") ||
    category.includes("individual donor")
  ) {
    return "major-donor";
  }

  if (
    category.includes("vehicle") ||
    capabilities.includes("vehicle donation") ||
    /vehicle donation|donated vehicle|fleet donation/.test(title)
  ) {
    return "vehicle";
  }

  if (
    category.includes("equipment") ||
    capabilities.includes("equipment donation") ||
    /equipment donation|donated equipment/.test(title)
  ) {
    return "equipment";
  }

  if (
    category.includes("property") ||
    capabilities.includes("property donation") ||
    /property donation|land donation|building donation/.test(title)
  ) {
    return "property";
  }

  if (
    category.includes("in kind") ||
    sourceType.includes("in kind") ||
    capabilities.includes("in kind")
  ) {
    return "in-kind";
  }

  if (
    category.includes("earned revenue") ||
    category.includes("fee for service") ||
    sourceType.includes("earned revenue")
  ) {
    return "earned-revenue";
  }

  if (
    category.includes("partnership") ||
    sourceType.includes("partnership") ||
    capabilities.includes("strategic partnership")
  ) {
    return "strategic-partnership";
  }

  if (
    /grant|cooperative agreement|funding opportunity/.test(
      `${title} ${category}`
    )
  ) {
    return grantAuthority ? "government-grant" : "foundation-grant";
  }

  return "other-lawful-resource";
}


const CCSP_DIRECT_MISSION_SIGNALS = Object.freeze([
  {
    id: "mobile-hygiene",
    terms: [
      "mobile hygiene", "mobile shower", "shower trailer", "hygiene services",
      "sanitation services", "personal hygiene", "laundry services"
    ],
    weight: 40
  },
  {
    id: "homelessness-and-street-outreach",
    terms: [
      "homelessness", "homeless", "unsheltered", "street outreach",
      "encampment outreach", "housing instability", "housing insecurity"
    ],
    weight: 36
  },
  {
    id: "substance-use-and-recovery",
    terms: [
      "substance use disorder", "substance abuse", "addiction treatment",
      "recovery services", "recovery housing", "sober living",
      "medication assisted treatment", "opioid response", "overdose prevention"
    ],
    weight: 40
  },
  {
    id: "stabilization-and-housing",
    terms: [
      "supportive housing", "transitional housing", "permanent housing",
      "housing navigation", "community stabilization", "rapid rehousing",
      "continuum of care"
    ],
    weight: 34
  },
  {
    id: "employment-and-self-sufficiency",
    terms: [
      "workforce development", "job training", "employment services",
      "career pathways", "apprenticeship", "economic self sufficiency",
      "economic mobility"
    ],
    weight: 26
  },
  {
    id: "watershed-and-environmental-health",
    terms: [
      "watershed protection", "water quality", "river restoration",
      "san lorenzo river", "monterey bay", "pollution prevention",
      "environmental health"
    ],
    weight: 24
  }
]);

const CCSP_STRATEGIC_BUILD_SIGNALS = Object.freeze([
  {
    id: "operations-and-capacity",
    terms: [
      "general operating support", "operating support", "capacity building",
      "nonprofit capacity", "organizational development", "technology grant"
    ],
    weight: 24
  },
  {
    id: "capital-and-facilities",
    terms: [
      "capital grant", "capital project", "facility acquisition",
      "facility renovation", "building acquisition", "land acquisition",
      "property donation"
    ],
    weight: 30
  },
  {
    id: "vehicles-and-equipment",
    terms: [
      "vehicle donation", "fleet donation", "equipment donation",
      "mobile unit", "trailer donation", "capital equipment"
    ],
    weight: 30
  },
  {
    id: "treatment-and-rehabilitation-buildout",
    terms: [
      "residential treatment facility", "rehabilitation center",
      "recovery campus", "behavioral health facility",
      "substance use treatment facility"
    ],
    weight: 34
  },
  {
    id: "partnership-and-service-contract",
    terms: [
      "service contract", "government contract", "subrecipient",
      "implementation partner", "community based organization partner"
    ],
    weight: 22
  }
]);

const CCSP_OUT_OF_SCOPE_SECTORS = Object.freeze([
  {
    id: "natural-resource-management",
    terms: [
      "forest management", "woodlands resource management",
      "fuels management", "wildland fire science", "rangeland resource",
      "invasive and noxious plant", "plant conservation",
      "abandoned mine lands", "oil and gas recovery",
      "produced water management", "desalination research",
      "agricultural conservation", "fish and wildlife restoration"
    ]
  },
  {
    id: "academic-and-scientific-research",
    terms: [
      "clinical trial required", "clinical trials not allowed",
      "research center", "research infrastructure", "medical student education",
      "postdoctoral training", "scientific research", "laboratory research",
      "university research"
    ]
  },
  {
    id: "law-enforcement-only",
    terms: [
      "law enforcement agency only", "police department applicants",
      "prosecutor offices only", "correctional agency applicants"
    ]
  },
  {
    id: "utility-and-municipal-infrastructure",
    terms: [
      "municipal wastewater system", "public water system",
      "rural utility", "water treatment plant", "electric grid"
    ]
  }
]);

const CCSP_EXCLUSIVE_POPULATION_RESTRICTIONS = Object.freeze([
  {
    id: "youth-only",
    terms: [
      "youth only", "children only", "adolescents only",
      "runaway and homeless youth", "youth homelessness",
      "minor children", "ages 12 to 17", "ages 14 to 24",
      "young adults only"
    ],
    exceptionTerms: [
      "all ages", "families and adults", "general population"
    ]
  },
  {
    id: "veterans-only",
    terms: [
      "veterans only", "eligible veterans", "veteran households only"
    ],
    exceptionTerms: [
      "general homeless population", "all eligible populations"
    ]
  },
  {
    id: "tribal-only",
    terms: [
      "tribal entities only", "federally recognized tribes only",
      "tribal colleges and universities"
    ],
    exceptionTerms: [
      "community based organizations", "nonprofit partners"
    ]
  }
]);

function evaluateMissionScope(opportunity = {}) {
  const text = opportunityText(opportunity);
  const title = normalizeText(opportunity.title);
  const directMatches = [];
  const strategicMatches = [];
  const exclusionMatches = [];
  const populationRestrictions = [];

  for (const signal of CCSP_DIRECT_MISSION_SIGNALS) {
    const matchedTerms = signal.terms.filter(term =>
      text.includes(normalizeText(term))
    );
    if (matchedTerms.length > 0) {
      directMatches.push({
        id: signal.id,
        matchedTerms,
        score: Math.min(
          signal.weight,
          12 + matchedTerms.length * 8
        )
      });
    }
  }

  for (const signal of CCSP_STRATEGIC_BUILD_SIGNALS) {
    const matchedTerms = signal.terms.filter(term =>
      text.includes(normalizeText(term))
    );
    if (matchedTerms.length > 0) {
      strategicMatches.push({
        id: signal.id,
        matchedTerms,
        score: Math.min(
          signal.weight,
          10 + matchedTerms.length * 7
        )
      });
    }
  }

  for (const sector of CCSP_OUT_OF_SCOPE_SECTORS) {
    const matchedTerms = sector.terms.filter(term =>
      text.includes(normalizeText(term))
    );
    if (matchedTerms.length > 0) {
      exclusionMatches.push({
        id: sector.id,
        matchedTerms
      });
    }
  }

  for (const restriction of CCSP_EXCLUSIVE_POPULATION_RESTRICTIONS) {
    const restrictionMatch = restriction.terms.find(term =>
      text.includes(normalizeText(term))
    );
    const exceptionMatch = restriction.exceptionTerms.find(term =>
      text.includes(normalizeText(term))
    );

    if (restrictionMatch && !exceptionMatch) {
      populationRestrictions.push({
        id: restriction.id,
        evidence: restrictionMatch
      });
    }
  }

  const directScore = Math.min(
    100,
    directMatches.reduce((total, item) => total + item.score, 0)
  );
  const strategicScore = Math.min(
    100,
    strategicMatches.reduce((total, item) => total + item.score, 0)
  );

  const explicitResourceChannel = [
    "community-foundation", "family-foundation", "corporate-giving",
    "corporate-sponsorship", "major-donor", "donor-advised-fund",
    "in-kind", "equipment", "vehicle", "property", "earned-revenue"
  ].includes(inferResourceChannel(opportunity));

  const hasMissionPath =
    directScore >= 24 ||
    strategicScore >= 24 ||
    (
      explicitResourceChannel &&
      (
        directScore > 0 ||
        strategicScore > 0 ||
        /general operating support|unrestricted support|nonprofit support/.test(text)
      )
    );

  const hardSectorExclusion =
    exclusionMatches.length > 0 &&
    directScore < 30 &&
    strategicScore < 30;

  const hardPopulationExclusion =
    populationRestrictions.length > 0 &&
    directScore < 36 &&
    strategicScore < 30;

  const passed =
    hasMissionPath &&
    !hardSectorExclusion &&
    !hardPopulationExclusion;

  const reasons = [];

  if (!hasMissionPath) {
    reasons.push(
      "No evidence-supported connection to CCSP's approved mission, operations, or five-year strategic buildout."
    );
  }
  if (hardSectorExclusion) {
    reasons.push(
      "The opportunity is primarily for a sector outside CCSP's approved work."
    );
  }
  if (hardPopulationExclusion) {
    reasons.push(
      "The opportunity is restricted to a beneficiary population or institution type that CCSP is not organized to serve exclusively."
    );
  }

  return {
    passed,
    status: passed ? "in-scope" : "out-of-scope",
    directScore,
    strategicScore,
    directMatches,
    strategicMatches,
    exclusionMatches,
    populationRestrictions,
    reasons,
    explanation:
      passed
        ? "The opportunity has a documented path to CCSP's mission, operations, or approved five-year buildout."
        : reasons[0]
  };
}

function fastExclusionGate(opportunity = {}) {
  const q = opportunity.executiveQualification || {};
  const geography = q.geography || {};
  const participation = q.participation || {};
  const lifecycle = q.lifecycle || opportunity.investigation?.lifecycle;
  const missionScope = evaluateMissionScope(opportunity);
  const reasons = [];

  if (
    geography.level === "international" ||
    geography.eligibleOperatingFootprint === false
  ) {
    reasons.push(
      "Required work or beneficiaries are outside CCSP's approved operating footprint."
    );
  }

  if (
    participation.label === "Not Eligible" ||
    (
      participation.canLead === false &&
      participation.canPartner === false
    )
  ) {
    reasons.push(
      "Available evidence shows no lawful applicant or funded-partner path for CCSP."
    );
  }

  if (
    lifecycle === "closed" &&
    !/forecast|recurring|annual|renewal|next cycle/.test(
      opportunityText(opportunity)
    )
  ) {
    reasons.push(
      "The opportunity is closed and no recurrence value is established."
    );
  }

  if (!missionScope.passed) {
    reasons.push(
      missionScope.explanation ||
      "The opportunity is outside CCSP's approved mission and strategic roadmap."
    );
  }

  return {
    passed: reasons.length === 0,
    decision: reasons.length === 0 ? "continue" : "reject",
    reasons,
    confidence: reasons.length === 0 ? 0.8 : 0.98,
    missionScope
  };
}

function fullInvestigationGate(opportunity = {}) {
  const q = opportunity.executiveQualification || {};
  const unknowns = Array.isArray(q.unknowns) ? q.unknowns : [];
  const investigation = opportunity.investigation || {};
  const hasCoreEvidence = Boolean(
    q.geography?.label &&
    q.participation?.label &&
    q.missionFit?.label &&
    q.executiveBrief?.reason
  );

  if (!hasCoreEvidence || investigation.status !== "complete") {
    return {
      status: "research",
      readyForPriority: false,
      reasons: [
        "The opportunity has not yet produced a complete, defensible executive investigation."
      ],
      unknowns
    };
  }

  if (
    q.participation?.label === "Needs Research" ||
    q.geography?.level === "unknown" ||
    unknowns.length >= 4
  ) {
    return {
      status: "research",
      readyForPriority: false,
      reasons: [
        "The opportunity may be valuable, but material eligibility, geography, money-flow, or notice evidence remains unresolved."
      ],
      unknowns
    };
  }

  return {
    status: "complete",
    readyForPriority: true,
    reasons: [],
    unknowns
  };
}

function parseMoney(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const numeric = Number(
    String(value || "")
      .replace(/[^0-9.-]+/g, "")
  );
  return Number.isFinite(numeric) ? numeric : null;
}

function deadlineUrgency(opportunity = {}) {
  const deadline = Date.parse(
    opportunity.deadline ||
    opportunity.executiveQualification?.executiveBrief?.timing?.deadline ||
    ""
  );

  if (!Number.isFinite(deadline)) {
    return { score: 35, daysRemaining: null, label: "deadline-unverified" };
  }

  const daysRemaining = Math.ceil((deadline - Date.now()) / 86_400_000);

  if (daysRemaining < 0) return { score: 0, daysRemaining, label: "closed" };
  if (daysRemaining <= 7) return { score: 100, daysRemaining, label: "immediate" };
  if (daysRemaining <= 21) return { score: 90, daysRemaining, label: "urgent" };
  if (daysRemaining <= 45) return { score: 75, daysRemaining, label: "active" };
  if (daysRemaining <= 90) return { score: 55, daysRemaining, label: "planned" };
  return { score: 35, daysRemaining, label: "future" };
}

function resourceValueScore(opportunity = {}) {
  const q = opportunity.executiveQualification || {};
  const floor = parseMoney(
    opportunity.awardFloor ||
    q.executiveBrief?.funding?.floor
  );
  const ceiling = parseMoney(
    opportunity.awardCeiling ||
    q.executiveBrief?.funding?.ceiling
  );
  const amount = ceiling || floor;

  if (!amount) {
    const channel = inferResourceChannel(opportunity);
    return {
      score:
        ["in-kind", "equipment", "vehicle", "property"].includes(channel)
          ? 60
          : 35,
      estimatedValue: null,
      basis: "value-unverified"
    };
  }

  let score = 25;
  if (amount >= 10_000) score = 45;
  if (amount >= 50_000) score = 65;
  if (amount >= 250_000) score = 80;
  if (amount >= 1_000_000) score = 90;
  if (amount >= 5_000_000) score = 95;

  return {
    score,
    estimatedValue: amount,
    basis: ceiling ? "award-ceiling" : "award-floor"
  };
}

function geographyPriorityScore(opportunity = {}) {
  const geography =
    opportunity.executiveQualification?.geography || {};

  switch (geography.level) {
    case "local":
      return 100;
    case "regional":
      return 90;
    case "california":
      return 80;
    case "usa":
      return 65;
    case "unknown":
      return 35;
    default:
      return 0;
  }
}

function fundabilityScore(opportunity = {}) {
  const q = opportunity.executiveQualification || {};
  const participation = q.participation || {};
  const moneyFlow = q.moneyFlow || {};
  const confidence = clamp((q.confidence || 0) * 100);
  const missionFit = clamp(q.missionFit?.score || q.purposeAndStrategyAlignment);
  const readiness = clamp(q.currentOperationalReadiness);
  const flowScore =
    moneyFlow.directAwardPossible === true ? 100 :
    moneyFlow.partnerFundingPossible === true ? 80 :
    participation.canPartner === true ? 65 :
    35;

  return clamp(
    confidence * 0.25 +
    missionFit * 0.25 +
    readiness * 0.2 +
    flowScore * 0.3
  );
}

function effortScore(opportunity = {}) {
  const q = opportunity.executiveQualification || {};
  const text = opportunityText(opportunity);
  let score = 55;

  if (/letter of intent|short application|rolling|simple application/.test(text)) {
    score += 20;
  }
  if (/cost share|required match|consortium|mandatory partners/.test(text)) {
    score -= 20;
  }
  if (/clinical trial|research institution|licensed provider|accreditation/.test(text)) {
    score -= 25;
  }
  if ((q.unknowns || []).length >= 4) {
    score -= 15;
  }

  return clamp(score);
}

function strategicValueScore(opportunity = {}) {
  const q = opportunity.executiveQualification || {};
  const mission = clamp(q.missionFit?.score || q.purposeAndStrategyAlignment);
  const roadmap = Array.isArray(q.roadmap) ? q.roadmap : [];
  const roadmapScore = clamp(
    roadmap.reduce(
      (total, item) => total + Number(item.score || 0),
      0
    )
  );
  return clamp(mission * 0.65 + roadmapScore * 0.35);
}

function calculateExecutivePriority(
  opportunity = {},
  fastGate = { passed: true },
  investigationGate = { readyForPriority: true }
) {
  if (!fastGate.passed) {
    return {
      score: 0,
      priority: "excluded",
      components: {
        fundability: 0,
        geography: 0,
        urgency: 0,
        resourceValue: 0,
        effort: 0,
        strategicValue: 0
      },
      deadline: deadlineUrgency(opportunity),
      estimatedResourceValue: null,
      valueBasis: "excluded-before-scoring"
    };
  }

  if (!investigationGate.readyForPriority) {
    return {
      score: 0,
      priority: "research",
      components: {
        fundability: 0,
        geography: geographyPriorityScore(opportunity),
        urgency: 0,
        resourceValue: 0,
        effort: 0,
        strategicValue: 0
      },
      deadline: deadlineUrgency(opportunity),
      estimatedResourceValue: null,
      valueBasis: "research-required-before-scoring"
    };
  }

  const urgency = deadlineUrgency(opportunity);
  const resourceValue = resourceValueScore(opportunity);
  const geography = geographyPriorityScore(opportunity);
  const fundability = fundabilityScore(opportunity);
  const effort = effortScore(opportunity);
  const strategicValue = strategicValueScore(opportunity);
  const missionScope = fastGate.missionScope || evaluateMissionScope(opportunity);
  const missionScopeScore = clamp(
    Math.max(
      missionScope.directScore || 0,
      missionScope.strategicScore || 0
    )
  );

  const score = clamp(
    fundability * 0.27 +
    geography * 0.16 +
    urgency.score * 0.11 +
    resourceValue.score * 0.11 +
    effort * 0.05 +
    strategicValue * 0.10 +
    missionScopeScore * 0.20
  );

  const priority =
    score >= 80 ? "critical" :
    score >= 68 ? "high" :
    score >= 52 ? "medium" :
    score >= 38 ? "low" :
    "archive";

  return {
    score: Math.round(score * 10) / 10,
    priority,
    components: {
      fundability: Math.round(fundability * 10) / 10,
      geography,
      urgency: urgency.score,
      resourceValue: resourceValue.score,
      effort,
      strategicValue: Math.round(strategicValue * 10) / 10,
      missionScope: Math.round(missionScopeScore * 10) / 10
    },
    deadline: urgency,
    estimatedResourceValue: resourceValue.estimatedValue,
    valueBasis: resourceValue.basis
  };
}

function deriveDeskDecision(opportunity, fastGate, investigationGate, priority) {
  const existing =
    opportunity.resourceDevelopment?.executiveDecision ||
    opportunity.executiveRecommendation;

  if (!fastGate.passed) return "reject";
  if (!investigationGate.readyForPriority) return "research";

  if (existing === "partner") return "partner";
  if (existing === "monitor") return "monitor";
  if (existing === "prepare") return "prepare";
  if (existing === "decline") return "reject";

  if (priority.score >= 72) return "pursue";
  if (priority.score >= 58) return "prepare";
  if (priority.score >= 42) return "monitor";
  return "reject";
}


function normalizeDeadlineValue(opportunity = {}) {
  const raw =
    opportunity.deadline ||
    opportunity.executiveQualification?.executiveBrief?.timing?.deadline ||
    null;

  if (!raw) {
    return {
      raw: null,
      date: null,
      daysRemaining: null,
      label: "Deadline not verified",
      urgency: "unknown"
    };
  }

  const timestamp = Date.parse(raw);

  if (!Number.isFinite(timestamp)) {
    return {
      raw,
      date: null,
      daysRemaining: null,
      label: String(raw),
      urgency: "unknown"
    };
  }

  const daysRemaining = Math.ceil(
    (timestamp - Date.now()) / 86_400_000
  );

  return {
    raw,
    date: new Date(timestamp).toISOString(),
    daysRemaining,
    label:
      daysRemaining < 0
        ? `Closed ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ago`
        : daysRemaining === 0
          ? "Closes today"
          : daysRemaining === 1
            ? "Closes tomorrow"
            : `Closes in ${daysRemaining} days`,
    urgency:
      daysRemaining < 0
        ? "closed"
        : daysRemaining <= 3
          ? "immediate"
          : daysRemaining <= 7
            ? "urgent"
            : daysRemaining <= 21
              ? "active"
              : daysRemaining <= 90
                ? "planned"
                : "future"
  };
}

function determineResourceLabel(opportunity = {}, channel) {
  const q = opportunity.executiveQualification || {};
  const funding = q.executiveBrief?.funding || {};
  const amount =
    funding.ceiling ||
    funding.floor ||
    opportunity.awardCeiling ||
    opportunity.awardFloor ||
    null;

  if (amount) {
    return `${amount} ${channel.replace(/-/g, " ")}`;
  }

  const labels = {
    "government-grant": "Government grant",
    "foundation-grant": "Foundation grant",
    "community-foundation": "Community foundation funding",
    "family-foundation": "Family foundation funding",
    "corporate-giving": "Corporate giving",
    "corporate-sponsorship": "Corporate sponsorship",
    "major-donor": "Major donor opportunity",
    "donor-advised-fund": "Donor-advised fund opportunity",
    "government-contract": "Government contract",
    "rfp": "Request for proposal",
    "in-kind": "In-kind resource",
    "equipment": "Equipment",
    "vehicle": "Vehicle",
    "property": "Property or facility",
    "strategic-partnership": "Strategic partnership",
    "earned-revenue": "Earned revenue opportunity",
    "other-lawful-resource": "Resource opportunity"
  };

  return labels[channel] || "Resource opportunity";
}

function determineStrategicPhase(opportunity = {}) {
  const missionScope =
    opportunity.resourceDevelopment?.missionScope ||
    opportunity.executiveQualification?.missionScope ||
    evaluateMissionScope(opportunity);

  const ids = [
    ...(missionScope.directMatches || []).map(item => item.id),
    ...(missionScope.strategicMatches || []).map(item => item.id)
  ];

  if (
    ids.includes("mobile-hygiene") ||
    ids.includes("vehicles-and-equipment") ||
    ids.includes("operations-and-capacity")
  ) {
    return {
      id: "phase-1",
      label: "Current / Phase 1",
      reason: "Supports immediate launch, operations, mobile services, or foundational capacity."
    };
  }

  if (
    ids.includes("substance-use-and-recovery") ||
    ids.includes("stabilization-and-housing")
  ) {
    return {
      id: "phase-2-3",
      label: "Phase 2–3",
      reason: "Supports stabilization, recovery, housing, or treatment expansion."
    };
  }

  if (
    ids.includes("capital-and-facilities") ||
    ids.includes("treatment-and-rehabilitation-buildout")
  ) {
    return {
      id: "phase-3-5",
      label: "Future Buildout",
      reason: "Supports facilities, treatment, rehabilitation, property, or long-term organizational growth."
    };
  }

  if (ids.includes("employment-and-self-sufficiency")) {
    return {
      id: "phase-4-5",
      label: "Phase 4–5",
      reason: "Supports employment, self-sufficiency, and long-term independence."
    };
  }

  if (ids.includes("watershed-and-environmental-health")) {
    return {
      id: "cross-cutting",
      label: "Cross-Cutting Mission",
      reason: "Supports CCSP's environmental health and watershed responsibilities."
    };
  }

  return {
    id: "organization-wide",
    label: "Organization-Wide",
    reason: "Supports the organization broadly or requires executive classification."
  };
}

function determineExecutiveTiming(opportunity = {}, decision) {
  const deadline = normalizeDeadlineValue(opportunity);

  if (deadline.urgency === "immediate") {
    return {
      bucket: "immediate-action",
      label: "Immediate Action",
      order: 1,
      reason: deadline.label
    };
  }

  if (deadline.urgency === "urgent") {
    return {
      bucket: "urgent",
      label: "Urgent",
      order: 2,
      reason: deadline.label
    };
  }

  if (decision === "pursue") {
    return {
      bucket: "pursue-now",
      label: "Pursue Now",
      order: 3,
      reason:
        deadline.daysRemaining === null
          ? "Actionable now; deadline requires confirmation."
          : deadline.label
    };
  }

  if (decision === "partner") {
    return {
      bucket: "build-partnership",
      label: "Build Partnership",
      order: 4,
      reason: "Requires a lead, funded partner role, or formal collaboration."
    };
  }

  if (decision === "prepare") {
    return {
      bucket: "prepare",
      label: "Prepare",
      order: 5,
      reason:
        deadline.urgency === "future"
          ? deadline.label
          : "Resolve readiness requirements before pursuit."
    };
  }

  if (decision === "monitor") {
    return {
      bucket: "future-cycle",
      label: "Future / Monitor",
      order: 6,
      reason:
        deadline.daysRemaining !== null
          ? deadline.label
          : "Monitor timing, opening status, or next funding cycle."
    };
  }

  if (decision === "research") {
    return {
      bucket: "research",
      label: "Research",
      order: 7,
      reason: "Resolve eligibility, money-flow, timing, or strategic unknowns."
    };
  }

  return {
    bucket: "off-desk",
    label: "Off Desk",
    order: 99,
    reason: "Not recommended for active executive attention."
  };
}

function estimateOpportunityEffort(opportunity = {}) {
  const q = opportunity.executiveQualification || {};
  const text = opportunityText(opportunity);
  let points = 0;
  const drivers = [];

  if (/cost share|required match/.test(text)) {
    points += 2;
    drivers.push("cost share");
  }

  if (/mandatory partners|required partners|consortium/.test(text)) {
    points += 2;
    drivers.push("mandatory partnership");
  }

  if (/clinical trial|research institution|licensed provider/.test(text)) {
    points += 3;
    drivers.push("specialized institutional requirements");
  }

  if ((q.unknowns || []).length >= 4) {
    points += 2;
    drivers.push("multiple unresolved facts");
  }

  const label =
    points >= 5
      ? "High"
      : points >= 2
        ? "Medium"
        : "Low";

  return {
    label,
    score: points,
    drivers
  };
}

function buildExecutiveWorkQueueEntry(opportunity = {}, resourceDevelopment = {}) {
  const deadline = normalizeDeadlineValue(opportunity);
  const phase = determineStrategicPhase({
    ...opportunity,
    resourceDevelopment
  });
  const effort = estimateOpportunityEffort(opportunity);
  const timing = determineExecutiveTiming(
    opportunity,
    resourceDevelopment.executiveDecision
  );

  const q = opportunity.executiveQualification || {};
  const brief = q.executiveBrief || {};
  const probability =
    Number.isFinite(Number(brief.confidence))
      ? Math.round(Number(brief.confidence) * 100)
      : null;

  const ifMissed =
    deadline.daysRemaining !== null &&
    deadline.daysRemaining >= 0
      ? (
          /annual|recurring|next cycle/.test(opportunityText(opportunity))
            ? "Likely wait until the next funding cycle."
            : "This opportunity may be lost when the deadline passes."
        )
      : resourceDevelopment.executiveDecision === "monitor"
        ? "No immediate loss; continue monitoring."
        : "Loss or next-cycle timing has not been verified.";

  return {
    schema: "meos.executive-resource-work-queue-entry.v1",
    priorityRank: null,
    timingBucket: timing,
    opportunity: {
      id: opportunity.id,
      title: opportunity.title,
      channel: resourceDevelopment.channel,
      source: opportunity.provider || opportunity.agencyName || null,
      sourceUrl: opportunity.url || null
    },
    resource: {
      label: determineResourceLabel(
        opportunity,
        resourceDevelopment.channel
      ),
      estimatedValue:
        resourceDevelopment.executivePriority
          ?.estimatedResourceValue ?? null,
      valueBasis:
        resourceDevelopment.executivePriority?.valueBasis || null
    },
    acquisition: {
      canAcquire:
        q.participation?.canLead === true ||
        q.participation?.canPartner === true,
      leadPossible: q.participation?.canLead ?? null,
      partnerPossible: q.participation?.canPartner ?? null,
      directFundingPossible:
        q.moneyFlow?.directAwardPossible ?? null,
      partnerFundingPossible:
        q.moneyFlow?.partnerFundingPossible ?? null,
      explanation:
        q.participation?.explanation ||
        q.moneyFlow?.plainEnglish ||
        "Acquisition path requires confirmation."
    },
    strategicValue: {
      phase,
      whyItMatters:
        brief.reason ||
        resourceDevelopment.reason ||
        "The opportunity advances an approved CCSP objective.",
      missionDirect:
        resourceDevelopment.missionScope?.directScore || 0,
      missionStrategic:
        resourceDevelopment.missionScope?.strategicScore || 0
    },
    action: {
      recommendation:
        resourceDevelopment.executiveDecision,
      label:
        resourceDevelopment.executiveDecision === "pursue"
          ? "Apply Now"
          : resourceDevelopment.executiveDecision === "partner"
            ? "Build Partnership"
            : resourceDevelopment.executiveDecision === "prepare"
              ? "Prepare"
              : resourceDevelopment.executiveDecision === "monitor"
                ? "Calendar / Monitor"
                : resourceDevelopment.executiveDecision === "research"
                  ? "Research"
                  : "Reject",
      nextAction:
        resourceDevelopment.nextAction ||
        brief.nextAction ||
        "Complete the next authorized step."
    },
    timing: {
      ...deadline,
      bucket: timing
    },
    effort,
    probability: {
      percentage: probability,
      label:
        probability === null
          ? "Unverified"
          : probability >= 75
            ? "High"
            : probability >= 50
              ? "Medium"
              : "Low"
    },
    consequenceOfDelay: ifMissed,
    executiveSummary: {
      recommendation:
        resourceDevelopment.executiveDecision,
      whyOnDesk:
        brief.whySeeingThis ||
        "This opportunity has a realistic path to advancing CCSP.",
      reason:
        brief.reason ||
        resourceDevelopment.reason ||
        "Executive reasoning is available in the full investigation.",
      unknowns: Array.isArray(q.unknowns)
        ? q.unknowns
        : []
    }
  };
}

function rankExecutiveWorkQueue(records = []) {
  const ranked = [...records].sort((left, right) => {
    const leftTiming =
      left.resourceDevelopment?.workQueue?.timingBucket?.order ?? 99;
    const rightTiming =
      right.resourceDevelopment?.workQueue?.timingBucket?.order ?? 99;

    if (leftTiming !== rightTiming) {
      return leftTiming - rightTiming;
    }

    const leftScore =
      Number(
        left.resourceDevelopment?.executivePriority?.score || 0
      );
    const rightScore =
      Number(
        right.resourceDevelopment?.executivePriority?.score || 0
      );

    return rightScore - leftScore;
  });

  return ranked.map((record, index) => ({
    ...record,
    resourceDevelopment: {
      ...record.resourceDevelopment,
      workQueue: {
        ...record.resourceDevelopment.workQueue,
        priorityRank: index + 1
      }
    }
  }));
}

function buildResourceDevelopmentRecord(opportunity = {}, now) {
  const channel = inferResourceChannel(opportunity);
  const fastGate = fastExclusionGate(opportunity);
  const investigationGate = fullInvestigationGate(opportunity);
  const priority = calculateExecutivePriority(
    opportunity,
    fastGate,
    investigationGate
  );
  const executiveDecision = deriveDeskDecision(
    opportunity,
    fastGate,
    investigationGate,
    priority
  );

  const deskStatus =
    ["pursue", "prepare", "partner"].includes(executiveDecision)
      ? "active"
      : executiveDecision === "research"
        ? "research"
        : executiveDecision === "monitor"
          ? "monitor"
          : "off-desk";

  const resourceDevelopment = {
      schema: "meos.executive-resource-development.v1",
      version: RESOURCE_DEVELOPMENT_VERSION,
      buildId: BUILD_ID,
      evaluatedAt: now,
      channel,
      fastExclusionGate: fastGate,
      missionScope: fastGate.missionScope,
      fullInvestigationGate: investigationGate,
      executivePriority: priority,
      executiveDecision,
      deskStatus,
      pursuitState:
        opportunity.resourceDevelopment?.pursuitState ||
        (
          executiveDecision === "pursue"
            ? "awaiting-authorization"
            : executiveDecision
        ),
      resourcePath: {
        direct:
          opportunity.executiveQualification?.moneyFlow
            ?.directAwardPossible ?? null,
        partner:
          opportunity.executiveQualification?.moneyFlow
            ?.partnerFundingPossible ?? null,
        inKind:
          ["in-kind", "equipment", "vehicle", "property"]
            .includes(channel)
      },
      reason:
        fastGate.reasons[0] ||
        investigationGate.reasons[0] ||
        opportunity.executiveQualification?.executiveBrief?.reason ||
        "The opportunity was evaluated for realistic resource value to CCSP.",
      nextAction:
        executiveDecision === "pursue"
          ? "Authorize pursuit and open the preparation workflow."
          : executiveDecision === "partner"
            ? "Confirm the lead organization and funded CCSP role."
            : executiveDecision === "prepare"
              ? "Resolve readiness gaps before the deadline or next cycle."
              : executiveDecision === "research"
                ? "Complete the unresolved investigation before making a desk decision."
                : executiveDecision === "monitor"
                  ? "Monitor the opportunity and schedule the next review."
                  : "Keep off the active desk while preserving the decision evidence."
  };

  resourceDevelopment.workQueue =
    buildExecutiveWorkQueueEntry(
      opportunity,
      resourceDevelopment
    );

  return {
    ...opportunity,
    resourceDevelopment
  };
}

function createSummary(records) {
  const summary = {
    total: records.length,
    executiveDesk: 0,
    active: 0,
    research: 0,
    monitor: 0,
    offDesk: 0,
    decisions: {},
    channels: {},
    priorities: {}
  };

  for (const record of records) {
    const rd = record.resourceDevelopment || {};
    const decision = rd.executiveDecision || "unknown";
    const channel = rd.channel || "unknown";
    const priority = rd.executivePriority?.priority || "unknown";

    summary.decisions[decision] =
      (summary.decisions[decision] || 0) + 1;
    summary.channels[channel] =
      (summary.channels[channel] || 0) + 1;
    summary.priorities[priority] =
      (summary.priorities[priority] || 0) + 1;

    if (rd.deskStatus === "active") {
      summary.active += 1;
      summary.executiveDesk += 1;
    } else if (rd.deskStatus === "research") {
      summary.research += 1;
    } else if (rd.deskStatus === "monitor") {
      summary.monitor += 1;
    } else {
      summary.offDesk += 1;
    }
  }

  return summary;
}

function createExecutiveResourceDevelopmentOffice(dependencies) {
  const {
    app,
    express,
    collection,
    readCollection,
    upsertOpportunities,
    registerContinuousHandler,
    upsertContinuousJob,
    now
  } = dependencies;

  const state = {
    status: "initializing",
    lastRunAt: null,
    lastError: null,
    lastTrigger: null,
    rebuildCount: 0,
    selfHealCount: 0,
    summary: {
      total: 0,
      executiveDesk: 0
    },
    pipelineSummary: {
      total: 0,
      active: 0,
      submitted: 0,
      awardPending: 0,
      awarded: 0,
      fundsReceived: 0,
      moneyReceived: 0,
      submittedValue: 0,
      awardedValue: 0,
      stages: {}
    }
  };

  let rebuildInFlight = null;

  function normalizeFundingPipelineStage(value) {
    const stage = String(value || "").trim();

    return Object.values(FUNDING_PIPELINE_STAGES).includes(stage)
      ? stage
      : FUNDING_PIPELINE_STAGES.DISCOVERED;
  }

  function initialFundingPipelineStage(record = {}) {
    const qualificationStatus =
      record.executiveQualification?.qualificationStatus ||
      record.qualificationStatus ||
      "";

    if (
      qualificationStatus === "executive-qualified" ||
      record.resourceDevelopment?.deskStatus === "active"
    ) {
      return FUNDING_PIPELINE_STAGES.QUALIFIED;
    }

    return FUNDING_PIPELINE_STAGES.DISCOVERED;
  }

  function ensureFundingPipeline(record = {}, timestamp = now()) {
    const existing =
      record.fundingPipeline &&
      typeof record.fundingPipeline === "object"
        ? record.fundingPipeline
        : {};

    const stage = normalizeFundingPipelineStage(
      existing.stage ||
      initialFundingPipelineStage(record)
    );

    const history =
      Array.isArray(existing.history) &&
      existing.history.length > 0
        ? existing.history
            .filter(entry => entry && typeof entry === "object")
            .map(entry => ({
              stage: normalizeFundingPipelineStage(entry.stage),
              enteredAt: entry.enteredAt || timestamp,
              actor: String(entry.actor || "MEOS"),
              authority: String(entry.authority || "system-record"),
              note: String(entry.note || "")
            }))
        : [{
            stage,
            enteredAt: timestamp,
            actor: "MEOS Executive Resource Development Office",
            authority: "pipeline-bootstrap",
            note: "Durable funding pipeline initialized from the authoritative opportunity record."
          }];

    const receipts =
      Array.isArray(existing.fundingReceipts)
        ? existing.fundingReceipts
        : [];

    return {
      schema: "meos.executive-resource-development.pipeline.v1",
      version: RESOURCE_DEVELOPMENT_VERSION,
      buildId: BUILD_ID,
      stage,
      history,
      executiveAuthorization:
        existing.executiveAuthorization || null,
      applicationIntelligence:
        existing.applicationIntelligence || null,
      executiveReviewPackage:
        existing.executiveReviewPackage || null,
      executiveApplicationPackage:
        existing.executiveApplicationPackage || null,
      submissionPortalIntelligence:
        existing.submissionPortalIntelligence || null,
      portalSubmissionPackage:
        existing.portalSubmissionPackage || null,
      submissionExecution:
        existing.submissionExecution || null,
      awardTracking:
        existing.awardTracking || null,
      fundingReceipts: receipts,
      metrics: calculateFundingPipelineMetrics({
        ...existing,
        fundingReceipts: receipts
      }),
      updatedAt: existing.updatedAt || timestamp
    };
  }

  function calculateFundingPipelineMetrics(pipeline = {}) {
    const requestedAmount = Number(
      pipeline.submissionExecution?.requestedAmount ||
      pipeline.awardTracking?.requestedAmount ||
      0
    );
    const awardedAmount = Number(
      pipeline.awardTracking?.awardedAmount ||
      0
    );
    const fundingReceipts =
      Array.isArray(pipeline.fundingReceipts)
        ? pipeline.fundingReceipts
        : [];
    const moneyReceived = fundingReceipts.reduce(
      (total, receipt) =>
        total + Number(receipt?.amount || 0),
      0
    );

    return {
      requestedAmount,
      awardedAmount,
      moneyReceived,
      balanceRemaining:
        awardedAmount > 0
          ? Math.max(0, awardedAmount - moneyReceived)
          : null,
      receiptCount: fundingReceipts.length,
      success:
        awardedAmount > 0 &&
        moneyReceived >= awardedAmount
    };
  }

  function requiredArtifactForStage(stage) {
    const requirements = {
      [FUNDING_PIPELINE_STAGES.APPLICATION_INTELLIGENCE]:
        "applicationIntelligence",
      [FUNDING_PIPELINE_STAGES.PACKAGE_ASSEMBLED]:
        "executiveApplicationPackage",
      [FUNDING_PIPELINE_STAGES.PORTAL_MAPPED]:
        "submissionPortalIntelligence",
      [FUNDING_PIPELINE_STAGES.EXECUTIVE_APPROVED]:
        "executiveReviewPackage",
      [FUNDING_PIPELINE_STAGES.SUBMITTED]:
        "submissionExecution",
      [FUNDING_PIPELINE_STAGES.AWARD_PENDING]:
        "submissionExecution",
      [FUNDING_PIPELINE_STAGES.AWARDED]:
        "awardTracking"
    };

    return requirements[stage] || null;
  }

  function validateFundingPipelineTransition(
    record,
    pipeline,
    nextStage,
    input = {}
  ) {
    const currentStage =
      normalizeFundingPipelineStage(pipeline.stage);
    const targetStage =
      normalizeFundingPipelineStage(nextStage);
    const allowed =
      FUNDING_PIPELINE_TRANSITIONS[currentStage] || [];

    if (!allowed.includes(targetStage)) {
      const error = new Error(
        `Cannot move funding pipeline from "${currentStage}" to "${targetStage}".`
      );
      error.status = 409;
      error.code = "FUNDING_PIPELINE_TRANSITION_INVALID";
      error.details = {
        currentStage,
        requestedStage: targetStage,
        allowedNextStages: [...allowed]
      };
      throw error;
    }

    const transitionSuppliesPursuitAuthorization =
      targetStage === FUNDING_PIPELINE_STAGES.PREPARING &&
      (
        input.executiveAuthorized === true ||
        Boolean(input.executiveAuthorization) ||
        Boolean(String(input.actor || "").trim())
      );

    if (
      targetStage === FUNDING_PIPELINE_STAGES.PREPARING &&
      !pipeline.executiveAuthorization &&
      !transitionSuppliesPursuitAuthorization
    ) {
      const error = new Error(
        "Executive pursuit authorization is required before preparation begins."
      );
      error.status = 409;
      error.code = "FUNDING_PIPELINE_EXECUTIVE_AUTHORIZATION_REQUIRED";
      throw error;
    }

    const requiredArtifact =
      requiredArtifactForStage(targetStage);

    if (
      requiredArtifact &&
      !pipeline[requiredArtifact] &&
      !input.artifact
    ) {
      const error = new Error(
        `${requiredArtifact} is required before entering ${targetStage}.`
      );
      error.status = 409;
      error.code = "FUNDING_PIPELINE_ARTIFACT_REQUIRED";
      error.details = {
        requiredArtifact,
        targetStage
      };
      throw error;
    }

    if (
      targetStage === FUNDING_PIPELINE_STAGES.EXECUTIVE_APPROVED &&
      pipeline.executiveReviewPackage?.approval?.status !== "approved" &&
      input.executiveApproved !== true
    ) {
      const error = new Error(
        "Executive application approval is required."
      );
      error.status = 409;
      error.code = "FUNDING_PIPELINE_APPLICATION_APPROVAL_REQUIRED";
      throw error;
    }

    if (
      targetStage === FUNDING_PIPELINE_STAGES.AWARDED
    ) {
      const awardedAmount = Number(
        input.artifact?.awardedAmount ??
        pipeline.awardTracking?.awardedAmount
      );

      if (!Number.isFinite(awardedAmount) || awardedAmount < 0) {
        const error = new Error(
          "A verified awarded amount is required."
        );
        error.status = 409;
        error.code = "FUNDING_PIPELINE_AWARDED_AMOUNT_REQUIRED";
        throw error;
      }
    }

    return {
      currentStage,
      targetStage
    };
  }

  function artifactPropertyName(type) {
    const map = {
      [FUNDING_PIPELINE_ARTIFACT_TYPES.APPLICATION_INTELLIGENCE]:
        "applicationIntelligence",
      [FUNDING_PIPELINE_ARTIFACT_TYPES.EXECUTIVE_REVIEW_PACKAGE]:
        "executiveReviewPackage",
      [FUNDING_PIPELINE_ARTIFACT_TYPES.EXECUTIVE_APPLICATION_PACKAGE]:
        "executiveApplicationPackage",
      [FUNDING_PIPELINE_ARTIFACT_TYPES.SUBMISSION_PORTAL_INTELLIGENCE]:
        "submissionPortalIntelligence",
      [FUNDING_PIPELINE_ARTIFACT_TYPES.PORTAL_SUBMISSION_PACKAGE]:
        "portalSubmissionPackage",
      [FUNDING_PIPELINE_ARTIFACT_TYPES.SUBMISSION_EXECUTION]:
        "submissionExecution",
      [FUNDING_PIPELINE_ARTIFACT_TYPES.AWARD_TRACKING]:
        "awardTracking"
    };

    return map[type] || null;
  }

  async function getFundingRecord(id) {
    const records = (
      await readCollection(collection)
    ).filter(record => record?.type === "funding-opportunity");

    return {
      records,
      record: records.find(item => item.id === id) || null
    };
  }

  async function persistFundingRecord(record) {
    await upsertOpportunities([record]);
    return record;
  }

  async function transitionFundingPipeline(
    id,
    input = {}
  ) {
    const { record } = await getFundingRecord(id);

    if (!record) {
      const error = new Error("Funding opportunity not found.");
      error.status = 404;
      error.code = "FUNDING_PIPELINE_RECORD_NOT_FOUND";
      throw error;
    }

    const timestamp = now();
    const pipeline =
      ensureFundingPipeline(record, timestamp);
    const nextStage =
      String(input.stage || "").trim();

    const {
      currentStage,
      targetStage
    } = validateFundingPipelineTransition(
      record,
      pipeline,
      nextStage,
      input
    );

    const artifactType =
      String(input.artifactType || "").trim();
    const property =
      artifactPropertyName(artifactType);

    if (property && input.artifact) {
      pipeline[property] = {
        ...input.artifact,
        synchronizedAt: timestamp,
        synchronizedBy:
          String(input.actor || "MEOS Grant Office")
      };
    } else if (
      input.artifact &&
      requiredArtifactForStage(targetStage)
    ) {
      pipeline[
        requiredArtifactForStage(targetStage)
      ] = {
        ...input.artifact,
        synchronizedAt: timestamp,
        synchronizedBy:
          String(input.actor || "MEOS Grant Office")
      };
    }

    if (
      targetStage === FUNDING_PIPELINE_STAGES.PREPARING &&
      !pipeline.executiveAuthorization
    ) {
      const suppliedAuthorization =
        input.executiveAuthorization &&
        typeof input.executiveAuthorization === "object"
          ? input.executiveAuthorization
          : {};

      pipeline.executiveAuthorization = {
        ...suppliedAuthorization,
        authorized: true,
        authorizedBy:
          String(
            suppliedAuthorization.authorizedBy ||
            input.actor ||
            "Executive Director"
          ),
        authorizedAt:
          suppliedAuthorization.authorizedAt ||
          timestamp,
        decision:
          suppliedAuthorization.decision ||
          "pursue",
        note:
          String(
            suppliedAuthorization.note ||
            input.note ||
            ""
          )
      };
    }

    if (
      targetStage === FUNDING_PIPELINE_STAGES.EXECUTIVE_APPROVED &&
      input.executiveApproved === true
    ) {
      pipeline.executiveReviewPackage = {
        ...(pipeline.executiveReviewPackage || {}),
        approval: {
          status: "approved",
          approvedBy:
            String(input.actor || "Executive Director"),
          approvedAt: timestamp,
          notes: String(input.note || "")
        }
      };
    }

    pipeline.stage = targetStage;
    pipeline.updatedAt = timestamp;
    pipeline.history.push({
      stage: targetStage,
      enteredAt: timestamp,
      actor:
        String(input.actor || "MEOS Grant Office"),
      authority:
        String(input.authority || "authorized-pipeline-transition"),
      note:
        String(input.note || "")
    });
    pipeline.metrics =
      calculateFundingPipelineMetrics(pipeline);

    const updated = {
      ...record,
      fundingPipeline: pipeline,
      updatedAt: timestamp
    };

    await persistFundingRecord(updated);
    state.pipelineSummary =
      await calculatePortfolioPipelineSummary();

    return {
      schema: "meos.executive-resource-development.pipeline-transition.v1",
      version: RESOURCE_DEVELOPMENT_VERSION,
      buildId: BUILD_ID,
      opportunityId: id,
      previousStage: currentStage,
      currentStage: targetStage,
      allowedNextStages: [
        ...(FUNDING_PIPELINE_TRANSITIONS[targetStage] || [])
      ],
      fundingPipeline: pipeline
    };
  }

  async function synchronizeFundingPipeline(
    id,
    input = {}
  ) {
    const { record } = await getFundingRecord(id);

    if (!record) {
      const error = new Error("Funding opportunity not found.");
      error.status = 404;
      error.code = "FUNDING_PIPELINE_RECORD_NOT_FOUND";
      throw error;
    }

    const timestamp = now();
    const pipeline =
      ensureFundingPipeline(record, timestamp);
    const artifacts =
      input.artifacts &&
      typeof input.artifacts === "object"
        ? input.artifacts
        : {};

    for (const [artifactType, artifact] of Object.entries(artifacts)) {
      const property =
        artifactPropertyName(artifactType);

      if (!property || !artifact || typeof artifact !== "object") {
        continue;
      }

      pipeline[property] = {
        ...artifact,
        synchronizedAt: timestamp,
        synchronizedBy:
          String(input.actor || "MEOS Grant Office")
      };
    }

    if (Array.isArray(input.fundingReceipts)) {
      pipeline.fundingReceipts =
        input.fundingReceipts.map(receipt => ({
          ...receipt,
          synchronizedAt:
            receipt.synchronizedAt || timestamp
        }));
    }

    if (input.executiveAuthorization) {
      pipeline.executiveAuthorization = {
        ...input.executiveAuthorization,
        synchronizedAt: timestamp
      };
    }

    pipeline.updatedAt = timestamp;
    pipeline.metrics =
      calculateFundingPipelineMetrics(pipeline);

    const updated = {
      ...record,
      fundingPipeline: pipeline,
      updatedAt: timestamp
    };

    await persistFundingRecord(updated);
    state.pipelineSummary =
      await calculatePortfolioPipelineSummary();

    return {
      schema: "meos.executive-resource-development.pipeline-sync.v1",
      version: RESOURCE_DEVELOPMENT_VERSION,
      buildId: BUILD_ID,
      opportunityId: id,
      fundingPipeline: pipeline
    };
  }

  async function addFundingReceipt(
    id,
    input = {}
  ) {
    const { record } = await getFundingRecord(id);

    if (!record) {
      const error = new Error("Funding opportunity not found.");
      error.status = 404;
      error.code = "FUNDING_PIPELINE_RECORD_NOT_FOUND";
      throw error;
    }

    const amount = Number(input.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      const error = new Error(
        "Funding receipt amount must be greater than zero."
      );
      error.status = 400;
      error.code = "FUNDING_PIPELINE_RECEIPT_AMOUNT_INVALID";
      throw error;
    }

    const timestamp = now();
    const pipeline =
      ensureFundingPipeline(record, timestamp);
    const awardedAmount = Number(
      pipeline.awardTracking?.awardedAmount || 0
    );
    const currentReceived =
      calculateFundingPipelineMetrics(pipeline).moneyReceived;

    if (
      awardedAmount <= 0 ||
      currentReceived + amount > awardedAmount
    ) {
      const error = new Error(
        "Funding receipt requires a verified award and cannot exceed the awarded amount."
      );
      error.status = 409;
      error.code = "FUNDING_PIPELINE_RECEIPT_EXCEEDS_AWARD";
      throw error;
    }

    const receipt = {
      id:
        normalizeIdentifier(input.id || "") ||
        `funding-receipt-${crypto.randomUUID()}`,
      amount,
      receivedAt:
        input.receivedAt || timestamp,
      receivedBy:
        String(input.receivedBy || "Organization"),
      method:
        String(input.method || "unknown"),
      reference:
        input.reference || input.transactionId || null,
      restricted:
        input.restricted !== false,
      conditions:
        Array.isArray(input.conditions)
          ? input.conditions.map(String)
          : [],
      note:
        String(input.note || "")
    };

    pipeline.fundingReceipts.push(receipt);
    pipeline.metrics =
      calculateFundingPipelineMetrics(pipeline);

    const fullyReceived =
      pipeline.metrics.moneyReceived >= awardedAmount;
    const targetStage =
      fullyReceived
        ? FUNDING_PIPELINE_STAGES.FUNDS_FULLY_RECEIVED
        : FUNDING_PIPELINE_STAGES.FUNDS_PARTIALLY_RECEIVED;

    const allowed =
      FUNDING_PIPELINE_TRANSITIONS[pipeline.stage] || [];

    if (
      pipeline.stage !== targetStage &&
      allowed.includes(targetStage)
    ) {
      pipeline.stage = targetStage;
      pipeline.history.push({
        stage: targetStage,
        enteredAt: timestamp,
        actor:
          String(input.actor || input.receivedBy || "Organization"),
        authority: "verified-funding-receipt",
        note:
          fullyReceived
            ? "Award fully received."
            : "Partial award payment received."
      });
    }

    pipeline.updatedAt = timestamp;

    await persistFundingRecord({
      ...record,
      fundingPipeline: pipeline,
      updatedAt: timestamp
    });

    state.pipelineSummary =
      await calculatePortfolioPipelineSummary();

    return {
      schema: "meos.executive-resource-development.funding-receipt.v1",
      version: RESOURCE_DEVELOPMENT_VERSION,
      buildId: BUILD_ID,
      opportunityId: id,
      receipt,
      fundingPipeline: pipeline
    };
  }

  async function calculatePortfolioPipelineSummary() {
    const records = (
      await readCollection(collection)
    ).filter(record => record?.type === "funding-opportunity");

    const summary = {
      total: records.length,
      active: 0,
      submitted: 0,
      awardPending: 0,
      awarded: 0,
      fundsReceived: 0,
      moneyReceived: 0,
      submittedValue: 0,
      awardedValue: 0,
      stages: {}
    };

    for (const record of records) {
      const pipeline =
        ensureFundingPipeline(record);
      const stage = pipeline.stage;
      const metrics = pipeline.metrics;

      summary.stages[stage] =
        (summary.stages[stage] || 0) + 1;

      if (
        ![
          FUNDING_PIPELINE_STAGES.ARCHIVED,
          FUNDING_PIPELINE_STAGES.DECLINED,
          FUNDING_PIPELINE_STAGES.WITHDRAWN
        ].includes(stage)
      ) {
        summary.active += 1;
      }

      if (
        [
          FUNDING_PIPELINE_STAGES.SUBMITTED,
          FUNDING_PIPELINE_STAGES.AWARD_PENDING,
          FUNDING_PIPELINE_STAGES.AWARDED,
          FUNDING_PIPELINE_STAGES.FUNDS_PARTIALLY_RECEIVED,
          FUNDING_PIPELINE_STAGES.FUNDS_FULLY_RECEIVED
        ].includes(stage)
      ) {
        summary.submitted += 1;
      }

      if (stage === FUNDING_PIPELINE_STAGES.AWARD_PENDING) {
        summary.awardPending += 1;
      }

      if (
        [
          FUNDING_PIPELINE_STAGES.AWARDED,
          FUNDING_PIPELINE_STAGES.FUNDS_PARTIALLY_RECEIVED,
          FUNDING_PIPELINE_STAGES.FUNDS_FULLY_RECEIVED
        ].includes(stage)
      ) {
        summary.awarded += 1;
      }

      if (metrics.moneyReceived > 0) {
        summary.fundsReceived += 1;
      }

      summary.moneyReceived += metrics.moneyReceived;
      summary.submittedValue += metrics.requestedAmount;
      summary.awardedValue += metrics.awardedAmount;
    }

    return summary;
  }

  async function readFundingPipeline(id) {
    const { record } = await getFundingRecord(id);

    if (!record) {
      const error = new Error("Funding opportunity not found.");
      error.status = 404;
      error.code = "FUNDING_PIPELINE_RECORD_NOT_FOUND";
      throw error;
    }

    return {
      schema: "meos.executive-resource-development.pipeline.v1",
      version: RESOURCE_DEVELOPMENT_VERSION,
      buildId: BUILD_ID,
      opportunityId: id,
      title: record.title,
      fundingPipeline:
        ensureFundingPipeline(record),
      resourceDevelopment:
        record.resourceDevelopment || null,
      executiveQualification:
        record.executiveQualification || null
    };
  }

  async function runFundingPipelineAcceptanceTest() {
    const testId =
      `funding-pipeline-test-${crypto.randomUUID()}`;
    const timestamp = now();

    const testRecord = normalizeExecutiveMemoryRecord({
      id: testId,
      schema: "meos.funding-intelligence.opportunity.v1",
      type: "funding-opportunity",
      office: "Funding Office",
      title: "End-to-End Funding Pipeline Acceptance Test",
      provider: "MEOS Acceptance Test Foundation",
      awardFloor: 100000,
      awardCeiling: 100000,
      qualificationStatus: "executive-qualified",
      executiveQualification: {
        qualificationStatus: "executive-qualified",
        recommendation: "pursue",
        executiveBrief: {
          confidence: 0.95,
          reason: "Acceptance test opportunity."
        }
      },
      resourceDevelopment: {
        executiveDecision: "pursue",
        deskStatus: "active",
        pursuitState: "awaiting-authorization"
      },
      firstDiscoveredAt: timestamp,
      lastSeenAt: timestamp
    });

    await persistFundingRecord(testRecord);

    try {
      const initialPipeline =
        await readFundingPipeline(testId);

      const initialStage =
        initialPipeline.fundingPipeline.stage;

      const qualified =
        initialStage === FUNDING_PIPELINE_STAGES.QUALIFIED
          ? {
              currentStage:
                FUNDING_PIPELINE_STAGES.QUALIFIED,
              fundingPipeline:
                initialPipeline.fundingPipeline
            }
          : await transitionFundingPipeline(testId, {
              stage:
                FUNDING_PIPELINE_STAGES.QUALIFIED,
              actor:
                "MEOS Acceptance Test"
            });

      const onDesk =
        qualified.currentStage ===
        FUNDING_PIPELINE_STAGES.ON_DESK
          ? qualified
          : await transitionFundingPipeline(testId, {
              stage:
                FUNDING_PIPELINE_STAGES.ON_DESK,
              actor:
                "MEOS Acceptance Test"
            });

      const preparing =
        await transitionFundingPipeline(testId, {
          stage: FUNDING_PIPELINE_STAGES.PREPARING,
          actor: "Acceptance Test Executive",
          executiveAuthorized: true,
          executiveAuthorization: {
            authorizedBy:
              "Acceptance Test Executive",
            decision: "pursue",
            note: "Pursuit authorized."
          },
          note: "Pursuit authorized."
        });

      const application =
        await transitionFundingPipeline(testId, {
          stage: FUNDING_PIPELINE_STAGES.APPLICATION_INTELLIGENCE,
          artifactType:
            FUNDING_PIPELINE_ARTIFACT_TYPES.APPLICATION_INTELLIGENCE,
          artifact: {
            schema:
              "meos.grant-office.application-intelligence.v1",
            id: "application-test",
            questions: [{ id: "q-1", state: "approved" }]
          },
          actor: "MEOS Grant Office"
        });

      const assembled =
        await transitionFundingPipeline(testId, {
          stage: FUNDING_PIPELINE_STAGES.PACKAGE_ASSEMBLED,
          artifactType:
            FUNDING_PIPELINE_ARTIFACT_TYPES.EXECUTIVE_APPLICATION_PACKAGE,
          artifact: {
            schema:
              "meos.grant-office.executive-application-package.v1",
            id: "package-test",
            readiness: { readyForSubmission: true }
          },
          actor: "MEOS Grant Office"
        });

      const portal =
        await transitionFundingPipeline(testId, {
          stage: FUNDING_PIPELINE_STAGES.PORTAL_MAPPED,
          artifactType:
            FUNDING_PIPELINE_ARTIFACT_TYPES.SUBMISSION_PORTAL_INTELLIGENCE,
          artifact: {
            schema:
              "meos.grant-office.submission-portal-intelligence.v1",
            id: "portal-test",
            portal: { type: "submittable" }
          },
          actor: "MEOS Grant Office"
        });

      const approved =
        await transitionFundingPipeline(testId, {
          stage: FUNDING_PIPELINE_STAGES.EXECUTIVE_APPROVED,
          artifactType:
            FUNDING_PIPELINE_ARTIFACT_TYPES.EXECUTIVE_REVIEW_PACKAGE,
          artifact: {
            schema:
              "meos.grant-office.executive-application-review.v1",
            id: "review-test",
            approval: {
              status: "approved",
              approvedBy: "Acceptance Test Executive",
              approvedAt: now()
            }
          },
          executiveApproved: true,
          actor: "Acceptance Test Executive"
        });

      const submitted =
        await transitionFundingPipeline(testId, {
          stage: FUNDING_PIPELINE_STAGES.SUBMITTED,
          artifactType:
            FUNDING_PIPELINE_ARTIFACT_TYPES.SUBMISSION_EXECUTION,
          artifact: {
            schema:
              "meos.grant-office.submission-execution.v1",
            id: "submission-test",
            requestedAmount: 100000,
            confirmationNumber: "CONF-TEST-001",
            receiptVerified: true
          },
          actor: "Acceptance Test Executive"
        });

      const pending =
        await transitionFundingPipeline(testId, {
          stage: FUNDING_PIPELINE_STAGES.AWARD_PENDING,
          actor: "MEOS Grant Office"
        });

      const awarded =
        await transitionFundingPipeline(testId, {
          stage: FUNDING_PIPELINE_STAGES.AWARDED,
          artifactType:
            FUNDING_PIPELINE_ARTIFACT_TYPES.AWARD_TRACKING,
          artifact: {
            schema:
              "meos.grant-office.award-tracking.v1",
            id: "award-test",
            requestedAmount: 100000,
            awardedAmount: 80000,
            decisionState: "awarded"
          },
          actor: "MEOS Acceptance Test Foundation"
        });

      const partial =
        await addFundingReceipt(testId, {
          amount: 40000,
          receivedBy: "MEOS Acceptance Test Organization",
          reference: "TX-TEST-001"
        });

      const full =
        await addFundingReceipt(testId, {
          amount: 40000,
          receivedBy: "MEOS Acceptance Test Organization",
          reference: "TX-TEST-002"
        });

      const final =
        await readFundingPipeline(testId);

      const checks = [
        {
          name:
            "Qualification connected with bootstrapped-stage tolerance",
          passed:
            [
              FUNDING_PIPELINE_STAGES.DISCOVERED,
              FUNDING_PIPELINE_STAGES.QUALIFIED
            ].includes(initialStage) &&
            qualified.currentStage ===
            FUNDING_PIPELINE_STAGES.QUALIFIED
        },
        {
          name: "Executive desk connected",
          passed:
            onDesk.currentStage ===
            FUNDING_PIPELINE_STAGES.ON_DESK
        },
        {
          name: "Pursuit authorization connected",
          passed:
            preparing.currentStage ===
            FUNDING_PIPELINE_STAGES.PREPARING &&
            Boolean(
              preparing.fundingPipeline.executiveAuthorization
            )
        },
        {
          name: "Application Intelligence connected",
          passed:
            application.currentStage ===
            FUNDING_PIPELINE_STAGES.APPLICATION_INTELLIGENCE &&
            Boolean(
              application.fundingPipeline.applicationIntelligence
            )
        },
        {
          name: "Application Assembly connected",
          passed:
            assembled.currentStage ===
            FUNDING_PIPELINE_STAGES.PACKAGE_ASSEMBLED &&
            Boolean(
              assembled.fundingPipeline.executiveApplicationPackage
            )
        },
        {
          name: "Portal Intelligence connected",
          passed:
            portal.currentStage ===
            FUNDING_PIPELINE_STAGES.PORTAL_MAPPED &&
            Boolean(
              portal.fundingPipeline.submissionPortalIntelligence
            )
        },
        {
          name: "Executive application approval connected",
          passed:
            approved.currentStage ===
            FUNDING_PIPELINE_STAGES.EXECUTIVE_APPROVED
        },
        {
          name: "Submission execution connected",
          passed:
            submitted.currentStage ===
            FUNDING_PIPELINE_STAGES.SUBMITTED &&
            submitted.fundingPipeline.metrics.requestedAmount ===
            100000
        },
        {
          name: "Award-pending monitoring connected",
          passed:
            pending.currentStage ===
            FUNDING_PIPELINE_STAGES.AWARD_PENDING
        },
        {
          name: "Award decision connected",
          passed:
            awarded.currentStage ===
            FUNDING_PIPELINE_STAGES.AWARDED &&
            awarded.fundingPipeline.metrics.awardedAmount ===
            80000
        },
        {
          name: "Partial funds received connected",
          passed:
            partial.fundingPipeline.stage ===
            FUNDING_PIPELINE_STAGES.FUNDS_PARTIALLY_RECEIVED &&
            partial.fundingPipeline.metrics.moneyReceived ===
            40000
        },
        {
          name: "Full funds received connected",
          passed:
            full.fundingPipeline.stage ===
            FUNDING_PIPELINE_STAGES.FUNDS_FULLY_RECEIVED &&
            full.fundingPipeline.metrics.moneyReceived ===
            80000 &&
            full.fundingPipeline.metrics.success === true
        },
        {
          name: "Complete pipeline history preserved",
          passed:
            final.fundingPipeline.history.length >= 12
        }
      ];

      return {
        schema:
          "meos.executive-resource-development.pipeline-acceptance.v1",
        version: RESOURCE_DEVELOPMENT_VERSION,
        buildId: BUILD_ID,
        success:
          checks.every(check => check.passed),
        passed:
          checks.filter(check => check.passed).length,
        total: checks.length,
        checks,
        finalStage:
          final.fundingPipeline.stage,
        moneyReceived:
          final.fundingPipeline.metrics.moneyReceived,
        historyCount:
          final.fundingPipeline.history.length
      };
    } finally {
      await withExecutiveMemoryWriteLock(
        collection,
        async () => {
          const records =
            await readCollection(collection);
          await writeExecutiveMemoryCollection(
            collection,
            records.filter(record => record.id !== testId)
          );
        }
      );
    }
  }

  async function performPortfolioRebuild(trigger = "manual") {
    state.status = "running";
    state.lastRunAt = now();
    state.lastTrigger = trigger;
    state.lastError = null;

    try {
      const records = (
        await readCollection(collection)
      ).filter(record => record?.type === "funding-opportunity");

      const evaluated = records.map(record => {
        const evaluatedRecord =
          buildResourceDevelopmentRecord(record, now());

        return {
          ...evaluatedRecord,
          fundingPipeline:
            ensureFundingPipeline(
              evaluatedRecord,
              now()
            )
        };
      });

      if (evaluated.length > 0) {
        await upsertOpportunities(evaluated);
      }

      state.summary = createSummary(evaluated);
      state.pipelineSummary =
        await calculatePortfolioPipelineSummary();
      state.status = "online";
      state.rebuildCount += 1;

      return {
        schema: "meos.executive-resource-development.run.v1",
        version: RESOURCE_DEVELOPMENT_VERSION,
        buildId: BUILD_ID,
        completedAt: now(),
        trigger,
        rebuildCount: state.rebuildCount,
        ...state.summary
      };
    } catch (error) {
      state.status = "degraded";
      state.lastError = error?.message || String(error);
      throw error;
    }
  }

  async function rebuildPortfolio(options = {}) {
    const trigger =
      typeof options === "string"
        ? options
        : String(options.trigger || "manual");

    if (rebuildInFlight) {
      return rebuildInFlight;
    }

    rebuildInFlight = performPortfolioRebuild(trigger)
      .finally(() => {
        rebuildInFlight = null;
      });

    return rebuildInFlight;
  }

  async function ensurePortfolioReady(trigger = "desk-self-heal") {
    const records = (
      await readCollection(collection)
    ).filter(record => record?.type === "funding-opportunity");

    if (records.length === 0) {
      state.summary = {
        total: 0,
        executiveDesk: 0,
        active: 0,
        research: 0,
        monitor: 0,
        offDesk: 0,
        decisions: {},
        channels: {},
        priorities: {}
      };

      return {
        rebuilt: false,
        reason: "no-funding-records",
        total: 0
      };
    }

    const annotatedCount = records.filter(
      record => record?.resourceDevelopment
    ).length;

    if (annotatedCount === records.length) {
      return {
        rebuilt: false,
        reason: "portfolio-ready",
        total: records.length,
        annotated: annotatedCount
      };
    }

    state.selfHealCount += 1;
    const result = await rebuildPortfolio({
      trigger
    });

    return {
      rebuilt: true,
      reason:
        annotatedCount === 0
          ? "portfolio-missing"
          : "portfolio-partially-missing",
      before: {
        total: records.length,
        annotated: annotatedCount
      },
      result
    };
  }

  async function readDesk(query = {}) {
    await ensurePortfolioReady("desk-self-heal");

    const records = (
      await readCollection(collection)
    )
      .filter(record => record?.type === "funding-opportunity")
      .filter(record => record.resourceDevelopment)
      .filter(record => {
        const requestedStatus = String(
          query.status || ""
        ).trim();
        const includeAll =
          String(query.includeAll || "").trim().toLowerCase() ===
          "true";
        const status =
          requestedStatus ||
          (includeAll ? "" : "active");
        const decision = String(query.decision || "").trim();
        const channel = String(query.channel || "").trim();

        return (
          (!status ||
            record.resourceDevelopment?.deskStatus === status) &&
          (!decision ||
            record.resourceDevelopment?.executiveDecision === decision) &&
          (!channel ||
            record.resourceDevelopment?.channel === channel)
        );
      })
      .sort((left, right) =>
        Number(
          right.resourceDevelopment?.executivePriority?.score || 0
        ) -
        Number(
          left.resourceDevelopment?.executivePriority?.score || 0
        )
      );

    const rankedRecords = rankExecutiveWorkQueue(records);

    const requestedLimit = Number(query.limit || 50);
    const limit = Math.max(
      1,
      Math.min(
        Number.isFinite(requestedLimit)
          ? Math.floor(requestedLimit)
          : 50,
        500
      )
    );

    return rankedRecords.slice(0, limit);
  }

  async function applyExecutiveDecision(id, input = {}) {
    const decision = String(input.decision || "").trim().toLowerCase();

    if (!DECISIONS.includes(decision)) {
      const error = new Error("Unsupported Executive Resource Development decision.");
      error.status = 400;
      error.code = "RESOURCE_DEVELOPMENT_DECISION_INVALID";
      throw error;
    }

    const records = (
      await readCollection(collection)
    ).filter(record => record?.type === "funding-opportunity");
    const record = records.find(item => item.id === id);

    if (!record) {
      const error = new Error("Resource opportunity not found.");
      error.status = 404;
      error.code = "RESOURCE_DEVELOPMENT_RECORD_NOT_FOUND";
      throw error;
    }

    const decisionAt = now();
    const pipeline =
      ensureFundingPipeline(record, decisionAt);

    if (decision === "pursue") {
      pipeline.executiveAuthorization = {
        authorized: true,
        authorizedBy:
          String(input.decidedBy || input.actor || "Executive Director"),
        authorizedAt: decisionAt,
        decision: "pursue",
        note: String(input.reason || "").trim() || null
      };

      if (
        [
          FUNDING_PIPELINE_STAGES.DISCOVERED,
          FUNDING_PIPELINE_STAGES.QUALIFIED
        ].includes(pipeline.stage)
      ) {
        if (pipeline.stage === FUNDING_PIPELINE_STAGES.DISCOVERED) {
          pipeline.stage = FUNDING_PIPELINE_STAGES.QUALIFIED;
          pipeline.history.push({
            stage: FUNDING_PIPELINE_STAGES.QUALIFIED,
            enteredAt: decisionAt,
            actor: "MEOS Executive Resource Development Office",
            authority: "executive-qualification",
            note: "Opportunity qualified before pursuit authorization."
          });
        }

        pipeline.stage = FUNDING_PIPELINE_STAGES.ON_DESK;
        pipeline.history.push({
          stage: FUNDING_PIPELINE_STAGES.ON_DESK,
          enteredAt: decisionAt,
          actor:
            String(input.decidedBy || input.actor || "Executive Director"),
          authority: "executive-decision",
          note: "Executive pursuit decision placed the opportunity on desk."
        });
      }

      if (pipeline.stage === FUNDING_PIPELINE_STAGES.ON_DESK) {
        pipeline.stage = FUNDING_PIPELINE_STAGES.PREPARING;
        pipeline.history.push({
          stage: FUNDING_PIPELINE_STAGES.PREPARING,
          enteredAt: decisionAt,
          actor:
            String(input.decidedBy || input.actor || "Executive Director"),
          authority: "executive-pursuit-authorization",
          note: "Pursuit authorized and preparation opened."
        });
      }
    }

    if (decision === "reject") {
      pipeline.stage =
        FUNDING_PIPELINE_STAGES.ARCHIVED;
      pipeline.history.push({
        stage: FUNDING_PIPELINE_STAGES.ARCHIVED,
        enteredAt: decisionAt,
        actor:
          String(input.decidedBy || input.actor || "Executive Director"),
        authority: "executive-decision",
        note:
          String(input.reason || "").trim() ||
          "Opportunity rejected and archived."
      });
    }

    pipeline.updatedAt = decisionAt;
    pipeline.metrics =
      calculateFundingPipelineMetrics(pipeline);

    const updated = {
      ...record,
      fundingPipeline: pipeline,
      resourceDevelopment: {
        ...(record.resourceDevelopment || {}),
        executiveDecision: decision,
        pursuitState:
          decision === "pursue"
            ? "preparing"
            : decision,
        humanDecision: {
          decidedAt: decisionAt,
          decidedBy:
            String(input.decidedBy || input.actor || "Executive Director"),
          decision,
          reason: String(input.reason || "").trim() || null
        }
      }
    };

    await upsertOpportunities([updated]);
    state.pipelineSummary =
      await calculatePortfolioPipelineSummary();
    return updated;
  }

  registerContinuousHandler(
    "executive-resource-development-office",
    async () =>
      rebuildPortfolio({
        trigger: "continuous-operations"
      })
  );

  app.get(
    "/api/resource-development",
    async (request, response) => {
      try {
        response.status(200).json({
          schema: "meos.executive-resource-development.status.v1",
          version: RESOURCE_DEVELOPMENT_VERSION,
          buildId: BUILD_ID,
          status: state.status,
          lastRunAt: state.lastRunAt,
          lastError: state.lastError,
          lastTrigger: state.lastTrigger,
          rebuildCount: state.rebuildCount,
          selfHealCount: state.selfHealCount,
          rebuildInProgress: Boolean(rebuildInFlight),
          channels: RESOURCE_CHANNELS,
          summary: state.summary,
          pipelineSummary: state.pipelineSummary,
          pipelineStages: FUNDING_PIPELINE_STAGES
        });
      } catch (error) {
        response.status(500).json({
          error: error?.message || "Resource Development status failed."
        });
      }
    }
  );

  app.get(
    "/api/resource-development/desk",
    async (request, response) => {
      try {
        const records = await readDesk(request.query);
        response.status(200).json({
          schema: "meos.executive-resource-development.desk.v1",
          version: RESOURCE_DEVELOPMENT_VERSION,
          total: records.length,
          records
        });
      } catch (error) {
        response.status(500).json({
          error: error?.message || "Executive Resource Development desk failed."
        });
      }
    }
  );

  app.post(
    "/api/resource-development/rebuild",
    express.json({ limit: "16kb", strict: true }),
    async (request, response) => {
      try {
        response.status(200).json(await rebuildPortfolio({ trigger: "api-manual-rebuild" }));
      } catch (error) {
        response.status(500).json({
          error: error?.message || "Resource Development rebuild failed.",
          code: error?.code || "RESOURCE_DEVELOPMENT_REBUILD_FAILED"
        });
      }
    }
  );

  app.get(
    "/api/resource-development/work-queue",
    async (request, response) => {
      try {
        const records = await readDesk({
          ...request.query,
          includeAll:
            request.query.includeAll || "false"
        });

        const buckets = {};

        for (const record of records) {
          const bucket =
            record.resourceDevelopment?.workQueue
              ?.timingBucket?.bucket ||
            "unclassified";

          if (!buckets[bucket]) {
            buckets[bucket] = [];
          }

          buckets[bucket].push({
            id: record.id,
            title: record.title,
            resourceDevelopment:
              record.resourceDevelopment,
            executiveQualification:
              record.executiveQualification
          });
        }

        response.status(200).json({
          schema:
            "meos.executive-resource-development.work-queue.v1",
          version: RESOURCE_DEVELOPMENT_VERSION,
          buildId: BUILD_ID,
          generatedAt: now(),
          total: records.length,
          buckets,
          records
        });
      } catch (error) {
        response.status(500).json({
          error:
            error?.message ||
            "Executive Resource Development work queue failed.",
          code:
            error?.code ||
            "RESOURCE_DEVELOPMENT_WORK_QUEUE_FAILED"
        });
      }
    }
  );

  app.post(
    "/api/resource-development/:id/decision",
    express.json({ limit: "16kb", strict: true }),
    async (request, response) => {
      try {
        response.status(200).json(
          await applyExecutiveDecision(
            request.params.id,
            request.body || {}
          )
        );
      } catch (error) {
        response.status(error.status || 500).json({
          error: error?.message || "Executive decision failed.",
          code: error?.code || "RESOURCE_DEVELOPMENT_DECISION_FAILED"
        });
      }
    }
  );

  app.get(
    "/api/resource-development/pipeline/summary",
    async (request, response) => {
      try {
        state.pipelineSummary =
          await calculatePortfolioPipelineSummary();

        response.status(200).json({
          schema:
            "meos.executive-resource-development.pipeline-summary.v1",
          version: RESOURCE_DEVELOPMENT_VERSION,
          buildId: BUILD_ID,
          generatedAt: now(),
          ...state.pipelineSummary
        });
      } catch (error) {
        response.status(error.status || 500).json({
          error:
            error?.message ||
            "Funding pipeline summary failed.",
          code:
            error?.code ||
            "FUNDING_PIPELINE_SUMMARY_FAILED"
        });
      }
    }
  );

  app.get(
    "/api/resource-development/:id/pipeline",
    async (request, response) => {
      try {
        response.status(200).json(
          await readFundingPipeline(
            request.params.id
          )
        );
      } catch (error) {
        response.status(error.status || 500).json({
          error:
            error?.message ||
            "Funding pipeline read failed.",
          code:
            error?.code ||
            "FUNDING_PIPELINE_READ_FAILED",
          details:
            error?.details || null
        });
      }
    }
  );

  app.post(
    "/api/resource-development/:id/pipeline/transition",
    express.json({ limit: "1mb", strict: true }),
    async (request, response) => {
      try {
        response.status(200).json(
          await transitionFundingPipeline(
            request.params.id,
            request.body || {}
          )
        );
      } catch (error) {
        response.status(error.status || 500).json({
          error:
            error?.message ||
            "Funding pipeline transition failed.",
          code:
            error?.code ||
            "FUNDING_PIPELINE_TRANSITION_FAILED",
          details:
            error?.details || null
        });
      }
    }
  );

  app.post(
    "/api/resource-development/:id/pipeline/sync",
    express.json({ limit: "4mb", strict: true }),
    async (request, response) => {
      try {
        response.status(200).json(
          await synchronizeFundingPipeline(
            request.params.id,
            request.body || {}
          )
        );
      } catch (error) {
        response.status(error.status || 500).json({
          error:
            error?.message ||
            "Funding pipeline synchronization failed.",
          code:
            error?.code ||
            "FUNDING_PIPELINE_SYNC_FAILED"
        });
      }
    }
  );

  app.post(
    "/api/resource-development/:id/pipeline/receipts",
    express.json({ limit: "64kb", strict: true }),
    async (request, response) => {
      try {
        response.status(200).json(
          await addFundingReceipt(
            request.params.id,
            request.body || {}
          )
        );
      } catch (error) {
        response.status(error.status || 500).json({
          error:
            error?.message ||
            "Funding receipt failed.",
          code:
            error?.code ||
            "FUNDING_PIPELINE_RECEIPT_FAILED"
        });
      }
    }
  );

  app.post(
    "/api/resource-development/pipeline/acceptance-test",
    express.json({ limit: "16kb", strict: true }),
    async (request, response) => {
      try {
        const result =
          await runFundingPipelineAcceptanceTest();

        response.status(
          result.success ? 200 : 500
        ).json(result);
      } catch (error) {
        response.status(error.status || 500).json({
          error:
            error?.message ||
            "Funding pipeline acceptance test failed.",
          code:
            error?.code ||
            "FUNDING_PIPELINE_ACCEPTANCE_FAILED",
          details:
            error?.details || null
        });
      }
    }
  );

  async function initialize() {
    await upsertContinuousJob({
      id: JOB_ID,
      office: "Executive Resource Development Office",
      mission:
        "Continuously convert broad resource discovery into a tightly ranked executive desk without missing realistic money or wasting time on impossible opportunities.",
      handler: "executive-resource-development-office",
      intervalMs: 60 * 60_000,
      nextRunAt: now(),
      priority: 100,
      requiresHumanApproval: false,
      autonomousAuthority: "research-rank-recommend",
      metadata: {
        standingMission: true,
        version: RESOURCE_DEVELOPMENT_VERSION,
        buildId: BUILD_ID
      }
    });

    const result = await rebuildPortfolio({ trigger: "server-startup" });

    return {
      version: RESOURCE_DEVELOPMENT_VERSION,
      buildId: BUILD_ID,
      status: state.status,
      portfolioTotal: result.total,
      executiveDeskTotal: result.executiveDesk,
      pipelineSummary: state.pipelineSummary
    };
  }

  return Object.freeze({
    version: RESOURCE_DEVELOPMENT_VERSION,
    buildId: BUILD_ID,
    initialize,
    rebuildPortfolio,
    ensurePortfolioReady,
    readDesk,
    readFundingPipeline,
    transitionFundingPipeline,
    synchronizeFundingPipeline,
    addFundingReceipt,
    calculatePortfolioPipelineSummary,
    runFundingPipelineAcceptanceTest
  });
}

const executiveResourceDevelopmentOffice =
  createExecutiveResourceDevelopmentOffice({
    app,
    express,
    collection: FUNDING_OPPORTUNITY_COLLECTION,
    readCollection: readExecutiveMemoryCollection,
    upsertOpportunities: upsertFundingOpportunities,
    registerContinuousHandler:
      registerContinuousOperationsHandler,
    upsertContinuousJob:
      upsertContinuousOperationsJob,
    now: continuousOperationsNow
  });

app.get("/api/resource-discovery/status", (request, response) => {
  try {
    const adapters = ResourceDiscoveryNetwork.listAdapters();

    response.json({
      schema: "meos.resource-discovery.integration-status.v1",
      version: RESOURCE_DISCOVERY_INTEGRATION_VERSION,
      buildId: RESOURCE_DISCOVERY_INTEGRATION_BUILD_ID,
      status: resourceDiscoveryIntegrationState.status,
      network: {
        name: ResourceDiscoveryNetwork.name,
        version: ResourceDiscoveryNetwork.version,
        buildId: ResourceDiscoveryNetwork.buildId
      },
      californiaAdapter: {
        name: CaliforniaGrantsPortalAdapter.name,
        version: CaliforniaGrantsPortalAdapter.version,
        buildId: CaliforniaGrantsPortalAdapter.buildId,
        registered: adapters.some(
          adapter =>
            adapter.id === CaliforniaGrantsPortalAdapter.id
        )
      },
      localAdapter: {
        name: LocalResourceDiscoveryAdapter.name,
        version: LocalResourceDiscoveryAdapter.version,
        buildId: LocalResourceDiscoveryAdapter.buildId,
        registered: adapters.some(
          adapter =>
            adapter.id === LocalResourceDiscoveryAdapter.id
        ),
        currentOperatingAreas:
          LocalResourceDiscoveryAdapter.defaultGeography
            .currentOperatingAreas,
        expansionStrategy:
          LocalResourceDiscoveryAdapter.defaultGeography
            .expansionStrategy
      },
      csrAdapter: {
        name: LocalCSRDiscoveryAdapter.name,
        version: LocalCSRDiscoveryAdapter.version,
        buildId: LocalCSRDiscoveryAdapter.buildId,
        registered: adapters.some(
          adapter =>
            adapter.id === LocalCSRDiscoveryAdapter.id
        ),
        currentOperatingAreas:
          LocalCSRDiscoveryAdapter.defaultGeography
            .currentOperatingAreas,
        channelCount:
          LocalCSRDiscoveryAdapter.csrChannels.length
      },
      communityFoundationAdapter: {
        name: CommunityFoundationDiscoveryAdapter.name,
        version: CommunityFoundationDiscoveryAdapter.version,
        buildId: CommunityFoundationDiscoveryAdapter.buildId,
        registered: adapters.some(
          adapter =>
            adapter.id ===
              CommunityFoundationDiscoveryAdapter.id
        ),
        currentOperatingAreas:
          CommunityFoundationDiscoveryAdapter
            .defaultGeography.currentOperatingAreas,
        missionDomains:
          CommunityFoundationDiscoveryAdapter
            .missionDomains,
        foundationChannels:
          CommunityFoundationDiscoveryAdapter
            .foundationChannels
      },
      familyFoundationAdapter: {
        name: FamilyFoundationDiscoveryAdapter.name,
        version: FamilyFoundationDiscoveryAdapter.version,
        buildId: FamilyFoundationDiscoveryAdapter.buildId,
        registered: adapters.some(
          adapter =>
            adapter.id ===
              FamilyFoundationDiscoveryAdapter.id
        ),
        currentOperatingAreas:
          FamilyFoundationDiscoveryAdapter
            .defaultGeography.currentOperatingAreas,
        regionalPriorityAreas:
          FamilyFoundationDiscoveryAdapter
            .defaultGeography.regionalPriorityAreas,
        missionDomains:
          FamilyFoundationDiscoveryAdapter
            .missionDomains,
        foundationChannels:
          FamilyFoundationDiscoveryAdapter
            .foundationChannels
      },
      watershedCoastalAdapter: {
        name:
          WatershedCoastalResourceDiscoveryAdapter.name,
        version:
          WatershedCoastalResourceDiscoveryAdapter.version,
        buildId:
          WatershedCoastalResourceDiscoveryAdapter.buildId,
        registered: adapters.some(
          adapter =>
            adapter.id ===
              WatershedCoastalResourceDiscoveryAdapter.id
        ),
        governingPrinciple:
          WatershedCoastalResourceDiscoveryAdapter
            .governingPrinciple,
        currentOperatingAreas:
          WatershedCoastalResourceDiscoveryAdapter
            .defaultGeography.currentOperatingAreas,
        regionalPriorityAreas:
          WatershedCoastalResourceDiscoveryAdapter
            .defaultGeography.regionalPriorityAreas,
        missionDomains:
          WatershedCoastalResourceDiscoveryAdapter
            .missionDomains,
        resourceChannels:
          WatershedCoastalResourceDiscoveryAdapter
            .resourceChannels
      },
      adapters,
      lastRunAt: resourceDiscoveryIntegrationState.lastRunAt,
      lastResultCount:
        resourceDiscoveryIntegrationState.lastResultCount,
      lastError: resourceDiscoveryIntegrationState.lastError
    });
  } catch (error) {
    response.status(500).json({
      error: "resource_discovery_status_failed",
      message: error?.message || String(error)
    });
  }
});

app.get(
  "/api/resource-discovery/local",
  async (request, response) => {
    try {
      const includeFutureExpansion =
        String(
          request.query.includeFutureExpansion || ""
        ).toLowerCase() === "true";

      const run = await ResourceDiscoveryNetwork.discoverAll({
        adapterIds: [LocalResourceDiscoveryAdapter.id],
        context: {
          geographyProfile:
            LocalResourceDiscoveryAdapter.defaultGeography,
          includeFutureExpansion
        }
      });

      resourceDiscoveryIntegrationState.status =
        run.failedAdapters > 0 ? "degraded" : "online";
      resourceDiscoveryIntegrationState.lastRunAt =
        run.completedAt;
      resourceDiscoveryIntegrationState.lastResultCount =
        run.total;
      resourceDiscoveryIntegrationState.lastError =
        run.failures?.[0]?.message || null;

      response.json({
        schema: "meos.resource-discovery.local.v1",
        version: RESOURCE_DISCOVERY_INTEGRATION_VERSION,
        buildId: RESOURCE_DISCOVERY_INTEGRATION_BUILD_ID,
        status: resourceDiscoveryIntegrationState.status,
        source: {
          id: LocalResourceDiscoveryAdapter.id,
          name: LocalResourceDiscoveryAdapter.name,
          region: LocalResourceDiscoveryAdapter.region
        },
        geography: {
          currentOperatingAreas:
            LocalResourceDiscoveryAdapter.defaultGeography
              .currentOperatingAreas,
          expansionStrategy:
            LocalResourceDiscoveryAdapter.defaultGeography
              .expansionStrategy,
          includeFutureExpansion
        },
        total: run.total,
        failures: run.failures,
        records: run.records
      });
    } catch (error) {
      resourceDiscoveryIntegrationState.status = "degraded";
      resourceDiscoveryIntegrationState.lastError =
        error?.message || String(error);

      response.status(500).json({
        error: "local_resource_discovery_failed",
        message: error?.message || String(error),
        version: RESOURCE_DISCOVERY_INTEGRATION_VERSION,
        buildId: RESOURCE_DISCOVERY_INTEGRATION_BUILD_ID
      });
    }
  }
);

app.get(
  "/api/resource-discovery/csr",
  async (request, response) => {
    try {
      const run = await ResourceDiscoveryNetwork.discoverAll({
        adapterIds: [LocalCSRDiscoveryAdapter.id],
        context: {
          geographyProfile:
            LocalCSRDiscoveryAdapter.defaultGeography
        }
      });

      resourceDiscoveryIntegrationState.status =
        run.failedAdapters > 0 ? "degraded" : "online";
      resourceDiscoveryIntegrationState.lastRunAt =
        run.completedAt;
      resourceDiscoveryIntegrationState.lastResultCount =
        run.total;
      resourceDiscoveryIntegrationState.lastError =
        run.failures?.[0]?.message || null;

      response.json({
        schema: "meos.resource-discovery.csr.v1",
        version: RESOURCE_DISCOVERY_INTEGRATION_VERSION,
        buildId: RESOURCE_DISCOVERY_INTEGRATION_BUILD_ID,
        status: resourceDiscoveryIntegrationState.status,
        source: {
          id: LocalCSRDiscoveryAdapter.id,
          name: LocalCSRDiscoveryAdapter.name,
          region: LocalCSRDiscoveryAdapter.region
        },
        geography: {
          currentOperatingAreas:
            LocalCSRDiscoveryAdapter.defaultGeography
              .currentOperatingAreas,
          expansionStrategy:
            LocalCSRDiscoveryAdapter.defaultGeography
              .expansionStrategy
        },
        csrChannels:
          LocalCSRDiscoveryAdapter.csrChannels,
        total: run.total,
        failures: run.failures,
        records: run.records
      });
    } catch (error) {
      resourceDiscoveryIntegrationState.status = "degraded";
      resourceDiscoveryIntegrationState.lastError =
        error?.message || String(error);

      response.status(500).json({
        error: "local_csr_discovery_failed",
        message: error?.message || String(error),
        version: RESOURCE_DISCOVERY_INTEGRATION_VERSION,
        buildId: RESOURCE_DISCOVERY_INTEGRATION_BUILD_ID
      });
    }
  }
);

app.get(
  "/api/resource-discovery/community-foundations",
  async (request, response) => {
    try {
      const includeFutureExpansion =
        String(
          request.query.includeFutureExpansion || ""
        ).toLowerCase() === "true";

      const run = await ResourceDiscoveryNetwork.discoverAll({
        adapterIds: [
          CommunityFoundationDiscoveryAdapter.id
        ],
        context: {
          geographyProfile:
            CommunityFoundationDiscoveryAdapter
              .defaultGeography,
          includeFutureExpansion
        }
      });

      resourceDiscoveryIntegrationState.status =
        run.failedAdapters > 0 ? "degraded" : "online";
      resourceDiscoveryIntegrationState.lastRunAt =
        run.completedAt;
      resourceDiscoveryIntegrationState.lastResultCount =
        run.total;
      resourceDiscoveryIntegrationState.lastError =
        run.failures?.[0]?.message || null;

      response.json({
        schema:
          "meos.resource-discovery.community-foundations.v1",
        version: RESOURCE_DISCOVERY_INTEGRATION_VERSION,
        buildId: RESOURCE_DISCOVERY_INTEGRATION_BUILD_ID,
        status: resourceDiscoveryIntegrationState.status,
        source: {
          id:
            CommunityFoundationDiscoveryAdapter.id,
          name:
            CommunityFoundationDiscoveryAdapter.name,
          region:
            CommunityFoundationDiscoveryAdapter.region
        },
        geography: {
          currentOperatingAreas:
            CommunityFoundationDiscoveryAdapter
              .defaultGeography.currentOperatingAreas,
          expansionStrategy:
            CommunityFoundationDiscoveryAdapter
              .defaultGeography.expansionStrategy,
          includeFutureExpansion
        },
        missionDomains:
          CommunityFoundationDiscoveryAdapter
            .missionDomains,
        foundationChannels:
          CommunityFoundationDiscoveryAdapter
            .foundationChannels,
        total: run.total,
        failures: run.failures,
        records: run.records
      });
    } catch (error) {
      resourceDiscoveryIntegrationState.status = "degraded";
      resourceDiscoveryIntegrationState.lastError =
        error?.message || String(error);

      response.status(500).json({
        error:
          "community_foundation_discovery_failed",
        message: error?.message || String(error),
        version: RESOURCE_DISCOVERY_INTEGRATION_VERSION,
        buildId: RESOURCE_DISCOVERY_INTEGRATION_BUILD_ID
      });
    }
  }
);

app.get(
  "/api/resource-discovery/family-foundations",
  async (request, response) => {
    try {
      const includeRegional =
        String(
          request.query.includeRegional ?? "true"
        ).toLowerCase() !== "false";

      const includeFutureExpansion =
        String(
          request.query.includeFutureExpansion || ""
        ).toLowerCase() === "true";

      const run = await ResourceDiscoveryNetwork.discoverAll({
        adapterIds: [
          FamilyFoundationDiscoveryAdapter.id
        ],
        context: {
          geographyProfile:
            FamilyFoundationDiscoveryAdapter
              .defaultGeography,
          includeRegional,
          includeFutureExpansion
        }
      });

      resourceDiscoveryIntegrationState.status =
        run.failedAdapters > 0 ? "degraded" : "online";
      resourceDiscoveryIntegrationState.lastRunAt =
        run.completedAt;
      resourceDiscoveryIntegrationState.lastResultCount =
        run.total;
      resourceDiscoveryIntegrationState.lastError =
        run.failures?.[0]?.message || null;

      response.json({
        schema:
          "meos.resource-discovery.family-foundations.v1",
        version: RESOURCE_DISCOVERY_INTEGRATION_VERSION,
        buildId: RESOURCE_DISCOVERY_INTEGRATION_BUILD_ID,
        status: resourceDiscoveryIntegrationState.status,
        source: {
          id:
            FamilyFoundationDiscoveryAdapter.id,
          name:
            FamilyFoundationDiscoveryAdapter.name,
          region:
            FamilyFoundationDiscoveryAdapter.region
        },
        geography: {
          currentOperatingAreas:
            FamilyFoundationDiscoveryAdapter
              .defaultGeography.currentOperatingAreas,
          regionalPriorityAreas:
            FamilyFoundationDiscoveryAdapter
              .defaultGeography.regionalPriorityAreas,
          expansionStrategy:
            FamilyFoundationDiscoveryAdapter
              .defaultGeography.expansionStrategy,
          includeRegional,
          includeFutureExpansion
        },
        missionDomains:
          FamilyFoundationDiscoveryAdapter
            .missionDomains,
        foundationChannels:
          FamilyFoundationDiscoveryAdapter
            .foundationChannels,
        total: run.total,
        failures: run.failures,
        records: run.records
      });
    } catch (error) {
      resourceDiscoveryIntegrationState.status = "degraded";
      resourceDiscoveryIntegrationState.lastError =
        error?.message || String(error);

      response.status(500).json({
        error:
          "family_foundation_discovery_failed",
        message: error?.message || String(error),
        version: RESOURCE_DISCOVERY_INTEGRATION_VERSION,
        buildId: RESOURCE_DISCOVERY_INTEGRATION_BUILD_ID
      });
    }
  }
);

app.get(
  "/api/resource-discovery/watershed-coastal",
  async (request, response) => {
    try {
      const includeRegional =
        String(
          request.query.includeRegional ?? "true"
        ).toLowerCase() !== "false";

      const includeFutureExpansion =
        String(
          request.query.includeFutureExpansion || ""
        ).toLowerCase() === "true";

      const run = await ResourceDiscoveryNetwork.discoverAll({
        adapterIds: [
          WatershedCoastalResourceDiscoveryAdapter.id
        ],
        context: {
          geographyProfile:
            WatershedCoastalResourceDiscoveryAdapter
              .defaultGeography,
          includeRegional,
          includeFutureExpansion
        }
      });

      resourceDiscoveryIntegrationState.status =
        run.failedAdapters > 0 ? "degraded" : "online";
      resourceDiscoveryIntegrationState.lastRunAt =
        run.completedAt;
      resourceDiscoveryIntegrationState.lastResultCount =
        run.total;
      resourceDiscoveryIntegrationState.lastError =
        run.failures?.[0]?.message || null;

      response.json({
        schema:
          "meos.resource-discovery.watershed-coastal.v1",
        version: RESOURCE_DISCOVERY_INTEGRATION_VERSION,
        buildId: RESOURCE_DISCOVERY_INTEGRATION_BUILD_ID,
        status: resourceDiscoveryIntegrationState.status,
        source: {
          id:
            WatershedCoastalResourceDiscoveryAdapter.id,
          name:
            WatershedCoastalResourceDiscoveryAdapter.name,
          region:
            WatershedCoastalResourceDiscoveryAdapter.region
        },
        governingPrinciple:
          WatershedCoastalResourceDiscoveryAdapter
            .governingPrinciple,
        operatingModel:
          WatershedCoastalResourceDiscoveryAdapter
            .operatingModel,
        geography: {
          currentOperatingAreas:
            WatershedCoastalResourceDiscoveryAdapter
              .defaultGeography.currentOperatingAreas,
          regionalPriorityAreas:
            WatershedCoastalResourceDiscoveryAdapter
              .defaultGeography.regionalPriorityAreas,
          expansionStrategy:
            WatershedCoastalResourceDiscoveryAdapter
              .defaultGeography.expansionStrategy,
          includeRegional,
          includeFutureExpansion
        },
        missionDomains:
          WatershedCoastalResourceDiscoveryAdapter
            .missionDomains,
        resourceChannels:
          WatershedCoastalResourceDiscoveryAdapter
            .resourceChannels,
        total: run.total,
        failures: run.failures,
        records: run.records
      });
    } catch (error) {
      resourceDiscoveryIntegrationState.status = "degraded";
      resourceDiscoveryIntegrationState.lastError =
        error?.message || String(error);

      response.status(500).json({
        error:
          "watershed_coastal_resource_discovery_failed",
        message: error?.message || String(error),
        version: RESOURCE_DISCOVERY_INTEGRATION_VERSION,
        buildId: RESOURCE_DISCOVERY_INTEGRATION_BUILD_ID
      });
    }
  }
);

app.get(
  "/api/resource-discovery/california",
  async (request, response) => {
    try {
      const limit = Math.max(
        1,
        Math.min(250, Number(request.query.limit || 25))
      );

      const query = String(request.query.q || "").trim();

      const run = await ResourceDiscoveryNetwork.discoverAll({
        adapterIds: [CaliforniaGrantsPortalAdapter.id],
        context: {
          maxRecords: limit,
          pageSize: Math.min(limit, 100),
          query
        }
      });

      resourceDiscoveryIntegrationState.status =
        run.failedAdapters > 0 ? "degraded" : "online";
      resourceDiscoveryIntegrationState.lastRunAt =
        run.completedAt;
      resourceDiscoveryIntegrationState.lastResultCount =
        run.total;
      resourceDiscoveryIntegrationState.lastError =
        run.failures?.[0]?.message || null;

      response.json({
        schema: "meos.resource-discovery.california.v1",
        version: RESOURCE_DISCOVERY_INTEGRATION_VERSION,
        buildId: RESOURCE_DISCOVERY_INTEGRATION_BUILD_ID,
        status: resourceDiscoveryIntegrationState.status,
        source: {
          id: CaliforniaGrantsPortalAdapter.id,
          name: CaliforniaGrantsPortalAdapter.name,
          region: CaliforniaGrantsPortalAdapter.region
        },
        requestedLimit: limit,
        query,
        total: run.total,
        failures: run.failures,
        records: run.records
      });
    } catch (error) {
      resourceDiscoveryIntegrationState.status = "degraded";
      resourceDiscoveryIntegrationState.lastError =
        error?.message || String(error);

      response.status(500).json({
        error: "california_resource_discovery_failed",
        message: error?.message || String(error),
        version: RESOURCE_DISCOVERY_INTEGRATION_VERSION,
        buildId: RESOURCE_DISCOVERY_INTEGRATION_BUILD_ID
      });
    }
  }
);

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

  try {
    const discovery = registerResourceDiscoveryAdapters();

    console.log(
      `[MEOS] Resource Discovery Integration ` +
        `v${RESOURCE_DISCOVERY_INTEGRATION_VERSION} online. ` +
        `adapters=${discovery.adapters.length}, ` +
        `build=${RESOURCE_DISCOVERY_INTEGRATION_BUILD_ID}.`
    );
  } catch (error) {
    resourceDiscoveryIntegrationState.status = "degraded";
    resourceDiscoveryIntegrationState.lastError =
      error?.message || String(error);

    console.error(
      "[MEOS] Resource Discovery Integration failed to initialize:",
      error
    );
  }

  executiveMemoryStorageStatus().then(status => {
    console.log(
      `[MEOS] Executive Memory v1.0.0 ${status.status}. ` +
        `directory=${status.memoryDirectory}, ` +
        `persistentDiskExpected=${status.persistentDiskExpected}.`
    );
  });

  (async () => {
    try {
      const fundingRegistry =
        await ensureFundingSourceRegistry();

      fundingIntelligenceState.status = "online";

      console.log(
        `[MEOS] Funding Intelligence Network ` +
          `v${FUNDING_INTELLIGENCE_VERSION} registry ready. ` +
          `sources=${fundingRegistry.total}.`
      );

      console.log(
        `[MEOS] Autonomous Executive Qualification ` +
          `v${FUNDING_QUALIFICATION_VERSION} ready.`
      );
    } catch (error) {
      fundingIntelligenceState.status = "degraded";
      fundingIntelligenceState.lastError =
        error?.message || String(error);

      console.error(
        "[MEOS] Funding Intelligence registry failed to initialize:",
        error
      );
    }

    try {
      const resourceStatus =
        await executiveResourceDevelopmentOffice
          .initialize();

      console.log(
        `[MEOS] Executive Resource Development Office ` +
          `v${resourceStatus.version} ${resourceStatus.status}. ` +
          `portfolio=${resourceStatus.portfolioTotal}, ` +
          `desk=${resourceStatus.executiveDeskTotal}.`
      );
    } catch (error) {
      console.error(
        "[MEOS] Executive Resource Development Office failed to initialize:",
        error
      );
    }

    try {
      const runtimeStatus =
        await startContinuousOperationsRuntime();

      console.log(
        `[MEOS] Continuous Operations Runtime ` +
          `v${CONTINUOUS_OPERATIONS_VERSION} ${runtimeStatus.status}. ` +
          `enabled=${runtimeStatus.enabled}, ` +
          `tickMs=${runtimeStatus.tickMs || 0}.`
      );
    } catch (error) {
      continuousOperationsState.status = "degraded";
      continuousOperationsState.lastError =
        error?.message || String(error);

      console.error(
        "[MEOS] Continuous Operations Runtime failed to start:",
        error
      );
    }
  })();
});
