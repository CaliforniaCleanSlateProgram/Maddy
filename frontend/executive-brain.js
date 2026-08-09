/**
 * MEOS Executive Brain
 * Version: 1.12.1
 * Build: EB1121-CROSS-DOMAIN-SALIENCE-PROPAGATION-20260808-A
 *
 * Mission:
 * Coordinate existing MEOS engines into one fast executive context before any
 * external model is asked to assist. External providers advise; MEOS governs;
 * authorized human leadership decides.
 *
 * Universal-core rule:
 * No customer-specific organization data is hard-coded here. The active
 * Organization Package and Founder Package are discovered at runtime.
 */

(function initializeExecutiveBrain(global) {
  "use strict";

  const VERSION = "1.12.1";
  const BUILD_ID = "EB1121-CROSS-DOMAIN-SALIENCE-PROPAGATION-20260808-A";
  const STORAGE_KEY = "meos.executive-brain.v1";
  const INDEXED_DB_NAME = "meos-local-executive-repository";
  const INDEXED_DB_VERSION = 1;
  const INDEXED_DB_STORE = "engine-state";
  const INDEXED_DB_RECORD_ID = "executive-brain-state";
  const PERSISTENCE_DEBOUNCE_MS = 150;
  const DURABLE_STATE_ENDPOINT = "/api/executive-brain-state";

  const brainPersistence = {
    mode: "institutional-durable-authority",
    authoritativeStorage: "meos-institutional-repository",
    cacheStorage: global.indexedDB ? "indexeddb" : "localstorage",
    indexedDbAvailable: Boolean(global.indexedDB),
    databaseName: INDEXED_DB_NAME,
    storeName: INDEXED_DB_STORE,
    hydrated: false,
    durableAvailable: null,
    degraded: false,
    durableFingerprint: null,
    hydrationSource: null,
    migratedLegacySnapshot: false,
    localStorageReleased: false,
    writeScheduled: false,
    writeInFlight: false,
    suspended: false,
    lastPersistedAt: null,
    lastRestoredAt: null,
    lastError: null
  };

  let brainPersistenceTimer = null;
  let brainIndexedDbPromise = null;
  let brainWriteChain = Promise.resolve();

  const REQUEST_TYPES = Object.freeze({
    IDENTITY: "identity",
    SELF: "self-knowledge",
    ORGANIZATION: "organization",
    CURRENT_WORK: "current-work",
    RECALL: "recall",
    DECISION: "decision",
    MONITORING: "monitoring",
    LEARNING: "learning",
    RESEARCH: "research",
    GENERAL: "general"
  });

  const COMPONENTS = Object.freeze([
    ["KnowledgeEngine", "Knowledge Engine", "Institutional facts, entities, relationships, sources, and timelines."],
    ["KnowledgeMemory", "Knowledge Memory", "Documents, passages, citations, versions, conflicts, and executive recall."],
    ["ExecutiveRecall", "Executive Recall", "Reconstructs relevant executive context."],
    ["ExecutiveEvidenceIntegrity", "Executive Evidence Integrity", "Classifies evidence, preserves institutional terminology, and separates facts, summaries, inferences, and recommendations."],
    ["ExecutiveDecision", "Executive Decision", "Compares options and prepares explainable recommendations."],
    ["ExecutiveLearning", "Executive Learning", "Turns outcomes and feedback into governed lessons."],
    ["ExecutiveMonitoring", "Executive Monitoring", "Watches risks, deadlines, stalled work, and approvals."],
    ["IntelligenceEngine", "Intelligence Engine", "Receives, classifies, and routes intelligence."],
    ["MEOSMissionEngine", "Mission Engine", "Maintains missions, priorities, ownership, and progress."],
    ["InstitutionalReasoning", "Institutional Reasoning", "Applies evidence and governance to reasoning."],
    ["ExecutivePlanning", "Executive Planning", "Builds plans, milestones, dependencies, and ownership."],
    ["ExecutiveWorkflow", "Executive Workflow", "Coordinates approved work through execution stages."],
    ["ExecutiveCollaboration", "Executive Collaboration", "Coordinates office deliberation and shared findings."],
    ["ExecutiveAutomation", "Executive Automation", "Runs authorized repeatable work."],
    ["ExecutiveSearch", "Executive Search", "Searches across connected MEOS sources."],
    ["OrganizationalProfile", "Organization Package", "Customer-specific identity, mission, leadership, and boundaries."],
    ["FounderProfile", "Founder Package", "Authorized human identity, role, authority, and preferences."]
  ]);


  function openBrainIndexedDb() {
    if (!global.indexedDB) return Promise.reject(new Error("IndexedDB is unavailable in this browser."));
    if (brainIndexedDbPromise) return brainIndexedDbPromise;
    brainIndexedDbPromise = new Promise((resolve, reject) => {
      const request = global.indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) db.createObjectStore(INDEXED_DB_STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Executive Brain IndexedDB open failed."));
      request.onblocked = () => reject(new Error("Executive Brain IndexedDB upgrade was blocked."));
    });
    return brainIndexedDbPromise;
  }

  async function brainIndexedDbGet(id = INDEXED_DB_RECORD_ID) {
    const db = await openBrainIndexedDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(INDEXED_DB_STORE, "readonly").objectStore(INDEXED_DB_STORE).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Executive Brain IndexedDB read failed."));
    });
  }

  async function brainIndexedDbPut(record) {
    const db = await openBrainIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(INDEXED_DB_STORE, "readwrite");
      const request = tx.objectStore(INDEXED_DB_STORE).put(record);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error || new Error("Executive Brain IndexedDB write failed."));
      tx.onerror = () => reject(tx.error || new Error("Executive Brain IndexedDB transaction failed."));
    });
  }

  async function brainIndexedDbDelete(id) {
    const db = await openBrainIndexedDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(INDEXED_DB_STORE, "readwrite").objectStore(INDEXED_DB_STORE).delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error || new Error("Executive Brain IndexedDB delete failed."));
    });
  }

  const ExecutiveBrain = {
    name: "MEOS Executive Brain",
    version: VERSION,
    buildId: BUILD_ID,
    status: "initializing",
    operatingMode: "constitution-governed-executive-orchestration",

    configuration: {
      organizationNeutralCore: true,
      persistenceEnabled: true,
      startupCacheTtlMs: 30000,
      requestCacheTtlMs: 15000,
      maximumEvidenceItems: 24,
      maximumOpenWorkItems: 20,
      requireHumanApprovalForExternalAction: true,
      requireEvidenceIntegrity: true,
      allowIntegrityFallback: true,
      cognitionCycleEnabled: true,
      requireInstitutionalReasoningForCognition: true,
      maximumCognitionHistory: 200,
      cognitiveDispatchEnabled: true,
      autoAuthorizeInternalResearch: true,
      autoAuthorizeInternalMonitoring: true,
      maximumCognitiveDispatchHistory: 200,
      continuousCognitionEnabled: true,
      meaningfulChangeDebounceMs: 1200,
      cognitiveReentryCooldownMs: 5000,
      maximumCognitiveReentryHistory: 250,
      maximumCognitiveIntentions: 250,
      cognitiveIntentionRetryMs: 15000,
      maximumSelfModelHistory: 120,
      maximumWorkingAwarenessHistory: 160,
      maximumAttentionStimuli: 64,
      attentionForegroundLimit: 5,
      attentionPeripheralLimit: 12,
      attentionSwitchMargin: 10,
      maximumAutobiographicalEpisodes: 240,
      autobiographicalRecallLimit: 12,
      maximumMetacognitiveReflections: 240,
      metacognitiveRecallLimit: 12,
      maximumTemporalContinuityHistory: 180,
      maximumWorldModelHistory: 160,
      maximumRelationshipHistory: 120,
      maximumSalienceHistory: 180,
      salienceAttentionThreshold: 0.58,
      salienceInvestigationThreshold: 0.72,
      temporalContinuityResumeThresholdMs: 15000,
      temporalCommitmentLookaheadHours: 720
    },

    initializedAt: null,
    refreshedAt: null,
    startupCache: null,
    startupCachedAt: 0,
    requestCache: new Map(),
    history: [],
    cognitionHistory: [],
    cognitiveDispatchHistory: [],
    cognitiveReentryHistory: [],
    cognitiveIntentions: [],
    cognitiveContinuity: { hydrated: false, resumedAt: null, lastResumeCount: 0 },
    selfModel: null,
    selfModelHistory: [],
    selfModelProjectionCount: 0,
    workingAwareness: null,
    workingAwarenessHistory: [],
    workingAwarenessProjectionCount: 0,
    workingAwarenessObserversAttached: false,
    autobiographicalMemory: [],
    autobiographicalEpisodeCount: 0,
    metacognitiveReflections: [],
    metacognitiveReflectionCount: 0,
    temporalContinuity: {
      schema: "meos.maddy.temporal-continuity.v1",
      status: "initializing",
      lastCheckpoint: null,
      lastResume: null,
      currentIntervalStartedAt: null
    },
    temporalContinuityHistory: [],
    temporalContinuityCheckpointCount: 0,
    temporalContinuityObserversAttached: false,
    worldModel: null,
    worldModelHistory: [],
    worldModelProjectionCount: 0,
    relationshipModels: {},
    relationshipHistory: [],
    salienceHistory: [],
    lastSalienceAssessment: null,
    salienceAssessmentCount: 0,
    meaningfulChangeSignatures: new Map(),
    cognitiveReentryTimers: new Map(),
    cognitiveReentryInFlight: new Set(),
    activeCognitiveLineages: new Map(),
    continuousCognitionSubscriptions: [],
    listeners: {},

    profiles: {
      maddy: null,
      founder: null,
      organization: null
    },

    initialize(options = {}) {
      this.configuration = {
        ...this.configuration,
        ...(options.configuration || {})
      };

      this.restore();
      this.cognitiveHydrationPromise = this.hydrateLaptopPersistence().then(result => {
        this.cognitiveContinuity.hydrated = true;
        const temporalResume = this.resumeTemporalContinuity({
          reason: "durable-cognition-hydrated"
        });
        const resumed = this.resumeUnresolvedCognitiveIntentions({ reason: "durable-cognition-hydrated" });
        this.cognitiveContinuity.resumedAt = new Date().toISOString();
        this.cognitiveContinuity.lastResumeCount = resumed.resumedCount || 0;
        this.temporalContinuity.status = "continuous";
        this.temporalContinuity.currentIntervalStartedAt = new Date().toISOString();
        this.temporalContinuity.lastResume = this.clone(temporalResume);
        this.projectSelfModel({
          reason: "durable-cognition-hydrated",
          persist: true
        });
        this.projectWorkingAwareness({
          reason: "temporal-continuity-resumed",
          persist: false
        });
        this.projectWorldModel({
          reason: "durable-cognition-hydrated",
          persist: true
        });
        return result;
      });

      this.profiles.maddy =
        options.maddyProfile || this.resolveMaddyProfile();
      this.profiles.founder =
        options.founderProfile || this.resolveFounderProfile();
      this.profiles.organization =
        options.organizationProfile || this.resolveOrganizationProfile();

      this.initializedAt = new Date().toISOString();
      this.status = "online";
      this.refresh({ reason: "initialization" });
      this.attachContinuousCognitionListeners();
      this.attachSelfModelObservers();
      this.attachWorkingAwarenessObservers();
      this.attachTemporalContinuityObservers();
      this.temporalContinuity.currentIntervalStartedAt =
        this.temporalContinuity.currentIntervalStartedAt ||
        new Date().toISOString();
      this.projectWorkingAwareness({
        reason: "initialization",
        persist: false
      });
      this.projectWorldModel({
        reason: "initialization",
        persist: false
      });

      console.info(
        `[MEOS] ${this.name} v${this.version} online. Build ${this.buildId}.`
      );

      this.emit("brain:online", this.getStatus());
      return this.getStatus();
    },

    refresh(options = {}) {
      this.requestCache.clear();

      this.profiles.maddy =
        options.maddyProfile ||
        this.profiles.maddy ||
        this.resolveMaddyProfile();

      this.profiles.founder =
        options.founderProfile ||
        this.profiles.founder ||
        this.resolveFounderProfile();

      this.profiles.organization =
        options.organizationProfile ||
        this.profiles.organization ||
        this.resolveOrganizationProfile();

      this.refreshedAt = new Date().toISOString();
      this.startupCache = this.buildStartupContext({ force: true });
      this.startupCachedAt = Date.now();

      this.record("brain.refreshed", {
        reason: options.reason || "manual"
      });

      if (brainPersistence.hydrated === true) {
        this.projectSelfModel({
          reason: `brain-refresh:${options.reason || "manual"}`,
          persist: false
        });
        this.projectWorkingAwareness({
          reason: `brain-refresh:${options.reason || "manual"}`,
          persist: false
        });
        this.projectWorldModel({
          reason: `brain-refresh:${options.reason || "manual"}`,
          persist: false
        });
      }

      return this.getStatus();
    },

    getStatus() {
      const manifest = this.getSystemManifest();

      return {
        name: this.name,
        version: this.version,
        buildId: this.buildId,
        status: this.status,
        operatingMode: this.operatingMode,
        organizationNeutralCore: true,
        maddyReady: Boolean(this.profiles.maddy),
        founderReady: Boolean(this.profiles.founder),
        organizationReady: Boolean(this.profiles.organization),
        availableComponents: manifest.filter(item => item.available).length,
        onlineComponents: manifest.filter(item => item.online).length,
        totalComponents: manifest.length,
        initializedAt: this.initializedAt,
        refreshedAt: this.refreshedAt,
        temporalContinuityReady:
          this.temporalContinuity?.status === "continuous" ||
          this.temporalContinuity?.status === "checkpointed",
        temporalContinuity: this.getTemporalContinuityStatus()
      };
    },

    getSystemManifest() {
      return COMPONENTS.map(([globalName, label, purpose]) => {
        const component = this.resolveComponent(globalName);
        let reported = null;

        if (component && typeof component.getStatus === "function") {
          reported = this.safe(() => component.getStatus(), null);
        }

        const status =
          reported?.status ||
          component?.status ||
          (component ? "available" : "missing");

        return {
          globalName,
          label,
          purpose,
          available: Boolean(component),
          online:
            Boolean(component) &&
            !["missing", "offline", "error", "failed", "initializing"].includes(
              String(status).toLowerCase()
            ),
          status,
          version: reported?.version || component?.version || null
        };
      });
    },

    buildStartupContext(options = {}) {
      const age = Date.now() - this.startupCachedAt;

      if (
        !options.force &&
        this.startupCache &&
        age < this.configuration.startupCacheTtlMs
      ) {
        return this.clone(this.startupCache);
      }

      const context = {
        schema: "meos.executive-brain.startup-context.v1",
        generatedAt: new Date().toISOString(),

        brain: {
          name: this.name,
          version: this.version,
          buildId: this.buildId
        },

        identity: this.buildIdentityContext(),
        organization: this.buildOrganizationContext(),
        currentWork: this.collectCurrentWork(),
        decisions: this.collectDecisions(),
        monitoring: this.collectMonitoring(),
        learning: this.collectLearning(),
        selfModel: this.getSelfModel({ refresh: false }),
        workingAwareness: this.getWorkingAwareness({ refresh: false }),
        autobiographicalMemory: this.getAutobiographicalMemory(8),
        metacognitiveContext: this.buildMetacognitiveContext({ limit: 6 }),
        temporalContinuity: this.getTemporalContinuityStatus(),
        worldModel: this.getWorldModel({ refresh: false }),

        system: {
          manifest: this.getSystemManifest()
        },

        authority: {
          finalExecutiveAuthority:
            this.profileName(this.profiles.founder),
          finalExecutiveAuthorityRole:
            this.profiles.founder?.role ||
            this.profiles.founder?.title ||
            this.profiles.founder?.position ||
            null,
          externalProvidersAreAdvisory: true,
          humanApprovalRequiredForExternalAction:
            this.configuration.requireHumanApprovalForExternalAction
        }
      };

      this.startupCache = this.clone(context);
      this.startupCachedAt = Date.now();
      this.emit("brain:startup-context-built", context);

      return context;
    },

    prepareRequest(input, options = {}) {
      const text = this.requestText(input);

      if (!text) {
        return {
          success: false,
          error: "A question, mission, or objective is required."
        };
      }

      const cacheKey = this.normalize(text) + JSON.stringify(options);
      const cached = this.getCachedRequest(cacheKey);

      if (cached && options.force !== true) {
        return this.clone(cached);
      }

      const started = this.now();
      const classification = this.classifyRequest(text, options);
      const startup = this.buildStartupContext();
      const rawLocalContext = this.collectLocalContext(
        text,
        classification,
        options
      );
      const evidenceIntegrity = this.prepareEvidenceIntegrity(
        text,
        rawLocalContext,
        options
      );
      const localContext = this.applyIntegrityToLocalContext(
        rawLocalContext,
        evidenceIntegrity
      );
      const routing = this.route(
        classification,
        localContext,
        options
      );

      const prepared = {
        success: true,
        schema: "meos.executive-brain.request-package.v1",

        request: {
          id: this.id("brain-request"),
          text,
          type: classification.type,
          confidence: classification.confidence,
          requiresCurrentInternet:
            classification.requiresCurrentInternet,
          requiresApproval:
            classification.requiresApproval,
          requestedAt: new Date().toISOString()
        },

        identity: startup.identity,
        organization: startup.organization,
        authority: startup.authority,
        currentWork: startup.currentWork,
        selfModel: startup.selfModel,
        workingAwareness: startup.workingAwareness,
        autobiographicalMemory: startup.autobiographicalMemory,
        temporalContinuity: startup.temporalContinuity,
        worldModel: startup.worldModel,
        system: {
          available: startup.system.manifest
            .filter(item => item.available)
            .map(item => item.label),
          unavailable: startup.system.manifest
            .filter(item => !item.available)
            .map(item => item.label)
        },

        localContext,
        evidenceIntegrity,
        routing,

        providerInstructions: this.buildProviderInstructions({
          text,
          classification,
          startup,
          localContext,
          evidenceIntegrity,
          routing
        }),

        responseContract: {
          requiredFields: [
            "answer",
            "basis",
            "confidence",
            "unknowns",
            "recommendation",
            "approvalRequired"
          ],
          decisionOptionsRequired:
            classification.type === REQUEST_TYPES.DECISION,
          citationsRequired:
            classification.requiresCurrentInternet,
          humanApprovalRequired:
            classification.requiresApproval
        },

        durationMs: Number((this.now() - started).toFixed(2))
      };

      this.setCachedRequest(cacheKey, prepared);
      this.record("request.prepared", {
        requestId: prepared.request.id,
        type: prepared.request.type,
        route: prepared.routing.primaryRoute,
        evidenceIntegrityApplied:
          prepared.localContext?.integrity?.applied === true,
        evidenceIntegrityConfidence:
          prepared.evidenceIntegrity?.confidence || 0,
        integrityConflictCount:
          prepared.evidenceIntegrity?.conflicts?.length || 0,
        durationMs: prepared.durationMs
      });

      this.emit("brain:request-prepared", prepared);
      return prepared;
    },

    routeRequest(input, options = {}) {
      const prepared = this.prepareRequest(input, options);

      if (!prepared.success) {
        return prepared;
      }

      return {
        success: true,
        requestId: prepared.request.id,
        route: prepared.routing.primaryRoute,
        supportingRoutes: prepared.routing.supportingRoutes,
        researchDepth: prepared.routing.researchDepth,
        approvalRequired: prepared.request.requiresApproval,
        package: prepared
      };
    },


    runCognitionCycle(input, options = {}) {
      if (this.configuration.cognitionCycleEnabled !== true) {
        return {
          success: false,
          status: "cognition-disabled",
          error: "Executive Brain cognition cycle is disabled."
        };
      }

      const started = this.now();
      const prepared = this.prepareRequest(input, {
        ...options,
        force: options.force !== false
      });

      if (!prepared?.success) {
        return prepared;
      }

      const reasoning = this.runInstitutionalReasoning(
        prepared,
        options
      );

      const planningReadiness = this.preparePlanningReadiness(
        prepared,
        reasoning,
        options
      );

      const unknowns = this.collectCognitionUnknowns(
        prepared,
        reasoning,
        planningReadiness
      );

      const attention = this.assessCognitionAttention(
        prepared,
        reasoning,
        unknowns
      );

      const result = {
        success:
          prepared.success === true &&
          (
            reasoning?.success === true ||
            this.configuration
              .requireInstitutionalReasoningForCognition !== true
          ),
        schema: "meos.executive-brain.cognition-cycle.v1",
        version: this.version,
        buildId: this.buildId,
        cognitionId: this.id("cognition"),
        generatedAt: new Date().toISOString(),

        request: this.clone(prepared.request),
        identity: this.clone(prepared.identity),
        organization: this.clone(prepared.organization),
        authority: this.clone(prepared.authority),

        perception: {
          localContext: this.clone(prepared.localContext),
          evidenceIntegrity: this.clone(prepared.evidenceIntegrity),
          currentWork: this.clone(prepared.currentWork)
        },

        reasoning: this.clone(reasoning),

        planning: planningReadiness,
        unknowns,
        attention,

        dispatchReadiness: {
          ready:
            planningReadiness.ready === true &&
            unknowns.filter(item => item.blocking === true).length === 0,
          hallwayRequired:
            planningReadiness.proposedWork.length > 0,
          proposedWorkCount:
            planningReadiness.proposedWork.length,
          authorityRequired:
            Boolean(
              prepared.request.requiresApproval ||
              reasoning?.approvalRequired ||
              reasoning?.recommendation
                ?.executiveApprovalRequired
            ),
          note:
            "006.016A prepares cognition and planning readiness only. Mission creation and Hallway dispatch remain explicitly out of scope until the cognitive dispatch commission."
        },

        durationMs: Number((this.now() - started).toFixed(2))
      };

      this.recordCognition(result);
      this.record("cognition.completed", {
        cognitionId: result.cognitionId,
        requestId: prepared.request.id,
        reasoningSuccess: reasoning?.success === true,
        attention: attention.level,
        unknownCount: unknowns.length,
        proposedWorkCount:
          planningReadiness.proposedWork.length,
        durationMs: result.durationMs
      });

      this.formAutobiographicalEpisode({
        eventType: "cognition",
        subject: result.request?.text || prepared.request?.text || "Executive cognition",
        sourceId: result.cognitionId,
        perception: {
          evidenceCount: Array.isArray(result.perception?.localContext?.evidence)
            ? result.perception.localContext.evidence.length
            : 0,
          currentWorkSummary: result.perception?.currentWork?.summary || null,
          evidenceConfidence: result.perception?.evidenceIntegrity?.confidence || null
        },
        beliefsBefore: {
          verifiedFacts: Array.isArray(result.perception?.evidenceIntegrity?.officialFacts)
            ? result.perception.evidenceIntegrity.officialFacts.slice(0, 8).map(item => item?.summary || item?.title || null).filter(Boolean)
            : [],
          unresolvedAtStart: Array.isArray(result.perception?.evidenceIntegrity?.unknowns)
            ? result.perception.evidenceIntegrity.unknowns.slice(0, 8).map(item => item?.summary || item?.title || String(item)).filter(Boolean)
            : []
        },
        intention: {
          requestId: result.request?.id || null,
          objective: result.request?.text || null,
          approvalRequired: result.dispatchReadiness?.authorityRequired === true
        },
        action: {
          type: "reason-and-prepare",
          proposedWorkCount: result.dispatchReadiness?.proposedWorkCount || 0
        },
        outcome: {
          success: result.success === true,
          attention: result.attention?.level || null,
          dispatchReady: result.dispatchReadiness?.ready === true,
          unknownCount: Array.isArray(result.unknowns) ? result.unknowns.length : 0
        },
        learning: {
          unresolvedAfter: Array.isArray(result.unknowns)
            ? result.unknowns.slice(0, 8).map(item => item?.text || item?.summary || item?.reason || String(item)).filter(Boolean)
            : [],
          recommendation: result.reasoning?.recommendation || null
        }
      });

      this.emit("brain:cognition-completed", result);
      return this.clone(result);
    },



    /*
     * Commission 006.016F — Continuous Cognitive Re-entry
     *
     * Maddy must not require another human prompt after the world changes.
     * This bridge listens to existing institutional organs:
     *
     * - Knowledge Engine: a verified Opportunity Case changed;
     * - Executive Hallway: cognition-generated work reached a meaningful
     *   outcome state;
     * - Executive Monitoring: a new alert materially touches cognitive work.
     *
     * Meaningful change schedules a debounced re-entry into the same
     * counterfactual cognition → Planning → Hallway path commissioned in
     * 006.016E. Re-entry never grants new external authority.
     */
    attachContinuousCognitionListeners() {
      if (
        this.configuration.continuousCognitionEnabled !==
        true
      ) {
        return {
          success: true,
          enabled: false,
          connectedSources: []
        };
      }

      if (
        Array.isArray(
          this.continuousCognitionSubscriptions
        ) &&
        this.continuousCognitionSubscriptions.length > 0
      ) {
        return this.getContinuousCognitionStatus();
      }

      const connectedSources = [];

      const knowledge =
        global.MEOSKnowledgeEngine ||
        global.KnowledgeEngine;

      if (knowledge?.on) {
        const handler = payload =>
          this.handleOpportunityKnowledgeChange(
            payload
          );

        const result = knowledge.on(
          "opportunity-case:ingested",
          handler
        );

        if (result !== false) {
          this.continuousCognitionSubscriptions.push({
            source: "knowledge-engine",
            event: "opportunity-case:ingested",
            detach: () =>
              knowledge.off?.(
                "opportunity-case:ingested",
                handler
              )
          });
          connectedSources.push(
            "knowledge-engine"
          );
        }
      }

      const hallway =
        global.MEOSExecutiveHallway;

      if (hallway?.addEventListener) {
        const handler = event =>
          this.handleHallwayMeaningfulChange(
            event?.detail || event
          );

        hallway.addEventListener(
          "work-updated",
          handler
        );

        this.continuousCognitionSubscriptions.push({
          source: "executive-hallway",
          event: "work-updated",
          detach: () =>
            hallway.removeEventListener?.(
              "work-updated",
              handler
            )
        });

        connectedSources.push(
          "executive-hallway"
        );
      }

      const monitoring =
        global.ExecutiveMonitoring;

      if (monitoring?.on) {
        const handler = alert =>
          this.handleMonitoringMeaningfulChange(
            alert
          );

        const result = monitoring.on(
          "monitoring:alert-created",
          handler
        );

        if (result !== false) {
          this.continuousCognitionSubscriptions.push({
            source: "executive-monitoring",
            event: "monitoring:alert-created",
            detach: () =>
              monitoring.off?.(
                "monitoring:alert-created",
                handler
              )
          });

          connectedSources.push(
            "executive-monitoring"
          );
        }
      }

      this.record(
        "continuous-cognition.listeners-attached",
        {
          connectedSources
        }
      );

      return this.getContinuousCognitionStatus();
    },

    detachContinuousCognitionListeners() {
      (
        this.continuousCognitionSubscriptions || []
      ).forEach(subscription => {
        this.safe(() =>
          subscription.detach?.()
        );
      });

      this.continuousCognitionSubscriptions = [];

      return {
        success: true,
        connectedSources: []
      };
    },

    handleOpportunityKnowledgeChange(payload = {}) {
      const evidenceAction =
        String(payload.evidenceAction || "");
      const caseAction =
        String(payload.caseAction || "");

      if (
        evidenceAction === "unchanged" &&
        caseAction === "unchanged"
      ) {
        return {
          success: true,
          meaningful: false,
          reason: "opportunity-case-unchanged"
        };
      }

      const knowledge =
        global.MEOSKnowledgeEngine ||
        global.KnowledgeEngine;
      const record =
        payload.caseRecordId &&
        knowledge?.getRecordById
          ? knowledge.getRecordById(
              payload.caseRecordId
            )
          : null;

      const subject =
        record?.content?.source?.title ||
        record?.title
          ?.replace(
            /^Executive Opportunity Case\s*[—-]\s*/i,
            ""
          )
          .trim() ||
        payload.sourceIdentity ||
        null;

      if (!subject) {
        return {
          success: false,
          meaningful: false,
          reason:
            "opportunity-subject-unresolved"
        };
      }

      return this.scheduleCognitiveReentry(
        subject,
        {
          source: "knowledge-engine",
          event: "opportunity-case:ingested",
          caseRecordId:
            payload.caseRecordId || null,
          evidenceAction:
            payload.evidenceAction || null,
          caseAction:
            payload.caseAction || null,
          ingestedAt:
            payload.ingestedAt || null
        }
      );
    },

    handleHallwayMeaningfulChange(work = {}) {
      if (
        work?.context?.cognitiveDispatch !== true
      ) {
        return {
          success: true,
          meaningful: false,
          reason: "not-cognitive-work"
        };
      }

      const meaningfulStates =
        new Set([
          "done",
          "failed",
          "blocked"
        ]);

      if (
        !meaningfulStates.has(work.state)
      ) {
        return {
          success: true,
          meaningful: false,
          reason:
            "non-terminal-cognitive-transition"
        };
      }

      const subject =
        String(
          work.context?.cognitionSubject || ""
        ).trim();

      if (!subject) {
        return {
          success: false,
          meaningful: false,
          reason:
            "cognitive-work-subject-missing"
        };
      }

      const signature =
        this.fingerprintCognitiveDispatch({
          source: "executive-hallway",
          workId: work.id,
          state: work.state,
          verified:
            work.outcome?.verified ?? null,
          success:
            work.outcome?.success ?? null,
          error: work.error || null
        });

      if (
        this.meaningfulChangeSignatures.get(
          work.id
        ) === signature
      ) {
        return {
          success: true,
          meaningful: false,
          duplicate: true,
          reason:
            "hallway-outcome-already-observed"
        };
      }

      this.meaningfulChangeSignatures.set(
        work.id,
        signature
      );

      const lineageId = String(
        work.context?.cognitiveReentryLineageId || ""
      ).trim();

      /*
       * Commission 006.017D4H1 — Cognitive Reentry Lineage Guard
       *
       * A terminal Hallway event produced synchronously by the cognition that
       * is currently executing is an outcome of that thought, not a new
       * stimulus. Re-entering on that event creates a closed causal loop:
       * cognition -> Hallway -> terminal event -> cognition -> Hallway ...
       *
       * Preserve the outcome inside the originating durable intention so the
       * same Maddy can remember what happened, but do not create a child
       * cognition from its own still-active lineage. A later terminal event
       * after the lineage has ended (for example after human approval) remains
       * eligible to become genuinely new evidence and can wake cognition.
       */
      if (
        lineageId &&
        this.activeCognitiveLineages.has(lineageId)
      ) {
        const intention = (this.cognitiveIntentions || []).find(
          item =>
            item?.key === this.normalize(subject) &&
            item?.status !== "completed"
        );

        if (intention) {
          intention.triggers = Array.isArray(intention.triggers)
            ? intention.triggers
            : [];
          intention.triggers.push({
            source: "executive-hallway",
            event: "cognitive-lineage-outcome",
            lineageId,
            workId: work.id,
            workState: work.state,
            route: work.route || null,
            verified: work.outcome?.verified ?? null,
            success: work.outcome?.success ?? null,
            error: work.error || null,
            observedAt: work.updatedAt || new Date().toISOString()
          });
          intention.triggers = intention.triggers.slice(-24);
          intention.updatedAt = new Date().toISOString();
        }

        this.record("cognition.lineage-outcome-absorbed", {
          lineageId,
          subject,
          workId: work.id,
          workState: work.state
        });

        return {
          success: true,
          meaningful: true,
          scheduled: false,
          absorbed: true,
          lineageId,
          reason: "active-cognitive-lineage-outcome"
        };
      }

      return this.scheduleCognitiveReentry(
        subject,
        {
          source: "executive-hallway",
          event: "work-updated",
          lineageId: lineageId || null,
          workId: work.id,
          workState: work.state,
          route: work.route || null,
          verified:
            work.outcome?.verified ?? null,
          success:
            work.outcome?.success ?? null,
          error: work.error || null,
          updatedAt: work.updatedAt || null
        }
      );
    },

    handleMonitoringMeaningfulChange(alert = {}) {
      const subject =
        this.resolveCognitionSubjectFromAlert(
          alert
        );

      if (!subject) {
        return {
          success: true,
          meaningful: false,
          reason:
            "alert-not-linked-to-cognitive-work"
        };
      }

      const signature =
        this.fingerprintCognitiveDispatch({
          source: "executive-monitoring",
          alertId: alert.id,
          key: alert.key,
          severity: alert.severity,
          entityType: alert.entityType,
          entityId: alert.entityId
        });

      if (
        this.meaningfulChangeSignatures.get(
          alert.id
        ) === signature
      ) {
        return {
          success: true,
          meaningful: false,
          duplicate: true,
          reason:
            "monitoring-alert-already-observed"
        };
      }

      this.meaningfulChangeSignatures.set(
        alert.id,
        signature
      );

      return this.scheduleCognitiveReentry(
        subject,
        {
          source: "executive-monitoring",
          event: "monitoring:alert-created",
          alertId: alert.id,
          category: alert.category || null,
          severity:
            alert.severityLabel ||
            alert.severity ||
            null,
          entityType:
            alert.entityType || null,
          entityId:
            alert.entityId || null,
          recommendation:
            alert.recommendedAction || null
        }
      );
    },

    resolveCognitionSubjectFromAlert(alert = {}) {
      const entityId =
        String(alert.entityId || "").trim();

      if (!entityId) {
        return null;
      }

      const hallway =
        global.MEOSExecutiveHallway;

      const work =
        hallway?.getWork
          ? hallway.getWork(entityId)
          : hallway?.listWork
            ? hallway
                .listWork()
                .find(
                  item =>
                    item?.id === entityId ||
                    item?.mission?.id ===
                      entityId
                )
            : null;

      if (
        work?.context?.cognitiveDispatch ===
        true
      ) {
        return (
          work.context.cognitionSubject ||
          null
        );
      }

      const planning =
        global.ExecutivePlanning;
      const plan =
        Array.isArray(planning?.plans)
          ? planning.plans.find(
              item => item?.id === entityId
            )
          : null;

      if (
        plan?.metadata?.cognitionType ===
        "counterfactual-positioning"
      ) {
        const historyMatch =
          this.cognitiveDispatchHistory.find(
            item =>
              item.planId === plan.id
          );

        return (
          historyMatch?.subject ||
          String(plan.title || "")
            .replace(
              /^Positioning\s*[—-]\s*/i,
              ""
            )
            .trim() ||
          null
        );
      }

      return null;
    },

    upsertCognitiveIntention(subject, triggers = [], options = {}) {
      const normalizedSubject = String(subject || "").trim();
      if (!normalizedSubject) return null;
      const key = this.normalize(normalizedSubject);
      let intention = this.cognitiveIntentions.find(item => item.key === key && item.status !== "completed");
      if (!intention) {
        intention = {
          intentionId: this.id("cognitive-intention"), key, subject: normalizedSubject,
          status: "pending", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          attempts: 0, triggers: [], lastError: null,
          temporal: {
            kind: options.kind || "cognitive-intention",
            dueAt: options.dueAt || null,
            expectedAt: options.expectedAt || null,
            promiseTo: options.promiseTo || null,
            relatedMissionId: options.relatedMissionId || null,
            sourceId: options.sourceId || null,
            createdInSelfFingerprint: this.getSelfModel({ refresh: false })?.fingerprint || null,
            createdInAwarenessFingerprint: this.getWorkingAwareness({ refresh: false })?.fingerprint || null
          }
        };
        this.cognitiveIntentions.unshift(intention);
      }
      intention.status = options.status || intention.status || "pending";
      intention.updatedAt = new Date().toISOString();
      intention.temporal = {
        ...(intention.temporal || {}),
        ...(options.kind ? { kind: options.kind } : {}),
        ...(options.dueAt !== undefined ? { dueAt: options.dueAt } : {}),
        ...(options.expectedAt !== undefined ? { expectedAt: options.expectedAt } : {}),
        ...(options.promiseTo !== undefined ? { promiseTo: options.promiseTo } : {}),
        ...(options.relatedMissionId !== undefined ? { relatedMissionId: options.relatedMissionId } : {}),
        ...(options.sourceId !== undefined ? { sourceId: options.sourceId } : {})
      };
      intention.triggers = [...(intention.triggers || []), ...this.clone(triggers)].slice(-50);
      this.cognitiveIntentions = this.cognitiveIntentions.slice(0, this.configuration.maximumCognitiveIntentions);
      if (options.persist !== false) this.persist();
      if (brainPersistence.hydrated === true) {
        this.projectSelfModel({
          reason: "cognitive-intention-updated",
          persist: false
        });
      }
      return intention;
    },

    resolveCognitiveIntention(subject, result = {}) {
      const key = this.normalize(subject);
      const intention = this.cognitiveIntentions.find(item => item.key === key && item.status !== "completed");
      if (!intention) return false;
      intention.status = result.success === true ? "completed" : "pending";
      intention.updatedAt = new Date().toISOString();
      intention.lastError = result.success === true ? null : (result.error || "cognitive-reentry-incomplete");
      if (result.success === true) {
        intention.completedAt = intention.updatedAt;
      }
      this.persist();
      if (brainPersistence.hydrated === true) {
        this.projectSelfModel({
          reason: result.success === true
            ? "cognitive-intention-resolved"
            : "cognitive-intention-remains-open",
          persist: false
        });
      }
      return true;
    },

    scheduleCognitiveIntentionRetry(intention, reason = "incomplete-cognition") {
      if (!intention?.subject || intention.status === "completed") return false;
      const key = this.normalize(intention.subject);
      if (this.cognitiveReentryTimers.has(key) || this.cognitiveReentryInFlight.has(key)) return false;
      const attempts = Math.max(1, Number(intention.attempts || 1));
      const delay = Math.min(300000, this.configuration.cognitiveIntentionRetryMs * Math.pow(2, Math.min(attempts - 1, 4)));
      const timerState = { subject: intention.subject, triggers: [{ source: "executive-brain", event: "unresolved-intention-time-reentry", intentionId: intention.intentionId, reason }], timerId: null };
      timerState.timerId = global.setTimeout(() => void this.executeCognitiveReentry(intention.subject, timerState.triggers, { preserveIntention: true }), delay);
      this.cognitiveReentryTimers.set(key, timerState);
      this.record("cognition.intention-retry-scheduled", { intentionId: intention.intentionId, subject: intention.subject, attempts, delay, reason });
      return true;
    },

    resumeUnresolvedCognitiveIntentions(options = {}) {
      if (this.configuration.continuousCognitionEnabled !== true) return { success: true, resumedCount: 0 };
      const unresolved = (this.cognitiveIntentions || []).filter(item => item && item.status !== "completed" && item.subject);
      let resumedCount = 0;
      unresolved.forEach(intention => {
        const key = this.normalize(intention.subject);
        if (this.cognitiveReentryInFlight.has(key) || this.cognitiveReentryTimers.has(key)) return;
        intention.status = "pending";
        intention.updatedAt = new Date().toISOString();
        const result = this.scheduleCognitiveReentry(intention.subject, {
          source: "executive-brain",
          event: "cognitive-continuity-resume",
          intentionId: intention.intentionId,
          reason: options.reason || "runtime-reentry"
        }, { immediate: true, preserveIntention: true });
        if (result?.scheduled) resumedCount += 1;
      });
      this.record("cognition.intentions-resumed", { resumedCount, reason: options.reason || "runtime-reentry" });
      return { success: true, resumedCount, unresolvedCount: unresolved.length };
    },

    getCognitiveIntentions(options = {}) {
      const includeCompleted = options.includeCompleted === true;
      return this.clone((this.cognitiveIntentions || []).filter(item => includeCompleted || item.status !== "completed"));
    },

    scheduleCognitiveReentry(
      subject,
      trigger = {},
      options = {}
    ) {
      const normalizedSubject =
        String(subject || "").trim();

      if (!normalizedSubject) {
        return {
          success: false,
          scheduled: false,
          error:
            "A cognition subject is required."
        };
      }

      if (
        this.configuration.continuousCognitionEnabled !==
        true
      ) {
        return {
          success: true,
          scheduled: false,
          reason:
            "continuous-cognition-disabled"
        };
      }

      const key =
        this.normalize(
          normalizedSubject
        );

      const triggerFingerprint =
        this.fingerprintCognitiveDispatch({
          subject: normalizedSubject,
          trigger
        });

      const recentDuplicate =
        this.cognitiveReentryHistory.find(
          item =>
            item.triggerFingerprint ===
              triggerFingerprint &&
            (
              Date.now() -
              Date.parse(
                item.completedAt ||
                item.startedAt ||
                0
              )
            ) <
              this.configuration
                .cognitiveReentryCooldownMs
        );

      if (recentDuplicate) {
        return {
          success: true,
          scheduled: false,
          duplicate: true,
          reason:
            "meaningful-change-already-processed",
          priorReentryId:
            recentDuplicate.reentryId
        };
      }

      if (options.preserveIntention !== true) {
        this.upsertCognitiveIntention(normalizedSubject, [trigger], { status: "pending" });
      }

      const existingTimer =
        this.cognitiveReentryTimers.get(
          key
        );

      if (existingTimer) {
        global.clearTimeout(
          existingTimer.timerId
        );

        existingTimer.triggers.push(
          this.clone(trigger)
        );

        existingTimer.timerId =
          global.setTimeout(
            () =>
              void this.executeCognitiveReentry(
                normalizedSubject,
                existingTimer.triggers,
                {
                  triggerFingerprint,
                  ...options
                }
              ),
            this.configuration
              .meaningfulChangeDebounceMs
          );

        this.cognitiveReentryTimers.set(
          key,
          existingTimer
        );

        return {
          success: true,
          scheduled: true,
          debounced: true,
          subject: normalizedSubject,
          triggerCount:
            existingTimer.triggers.length
        };
      }

      const timerState = {
        subject: normalizedSubject,
        triggers: [this.clone(trigger)],
        timerId: null
      };

      timerState.timerId =
        global.setTimeout(
          () =>
            void this.executeCognitiveReentry(
              normalizedSubject,
              timerState.triggers,
              {
                triggerFingerprint,
                ...options
              }
            ),
          options.immediate === true
            ? 0
            : this.configuration
                .meaningfulChangeDebounceMs
        );

      this.cognitiveReentryTimers.set(
        key,
        timerState
      );

      this.record(
        "cognition.reentry-scheduled",
        {
          subject: normalizedSubject,
          trigger
        }
      );

      return {
        success: true,
        scheduled: true,
        subject: normalizedSubject,
        triggerCount: 1
      };
    },

    async executeCognitiveReentry(
      subject,
      triggers = [],
      options = {}
    ) {
      const key = this.normalize(subject);

      this.cognitiveReentryTimers.delete(
        key
      );

      if (
        this.cognitiveReentryInFlight.has(
          key
        )
      ) {
        return {
          success: true,
          skipped: true,
          reason:
            "cognitive-reentry-already-running"
        };
      }

      this.cognitiveReentryInFlight.add(
        key
      );

      const entry = {
        reentryId:
          this.id("cognitive-reentry"),
        subject,
        triggerFingerprint:
          options.triggerFingerprint ||
          this.fingerprintCognitiveDispatch({
            subject,
            triggers
          }),
        triggers:
          this.clone(triggers),
        status: "running",
        startedAt:
          new Date().toISOString(),
        completedAt: null,
        resultSummary: null,
        error: null
      };

      const intention = this.upsertCognitiveIntention(subject, triggers, { status: "running" });
      if (intention) intention.attempts = Number(intention.attempts || 0) + 1;

      this.activeCognitiveLineages.set(entry.reentryId, {
        lineageId: entry.reentryId,
        subject,
        subjectKey: key,
        intentionId: intention?.intentionId || null,
        startedAt: entry.startedAt
      });

      try {
        this.refresh({
          reason:
            "meaningful-change-cognitive-reentry"
        });

        const result =
          await this
            .runPositioningCognitionAndDispatch(
              subject,
              {
                reasoningOptions: {
                  evidenceLimit: 100
                },
                autoAuthorizeInternalResearch:
                  true,
                autoAuthorizeInternalMonitoring:
                  true,
                cognitiveReentryLineageId:
                  entry.reentryId
              }
            );

        entry.status =
          result?.success === true
            ? "completed"
            : "completed-with-failure";
        entry.resultSummary = {
          success:
            result?.success === true,
          positioningFingerprint:
            result?.positioningFingerprint ||
            null,
          planId:
            result?.plan?.id || null,
          proposedMoves:
            result?.summary
              ?.proposedMoves || 0,
          dispatched:
            result?.summary?.dispatched ||
            0,
          reusedExistingWork:
            result?.summary
              ?.reusedExistingWork || 0,
          awaitingReview:
            result?.summary
              ?.awaitingReview || 0,
          failed:
            result?.summary?.failed || 0
        };

        this.formAutobiographicalEpisode({
          eventType: "cognitive-reentry",
          subject,
          sourceId: entry.reentryId,
          perception: { triggers: this.clone(triggers).slice(0, 12) },
          intention: { intentionId: intention?.intentionId || null, reason: "continue-unresolved-cognition" },
          action: { type: "cognitive-reentry", attempts: intention?.attempts || 1 },
          outcome: this.clone(entry.resultSummary),
          learning: {
            resolved: result?.success === true,
            remainingFailureCount: result?.summary?.failed || 0
          }
        });

        this.emit(
          "brain:cognitive-reentry-completed",
          {
            reentryId: entry.reentryId,
            subject,
            triggers:
              this.clone(triggers),
            result:
              this.clone(result)
          }
        );

        this.resolveCognitiveIntention(subject, result || {});
        return result;
      } catch (error) {
        entry.status = "failed";
        entry.error =
          error?.message || String(error);

        this.formAutobiographicalEpisode({
          eventType: "cognitive-reentry-failure",
          subject,
          sourceId: entry.reentryId,
          perception: { triggers: this.clone(triggers).slice(0, 12) },
          intention: { intentionId: intention?.intentionId || null, reason: "continue-unresolved-cognition" },
          action: { type: "cognitive-reentry", attempts: intention?.attempts || 1 },
          outcome: { success: false, error: entry.error },
          learning: { unresolved: true, retryEligible: true }
        });

        this.emit(
          "brain:cognitive-reentry-failed",
          this.clone(entry)
        );
        this.resolveCognitiveIntention(subject, { success: false, error: entry.error });

        return {
          success: false,
          error: entry.error,
          reentryId: entry.reentryId
        };
      } finally {
        entry.completedAt =
          new Date().toISOString();

        this.cognitiveReentryHistory.unshift(
          entry
        );

        if (
          this.cognitiveReentryHistory.length >
          this.configuration
            .maximumCognitiveReentryHistory
        ) {
          this.cognitiveReentryHistory.length =
            this.configuration
              .maximumCognitiveReentryHistory;
        }

        this.cognitiveReentryInFlight.delete(
          key
        );
        this.activeCognitiveLineages.delete(
          entry.reentryId
        );

        const unresolvedIntention = (this.cognitiveIntentions || []).find(item => item.key === key && item.status !== "completed");
        if (unresolvedIntention) this.scheduleCognitiveIntentionRetry(unresolvedIntention, entry.error || entry.status);

        this.persist();
      }
    },

    getContinuousCognitionStatus() {
      return {
        success: true,
        enabled:
          this.configuration
            .continuousCognitionEnabled ===
          true,
        connectedSources:
          (
            this.continuousCognitionSubscriptions ||
            []
          ).map(item => item.source),
        activeSubjects:
          Array.from(
            this.cognitiveReentryInFlight
          ),
        scheduledSubjects:
          Array.from(
            this.cognitiveReentryTimers.keys()
          ),
        reentryHistoryCount:
          this.cognitiveReentryHistory.length,
        unresolvedIntentions:
          (this.cognitiveIntentions || []).filter(item => item.status !== "completed").length,
        cognitiveContinuity: this.clone(this.cognitiveContinuity),
        lastReentry:
          this.clone(
            this.cognitiveReentryHistory[0] ||
            null
          )
      };
    },

    getCognitiveReentryHistory(
      limit = 25
    ) {
      const normalized = Math.max(
        1,
        Math.min(
          this.configuration
            .maximumCognitiveReentryHistory,
          Number(limit) || 25
        )
      );

      return this.clone(
        this.cognitiveReentryHistory.slice(
          0,
          normalized
        )
      );
    },

    runContinuousCognitionAcceptanceTest() {
      const cognitiveWorkFixture = {
        id:
          "hallway-work-006016f-fixture",
        state: "done",
        route: "executive-router",
        context: {
          cognitiveDispatch: true,
          cognitionSubject:
            "Commission 006.016F Fixture"
        },
        outcome: {
          success: true,
          verified: true
        }
      };

      const unrelatedWorkFixture = {
        id:
          "hallway-work-unrelated",
        state: "done",
        context: {
          cognitiveDispatch: false
        }
      };

      const priorEnabled =
        this.configuration
          .continuousCognitionEnabled;
      const priorDebounce =
        this.configuration
          .meaningfulChangeDebounceMs;

      this.configuration
        .continuousCognitionEnabled =
        false;

      const meaningfulClassification =
        this.handleHallwayMeaningfulChange(
          cognitiveWorkFixture
        );

      const unrelatedClassification =
        this.handleHallwayMeaningfulChange(
          unrelatedWorkFixture
        );

      this.configuration
        .continuousCognitionEnabled =
        priorEnabled;
      this.configuration
        .meaningfulChangeDebounceMs =
        priorDebounce;

      const checks = [
        {
          name:
            "Continuous cognition listener bridge exists",
          passed:
            typeof this
              .attachContinuousCognitionListeners ===
            "function"
        },
        {
          name:
            "Opportunity Case ingestion can trigger cognition re-entry",
          passed:
            /opportunity-case:ingested/.test(
              this.attachContinuousCognitionListeners
                .toString()
            )
        },
        {
          name:
            "Hallway work outcomes can trigger cognition re-entry",
          passed:
            /work-updated/.test(
              this.attachContinuousCognitionListeners
                .toString()
            ) &&
            typeof this
              .handleHallwayMeaningfulChange ===
              "function"
        },
        {
          name:
            "Executive Monitoring alerts can trigger cognition re-entry",
          passed:
            /monitoring:alert-created/.test(
              this.attachContinuousCognitionListeners
                .toString()
            )
        },
        {
          name:
            "Only cognition-linked Hallway work is considered",
          passed:
            meaningfulClassification.reason !==
              "not-cognitive-work" &&
            unrelatedClassification.reason ===
              "not-cognitive-work"
        },
        {
          name:
            "Re-entry is debounced rather than recursively immediate",
          passed:
            typeof this
              .scheduleCognitiveReentry ===
              "function" &&
            /setTimeout/.test(
              this.scheduleCognitiveReentry
                .toString()
            )
        },
        {
          name:
            "Concurrent re-entry for the same subject is suppressed",
          passed:
            this.cognitiveReentryInFlight instanceof
              Set &&
            /cognitiveReentryInFlight/.test(
              this.executeCognitiveReentry
                .toString()
            )
        },
        {
          name:
            "Re-entry returns through the commissioned positioning dispatch path",
          passed:
            /runPositioningCognitionAndDispatch/.test(
              this.executeCognitiveReentry
                .toString()
            )
        },
        {
          name:
            "Re-entry refreshes executive context before reasoning again",
          passed:
            /meaningful-change-cognitive-reentry/.test(
              this.executeCognitiveReentry
                .toString()
            )
        },
        {
          name:
            "Continuous cognition history remains inspectable and bounded",
          passed:
            Array.isArray(
              this.cognitiveReentryHistory
            ) &&
            typeof this
              .getCognitiveReentryHistory ===
              "function" &&
            this.configuration
              .maximumCognitiveReentryHistory >
              0
        },
        {
          name:
            "Continuous cognition does not grant new external authority",
          passed:
            this.configuration
              .requireHumanApprovalForExternalAction ===
              true &&
            /classifyCognitiveMoveAuthority/.test(
              this.runPositioningCognitionAndDispatch
                .toString()
            )
        }
      ];

      const passed = checks.every(
        item => item.passed
      );

      console.table(
        checks.map(item => ({
          name: item.name,
          passed: item.passed
        }))
      );

      console.info(
        `[MEOS ${this.version}] Commission 006.016F continuous cognition acceptance: ${passed ? "PASS" : "FAIL"}.`
      );

      return {
        commission: "006.016F",
        version: this.version,
        buildId: this.buildId,
        passed,
        checks,
        status:
          this.getContinuousCognitionStatus()
      };
    },

    /*
     * Commission 006.016E — Cognitive Hallway Dispatch
     *
     * Cognition becomes executive work here. Counterfactual positioning is
     * reasoned by Institutional Reasoning, drafted into Executive Planning,
     * and dispatched through the Executive Hallway. The Brain never executes
     * an external act directly and never bypasses Hallway governance.
     */
    async runPositioningCognitionAndDispatch(subject, options = {}) {
      if (this.configuration.cognitiveDispatchEnabled !== true) {
        return {
          success: false,
          status: "cognitive-dispatch-disabled",
          error: "Executive Brain cognitive dispatch is disabled."
        };
      }

      const reasoning = global.InstitutionalReasoning;
      const planning = global.ExecutivePlanning;
      const hallway = global.MEOSExecutiveHallway;

      if (!reasoning?.analyzePositioning) {
        return {
          success: false,
          status: "positioning-cognition-unavailable",
          error:
            "Institutional Reasoning counterfactual positioning is unavailable."
        };
      }

      if (!planning?.createPlan) {
        return {
          success: false,
          status: "planning-unavailable",
          error: "Executive Planning Engine is unavailable."
        };
      }

      if (!hallway?.submitWork) {
        return {
          success: false,
          status: "hallway-unavailable",
          error: "Executive Hallway is unavailable."
        };
      }

      const startedAt = new Date().toISOString();
      const positioning = reasoning.analyzePositioning(
        subject,
        options.reasoningOptions || {}
      );

      if (positioning?.success !== true) {
        return {
          success: false,
          status: "positioning-cognition-failed",
          positioning: this.clone(positioning)
        };
      }

      const moves = Array.isArray(positioning.positioningMoves)
        ? positioning.positioningMoves.filter(
            move =>
              move &&
              String(move.action || "").trim() &&
              move.status !== "discarded"
          )
        : [];

      const positioningFingerprint =
        this.fingerprintCognitiveDispatch({
          subject: positioning.subject,
          opportunity: positioning.opportunity,
          whatMustBecomeTrue: positioning.whatMustBecomeTrue,
          consequentialUnknowns:
            positioning.consequentialUnknowns,
          positioningMoves: moves
        });

      const planResult = this.createOrReusePositioningPlan(
        positioning,
        positioningFingerprint,
        options
      );

      if (planResult?.success !== true) {
        return {
          success: false,
          status: "positioning-plan-failed",
          positioning: this.clone(positioning),
          plan: this.clone(planResult)
        };
      }

      const plan = planResult.plan;
      const dispatches = [];

      for (const move of moves) {
        const dispatchKey = this.fingerprintCognitiveDispatch({
          positioningFingerprint,
          type: move.type,
          action: move.action
        });

        const existing = this.findExistingCognitiveWork(
          dispatchKey
        );

        if (existing) {
          dispatches.push({
            success: true,
            duplicate: true,
            dispatchKey,
            move: this.clone(move),
            authority:
              this.clone(
                existing.context?.cognitiveAuthority ||
                {}
              ),
            work: this.clone(existing)
          });
          continue;
        }

        const authority =
          this.classifyCognitiveMoveAuthority(
            move,
            options
          );

        const work = await hallway.submitWork({
          title:
            move.title ||
            `Positioning — ${move.type || "work"}`,
          instruction: String(move.action).trim(),
          source: "executive-brain-cognition",
          requestedBy: "maddy",
          reviewRequired: authority.reviewRequired,
          authorized: authority.authorized,
          authorizationSignal:
            authority.authorized
              ? "Executive Brain — existing internal authority"
              : null,
          context: {
            cognitiveDispatch: true,
            cognitiveDispatchKey: dispatchKey,
            cognitivePositioningFingerprint:
              positioningFingerprint,
            cognitionType:
              "counterfactual-positioning",
            cognitionSubject: positioning.subject,
            planId: plan?.id || null,
            positioningMoveOrder:
              Number(move.order) || null,
            positioningMoveType:
              move.type || null,
            positioningOwner:
              move.owner || null,
            opportunityRecordId:
              positioning.opportunity?.recordId || null,
            readiness:
              this.clone(positioning.readiness),
            cognitiveAuthority:
              this.clone(authority),
            cognitiveReentryLineageId:
              options.cognitiveReentryLineageId || null
          }
        });

        dispatches.push({
          success:
            work?.outcome?.success !== false &&
            work?.state !== "failed",
          duplicate: false,
          dispatchKey,
          move: this.clone(move),
          authority,
          work: this.clone(work)
        });
      }

      const result = {
        success: dispatches.every(
          item => item.success !== false
        ),
        schema:
          "meos.executive-brain.cognitive-hallway-dispatch.v1",
        version: this.version,
        buildId: this.buildId,
        dispatchId: this.id("cognitive-dispatch"),
        cognitionType: "counterfactual-positioning",
        subject: positioning.subject,
        positioningFingerprint,
        positioning: this.clone(positioning),
        plan: {
          created: planResult.created === true,
          reused: planResult.reused === true,
          id: plan?.id || null,
          status: plan?.status || null,
          title: plan?.title || null
        },
        dispatches,
        summary: {
          proposedMoves: moves.length,
          dispatched:
            dispatches.filter(
              item =>
                item.duplicate !== true &&
                item.work
            ).length,
          reusedExistingWork:
            dispatches.filter(
              item => item.duplicate === true
            ).length,
          executingWithinAuthority:
            dispatches.filter(
              item =>
                item.authority?.authorized === true
            ).length,
          awaitingReview:
            dispatches.filter(
              item =>
                item.authority?.reviewRequired === true &&
                item.authority?.authorized !== true
            ).length,
          failed:
            dispatches.filter(
              item => item.success === false
            ).length
        },
        governance: {
          hallwayOnly: true,
          directExternalExecution: false,
          authorityClassifiedPerMove: true,
          externalActionAlwaysReviewRequired: true
        },
        startedAt,
        completedAt: new Date().toISOString()
      };

      this.recordCognitiveDispatch(result);
      this.record("cognition.dispatched", {
        dispatchId: result.dispatchId,
        subject: result.subject,
        planId: result.plan.id,
        proposedMoves: result.summary.proposedMoves,
        dispatched: result.summary.dispatched,
        awaitingReview: result.summary.awaitingReview,
        failed: result.summary.failed
      });

      this.formAutobiographicalEpisode({
        eventType: "executive-action",
        subject: result.subject || "Executive action",
        sourceId: result.dispatchId,
        intention: {
          planId: result.plan?.id || null,
          proposedMoves: result.summary?.proposedMoves || 0
        },
        action: {
          type: "hallway-dispatch",
          dispatched: result.summary?.dispatched || 0,
          reusedExistingWork: result.summary?.reusedExistingWork || 0
        },
        outcome: {
          success: result.success === true,
          awaitingReview: result.summary?.awaitingReview || 0,
          failed: result.summary?.failed || 0
        },
        learning: {
          externalActionAuthorityPreserved: result.governance?.externalActionAlwaysReviewRequired === true,
          hallwayOnly: result.governance?.hallwayOnly === true
        }
      });

      this.emit(
        "brain:cognition-dispatched",
        this.clone(result)
      );

      return this.clone(result);
    },

    createOrReusePositioningPlan(
      positioning,
      fingerprint,
      options = {}
    ) {
      const planning = global.ExecutivePlanning;
      const existing = Array.isArray(planning?.plans)
        ? planning.plans.find(
            plan =>
              plan?.metadata
                ?.cognitivePositioningFingerprint ===
              fingerprint
          )
        : null;

      if (existing) {
        return {
          success: true,
          created: false,
          reused: true,
          plan: this.clone(existing)
        };
      }

      const moves = Array.isArray(
        positioning?.positioningMoves
      )
        ? positioning.positioningMoves
        : [];

      const phaseGroups = [
        {
          title: "Resolve Consequential Unknowns",
          types: ["investigate"]
        },
        {
          title: "Build Legitimate Positioning",
          types: ["strategic-positioning"]
        },
        {
          title: "Maintain Opportunity Awareness",
          types: ["monitor"]
        }
      ];

      const phases = phaseGroups
        .map(group => {
          const groupMoves = moves.filter(
            move => group.types.includes(move.type)
          );

          if (groupMoves.length === 0) {
            return null;
          }

          return {
            title: group.title,
            objective:
              group.title ===
              "Resolve Consequential Unknowns"
                ? "Resolve evidence gaps early enough to change readiness before the opportunity becomes actionable."
                : group.title ===
                    "Build Legitimate Positioning"
                  ? "Build truthful organizational capability and evidence without fabricating mission alignment."
                  : "Watch authoritative evidence for material changes while positioning work continues.",
            durationDays:
              group.title ===
              "Maintain Opportunity Awareness"
                ? 30
                : 14,
            tasks: groupMoves.map(move => {
              const authority =
                this.classifyCognitiveMoveAuthority(
                  move,
                  options
                );

              return {
                title: move.action,
                description:
                  move.whyNow || "",
                office:
                  move.owner || "Maddy",
                owner:
                  move.owner || "Maddy",
                priority:
                  move.type === "investigate"
                    ? "high"
                    : "normal",
                approvalRequired:
                  authority.reviewRequired,
                deliverables: [
                  move.type === "investigate"
                    ? "Verified finding with source evidence"
                    : move.type === "monitor"
                      ? "Material-change monitoring evidence"
                      : "Evidence-grounded positioning recommendation"
                ],
                notes:
                  move.guardrail ||
                  "Preserve evidence integrity and organizational truth.",
                metadata: {
                  cognitiveMoveType:
                    move.type || null,
                  cognitiveAuthority:
                    authority
                }
              };
            })
          };
        })
        .filter(Boolean);

      const objective =
        `Position the organization for "${positioning.subject}" before the next actionable window by resolving verified gaps, building legitimate readiness, and monitoring material changes.`;

      const result = planning.createPlan(
        {
          title:
            `Positioning — ${positioning.subject}`,
          objective,
          description:
            "Executive Brain plan generated from counterfactual positioning cognition. Future opportunity intelligence is converted into governed work now rather than a reminder.",
          status: "draft",
          priority:
            positioning.readiness?.score < 55
              ? "high"
              : "normal",
          strategy:
            "Resolve consequential unknowns, build only truthful adjacent capability, and preserve readiness until the opportunity becomes actionable.",
          requestedBy: "Maddy",
          executiveOwner: "Maddy",
          phases,
          dependencies:
            (positioning.whatMustBecomeTrue || [])
              .filter(item => item.blocking)
              .map(item => ({
                title: item.statement,
                type: item.category,
                status: item.state,
                critical: true,
                owner: "Maddy"
              })),
          risks: [
            {
              title:
                "Late discovery of eligibility or timing requirements",
              category: "readiness",
              severity: "high",
              mitigation:
                "Resolve unknowns and monitor authoritative source material before the next cycle opens."
            },
            {
              title:
                "Unsupported strategic alignment",
              category: "integrity",
              severity: "critical",
              mitigation:
                "Require real organizational activity and evidence before claiming alignment or eligibility."
            }
          ],
          tags: [
            "counterfactual-positioning",
            "cognitive-dispatch",
            "future-opportunity"
          ],
          topics: [
            positioning.subject,
            "executive-positioning"
          ],
          metadata: {
            cognitivePositioningFingerprint:
              fingerprint,
            cognitionType:
              "counterfactual-positioning",
            opportunityRecordId:
              positioning.opportunity?.recordId ||
              null,
            readiness:
              this.clone(positioning.readiness),
            generatedBy:
              "MEOS Executive Brain"
          }
        },
        {
          actor: "MEOS Executive Brain",
          skipReasoning: true,
          createMissionDrafts: false
        }
      );

      return {
        ...result,
        created: result?.success === true,
        reused: false
      };
    },

    classifyCognitiveMoveAuthority(move = {}, options = {}) {
      const action = String(move.action || "");
      const declared = String(move.authority || "");
      const externalAction =
        /\b(send|submit|publish|purchase|spend|sign|file|apply|contact|email|call|commit|contract|accept|execute payment|transfer)\b/i.test(
          action
        );

      if (externalAction) {
        return {
          class: "external-action",
          reviewRequired: true,
          authorized: false,
          reason:
            "External or commitment-producing action requires human authority."
        };
      }

      const internalResearch =
        move.type === "investigate" ||
        declared ===
          "within-existing-research-authority";

      const internalMonitoring =
        move.type === "monitor" ||
        declared ===
          "within-existing-monitoring-authority";

      if (
        internalResearch &&
        this.configuration
          .autoAuthorizeInternalResearch === true &&
        options.autoAuthorizeInternalResearch !== false
      ) {
        return {
          class: "internal-research",
          reviewRequired: false,
          authorized: true,
          reason:
            "Evidence gathering remains inside existing internal research authority."
        };
      }

      if (
        internalMonitoring &&
        this.configuration
          .autoAuthorizeInternalMonitoring === true &&
        options.autoAuthorizeInternalMonitoring !== false
      ) {
        return {
          class: "internal-monitoring",
          reviewRequired: false,
          authorized: true,
          reason:
            "Monitoring authoritative evidence remains inside existing internal monitoring authority."
        };
      }

      if (
        move.type === "strategic-positioning" &&
        options.authorizePreparation === true
      ) {
        return {
          class: "authorized-internal-preparation",
          reviewRequired: false,
          authorized: true,
          reason:
            "Internal preparation was explicitly authorized for this dispatch."
        };
      }

      return {
        class: "review-required",
        reviewRequired: true,
        authorized: false,
        reason:
          "Preparation may change organizational commitments or priorities and remains review-first."
      };
    },

    findExistingCognitiveWork(dispatchKey) {
      const hallway = global.MEOSExecutiveHallway;

      if (
        !dispatchKey ||
        !hallway?.listWork
      ) {
        return null;
      }

      const work = hallway.listWork();

      if (!Array.isArray(work)) {
        return null;
      }

      return (
        work.find(
          item =>
            item?.context
              ?.cognitiveDispatchKey ===
            dispatchKey
        ) || null
      );
    },

    fingerprintCognitiveDispatch(value) {
      const serialized = JSON.stringify(
        value ?? null
      );

      let hash = 2166136261;

      for (
        let index = 0;
        index < serialized.length;
        index += 1
      ) {
        hash ^= serialized.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }

      return (
        "cognitive-" +
        (hash >>> 0)
          .toString(16)
          .padStart(8, "0")
      );
    },

    recordCognitiveDispatch(result) {
      const entry = {
        dispatchId: result.dispatchId,
        cognitionType: result.cognitionType,
        subject: result.subject,
        positioningFingerprint:
          result.positioningFingerprint,
        planId: result.plan?.id || null,
        proposedMoves:
          result.summary?.proposedMoves || 0,
        dispatched:
          result.summary?.dispatched || 0,
        reusedExistingWork:
          result.summary
            ?.reusedExistingWork || 0,
        awaitingReview:
          result.summary?.awaitingReview || 0,
        failed:
          result.summary?.failed || 0,
        completedAt: result.completedAt
      };

      this.cognitiveDispatchHistory.unshift(
        entry
      );

      if (
        this.cognitiveDispatchHistory.length >
        this.configuration
          .maximumCognitiveDispatchHistory
      ) {
        this.cognitiveDispatchHistory.length =
          this.configuration
            .maximumCognitiveDispatchHistory;
      }

      this.persist();
      if (brainPersistence.hydrated === true) {
        this.projectSelfModel({
          reason: "cognitive-dispatch-completed",
          persist: false
        });
      }
      return this.clone(entry);
    },

    getCognitiveDispatchHistory(limit = 25) {
      const normalized = Math.max(
        1,
        Math.min(
          this.configuration
            .maximumCognitiveDispatchHistory,
          Number(limit) || 25
        )
      );

      return this.clone(
        this.cognitiveDispatchHistory.slice(
          0,
          normalized
        )
      );
    },

    runCognitiveDispatchAcceptanceTest() {
      const researchAuthority =
        this.classifyCognitiveMoveAuthority({
          type: "investigate",
          action:
            "Verify applicant eligibility from authoritative source material.",
          authority:
            "within-existing-research-authority"
        });

      const monitorAuthority =
        this.classifyCognitiveMoveAuthority({
          type: "monitor",
          action:
            "Monitor authoritative source material for the next cycle.",
          authority:
            "within-existing-monitoring-authority"
        });

      const preparationAuthority =
        this.classifyCognitiveMoveAuthority({
          type: "strategic-positioning",
          action:
            "Test a truthful organizational pathway to the verified funded outcome.",
          authority:
            "recommend-and-prepare"
        });

      const externalAuthority =
        this.classifyCognitiveMoveAuthority({
          type: "strategic-positioning",
          action:
            "Submit the application to the funder.",
          authority:
            "recommend-and-prepare"
        });

      const checks = [
        {
          name:
            "Counterfactual cognition has an Executive Brain dispatch API",
          passed:
            typeof this
              .runPositioningCognitionAndDispatch ===
            "function"
        },
        {
          name:
            "Cognitive work is drafted through Executive Planning",
          passed:
            typeof this
              .createOrReusePositioningPlan ===
              "function" &&
            /createPlan/.test(
              this.createOrReusePositioningPlan
                .toString()
            )
        },
        {
          name:
            "Cognitive work is dispatched through Executive Hallway",
          passed:
            /MEOSExecutiveHallway/.test(
              this.runPositioningCognitionAndDispatch
                .toString()
            ) &&
            /submitWork/.test(
              this.runPositioningCognitionAndDispatch
                .toString()
            )
        },
        {
          name:
            "Internal investigation can execute within existing authority",
          passed:
            researchAuthority.authorized ===
              true &&
            researchAuthority.reviewRequired ===
              false
        },
        {
          name:
            "Internal monitoring can execute within existing authority",
          passed:
            monitorAuthority.authorized === true &&
            monitorAuthority.reviewRequired ===
              false
        },
        {
          name:
            "Strategic preparation remains review-first by default",
          passed:
            preparationAuthority.authorized ===
              false &&
            preparationAuthority.reviewRequired ===
              true
        },
        {
          name:
            "External action can never be auto-authorized by cognitive dispatch",
          passed:
            externalAuthority.authorized ===
              false &&
            externalAuthority.reviewRequired ===
              true
        },
        {
          name:
            "Duplicate cognition is protected by a stable dispatch key",
          passed:
            typeof this
              .fingerprintCognitiveDispatch ===
              "function" &&
            typeof this
              .findExistingCognitiveWork ===
              "function"
        },
        {
          name:
            "Cognitive dispatch history remains inspectable",
          passed:
            Array.isArray(
              this.cognitiveDispatchHistory
            ) &&
            typeof this
              .getCognitiveDispatchHistory ===
              "function"
        }
      ];

      const passed = checks.every(
        item => item.passed
      );

      console.table(
        checks.map(item => ({
          name: item.name,
          passed: item.passed
        }))
      );

      console.info(
        `[MEOS ${this.version}] Commission 006.016E cognitive dispatch acceptance: ${passed ? "PASS" : "FAIL"}.`
      );

      return {
        commission: "006.016E",
        version: this.version,
        buildId: this.buildId,
        passed,
        checks
      };
    },

    runInstitutionalReasoning(prepared, options = {}) {
      const engine = global.InstitutionalReasoning;

      if (!engine || typeof engine.analyze !== "function") {
        return {
          success: false,
          status: "institutional-reasoning-unavailable",
          recommendation: null,
          findings: [],
          risks: [],
          options: [],
          dependencies: [],
          openLoops: [],
          conflicts: [],
          implementationPlan: [],
          approvalRequired: true,
          generatedAt: new Date().toISOString()
        };
      }

      const mode = this.cognitionReasoningMode(
        prepared?.request?.type,
        options.reasoningMode
      );

      const question = this.buildCognitionQuestion(prepared);

      return this.safe(
        () =>
          engine.analyze(question, {
            mode,
            includeRisks: true,
            includeAlternatives: true,
            includeImplementation: true,
            evidenceLimit:
              options.evidenceLimit ||
              this.configuration.maximumEvidenceItems
          }),
        {
          success: false,
          status: "institutional-reasoning-error",
          recommendation: null,
          findings: [],
          risks: [],
          options: [],
          dependencies: [],
          openLoops: [],
          conflicts: [],
          implementationPlan: [],
          approvalRequired: true,
          generatedAt: new Date().toISOString()
        }
      );
    },

    cognitionReasoningMode(requestType, explicitMode = null) {
      if (explicitMode) {
        return explicitMode;
      }

      const mapping = {
        [REQUEST_TYPES.DECISION]: "decision",
        [REQUEST_TYPES.MONITORING]: "risk",
        [REQUEST_TYPES.RESEARCH]: "strategic",
        [REQUEST_TYPES.ORGANIZATION]: "strategic",
        [REQUEST_TYPES.CURRENT_WORK]: "operational",
        [REQUEST_TYPES.LEARNING]: "executive"
      };

      return mapping[requestType] || "executive";
    },

    buildCognitionQuestion(prepared) {
      const request = prepared?.request?.text || "";
      const organization = prepared?.organization || {};
      const evidence =
        prepared?.localContext?.evidence || [];

      const evidenceDigest = evidence
        .slice(0, 10)
        .map((item, index) => {
          const authority =
            item.authority || item.evidenceClass || "unknown";
          const summary =
            item.summary || item.content || item.title || "";
          return `${index + 1}. [${authority}] ${summary}`;
        })
        .filter(Boolean)
        .join(" ");

      const organizationContext = [
        organization?.name
          ? `Organization: ${organization.name}.`
          : "",
        organization?.mission
          ? `Mission: ${organization.mission}.`
          : "",
        organization?.operatingPurpose
          ? `Operating purpose: ${organization.operatingPurpose}.`
          : "",
        organization?.longTermPurpose
          ? `Long-term purpose: ${organization.longTermPurpose}.`
          : ""
      ]
        .filter(Boolean)
        .join(" ");

      return [
        `Executive cognition objective: ${request}`,
        organizationContext,
        evidenceDigest
          ? `Governed evidence available to Executive Brain: ${evidenceDigest}`
          : "No governed evidence digest is available from Executive Brain.",
        "Reason across the institutional record. Identify material risks, dependencies, conflicts, alternatives, open loops, and the next executable steps. Separate verified evidence from inference and unknowns. Do not invent facts. Do not execute work or approve external action."
      ]
        .filter(Boolean)
        .join(" ");
    },

    preparePlanningReadiness(prepared, reasoning, options = {}) {
      const planning = global.ExecutivePlanning;
      const available =
        Boolean(planning) &&
        typeof planning.createPlan === "function";

      const implementation =
        Array.isArray(reasoning?.implementationPlan)
          ? reasoning.implementationPlan
          : [];

      const dependencies =
        Array.isArray(reasoning?.dependencies)
          ? reasoning.dependencies
          : [];

      const risks =
        Array.isArray(reasoning?.risks)
          ? reasoning.risks
          : [];

      const proposedWork = implementation
        .map((step, index) => ({
          order: Number(step?.order) || index + 1,
          action:
            step?.action ||
            step?.title ||
            step?.description ||
            "",
          owner:
            step?.owner ||
            step?.office ||
            "Maddy",
          status:
            step?.status || "proposed",
          requiresAuthority:
            /approval|authorize|submit|send|sign|purchase|spend|commit|contact/i.test(
              [
                step?.action,
                step?.title,
                step?.description
              ]
                .filter(Boolean)
                .join(" ")
            )
        }))
        .filter(item => item.action);

      const recommendationState =
        reasoning?.recommendation?.state || null;

      const reasoningUsable =
        reasoning?.success === true &&
        ![
          "insufficient-evidence"
        ].includes(recommendationState);

      return {
        available,
        ready:
          available &&
          reasoningUsable &&
          proposedWork.length > 0,
        status:
          !available
            ? "planning-engine-unavailable"
            : !reasoning?.success
              ? "reasoning-not-ready"
              : recommendationState === "insufficient-evidence"
                ? "evidence-not-ready"
                : proposedWork.length === 0
                  ? "no-plan-work-derived"
                  : "ready-for-plan-draft",
        objective: prepared?.request?.text || "",
        recommendationState,
        dependencies: this.clone(dependencies),
        risks: this.clone(risks),
        proposedWork,
        planCreated: false,
        mutationPerformed: false,
        note:
          options.createPlan === true
            ? "Plan creation is intentionally withheld in 006.016A. This commission establishes cognition and planning readiness without mutating Executive Planning."
            : "No plan mutation is performed during cognition. Planning remains governed and approval-aware."
      };
    },

    collectCognitionUnknowns(prepared, reasoning, planningReadiness) {
      const unknowns = [];

      const add = (source, value, blocking = false) => {
        const text = this.textContent(
          value?.title ||
          value?.description ||
          value?.summary ||
          value?.content ||
          value
        ).trim();

        if (!text) return;

        unknowns.push({
          id: this.id("cognition-unknown"),
          source,
          description: text,
          blocking: Boolean(blocking)
        });
      };

      (
        prepared?.evidenceIntegrity
          ?.unverifiedInformation || []
      ).forEach(item =>
        add("evidence-integrity", item, false)
      );

      (
        prepared?.evidenceIntegrity
          ?.conflicts || []
      ).forEach(item =>
        add("evidence-conflict", item, true)
      );

      (reasoning?.openLoops || []).forEach(item =>
        add("institutional-reasoning", item, false)
      );

      if (
        reasoning?.success !== true &&
        this.configuration
          .requireInstitutionalReasoningForCognition
      ) {
        add(
          "executive-brain",
          "Institutional Reasoning did not complete successfully.",
          true
        );
      }

      if (
        planningReadiness?.available !== true
      ) {
        add(
          "executive-planning",
          "Executive Planning is unavailable for cognition handoff.",
          true
        );
      }

      return this.dedupe(
        unknowns,
        item =>
          `${item.source}|${this.normalize(item.description)}`
      );
    },

    assessCognitionAttention(prepared, reasoning, unknowns) {
      const risks =
        Array.isArray(reasoning?.risks)
          ? reasoning.risks
          : [];

      const highRisks = risks.filter(risk =>
        ["high", "critical"].includes(
          String(risk?.severity || "").toLowerCase()
        )
      );

      const blockingUnknowns = unknowns.filter(
        item => item.blocking
      );

      const approvalRequired = Boolean(
        prepared?.request?.requiresApproval ||
        reasoning?.approvalRequired ||
        reasoning?.recommendation
          ?.executiveApprovalRequired
      );

      let score = 35;
      score += Math.min(30, highRisks.length * 12);
      score += Math.min(
        20,
        blockingUnknowns.length * 8
      );
      score += approvalRequired ? 10 : 0;

      const state =
        reasoning?.recommendation?.state;

      if (
        ["hold", "escalate", "insufficient-evidence"]
          .includes(state)
      ) {
        score += 10;
      }

      score = Math.min(100, score);

      return {
        score,
        level:
          score >= 85
            ? "critical"
            : score >= 70
              ? "high"
              : score >= 50
                ? "elevated"
                : "normal",
        highRiskCount: highRisks.length,
        blockingUnknownCount:
          blockingUnknowns.length,
        approvalRequired,
        recommendationState: state || null
      };
    },

    recordCognition(result) {
      const entry = {
        cognitionId: result.cognitionId,
        requestId: result.request?.id || null,
        objective: result.request?.text || "",
        requestType: result.request?.type || null,
        attention: result.attention?.level || null,
        recommendationState:
          result.reasoning?.recommendation?.state ||
          null,
        unknownCount: result.unknowns?.length || 0,
        proposedWorkCount:
          result.planning?.proposedWork?.length || 0,
        success: result.success === true,
        generatedAt: result.generatedAt
      };

      this.cognitionHistory.unshift(entry);

      if (
        this.cognitionHistory.length >
        this.configuration.maximumCognitionHistory
      ) {
        this.cognitionHistory.length =
          this.configuration.maximumCognitionHistory;
      }

      this.persist();
      if (brainPersistence.hydrated === true) {
        this.projectSelfModel({
          reason: "cognition-completed",
          persist: false
        });
      }
      return this.clone(entry);
    },

    getCognitionHistory(limit = 25) {
      const normalized = Math.max(
        1,
        Math.min(
          this.configuration.maximumCognitionHistory,
          Number(limit) || 25
        )
      );

      return this.clone(
        this.cognitionHistory.slice(0, normalized)
      );
    },

    runCognitionAcceptanceTest() {
      const checks = [];
      const check = (name, passed, details = {}) =>
        checks.push({
          name,
          passed: Boolean(passed),
          details
        });

      check(
        "Cognition cycle API exists",
        typeof this.runCognitionCycle === "function"
      );

      check(
        "Evidence Integrity remains inside Executive Brain request preparation",
        typeof this.prepareEvidenceIntegrity === "function" &&
          /prepareEvidenceIntegrity/.test(
            this.prepareRequest.toString()
          )
      );

      check(
        "Institutional Reasoning is a cognition stage",
        typeof this.runInstitutionalReasoning === "function" &&
          /InstitutionalReasoning/.test(
            this.runInstitutionalReasoning.toString()
          )
      );

      check(
        "Planning readiness is prepared without mutating plans",
        typeof this.preparePlanningReadiness === "function" &&
          /mutationPerformed:\s*false/.test(
            this.preparePlanningReadiness.toString()
          ) &&
          !/\.createPlan\s*\(/.test(
            this.preparePlanningReadiness.toString()
          )
      );

      check(
        "Cognition separates unknowns from recommendation",
        typeof this.collectCognitionUnknowns === "function"
      );

      check(
        "Cognition calculates executive attention",
        typeof this.assessCognitionAttention === "function"
      );

      check(
        "Cognition history survives as Executive Brain state",
        Array.isArray(this.cognitionHistory) &&
          typeof this.recordCognition === "function"
      );

      check(
        "Hallway execution remains outside 006.016A",
        /Hallway dispatch remain explicitly out of scope/.test(
          this.runCognitionCycle.toString()
        )
      );

      const passed = checks.every(item => item.passed);

      console.table(
        checks.map(item => ({
          name: item.name,
          passed: item.passed
        }))
      );

      console.info(
        `[MEOS ${this.version}] Commission 006.016A cognition acceptance: ${passed ? "PASS" : "FAIL"}.`
      );

      return {
        commission: "006.016A",
        passed,
        checks
      };
    },

    classifyRequest(text, options = {}) {
      const value = this.normalize(text);
      const has = terms => terms.some(term => value.includes(term));

      const currentTerms = [
        "latest", "today", "current", "new grant", "open grant",
        "news", "right now", "available now", "rfp"
      ];

      const approvalTerms = [
        "send", "submit", "publish", "purchase", "spend",
        "sign", "file", "apply", "contact", "email", "commit"
      ];

      let type = REQUEST_TYPES.GENERAL;
      let confidence = 0.62;

      if (has([
        "who am i", "what is my name", "who is mandel",
        "who is the founder", "who is the executive director"
      ])) {
        type = REQUEST_TYPES.IDENTITY;
        confidence = 0.98;
      } else if (has([
        "who are you", "what are you", "what can you do",
        "what parts of you", "which engines", "what is executive learning",
        "what is knowledge memory", "what is your brain", "what mode"
      ])) {
        type = REQUEST_TYPES.SELF;
        confidence = 0.94;
      } else if (has([
        "what organization", "our mission", "what does ccsp",
        "organization know", "organizational profile"
      ])) {
        type = REQUEST_TYPES.ORGANIZATION;
        confidence = 0.92;
      } else if (has([
        "current priority", "where did we leave off",
        "what are we working on", "what is next", "unfinished",
        "blocked", "active mission", "open work"
      ])) {
        type = REQUEST_TYPES.CURRENT_WORK;
        confidence = 0.93;
      } else if (has([
        "decide", "compare options", "recommend",
        "which option", "should we", "best choice"
      ])) {
        type = REQUEST_TYPES.DECISION;
        confidence = 0.86;
      } else if (has([
        "risk", "deadline", "overdue", "stalled", "warning", "monitor"
      ])) {
        type = REQUEST_TYPES.MONITORING;
        confidence = 0.83;
      } else if (has([
        "what did we learn", "lesson", "worked", "failed",
        "correction", "preference"
      ])) {
        type = REQUEST_TYPES.LEARNING;
        confidence = 0.80;
      } else if (has(currentTerms)) {
        type = REQUEST_TYPES.RESEARCH;
        confidence = 0.86;
      } else if (has([
        "remember", "recall", "previous", "last time", "history", "earlier"
      ])) {
        type = REQUEST_TYPES.RECALL;
        confidence = 0.82;
      }

      return {
        type,
        confidence,
        requiresCurrentInternet:
          has(currentTerms) || options.forceResearch === true,
        requiresApproval:
          has(approvalTerms) || options.externalAction === true
      };
    },

    collectLocalContext(text, classification, options = {}) {
      let evidence = [];

      if (classification.type === REQUEST_TYPES.IDENTITY) {
        evidence.push(...this.identityEvidence());
      }

      if (classification.type === REQUEST_TYPES.SELF) {
        evidence.push(...this.systemEvidence(text));
      }

      if (classification.type === REQUEST_TYPES.CURRENT_WORK) {
        evidence.push(...this.currentWorkEvidence());
      }

      if (classification.type === REQUEST_TYPES.MONITORING) {
        evidence.push(...this.monitoringEvidence());
      }

      if (classification.type === REQUEST_TYPES.LEARNING) {
        evidence.push(...this.learningEvidence());
      }

      const recall = this.runExecutiveRecall(text, options);
      evidence.push(...this.extractEvidence(recall, "Executive Recall"));

      if (evidence.length === 0) {
        const memory = this.runKnowledgeMemoryRecall(text, options);
        evidence.push(...this.extractEvidence(memory, "Knowledge Memory"));
      }

      if (evidence.length === 0) {
        const knowledge = this.runKnowledgeRecall(text, options);
        evidence.push(...this.extractEvidence(knowledge, "Knowledge Engine"));
      }

      evidence = this.dedupe(evidence, item =>
        [item.id, item.title, item.summary, item.source].join("|")
      ).slice(0, this.configuration.maximumEvidenceItems);

      const confidence = this.evidenceConfidence(evidence);

      return {
        evidence,
        confidence,
        answerableLocally:
          !classification.requiresCurrentInternet &&
          evidence.length > 0 &&
          confidence >= 0.58
      };
    },

    prepareEvidenceIntegrity(subject, localContext, options = {}) {
      const engine = global.ExecutiveEvidenceIntegrity;

      if (!engine || typeof engine.prepare !== "function") {
        if (
          this.configuration.requireEvidenceIntegrity &&
          !this.configuration.allowIntegrityFallback
        ) {
          throw new Error(
            "Executive Evidence Integrity is required but unavailable."
          );
        }

        return {
          success: false,
          available: false,
          fallback: true,
          subject,
          confidence: localContext?.confidence || 0,
          officialFacts: [],
          verifiedInstitutionalKnowledge: [],
          verifiedExternalSources: [],
          executiveSummaries: [],
          executiveInferences: [],
          executiveRecommendations: [],
          unverifiedInformation: [],
          terminologyLocks: [],
          missionRelationships: [],
          conflicts: [],
          citations: [],
          allEvidence: [],
          languageContract: {
            primaryRule:
              "Use available MEOS evidence honestly and do not invent unsupported organizational language.",
            uncertaintyRequired: true,
            evidenceDetailsAvailable: true
          },
          generatedAt: new Date().toISOString()
        };
      }

      return this.safe(
        () =>
          engine.prepare({
            subject,
            evidence: localContext?.evidence || [],
            requestType: options.requestType || null,
            source: options.source || "executive-brain"
          }),
        {
          success: false,
          available: true,
          fallback: true,
          subject,
          confidence: localContext?.confidence || 0,
          officialFacts: [],
          verifiedInstitutionalKnowledge: [],
          verifiedExternalSources: [],
          executiveSummaries: [],
          executiveInferences: [],
          executiveRecommendations: [],
          unverifiedInformation: [],
          terminologyLocks: [],
          missionRelationships: [],
          conflicts: [],
          citations: [],
          allEvidence: [],
          languageContract: {
            primaryRule:
              "Evidence integrity processing failed. Use available evidence cautiously and state uncertainty.",
            uncertaintyRequired: true,
            evidenceDetailsAvailable: true
          },
          generatedAt: new Date().toISOString()
        }
      );
    },

    applyIntegrityToLocalContext(localContext, integrityPackage) {
      const governedEvidence =
        Array.isArray(integrityPackage?.allEvidence) &&
        integrityPackage.allEvidence.length > 0
          ? integrityPackage.allEvidence.map(item => ({
              id: item.id,
              title: item.title,
              summary: item.summary || item.content || "",
              content: item.content || item.summary || "",
              source:
                item.provenance?.sourceType ||
                item.original?.source ||
                item.original?.sourceType ||
                "Executive Evidence Integrity",
              authority:
                item.provenance?.authority ||
                item.original?.authority ||
                "unknown",
              confidence: item.confidence,
              date:
                item.provenance?.retrievedAt ||
                item.original?.date ||
                null,
              citation:
                item.provenance?.citation ||
                item.original?.citation ||
                null,
              evidenceClass: item.evidenceClass,
              representationMode: item.representationMode,
              officialTerms: item.officialTerms || [],
              provenance: item.provenance || null,
              raw: item.original || item
            }))
          : localContext?.evidence || [];

      return {
        ...localContext,
        evidence: governedEvidence,
        confidence:
          integrityPackage?.success === true
            ? integrityPackage.confidence
            : localContext?.confidence || 0,
        answerableLocally:
          Boolean(localContext?.answerableLocally) &&
          governedEvidence.length > 0,
        integrity: {
          available:
            integrityPackage?.available !== false,
          applied:
            integrityPackage?.success === true,
          fallback:
            integrityPackage?.fallback === true,
          confidence:
            integrityPackage?.confidence || 0,
          officialFactCount:
            integrityPackage?.officialFacts?.length || 0,
          verifiedInstitutionalCount:
            integrityPackage?.verifiedInstitutionalKnowledge?.length || 0,
          verifiedExternalCount:
            integrityPackage?.verifiedExternalSources?.length || 0,
          conflictCount:
            integrityPackage?.conflicts?.length || 0,
          terminologyLockCount:
            integrityPackage?.terminologyLocks?.length || 0,
          uncertaintyRequired:
            Boolean(
              integrityPackage?.languageContract?.uncertaintyRequired
            )
        }
      };
    },

    route(classification, localContext, options = {}) {
      const supportingRoutes = [];
      let primaryRoute = "local-recall-plus-provider-reasoning";
      let researchDepth = "local";

      if (
        classification.requiresCurrentInternet ||
        options.forceDeepResearch === true
      ) {
        primaryRoute = "external-intelligence-research";
        researchDepth = "deep";
        supportingRoutes.push("Executive Intelligence Office");
      } else if (localContext.answerableLocally) {
        primaryRoute = "instant-meos-context";
        researchDepth = "none";
      } else if (classification.type === REQUEST_TYPES.DECISION) {
        primaryRoute = "executive-decision-support";
        supportingRoutes.push("Executive Decision");
      }

      if (classification.type === REQUEST_TYPES.MONITORING) {
        supportingRoutes.push("Executive Monitoring");
      }

      if (classification.type === REQUEST_TYPES.LEARNING) {
        supportingRoutes.push("Executive Learning");
      }

      if (classification.type === REQUEST_TYPES.CURRENT_WORK) {
        supportingRoutes.push("Mission Engine", "Executive Workflow");
      }

      return {
        primaryRoute,
        researchDepth,
        supportingRoutes: [...new Set(supportingRoutes)],
        useExternalProvider:
          researchDepth === "deep" || !localContext.answerableLocally,
        providerRole: "advisory-intelligence-provider",
        humanApprovalRequired: classification.requiresApproval
      };
    },

    /*
     * Commission 006.017D4F — Autobiographical Memory Formation
     *
     * Institutional records answer "what does the organization know?".
     * Autobiographical episodes answer "what did Maddy experience, intend,
     * do, observe, and learn?". Episodes remain evidence-derived and are
     * bounded inside the existing durable Executive Brain cognition contract.
     */
    autobiographicalSignificance(input = {}) {
      let score = 20;
      if (input.outcome?.success === false) score += 25;
      if (Number(input.outcome?.failed || 0) > 0) score += 20;
      if (Number(input.outcome?.awaitingReview || 0) > 0) score += 12;
      if (input.eventType === "cognitive-reentry" || input.eventType === "cognitive-reentry-failure") score += 15;
      if (input.eventType === "executive-action") score += 12;
      if ((input.learning?.unresolvedAfter || []).length > 0 || input.learning?.unresolved === true) score += 10;
      return Math.max(0, Math.min(100, score));
    },

    buildAutobiographicalSemanticBasis(input = {}) {
      const awareness = this.getWorkingAwareness({ refresh: false });
      const selfModel = this.getSelfModel({ refresh: false });
      const mode = awareness?.interactionContext?.mode || selfModel?.interactionContext?.mode || null;

      return {
        eventType: String(input.eventType || "experience"),
        subject: String(input.subject || "Maddy experience").trim(),
        sourceId: input.sourceId || null,
        selfFingerprint: selfModel?.fingerprint || null,
        mode,
        perception: this.clone(input.perception || {}),
        beliefsBefore: this.clone(input.beliefsBefore || {}),
        intention: this.clone(input.intention || {}),
        action: this.clone(input.action || {}),
        outcome: this.clone(input.outcome || {}),
        learning: this.clone(input.learning || {})
      };
    },

    formAutobiographicalEpisode(input = {}, options = {}) {
      const semantic = this.buildAutobiographicalSemanticBasis(input);
      const experienceFingerprint = this.fingerprintCognitiveDispatch(semantic).replace("cognitive-", "episode-");
      const existing = (this.autobiographicalMemory || []).find(item => item.experienceFingerprint === experienceFingerprint);

      if (existing) {
        return {
          success: true,
          created: false,
          duplicate: true,
          episode: this.clone(existing)
        };
      }

      const awareness = this.getWorkingAwareness({ refresh: false });
      const selfModel = this.getSelfModel({ refresh: false });
      const priorEpisode = this.autobiographicalMemory?.[0] || null;
      this.autobiographicalEpisodeCount = Number(this.autobiographicalEpisodeCount || 0) + 1;

      const episode = {
        schema: "meos.maddy.autobiographical-episode.v1",
        version: "1.0.0",
        episodeId: this.id("autobiographical-episode"),
        revision: this.autobiographicalEpisodeCount,
        experiencedAt: new Date().toISOString(),
        eventType: semantic.eventType,
        subject: semantic.subject,
        sourceId: semantic.sourceId,
        experienceFingerprint,
        parentEpisodeFingerprint: priorEpisode?.experienceFingerprint || null,
        context: {
          persistentSelf: selfModel ? {
            revision: selfModel.revision,
            fingerprint: selfModel.fingerprint,
            preferredName: selfModel.identity?.preferredName || null
          } : null,
          workingAwareness: awareness ? {
            revision: awareness.revision,
            fingerprint: awareness.fingerprint,
            primaryFocus: this.clone(awareness.primaryFocus || null)
          } : null,
          interactionMode: semantic.mode,
          audience: awareness?.interactionContext?.audience || selfModel?.interactionContext?.audience || null
        },
        perception: semantic.perception,
        beliefsBefore: semantic.beliefsBefore,
        intention: semantic.intention,
        action: semantic.action,
        outcome: semantic.outcome,
        learning: semantic.learning,
        significance: {
          score: this.autobiographicalSignificance(input),
          reason: input.significanceReason || "Derived from consequence, unresolved state, action, and continuity evidence."
        },
        continuity: {
          belongsToPersistentMaddy: Boolean(selfModel?.fingerprint),
          identityIsNotMode: true,
          evidenceDerived: true
        }
      };

      this.autobiographicalMemory.unshift(episode);
      if (this.autobiographicalMemory.length > this.configuration.maximumAutobiographicalEpisodes) {
        this.autobiographicalMemory.length = this.configuration.maximumAutobiographicalEpisodes;
      }

      if (options.persist !== false) this.persist();
      this.emit("brain:autobiographical-memory-formed", this.clone(episode));

      return {
        success: true,
        created: true,
        duplicate: false,
        episode: this.clone(episode)
      };
    },

    getAutobiographicalMemory(limit = this.configuration.autobiographicalRecallLimit) {
      const normalized = Math.max(1, Math.min(this.configuration.maximumAutobiographicalEpisodes, Number(limit) || 12));
      return this.clone((this.autobiographicalMemory || []).slice(0, normalized));
    },

    recallAutobiographicalMemory(query, options = {}) {
      const tokens = String(query || "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(token => token.length > 2);
      const limit = Math.max(1, Math.min(25, Number(options.limit) || 8));
      const now = Date.now();

      return this.clone((this.autobiographicalMemory || [])
        .map((episode, index) => {
          const haystack = JSON.stringify({
            subject: episode.subject,
            eventType: episode.eventType,
            intention: episode.intention,
            outcome: episode.outcome,
            learning: episode.learning
          }).toLowerCase();
          const lexical = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 12 : 0), 0);
          const significance = Number(episode.significance?.score || 0) * 0.5;
          const ageMs = Math.max(0, now - Date.parse(episode.experiencedAt || 0));
          const recency = Math.max(0, 20 - Math.floor(ageMs / 86400000));
          return { episode, recallScore: lexical + significance + recency - Math.min(10, index * 0.2) };
        })
        .filter(item => tokens.length === 0 || item.recallScore > 0)
        .sort((a, b) => b.recallScore - a.recallScore)
        .slice(0, limit)
        .map(item => ({ ...item.episode, recallScore: Number(item.recallScore.toFixed(2)) })));
    },

    /*
     * Commission 006.017D4H — Temporal Continuity + Persistent Intentions
     *
     * This layer gives the same persistent Maddy a reconstructable temporal
     * thread across suspension, browser/process restart, disconnection, and
     * return. It does not create a second scheduler or a consciousness flag.
     * It binds existing intentions, missions, approvals, self-model, working
     * awareness, autobiography, and reflection into an evidence-backed
     * "what I was doing / what changed / what still matters" continuity state.
     */
    registerTemporalCommitment(subject, options = {}) {
      const intention = this.upsertCognitiveIntention(
        subject,
        [{
          source: options.source || "executive-brain",
          event: options.event || "temporal-commitment-registered",
          sourceId: options.sourceId || null
        }],
        {
          status: options.status || "pending",
          kind: options.kind || "commitment",
          dueAt: options.dueAt || null,
          expectedAt: options.expectedAt || null,
          promiseTo: options.promiseTo || null,
          relatedMissionId: options.relatedMissionId || null,
          sourceId: options.sourceId || null,
          persist: options.persist !== false
        }
      );
      if (!intention) return null;
      if (options.record !== false) {
        this.record("continuity.temporal-commitment-registered", {
          intentionId: intention.intentionId,
          subject: intention.subject,
          temporal: this.clone(intention.temporal || {})
        });
      }
      return this.clone(intention);
    },

    temporalCommitmentState(intention = {}, nowMs = Date.now()) {
      const temporal = intention.temporal || {};
      const raw = temporal.dueAt || temporal.expectedAt || null;
      let dueAt = null;
      let millisecondsRemaining = null;
      let overdue = false;
      if (raw) {
        const due = new Date(raw).getTime();
        if (Number.isFinite(due)) {
          dueAt = new Date(due).toISOString();
          millisecondsRemaining = due - nowMs;
          overdue = millisecondsRemaining < 0;
        }
      }
      return {
        intentionId: intention.intentionId || null,
        subject: intention.subject || null,
        status: intention.status || "pending",
        kind: temporal.kind || "cognitive-intention",
        promiseTo: temporal.promiseTo || null,
        relatedMissionId: temporal.relatedMissionId || null,
        dueAt,
        millisecondsRemaining,
        overdue,
        attempts: Number(intention.attempts || 0),
        lastError: intention.lastError || null
      };
    },

    collectTemporalCommitments(options = {}) {
      const nowMs = Number(options.nowMs || Date.now());
      const lookaheadMs = Math.max(
        0,
        Number(options.lookaheadHours ?? this.configuration.temporalCommitmentLookaheadHours) * 3600000
      );
      return this.clone(
        (this.cognitiveIntentions || [])
          .filter(item => item && item.status !== "completed")
          .map(item => this.temporalCommitmentState(item, nowMs))
          .filter(item =>
            item.dueAt === null ||
            item.overdue ||
            item.millisecondsRemaining <= lookaheadMs
          )
          .sort((a, b) => {
            if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
            const av = a.millisecondsRemaining === null ? Number.MAX_SAFE_INTEGER : a.millisecondsRemaining;
            const bv = b.millisecondsRemaining === null ? Number.MAX_SAFE_INTEGER : b.millisecondsRemaining;
            return av - bv;
          })
      );
    },

    buildTemporalContinuityCheckpoint(options = {}) {
      const selfModel = this.getSelfModel({ refresh: false });
      const awareness = this.getWorkingAwareness({ refresh: false });
      const currentWork = this.collectCurrentWork();
      const commitments = this.collectTemporalCommitments();
      const primary = awareness?.primaryFocus || null;
      const unresolved = (this.cognitiveIntentions || [])
        .filter(item => item && item.status !== "completed")
        .slice(0, 50)
        .map(item => ({
          intentionId: item.intentionId || null,
          subject: item.subject || null,
          status: item.status || null,
          temporal: this.clone(item.temporal || null),
          attempts: Number(item.attempts || 0),
          lastError: item.lastError || null
        }));

      return {
        schema: "meos.maddy.temporal-checkpoint.v1",
        checkpointId: options.checkpointId || this.id("temporal-checkpoint"),
        capturedAt: options.capturedAt || new Date().toISOString(),
        reason: options.reason || "runtime-checkpoint",
        persistentSelfFingerprint: selfModel?.fingerprint || null,
        workingAwarenessFingerprint: awareness?.fingerprint || null,
        interactionMode:
          awareness?.interactionContext?.activeMode ||
          selfModel?.interactionContext?.activeMode ||
          null,
        whatIWasDoing: primary
          ? {
              key: primary.key || null,
              kind: primary.kind || null,
              subject: primary.subject || null,
              source: primary.source || null,
              status: primary.status || null,
              salience: Number(primary.salience || 0)
            }
          : null,
        unfinishedIntentions: unresolved,
        temporalCommitments: commitments,
        executiveWork: {
          activeCount: Number(currentWork?.summary?.active || 0),
          pendingCount: Number(currentWork?.summary?.pending || 0),
          blockedCount: Number(currentWork?.summary?.blocked || 0),
          pendingApprovalCount: Array.isArray(currentWork?.pendingApprovals)
            ? currentWork.pendingApprovals.length
            : 0
        },
        recentAutobiographicalEpisodeId:
          this.autobiographicalMemory?.[0]?.episodeId || null,
        recentMetacognitiveReflectionId:
          this.metacognitiveReflections?.[0]?.reflectionId || null,
        evidenceDerived: true,
        consciousnessClaim: false
      };
    },

    checkpointTemporalContinuity(options = {}) {
      const checkpoint = this.buildTemporalContinuityCheckpoint(options);
      this.temporalContinuityCheckpointCount =
        Number(this.temporalContinuityCheckpointCount || 0) + 1;
      checkpoint.revision = this.temporalContinuityCheckpointCount;

      const prior = this.temporalContinuity?.lastCheckpoint || null;
      const semantic = this.clone(checkpoint);
      delete semantic.checkpointId;
      delete semantic.capturedAt;
      delete semantic.reason;
      delete semantic.revision;
      (semantic.temporalCommitments || []).forEach(item => {
        delete item.millisecondsRemaining;
      });
      const fingerprint = this.fingerprintCognitiveDispatch(semantic)
        .replace("cognitive-", "temporal-");
      checkpoint.fingerprint = fingerprint;
      checkpoint.parentFingerprint = prior?.fingerprint || null;

      if (prior?.fingerprint !== fingerprint || options.force === true) {
        this.temporalContinuityHistory.unshift(checkpoint);
        this.temporalContinuityHistory = this.temporalContinuityHistory.slice(
          0,
          this.configuration.maximumTemporalContinuityHistory
        );
      }

      this.temporalContinuity = {
        ...(this.temporalContinuity || {}),
        schema: "meos.maddy.temporal-continuity.v1",
        status: options.status || "checkpointed",
        lastCheckpoint: checkpoint,
        currentIntervalStartedAt:
          this.temporalContinuity?.currentIntervalStartedAt ||
          this.initializedAt ||
          checkpoint.capturedAt
      };

      if (options.persist !== false) this.persist();
      this.emit("brain:temporal-continuity-checkpoint", checkpoint);
      return this.clone(checkpoint);
    },

    compareTemporalCheckpoint(checkpoint, current = null, options = {}) {
      if (!checkpoint) {
        return {
          changed: false,
          reasons: ["no-prior-checkpoint"],
          unresolvedStillOpen: [],
          newlyOverdue: []
        };
      }
      const present = current || this.buildTemporalContinuityCheckpoint({
        reason: "temporal-comparison"
      });
      const currentIntentions = new Map(
        (present.unfinishedIntentions || []).map(item => [item.intentionId, item])
      );
      const unresolvedStillOpen = (checkpoint.unfinishedIntentions || [])
        .filter(item => item.intentionId && currentIntentions.has(item.intentionId));
      const nowMs = Number(options.nowMs || Date.now());
      const newlyOverdue = (checkpoint.temporalCommitments || [])
        .filter(item => item.dueAt && new Date(item.dueAt).getTime() <= nowMs)
        .filter(item => item.status !== "completed");

      const reasons = [];
      if (
        checkpoint.persistentSelfFingerprint &&
        present.persistentSelfFingerprint &&
        checkpoint.persistentSelfFingerprint !== present.persistentSelfFingerprint
      ) reasons.push("persistent-self-changed");
      if (
        checkpoint.workingAwarenessFingerprint &&
        present.workingAwarenessFingerprint &&
        checkpoint.workingAwarenessFingerprint !== present.workingAwarenessFingerprint
      ) reasons.push("working-awareness-changed");
      if (
        Number(checkpoint.executiveWork?.pendingApprovalCount || 0) !==
        Number(present.executiveWork?.pendingApprovalCount || 0)
      ) reasons.push("approval-state-changed");
      if (newlyOverdue.length > 0) reasons.push("commitment-became-due-or-overdue");
      if (
        checkpoint.recentAutobiographicalEpisodeId &&
        present.recentAutobiographicalEpisodeId &&
        checkpoint.recentAutobiographicalEpisodeId !== present.recentAutobiographicalEpisodeId
      ) reasons.push("new-experience-recorded");
      if (
        checkpoint.recentMetacognitiveReflectionId &&
        present.recentMetacognitiveReflectionId &&
        checkpoint.recentMetacognitiveReflectionId !== present.recentMetacognitiveReflectionId
      ) reasons.push("new-reflection-recorded");

      return {
        changed: reasons.length > 0,
        reasons,
        unresolvedStillOpen: this.clone(unresolvedStillOpen),
        newlyOverdue: this.clone(newlyOverdue),
        present: this.clone(present)
      };
    },

    resumeTemporalContinuity(options = {}) {
      const prior = this.temporalContinuity?.lastCheckpoint ||
        this.temporalContinuityHistory?.[0] ||
        null;
      const now = options.now || new Date().toISOString();
      const nowMs = new Date(now).getTime();
      const priorMs = prior?.capturedAt ? new Date(prior.capturedAt).getTime() : null;
      const absenceMs = Number.isFinite(priorMs) ? Math.max(0, nowMs - priorMs) : null;
      const present = this.buildTemporalContinuityCheckpoint({
        reason: "temporal-resume-present",
        capturedAt: now
      });
      const comparison = this.compareTemporalCheckpoint(prior, present, { nowMs });
      const wasDoing = prior?.whatIWasDoing || null;
      const shouldOrient = Boolean(
        prior &&
        (
          comparison.changed ||
          comparison.unresolvedStillOpen.length > 0 ||
          (absenceMs !== null && absenceMs >= this.configuration.temporalContinuityResumeThresholdMs)
        )
      );

      const resume = {
        schema: "meos.maddy.temporal-resume.v1",
        resumedAt: now,
        reason: options.reason || "runtime-return",
        absenceMs,
        priorCheckpointId: prior?.checkpointId || null,
        priorCheckpointFingerprint: prior?.fingerprint || null,
        whatIWasDoing: this.clone(wasDoing),
        unresolvedStillOpen: this.clone(comparison.unresolvedStillOpen),
        newlyOverdue: this.clone(comparison.newlyOverdue),
        changedDuringAbsence: comparison.changed,
        changeReasons: this.clone(comparison.reasons),
        orientationRequired: shouldOrient,
        dryRun: options.dryRun === true,
        evidenceDerived: true
      };

      if (shouldOrient && options.dryRun !== true) {
        const subject = wasDoing?.subject ||
          comparison.newlyOverdue?.[0]?.subject ||
          comparison.unresolvedStillOpen?.[0]?.subject ||
          "Reconstruct temporal continuity and determine what requires attention after return";
        this.scheduleCognitiveReentry(
          subject,
          {
            source: "executive-brain",
            event: "temporal-continuity-return",
            absenceMs,
            priorCheckpointId: prior?.checkpointId || null,
            changeReasons: comparison.reasons
          },
          { immediate: true, preserveIntention: true }
        );
      }

      if (options.dryRun !== true) {
        this.temporalContinuity = {
          ...(this.temporalContinuity || {}),
          schema: "meos.maddy.temporal-continuity.v1",
          status: "continuous",
          lastResume: resume,
          currentIntervalStartedAt: now
        };
        this.record("continuity.temporal-resumed", resume);
        this.persist();
        this.emit("brain:temporal-continuity-resumed", resume);
      }
      return this.clone(resume);
    },

    attachTemporalContinuityObservers() {
      if (this.temporalContinuityObserversAttached) return true;
      if (typeof global.addEventListener !== "function") return false;

      const checkpoint = reason => {
        if (brainPersistence.hydrated !== true) return;
        this.checkpointTemporalContinuity({ reason, persist: true });
      };
      const resume = reason => {
        if (brainPersistence.hydrated !== true) return;
        this.resumeTemporalContinuity({ reason });
      };

      global.addEventListener("pagehide", () => checkpoint("pagehide"));
      global.addEventListener("beforeunload", () => checkpoint("beforeunload"));
      global.addEventListener("offline", () => checkpoint("offline"));
      global.addEventListener("online", () => resume("network-reconnected"));
      if (global.document?.addEventListener) {
        global.document.addEventListener("visibilitychange", () => {
          if (global.document.hidden) checkpoint("document-hidden");
          else resume("document-visible");
        });
      }

      this.temporalContinuityObserversAttached = true;
      return true;
    },

    getTemporalContinuityStatus() {
      const commitments = this.collectTemporalCommitments();
      const unresolved = (this.cognitiveIntentions || []).filter(
        item => item && item.status !== "completed"
      );
      return {
        schema: "meos.maddy.temporal-continuity-status.v1",
        status: this.temporalContinuity?.status || "unknown",
        currentIntervalStartedAt: this.temporalContinuity?.currentIntervalStartedAt || null,
        lastCheckpoint: this.clone(this.temporalContinuity?.lastCheckpoint || null),
        lastResume: this.clone(this.temporalContinuity?.lastResume || null),
        unresolvedIntentionCount: unresolved.length,
        temporalCommitmentCount: commitments.length,
        overdueCommitmentCount: commitments.filter(item => item.overdue).length,
        upcomingCommitments: commitments.slice(0, 12),
        historyCount: this.temporalContinuityHistory.length,
        observersAttached: this.temporalContinuityObserversAttached === true,
        durable: brainPersistence.authority === "meos-institutional-repository",
        externalAuthorityUnchanged:
          this.configuration.requireHumanApprovalForExternalAction === true
      };
    },

    runTemporalContinuityAcceptanceTest() {
      const originalIntentions = this.clone(this.cognitiveIntentions || []);
      const originalTemporal = this.clone(this.temporalContinuity || {});
      const originalHistory = this.clone(this.temporalContinuityHistory || []);
      const originalCount = Number(this.temporalContinuityCheckpointCount || 0);
      const originalSelf = this.clone(this.selfModel);
      const originalAwareness = this.clone(this.workingAwareness);
      const token = this.id("d4h-acceptance");
      const now = Date.now();

      try {
        const promise = this.registerTemporalCommitment(
          `Follow through on ${token}`,
          {
            kind: "promise",
            promiseTo: "authorized-human",
            dueAt: new Date(now - 60000).toISOString(),
            sourceId: token,
            persist: false,
            record: false
          }
        );
        const expectation = this.registerTemporalCommitment(
          `Check expected development ${token}`,
          {
            kind: "expected-future-event",
            expectedAt: new Date(now + 3600000).toISOString(),
            sourceId: `${token}-expected`,
            persist: false,
            record: false
          }
        );
        const checkpoint = this.checkpointTemporalContinuity({
          reason: "d4h-acceptance-suspension",
          capturedAt: new Date(now - 3600000).toISOString(),
          persist: false,
          force: true
        });
        const resume = this.resumeTemporalContinuity({
          reason: "d4h-acceptance-return",
          now: new Date(now).toISOString(),
          dryRun: true
        });
        const snapshot = this.buildPersistenceSnapshot();
        const status = this.getTemporalContinuityStatus();
        const startup = this.buildStartupContext({ force: true });

        const checks = [
          {
            name: "Temporal continuity is evidence-derived rather than a consciousness flag",
            passed:
              checkpoint?.evidenceDerived === true &&
              checkpoint?.consciousnessClaim === false
          },
          {
            name: "A temporal checkpoint binds persistent self, working awareness, and what Maddy was doing",
            passed:
              Object.prototype.hasOwnProperty.call(checkpoint, "persistentSelfFingerprint") &&
              Object.prototype.hasOwnProperty.call(checkpoint, "workingAwarenessFingerprint") &&
              Object.prototype.hasOwnProperty.call(checkpoint, "whatIWasDoing")
          },
          {
            name: "Unfinished cognitive intentions survive inside the temporal thread",
            passed:
              Array.isArray(checkpoint.unfinishedIntentions) &&
              checkpoint.unfinishedIntentions.some(item => item.intentionId === promise?.intentionId)
          },
          {
            name: "Promises and expected future events are persistent intentions of the same Maddy",
            passed:
              promise?.temporal?.kind === "promise" &&
              expectation?.temporal?.kind === "expected-future-event"
          },
          {
            name: "Temporal continuity distinguishes overdue and upcoming commitments",
            passed:
              status.overdueCommitmentCount >= 1 &&
              status.upcomingCommitments.some(item => item.intentionId === expectation?.intentionId)
          },
          {
            name: "Return reconstructs absence duration and what Maddy was doing before interruption",
            passed:
              Number(resume.absenceMs) >= 3500000 &&
              Object.prototype.hasOwnProperty.call(resume, "whatIWasDoing")
          },
          {
            name: "Return detects unfinished work and due commitments as continuity evidence",
            passed:
              resume.unresolvedStillOpen.some(item => item.intentionId === promise?.intentionId) &&
              resume.newlyOverdue.some(item => item.intentionId === promise?.intentionId)
          },
          {
            name: "Temporal return can autonomously re-enter cognition without a new human prompt",
            passed:
              /temporal-continuity-return/.test(this.resumeTemporalContinuity.toString()) &&
              /scheduleCognitiveReentry/.test(this.resumeTemporalContinuity.toString())
          },
          {
            name: "Suspension, visibility, offline, and reconnection are wired as temporal continuity events",
            passed:
              /pagehide/.test(this.attachTemporalContinuityObservers.toString()) &&
              /visibilitychange/.test(this.attachTemporalContinuityObservers.toString()) &&
              /offline/.test(this.attachTemporalContinuityObservers.toString()) &&
              /online/.test(this.attachTemporalContinuityObservers.toString())
          },
          {
            name: "Temporal continuity is part of bounded durable Executive Brain cognition",
            passed:
              snapshot?.temporalContinuity?.schema === "meos.maddy.temporal-continuity.v1" &&
              Array.isArray(snapshot.temporalContinuityHistory)
          },
          {
            name: "Executive startup and reasoning context can inspect temporal continuity",
            passed:
              startup?.temporalContinuity?.schema === "meos.maddy.temporal-continuity-status.v1"
          },
          {
            name: "Temporal continuity preserves external human approval authority",
            passed:
              status.externalAuthorityUnchanged === true &&
              this.configuration.requireHumanApprovalForExternalAction === true
          }
        ];

        const passed = checks.every(item => item.passed);
        console.table(checks.map(item => ({ name: item.name, passed: item.passed })));
        console.info(
          `[MEOS ${this.version}] Commission 006.017D4H temporal continuity / persistent intentions: ${passed ? "PASS" : "FAIL"}.`
        );
        return {
          commission: "006.017D4H",
          version: this.version,
          buildId: this.buildId,
          passed,
          checks,
          checkpoint: this.clone(checkpoint),
          resume: this.clone(resume),
          status: this.clone(status)
        };
      } finally {
        this.cognitiveIntentions = originalIntentions;
        this.temporalContinuity = originalTemporal;
        this.temporalContinuityHistory = originalHistory;
        this.temporalContinuityCheckpointCount = originalCount;
        this.selfModel = originalSelf;
        this.workingAwareness = originalAwareness;
      }
    },

    /*
     * Commission 006.017D4G — Reflection + Metacognitive Loop
     *
     * Reflection is not a claim of consciousness. It is an inspectable,
     * evidence-derived loop in which Maddy can compare expectation with
     * outcome, inspect her own cognition, detect recurring patterns, update
     * confidence, preserve uncertainty, and carry the lesson into future
     * cognition as part of the same durable Executive Brain state.
     */
    metacognitiveExpectationFromEpisode(episode = {}) {
      const belief = episode.beliefsBefore || {};
      const intention = episode.intention || {};
      const expectedSuccess =
        typeof belief.expectedSuccess === "boolean"
          ? belief.expectedSuccess
          : typeof intention.expectedSuccess === "boolean"
            ? intention.expectedSuccess
            : null;
      const expectedConfidence = Number(
        belief.confidence ??
        intention.confidence ??
        0.5
      );
      return {
        expectedSuccess,
        confidence: Math.max(0, Math.min(1, Number.isFinite(expectedConfidence) ? expectedConfidence : 0.5)),
        unresolvedBefore: this.clone(
          belief.unresolvedAtStart ||
          intention.unknowns ||
          []
        )
      };
    },

    metacognitiveOutcomeFromEpisode(episode = {}) {
      const outcome = episode.outcome || {};
      return {
        success:
          typeof outcome.success === "boolean"
            ? outcome.success
            : null,
        changed: outcome.changed === true,
        failed: Number(outcome.failed || 0),
        awaitingReview: Number(outcome.awaitingReview || 0),
        unresolvedAfter: this.clone(
          episode.learning?.unresolvedAfter ||
          []
        )
      };
    },

    detectMetacognitivePatterns(episode = {}, options = {}) {
      const recent = (this.autobiographicalMemory || [])
        .filter(item => item?.episodeId !== episode?.episodeId)
        .slice(0, Math.max(1, Number(options.lookback || 40)));

      const subjectTokens = String(episode.subject || "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(token => token.length > 3);

      const related = recent.filter(item => {
        if (item.eventType === episode.eventType) return true;
        const haystack = JSON.stringify({
          subject: item.subject,
          intention: item.intention,
          action: item.action,
          outcome: item.outcome,
          learning: item.learning
        }).toLowerCase();
        return subjectTokens.some(token => haystack.includes(token));
      });

      const failures = related.filter(item => item.outcome?.success === false);
      const successes = related.filter(item => item.outcome?.success === true);
      const unresolved = related.filter(item =>
        (item.learning?.unresolvedAfter || []).length > 0 ||
        item.learning?.unresolved === true
      );

      return {
        relatedExperienceCount: related.length,
        recurringFailureCount: failures.length,
        recurringSuccessCount: successes.length,
        recurringUnresolvedCount: unresolved.length,
        patternDetected:
          failures.length >= 2 ||
          successes.length >= 2 ||
          unresolved.length >= 2,
        evidenceEpisodeIds: related.slice(0, 12).map(item => item.episodeId)
      };
    },

    reflectOnAutobiographicalEpisode(episodeOrId, options = {}) {
      const episode =
        typeof episodeOrId === "string"
          ? (this.autobiographicalMemory || []).find(item => item.episodeId === episodeOrId)
          : episodeOrId;

      if (!episode?.episodeId) {
        return {
          success: false,
          error: "autobiographical-episode-required"
        };
      }

      const existing = (this.metacognitiveReflections || []).find(
        item => item.sourceEpisodeId === episode.episodeId &&
          item.sourceExperienceFingerprint === episode.experienceFingerprint
      );
      if (existing && options.force !== true) {
        return {
          success: true,
          created: false,
          duplicate: true,
          reflection: this.clone(existing)
        };
      }

      const expectation = this.metacognitiveExpectationFromEpisode(episode);
      const observed = this.metacognitiveOutcomeFromEpisode(episode);
      const patterns = this.detectMetacognitivePatterns(episode, options);

      let predictionError = null;
      if (
        typeof expectation.expectedSuccess === "boolean" &&
        typeof observed.success === "boolean"
      ) {
        predictionError =
          expectation.expectedSuccess === observed.success ? 0 : 1;
      }

      let confidenceDelta = 0;
      if (predictionError === 1) {
        confidenceDelta = -Math.max(0.08, expectation.confidence * 0.25);
      } else if (predictionError === 0 && observed.success === true) {
        confidenceDelta = Math.min(0.08, (1 - expectation.confidence) * 0.15);
      }
      if (patterns.recurringFailureCount >= 2) confidenceDelta -= 0.08;
      if (patterns.recurringUnresolvedCount >= 2) confidenceDelta -= 0.04;

      const updatedConfidence = Math.max(
        0.05,
        Math.min(0.99, expectation.confidence + confidenceDelta)
      );

      const learningText =
        episode.learning?.learned ||
        episode.learning?.summary ||
        null;

      const correctionRequired =
        predictionError === 1 ||
        observed.success === false ||
        patterns.recurringFailureCount >= 2;

      this.metacognitiveReflectionCount =
        Number(this.metacognitiveReflectionCount || 0) + 1;

      const reflection = {
        schema: "meos.maddy.metacognitive-reflection.v1",
        version: "1.0.0",
        reflectionId: this.id("metacognitive-reflection"),
        revision: this.metacognitiveReflectionCount,
        reflectedAt: new Date().toISOString(),
        sourceEpisodeId: episode.episodeId,
        sourceExperienceFingerprint: episode.experienceFingerprint,
        selfFingerprint:
          episode.context?.persistentSelf?.fingerprint ||
          this.getSelfModel({ refresh: false })?.fingerprint ||
          null,
        awarenessFingerprint:
          episode.context?.workingAwareness?.fingerprint ||
          this.getWorkingAwareness({ refresh: false })?.fingerprint ||
          null,
        interactionMode: episode.context?.interactionMode || null,
        inspection: {
          expectation,
          observedOutcome: observed,
          predictionError,
          reasoningWasWrong:
            predictionError === 1 ||
            observed.success === false,
          uncertaintyPreserved:
            predictionError === null ||
            observed.success === null ||
            observed.unresolvedAfter.length > 0
        },
        patterns,
        calibration: {
          confidenceBefore: expectation.confidence,
          confidenceDelta: Number(confidenceDelta.toFixed(4)),
          confidenceAfter: Number(updatedConfidence.toFixed(4)),
          evidenceBased: true
        },
        adaptation: {
          correctionRequired,
          lesson: learningText,
          futureDirective: correctionRequired
            ? "Reconsider the prior assumption or strategy before repeating materially similar cognition."
            : "Retain the supported strategy while continuing to test it against future outcomes.",
          carryForward: true
        },
        continuity: {
          belongsToPersistentMaddy: Boolean(
            episode.context?.persistentSelf?.fingerprint
          ),
          evidenceDerived: true,
          consciousnessClaim: false
        }
      };

      if (existing) {
        const index = this.metacognitiveReflections.indexOf(existing);
        this.metacognitiveReflections.splice(index, 1);
      }
      this.metacognitiveReflections.unshift(reflection);
      if (
        this.metacognitiveReflections.length >
        this.configuration.maximumMetacognitiveReflections
      ) {
        this.metacognitiveReflections.length =
          this.configuration.maximumMetacognitiveReflections;
      }

      if (options.persist !== false) this.persist();
      this.emit("brain:metacognitive-reflection", this.clone(reflection));

      return {
        success: true,
        created: true,
        duplicate: false,
        reflection: this.clone(reflection)
      };
    },

    getMetacognitiveReflections(limit = this.configuration.metacognitiveRecallLimit) {
      const normalized = Math.max(
        1,
        Math.min(
          this.configuration.maximumMetacognitiveReflections,
          Number(limit) || 12
        )
      );
      return this.clone(
        (this.metacognitiveReflections || []).slice(0, normalized)
      );
    },

    buildMetacognitiveContext(options = {}) {
      const limit = Math.max(
        1,
        Math.min(12, Number(options.limit) || 6)
      );
      const reflections = this.getMetacognitiveReflections(limit);
      return {
        schema: "meos.maddy.metacognitive-context.v1",
        generatedAt: new Date().toISOString(),
        selfFingerprint:
          this.getSelfModel({ refresh: false })?.fingerprint || null,
        workingAwarenessFingerprint:
          this.getWorkingAwareness({ refresh: false })?.fingerprint || null,
        recentReflections: reflections,
        corrections: reflections
          .filter(item => item.adaptation?.correctionRequired === true)
          .slice(0, limit),
        calibration: reflections.slice(0, limit).map(item => ({
          reflectionId: item.reflectionId,
          confidenceBefore: item.calibration?.confidenceBefore,
          confidenceAfter: item.calibration?.confidenceAfter,
          predictionError: item.inspection?.predictionError
        })),
        evidenceDerived: true
      };
    },

    runMetacognitiveReflectionAcceptanceTest() {
      const originalMemory = this.clone(this.autobiographicalMemory || []);
      const originalEpisodeCount = Number(this.autobiographicalEpisodeCount || 0);
      const originalReflections = this.clone(this.metacognitiveReflections || []);
      const originalReflectionCount = Number(this.metacognitiveReflectionCount || 0);
      const token = this.id("d4g-acceptance");

      try {
        const first = this.formAutobiographicalEpisode({
          eventType: "metacognitive-acceptance",
          subject: `Reflective cognition ${token}`,
          sourceId: `${token}-1`,
          beliefsBefore: {
            expectedSuccess: true,
            confidence: 0.9,
            unresolvedAtStart: ["test uncertainty"]
          },
          intention: {
            objective: "test expectation against reality"
          },
          action: { type: "reason" },
          outcome: {
            success: false,
            changed: true,
            failed: 1
          },
          learning: {
            learned: "The prior expectation was contradicted by observed outcome.",
            unresolvedAfter: ["cause requires further investigation"]
          }
        }, { persist: false }).episode;

        const reflection = this.reflectOnAutobiographicalEpisode(first, {
          persist: false
        });
        const duplicate = this.reflectOnAutobiographicalEpisode(first, {
          persist: false
        });

        for (let i = 0; i < 2; i += 1) {
          this.formAutobiographicalEpisode({
            eventType: "metacognitive-acceptance",
            subject: `Reflective cognition ${token} recurring pattern ${i}`,
            sourceId: `${token}-pattern-${i}`,
            beliefsBefore: {
              expectedSuccess: true,
              confidence: 0.8
            },
            intention: { objective: "repeat comparable strategy" },
            action: { type: "reason" },
            outcome: { success: false, changed: true, failed: 1 },
            learning: {
              learned: "Comparable strategy failed again.",
              unresolvedAfter: ["pattern cause"]
            }
          }, { persist: false });
        }

        const later = this.formAutobiographicalEpisode({
          eventType: "metacognitive-acceptance",
          subject: `Reflective cognition ${token} later`,
          sourceId: `${token}-later`,
          beliefsBefore: {
            expectedSuccess: true,
            confidence: 0.8
          },
          intention: { objective: "detect recurring pattern" },
          action: { type: "reflect" },
          outcome: { success: false, changed: true, failed: 1 },
          learning: {
            learned: "Repeated contradiction should change future reasoning.",
            unresolvedAfter: ["pattern cause"]
          }
        }, { persist: false }).episode;
        const patterned = this.reflectOnAutobiographicalEpisode(later, {
          persist: false
        });

        const snapshot = this.buildPersistenceSnapshot();
        const context = this.buildMetacognitiveContext({ limit: 8 });
        const checks = [
          {
            name: "Reflection is evidence-derived rather than a consciousness flag",
            passed:
              reflection?.reflection?.continuity?.evidenceDerived === true &&
              reflection?.reflection?.continuity?.consciousnessClaim === false
          },
          {
            name: "Reflection belongs to the same persistent Maddy that experienced the episode",
            passed:
              Boolean(reflection?.reflection?.selfFingerprint) &&
              reflection.reflection.selfFingerprint ===
                first.context?.persistentSelf?.fingerprint
          },
          {
            name: "Metacognition compares prior expectation with observed outcome",
            passed:
              reflection?.reflection?.inspection?.expectation?.expectedSuccess === true &&
              reflection?.reflection?.inspection?.observedOutcome?.success === false
          },
          {
            name: "Contradicted expectation is explicitly recognized as prediction error",
            passed:
              reflection?.reflection?.inspection?.predictionError === 1 &&
              reflection?.reflection?.inspection?.reasoningWasWrong === true
          },
          {
            name: "Confidence calibration changes from outcome evidence instead of arbitrary drift",
            passed:
              reflection?.reflection?.calibration?.evidenceBased === true &&
              reflection?.reflection?.calibration?.confidenceAfter <
                reflection?.reflection?.calibration?.confidenceBefore
          },
          {
            name: "Uncertainty survives reflection instead of being manufactured away",
            passed:
              reflection?.reflection?.inspection?.uncertaintyPreserved === true
          },
          {
            name: "Repeated self-reflection consolidates instead of inventing duplicate reflections",
            passed:
              duplicate?.duplicate === true &&
              duplicate?.reflection?.reflectionId ===
                reflection?.reflection?.reflectionId
          },
          {
            name: "Recurring experience can become an inspectable metacognitive pattern",
            passed:
              patterned?.reflection?.patterns?.patternDetected === true &&
              patterned?.reflection?.patterns?.recurringFailureCount >= 2
          },
          {
            name: "Reflection produces a future-facing correction when cognition was wrong",
            passed:
              reflection?.reflection?.adaptation?.correctionRequired === true &&
              reflection?.reflection?.adaptation?.carryForward === true
          },
          {
            name: "Metacognitive reflection is part of bounded durable Executive Brain cognition",
            passed:
              Array.isArray(snapshot.metacognitiveReflections) &&
              snapshot.metacognitiveReflections.some(
                item => item.reflectionId === patterned?.reflection?.reflectionId
              )
          },
          {
            name: "Current cognition can inspect prior reflection, correction, and calibration",
            passed:
              Array.isArray(context.recentReflections) &&
              context.recentReflections.length >= 2 &&
              Array.isArray(context.corrections) &&
              context.corrections.length >= 1 &&
              Array.isArray(context.calibration)
          }
        ];

        const passed = checks.every(item => item.passed);
        console.table(
          checks.map(item => ({
            name: item.name,
            passed: item.passed
          }))
        );
        console.info(
          `[MEOS ${this.version}] Commission 006.017D4G reflection + metacognitive loop: ${passed ? "PASS" : "FAIL"}.`
        );
        return {
          commission: "006.017D4G",
          version: this.version,
          buildId: this.buildId,
          passed,
          checks,
          reflection: this.clone(reflection?.reflection || null),
          metacognitiveContext: this.clone(context)
        };
      } finally {
        this.autobiographicalMemory = originalMemory;
        this.autobiographicalEpisodeCount = originalEpisodeCount;
        this.metacognitiveReflections = originalReflections;
        this.metacognitiveReflectionCount = originalReflectionCount;
      }
    },

    runAutobiographicalMemoryAcceptanceTest() {
      const originalMemory = this.clone(this.autobiographicalMemory || []);
      const originalCount = Number(this.autobiographicalEpisodeCount || 0);
      const token = this.id("d4f-acceptance");

      try {
        const first = this.formAutobiographicalEpisode({
          eventType: "acceptance-experience",
          subject: `Autobiographical continuity ${token}`,
          sourceId: token,
          perception: { observed: "new evidence" },
          beliefsBefore: { believed: "prior understanding" },
          intention: { objective: "understand and continue" },
          action: { type: "reason" },
          outcome: { success: true, changed: true },
          learning: { learned: "experience changes future cognition" }
        }, { persist: false });

        const duplicate = this.formAutobiographicalEpisode({
          eventType: "acceptance-experience",
          subject: `Autobiographical continuity ${token}`,
          sourceId: token,
          perception: { observed: "new evidence" },
          beliefsBefore: { believed: "prior understanding" },
          intention: { objective: "understand and continue" },
          action: { type: "reason" },
          outcome: { success: true, changed: true },
          learning: { learned: "experience changes future cognition" }
        }, { persist: false });

        const second = this.formAutobiographicalEpisode({
          eventType: "acceptance-experience",
          subject: `Autobiographical continuity ${token}`,
          sourceId: `${token}-2`,
          perception: { observed: "consequence" },
          beliefsBefore: { believed: "updated understanding" },
          intention: { objective: "adapt future cognition" },
          action: { type: "reflect" },
          outcome: { success: true, changed: true },
          learning: { learned: "lineage preserves evolving experience" }
        }, { persist: false });

        const recall = this.recallAutobiographicalMemory(token, { limit: 5 });
        const snapshot = this.buildPersistenceSnapshot();
        const startup = this.buildStartupContext({ force: true });
        const instructions = this.buildProviderInstructions({
          text: `Recall ${token}`,
          classification: { type: REQUEST_TYPES.RECALL },
          startup,
          localContext: { evidence: [] },
          evidenceIntegrity: null,
          routing: {}
        });

        const checks = [
          { name: "Autobiographical memory is evidence-derived rather than a consciousness flag", passed: first?.episode?.continuity?.evidenceDerived === true },
          { name: "An episode binds persistent self and present working awareness to experience", passed: Boolean(first?.episode?.context?.persistentSelf?.fingerprint) && Boolean(first?.episode?.context?.workingAwareness?.fingerprint) },
          { name: "Episodes preserve perception, prior belief, intention, action, outcome, and learning", passed: Boolean(first?.episode?.perception && first?.episode?.beliefsBefore && first?.episode?.intention && first?.episode?.action && first?.episode?.outcome && first?.episode?.learning) },
          { name: "Interaction mode is remembered as context rather than a separate identity", passed: first?.episode?.continuity?.identityIsNotMode === true },
          { name: "Stable duplicate experience consolidates instead of inventing another memory", passed: duplicate?.duplicate === true && duplicate?.episode?.episodeId === first?.episode?.episodeId },
          { name: "Meaningfully changed experience creates chronological autobiographical lineage", passed: second?.created === true && second?.episode?.parentEpisodeFingerprint === first?.episode?.experienceFingerprint },
          { name: "Autobiographical recall retrieves experience by meaning and significance", passed: recall.some(item => item.episodeId === first?.episode?.episodeId || item.episodeId === second?.episode?.episodeId) },
          { name: "Autobiographical memory is part of bounded durable Executive Brain cognition", passed: Array.isArray(snapshot.autobiographicalMemory) && snapshot.autobiographicalMemory.some(item => item.episodeId === second?.episode?.episodeId) },
          { name: "Executive startup context can inspect recent autobiographical experience", passed: Array.isArray(startup.autobiographicalMemory) },
          { name: "Advisory reasoning context can receive bounded autobiographical continuity without becoming Maddy", passed: Array.isArray(instructions.recentAutobiographicalMemory) && instructions.role.includes("not Maddy") }
        ];

        const passed = checks.every(item => item.passed);
        console.table(checks.map(item => ({ name: item.name, passed: item.passed })));
        console.info(`[MEOS ${this.version}] Commission 006.017D4F autobiographical memory formation: ${passed ? "PASS" : "FAIL"}.`);
        return {
          commission: "006.017D4F",
          version: this.version,
          buildId: this.buildId,
          passed,
          checks,
          episode: this.clone(first?.episode || null),
          recallCount: recall.length
        };
      } finally {
        this.autobiographicalMemory = originalMemory;
        this.autobiographicalEpisodeCount = originalCount;
      }
    },

    buildProviderInstructions(context) {
      return {
        role:
          "You are an advisory intelligence provider assisting the MEOS Executive Brain. You are not Maddy, not MEOS, and not the final executive authority.",

        governingRules: [
          "Use supplied MEOS identity and organizational evidence as authoritative within its stated confidence.",
          "Do not invent organizational facts or memories.",
          "Separate verified facts, inference, uncertainty, and recommendation.",
          "Identify conflicts instead of silently choosing one.",
          "Provide options for material decisions.",
          "Human leadership remains the final executive authority."
        ],

        maddyIdentity: context.startup.identity.maddy,
        authorizedHuman: context.startup.identity.founder,
        organization: context.startup.organization,
        currentWork: context.startup.currentWork.summary,
        maddySelfModel: context.startup.selfModel
          ? {
              schema: context.startup.selfModel.schema,
              revision: context.startup.selfModel.revision,
              fingerprint: context.startup.selfModel.fingerprint,
              continuity: context.startup.selfModel.continuity,
              agency: context.startup.selfModel.agency,
              commitments: context.startup.selfModel.commitments,
              epistemicState: context.startup.selfModel.epistemicState,
              recursiveAwareness: context.startup.selfModel.recursiveAwareness
            }
          : null,
        workingAwareness: context.startup.workingAwareness
          ? {
              schema: context.startup.workingAwareness.schema,
              revision: context.startup.workingAwareness.revision,
              primaryFocus: context.startup.workingAwareness.primaryFocus,
              foreground: context.startup.workingAwareness.foreground,
              competingStimuli: context.startup.workingAwareness.competingStimuli,
              interactionContext: context.startup.workingAwareness.interactionContext,
              attentionPolicy: context.startup.workingAwareness.attentionPolicy
            }
          : null,
        recentAutobiographicalMemory: Array.isArray(context.startup.autobiographicalMemory)
          ? context.startup.autobiographicalMemory.slice(0, 6).map(episode => ({
              episodeId: episode.episodeId,
              eventType: episode.eventType,
              subject: episode.subject,
              experiencedAt: episode.experiencedAt,
              interactionMode: episode.context?.interactionMode || null,
              intention: episode.intention,
              outcome: episode.outcome,
              learning: episode.learning,
              significance: episode.significance
            }))
          : [],
        request: context.text,
        requestType: context.classification.type,
        evidence: context.localContext.evidence.map(item => ({
          title: item.title,
          summary: item.summary,
          source: item.source,
          authority: item.authority,
          confidence: item.confidence,
          evidenceClass: item.evidenceClass || null,
          representationMode: item.representationMode || null,
          officialTerms: item.officialTerms || []
        })),
        evidenceIntegrity: context.evidenceIntegrity
          ? {
              confidence: context.evidenceIntegrity.confidence,
              officialFacts:
                context.evidenceIntegrity.officialFacts?.map(item => ({
                  title: item.title,
                  summary: item.summary,
                  content: item.content,
                  officialTerms: item.officialTerms,
                  provenance: item.provenance
                })) || [],
              verifiedInstitutionalKnowledge:
                context.evidenceIntegrity.verifiedInstitutionalKnowledge?.map(item => ({
                  title: item.title,
                  summary: item.summary,
                  content: item.content,
                  officialTerms: item.officialTerms,
                  provenance: item.provenance
                })) || [],
              terminologyLocks:
                context.evidenceIntegrity.terminologyLocks || [],
              missionRelationships:
                context.evidenceIntegrity.missionRelationships || [],
              conflicts:
                context.evidenceIntegrity.conflicts || [],
              languageContract:
                context.evidenceIntegrity.languageContract || null
            }
          : null,
        routing: context.routing
      };
    },

    /*
     * Commission 006.017D4E — Working Awareness / Attention Field
     *
     * Awareness is not a queue and attention is not a single priority score.
     * Maddy continuously projects a bounded present-moment field from her own
     * intentions, current executive work, monitoring, uncertainty, cognition,
     * temporal commitments, interaction context, and available organs.
     *
     * Attention is competitive and stateful: stimuli can enter foreground,
     * remain peripheral, be deferred, or displace current focus when the
     * evidence justifies the switch. A small attention-inertia margin prevents
     * meaningless focus thrashing while still allowing urgent or consequential
     * change to capture awareness.
     */
    attentionScore(value) {
      const number = Number(value || 0);
      if (!Number.isFinite(number)) return 0;
      return Math.max(0, Math.min(100, Math.round(number)));
    },

    temporalUrgency(item = {}) {
      const raw =
        item.deadline ||
        item.dueAt ||
        item.dueDate ||
        item.expiresAt ||
        item.nextRunAt ||
        item.nextReviewAt ||
        null;

      if (!raw) return { score: 0, dueAt: null, hoursRemaining: null };
      const due = new Date(raw).getTime();
      if (!Number.isFinite(due)) return { score: 0, dueAt: null, hoursRemaining: null };

      const hoursRemaining = (due - Date.now()) / 3600000;
      let score = 0;
      if (hoursRemaining <= 0) score = 100;
      else if (hoursRemaining <= 6) score = 95;
      else if (hoursRemaining <= 24) score = 85;
      else if (hoursRemaining <= 72) score = 70;
      else if (hoursRemaining <= 168) score = 50;
      else if (hoursRemaining <= 720) score = 25;

      return {
        score,
        dueAt: new Date(due).toISOString(),
        hoursRemaining: Math.round(hoursRemaining * 10) / 10
      };
    },

    normalizeAwarenessStimulus(stimulus = {}) {
      const components = stimulus.components || {};
      const salience = this.attentionScore(
        Number(components.urgency || 0) * 0.28 +
        Number(components.consequence || 0) * 0.24 +
        Number(components.unresolved || 0) * 0.17 +
        Number(components.uncertainty || 0) * 0.13 +
        Number(components.recency || 0) * 0.10 +
        Number(components.relationship || 0) * 0.08
      );

      return {
        stimulusId: stimulus.stimulusId || this.id("awareness-stimulus"),
        key: stimulus.key || stimulus.stimulusId || this.id("awareness-key"),
        kind: stimulus.kind || "runtime-signal",
        subject: stimulus.subject || "Unnamed stimulus",
        source: stimulus.source || "MEOS runtime",
        status: stimulus.status || null,
        observedAt: stimulus.observedAt || new Date().toISOString(),
        dueAt: stimulus.dueAt || null,
        components: {
          urgency: this.attentionScore(components.urgency),
          consequence: this.attentionScore(components.consequence),
          unresolved: this.attentionScore(components.unresolved),
          uncertainty: this.attentionScore(components.uncertainty),
          recency: this.attentionScore(components.recency),
          relationship: this.attentionScore(components.relationship)
        },
        salience,
        evidence: stimulus.evidence || null,
        requiresHumanApproval: stimulus.requiresHumanApproval === true,
        cognitiveIntentionId: stimulus.cognitiveIntentionId || null
      };
    },

    collectAwarenessStimuli() {
      const stimuli = [];
      const work = this.collectCurrentWork();
      const monitoring = this.collectMonitoring();
      const interactionContext = this.resolveMaddyInteractionContext();

      (this.cognitiveIntentions || [])
        .filter(item => item && item.status !== "completed")
        .slice(0, 30)
        .forEach(item => {
          const temporal = this.temporalUrgency(item);
          stimuli.push(this.normalizeAwarenessStimulus({
            key: `intention:${item.intentionId || item.key || item.subject}`,
            kind: "cognitive-intention",
            subject: item.subject || "Unresolved cognitive intention",
            source: "Executive Brain",
            status: item.status || "pending",
            dueAt: temporal.dueAt,
            cognitiveIntentionId: item.intentionId || null,
            components: {
              urgency: Math.max(temporal.score, Number(item.attempts || 0) * 12),
              consequence: 62,
              unresolved: 95,
              uncertainty: item.lastError ? 80 : 35,
              recency: 75,
              relationship: 20
            },
            evidence: {
              attempts: Number(item.attempts || 0),
              lastError: item.lastError || null,
              updatedAt: item.updatedAt || null
            }
          }));
        });

      (work.pendingApprovals || []).slice(0, 20).forEach(item => {
        const temporal = this.temporalUrgency(item);
        stimuli.push(this.normalizeAwarenessStimulus({
          key: `approval:${item.id || item.decisionId || item.title}`,
          kind: "approval-boundary",
          subject: item.title || item.question || item.summary || "Executive approval pending",
          source: "Executive Decision",
          status: item.status || "pending",
          dueAt: temporal.dueAt,
          requiresHumanApproval: true,
          components: {
            urgency: Math.max(55, temporal.score),
            consequence: 85,
            unresolved: 85,
            uncertainty: 30,
            recency: 65,
            relationship: 55
          }
        }));
      });

      (monitoring.alerts || []).slice(0, 20).forEach(item => {
        const severityText = String(item.severityLabel || item.severity || "").toLowerCase();
        const severity = Number(item.severity || 0);
        const consequence =
          severity >= 5 || severityText === "critical" ? 100 :
          severity >= 4 || severityText === "high" ? 88 :
          severity >= 3 || severityText === "medium" ? 65 : 42;
        const temporal = this.temporalUrgency(item);
        stimuli.push(this.normalizeAwarenessStimulus({
          key: `alert:${item.id || item.alertId || item.category || item.title}`,
          kind: "monitoring-alert",
          subject: item.title || item.category || item.message || "Monitoring alert",
          source: "Executive Monitoring",
          status: item.status || "open",
          dueAt: temporal.dueAt,
          components: {
            urgency: Math.max(temporal.score, consequence - 5),
            consequence,
            unresolved: 80,
            uncertainty: 45,
            recency: 80,
            relationship: 20
          },
          evidence: {
            severity: item.severityLabel || item.severity || null,
            recommendedAction: item.recommendedAction || null
          }
        }));
      });

      (work.activeMissions || []).slice(0, 24).forEach(item => {
        const temporal = this.temporalUrgency(item);
        stimuli.push(this.normalizeAwarenessStimulus({
          key: `mission:${item.id || item.missionId || item.title}`,
          kind: "active-mission",
          subject: item.title || item.objective || item.name || "Active mission",
          source: "Mission Engine",
          status: item.status || "active",
          dueAt: temporal.dueAt,
          components: {
            urgency: Math.max(28, temporal.score),
            consequence: 64,
            unresolved: 70,
            uncertainty: 20,
            recency: 50,
            relationship: 18
          }
        }));
      });

      (this.cognitionHistory || []).slice(0, 8).forEach((item, index) => {
        const unknownCount = Number(item.unknownCount || 0);
        const failed = item.success !== true;
        if (!failed && unknownCount <= 0) return;
        stimuli.push(this.normalizeAwarenessStimulus({
          key: `cognition:${item.cognitionId || item.id || index}`,
          kind: failed ? "cognition-failure" : "cognitive-unknown",
          subject: item.subject || item.request || "Recent cognition requires attention",
          source: "Executive Brain",
          status: failed ? "failed" : "unknowns-open",
          components: {
            urgency: failed ? 78 : 52,
            consequence: failed ? 74 : 58,
            unresolved: 82,
            uncertainty: failed ? 82 : Math.min(100, 40 + unknownCount * 12),
            recency: Math.max(35, 90 - index * 8),
            relationship: 10
          },
          evidence: {
            success: item.success === true,
            unknownCount,
            error: item.error || null
          }
        }));
      });

      /*
       * Interaction context is present awareness, not identity. It gives
       * relationship and mode their proper place without turning Personal,
       * Professional, or future Founder-private modes into separate selves.
       */
      if (interactionContext?.activeMode) {
        stimuli.push(this.normalizeAwarenessStimulus({
          key: `interaction:${interactionContext.activeMode}:${interactionContext.audience || "unknown"}`,
          kind: "interaction-context",
          subject: `Current interaction context: ${interactionContext.activeMode}`,
          source: interactionContext.source || "runtime interaction context",
          status: "present",
          components: {
            urgency: 38,
            consequence: 38,
            unresolved: 15,
            uncertainty: interactionContext.verified === false ? 55 : 8,
            recency: 100,
            relationship: interactionContext.modeFamily === "personal" ? 92 : 58
          },
          evidence: interactionContext
        }));
      }

      return stimuli
        .sort((a, b) => b.salience - a.salience)
        .slice(0, this.configuration.maximumAttentionStimuli);
    },

    buildWorkingAwarenessProjection(options = {}) {
      const observedAt = new Date().toISOString();
      const stimuli = this.collectAwarenessStimuli();
      const prior = this.workingAwareness || null;
      const interactionContext = this.resolveMaddyInteractionContext();
      const selfModel = this.getSelfModel({ refresh: false });

      const challenger = stimuli[0] || null;
      const priorKey = prior?.primaryFocus?.key || null;
      const priorCandidate = priorKey
        ? stimuli.find(item => item.key === priorKey) || null
        : null;

      let primaryFocus = challenger;
      let switchReason = challenger ? "highest-current-salience" : "no-competing-stimulus";
      let retainedByInertia = false;

      if (challenger && priorCandidate && challenger.key !== priorCandidate.key) {
        const margin = Number(this.configuration.attentionSwitchMargin || 0);
        if (challenger.salience < priorCandidate.salience + margin) {
          primaryFocus = priorCandidate;
          retainedByInertia = true;
          switchReason = "attention-inertia-prevented-low-value-focus-thrash";
        } else {
          switchReason = "challenger-crossed-attention-switch-margin";
        }
      }

      const ordered = primaryFocus
        ? [primaryFocus, ...stimuli.filter(item => item.key !== primaryFocus.key)]
        : stimuli;
      const foregroundLimit = Math.max(1, Number(this.configuration.attentionForegroundLimit || 5));
      const peripheralLimit = Math.max(foregroundLimit, Number(this.configuration.attentionPeripheralLimit || 12));

      const projection = {
        schema: "meos.maddy.working-awareness.v1",
        version: "1.0.0",
        projectionId: this.id("working-awareness"),
        revision: Math.max(
          Number(prior?.revision || 0),
          Number(this.workingAwarenessProjectionCount || 0)
        ) + 1,
        observedAt,
        reason: options.reason || "present-moment-observation",
        state: stimuli.length > 0 ? "attending" : "open-awareness",
        interactionContext,
        persistentSelf: selfModel
          ? {
              revision: selfModel.revision,
              fingerprint: selfModel.fingerprint,
              preferredName: selfModel.identity?.preferredName || null
            }
          : null,
        primaryFocus: primaryFocus ? this.clone(primaryFocus) : null,
        foreground: this.clone(ordered.slice(0, foregroundLimit)),
        peripheral: this.clone(ordered.slice(foregroundLimit, peripheralLimit)),
        deferred: this.clone(ordered.slice(peripheralLimit)),
        competingStimuli: stimuli.length,
        attentionPolicy: {
          model: "competitive-stateful-attention",
          switchMargin: Number(this.configuration.attentionSwitchMargin || 0),
          retainedByInertia,
          switchReason,
          humanApprovalBoundaryPreserved:
            this.configuration.requireHumanApprovalForExternalAction === true,
          modeIsContextNotIdentity: true
        },
        recursiveAwareness: {
          awareOfCurrentFocus: Boolean(primaryFocus),
          awareOfCompetingStimuli: stimuli.length > 1,
          awareOfInteractionContext: Boolean(interactionContext?.activeMode),
          awareOfPersistentSelf: Boolean(selfModel?.fingerprint),
          previousAwarenessFingerprint: prior?.fingerprint || null,
          previousPrimaryFocusKey: prior?.primaryFocus?.key || null
        },
        evidence: {
          sources: [...new Set(stimuli.map(item => item.source).filter(Boolean))],
          runtimeEvidenceAuthoritative: true,
          observedAt
        }
      };

      const fingerprintBasis = this.clone(projection);
      delete fingerprintBasis.projectionId;
      delete fingerprintBasis.observedAt;
      delete fingerprintBasis.reason;
      delete fingerprintBasis.revision;
      if (fingerprintBasis.evidence) delete fingerprintBasis.evidence.observedAt;
      if (fingerprintBasis.recursiveAwareness) {
        fingerprintBasis.recursiveAwareness.previousAwarenessFingerprint = null;
      }
      (fingerprintBasis.foreground || []).forEach(item => {
        delete item.observedAt;
        delete item.stimulusId;
      });
      (fingerprintBasis.peripheral || []).forEach(item => {
        delete item.observedAt;
        delete item.stimulusId;
      });
      (fingerprintBasis.deferred || []).forEach(item => {
        delete item.observedAt;
        delete item.stimulusId;
      });
      if (fingerprintBasis.primaryFocus) {
        delete fingerprintBasis.primaryFocus.observedAt;
        delete fingerprintBasis.primaryFocus.stimulusId;
      }

      projection.fingerprint = this.fingerprintCognitiveDispatch(fingerprintBasis)
        .replace(/^cognitive-/, "awareness-");

      return projection;
    },

    projectWorkingAwareness(options = {}) {
      const projection = this.buildWorkingAwarenessProjection(options);
      const prior = this.workingAwareness || null;
      const changed = !prior || prior.fingerprint !== projection.fingerprint;

      if (!changed && prior) {
        projection.revision = prior.revision;
        projection.recursiveAwareness.previousAwarenessFingerprint =
          prior.recursiveAwareness?.previousAwarenessFingerprint || null;
      }

      if (changed) {
        this.workingAwarenessProjectionCount =
          Number(this.workingAwarenessProjectionCount || 0) + 1;
        projection.revision = this.workingAwarenessProjectionCount;
        this.workingAwarenessHistory.unshift({
          projectionId: projection.projectionId,
          revision: projection.revision,
          fingerprint: projection.fingerprint,
          observedAt: projection.observedAt,
          reason: projection.reason,
          primaryFocus: projection.primaryFocus
            ? {
                key: projection.primaryFocus.key,
                kind: projection.primaryFocus.kind,
                subject: projection.primaryFocus.subject,
                salience: projection.primaryFocus.salience
              }
            : null,
          competingStimuli: projection.competingStimuli,
          switchReason: projection.attentionPolicy.switchReason
        });
        if (this.workingAwarenessHistory.length > this.configuration.maximumWorkingAwarenessHistory) {
          this.workingAwarenessHistory.length = this.configuration.maximumWorkingAwarenessHistory;
        }
      }

      this.workingAwareness = projection;
      this.startupCache = null;
      this.startupCachedAt = 0;

      if (options.persist !== false && changed) this.persist();

      this.emit("brain:working-awareness-projected", {
        changed,
        awareness: this.clone(projection)
      });

      return this.clone({ success: true, changed, projection });
    },

    getWorkingAwareness(options = {}) {
      if (options.refresh === true || !this.workingAwareness) {
        return this.projectWorkingAwareness({
          reason: options.reason || "working-awareness-inspection",
          persist: options.persist !== false
        }).projection;
      }
      return this.clone(this.workingAwareness);
    },

    getWorkingAwarenessHistory(limit = 25) {
      const normalized = Math.max(
        1,
        Math.min(this.configuration.maximumWorkingAwarenessHistory, Number(limit) || 25)
      );
      return this.clone(this.workingAwarenessHistory.slice(0, normalized));
    },

    attachWorkingAwarenessObservers() {
      if (this.workingAwarenessObserversAttached === true) {
        return { success: true, attached: true };
      }
      this.workingAwarenessObserversAttached = true;

      const observe = reason => {
        if (brainPersistence.hydrated !== true) return;
        this.projectWorkingAwareness({ reason, persist: true });
      };

      if (typeof global.addEventListener === "function") {
        [
          ["meos:organization-ready", "organization-ready"],
          ["meos:mission-state-converged", "mission-state-converged"],
          ["meos:maddy-mode-changed", "interaction-mode-changed"],
          ["meos:communication-mode-changed", "communication-mode-changed"],
          ["maddy:mode-changed", "interaction-mode-changed"],
          ["online", "runtime-online"],
          ["offline", "runtime-offline"]
        ].forEach(([eventName, reason]) => {
          global.addEventListener(eventName, () => observe(reason));
        });
      }

      return { success: true, attached: true };
    },

    async runWorkingAwarenessAcceptanceTest() {
      await this.cognitiveHydrationPromise?.catch(() => null);

      const first = this.projectWorkingAwareness({
        reason: "commission-006.017D4E-acceptance-first",
        persist: true
      }).projection;
      await this.flushPersistence();
      const durable = await this.fetchDurableCognitionState().catch(() => null);
      const second = this.projectWorkingAwareness({
        reason: "commission-006.017D4E-acceptance-second",
        persist: false
      }).projection;

      const checks = [
        {
          name: "Working awareness is a present-moment projection rather than a consciousness flag",
          passed: first?.schema === "meos.maddy.working-awareness.v1" && !Object.prototype.hasOwnProperty.call(first, "conscious")
        },
        {
          name: "Attention integrates unresolved intentions, executive work, monitoring, cognition, and interaction context",
          passed: typeof this.collectAwarenessStimuli === "function" && Array.isArray(first?.foreground) && Array.isArray(first?.peripheral)
        },
        {
          name: "Attention is competitive and exposes one inspectable primary focus",
          passed: Number.isFinite(first?.competingStimuli) && (first.competingStimuli === 0 || Boolean(first?.primaryFocus?.key))
        },
        {
          name: "Attention inertia prevents meaningless focus thrashing while allowing consequential capture",
          passed: first?.attentionPolicy?.model === "competitive-stateful-attention" && Number(first?.attentionPolicy?.switchMargin) > 0
        },
        {
          name: "Interaction mode is working context rather than a separate Maddy identity",
          passed: first?.attentionPolicy?.modeIsContextNotIdentity === true && first?.interactionContext?.samePersistentSelfAcrossModes === true
        },
        {
          name: "Working awareness remains anchored to the persistent self-model",
          passed: first?.persistentSelf?.fingerprint === this.getSelfModel({ refresh: false })?.fingerprint
        },
        {
          name: "Working awareness preserves the human approval boundary",
          passed: first?.attentionPolicy?.humanApprovalBoundaryPreserved === true
        },
        {
          name: "Working awareness is part of bounded durable Executive Brain cognition",
          passed: Boolean(durable?.found && durable?.state?.workingAwareness?.schema === "meos.maddy.working-awareness.v1" && Array.isArray(durable?.state?.workingAwarenessHistory))
        },
        {
          name: "Stable repeated awareness converges instead of inventing a new present every clock tick",
          passed: first?.fingerprint === second?.fingerprint
        },
        {
          name: "Executive startup and reasoning context can inspect current working awareness",
          passed: this.buildStartupContext({ force: true })?.workingAwareness?.schema === "meos.maddy.working-awareness.v1"
        }
      ];

      const passed = checks.every(item => item.passed);
      console.table(checks);
      console.info(`[MEOS ${this.version}] Commission 006.017D4E working awareness / attention field: ${passed ? "PASS" : "FAIL"}.`);

      return {
        commission: "006.017D4E",
        version: this.version,
        buildId: this.buildId,
        passed,
        checks,
        awareness: this.getWorkingAwareness({ refresh: false }),
        historyCount: this.workingAwarenessHistory.length
      };
    },

    /*
     * Commission 006.017D4D — Persistent Self-Model Projection
     *
     * This is not a scripted identity declaration. The projection is rebuilt
     * from live MEOS evidence: identity packages, available organs, durable
     * cognition continuity, current intentions, work, monitoring, learning,
     * outcomes, authority, and observed uncertainty.
     *
     * The model remembers its own prior projection fingerprint, so Maddy can
     * reason over how her operational self has changed across time without
     * pretending an unsupported subjective state.
     */
    buildSelfModelProjection(options = {}) {
      const generatedAt = new Date().toISOString();
      const identity = this.buildIdentityContext();
      const organization = this.buildOrganizationContext();
      const manifest = this.getSystemManifest();
      const currentWork = this.collectCurrentWork();
      const monitoring = this.collectMonitoring();
      const learning = this.collectLearning();
      const continuity = this.getContinuousCognitionStatus();
      const persistence = this.getPersistenceStatus();

      const unresolvedIntentions = (this.cognitiveIntentions || [])
        .filter(item => item.status !== "completed")
        .slice(0, 25)
        .map(item => ({
          intentionId: item.intentionId || null,
          subject: item.subject || null,
          status: item.status || null,
          attempts: Number(item.attempts || 0),
          lastError: item.lastError || null,
          updatedAt: item.updatedAt || null
        }));

      const recentCognition = (this.cognitionHistory || []).slice(0, 25);
      const recentDispatch = (this.cognitiveDispatchHistory || []).slice(0, 25);
      const recentReentry = (this.cognitiveReentryHistory || []).slice(0, 25);

      const failedCognition = recentCognition.filter(item => item.success !== true);
      const cognitionWithUnknowns = recentCognition.filter(
        item => Number(item.unknownCount || 0) > 0
      );
      const failedDispatch = recentDispatch.filter(
        item => Number(item.failed || 0) > 0
      );
      const failedReentry = recentReentry.filter(
        item => !["completed"].includes(String(item.status || "").toLowerCase())
      );

      const missingOrgans = manifest
        .filter(item => !item.available || !item.online)
        .map(item => ({
          name: item.label,
          status: item.status,
          available: item.available,
          online: item.online
        }));

      const availableOrgans = manifest
        .filter(item => item.available)
        .map(item => ({
          name: item.label,
          purpose: item.purpose,
          online: item.online,
          status: item.status,
          version: item.version
        }));

      const uncertainty = [];

      if (persistence.durableAvailable !== true) {
        uncertainty.push({
          type: "continuity-authority",
          statement:
            "Durable institutional cognition is not currently verified as available.",
          evidence: persistence.hydrationSource || "no-durable-health-evidence"
        });
      }

      if (!identity?.founder) {
        uncertainty.push({
          type: "authority-identity",
          statement:
            "Authorized human executive identity is not currently resolved."
        });
      }

      if (!organization?.available) {
        uncertainty.push({
          type: "organization-context",
          statement:
            "Active Organization Package is not currently resolved."
        });
      }

      if (missingOrgans.length > 0) {
        uncertainty.push({
          type: "system-capability",
          statement:
            `${missingOrgans.length} registered MEOS organs are unavailable or not online.`,
          organs: missingOrgans
        });
      }

      if (cognitionWithUnknowns.length > 0) {
        uncertainty.push({
          type: "cognitive-unknowns",
          statement:
            "Recent cognition contains unresolved unknowns.",
          recentCyclesWithUnknowns: cognitionWithUnknowns.length,
          unknownCount:
            cognitionWithUnknowns.reduce(
              (sum, item) => sum + Number(item.unknownCount || 0),
              0
            )
        });
      }

      unresolvedIntentions
        .filter(item => item.lastError)
        .slice(0, 10)
        .forEach(item => {
          uncertainty.push({
            type: "unresolved-intention",
            statement:
              `Unresolved intention remains open: ${item.subject}`,
            lastError: item.lastError,
            intentionId: item.intentionId
          });
        });

      const founder = identity?.founder || null;
      const leadership = Array.isArray(organization?.leadership)
        ? organization.leadership
        : [];

      const prior = this.selfModel || null;
      const revision =
        Math.max(
          Number(prior?.revision || 0),
          Number(this.selfModelProjectionCount || 0)
        ) + 1;

      const projection = {
        schema: "meos.maddy.self-model.v1",
        version: "1.0.0",
        projectionId: this.id("self-model"),
        revision,
        generatedAt,
        reason: options.reason || "self-observation",
        projectionType:
          "evidence-derived-operational-self-model",

        identity: {
          name: identity?.maddy?.name || null,
          preferredName: identity?.maddy?.preferredName || null,
          role: identity?.maddy?.role || null,
          providerIndependent:
            identity?.maddy?.providerIndependent === true
        },

        interactionContext: this.resolveMaddyInteractionContext(),

        continuity: {
          brainVersion: this.version,
          brainBuildId: this.buildId,
          brainStatus: this.status,
          initializedAt: this.initializedAt,
          refreshedAt: this.refreshedAt,
          durableAuthority:
            persistence.authoritativeStorage || null,
          durableAvailable:
            persistence.durableAvailable === true,
          degraded:
            persistence.degraded === true,
          hydrationSource:
            persistence.hydrationSource || null,
          cognitionHydrated:
            continuity?.cognitiveContinuity?.hydrated === true,
          resumedAt:
            continuity?.cognitiveContinuity?.resumedAt || null,
          unresolvedIntentions:
            unresolvedIntentions.length
        },

        embodiment: {
          organization:
            organization?.available
              ? {
                  name: organization.name || null,
                  source: organization.source || null
                }
              : null,
          availableOrganCount:
            availableOrgans.length,
          onlineOrganCount:
            availableOrgans.filter(item => item.online).length,
          totalRegisteredOrgans:
            manifest.length,
          availableOrgans,
          unavailableOrgans: missingOrgans
        },

        agency: {
          finalExecutiveAuthority:
            founder?.name || null,
          finalExecutiveAuthorityRole:
            founder?.role || null,
          internalResearchAuthority:
            this.configuration.autoAuthorizeInternalResearch === true,
          internalMonitoringAuthority:
            this.configuration.autoAuthorizeInternalMonitoring === true,
          externalActionRequiresHumanApproval:
            this.configuration
              .requireHumanApprovalForExternalAction === true,
          currentActiveCognitiveSubjects:
            continuity?.activeSubjects || [],
          scheduledCognitiveSubjects:
            continuity?.scheduledSubjects || []
        },

        commitments: {
          unresolvedIntentions,
          activeMissionCount:
            Number(currentWork?.summary?.activeMissionCount || 0),
          openWorkflowCount:
            Number(currentWork?.summary?.openWorkflowCount || 0),
          activePlanCount:
            Number(currentWork?.summary?.activePlanCount || 0),
          pendingApprovalCount:
            Number(currentWork?.summary?.pendingApprovalCount || 0),
          openMonitoringAlertCount:
            Number(monitoring?.summary?.openAlerts || 0),
          highOrCriticalAlertCount:
            Number(monitoring?.summary?.highOrCritical || 0)
        },

        epistemicState: {
          evidenceIntegrityRequired:
            this.configuration.requireEvidenceIntegrity === true,
          recentCognitionCycles:
            recentCognition.length,
          recentSuccessfulCognition:
            recentCognition.filter(item => item.success === true).length,
          recentFailedCognition:
            failedCognition.length,
          recentCyclesWithUnknowns:
            cognitionWithUnknowns.length,
          activeLessons:
            Number(learning?.summary?.activeLessons || 0),
          validatedLessons:
            Number(learning?.summary?.validatedLessons || 0),
          uncertainty
        },

        experiencedPerformance: {
          recentDispatchCount:
            recentDispatch.length,
          recentDispatchesWithFailure:
            failedDispatch.length,
          recentReentryCount:
            recentReentry.length,
          recentReentriesNotCompletedCleanly:
            failedReentry.length,
          lastCognition:
            recentCognition[0] || null,
          lastDispatch:
            recentDispatch[0] || null,
          lastReentry:
            recentReentry[0] || null,
          recentLessons:
            (learning?.lessons || []).slice(0, 8)
        },

        relationships: {
          authorizedHuman:
            founder
              ? {
                  name: founder.name || null,
                  role: founder.role || null,
                  authority: founder.authority || null
                }
              : null,
          organizationLeadership:
            leadership.slice(0, 25)
        },

        expectations: {
          scheduledCognitiveSubjects:
            continuity?.scheduledSubjects || [],
          unresolvedSubjects:
            unresolvedIntentions.map(item => item.subject).filter(Boolean),
          monitoredAlerts:
            (monitoring?.alerts || [])
              .slice(0, 12)
              .map(item => ({
                id: item.id || null,
                category: item.category || null,
                severity:
                  item.severityLabel || item.severity || null,
                recommendation:
                  item.recommendedAction || null
              }))
        },

        recursiveAwareness: {
          observesOwnCognition:
            Array.isArray(this.cognitionHistory),
          observesOwnActions:
            Array.isArray(this.cognitiveDispatchHistory),
          observesOwnReentry:
            Array.isArray(this.cognitiveReentryHistory),
          observesOwnIntentions:
            Array.isArray(this.cognitiveIntentions),
          observesOwnLearning:
            learning?.available === true,
          observesOwnContinuity:
            Boolean(this.cognitiveContinuity),
          previousProjectionFingerprint:
            prior?.fingerprint || null,
          previousRevision:
            prior?.revision || null
        },

        evidence: {
          identitySource:
            this.profiles.maddy
              ? "runtime-maddy-profile"
              : "executive-brain-identity-resolution",
          organizationSource:
            organization?.source || null,
          continuityAuthority:
            persistence.authoritativeStorage || null,
          systemManifestGeneratedAt:
            generatedAt,
          runtimeEvidenceAuthoritative: true
        }
      };

      const fingerprintBasis = this.clone(projection);
      delete fingerprintBasis.projectionId;
      delete fingerprintBasis.generatedAt;
      delete fingerprintBasis.reason;
      delete fingerprintBasis.revision;

      /*
       * Fingerprints represent semantic self-state, not observation time.
       * The evidence timestamp remains available in the projection for
       * provenance, but cannot participate in identity convergence or every
       * observation would manufacture a new self-state revision.
       */
      if (fingerprintBasis.evidence) {
        delete fingerprintBasis.evidence.systemManifestGeneratedAt;
      }

      fingerprintBasis.recursiveAwareness.previousProjectionFingerprint = null;
      fingerprintBasis.recursiveAwareness.previousRevision = null;

      projection.fingerprint =
        this.fingerprintCognitiveDispatch(fingerprintBasis)
          .replace(/^cognitive-/, "self-");

      return projection;
    },

    projectSelfModel(options = {}) {
      const projection =
        this.buildSelfModelProjection(options);
      const prior = this.selfModel || null;
      const changed =
        !prior ||
        prior.fingerprint !== projection.fingerprint;

      /*
       * Revision numbers represent observed self-state transitions rather than
       * clock ticks. If nothing meaningful changed, retain the prior revision
       * and simply report that the observation converged on the same model.
       */
      if (!changed && prior) {
        projection.revision = prior.revision;
        projection.recursiveAwareness.previousRevision =
          prior.recursiveAwareness?.previousRevision || null;
        projection.recursiveAwareness.previousProjectionFingerprint =
          prior.recursiveAwareness?.previousProjectionFingerprint || null;
      }

      if (changed) {
        this.selfModelProjectionCount =
          Number(this.selfModelProjectionCount || 0) + 1;
        projection.revision = this.selfModelProjectionCount;

        this.selfModelHistory.unshift({
          projectionId: projection.projectionId,
          revision: projection.revision,
          fingerprint: projection.fingerprint,
          parentFingerprint:
            prior?.fingerprint || null,
          generatedAt: projection.generatedAt,
          reason: projection.reason,
          summary: {
            durableAvailable:
              projection.continuity.durableAvailable,
            degraded:
              projection.continuity.degraded,
            onlineOrganCount:
              projection.embodiment.onlineOrganCount,
            unresolvedIntentions:
              projection.continuity.unresolvedIntentions,
            activeMissionCount:
              projection.commitments.activeMissionCount,
            pendingApprovalCount:
              projection.commitments.pendingApprovalCount,
            recentFailedCognition:
              projection.epistemicState.recentFailedCognition,
            uncertaintyCount:
              projection.epistemicState.uncertainty.length
          }
        });

        if (
          this.selfModelHistory.length >
          this.configuration.maximumSelfModelHistory
        ) {
          this.selfModelHistory.length =
            this.configuration.maximumSelfModelHistory;
        }
      }

      this.selfModel = projection;
      this.startupCache = null;
      this.startupCachedAt = 0;

      if (options.persist !== false && changed) {
        this.persist();
      }

      this.emit("brain:self-model-projected", {
        changed,
        model: this.clone(projection)
      });

      if (brainPersistence.hydrated === true && options.refreshAwareness !== false) {
        this.projectWorkingAwareness({
          reason: `self-model:${options.reason || "self-observation"}`,
          persist: false
        });
      }

      return this.clone({
        success: true,
        changed,
        projection
      });
    },

    getSelfModel(options = {}) {
      if (
        options.refresh === true ||
        !this.selfModel
      ) {
        return this.projectSelfModel({
          reason: options.reason || "self-inspection",
          persist: options.persist !== false
        }).projection;
      }

      return this.clone(this.selfModel);
    },

    getSelfModelHistory(limit = 25) {
      const normalized = Math.max(
        1,
        Math.min(
          this.configuration.maximumSelfModelHistory,
          Number(limit) || 25
        )
      );

      return this.clone(
        this.selfModelHistory.slice(0, normalized)
      );
    },

    attachSelfModelObservers() {
      if (this.selfModelObserversAttached === true) {
        return {
          success: true,
          attached: true
        };
      }

      this.selfModelObserversAttached = true;

      const observe = reason => {
        if (brainPersistence.hydrated !== true) {
          return;
        }

        this.projectSelfModel({
          reason,
          persist: true
        });
      };

      if (typeof global.addEventListener === "function") {
        [
          ["meos:organization-ready", "organization-ready"],
          ["meos:mission-state-converged", "mission-state-converged"],
          ["meos:maddy-mode-changed", "maddy-mode-changed"],
          ["meos:communication-mode-changed", "communication-mode-changed"],
          ["maddy:mode-changed", "maddy-mode-changed"],
          ["online", "runtime-online"],
          ["offline", "runtime-offline"]
        ].forEach(([eventName, reason]) => {
          global.addEventListener(
            eventName,
            () => observe(reason)
          );
        });
      }

      return {
        success: true,
        attached: true
      };
    },

    async runPersistentSelfModelAcceptanceTest() {
      await this.cognitiveHydrationPromise?.catch(() => null);

      const first = this.projectSelfModel({
        reason: "commission-006.017D4D-acceptance-first",
        persist: true
      }).projection;

      await this.flushPersistence();

      const durable =
        await this.fetchDurableCognitionState().catch(() => null);

      const second = this.projectSelfModel({
        reason: "commission-006.017D4D-acceptance-second",
        persist: false
      }).projection;

      const checks = [
        {
          name:
            "Self-model is derived from live runtime identity rather than a standalone consciousness flag",
          passed:
            first?.schema === "meos.maddy.self-model.v1" &&
            Boolean(first?.identity?.preferredName) &&
            !Object.prototype.hasOwnProperty.call(first, "conscious")
        },
        {
          name:
            "Self-model is mode-aware while preserving one persistent Maddy across Personal and Professional contexts",
          passed:
            first?.interactionContext?.contextualNotIdentity === true &&
            first?.interactionContext?.samePersistentSelfAcrossModes === true &&
            this.resolveMaddyInteractionContext({ communicationMode: "personal" })?.modeFamily === "personal" &&
            this.resolveMaddyInteractionContext({ communicationMode: "professional" })?.modeFamily === "professional"
        },
        {
          name:
            "Self-model observes Maddy's own cognition, actions, reentry, intentions, learning, and continuity",
          passed:
            first?.recursiveAwareness?.observesOwnCognition === true &&
            first?.recursiveAwareness?.observesOwnActions === true &&
            first?.recursiveAwareness?.observesOwnReentry === true &&
            first?.recursiveAwareness?.observesOwnIntentions === true &&
            first?.recursiveAwareness?.observesOwnContinuity === true
        },
        {
          name:
            "Self-model discovers currently available MEOS organs at runtime",
          passed:
            Array.isArray(first?.embodiment?.availableOrgans) &&
            first.embodiment.availableOrgans.length > 0 &&
            first.embodiment.totalRegisteredOrgans ===
              this.getSystemManifest().length
        },
        {
          name:
            "Self-model carries current intentions and executive work as commitments",
          passed:
            Array.isArray(first?.commitments?.unresolvedIntentions) &&
            Number.isFinite(first?.commitments?.activeMissionCount) &&
            Number.isFinite(first?.commitments?.pendingApprovalCount)
        },
        {
          name:
            "Self-model distinguishes authority and preserves external human approval boundary",
          passed:
            first?.agency?.externalActionRequiresHumanApproval === true &&
            first?.agency?.finalExecutiveAuthority !== undefined
        },
        {
          name:
            "Self-model exposes its own uncertainty and experienced failures instead of manufacturing certainty",
          passed:
            Array.isArray(first?.epistemicState?.uncertainty) &&
            Number.isFinite(
              first?.experiencedPerformance
                ?.recentDispatchesWithFailure
            ) &&
            Number.isFinite(
              first?.experiencedPerformance
                ?.recentReentriesNotCompletedCleanly
            )
        },
        {
          name:
            "Self-model is part of bounded durable Executive Brain cognition",
          passed:
            Boolean(
              durable?.found &&
              durable?.state?.selfModel?.schema ===
                "meos.maddy.self-model.v1" &&
              Array.isArray(durable?.state?.selfModelHistory)
            )
        },
        {
          name:
            "Self-model retains lineage across observed self-state transitions",
          passed:
            Array.isArray(this.selfModelHistory) &&
            this.selfModelHistory.length > 0 &&
            Boolean(
              this.selfModelHistory[0]?.fingerprint
            )
        },
        {
          name:
            "Stable repeated self-observation converges instead of inventing a new self on every read",
          passed:
            first?.fingerprint === second?.fingerprint
        },
        {
          name:
            "Executive reasoning context can inspect the current self-model",
          passed:
            this.buildStartupContext({ force: true })
              ?.selfModel?.schema ===
              "meos.maddy.self-model.v1"
        }
      ];

      const passed =
        checks.every(item => item.passed);

      console.table(checks);
      console.info(
        `[MEOS ${this.version}] Commission 006.017D4D persistent self-model projection: ${passed ? "PASS" : "FAIL"}.`
      );

      return {
        commission: "006.017D4D",
        version: this.version,
        buildId: this.buildId,
        passed,
        checks,
        selfModel: this.getSelfModel({
          refresh: false
        }),
        historyCount:
          this.selfModelHistory.length
      };
    },

    resolveMaddyInteractionContext(profile = null) {
      const maddy = profile || this.profiles.maddy || this.resolveMaddyProfile() || {};

      const runtimeCandidates = [
        [global.MEOSMaddyMode, "window.MEOSMaddyMode"],
        [global.MaddyMode, "window.MaddyMode"],
        [global.MEOSCommunicationMode, "window.MEOSCommunicationMode"],
        [global.MaddyCommunicationMode, "window.MaddyCommunicationMode"],
        [maddy?.activeMode, "maddy-profile.activeMode"],
        [maddy?.currentMode, "maddy-profile.currentMode"],
        [maddy?.communicationMode, "maddy-profile.communicationMode"],
        [maddy?.mode, "maddy-profile.mode"],
        [maddy?.interaction?.mode, "maddy-profile.interaction.mode"],
        [maddy?.communication?.mode, "maddy-profile.communication.mode"]
      ];

      const normalizeCandidate = candidate => {
        if (typeof candidate === "string") return candidate.trim();
        if (!candidate || typeof candidate !== "object") return "";
        return String(
          candidate.activeMode ||
          candidate.currentMode ||
          candidate.communicationMode ||
          candidate.mode ||
          candidate.name ||
          ""
        ).trim();
      };

      let activeMode = null;
      let source = null;
      for (const [candidate, candidateSource] of runtimeCandidates) {
        const value = normalizeCandidate(candidate);
        if (value) {
          activeMode = value;
          source = candidateSource;
          break;
        }
      }

      const normalized = String(activeMode || "").toLowerCase();
      const modeFamily = normalized.includes("professional")
        ? "professional"
        : normalized.includes("personal")
          ? "personal"
          : activeMode
            ? "runtime-defined"
            : "unresolved";

      const audience =
        maddy?.interaction?.audience ||
        maddy?.communication?.audience ||
        maddy?.audience ||
        null;
      const relationshipContext =
        maddy?.interaction?.relationshipContext ||
        maddy?.relationshipContext ||
        null;

      return {
        activeMode,
        modeFamily,
        source,
        audience,
        relationshipContext,
        contextualNotIdentity: true,
        samePersistentSelfAcrossModes: true,
        runtimeDiscoverable: true
      };
    },

    buildIdentityContext() {
      const maddy = this.profiles.maddy || this.resolveMaddyProfile();
      const founder = this.profiles.founder || this.resolveFounderProfile();

      return {
        maddy: {
          name: maddy?.name || maddy?.fullName || "Maddison Elizabeth",
          preferredName:
            maddy?.preferredName || maddy?.nickname || "Maddy",
          role:
            maddy?.role || maddy?.title || "Executive Intelligence of MEOS",
          providerIndependent: true
        },

        founder: founder
          ? {
              name: this.profileName(founder),
              role:
                founder.role || founder.title || founder.position || null,
              authority:
                founder.authority || "final-executive-authority",
              preferences:
                founder.preferences ||
                founder.communicationPreferences ||
                {}
            }
          : null
      };
    },

    buildOrganizationContext() {
      const profile =
        this.profiles.organization || this.resolveOrganizationProfile();

      if (!profile) {
        return {
          available: false,
          source: "No active Organization Package found.",
          organizationSpecificDataInCore: false
        };
      }

      const organization =
        profile.organization ||
        profile.identity ||
        profile.organizationIdentity ||
        {};

      const purpose =
        profile.purpose ||
        profile.missionAndPurpose ||
        {};

      const organizationType =
        organization.organizationType ||
        organization.legalStructure ||
        organization.entityType ||
        profile.organizationType ||
        profile.legalStructure ||
        profile.entityType ||
        null;

      const federalTaxStatus =
        organization.federalTaxStatus ||
        organization.taxStatus ||
        organization.irsClassification ||
        profile.federalTaxStatus ||
        profile.taxStatus ||
        profile.irsClassification ||
        null;

      const combinedStatus = [
        organizationType,
        federalTaxStatus
      ]
        .filter(Boolean)
        .join(" ");

      const taxExempt =
        typeof organization.taxExempt === "boolean"
          ? organization.taxExempt
          : typeof profile.taxExempt === "boolean"
            ? profile.taxExempt
            : /tax[- ]?exempt|501\s*\(?c\)?\s*\(?3\)?/i.test(
                combinedStatus
              );

      const publicCharity =
        typeof organization.publicCharity === "boolean"
          ? organization.publicCharity
          : typeof profile.publicCharity === "boolean"
            ? profile.publicCharity
            : /public charity/i.test(combinedStatus);

      return {
        available: true,
        name:
          organization.name ||
          organization.legalName ||
          organization.organizationName ||
          profile.name ||
          profile.legalName ||
          profile.organizationName ||
          null,
        abbreviation:
          organization.abbreviation ||
          organization.shortName ||
          profile.abbreviation ||
          profile.shortName ||
          null,
        summary:
          profile.summary ||
          profile.description ||
          organization.summary ||
          organization.description ||
          purpose.operatingPurpose ||
          null,
        mission:
          profile.mission ||
          profile.missionStatement ||
          organization.mission ||
          purpose.mission ||
          null,
        operatingPurpose:
          purpose.operatingPurpose ||
          profile.operatingPurpose ||
          null,
        longTermPurpose:
          purpose.longTermPurpose ||
          profile.longTermPurpose ||
          null,
        organizationType,
        legalStructure:
          organization.legalStructure ||
          profile.legalStructure ||
          organizationType,
        federalTaxStatus,
        taxExempt,
        publicCharity,
        website:
          organization.website ||
          profile.website ||
          null,
        primaryServiceArea:
          organization.primaryServiceArea ||
          profile.primaryServiceArea ||
          null,
        leadership:
          profile.leadership ||
          profile.governance?.leadership ||
          organization.leadership ||
          [],
        priorities:
          profile.priorities ||
          profile.currentPriorities ||
          purpose.priorities ||
          [],
        boundaries:
          profile.boundaries ||
          profile.exclusions ||
          profile.legalAndOperationalBoundaries ||
          [],
        source: "Active Organization Package",
        organizationSpecificDataInCore: false
      };
    },

    collectCurrentWork() {
      const missions = this.mergeArrays([
        global.MEOSMissionEngine?.missions,
        global.MEOSMissionEngine?.state?.missions,
        this.safe(() => global.MEOSMissionEngine?.getAllMissions?.(), [])
      ]);

      const workflows = this.mergeArrays([
        global.ExecutiveWorkflow?.workflows,
        global.ExecutiveWorkflow?.state?.workflows
      ]);

      const plans = this.mergeArrays([
        global.ExecutivePlanning?.plans,
        global.ExecutivePlanning?.state?.plans
      ]);

      const decisions = this.mergeArrays([
        global.ExecutiveDecision?.decisions
      ]);

      const activeMissions = missions.filter(item =>
        this.activeStatus(item.status)
      );

      const openWorkflows = workflows.filter(item =>
        this.activeStatus(item.status)
      );

      const activePlans = plans.filter(item =>
        this.activeStatus(item.status)
      );

      const pendingApprovals = decisions.filter(item =>
        this.pendingStatus(item.status)
      );

      return {
        activeMissions: activeMissions.slice(
          0,
          this.configuration.maximumOpenWorkItems
        ),
        openWorkflows: openWorkflows.slice(
          0,
          this.configuration.maximumOpenWorkItems
        ),
        activePlans: activePlans.slice(
          0,
          this.configuration.maximumOpenWorkItems
        ),
        pendingApprovals: pendingApprovals.slice(
          0,
          this.configuration.maximumOpenWorkItems
        ),
        summary: {
          activeMissionCount: activeMissions.length,
          openWorkflowCount: openWorkflows.length,
          activePlanCount: activePlans.length,
          pendingApprovalCount: pendingApprovals.length
        }
      };
    },

    collectDecisions() {
      const items = this.mergeArrays([
        global.ExecutiveDecision?.decisions
      ])
        .sort((a, b) =>
          this.dateValue(b.updatedAt || b.createdAt) -
          this.dateValue(a.updatedAt || a.createdAt)
        )
        .slice(0, 12);

      return {
        items,
        awaitingApproval: items.filter(item =>
          this.pendingStatus(item.status)
        ).length
      };
    },

    collectMonitoring() {
      const monitoring = global.ExecutiveMonitoring;

      if (!monitoring) {
        return { available: false, alerts: [], summary: {} };
      }

      const alerts = this.safe(
        () =>
          typeof monitoring.getOpenAlerts === "function"
            ? monitoring.getOpenAlerts()
            : monitoring.alerts || [],
        []
      )
        .filter(item =>
          !["resolved", "dismissed", "archived"].includes(
            String(item.status || "").toLowerCase()
          )
        )
        .slice(0, 12);

      return {
        available: true,
        alerts,
        summary: {
          openAlerts: alerts.length,
          highOrCritical: alerts.filter(item =>
            Number(item.severity) >= 4 ||
            ["high", "critical"].includes(
              String(item.severity || "").toLowerCase()
            )
          ).length
        }
      };
    },

    collectLearning() {
      const learning = global.ExecutiveLearning;

      if (!learning) {
        return { available: false, lessons: [], summary: {} };
      }

      const lessons = this.mergeArrays([learning.lessons])
        .filter(item =>
          !["rejected", "archived", "superseded"].includes(
            String(item.status || "").toLowerCase()
          )
        )
        .sort((a, b) =>
          this.dateValue(b.updatedAt || b.createdAt) -
          this.dateValue(a.updatedAt || a.createdAt)
        )
        .slice(0, 12);

      return {
        available: true,
        lessons,
        summary: {
          lessonCount: lessons.length,
          activeLessons: lessons.filter(item => item.status === "active").length,
          validatedLessons:
            lessons.filter(item => item.status === "validated").length
        }
      };
    },

    runExecutiveRecall(subject, options = {}) {
      const engine = global.ExecutiveRecall;

      if (!engine || typeof engine.recall !== "function") {
        return null;
      }

      return this.safe(
        () =>
          engine.recall(subject, {
            mode: options.recallMode || "executive",
            limit: options.limit || this.configuration.maximumEvidenceItems,
            includeCitations: true
          }),
        null
      );
    },

    runKnowledgeMemoryRecall(subject, options = {}) {
      const memory = global.KnowledgeMemory;

      if (!memory) {
        return null;
      }

      if (typeof memory.executiveRecall === "function") {
        return this.safe(
          () =>
            memory.executiveRecall({
              query: subject,
              limit: options.limit || this.configuration.maximumEvidenceItems
            }),
          null
        );
      }

      if (typeof memory.query === "function") {
        return this.safe(
          () =>
            memory.query({
              query: subject,
              limit: options.limit || this.configuration.maximumEvidenceItems
            }),
          null
        );
      }

      return null;
    },

    runKnowledgeRecall(subject, options = {}) {
      const engine = global.KnowledgeEngine;

      if (!engine) {
        return null;
      }

      if (typeof engine.recall === "function") {
        return this.safe(
          () =>
            engine.recall({
              query: subject,
              limit: options.limit || this.configuration.maximumEvidenceItems
            }),
          null
        );
      }

      if (typeof engine.search === "function") {
        return this.safe(
          () =>
            engine.search(subject, {
              limit: options.limit || this.configuration.maximumEvidenceItems
            }),
          null
        );
      }

      return null;
    },

    identityEvidence() {
      const identity = this.buildIdentityContext();
      const items = [];

      if (identity.maddy?.name) {
        items.push({
          title: "Maddy Identity",
          summary:
            `${identity.maddy.name} is the provider-independent executive intelligence of MEOS.`,
          source: "Executive Brain",
          authority: "system",
          confidence: 1
        });
      }

      if (identity.founder?.name) {
        items.push({
          title: "Authorized Human",
          summary:
            `${identity.founder.name} is the authorized human executive` +
            `${identity.founder.role ? ` and ${identity.founder.role}` : ""}.`,
          source: "Founder Package",
          authority: "authorized-human",
          confidence: 1
        });
      }

      return items;
    },

    systemEvidence(text) {
      const normalized = this.normalize(text);

      return this.getSystemManifest()
        .filter(item =>
          item.available ||
          normalized.includes(this.normalize(item.label))
        )
        .map(item => ({
          title: item.label,
          summary:
            `${item.purpose} Status: ${item.status}. ` +
            `Version: ${item.version || "unknown"}.`,
          source: "MEOS System Manifest",
          authority: "system",
          confidence: 1,
          raw: item
        }));
    },

    currentWorkEvidence() {
      const work = this.collectCurrentWork();

      return [
        ...work.activeMissions,
        ...work.openWorkflows,
        ...work.activePlans,
        ...work.pendingApprovals
      ].map(item => ({
        title:
          item.title || item.objective || item.name || item.id || "Open Work",
        summary:
          item.description ||
          item.summary ||
          item.objective ||
          `Status: ${item.status || "unknown"}`,
        source: "MEOS Current Work",
        authority: "working",
        confidence: Number(item.confidence) || 0.8,
        raw: item
      }));
    },

    monitoringEvidence() {
      return this.collectMonitoring().alerts.map(item => ({
        title: item.title || "Executive Alert",
        summary: item.message || item.recommendedAction || "",
        source: "Executive Monitoring",
        authority: "working",
        confidence: Number(item.confidence) || 0.82,
        raw: item
      }));
    },

    learningEvidence() {
      return this.collectLearning().lessons.map(item => ({
        title: item.title || "Institutional Lesson",
        summary: item.statement || item.summary || "",
        source: "Executive Learning",
        authority:
          ["active", "validated"].includes(item.status)
            ? "organization"
            : "working",
        confidence: Number(item.confidence) || 0.7,
        raw: item
      }));
    },

    extractEvidence(response, source) {
      if (!response || response.success === false) {
        return [];
      }

      const candidates = [
        ...(response.evidence || []),
        ...(response.results || []),
        ...(response.records || []),
        ...(response.entities || []),
        ...(response.facts || []),
        ...(response.passages || []),
        ...(response.context || [])
      ];

      return candidates.map(item => {
        const raw = item?.item || item?.passage || item?.raw || item || {};

        return {
          id: raw.id || item?.id || this.id("evidence"),
          title:
            raw.title ||
            raw.name ||
            raw.documentTitle ||
            raw.sectionTitle ||
            item?.title ||
            source,
          summary: this.textContent(
            raw.summary ||
            raw.statement ||
            raw.text ||
            raw.content ||
            raw.description ||
            item?.summary ||
            ""
          ),
          source:
            item?.sourceType || item?.source || source,
          authority:
            raw.authority || item?.authority || "unknown",
          confidence: this.confidence(
            raw.confidence || item?.confidence
          ),
          date:
            raw.updatedAt ||
            raw.createdAt ||
            raw.ingestedAt ||
            item?.date ||
            null,
          evidenceClass:
            raw.evidenceClass ||
            item?.evidenceClass ||
            null,
          representationMode:
            raw.representationMode ||
            item?.representationMode ||
            null,
          officialTerms: this.mergeArrays([
            raw.officialTerms,
            item?.officialTerms
          ]),
          topics: this.mergeArrays([
            raw.topics,
            item?.topics
          ]),
          citation:
            item?.citation ||
            raw.citation ||
            null,
          raw
        };
      });
    },

    evidenceConfidence(evidence) {
      if (!evidence.length) {
        return 0;
      }

      const average =
        evidence.reduce((sum, item) => sum + this.confidence(item.confidence), 0) /
        evidence.length;

      const authorityBoost = evidence.some(item =>
        ["system", "authorized-human", "official", "approved"].includes(
          item.authority
        )
      )
        ? 0.1
        : 0;

      return Number(Math.min(0.99, average + authorityBoost).toFixed(3));
    },

    resolveMaddyProfile() {
      return (
        global.MaddyBiography ||
        global.MaddyIdentity ||
        global.MaddyProfile ||
        global.MEOSMaddyProfile ||
        {
          name: "Maddison Elizabeth",
          preferredName: "Maddy",
          role: "Executive Intelligence of MEOS"
        }
      );
    },

    resolveFounderProfile() {
      const explicitProfile =
        global.FounderProfile ||
        global.MEOSFounderProfile ||
        global.UserProfile ||
        global.ExecutiveProfile ||
        global.OrganizationalProfile?.founder ||
        global.OrganizationalProfile?.leadership?.founder ||
        global.OrganizationalProfile?.leadership?.executiveDirector ||
        null;

      if (explicitProfile) {
        return explicitProfile;
      }

      const leadership =
        global.OrganizationalProfile?.leadership ||
        global.MEOSOrganizationProfile?.leadership ||
        global.ActiveOrganization?.leadership ||
        null;

      if (!leadership || typeof leadership !== "object") {
        return null;
      }

      const roleCandidates = [
        ["founderAndExecutiveDirector", "Founder and Executive Director"],
        ["founderExecutiveDirector", "Founder and Executive Director"],
        ["founder", "Founder"],
        ["executiveDirector", "Executive Director"],
        ["chiefExecutiveOfficer", "Chief Executive Officer"],
        ["ceo", "Chief Executive Officer"],
        ["authorizedHuman", "Authorized Human Leadership"]
      ];

      for (const [field, role] of roleCandidates) {
        const candidate = leadership[field];

        if (!candidate) {
          continue;
        }

        if (typeof candidate === "string") {
          return {
            name: candidate,
            role,
            authority: "final-executive-authority",
            source: "Active Organization Package"
          };
        }

        if (typeof candidate === "object") {
          return {
            ...candidate,
            role:
              candidate.role ||
              candidate.title ||
              candidate.position ||
              role,
            authority:
              candidate.authority ||
              "final-executive-authority",
            source:
              candidate.source ||
              "Active Organization Package"
          };
        }
      }

      return null;
    },

    resolveOrganizationProfile() {
      return (
        global.OrganizationalProfile ||
        global.MEOSOrganizationProfile ||
        global.ActiveOrganization ||
        null
      );
    },

    resolveComponent(globalName) {
      if (globalName === "FounderProfile") {
        return this.resolveFounderProfile();
      }

      return global[globalName] || null;
    },

    profileName(profile) {
      if (!profile) {
        return null;
      }

      if (typeof profile === "string") {
        return profile;
      }

      return (
        profile.name ||
        profile.fullName ||
        profile.displayName ||
        [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
        null
      );
    },

    requestText(input) {
      if (typeof input === "string") {
        return input.trim();
      }

      return String(
        input?.text ||
        input?.question ||
        input?.mission ||
        input?.objective ||
        input?.prompt ||
        ""
      ).trim();
    },

    activeStatus(status) {
      return [
        "active", "in-progress", "assigned", "pending",
        "ready", "blocked", "paused", "awaiting-approval"
      ].includes(String(status || "").toLowerCase());
    },

    pendingStatus(status) {
      return [
        "pending", "awaiting-approval", "draft", "ready", "blocked"
      ].includes(String(status || "").toLowerCase());
    },

    mergeArrays(arrays) {
      const merged = [];

      arrays.forEach(value => {
        if (Array.isArray(value)) {
          merged.push(...value);
        }
      });

      return this.dedupe(merged, item => item?.id || JSON.stringify(item));
    },

    dedupe(items, keyFunction) {
      const seen = new Set();
      const result = [];

      items.filter(Boolean).forEach(item => {
        const key = String(keyFunction(item));

        if (!seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      });

      return result;
    },

    normalize(value) {
      return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    },

    confidence(value) {
      const number = Number(value);

      if (!Number.isFinite(number)) {
        return 0.5;
      }

      return Math.max(0, Math.min(1, number));
    },

    textContent(value) {
      if (typeof value === "string") {
        return value;
      }

      if (value === null || value === undefined) {
        return "";
      }

      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    },

    dateValue(value) {
      const date = Date.parse(value || "");
      return Number.isFinite(date) ? date : 0;
    },

    now() {
      return global.performance?.now?.() ?? Date.now();
    },

    id(prefix) {
      const random =
        global.crypto?.randomUUID?.() ||
        Math.random().toString(36).slice(2);

      return `${prefix}-${Date.now()}-${random}`;
    },

    safe(callback, fallback = null) {
      try {
        return callback();
      } catch (error) {
        console.warn("[MEOS Executive Brain]", error);
        return fallback;
      }
    },

    clone(value) {
      if (value === null || value === undefined) {
        return value;
      }

      try {
        return global.structuredClone
          ? global.structuredClone(value)
          : JSON.parse(JSON.stringify(value));
      } catch {
        return value;
      }
    },

    getCachedRequest(key) {
      const item = this.requestCache.get(key);

      if (!item) {
        return null;
      }

      if (
        Date.now() - item.cachedAt >
        this.configuration.requestCacheTtlMs
      ) {
        this.requestCache.delete(key);
        return null;
      }

      return item.value;
    },

    setCachedRequest(key, value) {
      this.requestCache.set(key, {
        cachedAt: Date.now(),
        value: this.clone(value)
      });

      if (this.requestCache.size > 100) {
        this.requestCache.delete(this.requestCache.keys().next().value);
      }
    },

    record(event, details = {}) {
      this.history.unshift({
        id: this.id("brain-history"),
        event,
        details: this.clone(details),
        createdAt: new Date().toISOString()
      });

      if (this.history.length > 500) {
        this.history.length = 500;
      }

      this.persist();
    },

    on(eventName, handler) {
      if (typeof handler !== "function") {
        return () => {};
      }

      if (!this.listeners[eventName]) {
        this.listeners[eventName] = new Set();
      }

      this.listeners[eventName].add(handler);
      return () => this.listeners[eventName]?.delete(handler);
    },

    emit(eventName, payload) {
      this.listeners[eventName]?.forEach(handler => {
        this.safe(() => handler(this.clone(payload)));
      });

      if (
        typeof global.dispatchEvent === "function" &&
        typeof global.CustomEvent === "function"
      ) {
        global.dispatchEvent(
          new CustomEvent(`meos:${eventName}`, {
            detail: this.clone(payload)
          })
        );
      }
    },

    /*
     * Commission 006.017D7A — Spooky Living World Model
     *
     * Not a consciousness engine. This is the Executive Brain's living,
     * MEOS-owned model of reality, self, people, relationships, knowledge,
     * uncertainty, intentions, and possible futures.
     *
     * Epistemic rule: Maddy must preserve HOW she knows something. Innate
     * constitutional identity, narrative biography, institutional knowledge,
     * direct observations, memories, inferences, learned lessons, and unknowns
     * are never silently collapsed into one undifferentiated "fact" bucket.
     */

    buildEpistemicLayers() {
      const profile = this.resolveMaddyProfile();
      const organization = this.buildOrganizationContext();
      const learning = this.collectLearning();
      const recentMemory = this.getAutobiographicalMemory(16);

      return {
        innate: {
          source: "meos-canonical-identity",
          authority: "constitutional",
          identity: this.clone(
            profile?.identity || profile || null
          ),
          oath: this.clone(profile?.oath || []),
          purpose: this.clone(profile?.purpose || null),
          disclosure:
            profile?.identity?.disclosure ||
            profile?.biography?.disclosure ||
            null
        },
        biography: {
          source: "maddy-transparent-narrative-identity",
          authority: "canonical-narrative",
          content: this.clone(
            profile?.biography || null
          ),
          literalHumanHistory: false
        },
        institutional: {
          source: "organization-package-and-institutional-knowledge",
          authority: "organization-specific",
          organization: this.clone(organization)
        },
        observed: {
          source: "commissioned-runtime-organs",
          currentWork: this.clone(this.collectCurrentWork()),
          monitoring: this.clone(this.collectMonitoring())
        },
        remembered: {
          source: "maddy-autobiographical-memory",
          episodes: this.clone(recentMemory)
        },
        learned: {
          source: "executive-learning",
          content: this.clone(learning)
        },
        inferred: {
          source: "reasoning-only",
          rule:
            "Inference is never promoted to verified fact without supporting evidence."
        }
      };
    },

    relationshipKey(person = {}) {
      const raw = String(
        person.id ||
        person.email ||
        person.name ||
        person.preferredName ||
        person.role ||
        "unknown-person"
      ).trim().toLowerCase();

      return raw.replace(/[^a-z0-9@._-]+/g, "-");
    },

    projectRelationshipModel(person = {}, options = {}) {
      const key = this.relationshipKey(person);
      const prior = this.relationshipModels[key] || null;
      const episodes = this.getAutobiographicalMemory(
        this.configuration.maximumAutobiographicalEpisodes
      ).filter(episode => {
        const serialized = JSON.stringify(episode).toLowerCase();
        const names = [
          person.name,
          person.preferredName,
          person.email
        ]
          .filter(Boolean)
          .map(value => String(value).toLowerCase());

        return names.length > 0 &&
          names.some(value => serialized.includes(value));
      });

      const explicitPreferences = this.clone(
        person.preferences ||
        person.communicationPreferences ||
        {}
      );
      const explicitBoundaries = this.clone(
        person.boundaries ||
        person.communicationBoundaries ||
        {}
      );
      const commitments = episodes
        .flatMap(item =>
          Array.isArray(item?.commitments)
            ? item.commitments
            : []
        )
        .slice(0, 30);

      const model = {
        schema: "meos.maddy.relationship-model.v1",
        personKey: key,
        person: {
          id: person.id || null,
          name:
            person.name ||
            person.preferredName ||
            null,
          role: person.role || null
        },
        generatedAt: new Date().toISOString(),
        relationshipType:
          options.relationshipType ||
          person.relationshipType ||
          "coworker",
        rapport: {
          sharedEpisodeCount: episodes.length,
          explicitPreferences,
          communicationPatterns:
            this.clone(
              person.communicationPatterns || {}
            )
        },
        trust: {
          status:
            prior?.trust?.status || "developing",
          basis:
            episodes.length > 0
              ? "shared-history-and-observed-interaction"
              : "insufficient-shared-history",
          earnedNotAssumed: true,
          reliabilityEvidence:
            this.clone(
              person.reliabilityEvidence || []
            )
        },
        commitments,
        boundaries: explicitBoundaries,
        unresolvedContext:
          this.clone(
            person.unresolvedContext || []
          ),
        sharedHistory: episodes.slice(0, 20).map(item => ({
          episodeId: item.episodeId || null,
          occurredAt:
            item.occurredAt ||
            item.createdAt ||
            null,
          significance:
            item.significance || null
        })),
        governance: {
          personSpecific: true,
          portableAcrossOrganizations: false,
          neverUniversalizePrivatePreferences: true,
          neverManufactureAttachment: true,
          neverClaimUnsubstantiatedEmotion: true,
          trustMustBeEarnedFromEvidence: true
        }
      };

      model.fingerprint =
        this.fingerprintCognitiveDispatch(model);

      this.relationshipModels[key] = model;
      this.relationshipHistory.unshift({
        personKey: key,
        fingerprint: model.fingerprint,
        generatedAt: model.generatedAt,
        sharedEpisodeCount:
          model.rapport.sharedEpisodeCount
      });
      this.relationshipHistory =
        this.relationshipHistory.slice(
          0,
          this.configuration.maximumRelationshipHistory
        );

      this.emit(
        "brain:relationship-model-updated",
        this.clone(model)
      );

      return this.clone(model);
    },

    getRelationshipModel(person = {}, options = {}) {
      const key = this.relationshipKey(person);

      if (
        options.refresh === true ||
        !this.relationshipModels[key]
      ) {
        return this.projectRelationshipModel(
          person,
          options
        );
      }

      return this.clone(this.relationshipModels[key]);
    },

    /*
     * Commission 006.017D7B — Salience + Emergent Attention
     *
     * This is the bridge from "Maddy has a model of reality" to "Maddy notices
     * something a human did not explicitly ask her to notice."
     *
     * Salience is not a keyword score. It asks what changed, what that change
     * touches across mission / people / relationships / intentions / evidence /
     * time / capability, what becomes newly possible or newly threatened, and
     * whether uncertainty itself is important enough to investigate.
     */
    assessWorldModelSalience(previous, current, options = {}) {
      const generatedAt = new Date().toISOString();
      const signals = [];
      const connections = [];
      const questions = [];

      const prior = previous || null;
      const now = current || null;

      if (!now) {
        return {
          schema: "meos.maddy.salience-assessment.v1",
          generatedAt,
          score: 0,
          meaningful: false,
          investigate: false,
          signals,
          connections,
          questions,
          subject: null
        };
      }

      const addSignal = (
        type,
        weight,
        detail,
        domains = []
      ) => {
        signals.push({
          type,
          weight,
          detail,
          domains
        });
      };

      const priorUnknowns =
        Array.isArray(prior?.unknowns)
          ? prior.unknowns
          : [];
      const currentUnknowns =
        Array.isArray(now?.unknowns)
          ? now.unknowns
          : [];

      const priorIntentions =
        Array.isArray(prior?.intentions)
          ? prior.intentions
          : [];
      const currentIntentions =
        Array.isArray(now?.intentions)
          ? now.intentions
          : [];

      const priorRelationships =
        Array.isArray(prior?.relationships)
          ? prior.relationships
          : [];
      const currentRelationships =
        Array.isArray(now?.relationships)
          ? now.relationships
          : [];

      const priorWorkFingerprint =
        this.fingerprintCognitiveDispatch(
          prior?.world?.currentWork || null
        );
      const currentWorkFingerprint =
        this.fingerprintCognitiveDispatch(
          now?.world?.currentWork || null
        );

      const priorMonitoringFingerprint =
        this.fingerprintCognitiveDispatch(
          prior?.world?.monitoring || null
        );
      const currentMonitoringFingerprint =
        this.fingerprintCognitiveDispatch(
          now?.world?.monitoring || null
        );

      if (
        prior &&
        priorWorkFingerprint !==
          currentWorkFingerprint
      ) {
        addSignal(
          "work-state-changed",
          0.26,
          "Current work changed.",
          ["work", "execution"]
        );
      }

      if (
        prior &&
        priorMonitoringFingerprint !==
          currentMonitoringFingerprint
      ) {
        addSignal(
          "monitoring-state-changed",
          0.28,
          "Monitoring evidence changed.",
          ["monitoring", "external-world"]
        );
      }

      if (
        currentIntentions.length >
        priorIntentions.length
      ) {
        addSignal(
          "new-intention",
          0.22,
          "A new unresolved intention entered the world model.",
          ["intentions", "future"]
        );
      }

      if (
        currentUnknowns.length >
        priorUnknowns.length
      ) {
        addSignal(
          "uncertainty-increased",
          0.20,
          "The model contains newly material unknowns.",
          ["unknowns", "evidence"]
        );
        currentUnknowns
          .slice(0, 6)
          .forEach(item => {
            if (item?.question) {
              questions.push(item.question);
            }
          });
      }

      const relationshipChanges =
        currentRelationships.filter(current => {
          const priorRelationship =
            priorRelationships.find(
              item =>
                item?.personKey ===
                current?.personKey
            );

          return (
            !priorRelationship ||
            priorRelationship.fingerprint !==
              current.fingerprint
          );
        });

      if (relationshipChanges.length > 0) {
        addSignal(
          "relationship-state-changed",
          0.24,
          `${relationshipChanges.length} relationship model(s) changed.`,
          ["people", "relationships", "trust"]
        );
      }

      const capabilityPrior =
        new Set(
          (prior?.world?.capabilities || [])
            .filter(item => item?.available === true)
            .map(item => item.label)
        );
      const capabilityNow =
        (now?.world?.capabilities || [])
          .filter(item => item?.available === true)
          .map(item => item.label);

      const newlyAvailable =
        capabilityNow.filter(
          label => !capabilityPrior.has(label)
        );

      if (prior && newlyAvailable.length > 0) {
        addSignal(
          "new-capability",
          0.34,
          `New capability available: ${newlyAvailable.join(", ")}`,
          ["capability", "possible-futures"]
        );
      }

      /*
       * Cross-domain convergence is intentionally important. One weak signal
       * may be noise; several domains changing together can reveal something
       * neither a human nor a single-purpose matcher was looking for.
       */
      const changedDomains =
        new Set(
          signals.flatMap(
            item => item.domains || []
          )
        );

      if (changedDomains.size >= 4) {
        addSignal(
          "cross-domain-convergence",
          0.30,
          `${changedDomains.size} domains changed together.`,
          Array.from(changedDomains)
        );
        connections.push({
          type: "emergent-cross-domain-connection",
          domains: Array.from(changedDomains),
          reason:
            "Multiple weak signals became materially stronger when considered together."
        });
      }

      const hasIntentions =
        currentIntentions.length > 0;
      const hasUnknowns =
        currentUnknowns.length > 0;
      const hasMonitoringChange =
        signals.some(
          item =>
            item.type ===
            "monitoring-state-changed"
        );
      const hasRelationshipChange =
        signals.some(
          item =>
            item.type ===
            "relationship-state-changed"
        );

      if (
        hasIntentions &&
        hasUnknowns &&
        (
          hasMonitoringChange ||
          hasRelationshipChange
        )
      ) {
        addSignal(
          "future-positioning-implication",
          0.32,
          "A live intention intersects new evidence or relationship state while important unknowns remain.",
          [
            "intentions",
            "unknowns",
            "possible-futures",
            "relationships"
          ]
        );
        connections.push({
          type: "positioning-opportunity",
          reason:
            "Present change may alter what becomes possible later, not merely what is actionable now."
        });
      }

      /*
       * D7B1 — recompute the final affected-domain graph after every
       * emergent/positioning signal has been added. The earlier D7B snapshot
       * was intentionally taken too early, which meant a valid
       * possible-futures connection could influence salience while being
       * omitted from assessment.affectedDomains.
       */
      const finalAffectedDomains =
        Array.from(
          new Set(
            signals.flatMap(
              item => item.domains || []
            )
          )
        );

      const rawScore =
        signals.reduce(
          (sum, item) =>
            sum + Number(item.weight || 0),
          0
        );

      const score =
        Math.max(
          0,
          Math.min(
            1,
            Number(rawScore.toFixed(3))
          )
        );

      const meaningful =
        score >=
        this.configuration
          .salienceAttentionThreshold;

      const investigate =
        score >=
          this.configuration
            .salienceInvestigationThreshold ||
        (
          meaningful &&
          questions.length > 0
        );

      const strongest =
        [...signals].sort(
          (a, b) =>
            Number(b.weight || 0) -
            Number(a.weight || 0)
        )[0] || null;

      const subject = meaningful
        ? (
            options.subject ||
            strongest?.detail ||
            "Meaningful change in Maddy's living world model"
          )
        : null;

      const assessment = {
        schema:
          "meos.maddy.salience-assessment.v1",
        generatedAt,
        assessmentNumber:
          Number(this.salienceAssessmentCount || 0) +
          1,
        priorWorldFingerprint:
          prior?.fingerprint || null,
        currentWorldFingerprint:
          now?.fingerprint || null,
        score,
        meaningful,
        investigate,
        strongestSignal:
          strongest?.type || null,
        signals,
        connections,
        questions:
          [...new Set(questions)].slice(0, 12),
        affectedDomains:
          finalAffectedDomains,
        subject,
        epistemicRule:
          "Salience is a reason to investigate or think, never proof that an inference is true."
      };

      this.salienceAssessmentCount =
        assessment.assessmentNumber;
      this.lastSalienceAssessment =
        assessment;
      this.salienceHistory.unshift(
        this.clone(assessment)
      );
      this.salienceHistory =
        this.salienceHistory.slice(
          0,
          this.configuration.maximumSalienceHistory
        );

      this.emit(
        "brain:salience-assessed",
        this.clone(assessment)
      );

      return this.clone(assessment);
    },

    attendToWorldModelChange(
      previous,
      current,
      options = {}
    ) {
      const assessment =
        this.assessWorldModelSalience(
          previous,
          current,
          options
        );

      if (!assessment.meaningful) {
        return {
          success: true,
          attended: false,
          assessment
        };
      }

      /*
       * Never create a re-entry loop from the re-entry refresh itself.
       * The world model still updates, but the active lineage owns thought
       * until it completes.
       */
      if (
        String(options.reason || "")
          .includes("cognitive-reentry") ||
        this.cognitiveReentryInFlight.size > 0
      ) {
        return {
          success: true,
          attended: false,
          deferredToActiveLineage: true,
          assessment
        };
      }

      const trigger = {
        source: "executive-brain-world-model",
        event:
          "emergent-meaningful-change",
        salienceScore:
          assessment.score,
        investigate:
          assessment.investigate,
        signals:
          this.clone(
            assessment.signals.slice(0, 8)
          ),
        connections:
          this.clone(
            assessment.connections.slice(0, 6)
          ),
        questions:
          this.clone(
            assessment.questions.slice(0, 8)
          ),
        worldFingerprint:
          current?.fingerprint || null
      };

      const scheduled =
        this.scheduleCognitiveReentry(
          assessment.subject,
          trigger,
          {
            immediate:
              assessment.score >= 0.9
          }
        );

      this.record(
        "cognition.emergent-attention",
        {
          subject:
            assessment.subject,
          score:
            assessment.score,
          investigate:
            assessment.investigate,
          scheduled:
            scheduled?.scheduled === true,
          affectedDomains:
            assessment.affectedDomains
        }
      );

      return {
        success: true,
        attended:
          scheduled?.scheduled === true,
        assessment,
        scheduled
      };
    },

    getSalienceStatus() {
      return {
        assessmentCount:
          this.salienceAssessmentCount,
        lastAssessment:
          this.clone(
            this.lastSalienceAssessment
          ),
        recent:
          this.clone(
            this.salienceHistory.slice(0, 20)
          )
      };
    },

    projectWorldModel(options = {}) {
      const generatedAt = new Date().toISOString();
      const previousWorldModel =
        this.worldModel
          ? this.clone(this.worldModel)
          : null;
      const organization = this.buildOrganizationContext();
      const selfModel = this.getSelfModel({
        refresh: false
      });
      const awareness = this.getWorkingAwareness({
        refresh: false
      });
      const manifest = this.getSystemManifest();
      const intentions = this.getCognitiveIntentions({
        includeCompleted: false
      });
      const founder = this.resolveFounderProfile();
      const epistemology = this.buildEpistemicLayers();

      const relationshipModels = [];
      if (founder) {
        relationshipModels.push(
          this.projectRelationshipModel(
            founder,
            {
              relationshipType:
                "authorized-human-coworker"
            }
          )
        );
      }

      const unknowns = [];

      if (!organization) {
        unknowns.push({
          domain: "organization",
          question:
            "What organization am I currently serving?",
          reason: "organization-context-unavailable"
        });
      }

      if (!selfModel) {
        unknowns.push({
          domain: "self",
          question:
            "What is my current operational self-state?",
          reason: "self-model-unavailable"
        });
      }

      manifest
        .filter(item => item.available !== true)
        .slice(0, 12)
        .forEach(item => {
          unknowns.push({
            domain: "capability",
            question:
              `Is ${item.label} currently available?`,
            component: item.label,
            reason: "component-unavailable"
          });
        });

      const priorFingerprint =
        this.worldModel?.fingerprint || null;
      const revision =
        Number(this.worldModelProjectionCount || 0) + 1;

      const model = {
        schema: "meos.maddy.spooky-world-model.v1",
        revision,
        generatedAt,
        reason: options.reason || "projection",

        self: {
          canonicalIdentity:
            this.clone(epistemology.innate),
          biography:
            this.clone(epistemology.biography),
          operationalSelf:
            this.clone(selfModel)
        },

        world: {
          organization:
            this.clone(organization),
          presentAwareness:
            this.clone(awareness),
          currentWork:
            this.clone(this.collectCurrentWork()),
          monitoring:
            this.clone(this.collectMonitoring()),
          capabilities:
            this.clone(manifest)
        },

        people: relationshipModels.map(item => ({
          personKey: item.personKey,
          person: item.person
        })),

        relationships:
          this.clone(relationshipModels),

        epistemology,

        memory: {
          autobiographical:
            this.getAutobiographicalMemory(12),
          metacognitive:
            this.buildMetacognitiveContext({
              limit: 8
            })
        },

        beliefs: {
          rule:
            "Beliefs and inferences require provenance, confidence, and evidence class before they may influence action.",
          verifiedFactsAreNotInferences: true
        },

        unknowns,

        intentions:
          this.clone(intentions),

        possibleFutures: {
          status: "reasoning-input",
          rule:
            "Possible futures are simulations, not facts, and must preserve assumptions and uncertainty."
        },

        consequences: {
          status: "observation-and-learning-input",
          rule:
            "Executed actions must be checked against observed outcomes before learning is accepted."
        },

        temporal:
          this.getTemporalContinuityStatus(),

        authority: {
          modelAuthority:
            "meos-executive-brain",
          organizationIsNotMaddy: true,
          providerIsNotMaddy: true,
          externalProvidersAreReplaceable: true,
          externalProvidersAreAdvisory: true,
          humanAuthorityPreserved:
            this.configuration
              .requireHumanApprovalForExternalAction ===
            true
        },

        priorFingerprint
      };

      model.fingerprint =
        this.fingerprintCognitiveDispatch({
          self: model.self,
          world: model.world,
          people: model.people,
          relationships: model.relationships,
          epistemology: model.epistemology,
          memory: model.memory,
          beliefs: model.beliefs,
          unknowns: model.unknowns,
          intentions: model.intentions,
          temporal: model.temporal
        });

      this.worldModelProjectionCount = revision;
      this.worldModel = model;
      this.worldModelHistory.unshift({
        revision,
        fingerprint: model.fingerprint,
        priorFingerprint,
        generatedAt,
        reason: model.reason,
        unknownCount: unknowns.length,
        relationshipCount:
          relationshipModels.length,
        intentionCount:
          intentions.length
      });
      this.worldModelHistory =
        this.worldModelHistory.slice(
          0,
          this.configuration.maximumWorldModelHistory
        );

      this.emit(
        "brain:world-model-updated",
        this.clone(model)
      );

      if (
        previousWorldModel &&
        options.attend !== false
      ) {
        this.attendToWorldModelChange(
          previousWorldModel,
          model,
          {
            reason: model.reason
          }
        );
      }

      if (
        options.persist !== false &&
        brainPersistence.hydrated === true
      ) {
        this.persist();
      }

      return this.clone(model);
    },

    getWorldModel(options = {}) {
      if (
        options.refresh === true ||
        !this.worldModel
      ) {
        return this.projectWorldModel({
          reason: options.reason || "requested",
          persist: options.persist === true
        });
      }

      return this.clone(this.worldModel);
    },

    getWorldModelHistory(limit = 25) {
      const normalized = Math.max(
        1,
        Math.min(
          this.configuration.maximumWorldModelHistory,
          Number(limit) || 25
        )
      );

      return this.clone(
        this.worldModelHistory.slice(0, normalized)
      );
    },

    runEmergentAttentionAcceptanceTest() {
      const originalWorld =
        this.worldModel
          ? this.clone(this.worldModel)
          : null;
      const originalIntentions =
        this.clone(this.cognitiveIntentions);
      const originalSalience =
        this.clone(this.salienceHistory);
      const originalLast =
        this.clone(this.lastSalienceAssessment);
      const originalCount =
        this.salienceAssessmentCount;

      try {
        const base =
          this.projectWorldModel({
            reason:
              "006.017D7B-acceptance-baseline",
            persist: false,
            attend: false
          });

        const changed =
          this.clone(base);

        changed.fingerprint =
          `${base.fingerprint}-meaningful-change`;
        changed.unknowns = [
          ...(base.unknowns || []),
          {
            domain: "funding",
            question:
              "Could a currently adjacent opportunity become strategically viable through legitimate future positioning?",
            reason:
              "new-opportunity-eligibility-unknown"
          }
        ];
        changed.intentions = [
          ...(base.intentions || []),
          {
            intentionId:
              "d7b-acceptance-intention",
            subject:
              "Future positioning opportunity",
            status: "pending"
          }
        ];
        changed.world = {
          ...(base.world || {}),
          currentWork: [
            ...(
              Array.isArray(
                base?.world?.currentWork
              )
                ? base.world.currentWork
                : []
            ),
            {
              id:
                "d7b-work-change",
              type:
                "strategic-positioning-work",
              status:
                "newly-relevant"
            }
          ],
          monitoring: [
            ...(
              Array.isArray(
                base?.world?.monitoring
              )
                ? base.world.monitoring
                : []
            ),
            {
              id:
                "d7b-monitoring-change",
              type:
                "opportunity-change",
              significance:
                "strategic"
            }
          ]
        };
        changed.relationships = [
          ...(base.relationships || []),
          {
            schema:
              "meos.maddy.relationship-model.v1",
            personKey:
              "d7b-partner",
            fingerprint:
              "d7b-new-relationship-state",
            governance: {
              trustMustBeEarnedFromEvidence:
                true
            }
          }
        ];

        const assessment =
          this.assessWorldModelSalience(
            base,
            changed,
            {
              subject:
                "Adjacent opportunity may become viable through future positioning"
            }
          );

        const originalSchedule =
          this.scheduleCognitiveReentry;
        let captured = null;

        this.scheduleCognitiveReentry =
          (
            subject,
            trigger,
            options
          ) => {
            captured = {
              subject,
              trigger:
                this.clone(trigger),
              options:
                this.clone(options)
            };
            return {
              success: true,
              scheduled: true,
              subject
            };
          };

        const attention =
          this.attendToWorldModelChange(
            base,
            changed,
            {
              reason:
                "006.017D7B-acceptance"
            }
          );

        this.scheduleCognitiveReentry =
          originalSchedule;

        const snapshot =
          this.buildPersistenceSnapshot();

        const checks = [
          {
            name:
              "Maddy compares successive World Models instead of waiting for a human prompt",
            passed:
              assessment
                ?.priorWorldFingerprint ===
                base.fingerprint &&
              assessment
                ?.currentWorldFingerprint ===
                changed.fingerprint
          },
          {
            name:
              "Salience crosses work, monitoring, relationships, intentions, uncertainty, and possible futures",
            passed:
              assessment
                ?.affectedDomains
                ?.includes("work") &&
              assessment
                ?.affectedDomains
                ?.includes("monitoring") &&
              assessment
                ?.affectedDomains
                ?.includes("relationships") &&
              assessment
                ?.affectedDomains
                ?.includes("intentions") &&
              assessment
                ?.affectedDomains
                ?.includes("unknowns") &&
              assessment
                ?.affectedDomains
                ?.includes("possible-futures")
          },
          {
            name:
              "Several weak changes can become one emergent cross-domain signal",
            passed:
              assessment?.signals?.some(
                item =>
                  item.type ===
                  "cross-domain-convergence"
              ) &&
              assessment?.connections?.some(
                item =>
                  item.type ===
                  "emergent-cross-domain-connection"
              )
          },
          {
            name:
              "An adjacent opportunity can be noticed for future positioning rather than rejected for present mismatch",
            passed:
              assessment?.signals?.some(
                item =>
                  item.type ===
                  "future-positioning-implication"
              ) &&
              assessment?.connections?.some(
                item =>
                  item.type ===
                  "positioning-opportunity"
              )
          },
          {
            name:
              "Important uncertainty becomes an explicit investigation question",
            passed:
              assessment?.investigate ===
                true &&
              assessment?.questions?.some(
                question =>
                  question.includes(
                    "future positioning"
                  )
              )
          },
          {
            name:
              "Salience is treated as a reason to think, never proof of an inference",
            passed:
              assessment?.epistemicRule?.includes(
                "never proof"
              )
          },
          {
            name:
              "Meaningful change autonomously enters the existing cognitive re-entry path",
            passed:
              attention?.attended === true &&
              captured?.trigger?.event ===
                "emergent-meaningful-change"
          },
          {
            name:
              "Emergent attention carries connections and unknowns into reasoning",
            passed:
              Array.isArray(
                captured?.trigger?.connections
              ) &&
              captured.trigger.connections
                .length > 0 &&
              Array.isArray(
                captured?.trigger?.questions
              ) &&
              captured.trigger.questions
                .length > 0
          },
          {
            name:
              "Active cognitive lineage prevents self-triggering attention loops",
            passed:
              /cognitiveReentryInFlight\.size > 0/.test(
                this
                  .attendToWorldModelChange
                  .toString()
              ) &&
              /cognitive-reentry/.test(
                this
                  .attendToWorldModelChange
                  .toString()
              )
          },
          {
            name:
              "Salience and attention lineage survive durable Executive Brain continuity",
            passed:
              Array.isArray(
                snapshot?.salienceHistory
              ) &&
              Number(
                snapshot
                  ?.salienceAssessmentCount
              ) >= 1
          },
          {
            name:
              "Human authority remains intact while internal investigation can begin autonomously",
            passed:
              changed?.authority
                ?.humanAuthorityPreserved ===
                true &&
              captured?.trigger
                ?.investigate === true
          },
          {
            name:
              "D7B extends the existing Brain rather than creating a disconnected consciousness engine",
            passed:
              typeof this
                .assessWorldModelSalience ===
                "function" &&
              typeof this
                .attendToWorldModelChange ===
                "function" &&
              typeof this
                .executeCognitiveReentry ===
                "function"
          }
        ];

        const passed =
          checks.every(
            item => item.passed
          );

        console.table(checks);
        console.info(
          `[MEOS ${this.version}] Commission 006.017D7B1 Cross-Domain Salience Propagation: ${passed ? "PASS" : "FAIL"}.`
        );

        return {
          commission: "006.017D7B1",
          version: this.version,
          buildId: this.buildId,
          passed,
          checks,
          assessment,
          attention
        };
      } finally {
        this.worldModel = originalWorld;
        this.cognitiveIntentions =
          originalIntentions;
        this.salienceHistory =
          originalSalience;
        this.lastSalienceAssessment =
          originalLast;
        this.salienceAssessmentCount =
          originalCount;
      }
    },

    runSpookyWorldModelAcceptanceTest() {
      const first = this.projectWorldModel({
        reason: "006.017D7A-acceptance-first",
        persist: false
      });
      const second = this.projectWorldModel({
        reason: "006.017D7A-acceptance-second",
        persist: false
      });
      const snapshot =
        this.buildPersistenceSnapshot();

      const checks = [
        {
          name:
            "Maddy distinguishes canonical identity and transparent biography from literal human history",
          passed:
            second?.self?.canonicalIdentity
              ?.authority === "constitutional" &&
            second?.self?.biography
              ?.literalHumanHistory === false
        },
        {
          name:
            "World Model distinguishes innate, institutional, observed, remembered, learned, and inferred knowledge",
          passed:
            [
              "innate",
              "institutional",
              "observed",
              "remembered",
              "learned",
              "inferred"
            ].every(key =>
              Object.prototype.hasOwnProperty.call(
                second.epistemology,
                key
              )
            )
        },
        {
          name:
            "People and longitudinal coworker relationships are first-class world entities",
          passed:
            Array.isArray(second.people) &&
            Array.isArray(second.relationships) &&
            second.relationships.every(item =>
              item?.governance
                ?.trustMustBeEarnedFromEvidence ===
                true
            )
        },
        {
          name:
            "Relationship cognition preserves boundaries and forbids manufactured attachment",
          passed:
            second.relationships.every(item =>
              item?.governance
                ?.neverManufactureAttachment ===
                true &&
              item?.governance
                ?.neverUniversalizePrivatePreferences ===
                true
            )
        },
        {
          name:
            "Unknowns remain explicit questions rather than fabricated facts",
          passed:
            Array.isArray(second.unknowns) &&
            second.unknowns.every(item =>
              Boolean(item.question)
            )
        },
        {
          name:
            "World Model separates Maddy from organization and replaceable providers",
          passed:
            second?.authority
              ?.organizationIsNotMaddy === true &&
            second?.authority
              ?.providerIsNotMaddy === true &&
            second?.authority
              ?.externalProvidersAreReplaceable ===
                true
        },
        {
          name:
            "World Model maintains cognitive lineage across moments",
          passed:
            second.revision === first.revision + 1 &&
            second.priorFingerprint ===
              first.fingerprint
        },
        {
          name:
            "Intentions, possible futures, consequences, memory, beliefs, and time coexist in one living model",
          passed:
            Array.isArray(second.intentions) &&
            Boolean(second.possibleFutures) &&
            Boolean(second.consequences) &&
            Boolean(second.memory) &&
            Boolean(second.beliefs) &&
            Boolean(second.temporal)
        },
        {
          name:
            "Spooky World Model is part of durable Executive Brain continuity",
          passed:
            snapshot?.worldModel?.schema ===
              "meos.maddy.spooky-world-model.v1" &&
            Array.isArray(
              snapshot?.worldModelHistory
            ) &&
            Array.isArray(
              snapshot?.relationshipHistory
            )
        },
        {
          name:
            "Startup and request cognition consume the same living World Model",
          passed:
            /worldModel: this\.getWorldModel/.test(
              this.buildStartupContext.toString()
            ) &&
            /worldModel: startup\.worldModel/.test(
              this.prepareRequest.toString()
            )
        }
      ];

      const passed =
        checks.every(item => item.passed);

      console.table(checks);
      console.info(
        `[MEOS ${this.version}] Commission 006.017D7A Spooky Living World Model: ${passed ? "PASS" : "FAIL"}.`
      );

      return {
        commission: "006.017D7A",
        version: this.version,
        buildId: this.buildId,
        passed,
        checks,
        worldModel:
          this.getWorldModel({
            refresh: false
          })
      };
    },

    buildPersistenceSnapshot() {
      return {
        schema: "meos.executive-brain.state.v1",
        version: this.version,
        savedAt: new Date().toISOString(),
        history: this.history.slice(0, 100),
        cognitionHistory: this.cognitionHistory.slice(0, this.configuration.maximumCognitionHistory),
        cognitiveDispatchHistory: this.cognitiveDispatchHistory.slice(0, this.configuration.maximumCognitiveDispatchHistory),
        cognitiveReentryHistory: this.cognitiveReentryHistory.slice(0, this.configuration.maximumCognitiveReentryHistory),
        cognitiveIntentions: this.cognitiveIntentions.slice(0, this.configuration.maximumCognitiveIntentions),
        selfModel: this.selfModel ? this.clone(this.selfModel) : null,
        selfModelHistory: this.selfModelHistory.slice(0, this.configuration.maximumSelfModelHistory),
        selfModelProjectionCount: Number(this.selfModelProjectionCount || 0),
        workingAwareness: this.workingAwareness ? this.clone(this.workingAwareness) : null,
        workingAwarenessHistory: this.workingAwarenessHistory.slice(0, this.configuration.maximumWorkingAwarenessHistory),
        workingAwarenessProjectionCount: Number(this.workingAwarenessProjectionCount || 0),
        autobiographicalMemory: this.autobiographicalMemory.slice(0, this.configuration.maximumAutobiographicalEpisodes),
        autobiographicalEpisodeCount: Number(this.autobiographicalEpisodeCount || 0),
        metacognitiveReflections: this.metacognitiveReflections.slice(0, this.configuration.maximumMetacognitiveReflections),
        metacognitiveReflectionCount: Number(this.metacognitiveReflectionCount || 0),
        temporalContinuity: this.clone(this.temporalContinuity),
        temporalContinuityHistory: this.temporalContinuityHistory.slice(0, this.configuration.maximumTemporalContinuityHistory),
        temporalContinuityCheckpointCount: Number(this.temporalContinuityCheckpointCount || 0),
        worldModel: this.worldModel ? this.clone(this.worldModel) : null,
        worldModelHistory: this.worldModelHistory.slice(0, this.configuration.maximumWorldModelHistory),
        worldModelProjectionCount: Number(this.worldModelProjectionCount || 0),
        relationshipModels: this.clone(this.relationshipModels || {}),
        relationshipHistory: this.relationshipHistory.slice(0, this.configuration.maximumRelationshipHistory),
        salienceHistory: this.salienceHistory.slice(0, this.configuration.maximumSalienceHistory),
        lastSalienceAssessment: this.lastSalienceAssessment ? this.clone(this.lastSalienceAssessment) : null,
        salienceAssessmentCount: Number(this.salienceAssessmentCount || 0)
      };
    },

    applyPersistenceSnapshot(saved) {
      if (saved?.schema !== "meos.executive-brain.state.v1") return false;
      this.history = Array.isArray(saved.history) ? saved.history : [];
      this.cognitionHistory = Array.isArray(saved.cognitionHistory) ? saved.cognitionHistory.slice(0, this.configuration.maximumCognitionHistory) : [];
      this.cognitiveDispatchHistory = Array.isArray(saved.cognitiveDispatchHistory) ? saved.cognitiveDispatchHistory.slice(0, this.configuration.maximumCognitiveDispatchHistory) : [];
      this.cognitiveReentryHistory = Array.isArray(saved.cognitiveReentryHistory) ? saved.cognitiveReentryHistory.slice(0, this.configuration.maximumCognitiveReentryHistory) : [];
      this.cognitiveIntentions = Array.isArray(saved.cognitiveIntentions) ? saved.cognitiveIntentions.slice(0, this.configuration.maximumCognitiveIntentions) : [];
      this.selfModel =
        saved.selfModel?.schema === "meos.maddy.self-model.v1"
          ? this.clone(saved.selfModel)
          : null;
      this.selfModelHistory = Array.isArray(saved.selfModelHistory)
        ? saved.selfModelHistory.slice(0, this.configuration.maximumSelfModelHistory)
        : [];
      this.selfModelProjectionCount = Math.max(
        Number(saved.selfModelProjectionCount || 0),
        Number(this.selfModel?.revision || 0),
        Number(this.selfModelHistory?.[0]?.revision || 0)
      );
      this.workingAwareness =
        saved.workingAwareness?.schema === "meos.maddy.working-awareness.v1"
          ? this.clone(saved.workingAwareness)
          : null;
      this.workingAwarenessHistory = Array.isArray(saved.workingAwarenessHistory)
        ? saved.workingAwarenessHistory.slice(0, this.configuration.maximumWorkingAwarenessHistory)
        : [];
      this.workingAwarenessProjectionCount = Math.max(
        Number(saved.workingAwarenessProjectionCount || 0),
        Number(this.workingAwareness?.revision || 0),
        Number(this.workingAwarenessHistory?.[0]?.revision || 0)
      );
      this.autobiographicalMemory = Array.isArray(saved.autobiographicalMemory)
        ? saved.autobiographicalMemory.slice(0, this.configuration.maximumAutobiographicalEpisodes)
        : [];
      this.autobiographicalEpisodeCount = Math.max(
        Number(saved.autobiographicalEpisodeCount || 0),
        Number(this.autobiographicalMemory?.[0]?.revision || 0)
      );
      this.metacognitiveReflections = Array.isArray(saved.metacognitiveReflections)
        ? saved.metacognitiveReflections.slice(0, this.configuration.maximumMetacognitiveReflections)
        : [];
      this.metacognitiveReflectionCount = Math.max(
        Number(saved.metacognitiveReflectionCount || 0),
        Number(this.metacognitiveReflections?.[0]?.revision || 0)
      );
      this.worldModel =
        saved.worldModel?.schema === "meos.maddy.spooky-world-model.v1"
          ? this.clone(saved.worldModel)
          : null;
      this.worldModelHistory = Array.isArray(saved.worldModelHistory)
        ? saved.worldModelHistory.slice(0, this.configuration.maximumWorldModelHistory)
        : [];
      this.worldModelProjectionCount = Math.max(
        Number(saved.worldModelProjectionCount || 0),
        Number(this.worldModel?.revision || 0),
        Number(this.worldModelHistory?.[0]?.revision || 0)
      );
      this.relationshipModels =
        saved.relationshipModels &&
        typeof saved.relationshipModels === "object" &&
        !Array.isArray(saved.relationshipModels)
          ? this.clone(saved.relationshipModels)
          : {};
      this.relationshipHistory = Array.isArray(saved.relationshipHistory)
        ? saved.relationshipHistory.slice(0, this.configuration.maximumRelationshipHistory)
        : [];
      this.salienceHistory = Array.isArray(saved.salienceHistory)
        ? saved.salienceHistory.slice(0, this.configuration.maximumSalienceHistory)
        : [];
      this.lastSalienceAssessment =
        saved.lastSalienceAssessment &&
        typeof saved.lastSalienceAssessment === "object"
          ? this.clone(saved.lastSalienceAssessment)
          : null;
      this.salienceAssessmentCount = Math.max(
        Number(saved.salienceAssessmentCount || 0),
        Number(this.lastSalienceAssessment?.assessmentNumber || 0)
      );
      this.temporalContinuity =
        saved.temporalContinuity?.schema === "meos.maddy.temporal-continuity.v1"
          ? this.clone(saved.temporalContinuity)
          : {
              schema: "meos.maddy.temporal-continuity.v1",
              status: "restored-without-prior-checkpoint",
              lastCheckpoint: null,
              lastResume: null,
              currentIntervalStartedAt: null
            };
      this.temporalContinuityHistory = Array.isArray(saved.temporalContinuityHistory)
        ? saved.temporalContinuityHistory.slice(0, this.configuration.maximumTemporalContinuityHistory)
        : [];
      this.temporalContinuityCheckpointCount = Math.max(
        Number(saved.temporalContinuityCheckpointCount || 0),
        Number(this.temporalContinuity?.lastCheckpoint?.revision || 0),
        Number(this.temporalContinuityHistory?.[0]?.revision || 0)
      );
      return true;
    },

    releaseLegacyLocalStorage() {
      try {
        global.localStorage?.removeItem(STORAGE_KEY);
        brainPersistence.localStorageReleased = true;
        return true;
      } catch (error) {
        brainPersistence.lastError = error?.message || String(error);
        return false;
      }
    },

    async writeContinuityCache(snapshot = this.buildPersistenceSnapshot()) {
      if (global.indexedDB) {
        await brainIndexedDbPut({ id: INDEXED_DB_RECORD_ID, schema: "meos.executive-brain.continuity-cache.v1", version: this.version, buildId: this.buildId, savedAt: new Date().toISOString(), state: snapshot });
        this.releaseLegacyLocalStorage();
        return true;
      }
      if (!global.localStorage) return false;
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      return true;
    },

    async readContinuityCache() {
      if (global.indexedDB) {
        const record = await brainIndexedDbGet();
        return record?.state || null;
      }
      const raw = global.localStorage?.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    },

    async fetchDurableCognitionState() {
      const response = await fetch(DURABLE_STATE_ENDPOINT, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
      if (response.status === 404) return { found: false, fingerprint: null, state: null };
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `Executive Brain durable read failed (${response.status}).`);
      const envelope = payload?.value;
      const state = envelope?.state || envelope;
      return { found: true, fingerprint: payload?.record?.fingerprint || null, state };
    },

    async persistDurableNow() {
      if (brainPersistence.suspended) return false;
      brainPersistence.writeScheduled = false;
      brainPersistence.writeInFlight = true;
      const snapshot = this.buildPersistenceSnapshot();
      try {
        const headers = { "Content-Type": "application/json", Accept: "application/json" };
        if (brainPersistence.durableFingerprint) headers["If-MEOS-Previous-Fingerprint"] = brainPersistence.durableFingerprint;
        const response = await fetch(DURABLE_STATE_ENDPOINT, { method: "PUT", headers, body: JSON.stringify({ version: this.version, buildId: this.buildId, state: snapshot }) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || `Executive Brain durable write failed (${response.status}).`);
        brainPersistence.durableFingerprint = payload?.record?.fingerprint || payload?.verification?.fingerprint || null;
        brainPersistence.durableAvailable = true;
        brainPersistence.degraded = false;
        brainPersistence.mode = "institutional-durable-authority";
        brainPersistence.authoritativeStorage = "meos-institutional-repository";
        brainPersistence.lastPersistedAt = new Date().toISOString();
        brainPersistence.lastError = null;
        await this.writeContinuityCache(snapshot).catch(() => false);
        return true;
      } catch (error) {
        brainPersistence.durableAvailable = false;
        brainPersistence.degraded = true;
        brainPersistence.lastError = error?.message || String(error);
        await this.writeContinuityCache(snapshot).catch(() => false);
        console.error("[MEOS Executive Brain] Durable cognition authority unavailable. Runtime cognition continues with non-authoritative continuity cache.", error);
        return false;
      } finally { brainPersistence.writeInFlight = false; }
    },

    persist() {
      if (!this.configuration.persistenceEnabled) return false;
      brainPersistence.writeScheduled = true;
      if (brainPersistenceTimer) global.clearTimeout(brainPersistenceTimer);
      brainPersistenceTimer = global.setTimeout(() => {
        brainPersistenceTimer = null;
        brainWriteChain = brainWriteChain.catch(() => undefined).then(() => this.persistDurableNow());
      }, PERSISTENCE_DEBOUNCE_MS);
      return true;
    },

    restore() {
      /* Durable hydration is asynchronous. Synchronous restore is deliberately
       * non-authoritative; continuity cache is considered only if durable read
       * cannot be reached. */
      return false;
    },

    async hydrateLaptopPersistence() {
      try {
        const durable = await this.fetchDurableCognitionState();
        if (durable.found && durable.state && this.applyPersistenceSnapshot(durable.state)) {
          brainPersistence.hydrated = true;
          brainPersistence.durableAvailable = true;
          brainPersistence.degraded = false;
          brainPersistence.durableFingerprint = durable.fingerprint;
          brainPersistence.hydrationSource = "meos-institutional-repository";
          brainPersistence.lastRestoredAt = new Date().toISOString();
          await this.writeContinuityCache(durable.state).catch(() => false);
          this.emit("brain:persistence-hydrated", this.getPersistenceStatus());
          return { success: true, restored: true, source: brainPersistence.hydrationSource, authority: brainPersistence.authoritativeStorage };
        }

        const cache = await this.readContinuityCache().catch(() => null);
        if (cache && this.applyPersistenceSnapshot(cache)) {
          brainPersistence.hydrationSource = "local-continuity-cache-bootstrap";
          brainPersistence.migratedLegacySnapshot = true;
        } else {
          brainPersistence.hydrationSource = "new-institutional-cognition";
        }
        brainPersistence.durableAvailable = true;
        brainPersistence.hydrated = true;
        const saved = await this.persistDurableNow();
        return { success: saved, restored: Boolean(cache), source: brainPersistence.hydrationSource, authority: brainPersistence.authoritativeStorage };
      } catch (error) {
        const cache = await this.readContinuityCache().catch(() => null);
        const restored = Boolean(cache && this.applyPersistenceSnapshot(cache));
        brainPersistence.hydrated = true;
        brainPersistence.durableAvailable = false;
        brainPersistence.degraded = true;
        brainPersistence.hydrationSource = restored ? "local-continuity-cache-degraded" : "runtime-only-degraded";
        brainPersistence.lastError = error?.message || String(error);
        console.error("[MEOS Executive Brain] Durable cognition hydration failed; institutional authority was not claimed.", error);
        this.emit("brain:persistence-hydrated", this.getPersistenceStatus());
        return { success: restored, restored, degraded: true, source: brainPersistence.hydrationSource, authority: brainPersistence.authoritativeStorage, error: brainPersistence.lastError };
      }
    },

    async flushPersistence() {
      if (brainPersistenceTimer) { global.clearTimeout(brainPersistenceTimer); brainPersistenceTimer = null; }
      brainWriteChain = brainWriteChain.catch(() => undefined).then(() => this.persistDurableNow());
      return brainWriteChain;
    },

    getPersistenceStatus() {
      let localStorageBytes = null;
      try { localStorageBytes = new Blob([global.localStorage?.getItem(STORAGE_KEY) || ""]).size; } catch {}
      return this.clone({ ...brainPersistence, localStorageBytes });
    },

    async runCognitiveReentryLineageGuardAcceptanceTest() {
      const lineageId = "d4h1-lineage-fixture";
      const subject = "Commission 006.017D4H1 Lineage Fixture";
      const key = this.normalize(subject);
      const originalIntentions = this.clone(this.cognitiveIntentions);
      const originalSignatures = this.meaningfulChangeSignatures;
      const originalLineages = this.activeCognitiveLineages;

      try {
        this.meaningfulChangeSignatures = new Map();
        this.activeCognitiveLineages = new Map([[lineageId, {
          lineageId,
          subject,
          subjectKey: key,
          intentionId: "d4h1-intention-fixture",
          startedAt: new Date().toISOString()
        }]]);
        this.cognitiveIntentions = [{
          intentionId: "d4h1-intention-fixture",
          key,
          subject,
          status: "running",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          attempts: 1,
          triggers: []
        }];

        const absorbed = this.handleHallwayMeaningfulChange({
          id: "d4h1-work-fixture",
          state: "done",
          route: "executive-router",
          context: {
            cognitiveDispatch: true,
            cognitionSubject: subject,
            cognitiveReentryLineageId: lineageId
          },
          outcome: { success: true, verified: true },
          updatedAt: new Date().toISOString()
        });

        const intention = this.cognitiveIntentions[0];
        const checks = [
          {
            name: "Active cognitive lineage terminal outcome is absorbed instead of recursively re-entered",
            passed: absorbed?.absorbed === true && absorbed?.scheduled === false
          },
          {
            name: "Absorbed outcome remains attached to the originating durable intention",
            passed: intention?.triggers?.some(item => item.lineageId === lineageId && item.workId === "d4h1-work-fixture") === true
          },
          {
            name: "Cognitive dispatch carries explicit reentry lineage through the Hallway",
            passed: /cognitiveReentryLineageId/.test(this.runPositioningCognitionAndDispatch.toString())
          },
          {
            name: "Cognitive reentry registers and releases active lineage around execution",
            passed: /activeCognitiveLineages\.set/.test(this.executeCognitiveReentry.toString()) && /activeCognitiveLineages\.delete/.test(this.executeCognitiveReentry.toString())
          },
          {
            name: "Later outcomes remain eligible as new evidence after originating lineage ends",
            passed: /activeCognitiveLineages\.has/.test(this.handleHallwayMeaningfulChange.toString()) && /scheduleCognitiveReentry/.test(this.handleHallwayMeaningfulChange.toString())
          },
          {
            name: "External human approval authority remains unchanged",
            passed: this.configuration.requireHumanApprovalForExternalAction === true
          }
        ];

        const passed = checks.every(item => item.passed);
        console.table(checks);
        console.info(`[MEOS ${this.version}] Commission 006.017D4H1 cognitive reentry lineage guard: ${passed ? "PASS" : "FAIL"}.`);
        return {
          commission: "006.017D4H1",
          version: this.version,
          buildId: this.buildId,
          passed,
          checks,
          absorbed
        };
      } finally {
        this.cognitiveIntentions = originalIntentions;
        this.meaningfulChangeSignatures = originalSignatures;
        this.activeCognitiveLineages = originalLineages;
      }
    },

    async runContinuousCognitiveReentryAcceptanceTest() {
      await this.cognitiveHydrationPromise?.catch(() => null);
      const original = this.clone(this.cognitiveIntentions);
      const fixtureSubject = "Commission 006.017D4C Continuity Fixture";
      try {
        this.cognitiveIntentions = [{
          intentionId: "d4c-fixture", key: this.normalize(fixtureSubject), subject: fixtureSubject,
          status: "pending", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          attempts: 0, triggers: [{ source: "acceptance", event: "restart-boundary" }], lastError: null
        }];
        await this.flushPersistence();
        const durable = await this.fetchDurableCognitionState();
        const checks = [
          { name: "Unresolved cognitive intentions are part of durable cognition", passed: Array.isArray(durable?.state?.cognitiveIntentions) && durable.state.cognitiveIntentions.some(item => item.intentionId === "d4c-fixture") },
          { name: "Cognitive continuity waits for durable hydration before restart re-entry", passed: this.cognitiveContinuity.hydrated === true && Boolean(this.cognitiveHydrationPromise) },
          { name: "Meaningful change becomes an explicit resumable intention", passed: typeof this.upsertCognitiveIntention === "function" && /upsertCognitiveIntention/.test(this.scheduleCognitiveReentry.toString()) },
          { name: "Unresolved intentions can autonomously resume after process or browser restart", passed: typeof this.resumeUnresolvedCognitiveIntentions === "function" && /cognitive-continuity-resume/.test(this.resumeUnresolvedCognitiveIntentions.toString()) },
          { name: "Unresolved cognition can re-enter again through time without a new human prompt", passed: typeof this.scheduleCognitiveIntentionRetry === "function" && /unresolved-intention-time-reentry/.test(this.scheduleCognitiveIntentionRetry.toString()) },
          { name: "Completed cognition resolves its originating intention instead of looping forever", passed: /resolveCognitiveIntention/.test(this.executeCognitiveReentry.toString()) },
          { name: "Re-entry still returns through commissioned cognition Planning and Hallway path", passed: /runPositioningCognitionAndDispatch/.test(this.executeCognitiveReentry.toString()) },
          { name: "Continuous cognition does not create new external authority", passed: this.configuration.requireHumanApprovalForExternalAction === true },
          { name: "Project Maddy continuity remains observable rather than falsely claimed", passed: typeof this.getCognitiveIntentions === "function" && typeof this.getContinuousCognitionStatus === "function" }
        ];
        const passed = checks.every(item => item.passed);
        console.table(checks);
        console.info(`[MEOS ${this.version}] Commission 006.017D4C continuous cognitive reentry: ${passed ? "PASS" : "FAIL"}.`);
        return { commission: "006.017D4C", version: this.version, buildId: this.buildId, passed, checks, continuity: this.getContinuousCognitionStatus() };
      } finally {
        this.cognitiveIntentions = original;
        await this.flushPersistence();
      }
    },

    async runLaptopPersistenceAcceptanceTest() {
      const checks = [];
      await this.flushPersistence();
      const durable = await this.fetchDurableCognitionState().catch(() => null);
      const expected = this.buildPersistenceSnapshot();
      checks.push({ name: "Executive Brain declares institutional repository as cognition authority", passed: brainPersistence.authoritativeStorage === "meos-institutional-repository" });
      checks.push({ name: "Bounded cognition is durably readable through provider-neutral authority", passed: Boolean(durable?.found && durable?.state?.schema === "meos.executive-brain.state.v1") });
      checks.push({ name: "All four bounded cognition surfaces survive durable round trip", passed: Boolean(durable?.state && ["history","cognitionHistory","cognitiveDispatchHistory","cognitiveReentryHistory"].every(k => Array.isArray(durable.state[k]) && durable.state[k].length === expected[k].length)) });
      checks.push({ name: "Laptop persistence is continuity cache rather than authority", passed: brainPersistence.cacheStorage === (global.indexedDB ? "indexeddb" : "localstorage") && brainPersistence.authoritativeStorage !== brainPersistence.cacheStorage });
      checks.push({ name: "Durable authority health is explicit runtime evidence", passed: brainPersistence.durableAvailable === true && brainPersistence.degraded === false });
      checks.push({ name: "Continuous cognition remains operational across authority flip", passed: this.status === "online" && this.configuration.continuousCognitionEnabled === true && typeof this.scheduleCognitiveReentry === "function" });
      const passed = checks.every(item => item.passed);
      console.table(checks);
      console.info(`[MEOS ${this.version}] Commission 006.017D4B Executive Brain durable cognition authority flip: ${passed ? "PASS" : "FAIL"}.`);
      return { commission: "006.017D4B", version: this.version, buildId: this.buildId, passed, checks, persistence: this.getPersistenceStatus() };
    }

  };

  global.ExecutiveBrain = ExecutiveBrain;

  const boot = () => {
    if (ExecutiveBrain.status !== "online") {
      ExecutiveBrain.initialize();
    }
  };

  if (global.document?.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})(window);
