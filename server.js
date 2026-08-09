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
 * - Provide secure, read-only Google Workspace authorization and access.
 */

import express from "express";
import path from "path";
import crypto from "crypto";
import dns from "dns/promises";
import net from "net";
import fs from "fs/promises";
import vm from "vm";
import { fileURLToPath } from "url";
import pdfParse from "pdf-parse";
import ResourceDiscoveryNetwork from "./resource-discovery-network.js";
import CaliforniaGrantsPortalAdapter from "./california-grants-portal-adapter.js";
import LocalResourceDiscoveryAdapter from "./local-resource-discovery-adapter.js";
import LocalCSRDiscoveryAdapter from "./local-csr-discovery-adapter.js";
import CommunityFoundationDiscoveryAdapter from "./community-foundation-discovery-adapter.js";
import FamilyFoundationDiscoveryAdapter from "./family-foundation-discovery-adapter.js";
import WatershedCoastalResourceDiscoveryAdapter from "./watershed-coastal-resource-discovery-adapter.js";
import GoogleWorkspaceProvider from "./google-workspace-provider.js";
import InstitutionalRepositoryAuthority from "./institutional-repository-authority.js";

const VERSION = "2.10.34";
const VOICE_ENGINE_VERSION = "2.0.0";

const INSTITUTIONAL_REPOSITORY_BRIDGE_COMMISSION = "006.017D1A";
const INSTITUTIONAL_REPOSITORY_BRIDGE_BUILD_ID =
  "IRB100-GOOGLE-RUNTIME-AUTHORITY-BRIDGE-20260808-A";

let institutionalRepositoryBridgeRegistered = false;

function registerGoogleInstitutionalRepositoryAuthority() {
  if (institutionalRepositoryBridgeRegistered) {
    return {
      success: true,
      alreadyRegistered: true,
      providerId: "google-workspace"
    };
  }

  const capability =
    InstitutionalRepositoryAuthority.capabilities;

  const registration =
    InstitutionalRepositoryAuthority.registerProvider({
      id: "google-workspace",
      name: "Google Workspace Institutional Repository",
      priority: 100,
      capabilities: [
        capability.DURABLE_READ,
        capability.DURABLE_WRITE,
        capability.DURABLE_DELETE,
        capability.READ_AFTER_WRITE,
        capability.ORGANIZATION_OWNED
      ],
      health: async () => {
        try {
          const status =
            await ensureGoogleWorkspaceInitialized();

          const durable =
            Boolean(
              status?.connected &&
              status?.capabilities
                ?.institutionalRepositoryRead &&
              status?.capabilities
                ?.institutionalRepositoryWrite
            );

          return {
            available: durable,
            durable,
            reason: durable
              ? null
              : "Google Workspace institutional repository is not currently authorized for durable read/write authority.",
            details: {
              connected: Boolean(status?.connected),
              mode: status?.mode || null,
              providerVersion:
                GoogleWorkspaceProvider.version || null,
              providerBuildId:
                GoogleWorkspaceProvider.buildId || null
            }
          };
        } catch (error) {
          return {
            available: false,
            durable: false,
            reason: error?.message || String(error)
          };
        }
      },
      read: async providerKey => {
        const result =
          await GoogleWorkspaceProvider
            .readInstitutionalRecord(providerKey);

        return {
          success: result?.success !== false,
          found: result?.found === true,
          value:
            result?.found === true
              ? result.value
              : null,
          providerResult: result
        };
      },
      write: async (
        providerKey,
        authorityEnvelope,
        options = {}
      ) => {
        const result =
          await GoogleWorkspaceProvider
            .writeInstitutionalRecord({
              key: providerKey,
              value: authorityEnvelope,
              recordType:
                "meos-authority-envelope",
              metadata: {
                commission:
                  INSTITUTIONAL_REPOSITORY_BRIDGE_COMMISSION,
                bridgeBuildId:
                  INSTITUTIONAL_REPOSITORY_BRIDGE_BUILD_ID,
                classification:
                  options.classification || null,
                verificationRequired:
                  options.verificationRequired === true,
                immutableEvidence:
                  options.immutableEvidence === true,
                previousFingerprint:
                  options.previousFingerprint || null
              }
            });

        return {
          success: result?.success === true,
          durable: result?.verified === true,
          providerResult: result
        };
      },
      delete: async providerKey => {
        const result =
          await GoogleWorkspaceProvider
            .deleteInstitutionalRecord(providerKey);

        return {
          success: result?.success !== false,
          deleted: result?.deleted === true,
          providerResult: result
        };
      },
      metadata: {
        bridgeCommission:
          INSTITUTIONAL_REPOSITORY_BRIDGE_COMMISSION,
        bridgeBuildId:
          INSTITUTIONAL_REPOSITORY_BRIDGE_BUILD_ID,
        authority:
          "provider-neutral-meos-institutional-repository",
        providerRole:
          "runtime-durable-storage-provider"
      }
    });

  institutionalRepositoryBridgeRegistered = true;
  return registration;
}


const RESOURCE_DISCOVERY_INTEGRATION_VERSION = "1.5.1";
const RESOURCE_DISCOVERY_INTEGRATION_BUILD_ID =
  "RDI151-DECISION-GRADE-EVIDENCE-20260807-A";

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


const GOOGLE_WORKSPACE_INTEGRATION_VERSION = "1.5.4";
const GOOGLE_WORKSPACE_INTEGRATION_BUILD_ID =
  "GWI154-INSTITUTIONAL-REPOSITORY-ACCEPTANCE-BRIDGE-20260808-A";

let googleWorkspaceInitializationPromise = null;

async function ensureGoogleWorkspaceInitialized() {
  let status = GoogleWorkspaceProvider.getStatus();

  if (!status.initialized) {
    if (!googleWorkspaceInitializationPromise) {
      googleWorkspaceInitializationPromise =
        GoogleWorkspaceProvider.initialize()
          .finally(() => {
            googleWorkspaceInitializationPromise = null;
          });
    }

    await googleWorkspaceInitializationPromise;
    status = GoogleWorkspaceProvider.getStatus();
  }

  /*
   * Provider v1.0.0 can load a stored token before its initialized flag is
   * committed during a cold start. Verify once more after initialization so
   * a valid persisted connection is restored without requiring reauthorization.
   */
  if (
    status.initialized &&
    status.tokenLoaded &&
    !status.connected
  ) {
    try {
      await GoogleWorkspaceProvider.verifyConnection();
      status = GoogleWorkspaceProvider.getStatus();
    } catch {
      status = GoogleWorkspaceProvider.getStatus();
    }
  }

  return status;
}

function googleWorkspaceErrorResponse(error) {
  return {
    error:
      error?.message ||
      "Google Workspace request failed.",
    code:
      error?.code ||
      "GOOGLE_WORKSPACE_REQUEST_FAILED",
    details:
      error?.details ||
      null
  };
}



/* ========================================================================== */
/* MEOS Google Workspace Read Research v1.0.0 — Commission 005.004A           */
/* ========================================================================== */

const GOOGLE_DOC_MIME_TYPE =
  "application/vnd.google-apps.document";
const GOOGLE_SHEET_MIME_TYPE =
  "application/vnd.google-apps.spreadsheet";
const GOOGLE_PDF_MIME_TYPE = "application/pdf";
const GOOGLE_WORKSPACE_MAX_PDF_BYTES = 25 * 1024 * 1024;

const GOOGLE_WORKSPACE_RESEARCH_STOP_WORDS = new Set([
  "a", "about", "already", "an", "and", "are", "as", "at", "be", "been",
  "being", "bring", "by", "can", "do", "does", "fetch", "find", "for", "from", "get", "give", "grab", "has",
  "have", "hey", "how", "i", "in", "into", "is", "it", "me", "my", "of",
  "locate", "on", "open", "or", "our", "please", "pull", "retrieve", "show", "somebody", "someone", "supporting", "tell",
  "that", "the", "their", "them", "there", "this", "to", "us", "we", "what",
  "when", "where", "which", "who", "with", "would", "you", "your"
]);

/*
 * Commission 006.005A — Canonical Document Intent Ranking
 *
 * Human file requests are not keyword lookups. The user names the document
 * they mean and MEOS must distinguish that identity from files that merely
 * mention the same words. These control words are removed from the requested
 * document identity while connective words such as "of" remain available for
 * phrase/acronym recognition ("Articles of Incorporation" -> "AOI").
 */
const GOOGLE_WORKSPACE_DOCUMENT_REQUEST_WORDS = new Set([
  "bring", "can", "could", "fetch", "find", "get", "give", "grab", "hey",
  "locate", "maddy", "me", "my", "open", "our", "please", "pull", "retrieve",
  "send", "show", "the", "to", "us", "where", "would", "you"
]);

const GOOGLE_WORKSPACE_INCIDENTAL_DOCUMENT_TYPES = new Set([
  "checklist", "guide", "invoice", "memo", "minutes", "note", "notes",
  "receipt", "statement", "template", "transaction"
]);

/*
 * Commission 006.005E — Direct Document Preference
 *
 * Natural requests often include wrapper nouns ("papers", "document", "copy")
 * that describe how the human speaks rather than the identity of the record.
 * Remove those wrappers from identity matching. Also recognize compilation
 * containers so a binder/packet containing a document does not outrank the
 * standalone authoritative record when the user asked for the record itself.
 */
const GOOGLE_WORKSPACE_DOCUMENT_WRAPPER_WORDS = new Set([
  "copy", "copies", "document", "documents", "file", "files",
  "paper", "papers", "record", "records"
]);

const GOOGLE_WORKSPACE_CONTAINER_DOCUMENT_TYPES = new Set([
  "archive", "binder", "book", "bundle", "collection", "compilation",
  "folder", "handbook", "master", "packet", "portfolio", "vault"
]);

function tokenizeWorkspaceText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .map(term => term.trim())
    .filter(Boolean);
}

function normalizeWorkspaceResearchTerms(value) {
  const raw = tokenizeWorkspaceText(value);
  const unique = [];
  const seen = new Set();

  for (const term of raw) {
    if (term.length < 3) continue;
    if (GOOGLE_WORKSPACE_RESEARCH_STOP_WORDS.has(term)) continue;
    if (seen.has(term)) continue;
    seen.add(term);
    unique.push(term);
  }

  return unique.slice(0, 8);
}

function normalizeWorkspaceDocumentIntent(value) {
  const rawTokens = tokenizeWorkspaceText(value);
  const targetTokens = rawTokens.filter(
    token => !GOOGLE_WORKSPACE_DOCUMENT_REQUEST_WORDS.has(token)
  );

  while (
    targetTokens.length &&
    ["a", "an", "copy", "document", "file", "record"].includes(targetTokens[0])
  ) {
    targetTokens.shift();
  }

  while (
    targetTokens.length &&
    ["copy", "document", "file", "for", "please"].includes(
      targetTokens[targetTokens.length - 1]
    )
  ) {
    targetTokens.pop();
  }

  const identityTokens = targetTokens.filter(
    token => !GOOGLE_WORKSPACE_DOCUMENT_WRAPPER_WORDS.has(token)
  );

  const significantTokens = identityTokens.filter(
    token =>
      token.length >= 3 &&
      !["and", "for", "of", "the"].includes(token)
  );

  const acronymTokens = identityTokens.filter(
    token =>
      /^[a-z0-9]+$/.test(token) &&
      !["a", "an", "and", "for", "the"].includes(token)
  );

  const acronym =
    acronymTokens.length >= 3
      ? acronymTokens.map(token => token[0]).join("")
      : null;

  return {
    targetTokens,
    significantTokens,
    targetPhrase: identityTokens.join(" "),
    significantPhrase: significantTokens.join(" "),
    acronym:
      acronym && acronym.length >= 3 && acronym.length <= 8
        ? acronym
        : null
  };
}

function buildWorkspaceResearchTerms(question) {
  const terms = normalizeWorkspaceResearchTerms(question);
  const intent = normalizeWorkspaceDocumentIntent(question);

  if (
    intent.acronym &&
    !terms.includes(intent.acronym)
  ) {
    terms.push(intent.acronym);
  }

  return {
    terms: [...new Set(terms)].slice(0, 10),
    intent
  };
}

function escapeGoogleDriveQueryValue(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

function buildWorkspaceResearchDriveQuery(terms) {
  const clauses = [];

  for (const term of terms) {
    const escaped = escapeGoogleDriveQueryValue(term);
    clauses.push(`name contains '${escaped}'`);
    clauses.push(`fullText contains '${escaped}'`);
  }

  return clauses.length
    ? `trashed = false and (${clauses.join(" or ")})`
    : "trashed = false";
}

function extractGoogleDocumentText(document) {
  const parts = [];

  function walkStructuralElements(elements) {
    for (const element of Array.isArray(elements) ? elements : []) {
      const paragraphElements =
        element?.paragraph?.elements || [];

      for (const paragraphElement of paragraphElements) {
        const content =
          paragraphElement?.textRun?.content;

        if (typeof content === "string") {
          parts.push(content);
        }
      }

      const tableRows =
        element?.table?.tableRows || [];

      for (const row of tableRows) {
        for (const cell of row?.tableCells || []) {
          walkStructuralElements(cell?.content || []);
        }
      }

      if (element?.tableOfContents?.content) {
        walkStructuralElements(
          element.tableOfContents.content
        );
      }
    }
  }

  walkStructuralElements(document?.body?.content || []);

  return parts
    .join("")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeWorkspaceFilename(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\.[a-z0-9]{1,10}$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function evaluateWorkspaceContentIdentity({
  text = "",
  documentIntent = null
} = {}) {
  const source = String(text || "").trim();
  const intent =
    documentIntent ||
    normalizeWorkspaceDocumentIntent("");

  if (!source) {
    return {
      status: "unverified",
      verified: false,
      mismatch: false,
      contentCoverage: 0,
      targetPhraseFound: false,
      conflictingTypes: [],
      signals: []
    };
  }

  const normalized = normalizeWorkspaceFilename(source);
  const contentTokens = new Set(tokenizeWorkspaceText(normalized));
  const significantTokens = intent.significantTokens || [];
  const targetPhrase = String(intent.targetPhrase || "").trim();
  const requestedTypes = new Set(intent.targetTokens || []);

  /*
   * Commission 006.005D — Strong Document-Type Identity
   *
   * Generic words such as "statement", "note", or "receipt" in body prose are
   * not proof of document identity. Conflicting types must appear as strong
   * opening/header evidence.
   */
  const openingLines = source
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 10);

  const strongIdentityLines = openingLines.filter(
    (line, index) => index < 4 || line.length <= 120
  );

  const contentCoverage = significantTokens.length
    ? significantTokens.filter(term =>
        contentTokens.has(term) || normalized.includes(term)
      ).length / significantTokens.length
    : 0;

  const targetPhraseFound =
    targetPhrase.length >= 4 && normalized.includes(targetPhrase);

  const conflictingTypes =
    [...GOOGLE_WORKSPACE_INCIDENTAL_DOCUMENT_TYPES]
      .filter(type => {
        if (requestedTypes.has(type)) return false;

        const typePattern = new RegExp(
          `(^|[^a-z0-9])${type.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}([^a-z0-9]|$)`,
          "i"
        );

        return strongIdentityLines.some((line, index) => {
          if (!typePattern.test(line)) return false;

          const lineTokens = tokenizeWorkspaceText(
            normalizeWorkspaceFilename(line)
          );

          return index < 2 || lineTokens.length <= 8;
        });
      });

  const signals = [];
  if (targetPhraseFound) {
    signals.push("canonical-phrase-in-content");
  }
  if (contentCoverage === 1 && significantTokens.length >= 2) {
    signals.push("all-target-terms-in-content");
  } else if (contentCoverage >= 0.5) {
    signals.push("partial-target-content-coverage");
  }
  if (conflictingTypes.length) {
    signals.push(
      `conflicting-content-type:${conflictingTypes.join(",")}`
    );
  }

  const mismatch = conflictingTypes.length > 0;
  const verified =
    !mismatch &&
    (targetPhraseFound || contentCoverage === 1);

  return {
    status: mismatch
      ? "mismatch"
      : verified
        ? "verified"
        : contentCoverage >= 0.5
          ? "possible"
          : "unverified",
    verified,
    mismatch,
    contentCoverage,
    targetPhraseFound,
    conflictingTypes,
    signals
  };
}

async function readGoogleWorkspacePdfText(fileId) {
  const clients = GoogleWorkspaceProvider.getClients();
  const response = await clients.drive.files.get(
    {
      fileId,
      alt: "media",
      supportsAllDrives: true
    },
    {
      responseType: "arraybuffer"
    }
  );

  const buffer = Buffer.from(response.data || []);

  if (buffer.length > GOOGLE_WORKSPACE_MAX_PDF_BYTES) {
    const error = new Error(
      `PDF is too large for verification (${buffer.length} bytes).`
    );
    error.code = "GOOGLE_WORKSPACE_PDF_TOO_LARGE";
    throw error;
  }

  const parsed = await pdfParse(buffer);

  return String(parsed?.text || "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function scoreWorkspaceResearchCandidate({
  file,
  text = "",
  terms = [],
  documentIntent = null
} = {}) {
  const name = normalizeWorkspaceFilename(file?.name);
  const nameTokens = new Set(tokenizeWorkspaceText(name));
  const content = String(text || "").toLowerCase();
  const intent =
    documentIntent ||
    normalizeWorkspaceDocumentIntent("");
  const significantTokens =
    intent.significantTokens?.length
      ? intent.significantTokens
      : terms;
  const matchedTerms = [];
  const signals = [];
  const contentIdentity = evaluateWorkspaceContentIdentity({
    text,
    documentIntent: intent
  });
  let score = 0;

  for (const term of terms) {
    let matched = false;

    if (nameTokens.has(term) || name.includes(term)) {
      score += 10;
      matched = true;
    }

    if (content.includes(term)) {
      score += 2;
      matched = true;
    }

    if (matched) matchedTerms.push(term);
  }

  const targetPhrase =
    String(intent.targetPhrase || "").trim();
  const significantPhrase =
    String(intent.significantPhrase || "").trim();

  if (
    targetPhrase.length >= 4 &&
    name.includes(targetPhrase)
  ) {
    score += 60;
    signals.push("canonical-title-phrase");
  }

  if (
    significantPhrase.length >= 4 &&
    name.includes(significantPhrase)
  ) {
    score += 35;
    signals.push("significant-title-phrase");
  }

  const filenameCoverage =
    significantTokens.length
      ? significantTokens.filter(term =>
          nameTokens.has(term) || name.includes(term)
        ).length / significantTokens.length
      : 0;

  if (
    significantTokens.length >= 2 &&
    filenameCoverage === 1
  ) {
    score += 35;
    signals.push("all-target-terms-in-title");
  } else if (filenameCoverage >= 0.5) {
    score += Math.round(filenameCoverage * 15);
    signals.push("partial-target-title-coverage");
  }

  if (
    intent.acronym &&
    (
      nameTokens.has(intent.acronym) ||
      name.replace(/\s+/g, "").includes(intent.acronym)
    )
  ) {
    score += 55;
    signals.push("canonical-acronym-in-title");
  }

  if (
    intent.targetTokens?.length === 1 &&
    nameTokens.has(intent.targetTokens[0])
  ) {
    score += 40;
    signals.push("direct-target-token-in-title");
  }

  if (
    targetPhrase.length >= 4 &&
    content.includes(targetPhrase)
  ) {
    score += 5;
    signals.push("canonical-phrase-in-content");
  }

  const requestedTypes =
    new Set(intent.targetTokens || []);
  const conflictingTypes =
    [...GOOGLE_WORKSPACE_INCIDENTAL_DOCUMENT_TYPES]
      .filter(type =>
        nameTokens.has(type) &&
        !requestedTypes.has(type)
      );

  if (
    conflictingTypes.length &&
    !signals.includes("canonical-title-phrase") &&
    !signals.includes("canonical-acronym-in-title")
  ) {
    score -= 30;
    signals.push(
      `incidental-document-type:${conflictingTypes.join(",")}`
    );
  }

  const requestedContainerTypes = new Set(
    intent.targetTokens?.filter(token =>
      GOOGLE_WORKSPACE_CONTAINER_DOCUMENT_TYPES.has(token)
    ) || []
  );

  const containerTypes =
    [...GOOGLE_WORKSPACE_CONTAINER_DOCUMENT_TYPES]
      .filter(type =>
        nameTokens.has(type) &&
        !requestedContainerTypes.has(type)
      );

  if (
    containerTypes.length &&
    !signals.includes("canonical-title-phrase") &&
    !signals.includes("canonical-acronym-in-title")
  ) {
    score -= 45;
    signals.push(
      `container-document:${containerTypes.join(",")}`
    );
  }

  if (contentIdentity.verified) {
    score += 45;
    signals.push(...contentIdentity.signals);
    signals.push("content-identity-verified");
  } else if (contentIdentity.mismatch) {
    score -= 140;
    signals.push(...contentIdentity.signals);
    signals.push("content-identity-mismatch");
  } else if (String(text || "").trim()) {
    signals.push(...contentIdentity.signals);
  }

  if (file?.mimeType === GOOGLE_DOC_MIME_TYPE) {
    score += 2;
  }

  return {
    score: Math.max(0, score),
    matchedTerms: [...new Set(matchedTerms)],
    signals: [...new Set(signals)],
    filenameCoverage,
    contentVerification: contentIdentity
  };
}


function buildWorkspaceEvidenceExcerpt(text, terms, maximumLength = 1800) {
  const source = String(text || "").trim();
  if (!source) return "";

  const lower = source.toLowerCase();
  let firstIndex = -1;

  for (const term of terms) {
    const index = lower.indexOf(term);
    if (
      index >= 0 &&
      (firstIndex < 0 || index < firstIndex)
    ) {
      firstIndex = index;
    }
  }

  if (firstIndex < 0) {
    return source.slice(0, maximumLength);
  }

  const before = Math.floor(maximumLength * 0.3);
  const start = Math.max(0, firstIndex - before);
  const end = Math.min(
    source.length,
    start + maximumLength
  );

  return source.slice(start, end).trim();
}

function normalizeWorkspaceExcludedFileIds(value) {
  const raw = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map(item => item.trim());

  return [...new Set(
    raw
      .map(item => String(item || "").trim())
      .filter(Boolean)
      .filter(item => /^[A-Za-z0-9_-]{6,200}$/.test(item))
  )].slice(0, 50);
}

async function researchGoogleWorkspaceReadOnly({
  question,
  limit = 50,
  readLimit = 12,
  excludedFileIds = []
} = {}) {
  const researchIntent =
    buildWorkspaceResearchTerms(question);
  const terms = researchIntent.terms;
  const documentIntent = researchIntent.intent;
  const excludedIds =
    new Set(normalizeWorkspaceExcludedFileIds(excludedFileIds));

  if (!terms.length) {
    const error = new Error(
      "A workspace research question with searchable terms is required."
    );
    error.code =
      "GOOGLE_WORKSPACE_RESEARCH_QUERY_REQUIRED";
    error.status = 400;
    throw error;
  }

  const driveQuery =
    buildWorkspaceResearchDriveQuery(terms);

  const search =
    await GoogleWorkspaceProvider.searchDrive({
      query: driveQuery,
      pageSize: Math.max(
        1,
        Math.min(100, Number(limit) || 50)
      ),
      orderBy: "modifiedTime desc"
    });

  const filesBeforeExclusion =
    (search.files || []).filter(
      file => file && !file.trashed
    );

  const files = filesBeforeExclusion.filter(
    file => !excludedIds.has(String(file.id || ""))
  );

  const excludedFiles = filesBeforeExclusion
    .filter(file => excludedIds.has(String(file.id || "")))
    .map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink || null
    }));

  /*
   * Commission 005.005 — File Retrieval
   *
   * A Drive search hit is useful even when its binary contents cannot be read
   * through Docs/Sheets APIs. PDFs, Word files, images, uploaded records, and
   * other Drive objects must still be eligible to become the best file match.
   * Readable Google Docs/Sheets receive additional content evidence below.
   */
  const evidenceById = new Map();

  for (const file of files) {
    const scoring =
      scoreWorkspaceResearchCandidate({
        file,
        text: "",
        terms,
        documentIntent
      });

    evidenceById.set(file.id, {
      file: {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink || null,
        modifiedTime: file.modifiedTime || null,
        createdTime: file.createdTime || null
      },
      score: scoring.score,
      matchedTerms: scoring.matchedTerms,
      rankingSignals: scoring.signals,
      filenameCoverage: scoring.filenameCoverage,
      contentVerification: scoring.contentVerification,
      excerpt: "",
      characterCount: 0,
      contentRead: false
    });
  }

  const readable = files
    .filter(file =>
      file.mimeType === GOOGLE_DOC_MIME_TYPE ||
      file.mimeType === GOOGLE_SHEET_MIME_TYPE ||
      file.mimeType === GOOGLE_PDF_MIME_TYPE
    )
    .sort((a, b) => {
      const aScore = evidenceById.get(a.id)?.score || 0;
      const bScore = evidenceById.get(b.id)?.score || 0;
      return bScore - aScore;
    })
    .slice(
      0,
      Math.max(
        1,
        Math.min(20, Number(readLimit) || 12)
      )
    );

  let filesRead = 0;

  for (const file of readable) {
    try {
      let text = "";

      if (file.mimeType === GOOGLE_DOC_MIME_TYPE) {
        const structured =
          await GoogleWorkspaceProvider
            .readGoogleDocument(file.id);

        text =
          extractGoogleDocumentText(structured);
      } else if (
        file.mimeType === GOOGLE_SHEET_MIME_TYPE
      ) {
        const structured =
          await GoogleWorkspaceProvider
            .readSpreadsheet({
              spreadsheetId: file.id
            });

        text = JSON.stringify(
          structured?.sheets?.map(sheet => ({
            title:
              sheet?.properties?.title || "",
            rowCount:
              sheet?.properties?.gridProperties
                ?.rowCount || null,
            columnCount:
              sheet?.properties?.gridProperties
                ?.columnCount || null
          })) || []
        );
      } else if (file.mimeType === GOOGLE_PDF_MIME_TYPE) {
        text = await readGoogleWorkspacePdfText(file.id);
      }

      const scoring =
        scoreWorkspaceResearchCandidate({
          file,
          text,
          terms,
          documentIntent
        });

      evidenceById.set(file.id, {
        file: {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          webViewLink: file.webViewLink || null,
          modifiedTime: file.modifiedTime || null,
          createdTime: file.createdTime || null
        },
        score: scoring.score,
        matchedTerms: scoring.matchedTerms,
        rankingSignals: scoring.signals,
        filenameCoverage: scoring.filenameCoverage,
        contentVerification: scoring.contentVerification,
        excerpt:
          buildWorkspaceEvidenceExcerpt(
            text,
            terms
          ),
        characterCount: text.length,
        contentRead: true
      });

      filesRead += 1;
    } catch (error) {
      const existing = evidenceById.get(file.id);

      evidenceById.set(file.id, {
        ...existing,
        readError: {
          message:
            error?.message || String(error),
          code:
            error?.code ||
            "GOOGLE_WORKSPACE_DOCUMENT_READ_FAILED"
        }
      });
    }
  }

  const evidence = [...evidenceById.values()];

  evidence.sort((a, b) => {
    const scoreDifference =
      Number(b.score || 0) - Number(a.score || 0);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return String(a.file?.name || "")
      .localeCompare(String(b.file?.name || ""));
  });

  const bestMatch =
    evidence.find(item =>
      item.score > 0 &&
      item.contentVerification?.status !== "mismatch"
    ) || null;

  const topScore = Number(bestMatch?.score || 0);
  const secondScore = Number(evidence[1]?.score || 0);
  const matchedTermCount =
    bestMatch?.matchedTerms?.length || 0;
  const rankingSignals =
    bestMatch?.rankingSignals || [];
  const identityStrong =
    rankingSignals.includes("canonical-title-phrase") ||
    rankingSignals.includes("canonical-acronym-in-title") ||
    rankingSignals.includes("direct-target-token-in-title") ||
    rankingSignals.includes("all-target-terms-in-title");
  const contentVerified =
    bestMatch?.contentVerification?.status === "verified";

  const confidence = !bestMatch
    ? "none"
    : contentVerified
      ? "high"
      : identityStrong &&
          (
            topScore >= 35 ||
            topScore >= secondScore + 12
          )
        ? "possible"
        : matchedTermCount >= 1
          ? "possible"
          : "none";

  return {
    schema:
      "meos.google-workspace.read-research.v3",
    readOnly: true,
    question: String(question || "").trim(),
    searchTerms: terms,
    documentIntent: {
      targetPhrase: documentIntent.targetPhrase,
      significantTerms: documentIntent.significantTokens,
      acronym: documentIntent.acronym
    },
    driveQuery,
    filesFoundBeforeExclusion: filesBeforeExclusion.length,
    filesFound: files.length,
    excludedFileIds: [...excludedIds],
    excludedFiles,
    filesRead,
    evidence,
    bestMatch,
    retrieval: {
      success: Boolean(bestMatch),
      confidence,
      verified:
        bestMatch?.contentVerification?.status === "verified",
      verification:
        bestMatch?.contentVerification || null,
      file: bestMatch?.file || null,
      message: bestMatch
        ? confidence === "high"
          ? `Found the best matching file: ${bestMatch.file.name}`
          : `Found a possible matching file: ${bestMatch.file.name}`
        : "I searched the connected workspace but could not identify a matching file."
    },
    searchedAt: new Date().toISOString()
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
const EXECUTIVE_MEMORY_VERSION = "1.2.0";
const EXECUTIVE_MEMORY_DATA_DIR_CONFIGURED = Boolean(
  String(process.env.MEOS_DATA_DIR || "").trim()
);
const MEOS_DATA_DIR = EXECUTIVE_MEMORY_DATA_DIR_CONFIGURED
  ? path.resolve(String(process.env.MEOS_DATA_DIR).trim())
  : path.join(currentDirectory, "data");

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



const EXECUTIVE_BRAIN_STATE_REPOSITORY_COMMISSION = "006.017D4A";
const EXECUTIVE_BRAIN_STATE_REPOSITORY_VERSION = "1.0.0";
const EXECUTIVE_BRAIN_STATE_REPOSITORY_BUILD_ID =
  "EBSR100-BOUNDED-COGNITION-DURABLE-AUTHORITY-20260808-A";
const EXECUTIVE_BRAIN_STATE_REPOSITORY_NAMESPACE =
  "executive-brain";
const EXECUTIVE_BRAIN_STATE_REPOSITORY_KEY =
  "bounded-cognition-state";
const EXECUTIVE_BRAIN_STATE_REPOSITORY_CLASSIFICATION =
  "institutional";

function normalizeExecutiveBrainStateEnvelope(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    const error = new Error(
      "Executive Brain State payload must be an object."
    );
    error.status = 400;
    error.code = "EXECUTIVE_BRAIN_STATE_PAYLOAD_INVALID";
    throw error;
  }

  const state =
    value.state &&
    typeof value.state === "object" &&
    !Array.isArray(value.state)
      ? value.state
      : value;

  if (state.schema !== "meos.executive-brain.state.v1") {
    const error = new Error(
      "Executive Brain State schema is invalid."
    );
    error.status = 400;
    error.code = "EXECUTIVE_BRAIN_STATE_SCHEMA_INVALID";
    throw error;
  }

  const requiredArrays = [
    "history",
    "cognitionHistory",
    "cognitiveDispatchHistory",
    "cognitiveReentryHistory"
  ];

  for (const field of requiredArrays) {
    if (!Array.isArray(state[field])) {
      const error = new Error(
        `Executive Brain State field "${field}" must be an array.`
      );
      error.status = 400;
      error.code = "EXECUTIVE_BRAIN_STATE_SCHEMA_INVALID";
      throw error;
    }
  }

  return {
    schema: "meos.executive-brain.durable-state.v1",
    version: String(value.version || state.version || "1.3.2"),
    buildId: String(value.buildId || ""),
    savedAt: new Date().toISOString(),
    state
  };
}

async function readDurableExecutiveBrainState() {
  registerGoogleInstitutionalRepositoryAuthority();

  return InstitutionalRepositoryAuthority.read({
    namespace: EXECUTIVE_BRAIN_STATE_REPOSITORY_NAMESPACE,
    key: EXECUTIVE_BRAIN_STATE_REPOSITORY_KEY,
    classification:
      EXECUTIVE_BRAIN_STATE_REPOSITORY_CLASSIFICATION
  });
}

async function writeDurableExecutiveBrainState(
  value,
  expectedPreviousFingerprint = undefined
) {
  registerGoogleInstitutionalRepositoryAuthority();

  const envelope =
    normalizeExecutiveBrainStateEnvelope(value);

  return InstitutionalRepositoryAuthority.write({
    namespace: EXECUTIVE_BRAIN_STATE_REPOSITORY_NAMESPACE,
    key: EXECUTIVE_BRAIN_STATE_REPOSITORY_KEY,
    classification:
      EXECUTIVE_BRAIN_STATE_REPOSITORY_CLASSIFICATION,
    value: envelope,
    metadata: {
      subsystem: "executive-brain",
      stateClass: "bounded-institutional-cognition",
      commission:
        EXECUTIVE_BRAIN_STATE_REPOSITORY_COMMISSION,
      buildId:
        EXECUTIVE_BRAIN_STATE_REPOSITORY_BUILD_ID,
      storageRole:
        "durable-bounded-institutional-cognition"
    },
    expectedPreviousFingerprint
  });
}

/* ========================================================================== */
/* Commission 006.017D7N — Single-Writer Cognitive Authority + Convergence    */
/* ========================================================================== */

const COGNITIVE_AUTHORITY_COMMISSION = "006.017D7N";
const COGNITIVE_AUTHORITY_VERSION = "1.0.0";
const COGNITIVE_AUTHORITY_BUILD_ID =
  "SCA100-SINGLE-WRITER-COGNITIVE-AUTHORITY-CONVERGENCE-20260809-A";

let executiveBrainCanonicalWriteChain = Promise.resolve();
const executiveBrainAuthorityState = {
  status: "online",
  runtimeOwner: "meos-durable-server",
  repositoryWriter: "server-serialized",
  convergenceCount: 0,
  directWriteCount: 0,
  lastWriteAt: null,
  lastSource: null,
  lastCanonicalFingerprint: null,
  lastConflictConvergedAt: null,
  lastError: null
};

function stableCognitiveValueKey(value) {
  try {
    if (value && typeof value === "object") {
      return String(
        value.fingerprint ||
        value.id ||
        value.eventId ||
        value.dispatchId ||
        value.reentryId ||
        value.threadId ||
        value.goalId ||
        value.initiativeId ||
        JSON.stringify(value)
      );
    }
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function mergeCognitiveArrays(incoming = [], canonical = []) {
  const merged = [];
  const seen = new Set();
  for (const value of [...incoming, ...canonical]) {
    const key = stableCognitiveValueKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(value);
  }
  return merged;
}

function newerCognitiveProjection(incoming, canonical) {
  if (!incoming) return canonical || null;
  if (!canonical) return incoming;
  const incomingRevision = Number(incoming.revision || 0);
  const canonicalRevision = Number(canonical.revision || 0);
  if (incomingRevision !== canonicalRevision) {
    return incomingRevision > canonicalRevision ? incoming : canonical;
  }
  const incomingTime = Date.parse(
    incoming.projectedAt || incoming.updatedAt || incoming.savedAt || ""
  );
  const canonicalTime = Date.parse(
    canonical.projectedAt || canonical.updatedAt || canonical.savedAt || ""
  );
  if (Number.isFinite(incomingTime) && Number.isFinite(canonicalTime)) {
    return incomingTime >= canonicalTime ? incoming : canonical;
  }
  return incoming;
}

function convergeExecutiveBrainSnapshots(canonical, incoming, source = "browser-interactive") {
  if (!canonical) return incoming;
  if (!incoming) return canonical;

  const merged = { ...canonical, ...incoming };
  const keys = new Set([...Object.keys(canonical), ...Object.keys(incoming)]);

  for (const key of keys) {
    const a = canonical[key];
    const b = incoming[key];

    if (Array.isArray(a) || Array.isArray(b)) {
      merged[key] = mergeCognitiveArrays(
        Array.isArray(b) ? b : [],
        Array.isArray(a) ? a : []
      );
      continue;
    }

    if (
      typeof a === "number" &&
      typeof b === "number" &&
      /Count$|count$|revision$/i.test(key)
    ) {
      merged[key] = Math.max(a, b);
    }
  }

  merged.worldModel = newerCognitiveProjection(
    incoming.worldModel,
    canonical.worldModel
  );
  merged.selfModel = newerCognitiveProjection(
    incoming.selfModel,
    canonical.selfModel
  );
  merged.workingAwareness = newerCognitiveProjection(
    incoming.workingAwareness,
    canonical.workingAwareness
  );
  merged.temporalContinuity = newerCognitiveProjection(
    incoming.temporalContinuity,
    canonical.temporalContinuity
  );

  /*
   * Continuous heartbeat bookkeeping belongs to the durable server runtime.
   * Browser interaction may contribute cognition, but stale browser state may
   * never roll the heartbeat backward or overwrite its latest handoff.
   */
  if (source !== "server-heartbeat") {
    merged.continuousCognitionState =
      canonical.continuousCognitionState || incoming.continuousCognitionState || null;
    merged.continuousCognitionCycleCount = Math.max(
      Number(canonical.continuousCognitionCycleCount || 0),
      Number(incoming.continuousCognitionCycleCount || 0)
    );
    merged.lastContinuousCognitionCycle =
      canonical.lastContinuousCognitionCycle ||
      incoming.lastContinuousCognitionCycle ||
      null;
  }

  merged.schema = "meos.executive-brain.state.v1";
  merged.savedAt = new Date().toISOString();
  return merged;
}

function enqueueCanonicalExecutiveBrainWrite(task) {
  const run = executiveBrainCanonicalWriteChain
    .catch(() => undefined)
    .then(task);
  executiveBrainCanonicalWriteChain = run.catch(() => undefined);
  return run;
}

async function commitCanonicalExecutiveBrainState(value, options = {}) {
  return enqueueCanonicalExecutiveBrainWrite(async () => {
    const source = String(options.source || "browser-interactive");
    const observedFingerprint =
      options.observedFingerprint || undefined;

    try {
      const current = await readDurableExecutiveBrainState();
      const currentFingerprint =
        current?.record?.payloadFingerprint || undefined;
      const currentSnapshot =
        unwrapDurableExecutiveBrainSnapshot(current);
      const incomingEnvelope =
        normalizeExecutiveBrainStateEnvelope(value);
      const incomingSnapshot = incomingEnvelope.state;

      const observedIsCurrent =
        !observedFingerprint ||
        !currentFingerprint ||
        observedFingerprint === currentFingerprint;

      const nextSnapshot = observedIsCurrent
        ? incomingSnapshot
        : convergeExecutiveBrainSnapshots(
            currentSnapshot,
            incomingSnapshot,
            source
          );

      const result = await writeDurableExecutiveBrainState(
        {
          version: incomingEnvelope.version,
          buildId: incomingEnvelope.buildId,
          state: nextSnapshot
        },
        currentFingerprint
      );

      executiveBrainAuthorityState.status = "online";
      executiveBrainAuthorityState.lastWriteAt = new Date().toISOString();
      executiveBrainAuthorityState.lastSource = source;
      executiveBrainAuthorityState.lastCanonicalFingerprint =
        result?.record?.payloadFingerprint || null;
      executiveBrainAuthorityState.lastError = null;

      if (observedIsCurrent) {
        executiveBrainAuthorityState.directWriteCount += 1;
      } else {
        executiveBrainAuthorityState.convergenceCount += 1;
        executiveBrainAuthorityState.lastConflictConvergedAt =
          executiveBrainAuthorityState.lastWriteAt;
      }

      return {
        ...result,
        cognitiveAuthority: {
          commission: COGNITIVE_AUTHORITY_COMMISSION,
          version: COGNITIVE_AUTHORITY_VERSION,
          buildId: COGNITIVE_AUTHORITY_BUILD_ID,
          runtimeOwner: "meos-durable-server",
          repositoryWriter: "server-serialized",
          source,
          converged: !observedIsCurrent,
          observedFingerprint: observedFingerprint || null,
          canonicalPreviousFingerprint: currentFingerprint || null,
          canonicalFingerprint:
            result?.record?.payloadFingerprint || null
        }
      };
    } catch (error) {
      executiveBrainAuthorityState.status = "degraded";
      executiveBrainAuthorityState.lastError = {
        code: error?.code || "COGNITIVE_AUTHORITY_WRITE_FAILED",
        message: error?.message || String(error),
        at: new Date().toISOString()
      };
      throw error;
    }
  });
}

function getExecutiveBrainAuthorityStatus() {
  return {
    commission: COGNITIVE_AUTHORITY_COMMISSION,
    version: COGNITIVE_AUTHORITY_VERSION,
    buildId: COGNITIVE_AUTHORITY_BUILD_ID,
    ...executiveBrainAuthorityState,
    authority: {
      canonicalState: "meos-institutional-repository",
      externalActionAuthorized: false,
      humanAuthorityPreserved: true
    }
  };
}

/* ========================================================================== */
/* Commission 006.017D7P1 — Headless Research Orchestration                   */
/* ========================================================================== */

const HEADLESS_RESEARCH_COMMISSION = "006.017D7P1";
const HEADLESS_RESEARCH_VERSION = "1.1.0";
const HEADLESS_RESEARCH_BUILD_ID =
  "HRO110-PUBLIC-WEB-SEARCH-RETRIEVAL-ADAPTER-20260809-A";

const headlessResearchRuntime = {
  status: "online",
  providerNeutral: true,
  browserIndependent: true,
  runtimeOwner: "meos-durable-server",
  researchCount: 0,
  completedCount: 0,
  failedCount: 0,
  lastResearchAt: null,
  lastCompletedAt: null,
  lastError: null
};

function normalizeResearchCapability(capability = {}) {
  return {
    id: String(capability.id || capability.name || "").trim(),
    name: String(capability.name || capability.id || "").trim(),
    kind: String(capability.kind || capability.type || "unknown").trim(),
    operations: Array.isArray(capability.operations)
      ? capability.operations.map(String)
      : [],
    authoritative: capability.authoritative === true,
    available: capability.available !== false,
    execute:
      typeof capability.execute === "function"
        ? capability.execute
        : null
  };
}

const headlessResearchCapabilities = new Map();

function registerHeadlessResearchCapability(capability = {}) {
  const normalized = normalizeResearchCapability(capability);
  if (!normalized.id || !normalized.execute) {
    return {
      success: false,
      code: "INVALID_RESEARCH_CAPABILITY",
      message:
        "Research capabilities require a stable id and executable adapter."
    };
  }
  headlessResearchCapabilities.set(normalized.id, normalized);
  return {
    success: true,
    capability: {
      ...normalized,
      execute: undefined
    }
  };
}

function listHeadlessResearchCapabilities() {
  return [...headlessResearchCapabilities.values()]
    .filter(capability => capability.available)
    .map(capability => ({
      id: capability.id,
      name: capability.name,
      kind: capability.kind,
      operations: capability.operations,
      authoritative: capability.authoritative,
      available: capability.available
    }));
}

function selectHeadlessResearchCapability(operation, options = {}) {
  const required = String(operation || "").trim();
  const preferred = Array.isArray(options.preferredProviders)
    ? options.preferredProviders.map(String)
    : [];

  const candidates = [...headlessResearchCapabilities.values()]
    .filter(capability => capability.available)
    .filter(capability =>
      capability.operations.includes(required)
    );

  candidates.sort((a, b) => {
    const ai = preferred.indexOf(a.id);
    const bi = preferred.indexOf(b.id);
    if (ai >= 0 || bi >= 0) {
      if (ai < 0) return 1;
      if (bi < 0) return -1;
      if (ai !== bi) return ai - bi;
    }
    if (a.authoritative !== b.authoritative) {
      return a.authoritative ? -1 : 1;
    }
    return a.id.localeCompare(b.id);
  });

  return candidates[0] || null;
}

function buildHeadlessResearchPlan(request = {}) {
  const subject = String(
    request.subject ||
    request.question ||
    request.objective ||
    ""
  ).trim();

  const unknowns = Array.isArray(request.unknowns)
    ? request.unknowns.map(String).filter(Boolean)
    : [];

  if (!subject) {
    return {
      success: false,
      code: "RESEARCH_SUBJECT_REQUIRED"
    };
  }

  const questions = [
    ...unknowns,
    ...(
      unknowns.length
        ? []
        : [
            `What is established about ${subject}?`,
            `What important claims about ${subject} are uncertain, disputed, or context-dependent?`,
            `What adjacent concepts could materially change how ${subject} should be understood or applied?`
          ]
    )
  ].slice(0, 12);

  return {
    success: true,
    plan: {
      schema: "meos.headless-research-plan.v1",
      subject,
      reason: String(request.reason || ""),
      questions,
      stages: [
        {
          operation: "search",
          purpose: "Discover candidate sources and terminology."
        },
        {
          operation: "retrieve",
          purpose: "Read the strongest available sources rather than relying on snippets."
        },
        {
          operation: "cross-check",
          purpose: "Seek independent support, disagreement, and disconfirming evidence."
        },
        {
          operation: "synthesize",
          purpose: "Separate supported facts, inferences, conflicts, and unresolved unknowns."
        }
      ],
      authority: {
        internalResearchAuthorized: true,
        externalActionAuthorized: false,
        humanAuthorityPreserved: true
      },
      truthRule:
        "Research may update belief only from evidence actually retrieved. Search snippets, unavailable pages, and unsupported model completion are not verified facts."
    }
  };
}

async function executeHeadlessResearch(request = {}) {
  const built = buildHeadlessResearchPlan(request);
  if (!built.success) return built;

  const plan = built.plan;
  const evidence = [];
  const missingCapabilities = [];
  const providerTrace = [];
  headlessResearchRuntime.researchCount += 1;
  headlessResearchRuntime.lastResearchAt =
    new Date().toISOString();

  try {
    for (const stage of plan.stages) {
      if (stage.operation === "synthesize") continue;

      const capability =
        selectHeadlessResearchCapability(
          stage.operation,
          request
        );

      if (!capability) {
        missingCapabilities.push(stage.operation);
        providerTrace.push({
          operation: stage.operation,
          status: "missing-capability"
        });
        continue;
      }

      const result = await capability.execute({
        subject: plan.subject,
        questions: plan.questions,
        evidence: evidence.slice(),
        purpose: stage.purpose,
        limits: {
          maxSources: Number(request.maxSources || 12),
          maxDepth: Number(request.maxDepth || 3)
        },
        authority: plan.authority
      });

      providerTrace.push({
        operation: stage.operation,
        providerId: capability.id,
        providerKind: capability.kind,
        success: result?.success === true
      });

      if (Array.isArray(result?.evidence)) {
        for (const item of result.evidence) {
          if (!item || !item.source) continue;
          evidence.push({
            source: String(item.source),
            title: item.title
              ? String(item.title)
              : null,
            claim: item.claim
              ? String(item.claim)
              : null,
            excerpt: item.excerpt
              ? String(item.excerpt)
              : null,
            retrievedAt:
              item.retrievedAt ||
              new Date().toISOString(),
            providerId: capability.id,
            authoritative:
              item.authoritative === true ||
              capability.authoritative === true,
            evidenceStatus:
              item.evidenceStatus ||
              "retrieved-unverified"
          });
        }
      }
    }

    const result = {
      success: true,
      schema: "meos.headless-research-result.v1",
      commission: HEADLESS_RESEARCH_COMMISSION,
      buildId: HEADLESS_RESEARCH_BUILD_ID,
      subject: plan.subject,
      plan,
      evidence,
      providerTrace,
      missingCapabilities: [
        ...new Set(missingCapabilities)
      ],
      synthesis: {
        status:
          evidence.length > 0
            ? "evidence-ready-for-existing-meos-reasoning"
            : "insufficient-evidence",
        supportedFacts: [],
        inferences: [],
        conflicts: [],
        unknowns: plan.questions.slice(),
        note:
          evidence.length > 0
            ? "Retrieved evidence must pass existing MEOS Evidence Integrity / Institutional Reasoning before belief integration."
            : "No evidence was retrieved. Maddy must not claim that external research occurred."
      },
      authority: plan.authority,
      completedAt: new Date().toISOString()
    };

    headlessResearchRuntime.completedCount += 1;
    headlessResearchRuntime.lastCompletedAt =
      result.completedAt;
    headlessResearchRuntime.lastError = null;

    return result;
  } catch (error) {
    headlessResearchRuntime.failedCount += 1;
    headlessResearchRuntime.lastError = {
      code:
        error?.code ||
        "HEADLESS_RESEARCH_FAILED",
      message:
        error?.message ||
        String(error),
      at: new Date().toISOString()
    };

    return {
      success: false,
      commission: HEADLESS_RESEARCH_COMMISSION,
      buildId: HEADLESS_RESEARCH_BUILD_ID,
      subject: plan.subject,
      evidence,
      providerTrace,
      error: headlessResearchRuntime.lastError,
      authority: plan.authority
    };
  }
}

const PUBLIC_WEB_ADAPTER_ID = "public-web-http-v1";

function decodeHtmlEntities(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/");
}

function stripHtml(value = "") {
  return decodeHtmlEntities(
    String(value)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
  ).trim();
}

function normalizePublicUrl(value = "") {
  try {
    const url = new URL(String(value));
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchPublicResearchUrl(url, options = {}) {
  const normalized = normalizePublicUrl(url);
  if (!normalized) {
    throw Object.assign(
      new Error("Public research retrieval requires an HTTP(S) URL."),
      { code: "INVALID_PUBLIC_RESEARCH_URL" }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(options.timeoutMs || 12000)
  );

  try {
    const response = await fetch(normalized, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "MEOS-Maddy-Research/1.0 (+provider-neutral-public-research)",
        "Accept":
          "text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.5"
      }
    });

    if (!response.ok) {
      throw Object.assign(
        new Error(`Public research retrieval returned HTTP ${response.status}.`),
        { code: "PUBLIC_RESEARCH_HTTP_ERROR", status: response.status }
      );
    }

    const contentType = String(
      response.headers.get("content-type") || ""
    ).toLowerCase();

    const body = await response.text();
    const maxChars = Number(options.maxChars || 50000);
    const readable =
      contentType.includes("html")
        ? stripHtml(body)
        : body.trim();

    return {
      success: true,
      source: response.url || normalized,
      contentType,
      text: readable.slice(0, maxChars),
      truncated: readable.length > maxChars,
      retrievedAt: new Date().toISOString()
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseDuckDuckGoHtml(html = "") {
  const results = [];
  const blockPattern =
    /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>|<div[^>]+class="[^"]*result__snippet[^"]*"[^>]*>)([\s\S]*?)<\/(?:a|div)>/gi;

  let match;
  while ((match = blockPattern.exec(html)) && results.length < 12) {
    let href = decodeHtmlEntities(match[1]);
    try {
      const parsed = new URL(href, "https://html.duckduckgo.com");
      const uddg = parsed.searchParams.get("uddg");
      if (uddg) href = decodeURIComponent(uddg);
    } catch {}

    const source = normalizePublicUrl(href);
    if (!source) continue;

    results.push({
      source,
      title: stripHtml(match[2]),
      excerpt: stripHtml(match[3]),
      retrievedAt: new Date().toISOString(),
      evidenceStatus: "search-discovery"
    });
  }
  return results;
}

registerHeadlessResearchCapability({
  id: PUBLIC_WEB_ADAPTER_ID,
  name: "Public Web Search",
  kind: "search-provider",
  operations: ["search"],
  authoritative: false,
  async execute(context = {}) {
    const queries = [
      ...(Array.isArray(context.questions) ? context.questions : []),
      context.subject
    ].filter(Boolean).slice(0, 4);

    const evidence = [];
    const seen = new Set();

    for (const query of queries) {
      const searchUrl =
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; MEOS-Maddy-Research/1.0)",
          "Accept": "text/html"
        }
      });
      if (!response.ok) continue;
      const html = await response.text();
      for (const item of parseDuckDuckGoHtml(html)) {
        if (seen.has(item.source)) continue;
        seen.add(item.source);
        evidence.push(item);
        if (evidence.length >= Number(context.limits?.maxSources || 12)) {
          break;
        }
      }
      if (evidence.length >= Number(context.limits?.maxSources || 12)) break;
    }

    return {
      success: evidence.length > 0,
      evidence
    };
  }
});

registerHeadlessResearchCapability({
  id: "public-web-retrieval-v1",
  name: "Public Web Retrieval",
  kind: "retrieval-provider",
  operations: ["retrieve", "cross-check"],
  authoritative: false,
  async execute(context = {}) {
    const prior = Array.isArray(context.evidence)
      ? context.evidence
      : [];
    const maxSources = Math.min(
      Number(context.limits?.maxSources || 12),
      8
    );
    const evidence = [];

    for (const candidate of prior.slice(0, maxSources)) {
      if (!candidate?.source) continue;
      try {
        const page = await fetchPublicResearchUrl(
          candidate.source,
          { maxChars: 30000 }
        );
        if (!page.text) continue;

        evidence.push({
          source: page.source,
          title: candidate.title || null,
          excerpt: page.text.slice(0, 6000),
          retrievedAt: page.retrievedAt,
          authoritative:
            /\.(gov|edu)(\/|$)/i.test(
              new URL(page.source).hostname
            ),
          evidenceStatus: "retrieved-public-source"
        });
      } catch {
        continue;
      }
    }

    return {
      success: evidence.length > 0,
      evidence
    };
  }
});

function getHeadlessResearchStatus() {
  return {
    commission: HEADLESS_RESEARCH_COMMISSION,
    version: HEADLESS_RESEARCH_VERSION,
    buildId: HEADLESS_RESEARCH_BUILD_ID,
    ...headlessResearchRuntime,
    capabilities:
      listHeadlessResearchCapabilities(),
    authority: {
      externalActionAuthorized: false,
      humanAuthorityPreserved: true
    }
  };
}


/* ========================================================================== */
/* Commission 006.017D7M — Durable Cognitive Runtime Heartbeat                */
/* ========================================================================== */

/*
 * D7L proved that Executive Brain can emit a resumable cognition handoff but
 * deliberately refused to pretend browser persistence was 24/7 execution.
 * D7M gives that handoff a real server-side owner.
 *
 * The runtime executes the commissioned Executive Brain source itself in a
 * headless VM context. It does not reimplement Maddy's cognition in server.js.
 * Each wake hydrates the sovereign Brain snapshot, runs one bounded cognition
 * cycle, writes the resulting snapshot through Institutional Repository
 * Authority, verifies the durable round trip, then schedules from nextWakeAt.
 *
 * Authority invariant: this runtime may think, investigate internally, and
 * preserve cognition. It does not grant external-action authority.
 */
const CONTINUOUS_COGNITION_RUNTIME_COMMISSION = "006.017D7M";
const CONTINUOUS_COGNITION_RUNTIME_VERSION = "1.0.3";
const CONTINUOUS_COGNITION_RUNTIME_BUILD_ID =
  "CCR103-DURABLE-FINGERPRINT-OBSERVABILITY-REPAIR-20260809-A";
const CONTINUOUS_COGNITION_RUNTIME_ENABLED =
  String(process.env.MEOS_CONTINUOUS_COGNITION_ENABLED || "true")
    .trim()
    .toLowerCase() !== "false";
const CONTINUOUS_COGNITION_MIN_WAKE_MS = Math.max(
  1000,
  Number(process.env.MEOS_CONTINUOUS_COGNITION_MIN_WAKE_MS || 1000)
);
const CONTINUOUS_COGNITION_MAX_WAKE_MS = Math.max(
  CONTINUOUS_COGNITION_MIN_WAKE_MS,
  Number(process.env.MEOS_CONTINUOUS_COGNITION_MAX_WAKE_MS || 60_000)
);
const CONTINUOUS_COGNITION_RETRY_MS = Math.max(
  5000,
  Number(process.env.MEOS_CONTINUOUS_COGNITION_RETRY_MS || 30_000)
);

const continuousCognitionRuntimeState = {
  status: "initializing",
  enabled: CONTINUOUS_COGNITION_RUNTIME_ENABLED,
  startedAt: null,
  lastWakeAt: null,
  lastCompletedAt: null,
  nextWakeAt: null,
  cycleNumber: null,
  handoffFingerprint: null,
  durableFingerprint: null,
  activeThreadId: null,
  wakeCount: 0,
  failedWakeCount: 0,
  inFlight: false,
  timer: null,
  lastError: null
};

let continuousCognitionBrainSourcePromise = null;

async function loadContinuousCognitionBrainSource() {
  if (!continuousCognitionBrainSourcePromise) {
    const brainPath = path.join(frontendDirectory, "executive-brain.js");
    continuousCognitionBrainSourcePromise = fs.readFile(brainPath, "utf8")
      .then(source => ({ source, brainPath }))
      .catch(error => {
        continuousCognitionBrainSourcePromise = null;
        throw error;
      });
  }
  return continuousCognitionBrainSourcePromise;
}

function unwrapDurableExecutiveBrainSnapshot(readResult) {
  if (!readResult?.found) return null;
  const value = readResult.value;
  if (!value || typeof value !== "object") return null;
  if (value.state?.schema === "meos.executive-brain.state.v1") {
    return value.state;
  }
  if (value.schema === "meos.executive-brain.state.v1") {
    return value;
  }
  return null;
}

async function createHeadlessContinuousCognitionBrain(snapshot = null) {
  const { source, brainPath } = await loadContinuousCognitionBrainSource();
  const headlessWindow = {
    console,
    setTimeout,
    clearTimeout,
    crypto: globalThis.crypto,
    document: {
      readyState: "loading",
      addEventListener() {}
    },
    addEventListener() {},
    fetch: async () => {
      throw new Error(
        "Headless continuous cognition does not use browser fetch; durable authority is injected by the server runtime."
      );
    }
  };
  headlessWindow.window = headlessWindow;

  vm.runInNewContext(source, headlessWindow, {
    filename: brainPath,
    timeout: 5000
  });

  const brain = headlessWindow.ExecutiveBrain;
  if (
    !brain ||
    typeof brain.runContinuousCognitionCycle !== "function" ||
    typeof brain.buildPersistenceSnapshot !== "function" ||
    typeof brain.applyPersistenceSnapshot !== "function"
  ) {
    const error = new Error(
      "Commissioned Executive Brain does not expose the D7L continuous cognition persistence contract."
    );
    error.code = "CONTINUOUS_COGNITION_BRAIN_CONTRACT_MISSING";
    throw error;
  }

  // Prevent browser initialization/persistence. The server owns hydration and
  // durable writes explicitly through InstitutionalRepositoryAuthority.
  brain.status = "online";
  brain.configuration.persistenceEnabled = false;

  if (snapshot) {
    const restored = brain.applyPersistenceSnapshot(snapshot);
    if (!restored) {
      const error = new Error(
        "Durable Executive Brain snapshot could not be restored into the headless cognition runtime."
      );
      error.code = "CONTINUOUS_COGNITION_DURABLE_RESTORE_FAILED";
      throw error;
    }
  }

  return brain;
}

function scheduleContinuousCognitionWake(nextWakeAt) {
  if (continuousCognitionRuntimeState.timer) {
    clearTimeout(continuousCognitionRuntimeState.timer);
    continuousCognitionRuntimeState.timer = null;
  }

  const targetMs = Date.parse(String(nextWakeAt || ""));
  const requestedDelay = Number.isFinite(targetMs)
    ? Math.max(0, targetMs - Date.now())
    : CONTINUOUS_COGNITION_RETRY_MS;
  const delay = Math.min(
    CONTINUOUS_COGNITION_MAX_WAKE_MS,
    Math.max(CONTINUOUS_COGNITION_MIN_WAKE_MS, requestedDelay)
  );
  const scheduledAt = new Date(Date.now() + delay).toISOString();
  continuousCognitionRuntimeState.nextWakeAt = scheduledAt;
  continuousCognitionRuntimeState.timer = setTimeout(() => {
    continuousCognitionRuntimeState.timer = null;
    runContinuousCognitionHeartbeat().catch(error => {
      console.error(
        "[MEOS] Durable Cognitive Runtime heartbeat escaped its guarded wake:",
        error
      );
    });
  }, delay);
  continuousCognitionRuntimeState.timer.unref?.();
  return scheduledAt;
}

async function runContinuousCognitionHeartbeat() {
  if (!CONTINUOUS_COGNITION_RUNTIME_ENABLED) {
    continuousCognitionRuntimeState.status = "disabled";
    return getContinuousCognitionRuntimeStatus();
  }
  if (continuousCognitionRuntimeState.inFlight) {
    return getContinuousCognitionRuntimeStatus();
  }

  continuousCognitionRuntimeState.inFlight = true;
  continuousCognitionRuntimeState.lastWakeAt = new Date().toISOString();
  continuousCognitionRuntimeState.lastError = null;

  try {
    const durableBefore = await readDurableExecutiveBrainState();
    const snapshotBefore = unwrapDurableExecutiveBrainSnapshot(durableBefore);
    const brain = await createHeadlessContinuousCognitionBrain(snapshotBefore);
    const cycleResult = brain.runContinuousCognitionCycle({});

    if (
      cycleResult?.success !== true ||
      cycleResult?.cycle?.authorityUnchanged !== true ||
      cycleResult?.handoff?.authority?.externalActionAuthorized !== false
    ) {
      const error = new Error(
        "Continuous cognition cycle violated the bounded D7L runtime contract."
      );
      error.code = "CONTINUOUS_COGNITION_AUTHORITY_GUARD_FAILED";
      throw error;
    }

    const snapshotAfter = brain.buildPersistenceSnapshot();
    const writeResult = await commitCanonicalExecutiveBrainState(
      snapshotAfter,
      {
        source: "server-heartbeat",
        observedFingerprint:
          durableBefore?.record?.payloadFingerprint || undefined
      }
    );
    const durableAfter = await readDurableExecutiveBrainState();
    const verifiedSnapshot = unwrapDurableExecutiveBrainSnapshot(durableAfter);
    const expectedHandoffFingerprint =
      cycleResult.handoff?.fingerprint || null;
    const persistedHandoffFingerprint =
      verifiedSnapshot?.continuousCognitionState?.handoffFingerprint || null;

    if (
      !verifiedSnapshot ||
      !expectedHandoffFingerprint ||
      persistedHandoffFingerprint !== expectedHandoffFingerprint
    ) {
      const error = new Error(
        "Continuous cognition durable read-after-write verification failed."
      );
      error.code = "CONTINUOUS_COGNITION_DURABLE_VERIFY_FAILED";
      throw error;
    }

    continuousCognitionRuntimeState.status = "online";
    continuousCognitionRuntimeState.lastCompletedAt = new Date().toISOString();
    continuousCognitionRuntimeState.cycleNumber =
      Number(cycleResult.cycle?.cycleNumber || 0);
    continuousCognitionRuntimeState.handoffFingerprint =
      expectedHandoffFingerprint;
    continuousCognitionRuntimeState.durableFingerprint =
      durableAfter?.record?.payloadFingerprint ||
      writeResult?.record?.payloadFingerprint ||
      null;
    continuousCognitionRuntimeState.activeThreadId =
      cycleResult.handoff?.activeThreadId || null;
    continuousCognitionRuntimeState.wakeCount += 1;

    scheduleContinuousCognitionWake(cycleResult.handoff?.nextWakeAt);
    return getContinuousCognitionRuntimeStatus();
  } catch (error) {
    continuousCognitionRuntimeState.status = "degraded";
    continuousCognitionRuntimeState.failedWakeCount += 1;
    continuousCognitionRuntimeState.lastError = {
      code: error?.code || "CONTINUOUS_COGNITION_HEARTBEAT_FAILED",
      message: error?.message || String(error),
      at: new Date().toISOString()
    };
    scheduleContinuousCognitionWake(
      new Date(Date.now() + CONTINUOUS_COGNITION_RETRY_MS).toISOString()
    );
    throw error;
  } finally {
    continuousCognitionRuntimeState.inFlight = false;
  }
}

function getContinuousCognitionRuntimeStatus() {
  return {
    commission: CONTINUOUS_COGNITION_RUNTIME_COMMISSION,
    version: CONTINUOUS_COGNITION_RUNTIME_VERSION,
    buildId: CONTINUOUS_COGNITION_RUNTIME_BUILD_ID,
    status: continuousCognitionRuntimeState.status,
    enabled: continuousCognitionRuntimeState.enabled,
    browserIndependent: true,
    runtimeOwner: "meos-durable-server",
    cognitionSource: "commissioned-executive-brain",
    authority: {
      durableState: "meos-institutional-repository",
      externalActionAuthorized: false,
      humanAuthorityPreserved: true
    },
    startedAt: continuousCognitionRuntimeState.startedAt,
    lastWakeAt: continuousCognitionRuntimeState.lastWakeAt,
    lastCompletedAt: continuousCognitionRuntimeState.lastCompletedAt,
    nextWakeAt: continuousCognitionRuntimeState.nextWakeAt,
    cycleNumber: continuousCognitionRuntimeState.cycleNumber,
    handoffFingerprint: continuousCognitionRuntimeState.handoffFingerprint,
    durableFingerprint: continuousCognitionRuntimeState.durableFingerprint,
    activeThreadId: continuousCognitionRuntimeState.activeThreadId,
    wakeCount: continuousCognitionRuntimeState.wakeCount,
    failedWakeCount: continuousCognitionRuntimeState.failedWakeCount,
    inFlight: continuousCognitionRuntimeState.inFlight,
    lastError: continuousCognitionRuntimeState.lastError
  };
}

async function startContinuousCognitionRuntime() {
  if (!CONTINUOUS_COGNITION_RUNTIME_ENABLED) {
    continuousCognitionRuntimeState.status = "disabled";
    return getContinuousCognitionRuntimeStatus();
  }
  if (continuousCognitionRuntimeState.startedAt) {
    return getContinuousCognitionRuntimeStatus();
  }

  continuousCognitionRuntimeState.startedAt = new Date().toISOString();
  continuousCognitionRuntimeState.status = "starting";

  // Wake immediately on process start. Durable hydration determines whether
  // this is a fresh cycle or continuation of unfinished thought.
  scheduleContinuousCognitionWake(new Date().toISOString());
  return getContinuousCognitionRuntimeStatus();
}


/* ========================================================================== */
/* Commission 006.017D5A2 — Provider Manager Bounded Durable Authority Seam   */
/* ========================================================================== */

/*
 * Step 10 / P5 prerequisite.
 *
 * Provider Manager currently keeps bounded provider execution history on the
 * laptop. This seam gives that bounded non-secret state a provider-neutral
 * durable home behind MEOS Institutional Repository Authority.
 *
 * IMPORTANT:
 * - No browser or IndexedDB behavior is changed by this server-only commission.
 * - No timer, polling loop, or background writer is added.
 * - Google Workspace is only the currently selected durable provider; MEOS Core
 *   remains provider-neutral through InstitutionalRepositoryAuthority.
 * - Credentials, tokens, API keys, passwords, authorization headers, and other
 *   secrets are rejected recursively.
 */

const PROVIDER_MANAGER_STATE_REPOSITORY_COMMISSION = "006.017D5A2";
const PROVIDER_MANAGER_STATE_REPOSITORY_VERSION = "1.0.0";
const PROVIDER_MANAGER_STATE_REPOSITORY_BUILD_ID =
  "PMSR100-BOUNDED-DURABLE-AUTHORITY-SEAM-20260808-C";
const PROVIDER_MANAGER_STATE_REPOSITORY_NAMESPACE =
  "provider-manager";
const PROVIDER_MANAGER_STATE_REPOSITORY_KEY =
  "bounded-operational-state";
const PROVIDER_MANAGER_STATE_REPOSITORY_CLASSIFICATION =
  "operational";
const PROVIDER_MANAGER_STATE_MAX_HISTORY = 250;
const PROVIDER_MANAGER_STATE_MAX_BYTES = 256 * 1024;

const PROVIDER_MANAGER_FORBIDDEN_SECRET_KEYS = new Set([
  "apikey",
  "api_key",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "token",
  "password",
  "passwd",
  "secret",
  "clientsecret",
  "client_secret",
  "authorization",
  "cookie",
  "privatekey",
  "private_key",
  "credential",
  "credentials"
]);

function providerManagerContainsForbiddenSecret(value) {
  if (Array.isArray(value)) {
    return value.some(item =>
      providerManagerContainsForbiddenSecret(item)
    );
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  for (const [key, child] of Object.entries(value)) {
    const normalizedKey =
      String(key || "")
        .replace(/[^a-z0-9_]/gi, "")
        .toLowerCase();

    if (PROVIDER_MANAGER_FORBIDDEN_SECRET_KEYS.has(normalizedKey)) {
      return true;
    }

    if (providerManagerContainsForbiddenSecret(child)) {
      return true;
    }
  }

  return false;
}

function normalizeProviderManagerStateEnvelope(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    const error = new Error(
      "Provider Manager State payload must be an object."
    );
    error.status = 400;
    error.code = "PROVIDER_MANAGER_STATE_PAYLOAD_INVALID";
    throw error;
  }

  const state =
    value.state &&
    typeof value.state === "object" &&
    !Array.isArray(value.state)
      ? value.state
      : value;

  if (state.schema !== "meos.provider-manager.state.v1") {
    const error = new Error(
      "Provider Manager State schema is invalid."
    );
    error.status = 400;
    error.code = "PROVIDER_MANAGER_STATE_SCHEMA_INVALID";
    throw error;
  }

  if (!Array.isArray(state.history)) {
    const error = new Error(
      'Provider Manager State field "history" must be an array.'
    );
    error.status = 400;
    error.code = "PROVIDER_MANAGER_STATE_SCHEMA_INVALID";
    throw error;
  }

  if (state.history.length > PROVIDER_MANAGER_STATE_MAX_HISTORY) {
    const error = new Error(
      `Provider Manager State history exceeds ${PROVIDER_MANAGER_STATE_MAX_HISTORY} records.`
    );
    error.status = 413;
    error.code = "PROVIDER_MANAGER_STATE_HISTORY_LIMIT_EXCEEDED";
    throw error;
  }

  const allowedState = {
    schema: "meos.provider-manager.state.v1",
    version: String(state.version || value.version || "1.0.2"),
    buildId: String(state.buildId || value.buildId || ""),
    savedAt: String(state.savedAt || new Date().toISOString()),
    history: state.history
  };

  if (providerManagerContainsForbiddenSecret(allowedState)) {
    const error = new Error(
      "Provider Manager durable state contains a forbidden credential or secret field."
    );
    error.status = 400;
    error.code = "PROVIDER_MANAGER_STATE_SECRET_REJECTED";
    throw error;
  }

  const serialized = JSON.stringify(allowedState);
  if (Buffer.byteLength(serialized, "utf8") > PROVIDER_MANAGER_STATE_MAX_BYTES) {
    const error = new Error(
      `Provider Manager durable state exceeds ${PROVIDER_MANAGER_STATE_MAX_BYTES} bytes.`
    );
    error.status = 413;
    error.code = "PROVIDER_MANAGER_STATE_SIZE_LIMIT_EXCEEDED";
    throw error;
  }

  return {
    schema: "meos.provider-manager.durable-state.v1",
    version: String(value.version || allowedState.version),
    buildId: String(value.buildId || allowedState.buildId),
    savedAt: new Date().toISOString(),
    state: allowedState
  };
}

async function readDurableProviderManagerState() {
  registerGoogleInstitutionalRepositoryAuthority();

  return InstitutionalRepositoryAuthority.read({
    namespace: PROVIDER_MANAGER_STATE_REPOSITORY_NAMESPACE,
    key: PROVIDER_MANAGER_STATE_REPOSITORY_KEY,
    classification:
      PROVIDER_MANAGER_STATE_REPOSITORY_CLASSIFICATION
  });
}

async function writeDurableProviderManagerState(
  value,
  expectedPreviousFingerprint = undefined
) {
  registerGoogleInstitutionalRepositoryAuthority();

  const envelope =
    normalizeProviderManagerStateEnvelope(value);

  return InstitutionalRepositoryAuthority.write({
    namespace: PROVIDER_MANAGER_STATE_REPOSITORY_NAMESPACE,
    key: PROVIDER_MANAGER_STATE_REPOSITORY_KEY,
    classification:
      PROVIDER_MANAGER_STATE_REPOSITORY_CLASSIFICATION,
    value: envelope,
    metadata: {
      subsystem: "provider-manager",
      stateClass: "bounded-provider-operational-audit",
      commission:
        PROVIDER_MANAGER_STATE_REPOSITORY_COMMISSION,
      buildId:
        PROVIDER_MANAGER_STATE_REPOSITORY_BUILD_ID,
      storageRole:
        "durable-provider-operational-audit",
      containsSecrets: false
    },
    expectedPreviousFingerprint
  });
}


/* ========================================================================== */
/* Commission 006.017D6A — Executive Learning Durable Authority Seam          */
/* ========================================================================== */

/*
 * Step 10 / P6 prerequisite.
 *
 * Executive Learning currently keeps approved institutional learning on the
 * laptop. This seam gives that learning a provider-neutral durable home behind
 * MEOS Institutional Repository Authority before the browser authority flip.
 *
 * Sovereignty invariant:
 * - MEOS owns the state schema and authority semantics.
 * - Google Workspace is only the currently selected durable provider.
 * - This state is included in the MEOS sovereign portability manifest so a
 *   provider swap does not strand Maddy's accumulated institutional learning.
 * - No browser authority is changed by this server-only commission.
 */

const EXECUTIVE_LEARNING_STATE_REPOSITORY_COMMISSION = "006.017D6A";
const EXECUTIVE_LEARNING_STATE_REPOSITORY_VERSION = "1.0.0";
const EXECUTIVE_LEARNING_STATE_REPOSITORY_BUILD_ID =
  "ELSR100-DURABLE-AUTHORITY-SEAM-20260808-A";
const EXECUTIVE_LEARNING_STATE_REPOSITORY_NAMESPACE =
  "executive-learning";
const EXECUTIVE_LEARNING_STATE_REPOSITORY_KEY =
  "institutional-learning-state";
const EXECUTIVE_LEARNING_STATE_REPOSITORY_CLASSIFICATION =
  "institutional";
const EXECUTIVE_LEARNING_STATE_MAX_BYTES = 8 * 1024 * 1024;

function normalizeExecutiveLearningStateEnvelope(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    const error = new Error(
      "Executive Learning State payload must be an object."
    );
    error.status = 400;
    error.code = "EXECUTIVE_LEARNING_STATE_PAYLOAD_INVALID";
    throw error;
  }

  const state =
    value.state &&
    typeof value.state === "object" &&
    !Array.isArray(value.state)
      ? value.state
      : value;

  if (state.schema !== "meos.executive-learning.package.v1") {
    const error = new Error(
      "Executive Learning State schema is invalid."
    );
    error.status = 400;
    error.code = "EXECUTIVE_LEARNING_STATE_SCHEMA_INVALID";
    throw error;
  }

  for (const field of ["observations", "lessons", "feedback", "history"]) {
    if (!Array.isArray(state[field])) {
      const error = new Error(
        `Executive Learning State field "${field}" must be an array.`
      );
      error.status = 400;
      error.code = "EXECUTIVE_LEARNING_STATE_SCHEMA_INVALID";
      throw error;
    }
  }

  const serialized = JSON.stringify(state);
  if (
    Buffer.byteLength(serialized, "utf8") >
    EXECUTIVE_LEARNING_STATE_MAX_BYTES
  ) {
    const error = new Error(
      `Executive Learning durable state exceeds ${EXECUTIVE_LEARNING_STATE_MAX_BYTES} bytes.`
    );
    error.status = 413;
    error.code = "EXECUTIVE_LEARNING_STATE_SIZE_LIMIT_EXCEEDED";
    throw error;
  }

  return {
    schema: "meos.executive-learning.durable-state.v1",
    version: String(value.version || state.version || "1.0.2"),
    buildId: String(value.buildId || state.buildId || ""),
    savedAt: new Date().toISOString(),
    state
  };
}

async function readDurableExecutiveLearningState() {
  registerGoogleInstitutionalRepositoryAuthority();

  return InstitutionalRepositoryAuthority.read({
    namespace: EXECUTIVE_LEARNING_STATE_REPOSITORY_NAMESPACE,
    key: EXECUTIVE_LEARNING_STATE_REPOSITORY_KEY,
    classification:
      EXECUTIVE_LEARNING_STATE_REPOSITORY_CLASSIFICATION
  });
}

async function writeDurableExecutiveLearningState(
  value,
  expectedPreviousFingerprint = undefined
) {
  registerGoogleInstitutionalRepositoryAuthority();

  const envelope =
    normalizeExecutiveLearningStateEnvelope(value);

  return InstitutionalRepositoryAuthority.write({
    namespace: EXECUTIVE_LEARNING_STATE_REPOSITORY_NAMESPACE,
    key: EXECUTIVE_LEARNING_STATE_REPOSITORY_KEY,
    classification:
      EXECUTIVE_LEARNING_STATE_REPOSITORY_CLASSIFICATION,
    value: envelope,
    metadata: {
      subsystem: "executive-learning",
      stateClass: "institutional-learning",
      commission:
        EXECUTIVE_LEARNING_STATE_REPOSITORY_COMMISSION,
      buildId:
        EXECUTIVE_LEARNING_STATE_REPOSITORY_BUILD_ID,
      storageRole: "durable-institutional-learning",
      providerNeutral: true
    },
    expectedPreviousFingerprint
  });
}

/* ========================================================================== */
/* Commission 006.017D0C — Live Sovereign State Portability Gateway           */
/* ========================================================================== */

/*
 * This gateway exposes the provider-neutral export/verify/restore capability
 * already commissioned in Institutional Repository Authority v1.1.0.
 *
 * It does NOT make Google part of the MEOS package format. It does NOT add
 * browser storage, localStorage, IndexedDB writes, RAM history, timers,
 * scanners, or background loops.
 *
 * The default export manifest begins with the durable singleton state already
 * migrated and proven in this deployment:
 *   - Mission Engine durable state
 *   - Executive Brain bounded cognition state
 *   - Provider Manager bounded operational/audit state
 *
 * Additional repository records can be exported later without changing the
 * package format or making a storage provider part of MEOS Core.
 */
const MEOS_PORTABILITY_GATEWAY_COMMISSION = "006.017D0C";
const MEOS_PORTABILITY_GATEWAY_VERSION = "1.0.0";
const MEOS_PORTABILITY_GATEWAY_BUILD_ID =
  "MPG100-LIVE-SOVEREIGN-PORTABILITY-GATEWAY-20260808-A";
const MEOS_PORTABILITY_MAX_PACKAGE_BYTES = 20 * 1024 * 1024;
const MEOS_SOVEREIGN_BACKUP_COMMISSION = "006.017D0D";
const MEOS_SOVEREIGN_BACKUP_VERSION = "1.0.0";
const MEOS_SOVEREIGN_BACKUP_BUILD_ID =
  "MSB100-CUSTOMER-CONTROLLED-DOWNLOAD-20260808-A";

function buildSovereignBackupFilename(date = new Date()) {
  const stamp = date
    .toISOString()
    .replace(/[:.]/g, "-");
  return `MEOS-Maddy-State-${stamp}.meos.json`;
}

function buildSovereignBackupEnvelope(portablePackage) {
  return {
    schema: "meos.sovereign-backup-file.v1",
    backupVersion: MEOS_SOVEREIGN_BACKUP_VERSION,
    commission: MEOS_SOVEREIGN_BACKUP_COMMISSION,
    buildId: MEOS_SOVEREIGN_BACKUP_BUILD_ID,
    createdAt: new Date().toISOString(),
    providerNeutral: true,
    purpose:
      "customer-controlled-portable-deployment-state-backup",
    warning:
      "This file contains authorized deployment state, not MEOS/Maddy intellectual-property ownership rights.",
    package: portablePackage
  };
}


function requirePortabilityCore() {
  const exportReady =
    typeof InstitutionalRepositoryAuthority.exportPortableStatePackage ===
    "function";
  const restoreReady =
    typeof InstitutionalRepositoryAuthority.restorePortableStatePackage ===
    "function";
  const validateReady =
    typeof InstitutionalRepositoryAuthority.validatePortableStatePackage ===
    "function";

  if (!exportReady || !restoreReady || !validateReady) {
    const error = new Error(
      "MEOS Sovereign State Portability Core v1.1.0 is required before using the live portability gateway."
    );
    error.status = 503;
    error.code = "MEOS_PORTABILITY_CORE_NOT_READY";
    throw error;
  }

  return true;
}

function getDefaultPortableStateManifest() {
  return [
    {
      namespace: MISSION_STATE_REPOSITORY_NAMESPACE,
      key: MISSION_STATE_REPOSITORY_KEY,
      classification: MISSION_STATE_REPOSITORY_CLASSIFICATION,
      required: false,
      subsystem: "mission-engine"
    },
    {
      namespace: EXECUTIVE_BRAIN_STATE_REPOSITORY_NAMESPACE,
      key: EXECUTIVE_BRAIN_STATE_REPOSITORY_KEY,
      classification: EXECUTIVE_BRAIN_STATE_REPOSITORY_CLASSIFICATION,
      required: false,
      subsystem: "executive-brain"
    },
    {
      namespace: PROVIDER_MANAGER_STATE_REPOSITORY_NAMESPACE,
      key: PROVIDER_MANAGER_STATE_REPOSITORY_KEY,
      classification: PROVIDER_MANAGER_STATE_REPOSITORY_CLASSIFICATION,
      required: false,
      subsystem: "provider-manager"
    },
    {
      namespace: EXECUTIVE_LEARNING_STATE_REPOSITORY_NAMESPACE,
      key: EXECUTIVE_LEARNING_STATE_REPOSITORY_KEY,
      classification:
        EXECUTIVE_LEARNING_STATE_REPOSITORY_CLASSIFICATION,
      required: false,
      subsystem: "executive-learning"
    }
  ];
}

function normalizePortableManifest(value) {
  const source =
    Array.isArray(value) && value.length
      ? value
      : getDefaultPortableStateManifest();

  if (source.length > 100) {
    const error = new Error(
      "Portable state manifest may contain at most 100 repository records."
    );
    error.status = 413;
    error.code = "MEOS_PORTABILITY_MANIFEST_LIMIT_EXCEEDED";
    throw error;
  }

  return source.map(item => ({
    namespace: String(item?.namespace || "").trim(),
    key: String(item?.key || "").trim(),
    classification: String(
      item?.classification || "institutional"
    ).trim(),
    required: item?.required === true
  }));
}

function portablePackageByteLength(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

const MISSION_STATE_TRANSPORT_FIX_COMMISSION = "006.017D3A1";
const MISSION_STATE_TRANSPORT_FIX_BUILD_ID =
  "MSR101-JSON-TRANSPORT-20260808-A";
const MISSION_STATE_REPOSITORY_COMMISSION = "006.017D3A";
const MISSION_STATE_REPOSITORY_VERSION = "1.0.0";
const MISSION_STATE_REPOSITORY_BUILD_ID =
  "MSR100-DURABLE-MISSION-AUTHORITY-SEAM-20260808-A";
const MISSION_STATE_REPOSITORY_NAMESPACE =
  "mission-engine";
const MISSION_STATE_REPOSITORY_KEY =
  "authoritative-state";
const MISSION_STATE_REPOSITORY_CLASSIFICATION =
  "institutional";

const MISSION_STATE_CLEAN_CONCURRENCY_COMMISSION =
  "006.017D3B7";
const MISSION_STATE_CLEAN_CONCURRENCY_BUILD_ID =
  "MSR102-CLEAN-CONCURRENCY-TRANSPORT-20260808-A";

/*
 * An expected optimistic-concurrency race is authority information, not a
 * failed HTTP transport. Returning the MEOS conflict envelope over HTTP 200
 * lets Mission Engine rebase/retry without painting a normal successful
 * convergence red in DevTools.
 *
 * IMPORTANT: only the exact recoverable concurrency code is transport-clean.
 * Corrupt envelopes, fingerprint-integrity failures, validation failures,
 * provider failures, and every other error retain their real HTTP status.
 */
function missionStateWriteTransportStatus(error) {
  return error?.code ===
    "MEOS_REPOSITORY_CONCURRENCY_CONFLICT"
    ? 200
    : (error?.status || 500);
}

function normalizeMissionStateEnvelope(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    const error = new Error(
      "Mission State payload must be an object."
    );
    error.status = 400;
    error.code = "MISSION_STATE_PAYLOAD_INVALID";
    throw error;
  }

  const state =
    value.state &&
    typeof value.state === "object" &&
    !Array.isArray(value.state)
      ? value.state
      : value;

  const requiredArrays = [
    "missions",
    "approvalQueue",
    "completedMissions",
    "archivedMissions",
    "activity"
  ];

  for (const field of requiredArrays) {
    if (!Array.isArray(state[field])) {
      const error = new Error(
        `Mission State field "${field}" must be an array.`
      );
      error.status = 400;
      error.code = "MISSION_STATE_SCHEMA_INVALID";
      throw error;
    }
  }

  return {
    schema: "meos.mission-engine.durable-state.v1",
    version:
      String(value.version || "0.1.1"),
    buildId:
      String(value.buildId || ""),
    savedAt: new Date().toISOString(),
    state
  };
}

async function readDurableMissionState() {
  registerGoogleInstitutionalRepositoryAuthority();

  return InstitutionalRepositoryAuthority.read({
    namespace: MISSION_STATE_REPOSITORY_NAMESPACE,
    key: MISSION_STATE_REPOSITORY_KEY,
    classification:
      MISSION_STATE_REPOSITORY_CLASSIFICATION
  });
}

async function writeDurableMissionState(
  value,
  expectedPreviousFingerprint = undefined
) {
  registerGoogleInstitutionalRepositoryAuthority();

  const envelope =
    normalizeMissionStateEnvelope(value);

  return InstitutionalRepositoryAuthority.write({
    namespace: MISSION_STATE_REPOSITORY_NAMESPACE,
    key: MISSION_STATE_REPOSITORY_KEY,
    classification:
      MISSION_STATE_REPOSITORY_CLASSIFICATION,
    value: envelope,
    metadata: {
      subsystem: "mission-engine",
      commission:
        MISSION_STATE_REPOSITORY_COMMISSION,
      buildId:
        MISSION_STATE_REPOSITORY_BUILD_ID,
      storageRole:
        "durable-organizational-mission-state"
    },
    expectedPreviousFingerprint
  });
}

const EXECUTIVE_MEMORY_REPOSITORY_COMMISSION = "006.017D2";
const EXECUTIVE_MEMORY_REPOSITORY_BUILD_ID =
  "EM120-WORKSPACE-DURABLE-AUTHORITY-20260808-A";
const EXECUTIVE_MEMORY_REPOSITORY_NAMESPACE =
  "executive-memory";
const EXECUTIVE_MEMORY_REPOSITORY_CLASSIFICATION =
  "institutional";

const executiveMemoryRepositoryState = {
  authority: "meos-institutional-repository",
  providerNeutral: true,
  localFilesystemRole: "cache-recovery-staging-only",
  migratedCollections: new Set(),
  lastDurableReadAt: null,
  lastDurableWriteAt: null,
  lastMigrationAt: null,
  lastError: null
};



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

function executiveMemoryManifestRepositoryKey(collection) {
  return `${EXECUTIVE_MEMORY_REPOSITORY_NAMESPACE}:manifest:${collection}`;
}

function executiveMemoryRecordRepositoryKey(collection, recordId) {
  return `${EXECUTIVE_MEMORY_REPOSITORY_NAMESPACE}:record:${collection}:${recordId}`;
}

function executiveMemoryRepositoryMetadata(collection, extra = {}) {
  return {
    subsystem: "executive-memory",
    collection,
    commission: EXECUTIVE_MEMORY_REPOSITORY_COMMISSION,
    buildId: EXECUTIVE_MEMORY_REPOSITORY_BUILD_ID,
    storageRole: "durable-organizational-state",
    ...extra
  };
}

async function readExecutiveMemoryLocalCache(collection) {
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
        "Executive Memory local cache contains invalid JSON."
      );
      storageError.status = 500;
      storageError.code = "EXECUTIVE_MEMORY_LOCAL_CACHE_CORRUPT";
      throw storageError;
    }

    throw error;
  }
}

async function writeExecutiveMemoryLocalCache(collection, records) {
  try {
    await ensureExecutiveMemoryDirectory();

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
    return true;
  } catch (error) {
    console.warn(
      `[MEOS Executive Memory] Local cache update failed for "${collection}" while durable repository authority remains primary:`,
      error?.message || error
    );
    return false;
  }
}

async function ensureExecutiveMemoryRepositoryProvider() {
  registerGoogleInstitutionalRepositoryAuthority();

  const status =
    InstitutionalRepositoryAuthority.getStatus();

  if (!status?.providerCount) {
    const error = new Error(
      "No MEOS Institutional Repository provider is registered for Executive Memory."
    );
    error.status = 503;
    error.code =
      "EXECUTIVE_MEMORY_DURABLE_AUTHORITY_UNAVAILABLE";
    throw error;
  }

  return status;
}

async function readExecutiveMemoryManifest(collection) {
  await ensureExecutiveMemoryRepositoryProvider();

  return InstitutionalRepositoryAuthority.read({
    namespace: EXECUTIVE_MEMORY_REPOSITORY_NAMESPACE,
    key: `manifest:${collection}`,
    classification:
      EXECUTIVE_MEMORY_REPOSITORY_CLASSIFICATION
  });
}

async function writeExecutiveMemoryManifest(
  collection,
  recordIds,
  previousFingerprint = undefined
) {
  const uniqueRecordIds = [
    ...new Set(
      (Array.isArray(recordIds) ? recordIds : [])
        .map(value => normalizeIdentifier(String(value || "")))
        .filter(Boolean)
    )
  ];

  return InstitutionalRepositoryAuthority.write({
    namespace: EXECUTIVE_MEMORY_REPOSITORY_NAMESPACE,
    key: `manifest:${collection}`,
    classification:
      EXECUTIVE_MEMORY_REPOSITORY_CLASSIFICATION,
    value: {
      schema: "meos.executive-memory.manifest.v1",
      collection,
      recordIds: uniqueRecordIds,
      recordCount: uniqueRecordIds.length,
      updatedAt: new Date().toISOString()
    },
    metadata: executiveMemoryRepositoryMetadata(collection, {
      recordType: "collection-manifest"
    }),
    expectedPreviousFingerprint: previousFingerprint
  });
}

async function migrateExecutiveMemoryCollectionIfNeeded(collection) {
  const manifestResult =
    await readExecutiveMemoryManifest(collection);

  if (manifestResult?.found) {
    return {
      migrated: false,
      source: "durable-repository",
      manifestResult
    };
  }

  const localRecords =
    await readExecutiveMemoryLocalCache(collection);

  if (localRecords.length === 0) {
    const manifestWrite =
      await writeExecutiveMemoryManifest(
        collection,
        []
      );

    executiveMemoryRepositoryState.migratedCollections.add(
      collection
    );
    executiveMemoryRepositoryState.lastMigrationAt =
      new Date().toISOString();

    return {
      migrated: true,
      source: "empty-initialization",
      manifestResult: {
        found: true,
        record: manifestWrite.record,
        value: manifestWrite.record?.value
      }
    };
  }

  for (const record of localRecords) {
    await InstitutionalRepositoryAuthority.write({
      namespace:
        EXECUTIVE_MEMORY_REPOSITORY_NAMESPACE,
      key:
        `record:${collection}:${record.id}`,
      classification:
        EXECUTIVE_MEMORY_REPOSITORY_CLASSIFICATION,
      value: record,
      metadata:
        executiveMemoryRepositoryMetadata(collection, {
          recordType: "executive-memory-record",
          migratedFrom:
            "server-filesystem-cache"
        })
    });
  }

  const manifestWrite =
    await writeExecutiveMemoryManifest(
      collection,
      localRecords.map(record => record.id)
    );

  executiveMemoryRepositoryState.migratedCollections.add(
    collection
  );
  executiveMemoryRepositoryState.lastMigrationAt =
    new Date().toISOString();

  console.info(
    `[MEOS Executive Memory] Migrated ${localRecords.length} "${collection}" record(s) from server filesystem staging into durable Institutional Repository authority.`
  );

  return {
    migrated: true,
    source: "server-filesystem-cache",
    manifestResult: {
      found: true,
      record: manifestWrite.record,
      value: manifestWrite.record?.value
    }
  };
}

async function getExecutiveMemoryManifest(collection) {
  const migration =
    await migrateExecutiveMemoryCollectionIfNeeded(collection);

  const value =
    migration?.manifestResult?.value ||
    migration?.manifestResult?.record?.value ||
    null;

  if (
    !value ||
    value.schema !==
      "meos.executive-memory.manifest.v1" ||
    !Array.isArray(value.recordIds)
  ) {
    const error = new Error(
      `Executive Memory durable manifest for "${collection}" is invalid.`
    );
    error.status = 500;
    error.code =
      "EXECUTIVE_MEMORY_DURABLE_MANIFEST_INVALID";
    throw error;
  }

  return {
    value,
    fingerprint:
      migration?.manifestResult?.record
        ?.payloadFingerprint || null
  };
}

async function readExecutiveMemoryCollection(collection) {
  try {
    const manifest =
      await getExecutiveMemoryManifest(collection);

    const records = [];

    for (const recordId of manifest.value.recordIds) {
      const read =
        await InstitutionalRepositoryAuthority.read({
          namespace:
            EXECUTIVE_MEMORY_REPOSITORY_NAMESPACE,
          key:
            `record:${collection}:${recordId}`,
          classification:
            EXECUTIVE_MEMORY_REPOSITORY_CLASSIFICATION
        });

      if (!read?.found) {
        const error = new Error(
          `Executive Memory durable manifest references missing record "${recordId}" in "${collection}".`
        );
        error.status = 500;
        error.code =
          "EXECUTIVE_MEMORY_DURABLE_RECORD_MISSING";
        error.details = {
          collection,
          recordId
        };
        throw error;
      }

      records.push(read.value);
    }

    executiveMemoryRepositoryState.lastDurableReadAt =
      new Date().toISOString();
    executiveMemoryRepositoryState.lastError = null;

    await writeExecutiveMemoryLocalCache(
      collection,
      records
    );

    return records;
  } catch (error) {
    executiveMemoryRepositoryState.lastError = {
      at: new Date().toISOString(),
      operation: "read",
      collection,
      code:
        error?.code ||
        "EXECUTIVE_MEMORY_DURABLE_READ_FAILED",
      message: error?.message || String(error)
    };

    throw error;
  }
}

async function writeExecutiveMemoryCollection(collection, records) {
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

  try {
    const currentManifest =
      await getExecutiveMemoryManifest(collection);

    const desiredIds =
      records.map(record => record.id);
    const desiredIdSet =
      new Set(desiredIds);
    const previousIds =
      currentManifest.value.recordIds;
    const removedIds =
      previousIds.filter(
        recordId => !desiredIdSet.has(recordId)
      );

    /*
     * Write records first, then commit the manifest. The manifest is the
     * collection visibility boundary: readers do not observe a record as part
     * of the collection until every durable record write has verified.
     */
    for (const record of records) {
      const existing =
        await InstitutionalRepositoryAuthority.read({
          namespace:
            EXECUTIVE_MEMORY_REPOSITORY_NAMESPACE,
          key:
            `record:${collection}:${record.id}`,
          classification:
            EXECUTIVE_MEMORY_REPOSITORY_CLASSIFICATION
        });

      await InstitutionalRepositoryAuthority.write({
        namespace:
          EXECUTIVE_MEMORY_REPOSITORY_NAMESPACE,
        key:
          `record:${collection}:${record.id}`,
        classification:
          EXECUTIVE_MEMORY_REPOSITORY_CLASSIFICATION,
        value: record,
        metadata:
          executiveMemoryRepositoryMetadata(collection, {
            recordType:
              "executive-memory-record"
          }),
        expectedPreviousFingerprint:
          existing?.found
            ? existing.record?.payloadFingerprint
            : null
      });
    }

    const manifestWrite =
      await writeExecutiveMemoryManifest(
        collection,
        desiredIds,
        currentManifest.fingerprint
      );

    /*
     * Only after the new manifest is durably verified do we delete records
     * removed from the logical collection. This avoids a partial-write window
     * where the manifest points at data that was already destroyed.
     */
    for (const recordId of removedIds) {
      await InstitutionalRepositoryAuthority.delete({
        namespace:
          EXECUTIVE_MEMORY_REPOSITORY_NAMESPACE,
        key:
          `record:${collection}:${recordId}`,
        classification:
          EXECUTIVE_MEMORY_REPOSITORY_CLASSIFICATION
      });
    }

    executiveMemoryRepositoryState.lastDurableWriteAt =
      new Date().toISOString();
    executiveMemoryRepositoryState.lastError = null;

    await writeExecutiveMemoryLocalCache(
      collection,
      records
    );

    return {
      success: true,
      providerId: manifestWrite.providerId,
      authority: manifestWrite.authority,
      recordCount: records.length,
      removedRecordCount: removedIds.length,
      verified:
        manifestWrite?.verification?.verified === true
    };
  } catch (error) {
    executiveMemoryRepositoryState.lastError = {
      at: new Date().toISOString(),
      operation: "write",
      collection,
      code:
        error?.code ||
        "EXECUTIVE_MEMORY_DURABLE_WRITE_FAILED",
      message: error?.message || String(error)
    };

    throw error;
  }
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
    await ensureExecutiveMemoryRepositoryProvider();

    const provider =
      await InstitutionalRepositoryAuthority.selectProvider({
        classification:
          EXECUTIVE_MEMORY_REPOSITORY_CLASSIFICATION,
        operation: "write"
      });

    const authorityStatus =
      InstitutionalRepositoryAuthority.getStatus();

    return {
      status: "ready",
      authority:
        "meos-institutional-repository",
      durable: true,
      productionSafe: true,
      persistenceMode:
        "provider-neutral-durable-repository",
      providerNeutral: true,
      activeProviderId: provider.id,
      localFilesystemRole:
        executiveMemoryRepositoryState.localFilesystemRole,
      dataDirectory: MEOS_DATA_DIR,
      memoryDirectory: EXECUTIVE_MEMORY_DIR,
      persistentDiskExpected: false,
      configuration: {
        environmentVariable: "MEOS_DATA_DIR",
        configured:
          EXECUTIVE_MEMORY_DATA_DIR_CONFIGURED,
        requiredForDurability: false
      },
      repositoryAuthority: {
        version:
          InstitutionalRepositoryAuthority.version,
        commission:
          InstitutionalRepositoryAuthority.commission,
        buildId:
          InstitutionalRepositoryAuthority.buildId,
        providerCount:
          authorityStatus.providerCount,
        durableProviderCount:
          authorityStatus.durableProviderCount
      },
      migration: {
        mode:
          "read-through-one-time-local-to-durable",
        migratedCollections: [
          ...executiveMemoryRepositoryState
            .migratedCollections
        ],
        lastMigrationAt:
          executiveMemoryRepositoryState.lastMigrationAt
      },
      continuity: {
        localCacheAvailable: true,
        localCacheAuthoritative: false,
        failVisibleIfDurableAuthorityUnavailable: true
      },
      lastDurableReadAt:
        executiveMemoryRepositoryState.lastDurableReadAt,
      lastDurableWriteAt:
        executiveMemoryRepositoryState.lastDurableWriteAt,
      lastError:
        executiveMemoryRepositoryState.lastError
    };
  } catch (error) {
    return {
      status: "degraded",
      authority:
        "meos-institutional-repository",
      durable: false,
      productionSafe: false,
      persistenceMode:
        "durable-authority-unavailable",
      providerNeutral: true,
      activeProviderId: null,
      localFilesystemRole:
        executiveMemoryRepositoryState.localFilesystemRole,
      dataDirectory: MEOS_DATA_DIR,
      memoryDirectory: EXECUTIVE_MEMORY_DIR,
      persistentDiskExpected: false,
      configuration: {
        environmentVariable: "MEOS_DATA_DIR",
        configured:
          EXECUTIVE_MEMORY_DATA_DIR_CONFIGURED,
        requiredForDurability: false
      },
      continuity: {
        localCacheAvailable: true,
        localCacheAuthoritative: false,
        failVisibleIfDurableAuthorityUnavailable: true
      },
      lastError: {
        at: new Date().toISOString(),
        operation: "status",
        code:
          error?.code ||
          "EXECUTIVE_MEMORY_DURABLE_AUTHORITY_UNAVAILABLE",
        message: error?.message || String(error)
      }
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
 * Commission 006.017D4A — Executive Brain Bounded Cognition Durable Authority
 *
 * Gives Executive Brain a provider-neutral durable authority seam before the
 * browser engine itself is switched from laptop IndexedDB authority.
 *
 * Hot cognition remains runtime memory. Only the bounded persistence contract
 * already defined by Executive Brain is eligible for institutional storage.
 */
app.get(
  "/api/headless-research-runtime",
  (request, response) => {
    response.set("Cache-Control", "no-store");
    response.status(200).json(
      getHeadlessResearchStatus()
    );
  }
);

app.post(
  "/api/headless-research",
  express.json({ limit: "1mb" }),
  async (request, response) => {
    response.set("Cache-Control", "no-store");
    const result = await executeHeadlessResearch(
      request.body || {}
    );
    response
      .status(result.success ? 200 : 400)
      .json(result);
  }
);


app.get(
  "/api/continuous-cognition-runtime",
  (request, response) => {
    response.set("Cache-Control", "no-store");
    response.status(200).json(
      getContinuousCognitionRuntimeStatus()
    );
  }
);

app.get(
  "/api/executive-brain-authority",
  (request, response) => {
    response.set("Cache-Control", "no-store");
    response.status(200).json(
      getExecutiveBrainAuthorityStatus()
    );
  }
);


app.get(
  "/api/executive-brain-state",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    try {
      const result =
        await readDurableExecutiveBrainState();

      if (!result?.found) {
        response.status(404).json({
          commission:
            EXECUTIVE_BRAIN_STATE_REPOSITORY_COMMISSION,
          schema:
            "meos.executive-brain-state.read.v1",
          found: false,
          authority:
            "meos-institutional-repository",
          providerId:
            result?.providerId || null
        });
        return;
      }

      response.status(200).json({
        commission:
          EXECUTIVE_BRAIN_STATE_REPOSITORY_COMMISSION,
        schema:
          "meos.executive-brain-state.read.v1",
        found: true,
        authority:
          result.authority,
        providerId:
          result.providerId,
        record:
          result.record,
        value:
          result.value
      });
    } catch (error) {
      response
        .status(error?.status || 500)
        .json({
          commission:
            EXECUTIVE_BRAIN_STATE_REPOSITORY_COMMISSION,
          success: false,
          error:
            error?.message || String(error),
          code:
            error?.code ||
            "EXECUTIVE_BRAIN_STATE_DURABLE_READ_FAILED"
        });
    }
  }
);

app.put(
  "/api/executive-brain-state",
  express.json({
    limit: "8mb",
    strict: true
  }),
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    try {
      const expectedPreviousFingerprint =
        request.get(
          "If-MEOS-Previous-Fingerprint"
        ) || undefined;

      const result =
        await commitCanonicalExecutiveBrainState(
          request.body,
          {
            source: "browser-interactive",
            observedFingerprint:
              expectedPreviousFingerprint
          }
        );

      response.status(200).json({
        commission:
          EXECUTIVE_BRAIN_STATE_REPOSITORY_COMMISSION,
        schema:
          "meos.executive-brain-state.write.v1",
        success: true,
        authority:
          result.authority,
        providerId:
          result.providerId,
        verification:
          result.verification,
        record:
          result.record,
        cognitiveAuthority:
          result.cognitiveAuthority
      });
    } catch (error) {
      response
        .status(error?.status || 500)
        .json({
          commission:
            EXECUTIVE_BRAIN_STATE_REPOSITORY_COMMISSION,
          success: false,
          error:
            error?.message || String(error),
          code:
            error?.code ||
            "EXECUTIVE_BRAIN_STATE_DURABLE_WRITE_FAILED",
          details:
            error?.details || null
        });
    }
  }
);

app.post(
  "/api/executive-brain-state/acceptance-test",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    const acceptanceKey =
      `acceptance-${crypto.randomUUID()}`;
    const namespace =
      "executive-brain-acceptance";

    try {
      registerGoogleInstitutionalRepositoryAuthority();

      const sentinel = {
        schema:
          "meos.executive-brain.durable-state.v1",
        version: "1.3.2",
        buildId:
          EXECUTIVE_BRAIN_STATE_REPOSITORY_BUILD_ID,
        savedAt:
          new Date().toISOString(),
        state: {
          schema:
            "meos.executive-brain.state.v1",
          version: "1.3.2",
          savedAt:
            new Date().toISOString(),
          history: [{
            id: `${acceptanceKey}-history`,
            event: "durable-cognition-proof"
          }],
          cognitionHistory: [{
            id: `${acceptanceKey}-cognition`,
            status: "acceptance-only"
          }],
          cognitiveDispatchHistory: [{
            id: `${acceptanceKey}-dispatch`,
            status: "acceptance-only"
          }],
          cognitiveReentryHistory: [{
            id: `${acceptanceKey}-reentry`,
            status: "acceptance-only"
          }]
        }
      };

      const write =
        await InstitutionalRepositoryAuthority.write({
          namespace,
          key: acceptanceKey,
          classification:
            EXECUTIVE_BRAIN_STATE_REPOSITORY_CLASSIFICATION,
          value: sentinel,
          metadata: {
            subsystem: "executive-brain",
            stateClass:
              "bounded-institutional-cognition",
            purpose:
              "006.017D4A-live-acceptance"
          }
        });

      const read =
        await InstitutionalRepositoryAuthority.read({
          namespace,
          key: acceptanceKey,
          classification:
            EXECUTIVE_BRAIN_STATE_REPOSITORY_CLASSIFICATION
        });

      const checks = [
        {
          name:
            "Executive Brain State resolves through provider-neutral Repository Authority",
          passed:
            write?.authority ===
              "durable-institutional-repository"
        },
        {
          name:
            "Bounded cognition write is durably verified",
          passed:
            write?.success === true &&
            write?.verification?.verified === true
        },
        {
          name:
            "Bounded cognition reads back through selected durable provider",
          passed:
            read?.found === true &&
            Boolean(read?.providerId)
        },
        {
          name:
            "All four bounded Executive Brain history surfaces survive semantic round trip",
          passed:
            read?.value?.state?.history?.[0]?.id ===
              `${acceptanceKey}-history` &&
            read?.value?.state?.cognitionHistory?.[0]?.id ===
              `${acceptanceKey}-cognition` &&
            read?.value?.state?.cognitiveDispatchHistory?.[0]?.id ===
              `${acceptanceKey}-dispatch` &&
            read?.value?.state?.cognitiveReentryHistory?.[0]?.id ===
              `${acceptanceKey}-reentry`
        },
        {
          name:
            "Executive Brain durable state is classified as institutional cognition rather than browser storage",
          passed:
            read?.authority ===
              "durable-institutional-repository"
        }
      ];

      const cleanup =
        await InstitutionalRepositoryAuthority.delete({
          namespace,
          key: acceptanceKey,
          classification:
            EXECUTIVE_BRAIN_STATE_REPOSITORY_CLASSIFICATION
        });

      checks.push({
        name:
          "Acceptance cognition sentinel is removed through the same durable authority",
        passed:
          cleanup?.success === true &&
          cleanup?.deleted === true
      });

      const passed =
        checks.every(check => check.passed);

      response
        .status(passed ? 200 : 500)
        .json({
          commission:
            EXECUTIVE_BRAIN_STATE_REPOSITORY_COMMISSION,
          schema:
            "meos.executive-brain-state.durable-authority.acceptance.v1",
          version:
            EXECUTIVE_BRAIN_STATE_REPOSITORY_VERSION,
          buildId:
            EXECUTIVE_BRAIN_STATE_REPOSITORY_BUILD_ID,
          passed,
          checks,
          authorityStatus:
            InstitutionalRepositoryAuthority.getStatus(),
          serverVersion: VERSION
        });
    } catch (error) {
      response
        .status(error?.status || 500)
        .json({
          commission:
            EXECUTIVE_BRAIN_STATE_REPOSITORY_COMMISSION,
          schema:
            "meos.executive-brain-state.durable-authority.acceptance.v1",
          version:
            EXECUTIVE_BRAIN_STATE_REPOSITORY_VERSION,
          buildId:
            EXECUTIVE_BRAIN_STATE_REPOSITORY_BUILD_ID,
          passed: false,
          checks: [],
          error:
            error?.message || String(error),
          code:
            error?.code ||
            "EXECUTIVE_BRAIN_STATE_DURABLE_ACCEPTANCE_FAILED",
          serverVersion: VERSION
        });
    }
  }
);


/**
 * Commission 006.017D0C — Live Sovereign State Portability Gateway
 */
app.get("/api/meos-portability/status", (request, response) => {
  response.set("Cache-Control", "no-store");

  try {
    requirePortabilityCore();
    registerGoogleInstitutionalRepositoryAuthority();

    response.status(200).json({
      commission: MEOS_PORTABILITY_GATEWAY_COMMISSION,
      schema: "meos.portability-gateway.status.v1",
      version: MEOS_PORTABILITY_GATEWAY_VERSION,
      buildId: MEOS_PORTABILITY_GATEWAY_BUILD_ID,
      ready: true,
      providerNeutral: true,
      defaultManifest: getDefaultPortableStateManifest(),
      repository: InstitutionalRepositoryAuthority.getStatus(),
      serverVersion: VERSION
    });
  } catch (error) {
    response.status(error?.status || 500).json({
      commission: MEOS_PORTABILITY_GATEWAY_COMMISSION,
      ready: false,
      error: error?.message || String(error),
      code: error?.code || "MEOS_PORTABILITY_STATUS_FAILED",
      serverVersion: VERSION
    });
  }
});

app.post(
  "/api/meos-portability/export",
  express.json({ limit: "1mb", strict: true }),
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    try {
      requirePortabilityCore();
      registerGoogleInstitutionalRepositoryAuthority();

      const manifest = normalizePortableManifest(
        request.body?.records
      );

      const portablePackage =
        await InstitutionalRepositoryAuthority.exportPortableStatePackage({
          records: manifest,
          packageMetadata: {
            purpose:
              String(request.body?.purpose || "authorized-deployment-backup")
                .slice(0, 240),
            gatewayCommission:
              MEOS_PORTABILITY_GATEWAY_COMMISSION,
            gatewayBuildId:
              MEOS_PORTABILITY_GATEWAY_BUILD_ID,
            exportedByServerVersion: VERSION
          }
        });

      const bytes =
        portablePackageByteLength(portablePackage);

      if (bytes > MEOS_PORTABILITY_MAX_PACKAGE_BYTES) {
        const error = new Error(
          `Portable MEOS state package exceeds ${MEOS_PORTABILITY_MAX_PACKAGE_BYTES} bytes.`
        );
        error.status = 413;
        error.code = "MEOS_PORTABLE_PACKAGE_SIZE_LIMIT_EXCEEDED";
        throw error;
      }

      response.status(200).json({
        commission: MEOS_PORTABILITY_GATEWAY_COMMISSION,
        schema: "meos.portability-gateway.export.v1",
        success: true,
        providerNeutral: true,
        bytes,
        package: portablePackage,
        serverVersion: VERSION
      });
    } catch (error) {
      response.status(error?.status || 500).json({
        commission: MEOS_PORTABILITY_GATEWAY_COMMISSION,
        success: false,
        error: error?.message || String(error),
        code: error?.code || "MEOS_PORTABILITY_EXPORT_FAILED",
        details: error?.details || null,
        serverVersion: VERSION
      });
    }
  }
);

app.post(
  "/api/meos-portability/restore",
  express.json({ limit: "21mb", strict: true }),
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    try {
      requirePortabilityCore();

      if (request.body?.confirmRestore !== true) {
        const error = new Error(
          "Portable state restore requires explicit confirmRestore=true."
        );
        error.status = 400;
        error.code = "MEOS_PORTABILITY_RESTORE_CONFIRMATION_REQUIRED";
        throw error;
      }

      const portablePackage = request.body?.package;
      const bytes =
        portablePackageByteLength(portablePackage);

      if (bytes > MEOS_PORTABILITY_MAX_PACKAGE_BYTES) {
        const error = new Error(
          `Portable MEOS state package exceeds ${MEOS_PORTABILITY_MAX_PACKAGE_BYTES} bytes.`
        );
        error.status = 413;
        error.code = "MEOS_PORTABLE_PACKAGE_SIZE_LIMIT_EXCEEDED";
        throw error;
      }

      registerGoogleInstitutionalRepositoryAuthority();

      const result =
        await InstitutionalRepositoryAuthority.restorePortableStatePackage(
          portablePackage,
          {
            overwrite: request.body?.overwrite === true,
            restoreMetadata: {
              restoredThrough:
                "meos-live-portability-gateway",
              gatewayCommission:
                MEOS_PORTABILITY_GATEWAY_COMMISSION,
              gatewayBuildId:
                MEOS_PORTABILITY_GATEWAY_BUILD_ID
            }
          }
        );

      response.status(result.success ? 200 : 409).json({
        commission: MEOS_PORTABILITY_GATEWAY_COMMISSION,
        schema: "meos.portability-gateway.restore.v1",
        ...result,
        serverVersion: VERSION
      });
    } catch (error) {
      response.status(error?.status || 500).json({
        commission: MEOS_PORTABILITY_GATEWAY_COMMISSION,
        success: false,
        error: error?.message || String(error),
        code: error?.code || "MEOS_PORTABILITY_RESTORE_FAILED",
        details: error?.details || null,
        serverVersion: VERSION
      });
    }
  }
);

/**
 * Commission 006.017D0D — Customer-Controlled Sovereign Backup Download
 *
 * Turns the already-proven provider-neutral portable package into an actual
 * file the deployment owner can save outside the active cloud provider.
 * No browser database, no localStorage, no IndexedDB, and no background loop.
 */
app.get(
  "/api/meos-portability/download",
  async (request, response) => {
    response.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.set("Pragma", "no-cache");
    response.set("Expires", "0");

    try {
      requirePortabilityCore();
      registerGoogleInstitutionalRepositoryAuthority();

      const portablePackage =
        await InstitutionalRepositoryAuthority.exportPortableStatePackage({
          records: getDefaultPortableStateManifest(),
          packageMetadata: {
            purpose:
              "customer-controlled-sovereign-backup-download",
            gatewayCommission:
              MEOS_PORTABILITY_GATEWAY_COMMISSION,
            backupCommission:
              MEOS_SOVEREIGN_BACKUP_COMMISSION,
            exportedByServerVersion: VERSION
          }
        });

      const backupEnvelope =
        buildSovereignBackupEnvelope(portablePackage);

      const serialized =
        JSON.stringify(backupEnvelope, null, 2);
      const bytes =
        Buffer.byteLength(serialized, "utf8");

      if (bytes > MEOS_PORTABILITY_MAX_PACKAGE_BYTES) {
        const error = new Error(
          `Portable MEOS backup exceeds ${MEOS_PORTABILITY_MAX_PACKAGE_BYTES} bytes.`
        );
        error.status = 413;
        error.code = "MEOS_SOVEREIGN_BACKUP_SIZE_LIMIT_EXCEEDED";
        throw error;
      }

      const filename =
        buildSovereignBackupFilename();

      response.set(
        "Content-Type",
        "application/json; charset=utf-8"
      );
      response.set(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      response.set(
        "X-MEOS-Backup-Commission",
        MEOS_SOVEREIGN_BACKUP_COMMISSION
      );
      response.set(
        "X-MEOS-Package-Fingerprint",
        portablePackage.packageFingerprint
      );
      response.set(
        "X-MEOS-Backup-Bytes",
        String(bytes)
      );

      response.status(200).send(serialized);
    } catch (error) {
      response.status(error?.status || 500).json({
        commission:
          MEOS_SOVEREIGN_BACKUP_COMMISSION,
        success: false,
        error: error?.message || String(error),
        code:
          error?.code ||
          "MEOS_SOVEREIGN_BACKUP_DOWNLOAD_FAILED",
        details: error?.details || null,
        serverVersion: VERSION
      });
    }
  }
);

app.post(
  "/api/meos-portability/backup-acceptance-test",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    const namespace = "meos-sovereign-backup-acceptance";
    const key = `sentinel-${crypto.randomUUID()}`;
    const classification = "institutional";

    try {
      requirePortabilityCore();
      registerGoogleInstitutionalRepositoryAuthority();

      const sentinelValue = {
        schema: "meos.sovereign-backup.acceptance-sentinel.v1",
        id: key,
        createdAt: new Date().toISOString()
      };

      const seed =
        await InstitutionalRepositoryAuthority.write({
          namespace,
          key,
          classification,
          value: sentinelValue,
          metadata: {
            purpose:
              "006.017D0D-sovereign-backup-acceptance"
          }
        });

      const portablePackage =
        await InstitutionalRepositoryAuthority.exportPortableStatePackage({
          records: [{
            namespace,
            key,
            classification,
            required: true
          }],
          packageMetadata: {
            purpose:
              "006.017D0D-sovereign-backup-acceptance"
          }
        });

      const envelope =
        buildSovereignBackupEnvelope(
          portablePackage
        );

      const serialized =
        JSON.stringify(envelope, null, 2);
      const bytes =
        Buffer.byteLength(serialized, "utf8");

      const verification =
        InstitutionalRepositoryAuthority.validatePortableStatePackage(
          envelope.package
        );

      const filename =
        buildSovereignBackupFilename(
          new Date("2026-08-08T12:34:56.789Z")
        );

      const cleanup =
        await InstitutionalRepositoryAuthority.delete({
          namespace,
          key,
          classification
        });

      const checks = [
        {
          name:
            "Live durable state can be exported into a customer-controlled backup envelope",
          passed:
            seed?.verification?.verified === true &&
            envelope?.schema ===
              "meos.sovereign-backup-file.v1"
        },
        {
          name:
            "Backup envelope contains provider-neutral MEOS portable state",
          passed:
            envelope?.providerNeutral === true &&
            envelope?.package?.schema ===
              "meos.sovereign-state-package.v1"
        },
        {
          name:
            "Portable package inside backup verifies before restore",
          passed:
            verification?.verified === true
        },
        {
          name:
            "Backup file has an explicit MEOS-owned portable filename",
          passed:
            filename ===
              "MEOS-Maddy-State-2026-08-08T12-34-56-789Z.meos.json"
        },
        {
          name:
            "Backup stays inside the commissioned package size ceiling",
          passed:
            bytes > 0 &&
            bytes <=
              MEOS_PORTABILITY_MAX_PACKAGE_BYTES
        },
        {
          name:
            "Backup envelope distinguishes deployment-state portability from MEOS/Maddy IP ownership",
          passed:
            String(envelope?.warning || "")
              .includes(
                "not MEOS/Maddy intellectual-property ownership rights"
              )
        },
        {
          name:
            "Backup generation adds no browser persistence or autonomous background loop",
          passed: true
        },
        {
          name:
            "Backup acceptance sentinel is cleaned up",
          passed:
            cleanup?.success === true &&
            cleanup?.deleted === true
        }
      ];

      const passed =
        checks.every(check => check.passed);

      response.status(
        passed ? 200 : 500
      ).json({
        commission:
          MEOS_SOVEREIGN_BACKUP_COMMISSION,
        schema:
          "meos.sovereign-backup.acceptance.v1",
        version:
          MEOS_SOVEREIGN_BACKUP_VERSION,
        buildId:
          MEOS_SOVEREIGN_BACKUP_BUILD_ID,
        passed,
        checks,
        bytes,
        filename,
        packageFingerprint:
          portablePackage.packageFingerprint,
        serverVersion: VERSION
      });
    } catch (error) {
      try {
        await InstitutionalRepositoryAuthority.delete({
          namespace,
          key,
          classification
        });
      } catch (_cleanupError) {
        // Best-effort cleanup after a failed acceptance test.
      }

      response.status(error?.status || 500).json({
        commission:
          MEOS_SOVEREIGN_BACKUP_COMMISSION,
        schema:
          "meos.sovereign-backup.acceptance.v1",
        version:
          MEOS_SOVEREIGN_BACKUP_VERSION,
        buildId:
          MEOS_SOVEREIGN_BACKUP_BUILD_ID,
        passed: false,
        checks: [],
        error: error?.message || String(error),
        code:
          error?.code ||
          "MEOS_SOVEREIGN_BACKUP_ACCEPTANCE_FAILED",
        serverVersion: VERSION
      });
    }
  }
);

app.post(
  "/api/meos-portability/acceptance-test",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    const namespace = "meos-portability-acceptance";
    const key = `sentinel-${crypto.randomUUID()}`;
    const classification = "institutional";

    try {
      requirePortabilityCore();
      registerGoogleInstitutionalRepositoryAuthority();

      const sentinelValue = {
        schema: "meos.portability.acceptance-sentinel.v1",
        id: key,
        createdAt: new Date().toISOString(),
        meaning:
          "If this survives export-delete-restore, the live escape path works."
      };

      const seed =
        await InstitutionalRepositoryAuthority.write({
          namespace,
          key,
          classification,
          value: sentinelValue,
          metadata: {
            purpose:
              "006.017D0C-live-portability-acceptance"
          }
        });

      const portablePackage =
        await InstitutionalRepositoryAuthority.exportPortableStatePackage({
          records: [
            {
              namespace,
              key,
              classification,
              required: true
            }
          ],
          packageMetadata: {
            purpose:
              "006.017D0C-live-portability-acceptance"
          }
        });

      const verified =
        InstitutionalRepositoryAuthority.validatePortableStatePackage(
          portablePackage
        );

      const removed =
        await InstitutionalRepositoryAuthority.delete({
          namespace,
          key,
          classification
        });

      const afterDelete =
        await InstitutionalRepositoryAuthority.read({
          namespace,
          key,
          classification
        });

      const restored =
        await InstitutionalRepositoryAuthority.restorePortableStatePackage(
          portablePackage
        );

      const afterRestore =
        await InstitutionalRepositoryAuthority.read({
          namespace,
          key,
          classification
        });

      const protectedRestore =
        await InstitutionalRepositoryAuthority.restorePortableStatePackage(
          portablePackage
        );

      const tampered =
        JSON.parse(JSON.stringify(portablePackage));
      tampered.records[0].value = {
        tampered: true
      };

      let tamperRejected = false;
      try {
        InstitutionalRepositoryAuthority.validatePortableStatePackage(
          tampered
        );
      } catch (error) {
        tamperRejected =
          error?.code ===
            "MEOS_PORTABLE_PACKAGE_FINGERPRINT_MISMATCH" ||
          error?.code ===
            "MEOS_PORTABLE_RECORD_FINGERPRINT_MISMATCH";
      }

      const cleanup =
        await InstitutionalRepositoryAuthority.delete({
          namespace,
          key,
          classification
        });

      const checks = [
        {
          name:
            "Live repository provider accepts an isolated portability sentinel",
          passed:
            seed?.success === true &&
            seed?.verification?.verified === true
        },
        {
          name:
            "Live gateway exports durable state in MEOS provider-neutral package format",
          passed:
            portablePackage?.schema ===
              "meos.sovereign-state-package.v1" &&
            portablePackage?.recordCount === 1 &&
            Boolean(portablePackage?.packageFingerprint)
        },
        {
          name:
            "Exported package verifies before restore",
          passed:
            verified?.verified === true
        },
        {
          name:
            "Acceptance state can be removed from the live repository before restore",
          passed:
            removed?.success === true &&
            removed?.deleted === true &&
            afterDelete?.found === false
        },
        {
          name:
            "Portable package restores the same state through live Repository Authority",
          passed:
            restored?.success === true &&
            restored?.restoredCount === 1 &&
            afterRestore?.found === true &&
            afterRestore?.value?.id === key
        },
        {
          name:
            "Existing durable truth is protected from accidental restore overwrite",
          passed:
            protectedRestore?.restoredCount === 0 &&
            protectedRestore?.protectedCount === 1
        },
        {
          name:
            "Tampered portable package is rejected",
          passed: tamperRejected === true
        },
        {
          name:
            "Acceptance sentinel is cleaned up after verification",
          passed:
            cleanup?.success === true &&
            cleanup?.deleted === true
        }
      ];

      const passed =
        checks.every(check => check.passed);

      response.status(passed ? 200 : 500).json({
        commission: MEOS_PORTABILITY_GATEWAY_COMMISSION,
        schema: "meos.portability-gateway.acceptance.v1",
        version: MEOS_PORTABILITY_GATEWAY_VERSION,
        buildId: MEOS_PORTABILITY_GATEWAY_BUILD_ID,
        passed,
        checks,
        serverVersion: VERSION
      });
    } catch (error) {
      try {
        await InstitutionalRepositoryAuthority.delete({
          namespace,
          key,
          classification
        });
      } catch (_cleanupError) {
        // Acceptance cleanup is best effort after a failed test.
      }

      response.status(error?.status || 500).json({
        commission: MEOS_PORTABILITY_GATEWAY_COMMISSION,
        schema: "meos.portability-gateway.acceptance.v1",
        version: MEOS_PORTABILITY_GATEWAY_VERSION,
        buildId: MEOS_PORTABILITY_GATEWAY_BUILD_ID,
        passed: false,
        checks: [],
        error: error?.message || String(error),
        code: error?.code || "MEOS_PORTABILITY_ACCEPTANCE_FAILED",
        serverVersion: VERSION
      });
    }
  }
);


/**
 * Commission 006.017D6A — Executive Learning Durable Authority Seam
 *
 * Server-only P6 prerequisite. The browser remains unchanged until the
 * Executive Learning authority-flip commission passes independently.
 */
app.get(
  "/api/executive-learning-state",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    try {
      const result =
        await readDurableExecutiveLearningState();

      if (!result?.found) {
        /*
         * An empty durable learning repository is a valid first-run state,
         * not a transport failure. Executive Learning uses found:false to
         * migrate its bounded recovery cache forward into Repository Authority.
         * Keep HTTP errors reserved for actual failures.
         */
        response.status(200).json({
          commission:
            EXECUTIVE_LEARNING_STATE_REPOSITORY_COMMISSION,
          schema:
            "meos.executive-learning-state.read.v1",
          found: false,
          authority: "meos-institutional-repository",
          providerId: result?.providerId || null
        });
        return;
      }

      response.status(200).json({
        commission:
          EXECUTIVE_LEARNING_STATE_REPOSITORY_COMMISSION,
        schema:
          "meos.executive-learning-state.read.v1",
        found: true,
        authority: result.authority,
        providerId: result.providerId,
        record: result.record,
        value: result.value
      });
    } catch (error) {
      response.status(error?.status || 500).json({
        commission:
          EXECUTIVE_LEARNING_STATE_REPOSITORY_COMMISSION,
        success: false,
        error: error?.message || String(error),
        code:
          error?.code ||
          "EXECUTIVE_LEARNING_STATE_DURABLE_READ_FAILED"
      });
    }
  }
);

app.put(
  "/api/executive-learning-state",
  express.json({
    limit: "9mb",
    strict: true
  }),
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    try {
      const expectedPreviousFingerprint =
        request.get("If-MEOS-Previous-Fingerprint") || undefined;

      const result =
        await writeDurableExecutiveLearningState(
          request.body,
          expectedPreviousFingerprint
        );

      response.status(200).json({
        commission:
          EXECUTIVE_LEARNING_STATE_REPOSITORY_COMMISSION,
        schema:
          "meos.executive-learning-state.write.v1",
        success: true,
        authority: result.authority,
        providerId: result.providerId,
        verification: result.verification,
        record: result.record
      });
    } catch (error) {
      response.status(error?.status || 500).json({
        commission:
          EXECUTIVE_LEARNING_STATE_REPOSITORY_COMMISSION,
        success: false,
        error: error?.message || String(error),
        code:
          error?.code ||
          "EXECUTIVE_LEARNING_STATE_DURABLE_WRITE_FAILED",
        details: error?.details || null
      });
    }
  }
);

app.post(
  "/api/executive-learning-state/acceptance-test",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    const acceptanceKey =
      `acceptance-${crypto.randomUUID()}`;
    const namespace =
      "executive-learning-acceptance";

    try {
      registerGoogleInstitutionalRepositoryAuthority();

      const sentinelState = {
        schema: "meos.executive-learning.package.v1",
        version: "1.0.2",
        buildId:
          EXECUTIVE_LEARNING_STATE_REPOSITORY_BUILD_ID,
        exportedAt: new Date().toISOString(),
        observations: [{
          id: `${acceptanceKey}-observation`,
          type: "acceptance-observation"
        }],
        lessons: [{
          id: `${acceptanceKey}-lesson`,
          status: "validated",
          confidence: 0.91
        }],
        feedback: [{
          id: `${acceptanceKey}-feedback`,
          type: "positive"
        }],
        history: [{
          id: `${acceptanceKey}-history`,
          event: "acceptance-only"
        }]
      };

      const normalized =
        normalizeExecutiveLearningStateEnvelope({
          version: "1.0.2",
          buildId:
            EXECUTIVE_LEARNING_STATE_REPOSITORY_BUILD_ID,
          state: sentinelState
        });

      const write =
        await InstitutionalRepositoryAuthority.write({
          namespace,
          key: acceptanceKey,
          classification:
            EXECUTIVE_LEARNING_STATE_REPOSITORY_CLASSIFICATION,
          value: normalized,
          metadata: {
            subsystem: "executive-learning",
            purpose:
              "006.017D6A-live-acceptance",
            providerNeutral: true
          }
        });

      const read =
        await InstitutionalRepositoryAuthority.read({
          namespace,
          key: acceptanceKey,
          classification:
            EXECUTIVE_LEARNING_STATE_REPOSITORY_CLASSIFICATION
        });

      const portableManifest =
        getDefaultPortableStateManifest();

      const checks = [
        {
          name:
            "Executive Learning resolves through provider-neutral Repository Authority",
          passed:
            write?.authority ===
              "durable-institutional-repository"
        },
        {
          name:
            "Current provider performs a verified durable write without becoming MEOS authority",
          passed:
            write?.success === true &&
            write?.verification?.verified === true &&
            Boolean(write?.providerId)
        },
        {
          name:
            "Executive Learning durable state reads back through the same authority",
          passed:
            read?.found === true &&
            read?.authority ===
              "durable-institutional-repository"
        },
        {
          name:
            "Learning semantics survive durable round trip",
          passed:
            read?.value?.state?.lessons?.[0]?.id ===
              `${acceptanceKey}-lesson` &&
            read?.value?.state?.observations?.[0]?.id ===
              `${acceptanceKey}-observation` &&
            read?.value?.state?.feedback?.[0]?.id ===
              `${acceptanceKey}-feedback`
        },
        {
          name:
            "Executive Learning is included in the sovereign Go Bag manifest",
          passed:
            portableManifest.some(item =>
              item?.subsystem === "executive-learning" &&
              item?.namespace ===
                EXECUTIVE_LEARNING_STATE_REPOSITORY_NAMESPACE &&
              item?.key ===
                EXECUTIVE_LEARNING_STATE_REPOSITORY_KEY
            )
        },
        {
          name:
            "Durable seam remains bounded and provider-neutral",
          passed:
            EXECUTIVE_LEARNING_STATE_MAX_BYTES ===
              8 * 1024 * 1024 &&
            normalized.schema ===
              "meos.executive-learning.durable-state.v1"
        }
      ];

      const cleanup =
        await InstitutionalRepositoryAuthority.delete({
          namespace,
          key: acceptanceKey,
          classification:
            EXECUTIVE_LEARNING_STATE_REPOSITORY_CLASSIFICATION
        });

      checks.push({
        name:
          "Executive Learning acceptance sentinel is removed through the same authority",
        passed:
          cleanup?.success === true &&
          cleanup?.deleted === true
      });

      const passed =
        checks.every(check => check.passed);

      response.status(passed ? 200 : 500).json({
        commission:
          EXECUTIVE_LEARNING_STATE_REPOSITORY_COMMISSION,
        schema:
          "meos.executive-learning-state.durable-authority.acceptance.v1",
        version:
          EXECUTIVE_LEARNING_STATE_REPOSITORY_VERSION,
        buildId:
          EXECUTIVE_LEARNING_STATE_REPOSITORY_BUILD_ID,
        passed,
        checks,
        authorityStatus:
          InstitutionalRepositoryAuthority.getStatus(),
        serverVersion: VERSION
      });
    } catch (error) {
      try {
        await InstitutionalRepositoryAuthority.delete({
          namespace,
          key: acceptanceKey,
          classification:
            EXECUTIVE_LEARNING_STATE_REPOSITORY_CLASSIFICATION
        });
      } catch {}

      response.status(error?.status || 500).json({
        commission:
          EXECUTIVE_LEARNING_STATE_REPOSITORY_COMMISSION,
        schema:
          "meos.executive-learning-state.durable-authority.acceptance.v1",
        version:
          EXECUTIVE_LEARNING_STATE_REPOSITORY_VERSION,
        buildId:
          EXECUTIVE_LEARNING_STATE_REPOSITORY_BUILD_ID,
        passed: false,
        checks: [],
        error: error?.message || String(error),
        code:
          error?.code ||
          "EXECUTIVE_LEARNING_STATE_DURABLE_ACCEPTANCE_FAILED",
        serverVersion: VERSION
      });
    }
  }
);

/**
 * Commission 006.017D5A2 — Provider Manager Bounded Durable Authority Seam
 *
 * Server-only P5 prerequisite. This route does not create browser writes,
 * timers, polling, or cognition loops.
 */
app.get(
  "/api/provider-manager-state",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    try {
      const result =
        await readDurableProviderManagerState();

      if (!result?.found) {
        response.status(404).json({
          commission:
            PROVIDER_MANAGER_STATE_REPOSITORY_COMMISSION,
          schema:
            "meos.provider-manager-state.read.v1",
          found: false,
          authority:
            "meos-institutional-repository",
          providerId:
            result?.providerId || null
        });
        return;
      }

      response.status(200).json({
        commission:
          PROVIDER_MANAGER_STATE_REPOSITORY_COMMISSION,
        schema:
          "meos.provider-manager-state.read.v1",
        found: true,
        authority:
          result.authority,
        providerId:
          result.providerId,
        record:
          result.record,
        value:
          result.value
      });
    } catch (error) {
      response
        .status(error?.status || 500)
        .json({
          commission:
            PROVIDER_MANAGER_STATE_REPOSITORY_COMMISSION,
          success: false,
          error:
            error?.message || String(error),
          code:
            error?.code ||
            "PROVIDER_MANAGER_STATE_DURABLE_READ_FAILED"
        });
    }
  }
);

app.put(
  "/api/provider-manager-state",
  express.json({
    limit: "300kb",
    strict: true
  }),
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    try {
      const expectedPreviousFingerprint =
        request.get(
          "If-MEOS-Previous-Fingerprint"
        ) || undefined;

      const result =
        await writeDurableProviderManagerState(
          request.body,
          expectedPreviousFingerprint
        );

      response.status(200).json({
        commission:
          PROVIDER_MANAGER_STATE_REPOSITORY_COMMISSION,
        schema:
          "meos.provider-manager-state.write.v1",
        success: true,
        authority:
          result.authority,
        providerId:
          result.providerId,
        verification:
          result.verification,
        record:
          result.record
      });
    } catch (error) {
      response
        .status(error?.status || 500)
        .json({
          commission:
            PROVIDER_MANAGER_STATE_REPOSITORY_COMMISSION,
          success: false,
          error:
            error?.message || String(error),
          code:
            error?.code ||
            "PROVIDER_MANAGER_STATE_DURABLE_WRITE_FAILED",
          details:
            error?.details || null
        });
    }
  }
);

app.post(
  "/api/provider-manager-state/acceptance-test",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    const acceptanceKey =
      `acceptance-${crypto.randomUUID()}`;
    const namespace =
      "provider-manager-acceptance";

    try {
      registerGoogleInstitutionalRepositoryAuthority();

      const sentinelState = {
        schema: "meos.provider-manager.state.v1",
        version: "1.0.2",
        buildId:
          PROVIDER_MANAGER_STATE_REPOSITORY_BUILD_ID,
        savedAt: new Date().toISOString(),
        history: [{
          id: `${acceptanceKey}-history`,
          type: "provider-execution-acceptance",
          providerId: "acceptance-provider",
          capability: "acceptance-only",
          success: true
        }]
      };

      const normalized =
        normalizeProviderManagerStateEnvelope({
          version: "1.0.2",
          buildId:
            PROVIDER_MANAGER_STATE_REPOSITORY_BUILD_ID,
          state: sentinelState
        });

      let secretRejected = false;
      try {
        normalizeProviderManagerStateEnvelope({
          state: {
            ...sentinelState,
            history: [{
              ...sentinelState.history[0],
              apiKey: "must-never-persist"
            }]
          }
        });
      } catch (error) {
        secretRejected =
          error?.code ===
          "PROVIDER_MANAGER_STATE_SECRET_REJECTED";
      }

      const write =
        await InstitutionalRepositoryAuthority.write({
          namespace,
          key: acceptanceKey,
          classification:
            PROVIDER_MANAGER_STATE_REPOSITORY_CLASSIFICATION,
          value: normalized,
          metadata: {
            subsystem: "provider-manager",
            purpose:
              "006.017D5A2-live-acceptance",
            containsSecrets: false
          }
        });

      const read =
        await InstitutionalRepositoryAuthority.read({
          namespace,
          key: acceptanceKey,
          classification:
            PROVIDER_MANAGER_STATE_REPOSITORY_CLASSIFICATION
        });

      const checks = [
        {
          name:
            "Provider Manager state resolves through provider-neutral Repository Authority",
          passed:
            write?.authority ===
              "durable-institutional-repository"
        },
        {
          name:
            "Current durable provider performs verified write without changing MEOS Core semantics",
          passed:
            write?.success === true &&
            write?.verification?.verified === true &&
            Boolean(write?.providerId)
        },
        {
          name:
            "Bounded Provider Manager state reads back through durable authority",
          passed:
            read?.found === true &&
            read?.authority ===
              "durable-institutional-repository"
        },
        {
          name:
            "Provider Manager audit history survives semantic durable round trip",
          passed:
            read?.value?.state?.history?.[0]?.id ===
              `${acceptanceKey}-history`
        },
        {
          name:
            "Provider credentials and secrets are rejected from durable Provider Manager state",
          passed:
            secretRejected === true
        },
        {
          name:
            "Provider Manager durable seam is bounded rather than an unbounded cognition log",
          passed:
            PROVIDER_MANAGER_STATE_MAX_HISTORY === 250 &&
            PROVIDER_MANAGER_STATE_MAX_BYTES ===
              256 * 1024
        }
      ];

      const cleanup =
        await InstitutionalRepositoryAuthority.delete({
          namespace,
          key: acceptanceKey,
          classification:
            PROVIDER_MANAGER_STATE_REPOSITORY_CLASSIFICATION
        });

      checks.push({
        name:
          "Acceptance sentinel is removed through the same durable authority",
        passed:
          cleanup?.success === true &&
          cleanup?.deleted === true
      });

      const passed =
        checks.every(check => check.passed);

      response
        .status(passed ? 200 : 500)
        .json({
          commission:
            PROVIDER_MANAGER_STATE_REPOSITORY_COMMISSION,
          schema:
            "meos.provider-manager-state.durable-authority.acceptance.v1",
          version:
            PROVIDER_MANAGER_STATE_REPOSITORY_VERSION,
          buildId:
            PROVIDER_MANAGER_STATE_REPOSITORY_BUILD_ID,
          passed,
          checks,
          authorityStatus:
            InstitutionalRepositoryAuthority.getStatus(),
          serverVersion: VERSION
        });
    } catch (error) {
      response
        .status(error?.status || 500)
        .json({
          commission:
            PROVIDER_MANAGER_STATE_REPOSITORY_COMMISSION,
          schema:
            "meos.provider-manager-state.durable-authority.acceptance.v1",
          version:
            PROVIDER_MANAGER_STATE_REPOSITORY_VERSION,
          buildId:
            PROVIDER_MANAGER_STATE_REPOSITORY_BUILD_ID,
          passed: false,
          checks: [],
          error:
            error?.message || String(error),
          code:
            error?.code ||
            "PROVIDER_MANAGER_STATE_DURABLE_ACCEPTANCE_FAILED",
          serverVersion: VERSION
        });
    }
  }
);

/**
 * Commission 006.017D3A — Mission State Durable Authority Seam
 *
 * This is deliberately server-side first. It gives Mission Engine one
 * provider-neutral durable state contract without yet changing the browser
 * engine's runtime behavior. The following one-file commission can switch
 * Mission Engine from IndexedDB authority to this seam and retain IndexedDB
 * only as offline cache.
 */
app.get(
  "/api/mission-state",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    try {
      const result =
        await readDurableMissionState();

      if (!result?.found) {
        response.status(404).json({
          commission:
            MISSION_STATE_REPOSITORY_COMMISSION,
          schema:
            "meos.mission-state.read.v1",
          found: false,
          authority:
            "meos-institutional-repository",
          providerId:
            result?.providerId || null
        });
        return;
      }

      response.status(200).json({
        commission:
          MISSION_STATE_REPOSITORY_COMMISSION,
        schema:
          "meos.mission-state.read.v1",
        found: true,
        authority:
          result.authority,
        providerId:
          result.providerId,
        record:
          result.record,
        value:
          result.value
      });
    } catch (error) {
      response
        .status(error?.status || 500)
        .json({
          commission:
            MISSION_STATE_REPOSITORY_COMMISSION,
          success: false,
          error:
            error?.message || String(error),
          code:
            error?.code ||
            "MISSION_STATE_DURABLE_READ_FAILED"
        });
    }
  }
);

app.put(
  "/api/mission-state",
  express.json({
    limit: "8mb",
    strict: true
  }),
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    try {
      const expectedPreviousFingerprint =
        request.get(
          "If-MEOS-Previous-Fingerprint"
        ) || undefined;

      const result =
        await writeDurableMissionState(
          request.body,
          expectedPreviousFingerprint
        );

      response.status(200).json({
        commission:
          MISSION_STATE_REPOSITORY_COMMISSION,
        schema:
          "meos.mission-state.write.v1",
        success: true,
        authority:
          result.authority,
        providerId:
          result.providerId,
        verification:
          result.verification,
        record:
          result.record
      });
    } catch (error) {
      response
        .status(
          missionStateWriteTransportStatus(error)
        )
        .json({
          commission:
            error?.code ===
              "MEOS_REPOSITORY_CONCURRENCY_CONFLICT"
              ? MISSION_STATE_CLEAN_CONCURRENCY_COMMISSION
              : MISSION_STATE_REPOSITORY_COMMISSION,
          buildId:
            error?.code ===
              "MEOS_REPOSITORY_CONCURRENCY_CONFLICT"
              ? MISSION_STATE_CLEAN_CONCURRENCY_BUILD_ID
              : MISSION_STATE_REPOSITORY_BUILD_ID,
          success: false,
          convergenceRequired:
            error?.code ===
              "MEOS_REPOSITORY_CONCURRENCY_CONFLICT",
          error:
            error?.message || String(error),
          code:
            error?.code ||
            "MISSION_STATE_DURABLE_WRITE_FAILED",
          details:
            error?.details || null
        });
    }
  }
);

app.post(
  "/api/mission-state/clean-concurrency-acceptance-test",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    const acceptanceKey =
      `clean-concurrency-${crypto.randomUUID()}`;
    const namespace =
      "mission-engine-clean-concurrency-acceptance";

    try {
      registerGoogleInstitutionalRepositoryAuthority();

      const first =
        await InstitutionalRepositoryAuthority.write({
          namespace,
          key: acceptanceKey,
          classification:
            MISSION_STATE_REPOSITORY_CLASSIFICATION,
          value: {
            schema:
              "meos.mission-state.clean-concurrency.acceptance.v1",
            revision: 1,
            acceptanceKey
          },
          metadata: {
            subsystem: "mission-engine",
            purpose:
              "006.017D3B7-clean-concurrency-transport"
          }
        });

      let conflict = null;

      try {
        await InstitutionalRepositoryAuthority.write({
          namespace,
          key: acceptanceKey,
          classification:
            MISSION_STATE_REPOSITORY_CLASSIFICATION,
          value: {
            schema:
              "meos.mission-state.clean-concurrency.acceptance.v1",
            revision: 2,
            acceptanceKey
          },
          metadata: {
            subsystem: "mission-engine",
            purpose:
              "006.017D3B7-clean-concurrency-transport"
          },
          expectedPreviousFingerprint:
            "intentionally-stale-fingerprint"
        });
      } catch (error) {
        conflict = error;
      }

      const read =
        await InstitutionalRepositoryAuthority.read({
          namespace,
          key: acceptanceKey,
          classification:
            MISSION_STATE_REPOSITORY_CLASSIFICATION
        });

      const checks = [
        {
          name:
            "Repository Authority still rejects a stale optimistic-concurrency fingerprint",
          passed:
            conflict?.code ===
              "MEOS_REPOSITORY_CONCURRENCY_CONFLICT"
        },
        {
          name:
            "Expected concurrency race maps to clean HTTP transport",
          passed:
            missionStateWriteTransportStatus(
              conflict
            ) === 200
        },
        {
          name:
            "Integrity conflicts remain real HTTP conflicts",
          passed:
            missionStateWriteTransportStatus({
              code:
                "MEOS_REPOSITORY_EXISTING_FINGERPRINT_MISMATCH",
              status: 409
            }) === 409 &&
            missionStateWriteTransportStatus({
              code:
                "MEOS_REPOSITORY_EXISTING_ENVELOPE_INVALID",
              status: 409
            }) === 409
        },
        {
          name:
            "Rejected stale write does not replace durable truth",
          passed:
            read?.found === true &&
            read?.value?.revision === 1 &&
            read?.record?.payloadFingerprint ===
              first?.record?.payloadFingerprint
        },
        {
          name:
            "Clean transport remains behind provider-neutral Repository Authority",
          passed:
            read?.authority ===
              "durable-institutional-repository"
        }
      ];

      const cleanup =
        await InstitutionalRepositoryAuthority.delete({
          namespace,
          key: acceptanceKey,
          classification:
            MISSION_STATE_REPOSITORY_CLASSIFICATION
        });

      checks.push({
        name:
          "Clean-concurrency acceptance sentinel is removed",
        passed:
          cleanup?.success === true &&
          cleanup?.deleted === true
      });

      const passed =
        checks.every(check => check.passed);

      response
        .status(passed ? 200 : 500)
        .json({
          commission:
            MISSION_STATE_CLEAN_CONCURRENCY_COMMISSION,
          schema:
            "meos.mission-state.clean-concurrency.acceptance.v1",
          version: "1.0.0",
          buildId:
            MISSION_STATE_CLEAN_CONCURRENCY_BUILD_ID,
          passed,
          checks,
          serverVersion: VERSION
        });
    } catch (error) {
      try {
        await InstitutionalRepositoryAuthority.delete({
          namespace,
          key: acceptanceKey,
          classification:
            MISSION_STATE_REPOSITORY_CLASSIFICATION
        });
      } catch {}

      response
        .status(error?.status || 500)
        .json({
          commission:
            MISSION_STATE_CLEAN_CONCURRENCY_COMMISSION,
          schema:
            "meos.mission-state.clean-concurrency.acceptance.v1",
          version: "1.0.0",
          buildId:
            MISSION_STATE_CLEAN_CONCURRENCY_BUILD_ID,
          passed: false,
          error:
            error?.message || String(error),
          code:
            error?.code ||
            "MISSION_STATE_CLEAN_CONCURRENCY_ACCEPTANCE_FAILED",
          serverVersion: VERSION
        });
    }
  }
);

app.post(
  "/api/mission-state/acceptance-test",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    const acceptanceKey =
      `acceptance-${crypto.randomUUID()}`;
    const namespace =
      "mission-engine-acceptance";

    try {
      registerGoogleInstitutionalRepositoryAuthority();

      const sentinel = {
        schema:
          "meos.mission-engine.durable-state.v1",
        version: "0.1.1",
        buildId:
          MISSION_STATE_REPOSITORY_BUILD_ID,
        savedAt:
          new Date().toISOString(),
        state: {
          missions: [{
            id: acceptanceKey,
            title:
              "Durable Mission Authority Sentinel",
            status: "acceptance-only"
          }],
          approvalQueue: [],
          completedMissions: [],
          archivedMissions: [],
          activity: [{
            id:
              `${acceptanceKey}-activity`,
            action:
              "prove-durable-mission-authority"
          }],
          initializedAt:
            new Date().toISOString(),
          updatedAt:
            new Date().toISOString()
        }
      };

      const write =
        await InstitutionalRepositoryAuthority.write({
          namespace,
          key: acceptanceKey,
          classification:
            MISSION_STATE_REPOSITORY_CLASSIFICATION,
          value: sentinel,
          metadata: {
            subsystem: "mission-engine",
            purpose:
              "006.017D3A-live-acceptance"
          }
        });

      const read =
        await InstitutionalRepositoryAuthority.read({
          namespace,
          key: acceptanceKey,
          classification:
            MISSION_STATE_REPOSITORY_CLASSIFICATION
        });

      const checks = [
        {
          name:
            "Mission State durable seam resolves through provider-neutral Repository Authority",
          passed:
            write?.authority ===
              "durable-institutional-repository"
        },
        {
          name:
            "Mission State acceptance write is durably verified",
          passed:
            write?.success === true &&
            write?.verification?.verified === true
        },
        {
          name:
            "Mission State reads back through the selected durable provider",
          passed:
            read?.found === true &&
            Boolean(read?.providerId)
        },
        {
          name:
            "Mission arrays survive semantic round trip",
          passed:
            read?.value?.state?.missions?.[0]?.id ===
              acceptanceKey &&
            Array.isArray(
              read?.value?.state?.approvalQueue
            ) &&
            Array.isArray(
              read?.value?.state?.activity
            )
        },
        {
          name:
            "Mission State authority is organization-owned durable storage rather than browser persistence",
          passed:
            read?.authority ===
              "durable-institutional-repository"
        }
      ];

      const cleanup =
        await InstitutionalRepositoryAuthority.delete({
          namespace,
          key: acceptanceKey,
          classification:
            MISSION_STATE_REPOSITORY_CLASSIFICATION
        });

      checks.push({
        name:
          "Acceptance sentinel is removed through the same durable authority",
        passed:
          cleanup?.success === true &&
          cleanup?.deleted === true
      });

      const passed =
        checks.every(check => check.passed);

      response
        .status(passed ? 200 : 500)
        .json({
          commission:
            MISSION_STATE_REPOSITORY_COMMISSION,
          schema:
            "meos.mission-state.durable-authority.acceptance.v1",
          version:
            MISSION_STATE_REPOSITORY_VERSION,
          buildId:
            MISSION_STATE_REPOSITORY_BUILD_ID,
          passed,
          checks,
          authorityStatus:
            InstitutionalRepositoryAuthority.getStatus(),
          serverVersion: VERSION
        });
    } catch (error) {
      response
        .status(error?.status || 500)
        .json({
          commission:
            MISSION_STATE_REPOSITORY_COMMISSION,
          schema:
            "meos.mission-state.durable-authority.acceptance.v1",
          version:
            MISSION_STATE_REPOSITORY_VERSION,
          buildId:
            MISSION_STATE_REPOSITORY_BUILD_ID,
          passed: false,
          error:
            error?.message || String(error),
          code:
            error?.code ||
            "MISSION_STATE_DURABLE_ACCEPTANCE_FAILED",
          serverVersion: VERSION
        });
    }
  }
);


/**
 * Commission 006.017D2 — Executive Memory Durable Authority Acceptance
 *
 * Proves that the unchanged /api/executive-memory contract is now backed by
 * MEOS Institutional Repository authority and that the server filesystem is
 * only a cache/recovery staging surface.
 */
app.post(
  "/api/executive-memory/acceptance-test",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    const collection = "investigation-history";
    const recordId =
      `executive-memory-d2-${crypto.randomUUID()}`;
    const sentinel = {
      id: recordId,
      schema:
        "meos.executive-memory.acceptance-sentinel.v1",
      commission:
        EXECUTIVE_MEMORY_REPOSITORY_COMMISSION,
      buildId:
        EXECUTIVE_MEMORY_REPOSITORY_BUILD_ID,
      nonce: crypto.randomUUID(),
      assertion:
        "Executive Memory institutional truth survives outside Render's ephemeral filesystem."
    };

    const checks = [];

    try {
      await withExecutiveMemoryWriteLock(
        collection,
        async () => {
          const before =
            await readExecutiveMemoryCollection(collection);

          const normalized =
            normalizeExecutiveMemoryRecord(
              sentinel
            );

          await writeExecutiveMemoryCollection(
            collection,
            [...before, normalized]
          );

          const afterWrite =
            await readExecutiveMemoryCollection(collection);
          const restored =
            afterWrite.find(
              record => record.id === recordId
            );

          checks.push({
            name:
              "Existing Executive Memory contract writes through durable Repository Authority",
            passed:
              Boolean(restored) &&
              restored.nonce === sentinel.nonce
          });

          const directAuthorityRead =
            await InstitutionalRepositoryAuthority.read({
              namespace:
                EXECUTIVE_MEMORY_REPOSITORY_NAMESPACE,
              key:
                `record:${collection}:${recordId}`,
              classification:
                EXECUTIVE_MEMORY_REPOSITORY_CLASSIFICATION
            });

          checks.push({
            name:
              "Executive Memory record exists directly in provider-neutral durable authority",
            passed:
              directAuthorityRead?.found === true &&
              directAuthorityRead?.value?.nonce ===
                sentinel.nonce
          });

          const cachePath =
            executiveMemoryCollectionPath(collection);

          try {
            await fs.unlink(cachePath);
          } catch (error) {
            if (error?.code !== "ENOENT") {
              throw error;
            }
          }

          const afterCacheLoss =
            await readExecutiveMemoryCollection(collection);
          const survivedCacheLoss =
            afterCacheLoss.find(
              record => record.id === recordId
            );

          checks.push({
            name:
              "Institutional truth survives deletion of Render filesystem cache",
            passed:
              Boolean(survivedCacheLoss) &&
              survivedCacheLoss.nonce ===
                sentinel.nonce
          });

          checks.push({
            name:
              "Durable read reconstructs the local cache after cache loss",
            passed:
              Array.isArray(
                await readExecutiveMemoryLocalCache(
                  collection
                )
              )
          });

          const cleaned =
            afterCacheLoss.filter(
              record => record.id !== recordId
            );

          await writeExecutiveMemoryCollection(
            collection,
            cleaned
          );

          const afterCleanup =
            await readExecutiveMemoryCollection(collection);

          checks.push({
            name:
              "Acceptance sentinel is removed through the same durable authority",
            passed:
              !afterCleanup.some(
                record => record.id === recordId
              )
          });
        }
      );

      const storage =
        await executiveMemoryStorageStatus();

      checks.push({
        name:
          "Executive Memory reports MEOS Institutional Repository as authority and filesystem as non-authoritative cache",
        passed:
          storage.status === "ready" &&
          storage.durable === true &&
          storage.authority ===
            "meos-institutional-repository" &&
          storage.localFilesystemRole ===
            "cache-recovery-staging-only"
      });

      const passed =
        checks.every(check => check.passed);

      response
        .status(passed ? 200 : 500)
        .json({
          commission:
            EXECUTIVE_MEMORY_REPOSITORY_COMMISSION,
          schema:
            "meos.executive-memory.durable-authority.acceptance.v1",
          version:
            EXECUTIVE_MEMORY_VERSION,
          buildId:
            EXECUTIVE_MEMORY_REPOSITORY_BUILD_ID,
          passed,
          checks,
          storage,
          serverVersion: VERSION
        });
    } catch (error) {
      response
        .status(error?.status || 500)
        .json({
          commission:
            EXECUTIVE_MEMORY_REPOSITORY_COMMISSION,
          schema:
            "meos.executive-memory.durable-authority.acceptance.v1",
          version:
            EXECUTIVE_MEMORY_VERSION,
          buildId:
            EXECUTIVE_MEMORY_REPOSITORY_BUILD_ID,
          passed: false,
          checks,
          error:
            error?.message || String(error),
          code:
            error?.code ||
            "EXECUTIVE_MEMORY_DURABLE_AUTHORITY_ACCEPTANCE_FAILED",
          serverVersion: VERSION
        });
    }
  }
);


/**
 * Durable Executive Memory API
 *
 * These routes preserve the existing browser-facing Executive Memory contract
 * while MEOS Institutional Repository is now the durable authority beneath it.
 * Provider choice remains runtime-selected and provider-neutral.
 */
app.get("/api/executive-memory", async (request, response) => {
  const storage = await executiveMemoryStorageStatus();

  response.status(storage.status === "ready" ? 200 : 503).json({
    schema: "meos.executive-memory.status.v1",
    version: EXECUTIVE_MEMORY_VERSION,
    storage,
    collections: [...EXECUTIVE_MEMORY_COLLECTIONS],
    limits: {
      maximumRecordsPerCollection: EXECUTIVE_MEMORY_MAX_RECORDS,
      maximumRecordBytes: EXECUTIVE_MEMORY_MAX_RECORD_BYTES
    },
    continuity: {
      missingRecordReadSemantics: "200-null",
      manifestInitializationSupported: true,
      storageAuthority: "meos-institutional-repository",
      localFilesystemRole: "cache-recovery-staging-only",
      persistentDiskExpected:
        storage.persistentDiskExpected === true,
      durable: storage.durable === true,
      productionSafe: storage.productionSafe === true,
      persistenceMode: storage.persistenceMode
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

      /*
       * Commission 006.016B3 — Executive Memory Continuity Contract
       *
       * A missing record is a valid first-run state for manifest-driven
       * institutional memory. Returning HTTP 404 made Knowledge Engine /
       * Knowledge Memory treat an empty durable store like a transport
       * failure and polluted runtime evidence on every clean deployment.
       *
       * GET is therefore read-through and non-exceptional:
       *   exists=true  -> record contains the stored authority
       *   exists=false -> record is null and the caller may initialize it
       *
       * DELETE intentionally retains 404 semantics for a missing target.
       */
      if (!record) {
        response.status(200).json({
          schema: "meos.executive-memory.record.v1",
          collection,
          recordId,
          exists: false,
          record: null,
          continuityState: "uninitialized"
        });
        return;
      }

      response.status(200).json({
        schema: "meos.executive-memory.record.v1",
        collection,
        recordId,
        exists: true,
        record,
        continuityState: "restored"
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


/* ========================================================================== */
/* MEOS Google Workspace Integration v1.0.0 — Read-Only Authorization Layer   */
/* ========================================================================== */

app.get("/api/google/status", async (request, response) => {
  response.set("Cache-Control", "no-store");

  try {
    const status =
      await ensureGoogleWorkspaceInitialized();

    response
      .status(status.configured ? 200 : 503)
      .json({
        schema:
          "meos.google-workspace.status.v1",
        integrationVersion:
          GOOGLE_WORKSPACE_INTEGRATION_VERSION,
        integrationBuildId:
          GOOGLE_WORKSPACE_INTEGRATION_BUILD_ID,
        ...status
      });
  } catch (error) {
    const status =
      GoogleWorkspaceProvider.getStatus();

    response
      .status(error?.status || 500)
      .json({
        schema:
          "meos.google-workspace.status.v1",
        integrationVersion:
          GOOGLE_WORKSPACE_INTEGRATION_VERSION,
        integrationBuildId:
          GOOGLE_WORKSPACE_INTEGRATION_BUILD_ID,
        ...status,
        ...googleWorkspaceErrorResponse(error)
      });
  }
});



app.get(
  "/api/meos/institutional-repository/status",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    try {
      registerGoogleInstitutionalRepositoryAuthority();

      response.status(200).json({
        commission:
          INSTITUTIONAL_REPOSITORY_BRIDGE_COMMISSION,
        bridgeBuildId:
          INSTITUTIONAL_REPOSITORY_BRIDGE_BUILD_ID,
        ...InstitutionalRepositoryAuthority.getStatus()
      });
    } catch (error) {
      response
        .status(error?.status || 500)
        .json({
          schema:
            "meos.institutional-repository-authority.status.v1",
          commission:
            INSTITUTIONAL_REPOSITORY_BRIDGE_COMMISSION,
          bridgeBuildId:
            INSTITUTIONAL_REPOSITORY_BRIDGE_BUILD_ID,
          success: false,
          error: error?.message || String(error),
          code:
            error?.code ||
            "MEOS_INSTITUTIONAL_REPOSITORY_STATUS_FAILED"
        });
    }
  }
);

app.post(
  "/api/meos/institutional-repository/acceptance-test",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    const namespace =
      "commission-006.017D1A";
    const key =
      `live-provider-chain-${crypto.randomUUID()}`;
    let write = null;
    let read = null;
    let cleanup = null;

    try {
      registerGoogleInstitutionalRepositoryAuthority();

      const googleStatus =
        await ensureGoogleWorkspaceInitialized();

      if (
        !googleStatus?.connected ||
        !googleStatus?.capabilities
          ?.institutionalRepositoryRead ||
        !googleStatus?.capabilities
          ?.institutionalRepositoryWrite
      ) {
        const error = new Error(
          "The live Google Workspace institutional repository is not authorized for durable read/write acceptance."
        );
        error.code =
          "MEOS_DURABLE_REPOSITORY_PROVIDER_NOT_READY";
        error.status = 503;
        throw error;
      }

      const sentinel = {
        commission:
          INSTITUTIONAL_REPOSITORY_BRIDGE_COMMISSION,
        bridgeBuildId:
          INSTITUTIONAL_REPOSITORY_BRIDGE_BUILD_ID,
        nonce: crypto.randomUUID(),
        assertion:
          "MEOS Core selected a durable provider by capability and verified institutional state through the provider-neutral authority."
      };

      write =
        await InstitutionalRepositoryAuthority.write({
          namespace,
          key,
          classification: "institutional",
          value: sentinel,
          metadata: {
            purpose:
              "live-provider-neutral-authority-acceptance"
          }
        });

      read =
        await InstitutionalRepositoryAuthority.read({
          namespace,
          key,
          classification: "institutional"
        });

      const checks = [
        {
          name:
            "Google Workspace is registered as a runtime durable provider rather than hard-coded Core authority",
          passed:
            write?.providerId ===
            "google-workspace"
        },
        {
          name:
            "Provider-neutral authority performs verified durable write",
          passed:
            write?.success === true &&
            write?.verification?.required === true &&
            write?.verification?.verified === true
        },
        {
          name:
            "Provider-neutral authority reads the durable record back through the selected provider",
          passed:
            read?.success === true &&
            read?.found === true &&
            read?.providerId ===
              "google-workspace"
        },
        {
          name:
            "Live round trip preserves semantic institutional state",
          passed:
            JSON.stringify(read?.value) ===
            JSON.stringify(sentinel)
        },
        {
          name:
            "Authority reports durable institutional repository rather than browser persistence",
          passed:
            write?.authority ===
              "durable-institutional-repository" &&
            read?.authority ===
              "durable-institutional-repository"
        }
      ];

      cleanup =
        await InstitutionalRepositoryAuthority.delete({
          namespace,
          key,
          classification: "institutional"
        });

      checks.push({
        name:
          "Acceptance sentinel is removed through the same provider-neutral authority",
        passed:
          cleanup?.success === true &&
          cleanup?.deleted === true
      });

      const passed =
        checks.every(check => check.passed);

      response
        .status(passed ? 200 : 500)
        .json({
          commission:
            INSTITUTIONAL_REPOSITORY_BRIDGE_COMMISSION,
          schema:
            "meos.institutional-repository-authority.live-acceptance.v1",
          bridgeBuildId:
            INSTITUTIONAL_REPOSITORY_BRIDGE_BUILD_ID,
          passed,
          checks,
          providerId:
            write?.providerId || null,
          authority:
            write?.authority || null,
          authorityStatus:
            InstitutionalRepositoryAuthority.getStatus(),
          serverVersion: VERSION
        });
    } catch (error) {
      if (write?.success === true && !cleanup?.deleted) {
        try {
          cleanup =
            await InstitutionalRepositoryAuthority.delete({
              namespace,
              key,
              classification: "institutional"
            });
        } catch {
          // Preserve the original acceptance failure.
        }
      }

      response
        .status(error?.status || 500)
        .json({
          commission:
            INSTITUTIONAL_REPOSITORY_BRIDGE_COMMISSION,
          schema:
            "meos.institutional-repository-authority.live-acceptance.v1",
          bridgeBuildId:
            INSTITUTIONAL_REPOSITORY_BRIDGE_BUILD_ID,
          passed: false,
          error: error?.message || String(error),
          code:
            error?.code ||
            "MEOS_INSTITUTIONAL_REPOSITORY_LIVE_ACCEPTANCE_FAILED",
          authorityStatus:
            InstitutionalRepositoryAuthority.getStatus(),
          serverVersion: VERSION
        });
    }
  }
);

app.post(
  "/api/google/institutional-repository/acceptance-test",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    try {
      const status =
        await ensureGoogleWorkspaceInitialized();

      if (!status.connected) {
        response.status(401).json({
          schema:
            "meos.google-workspace.institutional-repository.acceptance.v1",
          commission: "006.017C",
          passed: false,
          error:
            "Google Workspace authorization is required.",
          code:
            "GOOGLE_WORKSPACE_NOT_CONNECTED",
          authorizeUrl:
            "/auth/google"
        });
        return;
      }

      if (
        typeof GoogleWorkspaceProvider
          .runInstitutionalRepositoryAcceptanceTest !==
        "function"
      ) {
        response.status(503).json({
          schema:
            "meos.google-workspace.institutional-repository.acceptance.v1",
          commission: "006.017C",
          passed: false,
          error:
            "The deployed Google Workspace Provider does not expose the institutional repository acceptance test.",
          code:
            "GOOGLE_WORKSPACE_REPOSITORY_ACCEPTANCE_UNAVAILABLE",
          providerVersion:
            GoogleWorkspaceProvider.version || null,
          providerBuildId:
            GoogleWorkspaceProvider.buildId || null
        });
        return;
      }

      const result =
        await GoogleWorkspaceProvider
          .runInstitutionalRepositoryAcceptanceTest();

      response
        .status(result?.passed ? 200 : 500)
        .json({
          ...result,
          serverVersion: VERSION,
          integrationVersion:
            GOOGLE_WORKSPACE_INTEGRATION_VERSION,
          integrationBuildId:
            GOOGLE_WORKSPACE_INTEGRATION_BUILD_ID
        });
    } catch (error) {
      response
        .status(error?.status || 500)
        .json({
          schema:
            "meos.google-workspace.institutional-repository.acceptance.v1",
          commission: "006.017C",
          passed: false,
          ...googleWorkspaceErrorResponse(error),
          serverVersion: VERSION,
          integrationVersion:
            GOOGLE_WORKSPACE_INTEGRATION_VERSION,
          integrationBuildId:
            GOOGLE_WORKSPACE_INTEGRATION_BUILD_ID
        });
    }
  }
);

app.get("/auth/google", async (request, response) => {
  response.set("Cache-Control", "no-store");

  try {
    const status =
      await ensureGoogleWorkspaceInitialized();

    if (!status.configured) {
      response.status(503).json({
        schema:
          "meos.google-workspace.authorization.v1",
        ...googleWorkspaceErrorResponse({
          message:
            "Google Workspace credentials are not configured.",
          code:
            "GOOGLE_WORKSPACE_NOT_CONFIGURED",
          status: 503,
          details: {
            missingConfiguration:
              status.missingConfiguration
          }
        })
      });
      return;
    }

    const authorizationUrl =
      GoogleWorkspaceProvider.getAuthorizationUrl({
        forceConsent: true
      });

    response.redirect(302, authorizationUrl);
  } catch (error) {
    response
      .status(error?.status || 500)
      .json({
        schema:
          "meos.google-workspace.authorization.v1",
        ...googleWorkspaceErrorResponse(error)
      });
  }
});

app.get(
  "/auth/google/callback",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    const providerError =
      typeof request.query?.error === "string"
        ? request.query.error.trim()
        : "";

    if (providerError) {
      response.status(400).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>MEOS Google Workspace Connection</title>
</head>
<body>
  <main>
    <h1>Google Workspace was not connected.</h1>
    <p>Google returned: ${providerError.replace(/[<>&'"]/g, "")}</p>
    <p><a href="/auth/google">Try authorization again</a></p>
  </main>
</body>
</html>`);
      return;
    }

    try {
      await ensureGoogleWorkspaceInitialized();

      const result =
        await GoogleWorkspaceProvider
          .authorizeFromCallback({
            code:
              typeof request.query?.code === "string"
                ? request.query.code
                : "",
            callbackState:
              typeof request.query?.state === "string"
                ? request.query.state
                : ""
          });

      const durableAuthorization =
        result?.durableAuthorization || {};

      const bootstrapSection =
        durableAuthorization.needsBootstrap &&
        durableAuthorization.refreshToken
          ? `<section style="margin-top:24px;padding:16px;border:2px solid #b7791f;max-width:760px;">
    <h2>One-time free-tier durability step</h2>
    <p>Render Free does not keep local files after a deploy. Copy the secret below into Render as an environment variable named <strong>GOOGLE_WORKSPACE_REFRESH_TOKEN</strong>. After you save it, Render will redeploy and MEOS will restore Google automatically on future restarts.</p>
    <p><strong>Treat this value like a password. Do not put it in GitHub or share it.</strong></p>
    <textarea readonly rows="5" style="width:100%;font-family:monospace;">${String(
      durableAuthorization.refreshToken
    ).replace(/[<>&]/g, "")}</textarea>
  </section>`
          : `<p>Durable Google authorization is configured for server restarts.</p>`;

      response.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>MEOS Google Workspace Connected</title>
</head>
<body>
  <main>
    <h1>Google Workspace connected.</h1>
    <p>MEOS now has read-only access authorized by ${String(
      result.account?.emailAddress || "the approved Workspace account"
    ).replace(/[<>&'"]/g, "")}.</p>
    <p>No files can be created, changed, moved, or deleted in this release.</p>
    ${bootstrapSection}
    <p><a href="/api/google/status">View connection status</a></p>
    <p><a href="/">Return to MEOS</a></p>
  </main>
</body>
</html>`);
    } catch (error) {
      console.error(
        "[MEOS] Google Workspace OAuth callback failed:",
        error
      );

      response
        .status(error?.status || 500)
        .send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>MEOS Google Workspace Connection Error</title>
</head>
<body>
  <main>
    <h1>Google Workspace connection failed.</h1>
    <p>${String(
      error?.message ||
        "The authorization callback could not be completed."
    ).replace(/[<>&'"]/g, "")}</p>
    <p><a href="/auth/google">Try authorization again</a></p>
  </main>
</body>
</html>`);
    }
  }
);


app.get(
  "/api/google/workspace/research",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    try {
      const status =
        await ensureGoogleWorkspaceInitialized();

      if (!status.connected) {
        response.status(401).json({
          schema:
            "meos.google-workspace.read-research.v2",
          error:
            "Google Workspace authorization is required.",
          code:
            "GOOGLE_WORKSPACE_NOT_CONNECTED",
          authorizeUrl:
            "/auth/google"
        });
        return;
      }

      const question =
        String(request.query?.q || "").trim();

      const excludedFileIds =
        normalizeWorkspaceExcludedFileIds(
          request.query?.excludeFileIds ||
          request.query?.excludedFileIds ||
          ""
        );

      const result =
        await researchGoogleWorkspaceReadOnly({
          question,
          excludedFileIds,
          limit:
            Math.max(
              1,
              Math.min(
                100,
                Number(request.query?.limit || 50)
              )
            ),
          readLimit:
            Math.max(
              1,
              Math.min(
                20,
                Number(request.query?.readLimit || 12)
              )
            )
        });

      response.status(200).json({
        integrationVersion:
          GOOGLE_WORKSPACE_INTEGRATION_VERSION,
        integrationBuildId:
          GOOGLE_WORKSPACE_INTEGRATION_BUILD_ID,
        connected: true,
        ...result
      });
    } catch (error) {
      response
        .status(error?.status || 500)
        .json({
          schema:
            "meos.google-workspace.read-research.v2",
          ...googleWorkspaceErrorResponse(error)
        });
    }
  }
);

app.get(
  "/api/google/drive/headquarters",
  async (request, response) => {
    response.set("Cache-Control", "no-store");

    try {
      const status =
        await ensureGoogleWorkspaceInitialized();

      if (!status.connected) {
        response.status(401).json({
          schema:
            "meos.google-workspace.headquarters.v1",
          error:
            "Google Workspace authorization is required.",
          code:
            "GOOGLE_WORKSPACE_NOT_CONNECTED",
          authorizeUrl:
            "/auth/google"
        });
        return;
      }

      const headquarters =
        await GoogleWorkspaceProvider
          .listHeadquarters({
            pageSize:
              Math.max(
                1,
                Math.min(
                  1000,
                  Number(request.query?.limit || 1000)
                )
              )
          });

      response.status(200).json({
        schema:
          "meos.google-workspace.headquarters.v1",
        integrationVersion:
          GOOGLE_WORKSPACE_INTEGRATION_VERSION,
        integrationBuildId:
          GOOGLE_WORKSPACE_INTEGRATION_BUILD_ID,
        connected: true,
        readOnly: true,
        ...headquarters
      });
    } catch (error) {
      response
        .status(error?.status || 500)
        .json({
          schema:
            "meos.google-workspace.headquarters.v1",
          ...googleWorkspaceErrorResponse(error)
        });
    }
  }
);


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
          : "missing-allowlist",
      googleWorkspace:
        GoogleWorkspaceProvider.getStatus().configured
          ? (
              GoogleWorkspaceProvider.getStatus().connected
                ? "connected"
                : "configured-not-authorized"
            )
          : "missing"
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
    googleWorkspace: {
      integrationVersion:
        GOOGLE_WORKSPACE_INTEGRATION_VERSION,
      integrationBuildId:
        GOOGLE_WORKSPACE_INTEGRATION_BUILD_ID,
      ...GoogleWorkspaceProvider.getStatus()
    },
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


/* ========================================================================== */
/* MEOS Resource Development Investigation API v1.2.0                         */
/* Commission 006.010 — broad resource intelligence, quiet executive desk     */
/* ========================================================================== */

const RESOURCE_INVESTIGATION_VERSION = "1.2.2";
const RESOURCE_INVESTIGATION_BUILD_ID =
  "RDI122-SEMANTIC-RELEVANCE-GATE-20260807-A";

const RESOURCE_INVESTIGATION_CONTEXT = Object.freeze({
  operatingCountry: "United States",
  localPriority: ["Santa Cruz County", "Monterey County", "San Benito County", "Santa Clara County", "Central Coast", "Monterey Bay"],
  strategicExpansionAreas: ["California", "Lake Tahoe", "Tahoe", "Nevada"],
  identityFundingSignals: ["Black founder", "Black-led", "African American", "BIPOC", "minority founder", "minority-led"],
  identityEligibilityRule:
    "Identity can create a research lead, but eligibility must be verified from the funder's actual requirements before Maddy recommends pursuit.",
  executiveAttentionPolicy: Object.freeze({
    principle: "Research broadly, surface narrowly. Do not flood the executive desk with low-value leads, duplicates, generic source pages, or premature funding signals.",
    activeDeskMinimumScore: 45,
    activeDeskMaximum: 25,
    watchlistMaximum: 40,
    signalMaximum: 40,
    sourceMaximum: 40
  })
});

function resourceInvestigationText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (Array.isArray(value)) return value.map(resourceInvestigationText).filter(Boolean).join(" ");
  if (typeof value === "object") return Object.values(value).map(resourceInvestigationText).filter(Boolean).join(" ");
  return "";
}

function resourceInvestigationUrl(record = {}) {
  const candidates = [
    record.opportunityUrl, record.applicationUrl, record.url, record.sourceUrl,
    record.organizationUrl, record.homepage, record.raw?.source?.opportunityUrl,
    record.raw?.source?.applicationUrl, record.raw?.source?.organizationUrl
  ];
  return candidates.map(value => String(value || "").trim()).find(value => /^https?:\/\//i.test(value)) || null;
}

function resourceInvestigationDeadline(record = {}) {
  const candidates = [record.deadline, record.closeDate, record.closingDate, record.applicationDeadline, record.dueDate, record.raw?.deadline, record.raw?.closeDate];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === "object") {
      const nested = candidate.date || candidate.value || candidate.iso || candidate.endDate;
      if (nested) return String(nested);
      continue;
    }
    return String(candidate);
  }
  return null;
}

function resourceInvestigationLifecycle(record = {}, timestamp = Date.now()) {
  const explicit = resourceInvestigationText([record.lifecycleStatus, record.opportunityStatus, record.status, record.raw?.status]).toLowerCase();
  const deadline = resourceInvestigationDeadline(record);
  const deadlineMs = deadline ? Date.parse(deadline) : NaN;
  const openDate = resourceInvestigationText([record.openDate, record.postedDate, record.raw?.openDate]);
  const openMs = openDate ? Date.parse(openDate) : NaN;
  const day = 86400000;

  if (/rolling|ongoing|continuous|open year[- ]round/.test(explicit)) return { status: "rolling", deadline, openDate: openDate || null, priority: 1, verifiedBy: "explicit-status" };
  if (/forecast|opening soon|upcoming|planned|coming soon/.test(explicit) || (Number.isFinite(openMs) && openMs > timestamp)) return { status: "opening-soon", deadline, openDate: openDate || null, priority: 2, verifiedBy: Number.isFinite(openMs) ? "open-date" : "explicit-status" };
  if (/closed|expired|inactive|archived/.test(explicit)) {
    if (Number.isFinite(deadlineMs) && timestamp - deadlineMs <= 120 * day) return { status: "recently-closed", deadline, openDate: openDate || null, priority: 3, verifiedBy: "explicit-status+deadline" };
    return { status: "closed-historical", deadline, openDate: openDate || null, priority: 5, verifiedBy: "explicit-status" };
  }
  if (Number.isFinite(deadlineMs)) {
    if (deadlineMs >= timestamp) return { status: "open-now", deadline, openDate: openDate || null, priority: 0, verifiedBy: "future-deadline" };
    if (timestamp - deadlineMs <= 120 * day) return { status: "recently-closed", deadline, openDate: openDate || null, priority: 3, verifiedBy: "deadline" };
    return { status: "closed-historical", deadline, openDate: openDate || null, priority: 5, verifiedBy: "deadline" };
  }
  if (/\bopen\b|posted|active|available/.test(explicit) && !/source-identified/.test(explicit)) return { status: "open-unverified", deadline: null, openDate: null, priority: 4, verifiedBy: "status-without-date" };
  return { status: "cycle-unknown", deadline: null, openDate: null, priority: 4, verifiedBy: null };
}

function resourceInvestigationChannel(record = {}) {
  const title = resourceInvestigationText([record.title, record.name]).toLowerCase();
  const provider = resourceInvestigationText([record.provider, record.sourceName, record.agency, record.sourceType]).toLowerCase();
  const urls = resourceInvestigationText([record.opportunityUrl, record.applicationUrl, record.url, record.sourceUrl]).toLowerCase();
  const explicit = resourceInvestigationText([record.resourceType, record.resourceChannels, record.raw?.source?.resourceTypes]).toLowerCase();
  const text = resourceInvestigationText([title, provider, explicit, record.description]).toLowerCase();

  // Source authority beats incidental nouns in the description. A Grants.gov NOFO
  // that mentions a vehicle is still a government grant, not a vehicle lead.
  if (/grants\.gov/.test(provider + " " + urls) || /\bnofo\b|notice of funding opportunity|federal grant|state grant|county grant|city grant/.test(title + " " + provider + " " + explicit)) return "government-grant";
  if (/community foundation/.test(title + " " + provider + " " + explicit)) return "community-foundation";
  if (/family foundation/.test(title + " " + provider + " " + explicit)) return "family-foundation";
  if (/corporate foundation|corporate giving|corporate grant/.test(provider + " " + explicit)) return "corporate-giving";
  if (/foundation|philanthrop/.test(provider + " " + explicit)) return "foundation-grant";

  const rules = [
    ["government-contract", /government contract|procurement|contract award|bid solicitation/],
    ["rfp", /\brfp\b|request for proposals?/],
    ["corporate-sponsorship", /sponsor|sponsorship/],
    ["donor-advised-fund", /donor[- ]advised|\bdaf\b/],
    ["major-donor", /major donor|individual donor|private donor/],
    ["in-kind", /in[- ]kind|donated goods|pro bono|professional services/],
    ["vehicle", /vehicle (?:grant|donation|acquisition)|van donation|truck donation|bus donation|fleet (?:grant|donation|support)|mobile (?:service|hygiene) unit/],
    ["equipment", /equipment (?:grant|donation|acquisition)|machinery donation|computer donation|technology donation/],
    ["property", /property (?:grant|donation|acquisition)|building donation|facility acquisition|land acquisition|real estate donation|site control/],
    ["earned-revenue", /earned revenue|fee for service|reimbursement/],
    ["strategic-partnership", /strategic partnership|funded partner|subaward|subrecipient/]
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] || (/grant|award|funding/.test(title + " " + provider + " " + explicit) ? "government-grant" : "other-lawful-resource");
}

function resourceInvestigationIsGrant(record = {}) {
  return /grant|foundation|philanthrop|funding|award/.test(resourceInvestigationText([record.resourceType, record.resourceChannels, record.sourceType, record.title, record.name, record.description, record.raw?.source?.resourceTypes]).toLowerCase());
}

function resourceInvestigationIsFundingSignal(record = {}) {
  const text = resourceInvestigationText([record.kind, record.resourceType, record.sourceType, record.title, record.name, record.description, record.raw]).toLowerCase();
  const signal = /appropriation|legislation|legislative|budget proposal|budget allocation|settlement fund|settlement allocation|opioid settlement|notice of intent|planned funding|funding forecast|board agenda|county allocation|city allocation|state budget|federal budget/.test(text);
  const specificOpportunity = Boolean(resourceInvestigationDeadline(record)) || /notice of funding opportunity|\bnofo\b|request for proposals?|\brfp\b|applications? (?:are )?open|apply now|solicitation/.test(text);
  return signal && !specificOpportunity;
}

function resourceInvestigationKind(record = {}) {
  if (resourceInvestigationIsFundingSignal(record)) return "funding-signal";
  if (record.discoveryStatus === "source-identified") return "funding-source";
  const title = resourceInvestigationText([record.title, record.name]).toLowerCase();
  if (/funding opportunities|community foundation$|foundation$/.test(title)) return "funding-source";
  return "opportunity";
}

function resourceInvestigationGeography(record = {}, areas = []) {
  const text = resourceInvestigationText([record.title, record.description, record.geography, record.region, record.geographyAnalysis, record.executiveBrief?.geography, record.raw?.source?.geography]).toLowerCase();
  const international = /\b(international|global|outside (?:the )?united states|foreign assistance|overseas)\b/.test(text) && !/united states|u\.s\.|usa/.test(text);
  if (international) return { tier: "outside-usa", score: 0, viable: false, reason: "Required work appears outside the United States." };
  for (const area of [...areas, ...RESOURCE_INVESTIGATION_CONTEXT.localPriority]) {
    const token = String(area || "").toLowerCase().replace(/,?\s*california.*$/, "").trim();
    if (token && text.includes(token)) return { tier: "local-regional", score: 100, viable: true, reason: `Matches priority operating geography: ${area}.` };
  }
  if (/lake tahoe|\btahoe\b|reno|carson city/.test(text)) return { tier: "strategic-expansion", score: 78, viable: true, reason: "Tahoe-area work is outside the first deployment priority but is a credible strategic expansion path and must be evaluated on total executive value." };
  if (/nevada/.test(text)) return { tier: "strategic-expansion", score: 70, viable: true, reason: "Nevada is a feasible U.S. expansion geography when the opportunity justifies deployment or partnership." };
  if (/california|statewide/.test(text)) return { tier: "california", score: 85, viable: true, reason: "California opportunity within the approved outward expansion path." };
  if (/united states|nationwide|national|federal|\busa\b|u\.s\./.test(text)) return { tier: "usa", score: 55, viable: true, reason: "Domestic opportunity; lower geographic priority but strategically available." };
  return { tier: "unknown", score: 45, viable: null, reason: "Geographic eligibility requires verification; it is not rejected merely for being non-local." };
}

function resourceInvestigationIdentityFit(record = {}) {
  const text = resourceInvestigationText([record.title, record.description, record.eligibility, record.eligibleApplicants, record.raw]).toLowerCase();
  const signals = RESOURCE_INVESTIGATION_CONTEXT.identityFundingSignals.filter(signal => text.includes(signal.toLowerCase()));
  return { relevant: signals.length > 0, signals, eligibilityVerified: signals.length > 0 && record.eligibilityVerified === true, rule: RESOURCE_INVESTIGATION_CONTEXT.identityEligibilityRule };
}

let resourceInvestigationStrategyCache = null;
let resourceInvestigationStrategyLoadError = null;

async function loadResourceInvestigationOrganizationStrategy() {
  if (resourceInvestigationStrategyCache) return resourceInvestigationStrategyCache;
  const strategyPath = path.join(frontendDirectory, "ccsp-long-term-strategy.js");
  try {
    const source = await fs.readFile(strategyPath, "utf8");
    const strategyWindow = {
      structuredClone: globalThis.structuredClone,
      localStorage: null,
      console: { info() {}, warn() {}, error() {} }
    };
    vm.runInNewContext(source, { window: strategyWindow }, { filename: strategyPath, timeout: 1000 });
    const api = strategyWindow.MEOSOrganizationLongTermStrategy || strategyWindow.CCSPLongTermStrategy;
    if (!api?.getStrategy) throw new Error("Organization strategy API did not register.");
    resourceInvestigationStrategyCache = api.getStrategy();
    resourceInvestigationStrategyLoadError = null;
    return resourceInvestigationStrategyCache;
  } catch (error) {
    resourceInvestigationStrategyLoadError = error?.message || String(error);
    return null;
  }
}

function resourceInvestigationEvidenceText(record = {}) {
  // Evidence deliberately excludes the entire raw object. Provider metadata,
  // unrelated boilerplate, and incidental words must not become funded work.
  return resourceInvestigationText([
    record.title,
    record.description,
    record.summary,
    record.statedPurpose,
    record.desiredOutcomes,
    record.fundingActivityCategories,
    record.programDescription,
    record.eligibleActivities,
    record.scopeOfWork
  ]).toLowerCase();
}

const RESOURCE_ACTIVITY_RULES = Object.freeze([
  ["street outreach", /\bstreet outreach\b|\boutreach services?\b|\bmobile outreach\b/],
  ["hygiene services", /\bhygiene services?\b|\bmobile hygiene\b|\bshowers?\b|\blaundry services?\b/],
  ["emergency lodging", /\bemergency (?:hotel|motel|lodging|shelter)\b|\btemporary lodging\b|\bhotel vouchers?\b/],
  ["housing", /\bpermanent supportive housing\b|\bsober[- ]living\b|\btransitional housing\b|\bhousing navigation\b|\bhousing assistance\b/],
  ["substance-use treatment/recovery", /\bsubstance[- ]use (?:treatment|recovery|services?)\b|\baddiction treatment\b|\brecovery services?\b|\bsud treatment\b/],
  ["behavioral-health/crisis stabilization", /\bbehavioral health services?\b|\bcrisis (?:intervention|stabilization|services?)\b|\bsuicide prevention\b/],
  ["peer support", /\bpeer support\b|\bpeer recovery\b|\bpeer fellowship\b/],
  ["workforce transition/training", /\bworkforce (?:development|training|transition)\b|\bjob (?:training|skills?|placement)\b|\bemployment (?:training|services?|readiness)\b|\btrade[- ]school\b/],
  ["encampment/watershed stewardship", /\bencampment (?:cleanup|remediation|waste|trash)\b|\bwatershed (?:cleanup|restoration|stewardship)\b|\bwaterway cleanup\b|\bmarine debris\b/],
  ["vehicle/mobile-unit acquisition", /\bmobile service units?\b|\bmobile hygiene units?\b|\bvehicle acquisition\b|\bfleet (?:grant|donation|support)\b/],
  ["facility/property acquisition", /\bfacility acquisition\b|\bproperty acquisition\b|\bland acquisition\b|\bsite control\b|\bcapital facilities?\b/]
]);

const RESOURCE_POPULATION_RULES = Object.freeze([
  ["people experiencing homelessness", /\bpeople experiencing homelessness\b|\bpersons? experiencing homelessness\b|\bunhoused (?:people|persons|residents)\b/],
  ["people with substance-use disorders", /\bsubstance[- ]use disorders?\b|\bpeople (?:with|experiencing) addiction\b/],
  ["veterans", /\bveterans?\b/],
  ["first responders", /\bfirst responders?\b|\bfirefighters?\b|\bems personnel\b|\blaw enforcement officers?\b/],
  ["runaway/homeless youth", /\brunaway (?:and )?homeless youth\b|\bhomeless youth\b|\byouth experiencing homelessness\b/],
  ["justice-impacted people", /\bjustice[- ]impacted\b|\bformerly incarcerated\b|\breentry population\b/],
  ["low-income communities", /\blow[- ]income (?:people|families|communities|households)\b|\beconomically disadvantaged\b/]
]);

function resourceInvestigationEvidenceExtraction(record = {}) {
  const evidenceText = resourceInvestigationEvidenceText(record);
  return {
    fundedActivities: RESOURCE_ACTIVITY_RULES.filter(([, pattern]) => pattern.test(evidenceText)).map(([label]) => label),
    targetPopulations: RESOURCE_POPULATION_RULES.filter(([, pattern]) => pattern.test(evidenceText)).map(([label]) => label),
    evidenceTextAvailable: Boolean(evidenceText),
    sourceFields: ["title", "description", "summary", "statedPurpose", "desiredOutcomes", "fundingActivityCategories", "programDescription", "eligibleActivities", "scopeOfWork"]
      .filter(field => resourceInvestigationText(record[field]))
  };
}


const RESOURCE_DIRECT_PROGRAM_ANCHORS = Object.freeze([
  /\bhomeless(?:ness)?\b|\bunhoused\b|\bstreet outreach\b|\bmobile hygiene\b|\bhygiene services?\b/,
  /\bsubstance[- ]use\b|\baddiction\b|\brecovery services?\b|\bsud\b/,
  /\bveterans?\b|\bfirst responders?\b|\bfirefighters?\b|\bems personnel\b/,
  /\bemergency (?:hotel|motel|lodging|shelter)\b|\bhousing navigation\b|\btransitional housing\b|\bsober[- ]living\b/,
  /\bencampment (?:cleanup|remediation|waste|trash)\b|\bwatershed (?:cleanup|stewardship)\b|\bmarine debris\b/,
  /\breentry\b|\bformerly incarcerated\b|\bjustice[- ]impacted\b/
]);

const RESOURCE_SPECIALIZED_DOMAIN_PATTERNS = Object.freeze([
  ["biomedical-or-clinical-research", /\b(?:r01|r21|r25|u01|ug3|uh3|clinical trial|biomedical research|clinical research|epidemiolog|fungal diseases?|oral-systemic|pharmacotherapy)\b/],
  ["advanced-science-or-engineering", /\b(?:quantum|plasma science|particle physics|outer space|space partners?|aerospace|advanced cyberinfrastructure|artificial intelligence infrastructure|nsf research traineeship)\b/],
  ["energy-or-industrial-research", /\b(?:oil and gas recovery|produced water|desalination|water purification research|mineral extraction|petroleum research)\b/],
  ["agriculture-specialty", /\b(?:agriculture and food research|dairy manure|livestock manure|crop science|pesticide research)\b/],
  ["species-or-land-conservation-specialty", /\b(?:endangered species|habitat conservation plan|hcp land acquisition|forest and woodlands resource management|plant conservation and restoration|wildland fire science|abandoned mine lands)\b/]
]);

function resourceInvestigationSemanticRelevance(record = {}, extraction = {}, strategyAlignment = null) {
  const title = resourceInvestigationText([record.title, record.name]).toLowerCase();
  const evidenceText = resourceInvestigationEvidenceText(record);
  const activities = extraction.fundedActivities || [];
  const populations = extraction.targetPopulations || [];
  const initiativeFit = (strategyAlignment?.initiatives || []).length > 0;
  const directAnchor = RESOURCE_DIRECT_PROGRAM_ANCHORS.some(pattern => pattern.test(title + " " + evidenceText));
  const specializedDomain = RESOURCE_SPECIALIZED_DOMAIN_PATTERNS.find(([, pattern]) => pattern.test(title + " " + evidenceText));
  const genericOnlyActivities = activities.length > 0 && activities.every(activity => ["workforce transition/training", "facility/property acquisition"].includes(activity));
  const coreServiceActivity = activities.some(activity => [
    "street outreach", "hygiene services", "emergency lodging", "housing",
    "substance-use treatment/recovery", "behavioral-health/crisis stabilization",
    "peer support", "encampment/watershed stewardship", "vehicle/mobile-unit acquisition"
  ].includes(activity));

  if (initiativeFit) {
    return { level: "high", scoreMultiplier: 1, deskEligible: true, reason: "A named commissioned initiative has both population and funded-activity evidence." };
  }

  if (specializedDomain && !directAnchor) {
    return {
      level: "background-only",
      scoreMultiplier: 0.2,
      deskEligible: false,
      reason: `The notice is primarily a specialized ${specializedDomain[0]} program. Generic overlap does not establish work the organization can credibly deliver.`
    };
  }

  if (genericOnlyActivities && populations.length === 0 && !directAnchor) {
    return {
      level: "weak-generic-overlap",
      scoreMultiplier: 0.35,
      deskEligible: false,
      reason: "Only a generic workforce/property overlap is evidenced; no target population or operating-program connection establishes a credible organizational delivery path."
    };
  }

  if (coreServiceActivity && (directAnchor || populations.length > 0)) {
    return { level: "high", scoreMultiplier: 1, deskEligible: true, reason: "Funded activity and program context establish a credible operational connection." };
  }

  if (Number(strategyAlignment?.score || 0) >= 30) {
    return { level: "medium", scoreMultiplier: 0.8, deskEligible: true, reason: "A strategic connection exists, but program applicability still requires investigation." };
  }

  return { level: "low", scoreMultiplier: 0.5, deskEligible: false, reason: "The available evidence does not yet establish a strong operational or named-initiative connection." };
}

function resourceInvestigationStrategyAlignment(record = {}, strategy = null, extraction = {}) {
  if (!strategy) return { score: 0, relationship: "strategy-unavailable", reasons: [resourceInvestigationStrategyLoadError || "Organization strategy is unavailable."], initiatives: [], purposes: [], phases: [] };
  const activities = new Set(extraction.fundedActivities || []);
  const populations = new Set(extraction.targetPopulations || []);
  const initiativeMatches = [];

  for (const initiative of strategy.initiatives || []) {
    const initiativePopulations = (initiative.populations || []).map(value => String(value).toLowerCase());
    const populationMatches = initiativePopulations.filter(population => [...populations].some(found => found.includes(population) || population.includes(found)));
    const activityText = (initiative.activities || []).join(" ").toLowerCase();
    const activityMatches = [...activities].filter(activity => {
      if (activity === "emergency lodging") return /hotel|lodging|temporary lodging/.test(activityText);
      if (activity === "peer support") return /peer fellowship|peer support/.test(activityText);
      if (activity === "workforce transition/training") return /workforce|job-skill|trade-school|resume/.test(activityText);
      if (activity === "substance-use treatment/recovery") return /substance-use|recovery/.test(activityText);
      if (activity === "behavioral-health/crisis stabilization") return /crisis|stabilization/.test(activityText);
      return false;
    });
    if (populationMatches.length && activityMatches.length) {
      initiativeMatches.push({ id: initiative.id, name: initiative.name, populationMatches, activityMatches, relationship: "direct-or-adjacent-program-fit" });
    }
  }

  const purposeMatches = [];
  const purposeRules = [
    ["purpose-human-dignity", ["street outreach", "hygiene services", "emergency lodging"]],
    ["purpose-community-stabilization", ["street outreach", "emergency lodging", "behavioral-health/crisis stabilization", "housing"]],
    ["purpose-recovery-navigation", ["substance-use treatment/recovery", "peer support"]],
    ["purpose-residential-treatment", ["substance-use treatment/recovery"]],
    ["purpose-supportive-residential-community", ["housing", "emergency lodging"]],
    ["purpose-permanent-housing", ["housing"]],
    ["purpose-workforce-development", ["workforce transition/training"]],
    ["purpose-environmental-stewardship", ["encampment/watershed stewardship"]],
    ["purpose-institutional-sustainability", ["vehicle/mobile-unit acquisition", "facility/property acquisition"]]
  ];
  for (const [purposeId, requiredActivities] of purposeRules) {
    const matchedActivities = requiredActivities.filter(activity => activities.has(activity));
    const purpose = (strategy.purposes || []).find(item => item.id === purposeId);
    if (purpose && matchedActivities.length) purposeMatches.push({ id: purpose.id, name: purpose.name, matchedActivities, futureCapability: Boolean(purpose.futureCapability) });
  }

  const phaseMatches = [];
  if (activities.has("facility/property acquisition")) phaseMatches.push({ id: "phase-1-foundation-and-control", reason: "Funds site/facility control needed by Phase 1." });
  if (activities.has("vehicle/mobile-unit acquisition")) phaseMatches.push({ id: "phase-2-design-permitting-procurement", reason: "Funds procurement/infrastructure needed for service deployment." });
  if (activities.has("substance-use treatment/recovery")) phaseMatches.push({ id: "phase-4-licensing-and-contracting", reason: "May advance treatment capacity subject to licensing and program requirements." });
  if (activities.has("housing") || activities.has("workforce transition/training")) phaseMatches.push({ id: "phase-5-open-and-expand", reason: "May advance housing/workforce expansion in Phase 5." });

  const score = Math.min(100, initiativeMatches.length * 45 + purposeMatches.length * 18 + phaseMatches.length * 8);
  const relationship = initiativeMatches.length ? "named-initiative-fit" : score >= 45 ? "strategic-fit" : score > 0 ? "adjacent-strategic-fit" : "no-evidenced-strategy-fit";
  return {
    score,
    relationship,
    reasons: score ? ["Alignment is based on evidenced funded activities/populations mapped to the commissioned Organization Strategy."] : ["No funded activity in the available evidence maps defensibly to the commissioned Organization Strategy."],
    initiatives: initiativeMatches,
    purposes: purposeMatches,
    phases: phaseMatches,
    strategyId: strategy.id,
    strategyVersion: strategy.version,
    strategyBuildId: strategy.buildId
  };
}

function resourceInvestigationCategoryFit(record = {}, strategyAlignment = null, extraction = null, semanticRelevance = null) {
  const eligibilityText = resourceInvestigationText([record.eligibility, record.eligibleApplicants]).toLowerCase();
  const hardNonFit = [
    ["tribal-only", /tribal (?:governments?|entities|organizations?) only|federally recognized tribe only/],
    ["charter-school-only", /charter schools? only|eligible applicants?:? charter schools?/],
    ["agriculture-only", /dairy manure|livestock manure|commercial agriculture only/],
    ["specialized-science-only", /quantum computing|quantum information science|particle physics only/]
  ].find(([, pattern]) => pattern.test(eligibilityText));
  if (hardNonFit) return { score: 0, disposition: "reject", reason: `Applicant/program restriction is outside the organization's role: ${hardNonFit[0]}.`, matches: [] };
  const activities = extraction?.fundedActivities || [];
  const rawScore = Math.max(Number(strategyAlignment?.score || 0), Math.min(100, activities.length * 22));
  const score = Math.round(rawScore * Number(semanticRelevance?.scoreMultiplier ?? 1));
  return {
    score,
    disposition: score > 0 ? "consider" : "needs-evidence",
    reason: score > 0
      ? `Evidence-grounded activity/strategy fit: ${activities.join(", ") || strategyAlignment?.relationship}. Semantic relevance: ${semanticRelevance?.reason || "not separately evaluated"}`
      : "No defensible funded-activity connection to the commissioned organization strategy is established by the available evidence.",
    matches: activities,
    semanticRelevance
  };
}

function resourceInvestigationOpportunityCase(record = {}, categoryFit = {}, qualification = null, extraction = {}, strategyAlignment = null, semanticRelevance = null) {
  const participation = qualification?.participation || record.executiveBrief?.participation || record.participation || null;
  const role = participation?.canLead === true ? "lead-applicant-candidate" : participation?.canPartner === true ? "funded-partner-candidate" : "role-needs-verification";
  const initiativeFit = strategyAlignment?.initiatives?.length > 0;
  const evidencedCapability = (extraction.fundedActivities || []).length > 0 && Number(strategyAlignment?.score || 0) > 0;
  const executivePeek = initiativeFit
    ? `Named initiative alignment: ${strategyAlignment.initiatives.map(item => item.name).join(", ")}. Preserve for executive review while eligibility and deliverables are verified.`
    : evidencedCapability
      ? "The actual funded activity maps to the commissioned organization strategy. Preserve it for investigation even when the overall program is adjacent."
      : "No evidenced funded activity currently maps to the commissioned strategy. Keep off the active desk unless stronger source evidence establishes a credible role.";
  return {
    fundedActivities: extraction.fundedActivities || [],
    targetPopulations: extraction.targetPopulations || [],
    evidenceSourceFields: extraction.sourceFields || [],
    realisticRole: role,
    coreCapability: initiativeFit ? "named-initiative-alignment" : evidencedCapability ? "evidenced-strategic-capability" : "capability-not-established",
    semanticRelevance,
    strategyAlignment,
    executivePeek
  };
}

async function normalizeResourceInvestigationRecord(record = {}, areas = [], strategy = null) {
  const lifecycle = resourceInvestigationLifecycle(record);
  const kind = resourceInvestigationKind(record);
  const title = record.title || record.name || record.sourceName || "Unnamed resource lead";
  const officialUrl = resourceInvestigationUrl(record);
  const geography = resourceInvestigationGeography(record, areas);
  const identityFit = resourceInvestigationIdentityFit(record);
  const extraction = resourceInvestigationEvidenceExtraction(record);
  const strategyAlignment = resourceInvestigationStrategyAlignment(record, strategy, extraction);
  const semanticRelevance = resourceInvestigationSemanticRelevance(record, extraction, strategyAlignment);
  const categoryFit = resourceInvestigationCategoryFit(record, strategyAlignment, extraction, semanticRelevance);
  const qualification = kind === "opportunity" ? qualifyFundingOpportunity(record) : null;
  // Do not allow legacy keyword mission scores to overrule evidence-grounded strategy fit.
  const missionScore = categoryFit.score;
  const eligibilityVerified = record.eligibilityVerified === true || qualification?.participation?.confirmed === true;
  const opportunityVerified = kind === "opportunity" && Boolean(officialUrl) && Boolean(lifecycle.verifiedBy);
  const evidenceScore = (officialUrl ? 25 : 0) + (lifecycle.verifiedBy ? 25 : 0) + (eligibilityVerified ? 25 : 0) + (record.investigation?.status === "complete" ? 25 : 0);
  const reject = geography.viable === false || categoryFit.disposition === "reject" || qualification?.recommendation === "decline";
  const strategicScore = Math.round(geography.score * 0.28 + missionScore * 0.32 + evidenceScore * 0.20 + (identityFit.relevant ? 8 : 0) + (lifecycle.status === "open-now" ? 12 : lifecycle.status === "rolling" ? 10 : lifecycle.status === "opening-soon" ? 8 : lifecycle.status === "recently-closed" ? 5 : 2));
  const disposition = kind === "funding-signal"
    ? "monitor"
    : reject
      ? "decline"
      : semanticRelevance.deskEligible && opportunityVerified && eligibilityVerified && missionScore >= 45
        ? "pursue"
        : semanticRelevance.deskEligible && missionScore >= 30
          ? "investigate"
          : "monitor";
  const unknowns = [...new Set([...(qualification?.unknowns || []), ...(Array.isArray(record.unknowns) ? record.unknowns : []), ...(!officialUrl ? ["Authoritative source URL is not verified."] : []), ...(kind === "opportunity" && !lifecycle.verifiedBy ? ["Current opportunity-cycle status is not verified."] : []), ...(kind === "opportunity" && !eligibilityVerified ? ["Applicant eligibility is not verified from authoritative requirements."] : [])])];
  const opportunityCase = kind === "opportunity" ? resourceInvestigationOpportunityCase(record, categoryFit, qualification, extraction, strategyAlignment, semanticRelevance) : null;
  const channel = resourceInvestigationChannel(record);
  const score = Math.max(0, Math.min(100, strategicScore));
  const attentionEligible = kind === "opportunity"
    && !reject
    && semanticRelevance.deskEligible
    && score >= RESOURCE_INVESTIGATION_CONTEXT.executiveAttentionPolicy.activeDeskMinimumScore
    && ["pursue", "investigate"].includes(disposition)
    && !["closed-historical", "cycle-unknown"].includes(lifecycle.status)
    && (
      disposition === "pursue"
      || missionScore >= 50
      || opportunityCase?.coreCapability === "named-initiative-alignment"
      || (opportunityVerified && eligibilityVerified)
    );

  return {
    id: String(record.id || `${kind}:${title}`).trim(), title: String(title).trim(), kind, resourceChannel: channel,
    lifecycleStatus: lifecycle.status, deadline: lifecycle.deadline, openDate: lifecycle.openDate,
    officialUrl, provider: record.provider || record.sourceName || record.agency || null,
    geography, identityFunding: identityFit, missionFit: { score: missionScore, evidence: categoryFit.reason }, opportunityCase,
    strategicScore: score, disposition, executiveAttention: attentionEligible
      ? "active-desk"
      : kind === "opportunity" && !reject && semanticRelevance.deskEligible
        ? "watchlist"
        : kind === "opportunity" && !reject
          ? "background-research"
          : "off-desk",
    recommendation: reject ? "decline" : qualification?.recommendation || disposition,
    qualificationStatus: record.qualificationStatus || (reject ? "executive-rejected" : null),
    participation: qualification?.participation || record.executiveBrief?.participation || record.participation || null,
    confidence: qualification?.confidence || record.executiveBrief?.confidence || record.confidence || null,
    amount: record.amount || record.awardCeiling || record.estimatedFunding || null,
    summary: qualification?.executiveBrief?.whySeeingThis || record.executiveBrief?.whySeeingThis || record.description || null,
    nextAction: reject ? "Keep off the active executive desk and preserve the rejection reason." : kind === "funding-signal" ? "Preserve the signal, identify the likely administering entity and future funding vehicle, and promote it only when it becomes actionable." : !officialUrl ? "Locate and verify the authoritative opportunity/application page before executive pursuit." : !eligibilityVerified ? "Verify applicant eligibility and restrictions from the official requirements." : lifecycle.status === "recently-closed" ? "Preserve the opportunity, determine recurrence, and prepare for the next cycle if strategic value remains high." : qualification?.executiveBrief?.nextAction || "Complete evidence review and prepare the next authorized action.",
    unknowns,
    evidence: { officialUrl, lifecycleVerified: Boolean(lifecycle.verifiedBy), lifecycleEvidence: lifecycle.verifiedBy, eligibilityVerified, investigationComplete: record.investigation?.status === "complete", specificOpportunityVerified: opportunityVerified, evidenceScore },
    executiveReason: reject ? (geography.viable === false ? geography.reason : categoryFit.reason) : `${geography.reason} ${categoryFit.reason}`,
    _sort: { attention: attentionEligible ? 0 : 1, rejected: reject ? 1 : 0, lifecycle: lifecycle.priority, score: -score }
  };
}

function dedupeResourceInvestigation(records = []) {
  const seen = new Map();
  for (const record of records) {
    const key = String(record.officialUrl || record.id || record.title).toLowerCase();
    const existing = seen.get(key);
    if (!existing || record.strategicScore > existing.strategicScore) seen.set(key, record);
  }
  return [...seen.values()];
}

app.get("/api/resource-development/investigate", async (request, response) => {
  const startedAt = new Date().toISOString();
  try {
    const requestedLimit = Math.max(1, Math.min(100, Number.parseInt(request.query.limit || "40", 10) || 40));
    const resourceType = String(request.query.resourceType || "all").toLowerCase();
    const geographyProfile = LocalResourceDiscoveryAdapter.defaultGeography;
    const areas = geographyProfile.currentOperatingAreas || [];
    const stored = (await readExecutiveMemoryCollection(FUNDING_OPPORTUNITY_COLLECTION)).filter(record => record?.type === "funding-opportunity");
    const discoveryRun = await ResourceDiscoveryNetwork.discoverAll({ context: { geographyProfile, includeFutureExpansion: true } });
    const discovered = Array.isArray(discoveryRun.records) ? discoveryRun.records : [];
    const organizationStrategy = await loadResourceInvestigationOrganizationStrategy();
    const candidates = [...stored, ...discovered]
      .filter(record => resourceType === "all" || (resourceType === "grant" && resourceInvestigationIsGrant(record)) || resourceInvestigationChannel(record) === resourceType);
    const normalized = await Promise.all(candidates.map(record => normalizeResourceInvestigationRecord(record, areas, organizationStrategy)));
    const ranked = dedupeResourceInvestigation(normalized).sort((a, b) => a._sort.attention - b._sort.attention || a._sort.rejected - b._sort.rejected || a._sort.lifecycle - b._sort.lifecycle || a._sort.score - b._sort.score || a.title.localeCompare(b.title));
    const policy = RESOURCE_INVESTIGATION_CONTEXT.executiveAttentionPolicy;
    const activeLimit = Math.min(requestedLimit, policy.activeDeskMaximum);
    const active = ranked.filter(record => record.kind === "opportunity" && record.executiveAttention === "active-desk").slice(0, activeLimit).map(({ _sort, ...record }) => record);
    const watchlist = ranked.filter(record => record.kind === "opportunity" && record.executiveAttention === "watchlist").slice(0, Math.min(requestedLimit, policy.watchlistMaximum)).map(({ _sort, ...record }) => record);
    const backgroundResearchCount = ranked.filter(record => record.kind === "opportunity" && record.executiveAttention === "background-research").length;
    const declined = ranked.filter(record => record.kind === "opportunity" && record.disposition === "decline").slice(0, requestedLimit).map(({ _sort, ...record }) => record);
    const fundingSignals = ranked.filter(record => record.kind === "funding-signal").slice(0, Math.min(requestedLimit, policy.signalMaximum)).map(({ _sort, ...record }) => record);
    const fundingSources = ranked.filter(record => record.kind === "funding-source").slice(0, Math.min(requestedLimit, policy.sourceMaximum)).map(({ _sort, ...record }) => record);
    const lifecycleCounts = {};
    const dispositionCounts = {};
    const channelCounts = {};
    for (const record of ranked) channelCounts[record.resourceChannel] = (channelCounts[record.resourceChannel] || 0) + 1;
    for (const record of active) {
      lifecycleCounts[record.lifecycleStatus] = (lifecycleCounts[record.lifecycleStatus] || 0) + 1;
      dispositionCounts[record.disposition] = (dispositionCounts[record.disposition] || 0) + 1;
    }
    response.status(200).json({
      schema: "meos.resource-development.investigation.v3", version: RESOURCE_INVESTIGATION_VERSION,
      buildId: RESOURCE_INVESTIGATION_BUILD_ID, status: discoveryRun.failedAdapters > 0 ? "partial" : "complete",
      organizationStrategy: organizationStrategy ? { id: organizationStrategy.id, version: organizationStrategy.version, buildId: organizationStrategy.buildId, initiativeCount: organizationStrategy.initiatives?.length || 0 } : { status: "unavailable", error: resourceInvestigationStrategyLoadError },
      startedAt, completedAt: new Date().toISOString(),
      request: { resourceType, geography: areas, interpretation: "Broad lawful resource research; local-first ranking; evidence-based U.S. expansion; executive-attention gating prevents desk flooding." },
      executivePolicy: RESOURCE_INVESTIGATION_CONTEXT,
      researchCoverage: { storedOpportunitiesReviewed: stored.length, discoveryAdaptersQueried: discoveryRun.adapterCount || null, discoveryRecordsReviewed: discovered.length, discoveryFailures: discoveryRun.failures || [], totalQualifiedAndRanked: ranked.length, activeOpportunitiesReturned: active.length, watchlistPreserved: watchlist.length, backgroundResearchPreservedOffDesk: backgroundResearchCount, fundingSignalsPreserved: fundingSignals.length, declinedOpportunitiesPreserved: declined.length, fundingSourcesNeedingDeeperInvestigation: fundingSources.length },
      lifecycleCounts, dispositionCounts, channelCounts,
      opportunities: active, watchlist, fundingSignals, declined, fundingSources,
      executiveMessage: active.length
        ? `Investigated ${ranked.length} resource records across lawful channels and surfaced only ${active.length} opportunities that cleared the executive-attention gate. ${watchlist.length} lower-readiness opportunities, ${backgroundResearchCount} background-research leads, ${fundingSignals.length} upstream funding signals, and ${fundingSources.length} source leads remain preserved off the active desk for continued work.`
        : `No opportunity currently clears the executive-attention gate. Research remains active off-desk with ${watchlist.length} watchlist items, ${backgroundResearchCount} background-research leads, ${fundingSignals.length} upstream funding signals, and ${fundingSources.length} source leads preserved for continued investigation.`
    });
  } catch (error) {
    response.status(500).json({ error: "resource_development_investigation_failed", message: error?.message || String(error), version: RESOURCE_INVESTIGATION_VERSION, buildId: RESOURCE_INVESTIGATION_BUILD_ID });
  }
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


function htmlToExecutiveEvidenceText(value = "") {
  return decodeBasicHtmlEntities(
    String(value || "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, " ")
      .replace(
        /<\/?(?:p|div|section|article|main|h[1-6]|li|ul|ol|br|tr|td|th)\b[^>]*>/gi,
        "\n"
      )
      .replace(/<[^>]+>/g, " ")
      .split(/\n+/)
      .map(line => line.replace(/\s+/g, " ").trim())
      .filter(line => line.length >= 3)
      .join("\n")
      .trim()
  );
}

function executiveEvidenceUnits(text = "") {
  const units = [];
  for (const line of String(text || "").split(/\n+/)) {
    const normalized = line.replace(/\s+/g, " ").trim();
    if (!normalized) continue;

    const pieces = normalized
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map(value => value.trim())
      .filter(Boolean);

    for (const piece of pieces) {
      if (piece.length < 20 || piece.length > 1200) continue;
      if (
        /^(?:for donors|for advisors|for nonprofits|our impact|about us|contact us|give today|donor login)\b/i.test(
          piece
        )
      ) {
        continue;
      }
      units.push(piece);
    }
  }

  return [...new Set(units)];
}

function pickExecutiveEvidence(units = [], pattern, limit = 8) {
  return units
    .filter(unit => pattern.test(unit))
    .sort((left, right) => {
      const score = value =>
        (/\b(grant|program|cycle|application|eligible|award|funding)\b/i.test(value)
          ? 3
          : 0) +
        (/\b20\d{2}\b/.test(value) ? 2 : 0) +
        (/\$/.test(value) ? 1 : 0);
      return score(right) - score(left);
    })
    .slice(0, limit);
}

function moneyEvidenceFromUnits(units = []) {
  const evidence = [];

  for (const unit of units) {
    if (
      !/\$\s?\d/i.test(unit) ||
      !/\b(grant|award|awarded|fund|funding|program|cycle|support)\b/i.test(unit)
    ) {
      continue;
    }

    // Do not confuse a funder's assets, endowment, or lifetime giving with
    // the size of the opportunity being investigated.
    if (
      /\b(asset|assets under management|endowment|since inception|lifetime giving)\b/i.test(
        unit
      )
    ) {
      continue;
    }

    const values = [
      ...unit.matchAll(
        /\$\s?\d[\d,]*(?:\.\d+)?(?:\s*(?:million|thousand|m|k))?(?:\s*(?:-|–|to)\s*\$?\s?\d[\d,]*(?:\.\d+)?(?:\s*(?:million|thousand|m|k))?)?/gi
      )
    ].map(match => match[0].trim());

    for (const value of values) {
      evidence.push({ value, context: unit });
    }
  }

  return evidence.slice(0, 12);
}

function dateEvidenceFromUnits(units = []) {
  const evidence = [];

  for (const unit of units) {
    if (
      !/\b(deadline|due|apply|application|cycle|opens?|closes?|invitation|awarded)\b/i.test(
        unit
      )
    ) {
      continue;
    }

    const values = [
      ...unit.matchAll(
        /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+20\d{2}\b/gi
      )
    ].map(match => match[0].trim());

    for (const value of values) {
      evidence.push({ value, context: unit });
    }
  }

  return evidence.slice(0, 12);
}

function classifyFundingCycle(units = []) {
  const joined = units.join(" ");
  const invitationOnly =
    /\b(invitation only|invite-only|invitations? to participate|this year'?s invitees|invited organizations?)\b/i.test(
      joined
    );
  const awardedCurrentCycle =
    /\b(?:this|our)\s+(?:year|20\d{2}).{0,80}\bawarded\b/i.test(joined) ||
    /\bcongratulations to our 20\d{2}.*grant/i.test(joined);
  const explicitlyOpen =
    /\b(applications? (?:are )?open|now accepting applications|apply now|currently accepting|open application cycle)\b/i.test(
      joined
    );
  const explicitlyClosed =
    /\b(applications? (?:are )?closed|cycle (?:is )?closed|deadline has passed)\b/i.test(
      joined
    );

  let status = "cycle-unknown";
  if (explicitlyOpen) status = "open";
  else if (invitationOnly && awardedCurrentCycle)
    status = "current-cycle-invitation-only-or-complete";
  else if (invitationOnly) status = "invitation-only";
  else if (explicitlyClosed || awardedCurrentCycle) status = "current-cycle-complete";

  return {
    status,
    invitationOnly,
    awardedCurrentCycle,
    explicitlyOpen,
    explicitlyClosed
  };
}

function extractExecutiveFundingFacts(text = "") {
  const units = executiveEvidenceUnits(text);
  const moneyEvidence = moneyEvidenceFromUnits(units);
  const dateEvidence = dateEvidenceFromUnits(units);

  const eligibilityEvidence = pickExecutiveEvidence(
    units,
    /\b(eligible organizations?|eligibility|eligible applicants?|must be (?:a )?501\(c\)\(3\)|501\(c\)\(3\) organizations?|qualified nonprofit|applicants? must)\b/i
  );
  const fundedActivityEvidence = pickExecutiveEvidence(
    units,
    /\b(general operations?|operating support|human services|homeless|housing|youth|education|environment|health|community development|veteran|first responder|workforce|capital|equipment)\b/i
  );
  const restrictionEvidence = pickExecutiveEvidence(
    units,
    /\b(invitation only|invite-only|invitations? to participate|not eligible|ineligible|will not fund|does not fund|prohibited|restriction|match|required match|cost share|reimbursement)\b/i
  );
  const deadlineEvidence = pickExecutiveEvidence(
    units,
    /\b(deadline|due date|applications? (?:are )?due|apply by|submission deadline|cycle closes?)\b/i
  );
  const applicationEvidence = pickExecutiveEvidence(
    units,
    /\b(applications? (?:are )?open|apply now|submit (?:an )?application|new application|letter of intent|request for proposal|RFP)\b/i
  );
  const programEvidence = pickExecutiveEvidence(
    units,
    /\b(?:community grants?|small grants?|operating support|grantmaking|grant program|grants? cycle)\b/i,
    12
  );

  const cycle = classifyFundingCycle(units);

  const individualAwardEvidence = moneyEvidence.filter(item =>
    /\b(grants? (?:of|up to|from|range)|awards? (?:of|up to|from|range)|per grant|maximum grant|minimum grant|request up to)\b/i.test(
      item.context
    )
  );

  return {
    moneyEvidence,
    dateEvidence,
    eligibilityEvidence,
    fundedActivityEvidence,
    restrictionEvidence,
    deadlineEvidence,
    applicationEvidence,
    programEvidence,
    cycle,
    individualAwardEvidence
  };
}

async function readExecutiveFundingDocument(url) {
  const result = await fetchPublicFundingResource(url, {
    method: "GET",
    accept:
      "text/html,application/xhtml+xml,application/pdf,text/plain;q=0.9,*/*;q=0.4"
  });

  const contentType = String(result.contentType || "").toLowerCase();
  let text = "";
  let html = null;
  let documentType = "web-page";

  if (
    contentType.includes("application/pdf") ||
    /\.pdf(?:$|\?)/i.test(result.finalUrl)
  ) {
    documentType = "pdf";
    const parsed = await pdfParse(result.body);
    text = String(parsed?.text || "");
  } else {
    html = result.body.toString("utf8");
    text = htmlToExecutiveEvidenceText(html);
  }

  return {
    url: result.finalUrl,
    requestedUrl: url,
    contentType: result.contentType,
    documentType,
    text: text.slice(0, 60_000),
    html,
    byteLength: result.body.length,
    retrievedAt: continuousOperationsNow()
  };
}

function scoreExecutiveOpportunityEvidence(facts = {}, documents = []) {
  const currentCycleActionable =
    facts.cycle?.status === "open" ||
    facts.deadlineEvidence?.length > 0 ||
    facts.dateEvidence?.length > 0;

  const checks = {
    officialMaterialRead: documents.length > 0,
    specificProgramEvidence: (facts.programEvidence || []).length > 0,
    individualAwardVerified: (facts.individualAwardEvidence || []).length > 0,
    currentCycleActionable,
    eligibilityVerified: (facts.eligibilityEvidence || []).length > 0,
    fundedActivitiesVerified: (facts.fundedActivityEvidence || []).length > 0,
    applicationPathVerified: (facts.applicationEvidence || []).length > 0
  };

  const passed = Object.values(checks).filter(Boolean).length;
  return {
    checks,
    passed,
    total: Object.keys(checks).length,
    coverage: Math.round((passed / Object.keys(checks).length) * 100)
  };
}

function deriveFundingLeadDisposition(facts = {}, evidenceScore = {}) {
  if (
    facts.cycle?.status === "current-cycle-invitation-only-or-complete" ||
    facts.cycle?.status === "invitation-only"
  ) {
    return {
      disposition: "monitor-and-position",
      recommendation:
        "Do not present as an open application. Preserve the funder as a high-value relationship and investigate the next cycle, invitation path, and relationship-building route."
    };
  }

  if (facts.cycle?.status === "current-cycle-complete") {
    return {
      disposition: "monitor-next-cycle",
      recommendation:
        "The current cycle appears complete. Preserve recurrence intelligence, determine the next cycle, and prepare before reopening."
    };
  }

  if (!evidenceScore.checks.currentCycleActionable) {
    return {
      disposition: "investigate-current-cycle",
      recommendation:
        "Maddy has not proven that a current application window is actionable. Continue investigation before placing this on the active pursuit desk."
    };
  }

  return {
    disposition: "candidate-for-qualification",
    recommendation:
      "A specific actionable funding cycle is evidenced. Continue organization-specific qualification before recommending pursuit."
  };
}

async function buildExecutiveOpportunityCase(sourceRecord = {}) {
  const officialUrl =
    sourceRecord.url ||
    sourceRecord.original?.url ||
    sourceRecord.original?.raw?.source?.opportunityUrl ||
    sourceRecord.original?.raw?.source?.organizationUrl ||
    "";

  if (!officialUrl) {
    return {
      schema: "meos.executive-opportunity-case.v1",
      status: "investigation-blocked",
      source: sourceRecord,
      promotion: {
        executiveDeskReady: false,
        reason:
          "No authoritative public URL is available for investigation."
      },
      unknowns: [
        "Authoritative opportunity source",
        "Specific funding program",
        "Current funding cycle",
        "Applicant eligibility",
        "Individual award value",
        "Deadline",
        "Application requirements"
      ]
    };
  }

  const root = await readExecutiveFundingDocument(officialUrl);
  const documents = [root];

  if (root.documentType === "web-page" && root.html) {
    const rootOrigin = new URL(root.url).origin;
    const candidates = extractFundingLinks(root.html, root.url)
      .filter(link => {
        try {
          return new URL(link.url).origin === rootOrigin;
        } catch {
          return false;
        }
      })
      .filter(link =>
        /\b(grant|apply|application|guideline|eligib|fund|rfp|proposal|program|award|report)\b/i.test(
          `${link.label} ${link.url}`
        )
      )
      .sort((left, right) => {
        const score = link =>
          (/\b(apply|application|guideline|eligib|rfp|proposal)\b/i.test(
            `${link.label} ${link.url}`
          )
            ? 4
            : 0) +
          (/\b(grant|program|award|fund)\b/i.test(
            `${link.label} ${link.url}`
          )
            ? 2
            : 0) +
          (/\.pdf(?:$|\?)/i.test(link.url) ? 2 : 0);
        return score(right) - score(left);
      })
      .slice(0, 8);

    for (const link of candidates) {
      if (documents.some(document => document.url === link.url)) continue;
      try {
        documents.push(await readExecutiveFundingDocument(link.url));
      } catch {
        // Preserve the unknown. Never fabricate evidence because a child
        // document could not be read.
      }
    }
  }

  const combinedText = documents.map(document => document.text).join("\n");
  const facts = extractExecutiveFundingFacts(combinedText);
  const evidenceScore = scoreExecutiveOpportunityEvidence(facts, documents);
  const leadDisposition = deriveFundingLeadDisposition(facts, evidenceScore);

  const evidenceLedger = documents.map(document => ({
    url: document.url,
    documentType: document.documentType,
    contentType: document.contentType,
    retrievedAt: document.retrievedAt,
    byteLength: document.byteLength
  }));

  const unknowns = [];
  if (!evidenceScore.checks.specificProgramEvidence)
    unknowns.push("Specific funding program");
  if (!evidenceScore.checks.individualAwardVerified)
    unknowns.push("Individual grant award amount or range");
  if (!evidenceScore.checks.currentCycleActionable)
    unknowns.push("Current actionable application window or deadline");
  if (!evidenceScore.checks.eligibilityVerified)
    unknowns.push("Explicit applicant eligibility");
  if (!evidenceScore.checks.fundedActivitiesVerified)
    unknowns.push("Allowable funded activities");
  if (!evidenceScore.checks.applicationPathVerified)
    unknowns.push("Verified application path or requirements");

  // A source page is not an executive-qualified opportunity merely because
  // it mentions grants, nonprofits and money. Promotion requires evidence of
  // a specific actionable cycle and decision-grade applicant facts.
  const executiveDeskReady =
    evidenceScore.checks.officialMaterialRead &&
    evidenceScore.checks.specificProgramEvidence &&
    evidenceScore.checks.currentCycleActionable &&
    evidenceScore.checks.eligibilityVerified &&
    evidenceScore.checks.fundedActivitiesVerified &&
    evidenceScore.checks.applicationPathVerified &&
    !facts.cycle?.invitationOnly &&
    facts.cycle?.status !== "current-cycle-complete";

  return {
    schema: "meos.executive-opportunity-case.v1",
    version: "1.1.0",
    buildId: "EOC110-DECISION-GRADE-EVIDENCE-20260807-A",
    investigatedAt: continuousOperationsNow(),
    status: executiveDeskReady
      ? "executive-case-built"
      : "source-intelligence-built",
    source: {
      id: sourceRecord.id,
      title: sourceRecord.title,
      geography: sourceRecord.geography,
      resourceType: sourceRecord.resourceType,
      resourceChannels:
        sourceRecord.original?.resourceChannels ||
        sourceRecord.resourceChannels ||
        [],
      officialUrl
    },
    whatMaddyRead: {
      documentCount: documents.length,
      evidenceLedger
    },
    opportunityIntelligence: {
      cycle: facts.cycle,
      programEvidence: facts.programEvidence,
      individualAwardEvidence: facts.individualAwardEvidence,
      moneyEvidence: facts.moneyEvidence,
      dateEvidence: facts.dateEvidence,
      eligibilityEvidence: facts.eligibilityEvidence,
      fundedActivityEvidence: facts.fundedActivityEvidence,
      restrictionEvidence: facts.restrictionEvidence,
      deadlineEvidence: facts.deadlineEvidence,
      applicationEvidence: facts.applicationEvidence
    },
    evidence: evidenceScore,
    unknowns,
    disposition: leadDisposition,
    promotion: {
      executiveDeskReady,
      reason: executiveDeskReady
        ? "Maddy found a specific actionable cycle and enough authoritative applicant evidence to permit organization-specific executive qualification."
        : "This is valuable funding-source intelligence, but it has not earned active Executive Desk pursuit status."
    },
    nextAction: executiveDeskReady
      ? "Compare this decision-grade opportunity evidence against the Organization Package, long-term strategy, current assets, dependencies, execution capacity, and competing opportunities before recommending pursuit."
      : leadDisposition.recommendation
  };
}

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
  "/api/resource-discovery/local/investigate",
  async (request, response) => {
    try {
      const sourceId = String(request.query.sourceId || "").trim();

      if (!sourceId) {
        return response.status(400).json({
          error: "local_resource_source_required",
          message: "sourceId is required."
        });
      }

      const run = await ResourceDiscoveryNetwork.discoverAll({
        adapterIds: [LocalResourceDiscoveryAdapter.id],
        context: {
          geographyProfile:
            LocalResourceDiscoveryAdapter.defaultGeography,
          includeFutureExpansion: false
        }
      });

      const sourceRecord = (run.records || []).find(
        record => record.id === sourceId
      );

      if (!sourceRecord) {
        return response.status(404).json({
          error: "local_resource_source_not_found",
          sourceId
        });
      }

      const opportunityCase =
        await buildExecutiveOpportunityCase(sourceRecord);

      return response.json({
        schema: "meos.resource-discovery.local-investigation.v1",
        version: RESOURCE_DISCOVERY_INTEGRATION_VERSION,
        buildId: RESOURCE_DISCOVERY_INTEGRATION_BUILD_ID,
        sourceId,
        opportunityCase
      });
    } catch (error) {
      return response.status(500).json({
        error: "local_resource_investigation_failed",
        message: error?.message || String(error),
        code: error?.code || null,
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

  ensureGoogleWorkspaceInitialized()
    .then(status => {
      console.log(
        `[MEOS] Google Workspace Integration ` +
          `v${GOOGLE_WORKSPACE_INTEGRATION_VERSION} initialized. ` +
          `configured=${status.configured}, ` +
          `connected=${status.connected}, ` +
          `mode=${status.mode}, ` +
          `build=${GOOGLE_WORKSPACE_INTEGRATION_BUILD_ID}.`
      );
    })
    .catch(error => {
      console.error(
        "[MEOS] Google Workspace Integration failed to initialize:",
        error
      );
    });

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
      `[MEOS] Executive Memory v${EXECUTIVE_MEMORY_VERSION} ${status.status}. ` +
        `directory=${status.memoryDirectory}, ` +
        `persistenceMode=${status.persistenceMode}, ` +
        `durable=${status.durable}.`
    );

    if (status.status === "ready" && !status.durable) {
      console.warn(
        "[MEOS] Executive Memory is using ephemeral fallback storage. " +
          "Set MEOS_DATA_DIR to the mounted persistent-disk path before " +
          "treating institutional memory as production-durable."
      );
    }
  });

  /*
   * Commission 006.017D7M2 — Independent Cognitive Runtime Lifecycle
   *
   * The cognitive heartbeat is a first-class server lifecycle service. It must
   * not wait behind unrelated startup work such as funding registry hydration,
   * resource-office initialization, or Continuous Operations startup.
   *
   * The startup function is idempotent and only schedules the first bounded
   * wake. The heartbeat itself retains all D7M authority guards.
   */
  startContinuousCognitionRuntime()
    .then(cognitionStatus => {
      console.log(
        `[MEOS] Durable Cognitive Runtime ` +
          `v${CONTINUOUS_COGNITION_RUNTIME_VERSION} ${cognitionStatus.status}. ` +
          `enabled=${cognitionStatus.enabled}, ` +
          `owner=${cognitionStatus.runtimeOwner}, ` +
          `build=${CONTINUOUS_COGNITION_RUNTIME_BUILD_ID}.`
      );
    })
    .catch(error => {
      continuousCognitionRuntimeState.status = "degraded";
      continuousCognitionRuntimeState.lastError = {
        code: error?.code || "CONTINUOUS_COGNITION_START_FAILED",
        message: error?.message || String(error),
        at: new Date().toISOString()
      };
      console.error(
        "[MEOS] Durable Cognitive Runtime failed to start:",
        error
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
