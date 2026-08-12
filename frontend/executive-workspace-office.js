/**
 * MEOS Executive Workspace Office v1.2.0
 * Commission 005.004C
 *
 * Provider-neutral execution office for ordinary executive workspace work.
 * It discovers connected provider capabilities at runtime, translates human
 * executive intent into capability requirements, routes through Provider
 * Manager, preserves approval gates, and records only runtime-backed outcomes.
 */
(function (global) {
  "use strict";

  const NAME = "MEOS Executive Workspace Office";
  const VERSION = "1.2.0";
  const BUILD_ID = "EWO120-WORKSPACE-RELEVANCE-GATE-20260811-A";
  const SCHEMA = "meos.executive-workspace-office.v1";
  const OFFICE_ID = "executive-workspace-office";

  const WORK_STATES = Object.freeze([
    "prepared", "awaiting-review", "authorized", "executing",
    "verified-success", "blocked", "failed"
  ]);

  const INTENT_ALIASES = Object.freeze({
    "list-files": ["workspace.file.list"],
    "find-file": ["workspace.file.search"],
    "read-file": ["workspace.file.research"],
    "organize-files": ["workspace.file.list", "workspace.file.move"],
    "create-document": ["workspace.document.create"],
    "edit-document": ["workspace.document.read", "workspace.document.update"],
    "prepare-document": ["workspace.document.create"],
    "send-email": ["workspace.email.send"],
    "draft-email": ["workspace.email.draft"],
    "read-email": ["workspace.email.read"],
    "search-email": ["workspace.email.search"],
    "schedule-meeting": ["workspace.calendar.availability", "workspace.calendar.create"],
    "update-meeting": ["workspace.calendar.update"],
    "cancel-meeting": ["workspace.calendar.delete"],
    "check-calendar": ["workspace.calendar.read"],
    "manage-contact": ["workspace.contacts.write"],
    "find-contact": ["workspace.contacts.read"],
    "store-record": ["workspace.records.write"],
    "retrieve-record": ["workspace.records.read"]
  });

  const state = {
    missions: new Map(),
    history: [],
    revision: 0,
    listeners: new EventTarget()
  };

  function now() { return new Date().toISOString(); }
  function id(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }
  function freeze(value) { return Object.freeze(clone(value)); }
  function norm(value) {
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  }
  function unique(items) { return [...new Set((items || []).filter(Boolean))]; }
  function providerManager() { return global.MEOSProviderManager || global.ProviderManager || null; }

  function emit(type, detail) {
    state.listeners.dispatchEvent(new CustomEvent(type, { detail: clone(detail) }));
    try {
      global.dispatchEvent(new CustomEvent(`meos:executive-workspace-office:${type}`, { detail: clone(detail) }));
    } catch (_) {}
  }

  function record(type, details) {
    const entry = { id: id("workspace-event"), type, at: now(), details: clone(details || {}) };
    state.history.unshift(entry);
    state.history = state.history.slice(0, 250);
    state.revision += 1;
    emit("activity", entry);
    return entry;
  }

  function listWorkspaceProviders() {
    const pm = providerManager();
    if (!pm || typeof pm.listProviders !== "function") return [];
    return pm.listProviders().filter(provider => {
      const caps = Array.isArray(provider.capabilities) ? provider.capabilities : [];
      return caps.some(cap => String(cap).startsWith("workspace.")) ||
        provider.metadata?.workspaceProvider === true ||
        provider.metadata?.domain === "workspace";
    });
  }

  function discoverCapabilities() {
    const providers = listWorkspaceProviders();
    const capabilities = {};
    providers.forEach(provider => {
      (provider.capabilities || []).filter(cap => String(cap).startsWith("workspace.")).forEach(cap => {
        if (!capabilities[cap]) capabilities[cap] = [];
        capabilities[cap].push({ id: provider.id, name: provider.name, status: provider.status });
      });
    });
    return freeze({
      schema: "meos.executive-workspace-office.capabilities.v1",
      discoveredAt: now(),
      providerCount: providers.length,
      capabilities,
      capabilityIds: Object.keys(capabilities).sort()
    });
  }

  function registerWorkspaceProvider(definition) {
    const pm = providerManager();
    if (!pm || typeof pm.registerProvider !== "function") {
      throw new Error("MEOS Provider Manager is required before workspace providers can register.");
    }
    if (!definition || typeof definition !== "object") throw new TypeError("Provider definition is required.");
    const capabilities = unique(definition.capabilities || []);
    if (!capabilities.length || !capabilities.every(cap => String(cap).startsWith("workspace."))) {
      throw new TypeError("Workspace providers must declare runtime capabilities using the workspace.* namespace.");
    }
    const registered = pm.registerProvider({
      ...definition,
      type: definition.type || "tool",
      capabilities,
      metadata: { ...(definition.metadata || {}), workspaceProvider: true, domain: "workspace" }
    }, { replace: definition.replace === true });
    record("provider.registered", { providerId: registered.id, capabilities });
    return registered;
  }

  function inferIntent(text) {
    const value = String(text || "").toLowerCase();

    /*
     * Commission 006.018D:
     * Workspace must positively recognize workspace work before claiming it.
     * Available provider capability is not evidence that an unrelated request
     * belongs to this office.
     */
    const tests = [
      ["send-email", /\b(email|mail|message)\b.*\b(send|deliver|reply|forward)\b|\b(send|reply|forward)\b.*\b(email|mail|message)\b/],
      ["draft-email", /\b(email|mail|message)\b.*\b(draft|write|prepare)\b|\b(draft|write|prepare)\b.*\b(email|mail|message)\b/],
      ["read-email", /\b(email|mail|message|inbox)\b.*\b(read|open|show|latest|recent)\b|\b(read|open|show)\b.*\b(email|mail|message|inbox)\b/],
      ["search-email", /\b(email|mail|message|inbox)\b.*\b(find|search|look for|locate)\b|\b(find|search|look for|locate)\b.*\b(email|mail|message|inbox)\b/],
      ["schedule-meeting", /\b(meeting|appointment|calendar event|call)\b.*\b(schedule|book|arrange|set up)\b|\b(schedule|book|arrange|set up)\b.*\b(meeting|appointment|calendar event|call)\b/],
      ["update-meeting", /\b(meeting|appointment|calendar event|call)\b.*\b(update|move|reschedule|change)\b|\b(update|move|reschedule|change)\b.*\b(meeting|appointment|calendar event|call)\b/],
      ["cancel-meeting", /\b(meeting|appointment|calendar event|call)\b.*\b(cancel|delete|remove)\b|\b(cancel|delete|remove)\b.*\b(meeting|appointment|calendar event|call)\b/],
      ["check-calendar", /\b(calendar|availability|free time)\b/],
      ["list-files", /\b(files|documents|records|folders)\b.*\b(list|inventory|all)\b|\b(list|inventory)\b.*\b(files|documents|records|folders)\b/],
      ["organize-files", /\b(files|documents|records|folders)\b.*\b(organize|move|sort|rename)\b|\b(organize|move|sort|rename)\b.*\b(files|documents|records|folders)\b/],
      ["create-document", /\b(create|make|write|prepare)\b.*\b(document|doc|report|memo|letter|packet)\b/],
      ["edit-document", /\b(edit|revise|update|change)\b.*\b(document|doc|report|memo|letter|packet)\b/],
      ["find-contact", /\b(contact|phone number|email address)\b/],
      ["manage-contact", /\b(contact)\b.*\b(add|save|update|edit|remove|delete)\b/],
      ["find-file", /\b(find|locate|fetch|grab|get|bring|open|show|where(?:\s+the\s+hell)?\s+(?:is|are))\b.*\b(file|document|doc|folder|record|articles of incorporation|bylaws|policy|policies|agreement|contract|minutes|packet)\b/]
    ];

    const match = tests.find(([, regex]) => regex.test(value));
    return match ? match[0] : null;
  }

  function resolveRequirements(input) {
    const explicitIntent = input?.intent ? norm(input.intent) : "";
    const explicit = unique(input?.capabilities || []);

    if (explicit.length) {
      return {
        intent: explicitIntent || "workspace-task",
        capabilities: explicit,
        workspaceRelevant: explicit.some(cap => String(cap).startsWith("workspace."))
      };
    }

    if (explicitIntent && INTENT_ALIASES[explicitIntent]) {
      return { intent: explicitIntent, capabilities: INTENT_ALIASES[explicitIntent], workspaceRelevant: true };
    }

    const inferredIntent = inferIntent(input?.instruction || input?.title || "");
    if (inferredIntent && INTENT_ALIASES[inferredIntent]) {
      return { intent: inferredIntent, capabilities: INTENT_ALIASES[inferredIntent], workspaceRelevant: true };
    }

    /*
     * Unknown natural language is deliberately NOT converted into file search.
     * The upstream executive router can continue domain resolution instead of
     * Workspace stealing unrelated research or reasoning work.
     */
    return {
      intent: explicitIntent || "workspace-task",
      capabilities: ["executive-office-work"],
      workspaceRelevant: false
    };
  }

  function interpretRequest(input) {
    const normalizedInput =
      typeof input === "string"
        ? { instruction: input }
        : (input || {});

    const requirements = resolveRequirements(normalizedInput);

    return freeze({
      schema: "meos.executive-workspace-office.intent.v1",
      instruction:
        normalizedInput.instruction ||
        normalizedInput.title ||
        "",
      intent: requirements.intent,
      requiredCapabilities: [...requirements.capabilities],
      workspaceRelevant: requirements.workspaceRelevant === true,
      providerNeutral: true,
      interpretedAt: now()
    });
  }

  function prepareMission(input = {}) {
    if (!input.instruction && !input.title) throw new TypeError("Workspace mission requires an instruction or title.");
    const requirements = resolveRequirements(input);
    const discovered = discoverCapabilities();
    const missing = requirements.capabilities.filter(cap =>
      cap !== "executive-office-work" && !discovered.capabilityIds.includes(cap)
    );
    const mission = {
      schema: "meos.executive-workspace-office.mission.v1",
      id: id("workspace-mission"),
      title: input.title || input.instruction,
      instruction: input.instruction || input.title,
      intent: requirements.intent,
      requiredCapabilities: requirements.capabilities,
      payload: clone({
        ...(input.payload || {}),
        ...(
          requirements.capabilities.some(cap =>
            cap === "workspace.file.search" ||
            cap === "workspace.file.research"
          )
            ? {
                question:
                  input.payload?.question ||
                  input.instruction ||
                  input.title
              }
            : {}
        )
      }),
      context: clone(input.context || {}),
      authority: {
        reviewRequired: input.reviewRequired !== false,
        authorized: input.reviewRequired === false && input.authorized === true,
        authorizedAt: null,
        authorizationSignal: null
      },
      status: missing.length ? "blocked" : (input.reviewRequired === false ? "prepared" : "awaiting-review"),
      readiness: { ready: missing.length === 0, missingCapabilities: missing },
      evidence: [],
      execution: null,
      createdAt: now(),
      updatedAt: now()
    };
    state.missions.set(mission.id, mission);
    record("mission.prepared", { missionId: mission.id, intent: mission.intent, status: mission.status, missing });
    return freeze(mission);
  }

  function authorizeMission(missionId, signal = "Take It!") {
    const mission = state.missions.get(missionId);
    if (!mission) throw new Error(`Workspace mission "${missionId}" was not found.`);
    if (!mission.readiness.ready) throw new Error("Mission cannot be authorized while required capabilities are unavailable.");
    mission.authority.authorized = true;
    mission.authority.authorizedAt = now();
    mission.authority.authorizationSignal = signal;
    mission.status = "authorized";
    mission.updatedAt = now();
    record("mission.authorized", { missionId, signal });
    return freeze(mission);
  }

  async function executeMission(missionId, options = {}) {
    const mission = state.missions.get(missionId);
    if (!mission) throw new Error(`Workspace mission "${missionId}" was not found.`);
    if (!mission.readiness.ready) return freeze({ success: false, mission: clone(mission), reason: "missing-capabilities" });
    if (mission.authority.reviewRequired && !mission.authority.authorized) {
      return freeze({ success: false, mission: clone(mission), reason: "review-required" });
    }
    const pm = providerManager();
    if (!pm || typeof pm.request !== "function") throw new Error("MEOS Provider Manager is unavailable.");

    mission.status = "executing";
    mission.updatedAt = now();
    record("mission.executing", { missionId, capabilities: mission.requiredCapabilities });

    const requirements = {
      capabilities: mission.requiredCapabilities,
      preferredTypes: options.preferredTypes || ["tool", "executive-office"],
      requireAllCapabilities: true,
      allowMultiProvider: true,
      missionCritical: options.missionCritical === true,
      privacySensitive: options.privacySensitive === true
    };
    let result;
    try {
      result = await pm.request(requirements, {
        office: OFFICE_ID,
        missionId: mission.id,
        intent: mission.intent,
        capability: mission.requiredCapabilities.length === 1
          ? mission.requiredCapabilities[0]
          : null,
        requiredCapabilities: [...mission.requiredCapabilities],
        instruction: mission.instruction,
        payload: mission.payload
      }, {
        ...mission.context,
        requiredCapabilities: [...mission.requiredCapabilities],
        ...(options.context || {})
      });
    } catch (error) {
      result = { success: false, error: error?.message || String(error) };
    }

    mission.execution = clone(result);
    mission.updatedAt = now();
    if (result?.success === true) {
      mission.status = "verified-success";
      mission.evidence.push({ type: "provider-execution", verifiedAt: now(), result: clone(result) });
      record("mission.verified-success", { missionId });
    } else {
      mission.status = "failed";
      record("mission.failed", { missionId, reason: result?.error || "provider-execution-failed" });
    }
    return freeze({ success: mission.status === "verified-success", mission: clone(mission), result });
  }

  async function takeIt(missionId, options = {}) {
    authorizeMission(missionId, options.signal || "Take It!");
    return executeMission(missionId, options);
  }

  function getMission(missionId) { return freeze(state.missions.get(missionId) || null); }
  function listMissions() { return freeze([...state.missions.values()]); }
  function getHistory(limit = 50) { return freeze(state.history.slice(0, Math.max(1, Math.min(250, Number(limit) || 50)))); }

  function getStatus() {
    const missions = [...state.missions.values()];
    const capabilities = discoverCapabilities();
    return freeze({
      schema: `${SCHEMA}.status`, name: NAME, version: VERSION, buildId: BUILD_ID,
      officeId: OFFICE_ID, status: "online", providerNeutral: true,
      workspaceProviders: capabilities.providerCount,
      discoveredCapabilities: capabilities.capabilityIds,
      missions: {
        total: missions.length,
        awaitingReview: missions.filter(m => m.status === "awaiting-review").length,
        executing: missions.filter(m => m.status === "executing").length,
        verifiedSuccess: missions.filter(m => m.status === "verified-success").length,
        blocked: missions.filter(m => m.status === "blocked").length
      },
      revision: state.revision
    });
  }

  function runSelfTest() {
    const assertions = [];
    const check = (name, passed, details = {}) => assertions.push({ name, passed: !!passed, details });
    check("provider-neutral office identity", OFFICE_ID === "executive-workspace-office");
    check("runtime capability discovery", typeof discoverCapabilities === "function");
    check("no fixed provider requirement", !JSON.stringify(INTENT_ALIASES).toLowerCase().includes("google"));
    check("human task intent mapping", resolveRequirements({ intent: "schedule-meeting" }).capabilities.includes("workspace.calendar.create"));
    check("list files maps to workspace.file.list", JSON.stringify(resolveRequirements({ intent: "list files" }).capabilities) === JSON.stringify(["workspace.file.list"]));
    check("natural file retrieval remains workspace work", resolveRequirements({ instruction: "Bring me our Articles of Incorporation." }).intent === "find-file");
    check("informal file retrieval remains workspace work", resolveRequirements({ instruction: "Where the hell are our Articles of Incorporation?" }).intent === "find-file");
    const research = resolveRequirements({
      instruction: "Maddy, find out why wombat poop is cube-shaped. Learn the answer from public evidence and tell me what you learned."
    });
    check(
      "general public research is not hijacked by workspace file search",
      research.workspaceRelevant === false &&
        research.intent !== "find-file" &&
        JSON.stringify(research.capabilities) === JSON.stringify(["executive-office-work"])
    );
    check("natural-language interpreter exists", typeof interpretRequest === "function");
    check("review gate exists", WORK_STATES.includes("awaiting-review") && WORK_STATES.includes("authorized"));
    check("Take It execution protocol exists", typeof takeIt === "function");
    check("verified outcome state exists", WORK_STATES.includes("verified-success"));
    check("Provider Manager connected", !!providerManager());
    const passed = assertions.filter(a => a.passed).length;
    return freeze({ success: passed === assertions.length, schema: "meos.executive-workspace-office.acceptance-test.v1", version: VERSION, buildId: BUILD_ID, passed, total: assertions.length, assertions });
  }

  const api = Object.freeze({
    name: NAME, version: VERSION, buildId: BUILD_ID, schema: SCHEMA, officeId: OFFICE_ID,
    intentAliases: INTENT_ALIASES,
    registerWorkspaceProvider, listWorkspaceProviders, discoverCapabilities,
    interpretRequest, prepareMission, authorizeMission, executeMission, takeIt,
    getMission, listMissions, getHistory, getStatus, runSelfTest,
    addEventListener: (...args) => state.listeners.addEventListener(...args),
    removeEventListener: (...args) => state.listeners.removeEventListener(...args)
  });

  global.MEOSExecutiveWorkspaceOffice = api;
  console.info(`[MEOS] ${NAME} v${VERSION} online. Build ${BUILD_ID}. Workspace relevance is positively gated before runtime capability resolution; no workspace provider is assumed.`);
  emit("online", getStatus());
})(window);
