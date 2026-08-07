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
  const VERSION = "1.0.2";
  const BUILD_ID = "EH102-PRIMARY-RETRIEVAL-20260806-A";
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

  function registerMissionMirror(work) {
    const engine = missionEngine();
    if (!engine?.createMissionFromIntake) return null;

    try {
      const mission = engine.createMissionFromIntake({
        missionTitle: work.title,
        description: work.instruction,
        objective: work.instruction,
        source: "executive-intake",
        approvalRequired: work.authority.reviewRequired,
        assignedOffices: work.owner ? [work.owner] : [],
        leadOffice: work.owner || null,
        tags: ["executive-hallway", work.route || "unrouted"],
        createdBy: "Maddy / Executive Hallway"
      });
      work.mission = { engine: "mission-engine", id: mission.id, status: mission.status };
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
    const fileObjects = isFileRetrieval && explicit.length
      ? [explicit[0]]
      : explicit.length
        ? explicit
        : generic;

    return { fileObjects, isFileRetrieval };
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

    if (!fileObjects.length) {
      const urls = harvestUrls(root);
      urls.slice(0, 5).forEach((link, index) => addDeliverable(work, {
        title: index === 0 ? work.title : `${work.title} ${index + 1}`,
        kind: "link",
        openUrl: link.url,
        provider: execution?.providerId || execution?.provider || null,
        data: { path: link.path }
      }));
    }

    const retrieval = workspaceRetrievalMessage(root);

    if (!work.deliverables.length && execution?.success === true && !isFileRetrieval) {
      addDeliverable(work, {
        title: work.title,
        kind: "result",
        summary: "Verified MEOS work result",
        provider: execution?.providerId || execution?.provider || null,
        data: root
      });
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

  function getWork(workId) {
    return freeze(state.work.get(workId) || null);
  }

  function listWork(filter = {}) {
    let items = [...state.work.values()];
    if (filter.state) items = items.filter(item => item.state === filter.state);
    if (filter.owner) items = items.filter(item => item.owner === filter.owner);
    return freeze(items.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))));
  }

  function getDeliverable(deliverableId) {
    return freeze(state.deliverables.get(deliverableId) || null);
  }

  function listDeliverables(filter = {}) {
    let items = [...state.deliverables.values()];
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
      history: getHistory(100),
      connections: {
        executiveState: Boolean(executiveState()),
        missionEngine: Boolean(missionEngine()),
        executiveRouter: Boolean(executiveRouter()),
        workspaceOffice: Boolean(workspaceOffice())
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

  function runSelfTest() {
    const assertions = [];
    const check = (name, passed, details = {}) => assertions.push({ name, passed: Boolean(passed), details });

    check("Hallway schema exists", SCHEMA === "meos.executive-hallway.v1");
    check("Work states include complete operating loop", ["received", "awaiting-review", "executing", "verifying", "done"].every(item => WORK_STATES.includes(item)), WORK_STATES);
    check("Maddy intake API exists", typeof submitWork === "function");
    check("Take It API exists", typeof takeIt === "function");
    check("Deliverable API exists", typeof listDeliverables === "function" && typeof getDeliverable === "function");
    check("Provider-neutral Workspace doorway exists", typeof workspaceOffice === "function");
    check("Executive Router fallback exists", typeof executiveRouter === "function");
    check("Mission Engine mirror exists", typeof registerMissionMirror === "function");
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
    getWork,
    listWork,
    getDeliverable,
    listDeliverables,
    getHistory,
    getSnapshot,
    getStatus,
    runSelfTest,
    addEventListener: (...args) => state.listeners.addEventListener(...args),
    removeEventListener: (...args) => state.listeners.removeEventListener(...args)
  });

  global.MEOSExecutiveHallway = api;
  global.addEventListener?.("meos:maddy-request", handleMaddyRequest);
  registerExecutiveStateSource();

  console.info(`[MEOS] ${NAME} v${VERSION} online. Build ${BUILD_ID}. Maddy, offices, engines, providers, work state, and deliverables share one corridor.`);
  emit("online", getStatus());
})(window);
