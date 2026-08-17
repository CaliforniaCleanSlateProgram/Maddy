/*
 * MEOS Document Classification Engine
 * Commission Candidate: 006.031J — Governed Document Intake Autonomy
 * Version: 1.2.0
 * Build: DC120-GOVERNED-DOCUMENT-INTAKE-AUTONOMY-20260817-A
 *
 * Mission:
 * Classify cataloged documents using explainable, organization-neutral rules,
 * and continue machine-solvable classification work autonomously only when
 * Durable Maddy Autonomy grants Document Intake authority.
 *
 * Brick boundary:
 * This engine determines likely document type, department routing, sensitivity,
 * authority level, review requirements, and whether a document represents
 * executable office work. It does not ingest files, mutate forms, create or
 * approve workflows, spend, sign, certify, submit, replace official policy,
 * or silently promote documents into institutional memory.
 *
 * Authority boundary:
 * - Document Intake authority governs self-initiated queue continuation.
 * - Human-directed classification remains available while standing autonomy is OFF.
 * - Queue presence, browser state, legacy autoProcessQueue, and engine availability
 *   never create standing autonomy.
 * - Browser event/timer continuation is compatibility execution only; no durable
 *   document runner is claimed by this browser organ.
 */

(function initializeDocumentClassifier(global) {
    "use strict";

    const STORAGE_KEY = "meos.document-classifier.v1";
    const SCHEMA = "meos.document-classifier.package.v1";
    const STATE_SCHEMA = "meos.document-classifier.persistence-snapshot.v1";
    const COMMISSION = "006.031J";
    const AUTONOMY_CAPABILITY = "documents";

    const DOCUMENT_TYPES = {
        UNKNOWN: "unknown",
        LEGAL_FILING: "legal-filing",
        TAX_DOCUMENT: "tax-document",
        GOVERNANCE: "governance",
        BOARD_MINUTES: "board-minutes",
        BOARD_RESOLUTION: "board-resolution",
        POLICY: "policy",
        SOP: "sop",
        STRATEGIC_PLAN: "strategic-plan",
        BUSINESS_PLAN: "business-plan",
        GRANT_OPPORTUNITY: "grant-opportunity",
        GRANT_APPLICATION: "grant-application",
        GRANT_AWARD: "grant-award",
        GRANT_REPORT: "grant-report",
        BUDGET: "budget",
        FINANCIAL_REPORT: "financial-report",
        LEDGER: "ledger",
        RECEIPT: "receipt",
        INVOICE: "invoice",
        BANKING: "banking",
        CONTRACT: "contract",
        MOU: "mou",
        LEASE: "lease",
        VENDOR_RECORD: "vendor-record",
        ASSET_RECORD: "asset-record",
        PERSONNEL: "personnel",
        PAYROLL: "payroll",
        VOLUNTEER: "volunteer",
        PROGRAM_DOCUMENT: "program-document",
        OPERATIONS: "operations",
        PARTNERSHIP: "partnership",
        COMMUNICATIONS: "communications",
        PRESS_RELEASE: "press-release",
        MARKETING: "marketing",
        WEBSITE_CONTENT: "website-content",
        MEETING_NOTES: "meeting-notes",
        CORRESPONDENCE: "correspondence",
        FORM: "form",
        CHECKLIST: "checklist",
        DIRECTORY: "directory",
        RESEARCH: "research",
        PRESENTATION: "presentation",
        SPREADSHEET: "spreadsheet",
        ARCHIVE: "archive"
    };

    const AUTHORITY_LEVELS = {
        SYSTEM: "system",
        OFFICIAL: "official",
        APPROVED: "approved",
        SUBMITTED: "submitted",
        WORKING: "working",
        DRAFT: "draft",
        HISTORICAL: "historical",
        UNREVIEWED: "unreviewed"
    };

    const SENSITIVITY_LEVELS = {
        PUBLIC: "public",
        INTERNAL: "internal",
        RESTRICTED: "restricted",
        HIGHLY_RESTRICTED: "highly-restricted"
    };

    const DOCUMENT_WORK_KINDS = {
        EVIDENCE_ONLY: "evidence-only",
        REVIEW: "review",
        DATA_ENTRY: "data-entry",
        APPLICATION: "application",
        CERTIFICATION: "certification",
        SIGNATURE: "signature",
        SUBMISSION: "submission",
        AGREEMENT: "agreement",
        UNKNOWN: "unknown"
    };

    const HUMAN_AUTHORITY_KINDS = {
        NONE: "none",
        REVIEW: "human-review",
        CERTIFICATION: "human-certification",
        SIGNATURE: "human-signature",
        EXECUTION: "human-execution"
    };


    const DocumentClassifier = {
        name: "MEOS Document Classification Engine",
        version: "1.2.0",
        buildId: "DC120-GOVERNED-DOCUMENT-INTAKE-AUTONOMY-20260817-A",
        commission: COMMISSION,
        status: "initializing",
        operatingMode: "explainable-classification",

        configuration: {
            persistenceEnabled: true,
            automaticPersistence: true,
            localStorageKey: STORAGE_KEY,
            organizationNeutralCore: true,
            // Legacy preference retained for compatibility only. It cannot grant autonomy.
            autoProcessQueue: false,
            autonomousQueueContinuationEnabled: true,
            autonomousQueueBatchSize: 25,
            autonomyAuthorityRequired: true,
            browserCompatibilityContinuationOnly: true,
            browserIndependentRunnerCommissioned: false,
            minimumAutoAcceptConfidence: 0.88,
            minimumSuggestedConfidence: 0.55,
            maximumAlternativeTypes: 3,
            requireExecutiveReviewForOfficialPromotion: true,
            defaultSensitivity: SENSITIVITY_LEVELS.INTERNAL,
            defaultAuthority: AUTHORITY_LEVELS.UNREVIEWED,
            defaultOffice: "Maddy"
        },

        rules: [],
        results: [],
        reviewQueue: [],
        activityLog: [],
        eventListeners: {},
        autonomyAuthorityUnsubscribers: [],
        ingestionQueueListener: null,
        deferredAutonomyBindingInstalled: false,
        autonomousContinuationId: null,
        autonomousContinuationRunning: false,
        autonomy: {
            lastSyncAt: null,
            lastAuthorityRevision: null,
            documentsEffective: false,
            lastReason: "authority-unproven",
            continuationAuthority: null,
            lastAutonomousRunAt: null,
            lastAutonomousProcessed: 0
        },
        initializedAt: null,

        initialize(options = {}) {
            this.configuration = {
                ...this.configuration,
                ...(options.configuration || options)
            };

            this.rules = this.buildDefaultRules();
            this.restore();
            this.initializedAt = new Date().toISOString();
            this.status = "online";

            this.registerSystemKnowledge();
            this.bindAutonomyAuthorityEvents();
            this.bindIngestionQueueEvents();
            this.installDeferredAutonomyBinding();
            this.syncAutonomyRuntime({ reason: "initialize" });

            this.logActivity("classifier.initialized", {
                version: this.version,
                ruleCount: this.rules.length,
                restoredResults: this.results.length,
                pendingReviews: this.reviewQueue.filter(
                    (item) => item.status === "pending"
                ).length
            });

            console.info(
                `[MEOS] ${this.name} v${this.version} ${this.status}. Build ${this.buildId}.`
            );

            this.emit("classifier:online", this.getStatus());
            return this.getStatus();
        },

        getAutonomyAuthority() {
            return (
                global.MaddyAutonomy ||
                global.MEOSAutonomyAuthority ||
                null
            );
        },

        getAutonomyIntegrationStatus(capabilityId = AUTONOMY_CAPABILITY) {
            if (capabilityId !== AUTONOMY_CAPABILITY) {
                return {
                    ready: false,
                    reason: "unsupported-document-autonomy-capability",
                    capabilityId,
                    version: this.version,
                    commission: this.commission,
                    buildId: this.buildId
                };
            }

            const ingestionReady = Boolean(
                global.DocumentIngestion &&
                typeof global.DocumentIngestion.dequeueNext === "function"
            );

            return {
                ready: ingestionReady,
                reason: ingestionReady
                    ? "governed-document-intake-classification-contract-ready"
                    : "document-ingestion-integration-unavailable",
                capabilityId,
                version: this.version,
                commission: this.commission,
                buildId: this.buildId,
                authoritySource: "server-durable-maddy-autonomy-authority",
                browserAuthority: false,
                queuePresenceCreatesAuthority: false,
                legacyAutoProcessQueueCreatesAuthority: false,
                humanDirectedClassificationPreserved: true,
                eventDrivenQueueContinuation: true,
                browserCompatibilityContinuationOnly: true,
                browserIndependentRunnerCommissioned: false,
                workflowCreationAuthorized: false,
                workflowApprovalAuthorized: false,
                automaticSpendAuthorized: false,
                externalActionAuthorized: false,
                documentMutationAuthorized: false,
                signatureAuthorized: false,
                certificationAuthorized: false,
                submissionAuthorized: false,
                legalCommitmentAuthorized: false,
                institutionalTruthPromotionAuthorized: false,
                persistenceSnapshotContract: STATE_SCHEMA
            };
        },

        autonomyCapabilityStatus() {
            const authority = this.getAutonomyAuthority();

            if (
                !authority ||
                typeof authority.capabilityStatus !== "function"
            ) {
                return {
                    id: AUTONOMY_CAPABILITY,
                    effective: false,
                    uiState: "BLOCKED",
                    reason: "maddy-autonomy-authority-unavailable"
                };
            }

            try {
                return authority.capabilityStatus(AUTONOMY_CAPABILITY) || {
                    id: AUTONOMY_CAPABILITY,
                    effective: false,
                    uiState: "BLOCKED",
                    reason: "document-autonomy-status-unavailable"
                };
            } catch (error) {
                return {
                    id: AUTONOMY_CAPABILITY,
                    effective: false,
                    uiState: "BLOCKED",
                    reason: "document-autonomy-probe-failed",
                    error: error?.message || String(error)
                };
            }
        },

        isAutonomyAuthorized() {
            const authority = this.getAutonomyAuthority();
            if (!authority || typeof authority.isAuthorized !== "function") {
                return false;
            }

            try {
                return authority.isAuthorized(AUTONOMY_CAPABILITY) === true;
            } catch (_error) {
                return false;
            }
        },

        captureAutonomyReceipt() {
            const authority = this.getAutonomyAuthority();
            const status = this.autonomyCapabilityStatus();
            let snapshot = null;

            try {
                snapshot =
                    typeof authority?.getSnapshot === "function"
                        ? authority.getSnapshot()
                        : null;
            } catch (_error) {
                snapshot = null;
            }

            return {
                schema: "meos.document-classifier.autonomy-receipt.v1",
                capabilityId: AUTONOMY_CAPABILITY,
                effective: status?.effective === true,
                uiState: status?.uiState || "BLOCKED",
                reason: status?.reason || "authority-unproven",
                authorityRevision:
                    Number(snapshot?.revision || 0) ||
                    Number(snapshot?.policy?.revision || 0) ||
                    Number(snapshot?.serverStatus?.revision || 0) ||
                    null,
                authoritySource: "server-durable-maddy-autonomy-authority",
                browserAuthority: false,
                capturedAt: new Date().toISOString()
            };
        },

        resolveExecutionMode(options = {}) {
            const autonomous =
                options.autonomous === true ||
                options.machineInitiated === true;
            const humanDirected =
                options.humanDirected === true || !autonomous;

            return {
                autonomous,
                machineInitiated: autonomous,
                humanDirected,
                source:
                    options.source ||
                    (autonomous
                        ? "autonomy-document-intake"
                        : "human-directed-document-classification")
            };
        },

        evaluateAutonomousAdmission(options = {}) {
            const mode = this.resolveExecutionMode(options);

            if (!mode.autonomous) {
                return {
                    allowed: true,
                    mode,
                    authorityReceipt: null,
                    reason: "human-directed-classification"
                };
            }

            if (!this.isAutonomyAuthorized()) {
                return {
                    allowed: false,
                    blockedByAutonomy: true,
                    mode,
                    authorityReceipt: null,
                    reason: "document-intake-autonomy-not-authorized",
                    documents: this.autonomyCapabilityStatus()
                };
            }

            const authorityReceipt = this.captureAutonomyReceipt();
            if (authorityReceipt.effective !== true) {
                return {
                    allowed: false,
                    blockedByAutonomy: true,
                    mode,
                    authorityReceipt,
                    reason: "document-intake-authority-receipt-not-effective",
                    documents: this.autonomyCapabilityStatus()
                };
            }

            return {
                allowed: true,
                mode,
                authorityReceipt,
                reason: "durable-document-intake-authorized"
            };
        },

        bindAutonomyAuthorityEvents() {
            if (
                Array.isArray(this.autonomyAuthorityUnsubscribers) &&
                this.autonomyAuthorityUnsubscribers.length > 0
            ) {
                return true;
            }

            const authority = this.getAutonomyAuthority();
            if (!authority || typeof authority.on !== "function") {
                return false;
            }

            const sync = () => {
                try {
                    this.syncAutonomyRuntime({ reason: "authority-event" });
                } catch (error) {
                    console.warn(
                        "[MEOS Document Classifier] Autonomy synchronization failed.",
                        error
                    );
                    this.cancelAutonomousQueueContinuation({
                        reason: "autonomy-sync-failed"
                    });
                }
            };

            try {
                ["authority:updated", "authority:unavailable"].forEach((eventName) => {
                    const unsubscribe = authority.on(eventName, sync);
                    if (typeof unsubscribe === "function") {
                        this.autonomyAuthorityUnsubscribers.push(unsubscribe);
                    }
                });
                sync();
                return true;
            } catch (_error) {
                return false;
            }
        },

        bindIngestionQueueEvents() {
            const ingestion = global.DocumentIngestion;
            if (!ingestion || typeof ingestion.on !== "function") {
                return false;
            }

            if (this.ingestionQueueListener) {
                return true;
            }

            this.ingestionQueueListener = () => {
                if (!this.isAutonomyAuthorized()) {
                    return;
                }
                this.scheduleAutonomousQueueContinuation({
                    reason: "classification-queued"
                });
            };

            ingestion.on(
                "classification:queued",
                this.ingestionQueueListener
            );
            return true;
        },

        installDeferredAutonomyBinding() {
            if (this.deferredAutonomyBindingInstalled) {
                return true;
            }

            if (typeof global.addEventListener !== "function") {
                return false;
            }

            this.deferredAutonomyBindingInstalled = true;
            global.addEventListener("load", () => {
                this.bindAutonomyAuthorityEvents();
                this.bindIngestionQueueEvents();
                this.syncAutonomyRuntime({ reason: "window-load" });
            });
            return true;
        },

        syncAutonomyRuntime(options = {}) {
            const documents = this.autonomyCapabilityStatus();
            const authority = this.getAutonomyAuthority();
            let snapshot = null;

            try {
                snapshot =
                    typeof authority?.getSnapshot === "function"
                        ? authority.getSnapshot()
                        : null;
            } catch (_error) {
                snapshot = null;
            }

            this.autonomy.lastSyncAt = new Date().toISOString();
            this.autonomy.lastAuthorityRevision =
                Number(snapshot?.revision || 0) ||
                Number(snapshot?.policy?.revision || 0) ||
                Number(snapshot?.serverStatus?.revision || 0) ||
                null;
            this.autonomy.documentsEffective = documents?.effective === true;
            this.autonomy.lastReason =
                options.reason || documents?.reason || "authority-unproven";
            this.autonomy.continuationAuthority =
                this.autonomy.documentsEffective
                    ? "central-autonomy-authority"
                    : null;

            if (!this.autonomy.documentsEffective) {
                this.cancelAutonomousQueueContinuation({
                    reason: "document-intake-authority-off"
                });
                return {
                    success: true,
                    authorized: false,
                    scheduled: false,
                    reason: documents?.reason || "document-intake-autonomy-off"
                };
            }

            const scheduled =
                this.configuration.autonomousQueueContinuationEnabled === true
                    ? this.scheduleAutonomousQueueContinuation({
                        reason: options.reason || "document-intake-authority-on"
                    })
                    : {
                        success: true,
                        scheduled: false,
                        reason: "autonomous-queue-continuation-disabled"
                    };

            return {
                success: true,
                authorized: true,
                scheduled: scheduled?.scheduled === true,
                reason: scheduled?.reason || "document-intake-authorized"
            };
        },

        queuedClassificationCount() {
            const queue = global.DocumentIngestion?.classificationQueue;
            return Array.isArray(queue)
                ? queue.filter((item) => item?.status === "queued").length
                : 0;
        },

        scheduleAutonomousQueueContinuation(options = {}) {
            if (this.configuration.autonomousQueueContinuationEnabled !== true) {
                return {
                    success: true,
                    scheduled: false,
                    reason: "autonomous-queue-continuation-disabled"
                };
            }

            if (!this.isAutonomyAuthorized()) {
                this.autonomy.continuationAuthority = null;
                return {
                    success: false,
                    scheduled: false,
                    blockedByAutonomy: true,
                    reason: "document-intake-autonomy-not-authorized"
                };
            }

            if (this.queuedClassificationCount() === 0) {
                return {
                    success: true,
                    scheduled: false,
                    reason: "document-classification-queue-empty"
                };
            }

            if (this.autonomousContinuationId) {
                return {
                    success: true,
                    scheduled: true,
                    alreadyScheduled: true,
                    reason: "document-continuation-already-scheduled"
                };
            }

            this.autonomy.continuationAuthority = "central-autonomy-authority";
            const schedule =
                typeof global.setTimeout === "function"
                    ? global.setTimeout.bind(global)
                    : setTimeout;

            this.autonomousContinuationId = schedule(() => {
                this.autonomousContinuationId = null;
                this.runAutonomousQueueContinuation({
                    reason: options.reason || "scheduled-document-continuation"
                });
            }, 0);

            return {
                success: true,
                scheduled: true,
                reason: options.reason || "document-continuation-scheduled"
            };
        },

        cancelAutonomousQueueContinuation(options = {}) {
            if (this.autonomousContinuationId) {
                const clear =
                    typeof global.clearTimeout === "function"
                        ? global.clearTimeout.bind(global)
                        : clearTimeout;
                clear(this.autonomousContinuationId);
                this.autonomousContinuationId = null;
            }
            this.autonomy.continuationAuthority = null;
            return {
                success: true,
                cancelled: true,
                reason: options.reason || "document-continuation-cancelled"
            };
        },

        runAutonomousQueueContinuation(options = {}) {
            if (this.autonomousContinuationRunning) {
                return {
                    success: true,
                    running: true,
                    processed: 0,
                    reason: "document-continuation-already-running"
                };
            }

            const admission = this.evaluateAutonomousAdmission({
                autonomous: true,
                machineInitiated: true,
                source: options.source || "autonomy-document-queue-continuation"
            });

            if (!admission.allowed) {
                this.cancelAutonomousQueueContinuation({
                    reason: admission.reason
                });
                return {
                    success: false,
                    processed: 0,
                    blockedByAutonomy: true,
                    reason: admission.reason,
                    documents: admission.documents || this.autonomyCapabilityStatus()
                };
            }

            this.autonomousContinuationRunning = true;
            let result;
            try {
                result = this.processQueue({
                    autonomous: true,
                    machineInitiated: true,
                    humanDirected: false,
                    source: options.source || "autonomy-document-queue-continuation",
                    maximumDocuments: Math.max(
                        1,
                        Math.min(
                            100,
                            Number(
                                options.maximumDocuments ||
                                this.configuration.autonomousQueueBatchSize ||
                                25
                            )
                        )
                    )
                });
            } finally {
                this.autonomousContinuationRunning = false;
            }

            this.autonomy.lastAutonomousRunAt = new Date().toISOString();
            this.autonomy.lastAutonomousProcessed =
                Number(result?.processed || result?.results?.length || 0);

            if (
                this.isAutonomyAuthorized() &&
                this.queuedClassificationCount() > 0
            ) {
                this.scheduleAutonomousQueueContinuation({
                    reason: "document-queue-remains"
                });
            }

            return {
                ...result,
                autonomous: true,
                authorityReceipt: admission.authorityReceipt
            };
        },

        buildDefaultRules() {
            return [
                this.createRule({
                    id: "legal-articles-incorporation",
                    type: DOCUMENT_TYPES.LEGAL_FILING,
                    label: "Articles of Incorporation",
                    office: "Justice",
                    authority: AUTHORITY_LEVELS.OFFICIAL,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 95,
                    phrases: [
                        "articles of incorporation",
                        "articles of organization",
                        "certificate of incorporation"
                    ],
                    extensions: ["pdf", "doc", "docx"]
                }),
                this.createRule({
                    id: "tax-determination-letter",
                    type: DOCUMENT_TYPES.TAX_DOCUMENT,
                    label: "Tax Determination or Exemption Document",
                    office: "Archie",
                    authority: AUTHORITY_LEVELS.OFFICIAL,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 98,
                    phrases: [
                        "determination letter",
                        "tax exempt",
                        "tax-exempt",
                        "501 c 3",
                        "501(c)(3)",
                        "ein",
                        "employer identification number",
                        "internal revenue service",
                        "franchise tax board"
                    ]
                }),
                this.createRule({
                    id: "governance-bylaws",
                    type: DOCUMENT_TYPES.GOVERNANCE,
                    label: "Governance Document",
                    office: "Justice",
                    authority: AUTHORITY_LEVELS.APPROVED,
                    sensitivity: SENSITIVITY_LEVELS.INTERNAL,
                    score: 90,
                    phrases: [
                        "bylaws",
                        "governance",
                        "board charter",
                        "conflict of interest policy"
                    ]
                }),
                this.createRule({
                    id: "board-minutes",
                    type: DOCUMENT_TYPES.BOARD_MINUTES,
                    label: "Board Minutes",
                    office: "Justice",
                    authority: AUTHORITY_LEVELS.APPROVED,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 92,
                    phrases: [
                        "board minutes",
                        "minutes of the meeting",
                        "board meeting minutes",
                        "meeting called to order",
                        "motion carried"
                    ]
                }),
                this.createRule({
                    id: "board-resolution",
                    type: DOCUMENT_TYPES.BOARD_RESOLUTION,
                    label: "Board or Corporate Resolution",
                    office: "Justice",
                    authority: AUTHORITY_LEVELS.APPROVED,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 94,
                    phrases: [
                        "corporate resolution",
                        "board resolution",
                        "resolved that",
                        "resolution to"
                    ]
                }),
                this.createRule({
                    id: "policy",
                    type: DOCUMENT_TYPES.POLICY,
                    label: "Policy",
                    office: "Justice",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.INTERNAL,
                    score: 78,
                    phrases: [
                        "policy",
                        "policy statement",
                        "effective date",
                        "approved by"
                    ]
                }),
                this.createRule({
                    id: "sop",
                    type: DOCUMENT_TYPES.SOP,
                    label: "Standard Operating Procedure",
                    office: "Maddy",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.INTERNAL,
                    score: 92,
                    phrases: [
                        "standard operating procedure",
                        "sop",
                        "operational procedure",
                        "procedure guide",
                        "operational guide"
                    ]
                }),
                this.createRule({
                    id: "strategic-plan",
                    type: DOCUMENT_TYPES.STRATEGIC_PLAN,
                    label: "Strategic Plan",
                    office: "Maddy",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.INTERNAL,
                    score: 92,
                    phrases: [
                        "strategic plan",
                        "strategic priorities",
                        "five year plan",
                        "multi-year plan"
                    ]
                }),
                this.createRule({
                    id: "business-plan",
                    type: DOCUMENT_TYPES.BUSINESS_PLAN,
                    label: "Business Plan",
                    office: "Maddy",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.INTERNAL,
                    score: 88,
                    phrases: [
                        "business plan",
                        "operating model",
                        "revenue model",
                        "market analysis"
                    ]
                }),
                this.createRule({
                    id: "grant-opportunity",
                    type: DOCUMENT_TYPES.GRANT_OPPORTUNITY,
                    label: "Grant Opportunity",
                    office: "Grant",
                    authority: AUTHORITY_LEVELS.UNREVIEWED,
                    sensitivity: SENSITIVITY_LEVELS.INTERNAL,
                    score: 87,
                    phrases: [
                        "notice of funding opportunity",
                        "request for proposals",
                        "request for applications",
                        "funding opportunity",
                        "grant guidelines",
                        "application deadline",
                        "eligible applicants"
                    ]
                }),
                this.createRule({
                    id: "grant-application",
                    type: DOCUMENT_TYPES.GRANT_APPLICATION,
                    label: "Grant Application",
                    office: "Grant",
                    authority: AUTHORITY_LEVELS.SUBMITTED,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 94,
                    phrases: [
                        "grant application",
                        "application narrative",
                        "project narrative",
                        "statement of need",
                        "requested amount",
                        "submitted application"
                    ]
                }),
                this.createRule({
                    id: "grant-award",
                    type: DOCUMENT_TYPES.GRANT_AWARD,
                    label: "Grant Award",
                    office: "Grant",
                    authority: AUTHORITY_LEVELS.OFFICIAL,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 96,
                    phrases: [
                        "notice of award",
                        "grant award",
                        "award letter",
                        "award amount",
                        "grant agreement"
                    ]
                }),
                this.createRule({
                    id: "grant-report",
                    type: DOCUMENT_TYPES.GRANT_REPORT,
                    label: "Grant Report",
                    office: "Grant",
                    authority: AUTHORITY_LEVELS.SUBMITTED,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 88,
                    phrases: [
                        "grant report",
                        "progress report",
                        "final report",
                        "performance report",
                        "grant deliverables"
                    ]
                }),
                this.createRule({
                    id: "budget",
                    type: DOCUMENT_TYPES.BUDGET,
                    label: "Budget",
                    office: "Archie",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 90,
                    phrases: [
                        "budget",
                        "budget narrative",
                        "project budget",
                        "operating budget",
                        "budget worksheet"
                    ],
                    extensions: ["xls", "xlsx", "csv", "pdf", "doc", "docx"]
                }),
                this.createRule({
                    id: "financial-report",
                    type: DOCUMENT_TYPES.FINANCIAL_REPORT,
                    label: "Financial Report",
                    office: "Archie",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 90,
                    phrases: [
                        "financial report",
                        "statement of financial position",
                        "income statement",
                        "profit and loss",
                        "balance sheet",
                        "cash flow"
                    ]
                }),
                this.createRule({
                    id: "ledger",
                    type: DOCUMENT_TYPES.LEDGER,
                    label: "Ledger",
                    office: "Archie",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.HIGHLY_RESTRICTED,
                    score: 96,
                    phrases: [
                        "ledger",
                        "general ledger",
                        "master ledger",
                        "transaction register"
                    ],
                    extensions: ["xls", "xlsx", "csv"]
                }),
                this.createRule({
                    id: "receipt",
                    type: DOCUMENT_TYPES.RECEIPT,
                    label: "Receipt",
                    office: "Archie",
                    authority: AUTHORITY_LEVELS.OFFICIAL,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 86,
                    phrases: [
                        "receipt",
                        "payment confirmation",
                        "paid",
                        "transaction receipt"
                    ]
                }),
                this.createRule({
                    id: "invoice",
                    type: DOCUMENT_TYPES.INVOICE,
                    label: "Invoice",
                    office: "Archie",
                    authority: AUTHORITY_LEVELS.OFFICIAL,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 90,
                    phrases: [
                        "invoice",
                        "invoice number",
                        "amount due",
                        "bill to"
                    ]
                }),
                this.createRule({
                    id: "banking",
                    type: DOCUMENT_TYPES.BANKING,
                    label: "Banking Document",
                    office: "Archie",
                    authority: AUTHORITY_LEVELS.OFFICIAL,
                    sensitivity: SENSITIVITY_LEVELS.HIGHLY_RESTRICTED,
                    score: 96,
                    phrases: [
                        "bank account",
                        "bank statement",
                        "routing number",
                        "account number",
                        "direct deposit"
                    ]
                }),
                this.createRule({
                    id: "contract",
                    type: DOCUMENT_TYPES.CONTRACT,
                    label: "Contract or Agreement",
                    office: "Justice",
                    authority: AUTHORITY_LEVELS.OFFICIAL,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 91,
                    phrases: [
                        "contract",
                        "agreement",
                        "terms and conditions",
                        "executed by",
                        "effective date"
                    ]
                }),
                this.createRule({
                    id: "mou",
                    type: DOCUMENT_TYPES.MOU,
                    label: "Memorandum of Understanding",
                    office: "Justice",
                    authority: AUTHORITY_LEVELS.OFFICIAL,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 98,
                    phrases: [
                        "memorandum of understanding",
                        "memorandum of agreement",
                        "mou",
                        "moa"
                    ]
                }),
                this.createRule({
                    id: "lease",
                    type: DOCUMENT_TYPES.LEASE,
                    label: "Lease",
                    office: "Justice",
                    authority: AUTHORITY_LEVELS.OFFICIAL,
                    sensitivity: SENSITIVITY_LEVELS.HIGHLY_RESTRICTED,
                    score: 98,
                    phrases: [
                        "lease agreement",
                        "lessor",
                        "lessee",
                        "premises",
                        "monthly rent"
                    ]
                }),
                this.createRule({
                    id: "vendor-record",
                    type: DOCUMENT_TYPES.VENDOR_RECORD,
                    label: "Vendor Record",
                    office: "Archie",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 90,
                    phrases: [
                        "vendor registry",
                        "vendor record",
                        "supplier",
                        "billing cycle"
                    ]
                }),
                this.createRule({
                    id: "asset-record",
                    type: DOCUMENT_TYPES.ASSET_RECORD,
                    label: "Asset Record",
                    office: "Archie",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 90,
                    phrases: [
                        "asset registry",
                        "asset record",
                        "equipment inventory",
                        "serial number"
                    ]
                }),
                this.createRule({
                    id: "personnel",
                    type: DOCUMENT_TYPES.PERSONNEL,
                    label: "Personnel Record",
                    office: "Harmony",
                    authority: AUTHORITY_LEVELS.OFFICIAL,
                    sensitivity: SENSITIVITY_LEVELS.HIGHLY_RESTRICTED,
                    score: 94,
                    phrases: [
                        "personnel file",
                        "employee record",
                        "performance review",
                        "disciplinary action",
                        "employment application"
                    ]
                }),
                this.createRule({
                    id: "payroll",
                    type: DOCUMENT_TYPES.PAYROLL,
                    label: "Payroll Record",
                    office: "Harmony",
                    authority: AUTHORITY_LEVELS.OFFICIAL,
                    sensitivity: SENSITIVITY_LEVELS.HIGHLY_RESTRICTED,
                    score: 98,
                    phrases: [
                        "payroll",
                        "pay stub",
                        "w-2",
                        "w2",
                        "w-4",
                        "w4",
                        "compensation"
                    ]
                }),
                this.createRule({
                    id: "volunteer",
                    type: DOCUMENT_TYPES.VOLUNTEER,
                    label: "Volunteer Document",
                    office: "Harmony",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 84,
                    phrases: [
                        "volunteer",
                        "volunteer handbook",
                        "volunteer application",
                        "volunteer agreement"
                    ]
                }),
                this.createRule({
                    id: "program-document",
                    type: DOCUMENT_TYPES.PROGRAM_DOCUMENT,
                    label: "Program Document",
                    office: "Maddy",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.INTERNAL,
                    score: 72,
                    phrases: [
                        "program overview",
                        "program model",
                        "program description",
                        "service model",
                        "program goals"
                    ]
                }),
                this.createRule({
                    id: "operations",
                    type: DOCUMENT_TYPES.OPERATIONS,
                    label: "Operations Document",
                    office: "Maddy",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.INTERNAL,
                    score: 72,
                    phrases: [
                        "operations",
                        "operational plan",
                        "daily operations",
                        "field operations",
                        "implementation plan"
                    ]
                }),
                this.createRule({
                    id: "partnership",
                    type: DOCUMENT_TYPES.PARTNERSHIP,
                    label: "Partnership Document",
                    office: "Atlas",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 80,
                    phrases: [
                        "partnership",
                        "partner organization",
                        "collaboration",
                        "sponsorship"
                    ]
                }),
                this.createRule({
                    id: "press-release",
                    type: DOCUMENT_TYPES.PRESS_RELEASE,
                    label: "Press Release",
                    office: "Atlas",
                    authority: AUTHORITY_LEVELS.APPROVED,
                    sensitivity: SENSITIVITY_LEVELS.PUBLIC,
                    score: 94,
                    phrases: [
                        "press release",
                        "for immediate release",
                        "media contact"
                    ]
                }),
                this.createRule({
                    id: "communications",
                    type: DOCUMENT_TYPES.COMMUNICATIONS,
                    label: "Communications Document",
                    office: "Atlas",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.INTERNAL,
                    score: 68,
                    phrases: [
                        "communications plan",
                        "messaging",
                        "talking points",
                        "media strategy"
                    ]
                }),
                this.createRule({
                    id: "marketing",
                    type: DOCUMENT_TYPES.MARKETING,
                    label: "Marketing Material",
                    office: "Atlas",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.PUBLIC,
                    score: 70,
                    phrases: [
                        "marketing",
                        "brochure",
                        "flyer",
                        "campaign",
                        "social media"
                    ]
                }),
                this.createRule({
                    id: "website-content",
                    type: DOCUMENT_TYPES.WEBSITE_CONTENT,
                    label: "Website Content",
                    office: "Atlas",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.PUBLIC,
                    score: 78,
                    phrases: [
                        "website",
                        "web page",
                        "seo",
                        "meta description",
                        "homepage"
                    ],
                    extensions: ["html", "htm", "md", "txt", "doc", "docx"]
                }),
                this.createRule({
                    id: "meeting-notes",
                    type: DOCUMENT_TYPES.MEETING_NOTES,
                    label: "Meeting Notes",
                    office: "Maddy",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.INTERNAL,
                    score: 74,
                    phrases: [
                        "meeting notes",
                        "agenda",
                        "action items",
                        "attendees",
                        "next steps"
                    ]
                }),
                this.createRule({
                    id: "correspondence",
                    type: DOCUMENT_TYPES.CORRESPONDENCE,
                    label: "Correspondence",
                    office: "Maddy",
                    authority: AUTHORITY_LEVELS.UNREVIEWED,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 62,
                    phrases: [
                        "dear ",
                        "sincerely",
                        "to whom it may concern",
                        "subject:"
                    ]
                }),
                this.createRule({
                    id: "checklist",
                    type: DOCUMENT_TYPES.CHECKLIST,
                    label: "Checklist",
                    office: "Maddy",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.INTERNAL,
                    score: 82,
                    phrases: [
                        "checklist",
                        "check list",
                        "required documents",
                        "completion checklist"
                    ]
                }),
                this.createRule({
                    id: "directory",
                    type: DOCUMENT_TYPES.DIRECTORY,
                    label: "Directory",
                    office: "Maddy",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 80,
                    phrases: [
                        "directory",
                        "contact list",
                        "folder directory",
                        "resource directory"
                    ]
                }),
                this.createRule({
                    id: "research",
                    type: DOCUMENT_TYPES.RESEARCH,
                    label: "Research",
                    office: "Atlas",
                    authority: AUTHORITY_LEVELS.UNREVIEWED,
                    sensitivity: SENSITIVITY_LEVELS.INTERNAL,
                    score: 66,
                    phrases: [
                        "research",
                        "study",
                        "findings",
                        "literature review",
                        "data analysis"
                    ]
                }),
                this.createRule({
                    id: "presentation",
                    type: DOCUMENT_TYPES.PRESENTATION,
                    label: "Presentation",
                    office: "Maddy",
                    authority: AUTHORITY_LEVELS.WORKING,
                    sensitivity: SENSITIVITY_LEVELS.INTERNAL,
                    score: 58,
                    extensions: ["ppt", "pptx"]
                }),
                this.createRule({
                    id: "spreadsheet",
                    type: DOCUMENT_TYPES.SPREADSHEET,
                    label: "Spreadsheet",
                    office: "Archie",
                    authority: AUTHORITY_LEVELS.UNREVIEWED,
                    sensitivity: SENSITIVITY_LEVELS.RESTRICTED,
                    score: 52,
                    extensions: ["xls", "xlsx", "csv"]
                }),
                this.createRule({
                    id: "archive",
                    type: DOCUMENT_TYPES.ARCHIVE,
                    label: "Archive",
                    office: "Maddy",
                    authority: AUTHORITY_LEVELS.HISTORICAL,
                    sensitivity: SENSITIVITY_LEVELS.INTERNAL,
                    score: 80,
                    phrases: [
                        "archive",
                        "archived",
                        "historical",
                        "obsolete",
                        "superseded"
                    ]
                })
            ];
        },

        createRule(input = {}) {
            return {
                id: input.id,
                type: input.type || DOCUMENT_TYPES.UNKNOWN,
                label: input.label || input.type || "Unknown",
                office: input.office || this.configuration.defaultOffice,
                authority: input.authority || this.configuration.defaultAuthority,
                sensitivity:
                    input.sensitivity || this.configuration.defaultSensitivity,
                score: Number(input.score) || 50,
                phrases: this.uniqueStrings(input.phrases),
                extensions: this.uniqueStrings(input.extensions).map(
                    (value) => value.replace(/^\./, "").toLowerCase()
                ),
                mimeTypes: this.uniqueStrings(input.mimeTypes).map(
                    (value) => value.toLowerCase()
                ),
                active: input.active !== false
            };
        },

        classifyDocument(documentOrId, options = {}) {
            const admission = this.evaluateAutonomousAdmission(options);
            if (!admission.allowed) {
                return {
                    success: false,
                    blockedByAutonomy: true,
                    reason: admission.reason,
                    documents: admission.documents || this.autonomyCapabilityStatus()
                };
            }

            const document = this.resolveDocument(documentOrId);

            if (!document) {
                return {
                    success: false,
                    error: "The document could not be resolved."
                };
            }

            const evidenceText = this.buildEvidenceText(document, options);
            const matches = [];

            this.rules
                .filter((rule) => rule.active)
                .forEach((rule) => {
                    const match = this.evaluateRule(
                        rule,
                        document,
                        evidenceText
                    );

                    if (match.score > 0) {
                        matches.push(match);
                    }
                });

            matches.sort((a, b) => b.score - a.score);

            const topMatch = matches[0] || {
                ruleId: "fallback-unknown",
                type: DOCUMENT_TYPES.UNKNOWN,
                label: "Unknown Document",
                office: this.configuration.defaultOffice,
                authority: this.configuration.defaultAuthority,
                sensitivity: this.configuration.defaultSensitivity,
                score: 0,
                evidence: ["No classification rule matched."]
            };

            const confidence = this.calculateConfidence(
                topMatch,
                matches[1] || null
            );

            const workIntelligence =
                this.analyzeDocumentWork(
                    document,
                    evidenceText,
                    topMatch
                );

            const result = {
                id: this.createId("classification-result"),
                documentId: document.id,
                logicalDocumentId: document.logicalDocumentId || null,
                documentName: document.name,
                type: topMatch.type,
                label: topMatch.label,
                confidence,
                status: this.determineResultStatus(confidence),
                recommendedOffice: topMatch.office,
                recommendedAuthority: topMatch.authority,
                recommendedSensitivity: topMatch.sensitivity,
                matchedRuleId: topMatch.ruleId,
                evidence: topMatch.evidence,
                alternatives: matches
                    .slice(1, 1 + this.configuration.maximumAlternativeTypes)
                    .map((match) => ({
                        type: match.type,
                        label: match.label,
                        score: match.score,
                        confidence: this.calculateConfidence(match, null),
                        evidence: match.evidence
                    })),
                requiresExecutiveReview:
                    this.requiresExecutiveReview(topMatch, confidence),
                reviewReason: this.buildReviewReason(topMatch, confidence),
                workIntelligence,
                classifiedAt: new Date().toISOString(),
                classifiedBy: this.name,
                metadata: {
                    extension: document.extension || "",
                    mimeType: document.mimeType || "",
                    originalAuthority: document.authority || null,
                    originalSensitivity: document.sensitivity || null,
                    queueStatus: document.queueStatus || null,
                    investigationId:
                        document.metadata?.investigationId || null,
                    contentSha256:
                        document.metadata?.contentSha256 ||
                        document.contentFingerprint ||
                        null,
                    sourceProvider:
                        document.sourceProvider || null,
                    sourceLocation:
                        document.sourceLocation || null,
                    epistemicStatus:
                        document.metadata?.epistemicStatus || null,
                    execution: {
                        autonomous: admission.mode.autonomous === true,
                        machineInitiated: admission.mode.machineInitiated === true,
                        humanDirected: admission.mode.humanDirected === true,
                        source: admission.mode.source,
                        authorityReceipt: admission.authorityReceipt
                    }
                }
            };

            this.upsertResult(result);

            if (result.requiresExecutiveReview) {
                this.queueForReview(result, options);
            } else if (options.applyToDocument !== false) {
                this.applyResultToDocument(result, {
                    actor: options.actor || this.name,
                    automatic: true
                });
            }

            this.completeIngestionQueueIfApplicable(document, result);
            this.persistIfEnabled();

            this.logActivity("document.classified", {
                resultId: result.id,
                documentId: result.documentId,
                type: result.type,
                confidence: result.confidence,
                requiresExecutiveReview: result.requiresExecutiveReview
            });

            this.emit("document:classified", this.clone(result));

            return {
                success: true,
                result: this.clone(result),
                document: this.clone(this.resolveDocument(document.id))
            };
        },

        processNextQueueItem(options = {}) {
            const admission = this.evaluateAutonomousAdmission(options);
            if (!admission.allowed) {
                return {
                    success: false,
                    blockedByAutonomy: true,
                    reason: admission.reason,
                    documents: admission.documents || this.autonomyCapabilityStatus()
                };
            }

            const ingestion = global.DocumentIngestion;

            if (
                !ingestion ||
                typeof ingestion.dequeueNext !== "function"
            ) {
                return {
                    success: false,
                    error: "Document Ingestion Engine is unavailable."
                };
            }

            const next = ingestion.dequeueNext({
                office: options.office || null
            });

            if (!next.success || next.empty) {
                return next;
            }

            const classification = this.classifyDocument(next.document, {
                ...options,
                ingestionQueueItemId: next.queueItem.id
            });

            if (!classification.success) {
                ingestion.failQueueItem?.(
                    next.queueItem.id,
                    classification.error
                );
            }

            return {
                success: classification.success,
                queueItem: next.queueItem,
                classification
            };
        },

        processQueue(options = {}) {
            const admission = this.evaluateAutonomousAdmission(options);
            if (!admission.allowed) {
                return {
                    success: false,
                    processed: 0,
                    results: [],
                    blockedByAutonomy: true,
                    reason: admission.reason,
                    documents: admission.documents || this.autonomyCapabilityStatus()
                };
            }

            const maximum = Math.max(
                1,
                Number(options.maximumDocuments) || 100
            );
            const results = [];

            for (let index = 0; index < maximum; index += 1) {
                const next = this.processNextQueueItem(options);

                if (!next.success || next.empty) {
                    break;
                }

                results.push(next);
            }

            return {
                success: true,
                processed: results.length,
                results,
                status: this.getStatus(),
                autonomous: admission.mode.autonomous === true,
                humanDirected: admission.mode.humanDirected === true,
                authorityReceipt: admission.authorityReceipt
            };
        },

        analyzeDocumentWork(document, evidenceText, topMatch = {}) {
            const text = String(evidenceText || "");
            const type = topMatch.type || DOCUMENT_TYPES.UNKNOWN;
            const signals = [];
            const requiredHumanAuthority = new Set();
            const requiredCapabilities = new Set();
            const fieldHints = [];

            const addSignal = (id, label, evidence) => {
                if (signals.some((item) => item.id === id)) return;
                signals.push({ id, label, evidence });
            };

            const matchesAny = (patterns = []) =>
                patterns.some((pattern) => pattern.test(text));

            if (
                [DOCUMENT_TYPES.FORM, DOCUMENT_TYPES.GRANT_APPLICATION]
                    .includes(type) ||
                matchesAny([
                    /\bapplication form\b/,
                    /\bcomplete (?:this|the) form\b/,
                    /\bplease complete\b/,
                    /\bapplicant information\b/,
                    /\brequired fields?\b/
                ])
            ) {
                addSignal(
                    "fillable-document",
                    "Document contains data-entry work",
                    "Form/application language indicates information must be supplied."
                );
                requiredCapabilities.add("document-field-mapping");
                requiredCapabilities.add("verified-fact-retrieval");
            }

            if (
                type === DOCUMENT_TYPES.GRANT_APPLICATION ||
                matchesAny([
                    /\bgrant application\b/,
                    /\bapplication narrative\b/,
                    /\bproject narrative\b/,
                    /\bstatement of need\b/,
                    /\bbudget narrative\b/,
                    /\bamount requested\b/
                ])
            ) {
                addSignal(
                    "application-work",
                    "Document is application work",
                    "Application language indicates an executable package rather than passive evidence."
                );
                requiredCapabilities.add("application-preparation");
                requiredCapabilities.add("evidence-grounded-drafting");
            }

            if (
                matchesAny([
                    /\bsignature\b/,
                    /\bsigned by\b/,
                    /\bauthorized signatory\b/,
                    /\bauthorized representative\b/,
                    /\bdate signed\b/,
                    /\belectronic signature\b/
                ])
            ) {
                addSignal(
                    "signature-required",
                    "Human signature appears required",
                    "Signature or authorized-signatory language was observed."
                );
                requiredHumanAuthority.add(
                    HUMAN_AUTHORITY_KINDS.SIGNATURE
                );
                requiredCapabilities.add("signature-routing");
            }

            if (
                matchesAny([
                    /\bi certify\b/,
                    /\bcertify that\b/,
                    /\bcertification\b/,
                    /\bunder penalty of perjury\b/,
                    /\battest\b/,
                    /\battestation\b/
                ])
            ) {
                addSignal(
                    "certification-required",
                    "Human certification or attestation appears required",
                    "Certification or attestation language was observed."
                );
                requiredHumanAuthority.add(
                    HUMAN_AUTHORITY_KINDS.CERTIFICATION
                );
                requiredCapabilities.add("certification-routing");
            }

            if (
                [
                    DOCUMENT_TYPES.CONTRACT,
                    DOCUMENT_TYPES.MOU,
                    DOCUMENT_TYPES.LEASE
                ].includes(type) ||
                matchesAny([
                    /\bagreement between\b/,
                    /\bterms and conditions\b/,
                    /\bparty agrees\b/,
                    /\bexecute(?:d| this agreement)\b/
                ])
            ) {
                addSignal(
                    "agreement-execution",
                    "Agreement may require authorized execution",
                    "Agreement or contract language indicates consequential execution."
                );
                requiredHumanAuthority.add(
                    HUMAN_AUTHORITY_KINDS.EXECUTION
                );
                requiredCapabilities.add("agreement-review");
                requiredCapabilities.add("authorized-execution-routing");
            }

            if (
                matchesAny([
                    /\bsubmit(?:ted|tal| this form)?\b/,
                    /\bsubmission deadline\b/,
                    /\bdue date\b/,
                    /\bmust be received by\b/,
                    /\bupload\b/,
                    /\battach(?:ment|ed)?\b/
                ])
            ) {
                addSignal(
                    "submission-work",
                    "Document appears connected to submission work",
                    "Submission, deadline, upload, or attachment language was observed."
                );
                requiredCapabilities.add("submission-package-assembly");
            }

            [
                ["legal-name", /\blegal name\b/],
                ["address", /\bmailing address\b|\bphysical address\b/],
                ["ein", /\bein\b|\bemployer identification number\b/],
                ["uei", /\buei\b|\bunique entity identifier\b/],
                ["contact", /\bcontact (?:name|person|information)\b/],
                ["budget", /\bbudget\b|\bamount requested\b/],
                ["date", /\bdate\b/]
            ].forEach(([field, pattern]) => {
                if (pattern.test(text)) fieldHints.push(field);
            });

            if (
                requiredHumanAuthority.size > 0 ||
                type === DOCUMENT_TYPES.UNKNOWN ||
                signals.some(
                    (signal) =>
                        [
                            "fillable-document",
                            "agreement-execution"
                        ].includes(signal.id)
                )
            ) {
                requiredHumanAuthority.add(
                    HUMAN_AUTHORITY_KINDS.REVIEW
                );
            }

            let workKind = DOCUMENT_WORK_KINDS.EVIDENCE_ONLY;

            if (
                requiredHumanAuthority.has(
                    HUMAN_AUTHORITY_KINDS.SIGNATURE
                )
            ) {
                workKind = DOCUMENT_WORK_KINDS.SIGNATURE;
            } else if (
                requiredHumanAuthority.has(
                    HUMAN_AUTHORITY_KINDS.CERTIFICATION
                )
            ) {
                workKind = DOCUMENT_WORK_KINDS.CERTIFICATION;
            } else if (
                signals.some((signal) => signal.id === "agreement-execution")
            ) {
                workKind = DOCUMENT_WORK_KINDS.AGREEMENT;
            } else if (
                signals.some((signal) => signal.id === "application-work")
            ) {
                workKind = DOCUMENT_WORK_KINDS.APPLICATION;
            } else if (
                signals.some((signal) => signal.id === "fillable-document")
            ) {
                workKind = DOCUMENT_WORK_KINDS.DATA_ENTRY;
            } else if (
                signals.some((signal) => signal.id === "submission-work")
            ) {
                workKind = DOCUMENT_WORK_KINDS.SUBMISSION;
            } else if (type === DOCUMENT_TYPES.UNKNOWN) {
                workKind = DOCUMENT_WORK_KINDS.UNKNOWN;
            }

            return {
                workKind,
                executable:
                    ![
                        DOCUMENT_WORK_KINDS.EVIDENCE_ONLY,
                        DOCUMENT_WORK_KINDS.UNKNOWN
                    ].includes(workKind),
                signals,
                fieldHints: this.uniqueStrings(fieldHints),
                requiredCapabilities:
                    this.uniqueStrings(Array.from(requiredCapabilities)),
                requiredHumanAuthority:
                    this.uniqueStrings(Array.from(requiredHumanAuthority)),
                canAutoFill: false,
                canAutoSign: false,
                canAutoCertify: false,
                canAutoSubmit: false,
                preparationAuthorized: false,
                mutationAuthorized: false,
                signatureAuthorized: false,
                certificationAuthorized: false,
                submissionAuthorized: false,
                epistemicStatus:
                    document.metadata?.epistemicStatus ||
                    "classification-inference",
                investigationId:
                    document.metadata?.investigationId || null,
                sourceFingerprint:
                    document.metadata?.contentSha256 ||
                    document.contentFingerprint ||
                    null
            };
        },

        evaluateRule(rule, document, evidenceText) {
            let score = 0;
            const evidence = [];
            const normalizedName = this.normalizeText(document.name);
            const normalizedPath = this.normalizeText(
                document.relativePath ||
                document.sourceLocation ||
                ""
            );
            const normalizedExtension = String(
                document.extension || ""
            ).replace(/^\./, "").toLowerCase();
            const normalizedMime = String(
                document.mimeType || ""
            ).toLowerCase();

            rule.phrases.forEach((phrase) => {
                const normalizedPhrase = this.normalizeText(phrase);

                if (!normalizedPhrase) {
                    return;
                }

                if (normalizedName.includes(normalizedPhrase)) {
                    score += rule.score;
                    evidence.push(
                        `Filename contains "${phrase}".`
                    );
                    return;
                }

                if (normalizedPath.includes(normalizedPhrase)) {
                    score += Math.round(rule.score * 0.8);
                    evidence.push(
                        `Path contains "${phrase}".`
                    );
                    return;
                }

                if (evidenceText.includes(normalizedPhrase)) {
                    score += Math.round(rule.score * 0.65);
                    evidence.push(
                        `Document text contains "${phrase}".`
                    );
                }
            });

            if (
                rule.extensions.includes(normalizedExtension)
            ) {
                score += 30;
                evidence.push(
                    `File extension ".${normalizedExtension}" matches the rule.`
                );
            }

            if (rule.mimeTypes.includes(normalizedMime)) {
                score += 30;
                evidence.push(
                    `MIME type "${normalizedMime}" matches the rule.`
                );
            }

            if (
                document.tags?.some((tag) =>
                    rule.phrases.some(
                        (phrase) =>
                            this.normalizeText(tag) ===
                            this.normalizeText(phrase)
                    )
                )
            ) {
                score += 25;
                evidence.push("Document tags support this classification.");
            }

            return {
                ruleId: rule.id,
                type: rule.type,
                label: rule.label,
                office: rule.office,
                authority: rule.authority,
                sensitivity: rule.sensitivity,
                score,
                evidence
            };
        },

        calculateConfidence(match, secondMatch) {
            if (!match || match.score <= 0) {
                return 0.2;
            }

            const base = Math.min(0.99, 0.45 + match.score / 300);
            const margin = secondMatch
                ? Math.max(0, match.score - secondMatch.score)
                : match.score;

            const marginBonus = Math.min(0.18, margin / 500);
            return Number(
                Math.min(0.99, base + marginBonus).toFixed(3)
            );
        },

        determineResultStatus(confidence) {
            if (
                confidence >=
                this.configuration.minimumAutoAcceptConfidence
            ) {
                return "classified";
            }

            if (
                confidence >=
                this.configuration.minimumSuggestedConfidence
            ) {
                return "suggested";
            }

            return "uncertain";
        },

        requiresExecutiveReview(match, confidence) {
            if (
                confidence <
                this.configuration.minimumAutoAcceptConfidence
            ) {
                return true;
            }

            if (
                this.configuration
                    .requireExecutiveReviewForOfficialPromotion &&
                [
                    AUTHORITY_LEVELS.OFFICIAL,
                    AUTHORITY_LEVELS.APPROVED,
                    AUTHORITY_LEVELS.SUBMITTED
                ].includes(match.authority)
            ) {
                return true;
            }

            if (
                match.sensitivity ===
                SENSITIVITY_LEVELS.HIGHLY_RESTRICTED
            ) {
                return true;
            }

            return false;
        },

        buildReviewReason(match, confidence) {
            const reasons = [];

            if (
                confidence <
                this.configuration.minimumAutoAcceptConfidence
            ) {
                reasons.push(
                    `Confidence ${confidence} is below the automatic acceptance threshold.`
                );
            }

            if (
                [
                    AUTHORITY_LEVELS.OFFICIAL,
                    AUTHORITY_LEVELS.APPROVED,
                    AUTHORITY_LEVELS.SUBMITTED
                ].includes(match.authority)
            ) {
                reasons.push(
                    "The recommended authority level requires executive confirmation."
                );
            }

            if (
                match.sensitivity ===
                SENSITIVITY_LEVELS.HIGHLY_RESTRICTED
            ) {
                reasons.push(
                    "The recommended sensitivity level is highly restricted."
                );
            }

            return reasons.join(" ");
        },

        queueForReview(result, options = {}) {
            const existing = this.reviewQueue.find(
                (item) =>
                    item.classificationResultId === result.id &&
                    item.status === "pending"
            );

            if (existing) {
                return existing;
            }

            const item = {
                id: this.createId("classification-review"),
                classificationResultId: result.id,
                documentId: result.documentId,
                status: "pending",
                priority: Number(options.priority) || 50,
                requestedAt: new Date().toISOString(),
                requestedBy: options.actor || this.name,
                reviewedAt: null,
                reviewedBy: null,
                decision: null,
                notes: ""
            };

            this.reviewQueue.push(item);
            this.emit("classification:review-required", {
                review: this.clone(item),
                result: this.clone(result)
            });

            return item;
        },

        approveClassification(reviewId, options = {}) {
            const review = this.reviewQueue.find(
                (item) => item.id === reviewId
            );

            if (!review) {
                return {
                    success: false,
                    error: "Classification review was not found."
                };
            }

            if (review.status !== "pending") {
                return {
                    success: false,
                    error: "Classification review is already resolved."
                };
            }

            const result = this.getResultById(
                review.classificationResultId
            );

            if (!result) {
                return {
                    success: false,
                    error: "Classification result was not found."
                };
            }

            const override = options.override || {};

            result.type = override.type || result.type;
            result.label = override.label || result.label;
            result.recommendedOffice =
                override.recommendedOffice ||
                result.recommendedOffice;
            result.recommendedAuthority =
                override.recommendedAuthority ||
                result.recommendedAuthority;
            result.recommendedSensitivity =
                override.recommendedSensitivity ||
                result.recommendedSensitivity;
            result.status = "approved";
            result.requiresExecutiveReview = false;
            result.approvedAt = new Date().toISOString();
            result.approvedBy = options.actor || "Executive";

            review.status = "approved";
            review.reviewedAt = result.approvedAt;
            review.reviewedBy = result.approvedBy;
            review.decision = "approve";
            review.notes = options.notes || "";

            const application = this.applyResultToDocument(result, {
                actor: result.approvedBy,
                automatic: false
            });

            this.persistIfEnabled();

            this.logActivity("classification.approved", {
                reviewId,
                resultId: result.id,
                documentId: result.documentId,
                type: result.type
            });

            this.emit("classification:approved", {
                review: this.clone(review),
                result: this.clone(result),
                application
            });

            return {
                success: true,
                review: this.clone(review),
                result: this.clone(result),
                application
            };
        },

        rejectClassification(reviewId, options = {}) {
            const review = this.reviewQueue.find(
                (item) => item.id === reviewId
            );

            if (!review) {
                return {
                    success: false,
                    error: "Classification review was not found."
                };
            }

            const result = this.getResultById(
                review.classificationResultId
            );

            review.status = "rejected";
            review.reviewedAt = new Date().toISOString();
            review.reviewedBy = options.actor || "Executive";
            review.decision = "reject";
            review.notes = options.notes || "";

            if (result) {
                result.status = "rejected";
                result.requiresExecutiveReview = false;
                result.rejectedAt = review.reviewedAt;
                result.rejectedBy = review.reviewedBy;
            }

            this.persistIfEnabled();

            this.emit("classification:rejected", {
                review: this.clone(review),
                result: this.clone(result)
            });

            return {
                success: true,
                review: this.clone(review),
                result: this.clone(result)
            };
        },

        applyResultToDocument(result, options = {}) {
            const document = this.resolveDocument(result.documentId);

            if (!document) {
                return {
                    success: false,
                    error: "Document is unavailable."
                };
            }

            document.classification = {
                resultId: result.id,
                type: result.type,
                label: result.label,
                confidence: result.confidence,
                status: result.status,
                classifiedAt: result.classifiedAt,
                classifiedBy: result.classifiedBy,
                approvedAt: result.approvedAt || null,
                approvedBy: result.approvedBy || null
            };

            document.workIntelligence =
                this.clone(
                    result.workIntelligence || {
                        workKind: DOCUMENT_WORK_KINDS.UNKNOWN,
                        executable: false,
                        preparationAuthorized: false,
                        mutationAuthorized: false,
                        signatureAuthorized: false,
                        certificationAuthorized: false,
                        submissionAuthorized: false
                    }
                );

            document.recommendedOffice =
                result.recommendedOffice;
            document.authority =
                result.recommendedAuthority;
            document.sensitivity =
                result.recommendedSensitivity;
            document.updatedAt = new Date().toISOString();

            if (
                !Array.isArray(document.tags)
            ) {
                document.tags = [];
            }

            document.tags = this.uniqueStrings([
                ...document.tags,
                result.type,
                result.recommendedOffice,
                `classified-${result.status}`
            ]);

            const knowledgeResult =
                this.writeClassificationToKnowledgeEngine(
                    document,
                    result,
                    options
                );

            global.DocumentIngestion?.persistIfEnabled?.();

            return {
                success: true,
                automatic: options.automatic === true,
                document: this.clone(document),
                knowledgeResult
            };
        },

        writeClassificationToKnowledgeEngine(
            document,
            result,
            options = {}
        ) {
            const engine = global.KnowledgeEngine;

            if (
                !engine ||
                typeof engine.createRecord !== "function"
            ) {
                return {
                    success: false,
                    connected: false,
                    error: "Knowledge Engine is unavailable."
                };
            }

            const recordId =
                `classification-${document.id}`;

            const payload = {
                id: recordId,
                recordType: "document-classification",
                title: `Classification: ${document.name}`,
                summary:
                    `${document.name} is classified as ${result.label} with confidence ${result.confidence}.`,
                content:
                    result.evidence.join(" "),
                tags: [
                    "document-classification",
                    result.type,
                    result.recommendedOffice
                ],
                topics: [
                    result.type,
                    "document-governance",
                    "knowledge-intake"
                ],
                authority:
                    result.recommendedAuthority,
                confidence:
                    result.confidence,
                sensitivity:
                    result.recommendedSensitivity,
                officeAccess:
                    document.officeAccess || ["all"],
                metadata: {
                    documentId: document.id,
                    classificationResultId: result.id,
                    recommendedOffice:
                        result.recommendedOffice,
                    requiresExecutiveReview:
                        result.requiresExecutiveReview,
                    workIntelligence:
                        this.clone(result.workIntelligence || null),
                    investigationId:
                        result.metadata?.investigationId || null,
                    contentSha256:
                        result.metadata?.contentSha256 || null,
                    epistemicStatus:
                        result.metadata?.epistemicStatus || null,
                    approvedBy:
                        result.approvedBy || null,
                    actor:
                        options.actor || this.name
                },
                createdBy: this.name
            };

            const existing =
                engine.getRecordById?.(recordId);

            if (
                existing &&
                typeof engine.updateRecord === "function"
            ) {
                return engine.updateRecord(
                    recordId,
                    payload
                );
            }

            return engine.createRecord(payload);
        },

        completeIngestionQueueIfApplicable(document, result) {
            const ingestion = global.DocumentIngestion;

            if (
                !ingestion ||
                typeof ingestion.completeQueueItem !==
                    "function"
            ) {
                return {
                    success: false,
                    connected: false
                };
            }

            const queueItem =
                ingestion.classificationQueue?.find(
                    (item) =>
                        item.documentId === document.id &&
                        ["queued", "processing"].includes(
                            item.status
                        )
                );

            if (!queueItem) {
                return {
                    success: true,
                    connected: true,
                    completed: false
                };
            }

            return ingestion.completeQueueItem(
                queueItem.id,
                {
                    classifierResultId: result.id
                }
            );
        },

        buildEvidenceText(document, options = {}) {
            const parts = [
                document.name,
                document.baseName,
                document.relativePath,
                document.parentPath,
                document.sourceLocation,
                ...(document.tags || [])
            ];

            if (
                typeof options.text === "string"
            ) {
                parts.push(options.text);
            }

            if (
                typeof document.text === "string"
            ) {
                parts.push(document.text);
            }

            if (
                typeof document.metadata?.extractedText ===
                "string"
            ) {
                parts.push(
                    document.metadata.extractedText
                );
            }

            return this.normalizeText(parts.join(" "));
        },

        resolveDocument(documentOrId) {
            if (
                documentOrId &&
                typeof documentOrId === "object"
            ) {
                return documentOrId;
            }

            if (
                typeof documentOrId !== "string"
            ) {
                return null;
            }

            return (
                global.DocumentIngestion?.getDocumentById?.(
                    documentOrId
                ) ||
                null
            );
        },

        upsertResult(result) {
            const existingIndex = this.results.findIndex(
                (item) =>
                    item.documentId === result.documentId &&
                    item.status !== "rejected"
            );

            if (existingIndex >= 0) {
                result.id = this.results[existingIndex].id;
                this.results[existingIndex] = result;
            } else {
                this.results.push(result);
            }

            return result;
        },

        getResultById(resultId) {
            return (
                this.results.find(
                    (item) => item.id === resultId
                ) || null
            );
        },

        getResultForDocument(documentId) {
            return (
                this.results.find(
                    (item) =>
                        item.documentId === documentId &&
                        item.status !== "rejected"
                ) || null
            );
        },

        getPendingReviews() {
            return this.reviewQueue
                .filter((item) => item.status === "pending")
                .sort((a, b) => {
                    if (a.priority !== b.priority) {
                        return b.priority - a.priority;
                    }

                    return (
                        Date.parse(a.requestedAt) -
                        Date.parse(b.requestedAt)
                    );
                })
                .map((item) => {
                    const result = this.getResultById(
                        item.classificationResultId
                    );

                    return {
                        review: this.clone(item),
                        result: this.clone(result),
                        document: this.clone(
                            this.resolveDocument(
                                item.documentId
                            )
                        )
                    };
                });
        },

        searchResults(query = "", filters = {}) {
            const normalizedQuery = this.normalizeText(query);

            return this.results
                .filter((result) => {
                    if (
                        filters.type &&
                        result.type !== filters.type
                    ) {
                        return false;
                    }

                    if (
                        filters.status &&
                        result.status !== filters.status
                    ) {
                        return false;
                    }

                    if (
                        filters.office &&
                        result.recommendedOffice !==
                            filters.office
                    ) {
                        return false;
                    }

                    if (
                        filters.sensitivity &&
                        result.recommendedSensitivity !==
                            filters.sensitivity
                    ) {
                        return false;
                    }

                    if (!normalizedQuery) {
                        return true;
                    }

                    const haystack = this.normalizeText(
                        [
                            result.documentName,
                            result.type,
                            result.label,
                            result.recommendedOffice,
                            result.evidence.join(" ")
                        ].join(" ")
                    );

                    return haystack.includes(normalizedQuery);
                })
                .map((result) => this.clone(result));
        },

        registerRule(ruleInput) {
            if (!ruleInput?.id || !ruleInput?.type) {
                return {
                    success: false,
                    error: "A classification rule requires id and type."
                };
            }

            const rule = this.createRule(ruleInput);
            const existingIndex = this.rules.findIndex(
                (candidate) => candidate.id === rule.id
            );

            if (existingIndex >= 0) {
                this.rules[existingIndex] = rule;
            } else {
                this.rules.push(rule);
            }

            this.persistIfEnabled();

            return {
                success: true,
                rule: this.clone(rule)
            };
        },

        disableRule(ruleId) {
            const rule = this.rules.find(
                (candidate) => candidate.id === ruleId
            );

            if (!rule) {
                return {
                    success: false,
                    error: "Classification rule was not found."
                };
            }

            rule.active = false;
            this.persistIfEnabled();

            return {
                success: true,
                rule: this.clone(rule)
            };
        },

        registerSystemKnowledge() {
            const engine = global.KnowledgeEngine;

            if (
                !engine ||
                typeof engine.createRecord !== "function"
            ) {
                return {
                    success: false,
                    connected: false
                };
            }

            const id =
                "knowledge-system-document-classifier";
            const existing =
                engine.getRecordById?.(id);

            if (existing) {
                return {
                    success: true,
                    duplicate: true,
                    record: existing
                };
            }

            return engine.createRecord({
                id,
                recordType: "system-component",
                title: "MEOS Document Classification Engine",
                summary:
                    "Explainable, organization-neutral document classification with executive review controls and centrally governed Document Intake autonomy.",
                content:
                    "The classifier recommends document type, office routing, authority, sensitivity, review requirements, and bounded document-work intelligence. Standing queue continuation requires Durable Maddy Autonomy Document Intake authority; human-directed classification remains available while autonomy is off. Queue presence, browser state, and legacy autoProcessQueue do not create authority. The classifier never mutates, creates or approves workflows, spends, signs, certifies, submits, or silently promotes a document into official institutional knowledge.",
                tags: [
                    "meos-core",
                    "document-classification",
                    "system-component"
                ],
                topics: [
                    "classification",
                    "document-governance",
                    "authority",
                    "sensitivity",
                    "executive-review"
                ],
                authority: AUTHORITY_LEVELS.SYSTEM,
                confidence: 1,
                sensitivity: SENSITIVITY_LEVELS.INTERNAL,
                officeAccess: ["all"],
                metadata: {
                    componentVersion: this.version,
                    componentBuild: this.buildId,
                    commission: this.commission,
                    organizationNeutralCore: true,
                    autonomyAuthority: "server-durable-maddy-autonomy-authority",
                    browserAuthority: false,
                    brickBoundary:
                        "Classification and document-work recognition only; no file ingestion, workflow creation/approval, document mutation, spending, signature, certification, submission, or silent policy promotion."
                },
                createdBy: this.name
            });
        },

        getStatus() {
            return {
                name: this.name,
                version: this.version,
                buildId: this.buildId,
                commission: this.commission,
                status: this.status,
                operatingMode: this.operatingMode,
                organizationNeutralCore:
                    this.configuration.organizationNeutralCore,
                documentIngestionConnected:
                    Boolean(global.DocumentIngestion),
                autonomy: {
                    integration: this.getAutonomyIntegrationStatus(),
                    capability: this.autonomyCapabilityStatus(),
                    runtime: this.clone(this.autonomy),
                    authorityAvailable: Boolean(this.getAutonomyAuthority()),
                    autonomousContinuationScheduled: Boolean(this.autonomousContinuationId),
                    autonomousContinuationRunning: this.autonomousContinuationRunning === true,
                    queuedClassificationCount: this.queuedClassificationCount()
                },
                knowledgeEngineConnected:
                    Boolean(global.KnowledgeEngine),
                ruleCount: this.rules.length,
                activeRuleCount: this.rules.filter(
                    (rule) => rule.active
                ).length,
                classificationCount: this.results.length,
                executableWorkCount:
                    this.results.filter(
                        (result) =>
                            result.workIntelligence?.executable === true
                    ).length,
                signatureRequiredCount:
                    this.results.filter(
                        (result) =>
                            result.workIntelligence
                                ?.requiredHumanAuthority
                                ?.includes("human-signature")
                    ).length,
                certificationRequiredCount:
                    this.results.filter(
                        (result) =>
                            result.workIntelligence
                                ?.requiredHumanAuthority
                                ?.includes("human-certification")
                    ).length,
                pendingReviewCount: this.reviewQueue.filter(
                    (item) => item.status === "pending"
                ).length,
                approvedReviewCount: this.reviewQueue.filter(
                    (item) => item.status === "approved"
                ).length,
                rejectedReviewCount: this.reviewQueue.filter(
                    (item) => item.status === "rejected"
                ).length,
                initializedAt: this.initializedAt
            };
        },

        buildRunnerPersistenceSnapshot(options = {}) {
            const tail = (items, maximum) =>
                Array.isArray(items)
                    ? this.clone(
                        items.slice(-Math.max(1, Number(maximum) || 1000))
                    )
                    : [];

            return {
                schema: STATE_SCHEMA,
                version: this.version,
                buildId: this.buildId,
                createdAt: new Date().toISOString(),
                results: tail(this.results, options.maximumResults || 5000),
                reviewQueue: tail(
                    this.reviewQueue,
                    options.maximumReviews || 5000
                ),
                activityLog:
                    options.includeActivityLog === true
                        ? tail(
                            this.activityLog,
                            options.maximumActivity || 1000
                        )
                        : [],
                customRules: this.rules.filter(
                    (rule) =>
                        !this.buildDefaultRules().some(
                            (defaultRule) => defaultRule.id === rule.id
                        )
                ),
                authority: {
                    source: "server-durable-maddy-autonomy-authority",
                    browserAuthority: false,
                    autonomyPolicyStoredHere: false,
                    queuePresenceCreatesAuthority: false,
                    legacyAutoProcessQueueCreatesAuthority: false,
                    browserIndependentRunnerCommissioned: false
                }
            };
        },

        applyRunnerPersistenceSnapshot(snapshot, options = {}) {
            if (!snapshot || snapshot.schema !== STATE_SCHEMA) {
                return {
                    success: false,
                    error: "Document Classifier runner persistence snapshot is invalid."
                };
            }

            if (options.replace === true) {
                this.results = [];
                this.reviewQueue = [];
                this.activityLog = [];
                this.rules = this.buildDefaultRules();
            }

            (snapshot.customRules || []).forEach((rule) => {
                this.registerRule(rule);
            });
            this.mergeById(this.results, snapshot.results || []);
            this.mergeById(this.reviewQueue, snapshot.reviewQueue || []);
            if (options.includeActivityLog === true) {
                this.mergeById(this.activityLog, snapshot.activityLog || []);
            }

            this.persistIfEnabled();
            return {
                success: true,
                status: this.getStatus()
            };
        },

        exportClassifier(options = {}) {
            return {
                success: true,
                data: {
                    schema: SCHEMA,
                    version: this.version,
                    exportedAt: new Date().toISOString(),
                    configuration:
                        options.includeConfiguration === false
                            ? {}
                            : this.configuration,
                    customRules:
                        options.includeDefaultRules === true
                            ? this.rules
                            : this.rules.filter(
                                (rule) =>
                                    !this.buildDefaultRules().some(
                                        (defaultRule) =>
                                            defaultRule.id === rule.id
                                    )
                            ),
                    results: this.results,
                    reviewQueue: this.reviewQueue,
                    activityLog:
                        options.includeActivityLog === true
                            ? this.activityLog
                            : []
                }
            };
        },

        importClassifier(payload, options = {}) {
            let data = payload;

            if (typeof payload === "string") {
                try {
                    data = JSON.parse(payload);
                } catch (error) {
                    return {
                        success: false,
                        error:
                            "The classifier import is not valid JSON."
                    };
                }
            }

            if (!data || data.schema !== SCHEMA) {
                return {
                    success: false,
                    error:
                        "The import is not a MEOS Document Classification package."
                };
            }

            if (options.replace === true) {
                this.results = [];
                this.reviewQueue = [];
                this.activityLog = [];
                this.rules = this.buildDefaultRules();
            }

            (data.customRules || []).forEach((rule) => {
                this.registerRule(rule);
            });

            this.mergeById(this.results, data.results || []);
            this.mergeById(
                this.reviewQueue,
                data.reviewQueue || []
            );

            if (options.includeActivityLog === true) {
                this.mergeById(
                    this.activityLog,
                    data.activityLog || []
                );
            }

            this.persistIfEnabled();

            return {
                success: true,
                status: this.getStatus()
            };
        },

        persistIfEnabled() {
            if (
                this.configuration.persistenceEnabled &&
                this.configuration.automaticPersistence
            ) {
                return this.persist();
            }

            return {
                success: true,
                persisted: false
            };
        },

        persist() {
            if (
                !this.configuration.persistenceEnabled
            ) {
                return {
                    success: false,
                    error:
                        "Document Classification persistence is disabled."
                };
            }

            if (!global.localStorage) {
                return {
                    success: false,
                    error:
                        "Browser local storage is unavailable."
                };
            }

            try {
                global.localStorage.setItem(
                    this.configuration.localStorageKey,
                    JSON.stringify(
                        this.exportClassifier({
                            includeActivityLog: false
                        }).data
                    )
                );

                return {
                    success: true,
                    persisted: true
                };
            } catch (error) {
                console.error(
                    "[MEOS Document Classifier] Persistence failed:",
                    error
                );

                return {
                    success: false,
                    error: error.message
                };
            }
        },

        restore() {
            if (
                !this.configuration.persistenceEnabled ||
                !global.localStorage
            ) {
                return {
                    success: false,
                    restored: false
                };
            }

            const stored = global.localStorage.getItem(
                this.configuration.localStorageKey
            );

            if (!stored) {
                return {
                    success: true,
                    restored: false
                };
            }

            try {
                const result = this.importClassifier(
                    JSON.parse(stored),
                    {
                        replace: true
                    }
                );

                return {
                    ...result,
                    restored: result.success
                };
            } catch (error) {
                console.warn(
                    "[MEOS Document Classifier] Stored state could not be restored:",
                    error
                );

                return {
                    success: false,
                    restored: false,
                    error: error.message
                };
            }
        },

        clear(options = {}) {
            if (options.confirm !== true) {
                return {
                    success: false,
                    error:
                        "Clearing classifier data requires { confirm: true }."
                };
            }

            this.results = [];
            this.reviewQueue = [];
            this.activityLog = [];
            this.rules = this.buildDefaultRules();

            if (global.localStorage) {
                global.localStorage.removeItem(
                    this.configuration.localStorageKey
                );
            }

            return {
                success: true,
                status: this.getStatus()
            };
        },

        normalizeText(value) {
            return String(value ?? "")
                .normalize("NFKD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9$%()]+/g, " ")
                .replace(/\s+/g, " ")
                .trim();
        },

        uniqueStrings(values) {
            if (!Array.isArray(values)) {
                return [];
            }

            return Array.from(
                new Set(
                    values
                        .map((value) =>
                            String(value || "").trim()
                        )
                        .filter(Boolean)
                )
            );
        },

        mergeById(target, incoming) {
            incoming.forEach((item) => {
                if (!item?.id) {
                    return;
                }

                const existingIndex = target.findIndex(
                    (candidate) => candidate.id === item.id
                );

                if (existingIndex >= 0) {
                    target[existingIndex] = {
                        ...target[existingIndex],
                        ...item
                    };
                } else {
                    target.push(item);
                }
            });
        },

        createId(prefix = "item") {
            const random =
                global.crypto?.randomUUID
                    ? global.crypto.randomUUID()
                    : `${Date.now().toString(36)}-${Math.random()
                        .toString(36)
                        .slice(2, 10)}`;

            return `${prefix}-${random}`;
        },

        clone(value) {
            if (value === undefined) {
                return undefined;
            }

            return JSON.parse(JSON.stringify(value));
        },

        runGovernedDocumentIntakeAutonomyAcceptanceTest() {
            const originalMaddyAutonomy = global.MaddyAutonomy;
            const originalAuthorityAlias = global.MEOSAutonomyAuthority;
            const originalIngestion = global.DocumentIngestion;
            const originalResults = this.clone(this.results);
            const originalReviews = this.clone(this.reviewQueue);
            const originalActivity = this.clone(this.activityLog);
            const originalRules = this.clone(this.rules);
            const originalAutomaticPersistence =
                this.configuration.automaticPersistence;
            const originalAutoProcessQueue =
                this.configuration.autoProcessQueue;
            const originalContinuationEnabled =
                this.configuration.autonomousQueueContinuationEnabled;
            const originalAuthorityUnsubscribers =
                this.autonomyAuthorityUnsubscribers;
            const originalIngestionListener = this.ingestionQueueListener;
            const checks = [];
            const check = (name, passed, detail = null) => {
                checks.push({ name, passed: passed === true, detail });
            };
            const copy = (value) =>
                value === undefined
                    ? undefined
                    : JSON.parse(JSON.stringify(value));

            let authorityState = {
                master: false,
                documents: false,
                revision: 700
            };
            const authorityListeners = {};
            const fakeAuthority = {
                capabilityStatus(id) {
                    if (id !== AUTONOMY_CAPABILITY) return null;
                    const effective =
                        authorityState.master === true &&
                        authorityState.documents === true;
                    return {
                        id,
                        effective,
                        uiState: effective ? "ON" : "OFF",
                        reason: effective
                            ? "authorized-for-acceptance"
                            : "disabled-for-acceptance"
                    };
                },
                isAuthorized(id) {
                    return this.capabilityStatus(id)?.effective === true;
                },
                getSnapshot() {
                    return {
                        revision: authorityState.revision,
                        policy: { revision: authorityState.revision }
                    };
                },
                on(eventName, callback) {
                    if (!authorityListeners[eventName]) {
                        authorityListeners[eventName] = [];
                    }
                    authorityListeners[eventName].push(callback);
                    return () => {
                        authorityListeners[eventName] =
                            (authorityListeners[eventName] || []).filter(
                                (candidate) => candidate !== callback
                            );
                    };
                }
            };

            const queue = [];
            const documents = new Map();
            const ingestionListeners = {};
            const fakeIngestion = {
                classificationQueue: queue,
                on(eventName, callback) {
                    if (!ingestionListeners[eventName]) {
                        ingestionListeners[eventName] = [];
                    }
                    ingestionListeners[eventName].push(callback);
                    return true;
                },
                off(eventName, callback) {
                    ingestionListeners[eventName] =
                        (ingestionListeners[eventName] || []).filter(
                            (candidate) => candidate !== callback
                        );
                    return true;
                },
                getDocumentById(id) {
                    return documents.get(id) || null;
                },
                dequeueNext() {
                    const item = queue.find(
                        (candidate) => candidate.status === "queued"
                    );
                    if (!item) {
                        return {
                            success: true,
                            empty: true,
                            queueItem: null,
                            document: null
                        };
                    }
                    item.status = "processing";
                    const document = documents.get(item.documentId);
                    if (document) document.queueStatus = "processing";
                    return {
                        success: true,
                        empty: false,
                        queueItem: copy(item),
                        document: copy(document)
                    };
                },
                completeQueueItem(queueItemId, result = {}) {
                    const item = queue.find(
                        (candidate) => candidate.id === queueItemId
                    );
                    if (!item) return { success: false };
                    item.status = "complete";
                    item.classifierResultId =
                        result.classifierResultId || null;
                    const document = documents.get(item.documentId);
                    if (document) document.queueStatus = "complete";
                    return { success: true, queueItem: copy(item) };
                },
                failQueueItem(queueItemId, error) {
                    const item = queue.find(
                        (candidate) => candidate.id === queueItemId
                    );
                    if (!item) return { success: false };
                    item.status = "failed";
                    item.error = error || "classification-failed";
                    return { success: true };
                },
                persistIfEnabled() {
                    return { success: true, persisted: false };
                }
            };

            const enqueue = (id, name, tags = []) => {
                const document = {
                    id,
                    logicalDocumentId: `logical-${id}`,
                    name,
                    normalizedName: String(name).toLowerCase(),
                    baseName: name,
                    extension: "pdf",
                    mimeType: "application/pdf",
                    sourceLocation: `acceptance://${id}`,
                    sourceProvider: "acceptance",
                    authority: "unreviewed",
                    sensitivity: "internal",
                    tags,
                    queueStatus: "queued",
                    metadata: { extractedText: tags.join(" ") }
                };
                documents.set(id, document);
                queue.push({
                    id: `queue-${id}`,
                    documentId: id,
                    office: null,
                    status: "queued",
                    queuedAt: new Date().toISOString(),
                    classifierResultId: null
                });
                return document;
            };

            try {
                this.cancelAutonomousQueueContinuation({
                    reason: "acceptance-start"
                });
                this.results = [];
                this.reviewQueue = [];
                this.activityLog = [];
                this.rules = this.buildDefaultRules();
                this.configuration.automaticPersistence = false;
                this.configuration.autoProcessQueue = true;
                this.configuration.autonomousQueueContinuationEnabled = true;
                this.autonomyAuthorityUnsubscribers = [];
                this.ingestionQueueListener = null;

                global.MaddyAutonomy = fakeAuthority;
                global.MEOSAutonomyAuthority = fakeAuthority;
                global.DocumentIngestion = fakeIngestion;

                this.bindAutonomyAuthorityEvents();
                this.bindIngestionQueueEvents();

                const integration = this.getAutonomyIntegrationStatus();
                enqueue(
                    "doc-off",
                    "Invoice.pdf",
                    ["invoice", "vendor", "payment due"]
                );

                const blockedQueue = this.processNextQueueItem({
                    autonomous: true,
                    machineInitiated: true,
                    humanDirected: false,
                    source: "acceptance-autonomous-off"
                });
                const queueStillQueued =
                    queue.find((item) => item.id === "queue-doc-off")
                        ?.status === "queued";

                const humanDirected = this.processNextQueueItem({
                    humanDirected: true,
                    source: "acceptance-human-directed"
                });

                enqueue(
                    "doc-auto",
                    "Receipt.pdf",
                    ["receipt", "purchase", "transaction"]
                );
                authorityState.master = true;
                authorityState.documents = true;
                authorityState.revision += 1;
                this.syncAutonomyRuntime({
                    reason: "acceptance-authority-on"
                });
                this.cancelAutonomousQueueContinuation({
                    reason: "acceptance-direct-run"
                });
                const governed = this.runAutonomousQueueContinuation({
                    source: "acceptance-autonomous-on",
                    maximumDocuments: 10
                });
                const autonomousResult =
                    this.getResultForDocument("doc-auto");
                const runnerSnapshot =
                    this.buildRunnerPersistenceSnapshot();

                enqueue(
                    "doc-held",
                    "Unknown Material.pdf",
                    ["unmatched acceptance artifact"]
                );
                authorityState.documents = false;
                authorityState.revision += 1;
                const authorityLoss = this.syncAutonomyRuntime({
                    reason: "acceptance-authority-loss"
                });
                const heldItem = queue.find(
                    (item) => item.id === "queue-doc-held"
                );

                const directMachineBlocked = this.classifyDocument(
                    "doc-held",
                    {
                        autonomous: true,
                        machineInitiated: true,
                        humanDirected: false,
                        source: "acceptance-direct-machine"
                    }
                );

                check(
                    "Document Intake autonomy integration is first-class",
                    integration?.ready === true &&
                    integration?.capabilityId === AUTONOMY_CAPABILITY &&
                    integration?.browserAuthority === false &&
                    integration?.workflowCreationAuthorized === false,
                    integration
                );
                check(
                    "Legacy autoProcessQueue cannot manufacture standing autonomy",
                    this.configuration.autoProcessQueue === true &&
                    blockedQueue?.blockedByAutonomy === true &&
                    queueStillQueued === true,
                    blockedQueue
                );
                check(
                    "Autonomous queue continuation cannot dequeue work while Document Intake is OFF",
                    blockedQueue?.reason ===
                        "document-intake-autonomy-not-authorized" &&
                    queueStillQueued === true,
                    blockedQueue
                );
                check(
                    "Human-directed classification remains available with standing autonomy OFF",
                    humanDirected?.success === true &&
                    humanDirected?.classification?.result?.metadata?.execution
                        ?.humanDirected === true &&
                    humanDirected?.classification?.result?.metadata?.execution
                        ?.autonomous === false,
                    humanDirected?.classification?.result?.metadata?.execution
                );
                check(
                    "Document Intake ON permits bounded autonomous queue continuation",
                    governed?.success === true &&
                    governed?.processed >= 1 &&
                    queue.find((item) => item.id === "queue-doc-auto")
                        ?.status === "complete",
                    governed
                );
                check(
                    "Autonomous classification retains durable authority revision provenance",
                    autonomousResult?.metadata?.execution?.autonomous === true &&
                    autonomousResult?.metadata?.execution?.authorityReceipt
                        ?.authorityRevision === authorityState.revision - 1 &&
                    autonomousResult?.metadata?.execution?.authorityReceipt
                        ?.browserAuthority === false,
                    autonomousResult?.metadata?.execution
                );
                check(
                    "Direct machine-initiated classification cannot bypass Document Intake authority",
                    directMachineBlocked?.blockedByAutonomy === true &&
                    directMachineBlocked?.reason ===
                        "document-intake-autonomy-not-authorized",
                    directMachineBlocked
                );
                check(
                    "Removing Document Intake authority cancels continuation without deleting queued work",
                    authorityLoss?.authorized === false &&
                    Boolean(this.autonomousContinuationId) === false &&
                    heldItem?.status === "queued",
                    { authorityLoss, heldItem }
                );
                check(
                    "Classifier stays inside its brick and does not grant workflow or approval authority",
                    integration?.workflowCreationAuthorized === false &&
                    integration?.workflowApprovalAuthorized === false &&
                    typeof this.createWorkflow !== "function" &&
                    typeof this.approveWorkflow !== "function",
                    integration
                );
                check(
                    "Runner persistence snapshot carries operational state but no autonomy policy",
                    runnerSnapshot?.schema === STATE_SCHEMA &&
                    runnerSnapshot?.authority?.autonomyPolicyStoredHere === false &&
                    runnerSnapshot?.authority?.browserAuthority === false &&
                    runnerSnapshot?.authority?.queuePresenceCreatesAuthority === false &&
                    !Object.prototype.hasOwnProperty.call(
                        runnerSnapshot,
                        "autonomy"
                    ),
                    runnerSnapshot?.authority
                );
                check(
                    "Document queue presence alone never becomes authority",
                    heldItem?.status === "queued" &&
                    this.isAutonomyAuthorized() === false,
                    this.autonomyCapabilityStatus()
                );
                check(
                    "Economic, mutation, signature, certification, submission, legal, external, and truth-promotion authority remain closed",
                    integration?.automaticSpendAuthorized === false &&
                    integration?.documentMutationAuthorized === false &&
                    integration?.signatureAuthorized === false &&
                    integration?.certificationAuthorized === false &&
                    integration?.submissionAuthorized === false &&
                    integration?.legalCommitmentAuthorized === false &&
                    integration?.externalActionAuthorized === false &&
                    integration?.institutionalTruthPromotionAuthorized === false,
                    integration
                );
                check(
                    "Autonomous continuation is event-driven compatibility work rather than a polling authority loop",
                    integration?.eventDrivenQueueContinuation === true &&
                    integration?.browserCompatibilityContinuationOnly === true &&
                    integration?.browserIndependentRunnerCommissioned === false &&
                    !Object.prototype.hasOwnProperty.call(
                        this.configuration,
                        "scanIntervalMs"
                    ),
                    integration
                );
            } finally {
                this.cancelAutonomousQueueContinuation({
                    reason: "acceptance-cleanup"
                });
                this.results = originalResults;
                this.reviewQueue = originalReviews;
                this.activityLog = originalActivity;
                this.rules = originalRules;
                this.configuration.automaticPersistence =
                    originalAutomaticPersistence;
                this.configuration.autoProcessQueue =
                    originalAutoProcessQueue;
                this.configuration.autonomousQueueContinuationEnabled =
                    originalContinuationEnabled;

                if (originalMaddyAutonomy === undefined) {
                    delete global.MaddyAutonomy;
                } else {
                    global.MaddyAutonomy = originalMaddyAutonomy;
                }
                if (originalAuthorityAlias === undefined) {
                    delete global.MEOSAutonomyAuthority;
                } else {
                    global.MEOSAutonomyAuthority = originalAuthorityAlias;
                }
                if (originalIngestion === undefined) {
                    delete global.DocumentIngestion;
                } else {
                    global.DocumentIngestion = originalIngestion;
                }

                this.autonomyAuthorityUnsubscribers =
                    originalAuthorityUnsubscribers;
                this.ingestionQueueListener = originalIngestionListener;
                this.syncAutonomyRuntime({ reason: "acceptance-restore" });
            }

            const passed = checks.filter((item) => item.passed).length;
            const success = passed === checks.length;
            console.table(checks);
            console.info(
                `[MEOS ${this.version}] Commission ${this.commission} Governed Document Intake Autonomy: ${success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`
            );

            return {
                schema: "meos.document-classifier.governed-autonomy-acceptance.v1",
                commission: this.commission,
                version: this.version,
                buildId: this.buildId,
                success,
                passed,
                total: checks.length,
                checks
            };
        },

        logActivity(action, details = {}) {
            const entry = {
                id: this.createId("classifier-activity"),
                action,
                timestamp: new Date().toISOString(),
                details
            };

            this.activityLog.push(entry);

            if (this.activityLog.length > 1000) {
                this.activityLog.splice(
                    0,
                    this.activityLog.length - 1000
                );
            }

            this.emit("activity:logged", this.clone(entry));
            return entry;
        },

        on(eventName, callback) {
            if (
                !eventName ||
                typeof callback !== "function"
            ) {
                return false;
            }

            if (!this.eventListeners[eventName]) {
                this.eventListeners[eventName] = [];
            }

            this.eventListeners[eventName].push(callback);
            return true;
        },

        off(eventName, callback) {
            const listeners =
                this.eventListeners[eventName];

            if (!listeners) {
                return false;
            }

            this.eventListeners[eventName] =
                listeners.filter(
                    (listener) => listener !== callback
                );

            return true;
        },

        emit(eventName, payload) {
            const listeners =
                this.eventListeners[eventName] || [];

            listeners.forEach((listener) => {
                try {
                    listener(payload);
                } catch (error) {
                    console.error(
                        `[MEOS Document Classifier] Event listener failed for "${eventName}":`,
                        error
                    );
                }
            });
        }
    };

    DocumentClassifier.DOCUMENT_TYPES = DOCUMENT_TYPES;
    DocumentClassifier.AUTHORITY_LEVELS = AUTHORITY_LEVELS;
    DocumentClassifier.SENSITIVITY_LEVELS = SENSITIVITY_LEVELS;

    global.DocumentClassifier = DocumentClassifier;
    DocumentClassifier.initialize();
})(window);
