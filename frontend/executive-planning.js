/*
 * MEOS Executive Planning Engine
 * Version: 1.1.0
 * Commission Candidate: 006.031D — Governed Plan-to-Work Autonomy
 * Build: EP110-GOVERNED-PLAN-TO-WORK-AUTONOMY-20260817-A
 *
 * Mission:
 * Convert approved executive intent and evidence-grounded recommendations into
 * structured execution plans with phases, tasks, owners, dependencies, risks,
 * milestones, approvals, and readiness checks.
 *
 * Brick boundary:
 * This engine plans work. It never autonomously approves executive intent. Once
 * a human has approved a plan, it may convert that already-approved plan into one
 * governed internal workflow only when Durable Maddy Autonomy Authority proves
 * approvedWork effective. It does not spend money, sign or certify, submit
 * externally, create legal commitments, contact external parties, or bypass
 * executive authority. Legacy browser configuration flags are never authority.
 */

(function initializeExecutivePlanning(global) {
    "use strict";

    const STORAGE_KEY = "meos.executive-planning.v1";
    const SCHEMA = "meos.executive-planning.package.v1";
    const STATE_SCHEMA = "meos.executive-planning.state.v1";
    const VERSION = "1.1.0";
    const COMMISSION = "006.031D";
    const BUILD_ID =
        "EP110-GOVERNED-PLAN-TO-WORK-AUTONOMY-20260817-A";
    const AUTONOMY_CAPABILITIES = Object.freeze({
        APPROVED_WORK: "approvedWork",
        OFFICE_DISPATCH: "officeDispatch"
    });

    const PLAN_STATUSES = {
        DRAFT: "draft",
        AWAITING_APPROVAL: "awaiting-approval",
        APPROVED: "approved",
        ACTIVE: "active",
        PAUSED: "paused",
        COMPLETE: "complete",
        ARCHIVED: "archived"
    };

    const TASK_STATUSES = {
        NOT_STARTED: "not-started",
        READY: "ready",
        BLOCKED: "blocked",
        IN_PROGRESS: "in-progress",
        AWAITING_APPROVAL: "awaiting-approval",
        COMPLETE: "complete",
        CANCELLED: "cancelled"
    };

    const PRIORITIES = {
        CRITICAL: 100,
        HIGH: 80,
        NORMAL: 50,
        LOW: 25
    };

    const ExecutivePlanning = {
        name: "MEOS Executive Planning Engine",
        version: VERSION,
        commission: COMMISSION,
        status: "initializing",
        operatingMode: "controlled-executive-planning",
        buildId: BUILD_ID,

        configuration: {
            persistenceEnabled: true,
            automaticPersistence: true,
            localStorageKey: STORAGE_KEY,
            persistenceAuthority:
                "durable-cognition-plus-hallway-mission-execution-state",
            browserPersistenceRole:
                "best-effort-planning-continuity-cache",
            organizationNeutralCore: true,
            requireExecutiveApproval: true,
            defaultPlanStatus: PLAN_STATUSES.DRAFT,
            defaultTaskDurationDays: 7,
            defaultPriority: PRIORITIES.NORMAL,
            maximumPlans: 500,
            maximumTasksPerPlan: 500,
            maximumHistory: 1000,
            // Legacy mechanics remain false and cannot grant autonomy.
            // Durable Maddy Autonomy Authority is the only autonomous gate.
            autoCreateMissionDrafts: false,
            autoDispatchApprovedPlans: false,
            autonomyAuthorityRequired: true,
            includeReasoningAnalysis: true,
            includeRiskControls: true,
            includeMilestones: true,
            includeApprovalGates: true,
            includeReadinessChecks: true
        },

        plans: [],
        planningHistory: [],
        analytics: {
            totalPlansCreated: 0,
            approvedPlanCount: 0,
            activePlanCount: 0,
            completedPlanCount: 0,
            blockedTaskCount: 0,
            lastPlanCreatedAt: null
        },
        eventListeners: {},
        initializedAt: null,
        autonomyAuthorityUnsubscribe: null,
        deferredAutonomyBindingInstalled: false,

        persistenceRuntime: {
            suspended: false,
            reason: null,
            suspendedAt: null,
            lastSuccessfulPersistAt: null,
            lastFailureAt: null,
            warningEmitted: false,
            retryCount: 0
        },

        initialize(options = {}) {
            this.configuration = {
                ...this.configuration,
                ...(options.configuration || options)
            };

            this.restore();
            this.initializedAt = new Date().toISOString();
            this.status = "online";

            this.registerSystemKnowledge();
            this.recalculateAnalytics();
            this.bindAutonomyAuthorityEvents();
            this.installDeferredAutonomyBinding();

            console.info(
                `[MEOS] ${this.name} v${this.version} ${this.status}.`
            );

            this.emit("planning:online", this.getStatus());
            return this.getStatus();
        },

        getAutonomyAuthority() {
            return (
                global.MaddyAutonomy ||
                global.MEOSAutonomyAuthority ||
                null
            );
        },

        getAutonomyIntegrationStatus(
            capabilityId = AUTONOMY_CAPABILITIES.APPROVED_WORK
        ) {
            if (
                capabilityId !== AUTONOMY_CAPABILITIES.APPROVED_WORK
            ) {
                return {
                    ready: false,
                    reason: "unsupported-planning-autonomy-capability",
                    capabilityId,
                    version: this.version,
                    commission: this.commission,
                    buildId: this.buildId
                };
            }

            const workflow = global.ExecutiveWorkflow;
            const workflowIntegration =
                workflow &&
                typeof workflow.getAutonomyIntegrationStatus === "function"
                    ? workflow.getAutonomyIntegrationStatus(capabilityId)
                    : null;

            return {
                ready: workflowIntegration?.ready === true,
                reason:
                    workflowIntegration?.ready === true
                        ? "governed-plan-to-work-contract-ready"
                        : "executive-workflow-autonomy-contract-not-ready",
                capabilityId,
                version: this.version,
                commission: this.commission,
                buildId: this.buildId,
                authoritySource: "server-durable-maddy-autonomy-authority",
                browserAuthority: false,
                legacyConfigurationCreatesAuthority: false,
                planApprovalInheritedByDerivedWorkflow: true,
                duplicateWorkflowCreationPrevented: true,
                automaticSpendAuthorized: false,
                externalActionAuthorized: false,
                signatureAuthorized: false,
                certificationAuthorized: false,
                submissionAuthorized: false,
                legalCommitmentAuthorized: false,
                persistenceSnapshotContract: STATE_SCHEMA,
                currentOperationalPersistence:
                    "browser-localStorage-legacy-cache-authority-pending-migration",
                browserIndependentRunnerCommissioned: false,
                workflow: workflowIntegration
            };
        },

        autonomyCapabilityStatus(capabilityId) {
            const authority = this.getAutonomyAuthority();

            if (
                !authority ||
                typeof authority.capabilityStatus !== "function"
            ) {
                return {
                    id: capabilityId,
                    effective: false,
                    uiState: "BLOCKED",
                    reason: "maddy-autonomy-authority-unavailable"
                };
            }

            try {
                return authority.capabilityStatus(capabilityId) || {
                    id: capabilityId,
                    effective: false,
                    uiState: "BLOCKED",
                    reason: "autonomy-capability-status-unavailable"
                };
            } catch (error) {
                return {
                    id: capabilityId,
                    effective: false,
                    uiState: "BLOCKED",
                    reason: "autonomy-capability-probe-failed",
                    error: error?.message || String(error)
                };
            }
        },

        isAutonomyAuthorized(capabilityId) {
            const authority = this.getAutonomyAuthority();
            if (
                !authority ||
                typeof authority.isAuthorized !== "function"
            ) {
                return false;
            }

            try {
                return authority.isAuthorized(capabilityId) === true;
            } catch (_error) {
                return false;
            }
        },

        captureAutonomyReceipt(capabilityId) {
            const authority = this.getAutonomyAuthority();
            const status = this.autonomyCapabilityStatus(capabilityId);
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
                schema: "meos.executive-planning.autonomy-receipt.v1",
                capabilityId,
                effective: status?.effective === true,
                uiState: status?.uiState || "BLOCKED",
                reason: status?.reason || "authority-unproven",
                authorityRevision:
                    snapshot?.policy?.revision ??
                    snapshot?.serverStatus?.revision ??
                    null,
                authoritySource: "server-durable-maddy-autonomy-authority",
                browserAuthority: false,
                capturedAt: new Date().toISOString()
            };
        },

        bindAutonomyAuthorityEvents() {
            if (this.autonomyAuthorityUnsubscribe) {
                return true;
            }

            const authority = this.getAutonomyAuthority();
            if (!authority || typeof authority.on !== "function") {
                return false;
            }

            try {
                this.autonomyAuthorityUnsubscribe =
                    authority.on("authority:updated", () => {
                        if (
                            this.isAutonomyAuthorized(
                                AUTONOMY_CAPABILITIES.APPROVED_WORK
                            )
                        ) {
                            this.continueApprovedPlansAutonomously({
                                reason: "authority-updated"
                            });
                        }
                    });
                return true;
            } catch (_error) {
                return false;
            }
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
                if (
                    this.isAutonomyAuthorized(
                        AUTONOMY_CAPABILITIES.APPROVED_WORK
                    )
                ) {
                    this.continueApprovedPlansAutonomously({
                        reason: "window-load-authority-ready"
                    });
                }
            }, { once: true });
            return true;
        },

        createPlan(input = {}, options = {}) {
            const objective = String(
                input.objective ||
                input.goal ||
                input.title ||
                ""
            ).trim();

            if (!objective) {
                return {
                    success: false,
                    error: "A plan objective is required."
                };
            }

            if (this.plans.length >= this.configuration.maximumPlans) {
                return {
                    success: false,
                    error: "The maximum plan limit has been reached."
                };
            }

            const reasoning = this.configuration.includeReasoningAnalysis &&
                options.skipReasoning !== true
                ? this.runReasoning(objective, {
                    mode: input.reasoningMode || "operational",
                    evidenceLimit: input.evidenceLimit || 40
                })
                : null;

            const timestamp = new Date().toISOString();
            const planId = this.createId("executive-plan");

            const phaseBlueprints =
                Array.isArray(input.phases) && input.phases.length > 0
                    ? input.phases
                    : this.derivePhases(objective, reasoning, input);

            const plan = {
                id: planId,
                title: input.title || objective,
                objective,
                description: input.description || "",
                status:
                    input.status ||
                    this.configuration.defaultPlanStatus,
                priority: this.normalizePriority(input.priority),
                strategy: input.strategy || "",
                requestedBy:
                    input.requestedBy ||
                    options.actor ||
                    "Executive",
                executiveOwner:
                    input.executiveOwner ||
                    "Maddy",
                startDate:
                    this.normalizeDate(input.startDate) ||
                    timestamp,
                targetDate:
                    this.normalizeDate(input.targetDate) ||
                    this.addDays(
                        timestamp,
                        this.estimatePlanDurationDays(
                            phaseBlueprints
                        )
                    ),
                createdAt: timestamp,
                updatedAt: timestamp,
                approvedAt: null,
                approvedBy: null,
                activatedAt: null,
                completedAt: null,
                executionWorkflowId: null,
                executionBridge: {
                    status: "not-created",
                    lastAttemptAt: null,
                    lastResult: null,
                    authorityReceipt: null
                },
                phases: [],
                milestones: [],
                dependencies: [],
                risks: [],
                approvals: [],
                readinessChecks: [],
                tags: this.uniqueStrings(input.tags),
                topics: this.uniqueStrings([
                    ...(input.topics || []),
                    "executive-planning"
                ]),
                offices: [],
                reasoningContext:
                    reasoning?.success
                        ? {
                            recommendation:
                                reasoning.recommendation,
                            evidenceAssessment:
                                reasoning.evidenceAssessment,
                            executiveSummary:
                                reasoning.executiveSummary,
                            citations:
                                reasoning.citations || [],
                            analysisGeneratedAt:
                                reasoning.generatedAt
                        }
                        : null,
                metadata:
                    input.metadata &&
                    typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}
            };

            plan.phases = this.buildPhases(
                plan,
                phaseBlueprints,
                input
            );

            plan.dependencies = this.derivePlanDependencies(
                plan,
                reasoning,
                input
            );

            plan.risks = this.configuration.includeRiskControls
                ? this.derivePlanRisks(plan, reasoning, input)
                : [];

            plan.milestones = this.configuration.includeMilestones
                ? this.buildMilestones(plan, input)
                : [];

            plan.approvals = this.configuration.includeApprovalGates
                ? this.buildApprovalGates(plan, reasoning, input)
                : [];

            plan.readinessChecks =
                this.configuration.includeReadinessChecks
                    ? this.buildReadinessChecks(
                        plan,
                        reasoning,
                        input
                    )
                    : [];

            plan.offices = this.uniqueStrings(
                plan.phases.flatMap((phase) =>
                    phase.tasks.map((task) => task.office)
                )
            );

            this.recalculatePlan(plan);
            this.plans.push(plan);

            this.analytics.totalPlansCreated += 1;
            this.analytics.lastPlanCreatedAt = timestamp;

            this.logHistory("plan.created", {
                planId: plan.id,
                title: plan.title,
                objective: plan.objective,
                phaseCount: plan.phases.length,
                taskCount: plan.metrics.totalTasks
            });

            if (options.createMissionDrafts === true) {
                this.createMissionDrafts(plan);
            }

            this.persistIfEnabled();
            this.emit("plan:created", this.clone(plan));

            return {
                success: true,
                plan: this.clone(plan),
                reasoning
            };
        },

        derivePhases(objective, reasoning, input = {}) {
            const phases = [
                {
                    title: "Executive Alignment",
                    objective:
                        "Confirm scope, authority, constraints, and success criteria.",
                    durationDays: 3,
                    tasks: [
                        {
                            title: "Confirm objective and success criteria",
                            office: "Maddy",
                            priority: PRIORITIES.HIGH,
                            approvalRequired: true
                        },
                        {
                            title: "Review institutional evidence and prior decisions",
                            office: "Maddy",
                            priority: PRIORITIES.HIGH
                        },
                        {
                            title: "Confirm authority, policies, and constraints",
                            office: "Justice",
                            priority: PRIORITIES.HIGH,
                            approvalRequired: true
                        }
                    ]
                },
                {
                    title: "Resource and Risk Preparation",
                    objective:
                        "Confirm resources, budget, staffing, dependencies, and material risks.",
                    durationDays: 7,
                    tasks: [
                        {
                            title: "Confirm financial capacity and budget assumptions",
                            office: "Archie",
                            priority: PRIORITIES.HIGH
                        },
                        {
                            title: "Confirm staffing and operational capacity",
                            office: "Harmony",
                            priority: PRIORITIES.NORMAL
                        },
                        {
                            title: "Resolve critical dependencies and risk controls",
                            office: "Maddy",
                            priority: PRIORITIES.HIGH
                        }
                    ]
                },
                {
                    title: "Execution",
                    objective:
                        "Complete the approved operational work.",
                    durationDays:
                        Number(input.executionDurationDays) || 21,
                    tasks: [
                        {
                            title: `Execute: ${objective}`,
                            office:
                                input.primaryOffice ||
                                "Maddy",
                            priority:
                                this.normalizePriority(
                                    input.priority
                                )
                        },
                        {
                            title: "Coordinate cross-office work and remove blockers",
                            office: "Maddy",
                            priority: PRIORITIES.HIGH
                        },
                        {
                            title: "Track progress, evidence, and material changes",
                            office: "Atlas",
                            priority: PRIORITIES.NORMAL
                        }
                    ]
                },
                {
                    title: "Review and Institutional Learning",
                    objective:
                        "Verify completion, record outcomes, and preserve lessons learned.",
                    durationDays: 5,
                    tasks: [
                        {
                            title: "Verify deliverables and completion criteria",
                            office: "Maddy",
                            priority: PRIORITIES.HIGH,
                            approvalRequired: true
                        },
                        {
                            title: "Record final decisions, outcomes, and lessons learned",
                            office: "Maddy",
                            priority: PRIORITIES.NORMAL
                        },
                        {
                            title: "Archive evidence and update institutional memory",
                            office: "Maddy",
                            priority: PRIORITIES.NORMAL
                        }
                    ]
                }
            ];

            if (
                reasoning?.success &&
                reasoning.risks?.some(
                    (risk) => risk.category === "compliance"
                )
            ) {
                phases.splice(1, 0, {
                    title: "Compliance Clearance",
                    objective:
                        "Resolve compliance requirements before execution.",
                    durationDays: 5,
                    tasks: [
                        {
                            title: "Complete compliance review",
                            office: "Justice",
                            priority: PRIORITIES.CRITICAL,
                            approvalRequired: true
                        }
                    ]
                });
            }

            return phases;
        },

        buildPhases(plan, blueprints, input = {}) {
            let phaseStart = plan.startDate;

            return blueprints.map((blueprint, phaseIndex) => {
                const durationDays = Math.max(
                    1,
                    Number(blueprint.durationDays) ||
                    this.configuration.defaultTaskDurationDays
                );

                const phase = {
                    id: this.createId("plan-phase"),
                    planId: plan.id,
                    order: phaseIndex + 1,
                    title:
                        blueprint.title ||
                        `Phase ${phaseIndex + 1}`,
                    objective:
                        blueprint.objective ||
                        "",
                    status: TASK_STATUSES.NOT_STARTED,
                    startDate:
                        this.normalizeDate(blueprint.startDate) ||
                        phaseStart,
                    targetDate:
                        this.normalizeDate(blueprint.targetDate) ||
                        this.addDays(phaseStart, durationDays),
                    completedAt: null,
                    tasks: []
                };

                phase.tasks = (
                    blueprint.tasks || []
                ).map((taskInput, taskIndex) =>
                    this.createTaskRecord(
                        plan,
                        phase,
                        taskInput,
                        taskIndex
                    )
                );

                phaseStart = phase.targetDate;
                return phase;
            });
        },

        createTaskRecord(plan, phase, input = {}, taskIndex = 0) {
            const durationDays = Math.max(
                1,
                Number(input.durationDays) ||
                this.configuration.defaultTaskDurationDays
            );

            return {
                id: this.createId("plan-task"),
                planId: plan.id,
                phaseId: phase.id,
                order: taskIndex + 1,
                title:
                    input.title ||
                    `Task ${taskIndex + 1}`,
                description:
                    input.description ||
                    "",
                office:
                    input.office ||
                    "Maddy",
                owner:
                    input.owner ||
                    null,
                status:
                    input.status ||
                    TASK_STATUSES.NOT_STARTED,
                priority:
                    this.normalizePriority(input.priority),
                startDate:
                    this.normalizeDate(input.startDate) ||
                    phase.startDate,
                targetDate:
                    this.normalizeDate(input.targetDate) ||
                    this.addDays(
                        phase.startDate,
                        durationDays
                    ),
                completedAt: null,
                dependencies:
                    this.uniqueStrings(input.dependencies),
                blockers:
                    this.uniqueStrings(input.blockers),
                deliverables:
                    this.uniqueStrings(input.deliverables),
                approvalRequired:
                    input.approvalRequired === true,
                approvedAt: null,
                approvedBy: null,
                missionId: null,
                evidence: [],
                notes: input.notes || "",
                metadata:
                    input.metadata &&
                    typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}
            };
        },

        derivePlanDependencies(plan, reasoning, input = {}) {
            const dependencies = [];

            (input.dependencies || []).forEach((dependency) => {
                dependencies.push(
                    this.normalizeDependency(dependency, plan.id)
                );
            });

            (reasoning?.dependencies || []).forEach((dependency) => {
                dependencies.push(
                    this.normalizeDependency(
                        {
                            title:
                                dependency.dependency ||
                                dependency.sourceTitle ||
                                "Institutional dependency",
                            sourceType:
                                dependency.sourceType,
                            sourceId:
                                dependency.sourceId,
                            citation:
                                dependency.citation
                        },
                        plan.id
                    )
                );
            });

            return this.deduplicateObjects(
                dependencies,
                (item) =>
                    this.normalizeText(item.title)
            );
        },

        normalizeDependency(input, planId) {
            const value =
                typeof input === "string"
                    ? { title: input }
                    : input || {};

            return {
                id: this.createId("plan-dependency"),
                planId,
                title:
                    value.title ||
                    value.name ||
                    "Unnamed dependency",
                type:
                    value.type ||
                    "general",
                status:
                    value.status ||
                    "unconfirmed",
                critical:
                    value.critical === true,
                owner:
                    value.owner ||
                    null,
                targetDate:
                    this.normalizeDate(value.targetDate),
                sourceType:
                    value.sourceType ||
                    null,
                sourceId:
                    value.sourceId ||
                    null,
                citation:
                    value.citation ||
                    null
            };
        },

        derivePlanRisks(plan, reasoning, input = {}) {
            const risks = [];

            (input.risks || []).forEach((risk) => {
                risks.push(
                    this.normalizeRisk(risk, plan.id)
                );
            });

            (reasoning?.risks || []).forEach((risk) => {
                risks.push(
                    this.normalizeRisk(
                        {
                            category: risk.category,
                            title: risk.title,
                            severity: risk.severity,
                            likelihood: risk.likelihood,
                            description: risk.description,
                            mitigation: risk.mitigation,
                            evidence: risk.evidence
                        },
                        plan.id
                    )
                );
            });

            return this.deduplicateObjects(
                risks,
                (item) =>
                    `${item.category}:${this.normalizeText(item.title)}`
            );
        },

        normalizeRisk(input, planId) {
            const value =
                typeof input === "string"
                    ? {
                        title: input,
                        description: input
                    }
                    : input || {};

            return {
                id: this.createId("plan-risk"),
                planId,
                category:
                    value.category ||
                    "general",
                title:
                    value.title ||
                    "Unnamed risk",
                severity:
                    value.severity ||
                    "moderate",
                likelihood:
                    value.likelihood ||
                    "possible",
                description:
                    value.description ||
                    "",
                mitigation:
                    value.mitigation ||
                    "",
                owner:
                    value.owner ||
                    null,
                status:
                    value.status ||
                    "open",
                evidence:
                    Array.isArray(value.evidence)
                        ? value.evidence
                        : []
            };
        },

        buildMilestones(plan, input = {}) {
            const milestones = plan.phases.map((phase) => ({
                id: this.createId("plan-milestone"),
                planId: plan.id,
                phaseId: phase.id,
                title: `${phase.title} complete`,
                description:
                    `All required work for ${phase.title} is complete.`,
                targetDate: phase.targetDate,
                status: "not-achieved",
                achievedAt: null,
                approvalRequired:
                    phase.tasks.some(
                        (task) => task.approvalRequired
                    )
            }));

            (input.milestones || []).forEach((milestone) => {
                milestones.push({
                    id: this.createId("plan-milestone"),
                    planId: plan.id,
                    phaseId:
                        milestone.phaseId ||
                        null,
                    title:
                        milestone.title ||
                        "Milestone",
                    description:
                        milestone.description ||
                        "",
                    targetDate:
                        this.normalizeDate(
                            milestone.targetDate
                        ),
                    status:
                        milestone.status ||
                        "not-achieved",
                    achievedAt: null,
                    approvalRequired:
                        milestone.approvalRequired === true
                });
            });

            return milestones;
        },

        buildApprovalGates(plan, reasoning, input = {}) {
            const approvals = [];

            if (this.configuration.requireExecutiveApproval) {
                approvals.push({
                    id: this.createId("plan-approval"),
                    planId: plan.id,
                    type: "plan-approval",
                    title: "Executive Plan Approval",
                    status: "pending",
                    requiredRole:
                        input.requiredApprovalRole ||
                        "Executive Director",
                    requestedAt:
                        new Date().toISOString(),
                    decidedAt: null,
                    decidedBy: null,
                    notes: ""
                });
            }

            plan.phases.forEach((phase) => {
                if (
                    phase.tasks.some(
                        (task) => task.approvalRequired
                    )
                ) {
                    approvals.push({
                        id: this.createId("plan-approval"),
                        planId: plan.id,
                        phaseId: phase.id,
                        type: "phase-gate",
                        title:
                            `${phase.title} approval gate`,
                        status: "pending",
                        requiredRole:
                            "Authorized Executive",
                        requestedAt: null,
                        decidedAt: null,
                        decidedBy: null,
                        notes: ""
                    });
                }
            });

            if (
                reasoning?.recommendation?.state ===
                "proceed-with-conditions"
            ) {
                approvals.push({
                    id: this.createId("plan-approval"),
                    planId: plan.id,
                    type: "conditional-clearance",
                    title: "Conditional Recommendation Clearance",
                    status: "pending",
                    requiredRole:
                        "Authorized Executive",
                    requestedAt:
                        new Date().toISOString(),
                    decidedAt: null,
                    decidedBy: null,
                    notes:
                        (
                            reasoning.recommendation
                                .conditions || []
                        ).join(" ")
                });
            }

            return approvals;
        },

        buildReadinessChecks(plan, reasoning, input = {}) {
            const checks = [
                {
                    title: "Objective and success criteria confirmed",
                    category: "strategy",
                    required: true
                },
                {
                    title: "Authority and approval requirements confirmed",
                    category: "governance",
                    required: true
                },
                {
                    title: "Budget and resources confirmed",
                    category: "finance",
                    required: true
                },
                {
                    title: "Owners assigned to critical tasks",
                    category: "operations",
                    required: true
                },
                {
                    title: "Critical dependencies confirmed",
                    category: "dependency",
                    required:
                        plan.dependencies.some(
                            (item) => item.critical
                        )
                },
                {
                    title: "High-severity risks mitigated",
                    category: "risk",
                    required:
                        plan.risks.some(
                            (risk) =>
                                risk.severity === "high"
                        )
                }
            ];

            return checks.map((check) => ({
                id: this.createId("readiness-check"),
                planId: plan.id,
                title: check.title,
                category: check.category,
                required: check.required,
                status:
                    check.required
                        ? "pending"
                        : "not-required",
                completedAt: null,
                completedBy: null,
                evidence: []
            }));
        },

        approvePlan(planId, options = {}) {
            const plan = this.getPlanById(planId);

            if (!plan) {
                return {
                    success: false,
                    error: "Plan was not found."
                };
            }

            const readiness =
                this.evaluateReadiness(plan);

            if (
                options.overrideReadiness !== true &&
                !readiness.ready
            ) {
                return {
                    success: false,
                    error:
                        "Plan is not ready for approval.",
                    readiness
                };
            }

            const timestamp = new Date().toISOString();

            plan.status = PLAN_STATUSES.APPROVED;
            plan.approvedAt = timestamp;
            plan.approvedBy =
                options.actor ||
                "Executive";
            plan.updatedAt = timestamp;

            const planApproval =
                plan.approvals.find(
                    (approval) =>
                        approval.type === "plan-approval" &&
                        approval.status === "pending"
                );

            if (planApproval) {
                planApproval.status = "approved";
                planApproval.decidedAt = timestamp;
                planApproval.decidedBy =
                    plan.approvedBy;
                planApproval.notes =
                    options.notes || "";
            }

            let manualMissionDrafts = null;
            if (
                options.dispatch === true ||
                options.createMissionDrafts === true
            ) {
                manualMissionDrafts = this.createMissionDrafts(plan);
            }

            let autonomousContinuation = null;
            if (
                options.suppressAutonomousContinuation !== true &&
                this.isAutonomyAuthorized(
                    AUTONOMY_CAPABILITIES.APPROVED_WORK
                )
            ) {
                autonomousContinuation = this.continueApprovedPlan(
                    plan,
                    {
                        autonomous: true,
                        reason: "plan-approved",
                        authorityReceipt:
                            this.captureAutonomyReceipt(
                                AUTONOMY_CAPABILITIES.APPROVED_WORK
                            )
                    }
                );
            }

            this.logHistory("plan.approved", {
                planId: plan.id,
                approvedBy: plan.approvedBy,
                autonomousContinuation:
                    autonomousContinuation
                        ? {
                            success:
                                autonomousContinuation.success === true,
                            blocked:
                                autonomousContinuation.blocked === true,
                            reason:
                                autonomousContinuation.reason || null,
                            workflowId:
                                autonomousContinuation.workflowId || null
                        }
                        : null
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("plan:approved", this.clone(plan));

            return {
                success: true,
                plan: this.clone(plan),
                readiness,
                manualMissionDrafts,
                autonomousContinuation
            };
        },

        continueApprovedPlansAutonomously(options = {}) {
            if (
                !this.isAutonomyAuthorized(
                    AUTONOMY_CAPABILITIES.APPROVED_WORK
                )
            ) {
                return {
                    success: false,
                    blocked: true,
                    reason: "approved-work-autonomy-not-authorized",
                    results: []
                };
            }

            const eligible = this.plans.filter(
                (plan) =>
                    [
                        PLAN_STATUSES.APPROVED,
                        PLAN_STATUSES.ACTIVE
                    ].includes(plan.status)
            );

            const results = eligible.map((plan) =>
                this.continueApprovedPlan(plan, {
                    autonomous: true,
                    reason:
                        options.reason ||
                        "approved-work-authority-effective",
                    authorityReceipt:
                        this.captureAutonomyReceipt(
                            AUTONOMY_CAPABILITIES.APPROVED_WORK
                        )
                })
            );

            return {
                success:
                    results.length === 0 ||
                    results.every(
                        (result) =>
                            result.success === true ||
                            result.duplicate === true
                    ),
                eligiblePlanCount: eligible.length,
                results
            };
        },

        continueApprovedPlan(planOrId, options = {}) {
            const plan =
                typeof planOrId === "string"
                    ? this.getPlanById(planOrId)
                    : planOrId;

            if (!plan) {
                return {
                    success: false,
                    error: "Plan was not found."
                };
            }

            if (
                ![
                    PLAN_STATUSES.APPROVED,
                    PLAN_STATUSES.ACTIVE
                ].includes(plan.status)
            ) {
                return {
                    success: false,
                    blocked: true,
                    reason: "plan-not-approved",
                    planId: plan.id
                };
            }

            const autonomous = options.autonomous === true;
            if (
                autonomous &&
                !this.isAutonomyAuthorized(
                    AUTONOMY_CAPABILITIES.APPROVED_WORK
                )
            ) {
                return {
                    success: false,
                    blocked: true,
                    reason: "approved-work-autonomy-not-authorized",
                    planId: plan.id
                };
            }

            const workflowEngine = global.ExecutiveWorkflow;
            if (
                !workflowEngine ||
                typeof workflowEngine.createFromPlan !== "function" ||
                typeof workflowEngine.approveWorkflow !== "function"
            ) {
                this.recordExecutionBridge(plan, {
                    status: "blocked",
                    reason: "executive-workflow-unavailable",
                    authorityReceipt:
                        options.authorityReceipt || null
                });
                return {
                    success: false,
                    blocked: true,
                    reason: "executive-workflow-unavailable",
                    planId: plan.id
                };
            }

            if (autonomous) {
                const workflowIntegration =
                    typeof workflowEngine.getAutonomyIntegrationStatus ===
                    "function"
                        ? workflowEngine.getAutonomyIntegrationStatus(
                            AUTONOMY_CAPABILITIES.APPROVED_WORK
                        )
                        : null;

                if (workflowIntegration?.ready !== true) {
                    this.recordExecutionBridge(plan, {
                        status: "blocked",
                        reason:
                            "executive-workflow-autonomy-contract-not-ready",
                        authorityReceipt:
                            options.authorityReceipt || null
                    });
                    return {
                        success: false,
                        blocked: true,
                        reason:
                            "executive-workflow-autonomy-contract-not-ready",
                        planId: plan.id,
                        workflowIntegration
                    };
                }
            }

            let workflow = null;
            const existing =
                typeof workflowEngine.searchWorkflows === "function"
                    ? workflowEngine.searchWorkflows("", {
                        sourcePlanId: plan.id
                    })[0] || null
                    : null;

            if (existing) {
                workflow =
                    workflowEngine.getWorkflowById?.(existing.id) ||
                    existing;
            } else {
                const created = workflowEngine.createFromPlan(plan, {
                    actor: plan.approvedBy || "Executive",
                    inheritedPlanApproval: true,
                    sourcePlanApprovalAt: plan.approvedAt,
                    sourcePlanApprovalBy: plan.approvedBy
                });

                if (!created?.success || !created?.workflow?.id) {
                    this.recordExecutionBridge(plan, {
                        status: "blocked",
                        reason:
                            created?.error ||
                            "workflow-creation-failed",
                        authorityReceipt:
                            options.authorityReceipt || null
                    });
                    return {
                        success: false,
                        blocked: true,
                        reason:
                            created?.error ||
                            "workflow-creation-failed",
                        planId: plan.id,
                        created
                    };
                }

                workflow =
                    workflowEngine.getWorkflowById?.(
                        created.workflow.id
                    ) || created.workflow;
            }

            plan.executionWorkflowId = workflow.id;

            let approvalResult = null;
            if (
                ["draft", "awaiting-approval"].includes(
                    workflow.status
                )
            ) {
                approvalResult = workflowEngine.approveWorkflow(
                    workflow.id,
                    {
                        actor:
                            plan.approvedBy ||
                            "Executive",
                        notes:
                            `Inherited from human-approved executive plan ${plan.id}.`,
                        inheritedPlanApproval: true,
                        sourcePlanId: plan.id,
                        sourcePlanApprovalAt: plan.approvedAt,
                        authorityReceipt:
                            options.authorityReceipt || null
                    }
                );

                if (approvalResult?.success !== true) {
                    this.recordExecutionBridge(plan, {
                        status: "blocked",
                        reason:
                            approvalResult?.error ||
                            approvalResult?.reason ||
                            "workflow-approval-propagation-failed",
                        workflowId: workflow.id,
                        authorityReceipt:
                            options.authorityReceipt || null
                    });
                    return {
                        success: false,
                        blocked: true,
                        reason:
                            approvalResult?.error ||
                            approvalResult?.reason ||
                            "workflow-approval-propagation-failed",
                        planId: plan.id,
                        workflowId: workflow.id,
                        approvalResult
                    };
                }
            }

            const currentWorkflow =
                workflowEngine.getWorkflowById?.(workflow.id) ||
                approvalResult?.workflow ||
                workflow;

            if (
                currentWorkflow?.status === "active" &&
                plan.status === PLAN_STATUSES.APPROVED
            ) {
                plan.status = PLAN_STATUSES.ACTIVE;
                plan.activatedAt =
                    plan.activatedAt ||
                    new Date().toISOString();
            }

            const duplicate = Boolean(existing);
            const bridgeStatus =
                currentWorkflow?.status === "active"
                    ? "active"
                    : currentWorkflow?.status === "complete"
                        ? "complete"
                        : "workflow-ready";

            this.recordExecutionBridge(plan, {
                status: bridgeStatus,
                reason:
                    duplicate
                        ? "existing-plan-workflow-reused"
                        : "approved-plan-converted-to-governed-workflow",
                workflowId: workflow.id,
                authorityReceipt:
                    options.authorityReceipt || null
            });

            this.logHistory(
                duplicate
                    ? "plan.workflow.reused"
                    : "plan.workflow.created",
                {
                    planId: plan.id,
                    workflowId: workflow.id,
                    autonomous,
                    authorityReceipt:
                        options.authorityReceipt || null
                }
            );

            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("plan:workflow-linked", {
                planId: plan.id,
                workflowId: workflow.id,
                autonomous,
                duplicate,
                status: bridgeStatus
            });

            return {
                success: true,
                duplicate,
                planId: plan.id,
                workflowId: workflow.id,
                plan: this.clone(plan),
                workflow: this.clone(currentWorkflow),
                approvalResult,
                authorityReceipt:
                    options.authorityReceipt || null
            };
        },

        recordExecutionBridge(plan, update = {}) {
            const now = new Date().toISOString();
            plan.executionBridge = {
                status:
                    update.status ||
                    plan.executionBridge?.status ||
                    "not-created",
                lastAttemptAt: now,
                lastResult: {
                    reason: update.reason || null,
                    workflowId:
                        update.workflowId ||
                        plan.executionWorkflowId ||
                        null
                },
                authorityReceipt:
                    update.authorityReceipt || null
            };
            if (update.workflowId) {
                plan.executionWorkflowId = update.workflowId;
            }
            plan.updatedAt = now;
            return plan.executionBridge;
        },

        activatePlan(planId, options = {}) {
            const plan = this.getPlanById(planId);

            if (!plan) {
                return {
                    success: false,
                    error: "Plan was not found."
                };
            }

            if (
                plan.status !== PLAN_STATUSES.APPROVED &&
                options.overrideApproval !== true
            ) {
                return {
                    success: false,
                    error:
                        "Only approved plans may be activated."
                };
            }

            const timestamp = new Date().toISOString();

            plan.status = PLAN_STATUSES.ACTIVE;
            plan.activatedAt = timestamp;
            plan.updatedAt = timestamp;

            this.refreshTaskReadiness(plan);
            this.logHistory("plan.activated", {
                planId: plan.id,
                actor:
                    options.actor ||
                    "Executive"
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("plan:activated", this.clone(plan));

            return {
                success: true,
                plan: this.clone(plan)
            };
        },

        updateTaskStatus(
            planId,
            taskId,
            status,
            options = {}
        ) {
            const plan = this.getPlanById(planId);

            if (!plan) {
                return {
                    success: false,
                    error: "Plan was not found."
                };
            }

            const task = this.findTask(plan, taskId);

            if (!task) {
                return {
                    success: false,
                    error: "Task was not found."
                };
            }

            if (
                !Object.values(TASK_STATUSES).includes(status)
            ) {
                return {
                    success: false,
                    error: "Task status is invalid."
                };
            }

            if (
                status === TASK_STATUSES.COMPLETE &&
                task.approvalRequired &&
                !task.approvedAt &&
                options.overrideApproval !== true
            ) {
                task.status =
                    TASK_STATUSES.AWAITING_APPROVAL;
            } else {
                task.status = status;
            }

            if (task.status === TASK_STATUSES.COMPLETE) {
                task.completedAt =
                    new Date().toISOString();
            }

            task.notes =
                options.notes ??
                task.notes;
            plan.updatedAt =
                new Date().toISOString();

            this.recalculatePlan(plan);
            this.refreshTaskReadiness(plan);
            this.persistIfEnabled();

            this.logHistory("task.status-updated", {
                planId,
                taskId,
                status: task.status,
                actor:
                    options.actor ||
                    "Executive"
            });

            this.emit("task:updated", {
                plan: this.clone(plan),
                task: this.clone(task)
            });

            return {
                success: true,
                task: this.clone(task),
                plan: this.clone(plan)
            };
        },

        approveTask(
            planId,
            taskId,
            options = {}
        ) {
            const plan = this.getPlanById(planId);
            const task =
                plan ? this.findTask(plan, taskId) : null;

            if (!plan || !task) {
                return {
                    success: false,
                    error: "Plan or task was not found."
                };
            }

            task.approvedAt =
                new Date().toISOString();
            task.approvedBy =
                options.actor ||
                "Authorized Executive";

            if (
                task.status ===
                TASK_STATUSES.AWAITING_APPROVAL
            ) {
                task.status =
                    TASK_STATUSES.COMPLETE;
                task.completedAt =
                    task.approvedAt;
            }

            plan.updatedAt = task.approvedAt;
            this.recalculatePlan(plan);
            this.refreshTaskReadiness(plan);
            this.persistIfEnabled();

            return {
                success: true,
                task: this.clone(task),
                plan: this.clone(plan)
            };
        },

        completeReadinessCheck(
            planId,
            checkId,
            options = {}
        ) {
            const plan = this.getPlanById(planId);

            if (!plan) {
                return {
                    success: false,
                    error: "Plan was not found."
                };
            }

            const check =
                plan.readinessChecks.find(
                    (item) => item.id === checkId
                );

            if (!check) {
                return {
                    success: false,
                    error: "Readiness check was not found."
                };
            }

            check.status = "complete";
            check.completedAt =
                new Date().toISOString();
            check.completedBy =
                options.actor ||
                "Executive";
            check.evidence =
                Array.isArray(options.evidence)
                    ? options.evidence
                    : check.evidence;

            plan.updatedAt =
                check.completedAt;
            this.persistIfEnabled();

            return {
                success: true,
                check: this.clone(check),
                readiness:
                    this.evaluateReadiness(plan)
            };
        },

        evaluateReadiness(planOrId) {
            const plan =
                typeof planOrId === "string"
                    ? this.getPlanById(planOrId)
                    : planOrId;

            if (!plan) {
                return {
                    ready: false,
                    score: 0,
                    missing: ["Plan not found."]
                };
            }

            const requiredChecks =
                plan.readinessChecks.filter(
                    (check) => check.required
                );
            const completedChecks =
                requiredChecks.filter(
                    (check) =>
                        check.status === "complete"
                );
            const pendingApprovals =
                plan.approvals.filter(
                    (approval) =>
                        approval.type !== "plan-approval" &&
                        approval.status === "pending" &&
                        approval.requestedAt
                );
            const unresolvedCriticalDependencies =
                plan.dependencies.filter(
                    (dependency) =>
                        dependency.critical &&
                        dependency.status !== "confirmed"
                );
            const openHighRisks =
                plan.risks.filter(
                    (risk) =>
                        risk.severity === "high" &&
                        risk.status !== "mitigated" &&
                        risk.status !== "closed"
                );

            const score =
                requiredChecks.length === 0
                    ? 1
                    : completedChecks.length /
                      requiredChecks.length;

            const missing = [
                ...requiredChecks
                    .filter(
                        (check) =>
                            check.status !== "complete"
                    )
                    .map((check) => check.title),
                ...pendingApprovals.map(
                    (approval) =>
                        `Approval pending: ${approval.title}`
                ),
                ...unresolvedCriticalDependencies.map(
                    (dependency) =>
                        `Critical dependency unconfirmed: ${dependency.title}`
                ),
                ...openHighRisks.map(
                    (risk) =>
                        `High risk unresolved: ${risk.title}`
                )
            ];

            return {
                ready:
                    score === 1 &&
                    pendingApprovals.length === 0 &&
                    unresolvedCriticalDependencies.length === 0 &&
                    openHighRisks.length === 0,
                score:
                    Number(score.toFixed(3)),
                requiredCheckCount:
                    requiredChecks.length,
                completedCheckCount:
                    completedChecks.length,
                pendingApprovalCount:
                    pendingApprovals.length,
                unresolvedCriticalDependencyCount:
                    unresolvedCriticalDependencies.length,
                openHighRiskCount:
                    openHighRisks.length,
                missing
            };
        },

        refreshTaskReadiness(plan) {
            const tasks =
                plan.phases.flatMap(
                    (phase) => phase.tasks
                );

            tasks.forEach((task) => {
                if (
                    [
                        TASK_STATUSES.COMPLETE,
                        TASK_STATUSES.CANCELLED,
                        TASK_STATUSES.IN_PROGRESS,
                        TASK_STATUSES.AWAITING_APPROVAL
                    ].includes(task.status)
                ) {
                    return;
                }

                const dependenciesMet =
                    task.dependencies.every(
                        (dependencyId) => {
                            const dependencyTask =
                                tasks.find(
                                    (candidate) =>
                                        candidate.id ===
                                        dependencyId
                                );

                            return (
                                dependencyTask &&
                                dependencyTask.status ===
                                    TASK_STATUSES.COMPLETE
                            );
                        }
                    );

                if (task.blockers.length > 0) {
                    task.status =
                        TASK_STATUSES.BLOCKED;
                } else if (dependenciesMet) {
                    task.status =
                        TASK_STATUSES.READY;
                } else {
                    task.status =
                        TASK_STATUSES.BLOCKED;
                }
            });

            plan.phases.forEach((phase) => {
                const phaseTasks = phase.tasks;

                if (
                    phaseTasks.every(
                        (task) =>
                            task.status ===
                            TASK_STATUSES.COMPLETE
                    )
                ) {
                    phase.status =
                        TASK_STATUSES.COMPLETE;
                    phase.completedAt =
                        phase.completedAt ||
                        new Date().toISOString();
                } else if (
                    phaseTasks.some(
                        (task) =>
                            task.status ===
                            TASK_STATUSES.IN_PROGRESS
                    )
                ) {
                    phase.status =
                        TASK_STATUSES.IN_PROGRESS;
                } else if (
                    phaseTasks.some(
                        (task) =>
                            task.status ===
                            TASK_STATUSES.READY
                    )
                ) {
                    phase.status =
                        TASK_STATUSES.READY;
                } else {
                    phase.status =
                        TASK_STATUSES.BLOCKED;
                }
            });

            this.recalculatePlan(plan);
        },

        createMissionDrafts(planOrId) {
            const plan =
                typeof planOrId === "string"
                    ? this.getPlanById(planOrId)
                    : planOrId;

            if (!plan) {
                return {
                    success: false,
                    error: "Plan was not found."
                };
            }

            const engine = global.MEOSMissionEngine;

            if (
                !engine ||
                typeof engine.createMission !== "function"
            ) {
                return {
                    success: false,
                    connected: false,
                    error: "Mission Engine is unavailable."
                };
            }

            const results = [];

            plan.phases.forEach((phase) => {
                phase.tasks.forEach((task) => {
                    if (task.missionId) {
                        return;
                    }

                    try {
                        const mission = engine.createMission({
                            title: task.title,
                            description: task.description,
                            objective: plan.objective,
                            office: task.office,
                            priority: task.priority,
                            status: "draft",
                            dueDate: task.targetDate,
                            tags: [
                                ...plan.tags,
                                "executive-plan",
                                plan.id,
                                phase.id
                            ],
                            metadata: {
                                planId: plan.id,
                                phaseId: phase.id,
                                taskId: task.id,
                                approvalRequired:
                                    task.approvalRequired
                            }
                        });

                        const missionId =
                            mission?.id ||
                            mission?.mission?.id ||
                            null;

                        task.missionId = missionId;

                        results.push({
                            success: true,
                            taskId: task.id,
                            missionId,
                            mission
                        });
                    } catch (error) {
                        results.push({
                            success: false,
                            taskId: task.id,
                            error: error.message
                        });
                    }
                });
            });

            plan.updatedAt =
                new Date().toISOString();
            this.persistIfEnabled();

            return {
                success:
                    results.some(
                        (result) => result.success
                    ),
                results
            };
        },

        recalculatePlan(plan) {
            const tasks =
                plan.phases.flatMap(
                    (phase) => phase.tasks
                );

            const totalTasks = tasks.length;
            const completedTasks =
                tasks.filter(
                    (task) =>
                        task.status ===
                        TASK_STATUSES.COMPLETE
                ).length;
            const blockedTasks =
                tasks.filter(
                    (task) =>
                        task.status ===
                        TASK_STATUSES.BLOCKED
                ).length;
            const activeTasks =
                tasks.filter(
                    (task) =>
                        task.status ===
                        TASK_STATUSES.IN_PROGRESS
                ).length;
            const approvalTasks =
                tasks.filter(
                    (task) =>
                        task.status ===
                        TASK_STATUSES.AWAITING_APPROVAL
                ).length;

            plan.metrics = {
                totalTasks,
                completedTasks,
                blockedTasks,
                activeTasks,
                awaitingApprovalTasks:
                    approvalTasks,
                percentComplete:
                    totalTasks === 0
                        ? 0
                        : Math.round(
                            completedTasks /
                            totalTasks *
                            100
                        ),
                phaseCount:
                    plan.phases.length,
                completedPhaseCount:
                    plan.phases.filter(
                        (phase) =>
                            phase.status ===
                            TASK_STATUSES.COMPLETE
                    ).length,
                openRiskCount:
                    plan.risks.filter(
                        (risk) =>
                            ![
                                "closed",
                                "mitigated"
                            ].includes(risk.status)
                    ).length,
                pendingApprovalCount:
                    plan.approvals.filter(
                        (approval) =>
                            approval.status === "pending"
                    ).length
            };

            if (
                totalTasks > 0 &&
                completedTasks === totalTasks
            ) {
                plan.status =
                    PLAN_STATUSES.COMPLETE;
                plan.completedAt =
                    plan.completedAt ||
                    new Date().toISOString();
            }

            plan.updatedAt =
                new Date().toISOString();

            return plan.metrics;
        },

        estimatePlanDurationDays(phases) {
            return Math.max(
                1,
                phases.reduce(
                    (total, phase) =>
                        total +
                        (
                            Number(
                                phase.durationDays
                            ) ||
                            this.configuration
                                .defaultTaskDurationDays
                        ),
                    0
                )
            );
        },

        getPlanById(planId) {
            return (
                this.plans.find(
                    (plan) => plan.id === planId
                ) || null
            );
        },

        findTask(plan, taskId) {
            for (const phase of plan.phases) {
                const task = phase.tasks.find(
                    (candidate) =>
                        candidate.id === taskId
                );

                if (task) {
                    return task;
                }
            }

            return null;
        },

        searchPlans(query = "", filters = {}) {
            const normalizedQuery =
                this.normalizeText(query);

            return this.plans
                .filter((plan) => {
                    if (
                        filters.status &&
                        plan.status !== filters.status
                    ) {
                        return false;
                    }

                    if (
                        filters.office &&
                        !plan.offices.includes(
                            filters.office
                        )
                    ) {
                        return false;
                    }

                    if (
                        filters.priority &&
                        plan.priority !==
                            this.normalizePriority(
                                filters.priority
                            )
                    ) {
                        return false;
                    }

                    if (!normalizedQuery) {
                        return true;
                    }

                    const searchable =
                        this.normalizeText(
                            [
                                plan.title,
                                plan.objective,
                                plan.description,
                                plan.strategy,
                                ...plan.tags,
                                ...plan.topics,
                                ...plan.offices,
                                ...plan.phases.flatMap(
                                    (phase) => [
                                        phase.title,
                                        phase.objective,
                                        ...phase.tasks.map(
                                            (task) =>
                                                task.title
                                        )
                                    ]
                                )
                            ].join(" ")
                        );

                    return searchable.includes(
                        normalizedQuery
                    );
                })
                .map((plan) => this.clone(plan));
        },

        archivePlan(planId, options = {}) {
            const plan = this.getPlanById(planId);

            if (!plan) {
                return {
                    success: false,
                    error: "Plan was not found."
                };
            }

            plan.status =
                PLAN_STATUSES.ARCHIVED;
            plan.archivedAt =
                new Date().toISOString();
            plan.archivedBy =
                options.actor ||
                "Executive";
            plan.archiveReason =
                options.reason ||
                "";
            plan.updatedAt =
                plan.archivedAt;

            this.recalculateAnalytics();
            this.persistIfEnabled();

            return {
                success: true,
                plan: this.clone(plan)
            };
        },

        registerSystemKnowledge() {
            const engine = global.KnowledgeEngine;

            if (
                !engine ||
                typeof engine.createRecord !==
                    "function"
            ) {
                return {
                    success: false,
                    connected: false
                };
            }

            const id =
                "knowledge-system-executive-planning";
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
                title:
                    "MEOS Executive Planning Engine",
                summary:
                    "Universal controlled executive planning with phases, tasks, owners, dependencies, risks, milestones, readiness checks, and approval gates.",
                content:
                    "Executive Planning converts approved intent and institutional reasoning into structured execution plans. It never autonomously approves executive intent. When approvedWork is proven effective by Durable Maddy Autonomy Authority, an already human-approved plan may become one deduplicated governed internal workflow without a second approval ceremony. Planning never grants spending, signature, certification, submission, legal commitment, or external-action authority.",
                tags: [
                    "meos-core",
                    "executive-planning",
                    "system-component"
                ],
                topics: [
                    "planning",
                    "execution",
                    "dependencies",
                    "milestones",
                    "approvals",
                    "readiness"
                ],
                authority: "system",
                confidence: 1,
                sensitivity: "internal",
                officeAccess: ["all"],
                metadata: {
                    componentVersion: this.version,
                    organizationNeutralCore: true,
                    brickBoundary:
                        "No autonomous executive approval. Approved-plan continuation requires central approvedWork authority; no autonomous spend, signature, certification, submission, legal commitment, or external action."
                },
                createdBy: this.name
            });
        },

        runReasoning(question, options = {}) {
            const engine =
                global.InstitutionalReasoning;

            if (
                !engine ||
                typeof engine.analyze !== "function"
            ) {
                return {
                    success: false,
                    error:
                        "Institutional Reasoning Engine is unavailable."
                };
            }

            try {
                return engine.analyze(
                    question,
                    options
                );
            } catch (error) {
                console.warn(
                    "[MEOS Executive Planning] Institutional reasoning failed:",
                    error
                );

                return {
                    success: false,
                    error: error.message
                };
            }
        },

        recalculateAnalytics() {
            this.analytics.activePlanCount =
                this.plans.filter(
                    (plan) =>
                        plan.status ===
                        PLAN_STATUSES.ACTIVE
                ).length;
            this.analytics.approvedPlanCount =
                this.plans.filter(
                    (plan) =>
                        plan.status ===
                        PLAN_STATUSES.APPROVED
                ).length;
            this.analytics.completedPlanCount =
                this.plans.filter(
                    (plan) =>
                        plan.status ===
                        PLAN_STATUSES.COMPLETE
                ).length;
            this.analytics.blockedTaskCount =
                this.plans.reduce(
                    (total, plan) =>
                        total +
                        plan.phases.reduce(
                            (phaseTotal, phase) =>
                                phaseTotal +
                                phase.tasks.filter(
                                    (task) =>
                                        task.status ===
                                        TASK_STATUSES.BLOCKED
                                ).length,
                            0
                        ),
                    0
                );

            return this.analytics;
        },

        getConnectedSources() {
            return {
                institutionalReasoning:
                    Boolean(global.InstitutionalReasoning),
                executiveRecall:
                    Boolean(global.ExecutiveRecall),
                executiveSearch:
                    Boolean(global.ExecutiveSearch),
                knowledgeEngine:
                    Boolean(global.KnowledgeEngine),
                missionEngine:
                    Boolean(global.MEOSMissionEngine),
                missionDispatcher:
                    Boolean(global.MEOSMissionDispatcher),
                executiveWorkflow:
                    Boolean(global.ExecutiveWorkflow),
                maddyAutonomy:
                    Boolean(
                        global.MaddyAutonomy ||
                        global.MEOSAutonomyAuthority
                    )
            };
        },

        getStatus() {
            this.recalculateAnalytics();
            const connected =
                this.getConnectedSources();

            return {
                name: this.name,
                version: this.version,
                commission: this.commission,
                buildId: this.buildId,
                status: this.status,
                operatingMode: this.operatingMode,
                organizationNeutralCore:
                    this.configuration.organizationNeutralCore,
                connectedSources: connected,
                connectedSourceCount:
                    Object.values(connected)
                        .filter(Boolean).length,
                planCount:
                    this.plans.length,
                analytics:
                    this.clone(this.analytics),
                autonomy: {
                    approvedWork:
                        this.autonomyCapabilityStatus(
                            AUTONOMY_CAPABILITIES.APPROVED_WORK
                        ),
                    browserAuthority: false,
                    legacyConfigurationCreatesAuthority: false,
                    planApprovalInheritance: true
                },
                persistence: {
                    authority:
                        this.configuration.persistenceAuthority,
                    browserRole:
                        this.configuration.browserPersistenceRole,
                    configured:
                        this.configuration.persistenceEnabled &&
                        this.configuration.automaticPersistence,
                    suspended:
                        this.persistenceRuntime.suspended,
                    reason:
                        this.persistenceRuntime.reason,
                    suspendedAt:
                        this.persistenceRuntime.suspendedAt,
                    lastSuccessfulPersistAt:
                        this.persistenceRuntime.lastSuccessfulPersistAt,
                    lastFailureAt:
                        this.persistenceRuntime.lastFailureAt,
                    retryCount:
                        this.persistenceRuntime.retryCount
                },
                initializedAt:
                    this.initializedAt
            };
        },

        exportPlanning(options = {}) {
            return {
                success: true,
                data: {
                    schema: SCHEMA,
                    version: this.version,
                    exportedAt:
                        new Date().toISOString(),
                    configuration:
                        options.includeConfiguration === false
                            ? {}
                            : this.configuration,
                    plans:
                        this.plans,
                    planningHistory:
                        options.includeHistory === false
                            ? []
                            : this.planningHistory,
                    analytics:
                        this.analytics
                }
            };
        },

        importPlanning(payload, options = {}) {
            let data = payload;

            if (typeof payload === "string") {
                try {
                    data = JSON.parse(payload);
                } catch (error) {
                    return {
                        success: false,
                        error:
                            "The Executive Planning import is not valid JSON."
                    };
                }
            }

            if (!data || data.schema !== SCHEMA) {
                return {
                    success: false,
                    error:
                        "The import is not a MEOS Executive Planning package."
                };
            }

            if (options.replace === true) {
                this.plans = [];
                this.planningHistory = [];
            }

            this.mergeById(
                this.plans,
                data.plans || []
            );
            this.mergeById(
                this.planningHistory,
                data.planningHistory || []
            );

            if (data.analytics) {
                this.analytics = {
                    ...this.analytics,
                    ...data.analytics
                };
            }

            this.plans.forEach((plan) =>
                this.recalculatePlan(plan)
            );
            this.recalculateAnalytics();

            if (options.persist !== false) {
                this.persistIfEnabled();
            }

            return {
                success: true,
                status: this.getStatus()
            };
        },

        persistIfEnabled() {
            if (this.persistenceRuntime.suspended) {
                return {
                    success: true,
                    persisted: false,
                    suspended: true,
                    degraded: true,
                    reason: this.persistenceRuntime.reason
                };
            }

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

        isStorageQuotaError(error) {
            return Boolean(
                error &&
                (
                    error.name === "QuotaExceededError" ||
                    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
                    error.code === 22 ||
                    error.code === 1014 ||
                    /quota/i.test(String(error.message || ""))
                )
            );
        },

        suspendBrowserPersistence(error) {
            const now = new Date().toISOString();

            this.persistenceRuntime.suspended = true;
            this.persistenceRuntime.reason =
                "browser-storage-quota-exhausted";
            this.persistenceRuntime.suspendedAt =
                this.persistenceRuntime.suspendedAt || now;
            this.persistenceRuntime.lastFailureAt = now;

            if (!this.persistenceRuntime.warningEmitted) {
                this.persistenceRuntime.warningEmitted = true;
                console.warn(
                    "[MEOS Executive Planning] Browser planning continuity-cache persistence suspended after storage quota exhaustion. Planning remains operational; durable cognition plus Hallway/Mission execution state remain authoritative, and repeated local writes are suppressed until persistence is explicitly retried."
                );
            }

            this.emit("planning:persistence-suspended", {
                reason: this.persistenceRuntime.reason,
                suspendedAt: this.persistenceRuntime.suspendedAt,
                authority: this.configuration.persistenceAuthority,
                browserRole: this.configuration.browserPersistenceRole,
                error: error?.message || String(error || "")
            });

            return {
                success: true,
                persisted: false,
                suspended: true,
                degraded: true,
                reason: this.persistenceRuntime.reason,
                authority: this.configuration.persistenceAuthority
            };
        },

        retryPersistence() {
            this.persistenceRuntime.suspended = false;
            this.persistenceRuntime.reason = null;
            this.persistenceRuntime.suspendedAt = null;
            this.persistenceRuntime.warningEmitted = false;
            this.persistenceRuntime.retryCount += 1;

            const result = this.persist();

            return {
                ...result,
                retried: true,
                retryCount: this.persistenceRuntime.retryCount
            };
        },

        persist() {
            if (this.persistenceRuntime.suspended) {
                return {
                    success: true,
                    persisted: false,
                    suspended: true,
                    degraded: true,
                    reason: this.persistenceRuntime.reason
                };
            }

            if (!this.configuration.persistenceEnabled) {
                return {
                    success: false,
                    error:
                        "Executive Planning persistence is disabled."
                };
            }

            if (!global.localStorage) {
                return {
                    success: false,
                    persisted: false,
                    degraded: true,
                    error:
                        "Browser local storage is unavailable."
                };
            }

            try {
                global.localStorage.setItem(
                    this.configuration.localStorageKey,
                    JSON.stringify(
                        this.exportPlanning({
                            includeHistory: true
                        }).data
                    )
                );

                this.persistenceRuntime.lastSuccessfulPersistAt =
                    new Date().toISOString();

                return {
                    success: true,
                    persisted: true,
                    authority: this.configuration.persistenceAuthority,
                    browserRole: this.configuration.browserPersistenceRole
                };
            } catch (error) {
                this.persistenceRuntime.lastFailureAt =
                    new Date().toISOString();

                if (this.isStorageQuotaError(error)) {
                    return this.suspendBrowserPersistence(error);
                }

                console.error(
                    "[MEOS Executive Planning] Persistence failed:",
                    error
                );

                return {
                    success: false,
                    persisted: false,
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

            const stored =
                global.localStorage.getItem(
                    this.configuration.localStorageKey
                );

            if (!stored) {
                return {
                    success: true,
                    restored: false
                };
            }

            try {
                const result = this.importPlanning(
                    JSON.parse(stored),
                    {
                        replace: true,
                        persist: false
                    }
                );

                return {
                    ...result,
                    restored: result.success
                };
            } catch (error) {
                console.warn(
                    "[MEOS Executive Planning] Stored state could not be restored:",
                    error
                );

                return {
                    success: false,
                    restored: false,
                    error: error.message
                };
            }
        },

        runPersistenceAuthorityAcceptanceTest() {
            const originalRuntime =
                this.clone(this.persistenceRuntime);

            const syntheticQuotaError = {
                name: "QuotaExceededError",
                message:
                    "Synthetic acceptance quota exhaustion."
            };

            this.persistenceRuntime = {
                suspended: false,
                reason: null,
                suspendedAt: null,
                lastSuccessfulPersistAt: null,
                lastFailureAt: null,
                warningEmitted: true,
                retryCount: 0
            };

            const suspension =
                this.suspendBrowserPersistence(
                    syntheticQuotaError
                );

            const suppressed =
                this.persistIfEnabled();

            const checks = [
                {
                    name:
                        "Executive Planning declares durable cognition plus Hallway/Mission execution state as authority",
                    passed:
                        this.configuration.persistenceAuthority ===
                        "durable-cognition-plus-hallway-mission-execution-state"
                },
                {
                    name:
                        "Browser persistence is explicitly a best-effort planning continuity cache",
                    passed:
                        this.configuration.browserPersistenceRole ===
                        "best-effort-planning-continuity-cache"
                },
                {
                    name:
                        "Quota exhaustion trips a fail-visible browser persistence circuit breaker",
                    passed:
                        suspension?.suspended === true &&
                        this.persistenceRuntime.suspended === true &&
                        this.persistenceRuntime.reason ===
                        "browser-storage-quota-exhausted"
                },
                {
                    name:
                        "Repeated planning-cache writes are suppressed after the first quota failure",
                    passed:
                        suppressed?.suspended === true &&
                        suppressed?.persisted === false
                },
                {
                    name:
                        "Executive Planning remains online while its browser continuity cache is suspended",
                    passed:
                        this.status === "online"
                },
                {
                    name:
                        "Plans and planning history remain available in active memory when browser persistence degrades",
                    passed:
                        Array.isArray(this.plans) &&
                        Array.isArray(this.planningHistory)
                },
                {
                    name:
                        "Persistence degradation does not grant approval, dispatch, spending, or external execution authority",
                    passed:
                        this.configuration.requireExecutiveApproval === true &&
                        this.configuration.autoCreateMissionDrafts === false &&
                        this.configuration.autoDispatchApprovedPlans === false
                }
            ];

            this.persistenceRuntime = originalRuntime;

            const passed =
                checks.every((check) => check.passed);

            console.table(
                checks.map((check) => ({
                    name: check.name,
                    passed: check.passed
                }))
            );

            console.info(
                `[MEOS ${this.version}] Commission 006.017D4H2C Executive Planning persistence authority convergence: ${passed ? "PASS" : "FAIL"}.`
            );

            return {
                commission: "006.017D4H2C",
                version: this.version,
                buildId: this.buildId,
                passed,
                checks,
                status: this.getStatus()
            };
        },

        buildPersistenceSnapshot(options = {}) {
            return {
                schema: STATE_SCHEMA,
                version: this.version,
                commission: this.commission,
                buildId: this.buildId,
                capturedAt: new Date().toISOString(),
                plans: this.clone(this.plans),
                planningHistory:
                    options.includeHistory === false
                        ? []
                        : this.clone(this.planningHistory),
                analytics: this.clone(this.analytics),
                authority: {
                    browserAuthority: false,
                    autonomyPolicyStoredHere: false,
                    automaticSpendAuthorized: false,
                    externalActionAuthorized: false,
                    signatureAuthorized: false,
                    certificationAuthorized: false,
                    submissionAuthorized: false,
                    legalCommitmentAuthorized: false
                }
            };
        },

        applyPersistenceSnapshot(snapshot, options = {}) {
            if (
                !snapshot ||
                snapshot.schema !== STATE_SCHEMA
            ) {
                return {
                    success: false,
                    restored: false,
                    error:
                        "Executive Planning persistence snapshot schema is invalid."
                };
            }

            const result = this.importPlanning(
                {
                    schema: SCHEMA,
                    version: snapshot.version || this.version,
                    plans:
                        Array.isArray(snapshot.plans)
                            ? snapshot.plans
                            : [],
                    planningHistory:
                        Array.isArray(snapshot.planningHistory)
                            ? snapshot.planningHistory
                            : [],
                    analytics:
                        snapshot.analytics || {}
                },
                {
                    replace: options.replace !== false,
                    persist: false
                }
            );

            return {
                ...result,
                restored: result.success === true,
                authorityImported: false,
                browserAuthority: false
            };
        },

        runAutonomyAcceptanceTest() {
            const checks = [];
            const check = (name, passed, details = null) => {
                checks.push({
                    name,
                    passed: passed === true,
                    details
                });
            };

            const originalPlans = this.clone(this.plans);
            const originalHistory = this.clone(this.planningHistory);
            const originalAnalytics = this.clone(this.analytics);
            const originalConfiguration = {
                ...this.configuration
            };
            const originalAuthority = global.MaddyAutonomy;
            const originalAliasAuthority =
                global.MEOSAutonomyAuthority;
            const originalWorkflow = global.ExecutiveWorkflow;
            const originalMission = global.MEOSMissionEngine;
            let authorityEnabled = false;
            let missionCreates = 0;
            let workflowCreates = 0;
            const testWorkflows = [];

            const fakeAuthority = {
                isAuthorized: (capabilityId) =>
                    capabilityId ===
                        AUTONOMY_CAPABILITIES.APPROVED_WORK &&
                    authorityEnabled,
                capabilityStatus: (capabilityId) => ({
                    id: capabilityId,
                    effective:
                        capabilityId ===
                            AUTONOMY_CAPABILITIES.APPROVED_WORK &&
                        authorityEnabled,
                    uiState:
                        authorityEnabled ? "ON" : "OFF",
                    reason:
                        authorityEnabled
                            ? "effective"
                            : "not-authorized"
                }),
                getSnapshot: () => ({
                    policy: {
                        revision: 42,
                        masterEnabled: authorityEnabled
                    }
                }),
                on: () => () => {}
            };

            const fakeWorkflow = {
                getAutonomyIntegrationStatus: () => ({
                    ready: true,
                    browserAuthority: false
                }),
                searchWorkflows: (_query, filters = {}) =>
                    testWorkflows
                        .filter(
                            (workflow) =>
                                !filters.sourcePlanId ||
                                workflow.sourcePlanId ===
                                    filters.sourcePlanId
                        )
                        .map((workflow) =>
                            JSON.parse(JSON.stringify(workflow))
                        ),
                getWorkflowById: (workflowId) =>
                    testWorkflows.find(
                        (workflow) => workflow.id === workflowId
                    ) || null,
                createFromPlan: (plan) => {
                    workflowCreates += 1;
                    const workflow = {
                        id: `workflow-test-${workflowCreates}`,
                        sourcePlanId: plan.id,
                        status: "draft",
                        steps: []
                    };
                    testWorkflows.push(workflow);
                    return {
                        success: true,
                        workflow:
                            JSON.parse(JSON.stringify(workflow))
                    };
                },
                approveWorkflow: (workflowId) => {
                    const workflow =
                        testWorkflows.find(
                            (item) => item.id === workflowId
                        );
                    workflow.status =
                        authorityEnabled
                            ? "active"
                            : "ready";
                    return {
                        success: true,
                        workflow:
                            JSON.parse(JSON.stringify(workflow))
                    };
                }
            };

            global.MaddyAutonomy = fakeAuthority;
            global.MEOSAutonomyAuthority = fakeAuthority;
            global.ExecutiveWorkflow = fakeWorkflow;
            global.MEOSMissionEngine = {
                createMission: () => {
                    missionCreates += 1;
                    return {
                        id: `mission-test-${missionCreates}`
                    };
                }
            };

            this.plans = [];
            this.planningHistory = [];
            // Acceptance must not contaminate the browser continuity cache.
            this.configuration.automaticPersistence = false;
            this.configuration.autoCreateMissionDrafts = true;
            this.configuration.autoDispatchApprovedPlans = true;

            const offPlan = this.createPlan(
                {
                    title: "Authority off test plan",
                    objective: "Prove approval does not self-execute while autonomy is off.",
                    phases: [
                        {
                            title: "Phase",
                            objective: "Test",
                            tasks: [
                                {
                                    title: "Task",
                                    description: "Test task",
                                    office: "Maddy"
                                }
                            ]
                        }
                    ]
                },
                { skipReasoning: true }
            );

            check(
                "Legacy planning flags cannot create mission drafts",
                missionCreates === 0,
                { missionCreates }
            );

            const offApproval = this.approvePlan(
                offPlan.plan.id,
                {
                    actor: "Executive",
                    overrideReadiness: true
                }
            );

            check(
                "Human plan approval does not continue autonomously while Approved Work is OFF",
                offApproval.success === true &&
                    workflowCreates === 0 &&
                    this.getPlanById(offPlan.plan.id)?.status ===
                        PLAN_STATUSES.APPROVED,
                {
                    workflowCreates,
                    planStatus:
                        this.getPlanById(offPlan.plan.id)?.status
                }
            );

            authorityEnabled = true;
            const resumed =
                this.continueApprovedPlansAutonomously({
                    reason: "acceptance-test"
                });
            const linkedPlan =
                this.getPlanById(offPlan.plan.id);

            check(
                "Turning Approved Work ON converts already-approved plan into governed work",
                resumed.results?.[0]?.success === true &&
                    workflowCreates === 1 &&
                    linkedPlan?.executionWorkflowId ===
                        "workflow-test-1" &&
                    linkedPlan?.status === PLAN_STATUSES.ACTIVE,
                resumed
            );

            const duplicateRun = this.continueApprovedPlan(
                linkedPlan.id,
                {
                    autonomous: true,
                    authorityReceipt:
                        this.captureAutonomyReceipt(
                            AUTONOMY_CAPABILITIES.APPROVED_WORK
                        )
                }
            );

            check(
                "Repeated continuation reuses one source-plan workflow instead of duplicating work",
                duplicateRun.success === true &&
                    duplicateRun.duplicate === true &&
                    workflowCreates === 1,
                {
                    duplicateRun,
                    workflowCreates
                }
            );

            authorityEnabled = false;
            const blocked = this.continueApprovedPlan(
                linkedPlan.id,
                { autonomous: true }
            );
            check(
                "Authority loss immediately blocks further autonomous planning continuation",
                blocked.blocked === true &&
                    blocked.reason ===
                        "approved-work-autonomy-not-authorized",
                blocked
            );

            check(
                "Planning integration never grants spending or consequential external authority",
                this.getAutonomyIntegrationStatus(
                    AUTONOMY_CAPABILITIES.APPROVED_WORK
                ).automaticSpendAuthorized === false &&
                    this.getAutonomyIntegrationStatus(
                        AUTONOMY_CAPABILITIES.APPROVED_WORK
                    ).externalActionAuthorized === false &&
                    this.getAutonomyIntegrationStatus(
                        AUTONOMY_CAPABILITIES.APPROVED_WORK
                    ).signatureAuthorized === false &&
                    this.getAutonomyIntegrationStatus(
                        AUTONOMY_CAPABILITIES.APPROVED_WORK
                    ).submissionAuthorized === false
            );

            const snapshot = this.buildPersistenceSnapshot();
            check(
                "Planning persistence snapshot stores operational state but no autonomy policy",
                snapshot.schema === STATE_SCHEMA &&
                    snapshot.authority?.autonomyPolicyStoredHere ===
                        false &&
                    snapshot.authority?.browserAuthority === false
            );

            check(
                "Legacy automatic planning configuration remains OFF by product default",
                originalConfiguration.autoCreateMissionDrafts === false &&
                    originalConfiguration.autoDispatchApprovedPlans === false
            );

            this.plans = originalPlans;
            this.planningHistory = originalHistory;
            this.analytics = originalAnalytics;
            this.configuration = originalConfiguration;
            global.MaddyAutonomy = originalAuthority;
            global.MEOSAutonomyAuthority =
                originalAliasAuthority;
            global.ExecutiveWorkflow = originalWorkflow;
            global.MEOSMissionEngine = originalMission;
            this.recalculateAnalytics();

            const failed = checks.filter(
                (item) => !item.passed
            );
            const passed = failed.length === 0;

            console.table(
                checks.map((item) => ({
                    name: item.name,
                    passed: item.passed
                }))
            );
            console.info(
                `[MEOS ${this.version}] Commission ${this.commission} governed plan-to-work autonomy acceptance: ${passed ? "PASS" : "FAIL"}.`
            );

            return {
                schema:
                    "meos.executive-planning.autonomy-acceptance.v1",
                commission: this.commission,
                version: this.version,
                buildId: this.buildId,
                passed,
                checks,
                failed,
                status: this.getStatus()
            };
        },

        clear(options = {}) {
            if (options.confirm !== true) {
                return {
                    success: false,
                    error:
                        "Clearing Executive Planning data requires { confirm: true }."
                };
            }

            this.plans = [];
            this.planningHistory = [];
            this.analytics = {
                totalPlansCreated: 0,
                approvedPlanCount: 0,
                activePlanCount: 0,
                completedPlanCount: 0,
                blockedTaskCount: 0,
                lastPlanCreatedAt: null
            };

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

        logHistory(action, details = {}) {
            const entry = {
                id: this.createId("planning-history"),
                action,
                timestamp:
                    new Date().toISOString(),
                details
            };

            this.planningHistory.unshift(entry);

            if (
                this.planningHistory.length >
                this.configuration.maximumHistory
            ) {
                this.planningHistory.length =
                    this.configuration.maximumHistory;
            }

            this.emit("planning:history", this.clone(entry));
            return entry;
        },

        normalizePriority(value) {
            if (
                typeof value === "string"
            ) {
                const key =
                    value.toUpperCase();

                if (PRIORITIES[key] !== undefined) {
                    return PRIORITIES[key];
                }
            }

            const number = Number(value);

            if (!Number.isFinite(number)) {
                return this.configuration.defaultPriority;
            }

            return Math.max(
                0,
                Math.min(100, Math.round(number))
            );
        },

        normalizeDate(value) {
            if (!value) {
                return null;
            }

            const date =
                value instanceof Date
                    ? value
                    : new Date(value);

            return Number.isNaN(date.getTime())
                ? null
                : date.toISOString();
        },

        addDays(value, days) {
            const date =
                value instanceof Date
                    ? new Date(value)
                    : new Date(value);

            date.setUTCDate(
                date.getUTCDate() +
                Number(days || 0)
            );

            return date.toISOString();
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

        deduplicateObjects(items, keyFn) {
            const map = new Map();

            items.forEach((item) => {
                const key = keyFn(item);

                if (!map.has(key)) {
                    map.set(key, item);
                }
            });

            return Array.from(map.values());
        },

        mergeById(target, incoming) {
            incoming.forEach((item) => {
                if (!item?.id) {
                    return;
                }

                const existingIndex =
                    target.findIndex(
                        (candidate) =>
                            candidate.id === item.id
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
                    (listener) =>
                        listener !== callback
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
                        `[MEOS Executive Planning] Event listener failed for "${eventName}":`,
                        error
                    );
                }
            });
        }
    };

    ExecutivePlanning.PLAN_STATUSES =
        PLAN_STATUSES;
    ExecutivePlanning.TASK_STATUSES =
        TASK_STATUSES;
    ExecutivePlanning.PRIORITIES =
        PRIORITIES;
    ExecutivePlanning.AUTONOMY_CAPABILITIES =
        AUTONOMY_CAPABILITIES;
    ExecutivePlanning.STATE_SCHEMA =
        STATE_SCHEMA;

    global.ExecutivePlanning =
        ExecutivePlanning;
    ExecutivePlanning.initialize();
})(window);
