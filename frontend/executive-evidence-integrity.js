/**
 * Maddy Executive Operating System (MEOS)
 * Executive Evidence Integrity Engine
 *
 * Version: 1.3.0
 * Build: EEI130-COUNTERPARTY-INTELLIGENCE-20260913-A
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
  const VERSION = "1.3.0";
  const BUILD_ID = "EEI130-COUNTERPARTY-INTELLIGENCE-20260913-A";
  const SCHEMA = "meos.executive-evidence-integrity.package.v1";
  const EPISTEMIC_SCHEMA = "meos.maddy.epistemic-claim.v1";
  const REALITY_RECONSTRUCTION_SCHEMA = "meos.maddy.reality-reconstruction.v1";
  const COUNTERPARTY_INTELLIGENCE_SCHEMA = "meos.maddy.counterparty-intelligence.v1";

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

  function normalizeActor(item = {}) {
    const raw = item.raw || {};
    const actor = item.actor || item.assertedBy || raw.actor || raw.assertedBy || null;
    if (!actor) return null;
    if (typeof actor === "string") return { id: null, name: actor, type: "unknown", role: "asserter" };
    return {
      id: actor.id || actor.actorId || null,
      name: actor.name || actor.label || actor.title || null,
      type: actor.type || actor.actorType || "unknown",
      role: actor.role || "asserter"
    };
  }

  function normalizeLineage(item = {}, provenance = {}) {
    const raw = item.raw || {};
    const lineage = item.sourceLineage || item.lineage || raw.sourceLineage || raw.lineage || [];
    const normalized = (Array.isArray(lineage) ? lineage : [lineage])
      .filter(Boolean)
      .map((entry) => typeof entry === "string"
        ? { sourceId: entry, relation: "derived-from" }
        : {
            sourceId: entry.sourceId || entry.id || null,
            sourceUrl: entry.sourceUrl || entry.url || null,
            relation: entry.relation || "derived-from"
          });
    if (provenance.sourceId || provenance.sourceUrl) {
      normalized.unshift({
        sourceId: provenance.sourceId || null,
        sourceUrl: provenance.sourceUrl || null,
        relation: "observed-source"
      });
    }
    return normalized;
  }

  function deriveIndependence(item = {}, lineage = []) {
    const explicit = item.independence || item.sourceIndependence || item.raw?.independence;
    if (explicit && typeof explicit === "object") {
      return {
        status: explicit.status || "unknown",
        groupId: explicit.groupId || explicit.originGroupId || null,
        basis: explicit.basis || null
      };
    }
    const groupId = item.originGroupId || item.canonicalSourceId || item.raw?.originGroupId || null;
    return {
      status: item.independent === true ? "independent" : item.independent === false ? "dependent" : "unknown",
      groupId,
      basis: groupId ? "shared-origin-group" : lineage.length > 1 ? "declared-lineage" : null
    };
  }

  function deriveFreshness(item = {}, provenance = {}) {
    const explicit = item.freshness || item.raw?.freshness;
    const validFrom = item.validFrom || explicit?.validFrom || null;
    const validUntil = item.validUntil || item.expiresAt || explicit?.validUntil || null;
    const observedAt = provenance.retrievedAt || nowIso();
    const now = Date.now();
    const until = validUntil ? Date.parse(validUntil) : NaN;
    const status = explicit?.status || (Number.isFinite(until) && until < now ? "stale" : "unknown");
    return { status, observedAt, validFrom, validUntil };
  }

  function deriveEpistemicStatus(item = {}, evidenceClass, independence, freshness) {
    const explicit = item.epistemicStatus || item.truthStatus || item.raw?.epistemicStatus;
    if (explicit) return String(explicit);
    if (freshness.status === "stale") return "stale";
    if (evidenceClass === EVIDENCE_CLASSES.EXECUTIVE_INFERENCE) return "inferred";
    if (evidenceClass === EVIDENCE_CLASSES.EXECUTIVE_RECOMMENDATION) return "recommended";
    if (evidenceClass === EVIDENCE_CLASSES.UNVERIFIED) return "unverified";
    if (independence.status === "dependent") return "supported-dependent";
    return "supported";
  }

  function buildEpistemicClaim(item = {}, index = 0, evidenceClass, provenance) {
    const statement = String(item.claim || item.statement || item.content || item.text || item.summary || "").trim();
    const actor = normalizeActor(item);
    const sourceLineage = normalizeLineage(item, provenance);
    const independence = deriveIndependence(item, sourceLineage);
    const freshness = deriveFreshness(item, provenance);
    const contradictions = clone(item.contradictions || item.raw?.contradictions || []);
    const incentives = clone(item.incentives || actor?.incentives || item.raw?.incentives || []);
    const status = deriveEpistemicStatus(item, evidenceClass, independence, freshness);
    return {
      schema: EPISTEMIC_SCHEMA,
      claimId: item.claimId || item.id || item.sourceId || `epistemic-claim-${index + 1}`,
      statement,
      actor,
      provenance: clone(provenance),
      sourceLineage,
      independence,
      contradictions: Array.isArray(contradictions) ? contradictions : [contradictions].filter(Boolean),
      incentives: Array.isArray(incentives) ? incentives : [incentives].filter(Boolean),
      freshness,
      status,
      confidence: clampConfidence(item.confidence ?? provenance.confidence, 0.5),
      propositionId: item.propositionId || item.claimGroupId || item.raw?.propositionId || item.raw?.claimGroupId || null,
      observationKind: item.observationKind || item.raw?.observationKind || "claim",
      perspective: clone(item.perspective || item.raw?.perspective || null),
      stance: String(item.stance || item.evidenceRole || item.raw?.stance || "observes"),
      hypothesisIds: uniqueStrings(item.hypothesisIds || item.supportsHypothesisIds || item.raw?.hypothesisIds || []),
      falsifiesHypothesisIds: uniqueStrings(item.falsifiesHypothesisIds || item.contradictsHypothesisIds || item.raw?.falsifiesHypothesisIds || []),
      factKey: item.factKey || item.raw?.factKey || null,
      factValue: item.factValue ?? item.raw?.factValue ?? null,
      falsifiers: uniqueStrings(item.falsifiers || item.wouldChangeBelief || item.raw?.falsifiers || []),
      observedAt: provenance.retrievedAt || nowIso()
    };
  }

  function evidenceChainKey(item = {}) {
    const claim = item.epistemicClaim || {};
    const independence = claim.independence || item.sourceIndependence || {};
    if (independence.groupId) return `origin:${independence.groupId}`;

    const lineage = Array.isArray(claim.sourceLineage) ? claim.sourceLineage : [];
    const declaredRoot = lineage.find((entry) => entry?.relation === "original" || entry?.relation === "root-source");
    if (declaredRoot?.sourceId || declaredRoot?.sourceUrl) {
      return `root:${declaredRoot.sourceId || declaredRoot.sourceUrl}`;
    }

    const firstDerived = lineage.find((entry) => entry?.relation === "derived-from" || entry?.relation === "repeats");
    if (firstDerived?.sourceId || firstDerived?.sourceUrl) {
      return `root:${firstDerived.sourceId || firstDerived.sourceUrl}`;
    }

    return `source:${item.provenance?.sourceId || item.provenance?.sourceUrl || item.id}`;
  }

  function normalizeHypothesis(entry, fallbackId = null) {
    if (!entry) return null;
    if (typeof entry === "string") {
      return { id: fallbackId || normalizeText(entry).replace(/\s+/g, "-").slice(0, 80), label: entry, description: entry, discriminators: [] };
    }
    const label = String(entry.label || entry.title || entry.description || entry.statement || "").trim();
    const id = entry.id || entry.hypothesisId || fallbackId || normalizeText(label).replace(/\s+/g, "-").slice(0, 80);
    if (!id && !label) return null;
    return {
      id: String(id || `hypothesis-${Math.random().toString(36).slice(2, 8)}`),
      label: label || String(id),
      description: String(entry.description || entry.statement || label || id),
      discriminators: uniqueStrings(entry.discriminators || entry.testEvidence || entry.wouldDistinguish || []),
      priorConfidence: entry.priorConfidence == null ? null : clampConfidence(entry.priorConfidence, 0.5)
    };
  }

  function collectHypotheses(items = [], inputHypotheses = []) {
    const hypotheses = new Map();
    const add = (entry, fallbackId = null) => {
      const normalized = normalizeHypothesis(entry, fallbackId);
      if (!normalized) return;
      const existing = hypotheses.get(normalized.id);
      hypotheses.set(normalized.id, existing ? {
        ...existing,
        ...normalized,
        label: normalized.label === normalized.id && existing.label ? existing.label : normalized.label,
        description: normalized.description === normalized.id && existing.description ? existing.description : normalized.description,
        discriminators: uniqueStrings([...(existing.discriminators || []), ...(normalized.discriminators || [])])
      } : normalized);
    };

    (Array.isArray(inputHypotheses) ? inputHypotheses : [inputHypotheses]).filter(Boolean).forEach((entry) => add(entry));

    items.forEach((item) => {
      const raw = item.original || {};
      (Array.isArray(raw.hypotheses) ? raw.hypotheses : [raw.hypothesis]).filter(Boolean).forEach((entry) => add(entry));
      const narrativeId = raw.narrativeId || raw.hypothesisId || null;
      const narrativeLabel = raw.narrativeLabel || raw.hypothesisLabel || null;
      if (narrativeId || narrativeLabel) add({ id: narrativeId, label: narrativeLabel || narrativeId }, narrativeId);
      [...(item.epistemicClaim?.hypothesisIds || []), ...(item.epistemicClaim?.falsifiesHypothesisIds || [])].forEach((id) => add({ id, label: id }, id));
    });

    return Array.from(hypotheses.values());
  }

  function chainWeight(chain) {
    if (!chain?.members?.length) return 0;
    const best = chain.members.reduce((winner, item) => {
      const score = item.confidence * Math.max(0.2, item.authorityRank / 100);
      const winnerScore = winner ? winner.confidence * Math.max(0.2, winner.authorityRank / 100) : -1;
      return score > winnerScore ? item : winner;
    }, null);
    if (!best) return 0;
    const stalePenalty = best.freshness?.status === "stale" ? 0.55 : 1;
    return Number((best.confidence * Math.max(0.2, best.authorityRank / 100) * stalePenalty).toFixed(4));
  }

  function buildRealityReconstruction(items = [], subject = "", options = {}) {
    const chainMap = new Map();
    items.forEach((item) => {
      const key = evidenceChainKey(item);
      if (!chainMap.has(key)) chainMap.set(key, { id: key, members: [] });
      chainMap.get(key).members.push(item);
    });

    const chains = Array.from(chainMap.values()).map((chain) => ({
      id: chain.id,
      memberClaimIds: chain.members.map((item) => item.epistemicClaim?.claimId || item.id),
      apparentSourceCount: chain.members.length,
      representativeSourceId: chain.members[0]?.provenance?.sourceId || chain.members[0]?.id || null,
      weight: chainWeight(chain),
      members: chain.members
    }));

    const hypotheses = collectHypotheses(items, options.hypotheses || []);
    const hypothesisResults = hypotheses.map((hypothesis) => {
      let support = 0;
      let challenge = 0;
      const supportingChains = [];
      const challengingChains = [];

      chains.forEach((chain) => {
        const supports = chain.members.some((item) => item.epistemicClaim?.hypothesisIds?.includes(hypothesis.id));
        const falsifies = chain.members.some((item) => item.epistemicClaim?.falsifiesHypothesisIds?.includes(hypothesis.id));
        if (supports) { support += chain.weight; supportingChains.push(chain.id); }
        if (falsifies) { challenge += chain.weight; challengingChains.push(chain.id); }
      });

      const denominator = Math.max(1, support + challenge);
      const evidenceBalance = (support - challenge) / denominator;
      const score = Number(Math.max(0, Math.min(1, 0.5 + evidenceBalance * 0.5)).toFixed(3));
      return {
        ...hypothesis,
        score,
        supportWeight: Number(support.toFixed(4)),
        challengeWeight: Number(challenge.toFixed(4)),
        independentSupportingChains: supportingChains,
        independentChallengingChains: challengingChains
      };
    }).sort((a, b) => b.score - a.score || b.supportWeight - a.supportWeight);

    const factGroups = new Map();
    items.forEach((item) => {
      const claim = item.epistemicClaim || {};
      if (!claim.factKey) return;
      const valueKey = JSON.stringify(claim.factValue);
      const key = `${claim.factKey}::${valueKey}`;
      if (!factGroups.has(key)) factGroups.set(key, { factKey: claim.factKey, factValue: clone(claim.factValue), chains: new Set(), claimIds: [] });
      const group = factGroups.get(key);
      group.chains.add(evidenceChainKey(item));
      group.claimIds.push(claim.claimId);
    });

    const commonGround = Array.from(factGroups.values())
      .filter((group) => group.chains.size >= 2)
      .map((group) => ({ factKey: group.factKey, factValue: group.factValue, independentChains: group.chains.size, claimIds: group.claimIds }));

    const discriminatingEvidence = uniqueStrings([
      ...items.flatMap((item) => item.epistemicClaim?.falsifiers || []),
      ...hypothesisResults.flatMap((hypothesis) => hypothesis.discriminators || []),
      ...(Array.isArray(options.discriminatingEvidence) ? options.discriminatingEvidence : [])
    ]);

    const apparentSources = items.length;
    const independentChains = chains.length;
    const collapsedDependentSources = Math.max(0, apparentSources - independentChains);
    const top = hypothesisResults[0] || null;
    const second = hypothesisResults[1] || null;
    const margin = top ? Number((top.score - (second?.score ?? 0)).toFixed(3)) : 0;
    const materiallySupported = top && top.supportWeight >= 0.55 && top.score >= 0.68 && margin >= 0.18;
    const status = hypothesisResults.length === 0
      ? "evidence-organized"
      : materiallySupported
        ? "provisional-leading-hypothesis"
        : "unresolved-competing-explanations";

    return {
      schema: REALITY_RECONSTRUCTION_SCHEMA,
      subject,
      status,
      reconstructionRule: "Surface appearance is evidence, not truth. Reconstruct the best-supported underlying reality without converting repetition, authority, disagreement, or Maddy's prior conclusion into automatic truth.",
      narrativeRule: "Different stories do not automatically imply deception; identical stories do not automatically provide independent corroboration.",
      apparentSources,
      independentEvidenceChains: independentChains,
      collapsedDependentSources,
      repetitionAnalysis: { apparentSources, independentChains, collapsedDependentSources, repetitionIsNotCorroboration: true },
      commonGround,
      hypotheses: hypothesisResults,
      leadingHypothesis: materiallySupported ? clone(top) : null,
      uncertaintyPreserved: !materiallySupported,
      discriminatingEvidence,
      antiConfirmationBias: {
        active: true,
        rule: "Seek evidence that could distinguish competing explanations or prove the leading explanation wrong.",
        requiredEvidence: discriminatingEvidence
      },
      observations: items.map((item) => ({
        claimId: item.epistemicClaim?.claimId || item.id,
        statement: item.epistemicClaim?.statement || item.summary,
        actor: clone(item.epistemicClaim?.actor || null),
        perspective: clone(item.epistemicClaim?.perspective || null),
        observationKind: item.epistemicClaim?.observationKind || "claim",
        epistemicStatus: item.epistemicStatus,
        evidenceChainId: evidenceChainKey(item)
      })),
      generatedAt: nowIso()
    };
  }

  function counterpartyKey(actor = {}) {
    const id = String(actor.id || "").trim();
    if (id) return `id:${id}`;
    const name = normalizeText(actor.name || "");
    const type = normalizeText(actor.type || "unknown");
    return name ? `name:${name}|type:${type}` : null;
  }

  function normalizeBehaviorObservation(item = {}) {
    const raw = item.original || {};
    const behavior = raw.behaviorObservation || raw.counterpartyObservation || raw.relationshipObservation || null;
    if (!behavior || typeof behavior !== "object") return null;
    const domain = String(behavior.domain || behavior.context || raw.relationshipDomain || "general").trim() || "general";
    const kind = String(behavior.kind || behavior.type || "observed-behavior").trim();
    const outcome = String(behavior.outcome || behavior.result || "unknown").trim();
    const promiseKept = behavior.promiseKept === true ? true : behavior.promiseKept === false ? false : null;
    return {
      domain,
      kind,
      outcome,
      promiseKept,
      expected: behavior.expected ?? null,
      actual: behavior.actual ?? null,
      observedAt: behavior.observedAt || item.provenance?.retrievedAt || nowIso(),
      evidenceClaimId: item.epistemicClaim?.claimId || item.id,
      evidenceChainId: evidenceChainKey(item)
    };
  }

  function buildCounterpartyIntelligence(items = [], options = {}) {
    const counterparties = new Map();
    const ensure = (actor) => {
      const key = counterpartyKey(actor || {});
      if (!key) return null;
      if (!counterparties.has(key)) {
        counterparties.set(key, {
          key,
          actor: clone(actor),
          claims: [],
          evidenceChains: new Set(),
          incentives: new Set(),
          contradictions: [],
          behavior: [],
          domains: new Map()
        });
      }
      return counterparties.get(key);
    };

    items.forEach((item) => {
      const claim = item.epistemicClaim || {};
      const actor = claim.actor;
      const profile = ensure(actor);
      if (!profile) return;
      const chainId = evidenceChainKey(item);
      profile.evidenceChains.add(chainId);
      (claim.incentives || []).forEach((value) => profile.incentives.add(String(value)));
      (claim.contradictions || []).forEach((value) => profile.contradictions.push(clone(value)));
      profile.claims.push({
        claimId: claim.claimId,
        statement: claim.statement,
        status: claim.status,
        confidence: claim.confidence,
        evidenceChainId: chainId,
        perspective: clone(claim.perspective || null),
        observedAt: claim.observedAt
      });
      const observation = normalizeBehaviorObservation(item);
      if (observation) {
        profile.behavior.push(observation);
        if (!profile.domains.has(observation.domain)) profile.domains.set(observation.domain, []);
        profile.domains.get(observation.domain).push(observation);
      }
    });

    const profiles = Array.from(counterparties.values()).map((profile) => {
      const contextualReliability = Array.from(profile.domains.entries()).map(([domain, observations]) => {
        const scored = observations.filter((entry) => entry.promiseKept !== null);
        const kept = scored.filter((entry) => entry.promiseKept === true).length;
        const missed = scored.filter((entry) => entry.promiseKept === false).length;
        return {
          domain,
          observations: observations.length,
          scoredCommitments: scored.length,
          commitmentsKept: kept,
          commitmentsMissed: missed,
          observedPattern: scored.length === 0 ? "insufficient-outcome-evidence" : missed === 0 ? "commitments-observed-kept" : kept === 0 ? "commitments-observed-missed" : "mixed-observed-performance",
          evidenceClaimIds: uniqueStrings(observations.map((entry) => entry.evidenceClaimId))
        };
      });
      const actorType = normalizeText(profile.actor?.type || "unknown");
      return {
        actor: clone(profile.actor),
        originContext: ["ai", "agent", "synthetic"].includes(actorType) ? "machine-or-synthetic" : actorType === "mixed" ? "mixed-human-machine" : actorType === "human" ? "human" : "unresolved",
        independentEvidenceChains: profile.evidenceChains.size,
        claimsObserved: profile.claims.length,
        claims: profile.claims,
        incentives: Array.from(profile.incentives),
        contradictions: profile.contradictions,
        contextualReliability,
        assessmentRule: "Assess counterparties by context-specific evidence, incentives, commitments, contradictions, and outcomes. Do not collapse a person or agent into a universal trust score.",
        deceptionRule: "Unreliable does not mean deceptive. Different perspective does not mean dishonest. Deception requires evidence beyond disagreement or error.",
        certainty: profile.behavior.length || profile.contradictions.length ? "evidence-bounded" : "insufficient-history"
      };
    });

    return {
      schema: COUNTERPARTY_INTELLIGENCE_SCHEMA,
      identityRule: "Maddy models counterparties as evolving evidence-grounded relationships, not static trust scores.",
      provenanceRule: "Repeated claims sharing one origin remain one evidentiary chain even when repeated by or about a counterparty.",
      counterparties: profiles,
      counterpartiesObserved: profiles.length,
      generatedAt: nowIso()
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
    const epistemicClaim = buildEpistemicClaim(item, index, evidenceClass, provenance);

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
      epistemicClaim,
      epistemicStatus: epistemicClaim.status,
      sourceIndependence: epistemicClaim.independence,
      freshness: epistemicClaim.freshness,
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
    const realityReconstruction = buildRealityReconstruction(normalized, subject, {
      hypotheses: input.hypotheses || options.hypotheses || [],
      discriminatingEvidence: input.discriminatingEvidence || options.discriminatingEvidence || []
    });

    const counterpartyIntelligence = buildCounterpartyIntelligence(normalized, input.counterparties || options.counterparties || {});

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
      epistemicClaims: normalized.map((item) => clone(item.epistemicClaim)),
      realityReconstruction,
      counterpartyIntelligence,
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

  function runEpistemicIdentityAcceptanceTest() {
    const result = prepare({
      subject: "Is Acme's market adoption claim independently established?",
      evidence: [
        {
          id: "acme-marketing",
          claim: "Acme serves 40,000 enterprise customers.",
          content: "Acme serves 40,000 enterprise customers.",
          sourceType: "company-marketing",
          authority: "working",
          confidence: 0.62,
          actor: { id: "acme", name: "Acme", type: "company" },
          originGroupId: "acme-press-release-2026",
          independent: false,
          incentives: ["increase perceived market adoption"],
          falsifiers: ["audited customer-count disclosure"]
        },
        {
          id: "affiliate-repeat",
          content: "Acme serves 40,000 enterprise customers.",
          sourceType: "external-marketing",
          authority: "working",
          confidence: 0.55,
          originGroupId: "acme-press-release-2026",
          independent: false,
          sourceLineage: [{ sourceId: "acme-marketing", relation: "repeats" }]
        },
        {
          id: "filing",
          content: "Acme reports 12,400 active enterprise accounts.",
          sourceType: "government-record",
          authority: "official",
          verified: true,
          confidence: 0.98,
          independent: true,
          contradictions: [{ claimId: "acme-marketing", relation: "materially-conflicts" }],
          validUntil: "2099-01-01T00:00:00.000Z"
        }
      ]
    });
    const marketing = result.allEvidence.find((item) => item.id === "acme-marketing");
    const affiliate = result.allEvidence.find((item) => item.id === "affiliate-repeat");
    const filing = result.allEvidence.find((item) => item.id === "filing");
    const checks = [
      { name: "Every evidence item carries the Maddy epistemic claim contract", passed: result.epistemicClaims.length === 3 && result.epistemicClaims.every((claim) => claim.schema === EPISTEMIC_SCHEMA) },
      { name: "Claims retain the asserting actor instead of becoming naked facts", passed: marketing?.epistemicClaim.actor?.name === "Acme" },
      { name: "Repeated marketing can be marked dependent on a shared origin", passed: marketing?.sourceIndependence.status === "dependent" && affiliate?.sourceIndependence.groupId === "acme-press-release-2026" },
      { name: "Source lineage survives normalization", passed: affiliate?.epistemicClaim.sourceLineage.some((entry) => entry.sourceId === "acme-marketing") === true },
      { name: "Contradictory evidence remains machine-readable", passed: filing?.epistemicClaim.contradictions.some((entry) => entry.claimId === "acme-marketing") === true },
      { name: "Incentive context remains attached to the claim", passed: marketing?.epistemicClaim.incentives.includes("increase perceived market adoption") === true },
      { name: "Falsifiers preserve what could change Maddy's belief", passed: marketing?.epistemicClaim.falsifiers.includes("audited customer-count disclosure") === true },
      { name: "Freshness/validity is carried as epistemic state", passed: filing?.freshness.validUntil === "2099-01-01T00:00:00.000Z" }
    ];
    return {
      success: checks.every((check) => check.passed),
      commission: "MADDY-EPISTEMIC-IDENTITY-CONTRACT",
      schema: "meos.executive-evidence-integrity.epistemic-identity-acceptance.v1",
      version: VERSION,
      buildId: BUILD_ID,
      passed: checks.filter((check) => check.passed).length,
      total: checks.length,
      checks,
      completedAt: nowIso()
    };
  }

  function runRealityReconstructionAcceptanceTest() {
    const result = prepare({
      subject: "What most likely happened at the bears' house?",
      hypotheses: [
        { id: "intentional-trespass", label: "Goldilocks knowingly entered an occupied home without permission", discriminators: ["contemporaneous statement showing she knew the home was occupied"] },
        { id: "lost-seeking-help", label: "Goldilocks was lost and entered believing the house was unoccupied while seeking help", discriminators: ["location history showing whether she was lost before arrival"] }
      ],
      evidence: [
        {
          id: "bear-account",
          claim: "The porridge was eaten and the house had been entered without our permission.",
          sourceType: "witness-statement",
          authority: "working",
          confidence: 0.84,
          actor: { id: "bear-family", name: "Bear family", type: "witness" },
          perspective: { role: "resident", vantage: "returned-after-event" },
          originGroupId: "bear-family-account",
          independent: false,
          hypothesisIds: ["intentional-trespass"],
          factKey: "porridge-eaten", factValue: true,
          falsifiers: ["evidence Goldilocks reasonably believed the house was abandoned"]
        },
        {
          id: "newspaper-repeat",
          claim: "Goldilocks knowingly trespassed and ate the bears' porridge.",
          sourceType: "news-summary",
          authority: "working",
          confidence: 0.7,
          originGroupId: "bear-family-account",
          independent: false,
          sourceLineage: [{ sourceId: "bear-account", relation: "repeats" }],
          hypothesisIds: ["intentional-trespass"]
        },
        {
          id: "goldilocks-account",
          claim: "I was lost, thought the house was empty, and went inside looking for help.",
          sourceType: "witness-statement",
          authority: "working",
          confidence: 0.78,
          actor: { id: "goldilocks", name: "Goldilocks", type: "witness" },
          perspective: { role: "visitor", vantage: "present-during-event" },
          independent: true,
          hypothesisIds: ["lost-seeking-help"],
          factKey: "porridge-eaten", factValue: true,
          falsifiers: ["contemporaneous statement showing she knew the home was occupied"]
        },
        {
          id: "door-sensor",
          claim: "The front door opened normally; no forced-entry alert was recorded.",
          sourceType: "device-record",
          authority: "verified",
          verified: true,
          confidence: 0.96,
          independent: true,
          observationKind: "instrument-record",
          factKey: "forced-entry", factValue: false,
          falsifiers: ["sensor integrity failure during the event window"]
        }
      ]
    });

    const reconstruction = result.realityReconstruction;
    const bearObservation = reconstruction.observations.find((item) => item.claimId === "bear-account");
    const goldilocksObservation = reconstruction.observations.find((item) => item.claimId === "goldilocks-account");
    const checks = [
      { name: "Reality Reconstruction is intrinsic to every prepared evidence package", passed: reconstruction?.schema === REALITY_RECONSTRUCTION_SCHEMA },
      { name: "Repeated telling from one origin collapses to one evidentiary chain", passed: reconstruction.apparentSources === 4 && reconstruction.independentEvidenceChains === 3 && reconstruction.collapsedDependentSources === 1 },
      { name: "Repetition is explicitly not treated as independent corroboration", passed: reconstruction.repetitionAnalysis.repetitionIsNotCorroboration === true },
      { name: "Competing narratives remain live when evidence does not justify certainty", passed: reconstruction.status === "unresolved-competing-explanations" && reconstruction.leadingHypothesis === null && reconstruction.hypotheses.length === 2 },
      { name: "Different perspectives survive reconstruction instead of being labeled deception", passed: bearObservation?.perspective?.role === "resident" && goldilocksObservation?.perspective?.role === "visitor" },
      { name: "Independent agreement can become explicit common ground", passed: reconstruction.commonGround.some((fact) => fact.factKey === "porridge-eaten" && fact.factValue === true && fact.independentChains >= 2) },
      { name: "Maddy actively preserves evidence that could disprove or distinguish stories", passed: reconstruction.antiConfirmationBias.active === true && reconstruction.discriminatingEvidence.includes("contemporaneous statement showing she knew the home was occupied") },
      { name: "Uncertainty is preserved rather than manufacturing a winner", passed: reconstruction.uncertaintyPreserved === true }
    ];

    return {
      success: checks.every((check) => check.passed),
      commission: "MADDY-REALITY-RECONSTRUCTION",
      schema: "meos.executive-evidence-integrity.reality-reconstruction-acceptance.v1",
      version: VERSION,
      buildId: BUILD_ID,
      passed: checks.filter((check) => check.passed).length,
      total: checks.length,
      checks,
      reconstruction: clone(reconstruction),
      completedAt: nowIso()
    };
  }

  function runCounterpartyIntelligenceAcceptanceTest() {
    const result = prepare({
      subject: "Should Maddy rely on Northstar Logistics' delivery representations?",
      evidence: [
        {
          id: "vendor-claim-1",
          claim: "Northstar Logistics says delivery normally takes five days.",
          actor: { id: "northstar", name: "Northstar Logistics", type: "organization", role: "vendor" },
          sourceType: "vendor-marketing",
          authority: "external",
          confidence: 0.72,
          originGroupId: "northstar-marketing",
          incentives: ["win-contract"],
          behaviorObservation: { domain: "delivery-estimates", kind: "commitment-outcome", outcome: "arrived-after-promised-window", promiseKept: false, expected: "5 days", actual: "12 days" }
        },
        {
          id: "vendor-claim-copy",
          claim: "Northstar Logistics delivers in five days.",
          actor: { id: "northstar", name: "Northstar Logistics", type: "organization", role: "vendor" },
          sourceType: "directory-copy",
          authority: "external",
          confidence: 0.65,
          originGroupId: "northstar-marketing",
          incentives: ["affiliate-referral"]
        },
        {
          id: "vendor-outcome-2",
          claim: "A later Northstar delivery arrived inside the promised seven-day window.",
          actor: { id: "northstar", name: "Northstar Logistics", type: "organization", role: "vendor" },
          sourceType: "institutional-outcome-record",
          authority: "verified-institutional",
          verified: true,
          confidence: 0.96,
          independent: true,
          behaviorObservation: { domain: "delivery-estimates", kind: "commitment-outcome", outcome: "arrived-as-promised", promiseKept: true, expected: "7 days", actual: "6 days" }
        },
        {
          id: "agent-claim",
          claim: "Procurement Agent A recommends Northstar based on the copied five-day claim.",
          actor: { id: "procurement-agent-a", name: "Procurement Agent A", type: "ai", role: "adviser" },
          sourceType: "agent-recommendation",
          authority: "external",
          confidence: 0.61,
          sourceLineage: [{ sourceId: "vendor-claim-copy", relation: "derived-from" }]
        }
      ]
    });
    const ci = result.counterpartyIntelligence;
    const vendor = ci.counterparties.find((entry) => entry.actor?.id === "northstar");
    const agent = ci.counterparties.find((entry) => entry.actor?.id === "procurement-agent-a");
    const delivery = vendor?.contextualReliability?.find((entry) => entry.domain === "delivery-estimates");
    const checks = [
      { name: "Counterparty Intelligence is intrinsic to prepared evidence packages", passed: ci?.schema === COUNTERPARTY_INTELLIGENCE_SCHEMA },
      { name: "Counterparty identity aggregates claims without inventing a separate trust engine", passed: vendor?.claimsObserved === 3 },
      { name: "Shared-origin repetition remains collapsed for counterparty evidence", passed: vendor?.independentEvidenceChains === 2 },
      { name: "Reliability is contextual rather than a universal trust score", passed: delivery?.observedPattern === "mixed-observed-performance" && !("trustScore" in vendor) },
      { name: "Promises and outcomes remain evidence-linked", passed: delivery?.commitmentsKept === 1 && delivery?.commitmentsMissed === 1 && delivery?.evidenceClaimIds?.length === 2 },
      { name: "Incentives are preserved without being treated as proof of deception", passed: vendor?.incentives?.includes("win-contract") && vendor?.deceptionRule?.includes("requires evidence") },
      { name: "Machine counterparties are explicitly represented when known", passed: agent?.originContext === "machine-or-synthetic" },
      { name: "Sparse counterparty history preserves uncertainty", passed: agent?.certainty === "insufficient-history" }
    ];
    return {
      success: checks.every((check) => check.passed),
      commission: "MADDY-COUNTERPARTY-INTELLIGENCE",
      schema: "meos.executive-evidence-integrity.counterparty-intelligence-acceptance.v1",
      version: VERSION,
      buildId: BUILD_ID,
      passed: checks.filter((check) => check.passed).length,
      total: checks.length,
      checks,
      counterpartyIntelligence: clone(ci),
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
    EPISTEMIC_SCHEMA,
    REALITY_RECONSTRUCTION_SCHEMA,
    COUNTERPARTY_INTELLIGENCE_SCHEMA,
    prepare,
    buildRealityReconstruction,
    buildCounterpartyIntelligence,
    classifyEvidence,
    recordCorrection,
    runSelfTest,
    runEpistemicIdentityAcceptanceTest,
    runRealityReconstructionAcceptanceTest,
    runCounterpartyIntelligenceAcceptanceTest,
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
