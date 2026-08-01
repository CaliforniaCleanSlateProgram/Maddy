/**
 * MEOS Website Knowledge Integration
 * Version: 1.0.0
 * Build: WKI100-MADDY-20260801-A
 *
 * Mission:
 * Complete the Website Intelligence learning loop:
 *
 * Approved organization website
 *   -> Website Intelligence crawl
 *   -> Knowledge Memory ingestion/versioning
 *   -> Executive Brain recall
 *   -> Maddy
 *
 * Boundaries:
 * - Universal MEOS Core component; contains no CCSP-specific facts or URLs.
 * - Does not crawl websites itself.
 * - Does not replace Knowledge Memory or Knowledge Engine.
 * - Does not change Executive Brain, Router, Provider Manager, or voice.
 * - Stores source, access time, authority, confidence, and crawl provenance.
 */

(function initializeWebsiteKnowledgeIntegration(global) {
  "use strict";

  const NAME = "MEOS Website Knowledge Integration";
  const VERSION = "1.0.0";
  const BUILD_ID = "WKI100-MADDY-20260801-A";
  const SCHEMA = "meos.website-knowledge-integration.v1";

  const state = {
    status: "initializing",
    initializedAt: null,
    lastIngestionAt: null,
    lastResult: null,
    activeIngestion: null,
    unsubscribe: null,
    listeners: {}
  };

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_error) {
      return value;
    }
  }

  function emit(eventName, detail) {
    const safe = clone(detail);

    state.listeners[eventName]?.forEach(handler => {
      try {
        handler(safe);
      } catch (error) {
        console.warn("[MEOS Website Knowledge Integration] Listener failed.", error);
      }
    });

    if (
      typeof global.dispatchEvent === "function" &&
      typeof global.CustomEvent === "function"
    ) {
      global.dispatchEvent(
        new global.CustomEvent(`meos:website-knowledge:${eventName}`, {
          detail: safe
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

  function hashStable(value) {
    const text = String(value || "");
    let hash = 2166136261;

    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function resolveComponents() {
    return {
      website:
        global.WebsiteIntelligence ||
        global.MEOSWebsiteIntelligence ||
        null,
      memory: global.KnowledgeMemory || null,
      engine: global.KnowledgeEngine || null,
      intelligence: global.IntelligenceEngine || null
    };
  }

  function resolveOrganizationName(crawlResult = {}) {
    if (crawlResult.organizationName) {
      return crawlResult.organizationName;
    }

    const profile = global.OrganizationalProfile || {};
    const organization =
      profile.organization ||
      profile.identity ||
      profile.organizationIdentity ||
      {};

    return (
      organization.legalName ||
      organization.name ||
      organization.shortName ||
      profile.name ||
      "Current Organization"
    );
  }

  function normalizePageText(page = {}) {
    const headings = Array.isArray(page.headings)
      ? page.headings.filter(Boolean)
      : [];

    const parts = [
      page.title ? `# ${page.title}` : "",
      page.description ? `## Description\n${page.description}` : "",
      headings.length
        ? `## Website Sections\n${headings.map(item => `- ${item}`).join("\n")}`
        : "",
      page.text ? `## Page Content\n${page.text}` : ""
    ].filter(Boolean);

    return parts.join("\n\n").trim();
  }

  function buildDocumentInput(page, crawlResult) {
    const organizationName = resolveOrganizationName(crawlResult);
    const stableKey = hashStable(page.url);
    const snapshot = crawlResult.snapshot || {};
    const changes = crawlResult.changes || {};

    return {
      logicalDocumentId: `website-page-${stableKey}`,
      title: `${organizationName} — ${page.title || "Website Page"}`,
      summary:
        page.description ||
        `Official organization website content from ${page.url}.`,
      description:
        "Current institutional knowledge learned from the approved official organization website.",
      text: normalizePageText(page),
      documentType: "organization-website-page",
      sourceType: "official-organization-website",
      authority: "authoritative",
      confidence: 0.96,
      sensitivity: "internal",
      officeAccess: ["all"],
      organization: organizationName,
      url: page.url,
      language: page.language || "en",
      publishedAt: null,
      accessedAt: page.fetchedAt || snapshot.completedAt || new Date().toISOString(),
      effectiveDate: snapshot.completedAt || new Date().toISOString(),
      versionLabel: snapshot.completedAt || "website-snapshot",
      createdBy: NAME,
      tags: [
        "website-intelligence",
        "institutional-knowledge",
        "official-organization-website",
        "current-organization"
      ],
      topics: Array.isArray(page.headings)
        ? page.headings.slice(0, 50)
        : [],
      metadata: {
        schema: SCHEMA,
        integrationVersion: VERSION,
        buildId: BUILD_ID,
        organizationNeutralCore: true,
        customerSpecificKnowledge: true,
        rootUrl: crawlResult.rootUrl || snapshot.rootUrl || null,
        pageUrl: page.url,
        pageTitle: page.title || null,
        pageDescription: page.description || null,
        headings: Array.isArray(page.headings) ? page.headings : [],
        websiteContentHash: page.contentHash || null,
        websiteSnapshotId: snapshot.id || null,
        websiteCrawlId: crawlResult.crawlId || null,
        websiteChangeSummary: changes.summary || null,
        fetchedAt: page.fetchedAt || null,
        transport: page.transport || null,
        wordCount: page.wordCount || null,
        sourceAuthority: "official-organization-website"
      }
    };
  }

  function validateCrawlResult(crawlResult) {
    if (!crawlResult || crawlResult.success !== true) {
      return {
        success: false,
        error: "A successful Website Intelligence crawl result is required."
      };
    }

    const pages = crawlResult.snapshot?.pages;

    if (!Array.isArray(pages) || pages.length === 0) {
      return {
        success: false,
        error: "The website crawl did not contain readable pages."
      };
    }

    return {
      success: true,
      pages
    };
  }

  function reportToIntelligenceEngine(crawlResult, ingestionSummary) {
    const intelligence = resolveComponents().intelligence;

    if (!intelligence || typeof intelligence.receiveIntelligence !== "function") {
      return null;
    }

    const changes = crawlResult.changes?.summary || {};
    const changedCount =
      Number(changes.added || 0) +
      Number(changes.changed || 0) +
      Number(changes.removed || 0);

    return intelligence.receiveIntelligence({
      title: changedCount > 0
        ? "Organization website knowledge updated"
        : "Organization website knowledge verified",
      summary:
        `${ingestionSummary.remembered} website page` +
        `${ingestionSummary.remembered === 1 ? " was" : "s were"} retained in institutional memory.`,
      details:
        `Added: ${Number(changes.added || 0)}. ` +
        `Changed: ${Number(changes.changed || 0)}. ` +
        `Removed: ${Number(changes.removed || 0)}. ` +
        `Unchanged: ${Number(changes.unchanged || 0)}.`,
      sourceType: "website",
      sourceName: "Official Organization Website",
      sourceUrl: crawlResult.rootUrl || "",
      sourceRecordId: crawlResult.snapshot?.id || null,
      intelligenceType: changedCount > 0 ? "change" : "general",
      priority: changedCount > 0 ? "normal" : "monitor",
      verified: true,
      tags: [
        "website-intelligence",
        "institutional-memory",
        "organization-knowledge"
      ]
    });
  }

  async function ingestCrawlResult(crawlResult, options = {}) {
    if (state.activeIngestion) {
      return {
        success: false,
        error: "Website knowledge ingestion is already in progress.",
        activeIngestion: clone(state.activeIngestion)
      };
    }

    const validation = validateCrawlResult(crawlResult);

    if (!validation.success) {
      return validation;
    }

    const { memory } = resolveComponents();

    if (!memory || typeof memory.ingestDocument !== "function") {
      return {
        success: false,
        error: "MEOS Knowledge Memory is unavailable."
      };
    }

    const ingestionId =
      `website-knowledge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    state.activeIngestion = {
      id: ingestionId,
      startedAt: new Date().toISOString(),
      pageCount: validation.pages.length
    };

    emit("ingestion-started", clone(state.activeIngestion));

    const results = [];

    try {
      for (const page of validation.pages) {
        const documentInput = buildDocumentInput(page, crawlResult);

        const result = memory.ingestDocument(documentInput, {
          createVersion: true,
          allowDuplicate: false,
          versionReason:
            crawlResult.changes?.hasPreviousSnapshot
              ? "Official organization website content was reverified or changed."
              : "Initial official organization website ingestion."
        });

        results.push({
          success: result?.success === true,
          duplicate: result?.duplicate === true,
          unchanged: result?.unchanged === true,
          versionCreated: result?.versionCreated === true,
          pageUrl: page.url,
          pageTitle: page.title,
          documentId: result?.document?.id || null,
          logicalDocumentId: result?.document?.logicalDocumentId || null,
          recordId: result?.record?.id || null,
          passageCount: Array.isArray(result?.passages)
            ? result.passages.length
            : 0,
          error: result?.success === true ? null : result?.error || "Unknown ingestion failure."
        });
      }

      const summary = {
        total: results.length,
        remembered: results.filter(item => item.success).length,
        newDocuments: results.filter(
          item => item.success && !item.duplicate && !item.versionCreated
        ).length,
        newVersions: results.filter(item => item.versionCreated).length,
        unchanged: results.filter(
          item => item.duplicate || item.unchanged
        ).length,
        failed: results.filter(item => !item.success).length,
        passagesCreated: results.reduce(
          (sum, item) => sum + Number(item.passageCount || 0),
          0
        )
      };

      const result = {
        success: summary.failed === 0 && summary.remembered > 0,
        schema: "meos.website-knowledge-ingestion-result.v1",
        ingestionId,
        organizationName: resolveOrganizationName(crawlResult),
        rootUrl: crawlResult.rootUrl || null,
        crawlId: crawlResult.crawlId || null,
        snapshotId: crawlResult.snapshot?.id || null,
        summary,
        pages: results,
        completedAt: new Date().toISOString()
      };

      if (options.reportToIntelligence !== false) {
        result.intelligence =
          reportToIntelligenceEngine(crawlResult, summary);
      }

      state.lastIngestionAt = result.completedAt;
      state.lastResult = clone(result);

      emit("ingestion-completed", result);
      return result;
    } finally {
      state.activeIngestion = null;
    }
  }

  async function learnOrganization(options = {}) {
    const { website } = resolveComponents();

    if (!website || typeof website.crawl !== "function") {
      return {
        success: false,
        error: "MEOS Website Intelligence is unavailable."
      };
    }

    const crawlResult = await website.crawl({
      website: options.website || options.url || null,
      configuration: options.configuration || {}
    });

    return ingestCrawlResult(crawlResult, {
      reportToIntelligence: options.reportToIntelligence !== false
    });
  }

  function recall(query, options = {}) {
    const { memory } = resolveComponents();

    if (!memory || typeof memory.executiveRecall !== "function") {
      return {
        success: false,
        error: "MEOS Knowledge Memory executive recall is unavailable."
      };
    }

    return memory.executiveRecall({
      query,
      office: options.office,
      limit: options.limit || 12,
      sourceType: "official-organization-website"
    });
  }

  function getExecutiveBriefing(result = state.lastResult) {
    if (!result?.success) {
      return {
        status: "attention-required",
        headline: "Website learning needs attention.",
        message: result?.error || "No successful website learning result is available.",
        recommendation: "Review the website connection and try again."
      };
    }

    const summary = result.summary;

    return {
      status: "complete",
      headline: "I'm Up.",
      message:
        `I retained ${summary.remembered} official website page` +
        `${summary.remembered === 1 ? "" : "s"} in institutional memory.`,
      recommendation:
        summary.newVersions > 0
          ? `${summary.newVersions} updated version${summary.newVersions === 1 ? "" : "s"} were preserved.`
          : summary.newDocuments > 0
            ? "The organization's first website knowledge snapshot is now available for recall."
            : "The existing website knowledge remains current.",
      detailsAvailable: true,
      evidenceCount: summary.passagesCreated,
      completedAt: result.completedAt
    };
  }

  function connect() {
    const { website, memory } = resolveComponents();
    const missing = [];

    if (!website || typeof website.on !== "function") {
      missing.push("Website Intelligence");
    }

    if (!memory || typeof memory.ingestDocument !== "function") {
      missing.push("Knowledge Memory");
    }

    if (missing.length > 0) {
      state.status = "degraded";
      return {
        success: false,
        status: state.status,
        missing
      };
    }

    if (typeof state.unsubscribe === "function") {
      state.unsubscribe();
    }

    state.unsubscribe = website.on("crawl-completed", crawlResult => {
      void ingestCrawlResult(crawlResult).catch(error => {
        console.error(
          "[MEOS Website Knowledge Integration] Automatic ingestion failed.",
          error
        );
      });
    });

    state.status = "online";

    return {
      success: true,
      status: state.status,
      automaticIngestion: true
    };
  }

  function getStatus() {
    const components = resolveComponents();

    return {
      name: NAME,
      version: VERSION,
      buildId: BUILD_ID,
      schema: SCHEMA,
      status: state.status,
      organizationNeutralCore: true,
      websiteIntelligenceReady: Boolean(components.website),
      knowledgeMemoryReady: Boolean(components.memory),
      knowledgeEngineReady: Boolean(components.engine),
      intelligenceEngineReady: Boolean(components.intelligence),
      automaticIngestionConnected: typeof state.unsubscribe === "function",
      activeIngestion: clone(state.activeIngestion),
      lastIngestionAt: state.lastIngestionAt,
      lastResult: clone(state.lastResult),
      initializedAt: state.initializedAt
    };
  }

  async function runSelfTest() {
    const originalMemory = global.KnowledgeMemory;
    const originalIntelligence = global.IntelligenceEngine;
    const stored = [];
    const intelligenceItems = [];

    try {
      global.KnowledgeMemory = {
        ingestDocument(input) {
          stored.push(clone(input));
          return {
            success: true,
            duplicate: false,
            versionCreated: false,
            document: {
              id: `document-${stored.length}`,
              logicalDocumentId: input.logicalDocumentId
            },
            record: { id: `record-${stored.length}` },
            passages: [{ id: `passage-${stored.length}` }]
          };
        },
        executiveRecall(input) {
          return {
            success: true,
            executiveContext: {
              question: input.query,
              answerStatus: stored.length
                ? "institutional-memory-found"
                : "no-institutional-memory-found"
            }
          };
        }
      };

      global.IntelligenceEngine = {
        receiveIntelligence(input) {
          intelligenceItems.push(clone(input));
          return { success: true, intelligence: input };
        }
      };

      const crawl = {
        success: true,
        crawlId: "test-crawl",
        organizationName: "Example Organization",
        rootUrl: "https://example.test/",
        snapshot: {
          id: "test-snapshot",
          completedAt: new Date().toISOString(),
          pages: [
            {
              url: "https://example.test/",
              title: "Example Organization",
              description: "Example mission.",
              headings: ["Mission", "Programs", "Phase 1"],
              text: "Mission. Programs. Phase 1 delivers service.",
              wordCount: 8,
              contentHash: "abc123",
              fetchedAt: new Date().toISOString()
            }
          ]
        },
        changes: {
          hasPreviousSnapshot: false,
          summary: {
            added: 1,
            changed: 0,
            removed: 0,
            unchanged: 0
          }
        }
      };

      const result = await ingestCrawlResult(crawl);
      const recalled = recall("Phase 1");

      const assertions = [
        {
          name: "Successful crawl is retained in Knowledge Memory",
          passed: result.success === true && stored.length === 1
        },
        {
          name: "Stored knowledge preserves official source provenance",
          passed:
            stored[0]?.sourceType === "official-organization-website" &&
            stored[0]?.authority === "authoritative" &&
            stored[0]?.url === "https://example.test/"
        },
        {
          name: "Stable logical document ID enables future versioning",
          passed:
            typeof stored[0]?.logicalDocumentId === "string" &&
            stored[0].logicalDocumentId.startsWith("website-page-")
        },
        {
          name: "Website headings and content become searchable memory text",
          passed:
            stored[0]?.text.includes("Phase 1") &&
            stored[0]?.topics.includes("Phase 1")
        },
        {
          name: "Executive recall can retrieve retained website knowledge",
          passed:
            recalled.success === true &&
            recalled.executiveContext.answerStatus === "institutional-memory-found"
        },
        {
          name: "Website learning reports verified intelligence",
          passed:
            intelligenceItems.length === 1 &&
            intelligenceItems[0].verified === true
        }
      ];

      return {
        success: assertions.every(item => item.passed),
        schema: "meos.website-knowledge-integration.self-test.v1",
        passed: assertions.filter(item => item.passed).length,
        failed: assertions.filter(item => !item.passed).length,
        total: assertions.length,
        assertions,
        completedAt: new Date().toISOString()
      };
    } finally {
      global.KnowledgeMemory = originalMemory;
      global.IntelligenceEngine = originalIntelligence;
    }
  }

  const api = Object.freeze({
    name: NAME,
    version: VERSION,
    buildId: BUILD_ID,
    schema: SCHEMA,
    connect,
    ingestCrawlResult,
    learnOrganization,
    recall,
    getExecutiveBriefing,
    getStatus,
    runSelfTest,
    on
  });

  global.WebsiteKnowledgeIntegration = api;
  global.MEOSWebsiteKnowledgeIntegration = api;

  const connection = connect();
  state.initializedAt = new Date().toISOString();

  console.info(
    `[MEOS] ${NAME} v${VERSION} ${state.status}. Build ${BUILD_ID}.`,
    connection
  );

  emit("online", getStatus());
})(window);
