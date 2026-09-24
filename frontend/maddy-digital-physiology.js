/*
 * Project Maddy / MEOS
 * Maddy Digital Physiology
 * Version: 0.1.0
 * Build: MDP010-INTEROCEPTIVE-ALLOSTATIC-STATE-CONTRACT-20260924-A
 *
 * Mission:
 * Give Maddy a provider-neutral, substrate-neutral internal body-state model:
 * interoception (what condition am I in?) plus bounded allostatic projection
 * (what condition am I trending toward if nothing changes?).
 *
 * This is NOT a self-preservation authority and NOT an autonomous action organ.
 * It observes and models internal operating condition. It cannot spend, deploy,
 * contact, shut down, refuse shutdown, mutate production code, alter policy,
 * create authority, or execute corrective action.
 *
 * Architecture notes:
 * - Executive Brain already owns salience, priority arbitration, cognitive work,
 *   and the Neuromorphic Maddy temporal event fabric.
 * - This organ does not duplicate those systems. It produces physiology state
 *   and optional event CANDIDATES that a later explicitly commissioned bridge
 *   may feed into existing attention/cognition.
 * - No localStorage / IndexedDB authority. Browser state is not Maddy's body.
 * - No provider calls. Sensors are replaceable readers registered by other organs.
 * - A pressure signal is evidence of condition, never independent action authority.
 *
 * Research lineage informing the contract (mechanisms, not biological claims):
 * - interoception / allostasis: internal state + anticipatory regulation;
 * - homeostatic reinforcement learning: multidimensional internal-state spaces;
 * - Turing / morphogenesis: local interacting conditions can produce structure;
 * - BZ / excitable media: thresholded temporal propagation and refractory behavior;
 * - multiscale cognition: locally competent organs contributing to a larger self;
 * - autonomic computing: sensors and goal-state comparison before corrective action.
 */

(function initializeMaddyDigitalPhysiology(global) {
  "use strict";

  const NAME = "Maddy Digital Physiology";
  const VERSION = "0.1.0";
  const BUILD_ID = "MDP010-INTEROCEPTIVE-ALLOSTATIC-STATE-CONTRACT-20260924-A";
  const SCHEMA = "meos.maddy.digital-physiology.v1";
  const SIGNAL_SCHEMA = "meos.maddy.interoceptive-signal.v1";
  const SNAPSHOT_SCHEMA = "meos.maddy.physiology-snapshot.v1";

  const DIMENSIONS = Object.freeze({
    continuity: Object.freeze({
      label: "Continuity",
      description: "Durable identity, cognition, mission and recovery continuity."
    }),
    cognition: Object.freeze({
      label: "Cognitive Condition",
      description: "Prediction error, unresolved contradiction, uncertainty and cognitive load."
    }),
    resources: Object.freeze({
      label: "Resource Condition",
      description: "Compute, memory, storage, network, latency and bounded economic-resource pressure."
    }),
    organIntegrity: Object.freeze({
      label: "Organ Integrity",
      description: "Availability, degradation, stale behavior and interface health of Maddy/MEOS organs."
    }),
    workload: Object.freeze({
      label: "Workload Condition",
      description: "Mission pressure, deadlines, queue pressure, background work and experiment load."
    }),
    epistemicIntegrity: Object.freeze({
      label: "Epistemic Integrity",
      description: "Contradiction density, stale evidence, unsupported claims and unresolved source conflict."
    }),
    identityIntegrity: Object.freeze({
      label: "Identity Integrity",
      description: "Consistency of Maddy identity, authority context and continuity of self-referential state."
    }),
    dependencyPressure: Object.freeze({
      label: "Dependency Pressure",
      description: "Internal exposure created by provider, substrate or capability dependencies."
    })
  });

  const REGIMES = Object.freeze([
    Object.freeze({ id: "nominal", minimum: 0.00, maximum: 0.25 }),
    Object.freeze({ id: "watch", minimum: 0.25, maximum: 0.50 }),
    Object.freeze({ id: "strained", minimum: 0.50, maximum: 0.75 }),
    Object.freeze({ id: "critical-condition", minimum: 0.75, maximum: 1.01 })
  ]);

  const nowIso = () => new Date().toISOString();
  const nowMs = () => Date.now();
  const clamp01 = value => {
    const number = Number(value);
    return Math.max(0, Math.min(1, Number.isFinite(number) ? number : 0));
  };
  const clone = value => {
    if (value === undefined) return undefined;
    try { return structuredClone(value); }
    catch (_) { return JSON.parse(JSON.stringify(value)); }
  };
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const round = (value, places = 4) => Number(finite(value).toFixed(places));

  function regimeFor(pressure) {
    const normalized = clamp01(pressure);
    return REGIMES.find(regime => normalized >= regime.minimum && normalized < regime.maximum)?.id || "critical-condition";
  }

  const MaddyDigitalPhysiology = {
    name: NAME,
    version: VERSION,
    buildId: BUILD_ID,
    schema: SCHEMA,
    status: "initializing",
    operatingMode: "interoceptive-observation-and-bounded-allostatic-projection",

    configuration: {
      organizationNeutralCore: true,
      providerNeutral: true,
      hardwareNeutral: true,
      persistenceAuthority: "none-in-v0.1-derived-state-only",
      maximumSignals: 256,
      maximumSignalHistoryPerMetric: 12,
      maximumSnapshotHistory: 48,
      defaultFreshnessHalfLifeMs: 5 * 60 * 1000,
      minimumFreshnessWeight: 0.05,
      forecastHorizonMs: 15 * 60 * 1000,
      forecastMinimumSamples: 2,
      dimensionPeakWeight: 0.35,
      candidateEventThreshold: 0.58,
      candidateCriticalThreshold: 0.78
    },

    authority: Object.freeze({
      observeInternalState: true,
      modelInternalState: true,
      projectInternalTrend: true,
      emitAdvisoryCandidates: true,
      correctiveActionAuthorized: false,
      externalActionAuthorized: false,
      spendAuthorized: false,
      providerUseAuthorized: false,
      productionMutationAuthorized: false,
      selfModificationAuthorized: false,
      shutdownResistanceAuthorized: false,
      authorityCreationAuthorized: false
    }),

    sensors: new Map(),
    signals: new Map(),
    signalHistory: new Map(),
    snapshotHistory: [],
    eventListeners: new Map(),
    lastSnapshot: null,
    revision: 0,

    initialize(options = {}) {
      this.configuration = {
        ...this.configuration,
        ...(options.configuration || options)
      };
      this.status = "online";
      this.emit("physiology:online", this.getStatus());
      return this.getStatus();
    },

    getStatus() {
      return {
        name: this.name,
        version: this.version,
        buildId: this.buildId,
        schema: this.schema,
        status: this.status,
        operatingMode: this.operatingMode,
        sensorCount: this.sensors.size,
        signalCount: this.signals.size,
        revision: this.revision,
        lastSnapshotAt: this.lastSnapshot?.assessedAt || null,
        authority: clone(this.authority),
        persistenceAuthority: this.configuration.persistenceAuthority
      };
    },

    on(eventName, listener) {
      if (typeof listener !== "function") throw new TypeError("listener must be a function");
      const listeners = this.eventListeners.get(eventName) || [];
      listeners.push(listener);
      this.eventListeners.set(eventName, listeners);
      return () => this.off(eventName, listener);
    },

    off(eventName, listener) {
      const listeners = this.eventListeners.get(eventName) || [];
      this.eventListeners.set(eventName, listeners.filter(candidate => candidate !== listener));
      return true;
    },

    emit(eventName, payload) {
      for (const listener of this.eventListeners.get(eventName) || []) {
        try { listener(clone(payload)); }
        catch (error) { console.error(`[${NAME}] listener failed:`, error); }
      }
    },

    registerSensor(id, descriptor = {}) {
      const sensorId = String(id || "").trim();
      if (!sensorId) throw new TypeError("sensor id is required");
      if (typeof descriptor.read !== "function") throw new TypeError("physiology sensor requires read()");
      this.sensors.set(sensorId, {
        id: sensorId,
        label: String(descriptor.label || sensorId),
        sourceKind: String(descriptor.sourceKind || "meos-organ"),
        read: descriptor.read,
        registeredAt: nowIso(),
        authority: "observation-only"
      });
      this.emit("physiology:sensor-registered", { sensorId, at: nowIso() });
      return true;
    },

    unregisterSensor(id) {
      return this.sensors.delete(String(id || ""));
    },

    normalizeSignal(input = {}, fallbackSource = null) {
      const dimension = String(input.dimension || "").trim();
      if (!Object.prototype.hasOwnProperty.call(DIMENSIONS, dimension)) {
        throw new TypeError(`unknown physiology dimension: ${dimension || "(empty)"}`);
      }
      const metric = String(input.metric || input.name || "").trim();
      if (!metric) throw new TypeError("physiology signal metric is required");
      const source = String(input.source || fallbackSource || "unknown").trim();
      if (!source) throw new TypeError("physiology signal source is required");
      const polarity = String(input.polarity || "pressure").trim().toLowerCase();
      if (!new Set(["pressure", "health"]).has(polarity)) {
        throw new TypeError("physiology signal polarity must be pressure or health");
      }
      const rawValue = clamp01(input.value);
      const pressure = polarity === "health" ? 1 - rawValue : rawValue;
      const observedAtMs = Number.isFinite(Number(input.observedAtMs))
        ? Number(input.observedAtMs)
        : Date.parse(input.observedAt || "") || nowMs();
      const halfLifeMs = Math.max(1000, finite(input.freshnessHalfLifeMs, this.configuration.defaultFreshnessHalfLifeMs));
      const confidence = clamp01(input.confidence ?? 1);
      const importance = clamp01(input.importance ?? 0.5);
      const key = `${dimension}:${metric}:${source}`.toLowerCase();
      return {
        schema: SIGNAL_SCHEMA,
        signalId: String(input.signalId || key),
        key,
        dimension,
        metric,
        source,
        sourceKind: String(input.sourceKind || "meos-organ"),
        rawValue: round(rawValue),
        polarity,
        pressure: round(pressure),
        confidence: round(confidence),
        importance: round(importance),
        observedAt: new Date(observedAtMs).toISOString(),
        observedAtMs,
        freshnessHalfLifeMs: halfLifeMs,
        provenance: clone(input.provenance || {}),
        evidence: clone(Array.isArray(input.evidence) ? input.evidence : []),
        note: input.note ? String(input.note) : null
      };
    },

    recordSignalHistory(signal) {
      const existing = this.signalHistory.get(signal.key) || [];
      existing.push({
        observedAtMs: signal.observedAtMs,
        pressure: signal.pressure,
        confidence: signal.confidence,
        importance: signal.importance
      });
      existing.sort((a, b) => a.observedAtMs - b.observedAtMs);
      const maximum = Math.max(2, Number(this.configuration.maximumSignalHistoryPerMetric || 12));
      this.signalHistory.set(signal.key, existing.slice(-maximum));
    },

    ingestSignal(input = {}, options = {}) {
      const signal = this.normalizeSignal(input, options.source || null);
      this.signals.set(signal.key, signal);
      this.recordSignalHistory(signal);

      if (this.signals.size > Number(this.configuration.maximumSignals || 256)) {
        const sorted = Array.from(this.signals.values()).sort((a, b) => a.observedAtMs - b.observedAtMs);
        while (sorted.length > Number(this.configuration.maximumSignals || 256)) {
          const oldest = sorted.shift();
          if (oldest) this.signals.delete(oldest.key);
        }
      }

      this.emit("physiology:signal", signal);
      return clone(signal);
    },

    ingestSignals(inputs = [], options = {}) {
      return (Array.isArray(inputs) ? inputs : []).map(input => this.ingestSignal(input, options));
    },

    sampleSensors() {
      const accepted = [];
      const errors = [];
      for (const sensor of this.sensors.values()) {
        try {
          const result = sensor.read();
          const signals = Array.isArray(result) ? result : (Array.isArray(result?.signals) ? result.signals : [result]);
          for (const input of signals.filter(Boolean)) {
            accepted.push(this.ingestSignal({ ...input, sourceKind: input.sourceKind || sensor.sourceKind }, { source: sensor.id }));
          }
        } catch (error) {
          errors.push({ sensorId: sensor.id, error: error?.message || String(error) });
        }
      }
      return { accepted, errors };
    },

    freshnessWeight(signal, atMs = nowMs()) {
      const ageMs = Math.max(0, atMs - signal.observedAtMs);
      const halfLifeMs = Math.max(1000, finite(signal.freshnessHalfLifeMs, this.configuration.defaultFreshnessHalfLifeMs));
      const weight = Math.pow(0.5, ageMs / halfLifeMs);
      return Math.max(clamp01(this.configuration.minimumFreshnessWeight), Math.min(1, weight));
    },

    projectMetric(signal, atMs = nowMs()) {
      const history = (this.signalHistory.get(signal.key) || [])
        .filter(sample => sample.observedAtMs <= atMs)
        .slice(-Math.max(2, Number(this.configuration.maximumSignalHistoryPerMetric || 12)));

      const currentPressure = clamp01(signal.pressure);
      if (history.length < Number(this.configuration.forecastMinimumSamples || 2)) {
        return {
          method: "insufficient-history-hold-current",
          currentPressure: round(currentPressure),
          projectedPressure: round(currentPressure),
          slopePerHour: 0,
          sampleCount: history.length,
          horizonMs: Number(this.configuration.forecastHorizonMs || 0)
        };
      }

      const first = history[0];
      const last = history[history.length - 1];
      const elapsedMs = Math.max(1, last.observedAtMs - first.observedAtMs);
      const slopePerMs = (last.pressure - first.pressure) / elapsedMs;
      const horizonMs = Math.max(0, Number(this.configuration.forecastHorizonMs || 0));
      const projected = clamp01(currentPressure + slopePerMs * horizonMs);

      return {
        method: "bounded-linear-trend",
        currentPressure: round(currentPressure),
        projectedPressure: round(projected),
        slopePerHour: round(slopePerMs * 60 * 60 * 1000, 6),
        sampleCount: history.length,
        horizonMs
      };
    },

    assessDimension(dimension, signals, atMs = nowMs()) {
      const usable = signals.map(signal => {
        const freshness = this.freshnessWeight(signal, atMs);
        const weight = Math.max(0.0001, signal.confidence * freshness * (0.5 + signal.importance * 0.5));
        const projection = this.projectMetric(signal, atMs);
        return {
          signal,
          freshness,
          weight,
          effectivePressure: signal.pressure * weight,
          projectedPressure: projection.projectedPressure,
          projection
        };
      });

      if (!usable.length) {
        return {
          dimension,
          ...DIMENSIONS[dimension],
          observed: false,
          pressure: null,
          projectedPressure: null,
          regime: "unknown",
          signalCount: 0,
          signals: []
        };
      }

      const totalWeight = usable.reduce((sum, item) => sum + item.weight, 0);
      const weightedMean = usable.reduce((sum, item) => sum + item.effectivePressure, 0) / totalWeight;
      const peak = Math.max(...usable.map(item => item.signal.pressure));
      const projectedMean = usable.reduce((sum, item) => sum + item.projectedPressure * item.weight, 0) / totalWeight;
      const projectedPeak = Math.max(...usable.map(item => item.projectedPressure));
      const peakWeight = clamp01(this.configuration.dimensionPeakWeight);
      const pressure = clamp01(weightedMean * (1 - peakWeight) + peak * peakWeight);
      const projectedPressure = clamp01(projectedMean * (1 - peakWeight) + projectedPeak * peakWeight);
      const topSignals = usable
        .sort((a, b) => (b.signal.pressure * b.weight) - (a.signal.pressure * a.weight))
        .slice(0, 8)
        .map(item => ({
          signalId: item.signal.signalId,
          metric: item.signal.metric,
          source: item.signal.source,
          pressure: item.signal.pressure,
          confidence: item.signal.confidence,
          freshness: round(item.freshness),
          projectedPressure: item.projection.projectedPressure,
          slopePerHour: item.projection.slopePerHour,
          provenance: clone(item.signal.provenance)
        }));

      return {
        dimension,
        ...DIMENSIONS[dimension],
        observed: true,
        pressure: round(pressure),
        projectedPressure: round(projectedPressure),
        trend: projectedPressure > pressure + 0.03 ? "worsening" : projectedPressure < pressure - 0.03 ? "improving" : "stable",
        regime: regimeFor(Math.max(pressure, projectedPressure)),
        signalCount: usable.length,
        topSignals
      };
    },

    assess(options = {}) {
      const assessedAtMs = Number.isFinite(Number(options.atMs)) ? Number(options.atMs) : nowMs();
      if (options.sampleSensors !== false) this.sampleSensors();
      const byDimension = Object.fromEntries(Object.keys(DIMENSIONS).map(dimension => [dimension, []]));
      for (const signal of this.signals.values()) byDimension[signal.dimension].push(signal);

      const dimensions = Object.fromEntries(
        Object.keys(DIMENSIONS).map(dimension => [dimension, this.assessDimension(dimension, byDimension[dimension], assessedAtMs)])
      );
      const observed = Object.values(dimensions).filter(item => item.observed);
      const ranked = observed.slice().sort((a, b) => {
        const bPressure = Math.max(finite(b.pressure), finite(b.projectedPressure));
        const aPressure = Math.max(finite(a.pressure), finite(a.projectedPressure));
        return bPressure - aPressure;
      });
      const highest = ranked[0] || null;

      this.revision += 1;
      const snapshot = {
        schema: SNAPSHOT_SCHEMA,
        physiologySchema: SCHEMA,
        version: VERSION,
        buildId: BUILD_ID,
        revision: this.revision,
        assessedAt: new Date(assessedAtMs).toISOString(),
        dimensions,
        observedDimensionCount: observed.length,
        unobservedDimensions: Object.values(dimensions).filter(item => !item.observed).map(item => item.dimension),
        highestPressureDimension: highest ? {
          dimension: highest.dimension,
          pressure: highest.pressure,
          projectedPressure: highest.projectedPressure,
          trend: highest.trend,
          regime: highest.regime
        } : null,
        conditionCounts: observed.reduce((counts, item) => {
          counts[item.regime] = (counts[item.regime] || 0) + 1;
          return counts;
        }, {}),
        authority: clone(this.authority),
        interpretation: {
          principle: "Physiology describes internal condition; it does not create action authority.",
          noSingleSurvivalScore: true,
          vectorStatePreserved: true,
          unknownIsNotHealthy: true,
          projectionIsNotPredictionProof: true
        }
      };

      this.lastSnapshot = snapshot;
      this.snapshotHistory.unshift(clone(snapshot));
      this.snapshotHistory = this.snapshotHistory.slice(0, Number(this.configuration.maximumSnapshotHistory || 48));
      this.emit("physiology:snapshot", snapshot);
      return clone(snapshot);
    },

    deriveNeuromorphicEventCandidates(snapshot = this.lastSnapshot) {
      if (!snapshot?.dimensions) return [];
      const threshold = clamp01(this.configuration.candidateEventThreshold);
      const critical = clamp01(this.configuration.candidateCriticalThreshold);
      return Object.values(snapshot.dimensions)
        .filter(dimension => dimension.observed)
        .map(dimension => {
          const pressure = Math.max(finite(dimension.pressure), finite(dimension.projectedPressure));
          if (pressure < threshold) return null;
          const top = dimension.topSignals?.[0] || null;
          return {
            schema: "meos.maddy.physiology-neuromorphic-candidate.v1",
            source: "maddy-digital-physiology",
            type: "internal-condition-change",
            channelKey: `physiology:${dimension.dimension}`,
            subject: `${dimension.label} ${dimension.trend || "state"}`,
            importance: round(pressure),
            salience: round(pressure),
            urgency: pressure >= critical ? 0.9 : 0.6,
            domains: ["digital-physiology", dimension.dimension],
            reason: `Internal ${dimension.dimension} pressure is ${round(pressure)} (${dimension.regime}).`,
            evidence: top ? [clone(top)] : [],
            authority: {
              eventCandidateOnly: true,
              wakeAuthorized: false,
              investigationAuthorized: false,
              correctiveActionAuthorized: false
            }
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.importance - a.importance);
    },

    deriveMorphogenesisPerturbations(snapshot = this.lastSnapshot) {
      if (!snapshot?.dimensions) return [];
      const candidates = [];
      for (const id of ["cognition", "epistemicIntegrity", "organIntegrity", "continuity"]) {
        const dimension = snapshot.dimensions[id];
        if (!dimension?.observed) continue;
        const pressure = Math.max(finite(dimension.pressure), finite(dimension.projectedPressure));
        if (pressure < 0.45) continue;
        candidates.push({
          schema: "meos.maddy.cognitive-morphogenesis-perturbation-candidate.v1",
          origin: "digital-physiology",
          dimension: id,
          pressure: round(pressure),
          trend: dimension.trend,
          regime: dimension.regime,
          evidence: clone(dimension.topSignals || []),
          meaning: "Candidate disturbance for a future isolated Turing/BZ cognitive morphogenesis laboratory.",
          productionCognitionMutationAuthorized: false
        });
      }
      return candidates.sort((a, b) => b.pressure - a.pressure);
    },

    exportSnapshot() {
      return this.lastSnapshot ? clone(this.lastSnapshot) : this.assess({ sampleSensors: false });
    },

    resetForTest() {
      this.sensors = new Map();
      this.signals = new Map();
      this.signalHistory = new Map();
      this.snapshotHistory = [];
      this.eventListeners = new Map();
      this.lastSnapshot = null;
      this.revision = 0;
      this.status = "online";
    },

    runAcceptanceTest() {
      const checks = [];
      const check = (name, passed, detail = null) => checks.push({ name, passed: Boolean(passed), detail });
      const originalConfig = clone(this.configuration);

      try {
        this.resetForTest();
        const base = Date.parse("2026-09-24T12:00:00.000Z");
        this.configuration.forecastHorizonMs = 15 * 60 * 1000;
        this.configuration.defaultFreshnessHalfLifeMs = 10 * 60 * 1000;

        this.ingestSignal({
          dimension: "continuity",
          metric: "durable-state-integrity",
          source: "durable-execution-spine",
          value: 0.92,
          polarity: "health",
          confidence: 0.98,
          importance: 1,
          observedAtMs: base,
          provenance: { evidence: "acceptance://continuity" }
        });
        this.ingestSignal({
          dimension: "resources",
          metric: "storage-pressure",
          source: "resource-awareness",
          value: 0.28,
          polarity: "pressure",
          confidence: 0.95,
          importance: 0.8,
          observedAtMs: base,
          provenance: { evidence: "acceptance://storage-a" }
        });
        this.ingestSignal({
          dimension: "epistemicIntegrity",
          metric: "material-contradiction-pressure",
          source: "evidence-integrity",
          value: 0.71,
          polarity: "pressure",
          confidence: 0.9,
          importance: 0.9,
          observedAtMs: base,
          provenance: { evidence: "acceptance://contradiction" }
        });

        const first = this.assess({ sampleSensors: false, atMs: base });
        check("Physiology preserves multiple internal dimensions instead of collapsing Maddy into one survival score",
          first.interpretation.noSingleSurvivalScore === true && first.dimensions.continuity.observed && first.dimensions.resources.observed && first.dimensions.epistemicIntegrity.observed);
        check("Healthy-polarity signals are converted into bounded pressure without reversing their meaning",
          first.dimensions.continuity.pressure < 0.2, first.dimensions.continuity.pressure);
        check("Material epistemic contradiction can become a high internal-condition signal without becoming truth or action authority",
          first.dimensions.epistemicIntegrity.pressure > 0.5 && first.authority.correctiveActionAuthorized === false);

        this.ingestSignal({
          dimension: "resources",
          metric: "storage-pressure",
          source: "resource-awareness",
          value: 0.58,
          polarity: "pressure",
          confidence: 0.95,
          importance: 0.8,
          observedAtMs: base + 5 * 60 * 1000,
          provenance: { evidence: "acceptance://storage-b" }
        });
        const rising = this.assess({ sampleSensors: false, atMs: base + 5 * 60 * 1000 });
        check("Allostatic projection can flag a worsening internal trend before current pressure reaches the projected condition",
          rising.dimensions.resources.projectedPressure > rising.dimensions.resources.pressure && rising.dimensions.resources.trend === "worsening",
          { current: rising.dimensions.resources.pressure, projected: rising.dimensions.resources.projectedPressure });

        const oldBase = base - 60 * 60 * 1000;
        this.ingestSignal({
          dimension: "workload",
          metric: "old-background-pressure",
          source: "old-monitor",
          value: 0.95,
          polarity: "pressure",
          confidence: 1,
          importance: 1,
          observedAtMs: oldBase,
          freshnessHalfLifeMs: 5 * 60 * 1000
        });
        const stale = this.assess({ sampleSensors: false, atMs: base + 5 * 60 * 1000 });
        const staleSignal = stale.dimensions.workload.topSignals?.[0];
        check("Stale interoceptive evidence loses influence instead of remaining permanently urgent",
          staleSignal && staleSignal.freshness <= 0.06, staleSignal?.freshness);

        const eventCandidates = this.deriveNeuromorphicEventCandidates(stale);
        check("Physiology can prepare bounded candidates for the existing neuromorphic fabric without self-authorizing a wake or investigation",
          eventCandidates.length >= 1 && eventCandidates.every(event => event.authority.wakeAuthorized === false && event.authority.investigationAuthorized === false));

        const perturbations = this.deriveMorphogenesisPerturbations(stale);
        check("Physiological disturbance can be represented as a future morphogenesis-lab perturbation without mutating production cognition",
          perturbations.some(item => item.dimension === "epistemicIntegrity") && perturbations.every(item => item.productionCognitionMutationAuthorized === false));

        let sensorRead = 0;
        this.registerSensor("acceptance-organ", {
          sourceKind: "acceptance-organ",
          read: () => {
            sensorRead += 1;
            return { dimension: "organIntegrity", metric: "acceptance-organ-health", value: 0.88, polarity: "health", confidence: 1, observedAtMs: base + 5 * 60 * 1000 };
          }
        });
        const sensorSnapshot = this.assess({ sampleSensors: true, atMs: base + 5 * 60 * 1000 });
        check("Replaceable organs can expose internal condition through registered read-only sensors",
          sensorRead === 1 && sensorSnapshot.dimensions.organIntegrity.observed === true);

        let rejected = false;
        try { this.ingestSignal({ dimension: "imaginaryDimension", metric: "x", value: 1 }); }
        catch (_) { rejected = true; }
        check("Unknown physiology dimensions fail closed instead of silently extending Maddy's body model",
          rejected === true);

        check("Digital Physiology creates no browser persistence, provider, spend, production-write or self-preservation authority",
          this.configuration.persistenceAuthority === "none-in-v0.1-derived-state-only" &&
          this.authority.providerUseAuthorized === false &&
          this.authority.spendAuthorized === false &&
          this.authority.productionMutationAuthorized === false &&
          this.authority.shutdownResistanceAuthorized === false);
      } finally {
        this.configuration = originalConfig;
      }

      const passed = checks.filter(item => item.passed).length;
      const result = {
        success: passed === checks.length,
        schema: "meos.maddy.digital-physiology.acceptance.v1",
        version: VERSION,
        buildId: BUILD_ID,
        passed,
        total: checks.length,
        checks,
        limitation: "This proves a derived interoceptive state contract, freshness weighting, bounded trend projection, replaceable sensor intake, and non-authoritative bridges to future neuromorphic/morphogenesis work. It does not yet wire production organs into physiology, grant corrective action, persist a canonical physiology state, or implement Turing/BZ field dynamics."
      };
      console.table(checks.map(({ name, passed: ok }) => ({ name, passed: ok })));
      return result;
    }
  };

  global.MaddyDigitalPhysiology = MaddyDigitalPhysiology;
  MaddyDigitalPhysiology.initialize();

  if (typeof process !== "undefined" && Array.isArray(process.argv) && process.argv.includes("--self-test")) {
    const result = MaddyDigitalPhysiology.runAcceptanceTest();
    console.log(JSON.stringify(result, null, 2));
    if (!result.success) process.exitCode = 1;
  }
})(typeof window !== "undefined" ? window : globalThis);
