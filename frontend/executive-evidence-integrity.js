/**
 * Maddy Executive Operating System (MEOS)
 * Executive Evidence Integrity Engine
 *
 * Version: 1.0.1
 * Build: EEI101-TERMINOLOGY-REFINEMENT-20260801-A
 * Status: Commissioned
 *
 * Governing motto:
 * "Truth is our authority. Trust is our product."
 *
 * Mission:
 * Faithfully represent institutional truth before executive communication.
 *
 * Universal-core boundary:
 * - Contains no customer-specific organization data.
 * - Does not decide organizational policy.
 * - Does not generate final user-facing language.
 * - Does not replace Executive Recall, Executive Brain, or human authority.
 */

(function initializeExecutiveEvidenceIntegrity(global) {
  "use strict";

  const NAME = "MEOS Executive Evidence Integrity Engine";
  const VERSION = "1.0.1";
  const BUILD_ID = "EEI101-TERMINOLOGY-REFINEMENT-20260801-A";
  const SCHEMA = "meos.executive-evidence-integrity.package.v1";

  const EVIDENCE_CLASSES = Object.freeze({
    OFFICIAL_RECORD: "official-institutional-record",
    VERIFIED_INSTITUTIONAL: "verified-institutional-knowledge",
    VERIFIED_EXTERNAL: "verified-external-source",
    EXECUTIVE_SUMMARY: "executive-summary",
    EXECUTIVE_INFERENCE: "executive-inference",
    EXECUTIVE_RECOMMENDATION: "executive-recommendation",
    UNVERIFIED: "unverified-information"
  });

  const REPRESENTATION_MODES = Object.freeze({
    QUOTE: "quote",
    SUMMARY: "summary",
    INFERENCE: "inference",
    RECOMMENDATION: "recommendation",
    FACT: "fact"
  });

  const AUTHORITY_RANK = Object.freeze({
    constitutional: 100,
    system: 98,
    "authorized-human": 97,
    official: 95,
    authoritative: 95,
    approved: 92,
    submitted: 82,
    verified: 80,
    organization: 78,
    working: 62,
    draft: 45,
    unreviewed: 35,
    unknown: 20
  });

  const state = {
    status: "initializing",
    initializedAt: null,
    packagesCreated: 0,
    conflictsDetected: 0,
    correctionsRecorded: 0,
    lastPackageAt: null,
    listeners: {}
  };

  function clone(value) {
    if (value === undefined) return undefined;
    try {
      return global.structuredClone
        ? global.structuredClone(value)
        : JSON.parse(JSON.stringify(value));
    } catch (_error) {
      return value;
    }
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9$%()]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function uniqueStrings(values) {
    if (!Array.isArray(values)) return [];
    return Array.from(
      new Set(
        values
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      )
    );
  }

  function clampConfidence(value, fallback = 0.5) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(1, number));
  }

  function authorityRank(value) {
    return AUTHORITY_RANK[String(value || "unknown").toLowerCase()]
      || AUTHORITY_RANK.unknown;
  }

  function emit(eventName, payload) {
    const safePayload = clone(payload);

    state.listeners[eventName]?.forEach((handler) => {
      try {
        handler(safePayload);
      } catch (error) {
        console.warn(
          "[MEOS Executive Evidence Integrity] Listener failed.",
          error
        );
      }
    });

    if (
      typeof global.dispatchEvent === "function" &&
      typeof global.CustomEvent === "function"
    ) {
      global.dispatchEvent(
        new global.CustomEvent(`meos:evidence-integrity:${eventName}`, {
          detail: safePayload
        })
      );
    }
  }

  function on(eventName, handler) {
    if (typeof handler !== "function") return () => {};
    if (!state.listeners[eventName]) state.listeners[eventName] = new Set();
    state.listeners[eventName].add(handler);
    return () => state.listeners[eventName]?.delete(handler);
  }

  function deriveSourceCategory(item = {}) {
    const sourceType = String(
      item.sourceType ||
      item.source ||
      item.raw?.document?.sourceType ||
      ""
    ).toLowerCase();

    if (
      sourceType.includes("official-organization-website") ||
      sourceType.includes("organization-profile") ||
      sourceType.includes("board") ||
      sourceType.includes("policy") ||
      sourceType.includes("constitution")
    ) {
      return "institutional";
    }

    if (
      sourceType.includes("government") ||
      sourceType.includes("research") ||
      sourceType.includes("news") ||
      sourceType.includes("external")
    ) {
      return "external";
    }

    if (
      sourceType.includes("memory") ||
      sourceType.includes("knowledge") ||
      sourceType.includes("document")
    ) {
      return "institutional";
    }

    return "unknown";
  }

  function classifyEvidence(item = {}) {
    const explicitClass =
      item.evidenceClass ||
      item.classification ||
      item.integrityClass ||
      null;

    if (
      explicitClass &&
      Object.values(EVIDENCE_CLASSES).includes(explicitClass)
    ) {
      return explicitClass;
    }

    const authority = String(item.authority || "unknown").toLowerCase();
    const sourceCategory = deriveSourceCategory(item);
    const verified =
      item.verified === true ||
      item.raw?.verified === true ||
      clampConfidence(item.confidence, 0) >= 0.8;

    const representationMode = String(
      item.representationMode ||
      item.statementType ||
      ""
    ).toLowerCase();

    if (representationMode === REPRESENTATION_MODES.RECOMMENDATION) {
      return EVIDENCE_CLASSES.EXECUTIVE_RECOMMENDATION;
    }

    if (representationMode === REPRESENTATION_MODES.INFERENCE) {
      return EVIDENCE_CLASSES.EXECUTIVE_INFERENCE;
    }

    if (representationMode === REPRESENTATION_MODES.SUMMARY) {
      return EVIDENCE_CLASSES.EXECUTIVE_SUMMARY;
    }

    if (
      ["constitutional", "system", "authorized-human", "official", "authoritative", "approved"]
        .includes(authority) &&
      sourceCategory === "institutional"
    ) {
      return EVIDENCE_CLASSES.OFFICIAL_RECORD;
    }

    if (sourceCategory === "institutional" && verified) {
      return EVIDENCE_CLASSES.VERIFIED_INSTITUTIONAL;
    }

    if (sourceCategory === "external" && verified) {
      return EVIDENCE_CLASSES.VERIFIED_EXTERNAL;
    }

    return EVIDENCE_CLASSES.UNVERIFIED;
  }

  function detectRepresentationMode(item = {}) {
    const explicit = String(
      item.representationMode ||
      item.statementType ||
      ""
    ).toLowerCase();

    if (Object.values(REPRESENTATION_MODES).includes(explicit)) {
      return explicit;
    }

    const evidenceClass = classifyEvidence(item);

    if (evidenceClass === EVIDENCE_CLASSES.EXECUTIVE_RECOMMENDATION) {
      return REPRESENTATION_MODES.RECOMMENDATION;
    }

    if (evidenceClass === EVIDENCE_CLASSES.EXECUTIVE_INFERENCE) {
      return REPRESENTATION_MODES.INFERENCE;
    }

    if (evidenceClass === EVIDENCE_CLASSES.EXECUTIVE_SUMMARY) {
      return REPRESENTATION_MODES.SUMMARY;
    }

    if (item.isQuote === true || item.quote === true) {
      return REPRESENTATION_MODES.QUOTE;
    }

    return REPRESENTATION_MODES.FACT;
  }

  function isHighValueInstitutionalTerm(value, source = "derived") {
    const term = String(value || "").trim();
    const normalized = normalizeText(term);

    if (!normalized || normalized.length < 4 || normalized.length > 120) {
      return false;
    }

    const genericTerms = new Set([
      "description",
      "content",
      "summary",
      "information",
      "organization",
      "program",
      "services",
      "support",
      "community",
      "county",
      "website",
      "page",
      "document",
      "official",
      "institutional",
      "knowledge",
      "memory",
      "general",
      "other"
    ]);

    if (genericTerms.has(normalized)) {
      return false;
    }

    /*
     * Explicit terminology supplied by an authoritative source is trusted,
     * including lowercase phrases such as "emergency hotel vouchers."
     */
    if (source === "explicit") {
      return true;
    }

    const words = normalized.split(" ").filter(Boolean);
    const originalWords = term.split(/\s+/).filter(Boolean);

    const isMultiWordPhrase = words.length >= 2;
    const isAcronym =
      /^[A-Z0-9][A-Z0-9&./-]{1,14}$/.test(term);
    const hasInstitutionalCapitalization =
      originalWords.length >= 2 &&
      originalWords.filter((word) =>
        /^[A-Z][A-Za-z0-9'’&/-]*$/.test(word)
      ).length >= 2;
    const looksLikeFormalHeading =
      isMultiWordPhrase &&
      (
        hasInstitutionalCapitalization ||
        /[:—–-]/.test(term)
      );

    return isAcronym || looksLikeFormalHeading;
  }

  function extractOfficialTerms(item = {}) {
    const explicitTerms = uniqueStrings([
      ...(item.officialTerms || []),
      ...(item.terminologyLocks || []),
      ...(item.raw?.officialTerms || []),
      ...(item.raw?.terminologyLocks || [])
    ]).filter((value) =>
      isHighValueInstitutionalTerm(value, "explicit")
    );

    const headingTerms = uniqueStrings([
      item.sectionTitle,
      item.title
    ]).filter((value) =>
      isHighValueInstitutionalTerm(value, "heading")
    );

    const topicTerms = uniqueStrings([
      ...(item.topics || [])
    ]).filter((value) =>
      isHighValueInstitutionalTerm(value, "topic")
    );

    return uniqueStrings([
      ...explicitTerms,
      ...headingTerms,
      ...topicTerms
    ]);
  }

  function buildProvenance(item = {}) {
    const raw = item.raw || {};
    const document = raw.document || {};

    return {
      sourceType:
        item.sourceType ||
        item.source ||
        document.sourceType ||
        null,
      sourceId:
        item.sourceId ||
        item.id ||
        document.id ||
        null,
      sourceTitle:
        item.title ||
        document.title ||
        null,
      sourceUrl:
        item.url ||
        item.citation?.locator ||
        document.url ||
        raw.url ||
        null,
      authority:
        item.authority ||
        document.authority ||
        "unknown",
      confidence:
        clampConfidence(
          item.confidence ?? document.confidence,
          0.5
        ),
      citation:
        clone(item.citation || raw.citation || null),
      version:
        item.version ||
        item.versionLabel ||
        document.version ||
        document.versionLabel ||
        raw.version ||
        null,
      retrievedAt:
        item.retrievedAt ||
        item.accessedAt ||
        item.date ||
        document.accessedAt ||
        document.updatedAt ||
        raw.retrievedAt ||
        nowIso()
    };
  }

  function normalizeEvidenceItem(item = {}, index = 0) {
    const content = String(
      item.content ||
      item.text ||
      item.summary ||
      item.statement ||
      ""
    ).trim();

    const summary = String(
      item.summary ||
      item.statement ||
      item.text ||
      item.content ||
      ""
    ).trim();

    const evidenceClass = classifyEvidence(item);
    const representationMode = detectRepresentationMode(item);
    const provenance = buildProvenance(item);

    return {
      id:
        item.id ||
        item.sourceId ||
        `integrity-evidence-${index + 1}`,
      title:
        item.title ||
        item.documentTitle ||
        item.sectionTitle ||
        "Untitled Evidence",
      summary,
      content,
      evidenceClass,
      representationMode,
      officialTerms: extractOfficialTerms(item),
      topics: uniqueStrings([
        ...(item.topics || []),
        ...(item.tags || [])
      ]),
      provenance,
      authorityRank: authorityRank(provenance.authority),
      confidence: provenance.confidence,
      original: clone(item)
    };
  }

  function isPlaceholder(item) {
    const text = normalizeText(
      [item.title, item.summary, item.content].join(" ")
    );

    if (!text) return true;

    const placeholderPhrases = [
      "document entered meos institutional memory",
      "document received for review",
      "system component status",
      "no summary available",
      "not connected",
      "placeholder"
    ];

    return placeholderPhrases.some((phrase) => text.includes(phrase));
  }

  function relevanceScore(item, subject = "") {
    const query = normalizeText(subject);
    const terms = query.split(" ").filter((term) => term.length >= 2);
    const title = normalizeText(item.title);
    const summary = normalizeText(item.summary);
    const content = normalizeText(item.content);
    const topics = normalizeText(
      [...item.topics, ...item.officialTerms].join(" ")
    );

    let score = 0;

    if (query) {
      if (title === query) score += 140;
      else if (title.includes(query)) score += 100;

      if (summary.includes(query)) score += 80;
      if (content.includes(query)) score += 70;
      if (topics.includes(query)) score += 55;

      terms.forEach((term) => {
        if (title.includes(term)) score += 22;
        if (summary.includes(term)) score += 16;
        if (content.includes(term)) score += 12;
        if (topics.includes(term)) score += 10;
      });
    }

    const classWeight = {
      [EVIDENCE_CLASSES.OFFICIAL_RECORD]: 60,
      [EVIDENCE_CLASSES.VERIFIED_INSTITUTIONAL]: 48,
      [EVIDENCE_CLASSES.VERIFIED_EXTERNAL]: 38,
      [EVIDENCE_CLASSES.EXECUTIVE_SUMMARY]: 28,
      [EVIDENCE_CLASSES.EXECUTIVE_INFERENCE]: 18,
      [EVIDENCE_CLASSES.EXECUTIVE_RECOMMENDATION]: 15,
      [EVIDENCE_CLASSES.UNVERIFIED]: 0
    };

    score += classWeight[item.evidenceClass] || 0;
    score += Math.round(item.confidence * 25);
    score += Math.round(item.authorityRank / 10);
    if (item.provenance.citation) score += 10;

    return score;
  }

  function detectConflicts(items) {
    const conflicts = [];
    const grouped = new Map();

    items.forEach((item) => {
      const keys = uniqueStrings([
        ...item.topics,
        ...item.officialTerms,
        item.title
      ])
        .map(normalizeText)
        .filter(Boolean);

      keys.forEach((key) => {
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(item);
      });
    });

    grouped.forEach((groupItems, topic) => {
      if (groupItems.length < 2) return;

      const authoritative = groupItems.filter(
        (item) =>
          item.evidenceClass === EVIDENCE_CLASSES.OFFICIAL_RECORD
      );

      const normalizedStatements = uniqueStrings(
        authoritative
          .map((item) => normalizeText(item.content || item.summary))
          .filter(Boolean)
      );

      if (authoritative.length > 1 && normalizedStatements.length > 1) {
        conflicts.push({
          id: `integrity-conflict-${conflicts.length + 1}`,
          topic,
          type: "official-source-conflict",
          description:
            "Multiple official institutional sources contain materially different language for the same topic.",
          requiresHumanReview: true,
          sources: authoritative.map((item) => ({
            id: item.id,
            title: item.title,
            authority: item.provenance.authority,
            citation: clone(item.provenance.citation),
            version: item.provenance.version,
            retrievedAt: item.provenance.retrievedAt
          }))
        });
      }

      const officialTerms = uniqueStrings(
        authoritative.flatMap((item) => item.officialTerms)
      );

      const lowerAuthorityTerms = uniqueStrings(
        groupItems
          .filter(
            (item) =>
              item.evidenceClass !== EVIDENCE_CLASSES.OFFICIAL_RECORD
          )
          .flatMap((item) => item.officialTerms)
      );

      const terminologyMismatch = lowerAuthorityTerms.filter(
        (term) =>
          officialTerms.length > 0 &&
          !officialTerms.some(
            (officialTerm) =>
              normalizeText(officialTerm) === normalizeText(term)
          )
      );

      if (terminologyMismatch.length > 0) {
        conflicts.push({
          id: `integrity-conflict-${conflicts.length + 1}`,
          topic,
          type: "terminology-mismatch",
          description:
            "Non-official terminology differs from preserved official terminology.",
          officialTerms,
          conflictingTerms: terminologyMismatch,
          requiresHumanReview: false
        });
      }
    });

    return conflicts;
  }

  function buildTerminologyLocks(items) {
    const locks = new Map();

    items
      .filter(
        (item) =>
          item.evidenceClass === EVIDENCE_CLASSES.OFFICIAL_RECORD ||
          item.evidenceClass === EVIDENCE_CLASSES.VERIFIED_INSTITUTIONAL
      )
      .forEach((item) => {
        item.officialTerms.forEach((term) => {
          const normalized = normalizeText(term);
          if (!normalized) return;

          const existing = locks.get(normalized);

          if (!existing || item.authorityRank > existing.authorityRank) {
            locks.set(normalized, {
              term,
              normalized,
              authorityRank: item.authorityRank,
              sourceId: item.provenance.sourceId,
              sourceTitle: item.provenance.sourceTitle,
              citation: clone(item.provenance.citation),
              rule:
                "Preserve this term for the related institutional subject. Do not silently replace it with invented terminology."
            });
          }
        });
      });

    return Array.from(locks.values())
      .sort((a, b) => b.authorityRank - a.authorityRank);
  }

  function inferMissionRelationships(items) {
    const relationships = [];

    items.forEach((item) => {
      const raw = item.original || {};
      const mission =
        raw.mission ||
        raw.missionName ||
        raw.relationships?.mission ||
        null;

      const methods = uniqueStrings([
        ...(raw.methods || []),
        ...(raw.relationships?.methods || [])
      ]);

      if (mission && methods.length > 0) {
        relationships.push({
          id: `mission-relationship-${relationships.length + 1}`,
          mission: String(mission),
          methods,
          sourceId: item.provenance.sourceId,
          confidence: item.confidence,
          basis: "explicit-source-metadata"
        });
      }
    });

    return relationships;
  }

  function buildLanguageContract(packageInput) {
    const hasOfficial = packageInput.officialFacts.length > 0;
    const hasInstitutional =
      packageInput.verifiedInstitutionalKnowledge.length > 0;
    const hasConflicts = packageInput.conflicts.length > 0;
    const lowestConfidence =
      packageInput.allEvidence.length > 0
        ? Math.min(
            ...packageInput.allEvidence.map((item) => item.confidence)
          )
        : 0;

    return {
      primaryRule:
        "Represent institutional truth faithfully before optimizing fluency.",
      quoteRules: [
        "Do not present a paraphrase as a direct quotation.",
        "When asked for exact wording, use only preserved official text or state that exact wording cannot be verified.",
        "Do not attribute invented terminology to the organization."
      ],
      summaryRules: [
        "A summary may simplify language but must preserve meaning and official terminology.",
        "When material ambiguity exists, identify the response as a summary.",
        "Separate the mission from the methods used to accomplish it."
      ],
      inferenceRules: [
        "Label inference as analysis or interpretation.",
        "Do not present inference as institutional policy or official language."
      ],
      recommendationRules: [
        "Introduce recommendations as executive judgment.",
        "Do not present recommendations as existing organizational policy."
      ],
      correctionRule:
        "When prior wording was inaccurate, acknowledge it plainly, provide the correction, and avoid defensiveness.",
      recommendedOpening:
        hasConflicts
          ? "Identify the institutional conflict before giving a definitive answer."
          : hasOfficial
            ? "Use the official institutional record as the primary basis."
            : hasInstitutional
              ? "State that the answer is based on verified institutional knowledge."
              : "State the limitation and avoid presenting unsupported wording as fact.",
      uncertaintyRequired:
        hasConflicts || lowestConfidence < 0.58,
      evidenceDetailsAvailable: true
    };
  }

  function calculatePackageConfidence(items, conflicts) {
    if (items.length === 0) return 0;

    const weightedTotal = items.reduce((total, item) => {
      const authorityWeight = Math.max(0.2, item.authorityRank / 100);
      return total + item.confidence * authorityWeight;
    }, 0);

    const weightTotal = items.reduce(
      (total, item) =>
        total + Math.max(0.2, item.authorityRank / 100),
      0
    );

    const conflictPenalty = Math.min(
      0.35,
      conflicts.filter((item) => item.requiresHumanReview).length * 0.08
    );

    return Number(
      Math.max(
        0,
        Math.min(
          0.99,
          weightedTotal / weightTotal - conflictPenalty
        )
      ).toFixed(3)
    );
  }

  function prepare(input = {}, options = {}) {
    const sourceItems = Array.isArray(input)
      ? input
      : Array.isArray(input.evidence)
        ? input.evidence
        : Array.isArray(input.items)
          ? input.items
          : [];

    const subject = String(
      options.subject ||
      input.subject ||
      input.query ||
      ""
    ).trim();

    const normalized = sourceItems
      .map((item, index) => normalizeEvidenceItem(item, index))
      .filter((item) => !isPlaceholder(item))
      .map((item) => ({
        ...item,
        relevanceScore: relevanceScore(item, subject)
      }))
      .sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }

        if (b.authorityRank !== a.authorityRank) {
          return b.authorityRank - a.authorityRank;
        }

        return b.confidence - a.confidence;
      });

    const conflicts = detectConflicts(normalized);
    const terminologyLocks = buildTerminologyLocks(normalized);
    const missionRelationships = inferMissionRelationships(normalized);

    const packageData = {
      success: true,
      schema: SCHEMA,
      engine: {
        name: NAME,
        version: VERSION,
        buildId: BUILD_ID,
        motto: "Truth is our authority. Trust is our product."
      },
      subject,
      officialFacts: normalized.filter(
        (item) =>
          item.evidenceClass === EVIDENCE_CLASSES.OFFICIAL_RECORD
      ),
      verifiedInstitutionalKnowledge: normalized.filter(
        (item) =>
          item.evidenceClass === EVIDENCE_CLASSES.VERIFIED_INSTITUTIONAL
      ),
      verifiedExternalSources: normalized.filter(
        (item) =>
          item.evidenceClass === EVIDENCE_CLASSES.VERIFIED_EXTERNAL
      ),
      executiveSummaries: normalized.filter(
        (item) =>
          item.evidenceClass === EVIDENCE_CLASSES.EXECUTIVE_SUMMARY
      ),
      executiveInferences: normalized.filter(
        (item) =>
          item.evidenceClass === EVIDENCE_CLASSES.EXECUTIVE_INFERENCE
      ),
      executiveRecommendations: normalized.filter(
        (item) =>
          item.evidenceClass === EVIDENCE_CLASSES.EXECUTIVE_RECOMMENDATION
      ),
      unverifiedInformation: normalized.filter(
        (item) =>
          item.evidenceClass === EVIDENCE_CLASSES.UNVERIFIED
      ),
      terminologyLocks,
      missionRelationships,
      conflicts,
      citations: normalized
        .map((item) => item.provenance.citation)
        .filter(Boolean),
      allEvidence: normalized,
      confidence: calculatePackageConfidence(normalized, conflicts),
      generatedAt: nowIso()
    };

    packageData.languageContract = buildLanguageContract(packageData);

    state.packagesCreated += 1;
    state.conflictsDetected += conflicts.length;
    state.lastPackageAt = packageData.generatedAt;

    emit("package-created", packageData);

    return clone(packageData);
  }

  function recordCorrection(input = {}) {
    const correction = {
      id:
        input.id ||
        `integrity-correction-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
      priorStatement:
        String(input.priorStatement || "").trim(),
      correctedStatement:
        String(input.correctedStatement || "").trim(),
      reason:
        String(
          input.reason ||
          "Prior language was not supported by the strongest available evidence."
        ).trim(),
      source:
        clone(input.source || input.citation || null),
      acknowledged:
        input.acknowledged !== false,
      createdAt: nowIso()
    };

    if (!correction.correctedStatement) {
      return {
        success: false,
        error: "A corrected statement is required."
      };
    }

    state.correctionsRecorded += 1;
    emit("correction-recorded", correction);

    return {
      success: true,
      correction
    };
  }

  function getStatus() {
    return {
      name: NAME,
      version: VERSION,
      buildId: BUILD_ID,
      schema: SCHEMA,
      status: state.status,
      operatingMode: "constitutional-evidence-governance",
      organizationNeutralCore: true,
      nonBypassableTarget: true,
      packagesCreated: state.packagesCreated,
      conflictsDetected: state.conflictsDetected,
      correctionsRecorded: state.correctionsRecorded,
      lastPackageAt: state.lastPackageAt,
      initializedAt: state.initializedAt
    };
  }

  function runSelfTest() {
    const evidence = [
      {
        id: "official-1",
        title: "Emergency Extractions",
        content:
          "Our pooled fund deploys immediate hotel vouchers across our local network.",
        sourceType: "official-organization-website",
        authority: "authoritative",
        confidence: 0.96,
        citation: {
          sourceType: "official-organization-website",
          sourceId: "official-1",
          title: "Emergency Extractions",
          locator: "https://example.test/frontline"
        },
        officialTerms: [
          "Emergency Extractions",
          "emergency hotel vouchers"
        ],
        topics: [
          "veterans",
          "crisis support",
          "Frontline Fellowship",
          "Description",
          "county",
          "running"
        ],
        mission: "Emergency Extraction",
        methods: [
          "emergency hotel vouchers",
          "transportation",
          "peer support"
        ]
      },
      {
        id: "summary-1",
        title: "Frontline summary",
        content:
          "The program performs hotel extractions.",
        sourceType: "memory",
        authority: "working",
        confidence: 0.65,
        representationMode: "summary",
        officialTerms: ["hotel extractions"],
        topics: ["veterans", "crisis support"]
      },
      {
        id: "recommendation-1",
        title: "Executive recommendation",
        content:
          "My recommendation is to emphasize the rapid stabilization mission.",
        sourceType: "executive",
        authority: "working",
        confidence: 0.72,
        representationMode: "recommendation"
      },
      {
        id: "placeholder-1",
        title: "Imported Document",
        content: "Document entered MEOS institutional memory.",
        sourceType: "knowledge",
        authority: "authoritative",
        confidence: 1
      }
    ];

    const result = prepare({
      subject: "What are Emergency Extractions?",
      evidence
    });

    const correction = recordCorrection({
      priorStatement: "hotel extractions",
      correctedStatement:
        "Emergency Extractions may use emergency hotel vouchers as one method.",
      reason:
        "The prior phrase blended the mission heading with the operational method."
    });

    const assertions = [
      {
        name: "Official website evidence is classified as an official record",
        passed:
          result.officialFacts.length === 1 &&
          result.officialFacts[0].id === "official-1"
      },
      {
        name: "Placeholder evidence is excluded",
        passed:
          !result.allEvidence.some(
            (item) => item.id === "placeholder-1"
          )
      },
      {
        name: "Official terminology is locked",
        passed:
          result.terminologyLocks.some(
            (item) => item.term === "Emergency Extractions"
          ) &&
          result.terminologyLocks.some(
            (item) => item.term === "emergency hotel vouchers"
          )
      },
      {
        name: "Mission and methods remain separate",
        passed:
          result.missionRelationships.some(
            (item) =>
              item.mission === "Emergency Extraction" &&
              item.methods.includes("emergency hotel vouchers")
          )
      },
      {
        name: "Recommendation remains separate from institutional facts",
        passed:
          result.executiveRecommendations.length === 1 &&
          result.executiveRecommendations[0].id === "recommendation-1"
      },
      {
        name: "Terminology mismatch is detected",
        passed:
          result.conflicts.some(
            (item) => item.type === "terminology-mismatch"
          )
      },
      {
        name: "Respectful correction can be recorded",
        passed:
          correction.success === true &&
          correction.correction.acknowledged === true
      },
      {
        name: "Generic words are not terminology locks",
        passed:
          !result.terminologyLocks.some(
            (item) =>
              ["description", "county", "running", "veterans"]
                .includes(item.normalized)
          )
      },
      {
        name: "High-value institutional phrases remain protected",
        passed:
          result.terminologyLocks.some(
            (item) => item.term === "Frontline Fellowship"
          ) &&
          result.terminologyLocks.some(
            (item) => item.term === "Emergency Extractions"
          ) &&
          result.terminologyLocks.some(
            (item) => item.term === "emergency hotel vouchers"
          )
      },
      {
        name: "Terminology lock set remains concise",
        passed:
          result.terminologyLocks.length <= 8
      },
      {
        name: "Language contract prohibits paraphrase-as-quote",
        passed:
          result.languageContract.quoteRules.some(
            (rule) =>
              rule.includes("Do not present a paraphrase")
          )
      }
    ];

    return {
      success: assertions.every((item) => item.passed),
      schema:
        "meos.executive-evidence-integrity.self-test.v1",
      passed:
        assertions.filter((item) => item.passed).length,
      failed:
        assertions.filter((item) => !item.passed).length,
      total: assertions.length,
      assertions,
      completedAt: nowIso()
    };
  }

  const api = Object.freeze({
    name: NAME,
    version: VERSION,
    buildId: BUILD_ID,
    schema: SCHEMA,
    EVIDENCE_CLASSES,
    REPRESENTATION_MODES,
    prepare,
    classifyEvidence,
    recordCorrection,
    runSelfTest,
    getStatus,
    on
  });

  global.ExecutiveEvidenceIntegrity = api;
  global.MEOSExecutiveEvidenceIntegrity = api;

  state.status = "online";
  state.initializedAt = nowIso();

  console.info(
    `[MEOS] ${NAME} v${VERSION} online. Build ${BUILD_ID}.`
  );

  emit("online", getStatus());
})(window);
