/*
 * Project Maddy / MEOS
 * Maddy Digital Physiology — Production Sensor Bridge
 * Version: 0.1.0
 * Build: MDP011-READ-ONLY-PRODUCTION-ORGAN-SENSORY-BRIDGE-20260924-A
 *
 * Mission:
 * Connect Maddy Digital Physiology to existing MEOS organs as observation-only
 * internal senses. This bridge reads status/summary surfaces only. It cannot
 * execute missions, scan, wake cognition, call providers, mutate evidence,
 * spend, deploy, alter policy, resist shutdown, or create authority.
 */
(function initializeMaddyDigitalPhysiologySensors(global) {
  "use strict";

  const NAME = "Maddy Digital Physiology Production Sensor Bridge";
  const VERSION = "0.1.0";
  const BUILD_ID = "MDP011-READ-ONLY-PRODUCTION-ORGAN-SENSORY-BRIDGE-20260924-A";
  const SCHEMA = "meos.maddy.digital-physiology.production-sensors.v1";

  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp01 = value => Math.max(0, Math.min(1, finite(value, 0)));
  const countPressure = (count, halfSaturation = 4) => {
    const normalizedCount = Math.max(0, finite(count, 0));
    const scale = Math.max(0.0001, finite(halfSaturation, 4));
    return Number((normalizedCount / (normalizedCount + scale)).toFixed(4));
  };
  const ratio = (numerator, denominator, fallback = null) => {
    const n = finite(numerator, 0);
    const d = finite(denominator, 0);
    if (d <= 0) return fallback;
    return clamp01(n / d);
  };
  const nowMs = () => Date.now();
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
    installedAt: null,
    lastInstall: null,

    getPhysiology() {
      return global.MaddyDigitalPhysiology || null;
    },

    install(options = {}) {
      const physiology = this.getPhysiology();
      if (!physiology || typeof physiology.registerSensor !== "function") {
        const result = {
          success: false,
          installed: false,
          reason: "maddy-digital-physiology-unavailable",
          registered: [],
          skipped: []
        };
        this.lastInstall = result;
        return clone(result);
      }

      const replaceExisting = options.replaceExisting === true;
      const registered = [];
      const skipped = [];

      const installSensor = (id, available, descriptorFactory) => {
        if (!available) {
          skipped.push({ id, reason: "source-unavailable" });
          return;
        }
        if (physiology.sensors?.has?.(id) && !replaceExisting) {
          skipped.push({ id, reason: "already-registered" });
          return;
        }
        if (physiology.sensors?.has?.(id) && typeof physiology.unregisterSensor === "function") {
          physiology.unregisterSensor(id);
        }
        physiology.registerSensor(id, descriptorFactory());
        registered.push(id);
      };

      installSensor(
        "meos-mission-engine",
        typeof global.MEOSMissionEngine?.getMissionSummary === "function",
        () => ({
          label: "Mission Engine physiology",
          sourceKind: "meos-mission-engine",
          read: () => {
            const mission = global.MEOSMissionEngine;
            const summary = mission?.getMissionSummary?.() || {};
            const persistence = mission?.getPersistenceStatus?.() || {};
            const observedAtMs = nowMs();
            const signals = [
              { dimension: "workload", metric: "active-mission-load", value: countPressure(summary.totalActive, 12), polarity: "pressure", confidence: 0.96, importance: 0.45, observedAtMs, provenance: { buildId: mission?.buildId || null, totalActive: finite(summary.totalActive) } },
              { dimension: "workload", metric: "critical-mission-load", value: countPressure(summary.critical, 2), polarity: "pressure", confidence: 0.98, importance: 0.95, observedAtMs, provenance: { buildId: mission?.buildId || null, critical: finite(summary.critical) } },
              { dimension: "workload", metric: "blocked-mission-load", value: countPressure(summary.blocked, 2), polarity: "pressure", confidence: 0.98, importance: 1, observedAtMs, provenance: { buildId: mission?.buildId || null, blocked: finite(summary.blocked) } },
              { dimension: "workload", metric: "pending-approval-load", value: countPressure(summary.pendingApproval, 5), polarity: "pressure", confidence: 0.96, importance: 0.55, observedAtMs, provenance: { buildId: mission?.buildId || null, pendingApproval: finite(summary.pendingApproval) } },
              { dimension: "continuity", metric: "mission-durable-authority-health", value: persistence.durableAuthority === true ? 1 : 0, polarity: "health", confidence: 1, importance: 1, observedAtMs, provenance: { mode: persistence.mode || null, authoritativeStorage: persistence.authoritativeStorage || null } },
              { dimension: "continuity", metric: "mission-persistence-degradation", value: persistence.degraded === true || persistence.suspended === true ? 0.95 : 0, polarity: "pressure", confidence: 1, importance: 1, observedAtMs, provenance: { degraded: persistence.degraded === true, suspended: persistence.suspended === true, lastError: persistence.lastError || null } }
            ];
            if (typeof persistence.durableAvailable === "boolean") {
              signals.push({ dimension: "continuity", metric: "mission-durable-availability", value: persistence.durableAvailable ? 1 : 0, polarity: "health", confidence: 0.98, importance: 0.95, observedAtMs, provenance: { activeProviderId: persistence.activeProviderId || null } });
            }
            return signals;
          }
        })
      );

      installSensor(
        "meos-executive-monitoring",
        typeof global.ExecutiveMonitoring?.getStatus === "function",
        () => ({
          label: "Executive Monitoring physiology",
          sourceKind: "meos-executive-monitoring",
          read: () => {
            const monitoring = global.ExecutiveMonitoring;
            const status = monitoring?.getStatus?.() || {};
            const analytics = status.analytics || {};
            const observedAtMs = nowMs();
            return [
              { dimension: "organIntegrity", metric: "executive-monitoring-runtime-health", value: String(status.status || "").toLowerCase() === "online" ? 1 : 0, polarity: "health", confidence: 0.98, importance: 0.8, observedAtMs, provenance: { buildId: status.buildId || monitoring?.buildId || null, operatingMode: status.operatingMode || null } },
              { dimension: "workload", metric: "open-monitoring-alert-load", value: countPressure(analytics.openAlerts ?? status.alertCount, 8), polarity: "pressure", confidence: 0.95, importance: 0.65, observedAtMs, provenance: { openAlerts: finite(analytics.openAlerts ?? status.alertCount) } },
              { dimension: "workload", metric: "critical-monitoring-alert-load", value: countPressure(analytics.criticalAlerts, 2), polarity: "pressure", confidence: 0.98, importance: 1, observedAtMs, provenance: { criticalAlerts: finite(analytics.criticalAlerts) } }
            ];
          }
        })
      );

      installSensor(
        "meos-executive-brain",
        typeof global.ExecutiveBrain?.getStatus === "function",
        () => ({
          label: "Executive Brain physiology",
          sourceKind: "meos-executive-brain",
          read: () => {
            const brain = global.ExecutiveBrain;
            const status = brain?.getStatus?.() || {};
            const observedAtMs = nowMs();
            const availabilityHealth = ratio(status.availableComponents, status.totalComponents, null);
            const onlineHealth = ratio(status.onlineComponents, status.totalComponents, null);
            const signals = [
              { dimension: "continuity", metric: "temporal-continuity-health", value: status.temporalContinuityReady === true ? 1 : 0, polarity: "health", confidence: 0.98, importance: 1, observedAtMs, provenance: { temporalContinuity: status.temporalContinuity?.status || null, buildId: status.buildId || brain?.buildId || null } }
            ];
            if (availabilityHealth !== null) {
              signals.push({ dimension: "organIntegrity", metric: "component-availability-health", value: availabilityHealth, polarity: "health", confidence: 0.95, importance: 0.8, observedAtMs, provenance: { availableComponents: finite(status.availableComponents), totalComponents: finite(status.totalComponents) } });
            }
            if (onlineHealth !== null) {
              signals.push({ dimension: "organIntegrity", metric: "component-online-health", value: onlineHealth, polarity: "health", confidence: 0.95, importance: 0.9, observedAtMs, provenance: { onlineComponents: finite(status.onlineComponents), totalComponents: finite(status.totalComponents) } });
            }
            return signals;
          }
        })
      );

      installSensor(
        "meos-provider-manager",
        typeof (global.MEOSProviderManager || global.ProviderManager)?.getStatus === "function",
        () => ({
          label: "Provider Manager physiology",
          sourceKind: "meos-provider-manager",
          read: () => {
            const providers = global.MEOSProviderManager || global.ProviderManager;
            const status = providers?.getStatus?.() || {};
            const observedAtMs = nowMs();
            const registeredProviders = Math.max(0, finite(status.registeredProviders));
            const unavailableProviders = Math.max(0, finite(status.unavailableProviders));
            const signals = [
              { dimension: "organIntegrity", metric: "provider-manager-runtime-health", value: String(status.operatingMode || "").includes("provider-neutral") ? 1 : 0.5, polarity: "health", confidence: 0.85, importance: 0.45, observedAtMs, provenance: { buildId: status.buildId || providers?.buildId || null, status: status.status || null } },
              { dimension: "dependencyPressure", metric: "active-provider-execution-load", value: countPressure(status.activeExecutions, 4), polarity: "pressure", confidence: 0.95, importance: 0.45, observedAtMs, provenance: { activeExecutions: finite(status.activeExecutions) } }
            ];
            if (registeredProviders > 0) {
              signals.push({ dimension: "dependencyPressure", metric: "registered-provider-unavailability", value: clamp01(unavailableProviders / registeredProviders), polarity: "pressure", confidence: 0.98, importance: 0.8, observedAtMs, provenance: { registeredProviders, unavailableProviders } });
            }
            const persistence = status.persistence || {};
            if (persistence.durableWriteSuspended === true || persistence.lastError) {
              signals.push({ dimension: "dependencyPressure", metric: "provider-persistence-degradation", value: 0.8, polarity: "pressure", confidence: 0.95, importance: 0.7, observedAtMs, provenance: { durableWriteSuspended: persistence.durableWriteSuspended === true, lastError: persistence.lastError || null } });
            }
            return signals;
          }
        })
      );

      installSensor(
        "meos-evidence-integrity",
        typeof (global.ExecutiveEvidenceIntegrity || global.MEOSExecutiveEvidenceIntegrity)?.getStatus === "function",
        () => ({
          label: "Evidence Integrity physiology",
          sourceKind: "meos-executive-evidence-integrity",
          read: () => {
            const evidence = global.ExecutiveEvidenceIntegrity || global.MEOSExecutiveEvidenceIntegrity;
            const status = evidence?.getStatus?.() || {};
            return [{
              dimension: "organIntegrity",
              metric: "evidence-integrity-runtime-health",
              value: String(status.status || "").toLowerCase() === "online" ? 1 : 0,
              polarity: "health",
              confidence: 0.98,
              importance: 0.9,
              observedAtMs: nowMs(),
              provenance: {
                buildId: status.buildId || evidence?.buildId || null,
                schema: status.schema || null,
                note: "Historical cumulative conflict counters are deliberately not converted into current epistemic pressure."
              }
            }];
          }
        })
      );

      this.installedAt = new Date().toISOString();
      const result = {
        success: true,
        installed: true,
        schema: SCHEMA,
        version: VERSION,
        buildId: BUILD_ID,
        registered,
        skipped,
        sensorCount: physiology.sensors?.size ?? null,
        authority: {
          observationOnly: true,
          samplesAutomatically: false,
          correctiveActionAuthorized: false,
          providerUseAuthorized: false,
          neuromorphicWakeAuthorized: false
        }
      };
      this.lastInstall = clone(result);
      return result;
    },

    getStatus() {
      return {
        name: NAME,
        version: VERSION,
        buildId: BUILD_ID,
        schema: SCHEMA,
        installedAt: this.installedAt,
        lastInstall: clone(this.lastInstall),
        physiologyAvailable: Boolean(this.getPhysiology())
      };
    }
  };

  global.MaddyDigitalPhysiologySensors = api;

  if (global.MaddyDigitalPhysiology) {
    api.install();
  }
})(typeof window !== "undefined" ? window : globalThis);
