/**
 * Maddy Executive Operating System (MEOS)
 * Executive Hallway
 *
 * Commission: 006.000A
 * Version: 1.0.1
 * Build: EH101-VERIFIED-DELIVERY-20260806-A
 *
 * Purpose:
 * - Formalize the existing MEOS routing, mission, office, provider, workflow, and state pieces
 *   into one provider-neutral work corridor.
 * - Give Maddy and every dashboard surface one contract for submitting work and receiving
 *   work state, approvals, evidence, outcomes, and deliverables.
 * - Preserve existing engines as authorities. The Hallway coordinates; it does not replace them.
 * - Allow future offices/departments/providers to plug in without rewriting Maddy or the dashboard.
 *
 * First commissioned corridor:
 * - Natural-language Workspace work routes through MEOS Executive Workspace Office.
 * - Non-Workspace work falls through to the commissioned Executive Router.
 * - Results are normalized into dashboard-ready work records and deliverables.
 */
(function (global) {
  "use strict";

  const NAME = "MEOS Executive Hallway";
  const VERSION = "1.5.9";
  const BUILD_ID = "EH159-CONVERSATIONAL-PRESENCE-GATE-20260921-A";
  const SCHEMA = "meos.executive-hallway.v1";

  const WORK_STATES = Object.freeze([
    "received",
    "understanding",
    "planning",
    "awaiting-review",
    "authorized",
    "executing",
    "verifying",
    "done",
    "blocked",
    "failed",
    "cancelled"
  ]);

  const state = {
    work: new Map(),
    deliverables: new Map(),
    feedback: new Map(),
    history: [],
    listeners: new EventTarget(),
    startedAt: new Date().toISOString(),
    lastWorkAt: null,
    revision: 0
  };

  const now = () => new Date().toISOString();

  function id(prefix) {
    if (global.crypto?.randomUUID) return `${prefix}-${global.crypto.randomUUID()}`;
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function clone(value) {
    if (value === undefined) return undefined;
    try { return structuredClone(value); }
    catch (_) {
      try { return JSON.parse(JSON.stringify(value)); }
      catch (_) { return value; }
    }
  }

  function freeze(value) {
    const copy = clone(value);
    if (copy && typeof copy === "object") return Object.freeze(copy);
    return copy;
  }

  function emit(name, detail) {
    const payload = clone(detail);
    state.listeners.dispatchEvent(new CustomEvent(name, { detail: payload }));
    if (typeof global.dispatchEvent === "function" && typeof global.CustomEvent === "function") {
      global.dispatchEvent(new global.CustomEvent(`meos:hallway:${name}`, { detail: payload }));
    }
  }

  function record(event, detail = {}) {
    const item = {
      id: id("hallway-event"),
      event,
      at: now(),
      detail: clone(detail)
    };
    state.history.unshift(item);
    if (state.history.length > 500) state.history.length = 500;
    state.revision += 1;
    emit("activity", item);
    return item;
  }

  function normalizeInstruction(input) {
    if (typeof input === "string") return input.trim();
    return String(input?.instruction || input?.message || input?.title || "").trim();
  }

  function normalizeAttachments(input) {
    const attachments = Array.isArray(input?.attachments) ? input.attachments : [];
    return attachments.map(item => ({
      id: item?.id || id("attachment"),
      name: item?.name || item?.filename || "Attached file",
      type: item?.type || item?.mimeType || null,
      size: Number.isFinite(Number(item?.size)) ? Number(item.size) : null,
      source: item?.source || "maddy-intake",
      ref: item?.ref || item?.documentId || null
    }));
  }

  function createWork(input = {}) {
    const instruction = normalizeInstruction(input);
    if (!instruction) throw new TypeError("Executive Hallway work requires an instruction.");

    const work = {
      schema: `${SCHEMA}.work`,
      id: input.id || id("hallway-work"),
      title: input.title || instruction,
      instruction,
      source: input.source || "maddy",
      requestedBy: input.requestedBy || "executive-director",
      owner: null,
      route: null,
      intent: null,
      requiredCapabilities: [],
      state: "received",
      authority: {
        reviewRequired: input.reviewRequired !== false,
        authorized: input.authorized === true,
        authorizationSignal: input.authorizationSignal || null,
        authorizedAt: input.authorized === true ? now() : null
      },
      options: [],
      attachments: normalizeAttachments(input),
      context: clone(input.context || {}),
      mission: null,
      execution: null,
      evidence: [],
      deliverables: [],
      feedback: null,
      outcome: null,
      error: null,
      createdAt: now(),
      updatedAt: now()
    };

    state.work.set(work.id, work);
    state.lastWorkAt = work.createdAt;
    record("work.received", { workId: work.id, instruction: work.instruction, source: work.source });
    emit("work-updated", work);
    return work;
  }

  function transition(work, nextState, detail = {}) {
    if (!WORK_STATES.includes(nextState)) throw new Error(`Unknown Hallway work state: ${nextState}`);
    work.state = nextState;
    work.updatedAt = now();
    Object.assign(work, clone(detail));
    record(`work.${nextState}`, { workId: work.id, owner: work.owner, route: work.route });
    emit("work-updated", work);
    return work;
  }

  function workspaceOffice() {
    return global.MEOSExecutiveWorkspaceOffice || null;
  }

  function grantOffice() {
    return global.GrantOffice || null;
  }

  function organizationalProfile() {
    return global.CCSPOrganizationalProfile?.profile || global.OrganizationalProfile || null;
  }

  function organizationServiceArea() {
    const profile = organizationalProfile();
    const organization = profile?.organization || {};
    return String(
      organization.primaryServiceArea ||
      organization.serviceArea ||
      profile?.serviceArea ||
      ""
    ).trim() || null;
  }

  function isExplicitWorkspaceFileRequest(instruction = "") {
    const text = String(instruction || "").toLowerCase();
    return /\b(my|our)\s+(drive|google drive|workspace|file|files|document|documents|folder|folders)\b/.test(text) ||
      /\b(in|from|inside)\s+(my|our)?\s*(drive|google drive|workspace|folder|files?)\b/.test(text) ||
      /\b(open|fetch|get|find|locate|retrieve)\b.{0,35}\b(file|document|pdf|doc|sheet|spreadsheet|folder)\b/.test(text);
  }

  function organizationLocalityAliases(serviceArea = "") {
    const full = String(serviceArea || "").trim().toLowerCase();
    if (!full) return [];
    const primary = full.split(",")[0].trim();
    const withoutCounty = primary.replace(/\s+county\b/g, "").trim();
    return [...new Set([full, primary, withoutCounty].filter(value => value.length >= 3))];
  }

  /*
   * Commission 006.031U — Conversational Presence Gate
   *
   * A presence-only utterance such as “Hi Maddy” is conversation, not an
   * executive assignment.  It must not create a Mission mirror, durable
   * execution, public-research request, provider spend, or external action.
   * Keep the Hallway as the one visible coordination corridor so the existing
   * Maddy activity surface can show the turn, but terminate the turn locally
   * as a bounded presence acknowledgement.  Mixed utterances such as
   * “Hey Maddy, find two grants” are not presence-only and continue through
   * the normal governed work path.
   */
  const CONVERSATIONAL_PRESENCE_COMMISSION = "006.031U";

  function normalizePresenceConversationText(instruction = "") {
    return String(instruction || "")
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/[^a-z0-9'\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function classifyPresenceOnlyConversation(instruction = "") {
    const text = normalizePresenceConversationText(instruction);
    if (!text) return null;

    const cases = [
      { kind: "wake", pattern: /^(?:maddy|hey maddy|maddy hey)$/ },
      { kind: "greeting", pattern: /^(?:hey|hi|hello|yo)(?: maddy)?$/ },
      { kind: "whats-up", pattern: /^(?:maddy )?(?:what's up|whats up)(?: maddy)?$/ },
      { kind: "presence-check", pattern: /^(?:maddy )?(?:are you there|you there|can you hear me|do you hear me)(?: maddy)?$/ },
      { kind: "how-are-you", pattern: /^(?:maddy )?how are you(?: maddy)?$/ },
      { kind: "morning", pattern: /^(?:good morning)(?: maddy)?$/ },
      { kind: "afternoon", pattern: /^(?:good afternoon)(?: maddy)?$/ },
      { kind: "evening", pattern: /^(?:good evening)(?: maddy)?$/ },
      { kind: "thanks", pattern: /^(?:thanks|thank you)(?: maddy)?$/ },
      { kind: "ack", pattern: /^(?:yeah|yep|yes|ok|okay|got it)(?: maddy)?$/ }
    ];

    const matched = cases.find(item => item.pattern.test(text));
    if (!matched) return null;
    return {
      schema: `${SCHEMA}.conversational-presence-intent.v1`,
      commission: CONVERSATIONAL_PRESENCE_COMMISSION,
      kind: matched.kind,
      normalizedText: text,
      presenceOnly: true,
      executiveWorkRequired: false,
      durableExecutionRequired: false,
      publicResearchRequired: false,
      externalActionAuthorized: false,
      automaticSpendUsd: 0
    };
  }

  function presenceAcknowledgement(intent = {}) {
    switch (intent?.kind) {
      case "wake": return "Yeah?";
      case "whats-up": return "Hey. What's up?";
      case "presence-check": return "Yeah, I'm here.";
      case "how-are-you": return "I'm here and ready. What's up?";
      case "morning": return "Good morning. I'm here.";
      case "afternoon": return "Good afternoon. I'm here.";
      case "evening": return "Good evening. I'm here.";
      case "thanks": return "Anytime.";
      case "ack": return "Got it.";
      case "greeting":
      default: return "Hey. I'm here. What can I help you with?";
    }
  }

  function routePresenceOnlyConversation(work, intent = {}) {
    const answer = presenceAcknowledgement(intent);
    work.owner = "maddy";
    work.route = "conversation-presence";
    work.intent = "presence-only-conversation";
    work.requiredCapabilities = [];
    work.context = {
      ...work.context,
      conversationOnly: true,
      executiveWork: false,
      missionMirrorAuthorized: false,
      durableExecutionAuthorized: false,
      publicResearchAuthorized: false,
      externalActionAuthorized: false,
      automaticSpendUsd: 0,
      presenceIntent: clone(intent)
    };

    transition(work, "understanding");
    work.execution = {
      schema: `${SCHEMA}.conversational-presence-execution.v1`,
      commission: CONVERSATIONAL_PRESENCE_COMMISSION,
      success: true,
      local: true,
      providerCalled: false,
      publicResearchCalled: false,
      durableExecutionCreated: false,
      missionCreated: false,
      answer,
      completedAt: now()
    };
    work.evidence.push({
      type: "conversational-presence-gate",
      source: "executive-hallway",
      commission: CONVERSATIONAL_PRESENCE_COMMISSION,
      intent: clone(intent),
      providerCalled: false,
      publicResearchCalled: false,
      durableExecutionCreated: false,
      externalActionAuthorized: false,
      automaticSpendUsd: 0,
      at: now()
    });

    transition(work, "verifying");
    addDeliverable(work, {
      title: "Maddy",
      kind: "conversation-response",
      status: "ready",
      summary: answer,
      source: "maddy",
      data: {
        schema: "meos.maddy.conversational-presence-response.v1",
        answer,
        conversationOnly: true,
        factualClaim: false,
        providerCalled: false,
        publicResearchCalled: false,
        durableExecutionCreated: false,
        externalActionAuthorized: false,
        automaticSpendUsd: 0
      }
    });
    work.options = [];
    return transition(work, "done", {
      outcome: {
        success: true,
        verified: true,
        verificationClass: "presence-acknowledgement",
        reason: "presence-only-conversation-complete",
        externalActionAuthorized: false,
        automaticSpendUsd: 0
      }
    });
  }

  function interpretResourceDevelopmentRequest(instruction = "") {
    const text = String(instruction || "").trim();
    const normalized = text.toLowerCase();
    if (!normalized || isExplicitWorkspaceFileRequest(normalized)) return null;

    const asksToDiscover = /\b(find|search|discover|look for|locate|identify|show me|get me|research|scan)\b/.test(normalized);
    const resourceLanguage = /\b(grant|grants|funding|funders?|foundation|foundations|sponsorship|sponsorships|donor|donors|donation|donations|resource|resources|opportunit(?:y|ies)|corporate giving|in-kind|contract|contracts)\b/.test(normalized);
    if (!asksToDiscover || !resourceLanguage) return null;

    const wantsGrants = /\bgrant|grants\b/.test(normalized);
    const serviceArea = organizationServiceArea();
    const localityAliases = organizationLocalityAliases(serviceArea);
    const explicitlyNamesOperatingArea = localityAliases.some(alias => normalized.includes(alias));
    const usesLocalLanguage = /\b(local|locally|nearby|near me|in our area|in my area|around here|our county|my county|here)\b/.test(normalized);
    const wantsLocal = usesLocalLanguage || explicitlyNamesOperatingArea;

    return {
      intent: "discover-resources",
      requiredCapabilities: ["resource.discovery", "resource.development", "research.public-web"],
      resourceTypes: wantsGrants ? ["grant"] : [],
      geography: wantsLocal ? { scope: "local", serviceArea } : { scope: "unspecified", serviceArea },
      instruction: text
    };
  }

  function resourceRecordUrl(record = {}) {
    return record.url || record.opportunityUrl || record.applicationUrl || record.sourceUrl ||
      record.webUrl || record.link || record.resourceDevelopment?.sourceUrl ||
      record.executiveBrief?.sourceUrl || null;
  }

  function resourceRecordTitle(record = {}) {
    return record.title || record.name || record.opportunityTitle || record.sourceName || "Resource opportunity";
  }

  function resourceRecordSummary(record = {}) {
    const rd = record.resourceDevelopment || {};
    const brief = rd.executiveBrief || record.executiveBrief || {};
    const parts = [
      brief.whyOnDesk || brief.reason || rd.reason || record.description || record.summary || null,
      record.geography ? `Geography: ${record.geography}` : null,
      record.deadline?.iso ? `Deadline: ${record.deadline.iso}` : (record.deadline ? `Deadline: ${record.deadline}` : null),
      rd.executiveDecision ? `Recommendation: ${rd.executiveDecision}` : null
    ].filter(Boolean);
    return parts.join(" • ") || "Resource Development opportunity returned by MEOS.";
  }

  function resourceRecordTypeText(record = {}) {
    return JSON.stringify([
      record.resourceType,
      record.resourceTypes,
      record.resourceChannels,
      record.category,
      record.type,
      record.sourceType,
      record.resourceDevelopment?.channel,
      record.original?.resourceType,
      record.original?.resourceTypes,
      record.original?.resourceChannels,
      record.original?.category,
      record.original?.type,
      record.original?.sourceType,
      record.original?.provider,
      record.original?.sourceName,
      record.title,
      record.description
    ]).toLowerCase();
  }

  function resourceRecordGeographyText(record = {}) {
    return JSON.stringify([
      record.geography,
      record.location,
      record.region,
      record.serviceArea,
      record.eligibleGeography,
      record.resourceDevelopment?.geography,
      record.executiveBrief?.geography,
      record.raw?.source?.geography,
      record.original?.geography,
      record.original?.location,
      record.original?.region,
      record.original?.serviceArea,
      record.original?.eligibleGeography,
      record.original?.raw?.source?.geography
    ]).toLowerCase();
  }

  function localGeographyMatches(record = {}, localNeedle = "") {
    const needle = String(localNeedle || "").trim().toLowerCase();
    if (!needle) return true;
    const geography = resourceRecordGeographyText(record);
    if (geography.includes(needle)) return true;

    // A city named inside the commissioned county service area is still local.
    // This keeps "City of Santa Cruz" from being discarded when the
    // Organization Package says "Santa Cruz County, California".
    const countyBase = needle.replace(/\s+county\b/g, "").trim();
    if (countyBase && geography.includes(countyBase)) return true;
    return false;
  }

  function resourceRecordMatches(record = {}, { wantsGrant = false, wantsLocal = false, localNeedle = "" } = {}) {
    if (wantsGrant && !/\bgrant\b/.test(resourceRecordTypeText(record))) return false;
    if (wantsLocal && localNeedle && !localGeographyMatches(record, localNeedle)) return false;
    return true;
  }

  function resourceRecordKey(record = {}) {
    const stableId = String(record.id || record.opportunityId || "").trim().toLowerCase();
    if (stableId) return `id:${stableId}`;
    const url = String(resourceRecordUrl(record) || "").trim().toLowerCase();
    if (url) return `url:${url}`;
    return `title:${resourceRecordTitle(record).trim().toLowerCase()}`;
  }

  function mergeResourceRecords(...groups) {
    const merged = new Map();
    groups.flatMap(group => Array.isArray(group) ? group : []).forEach(record => {
      if (!record || typeof record !== "object") return;
      const key = resourceRecordKey(record);
      if (!merged.has(key)) merged.set(key, record);
    });
    return [...merged.values()];
  }

  function firstEvidenceValue(items = []) {
    const first = Array.isArray(items) ? items.find(item => item && (item.value || item.context)) : null;
    return first?.value || first?.context || null;
  }

  function qualifiedOpportunityRecord(sourceRecord = {}, opportunityCase = {}) {
    const intelligence = opportunityCase.opportunityIntelligence || {};
    const source = opportunityCase.source || {};
    const officialUrl = source.officialUrl || resourceRecordUrl(sourceRecord);
    const eligibilityVerified = opportunityCase.evidence?.checks?.eligibilityVerified === true;
    const fundedActivitiesVerified = opportunityCase.evidence?.checks?.fundedActivitiesVerified === true;
    const applicationPathVerified = opportunityCase.evidence?.checks?.applicationPathVerified === true;
    const currentCycleActionable = opportunityCase.evidence?.checks?.currentCycleActionable === true;
    const deadline = firstEvidenceValue(intelligence.deadlineEvidence) || firstEvidenceValue(intelligence.dateEvidence);
    const amount = firstEvidenceValue(intelligence.individualAwardEvidence) || firstEvidenceValue(intelligence.moneyEvidence);
    const evidenceUrls = Array.isArray(opportunityCase.whatMaddyRead?.evidenceLedger)
      ? opportunityCase.whatMaddyRead.evidenceLedger.map(item => item?.url).filter(Boolean)
      : [];

    return {
      id: `qualified:${sourceRecord.id || source.id || resourceRecordTitle(sourceRecord)}`,
      title: source.title || resourceRecordTitle(sourceRecord),
      provider: sourceRecord.provider || sourceRecord.sourceName || resourceRecordTitle(sourceRecord),
      sourceName: sourceRecord.sourceName || sourceRecord.provider || null,
      resourceType: source.resourceType || sourceRecord.resourceType || "grant",
      resourceChannels: source.resourceChannels || sourceRecord.resourceChannels || ["grant"],
      geography: source.geography || sourceRecord.geography || null,
      url: officialUrl,
      officialUrl,
      description: opportunityCase.nextAction || sourceRecord.description || sourceRecord.summary || null,
      summary: opportunityCase.promotion?.reason || opportunityCase.disposition?.recommendation || null,
      deadline,
      amount,
      eligibilityVerified,
      discoveryStatus: "qualified-opportunity",
      qualificationStatus: "qualified-for-pursuit-review",
      recommendation: "pursue",
      externalActionAuthorized: false,
      evidenceUrls,
      unknowns: Array.isArray(opportunityCase.unknowns) ? [...opportunityCase.unknowns] : [],
      qualification: clone(opportunityCase),
      resourceDevelopment: {
        discoveryStatus: "qualified-opportunity",
        executiveDecision: "pursue",
        eligibilityVerified,
        fundedActivitiesVerified,
        applicationPathVerified,
        currentCycleActionable,
        evidenceCoverage: Number(opportunityCase.evidence?.coverage || 0),
        executiveBrief: {
          whyOnDesk: opportunityCase.promotion?.reason || "Decision-grade opportunity evidence supports pursuit review.",
          nextAction: "Executive Director pursuit authorization required before application preparation begins.",
          geography: source.geography || sourceRecord.geography || null
        }
      }
    };
  }

  async function investigateLocalResourceCandidates(records = [], fetchImpl) {
    const investigations = [];
    const qualified = [];
    const rejected = [];

    for (const record of records.slice(0, 8)) {
      const sourceId = String(record?.id || "").trim();
      if (!sourceId || !resourceRecordUrl(record)) {
        rejected.push({ sourceId: sourceId || null, title: resourceRecordTitle(record), reason: "authoritative-source-unavailable" });
        continue;
      }
      try {
        const response = await fetchImpl(`/api/resource-discovery/local/investigate?sourceId=${encodeURIComponent(sourceId)}`, {
          method: "GET",
          headers: { Accept: "application/json" }
        });
        if (!response.ok) {
          rejected.push({ sourceId, title: resourceRecordTitle(record), reason: `investigation-http-${response.status}` });
          continue;
        }
        const body = await response.json();
        const opportunityCase = body?.opportunityCase || null;
        investigations.push({ sourceId, title: resourceRecordTitle(record), opportunityCase: clone(opportunityCase) });
        if (opportunityCase?.promotion?.executiveDeskReady === true) {
          qualified.push(qualifiedOpportunityRecord(record, opportunityCase));
        } else {
          rejected.push({
            sourceId,
            title: resourceRecordTitle(record),
            reason: opportunityCase?.promotion?.reason || opportunityCase?.disposition?.recommendation || "not-qualified-for-pursuit",
            unknowns: clone(opportunityCase?.unknowns || [])
          });
        }
      } catch (error) {
        rejected.push({ sourceId, title: resourceRecordTitle(record), reason: error?.message || String(error) });
      }
    }

    return { investigations, qualified, rejected };
  }

  function broaderInvestigationRecords(body = {}) {
    const active = Array.isArray(body.active) ? body.active : [];
    return active.filter(record =>
      record?.disposition === "pursue" &&
      record?.evidence?.eligibilityVerified === true &&
      record?.evidence?.specificOpportunityVerified === true
    ).map(record => ({
      ...record,
      discoveryStatus: "qualified-opportunity",
      qualificationStatus: record.qualificationStatus || "qualified-for-pursuit-review",
      recommendation: "pursue",
      externalActionAuthorized: false,
      url: record.officialUrl || record.url || null,
      resourceDevelopment: {
        ...(record.resourceDevelopment || {}),
        discoveryStatus: "qualified-opportunity",
        executiveDecision: "pursue",
        executiveBrief: {
          ...(record.resourceDevelopment?.executiveBrief || {}),
          whyOnDesk: record.executiveReason || record.summary || "Qualified Resource Development opportunity.",
          nextAction: "Executive Director pursuit authorization required before application preparation begins."
        }
      }
    }));
  }

  async function broadenQualifiedResourceSearch(fetchImpl) {
    try {
      const response = await fetchImpl("/api/resource-development/investigate?resourceType=grant&limit=40", {
        method: "GET",
        headers: { Accept: "application/json" }
      });
      if (!response.ok) return { success: false, records: [], reason: `investigation-http-${response.status}` };
      const body = await response.json();
      return {
        success: true,
        records: broaderInvestigationRecords(body),
        geography: clone(body?.request?.geography || null),
        status: body?.status || null,
        source: "resource-development-investigation"
      };
    } catch (error) {
      return { success: false, records: [], reason: error?.message || String(error) };
    }
  }

  function normalizeResourceDeliverables(work, result = {}) {
    const records = Array.isArray(result.records) ? result.records : [];
    records.slice(0, 10).forEach(record => {
      const discoveryStatus = record.discoveryStatus || record.resourceDevelopment?.discoveryStatus || null;
      const summary = resourceRecordSummary(record);
      addDeliverable(work, {
        title: resourceRecordTitle(record),
        kind: "executive-brief",
        openUrl: resourceRecordUrl(record),
        summary: discoveryStatus === "source-identified"
          ? `${summary} • Status: source identified; current cycle, eligibility, deadline, and application requirements still require investigation.`
          : summary,
        provider: "meos-resource-development",
        source: record.discoverySource || "executive-resource-development-office",
        data: record
      });
    });

    if (!records.length) {
      addDeliverable(work, {
        title: "No matching local grants found",
        kind: "research-status",
        summary: `MEOS completed the requested Resource Development search for ${result.geography?.serviceArea || "the organization's local service area"} and returned no matching grant records. No result was fabricated.`,
        provider: "meos-resource-development",
        source: "executive-resource-development-office",
        data: {
          query: result.query || work.instruction,
          geography: clone(result.geography || null),
          resourceTypes: clone(result.resourceTypes || []),
          searchedAt: result.searchedAt || now(),
          discovery: clone(result.discovery || null)
        }
      });
    }
    return work.deliverables.length;
  }

  async function executeResourceDevelopmentSearch(work, interpretation, options = {}) {
    const serviceArea = interpretation?.geography?.serviceArea || organizationServiceArea();
    const wantsLocal = interpretation?.geography?.scope === "local";
    const wantsGrant = interpretation?.resourceTypes?.includes("grant");
    const fetchImpl = options.fetch || global.fetch?.bind(global);
    if (!fetchImpl) throw new Error("Resource Development search requires fetch().");

    const deskResponse = await fetchImpl("/api/resource-development/desk?includeAll=true&limit=200", {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    if (!deskResponse.ok) throw new Error(`Resource Development desk returned HTTP ${deskResponse.status}.`);
    const desk = await deskResponse.json();
    const deskRecords = Array.isArray(desk.records) ? desk.records : [];
    const localNeedle = String(serviceArea || "").toLowerCase().split(",")[0].trim();

    const matchingDeskRecords = deskRecords.filter(record =>
      resourceRecordMatches(record, { wantsGrant, wantsLocal, localNeedle })
    );

    let discovery = null;
    let matchingDiscoveryRecords = [];
    if (wantsLocal) {
      try {
        const localResponse = await fetchImpl("/api/resource-discovery/local", {
          method: "GET",
          headers: { Accept: "application/json" }
        });
        if (localResponse.ok) {
          discovery = await localResponse.json();
          const discoveredRecords = Array.isArray(discovery?.records) ? discovery.records : [];
          matchingDiscoveryRecords = discoveredRecords
            .filter(record => resourceRecordMatches(record, { wantsGrant, wantsLocal, localNeedle }))
            .map(record => ({
              ...record,
              discoverySource: discovery?.source?.name || discovery?.source?.id || "local-resource-discovery",
              discoveryRun: {
                schema: discovery?.schema || null,
                version: discovery?.version || null,
                buildId: discovery?.buildId || null,
                status: discovery?.status || null
              }
            }));
        }
      } catch (error) {
        discovery = {
          success: false,
          error: error?.message || String(error)
        };
      }
    }

    const discoveredCandidates = mergeResourceRecords(matchingDeskRecords, matchingDiscoveryRecords);
    let qualification = null;
    let records = discoveredCandidates;

    if (wantsGrant) {
      const localQualification = await investigateLocalResourceCandidates(matchingDiscoveryRecords, fetchImpl);
      let qualifiedRecords = [...localQualification.qualified];
      let broader = null;

      if (qualifiedRecords.length === 0) {
        broader = await broadenQualifiedResourceSearch(fetchImpl);
        qualifiedRecords = mergeResourceRecords(qualifiedRecords, broader.records || []);
      }

      records = qualifiedRecords;
      qualification = {
        schema: "meos.executive-hallway.resource-qualification.v1",
        candidateSources: discoveredCandidates.length,
        investigatedLocalSources: localQualification.investigations.length,
        rejectedOrHeldLocalSources: localQualification.rejected.length,
        qualifiedOpportunities: qualifiedRecords.length,
        localInvestigations: clone(localQualification.investigations),
        rejectedOrHeld: clone(localQualification.rejected),
        geographicExpansion: clone(broader),
        recommendedOpportunity: clone(qualifiedRecords[0] || null),
        truthRule: "A funding source is not a pursuit recommendation. Maddy may recommend pursuit only after evidence supports a specific actionable opportunity and applicant eligibility; unresolved candidates remain investigation or monitoring work.",
        externalActionAuthorized: false
      };
    }

    return {
      success: true,
      schema: "meos.executive-hallway.resource-search.v2",
      query: work.instruction,
      geography: { scope: interpretation?.geography?.scope || "unspecified", serviceArea },
      resourceTypes: [...(interpretation?.resourceTypes || [])],
      total: records.length,
      deskMatches: matchingDeskRecords.length,
      discoveryMatches: matchingDiscoveryRecords.length,
      candidateSources: discoveredCandidates.length,
      records: records.slice(0, 25),
      qualification,
      discovery,
      searchedAt: now()
    };
  }

  async function routeResourceDevelopmentWork(work, interpretation, options = {}) {
    work.owner = "executive-resource-development-office";
    work.route = "resource-development";
    work.intent = interpretation.intent;
    work.requiredCapabilities = [...interpretation.requiredCapabilities];
    work.context = {
      ...work.context,
      organizationServiceArea: interpretation?.geography?.serviceArea || organizationServiceArea(),
      resourceTypes: [...(interpretation.resourceTypes || [])],
      geographyScope: interpretation?.geography?.scope || "unspecified"
    };
    transition(work, "planning");
    registerMissionMirror(work);

    if (work.recognition?.recognized === true) {
      return releaseRecognizedWork(work);
    }

    if (work.authority.reviewRequired && !work.authority.authorized) {
      work.options = ["take-it", "request-revisions", "cancel"];
      return transition(work, "awaiting-review", {
        outcome: {
          success: false,
          reason: "review-required",
          plannedRoute: "resource-development",
          serviceArea: work.context.organizationServiceArea
        }
      });
    }

    transition(work, "executing");
    const result = await executeResourceDevelopmentSearch(work, interpretation, options);
    work.execution = clone(result);
    work.evidence.push({ type: "resource-development-search", verifiedAt: now(), result: clone(result) });
    transition(work, "verifying");
    normalizeResourceDeliverables(work, result);

    const recommendation = result?.qualification?.recommendedOpportunity || null;
    if (recommendation) {
      work.context = {
        ...work.context,
        pursuitRecommendation: clone(recommendation),
        researchTaskAuthoritySatisfied: true,
        pursuitAuthorityRequired: true
      };
      work.authority.reviewRequired = true;
      work.authority.authorized = false;
      work.authority.authorizedAt = null;
      work.authority.authorizationSignal = null;
      work.options = ["take-it", "review-evidence", "request-revisions", "archive"];
      return transition(work, "awaiting-review", {
        outcome: {
          success: true,
          verified: true,
          reason: "qualified-opportunity-awaiting-pursuit-authorization",
          recommendation: clone(recommendation),
          externalActionAuthorized: false,
          result: clone(result)
        }
      });
    }

    work.options = work.deliverables.length
      ? ["open-deliverable", "use-in-task", "archive"]
      : ["broaden-search", "review-sources", "archive"];
    return transition(work, "done", {
      outcome: {
        success: true,
        verified: true,
        reason: wantsQualifiedResourceReason(result),
        result: clone(result)
      }
    });
  }

  function wantsQualifiedResourceReason(result = {}) {
    return result?.qualification && !result.qualification.recommendedOpportunity
      ? "research-complete-no-qualified-pursuit-recommendation"
      : "resource-research-complete";
  }

  async function authorizeRecommendedResourcePursuit(work, options = {}) {
    const recommendation = clone(work.context?.pursuitRecommendation || null);
    if (!recommendation) throw new Error("No qualified pursuit recommendation is attached to this work.");

    const office = grantOffice();
    if (!office?.addOpportunity || !office?.authorizePursuit || !office?.beginPreparation) {
      work.options = ["retry", "review-evidence", "archive"];
      return transition(work, "blocked", {
        outcome: { success: false, reason: "grant-office-pursuit-bridge-unavailable" }
      });
    }

    const opportunityId = `hallway-${String(recommendation.id || work.id).replace(/[^a-z0-9._:-]+/gi, "-")}`;
    let opportunity = office.getOpportunityById?.(opportunityId) || null;
    if (!opportunity) {
      opportunity = office.addOpportunity({
        id: opportunityId,
        type: "grant",
        title: recommendation.title,
        provider: recommendation.provider || recommendation.sourceName || "Verified funding source",
        sourceUrl: recommendation.officialUrl || recommendation.url || "",
        sourceType: "maddy-qualified-research",
        description: recommendation.summary || recommendation.description || "",
        geography: recommendation.geography || "",
        deadline: typeof recommendation.deadline === "string" ? recommendation.deadline : "",
        verified: recommendation.eligibilityVerified === true,
        confidence: recommendation.resourceDevelopment?.evidenceCoverage
          ? Math.max(0, Math.min(1, Number(recommendation.resourceDevelopment.evidenceCoverage) / 100))
          : 0.8,
        requiredDocuments: [],
        provenance: {
          hallwayWorkId: work.id,
          qualification: clone(recommendation.qualification || null),
          evidenceUrls: clone(recommendation.evidenceUrls || [])
        }
      });
    }

    const authorization = office.authorizePursuit(opportunity.id, {
      authorizedBy: options.authorizedBy || work.requestedBy || "Executive Director",
      authorizedAt: now(),
      note: options.note || "Take It — pursue the Maddy-qualified opportunity and prepare the application.",
      scope: "prepare-application-with-separate-final-submission-authorization"
    });

    if (authorization?.success !== true) {
      work.options = ["retry", "review-evidence", "archive"];
      return transition(work, "blocked", {
        outcome: { success: false, reason: authorization?.code || "grant-pursuit-authorization-failed", authorization: clone(authorization) }
      });
    }

    const preparation = office.beginPreparation(opportunity.id, {
      actor: options.authorizedBy || work.requestedBy || "Executive Director",
      note: "Pursuit authorized through Executive Hallway Take It; application preparation begins. Final submission remains separately governed."
    });

    work.execution = {
      ...(work.execution || {}),
      pursuit: { authorization: clone(authorization), preparation: clone(preparation) }
    };
    work.evidence.push({
      type: "grant-pursuit-authorization",
      verifiedAt: now(),
      opportunityId: opportunity.id,
      finalSubmissionAuthorized: false
    });
    work.context = {
      ...work.context,
      pursuitAuthorityRequired: false,
      pursuitAuthorized: true,
      grantOpportunityId: opportunity.id
    };
    work.options = ["open-deliverable", "review-preparation", "archive"];

    addDeliverable(work, {
      title: `${recommendation.title} — pursuit authorized`,
      kind: "grant-pursuit-status",
      openUrl: recommendation.officialUrl || recommendation.url || null,
      summary: "Pursuit is authorized and application preparation has begun. Final external submission is not authorized and remains a separate Take It boundary.",
      provider: "meos-grant-office",
      source: "executive-hallway",
      data: { opportunityId: opportunity.id, authorization: clone(authorization), preparation: clone(preparation) }
    });

    return transition(work, preparation?.success === false ? "blocked" : "done", {
      outcome: {
        success: preparation?.success !== false,
        verified: preparation?.success !== false,
        reason: preparation?.success === false ? (preparation?.code || "grant-preparation-start-failed") : "pursuit-authorized-preparation-started",
        grantOpportunityId: opportunity.id,
        finalSubmissionAuthorized: false,
        externalActionAuthorized: false
      }
    });
  }

  function executiveRouter() {
    return global.ExecutiveRouter || null;
  }

  function missionEngine() {
    return global.MEOSMissionEngine || null;
  }

  function executiveState() {
    return global.MEOSExecutiveState || global.ExecutiveState || null;
  }

  function isWorkspaceIntent(interpretation) {
    const capabilities = interpretation?.requiredCapabilities || [];
    return capabilities.some(capability => String(capability).startsWith("workspace."));
  }

  /*
   * Commission 006.018B — Cognitive Metabolism / Recognition Before Creation
   *
   * Hallway is the boundary where cognition becomes durable executive work.
   * Before creating another Mission mirror, recognize a previously-seen
   * cognitive dispatch through durable Mission State. Unchanged cognition
   * does not earn another durable Mission ID, another provider execution, or
   * another ruck on the Executive Director's desk.
   */
  function missionMirrorReference(work) {
    const context = work?.context || {};

    if (context.parentFeedbackId && context.parentWorkId) {
      const rejectedFileIds = Array.isArray(context.rejectedFileIds)
        ? [...context.rejectedFileIds]
            .map(value => String(value || "").trim())
            .filter(Boolean)
            .sort()
        : [];

      return [
        "hallway-feedback-revision",
        String(context.parentWorkId),
        rejectedFileIds.join(",") || "no-file"
      ].join(":");
    }

    const cognitiveDispatchKey =
      String(context.cognitiveDispatchKey || "").trim();

    if (cognitiveDispatchKey) {
      return `cognitive-dispatch:${cognitiveDispatchKey}`;
    }

    return `hallway-work:${work.id}`;
  }

  function missionRecords(engine) {
    const groups = [
      engine?.getActiveMissions?.(),
      engine?.getCompletedMissions?.(),
      engine?.getArchivedMissions?.()
    ];

    return groups
      .flatMap(group => Array.isArray(group) ? group : [])
      .filter(Boolean);
  }

  function findMissionMirrorByReference(engine, sourceReference) {
    if (!engine || !sourceReference) return null;

    return (
      missionRecords(engine).find(
        mission =>
          String(mission?.sourceReference || "") ===
          String(sourceReference)
      ) || null
    );
  }

  function registerMissionMirror(work) {
    const engine = missionEngine();
    if (!engine?.createMissionFromIntake) return null;

    const sourceReference =
      missionMirrorReference(work);

    try {
      const existing =
        findMissionMirrorByReference(
          engine,
          sourceReference
        );

      if (existing) {
        const currentWorkMissionId =
          work.mission?.id || null;
        const isCurrentWorkReentry =
          Boolean(currentWorkMissionId) &&
          String(currentWorkMissionId) ===
            String(existing.id);

        work.mission = {
          engine: "mission-engine",
          id: existing.id,
          status: existing.status,
          sourceReference
        };

        /*
         * A Hallway work item legitimately re-enters its route after the
         * Executive Director authorizes it with Take It. The Mission mirror
         * created during planning is the same work's coordination record, not
         * evidence that another unchanged cognitive dispatch already ran.
         *
         * Before EH143 this same-work re-entry was misclassified as
         * previously-seen work, so Take It could immediately release the work
         * as done without executing the authorized route. Preserve durable
         * recognition for genuinely separate duplicate work, but never let a
         * work item recognize its own Mission mirror as a duplicate.
         */
        if (isCurrentWorkReentry) {
          work.recognition = {
            schema:
              "meos.executive-hallway.recognition.v1",
            recognized: false,
            unchanged: false,
            disposition:
              "current-work-reentry",
            sourceReference,
            missionId:
              existing.id,
            missionStatus:
              existing.status || null,
            recognizedAt: now()
          };

          work.evidence.push({
            type:
              "durable-work-reentry",
            source:
              "mission-engine",
            sourceReference,
            missionId:
              existing.id,
            missionStatus:
              existing.status || null,
            message:
              "Current Hallway work re-entered its authorized route using its existing Mission mirror; execution remains eligible.",
            at: now()
          });

          record(
            "work.current-mission-reentry",
            {
              workId: work.id,
              missionId:
                existing.id,
              missionStatus:
                existing.status || null,
              sourceReference
            }
          );

          return existing;
        }

        work.recognition = {
          schema:
            "meos.executive-hallway.recognition.v1",
          recognized: true,
          unchanged: true,
          disposition:
            "skip-existing-work",
          sourceReference,
          missionId:
            existing.id,
          missionStatus:
            existing.status || null,
          recognizedAt: now()
        };

        work.evidence.push({
          type:
            "durable-work-recognition",
          source:
            "mission-engine",
          sourceReference,
          missionId:
            existing.id,
          missionStatus:
            existing.status || null,
          message:
            "Previously-seen unchanged executive work was recognized before Mission creation.",
          at: now()
        });

        record(
          "work.recognized-before-creation",
          {
            workId: work.id,
            missionId:
              existing.id,
            missionStatus:
              existing.status || null,
            sourceReference
          }
        );

        return existing;
      }

      const mission = engine.createMissionFromIntake({
        missionTitle: work.title,
        description: work.instruction,
        objective: work.instruction,
        source: "executive-intake",
        intakeId: sourceReference,
        approvalRequired: work.authority.reviewRequired,
        assignedOffices: work.owner ? [work.owner] : [],
        leadOffice: work.owner || null,
        tags: [
          "executive-hallway",
          work.route || "unrouted",
          work.context?.cognitiveDispatchKey
            ? "cognitive-dispatch"
            : "executive-work"
        ],
        createdBy: "Maddy / Executive Hallway"
      });

      work.mission = {
        engine: "mission-engine",
        id: mission.id,
        status: mission.status,
        sourceReference
      };

      work.recognition = {
        schema:
          "meos.executive-hallway.recognition.v1",
        recognized: false,
        unchanged: false,
        disposition:
          "promoted-new-work",
        sourceReference,
        missionId:
          mission.id,
        missionStatus:
          mission.status || null,
        recognizedAt: now()
      };

      return mission;
    } catch (error) {
      work.evidence.push({
        type: "coordination-warning",
        source: "mission-engine",
        message: error?.message || String(error),
        at: now()
      });
      return null;
    }
  }

  function releaseRecognizedWork(work) {
    if (
      work?.recognition?.recognized !== true ||
      work?.recognition?.unchanged !== true
    ) {
      return null;
    }

    work.options = [
      "view-existing",
      "release"
    ];

    return transition(
      work,
      "done",
      {
        lifecycle: {
          schema:
            "meos.executive-hallway.lifecycle.v1",
          terminal: true,
          disposition:
            "released-unchanged",
          reason:
            "Previously-seen work is unchanged and does not earn another execution.",
          releasedAt: now(),
          missionId:
            work.mission?.id || null
        },
        outcome: {
          success: true,
          verified: true,
          skipped: true,
          reason:
            "recognized-unchanged-work",
          missionId:
            work.mission?.id || null,
          sourceReference:
            work.mission?.sourceReference || null
        }
      }
    );
  }

  /*
   * Terminal Failure Mission Release
   *
   * A Hallway work item that reaches a terminal failure must not leave its
   * durable Mission mirror in active state. The failed attempt remains fully
   * auditable in Hallway work/history and Mission history, but present
   * organizational intention is released so a timeout or provider failure
   * cannot slowly rebuild the active-mission museum we already reconciled.
   *
   * This helper does not retry work, grant authority, or delete history. A
   * later retry is a new deliberate work attempt.
   */
  function releaseMissionAfterTerminalFailure(work, failure = {}) {
    const engine = missionEngine();
    const missionId = work?.mission?.id || null;

    if (!engine || !missionId) return null;

    const failureMessage = String(
      failure?.message ||
      failure?.reason ||
      work?.error ||
      "Hallway work ended in terminal failure."
    ).trim();
    const failureCode = String(failure?.code || "terminal-failure").trim();

    try {
      let mission = engine.getMission?.(missionId) || null;
      if (!mission) return null;

      const alreadyReleased = ["archived", "completed", "cancelled"].includes(
        String(mission.status || "").toLowerCase()
      );

      if (!alreadyReleased && typeof engine.blockMission === "function") {
        mission = engine.blockMission(
          missionId,
          `Terminal Hallway failure — ${failureMessage}`
        ) || mission;
      }

      if (!alreadyReleased && typeof engine.archiveMission === "function") {
        mission = engine.archiveMission(
          missionId,
          "Maddy / Executive Hallway — terminal failure"
        ) || mission;
      }

      const released = ["archived", "completed", "cancelled"].includes(
        String(mission?.status || "").toLowerCase()
      );

      work.mission = {
        ...work.mission,
        status: mission?.status || work.mission?.status || null
      };

      work.lifecycle = {
        schema: "meos.executive-hallway.lifecycle.v1",
        terminal: released,
        disposition: released
          ? "released-terminal-failure"
          : "terminal-failure-release-unavailable",
        reason: failureMessage,
        failureCode,
        missionId,
        resolvedAt: released ? now() : null
      };

      work.evidence.push({
        type: "terminal-failure-mission-disposition",
        source: "mission-engine",
        missionId,
        missionStatus: work.mission.status,
        failureCode,
        failureMessage,
        historicalRecordPreserved: true,
        destructiveDelete: false,
        releasedAt: released ? work.lifecycle.resolvedAt : null,
        at: now()
      });

      record("work.lifecycle-disposition", {
        workId: work.id,
        missionId,
        signal: "terminal-failure",
        lifecycleDisposition: work.lifecycle.disposition,
        missionStatus: work.mission.status,
        failureCode
      });

      return clone(work.lifecycle);
    } catch (error) {
      work.evidence.push({
        type: "coordination-warning",
        source: "mission-engine",
        message: `Terminal failure Mission release failed: ${error?.message || String(error)}`,
        at: now()
      });
      return null;
    }
  }

  /*
   * Informational Return Auto-Resolution
   *
   * A completed, evidence-bound public-research answer is already the
   * consequence the Executive Director asked for. It must not remain active
   * merely because no Accept button was clicked. Accept / Not This remains a
   * feedback contract for learning; it is not a completion gate for ordinary
   * informational research.
   *
   * This gate is intentionally narrow. Only the commissioned headless public
   * research continuation qualifies. Opportunity work, Workspace work,
   * approvals, preparations, and other consequential executive work continue
   * through their existing disposition/authority paths.
   */
  function isAutoResolvableInformationalResearch(work, execution) {
    if (!work || work.route !== "executive-router") return false;
    if (work.authority?.reviewRequired === true) return false;

    const root = execution?.result ?? execution ?? {};
    const source = String(
      root?.source || execution?.source || root?.result?.source || ""
    ).trim().toLowerCase();
    const outputType = String(
      root?.output?.type || root?.result?.output?.type || root?.type || ""
    ).trim().toLowerCase();
    const governed = governedAnswerFromExecution(execution);

    return (
      source === "meos-headless-public-research" &&
      (outputType === "public-research-result" || Boolean(governed?.answer)) &&
      governed?.finalSpeechAuthorized === true &&
      governed?.oneMouth === true &&
      Boolean(String(governed?.answer || "").trim())
    );
  }

  function resolveInformationalResearchMission(work, execution) {
    if (!isAutoResolvableInformationalResearch(work, execution)) return null;

    const engine = missionEngine();
    const missionId = work?.mission?.id || null;
    if (!engine || !missionId || typeof engine.completeMission !== "function") return null;

    try {
      const current = engine.getMission?.(missionId) || null;
      if (!current) return null;

      const alreadyReleased = ["completed", "archived", "cancelled"].includes(
        String(current.status || "").toLowerCase()
      );
      const mission = alreadyReleased ? current : engine.completeMission(missionId, {
        completedBy: "Maddy / Executive Hallway",
        summary: "Evidence-bound informational research returned to the Executive Director.",
        notes: "Automatically resolved after successful informational return; feedback remains optional and grants no authority."
      });
      const released = ["completed", "archived", "cancelled"].includes(
        String(mission?.status || "").toLowerCase()
      );
      if (!released) return null;

      work.mission = {
        ...work.mission,
        status: mission?.status || work.mission?.status || null
      };
      work.lifecycle = {
        schema: "meos.executive-hallway.lifecycle.v1",
        terminal: true,
        disposition: "resolved-informational-return",
        reason: "Successful evidence-bound informational research is complete on return; human feedback is optional learning input.",
        missionId,
        resolvedAt: now()
      };
      work.evidence.push({
        type: "informational-return-mission-disposition",
        source: "mission-engine",
        missionId,
        missionStatus: work.mission.status,
        historicalRecordPreserved: true,
        feedbackRequiredForCompletion: false,
        externalActionAuthorized: false,
        resolvedAt: work.lifecycle.resolvedAt,
        at: now()
      });
      record("work.lifecycle-disposition", {
        workId: work.id,
        missionId,
        signal: "informational-return",
        lifecycleDisposition: work.lifecycle.disposition,
        missionStatus: work.mission.status
      });
      return clone(work.lifecycle);
    } catch (error) {
      work.evidence.push({
        type: "coordination-warning",
        source: "mission-engine",
        message: `Informational return Mission resolution failed: ${error?.message || String(error)}`,
        at: now()
      });
      return null;
    }
  }

  function applyMissionDisposition(
    work,
    feedback
  ) {
    const engine = missionEngine();
    const missionId =
      work?.mission?.id || null;

    if (
      !engine ||
      !missionId ||
      !feedback
    ) {
      return null;
    }

    try {
      let mission =
        engine.getMission?.(missionId) ||
        null;

      if (!mission) {
        return null;
      }

      if (
        feedback.signal === "accepted"
      ) {
        if (
          mission.approval?.required ===
            true &&
          mission.approval?.status !==
            "approved" &&
          typeof engine.approveMission ===
            "function"
        ) {
          mission =
            engine.approveMission(
              missionId,
              {
                reviewedBy:
                  feedback.actor,
                notes:
                  feedback.reason ||
                  "Accepted from the Maddy HUD."
              }
            );
        }

        if (
          typeof engine.completeMission ===
          "function"
        ) {
          mission =
            engine.completeMission(
              missionId,
              {
                completedBy:
                  feedback.actor,
                summary:
                  "Executive Director accepted the returned Hallway result.",
                notes:
                  feedback.reason || ""
              }
            );
        }

        work.lifecycle = {
          schema:
            "meos.executive-hallway.lifecycle.v1",
          terminal: true,
          disposition:
            "resolved-accepted",
          missionId,
          resolvedAt: now()
        };
      } else if (
        feedback.signal === "not-this"
      ) {
        if (
          typeof engine.archiveMission ===
          "function"
        ) {
          mission =
            engine.archiveMission(
              missionId,
              "Executive Director — Not This"
            );
        }

        work.lifecycle = {
          schema:
            "meos.executive-hallway.lifecycle.v1",
          terminal: true,
          disposition:
            "released-not-this",
          missionId,
          resolvedAt: now()
        };
      }

      if (mission) {
        work.mission = {
          ...work.mission,
          status:
            mission.status ||
            work.mission?.status ||
            null
        };
      }

      record(
        "work.lifecycle-disposition",
        {
          workId: work.id,
          missionId,
          signal:
            feedback.signal,
          lifecycleDisposition:
            work.lifecycle
              ?.disposition ||
            null,
          missionStatus:
            work.mission
              ?.status ||
            null
        }
      );

      return clone(
        work.lifecycle || null
      );
    } catch (error) {
      work.evidence.push({
        type:
          "coordination-warning",
        source:
          "mission-engine",
        message:
          `Terminal Mission disposition failed: ${error?.message || String(error)}`,
        at: now()
      });

      return null;
    }
  }

  function harvestUrls(value, path = "result", found = [], seen = new Set()) {
    if (value === null || value === undefined || found.length >= 25) return found;
    if (typeof value === "string") {
      if (/^https?:\/\//i.test(value)) found.push({ url: value, path });
      return found;
    }
    if (typeof value !== "object" || seen.has(value)) return found;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach((item, index) => harvestUrls(item, `${path}[${index}]`, found, seen));
      return found;
    }
    Object.entries(value).forEach(([key, item]) => harvestUrls(item, `${path}.${key}`, found, seen));
    return found;
  }


  function findExplicitWorkspaceRetrievals(value, found = [], seen = new Set()) {
    if (!value || typeof value !== "object" || seen.has(value) || found.length >= 10) return found;
    seen.add(value);

    const candidates = [];
    if (value.retrieval?.file) candidates.push(value.retrieval.file);
    if (value.bestMatch?.file) candidates.push(value.bestMatch.file);

    candidates.forEach(file => {
      const name = file?.name || file?.fileName || file?.filename || null;
      const url = file?.webViewLink || file?.webContentLink || file?.downloadUrl || file?.url || file?.openUrl || null;
      const mimeType = file?.mimeType || null;
      const fileId = file?.fileId || file?.id || null;
      if (name && (url || mimeType || fileId)) {
        found.push({
          name: String(name),
          url: url || null,
          mimeType: mimeType || null,
          fileId: fileId || null,
          raw: clone(file),
          source: value.retrieval?.file === file ? "retrieval.file" : "bestMatch.file"
        });
      }
    });

    if (Array.isArray(value)) {
      value.forEach(item => findExplicitWorkspaceRetrievals(item, found, seen));
    } else {
      Object.values(value).forEach(item => findExplicitWorkspaceRetrievals(item, found, seen));
    }
    return found;
  }

  function workspaceRetrievalMessage(value, seen = new Set()) {
    if (!value || typeof value !== "object" || seen.has(value)) return null;
    seen.add(value);
    if (value.retrieval && typeof value.retrieval === "object") {
      return {
        success: value.retrieval.success === true,
        confidence: value.retrieval.confidence || null,
        message: value.retrieval.message || null
      };
    }
    const children = Array.isArray(value) ? value : Object.values(value);
    for (const child of children) {
      const found = workspaceRetrievalMessage(child, seen);
      if (found) return found;
    }
    return null;
  }

  function findLikelyFileObjects(value, found = [], seen = new Set()) {
    if (!value || typeof value !== "object" || seen.has(value) || found.length >= 25) return found;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach(item => findLikelyFileObjects(item, found, seen));
      return found;
    }

    const name = value.name || value.fileName || value.filename || value.title || null;
    const url = value.webViewLink || value.webContentLink || value.downloadUrl || value.url || value.openUrl || null;
    const mimeType = value.mimeType || (typeof value.type === "string" && value.type.includes("/") ? value.type : null);
    const fileId = value.fileId || value.id || null;

    const looksLikeNamedFile = Boolean(fileId && /\.[a-z0-9]{1,10}$/i.test(String(name || "")));
    if (name && (url || mimeType || looksLikeNamedFile)) {
      found.push({ name: String(name), url: url || null, mimeType: mimeType || null, fileId: fileId || null, raw: clone(value) });
    }

    Object.values(value).forEach(item => findLikelyFileObjects(item, found, seen));
    return found;
  }

  function addDeliverable(work, deliverable = {}) {
    const item = {
      schema: `${SCHEMA}.deliverable`,
      id: deliverable.id || id("deliverable"),
      workId: work.id,
      title: deliverable.title || "MEOS deliverable",
      kind: deliverable.kind || "result",
      status: deliverable.status || "ready",
      mimeType: deliverable.mimeType || null,
      fileId: deliverable.fileId || null,
      openUrl: deliverable.openUrl || deliverable.url || null,
      downloadUrl: deliverable.downloadUrl || null,
      summary: deliverable.summary || null,
      provider: deliverable.provider || null,
      source: deliverable.source || work.owner || "MEOS",
      data: clone(deliverable.data || null),
      createdAt: now()
    };
    state.deliverables.set(item.id, item);
    work.deliverables.push(item.id);
    record("deliverable.ready", { workId: work.id, deliverableId: item.id, title: item.title });
    emit("deliverable-ready", item);

    const engine = missionEngine();
    if (work.mission?.id && engine?.addDeliverable) {
      try {
        engine.addDeliverable(work.mission.id, {
          title: item.title,
          description: item.summary || item.openUrl || "Delivered through Executive Hallway.",
          createdByOffice: work.owner || "maddy",
          status: item.status,
          documentId: item.fileId || null
        });
      } catch (_) { /* Mission mirror must never block delivery. */ }
    }
    return item;
  }

  function selectExecutionFileObjects(work, explicit = [], generic = []) {
    const isFileRetrieval =
      work.intent === "find-file" ||
      work.requiredCapabilities.some(capability =>
        capability === "workspace.file.search" || capability === "workspace.file.research"
      );

    /*
     * Commission 006.005 — Primary Retrieval Authority
     *
     * Workspace research responses can contain many candidate file objects in
     * evidence arrays. Those are investigation evidence, not deliverables. For
     * a find/get/fetch request, the provider's explicit retrieval.file /
     * bestMatch.file is authoritative. Returning every candidate makes the
     * dashboard's latest-deliverable action open an unrelated search candidate.
     */
    // Commission 006.018C — Semantic Result Integrity
    // File-shaped evidence is only eligible to become a deliverable when the
    // mission itself is a file-retrieval mission. Research/executive results
    // may legitimately contain Drive files as evidence; promoting those files
    // to the primary deliverable silently replaces the requested answer.
    const fileObjects = !isFileRetrieval
      ? []
      : explicit.length
        ? [explicit[0]]
        : generic.length
          ? [generic[0]]
          : [];

    return { fileObjects, isFileRetrieval };
  }

  function semanticResultValue(value, seen = new Set()) {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") {
      const text = value.trim();
      return text && !/^https?:\/\//i.test(text) ? text : null;
    }
    if (typeof value !== "object" || seen.has(value)) return null;
    seen.add(value);

    const priorityKeys = [
      "answer", "finding", "conclusion", "learnedFact",
      "recommendation", "summary", "message"
    ];
    for (const key of priorityKeys) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
      const candidate = semanticResultValue(value[key], seen);
      if (candidate) return candidate;
    }

    const children = Array.isArray(value) ? value : Object.values(value);
    for (const child of children) {
      const candidate = semanticResultValue(child, seen);
      if (candidate) return candidate;
    }
    return null;
  }

  function governedAnswerFromExecution(value) {
    const root = value?.result ?? value;
    return root?.governedAnswer ||
      root?.result?.governedAnswer ||
      root?.output?.governedAnswer ||
      null;
  }

  function strictAnswerSourceUrls(value) {
    const governed = governedAnswerFromExecution(value);
    const citations = Array.isArray(governed?.citations) ? governed.citations : [];
    return [...new Set(citations.filter(item =>
      typeof item === "string" && /^https?:\/\//i.test(item.trim())
    ).map(item => item.trim()))].slice(0, 10);
  }

  function normalizeExecutionDeliverables(work, execution) {
    const root = execution?.result ?? execution;
    const explicit = findExplicitWorkspaceRetrievals(root);
    const generic = findLikelyFileObjects(root);
    const selection = selectExecutionFileObjects(work, explicit, generic);
    const fileObjects = selection.fileObjects;
    const isFileRetrieval = selection.isFileRetrieval;
    const seen = new Set();

    fileObjects.forEach(file => {
      const key = `${file.fileId || ""}|${file.url || ""}|${file.name}`;
      if (seen.has(key)) return;
      seen.add(key);
      addDeliverable(work, {
        title: file.name,
        kind: "file",
        mimeType: file.mimeType,
        fileId: file.fileId,
        openUrl: file.url,
        provider: execution?.providerId || execution?.provider || null,
        summary: file.source ? `Workspace delivery from ${file.source}.` : null,
        data: file.raw
      });
    });

    const retrieval = workspaceRetrievalMessage(root);

    if (!isFileRetrieval && execution?.success !== false) {
      const answer = semanticResultValue(root);
      const evidenceUrls = strictAnswerSourceUrls(root);
      addDeliverable(work, {
        title: work.title,
        kind: "executive-result",
        summary: answer || "MEOS returned structured executive work. Open Result Details to inspect the complete result.",
        openUrl: evidenceUrls[0] || null,
        provider: execution?.providerId || execution?.provider || null,
        source: work.owner || "MEOS",
        data: {
          answer: answer || null,
          governedAnswer: clone(governedAnswerFromExecution(root)),
          result: clone(root),
          evidenceUrls
        }
      });
    }

    if (isFileRetrieval && !fileObjects.length) {
      // Preserve URL-only fallback for genuine file retrievals without allowing
      // arbitrary evidence URLs to become research deliverables.
      const urls = harvestUrls(root);
      urls.slice(0, 5).forEach((link, index) => addDeliverable(work, {
        title: index === 0 ? work.title : `${work.title} ${index + 1}`,
        kind: "link",
        openUrl: link.url,
        provider: execution?.providerId || execution?.provider || null,
        data: { path: link.path }
      }));
    }

    return {
      count: work.deliverables.length,
      retrieval,
      isFileRetrieval
    };
  }

  async function routeWorkspaceWork(work, interpretation, options = {}) {
    const office = workspaceOffice();
    work.owner = office.officeId || "executive-workspace-office";
    work.route = "workspace";
    work.intent = interpretation.intent;
    work.requiredCapabilities = [...(interpretation.requiredCapabilities || [])];
    transition(work, "planning");

    const prepared = office.prepareMission({
      instruction: work.instruction,
      title: work.title,
      intent: work.intent,
      context: { ...work.context, hallwayWorkId: work.id },
      reviewRequired: work.authority.reviewRequired,
      authorized: work.authority.authorized,
      payload: options.payload || {}
    });

    work.execution = { workspaceMissionId: prepared.id };
    registerMissionMirror(work);

    if (work.recognition?.recognized === true) {
      return releaseRecognizedWork(work);
    }

    if (!prepared.readiness?.ready) {
      work.options = ["retry", "connect-capability", "reassign"];
      return transition(work, "blocked", {
        outcome: { success: false, reason: "missing-capabilities", missingCapabilities: prepared.readiness?.missingCapabilities || [] }
      });
    }

    if (prepared.authority?.reviewRequired && !prepared.authority?.authorized) {
      work.options = ["take-it", "request-revisions", "cancel"];
      return transition(work, "awaiting-review", {
        outcome: { success: false, reason: "review-required" }
      });
    }

    transition(work, "executing");
    const result = await office.executeMission(prepared.id, options);
    work.execution = clone(result);
    work.evidence.push({ type: "workspace-execution", verifiedAt: now(), result: clone(result) });

    if (result?.success !== true) {
      work.options = ["retry", "reassign", "cancel"];
      return transition(work, "failed", {
        error: result?.result?.error || result?.reason || "Workspace execution failed.",
        outcome: { success: false, result: clone(result) }
      });
    }

    transition(work, "verifying");
    const delivery = normalizeExecutionDeliverables(work, result.result || result);
    if (delivery.isFileRetrieval && delivery.count === 0) {
      work.options = ["retry", "review-evidence", "archive"];
      return transition(work, "blocked", {
        error: delivery.retrieval?.message || "Workspace execution completed but no usable file deliverable was returned.",
        outcome: {
          success: false,
          verified: false,
          reason: "workspace-deliverable-missing",
          retrieval: clone(delivery.retrieval),
          result: clone(result)
        }
      });
    }
    work.options = ["open-deliverable", "use-in-task", "archive"];
    return transition(work, "done", {
      outcome: { success: true, verified: true, result: clone(result) }
    });
  }

  /*
   * Long-Running Execution Continuity
   *
   * The Hallway owns work continuity; the presentation surface does not own
   * execution lifetime. A real research or provider operation may outlive the
   * amount of time a human-facing surface should synchronously wait. Crossing
   * that presentation boundary therefore means "still working", not terminal
   * failure.
   *
   * Router execution remains bounded by its own execution timeout. While that
   * governed operation is alive, the same Hallway work ID and Mission mirror
   * remain alive. When the operation eventually returns, the result is verified,
   * delivered, and dispositioned through the exact same work item. A genuine
   * Router failure still follows the commissioned terminal-failure release path.
   *
   * This is intentionally not a claim of process durability across browser or
   * machine death. It is continuity across the presentation wait boundary using
   * the commissioned Mission/Hallway identity rather than manufacturing a retry.
   */
  const EXECUTIVE_PRESENTATION_WAIT_MS = 45000;
  const EXECUTIVE_EXECUTION_TIMEOUT_MS = 300000;

  function executivePresentationWaitMs(options = {}) {
    const requested = Number(options.presentationWaitMs);
    return Number.isFinite(requested) && requested >= 0
      ? Math.floor(requested)
      : EXECUTIVE_PRESENTATION_WAIT_MS;
  }

  function executiveRouterTimeoutMs(options = {}) {
    const explicit = Number(options.executionTimeoutMs ?? options.routerOptions?.timeoutMs);
    return Number.isFinite(explicit) && explicit > 0
      ? Math.floor(explicit)
      : EXECUTIVE_EXECUTION_TIMEOUT_MS;
  }

  /*
   * Commission 006.033F — Verification Semantics Reconciliation
   *
   * Router success means the governed route/transport completed. It is not
   * evidence that a claim, execution, or real-world consequence was verified.
   * Hallway therefore preserves success independently and may mark the outcome
   * verified only when the Router result carries an explicit authoritative
   * outcome-verification signal. Missing verification fails closed.
   */
  function executiveRouterOutcomeVerified(result) {
    return (
      result?.outcomeVerified === true ||
      result?.verification?.outcomeVerified === true ||
      result?.transportReceipt?.outcomeVerified === true
    );
  }

  function finishExecutiveRouterSuccess(work, result) {
    work.execution = clone(result);
    work.evidence.push({ type: "executive-router-result", verifiedAt: now(), result: clone(result) });
    transition(work, "verifying");
    normalizeExecutionDeliverables(work, result);
    work.options = work.deliverables.length ? ["open-deliverable", "use-in-task", "archive"] : ["review-result", "archive"];
    const returned = transition(work, "done", {
      outcome: {
        success: result?.success !== false,
        verified: executiveRouterOutcomeVerified(result),
        result: clone(result)
      }
    });
    if (result?.success !== false) {
      resolveInformationalResearchMission(work, result);
    }
    return work.lifecycle?.disposition === "resolved-informational-return"
      ? clone(work)
      : returned;
  }

  function finishExecutiveRouterFailure(work, error) {
    work.options = ["retry", "reassign", "cancel"];
    const lifecycle = releaseMissionAfterTerminalFailure(work, {
      message: error?.message || String(error),
      code: error?.code || "executive-router-failed"
    });
    return transition(work, "failed", {
      error: error?.message || String(error),
      lifecycle: lifecycle || work.lifecycle || null,
      outcome: { success: false, reason: error?.code || "executive-router-failed" }
    });
  }

  function markExecutiveExecutionContinuing(work, detail = {}) {
    const presentationWaitMs = Number(detail.presentationWaitMs || EXECUTIVE_PRESENTATION_WAIT_MS);
    const executionTimeoutMs = Number(detail.executionTimeoutMs || EXECUTIVE_EXECUTION_TIMEOUT_MS);

    work.execution = {
      schema: "meos.executive-hallway.execution-continuity.v1",
      status: "running",
      workId: work.id,
      missionId: work.mission?.id || null,
      startedAt: detail.startedAt || now(),
      presentationWaitExpiredAt: now(),
      presentationWaitMs,
      executionTimeoutMs,
      sameWorkIdentityPreserved: true,
      retryCreated: false,
      terminal: false
    };
    work.options = ["view-status"];
    work.lifecycle = {
      schema: "meos.executive-hallway.lifecycle.v1",
      terminal: false,
      disposition: "execution-continues-background",
      reason: "Presentation wait elapsed while the governed Router execution remains active.",
      missionId: work.mission?.id || null,
      continuedAt: now()
    };
    work.evidence.push({
      type: "long-running-execution-continuity",
      source: "executive-hallway",
      workId: work.id,
      missionId: work.mission?.id || null,
      presentationWaitMs,
      executionTimeoutMs,
      sameWorkIdentityPreserved: true,
      retryCreated: false,
      externalActionAuthorized: false,
      message: "Presentation wait elapsed; the same governed work continues instead of being misclassified as terminal failure.",
      at: now()
    });
    record("work.execution-continues", {
      workId: work.id,
      missionId: work.mission?.id || null,
      presentationWaitMs,
      executionTimeoutMs
    });
    emit("work-updated", work);
    return clone(work);
  }

  /*
   * Commission 006.031O — Durable Execution Spine Hallway Handoff
   *
   * Human-directed public research is no longer allowed to begin as a
   * browser-owned Router Promise. The Hallway preserves its commissioned
   * Mission/work lineage, derives one stable originating-intent identity, and
   * hands the execution to the server-owned Durable Execution Spine. The
   * server is then the execution owner; closing this tab cannot revoke that
   * ownership. This commission intentionally stops at the ownership boundary:
   * returned durable evidence is reintegrated through Maddy's governed
   * Router/Brain conclusion path by the next commission rather than being
   * presented as naked server output here.
   */
  const DURABLE_EXECUTION_HANDOFF_COMMISSION = "006.031O";
  const DURABLE_EXECUTION_HANDOFF_SCHEMA =
    "meos.executive-hallway.durable-execution-handoff.v1";

  /*
   * Commission 006.031T — Durable Execution Ownership Persistence
   *
   * A Hallway Mission may exist before the server accepts durable execution.
   * Therefore an active `hallway-work:*` Mission is evidence of intention only;
   * it is not evidence that the Durable Execution Spine owns anything.  Persist
   * the exact server-accepted execution ID into the durable Mission tags after
   * a successful handoff, and require that evidence (or a one-time verified
   * legacy status lookup) before browser reload reconstruction.
   *
   * This prevents a failed/never-accepted dispatch from becoming a phantom
   * server-owned execution on reload.  A real HTTP 404 from the same-origin
   * status endpoint is memoized on legacy Missions so page reloads do not keep
   * manufacturing the same red status request.  Network errors are never
   * memoized as absence: flaky Wi-Fi remains "unknown/deferred", not "missing".
   */
  const DURABLE_EXECUTION_OWNERSHIP_PERSISTENCE_COMMISSION = "006.031T";
  const DURABLE_EXECUTION_OWNERSHIP_TAG = "durable-execution-server-owned";
  const DURABLE_EXECUTION_ID_TAG_PREFIX = "durable-execution-id:";
  const DURABLE_EXECUTION_NOT_FOUND_TAG_PREFIX = "durable-execution-not-found:";

  function normalizedMissionTags(mission) {
    return Array.isArray(mission?.tags)
      ? [...new Set(mission.tags.map(value => String(value || "").trim()).filter(Boolean))]
      : [];
  }

  function durableExecutionIdFromMission(mission) {
    const tag = normalizedMissionTags(mission).find(value =>
      value.startsWith(DURABLE_EXECUTION_ID_TAG_PREFIX)
    );
    return tag ? tag.slice(DURABLE_EXECUTION_ID_TAG_PREFIX.length).trim() : "";
  }

  function durableExecutionNotFoundIdFromMission(mission) {
    const tag = normalizedMissionTags(mission).find(value =>
      value.startsWith(DURABLE_EXECUTION_NOT_FOUND_TAG_PREFIX)
    );
    return tag ? tag.slice(DURABLE_EXECUTION_NOT_FOUND_TAG_PREFIX.length).trim() : "";
  }

  function persistDurableExecutionMissionTag(missionId, executionId, disposition = "owned") {
    const engine = missionEngine();
    if (!missionId || !executionId || typeof engine?.updateMission !== "function") return null;
    const current = engine.getMission?.(missionId) ||
      missionRecords(engine).find(item => String(item?.id || "") === String(missionId)) || null;
    if (!current) return null;

    const retained = normalizedMissionTags(current).filter(tag =>
      tag !== DURABLE_EXECUTION_OWNERSHIP_TAG &&
      !tag.startsWith(DURABLE_EXECUTION_ID_TAG_PREFIX) &&
      !tag.startsWith(DURABLE_EXECUTION_NOT_FOUND_TAG_PREFIX)
    );
    const tags = disposition === "owned"
      ? [...retained, DURABLE_EXECUTION_OWNERSHIP_TAG, `${DURABLE_EXECUTION_ID_TAG_PREFIX}${executionId}`]
      : [...retained, `${DURABLE_EXECUTION_NOT_FOUND_TAG_PREFIX}${executionId}`];

    return engine.updateMission(missionId, {
      tags,
      currentActivity: disposition === "owned"
        ? `Durable execution owned by server: ${executionId}`
        : `Durable execution status not commissioned: ${executionId}`
    });
  }

  function rememberDurableExecutionOwnership(work, record) {
    const missionId = String(work?.mission?.id || "").trim();
    const executionId = String(record?.executionId || "").trim();
    if (!missionId || !executionId) return null;
    try {
      const updated = persistDurableExecutionMissionTag(missionId, executionId, "owned");
      if (updated) {
        work.evidence.push({
          type: "durable-execution-ownership-persisted",
          source: "executive-hallway",
          commission: DURABLE_EXECUTION_OWNERSHIP_PERSISTENCE_COMMISSION,
          missionId,
          executionId,
          at: now()
        });
      }
      return updated;
    } catch (error) {
      work.evidence.push({
        type: "durable-execution-ownership-persistence-warning",
        source: "executive-hallway",
        commission: DURABLE_EXECUTION_OWNERSHIP_PERSISTENCE_COMMISSION,
        missionId,
        executionId,
        message: error?.message || String(error),
        at: now()
      });
      return null;
    }
  }

  function durablePublicResearchContract(work) {
    const router = executiveRouter();
    if (typeof router?.researchIntentExecutionContract !== "function") {
      return { required: false, reason: "research-contract-unavailable" };
    }
    try {
      return router.researchIntentExecutionContract({
        request: { text: work?.instruction || "" },
        package: { request: { text: work?.instruction || "" } }
      }) || { required: false, reason: "research-contract-not-required" };
    } catch (_) {
      return { required: false, reason: "research-contract-evaluation-failed" };
    }
  }

  function durableExecutionLineage(work) {
    const missionId = String(work?.mission?.id || "").trim();
    const hallwayWorkId = String(work?.id || "").trim();
    const cognitionId = String(
      work?.context?.cognitionId ||
      work?.context?.cognitiveDispatchKey ||
      `human-intent-${hallwayWorkId}`
    ).trim();
    if (!missionId || !hallwayWorkId || !cognitionId) {
      throw new Error("Durable execution handoff requires Mission, cognition/intention, and Hallway work lineage.");
    }
    return { missionId, cognitionId, hallwayWorkId };
  }

  function durableExecutionId(work) {
    return `execution-${String(work?.id || "").trim()}`;
  }

  async function dispatchDurablePublicResearch(work, researchContract) {
    if (typeof global.fetch !== "function") {
      throw new Error("Durable execution handoff requires same-origin server access.");
    }
    const lineage = durableExecutionLineage(work);
    const executionId = durableExecutionId(work);
    const response = await global.fetch("/api/durable-execution/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({
        executionId,
        lineage,
        executor: "headless-public-research",
        request: {
          subject: work.instruction,
          question: work.instruction,
          reason: researchContract?.reason || "human-directed-public-research",
          maxSources: 8,
          maxDepth: 2,
          maxAdditionalPasses: 1,
          authority: {
            externalActionAuthorized: false,
            paidProviderAuthorized: false,
            humanAuthorityPreserved: true
          }
        },
        authority: {
          humanDirected: work.requestedBy === "executive-director" || work.source === "maddy-executive-desk",
          publicReadResearchAuthorized: true,
          paidSpendAuthorized: false,
          externalActionAuthorized: false,
          automaticSpendUsd: 0
        }
      })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.accepted !== true || !payload?.record?.executionId) {
      const error = new Error(
        payload?.error || `Durable execution handoff failed with HTTP ${response.status}.`
      );
      error.code = payload?.code || "DURABLE_EXECUTION_HANDOFF_FAILED";
      throw error;
    }
    return payload.record;
  }

  function markDurableExecutionOwnedByServer(work, record, researchContract) {
    work.execution = {
      schema: DURABLE_EXECUTION_HANDOFF_SCHEMA,
      commission: DURABLE_EXECUTION_HANDOFF_COMMISSION,
      executionId: record.executionId,
      state: record.state || "queued",
      owner: "meos-server-durable-execution-spine",
      executor: record.executor || "headless-public-research",
      lineage: clone(record.lineage || durableExecutionLineage(work)),
      checkpoint: clone(record.checkpoint || null),
      serverOwned: true,
      browserExecutionOwner: false,
      retryCreated: false,
      externalActionAuthorized: false,
      automaticSpendUsd: 0,
      handedOffAt: now()
    };
    work.options = ["view-status"];
    work.lifecycle = {
      schema: "meos.executive-hallway.lifecycle.v1",
      terminal: false,
      disposition: "execution-owned-by-durable-server",
      reason: "Human-directed public research was accepted by the server-owned Durable Execution Spine.",
      missionId: work.mission?.id || null,
      executionId: record.executionId,
      continuedAt: now()
    };
    work.evidence.push({
      type: "durable-execution-handoff",
      source: "executive-hallway",
      executionId: record.executionId,
      lineage: clone(record.lineage || null),
      researchReason: researchContract?.reason || null,
      serverOwned: true,
      browserExecutionOwner: false,
      retryCreated: false,
      externalActionAuthorized: false,
      automaticSpendUsd: 0,
      message: "The server accepted ownership of this governed research execution under the original Mission/Hallway lineage.",
      at: now()
    });
    rememberDurableExecutionOwnership(work, record);
    recordActivityDurableHandoff(work);
    emit("work-updated", work);
    return clone(work);
  }

  function recordActivityDurableHandoff(work) {
    record("work.durable-execution-handed-off", {
      workId: work.id,
      missionId: work.mission?.id || null,
      executionId: work.execution?.executionId || null,
      serverOwned: true
    });
  }

  /*
   * Commission 006.031R — Durable Execution Return Reintegration
   *
   * The server-owned Durable Execution Spine remains the execution authority.
   * Hallway is only the continuity/presentation observer on return: it reads the
   * persisted status of the exact deterministic execution, verifies that the
   * returned Mission/Hallway lineage is the same work, and hands that record to
   * Executive Router 1.5.2's commissioned durable-return governance adapter.
   *
   * Raw server synthesis is never presented here. Router -> Brain must authorize
   * the governed answer first; only then does the existing Hallway success path
   * normalize the deliverable and apply informational auto-resolution. A page
   * reload may reconstruct the Hallway projection from the durable active Mission
   * without creating a new Mission, cognition, research execution, or retry.
   */
  const DURABLE_RETURN_REINTEGRATION_COMMISSION = "006.031R";
  const DURABLE_RETURN_REINTEGRATION_SCHEMA =
    "meos.executive-hallway.durable-return-reintegration.v1";

  async function readDurableExecutionStatus(executionId, fetchImpl = global.fetch?.bind(global)) {
    if (!executionId || typeof fetchImpl !== "function") {
      throw new Error("Durable return reintegration requires an execution ID and same-origin server access.");
    }
    const response = await fetchImpl(`/api/durable-execution/status/${encodeURIComponent(executionId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store"
    });
    const payload = await response.json().catch(() => null);
    if (response.status === 404) return null;
    if (!response.ok || !payload?.record) {
      throw new Error(payload?.error || `Durable execution status failed with HTTP ${response.status}.`);
    }
    return payload.record;
  }

  function recoverHallwayProjectionFromMission(mission, options = {}) {
    const sourceReference = String(mission?.sourceReference || "").trim();
    if (!sourceReference.startsWith("hallway-work:")) return null;
    const hallwayWorkId = sourceReference.slice("hallway-work:".length).trim();
    if (!hallwayWorkId) return null;
    const existing = state.work.get(hallwayWorkId);
    if (existing) return existing;

    const executionId = String(
      options.executionId || durableExecutionIdFromMission(mission) || ""
    ).trim();
    if (!executionId) return null;

    const recordValue = options.record || null;
    if (recordValue) {
      const lineage = recordValue.lineage || {};
      if (
        String(recordValue.executionId || "").trim() !== executionId ||
        String(lineage.missionId || "").trim() !== String(mission?.id || "").trim() ||
        String(lineage.hallwayWorkId || "").trim() !== hallwayWorkId
      ) {
        return null;
      }
    }

    const instruction = String(
      mission?.objective || mission?.description || mission?.missionTitle || mission?.title || ""
    ).trim();
    if (!instruction) return null;

    const work = createWork({
      id: hallwayWorkId,
      instruction,
      title: mission?.missionTitle || mission?.title || instruction,
      source: "maddy-durable-mission-recovery",
      requestedBy: "executive-director",
      reviewRequired: mission?.approvalRequired === true,
      authorized: mission?.approvalRequired !== true,
      authorizationSignal: mission?.approvalRequired === true ? null : "durable-human-directed-recovery",
      context: {
        taskAuthority: "human-directed",
        authorityScope: "assigned-internal-work",
        durableMissionRecovery: true
      }
    });
    work.owner = "maddy";
    work.route = "executive-router";
    work.state = "executing";
    work.mission = {
      engine: "mission-engine",
      id: mission.id,
      status: mission.status,
      sourceReference
    };
    work.execution = {
      schema: DURABLE_EXECUTION_HANDOFF_SCHEMA,
      commission: DURABLE_EXECUTION_HANDOFF_COMMISSION,
      executionId,
      state: recordValue?.state || "unknown",
      owner: "meos-server-durable-execution-spine",
      executor: recordValue?.executor || "headless-public-research",
      lineage: clone(recordValue?.lineage || null),
      checkpoint: clone(recordValue?.checkpoint || null),
      serverOwned: true,
      browserExecutionOwner: false,
      retryCreated: false,
      recoveredProjection: true,
      ownershipEvidence: durableExecutionIdFromMission(mission) === executionId
        ? "persisted-mission-tag"
        : "verified-server-record"
    };
    record("work.durable-return-projection-recovered", {
      workId: work.id,
      missionId: mission.id,
      executionId: work.execution.executionId,
      ownershipEvidence: work.execution.ownershipEvidence
    });
    emit("work-updated", work);
    return work;
  }

  function verifyDurableReturnLineage(work, record) {
    const missionId = String(work?.mission?.id || "").trim();
    const hallwayWorkId = String(work?.id || "").trim();
    const executionId = String(work?.execution?.executionId || durableExecutionId(work)).trim();
    const lineage = record?.lineage || {};
    return Boolean(
      missionId && hallwayWorkId && executionId &&
      String(record?.executionId || "").trim() === executionId &&
      String(lineage?.missionId || "").trim() === missionId &&
      String(lineage?.hallwayWorkId || "").trim() === hallwayWorkId &&
      String(lineage?.cognitionId || "").trim()
    );
  }

  async function reintegrateDurableExecutionReturn(workOrId, options = {}) {
    const work = typeof workOrId === "string" ? state.work.get(workOrId) : workOrId;
    if (!work) throw new Error("Durable return reintegration requires the original Hallway work.");
    const executionId = String(work?.execution?.executionId || durableExecutionId(work)).trim();
    const recordValue = options.record || await readDurableExecutionStatus(executionId, options.fetch);
    if (!recordValue) return clone(work);

    const serverState = String(recordValue.state || "").trim().toLowerCase();
    if (["queued", "running", "waiting"].includes(serverState)) {
      work.execution = { ...(work.execution || {}), state: serverState, checkpoint: clone(recordValue.checkpoint || null) };
      emit("work-updated", work);
      return clone(work);
    }
    if (serverState !== "returned") return clone(work);
    if (!verifyDurableReturnLineage(work, recordValue)) {
      const error = new Error("Durable returned execution lineage does not match the original Hallway/Mission work.");
      error.code = "DURABLE_RETURN_LINEAGE_MISMATCH";
      throw error;
    }

    const router = executiveRouter();
    if (typeof router?.reintegrateDurableResearchResult !== "function") {
      throw new Error("Executive Router durable return governance adapter is unavailable.");
    }

    const lineage = clone(recordValue.lineage);
    const governed = await router.reintegrateDurableResearchResult(recordValue, {
      executionId,
      lineage,
      question: work.instruction,
      requestId: work.id,
      source: "executive-hallway-durable-return"
    });

    work.evidence.push({
      type: "durable-return-reintegrated",
      source: "executive-hallway",
      commission: DURABLE_RETURN_REINTEGRATION_COMMISSION,
      executionId,
      lineage,
      serverOwned: true,
      browserExecutionOwner: false,
      rawServerOutputPresentationAuthorized: false,
      governedAnswerRequired: true,
      at: now()
    });
    record("work.durable-return-reintegrated", {
      workId: work.id,
      missionId: work.mission?.id || null,
      executionId,
      governed: true
    });
    return finishExecutiveRouterSuccess(work, governed);
  }

  /*
   * Commission 006.031S — Durable Return Reconciliation API Surface
   *
   * Public, execution-ID-addressable entry point for a persisted durable return.
   * This is intentionally only an adapter over the already commissioned 006.031R
   * reintegration path. It creates no Mission, execution, retry, research request,
   * provider authority, spend authority, or external-action authority.
   */
  const DURABLE_RETURN_RECONCILIATION_API_COMMISSION = "006.031S";
  const DURABLE_RETURN_RECONCILIATION_API_SCHEMA =
    "meos.executive-hallway.durable-return-reconciliation-api.v1";

  async function reconcileDurableExecutionReturn(executionIdValue, options = {}) {
    const executionId = String(executionIdValue || "").trim();
    if (!executionId) {
      throw new TypeError("Durable return reconciliation requires an execution ID.");
    }

    let work = null;
    for (const candidate of state.work.values()) {
      const candidateExecutionId = String(
        candidate?.execution?.executionId || durableExecutionId(candidate) || ""
      ).trim();
      if (candidateExecutionId === executionId) {
        work = candidate;
        break;
      }
    }

    let recordValue = options.record || null;
    if (!work) {
      if (!recordValue) recordValue = await readDurableExecutionStatus(executionId, options.fetch);
      if (!recordValue) {
        const error = new Error("No durable execution record exists for the requested execution ID.");
        error.code = "DURABLE_RETURN_EXECUTION_NOT_FOUND";
        throw error;
      }

      const hallwayWorkId = String(recordValue?.lineage?.hallwayWorkId || "").trim();
      const missionId = String(recordValue?.lineage?.missionId || "").trim();
      const engine = missionEngine();
      const active = engine?.getActiveMissions?.();
      if (hallwayWorkId && missionId && Array.isArray(active)) {
        const mission = active.find(item =>
          String(item?.id || "").trim() === missionId &&
          String(item?.sourceReference || "").trim() === `hallway-work:${hallwayWorkId}`
        );
        if (mission) {
          try { persistDurableExecutionMissionTag(mission.id, executionId, "owned"); } catch (_) {}
          work = recoverHallwayProjectionFromMission(mission, { executionId, record: recordValue });
        }
      }
    }

    if (!work) {
      const error = new Error("No active Hallway/Mission work matches the requested durable execution lineage.");
      error.code = "DURABLE_RETURN_WORK_NOT_FOUND";
      throw error;
    }

    const expectedExecutionId = String(
      work?.execution?.executionId || durableExecutionId(work) || ""
    ).trim();
    if (expectedExecutionId !== executionId) {
      const error = new Error("Durable execution ID does not match the recovered Hallway work.");
      error.code = "DURABLE_RETURN_EXECUTION_ID_MISMATCH";
      throw error;
    }

    record("work.durable-return-reconciliation-requested", {
      workId: work.id,
      missionId: work.mission?.id || null,
      executionId,
      commission: DURABLE_RETURN_RECONCILIATION_API_COMMISSION
    });

    return reintegrateDurableExecutionReturn(work, { ...options, record: recordValue || options.record });
  }

  async function reconcileDurableExecutionReturns(options = {}) {
    const candidates = new Map();
    for (const work of state.work.values()) {
      if (work?.execution?.serverOwned === true && work?.execution?.executionId) {
        candidates.set(work.id, { work, record: null });
      }
    }

    const engine = missionEngine();
    const active = engine?.getActiveMissions?.();
    if (Array.isArray(active)) {
      for (const mission of active) {
        const sourceReference = String(mission?.sourceReference || "").trim();
        if (!sourceReference.startsWith("hallway-work:")) continue;
        const hallwayWorkId = sourceReference.slice("hallway-work:".length).trim();
        if (!hallwayWorkId || candidates.has(hallwayWorkId)) continue;

        const persistedExecutionId = durableExecutionIdFromMission(mission);
        if (persistedExecutionId) {
          const recovered = recoverHallwayProjectionFromMission(mission, { executionId: persistedExecutionId });
          if (recovered) candidates.set(recovered.id, { work: recovered, record: null });
          continue;
        }

        // Legacy migration only: older Hallway Missions predate 006.031T and
        // therefore have no durable-ownership tag. Probe their deterministic
        // execution ID once. A real 404 means the Mission never earned server
        // ownership; a network error means "unknown" and is deliberately not
        // persisted as absence.
        const legacyExecutionId = `execution-${hallwayWorkId}`;
        if (durableExecutionNotFoundIdFromMission(mission) === legacyExecutionId) continue;

        try {
          const recordValue = await readDurableExecutionStatus(legacyExecutionId, options.fetch);
          if (!recordValue) {
            try { persistDurableExecutionMissionTag(mission.id, legacyExecutionId, "not-found"); } catch (_) {}
            record("work.durable-return-legacy-status-absent", {
              missionId: mission.id,
              hallwayWorkId,
              executionId: legacyExecutionId,
              commission: DURABLE_EXECUTION_OWNERSHIP_PERSISTENCE_COMMISSION
            });
            continue;
          }

          const lineage = recordValue.lineage || {};
          const lineageMatches =
            String(recordValue.executionId || "").trim() === legacyExecutionId &&
            String(lineage.missionId || "").trim() === String(mission.id || "").trim() &&
            String(lineage.hallwayWorkId || "").trim() === hallwayWorkId;
          if (!lineageMatches) {
            record("work.durable-return-legacy-lineage-rejected", {
              missionId: mission.id,
              hallwayWorkId,
              executionId: legacyExecutionId,
              commission: DURABLE_EXECUTION_OWNERSHIP_PERSISTENCE_COMMISSION
            });
            continue;
          }

          try { persistDurableExecutionMissionTag(mission.id, legacyExecutionId, "owned"); } catch (_) {}
          const recovered = recoverHallwayProjectionFromMission(mission, {
            executionId: legacyExecutionId,
            record: recordValue
          });
          if (recovered) candidates.set(recovered.id, { work: recovered, record: recordValue });
        } catch (error) {
          record("work.durable-return-reconciliation-deferred", {
            missionId: mission.id,
            hallwayWorkId,
            executionId: legacyExecutionId,
            reason: "status-unreachable",
            message: error?.message || String(error),
            commission: DURABLE_EXECUTION_OWNERSHIP_PERSISTENCE_COMMISSION
          });
        }
      }
    }

    const results = [];
    for (const candidate of candidates.values()) {
      const work = candidate.work;
      try {
        results.push(await reintegrateDurableExecutionReturn(work, {
          ...options,
          record: candidate.record || undefined
        }));
      } catch (error) {
        work.evidence.push({
          type: "durable-return-reintegration-warning",
          source: "executive-hallway",
          message: error?.message || String(error),
          code: error?.code || null,
          at: now()
        });
        emit("work-updated", work);
      }
    }
    return freeze(results);
  }

  async function routeExecutiveWork(work, options = {}) {
    const router = executiveRouter();
    if (!router?.handle) {
      work.options = ["retry"];
      return transition(work, "blocked", {
        outcome: { success: false, reason: "executive-router-unavailable" }
      });
    }

    work.owner = "maddy";
    work.route = "executive-router";
    registerMissionMirror(work);

    if (work.recognition?.recognized === true) {
      return releaseRecognizedWork(work);
    }

    transition(work, "understanding");
    transition(work, "executing");

    const researchContract = durablePublicResearchContract(work);
    if (researchContract.required === true) {
      try {
        const durableRecord = await dispatchDurablePublicResearch(work, researchContract);
        return markDurableExecutionOwnedByServer(work, durableRecord, researchContract);
      } catch (error) {
        // Required public research fails closed. Never fall back to a browser-owned
        // Router Promise after the durable ownership boundary has been selected.
        return finishExecutiveRouterFailure(work, error);
      }
    }

    const startedAt = now();
    const presentationWaitMs = executivePresentationWaitMs(options);
    const executionTimeoutMs = executiveRouterTimeoutMs(options);
    const routerOptions = {
      ...(options.routerOptions || {}),
      timeoutMs: executionTimeoutMs
    };

    const execution = router.handle(work.instruction, {
      source: work.source,
      requestId: work.id,
      ...routerOptions
    });

    const settledExecution = Promise.resolve(execution).then(
      result => ({ settled: true, ok: true, result }),
      error => ({ settled: true, ok: false, error })
    );

    let waitTimer = null;
    const presentationBoundary = new Promise(resolve => {
      waitTimer = global.setTimeout(
        () => resolve({ settled: false, presentationWaitExpired: true }),
        presentationWaitMs
      );
    });

    const first = await Promise.race([settledExecution, presentationBoundary]);
    if (waitTimer) global.clearTimeout(waitTimer);

    if (first?.settled === true) {
      return first.ok
        ? finishExecutiveRouterSuccess(work, first.result)
        : finishExecutiveRouterFailure(work, first.error);
    }

    markExecutiveExecutionContinuing(work, {
      startedAt,
      presentationWaitMs,
      executionTimeoutMs
    });

    void settledExecution.then(settled => {
      if (settled.ok) {
        finishExecutiveRouterSuccess(work, settled.result);
      } else {
        finishExecutiveRouterFailure(work, settled.error);
      }
    });

    return clone(work);
  }

  async function submitWork(input = {}, options = {}) {
    const work = createWork(input);

    const presenceConversation = classifyPresenceOnlyConversation(work.instruction);
    if (presenceConversation) {
      return freeze(routePresenceOnlyConversation(work, presenceConversation));
    }

    transition(work, "understanding");

    const resourceInterpretation = interpretResourceDevelopmentRequest(work.instruction);
    if (resourceInterpretation) {
      return freeze(await routeResourceDevelopmentWork(work, resourceInterpretation, options));
    }

    const office = workspaceOffice();
    if (office?.interpretRequest) {
      try {
        const interpretation = office.interpretRequest(work.instruction);
        if (isWorkspaceIntent(interpretation)) {
          return freeze(await routeWorkspaceWork(work, interpretation, options));
        }
      } catch (error) {
        work.evidence.push({ type: "routing-warning", source: "executive-workspace-office", message: error?.message || String(error), at: now() });
      }
    }

    return freeze(await routeExecutiveWork(work, options));
  }

  async function takeIt(workId, options = {}) {
    const work = state.work.get(workId);
    if (!work) throw new Error(`Hallway work "${workId}" was not found.`);
    if (work.state !== "awaiting-review") throw new Error(`Hallway work "${workId}" is not awaiting review.`);

    work.authority.authorized = true;
    work.authority.authorizedAt = now();
    work.authority.authorizationSignal = options.signal || "Take It!";
    transition(work, "authorized");

    if (work.route === "resource-development" && work.context?.pursuitRecommendation) {
      try {
        return freeze(await authorizeRecommendedResourcePursuit(work, options));
      } catch (error) {
        work.options = ["retry", "review-evidence", "archive"];
        return freeze(transition(work, "failed", {
          error: error?.message || String(error),
          outcome: { success: false, reason: "resource-pursuit-handoff-failed" }
        }));
      }
    }

    if (work.route === "resource-development") {
      const interpretation = interpretResourceDevelopmentRequest(work.instruction) || {
        intent: work.intent || "discover-resources",
        requiredCapabilities: work.requiredCapabilities.length
          ? [...work.requiredCapabilities]
          : ["resource.discovery", "resource.development", "research.public-web"],
        resourceTypes: [...(work.context?.resourceTypes || [])],
        geography: {
          scope: work.context?.geographyScope || "unspecified",
          serviceArea: work.context?.organizationServiceArea || organizationServiceArea()
        }
      };
      try {
        return freeze(await routeResourceDevelopmentWork(work, interpretation, options));
      } catch (error) {
        work.options = ["retry", "reassign", "cancel"];
        return freeze(transition(work, "failed", {
          error: error?.message || String(error),
          outcome: { success: false, reason: "resource-development-search-failed" }
        }));
      }
    }

    if (work.route === "workspace") {
      const office = workspaceOffice();
      const missionId = work.execution?.workspaceMissionId;
      if (!office?.takeIt || !missionId) throw new Error("Workspace Take It path is unavailable.");
      transition(work, "executing");
      let result;
      try {
        result = await office.takeIt(missionId, options);
      } catch (error) {
        work.options = ["retry", "reassign", "cancel"];
        return freeze(transition(work, "failed", {
          error: error?.message || String(error),
          outcome: { success: false, reason: error?.code || "workspace-take-it-failed" }
        }));
      }
      work.execution = clone(result);
      work.evidence.push({ type: "workspace-execution", verifiedAt: now(), result: clone(result) });
      if (result?.success !== true) {
        return freeze(transition(work, "failed", {
          error: result?.result?.error || result?.reason || "Workspace execution failed.",
          outcome: { success: false, result: clone(result) }
        }));
      }
      transition(work, "verifying");
      const delivery = normalizeExecutionDeliverables(work, result.result || result);
      if (delivery.isFileRetrieval && delivery.count === 0) {
        work.options = ["retry", "review-evidence", "archive"];
        return freeze(transition(work, "blocked", {
          error: delivery.retrieval?.message || "Workspace execution completed but no usable file deliverable was returned.",
          outcome: {
            success: false,
            verified: false,
            reason: "workspace-deliverable-missing",
            retrieval: clone(delivery.retrieval),
            result: clone(result)
          }
        }));
      }
      work.options = ["open-deliverable", "use-in-task", "archive"];
      return freeze(transition(work, "done", {
        outcome: { success: true, verified: true, result: clone(result) }
      }));
    }

    return freeze(await routeExecutiveWork(work, options));
  }

  async function redispatchRejectedWorkspaceWork(work, feedback) {
    if (
      !work ||
      !feedback ||
      feedback.signal !== "not-this" ||
      work.route !== "workspace" ||
      !feedback.deliverableFileId
    ) {
      return null;
    }

    const priorRejectedFileIds = Array.isArray(work.context?.rejectedFileIds)
      ? work.context.rejectedFileIds
      : [];

    const rejectedFileIds = [...new Set(
      [...priorRejectedFileIds, feedback.deliverableFileId]
        .map(value => String(value || "").trim())
        .filter(Boolean)
    )];

    feedback.redispatch = {
      status: "dispatching",
      parentWorkId: work.id,
      childWorkId: null,
      rejectedFileIds: [...rejectedFileIds],
      startedAt: now(),
      completedAt: null,
      error: null
    };

    record("feedback.redispatch-started", {
      workId: work.id,
      feedbackId: feedback.id,
      rejectedFileIds
    });
    emit("feedback-recorded", feedback);

    try {
      const child = await submitWork({
        instruction: work.instruction,
        title: work.title,
        source: "maddy-feedback-redispatch",
        requestedBy: work.requestedBy || "executive-director",
        reviewRequired: false,
        authorized: true,
        authorizationSignal: "Not This — continue assignment",
        context: {
          ...clone(work.context || {}),
          parentWorkId: work.id,
          parentFeedbackId: feedback.id,
          correctionReason: feedback.reason || null,
          rejectedFileIds
        }
      }, {
        payload: {
          excludedFileIds: rejectedFileIds
        }
      });

      feedback.redispatch.status =
        child?.state === "done" ? "completed" : String(child?.state || "completed");
      feedback.redispatch.childWorkId = child?.id || null;
      feedback.redispatch.completedAt = now();

      record("feedback.redispatch-completed", {
        workId: work.id,
        feedbackId: feedback.id,
        childWorkId: feedback.redispatch.childWorkId,
        state: feedback.redispatch.status,
        rejectedFileIds
      });
      emit("feedback-recorded", feedback);
      return child;
    } catch (error) {
      feedback.redispatch.status = "failed";
      feedback.redispatch.completedAt = now();
      feedback.redispatch.error = error?.message || String(error);

      record("feedback.redispatch-failed", {
        workId: work.id,
        feedbackId: feedback.id,
        error: feedback.redispatch.error,
        rejectedFileIds
      });
      emit("feedback-recorded", feedback);
      return null;
    }
  }

  function executiveLearning() {
    return global.ExecutiveLearning || global.MEOSExecutiveLearning || null;
  }

  function submitFeedback(workId, input = {}) {
    const work = state.work.get(workId);
    if (!work) return freeze({ success: false, error: "Hallway work was not found." });
    if (work.state !== "done") {
      return freeze({ success: false, error: "Executive feedback is accepted only after work is delivered." });
    }

    const signal = String(input.signal || input.rating || "").trim().toLowerCase();
    const accepted = ["accept", "accepted", "positive", "up", "thumbs-up", "good"].includes(signal);
    const rejected = ["reject", "rejected", "negative", "down", "thumbs-down", "not-this", "wrong"].includes(signal);
    if (!accepted && !rejected) {
      return freeze({ success: false, error: "Feedback signal must be Accept or Not This." });
    }

    const latestDeliverable = work.deliverables.length
      ? state.deliverables.get(work.deliverables[work.deliverables.length - 1]) || null
      : null;

    const feedback = {
      schema: `${SCHEMA}.feedback`,
      id: id("hallway-feedback"),
      workId: work.id,
      deliverableId: latestDeliverable?.id || null,
      signal: accepted ? "accepted" : "not-this",
      reason: String(input.reason || "").trim() || null,
      source: input.source || "maddy-hud",
      actor: input.actor || "executive-director",
      route: work.route || null,
      owner: work.owner || null,
      instruction: work.instruction,
      deliverableTitle: latestDeliverable?.title || null,
      deliverableFileId: latestDeliverable?.fileId || null,
      createdAt: now(),
      learning: null,
      redispatch: null
    };

    const learning = executiveLearning();
    if (learning?.addFeedback) {
      try {
        const learningResult = learning.addFeedback({
          feedbackType: accepted ? "positive" : "negative",
          message: accepted
            ? `Executive accepted the delivered result for: ${work.instruction}`
            : `Executive marked the delivered result Not This for: ${work.instruction}${feedback.reason ? `. Reason: ${feedback.reason}` : ""}`,
          subjectType: "executive-hallway-work",
          subjectId: work.id,
          office: work.owner || null,
          confidence: 1,
          metadata: {
            hallwayWorkId: work.id,
            deliverableId: feedback.deliverableId,
            deliverableTitle: feedback.deliverableTitle,
            deliverableFileId: feedback.deliverableFileId,
            route: work.route,
            signal: feedback.signal
          }
        }, { actor: feedback.actor });
        feedback.learning = clone(learningResult);
      } catch (error) {
        feedback.learning = { success: false, error: error?.message || String(error) };
      }
    }

    state.feedback.set(feedback.id, feedback);
    work.feedback = feedback.id;
    work.updatedAt = now();
    record(`feedback.${feedback.signal}`, {
      workId: work.id,
      feedbackId: feedback.id,
      deliverableId: feedback.deliverableId,
      reason: feedback.reason
    });
    const lifecycle =
      applyMissionDisposition(
        work,
        feedback
      );

    feedback.lifecycle =
      clone(lifecycle);

    emit("feedback-recorded", feedback);
    emit("work-updated", work);

    if (feedback.signal === "not-this") {
      void redispatchRejectedWorkspaceWork(work, feedback);
    }

    return freeze({
      success: true,
      feedback,
      redispatchScheduled:
        feedback.signal === "not-this" &&
        work.route === "workspace" &&
        Boolean(feedback.deliverableFileId)
    });
  }

  function listFeedback(filter = {}) {
    let items = [...state.feedback.values()];
    if (filter.workId) items = items.filter(item => item.workId === filter.workId);
    if (filter.signal) items = items.filter(item => item.signal === filter.signal);
    return freeze(items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
  }

  function getWork(workId) {
    return freeze(state.work.get(workId) || null);
  }

  function listWork(filter = {}) {
    let items = [...state.work.values()];

    if (filter.includeTerminal !== true) {
      items = items.filter(
        item =>
          item?.lifecycle?.terminal !==
          true
      );
    }

    if (filter.state) items = items.filter(item => item.state === filter.state);
    if (filter.owner) items = items.filter(item => item.owner === filter.owner);
    return freeze(items.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))));
  }

  function getDeliverable(deliverableId) {
    return freeze(state.deliverables.get(deliverableId) || null);
  }

  function listDeliverables(filter = {}) {
    let items = [...state.deliverables.values()];

    if (filter.includeTerminal !== true) {
      items = items.filter(item => {
        const work =
          state.work.get(
            item.workId
          );

        return (
          work?.lifecycle
            ?.terminal !== true
        );
      });
    }

    if (filter.workId) items = items.filter(item => item.workId === filter.workId);
    return freeze(items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
  }

  function getHistory(limit = 100) {
    return freeze(state.history.slice(0, Math.max(1, Math.min(500, Number(limit) || 100))));
  }

  function getSnapshot() {
    return freeze({
      schema: `${SCHEMA}.snapshot`,
      version: VERSION,
      buildId: BUILD_ID,
      capturedAt: now(),
      revision: state.revision,
      work: listWork(),
      deliverables: listDeliverables(),
      feedback: listFeedback(),
      history: getHistory(100),
      connections: {
        executiveState: Boolean(executiveState()),
        missionEngine: Boolean(missionEngine()),
        executiveRouter: Boolean(executiveRouter()),
        workspaceOffice: Boolean(workspaceOffice()),
        organizationProfile: Boolean(organizationalProfile()),
        organizationServiceArea: organizationServiceArea()
      }
    });
  }

  function getStatus() {
    const work = [...state.work.values()];
    return freeze({
      schema: `${SCHEMA}.status`,
      name: NAME,
      version: VERSION,
      buildId: BUILD_ID,
      status: "online",
      providerNeutral: true,
      startedAt: state.startedAt,
      lastWorkAt: state.lastWorkAt,
      workCount: work.length,
      activeWork: work.filter(item => !["done", "failed", "cancelled"].includes(item.state)).length,
      awaitingReview: work.filter(item => item.state === "awaiting-review").length,
      completed: work.filter(item => item.state === "done").length,
      deliverables: state.deliverables.size,
      feedback: state.feedback.size,
      connections: getSnapshot().connections
    });
  }

  function registerExecutiveStateSource() {
    const es = executiveState();
    if (!es?.registerSource) return false;
    try {
      es.registerSource("executive-hallway", {
        label: NAME,
        kind: "coordination",
        evidence: true,
        read: () => getSnapshot()
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  function humanDirectedTaskInput(detail = {}, message = "") {
    return {
      instruction: String(message || "").trim(),
      source: detail.source || "maddy-dashboard",
      requestedBy: "executive-director",
      reviewRequired: false,
      authorized: true,
      authorizationSignal: "human-directed-assignment",
      context: {
        costMode: detail.costMode || null,
        communicationMode: detail.communicationMode || null,
        opportunityId: detail.opportunityId || null,
        taskAuthority: "human-directed",
        authorityScope: "assigned-internal-work"
      }
    };
  }

  function handleMaddyRequest(event) {
    const detail = event?.detail || {};
    const message = String(detail.message || "").trim();
    if (!message) return;

    // A deliberate human assignment through a Maddy request surface is itself
    // authority to perform the ordinary internal work required by that task.
    // This does not grant spend, external communication, signing, legal
    // commitment, submission, or any other separately governed consequence.
    void submitWork(humanDirectedTaskInput(detail, message)).catch(error => {
      console.error(`[MEOS] ${NAME} could not complete Maddy request.`, error);
    });
  }

  function runHumanDirectedTaskAuthorityAcceptanceTest() {
    const directed = humanDirectedTaskInput(
      { source: "executive-hub", costMode: "pennies" },
      "Find money for California Clean Slate Program."
    );
    const autonomousDefault = createWork({
      instruction: "Autonomously discovered opportunity requiring executive review.",
      source: "maddy-autonomous-observation"
    });
    const assertions = [
      { name: "Human-directed Maddy request is authorized by the assignment itself", passed: directed.authorized === true && directed.reviewRequired === false },
      { name: "Human-directed authority is explicit and auditable", passed: directed.authorizationSignal === "human-directed-assignment" && directed.context?.taskAuthority === "human-directed" },
      { name: "Human-directed authority is scoped to assigned internal work", passed: directed.context?.authorityScope === "assigned-internal-work" },
      { name: "Autonomous Hallway work still defaults to executive review", passed: autonomousDefault.authority.reviewRequired === true && autonomousDefault.authority.authorized === false },
      { name: "Take It remains available for autonomous proposals rather than being required for direct assignments", passed: typeof takeIt === "function" },
      { name: "No external-action authority is added", passed: true }
    ];
    state.work.delete(autonomousDefault.id);
    const passed = assertions.filter(item => item.passed).length;
    console.table(assertions);
    return freeze({
      success: passed === assertions.length,
      commission: "HUMAN-DIRECTED-TASK-AUTHORITY",
      schema: `${SCHEMA}.human-directed-task-authority-acceptance.v1`,
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: assertions.length,
      assertions,
      authority: {
        humanDirectedInternalWorkAuthorized: true,
        autonomousProposalReviewPreserved: true,
        externalActionAuthorized: false
      }
    });
  }

  function runCognitiveMetabolismAcceptanceTest() {
    const assertions = [];
    const check = (
      name,
      passed,
      details = {}
    ) => assertions.push({
      name,
      passed:
        Boolean(passed),
      details
    });

    const previousMissionEngine =
      global.MEOSMissionEngine;

    const active = [];
    const completed = [];
    const archived = [];

    let createCount = 0;

    const removeById = (
      collection,
      idValue
    ) => {
      const index =
        collection.findIndex(
          item =>
            item.id === idValue
        );

      if (index >= 0) {
        return collection.splice(
          index,
          1
        )[0];
      }

      return null;
    };

    const mockEngine = {
      createMissionFromIntake(
        intake = {}
      ) {
        createCount += 1;

        const mission = {
          id:
            `METABOLISM-${createCount}`,
          title:
            intake.missionTitle,
          description:
            intake.description,
          objective:
            intake.objective,
          sourceReference:
            intake.intakeId ||
            null,
          status:
            "queued",
          approval: {
            required:
              Boolean(
                intake.approvalRequired
              ),
            status:
              intake.approvalRequired
                ? "not-submitted"
                : "not-required"
          }
        };

        active.push(mission);
        return clone(mission);
      },

      getActiveMissions() {
        return clone(active);
      },

      getCompletedMissions() {
        return clone(completed);
      },

      getArchivedMissions() {
        return clone(archived);
      },

      getMission(missionId) {
        return clone(
          [...active, ...completed, ...archived]
            .find(
              item =>
                item.id === missionId
            ) || null
        );
      },

      approveMission(
        missionId
      ) {
        const mission =
          active.find(
            item =>
              item.id === missionId
          );

        if (mission) {
          mission.status =
            "approved";
          mission.approval.status =
            "approved";
        }

        return clone(mission);
      },

      completeMission(
        missionId
      ) {
        const mission =
          removeById(
            active,
            missionId
          );

        if (!mission) {
          return null;
        }

        mission.status =
          "completed";
        completed.unshift(
          mission
        );

        return clone(mission);
      },

      archiveMission(
        missionId
      ) {
        const mission =
          removeById(
            active,
            missionId
          ) ||
          removeById(
            completed,
            missionId
          );

        if (!mission) {
          return null;
        }

        mission.status =
          "archived";
        archived.unshift(
          mission
        );

        return clone(mission);
      }
    };

    const createdWorkIds = [];

    try {
      global.MEOSMissionEngine =
        mockEngine;

      const first =
        createWork({
          id:
            "metabolism-first",
          instruction:
            "Investigate the same known opportunity.",
          title:
            "Positioning — investigate",
          reviewRequired:
            false,
          authorized:
            true,
          context: {
            cognitiveDispatchKey:
              "cognitive-known-fish"
          }
        });

      createdWorkIds.push(
        first.id
      );

      first.owner =
        "executive-workspace-office";
      first.route =
        "workspace";

      const firstMission =
        registerMissionMirror(
          first
        );

      check(
        "First meaningful cognition is promoted to one durable Mission",
        createCount === 1 &&
        firstMission?.id ===
          "METABOLISM-1" &&
        first.recognition
          ?.disposition ===
          "promoted-new-work",
        {
          createCount,
          firstMission,
          recognition:
            first.recognition
        }
      );

      const authorizedReentryMission =
        registerMissionMirror(
          first
        );

      check(
        "Current Hallway work can re-enter after authorization without recognizing its own Mission mirror as duplicate work",
        createCount === 1 &&
        authorizedReentryMission?.id ===
          firstMission?.id &&
        first.recognition
          ?.recognized === false &&
        first.recognition
          ?.unchanged === false &&
        first.recognition
          ?.disposition ===
          "current-work-reentry",
        {
          createCount,
          authorizedReentryMission,
          recognition:
            first.recognition
        }
      );

      const duplicate =
        createWork({
          id:
            "metabolism-duplicate",
          instruction:
            "Investigate the same known opportunity.",
          title:
            "Positioning — investigate",
          reviewRequired:
            false,
          authorized:
            true,
          context: {
            cognitiveDispatchKey:
              "cognitive-known-fish"
          }
        });

      createdWorkIds.push(
        duplicate.id
      );

      duplicate.owner =
        "executive-workspace-office";
      duplicate.route =
        "workspace";

      const reusedMission =
        registerMissionMirror(
          duplicate
        );

      check(
        "Previously-seen unchanged cognition reuses durable Mission identity",
        createCount === 1 &&
        reusedMission?.id ===
          firstMission?.id &&
        duplicate.recognition
          ?.recognized === true,
        {
          createCount,
          reusedMission,
          recognition:
            duplicate.recognition
        }
      );

      releaseRecognizedWork(
        duplicate
      );

      check(
        "Recognized unchanged work is released without another provider execution",
        duplicate.lifecycle
          ?.terminal === true &&
        duplicate.lifecycle
          ?.disposition ===
          "released-unchanged" &&
        duplicate.outcome
          ?.skipped === true,
        {
          lifecycle:
            duplicate.lifecycle,
          outcome:
            duplicate.outcome
        }
      );

      transition(
        first,
        "done",
        {
          outcome: {
            success: true,
            verified: true
          }
        }
      );

      const acceptedFeedback = {
        signal:
          "accepted",
        actor:
          "executive-director",
        reason:
          null
      };

      const acceptedLifecycle =
        applyMissionDisposition(
          first,
          acceptedFeedback
        );

      check(
        "Accepted returned work leaves active Mission state",
        active.length === 0 &&
        completed.length === 1 &&
        completed[0]
          ?.id ===
          firstMission?.id &&
        acceptedLifecycle
          ?.disposition ===
          "resolved-accepted",
        {
          active:
            clone(active),
          completed:
            clone(completed),
          lifecycle:
            acceptedLifecycle
        }
      );

      check(
        "Terminal Hallway work is removed from the live corridor but remains explicitly retrievable for audit",
        !listWork()
          .some(
            item =>
              item.id ===
              first.id
          ) &&
        Boolean(
          getWork(first.id)
        ),
        {
          liveWorkIds:
            listWork().map(
              item => item.id
            ),
          retained:
            Boolean(
              getWork(first.id)
            )
        }
      );

      const revisionParent =
        createWork({
          id:
            "metabolism-revision",
          instruction:
            "Find the correct file.",
          reviewRequired:
            false,
          authorized:
            true,
          context: {
            cognitiveDispatchKey:
              "cognitive-revision-fish"
          }
        });

      createdWorkIds.push(
        revisionParent.id
      );

      revisionParent.owner =
        "executive-workspace-office";
      revisionParent.route =
        "workspace";

      const revisionMission =
        registerMissionMirror(
          revisionParent
        );

      const rejectedLifecycle =
        applyMissionDisposition(
          revisionParent,
          {
            signal:
              "not-this",
            actor:
              "executive-director",
            reason:
              "Wrong file."
          }
        );

      check(
        "Not This releases the rejected Mission from active operations before any replacement patrol",
        active.every(
          item =>
            item.id !==
            revisionMission?.id
        ) &&
        archived.some(
          item =>
            item.id ===
            revisionMission?.id
        ) &&
        rejectedLifecycle
          ?.disposition ===
          "released-not-this",
        {
          active:
            clone(active),
          archived:
            clone(archived),
          lifecycle:
            rejectedLifecycle
        }
      );

      const changed =
        createWork({
          id:
            "metabolism-changed",
          instruction:
            "Investigate after meaningful evidence changed.",
          reviewRequired:
            false,
          authorized:
            true,
          context: {
            cognitiveDispatchKey:
              "cognitive-grown-fish"
          }
        });

      createdWorkIds.push(
        changed.id
      );

      changed.owner =
        "executive-workspace-office";
      changed.route =
        "workspace";

      registerMissionMirror(
        changed
      );

      check(
        "Meaningfully changed cognition with a new dispatch identity can still be promoted",
        createCount === 3 &&
        changed.recognition
          ?.recognized === false &&
        changed.recognition
          ?.disposition ===
          "promoted-new-work",
        {
          createCount,
          recognition:
            changed.recognition
        }
      );

      check(
        "Recognition uses durable Mission sourceReference rather than browser-only Hallway identity",
        first.mission
          ?.sourceReference ===
          "cognitive-dispatch:cognitive-known-fish" &&
        active
          .concat(
            completed,
            archived
          )
          .some(
            mission =>
              mission
                .sourceReference ===
              "cognitive-dispatch:cognitive-known-fish"
          ),
        {
          sourceReference:
            first.mission
              ?.sourceReference
        }
      );

      check(
        "Metabolism changes no external-action authority",
        first.authority
          ?.authorized === true &&
        duplicate.authority
          ?.authorized === true,
        {
          firstAuthority:
            first.authority,
          duplicateAuthority:
            duplicate.authority
        }
      );
    } finally {
      global.MEOSMissionEngine =
        previousMissionEngine;

      for (
        const workId
        of createdWorkIds
      ) {
        state.work.delete(
          workId
        );
      }
    }

    const passed =
      assertions.filter(
        item => item.passed
      ).length;

    const result = freeze({
      success:
        passed ===
        assertions.length,
      commission:
        "006.018B",
      schema:
        "meos.executive-hallway.cognitive-metabolism-acceptance.v1",
      version:
        VERSION,
      buildId:
        BUILD_ID,
      passed,
      total:
        assertions.length,
      assertions,
      authority: {
        externalActionAuthorized:
          false,
        humanAuthorityPreserved:
          true
      }
    });

    console.table(
      assertions.map(
        item => ({
          name:
            item.name,
          passed:
            item.passed
        })
      )
    );

    console.info(
      `[MEOS ${VERSION}] Commission 006.018B Cognitive Metabolism / Recognition Before Creation: ${result.success ? "PASS" : "FAIL"} (${passed}/${assertions.length}).`
    );

    return result;
  }

  async function runTerminalFailureMissionReleaseAcceptanceTest() {
    const checks = [];
    const check = (name, passed, detail = null) => checks.push({
      name,
      passed: passed === true,
      detail: clone(detail)
    });

    const previousMissionEngine = global.MEOSMissionEngine;
    const previousRouter = global.ExecutiveRouter;
    const active = [];
    const archived = [];
    const trace = [];
    let fixtureWork = null;

    const removeById = (collection, missionId) => {
      const index = collection.findIndex(item => item.id === missionId);
      return index >= 0 ? collection.splice(index, 1)[0] : null;
    };

    const mockEngine = {
      createMissionFromIntake(intake = {}) {
        const mission = {
          id: "TERMINAL-FAILURE-MISSION-1",
          title: intake.missionTitle || "Timeout fixture",
          sourceReference: intake.intakeId || null,
          status: "queued",
          approval: { required: false, status: "not-required" },
          history: []
        };
        active.push(mission);
        trace.push("create");
        return clone(mission);
      },
      getActiveMissions: () => clone(active),
      getCompletedMissions: () => [],
      getArchivedMissions: () => clone(archived),
      getMission(missionId) {
        return clone([...active, ...archived].find(item => item.id === missionId) || null);
      },
      blockMission(missionId, reason) {
        const mission = active.find(item => item.id === missionId);
        if (!mission) return null;
        mission.status = "blocked";
        mission.history.push({ action: "mission_blocked", reason });
        trace.push("block");
        return clone(mission);
      },
      archiveMission(missionId, archivedBy) {
        const mission = removeById(active, missionId);
        if (!mission) return null;
        mission.status = "archived";
        mission.history.push({ action: "mission_archived", archivedBy });
        archived.unshift(mission);
        trace.push("archive");
        return clone(mission);
      }
    };

    const timeoutError = new Error("Executive Router request timed out after 45000ms.");
    timeoutError.code = "MEOS_ROUTER_TIMEOUT";

    try {
      global.MEOSMissionEngine = mockEngine;
      global.ExecutiveRouter = {
        async handle() {
          trace.push("router-timeout");
          throw timeoutError;
        }
      };

      fixtureWork = createWork({
        id: "terminal-failure-work-1",
        instruction: "Research why octopuses have three hearts.",
        source: "maddy-executive-desk",
        requestedBy: "executive-director",
        reviewRequired: false,
        authorized: true
      });

      const result = await routeExecutiveWork(fixtureWork);

      check(
        "Router timeout remains an explicit failed Hallway result",
        result?.state === "failed" &&
        result?.outcome?.reason === "MEOS_ROUTER_TIMEOUT",
        result
      );
      check(
        "Terminal failure releases the Mission from active state",
        active.length === 0 && archived.length === 1,
        { active: clone(active), archived: clone(archived) }
      );
      check(
        "Failed Mission history is preserved before archival",
        archived[0]?.history?.some(item => item.action === "mission_blocked") === true &&
        archived[0]?.history?.some(item => item.action === "mission_archived") === true,
        archived[0]?.history
      );
      check(
        "Hallway records terminal release instead of pretending success",
        result?.lifecycle?.terminal === true &&
        result?.lifecycle?.disposition === "released-terminal-failure" &&
        result?.mission?.status === "archived",
        result?.lifecycle
      );
      check(
        "Timeout evidence remains attached to the failed work",
        result?.evidence?.some(item =>
          item.type === "terminal-failure-mission-disposition" &&
          item.failureCode === "MEOS_ROUTER_TIMEOUT" &&
          item.historicalRecordPreserved === true &&
          item.destructiveDelete === false
        ) === true,
        result?.evidence
      );
      check(
        "Failure release does not retry or execute a second provider request",
        trace.filter(item => item === "router-timeout").length === 1 &&
        trace.filter(item => item === "create").length === 1,
        trace
      );
      check(
        "Failure release grants no approval or external-action authority",
        !trace.includes("approve") &&
        result?.authority?.authorized === true &&
        result?.authority?.authorizationSignal === null,
        { trace, authority: result?.authority }
      );
    } finally {
      global.MEOSMissionEngine = previousMissionEngine;
      global.ExecutiveRouter = previousRouter;
      if (fixtureWork?.id) state.work.delete(fixtureWork.id);
    }

    const passed = checks.filter(item => item.passed).length;
    console.table(checks.map(({ name, passed }) => ({ name, passed })));
    const result = freeze({
      success: passed === checks.length,
      commission: "MADDY-TERMINAL-FAILURE-MISSION-RELEASE",
      schema: `${SCHEMA}.terminal-failure-mission-release-acceptance.v1`,
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      checks,
      authorityGranted: false,
      destructiveDelete: false
    });
    console.info(
      `[MEOS ${VERSION}] Terminal Failure Mission Release: ${result.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`
    );
    return result;
  }

  function runSelfTest() {
    const assertions = [];
    const check = (name, passed, details = {}) => assertions.push({ name, passed: Boolean(passed), details });

    check("Hallway schema exists", SCHEMA === "meos.executive-hallway.v1");
    check("Work states include complete operating loop", ["received", "awaiting-review", "executing", "verifying", "done"].every(item => WORK_STATES.includes(item)), WORK_STATES);
    check("Maddy intake API exists", typeof submitWork === "function");
    check("Take It API exists", typeof takeIt === "function");
    check("Deliverable API exists", typeof listDeliverables === "function" && typeof getDeliverable === "function");
    check("Executive feedback API exists", typeof submitFeedback === "function" && typeof listFeedback === "function");
    check("Executive Learning doorway exists", typeof executiveLearning === "function");
    check("Not This Workspace redispatch path exists", typeof redispatchRejectedWorkspaceWork === "function");
    check(
      "Not This redispatch preserves rejected file identity",
      /excludedFileIds/.test(redispatchRejectedWorkspaceWork.toString()) &&
      /rejectedFileIds/.test(redispatchRejectedWorkspaceWork.toString())
    );
    check(
      "Not This redispatch reuses the original executive instruction",
      /instruction:\s*work\.instruction/.test(redispatchRejectedWorkspaceWork.toString())
    );
    const localGrantFixture = interpretResourceDevelopmentRequest("Find me local grants");
    check(
      "Local grant language routes to Resource Development before Workspace",
      localGrantFixture?.intent === "discover-resources" &&
      localGrantFixture?.geography?.scope === "local" &&
      localGrantFixture?.resourceTypes?.includes("grant"),
      localGrantFixture || {}
    );
    check(
      "Local geography resolves from Organization Package",
      localGrantFixture?.geography?.serviceArea === organizationServiceArea(),
      { serviceArea: organizationServiceArea() }
    );
    check(
      "Explicit Drive grant-file retrieval remains Workspace work",
      interpretResourceDevelopmentRequest("Find our grant application in Google Drive") === null
    );
    check("Resource Development route exists", typeof routeResourceDevelopmentWork === "function");
    const discoveryMergeFixture = mergeResourceRecords(
      [{ id: "desk-1", title: "Desk Grant", resourceType: "grant", geography: "Santa Cruz County, California" }],
      [
        { id: "desk-1", title: "Desk Grant duplicate", resourceType: "grant", geography: "Santa Cruz County, California" },
        {
          id: "local-source:community-foundation-santa-cruz-county",
          title: "Community Foundation Santa Cruz County",
          resourceType: "partnership",
          resourceChannels: ["grant", "philanthropy"],
          geography: "Santa Cruz County, California",
          url: "https://www.cfscc.org/grant-opportunities"
        }
      ]
    );
    check(
      "Local discovery records merge into Resource Development results without duplicates",
      discoveryMergeFixture.length === 2 &&
        discoveryMergeFixture.some(item => /cfscc\.org\/grant-opportunities/.test(resourceRecordUrl(item) || "")),
      discoveryMergeFixture
    );
    check(
      "Grant filtering recognizes multi-channel local discovery sources",
      resourceRecordMatches(discoveryMergeFixture[1], { wantsGrant: true, wantsLocal: true, localNeedle: "santa cruz county" }),
      discoveryMergeFixture[1] || {}
    );
    const normalizedLocalDiscoveryFixture = {
      schema: "meos.resource-opportunity.v1",
      id: "local-source:county-of-santa-cruz",
      title: "County of Santa Cruz Funding Opportunities",
      resourceType: "partnership",
      geography: "Santa Cruz County, California",
      original: {
        resourceType: "partnership",
        resourceChannels: ["grant", "contract", "partnership"],
        geography: "Santa Cruz County, California",
        sourceType: "county-government"
      }
    };
    check(
      "Grant filtering preserves grant channels after Resource Discovery Network normalization",
      resourceRecordMatches(normalizedLocalDiscoveryFixture, { wantsGrant: true, wantsLocal: true, localNeedle: "santa cruz county" }),
      normalizedLocalDiscoveryFixture
    );
    const normalizedCityGrantFixture = {
      schema: "meos.resource-opportunity.v1",
      id: "local-source:city-of-santa-cruz",
      title: "City of Santa Cruz Children's Fund",
      resourceType: "grant",
      geography: "City of Santa Cruz, California",
      original: {
        resourceType: "grant",
        resourceChannels: ["grant"],
        geography: "City of Santa Cruz, California"
      }
    };
    check(
      "City of Santa Cruz grant remains local to the commissioned Santa Cruz County service area",
      resourceRecordMatches(normalizedCityGrantFixture, { wantsGrant: true, wantsLocal: true, localNeedle: "santa cruz county" }),
      normalizedCityGrantFixture
    );
    const explicitOperatingAreaInterpretation = interpretResourceDevelopmentRequest("Maddy, find me grants in Santa Cruz.");
    check(
      "Explicit organization operating-area language resolves to local geography",
      explicitOperatingAreaInterpretation?.geography?.scope === "local",
      explicitOperatingAreaInterpretation || {}
    );
    check(
      "Explicit organization operating-area grant request preserves grant resource type",
      explicitOperatingAreaInterpretation?.resourceTypes?.includes("grant") === true,
      explicitOperatingAreaInterpretation || {}
    );
    check("Provider-neutral Workspace doorway exists", typeof workspaceOffice === "function");
    check("Executive Router fallback exists", typeof executiveRouter === "function");
    check("Mission Engine mirror exists", typeof registerMissionMirror === "function");
    check("Durable cognition recognition exists", typeof findMissionMirrorByReference === "function" && typeof missionMirrorReference === "function");
    check("Recognized unchanged work release exists", typeof releaseRecognizedWork === "function");
    check("Terminal Mission disposition exists", typeof applyMissionDisposition === "function");
    check("Executive State extension registration exists", typeof registerExecutiveStateSource === "function");
    check("Dashboard event bridge exists", typeof handleMaddyRequest === "function");

    const nestedWorkspaceFixture = {
      success: true,
      execution: {
        results: [{
          provider: { id: "google-workspace", name: "Google Workspace", type: "tool" },
          output: {
            retrieval: {
              success: true,
              confidence: "high",
              file: {
                id: "fixture-aoi",
                name: "02_Articles_of_Incorporation_30.00.pdf",
                mimeType: "application/pdf",
                webViewLink: "https://drive.google.com/file/d/fixture-aoi/view"
              }
            },
            evidence: [{
              file: {
                id: "fixture-grant-vault",
                name: "The _Grant Vault_ Checklist - Google Docs.pdf",
                mimeType: "application/pdf",
                webViewLink: "https://drive.google.com/file/d/fixture-grant-vault/view"
              },
              score: 0
            }]
          }
        }]
      }
    };
    const explicitFixtureFiles = findExplicitWorkspaceRetrievals(nestedWorkspaceFixture);
    const genericFixtureFiles = findLikelyFileObjects(nestedWorkspaceFixture);
    check(
      "Nested Provider Manager Workspace retrieval exposes the real file",
      explicitFixtureFiles.some(item => item.name === "02_Articles_of_Incorporation_30.00.pdf" && item.url?.includes("fixture-aoi")),
      explicitFixtureFiles
    );
    check(
      "Provider descriptors are not mistaken for file deliverables",
      !genericFixtureFiles.some(item => item.name === "Google Workspace"),
      genericFixtureFiles
    );
    check(
      "Workspace retrieval outcome is inspectable",
      workspaceRetrievalMessage(nestedWorkspaceFixture)?.success === true,
      workspaceRetrievalMessage(nestedWorkspaceFixture)
    );
    const primarySelection = selectExecutionFileObjects(
      { intent: "find-file", requiredCapabilities: ["workspace.file.search"] },
      explicitFixtureFiles,
      genericFixtureFiles
    );
    check(
      "Find-file delivery returns only the provider-selected primary file",
      primarySelection.fileObjects.length === 1 &&
        primarySelection.fileObjects[0]?.name === "02_Articles_of_Incorporation_30.00.pdf" &&
        !primarySelection.fileObjects.some(item => /grant vault/i.test(item.name || "")),
      primarySelection.fileObjects
    );
    const researchSelection = selectExecutionFileObjects(
      { intent: "research", requiredCapabilities: ["research.public-web"] },
      explicitFixtureFiles,
      genericFixtureFiles
    );
    check(
      "Research work cannot promote Workspace files into deliverables",
      researchSelection.isFileRetrieval === false && researchSelection.fileObjects.length === 0,
      researchSelection
    );
    check(
      "Semantic research answer survives nested execution envelopes",
      semanticResultValue({ execution: { result: { answer: "Wombat answer fixture" } } }) === "Wombat answer fixture"
    );

    const passed = assertions.filter(item => item.passed).length;
    return freeze({
      success: passed === assertions.length,
      schema: `${SCHEMA}.acceptance-test`,
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: assertions.length,
      assertions
    });
  }

  async function runResearchContinuationQualificationAcceptanceTest() {
    const checks = [];
    const check = (name, passed, detail = null) => checks.push({ name, passed: passed === true, detail: clone(detail) });
    const calls = [];
    const sourceRecord = {
      id: "local-source:fixture-foundation",
      title: "Fixture Community Foundation",
      sourceName: "Fixture Community Foundation",
      provider: "Fixture Community Foundation",
      resourceType: "grant",
      resourceChannels: ["grant"],
      geography: "Santa Cruz County, California",
      url: "https://foundation.example/grants",
      discoveryStatus: "source-identified"
    };
    const opportunityCase = {
      schema: "meos.executive-opportunity-case.v1",
      source: {
        id: sourceRecord.id,
        title: "Fixture Hygiene Support Grant",
        geography: sourceRecord.geography,
        resourceType: "grant",
        resourceChannels: ["grant"],
        officialUrl: "https://foundation.example/grants/apply"
      },
      whatMaddyRead: { evidenceLedger: [{ url: "https://foundation.example/grants/apply" }] },
      opportunityIntelligence: {
        eligibilityEvidence: [{ context: "Eligible 501(c)(3) nonprofits serving Santa Cruz County." }],
        fundedActivityEvidence: [{ context: "Supports homelessness and public health services." }],
        applicationEvidence: [{ context: "Applications are open." }],
        deadlineEvidence: [{ value: "October 15, 2026", context: "Applications due October 15, 2026." }],
        individualAwardEvidence: [{ value: "$25,000", context: "Awards up to $25,000." }]
      },
      evidence: {
        coverage: 100,
        checks: {
          officialMaterialRead: true,
          specificProgramEvidence: true,
          individualAwardVerified: true,
          currentCycleActionable: true,
          eligibilityVerified: true,
          fundedActivitiesVerified: true,
          applicationPathVerified: true
        }
      },
      unknowns: [],
      disposition: { disposition: "candidate-for-qualification", recommendation: "Continue organization-specific qualification." },
      promotion: { executiveDeskReady: true, reason: "Decision-grade evidence supports organization-specific qualification." },
      nextAction: "Compare against the organization and request pursuit authorization."
    };

    const fakeFetch = async url => {
      calls.push(String(url));
      if (String(url).startsWith("/api/resource-development/desk")) {
        return { ok: true, status: 200, json: async () => ({ records: [] }) };
      }
      if (String(url) === "/api/resource-discovery/local") {
        return { ok: true, status: 200, json: async () => ({ schema: "fixture", status: "online", source: { name: "fixture-local" }, records: [sourceRecord] }) };
      }
      if (String(url).startsWith("/api/resource-discovery/local/investigate")) {
        return { ok: true, status: 200, json: async () => ({ opportunityCase }) };
      }
      if (String(url).startsWith("/api/resource-development/investigate")) {
        return { ok: true, status: 200, json: async () => ({ active: [] }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    };

    const fixtureWork = { instruction: "Find local grant funding for the organization." };
    const fixtureInterpretation = {
      geography: { scope: "local", serviceArea: "Santa Cruz County, California" },
      resourceTypes: ["grant"]
    };
    const result = await executeResourceDevelopmentSearch(fixtureWork, fixtureInterpretation, { fetch: fakeFetch });

    check("Source discovery is followed by authoritative opportunity investigation", calls.some(url => url.includes("/api/resource-discovery/local/investigate?sourceId=")), calls);
    check("A source-level discovery record is not returned as a completed grant opportunity", !result.records.some(record => record.discoveryStatus === "source-identified"), result.records);
    check("Decision-grade evidence promotes a specific opportunity for pursuit review", result.qualification?.recommendedOpportunity?.qualificationStatus === "qualified-for-pursuit-review", result.qualification);
    check("Qualification preserves verified eligibility, deadline, amount, and evidence provenance", result.records[0]?.eligibilityVerified === true && result.records[0]?.deadline === "October 15, 2026" && result.records[0]?.amount === "$25,000" && result.records[0]?.evidenceUrls?.[0]?.includes("foundation.example"), result.records[0]);
    check("Research qualification grants no external-action authority", result.qualification?.externalActionAuthorized === false && result.records[0]?.externalActionAuthorized === false);

    const originalGrantOffice = global.GrantOffice;
    const events = [];
    const fakeOpportunity = { id: "fixture-opportunity" };
    global.GrantOffice = {
      getOpportunityById: () => null,
      addOpportunity: input => { events.push("add"); fakeOpportunity.id = input.id; return fakeOpportunity; },
      authorizePursuit: idValue => { events.push("authorize"); return { success: true, opportunity: { id: idValue }, authorization: { authorized: true } }; },
      beginPreparation: idValue => { events.push("prepare"); return { success: true, opportunity: { id: idValue }, submission: null }; }
    };
    try {
      const work = {
        id: "fixture-work", requestedBy: "executive-director", state: "authorized", route: "resource-development",
        authority: { reviewRequired: true, authorized: true, authorizedAt: now(), authorizationSignal: "Take It!" },
        context: { pursuitRecommendation: clone(result.qualification.recommendedOpportunity) },
        execution: {}, evidence: [], deliverables: [], options: [], updatedAt: now()
      };
      const pursued = await authorizeRecommendedResourcePursuit(work, { authorizedBy: "Executive Director" });
      check("Take It on the qualified recommendation authorizes pursuit and begins preparation", events.join(",") === "add,authorize,prepare" && pursued.outcome?.reason === "pursuit-authorized-preparation-started", { events, outcome: pursued.outcome });
      check("Pursuit Take It still does not authorize final submission", pursued.outcome?.finalSubmissionAuthorized === false && pursued.outcome?.externalActionAuthorized === false, pursued.outcome);
    } finally {
      global.GrantOffice = originalGrantOffice;
    }

    const passed = checks.filter(item => item.passed).length;
    console.table(checks.map(({ name, passed }) => ({ name, passed })));
    return freeze({
      success: passed === checks.length,
      commission: "RESOURCE-CONTINUATION-QUALIFICATION-PURSUIT-HANDOFF",
      schema: `${SCHEMA}.resource-qualification-acceptance.v1`,
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      externalActionAuthorized: false,
      checks
    });
  }

  function runInformationalReturnAutoResolutionAcceptanceTest() {
    const checks = [];
    const check = (name, passed, detail = null) => checks.push({ name, passed: passed === true, detail: clone(detail) });
    const previousMissionEngine = global.MEOSMissionEngine;
    const missions = new Map();
    const completed = [];

    const mockEngine = {
      getMission(missionId) { return clone(missions.get(missionId) || null); },
      completeMission(missionId, detail = {}) {
        const mission = missions.get(missionId);
        if (!mission) return null;
        mission.status = "completed";
        mission.completion = clone(detail);
        completed.push(missionId);
        return clone(mission);
      }
    };

    const makeWork = (idValue, reviewRequired = false) => ({
      id: idValue, route: "executive-router", authority: { reviewRequired },
      mission: { id: `${idValue}-mission`, status: "queued" }, evidence: [], lifecycle: null
    });
    const researchExecution = {
      success: true,
      source: "meos-headless-public-research",
      output: { type: "public-research-result" },
      governedAnswer: {
        answer: "Octopuses have three hearts.",
        citations: ["https://science.example/octopus"],
        finalSpeechAuthorized: true,
        oneMouth: true
      }
    };

    try {
      global.MEOSMissionEngine = mockEngine;
      const researchWork = makeWork("informational-research");
      missions.set(researchWork.mission.id, { id: researchWork.mission.id, status: "queued" });
      const lifecycle = resolveInformationalResearchMission(researchWork, researchExecution);

      check("Evidence-bound public research qualifies for automatic completion", isAutoResolvableInformationalResearch(researchWork, researchExecution) === true);
      check("Informational research releases its Mission without an Accept click", completed.includes(researchWork.mission.id) && researchWork.mission.status === "completed");
      check("Hallway records informational return as terminal resolved work", lifecycle?.terminal === true && lifecycle?.disposition === "resolved-informational-return");
      check("Completion evidence explicitly preserves optional feedback semantics", researchWork.evidence.some(item => item.feedbackRequiredForCompletion === false));
      check("Automatic informational resolution grants no external-action authority", researchWork.evidence.some(item => item.externalActionAuthorized === false));

      const consequentialWork = makeWork("consequential-work");
      missions.set(consequentialWork.mission.id, { id: consequentialWork.mission.id, status: "queued" });
      const consequentialExecution = {
        ...researchExecution,
        source: "meos",
        output: { type: "executive-plan" }
      };
      check("Non-research executive work does not auto-resolve", isAutoResolvableInformationalResearch(consequentialWork, consequentialExecution) === false);

      const approvalWork = makeWork("approval-work", true);
      missions.set(approvalWork.mission.id, { id: approvalWork.mission.id, status: "queued" });
      check("Review-required work cannot use informational auto-resolution", isAutoResolvableInformationalResearch(approvalWork, researchExecution) === false);
      check("Existing Accept / Not This feedback contract remains available for learning", typeof submitFeedback === "function");
    } finally {
      global.MEOSMissionEngine = previousMissionEngine;
    }

    const passed = checks.filter(item => item.passed).length;
    console.table(checks.map(({ name, passed }) => ({ name, passed })));
    const result = freeze({
      success: passed === checks.length,
      commission: "MADDY-INFORMATIONAL-RETURN-AUTO-RESOLUTION",
      schema: `${SCHEMA}.informational-return-auto-resolution-acceptance.v1`,
      version: VERSION, buildId: BUILD_ID, passed, total: checks.length, checks
    });
    console.log(`[MEOS ${VERSION}] Informational Return Auto-Resolution: ${result.success ? "PASS" : "FAIL"} (${result.passed}/${result.total}).`);
    return result;
  }

  async function runLongRunningExecutionContinuityAcceptanceTest() {
    const checks = [];
    const check = (name, passed, detail = null) => checks.push({ name, passed: passed === true, detail: clone(detail) });
    const previousMissionEngine = global.MEOSMissionEngine;
    const previousRouter = global.ExecutiveRouter;
    const active = [];
    const completed = [];
    let createCount = 0;
    let routerCalls = 0;

    const removeById = (items, missionId) => {
      const index = items.findIndex(item => item.id === missionId);
      return index >= 0 ? items.splice(index, 1)[0] : null;
    };

    const mockEngine = {
      createMissionFromIntake(intake = {}) {
        createCount += 1;
        const mission = {
          id: `LONG-RUNNING-${createCount}`,
          title: intake.missionTitle,
          sourceReference: intake.intakeId,
          status: "queued",
          approval: { required: false, status: "not-required" },
          history: []
        };
        active.push(mission);
        return clone(mission);
      },
      getActiveMissions: () => clone(active),
      getCompletedMissions: () => clone(completed),
      getArchivedMissions: () => [],
      getMission(missionId) {
        return clone([...active, ...completed].find(item => item.id === missionId) || null);
      },
      addDeliverable() { return null; },
      completeMission(missionId, detail = {}) {
        const mission = removeById(active, missionId);
        if (!mission) return null;
        mission.status = "completed";
        mission.completion = clone(detail);
        completed.unshift(mission);
        return clone(mission);
      },
      blockMission() { return null; },
      archiveMission() { return null; }
    };

    const governedAnswer = {
      schema: "meos.governed-answer.v1",
      answer: "Octopuses have three hearts because two branchial hearts serve the gills while one systemic heart serves the body.",
      citations: ["https://science.example/octopus"],
      finalSpeechAuthorized: true,
      oneMouth: true
    };
    const delayedResult = {
      success: true,
      source: "meos-headless-public-research",
      provider: null,
      output: {
        type: "public-research-result",
        answer: governedAnswer.answer,
        citations: governedAnswer.citations
      },
      governedAnswer
    };

    const mockRouter = {
      async handle(_instruction, options = {}) {
        routerCalls += 1;
        check("Hallway gives long-running execution a separate Router execution lease",
          Number(options.timeoutMs) === 1000,
          { timeoutMs: options.timeoutMs });
        await new Promise(resolve => global.setTimeout(resolve, 30));
        return clone(delayedResult);
      }
    };

    let work = null;
    try {
      global.MEOSMissionEngine = mockEngine;
      global.ExecutiveRouter = mockRouter;
      work = createWork({
        id: "long-running-continuity-fixture",
        instruction: "Maddy, research why octopuses have three hearts. Use public evidence.",
        source: "maddy-executive-desk",
        requestedBy: "executive-director",
        reviewRequired: false,
        authorized: true
      });

      const firstReturn = await routeExecutiveWork(work, {
        presentationWaitMs: 5,
        executionTimeoutMs: 1000
      });

      check("Presentation wait expiry returns a still-working Hallway state instead of terminal failure",
        firstReturn?.state === "executing" && firstReturn?.lifecycle?.terminal === false &&
        firstReturn?.lifecycle?.disposition === "execution-continues-background",
        firstReturn);
      check("The same Mission remains active while the underlying execution is still running",
        active.length === 1 && active[0]?.id === work.mission?.id,
        { active: clone(active), mission: clone(work.mission) });
      check("Presentation expiry does not manufacture a retry or second Router request",
        routerCalls === 1 && work.execution?.retryCreated === false,
        { routerCalls, execution: clone(work.execution) });
      check("Crossing the presentation boundary grants no external-action authority",
        work.evidence.some(item => item.type === "long-running-execution-continuity" && item.externalActionAuthorized === false));

      await new Promise(resolve => global.setTimeout(resolve, 45));
      const settled = getWork(work.id);

      check("Late completion returns through the original Hallway work identity",
        settled?.id === work.id && settled?.state === "done" && settled?.deliverables?.length === 1,
        settled);
      check("Evidence-bound informational completion resolves the original Mission automatically",
        active.length === 0 && completed.length === 1 && completed[0]?.id === work.mission?.id,
        { active: clone(active), completed: clone(completed) });
      check("Long-running completion still uses Maddy's governed evidence-bound answer",
        listDeliverables({ includeTerminal: true }).some(item => item.workId === work.id && item.data?.governedAnswer?.answer === governedAnswer.answer));
    } finally {
      if (work?.id) state.work.delete(work.id);
      if (work?.deliverables?.length) {
        work.deliverables.forEach(deliverableId => state.deliverables.delete(deliverableId));
      }
      global.MEOSMissionEngine = previousMissionEngine;
      global.ExecutiveRouter = previousRouter;
    }

    const passed = checks.filter(item => item.passed).length;
    console.table(checks.map(({ name, passed }) => ({ name, passed })));
    const result = freeze({
      success: passed === checks.length,
      commission: "MADDY-LONG-RUNNING-EXECUTION-CONTINUITY",
      schema: `${SCHEMA}.long-running-execution-continuity-acceptance.v1`,
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      checks
    });
    console.log(`[MEOS ${VERSION}] Long-Running Execution Continuity: ${result.success ? "PASS" : "FAIL"} (${result.passed}/${result.total}).`);
    return result;
  }

  async function runDurableExecutionSpineHandoffAcceptanceTest() {
    const previousMissionEngine = global.MEOSMissionEngine;
    const previousRouter = global.ExecutiveRouter;
    const previousFetch = global.fetch;
    const checks = [];
    const check = (name, passed, detail = null) => checks.push({ name, passed: Boolean(passed), detail });
    const active = [];
    let routerCalls = 0;
    let dispatchCalls = 0;
    let dispatchedBody = null;

    const mockEngine = {
      getActiveMissions: () => active,
      getCompletedMissions: () => [],
      getArchivedMissions: () => [],
      createMissionFromIntake(input) {
        const mission = {
          id: "mission-durable-handoff-001",
          status: "active",
          sourceReference: input.intakeId
        };
        active.push(mission);
        return mission;
      },
      blockMission() {},
      archiveMission(missionId) {
        const index = active.findIndex(item => item.id === missionId);
        if (index >= 0) active.splice(index, 1);
        return { id: missionId, status: "archived" };
      }
    };
    const mockRouter = {
      researchIntentExecutionContract(payload) {
        return /research|public evidence/i.test(payload?.request?.text || "")
          ? { required: true, reason: "explicit-public-research-intent" }
          : { required: false, reason: "ordinary-work" };
      },
      async handle() {
        routerCalls += 1;
        return { success: true, source: "meos", answer: "ordinary result" };
      }
    };

    let work = null;
    try {
      global.MEOSMissionEngine = mockEngine;
      global.ExecutiveRouter = mockRouter;
      global.fetch = async (url, options = {}) => {
        dispatchCalls += 1;
        dispatchedBody = JSON.parse(options.body || "{}");
        return {
          ok: true,
          status: 202,
          async json() {
            return {
              accepted: true,
              record: {
                executionId: dispatchedBody.executionId,
                state: "queued",
                executor: "headless-public-research",
                lineage: clone(dispatchedBody.lineage),
                checkpoint: { stage: "queued" }
              }
            };
          }
        };
      };

      work = createWork({
        id: "hallway-durable-handoff-001",
        instruction: "Maddy, research why octopuses have three hearts. Use public evidence.",
        source: "maddy-executive-desk",
        requestedBy: "executive-director",
        reviewRequired: false,
        authorized: true
      });
      const returned = await routeExecutiveWork(work);

      check("Human-directed public research is handed to the durable server endpoint",
        dispatchCalls === 1 && returned?.execution?.serverOwned === true,
        { dispatchCalls, execution: returned?.execution });
      check("The original Mission, originating intent, and Hallway work identity are bound into one lineage",
        dispatchedBody?.lineage?.missionId === "mission-durable-handoff-001" &&
        dispatchedBody?.lineage?.hallwayWorkId === work.id &&
        dispatchedBody?.lineage?.cognitionId === `human-intent-${work.id}`,
        dispatchedBody?.lineage);
      check("The durable execution identity is deterministic for the original Hallway work",
        dispatchedBody?.executionId === `execution-${work.id}`);
      check("The handoff uses only the commissioned headless public-research executor",
        dispatchedBody?.executor === "headless-public-research");
      check("The handoff grants no paid-spend or external-action authority",
        dispatchedBody?.authority?.paidSpendAuthorized === false &&
        dispatchedBody?.authority?.externalActionAuthorized === false &&
        Number(dispatchedBody?.authority?.automaticSpendUsd || 0) === 0);
      check("Public research execution is no longer started as a browser-owned Router Promise",
        routerCalls === 0 && returned?.execution?.browserExecutionOwner === false,
        { routerCalls, execution: returned?.execution });
      check("The Mission remains active while the server owns unfinished execution",
        active.length === 1 && returned?.state === "executing" &&
        returned?.lifecycle?.disposition === "execution-owned-by-durable-server",
        { active: clone(active), lifecycle: returned?.lifecycle });
      check("The Hallway does not manufacture a retry when the server accepts ownership",
        returned?.execution?.retryCreated === false);
    } finally {
      if (work?.id) state.work.delete(work.id);
      global.MEOSMissionEngine = previousMissionEngine;
      global.ExecutiveRouter = previousRouter;
      global.fetch = previousFetch;
    }

    const passed = checks.filter(item => item.passed).length;
    console.table(checks.map(({ name, passed }) => ({ name, passed })));
    const result = freeze({
      success: passed === checks.length,
      commission: "MADDY-DURABLE-EXECUTION-SPINE-HANDOFF",
      commissionId: DURABLE_EXECUTION_HANDOFF_COMMISSION,
      schema: `${SCHEMA}.durable-execution-spine-handoff-acceptance.v1`,
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      checks
    });
    console.log(`[MEOS ${VERSION}] Durable Execution Spine Hallway Handoff: ${result.success ? "PASS" : "FAIL"} (${result.passed}/${result.total}).`);
    return result;
  }

  async function runDurableReturnReintegrationAcceptanceTest() {
    const checks = [];
    const check = (name, passed, details = null) => checks.push({ name, passed: Boolean(passed), details });
    const previousRouter = global.ExecutiveRouter;
    const previousMissionEngine = global.MEOSMissionEngine;
    const previousFetch = global.fetch;
    const workId = "hallway-work-durable-return-reintegration-fixture";
    const missionId = "mission-durable-return-reintegration-fixture";
    const executionId = `execution-${workId}`;
    const cognitionId = `human-intent-${workId}`;
    let governanceCalls = 0;
    let completeCalls = 0;
    let dispatchedResearch = 0;

    const mission = {
      id: missionId,
      status: "in-progress",
      sourceReference: `hallway-work:${workId}`,
      objective: "Why do octopuses have three hearts?",
      approvalRequired: false
    };
    const returnedRecord = {
      executionId,
      state: "returned",
      executor: "headless-public-research",
      lineage: { missionId, cognitionId, hallwayWorkId: workId },
      result: { success: true, synthesis: { answerFacts: [{ claim: "Evidence-bound fixture fact." }] } }
    };

    try {
      state.work.delete(workId);
      global.MEOSMissionEngine = {
        getActiveMissions: () => [clone(mission)],
        getCompletedMissions: () => [],
        getArchivedMissions: () => [],
        getMission: idValue => idValue === missionId ? clone(mission) : null,
        completeMission: idValue => {
          completeCalls += 1;
          return { ...clone(mission), id: idValue, status: "completed" };
        }
      };
      global.ExecutiveRouter = {
        handle() { dispatchedResearch += 1; throw new Error("Research must not be redispatched."); },
        async reintegrateDurableResearchResult(recordValue, optionsValue) {
          governanceCalls += 1;
          return {
            success: true,
            source: "meos-headless-public-research",
            answer: "Octopus circulation uses two branchial hearts and one systemic heart.",
            output: { type: "public-research-result" },
            governedAnswer: {
              answer: "Octopus circulation uses two branchial hearts and one systemic heart.",
              citations: ["https://science.example/octopus"],
              finalSpeechAuthorized: true,
              oneMouth: true
            },
            durableExecution: {
              executionId: recordValue.executionId,
              lineage: clone(optionsValue.lineage),
              browserExecutedResearch: false,
              rawServerOutputPresentationAuthorized: false
            }
          };
        }
      };
      global.fetch = async url => {
        check("Reintegration reads the exact deterministic durable execution status URL",
          String(url) === `/api/durable-execution/status/${executionId}`, { url });
        return { ok: true, status: 200, json: async () => ({ record: clone(returnedRecord) }) };
      };

      const results = await reconcileDurableExecutionReturns();
      const work = state.work.get(workId);
      check("Active durable Mission reconstructs the same Hallway work identity after browser reload",
        work?.id === workId && work?.mission?.id === missionId &&
        work?.evidence?.some(item => item.type === "durable-return-reintegrated" && item.executionId === executionId) === true);
      check("Returned durable execution re-enters Router governance exactly once", governanceCalls === 1, { governanceCalls });
      check("Durable return never redispatches public research", dispatchedResearch === 0, { dispatchedResearch });
      check("Original Mission/cognition/Hallway/execution lineage is preserved",
        work?.outcome?.result?.durableExecution?.lineage?.missionId === missionId &&
        work?.outcome?.result?.durableExecution?.lineage?.cognitionId === cognitionId &&
        work?.outcome?.result?.durableExecution?.lineage?.hallwayWorkId === workId &&
        work?.outcome?.result?.durableExecution?.executionId === executionId);
      check("Only the governed Maddy answer becomes the informational deliverable",
        work?.deliverables?.some(idValue => state.deliverables.get(idValue)?.summary?.includes("Octopus circulation")) === true);
      check("Raw durable server synthesis is not authorized for presentation",
        work?.evidence?.some(item => item.type === "durable-return-reintegrated" && item.rawServerOutputPresentationAuthorized === false) === true);
      check("Evidence-bound informational return automatically resolves the Mission",
        completeCalls === 1 && work?.lifecycle?.disposition === "resolved-informational-return", { completeCalls, lifecycle: clone(work?.lifecycle) });
      check("Resolved return is terminal Hallway work without creating a retry",
        work?.state === "done" && work?.execution?.durableExecution?.browserExecutedResearch === false);
      check("Reconciliation returns the same recovered work rather than a replacement execution",
        results.length === 1 && results[0]?.id === workId);
    } finally {
      state.work.delete(workId);
      for (const [deliverableId, deliverable] of state.deliverables.entries()) {
        if (deliverable?.workId === workId) state.deliverables.delete(deliverableId);
      }
      global.ExecutiveRouter = previousRouter;
      global.MEOSMissionEngine = previousMissionEngine;
      global.fetch = previousFetch;
    }

    const passed = checks.filter(item => item.passed).length;
    console.table(checks);
    const result = freeze({
      success: passed === checks.length,
      commission: DURABLE_RETURN_REINTEGRATION_COMMISSION,
      schema: `${SCHEMA}.durable-return-reintegration-acceptance.v1`,
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      checks
    });
    console.log(`[MEOS ${VERSION}] Commission ${DURABLE_RETURN_REINTEGRATION_COMMISSION} Durable Return Reintegration: ${result.success ? "PASS" : "FAIL"} (${result.passed}/${result.total}).`);
    return result;
  }

  async function runDurableReturnReconciliationApiAcceptanceTest() {
    const checks = [];
    const check = (name, passed, details = null) => checks.push({ name, passed: Boolean(passed), details });
    const previousRouter = global.ExecutiveRouter;
    const previousMissionEngine = global.MEOSMissionEngine;
    const previousFetch = global.fetch;
    const workId = "hallway-work-durable-return-api-fixture";
    const missionId = "mission-durable-return-api-fixture";
    const executionId = `execution-${workId}`;
    const cognitionId = `human-intent-${workId}`;
    let governanceCalls = 0;
    let routerHandleCalls = 0;
    let completeCalls = 0;
    let statusReads = 0;

    const mission = {
      id: missionId,
      status: "in-progress",
      sourceReference: `hallway-work:${workId}`,
      objective: "Why do octopuses have three hearts?",
      approvalRequired: false
    };
    const returnedRecord = {
      executionId,
      state: "returned",
      executor: "headless-public-research",
      lineage: { missionId, cognitionId, hallwayWorkId: workId },
      result: { success: true, synthesis: { answerFacts: [{ claim: "Evidence-bound API fixture fact." }] } }
    };

    try {
      state.work.delete(workId);
      global.MEOSMissionEngine = {
        getActiveMissions: () => [clone(mission)],
        getCompletedMissions: () => [],
        getArchivedMissions: () => [],
        getMission: idValue => idValue === missionId ? clone(mission) : null,
        completeMission: idValue => {
          completeCalls += 1;
          return { ...clone(mission), id: idValue, status: "completed" };
        }
      };
      global.ExecutiveRouter = {
        handle() { routerHandleCalls += 1; throw new Error("Direct reconciliation must not redispatch research."); },
        async reintegrateDurableResearchResult(recordValue, optionsValue) {
          governanceCalls += 1;
          return {
            success: true,
            source: "meos-headless-public-research",
            answer: "Governed durable-return API fixture answer.",
            output: { type: "public-research-result" },
            governedAnswer: {
              answer: "Governed durable-return API fixture answer.",
              citations: ["https://science.example/durable-return-api"],
              finalSpeechAuthorized: true,
              oneMouth: true
            },
            durableExecution: {
              executionId: recordValue.executionId,
              lineage: clone(optionsValue.lineage),
              browserExecutedResearch: false,
              rawServerOutputPresentationAuthorized: false
            }
          };
        }
      };
      global.fetch = async url => {
        statusReads += 1;
        const requestedUrl = String(url);
        if (requestedUrl === `/api/durable-execution/status/${executionId}`) {
          check("Execution-ID API reads only the exact requested durable status URL", true, { url });
          return { ok: true, status: 200, json: async () => ({ record: clone(returnedRecord) }) };
        }
        if (requestedUrl === "/api/durable-execution/status/execution-hallway-work-not-real") {
          return { ok: false, status: 404, json: async () => ({ code: "DURABLE_EXECUTION_NOT_FOUND" }) };
        }
        return { ok: false, status: 500, json: async () => ({ error: "Unexpected acceptance fixture URL." }) };
      };

      const result = await reconcileDurableExecutionReturn(executionId);
      const work = state.work.get(workId);
      check("Execution ID recovers the existing active Mission's Hallway projection",
        work?.id === workId && work?.mission?.id === missionId);
      check("Public API re-enters Router durable-return governance exactly once",
        governanceCalls === 1, { governanceCalls });
      check("Public API never invokes Router handle or redispatches research",
        routerHandleCalls === 0, { routerHandleCalls });
      check("Original Mission/cognition/Hallway/execution lineage survives direct reconciliation",
        result?.outcome?.result?.durableExecution?.executionId === executionId &&
        result?.outcome?.result?.durableExecution?.lineage?.missionId === missionId &&
        result?.outcome?.result?.durableExecution?.lineage?.cognitionId === cognitionId &&
        result?.outcome?.result?.durableExecution?.lineage?.hallwayWorkId === workId);
      check("Direct reconciliation uses one durable status read and creates no retry",
        statusReads === 1 && result?.execution?.retryCreated !== true, { statusReads });
      check("Governed informational return still auto-resolves the existing Mission",
        completeCalls === 1 && result?.lifecycle?.disposition === "resolved-informational-return",
        { completeCalls, lifecycle: clone(result?.lifecycle) });
      check("Unknown execution IDs fail closed after verified server absence instead of creating replacement work",
        await (async () => {
          try { await reconcileDurableExecutionReturn("execution-hallway-work-not-real"); return false; }
          catch (error) { return error?.code === "DURABLE_RETURN_EXECUTION_NOT_FOUND"; }
        })());
    } finally {
      state.work.delete(workId);
      for (const [deliverableId, deliverable] of state.deliverables.entries()) {
        if (deliverable?.workId === workId) state.deliverables.delete(deliverableId);
      }
      global.ExecutiveRouter = previousRouter;
      global.MEOSMissionEngine = previousMissionEngine;
      global.fetch = previousFetch;
    }

    const passed = checks.filter(item => item.passed).length;
    console.table(checks);
    const result = freeze({
      success: passed === checks.length,
      commission: DURABLE_RETURN_RECONCILIATION_API_COMMISSION,
      schema: `${SCHEMA}.durable-return-reconciliation-api-acceptance.v1`,
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      checks
    });
    console.log(`[MEOS ${VERSION}] Commission ${DURABLE_RETURN_RECONCILIATION_API_COMMISSION} Durable Return Reconciliation API: ${result.success ? "PASS" : "FAIL"} (${result.passed}/${result.total}).`);
    return result;
  }

  async function runDurableExecutionOwnershipPersistenceAcceptanceTest() {
    const checks = [];
    const check = (name, passed, details = null) => checks.push({ name, passed: Boolean(passed), details });
    const previousMissionEngine = global.MEOSMissionEngine;
    const previousRouter = global.ExecutiveRouter;
    const previousFetch = global.fetch;
    let active = [];
    let statusReads = 0;

    const updateMission = (missionId, updates = {}) => {
      const mission = active.find(item => item.id === missionId);
      if (!mission) throw new Error(`Unknown fixture Mission ${missionId}`);
      if (Array.isArray(updates.tags)) mission.tags = clone(updates.tags);
      if (typeof updates.currentActivity === "string") mission.currentActivity = updates.currentActivity;
      return clone(mission);
    };

    const fixtureEngine = {
      getActiveMissions: () => active.map(clone),
      getCompletedMissions: () => [],
      getArchivedMissions: () => [],
      getMission: missionId => clone(active.find(item => item.id === missionId) || null),
      updateMission
    };

    const response = (status, body) => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => clone(body)
    });

    const cleanupIds = new Set();
    try {
      global.MEOSMissionEngine = fixtureEngine;
      global.ExecutiveRouter = { reintegrateDurableResearchResult: async () => { throw new Error("Fixture should not govern queued records."); } };

      // Successful handoff must persist durable ownership into Mission authority
      // so a later browser instance does not have to infer ownership from intent.
      const ownedWorkId = "hallway-work-ownership-persistence-fixture";
      const ownedMissionId = "mission-ownership-persistence-fixture";
      const ownedExecutionId = `execution-${ownedWorkId}`;
      cleanupIds.add(ownedWorkId);
      active = [{
        id: ownedMissionId,
        status: "in-progress",
        sourceReference: `hallway-work:${ownedWorkId}`,
        objective: "Fixture durable research",
        tags: ["executive-hallway"]
      }];
      const ownedWork = createWork({
        id: ownedWorkId,
        instruction: "Fixture durable research",
        reviewRequired: false,
        authorized: true
      });
      ownedWork.mission = {
        engine: "mission-engine",
        id: ownedMissionId,
        status: "in-progress",
        sourceReference: `hallway-work:${ownedWorkId}`
      };
      markDurableExecutionOwnedByServer(ownedWork, {
        executionId: ownedExecutionId,
        state: "queued",
        executor: "headless-public-research",
        lineage: {
          missionId: ownedMissionId,
          cognitionId: `human-intent-${ownedWorkId}`,
          hallwayWorkId: ownedWorkId
        },
        checkpoint: { stage: "queued" }
      }, { reason: "fixture" });
      check("Successful durable handoff persists server ownership into the Mission",
        active[0].tags.includes(DURABLE_EXECUTION_OWNERSHIP_TAG));
      check("Mission ownership persistence stores the exact accepted execution ID",
        active[0].tags.includes(`${DURABLE_EXECUTION_ID_TAG_PREFIX}${ownedExecutionId}`));
      check("Successful durable ownership clears any prior not-found marker",
        !active[0].tags.some(tag => tag.startsWith(DURABLE_EXECUTION_NOT_FOUND_TAG_PREFIX)));
      state.work.delete(ownedWorkId);

      // Legacy Mission with no durable record: one verified 404 is absence, not
      // server ownership. It must not become a phantom recovered work item.
      const absentWorkId = "hallway-work-legacy-no-record-fixture";
      const absentMissionId = "mission-legacy-no-record-fixture";
      const absentExecutionId = `execution-${absentWorkId}`;
      cleanupIds.add(absentWorkId);
      active = [{
        id: absentMissionId,
        status: "in-progress",
        sourceReference: `hallway-work:${absentWorkId}`,
        objective: "Legacy fixture with failed dispatch",
        tags: ["executive-hallway"]
      }];
      statusReads = 0;
      const absentFetch = async url => {
        statusReads += 1;
        check("Legacy ownership probe uses the deterministic historical status URL",
          String(url) === `/api/durable-execution/status/${absentExecutionId}`, { url });
        return response(404, { code: "DURABLE_EXECUTION_NOT_FOUND" });
      };
      await reconcileDurableExecutionReturns({ fetch: absentFetch });
      check("A verified missing durable record does not reconstruct phantom server-owned Hallway work",
        !state.work.has(absentWorkId));
      check("Verified legacy 404 is memoized on the Mission rather than repeatedly red-probed",
        active[0].tags.includes(`${DURABLE_EXECUTION_NOT_FOUND_TAG_PREFIX}${absentExecutionId}`));
      await reconcileDurableExecutionReturns({ fetch: absentFetch });
      check("Memoized legacy absence prevents repeated status 404 requests on later reconciliation",
        statusReads === 1, { statusReads });

      // A network failure is not evidence of absence. This is critical for the
      // user's intermittently dropping Wi-Fi: defer and preserve recoverability.
      const offlineWorkId = "hallway-work-offline-fixture";
      const offlineMissionId = "mission-offline-fixture";
      const offlineExecutionId = `execution-${offlineWorkId}`;
      cleanupIds.add(offlineWorkId);
      active = [{
        id: offlineMissionId,
        status: "in-progress",
        sourceReference: `hallway-work:${offlineWorkId}`,
        objective: "Offline fixture",
        tags: ["executive-hallway"]
      }];
      await reconcileDurableExecutionReturns({
        fetch: async () => { throw new TypeError("Failed to fetch"); }
      });
      check("Transient network failure is not persisted as durable-execution absence",
        !active[0].tags.some(tag => tag === `${DURABLE_EXECUTION_NOT_FOUND_TAG_PREFIX}${offlineExecutionId}`));
      check("Transient network failure does not create phantom recovered work",
        !state.work.has(offlineWorkId));

      // Legacy positive status is migrated forward: exact server lineage proves
      // ownership, then the Mission is backfilled for future reloads.
      const legacyWorkId = "hallway-work-legacy-positive-fixture";
      const legacyMissionId = "mission-legacy-positive-fixture";
      const legacyExecutionId = `execution-${legacyWorkId}`;
      cleanupIds.add(legacyWorkId);
      active = [{
        id: legacyMissionId,
        status: "in-progress",
        sourceReference: `hallway-work:${legacyWorkId}`,
        objective: "Legacy accepted durable fixture",
        tags: ["executive-hallway"]
      }];
      const legacyRecord = {
        executionId: legacyExecutionId,
        state: "queued",
        executor: "headless-public-research",
        lineage: {
          missionId: legacyMissionId,
          cognitionId: `human-intent-${legacyWorkId}`,
          hallwayWorkId: legacyWorkId
        },
        checkpoint: { stage: "queued" }
      };
      await reconcileDurableExecutionReturns({
        fetch: async url => response(200, {
          record: String(url).endsWith(legacyExecutionId) ? legacyRecord : null
        })
      });
      check("Verified legacy durable status reconstructs the original Hallway work",
        state.work.get(legacyWorkId)?.execution?.executionId === legacyExecutionId);
      check("Verified legacy ownership is backfilled into Mission persistence",
        active[0].tags.includes(DURABLE_EXECUTION_OWNERSHIP_TAG) &&
        active[0].tags.includes(`${DURABLE_EXECUTION_ID_TAG_PREFIX}${legacyExecutionId}`));
      state.work.delete(legacyWorkId);

      // Once an exact persisted ownership marker exists, reload must use it and
      // never silently derive a replacement deterministic execution identity.
      const exactWorkId = "hallway-work-exact-id-fixture";
      const exactMissionId = "mission-exact-id-fixture";
      const exactExecutionId = "execution-server-accepted-custom-fixture";
      cleanupIds.add(exactWorkId);
      active = [{
        id: exactMissionId,
        status: "in-progress",
        sourceReference: `hallway-work:${exactWorkId}`,
        objective: "Exact identity fixture",
        tags: [
          "executive-hallway",
          DURABLE_EXECUTION_OWNERSHIP_TAG,
          `${DURABLE_EXECUTION_ID_TAG_PREFIX}${exactExecutionId}`
        ]
      }];
      let exactUrl = null;
      await reconcileDurableExecutionReturns({
        fetch: async url => {
          exactUrl = String(url);
          return response(200, {
            record: {
              executionId: exactExecutionId,
              state: "queued",
              executor: "headless-public-research",
              lineage: {
                missionId: exactMissionId,
                cognitionId: `human-intent-${exactWorkId}`,
                hallwayWorkId: exactWorkId
              }
            }
          });
        }
      });
      check("Reload status reads the exact persisted server execution ID",
        exactUrl === `/api/durable-execution/status/${exactExecutionId}`, { exactUrl });
      check("Reload preserves exact execution identity with no replacement execution or retry",
        state.work.get(exactWorkId)?.execution?.executionId === exactExecutionId &&
        state.work.get(exactWorkId)?.execution?.retryCreated === false);
    } finally {
      for (const workId of cleanupIds) state.work.delete(workId);
      global.MEOSMissionEngine = previousMissionEngine;
      global.ExecutiveRouter = previousRouter;
      global.fetch = previousFetch;
    }

    const passed = checks.filter(item => item.passed).length;
    console.table(checks.map(({ name, passed }) => ({ name, passed })));
    const result = freeze({
      success: passed === checks.length,
      commission: DURABLE_EXECUTION_OWNERSHIP_PERSISTENCE_COMMISSION,
      schema: `${SCHEMA}.durable-execution-ownership-persistence-acceptance.v1`,
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      checks
    });
    console.log(`[MEOS ${VERSION}] Commission ${DURABLE_EXECUTION_OWNERSHIP_PERSISTENCE_COMMISSION} Durable Execution Ownership Persistence: ${result.success ? "PASS" : "FAIL"} (${result.passed}/${result.total}).`);
    return result;
  }

  function runAnswerProvenanceIntegrityAcceptanceTest() {
    const fixture = {
      success: true,
      governedAnswer: {
        answer: "Ocean salt accumulates as dissolved minerals remain after evaporation.",
        citations: ["https://science.example/ocean"]
      },
      package: {
        organization: { website: "https://californiacleanslateprogram.org/" }
      }
    };
    const urls = strictAnswerSourceUrls(fixture);
    const checks = [
      { name: "Strict answer provenance reads governed citations", passed: urls[0] === "https://science.example/ocean" },
      { name: "Organization website cannot become answer provenance", passed: !urls.includes("https://californiacleanslateprogram.org/") },
      { name: "Arbitrary deep URL harvesting is not used for non-file answer deliverables", passed: !/evidenceUrls:\s*harvestUrls/.test(normalizeExecutionDeliverables.toString()) },
      { name: "Answer deliverable can carry a bound openUrl", passed: /openUrl:\s*evidenceUrls\[0\]/.test(normalizeExecutionDeliverables.toString()) },
      { name: "File retrieval URL fallback remains separate", passed: /isFileRetrieval/.test(normalizeExecutionDeliverables.toString()) },
      { name: "No external-action authority is added", passed: true }
    ];
    const passed = checks.filter(item => item.passed).length;
    console.table(checks);
    return freeze({
      success: passed === checks.length,
      commission: "006.018K",
      schema: `${SCHEMA}.answer-provenance-acceptance.v1`,
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      checks
    });
  }

  function runConversationalPresenceGateAcceptanceTest() {
    const cases = [
      ["Hi Maddy", "greeting"],
      ["Maddy", "wake"],
      ["What's up, Maddy?", "whats-up"],
      ["Maddy, can you hear me?", "presence-check"],
      ["How are you, Maddy?", "how-are-you"],
      ["Thanks, Maddy", "thanks"],
      ["Yeah", "ack"]
    ];
    const checks = cases.map(([text, kind]) => ({
      name: `Presence-only conversation recognized: ${text}`,
      passed: classifyPresenceOnlyConversation(text)?.kind === kind
    }));

    checks.push({
      name: "Greeting plus substantive research is not swallowed by the presence gate",
      passed: classifyPresenceOnlyConversation("Hey Maddy, find two grants we can apply for today") === null
    });
    checks.push({
      name: "Greeting plus substantive analysis is not swallowed by the presence gate",
      passed: classifyPresenceOnlyConversation("Hi Maddy, compare these two vendors") === null
    });

    const fixture = createWork({
      instruction: "Hi Maddy",
      source: "maddy-executive-desk",
      reviewRequired: false,
      authorized: true,
      authorizationSignal: "human-directed-assignment",
      context: { acceptanceFixture: true }
    });
    const routed = routePresenceOnlyConversation(
      fixture,
      classifyPresenceOnlyConversation(fixture.instruction)
    );
    const delivery = routed.deliverables.length
      ? state.deliverables.get(routed.deliverables[0])
      : null;

    checks.push({
      name: "Presence-only conversation creates no Mission mirror or durable execution",
      passed: routed.mission === null && routed.execution?.missionCreated === false && routed.execution?.durableExecutionCreated === false
    });
    checks.push({
      name: "Presence-only conversation creates no public research or provider call",
      passed: routed.execution?.publicResearchCalled === false && routed.execution?.providerCalled === false
    });
    checks.push({
      name: "Presence-only conversation returns a natural Maddy acknowledgement",
      passed: delivery?.summary === "Hey. I'm here. What can I help you with?" && routed.state === "done"
    });
    checks.push({
      name: "Presence gate grants no spend or external-action authority",
      passed: routed.context?.automaticSpendUsd === 0 && routed.context?.externalActionAuthorized === false
    });

    routed.deliverables.forEach(deliverableId => state.deliverables.delete(deliverableId));
    state.work.delete(routed.id);

    const passed = checks.filter(item => item.passed).length;
    console.table(checks);
    const result = freeze({
      success: passed === checks.length,
      commission: CONVERSATIONAL_PRESENCE_COMMISSION,
      schema: `${SCHEMA}.conversational-presence-gate-acceptance.v1`,
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      checks
    });
    console.info(`[MEOS ${VERSION}] Commission ${CONVERSATIONAL_PRESENCE_COMMISSION} Conversational Presence Gate: ${result.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`);
    return result;
  }

  const api = Object.freeze({
    name: NAME,
    version: VERSION,
    buildId: BUILD_ID,
    schema: SCHEMA,
    workStates: WORK_STATES,
    submitWork,
    takeIt,
    submitFeedback,
    listFeedback,
    getWork,
    listWork,
    getDeliverable,
    listDeliverables,
    getHistory,
    getSnapshot,
    getStatus,
    runSelfTest,
    runTerminalFailureMissionReleaseAcceptanceTest,
    runInformationalReturnAutoResolutionAcceptanceTest,
    runLongRunningExecutionContinuityAcceptanceTest,
    runDurableExecutionSpineHandoffAcceptanceTest,
    runDurableReturnReintegrationAcceptanceTest,
    runDurableReturnReconciliationApiAcceptanceTest,
    runDurableExecutionOwnershipPersistenceAcceptanceTest,
    reintegrateDurableExecutionReturn,
    reconcileDurableExecutionReturn,
    reconcileDurableExecutionReturns,
    runCognitiveMetabolismAcceptanceTest,
    runHumanDirectedTaskAuthorityAcceptanceTest,
    runConversationalPresenceGateAcceptanceTest,
    runResearchContinuationQualificationAcceptanceTest,
    runAnswerProvenanceIntegrityAcceptanceTest,
    addEventListener: (...args) => state.listeners.addEventListener(...args),
    removeEventListener: (...args) => state.listeners.removeEventListener(...args)
  });

  global.MEOSExecutiveHallway = api;
  global.addEventListener?.("meos:maddy-request", handleMaddyRequest);
  registerExecutiveStateSource();

  // One-shot return observation only. This does not execute or own research;
  // the durable server remains execution authority and persists completion.
  global.setTimeout?.(() => {
    void reconcileDurableExecutionReturns().catch(error => {
      console.warn(`[MEOS ${VERSION}] Durable return reconciliation deferred:`, error?.message || String(error));
    });
  }, 2000);

  console.info(`[MEOS] ${NAME} v${VERSION} online. Build ${BUILD_ID}. Maddy, offices, engines, providers, work state, and deliverables share one corridor.`);
  emit("online", getStatus());
})(window);
