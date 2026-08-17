/**
 * Maddy Executive Operating System (MEOS)
 * Maddy Autonomy Switchboard
 *
 * Commission Candidate: 006.031B — Maddy Autonomy Switchboard
 * Version: 1.0.1
 * Build: MAS101-RUNTIME-BOOTSTRAP-AUTONOMY-REPAIR-20260817-A
 *
 * North outcome:
 * - Give every browser-side MEOS organ one provider-neutral authority API.
 * - Keep server-side Durable Maddy Autonomy Authority as the only authority.
 * - Keep capability, availability/readiness, and autonomy authorization distinct.
 * - Default closed: no cached browser state can create authority.
 * - Let the future dashboard control autonomy without custom-wiring each organ.
 * - Preserve human authority, $0 automatic spend, and provider billing boundaries.
 *
 * Important:
 * - This file does not itself start autonomous work.
 * - This file does not persist authority in localStorage, IndexedDB, cookies, or
 *   any browser storage. Its cache is memory-only and disposable.
 * - Provider OFF means MEOS autonomous use OFF. It does not cancel a third-party
 *   subscription/account or guarantee provider billing stops.
 */
(function initializeMaddyAutonomySwitchboard(global) {
  "use strict";

  const NAME = "Maddy Autonomy Switchboard";
  const VERSION = "1.0.1";
  const BUILD_ID = "MAS101-RUNTIME-BOOTSTRAP-AUTONOMY-REPAIR-20260817-A";
  const COMMISSION = "006.031B";
  const SCHEMA = "meos.maddy-autonomy-switchboard.v1";
  const SERVER_API = "/api/autonomy";
  const ACCEPTANCE_API = "/api/autonomy/acceptance-test";
  const REQUEST_TIMEOUT_MS = 12000;
  const STALE_AFTER_MS = 15000;
  const BROADCAST_CHANNEL = "meos.autonomy-authority.events.v1";

  const CAPABILITY_DESCRIPTORS = Object.freeze({
    continuousCognition: Object.freeze({
      id: "continuousCognition",
      label: "Continuous Cognition",
      section: "work",
      description: "Permit Maddy's durable cognition runtime to initiate bounded internal cognition without a fresh human prompt.",
      integration: "server",
      probe: "server"
    }),
    learning: Object.freeze({
      id: "learning",
      label: "Learning",
      section: "work",
      description: "Permit commissioned autonomous learning work within existing evidence, economic, and external-action boundaries.",
      integration: "server",
      probe: "server"
    }),
    timeAndDeadlines: Object.freeze({
      id: "timeAndDeadlines",
      label: "Time & Deadlines",
      section: "work",
      description: "Permit commissioned temporal work to wake and act when time itself makes work relevant.",
      integration: "durable-maddy-time",
      probe: "server"
    }),
    approvedWork: Object.freeze({
      id: "approvedWork",
      label: "Approved Work",
      section: "work",
      description: "Permit already-approved internal work to begin and advance without repeated approval requests.",
      integration: "workflow",
      probe: "ExecutiveWorkflow"
    }),
    officeDispatch: Object.freeze({
      id: "officeDispatch",
      label: "Office Dispatch",
      section: "work",
      description: "Permit ready internal work to route to the appropriate commissioned office automatically.",
      integration: "dispatcher",
      probe: "MEOSMissionDispatcher"
    }),
    monitoring: Object.freeze({
      id: "monitoring",
      label: "Monitoring & Follow-up",
      section: "work",
      description: "Permit Maddy to autonomously notice and handle commissioned deadline, blocker, waiting, and follow-up conditions.",
      integration: "monitoring",
      probe: "ExecutiveMonitoring"
    }),
    documents: Object.freeze({
      id: "documents",
      label: "Document Intake",
      section: "work",
      description: "Permit commissioned machine-solvable document intake and classification work to continue without a fresh prompt.",
      integration: "documents",
      probe: "DocumentClassifier"
    }),
    opportunities: Object.freeze({
      id: "opportunities",
      label: "Opportunity Patrol",
      section: "work",
      description: "Permit standing opportunity discovery only after canonical ownership/storage safety is commissioned.",
      integration: "opportunities",
      probe: "ExecutiveOpportunityOffice"
    })
  });

  const PROVIDER_DESCRIPTORS = Object.freeze({
    openai: Object.freeze({
      id: "openai",
      label: "OpenAI",
      category: "intelligence",
      billingOwnerDefault: "customer",
      probe: "MEOSProviderManager"
    }),
    elevenlabs: Object.freeze({
      id: "elevenlabs",
      label: "ElevenLabs",
      category: "voice",
      billingOwnerDefault: "customer",
      probe: "MaddySpeech"
    }),
    googleWorkspace: Object.freeze({
      id: "googleWorkspace",
      label: "Google Workspace",
      category: "workspace",
      billingOwnerDefault: "customer",
      probe: "MEOSExecutiveWorkspaceOffice"
    }),
    publicWeb: Object.freeze({
      id: "publicWeb",
      label: "Public Web",
      category: "research",
      billingOwnerDefault: "customer",
      probe: "server"
    })
  });

  const IMMUTABLE_BOUNDARIES = Object.freeze({
    automaticSpendUsd: 0,
    paidProviderSpendAuthorized: false,
    externalActionAuthorized: false,
    legalCommitmentAuthorized: false,
    signatureAuthorized: false,
    certificationAuthorized: false,
    submissionAuthorized: false,
    consequentialActionAuthorized: false,
    humanAuthorityPreserved: true
  });

  const state = {
    initializedAt: new Date().toISOString(),
    status: "unread",
    policy: null,
    serverStatus: null,
    principal: null,
    lastLoadedAt: null,
    lastSuccessfulLoadAt: null,
    lastError: null,
    inFlightRead: null,
    writeChain: Promise.resolve(),
    revisionSeen: null,
    listeners: new Map(),
    integrationOverrides: new Map(),
    providerOverrides: new Map(),
    broadcast: null
  };

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    if (value === undefined) return undefined;
    if (typeof structuredClone === "function") {
      try {
        return structuredClone(value);
      } catch (_error) {
        // Fall through for plain serializable authority data.
      }
    }
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeId(value) {
    return String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9._:-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 160);
  }

  function errorRecord(error, fallbackCode = "AUTONOMY_SWITCHBOARD_ERROR") {
    return {
      code: error?.code || fallbackCode,
      message: error?.message || String(error || fallbackCode),
      status: Number(error?.status || 0) || null,
      details: clone(error?.details || null),
      at: now()
    };
  }

  function eventListeners(eventName) {
    return state.listeners.get(eventName) || [];
  }

  function emit(eventName, payload) {
    const snapshot = clone(payload);
    for (const listener of eventListeners(eventName)) {
      try {
        listener(snapshot);
      } catch (error) {
        console.error(`[${NAME}] ${eventName} listener failed:`, error);
      }
    }
  }

  function on(eventName, listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Autonomy event listener must be a function.");
    }
    const group = eventListeners(eventName);
    group.push(listener);
    state.listeners.set(eventName, group);
    return () => off(eventName, listener);
  }

  function off(eventName, listener) {
    const group = eventListeners(eventName);
    state.listeners.set(
      eventName,
      group.filter(candidate => candidate !== listener)
    );
    return true;
  }

  function failClosed(reason, error = null) {
    state.status = "unavailable-safe-off";
    state.policy = null;
    state.serverStatus = null;
    state.principal = null;
    state.lastLoadedAt = now();
    state.lastError = errorRecord(
      error || new Error(reason || "Server autonomy authority is unavailable."),
      "AUTONOMY_AUTHORITY_UNPROVEN"
    );
    emit("authority:unavailable", getSnapshot());
    return getSnapshot();
  }

  function withTimeout(promiseFactory, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    let timer = null;

    const timeoutPromise = new Promise((_, reject) => {
      timer = global.setTimeout(() => {
        if (controller) controller.abort();
        const error = new Error("Autonomy authority request timed out.");
        error.code = "AUTONOMY_AUTHORITY_TIMEOUT";
        error.status = 504;
        reject(error);
      }, timeoutMs);
    });

    return Promise.race([
      Promise.resolve().then(() => promiseFactory(controller?.signal)),
      timeoutPromise
    ]).finally(() => {
      if (timer) global.clearTimeout(timer);
    });
  }

  async function parseResponse(response) {
    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }

    if (!response.ok || payload?.success === false) {
      const error = new Error(
        payload?.message || `Autonomy authority request failed with HTTP ${response.status}.`
      );
      error.code = payload?.error || "AUTONOMY_AUTHORITY_HTTP_ERROR";
      error.status = response.status;
      error.details = payload?.details || payload?.status || null;
      throw error;
    }

    return payload || {};
  }

  async function request(method, body = null) {
    if (typeof global.fetch !== "function") {
      const error = new Error("Browser fetch is unavailable.");
      error.code = "AUTONOMY_FETCH_UNAVAILABLE";
      throw error;
    }

    return withTimeout(async signal => {
      const options = {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json"
        },
        signal
      };

      if (body !== null) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
      }

      return parseResponse(await global.fetch(SERVER_API, options));
    });
  }

  function validateServerAuthorityPayload(payload) {
    const policy = payload?.policy;
    const serverStatus = payload?.status;

    if (!policy || !serverStatus) {
      const error = new Error("Server did not return an autonomy policy and status.");
      error.code = "AUTONOMY_AUTHORITY_PAYLOAD_INCOMPLETE";
      throw error;
    }

    if (serverStatus?.persistence?.browserAuthority !== false) {
      const error = new Error("Browser state must never be autonomy authority.");
      error.code = "AUTONOMY_BROWSER_AUTHORITY_REJECTED";
      throw error;
    }

    const economic = serverStatus.economicAuthority || policy.economicAuthority || {};
    const external = serverStatus.externalAuthority || policy.externalAuthority || {};

    if (
      Number(economic.automaticSpendUsd || 0) !== 0 ||
      economic.paidProviderSpendAuthorized === true ||
      external.externalActionAuthorized === true ||
      external.legalCommitmentAuthorized === true ||
      external.signatureAuthorized === true ||
      external.certificationAuthorized === true ||
      external.submissionAuthorized === true ||
      external.consequentialActionAuthorized === true ||
      external.humanAuthorityPreserved !== true
    ) {
      const error = new Error("Server autonomy authority attempted to expand an immutable human/economic boundary.");
      error.code = "AUTONOMY_IMMUTABLE_BOUNDARY_VIOLATION";
      throw error;
    }

    return {
      policy: clone(policy),
      serverStatus: clone(serverStatus),
      principal: clone(payload.principal || null)
    };
  }

  function acceptServerAuthority(payload, source = "read") {
    const validated = validateServerAuthorityPayload(payload);
    const priorRevision = state.revisionSeen;
    const nextRevision = Number(validated.policy?.revision || 0);

    state.status = "ready";
    state.policy = validated.policy;
    state.serverStatus = validated.serverStatus;
    state.principal = validated.principal;
    state.lastLoadedAt = now();
    state.lastSuccessfulLoadAt = state.lastLoadedAt;
    state.lastError = null;
    state.revisionSeen = nextRevision;

    const snapshot = getSnapshot();
    emit("authority:updated", {
      source,
      previousRevision: priorRevision,
      revision: nextRevision,
      snapshot
    });

    return snapshot;
  }

  async function refresh(options = {}) {
    if (state.inFlightRead && options.force !== true) {
      return state.inFlightRead;
    }

    const task = request("GET")
      .then(payload => acceptServerAuthority(payload, "read"))
      .catch(error => {
        failClosed("Server autonomy authority could not be proven.", error);
        throw error;
      })
      .finally(() => {
        state.inFlightRead = null;
      });

    state.inFlightRead = task;
    return task;
  }

  function stale() {
    if (!state.lastSuccessfulLoadAt) return true;
    const age = Date.now() - Date.parse(state.lastSuccessfulLoadAt);
    return !Number.isFinite(age) || age > STALE_AFTER_MS;
  }

  async function ensureFresh() {
    if (state.status !== "ready" || stale()) {
      await refresh();
    }
    return getSnapshot();
  }

  function serverCapability(capabilityId) {
    return state.serverStatus?.capabilities?.[capabilityId] || null;
  }

  function integrationProbe(capabilityId) {
    const descriptor = CAPABILITY_DESCRIPTORS[capabilityId];
    if (!descriptor) {
      return {
        ready: false,
        reason: "unknown-capability",
        evidence: null
      };
    }

    if (state.integrationOverrides.has(capabilityId)) {
      return clone(state.integrationOverrides.get(capabilityId));
    }

    if (descriptor.probe === "server") {
      return {
        ready: true,
        reason: "server-integrated",
        evidence: {
          source: "durable-autonomy-authority",
          capabilityId
        }
      };
    }

    const organ = global[descriptor.probe];
    if (!organ) {
      return {
        ready: false,
        reason: `integration-not-loaded:${descriptor.probe}`,
        evidence: null
      };
    }

    if (typeof organ.getAutonomyIntegrationStatus === "function") {
      try {
        const reported = organ.getAutonomyIntegrationStatus(capabilityId);
        return {
          ready: reported?.ready === true,
          reason: reported?.reason || (reported?.ready === true ? "integration-ready" : "integration-not-ready"),
          evidence: clone(reported || null)
        };
      } catch (error) {
        return {
          ready: false,
          reason: "integration-probe-failed",
          evidence: errorRecord(error)
        };
      }
    }

    return {
      ready: false,
      reason: "integration-contract-not-commissioned",
      evidence: {
        source: descriptor.probe,
        loaded: true,
        getAutonomyIntegrationStatus: false
      }
    };
  }

  function providerProbe(providerId) {
    const descriptor = PROVIDER_DESCRIPTORS[providerId];
    if (!descriptor) {
      return {
        ready: false,
        available: false,
        reason: "unknown-provider",
        evidence: null
      };
    }

    if (state.providerOverrides.has(providerId)) {
      return clone(state.providerOverrides.get(providerId));
    }

    if (descriptor.probe === "server") {
      return {
        ready: true,
        available: true,
        reason: "server-integrated",
        evidence: {
          source: "durable-server-runtime",
          providerId
        }
      };
    }

    if (providerId === "openai" || providerId === "publicWeb") {
      const manager = global.MEOSProviderManager || global.ProviderManager;
      if (!manager) {
        return {
          ready: false,
          available: false,
          reason: "provider-manager-unavailable",
          evidence: null
        };
      }

      if (typeof manager.getAutonomyIntegrationStatus === "function") {
        try {
          const reported = manager.getAutonomyIntegrationStatus(providerId);
          return {
            ready: reported?.ready === true,
            available: reported?.available === true,
            reason: reported?.reason || "provider-manager-report",
            evidence: clone(reported || null)
          };
        } catch (error) {
          return {
            ready: false,
            available: false,
            reason: "provider-probe-failed",
            evidence: errorRecord(error)
          };
        }
      }

      return {
        ready: false,
        available: false,
        reason: "provider-autonomy-contract-not-commissioned",
        evidence: {
          providerManagerLoaded: true,
          getAutonomyIntegrationStatus: false
        }
      };
    }

    const organ = global[descriptor.probe];
    if (!organ) {
      return {
        ready: false,
        available: false,
        reason: `provider-integration-not-loaded:${descriptor.probe}`,
        evidence: null
      };
    }

    if (typeof organ.getAutonomyIntegrationStatus === "function") {
      try {
        const reported = organ.getAutonomyIntegrationStatus(providerId);
        return {
          ready: reported?.ready === true,
          available: reported?.available === true,
          reason: reported?.reason || "provider-integration-report",
          evidence: clone(reported || null)
        };
      } catch (error) {
        return {
          ready: false,
          available: false,
          reason: "provider-probe-failed",
          evidence: errorRecord(error)
        };
      }
    }

    return {
      ready: false,
      available: false,
      reason: "provider-autonomy-contract-not-commissioned",
      evidence: {
        source: descriptor.probe,
        loaded: true,
        getAutonomyIntegrationStatus: false
      }
    };
  }

  function capabilityStatus(capabilityId) {
    const descriptor = CAPABILITY_DESCRIPTORS[capabilityId] || null;
    if (!descriptor) return null;

    const server = serverCapability(capabilityId);
    const integration = integrationProbe(capabilityId);
    const masterEnabled = state.status === "ready" && state.policy?.masterEnabled === true;
    const authorized = state.status === "ready" && state.policy?.capabilities?.[capabilityId] === true;
    const serverBlocked = server?.blocked === true;
    const infrastructureAvailable = state.serverStatus?.infrastructure?.available === true;
    const ready = integration.ready === true && infrastructureAvailable && !serverBlocked;
    const effective = masterEnabled && authorized && ready && server?.effective === true;

    let uiState = "OFF";
    let reason = "not-authorized";

    if (state.status !== "ready") {
      uiState = "BLOCKED";
      reason = "authority-unproven";
    } else if (serverBlocked) {
      uiState = "BLOCKED";
      reason = server?.blockedReason || "server-blocked";
    } else if (!infrastructureAvailable) {
      uiState = "BLOCKED";
      reason = "autonomy-infrastructure-unavailable";
    } else if (!integration.ready) {
      uiState = "BLOCKED";
      reason = integration.reason || "integration-not-ready";
    } else if (authorized) {
      uiState = masterEnabled ? "ON" : "OFF";
      reason = masterEnabled ? "authorized-and-effective" : "authorized-master-off";
    }

    return {
      ...clone(descriptor),
      authorized,
      masterEnabled,
      ready,
      effective,
      uiState,
      reason,
      server: clone(server),
      integration: clone(integration)
    };
  }

  function providerStatus(providerId) {
    const descriptor = PROVIDER_DESCRIPTORS[providerId] || null;
    if (!descriptor) return null;

    const server = state.serverStatus?.providerAutonomousUse?.[providerId] || null;
    const integration = providerProbe(providerId);
    const masterEnabled = state.status === "ready" && state.policy?.masterEnabled === true;
    const authorized = state.status === "ready" && state.policy?.providerAutonomousUse?.[providerId] === true;
    const infrastructureAvailable = state.serverStatus?.infrastructure?.available === true;
    const ready = infrastructureAvailable && integration.ready === true;
    const effective = masterEnabled && authorized && ready && server?.effective === true;

    let uiState = "OFF";
    let reason = "not-authorized";
    if (state.status !== "ready") {
      uiState = "BLOCKED";
      reason = "authority-unproven";
    } else if (!infrastructureAvailable) {
      uiState = "BLOCKED";
      reason = "autonomy-infrastructure-unavailable";
    } else if (!integration.ready) {
      uiState = "BLOCKED";
      reason = integration.reason || "provider-integration-not-ready";
    } else if (authorized) {
      uiState = masterEnabled ? "ON" : "OFF";
      reason = masterEnabled ? "authorized-and-effective" : "authorized-master-off";
    }

    return {
      ...clone(descriptor),
      authorized,
      masterEnabled,
      ready,
      available: integration.available === true,
      effective,
      uiState,
      reason,
      billingOwner: descriptor.billingOwnerDefault,
      server: clone(server),
      integration: clone(integration),
      billingDisclosureAcknowledged:
        Boolean(state.policy?.providerBillingDisclosure?.acknowledgedAt)
    };
  }

  function getSnapshot() {
    const capabilities = Object.fromEntries(
      Object.keys(CAPABILITY_DESCRIPTORS).map(id => [id, capabilityStatus(id)])
    );
    const providers = Object.fromEntries(
      Object.keys(PROVIDER_DESCRIPTORS).map(id => [id, providerStatus(id)])
    );

    return {
      schema: SCHEMA,
      commission: COMMISSION,
      version: VERSION,
      buildId: BUILD_ID,
      capturedAt: now(),
      status: state.status,
      authoritative: state.status === "ready",
      sourceOfTruth: "server-durable-autonomy-authority",
      browserAuthority: false,
      principal: clone(state.principal),
      masterEnabled: state.status === "ready" && state.policy?.masterEnabled === true,
      revision: state.status === "ready" ? Number(state.policy?.revision || 0) : null,
      capabilities,
      providers,
      economicAuthority: clone(state.serverStatus?.economicAuthority || IMMUTABLE_BOUNDARIES),
      externalAuthority: clone(state.serverStatus?.externalAuthority || IMMUTABLE_BOUNDARIES),
      providerControlContract: clone(state.serverStatus?.providerControlContract || null),
      persistence: clone(state.serverStatus?.persistence || null),
      lastLoadedAt: state.lastLoadedAt,
      lastSuccessfulLoadAt: state.lastSuccessfulLoadAt,
      lastError: clone(state.lastError)
    };
  }

  function isMasterEnabled() {
    return state.status === "ready" && state.policy?.masterEnabled === true;
  }

  function isAuthorized(capabilityId) {
    return capabilityStatus(capabilityId)?.effective === true;
  }

  function isProviderAuthorized(providerId) {
    return providerStatus(providerId)?.effective === true;
  }

  function canSpendAutomatically(amountUsd = 0) {
    const amount = Number(amountUsd || 0);
    if (!Number.isFinite(amount) || amount > 0) return false;
    return false;
  }

  function mayPerformExternalAction() {
    return false;
  }

  function maySignOrCertify() {
    return false;
  }

  function maySubmitExternally() {
    return false;
  }

  function notifyOtherTabs(revision) {
    try {
      state.broadcast?.postMessage({
        type: "authority-revision-changed",
        revision: Number(revision || 0),
        at: now()
      });
    } catch (_error) {
      // Cross-tab notification is convenience only and never authority.
    }
  }

  async function update(patch = {}) {
    const forbidden = ["economicAuthority", "externalAuthority"].filter(
      key => Object.prototype.hasOwnProperty.call(patch || {}, key)
    );
    if (forbidden.length) {
      const error = new Error("The browser switchboard cannot grant economic or external-action authority.");
      error.code = "AUTONOMY_CLIENT_BOUNDARY_IMMUTABLE";
      throw error;
    }

    const operation = async () => {
      await ensureFresh();
      const payload = await request("PUT", patch || {});
      const snapshot = acceptServerAuthority(payload, "write");
      notifyOtherTabs(snapshot.revision);
      emit("authority:receipt", {
        changed: payload.changed === true,
        receipt: clone(payload.receipt || null),
        snapshot
      });
      return {
        changed: payload.changed === true,
        receipt: clone(payload.receipt || null),
        snapshot
      };
    };

    state.writeChain = state.writeChain.then(operation, operation);
    return state.writeChain;
  }

  function setMasterEnabled(enabled) {
    return update({ masterEnabled: enabled === true });
  }

  function setCapabilityEnabled(capabilityId, enabled) {
    const id = normalizeId(capabilityId);
    if (!CAPABILITY_DESCRIPTORS[id]) {
      const error = new Error(`Unknown autonomy capability: ${id || "(empty)"}`);
      error.code = "AUTONOMY_UNKNOWN_CAPABILITY";
      return Promise.reject(error);
    }

    const current = capabilityStatus(id);
    if (enabled === true && current?.ready !== true) {
      const error = new Error(
        current?.reason || `Capability ${id} is not commissioned for autonomous operation.`
      );
      error.code = "AUTONOMY_CAPABILITY_NOT_READY";
      error.details = clone(current);
      return Promise.reject(error);
    }

    return update({ capabilities: { [id]: enabled === true } });
  }

  function setProviderAutonomousUse(providerId, enabled, options = {}) {
    const id = normalizeId(providerId);
    if (!PROVIDER_DESCRIPTORS[id]) {
      const error = new Error(`Unknown provider control: ${id || "(empty)"}`);
      error.code = "AUTONOMY_UNKNOWN_PROVIDER";
      return Promise.reject(error);
    }

    const current = providerStatus(id);
    if (enabled === true && current?.ready !== true) {
      const error = new Error(
        current?.reason || `Provider ${id} is not commissioned for autonomous operation.`
      );
      error.code = "AUTONOMY_PROVIDER_NOT_READY";
      error.details = clone(current);
      return Promise.reject(error);
    }

    const patch = {
      providerAutonomousUse: { [id]: enabled === true }
    };

    if (
      options.providerBillingDisclosureAcknowledged === true ||
      options.acknowledgeBilling === true
    ) {
      patch.providerBillingDisclosureAcknowledged = true;
    }

    return update(patch);
  }

  function getProviderBillingDisclosure() {
    return {
      acknowledged:
        Boolean(state.policy?.providerBillingDisclosure?.acknowledgedAt),
      acknowledgement: clone(state.policy?.providerBillingDisclosure || null),
      contract: clone(state.serverStatus?.providerControlContract || null),
      plainLanguage:
        state.serverStatus?.providerControlContract?.disableMeaning ||
        "Disabling MEOS use does not cancel a separate provider subscription/account or guarantee vendor billing stops."
    };
  }

  function registerIntegrationStatus(capabilityId, descriptor = {}) {
    const id = normalizeId(capabilityId);
    if (!CAPABILITY_DESCRIPTORS[id]) {
      throw new Error(`Cannot register unknown autonomy capability: ${id}`);
    }
    state.integrationOverrides.set(id, {
      ready: descriptor.ready === true,
      reason:
        descriptor.reason ||
        (descriptor.ready === true ? "registered-integration-ready" : "registered-integration-not-ready"),
      evidence: clone(descriptor.evidence || null),
      registeredAt: now()
    });
    emit("integration:changed", { type: "capability", id, status: capabilityStatus(id) });
    return capabilityStatus(id);
  }

  function registerProviderStatus(providerId, descriptor = {}) {
    const id = normalizeId(providerId);
    if (!PROVIDER_DESCRIPTORS[id]) {
      throw new Error(`Cannot register unknown autonomy provider: ${id}`);
    }
    state.providerOverrides.set(id, {
      ready: descriptor.ready === true,
      available: descriptor.available === true,
      reason:
        descriptor.reason ||
        (descriptor.ready === true ? "registered-provider-ready" : "registered-provider-not-ready"),
      evidence: clone(descriptor.evidence || null),
      registeredAt: now()
    });
    emit("integration:changed", { type: "provider", id, status: providerStatus(id) });
    return providerStatus(id);
  }

  function clearIntegrationOverride(id, type = "capability") {
    const normalized = normalizeId(id);
    const removed =
      type === "provider"
        ? state.providerOverrides.delete(normalized)
        : state.integrationOverrides.delete(normalized);
    if (removed) {
      emit("integration:changed", { type, id: normalized, removed: true });
    }
    return removed;
  }

  async function runServerAcceptanceTest() {
    if (typeof global.fetch !== "function") {
      throw new Error("Browser fetch is unavailable.");
    }
    return withTimeout(async signal => {
      const response = await global.fetch(ACCEPTANCE_API, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal
      });
      return parseResponse(response);
    });
  }

  function runAcceptanceTest() {
    const checks = [];
    const check = (name, passed, evidence = null) => {
      checks.push({ name, passed: passed === true, evidence: clone(evidence) });
    };

    const snapshot = getSnapshot();
    check("Browser is never autonomy authority", snapshot.browserAuthority === false, snapshot.browserAuthority);
    check("Automatic spend is impossible through switchboard", canSpendAutomatically(0) === false && canSpendAutomatically(1) === false);
    check("External action cannot be granted by switchboard", mayPerformExternalAction() === false);
    check("Signature/certification cannot be granted by switchboard", maySignOrCertify() === false);
    check("Submission cannot be granted by switchboard", maySubmitExternally() === false);
    check("Capability catalog is organization-neutral", Object.keys(CAPABILITY_DESCRIPTORS).length === 8);
    check("Provider catalog is provider-neutral", Object.keys(PROVIDER_DESCRIPTORS).length === 4);
    check("Opportunity Patrol is represented distinctly", CAPABILITY_DESCRIPTORS.opportunities?.label === "Opportunity Patrol");
    check("Provider billing disclosure is exposed", typeof getProviderBillingDisclosure().plainLanguage === "string");
    check("Unknown capability fails closed", capabilityStatus("not-a-capability") === null && isAuthorized("not-a-capability") === false);
    check("Unknown provider fails closed", providerStatus("not-a-provider") === null && isProviderAuthorized("not-a-provider") === false);
    check("Authority cache is memory-only", true, "No localStorage/IndexedDB/cookie authority APIs are used by this module.");

    return {
      schema: "meos.maddy-autonomy-switchboard.acceptance.v1",
      commission: COMMISSION,
      version: VERSION,
      buildId: BUILD_ID,
      success: checks.every(item => item.passed),
      passed: checks.filter(item => item.passed).length,
      total: checks.length,
      checks,
      snapshot
    };
  }

  function initializeBroadcast() {
    if (typeof BroadcastChannel !== "function") return;
    try {
      state.broadcast = new BroadcastChannel(BROADCAST_CHANNEL);
      state.broadcast.addEventListener("message", event => {
        if (event?.data?.type !== "authority-revision-changed") return;
        const incomingRevision = Number(event.data.revision || 0);
        if (incomingRevision > Number(state.revisionSeen || 0)) {
          refresh({ force: true }).catch(error => {
            console.warn(`[${NAME}] cross-tab authority refresh failed:`, error);
          });
        }
      });
    } catch (_error) {
      state.broadcast = null;
    }
  }

  function status() {
    return getSnapshot();
  }

  const api = Object.freeze({
    name: NAME,
    version: VERSION,
    buildId: BUILD_ID,
    commission: COMMISSION,
    schema: SCHEMA,
    refresh,
    ensureFresh,
    status,
    getSnapshot,
    capabilityStatus,
    providerStatus,
    listCapabilities: () => Object.keys(CAPABILITY_DESCRIPTORS).map(capabilityStatus),
    listProviders: () => Object.keys(PROVIDER_DESCRIPTORS).map(providerStatus),
    isMasterEnabled,
    isAuthorized,
    isProviderAuthorized,
    canSpendAutomatically,
    mayPerformExternalAction,
    maySignOrCertify,
    maySubmitExternally,
    setMasterEnabled,
    setCapabilityEnabled,
    setProviderAutonomousUse,
    getProviderBillingDisclosure,
    registerIntegrationStatus,
    registerProviderStatus,
    clearIntegrationOverride,
    runAcceptanceTest,
    runServerAcceptanceTest,
    on,
    off
  });

  global.MEOSAutonomyAuthority = api;
  global.MaddyAutonomy = api;

  initializeBroadcast();

  /*
   * Commission 006.031R — Runtime authority bootstrap repair.
   * Loading the switchboard is not authority, but the browser must actually
   * read the durable server policy so later organs can distinguish OFF from
   * UNPROVEN. This memory-only bootstrap never grants authority by itself.
   */
  Promise.resolve()
    .then(() => refresh({ force: true }))
    .catch(error => {
      console.warn(
        `[${NAME}] Initial durable authority read failed closed.`,
        error
      );
    });

  console.log(
    `[MEOS] ${NAME} v${VERSION} loaded. Server authority only; browser authority=false; durable authority bootstrap requested.`
  );
})(typeof window !== "undefined" ? window : globalThis);
