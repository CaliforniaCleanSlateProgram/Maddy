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
  const VERSION = "1.4.1";
  const BUILD_ID = "EH141-SEMANTIC-RESULT-INTEGRITY-20260811-A";
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

    const records = mergeResourceRecords(matchingDeskRecords, matchingDiscoveryRecords);

    return {
      success: true,
      schema: "meos.executive-hallway.resource-search.v1",
      query: work.instruction,
      geography: { scope: interpretation?.geography?.scope || "unspecified", serviceArea },
      resourceTypes: [...(interpretation?.resourceTypes || [])],
      total: records.length,
      deskMatches: matchingDeskRecords.length,
      discoveryMatches: matchingDiscoveryRecords.length,
      records: records.slice(0, 25),
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
    work.options = work.deliverables.length
      ? ["open-deliverable", "use-in-task", "archive"]
      : ["broaden-search", "review-sources", "archive"];
    return transition(work, "done", {
      outcome: { success: true, verified: true, result: clone(result) }
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
        work.mission = {
          engine: "mission-engine",
          id: existing.id,
          status: existing.status,
          sourceReference
        };

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
      addDeliverable(work, {
        title: work.title,
        kind: "executive-result",
        summary: answer || "MEOS returned structured executive work. Open Result Details to inspect the complete result.",
        provider: execution?.providerId || execution?.provider || null,
        source: work.owner || "MEOS",
        data: {
          answer: answer || null,
          result: clone(root),
          evidenceUrls: harvestUrls(root).slice(0, 10)
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

    try {
      const result = await router.handle(work.instruction, {
        source: work.source,
        requestId: work.id,
        ...options.routerOptions
      });
      work.execution = clone(result);
      work.evidence.push({ type: "executive-router-result", verifiedAt: now(), result: clone(result) });
      transition(work, "verifying");
      normalizeExecutionDeliverables(work, result);
      work.options = work.deliverables.length ? ["open-deliverable", "use-in-task", "archive"] : ["review-result", "archive"];
      return transition(work, "done", {
        outcome: { success: result?.success !== false, verified: result?.success !== false, result: clone(result) }
      });
    } catch (error) {
      work.options = ["retry", "reassign", "cancel"];
      return transition(work, "failed", {
        error: error?.message || String(error),
        outcome: { success: false, reason: error?.code || "executive-router-failed" }
      });
    }
  }

  async function submitWork(input = {}, options = {}) {
    const work = createWork(input);
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

  function handleMaddyRequest(event) {
    const detail = event?.detail || {};
    const message = String(detail.message || "").trim();
    if (!message) return;

    void submitWork({
      instruction: message,
      source: detail.source || "maddy-dashboard",
      context: {
        costMode: detail.costMode || null,
        communicationMode: detail.communicationMode || null,
        opportunityId: detail.opportunityId || null
      }
    }).catch(error => {
      console.error(`[MEOS] ${NAME} could not complete Maddy request.`, error);
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
    runCognitiveMetabolismAcceptanceTest,
    addEventListener: (...args) => state.listeners.addEventListener(...args),
    removeEventListener: (...args) => state.listeners.removeEventListener(...args)
  });

  global.MEOSExecutiveHallway = api;
  global.addEventListener?.("meos:maddy-request", handleMaddyRequest);
  registerExecutiveStateSource();

  console.info(`[MEOS] ${NAME} v${VERSION} online. Build ${BUILD_ID}. Maddy, offices, engines, providers, work state, and deliverables share one corridor.`);
  emit("online", getStatus());
})(window);
