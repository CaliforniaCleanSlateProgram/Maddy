/**
 * MEOS Executive Brain
 * Version: 1.0.1
 * Build: EB101-MADDY-20260731-A
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

  const VERSION = "1.0.1";
  const BUILD_ID = "EB101-MADDY-20260731-A";
  const STORAGE_KEY = "meos.executive-brain.v1";

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
      requireHumanApprovalForExternalAction: true
    },

    initializedAt: null,
    refreshedAt: null,
    startupCache: null,
    startupCachedAt: 0,
    requestCache: new Map(),
    history: [],
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

      this.profiles.maddy =
        options.maddyProfile || this.resolveMaddyProfile();
      this.profiles.founder =
        options.founderProfile || this.resolveFounderProfile();
      this.profiles.organization =
        options.organizationProfile || this.resolveOrganizationProfile();

      this.initializedAt = new Date().toISOString();
      this.status = "online";
      this.refresh({ reason: "initialization" });

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
      const localContext = this.collectLocalContext(
        text,
        classification,
        options
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
        routing,

        providerInstructions: this.buildProviderInstructions({
          text,
          classification,
          startup,
          localContext,
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
          confidence: item.confidence
        })),
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
            null
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

    persist() {
      if (
        !this.configuration.persistenceEnabled ||
        !global.localStorage
      ) {
        return false;
      }

      return this.safe(() => {
        global.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            schema: "meos.executive-brain.state.v1",
            version: this.version,
            savedAt: new Date().toISOString(),
            history: this.history.slice(0, 100)
          })
        );
        return true;
      }, false);
    },

    restore() {
      if (!global.localStorage) {
        return false;
      }

      return this.safe(() => {
        const raw = global.localStorage.getItem(STORAGE_KEY);

        if (!raw) {
          return false;
        }

        const saved = JSON.parse(raw);

        if (saved?.schema !== "meos.executive-brain.state.v1") {
          return false;
        }

        this.history = Array.isArray(saved.history) ? saved.history : [];
        return true;
      }, false);
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
