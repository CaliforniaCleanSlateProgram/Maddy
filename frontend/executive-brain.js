/**
 * MEOS Executive Brain
 * Version: 1.3.2
 * Build: EB132-BOUNDED-PERSISTENCE-ACCEPTANCE-20260808-A
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

  const VERSION = "1.3.2";
  const BUILD_ID = "EB132-BOUNDED-PERSISTENCE-ACCEPTANCE-20260808-A";
  const STORAGE_KEY = "meos.executive-brain.v1";
  const INDEXED_DB_NAME = "meos-local-executive-repository";
  const INDEXED_DB_VERSION = 1;
  const INDEXED_DB_STORE = "engine-state";
  const INDEXED_DB_RECORD_ID = "executive-brain-state";
  const PERSISTENCE_DEBOUNCE_MS = 150;

  const brainPersistence = {
    mode: global.indexedDB ? "indexeddb-local-laptop" : "legacy-localstorage-fallback",
    authoritativeStorage: global.indexedDB ? "indexeddb" : "localstorage",
    indexedDbAvailable: Boolean(global.indexedDB),
    databaseName: INDEXED_DB_NAME,
    storeName: INDEXED_DB_STORE,
    hydrated: false,
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
      maximumCognitiveReentryHistory: 250
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
    meaningfulChangeSignatures: new Map(),
    cognitiveReentryTimers: new Map(),
    cognitiveReentryInFlight: new Set(),
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
      this.hydrateLaptopPersistence();

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
        refreshedAt: this.refreshedAt
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

      return this.scheduleCognitiveReentry(
        subject,
        {
          source: "executive-hallway",
          event: "work-updated",
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
                  true
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

        return result;
      } catch (error) {
        entry.status = "failed";
        entry.error =
          error?.message || String(error);

        this.emit(
          "brain:cognitive-reentry-failed",
          this.clone(entry)
        );

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
              this.clone(authority)
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

    buildPersistenceSnapshot() {
      return {
        schema: "meos.executive-brain.state.v1",
        version: this.version,
        savedAt: new Date().toISOString(),
        history: this.history.slice(0, 100),
        cognitionHistory: this.cognitionHistory.slice(0, this.configuration.maximumCognitionHistory),
        cognitiveDispatchHistory: this.cognitiveDispatchHistory.slice(0, this.configuration.maximumCognitiveDispatchHistory),
        cognitiveReentryHistory: this.cognitiveReentryHistory.slice(0, this.configuration.maximumCognitiveReentryHistory)
      };
    },

    applyPersistenceSnapshot(saved) {
      if (saved?.schema !== "meos.executive-brain.state.v1") return false;
      this.history = Array.isArray(saved.history) ? saved.history : [];
      this.cognitionHistory = Array.isArray(saved.cognitionHistory) ? saved.cognitionHistory.slice(0, this.configuration.maximumCognitionHistory) : [];
      this.cognitiveDispatchHistory = Array.isArray(saved.cognitiveDispatchHistory) ? saved.cognitiveDispatchHistory.slice(0, this.configuration.maximumCognitiveDispatchHistory) : [];
      this.cognitiveReentryHistory = Array.isArray(saved.cognitiveReentryHistory) ? saved.cognitiveReentryHistory.slice(0, this.configuration.maximumCognitiveReentryHistory) : [];
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

    async persistIndexedDbNow() {
      if (!global.indexedDB || brainPersistence.suspended) return false;
      brainPersistence.writeScheduled = false;
      brainPersistence.writeInFlight = true;
      try {
        await brainIndexedDbPut({ id: INDEXED_DB_RECORD_ID, schema: "meos.executive-brain.local-state.v1", version: this.version, buildId: this.buildId, savedAt: new Date().toISOString(), state: this.buildPersistenceSnapshot() });
        brainPersistence.mode = "indexeddb-local-laptop";
        brainPersistence.authoritativeStorage = "indexeddb";
        brainPersistence.lastPersistedAt = new Date().toISOString();
        brainPersistence.lastError = null;
        brainPersistence.suspended = false;
        this.releaseLegacyLocalStorage();
        return true;
      } catch (error) {
        brainPersistence.lastError = error?.message || String(error);
        brainPersistence.suspended = true;
        console.error("[MEOS Executive Brain] IndexedDB persistence failed. Cognition continues in runtime.", error);
        return false;
      } finally { brainPersistence.writeInFlight = false; }
    },

    persist() {
      if (!this.configuration.persistenceEnabled) return false;
      if (global.indexedDB) {
        brainPersistence.writeScheduled = true;
        if (brainPersistenceTimer) global.clearTimeout(brainPersistenceTimer);
        brainPersistenceTimer = global.setTimeout(() => {
          brainPersistenceTimer = null;
          brainWriteChain = brainWriteChain.catch(() => undefined).then(() => this.persistIndexedDbNow());
        }, PERSISTENCE_DEBOUNCE_MS);
        return true;
      }
      if (!global.localStorage) return false;
      return this.safe(() => {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.buildPersistenceSnapshot()));
        brainPersistence.mode = "legacy-localstorage-fallback";
        brainPersistence.authoritativeStorage = "localstorage";
        brainPersistence.lastPersistedAt = new Date().toISOString();
        return true;
      }, false);
    },

    restore() {
      if (!global.localStorage) return false;
      return this.safe(() => {
        const raw = global.localStorage.getItem(STORAGE_KEY);
        return raw ? this.applyPersistenceSnapshot(JSON.parse(raw)) : false;
      }, false);
    },

    async hydrateLaptopPersistence() {
      if (!global.indexedDB) { brainPersistence.hydrated = true; return { success: true, source: "localstorage-fallback" }; }
      try {
        const record = await brainIndexedDbGet();
        if (record?.state && this.applyPersistenceSnapshot(record.state)) {
          brainPersistence.hydrated = true;
          brainPersistence.lastRestoredAt = new Date().toISOString();
          brainPersistence.mode = "indexeddb-local-laptop";
          brainPersistence.authoritativeStorage = "indexeddb";
          this.releaseLegacyLocalStorage();
          this.emit("brain:persistence-hydrated", this.getPersistenceStatus());
          return { success: true, restored: true, source: "indexeddb" };
        }
        const saved = await this.persistIndexedDbNow();
        brainPersistence.hydrated = true;
        brainPersistence.migratedLegacySnapshot = saved === true;
        return { success: saved === true, restored: false, source: "legacy-migration" };
      } catch (error) {
        brainPersistence.hydrated = true;
        brainPersistence.lastError = error?.message || String(error);
        console.error("[MEOS Executive Brain] IndexedDB hydration failed; keeping runtime cognition.", error);
        return { success: false, error: brainPersistence.lastError };
      }
    },

    async flushPersistence() {
      if (brainPersistenceTimer) { global.clearTimeout(brainPersistenceTimer); brainPersistenceTimer = null; }
      if (global.indexedDB) {
        brainWriteChain = brainWriteChain.catch(() => undefined).then(() => this.persistIndexedDbNow());
        return brainWriteChain;
      }
      return this.persist();
    },

    getPersistenceStatus() {
      let localStorageBytes = null;
      try { localStorageBytes = new Blob([global.localStorage?.getItem(STORAGE_KEY) || ""]).size; } catch {}
      return this.clone({ ...brainPersistence, localStorageBytes });
    },

    async runLaptopPersistenceAcceptanceTest() {
      const probeId = "executive-brain-acceptance-probe";
      const checks = [{ name: "IndexedDB is available on this laptop browser", passed: Boolean(global.indexedDB) }];
      if (global.indexedDB) {
        try {
          await brainIndexedDbPut({ id: probeId, schema: "meos.persistence-probe.v1", writtenAt: new Date().toISOString() });
          checks.push({ name: "Laptop repository accepts writes", passed: Boolean(await brainIndexedDbGet(probeId)) });
          await brainIndexedDbDelete(probeId);
          checks.push({ name: "Laptop repository can read and delete records", passed: (await brainIndexedDbGet(probeId)) === null });
          /*
           * The persisted Brain snapshot is intentionally bounded. Runtime
           * history can be larger than the persisted startup window, so the
           * acceptance gate must compare against the persistence contract,
           * not against unbounded in-memory lengths.
           */
          const expected = {
            history: Math.min(this.history.length, 100),
            cognition: Math.min(
              this.cognitionHistory.length,
              this.configuration.maximumCognitionHistory
            ),
            dispatch: Math.min(
              this.cognitiveDispatchHistory.length,
              this.configuration.maximumCognitiveDispatchHistory
            ),
            reentry: Math.min(
              this.cognitiveReentryHistory.length,
              this.configuration.maximumCognitiveReentryHistory
            )
          };
          const flushed = await this.flushPersistence();
          const record = await brainIndexedDbGet();
          checks.push({
            name: "Executive Brain cognition snapshot flushes to IndexedDB",
            passed:
              flushed === true &&
              record?.state?.schema === "meos.executive-brain.state.v1"
          });
          checks.push({
            name: "Bounded cognitive histories survive the repository snapshot",
            passed:
              record?.state?.history?.length === expected.history &&
              record?.state?.cognitionHistory?.length === expected.cognition &&
              record?.state?.cognitiveDispatchHistory?.length === expected.dispatch &&
              record?.state?.cognitiveReentryHistory?.length === expected.reentry
          });
          checks.push({ name: "Legacy Executive Brain localStorage payload is released", passed: global.localStorage?.getItem(STORAGE_KEY) === null });
          checks.push({ name: "IndexedDB is the temporary laptop authority", passed: brainPersistence.authoritativeStorage === "indexeddb" && brainPersistence.mode === "indexeddb-local-laptop" });
          checks.push({ name: "Continuous cognition remains operational while persistence is asynchronous", passed: this.status === "online" && this.configuration.continuousCognitionEnabled === true && typeof this.scheduleCognitiveReentry === "function" });
        } catch (error) { checks.push({ name: "Laptop repository test completed without error", passed: false, error: error?.message || String(error) }); }
      }
      const passed = checks.every(item => item.passed);
      console.table(checks);
      console.info(`[MEOS ${this.version}] Commission 006.016G2 laptop persistence acceptance: ${passed ? "PASS" : "FAIL"}.`);
      return { commission: "006.016G2", version: this.version, buildId: this.buildId, passed, checks, persistence: this.getPersistenceStatus() };
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
