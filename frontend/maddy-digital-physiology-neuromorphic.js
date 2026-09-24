/*
 * Project Maddy / MEOS
 * Maddy Digital Physiology — Neuromorphic Advisory Bridge
 * Version: 0.1.0
 * Build: MDP013-PHYSIOLOGY-NEUROMORPHIC-ADVISORY-BRIDGE-20260924-A
 *
 * Mission:
 * Allow significant Digital Physiology snapshots to contribute bounded internal
 * condition events to Maddy's already-proven neuromorphic attention fabric.
 *
 * Boundary:
 * This bridge may update neuromorphic peripheral/channel state only through
 * ExecutiveBrain.processNeuromorphicEvent(). It does not call world-model
 * attention, schedule cognitive re-entry, launch research, create missions,
 * contact providers, spend, deploy, mutate policy, or execute corrective action.
 */
(function initializeMaddyDigitalPhysiologyNeuromorphicBridge(global) {
  "use strict";

  const NAME = "Maddy Digital Physiology Neuromorphic Advisory Bridge";
  const VERSION = "0.1.0";
  const BUILD_ID = "MDP013-PHYSIOLOGY-NEUROMORPHIC-ADVISORY-BRIDGE-20260924-A";
  const SCHEMA = "meos.maddy.digital-physiology.neuromorphic-advisory.v1";

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
    connected: false,
    connectedAt: null,
    unsubscribe: null,
    integrationCount: 0,
    lastIntegration: null,
    minimumRepeatIntervalMs: 5 * 60 * 1000,
    minimumPressureDelta: 0.08,
    lastDeliveryByChannel: new Map(),

    getPhysiology() {
      return global.MaddyDigitalPhysiology || null;
    },

    getBrain() {
      return global.ExecutiveBrain || null;
    },

    integrateSnapshot(snapshot, options = {}) {
      const physiology = this.getPhysiology();
      const brain = this.getBrain();

      if (!physiology || typeof physiology.deriveNeuromorphicEventCandidates !== "function") {
        return { success: false, integrated: 0, reason: "digital-physiology-unavailable", results: [] };
      }
      if (!brain || typeof brain.processNeuromorphicEvent !== "function") {
        return { success: false, integrated: 0, reason: "executive-brain-neuromorphic-fabric-unavailable", results: [] };
      }

      const candidates = physiology.deriveNeuromorphicEventCandidates(snapshot || physiology.lastSnapshot);
      const results = [];

      const integrationNowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
      const regimeRank = { nominal: 0, watch: 1, strained: 2, "critical-condition": 3 };

      for (const candidate of candidates) {
        if (candidate?.authority?.wakeAuthorized !== false || candidate?.authority?.correctiveActionAuthorized !== false) {
          results.push({ success: false, skipped: true, reason: "candidate-authority-contract-invalid", candidate: clone(candidate) });
          continue;
        }

        const prior = this.lastDeliveryByChannel.get(candidate.channelKey) || null;
        const currentPressure = Number(candidate.importance || 0);
        const currentRegime = snapshot?.dimensions?.[String(candidate.channelKey || "").replace(/^physiology:/, "")]?.regime || null;
        const currentTrend = snapshot?.dimensions?.[String(candidate.channelKey || "").replace(/^physiology:/, "")]?.trend || null;
        const pressureDelta = prior ? Math.abs(currentPressure - Number(prior.pressure || 0)) : Infinity;
        const regimeEscalated = prior && (regimeRank[currentRegime] ?? 0) > (regimeRank[prior.regime] ?? 0);
        const trendEscalated = prior && currentTrend === "worsening" && prior.trend !== "worsening";
        const repeatWindowExpired = !prior || integrationNowMs - Number(prior.deliveredAtMs || 0) >= Number(this.minimumRepeatIntervalMs || 0);
        const materiallyChanged = !prior || pressureDelta >= Number(this.minimumPressureDelta || 0) || regimeEscalated || trendEscalated;

        if (!materiallyChanged && !repeatWindowExpired) {
          results.push({
            success: true,
            skipped: true,
            reason: "stable-repeat-suppressed",
            channelKey: candidate.channelKey,
            pressure: currentPressure,
            priorPressure: prior?.pressure ?? null,
            regime: currentRegime,
            trend: currentTrend,
            nextRepeatEligibleAtMs: Number(prior?.deliveredAtMs || 0) + Number(this.minimumRepeatIntervalMs || 0)
          });
          continue;
        }

        const event = {
          source: "maddy-digital-physiology",
          type: "internal-condition-change",
          channelKey: candidate.channelKey,
          subject: candidate.subject,
          domains: clone(candidate.domains || ["digital-physiology"]),
          importance: candidate.importance,
          salience: candidate.salience,
          urgency: candidate.urgency,
          novelty: 0.2,
          confidence: 0.9,
          missionConsequence: candidate.channelKey === "physiology:continuity" ? 0.75 : 0.35,
          evidence: clone(candidate.evidence || []),
          evidenceFingerprint: null,
          physiologyAuthority: clone(candidate.authority),
          authority: {
            neuromorphicPeripheralIntegrationAuthorized: true,
            cognitiveWakeAuthorized: false,
            investigationAuthorized: false,
            missionCreationAuthorized: false,
            providerUseAuthorized: false,
            spendAuthorized: false,
            externalActionAuthorized: false,
            correctiveActionAuthorized: false
          }
        };

        const result = brain.processNeuromorphicEvent(event, {
          persist: false,
          nowMs: options.nowMs
        });

        this.lastDeliveryByChannel.set(candidate.channelKey, {
          pressure: currentPressure,
          regime: currentRegime,
          trend: currentTrend,
          deliveredAtMs: integrationNowMs
        });

        results.push({
          success: true,
          skipped: false,
          channelKey: result?.channelKey || event.channelKey,
          disposition: result?.disposition || null,
          spiked: result?.spiked === true,
          spikeId: result?.spike?.spikeId || null,
          potential: result?.potential ?? null,
          threshold: result?.threshold ?? null,
          authority: clone(event.authority)
        });
      }

      this.integrationCount += results.filter(item => item.success && !item.skipped).length;
      this.lastIntegration = {
        schema: SCHEMA,
        buildId: BUILD_ID,
        integratedAt: new Date().toISOString(),
        sourceSnapshotRevision: snapshot?.revision ?? physiology.lastSnapshot?.revision ?? null,
        candidateCount: candidates.length,
        integrated: results.filter(item => item.success && !item.skipped).length,
        results: clone(results),
        authority: {
          cognitiveWakeAuthorized: false,
          investigationAuthorized: false,
          correctiveActionAuthorized: false,
          externalActionAuthorized: false
        }
      };

      return {
        success: true,
        integrated: this.lastIntegration.integrated,
        candidates: candidates.length,
        results: clone(results),
        authority: clone(this.lastIntegration.authority)
      };
    },

    connect() {
      if (this.connected) {
        return { success: true, connected: true, reused: true, connectedAt: this.connectedAt };
      }

      const physiology = this.getPhysiology();
      if (!physiology || typeof physiology.on !== "function") {
        return { success: false, connected: false, reason: "digital-physiology-event-surface-unavailable" };
      }

      this.unsubscribe = physiology.on("physiology:snapshot", snapshot => {
        try {
          this.integrateSnapshot(snapshot);
        } catch (error) {
          console.warn(`[${NAME}] advisory integration failed; physiology and Executive Brain remain independently operational.`, error);
        }
      });
      this.connected = true;
      this.connectedAt = new Date().toISOString();
      return { success: true, connected: true, reused: false, connectedAt: this.connectedAt };
    },

    disconnect() {
      if (typeof this.unsubscribe === "function") {
        try { this.unsubscribe(); } catch (_) {}
      }
      this.unsubscribe = null;
      this.connected = false;
      return { success: true, connected: false };
    },

    getStatus() {
      return {
        name: NAME,
        version: VERSION,
        buildId: BUILD_ID,
        schema: SCHEMA,
        connected: this.connected,
        connectedAt: this.connectedAt,
        integrationCount: this.integrationCount,
        lastIntegration: clone(this.lastIntegration),
        changeGate: {
          minimumRepeatIntervalMs: this.minimumRepeatIntervalMs,
          minimumPressureDelta: this.minimumPressureDelta,
          trackedChannels: this.lastDeliveryByChannel.size
        },
        authority: {
          neuromorphicPeripheralIntegrationAuthorized: true,
          cognitiveWakeAuthorized: false,
          investigationAuthorized: false,
          missionCreationAuthorized: false,
          providerUseAuthorized: false,
          spendAuthorized: false,
          externalActionAuthorized: false,
          correctiveActionAuthorized: false
        }
      };
    }
  };

  global.MaddyDigitalPhysiologyNeuromorphicBridge = api;

  if (global.MaddyDigitalPhysiology) {
    api.connect();
  }
})(typeof window !== "undefined" ? window : globalThis);
