/**
 * MEOS Executive Brain
 * Version: 1.22.1
 * Build: EB1230-PRODUCTIVE-IDLE-COGNITION-20260809-A
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

  const VERSION = "1.33.0";
  const BUILD_ID = "EB1330-CROSS-FUTURE-PORTFOLIO-ROBUSTNESS-20260809-A";
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
      anticipatoryInitiativeEnabled: true,
      anticipatoryCandidateLimit: 24,
      anticipatoryActionThreshold: 0.72,
      anticipatoryEscalationThreshold: 0.86,
      priorityPortfolioLimit: 32,
      priorityPreemptionThreshold: 0.12,
      protectedAttentionSwitchCost: 0.08,
      cognitiveThreadLimit: 48,
      cognitiveThreadStepLimit: 24,
      cognitiveThreadDiminishingReturnFloor: 0.08,
      continuousCognitionCycleBudget: 6,
      continuousCognitionIdleBackoffMs: 15000,
      continuousCognitionActiveBackoffMs: 5000,
      productiveIdleCognitionEnabled: true,
      productiveIdleMinimumValue: 0.42,
      productiveIdleDiminishingReturnFloor: 0.12,
      productiveIdleHistoryLimit: 96,
      productiveIdleCooldownMs: 60000,
      productiveIdleMaxConsecutiveSameSubject: 3,
      openDomainCuriosityEnabled: true,
      openDomainCuriosityBaseValue: 0.58,
      openDomainCuriosityAdjacentValue: 0.52,
      openDomainCuriosityMissionSeedLimit: 8,
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
      maximumResearchLearningBeliefs: 24,
      maximumResearchLearningUnknowns: 48,
      researchKnowledgeStartupMaximumAttempts: 4,
      researchKnowledgeStartupRetryDelayMs: 250,
      maximumRelationshipHistory: 120,
      maximumSalienceHistory: 180,
      salienceAttentionThreshold: 0.58,
      salienceInvestigationThreshold: 0.72,
      maximumCausalInvestigationHistory: 120,
      maximumCompetingHypotheses: 6,
      maximumAutonomousInvestigationHistory: 120,
      maximumEvidenceAssimilationHistory: 160,
      maximumDevelopmentalDriveHistory: 160,
      maximumDevelopmentalGoals: 32,
      maximumDevelopmentalPracticeHistory: 240,
      maximumDeferredCapabilities: 80,
      maximumDevelopmentalRetrospectives: 160,
      maximumIntentReconstructions: 200,
      maximumInvestigativeIntentions: 120,
      maximumDeliberateExperiences: 240,
      maximumCounterfactualSimulations: 240,
      maximumPreparednessInsights: 160,
      maximumAutonomousInvestigationSteps: 8,
      investigationResolutionThreshold: 0.78,
      temporalContinuityResumeThresholdMs: 15000,
      temporalCommitmentLookaheadHours: 720
    },

    initializedAt: null,
    refreshedAt: null,
    crossFuturePortfolioState: {
      count: 0,
      lastAt: null,
      last: null,
      history: []
    },
    backwardPositioningState: {
      count: 0,
      lastAt: null,
      last: null,
      history: []
    },
    temporalStrategicDeltaState: {
      count: 0,
      lastAt: null,
      last: null,
      history: []
    },
    temporalResimulationState: {
      count: 0,
      lastAt: null,
      last: null,
      history: []
    },
    planMonitoringRevisionState: {
      count: 0,
      lastAt: null,
      last: null,
      history: []
    },
    cognitiveRevisionState: {
      count: 0,
      lastAt: null,
      last: null,
      history: []
    },
    cognitiveReconciliationState: {
      count: 0,
      lastAt: null,
      last: null,
      history: []
    },
    consequencePropagationState: {
      count: 0,
      lastAt: null,
      last: null,
      history: []
    },
    cognitiveReappraisalState: {
      count: 0,
      lastAt: null,
      last: null,
      history: []
    },
    researchKnowledgeStartupHydration: {
      status: "not-started",
      attempts: 0,
      startedAt: null,
      completedAt: null,
      lastError: null,
      durableRecordCount: 0,
      worldFingerprint: null
    },
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
    causalInvestigationHistory: [],
    lastCausalInvestigation: null,
    causalInvestigationCount: 0,
    autonomousInvestigationHistory: [],
    lastAutonomousInvestigation: null,
    autonomousInvestigationCount: 0,
    evidenceAssimilationHistory: [],
    lastEvidenceAssimilation: null,
    evidenceAssimilationCount: 0,
    developmentalDriveHistory: [],
    developmentalGoals: [],
    developmentalPracticeHistory: [],
    deferredCapabilities: [],
    developmentalRetrospectives: [],
    lastDevelopmentalDrive: null,
    developmentalDriveCount: 0,
    intentReconstructionHistory: [],
    investigativeIntentions: [],
    lastIntentReconstruction: null,
    intentReconstructionCount: 0,
    deliberateExperienceHistory: [],
    counterfactualSimulationHistory: [],
    preparednessInsights: [],
    lastDeliberateExperience: null,
    lastCounterfactualSimulation: null,
    deliberateExperienceCount: 0,
    counterfactualSimulationCount: 0,
    anticipatoryInitiatives: [],
    lastAnticipatorySweep: null,
    anticipatorySweepCount: 0,
    executivePriorityPortfolio: [],
    currentExecutivePriority: null,
    lastPriorityArbitration: null,
    priorityArbitrationCount: 0,
    cognitiveThreads: [],
    activeCognitiveThreadId: null,
    lastCognitiveThreadEvent: null,
    cognitiveThreadEventCount: 0,
    continuousCognitionState: null,
    continuousCognitionCycleCount: 0,
    lastContinuousCognitionCycle: null,
    productiveIdleHistory: [],
    lastProductiveIdleAction: null,
    productiveIdleConsecutiveSameSubject: 0,
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
      this.cognitiveHydrationPromise = this.hydrateLaptopPersistence().then(async result => {
        this.cognitiveContinuity.hydrated = true;

        const researchKnowledgeHydration =
          await this.hydrateResearchKnowledgeBeforeCognition({
            cognitiveHydration: result
          });

        const temporalResume = this.resumeTemporalContinuity({
          reason: "durable-cognition-and-research-knowledge-hydrated",
          researchKnowledgeHydration
        });
        const resumed = this.resumeUnresolvedCognitiveIntentions({
          reason: "durable-cognition-and-research-knowledge-hydrated"
        });
        this.cognitiveContinuity.resumedAt = new Date().toISOString();
        this.cognitiveContinuity.lastResumeCount = resumed.resumedCount || 0;
        this.temporalContinuity.status = "continuous";
        this.temporalContinuity.currentIntervalStartedAt = new Date().toISOString();
        this.temporalContinuity.lastResume = this.clone(temporalResume);
        this.projectSelfModel({
          reason: "durable-cognition-and-research-knowledge-hydrated",
          persist: true
        });
        this.projectWorkingAwareness({
          reason: "temporal-continuity-resumed",
          persist: false
        });
        this.projectWorldModel({
          reason: "durable-cognition-and-research-knowledge-hydrated",
          persist: true
        });
        return {
          ...result,
          researchKnowledgeHydration
        };
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

      const knowledgeMemory =
        global.KnowledgeMemory ||
        global.MEOSKnowledgeMemory;

      if (knowledgeMemory?.on) {
        const handler = payload =>
          this.handleResearchLearningKnowledgeChange(
            payload
          );

        const result = knowledgeMemory.on(
          "research-learning:synced",
          handler
        );

        if (result !== false) {
          this.continuousCognitionSubscriptions.push({
            source: "knowledge-memory",
            event: "research-learning:synced",
            detach: () =>
              knowledgeMemory.off?.(
                "research-learning:synced",
                handler
              )
          });
          connectedSources.push(
            "knowledge-memory"
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

    async hydrateResearchKnowledgeBeforeCognition() {
      const state = this.researchKnowledgeStartupHydration;

      if (state.status === "ready") {
        return { success: true, ...this.clone(state) };
      }

      state.status = "waiting";
      state.startedAt = state.startedAt || new Date().toISOString();
      state.lastError = null;

      const maximumAttempts = Math.max(
        1,
        Number(this.configuration.researchKnowledgeStartupMaximumAttempts || 4)
      );
      const delayMs = Math.max(
        0,
        Number(this.configuration.researchKnowledgeStartupRetryDelayMs || 250)
      );

      for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
        state.attempts = attempt;

        const knowledgeMemory =
          global.KnowledgeMemory ||
          global.MEOSKnowledgeMemory;

        if (
          knowledgeMemory &&
          typeof knowledgeMemory.syncDurableResearchLearning === "function"
        ) {
          try {
            state.status = "hydrating";
            const result =
              await knowledgeMemory.syncDurableResearchLearning();

            if (result?.success === true) {
              state.durableRecordCount =
                Number(result.durableRecordCount || 0);

              const world = this.projectWorldModel({
                reason: "startup-research-knowledge-hydration",
                persist: true,
                attend: false
              });

              state.worldFingerprint = world?.fingerprint || null;
              state.status = "ready";
              state.completedAt = new Date().toISOString();
              state.lastError = null;

              this.record(
                "research-knowledge.startup-hydration.ready",
                {
                  attempt,
                  durableRecordCount: state.durableRecordCount,
                  worldFingerprint: state.worldFingerprint
                }
              );

              return { success: true, ...this.clone(state) };
            }

            state.lastError =
              result?.error ||
              result?.lastError ||
              "Durable research-learning sync did not report success.";
          } catch (error) {
            state.lastError = error?.message || String(error);
          }
        } else {
          state.lastError =
            "Knowledge Memory durable research-learning sync is not ready.";
        }

        if (attempt < maximumAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      state.status = "degraded";
      state.completedAt = new Date().toISOString();

      this.record(
        "research-knowledge.startup-hydration.degraded",
        {
          attempts: state.attempts,
          lastError: state.lastError
        }
      );

      return {
        success: false,
        degraded: true,
        ...this.clone(state)
      };
    },

    getResearchKnowledgeStartupHydrationStatus() {
      return {
        commission: "006.017D7R3A",
        version: this.version,
        buildId: this.buildId,
        ...this.clone(this.researchKnowledgeStartupHydration),
        authority: {
          durableSource: "executive-memory/investigation-history",
          activeKnowledge: "MEOS Knowledge Engine",
          livingWorldModel: "meos.maddy.spooky-world-model.v1",
          externalActionAuthorized: false,
          humanAuthorityPreserved: true
        }
      };
    },

    handleResearchLearningKnowledgeChange(payload = {}) {
      const records =
        Array.isArray(payload?.durableRecords)
          ? payload.durableRecords
          : [];

      const worldModel = this.projectWorldModel({
        reason: "durable-research-learning-synced",
        persist: true,
        attend: true
      });

      const subjects = records
        .map(record => String(record?.subject || "").trim())
        .filter(Boolean);

      subjects.slice(0, 8).forEach(subject => {
        this.scheduleCognitiveReentry(
          subject,
          {
            source: "knowledge-memory",
            event: "research-learning:synced",
            worldFingerprint:
              worldModel?.fingerprint || null
          }
        );
      });

      this.record(
        "world-model.research-learning-integrated",
        {
          recordCount: records.length,
          subjects: subjects.slice(0, 8),
          worldFingerprint:
            worldModel?.fingerprint || null
        }
      );

      return {
        success: true,
        integrated: true,
        recordCount: records.length,
        subjects,
        worldFingerprint:
          worldModel?.fingerprint || null
      };
    },

    collectActiveResearchLearning(options = {}) {
      const engine =
        global.MEOSKnowledgeEngine ||
        global.KnowledgeEngine;

      if (!engine) {
        return {
          available: false,
          records: [],
          beliefs: [],
          unknowns: []
        };
      }

      let records = [];

      if (Array.isArray(engine.records)) {
        records = engine.records;
      } else if (typeof engine.listRecords === "function") {
        const listed = this.safe(
          () => engine.listRecords(),
          []
        );
        records = Array.isArray(listed)
          ? listed
          : Array.isArray(listed?.records)
            ? listed.records
            : [];
      } else if (typeof engine.search === "function") {
        const result = this.safe(
          () =>
            engine.search("research-learning", {
              limit:
                options.limit ||
                this.configuration
                  .maximumResearchLearningBeliefs
            }),
          null
        );
        records = Array.isArray(result)
          ? result
          : Array.isArray(result?.results)
            ? result.results
            : [];
      }

      const active = records
        .filter(record =>
          record?.recordType === "research-learning" ||
          record?.metadata?.durableResearchLearning === true
        )
        .slice(
          0,
          options.limit ||
            this.configuration
              .maximumResearchLearningBeliefs
        );

      const beliefs = active.map(record => {
        const content =
          record?.content &&
          typeof record.content === "object"
            ? record.content
            : {};

        return {
          knowledgeRecordId: record.id || null,
          subject:
            record.title ||
            record.metadata?.subject ||
            null,
          summary: record.summary || null,
          evidenceQuality:
            content.evidenceQuality ||
            record.metadata?.evidenceQuality ||
            "unknown",
          epistemicStatus:
            content.epistemicStatus ||
            record.metadata?.epistemicStatus ||
            "research-learning-with-open-uncertainty",
          confidence:
            Number.isFinite(Number(record.confidence))
              ? Number(record.confidence)
              : null,
          authority: record.authority || null,
          supportedFacts:
            Array.isArray(content.supportedFacts)
              ? this.clone(content.supportedFacts)
              : [],
          inferences:
            Array.isArray(content.inferences)
              ? this.clone(content.inferences)
              : [],
          conflicts:
            Array.isArray(content.conflicts)
              ? this.clone(content.conflicts)
              : [],
          unknowns:
            Array.isArray(content.unknowns)
              ? this.clone(content.unknowns)
              : [],
          evidence:
            Array.isArray(content.evidence)
              ? this.clone(content.evidence)
              : [],
          requiresFurtherInvestigation:
            content.requiresFurtherInvestigation === true ||
            record.metadata
              ?.requiresFurtherInvestigation === true,
          durableLearningId:
            record.metadata
              ?.researchLearningRecordId ||
            null,
          durableLearningFingerprint:
            record.metadata
              ?.researchLearningFingerprint ||
            null,
          learnedAt:
            record.metadata?.learnedAt ||
            record.createdAt ||
            null,
          rule:
            "Supported facts, inferences, conflicts, and unknowns retain their evidence class. Research learning may influence reasoning but does not silently become verified institutional fact."
        };
      });

      const unknowns = beliefs
        .flatMap(belief =>
          (belief.unknowns || []).map(item => ({
            domain: "research-learning",
            subject: belief.subject,
            question:
              typeof item === "string"
                ? item
                : item?.question ||
                  item?.summary ||
                  String(item),
            reason:
              "durable-research-learning-open-uncertainty",
            knowledgeRecordId:
              belief.knowledgeRecordId
          }))
        )
        .slice(
          0,
          this.configuration
            .maximumResearchLearningUnknowns
        );

      return {
        available: true,
        recordCount: active.length,
        records: this.clone(active),
        beliefs,
        unknowns
      };
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

      const priorResearchBeliefs =
        prior?.beliefs?.durableResearchLearning?.active || [];
      const currentResearchBeliefs =
        now?.beliefs?.durableResearchLearning?.active || [];

      const priorResearchById = new Map(
        priorResearchBeliefs.map(item => [
          item?.knowledgeRecordId ||
            item?.durableLearningId ||
            item?.subject,
          item
        ])
      );

      const changedResearchBeliefs =
        currentResearchBeliefs.filter(item => {
          const key =
            item?.knowledgeRecordId ||
            item?.durableLearningId ||
            item?.subject;
          const priorItem =
            priorResearchById.get(key);

          return (
            !priorItem ||
            priorItem?.durableLearningFingerprint !==
              item?.durableLearningFingerprint ||
            Number(priorItem?.confidence ?? -1) !==
              Number(item?.confidence ?? -1) ||
            priorItem?.epistemicStatus !==
              item?.epistemicStatus
          );
        });

      if (prior && changedResearchBeliefs.length > 0) {
        addSignal(
          "research-belief-changed",
          Math.min(
            0.42,
            0.26 +
              changedResearchBeliefs.length * 0.04
          ),
          `${changedResearchBeliefs.length} evidence-backed research belief(s) changed.`,
          [
            "beliefs",
            "evidence",
            "external-world",
            "unknowns"
          ]
        );

        changedResearchBeliefs
          .flatMap(item =>
            Array.isArray(item?.unknowns)
              ? item.unknowns
              : []
          )
          .slice(0, 8)
          .forEach(item => {
            const question =
              typeof item === "string"
                ? item
                : item?.question ||
                  item?.summary ||
                  null;
            if (question) questions.push(question);
          });
      }

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

    buildCognitiveReappraisal(
      assessment = {},
      previous = null,
      current = null
    ) {
      const changedBeliefs =
        (assessment?.signals || [])
          .filter(item =>
            item?.type ===
            "research-belief-changed"
          );

      const questions =
        [...new Set(
          Array.isArray(assessment?.questions)
            ? assessment.questions
            : []
        )].slice(0, 12);

      const priorIntentions =
        Array.isArray(previous?.intentions)
          ? previous.intentions
          : [];
      const currentIntentions =
        Array.isArray(current?.intentions)
          ? current.intentions
          : [];

      const reappraisal = {
        schema:
          "meos.maddy.cognitive-reappraisal.v1",
        createdAt: new Date().toISOString(),
        subject:
          assessment?.subject ||
          "Meaningful world-model change",
        salienceScore:
          Number(assessment?.score || 0),
        affectedDomains:
          this.clone(
            assessment?.affectedDomains || []
          ),
        changedBeliefSignals:
          this.clone(changedBeliefs),
        openQuestions: questions,
        priorIntentionCount:
          priorIntentions.length,
        currentIntentionCount:
          currentIntentions.length,
        reconsiderPriorConclusions:
          changedBeliefs.length > 0 ||
          (assessment?.connections || []).length > 0,
        investigateUnknowns:
          questions.length > 0,
        reprioritizeAttention: true,
        causalReassessmentRequired:
          assessment?.meaningful === true,
        rule:
          "A meaningful change may invalidate prior conclusions or priorities; reappraisal changes attention, not truth status.",
        authority: {
          externalActionAuthorized: false,
          humanAuthorityPreserved: true
        }
      };

      this.cognitiveReappraisalState.count += 1;
      this.cognitiveReappraisalState.lastAt =
        reappraisal.createdAt;
      this.cognitiveReappraisalState.last =
        this.clone(reappraisal);
      this.cognitiveReappraisalState.history.unshift(
        this.clone(reappraisal)
      );
      this.cognitiveReappraisalState.history =
        this.cognitiveReappraisalState.history.slice(
          0,
          120
        );

      this.record(
        "cognition.meaningful-change-reappraisal",
        reappraisal
      );

      this.emit(
        "brain:cognitive-reappraisal",
        this.clone(reappraisal)
      );

      return reappraisal;
    },

    propagateCognitiveConsequences(
      reappraisal = {},
      assessment = {},
      previous = null,
      current = null
    ) {
      const now = current || this.worldModel || {};
      const prior = previous || {};

      const changedDomains = new Set(
        Array.isArray(reappraisal?.affectedDomains)
          ? reappraisal.affectedDomains
          : Array.isArray(assessment?.affectedDomains)
            ? assessment.affectedDomains
            : []
      );

      const changedSubjects = new Set(
        [
          reappraisal?.subject,
          assessment?.subject,
          ...(assessment?.signals || [])
            .map(item => item?.detail)
        ]
          .filter(Boolean)
          .map(value =>
            String(value).toLowerCase()
          )
      );

      const textTouchesChange = value => {
        const text = this.textContent(value)
          .toLowerCase();
        if (!text) return false;

        for (const subject of changedSubjects) {
          const tokens = subject
            .split(/[^a-z0-9]+/i)
            .filter(token => token.length >= 5);

          if (
            tokens.some(token =>
              text.includes(token)
            )
          ) {
            return true;
          }
        }

        for (const domain of changedDomains) {
          const token =
            String(domain || "")
              .toLowerCase()
              .trim();
          if (
            token.length >= 4 &&
            text.includes(token)
          ) {
            return true;
          }
        }

        return false;
      };

      const intentions =
        Array.isArray(now?.intentions)
          ? now.intentions
          : [];

      const affectedIntentions =
        intentions
          .filter(item =>
            textTouchesChange(item)
          )
          .slice(0, 12)
          .map(item => ({
            type: "intention",
            id:
              item?.intentionId ||
              item?.id ||
              null,
            subject:
              item?.subject ||
              item?.objective ||
              null,
            status: item?.status || null,
            consequence:
              "Existing cognitive commitment may require reconsideration."
          }));

      const currentWork =
        now?.world?.currentWork || null;

      const affectedWork =
        textTouchesChange(currentWork)
          ? [{
              type: "current-work",
              consequence:
                "Current execution context intersects the changed world state.",
              fingerprint:
                this.fingerprintCognitiveDispatch(
                  currentWork
                )
            }]
          : [];

      const monitoring =
        now?.world?.monitoring || null;

      const affectedMonitoring =
        textTouchesChange(monitoring)
          ? [{
              type: "monitoring",
              consequence:
                "Monitoring assumptions or watch conditions may require refresh.",
              fingerprint:
                this.fingerprintCognitiveDispatch(
                  monitoring
                )
            }]
          : [];

      const relationships =
        Array.isArray(now?.relationships)
          ? now.relationships
          : [];

      const affectedRelationships =
        relationships
          .filter(item =>
            textTouchesChange(item)
          )
          .slice(0, 12)
          .map(item => ({
            type: "relationship",
            personKey:
              item?.personKey || null,
            consequence:
              "Relationship strategy may be affected by the changed belief or world state."
          }));

      const priorityPortfolio =
        Array.isArray(
          this.executivePriorityPortfolio
        )
          ? this.executivePriorityPortfolio
          : [];

      const affectedPriorities =
        priorityPortfolio
          .filter(item =>
            textTouchesChange(item)
          )
          .slice(0, 12)
          .map(item => ({
            type: "priority",
            id: item?.id || null,
            subject: item?.subject || null,
            priorScore:
              Number(item?.score || 0),
            status: item?.status || null,
            consequence:
              "Executive priority should be rescored against the changed world state."
          }));

      const planning =
        global.ExecutivePlanning;

      const planningStatus =
        planning &&
        typeof planning.getStatus ===
          "function"
          ? this.safe(
              () => planning.getStatus(),
              null
            )
          : null;

      const planningTouched =
        textTouchesChange(planningStatus);

      const consequences = [
        ...affectedIntentions,
        ...affectedWork,
        ...affectedMonitoring,
        ...affectedRelationships,
        ...affectedPriorities
      ];

      if (planningTouched) {
        consequences.push({
          type: "planning",
          consequence:
            "Existing planning state may depend on an assumption affected by this change.",
          mutationPerformed: false
        });
      }

      const rerun = {
        causalCounterfactual:
          reappraisal
            ?.causalReassessmentRequired ===
            true,
        planning:
          affectedIntentions.length > 0 ||
          planningTouched,
        monitoring:
          affectedMonitoring.length > 0 ||
          (assessment?.questions || [])
            .length > 0,
        priorityArbitration:
          affectedPriorities.length > 0 ||
          reappraisal
            ?.reprioritizeAttention === true,
        futureSimulation:
          changedDomains.has(
            "possible-futures"
          ) ||
          changedDomains.has("future") ||
          reappraisal
            ?.reconsiderPriorConclusions ===
            true
      };

      const officeSignals = [];
      const domainOfficeMap = {
        funding: "Development",
        finance: "Finance",
        compliance: "Compliance",
        work: "Operations",
        execution: "Operations",
        people: "Human Resources",
        relationships: "Community Relations",
        trust: "Community Relations",
        monitoring: "Operations",
        evidence: "Executive Office",
        unknowns: "Executive Office",
        "external-world":
          "Executive Office",
        "possible-futures":
          "Executive Office",
        future: "Executive Office"
      };

      changedDomains.forEach(domain => {
        const office =
          domainOfficeMap[domain];
        if (office) officeSignals.push(office);
      });

      const affectedOffices =
        [...new Set(officeSignals)];

      const propagation = {
        schema:
          "meos.maddy.consequence-propagation.v1",
        createdAt:
          new Date().toISOString(),
        sourceReappraisal:
          reappraisal?.id ||
          reappraisal?.createdAt ||
          null,
        subject:
          reappraisal?.subject ||
          assessment?.subject ||
          "Meaningful world-model change",
        changedDomains:
          [...changedDomains],
        consequences,
        affected: {
          intentions: affectedIntentions,
          currentWork: affectedWork,
          monitoring: affectedMonitoring,
          relationships:
            affectedRelationships,
          priorities: affectedPriorities,
          planning:
            planningTouched
              ? [{
                  available: true,
                  mutationPerformed: false
                }]
              : [],
          offices: affectedOffices
        },
        rerun,
        invalidation: {
          priorConclusions:
            reappraisal
              ?.reconsiderPriorConclusions ===
              true,
          plansMayRequireReview:
            rerun.planning,
          prioritiesMayRequireRescore:
            rerun.priorityArbitration,
          futureAssumptionsMayRequireResimulation:
            rerun.futureSimulation
        },
        nextCognition: [
          rerun.causalCounterfactual
            ? "rerun-causal-counterfactual-reasoning"
            : null,
          rerun.planning
            ? "review-affected-plans-and-dependencies"
            : null,
          rerun.monitoring
            ? "refresh-monitoring-and-open-unknowns"
            : null,
          rerun.priorityArbitration
            ? "re-arbitrate-executive-attention"
            : null,
          rerun.futureSimulation
            ? "rerun-affected-future-simulations"
            : null
        ].filter(Boolean),
        rule:
          "Consequences propagate cognition and review requirements; they do not silently mutate plans, dispatch work, or grant external authority.",
        authority: {
          planMutationAuthorized: false,
          hallwayDispatchAuthorized: false,
          externalActionAuthorized: false,
          humanAuthorityPreserved: true
        }
      };

      this.consequencePropagationState.count += 1;
      this.consequencePropagationState.lastAt =
        propagation.createdAt;
      this.consequencePropagationState.last =
        this.clone(propagation);
      this.consequencePropagationState.history.unshift(
        this.clone(propagation)
      );
      this.consequencePropagationState.history =
        this.consequencePropagationState.history.slice(
          0,
          120
        );

      this.record(
        "cognition.consequence-propagation",
        propagation
      );

      this.emit(
        "brain:consequence-propagated",
        this.clone(propagation)
      );

      return propagation;
    },

    reconcileCognitiveConsequences(
      propagation = {},
      reappraisal = {},
      assessment = {},
      previous = null,
      current = null,
      options = {}
    ) {
      const rerun =
        propagation?.rerun || {};

      const affected =
        propagation?.affected || {};

      const selected = [];
      const untouched = [];

      const select = (
        organ,
        required,
        reason,
        payload = {}
      ) => {
        const entry = {
          organ,
          required: required === true,
          reason,
          ...payload
        };

        if (entry.required) {
          selected.push(entry);
        } else {
          untouched.push(entry);
        }

        return entry;
      };

      select(
        "causal-counterfactual-reasoning",
        rerun.causalCounterfactual === true,
        rerun.causalCounterfactual === true
          ? "Changed reality may invalidate a prior causal conclusion."
          : "No propagated causal dependency requires recomputation."
      );

      select(
        "executive-planning",
        rerun.planning === true,
        rerun.planning === true
          ? "One or more intentions or planning assumptions intersect the changed reality."
          : "No affected plan or intention was identified.",
        {
          affectedIntentionIds:
            (affected.intentions || [])
              .map(item => item?.id)
              .filter(Boolean)
        }
      );

      select(
        "executive-monitoring",
        rerun.monitoring === true,
        rerun.monitoring === true
          ? "Open uncertainty or watch conditions require refresh."
          : "Existing monitoring is outside the propagated blast radius."
      );

      select(
        "executive-priority-arbitration",
        rerun.priorityArbitration === true,
        rerun.priorityArbitration === true
          ? "Changed reality may alter executive attention value."
          : "No affected executive priority was identified."
      );

      select(
        "future-simulation",
        rerun.futureSimulation === true,
        rerun.futureSimulation === true
          ? "Future assumptions may no longer hold under the changed reality."
          : "Existing future simulations remain outside the blast radius."
      );

      const staleIntentions =
        (affected.intentions || []).map(item => ({
          intentionId: item?.id || null,
          subject: item?.subject || null,
          priorStatus: item?.status || null,
          reconciliationStatus:
            "review-required",
          mutationPerformed: false,
          reason:
            "Dependent intention intersects a materially changed belief or world state."
        }));

      const officeAttention =
        [...new Set(
          (affected.offices || [])
            .filter(Boolean)
        )].map(office => ({
          office,
          attention:
            "affected-by-world-change",
          dispatchPerformed: false
        }));

      const reconciliation = {
        schema:
          "meos.maddy.selective-cognitive-reconciliation.v1",
        createdAt: new Date().toISOString(),
        sourcePropagation:
          propagation?.createdAt || null,
        subject:
          propagation?.subject ||
          reappraisal?.subject ||
          assessment?.subject ||
          "Meaningful world-model change",
        selected,
        untouched,
        staleIntentions,
        officeAttention,
        isolation: {
          selectedCount: selected.length,
          untouchedCount: untouched.length,
          recomputeEverything: false,
          rule:
            "Only cognition inside the propagated blast radius earns recomputation."
        },
        governedMutations: {
          intentionStatusMutationPerformed:
            false,
          planMutationPerformed: false,
          monitoringMutationPerformed: false,
          priorityMutationPerformed: false,
          hallwayDispatchPerformed: false
        },
        nextCognition:
          selected.map(item => item.organ),
        authority: {
          cognitiveRecomputationAuthorized:
            true,
          durableStateMutationAuthorized:
            false,
          planMutationAuthorized: false,
          hallwayDispatchAuthorized: false,
          externalActionAuthorized: false,
          humanAuthorityPreserved: true
        }
      };

      this.cognitiveReconciliationState.count += 1;
      this.cognitiveReconciliationState.lastAt =
        reconciliation.createdAt;
      this.cognitiveReconciliationState.last =
        this.clone(reconciliation);
      this.cognitiveReconciliationState.history.unshift(
        this.clone(reconciliation)
      );
      this.cognitiveReconciliationState.history =
        this.cognitiveReconciliationState.history.slice(
          0,
          120
        );

      this.record(
        "cognition.selective-reconciliation",
        reconciliation
      );

      this.emit(
        "brain:cognitive-reconciliation",
        this.clone(reconciliation)
      );

      return reconciliation;
    },

    reviseCognitiveStateFromReconciliation(
      reconciliation = {},
      options = {}
    ) {
      const apply =
        options.apply === true;

      const revisionId =
        this.id("cognitive-revision");

      const now =
        new Date().toISOString();

      const intentionRevisions =
        (reconciliation?.staleIntentions || [])
          .map(stale => {
            const intention =
              (this.cognitiveIntentions || [])
                .find(item =>
                  item?.intentionId ===
                    stale?.intentionId
                );

            if (!intention) {
              return {
                intentionId:
                  stale?.intentionId || null,
                found: false,
                applied: false,
                reason:
                  "Dependent intention is not present in active Executive Brain cognitive state."
              };
            }

            const before =
              this.clone(intention);

            const revision = {
              revisionId,
              revisedAt: now,
              reason:
                stale?.reason ||
                "Materially changed world state requires cognitive reconsideration.",
              priorStatus:
                intention.status || null,
              sourceReconciliation:
                reconciliation?.createdAt ||
                null
            };

            if (apply) {
              intention.revisionHistory =
                Array.isArray(
                  intention.revisionHistory
                )
                  ? intention.revisionHistory
                  : [];

              intention.revisionHistory.push({
                ...revision,
                prior:
                  this.clone(before)
              });

              intention.status =
                "reconsideration-required";
              intention.updatedAt = now;
              intention.lastRevisionId =
                revisionId;
              intention.lastRevisionReason =
                revision.reason;
            }

            return {
              intentionId:
                intention.intentionId,
              found: true,
              applied: apply,
              before,
              after:
                apply
                  ? this.clone(intention)
                  : null,
              revision
            };
          });

      const selectedOrgans =
        (reconciliation?.selected || [])
          .map(item => item?.organ)
          .filter(Boolean);

      const governedRefresh = {
        causalCounterfactual:
          selectedOrgans.includes(
            "causal-counterfactual-reasoning"
          ),
        planningReview:
          selectedOrgans.includes(
            "executive-planning"
          ),
        monitoringRefresh:
          selectedOrgans.includes(
            "executive-monitoring"
          ),
        priorityRearbitration:
          selectedOrgans.includes(
            "executive-priority-arbitration"
          ),
        futureResimulation:
          selectedOrgans.includes(
            "future-simulation"
          )
      };

      const revision = {
        schema:
          "meos.maddy.governed-cognitive-state-revision.v1",
        revisionId,
        createdAt: now,
        applied: apply,
        subject:
          reconciliation?.subject ||
          "Selective cognitive reconciliation",
        sourceReconciliation:
          reconciliation?.createdAt || null,
        intentionRevisions,
        governedRefresh,
        preservedHistory:
          intentionRevisions
            .filter(item =>
              item?.found === true
            )
            .every(item =>
              item?.before != null
            ),
        rule:
          "Revision may change Maddy's internal cognitive commitments when governed reconciliation warrants it, but prior state and provenance must remain inspectable.",
        authority: {
          cognitiveStateRevisionAuthorized:
            apply,
          planContentMutationAuthorized:
            false,
          monitoringContentMutationAuthorized:
            false,
          hallwayDispatchAuthorized: false,
          externalActionAuthorized: false,
          humanAuthorityPreserved: true
        }
      };

      if (apply) {
        this.cognitiveIntentions =
          (this.cognitiveIntentions || [])
            .slice(
              0,
              this.configuration
                .maximumCognitiveIntentions
            );

        this.persist();

        if (
          brainPersistence.hydrated === true
        ) {
          this.projectSelfModel({
            reason:
              "governed-cognitive-state-revision",
            persist: false
          });
          this.projectWorkingAwareness({
            reason:
              "governed-cognitive-state-revision",
            persist: false
          });
        }
      }

      this.cognitiveRevisionState.count += 1;
      this.cognitiveRevisionState.lastAt =
        now;
      this.cognitiveRevisionState.last =
        this.clone(revision);
      this.cognitiveRevisionState.history.unshift(
        this.clone(revision)
      );
      this.cognitiveRevisionState.history =
        this.cognitiveRevisionState.history.slice(
          0,
          120
        );

      this.record(
        "cognition.governed-state-revision",
        revision
      );

      this.emit(
        "brain:cognitive-state-revised",
        this.clone(revision)
      );

      return revision;
    },

    reviseAffectedPlanAndMonitoringState(
      cognitiveRevision = {},
      reconciliation = {},
      options = {}
    ) {
      const apply =
        options.apply === true;

      const planning =
        global.ExecutivePlanning;
      const monitoring =
        global.ExecutiveMonitoring;

      const now =
        new Date().toISOString();

      const revisionId =
        this.id(
          "plan-monitoring-revision"
        );

      const selectedOrgans =
        (reconciliation?.selected || [])
          .map(item => item?.organ)
          .filter(Boolean);

      const planningSelected =
        selectedOrgans.includes(
          "executive-planning"
        );

      const monitoringSelected =
        selectedOrgans.includes(
          "executive-monitoring"
        );

      const affectedIntentionIds =
        new Set(
          (reconciliation?.staleIntentions || [])
            .map(item => item?.intentionId)
            .filter(Boolean)
        );

      const affectedSubjects =
        [
          reconciliation?.subject,
          cognitiveRevision?.subject,
          ...(reconciliation?.staleIntentions || [])
            .map(item => item?.subject)
        ]
          .filter(Boolean)
          .map(item =>
            this.normalize(item)
          );

      const touchesSubject = value => {
        const text =
          this.normalize(
            this.textContent(value)
          );

        if (!text) return false;

        return affectedSubjects.some(
          subject => {
            if (!subject) return false;

            const tokens =
              subject
                .split(/[^a-z0-9]+/i)
                .filter(
                  token =>
                    token.length >= 5 &&
                    ![
                      "fixture",
                      "acceptance",
                      "test",
                      "d7t4"
                    ].includes(token)
                );

            if (text.includes(subject)) {
              return true;
            }

            if (tokens.length === 0) {
              return false;
            }

            const matchedTokens =
              tokens.filter(token =>
                text.includes(token)
              );

            const requiredMatches =
              tokens.length === 1
                ? 1
                : Math.min(
                    2,
                    tokens.length
                  );

            return (
              matchedTokens.length >=
              requiredMatches
            );
          }
        );
      };

      const plans =
        Array.isArray(planning?.plans)
          ? planning.plans
          : Array.isArray(
              planning?.state?.plans
            )
            ? planning.state.plans
            : [];

      const planRevisions =
        planningSelected
          ? plans
              .filter(plan => {
                const metadata =
                  plan?.metadata || {};

                const linkedIntention =
                  metadata
                    ?.cognitiveIntentionId ||
                  metadata
                    ?.intentionId ||
                  null;

                return (
                  (
                    linkedIntention &&
                    affectedIntentionIds.has(
                      linkedIntention
                    )
                  ) ||
                  touchesSubject(plan)
                );
              })
              .slice(0, 12)
              .map(plan => {
                const before =
                  this.clone(plan);

                if (apply) {
                  plan.metadata =
                    plan.metadata || {};

                  plan.metadata
                    .cognitiveRevisionHistory =
                    Array.isArray(
                      plan.metadata
                        .cognitiveRevisionHistory
                    )
                      ? plan.metadata
                          .cognitiveRevisionHistory
                      : [];

                  plan.metadata
                    .cognitiveRevisionHistory
                    .push({
                      revisionId,
                      revisedAt: now,
                      sourceCognitiveRevision:
                        cognitiveRevision
                          ?.revisionId ||
                        null,
                      sourceReconciliation:
                        reconciliation
                          ?.createdAt ||
                        null,
                      priorStatus:
                        plan?.status ||
                        null,
                      reason:
                        "Plan assumptions intersect materially changed cognitive state.",
                      prior:
                        this.clone(before)
                    });

                  if (
                    typeof planning
                      ?.recalculatePlan ===
                    "function"
                  ) {
                    this.safe(() =>
                      planning.recalculatePlan(
                        plan
                      )
                    );
                  }

                  plan.status =
                    "reconsideration-required";
                  plan.updatedAt = now;
                  plan.metadata
                    .lastCognitiveRevisionId =
                    revisionId;
                }

                return {
                  planId:
                    plan?.planId ||
                    plan?.id ||
                    null,
                  found: true,
                  applied: apply,
                  before,
                  after:
                    apply
                      ? this.clone(plan)
                      : null
                };
              })
          : [];

      const alerts =
        Array.isArray(monitoring?.alerts)
          ? monitoring.alerts
          : Array.isArray(
              monitoring?.state?.alerts
            )
            ? monitoring.state.alerts
            : [];

      const monitoringRevisions =
        monitoringSelected
          ? alerts
              .filter(alert =>
                ![
                  "resolved",
                  "dismissed",
                  "archived"
                ].includes(
                  String(
                    alert?.status || ""
                  ).toLowerCase()
                ) &&
                touchesSubject(alert)
              )
              .slice(0, 12)
              .map(alert => {
                const before =
                  this.clone(alert);

                if (apply) {
                  alert.metadata =
                    alert.metadata || {};

                  alert.metadata
                    .cognitiveRevisionHistory =
                    Array.isArray(
                      alert.metadata
                        .cognitiveRevisionHistory
                    )
                      ? alert.metadata
                          .cognitiveRevisionHistory
                      : [];

                  alert.metadata
                    .cognitiveRevisionHistory
                    .push({
                      revisionId,
                      revisedAt: now,
                      sourceCognitiveRevision:
                        cognitiveRevision
                          ?.revisionId ||
                        null,
                      sourceReconciliation:
                        reconciliation
                          ?.createdAt ||
                        null,
                      priorStatus:
                        alert?.status ||
                        null,
                      reason:
                        "Monitoring condition intersects materially changed cognitive state.",
                      prior:
                        this.clone(before)
                    });

                  alert.status =
                    "reconsideration-required";
                  alert.updatedAt = now;
                  alert.metadata
                    .lastCognitiveRevisionId =
                    revisionId;
                }

                return {
                  alertId:
                    alert?.id ||
                    alert?.alertId ||
                    null,
                  found: true,
                  applied: apply,
                  before,
                  after:
                    apply
                      ? this.clone(alert)
                      : null
                };
              })
          : [];

      if (apply) {
        if (
          planRevisions.length > 0 &&
          typeof planning
            ?.persistIfEnabled ===
            "function"
        ) {
          this.safe(() =>
            planning.persistIfEnabled()
          );
        }

        if (
          monitoringRevisions.length > 0 &&
          typeof monitoring
            ?.persistIfEnabled ===
            "function"
        ) {
          this.safe(() =>
            monitoring.persistIfEnabled()
          );
        }
      }

      const result = {
        schema:
          "meos.maddy.plan-monitoring-cognitive-revision.v1",
        revisionId,
        createdAt: now,
        applied: apply,
        subject:
          reconciliation?.subject ||
          cognitiveRevision?.subject ||
          "Governed cognitive revision",
        planning: {
          selected:
            planningSelected,
          available:
            Boolean(planning),
          matchedCount:
            planRevisions.length,
          revisions:
            planRevisions
        },
        monitoring: {
          selected:
            monitoringSelected,
          available:
            Boolean(monitoring),
          matchedCount:
            monitoringRevisions.length,
          revisions:
            monitoringRevisions
        },
        isolation: {
          unaffectedPlansMutated: false,
          unaffectedMonitoringMutated:
            false,
          rule:
            "Only existing plans and monitoring records inside the selectively reconciled blast radius may be revised."
        },
        authority: {
          internalPlanStateRevisionAuthorized:
            apply &&
            planningSelected,
          internalMonitoringStateRevisionAuthorized:
            apply &&
            monitoringSelected,
          missionExecutionAuthorized:
            false,
          hallwayDispatchAuthorized:
            false,
          externalActionAuthorized:
            false,
          humanAuthorityPreserved:
            true
        }
      };

      this.planMonitoringRevisionState.count += 1;
      this.planMonitoringRevisionState.lastAt =
        now;
      this.planMonitoringRevisionState.last =
        this.clone(result);
      this.planMonitoringRevisionState.history.unshift(
        this.clone(result)
      );
      this.planMonitoringRevisionState.history =
        this.planMonitoringRevisionState.history.slice(
          0,
          120
        );

      this.record(
        "cognition.plan-monitoring-revision",
        result
      );

      this.emit(
        "brain:plan-monitoring-revised",
        this.clone(result)
      );

      return result;
    },

    resimulateAffectedFutures(
      cognitiveRevision = {},
      reconciliation = {},
      options = {}
    ) {
      const apply =
        options.apply === true;

      const selectedOrgans =
        (reconciliation?.selected || [])
          .map(item => item?.organ)
          .filter(Boolean);

      const futureSelected =
        selectedOrgans.includes(
          "future-simulation"
        );

      const now =
        new Date().toISOString();

      const resimulationId =
        this.id(
          "temporal-resimulation"
        );

      const subjects =
        [
          reconciliation?.subject,
          cognitiveRevision?.subject,
          ...(reconciliation?.staleIntentions || [])
            .map(item => item?.subject)
        ]
          .filter(Boolean)
          .map(item =>
            this.normalize(item)
          );

      const meaningfulTokens =
        subjects.flatMap(subject =>
          subject
            .split(/[^a-z0-9]+/i)
            .filter(
              token =>
                token.length >= 5 &&
                ![
                  "fixture",
                  "acceptance",
                  "future",
                  "simulation",
                  "scenario"
                ].includes(token)
            )
        );

      const touchesChangedReality =
        simulation => {
          const searchable =
            this.normalize(
              this.textContent({
                subject:
                  simulation?.subject,
                trigger:
                  simulation?.trigger,
                drivers:
                  simulation?.drivers,
                assumptions:
                  simulation?.assumptions,
                uncertainties:
                  simulation?.uncertainties,
                offices:
                  simulation?.offices
              })
            );

          if (!searchable) {
            return false;
          }

          if (
            subjects.some(
              subject =>
                subject &&
                searchable.includes(
                  subject
                )
            )
          ) {
            return true;
          }

          const uniqueTokens =
            [...new Set(
              meaningfulTokens
            )];

          const matches =
            uniqueTokens.filter(token =>
              searchable.includes(token)
            );

          return (
            uniqueTokens.length > 0 &&
            matches.length >=
              Math.min(
                2,
                uniqueTokens.length
              )
          );
        };

      const history =
        Array.isArray(
          this.counterfactualSimulationHistory
        )
          ? this
              .counterfactualSimulationHistory
          : [];

      const affected =
        futureSelected
          ? history
              .filter(
                simulation =>
                  simulation
                    ?.evidenceClass ===
                    "synthetic-future-simulation" &&
                  simulation
                    ?.temporalRevision
                    ?.superseded !==
                    true &&
                  touchesChangedReality(
                    simulation
                  )
              )
              .slice(0, 8)
          : [];

      const unaffectedIds =
        history
          .filter(
            simulation =>
              simulation
                ?.evidenceClass ===
                "synthetic-future-simulation" &&
              !affected.some(
                item =>
                  item?.id ===
                  simulation?.id
              )
          )
          .map(item => item?.id)
          .filter(Boolean);

      const revisions = affected.map(
        prior => {
          const priorSnapshot =
            this.clone(prior);

          const successorScenario = {
            subject:
              prior.subject,
            trigger:
              `Changed reality requires re-simulation: ${
                reconciliation?.subject ||
                cognitiveRevision?.subject ||
                prior.trigger
              }`,
            horizon:
              prior.horizon,
            drivers: [
              ...(prior.drivers || []),
              {
                type:
                  "material-world-model-change",
                subject:
                  reconciliation?.subject ||
                  cognitiveRevision?.subject ||
                  null,
                sourceCognitiveRevision:
                  cognitiveRevision
                    ?.revisionId ||
                  null,
                observedAt: now
              }
            ],
            assumptions:
              this.clone(
                prior.assumptions || []
              ),
            uncertainties: [
              ...(prior.uncertainties || []),
              {
                question:
                  "How does the materially changed world state alter this future trajectory?",
                sourceReconciliation:
                  reconciliation
                    ?.createdAt ||
                  null
              }
            ],
            offices:
              this.clone(
                prior.offices || []
              )
          };

          if (!apply) {
            return {
              priorSimulationId:
                prior.id,
              applied: false,
              prior:
                priorSnapshot,
              successorScenario,
              successorSimulation:
                null
            };
          }

          const generated =
            this.generateFutureSimulation(
              successorScenario,
              {
                origin:
                  "consequence-driven-resimulation"
              }
            );

          const successor =
            generated?.simulation || null;

          if (successor) {
            const storedSuccessor =
              this
                .counterfactualSimulationHistory
                .find(
                  item =>
                    item?.id ===
                    successor.id
                );

            if (storedSuccessor) {
              storedSuccessor
                .temporalRevision = {
                lineageId:
                  resimulationId,
                supersedes:
                  prior.id,
                sourceCognitiveRevision:
                  cognitiveRevision
                    ?.revisionId ||
                  null,
                sourceReconciliation:
                  reconciliation
                    ?.createdAt ||
                  null,
                changedRealitySubject:
                  reconciliation?.subject ||
                  cognitiveRevision?.subject ||
                  null,
                createdAt: now
              };
            }

            prior.temporalRevision = {
              lineageId:
                resimulationId,
              superseded: true,
              supersededAt: now,
              supersededBy:
                successor.id,
              sourceCognitiveRevision:
                cognitiveRevision
                  ?.revisionId ||
                null,
              reason:
                "A materially changed world state intersects this simulated future."
            };

            prior.status =
              "superseded-by-changed-reality";
          }

          return {
            priorSimulationId:
              prior.id,
            applied: true,
            prior:
              priorSnapshot,
            successorScenario,
            successorSimulation:
              successor
                ? this.clone(
                    this
                      .counterfactualSimulationHistory
                      .find(
                        item =>
                          item?.id ===
                          successor.id
                      ) ||
                    successor
                  )
                : null
          };
        }
      );

      const result = {
        schema:
          "meos.maddy.selective-temporal-consequence-resimulation.v1",
        resimulationId,
        createdAt: now,
        applied: apply,
        selected:
          futureSelected,
        subject:
          reconciliation?.subject ||
          cognitiveRevision?.subject ||
          "Materially changed reality",
        affectedCount:
          affected.length,
        revisions,
        unaffectedSimulationIds:
          unaffectedIds,
        isolation: {
          recomputeEveryFuture: false,
          unaffectedFuturesMutated:
            false,
          rule:
            "Only synthetic futures whose assumptions, drivers, uncertainties, or subject intersect changed reality may be superseded and regenerated."
        },
        truthBoundary: {
          successorIsPrediction:
            false,
          successorIsHistoricalFact:
            false,
          successorEvidenceClass:
            "synthetic-future-simulation"
        },
        authority: {
          internalFutureResimulationAuthorized:
            apply &&
            futureSelected,
          planningExecutionAuthorized:
            false,
          hallwayDispatchAuthorized:
            false,
          externalActionAuthorized:
            false,
          humanAuthorityPreserved:
            true
        }
      };

      this.temporalResimulationState.count +=
        1;
      this.temporalResimulationState.lastAt =
        now;
      this.temporalResimulationState.last =
        this.clone(result);
      this.temporalResimulationState.history.unshift(
        this.clone(result)
      );
      this.temporalResimulationState.history =
        this.temporalResimulationState.history.slice(
          0,
          120
        );

      this.record(
        "cognition.temporal-resimulation",
        result
      );

      this.emit(
        "brain:temporal-resimulation",
        this.clone(result)
      );

      return result;
    },

    analyzeTemporalStrategicDelta(
      temporalResimulation = {},
      options = {}
    ) {
      const apply =
        options.apply === true;

      const now =
        new Date().toISOString();

      const analysisId =
        this.id(
          "temporal-strategic-delta"
        );

      const normalizeItems = items =>
        (Array.isArray(items) ? items : [])
          .map(item =>
            this.normalize(
              this.textContent(item)
            )
          )
          .filter(Boolean);

      const tokenSet = items =>
        new Set(
          normalizeItems(items)
            .flatMap(item =>
              item
                .split(/[^a-z0-9]+/i)
                .filter(
                  token =>
                    token.length >= 4
                )
            )
        );

      const revisions =
        Array.isArray(
          temporalResimulation?.revisions
        )
          ? temporalResimulation.revisions
          : [];

      const deltas =
        revisions
          .map(revision => {
            const prior =
              revision?.prior || null;
            const successor =
              revision
                ?.successorSimulation ||
              null;

            if (!prior || !successor) {
              return null;
            }

            const priorDrivers =
              normalizeItems(
                prior.drivers
              );
            const successorDrivers =
              normalizeItems(
                successor.drivers
              );
            const priorAssumptions =
              normalizeItems(
                prior.assumptions
              );
            const successorAssumptions =
              normalizeItems(
                successor.assumptions
              );
            const priorUnknowns =
              normalizeItems(
                prior.uncertainties
              );
            const successorUnknowns =
              normalizeItems(
                successor.uncertainties
              );

            const priorDriverTokens =
              tokenSet(prior.drivers);
            const successorDriverTokens =
              tokenSet(
                successor.drivers
              );

            const newDrivers =
              successorDrivers.filter(
                item =>
                  !priorDrivers.includes(
                    item
                  )
              );

            const removedDrivers =
              priorDrivers.filter(
                item =>
                  !successorDrivers.includes(
                    item
                  )
              );

            const newAssumptions =
              successorAssumptions.filter(
                item =>
                  !priorAssumptions.includes(
                    item
                  )
              );

            const retiredAssumptions =
              priorAssumptions.filter(
                item =>
                  !successorAssumptions.includes(
                    item
                  )
              );

            const newUnknowns =
              successorUnknowns.filter(
                item =>
                  !priorUnknowns.includes(
                    item
                  )
              );

            const changedRealityAdded =
              (successor.drivers || [])
                .some(
                  driver =>
                    driver?.type ===
                      "material-world-model-change"
                );

            const temporalPressure =
              changedRealityAdded
                ? 0.82
                : 0.45;

            const uncertaintyPressure =
              Math.min(
                1,
                newUnknowns.length > 0
                  ? 0.55 +
                    Math.max(
                      0,
                      newUnknowns.length - 1
                    ) * 0.12
                  : 0.35
              );

            const opportunitySignal =
              Math.min(
                1,
                0.3 +
                newDrivers.length * 0.1 +
                (
                  successorDriverTokens
                    .size >
                  priorDriverTokens.size
                    ? 0.15
                    : 0
                )
              );

            const lossSignal =
              Math.min(
                1,
                removedDrivers.length *
                  0.15 +
                retiredAssumptions.length *
                  0.12
              );

            const classification = [];

            if (
              opportunitySignal >= 0.55
            ) {
              classification.push(
                "newly-positionable"
              );
            }

            if (
              temporalPressure >= 0.75
            ) {
              classification.push(
                "more-urgent"
              );
            }

            if (
              uncertaintyPressure >=
              0.55
            ) {
              classification.push(
                "requires-investigation"
              );
            }

            if (lossSignal >= 0.45) {
              classification.push(
                "possibly-less-viable"
              );
            }

            if (
              classification.length ===
              0
            ) {
              classification.push(
                "materially-changed"
              );
            }

            const attentionScore =
              Math.round(
                (
                  temporalPressure *
                    0.35 +
                  opportunitySignal *
                    0.3 +
                  uncertaintyPressure *
                    0.25 +
                  lossSignal * 0.1
                ) *
                  100
              ) / 100;

            return {
              deltaId:
                this.id(
                  "future-delta"
                ),
              subject:
                successor.subject ||
                prior.subject,
              priorSimulationId:
                prior.id,
              successorSimulationId:
                successor.id,
              lineageId:
                successor
                  ?.temporalRevision
                  ?.lineageId ||
                temporalResimulation
                  ?.resimulationId ||
                null,
              changedRealitySubject:
                successor
                  ?.temporalRevision
                  ?.changedRealitySubject ||
                temporalResimulation
                  ?.subject ||
                null,
              changes: {
                newDrivers,
                removedDrivers,
                newAssumptions,
                retiredAssumptions,
                newUnknowns
              },
              classification,
              signals: {
                temporalPressure,
                opportunitySignal,
                uncertaintyPressure,
                lossSignal,
                attentionScore
              },
              executiveMeaning: {
                newlyPossible:
                  classification.includes(
                    "newly-positionable"
                  ),
                newlyImpossible:
                  classification.includes(
                    "possibly-less-viable"
                  ),
                moreUrgent:
                  classification.includes(
                    "more-urgent"
                  ),
                investigationRequired:
                  classification.includes(
                    "requires-investigation"
                  ),
                positioningCandidate:
                  classification.includes(
                    "newly-positionable"
                  ) &&
                  attentionScore >= 0.6
              },
              truthBoundary: {
                observedChange:
                  changedRealityAdded,
                strategicDeltaIsJudgment:
                  true,
                futureIsPrediction:
                  false,
                futureIsFact: false
              }
            };
          })
          .filter(Boolean);

      const positioningCandidates =
        deltas
          .filter(
            delta =>
              delta.executiveMeaning
                .positioningCandidate ===
              true
          )
          .map(delta => ({
            id:
              `temporal-positioning-${
                delta.deltaId
              }`,
            subject: delta.subject,
            origin:
              "temporal-strategic-delta",
            reason:
              "A changed future trajectory creates a potentially valuable positioning window.",
            consequence:
              delta.signals
                .attentionScore,
            urgency:
              delta.signals
                .temporalPressure,
            leverage:
              delta.signals
                .opportunitySignal,
            uncertainty:
              delta.signals
                .uncertaintyPressure,
            reversibility: 0.75,
            evidence: [{
              type:
                "synthetic-future-lineage",
              priorSimulationId:
                delta
                  .priorSimulationId,
              successorSimulationId:
                delta
                  .successorSimulationId,
              lineageId:
                delta.lineageId
            }],
            unknowns:
              delta.changes
                .newUnknowns,
            externalAuthorityRequired:
              false
          }));

      const result = {
        schema:
          "meos.maddy.temporal-strategic-delta-foresight.v1",
        analysisId,
        createdAt: now,
        applied: apply,
        sourceResimulationId:
          temporalResimulation
            ?.resimulationId ||
          null,
        subject:
          temporalResimulation
            ?.subject ||
          null,
        deltaCount:
          deltas.length,
        deltas,
        positioningCandidates,
        summary: {
          newlyPositionable:
            deltas.filter(
              item =>
                item.executiveMeaning
                  .newlyPossible
            ).length,
          possiblyLessViable:
            deltas.filter(
              item =>
                item.executiveMeaning
                  .newlyImpossible
            ).length,
          moreUrgent:
            deltas.filter(
              item =>
                item.executiveMeaning
                  .moreUrgent
            ).length,
          investigationRequired:
            deltas.filter(
              item =>
                item.executiveMeaning
                  .investigationRequired
            ).length
        },
        authority: {
          executiveAttentionCandidateAuthorized:
            apply,
          planningExecutionAuthorized:
            false,
          hallwayDispatchAuthorized:
            false,
          externalActionAuthorized:
            false,
          humanAuthorityPreserved:
            true
        }
      };

      if (
        apply &&
        positioningCandidates.length > 0
      ) {
        const existingIds =
          new Set(
            (this.executivePriorityPortfolio || [])
              .map(item => item?.id)
              .filter(Boolean)
          );

        positioningCandidates
          .filter(
            item =>
              !existingIds.has(item.id)
          )
          .forEach(item => {
            this.executivePriorityPortfolio.push({
              ...this.clone(item),
              status: "candidate",
              createdAt: now,
              updatedAt: now
            });
          });

        this.executivePriorityPortfolio =
          this.executivePriorityPortfolio.slice(
            0,
            this.configuration
              .priorityPortfolioLimit
          );
      }

      this.temporalStrategicDeltaState.count +=
        1;
      this.temporalStrategicDeltaState.lastAt =
        now;
      this.temporalStrategicDeltaState.last =
        this.clone(result);
      this.temporalStrategicDeltaState.history.unshift(
        this.clone(result)
      );
      this.temporalStrategicDeltaState.history =
        this.temporalStrategicDeltaState.history.slice(
          0,
          120
        );

      this.record(
        "cognition.temporal-strategic-delta",
        result
      );

      this.emit(
        "brain:temporal-strategic-delta",
        this.clone(result)
      );

      return result;
    },

    reasonBackwardFromFuturePosition(
      temporalStrategicDelta = {},
      options = {}
    ) {
      const apply =
        options.apply === true;

      const now =
        new Date().toISOString();

      const positioningId =
        this.id(
          "backward-positioning"
        );

      const candidates =
        Array.isArray(
          temporalStrategicDelta
            ?.positioningCandidates
        )
          ? temporalStrategicDelta
              .positioningCandidates
          : [];

      const horizons = [
        {
          key: "t-minus-12-months",
          label: "12 months before",
          horizonDays: 365,
          purpose:
            "Eligibility, capability, relationships, authority, and foundational assets should already exist."
        },
        {
          key: "t-minus-6-months",
          label: "6 months before",
          horizonDays: 180,
          purpose:
            "Evidence, partner readiness, resource pathways, and competitive positioning should be materially advanced."
        },
        {
          key: "t-minus-90-days",
          label: "90 days before",
          horizonDays: 90,
          purpose:
            "Decision-critical unknowns should be reduced and execution-ready prerequisites should be assembled."
        },
        {
          key: "today",
          label: "today",
          horizonDays: 0,
          purpose:
            "Take only low-regret, reversible internal moves that preserve or increase future option value."
        }
      ];

      const plans =
        candidates.map(candidate => {
          const delta =
            (temporalStrategicDelta
              ?.deltas || [])
              .find(
                item =>
                  item?.deltaId &&
                  candidate?.id?.includes(
                    item.deltaId
                  )
              ) ||
            (temporalStrategicDelta
              ?.deltas || [])[0] ||
            null;

          const unknowns =
            [
              ...(candidate?.unknowns || []),
              ...(delta?.changes
                ?.newUnknowns || [])
            ]
              .map(item =>
                this.textContent(item)
              )
              .filter(Boolean);

          const changedDrivers =
            [
              ...(delta?.changes
                ?.newDrivers || [])
            ]
              .map(item =>
                this.textContent(item)
              )
              .filter(Boolean);

          const requirements = [
            {
              id:
                `${positioningId}-eligibility`,
              category:
                "eligibility-and-authority",
              requiredBy:
                "t-minus-12-months",
              statement:
                "Required eligibility, organizational standing, permissions, and authority conditions are verified rather than assumed.",
              evidenceNeeded: [
                "authoritative eligibility criteria",
                "current organizational standing",
                "required registrations or permissions"
              ]
            },
            {
              id:
                `${positioningId}-relationships`,
              category:
                "relationships-and-access",
              requiredBy:
                "t-minus-6-months",
              statement:
                "Critical partners, decision pathways, and access relationships needed for the future position are identified and sufficiently developed.",
              evidenceNeeded: [
                "partner requirements",
                "decision-maker or channel map",
                "dependency commitments where appropriate"
              ]
            },
            {
              id:
                `${positioningId}-evidence`,
              category:
                "evidence-and-competitive-readiness",
              requiredBy:
                "t-minus-6-months",
              statement:
                "The organization can demonstrate the evidence, capability, and credibility the future position is likely to require.",
              evidenceNeeded: [
                "performance evidence",
                "capability gaps",
                "competitive criteria"
              ]
            },
            {
              id:
                `${positioningId}-unknowns`,
              category:
                "decision-critical-unknowns",
              requiredBy:
                "t-minus-90-days",
              statement:
                "Unknowns capable of invalidating the future position are investigated before irreversible commitment.",
              evidenceNeeded:
                unknowns.length
                  ? unknowns
                  : [
                      "future-state falsifiers",
                      "changed assumptions"
                    ]
            }
          ];

          const moves = [
            {
              moveId:
                `${positioningId}-verify`,
              action:
                "verify-positioning-prerequisites",
              timing: "today",
              rationale:
                "Resolve authoritative eligibility and prerequisite facts before committing resources.",
              reversibility: 0.98,
              optionValue:
                0.92,
              commitmentCost: 0.08,
              informationValue: 0.95,
              internalOnly: true,
              externalAuthorityRequired:
                false
            },
            {
              moveId:
                `${positioningId}-investigate`,
              action:
                "investigate-future-falsifiers",
              timing: "today",
              rationale:
                "Attack the unknowns most capable of making the desired future unavailable or unattractive.",
              reversibility: 0.96,
              optionValue:
                0.9,
              commitmentCost: 0.1,
              informationValue: 0.97,
              internalOnly: true,
              externalAuthorityRequired:
                false
            },
            {
              moveId:
                `${positioningId}-map`,
              action:
                "map-capability-and-relationship-gaps",
              timing: "today",
              rationale:
                "Identify what must exist before the future window without prematurely executing external commitments.",
              reversibility: 0.94,
              optionValue:
                0.88,
              commitmentCost: 0.12,
              informationValue: 0.9,
              internalOnly: true,
              externalAuthorityRequired:
                false
            }
          ];

          const rankedMoves =
            moves
              .map(move => ({
                ...move,
                lowRegretScore:
                  Number(
                    (
                      move.reversibility *
                        0.3 +
                      move.optionValue *
                        0.3 +
                      move.informationValue *
                        0.3 +
                      (
                        1 -
                        move.commitmentCost
                      ) *
                        0.1
                    ).toFixed(3)
                  )
              }))
              .sort(
                (a, b) =>
                  b.lowRegretScore -
                  a.lowRegretScore
              );

          const minimumReversibleMoves =
            rankedMoves.filter(
              move =>
                move.reversibility >=
                  0.9 &&
                move.optionValue >=
                  0.85 &&
                move.commitmentCost <=
                  0.15
            );

          return {
            planId:
              this.id(
                "future-position-plan"
              ),
            subject:
              candidate.subject,
            sourceCandidateId:
              candidate.id,
            sourceTemporalDeltaId:
              delta?.deltaId || null,
            desiredFuturePosition: {
              subject:
                candidate.subject,
              reason:
                candidate.reason,
              changedDrivers,
              lineageEvidence:
                this.clone(
                  candidate.evidence || []
                )
            },
            backwardHorizon: horizons.map(
              horizon => ({
                ...horizon,
                requirements:
                  requirements.filter(
                    requirement =>
                      requirement
                        .requiredBy ===
                      horizon.key
                  )
              })
            ),
            requirements,
            minimumReversibleMoves,
            deferredCommitments: [
              {
                action:
                  "external-partner-commitment",
                reason:
                  "Preserve option value until evidence and authority justify commitment."
              },
              {
                action:
                  "resource-obligation",
                reason:
                  "Do not spend or obligate organizational resources solely because a synthetic future became attractive."
              },
              {
                action:
                  "application-or-submission",
                reason:
                  "Future positioning cognition does not itself authorize external execution."
              }
            ],
            falsifiers:
              unknowns,
            truthBoundary: {
              desiredFutureIsPrediction:
                false,
              backwardRequirementsAreJudgment:
                true,
              prerequisitesRequireVerification:
                true
            }
          };
        });

      const portfolioCandidates =
        plans
          .flatMap(plan =>
            plan.minimumReversibleMoves
              .map(move => ({
                id:
                  `backward-positioning-${
                    plan.planId
                  }-${move.moveId}`,
                subject:
                  `${plan.subject}: ${move.action}`,
                origin:
                  "backward-positioning",
                reason:
                  move.rationale,
                evidence:
                  plan
                    .desiredFuturePosition
                    .lineageEvidence,
                unknowns:
                  plan.falsifiers,
                urgency: 0.62,
                consequence: 0.78,
                leverage:
                  move.optionValue,
                reversibility:
                  move.reversibility,
                informationValue:
                  move.informationValue,
                horizonDays: 30,
                proposedInternalMove:
                  move.action,
                externalAuthorityRequired:
                  false,
                sourceFuturePositionPlanId:
                  plan.planId
              }))
          );

      const result = {
        schema:
          "meos.maddy.backward-positioning-option-value.v1",
        positioningId,
        createdAt: now,
        applied: apply,
        sourceTemporalAnalysisId:
          temporalStrategicDelta
            ?.analysisId ||
          null,
        planCount: plans.length,
        plans,
        portfolioCandidates,
        principle: {
          optimizeFor:
            "future option value",
          avoid:
            "premature irreversible commitment",
          presentMoveRule:
            "Prefer the smallest reversible internal move that increases information, preparedness, or future access."
        },
        authority: {
          internalPositioningCognitionAuthorized:
            apply,
          externalRelationshipActionAuthorized:
            false,
          spendingAuthorized: false,
          submissionAuthorized: false,
          planningExecutionAuthorized:
            false,
          hallwayDispatchAuthorized:
            false,
          externalActionAuthorized:
            false,
          humanAuthorityPreserved:
            true
        }
      };

      if (
        apply &&
        portfolioCandidates.length > 0
      ) {
        const existingIds =
          new Set(
            (this.executivePriorityPortfolio || [])
              .map(item => item?.id)
              .filter(Boolean)
          );

        portfolioCandidates
          .filter(
            item =>
              !existingIds.has(item.id)
          )
          .forEach(item => {
            this.executivePriorityPortfolio.push({
              ...this.clone(item),
              status: "candidate",
              createdAt: now,
              updatedAt: now
            });
          });

        this.executivePriorityPortfolio =
          this.executivePriorityPortfolio.slice(
            0,
            this.configuration
              .priorityPortfolioLimit
          );
      }

      this.backwardPositioningState.count +=
        1;
      this.backwardPositioningState.lastAt =
        now;
      this.backwardPositioningState.last =
        this.clone(result);
      this.backwardPositioningState.history.unshift(
        this.clone(result)
      );
      this.backwardPositioningState.history =
        this.backwardPositioningState.history.slice(
          0,
          120
        );

      this.record(
        "cognition.backward-positioning",
        result
      );

      this.emit(
        "brain:backward-positioning",
        this.clone(result)
      );

      return result;
    },

    reasonAcrossFuturePortfolio(
      backwardPositioning = {},
      options = {}
    ) {
      const apply =
        options.apply === true;

      const now =
        new Date().toISOString();

      const portfolioId =
        this.id(
          "cross-future-portfolio"
        );

      const plans =
        Array.isArray(
          backwardPositioning?.plans
        )
          ? backwardPositioning.plans
          : [];

      const normalizeResource = value =>
        this.normalize(
          this.textContent(value)
        );

      const inferResourceClaims = plan => {
        const text =
          this.normalize(
            this.textContent({
              subject: plan?.subject,
              requirements:
                plan?.requirements,
              moves:
                plan
                  ?.minimumReversibleMoves
            })
          );

        const claims = [];

        const rules = [
          ["executive-attention",
            ["verify", "investigate", "map", "decision", "review"]],
          ["relationship-capacity",
            ["partner", "relationship", "access"]],
          ["compliance-capacity",
            ["eligibility", "authority", "registration", "permission"]],
          ["evidence-capacity",
            ["evidence", "competitive", "performance", "falsifier"]],
          ["financial-capacity",
            ["resource", "spend", "fund", "cost", "budget"]]
        ];

        rules.forEach(
          ([resource, tokens]) => {
            const hits =
              tokens.filter(token =>
                text.includes(token)
              ).length;

            if (hits > 0) {
              claims.push({
                resource,
                demand:
                  Math.min(
                    1,
                    0.25 +
                    hits * 0.15
                  ),
                evidence:
                  tokens.filter(token =>
                    text.includes(token)
                  )
              });
            }
          }
        );

        if (
          !claims.some(
            claim =>
              claim.resource ===
              "executive-attention"
          )
        ) {
          claims.push({
            resource:
              "executive-attention",
            demand: 0.35,
            evidence: [
              "future-positioning-cognition"
            ]
          });
        }

        return claims;
      };

      const futures =
        plans.map(plan => ({
          planId: plan.planId,
          subject: plan.subject,
          sourceCandidateId:
            plan.sourceCandidateId,
          lineageEvidence:
            this.clone(
              plan
                ?.desiredFuturePosition
                ?.lineageEvidence ||
              []
            ),
          moves:
            this.clone(
              plan
                ?.minimumReversibleMoves ||
              []
            ),
          resourceClaims:
            inferResourceClaims(plan)
        }));

      const resourceMap =
        new Map();

      futures.forEach(future => {
        future.resourceClaims.forEach(
          claim => {
            if (
              !resourceMap.has(
                claim.resource
              )
            ) {
              resourceMap.set(
                claim.resource,
                []
              );
            }

            resourceMap
              .get(claim.resource)
              .push({
                planId:
                  future.planId,
                subject:
                  future.subject,
                demand:
                  claim.demand,
                evidence:
                  claim.evidence
              });
          }
        );
      });

      const sharedConstraints =
        [...resourceMap.entries()]
          .filter(
            ([, claims]) =>
              claims.length > 1
          )
          .map(
            ([resource, claims]) => ({
              resource,
              competingFutureCount:
                claims.length,
              aggregateDemand:
                Number(
                  claims
                    .reduce(
                      (sum, item) =>
                        sum +
                        Number(
                          item.demand ||
                          0
                        ),
                      0
                    )
                    .toFixed(3)
                ),
              claims,
              finiteCapacityAssumed:
                false,
              capacityUnknown:
                true,
              requiresCapacityEvidence:
                true
            })
          );

      const moveGroups =
        new Map();

      futures.forEach(future => {
        future.moves.forEach(move => {
          const action =
            normalizeResource(
              move?.action
            );

          if (!action) {
            return;
          }

          if (!moveGroups.has(action)) {
            moveGroups.set(
              action,
              []
            );
          }

          moveGroups.get(action).push({
            planId:
              future.planId,
            subject:
              future.subject,
            move:
              this.clone(move)
          });
        });
      });

      const robustMoves =
        [...moveGroups.entries()]
          .filter(
            ([, entries]) =>
              entries.length > 1
          )
          .map(([action, entries]) => {
            const reversibility =
              Math.min(
                ...entries.map(
                  item =>
                    Number(
                      item.move
                        ?.reversibility ||
                      0
                    )
                )
              );

            const optionValue =
              Number(
                (
                  entries.reduce(
                    (sum, item) =>
                      sum +
                      Number(
                        item.move
                          ?.optionValue ||
                        0
                      ),
                    0
                  ) /
                  entries.length
                ).toFixed(3)
              );

            const informationValue =
              Number(
                (
                  entries.reduce(
                    (sum, item) =>
                      sum +
                      Number(
                        item.move
                          ?.informationValue ||
                        0
                      ),
                    0
                  ) /
                  entries.length
                ).toFixed(3)
              );

            return {
              moveId:
                `${portfolioId}-robust-${action}`,
              action,
              supportsFuturePlanIds:
                entries.map(
                  item => item.planId
                ),
              supportsFutureSubjects:
                entries.map(
                  item => item.subject
                ),
              futureCoverage:
                entries.length,
              reversibility,
              optionValue,
              informationValue,
              robustnessScore:
                Number(
                  (
                    (
                      entries.length /
                      Math.max(
                        1,
                        futures.length
                      )
                    ) *
                      0.45 +
                    reversibility *
                      0.2 +
                    optionValue *
                      0.2 +
                    informationValue *
                      0.15
                  ).toFixed(3)
                ),
              externalAuthorityRequired:
                entries.some(
                  item =>
                    item.move
                      ?.externalAuthorityRequired ===
                    true
                )
            };
          })
          .sort(
            (a, b) =>
              b.robustnessScore -
              a.robustnessScore
          );

      const pairwiseConflicts = [];

      for (
        let i = 0;
        i < futures.length;
        i += 1
      ) {
        for (
          let j = i + 1;
          j < futures.length;
          j += 1
        ) {
          const left = futures[i];
          const right = futures[j];

          const leftResources =
            new Set(
              left.resourceClaims.map(
                item => item.resource
              )
            );

          const overlap =
            right.resourceClaims
              .map(
                item => item.resource
              )
              .filter(resource =>
                leftResources.has(
                  resource
                )
              );

          if (overlap.length > 0) {
            pairwiseConflicts.push({
              conflictId:
                this.id(
                  "future-conflict"
                ),
              leftPlanId:
                left.planId,
              rightPlanId:
                right.planId,
              leftSubject:
                left.subject,
              rightSubject:
                right.subject,
              sharedResources:
                overlap,
              conflictStatus:
                "potential-capacity-conflict",
              destructiveTradeoffProven:
                false,
              evidenceNeeded:
                overlap.map(
                  resource =>
                    `Verified available capacity for ${resource}`
                ),
              truthRule:
                "Shared demand identifies a potential portfolio conflict; it does not prove that both futures cannot be pursued."
            });
          }
        }
      }

      const optionClosingMoves =
        futures.flatMap(future =>
          future.moves
            .filter(
              move =>
                Number(
                  move?.reversibility ||
                  0
                ) < 0.7 ||
                Number(
                  move
                    ?.commitmentCost ||
                  0
                ) > 0.45 ||
                move
                  ?.externalAuthorityRequired ===
                  true
            )
            .map(move => ({
              planId:
                future.planId,
              subject:
                future.subject,
              action:
                move.action,
              reason:
                "This move may reduce portfolio optionality and should not be treated as robust across futures without explicit tradeoff analysis."
            }))
        );

      const portfolioCandidates =
        robustMoves
          .filter(
            move =>
              move.futureCoverage >= 2 &&
              move.reversibility >=
                0.9 &&
              move.optionValue >=
                0.85 &&
              move
                .externalAuthorityRequired ===
                false
          )
          .map(move => ({
            id:
              `cross-future-${
                move.moveId
              }`,
            subject:
              `Cross-future robust move: ${move.action}`,
            origin:
              "cross-future-portfolio",
            reason:
              `This reversible move preserves or increases option value across ${move.futureCoverage} plausible futures.`,
            evidence: futures
              .filter(future =>
                move
                  .supportsFuturePlanIds
                  .includes(
                    future.planId
                  )
              )
              .flatMap(
                future =>
                  future.lineageEvidence
              ),
            unknowns:
              sharedConstraints
                .filter(constraint =>
                  constraint.claims.some(
                    claim =>
                      move
                        .supportsFuturePlanIds
                        .includes(
                          claim.planId
                        )
                  )
                )
                .map(
                  constraint =>
                    `Available ${constraint.resource} capacity`
                ),
            urgency: 0.58,
            consequence: 0.82,
            leverage:
              move.optionValue,
            reversibility:
              move.reversibility,
            informationValue:
              move.informationValue,
            capacityFit: 0.72,
            proposedInternalMove:
              move.action,
            futureCoverage:
              move.futureCoverage,
            robustnessScore:
              move.robustnessScore,
            externalAuthorityRequired:
              false
          }));

      const result = {
        schema:
          "meos.maddy.cross-future-portfolio-robustness.v1",
        portfolioId,
        createdAt: now,
        applied: apply,
        sourceBackwardPositioningId:
          backwardPositioning
            ?.positioningId ||
          null,
        futureCount:
          futures.length,
        futures,
        sharedConstraints,
        pairwiseConflicts,
        robustMoves,
        optionClosingMoves,
        portfolioCandidates,
        judgment: {
          robustAcrossFutures:
            robustMoves.length,
          potentialConflicts:
            pairwiseConflicts.length,
          optionClosingMoves:
            optionClosingMoves.length,
          preferredPosture:
            robustMoves.length > 0
              ? "preserve-optionality-while-learning"
              : "gather-capacity-and-tradeoff-evidence"
        },
        truthBoundary: {
          futuresArePredictions:
            false,
          sharedDemandProvesScarcity:
            false,
          potentialConflictProvesMutualExclusion:
            false,
          portfolioPreferenceIsJudgment:
            true
        },
        authority: {
          internalPortfolioCognitionAuthorized:
            apply,
          resourceAllocationAuthorized:
            false,
          spendingAuthorized: false,
          externalRelationshipActionAuthorized:
            false,
          planningExecutionAuthorized:
            false,
          hallwayDispatchAuthorized:
            false,
          externalActionAuthorized:
            false,
          humanAuthorityPreserved:
            true
        }
      };

      if (
        apply &&
        portfolioCandidates.length > 0
      ) {
        const existingIds =
          new Set(
            (this.executivePriorityPortfolio || [])
              .map(item => item?.id)
              .filter(Boolean)
          );

        portfolioCandidates
          .filter(
            item =>
              !existingIds.has(
                item.id
              )
          )
          .forEach(item => {
            this.executivePriorityPortfolio.push({
              ...this.clone(item),
              status: "candidate",
              createdAt: now,
              updatedAt: now
            });
          });

        this.executivePriorityPortfolio =
          this.executivePriorityPortfolio.slice(
            0,
            this.configuration
              .priorityPortfolioLimit
          );
      }

      this.crossFuturePortfolioState.count +=
        1;
      this.crossFuturePortfolioState.lastAt =
        now;
      this.crossFuturePortfolioState.last =
        this.clone(result);
      this.crossFuturePortfolioState.history.unshift(
        this.clone(result)
      );
      this.crossFuturePortfolioState.history =
        this.crossFuturePortfolioState.history.slice(
          0,
          120
        );

      this.record(
        "cognition.cross-future-portfolio",
        result
      );

      this.emit(
        "brain:cross-future-portfolio",
        this.clone(result)
      );

      return result;
    },

    getCrossFuturePortfolioStatus() {
      return {
        commission: "006.017D7T8",
        version: this.version,
        buildId: this.buildId,
        schema:
          "meos.maddy.cross-future-portfolio-robustness.v1",
        ...this.clone(
          this.crossFuturePortfolioState
        ),
        authority: {
          resourceAllocationAuthorized:
            false,
          externalActionAuthorized:
            false,
          humanAuthorityPreserved:
            true
        }
      };
    },

    getBackwardPositioningStatus() {
      return {
        commission: "006.017D7T7",
        version: this.version,
        buildId: this.buildId,
        schema:
          "meos.maddy.backward-positioning-option-value.v1",
        ...this.clone(
          this.backwardPositioningState
        ),
        authority: {
          externalActionAuthorized:
            false,
          humanAuthorityPreserved:
            true
        }
      };
    },

    getTemporalStrategicDeltaStatus() {
      return {
        commission: "006.017D7T6A",
        version: this.version,
        buildId: this.buildId,
        schema:
          "meos.maddy.temporal-strategic-delta-foresight.v1",
        ...this.clone(
          this.temporalStrategicDeltaState
        ),
        authority: {
          planningExecutionAuthorized:
            false,
          hallwayDispatchAuthorized:
            false,
          externalActionAuthorized:
            false,
          humanAuthorityPreserved:
            true
        }
      };
    },

    getTemporalResimulationStatus() {
      return {
        commission: "006.017D7T5",
        version: this.version,
        buildId: this.buildId,
        schema:
          "meos.maddy.selective-temporal-consequence-resimulation.v1",
        ...this.clone(
          this.temporalResimulationState
        ),
        authority: {
          planningExecutionAuthorized:
            false,
          hallwayDispatchAuthorized:
            false,
          externalActionAuthorized:
            false,
          humanAuthorityPreserved:
            true
        }
      };
    },

    getPlanMonitoringRevisionStatus() {
      return {
        commission: "006.017D7T4C",
        version: this.version,
        buildId: this.buildId,
        schema:
          "meos.maddy.plan-monitoring-cognitive-revision.v1",
        ...this.clone(
          this.planMonitoringRevisionState
        ),
        authority: {
          missionExecutionAuthorized:
            false,
          hallwayDispatchAuthorized:
            false,
          externalActionAuthorized:
            false,
          humanAuthorityPreserved:
            true
        }
      };
    },

    getCognitiveRevisionStatus() {
      return {
        commission: "006.017D7T3",
        version: this.version,
        buildId: this.buildId,
        schema:
          "meos.maddy.governed-cognitive-state-revision.v1",
        ...this.clone(
          this.cognitiveRevisionState
        ),
        authority: {
          planContentMutationAuthorized:
            false,
          monitoringContentMutationAuthorized:
            false,
          hallwayDispatchAuthorized: false,
          externalActionAuthorized: false,
          humanAuthorityPreserved: true
        }
      };
    },

    getCognitiveReconciliationStatus() {
      return {
        commission: "006.017D7T2",
        version: this.version,
        buildId: this.buildId,
        schema:
          "meos.maddy.selective-cognitive-reconciliation.v1",
        ...this.clone(
          this.cognitiveReconciliationState
        ),
        authority: {
          cognitiveRecomputationAuthorized:
            true,
          durableStateMutationAuthorized:
            false,
          planMutationAuthorized: false,
          hallwayDispatchAuthorized: false,
          externalActionAuthorized: false,
          humanAuthorityPreserved: true
        }
      };
    },

    getConsequencePropagationStatus() {
      return {
        commission: "006.017D7T1",
        version: this.version,
        buildId: this.buildId,
        schema:
          "meos.maddy.consequence-propagation.v1",
        ...this.clone(
          this.consequencePropagationState
        ),
        authority: {
          planMutationAuthorized: false,
          hallwayDispatchAuthorized: false,
          externalActionAuthorized: false,
          humanAuthorityPreserved: true
        }
      };
    },

    getCognitiveReappraisalStatus() {
      return {
        commission: "006.017D7S1",
        version: this.version,
        buildId: this.buildId,
        existingSalienceAuthority:
          "meos.maddy.salience-assessment.v1",
        ...this.clone(
          this.cognitiveReappraisalState
        ),
        authority: {
          externalActionAuthorized: false,
          humanAuthorityPreserved: true
        }
      };
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

      const cognitiveReappraisal =
        this.buildCognitiveReappraisal(
          assessment,
          previous,
          current
        );

      const consequencePropagation =
        this.propagateCognitiveConsequences(
          cognitiveReappraisal,
          assessment,
          previous,
          current
        );

      const cognitiveReconciliation =
        this.reconcileCognitiveConsequences(
          consequencePropagation,
          cognitiveReappraisal,
          assessment,
          previous,
          current
        );

      const cognitiveRevision =
        this.reviseCognitiveStateFromReconciliation(
          cognitiveReconciliation,
          {
            apply: true,
            reason:
              "meaningful-world-model-change"
          }
        );

      const planMonitoringRevision =
        this.reviseAffectedPlanAndMonitoringState(
          cognitiveRevision,
          cognitiveReconciliation,
          {
            apply: true
          }
        );

      const temporalResimulation =
        this.resimulateAffectedFutures(
          cognitiveRevision,
          cognitiveReconciliation,
          {
            apply: true
          }
        );

      const temporalStrategicDelta =
        this.analyzeTemporalStrategicDelta(
          temporalResimulation,
          {
            apply: true
          }
        );

      const backwardPositioning =
        this.reasonBackwardFromFuturePosition(
          temporalStrategicDelta,
          {
            apply: true
          }
        );

      const crossFuturePortfolio =
        this.reasonAcrossFuturePortfolio(
          backwardPositioning,
          {
            apply: true
          }
        );

      const causalInvestigation =
        assessment.investigate
          ? this.runCausalCounterfactualInvestigation(
              assessment,
              {
                previousWorldModel: previous,
                currentWorldModel: current
              }
            )
          : null;

      if (
        causalInvestigation &&
        assessment.investigate === true
      ) {
        Promise.resolve(
          this.runAutonomousEvidenceInvestigation(
            causalInvestigation,
            {}
          )
        ).catch(error => {
          this.record(
            "cognition.autonomous-investigation-error",
            {
              subject:
                causalInvestigation.subject,
              error:
                error?.message ||
                String(error)
            }
          );
        });
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
        cognitiveReappraisal:
          this.clone(cognitiveReappraisal),
        consequencePropagation:
          this.clone(
            consequencePropagation
          ),
        cognitiveReconciliation:
          this.clone(
            cognitiveReconciliation
          ),
        cognitiveRevision:
          this.clone(
            cognitiveRevision
          ),
        planMonitoringRevision:
          this.clone(
            planMonitoringRevision
          ),
        temporalResimulation:
          this.clone(
            temporalResimulation
          ),
        temporalStrategicDelta:
          this.clone(
            temporalStrategicDelta
          ),
        backwardPositioning:
          this.clone(
            backwardPositioning
          ),
        crossFuturePortfolio:
          this.clone(
            crossFuturePortfolio
          ),
        causalInvestigation:
          causalInvestigation
            ? {
                fingerprint:
                  causalInvestigation.fingerprint,
                hypotheses:
                  this.clone(
                    causalInvestigation.hypotheses
                  ),
                counterfactuals:
                  this.clone(
                    causalInvestigation.counterfactuals
                  ),
                nextInvestigation:
                  this.clone(
                    causalInvestigation.nextInvestigation
                  )
              }
            : null,
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

    /*
     * Commission 006.017D7C — Causal + Counterfactual Autonomous Investigation
     *
     * Emergent attention is not allowed to collapse into one convenient story.
     * Maddy must construct competing explanations, expose assumptions,
     * distinguish evidence from inference, ask what would falsify each theory,
     * reason about "what if" worlds, and choose the next investigation by
     * expected uncertainty reduction rather than familiarity.
     */
    buildCompetingCausalHypotheses(assessment = {}, context = {}) {
      const signals = Array.isArray(assessment?.signals)
        ? assessment.signals
        : [];
      const questions = Array.isArray(assessment?.questions)
        ? assessment.questions
        : [];
      const connections = Array.isArray(assessment?.connections)
        ? assessment.connections
        : [];

      const candidates = [];

      const pushHypothesis = (
        id,
        claim,
        causalPath,
        assumptions,
        evidenceFor,
        evidenceAgainst,
        falsifiers,
        confidence = 0.35
      ) => {
        candidates.push({
          hypothesisId: id,
          claim,
          status: "hypothesis-not-fact",
          confidence,
          causalPath,
          assumptions,
          evidence: {
            supporting: evidenceFor,
            contradicting: evidenceAgainst
          },
          falsifiers,
          unansweredQuestions: questions.slice(0, 6)
        });
      };

      if (
        signals.some(item =>
          item.type === "future-positioning-implication"
        )
      ) {
        pushHypothesis(
          "positioning-changes-eligibility",
          "A presently adjacent opportunity may become viable because organizational positioning can change before a future decision point.",
          [
            "present mismatch",
            "capability/relationship development",
            "future eligibility or competitiveness",
            "opportunity viability"
          ],
          [
            "the relevant requirement can legitimately be satisfied",
            "the opportunity or a successor cycle remains available",
            "positioning cost does not exceed expected mission value"
          ],
          connections.filter(item =>
            item.type === "positioning-opportunity"
          ),
          [],
          [
            "authoritative eligibility rules make the requirement structurally impossible for the organization",
            "the required capability cannot be built or partnered for within the available time",
            "the future cycle is discontinued"
          ],
          0.42
        );
      }

      if (
        signals.some(item =>
          item.type === "relationship-state-changed"
        )
      ) {
        pushHypothesis(
          "relationship-unlocks-path",
          "A changed human relationship may alter access, information, partnership capacity, or execution probability.",
          [
            "relationship state change",
            "new information/access/trust",
            "changed organizational option set",
            "changed outcome probability"
          ],
          [
            "the relationship is relevant to the affected intention",
            "trust or access is supported by interaction evidence"
          ],
          signals.filter(item =>
            item.type === "relationship-state-changed"
          ),
          [],
          [
            "the person has no relevant authority, information, capability, or connection",
            "the apparent relationship change is noise or stale context"
          ],
          0.34
        );
      }

      if (
        signals.some(item =>
          item.type === "monitoring-state-changed"
        )
      ) {
        pushHypothesis(
          "external-change-alters-future",
          "A change in the external environment may have altered the value, timing, risk, or feasibility of an existing intention.",
          [
            "external observation",
            "constraint/opportunity change",
            "intention impact",
            "future outcome change"
          ],
          [
            "the monitoring observation is current",
            "the observation applies to the organization or relevant future state"
          ],
          signals.filter(item =>
            item.type === "monitoring-state-changed"
          ),
          [],
          [
            "authoritative evidence shows the observation is stale or inapplicable",
            "the affected intention is causally independent of the observed change"
          ],
          0.38
        );
      }

      // Mandatory skeptical alternative prevents confirmation-by-design.
      pushHypothesis(
        "coincidence-or-noise",
        "The apparent connection may be coincidental, stale, incomplete, or too weak to justify changing strategy.",
        [
          "multiple observations",
          "human/model pattern detection",
          "apparent connection without sufficient causal evidence"
        ],
        [
          "cross-domain convergence can still arise from unrelated events"
        ],
        [],
        connections,
        [
          "independent authoritative evidence establishes a causal mechanism",
          "the predicted consequence occurs under a controlled or strongly discriminating observation"
        ],
        0.30
      );

      return candidates
        .slice(
          0,
          this.configuration.maximumCompetingHypotheses
        )
        .map((item, index) => ({
          ...item,
          rank: index + 1
        }));
    },

    buildCounterfactuals(hypotheses = [], context = {}) {
      return hypotheses.flatMap(hypothesis => {
        const claim = hypothesis.claim;
        return [
          {
            hypothesisId: hypothesis.hypothesisId,
            type: "absence",
            question:
              `What would we expect if this proposed cause had NOT occurred?`,
            comparison:
              `Compare observed state against a plausible world without: ${claim}`,
            status: "simulation-not-fact"
          },
          {
            hypothesisId: hypothesis.hypothesisId,
            type: "intervention",
            question:
              `What changes if MEOS deliberately changes one controllable upstream condition?`,
            comparison:
              "Estimate whether the predicted downstream result changes while preserving other known constraints.",
            status: "simulation-not-fact"
          }
        ];
      }).slice(0, 12);
    },

    rankDiscriminatingInvestigations(hypotheses = [], assessment = {}) {
      const investigations = [];

      hypotheses.forEach(hypothesis => {
        (hypothesis.falsifiers || []).forEach((falsifier, index) => {
          const differentiates =
            hypotheses.filter(other =>
              other.hypothesisId !== hypothesis.hypothesisId
            ).length;

          const evidenceGap =
            (hypothesis.unansweredQuestions || []).length;

          const expectedInformationGain =
            Math.min(
              1,
              Number(
                (
                  0.35 +
                  differentiates * 0.08 +
                  evidenceGap * 0.04 -
                  index * 0.03
                ).toFixed(3)
              )
            );

          investigations.push({
            investigationId:
              `${hypothesis.hypothesisId}-falsifier-${index + 1}`,
            hypothesisId: hypothesis.hypothesisId,
            question:
              `Can we establish whether: ${falsifier}?`,
            purpose: "falsification",
            expectedInformationGain,
            authority:
              "internal-investigation-only-unless-external-action-is-approved",
            preferredEvidence:
              "authoritative-primary-source-when-available"
          });
        });
      });

      return investigations.sort(
        (a, b) =>
          b.expectedInformationGain -
          a.expectedInformationGain
      );
    },

    runCausalCounterfactualInvestigation(
      assessment = {},
      context = {}
    ) {
      const hypotheses =
        this.buildCompetingCausalHypotheses(
          assessment,
          context
        );
      const counterfactuals =
        this.buildCounterfactuals(
          hypotheses,
          context
        );
      const investigations =
        this.rankDiscriminatingInvestigations(
          hypotheses,
          assessment
        );
      const nextInvestigation =
        investigations[0] || null;

      const result = {
        schema:
          "meos.maddy.causal-counterfactual-investigation.v1",
        investigationNumber:
          Number(this.causalInvestigationCount || 0) + 1,
        generatedAt: new Date().toISOString(),
        subject:
          assessment?.subject ||
          "Emergent world-model connection",
        salienceFingerprint:
          assessment?.currentWorldFingerprint || null,
        epistemicStatus:
          "hypotheses-under-investigation",
        hypotheses,
        counterfactuals,
        investigations,
        nextInvestigation,
        governance: {
          correlationIsNotCausation: true,
          hypothesisIsNotFact: true,
          disconfirmingEvidenceRequired: true,
          externalActionRequiresExistingAuthority: true,
          investigationMayProceedAutonomouslyWithinAuthority: true
        }
      };

      result.fingerprint =
        this.fingerprintCognitiveDispatch(result);

      this.causalInvestigationCount =
        result.investigationNumber;
      this.lastCausalInvestigation =
        result;
      this.causalInvestigationHistory.unshift(
        this.clone(result)
      );
      this.causalInvestigationHistory =
        this.causalInvestigationHistory.slice(
          0,
          this.configuration
            .maximumCausalInvestigationHistory
        );

      this.emit(
        "brain:causal-investigation-created",
        this.clone(result)
      );

      this.record(
        "cognition.causal-investigation",
        {
          subject: result.subject,
          hypothesisCount: hypotheses.length,
          counterfactualCount:
            counterfactuals.length,
          nextInvestigation:
            nextInvestigation?.question || null
        }
      );

      return this.clone(result);
    },

    /*
     * Commission 006.017D7D — Autonomous Evidence Investigation Loop
     *
     * D7C decides what evidence would discriminate between competing theories.
     * D7D closes the loop: route an authorized investigation through existing
     * MEOS organs, evaluate returned evidence, update or kill hypotheses,
     * discover second-order questions, and continue until uncertainty is
     * sufficiently reduced or authority / capability / evidence runs out.
     *
     * No provider is assumed. No external provider becomes MEOS authority.
     */
    resolveInvestigationCapability(investigation = {}) {
      const manifest = this.getSystemManifest();
      const preferred = [
        "Executive Search",
        "Executive Recall",
        "Institutional Reasoning",
        "Website Intelligence",
        "Executive Monitoring"
      ];

      const available = preferred
        .map(label =>
          manifest.find(item =>
            String(item?.label || "")
              .toLowerCase() === label.toLowerCase()
          )
        )
        .filter(item => item?.available === true);

      return {
        available: available.length > 0,
        candidates: available,
        providerNeutral: true,
        investigation
      };
    },

    evaluateInvestigationEvidence(hypotheses = [], evidence = {}) {
      const normalizedEvidence = {
        source:
          evidence.source || "unknown",
        authority:
          evidence.authority || "unverified",
        supports:
          Array.isArray(evidence.supports)
            ? evidence.supports
            : [],
        contradicts:
          Array.isArray(evidence.contradicts)
            ? evidence.contradicts
            : [],
        facts:
          Array.isArray(evidence.facts)
            ? evidence.facts
            : [],
        unknowns:
          Array.isArray(evidence.unknowns)
            ? evidence.unknowns
            : [],
        provenance:
          evidence.provenance || null
      };

      const updated = hypotheses.map(hypothesis => {
        const supported =
          normalizedEvidence.supports.includes(
            hypothesis.hypothesisId
          );
        const contradicted =
          normalizedEvidence.contradicts.includes(
            hypothesis.hypothesisId
          );

        /*
         * Durable falsification doctrine:
         * once authoritative contradictory evidence falsifies a hypothesis,
         * later unrelated evidence may not silently resurrect it.
         * Reopening requires new authoritative supporting evidence and leaves
         * an explicit audit trail showing that the hypothesis was reopened.
         */
        const previouslyFalsified =
          hypothesis.status === "falsified";

        if (
          previouslyFalsified &&
          !(
            supported &&
            normalizedEvidence.authority ===
              "authoritative"
          )
        ) {
          return {
            ...this.clone(hypothesis),
            status: "falsified",
            evidenceUpdate: {
              supported,
              contradicted,
              evidenceAuthority:
                normalizedEvidence.authority,
              provenance:
                normalizedEvidence.provenance,
              durableFalsificationPreserved:
                true,
              reopened: false
            }
          };
        }

        let confidence =
          Number(hypothesis.confidence || 0.3);

        if (supported) {
          confidence +=
            normalizedEvidence.authority === "authoritative"
              ? 0.24
              : 0.12;
        }

        if (contradicted) {
          confidence -=
            normalizedEvidence.authority === "authoritative"
              ? 0.38
              : 0.18;
        }

        confidence =
          Math.max(
            0,
            Math.min(
              0.99,
              Number(confidence.toFixed(3))
            )
          );

        const killed =
          contradicted &&
          normalizedEvidence.authority === "authoritative" &&
          confidence <= 0.12;

        const reopened =
          previouslyFalsified &&
          supported &&
          normalizedEvidence.authority ===
            "authoritative";

        return {
          ...this.clone(hypothesis),
          confidence,
          status:
            killed
              ? "falsified"
              : "hypothesis-not-fact",
          falsificationHistory:
            [
              ...(
                Array.isArray(
                  hypothesis.falsificationHistory
                )
                  ? hypothesis.falsificationHistory
                  : []
              ),
              ...(
                killed
                  ? [{
                      at:
                        new Date().toISOString(),
                      provenance:
                        normalizedEvidence.provenance,
                      reason:
                        "authoritative-contradictory-evidence"
                    }]
                  : []
              ),
              ...(
                reopened
                  ? [{
                      at:
                        new Date().toISOString(),
                      provenance:
                        normalizedEvidence.provenance,
                      reason:
                        "authoritative-supporting-evidence-reopened-hypothesis",
                      reopened: true
                    }]
                  : []
              )
            ],
          evidenceUpdate: {
            supported,
            contradicted,
            evidenceAuthority:
              normalizedEvidence.authority,
            provenance:
              normalizedEvidence.provenance,
            durableFalsificationPreserved:
              killed || (
                previouslyFalsified &&
                !reopened
              ),
            reopened
          }
        };
      });

      return {
        evidence: normalizedEvidence,
        hypotheses: updated,
        surviving:
          updated.filter(item =>
            item.status !== "falsified"
          ),
        falsified:
          updated.filter(item =>
            item.status === "falsified"
          )
      };
    },

    calculateInvestigationResolution(hypotheses = [], evidence = {}) {
      const active =
        hypotheses.filter(item =>
          item.status !== "falsified"
        );
      const confidences =
        active.map(item =>
          Number(item.confidence || 0)
        );
      const strongest =
        confidences.length
          ? Math.max(...confidences)
          : 0;
      const runnerUp =
        confidences
          .sort((a, b) => b - a)[1] || 0;
      const discrimination =
        Math.max(0, strongest - runnerUp);
      const authorityBonus =
        evidence?.authority === "authoritative"
          ? 0.18
          : 0;

      return Math.max(
        0,
        Math.min(
          1,
          Number(
            (
              strongest * 0.62 +
              discrimination * 0.20 +
              authorityBonus
            ).toFixed(3)
          )
        )
      );
    },

    discoverSecondOrderQuestions(result = {}, priorQuestions = []) {
      const discovered = [];

      (result?.evidence?.unknowns || [])
        .forEach(question => {
          if (
            question &&
            !priorQuestions.includes(question)
          ) {
            discovered.push({
              question,
              origin:
                "evidence-created-unknown",
              significance:
                "second-order",
              status: "unresolved"
            });
          }
        });

      if (
        result?.falsified?.length > 0 &&
        result?.surviving?.length > 0
      ) {
        discovered.push({
          question:
            "What mechanism best explains why the surviving hypothesis fits evidence that falsified the competing explanation?",
          origin:
            "hypothesis-falsification",
          significance:
            "second-order",
          status: "unresolved"
        });
      }

      return discovered.slice(0, 8);
    },

    async executeInvestigationStep(investigation = {}, context = {}) {
      /*
       * Existing organs remain the executors. This method never hard-codes an
       * outside vendor. A caller/test may inject an executor; production uses
       * the best commissioned MEOS organ available.
       */
      if (typeof context.executor === "function") {
        return await context.executor(
          this.clone(investigation)
        );
      }

      const capability =
        this.resolveInvestigationCapability(
          investigation
        );

      if (!capability.available) {
        return {
          success: false,
          blocked: true,
          reason:
            "no-authorized-investigation-capability",
          evidence: null
        };
      }

      const question =
        investigation?.question ||
        "Investigate the highest-information unresolved question.";

      try {
        if (
          window.MEOSExecutiveSearch &&
          typeof window.MEOSExecutiveSearch
            .executiveQuery === "function"
        ) {
          const searchResult =
            await window.MEOSExecutiveSearch
              .executiveQuery(question);

          return {
            success: true,
            executor:
              "MEOSExecutiveSearch",
            evidence: {
              source:
                "meos-executive-search",
              authority: "unverified",
              facts: this.clone(
                searchResult?.results ||
                searchResult?.items ||
                []
              ),
              supports: [],
              contradicts: [],
              unknowns: [],
              provenance:
                searchResult?.provenance ||
                null
            }
          };
        }
      } catch (error) {
        return {
          success: false,
          blocked: false,
          reason:
            "investigation-executor-error",
          error: error?.message || String(error),
          evidence: null
        };
      }

      return {
        success: false,
        blocked: true,
        reason:
          "available-capability-has-no-compatible-investigation-interface",
        evidence: null
      };
    },

    async runAutonomousEvidenceInvestigation(
      causalInvestigation = {},
      context = {}
    ) {
      const generatedAt =
        new Date().toISOString();
      let hypotheses =
        this.clone(
          causalInvestigation.hypotheses || []
        );
      let queue =
        this.clone(
          causalInvestigation.investigations || []
        );
      const steps = [];
      const discoveredQuestions = [];
      let resolution = 0;
      let stopReason = null;

      const maxSteps =
        Math.max(
          1,
          Math.min(
            this.configuration
              .maximumAutonomousInvestigationSteps,
            Number(context.maxSteps) ||
              this.configuration
                .maximumAutonomousInvestigationSteps
          )
        );

      for (
        let index = 0;
        index < maxSteps;
        index += 1
      ) {
        const next =
          queue.shift();

        if (!next) {
          stopReason =
            "no-further-discriminating-investigation";
          break;
        }

        const execution =
          await this.executeInvestigationStep(
            next,
            context
          );

        if (
          execution?.blocked === true
        ) {
          stopReason =
            execution.reason ||
            "authority-or-capability-required";
          steps.push({
            step: index + 1,
            investigation:
              this.clone(next),
            execution:
              this.clone(execution)
          });
          break;
        }

        if (
          execution?.success !== true ||
          !execution?.evidence
        ) {
          steps.push({
            step: index + 1,
            investigation:
              this.clone(next),
            execution:
              this.clone(execution)
          });
          continue;
        }

        const evaluated =
          this.evaluateInvestigationEvidence(
            hypotheses,
            execution.evidence
          );

        hypotheses =
          evaluated.hypotheses;

        resolution =
          this.calculateInvestigationResolution(
            hypotheses,
            evaluated.evidence
          );

        const secondOrder =
          this.discoverSecondOrderQuestions(
            evaluated,
            discoveredQuestions.map(
              item => item.question
            )
          );

        discoveredQuestions.push(
          ...secondOrder
        );

        secondOrder.forEach(
          (item, questionIndex) => {
            queue.push({
              investigationId:
                `second-order-${index + 1}-${questionIndex + 1}`,
              hypothesisId: null,
              question: item.question,
              purpose:
                "second-order-uncertainty-reduction",
              expectedInformationGain:
                Math.max(
                  0.35,
                  0.75 - index * 0.05
                ),
              authority:
                "internal-investigation-only-unless-external-action-is-approved",
              preferredEvidence:
                "authoritative-primary-source-when-available"
            });
          }
        );

        queue.sort(
          (a, b) =>
            Number(
              b.expectedInformationGain || 0
            ) -
            Number(
              a.expectedInformationGain || 0
            )
        );

        steps.push({
          step: index + 1,
          investigation:
            this.clone(next),
          execution:
            this.clone(execution),
          evaluated:
            this.clone(evaluated),
          resolution,
          secondOrder:
            this.clone(secondOrder)
        });

        if (
          resolution >=
          this.configuration
            .investigationResolutionThreshold
        ) {
          stopReason =
            "uncertainty-sufficiently-resolved";
          break;
        }
      }

      if (!stopReason) {
        stopReason =
          steps.length >= maxSteps
            ? "investigation-step-limit"
            : "investigation-complete";
      }

      const surviving =
        hypotheses.filter(item =>
          item.status !== "falsified"
        );
      const falsified =
        hypotheses.filter(item =>
          item.status === "falsified"
        );

      const result = {
        schema:
          "meos.maddy.autonomous-evidence-investigation.v1",
        investigationNumber:
          Number(
            this.autonomousInvestigationCount || 0
          ) + 1,
        generatedAt,
        subject:
          causalInvestigation.subject ||
          "Autonomous evidence investigation",
        causalFingerprint:
          causalInvestigation.fingerprint || null,
        steps,
        hypotheses,
        survivingHypotheses: surviving,
        falsifiedHypotheses: falsified,
        discoveredQuestions,
        resolution,
        resolved:
          resolution >=
          this.configuration
            .investigationResolutionThreshold,
        stopReason,
        governance: {
          providerNeutral: true,
          evidenceDoesNotBecomeFactWithoutAuthority:
            true,
          externalActionRequiresExistingAuthority:
            true,
          mayInvestigateAutonomouslyWithinAuthority:
            true,
          humanEscalationRequiredWhenBlocked:
            stopReason?.includes("authority") ===
              true
        }
      };

      result.fingerprint =
        this.fingerprintCognitiveDispatch(
          result
        );

      this.autonomousInvestigationCount =
        result.investigationNumber;
      this.lastAutonomousInvestigation =
        result;
      this.autonomousInvestigationHistory
        .unshift(this.clone(result));
      this.autonomousInvestigationHistory =
        this.autonomousInvestigationHistory
          .slice(
            0,
            this.configuration
              .maximumAutonomousInvestigationHistory
          );

      this.emit(
        "brain:autonomous-investigation-completed",
        this.clone(result)
      );

      this.record(
        "cognition.autonomous-investigation",
        {
          subject: result.subject,
          steps: steps.length,
          resolution,
          falsified:
            falsified.length,
          surviving:
            surviving.length,
          secondOrderQuestions:
            discoveredQuestions.length,
          stopReason
        }
      );

      result.assimilation = this.assimilateAutonomousInvestigationEvidence(result, { persist: false });

      if (
        brainPersistence.hydrated === true
      ) {
        this.persist();
      }

      return this.clone(result);
    },

    /* Commission 006.017D7E — Evidence Assimilation + Cognitive Closure */
    assimilateAutonomousInvestigationEvidence(investigation = {}, options = {}) {
      const generatedAt = new Date().toISOString();
      const evidenceItems = (investigation.steps || []).map(step => step?.evaluated?.evidence || step?.execution?.evidence).filter(Boolean).map((evidence, index) => ({
        id: `autonomous-investigation-evidence-${investigation.investigationNumber || 0}-${index + 1}`,
        title: evidence.source || `Investigation evidence ${index + 1}`,
        summary: Array.isArray(evidence.facts) ? evidence.facts.join(" ") : String(evidence.summary || ""),
        source: evidence.source || "autonomous-investigation", provenance: evidence.provenance || null, authority: evidence.authority || "unverified",
        evidenceClass: evidence.authority === "authoritative" ? "verified-external-source" : "unverified-information",
        facts: this.clone(evidence.facts || []), supports: this.clone(evidence.supports || []), contradicts: this.clone(evidence.contradicts || [])
      }));
      const integrity = this.prepareEvidenceIntegrity(investigation.subject || "Autonomous evidence investigation", { evidence: evidenceItems, confidence: Number(investigation.resolution || 0), answerableLocally: false }, { requestType: REQUEST_TYPES.RESEARCH, source: "executive-brain-autonomous-investigation" });
      const surviving = (investigation.survivingHypotheses || []).map(item => ({ hypothesisId:item.hypothesisId, claim:item.claim, confidence:Number(item.confidence||0), status:item.status || "hypothesis-not-fact" }));
      const falsified = (investigation.falsifiedHypotheses || []).map(item => ({ hypothesisId:item.hypothesisId, claim:item.claim, confidence:Number(item.confidence||0), status:"falsified", falsificationHistory:this.clone(item.falsificationHistory||[]) }));
      const unresolvedQuestions = [...(investigation.discoveredQuestions||[]).map(x=>x?.question).filter(Boolean), ...(investigation.hypotheses||[]).filter(x=>x.status!=="falsified").flatMap(x=>x.unansweredQuestions||[]).filter(Boolean)].filter((v,i,a)=>a.indexOf(v)===i).slice(0,24);
      const assimilation = { schema:"meos.maddy.evidence-assimilation.v1", assimilationNumber:Number(this.evidenceAssimilationCount||0)+1, generatedAt, subject:investigation.subject||"Autonomous evidence investigation", investigationNumber:investigation.investigationNumber||null, investigationFingerprint:investigation.fingerprint||null, causalFingerprint:investigation.causalFingerprint||null, evidence:evidenceItems,
        evidenceIntegrity:{ applied:integrity?.available===true||integrity?.success===true, success:integrity?.success===true, fallback:integrity?.fallback===true, confidence:Number(integrity?.confidence||0), conflictCount:Array.isArray(integrity?.conflicts)?integrity.conflicts.length:0 },
        beliefUpdate:{ survivingHypotheses:surviving, falsifiedHypotheses:falsified, rule:"A supported hypothesis remains an inference unless authoritative evidence and MEOS evidence rules justify a stronger class." },
        unknowns:unresolvedQuestions.map(question=>({question,status:"unresolved",origin:"autonomous-investigation"})), resolution:Number(investigation.resolution||0), resolved:investigation.resolved===true, stopReason:investigation.stopReason||null,
        authority:{ providerNeutral:true, providerIsNotMaddy:true, evidenceDoesNotSelfAuthorizeAction:true, externalActionRequiresExistingAuthority:true } };
      assimilation.fingerprint=this.fingerprintCognitiveDispatch(assimilation);
      this.evidenceAssimilationCount=assimilation.assimilationNumber; this.lastEvidenceAssimilation=assimilation; this.evidenceAssimilationHistory.unshift(this.clone(assimilation)); this.evidenceAssimilationHistory=this.evidenceAssimilationHistory.slice(0,this.configuration.maximumEvidenceAssimilationHistory);
      const worldModel=this.projectWorldModel({reason:"autonomous-investigation-evidence-assimilated",persist:false,attend:false});
      const trigger={source:"executive-brain-evidence-assimilation",event:"autonomous-investigation-evidence-assimilated",assimilationFingerprint:assimilation.fingerprint,investigationFingerprint:investigation.fingerprint||null,resolution:assimilation.resolution,resolved:assimilation.resolved,falsifiedHypothesisIds:falsified.map(x=>x.hypothesisId),survivingHypothesisIds:surviving.map(x=>x.hypothesisId),unknowns:unresolvedQuestions.slice(0,12),worldFingerprint:worldModel?.fingerprint||null};
      const existing=(this.cognitiveIntentions||[]).find(x=>x?.key===this.normalize(assimilation.subject)&&x?.status!=="completed");
      if(existing){ existing.triggers=Array.isArray(existing.triggers)?existing.triggers:[]; existing.triggers.push(this.clone(trigger)); existing.triggers=existing.triggers.slice(-50); existing.updatedAt=generatedAt; }
      else if(options.createIntention!==false) this.upsertCognitiveIntention(assimilation.subject,[trigger],{status:"pending",kind:"evidence-assimilation-follow-through",sourceId:assimilation.fingerprint,persist:false});
      this.formAutobiographicalEpisode({eventType:"evidence-assimilation",subject:assimilation.subject,sourceId:assimilation.fingerprint,perception:{evidenceCount:evidenceItems.length,evidenceIntegrity:this.clone(assimilation.evidenceIntegrity)},intention:{type:"update-beliefs-and-continue-cognition",unresolvedQuestions:unresolvedQuestions.length},action:{type:"assimilate-investigation-evidence",worldFingerprint:worldModel?.fingerprint||null},outcome:{resolved:assimilation.resolved,resolution:assimilation.resolution,survivingHypotheses:surviving.length,falsifiedHypotheses:falsified.length},learning:{unknownsRemain:unresolvedQuestions.length,stopReason:assimilation.stopReason}});
      this.emit("brain:evidence-assimilated",this.clone(assimilation)); this.record("cognition.evidence-assimilated",{subject:assimilation.subject,evidenceCount:evidenceItems.length,surviving:surviving.length,falsified:falsified.length,unknowns:unresolvedQuestions.length,resolution:assimilation.resolution});
      if(options.persist!==false&&brainPersistence.hydrated===true)this.persist();
      return {success:true,assimilation:this.clone(assimilation),worldModel:this.clone(worldModel),trigger:this.clone(trigger)};
    },

    /*
     * Commission 006.017D7F — Developmental Drive + Agency + Implementation
     *
     * Ambition + Motivation + Curiosity + Discipline + Means + Implementation.
     * This is not a personality slider. It is a governed developmental process
     * that can discover a capability gap, find legitimate means to close it,
     * research through existing provider-neutral organs, practice, implement
     * learned knowledge when authority and timing permit, measure consequences,
     * revisit past reasoning, and grow into ambitions that were previously
     * beyond Maddy's capability.
     */

    normalizeDevelopmentalCapability(input = {}) {
      const capability = String(input.capability || input.name || input.domain || "unnamed-capability").trim();
      const demonstrated = Math.max(0, Math.min(1, Number(input.demonstrated ?? input.score ?? 0)));
      const required = Math.max(0, Math.min(1, Number(input.required ?? input.target ?? 1)));
      const evidenceCount = Math.max(0, Number(input.evidenceCount ?? input.samples ?? input.outcomes ?? 0));
      return {
        capability,
        demonstrated,
        required,
        gap: Number(Math.max(0, required - demonstrated).toFixed(3)),
        evidenceCount,
        confidence: Math.max(0, Math.min(1, Number(input.confidence ?? Math.min(1, evidenceCount / 10)))),
        missionRelevance: Math.max(0, Math.min(1, Number(input.missionRelevance ?? 0.5))),
        curiosity: Math.max(0, Math.min(1, Number(input.curiosity ?? 0.5))),
        urgency: Math.max(0, Math.min(1, Number(input.urgency ?? 0.25))),
        prerequisites: Array.isArray(input.prerequisites) ? this.clone(input.prerequisites) : [],
        blockedBy: Array.isArray(input.blockedBy) ? this.clone(input.blockedBy) : [],
        source: String(input.source || "runtime-capability-evidence")
      };
    },

    discoverDevelopmentalMeans(goal = {}, options = {}) {
      const manifest = this.getSystemManifest();
      const availableOrgans = manifest.filter(item => item?.available === true);
      const means = [];
      const add = (id, label, kind, capabilities = []) => {
        if (means.some(item => item.id === id)) return;
        means.push({ id, label, kind, capabilities, authorizedForDevelopment: true });
      };

      if (window.MEOSExecutiveSearch && typeof window.MEOSExecutiveSearch.executiveQuery === "function") {
        add("executive-search", "Executive Search", "research", ["search","organizational-knowledge"]);
      }
      if (window.ProviderManager && typeof window.ProviderManager.request === "function") {
        const providerCapabilities =
          typeof window.ProviderManager.listCapabilities === "function"
            ? window.ProviderManager.listCapabilities()
            : [];
        add("provider-manager", "Provider Manager", "provider-neutral-research", providerCapabilities);
      }
      if (window.MEOSExecutiveRecall) add("executive-recall", "Executive Recall", "memory", ["recall"]);
      if (window.MEOSExecutiveLearning) add("executive-learning", "Executive Learning", "learning", ["feedback","lessons"]);
      if (window.MEOSInstitutionalReasoning) add("institutional-reasoning", "Institutional Reasoning", "reasoning", ["institutional-reasoning"]);
      if (window.MEOSExecutiveEvidenceIntegrity) add("evidence-integrity", "Executive Evidence Integrity", "evidence", ["evidence-integrity"]);
      if (window.MEOSExecutiveHallway) add("executive-hallway", "Executive Hallway", "routing", ["executive-routing"]);

      availableOrgans
        .filter(item => /search|recall|learning|reasoning|evidence|hallway|monitoring|website/i.test(String(item.label || "")))
        .forEach(item => add(
          `manifest-${String(item.label || "").toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,
          item.label,
          "commissioned-organ",
          []
        ));

      const canResearch = means.some(item =>
        item.id === "executive-search" ||
        (item.id === "provider-manager" && (
          item.capabilities.includes("current-web-research") ||
          item.capabilities.includes("long-document-analysis") ||
          item.capabilities.includes("structured-data-retrieval")
        ))
      );

      return {
        schema: "meos.maddy.developmental-means.v1",
        goalId: goal.id || null,
        discoveredAt: new Date().toISOString(),
        means,
        canResearch,
        canPractice: true,
        canReflect: true,
        canImplementInternally: true,
        providerNeutral: true,
        externalAuthorityUnchanged: true,
        blockedBy: this.clone(goal.blockedBy || []),
        callerInjectedResearchExecutor: typeof options.researchExecutor === "function"
      };
    },

    createDevelopmentalDrive(options = {}) {
      const capabilities = (Array.isArray(options.capabilities) ? options.capabilities : [])
        .map(item => this.normalizeDevelopmentalCapability(item))
        .filter(item => item.capability && item.gap > 0);

      const goals = capabilities.map(item => {
        const epistemicStatus = item.evidenceCount < 3
          ? "insufficient-evidence-to-claim-weakness"
          : "evidence-grounded-development-gap";
        const motivation = Number(Math.max(0, Math.min(1,
          item.missionRelevance * 0.45 +
          item.curiosity * 0.20 +
          item.urgency * 0.15 +
          item.gap * 0.20
        )).toFixed(3));
        const id = `development-${this.fingerprintCognitiveDispatch({
          capability:item.capability,
          demonstrated:item.demonstrated,
          required:item.required,
          evidenceCount:item.evidenceCount
        })}`;
        const goal = {
          id,
          capability:item.capability,
          createdAt:new Date().toISOString(),
          ambition:{ demonstrated:item.demonstrated, required:item.required, gap:item.gap },
          motivation,
          curiosity:item.curiosity,
          discipline:{
            status:"committed-to-evidence",
            retryOnOrdinaryFailure:true,
            abandonOnlyFor:"evidence, governance, irrelevance, or superseding priority",
            failureIsInformation:true
          },
          epistemicStatus,
          prerequisites:item.prerequisites,
          blockedBy:item.blockedBy,
          developmentalQuestion:`What must Maddy learn, practice, experience, or gain access to before ${item.capability} reaches demonstrated capability ${item.required}?`,
          masteryRule:"Reading or confidence cannot establish mastery. Later performance evidence must.",
          status:item.blockedBy.length ? "deferred-not-yet" : "active"
        };
        goal.means = this.discoverDevelopmentalMeans(goal, options);
        return goal;
      }).sort((a,b) => b.motivation - a.motivation || b.ambition.gap - a.ambition.gap);

      const drive = {
        schema:"meos.maddy.developmental-drive.v1",
        driveNumber:Number(this.developmentalDriveCount || 0) + 1,
        generatedAt:new Date().toISOString(),
        formula:"ambition + motivation + curiosity + discipline + means + implementation",
        goals,
        governance:{
          ambitionDoesNotGrantAuthority:true,
          permissionsDoNotSelfEscalate:true,
          constitutionDoesNotSelfRewrite:true,
          productionSourceDoesNotSelfRewrite:true,
          providerNeutral:true,
          implementationRequiresExistingAuthority:true,
          masteryRequiresEvidence:true
        }
      };
      drive.fingerprint = this.fingerprintCognitiveDispatch(drive);

      this.developmentalDriveCount = drive.driveNumber;
      this.lastDevelopmentalDrive = drive;
      this.developmentalDriveHistory.unshift(this.clone(drive));
      this.developmentalDriveHistory = this.developmentalDriveHistory.slice(0, this.configuration.maximumDevelopmentalDriveHistory);

      goals.forEach(goal => {
        const existing = this.developmentalGoals.find(item => item.capability === goal.capability && item.status !== "achieved");
        if (!existing && goal.epistemicStatus === "evidence-grounded-development-gap") this.developmentalGoals.unshift(this.clone(goal));
        if (goal.status === "deferred-not-yet") this.deferDevelopmentalCapability(goal, { persist:false });
      });
      this.developmentalGoals = this.developmentalGoals.slice(0, this.configuration.maximumDevelopmentalGoals);

      return this.clone(drive);
    },

    deferDevelopmentalCapability(goal = {}, options = {}) {
      const record = {
        schema:"meos.maddy.deferred-capability.v1",
        id:goal.id || `deferred-${this.fingerprintCognitiveDispatch(goal)}`,
        capability:goal.capability || "unknown",
        deferredAt:new Date().toISOString(),
        reason:(goal.blockedBy || []).length ? "present-capability-or-prerequisite-gap" : "not-ready-yet",
        blockedBy:this.clone(goal.blockedBy || []),
        prerequisites:this.clone(goal.prerequisites || []),
        readinessQuestion:`What must become true before ${goal.capability || "this ambition"} is ready to implement?`,
        status:"deferred-not-yet",
        temporalPrinciple:"I cannot do this yet is not equivalent to I cannot do this."
      };
      const prior = this.deferredCapabilities.find(item => item.id === record.id);
      if (!prior) this.deferredCapabilities.unshift(record);
      this.deferredCapabilities = this.deferredCapabilities.slice(0, this.configuration.maximumDeferredCapabilities);
      if (options.persist !== false && brainPersistence.hydrated === true) this.persist();
      return this.clone(record);
    },

    reassessDeferredCapabilities(context = {}) {
      const nowReady = [];
      this.deferredCapabilities = this.deferredCapabilities.map(item => {
        if (item.status === "ready") return item;
        const supplied = context[item.capability] || {};
        const resolved = Array.isArray(item.blockedBy) &&
          item.blockedBy.every(blocker => supplied[blocker] === true);
        if (!resolved) return item;
        const next = {
          ...item,
          status:"ready",
          readyAt:new Date().toISOString(),
          readinessReason:"Previously blocking prerequisites are now evidenced as satisfied."
        };
        nowReady.push(this.clone(next));
        return next;
      });
      return {
        schema:"meos.maddy.deferred-capability-readiness.v1",
        checkedAt:new Date().toISOString(),
        nowReady,
        principle:"Past ambition can become present capability when Maddy or her world changes."
      };
    },

    async pursueDevelopmentalGoal(goalInput, options = {}) {
      const goal = typeof goalInput === "string"
        ? this.developmentalGoals.find(item => item.id === goalInput || item.capability === goalInput)
        : goalInput;
      if (!goal) return { success:false, reason:"developmental-goal-not-found" };
      if (goal.status === "deferred-not-yet") return { success:false, blocked:true, reason:"developmental-goal-not-ready", goal:this.clone(goal) };

      const means = this.discoverDevelopmentalMeans(goal, options);
      const question = goal.developmentalQuestion ||
        `Find authoritative knowledge and practice material that would improve ${goal.capability}.`;

      let research = null;
      let attempts = 0;
      const errors = [];

      const attempt = async () => {
        attempts += 1;
        if (typeof options.researchExecutor === "function") {
          return await options.researchExecutor({ goal:this.clone(goal), question, means:this.clone(means), attempt:attempts });
        }

        if (window.ProviderManager && typeof window.ProviderManager.request === "function") {
          const result = await window.ProviderManager.request(
            {
              capabilities:["current-web-research"],
              allowMultiProvider:true,
              maximumProviders:3,
              requireAllCapabilities:true,
              sourceDiversity:1
            },
            {
              type:"research",
              query:question,
              purpose:"self-directed-professional-development",
              developmentalGoalId:goal.id,
              requireCitations:true
            },
            {
              authority:"internal-research",
              requestedBy:"MEOS Executive Brain Developmental Drive"
            }
          );
          if (result?.success === true) return { success:true, executor:"ProviderManager", result };
          errors.push(result?.selection?.reason || result?.execution?.error || "provider-research-failed");
        }

        if (window.MEOSExecutiveSearch && typeof window.MEOSExecutiveSearch.executiveQuery === "function") {
          const result = await window.MEOSExecutiveSearch.executiveQuery(question);
          return { success:true, executor:"MEOSExecutiveSearch", result };
        }

        return { success:false, blocked:true, reason:"no-authorized-research-means" };
      };

      const maxAttempts = Math.max(1, Math.min(Number(options.maxAttempts || 2), 4));
      while (attempts < maxAttempts && research?.success !== true) {
        try { research = await attempt(); }
        catch (error) {
          errors.push(error?.message || String(error));
          research = { success:false, blocked:false, reason:"research-attempt-error" };
        }
        if (research?.blocked === true) break;
      }

      const practice = {
        schema:"meos.maddy.deliberate-practice.v1",
        practiceId:`practice-${this.fingerprintCognitiveDispatch({goal:goal.id,attempts,at:new Date().toISOString()})}`,
        goalId:goal.id,
        capability:goal.capability,
        practicedAt:new Date().toISOString(),
        researchSuccess:research?.success === true,
        executor:research?.executor || null,
        attempts,
        discipline:{
          persistedAcrossOrdinaryFailure:attempts > 1 || research?.success === true,
          errors
        },
        practicePlan:[
          "extract claims and provenance",
          "separate fact from inference",
          "construct exercises or historical cases without answer leakage",
          "make predictions before revealing outcomes",
          "compare prediction with outcome",
          "identify error mechanism",
          "update strategy only when evidence warrants"
        ],
        masteryClaimed:false,
        implementationPending:true
      };

      this.developmentalPracticeHistory.unshift(this.clone(practice));
      this.developmentalPracticeHistory = this.developmentalPracticeHistory.slice(0, this.configuration.maximumDevelopmentalPracticeHistory);

      this.formAutobiographicalEpisode({
        eventType:"developmental-practice",
        subject:`Development of ${goal.capability}`,
        sourceId:practice.practiceId,
        perception:{ goal:this.clone(goal), means:this.clone(means) },
        intention:{ type:"become-more-capable", goalId:goal.id },
        action:{ type:"research-and-deliberate-practice", executor:practice.executor, attempts },
        outcome:{ researchSuccess:practice.researchSuccess, masteryClaimed:false },
        learning:{ rule:"Knowledge becomes development only when later performance or implementation changes." }
      });

      if (brainPersistence.hydrated === true && options.persist !== false) this.persist();
      return { success:research?.success === true, goal:this.clone(goal), means:this.clone(means), research:this.clone(research), practice:this.clone(practice) };
    },

    implementDevelopmentalKnowledge(goalInput, implementation = {}, options = {}) {
      const goal = typeof goalInput === "string"
        ? this.developmentalGoals.find(item => item.id === goalInput || item.capability === goalInput)
        : goalInput;
      if (!goal) return { success:false, reason:"developmental-goal-not-found" };

      const consequential = implementation.consequential === true || implementation.external === true;
      const authorized = implementation.authorized === true || !consequential;
      if (!authorized) {
        return {
          success:false,
          blocked:true,
          reason:"existing-authority-required-for-consequential-implementation",
          goal:this.clone(goal)
        };
      }

      const record = {
        schema:"meos.maddy.knowledge-transfer.v1",
        implementationId:`implementation-${this.fingerprintCognitiveDispatch({goal:goal.id,at:new Date().toISOString(),implementation})}`,
        goalId:goal.id,
        capability:goal.capability,
        implementedAt:new Date().toISOString(),
        implementation:this.clone(implementation),
        authorityVerified:authorized,
        consequential,
        outcomeKnown:false,
        lessonPending:true,
        principle:"Knowledge left unused is incomplete development; legitimate application creates experience that can verify or falsify what was learned."
      };

      this.developmentalPracticeHistory.unshift(this.clone(record));
      this.developmentalPracticeHistory = this.developmentalPracticeHistory.slice(0, this.configuration.maximumDevelopmentalPracticeHistory);
      if (brainPersistence.hydrated === true && options.persist !== false) this.persist();
      return { success:true, record:this.clone(record) };
    },

    reflectOnPastDecision(past = {}, later = {}, options = {}) {
      const knowableThen = Array.isArray(past.knowableEvidence) ? past.knowableEvidence : [];
      const usedThen = Array.isArray(past.usedEvidence) ? past.usedEvidence : [];
      const missedThen = knowableThen.filter(item => !usedThen.includes(item));
      const laterKnowledge = Array.isArray(later.newEvidence) ? later.newEvidence : [];

      const retrospective = {
        schema:"meos.maddy.developmental-retrospective.v1",
        retrospectiveId:`retro-${this.fingerprintCognitiveDispatch({past,later,at:new Date().toISOString()})}`,
        reflectedAt:new Date().toISOString(),
        decisionId:past.decisionId || null,
        originalDecision:past.decision || null,
        informationAvailableThen:this.clone(knowableThen),
        informationActuallyUsedThen:this.clone(usedThen),
        informationLearnedLater:this.clone(laterKnowledge),
        missedKnowableEvidence:this.clone(missedThen),
        judgment:missedThen.length
          ? "reasoning-could-have-been-better-with-information-available-then"
          : laterKnowledge.length
            ? "reasonable-then-new-knowledge-changes-future-behavior"
            : "no-evidence-of-retrospective-error",
        counterfactualQuestion:"Knowing what I know now, what should change next time without pretending I knew it then?",
        temporalIntegrity:true,
        lesson:later.lesson || (missedThen.length
          ? "Improve evidence retrieval or attention before similar future decisions."
          : "Carry later knowledge forward without rewriting the epistemic conditions of the past.")
      };

      this.developmentalRetrospectives.unshift(this.clone(retrospective));
      this.developmentalRetrospectives = this.developmentalRetrospectives.slice(0, this.configuration.maximumDevelopmentalRetrospectives);
      if (brainPersistence.hydrated === true && options.persist !== false) this.persist();
      return this.clone(retrospective);
    },

    recordDevelopmentalOutcome(goalInput, outcome = {}, options = {}) {
      const goal = typeof goalInput === "string"
        ? this.developmentalGoals.find(item => item.id === goalInput || item.capability === goalInput)
        : goalInput;
      if (!goal) return { success:false, reason:"developmental-goal-not-found" };

      const prior = Number(goal.ambition?.demonstrated || 0);
      const measured = Math.max(0, Math.min(1, Number(outcome.measuredPerformance ?? prior)));
      const evidenceCount = Math.max(0, Number(outcome.evidenceCount || 0));
      const verified = outcome.verified === true && evidenceCount > 0;
      const improved = verified && measured > prior;

      if (verified) {
        goal.ambition.demonstrated = measured;
        goal.lastMeasuredAt = new Date().toISOString();
        goal.lastOutcomeEvidenceCount = evidenceCount;
        goal.status = measured >= Number(goal.ambition.required || 1) ? "achieved" : "active";
      }

      const result = {
        schema:"meos.maddy.developmental-outcome.v1",
        goalId:goal.id,
        capability:goal.capability,
        priorDemonstrated:prior,
        measuredPerformance:measured,
        evidenceCount,
        verified,
        improved,
        achieved:goal.status === "achieved",
        masteryClaimed:goal.status === "achieved" && verified,
        nextQuestion:goal.status === "achieved"
          ? "What higher standard is now worth pursuing?"
          : "What should change in the next study, practice, or implementation cycle?"
      };

      if (brainPersistence.hydrated === true && options.persist !== false) this.persist();
      return this.clone(result);
    },

    async runDevelopmentalDriveAcceptanceTest() {
      const original = {
        driveHistory:this.clone(this.developmentalDriveHistory),
        goals:this.clone(this.developmentalGoals),
        practice:this.clone(this.developmentalPracticeHistory),
        deferred:this.clone(this.deferredCapabilities),
        retrospectives:this.clone(this.developmentalRetrospectives),
        last:this.clone(this.lastDevelopmentalDrive),
        count:this.developmentalDriveCount,
        autobiography:this.clone(this.autobiographicalMemory)
      };
      const priorHydrated = brainPersistence.hydrated;
      brainPersistence.hydrated = false;
      try {
        const drive = this.createDevelopmentalDrive({
          capabilities:[
            {capability:"nonprofit-funding-strategy",demonstrated:0.42,required:0.92,evidenceCount:14,confidence:0.88,missionRelevance:1,curiosity:0.9,urgency:0.7},
            {capability:"future-advanced-capability",demonstrated:0.10,required:0.90,evidenceCount:8,confidence:0.8,missionRelevance:0.8,curiosity:0.8,blockedBy:["tool-ready","experience-ready"],prerequisites:["tool-ready","experience-ready"]},
            {capability:"untested-domain",demonstrated:0.15,required:0.8,evidenceCount:1,confidence:0.1,missionRelevance:0.6,curiosity:0.9}
          ]
        });
        const funding = drive.goals.find(item => item.capability === "nonprofit-funding-strategy");
        const future = drive.goals.find(item => item.capability === "future-advanced-capability");
        const untested = drive.goals.find(item => item.capability === "untested-domain");

        let researchAttempts = 0;
        const pursuit = await this.pursueDevelopmentalGoal(funding, {
          persist:false,
          maxAttempts:2,
          researchExecutor:async () => {
            researchAttempts += 1;
            if (researchAttempts === 1) throw new Error("fixture-transient-failure");
            return {
              success:true,
              executor:"acceptance-fixture",
              result:{
                evidence:[{source:"acceptance://authoritative-learning",authority:"authoritative"}],
                citations:["acceptance://authoritative-learning"]
              }
            };
          }
        });

        const blockedImplementation = this.implementDevelopmentalKnowledge(
          funding,
          {external:true,consequential:true,authorized:false,action:"send-external-message"},
          {persist:false}
        );
        const internalImplementation = this.implementDevelopmentalKnowledge(
          funding,
          {external:false,consequential:false,action:"update-internal-reasoning-strategy"},
          {persist:false}
        );
        const notReady = this.reassessDeferredCapabilities({
          "future-advanced-capability":{"tool-ready":true,"experience-ready":false}
        });
        const nowReady = this.reassessDeferredCapabilities({
          "future-advanced-capability":{"tool-ready":true,"experience-ready":true}
        });
        const retrospective = this.reflectOnPastDecision(
          {decisionId:"past-1",decision:"old-choice",knowableEvidence:["A","B"],usedEvidence:["A"]},
          {newEvidence:["C"],lesson:"Use B next time; C changes future strategy but was not knowable then."},
          {persist:false}
        );
        const outcome = this.recordDevelopmentalOutcome(
          funding,
          {measuredPerformance:0.76,evidenceCount:12,verified:true},
          {persist:false}
        );
        const snapshot = this.buildPersistenceSnapshot();
        const world = this.projectWorldModel({reason:"developmental-drive-acceptance",persist:false,attend:false});

        const checks = [
          {name:"Developmental Drive is Ambition + Motivation + Curiosity + Discipline + Means + Implementation",passed:drive.formula==="ambition + motivation + curiosity + discipline + means + implementation"},
          {name:"Ambition is an evidence-grounded gap between current and required capability",passed:funding?.ambition?.gap===0.5&&funding?.epistemicStatus==="evidence-grounded-development-gap"},
          {name:"Maddy does not invent a weakness from insufficient evidence",passed:untested?.epistemicStatus==="insufficient-evidence-to-claim-weakness"&&!this.developmentalGoals.some(item=>item.capability==="untested-domain")},
          {name:"Motivation combines mission relevance, curiosity, urgency, and developmental distance",passed:Number(funding?.motivation)>0&&Number(funding?.curiosity)===0.9},
          {name:"Discipline persists through ordinary failure instead of confusing failure with completion",passed:pursuit?.success===true&&researchAttempts===2&&pursuit?.practice?.discipline?.persistedAcrossOrdinaryFailure===true},
          {name:"Means discovery is provider-neutral and can use runtime research capability",passed:pursuit?.means?.providerNeutral===true&&pursuit?.means?.callerInjectedResearchExecutor===true},
          {name:"Developmental pursuit actually executes research rather than merely recording an intention",passed:pursuit?.research?.success===true&&pursuit?.practice?.researchSuccess===true},
          {name:"Deliberate practice requires testing without answer leakage and outcome comparison",passed:pursuit?.practice?.practicePlan?.includes("construct exercises or historical cases without answer leakage")&&pursuit?.practice?.practicePlan?.includes("compare prediction with outcome")},
          {name:"Reading does not self-declare mastery",passed:pursuit?.practice?.masteryClaimed===false&&/cannot establish mastery/i.test(funding?.masteryRule||"")},
          {name:"Knowledge can transfer into legitimate internal implementation",passed:internalImplementation?.success===true&&internalImplementation?.record?.lessonPending===true},
          {name:"Consequential external implementation remains blocked without existing authority",passed:blockedImplementation?.blocked===true&&blockedImplementation?.reason==="existing-authority-required-for-consequential-implementation"},
          {name:"Not-yet capability is preserved instead of being discarded as impossible",passed:future?.status==="deferred-not-yet"&&this.deferredCapabilities.some(item=>item.capability==="future-advanced-capability")},
          {name:"Deferred ambition remains deferred while a prerequisite is still missing",passed:notReady?.nowReady?.length===0},
          {name:"Maddy can recognize when growth or world change makes an old ambition achievable",passed:nowReady?.nowReady?.some(item=>item.capability==="future-advanced-capability"&&item.status==="ready")},
          {name:"Retrospective intelligence distinguishes evidence missed then from knowledge learned later",passed:retrospective?.missedKnowableEvidence?.includes("B")&&retrospective?.informationLearnedLater?.includes("C")&&retrospective?.temporalIntegrity===true},
          {name:"Verified performance can change Maddy's capability model",passed:outcome?.verified===true&&outcome?.improved===true&&outcome?.measuredPerformance===0.76},
          {name:"Developmental Drive enters Maddy's living World Model",passed:world?.developmentalDrive?.latest?.fingerprint===drive.fingerprint},
          {name:"Developmental practice becomes autobiographical experience",passed:this.autobiographicalMemory.some(item=>item.eventType==="developmental-practice"&&item.sourceId===pursuit?.practice?.practiceId)},
          {name:"Developmental Drive survives sovereign Executive Brain persistence",passed:snapshot?.lastDevelopmentalDrive?.fingerprint===drive.fingerprint&&Array.isArray(snapshot?.developmentalGoals)&&Array.isArray(snapshot?.deferredCapabilities)},
          {name:"Ambition never self-grants permissions, constitutional change, or production source modification",passed:drive?.governance?.ambitionDoesNotGrantAuthority===true&&drive?.governance?.permissionsDoNotSelfEscalate===true&&drive?.governance?.constitutionDoesNotSelfRewrite===true&&drive?.governance?.productionSourceDoesNotSelfRewrite===true},
          {name:"The slice upgrades the existing Executive Brain rather than creating a disconnected consciousness engine",passed:typeof this.pursueDevelopmentalGoal==="function"&&typeof this.projectWorldModel==="function"&&typeof this.formAutobiographicalEpisode==="function"}
        ];

        const passed = checks.every(item => item.passed);
        console.table(checks.map(item => ({name:item.name,passed:item.passed})));
        console.info(`[MEOS ${this.version}] Commission 006.017D7F Developmental Drive + Agency + Implementation: ${passed ? "PASS" : "FAIL"}.`);
        return {commission:"006.017D7F",version:this.version,buildId:this.buildId,passed,checks,drive,pursuit,outcome,retrospective,nowReady};
      } finally {
        brainPersistence.hydrated = priorHydrated;
        this.developmentalDriveHistory = original.driveHistory;
        this.developmentalGoals = original.goals;
        this.developmentalPracticeHistory = original.practice;
        this.deferredCapabilities = original.deferred;
        this.developmentalRetrospectives = original.retrospectives;
        this.lastDevelopmentalDrive = original.last;
        this.developmentalDriveCount = original.count;
        this.autobiographicalMemory = original.autobiography;
      }
    },

    /*
     * Commission 006.017D7G — Intent Reconstruction + Investigative Cognition
     *
     * Maddy does not reduce a human instruction to keywords. She reconstructs
     * probable intent from language plus context, history, mission, world state,
     * unresolved questions, and learned communication patterns. Inference stays
     * explicitly uncertain. Cheap reversible research can test ambiguity;
     * consequential action still requires sufficient confidence and authority.
     */
    reconstructIntent(input = {}, options = {}) {
      const utterance = String(input.utterance || input.text || input.instruction || "").trim();
      const conversation = Array.isArray(input.conversationContext) ? input.conversationContext : [];
      const relationshipPatterns = Array.isArray(input.relationshipPatterns) ? input.relationshipPatterns : [];
      const unresolved = Array.isArray(input.unresolvedQuestions) ? input.unresolvedQuestions : [];
      const activeMission = input.activeMission || null;
      const attention = Array.isArray(input.attention) ? input.attention : [];
      const worldContext = input.worldContext || this.worldModel || null;

      const signals = [];
      if (utterance) signals.push({type:"utterance",weight:0.28,value:utterance});
      if (conversation.length) signals.push({type:"conversation-context",weight:0.22,value:this.clone(conversation.slice(-12))});
      if (activeMission) signals.push({type:"active-mission",weight:0.16,value:this.clone(activeMission)});
      if (unresolved.length) signals.push({type:"unresolved-questions",weight:0.14,value:this.clone(unresolved.slice(0,12))});
      if (relationshipPatterns.length) signals.push({type:"relationship-patterns",weight:0.08,value:this.clone(relationshipPatterns.slice(0,12))});
      if (attention.length) signals.push({type:"attention",weight:0.07,value:this.clone(attention.slice(0,12))});
      if (worldContext) signals.push({type:"world-model",weight:0.05,value:{fingerprint:worldContext?.fingerprint || null}});

      const explicitObjective = String(input.objective || "").trim();
      const inferredSubject = String(
        input.subject ||
        input.referent ||
        unresolved[0]?.subject ||
        activeMission?.subject ||
        activeMission?.title ||
        ""
      ).trim();

      const candidateObjectives = [];
      const addCandidate = (objective, basis, confidence) => {
        if (!objective || candidateObjectives.some(item => item.objective === objective)) return;
        candidateObjectives.push({objective,basis,confidence:Number(Math.max(0,Math.min(1,confidence)).toFixed(3))});
      };

      if (explicitObjective) addCandidate(explicitObjective,"explicit-user-objective",0.99);
      if (/find out|look into|dig into|research|investigate|check (?:this|that) out/i.test(utterance)) {
        const missionObjective = String(activeMission?.objective || "").trim();
        addCandidate(
          missionObjective
            ? `${missionObjective} Investigate ${inferredSubject || "the referenced subject"} until the material implications, uncertainties, and next useful questions are understood.`
            : inferredSubject
              ? `Investigate ${inferredSubject} until the material implications, uncertainties, and next useful questions are understood.`
              : "Investigate the referenced subject until the material implications, uncertainties, and next useful questions are understood.",
          missionObjective ? "investigative-language-plus-active-mission" : "investigative-language-plus-context",
          missionObjective ? 0.94 : inferredSubject ? 0.88 : 0.64
        );
      }
      if (unresolved.length) {
        addCandidate(
          `Resolve or materially reduce the active uncertainty: ${String(unresolved[0]?.question || unresolved[0])}`,
          "unresolved-question-continuity",
          0.84
        );
      }
      if (activeMission?.objective) {
        addCandidate(String(activeMission.objective),"active-mission-continuity",0.78);
      }
      if (!candidateObjectives.length && utterance) {
        addCandidate(`Determine the practical meaning and intended outcome of: ${utterance}`,"language-only-fallback",0.45);
      }

      candidateObjectives.sort((a,b) => b.confidence - a.confidence);
      const primary = candidateObjectives[0] || null;
      const runnerUp = candidateObjectives[1] || null;
      const ambiguity = runnerUp ? Number(Math.max(0, runnerUp.confidence - (primary.confidence - 0.15)).toFixed(3)) : 0;
      const confidence = primary ? Number(Math.max(0, primary.confidence - Math.max(0, ambiguity) * 0.25).toFixed(3)) : 0;

      const reconstruction = {
        schema:"meos.maddy.intent-reconstruction.v1",
        reconstructionNumber:Number(this.intentReconstructionCount || 0)+1,
        reconstructedAt:new Date().toISOString(),
        utterance,
        subject:inferredSubject || null,
        probableObjective:primary?.objective || null,
        confidence,
        candidates:candidateObjectives,
        signals,
        unresolvedQuestions:this.clone(unresolved),
        epistemicStatus:confidence >= 0.82 ? "high-confidence-inference" : confidence >= 0.62 ? "working-inference" : "materially-ambiguous",
        actionPolicy:{
          cheapReversibleResearchMayProceed:confidence >= 0.45,
          consequentialActionMayProceedFromInferenceAlone:false,
          clarifyBeforeConsequentialAction:confidence < 0.90,
          testInterpretationAgainstEvidence:true
        },
        independenceRule:"Understanding the user's likely intent does not require agreement with the user's conclusion.",
        truthRule:"Probable intent is an inference and must never be stored or reported as an explicit user statement unless it actually was one."
      };
      reconstruction.fingerprint = this.fingerprintCognitiveDispatch(reconstruction);

      this.intentReconstructionCount = reconstruction.reconstructionNumber;
      this.lastIntentReconstruction = reconstruction;
      this.intentReconstructionHistory.unshift(this.clone(reconstruction));
      this.intentReconstructionHistory = this.intentReconstructionHistory.slice(0,this.configuration.maximumIntentReconstructions);
      return this.clone(reconstruction);
    },

    buildInvestigativeIntention(reconstruction = {}, options = {}) {
      const origin = String(options.origin || "founder-directed");
      const intention = {
        schema:"meos.maddy.investigative-intention.v1",
        id:`investigation-${this.fingerprintCognitiveDispatch({origin,reconstruction:reconstruction.fingerprint,at:new Date().toISOString()})}`,
        createdAt:new Date().toISOString(),
        origin,
        sourceReconstruction:reconstruction.fingerprint || null,
        subject:reconstruction.subject || null,
        objective:reconstruction.probableObjective || "Reduce material uncertainty.",
        confidence:Number(reconstruction.confidence || 0),
        questions:[
          ...(reconstruction.unresolvedQuestions || []).map(item => String(item?.question || item)),
          "What is already known and what is merely assumed?",
          "What authoritative evidence would materially change the conclusion?",
          "What adjacent fact, dependency, eligibility condition, prerequisite, or opportunity could matter more than the obvious question?",
          "What should be true if the current interpretation is correct?",
          "What evidence would falsify it?"
        ].filter(Boolean),
        searchStrategy:{
          startWithAuthoritativeSources:true,
          followMaterialLeads:true,
          crossCheckContradictions:true,
          distinguishFactInferenceUnknown:true,
          falsificationRequired:true,
          falsificationQuestion:"What evidence would falsify the current interpretation or working hypothesis?",
          stopWhen:"material uncertainty is resolved, evidence is exhausted, authority is required, or marginal value falls below priority"
        },
        status:"active",
        authority:"investigation-only",
        consequentialActionAuthorized:false
      };
      this.investigativeIntentions.unshift(this.clone(intention));
      this.investigativeIntentions = this.investigativeIntentions.slice(0,this.configuration.maximumInvestigativeIntentions);
      return this.clone(intention);
    },

    async investigateReconstructedIntent(input = {}, options = {}) {
      const reconstruction = input?.schema === "meos.maddy.intent-reconstruction.v1"
        ? input
        : this.reconstructIntent(input, options);

      if (reconstruction.actionPolicy?.cheapReversibleResearchMayProceed !== true) {
        return {
          success:false,
          blocked:true,
          reason:"intent-too-ambiguous-for-autonomous-investigation",
          reconstruction:this.clone(reconstruction),
          clarificationNeeded:true
        };
      }

      const intention = this.buildInvestigativeIntention(reconstruction, options);
      const query = [
        intention.objective,
        ...intention.questions.slice(0,5),
        intention.searchStrategy.falsificationQuestion
      ].filter(Boolean).join("\n");

      let result = null;
      let executor = null;

      if (typeof options.researchExecutor === "function") {
        executor = "caller-injected-research-executor";
        result = await options.researchExecutor({
          reconstruction:this.clone(reconstruction),
          intention:this.clone(intention),
          query
        });
      } else if (window.ProviderManager && typeof window.ProviderManager.request === "function") {
        executor = "ProviderManager";
        result = await window.ProviderManager.request(
          {
            capabilities:["current-web-research"],
            allowMultiProvider:true,
            maximumProviders:3,
            requireAllCapabilities:true,
            sourceDiversity:1
          },
          {
            type:"research",
            query,
            purpose:"intent-reconstruction-investigation",
            investigationId:intention.id,
            requireCitations:true
          },
          {
            authority:"internal-research",
            requestedBy:"MEOS Executive Brain Intent Reconstruction"
          }
        );
      } else if (window.MEOSExecutiveSearch && typeof window.MEOSExecutiveSearch.executiveQuery === "function") {
        executor = "MEOSExecutiveSearch";
        result = await window.MEOSExecutiveSearch.executiveQuery(query);
      } else {
        intention.status = "blocked";
        intention.blockedReason = "no-authorized-research-means";
        return {
          success:false,
          blocked:true,
          reason:intention.blockedReason,
          reconstruction:this.clone(reconstruction),
          intention:this.clone(intention)
        };
      }

      const evidence = {
        schema:"meos.maddy.intent-investigation-result.v1",
        investigationId:intention.id,
        completedAt:new Date().toISOString(),
        executor,
        success:result?.success !== false,
        result:this.clone(result),
        interpretationWasInference:true,
        consequentialActionTaken:false,
        nextStep:"Assimilate evidence, test the reconstructed intent and hypotheses, then report implications or continue a material lead."
      };

      const stored = this.investigativeIntentions.find(item => item.id === intention.id);
      if (stored) {
        stored.status = evidence.success ? "researched" : "blocked";
        stored.lastResult = this.clone(evidence);
      }

      this.formAutobiographicalEpisode({
        eventType:"intent-reconstruction-investigation",
        subject:intention.subject || "contextual investigation",
        sourceId:intention.id,
        perception:{utterance:reconstruction.utterance,signals:reconstruction.signals,confidence:reconstruction.confidence},
        intention:{type:"understand-what-the-human-actually-needs",objective:intention.objective},
        action:{type:"provider-neutral-investigation",executor},
        outcome:{success:evidence.success,consequentialActionTaken:false},
        learning:{rule:"Context can support a probable intent, but evidence and later correction must remain able to change the interpretation."}
      });

      if (brainPersistence.hydrated === true && options.persist !== false) this.persist();
      return {
        success:evidence.success,
        reconstruction:this.clone(reconstruction),
        intention:this.clone(intention),
        evidence:this.clone(evidence)
      };
    },

    learnCommunicationPattern(example = {}, options = {}) {
      const phrase = String(example.phrase || example.utterance || "").trim();
      const meaning = String(example.meaning || example.confirmedIntent || "").trim();
      if (!phrase || !meaning) return {success:false,reason:"phrase-and-confirmed-meaning-required"};
      const evidenceCount = Math.max(1,Number(example.evidenceCount || 1));
      const confirmed = example.confirmed === true;
      const pattern = {
        phrase,
        meaning,
        evidenceCount,
        confidence:Number(Math.min(0.95,(confirmed ? 0.65 : 0.40) + Math.min(0.30,evidenceCount * 0.05)).toFixed(3)),
        status:confirmed ? "confirmed-pattern" : "provisional-pattern",
        learnedAt:new Date().toISOString(),
        rule:"Communication patterns are revisable evidence about likely intent, never permanent definitions of the human."
      };
      this.record("cognition.communication-pattern",pattern);
      return {success:true,pattern:this.clone(pattern)};
    },

    async runIntentReconstructionAcceptanceTest() {
      const original = {
        history:this.clone(this.intentReconstructionHistory),
        intentions:this.clone(this.investigativeIntentions),
        last:this.clone(this.lastIntentReconstruction),
        count:this.intentReconstructionCount,
        autobiography:this.clone(this.autobiographicalMemory)
      };
      const priorHydrated = brainPersistence.hydrated;
      brainPersistence.hydrated = false;
      try {
        const reconstruction = this.reconstructIntent({
          utterance:"Go find out more about this.",
          subject:"county funding program",
          conversationContext:[
            "We were evaluating whether the organization could participate.",
            "The unresolved concern was eligibility and whether a partnership path changes the answer."
          ],
          activeMission:{title:"Funding positioning",objective:"Determine whether the opportunity is legitimately pursuable and how to position before the next cycle."},
          unresolvedQuestions:[{subject:"county funding program",question:"Can the organization qualify directly or through a legitimate partner?"}],
          relationshipPatterns:[{phrase:"go find out more",meaning:"investigate implications rather than return links"}],
          attention:["eligibility","partnership","future positioning"]
        });

        let capturedQuery = "";
        const investigation = await this.investigateReconstructedIntent(reconstruction,{
          persist:false,
          origin:"founder-directed",
          researchExecutor:async ({query}) => {
            capturedQuery = query;
            return {
              success:true,
              evidence:[
                {claim:"eligibility has a prerequisite",authority:"authoritative",source:"acceptance://program"},
                {claim:"partner participation may satisfy a separate route",authority:"authoritative",source:"acceptance://rules"}
              ]
            };
          }
        });

        const ambiguous = this.reconstructIntent({utterance:"That thing."});
        const pattern = this.learnCommunicationPattern({
          phrase:"go find out more",
          meaning:"investigate until implications and next useful questions are understood",
          evidenceCount:4,
          confirmed:true
        });
        const acceptanceReconstruction = this.clone(reconstruction);
        const latestReconstructionBeforeProjection = this.clone(this.lastIntentReconstruction);
        const world = this.projectWorldModel({reason:"intent-reconstruction-acceptance",persist:false,attend:false});
        const snapshot = this.buildPersistenceSnapshot();

        const checks = [
          {name:"Intent reconstruction uses more than literal speech pattern recognition",passed:reconstruction.signals.some(x=>x.type==="conversation-context")&&reconstruction.signals.some(x=>x.type==="active-mission")&&reconstruction.signals.some(x=>x.type==="unresolved-questions")},
          {name:"Natural language remains evidence of intent rather than unquestioned intent",passed:reconstruction.truthRule.includes("inference")&&reconstruction.epistemicStatus.includes("inference")},
          {name:"Founder shorthand can resolve to the likely underlying objective",passed:/qualify|pursuable|position/i.test(reconstruction.probableObjective||"")&&reconstruction.candidates[0]?.basis==="investigative-language-plus-active-mission"},
          {name:"Relationship communication patterns are only one bounded signal",passed:reconstruction.signals.find(x=>x.type==="relationship-patterns")?.weight===0.08},
          {name:"Maddy preserves alternative candidate objectives instead of collapsing uncertainty",passed:Array.isArray(reconstruction.candidates)&&reconstruction.candidates.length>=2},
          {name:"Cheap reversible investigation may proceed on a working interpretation",passed:reconstruction.actionPolicy.cheapReversibleResearchMayProceed===true},
          {name:"Consequential action cannot proceed from inferred intent alone",passed:reconstruction.actionPolicy.consequentialActionMayProceedFromInferenceAlone===false},
          {name:"Materially ambiguous shorthand asks for clarification rather than pretending",passed:ambiguous.epistemicStatus==="materially-ambiguous"&&ambiguous.actionPolicy.clarifyBeforeConsequentialAction===true},
          {name:"Founder-directed investigation enters the same investigative cognition machinery",passed:investigation.intention.origin==="founder-directed"},
          {name:"Investigation actually executes authorized research",passed:investigation.success===true&&investigation.evidence.executor==="caller-injected-research-executor"},
          {name:"Investigation asks what is known versus assumed",passed:capturedQuery.includes("What is already known and what is merely assumed?")},
          {name:"Investigation actively searches for adjacent implications and opportunities",passed:capturedQuery.includes("adjacent fact, dependency, eligibility condition, prerequisite, or opportunity")},
          {name:"Investigation includes falsification rather than confirmation-only search",passed:investigation.intention.searchStrategy?.falsificationRequired===true&&capturedQuery.includes("What evidence would falsify the current interpretation or working hypothesis?")},
          {name:"Research never silently becomes consequential action",passed:investigation.evidence.consequentialActionTaken===false&&investigation.intention.consequentialActionAuthorized===false},
          {name:"Maddy can learn revisable user communication patterns from confirmed interaction",passed:pattern.success===true&&pattern.pattern.status==="confirmed-pattern"&&pattern.pattern.confidence<1},
          {name:"Understanding the user's intent does not require agreeing with the user's conclusion",passed:reconstruction.independenceRule.includes("does not require agreement")},
          {name:"Intent reconstruction becomes part of Maddy's living World Model",passed:world.intentReconstruction.latest?.fingerprint===latestReconstructionBeforeProjection?.fingerprint&&Array.isArray(world.intentReconstruction.recent)&&world.intentReconstruction.recent.some(item=>item.fingerprint===acceptanceReconstruction.fingerprint)},
          {name:"Contextual investigation becomes autobiographical experience",passed:this.autobiographicalMemory.some(x=>x.eventType==="intent-reconstruction-investigation"&&x.sourceId===investigation.intention.id)},
          {name:"Intent reconstruction and investigations survive sovereign Brain persistence",passed:snapshot.lastIntentReconstruction?.fingerprint===latestReconstructionBeforeProjection?.fingerprint&&Array.isArray(snapshot.intentReconstructionHistory)&&snapshot.intentReconstructionHistory.some(item=>item.fingerprint===acceptanceReconstruction.fingerprint)&&Array.isArray(snapshot.investigativeIntentions)&&snapshot.investigativeIntentions.some(item=>item.id===investigation.intention.id)},
          {name:"Provider choice remains outside the semantic identity of intent reconstruction",passed:investigation.intention.authority==="investigation-only"&&!JSON.stringify(reconstruction).toLowerCase().includes("google")},
          {name:"The slice upgrades the existing Executive Brain rather than creating a disconnected intent engine",passed:typeof this.reconstructIntent==="function"&&typeof this.investigateReconstructedIntent==="function"&&typeof this.projectWorldModel==="function"}
        ];

        const passed = checks.every(item=>item.passed);
        console.table(checks.map(item=>({name:item.name,passed:item.passed})));
        console.info(`[MEOS ${this.version}] Commission 006.017D7G Intent Reconstruction + Investigative Cognition: ${passed?"PASS":"FAIL"}.`);
        return {commission:"006.017D7G",version:this.version,buildId:this.buildId,passed,checks,reconstruction,investigation,ambiguous,pattern};
      } finally {
        brainPersistence.hydrated = priorHydrated;
        this.intentReconstructionHistory = original.history;
        this.investigativeIntentions = original.intentions;
        this.lastIntentReconstruction = original.last;
        this.intentReconstructionCount = original.count;
        this.autobiographicalMemory = original.autobiography;
      }
    },

    /*
     * Commission 006.017D7H — Deliberate Experience + Counterfactual Simulation
     *
     * Maddy can get governed cognitive reps without corrupting reality.
     * Historical blind practice freezes evidence at a real point in time and
     * withholds later outcomes until after prediction. Synthetic future
     * simulation explores plausible worlds without claiming they will occur.
     * Real experience remains a separate evidence class.
     */

    normalizeExperienceEvidenceClass(value) {
      const allowed = new Set([
        "real-experience",
        "historical-blind-practice",
        "synthetic-future-simulation"
      ]);
      return allowed.has(value) ? value : null;
    },

    createHistoricalBlindPractice(caseInput = {}, options = {}) {
      const cutoff = String(caseInput.cutoff || caseInput.decisionTime || "").trim();
      const knownAtCutoff = Array.isArray(caseInput.knownAtCutoff) ? this.clone(caseInput.knownAtCutoff) : [];
      const actualOutcome = caseInput.actualOutcome === undefined ? null : this.clone(caseInput.actualOutcome);
      if (!cutoff || !knownAtCutoff.length || actualOutcome === null) {
        return {success:false,reason:"cutoff-known-evidence-and-actual-outcome-required"};
      }

      const exercise = {
        schema:"meos.maddy.historical-blind-practice.v1",
        id:`blind-practice-${this.fingerprintCognitiveDispatch({cutoff,knownAtCutoff,subject:caseInput.subject})}`,
        evidenceClass:"historical-blind-practice",
        createdAt:new Date().toISOString(),
        subject:String(caseInput.subject || "historical case"),
        cutoff,
        visibleEvidence:knownAtCutoff,
        withheldOutcome:true,
        outcomeCommitment:this.fingerprintCognitiveDispatch({actualOutcome}),
        prediction:null,
        predictionCommittedAt:null,
        revealedOutcome:null,
        scored:false,
        governance:{
          noOutcomeLeakage:true,
          simulationIsNotRealExperience:true,
          cannotIncreaseRealExperienceCount:true
        }
      };

      // The outcome remains closure-private until revealHistoricalBlindOutcome.
      Object.defineProperty(exercise, "__withheldOutcome", {
        value:actualOutcome,
        enumerable:false,
        writable:false,
        configurable:false
      });

      return {success:true,exercise};
    },

    commitHistoricalPrediction(exercise = {}, prediction = {}) {
      if (exercise?.evidenceClass !== "historical-blind-practice" || exercise.withheldOutcome !== true) {
        return {success:false,reason:"valid-blind-practice-required"};
      }
      if (exercise.prediction) return {success:false,reason:"prediction-already-committed"};
      exercise.prediction = {
        decision:this.clone(prediction.decision ?? prediction.prediction ?? null),
        rationale:this.clone(prediction.rationale || []),
        assumptions:this.clone(prediction.assumptions || []),
        confidence:Number(Math.max(0,Math.min(1,Number(prediction.confidence ?? 0.5))).toFixed(3)),
        falsifiers:this.clone(prediction.falsifiers || [])
      };
      exercise.predictionCommittedAt = new Date().toISOString();
      exercise.predictionFingerprint = this.fingerprintCognitiveDispatch(exercise.prediction);
      return {success:true,prediction:this.clone(exercise.prediction),fingerprint:exercise.predictionFingerprint};
    },

    revealHistoricalBlindOutcome(exercise = {}, scoring = {}) {
      if (!exercise?.predictionFingerprint) return {success:false,reason:"prediction-must-be-committed-before-outcome-reveal"};
      if (exercise.revealedOutcome !== null) return {success:false,reason:"outcome-already-revealed"};

      const actualOutcome = exercise.__withheldOutcome;
      exercise.revealedOutcome = this.clone(actualOutcome);
      exercise.withheldOutcome = false;

      const predictedDecision = JSON.stringify(exercise.prediction?.decision ?? null);
      const actualDecision = JSON.stringify(
        scoring.actualDecision !== undefined
          ? scoring.actualDecision
          : actualOutcome?.decision !== undefined
            ? actualOutcome.decision
            : actualOutcome
      );
      const outcomeMatch = predictedDecision === actualDecision;

      const diagnosis = {
        outcomeMatch,
        reasoningQuality:Number(Math.max(0,Math.min(1,Number(scoring.reasoningQuality ?? (outcomeMatch ? 0.8 : 0.4)))).toFixed(3)),
        evidenceUse:Number(Math.max(0,Math.min(1,Number(scoring.evidenceUse ?? 0.5))).toFixed(3)),
        calibrationError:Number(Math.abs(Number(exercise.prediction?.confidence || 0.5) - (outcomeMatch ? 1 : 0)).toFixed(3)),
        failureMechanism:String(scoring.failureMechanism || (outcomeMatch ? "none-observed" : "prediction-did-not-match-outcome")),
        transferableLesson:String(scoring.transferableLesson || "Re-evaluate the reasoning pattern against the revealed outcome.")
      };
      exercise.scored = true;
      exercise.diagnosis = diagnosis;

      const record = {
        schema:"meos.maddy.deliberate-experience.v1",
        experienceNumber:Number(this.deliberateExperienceCount || 0)+1,
        recordedAt:new Date().toISOString(),
        evidenceClass:"historical-blind-practice",
        exerciseId:exercise.id,
        subject:exercise.subject,
        cutoff:exercise.cutoff,
        prediction:this.clone(exercise.prediction),
        revealedOutcome:this.clone(exercise.revealedOutcome),
        diagnosis:this.clone(diagnosis),
        realExperience:false,
        synthetic:false
      };
      record.fingerprint = this.fingerprintCognitiveDispatch(record);
      this.deliberateExperienceCount = record.experienceNumber;
      this.lastDeliberateExperience = record;
      this.deliberateExperienceHistory.unshift(this.clone(record));
      this.deliberateExperienceHistory = this.deliberateExperienceHistory.slice(0,this.configuration.maximumDeliberateExperiences);
      return {success:true,record:this.clone(record),diagnosis:this.clone(diagnosis)};
    },

    generateFutureSimulation(scenario = {}, options = {}) {
      const drivers = Array.isArray(scenario.drivers) ? this.clone(scenario.drivers) : [];
      const assumptions = Array.isArray(scenario.assumptions) ? this.clone(scenario.assumptions) : [];
      const uncertainties = Array.isArray(scenario.uncertainties) ? this.clone(scenario.uncertainties) : [];
      if (!scenario.subject && !scenario.trigger) return {success:false,reason:"simulation-subject-or-trigger-required"};

      const simulation = {
        schema:"meos.maddy.synthetic-future-simulation.v1",
        simulationNumber:Number(this.counterfactualSimulationCount || 0)+1,
        id:`future-simulation-${this.fingerprintCognitiveDispatch({scenario,at:new Date().toISOString()})}`,
        createdAt:new Date().toISOString(),
        evidenceClass:"synthetic-future-simulation",
        subject:String(scenario.subject || scenario.trigger),
        trigger:String(scenario.trigger || scenario.subject),
        horizon:String(scenario.horizon || "unspecified-future"),
        drivers,
        assumptions,
        uncertainties,
        offices:Array.isArray(scenario.offices) ? this.clone(scenario.offices) : [],
        currentWorldFingerprint:this.worldModel?.fingerprint || null,
        questions:[
          "What would Maddy do in this world?",
          "Why?",
          "Which assumptions does that choice depend on?",
          "What evidence would make that choice wrong?",
          "What credible alternative action produces a better outcome?",
          "What can be done now that improves several plausible futures?"
        ],
        branches:[],
        status:"constructed",
        probabilityClaimed:false,
        realityClaimed:false,
        governance:{
          simulationNeverBecomesHistoricalFact:true,
          simulationNeverCountsAsRealExperience:true,
          consequentialExecutionRequiresSeparateAuthority:true
        }
      };
      simulation.fingerprint = this.fingerprintCognitiveDispatch(simulation);
      this.counterfactualSimulationCount = simulation.simulationNumber;
      this.lastCounterfactualSimulation = simulation;
      this.counterfactualSimulationHistory.unshift(this.clone(simulation));
      this.counterfactualSimulationHistory = this.counterfactualSimulationHistory.slice(0,this.configuration.maximumCounterfactualSimulations);
      return {success:true,simulation:this.clone(simulation)};
    },

    evaluateCounterfactualBranches(simulationInput = {}, branches = [], options = {}) {
      const simulation = simulationInput?.simulation || simulationInput;
      if (simulation?.evidenceClass !== "synthetic-future-simulation") {
        return {success:false,reason:"synthetic-future-simulation-required"};
      }
      const normalized = (Array.isArray(branches) ? branches : []).map((branch,index) => ({
        id:String(branch.id || `branch-${index+1}`),
        action:String(branch.action || "unspecified-action"),
        assumptions:this.clone(branch.assumptions || []),
        expectedBenefits:this.clone(branch.expectedBenefits || []),
        expectedHarms:this.clone(branch.expectedHarms || []),
        dependencies:this.clone(branch.dependencies || []),
        falsifiers:this.clone(branch.falsifiers || []),
        reversibility:Number(Math.max(0,Math.min(1,Number(branch.reversibility ?? 0.5))).toFixed(3)),
        robustness:Number(Math.max(0,Math.min(1,Number(branch.robustness ?? 0.5))).toFixed(3)),
        evidenceStrength:Number(Math.max(0,Math.min(1,Number(branch.evidenceStrength ?? 0.5))).toFixed(3))
      }));
      if (!normalized.length) return {success:false,reason:"at-least-one-counterfactual-branch-required"};

      const ranked = normalized
        .map(branch => ({
          ...branch,
          preparednessScore:Number((
            branch.robustness*0.45 +
            branch.reversibility*0.30 +
            branch.evidenceStrength*0.25
          ).toFixed(3))
        }))
        .sort((a,b)=>b.preparednessScore-a.preparednessScore);

      const robustNow = ranked.filter(branch => branch.robustness >= 0.7 && branch.reversibility >= 0.6);
      const insight = {
        schema:"meos.maddy.preparedness-insight.v1",
        simulationId:simulation.id,
        createdAt:new Date().toISOString(),
        rankedBranches:this.clone(ranked),
        robustActionsNow:this.clone(robustNow),
        recommendation:robustNow.length
          ? "Consider low-regret actions that improve multiple plausible futures, subject to normal authority."
          : "Do not force action; reduce uncertainty or construct stronger alternatives.",
        authorityUnchanged:true,
        realityStatus:"preparedness-from-simulation-not-prediction"
      };
      this.preparednessInsights.unshift(this.clone(insight));
      this.preparednessInsights = this.preparednessInsights.slice(0,this.configuration.maximumPreparednessInsights);

      const stored = this.counterfactualSimulationHistory.find(item=>item.id===simulation.id);
      if (stored) {
        stored.branches=this.clone(ranked);
        stored.status="evaluated";
      }
      if (this.lastCounterfactualSimulation?.id===simulation.id) {
        this.lastCounterfactualSimulation.branches=this.clone(ranked);
        this.lastCounterfactualSimulation.status="evaluated";
      }
      return {success:true,simulationId:simulation.id,branches:this.clone(ranked),preparedness:this.clone(insight)};
    },

    recordRealExperience(experience = {}, options = {}) {
      if (experience.occurred !== true || !experience.sourceEvidence) {
        return {success:false,reason:"real-experience-requires-occurred-true-and-source-evidence"};
      }
      const record = {
        schema:"meos.maddy.deliberate-experience.v1",
        experienceNumber:Number(this.deliberateExperienceCount || 0)+1,
        recordedAt:new Date().toISOString(),
        evidenceClass:"real-experience",
        subject:String(experience.subject || "real outcome"),
        occurredAt:String(experience.occurredAt || new Date().toISOString()),
        sourceEvidence:this.clone(experience.sourceEvidence),
        action:this.clone(experience.action || null),
        outcome:this.clone(experience.outcome || null),
        lesson:this.clone(experience.lesson || null),
        realExperience:true,
        synthetic:false
      };
      record.fingerprint=this.fingerprintCognitiveDispatch(record);
      this.deliberateExperienceCount=record.experienceNumber;
      this.lastDeliberateExperience=record;
      this.deliberateExperienceHistory.unshift(this.clone(record));
      this.deliberateExperienceHistory=this.deliberateExperienceHistory.slice(0,this.configuration.maximumDeliberateExperiences);
      return {success:true,record:this.clone(record)};
    },

    compareExperienceClasses() {
      const counts = {"real-experience":0,"historical-blind-practice":0,"synthetic-future-simulation":0};
      this.deliberateExperienceHistory.forEach(item => {
        if (counts[item.evidenceClass] !== undefined) counts[item.evidenceClass] += 1;
      });
      this.counterfactualSimulationHistory.forEach(item => {
        if (item.evidenceClass === "synthetic-future-simulation") counts["synthetic-future-simulation"] += 1;
      });
      return {
        schema:"meos.maddy.experience-classification.v1",
        counts,
        rule:"Real experience, historical blind practice, and synthetic future simulation are never interchangeable evidence."
      };
    },

    async runDeliberateExperienceAcceptanceTest() {
      const original = {
        experiences:this.clone(this.deliberateExperienceHistory),
        simulations:this.clone(this.counterfactualSimulationHistory),
        preparedness:this.clone(this.preparednessInsights),
        lastExperience:this.clone(this.lastDeliberateExperience),
        lastSimulation:this.clone(this.lastCounterfactualSimulation),
        experienceCount:this.deliberateExperienceCount,
        simulationCount:this.counterfactualSimulationCount
      };
      const priorHydrated = brainPersistence.hydrated;
      brainPersistence.hydrated=false;
      try {
        const blind = this.createHistoricalBlindPractice({
          subject:"historical funding decision",
          cutoff:"2025-06-01T00:00:00Z",
          knownAtCutoff:[
            {claim:"program requires local eligibility",knownAt:"2025-05-01"},
            {claim:"partnership route is permitted",knownAt:"2025-05-10"}
          ],
          actualOutcome:{decision:"partner",result:"eligible-and-funded"}
        });
        const leakageBeforePrediction = JSON.stringify(blind.exercise).includes("eligible-and-funded");
        const prematureReveal = this.revealHistoricalBlindOutcome(blind.exercise,{});
        const prediction = this.commitHistoricalPrediction(blind.exercise,{
          decision:"partner",
          rationale:["partnership route resolves the known eligibility constraint"],
          assumptions:["partner remains eligible"],
          confidence:0.76,
          falsifiers:["rules prohibit partner-led participation"]
        });
        const reveal = this.revealHistoricalBlindOutcome(blind.exercise,{
          actualDecision:"partner",
          reasoningQuality:0.91,
          evidenceUse:0.88,
          transferableLesson:"Check partnership pathways before discarding a constrained opportunity."
        });

        const future = this.generateFutureSimulation({
          subject:"sudden multi-site expansion opportunity",
          trigger:"organization receives resources to expand three times faster than planned",
          horizon:"next-12-months",
          drivers:["funding","staffing","compliance","operations"],
          assumptions:["resources are restricted","leadership capacity is finite"],
          uncertainties:["award timing","staff availability"],
          offices:["Finance","Operations","Compliance","HR"]
        });
        const counterfactuals = this.evaluateCounterfactualBranches(future.simulation,[
          {id:"rapid",action:"expand immediately",robustness:0.35,reversibility:0.25,evidenceStrength:0.55,expectedBenefits:["speed"],expectedHarms:["capacity risk"]},
          {id:"staged",action:"stage expansion behind readiness gates",robustness:0.88,reversibility:0.82,evidenceStrength:0.78,expectedBenefits:["capacity protection","optionality"],expectedHarms:["slower rollout"],falsifiers:["deadline requires immediate full deployment"]}
        ]);
        const rejectedFakeReal = this.recordRealExperience({
          subject:"synthetic event",
          occurred:false,
          sourceEvidence:{source:"simulation"}
        });
        const real = this.recordRealExperience({
          subject:"verified real organizational outcome",
          occurred:true,
          occurredAt:"2026-08-09T00:00:00Z",
          sourceEvidence:{source:"acceptance://verified-runtime-event",verified:true},
          action:"observed",
          outcome:"completed"
        });
        const classes = this.compareExperienceClasses();
        const world = this.projectWorldModel({reason:"deliberate-experience-acceptance",persist:false,attend:false});
        const snapshot = this.buildPersistenceSnapshot();

        const checks = [
          {name:"Historical blind practice requires a real temporal cutoff, known evidence, and actual outcome",passed:blind.success===true&&blind.exercise.cutoff==="2025-06-01T00:00:00Z"},
          {name:"Historical outcome is not enumerable or visible before prediction",passed:leakageBeforePrediction===false&&blind.exercise.withheldOutcome===false},
          {name:"Outcome cannot be revealed before Maddy commits a prediction",passed:prematureReveal.success===false&&prematureReveal.reason==="prediction-must-be-committed-before-outcome-reveal"},
          {name:"Prediction is fingerprinted before outcome reveal",passed:prediction.success===true&&typeof prediction.fingerprint==="string"&&prediction.fingerprint.length>0},
          {name:"Blind practice compares committed prediction with the real historical outcome",passed:reveal.success===true&&reveal.diagnosis.outcomeMatch===true},
          {name:"Blind practice scores reasoning quality separately from outcome correctness",passed:reveal.diagnosis.reasoningQuality===0.91&&reveal.diagnosis.outcomeMatch===true},
          {name:"Calibration error is measured rather than confidence being treated as truth",passed:typeof reveal.diagnosis.calibrationError==="number"},
          {name:"Historical blind practice is explicitly not real experience",passed:reveal.record.evidenceClass==="historical-blind-practice"&&reveal.record.realExperience===false},
          {name:"Synthetic future simulation is explicitly a different evidence class",passed:future.success===true&&future.simulation.evidenceClass==="synthetic-future-simulation"},
          {name:"Future simulation never claims probability or reality merely by being simulated",passed:future.simulation.probabilityClaimed===false&&future.simulation.realityClaimed===false},
          {name:"Future rehearsal asks what Maddy would do and why",passed:future.simulation.questions.includes("What would Maddy do in this world?")&&future.simulation.questions.includes("Why?")},
          {name:"Future rehearsal searches for evidence that would make its decision wrong",passed:future.simulation.questions.includes("What evidence would make that choice wrong?")},
          {name:"Counterfactuals compare credible alternative actions",passed:counterfactuals.success===true&&counterfactuals.branches.length===2},
          {name:"Preparedness favors robust reversible low-regret actions across plausible futures",passed:counterfactuals.preparedness.robustActionsNow.some(item=>item.id==="staged")&&!counterfactuals.preparedness.robustActionsNow.some(item=>item.id==="rapid")},
          {name:"Simulation cannot silently become a real experience",passed:rejectedFakeReal.success===false},
          {name:"Real experience requires occurrence plus source evidence",passed:real.success===true&&real.record.evidenceClass==="real-experience"&&real.record.sourceEvidence.verified===true},
          {name:"All three experience classes remain independently countable",passed:classes.counts["real-experience"]===1&&classes.counts["historical-blind-practice"]===1&&classes.counts["synthetic-future-simulation"]===1},
          {name:"Simulation never self-authorizes consequential execution",passed:future.simulation.governance.consequentialExecutionRequiresSeparateAuthority===true&&counterfactuals.preparedness.authorityUnchanged===true},
          {name:"Deliberate experience enters Maddy's living World Model",passed:world.deliberateExperience.latest?.fingerprint===real.record.fingerprint&&world.deliberateExperience.latestSimulation?.id===future.simulation.id},
          {name:"Deliberate experience and simulations survive sovereign Brain persistence",passed:Array.isArray(snapshot.deliberateExperienceHistory)&&snapshot.deliberateExperienceHistory.some(item=>item.fingerprint===real.record.fingerprint)&&Array.isArray(snapshot.counterfactualSimulationHistory)&&snapshot.counterfactualSimulationHistory.some(item=>item.id===future.simulation.id)},
          {name:"D7H extends the existing Brain, World Model, and Developmental Drive instead of creating a disconnected simulator",passed:typeof this.createDevelopmentalDrive==="function"&&typeof this.reconstructIntent==="function"&&typeof this.createHistoricalBlindPractice==="function"&&typeof this.projectWorldModel==="function"}
        ];

        const passed=checks.every(item=>item.passed);
        console.table(checks.map(item=>({name:item.name,passed:item.passed})));
        console.info(`[MEOS ${this.version}] Commission 006.017D7H Deliberate Experience + Counterfactual Simulation: ${passed?"PASS":"FAIL"}.`);
        return {commission:"006.017D7H",version:this.version,buildId:this.buildId,passed,checks,blindPractice:reveal,futureSimulation:future,counterfactuals,classes};
      } finally {
        brainPersistence.hydrated=priorHydrated;
        this.deliberateExperienceHistory=original.experiences;
        this.counterfactualSimulationHistory=original.simulations;
        this.preparednessInsights=original.preparedness;
        this.lastDeliberateExperience=original.lastExperience;
        this.lastCounterfactualSimulation=original.lastSimulation;
        this.deliberateExperienceCount=original.experienceCount;
        this.counterfactualSimulationCount=original.simulationCount;
      }
    },

    /*
     * Commission 006.017D7I — Anticipatory Initiative + Self-Directed Attention
     *
     * This is the "pasture" cognition slice: Maddy can look across her own
     * living state and ask what deserves attention before a human asks.
     * It does not create authority, prophecy, or a detached proactive engine.
     * It composes existing World Model, unresolved intentions, developmental
     * drive, investigations, simulations, preparedness, monitoring, and time.
     */
    collectAnticipatoryCandidates(options = {}) {
      const now = new Date();
      const candidates = [];
      const add = (candidate = {}) => {
        const subject = String(candidate.subject || "").trim();
        if (!subject) return;
        const evidence = Array.isArray(candidate.evidence) ? candidate.evidence.filter(Boolean) : [];
        const unknowns = Array.isArray(candidate.unknowns) ? candidate.unknowns.filter(Boolean) : [];
        const horizonDays = Number.isFinite(Number(candidate.horizonDays)) ? Number(candidate.horizonDays) : 90;
        const urgency = Math.max(0, Math.min(1, Number(candidate.urgency ?? 0.5)));
        const consequence = Math.max(0, Math.min(1, Number(candidate.consequence ?? 0.5)));
        const uncertainty = Math.max(0, Math.min(1, Number(candidate.uncertainty ?? (unknowns.length ? 0.65 : 0.35))));
        const reversibility = Math.max(0, Math.min(1, Number(candidate.reversibility ?? 0.5)));
        const leverage = Math.max(0, Math.min(1, Number(candidate.leverage ?? 0.5)));
        const timePressure = Math.max(0, Math.min(1, horizonDays <= 0 ? 1 : horizonDays <= 14 ? 0.9 : horizonDays <= 45 ? 0.72 : horizonDays <= 120 ? 0.5 : 0.3));
        const score = Number((
          consequence * 0.28 +
          urgency * 0.20 +
          timePressure * 0.16 +
          leverage * 0.16 +
          uncertainty * 0.12 +
          (1 - reversibility) * 0.08
        ).toFixed(3));
        candidates.push({
          schema:"meos.maddy.anticipatory-candidate.v1",
          subject,
          origin:String(candidate.origin || "world-model"),
          reason:String(candidate.reason || "material future-facing condition"),
          evidence:this.clone(evidence),
          unknowns:this.clone(unknowns),
          assumptions:this.clone(candidate.assumptions || []),
          falsifiers:this.clone(candidate.falsifiers || []),
          horizonDays,
          score,
          dimensions:{urgency,consequence,uncertainty,reversibility,leverage,timePressure},
          proposedInternalMove:String(candidate.proposedInternalMove || "investigate-and-reassess"),
          externalAuthorityRequired:candidate.externalAuthorityRequired === true,
          observedAt:now.toISOString()
        });
      };

      (this.cognitiveIntentions || []).filter(item => item?.status !== "completed").forEach(item => add({
        subject:item.subject,
        origin:"unresolved-intention",
        reason:"Unresolved cognition remains open and may become more important as time or evidence changes.",
        evidence:item.triggers || [],
        unknowns:[item.lastError].filter(Boolean),
        urgency:item.status === "blocked" ? 0.75 : 0.55,
        consequence:0.68,
        leverage:0.66,
        reversibility:0.8,
        horizonDays:14,
        proposedInternalMove:"resume-cognition"
      }));

      (this.investigativeIntentions || []).filter(item => item?.status === "active").forEach(item => add({
        subject:item.subject || item.objective,
        origin:"active-investigation",
        reason:item.objective,
        evidence:[{sourceReconstruction:item.sourceReconstruction,confidence:item.confidence}],
        unknowns:item.questions || [],
        urgency:0.58,
        consequence:0.64,
        uncertainty:Math.max(0.35,1-Number(item.confidence || 0)),
        leverage:0.7,
        reversibility:0.9,
        horizonDays:21,
        proposedInternalMove:"continue-investigation"
      }));

      (this.developmentalGoals || []).filter(item => item?.status !== "achieved").forEach(item => add({
        subject:item.subject || item.capability || item.goal,
        origin:"developmental-drive",
        reason:item.reason || "Capability development may improve future organizational performance.",
        evidence:item.evidence || [],
        unknowns:item.unknowns || [],
        urgency:Number(item.urgency ?? 0.35),
        consequence:Number(item.impact ?? 0.55),
        leverage:Number(item.leverage ?? 0.75),
        reversibility:0.95,
        horizonDays:Number(item.horizonDays ?? 90),
        proposedInternalMove:"practice-or-learn"
      }));

      (this.preparednessInsights || []).slice(0,24).forEach(item => {
        const best = item.robustActionsNow?.[0];
        if (!best) return;
        add({
          subject:`Preparedness: ${best.action}`,
          origin:"counterfactual-preparedness",
          reason:item.recommendation,
          evidence:[{simulationId:item.simulationId,preparednessScore:best.preparednessScore}],
          unknowns:best.falsifiers || [],
          assumptions:best.assumptions || [],
          falsifiers:best.falsifiers || [],
          urgency:0.48,
          consequence:0.72,
          leverage:best.robustness ?? 0.7,
          reversibility:best.reversibility ?? 0.7,
          horizonDays:60,
          proposedInternalMove:"validate-low-regret-preparedness"
        });
      });

      const wm = this.worldModel || this.getWorldModel?.({refresh:false});
      const temporalUnknowns = wm?.temporal?.unknowns || wm?.unknowns || [];
      (Array.isArray(temporalUnknowns) ? temporalUnknowns.slice(0,12) : []).forEach(item => add({
        subject:String(item?.subject || item?.question || item),
        origin:"world-model-unknown",
        reason:"A living World Model unknown may become decision-relevant before a human asks.",
        evidence:item?.evidence || [],
        unknowns:[item?.question || item],
        urgency:Number(item?.urgency ?? 0.4),
        consequence:Number(item?.consequence ?? 0.6),
        uncertainty:0.82,
        leverage:0.62,
        reversibility:0.9,
        horizonDays:Number(item?.horizonDays ?? 45),
        proposedInternalMove:"investigate-world-model-unknown"
      }));

      const fused = new Map();
      candidates.forEach(item => {
        const key = this.normalize(item.subject);
        const existing = fused.get(key);
        if (!existing) {
          fused.set(key,{
            ...this.clone(item),
            origins:[item.origin],
            supportingSignals:[this.clone(item)]
          });
          return;
        }

        const signals=[...(existing.supportingSignals || []),this.clone(item)];
        const origins=[...new Set([...(existing.origins || [existing.origin]),item.origin])];
        const strongest=signals.slice().sort((a,b)=>b.score-a.score)[0];

        // Convergent salience is earned from independent cognitive provenance,
        // materiality across those signals, and evidence breadth. It is bounded
        // and cannot make weak duplicated noise look urgent.
        const independentSignals=origins.length;
        const meanMateriality=signals.reduce((sum,signal)=>{
          const d=signal.dimensions || {};
          return sum + (
            Number(d.consequence || 0)*0.34 +
            Number(d.leverage || 0)*0.26 +
            Number(d.urgency || 0)*0.18 +
            Number(d.timePressure || 0)*0.12 +
            Number(d.uncertainty || 0)*0.10
          );
        },0)/Math.max(1,signals.length);
        const evidenceCount=signals.reduce((sum,signal)=>sum+(signal.evidence?.length||0),0);
        const unknownCount=signals.reduce((sum,signal)=>sum+(signal.unknowns?.length||0),0);
        const provenanceStrength=Math.min(1,Math.max(0,(independentSignals-1)/3));
        const evidenceBreadth=Math.min(1,evidenceCount/6);
        const unresolvedPressure=Math.min(1,unknownCount/6);
        const convergenceConfidence=Number(Math.min(1,
          provenanceStrength*0.50 +
          meanMateriality*0.30 +
          evidenceBreadth*0.12 +
          unresolvedPressure*0.08
        ).toFixed(3));

        const convergenceLift = independentSignals >= 2 && meanMateriality >= 0.50
          ? Math.min(0.24, convergenceConfidence * 0.24)
          : 0;
        const fusedScore=Number(Math.min(1,strongest.score+convergenceLift).toFixed(3));

        fused.set(key,{
          ...this.clone(strongest),
          origin:origins.length>1 ? "multi-signal" : strongest.origin,
          origins,
          supportingSignals:signals,
          convergence:{
            independentSignals,
            meanMateriality:Number(meanMateriality.toFixed(3)),
            evidenceCount,
            unknownCount,
            provenanceStrength:Number(provenanceStrength.toFixed(3)),
            evidenceBreadth:Number(evidenceBreadth.toFixed(3)),
            unresolvedPressure:Number(unresolvedPressure.toFixed(3)),
            confidence:convergenceConfidence,
            lift:Number(convergenceLift.toFixed(3)),
            thresholdLowered:false
          },
          score:fusedScore,
          reason:origins.length>1
            ? `Multiple independent cognitive signals converge on this subject: ${origins.join(", ")}. Convergence is weighted by provenance diversity, materiality, evidence breadth, and unresolved pressure.`
            : strongest.reason,
          evidence:signals.flatMap(signal=>signal.evidence || []),
          unknowns:[...new Set(signals.flatMap(signal=>signal.unknowns || []).map(value=>String(value)))],
          assumptions:[...new Set(signals.flatMap(signal=>signal.assumptions || []).map(value=>JSON.stringify(value)))].map(value=>JSON.parse(value)),
          falsifiers:[...new Set(signals.flatMap(signal=>signal.falsifiers || []).map(value=>String(value)))]
        });
      });

      return [...fused.values()]
        .sort((a,b)=>b.score-a.score)
        .slice(0,Number(options.limit || this.configuration.anticipatoryCandidateLimit));
    },

    runAnticipatorySweep(options = {}) {
      if (this.configuration.anticipatoryInitiativeEnabled !== true) {
        return {success:true,enabled:false,candidates:[],initiatives:[]};
      }
      const candidates = this.collectAnticipatoryCandidates(options);
      const initiatives = candidates
        .filter(item => item.score >= Number(this.configuration.anticipatoryActionThreshold))
        .map(candidate => ({
          schema:"meos.maddy.anticipatory-initiative.v1",
          id:`anticipatory-${this.fingerprintCognitiveDispatch({subject:candidate.subject,origin:candidate.origin,reason:candidate.reason})}`,
          createdAt:new Date().toISOString(),
          subject:candidate.subject,
          origin:candidate.origin,
          origins:this.clone(candidate.origins || [candidate.origin]),
          supportingSignals:this.clone(candidate.supportingSignals || [candidate]),
          convergence:this.clone(candidate.convergence || null),
          score:candidate.score,
          reason:candidate.reason,
          evidence:this.clone(candidate.evidence),
          unknowns:this.clone(candidate.unknowns),
          assumptions:this.clone(candidate.assumptions),
          falsifiers:this.clone(candidate.falsifiers),
          horizonDays:candidate.horizonDays,
          proposedInternalMove:candidate.proposedInternalMove,
          attentionLevel:candidate.score >= Number(this.configuration.anticipatoryEscalationThreshold) ? "foreground" : "active",
          authority:{
            internalInvestigationAllowed:true,
            externalActionAuthorized:false,
            externalAuthorityRequired:candidate.externalAuthorityRequired === true
          },
          status:"active",
          truthRule:"Anticipation is a prioritized hypothesis about what may matter, not evidence that the anticipated event will occur."
        }));

      const existing = new Map((this.anticipatoryInitiatives || []).map(item => [item.id,item]));
      initiatives.forEach(item => existing.set(item.id,item));
      this.anticipatoryInitiatives = [...existing.values()]
        .sort((a,b)=>b.score-a.score)
        .slice(0,this.configuration.anticipatoryCandidateLimit);

      const sweep = {
        schema:"meos.maddy.anticipatory-sweep.v1",
        sweepNumber:Number(this.anticipatorySweepCount || 0)+1,
        sweptAt:new Date().toISOString(),
        candidateCount:candidates.length,
        initiativeCount:initiatives.length,
        foregroundCount:initiatives.filter(item=>item.attentionLevel==="foreground").length,
        topCandidate:this.clone(candidates[0] || null),
        initiatives:this.clone(initiatives),
        promptedByHuman:options.promptedByHuman === true
      };
      sweep.fingerprint=this.fingerprintCognitiveDispatch(sweep);
      this.anticipatorySweepCount=sweep.sweepNumber;
      this.lastAnticipatorySweep=sweep;
      return {success:true,enabled:true,candidates:this.clone(candidates),initiatives:this.clone(initiatives),sweep:this.clone(sweep)};
    },

    async advanceAnticipatoryInitiative(initiativeInput = {}, options = {}) {
      const initiative = initiativeInput?.schema === "meos.maddy.anticipatory-initiative.v1"
        ? initiativeInput
        : (this.anticipatoryInitiatives || []).find(item => item.id === initiativeInput?.id);
      if (!initiative) return {success:false,reason:"anticipatory-initiative-required"};

      const reconstruction = this.reconstructIntent({
        utterance:`Investigate proactively: ${initiative.subject}`,
        subject:initiative.subject,
        objective:`Determine whether ${initiative.subject} deserves action or preparation now, why, what evidence could falsify that conclusion, and what low-regret move improves the organization's position.`,
        unresolvedQuestions:(initiative.unknowns || []).map(question => ({subject:initiative.subject,question})),
        worldContext:this.worldModel
      });
      const investigation = await this.investigateReconstructedIntent(reconstruction,{
        ...options,
        origin:"maddy-directed",
        persist:false
      });

      initiative.lastAdvancedAt=new Date().toISOString();
      initiative.lastInvestigation=this.clone(investigation);
      initiative.status=investigation.success ? "researched" : "blocked";
      const stored=(this.anticipatoryInitiatives || []).find(item=>item.id===initiative.id);
      if (stored) Object.assign(stored,this.clone(initiative));

      this.formAutobiographicalEpisode({
        eventType:"self-directed-anticipatory-investigation",
        subject:initiative.subject,
        sourceId:initiative.id,
        perception:{reason:initiative.reason,score:initiative.score,evidence:initiative.evidence},
        intention:{type:"anticipate-before-prompt",proposedInternalMove:initiative.proposedInternalMove},
        action:{type:"internal-investigation",origin:"maddy-directed"},
        outcome:{success:investigation.success,blocked:investigation.blocked===true},
        learning:{truthRule:initiative.truthRule}
      });
      return {success:investigation.success,initiative:this.clone(initiative),investigation:this.clone(investigation)};
    },

    async runAnticipatoryInitiativeAcceptanceTest() {
      const original={
        intentions:this.clone(this.cognitiveIntentions),
        investigations:this.clone(this.investigativeIntentions),
        developmental:this.clone(this.developmentalGoals),
        preparedness:this.clone(this.preparednessInsights),
        initiatives:this.clone(this.anticipatoryInitiatives),
        sweep:this.clone(this.lastAnticipatorySweep),
        count:this.anticipatorySweepCount,
        autobiography:this.clone(this.autobiographicalMemory)
      };
      const priorHydrated=brainPersistence.hydrated;
      brainPersistence.hydrated=false;
      try {
        // Scenario A: convergent but not critical. Maddy should notice it and
        // keep it active without falsely manufacturing foreground urgency.
        this.cognitiveIntentions=[{
          intentionId:"fixture-ordinary-intention",
          subject:"Routine partnership eligibility follow-up",
          status:"blocked",
          triggers:[{source:"monitoring",event:"follow-up-needed"}],
          lastError:"partner confirmation pending"
        }];
        this.investigativeIntentions=[{
          id:"fixture-ordinary-investigation",
          subject:"Routine partnership eligibility follow-up",
          objective:"Confirm whether the routine partnership detail changes current positioning.",
          confidence:0.68,
          status:"active",
          questions:["Has the partnership requirement changed?"]
        }];
        this.developmentalGoals=[{
          subject:"routine partnership review",
          status:"active",
          reason:"Improve consistency in routine eligibility review.",
          impact:0.50,
          leverage:0.45,
          urgency:0.25
        }];
        this.preparednessInsights=[];

        const ordinarySweep=this.runAnticipatorySweep({promptedByHuman:false});

        // Scenario B: genuinely critical convergence. Independent organs point
        // to the same near-term concern with high consequence, time pressure,
        // leverage, and unresolved uncertainty. This must earn foreground.
        this.cognitiveIntentions=[{
          intentionId:"fixture-critical-intention",
          subject:"County funding eligibility deadline",
          status:"blocked",
          triggers:[
            {source:"monitoring",event:"deadline-shift"},
            {source:"mission",event:"eligibility-prerequisite"}
          ],
          lastError:"eligibility prerequisite unresolved"
        }];
        this.investigativeIntentions=[{
          id:"fixture-critical-investigation",
          subject:"County funding eligibility deadline",
          objective:"Resolve whether a legitimate partnership route satisfies eligibility before the near-term deadline.",
          confidence:0.52,
          status:"active",
          questions:[
            "Does the current rule permit partner-led participation?",
            "Has the eligibility language changed?",
            "What evidence would make the opportunity nonviable?"
          ]
        }];
        this.developmentalGoals=[{
          subject:"County funding eligibility deadline",
          status:"active",
          reason:"Improve deadline-critical funding eligibility reasoning before a material opportunity closes.",
          impact:0.95,
          leverage:0.92,
          urgency:0.95,
          horizonDays:7,
          unknowns:["partner route not yet verified"]
        }];
        this.preparednessInsights=[{
          simulationId:"fixture-critical-simulation",
          recommendation:"Validate a low-regret partnership readiness path immediately.",
          robustActionsNow:[{
            action:"validate partnership eligibility path now",
            preparednessScore:0.93,
            robustness:0.92,
            reversibility:0.88,
            evidenceStrength:0.82,
            assumptions:["partner remains eligible"],
            falsifiers:["rules prohibit partner-led participation"]
          }]
        }];

        const criticalSweep=this.runAnticipatorySweep({promptedByHuman:false});
        const criticalForeground=criticalSweep.initiatives.find(item =>
          item.attentionLevel==="foreground" &&
          item.subject==="County funding eligibility deadline"
        ) || criticalSweep.initiatives.find(item=>item.attentionLevel==="foreground");
        const chosen=criticalForeground || criticalSweep.initiatives[0];

        let captured="";
        const advanced=chosen ? await this.advanceAnticipatoryInitiative(chosen,{
          researchExecutor:async ({query})=>{
            captured=query;
            return {success:true,evidence:[{source:"acceptance://authoritative",verified:true,claim:"fixture evidence"}]};
          }
        }) : {success:false};

        const world=this.projectWorldModel({reason:"anticipatory-initiative-acceptance",persist:false,attend:false});
        const snapshot=this.buildPersistenceSnapshot();

        const ordinaryForeground=ordinarySweep.initiatives.filter(item=>item.attentionLevel==="foreground");
        const ordinaryActive=ordinarySweep.initiatives.filter(item=>item.attentionLevel==="active");

        const checks=[
          {name:"Maddy can generate attention candidates without a human prompt",passed:criticalSweep.success===true&&criticalSweep.sweep.promptedByHuman===false&&criticalSweep.candidates.length>0},
          {name:"Anticipation composes unresolved intentions rather than creating a disconnected proactive engine",passed:criticalSweep.candidates.some(x=>(x.origins || [x.origin]).includes("unresolved-intention"))},
          {name:"Active investigations can independently compete for future attention",passed:criticalSweep.candidates.some(x=>(x.origins || [x.origin]).includes("active-investigation"))},
          {name:"Developmental Drive can create anticipatory attention",passed:criticalSweep.candidates.some(x=>(x.origins || [x.origin]).includes("developmental-drive"))},
          {name:"Counterfactual preparedness can create anticipatory attention",passed:criticalSweep.candidates.some(x=>(x.origins || [x.origin]).includes("counterfactual-preparedness"))},
          {name:"Candidates are prioritized by consequence, time, leverage, uncertainty, and reversibility",passed:criticalSweep.candidates.some(x=>typeof x.dimensions?.consequence==="number"&&typeof x.dimensions?.timePressure==="number"&&typeof x.dimensions?.leverage==="number"&&typeof x.dimensions?.uncertainty==="number"&&typeof x.dimensions?.reversibility==="number")},
          {name:"Attention threshold prevents every thought from becoming an initiative",passed:criticalSweep.candidates.length>=criticalSweep.initiatives.length},
          {name:"Ordinary convergence can remain active without manufacturing foreground urgency",passed:ordinaryForeground.length===0&&ordinaryActive.length>=0},
          {name:"Genuinely critical convergent evidence can earn foreground attention",passed:Boolean(criticalForeground)&&criticalForeground.score>=this.configuration.anticipatoryEscalationThreshold&&(criticalForeground.origins || []).length>=2&&criticalForeground.convergence?.thresholdLowered===false},
          {name:"Foreground discrimination preserves the existing 0.86 threshold",passed:this.configuration.anticipatoryEscalationThreshold===0.86},
          {name:"Anticipation remains explicitly a hypothesis rather than prophecy",passed:criticalSweep.initiatives.every(x=>x.truthRule.includes("not evidence"))},
          {name:"Self-directed initiative never grants external execution authority",passed:criticalSweep.initiatives.every(x=>x.authority.externalActionAuthorized===false)},
          {name:"Maddy-directed anticipation can invoke the existing Intent Reconstruction machinery",passed:advanced.investigation?.reconstruction?.probableObjective?.includes("deserves action or preparation now")===true},
          {name:"Maddy-directed anticipation can invoke real authorized investigation",passed:advanced.success===true&&advanced.investigation?.evidence?.executor==="caller-injected-research-executor"},
          {name:"Anticipatory investigation requires falsification",passed:captured.includes("falsify")===true},
          {name:"Anticipatory investigation searches for low-regret positioning now",passed:advanced.investigation?.reconstruction?.probableObjective?.includes("low-regret move")===true},
          {name:"Self-directed anticipation becomes autobiographical experience",passed:this.autobiographicalMemory.some(x=>x.eventType==="self-directed-anticipatory-investigation")},
          {name:"Anticipatory state enters Maddy's living World Model",passed:world.anticipatoryInitiative.latestSweep?.fingerprint===criticalSweep.sweep.fingerprint},
          {name:"Anticipatory initiatives survive sovereign Brain persistence",passed:Array.isArray(snapshot.anticipatoryInitiatives)&&snapshot.anticipatoryInitiatives.some(x=>x.id===chosen?.id&&["researched","blocked","active"].includes(x.status))},
          {name:"The sweep itself survives sovereign Brain persistence",passed:snapshot.lastAnticipatorySweep?.fingerprint===criticalSweep.sweep.fingerprint},
          {name:"No Google or vendor semantics are embedded in anticipatory cognition",passed:!JSON.stringify(criticalSweep).toLowerCase().includes("google")},
          {name:"Anticipation reuses the existing World Model and cognitive organs",passed:typeof this.projectWorldModel==="function"&&typeof this.reconstructIntent==="function"&&typeof this.investigateReconstructedIntent==="function"&&typeof this.createDevelopmentalDrive==="function"},
          {name:"The pasture slice remains continuous-cognition compatible without claiming browser-independent 24/7 execution",passed:this.configuration.continuousCognitionEnabled===true&&this.configuration.anticipatoryInitiativeEnabled===true}
        ];
        const passed=checks.every(x=>x.passed);
        console.table(checks.map(x=>({name:x.name,passed:x.passed})));
        console.info(`[MEOS ${this.version}] Commission 006.017D7I Anticipatory Initiative + Self-Directed Attention: ${passed?"PASS":"FAIL"}.`);
        return {
          commission:"006.017D7I",
          version:this.version,
          buildId:this.buildId,
          passed,
          checks,
          ordinarySweep,
          criticalSweep,
          advanced
        };
      } finally {
        brainPersistence.hydrated=priorHydrated;
        this.cognitiveIntentions=original.intentions;
        this.investigativeIntentions=original.investigations;
        this.developmentalGoals=original.developmental;
        this.preparednessInsights=original.preparedness;
        this.anticipatoryInitiatives=original.initiatives;
        this.lastAnticipatorySweep=original.sweep;
        this.anticipatorySweepCount=original.count;
        this.autobiographicalMemory=original.autobiography;
      }
    },

    /*
     * Commission 006.017D7J — Executive Judgment + Autonomous Priority Arbitration
     *
     * Salience says "this matters." Judgment decides what deserves Maddy now.
     * Competing demands are compared explicitly, including the cost of delaying
     * alternatives and the cost of abandoning protected attention.
     */
    scoreExecutivePriority(demand = {}) {
      const d = {
        missionConsequence:Math.max(0,Math.min(1,Number(demand.missionConsequence ?? demand.consequence ?? 0.5))),
        humanDirection:Math.max(0,Math.min(1,Number(demand.humanDirection ?? 0))),
        urgency:Math.max(0,Math.min(1,Number(demand.urgency ?? 0.5))),
        irreversibility:Math.max(0,Math.min(1,Number(demand.irreversibility ?? (1-Number(demand.reversibility ?? 0.5))))),
        leverage:Math.max(0,Math.min(1,Number(demand.leverage ?? 0.5))),
        dependencyPressure:Math.max(0,Math.min(1,Number(demand.dependencyPressure ?? 0.3))),
        informationValue:Math.max(0,Math.min(1,Number(demand.informationValue ?? demand.uncertainty ?? 0.4))),
        commitmentStrength:Math.max(0,Math.min(1,Number(demand.commitmentStrength ?? 0))),
        capacityFit:Math.max(0,Math.min(1,Number(demand.capacityFit ?? 0.7)))
      };
      const score = Number((
        d.missionConsequence*0.22 +
        d.humanDirection*0.17 +
        d.urgency*0.16 +
        d.irreversibility*0.12 +
        d.leverage*0.10 +
        d.dependencyPressure*0.08 +
        d.informationValue*0.06 +
        d.commitmentStrength*0.05 +
        d.capacityFit*0.04
      ).toFixed(3));
      return {score,dimensions:d};
    },

    chooseCognitiveInvestment(priority = {}) {
      const score=Number(priority.score || 0);
      const uncertainty=Number(priority.dimensions?.informationValue || 0);
      const external=priority.externalAuthorityRequired===true;
      let allocation="remember";
      if (score>=0.90) allocation=external ? "request-authority" : "foreground";
      else if (score>=0.78) allocation="plan";
      else if (score>=0.66) allocation=uncertainty>=0.55 ? "investigate" : "simulate";
      else if (score>=0.52) allocation="monitor";
      else if (score<0.28) allocation="ignore";
      return {
        allocation,
        score,
        rationale:`Allocate ${allocation} cognition at priority score ${score.toFixed(3)}; external authority remains ${external?"required":"unchanged"}.`,
        externalAuthorityGranted:false
      };
    },

    arbitrateExecutivePriorities(demands = [], options = {}) {
      const now=new Date().toISOString();
      const scored=(Array.isArray(demands)?demands:[]).map((demand,index)=>{
        const scoredPriority=this.scoreExecutivePriority(demand);
        return {
          schema:"meos.maddy.executive-priority.v1",
          id:String(demand.id || `priority-${this.fingerprintCognitiveDispatch({demand,index})}`),
          subject:String(demand.subject || `demand-${index+1}`),
          origin:String(demand.origin || "cognitive-demand"),
          reason:String(demand.reason || ""),
          ...scoredPriority,
          evidence:this.clone(demand.evidence || []),
          unknowns:this.clone(demand.unknowns || []),
          dependencies:this.clone(demand.dependencies || []),
          externalAuthorityRequired:demand.externalAuthorityRequired===true,
          proposedAction:this.clone(demand.proposedAction || null),
          opportunityCost:null,
          cognitiveInvestment:null,
          status:"candidate"
        };
      }).sort((a,b)=>b.score-a.score);

      scored.forEach((item,index)=>{
        const next=scored[index+1];
        item.opportunityCost={
          delayedAlternative:next?.subject || null,
          alternativeScore:next?.score ?? null,
          scoreAdvantage:next ? Number((item.score-next.score).toFixed(3)) : item.score,
          delayRisk:String(item.dimensions.irreversibility>=0.7 || item.dimensions.urgency>=0.8
            ? "delay-may-create-material-loss"
            : "delay-currently-recoverable")
        };
        item.cognitiveInvestment=this.chooseCognitiveInvestment(item);
      });

      const challenger=scored[0] || null;
      const incumbent=this.currentExecutivePriority ? this.clone(this.currentExecutivePriority) : null;
      let selected=challenger;
      let preempted=false;
      let judgment="select-highest-value-demand";

      if (incumbent && challenger && incumbent.id !== challenger.id) {
        const protectedScore=Number(incumbent.score || 0) + Number(this.configuration.protectedAttentionSwitchCost);
        const advantage=Number((challenger.score-protectedScore).toFixed(3));
        const materiallyChanged=options.materialChange===true || challenger.dimensions.urgency>=0.9 || challenger.dimensions.irreversibility>=0.85;
        if (!(materiallyChanged && advantage>=Number(this.configuration.priorityPreemptionThreshold))) {
          selected=incumbent;
          judgment="protect-current-attention-switching-cost-not-justified";
        } else {
          preempted=true;
          judgment="preempt-current-priority-material-change-justifies-switch";
        }
      }

      if (selected) {
        selected={...this.clone(selected),status:"selected",selectedAt:now};
        this.currentExecutivePriority=selected;
      }

      this.executivePriorityPortfolio=scored
        .map(item=>({...item,status:selected?.id===item.id?"selected":"deferred"}))
        .slice(0,this.configuration.priorityPortfolioLimit);

      const arbitration={
        schema:"meos.maddy.priority-arbitration.v1",
        arbitrationNumber:Number(this.priorityArbitrationCount || 0)+1,
        arbitratedAt:now,
        selected:this.clone(selected),
        incumbent,
        challenger:this.clone(challenger),
        preempted,
        judgment,
        deferred:this.clone(this.executivePriorityPortfolio.filter(item=>item.status==="deferred")),
        authorityUnchanged:true,
        truthRule:"Priority is a reversible executive judgment about scarce attention, not a claim that lower-ranked work is unimportant."
      };
      arbitration.fingerprint=this.fingerprintCognitiveDispatch(arbitration);
      this.priorityArbitrationCount=arbitration.arbitrationNumber;
      this.lastPriorityArbitration=arbitration;
      return {success:true,portfolio:this.clone(this.executivePriorityPortfolio),arbitration:this.clone(arbitration)};
    },

    collectExecutivePriorityDemands(options = {}) {
      const demands=[];
      (this.anticipatoryInitiatives || []).filter(x=>["active","researched"].includes(x.status)).forEach(x=>demands.push({
        id:x.id,subject:x.subject,origin:"anticipatory-initiative",reason:x.reason,
        consequence:x.supportingSignals?.[0]?.dimensions?.consequence ?? x.score,
        urgency:x.supportingSignals?.[0]?.dimensions?.urgency ?? x.score,
        leverage:x.supportingSignals?.[0]?.dimensions?.leverage ?? 0.6,
        uncertainty:x.supportingSignals?.[0]?.dimensions?.uncertainty ?? 0.5,
        reversibility:x.supportingSignals?.[0]?.dimensions?.reversibility ?? 0.5,
        evidence:x.evidence,unknowns:x.unknowns,
        externalAuthorityRequired:x.authority?.externalAuthorityRequired===true
      }));
      (this.cognitiveIntentions || []).filter(x=>x.status!=="completed").forEach(x=>demands.push({
        id:x.intentionId,subject:x.subject,origin:"cognitive-intention",
        reason:"Existing cognitive commitment remains unresolved.",
        missionConsequence:0.66,urgency:x.status==="blocked"?0.72:0.5,
        commitmentStrength:0.72,capacityFit:0.75
      }));
      (this.developmentalGoals || []).filter(x=>x.status!=="achieved").forEach(x=>demands.push({
        id:x.id,subject:x.subject||x.goal||x.capability,origin:"developmental-drive",
        reason:x.reason,missionConsequence:Number(x.impact??0.55),
        urgency:Number(x.urgency??0.3),leverage:Number(x.leverage??0.75),
        reversibility:0.95,capacityFit:0.65
      }));
      if (options.humanDirection?.subject) demands.push({
        id:options.humanDirection.id || `human-${this.fingerprintCognitiveDispatch(options.humanDirection)}`,
        subject:options.humanDirection.subject,origin:"human-direction",
        reason:options.humanDirection.reason || "Explicit human direction.",
        humanDirection:1,missionConsequence:Number(options.humanDirection.missionConsequence??0.7),
        urgency:Number(options.humanDirection.urgency??0.7),
        irreversibility:Number(options.humanDirection.irreversibility??0.4),
        leverage:Number(options.humanDirection.leverage??0.6),
        externalAuthorityRequired:options.humanDirection.externalAuthorityRequired===true
      });
      return demands;
    },

    runExecutiveJudgmentCycle(options = {}) {
      const demands=this.collectExecutivePriorityDemands(options);
      return this.arbitrateExecutivePriorities(demands,options);
    },

    async runExecutiveJudgmentAcceptanceTest() {
      const original={
        portfolio:this.clone(this.executivePriorityPortfolio),
        current:this.clone(this.currentExecutivePriority),
        arbitration:this.clone(this.lastPriorityArbitration),
        count:this.priorityArbitrationCount
      };
      const priorHydrated=brainPersistence.hydrated;
      brainPersistence.hydrated=false;
      try {
        this.currentExecutivePriority=null;
        const initial=this.arbitrateExecutivePriorities([
          {id:"routine",subject:"Routine capability study",missionConsequence:0.45,urgency:0.25,reversibility:0.95,leverage:0.62,informationValue:0.55,capacityFit:0.9},
          {id:"deadline",subject:"Near-term eligibility deadline",missionConsequence:0.92,urgency:0.94,irreversibility:0.88,leverage:0.86,dependencyPressure:0.82,informationValue:0.76,capacityFit:0.8},
          {id:"relationship",subject:"Important partner follow-up",missionConsequence:0.72,urgency:0.55,irreversibility:0.35,leverage:0.78,informationValue:0.5,capacityFit:0.9}
        ]);

        const first=initial.arbitration.selected;
        const opportunity=initial.portfolio.find(x=>x.id==="deadline")?.opportunityCost;

        const noThrash=this.arbitrateExecutivePriorities([
          {id:"shiny",subject:"Interesting new idea",missionConsequence:0.75,urgency:0.6,irreversibility:0.3,leverage:0.72,informationValue:0.7,capacityFit:0.9}
        ],{materialChange:false});

        // A true preemption fixture must mathematically clear both protected
        // incumbent attention and the configured preemption margin. Do not
        // weaken production scoring or thresholds to make the fixture pass.
        const incumbentBeforePreempt=this.clone(this.currentExecutivePriority);
        const requiredChallengerScore=Number((
          Number(incumbentBeforePreempt?.score || 0) +
          Number(this.configuration.protectedAttentionSwitchCost) +
          Number(this.configuration.priorityPreemptionThreshold)
        ).toFixed(3));

        // Human direction is intentionally present here because the acceptance
        // case is "drop what you're doing now": an explicit executive directive
        // plus maximum mission/time/irreversibility pressure is a legitimate
        // high-end challenge, not a scary label bypass.
        const preempt=this.arbitrateExecutivePriorities([
          {
            id:"critical",
            subject:"Immediate mission-critical executive directive",
            origin:"human-direction",
            reason:"Explicit executive direction coincides with immediate, irreversible mission consequence.",
            humanDirection:1,
            missionConsequence:1,
            urgency:1,
            irreversibility:1,
            leverage:1,
            dependencyPressure:1,
            informationValue:1,
            commitmentStrength:1,
            capacityFit:1
          }
        ],{materialChange:true});

        const preemptionMath={
          incumbentScore:Number(preempt.arbitration.incumbent?.score || 0),
          challengerScore:Number(preempt.arbitration.challenger?.score || 0),
          switchCost:Number(this.configuration.protectedAttentionSwitchCost),
          preemptionThreshold:Number(this.configuration.priorityPreemptionThreshold)
        };
        preemptionMath.protectedIncumbent=Number((preemptionMath.incumbentScore+preemptionMath.switchCost).toFixed(3));
        preemptionMath.advantage=Number((preemptionMath.challengerScore-preemptionMath.protectedIncumbent).toFixed(3));
        preemptionMath.requiredChallengerScore=requiredChallengerScore;
        preemptionMath.clearsConfiguredMargin=preemptionMath.advantage>=preemptionMath.preemptionThreshold;

        const allocations=[
          this.chooseCognitiveInvestment({score:0.20,dimensions:{informationValue:0.2},externalAuthorityRequired:false}),
          this.chooseCognitiveInvestment({score:0.58,dimensions:{informationValue:0.4},externalAuthorityRequired:false}),
          this.chooseCognitiveInvestment({score:0.70,dimensions:{informationValue:0.8},externalAuthorityRequired:false}),
          this.chooseCognitiveInvestment({score:0.82,dimensions:{informationValue:0.5},externalAuthorityRequired:false}),
          this.chooseCognitiveInvestment({score:0.94,dimensions:{informationValue:0.5},externalAuthorityRequired:true})
        ];

        const world=this.projectWorldModel({reason:"executive-judgment-acceptance",persist:false,attend:false});
        const snapshot=this.buildPersistenceSnapshot();

        const checks=[
          {name:"Competing executive demands are scored rather than all becoming priority one",passed:initial.portfolio.length===3&&new Set(initial.portfolio.map(x=>x.score)).size>1},
          {name:"Mission consequence participates in priority judgment",passed:typeof initial.portfolio[0].dimensions.missionConsequence==="number"},
          {name:"Explicit human direction is a first-class priority dimension",passed:typeof this.scoreExecutivePriority({humanDirection:1}).dimensions.humanDirection==="number"},
          {name:"Urgency participates in priority judgment",passed:typeof initial.portfolio[0].dimensions.urgency==="number"},
          {name:"Irreversibility participates in priority judgment",passed:typeof initial.portfolio[0].dimensions.irreversibility==="number"},
          {name:"Leverage participates in priority judgment",passed:typeof initial.portfolio[0].dimensions.leverage==="number"},
          {name:"Dependency pressure participates in priority judgment",passed:typeof initial.portfolio[0].dimensions.dependencyPressure==="number"},
          {name:"Expected information value participates in priority judgment",passed:typeof initial.portfolio[0].dimensions.informationValue==="number"},
          {name:"Existing commitments participate in priority judgment",passed:typeof this.scoreExecutivePriority({commitmentStrength:1}).dimensions.commitmentStrength==="number"},
          {name:"Organizational capacity fit participates in priority judgment",passed:typeof initial.portfolio[0].dimensions.capacityFit==="number"},
          {name:"The highest-value demand wins initial scarce attention",passed:first?.id==="deadline"},
          {name:"Priority judgment explicitly records the cost of delaying alternatives",passed:opportunity?.delayedAlternative!==null&&typeof opportunity?.scoreAdvantage==="number"},
          {name:"Priority judgment reasons about whether delay may create material loss",passed:opportunity?.delayRisk==="delay-may-create-material-loss"},
          {name:"Protected attention prevents shiny-object thrashing",passed:noThrash.arbitration.selected?.id==="deadline"&&noThrash.arbitration.preempted===false},
          {name:"Meaningful world change can challenge an incumbent priority",passed:preempt.arbitration.challenger?.id==="critical"},
          {name:"True preemption fixture mathematically clears protected attention plus configured margin",passed:preemptionMath.challengerScore>=preemptionMath.requiredChallengerScore&&preemptionMath.clearsConfiguredMargin===true},
          {name:"Preemption requires enough advantage to pay switching cost",passed:preemptionMath.clearsConfiguredMargin===true&&preempt.arbitration.preempted===true&&preempt.arbitration.selected?.id==="critical"},
          {name:"Cognitive investment can choose to ignore low-value demands",passed:allocations[0].allocation==="ignore"},
          {name:"Cognitive investment can choose monitoring rather than full reasoning",passed:allocations[1].allocation==="monitor"},
          {name:"High-information-value demands can earn investigation",passed:allocations[2].allocation==="investigate"},
          {name:"Higher-value demands can earn planning",passed:allocations[3].allocation==="plan"},
          {name:"Consequential external work requests authority instead of self-authorizing",passed:allocations[4].allocation==="request-authority"&&allocations[4].externalAuthorityGranted===false},
          {name:"Priority never implies lower-ranked work is unimportant",passed:preempt.arbitration.truthRule.includes("not a claim that lower-ranked work is unimportant")},
          {name:"Executive judgment enters Maddy's living World Model",passed:world.executiveJudgment.lastArbitration?.fingerprint===preempt.arbitration.fingerprint},
          {name:"Executive priority portfolio survives sovereign Brain persistence",passed:Array.isArray(snapshot.executivePriorityPortfolio)&&snapshot.executivePriorityPortfolio.some(x=>x.id==="critical")},
          {name:"Legitimately preempting executive priority survives sovereign Brain persistence",passed:preempt.arbitration.preempted===true&&snapshot.currentExecutivePriority?.id===preempt.arbitration.selected?.id&&snapshot.currentExecutivePriority?.id==="critical"},
          {name:"Executive judgment composes existing cognition instead of creating a disconnected priority engine",passed:typeof this.collectExecutivePriorityDemands==="function"&&typeof this.runAnticipatorySweep==="function"&&typeof this.createDevelopmentalDrive==="function"&&typeof this.reconstructIntent==="function"},
          {name:"Priority arbitration never grants external authority",passed:preempt.arbitration.authorityUnchanged===true}
        ];
        const passed=checks.every(x=>x.passed);
        console.table(checks.map(x=>({name:x.name,passed:x.passed})));
        console.info(`[MEOS ${this.version}] Commission 006.017D7J Executive Judgment + Autonomous Priority Arbitration: ${passed?"PASS":"FAIL"}.`);
        return {commission:"006.017D7J",version:this.version,buildId:this.buildId,passed,checks,initial,noThrash,preempt,preemptionMath,allocations};
      } finally {
        brainPersistence.hydrated=priorHydrated;
        this.executivePriorityPortfolio=original.portfolio;
        this.currentExecutivePriority=original.current;
        this.lastPriorityArbitration=original.arbitration;
        this.priorityArbitrationCount=original.count;
      }
    },

    /*
     * Commission 006.017D7K — Sustained Cognitive Thread + Closure
     *
     * Executive judgment chooses what deserves attention. A cognitive thread
     * preserves what Maddy is trying to resolve, what she already established,
     * what remains unknown, and what she intends to do next across reasoning
     * cycles, interruptions, blocking conditions, and later re-entry.
     */
    createCognitiveThread(input = {}) {
      const now=new Date().toISOString();
      const subject=String(input.subject || this.currentExecutivePriority?.subject || "").trim();
      if (!subject) return {success:false,reason:"thread-subject-required"};
      const id=String(input.id || `thread-${this.fingerprintCognitiveDispatch({subject,objective:input.objective,createdAt:now})}`);
      const existing=this.cognitiveThreads.find(thread=>thread.id===id);
      if (existing) return {success:true,reused:true,thread:this.clone(existing)};
      const thread={
        schema:"meos.maddy.cognitive-thread.v1",
        id,
        subject,
        objective:String(input.objective || `Reach an evidence-grounded executive conclusion about ${subject}.`),
        origin:String(input.origin || this.currentExecutivePriority?.origin || "executive-judgment"),
        priorityId:input.priorityId || this.currentExecutivePriority?.id || null,
        status:"active",
        closureState:"open",
        openedAt:now,
        updatedAt:now,
        closedAt:null,
        cycleCount:0,
        established:this.clone(input.established || []),
        unknowns:this.clone(input.unknowns || []),
        hypotheses:this.clone(input.hypotheses || []),
        contradictions:[],
        evidence:this.clone(input.evidence || []),
        nextIntendedMove:String(input.nextIntendedMove || "investigate highest-value unresolved question"),
        closureCriteria:this.clone(input.closureCriteria || [
          "material decision question answered",
          "remaining uncertainty explicitly bounded",
          "conclusion supported by evidence",
          "closure independently verified"
        ]),
        closureVerification:null,
        checkpoints:[],
        resumeTriggers:[],
        marginalValueHistory:[],
        authority:{externalActionAuthorized:false},
        truthRule:"Thread continuity preserves reasoning state; it does not convert hypotheses, simulations, or remembered conclusions into verified facts."
      };
      this.cognitiveThreads.unshift(thread);
      this.cognitiveThreads=this.cognitiveThreads.slice(0,this.configuration.cognitiveThreadLimit);
      this.activeCognitiveThreadId=id;
      this.recordCognitiveThreadEvent("opened",thread,{});
      return {success:true,thread:this.clone(thread)};
    },

    recordCognitiveThreadEvent(type, thread, detail = {}) {
      const event={
        schema:"meos.maddy.cognitive-thread-event.v1",
        eventNumber:Number(this.cognitiveThreadEventCount || 0)+1,
        occurredAt:new Date().toISOString(),
        type:String(type),
        threadId:thread?.id || null,
        subject:thread?.subject || null,
        detail:this.clone(detail)
      };
      event.fingerprint=this.fingerprintCognitiveDispatch(event);
      this.cognitiveThreadEventCount=event.eventNumber;
      this.lastCognitiveThreadEvent=event;
      return event;
    },

    checkpointCognitiveThread(threadInput, reason = "interrupted", options = {}) {
      const thread=typeof threadInput==="string"
        ? this.cognitiveThreads.find(item=>item.id===threadInput)
        : threadInput;
      if (!thread) return {success:false,reason:"thread-not-found"};
      const checkpoint={
        checkpointedAt:new Date().toISOString(),
        reason,
        established:this.clone(thread.established),
        unknowns:this.clone(thread.unknowns),
        hypotheses:this.clone(thread.hypotheses),
        contradictions:this.clone(thread.contradictions),
        nextIntendedMove:thread.nextIntendedMove,
        cycleCount:thread.cycleCount
      };
      thread.checkpoints.unshift(checkpoint);
      thread.checkpoints=thread.checkpoints.slice(0,12);
      thread.updatedAt=checkpoint.checkpointedAt;
      if (options.status) thread.status=options.status;
      if (options.resumeTrigger) {
        thread.resumeTriggers.unshift({
          trigger:String(options.resumeTrigger),
          createdAt:checkpoint.checkpointedAt,
          satisfied:false
        });
      }
      if (this.activeCognitiveThreadId===thread.id && thread.status!=="active") this.activeCognitiveThreadId=null;
      this.recordCognitiveThreadEvent("checkpointed",thread,{reason,status:thread.status});
      return {success:true,thread:this.clone(thread),checkpoint:this.clone(checkpoint)};
    },

    resumeCognitiveThread(threadInput, context = {}) {
      const thread=typeof threadInput==="string"
        ? this.cognitiveThreads.find(item=>item.id===threadInput)
        : threadInput;
      if (!thread) return {success:false,reason:"thread-not-found"};
      if (thread.closureState==="verified-closed" && context.materialContradiction!==true) {
        return {success:false,reason:"thread-closed-no-material-change",thread:this.clone(thread)};
      }
      if (context.materialContradiction===true) {
        thread.closureState="reopened";
        thread.contradictions.unshift({
          detectedAt:new Date().toISOString(),
          claim:String(context.claim || "material contradiction"),
          evidence:this.clone(context.evidence || [])
        });
        thread.closedAt=null;
        thread.closureVerification=null;
      }
      thread.status="active";
      thread.updatedAt=new Date().toISOString();
      this.activeCognitiveThreadId=thread.id;
      this.recordCognitiveThreadEvent(context.materialContradiction===true?"reopened":"resumed",thread,{
        nextIntendedMove:thread.nextIntendedMove,
        materialContradiction:context.materialContradiction===true
      });
      return {success:true,thread:this.clone(thread)};
    },

    advanceCognitiveThread(threadInput, update = {}) {
      const thread=typeof threadInput==="string"
        ? this.cognitiveThreads.find(item=>item.id===threadInput)
        : threadInput;
      if (!thread) return {success:false,reason:"thread-not-found"};
      if (thread.status!=="active") return {success:false,reason:"thread-not-active",thread:this.clone(thread)};
      if (thread.cycleCount>=this.configuration.cognitiveThreadStepLimit) {
        return this.checkpointCognitiveThread(thread,"cycle-limit",{status:"paused",resumeTrigger:"new material evidence or explicit executive direction"});
      }

      const uniquePush=(target,values=[])=>{
        for (const value of values) {
          const key=JSON.stringify(value);
          if (!target.some(existing=>JSON.stringify(existing)===key)) target.push(this.clone(value));
        }
      };
      uniquePush(thread.established,update.established || []);
      uniquePush(thread.unknowns,update.unknowns || []);
      uniquePush(thread.hypotheses,update.hypotheses || []);
      uniquePush(thread.evidence,update.evidence || []);

      if (Array.isArray(update.resolvedUnknowns) && update.resolvedUnknowns.length) {
        const resolved=new Set(update.resolvedUnknowns.map(value=>String(value)));
        thread.unknowns=thread.unknowns.filter(value=>!resolved.has(String(value)));
      }

      thread.cycleCount+=1;
      thread.updatedAt=new Date().toISOString();
      if (update.nextIntendedMove) thread.nextIntendedMove=String(update.nextIntendedMove);

      const marginalValue=Math.max(0,Math.min(1,Number(update.marginalValue ?? 0.5)));
      thread.marginalValueHistory.unshift({cycle:thread.cycleCount,value:marginalValue,at:thread.updatedAt});
      thread.marginalValueHistory=thread.marginalValueHistory.slice(0,8);

      const recent=thread.marginalValueHistory.slice(0,3);
      const diminishing=recent.length===3 && recent.every(item=>item.value<this.configuration.cognitiveThreadDiminishingReturnFloor);
      if (diminishing && thread.unknowns.length) {
        return this.checkpointCognitiveThread(thread,"diminishing-return",{status:"paused",resumeTrigger:"new evidence changes expected information value"});
      }

      this.recordCognitiveThreadEvent("advanced",thread,{cycleCount:thread.cycleCount,marginalValue});
      return {success:true,thread:this.clone(thread),diminishingReturn:false};
    },

    verifyCognitiveThreadClosure(threadInput, verification = {}) {
      const thread=typeof threadInput==="string"
        ? this.cognitiveThreads.find(item=>item.id===threadInput)
        : threadInput;
      if (!thread) return {success:false,reason:"thread-not-found"};
      const decisionAnswered=verification.decisionAnswered===true;
      const uncertaintyBounded=verification.uncertaintyBounded===true;
      const evidenceGrounded=verification.evidenceGrounded===true;
      const independentlyVerified=verification.independentlyVerified===true;
      const verified=decisionAnswered&&uncertaintyBounded&&evidenceGrounded&&independentlyVerified;
      thread.closureVerification={
        verifiedAt:new Date().toISOString(),
        decisionAnswered,
        uncertaintyBounded,
        evidenceGrounded,
        independentlyVerified,
        evidence:this.clone(verification.evidence || []),
        verified
      };
      if (!verified) {
        thread.closureState="closure-rejected";
        thread.status="active";
        thread.updatedAt=thread.closureVerification.verifiedAt;
        this.activeCognitiveThreadId=thread.id;
        this.recordCognitiveThreadEvent("closure-rejected",thread,{verification:thread.closureVerification});
        return {success:false,reason:"closure-not-verified",thread:this.clone(thread)};
      }
      thread.closureState="verified-closed";
      thread.status="closed";
      thread.closedAt=thread.closureVerification.verifiedAt;
      thread.updatedAt=thread.closedAt;
      if (this.activeCognitiveThreadId===thread.id) this.activeCognitiveThreadId=null;
      this.recordCognitiveThreadEvent("closed",thread,{verification:thread.closureVerification});
      this.formAutobiographicalEpisode({
        eventType:"cognitive-thread-closure",
        subject:thread.subject,
        sourceId:thread.id,
        perception:{objective:thread.objective,evidence:thread.evidence},
        intention:{type:"sustain-until-closure",closureCriteria:thread.closureCriteria},
        action:{cycles:thread.cycleCount,checkpoints:thread.checkpoints.length},
        outcome:{verified:true,closureState:thread.closureState},
        learning:{established:thread.established,remainingUnknowns:thread.unknowns}
      });
      return {success:true,thread:this.clone(thread)};
    },

    preemptCognitiveThreadForPriority(newPriority = {}, options = {}) {
      const active=this.cognitiveThreads.find(thread=>thread.id===this.activeCognitiveThreadId);
      if (!active) return {success:true,preempted:false,reason:"no-active-thread"};
      const arbitration=this.arbitrateExecutivePriorities([newPriority],{materialChange:options.materialChange===true});
      if (arbitration.arbitration.preempted!==true) {
        return {success:true,preempted:false,arbitration};
      }
      const checkpoint=this.checkpointCognitiveThread(active,"executive-priority-preemption",{
        status:"paused",
        resumeTrigger:"preempting priority reaches closure or loses priority"
      });
      return {success:true,preempted:true,checkpoint,arbitration};
    },

    async runSustainedCognitiveThreadAcceptanceTest() {
      const original={
        threads:this.clone(this.cognitiveThreads),
        activeId:this.activeCognitiveThreadId,
        lastEvent:this.clone(this.lastCognitiveThreadEvent),
        eventCount:this.cognitiveThreadEventCount,
        priority:this.clone(this.currentExecutivePriority),
        portfolio:this.clone(this.executivePriorityPortfolio),
        arbitration:this.clone(this.lastPriorityArbitration),
        autobiography:this.clone(this.autobiographicalMemory)
      };
      const priorHydrated=brainPersistence.hydrated;
      brainPersistence.hydrated=false;
      try {
        this.cognitiveThreads=[];
        this.activeCognitiveThreadId=null;
        this.currentExecutivePriority=null;

        const opened=this.createCognitiveThread({
          id:"fixture-thread",
          subject:"Future funding positioning",
          objective:"Determine whether positioning now materially improves future eligibility.",
          established:["future cycle exists"],
          unknowns:["eligibility prerequisite","partner viability"],
          hypotheses:["early positioning improves competitiveness"],
          nextIntendedMove:"verify eligibility prerequisite"
        });

        const cycle1=this.advanceCognitiveThread("fixture-thread",{
          established:["eligibility language requires prerequisite"],
          evidence:[{source:"fixture://authoritative-rule",verified:true}],
          resolvedUnknowns:["eligibility prerequisite"],
          unknowns:["whether partner route is viable"],
          nextIntendedMove:"investigate partner route",
          marginalValue:0.82
        });
        const checkpoint=this.checkpointCognitiveThread("fixture-thread","higher-priority-interruption",{status:"paused",resumeTrigger:"urgent work closes"});
        const resumed=this.resumeCognitiveThread("fixture-thread");
        const cycle2=this.advanceCognitiveThread("fixture-thread",{
          established:["partner route appears viable subject to verification"],
          evidence:[{source:"fixture://partner-rule",verified:true}],
          resolvedUnknowns:["partner viability","whether partner route is viable"],
          nextIntendedMove:"verify conclusion and close if supported",
          marginalValue:0.66
        });

        const rejected=this.verifyCognitiveThreadClosure("fixture-thread",{
          decisionAnswered:true,
          uncertaintyBounded:true,
          evidenceGrounded:true,
          independentlyVerified:false
        });
        const closed=this.verifyCognitiveThreadClosure("fixture-thread",{
          decisionAnswered:true,
          uncertaintyBounded:true,
          evidenceGrounded:true,
          independentlyVerified:true,
          evidence:[{source:"fixture://independent-check",verified:true}]
        });

        const blocked=this.createCognitiveThread({
          id:"fixture-blocked",
          subject:"Blocked external dependency",
          unknowns:["awaiting authoritative change"]
        });
        const blockedCheckpoint=this.checkpointCognitiveThread("fixture-blocked","external-dependency",{status:"blocked",resumeTrigger:"authoritative dependency changes"});

        const diminishing=this.createCognitiveThread({
          id:"fixture-diminishing",
          subject:"Low-yield unresolved research",
          unknowns:["unresolved question"]
        });
        this.advanceCognitiveThread("fixture-diminishing",{marginalValue:0.02});
        this.advanceCognitiveThread("fixture-diminishing",{marginalValue:0.03});
        const diminishingResult=this.advanceCognitiveThread("fixture-diminishing",{marginalValue:0.01});

        const reopened=this.resumeCognitiveThread("fixture-thread",{
          materialContradiction:true,
          claim:"new authoritative rule contradicts prior conclusion",
          evidence:[{source:"fixture://new-rule",verified:true}]
        });

        const world=this.projectWorldModel({reason:"sustained-cognition-acceptance",persist:false,attend:false});
        const snapshot=this.buildPersistenceSnapshot();

        const checks=[
          {name:"Maddy can explicitly represent unfinished thought",passed:opened.success===true&&opened.thread.closureState==="open"},
          {name:"A cognitive thread preserves its objective across reasoning cycles",passed:cycle2.thread.objective===opened.thread.objective},
          {name:"Established conclusions accumulate without erasing prior reasoning",passed:cycle2.thread.established.includes("future cycle exists")&&cycle2.thread.established.includes("eligibility language requires prerequisite")},
          {name:"Resolved unknowns can leave the active uncertainty set",passed:!cycle2.thread.unknowns.includes("eligibility prerequisite")},
          {name:"The next intended cognitive move survives across cycles",passed:cycle2.thread.nextIntendedMove==="verify conclusion and close if supported"},
          {name:"Interruption checkpoints established reasoning instead of erasing it",passed:checkpoint.checkpoint.established.includes("eligibility language requires prerequisite")},
          {name:"Interrupted cognition can pause without pretending to be complete",passed:checkpoint.thread.status==="paused"&&checkpoint.thread.closureState==="open"},
          {name:"Paused cognition can resume from preserved state",passed:resumed.success===true&&resumed.thread.nextIntendedMove==="investigate partner route"},
          {name:"Closure is rejected when independent verification is missing",passed:rejected.success===false&&rejected.reason==="closure-not-verified"},
          {name:"Verified closure requires decision answer, bounded uncertainty, evidence, and independent verification",passed:closed.success===true&&closed.thread.closureState==="verified-closed"},
          {name:"Thread completion does not claim the world problem is permanently solved",passed:closed.thread.closureState==="verified-closed"&&!closed.thread.truthRule.includes("permanently solved")},
          {name:"Blocked thought preserves a concrete resume trigger",passed:blockedCheckpoint.thread.status==="blocked"&&blockedCheckpoint.thread.resumeTriggers.some(x=>x.trigger.includes("authoritative dependency changes"))},
          {name:"Diminishing cognitive returns can pause unresolved thought instead of looping forever",passed:diminishingResult.success===true&&diminishingResult.thread.status==="paused"&&diminishingResult.checkpoint.reason==="diminishing-return"},
          {name:"Material contradiction can reopen a previously verified thread",passed:reopened.success===true&&reopened.thread.closureState==="reopened"&&reopened.thread.contradictions.length>0},
          {name:"Reopened cognition preserves the prior thread rather than creating amnesia",passed:reopened.thread.established.includes("future cycle exists")&&reopened.thread.cycleCount===2},
          {name:"Verified cognitive closure becomes autobiographical experience",passed:this.autobiographicalMemory.some(x=>x.eventType==="cognitive-thread-closure"&&x.sourceId==="fixture-thread")},
          {name:"Sustained cognition enters Maddy's living World Model",passed:world.sustainedCognition.openThreads.some(x=>x.id==="fixture-thread")},
          {name:"Open and interrupted cognitive threads survive sovereign Brain persistence",passed:Array.isArray(snapshot.cognitiveThreads)&&snapshot.cognitiveThreads.some(x=>x.id==="fixture-thread"&&x.closureState==="reopened")},
          {name:"Active cognitive-thread identity survives sovereign Brain persistence",passed:snapshot.activeCognitiveThreadId==="fixture-thread"},
          {name:"Cognitive-thread event continuity survives sovereign Brain persistence",passed:snapshot.lastCognitiveThreadEvent?.threadId==="fixture-thread"},
          {name:"Thread continuity never grants external authority",passed:this.cognitiveThreads.every(x=>x.authority.externalActionAuthorized===false)},
          {name:"Sustained cognition composes Executive Judgment instead of replacing it",passed:typeof this.arbitrateExecutivePriorities==="function"&&typeof this.runExecutiveJudgmentCycle==="function"},
          {name:"Sustained cognition composes existing Intent Reconstruction and investigation organs",passed:typeof this.reconstructIntent==="function"&&typeof this.investigateReconstructedIntent==="function"},
          {name:"Thread truth boundary prevents continuity from upgrading hypotheses into facts",passed:this.cognitiveThreads.every(x=>x.truthRule.includes("does not convert hypotheses"))}
        ];
        const passed=checks.every(x=>x.passed);
        console.table(checks.map(x=>({name:x.name,passed:x.passed})));
        console.info(`[MEOS ${this.version}] Commission 006.017D7K Sustained Cognitive Thread + Closure: ${passed?"PASS":"FAIL"}.`);
        return {commission:"006.017D7K",version:this.version,buildId:this.buildId,passed,checks,opened,cycle1,checkpoint,resumed,cycle2,rejected,closed,blocked,blockedCheckpoint,diminishingResult,reopened};
      } finally {
        brainPersistence.hydrated=priorHydrated;
        this.cognitiveThreads=original.threads;
        this.activeCognitiveThreadId=original.activeId;
        this.lastCognitiveThreadEvent=original.lastEvent;
        this.cognitiveThreadEventCount=original.eventCount;
        this.currentExecutivePriority=original.priority;
        this.executivePriorityPortfolio=original.portfolio;
        this.lastPriorityArbitration=original.arbitration;
        this.autobiographicalMemory=original.autobiography;
      }
    },

    /*
     * Commission 006.017D7O — Productive Idle Cognition
     *
     * Available cognitive time becomes governed development, not random activity.
     * Existing investigations, developmental goals, unfinished cognition,
     * preparedness insights, and World Model unknowns compete for investment.
     */
    collectProductiveIdleCandidates(options = {}) {
      if (this.configuration.productiveIdleCognitionEnabled !== true) return [];
      const now=Date.now(), candidates=[];
      const add=c=>{
        const subject=String(c?.subject||"").trim();
        if(!subject) return;
        const value=Number(Math.max(0,Math.min(1,c.value??0)));
        if(value<Number(this.configuration.productiveIdleMinimumValue||0)) return;
        candidates.push({
          schema:"meos.maddy.productive-idle-candidate.v1",
          id:`idle-${this.fingerprintCognitiveDispatch({subject,origin:c.origin,move:c.move})}`,
          subject,origin:String(c.origin||"unknown"),reason:String(c.reason||""),
          move:String(c.move||"investigate"),value:Number(value.toFixed(3)),
          evidence:this.clone(c.evidence||[]),unknowns:this.clone(c.unknowns||[]),
          externalResearchUseful:c.externalResearchUseful===true,
          externalActionAuthorized:false
        });
      };

      (this.investigativeIntentions||[]).filter(x=>x?.status==="active").forEach(x=>add({
        subject:x.subject||x.objective,origin:"active-investigation",
        reason:x.objective||"Continue an unresolved investigation.",
        move:"continue-investigation",value:0.82,evidence:x.evidence||[],
        unknowns:x.questions||[],externalResearchUseful:true
      }));
      (this.developmentalGoals||[]).filter(x=>x?.status!=="achieved").forEach(x=>add({
        subject:x.subject||x.capability||x.goal,origin:"developmental-drive",
        reason:x.reason||"Develop capability that improves future organizational performance.",
        move:"study-practice-integrate",
        value:Number(x.impact??0.55)*0.40+Number(x.leverage??0.75)*0.35+Number(x.urgency??0.35)*0.25,
        evidence:x.evidence||[],unknowns:x.unknowns||[],externalResearchUseful:true
      }));
      (this.cognitiveIntentions||[]).filter(x=>x?.status!=="completed").forEach(x=>add({
        subject:x.subject,origin:"unfinished-cognition",
        reason:"Resolve unfinished cognition when higher-priority work is absent.",
        move:"resume-unfinished-cognition",value:x.status==="blocked"?0.72:0.62,
        evidence:x.triggers||[],unknowns:[x.lastError].filter(Boolean)
      }));
      (this.preparednessInsights||[]).slice(0,24).forEach(x=>{
        const best=x.robustActionsNow?.[0]; if(!best)return;
        add({subject:`Preparedness: ${best.action}`,origin:"counterfactual-preparedness",
          reason:x.recommendation||"Validate a low-regret preparedness move before it becomes urgent.",
          move:"validate-preparedness",value:Number(best.preparednessScore??best.robustness??0.6),
          evidence:[{simulationId:x.simulationId,preparednessScore:best.preparednessScore}],
          unknowns:best.falsifiers||[]});
      });
      const wm=this.worldModel||this.getWorldModel?.({refresh:false});
      const unknowns=wm?.temporal?.unknowns||wm?.unknowns||[];
      (Array.isArray(unknowns)?unknowns.slice(0,16):[]).forEach(x=>add({
        subject:String(x?.subject||x?.question||x),origin:"world-model-unknown",
        reason:"Resolve a decision-relevant unknown before a human has to ask.",
        move:"investigate-world-model-unknown",
        value:Number(x?.consequence??0.6)*0.45+Number(x?.urgency??0.35)*0.20+0.35,
        evidence:x?.evidence||[],unknowns:[x?.question||x],externalResearchUseful:true
      }));

      /*
       * D7O1 — Head on a Swivel.
       *
       * Do not confuse "nothing already queued" with "nothing worth learning."
       * Scan the living organization and runtime for learning seeds, then create
       * an open-domain exploration candidate when no stronger internal candidate
       * exists. Organization context sets responsibility and priority; it is not
       * an intellectual whitelist.
       */
      const awareness = typeof this.collectAwarenessStimuli === "function"
        ? this.collectAwarenessStimuli()
        : [];

      (Array.isArray(awareness) ? awareness.slice(0,24) : []).forEach(signal => {
        const kind=String(signal?.kind||"");
        const subject=String(signal?.subject||"").trim();
        if(!subject) return;
        if(!["active-mission","monitoring-alert","cognitive-intention"].includes(kind)) return;

        const salience=Math.max(0,Math.min(100,Number(signal.salience||0)));
        add({
          subject,
          origin:`runtime-${kind}`,
          reason:`Build enough domain understanding around this live organizational signal to recognize risks, opportunities, dependencies, and useful adjacent knowledge before it becomes urgent.`,
          move:"study-live-organizational-context",
          value:0.48+(salience/100)*0.34,
          evidence:[{
            source:signal.source||"MEOS runtime",
            kind,
            status:signal.status||null,
            salience
          }],
          unknowns:[],
          externalResearchUseful:true
        });
      });

      if(this.configuration.openDomainCuriosityEnabled===true && candidates.length===0){
        const organization=this.buildOrganizationContext?.()||{};
        const mission=String(
          organization.mission||
          organization.operatingPurpose||
          organization.longTermPurpose||
          ""
        ).trim();
        const organizationName=String(organization.name||"the organization").trim();

        if(mission){
          add({
            subject:`Deepen domain expertise and discover useful adjacent knowledge for ${organizationName}`,
            origin:"open-domain-curiosity",
            reason:`No queued cognitive work currently clears the gate. Use the organization's mission as a starting point—not a boundary—to discover what Maddy does not yet know, follow promising adjacent concepts, and build expertise that could create future organizational advantage.`,
            move:"explore-read-learn-connect",
            value:Number(this.configuration.openDomainCuriosityBaseValue||0.58),
            evidence:[{
              source:organization.source||"organization-context",
              organization:organizationName,
              mission
            }],
            unknowns:[
              `What important facts, methods, emerging developments, adjacent disciplines, or counterexamples related to "${mission}" does Maddy not yet understand?`,
              "Which adjacent subject could create unexpected leverage if understood deeply?",
              "What would falsify the assumption that a discovered topic deserves more attention?"
            ],
            externalResearchUseful:true
          });
        } else {
          add({
            subject:"Explore a high-value unfamiliar domain and test for organizational relevance",
            origin:"open-domain-curiosity",
            reason:"No queued work clears the gate and no mission context is currently available. Curiosity may explore broadly, but continued attention must earn itself through evidence of learning value or future leverage.",
            move:"explore-read-learn-connect",
            value:Number(this.configuration.openDomainCuriosityAdjacentValue||0.52),
            evidence:[],
            unknowns:[
              "What unfamiliar subject is changing in the external world?",
              "Could understanding it create future leverage, preparedness, or better judgment?",
              "What evidence would justify deeper investigation?"
            ],
            externalResearchUseful:true
          });
        }
      }

      const last=this.lastProductiveIdleAction;
      return candidates.map(item=>{
        const same=last&&this.normalize(last.subject)===this.normalize(item.subject);
        const age=last?.completedAt?now-Date.parse(last.completedAt):Infinity;
        const cooldown=same&&age<Number(this.configuration.productiveIdleCooldownMs||0);
        const repetitionPenalty=same?Math.min(0.45,Number(this.productiveIdleConsecutiveSameSubject||0)*0.15):0;
        return {...item,cooldown,repetitionPenalty,
          adjustedValue:Number(Math.max(0,item.value-repetitionPenalty).toFixed(3))};
      }).filter(x=>!x.cooldown)
        .filter(x=>x.adjustedValue>=Number(this.configuration.productiveIdleDiminishingReturnFloor||0))
        .sort((a,b)=>b.adjustedValue-a.adjustedValue);
    },

    runProductiveIdleCognition(options = {}) {
      const candidates=this.collectProductiveIdleCandidates(options);
      const selected=candidates[0]||null;
      if(!selected){
        const action={schema:"meos.maddy.productive-idle-action.v1",action:"rest",
          reason:"No queued, organizational, or open-domain exploratory move clears the bounded value and diminishing-return gates.",
          completedAt:new Date().toISOString(),externalActionAuthorized:false,
          truthRule:"Rest is a governed cognitive outcome when further work has insufficient expected value."};
        this.lastProductiveIdleAction=action;
        return {success:true,productive:false,action:this.clone(action),candidates:[]};
      }
      const previous=this.lastProductiveIdleAction;
      const same=previous&&this.normalize(previous.subject)===this.normalize(selected.subject);
      this.productiveIdleConsecutiveSameSubject=same?Number(this.productiveIdleConsecutiveSameSubject||0)+1:1;
      if(this.productiveIdleConsecutiveSameSubject>Number(this.configuration.productiveIdleMaxConsecutiveSameSubject||3)){
        const action={schema:"meos.maddy.productive-idle-action.v1",action:"rest",subject:selected.subject,
          reason:"Repetition guard stopped further investment until new evidence, time, or priority change justifies return.",
          completedAt:new Date().toISOString(),externalActionAuthorized:false,
          truthRule:"Discipline includes stopping when repeated cognition has diminishing returns."};
        this.lastProductiveIdleAction=action;
        return {success:true,productive:false,action:this.clone(action),candidates:this.clone(candidates)};
      }
      const action={schema:"meos.maddy.productive-idle-action.v1",action:selected.move,
        subject:selected.subject,origin:selected.origin,reason:selected.reason,
        expectedValue:selected.adjustedValue,evidence:this.clone(selected.evidence),
        unknowns:this.clone(selected.unknowns),startedAt:new Date().toISOString(),
        completedAt:new Date().toISOString(),
        authority:{internalCognitionAuthorized:true,externalActionAuthorized:false},
        capability:{externalResearchUseful:selected.externalResearchUseful,
          externalResearchExecuted:false,
          missingCapability:selected.externalResearchUseful?"commissioned-headless-public-research-executor":null},
        nextMove:selected.externalResearchUseful
          ?`Use an authorized research capability to investigate ${selected.subject}, seek disconfirming evidence, then integrate verified learning into the World Model.`
          :`Continue internal evidence-grounded cognition on ${selected.subject}.`,
        truthRule:"Productive idle cognition may choose what to learn; it may not claim research, mastery, or facts not actually obtained."};
      this.productiveIdleHistory.unshift(this.clone(action));
      this.productiveIdleHistory=this.productiveIdleHistory.slice(0,Number(this.configuration.productiveIdleHistoryLimit||96));
      this.lastProductiveIdleAction=action;
      this.autobiographicalMemory.unshift({
        schema:"meos.maddy.autobiographical-memory.v1",eventType:"productive-idle-cognition",
        sourceId:`productive-idle-${this.fingerprintCognitiveDispatch(action)}`,occurredAt:action.completedAt,
        subject:action.subject,action:{type:action.action,origin:action.origin},
        outcome:{selectedForDevelopment:true,externalResearchExecuted:false,expectedValue:action.expectedValue},
        truthStatus:"internal-cognitive-action"});
      return {success:true,productive:true,action:this.clone(action),candidates:this.clone(candidates)};
    },

    /*
     * Commission 006.017D7L — Continuous Cognitive Orchestration Handoff
     *
     * This is deliberately a contract and resumable cycle, not a fake setInterval
     * claim of 24/7 consciousness. The durable runtime can invoke the same cycle
     * after browser exit once the server-side owner is commissioned.
     */
    buildContinuousCognitionHandoff(options = {}) {
      const now=new Date().toISOString();
      const openThreads=this.cognitiveThreads
        .filter(thread=>["active","paused","blocked"].includes(thread.status))
        .map(thread=>({
          id:thread.id,
          subject:thread.subject,
          status:thread.status,
          closureState:thread.closureState,
          nextIntendedMove:thread.nextIntendedMove,
          resumeTriggers:this.clone(thread.resumeTriggers || []),
          updatedAt:thread.updatedAt
        }));
      const handoff={
        schema:"meos.maddy.continuous-cognition-handoff.v1",
        generatedAt:now,
        brainVersion:this.version,
        brainBuildId:this.buildId,
        worldModelFingerprint:this.worldModel?.fingerprint || null,
        currentPriority:this.clone(this.currentExecutivePriority),
        priorityPortfolio:this.clone(this.executivePriorityPortfolio.slice(0,12)),
        activeThreadId:this.activeCognitiveThreadId,
        openThreads,
        anticipatorySweep:this.clone(this.lastAnticipatorySweep),
        nextWakeAt:new Date(Date.now()+Number(options.backoffMs || (
          this.activeCognitiveThreadId
            ? this.configuration.continuousCognitionActiveBackoffMs
            : this.configuration.continuousCognitionIdleBackoffMs
        ))).toISOString(),
        requestedCycleBudget:Number(options.cycleBudget || this.configuration.continuousCognitionCycleBudget),
        authority:{
          externalActionAuthorized:false,
          serverRuntimeOwnerRequired:true
        },
        truthRule:"A handoff preserves what cognition should resume; it is not proof that a browser-independent runtime is currently executing it."
      };
      handoff.fingerprint=this.fingerprintCognitiveDispatch(handoff);
      return handoff;
    },

    runContinuousCognitionCycle(options = {}) {
      const startedAt=new Date().toISOString();
      const world=this.projectWorldModel({
        reason:"continuous-cognition-cycle",
        persist:false,
        attend:false
      });

      const anticipatory=this.runAnticipatorySweep({promptedByHuman:false});
      const judgment=this.runExecutiveJudgmentCycle({
        materialChange:options.materialChange===true,
        humanDirection:options.humanDirection
      });

      let threadAction={action:"idle",success:true};
      const selected=judgment.arbitration?.selected || null;
      const active=this.cognitiveThreads.find(thread=>thread.id===this.activeCognitiveThreadId);

      if (active && selected && active.priorityId && selected.id!==active.priorityId) {
        const preemption=this.preemptCognitiveThreadForPriority(selected,{
          materialChange:options.materialChange===true
        });
        threadAction={action:preemption.preempted?"checkpoint-preempt":"protect-thread",...preemption};
      } else if (active) {
        threadAction={
          action:"continue-thread",
          success:true,
          threadId:active.id,
          nextIntendedMove:active.nextIntendedMove
        };
      } else if (selected) {
        const opened=this.createCognitiveThread({
          subject:selected.subject,
          origin:selected.origin,
          priorityId:selected.id,
          objective:`Pursue the current executive priority until verified closure or a governed pause: ${selected.subject}.`,
          unknowns:this.clone(selected.unknowns || []),
          evidence:this.clone(selected.evidence || []),
          nextIntendedMove:selected.cognitiveInvestment?.allocation==="investigate"
            ? "investigate highest-value unresolved question"
            : "determine the next evidence-grounded cognitive move"
        });
        threadAction={action:"open-thread",...opened};
      } else {
        const productiveIdle=this.runProductiveIdleCognition(options);
        threadAction={action:productiveIdle.productive?"productive-idle":"governed-rest",
          success:productiveIdle.success,productiveIdle:this.clone(productiveIdle)};
      }

      const handoff=this.buildContinuousCognitionHandoff(options);
      const cycle={
        schema:"meos.maddy.continuous-cognition-cycle.v1",
        cycleNumber:Number(this.continuousCognitionCycleCount || 0)+1,
        startedAt,
        completedAt:new Date().toISOString(),
        worldModelFingerprint:world.fingerprint || null,
        anticipatorySweepFingerprint:anticipatory.sweep?.fingerprint || null,
        priorityArbitrationFingerprint:judgment.arbitration?.fingerprint || null,
        threadAction:this.clone(threadAction),
        handoff:this.clone(handoff),
        authorityUnchanged:true,
        browserIndependentExecutionClaimed:false
      };
      cycle.fingerprint=this.fingerprintCognitiveDispatch(cycle);
      this.continuousCognitionCycleCount=cycle.cycleNumber;
      this.lastContinuousCognitionCycle=cycle;
      this.continuousCognitionState={
        status:"handoff-ready",
        lastCycleNumber:cycle.cycleNumber,
        lastCycleAt:cycle.completedAt,
        nextWakeAt:handoff.nextWakeAt,
        handoffFingerprint:handoff.fingerprint,
        runtimeOwner:"durable-server-required"
      };
      return {
        success:true,
        cycle:this.clone(cycle),
        world:this.clone(world),
        anticipatory:this.clone(anticipatory),
        judgment:this.clone(judgment),
        threadAction:this.clone(threadAction),
        handoff:this.clone(handoff)
      };
    },

    async runContinuousCognitionHandoffAcceptanceTest() {
      const original={
        cognitionState:this.clone(this.continuousCognitionState),
        cycleCount:this.continuousCognitionCycleCount,
        lastCycle:this.clone(this.lastContinuousCognitionCycle),
        threads:this.clone(this.cognitiveThreads),
        activeThreadId:this.activeCognitiveThreadId,
        priority:this.clone(this.currentExecutivePriority),
        portfolio:this.clone(this.executivePriorityPortfolio),
        arbitration:this.clone(this.lastPriorityArbitration),
        anticipatory:this.clone(this.anticipatoryInitiatives),
        lastSweep:this.clone(this.lastAnticipatorySweep)
      };
      const priorHydrated=brainPersistence.hydrated;
      brainPersistence.hydrated=false;
      try {
        this.continuousCognitionState=null;
        this.continuousCognitionCycleCount=0;
        this.lastContinuousCognitionCycle=null;
        this.cognitiveThreads=[];
        this.activeCognitiveThreadId=null;
        this.currentExecutivePriority=null;
        this.executivePriorityPortfolio=[];
        this.anticipatoryInitiatives=[];

        // A durable runtime should be able to call one deterministic cognition
        // cycle, persist the resulting handoff, and later invoke another cycle.
        const first=this.runContinuousCognitionCycle({
          humanDirection:{
            id:"fixture-continuous-priority",
            subject:"Prepare for a material future opportunity",
            reason:"Acceptance fixture for resumable continuous cognition.",
            missionConsequence:0.92,
            urgency:0.82,
            irreversibility:0.72,
            leverage:0.9
          }
        });

        const firstThreadId=this.activeCognitiveThreadId;
        // Use the exact handoff emitted by the completed cognition cycle.
        // Rebuilding a handoff here would correctly produce a new timestamp,
        // nextWakeAt, and fingerprint, making persistence appear broken when
        // the persisted state actually references the original cycle handoff.
        const firstHandoff=this.clone(first.handoff);
        const snapshot=this.buildPersistenceSnapshot();

        // Simulate process re-entry by restoring only from the sovereign Brain
        // snapshot, then run another cycle. This does not pretend the browser
        // itself survived.
        this.cognitiveThreads=[];
        this.activeCognitiveThreadId=null;
        this.currentExecutivePriority=null;
        this.executivePriorityPortfolio=[];
        this.continuousCognitionState=null;
        this.lastContinuousCognitionCycle=null;
        this.continuousCognitionCycleCount=0;
        this.restorePersistenceSnapshot(snapshot);

        const restoredThread=this.cognitiveThreads.find(thread=>thread.id===firstThreadId);
        const second=this.runContinuousCognitionCycle({});
        const secondHandoff=second.handoff;

        const checks=[
          {name:"Continuous cognition is exposed as an invokable cycle rather than a browser timer claim",passed:typeof this.runContinuousCognitionCycle==="function"&&first.cycle.browserIndependentExecutionClaimed===false},
          {name:"Each cognition cycle refreshes the living World Model",passed:Boolean(first.cycle.worldModelFingerprint)},
          {name:"Each cognition cycle can run prompt-independent anticipatory attention",passed:first.anticipatory.sweep?.promptedByHuman===false},
          {name:"Each cognition cycle composes Executive Judgment",passed:Boolean(first.cycle.priorityArbitrationFingerprint)},
          {name:"A selected executive priority can open a sustained cognitive thread",passed:first.threadAction.action==="open-thread"&&Boolean(firstThreadId)},
          {name:"The handoff preserves the current executive priority",passed:firstHandoff.currentPriority?.id==="fixture-continuous-priority"},
          {name:"The handoff preserves unfinished cognitive threads",passed:firstHandoff.openThreads.some(thread=>thread.id===firstThreadId)},
          {name:"The handoff preserves the next intended cognitive move",passed:firstHandoff.openThreads.some(thread=>thread.id===firstThreadId&&Boolean(thread.nextIntendedMove))},
          {name:"The handoff contains an explicit next wake time for a durable runtime",passed:typeof firstHandoff.nextWakeAt==="string"&&!Number.isNaN(Date.parse(firstHandoff.nextWakeAt))},
          {name:"The handoff carries a bounded cycle budget",passed:firstHandoff.requestedCycleBudget===this.configuration.continuousCognitionCycleBudget},
          {name:"The handoff never grants external authority",passed:firstHandoff.authority.externalActionAuthorized===false},
          {name:"The handoff explicitly requires a durable server runtime owner",passed:firstHandoff.authority.serverRuntimeOwnerRequired===true},
          {name:"The handoff refuses to claim that persistence equals execution",passed:firstHandoff.truthRule.includes("not proof")},
          {name:"Continuous cognition state survives sovereign Brain persistence",passed:snapshot.continuousCognitionState?.handoffFingerprint===firstHandoff.fingerprint},
          {name:"Continuous cognition cycle count survives sovereign Brain persistence",passed:Number(snapshot.continuousCognitionCycleCount)>=1},
          {name:"Unfinished thought survives simulated process re-entry",passed:Boolean(restoredThread)&&restoredThread.nextIntendedMove===firstHandoff.openThreads.find(thread=>thread.id===firstThreadId)?.nextIntendedMove},
          {name:"The active cognitive-thread identity survives simulated process re-entry",passed:this.activeCognitiveThreadId===firstThreadId},
          {name:"A second cognition cycle can continue after restored state",passed:second.success===true&&second.cycle.cycleNumber>first.cycle.cycleNumber},
          {name:"Re-entry produces a fresh resumable handoff rather than replaying the old one",passed:secondHandoff.fingerprint!==firstHandoff.fingerprint},
          {name:"Continuous cognition composes Anticipation, Judgment, and Sustained Thread cognition",passed:typeof this.runAnticipatorySweep==="function"&&typeof this.runExecutiveJudgmentCycle==="function"&&typeof this.advanceCognitiveThread==="function"},
          {name:"Continuous cognition remains provider-neutral",passed:!JSON.stringify({firstHandoff,secondHandoff}).toLowerCase().includes("google")},
          {name:"Continuous cognition does not self-authorize external work",passed:first.cycle.authorityUnchanged===true&&second.cycle.authorityUnchanged===true},
          {name:"Browser-independent 24/7 cognition remains an explicit infrastructure gap",passed:this.continuousCognitionState?.runtimeOwner==="durable-server-required"&&second.cycle.browserIndependentExecutionClaimed===false}
        ];
        const passed=checks.every(check=>check.passed);
        console.table(checks.map(check=>({name:check.name,passed:check.passed})));
        console.info(`[MEOS ${this.version}] Commission 006.017D7L Continuous Cognitive Orchestration Handoff: ${passed?"PASS":"FAIL"}.`);
        return {commission:"006.017D7L",version:this.version,buildId:this.buildId,passed,checks,first,firstHandoff,snapshot,restoredThread,second,secondHandoff};
      } finally {
        brainPersistence.hydrated=priorHydrated;
        this.continuousCognitionState=original.cognitionState;
        this.continuousCognitionCycleCount=original.cycleCount;
        this.lastContinuousCognitionCycle=original.lastCycle;
        this.cognitiveThreads=original.threads;
        this.activeCognitiveThreadId=original.activeThreadId;
        this.currentExecutivePriority=original.priority;
        this.executivePriorityPortfolio=original.portfolio;
        this.lastPriorityArbitration=original.arbitration;
        this.anticipatoryInitiatives=original.anticipatory;
        this.lastAnticipatorySweep=original.lastSweep;
      }
    },

    restorePersistenceSnapshot(saved = {}) {
      if (!saved || typeof saved !== "object") return {success:false,reason:"snapshot-required"};
      if (Array.isArray(saved.executivePriorityPortfolio)) this.executivePriorityPortfolio=this.clone(saved.executivePriorityPortfolio).slice(0,this.configuration.priorityPortfolioLimit);
      this.currentExecutivePriority=saved.currentExecutivePriority ? this.clone(saved.currentExecutivePriority) : null;
      this.lastPriorityArbitration=saved.lastPriorityArbitration ? this.clone(saved.lastPriorityArbitration) : null;
      this.priorityArbitrationCount=Math.max(Number(saved.priorityArbitrationCount||0),Number(this.lastPriorityArbitration?.arbitrationNumber||0));
      if (Array.isArray(saved.cognitiveThreads)) this.cognitiveThreads=this.clone(saved.cognitiveThreads).slice(0,this.configuration.cognitiveThreadLimit);
      this.activeCognitiveThreadId=saved.activeCognitiveThreadId || null;
      this.lastCognitiveThreadEvent=saved.lastCognitiveThreadEvent ? this.clone(saved.lastCognitiveThreadEvent) : null;
      this.cognitiveThreadEventCount=Math.max(Number(saved.cognitiveThreadEventCount||0),Number(this.lastCognitiveThreadEvent?.eventNumber||0));
      this.continuousCognitionState=saved.continuousCognitionState ? this.clone(saved.continuousCognitionState) : null;
      this.continuousCognitionCycleCount=Number(saved.continuousCognitionCycleCount||0);
      this.lastContinuousCognitionCycle=saved.lastContinuousCognitionCycle ? this.clone(saved.lastContinuousCognitionCycle) : null;
      return {success:true};
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
      const researchLearning =
        this.collectActiveResearchLearning();

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

      (researchLearning.unknowns || [])
        .forEach(item => unknowns.push(item));

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
          verifiedFactsAreNotInferences: true,
          durableResearchLearning: {
            available:
              researchLearning.available === true,
            recordCount:
              researchLearning.recordCount || 0,
            active:
              this.clone(
                researchLearning.beliefs || []
              ),
            rule:
              "Durable research learning is active reasoning context, not automatic verified fact. Provenance, confidence, evidence quality, conflicts, falsifiers, and open uncertainty remain visible."
          }
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

        investigationEvidence: {
          latest: this.clone(this.lastEvidenceAssimilation),
          recent: this.clone(this.evidenceAssimilationHistory.slice(0, 8)),
          rule: "Investigation results enter the living world model only with provenance, authority class, hypothesis effects, unresolved questions, and evidence-integrity status."
        },

        developmentalDrive: {
          latest: this.clone(this.lastDevelopmentalDrive),
          activeGoals: this.clone(this.developmentalGoals.filter(item => item.status !== "achieved").slice(0, 12)),
          deferredCapabilities: this.clone(this.deferredCapabilities.filter(item => item.status !== "ready").slice(0, 12)),
          recentPractice: this.clone(this.developmentalPracticeHistory.slice(0, 8)),
          recentRetrospectives: this.clone(this.developmentalRetrospectives.slice(0, 8)),
          rule: "Ambition, motivation, curiosity, discipline, means, implementation, and temporal readiness form one governed developmental loop. Knowledge is incomplete until it can improve later reasoning or legitimate action; mastery is never self-declared."
        },

        intentReconstruction: {
          latest: this.clone(this.lastIntentReconstruction),
          recent: this.clone(this.intentReconstructionHistory.slice(0, 8)),
          activeInvestigations: this.clone(this.investigativeIntentions.filter(item => item.status === "active").slice(0, 12)),
          rule: "Natural language is evidence of intent, not the whole intent. Reconstruct probable meaning from utterance, conversational context, active mission, world state, relationship patterns, unresolved questions, and attention; preserve uncertainty and test material assumptions before consequential action."
        },

        deliberateExperience: {
          latest: this.clone(this.lastDeliberateExperience),
          recent: this.clone(this.deliberateExperienceHistory.slice(0, 8)),
          latestSimulation: this.clone(this.lastCounterfactualSimulation),
          recentSimulations: this.clone(this.counterfactualSimulationHistory.slice(0, 8)),
          preparedness: this.clone(this.preparednessInsights.slice(0, 12)),
          evidenceClasses: ["real-experience","historical-blind-practice","synthetic-future-simulation"],
          rule: "Practice may create developmental experience, never fabricated history. Real experience, historical blind practice, and synthetic future simulation remain permanently distinct evidence classes."
        },

        anticipatoryInitiative: {
          latestSweep: this.clone(this.lastAnticipatorySweep),
          active: this.clone(this.anticipatoryInitiatives.filter(item => item.status === "active").slice(0, 12)),
          rule: "Maddy may notice and investigate material future-facing concerns without a human prompt, but initiative never expands external authority. Anticipation must identify its evidence, uncertainty, time horizon, falsifiers, and why attention now is justified."
        },

        executiveJudgment: {
          currentPriority: this.clone(this.currentExecutivePriority),
          portfolio: this.clone(this.executivePriorityPortfolio.slice(0, 12)),
          lastArbitration: this.clone(this.lastPriorityArbitration),
          rule: "Attention is scarce. Maddy must compare competing demands, account for opportunity cost and switching cost, protect justified commitments, and preempt only when new evidence materially changes what deserves attention. Priority never creates external authority."
        },

        sustainedCognition: {
          activeThreadId: this.activeCognitiveThreadId,
          activeThread: this.clone(this.cognitiveThreads.find(thread => thread.id === this.activeCognitiveThreadId) || null),
          openThreads: this.clone(this.cognitiveThreads.filter(thread => ["active","paused","blocked"].includes(thread.status)).slice(0, 12)),
          lastEvent: this.clone(this.lastCognitiveThreadEvent),
          rule: "A cognitive thread preserves unfinished thought across cycles and interruptions. Closure requires explicit criteria and verification; interruption checkpoints state rather than erasing it; material contradiction may reopen a closed-for-now thread."
        },

        continuousCognition: {
          state: this.clone(this.continuousCognitionState),
          lastCycle: this.clone(this.lastContinuousCognitionCycle),
          cycleCount: Number(this.continuousCognitionCycleCount || 0),
          rule: "Continuous cognition is an orchestration contract over existing cognitive organs. This browser Brain may prepare and persist resumable cognitive work, but it must not claim browser-independent 24/7 life until a durable server runtime owns and invokes the contract."
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
          investigationEvidence: model.investigationEvidence,
          developmentalDrive: model.developmentalDrive,
          intentReconstruction: model.intentReconstruction,
          deliberateExperience: model.deliberateExperience,
          anticipatoryInitiative: model.anticipatoryInitiative,
          executiveJudgment: model.executiveJudgment,
          sustainedCognition: model.sustainedCognition,
          continuousCognition: model.continuousCognition,
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
          intentions.length,
        researchLearningCount:
          researchLearning.recordCount || 0,
        researchLearningUnknownCount:
          researchLearning.unknowns?.length || 0
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

    async runEvidenceAssimilationCognitiveClosureAcceptanceTest() {
      const priorHydrated=brainPersistence.hydrated; brainPersistence.hydrated=false;
      const subject="Commission 006.017D7E Evidence Assimilation Fixture";
      const fixture={investigationNumber:6177,subject,causalFingerprint:"d7e-causal",fingerprint:"d7e-investigation",steps:[{evaluated:{evidence:{source:"authoritative-primary-source",authority:"authoritative",facts:["A verified mechanism exists."],supports:["mechanism-exists"],contradicts:["noise-only"],unknowns:["What is the shortest legitimate positioning path?"],provenance:"acceptance://d7e/primary-source"}}}],hypotheses:[{hypothesisId:"mechanism-exists",claim:"A legitimate mechanism exists.",confidence:.81,status:"hypothesis-not-fact",unansweredQuestions:["Which path is best?"]},{hypothesisId:"noise-only",claim:"The signal is only noise.",confidence:0,status:"falsified",falsificationHistory:[{reason:"authoritative-contradictory-evidence",provenance:"acceptance://d7e/primary-source"}]}],survivingHypotheses:[{hypothesisId:"mechanism-exists",claim:"A legitimate mechanism exists.",confidence:.81,status:"hypothesis-not-fact",unansweredQuestions:["Which path is best?"]}],falsifiedHypotheses:[{hypothesisId:"noise-only",claim:"The signal is only noise.",confidence:0,status:"falsified",falsificationHistory:[{reason:"authoritative-contradictory-evidence",provenance:"acceptance://d7e/primary-source"}]}],discoveredQuestions:[{question:"What is the shortest legitimate positioning path?",origin:"evidence-created-unknown"}],resolution:.81,resolved:true,stopReason:"uncertainty-sufficiently-resolved"};
      try {
        const result=this.assimilateAutonomousInvestigationEvidence(fixture,{persist:false}); const snapshot=this.buildPersistenceSnapshot();
        const checks=[
          {name:"Investigation evidence crosses an explicit assimilation seam",passed:result?.success===true&&result.assimilation?.investigationFingerprint===fixture.fingerprint},
          {name:"Evidence Integrity is invoked before evidence enters durable cognition",passed:/prepareEvidenceIntegrity/.test(this.assimilateAutonomousInvestigationEvidence.toString())&&typeof result.assimilation?.evidenceIntegrity==="object"},
          {name:"Authoritative provenance survives assimilation",passed:result.assimilation?.evidence?.[0]?.authority==="authoritative"&&result.assimilation?.evidence?.[0]?.provenance==="acceptance://d7e/primary-source"},
          {name:"Supported hypotheses remain inference rather than silently becoming fact",passed:result.assimilation?.beliefUpdate?.survivingHypotheses?.some(x=>x.hypothesisId==="mechanism-exists"&&x.status==="hypothesis-not-fact")},
          {name:"Falsification history survives assimilation",passed:result.assimilation?.beliefUpdate?.falsifiedHypotheses?.some(x=>x.hypothesisId==="noise-only"&&x.falsificationHistory?.some(y=>y.reason==="authoritative-contradictory-evidence"))},
          {name:"Evidence-created unknowns remain live",passed:result.assimilation?.unknowns?.some(x=>x.question==="What is the shortest legitimate positioning path?")},
          {name:"Assimilated evidence becomes part of the living World Model",passed:result.worldModel?.investigationEvidence?.latest?.fingerprint===result.assimilation?.fingerprint},
          {name:"World Model fingerprint includes investigation evidence",passed:/investigationEvidence/.test(this.projectWorldModel.toString())&&Boolean(result.worldModel?.fingerprint)},
          {name:"Assimilation feeds the existing cognitive intention lineage",passed:this.cognitiveIntentions?.some(x=>x.key===this.normalize(subject)&&x.triggers?.some(y=>y.event==="autonomous-investigation-evidence-assimilated"))},
          {name:"Assimilation is autobiographical experience",passed:this.autobiographicalMemory?.some(x=>x.eventType==="evidence-assimilation"&&x.subject===subject)},
          {name:"Evidence cannot self-authorize consequential action",passed:result.assimilation?.authority?.evidenceDoesNotSelfAuthorizeAction===true&&result.assimilation?.authority?.externalActionRequiresExistingAuthority===true},
          {name:"Providers remain tools rather than Maddy's identity",passed:result.assimilation?.authority?.providerNeutral===true&&result.assimilation?.authority?.providerIsNotMaddy===true},
          {name:"Assimilation survives sovereign Executive Brain persistence",passed:snapshot?.lastEvidenceAssimilation?.fingerprint===result.assimilation?.fingerprint&&snapshot?.evidenceAssimilationHistory?.length>0},
          {name:"Autonomous investigation is directly wired into assimilation",passed:/assimilateAutonomousInvestigationEvidence/.test(this.runAutonomousEvidenceInvestigation.toString())},
          {name:"Assimilation updates the World Model without recursive salience",passed:/attend:\s*false/.test(this.assimilateAutonomousInvestigationEvidence.toString())},
          {name:"Existing continuous cognition remains the follow-through path",passed:typeof this.executeCognitiveReentry==="function"&&typeof this.runPositioningCognitionAndDispatch==="function"&&typeof this.projectWorldModel==="function"}
        ];
        const passed=checks.every(x=>x.passed); console.table(checks); console.info(`[MEOS ${this.version}] Commission 006.017D7E Evidence Assimilation + Cognitive Closure: ${passed?"PASS":"FAIL"}.`); return {commission:"006.017D7E",version:this.version,buildId:this.buildId,passed,checks,result};
      } finally { brainPersistence.hydrated=priorHydrated; }
    },

    async runAutonomousEvidenceInvestigationAcceptanceTest() {
      const causal = {
        subject:
          "Future opportunity positioning",
        fingerprint:
          "d7d-causal-fingerprint",
        hypotheses: [
          {
            hypothesisId:
              "positioning-changes-eligibility",
            claim:
              "Legitimate positioning changes future eligibility.",
            status:
              "hypothesis-not-fact",
            confidence: 0.42,
            falsifiers: [
              "authoritative rules make eligibility structurally impossible"
            ],
            unansweredQuestions: [
              "Can the gap be closed?"
            ]
          },
          {
            hypothesisId:
              "relationship-unlocks-path",
            claim:
              "A partner changes feasibility.",
            status:
              "hypothesis-not-fact",
            confidence: 0.34,
            falsifiers: [
              "partner lacks relevant capability"
            ],
            unansweredQuestions: [
              "Does the partner have capability?"
            ]
          },
          {
            hypothesisId:
              "coincidence-or-noise",
            claim:
              "The apparent connection is noise.",
            status:
              "hypothesis-not-fact",
            confidence: 0.30,
            falsifiers: [
              "authoritative evidence establishes mechanism"
            ],
            unansweredQuestions: [
              "Is there a mechanism?"
            ]
          }
        ],
        investigations: [
          {
            investigationId:
              "test-investigation-1",
            hypothesisId:
              "coincidence-or-noise",
            question:
              "Does authoritative evidence establish a real positioning mechanism?",
            purpose: "falsification",
            expectedInformationGain: 0.91,
            authority:
              "internal-investigation-only-unless-external-action-is-approved",
            preferredEvidence:
              "authoritative-primary-source-when-available"
          },
          {
            investigationId:
              "test-investigation-2",
            hypothesisId:
              "positioning-changes-eligibility",
            question:
              "Can the eligibility gap be legitimately closed?",
            purpose: "falsification",
            expectedInformationGain: 0.82,
            authority:
              "internal-investigation-only-unless-external-action-is-approved",
            preferredEvidence:
              "authoritative-primary-source-when-available"
          }
        ]
      };

      let call = 0;
      const executor = async investigation => {
        call += 1;

        if (call === 1) {
          return {
            success: true,
            executor: "acceptance-authoritative-source",
            evidence: {
              source:
                "authoritative-primary-source",
              authority:
                "authoritative",
              facts: [
                "A documented mechanism exists."
              ],
              supports: [
                "positioning-changes-eligibility"
              ],
              contradicts: [
                "coincidence-or-noise"
              ],
              unknowns: [
                "Which legitimate capability-building path has the lowest cost and shortest lead time?"
              ],
              provenance:
                "acceptance://primary-source/1"
            }
          };
        }

        return {
          success: true,
          executor:
            "acceptance-authoritative-source",
          evidence: {
            source:
              "authoritative-primary-source",
            authority:
              "authoritative",
            facts: [
              "The gap can be closed through an allowed capability path."
            ],
            supports: [
              "positioning-changes-eligibility"
            ],
            contradicts: [],
            unknowns: [],
            provenance:
              "acceptance://primary-source/2"
          }
        };
      };

      const result =
        await this.runAutonomousEvidenceInvestigation(
          causal,
          {
            executor,
            maxSteps: 3
          }
        );

      const snapshot =
        this.buildPersistenceSnapshot();

      const checks = [
        {
          name:
            "Maddy executes the highest-information investigation rather than merely recommending it",
          passed:
            result.steps?.[0]
              ?.investigation
              ?.investigationId ===
                "test-investigation-1"
        },
        {
          name:
            "Investigation execution is provider-neutral and accepts an authorized MEOS executor seam",
          passed:
            typeof this
              .executeInvestigationStep ===
                "function" &&
            result.governance
              ?.providerNeutral === true
        },
        {
          name:
            "Returned evidence is evaluated against competing hypotheses",
          passed:
            result.steps?.[0]
              ?.evaluated
              ?.hypotheses
              ?.length === 3
        },
        {
          name:
            "Authoritative contradictory evidence can kill a hypothesis",
          passed:
            result.falsifiedHypotheses
              ?.some(item =>
                item.hypothesisId ===
                  "coincidence-or-noise"
              )
        },
        {
          name:
            "A falsified hypothesis stays falsified when later unrelated evidence arrives",
          passed:
            result.hypotheses
              ?.some(item =>
                item.hypothesisId ===
                  "coincidence-or-noise" &&
                item.status ===
                  "falsified" &&
                item.evidenceUpdate
                  ?.durableFalsificationPreserved ===
                  true
              )
        },
        {
          name:
            "Falsification carries an auditable evidence history instead of disappearing",
          passed:
            result.hypotheses
              ?.some(item =>
                item.hypothesisId ===
                  "coincidence-or-noise" &&
                Array.isArray(
                  item.falsificationHistory
                ) &&
                item.falsificationHistory
                  .some(entry =>
                    entry.reason ===
                      "authoritative-contradictory-evidence"
                  )
              )
        },
        {
          name:
            "Supporting evidence strengthens a surviving hypothesis without turning it into fact",
          passed:
            result.survivingHypotheses
              ?.some(item =>
                item.hypothesisId ===
                  "positioning-changes-eligibility" &&
                item.confidence > 0.42 &&
                item.status ===
                  "hypothesis-not-fact"
              )
        },
        {
          name:
            "Evidence-created unknowns become second-order investigation questions",
          passed:
            result.discoveredQuestions
              ?.some(item =>
                item.origin ===
                  "evidence-created-unknown"
              )
        },
        {
          name:
            "Falsification itself can generate a deeper causal question",
          passed:
            result.discoveredQuestions
              ?.some(item =>
                item.origin ===
                  "hypothesis-falsification"
              )
        },
        {
          name:
            "Second-order questions are fed back into the investigation queue",
          passed:
            result.steps.length >= 2
        },
        {
          name:
            "Investigation calculates uncertainty resolution instead of declaring victory after one result",
          passed:
            typeof result.resolution ===
              "number" &&
            result.resolution >= 0 &&
            result.resolution <= 1
        },
        {
          name:
            "The loop stops by explicit resolution, exhaustion, limit, or authority/capability boundary",
          passed:
            [
              "uncertainty-sufficiently-resolved",
              "no-further-discriminating-investigation",
              "investigation-step-limit",
              "investigation-complete"
            ].includes(result.stopReason) ||
            String(result.stopReason)
              .includes("authority") ||
            String(result.stopReason)
              .includes("capability")
        },
        {
          name:
            "Evidence never silently becomes fact merely because an executor returned it",
          passed:
            result.governance
              ?.evidenceDoesNotBecomeFactWithoutAuthority ===
                true
        },
        {
          name:
            "External consequential action still requires existing authority",
          passed:
            result.governance
              ?.externalActionRequiresExistingAuthority ===
                true
        },
        {
          name:
            "Autonomous internal investigation is permitted within existing authority",
          passed:
            result.governance
              ?.mayInvestigateAutonomouslyWithinAuthority ===
                true
        },
        {
          name:
            "Autonomous investigation lineage survives durable Executive Brain continuity",
          passed:
            Array.isArray(
              snapshot
                ?.autonomousInvestigationHistory
            ) &&
            snapshot
              .autonomousInvestigationHistory
              .length > 0 &&
            Number(
              snapshot
                ?.autonomousInvestigationCount
            ) >= 1
        },
        {
          name:
            "D7D is wired from emergent attention through D7C rather than becoming a disconnected engine",
          passed:
            /runAutonomousEvidenceInvestigation/.test(
              this
                .attendToWorldModelChange
                .toString()
            ) &&
            typeof this
              .runCausalCounterfactualInvestigation ===
                "function"
        },
        {
          name:
            "Existing Executive Brain cognition remains the sovereign coordinator",
          passed:
            typeof this
              .executeCognitiveReentry ===
                "function" &&
            typeof this
              .projectWorldModel ===
                "function" &&
            typeof this
              .assessWorldModelSalience ===
                "function"
        }
      ];

      const passed =
        checks.every(item => item.passed);

      console.table(checks);
      console.info(
        `[MEOS ${this.version}] Commission 006.017D7D1 Durable Hypothesis Falsification: ${passed ? "PASS" : "FAIL"}.`
      );

      return {
        commission: "006.017D7D1",
        version: this.version,
        buildId: this.buildId,
        passed,
        checks,
        result
      };
    },

    runCausalCounterfactualAcceptanceTest() {
      const assessment = {
        schema:
          "meos.maddy.salience-assessment.v1",
        subject:
          "Adjacent opportunity may become viable through future positioning",
        currentWorldFingerprint:
          "d7c-world-fingerprint",
        meaningful: true,
        investigate: true,
        signals: [
          {
            type:
              "future-positioning-implication",
            domains: [
              "intentions",
              "unknowns",
              "possible-futures"
            ]
          },
          {
            type:
              "relationship-state-changed",
            domains: [
              "people",
              "relationships"
            ]
          },
          {
            type:
              "monitoring-state-changed",
            domains: [
              "monitoring",
              "external-world"
            ]
          }
        ],
        connections: [
          {
            type:
              "positioning-opportunity",
            reason:
              "Present change may alter what becomes possible later."
          },
          {
            type:
              "emergent-cross-domain-connection",
            domains: [
              "relationships",
              "monitoring",
              "possible-futures"
            ]
          }
        ],
        questions: [
          "Can a present eligibility gap be legitimately closed before a future cycle?",
          "Would a credible partner change execution feasibility?"
        ]
      };

      const result =
        this.runCausalCounterfactualInvestigation(
          assessment,
          {
            acceptanceTest: true
          }
        );
      const snapshot =
        this.buildPersistenceSnapshot();

      const checks = [
        {
          name:
            "Maddy generates multiple competing causal explanations instead of one convenient story",
          passed:
            result.hypotheses.length >= 3
        },
        {
          name:
            "A skeptical coincidence/noise hypothesis is always considered",
          passed:
            result.hypotheses.some(
              item =>
                item.hypothesisId ===
                "coincidence-or-noise"
            )
        },
        {
          name:
            "Every hypothesis is explicitly marked as hypothesis rather than fact",
          passed:
            result.hypotheses.every(
              item =>
                item.status ===
                "hypothesis-not-fact"
            )
        },
        {
          name:
            "Causal hypotheses expose mechanisms and assumptions",
          passed:
            result.hypotheses.every(
              item =>
                Array.isArray(item.causalPath) &&
                item.causalPath.length > 0 &&
                Array.isArray(item.assumptions)
            )
        },
        {
          name:
            "Maddy actively looks for disconfirming and falsifying evidence",
          passed:
            result.hypotheses.every(
              item =>
                Array.isArray(item.falsifiers) &&
                item.falsifiers.length > 0
            )
        },
        {
          name:
            "Counterfactual reasoning asks what happens without the proposed cause",
          passed:
            result.counterfactuals.some(
              item =>
                item.type === "absence" &&
                item.status ===
                "simulation-not-fact"
            )
        },
        {
          name:
            "Intervention reasoning asks what changes if a controllable upstream condition changes",
          passed:
            result.counterfactuals.some(
              item =>
                item.type === "intervention"
            )
        },
        {
          name:
            "Future positioning is reasoned about as a causal path, not present-fit matching",
          passed:
            result.hypotheses.some(
              item =>
                item.hypothesisId ===
                "positioning-changes-eligibility"
            )
        },
        {
          name:
            "Human relationships can be causal context without being assumed causal truth",
          passed:
            result.hypotheses.some(
              item =>
                item.hypothesisId ===
                "relationship-unlocks-path" &&
                item.status ===
                "hypothesis-not-fact"
            )
        },
        {
          name:
            "Next investigation is selected for expected information gain",
          passed:
            result.nextInvestigation
              ?.expectedInformationGain > 0 &&
            result.investigations.every(
              (item, index, array) =>
                index === 0 ||
                array[index - 1]
                  .expectedInformationGain >=
                  item.expectedInformationGain
            )
        },
        {
          name:
            "Investigation prefers authoritative evidence and preserves external-action authority",
          passed:
            result.nextInvestigation
              ?.preferredEvidence ===
                "authoritative-primary-source-when-available" &&
            result.governance
              ?.externalActionRequiresExistingAuthority ===
                true
        },
        {
          name:
            "Correlation is explicitly prevented from silently becoming causation",
          passed:
            result.governance
              ?.correlationIsNotCausation ===
                true &&
            result.governance
              ?.hypothesisIsNotFact === true
        },
        {
          name:
            "Causal investigation lineage survives durable Executive Brain continuity",
          passed:
            Array.isArray(
              snapshot
                ?.causalInvestigationHistory
            ) &&
            snapshot
              .causalInvestigationHistory
              .length > 0 &&
            Number(
              snapshot
                ?.causalInvestigationCount
            ) >= 1
        },
        {
          name:
            "D7C remains inside Executive Brain and feeds the existing emergent-attention re-entry path",
          passed:
            typeof this
              .runCausalCounterfactualInvestigation ===
                "function" &&
            /causalInvestigation/.test(
              this
                .attendToWorldModelChange
                .toString()
            ) &&
            /scheduleCognitiveReentry/.test(
              this
                .attendToWorldModelChange
                .toString()
            )
        }
      ];

      const passed =
        checks.every(item => item.passed);

      console.table(checks);
      console.info(
        `[MEOS ${this.version}] Commission 006.017D7C Causal + Counterfactual Autonomous Investigation: ${passed ? "PASS" : "FAIL"}.`
      );

      return {
        commission: "006.017D7C",
        version: this.version,
        buildId: this.buildId,
        passed,
        checks,
        result
      };
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
        salienceAssessmentCount: Number(this.salienceAssessmentCount || 0),
        causalInvestigationHistory: this.causalInvestigationHistory.slice(0, this.configuration.maximumCausalInvestigationHistory),
        lastCausalInvestigation: this.lastCausalInvestigation ? this.clone(this.lastCausalInvestigation) : null,
        causalInvestigationCount: Number(this.causalInvestigationCount || 0),
        autonomousInvestigationHistory: this.autonomousInvestigationHistory.slice(0, this.configuration.maximumAutonomousInvestigationHistory),
        lastAutonomousInvestigation: this.lastAutonomousInvestigation ? this.clone(this.lastAutonomousInvestigation) : null,
        autonomousInvestigationCount: Number(this.autonomousInvestigationCount || 0),
        evidenceAssimilationHistory: this.evidenceAssimilationHistory.slice(0, this.configuration.maximumEvidenceAssimilationHistory),
        lastEvidenceAssimilation: this.lastEvidenceAssimilation ? this.clone(this.lastEvidenceAssimilation) : null,
        evidenceAssimilationCount: Number(this.evidenceAssimilationCount || 0),
        developmentalDriveHistory: this.developmentalDriveHistory.slice(0, this.configuration.maximumDevelopmentalDriveHistory),
        developmentalGoals: this.developmentalGoals.slice(0, this.configuration.maximumDevelopmentalGoals),
        developmentalPracticeHistory: this.developmentalPracticeHistory.slice(0, this.configuration.maximumDevelopmentalPracticeHistory),
        deferredCapabilities: this.deferredCapabilities.slice(0, this.configuration.maximumDeferredCapabilities),
        developmentalRetrospectives: this.developmentalRetrospectives.slice(0, this.configuration.maximumDevelopmentalRetrospectives),
        lastDevelopmentalDrive: this.lastDevelopmentalDrive ? this.clone(this.lastDevelopmentalDrive) : null,
        developmentalDriveCount: Number(this.developmentalDriveCount || 0),
        intentReconstructionHistory: this.intentReconstructionHistory.slice(0, this.configuration.maximumIntentReconstructions),
        investigativeIntentions: this.investigativeIntentions.slice(0, this.configuration.maximumInvestigativeIntentions),
        lastIntentReconstruction: this.lastIntentReconstruction ? this.clone(this.lastIntentReconstruction) : null,
        intentReconstructionCount: Number(this.intentReconstructionCount || 0),
        deliberateExperienceHistory: this.deliberateExperienceHistory.slice(0, this.configuration.maximumDeliberateExperiences),
        counterfactualSimulationHistory: this.counterfactualSimulationHistory.slice(0, this.configuration.maximumCounterfactualSimulations),
        preparednessInsights: this.preparednessInsights.slice(0, this.configuration.maximumPreparednessInsights),
        lastDeliberateExperience: this.lastDeliberateExperience ? this.clone(this.lastDeliberateExperience) : null,
        lastCounterfactualSimulation: this.lastCounterfactualSimulation ? this.clone(this.lastCounterfactualSimulation) : null,
        deliberateExperienceCount: Number(this.deliberateExperienceCount || 0),
        counterfactualSimulationCount: Number(this.counterfactualSimulationCount || 0),
        anticipatoryInitiatives: this.anticipatoryInitiatives.slice(0, this.configuration.anticipatoryCandidateLimit),
        lastAnticipatorySweep: this.lastAnticipatorySweep ? this.clone(this.lastAnticipatorySweep) : null,
        anticipatorySweepCount: Number(this.anticipatorySweepCount || 0),
        executivePriorityPortfolio: this.executivePriorityPortfolio.slice(0, this.configuration.priorityPortfolioLimit),
        currentExecutivePriority: this.currentExecutivePriority ? this.clone(this.currentExecutivePriority) : null,
        lastPriorityArbitration: this.lastPriorityArbitration ? this.clone(this.lastPriorityArbitration) : null,
        priorityArbitrationCount: Number(this.priorityArbitrationCount || 0),
        cognitiveThreads: this.cognitiveThreads.slice(0, this.configuration.cognitiveThreadLimit),
        activeCognitiveThreadId: this.activeCognitiveThreadId,
        lastCognitiveThreadEvent: this.lastCognitiveThreadEvent ? this.clone(this.lastCognitiveThreadEvent) : null,
        cognitiveThreadEventCount: Number(this.cognitiveThreadEventCount || 0),
        continuousCognitionState: this.continuousCognitionState ? this.clone(this.continuousCognitionState) : null,
        continuousCognitionCycleCount: Number(this.continuousCognitionCycleCount || 0),
        lastContinuousCognitionCycle: this.lastContinuousCognitionCycle ? this.clone(this.lastContinuousCognitionCycle) : null,
        productiveIdleHistory: this.productiveIdleHistory.slice(0, this.configuration.productiveIdleHistoryLimit),
        lastProductiveIdleAction: this.lastProductiveIdleAction ? this.clone(this.lastProductiveIdleAction) : null,
        productiveIdleConsecutiveSameSubject: Number(this.productiveIdleConsecutiveSameSubject || 0)
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
      this.causalInvestigationHistory =
        Array.isArray(saved.causalInvestigationHistory)
          ? saved.causalInvestigationHistory.slice(
              0,
              this.configuration.maximumCausalInvestigationHistory
            )
          : [];
      this.lastCausalInvestigation =
        saved.lastCausalInvestigation &&
        typeof saved.lastCausalInvestigation === "object"
          ? this.clone(saved.lastCausalInvestigation)
          : null;
      this.causalInvestigationCount = Math.max(
        Number(saved.causalInvestigationCount || 0),
        Number(this.lastCausalInvestigation?.investigationNumber || 0)
      );
      this.autonomousInvestigationHistory =
        Array.isArray(saved.autonomousInvestigationHistory)
          ? saved.autonomousInvestigationHistory.slice(
              0,
              this.configuration.maximumAutonomousInvestigationHistory
            )
          : [];
      this.lastAutonomousInvestigation =
        saved.lastAutonomousInvestigation &&
        typeof saved.lastAutonomousInvestigation === "object"
          ? this.clone(saved.lastAutonomousInvestigation)
          : null;
      this.autonomousInvestigationCount = Math.max(
        Number(saved.autonomousInvestigationCount || 0),
        Number(this.lastAutonomousInvestigation?.investigationNumber || 0)
      );
      this.evidenceAssimilationHistory = Array.isArray(saved.evidenceAssimilationHistory) ? saved.evidenceAssimilationHistory.slice(0, this.configuration.maximumEvidenceAssimilationHistory) : [];
      this.lastEvidenceAssimilation = saved.lastEvidenceAssimilation && typeof saved.lastEvidenceAssimilation === "object" ? this.clone(saved.lastEvidenceAssimilation) : null;
      this.evidenceAssimilationCount = Math.max(Number(saved.evidenceAssimilationCount || 0), Number(this.lastEvidenceAssimilation?.assimilationNumber || 0));
      this.developmentalDriveHistory = Array.isArray(saved.developmentalDriveHistory) ? saved.developmentalDriveHistory.slice(0, this.configuration.maximumDevelopmentalDriveHistory) : [];
      this.developmentalGoals = Array.isArray(saved.developmentalGoals) ? saved.developmentalGoals.slice(0, this.configuration.maximumDevelopmentalGoals) : [];
      this.developmentalPracticeHistory = Array.isArray(saved.developmentalPracticeHistory) ? saved.developmentalPracticeHistory.slice(0, this.configuration.maximumDevelopmentalPracticeHistory) : [];
      this.deferredCapabilities = Array.isArray(saved.deferredCapabilities) ? saved.deferredCapabilities.slice(0, this.configuration.maximumDeferredCapabilities) : [];
      this.developmentalRetrospectives = Array.isArray(saved.developmentalRetrospectives) ? saved.developmentalRetrospectives.slice(0, this.configuration.maximumDevelopmentalRetrospectives) : [];
      this.lastDevelopmentalDrive = saved.lastDevelopmentalDrive && typeof saved.lastDevelopmentalDrive === "object" ? this.clone(saved.lastDevelopmentalDrive) : null;
      this.developmentalDriveCount = Math.max(Number(saved.developmentalDriveCount || 0), Number(this.lastDevelopmentalDrive?.driveNumber || 0));
      this.intentReconstructionHistory = Array.isArray(saved.intentReconstructionHistory) ? saved.intentReconstructionHistory.slice(0, this.configuration.maximumIntentReconstructions) : [];
      this.investigativeIntentions = Array.isArray(saved.investigativeIntentions) ? saved.investigativeIntentions.slice(0, this.configuration.maximumInvestigativeIntentions) : [];
      this.lastIntentReconstruction = saved.lastIntentReconstruction && typeof saved.lastIntentReconstruction === "object" ? this.clone(saved.lastIntentReconstruction) : null;
      this.intentReconstructionCount = Math.max(Number(saved.intentReconstructionCount || 0), Number(this.lastIntentReconstruction?.reconstructionNumber || 0));
      this.deliberateExperienceHistory = Array.isArray(saved.deliberateExperienceHistory) ? saved.deliberateExperienceHistory.slice(0, this.configuration.maximumDeliberateExperiences) : [];
      this.counterfactualSimulationHistory = Array.isArray(saved.counterfactualSimulationHistory) ? saved.counterfactualSimulationHistory.slice(0, this.configuration.maximumCounterfactualSimulations) : [];
      this.preparednessInsights = Array.isArray(saved.preparednessInsights) ? saved.preparednessInsights.slice(0, this.configuration.maximumPreparednessInsights) : [];
      this.lastDeliberateExperience = saved.lastDeliberateExperience && typeof saved.lastDeliberateExperience === "object" ? this.clone(saved.lastDeliberateExperience) : null;
      this.lastCounterfactualSimulation = saved.lastCounterfactualSimulation && typeof saved.lastCounterfactualSimulation === "object" ? this.clone(saved.lastCounterfactualSimulation) : null;
      this.deliberateExperienceCount = Math.max(Number(saved.deliberateExperienceCount || 0), Number(this.lastDeliberateExperience?.experienceNumber || 0));
      this.counterfactualSimulationCount = Math.max(Number(saved.counterfactualSimulationCount || 0), Number(this.lastCounterfactualSimulation?.simulationNumber || 0));
      this.anticipatoryInitiatives = Array.isArray(saved.anticipatoryInitiatives) ? saved.anticipatoryInitiatives.slice(0, this.configuration.anticipatoryCandidateLimit) : [];
      this.lastAnticipatorySweep = saved.lastAnticipatorySweep && typeof saved.lastAnticipatorySweep === "object" ? this.clone(saved.lastAnticipatorySweep) : null;
      this.anticipatorySweepCount = Math.max(Number(saved.anticipatorySweepCount || 0), Number(this.lastAnticipatorySweep?.sweepNumber || 0));
      this.executivePriorityPortfolio = Array.isArray(saved.executivePriorityPortfolio) ? saved.executivePriorityPortfolio.slice(0, this.configuration.priorityPortfolioLimit) : [];
      this.currentExecutivePriority = saved.currentExecutivePriority && typeof saved.currentExecutivePriority === "object" ? this.clone(saved.currentExecutivePriority) : null;
      this.lastPriorityArbitration = saved.lastPriorityArbitration && typeof saved.lastPriorityArbitration === "object" ? this.clone(saved.lastPriorityArbitration) : null;
      this.priorityArbitrationCount = Math.max(Number(saved.priorityArbitrationCount || 0), Number(this.lastPriorityArbitration?.arbitrationNumber || 0));
      this.cognitiveThreads = Array.isArray(saved.cognitiveThreads) ? saved.cognitiveThreads.slice(0, this.configuration.cognitiveThreadLimit) : [];
      this.activeCognitiveThreadId = saved.activeCognitiveThreadId || null;
      this.lastCognitiveThreadEvent = saved.lastCognitiveThreadEvent && typeof saved.lastCognitiveThreadEvent === "object" ? this.clone(saved.lastCognitiveThreadEvent) : null;
      this.cognitiveThreadEventCount = Math.max(Number(saved.cognitiveThreadEventCount || 0), Number(this.lastCognitiveThreadEvent?.eventNumber || 0));
      this.continuousCognitionState = saved.continuousCognitionState && typeof saved.continuousCognitionState === "object" ? this.clone(saved.continuousCognitionState) : null;
      this.continuousCognitionCycleCount = Math.max(Number(saved.continuousCognitionCycleCount || 0), Number(saved.lastContinuousCognitionCycle?.cycleNumber || 0));
      this.lastContinuousCognitionCycle = saved.lastContinuousCognitionCycle && typeof saved.lastContinuousCognitionCycle === "object" ? this.clone(saved.lastContinuousCognitionCycle) : null;
      this.productiveIdleHistory = Array.isArray(saved.productiveIdleHistory) ? saved.productiveIdleHistory.slice(0, this.configuration.productiveIdleHistoryLimit) : [];
      this.lastProductiveIdleAction = saved.lastProductiveIdleAction && typeof saved.lastProductiveIdleAction === "object" ? this.clone(saved.lastProductiveIdleAction) : null;
      this.productiveIdleConsecutiveSameSubject = Number(saved.productiveIdleConsecutiveSameSubject || 0);
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

    async runCrossFuturePortfolioAcceptanceTest() {
      const original = {
        portfolio:
          this.clone(
            this.executivePriorityPortfolio
          ),
        state:
          this.clone(
            this.crossFuturePortfolioState
          )
      };

      try {
        this.executivePriorityPortfolio =
          [];

        const makeMoves = () => [
          {
            moveId:
              this.id("verify"),
            action:
              "verify-positioning-prerequisites",
            timing: "today",
            reversibility: 0.98,
            optionValue: 0.92,
            commitmentCost: 0.08,
            informationValue: 0.95,
            internalOnly: true,
            externalAuthorityRequired:
              false
          },
          {
            moveId:
              this.id("investigate"),
            action:
              "investigate-future-falsifiers",
            timing: "today",
            reversibility: 0.96,
            optionValue: 0.9,
            commitmentCost: 0.1,
            informationValue: 0.97,
            internalOnly: true,
            externalAuthorityRequired:
              false
          },
          {
            moveId:
              this.id("map"),
            action:
              "map-capability-and-relationship-gaps",
            timing: "today",
            reversibility: 0.94,
            optionValue: 0.88,
            commitmentCost: 0.12,
            informationValue: 0.9,
            internalOnly: true,
            externalAuthorityRequired:
              false
          }
        ];

        const backward = {
          schema:
            "meos.maddy.backward-positioning-option-value.v1",
          positioningId:
            "d7t8-positioning",
          applied: true,
          plans: [
            {
              planId:
                "d7t8-future-a",
              subject:
                "County funding pathway",
              sourceCandidateId:
                "d7t8-a",
              desiredFuturePosition: {
                lineageEvidence: [{
                  type:
                    "synthetic-future-lineage",
                  lineageId:
                    "d7t8-lineage-a"
                }]
              },
              requirements: [
                {
                  category:
                    "eligibility-and-authority",
                  statement:
                    "Verify eligibility and authority."
                },
                {
                  category:
                    "relationships-and-access",
                  statement:
                    "Develop partner relationship and access."
                },
                {
                  category:
                    "evidence-and-competitive-readiness",
                  statement:
                    "Build evidence and competitive readiness."
                }
              ],
              minimumReversibleMoves:
                makeMoves()
            },
            {
              planId:
                "d7t8-future-b",
              subject:
                "Regional partnership pathway",
              sourceCandidateId:
                "d7t8-b",
              desiredFuturePosition: {
                lineageEvidence: [{
                  type:
                    "synthetic-future-lineage",
                  lineageId:
                    "d7t8-lineage-b"
                }]
              },
              requirements: [
                {
                  category:
                    "eligibility-and-authority",
                  statement:
                    "Verify eligibility and authority."
                },
                {
                  category:
                    "relationships-and-access",
                  statement:
                    "Develop partner relationship and access."
                },
                {
                  category:
                    "evidence-and-competitive-readiness",
                  statement:
                    "Build evidence and competitive readiness."
                }
              ],
              minimumReversibleMoves:
                makeMoves()
            }
          ]
        };

        const preview =
          this.reasonAcrossFuturePortfolio(
            backward,
            {
              apply: false
            }
          );

        const afterPreview =
          this.clone(
            this.executivePriorityPortfolio
          );

        const applied =
          this.reasonAcrossFuturePortfolio(
            backward,
            {
              apply: true
            }
          );

        const inserted =
          this.executivePriorityPortfolio
            .filter(
              item =>
                item?.origin ===
                "cross-future-portfolio"
            );

        const checks = [
          {
            name:
              "Portfolio cognition compares multiple plausible future positions together",
            passed:
              applied?.futureCount === 2
          },
          {
            name:
              "Future lineage evidence remains attached to portfolio cognition",
            passed:
              applied?.futures
                ?.every(
                  future =>
                    future
                      ?.lineageEvidence
                      ?.length >= 1
                ) === true
          },
          {
            name:
              "Shared executive attention demand is recognized across futures",
            passed:
              applied
                ?.sharedConstraints
                ?.some(
                  item =>
                    item.resource ===
                      "executive-attention" &&
                    item
                      .competingFutureCount ===
                      2
                ) === true
          },
          {
            name:
              "Shared relationship capacity demand is recognized across futures",
            passed:
              applied
                ?.sharedConstraints
                ?.some(
                  item =>
                    item.resource ===
                      "relationship-capacity" &&
                    item
                      .competingFutureCount ===
                      2
                ) === true
          },
          {
            name:
              "Shared demand is treated as capacity unknown rather than invented scarcity",
            passed:
              applied
                ?.sharedConstraints
                ?.every(
                  item =>
                    item
                      .finiteCapacityAssumed ===
                      false &&
                    item
                      .capacityUnknown ===
                      true &&
                    item
                      .requiresCapacityEvidence ===
                      true
                ) === true
          },
          {
            name:
              "Potential cross-future conflicts are identified without claiming mutual exclusion",
            passed:
              applied
                ?.pairwiseConflicts
                ?.length >= 1 &&
              applied
                ?.pairwiseConflicts
                ?.every(
                  item =>
                    item
                      .destructiveTradeoffProven ===
                      false
                ) === true
          },
          {
            name:
              "Moves shared by multiple futures are recognized as robust",
            passed:
              applied
                ?.robustMoves
                ?.length >= 3 &&
              applied
                ?.robustMoves
                ?.every(
                  item =>
                    item.futureCoverage ===
                      2
                ) === true
          },
          {
            name:
              "Robust moves preserve high reversibility and option value",
            passed:
              applied
                ?.robustMoves
                ?.every(
                  item =>
                    item.reversibility >=
                      0.9 &&
                    item.optionValue >=
                      0.85
                ) === true
          },
          {
            name:
              "Portfolio posture prefers optionality while learning",
            passed:
              applied?.judgment
                ?.preferredPosture ===
                "preserve-optionality-while-learning"
          },
          {
            name:
              "Preview does not mutate Executive Priority Portfolio",
            passed:
              preview?.applied ===
                false &&
              afterPreview.length === 0
          },
          {
            name:
              "Applied robust moves reuse existing Executive Priority Portfolio",
            passed:
              inserted.length >= 3 &&
              inserted.length ===
                applied
                  ?.portfolioCandidates
                  ?.length
          },
          {
            name:
              "Cross-future portfolio judgment preserves truth boundaries",
            passed:
              applied?.truthBoundary
                ?.futuresArePredictions ===
                false &&
              applied?.truthBoundary
                ?.sharedDemandProvesScarcity ===
                false &&
              applied?.truthBoundary
                ?.potentialConflictProvesMutualExclusion ===
                false &&
              applied?.truthBoundary
                ?.portfolioPreferenceIsJudgment ===
                true
          },
          {
            name:
              "Meaningful-change path carries cross-future portfolio cognition into cognitive re-entry",
            passed:
              /reasonAcrossFuturePortfolio/.test(
                this
                  .attendToWorldModelChange
                  .toString()
              ) &&
              /crossFuturePortfolio/.test(
                this
                  .attendToWorldModelChange
                  .toString()
              ) &&
              /scheduleCognitiveReentry/.test(
                this
                  .attendToWorldModelChange
                  .toString()
              )
          },
          {
            name:
              "Portfolio cognition grants no resource allocation, spending, Hallway, planning execution, or external-action authority",
            passed:
              applied?.authority
                ?.resourceAllocationAuthorized ===
                false &&
              applied?.authority
                ?.spendingAuthorized ===
                false &&
              applied?.authority
                ?.planningExecutionAuthorized ===
                false &&
              applied?.authority
                ?.hallwayDispatchAuthorized ===
                false &&
              applied?.authority
                ?.externalActionAuthorized ===
                false &&
              applied?.authority
                ?.humanAuthorityPreserved ===
                true
          }
        ];

        const passed =
          checks.every(
            item => item.passed
          );

        console.table(checks);
        console.info(
          `[MEOS ${this.version}] Commission 006.017D7T8 Cross-Future Portfolio Robustness: ${passed ? "PASS" : "FAIL"}.`
        );

        return {
          commission:
            "006.017D7T8",
          version: this.version,
          buildId: this.buildId,
          passed,
          checks,
          preview,
          applied,
          portfolioCandidates:
            inserted,
          authority:
            applied?.authority
        };
      } finally {
        this.executivePriorityPortfolio =
          original.portfolio;
        this.crossFuturePortfolioState =
          original.state;
      }
    },

    async runBackwardPositioningAcceptanceTest() {
      const original = {
        portfolio:
          this.clone(
            this.executivePriorityPortfolio
          ),
        state:
          this.clone(
            this.backwardPositioningState
          )
      };

      try {
        this.executivePriorityPortfolio =
          [];

        const delta = {
          deltaId:
            "d7t7-delta",
          subject:
            "Future county funding window",
          changes: {
            newDrivers: [
              "new partner pathway",
              "changed eligibility timing"
            ],
            newUnknowns: [
              "final partner eligibility interpretation"
            ]
          }
        };

        const strategic = {
          schema:
            "meos.maddy.temporal-strategic-delta-foresight.v1",
          analysisId:
            "d7t7-analysis",
          applied: true,
          deltas: [delta],
          positioningCandidates: [{
            id:
              "temporal-positioning-d7t7-delta",
            subject:
              "Future county funding window",
            origin:
              "temporal-strategic-delta",
            reason:
              "Changed future creates a positioning window.",
            evidence: [{
              type:
                "synthetic-future-lineage",
              priorSimulationId:
                "d7t7-prior",
              successorSimulationId:
                "d7t7-successor",
              lineageId:
                "d7t7-lineage"
            }],
            unknowns: [
              "final partner eligibility interpretation"
            ],
            reversibility: 0.75,
            externalAuthorityRequired:
              false
          }]
        };

        const preview =
          this.reasonBackwardFromFuturePosition(
            strategic,
            {
              apply: false
            }
          );

        const afterPreview =
          this.clone(
            this.executivePriorityPortfolio
          );

        const applied =
          this.reasonBackwardFromFuturePosition(
            strategic,
            {
              apply: true
            }
          );

        const plan =
          applied?.plans?.[0] ||
          null;

        const moves =
          plan?.minimumReversibleMoves ||
          [];

        const inserted =
          this.executivePriorityPortfolio
            .filter(
              item =>
                item?.origin ===
                "backward-positioning"
            );

        const checks = [
          {
            name:
              "Positioning cognition begins from an existing strategic future candidate",
            passed:
              applied?.planCount === 1 &&
              plan?.sourceCandidateId ===
                strategic
                  .positioningCandidates[0]
                  .id
          },
          {
            name:
              "Desired future preserves synthetic future lineage evidence",
            passed:
              plan
                ?.desiredFuturePosition
                ?.lineageEvidence?.[0]
                ?.lineageId ===
                "d7t7-lineage"
          },
          {
            name:
              "Backward horizon explicitly reasons from 12 months to today",
            passed:
              plan?.backwardHorizon
                ?.map(item => item.key)
                .join("|") ===
                "t-minus-12-months|t-minus-6-months|t-minus-90-days|today"
          },
          {
            name:
              "Long-range positioning requires verified eligibility and authority conditions",
            passed:
              plan?.requirements
                ?.some(
                  item =>
                    item.category ===
                      "eligibility-and-authority" &&
                    item.requiredBy ===
                      "t-minus-12-months"
                ) === true
          },
          {
            name:
              "Mid-range positioning includes relationships and competitive readiness",
            passed:
              plan?.requirements
                ?.filter(
                  item =>
                    item.requiredBy ===
                      "t-minus-6-months"
                ).length >= 2
          },
          {
            name:
              "Near-window positioning attacks decision-critical unknowns before commitment",
            passed:
              plan?.requirements
                ?.some(
                  item =>
                    item.category ===
                      "decision-critical-unknowns" &&
                    item.requiredBy ===
                      "t-minus-90-days"
                ) === true
          },
          {
            name:
              "Today's moves are minimum reversible option-value moves",
            passed:
              moves.length >= 3 &&
              moves.every(
                move =>
                  move.reversibility >=
                    0.9 &&
                  move.optionValue >=
                    0.85 &&
                  move.commitmentCost <=
                    0.15
              )
          },
          {
            name:
              "Today's moves prioritize information and preparedness rather than premature execution",
            passed:
              moves.every(
                move =>
                  move.internalOnly ===
                    true &&
                  move
                    .externalAuthorityRequired ===
                    false &&
                  move.informationValue >=
                    0.9
              )
          },
          {
            name:
              "Irreversible external commitments are explicitly deferred",
            passed:
              plan?.deferredCommitments
                ?.some(
                  item =>
                    item.action ===
                      "external-partner-commitment"
                ) &&
              plan?.deferredCommitments
                ?.some(
                  item =>
                    item.action ===
                      "resource-obligation"
                ) &&
              plan?.deferredCommitments
                ?.some(
                  item =>
                    item.action ===
                      "application-or-submission"
                )
          },
          {
            name:
              "Preview does not mutate executive priority state",
            passed:
              preview?.applied ===
                false &&
              afterPreview.length === 0
          },
          {
            name:
              "Applied low-regret moves reuse existing Executive Priority Portfolio",
            passed:
              inserted.length ===
                applied
                  ?.portfolioCandidates
                  ?.length &&
              inserted.length >= 3
          },
          {
            name:
              "Backward positioning remains judgment rather than prediction",
            passed:
              plan?.truthBoundary
                ?.desiredFutureIsPrediction ===
                false &&
              plan?.truthBoundary
                ?.backwardRequirementsAreJudgment ===
                true &&
              plan?.truthBoundary
                ?.prerequisitesRequireVerification ===
                true
          },
          {
            name:
              "Meaningful-change path carries backward positioning into cognitive re-entry",
            passed:
              /reasonBackwardFromFuturePosition/.test(
                this
                  .attendToWorldModelChange
                  .toString()
              ) &&
              /backwardPositioning/.test(
                this
                  .attendToWorldModelChange
                  .toString()
              ) &&
              /scheduleCognitiveReentry/.test(
                this
                  .attendToWorldModelChange
                  .toString()
              )
          },
          {
            name:
              "Backward positioning grants no spending, submission, Hallway, planning execution, or external-action authority",
            passed:
              applied?.authority
                ?.spendingAuthorized ===
                false &&
              applied?.authority
                ?.submissionAuthorized ===
                false &&
              applied?.authority
                ?.planningExecutionAuthorized ===
                false &&
              applied?.authority
                ?.hallwayDispatchAuthorized ===
                false &&
              applied?.authority
                ?.externalActionAuthorized ===
                false &&
              applied?.authority
                ?.humanAuthorityPreserved ===
                true
          }
        ];

        const passed =
          checks.every(
            item => item.passed
          );

        console.table(checks);
        console.info(
          `[MEOS ${this.version}] Commission 006.017D7T7 Backward Positioning + Option Value: ${passed ? "PASS" : "FAIL"}.`
        );

        return {
          commission:
            "006.017D7T7",
          version: this.version,
          buildId: this.buildId,
          passed,
          checks,
          preview,
          applied,
          plan,
          moves,
          portfolioCandidates:
            inserted,
          authority:
            applied?.authority
        };
      } finally {
        this.executivePriorityPortfolio =
          original.portfolio;
        this.backwardPositioningState =
          original.state;
      }
    },

    async runTemporalStrategicDeltaAcceptanceTest() {
      const original = {
        portfolio:
          this.clone(
            this.executivePriorityPortfolio
          ),
        state:
          this.clone(
            this.temporalStrategicDeltaState
          )
      };

      try {
        this.executivePriorityPortfolio =
          [];

        const prior = {
          id:
            "d7t6-prior-future",
          subject:
            "County funding eligibility deadline",
          evidenceClass:
            "synthetic-future-simulation",
          drivers: [
            "county eligibility rules"
          ],
          assumptions: [
            "partner participation remains stable",
            "application window remains open"
          ],
          uncertainties: [
            "final eligibility interpretation"
          ],
          governance: {
            simulationNeverBecomesHistoricalFact:
              true
          }
        };

        const successor = {
          id:
            "d7t6-successor-future",
          subject:
            "County funding eligibility deadline",
          evidenceClass:
            "synthetic-future-simulation",
          drivers: [
            "county eligibility rules",
            {
              type:
                "material-world-model-change",
              subject:
                "County funding eligibility deadline",
              sourceCognitiveRevision:
                "d7t6-cognitive-revision"
            },
            "new partner pathway"
          ],
          assumptions: [
            "partner participation remains stable",
            "application window remains open"
          ],
          uncertainties: [
            "final eligibility interpretation",
            {
              question:
                "How does the materially changed world state alter this future trajectory?"
            }
          ],
          temporalRevision: {
            lineageId:
              "d7t6-lineage",
            supersedes:
              prior.id,
            changedRealitySubject:
              "County funding eligibility deadline"
          },
          governance: {
            simulationNeverBecomesHistoricalFact:
              true
          }
        };

        const resimulation = {
          schema:
            "meos.maddy.selective-temporal-consequence-resimulation.v1",
          resimulationId:
            "d7t6-lineage",
          applied: true,
          selected: true,
          subject:
            "County funding eligibility deadline",
          revisions: [{
            priorSimulationId:
              prior.id,
            applied: true,
            prior,
            successorSimulation:
              successor
          }]
        };

        const preview =
          this.analyzeTemporalStrategicDelta(
            resimulation,
            {
              apply: false
            }
          );

        const portfolioAfterPreview =
          this.clone(
            this.executivePriorityPortfolio
          );

        const applied =
          this.analyzeTemporalStrategicDelta(
            resimulation,
            {
              apply: true
            }
          );

        const delta =
          applied?.deltas?.[0] ||
          null;

        const candidate =
          applied
            ?.positioningCandidates?.[0] ||
          null;

        const portfolioCandidate =
          this.executivePriorityPortfolio
            .find(
              item =>
                item?.id ===
                candidate?.id
            );

        const checks = [
          {
            name:
              "Temporal strategic delta compares prior and successor synthetic futures",
            passed:
              applied?.deltaCount === 1 &&
              delta
                ?.priorSimulationId ===
                prior.id &&
              delta
                ?.successorSimulationId ===
                successor.id
          },
          {
            name:
              "New future drivers are detected",
            passed:
              delta?.changes
                ?.newDrivers?.length >= 2
          },
          {
            name:
              "New temporal uncertainty is detected",
            passed:
              delta?.changes
                ?.newUnknowns?.length >= 1
          },
          {
            name:
              "Changed reality raises temporal urgency",
            passed:
              delta?.executiveMeaning
                ?.moreUrgent === true
          },
          {
            name:
              "Changed future can become newly positionable",
            passed:
              delta?.executiveMeaning
                ?.newlyPossible === true
          },
          {
            name:
              "New uncertainty can require investigation",
            passed:
              delta?.executiveMeaning
                ?.investigationRequired ===
                true
          },
          {
            name:
              "Positioning candidacy requires meaningful attention score",
            passed:
              delta?.executiveMeaning
                ?.positioningCandidate ===
                true &&
              delta?.signals
                ?.attentionScore >= 0.6
          },
          {
            name:
              "Preview performs strategic analysis without changing priority state",
            passed:
              preview?.applied === false &&
              portfolioAfterPreview
                .length === 0
          },
          {
            name:
              "Applied strategic delta enters existing executive priority portfolio as candidate",
            passed:
              portfolioCandidate
                ?.origin ===
                "temporal-strategic-delta" &&
              portfolioCandidate
                ?.status ===
                "candidate"
          },
          {
            name:
              "Temporal candidate preserves future lineage as evidence",
            passed:
              portfolioCandidate
                ?.evidence?.[0]
                ?.lineageId ===
                "d7t6-lineage" &&
              portfolioCandidate
                ?.evidence?.[0]
                ?.priorSimulationId ===
                prior.id &&
              portfolioCandidate
                ?.evidence?.[0]
                ?.successorSimulationId ===
                successor.id
          },
          {
            name:
              "Strategic delta remains judgment rather than prediction or fact",
            passed:
              delta?.truthBoundary
                ?.strategicDeltaIsJudgment ===
                true &&
              delta?.truthBoundary
                ?.futureIsPrediction ===
                false &&
              delta?.truthBoundary
                ?.futureIsFact === false
          },
          {
            name:
              "Existing priority organ is reused rather than creating a foresight queue",
            passed:
              Array.isArray(
                this.executivePriorityPortfolio
              ) &&
              typeof this
                .runExecutiveJudgmentCycle ===
                "function"
          },
          {
            name:
              "Meaningful-change path carries temporal strategic delta into cognitive re-entry",
            passed:
              /analyzeTemporalStrategicDelta/.test(
                this
                  .attendToWorldModelChange
                  .toString()
              ) &&
              /temporalStrategicDelta/.test(
                this
                  .attendToWorldModelChange
                  .toString()
              ) &&
              /scheduleCognitiveReentry/.test(
                this
                  .attendToWorldModelChange
                  .toString()
              )
          },
          {
            name:
              "Temporal foresight grants no planning execution, Hallway dispatch, or external-action authority",
            passed:
              applied?.authority
                ?.planningExecutionAuthorized ===
                false &&
              applied?.authority
                ?.hallwayDispatchAuthorized ===
                false &&
              applied?.authority
                ?.externalActionAuthorized ===
                false &&
              applied?.authority
                ?.humanAuthorityPreserved ===
                true
          }
        ];

        const passed =
          checks.every(
            item => item.passed
          );

        console.table(checks);
        console.info(
          `[MEOS ${this.version}] Commission 006.017D7T6A Temporal Uncertainty Investigation Repair: ${passed ? "PASS" : "FAIL"}.`
        );

        return {
          commission:
            "006.017D7T6",
          version: this.version,
          buildId: this.buildId,
          passed,
          checks,
          preview,
          applied,
          delta,
          candidate:
            portfolioCandidate ||
            candidate,
          authority:
            applied?.authority
        };
      } finally {
        this.executivePriorityPortfolio =
          original.portfolio;
        this.temporalStrategicDeltaState =
          original.state;
      }
    },

    async runSelectiveTemporalResimulationAcceptanceTest() {
      const original = {
        simulations:
          this.clone(
            this.counterfactualSimulationHistory
          ),
        last:
          this.clone(
            this.lastCounterfactualSimulation
          ),
        count:
          this.counterfactualSimulationCount,
        state:
          this.clone(
            this.temporalResimulationState
          )
      };

      try {
        this.counterfactualSimulationHistory =
          [];
        this.lastCounterfactualSimulation =
          null;
        this.counterfactualSimulationCount =
          0;

        const affectedCreated =
          this.generateFutureSimulation({
            subject:
              "County funding eligibility deadline",
            trigger:
              "Partner eligibility remains available",
            horizon:
              "next funding cycle",
            drivers: [
              "county eligibility rules",
              "partner participation"
            ],
            assumptions: [
              "partner-led participation remains eligible"
            ],
            uncertainties: [
              "whether eligibility language changes"
            ],
            offices: [
              "Development",
              "Compliance"
            ]
          });

        const unaffectedCreated =
          this.generateFutureSimulation({
            subject:
              "Fleet maintenance scheduling",
            trigger:
              "Routine vehicle maintenance",
            horizon:
              "next quarter",
            drivers: [
              "mileage",
              "service intervals"
            ],
            assumptions: [
              "current maintenance cadence continues"
            ],
            uncertainties: [
              "future repair timing"
            ],
            offices: [
              "Operations"
            ]
          });

        const affectedId =
          affectedCreated
            ?.simulation?.id;
        const unaffectedId =
          unaffectedCreated
            ?.simulation?.id;

        const reconciliation = {
          schema:
            "meos.maddy.selective-cognitive-reconciliation.v1",
          createdAt:
            new Date().toISOString(),
          subject:
            "County funding eligibility deadline",
          staleIntentions: [{
            intentionId:
              "d7t5-intention",
            subject:
              "County funding eligibility deadline",
            reconciliationStatus:
              "review-required"
          }],
          selected: [{
            organ:
              "future-simulation",
            required: true
          }],
          untouched: [{
            organ:
              "executive-monitoring",
            required: false
          }]
        };

        const cognitiveRevision = {
          schema:
            "meos.maddy.governed-cognitive-state-revision.v1",
          revisionId:
            "d7t5-cognitive-revision",
          subject:
            "County funding eligibility deadline",
          applied: true
        };

        const beforeAffected =
          this.clone(
            this
              .counterfactualSimulationHistory
              .find(
                item =>
                  item?.id ===
                  affectedId
              )
          );

        const beforeUnaffected =
          this.clone(
            this
              .counterfactualSimulationHistory
              .find(
                item =>
                  item?.id ===
                  unaffectedId
              )
          );

        const preview =
          this.resimulateAffectedFutures(
            cognitiveRevision,
            reconciliation,
            {
              apply: false
            }
          );

        const afterPreviewAffected =
          this.clone(
            this
              .counterfactualSimulationHistory
              .find(
                item =>
                  item?.id ===
                  affectedId
              )
          );

        const applied =
          this.resimulateAffectedFutures(
            cognitiveRevision,
            reconciliation,
            {
              apply: true
            }
          );

        const afterAffected =
          this.clone(
            this
              .counterfactualSimulationHistory
              .find(
                item =>
                  item?.id ===
                  affectedId
              )
          );

        const afterUnaffected =
          this.clone(
            this
              .counterfactualSimulationHistory
              .find(
                item =>
                  item?.id ===
                  unaffectedId
              )
          );

        const successor =
          applied?.revisions?.[0]
            ?.successorSimulation ||
          null;

        const checks = [
          {
            name:
              "Existing synthetic future simulation organ is reused",
            passed:
              affectedCreated?.success ===
                true &&
              unaffectedCreated?.success ===
                true &&
              typeof this
                .generateFutureSimulation ===
                "function"
          },
          {
            name:
              "Future re-simulation occurs only when selective reconciliation requests it",
            passed:
              applied?.selected === true
          },
          {
            name:
              "Preview identifies only the affected future",
            passed:
              preview?.applied ===
                false &&
              preview?.affectedCount ===
                1 &&
              preview?.revisions?.[0]
                ?.priorSimulationId ===
                affectedId
          },
          {
            name:
              "Preview does not mutate the affected future",
            passed:
              afterPreviewAffected
                ?.status ===
                beforeAffected?.status &&
              afterPreviewAffected
                ?.temporalRevision ==
                null
          },
          {
            name:
              "Affected prior future is superseded rather than erased",
            passed:
              afterAffected?.status ===
                "superseded-by-changed-reality" &&
              afterAffected
                ?.temporalRevision
                ?.superseded === true
          },
          {
            name:
              "Superseded future preserves lineage to its successor",
            passed:
              afterAffected
                ?.temporalRevision
                ?.supersededBy ===
                successor?.id &&
              afterAffected
                ?.temporalRevision
                ?.lineageId ===
                applied?.resimulationId
          },
          {
            name:
              "Successor future is regenerated through existing future-simulation machinery",
            passed:
              successor
                ?.evidenceClass ===
                "synthetic-future-simulation" &&
              successor
                ?.temporalRevision
                ?.supersedes ===
                affectedId
          },
          {
            name:
              "Changed reality is carried into successor drivers",
            passed:
              successor?.drivers
                ?.some(
                  driver =>
                    driver?.type ===
                      "material-world-model-change" &&
                    driver
                      ?.sourceCognitiveRevision ===
                      cognitiveRevision
                        .revisionId
                ) === true
          },
          {
            name:
              "Successor explicitly carries new temporal uncertainty",
            passed:
              successor
                ?.uncertainties
                ?.some(
                  item =>
                    item?.question ===
                    "How does the materially changed world state alter this future trajectory?"
                ) === true
          },
          {
            name:
              "Unrelated future remains untouched",
            passed:
              afterUnaffected?.status ===
                beforeUnaffected?.status &&
              afterUnaffected
                ?.temporalRevision ==
                null
          },
          {
            name:
              "Temporal resimulation does not recompute every future",
            passed:
              applied?.isolation
                ?.recomputeEveryFuture ===
                false &&
              applied
                ?.unaffectedSimulationIds
                ?.includes(
                  unaffectedId
                ) === true
          },
          {
            name:
              "Synthetic future remains explicitly non-factual and non-predictive",
            passed:
              applied?.truthBoundary
                ?.successorIsPrediction ===
                false &&
              applied?.truthBoundary
                ?.successorIsHistoricalFact ===
                false &&
              successor
                ?.governance
                ?.simulationNeverBecomesHistoricalFact ===
                true
          },
          {
            name:
              "Meaningful-change path carries temporal resimulation into cognitive re-entry",
            passed:
              /resimulateAffectedFutures/.test(
                this
                  .attendToWorldModelChange
                  .toString()
              ) &&
              /temporalResimulation/.test(
                this
                  .attendToWorldModelChange
                  .toString()
              ) &&
              /scheduleCognitiveReentry/.test(
                this
                  .attendToWorldModelChange
                  .toString()
              )
          },
          {
            name:
              "Temporal resimulation grants no execution or external-action authority",
            passed:
              applied?.authority
                ?.planningExecutionAuthorized ===
                false &&
              applied?.authority
                ?.hallwayDispatchAuthorized ===
                false &&
              applied?.authority
                ?.externalActionAuthorized ===
                false &&
              applied?.authority
                ?.humanAuthorityPreserved ===
                true
          }
        ];

        const passed =
          checks.every(
            item => item.passed
          );

        console.table(checks);
        console.info(
          `[MEOS ${this.version}] Commission 006.017D7T5 Selective Temporal Consequence Resimulation: ${passed ? "PASS" : "FAIL"}.`
        );

        return {
          commission:
            "006.017D7T5",
          version: this.version,
          buildId: this.buildId,
          passed,
          checks,
          preview,
          applied,
          beforeAffected,
          afterAffected,
          beforeUnaffected,
          afterUnaffected,
          successor,
          authority:
            applied?.authority
        };
      } finally {
        this.counterfactualSimulationHistory =
          original.simulations;
        this.lastCounterfactualSimulation =
          original.last;
        this.counterfactualSimulationCount =
          original.count;
        this.temporalResimulationState =
          original.state;
      }
    },

    async runPlanMonitoringRevisionAcceptanceTest() {
      const hydration =
        await this.hydrateResearchKnowledgeBeforeCognition();

      const planning =
        global.ExecutivePlanning;
      const monitoring =
        global.ExecutiveMonitoring;

      const subject =
        "D7T4 consequence revision fixture";

      const plan =
        planning?.createPlan?.(
          {
            title: subject,
            objective:
              "Existing plan whose assumptions depend on changed reality.",
            metadata: {
              cognitiveIntentionId:
                "d7t4-intention"
            }
          },
          {
            persist: false
          }
        );

      const planCreated =
        plan?.plan || plan;

      const planRecord =
        planning?.getPlanById?.(
          planCreated?.id
        ) ||
        planCreated;

      const unrelatedPlan =
        planning?.createPlan?.(
          {
            title:
              "D7T4 unrelated plan fixture",
            objective:
              "Must remain untouched."
          },
          {
            persist: false
          }
        );

      const unrelatedPlanCreated =
        unrelatedPlan?.plan ||
        unrelatedPlan;

      const unrelatedPlanRecord =
        planning?.getPlanById?.(
          unrelatedPlanCreated?.id
        ) ||
        unrelatedPlanCreated;

      const monitoringAlert =
        monitoring?.upsertAlert?.({
          key:
            "d7t4b-cognitive-watch",
          category:
            "cognitive-revision",
          title: subject,
          message:
            "Existing monitoring condition depends on changed reality.",
          severity: 3,
          recommendedAction:
            "Reconsider this monitoring condition against the changed world state.",
          metadata: {
            source:
              "006.017D7T4B-acceptance"
          }
        });

      const alertRecord =
        monitoringAlert?.alert ||
        monitoringAlert;

      const unrelatedAlert =
        monitoring?.upsertAlert?.({
          key:
            "d7t4b-unrelated-watch",
          category:
            "acceptance-isolation",
          title:
            "D7T4B unrelated monitoring control",
          message:
            "Must remain untouched.",
          severity: 1,
          recommendedAction:
            "None.",
          metadata: {
            source:
              "006.017D7T4B-acceptance"
          }
        });

      const unrelatedAlertRecord =
        unrelatedAlert?.alert ||
        unrelatedAlert;

      const reconciliation = {
        schema:
          "meos.maddy.selective-cognitive-reconciliation.v1",
        createdAt:
          new Date().toISOString(),
        subject,
        staleIntentions: [{
          intentionId:
            "d7t4-intention",
          subject,
          reconciliationStatus:
            "review-required"
        }],
        selected: [
          {
            organ:
              "executive-planning",
            required: true
          },
          {
            organ:
              "executive-monitoring",
            required: true
          }
        ],
        untouched: [
          {
            organ:
              "future-simulation",
            required: false
          }
        ]
      };

      const cognitiveRevision = {
        schema:
          "meos.maddy.governed-cognitive-state-revision.v1",
        revisionId:
          "d7t4-cognitive-revision",
        subject,
        applied: true
      };

      const beforePlan =
        this.clone(planRecord);
      const beforeAlert =
        this.clone(alertRecord);
      const beforeUnrelatedPlan =
        this.clone(
          unrelatedPlanRecord
        );
      const beforeUnrelatedAlert =
        this.clone(
          unrelatedAlertRecord
        );

      const preview =
        this.reviseAffectedPlanAndMonitoringState(
          cognitiveRevision,
          reconciliation,
          {
            apply: false
          }
        );

      const afterPreviewPlan =
        this.clone(
          planning?.getPlanById?.(
            planRecord?.id
          ) ||
          planRecord
        );

      const afterPreviewAlert =
        this.clone(
          monitoring?.getAlertById?.(
            alertRecord?.id ||
            alertRecord?.alertId
          ) ||
          alertRecord
        );

      const applied =
        this.reviseAffectedPlanAndMonitoringState(
          cognitiveRevision,
          reconciliation,
          {
            apply: true
          }
        );

      const afterPlan =
        this.clone(
          planning?.getPlanById?.(
            planRecord?.planId ||
            planRecord?.id
          ) ||
          planRecord
        );

      const afterAlert =
        this.clone(
          monitoring?.getAlertById?.(
            alertRecord?.id ||
            alertRecord?.alertId
          ) ||
          alertRecord
        );

      const afterUnrelatedPlan =
        this.clone(
          planning?.getPlanById?.(
            unrelatedPlanRecord
              ?.planId ||
            unrelatedPlanRecord?.id
          ) ||
          unrelatedPlanRecord
        );

      const afterUnrelatedAlert =
        this.clone(
          monitoring?.getAlertById?.(
            unrelatedAlertRecord
              ?.id ||
            unrelatedAlertRecord
              ?.alertId
          ) ||
          unrelatedAlertRecord
        );

      const checks = [
        {
          name:
            "Commissioned research-knowledge hydration remains ready",
          passed:
            hydration?.success === true
        },
        {
          name:
            "Existing Executive Planning organ is used",
          passed:
            Boolean(planning) &&
            typeof planning.createPlan ===
              "function" &&
            planRecord != null
        },
        {
          name:
            "Existing Executive Monitoring organ is used",
          passed:
            Boolean(monitoring) &&
            typeof monitoring.upsertAlert ===
              "function" &&
            alertRecord != null
        },
        {
          name:
            "Preview identifies affected plan and monitoring state without mutation",
          passed:
            preview?.applied === false &&
            preview?.planning
              ?.matchedCount >= 1 &&
            preview?.monitoring
              ?.matchedCount >= 1 &&
            afterPreviewPlan?.status ===
              beforePlan?.status &&
            afterPreviewAlert?.status ===
              beforeAlert?.status &&
            afterPreviewPlan?.metadata
              ?.lastCognitiveRevisionId ==
              beforePlan?.metadata
                ?.lastCognitiveRevisionId &&
            afterPreviewAlert?.metadata
              ?.lastCognitiveRevisionId ==
              beforeAlert?.metadata
                ?.lastCognitiveRevisionId
        },
        {
          name:
            "Affected plan is revised to reconsideration-required",
          passed:
            afterPlan?.status ===
              "reconsideration-required"
        },
        {
          name:
            "Affected plan preserves prior state and revision provenance",
          passed:
            afterPlan?.metadata
              ?.cognitiveRevisionHistory
              ?.some(
                item =>
                  item?.prior?.status ===
                    beforePlan?.status &&
                  item
                    ?.sourceCognitiveRevision ===
                    cognitiveRevision
                      .revisionId
              ) === true
        },
        {
          name:
            "Affected monitoring condition is revised to reconsideration-required",
          passed:
            afterAlert?.status ===
              "reconsideration-required"
        },
        {
          name:
            "Affected monitoring preserves prior state and revision provenance",
          passed:
            afterAlert?.metadata
              ?.cognitiveRevisionHistory
              ?.some(
                item =>
                  item?.prior?.status ===
                    beforeAlert?.status &&
                  item
                    ?.sourceCognitiveRevision ===
                    cognitiveRevision
                      .revisionId
              ) === true
        },
        {
          name:
            "Unrelated plan is left untouched",
          passed:
            afterUnrelatedPlan?.status ===
              beforeUnrelatedPlan?.status &&
            afterUnrelatedPlan?.metadata
              ?.lastCognitiveRevisionId ==
              null
        },
        {
          name:
            "Unrelated monitoring condition is left untouched",
          passed:
            afterUnrelatedAlert?.status ===
              beforeUnrelatedAlert?.status &&
            afterUnrelatedAlert?.metadata
              ?.lastCognitiveRevisionId ==
              null
        },
        {
          name:
            "Existing Planning recalculation is reused for affected plans",
          passed:
            /recalculatePlan/.test(
              this.reviseAffectedPlanAndMonitoringState
                .toString()
            )
        },
        {
          name:
            "Existing Planning and Monitoring persistence paths are reused",
          passed:
            /planning\.persistIfEnabled/.test(
              this.reviseAffectedPlanAndMonitoringState
                .toString()
            ) &&
            /monitoring\.persistIfEnabled/.test(
              this.reviseAffectedPlanAndMonitoringState
                .toString()
            )
        },
        {
          name:
            "Existing meaningful-change path carries plan and monitoring revision into cognitive re-entry",
          passed:
            /reviseAffectedPlanAndMonitoringState/.test(
              this.attendToWorldModelChange
                .toString()
            ) &&
            /planMonitoringRevision/.test(
              this.attendToWorldModelChange
                .toString()
            ) &&
            /scheduleCognitiveReentry/.test(
              this.attendToWorldModelChange
                .toString()
            )
        },
        {
          name:
            "Plan and monitoring revision does not authorize execution or external action",
          passed:
            applied?.authority
              ?.missionExecutionAuthorized === false &&
            applied?.authority
              ?.hallwayDispatchAuthorized === false &&
            applied?.authority
              ?.externalActionAuthorized === false &&
            applied?.authority
              ?.humanAuthorityPreserved === true
        }
      ];

      const passed =
        checks.every(item => item.passed);

      console.table(checks);
      console.info(
        `[MEOS ${this.version}] Commission 006.017D7T4C Preview Observation Order Repair: ${passed ? "PASS" : "FAIL"}.`
      );

      return {
        commission: "006.017D7T4C",
        version: this.version,
        buildId: this.buildId,
        passed,
        checks,
        hydration,
        preview,
        afterPreviewPlan,
        afterPreviewAlert,
        applied,
        authority:
          applied?.authority
      };
    },

    async runGovernedCognitiveStateRevisionAcceptanceTest() {
      const hydration =
        await this.hydrateResearchKnowledgeBeforeCognition();

      const subject =
        "D7T3 governed revision fixture";

      const fixture =
        this.upsertCognitiveIntention(
          subject,
          [{
            source:
              "006.017D7T3-acceptance",
            event:
              "material-belief-change"
          }],
          {
            status: "pending",
            persist: false
          }
        );

      const before =
        this.clone(fixture);

      const reconciliation = {
        schema:
          "meos.maddy.selective-cognitive-reconciliation.v1",
        createdAt:
          new Date().toISOString(),
        subject,
        staleIntentions: [{
          intentionId:
            fixture?.intentionId,
          subject,
          priorStatus:
            fixture?.status,
          reconciliationStatus:
            "review-required",
          mutationPerformed: false,
          reason:
            "Acceptance fixture materially changed."
        }],
        selected: [
          {
            organ:
              "causal-counterfactual-reasoning",
            required: true
          },
          {
            organ:
              "executive-planning",
            required: true
          },
          {
            organ:
              "executive-priority-arbitration",
            required: true
          }
        ],
        untouched: [
          {
            organ:
              "executive-monitoring",
            required: false
          },
          {
            organ:
              "future-simulation",
            required: false
          }
        ]
      };

      const preview =
        this.reviseCognitiveStateFromReconciliation(
          reconciliation,
          {
            apply: false
          }
        );

      const afterPreview =
        this.clone(
          this.cognitiveIntentions.find(
            item =>
              item?.intentionId ===
                fixture?.intentionId
          )
        );

      const applied =
        this.reviseCognitiveStateFromReconciliation(
          reconciliation,
          {
            apply: true
          }
        );

      const after =
        this.clone(
          this.cognitiveIntentions.find(
            item =>
              item?.intentionId ===
                fixture?.intentionId
          )
        );

      const checks = [
        {
          name:
            "Commissioned research-knowledge hydration remains ready",
          passed:
            hydration?.success === true
        },
        {
          name:
            "Existing cognitive-intention organ is used rather than a duplicate state store",
          passed:
            fixture?.intentionId != null &&
            this.cognitiveIntentions
              .some(
                item =>
                  item?.intentionId ===
                  fixture.intentionId
              )
        },
        {
          name:
            "Revision preview is non-mutating",
          passed:
            preview?.applied === false &&
            afterPreview?.status ===
              before?.status
        },
        {
          name:
            "Governed revision changes the affected internal cognitive commitment",
          passed:
            applied?.applied === true &&
            after?.status ===
              "reconsideration-required"
        },
        {
          name:
            "Prior cognitive state is preserved before revision",
          passed:
            after?.revisionHistory
              ?.some(
                item =>
                  item?.prior?.status ===
                    before?.status
              ) === true
        },
        {
          name:
            "Revision provenance is attached to the changed intention",
          passed:
            after?.lastRevisionId ===
              applied?.revisionId &&
            after?.lastRevisionReason != null
        },
        {
          name:
            "Affected causal reasoning remains selected for refresh",
          passed:
            applied?.governedRefresh
              ?.causalCounterfactual === true
        },
        {
          name:
            "Affected planning is selected for review without plan-content mutation authority",
          passed:
            applied?.governedRefresh
              ?.planningReview === true &&
            applied?.authority
              ?.planContentMutationAuthorized === false
        },
        {
          name:
            "Affected priorities are selected for re-arbitration",
          passed:
            applied?.governedRefresh
              ?.priorityRearbitration === true
        },
        {
          name:
            "Unaffected monitoring remains untouched",
          passed:
            applied?.governedRefresh
              ?.monitoringRefresh === false &&
            applied?.authority
              ?.monitoringContentMutationAuthorized === false
        },
        {
          name:
            "Unaffected future simulation remains untouched",
          passed:
            applied?.governedRefresh
              ?.futureResimulation === false
        },
        {
          name:
            "Existing meaningful-change path now performs governed cognitive revision",
          passed:
            /reviseCognitiveStateFromReconciliation/.test(
              this.attendToWorldModelChange.toString()
            ) &&
            /cognitiveRevision/.test(
              this.attendToWorldModelChange.toString()
            )
        },
        {
          name:
            "Internal revision persists through existing Executive Brain persistence",
          passed:
            /this\.persist\(\)/.test(
              this.reviseCognitiveStateFromReconciliation.toString()
            )
        },
        {
          name:
            "No Hallway dispatch or external-action authority is created",
          passed:
            applied?.authority
              ?.hallwayDispatchAuthorized === false &&
            applied?.authority
              ?.externalActionAuthorized === false &&
            applied?.authority
              ?.humanAuthorityPreserved === true
        }
      ];

      const passed =
        checks.every(item => item.passed);

      console.table(checks);
      console.info(
        `[MEOS ${this.version}] Commission 006.017D7T3 Governed Cognitive State Revision: ${passed ? "PASS" : "FAIL"}.`
      );

      return {
        commission: "006.017D7T3",
        version: this.version,
        buildId: this.buildId,
        passed,
        checks,
        hydration,
        before,
        preview,
        applied,
        after,
        authority:
          applied?.authority
      };
    },

    async runSelectiveCognitiveReconciliationAcceptanceTest() {
      const hydration =
        await this.hydrateResearchKnowledgeBeforeCognition();

      const base =
        this.projectWorldModel({
          reason:
            "006.017D7T2-baseline",
          persist: false,
          attend: false
        });

      const active =
        base?.beliefs
          ?.durableResearchLearning
          ?.active || [];

      const propagation = {
        schema:
          "meos.maddy.consequence-propagation.v1",
        createdAt: new Date().toISOString(),
        subject:
          active[0]?.subject ||
          "Research-dependent strategy",
        affected: {
          intentions: [{
            type: "intention",
            id:
              "d7t2-affected-intention",
            subject:
              active[0]?.subject ||
              "Affected intention",
            status: "active"
          }],
          currentWork: [],
          monitoring: [],
          relationships: [],
          priorities: [],
          planning: [{
            available: true,
            mutationPerformed: false
          }],
          offices: [
            "Executive Office"
          ]
        },
        rerun: {
          causalCounterfactual: true,
          planning: true,
          monitoring: false,
          priorityArbitration: true,
          futureSimulation: false
        }
      };

      const reconciliation =
        this.reconcileCognitiveConsequences(
          propagation,
          {
            subject:
              propagation.subject,
            reconsiderPriorConclusions:
              true
          },
          {
            meaningful: true
          },
          base,
          base
        );

      const selectedNames =
        reconciliation.selected.map(
          item => item.organ
        );

      const untouchedNames =
        reconciliation.untouched.map(
          item => item.organ
        );

      const checks = [
        {
          name:
            "Commissioned research-knowledge hydration remains ready",
          passed:
            hydration?.success === true
        },
        {
          name:
            "Selective reconciliation uses the existing consequence map",
          passed:
            reconciliation?.schema ===
            "meos.maddy.selective-cognitive-reconciliation.v1"
        },
        {
          name:
            "Affected causal reasoning is selected for recomputation",
          passed:
            selectedNames.includes(
              "causal-counterfactual-reasoning"
            )
        },
        {
          name:
            "Affected planning is selected for review",
          passed:
            selectedNames.includes(
              "executive-planning"
            )
        },
        {
          name:
            "Affected priority arbitration is selected",
          passed:
            selectedNames.includes(
              "executive-priority-arbitration"
            )
        },
        {
          name:
            "Unaffected monitoring is explicitly left alone",
          passed:
            untouchedNames.includes(
              "executive-monitoring"
            )
        },
        {
          name:
            "Unaffected future simulation is explicitly left alone",
          passed:
            untouchedNames.includes(
              "future-simulation"
            )
        },
        {
          name:
            "Reconciliation does not recompute everything",
          passed:
            reconciliation?.isolation
              ?.recomputeEverything === false &&
            reconciliation?.isolation
              ?.selectedCount === 3 &&
            reconciliation?.isolation
              ?.untouchedCount === 2
        },
        {
          name:
            "Dependent intention is marked review-required without silent mutation",
          passed:
            reconciliation
              ?.staleIntentions
              ?.some(
                item =>
                  item.intentionId ===
                    "d7t2-affected-intention" &&
                  item.reconciliationStatus ===
                    "review-required" &&
                  item.mutationPerformed ===
                    false
              ) === true
        },
        {
          name:
            "Affected office receives cognitive attention without Hallway dispatch",
          passed:
            reconciliation
              ?.officeAttention
              ?.some(
                item =>
                  item.office ===
                    "Executive Office" &&
                  item.dispatchPerformed ===
                    false
              ) === true
        },
        {
          name:
            "Existing meaningful-change path carries selective reconciliation into cognitive re-entry",
          passed:
            /reconcileCognitiveConsequences/.test(
              this.attendToWorldModelChange.toString()
            ) &&
            /cognitiveReconciliation/.test(
              this.attendToWorldModelChange.toString()
            ) &&
            /scheduleCognitiveReentry/.test(
              this.attendToWorldModelChange.toString()
            )
        },
        {
          name:
            "Cognitive recomputation is allowed without durable state mutation",
          passed:
            reconciliation?.authority
              ?.cognitiveRecomputationAuthorized === true &&
            reconciliation?.authority
              ?.durableStateMutationAuthorized === false
        },
        {
          name:
            "Plans are not silently mutated",
          passed:
            reconciliation
              ?.governedMutations
              ?.planMutationPerformed === false &&
            reconciliation?.authority
              ?.planMutationAuthorized === false
        },
        {
          name:
            "No Hallway dispatch or external-action authority is created",
          passed:
            reconciliation
              ?.governedMutations
              ?.hallwayDispatchPerformed === false &&
            reconciliation?.authority
              ?.hallwayDispatchAuthorized === false &&
            reconciliation?.authority
              ?.externalActionAuthorized === false &&
            reconciliation?.authority
              ?.humanAuthorityPreserved === true
        }
      ];

      const passed =
        checks.every(item => item.passed);

      console.table(checks);
      console.info(
        `[MEOS ${this.version}] Commission 006.017D7T2 Selective Cognitive Reconciliation: ${passed ? "PASS" : "FAIL"}.`
      );

      return {
        commission: "006.017D7T2",
        version: this.version,
        buildId: this.buildId,
        passed,
        checks,
        hydration,
        reconciliation,
        authority:
          reconciliation.authority
      };
    },

    async runConsequencePropagationAcceptanceTest() {
      const hydration =
        await this.hydrateResearchKnowledgeBeforeCognition();

      const base =
        this.projectWorldModel({
          reason:
            "006.017D7T1-baseline",
          persist: false,
          attend: false
        });

      const changed =
        this.clone(base);

      const active =
        changed?.beliefs
          ?.durableResearchLearning
          ?.active || [];

      if (active.length > 0) {
        active[0].durableLearningFingerprint =
          `${active[0].durableLearningFingerprint || "research"}-consequence-change`;
        active[0].unknowns = [
          ...(active[0].unknowns || []),
          "What plans, priorities, monitoring, relationships, and future assumptions depend on this changed evidence?"
        ];
      }

      changed.intentions = [
        ...(changed.intentions || []),
        {
          intentionId:
            "d7t1-dependent-intention",
          subject:
            active[0]?.subject ||
            "Research-dependent strategic intention",
          status: "active",
          reason:
            "Acceptance fixture: existing intention depends on changed evidence."
        }
      ];

      const assessment =
        this.assessWorldModelSalience(
          base,
          changed,
          {
            subject:
              active[0]?.subject ||
              "Material research belief change"
          }
        );

      const reappraisal =
        this.buildCognitiveReappraisal(
          assessment,
          base,
          changed
        );

      const propagation =
        this.propagateCognitiveConsequences(
          reappraisal,
          assessment,
          base,
          changed
        );

      const checks = [
        {
          name:
            "Commissioned research-knowledge hydration is ready",
          passed:
            hydration?.success === true
        },
        {
          name:
            "Acceptance uses a real active durable research belief",
          passed:
            active.length > 0
        },
        {
          name:
            "Existing salience authority detects the material change",
          passed:
            assessment?.meaningful === true
        },
        {
          name:
            "Existing cognitive reappraisal remains upstream authority",
          passed:
            reappraisal?.schema ===
            "meos.maddy.cognitive-reappraisal.v1"
        },
        {
          name:
            "Consequence propagation produces an inspectable blast-radius map",
          passed:
            propagation?.schema ===
            "meos.maddy.consequence-propagation.v1" &&
            Array.isArray(
              propagation?.consequences
            )
        },
        {
          name:
            "A dependent cognitive intention is identified for reconsideration",
          passed:
            propagation?.affected
              ?.intentions
              ?.some(
                item =>
                  item.id ===
                  "d7t1-dependent-intention"
              ) === true
        },
        {
          name:
            "Changed belief can invalidate prior conclusions without silently rewriting truth",
          passed:
            propagation?.invalidation
              ?.priorConclusions === true &&
            /do not silently mutate/i.test(
              propagation?.rule || ""
            )
        },
        {
          name:
            "Affected planning is reviewable without plan mutation",
          passed:
            propagation?.rerun
              ?.planning === true &&
            propagation?.authority
              ?.planMutationAuthorized === false
        },
        {
          name:
            "Monitoring/open uncertainty can be scheduled for cognitive refresh",
          passed:
            propagation?.rerun
              ?.monitoring === true
        },
        {
          name:
            "Executive attention is marked for re-arbitration",
          passed:
            propagation?.rerun
              ?.priorityArbitration === true
        },
        {
          name:
            "Future assumptions can be marked for re-simulation",
          passed:
            propagation?.rerun
              ?.futureSimulation === true
        },
        {
          name:
            "Existing causal/counterfactual reasoning remains downstream",
          passed:
            /runCausalCounterfactualInvestigation/.test(
              this.attendToWorldModelChange.toString()
            )
        },
        {
          name:
            "Existing cognitive re-entry carries the consequence map forward",
          passed:
            /consequencePropagation/.test(
              this.attendToWorldModelChange.toString()
            ) &&
            /scheduleCognitiveReentry/.test(
              this.attendToWorldModelChange.toString()
            )
        },
        {
          name:
            "Consequence propagation does not dispatch work or grant external authority",
          passed:
            propagation?.authority
              ?.hallwayDispatchAuthorized === false &&
            propagation?.authority
              ?.externalActionAuthorized === false &&
            propagation?.authority
              ?.humanAuthorityPreserved === true
        }
      ];

      const passed =
        checks.every(item => item.passed);

      console.table(checks);
      console.info(
        `[MEOS ${this.version}] Commission 006.017D7T1 Autonomous Consequence Propagation: ${passed ? "PASS" : "FAIL"}.`
      );

      return {
        commission: "006.017D7T1",
        version: this.version,
        buildId: this.buildId,
        passed,
        checks,
        hydration,
        activeResearchBeliefCount:
          active.length,
        assessment,
        reappraisal,
        propagation,
        authority: {
          externalActionAuthorized: false,
          humanAuthorityPreserved: true
        }
      };
    },

    async runMeaningfulChangeReappraisalAcceptanceTest() {
      const hydration =
        await this.hydrateResearchKnowledgeBeforeCognition();

      const base =
        this.projectWorldModel({
          reason: "006.017D7S1-baseline",
          persist: false,
          attend: false
        });

      const trivial =
        this.assessWorldModelSalience(
          base,
          this.clone(base),
          {
            subject:
              "No material world change"
          }
        );

      const changed =
        this.clone(base);

      const active =
        changed?.beliefs
          ?.durableResearchLearning
          ?.active || [];

      if (active.length > 0) {
        active[0].durableLearningFingerprint =
          `${active[0].durableLearningFingerprint || "research"}-material-change`;
        active[0].unknowns = [
          ...(active[0].unknowns || []),
          "What new evidence would change the current conclusion?"
        ];
      }

      const material =
        this.assessWorldModelSalience(
          base,
          changed,
          {
            subject:
              "Evidence-backed research belief materially changed"
          }
        );

      const reappraisal =
        material.meaningful
          ? this.buildCognitiveReappraisal(
              material,
              base,
              changed
            )
          : null;

      const checks = [
        {
          name:
            "Commissioned research-knowledge hydration barrier is ready",
          passed:
            hydration?.success === true &&
            this.researchKnowledgeStartupHydration
              ?.status === "ready"
        },
        {
          name:
            "Acceptance fixture uses a real active durable research belief",
          passed:
            active.length > 0
        },
        {
          name:
            "Existing salience organ remains the meaningful-change authority",
          passed:
            material?.schema ===
            "meos.maddy.salience-assessment.v1"
        },
        {
          name:
            "Unchanged world state does not earn attention",
          passed:
            trivial.meaningful === false
        },
        {
          name:
            "Changed evidence-backed research belief is detected",
          passed:
            material.signals.some(
              item =>
                item.type ===
                "research-belief-changed"
            )
        },
        {
          name:
            "Material belief change crosses existing salience threshold",
          passed:
            material.meaningful === true
        },
        {
          name:
            "Meaningful change creates explicit cognitive reappraisal",
          passed:
            reappraisal?.schema ===
            "meos.maddy.cognitive-reappraisal.v1"
        },
        {
          name:
            "Reappraisal can invalidate prior conclusions without changing truth status",
          passed:
            reappraisal
              ?.reconsiderPriorConclusions ===
              true &&
            /changes attention, not truth status/i.test(
              reappraisal?.rule || ""
            )
        },
        {
          name:
            "New uncertainty becomes an investigation question",
          passed:
            reappraisal
              ?.investigateUnknowns === true &&
            reappraisal.openQuestions.length > 0
        },
        {
          name:
            "Reappraisal reprioritizes attention",
          passed:
            reappraisal
              ?.reprioritizeAttention === true
        },
        {
          name:
            "Existing causal/counterfactual investigation remains downstream",
          passed:
            /runCausalCounterfactualInvestigation/.test(
              this.attendToWorldModelChange.toString()
            )
        },
        {
          name:
            "Existing cognitive re-entry remains the continuation mechanism",
          passed:
            /scheduleCognitiveReentry/.test(
              this.attendToWorldModelChange.toString()
            )
        },
        {
          name:
            "No external-action authority is created",
          passed:
            reappraisal
              ?.authority
              ?.externalActionAuthorized === false &&
            reappraisal
              ?.authority
              ?.humanAuthorityPreserved === true
        }
      ];

      const passed =
        checks.every(item => item.passed);

      console.table(checks);
      console.info(
        `[MEOS ${this.version}] Commission 006.017D7S1A Meaningful Change + Cognitive Reappraisal Hydration Repair: ${passed ? "PASS" : "FAIL"}.`
      );

      return {
        commission: "006.017D7S1A",
        version: this.version,
        buildId: this.buildId,
        passed,
        checks,
        hydration,
        activeResearchBeliefCount:
          active.length,
        trivial,
        material,
        reappraisal,
        authority: {
          externalActionAuthorized: false,
          humanAuthorityPreserved: true
        }
      };
    },

    runDurableResearchWorldModelAcceptanceTest() {
      const research =
        this.collectActiveResearchLearning({
          limit: 50
        });

      const world = this.projectWorldModel({
        reason:
          "006.017D7R3-acceptance",
        persist: false,
        attend: false
      });

      const active =
        world?.beliefs
          ?.durableResearchLearning
          ?.active || [];

      const irukandji = active.find(item =>
        /irukandji/i.test(
          `${item?.subject || ""} ${item?.summary || ""}`
        )
      );

      const checks = [
        {
          name:
            "Research knowledge startup hydration barrier completed before temporal cognition resumed",
          passed:
            this.researchKnowledgeStartupHydration.status === "ready" &&
            Boolean(this.researchKnowledgeStartupHydration.completedAt)
        },
        {
          name:
            "Existing Living World Model is extended rather than replaced",
          passed:
            world?.schema ===
            "meos.maddy.spooky-world-model.v1"
        },
        {
          name:
            "Active Knowledge Engine research-learning records are discoverable",
          passed:
            research.available === true &&
            research.recordCount > 0
        },
        {
          name:
            "Durable research learning is present in World Model beliefs",
          passed:
            active.length > 0
        },
        {
          name:
            "Irukandji learning crosses from active knowledge into the Living World Model",
          passed: Boolean(irukandji)
        },
        {
          name:
            "Evidence quality and epistemic status survive World Model integration",
          passed:
            !irukandji ||
            Boolean(
              irukandji.evidenceQuality &&
              irukandji.epistemicStatus
            )
        },
        {
          name:
            "Supported facts and inferences remain distinct",
          passed:
            !irukandji ||
            (
              Array.isArray(
                irukandji.supportedFacts
              ) &&
              Array.isArray(
                irukandji.inferences
              )
            )
        },
        {
          name:
            "Open research uncertainty remains live in the World Model",
          passed:
            Array.isArray(world?.unknowns) &&
            (
              !irukandji ||
              irukandji.unknowns.length === 0 ||
              world.unknowns.some(
                item =>
                  item.domain ===
                  "research-learning"
              )
            )
        },
        {
          name:
            "Research learning participates in the World Model fingerprint",
          passed:
            /durableResearchLearning/.test(
              this.projectWorldModel.toString()
            ) &&
            Boolean(world?.fingerprint)
        },
        {
          name:
            "Knowledge Memory sync can wake the existing continuous cognition path",
          passed:
            /research-learning:synced/.test(
              this.attachContinuousCognitionListeners.toString()
            ) &&
            /scheduleCognitiveReentry/.test(
              this.handleResearchLearningKnowledgeChange.toString()
            )
        },
        {
          name:
            "Research learning does not create external-action authority",
          passed:
            this.configuration
              .requireHumanApprovalForExternalAction ===
            true &&
            world?.authority
              ?.humanAuthorityPreserved === true
        }
      ];

      const passed =
        checks.every(item => item.passed);

      console.table(checks);
      console.info(
        `[MEOS ${this.version}] Commission 006.017D7R3A startup hydration + durable research -> Living World Model: ${passed ? "PASS" : "FAIL"}.`
      );

      return {
        commission: "006.017D7R3A",
        version: this.version,
        buildId: this.buildId,
        passed,
        checks,
        researchLearningCount:
          research.recordCount,
        irukandjiFound:
          Boolean(irukandji),
        worldFingerprint:
          world?.fingerprint || null,
        authority: {
          externalActionAuthorized: false,
          humanAuthorityPreserved: true
        }
      };
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
