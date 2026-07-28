/*
 * MEOS Executive Workflow Engine
 * Version: 1.0.0
 *
 * Mission:
 * Turn approved executive plans into controlled, trackable workflows that move
 * through tasks, approvals, dependencies, escalations, and office handoffs.
 *
 * Brick boundary:
 * This engine manages workflow state. It does not autonomously approve decisions,
 * spend money, contact external parties, or bypass executive authority.
 */

(function initializeExecutiveWorkflow(global) {
    "use strict";

    const STORAGE_KEY = "meos.executive-workflow.v1";
    const SCHEMA = "meos.executive-workflow.package.v1";

    const WORKFLOW_STATUSES = {
        DRAFT: "draft",
        AWAITING_APPROVAL: "awaiting-approval",
        READY: "ready",
        ACTIVE: "active",
        PAUSED: "paused",
        BLOCKED: "blocked",
        COMPLETE: "complete",
        CANCELLED: "cancelled",
        ARCHIVED: "archived"
    };

    const STEP_STATUSES = {
        NOT_STARTED: "not-started",
        READY: "ready",
        ACTIVE: "active",
        BLOCKED: "blocked",
        AWAITING_APPROVAL: "awaiting-approval",
        COMPLETE: "complete",
        SKIPPED: "skipped",
        CANCELLED: "cancelled"
    };

    const ESCALATION_LEVELS = {
        NONE: 0,
        NOTICE: 1,
        WARNING: 2,
        HIGH: 3,
        CRITICAL: 4
    };

    const ExecutiveWorkflow = {
        name: "MEOS Executive Workflow Engine",
        version: "1.0.0",
        status: "initializing",
        operatingMode: "controlled-workflow-orchestration",

        configuration: {
            persistenceEnabled: true,
            automaticPersistence: true,
            localStorageKey: STORAGE_KEY,
            organizationNeutralCore: true,
            requireExecutiveApproval: true,
            autoStartApprovedWorkflows: false,
            autoAdvanceReadySteps: true,
            autoCompleteWorkflow: true,
            autoCreateFromApprovedPlans: false,
            autoDispatchReadySteps: false,
            scanIntervalMs: 5000,
            defaultStepDurationDays: 7,
            overdueGraceHours: 24,
            maximumWorkflows: 500,
            maximumStepsPerWorkflow: 1000,
            maximumHistory: 2000,
            maximumEscalations: 500,
            enableEscalations: true,
            enableNotifications: true,
            enableOfficeHandoffs: true
        },

        workflows: [],
        escalations: [],
        notifications: [],
        history: [],
        eventListeners: {},
        scannerId: null,
        initializedAt: null,

        analytics: {
            totalWorkflows: 0,
            activeWorkflows: 0,
            blockedWorkflows: 0,
            completedWorkflows: 0,
            overdueSteps: 0,
            pendingApprovals: 0,
            lastScanAt: null
        },

        initialize(options = {}) {
            this.configuration = {
                ...this.configuration,
                ...(options.configuration || options)
            };

            this.restore();
            this.rebuildDerivedState();
            this.initializedAt = new Date().toISOString();
            this.status = "online";

            this.registerSystemKnowledge();

            if (options.startScanner !== false) {
                this.startScanner();
            }

            console.info(
                `[MEOS] ${this.name} v${this.version} ${this.status}.`
            );

            this.emit("workflow:online", this.getStatus());
            return this.getStatus();
        },

        createWorkflow(input = {}, options = {}) {
            const title = String(
                input.title ||
                input.name ||
                input.objective ||
                ""
            ).trim();

            if (!title) {
                return {
                    success: false,
                    error: "A workflow title is required."
                };
            }

            if (
                this.workflows.length >=
                this.configuration.maximumWorkflows
            ) {
                return {
                    success: false,
                    error: "The workflow limit has been reached."
                };
            }

            const timestamp = new Date().toISOString();
            const workflowId = this.createId("workflow");

            const workflow = {
                id: workflowId,
                title,
                objective: input.objective || title,
                description: input.description || "",
                status:
                    input.status ||
                    WORKFLOW_STATUSES.DRAFT,
                priority: this.normalizePriority(input.priority),
                requestedBy:
                    input.requestedBy ||
                    options.actor ||
                    "Executive",
                executiveOwner:
                    input.executiveOwner ||
                    "Maddy",
                sourcePlanId:
                    input.sourcePlanId ||
                    null,
                sourceMissionId:
                    input.sourceMissionId ||
                    null,
                createdAt: timestamp,
                updatedAt: timestamp,
                approvedAt: null,
                approvedBy: null,
                activatedAt: null,
                pausedAt: null,
                completedAt: null,
                cancelledAt: null,
                startDate:
                    this.normalizeDate(input.startDate) ||
                    timestamp,
                targetDate:
                    this.normalizeDate(input.targetDate),
                steps: [],
                approvals: [],
                dependencies: [],
                blockers: [],
                handoffs: [],
                escalations: [],
                notifications: [],
                tags: this.uniqueStrings(input.tags),
                topics: this.uniqueStrings([
                    ...(input.topics || []),
                    "executive-workflow"
                ]),
                metadata:
                    input.metadata &&
                    typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {},
                metrics: {}
            };

            const stepInputs =
                Array.isArray(input.steps) &&
                input.steps.length > 0
                    ? input.steps
                    : this.deriveSteps(input);

            if (
                stepInputs.length >
                this.configuration.maximumStepsPerWorkflow
            ) {
                return {
                    success: false,
                    error:
                        "The workflow contains too many steps."
                };
            }

            workflow.steps = stepInputs.map(
                (stepInput, index) =>
                    this.createStepRecord(
                        workflow,
                        stepInput,
                        index
                    )
            );

            workflow.dependencies = this.buildWorkflowDependencies(
                workflow,
                input.dependencies || []
            );

            workflow.approvals =
                this.buildWorkflowApprovals(
                    workflow,
                    input
                );

            this.recalculateWorkflow(workflow);
            this.refreshStepReadiness(workflow);

            this.workflows.push(workflow);
            this.recalculateAnalytics();

            this.logHistory("workflow.created", {
                workflowId: workflow.id,
                title: workflow.title,
                stepCount: workflow.steps.length,
                sourcePlanId: workflow.sourcePlanId
            });

            this.persistIfEnabled();
            this.emit("workflow:created", this.clone(workflow));

            return {
                success: true,
                workflow: this.clone(workflow)
            };
        },

        createFromPlan(planOrId, options = {}) {
            const planning = global.ExecutivePlanning;

            if (!planning) {
                return {
                    success: false,
                    error:
                        "Executive Planning Engine is unavailable."
                };
            }

            const plan =
                typeof planOrId === "string"
                    ? planning.getPlanById?.(planOrId)
                    : planOrId;

            if (!plan) {
                return {
                    success: false,
                    error: "The source plan was not found."
                };
            }

            if (
                plan.status !== "approved" &&
                plan.status !== "active" &&
                options.overrideApproval !== true
            ) {
                return {
                    success: false,
                    error:
                        "Only approved or active plans may become workflows."
                };
            }

            const steps = [];
            const taskIdToStepId = new Map();

            plan.phases.forEach((phase) => {
                phase.tasks.forEach((task) => {
                    const stepId =
                        this.createId("workflow-step");

                    taskIdToStepId.set(task.id, stepId);

                    steps.push({
                        id: stepId,
                        title: task.title,
                        description: task.description || "",
                        office: task.office || "Maddy",
                        owner: task.owner || null,
                        priority: task.priority,
                        startDate: task.startDate,
                        targetDate: task.targetDate,
                        approvalRequired:
                            task.approvalRequired === true,
                        sourceTaskId: task.id,
                        sourcePhaseId: phase.id,
                        dependencies:
                            task.dependencies || [],
                        deliverables:
                            task.deliverables || [],
                        metadata: {
                            planId: plan.id,
                            phaseId: phase.id,
                            taskId: task.id,
                            missionId: task.missionId || null
                        }
                    });
                });
            });

            const normalizedSteps = steps.map((step) => ({
                ...step,
                dependencies: step.dependencies
                    .map((taskId) =>
                        taskIdToStepId.get(taskId)
                    )
                    .filter(Boolean)
            }));

            return this.createWorkflow(
                {
                    title: plan.title,
                    objective: plan.objective,
                    description: plan.description,
                    priority: plan.priority,
                    startDate: plan.startDate,
                    targetDate: plan.targetDate,
                    sourcePlanId: plan.id,
                    steps: normalizedSteps,
                    tags: plan.tags,
                    topics: plan.topics,
                    metadata: {
                        ...plan.metadata,
                        createdFromPlan: true
                    }
                },
                options
            );
        },

        deriveSteps(input = {}) {
            return [
                {
                    title: "Confirm workflow scope and authority",
                    office: "Maddy",
                    priority: 80,
                    approvalRequired: true
                },
                {
                    title: "Confirm resources and dependencies",
                    office: "Archie",
                    priority: 70,
                    dependencies: []
                },
                {
                    title:
                        input.objective ||
                        input.title ||
                        "Execute approved work",
                    office:
                        input.primaryOffice ||
                        "Maddy",
                    priority:
                        this.normalizePriority(
                            input.priority
                        ),
                    dependencies: []
                },
                {
                    title:
                        "Verify deliverables and record completion",
                    office: "Maddy",
                    priority: 70,
                    approvalRequired: true,
                    dependencies: []
                }
            ];
        },

        createStepRecord(
            workflow,
            input = {},
            index = 0
        ) {
            const timestamp = new Date().toISOString();
            const stepId =
                input.id ||
                this.createId("workflow-step");

            return {
                id: stepId,
                workflowId: workflow.id,
                order: index + 1,
                title:
                    input.title ||
                    `Step ${index + 1}`,
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
                    STEP_STATUSES.NOT_STARTED,
                priority:
                    this.normalizePriority(input.priority),
                createdAt: timestamp,
                updatedAt: timestamp,
                startDate:
                    this.normalizeDate(input.startDate) ||
                    workflow.startDate,
                targetDate:
                    this.normalizeDate(input.targetDate) ||
                    this.addDays(
                        workflow.startDate,
                        Number(input.durationDays) ||
                        this.configuration
                            .defaultStepDurationDays
                    ),
                startedAt: null,
                completedAt: null,
                pausedAt: null,
                approvedAt: null,
                approvedBy: null,
                approvalRequired:
                    input.approvalRequired === true,
                dependencies:
                    this.uniqueStrings(input.dependencies),
                blockers:
                    this.uniqueStrings(input.blockers),
                deliverables:
                    this.uniqueStrings(input.deliverables),
                evidence: [],
                notes: input.notes || "",
                missionId:
                    input.missionId ||
                    input.metadata?.missionId ||
                    null,
                sourceTaskId:
                    input.sourceTaskId ||
                    null,
                sourcePhaseId:
                    input.sourcePhaseId ||
                    null,
                handoffFromOffice:
                    input.handoffFromOffice ||
                    null,
                handoffToOffice:
                    input.handoffToOffice ||
                    null,
                escalationLevel:
                    ESCALATION_LEVELS.NONE,
                escalationId: null,
                notificationIds: [],
                metadata:
                    input.metadata &&
                    typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}
            };
        },

        buildWorkflowDependencies(
            workflow,
            dependencies = []
        ) {
            return dependencies.map((dependency) => {
                const value =
                    typeof dependency === "string"
                        ? { title: dependency }
                        : dependency || {};

                return {
                    id: this.createId("workflow-dependency"),
                    workflowId: workflow.id,
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
                        this.normalizeDate(
                            value.targetDate
                        ),
                    sourceType:
                        value.sourceType ||
                        null,
                    sourceId:
                        value.sourceId ||
                        null
                };
            });
        },

        buildWorkflowApprovals(
            workflow,
            input = {}
        ) {
            const approvals = [];

            if (this.configuration.requireExecutiveApproval) {
                approvals.push({
                    id: this.createId("workflow-approval"),
                    workflowId: workflow.id,
                    stepId: null,
                    type: "workflow-approval",
                    title: "Executive Workflow Approval",
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

            workflow.steps.forEach((step) => {
                if (step.approvalRequired) {
                    approvals.push({
                        id: this.createId("workflow-approval"),
                        workflowId: workflow.id,
                        stepId: step.id,
                        type: "step-approval",
                        title:
                            `${step.title} approval`,
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

            return approvals;
        },

        approveWorkflow(
            workflowId,
            options = {}
        ) {
            const workflow =
                this.getWorkflowById(workflowId);

            if (!workflow) {
                return {
                    success: false,
                    error: "Workflow was not found."
                };
            }

            const unresolvedCriticalDependencies =
                workflow.dependencies.filter(
                    (dependency) =>
                        dependency.critical &&
                        dependency.status !== "confirmed"
                );

            if (
                unresolvedCriticalDependencies.length > 0 &&
                options.overrideDependencies !== true
            ) {
                return {
                    success: false,
                    error:
                        "Critical workflow dependencies remain unresolved.",
                    dependencies:
                        unresolvedCriticalDependencies
                };
            }

            const timestamp = new Date().toISOString();

            workflow.status = WORKFLOW_STATUSES.READY;
            workflow.approvedAt = timestamp;
            workflow.approvedBy =
                options.actor ||
                "Executive";
            workflow.updatedAt = timestamp;

            const approval =
                workflow.approvals.find(
                    (item) =>
                        item.type === "workflow-approval" &&
                        item.status === "pending"
                );

            if (approval) {
                approval.status = "approved";
                approval.decidedAt = timestamp;
                approval.decidedBy =
                    workflow.approvedBy;
                approval.notes =
                    options.notes || "";
            }

            this.refreshStepReadiness(workflow);

            if (
                this.configuration.autoStartApprovedWorkflows ||
                options.activate === true
            ) {
                return this.activateWorkflow(
                    workflow.id,
                    {
                        actor:
                            workflow.approvedBy
                    }
                );
            }

            this.logHistory("workflow.approved", {
                workflowId,
                approvedBy: workflow.approvedBy
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("workflow:approved", this.clone(workflow));

            return {
                success: true,
                workflow: this.clone(workflow)
            };
        },

        activateWorkflow(
            workflowId,
            options = {}
        ) {
            const workflow =
                this.getWorkflowById(workflowId);

            if (!workflow) {
                return {
                    success: false,
                    error: "Workflow was not found."
                };
            }

            if (
                ![
                    WORKFLOW_STATUSES.READY,
                    WORKFLOW_STATUSES.PAUSED
                ].includes(workflow.status) &&
                options.overrideApproval !== true
            ) {
                return {
                    success: false,
                    error:
                        "Only ready or paused workflows may be activated."
                };
            }

            const timestamp = new Date().toISOString();

            workflow.status = WORKFLOW_STATUSES.ACTIVE;
            workflow.activatedAt =
                workflow.activatedAt ||
                timestamp;
            workflow.pausedAt = null;
            workflow.updatedAt = timestamp;

            this.refreshStepReadiness(workflow);
            this.advanceWorkflow(workflow.id, {
                actor:
                    options.actor ||
                    "Executive Workflow Engine"
            });

            this.logHistory("workflow.activated", {
                workflowId,
                actor:
                    options.actor ||
                    "Executive"
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("workflow:activated", this.clone(workflow));

            return {
                success: true,
                workflow: this.clone(workflow)
            };
        },

        pauseWorkflow(
            workflowId,
            options = {}
        ) {
            const workflow =
                this.getWorkflowById(workflowId);

            if (!workflow) {
                return {
                    success: false,
                    error: "Workflow was not found."
                };
            }

            if (
                workflow.status !==
                WORKFLOW_STATUSES.ACTIVE
            ) {
                return {
                    success: false,
                    error:
                        "Only active workflows may be paused."
                };
            }

            const timestamp = new Date().toISOString();

            workflow.status = WORKFLOW_STATUSES.PAUSED;
            workflow.pausedAt = timestamp;
            workflow.updatedAt = timestamp;
            workflow.pauseReason =
                options.reason ||
                "";

            workflow.steps
                .filter(
                    (step) =>
                        step.status ===
                        STEP_STATUSES.ACTIVE
                )
                .forEach((step) => {
                    step.status =
                        STEP_STATUSES.BLOCKED;
                    step.blockers =
                        this.uniqueStrings([
                            ...step.blockers,
                            "Workflow paused"
                        ]);
                    step.pausedAt = timestamp;
                    step.updatedAt = timestamp;
                });

            this.logHistory("workflow.paused", {
                workflowId,
                reason: workflow.pauseReason
            });

            this.recalculateWorkflow(workflow);
            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("workflow:paused", this.clone(workflow));

            return {
                success: true,
                workflow: this.clone(workflow)
            };
        },

        cancelWorkflow(
            workflowId,
            options = {}
        ) {
            const workflow =
                this.getWorkflowById(workflowId);

            if (!workflow) {
                return {
                    success: false,
                    error: "Workflow was not found."
                };
            }

            const timestamp = new Date().toISOString();

            workflow.status =
                WORKFLOW_STATUSES.CANCELLED;
            workflow.cancelledAt = timestamp;
            workflow.cancelledBy =
                options.actor ||
                "Executive";
            workflow.cancelReason =
                options.reason ||
                "";
            workflow.updatedAt = timestamp;

            workflow.steps.forEach((step) => {
                if (
                    ![
                        STEP_STATUSES.COMPLETE,
                        STEP_STATUSES.SKIPPED
                    ].includes(step.status)
                ) {
                    step.status =
                        STEP_STATUSES.CANCELLED;
                    step.updatedAt = timestamp;
                }
            });

            this.logHistory("workflow.cancelled", {
                workflowId,
                reason: workflow.cancelReason
            });

            this.recalculateWorkflow(workflow);
            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("workflow:cancelled", this.clone(workflow));

            return {
                success: true,
                workflow: this.clone(workflow)
            };
        },

        startStep(
            workflowId,
            stepId,
            options = {}
        ) {
            const workflow =
                this.getWorkflowById(workflowId);
            const step =
                workflow
                    ? this.getStepById(workflow, stepId)
                    : null;

            if (!workflow || !step) {
                return {
                    success: false,
                    error:
                        "Workflow or step was not found."
                };
            }

            if (
                workflow.status !==
                WORKFLOW_STATUSES.ACTIVE
            ) {
                return {
                    success: false,
                    error:
                        "The workflow must be active before a step can start."
                };
            }

            if (
                step.status !==
                STEP_STATUSES.READY &&
                options.overrideReadiness !== true
            ) {
                return {
                    success: false,
                    error:
                        "The step is not ready to start.",
                    step: this.clone(step)
                };
            }

            const timestamp = new Date().toISOString();

            step.status = STEP_STATUSES.ACTIVE;
            step.startedAt =
                step.startedAt ||
                timestamp;
            step.updatedAt = timestamp;
            step.owner =
                options.owner ||
                step.owner;

            if (
                this.configuration.enableOfficeHandoffs &&
                step.handoffFromOffice &&
                step.handoffFromOffice !== step.office
            ) {
                this.recordHandoff(
                    workflow,
                    step,
                    step.handoffFromOffice,
                    step.office
                );
            }

            if (
                this.configuration.autoDispatchReadySteps ||
                options.dispatch === true
            ) {
                this.dispatchStep(workflow, step);
            }

            this.logHistory("step.started", {
                workflowId,
                stepId,
                office: step.office,
                owner: step.owner
            });

            this.recalculateWorkflow(workflow);
            this.persistIfEnabled();
            this.emit("step:started", {
                workflow: this.clone(workflow),
                step: this.clone(step)
            });

            return {
                success: true,
                workflow: this.clone(workflow),
                step: this.clone(step)
            };
        },

        completeStep(
            workflowId,
            stepId,
            options = {}
        ) {
            const workflow =
                this.getWorkflowById(workflowId);
            const step =
                workflow
                    ? this.getStepById(workflow, stepId)
                    : null;

            if (!workflow || !step) {
                return {
                    success: false,
                    error:
                        "Workflow or step was not found."
                };
            }

            if (
                ![
                    STEP_STATUSES.ACTIVE,
                    STEP_STATUSES.READY
                ].includes(step.status) &&
                options.overrideStatus !== true
            ) {
                return {
                    success: false,
                    error:
                        "The step is not active or ready."
                };
            }

            if (
                step.approvalRequired &&
                !step.approvedAt &&
                options.overrideApproval !== true
            ) {
                step.status =
                    STEP_STATUSES.AWAITING_APPROVAL;

                const approval =
                    workflow.approvals.find(
                        (item) =>
                            item.stepId === step.id &&
                            item.status === "pending"
                    );

                if (approval) {
                    approval.requestedAt =
                        new Date().toISOString();
                }

                this.notify(
                    workflow,
                    step,
                    "approval-requested",
                    `${step.title} is awaiting approval.`
                );

                this.recalculateWorkflow(workflow);
                this.persistIfEnabled();

                return {
                    success: true,
                    awaitingApproval: true,
                    workflow: this.clone(workflow),
                    step: this.clone(step)
                };
            }

            const timestamp = new Date().toISOString();

            step.status = STEP_STATUSES.COMPLETE;
            step.completedAt = timestamp;
            step.updatedAt = timestamp;
            step.evidence =
                Array.isArray(options.evidence)
                    ? options.evidence
                    : step.evidence;
            step.notes =
                options.notes ??
                step.notes;

            if (
                step.missionId &&
                global.MEOSMissionEngine
            ) {
                try {
                    global.MEOSMissionEngine
                        .updateMission?.(
                            step.missionId,
                            {
                                status: "complete",
                                completedAt: timestamp
                            }
                        );
                } catch (error) {
                    console.warn(
                        "[MEOS Executive Workflow] Mission update failed:",
                        error
                    );
                }
            }

            this.logHistory("step.completed", {
                workflowId,
                stepId,
                completedBy:
                    options.actor ||
                    "Executive Workflow Engine"
            });

            this.refreshStepReadiness(workflow);
            this.advanceWorkflow(workflowId, options);
            this.persistIfEnabled();

            this.emit("step:completed", {
                workflow: this.clone(workflow),
                step: this.clone(step)
            });

            return {
                success: true,
                workflow: this.clone(workflow),
                step: this.clone(step)
            };
        },

        approveStep(
            workflowId,
            stepId,
            options = {}
        ) {
            const workflow =
                this.getWorkflowById(workflowId);
            const step =
                workflow
                    ? this.getStepById(workflow, stepId)
                    : null;

            if (!workflow || !step) {
                return {
                    success: false,
                    error:
                        "Workflow or step was not found."
                };
            }

            const timestamp = new Date().toISOString();

            step.approvedAt = timestamp;
            step.approvedBy =
                options.actor ||
                "Authorized Executive";

            const approval =
                workflow.approvals.find(
                    (item) =>
                        item.stepId === step.id &&
                        item.status === "pending"
                );

            if (approval) {
                approval.status = "approved";
                approval.decidedAt = timestamp;
                approval.decidedBy =
                    step.approvedBy;
                approval.notes =
                    options.notes || "";
            }

            if (
                step.status ===
                STEP_STATUSES.AWAITING_APPROVAL
            ) {
                step.status =
                    STEP_STATUSES.COMPLETE;
                step.completedAt = timestamp;
            }

            step.updatedAt = timestamp;
            workflow.updatedAt = timestamp;

            this.logHistory("step.approved", {
                workflowId,
                stepId,
                approvedBy: step.approvedBy
            });

            this.refreshStepReadiness(workflow);
            this.advanceWorkflow(workflowId, options);
            this.persistIfEnabled();

            return {
                success: true,
                workflow: this.clone(workflow),
                step: this.clone(step)
            };
        },

        rejectStep(
            workflowId,
            stepId,
            options = {}
        ) {
            const workflow =
                this.getWorkflowById(workflowId);
            const step =
                workflow
                    ? this.getStepById(workflow, stepId)
                    : null;

            if (!workflow || !step) {
                return {
                    success: false,
                    error:
                        "Workflow or step was not found."
                };
            }

            const timestamp = new Date().toISOString();

            const approval =
                workflow.approvals.find(
                    (item) =>
                        item.stepId === step.id &&
                        item.status === "pending"
                );

            if (approval) {
                approval.status = "rejected";
                approval.decidedAt = timestamp;
                approval.decidedBy =
                    options.actor ||
                    "Authorized Executive";
                approval.notes =
                    options.notes ||
                    "";
            }

            step.status = STEP_STATUSES.BLOCKED;
            step.blockers =
                this.uniqueStrings([
                    ...step.blockers,
                    options.reason ||
                    "Approval rejected"
                ]);
            step.updatedAt = timestamp;

            this.escalate(
                workflow,
                step,
                {
                    level: ESCALATION_LEVELS.HIGH,
                    reason:
                        options.reason ||
                        "Step approval was rejected."
                }
            );

            this.recalculateWorkflow(workflow);
            this.persistIfEnabled();

            return {
                success: true,
                workflow: this.clone(workflow),
                step: this.clone(step)
            };
        },

        addBlocker(
            workflowId,
            stepId,
            blocker,
            options = {}
        ) {
            const workflow =
                this.getWorkflowById(workflowId);
            const step =
                workflow
                    ? this.getStepById(workflow, stepId)
                    : null;

            if (!workflow || !step) {
                return {
                    success: false,
                    error:
                        "Workflow or step was not found."
                };
            }

            const text = String(blocker || "").trim();

            if (!text) {
                return {
                    success: false,
                    error: "A blocker description is required."
                };
            }

            step.blockers =
                this.uniqueStrings([
                    ...step.blockers,
                    text
                ]);
            step.status = STEP_STATUSES.BLOCKED;
            step.updatedAt = new Date().toISOString();
            workflow.status =
                WORKFLOW_STATUSES.BLOCKED;
            workflow.updatedAt =
                step.updatedAt;

            if (
                options.escalate !== false
            ) {
                this.escalate(
                    workflow,
                    step,
                    {
                        level:
                            options.level ||
                            ESCALATION_LEVELS.WARNING,
                        reason: text
                    }
                );
            }

            this.logHistory("step.blocked", {
                workflowId,
                stepId,
                blocker: text
            });

            this.recalculateWorkflow(workflow);
            this.persistIfEnabled();

            return {
                success: true,
                workflow: this.clone(workflow),
                step: this.clone(step)
            };
        },

        resolveBlocker(
            workflowId,
            stepId,
            blocker,
            options = {}
        ) {
            const workflow =
                this.getWorkflowById(workflowId);
            const step =
                workflow
                    ? this.getStepById(workflow, stepId)
                    : null;

            if (!workflow || !step) {
                return {
                    success: false,
                    error:
                        "Workflow or step was not found."
                };
            }

            step.blockers =
                step.blockers.filter(
                    (item) => item !== blocker
                );
            step.updatedAt =
                new Date().toISOString();

            if (step.blockers.length === 0) {
                step.status =
                    STEP_STATUSES.NOT_STARTED;
            }

            this.refreshStepReadiness(workflow);

            if (
                workflow.status ===
                WORKFLOW_STATUSES.BLOCKED &&
                !workflow.steps.some(
                    (item) =>
                        item.status ===
                        STEP_STATUSES.BLOCKED
                )
            ) {
                workflow.status =
                    WORKFLOW_STATUSES.ACTIVE;
            }

            this.logHistory("step.blocker-resolved", {
                workflowId,
                stepId,
                blocker,
                actor:
                    options.actor ||
                    "Executive"
            });

            this.recalculateWorkflow(workflow);
            this.persistIfEnabled();

            return {
                success: true,
                workflow: this.clone(workflow),
                step: this.clone(step)
            };
        },

        advanceWorkflow(
            workflowId,
            options = {}
        ) {
            const workflow =
                this.getWorkflowById(workflowId);

            if (!workflow) {
                return {
                    success: false,
                    error: "Workflow was not found."
                };
            }

            this.refreshStepReadiness(workflow);

            if (
                workflow.status !==
                WORKFLOW_STATUSES.ACTIVE
            ) {
                this.recalculateWorkflow(workflow);
                return {
                    success: true,
                    advanced: false,
                    workflow: this.clone(workflow)
                };
            }

            const readySteps =
                workflow.steps.filter(
                    (step) =>
                        step.status ===
                        STEP_STATUSES.READY
                );

            if (
                this.configuration.autoAdvanceReadySteps &&
                options.startReadySteps !== false
            ) {
                readySteps.forEach((step) => {
                    this.startStep(
                        workflow.id,
                        step.id,
                        {
                            actor:
                                options.actor ||
                                this.name,
                            dispatch:
                                this.configuration
                                    .autoDispatchReadySteps
                        }
                    );
                });
            }

            this.recalculateWorkflow(workflow);

            if (
                this.configuration.autoCompleteWorkflow &&
                workflow.metrics.totalSteps > 0 &&
                workflow.metrics.completedSteps ===
                    workflow.metrics.totalSteps
            ) {
                this.completeWorkflow(workflow.id, {
                    actor:
                        options.actor ||
                        this.name
                });
            }

            this.persistIfEnabled();

            return {
                success: true,
                advanced: readySteps.length > 0,
                readyStepCount:
                    readySteps.length,
                workflow: this.clone(workflow)
            };
        },

        completeWorkflow(
            workflowId,
            options = {}
        ) {
            const workflow =
                this.getWorkflowById(workflowId);

            if (!workflow) {
                return {
                    success: false,
                    error: "Workflow was not found."
                };
            }

            const incompleteSteps =
                workflow.steps.filter(
                    (step) =>
                        ![
                            STEP_STATUSES.COMPLETE,
                            STEP_STATUSES.SKIPPED,
                            STEP_STATUSES.CANCELLED
                        ].includes(step.status)
                );

            if (
                incompleteSteps.length > 0 &&
                options.overrideIncomplete !== true
            ) {
                return {
                    success: false,
                    error:
                        "Workflow still has incomplete steps.",
                    incompleteSteps:
                        this.clone(incompleteSteps)
                };
            }

            const timestamp =
                new Date().toISOString();

            workflow.status =
                WORKFLOW_STATUSES.COMPLETE;
            workflow.completedAt = timestamp;
            workflow.completedBy =
                options.actor ||
                "Executive Workflow Engine";
            workflow.updatedAt = timestamp;

            this.logHistory("workflow.completed", {
                workflowId,
                completedBy:
                    workflow.completedBy
            });

            this.recalculateWorkflow(workflow);
            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("workflow:completed", this.clone(workflow));

            return {
                success: true,
                workflow: this.clone(workflow)
            };
        },

        refreshStepReadiness(workflow) {
            const stepMap = new Map(
                workflow.steps.map((step) => [
                    step.id,
                    step
                ])
            );

            workflow.steps.forEach((step) => {
                if (
                    [
                        STEP_STATUSES.ACTIVE,
                        STEP_STATUSES.COMPLETE,
                        STEP_STATUSES.AWAITING_APPROVAL,
                        STEP_STATUSES.SKIPPED,
                        STEP_STATUSES.CANCELLED
                    ].includes(step.status)
                ) {
                    return;
                }

                if (step.blockers.length > 0) {
                    step.status =
                        STEP_STATUSES.BLOCKED;
                    return;
                }

                const dependenciesMet =
                    step.dependencies.every(
                        (dependencyId) => {
                            const dependency =
                                stepMap.get(dependencyId);

                            return (
                                dependency &&
                                [
                                    STEP_STATUSES.COMPLETE,
                                    STEP_STATUSES.SKIPPED
                                ].includes(
                                    dependency.status
                                )
                            );
                        }
                    );

                step.status =
                    dependenciesMet
                        ? STEP_STATUSES.READY
                        : STEP_STATUSES.BLOCKED;
            });

            this.recalculateWorkflow(workflow);
            return workflow;
        },

        dispatchStep(workflow, step) {
            const dispatcher =
                global.MEOSMissionDispatcher;

            if (!dispatcher) {
                return {
                    success: false,
                    connected: false,
                    error:
                        "Mission Dispatcher is unavailable."
                };
            }

            try {
                if (
                    typeof dispatcher.dispatchMission ===
                    "function" &&
                    step.missionId
                ) {
                    return dispatcher.dispatchMission(
                        step.missionId,
                        {
                            office: step.office,
                            workflowId: workflow.id,
                            workflowStepId: step.id
                        }
                    );
                }

                if (
                    typeof dispatcher.routeMission ===
                    "function" &&
                    step.missionId
                ) {
                    return dispatcher.routeMission(
                        step.missionId,
                        step.office
                    );
                }
            } catch (error) {
                console.warn(
                    "[MEOS Executive Workflow] Dispatch failed:",
                    error
                );

                return {
                    success: false,
                    error: error.message
                };
            }

            return {
                success: false,
                connected: true,
                error:
                    "No compatible dispatcher method was found."
            };
        },

        recordHandoff(
            workflow,
            step,
            fromOffice,
            toOffice
        ) {
            const handoff = {
                id: this.createId("workflow-handoff"),
                workflowId: workflow.id,
                stepId: step.id,
                fromOffice,
                toOffice,
                status: "complete",
                handedOffAt:
                    new Date().toISOString()
            };

            workflow.handoffs.push(handoff);

            this.logHistory("step.handoff", {
                workflowId: workflow.id,
                stepId: step.id,
                fromOffice,
                toOffice
            });

            this.emit("workflow:handoff", this.clone(handoff));
            return handoff;
        },

        escalate(
            workflow,
            step,
            input = {}
        ) {
            if (!this.configuration.enableEscalations) {
                return {
                    success: false,
                    error: "Escalations are disabled."
                };
            }

            if (
                this.escalations.length >=
                this.configuration.maximumEscalations
            ) {
                return {
                    success: false,
                    error:
                        "The escalation limit has been reached."
                };
            }

            const level =
                Math.max(
                    ESCALATION_LEVELS.NOTICE,
                    Math.min(
                        ESCALATION_LEVELS.CRITICAL,
                        Number(input.level) ||
                        ESCALATION_LEVELS.WARNING
                    )
                );

            const escalation = {
                id: this.createId("workflow-escalation"),
                workflowId: workflow.id,
                stepId: step?.id || null,
                level,
                reason:
                    input.reason ||
                    "Workflow attention required.",
                status: "open",
                createdAt:
                    new Date().toISOString(),
                resolvedAt: null,
                resolvedBy: null,
                resolution: ""
            };

            this.escalations.push(escalation);
            workflow.escalations.push(escalation.id);

            if (step) {
                step.escalationLevel = level;
                step.escalationId = escalation.id;
            }

            this.notify(
                workflow,
                step,
                "escalation",
                escalation.reason,
                {
                    level
                }
            );

            this.logHistory("workflow.escalated", {
                workflowId: workflow.id,
                stepId: step?.id || null,
                level,
                reason: escalation.reason
            });

            this.persistIfEnabled();
            this.emit("workflow:escalated", this.clone(escalation));

            return {
                success: true,
                escalation: this.clone(escalation)
            };
        },

        resolveEscalation(
            escalationId,
            options = {}
        ) {
            const escalation =
                this.escalations.find(
                    (item) =>
                        item.id === escalationId
                );

            if (!escalation) {
                return {
                    success: false,
                    error: "Escalation was not found."
                };
            }

            escalation.status = "resolved";
            escalation.resolvedAt =
                new Date().toISOString();
            escalation.resolvedBy =
                options.actor ||
                "Executive";
            escalation.resolution =
                options.resolution ||
                "";

            const workflow =
                this.getWorkflowById(
                    escalation.workflowId
                );

            const step =
                workflow && escalation.stepId
                    ? this.getStepById(
                        workflow,
                        escalation.stepId
                    )
                    : null;

            if (step) {
                step.escalationLevel =
                    ESCALATION_LEVELS.NONE;
                step.escalationId = null;
            }

            this.persistIfEnabled();

            return {
                success: true,
                escalation: this.clone(escalation)
            };
        },

        notify(
            workflow,
            step,
            type,
            message,
            metadata = {}
        ) {
            if (!this.configuration.enableNotifications) {
                return {
                    success: false,
                    error: "Notifications are disabled."
                };
            }

            const notification = {
                id: this.createId("workflow-notification"),
                workflowId: workflow.id,
                stepId: step?.id || null,
                type,
                message,
                status: "unread",
                recipient:
                    metadata.recipient ||
                    "Executive",
                office:
                    step?.office ||
                    workflow.executiveOwner,
                createdAt:
                    new Date().toISOString(),
                readAt: null,
                metadata
            };

            this.notifications.push(notification);
            workflow.notifications.push(notification.id);

            if (step) {
                step.notificationIds.push(
                    notification.id
                );
            }

            this.emit(
                "workflow:notification",
                this.clone(notification)
            );

            return {
                success: true,
                notification:
                    this.clone(notification)
            };
        },

        markNotificationRead(notificationId) {
            const notification =
                this.notifications.find(
                    (item) =>
                        item.id === notificationId
                );

            if (!notification) {
                return {
                    success: false,
                    error:
                        "Notification was not found."
                };
            }

            notification.status = "read";
            notification.readAt =
                new Date().toISOString();

            this.persistIfEnabled();

            return {
                success: true,
                notification:
                    this.clone(notification)
            };
        },

        scan() {
            const now = Date.now();
            let overdueCount = 0;
            let blockedCount = 0;

            this.workflows.forEach((workflow) => {
                if (
                    ![
                        WORKFLOW_STATUSES.ACTIVE,
                        WORKFLOW_STATUSES.BLOCKED,
                        WORKFLOW_STATUSES.READY
                    ].includes(workflow.status)
                ) {
                    return;
                }

                this.refreshStepReadiness(workflow);

                workflow.steps.forEach((step) => {
                    if (
                        [
                            STEP_STATUSES.COMPLETE,
                            STEP_STATUSES.SKIPPED,
                            STEP_STATUSES.CANCELLED
                        ].includes(step.status)
                    ) {
                        return;
                    }

                    if (
                        step.status ===
                        STEP_STATUSES.BLOCKED
                    ) {
                        blockedCount += 1;
                    }

                    if (
                        step.targetDate &&
                        now >
                            Date.parse(step.targetDate) +
                            this.configuration
                                .overdueGraceHours *
                            60 *
                            60 *
                            1000
                    ) {
                        overdueCount += 1;

                        if (
                            step.escalationLevel <
                            ESCALATION_LEVELS.WARNING
                        ) {
                            this.escalate(
                                workflow,
                                step,
                                {
                                    level:
                                        ESCALATION_LEVELS.WARNING,
                                    reason:
                                        `Step overdue: ${step.title}`
                                }
                            );
                        }
                    }
                });

                if (
                    workflow.steps.some(
                        (step) =>
                            step.status ===
                            STEP_STATUSES.BLOCKED
                    )
                ) {
                    workflow.status =
                        WORKFLOW_STATUSES.BLOCKED;
                } else if (
                    workflow.status ===
                    WORKFLOW_STATUSES.BLOCKED
                ) {
                    workflow.status =
                        WORKFLOW_STATUSES.ACTIVE;
                }

                this.advanceWorkflow(
                    workflow.id,
                    {
                        startReadySteps: false
                    }
                );
            });

            this.analytics.overdueSteps =
                overdueCount;
            this.analytics.lastScanAt =
                new Date().toISOString();

            this.recalculateAnalytics();
            this.persistIfEnabled();

            this.emit("workflow:scan-complete", {
                overdueCount,
                blockedCount,
                scannedAt:
                    this.analytics.lastScanAt
            });

            return {
                success: true,
                overdueCount,
                blockedCount,
                status: this.getStatus()
            };
        },

        startScanner() {
            if (this.scannerId) {
                return {
                    success: true,
                    alreadyRunning: true
                };
            }

            this.scannerId = global.setInterval(
                () => this.scan(),
                this.configuration.scanIntervalMs
            );

            return {
                success: true,
                intervalMs:
                    this.configuration.scanIntervalMs
            };
        },

        stopScanner() {
            if (!this.scannerId) {
                return {
                    success: true,
                    running: false
                };
            }

            global.clearInterval(this.scannerId);
            this.scannerId = null;

            return {
                success: true,
                running: false
            };
        },

        recalculateWorkflow(workflow) {
            const totalSteps =
                workflow.steps.length;
            const completedSteps =
                workflow.steps.filter(
                    (step) =>
                        [
                            STEP_STATUSES.COMPLETE,
                            STEP_STATUSES.SKIPPED,
                            STEP_STATUSES.CANCELLED
                        ].includes(step.status)
                ).length;
            const activeSteps =
                workflow.steps.filter(
                    (step) =>
                        step.status ===
                        STEP_STATUSES.ACTIVE
                ).length;
            const blockedSteps =
                workflow.steps.filter(
                    (step) =>
                        step.status ===
                        STEP_STATUSES.BLOCKED
                ).length;
            const awaitingApprovalSteps =
                workflow.steps.filter(
                    (step) =>
                        step.status ===
                        STEP_STATUSES.AWAITING_APPROVAL
                ).length;
            const readySteps =
                workflow.steps.filter(
                    (step) =>
                        step.status ===
                        STEP_STATUSES.READY
                ).length;

            workflow.metrics = {
                totalSteps,
                completedSteps,
                activeSteps,
                blockedSteps,
                awaitingApprovalSteps,
                readySteps,
                percentComplete:
                    totalSteps === 0
                        ? 0
                        : Math.round(
                            completedSteps /
                            totalSteps *
                            100
                        ),
                pendingApprovalCount:
                    workflow.approvals.filter(
                        (approval) =>
                            approval.status === "pending"
                    ).length,
                openEscalationCount:
                    workflow.escalations.filter(
                        (escalationId) =>
                            this.escalations.some(
                                (item) =>
                                    item.id ===
                                        escalationId &&
                                    item.status ===
                                        "open"
                            )
                    ).length,
                unreadNotificationCount:
                    workflow.notifications.filter(
                        (notificationId) =>
                            this.notifications.some(
                                (item) =>
                                    item.id ===
                                        notificationId &&
                                    item.status ===
                                        "unread"
                            )
                    ).length
            };

            workflow.updatedAt =
                new Date().toISOString();

            return workflow.metrics;
        },

        rebuildDerivedState() {
            this.workflows.forEach((workflow) => {
                this.recalculateWorkflow(workflow);
                this.refreshStepReadiness(workflow);
            });

            this.recalculateAnalytics();
        },

        recalculateAnalytics() {
            this.analytics.totalWorkflows =
                this.workflows.length;
            this.analytics.activeWorkflows =
                this.workflows.filter(
                    (workflow) =>
                        workflow.status ===
                        WORKFLOW_STATUSES.ACTIVE
                ).length;
            this.analytics.blockedWorkflows =
                this.workflows.filter(
                    (workflow) =>
                        workflow.status ===
                        WORKFLOW_STATUSES.BLOCKED
                ).length;
            this.analytics.completedWorkflows =
                this.workflows.filter(
                    (workflow) =>
                        workflow.status ===
                        WORKFLOW_STATUSES.COMPLETE
                ).length;
            this.analytics.pendingApprovals =
                this.workflows.reduce(
                    (total, workflow) =>
                        total +
                        workflow.approvals.filter(
                            (approval) =>
                                approval.status === "pending"
                        ).length,
                    0
                );

            return this.analytics;
        },

        getWorkflowById(workflowId) {
            return (
                this.workflows.find(
                    (workflow) =>
                        workflow.id === workflowId
                ) || null
            );
        },

        getStepById(workflow, stepId) {
            return (
                workflow.steps.find(
                    (step) => step.id === stepId
                ) || null
            );
        },

        searchWorkflows(query = "", filters = {}) {
            const normalizedQuery =
                this.normalizeText(query);

            return this.workflows
                .filter((workflow) => {
                    if (
                        filters.status &&
                        workflow.status !==
                            filters.status
                    ) {
                        return false;
                    }

                    if (
                        filters.office &&
                        !workflow.steps.some(
                            (step) =>
                                step.office ===
                                filters.office
                        )
                    ) {
                        return false;
                    }

                    if (
                        filters.sourcePlanId &&
                        workflow.sourcePlanId !==
                            filters.sourcePlanId
                    ) {
                        return false;
                    }

                    if (!normalizedQuery) {
                        return true;
                    }

                    const searchable =
                        this.normalizeText(
                            [
                                workflow.title,
                                workflow.objective,
                                workflow.description,
                                ...workflow.tags,
                                ...workflow.topics,
                                ...workflow.steps.flatMap(
                                    (step) => [
                                        step.title,
                                        step.description,
                                        step.office,
                                        step.owner,
                                        ...step.deliverables,
                                        ...step.blockers
                                    ]
                                )
                            ].join(" ")
                        );

                    return searchable.includes(
                        normalizedQuery
                    );
                })
                .map((workflow) =>
                    this.clone(workflow)
                );
        },

        registerSystemKnowledge() {
            const engine =
                global.KnowledgeEngine;

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
                "knowledge-system-executive-workflow";
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
                    "MEOS Executive Workflow Engine",
                summary:
                    "Universal controlled workflow orchestration with approvals, dependencies, handoffs, blockers, escalations, notifications, and office coordination.",
                content:
                    "Executive Workflow turns approved plans into trackable operational workflows. It does not autonomously approve decisions, spend money, contact external parties, or bypass executive authority.",
                tags: [
                    "meos-core",
                    "executive-workflow",
                    "system-component"
                ],
                topics: [
                    "workflow",
                    "operations",
                    "approvals",
                    "handoffs",
                    "escalations",
                    "notifications"
                ],
                authority: "system",
                confidence: 1,
                sensitivity: "internal",
                officeAccess: ["all"],
                metadata: {
                    componentVersion: this.version,
                    organizationNeutralCore: true,
                    brickBoundary:
                        "Workflow state management only; no autonomous approval, spending, or external communication."
                },
                createdBy: this.name
            });
        },

        getConnectedSources() {
            return {
                executivePlanning:
                    Boolean(global.ExecutivePlanning),
                institutionalReasoning:
                    Boolean(global.InstitutionalReasoning),
                missionEngine:
                    Boolean(global.MEOSMissionEngine),
                missionDispatcher:
                    Boolean(global.MEOSMissionDispatcher),
                knowledgeEngine:
                    Boolean(global.KnowledgeEngine),
                executiveOffices:
                    Boolean(
                        global.MEOSExecutiveOffices ||
                        global.ExecutiveOffices ||
                        global.MEOS
                    )
            };
        },

        getStatus() {
            this.recalculateAnalytics();

            return {
                name: this.name,
                version: this.version,
                status: this.status,
                operatingMode: this.operatingMode,
                organizationNeutralCore:
                    this.configuration.organizationNeutralCore,
                scannerRunning:
                    Boolean(this.scannerId),
                scanIntervalMs:
                    this.configuration.scanIntervalMs,
                connectedSources:
                    this.getConnectedSources(),
                workflowCount:
                    this.workflows.length,
                escalationCount:
                    this.escalations.length,
                notificationCount:
                    this.notifications.length,
                analytics:
                    this.clone(this.analytics),
                initializedAt:
                    this.initializedAt
            };
        },

        exportWorkflow(options = {}) {
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
                    workflows:
                        this.workflows,
                    escalations:
                        this.escalations,
                    notifications:
                        this.notifications,
                    history:
                        options.includeHistory === false
                            ? []
                            : this.history,
                    analytics:
                        this.analytics
                }
            };
        },

        importWorkflow(payload, options = {}) {
            let data = payload;

            if (typeof payload === "string") {
                try {
                    data = JSON.parse(payload);
                } catch (error) {
                    return {
                        success: false,
                        error:
                            "The Executive Workflow import is not valid JSON."
                    };
                }
            }

            if (!data || data.schema !== SCHEMA) {
                return {
                    success: false,
                    error:
                        "The import is not a MEOS Executive Workflow package."
                };
            }

            if (options.replace === true) {
                this.workflows = [];
                this.escalations = [];
                this.notifications = [];
                this.history = [];
            }

            this.mergeById(
                this.workflows,
                data.workflows || []
            );
            this.mergeById(
                this.escalations,
                data.escalations || []
            );
            this.mergeById(
                this.notifications,
                data.notifications || []
            );
            this.mergeById(
                this.history,
                data.history || []
            );

            if (data.analytics) {
                this.analytics = {
                    ...this.analytics,
                    ...data.analytics
                };
            }

            this.rebuildDerivedState();
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
                        "Executive Workflow persistence is disabled."
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
                        this.exportWorkflow({
                            includeHistory: true
                        }).data
                    )
                );

                return {
                    success: true,
                    persisted: true
                };
            } catch (error) {
                console.error(
                    "[MEOS Executive Workflow] Persistence failed:",
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
                const result =
                    this.importWorkflow(
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
                    "[MEOS Executive Workflow] Stored state could not be restored:",
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
                        "Clearing Executive Workflow data requires { confirm: true }."
                };
            }

            this.stopScanner();
            this.workflows = [];
            this.escalations = [];
            this.notifications = [];
            this.history = [];
            this.analytics = {
                totalWorkflows: 0,
                activeWorkflows: 0,
                blockedWorkflows: 0,
                completedWorkflows: 0,
                overdueSteps: 0,
                pendingApprovals: 0,
                lastScanAt: null
            };

            if (global.localStorage) {
                global.localStorage.removeItem(
                    this.configuration.localStorageKey
                );
            }

            this.startScanner();

            return {
                success: true,
                status: this.getStatus()
            };
        },

        logHistory(action, details = {}) {
            const entry = {
                id: this.createId("workflow-history"),
                action,
                timestamp:
                    new Date().toISOString(),
                details
            };

            this.history.unshift(entry);

            if (
                this.history.length >
                this.configuration.maximumHistory
            ) {
                this.history.length =
                    this.configuration.maximumHistory;
            }

            this.emit("workflow:history", this.clone(entry));
            return entry;
        },

        normalizePriority(value) {
            const number = Number(value);

            if (!Number.isFinite(number)) {
                return 50;
            }

            return Math.max(
                0,
                Math.min(
                    100,
                    Math.round(number)
                )
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
                new Date(value);

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
                        `[MEOS Executive Workflow] Event listener failed for "${eventName}":`,
                        error
                    );
                }
            });
        }
    };

    ExecutiveWorkflow.WORKFLOW_STATUSES =
        WORKFLOW_STATUSES;
    ExecutiveWorkflow.STEP_STATUSES =
        STEP_STATUSES;
    ExecutiveWorkflow.ESCALATION_LEVELS =
        ESCALATION_LEVELS;

    global.ExecutiveWorkflow =
        ExecutiveWorkflow;
    ExecutiveWorkflow.initialize();
})(window);
