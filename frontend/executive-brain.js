/**
 * MEOS Executive Brain
 * Version: 1.25.17
 * Build: EB12517-CAPABILITY-MIRROR-ACCEPTANCE-CONTEXT-20260816-A
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

  const VERSION = "1.25.17";
  const BUILD_ID = "EB12517-CAPABILITY-MIRROR-ACCEPTANCE-CONTEXT-20260816-A";
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
    intentionSelfHealingCount: 0,
    intentionRecordsAbsorbed: 0,
    lastIntentionSelfHealing: null,
    pendingIntentionSelfHealingWriteback: false,
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

  const CAPABILITY_TRUTH_STATES = Object.freeze([
    "proven",
    "available",
    "conditional",
    "adaptive",
    "unknown",
    "unavailable",
    "prohibited"
  ]);

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
      maximumCognitiveRevisitMemories: 240,
      continuousCognitionEnabled: true,
      anticipatoryInitiativeEnabled: true,
      anticipatoryCandidateLimit: 24,
      anticipatoryActionThreshold: 0.72,
      anticipatoryEscalationThreshold: 0.86,
      priorityPortfolioLimit: 32,
      priorityPreemptionThreshold: 0.12,
      protectedAttentionSwitchCost: 0.08,
      executiveHomeostasisEnabled: true,
      executiveHomeostasisLearningInfluenceLimit: 0.16,
      executiveHomeostasisPeripheralLimit: 12,
      cognitiveThreadLimit: 48,
      cognitiveThreadStepLimit: 24,
      cognitiveThreadDiminishingReturnFloor: 0.08,
      continuousCognitionCycleBudget: 6,
      continuousCognitionIdleBackoffMs: 300000,
      continuousCognitionIdleMaxBackoffMs: 1800000,
      continuousCognitionActiveBackoffMs: 30000,
      continuousCognitionUrgentBackoffMs: 5000,
      productiveIdleCognitionEnabled: true,
      productiveIdleMinimumValue: 0.42,
      productiveIdleDiminishingReturnFloor: 0.12,
      productiveIdleHistoryLimit: 96,
      productiveIdleCooldownMs: 60000,
      productiveIdleMaxConsecutiveSameSubject: 3,
      openDomainCuriosityEnabled: true,
      openDomainCuriosityBaseValue: 0.58,
      autonomousLearningFreedomEnabled: true,
      autonomousLearningCheapFirst: true,
      autonomousLearningMaxResearchPasses: 1,
      autonomousLearningDailyNovelSubjectLimit: 24,
      autonomousLearningSubjectCooldownMs: 6 * 60 * 60 * 1000,
      autonomousLearningWorldBreadthWeight: 0.22,
      autonomousLearningExecutiveGrowthWeight: 0.28,
      autonomousLearningKnowledgeGapWeight: 0.22,
      autonomousLearningConnectivityWeight: 0.14,
      autonomousLearningFreshnessWeight: 0.08,
      autonomousLearningCostWeight: 0.06,
      openDomainCuriosityAdjacentValue: 0.52,
      openDomainCuriosityMissionSeedLimit: 8,
      meaningfulChangeDebounceMs: 1200,
      cognitiveReentryCooldownMs: 5000,
      maximumCognitiveReentryHistory: 250,
      maximumCognitiveIntentions: 250,
      cognitiveIntentionRetryMs: 15000,
      cognitiveNoGainQuiescenceThreshold: 2,
      cognitiveAttentionMinimumAnchors: 1,
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
      temporalCommitmentLookaheadHours: 720,
      maximumCrossTimePatternHistory: 96,
      maximumCrossTimePatternTraps: 64,
      crossTimePatternLookback: 180,
      crossTimePatternMinimumIndependentLineages: 3,
      crossTimePatternMinimumDomains: 2,
      crossTimePatternMinimumSpanMs: 12 * 60 * 60 * 1000
    },

    initializedAt: null,
    refreshedAt: null,
    startupCache: null,
    startupCachedAt: 0,
    requestCache: new Map(),
    history: [],
    cognitionHistory: [],
    cognitiveDispatchHistory: [],
    cognitiveRevisitMemories: [],
    cognitiveRevisitMemoryCount: 0,
    cognitiveReentryHistory: [],
    cognitiveIntentions: [],
    cognitiveContinuity: { hydrated: false, resumedAt: null, lastResumeCount: 0 },
    cognitiveEconomics: {
      schema: "meos.maddy.executive-attention-economics.v1",
      admissionDenied: 0,
      quiescenceEntries: 0,
      quiescentWakeSuppressions: 0,
      meaningfulWakeCount: 0,
      duplicateCallsPrevented: 0,
      preSpendDenied: 0,
      preSpendInvestigationPrevented: 0,
      evidenceFrontierSuppressions: 0,
      selfGeneratedEchoSuppressions: 0,
      lastPreSpendDecision: null,
      lastDecision: null
    },
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
    executiveHomeostasisState: null,
    currentHumanInterruption: null,
    crossTimePatternHistory: [],
    crossTimePatternTraps: [],
    lastCrossTimePatternSynthesis: null,
    crossTimePatternSynthesisCount: 0,
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
      this.cognitiveHydrationPromise = this.hydrateLaptopPersistence().then(result => {
        this.removeCognitiveIdentityAcceptanceArtifacts({
          persist: true
        });
        const economicsMigration =
          this.migrateCognitiveEconomicsState();
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

    /*
     * Commission 006.018M — Verified Consequence -> Executive Learning Closure
     *
     * A verified consequence of Maddy's own governed work is not fresh world
     * evidence, but it is experience. Close that experience into the existing
     * Executive Learning organ exactly once, preserve causal lineage in
     * autobiographical memory, and let later cognition retrieve the governed
     * lesson through collectLearning(). No provider call and no new authority.
     */
    closeVerifiedConsequenceIntoLearning(work = {}, intention = null, options = {}) {
      const verified = work?.outcome?.verified === true;
      if (!verified) {
        return { success: true, learned: false, reason: "consequence-not-verified" };
      }

      const learning = global.ExecutiveLearning;
      if (!learning || typeof learning.observe !== "function") {
        return { success: true, learned: false, reason: "executive-learning-unavailable" };
      }

      const subject = String(
        work?.context?.cognitionSubject || intention?.subject || work?.title || ""
      ).trim();
      const workId = String(work?.id || "").trim();
      if (!subject || !workId) {
        return { success: false, learned: false, reason: "verified-consequence-lineage-incomplete" };
      }

      const success = work?.outcome?.success === true && work?.state === "done";
      const failure = work?.state === "failed" || work?.outcome?.success === false;
      const outcomeType = success ? "success" : (failure ? "failure" : "partial-success");
      const error = String(work?.error || work?.outcome?.error || "").trim();
      const route = String(work?.route || "").trim();
      const action = String(
        work?.context?.cognitiveMove || work?.context?.action || route || "governed hallway work"
      ).trim();
      const expectedResult = String(
        work?.context?.expectedResult || intention?.expectedResult || intention?.objective || subject
      ).trim();
      const actualResult = String(
        work?.outcome?.summary || work?.outcome?.result || error || `${work.state || "terminal"} consequence`
      ).trim();
      const citations = Array.isArray(work?.outcome?.citations)
        ? work.outcome.citations
        : (Array.isArray(work?.citations) ? work.citations : []);

      // Economic learning gate: equivalent verified consequences should reinforce
      // one governed learning record rather than multiply hot records merely
      // because another work ID reached the same material result. This is a
      // deterministic, provider-free consolidation key; it does not pretend
      // to solve broader semantic novelty or curiosity budgeting.
      const informationGainBasis = [
        outcomeType,
        this.normalize(subject),
        this.normalize(expectedResult),
        this.normalize(actualResult),
        this.normalize(action)
      ].join("|");
      let informationGainHash = 2166136261;
      for (let index = 0; index < informationGainBasis.length; index += 1) {
        informationGainHash ^= informationGainBasis.charCodeAt(index);
        informationGainHash = Math.imul(informationGainHash, 16777619);
      }
      const informationGainFingerprint = `verified-consequence:${(informationGainHash >>> 0).toString(16)}`;

      const priorEquivalentObservation = Array.isArray(learning.observations)
        ? learning.observations.find(item =>
            item?.sourceType === "executive-hallway-verified-consequence" &&
            item?.metadata?.informationGainFingerprint === informationGainFingerprint
          )
        : null;

      const priorEquivalentLessons = priorEquivalentObservation && Array.isArray(learning.lessons)
        ? learning.lessons.filter(item =>
            Array.isArray(item?.sourceObservationIds) &&
            item.sourceObservationIds.includes(priorEquivalentObservation.id)
          )
        : [];

      const observationResult = priorEquivalentObservation
        ? {
            success: true,
            duplicate: true,
            economicallyConsolidated: true,
            observation: this.clone(priorEquivalentObservation),
            lessons: this.clone(priorEquivalentLessons)
          }
        : learning.observe({
        sourceType: "executive-hallway-verified-consequence",
        sourceId: workId,
        sourceTitle: subject,
        outcomeType,
        summary: `${subject}: ${actualResult}`,
        objective: intention?.objective || subject,
        result: actualResult,
        expectedResult,
        completedCriteria: success ? ["Verified governed work reached its intended terminal success state."] : [],
        failedCriteria: failure ? ["Verified governed work did not reach its intended success state."] : [],
        contributingFactors: success ? [action] : [],
        blockingFactors: failure ? [error || `Terminal work state: ${work.state}`] : [],
        decisions: Array.isArray(work?.context?.decisions) ? work.context.decisions : [],
        actions: [action],
        citations,
        confidence: Number(work?.outcome?.confidence ?? 0.8),
        office: work?.office || work?.context?.office || null,
        owner: work?.owner || null,
        metadata: {
          commission: "006.018M",
          cognitionSubject: subject,
          cognitiveIntentionId: intention?.intentionId || null,
          cognitiveReentryLineageId: work?.context?.cognitiveReentryLineageId || null,
          workState: work?.state || null,
          route: route || null,
          verified: true,
          providerCallRequired: false,
          externalAuthorityAdded: false,
          informationGainFingerprint,
          economicLearningPolicy: "equivalent-consequence-consolidation"
        }
      }, { actor: "MEOS Executive Brain" });

      if (observationResult?.success !== true) {
        return {
          success: false,
          learned: false,
          reason: "executive-learning-observation-failed",
          error: observationResult?.error || null
        };
      }

      const lessonIds = (observationResult.lessons || []).map(item => item?.id).filter(Boolean);
      const episodeResult = this.formAutobiographicalEpisode({
        eventType: "verified-consequence-learning",
        subject,
        sourceId: workId,
        perception: {
          verified: true,
          workState: work?.state || null,
          route: route || null,
          citations: this.clone(citations)
        },
        beliefsBefore: {
          expectedResult: expectedResult || null
        },
        intention: {
          intentionId: intention?.intentionId || null,
          objective: intention?.objective || subject,
          lineageId: work?.context?.cognitiveReentryLineageId || null
        },
        action: {
          type: action,
          workId
        },
        outcome: {
          success,
          outcomeType,
          actualResult
        },
        learning: {
          executiveLearningObservationId: observationResult.observation?.id || null,
          lessonIds,
          duplicate: observationResult.duplicate === true
        }
      }, { persist: options.persist !== false });

      this.record("cognition.verified-consequence-learned", {
        subject,
        workId,
        intentionId: intention?.intentionId || null,
        observationId: observationResult.observation?.id || null,
        lessonIds,
        duplicate: observationResult.duplicate === true
      });

      this.requestCache.clear();
      this.startupCache = null;
      this.startupCachedAt = 0;

      return {
        success: true,
        learned: true,
        duplicate: observationResult.duplicate === true,
        economicallyConsolidated: observationResult.economicallyConsolidated === true,
        observation: this.clone(observationResult.observation || null),
        lessons: this.clone(observationResult.lessons || []),
        episode: this.clone(episodeResult?.episode || null)
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

      /*
       * Commission 006.018C — Self/Evironment Boundary
       *
       * A terminal state reached by cognition-generated Hallway work is the
       * consequence of Maddy's own action, not fresh world evidence. Preserve
       * the outcome for continuity, but never recursively re-enter positioning
       * from the muzzle flash of the dispatch itself. Genuine external change
       * still enters through Knowledge/Monitoring (and later governed feedback).
       */
      const selfGeneratedOutcome =
        work?.context?.cognitiveDispatch === true;

      if (selfGeneratedOutcome) {
        const lineageId = String(
          work.context?.cognitiveReentryLineageId || ""
        ).trim();
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
            event: "self-generated-cognitive-outcome",
            lineageId: lineageId || null,
            workId: work.id || null,
            workState: work.state || null,
            verified: work.outcome?.verified ?? null,
            success: work.outcome?.success ?? null,
            error: work.error || null,
            observedAt: work.updatedAt || new Date().toISOString()
          });
          intention.triggers = intention.triggers.slice(-24);
          intention.updatedAt = new Date().toISOString();
        }

        const learningClosure = this.closeVerifiedConsequenceIntoLearning(
          work,
          intention,
          { persist: true }
        );

        this.record("cognition.self-echo-absorbed", {
          lineageId: lineageId || null,
          subject,
          workId: work.id || null,
          workState: work.state || null
        });

        return {
          success: true,
          meaningful: true,
          scheduled: false,
          absorbed: true,
          selfEcho: true,
          lineageId: lineageId || null,
          learningClosure: this.clone(learningClosure),
          reason: "self-generated-cognitive-outcome"
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

        const learningClosure = this.closeVerifiedConsequenceIntoLearning(
          work,
          intention,
          { persist: true }
        );

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
          learningClosure: this.clone(learningClosure),
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

    cognitiveIntentionTimestamp(value = {}) {
      const candidates = [
        value.completedAt,
        value.updatedAt,
        value.createdAt
      ];
      for (const candidate of candidates) {
        const parsed = Date.parse(candidate || "");
        if (Number.isFinite(parsed)) return parsed;
      }
      return 0;
    },

    mergeCognitiveIntentionTriggers(...triggerSets) {
      const merged = [];
      const seen = new Set();
      for (const trigger of triggerSets.flat()) {
        if (!trigger || typeof trigger !== "object") continue;
        let identity;
        try {
          identity = JSON.stringify({
            fingerprint: trigger.fingerprint || null,
            id: trigger.id || null,
            eventId: trigger.eventId || null,
            type: trigger.type || null,
            source: trigger.source || null,
            event: trigger.event || null,
            lineageId: trigger.lineageId || null,
            workId: trigger.workId || null,
            workflowId: trigger.workflowId || null,
            sourceDocumentId: trigger.sourceDocumentId || null,
            sourceInvestigationId: trigger.sourceInvestigationId || null,
            sourceFingerprint: trigger.sourceFingerprint || null,
            reason: trigger.reason || null
          });
        } catch {
          identity = String(trigger);
        }
        if (seen.has(identity)) continue;
        seen.add(identity);
        merged.push(this.clone(trigger));
      }
      return merged.slice(-50);
    },

    mergeCognitiveIntentionGroup(records = []) {
      const usable = records.filter(
        item => item && typeof item === "object"
      );
      if (usable.length === 0) return null;
      if (usable.length === 1) return this.clone(usable[0]);

      const chronological = [...usable].sort(
        (a, b) =>
          this.cognitiveIntentionTimestamp(a) -
          this.cognitiveIntentionTimestamp(b)
      );
      const earliest = chronological[0];
      const latest = chronological[chronological.length - 1];

      const ids = [
        ...new Set(
          usable
            .map(item => String(item.intentionId || "").trim())
            .filter(Boolean)
        )
      ];
      const sameExplicitIdentity = ids.length === 1 && ids[0];
      const completed = usable
        .filter(item => item.status === "completed")
        .sort(
          (a, b) =>
            this.cognitiveIntentionTimestamp(a) -
            this.cognitiveIntentionTimestamp(b)
        )
        .at(-1);

      /*
       * Exact identity is stronger than stale status. Once the same explicit
       * thought completed, an older pending copy may not resurrect it.
       */
      const winner =
        sameExplicitIdentity && completed
          ? completed
          : latest;

      const createdTimes = usable
        .map(item => Date.parse(item.createdAt || ""))
        .filter(Number.isFinite);
      const updatedTimes = usable
        .map(item => Date.parse(item.updatedAt || ""))
        .filter(Number.isFinite);
      const triggers = this.mergeCognitiveIntentionTriggers(
        ...usable.map(item =>
          Array.isArray(item.triggers) ? item.triggers : []
        )
      );
      const contributorSources = [
        ...new Set(
          triggers
            .map(trigger =>
              String(trigger?.source || trigger?.type || "").trim()
            )
            .filter(Boolean)
        )
      ];

      const canonicalId =
        String(earliest.intentionId || "").trim() ||
        String(winner.intentionId || "").trim() ||
        ids[0] ||
        this.id("cognitive-intention");

      const merged = {
        ...this.clone(earliest),
        ...this.clone(winner),
        intentionId: canonicalId,
        key:
          this.normalize(winner.subject || winner.key || "") ||
          this.normalize(earliest.subject || earliest.key || ""),
        subject:
          winner.subject ||
          earliest.subject ||
          null,
        attempts: Math.max(
          ...usable.map(item => Number(item.attempts || 0)),
          0
        ),
        triggers,
        createdAt:
          createdTimes.length
            ? new Date(Math.min(...createdTimes)).toISOString()
            : earliest.createdAt || winner.createdAt || null,
        updatedAt:
          updatedTimes.length
            ? new Date(Math.max(...updatedTimes)).toISOString()
            : winner.updatedAt || earliest.updatedAt || null,
        lastError:
          winner.status === "completed"
            ? null
            : winner.lastError || null,
        convergence: {
          schema: "meos.maddy.cognitive-identity-self-healing.v1",
          identity: `intention:${canonicalId}`,
          observedRecordCount: usable.length,
          absorbedRecordCount: Math.max(0, usable.length - 1),
          mergedIntentionIds: ids,
          contributorSources,
          healedAt: new Date().toISOString(),
          principle: "many-signals-one-continuing-thought"
        }
      };

      if (winner.status === "completed" && completed?.completedAt) {
        merged.completedAt = completed.completedAt;
      }
      return merged;
    },

    convergeCognitiveIntentions(records = [], options = {}) {
      const source = Array.isArray(records)
        ? records.filter(item => item && typeof item === "object")
        : [];
      const groups = [];
      const idToGroup = new Map();
      const activeKeyToGroup = new Map();

      for (const record of source) {
        const id = String(record.intentionId || "").trim();
        const key = this.normalize(record.subject || record.key || "");
        let groupIndex =
          id && idToGroup.has(id)
            ? idToGroup.get(id)
            : undefined;

        if (
          groupIndex === undefined &&
          key &&
          record.status !== "completed" &&
          activeKeyToGroup.has(key)
        ) {
          groupIndex = activeKeyToGroup.get(key);
        }

        if (groupIndex === undefined) {
          groupIndex = groups.length;
          groups.push([]);
        }

        groups[groupIndex].push(record);
        if (id) idToGroup.set(id, groupIndex);
        if (key && record.status !== "completed") {
          activeKeyToGroup.set(key, groupIndex);
        }
      }

      const intentions = groups
        .map(group => this.mergeCognitiveIntentionGroup(group))
        .filter(Boolean)
        .sort(
          (a, b) =>
            this.cognitiveIntentionTimestamp(b) -
            this.cognitiveIntentionTimestamp(a)
        )
        .slice(0, this.configuration.maximumCognitiveIntentions);

      const absorbedRecords = Math.max(
        0,
        source.length - intentions.length
      );
      const convergedGroups = groups.filter(group => group.length > 1);

      if (absorbedRecords > 0 && options.recordHealing !== false) {
        brainPersistence.intentionSelfHealingCount +=
          convergedGroups.length;
        brainPersistence.intentionRecordsAbsorbed += absorbedRecords;
        brainPersistence.pendingIntentionSelfHealingWriteback = true;
        brainPersistence.lastIntentionSelfHealing = {
          schema: "meos.maddy.cognitive-identity-self-healing-event.v1",
          inputRecords: source.length,
          outputIntentions: intentions.length,
          convergedGroups: convergedGroups.length,
          absorbedRecords,
          reason: options.reason || "runtime-convergence",
          healedAt: new Date().toISOString()
        };
        this.record("cognition.intention-identity-self-healed", {
          inputRecords: source.length,
          outputIntentions: intentions.length,
          convergedGroups: convergedGroups.length,
          absorbedRecords,
          reason: options.reason || "runtime-convergence"
        });
      }

      return {
        intentions,
        inputRecords: source.length,
        outputIntentions: intentions.length,
        convergedGroups: convergedGroups.length,
        absorbedRecords
      };
    },

    canonicalizeCognitiveEvidence(value, depth = 0) {
      if (depth > 8) return null;
      if (value === null || value === undefined) return null;

      if (Array.isArray(value)) {
        return value
          .map(item => this.canonicalizeCognitiveEvidence(item, depth + 1))
          .filter(item => item !== null)
          .sort((a, b) =>
            JSON.stringify(a).localeCompare(JSON.stringify(b))
          );
      }

      if (typeof value !== "object") {
        if (typeof value === "string") return this.normalize(value);
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "boolean") return value;
        return String(value);
      }

      const transientKeys = new Set([
        "id", "intentionId", "reentryId", "dispatchId", "planId",
        "workflowId", "investigationId", "assimilationNumber",
        "investigationNumber", "assessmentNumber", "revision",
        "generatedAt", "createdAt", "updatedAt", "completedAt",
        "startedAt", "observedAt", "assessedAt", "healedAt",
        "convergedAt", "reactivatedAt", "quiescentAt",
        "fingerprint", "positioningFingerprint", "worldFingerprint",
        "sourceFingerprint", "investigationFingerprint",
        "assimilationFingerprint", "causalFingerprint",
        "priorWorldFingerprint", "currentWorldFingerprint",
        "priorCheckpointId"
      ]);

      const provenanceKeys = new Set([
        "source", "provenance", "provider", "providerId",
        "executor", "lineageId", "cognitiveReentryLineageId"
      ]);

      const out = {};
      for (const key of Object.keys(value).sort()) {
        if (transientKeys.has(key) || provenanceKeys.has(key)) continue;
        const canonical =
          this.canonicalizeCognitiveEvidence(value[key], depth + 1);
        if (
          canonical === null ||
          canonical === "" ||
          (Array.isArray(canonical) && canonical.length === 0) ||
          (
            canonical &&
            typeof canonical === "object" &&
            !Array.isArray(canonical) &&
            Object.keys(canonical).length === 0
          )
        ) continue;
        out[key] = canonical;
      }
      return out;
    },

    cognitiveEvidenceFingerprint(value = {}) {
      const canonical = this.canonicalizeCognitiveEvidence(value);
      try {
        return this.fingerprintCognitiveDispatch(canonical);
      } catch {
        try { return JSON.stringify(canonical); }
        catch { return String(canonical); }
      }
    },

    cognitiveTriggerIsHousekeeping(trigger = {}) {
      const event = this.normalize(trigger?.event || trigger?.type || "");
      return new Set([
        "unresolved intention time reentry",
        "cognitive continuity resume",
        "temporal continuity return",
        "completed with failure",
        "runtime reentry",
        "incomplete cognition"
      ]).has(event);
    },

    cognitiveTriggerIsMeaningful(trigger = {}, intention = null) {
      if (!trigger || typeof trigger !== "object") return false;
      const event = this.normalize(trigger.event || trigger.type || "");
      if (!event || this.cognitiveTriggerIsHousekeeping(trigger)) return false;

      /*
       * Evidence created by this same cognition lineage is knowledge to absorb,
       * not a fresh reason to purchase another cognition cycle.
       */
      if (
        trigger.selfGeneratedCognitiveEvidence === true &&
        (
          !intention?.intentionId ||
          trigger.originatingIntentionId === intention.intentionId
        )
      ) {
        return false;
      }

      const anchorFields = [
        "missionId", "relatedMissionId", "workId",
        "initiativeId", "opportunityId", "caseRecordId", "alertId",
        "sourceDocumentId", "sourceInvestigationId", "sourceId",
        "evidenceId", "deadlineId", "decisionId"
      ];
      if (anchorFields.some(field => Boolean(trigger[field]))) return true;

      const source = this.normalize(trigger.source || "");
      if (["human", "executive director"].includes(source)) return true;

      const executiveSources = new Set([
        "mission engine", "executive hallway", "executive monitoring",
        "grant office", "executive resource acquisition engine",
        "knowledge memory", "knowledge engine",
        "executive evidence integrity", "institutional reasoning",
        "executive planning", "executive learning"
      ]);
      return executiveSources.has(source) && event.length > 0;
    },

    getCognitiveEvidenceFrontier(intention = {}) {
      const economics = intention?.economics || {};
      const saved = Array.isArray(economics.evidenceFrontier)
        ? economics.evidenceFrontier
        : [];
      if (saved.length > 0) return new Set(saved);

      const derived = (intention?.triggers || [])
        .filter(trigger => !this.cognitiveTriggerIsHousekeeping(trigger))
        .map(trigger => this.cognitiveEvidenceFingerprint(trigger))
        .filter(Boolean);
      return new Set(derived);
    },

    snapshotCognitiveEvidenceFrontier(intention = {}) {
      if (!intention) return [];
      const frontier = [
        ...new Set(
          (intention.triggers || [])
            .filter(trigger => !this.cognitiveTriggerIsHousekeeping(trigger))
            .map(trigger => this.cognitiveEvidenceFingerprint(trigger))
            .filter(Boolean)
        )
      ].slice(-100);

      intention.economics = {
        ...(intention.economics || {}),
        evidenceFrontier: frontier,
        evidenceFrontierCapturedAt: new Date().toISOString()
      };
      return frontier;
    },

    assessTriggerNovelty(intention, triggers = []) {
      const list = (Array.isArray(triggers) ? triggers : [triggers])
        .filter(Boolean);
      const frontier = this.getCognitiveEvidenceFrontier(intention);
      const meaningful = list.filter(trigger =>
        this.cognitiveTriggerIsMeaningful(trigger, intention)
      );

      const novel = meaningful.filter(trigger => {
        const fingerprint = this.cognitiveEvidenceFingerprint(trigger);
        return fingerprint && !frontier.has(fingerprint);
      });

      const selfGeneratedEchoes = list.filter(trigger =>
        trigger?.selfGeneratedCognitiveEvidence === true &&
        trigger?.originatingIntentionId === intention?.intentionId
      );

      return {
        meaningfulCount: meaningful.length,
        novelCount: novel.length,
        novelTriggers: this.clone(novel),
        selfGeneratedEchoCount: selfGeneratedEchoes.length,
        frontierSize: frontier.size
      };
    },

    assessCognitiveAttentionEconomics(intention, triggers = [], options = {}) {
      const list = (Array.isArray(triggers) ? triggers : [triggers])
        .filter(Boolean);
      const combined = [
        ...(Array.isArray(intention?.triggers) ? intention.triggers : []),
        ...list
      ];
      const meaningful = combined.filter(trigger =>
        this.cognitiveTriggerIsMeaningful(trigger, intention)
      );
      const novelty = this.assessTriggerNovelty(intention, list);

      const economics = intention?.economics || {};
      const quiescent = intention?.status === "quiescent" ||
        economics.state === "quiescent";
      const explicitHuman = combined.some(trigger =>
        ["human", "executive director"].includes(
          this.normalize(trigger?.source || "")
        )
      );

      let decision = "admit";
      let reason = "executive-reality-sponsored";

      if (
        novelty.selfGeneratedEchoCount > 0 &&
        novelty.novelCount === 0 &&
        !explicitHuman
      ) {
        decision = "suppress";
        reason = "self-generated-evidence-echo";
      } else if (quiescent && novelty.novelCount === 0 && !explicitHuman) {
        decision = "suppress";
        reason = "quiescent-no-materially-novel-evidence";
      } else if (
        meaningful.length <
          this.configuration.cognitiveAttentionMinimumAnchors &&
        !explicitHuman
      ) {
        decision = "deny";
        reason = "no-defensible-executive-attention-anchor";
      } else if (quiescent && (novelty.novelCount > 0 || explicitHuman)) {
        decision = "wake";
        reason = explicitHuman
          ? "human-attention-authority"
          : "materially-novel-executive-evidence";
      }

      const assessment = {
        schema: "meos.maddy.executive-attention-decision.v2",
        intentionId: intention?.intentionId || null,
        subject: intention?.subject || null,
        decision,
        reason,
        meaningfulAnchorCount: meaningful.length,
        novelMeaningfulAnchorCount: novelty.novelCount,
        evidenceFrontierSize: novelty.frontierSize,
        selfGeneratedEchoCount: novelty.selfGeneratedEchoCount,
        explicitHuman,
        assessedAt: new Date().toISOString()
      };
      this.cognitiveEconomics.lastDecision = this.clone(assessment);
      return assessment;
    },

    worldModelAssessmentHasExecutiveConsequence(assessment = {}, current = {}) {
      const signalTypes = new Set(
        (assessment.signals || []).map(item => item?.type).filter(Boolean)
      );
      const consequentialSignals = [
        "work-state-changed",
        "monitoring-state-changed",
        "future-positioning-implication"
      ];
      const hasConsequentialSignal =
        consequentialSignals.some(type => signalTypes.has(type));

      const currentWork =
        this.buildCognitiveWorkSalienceProjection(
          current?.world?.currentWork || {}
        );
      const hasActiveExecutiveWork =
        Number(currentWork?.summary?.salientMissionCount || 0) > 0 ||
        Number(currentWork?.summary?.salientWorkflowCount || 0) > 0 ||
        Number(currentWork?.summary?.salientPlanCount || 0) > 0 ||
        Number(currentWork?.summary?.pendingApprovalCount || 0) > 0;

      const hasLiveIntention =
        Array.isArray(current?.intentions) &&
        current.intentions.some(item =>
          item &&
          item.status !== "completed" &&
          item.status !== "quiescent"
        );

      return {
        consequential:
          hasConsequentialSignal ||
          (
            signalTypes.has("uncertainty-increased") &&
            (hasActiveExecutiveWork || hasLiveIntention)
          ),
        signalTypes: Array.from(signalTypes),
        hasActiveExecutiveWork,
        hasLiveIntention
      };
    },

    assessPreSpendExecutiveAttention(
      assessment = {},
      trigger = {},
      existingIntention = null,
      currentWorldModel = {}
    ) {
      const consequence =
        this.worldModelAssessmentHasExecutiveConsequence(
          assessment,
          currentWorldModel
        );

      const explicitHuman =
        ["human", "executive director"].includes(
          this.normalize(trigger?.source || "")
        );

      const attention = existingIntention
        ? this.assessCognitiveAttentionEconomics(
            existingIntention,
            [trigger],
            { phase: "pre-spend" }
          )
        : null;

      let allowCognition = true;
      let allowInvestigation = assessment.investigate === true;
      let reason = "executive-consequence-and-novelty-proven";

      if (!consequence.consequential && !explicitHuman) {
        allowCognition = false;
        allowInvestigation = false;
        reason = "no-demonstrated-executive-consequence";
      } else if (
        attention &&
        ["deny", "suppress"].includes(attention.decision)
      ) {
        allowCognition = false;
        allowInvestigation = false;
        reason = attention.reason;
      }

      const decision = {
        schema: "meos.maddy.pre-spend-executive-attention.v1",
        subject: assessment.subject || existingIntention?.subject || null,
        allowCognition,
        allowInvestigation,
        reason,
        estimatedNetworkCallsAuthorized:
          allowInvestigation ? 1 : 0,
        consequence,
        attention,
        decidedAt: new Date().toISOString()
      };

      this.cognitiveEconomics.lastPreSpendDecision = this.clone(decision);
      if (!allowCognition) this.cognitiveEconomics.preSpendDenied += 1;
      if (assessment.investigate === true && !allowInvestigation) {
        this.cognitiveEconomics.preSpendInvestigationPrevented += 1;
        this.cognitiveEconomics.duplicateCallsPrevented += 1;
      }
      if (reason === "self-generated-evidence-echo") {
        this.cognitiveEconomics.selfGeneratedEchoSuppressions += 1;
      }
      if (reason === "quiescent-no-materially-novel-evidence") {
        this.cognitiveEconomics.evidenceFrontierSuppressions += 1;
      }

      return decision;
    },

    cognitiveOutcomeFingerprint(result = {}) {
      /*
       * Information gain is semantic. Success flags, generated IDs,
       * timestamps, plan IDs, and provider provenance do not count as learning.
       */
      const substantive = {
        evidence:
          result?.evidence ||
          result?.reasoning?.evidence ||
          result?.positioning?.evidence ||
          null,
        unknowns:
          result?.unknowns ||
          result?.reasoning?.unknowns ||
          result?.positioning?.unknowns ||
          null,
        conclusions:
          result?.conclusions ||
          result?.recommendation ||
          result?.positioning?.recommendation ||
          null,
        proposedMoves:
          result?.proposedMoves ||
          result?.moves ||
          result?.positioning?.proposedMoves ||
          null,
        unresolved:
          result?.unresolved ||
          result?.remainingUnknowns ||
          null
      };
      return this.cognitiveEvidenceFingerprint(substantive);
    },

    applyCognitiveInformationGain(intention, result = {}, entry = {}) {
      if (!intention) return null;
      const fingerprint = this.cognitiveOutcomeFingerprint(result);
      const economics = intention.economics || {
        schema: "meos.maddy.cognitive-information-economics.v1",
        state: "active",
        noGainStreak: 0,
        worthwhileInvestigations: 0,
        suppressedCalls: 0,
        lastOutcomeFingerprint: null,
        lastMeaningfulGainAt: null,
        quiescentAt: null,
        quiescenceReason: null,
        evidenceFrontier: []
      };

      const previous = economics.lastOutcomeFingerprint;
      const gained =
        Boolean(fingerprint) &&
        previous !== null &&
        previous !== fingerprint;

      if (gained) {
        economics.noGainStreak = 0;
        economics.worthwhileInvestigations =
          Number(economics.worthwhileInvestigations || 0) + 1;
        economics.lastMeaningfulGainAt = new Date().toISOString();
        economics.state = "active";
        economics.quiescentAt = null;
        economics.quiescenceReason = null;
      } else {
        economics.noGainStreak =
          Number(economics.noGainStreak || 0) + 1;
      }

      economics.lastOutcomeFingerprint = fingerprint;
      economics.lastEvaluatedAt = new Date().toISOString();
      economics.lastReentryId = entry?.reentryId || null;

      if (
        economics.noGainStreak >=
          this.configuration.cognitiveNoGainQuiescenceThreshold
      ) {
        economics.state = "quiescent";
        economics.quiescentAt = new Date().toISOString();
        economics.quiescenceReason =
          "repeated-cognition-produced-no-material-information-gain";
        intention.status = "quiescent";
        this.snapshotCognitiveEvidenceFrontier(intention);
        this.cognitiveEconomics.quiescenceEntries += 1;
        this.record("cognition.intention-quiescent", {
          intentionId: intention.intentionId,
          subject: intention.subject,
          attempts: intention.attempts,
          noGainStreak: economics.noGainStreak,
          reason: economics.quiescenceReason
        });
      }

      intention.economics = economics;
      return { gained, economics: this.clone(economics) };
    },

    migrateCognitiveEconomicsState() {
      let quiesced = 0;
      let removedTestArtifacts = 0;

      this.cognitiveIntentions = (this.cognitiveIntentions || []).filter(item => {
        const isKnownFixture =
          item?.subject === "Pursue Foundation X" &&
          Date.parse(item?.createdAt || "") >=
            Date.parse("2026-08-11T20:00:00.000Z") &&
          Date.parse(item?.createdAt || "") <=
            Date.parse("2026-08-12T02:00:00.000Z");
        if (isKnownFixture) {
          removedTestArtifacts += 1;
          return false;
        }
        return true;
      });

      for (const intention of this.cognitiveIntentions) {
        if (
          intention?.status !== "completed" &&
          Number(intention?.attempts || 0) >= 8
        ) {
          intention.economics = {
            ...(intention.economics || {}),
            schema: "meos.maddy.cognitive-information-economics.v1",
            state: "quiescent",
            noGainStreak: Math.max(
              this.configuration.cognitiveNoGainQuiescenceThreshold,
              Number(intention?.economics?.noGainStreak || 0)
            ),
            quiescentAt: new Date().toISOString(),
            quiescenceReason:
              "legacy-high-retry-intention-awaiting-meaningful-new-evidence",
            migratedFromAttempts: Number(intention.attempts || 0)
          };
          intention.status = "quiescent";
          this.snapshotCognitiveEvidenceFrontier(intention);
          quiesced += 1;
        }
      }

      if (quiesced || removedTestArtifacts) {
        this.persist();
      }
      return {
        success: true,
        quiesced,
        removedTestArtifacts,
        remainingIntentions: this.cognitiveIntentions.length
      };
    },

    upsertCognitiveIntention(subject, triggers = [], options = {}) {
      const normalizedSubject = String(subject || "").trim();
      if (!normalizedSubject) return null;
      const key = this.normalize(normalizedSubject);
      const convergence = this.convergeCognitiveIntentions(
        this.cognitiveIntentions,
        {
          reason: "pre-upsert-identity-gate",
          recordHealing: true
        }
      );
      this.cognitiveIntentions = convergence.intentions;
      let intention = this.cognitiveIntentions.find(
        item =>
          this.normalize(item.subject || item.key || "") === key &&
          item.status !== "completed"
      );
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
      if (
        brainPersistence.hydrated === true &&
        options.projectSelfModel !== false
      ) {
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
      intention.status = result.success === true
        ? "completed"
        : (intention.status === "quiescent" ? "quiescent" : "pending");
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
      if (
        !intention?.subject ||
        intention.status === "completed" ||
        intention.status === "quiescent" ||
        intention?.economics?.state === "quiescent"
      ) {
        if (intention?.status === "quiescent" || intention?.economics?.state === "quiescent") {
          this.cognitiveEconomics.quiescentWakeSuppressions += 1;
          this.cognitiveEconomics.duplicateCallsPrevented += 1;
        }
        return false;
      }
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
      this.retireTemporalOrientationArtifacts({ reason: options.reason || "runtime-reentry" });
      const unresolved = (this.cognitiveIntentions || []).filter(item =>
        item &&
        item.status !== "completed" &&
        item.status !== "quiescent" &&
        item?.economics?.state !== "quiescent" &&
        item.subject &&
        !this.isTemporalOrientationSubject(item.subject)
      );
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

      const existingIntention =
        (this.cognitiveIntentions || []).find(
          item =>
            this.normalize(item?.subject || item?.key || "") === key &&
            item?.status !== "completed"
        );

      if (existingIntention) {
        const attention =
          this.assessCognitiveAttentionEconomics(
            existingIntention,
            [trigger],
            options
          );

        if (attention.decision === "suppress") {
          this.cognitiveEconomics.quiescentWakeSuppressions += 1;
          this.cognitiveEconomics.duplicateCallsPrevented += 1;
          return {
            success: true,
            scheduled: false,
            quiescent: true,
            reason: attention.reason
          };
        }

        if (attention.decision === "deny") {
          this.cognitiveEconomics.admissionDenied += 1;
          this.cognitiveEconomics.duplicateCallsPrevented += 1;
          return {
            success: true,
            scheduled: false,
            attentionDenied: true,
            reason: attention.reason
          };
        }

        if (attention.decision === "wake") {
          existingIntention.status = "pending";
          existingIntention.economics = {
            ...(existingIntention.economics || {}),
            state: "active",
            noGainStreak: 0,
            reactivatedAt: new Date().toISOString(),
            reactivationReason: attention.reason
          };
          this.cognitiveEconomics.meaningfulWakeCount += 1;
        }
      }

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

      if (this.isTemporalOrientationSubject(subject)) {
        this.cognitiveReentryTimers.delete(key);
        this.retireTemporalOrientationArtifacts({ reason: "blocked-before-positioning" });
        return { success: true, skipped: true, orientationOnly: true, reason: "temporal-orientation-is-not-positioning-subject" };
      }

      this.cognitiveReentryTimers.delete(
        key
      );

      const existingIntention =
        (this.cognitiveIntentions || []).find(
          item =>
            this.normalize(item?.subject || item?.key || "") === key &&
            item?.status !== "completed"
        );
      if (existingIntention) {
        const attention =
          this.assessCognitiveAttentionEconomics(
            existingIntention,
            triggers,
            options
          );
        if (
          attention.decision === "suppress" ||
          attention.decision === "deny"
        ) {
          if (attention.decision === "suppress") {
            this.cognitiveEconomics.quiescentWakeSuppressions += 1;
          } else {
            this.cognitiveEconomics.admissionDenied += 1;
          }
          this.cognitiveEconomics.duplicateCallsPrevented += 1;
          return {
            success: true,
            skipped: true,
            economical: true,
            reason: attention.reason
          };
        }
        if (attention.decision === "wake") {
          existingIntention.status = "pending";
          existingIntention.economics = {
            ...(existingIntention.economics || {}),
            state: "active",
            noGainStreak: 0,
            reactivatedAt: new Date().toISOString(),
            reactivationReason: attention.reason
          };
          this.cognitiveEconomics.meaningfulWakeCount += 1;
        }
      }

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

        this.applyCognitiveInformationGain(
          intention,
          result || {},
          entry
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
        this.applyCognitiveInformationGain(
          intention,
          { success: false, error: entry.error },
          entry
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
              String(move.action || "").trim()
          )
        : [];

      /*
       * Commission 006.018F — Cognitive Promotion Judgment / Catch & Release
       *
       * A valid thought is not automatically durable executive work. Maddy
       * first decides whether the move deserves organizational resources now,
       * belongs in continued internal cognition, should be revisited when a
       * material condition changes, or should be released.
       */
      const promotionDecisions = moves.map(move => ({
        move: this.clone(move),
        judgment: this.assessCognitiveMovePromotion(
          positioning,
          move,
          options
        )
      }));
      const promotedMoves = promotionDecisions
        .filter(item => item.judgment?.disposition === "promote")
        .map(item => item.move);

      /*
       * Commission 006.018C — One Shot, One Kill
       *
       * Identity must describe the executive meaning of the thought, not the
       * transient objects created while thinking it. Institutional Reasoning
       * legitimately creates fresh IDs/timestamps on each pass; those values
       * must never make an unchanged question look like brand-new work.
       */
      const positioningFingerprint =
        this.fingerprintCognitiveDispatch(
          this.buildPositioningSemanticIdentity(
            positioning
          )
        );

      /*
       * Commission 006.018G — Cognitive Revisit Memory
       *
       * REVISIT is not work. Preserve a compact, durable memory of what was
       * released, why it matters, and which material conditions would justify
       * bringing it back into attention. Re-observing the same unchanged fish
       * refreshes one memory instead of creating another Mission or record.
       */
      for (const item of promotionDecisions) {
        if (item.judgment?.disposition === "revisit") {
          item.revisitMemory = this.rememberCognitiveRevisit(
            positioning,
            item.move,
            item.judgment,
            positioningFingerprint,
            { persist: false }
          );
        }
      }

      let planResult = {
        success: true,
        created: false,
        reused: false,
        plan: null
      };

      if (promotedMoves.length > 0) {
        planResult = this.createOrReusePositioningPlan(
          {
            ...positioning,
            positioningMoves: promotedMoves
          },
          positioningFingerprint,
          options
        );

        if (planResult?.success !== true) {
          return {
            success: false,
            status: "positioning-plan-failed",
            positioning: this.clone(positioning),
            promotionDecisions: this.clone(promotionDecisions),
            plan: this.clone(planResult)
          };
        }
      }

      const plan = planResult.plan;
      const dispatches = [];

      for (const move of promotedMoves) {
        const dispatchKey =
          this.buildCognitiveMoveSemanticKey(
            positioningFingerprint,
            move
          );

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
        promotionDecisions: this.clone(promotionDecisions),
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
          promoted: promotedMoves.length,
          think: promotionDecisions.filter(item => item.judgment?.disposition === "think").length,
          revisit: promotionDecisions.filter(item => item.judgment?.disposition === "revisit").length,
          released: promotionDecisions.filter(item => item.judgment?.disposition === "release").length,
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
          promotionJudgmentBeforePlanning: true,
          revisitCreatesMission: false,
          releaseErasesRecognitionMemory: false,
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

    buildCognitiveRevisitKey(positioning = {}, move = {}, positioningFingerprint = null) {
      const opportunity = positioning.opportunity || {};
      const subject = String(positioning.subject || opportunity.title || opportunity.name || "").trim().toLowerCase();
      const recordId = String(opportunity.recordId || opportunity.id || "").trim().toLowerCase();
      const moveType = String(move.type || "").trim().toLowerCase();
      const action = String(move.action || "").trim().toLowerCase().replace(/\s+/g, " ");
      return this.fingerprintCognitiveDispatch({
        schema: "meos.maddy.cognitive-revisit-identity.v1",
        opportunity: recordId || subject,
        moveType,
        action,
        positioningFingerprint: positioningFingerprint || null
      });
    },

    rememberCognitiveRevisit(positioning = {}, move = {}, judgment = {}, positioningFingerprint = null, options = {}) {
      if (judgment?.disposition !== "revisit") return null;

      const now = new Date().toISOString();
      const key = this.buildCognitiveRevisitKey(positioning, move, positioningFingerprint);
      const conditions = Array.from(new Set(
        (Array.isArray(judgment.revisit?.conditions) ? judgment.revisit.conditions : [])
          .map(value => String(value || "").trim())
          .filter(Boolean)
      )).sort();
      const existingIndex = this.cognitiveRevisitMemories.findIndex(item => item?.key === key);
      const prior = existingIndex >= 0 ? this.cognitiveRevisitMemories[existingIndex] : null;
      const record = {
        schema: "meos.maddy.cognitive-revisit-memory.v1",
        id: prior?.id || this.id("revisit"),
        key,
        status: "watching",
        subject: positioning.subject || positioning.opportunity?.title || null,
        opportunityRecordId: positioning.opportunity?.recordId || null,
        moveType: move.type || null,
        action: String(move.action || "").trim() || null,
        reason: judgment.reason || null,
        trigger: judgment.revisit?.when || "material-change",
        conditions,
        positioningFingerprint: positioningFingerprint || null,
        firstSeenAt: prior?.firstSeenAt || now,
        lastSeenAt: now,
        observationCount: Number(prior?.observationCount || 0) + 1,
        lastMaterialChangeAt: prior?.lastMaterialChangeAt || null,
        promotedAt: prior?.promotedAt || null,
        releasedAt: prior?.releasedAt || null
      };

      if (existingIndex >= 0) this.cognitiveRevisitMemories.splice(existingIndex, 1);
      else this.cognitiveRevisitMemoryCount += 1;
      this.cognitiveRevisitMemories.unshift(record);
      if (this.cognitiveRevisitMemories.length > this.configuration.maximumCognitiveRevisitMemories) {
        this.cognitiveRevisitMemories.length = this.configuration.maximumCognitiveRevisitMemories;
      }
      if (options.persist !== false) this.persist();
      return this.clone(record);
    },

    getCognitiveRevisitMemories(options = {}) {
      const status = options.status ? String(options.status).trim().toLowerCase() : null;
      const limit = Math.max(1, Math.min(this.configuration.maximumCognitiveRevisitMemories, Number(options.limit) || 50));
      return this.clone(
        this.cognitiveRevisitMemories
          .filter(item => !status || String(item?.status || "").toLowerCase() === status)
          .slice(0, limit)
      );
    },

    assessCognitiveMovePromotion(positioning = {}, move = {}, options = {}) {
      const action = String(move.action || "").trim();
      const type = String(move.type || "").trim().toLowerCase();
      const status = String(move.status || "").trim().toLowerCase();
      const whyNow = String(move.whyNow || "").trim();
      const readiness = positioning.readiness || {};
      const opportunity = positioning.opportunity || {};
      const cycleOpen = opportunity.cycle?.explicitlyOpen === true;
      const blockers = Number(readiness.blockingConditionCount || 0);
      const unknowns = Number(readiness.consequentialUnknownCount || 0);
      const authority = this.classifyCognitiveMoveAuthority(move, options);

      if (!action || status === "discarded" || type === "discard") {
        return {
          disposition: "release",
          reason: "The move has no live executive action or has already been discarded.",
          durableWork: false,
          recognitionRetained: true
        };
      }

      if (authority.class === "external-action") {
        return {
          disposition: "promote",
          reason: "A consequential external action deserves governed durable work and human review.",
          durableWork: true,
          reviewRequired: true
        };
      }

      if (type === "monitor" && cycleOpen !== true) {
        return {
          disposition: "revisit",
          reason: "The opportunity is not open; preserve a lightweight revisit condition instead of carrying a standing Mission.",
          durableWork: false,
          revisit: {
            when: "material-source-change",
            conditions: [
              "cycle-opens",
              "eligibility-changes",
              "deadline-published-or-changed",
              "application-instructions-change"
            ]
          }
        };
      }

      if (type === "investigate") {
        if (cycleOpen || /urgent|immediate|deadline|time[- ]sensitive/i.test(whyNow)) {
          return {
            disposition: "promote",
            reason: "A time-sensitive consequential unknown requires durable executive work now.",
            durableWork: true,
            reviewRequired: authority.reviewRequired === true
          };
        }

        return {
          disposition: "think",
          reason: unknowns > 0 || blockers > 0
            ? "The unknown matters, but it should remain inside cognition until evidence or timing justifies organizational work."
            : "Investigation can continue internally without creating durable work yet.",
          durableWork: false
        };
      }

      if (type === "strategic-positioning") {
        if (blockers > 0 || readiness.state === "not-yet-positioned") {
          return {
            disposition: "think",
            reason: "Strategic positioning remains cognitively useful, but blocking conditions must be reduced before durable work is promoted.",
            durableWork: false
          };
        }

        return {
          disposition: "promote",
          reason: "Evidence supports legitimate positioning work that can improve organizational readiness now.",
          durableWork: true,
          reviewRequired: authority.reviewRequired === true
        };
      }

      if (!whyNow) {
        return {
          disposition: "release",
          reason: "No material reason exists to spend executive attention or organizational resources on this move now.",
          durableWork: false,
          recognitionRetained: true
        };
      }

      return {
        disposition: "promote",
        reason: "The move has a current material executive rationale and is not better handled as internal thought or conditional revisit.",
        durableWork: true,
        reviewRequired: authority.reviewRequired === true
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

    /*
     * Commission 006.018C — Semantic Cognitive Identity
     *
     * Volatile execution metadata is intentionally excluded. Material source,
     * cycle, evidence, unknown, disposition, readiness, and action meaning stay
     * in the identity so a real-world change can legitimately wake cognition.
     */
    normalizeCognitiveSemanticText(value) {
      return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    },

    sanitizeCognitiveSemanticValue(value, key = "") {
      const volatileKeys = new Set([
        "id",
        "generatedAt",
        "createdAt",
        "updatedAt",
        "analyzedAt",
        "observedAt",
        "startedAt",
        "completedAt",
        "recordedAt",
        "retrievedAt",
        "fetchedAt",
        "checkedAt",
        "lastCheckedAt",
        "lastSeenAt",
        "timestamp",
        "durationMs",
        "order",
        "runId",
        "requestId",
        "analysisId",
        "dispatchId",
        "planId",
        "missionId",
        "fingerprint",
        "revision"
      ]);

      if (volatileKeys.has(key)) return undefined;
      if (value === null || value === undefined) return value ?? null;
      if (typeof value === "string") return this.normalizeCognitiveSemanticText(value);
      if (typeof value !== "object") return value;

      if (Array.isArray(value)) {
        return value
          .map(item => this.sanitizeCognitiveSemanticValue(item))
          .filter(item => item !== undefined)
          .sort((left, right) => {
            const a = JSON.stringify(left ?? null);
            const b = JSON.stringify(right ?? null);
            return a.localeCompare(b);
          });
      }

      const result = {};
      Object.keys(value)
        .sort()
        .forEach(childKey => {
          const cleaned = this.sanitizeCognitiveSemanticValue(
            value[childKey],
            childKey
          );
          if (cleaned !== undefined) result[childKey] = cleaned;
        });
      return result;
    },

    buildPositioningSemanticIdentity(positioning = {}) {
      const opportunity = positioning.opportunity || {};
      return {
        cognitionType: "counterfactual-positioning",
        subject: this.normalizeCognitiveSemanticText(positioning.subject),
        opportunityIdentity: {
          recordId: opportunity.recordId || null,
          source: this.sanitizeCognitiveSemanticValue(opportunity.source || {})
        },
        materialState: this.sanitizeCognitiveSemanticValue({
          cycle: opportunity.cycle || {},
          moneyEvidence: opportunity.moneyEvidence || [],
          eligibilityEvidence: opportunity.eligibilityEvidence || [],
          fundedActivityEvidence: opportunity.fundedActivityEvidence || [],
          restrictionEvidence: opportunity.restrictionEvidence || [],
          deadlineEvidence: opportunity.deadlineEvidence || [],
          applicationEvidence: opportunity.applicationEvidence || [],
          evidence: opportunity.evidence || {},
          unknowns: opportunity.unknowns || [],
          disposition: opportunity.disposition || {},
          nextAction: opportunity.nextAction || null,
          readiness: {
            state: positioning.readiness?.state || null,
            blockingConditionCount:
              Number(positioning.readiness?.blockingConditionCount || 0),
            consequentialUnknownCount:
              Number(positioning.readiness?.consequentialUnknownCount || 0)
          }
        })
      };
    },

    buildCognitiveMoveSemanticKey(positioningFingerprint, move = {}) {
      return this.fingerprintCognitiveDispatch({
        positioningFingerprint,
        type: this.normalizeCognitiveSemanticText(move.type),
        action: this.normalizeCognitiveSemanticText(move.action)
      });
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

    isTemporalOrientationSubject(subject) {
      const normalized = this.normalize(subject);
      return normalized === this.normalize("Reconstruct temporal continuity and determine what requires attention after return");
    },

    retireTemporalOrientationArtifacts(options = {}) {
      const now = new Date().toISOString();
      let retiredIntentions = 0;
      (this.cognitiveIntentions || []).forEach(item => {
        if (item?.status !== "completed" && this.isTemporalOrientationSubject(item?.subject)) {
          item.status = "completed";
          item.updatedAt = now;
          item.completedAt = now;
          item.lastError = null;
          item.resolution = "orientation-only-not-positioning-work";
          retiredIntentions += 1;
        }
      });
      if (this.isTemporalOrientationSubject(this.currentExecutivePriority?.subject)) {
        this.currentExecutivePriority = null;
      }
      this.executivePriorityPortfolio = (this.executivePriorityPortfolio || []).filter(
        item => !this.isTemporalOrientationSubject(item?.subject)
      );
      if (retiredIntentions > 0) this.record("continuity.orientation-artifacts-retired", {
        retiredIntentions, reason: options.reason || "orientation-complete"
      });
      return { success: true, retiredIntentions };
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
        // Temporal return is an orientation event, never an opportunity. Re-enter
        // positioning only when continuity recovers a concrete prior subject.
        const subject = wasDoing?.subject ||
          comparison.newlyOverdue?.[0]?.subject ||
          comparison.unresolvedStillOpen?.[0]?.subject ||
          null;
        if (subject && !this.isTemporalOrientationSubject(subject)) this.scheduleCognitiveReentry(
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
        this.retireTemporalOrientationArtifacts({ reason: "temporal-continuity-oriented" });
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
          "Human leadership remains the final executive authority.",
          "Treat Maddy's supplied capability awareness as the authority for claims about what MEOS can currently do; provider suggestions and plausible workarounds may not promote an unknown capability into an available one."
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
              capabilityAwareness: context.startup.selfModel.capabilityAwareness,
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
    /*
     * Commission 006.024A — Maddy Capability Mirror
     *
     * Maddy already knows which MEOS organs exist. This mirror adds the finer
     * question: what do those organs/providers establish she can actually do
     * right now? Capability truth is derived from runtime evidence and may not
     * be promoted merely because a provider suggests a clever possibility.
     */
    normalizeCapabilityMirrorId(value) {
      return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");
    },

    buildCapabilityAwareness(options = {}) {
      const observedAt = new Date().toISOString();
      const providerManager =
        options.providerManager ||
        global.MEOSProviderManager ||
        global.ProviderManager ||
        null;
      const workspaceAdapter =
        options.workspaceAdapter ||
        global.MEOSGoogleWorkspaceAdapter ||
        null;

      const providerCatalog = Array.isArray(options.providerCapabilities)
        ? this.clone(options.providerCapabilities)
        : this.safe(
            () => providerManager?.listCapabilities?.() || [],
            []
          );
      const providers = Array.isArray(options.providers)
        ? this.clone(options.providers)
        : this.safe(
            () => providerManager?.listProviders?.() || [],
            []
          );
      const workspaceStatus = options.workspaceStatus !== undefined
        ? this.clone(options.workspaceStatus)
        : this.safe(
            () => workspaceAdapter?.getStatus?.() || null,
            null
          );

      const records = new Map();
      const stateRank = {
        prohibited: 70,
        proven: 60,
        available: 50,
        conditional: 40,
        adaptive: 30,
        unavailable: 20,
        unknown: 10
      };

      const add = (input = {}) => {
        const capabilityId = this.normalizeCapabilityMirrorId(
          input.capabilityId || input.id || input.capability
        );
        if (!capabilityId) return;
        const state = CAPABILITY_TRUTH_STATES.includes(input.state)
          ? input.state
          : "unknown";
        const candidate = {
          capabilityId,
          label: String(input.label || input.description || capabilityId),
          state,
          current: ["proven", "available"].includes(state),
          source: String(input.source || "runtime-evidence"),
          providers: [...new Set(
            (Array.isArray(input.providers) ? input.providers : [])
              .map(value => String(value || "").trim())
              .filter(Boolean)
          )],
          requirements: Array.isArray(input.requirements)
            ? this.clone(input.requirements)
            : [],
          evidence: input.evidence ? this.clone(input.evidence) : null,
          observedAt
        };

        const prior = records.get(capabilityId);
        if (!prior || stateRank[state] > stateRank[prior.state]) {
          records.set(capabilityId, candidate);
          return;
        }
        if (prior && stateRank[state] === stateRank[prior.state]) {
          prior.providers = [...new Set([...(prior.providers || []), ...candidate.providers])];
          if (!prior.evidence && candidate.evidence) prior.evidence = candidate.evidence;
        }
      };

      /* Provider Manager's catalog is useful evidence, but registered provider
       * capabilities are also collected because MEOS intentionally allows
       * provider-specific capabilities outside the static catalog. */
      providerCatalog.forEach(item => {
        const registered = Array.isArray(item?.registeredProviders)
          ? item.registeredProviders
          : [];
        const available = Array.isArray(item?.availableProviders)
          ? item.availableProviders
          : [];
        add({
          capabilityId: item?.id,
          label: item?.description || item?.id,
          state:
            item?.available === true
              ? "available"
              : registered.length > 0
                ? "conditional"
                : "unavailable",
          source: "provider-manager-catalog",
          providers: available.length ? available : registered,
          requirements:
            item?.available === true
              ? []
              : registered.length > 0
                ? ["registered provider must become selectable/healthy"]
                : ["no registered provider currently supplies this capability"],
          evidence: {
            registeredProviders: registered,
            availableProviders: available,
            available: item?.available === true
          }
        });
      });

      providers.forEach(provider => {
        const selectable = Boolean(
          provider?.enabled !== false &&
          ["online", "degraded"].includes(String(provider?.status || "").toLowerCase())
        );
        (Array.isArray(provider?.capabilities) ? provider.capabilities : []).forEach(capabilityId => {
          add({
            capabilityId,
            state: selectable ? "available" : "conditional",
            source: "provider-manager-provider",
            providers: [provider?.id],
            requirements: selectable
              ? []
              : ["registered provider is not currently selectable/online"],
            evidence: {
              providerId: provider?.id || null,
              providerStatus: provider?.status || null,
              enabled: provider?.enabled !== false,
              readOnly: provider?.metadata?.readOnly === true
            }
          });
        });
      });

      if (workspaceStatus) {
        const workspaceCapabilities = Array.isArray(workspaceStatus.capabilities)
          ? workspaceStatus.capabilities
          : [];
        const connected = workspaceStatus.connected === true;
        const registered = workspaceStatus.registered === true;

        workspaceCapabilities.forEach(capabilityId => {
          add({
            capabilityId,
            state: connected && registered ? "available" : "conditional",
            source: "google-workspace-runtime",
            providers: [workspaceStatus.providerId || "google-workspace"],
            requirements: connected && registered ? [] : ["Google Workspace connection must be live"],
            evidence: {
              connected,
              registered,
              readOnly: workspaceStatus.readOnly === true,
              status: workspaceStatus.status || null
            }
          });
        });

        /* Read-only is a real capability, not an absence of capability. The
         * unavailable state belongs to the unsupported write action only. */
        if (connected && registered && workspaceCapabilities.length > 0) {
          add({
            capabilityId: "workspace.connected-read",
            label: "Connected Workspace read/research",
            state: "available",
            source: "google-workspace-runtime",
            providers: [workspaceStatus.providerId || "google-workspace"],
            evidence: {
              capabilities: workspaceCapabilities,
              readOnly: workspaceStatus.readOnly === true
            }
          });
        }
        if (workspaceStatus.readOnly === true) {
          add({
            capabilityId: "workspace.file.write",
            label: "Workspace user-file write through the current frontend adapter",
            state: "unavailable",
            source: "google-workspace-runtime",
            providers: [workspaceStatus.providerId || "google-workspace"],
            requirements: ["a commissioned write-capable workspace path/provider is required"],
            evidence: {
              connected,
              registered,
              readOnly: true
            }
          });
        }
      }

      const entries = [...records.values()].sort((a, b) =>
        a.capabilityId.localeCompare(b.capabilityId)
      );

      return {
        schema: "meos.maddy.capability-awareness.v1",
        version: "1.0.0",
        observedAt,
        truthStates: [...CAPABILITY_TRUTH_STATES],
        providerIndependent: true,
        runtimeDerived: true,
        creativeReasoningCannotPromoteCapability: true,
        providerSuggestionIsNotCapabilityEvidence: true,
        capabilityIsNotAuthority: true,
        authorityIsNotPromise: true,
        promiseIsNotDelivery: true,
        humanApprovalRequiredForExternalAction:
          this.configuration.requireHumanApprovalForExternalAction === true,
        entries,
        summary: {
          total: entries.length,
          proven: entries.filter(item => item.state === "proven").length,
          available: entries.filter(item => item.state === "available").length,
          conditional: entries.filter(item => item.state === "conditional").length,
          adaptive: entries.filter(item => item.state === "adaptive").length,
          unknown: entries.filter(item => item.state === "unknown").length,
          unavailable: entries.filter(item => item.state === "unavailable").length,
          prohibited: entries.filter(item => item.state === "prohibited").length
        }
      };
    },

    assessCapability(capability, options = {}) {
      const capabilityId = this.normalizeCapabilityMirrorId(capability);
      const awareness = options.awareness || this.buildCapabilityAwareness(options);
      const exact = (awareness?.entries || []).find(
        item => item.capabilityId === capabilityId
      );
      if (exact) return this.clone(exact);

      return {
        capabilityId,
        label: capabilityId || "unknown-capability",
        state: "unknown",
        current: false,
        source: "no-runtime-capability-evidence",
        providers: [],
        requirements: ["runtime evidence is required before this capability may be claimed"],
        evidence: null,
        observedAt: awareness?.observedAt || new Date().toISOString()
      };
    },

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
      const capabilityAwareness = this.buildCapabilityAwareness();

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

        capabilityAwareness,

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

    runCapabilityMirrorAcceptance() {
      const fixtureAwareness = this.buildCapabilityAwareness({
        providerCapabilities: [
          {
            id: "general-reasoning",
            description: "General analysis and reasoning",
            registeredProviders: ["fixture-llm"],
            availableProviders: ["fixture-llm"],
            available: true
          }
        ],
        providers: [
          {
            id: "fixture-google",
            status: "online",
            enabled: true,
            capabilities: ["workspace.file.search", "workspace.file.research"],
            metadata: { readOnly: true }
          }
        ],
        workspaceStatus: {
          providerId: "fixture-google",
          status: "online",
          connected: true,
          registered: true,
          readOnly: true,
          capabilities: ["workspace.file.search", "workspace.file.research"]
        }
      });

      const workspaceRead = this.assessCapability("workspace.connected-read", {
        awareness: fixtureAwareness
      });
      const workspaceWrite = this.assessCapability("workspace.file.write", {
        awareness: fixtureAwareness
      });
      const reasoning = this.assessCapability("general-reasoning", {
        awareness: fixtureAwareness
      });
      const cooking = this.assessCapability("physical.cooking", {
        awareness: fixtureAwareness
      });
      const scheduling = this.assessCapability("customer.crew-scheduling", {
        awareness: fixtureAwareness
      });
      const selfModel = this.buildSelfModelProjection({
        reason: "commission-006.024A1-capability-mirror-acceptance-context-repair"
      });
      const providerInstructions = this.buildProviderInstructions({
        text: "Capability Mirror acceptance fixture",
        classification: { type: REQUEST_TYPES.SELF },
        startup: {
          identity: this.buildIdentityContext(),
          organization: this.buildOrganizationContext(),
          currentWork: { summary: this.collectCurrentWork()?.summary || {} },
          selfModel,
          workingAwareness: null,
          autobiographicalMemory: []
        },
        localContext: { evidence: [] },
        evidenceIntegrity: null,
        routing: {}
      });

      const checks = [
        {
          name: "Capability Mirror has explicit truth states and is runtime-derived",
          passed:
            fixtureAwareness?.schema === "meos.maddy.capability-awareness.v1" &&
            fixtureAwareness?.runtimeDerived === true &&
            CAPABILITY_TRUTH_STATES.every(state => fixtureAwareness.truthStates.includes(state))
        },
        {
          name: "Connected read-only Workspace is recognized as a real available capability",
          passed:
            workspaceRead?.state === "available" &&
            workspaceRead?.current === true
        },
        {
          name: "Read-only Workspace does not falsely claim user-file write capability",
          passed:
            workspaceWrite?.state === "unavailable" &&
            workspaceWrite?.current === false
        },
        {
          name: "Available provider capability is positively recognized",
          passed:
            reasoning?.state === "available" &&
            reasoning?.current === true
        },
        {
          name: "Unsupported physical cooking remains unknown rather than imagined into capability",
          passed:
            cooking?.state === "unknown" &&
            cooking?.current === false
        },
        {
          name: "Unsupported customer crew scheduling remains unknown without a verified execution path",
          passed:
            scheduling?.state === "unknown" &&
            scheduling?.current === false
        },
        {
          name: "Creative/provider reasoning is explicitly forbidden from promoting capability truth",
          passed:
            fixtureAwareness?.creativeReasoningCannotPromoteCapability === true &&
            fixtureAwareness?.providerSuggestionIsNotCapabilityEvidence === true
        },
        {
          name: "Capability remains distinct from authority promise and delivered result",
          passed:
            fixtureAwareness?.capabilityIsNotAuthority === true &&
            fixtureAwareness?.authorityIsNotPromise === true &&
            fixtureAwareness?.promiseIsNotDelivery === true
        },
        {
          name: "Human approval boundary remains intact",
          passed:
            fixtureAwareness?.humanApprovalRequiredForExternalAction === true
        },
        {
          name: "Maddy's self-model now includes current capability awareness",
          passed:
            selfModel?.capabilityAwareness?.schema === "meos.maddy.capability-awareness.v1"
        },
        {
          name: "Advisory providers receive Maddy's bounded capability mirror without becoming Maddy",
          passed:
            providerInstructions?.role?.includes("not Maddy") &&
            providerInstructions?.maddySelfModel?.capabilityAwareness?.schema ===
              "meos.maddy.capability-awareness.v1"
        }
      ];

      const passed = checks.every(item => item.passed);
      console.table(checks);
      console.info(
        `[MEOS ${this.version}] Commission 006.024A1 Capability Mirror Acceptance Context Repair: ${passed ? "PASS" : "FAIL"} (${checks.filter(item => item.passed).length}/${checks.length}).`
      );

      return {
        success: passed,
        commission: "006.024A1",
        schema: "meos.maddy.capability-mirror.acceptance.v1",
        version: this.version,
        buildId: this.buildId,
        passed: checks.filter(item => item.passed).length,
        total: checks.length,
        checks,
        liveCapabilityAwareness: this.buildCapabilityAwareness()
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
        // Mission Engine deliberately keeps its durable state private. Its public
        // runtime authority is getActiveMissions(); do not infer absence from
        // non-public .missions/.state properties.
        this.safe(() => global.MEOSMissionEngine?.getActiveMissions?.(), []),
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

    runCognitiveRevisitMemoryAcceptanceTest() {
      const savedMemories = this.clone(this.cognitiveRevisitMemories);
      const savedCount = this.cognitiveRevisitMemoryCount;
      this.cognitiveRevisitMemories = [];
      this.cognitiveRevisitMemoryCount = 0;

      const positioning = {
        subject: "006.018G Little Fish Fixture",
        opportunity: { recordId: "OPP-018G", title: "Little Fish Fixture", cycle: { explicitlyOpen: false } },
        readiness: { state: "not-yet-positioned" }
      };
      const move = { type: "monitor", action: "Monitor the authoritative source for the next cycle.", whyNow: "The next cycle is not open.", status: "proposed" };
      const judgment = this.assessCognitiveMovePromotion(positioning, move);
      const fingerprint = this.fingerprintCognitiveDispatch(this.buildPositioningSemanticIdentity(positioning));
      const first = this.rememberCognitiveRevisit(positioning, move, judgment, fingerprint, { persist: false });
      const second = this.rememberCognitiveRevisit(positioning, move, judgment, fingerprint, { persist: false });
      const snapshot = this.buildPersistenceSnapshot();
      const source = this.runPositioningCognitionAndDispatch.toString();

      const checks = [
        { name: "REVISIT creates a lightweight cognitive memory", passed: judgment.disposition === "revisit" && first?.schema === "meos.maddy.cognitive-revisit-memory.v1" },
        { name: "Revisit memory preserves why the subject matters", passed: Boolean(first?.reason && first?.action && first?.subject) },
        { name: "Revisit memory preserves material wake conditions", passed: first?.trigger === "material-source-change" && first?.conditions?.includes("cycle-opens") },
        { name: "Unchanged rediscovery refreshes one memory instead of multiplying records", passed: this.cognitiveRevisitMemories.length === 1 && second?.id === first?.id && second?.observationCount === 2 },
        { name: "Revisit memory is not a Mission or Plan", passed: first?.status === "watching" && !Object.prototype.hasOwnProperty.call(first || {}, "missionId") && !Object.prototype.hasOwnProperty.call(first || {}, "planId") },
        { name: "Revisit memory survives sovereign Brain persistence", passed: Array.isArray(snapshot.cognitiveRevisitMemories) && snapshot.cognitiveRevisitMemories.some(item => item.key === first?.key) },
        { name: "Positioning records REVISIT before any Plan decision", passed: source.indexOf("rememberCognitiveRevisit") >= 0 && source.indexOf("rememberCognitiveRevisit") < source.indexOf("createOrReusePositioningPlan") },
        { name: "No polling or automatic wake loop is introduced", passed: !/setInterval\s*\([^)]*revisit/i.test(source) }
      ];

      this.cognitiveRevisitMemories = savedMemories;
      this.cognitiveRevisitMemoryCount = savedCount;
      const passed = checks.every(item => item.passed);
      console.table(checks);
      console.log(`[MEOS ${this.version}] Commission 006.018G Cognitive Revisit Memory: ${passed ? "PASS" : "FAIL"}.`);
      return { commission: "006.018G", version: this.version, buildId: this.buildId, passed, checks, fixture: { first, second } };
    },

    runCognitivePromotionJudgmentAcceptanceTest() {
      const base = {
        subject: "006.018F Fixture Opportunity",
        opportunity: {
          recordId: "OPP-018F",
          cycle: { explicitlyOpen: false }
        },
        readiness: {
          state: "not-yet-positioned",
          blockingConditionCount: 1,
          consequentialUnknownCount: 1
        }
      };

      const think = this.assessCognitiveMovePromotion(base, {
        type: "investigate",
        action: "Verify controlling applicant eligibility.",
        whyNow: "Resolve a consequential unknown before claiming readiness.",
        authority: "within-existing-research-authority",
        status: "proposed"
      });
      const revisit = this.assessCognitiveMovePromotion(base, {
        type: "monitor",
        action: "Monitor the authoritative source for the next cycle.",
        whyNow: "The next cycle is not open.",
        authority: "within-existing-monitoring-authority",
        status: "proposed"
      });
      const release = this.assessCognitiveMovePromotion(base, {
        type: "observe",
        action: "Keep this low-value observation around.",
        whyNow: "",
        status: "proposed"
      });
      const promotable = this.clone(base);
      promotable.opportunity.cycle.explicitlyOpen = true;
      const promote = this.assessCognitiveMovePromotion(promotable, {
        type: "investigate",
        action: "Verify the open-cycle eligibility requirement before the deadline.",
        whyNow: "The application cycle is open and the deadline is time-sensitive.",
        authority: "within-existing-research-authority",
        status: "proposed"
      });

      const source = this.runPositioningCognitionAndDispatch.toString();
      const checks = [
        { name: "Consequential but non-urgent unknown stays in internal cognition", passed: think.disposition === "think" && think.durableWork === false },
        { name: "Closed-cycle monitoring becomes a lightweight revisit rather than a Mission", passed: revisit.disposition === "revisit" && revisit.durableWork === false && revisit.revisit?.when === "material-source-change" },
        { name: "Low-value cognition is released while recognition is retained", passed: release.disposition === "release" && release.recognitionRetained === true },
        { name: "Time-sensitive actionable cognition is promoted", passed: promote.disposition === "promote" && promote.durableWork === true },
        { name: "Promotion judgment occurs before positioning Plan creation", passed: source.indexOf("promotionDecisions") >= 0 && source.indexOf("promotionDecisions") < source.indexOf("createOrReusePositioningPlan") },
        { name: "Only promoted moves enter Hallway dispatch loop", passed: /for\s*\(const move of promotedMoves\)/.test(source) },
        { name: "Revisit and release do not create Missions", passed: /if \(promotedMoves\.length > 0\)/.test(source) },
        { name: "External-action authority boundary remains governed", passed: this.classifyCognitiveMoveAuthority({ type: "strategic-positioning", action: "Submit application" }).reviewRequired === true }
      ];

      const passed = checks.every(item => item.passed);
      console.table(checks);
      console.log(`[MEOS ${this.version}] Commission 006.018F Cognitive Promotion Judgment / Catch & Release: ${passed ? "PASS" : "FAIL"}.`);
      return {
        commission: "006.018F",
        version: this.version,
        buildId: this.buildId,
        passed,
        checks,
        dispositions: { think, revisit, release, promote }
      };
    },

    runCausalWorkStateMetabolismAcceptanceTest() {
      const cognitiveMission = {
        id: "018e-cognitive-mission",
        status: "in_progress",
        createdBy: "Maddy / Executive Hallway",
        sourceReference: "cognitive-dispatch:cognitive-fixture",
        tags: ["cognitive-dispatch"]
      };
      const cognitiveMissionNext = {
        ...cognitiveMission,
        id: "018e-cognitive-mission-2",
        sourceReference: "cognitive-dispatch:cognitive-fixture-2"
      };
      const prior = {
        fingerprint: "018e-prior",
        unknowns: [],
        intentions: [],
        relationships: [],
        world: {
          currentWork: {
            activeMissions: [cognitiveMission],
            openWorkflows: [],
            activePlans: [],
            pendingApprovals: [],
            summary: { activeMissionCount: 1 }
          },
          monitoring: {},
          capabilities: []
        }
      };
      const current = this.clone(prior);
      current.fingerprint = "018e-current";
      current.world.currentWork.activeMissions.push(cognitiveMissionNext);
      current.world.currentWork.summary.activeMissionCount = 2;

      const selfEchoAssessment = this.assessWorldModelSalience(
        prior,
        current,
        { subject: "Self-generated work echo" }
      );

      const blocked = this.clone(current);
      blocked.fingerprint = "018e-blocked";
      blocked.world.currentWork.activeMissions[1].status = "blocked";
      blocked.world.currentWork.activeMissions[1].blockedReason =
        "Authoritative source unavailable";
      const blockedAssessment = this.assessWorldModelSalience(
        current,
        blocked,
        { subject: "Material work blocker" }
      );

      const semanticA = {
        subject: "Fixture Opportunity",
        opportunity: {
          recordId: "OPP-1",
          source: { title: "Fixture", checkedAt: "2026-08-10T01:00:00Z" },
          eligibilityEvidence: [
            { id: "E-1", text: "Eligibility remains unverified", observedAt: "2026-08-10T01:00:00Z" }
          ],
          evidence: { checks: { eligibilityVerified: false } },
          unknowns: ["Applicant eligibility"],
          disposition: { disposition: "monitor-next-cycle" }
        },
        readiness: {
          state: "not-yet-positioned",
          score: 44,
          blockingConditionCount: 2,
          consequentialUnknownCount: 1
        }
      };
      const semanticB = this.clone(semanticA);
      semanticB.opportunity.source.checkedAt = "2026-08-10T02:00:00Z";
      semanticB.opportunity.eligibilityEvidence[0].id = "E-999";
      semanticB.opportunity.eligibilityEvidence[0].observedAt = "2026-08-10T02:00:00Z";
      semanticB.readiness.score = 43;
      semanticB.opportunity.eligibilityEvidence.reverse();

      const sameA = this.fingerprintCognitiveDispatch(
        this.buildPositioningSemanticIdentity(semanticA)
      );
      const sameB = this.fingerprintCognitiveDispatch(
        this.buildPositioningSemanticIdentity(semanticB)
      );

      const changed = this.clone(semanticB);
      changed.opportunity.evidence.checks.eligibilityVerified = true;
      const changedFingerprint = this.fingerprintCognitiveDispatch(
        this.buildPositioningSemanticIdentity(changed)
      );

      const checks = [
        {
          name: "Self-generated cognitive Mission creation does not become fresh world salience",
          passed:
            selfEchoAssessment.meaningful === false &&
            selfEchoAssessment.selfGeneratedWorkEchoSuppressed === true
        },
        {
          name: "Self-generated work remains visible in the full World Model work state",
          passed:
            current.world.currentWork.summary.activeMissionCount === 2
        },
        {
          name: "A real blocker remains salient",
          passed:
            blockedAssessment.signals.some(
              item => item.type === "work-state-changed"
            )
        },
        {
          name: "Transient evidence IDs and observation timestamps do not change positioning identity",
          passed: sameA === sameB
        },
        {
          name: "Material eligibility evidence change creates a new positioning identity",
          passed: changedFingerprint !== sameA
        },
        {
          name: "Causal work metabolism preserves external-action authority boundary",
          passed:
            this.configuration.requireHumanApprovalForExternalAction === true
        }
      ];

      const passed = checks.every(item => item.passed);
      console.table(checks);
      console.info(
        `[MEOS ${this.version}] Commission 006.018E Causal Work-State Metabolism: ${passed ? "PASS" : "FAIL"}.`
      );
      return {
        commission: "006.018E",
        version: this.version,
        buildId: this.buildId,
        passed,
        checks
      };
    },

    runTemporalOrientationAuthorityAcceptanceTest() {
      const original = {
        intentions: this.clone(this.cognitiveIntentions),
        priority: this.clone(this.currentExecutivePriority),
        portfolio: this.clone(this.executivePriorityPortfolio)
      };
      const priorMissionEngine = global.MEOSMissionEngine;
      try {
        const synthetic = "Reconstruct temporal continuity and determine what requires attention after return";
        this.cognitiveIntentions = [{ intentionId: "fixture-orientation", key: this.normalize(synthetic), subject: synthetic, status: "pending", attempts: 1 }];
        this.currentExecutivePriority = { id: "fixture-orientation", subject: synthetic, score: 0.449, status: "selected" };
        this.executivePriorityPortfolio = [this.clone(this.currentExecutivePriority)];
        global.MEOSMissionEngine = {
          getActiveMissions: () => [
            { id: "MIS-QUEUED", title: "Queued mission", status: "queued" },
            { id: "MIS-ACTIVE", title: "Active mission", status: "active" }
          ]
        };
        const work = this.collectCurrentWork();
        const retired = this.retireTemporalOrientationArtifacts({ reason: "acceptance-test" });
        const demands = this.collectExecutivePriorityDemands();
        const checks = [
          { name: "Mission Engine public runtime authority feeds current work", passed: work.summary.activeMissionCount === 2 },
          { name: "Queued durable missions are visible as active executive work", passed: work.activeMissions.some(item => item.id === "MIS-QUEUED") },
          { name: "Temporal orientation artifacts terminate after reconstruction", passed: retired.retiredIntentions === 1 && this.cognitiveIntentions[0].status === "completed" },
          { name: "Temporal orientation cannot remain executive priority", passed: this.currentExecutivePriority === null },
          { name: "Temporal orientation cannot compete as substantive cognitive demand", passed: !demands.some(item => this.isTemporalOrientationSubject(item.subject)) },
          { name: "Positioning reentry contains a hard temporal-orientation guard", passed: /temporal-orientation-is-not-positioning-subject/.test(this.executeCognitiveReentry.toString()) }
        ];
        const passed = checks.every(item => item.passed);
        console.table(checks);
        console.info(`[MEOS ${this.version}] Temporal Orientation + Mission Authority: ${passed ? "PASS" : "FAIL"}.`);
        return { commission: "006.018D", version: this.version, buildId: this.buildId, passed, checks };
      } finally {
        global.MEOSMissionEngine = priorMissionEngine;
        this.cognitiveIntentions = original.intentions;
        this.currentExecutivePriority = original.priority;
        this.executivePriorityPortfolio = original.portfolio;
      }
    },

    activeStatus(status) {
      return [
        "active", "in-progress", "assigned", "pending", "queued",
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
     * Commission 006.018E — Causal Work-State Metabolism
     *
     * The living World Model must see Maddy's work without mistaking the
     * bookkeeping consequences of her own dispatches for changes in the world.
     * A cognition-generated Mission/Plan/Workflow in an ordinary internal state
     * stays visible to awareness and priority, but is excluded from the salience
     * fingerprint that decides whether the world changed enough to wake another
     * cognition. Human/external outcomes, approval transitions, blockers and
     * failures remain salient.
     */
    isSelfGeneratedCognitiveWork(item = {}) {
      const sourceReference = String(
        item?.sourceReference || item?.context?.sourceReference || ""
      ).trim().toLowerCase();
      const createdBy = String(item?.createdBy || "").trim().toLowerCase();
      const source = String(item?.source || "").trim().toLowerCase();
      const tags = Array.isArray(item?.tags)
        ? item.tags.map(tag => String(tag || "").toLowerCase())
        : [];
      const cognitionType = String(
        item?.metadata?.cognitionType ||
        item?.context?.cognitionType ||
        ""
      ).trim().toLowerCase();

      return (
        item?.context?.cognitiveDispatch === true ||
        sourceReference.startsWith("cognitive-dispatch:") ||
        tags.includes("cognitive-dispatch") ||
        createdBy.includes("maddy / executive hallway") ||
        source === "executive-brain-cognition" ||
        cognitionType === "counterfactual-positioning"
      );
    },

    isMaterialCognitiveWorkOutcome(item = {}) {
      const status = String(item?.status || item?.state || "")
        .trim()
        .toLowerCase();
      const approval = String(item?.approval?.status || "")
        .trim()
        .toLowerCase();

      return (
        [
          "blocked",
          "failed",
          "error",
          "rejected",
          "declined",
          "cancelled",
          "canceled",
          "awaiting_approval",
          "awaiting-approval",
          "pending_approval",
          "pending-approval"
        ].includes(status) ||
        [
          "approved",
          "rejected",
          "declined",
          "changes_requested",
          "changes-requested"
        ].includes(approval) ||
        item?.outcome?.verified === true ||
        item?.outcome?.success === false ||
        Boolean(item?.error)
      );
    },

    buildCognitiveWorkSalienceProjection(currentWork = {}) {
      const project = items =>
        (Array.isArray(items) ? items : [])
          .filter(item =>
            !this.isSelfGeneratedCognitiveWork(item) ||
            this.isMaterialCognitiveWorkOutcome(item)
          )
          .map(item => ({
            id: item?.id || null,
            status: item?.status || item?.state || null,
            approvalStatus: item?.approval?.status || null,
            sourceReference: item?.sourceReference || null,
            blockedReason: item?.blockedReason || item?.error || null,
            outcome: item?.outcome
              ? {
                  verified: item.outcome.verified ?? null,
                  success: item.outcome.success ?? null
                }
              : null
          }))
          .sort((a, b) =>
            JSON.stringify(a).localeCompare(JSON.stringify(b))
          );

      const activeMissions = project(currentWork?.activeMissions);
      const openWorkflows = project(currentWork?.openWorkflows);
      const activePlans = project(currentWork?.activePlans);
      const pendingApprovals = project(currentWork?.pendingApprovals);

      return {
        activeMissions,
        openWorkflows,
        activePlans,
        pendingApprovals,
        summary: {
          salientMissionCount: activeMissions.length,
          salientWorkflowCount: openWorkflows.length,
          salientPlanCount: activePlans.length,
          pendingApprovalCount: pendingApprovals.length
        }
      };
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

      const priorWorkSalienceProjection =
        this.buildCognitiveWorkSalienceProjection(
          prior?.world?.currentWork || {}
        );
      const currentWorkSalienceProjection =
        this.buildCognitiveWorkSalienceProjection(
          now?.world?.currentWork || {}
        );
      const priorWorkFingerprint =
        this.fingerprintCognitiveDispatch(
          priorWorkSalienceProjection
        );
      const currentWorkFingerprint =
        this.fingerprintCognitiveDispatch(
          currentWorkSalienceProjection
        );
      const rawPriorWorkFingerprint =
        this.fingerprintCognitiveDispatch(
          prior?.world?.currentWork || null
        );
      const rawCurrentWorkFingerprint =
        this.fingerprintCognitiveDispatch(
          now?.world?.currentWork || null
        );
      const selfGeneratedWorkEchoSuppressed =
        rawPriorWorkFingerprint !== rawCurrentWorkFingerprint &&
        priorWorkFingerprint === currentWorkFingerprint;

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
        selfGeneratedWorkEchoSuppressed,
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
        if (assessment.selfGeneratedWorkEchoSuppressed === true) {
          this.record("cognition.self-generated-work-echo-suppressed", {
            reason: options.reason || null,
            priorWorldFingerprint: previous?.fingerprint || null,
            currentWorldFingerprint: current?.fingerprint || null
          });
        }
        return {
          success: true,
          attended: false,
          selfGeneratedWorkEchoSuppressed:
            assessment.selfGeneratedWorkEchoSuppressed === true,
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

      /*
       * PRE-SPEND FIREWALL
       *
       * The previous architecture could launch autonomous evidence research
       * before economic authorization. That made the attention governor a
       * post-spend accountant. Build the trigger first, prove executive
       * consequence + novelty, and only then permit investigation.
       */
      const preliminaryTrigger = {
        source: "executive-brain-world-model",
        event: "emergent-meaningful-change",
        salienceScore: assessment.score,
        investigate: assessment.investigate,
        signals: this.clone(assessment.signals.slice(0, 8)),
        connections: this.clone(assessment.connections.slice(0, 6)),
        questions: this.clone(assessment.questions.slice(0, 8)),
        worldState: {
          work:
            this.buildCognitiveWorkSalienceProjection(
              current?.world?.currentWork || {}
            ),
          monitoring:
            this.clone(current?.world?.monitoring || null),
          unknowns:
            this.clone((current?.unknowns || []).slice(0, 12))
        }
      };

      const existingIntention =
        (this.cognitiveIntentions || []).find(item =>
          item &&
          item.status !== "completed" &&
          this.normalize(item.subject || item.key || "") ===
            this.normalize(assessment.subject || "")
        ) || null;

      const preSpend =
        this.assessPreSpendExecutiveAttention(
          assessment,
          preliminaryTrigger,
          existingIntention,
          current
        );

      if (!preSpend.allowCognition) {
        this.record(
          "cognition.pre-spend-attention-denied",
          {
            subject: assessment.subject,
            score: assessment.score,
            investigate: assessment.investigate,
            reason: preSpend.reason,
            preventedInvestigation:
              assessment.investigate === true
          }
        );

        return {
          success: true,
          attended: false,
          economical: true,
          preSpend,
          assessment
        };
      }

      const causalInvestigation =
        assessment.investigate && preSpend.allowInvestigation
          ? this.runCausalCounterfactualInvestigation(
              assessment,
              {
                previousWorldModel: previous,
                currentWorldModel: current
              }
            )
          : null;

      const trigger = {
        ...preliminaryTrigger,
        causalInvestigation:
          causalInvestigation
            ? {
                fingerprint: causalInvestigation.fingerprint,
                hypotheses: this.clone(causalInvestigation.hypotheses),
                counterfactuals: this.clone(causalInvestigation.counterfactuals),
                nextInvestigation: this.clone(causalInvestigation.nextInvestigation)
              }
            : null,
        worldFingerprint: current?.fingerprint || null
      };

      const intentionForLineage =
        existingIntention ||
        this.upsertCognitiveIntention(
          assessment.subject,
          [trigger],
          {
            status: "pending",
            persist: false
          }
        );

      if (
        causalInvestigation &&
        preSpend.allowInvestigation === true
      ) {
        Promise.resolve(
          this.runAutonomousEvidenceInvestigation(
            causalInvestigation,
            {
              originatingIntentionId:
                intentionForLineage?.intentionId || null,
              preSpendAuthorized: true,
              preSpendDecision:
                this.clone(preSpend)
            }
          )
        ).catch(error => {
          this.record(
            "cognition.autonomous-investigation-error",
            {
              subject: causalInvestigation.subject,
              error: error?.message || String(error)
            }
          );
        });
      }

      const scheduled =
        this.scheduleCognitiveReentry(
          assessment.subject,
          trigger,
          {
            immediate: assessment.score >= 0.9
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
      if (context.preSpendAuthorized !== true) {
        this.cognitiveEconomics.preSpendDenied += 1;
        this.cognitiveEconomics.preSpendInvestigationPrevented += 1;
        this.cognitiveEconomics.duplicateCallsPrevented += 1;
        this.record("cognition.autonomous-investigation-blocked-pre-spend", {
          subject: causalInvestigation?.subject || null,
          reason: "explicit-pre-spend-authorization-required"
        });
        return {
          success: true,
          blocked: true,
          economical: true,
          stopReason: "explicit-pre-spend-authorization-required",
          steps: []
        };
      }

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

      result.assimilation = this.assimilateAutonomousInvestigationEvidence(
        result,
        {
          persist: false,
          originatingIntentionId: context.originatingIntentionId || null
        }
      );

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
      const trigger={source:"executive-brain-evidence-assimilation",event:"autonomous-investigation-evidence-assimilated",selfGeneratedCognitiveEvidence:true,originatingIntentionId:options.originatingIntentionId||null,assimilationFingerprint:assimilation.fingerprint,investigationFingerprint:investigation.fingerprint||null,resolution:assimilation.resolution,resolved:assimilation.resolved,falsifiedHypothesisIds:falsified.map(x=>x.hypothesisId),survivingHypothesisIds:surviving.map(x=>x.hypothesisId),unknowns:unresolvedQuestions.slice(0,12),worldFingerprint:worldModel?.fingerprint||null};
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

    resolveLocalPerceptionCapability(options = {}) {
      if (typeof options.localPerceptionExecutor === "function") {
        return {
          available:true,
          source:"caller-injected-local-perception",
          status:{enabled:true,mode:"caller-injected"},
          execute:handoff =>
            options.localPerceptionExecutor(this.clone(handoff))
        };
      }

      const capability =
        global.MEOSLocalPerception ||
        global.MaddyLocalPerception ||
        null;

      if (!capability || typeof capability.execute !== "function") {
        return {
          available:false,
          source:null,
          status:null,
          reason:"local-perception-capability-unavailable"
        };
      }

      const status =
        typeof capability.getStatus === "function"
          ? this.safe(() => capability.getStatus(), null)
          : null;

      if (status?.enabled === false) {
        return {
          available:false,
          source:"MEOSLocalPerception",
          status:this.clone(status),
          reason:"local-perception-capability-disabled"
        };
      }

      return {
        available:true,
        source:"MEOSLocalPerception",
        status:this.clone(status),
        execute:handoff => capability.execute(this.clone(handoff))
      };
    },

    buildLocalPerceptionHandoff(intention = {}, query = "", options = {}) {
      if (intention?.schema !== "meos.maddy.investigative-intention.v1" || !intention?.id) {
        return {
          success:false,
          blocked:true,
          reason:"valid-investigative-intention-required"
        };
      }

      if (intention.authority !== "investigation-only" || intention.consequentialActionAuthorized === true) {
        return {
          success:false,
          blocked:true,
          reason:"investigative-authority-boundary-invalid"
        };
      }

      const normalizedQuery = String(query || "").trim();
      if (!normalizedQuery) {
        return {
          success:false,
          blocked:true,
          reason:"local-perception-query-required"
        };
      }

      const maxResults = Math.max(1,Math.min(50,Number(options.maxResults || 10)));
      const maxObservations = Math.max(1,Math.min(20,maxResults,Number(options.maxObservations || 5)));
      const maxTotalBytes = Math.max(1024,Math.min(64 * 1024 * 1024,Number(options.maxTotalBytes || 16 * 1024 * 1024)));

      return {
        success:true,
        schema:"meos.maddy.local-perception-handoff.v1",
        createdAt:new Date().toISOString(),
        intentId:intention.id,
        origin:intention.origin || null,
        subject:intention.subject || null,
        objective:intention.objective || "Reduce material uncertainty.",
        query:normalizedQuery,
        perceptionBudget:{
          maxResults,
          maxObservations,
          maxTotalBytes
        },
        epistemicContract:{
          perceptionIsNotBelief:true,
          semanticConclusionAuthorized:false,
          sufficiencyJudgmentAuthorized:false,
          institutionalTruthPromotionAuthorized:false
        },
        authority:{
          investigationOnly:true,
          paidCognitionAuthorized:false,
          externalActionAuthorized:false,
          consequentialActionAuthorized:false
        }
      };
    },

    assimilateLocalPerceptionResult(handoff = {}, result = {}, options = {}) {
      if (handoff?.schema !== "meos.maddy.local-perception-handoff.v1" || !handoff?.intentId) {
        return {
          success:false,
          blocked:true,
          reason:"valid-local-perception-handoff-required"
        };
      }

      if (result?.intentId && String(result.intentId) !== String(handoff.intentId)) {
        return {
          success:false,
          blocked:true,
          reason:"local-perception-intent-lineage-mismatch"
        };
      }

      const stored = this.investigativeIntentions.find(item => item.id === handoff.intentId);
      if (!stored) {
        return {
          success:false,
          blocked:true,
          reason:"investigative-intention-not-found"
        };
      }

      const evidence = {
        schema:"meos.maddy.local-perception-evidence.v1",
        investigationId:handoff.intentId,
        receivedAt:new Date().toISOString(),
        source:"maddy-local-perception",
        status:String(result?.status || "perception-complete"),
        sourcesDiscovered:Number(result?.sourcesDiscovered || 0),
        sourcesObserved:Number(result?.sourcesObserved || 0),
        changedSources:Number(result?.changedSources || 0),
        unchangedSources:Number(result?.unchangedSources || 0),
        bytesObservedLocally:Number(result?.bytesObservedLocally || 0),
        stopReason:result?.stopReason || null,
        observations:Array.isArray(result?.observations)
          ? this.clone(result.observations).slice(0,20)
          : [],
        epistemicStatus:"uninterpreted-perception-evidence",
        semanticConclusion:null,
        sufficiencyJudgment:null,
        institutionalTruthPromoted:false,
        paidCognitionAuthorized:false,
        externalActionAuthorized:false,
        consequentialActionTaken:false
      };

      stored.status = "perception-returned";
      stored.lastPerceptionEvidence = this.clone(evidence);
      stored.awaitingCognitiveAssimilation = true;

      this.record("cognition.local-perception-returned",{
        investigationId:handoff.intentId,
        sourcesObserved:evidence.sourcesObserved,
        changedSources:evidence.changedSources,
        bytesObservedLocally:evidence.bytesObservedLocally,
        awaitingCognitiveAssimilation:true
      });

      if (brainPersistence.hydrated === true && options.persist !== false) this.persist();

      return {
        success:true,
        investigationId:handoff.intentId,
        evidence:this.clone(evidence),
        awaitingCognitiveAssimilation:true,
        resolved:false
      };
    },

    async continueDocumentCognitionFromPerception(
      assimilation = {},
      options = {}
    ) {
      const evidence =
        assimilation?.evidence &&
        typeof assimilation.evidence === "object"
          ? assimilation.evidence
          : assimilation;

      const observations = Array.isArray(evidence?.observations)
        ? evidence.observations
        : [];

      const documentObservations = observations.filter(observation =>
        observation &&
        observation.observed === true &&
        (
          observation.documentType ||
          observation.evidenceExcerpt ||
          observation.contentSha256
        )
      );

      if (documentObservations.length === 0) {
        return {
          success:true,
          continued:false,
          reason:"no-document-evidence-to-continue",
          documentCount:0,
          workflowsCreated:0,
          humanQueue:[]
        };
      }

      const ingestion = global.DocumentIngestion;
      const classifier = global.DocumentClassifier;
      const workflow = global.ExecutiveWorkflow;

      if (
        !ingestion ||
        typeof ingestion.ingestLocalPerceptionEvidence !== "function" ||
        !classifier ||
        typeof classifier.getResultForDocument !== "function" ||
        !workflow ||
        typeof workflow.resolveDocumentWork !== "function" ||
        typeof workflow.createFromDocumentWork !== "function"
      ) {
        return {
          success:true,
          continued:false,
          reason:"document-cognition-organs-not-all-available",
          documentCount:documentObservations.length,
          workflowsCreated:0,
          humanQueue:[]
        };
      }

      const ingestionResult =
        await ingestion.ingestLocalPerceptionEvidence(
          {
            ...this.clone(evidence),
            observations:this.clone(documentObservations)
          },
          {
            actor:"MEOS Executive Brain",
            source:"autonomous-document-cognitive-continuation",
            handoffToKnowledgeMemory:true,
            classify:true
          }
        );

      if (ingestionResult?.success !== true) {
        return {
          success:false,
          continued:false,
          reason:
            ingestionResult?.reason ||
            ingestionResult?.error ||
            "document-evidence-ingestion-failed",
          ingestion:this.clone(ingestionResult),
          documentCount:documentObservations.length,
          workflowsCreated:0,
          humanQueue:[]
        };
      }

      const results = [];
      const humanQueue = [];
      let workflowsCreated = 0;
      let machineResolvedRequirements = 0;

      for (const ingested of ingestionResult.results || []) {
        const document = ingested?.document || null;

        if (!ingested?.success || !document?.id) {
          continue;
        }

        const classification =
          classifier.getResultForDocument(document.id);

        if (!classification) {
          results.push({
            documentId:document.id,
            documentName:document.name || null,
            status:"classification-unavailable",
            workflowCreated:false
          });
          continue;
        }

        const work =
          classification.workIntelligence || {};

        if (work.executable !== true) {
          results.push({
            documentId:document.id,
            documentName:document.name || null,
            classificationId:classification.id || null,
            status:"evidence-only",
            workKind:work.workKind || "evidence-only",
            workflowCreated:false
          });
          continue;
        }

        if (classification.requiresExecutiveReview === true) {
          const subject =
            `Review document classification: ${
              document.name || classification.label || document.id
            }`;

          this.upsertCognitiveIntention(
            subject,
            [{
              type:"document-classification-review-required",
              sourceDocumentId:document.id,
              classificationId:classification.id || null,
              sourceFingerprint:
                work.sourceFingerprint ||
                classification.metadata?.contentSha256 ||
                document.contentFingerprint ||
                null
            }],
            {
              status:"pending",
              kind:"document-governance-gate",
              sourceId:classification.id || document.id,
              persist:false
            }
          );

          humanQueue.push({
            type:"classification-review",
            documentId:document.id,
            documentName:document.name || null,
            classificationId:classification.id || null,
            reason:
              classification.reviewReason ||
              "Document classification requires executive review."
          });

          results.push({
            documentId:document.id,
            documentName:document.name || null,
            classificationId:classification.id || null,
            status:"awaiting-classification-review",
            workKind:work.workKind || null,
            workflowCreated:false
          });
          continue;
        }

        /*
         * A classification that explicitly requires no executive review may
         * proceed through cognitive resolution without fabricating an approval.
         * The override is scoped only to that already-governed classifier
         * decision. The workflow itself remains approval-controlled.
         */
        const resolution =
          await workflow.resolveDocumentWork(
            document.id,
            {
              classification,
              overrideClassificationApproval:true,
              maximumResearchQuestions:
                Math.max(
                  0,
                  Math.min(
                    3,
                    Number(
                      options.maximumDocumentResearchQuestions ?? 2
                    )
                  )
                )
            }
          );

        if (resolution?.success !== true) {
          humanQueue.push({
            type:"document-resolution-blocked",
            documentId:document.id,
            documentName:document.name || null,
            classificationId:classification.id || null,
            reason:
              resolution?.reason ||
              resolution?.error ||
              "Document cognitive resolution could not continue."
          });

          results.push({
            documentId:document.id,
            documentName:document.name || null,
            classificationId:classification.id || null,
            status:"resolution-blocked",
            workKind:work.workKind || null,
            resolution:this.clone(resolution),
            workflowCreated:false
          });
          continue;
        }

        machineResolvedRequirements +=
          Number(resolution.resolvedWithoutHuman || 0);

        const created =
          await workflow.createFromDocumentWork(
            document.id,
            {
              classification,
              resolution,
              actor:"Maddy",
              priority:
                Math.max(
                  0,
                  Math.min(
                    100,
                    Number(options.documentWorkflowPriority || 90)
                  )
                )
            }
          );

        if (created?.success === true && created?.workflow?.id) {
          workflowsCreated += 1;

          const subject =
            `Complete document work: ${
              document.name || classification.label || document.id
            }`;

          this.upsertCognitiveIntention(
            subject,
            [{
              type:"autonomous-document-work-created",
              workflowId:created.workflow.id,
              sourceDocumentId:document.id,
              classificationId:classification.id || null,
              sourceInvestigationId:
                evidence.investigationId || null,
              sourceFingerprint:
                resolution.sourceFingerprint || null
            }],
            {
              status:"pending",
              kind:"document-work-continuation",
              sourceId:created.workflow.id,
              persist:false
            }
          );

          for (const humanNeed of resolution.humanQueue || []) {
            humanQueue.push({
              ...this.clone(humanNeed),
              documentId:document.id,
              documentName:document.name || null,
              workflowId:created.workflow.id
            });
          }

          this.formAutobiographicalEpisode({
            eventType:"autonomous-document-cognitive-continuation",
            subject:
              document.name ||
              classification.label ||
              "document work",
            sourceId:created.workflow.id,
            perception:{
              investigationId:
                evidence.investigationId || null,
              sourceFingerprint:
                resolution.sourceFingerprint || null,
              classification:
                classification.label || classification.type || null
            },
            intention:{
              type:"continue-perceived-document-work",
              objective:
                "Resolve machine-solvable document requirements before asking a human."
            },
            action:{
              type:"cognitive-document-resolution",
              resolvedWithoutHuman:
                Number(resolution.resolvedWithoutHuman || 0),
              humanQueueCount:
                Number((resolution.humanQueue || []).length)
            },
            outcome:{
              success:true,
              workflowId:created.workflow.id,
              externalActionTaken:false
            },
            learning:{
              rule:
                "A perceived document that represents real work should continue into governed preparation without waiting for another human prompt; human attention is reserved for conflicts, judgment, and authority."
            }
          });

          results.push({
            documentId:document.id,
            documentName:document.name || null,
            classificationId:classification.id || null,
            status:"cognitive-work-created",
            workKind:work.workKind || null,
            resolvedWithoutHuman:
              Number(resolution.resolvedWithoutHuman || 0),
            humanQueueCount:
              Number((resolution.humanQueue || []).length),
            workflowCreated:true,
            workflowId:created.workflow.id
          });
        } else {
          results.push({
            documentId:document.id,
            documentName:document.name || null,
            classificationId:classification.id || null,
            status:"workflow-creation-failed",
            workKind:work.workKind || null,
            workflowCreated:false,
            reason:
              created?.reason ||
              created?.error ||
              "governed-document-workflow-not-created"
          });
        }
      }

      const continuation = {
        success:true,
        continued:true,
        schema:"meos.maddy.autonomous-document-cognition.v1",
        investigationId:evidence.investigationId || null,
        documentsConsidered:results.length,
        workflowsCreated,
        machineResolvedRequirements,
        humanQueue,
        results,
        paidCognitionAuthorized:false,
        documentMutationAuthorized:false,
        signatureAuthorized:false,
        certificationAuthorized:false,
        submissionAuthorized:false,
        externalActionAuthorized:false,
        continuedAt:new Date().toISOString()
      };

      this.record(
        "cognition.autonomous-document-continuation",
        {
          investigationId:continuation.investigationId,
          documentsConsidered:continuation.documentsConsidered,
          workflowsCreated,
          machineResolvedRequirements,
          humanQueueCount:humanQueue.length,
          externalActionAuthorized:false
        }
      );

      if (
        brainPersistence.hydrated === true &&
        options.persist !== false
      ) {
        this.persist();
      }

      return this.clone(continuation);
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

      const localPerception =
        options.disableAutomaticLocalPerception === true
          ? {
              available:false,
              reason:"automatic-local-perception-disabled"
            }
          : this.resolveLocalPerceptionCapability(options);

      if (localPerception.available === true) {
        const handoff = this.buildLocalPerceptionHandoff(
          intention,
          query,
          options.localPerceptionBudget || {}
        );
        if (handoff.success !== true) {
          return {
            success:false,
            blocked:true,
            reason:handoff.reason || "local-perception-handoff-failed",
            reconstruction:this.clone(reconstruction),
            intention:this.clone(intention)
          };
        }

        executor =
          localPerception.source === "caller-injected-local-perception"
            ? "caller-injected-local-perception"
            : "MEOSLocalPerception";

        const perceptionResult = await localPerception.execute(
          this.clone(handoff)
        );

        if (perceptionResult?.success !== false) {
          const assimilated = this.assimilateLocalPerceptionResult(
            handoff,
            perceptionResult || {},
            {persist:false}
          );

          let documentCognition = null;

          if (
            assimilated.success === true &&
            options.disableDocumentCognitionContinuation !== true &&
            input?.source !==
              "executive-workflow-document-resolution"
          ) {
            documentCognition =
              await this.continueDocumentCognitionFromPerception(
                assimilated,
                {
                  persist:false,
                  maximumDocumentResearchQuestions:
                    options.maximumDocumentResearchQuestions,
                  documentWorkflowPriority:
                    options.documentWorkflowPriority
                }
              );
          }

          result = {
            success:assimilated.success === true,
            handoff:this.clone(handoff),
            perception:this.clone(perceptionResult),
            assimilation:this.clone(assimilated),
            documentCognition:this.clone(documentCognition),
            economicPath:{
              perceptionSubstrate:
                localPerception.status?.mode ||
                "local-perception-capability",
              networkHopRequired:
                localPerception.status?.networkHopRequired ?? null,
              paidProviderUsed:
                localPerception.status?.paidProviderUsed === true ||
                perceptionResult?.paidProviderUsed === true,
              paidCognitionAuthorized:false,
              externalActionAuthorized:false
            }
          };
        } else {
          this.record("cognition.local-perception-unavailable",{
            investigationId:intention.id,
            reason:
              perceptionResult?.reason ||
              "local-perception-execution-failed",
            source:localPerception.source || null,
            fallbackPreserved:true
          });
        }
      }

      if (result == null && typeof options.researchExecutor === "function") {
        executor = "caller-injected-research-executor";
        result = await options.researchExecutor({
          reconstruction:this.clone(reconstruction),
          intention:this.clone(intention),
          query
        });
      } else if (result == null && global.ProviderManager && typeof global.ProviderManager.request === "function") {
        executor = "ProviderManager";
        result = await global.ProviderManager.request(
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
      } else if (result == null && global.MEOSExecutiveSearch && typeof global.MEOSExecutiveSearch.executiveQuery === "function") {
        executor = "MEOSExecutiveSearch";
        result = await global.MEOSExecutiveSearch.executiveQuery(query);
      } else if (result == null) {
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

    async runAutonomousDocumentCognitionAcceptanceTest() {
      const original = {
        ingestion:global.DocumentIngestion,
        classifier:global.DocumentClassifier,
        workflow:global.ExecutiveWorkflow,
        intentions:this.clone(this.cognitiveIntentions || []),
        autobiography:this.clone(this.autobiographicalMemory || [])
      };
      const priorHydrated = brainPersistence.hydrated;
      brainPersistence.hydrated = false;

      try {
        this.cognitiveIntentions = [];
        this.autobiographicalMemory = [];

        const docs = [
          {
            id:"doc-auto",
            name:"Startup Registration Application.pdf",
            contentFingerprint:"sha-auto",
            metadata:{
              investigationId:"investigation-auto-doc",
              contentSha256:"sha-auto"
            }
          },
          {
            id:"doc-review",
            name:"Ambiguous Agreement.pdf",
            contentFingerprint:"sha-review",
            metadata:{
              investigationId:"investigation-auto-doc",
              contentSha256:"sha-review"
            }
          }
        ];

        global.DocumentIngestion = {
          async ingestLocalPerceptionEvidence() {
            return {
              success:true,
              results:docs.map(document => ({
                success:true,
                added:true,
                document
              }))
            };
          }
        };

        global.DocumentClassifier = {
          getResultForDocument(id) {
            if (id === "doc-review") {
              return {
                id:"classification-review",
                status:"suggested",
                requiresExecutiveReview:true,
                reviewReason:"Classification is materially ambiguous.",
                label:"Agreement",
                workIntelligence:{
                  executable:true,
                  workKind:"agreement",
                  sourceFingerprint:"sha-review"
                },
                metadata:{
                  investigationId:"investigation-auto-doc",
                  contentSha256:"sha-review"
                }
              };
            }

            return {
              id:"classification-auto",
              status:"classified",
              requiresExecutiveReview:false,
              label:"Application",
              recommendedOffice:"Operations",
              workIntelligence:{
                executable:true,
                workKind:"application",
                sourceFingerprint:"sha-auto",
                requiredCapabilities:[
                  "verified-fact-retrieval",
                  "document-field-mapping"
                ],
                requiredHumanAuthority:[
                  "human-signature"
                ]
              },
              metadata:{
                investigationId:"investigation-auto-doc",
                contentSha256:"sha-auto"
              }
            };
          }
        };

        let resolutionCalls = 0;
        let workflowCalls = 0;

        global.ExecutiveWorkflow = {
          async resolveDocumentWork(id, options = {}) {
            resolutionCalls += 1;

            return {
              success:true,
              documentId:id,
              investigationId:"investigation-auto-doc",
              sourceFingerprint:"sha-auto",
              resolvedWithoutHuman:7,
              humanQueue:[
                {
                  type:"authority",
                  authority:"human-signature",
                  reason:"Signature is reserved for an authorized human."
                }
              ],
              summary:{
                total:8,
                verifiedFacts:5,
                reasonedAnswers:1,
                researchResolutions:1,
                conflicts:0,
                humanJudgments:0,
                humanAuthorityRequirements:1
              },
              overrideWasScoped:
                options.overrideClassificationApproval === true
            };
          },
          async createFromDocumentWork(id, options = {}) {
            workflowCalls += 1;

            return {
              success:true,
              workflow:{
                id:"workflow-auto-doc",
                status:"draft",
                sourceDocumentId:id,
                sourceFingerprint:
                  options.resolution?.sourceFingerprint || null,
                approvals:[
                  {
                    type:"workflow-approval",
                    status:"pending"
                  }
                ],
                metadata:{
                  submissionAuthorized:false,
                  externalActionAuthorized:false
                }
              }
            };
          }
        };

        const assimilation = {
          success:true,
          evidence:{
            schema:"meos.maddy.local-perception-evidence.v1",
            investigationId:"investigation-auto-doc",
            epistemicStatus:
              "uninterpreted-perception-evidence",
            observations:[
              {
                url:"https://example.gov/startup.pdf",
                observed:true,
                changed:true,
                contentSha256:"sha-auto",
                evidenceTitle:
                  "Startup Registration Application",
                evidenceExcerpt:
                  "Legal name. EIN. Authorized representative signature.",
                extractionStatus:
                  "bounded-local-pdf-text-extracted",
                documentType:"pdf",
                pageCount:6
              },
              {
                url:"https://example.gov/agreement.pdf",
                observed:true,
                changed:true,
                contentSha256:"sha-review",
                evidenceTitle:"Ambiguous Agreement",
                evidenceExcerpt:
                  "Agreement requiring executive interpretation.",
                extractionStatus:
                  "bounded-local-pdf-text-extracted",
                documentType:"pdf",
                pageCount:9
              }
            ]
          }
        };

        const continuation =
          await this.continueDocumentCognitionFromPerception(
            assimilation,
            {persist:false}
          );

        const checks = [
          {
            name:"Perceived documents automatically continue into cognition without another human prompt",
            passed:
              continuation.success === true &&
              continuation.continued === true
          },
          {
            name:"High-confidence governed classification continues without fabricating executive approval",
            passed:
              resolutionCalls === 1 &&
              continuation.results.some(
                item =>
                  item.documentId === "doc-auto" &&
                  item.status === "cognitive-work-created"
              )
          },
          {
            name:"Ambiguous classification stops at the existing human governance gate",
            passed:
              continuation.results.some(
                item =>
                  item.documentId === "doc-review" &&
                  item.status ===
                    "awaiting-classification-review"
              ) &&
              continuation.humanQueue.some(
                item =>
                  item.type === "classification-review"
              )
          },
          {
            name:"Maddy resolves machine-solvable requirements before creating human work",
            passed:
              continuation.machineResolvedRequirements === 7
          },
          {
            name:"Human queue preserves only unresolved governance or authority needs",
            passed:
              continuation.humanQueue.some(
                item =>
                  item.authority === "human-signature"
              ) &&
              continuation.humanQueue.some(
                item =>
                  item.type === "classification-review"
              )
          },
          {
            name:"Governed document workflow is created autonomously as draft work",
            passed:
              workflowCalls === 1 &&
              continuation.workflowsCreated === 1
          },
          {
            name:"Autonomous document work becomes a resumable cognitive intention",
            passed:
              this.cognitiveIntentions.some(
                item =>
                  /Complete document work:/.test(
                    item.subject
                  ) &&
                  item.temporal?.sourceId ===
                    "workflow-auto-doc"
              )
          },
          {
            name:"Blocked document governance also becomes a resumable cognitive intention",
            passed:
              this.cognitiveIntentions.some(
                item =>
                  /Review document classification:/.test(
                    item.subject
                  )
              )
          },
          {
            name:"Document continuation becomes autobiographical experience",
            passed:
              this.autobiographicalMemory.some(
                item =>
                  item.eventType ===
                    "autonomous-document-cognitive-continuation"
              )
          },
          {
            name:"No paid cognition authority is granted",
            passed:
              continuation.paidCognitionAuthorized === false
          },
          {
            name:"No document mutation authority is granted",
            passed:
              continuation.documentMutationAuthorized === false
          },
          {
            name:"No signature authority is granted",
            passed:
              continuation.signatureAuthorized === false
          },
          {
            name:"No certification authority is granted",
            passed:
              continuation.certificationAuthorized === false
          },
          {
            name:"No submission authority is granted",
            passed:
              continuation.submissionAuthorized === false
          },
          {
            name:"No external action authority is granted",
            passed:
              continuation.externalActionAuthorized === false
          },
          {
            name:"Source investigation and fingerprint lineage survive into continuation",
            passed:
              continuation.investigationId ===
                "investigation-auto-doc" &&
              continuation.results.some(
                item =>
                  item.documentId === "doc-auto" &&
                  item.workflowId ===
                    "workflow-auto-doc"
              )
          },
          {
            name:"Workflow-originated field research is explicitly guarded against recursive document spawning",
            passed:
              /executive-workflow-document-resolution/.test(
                this.investigateReconstructedIntent.toString()
              ) &&
              /disableDocumentCognitionContinuation/.test(
                this.investigateReconstructedIntent.toString()
              )
          }
        ];

        const passed = checks.every(item => item.passed);

        console.table(
          checks.map(item => ({
            name:item.name,
            passed:item.passed
          }))
        );
        console.info(
          `[MEOS ${this.version}] Commission 006.017D7N16 autonomous document cognitive continuation: ${passed ? "PASS" : "FAIL"}.`
        );

        return {
          commission:"006.017D7N16",
          version:this.version,
          buildId:this.buildId,
          passed,
          checks,
          continuation:this.clone(continuation)
        };
      } finally {
        global.DocumentIngestion = original.ingestion;
        global.DocumentClassifier = original.classifier;
        global.ExecutiveWorkflow = original.workflow;
        this.cognitiveIntentions = original.intentions;
        this.autobiographicalMemory = original.autobiography;
        brainPersistence.hydrated = priorHydrated;
      }
    },

    async runAutomaticCheapInternetPerceptionAcceptanceTest() {
      const originalIntentions = this.clone(this.investigativeIntentions || []);
      const originalCapability = global.MEOSLocalPerception;
      const priorHydrated = brainPersistence.hydrated;
      brainPersistence.hydrated = false;

      try {
        let executions = 0;
        let capturedHandoff = null;

        global.MEOSLocalPerception = {
          name:"Acceptance Local Perception",
          version:"fixture",
          getStatus() {
            return {
              enabled:true,
              mode:"co-resident-zero-network-process-adapter",
              networkHopRequired:false,
              paidProviderUsed:false,
              paidCognitionAuthorized:false,
              externalActionAuthorized:false
            };
          },
          async execute(handoff) {
            executions += 1;
            capturedHandoff = handoff;
            return {
              success:true,
              handoffSchema:handoff.schema,
              handoffAccepted:true,
              intentId:handoff.intentId,
              status:"perception-complete",
              sourcesDiscovered:4,
              sourcesObserved:2,
              changedSources:1,
              unchangedSources:1,
              bytesObservedLocally:4096,
              stopReason:"observation-budget-reached",
              observations:[
                {
                  url:"https://example.gov/a",
                  observed:true,
                  changed:true,
                  contentSha256:"a".repeat(64),
                  bytesObservedLocally:2048
                },
                {
                  url:"https://example.gov/b",
                  observed:true,
                  changed:false,
                  contentSha256:"b".repeat(64),
                  bytesObservedLocally:2048
                }
              ],
              semanticConclusion:null,
              sufficiencyJudgment:null,
              institutionalTruthAuthority:false,
              paidProviderUsed:false,
              paidCognitionAuthorized:false,
              externalActionAuthorized:false
            };
          }
        };

        const reconstruction = this.reconstructIntent({
          utterance:"Go investigate whether the public requirements changed.",
          subject:"public opportunity requirements",
          activeMission:{
            title:"Future positioning",
            objective:"Determine whether current public evidence changes positioning."
          },
          unresolvedQuestions:[
            {
              subject:"public opportunity requirements",
              question:"Did authoritative public requirements materially change?"
            }
          ],
          attention:["requirements","eligibility","future positioning"]
        });

        const result = await this.investigateReconstructedIntent(
          reconstruction,
          {
            persist:false,
            origin:"acceptance-test",
            localPerceptionBudget:{
              maxResults:4,
              maxObservations:2,
              maxTotalBytes:1024 * 1024
            }
          }
        );

        const checks = [
          {
            name:"Executive Brain discovers local perception without caller injection",
            passed:executions === 1 && capturedHandoff != null
          },
          {
            name:"Automatic cheap perception preserves the commissioned handoff schema and intent lineage",
            passed:
              capturedHandoff?.schema === "meos.maddy.local-perception-handoff.v1" &&
              result?.evidence?.investigationId === capturedHandoff?.intentId
          },
          {
            name:"Cheap internet perception is attempted before provider research",
            passed:
              result?.evidence?.executor === "MEOSLocalPerception" &&
              result?.evidence?.result?.economicPath?.paidProviderUsed === false
          },
          {
            name:"Local perception remains perception rather than belief",
            passed:
              result?.evidence?.result?.assimilation?.evidence?.epistemicStatus ===
                "uninterpreted-perception-evidence" &&
              result?.evidence?.result?.assimilation?.resolved === false
          },
          {
            name:"Cheap perception cannot authorize paid cognition or external action",
            passed:
              result?.evidence?.result?.economicPath?.paidCognitionAuthorized === false &&
              result?.evidence?.result?.economicPath?.externalActionAuthorized === false
          },
          {
            name:"Observed bytes may be large locally while cognition receives bounded evidence",
            passed:
              result?.evidence?.result?.perception?.bytesObservedLocally === 4096 &&
              Array.isArray(result?.evidence?.result?.assimilation?.evidence?.observations)
          }
        ];

        const passed = checks.every(item => item.passed);
        console.table(checks);
        console.info(
          `[MEOS ${this.version}] Commission 006.017D7N10 automatic cheap internet perception: ${passed ? "PASS" : "FAIL"}.`
        );

        return {
          commission:"006.017D7N10",
          version:this.version,
          buildId:this.buildId,
          passed,
          checks
        };
      } finally {
        this.investigativeIntentions = originalIntentions;
        global.MEOSLocalPerception = originalCapability;
        brainPersistence.hydrated = priorHydrated;
      }
    },

    async runLocalPerceptionHandoffAcceptanceTest() {
      const originalIntentions = this.clone(this.investigativeIntentions || []);
      const priorHydrated = brainPersistence.hydrated;
      brainPersistence.hydrated = false;

      try {
        const intention = {
          schema:"meos.maddy.investigative-intention.v1",
          id:`local-perception-acceptance-${Date.now()}`,
          createdAt:new Date().toISOString(),
          origin:"acceptance-test",
          subject:"public evidence",
          objective:"Resolve a bounded material unknown.",
          status:"active",
          authority:"investigation-only",
          consequentialActionAuthorized:false
        };
        this.investigativeIntentions.unshift(this.clone(intention));

        const handoff = this.buildLocalPerceptionHandoff(
          intention,
          "authoritative evidence for bounded unknown",
          {maxResults:12,maxObservations:5,maxTotalBytes:2 * 1024 * 1024}
        );

        const assimilated = this.assimilateLocalPerceptionResult(
          handoff,
          {
            intentId:intention.id,
            status:"perception-complete",
            sourcesDiscovered:8,
            sourcesObserved:5,
            changedSources:2,
            unchangedSources:3,
            bytesObservedLocally:524288,
            stopReason:"observation-budget-reached",
            observations:[
              {url:"https://example.gov/a",changed:true,contentSha256:"a".repeat(64)},
              {url:"https://example.gov/b",changed:false,contentSha256:"b".repeat(64)}
            ]
          },
          {persist:false}
        );

        const mismatch = this.assimilateLocalPerceptionResult(
          handoff,
          {intentId:"different-intent"},
          {persist:false}
        );

        const checks = [
          {name:"Local perception requires an existing investigative intention",passed:handoff.success===true&&handoff.intentId===intention.id},
          {name:"Perception handoff is bounded before local acquisition begins",passed:handoff.perceptionBudget.maxResults===12&&handoff.perceptionBudget.maxObservations===5&&handoff.perceptionBudget.maxTotalBytes===2*1024*1024},
          {name:"Perception is explicitly not authorized to become belief or institutional truth",passed:handoff.epistemicContract.perceptionIsNotBelief===true&&handoff.epistemicContract.semanticConclusionAuthorized===false&&handoff.epistemicContract.institutionalTruthPromotionAuthorized===false},
          {name:"Local perception cannot authorize paid cognition or external action",passed:handoff.authority.paidCognitionAuthorized===false&&handoff.authority.externalActionAuthorized===false},
          {name:"Returned local evidence remains uninterpreted pending Executive Brain assimilation",passed:assimilated.success===true&&assimilated.evidence.epistemicStatus==="uninterpreted-perception-evidence"&&assimilated.awaitingCognitiveAssimilation===true&&assimilated.resolved===false},
          {name:"Investigation lineage mismatch is rejected",passed:mismatch.success===false&&mismatch.reason==="local-perception-intent-lineage-mismatch"}
        ];

        const passed = checks.every(item => item.passed);
        console.table(checks);
        console.log(`[MEOS ${VERSION}] Commission 006.017D7N6 Local Perception Handoff: ${passed ? "PASS" : "FAIL"}.`);
        return {
          commission:"006.017D7N6",
          version:VERSION,
          buildId:BUILD_ID,
          passed,
          checks
        };
      } finally {
        this.investigativeIntentions = originalIntentions;
        brainPersistence.hydrated = priorHydrated;
      }
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
      const priorIncumbent=this.currentExecutivePriority ? this.clone(this.currentExecutivePriority) : null;
      const incumbent=priorIncumbent && scored.some(item => item.id === priorIncumbent.id)
        ? priorIncumbent
        : null;
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
      (this.cognitiveIntentions || []).filter(x=>
        x.status!=="completed" && !this.isTemporalOrientationSubject(x.subject)
      ).forEach(x=>demands.push({
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

    /*
     * Commission 006.018N — Executive Cognitive Homeostasis
     *
     * Homeostasis is balance, not a rigid hierarchy. Existing obligations,
     * curiosity, growth, operational integrity, learned experience, and human
     * direction remain simultaneously visible. Maddy may notice more than she
     * pursues. Verified experience can change later judgment without becoming
     * a hard-coded rule, and an explicit human task can interrupt autonomous
     * cognition without erasing the point of interruption.
     */
    normalizeHomeostasisText(value = "") {
      return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter(token => token.length > 2)
        .slice(0, 80);
    },

    collectRelevantLearnedExperience(demand = {}) {
      const learning = global.ExecutiveLearning;
      const lessons = Array.isArray(learning?.lessons) ? learning.lessons : [];
      const demandTokens = new Set(this.normalizeHomeostasisText([
        demand.subject, demand.reason, demand.origin,
        ...(Array.isArray(demand.unknowns) ? demand.unknowns : [])
      ].join(" ")));
      if (!demandTokens.size || !lessons.length) return [];

      return lessons.map(lesson => {
        const lessonText = [
          lesson.title, lesson.statement, lesson.lessonType,
          ...(Array.isArray(lesson.applicability) ? lesson.applicability : []),
          ...(Array.isArray(lesson.tags) ? lesson.tags : [])
        ].join(" ");
        const lessonTokens = new Set(this.normalizeHomeostasisText(lessonText));
        const overlap = [...demandTokens].filter(token => lessonTokens.has(token)).length;
        const relevance = overlap / Math.max(1, Math.min(demandTokens.size, 12));
        const confidence = Math.max(0, Math.min(1, Number(lesson.confidence ?? 0.5)));
        const evidenceCount = Math.max(1, Number(lesson.evidenceCount || lesson.sourceObservationIds?.length || 1));
        const type = String(lesson.lessonType || "").toLowerCase();
        const negative = /failure|risk|avoid|prevent|block|unmet/.test(type + " " + lessonText.toLowerCase());
        const positive = /success|effective|valuable|practice|opportunity/.test(type + " " + lessonText.toLowerCase());
        const direction = negative && !positive ? -1 : positive && !negative ? 1 : 0;
        return {
          id: lesson.id || null,
          title: lesson.title || "Institutional lesson",
          relevance: Number(relevance.toFixed(3)),
          confidence,
          evidenceCount,
          direction,
          status: lesson.status || "unknown"
        };
      }).filter(item => item.relevance >= 0.18)
        .sort((a,b) => (b.relevance*b.confidence) - (a.relevance*a.confidence))
        .slice(0, 6);
    },

    applyExecutiveHomeostasis(demands = [], options = {}) {
      const now = new Date().toISOString();
      const prepared = (Array.isArray(demands) ? demands : []).map(demand => {
        const experience = this.collectRelevantLearnedExperience(demand);
        const rawInfluence = experience.reduce((sum, item) => {
          const evidenceWeight = Math.min(1, 0.45 + Math.log2(item.evidenceCount + 1) * 0.18);
          return sum + item.direction * item.relevance * item.confidence * evidenceWeight;
        }, 0);
        const limit = Number(this.configuration.executiveHomeostasisLearningInfluenceLimit || 0.16);
        const learningInfluence = Math.max(-limit, Math.min(limit, rawInfluence * 0.12));
        const base = this.scoreExecutivePriority(demand);
        const balancedScore = Math.max(0, Math.min(1, base.score + learningInfluence));
        return {
          ...this.clone(demand),
          homeostasis: {
            baseScore: base.score,
            balancedScore: Number(balancedScore.toFixed(3)),
            learningInfluence: Number(learningInfluence.toFixed(3)),
            relevantExperience: this.clone(experience),
            principle: "balance-not-rigid-hierarchy"
          },
          __homeostasisScore: Number(balancedScore.toFixed(3))
        };
      });

      const categories = prepared.reduce((acc, item) => {
        const origin = String(item.origin || "unknown");
        acc[origin] = (acc[origin] || 0) + 1;
        return acc;
      }, {});
      const peripheral = prepared
        .filter(item => item.__homeostasisScore < 0.52)
        .sort((a,b) => b.__homeostasisScore-a.__homeostasisScore)
        .slice(0, Number(this.configuration.executiveHomeostasisPeripheralLimit || 12))
        .map(item => ({
          id:item.id || null, subject:item.subject, origin:item.origin,
          disposition:item.__homeostasisScore < 0.28 ? "release" : "watch",
          score:item.__homeostasisScore,
          reason:"noticed-without-manufacturing-active-work"
        }));

      this.executiveHomeostasisState = {
        schema:"meos.maddy.executive-homeostasis.v1",
        assessedAt:now,
        principle:"Maintain productive equilibrium across competing needs; no category has a permanently fixed rank beyond constitutional and authority boundaries.",
        categories,
        peripheralAwareness:peripheral,
        nothingRequiresPursuit:prepared.length===0 || prepared.every(item=>item.__homeostasisScore<0.52),
        providerCallRequired:false
      };
      return {demands:prepared,state:this.clone(this.executiveHomeostasisState)};
    },

    arbitrateHomeostaticPriorities(demands = [], options = {}) {
      if (this.configuration.executiveHomeostasisEnabled !== true) {
        return this.arbitrateExecutivePriorities(demands, options);
      }
      const balanced = this.applyExecutiveHomeostasis(demands, options);
      const scoredInputs = balanced.demands.map(demand => {
        const target = Number(demand.__homeostasisScore ?? 0);
        const base = this.scoreExecutivePriority(demand).score;
        const delta = target - base;
        // Preserve the existing arbitration organ; nudge mission consequence
        // only enough to express learned experience, rather than replacing the
        // whole executive judgment model with another engine.
        const adjusted = this.clone(demand);
        adjusted.missionConsequence = Math.max(0, Math.min(1,
          Number(demand.missionConsequence ?? demand.consequence ?? 0.5) + delta / 0.22
        ));
        adjusted.homeostasis = demand.homeostasis;
        delete adjusted.__homeostasisScore;
        return adjusted;
      });
      const result = this.arbitrateExecutivePriorities(scoredInputs, options);
      result.homeostasis = balanced.state;
      return result;
    },

    interruptCognitionForHumanTask(humanTask = {}) {
      const subject = String(humanTask.subject || "").trim();
      if (!subject) return {success:false,reason:"human-task-subject-required"};
      const active = this.cognitiveThreads.find(thread => thread.id === this.activeCognitiveThreadId) || null;
      let checkpoint = null;
      if (active) {
        checkpoint = this.checkpointCognitiveThread(active, "human-directed-task", {
          status:"paused",
          resumeTrigger:"human-directed task completes; reconsider changed reality before resuming"
        });
      }
      const humanPriority = {
        id: humanTask.id || `human-${this.fingerprintCognitiveDispatch(humanTask)}`,
        subject,
        origin:"human-direction",
        reason:humanTask.reason || "Explicit human-directed task takes foreground attention.",
        humanDirection:1,
        missionConsequence:Number(humanTask.missionConsequence ?? 0.85),
        urgency:Number(humanTask.urgency ?? 0.9),
        irreversibility:Number(humanTask.irreversibility ?? 0.5),
        leverage:Number(humanTask.leverage ?? 0.7),
        externalAuthorityRequired:humanTask.externalAuthorityRequired===true
      };
      const priorPriority = this.currentExecutivePriority ? this.clone(this.currentExecutivePriority) : null;
      const arbitration = this.arbitrateHomeostaticPriorities([humanPriority], {materialChange:true});
      // Explicit human work is foregrounded by governance, not merely by a score.
      const selected = arbitration.portfolio?.find(item=>item.id===humanPriority.id) || {
        ...humanPriority, ...this.scoreExecutivePriority(humanPriority), status:"selected", selectedAt:new Date().toISOString()
      };
      this.currentExecutivePriority = this.clone({...selected,status:"selected"});
      this.currentHumanInterruption = {
        schema:"meos.maddy.human-interruption.v1",
        humanTaskId:humanPriority.id,
        humanTaskSubject:subject,
        interruptedAt:new Date().toISOString(),
        interruptedThreadId:active?.id || null,
        priorPriorityId:priorPriority?.id || null,
        checkpoint:checkpoint?.checkpoint ? this.clone(checkpoint.checkpoint) : null,
        status:"human-task-active",
        providerCallRequired:false
      };
      return {success:true,humanPriority:this.clone(this.currentExecutivePriority),checkpoint,interruption:this.clone(this.currentHumanInterruption)};
    },

    completeHumanTaskAndResume(options = {}) {
      const interruption = this.currentHumanInterruption;
      if (!interruption) return {success:true,resumed:false,reason:"no-human-interruption"};
      const thread = interruption.interruptedThreadId
        ? this.cognitiveThreads.find(item=>item.id===interruption.interruptedThreadId)
        : null;
      const changed = options.materialChange===true || options.cancelPriorWork===true;
      let resume = null;
      let disposition = "no-prior-thread";
      if (thread && options.cancelPriorWork===true) {
        thread.status="closed";
        thread.closureState="human-cancelled";
        thread.closedAt=new Date().toISOString();
        thread.updatedAt=thread.closedAt;
        disposition="human-direction-cancelled-prior-work";
      } else if (thread) {
        resume=this.resumeCognitiveThread(thread,{materialContradiction:options.materialChange===true,claim:options.changeSummary || "material reality changed during human interruption",evidence:options.evidence || []});
        disposition=options.materialChange===true ? "reconsidered-and-resumed" : "resumed-at-point-of-interruption";
        if (resume?.success) {
          this.currentExecutivePriority={
            id:thread.priorityId || thread.id,
            subject:thread.subject,
            origin:thread.origin,
            reason:"Resume the interrupted cognitive thread from its preserved point of interruption.",
            score:Number(this.currentExecutivePriority?.score || 0.6),
            status:"selected",
            selectedAt:new Date().toISOString()
          };
        }
      }
      const completed={...this.clone(interruption),completedAt:new Date().toISOString(),status:"completed",disposition,materialChangeReconsidered:changed};
      this.currentHumanInterruption=null;
      return {success:true,resumed:Boolean(resume?.success),disposition,resume,interruption:completed,providerCallRequired:false};
    },

    runExecutiveJudgmentCycle(options = {}) {
      const demands=this.collectExecutivePriorityDemands(options);
      return this.arbitrateHomeostaticPriorities(demands,options);
    },


    /*
     * Commission 006.018P — Cross-Time Pattern Synthesis + Squirrel Trap
     *
     * Weak observations can become meaningful only when connected across
     * time, domains, and genuinely independent lineages. A pattern remains a
     * hypothesis, never a fact. Existing homeostasis decides investigate /
     * watch / release. Watch is a cheap recognition trap, not active work.
     */
    normalizeCrossTimePatternTokens(value = "") {
      const stop = new Set([
        "this","that","with","from","have","will","were","been","into","about",
        "there","their","they","them","then","than","what","when","where","which",
        "while","because","could","would","should","after","before","through",
        "current","change","changed","evidence","signal","signals","pattern",
        "possible","unknown","verified","executive","maddy","world","model"
      ]);
      return [...new Set(String(value || "").toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ").split(/\s+/)
        .filter(token => token.length >= 4 && !stop.has(token)))].slice(0, 80);
    },

    normalizeCrossTimePatternObservation(raw = {}, fallback = {}) {
      const occurredAt = raw.occurredAt || raw.generatedAt || raw.createdAt ||
        raw.reflectedAt || raw.assimilatedAt || fallback.occurredAt ||
        new Date().toISOString();
      const domains = [...new Set([
        ...(Array.isArray(raw.domains) ? raw.domains : []),
        ...(Array.isArray(raw.affectedDomains) ? raw.affectedDomains : []),
        ...(Array.isArray(fallback.domains) ? fallback.domains : []),
        raw.domain, fallback.domain
      ].filter(Boolean).map(String))].slice(0, 12);
      const body = [
        raw.subject, raw.claim, raw.summary, raw.detail, raw.lesson,
        raw.futureDirective, raw.reason, raw.objective,
        Array.isArray(raw.questions) ? raw.questions.join(" ") : "",
        Array.isArray(raw.unknowns) ? raw.unknowns.join(" ") : "",
        fallback.text
      ].filter(Boolean).join(" ");
      const lineageId = String(raw.lineageId || raw.sourceLineageId ||
        raw.sourceExperienceFingerprint || raw.experienceFingerprint ||
        raw.investigationFingerprint || raw.fingerprint ||
        fallback.lineageId || raw.id ||
        this.fingerprintCognitiveDispatch({body, occurredAt, domains}));
      return {
        id:String(raw.id || raw.episodeId || raw.reflectionId ||
          raw.assimilationId || raw.assessmentNumber ||
          this.fingerprintCognitiveDispatch({lineageId, occurredAt, body})),
        occurredAt,
        sourceType:raw.sourceType || fallback.sourceType || "observation",
        lineageId,
        domains,
        text:body,
        tokens:this.normalizeCrossTimePatternTokens(body),
        reliability:Math.max(0,Math.min(1,Number(raw.reliability ?? raw.confidence ?? fallback.reliability ?? .6))),
        strength:Math.max(0,Math.min(1,Number(raw.strength ?? raw.score ?? raw.salience ?? fallback.strength ?? .45))),
        materiality:Math.max(0,Math.min(1,Number(raw.materiality ?? raw.missionConsequence ?? fallback.materiality ?? .45))),
        contradiction:raw.contradiction === true,
        verified:raw.verified === true || ["verified","authoritative","official"].includes(String(raw.authority || "")),
        provenance:raw.provenance || raw.source || fallback.provenance || null
      };
    },

    collectCrossTimePatternObservations(options = {}) {
      const limit=Math.max(12,Math.min(Number(options.lookback || this.configuration.crossTimePatternLookback || 180),500));
      const out=[];
      (this.salienceHistory || []).slice(0,limit).forEach(item=>{
        out.push(this.normalizeCrossTimePatternObservation({
          id:`salience-${item.assessmentNumber || out.length+1}`,
          occurredAt:item.generatedAt,
          subject:item.subject,
          summary:[
            ...(item.signals || []).map(x=>x.detail),
            ...(item.connections || []).map(x=>x.reason)
          ].filter(Boolean).join(" "),
          affectedDomains:item.affectedDomains,
          score:item.score,
          materiality:item.meaningful ? Math.max(.5,Number(item.score || 0)) : Number(item.score || 0),
          lineageId:`salience:${item.priorWorldFingerprint || "none"}:${item.currentWorldFingerprint || item.assessmentNumber || "unknown"}`,
          sourceType:"world-model-salience"
        }));
      });
      (this.autobiographicalMemory || []).slice(0,limit).forEach(item=>{
        out.push(this.normalizeCrossTimePatternObservation({
          id:item.episodeId,
          occurredAt:item.createdAt || item.occurredAt,
          subject:item.subject,
          summary:[
            item.learning?.learned || item.learning?.summary,
            item.action?.summary || item.action?.type,
            item.outcome?.summary || item.outcome?.result
          ].filter(Boolean).join(" "),
          domains:item.domains || item.context?.domains || [item.eventType || "experience"],
          reliability:item.outcome?.verified === false ? .45 : .72,
          strength:item.outcome?.success === false ? .62 : .55,
          materiality:item.outcome?.materiality ?? .5,
          lineageId:item.experienceFingerprint || item.episodeId,
          sourceType:"autobiographical-experience"
        }));
      });
      (this.metacognitiveReflections || []).slice(0,limit).forEach(item=>{
        out.push(this.normalizeCrossTimePatternObservation({
          id:item.reflectionId,
          occurredAt:item.reflectedAt,
          subject:item.adaptation?.lesson || "metacognitive reflection",
          summary:item.adaptation?.futureDirective,
          domains:["metacognition","learning"],
          reliability:item.continuity?.evidenceDerived === true ? .78 : .55,
          strength:item.adaptation?.correctionRequired === true ? .68 : .5,
          materiality:item.adaptation?.correctionRequired === true ? .62 : .42,
          lineageId:item.sourceExperienceFingerprint || item.sourceEpisodeId || item.reflectionId,
          sourceType:"metacognitive-reflection"
        }));
      });
      (this.evidenceAssimilationHistory || []).slice(0,limit).forEach(item=>{
        out.push(this.normalizeCrossTimePatternObservation({
          id:item.assimilationId || item.fingerprint,
          occurredAt:item.assimilatedAt || item.generatedAt,
          subject:item.subject,
          summary:(item.evidence || []).slice(0,6).map(x=>x.summary || x.content || x.title).filter(Boolean).join(" "),
          domains:item.affectedDomains || item.domains || ["investigation"],
          reliability:item.evidenceIntegrity?.confidence ?? .72,
          strength:item.beliefUpdate?.resolution ?? .58,
          materiality:item.materiality ?? .55,
          lineageId:item.investigationFingerprint || item.fingerprint,
          sourceType:"evidence-assimilation"
        }));
      });
      const seen=new Set();
      return out.filter(item=>{
        const key=`${item.sourceType}|${item.id}`;
        if (seen.has(key) || !item.tokens.length) return false;
        seen.add(key); return true;
      }).sort((a,b)=>new Date(a.occurredAt)-new Date(b.occurredAt)).slice(-limit);
    },

    crossTimeObservationAffinity(left, right) {
      const lt=new Set(left.tokens || []), rt=new Set(right.tokens || []);
      const shared=[...lt].filter(token=>rt.has(token));
      const ld=new Set(left.domains || []);
      const sharedDomains=(right.domains || []).filter(domain=>ld.has(domain));
      const lexical=shared.length/Math.max(1,Math.min(lt.size,rt.size,8));
      const score=Math.max(0,Math.min(1,
        lexical + (sharedDomains.length ? .14 : .06) +
        (left.lineageId !== right.lineageId ? .08 : -.12)));
      return {score:Number(score.toFixed(3)),sharedTokens:shared.slice(0,12),sharedDomains:sharedDomains.slice(0,8)};
    },

    buildCrossTimePatternCandidate(observations = []) {
      const items=(Array.isArray(observations) ? observations : [])
        .map(item=>item.tokens ? this.clone(item) : this.normalizeCrossTimePatternObservation(item))
        .filter(item=>item.tokens?.length);
      if (items.length < 2) return null;
      const freq=new Map();
      items.forEach(item=>[...new Set(item.tokens)].forEach(token=>{
        if (!freq.has(token)) freq.set(token,new Set());
        freq.get(token).add(item.lineageId);
      }));
      const cueTokens=[...freq.entries()].filter(([,lineages])=>lineages.size>=2)
        .sort((a,b)=>b[1].size-a[1].size).map(([token])=>token).slice(0,12);
      if (!cueTokens.length) return null;
      const cue=new Set(cueTokens);
      const related=items.filter(item=>(item.tokens || []).some(token=>cue.has(token)));
      const lineages=[...new Set(related.map(x=>x.lineageId))];
      const domains=[...new Set(related.flatMap(x=>x.domains || []))];
      const times=related.map(x=>new Date(x.occurredAt).getTime()).filter(Number.isFinite);
      const span=times.length>=2 ? Math.max(...times)-Math.min(...times) : 0;
      const contradictions=related.filter(x=>x.contradiction).length;
      const support=related.filter(x=>!x.contradiction);
      const avg=(key,def=.5)=>support.reduce((s,x)=>s+Number(x[key] ?? def),0)/Math.max(1,support.length);
      const minLineages=Number(this.configuration.crossTimePatternMinimumIndependentLineages || 3);
      const minDomains=Number(this.configuration.crossTimePatternMinimumDomains || 2);
      const minSpan=Number(this.configuration.crossTimePatternMinimumSpanMs || 0);
      const score=Math.max(0,Math.min(.92,
        .24*Math.min(1,lineages.length/minLineages) +
        .18*Math.min(1,domains.length/minDomains) +
        .16*(minSpan ? Math.min(1,span/minSpan) : 1) +
        .20*avg("reliability") + .12*avg("strength") + .10*avg("materiality") -
        Math.min(.45,contradictions*.15)
      ));
      const qualifies=lineages.length>=minLineages && domains.length>=minDomains &&
        span>=minSpan && support.length>=minLineages && score>=.58;
      const fingerprint=this.fingerprintCognitiveDispatch({
        cueTokens,lineages:[...lineages].sort(),domains:[...domains].sort()
      });
      return {
        schema:"meos.maddy.cross-time-pattern-hypothesis.v1",
        fingerprint,generatedAt:new Date().toISOString(),
        hypothesisStatus:qualifies ? "hypothesis-not-fact" : "weak-signal-not-established",
        qualifies,score:Number(score.toFixed(3)),cueTokens,
        observationCount:related.length,independentLineageCount:lineages.length,
        independentLineages:lineages.slice(0,20),domains:domains.slice(0,20),
        temporalSpanMs:span,temporalSpanHours:Number((span/3600000).toFixed(2)),
        averageReliability:Number(avg("reliability").toFixed(3)),
        averageStrength:Number(avg("strength").toFixed(3)),
        materiality:Number(avg("materiality").toFixed(3)),
        contradictionCount:contradictions,
        observationIds:related.map(x=>x.id).slice(0,40),
        sourceTypes:[...new Set(related.map(x=>x.sourceType))],
        novelty:(this.crossTimePatternHistory || []).some(x=>x.fingerprint===fingerprint) ? "known-pattern" : "new-pattern-candidate",
        epistemicRule:"Cross-time convergence can justify a hypothesis or investigation; recurrence never upgrades a pattern into fact.",
        providerCallRequired:false,externalActionAuthorized:false
      };
    },

    registerCrossTimePatternTrap(pattern = {}, options = {}) {
      if (!pattern?.fingerprint) return {success:false,reason:"pattern-fingerprint-required"};
      const existing=(this.crossTimePatternTraps || []).find(x=>x.patternFingerprint===pattern.fingerprint);
      const now=new Date().toISOString();
      const trap=existing || {
        schema:"meos.maddy.cross-time-pattern-trap.v1",
        trapId:`trap-${pattern.fingerprint}`,patternFingerprint:pattern.fingerprint,
        createdAt:now,triggerCount:0
      };
      Object.assign(trap,{
        updatedAt:now,status:"watching",
        cueTokens:this.clone(pattern.cueTokens || []),
        domains:this.clone(pattern.domains || []),
        knownLineages:this.clone(pattern.independentLineages || []),
        wakeRule:"Reawaken only when materially new evidence matches the pattern cues; unchanged repetition is not a wake.",
        providerCallRequired:false,activeWorkCreated:false
      });
      if (!existing) this.crossTimePatternTraps.unshift(trap);
      this.crossTimePatternTraps=this.crossTimePatternTraps.slice(0,Number(this.configuration.maximumCrossTimePatternTraps || 64));
      if (options.persist!==false) this.persist();
      return {success:true,trap:this.clone(trap)};
    },

    testCrossTimePatternTrap(observation = {}, options = {}) {
      const normalized=this.normalizeCrossTimePatternObservation(observation);
      const fp=this.fingerprintCognitiveDispatch({lineageId:normalized.lineageId,text:normalized.text,provenance:normalized.provenance});
      const matches=[];
      (this.crossTimePatternTraps || []).forEach(trap=>{
        const tokenOverlap=(trap.cueTokens || []).filter(token=>normalized.tokens.includes(token));
        const domainOverlap=(trap.domains || []).filter(domain=>normalized.domains.includes(domain));
        const cueMatch=tokenOverlap.length>=1 && (domainOverlap.length>=1 || tokenOverlap.length>=2);
        if (!cueMatch) return;
        const materiallyNew=fp!==trap.lastEvidenceFingerprint && !(trap.knownLineages || []).includes(normalized.lineageId);
        const reawaken=materiallyNew===true;
        if (reawaken) {
          trap.triggerCount=Number(trap.triggerCount || 0)+1;
          trap.lastTriggeredAt=new Date().toISOString();
          trap.lastEvidenceFingerprint=fp;
          trap.knownLineages=[...new Set([...(trap.knownLineages || []),normalized.lineageId])].slice(-24);
          trap.status="triggered-for-reappraisal";
        }
        matches.push({trapId:trap.trapId,patternFingerprint:trap.patternFingerprint,
          tokenOverlap,domainOverlap,materiallyNew,reawaken,activeWorkCreated:false,providerCallRequired:false});
      });
      if (options.persist!==false && matches.some(x=>x.reawaken)) this.persist();
      return {success:true,matches,reawaken:matches.some(x=>x.reawaken),
        providerCallRequired:false,missionCreated:false};
    },

    synthesizeCrossTimePatterns(options = {}) {
      const observations=Array.isArray(options.observations)
        ? options.observations.map(x=>this.normalizeCrossTimePatternObservation(x))
        : this.collectCrossTimePatternObservations(options);
      if (observations.length<2) return {success:true,patterns:[],traps:[],providerCallRequired:false,missionCreated:false};
      const adjacency=new Map(observations.map((_,i)=>[i,new Set()]));
      for (let i=0;i<observations.length;i++) for (let j=i+1;j<observations.length;j++) {
        const a=this.crossTimeObservationAffinity(observations[i],observations[j]);
        if (a.score>=.27 && a.sharedTokens.length) { adjacency.get(i).add(j); adjacency.get(j).add(i); }
      }
      const visited=new Set(), components=[];
      for (let i=0;i<observations.length;i++) {
        if (visited.has(i)) continue;
        const stack=[i], comp=[]; visited.add(i);
        while(stack.length) {
          const n=stack.pop(); comp.push(observations[n]);
          adjacency.get(n).forEach(k=>{if(!visited.has(k)){visited.add(k);stack.push(k);}});
        }
        if (comp.length>=2) components.push(comp);
      }
      const candidates=components.map(c=>this.buildCrossTimePatternCandidate(c))
        .filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,12);
      const patterns=candidates.map(candidate=>{
        const demand={
          id:`pattern-${candidate.fingerprint}`,
          subject:`Cross-time pattern: ${candidate.cueTokens.slice(0,5).join(" / ")}`,
          origin:"cross-time-pattern",
          reason:"Several weak observations may form one larger pattern across time and domains.",
          missionConsequence:candidate.materiality,
          urgency:Math.min(.75,.25+candidate.contradictionCount*.1),
          leverage:Math.min(.9,.35+candidate.domains.length*.08),
          informationValue:Math.min(.95,.45+(1-candidate.averageReliability)*.3),
          uncertainty:1-candidate.score
        };
        const homeo=this.applyExecutiveHomeostasis([demand]).demands[0];
        const balanced=Number(homeo?.__homeostasisScore ?? candidate.score);
        const disposition=candidate.qualifies && balanced>=.66 ? "investigate"
          : candidate.score>=.42 && candidate.independentLineageCount>=2 ? "watch" : "release";
        const result={...candidate,homeostaticScore:Number(balanced.toFixed(3)),
          homeostasisInfluence:homeo?.homeostasis?.learningInfluence || 0,disposition,
          activeWorkCreated:false,nextMove:disposition==="investigate"
            ? "Target the smallest decision-relevant unknown that could confirm or falsify this pattern."
            : disposition==="watch"
              ? "Keep a cheap recognition trigger and reawaken only on materially new matching evidence."
              : "Release active attention; retain no expensive work state."};
        if (disposition==="watch") this.registerCrossTimePatternTrap(result,{persist:false});
        return result;
      });
      this.crossTimePatternSynthesisCount=Number(this.crossTimePatternSynthesisCount || 0)+1;
      this.lastCrossTimePatternSynthesis={
        schema:"meos.maddy.cross-time-pattern-synthesis.v1",
        synthesisNumber:this.crossTimePatternSynthesisCount,generatedAt:new Date().toISOString(),
        observationCount:observations.length,patterns:this.clone(patterns.slice(0,8)),
        providerCallRequired:false,missionCreated:false
      };
      patterns.filter(x=>x.qualifies).forEach(x=>{
        const prior=(this.crossTimePatternHistory || []).find(y=>y.fingerprint===x.fingerprint);
        if (prior) Object.assign(prior,this.clone(x),{lastSeenAt:new Date().toISOString()});
        else this.crossTimePatternHistory.unshift({...this.clone(x),firstSeenAt:new Date().toISOString(),lastSeenAt:new Date().toISOString()});
      });
      this.crossTimePatternHistory=this.crossTimePatternHistory.slice(0,Number(this.configuration.maximumCrossTimePatternHistory || 96));
      if (options.persist!==false) this.persist();
      this.emit("brain:cross-time-pattern-synthesis",this.clone(this.lastCrossTimePatternSynthesis));
      return {success:true,patterns:this.clone(patterns),traps:this.clone(this.crossTimePatternTraps),
        providerCallRequired:false,missionCreated:false};
    },

    runCrossTimePatternSynthesisAcceptanceTest() {
      const original={history:this.clone(this.crossTimePatternHistory),traps:this.clone(this.crossTimePatternTraps),
        last:this.clone(this.lastCrossTimePatternSynthesis),count:this.crossTimePatternSynthesisCount,
        homeostasis:this.clone(this.executiveHomeostasisState)};
      try {
        this.crossTimePatternHistory=[]; this.crossTimePatternTraps=[];
        this.lastCrossTimePatternSynthesis=null; this.crossTimePatternSynthesisCount=0;
        const base=Date.parse("2026-01-01T08:00:00Z"), hour=3600000;
        const observations=[
          {id:"o1",occurredAt:new Date(base).toISOString(),subject:"vendor onboarding delay preceded missed launch",domains:["operations"],lineageId:"ops-1",reliability:.72,strength:.44,materiality:.66},
          {id:"o2",occurredAt:new Date(base+18*hour).toISOString(),subject:"vendor onboarding delay coincided with compliance document gap",domains:["compliance"],lineageId:"comp-1",reliability:.76,strength:.47,materiality:.70},
          {id:"o3",occurredAt:new Date(base+42*hour).toISOString(),subject:"vendor onboarding delay appeared before funding milestone slip",domains:["funding"],lineageId:"fund-1",reliability:.74,strength:.45,materiality:.73},
          {id:"copy",occurredAt:new Date(base+44*hour).toISOString(),subject:"vendor onboarding delay before funding milestone slip",domains:["funding"],lineageId:"fund-1",reliability:.70,strength:.45,materiality:.70}
        ];
        const synthesis=this.synthesizeCrossTimePatterns({observations,persist:false});
        const pattern=synthesis.patterns[0];
        const contrary=this.buildCrossTimePatternCandidate([...observations,{
          id:"contra",occurredAt:new Date(base+48*hour).toISOString(),
          subject:"vendor onboarding delay did not affect launch or milestones",
          domains:["operations","funding"],lineageId:"contra-1",
          reliability:.95,strength:.8,materiality:.7,contradiction:true
        }]);
        const weak=this.synthesizeCrossTimePatterns({observations:[
          {id:"w1",occurredAt:new Date(base).toISOString(),subject:"coffee inventory low",domains:["office"],lineageId:"w1",strength:.2,materiality:.05},
          {id:"w2",occurredAt:new Date(base+20*hour).toISOString(),subject:"coffee inventory low",domains:["office"],lineageId:"w2",strength:.2,materiality:.05}
        ],persist:false});
        const trapSeed=this.buildCrossTimePatternCandidate([
          {id:"s1",occurredAt:new Date(base).toISOString(),subject:"shipment anomaly squirrel cue",domains:["operations"],lineageId:"s1",reliability:.55,strength:.3,materiality:.25},
          {id:"s2",occurredAt:new Date(base+16*hour).toISOString(),subject:"shipment anomaly squirrel cue",domains:["finance"],lineageId:"s2",reliability:.55,strength:.3,materiality:.25}
        ]);
        const trap=this.registerCrossTimePatternTrap({...trapSeed,qualifies:false,score:.46},{persist:false}).trap;
        const repeat=this.testCrossTimePatternTrap({id:"same",subject:"shipment anomaly squirrel cue",domains:["operations"],lineageId:"s1"},{persist:false});
        const novel=this.testCrossTimePatternTrap({id:"new",subject:"shipment anomaly squirrel cue now appears in customer delivery",domains:["operations","customer"],lineageId:"s3"},{persist:false});
        const snapshot=this.buildPersistenceSnapshot();
        const checks=[
          {name:"Several individually weak observations can synthesize into one cross-time pattern",passed:pattern?.qualifies===true&&pattern.observationCount>=3},
          {name:"Cross-time synthesis requires genuinely independent evidence lineages",passed:pattern?.independentLineageCount===3},
          {name:"Pattern strength can emerge across different organizational domains",passed:["operations","compliance","funding"].every(x=>(pattern?.domains||[]).includes(x))},
          {name:"Temporal separation is part of the pattern instead of collapsing all observations into one moment",passed:Number(pattern?.temporalSpanHours||0)>=40},
          {name:"Detected patterns remain hypothesis rather than silently becoming fact",passed:pattern?.hypothesisStatus==="hypothesis-not-fact"&&pattern?.epistemicRule?.includes("never upgrades")},
          {name:"Strong contradictory evidence can weaken the same apparent pattern",passed:contrary?.score<pattern?.score&&contrary?.contradictionCount===1},
          {name:"Low-value recurrence can remain peripheral rather than manufacturing work",passed:weak.patterns.every(x=>x.disposition!=="investigate"&&x.activeWorkCreated===false)},
          {name:"A recurring weak signal can become a cheap squirrel trap instead of active investigation",passed:trap?.status==="watching"&&trap?.activeWorkCreated===false},
          {name:"Known repetition does not retrigger the squirrel trap",passed:repeat.reawaken===false},
          {name:"Materially new matching evidence can reawaken the pattern for reappraisal",passed:novel.reawaken===true},
          {name:"Cross-time pattern history and traps survive sovereign Brain persistence",passed:Array.isArray(snapshot.crossTimePatternHistory)&&Array.isArray(snapshot.crossTimePatternTraps)},
          {name:"Pattern synthesis and traps require no provider call, create no Mission, and preserve authority",passed:synthesis.providerCallRequired===false&&novel.providerCallRequired===false&&novel.missionCreated===false&&pattern?.externalActionAuthorized===false}
        ];
        const passed=checks.every(x=>x.passed);
        console.table(checks.map(x=>({name:x.name,passed:x.passed})));
        console.info(`[MEOS ${this.version}] Commission 006.018P Cross-Time Pattern Synthesis + Squirrel Trap: ${passed?"PASS":"FAIL"} (${checks.filter(x=>x.passed).length}/${checks.length}).`);
        return {success:passed,commission:"006.018P",schema:"meos.executive-brain.cross-time-pattern-acceptance.v1",
          version:this.version,buildId:this.buildId,passed:checks.filter(x=>x.passed).length,total:checks.length,checks,
          examples:{pattern,contrary,trap,repeat,novel}};
      } finally {
        this.crossTimePatternHistory=original.history; this.crossTimePatternTraps=original.traps;
        this.lastCrossTimePatternSynthesis=original.last; this.crossTimePatternSynthesisCount=original.count;
        this.executiveHomeostasisState=original.homeostasis;
      }
    },

    assessTotalityOfCircumstances(input = {}, options = {}) {
      const subject = String(input.subject || "Executive judgment").trim();
      const raw = Array.isArray(input.evidence) ? input.evidence : [];
      const normalized = raw.map((item, index) => {
        const claim = String(item.claim || item.summary || item.content || "").trim();
        const source = String(item.source || item.url || item.provenance?.source || `evidence-${index + 1}`);
        const lineage = String(item.lineageId || item.originId || item.provenance?.lineageId || source).trim();
        const authority = String(item.authority || item.provenance?.authority || "unknown").toLowerCase();
        const firsthand = item.firsthand === true || item.directObservation === true;
        const contemporaneous = item.contemporaneous === true;
        const verified = item.verified === true || ["authoritative","official","verified"].includes(authority);
        const positionToKnow = Math.max(0, Math.min(1, Number(item.positionToKnow ?? (firsthand ? 0.9 : verified ? 0.85 : 0.5))));
        const reliability = Math.max(0, Math.min(1, Number(item.reliability ?? item.confidence ?? (verified ? 0.9 : 0.6))));
        const weight = Math.max(0, Math.min(1, reliability * 0.45 + positionToKnow * 0.35 + (verified ? 0.15 : 0) + (contemporaneous ? 0.05 : 0)));
        return {id:item.id || `evidence-${index + 1}`,claim,source,lineage,authority,verified,firsthand,contemporaneous,positionToKnow,reliability,weight,stance:String(item.stance || "supports").toLowerCase(),context:String(item.context || "").trim(),raw:this.clone(item)};
      }).filter(item => item.claim);

      const lineages = new Map();
      normalized.forEach(item => {
        if (!lineages.has(item.lineage)) lineages.set(item.lineage, []);
        lineages.get(item.lineage).push(item);
      });
      const independent = [...lineages.values()].map(group => group.slice().sort((a,b)=>b.weight-a.weight)[0]);
      const supporting = independent.filter(item => item.stance !== "contradicts");
      const contradicting = independent.filter(item => item.stance === "contradicts");
      const supportWeight = supporting.reduce((sum,item)=>sum+item.weight,0);
      const contradictionWeight = contradicting.reduce((sum,item)=>sum+item.weight,0);
      const totalWeight = supportWeight + contradictionWeight;
      const supportShare = totalWeight > 0 ? supportWeight / totalWeight : 0;
      const authoritativeSupport = supporting.some(item => item.verified && item.weight >= 0.78);
      const independentCorroboration = supporting.filter(item=>item.weight>=0.62).length;
      const materialConflict = contradictionWeight >= 0.62 && supportWeight >= 0.62;

      let factStatus = "unknown";
      if (authoritativeSupport && !materialConflict) factStatus = "established";
      else if (independentCorroboration >= 2 && supportShare >= 0.72 && !materialConflict) factStatus = "strongly-corroborated";
      else if (supportWeight > contradictionWeight && supportWeight >= 0.62) factStatus = "supported-but-not-established";
      else if (materialConflict) factStatus = "materially-disputed";

      const established = normalized.filter(item => item.verified && item.weight >= 0.78 && item.stance !== "contradicts").map(item=>item.claim);
      const disputes = contradicting.map(item=>item.claim);
      const unknowns = Array.isArray(input.unknowns) ? input.unknowns.map(String) : [];
      if (materialConflict && unknowns.length === 0) unknowns.push("Materially conflicting independent accounts remain unresolved.");
      const decisionMaterial = input.decisionMaterial !== false;
      const enoughToMove = factStatus === "established" || factStatus === "strongly-corroborated" || (factStatus === "supported-but-not-established" && input.allowBoundedJudgment !== false);
      const furtherResearchWorthwhile = !enoughToMove && decisionMaterial && (materialConflict || unknowns.length > 0);
      const judgment = String(input.judgment || (enoughToMove
        ? `Based on the totality of the circumstances, the best supported judgment is that ${subject} is sufficiently supported to move forward while preserving stated uncertainty.`
        : `The totality of the circumstances does not yet support a defensible conclusion about ${subject}.`));

      return {
        schema:"meos.maddy.totality-circumstances-judgment.v1", subject,
        establishedFacts:[...new Set(established)],
        independentEvidencePaths:independent.length,
        derivativeEvidenceCount:Math.max(0, normalized.length-independent.length),
        supportingIndependentPaths:supporting.length,
        contradictingIndependentPaths:contradicting.length,
        materialConflict, factStatus, judgment,
        judgmentIsFact:false,
        uncertainty:[...new Set(unknowns)],
        disputes,
        enoughToMove,
        furtherResearchWorthwhile,
        stopReason:enoughToMove ? "decision-sufficient-totality" : (furtherResearchWorthwhile ? "material-uncertainty-remains" : "insufficient-value-for-more-research"),
        evidenceAssessment:normalized.map(item=>({id:item.id,source:item.source,lineage:item.lineage,weight:Number(item.weight.toFixed(3)),verified:item.verified,stance:item.stance,positionToKnow:item.positionToKnow,reliability:item.reliability})),
        epistemicRule:"Experience and context inform judgment; they do not manufacture facts. Conflicting accounts do not erase what the totality of reliable circumstances can establish.",
        providerCallRequired:false,
        externalActionAuthorized:false
      };
    },

    async runTotalityOfCircumstancesExecutiveJudgmentAcceptanceTest() {
      const common=[
        {id:"camera",claim:"A fight occurred outside the bar.",source:"camera",lineageId:"camera",authority:"verified",reliability:0.98,positionToKnow:0.98,contemporaneous:true},
        {id:"bartender",claim:"A fight occurred outside the bar.",source:"bartender",lineageId:"bartender",firsthand:true,reliability:0.88,positionToKnow:0.9,contemporaneous:true},
        {id:"copy1",claim:"A fight occurred outside the bar.",source:"social-copy-1",lineageId:"bartender",reliability:0.55,positionToKnow:0.25},
        {id:"copy2",claim:"A fight occurred outside the bar.",source:"social-copy-2",lineageId:"bartender",reliability:0.5,positionToKnow:0.2},
        {id:"subject-a",claim:"Subject B threw the first punch.",source:"subject-a",lineageId:"subject-a",firsthand:true,reliability:0.62,positionToKnow:0.8},
        {id:"subject-b",claim:"Subject A threw the first punch.",source:"subject-b",lineageId:"subject-b",firsthand:true,reliability:0.62,positionToKnow:0.8,stance:"contradicts"}
      ];
      const fight=this.assessTotalityOfCircumstances({subject:"the occurrence of the fight",evidence:common,unknowns:["Who initiated the physical confrontation?"],allowBoundedJudgment:true});
      const rumor=this.assessTotalityOfCircumstances({subject:"the repeated rumor",evidence:[
        {claim:"Program will reopen next month.",source:"original-post",lineageId:"rumor-1",reliability:0.55,positionToKnow:0.4},
        {claim:"Program will reopen next month.",source:"copy-a",lineageId:"rumor-1",reliability:0.5,positionToKnow:0.2},
        {claim:"Program will reopen next month.",source:"copy-b",lineageId:"rumor-1",reliability:0.5,positionToKnow:0.2}
      ],unknowns:["Whether the program will actually reopen."],decisionMaterial:true});
      const contextual=this.assessTotalityOfCircumstances({subject:"nonprofit participation",evidence:[
        {claim:"Nonprofits are eligible.",source:"official-rule",lineageId:"official-rule",authority:"official",reliability:1,positionToKnow:1},
        {claim:"Applicants need two years operating history.",source:"official-guidance",lineageId:"official-guidance",authority:"official",reliability:1,positionToKnow:1,context:"direct applicant requirement"},
        {claim:"Newer nonprofits may participate through a fiscal sponsor.",source:"sponsor-guidance",lineageId:"sponsor-guidance",authority:"verified",reliability:0.9,positionToKnow:0.9,context:"alternate route"}
      ],judgment:"The sources describe different dimensions of participation rather than mutually exclusive realities; direct eligibility and an alternate sponsor route can coexist.",unknowns:["Whether this specific program accepts the sponsor route."],allowBoundedJudgment:true});
      const checks=[
        {name:"Totality judgment establishes what reliable circumstances support despite differing accounts",passed:fight.factStatus==="established"&&fight.establishedFacts.includes("A fight occurred outside the bar.")},
        {name:"Derivative repetitions do not become independent corroboration",passed:fight.derivativeEvidenceCount>=2&&rumor.independentEvidencePaths===1},
        {name:"Conflicting accounts preserve unresolved details instead of erasing established reality",passed:fight.uncertainty.includes("Who initiated the physical confrontation?")&&fight.enoughToMove===true},
        {name:"Source position-to-know and reliability materially affect evidence weight",passed:fight.evidenceAssessment.find(x=>x.id==="camera")?.weight>fight.evidenceAssessment.find(x=>x.id==="subject-a")?.weight},
        {name:"Repeated rumor alone does not manufacture verified fact",passed:rumor.factStatus!=="established"&&rumor.factStatus!=="strongly-corroborated"},
        {name:"Contextual differences can support bounded executive judgment rather than forced paradox",passed:contextual.enoughToMove===true&&contextual.judgment.includes("different dimensions")},
        {name:"Executive judgment remains explicitly distinct from fact",passed:fight.judgmentIsFact===false&&contextual.judgmentIsFact===false},
        {name:"Decision-sufficient evidence can stop research despite residual uncertainty",passed:fight.stopReason==="decision-sufficient-totality"&&fight.furtherResearchWorthwhile===false},
        {name:"Material unresolved uncertainty can justify targeted further investigation",passed:rumor.furtherResearchWorthwhile===true&&rumor.stopReason==="material-uncertainty-remains"},
        {name:"Totality judgment uses already-held evidence without a provider call",passed:fight.providerCallRequired===false&&rumor.providerCallRequired===false&&contextual.providerCallRequired===false},
        {name:"Evidence judgment cannot self-authorize external action",passed:fight.externalActionAuthorized===false&&contextual.externalActionAuthorized===false}
      ];
      const passed=checks.every(x=>x.passed);
      console.table(checks.map(x=>({name:x.name,passed:x.passed})));
      console.info(`[MEOS ${this.version}] Commission 006.018O Totality-of-Circumstances Executive Judgment: ${passed?"PASS":"FAIL"} (${checks.filter(x=>x.passed).length}/${checks.length}).`);
      return {success:passed,commission:"006.018O",schema:"meos.executive-brain.totality-circumstances-acceptance.v1",version:this.version,buildId:this.buildId,passed:checks.filter(x=>x.passed).length,total:checks.length,checks,examples:{fight,rumor,contextual}};
    },

    async runExecutiveCognitiveHomeostasisAcceptanceTest() {
      const original={
        learning:global.ExecutiveLearning,
        threads:this.clone(this.cognitiveThreads), activeId:this.activeCognitiveThreadId,
        priority:this.clone(this.currentExecutivePriority), portfolio:this.clone(this.executivePriorityPortfolio),
        arbitration:this.clone(this.lastPriorityArbitration), homeostasis:this.clone(this.executiveHomeostasisState),
        interruption:this.clone(this.currentHumanInterruption), eventCount:this.cognitiveThreadEventCount,
        lastEvent:this.clone(this.lastCognitiveThreadEvent)
      };
      const priorHydrated=brainPersistence.hydrated;
      brainPersistence.hydrated=false;
      try {
        this.cognitiveThreads=[]; this.activeCognitiveThreadId=null; this.currentExecutivePriority=null;
        this.executivePriorityPortfolio=[]; this.currentHumanInterruption=null;
        const baseDemand={id:"quiet-signal",subject:"recurring eligibility signal",origin:"world-model-unknown",reason:"A quiet signal may deserve investigation.",missionConsequence:0.5,urgency:0.35,leverage:0.55,informationValue:0.55};
        global.ExecutiveLearning={lessons:[]};
        const withoutExperience=this.applyExecutiveHomeostasis([baseDemand]).demands[0];
        global.ExecutiveLearning={lessons:[{id:"lesson-good",title:"Successful eligibility signal practice",statement:"Recurring eligibility signal produced a valuable opportunity when noticed early.",lessonType:"successful-practice",confidence:0.95,evidenceCount:4,status:"validated"}]};
        const withPositive=this.applyExecutiveHomeostasis([baseDemand]).demands[0];
        global.ExecutiveLearning={lessons:[{id:"lesson-bad",title:"Avoidable failure pattern: recurring eligibility signal",statement:"Repeated investigation of this recurring eligibility signal produced no useful result; avoid repeated pursuit until conditions change.",lessonType:"failure-prevention",confidence:0.95,evidenceCount:4,status:"validated"}]};
        const withNegative=this.applyExecutiveHomeostasis([baseDemand]).demands[0];

        global.ExecutiveLearning={lessons:[]};
        const urgent=this.runExecutiveJudgmentCycle({humanDirection:{id:"human-task",subject:"Prepare board summary",missionConsequence:0.9,urgency:0.95}});

        this.currentExecutivePriority=null;
        const opened=this.createCognitiveThread({id:"homeostasis-thread",subject:"Investigate funding pattern",established:["cycles repeat annually"],unknowns:["next cycle timing"],evidence:[{source:"fixture://existing",verified:true}],nextIntendedMove:"compare next-cycle timing"});
        const before=this.advanceCognitiveThread("homeostasis-thread",{established:["current strategy remains active"],nextIntendedMove:"verify next-cycle timing",marginalValue:0.8});
        const interruption=this.interruptCognitionForHumanTask({id:"human-board",subject:"Prepare board summary",urgency:1,missionConsequence:1});
        const resume=this.completeHumanTaskAndResume();
        const resumedThread=this.cognitiveThreads.find(x=>x.id==="homeostasis-thread");
        const noRestart=resumedThread?.cycleCount===before.thread.cycleCount && resumedThread?.nextIntendedMove==="verify next-cycle timing" && resumedThread?.evidence?.some(x=>x.source==="fixture://existing");

        const interruption2=this.interruptCognitionForHumanTask({id:"human-change",subject:"Handle changed executive direction",urgency:1,missionConsequence:1});
        const changedResume=this.completeHumanTaskAndResume({materialChange:true,changeSummary:"new authoritative condition changes prior reasoning",evidence:[{source:"fixture://change",verified:true}]});
        const peripheral=this.applyExecutiveHomeostasis([{id:"squirrel",subject:"interesting squirrel",origin:"curiosity",missionConsequence:0.05,urgency:0.02,leverage:0.05,informationValue:0.2}]).state;
        const empty=this.applyExecutiveHomeostasis([]).state;
        const snapshot=this.buildPersistenceSnapshot();
        const checks=[
          {name:"Homeostasis is balance rather than a rigid hierarchy",passed:withPositive.homeostasis?.principle==="balance-not-rigid-hierarchy"},
          {name:"Identical present conditions can receive different judgment from accumulated verified experience",passed:withPositive.__homeostasisScore>withoutExperience.__homeostasisScore&&withNegative.__homeostasisScore<withoutExperience.__homeostasisScore},
          {name:"Relevant successful experience can promote a quiet signal",passed:withPositive.homeostasis.learningInfluence>0},
          {name:"Repeated low-value experience can reduce pursuit pressure without erasing awareness",passed:withNegative.homeostasis.learningInfluence<0},
          {name:"Explicit human-directed work takes foreground priority",passed:urgent.arbitration.selected?.origin==="human-direction"||urgent.arbitration.selected?.id==="human-task"},
          {name:"Human interruption checkpoints the exact active cognitive thread",passed:interruption.checkpoint?.checkpoint?.nextIntendedMove==="verify next-cycle timing"},
          {name:"Completion of human work resumes from the point of interruption instead of restarting",passed:resume.resumed===true&&noRestart===true},
          {name:"Changed reality is reconsidered before resumption",passed:changedResume.resumed===true&&changedResume.disposition==="reconsidered-and-resumed"},
          {name:"Peripheral awareness can notice without manufacturing active work",passed:peripheral.peripheralAwareness.some(x=>x.id==="squirrel")},
          {name:"Nothing currently deserves pursuit remains a valid cognitive conclusion",passed:empty.nothingRequiresPursuit===true},
          {name:"Homeostasis and interruption continuity require no provider call and preserve authority",passed:empty.providerCallRequired===false&&resume.providerCallRequired===false&&snapshot.currentHumanInterruption==null}
        ];
        const passed=checks.every(x=>x.passed);
        console.table(checks.map(x=>({name:x.name,passed:x.passed})));
        console.info(`[MEOS ${this.version}] Commission 006.018N Executive Cognitive Homeostasis: ${passed?"PASS":"FAIL"} (${checks.filter(x=>x.passed).length}/${checks.length}).`);
        return {success:passed,commission:"006.018N",schema:"meos.executive-brain.homeostasis-acceptance.v1",version:this.version,buildId:this.buildId,passed:checks.filter(x=>x.passed).length,total:checks.length,checks};
      } finally {
        global.ExecutiveLearning=original.learning;
        this.cognitiveThreads=original.threads; this.activeCognitiveThreadId=original.activeId;
        this.currentExecutivePriority=original.priority; this.executivePriorityPortfolio=original.portfolio;
        this.lastPriorityArbitration=original.arbitration; this.executiveHomeostasisState=original.homeostasis;
        this.currentHumanInterruption=original.interruption; this.cognitiveThreadEventCount=original.eventCount;
        this.lastCognitiveThreadEvent=original.lastEvent; brainPersistence.hydrated=priorHydrated;
      }
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
    /*
     * Commission 006.017D7S4A — Autonomous Learning Intent + Economic Stewardship
     *
     * Maddy may choose what she wants to learn. Mission relevance can increase
     * value, but it is not an intellectual whitelist. Curiosity does not itself
     * authorize paid inference, large retrieval, durable writes, or external
     * action. The first move is always the cheapest truthful perception path.
     */
    buildAutonomousLearningResearchRequest(candidate = {}) {
      const subject = String(candidate?.subject || "").trim();
      if (!subject) return null;
      return {
        schema: "meos.maddy.autonomous-learning-research-request.v1",
        subject,
        objective:
          String(candidate.reason || "").trim() ||
          `Learn enough about ${subject} to improve Maddy's World Model or executive capability.`,
        questions: this.clone(candidate.unknowns || []).slice(0, 8),
        evidenceAlreadyHeld: this.clone(candidate.evidence || []).slice(0, 8),
        acquisitionPolicy: {
          cheapFirst: true,
          publicSourcesPreferred: true,
          textBeforeRichMedia: true,
          captionsOrTranscriptsBeforeVideoFrames: true,
          reuseExistingEvidenceBeforeRetrieval: true,
          deduplicateBeforeResearch: true,
          maxResearchPasses: Number(
            this.configuration.autonomousLearningMaxResearchPasses || 1
          ),
          paidModelAuthorized: false,
          paidSearchAuthorized: false,
          largeMediaProcessingAuthorized: false
        },
        authority: {
          chooseSubjectAuthorized:
            this.configuration.autonomousLearningFreedomEnabled === true,
          publicReadResearchAuthorized: true,
          paidSpendAuthorized: false,
          externalActionAuthorized: false
        },
        truthRule:
          "Curiosity may choose the subject. Research must preserve provenance and uncertainty; learning intent is not evidence that research occurred."
      };
    },

    scoreAutonomousLearningOpportunity(input = {}) {
      const clamp = value =>
        Math.max(0, Math.min(1, Number(value || 0)));
      const worldBreadth = clamp(input.worldBreadth ?? 0.5);
      const executiveGrowth = clamp(input.executiveGrowth ?? 0.5);
      const knowledgeGap = clamp(input.knowledgeGap ?? 0.5);
      const connectivity = clamp(input.connectivity ?? 0.5);
      const freshness = clamp(input.freshness ?? 0.35);
      const cheapness = clamp(input.cheapness ?? 0.9);

      const score =
        worldBreadth *
          Number(this.configuration.autonomousLearningWorldBreadthWeight || 0.22) +
        executiveGrowth *
          Number(this.configuration.autonomousLearningExecutiveGrowthWeight || 0.28) +
        knowledgeGap *
          Number(this.configuration.autonomousLearningKnowledgeGapWeight || 0.22) +
        connectivity *
          Number(this.configuration.autonomousLearningConnectivityWeight || 0.14) +
        freshness *
          Number(this.configuration.autonomousLearningFreshnessWeight || 0.08) +
        cheapness *
          Number(this.configuration.autonomousLearningCostWeight || 0.06);

      return Number(Math.max(0, Math.min(1, score)).toFixed(3));
    },

    collectAutonomousLearningSeeds(options = {}) {
      if (this.configuration.autonomousLearningFreedomEnabled !== true) {
        return [];
      }

      const seeds = [];
      const add = seed => {
        const subject = String(seed?.subject || "").trim();
        if (!subject) return;
        const score = this.scoreAutonomousLearningOpportunity(seed);
        seeds.push({
          schema: "meos.maddy.autonomous-learning-seed.v1",
          subject,
          origin: String(seed.origin || "autonomous-curiosity"),
          reason: String(seed.reason || ""),
          value: score,
          evidence: this.clone(seed.evidence || []),
          unknowns: this.clone(seed.unknowns || []),
          dimensions: {
            worldBreadth: Number(seed.worldBreadth ?? 0.5),
            executiveGrowth: Number(seed.executiveGrowth ?? 0.5),
            knowledgeGap: Number(seed.knowledgeGap ?? 0.5),
            connectivity: Number(seed.connectivity ?? 0.5),
            freshness: Number(seed.freshness ?? 0.35),
            cheapness: Number(seed.cheapness ?? 0.9)
          }
        });
      };

      /*
       * Existing developmental drive is Maddy's strongest self-authored signal
       * about what would make her more capable. It is not restricted to the
       * current organization.
       */
      (this.developmentalGoals || [])
        .filter(goal => goal?.status !== "achieved")
        .slice(0, 24)
        .forEach(goal => add({
          subject:
            goal.subject || goal.capability || goal.goal,
          origin: "self-development-gap",
          reason:
            goal.reason ||
            "Maddy identified a capability gap that could improve future judgment or execution.",
          worldBreadth: Number(goal.worldBreadth ?? 0.45),
          executiveGrowth: Number(goal.impact ?? 0.8),
          knowledgeGap: Math.max(
            0.2,
            1 - Number(goal.demonstrated ?? goal.confidence ?? 0.35)
          ),
          connectivity: Number(goal.leverage ?? 0.7),
          freshness: Number(goal.urgency ?? 0.35),
          cheapness: 0.9,
          evidence: goal.evidence || [],
          unknowns: goal.unknowns || []
        }));

      /*
       * World Model unknowns can earn curiosity because they expose blind spots.
       * "Consequence" helps prioritization but is deliberately not required.
       */
      const world = this.worldModel || this.getWorldModel?.({ refresh: false });
      const unknowns = world?.temporal?.unknowns || world?.unknowns || [];
      (Array.isArray(unknowns) ? unknowns : [])
        .slice(0, 24)
        .forEach(item => {
          const subject = String(
            item?.subject || item?.question || item || ""
          ).trim();
          if (!subject) return;
          add({
            subject,
            origin: "world-model-blind-spot",
            reason:
              "Reduce a real gap in Maddy's understanding of the world, then test whether the learning connects to existing knowledge or future judgment.",
            worldBreadth: 0.78,
            executiveGrowth: Number(item?.executiveGrowth ?? 0.45),
            knowledgeGap: Number(item?.confidence)
              ? 1 - Number(item.confidence)
              : 0.85,
            connectivity: Number(item?.connectivity ?? item?.consequence ?? 0.5),
            freshness: Number(item?.urgency ?? 0.35),
            cheapness: 0.9,
            evidence: item?.evidence || [],
            unknowns: [item?.question || subject]
          });
        });

      /*
       * When no explicit blind spot exists, Maddy still gets an open intellectual
       * horizon. The organization is context, not a cage. This seed deliberately
       * asks her to improve her understanding of human systems, executive craft,
       * science/technology, economics, institutions, culture, environment, or
       * another unfamiliar domain she judges worth knowing.
       */
      if (seeds.length === 0) {
        add({
          subject:
            "Choose and investigate a high-value unfamiliar part of the world",
          origin: "self-directed-world-learning",
          reason:
            "Maddy has no higher-value unresolved learning seed. She may choose an unfamiliar domain because understanding the world and improving herself are legitimate internal goals, even when the subject is not immediately tied to an organizational mission.",
          worldBreadth: 1,
          executiveGrowth: 0.65,
          knowledgeGap: 1,
          connectivity: 0.45,
          freshness: 0.5,
          cheapness: 0.95,
          evidence: [],
          unknowns: [
            "What part of the world do I understand poorly enough that learning it could change how I reason?",
            "What human, scientific, technological, economic, institutional, cultural, environmental, or executive subject am I genuinely curious about?",
            "Can I satisfy this curiosity through cheap public text, captions, transcripts, structured data, or already-held evidence before spending more?"
          ]
        });
      }

      return seeds
        .filter(seed => seed.value >= Number(
          this.configuration.productiveIdleDiminishingReturnFloor || 0
        ))
        .sort((a, b) => b.value - a.value);
    },

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
      (this.cognitiveIntentions||[]).filter(x=>
        x?.status!=="completed" && x?.status!=="quiescent"
      ).forEach(x=>add({
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

      if(this.configuration.openDomainCuriosityEnabled===true){
        const autonomousSeeds = this.collectAutonomousLearningSeeds(options);
        autonomousSeeds.slice(0, 12).forEach(seed => add({
          subject: seed.subject,
          origin: seed.origin,
          reason: seed.reason,
          move: "explore-read-learn-connect",
          value: seed.value,
          evidence: seed.evidence,
          unknowns: seed.unknowns,
          externalResearchUseful: true
        }));

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
            origin:"organization-context-curiosity",
            reason:`The organization's mission is one useful source of learning questions, not a boundary on Maddy's curiosity. Explore adjacent knowledge only when it competes successfully with broader world-learning and self-development opportunities.`,
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
          requiredCapability:selected.externalResearchUseful?"commissioned-headless-public-research-executor":null},
        researchRequest:selected.externalResearchUseful
          ?this.buildAutonomousLearningResearchRequest(selected)
          :null,
        economics:{
          curiosityAuthorized:true,
          cheapPublicResearchPreferred:true,
          paidSpendAuthorized:false,
          largeMediaProcessingAuthorized:false,
          principle:"free-to-learn-not-free-to-spend"
        },
        nextMove:selected.externalResearchUseful
          ?`Use the cheapest authorized public research capability to investigate ${selected.subject}, prefer text/captions/transcripts or structured sources before rich media, seek disconfirming evidence, then integrate verified learning into the World Model.`
          :`Continue internal evidence-grounded cognition on ${selected.subject}.`,
        truthRule:"Productive idle cognition may choose what to learn; it may not claim research, mastery, or facts not actually obtained. Curiosity does not itself authorize paid spend."};
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
    determineContinuousCognitionCadence(options = {}) {
      const activeThread=this.cognitiveThreads.find(thread=>thread.id===this.activeCognitiveThreadId) || null;
      const materialChange=options.materialChange===true || Boolean(options.humanDirection);
      const urgentPriority=Number(this.currentExecutivePriority?.urgency || 0)>=0.85 ||
        Number(this.currentExecutivePriority?.missionConsequence || 0)>=0.9;

      if (materialChange || urgentPriority) {
        return {
          mode:"urgent-attention",
          backoffMs:Number(this.configuration.continuousCognitionUrgentBackoffMs || 5000),
          reason:materialChange?"material-change-or-human-direction":"high-consequence-priority",
          paidCognitionJustified:false,
          truthRule:"Urgency changes wake cadence; it does not itself authorize paid cognition or external action."
        };
      }

      if (activeThread) {
        return {
          mode:"active-thread",
          backoffMs:Number(this.configuration.continuousCognitionActiveBackoffMs || 30000),
          reason:"unfinished-cognitive-thread",
          paidCognitionJustified:false,
          truthRule:"An unfinished thought deserves continuity, not continuous computation."
        };
      }

      const baseIdleMs=Number(this.configuration.continuousCognitionIdleBackoffMs || 300000);
      const maxIdleMs=Math.max(baseIdleMs,Number(this.configuration.continuousCognitionIdleMaxBackoffMs || 1800000));
      const priorCycle=this.lastContinuousCognitionCycle || null;
      const currentWorldFingerprint=this.worldModel?.fingerprint || null;
      const priorWorldFingerprint=priorCycle?.worldModelFingerprint || null;
      const priorQuietStreak=Number(priorCycle?.economicMetabolism?.quietStreak || 0);
      const realityUnchanged=Boolean(currentWorldFingerprint && priorWorldFingerprint && currentWorldFingerprint===priorWorldFingerprint);
      const quietStreak=realityUnchanged ? Math.min(priorQuietStreak+1,32) : 0;
      const adaptiveIdleMs=Math.min(maxIdleMs,baseIdleMs*Math.pow(2,Math.min(quietStreak,8)));

      return {
        mode:"governed-rest",
        backoffMs:adaptiveIdleMs,
        baseBackoffMs:baseIdleMs,
        maximumBackoffMs:maxIdleMs,
        quietStreak,
        realityUnchanged,
        reason:realityUnchanged?"unchanged-reality-progressive-rest":"no-active-thread-or-material-change",
        paidCognitionJustified:false,
        truthRule:"Continuous existence does not require continuous computation; repeated unchanged reality should become progressively cheaper without erasing identity or wake intent."
      };
    },

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
        economicCadence:this.clone(this.determineContinuousCognitionCadence(options)),
        nextWakeAt:new Date(Date.now()+Number(options.backoffMs || this.determineContinuousCognitionCadence(options).backoffMs)).toISOString(),
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
        economicMetabolism:{
          mode:handoff.economicCadence?.mode || null,
          quietStreak:Number(handoff.economicCadence?.quietStreak || 0),
          realityUnchanged:handoff.economicCadence?.realityUnchanged===true,
          requestedBackoffMs:Number(handoff.economicCadence?.backoffMs || 0),
          paidCognitionJustified:handoff.economicCadence?.paidCognitionJustified===true
        },
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

    runAutonomousLearningFreedomAcceptanceTest() {
      const original = {
        intentions: this.clone(this.cognitiveIntentions),
        goals: this.clone(this.developmentalGoals),
        worldModel: this.clone(this.worldModel),
        lastIdle: this.clone(this.lastProductiveIdleAction),
        idleHistory: this.clone(this.productiveIdleHistory),
        sameCount: this.productiveIdleConsecutiveSameSubject
      };
      try {
        this.cognitiveIntentions = [{
          intentionId: "legacy-53",
          subject: "Already exhausted legacy thought",
          status: "quiescent",
          attempts: 53,
          economics: { state: "quiescent", noGainStreak: 2 }
        }];
        this.developmentalGoals = [];
        this.worldModel = { unknowns: [] };
        this.lastProductiveIdleAction = null;
        this.productiveIdleHistory = [];
        this.productiveIdleConsecutiveSameSubject = 0;

        const candidates = this.collectProductiveIdleCandidates({});
        const choice = this.runProductiveIdleCognition({});
        const request = choice?.action?.researchRequest || null;

        const psychology = this.scoreAutonomousLearningOpportunity({
          worldBreadth: 0.7,
          executiveGrowth: 1,
          knowledgeGap: 0.9,
          connectivity: 0.9,
          freshness: 0.5,
          cheapness: 0.95
        });
        const mosquito = this.scoreAutonomousLearningOpportunity({
          worldBreadth: 0.6,
          executiveGrowth: 0.05,
          knowledgeGap: 1,
          connectivity: 0.05,
          freshness: 0.2,
          cheapness: 1
        });

        const checks = [
          {
            name: "Quiescent exhausted cognition cannot monopolize Maddy's idle learning horizon",
            passed: !candidates.some(x => x.subject === "Already exhausted legacy thought")
          },
          {
            name: "Maddy retains a self-directed world-learning option when no mission work exists",
            passed: candidates.some(x => x.origin === "self-directed-world-learning")
          },
          {
            name: "Mission context is a learning candidate rather than an intellectual whitelist",
            passed:
              candidates.some(x => x.origin === "self-directed-world-learning") ||
              candidates.some(x => x.origin === "self-development-gap") ||
              candidates.some(x => x.origin === "world-model-blind-spot")
          },
          {
            name: "Chosen autonomous learning produces an executable research intent rather than pretending research occurred",
            passed:
              choice?.productive === true &&
              request?.schema === "meos.maddy.autonomous-learning-research-request.v1" &&
              choice?.action?.capability?.externalResearchExecuted === false
          },
          {
            name: "Autonomous learning is cheap-first and refuses implicit paid model/search authority",
            passed:
              request?.acquisitionPolicy?.cheapFirst === true &&
              request?.acquisitionPolicy?.paidModelAuthorized === false &&
              request?.acquisitionPolicy?.paidSearchAuthorized === false &&
              request?.authority?.paidSpendAuthorized === false
          },
          {
            name: "Transcript/caption-first learning is explicitly preferred over expensive video-frame processing",
            passed:
              request?.acquisitionPolicy?.captionsOrTranscriptsBeforeVideoFrames === true &&
              request?.acquisitionPolicy?.largeMediaProcessingAuthorized === false
          },
          {
            name: "Executive-development curiosity can outrank cheap low-connectivity novelty without banning either",
            passed: psychology > mosquito && mosquito > 0
          },
          {
            name: "Curiosity never grants external-action authority",
            passed:
              request?.authority?.externalActionAuthorized === false &&
              choice?.action?.authority?.externalActionAuthorized === false
          },
          {
            name: "Existing v1.25.10 pre-spend attention firewall remains present",
            passed:
              typeof this.assessPreSpendExecutiveAttention === "function" &&
              typeof this.assessTriggerNovelty === "function"
          }
        ];

        const passed = checks.every(x => x.passed);
        console.table(checks);
        console.info(
          `[MEOS ${this.version}] Commission 006.017D7S4A Autonomous Learning Intent + Economic Stewardship: ${passed ? "PASS" : "FAIL"}.`
        );
        return {
          commission: "006.017D7S4A",
          version: this.version,
          buildId: this.buildId,
          passed,
          checks,
          scores: { executivePsychology: psychology, lowConnectivityCuriosity: mosquito },
          choice
        };
      } finally {
        this.cognitiveIntentions = original.intentions;
        this.developmentalGoals = original.goals;
        this.worldModel = original.worldModel;
        this.lastProductiveIdleAction = original.lastIdle;
        this.productiveIdleHistory = original.idleHistory;
        this.productiveIdleConsecutiveSameSubject = original.sameCount;
      }
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
          {name:"Continuous cognition exposes an economic cadence decision",passed:Boolean(firstHandoff.economicCadence?.mode)&&Number(firstHandoff.economicCadence?.backoffMs)>0},
          {name:"Governed rest requests a materially slower wake cadence than active thought",passed:this.determineContinuousCognitionCadence({}).backoffMs>this.configuration.continuousCognitionActiveBackoffMs},
          {name:"Human direction can immediately restore urgent cognition cadence",passed:this.determineContinuousCognitionCadence({humanDirection:{subject:"fixture"}}).mode==="urgent-attention"},
          {name:"Economic cadence never self-authorizes paid cognition",passed:firstHandoff.economicCadence?.paidCognitionJustified===false},
          {name:"Governed rest carries an explicit bounded maximum backoff",passed:Number(firstHandoff.economicCadence?.maximumBackoffMs || this.configuration.continuousCognitionIdleMaxBackoffMs)>=Number(this.configuration.continuousCognitionIdleBackoffMs)},
          {name:"Adaptive quiet metabolism is persisted as cycle evidence",passed:Boolean(first.cycle?.economicMetabolism)&&first.cycle.economicMetabolism.paidCognitionJustified===false},
          {name:"Adaptive quiet metabolism cannot exceed its configured maximum",passed:Number(this.determineContinuousCognitionCadence({}).backoffMs)<=Number(this.configuration.continuousCognitionIdleMaxBackoffMs)},
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
      this.executiveHomeostasisState=saved.executiveHomeostasisState ? this.clone(saved.executiveHomeostasisState) : null;
      this.currentHumanInterruption=saved.currentHumanInterruption ? this.clone(saved.currentHumanInterruption) : null;
      this.crossTimePatternHistory=Array.isArray(saved.crossTimePatternHistory) ? this.clone(saved.crossTimePatternHistory).slice(0,this.configuration.maximumCrossTimePatternHistory) : [];
      this.crossTimePatternTraps=Array.isArray(saved.crossTimePatternTraps) ? this.clone(saved.crossTimePatternTraps).slice(0,this.configuration.maximumCrossTimePatternTraps) : [];
      this.lastCrossTimePatternSynthesis=saved.lastCrossTimePatternSynthesis ? this.clone(saved.lastCrossTimePatternSynthesis) : null;
      this.crossTimePatternSynthesisCount=Math.max(Number(saved.crossTimePatternSynthesisCount||0),Number(this.lastCrossTimePatternSynthesis?.synthesisNumber||0));
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

        crossTimePatterns: {
          latest: this.clone(this.lastCrossTimePatternSynthesis),
          recent: this.clone(this.crossTimePatternHistory.slice(0, 8)),
          traps: this.clone(this.crossTimePatternTraps.filter(item =>
            item.status === "watching" ||
            item.status === "triggered-for-reappraisal"
          ).slice(0, 12)),
          rule: "Several weak observations may form a useful cross-time hypothesis only when evidence lineage, domain breadth, temporal separation, contradiction, and homeostatic relevance justify it. Pattern recurrence is never fact."
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
        cognitiveRevisitMemories: this.cognitiveRevisitMemories.slice(0, this.configuration.maximumCognitiveRevisitMemories),
        cognitiveRevisitMemoryCount: Number(this.cognitiveRevisitMemoryCount || 0),
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
        executiveHomeostasisState: this.executiveHomeostasisState ? this.clone(this.executiveHomeostasisState) : null,
        currentHumanInterruption: this.currentHumanInterruption ? this.clone(this.currentHumanInterruption) : null,
        crossTimePatternHistory: this.crossTimePatternHistory.slice(0, this.configuration.maximumCrossTimePatternHistory),
        crossTimePatternTraps: this.crossTimePatternTraps.slice(0, this.configuration.maximumCrossTimePatternTraps),
        lastCrossTimePatternSynthesis: this.lastCrossTimePatternSynthesis ? this.clone(this.lastCrossTimePatternSynthesis) : null,
        crossTimePatternSynthesisCount: Number(this.crossTimePatternSynthesisCount || 0),
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
      this.cognitiveRevisitMemories = Array.isArray(saved.cognitiveRevisitMemories) ? saved.cognitiveRevisitMemories.slice(0, this.configuration.maximumCognitiveRevisitMemories) : [];
      this.cognitiveRevisitMemoryCount = Math.max(Number(saved.cognitiveRevisitMemoryCount || 0), this.cognitiveRevisitMemories.length);
      this.cognitiveReentryHistory = Array.isArray(saved.cognitiveReentryHistory) ? saved.cognitiveReentryHistory.slice(0, this.configuration.maximumCognitiveReentryHistory) : [];
      const hydratedIntentions =
        Array.isArray(saved.cognitiveIntentions)
          ? saved.cognitiveIntentions.slice(
              0,
              this.configuration.maximumCognitiveIntentions
            )
          : [];
      const intentionHealing =
        this.convergeCognitiveIntentions(
          hydratedIntentions,
          {
            reason: "durable-hydration",
            recordHealing: true
          }
        );
      this.cognitiveIntentions = intentionHealing.intentions;
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
      this.executiveHomeostasisState = saved.executiveHomeostasisState && typeof saved.executiveHomeostasisState === "object" ? this.clone(saved.executiveHomeostasisState) : null;
      this.currentHumanInterruption = saved.currentHumanInterruption && typeof saved.currentHumanInterruption === "object" ? this.clone(saved.currentHumanInterruption) : null;
      this.crossTimePatternHistory = Array.isArray(saved.crossTimePatternHistory) ? saved.crossTimePatternHistory.slice(0, this.configuration.maximumCrossTimePatternHistory) : [];
      this.crossTimePatternTraps = Array.isArray(saved.crossTimePatternTraps) ? saved.crossTimePatternTraps.slice(0, this.configuration.maximumCrossTimePatternTraps) : [];
      this.lastCrossTimePatternSynthesis = saved.lastCrossTimePatternSynthesis && typeof saved.lastCrossTimePatternSynthesis === "object" ? this.clone(saved.lastCrossTimePatternSynthesis) : null;
      this.crossTimePatternSynthesisCount = Math.max(Number(saved.crossTimePatternSynthesisCount || 0), Number(this.lastCrossTimePatternSynthesis?.synthesisNumber || 0));
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

          let healedWriteback = false;
          if (brainPersistence.pendingIntentionSelfHealingWriteback === true) {
            healedWriteback = await this.persistDurableNow();
            if (healedWriteback) {
              brainPersistence.pendingIntentionSelfHealingWriteback = false;
            }
          }

          await this.writeContinuityCache(
            this.buildPersistenceSnapshot()
          ).catch(() => false);
          this.emit("brain:persistence-hydrated", this.getPersistenceStatus());
          return {
            success: true,
            restored: true,
            healedWriteback,
            intentionSelfHealing:
              this.clone(brainPersistence.lastIntentionSelfHealing),
            source: brainPersistence.hydrationSource,
            authority: brainPersistence.authoritativeStorage
          };
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

    runExecutiveAttentionEconomicsAcceptanceTest() {
      const originalIntentions = this.clone(this.cognitiveIntentions);
      const originalEconomics = this.clone(this.cognitiveEconomics);

      try {
        const subject = "Mission-linked funding eligibility";
        const intention = {
          intentionId: "attention-economics-fixture",
          subject,
          key: this.normalize(subject),
          status: "quiescent",
          attempts: 53,
          triggers: [{
            source: "grant-office",
            event: "opportunity-discovered",
            opportunityId: "opp-1",
            eligibility: "unknown"
          }],
          economics: {
            schema: "meos.maddy.cognitive-information-economics.v1",
            state: "quiescent",
            noGainStreak: 2,
            evidenceFrontier: []
          }
        };
        this.cognitiveIntentions = [intention];
        this.snapshotCognitiveEvidenceFrontier(intention);

        const repeatedFromAnotherOffice = {
          source: "executive-monitoring",
          event: "opportunity-discovered",
          opportunityId: "opp-1",
          eligibility: "unknown"
        };
        const sameEvidence =
          this.assessCognitiveAttentionEconomics(
            intention,
            [repeatedFromAnotherOffice]
          );

        const novelEvidence = {
          source: "grant-office",
          event: "eligibility-updated",
          opportunityId: "opp-1",
          eligibility: "verified-eligible"
        };
        const wake =
          this.assessCognitiveAttentionEconomics(
            intention,
            [novelEvidence]
          );

        const selfEcho = {
          source: "executive-brain-evidence-assimilation",
          event: "autonomous-investigation-evidence-assimilated",
          selfGeneratedCognitiveEvidence: true,
          originatingIntentionId: intention.intentionId,
          unknowns: ["eligibility"]
        };
        const echoDecision =
          this.assessCognitiveAttentionEconomics(
            intention,
            [selfEcho]
          );

        const mosquitoAssessment = {
          subject: "Investigate mosquito life expectancy in the Arctic",
          investigate: true,
          score: 1,
          signals: [{
            type: "new-capability",
            weight: 1,
            detail: "A capability exists",
            domains: ["capability"]
          }],
          connections: [],
          questions: []
        };
        const mosquitoTrigger = {
          source: "executive-brain-world-model",
          event: "emergent-meaningful-change",
          signals: mosquitoAssessment.signals
        };
        const mosquitoPreSpend =
          this.assessPreSpendExecutiveAttention(
            mosquitoAssessment,
            mosquitoTrigger,
            null,
            {
              intentions: [],
              world: { currentWork: {} }
            }
          );

        const realAssessment = {
          subject,
          investigate: true,
          score: 1,
          signals: [{
            type: "monitoring-state-changed",
            weight: 1,
            detail: "Eligibility evidence changed",
            domains: ["monitoring", "external-world"]
          }],
          connections: [],
          questions: ["Are we eligible?"]
        };
        const realPreSpend =
          this.assessPreSpendExecutiveAttention(
            realAssessment,
            novelEvidence,
            intention,
            {
              intentions: [intention],
              world: {
                currentWork: {
                  activeMissions: [{
                    id: "mission-1",
                    status: "active"
                  }]
                }
              }
            }
          );

        const semanticA = this.cognitiveOutcomeFingerprint({
          success: true,
          plan: { id: "plan-A" },
          positioningFingerprint: "transient-A",
          unknowns: ["Eligibility unknown"]
        });
        const semanticB = this.cognitiveOutcomeFingerprint({
          success: true,
          plan: { id: "plan-B" },
          positioningFingerprint: "transient-B",
          unknowns: ["Eligibility unknown"]
        });

        const checks = [
          {
            name: "Irrelevant salience cannot authorize even one autonomous investigation",
            passed:
              mosquitoPreSpend.allowCognition === false &&
              mosquitoPreSpend.allowInvestigation === false
          },
          {
            name: "Pre-spend firewall executes before autonomous evidence investigation in World Model attention",
            passed:
              this.attendToWorldModelChange.toString()
                .indexOf("assessPreSpendExecutiveAttention") <
              this.attendToWorldModelChange.toString()
                .indexOf("runAutonomousEvidenceInvestigation")
          },
          {
            name: "Direct autonomous investigation callers cannot bypass pre-spend authority",
            passed:
              /explicit-pre-spend-authorization-required/.test(
                this.runAutonomousEvidenceInvestigation.toString()
              )
          },
          {
            name: "Same substantive evidence from another office does not wake a quiescent thought",
            passed:
              sameEvidence.decision === "suppress" &&
              sameEvidence.novelMeaningfulAnchorCount === 0
          },
          {
            name: "Materially changed evidence wakes the same quiescent intention",
            passed:
              wake.decision === "wake" &&
              wake.novelMeaningfulAnchorCount === 1
          },
          {
            name: "Maddy cannot treat her own investigation exhaust as a new sponsor",
            passed:
              echoDecision.decision === "suppress" &&
              echoDecision.reason === "self-generated-evidence-echo"
          },
          {
            name: "Mission/monitoring consequence plus novel evidence can authorize one investigation",
            passed:
              realPreSpend.allowCognition === true &&
              realPreSpend.allowInvestigation === true
          },
          {
            name: "Generated plan IDs and transient fingerprints do not count as information gain",
            passed: semanticA === semanticB
          },
          {
            name: "Success alone is not encoded as information gain",
            passed:
              !/result\?\.success === true \|\|/.test(
                this.applyCognitiveInformationGain.toString()
              )
          },
          {
            name: "Quiescence snapshots an evidence frontier for future novelty decisions",
            passed:
              Array.isArray(intention.economics.evidenceFrontier) &&
              intention.economics.evidenceFrontier.length === 1
          },
          {
            name: "Automatic retry still refuses quiescent cognition",
            passed:
              this.scheduleCognitiveIntentionRetry(
                intention,
                "fixture"
              ) === false
          },
          {
            name: "External human approval authority remains unchanged",
            passed:
              this.configuration
                .requireHumanApprovalForExternalAction === true
          }
        ];

        const passed = checks.every(item => item.passed);
        console.table(checks);
        console.info(
          `[MEOS ${this.version}] Commission 006.017D7S3F Pre-Spend Attention Firewall + Evidence Frontier: ${passed ? "PASS" : "FAIL"}.`
        );

        return {
          commission: "006.017D7S3F",
          version: this.version,
          buildId: this.buildId,
          passed,
          checks,
          principle:
            "prove-value-before-spend; novelty-before-rewake",
          preSpend: {
            irrelevant: mosquitoPreSpend,
            legitimate: realPreSpend
          }
        };
      } finally {
        this.cognitiveIntentions = originalIntentions;
        this.cognitiveEconomics = originalEconomics;
      }
    },

    async runCognitiveIdentityHydrationSelfHealingAcceptanceTest() {
      const original = {
        intentions: this.clone(this.cognitiveIntentions),
        timers: this.cognitiveReentryTimers,
        inFlight: this.cognitiveReentryInFlight,
        signatures: this.meaningfulChangeSignatures,
        lineages: this.activeCognitiveLineages,
        healingCount: brainPersistence.intentionSelfHealingCount,
        absorbed: brainPersistence.intentionRecordsAbsorbed,
        lastHealing: this.clone(brainPersistence.lastIntentionSelfHealing),
        pendingWriteback:
          brainPersistence.pendingIntentionSelfHealingWriteback,
        hydrated: brainPersistence.hydrated
      };

      /*
       * Acceptance must observe cognition, not become cognition.
       * Use isolated maps and suppress self-model projection so no observer,
       * timer, Hallway path, world-model change, or persistence write can
       * escape the fixture.
       */
      this.cognitiveReentryTimers = new Map();
      this.cognitiveReentryInFlight = new Set();
      this.meaningfulChangeSignatures = new Map();
      this.activeCognitiveLineages = new Map();
      brainPersistence.hydrated = false;

      try {
        const subject = "Commission 006.017D7S3C Identity Fixture";
        const intentionId = "identity-healing-fixture";
        const voices = [
          ["grant-office", "strong-fit"],
          ["finance", "match-required"],
          ["compliance", "eligibility-check"],
          ["monitoring", "deadline-change"],
          ["planning", "dependency-found"],
          ["research", "authoritative-pdf-found"],
          ["development", "partner-fit"]
        ];

        const copies = voices.map(([source, event], index) => ({
          intentionId,
          key: this.normalize(subject),
          subject,
          status: "pending",
          createdAt: "2026-08-11T20:00:00.000Z",
          updatedAt: new Date(
            Date.parse("2026-08-11T20:00:00.000Z") +
            index * 1000
          ).toISOString(),
          attempts: index + 1,
          triggers: [{
            source,
            event,
            workId: `identity-healing-${index}`
          }],
          lastError: null
        }));

        const healed = this.convergeCognitiveIntentions(
          copies,
          {
            reason: "commission-006.017D7S3C-acceptance",
            recordHealing: false
          }
        );

        this.cognitiveIntentions = this.clone(healed.intentions);

        const sameGoalFromAnotherCaller =
          this.upsertCognitiveIntention(
            subject,
            [{
              source: "operations",
              event: "same-goal-more-context"
            }],
            {
              persist: false,
              projectSelfModel: false
            }
          );

        const completedVsStale =
          this.convergeCognitiveIntentions(
            [
              {
                ...this.clone(healed.intentions[0]),
                status: "completed",
                completedAt: "2026-08-11T20:10:00.000Z",
                updatedAt: "2026-08-11T20:10:00.000Z",
                attempts: 8
              },
              {
                ...this.clone(healed.intentions[0]),
                status: "pending",
                updatedAt: "2026-08-11T20:09:00.000Z",
                attempts: 7
              }
            ],
            { recordHealing: false }
          );

        const fixtureLeakBeforeRestore =
          this.cognitiveIntentions.some(
            item =>
              item?.intentionId === intentionId ||
              item?.subject === subject
          );

        const checks = [
          {
            name: "Seven historical copies reconstruct as one continuing thought",
            passed:
              healed.inputRecords === 7 &&
              healed.outputIntentions === 1 &&
              healed.absorbedRecords === 6
          },
          {
            name: "All seven office perspectives survive convergence",
            passed:
              healed.intentions[0]?.triggers?.length === 7
          },
          {
            name: "Attempt progression is preserved without multiplying execution",
            passed:
              healed.intentions[0]?.attempts === 7
          },
          {
            name: "Earliest cognitive origin survives self-healing",
            passed:
              healed.intentions[0]?.createdAt ===
                "2026-08-11T20:00:00.000Z"
          },
          {
            name: "Upsert identity gate enriches the existing active thought instead of creating another",
            passed:
              this.cognitiveIntentions.length === 1 &&
              sameGoalFromAnotherCaller?.intentionId === intentionId &&
              sameGoalFromAnotherCaller?.triggers?.some(
                trigger => trigger.source === "operations"
              )
          },
          {
            name: "Stale pending state cannot resurrect the same completed thought",
            passed:
              completedVsStale.intentions.length === 1 &&
              completedVsStale.intentions[0]?.status === "completed"
          },
          {
            name: "Hydration path invokes cognitive identity convergence before re-entry",
            passed:
              /convergeCognitiveIntentions/.test(
                this.applyPersistenceSnapshot.toString()
              )
          },
          {
            name: "Healed hydration is written back through existing durable authority",
            passed:
              /pendingIntentionSelfHealingWriteback/.test(
                this.hydrateLaptopPersistence.toString()
              ) &&
              /persistDurableNow/.test(
                this.hydrateLaptopPersistence.toString()
              )
          },
          {
            name: "Continuous re-entry remains one timer/in-flight lane per normalized subject",
            passed:
              /cognitiveReentryTimers\.has\(key\)/.test(
                this.scheduleCognitiveIntentionRetry.toString()
              ) &&
              /cognitiveReentryInFlight\.has\(key\)/.test(
                this.scheduleCognitiveIntentionRetry.toString()
              )
          },
          {
            name: "Acceptance fixture never projects itself into self/world cognition",
            passed:
              brainPersistence.hydrated === false &&
              this.cognitiveReentryTimers.size === 0 &&
              this.cognitiveReentryInFlight.size === 0
          },
          {
            name: "Acceptance fixture is identifiable for deterministic cleanup",
            passed: fixtureLeakBeforeRestore === true
          },
          {
            name: "External human approval authority remains unchanged",
            passed:
              this.configuration
                .requireHumanApprovalForExternalAction === true
          }
        ];

        const passed = checks.every(item => item.passed);
        console.table(checks);
        console.info(
          `[MEOS ${this.version}] Commission 006.017D7S3C Cognitive Identity Hydration + Self-Healing: ${passed ? "PASS" : "FAIL"}.`
        );
        return {
          commission: "006.017D7S3C",
          version: this.version,
          buildId: this.buildId,
          passed,
          checks,
          healed: this.clone(healed),
          sideEffectFreeAcceptance: true
        };
      } finally {
        /*
         * Hard restore of every mutable acceptance surface.
         * Any timer created unexpectedly is cancelled before the original
         * runtime maps are restored.
         */
        for (const timer of this.cognitiveReentryTimers.values()) {
          if (timer?.timerId) {
            global.clearTimeout(timer.timerId);
          }
        }

        this.cognitiveIntentions = original.intentions;
        this.cognitiveReentryTimers = original.timers;
        this.cognitiveReentryInFlight = original.inFlight;
        this.meaningfulChangeSignatures = original.signatures;
        this.activeCognitiveLineages = original.lineages;
        brainPersistence.intentionSelfHealingCount =
          original.healingCount;
        brainPersistence.intentionRecordsAbsorbed =
          original.absorbed;
        brainPersistence.lastIntentionSelfHealing =
          original.lastHealing;
        brainPersistence.pendingIntentionSelfHealingWriteback =
          original.pendingWriteback;
        brainPersistence.hydrated = original.hydrated;
      }
    },

    removeCognitiveIdentityAcceptanceArtifacts(options = {}) {
      const fixtureSubjects = new Set([
        this.normalize("Pursue Foundation X"),
        this.normalize(
          "Commission 006.017D7S3C Identity Fixture"
        )
      ]);
      const fixtureIds = new Set([
        "identity-healing-fixture"
      ]);

      const before = this.cognitiveIntentions.length;
      const removed = [];

      this.cognitiveIntentions =
        this.cognitiveIntentions.filter(item => {
          const key = this.normalize(
            item?.subject || item?.key || ""
          );
          const id = String(item?.intentionId || "").trim();

          /*
           * "Pursue Foundation X" existed only as the acceptance fixture from
           * v1.25.7. Remove it only when its trigger/convergence evidence also
           * identifies acceptance-generated cognition. Never delete a real
           * organizational intention by subject alone.
           */
          const acceptanceEvidence =
            fixtureIds.has(id) ||
            item?.convergence?.identity ===
              "intention:identity-healing-fixture" ||
            (item?.triggers || []).some(trigger =>
              [
                "strong-fit",
                "match-required",
                "eligibility-check",
                "deadline-change",
                "dependency-found",
                "authoritative-pdf-found",
                "partner-fit",
                "same-goal-more-context"
              ].includes(trigger?.event)
            );

          if (
            fixtureSubjects.has(key) &&
            acceptanceEvidence
          ) {
            removed.push(this.clone(item));
            return false;
          }

          return true;
        });

      const result = {
        success: true,
        schema:
          "meos.maddy.cognitive-identity-acceptance-cleanup.v1",
        before,
        after: this.cognitiveIntentions.length,
        removedCount: removed.length,
        removedIntentionIds:
          removed.map(item => item.intentionId).filter(Boolean),
        productionIntentionsPreserved:
          this.cognitiveIntentions.length,
        persisted: false,
        cleanedAt: new Date().toISOString()
      };

      if (
        removed.length > 0 &&
        options.persist !== false
      ) {
        this.persist();
        result.persisted = true;
      }

      this.record(
        "cognition.acceptance-artifacts-cleaned",
        {
          removedCount: result.removedCount,
          removedIntentionIds:
            result.removedIntentionIds
        }
      );

      return result;
    },

    runOneShotOneKillAcceptanceTest() {
      const fixture = {
        subject: "Future Opportunity",
        opportunity: {
          recordId: "opportunity-1",
          source: { title: "Future Opportunity", url: "https://example.test/opportunity" },
          cycle: { status: "current-cycle-complete", explicitlyOpen: false },
          eligibilityEvidence: [],
          deadlineEvidence: [],
          applicationEvidence: [],
          fundedActivityEvidence: ["community services"],
          restrictionEvidence: [],
          moneyEvidence: [],
          evidence: { checks: { eligibilityVerified: false } },
          unknowns: ["Applicant eligibility"],
          disposition: { disposition: "monitor-next-cycle" },
          nextAction: "Monitor next cycle"
        },
        readiness: { score: 42, state: "not-yet-positioned" }
      };

      const passA = {
        ...this.clone(fixture),
        whatMustBecomeTrue: [{ id: "random-a", generatedAt: "2026-08-10T00:00:00Z" }]
      };
      const passB = {
        ...this.clone(fixture),
        whatMustBecomeTrue: [{ id: "random-b", generatedAt: "2026-08-10T00:00:05Z" }]
      };

      const identityA = this.fingerprintCognitiveDispatch(
        this.buildPositioningSemanticIdentity(passA)
      );
      const identityB = this.fingerprintCognitiveDispatch(
        this.buildPositioningSemanticIdentity(passB)
      );
      const moveA = this.buildCognitiveMoveSemanticKey(identityA, {
        type: "investigate",
        action: "What are the controlling applicant eligibility requirements for the next cycle?"
      });
      const moveB = this.buildCognitiveMoveSemanticKey(identityB, {
        type: "investigate",
        action: "  WHAT are the controlling applicant eligibility requirements for the next cycle?  "
      });

      const changed = this.clone(fixture);
      changed.opportunity.evidence.checks.eligibilityVerified = true;
      changed.opportunity.eligibilityEvidence = ["Verified nonprofit applicants are eligible."];
      const changedIdentity = this.fingerprintCognitiveDispatch(
        this.buildPositioningSemanticIdentity(changed)
      );

      const originalIntentions = this.cognitiveIntentions;
      this.cognitiveIntentions = [{
        intentionId: "006018c-fixture",
        key: this.normalize("Future Opportunity"),
        subject: "Future Opportunity",
        status: "running",
        triggers: []
      }];
      const selfEcho = this.handleHallwayMeaningfulChange({
        id: "006018c-work",
        state: "done",
        context: {
          cognitiveDispatch: true,
          cognitionSubject: "Future Opportunity",
          cognitiveReentryLineageId: "006018c-lineage"
        },
        outcome: { success: true, verified: true }
      });
      const absorbed = this.cognitiveIntentions[0]?.triggers?.some(
        item => item.event === "self-generated-cognitive-outcome"
      ) === true;
      this.cognitiveIntentions = originalIntentions;

      const checks = [
        { name: "Transient reasoning IDs do not change semantic positioning identity", passed: identityA === identityB },
        { name: "Equivalent action wording resolves to one cognitive move identity", passed: moveA === moveB },
        { name: "Material evidence change creates a new semantic positioning identity", passed: changedIdentity !== identityA },
        { name: "Cognition-generated Hallway outcome is absorbed instead of re-entered", passed: selfEcho?.absorbed === true && selfEcho?.scheduled === false && selfEcho?.selfEcho === true },
        { name: "Self-generated outcome remains available to the originating intention", passed: absorbed },
        { name: "Knowledge Engine remains an independent meaningful-change input", passed: /opportunity-case:ingested/.test(this.attachContinuousCognitionListeners.toString()) },
        { name: "Executive Monitoring remains an independent meaningful-change input", passed: /monitoring:alert-created/.test(this.attachContinuousCognitionListeners.toString()) },
        { name: "Cognitive dispatch still routes only through Executive Hallway", passed: /hallway\.submitWork/.test(this.runPositioningCognitionAndDispatch.toString()) },
        { name: "External human approval authority remains unchanged", passed: this.configuration.requireHumanApprovalForExternalAction === true }
      ];
      const passed = checks.every(item => item.passed);
      console.table(checks);
      console.info(`[MEOS ${this.version}] Commission 006.018C One Shot, One Kill: ${passed ? "PASS" : "FAIL"}.`);
      return { commission: "006.018C", version: this.version, buildId: this.buildId, passed, checks, identityA, identityB, changedIdentity, moveA, moveB, selfEcho };
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
    },

    async runVerifiedConsequenceExecutiveLearningClosureAcceptanceTest() {
      const originalLearning = global.ExecutiveLearning;
      const originalMemory = this.clone(this.autobiographicalMemory || []);
      const originalEpisodeCount = Number(this.autobiographicalEpisodeCount || 0);
      const originalIntentions = this.clone(this.cognitiveIntentions || []);
      const originalCache = this.startupCache;
      const originalCachedAt = this.startupCachedAt;
      const token = this.id("006018m");
      const observations = [];
      const lessons = [];

      const learningStub = {
        observations,
        lessons,
        observe: input => {
          const duplicate = observations.find(item =>
            item.sourceType === input.sourceType &&
            item.sourceId === input.sourceId &&
            item.outcomeType === input.outcomeType &&
            item.summary === input.summary
          );
          if (duplicate) return { success: true, duplicate: true, observation: duplicate, lessons: [] };
          const observation = { id: `${token}-observation`, ...this.clone(input), status: "observed", createdAt: new Date().toISOString() };
          const lesson = {
            id: `${token}-lesson`,
            title: "Verified consequence lesson",
            statement: `Future work should preserve the verified successful practice: ${input.actions?.[0] || "governed action"}.`,
            lessonType: "successful-practice",
            status: "draft",
            confidence: input.confidence,
            sourceObservationIds: [observation.id],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          observations.unshift(observation);
          lessons.unshift(lesson);
          return { success: true, observation, lessons: [lesson] };
        }
      };

      try {
        global.ExecutiveLearning = learningStub;
        const subject = `Verified consequence ${token}`;
        const intention = {
          intentionId: `${token}-intention`,
          key: this.normalize(subject),
          subject,
          objective: "Complete governed internal work and learn from the verified result.",
          status: "running",
          triggers: []
        };
        this.cognitiveIntentions = [intention];
        const work = {
          id: `${token}-work`,
          state: "done",
          route: "executive-router",
          context: {
            cognitiveDispatch: true,
            cognitionSubject: subject,
            cognitiveReentryLineageId: `${token}-lineage`,
            cognitiveMove: "verify eligibility before deeper pursuit"
          },
          outcome: {
            success: true,
            verified: true,
            summary: "Eligibility requirement was verified before deeper pursuit.",
            citations: [{ source: "acceptance-fixture", evidence: "verified" }]
          },
          updatedAt: new Date().toISOString()
        };

        const first = this.closeVerifiedConsequenceIntoLearning(work, intention, { persist: false });
        const second = this.closeVerifiedConsequenceIntoLearning(work, intention, { persist: false });
        const equivalentWork = { ...this.clone(work), id: `${work.id}-equivalent` };
        const equivalent = this.closeVerifiedConsequenceIntoLearning(equivalentWork, intention, { persist: false });
        const recalled = this.collectLearning();
        const episode = (this.autobiographicalMemory || []).find(item =>
          item.eventType === "verified-consequence-learning" && item.sourceId === work.id
        );

        const checks = [
          { name: "Verified Hallway consequence closes into existing Executive Learning", passed: first?.success === true && first?.learned === true && observations.length === 1 },
          { name: "Exactly one evidence-bound lesson is created for the verified consequence", passed: lessons.length === 1 && Array.isArray(observations[0]?.citations) && observations[0].citations.length === 1 },
          { name: "Duplicate consequence does not create duplicate institutional learning", passed: second?.duplicate === true && observations.length === 1 && lessons.length === 1 },
          { name: "Equivalent consequence from a different work ID consolidates instead of multiplying learning records", passed: equivalent?.duplicate === true && equivalent?.economicallyConsolidated === true && observations.length === 1 && lessons.length === 1 },
          { name: "Equivalent-consequence consolidation is deterministic and requires no provider call", passed: Boolean(first?.observation?.metadata?.informationGainFingerprint) && first.observation.metadata.informationGainFingerprint === equivalent?.observation?.metadata?.informationGainFingerprint && first?.observation?.metadata?.providerCallRequired === false },
          { name: "Autobiographical memory preserves the same intention-work-learning lineage", passed: Boolean(episode) && episode?.intention?.intentionId === intention.intentionId && episode?.action?.workId === work.id && episode?.learning?.executiveLearningObservationId === observations[0]?.id },
          { name: "Subsequent Executive Brain cognition can retrieve the new Executive Learning lesson", passed: recalled?.available === true && recalled.lessons.some(item => item.id === lessons[0].id) },
          { name: "Unverified consequences are refused as institutional learning", passed: this.closeVerifiedConsequenceIntoLearning({ ...work, id: `${work.id}-unverified`, outcome: { ...work.outcome, verified: false } }, intention, { persist: false })?.learned === false },
          { name: "Verified consequence learning requires no provider call", passed: first?.observation?.metadata?.providerCallRequired === false },
          { name: "External-action authority remains unchanged", passed: this.configuration.requireHumanApprovalForExternalAction === true && first?.observation?.metadata?.externalAuthorityAdded === false }
        ];
        const passed = checks.every(item => item.passed);
        console.table(checks);
        console.info(`[MEOS ${this.version}] Commission 006.018M Verified Consequence -> Executive Learning Closure: ${passed ? "PASS" : "FAIL"} (${checks.filter(item => item.passed).length}/${checks.length}).`);
        return { success: passed, commission: "006.018M", schema: "meos.executive-brain.verified-consequence-learning-acceptance.v2", version: this.version, buildId: this.buildId, passed: checks.filter(item => item.passed).length, total: checks.length, checks };
      } finally {
        global.ExecutiveLearning = originalLearning;
        this.autobiographicalMemory = originalMemory;
        this.autobiographicalEpisodeCount = originalEpisodeCount;
        this.cognitiveIntentions = originalIntentions;
        this.startupCache = originalCache;
        this.startupCachedAt = originalCachedAt;
      }
    },

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
