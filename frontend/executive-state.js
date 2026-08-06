/**
 * Maddy Executive Operating System (MEOS)
 * Executive State
 *
 * Commission: 005.000
 * Version: 1.0.0
 *
 * Purpose:
 * - Provide one provider-neutral, evidence-backed view of organizational reality.
 * - Give Maddy and every MEOS surface the same authoritative operational snapshot.
 * - Preserve human-facing executive identities without inventing executive activity.
 * - Normalize state from commissioned MEOS engines without replacing those engines.
 *
 * Executive State is a read/coordination layer. Source engines remain authoritative.
 */
(function (global) {
  "use strict";

  const NAME = "MEOS Executive State";
  const VERSION = "1.0.0";
  const BUILD_ID = "commission-005.000";
  const SCHEMA = "meos.executive-state.snapshot.v1";

  const listeners = new Map();
  const sources = new Map();
  let revision = 0;
  let lastSnapshot = null;

  const now = () => new Date().toISOString();
  const clone = value => {
    if (value === undefined) return undefined;
    try { return structuredClone(value); }
    catch (_) { return JSON.parse(JSON.stringify(value)); }
  };

  function safe(label, fn, fallback = null) {
    try { return fn(); }
    catch (error) {
      return {
        unavailable: true,
        source: label,
        reason: error?.message || String(error),
        fallback
      };
    }
  }

  function emit(eventName, payload) {
    (listeners.get(eventName) || []).forEach(listener => {
      try { listener(clone(payload)); }
      catch (error) { console.error(`[${NAME}] listener failed:`, error); }
    });
  }

  function on(eventName, listener) {
    if (typeof listener !== "function") throw new TypeError("listener must be a function");
    const group = listeners.get(eventName) || [];
    group.push(listener);
    listeners.set(eventName, group);
    return () => off(eventName, listener);
  }

  function off(eventName, listener) {
    const group = listeners.get(eventName) || [];
    listeners.set(eventName, group.filter(item => item !== listener));
    return true;
  }

  function registerSource(id, descriptor) {
    if (!id || typeof id !== "string") throw new TypeError("source id is required");
    if (!descriptor || typeof descriptor.read !== "function") {
      throw new TypeError("Executive State sources require a read() function");
    }
    sources.set(id, {
      id,
      label: descriptor.label || id,
      kind: descriptor.kind || "extension",
      read: descriptor.read,
      evidence: descriptor.evidence !== false
    });
    emit("source:registered", { id, at: now() });
    return true;
  }

  function unregisterSource(id) {
    return sources.delete(id);
  }

  function cabinetState() {
    const meos = global.MEOS;
    if (!meos?.getCabinet) return { available: false, reason: "executive-offices-unavailable" };

    const cabinet = safe("MEOS.getCabinet", () => meos.getCabinet());
    if (!cabinet || cabinet.unavailable) return cabinet;

    const offices = (cabinet.offices || []).map(office => {
      const scorecard = safe(`office:${office.id}`, () => meos.getOfficeScorecard(office.id), {});
      return {
        id: office.id,
        name: office.name,
        office: office.office,
        title: office.title || office.role || null,
        reportsTo: office.reportsTo || "maddy",
        identity: {
          personified: true,
          executiveName: office.name,
          executiveOffice: office.office
        },
        operational: scorecard,
        implementation: safe(`implementation:${office.id}`, () => meos.getOfficeImplementation(office.id), null)
      };
    });

    return {
      available: true,
      executiveDirector: clone(cabinet.executiveDirector),
      maddy: clone(cabinet.maddy),
      offices
    };
  }

  function engineState() {
    const mission = global.MEOSMissionEngine;
    const planning = global.ExecutivePlanning;
    const workflow = global.ExecutiveWorkflow;
    const decision = global.ExecutiveDecision;
    const monitoring = global.ExecutiveMonitoring;
    const brain = global.ExecutiveBrain;
    const providers = global.MEOSProviderManager || global.ProviderManager;

    return {
      missions: mission ? {
        available: true,
        summary: safe("MissionEngine.summary", () => mission.getMissionSummary?.(), null),
        active: safe("MissionEngine.active", () => mission.getActiveMissions?.() || [], []),
        approvals: safe("MissionEngine.approvals", () => mission.getApprovalQueue?.() || [], []),
        activity: safe("MissionEngine.activity", () => mission.getActivityLog?.() || [], [])
      } : { available: false, reason: "mission-engine-unavailable" },

      planning: planning ? {
        available: true,
        status: safe("ExecutivePlanning.status", () => planning.getStatus?.(), null),
        plans: clone(planning.plans || planning.state?.plans || [])
      } : { available: false, reason: "planning-engine-unavailable" },

      workflows: workflow ? {
        available: true,
        status: safe("ExecutiveWorkflow.status", () => workflow.getStatus?.(), null),
        workflows: clone(workflow.workflows || workflow.state?.workflows || [])
      } : { available: false, reason: "workflow-engine-unavailable" },

      decisions: decision ? {
        available: true,
        status: safe("ExecutiveDecision.status", () => decision.getStatus?.(), null),
        decisions: clone(decision.decisions || [])
      } : { available: false, reason: "decision-engine-unavailable" },

      monitoring: monitoring ? {
        available: true,
        status: safe("ExecutiveMonitoring.status", () => monitoring.getStatus?.(), null),
        alerts: clone(monitoring.alerts || monitoring.state?.alerts || [])
      } : { available: false, reason: "monitoring-engine-unavailable" },

      brain: brain ? {
        available: true,
        status: clone(brain.status || safe("ExecutiveBrain.status", () => brain.getStatus?.(), null))
      } : { available: false, reason: "executive-brain-unavailable" },

      providers: providers ? {
        available: true,
        status: safe("ProviderManager.status", () => providers.getStatus?.(), null),
        providers: safe("ProviderManager.providers", () => providers.listProviders?.() || [], []),
        capabilities: safe("ProviderManager.capabilities", () => providers.listCapabilities?.() || [], [])
      } : { available: false, reason: "provider-manager-unavailable" }
    };
  }

  function extensionState() {
    const result = {};
    sources.forEach(source => {
      result[source.id] = safe(source.label, () => ({
        available: true,
        kind: source.kind,
        evidenceBacked: source.evidence,
        data: clone(source.read())
      }), null);
    });
    return result;
  }

  function evidenceSummary(snapshot) {
    const unavailable = [];
    const inspect = (path, value) => {
      if (value && typeof value === "object" && value.available === false) unavailable.push(path);
    };
    inspect("cabinet", snapshot.organization);
    Object.entries(snapshot.operations || {}).forEach(([key, value]) => inspect(`operations.${key}`, value));
    return {
      policy: "runtime-evidence-only",
      personificationPolicy: "executive-identities-may-be-human-facing; claimed-work-must-be-runtime-backed",
      unavailableSources: unavailable,
      sourceCount: 1 + Object.keys(snapshot.operations || {}).length + Object.keys(snapshot.extensions || {}).length,
      capturedAt: snapshot.capturedAt
    };
  }

  function getSnapshot(options = {}) {
    const snapshot = {
      schema: SCHEMA,
      version: VERSION,
      buildId: BUILD_ID,
      revision: ++revision,
      capturedAt: now(),
      organization: cabinetState(),
      operations: engineState(),
      extensions: extensionState()
    };
    snapshot.evidence = evidenceSummary(snapshot);
    lastSnapshot = clone(snapshot);
    if (!options.silent) emit("state:snapshot", snapshot);
    return clone(snapshot);
  }

  function getMaddyContext() {
    const snapshot = getSnapshot({ silent: true });
    return {
      schema: "meos.maddy.executive-context.v1",
      capturedAt: snapshot.capturedAt,
      executiveIdentity: snapshot.organization?.maddy || null,
      executiveDirector: snapshot.organization?.executiveDirector || null,
      offices: snapshot.organization?.offices || [],
      operations: snapshot.operations,
      extensions: snapshot.extensions,
      evidence: snapshot.evidence
    };
  }

  function getOfficeState(officeId) {
    const snapshot = getSnapshot({ silent: true });
    return clone((snapshot.organization?.offices || []).find(office => office.id === officeId) || null);
  }

  function getStatus() {
    return {
      name: NAME,
      version: VERSION,
      buildId: BUILD_ID,
      schema: SCHEMA,
      status: "online",
      revision,
      lastCapturedAt: lastSnapshot?.capturedAt || null,
      registeredSources: Array.from(sources.keys())
    };
  }

  function runSelfTest() {
    const checks = [];
    const check = (name, passed, detail) => checks.push({ name, passed: Boolean(passed), detail });
    const snapshot = getSnapshot({ silent: true });

    check("snapshot-schema", snapshot.schema === SCHEMA, snapshot.schema);
    check("timestamp-present", Boolean(snapshot.capturedAt), snapshot.capturedAt);
    check("organization-section", Boolean(snapshot.organization), snapshot.organization?.available);
    check("operations-section", Boolean(snapshot.operations), Object.keys(snapshot.operations || {}));
    check("evidence-policy", snapshot.evidence?.policy === "runtime-evidence-only", snapshot.evidence?.policy);
    check("no-fake-work-policy", snapshot.evidence?.personificationPolicy?.includes("claimed-work-must-be-runtime-backed"), snapshot.evidence?.personificationPolicy);
    check("maddy-context", getMaddyContext().schema === "meos.maddy.executive-context.v1", null);

    return {
      success: checks.every(item => item.passed),
      schema: "meos.executive-state.acceptance-test.v1",
      version: VERSION,
      buildId: BUILD_ID,
      passed: checks.filter(item => item.passed).length,
      total: checks.length,
      checks
    };
  }

  const api = Object.freeze({
    name: NAME,
    version: VERSION,
    buildId: BUILD_ID,
    schema: SCHEMA,
    getSnapshot,
    getMaddyContext,
    getOfficeState,
    getStatus,
    registerSource,
    unregisterSource,
    on,
    off,
    runSelfTest
  });

  global.MEOSExecutiveState = api;
  global.ExecutiveState = api;

  console.log(`[MEOS] ${NAME} v${VERSION} online. Build ${BUILD_ID}. Runtime evidence is authoritative.`);
})(window);
