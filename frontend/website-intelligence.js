/**
 * MEOS Website Intelligence Connector
 * Version: 1.1.0
 * Build: WI110-MADDY-20260802-A
 * Mission: 003
 *
 * Purpose:
 * - Discover the active organization's approved website dynamically.
 * - Crawl approved same-site pages through an authorized fetch transport.
 * - Extract readable page intelligence.
 * - Create versioned website snapshots and store authoritative evidence in Executive Memory.
 * - Detect added, changed, removed, and unchanged pages.
 * - Register website intelligence capabilities with the MEOS Provider Manager.
 * - Return structured current-state and change intelligence to MEOS.
 *
 * Governance boundaries:
 * - This connector does not make executive decisions.
 * - This connector does not silently rewrite the Organization Package.
 * - This connector follows organization-approved crawl scope; source discovery is handled by Executive Investigation.
 * - Website findings are evidence for the Executive Brain and Knowledge systems.
 * - Customer-specific domains are read from the active Organization Package,
 *   request payload, or explicit runtime configuration; none are hard-coded.
 */

(function initializeMEOSWebsiteIntelligence(global) {
  "use strict";

  const NAME = "MEOS Website Intelligence";
  const VERSION = "1.1.0";
  const BUILD_ID = "WI110-MADDY-20260802-A";
  const PROVIDER_ID = "website-intelligence";
  const SCHEMA = "meos.website-intelligence.v1";
  const STORAGE_KEY = "meos.website-intelligence.snapshots.v1";
  const CONFIG_KEY = "meos.website-intelligence.configuration.v1";
  const EXECUTIVE_MEMORY_BASE = "/api/executive-memory";
  const WEBSITE_EVIDENCE_COLLECTION = "website-evidence";
  const INVESTIGATION_HISTORY_COLLECTION = "investigation-history";

  const DEFAULT_CONFIGURATION = Object.freeze({
    maximumPages: 30,
    maximumDepth: 4,
    requestTimeoutMs: 15000,
    delayBetweenRequestsMs: 150,
    includeQueryStrings: false,
    honorNoFollow: true,
    sameOriginOnly: true,
    persistSnapshots: true,
    persistToExecutiveMemory: true,
    localCacheEnabled: true,
    maximumStoredSnapshots: 12,
    executiveMemoryEndpoint: EXECUTIVE_MEMORY_BASE,
    proxyEndpoint: "/api/website-intelligence/fetch",
    allowDirectFetch: true,
    allowProxyFetch: true,
    userAgentLabel: "MEOS-Website-Intelligence/1.0"
  });

  const state = {
    status: "initializing",
    initializedAt: null,
    lastCrawlAt: null,
    lastCrawl: null,
    activeCrawl: null,
    configuration: clone(DEFAULT_CONFIGURATION),
    customTransport: null,
    listeners: {}
  };

  class WebsiteIntelligenceError extends Error {
    constructor(message, code, details = null) {
      super(message);
      this.name = "WebsiteIntelligenceError";
      this.code = code || "WEBSITE_INTELLIGENCE_ERROR";
      this.details = details;
      this.timestamp = new Date().toISOString();
    }
  }

  function clone(value) {
    if (value === undefined) {
      return undefined;
    }

    if (typeof global.structuredClone === "function") {
      try {
        return global.structuredClone(value);
      } catch (_error) {
        // Continue to JSON cloning.
      }
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_error) {
      return value;
    }
  }

  function createId(prefix) {
    const random =
      global.crypto && typeof global.crypto.randomUUID === "function"
        ? global.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return `${prefix}-${random}`;
  }

  function nowMs() {
    return global.performance && typeof global.performance.now === "function"
      ? global.performance.now()
      : Date.now();
  }

  function normalizeWhitespace(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function normalizeUrl(value, baseUrl = null, configuration = state.configuration) {
    try {
      const url = baseUrl
        ? new URL(String(value || ""), baseUrl)
        : new URL(String(value || ""));

      url.hash = "";

      if (!configuration.includeQueryStrings) {
        url.search = "";
      }

      if (!["http:", "https:"].includes(url.protocol)) {
        return null;
      }

      if (url.pathname !== "/") {
        url.pathname = url.pathname.replace(/\/+$/, "");
      }

      return url.href;
    } catch (_error) {
      return null;
    }
  }

  function sameOrigin(left, right) {
    try {
      return new URL(left).origin === new URL(right).origin;
    } catch (_error) {
      return false;
    }
  }

  function sleep(ms) {
    return new Promise(resolve => global.setTimeout(resolve, Math.max(0, ms)));
  }

  async function hashText(value) {
    const text = String(value || "");

    if (
      global.crypto &&
      global.crypto.subtle &&
      typeof global.TextEncoder === "function"
    ) {
      const bytes = new TextEncoder().encode(text);
      const digest = await global.crypto.subtle.digest("SHA-256", bytes);

      return [...new Uint8Array(digest)]
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
    }

    let hash = 2166136261;

    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function emit(eventName, detail) {
    const safeDetail = clone(detail);

    state.listeners[eventName]?.forEach(handler => {
      try {
        handler(safeDetail);
      } catch (error) {
        console.warn("[MEOS Website Intelligence] Listener failed.", error);
      }
    });

    if (
      typeof global.dispatchEvent === "function" &&
      typeof global.CustomEvent === "function"
    ) {
      global.dispatchEvent(
        new CustomEvent(`meos:website-intelligence:${eventName}`, {
          detail: safeDetail
        })
      );
    }
  }

  function on(eventName, handler) {
    if (typeof handler !== "function") {
      return () => {};
    }

    if (!state.listeners[eventName]) {
      state.listeners[eventName] = new Set();
    }

    state.listeners[eventName].add(handler);
    return () => state.listeners[eventName]?.delete(handler);
  }

  function resolveOrganizationProfile() {
    return (
      global.OrganizationalProfile ||
      global.MEOSOrganizationProfile ||
      global.ActiveOrganization ||
      null
    );
  }

  function resolveOrganizationWebsite(explicitUrl = null) {
    const explicit = normalizeUrl(explicitUrl);
    if (explicit) {
      return explicit;
    }

    const profile = resolveOrganizationProfile();
    const organization =
      profile?.organization ||
      profile?.identity ||
      profile?.organizationIdentity ||
      {};

    const candidates = [
      organization.website,
      organization.websiteUrl,
      organization.url,
      profile?.website,
      profile?.websiteUrl,
      profile?.url
    ];

    for (const candidate of candidates) {
      const normalized = normalizeUrl(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  function resolveOrganizationName() {
    const profile = resolveOrganizationProfile();
    const organization =
      profile?.organization ||
      profile?.identity ||
      profile?.organizationIdentity ||
      {};

    return (
      organization.name ||
      organization.legalName ||
      organization.organizationName ||
      profile?.name ||
      profile?.legalName ||
      profile?.organizationName ||
      null
    );
  }

  function buildProxyUrl(targetUrl) {
    const endpoint = state.configuration.proxyEndpoint;

    if (!endpoint) {
      return null;
    }

    const proxy = new URL(endpoint, global.location?.origin || targetUrl);
    proxy.searchParams.set("url", targetUrl);
    return proxy.href;
  }

  async function fetchWithTimeout(url, options = {}) {
    const controller =
      typeof global.AbortController === "function"
        ? new global.AbortController()
        : null;

    const timeoutId = global.setTimeout(
      () => controller?.abort(),
      options.timeoutMs || state.configuration.requestTimeoutMs
    );

    try {
      const response = await global.fetch(url, {
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5"
        },
        cache: "no-store",
        credentials: "omit",
        signal: controller?.signal
      });

      if (!response.ok) {
        throw new WebsiteIntelligenceError(
          `Website fetch returned HTTP ${response.status}.`,
          "WEBSITE_FETCH_HTTP_ERROR",
          { url, status: response.status }
        );
      }

      return {
        success: true,
        requestedUrl: url,
        finalUrl: response.url || url,
        contentType: response.headers.get("content-type") || "",
        text: await response.text(),
        status: response.status
      };
    } finally {
      global.clearTimeout(timeoutId);
    }
  }

  async function authorizedFetch(targetUrl, context = {}) {
    if (typeof state.customTransport === "function") {
      const result = await state.customTransport(targetUrl, {
        configuration: clone(state.configuration),
        ...clone(context)
      });

      if (!result || result.success === false) {
        throw new WebsiteIntelligenceError(
          result?.error || "Custom website transport failed.",
          "WEBSITE_CUSTOM_TRANSPORT_FAILED",
          { targetUrl }
        );
      }

      return {
        success: true,
        requestedUrl: targetUrl,
        finalUrl: result.finalUrl || targetUrl,
        contentType: result.contentType || "text/html",
        text: String(result.text || result.body || ""),
        status: result.status || 200,
        transport: result.transport || "custom"
      };
    }

    const attempts = [];

    if (state.configuration.allowDirectFetch && typeof global.fetch === "function") {
      try {
        const result = await fetchWithTimeout(targetUrl);
        return { ...result, transport: "direct" };
      } catch (error) {
        attempts.push({
          transport: "direct",
          message: error?.message || String(error)
        });
      }
    }

    if (
      state.configuration.allowProxyFetch &&
      typeof global.fetch === "function"
    ) {
      const proxyUrl = buildProxyUrl(targetUrl);

      if (proxyUrl) {
        try {
          const result = await fetchWithTimeout(proxyUrl);
          return {
            ...result,
            finalUrl: targetUrl,
            transport: "same-origin-proxy"
          };
        } catch (error) {
          attempts.push({
            transport: "same-origin-proxy",
            message: error?.message || String(error)
          });
        }
      }
    }

    throw new WebsiteIntelligenceError(
      "No authorized website-fetch transport could retrieve the page.",
      "WEBSITE_TRANSPORT_UNAVAILABLE",
      {
        targetUrl,
        attempts,
        recommendation:
          "Enable CORS on the target website or provide the configured same-origin Render fetch endpoint."
      }
    );
  }

  function removeNonContentNodes(documentNode) {
    [
      "script",
      "style",
      "noscript",
      "template",
      "svg",
      "canvas",
      "iframe"
    ].forEach(selector => {
      documentNode.querySelectorAll(selector).forEach(node => node.remove());
    });
  }

  function extractPage(html, pageUrl, contentType = "text/html") {
    const raw = String(html || "");

    if (
      !contentType.includes("html") ||
      typeof global.DOMParser !== "function"
    ) {
      const text = normalizeWhitespace(raw);
      return {
        url: pageUrl,
        title: pageUrl,
        description: "",
        language: null,
        text,
        headings: [],
        links: [],
        noFollow: false,
        wordCount: text ? text.split(/\s+/).length : 0
      };
    }

    const parser = new global.DOMParser();
    const documentNode = parser.parseFromString(raw, "text/html");

    removeNonContentNodes(documentNode);

    const title = normalizeWhitespace(
      documentNode.querySelector("title")?.textContent ||
      documentNode.querySelector("h1")?.textContent ||
      pageUrl
    );

    const description = normalizeWhitespace(
      documentNode
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") || ""
    );

    const robots = String(
      documentNode
        .querySelector('meta[name="robots"]')
        ?.getAttribute("content") || ""
    ).toLowerCase();

    const preferredRoot =
      documentNode.querySelector("main") ||
      documentNode.querySelector("article") ||
      documentNode.body ||
      documentNode.documentElement;

    const text = normalizeWhitespace(preferredRoot?.innerText || preferredRoot?.textContent || "");

    const headings = [...documentNode.querySelectorAll("h1,h2,h3")]
      .map(node => normalizeWhitespace(node.textContent))
      .filter(Boolean)
      .slice(0, 100);

    const links = [...documentNode.querySelectorAll("a[href]")]
      .map(anchor => ({
        url: normalizeUrl(anchor.getAttribute("href"), pageUrl),
        text: normalizeWhitespace(anchor.textContent),
        rel: String(anchor.getAttribute("rel") || "").toLowerCase()
      }))
      .filter(item => Boolean(item.url));

    return {
      url: pageUrl,
      title,
      description,
      language:
        documentNode.documentElement?.getAttribute("lang") || null,
      text,
      headings,
      links,
      noFollow: robots.includes("nofollow"),
      wordCount: text ? text.split(/\s+/).length : 0
    };
  }

  function selectCrawlLinks(page, rootUrl, depth, configuration) {
    if (depth >= configuration.maximumDepth) {
      return [];
    }

    if (configuration.honorNoFollow && page.noFollow) {
      return [];
    }

    return page.links
      .filter(link => {
        if (!link.url) {
          return false;
        }

        if (configuration.sameOriginOnly && !sameOrigin(link.url, rootUrl)) {
          return false;
        }

        if (
          configuration.honorNoFollow &&
          link.rel.split(/\s+/).includes("nofollow")
        ) {
          return false;
        }

        return true;
      })
      .map(link => link.url);
  }

  async function buildPageRecord(page, fetchResult) {
    const contentHash = await hashText(
      [
        page.title,
        page.description,
        page.text,
        page.headings.join("\n")
      ].join("\n")
    );

    return {
      schema: "meos.website-intelligence.page.v1",
      url: page.url,
      title: page.title,
      description: page.description,
      language: page.language,
      text: page.text,
      headings: page.headings,
      wordCount: page.wordCount,
      contentHash,
      fetchedAt: new Date().toISOString(),
      transport: fetchResult.transport,
      contentType: fetchResult.contentType
    };
  }


  function executiveMemoryCollectionUrl(collection, recordId = null) {
    const base = String(
      state.configuration.executiveMemoryEndpoint ||
      EXECUTIVE_MEMORY_BASE
    ).replace(/\/+$/, "");

    const collectionUrl =
      `${base}/${encodeURIComponent(collection)}`;

    return recordId
      ? `${collectionUrl}/${encodeURIComponent(recordId)}`
      : collectionUrl;
  }

  async function executiveMemoryRequest(
    collection,
    {
      method = "GET",
      recordId = null,
      body = null,
      timeoutMs = state.configuration.requestTimeoutMs
    } = {}
  ) {
    if (typeof global.fetch !== "function") {
      throw new WebsiteIntelligenceError(
        "Executive Memory transport is unavailable.",
        "EXECUTIVE_MEMORY_TRANSPORT_UNAVAILABLE"
      );
    }

    const controller =
      typeof global.AbortController === "function"
        ? new global.AbortController()
        : null;

    const timeoutId = global.setTimeout(
      () => controller?.abort(),
      Math.max(1000, Number(timeoutMs) || 15000)
    );

    try {
      const response = await global.fetch(
        executiveMemoryCollectionUrl(collection, recordId),
        {
          method,
          headers:
            body === null
              ? { Accept: "application/json" }
              : {
                  Accept: "application/json",
                  "Content-Type": "application/json"
                },
          body: body === null ? undefined : JSON.stringify(body),
          cache: "no-store",
          credentials: "same-origin",
          signal: controller?.signal
        }
      );

      let payload = null;

      try {
        payload = await response.json();
      } catch (_error) {
        payload = null;
      }

      if (!response.ok) {
        throw new WebsiteIntelligenceError(
          payload?.error ||
            `Executive Memory returned HTTP ${response.status}.`,
          payload?.code || "EXECUTIVE_MEMORY_HTTP_ERROR",
          {
            status: response.status,
            collection,
            recordId,
            details: payload?.details || null
          }
        );
      }

      return payload;
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new WebsiteIntelligenceError(
          "Executive Memory request timed out.",
          "EXECUTIVE_MEMORY_TIMEOUT",
          { collection, recordId }
        );
      }

      if (error instanceof WebsiteIntelligenceError) {
        throw error;
      }

      throw new WebsiteIntelligenceError(
        "Executive Memory request failed.",
        "EXECUTIVE_MEMORY_REQUEST_FAILED",
        {
          collection,
          recordId,
          message: error?.message || String(error)
        }
      );
    } finally {
      global.clearTimeout(timeoutId);
    }
  }

  function createWebsiteEvidenceRecord(snapshot, page) {
    return {
      id: `website-evidence-${page.contentHash}`,
      schema: "meos.website-intelligence.evidence-record.v1",
      organizationName: snapshot.organizationName,
      rootUrl: snapshot.rootUrl,
      snapshotId: snapshot.id,
      pageUrl: page.url,
      title: page.title,
      description: page.description,
      language: page.language,
      text: page.text,
      headings: page.headings,
      wordCount: page.wordCount,
      contentHash: page.contentHash,
      fetchedAt: page.fetchedAt,
      transport: page.transport,
      contentType: page.contentType,
      sourceType: "official-organization-website",
      authority: "official-organization-website",
      confidence: 0.96,
      lastSeenAt: snapshot.completedAt
    };
  }

  async function persistSnapshotToExecutiveMemory(
    snapshot,
    changes,
    durationMs
  ) {
    if (!state.configuration.persistToExecutiveMemory) {
      return {
        success: false,
        skipped: true,
        reason: "Executive Memory persistence is disabled."
      };
    }

    const evidenceResults = [];

    for (const page of snapshot.pages) {
      const record = createWebsiteEvidenceRecord(snapshot, page);

      try {
        const saved = await executiveMemoryRequest(
          WEBSITE_EVIDENCE_COLLECTION,
          {
            method: "PUT",
            recordId: record.id,
            body: record
          }
        );

        evidenceResults.push({
          success: true,
          id: record.id,
          pageUrl: page.url,
          record: saved?.record || null
        });
      } catch (error) {
        evidenceResults.push({
          success: false,
          id: record.id,
          pageUrl: page.url,
          code: error?.code || "EXECUTIVE_MEMORY_WRITE_FAILED",
          message: error?.message || String(error)
        });
      }
    }

    const historyRecord = {
      id: `investigation-${snapshot.id}`,
      schema: "meos.website-intelligence.investigation-record.v1",
      type: "website-crawl",
      organizationName: snapshot.organizationName,
      rootUrl: snapshot.rootUrl,
      snapshotId: snapshot.id,
      startedAt: snapshot.startedAt,
      completedAt: snapshot.completedAt,
      durationMs,
      summary: clone(snapshot.summary),
      changes: clone(changes.summary),
      pageUrls: snapshot.pages.map(page => page.url),
      failureCount: snapshot.failures.length,
      failures: clone(snapshot.failures),
      evidenceRecordIds: evidenceResults
        .filter(item => item.success)
        .map(item => item.id),
      status:
        evidenceResults.every(item => item.success)
          ? "complete"
          : evidenceResults.some(item => item.success)
            ? "partial"
            : "failed"
    };

    let historyResult;

    try {
      const saved = await executiveMemoryRequest(
        INVESTIGATION_HISTORY_COLLECTION,
        {
          method: "PUT",
          recordId: historyRecord.id,
          body: historyRecord
        }
      );

      historyResult = {
        success: true,
        id: historyRecord.id,
        record: saved?.record || null
      };
    } catch (error) {
      historyResult = {
        success: false,
        id: historyRecord.id,
        code: error?.code || "EXECUTIVE_MEMORY_WRITE_FAILED",
        message: error?.message || String(error)
      };
    }

    const evidenceSaved = evidenceResults.filter(item => item.success).length;
    const success =
      evidenceSaved === snapshot.pages.length &&
      historyResult.success;

    return {
      success,
      skipped: false,
      evidence: {
        attempted: snapshot.pages.length,
        saved: evidenceSaved,
        failed: snapshot.pages.length - evidenceSaved,
        results: evidenceResults
      },
      investigationHistory: historyResult
    };
  }

  async function loadSnapshotsFromExecutiveMemory(rootUrl = null) {
    if (!state.configuration.persistToExecutiveMemory) {
      return [];
    }

    const payload = await executiveMemoryRequest(
      INVESTIGATION_HISTORY_COLLECTION
    );

    const records = Array.isArray(payload?.records)
      ? payload.records
      : [];

    const normalizedRoot = rootUrl ? normalizeUrl(rootUrl) : null;

    return records
      .filter(record => record?.type === "website-crawl")
      .filter(record =>
        !normalizedRoot || record.rootUrl === normalizedRoot
      )
      .map(record => ({
        id: record.snapshotId,
        schema: "meos.website-intelligence.snapshot-reference.v1",
        organizationName: record.organizationName || null,
        rootUrl: record.rootUrl,
        startedAt: record.startedAt || null,
        completedAt: record.completedAt || null,
        summary: clone(record.summary || {}),
        failures: clone(record.failures || []),
        evidenceRecordIds: clone(record.evidenceRecordIds || []),
        executiveMemoryReference: true
      }))
      .sort((left, right) =>
        Date.parse(right.completedAt || right.startedAt || 0) -
        Date.parse(left.completedAt || left.startedAt || 0)
      );
  }

  function loadSnapshots() {
    if (!global.localStorage) {
      return [];
    }

    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("[MEOS Website Intelligence] Snapshot load failed.", error);
      return [];
    }
  }

  function saveSnapshot(snapshot) {
    if (
      !state.configuration.persistSnapshots ||
      !state.configuration.localCacheEnabled ||
      !global.localStorage
    ) {
      return false;
    }

    try {
      const snapshots = loadSnapshots();
      snapshots.push(snapshot);

      const limited = snapshots.slice(
        -state.configuration.maximumStoredSnapshots
      );

      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
      return true;
    } catch (error) {
      console.warn("[MEOS Website Intelligence] Snapshot save failed.", error);
      return false;
    }
  }

  function getLatestSnapshot(rootUrl = null) {
    const normalizedRoot = rootUrl ? normalizeUrl(rootUrl) : null;
    const snapshots = loadSnapshots()
      .filter(snapshot =>
        !normalizedRoot || snapshot.rootUrl === normalizedRoot
      )
      .sort((left, right) =>
        Date.parse(right.completedAt || right.startedAt || 0) -
        Date.parse(left.completedAt || left.startedAt || 0)
      );

    return snapshots[0] || null;
  }

  function compareSnapshots(previous, current) {
    const previousPages = new Map(
      (previous?.pages || []).map(page => [page.url, page])
    );
    const currentPages = new Map(
      (current?.pages || []).map(page => [page.url, page])
    );

    const added = [];
    const changed = [];
    const removed = [];
    const unchanged = [];

    currentPages.forEach((page, url) => {
      const oldPage = previousPages.get(url);

      if (!oldPage) {
        added.push({
          url,
          title: page.title,
          currentHash: page.contentHash
        });
        return;
      }

      if (oldPage.contentHash !== page.contentHash) {
        changed.push({
          url,
          title: page.title,
          previousHash: oldPage.contentHash,
          currentHash: page.contentHash,
          previousWordCount: oldPage.wordCount,
          currentWordCount: page.wordCount
        });
      } else {
        unchanged.push({
          url,
          title: page.title,
          contentHash: page.contentHash
        });
      }
    });

    previousPages.forEach((page, url) => {
      if (!currentPages.has(url)) {
        removed.push({
          url,
          title: page.title,
          previousHash: page.contentHash
        });
      }
    });

    return {
      schema: "meos.website-intelligence.changes.v1",
      previousSnapshotId: previous?.id || null,
      currentSnapshotId: current.id,
      hasPreviousSnapshot: Boolean(previous),
      hasMeaningfulChanges:
        added.length > 0 ||
        changed.length > 0 ||
        removed.length > 0,
      summary: {
        added: added.length,
        changed: changed.length,
        removed: removed.length,
        unchanged: unchanged.length
      },
      added,
      changed,
      removed,
      unchanged
    };
  }

  async function crawl(options = {}) {
    if (state.activeCrawl) {
      throw new WebsiteIntelligenceError(
        "A website crawl is already in progress.",
        "WEBSITE_CRAWL_ALREADY_ACTIVE",
        { crawlId: state.activeCrawl.id }
      );
    }

    const rootUrl = resolveOrganizationWebsite(
      options.website || options.url
    );

    if (!rootUrl) {
      throw new WebsiteIntelligenceError(
        "No approved organization website is available.",
        "WEBSITE_NOT_CONFIGURED",
        {
          recommendation:
            "Add a website field to the active Organization Package or pass an explicit approved URL."
        }
      );
    }

    const configuration = {
      ...state.configuration,
      ...(options.configuration || {})
    };

    const crawlId = createId("website-crawl");
    const started = nowMs();
    const startedAt = new Date().toISOString();
    const previousSnapshot = getLatestSnapshot(rootUrl); // Local comparison cache only.

    state.activeCrawl = {
      id: crawlId,
      rootUrl,
      startedAt
    };

    emit("crawl-started", clone(state.activeCrawl));

    const queue = [{ url: rootUrl, depth: 0 }];
    const visited = new Set();
    const pages = [];
    const failures = [];

    try {
      while (
        queue.length > 0 &&
        pages.length < configuration.maximumPages
      ) {
        const next = queue.shift();
        const pageUrl = normalizeUrl(next.url, rootUrl, configuration);

        if (!pageUrl || visited.has(pageUrl)) {
          continue;
        }

        if (
          configuration.sameOriginOnly &&
          !sameOrigin(pageUrl, rootUrl)
        ) {
          continue;
        }

        visited.add(pageUrl);

        try {
          const fetchResult = await authorizedFetch(pageUrl, {
            crawlId,
            rootUrl,
            depth: next.depth
          });

          const extracted = extractPage(
            fetchResult.text,
            pageUrl,
            fetchResult.contentType
          );

          const pageRecord = await buildPageRecord(
            extracted,
            fetchResult
          );

          pages.push(pageRecord);

          emit("page-collected", {
            crawlId,
            page: clone(pageRecord),
            progress: {
              collected: pages.length,
              queued: queue.length,
              maximumPages: configuration.maximumPages
            }
          });

          const discovered = selectCrawlLinks(
            extracted,
            rootUrl,
            next.depth,
            configuration
          );

          discovered.forEach(url => {
            const normalized = normalizeUrl(url, rootUrl, configuration);

            if (
              normalized &&
              !visited.has(normalized) &&
              !queue.some(item => item.url === normalized)
            ) {
              queue.push({
                url: normalized,
                depth: next.depth + 1
              });
            }
          });
        } catch (error) {
          failures.push({
            url: pageUrl,
            code: error?.code || "WEBSITE_PAGE_FETCH_FAILED",
            message: error?.message || String(error),
            details: clone(error?.details || null)
          });

          emit("page-failed", {
            crawlId,
            failure: failures[failures.length - 1]
          });
        }

        if (queue.length > 0 && configuration.delayBetweenRequestsMs > 0) {
          await sleep(configuration.delayBetweenRequestsMs);
        }
      }

      if (pages.length === 0) {
        throw new WebsiteIntelligenceError(
          "The crawl completed without collecting any readable pages.",
          "WEBSITE_CRAWL_EMPTY",
          { rootUrl, failures }
        );
      }

      const snapshot = {
        id: createId("website-snapshot"),
        schema: "meos.website-intelligence.snapshot.v1",
        organizationName: resolveOrganizationName(),
        rootUrl,
        startedAt,
        completedAt: new Date().toISOString(),
        configuration: {
          maximumPages: configuration.maximumPages,
          maximumDepth: configuration.maximumDepth,
          sameOriginOnly: configuration.sameOriginOnly
        },
        summary: {
          pageCount: pages.length,
          failureCount: failures.length,
          totalWords: pages.reduce(
            (sum, page) => sum + page.wordCount,
            0
          )
        },
        pages,
        failures
      };

      const changes = compareSnapshots(previousSnapshot, snapshot);
      const durationMs = Number((nowMs() - started).toFixed(2));

      const executiveMemory = await persistSnapshotToExecutiveMemory(
        snapshot,
        changes,
        durationMs
      );

      const localCachePersisted = saveSnapshot(snapshot);

      const result = {
        success: true,
        schema: "meos.website-intelligence.crawl-result.v1",
        crawlId,
        organizationName: snapshot.organizationName,
        rootUrl,
        snapshot,
        changes,
        persisted: executiveMemory.success,
        persistence: {
          authoritative: "executive-memory",
          executiveMemory,
          localCachePersisted
        },
        durationMs,
        completedAt: snapshot.completedAt
      };

      state.lastCrawlAt = snapshot.completedAt;
      state.lastCrawl = clone(result);
      emit("crawl-completed", result);

      return result;
    } finally {
      state.activeCrawl = null;
    }
  }

  async function providerExecute(request = {}, context = {}) {
    const executivePackage =
      request.executivePackage ||
      request.package ||
      context.executivePackage ||
      {};

    const payload =
      request.payload ||
      request.input ||
      request;

    const website =
      payload.website ||
      payload.url ||
      executivePackage.organization?.website ||
      null;

    const result = await crawl({
      website,
      configuration: payload.configuration || {}
    });

    const evidence = result.snapshot.pages.map(page => ({
      title: page.title,
      summary: page.description || page.text.slice(0, 500),
      source: page.url,
      authority: "official-organization-website",
      confidence: 0.96,
      contentHash: page.contentHash,
      fetchedAt: page.fetchedAt
    }));

    return {
      success: true,
      output: {
        organizationName: result.organizationName,
        rootUrl: result.rootUrl,
        currentState: result.snapshot.summary,
        changes: result.changes,
        pages: result.snapshot.pages.map(page => ({
          url: page.url,
          title: page.title,
          description: page.description,
          headings: page.headings,
          wordCount: page.wordCount,
          contentHash: page.contentHash,
          fetchedAt: page.fetchedAt
        })),
        failures: result.snapshot.failures
      },
      evidence,
      citations: result.snapshot.pages.map(page => ({
        url: page.url,
        title: page.title,
        fetchedAt: page.fetchedAt
      })),
      confidence:
        result.snapshot.failures.length === 0 ? 0.96 : 0.86,
      unknowns:
        result.snapshot.failures.length > 0
          ? ["Some approved website pages could not be retrieved."]
          : [],
      metadata: {
        crawlId: result.crawlId,
        snapshotId: result.snapshot.id,
        persisted: result.persisted,
        persistence: clone(result.persistence),
        durationMs: result.durationMs
      }
    };
  }

  async function healthCheck() {
    const website = resolveOrganizationWebsite();
    let executiveMemory = null;

    try {
      executiveMemory = await global
        .fetch(state.configuration.executiveMemoryEndpoint, {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        })
        .then(async response => ({
          ok: response.ok,
          status: response.status,
          body: await response.json().catch(() => null)
        }));
    } catch (error) {
      executiveMemory = {
        ok: false,
        status: 0,
        error: error?.message || String(error)
      };
    }

    if (!website) {
      return {
        success: false,
        status: "unavailable",
        details: {
          reason: "No organization website is configured.",
          executiveMemory
        }
      };
    }

    return {
      success: Boolean(executiveMemory?.ok),
      status: executiveMemory?.ok ? "online" : "degraded",
      details: {
        website,
        directFetchConfigured: state.configuration.allowDirectFetch,
        proxyFetchConfigured:
          state.configuration.allowProxyFetch &&
          Boolean(state.configuration.proxyEndpoint),
        executiveMemoryConfigured:
          state.configuration.persistToExecutiveMemory,
        executiveMemory,
        note:
          "Cross-origin reachability is verified during crawl execution."
      }
    };
  }

  function registerWithProviderManager() {
    const manager =
      global.ProviderManager ||
      global.MEOSProviderManager;

    if (!manager || typeof manager.registerProvider !== "function") {
      return {
        success: false,
        registered: false,
        error: "MEOS Provider Manager is not available."
      };
    }

    const existing =
      typeof manager.getProvider === "function"
        ? manager.getProvider(PROVIDER_ID)
        : null;

    const definition = {
      id: PROVIDER_ID,
      name: NAME,
      type: "internet-research",
      status: "online",
      capabilities: [
        "current-web-research",
        "website-crawling",
        "website-change-detection",
        "source-verification",
        "structured-data-retrieval"
      ],
      description:
        "Crawls the active organization website, stores page evidence in durable Executive Memory, creates versioned crawl history, and reports meaningful changes.",
      providerGroup: "website-intelligence",
      priority: 0.92,
      reliability: 0.82,
      privacy: 0.9,
      speed: 0.64,
      costEfficiency: 0.98,
      enabled: true,
      metadata: {
        organizationNeutral: true,
        approvedSiteOnly: true,
        authoritativeStorage: "executive-memory",
        localStorageRole: "temporary-cache",
        version: VERSION,
        buildId: BUILD_ID
      },
      execute: providerExecute,
      healthCheck
    };

    const provider = manager.registerProvider(definition, {
      replace: Boolean(existing)
    });

    emit("provider-registered", { provider });

    return {
      success: true,
      registered: true,
      provider
    };
  }

  function configure(patch = {}) {
    state.configuration = {
      ...state.configuration,
      ...clone(patch)
    };

    try {
      global.localStorage?.setItem(
        CONFIG_KEY,
        JSON.stringify(state.configuration)
      );
    } catch (error) {
      console.warn("[MEOS Website Intelligence] Configuration save failed.", error);
    }

    emit("configured", getConfiguration());
    return getConfiguration();
  }

  function restoreConfiguration() {
    try {
      const raw = global.localStorage?.getItem(CONFIG_KEY);
      if (!raw) {
        return false;
      }

      state.configuration = {
        ...state.configuration,
        ...JSON.parse(raw)
      };

      return true;
    } catch (error) {
      console.warn("[MEOS Website Intelligence] Configuration restore failed.", error);
      return false;
    }
  }

  function setTransport(transport) {
    if (transport !== null && typeof transport !== "function") {
      throw new TypeError("Website transport must be a function or null.");
    }

    state.customTransport = transport;
    emit("transport-changed", {
      customTransport: Boolean(transport)
    });

    return Boolean(transport);
  }

  function getConfiguration() {
    return clone(state.configuration);
  }

  function getStatus() {
    const manager =
      global.ProviderManager ||
      global.MEOSProviderManager;

    const provider =
      manager && typeof manager.getProvider === "function"
        ? manager.getProvider(PROVIDER_ID)
        : null;

    return {
      name: NAME,
      version: VERSION,
      buildId: BUILD_ID,
      schema: SCHEMA,
      status: state.status,
      organizationName: resolveOrganizationName(),
      website: resolveOrganizationWebsite(),
      providerRegistered: Boolean(provider),
      providerStatus: provider?.status || null,
      activeCrawl: clone(state.activeCrawl),
      lastCrawlAt: state.lastCrawlAt,
      cachedSnapshots: loadSnapshots().length,
      authoritativeStorage: "executive-memory",
      executiveMemoryEndpoint:
        state.configuration.executiveMemoryEndpoint,
      configuration: getConfiguration(),
      initializedAt: state.initializedAt
    };
  }

  function getHistory(rootUrl = null) {
    const normalized = rootUrl ? normalizeUrl(rootUrl) : null;

    return loadSnapshots()
      .filter(snapshot =>
        !normalized || snapshot.rootUrl === normalized
      )
      .sort((left, right) =>
        Date.parse(right.completedAt || 0) -
        Date.parse(left.completedAt || 0)
      );
  }

  async function getDurableHistory(rootUrl = null) {
    return loadSnapshotsFromExecutiveMemory(rootUrl);
  }

  function clearHistory() {
    try {
      global.localStorage?.removeItem(STORAGE_KEY);
      emit("history-cache-cleared", {});
      return true;
    } catch (_error) {
      return false;
    }
  }

  async function runSelfTest(options = {}) {
    const originalTransport = state.customTransport;
    const originalConfiguration = clone(state.configuration);
    const snapshotsBefore = loadSnapshots();

    const site = "https://example.test/";
    let generation = 1;

    const pagesByGeneration = {
      1: {
        "https://example.test/":
          '<html><head><title>Example Organization</title></head><body><main><h1>Mission</h1><p>Serve the community.</p><a href="/programs">Programs</a></main></body></html>',
        "https://example.test/programs":
          '<html><head><title>Programs</title></head><body><main><h1>Programs</h1><p>Community support.</p></main></body></html>'
      },
      2: {
        "https://example.test/":
          '<html><head><title>Example Organization</title></head><body><main><h1>Mission</h1><p>Serve and strengthen the community.</p><a href="/programs">Programs</a><a href="/veterans">Veterans</a></main></body></html>',
        "https://example.test/veterans":
          '<html><head><title>Veterans</title></head><body><main><h1>Veterans Support</h1><p>New veterans program.</p></main></body></html>'
      }
    };

    const assertions = [];

    function assert(name, passed, details = null) {
      assertions.push({
        name,
        passed: Boolean(passed),
        details: clone(details)
      });
    }

    try {
      state.configuration = {
        ...state.configuration,
        maximumPages: 10,
        maximumDepth: 3,
        delayBetweenRequestsMs: 0,
        persistSnapshots: true,
        persistToExecutiveMemory: false,
        localCacheEnabled: true
      };

      setTransport(async url => {
        const html = pagesByGeneration[generation][url];

        if (!html) {
          return {
            success: false,
            error: "Mock page not found."
          };
        }

        return {
          success: true,
          finalUrl: url,
          contentType: "text/html",
          text: html,
          transport: "self-test"
        };
      });

      const first = await crawl({ website: site });

      assert(
        "Initial crawl collects approved same-site pages",
        first.success &&
          first.snapshot.pages.length === 2 &&
          first.changes.summary.added === 2,
        first
      );

      generation = 2;

      const second = await crawl({ website: site });

      assert(
        "Second crawl detects added, changed, and removed pages",
        second.success &&
          second.changes.summary.added === 1 &&
          second.changes.summary.changed === 1 &&
          second.changes.summary.removed === 1,
        second.changes
      );

      assert(
        "Snapshots preserve current page hashes and timestamps",
        second.snapshot.pages.every(page =>
          Boolean(page.contentHash) &&
          Boolean(page.fetchedAt)
        ),
        second.snapshot.pages
      );

      const manager =
        global.ProviderManager ||
        global.MEOSProviderManager;

      assert(
        "Provider Manager registration is available",
        Boolean(
          manager &&
          typeof manager.getProvider === "function" &&
          manager.getProvider(PROVIDER_ID)
        ),
        manager?.getProvider?.(PROVIDER_ID) || null
      );


      assert(
        "Executive Memory is configured as authoritative storage",
        originalConfiguration.persistToExecutiveMemory === true &&
          Boolean(originalConfiguration.executiveMemoryEndpoint),
        {
          persistToExecutiveMemory:
            originalConfiguration.persistToExecutiveMemory,
          executiveMemoryEndpoint:
            originalConfiguration.executiveMemoryEndpoint,
          localCacheEnabled:
            originalConfiguration.localCacheEnabled
        }
      );
    } catch (error) {
      assert("Unexpected self-test exception", false, {
        name: error?.name || "Error",
        message: error?.message || String(error),
        code: error?.code || null
      });
    } finally {
      setTransport(originalTransport);
      state.configuration = originalConfiguration;

      try {
        global.localStorage?.setItem(
          STORAGE_KEY,
          JSON.stringify(snapshotsBefore)
        );
      } catch (_error) {
        // Self-test restoration is best effort.
      }
    }

    const passed = assertions.filter(item => item.passed).length;
    const result = {
      success: passed === assertions.length,
      schema: "meos.website-intelligence.self-test.v1",
      name: NAME,
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      failed: assertions.length - passed,
      total: assertions.length,
      assertions,
      completedAt: new Date().toISOString()
    };

    if (options.render === true) {
      renderSelfTest(result);
    }

    return result;
  }

  function renderSelfTest(result) {
    if (!global.document) {
      return;
    }

    const existing =
      global.document.getElementById("meos-website-intelligence-test");

    existing?.remove();

    const panel = global.document.createElement("section");
    panel.id = "meos-website-intelligence-test";
    panel.style.cssText = [
      "position:fixed",
      "inset:20px",
      "z-index:2147483647",
      "overflow:auto",
      "padding:24px",
      "border:1px solid #334155",
      "border-radius:14px",
      "background:#0f172a",
      "color:#e2e8f0",
      "font-family:Arial,sans-serif",
      "box-shadow:0 20px 50px rgba(0,0,0,.45)"
    ].join(";");

    const heading = global.document.createElement("h1");
    heading.textContent =
      `MEOS Website Intelligence ${result.success ? "PASS" : "FAIL"}`;
    heading.style.color = result.success ? "#86efac" : "#fca5a5";
    panel.appendChild(heading);

    const summary = global.document.createElement("p");
    summary.textContent =
      `${result.passed}/${result.total} tests passed — v${VERSION}`;
    panel.appendChild(summary);

    result.assertions.forEach(assertion => {
      const card = global.document.createElement("article");
      card.style.cssText =
        "margin:14px 0;padding:14px;border:1px solid #334155;border-radius:10px;background:#111827";

      const title = global.document.createElement("h2");
      title.textContent =
        `${assertion.passed ? "PASS" : "FAIL"} — ${assertion.name}`;
      title.style.color = assertion.passed ? "#86efac" : "#fca5a5";
      card.appendChild(title);

      const pre = global.document.createElement("pre");
      pre.textContent = JSON.stringify(assertion.details, null, 2);
      pre.style.cssText =
        "white-space:pre-wrap;word-break:break-word;background:#020617;padding:12px;border-radius:8px";
      card.appendChild(pre);
      panel.appendChild(card);
    });

    const close = global.document.createElement("button");
    close.textContent = "Close Test";
    close.style.cssText =
      "padding:10px 16px;font-size:16px;cursor:pointer";
    close.addEventListener("click", () => panel.remove());
    panel.appendChild(close);

    global.document.body.appendChild(panel);
  }

  function maybeRunVisibleSelfTest() {
    if (!global.location || !global.document) {
      return;
    }

    const hash = String(global.location.hash || "").toLowerCase();
    const query = String(global.location.search || "").toLowerCase();

    if (
      hash === "#website-intelligence-test" ||
      query.includes("website-intelligence-test=1")
    ) {
      const start = () => {
        void runSelfTest({ render: true });
      };

      if (global.document.readyState === "loading") {
        global.document.addEventListener(
          "DOMContentLoaded",
          start,
          { once: true }
        );
      } else {
        start();
      }
    }
  }

  restoreConfiguration();

  const api = Object.freeze({
    name: NAME,
    version: VERSION,
    buildId: BUILD_ID,
    schema: SCHEMA,
    providerId: PROVIDER_ID,
    configure,
    getConfiguration,
    setTransport,
    crawl,
    compareSnapshots,
    getLatestSnapshot,
    getHistory,
    getDurableHistory,
    clearHistory,
    getStatus,
    registerWithProviderManager,
    runSelfTest,
    on
  });

  global.WebsiteIntelligence = api;
  global.MEOSWebsiteIntelligence = api;

  const registration = registerWithProviderManager();

  state.initializedAt = new Date().toISOString();
  state.status = registration.success ? "online" : "degraded";

  console.info(
    `[MEOS] ${NAME} v${VERSION} ${state.status}. Build ${BUILD_ID}.`,
    registration
  );

  emit("online", getStatus());
  maybeRunVisibleSelfTest();
})(window);
