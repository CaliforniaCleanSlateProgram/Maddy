/*
 * Project Maddy / MEOS
 * Maddy Digital Physiology — Bounded Heartbeat
 * Version: 0.1.0
 * Build: MDP014-BOUNDED-DIGITAL-PHYSIOLOGY-HEARTBEAT-20260924-A
 *
 * Mission:
 * Periodically sample already-registered Digital Physiology sensors and create
 * an internal-condition snapshot. This is a browser-runtime heartbeat, not a
 * durable server authority and not a self-preservation loop.
 *
 * Boundary:
 * Sampling may read existing organ status/summary surfaces and emit physiology
 * snapshots. It cannot create missions, launch cognition/research, call
 * providers, spend, deploy, mutate policy/code, resist shutdown, or create
 * authority. Errors fail soft and never block the existing Maddy runtime.
 */
(function initializeMaddyDigitalPhysiologyHeartbeat(global) {
  "use strict";

  const NAME = "Maddy Digital Physiology Bounded Heartbeat";
  const VERSION = "0.1.0";
  const BUILD_ID = "MDP014-BOUNDED-DIGITAL-PHYSIOLOGY-HEARTBEAT-20260924-A";
  const SCHEMA = "meos.maddy.digital-physiology.heartbeat.v1";

  const clone = value => {
    if (value === undefined) return undefined;
    try { return structuredClone(value); }
    catch (_) { return JSON.parse(JSON.stringify(value)); }
  };

  const api = {
    name: NAME,
    version: VERSION,
    buildId: BUILD_ID,
    schema: SCHEMA,
    intervalMs: 60 * 1000,
    initialDelayMs: 5 * 1000,
    running: false,
    sampling: false,
    timerId: null,
    sampleCount: 0,
    errorCount: 0,
    skippedOverlapCount: 0,
    startedAt: null,
    lastSampleAt: null,
    lastError: null,
    lastSnapshotRevision: null,

    getPhysiology() {
      return global.MaddyDigitalPhysiology || null;
    },

    sampleOnce(options = {}) {
      const physiology = this.getPhysiology();
      if (!physiology || typeof physiology.assess !== "function") {
        return { success: false, sampled: false, reason: "digital-physiology-unavailable" };
      }
      if (this.sampling) {
        this.skippedOverlapCount += 1;
        return { success: true, sampled: false, reason: "sample-already-in-progress" };
      }

      this.sampling = true;
      try {
        const snapshot = physiology.assess({
          sampleSensors: true,
          ...(Number.isFinite(Number(options.atMs)) ? { atMs: Number(options.atMs) } : {})
        });
        this.sampleCount += 1;
        this.lastSampleAt = new Date().toISOString();
        this.lastSnapshotRevision = snapshot?.revision ?? null;
        this.lastError = null;
        return {
          success: true,
          sampled: true,
          revision: this.lastSnapshotRevision,
          assessedAt: snapshot?.assessedAt || null,
          highestPressureDimension: clone(snapshot?.highestPressureDimension || null),
          observedDimensionCount: snapshot?.observedDimensionCount ?? null
        };
      } catch (error) {
        this.errorCount += 1;
        this.lastError = error?.message || String(error);
        console.warn(`[${NAME}] sample failed; existing Maddy runtime remains unchanged.`, error);
        return { success: false, sampled: false, reason: "sample-failed", error: this.lastError };
      } finally {
        this.sampling = false;
      }
    },

    schedule(delayMs) {
      if (!this.running) return null;
      if (this.timerId !== null) {
        global.clearTimeout(this.timerId);
        this.timerId = null;
      }
      const boundedDelay = Math.max(1000, Number(delayMs || this.intervalMs));
      this.timerId = global.setTimeout(() => {
        this.timerId = null;
        if (!this.running) return;
        this.sampleOnce();
        this.schedule(this.intervalMs);
      }, boundedDelay);
      return this.timerId;
    },

    start(options = {}) {
      const physiology = this.getPhysiology();
      if (!physiology || typeof physiology.assess !== "function") {
        return { success: false, running: false, reason: "digital-physiology-unavailable" };
      }
      if (this.running) {
        return { success: true, running: true, reused: true, startedAt: this.startedAt };
      }

      const requestedInterval = Number(options.intervalMs);
      if (Number.isFinite(requestedInterval)) {
        this.intervalMs = Math.max(10 * 1000, Math.min(15 * 60 * 1000, requestedInterval));
      }
      const requestedInitialDelay = Number(options.initialDelayMs);
      if (Number.isFinite(requestedInitialDelay)) {
        this.initialDelayMs = Math.max(1000, Math.min(this.intervalMs, requestedInitialDelay));
      }

      this.running = true;
      this.startedAt = new Date().toISOString();
      this.schedule(this.initialDelayMs);
      return {
        success: true,
        running: true,
        reused: false,
        startedAt: this.startedAt,
        intervalMs: this.intervalMs,
        initialDelayMs: this.initialDelayMs,
        authority: clone(this.getStatus().authority)
      };
    },

    stop() {
      this.running = false;
      if (this.timerId !== null) {
        global.clearTimeout(this.timerId);
        this.timerId = null;
      }
      return { success: true, running: false };
    },

    getStatus() {
      return {
        name: NAME,
        version: VERSION,
        buildId: BUILD_ID,
        schema: SCHEMA,
        running: this.running,
        sampling: this.sampling,
        intervalMs: this.intervalMs,
        initialDelayMs: this.initialDelayMs,
        sampleCount: this.sampleCount,
        errorCount: this.errorCount,
        skippedOverlapCount: this.skippedOverlapCount,
        startedAt: this.startedAt,
        lastSampleAt: this.lastSampleAt,
        lastSnapshotRevision: this.lastSnapshotRevision,
        lastError: this.lastError,
        persistenceAuthority: "none-browser-derived-observation-only",
        authority: {
          sampleRegisteredSensors: true,
          emitPhysiologySnapshots: true,
          durableAuthority: false,
          cognitiveWakeAuthorized: false,
          investigationAuthorized: false,
          missionCreationAuthorized: false,
          providerUseAuthorized: false,
          spendAuthorized: false,
          externalActionAuthorized: false,
          correctiveActionAuthorized: false,
          productionMutationAuthorized: false,
          shutdownResistanceAuthorized: false
        }
      };
    }
  };

  global.MaddyDigitalPhysiologyHeartbeat = api;

  if (global.MaddyDigitalPhysiology) {
    api.start();
  }
})(typeof window !== "undefined" ? window : globalThis);
