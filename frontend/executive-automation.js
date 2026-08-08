/*
 * MEOS Executive Automation Engine
 * Version: 1.1.1
 * Build: EA111-PERSISTENCE-CIRCUIT-BREAKER-20260808-A
 *
 * Mission:
 * Detect qualifying operational conditions, apply approved automation rules,
 * create controlled actions, and keep executive work moving while preserving
 * approval gates, auditability, and human authority.
 *
 * Brick boundary:
 * This engine may recommend, queue, route, and monitor approved automation.
 * It does not autonomously approve decisions, spend money, contact external
 * parties, alter policy, or bypass executive authority.
 */

(function initializeExecutiveAutomation(global) {
    "use strict";

    const STORAGE_KEY = "meos.executive-automation.v1";
    const SCHEMA = "meos.executive-automation.package.v1";

    const RULE_STATUSES = {
        DRAFT: "draft",
        ACTIVE: "active",
        PAUSED: "paused",
        DISABLED: "disabled",
        ARCHIVED: "archived"
    };

    const RUN_STATUSES = {
        QUEUED: "queued",
        EVALUATING: "evaluating",
        AWAITING_APPROVAL: "awaiting-approval",
        EXECUTING: "executing",
        COMPLETE: "complete",
        SKIPPED: "skipped",
        FAILED: "failed",
        CANCELLED: "cancelled"
    };

    const ACTION_TYPES = {
        CREATE_MISSION: "create-mission",
        CREATE_PLAN: "create-plan",
        CREATE_WORKFLOW: "create-workflow",
        CREATE_DECISION: "create-decision",
        CREATE_COLLABORATION: "create-collaboration",
        REQUEST_APPROVAL: "request-approval",
        NOTIFY_EXECUTIVE: "notify-executive",
        ESCALATE: "escalate",
        REOPEN_WORK: "reopen-work",
        ASSIGN_OFFICE: "assign-office",
        RECORD_KNOWLEDGE: "record-knowledge"
    };


    const EXECUTION_TARGET_TYPES = {
        GRANT_PORTAL: "grant-portal",
        LINKEDIN: "linkedin",
        FACEBOOK: "facebook",
        INSTAGRAM: "instagram",
        X: "x",
        EMAIL: "email",
        CRM: "crm",
        DOCUMENT_STORAGE: "document-storage",
        SIGNATURE: "signature",
        FINANCE: "finance",
        GENERIC_WEB: "generic-web"
    };

    const EXECUTION_CAPABILITIES = {
        LOGIN: "login",
        LOGOUT: "logout",
        NAVIGATE: "navigate",
        FILL_FIELD: "fill-field",
        CLICK: "click",
        UPLOAD: "upload",
        DOWNLOAD: "download",
        SAVE_DRAFT: "save-draft",
        RESUME: "resume",
        POST: "post",
        REPLY: "reply",
        COMMENT: "comment",
        LIKE: "like",
        SEND: "send",
        READ: "read",
        SEARCH: "search",
        VALIDATE: "validate",
        SUBMIT: "submit",
        CAPTURE_EVIDENCE: "capture-evidence"
    };

    const EXECUTION_JOB_STATUSES = {
        QUEUED: "queued",
        AWAITING_APPROVAL: "awaiting-approval",
        READY: "ready",
        EXECUTING: "executing",
        PAUSED: "paused",
        RETRY_SCHEDULED: "retry-scheduled",
        COMPLETE: "complete",
        FAILED: "failed",
        CANCELLED: "cancelled"
    };

    const EXECUTION_SESSION_STATUSES = {
        CREATED: "created",
        ACTIVE: "active",
        PAUSED: "paused",
        COMPLETE: "complete",
        FAILED: "failed",
        EXPIRED: "expired"
    };

    const ExecutiveAutomation = {
        name: "MEOS Executive Automation Engine",
        version: "1.1.1",
        buildId: "EA111-PERSISTENCE-CIRCUIT-BREAKER-20260808-A",
        status: "initializing",
        operatingMode: "controlled-proactive-automation-and-execution",

        configuration: {
            persistenceEnabled: true,
            automaticPersistence: true,
            localStorageKey: STORAGE_KEY,
            organizationNeutralCore: true,
            requireExecutiveApprovalForExternalEffects: true,
            requireExecutiveApprovalForPolicyEffects: true,
            requireExecutiveApprovalForFinancialEffects: true,
            scannerEnabled: true,
            scanIntervalMs: 10000,
            maximumRules: 1000,
            maximumRuns: 5000,
            maximumHistory: 5000,
            maximumActionsPerRun: 25,
            defaultCooldownMinutes: 60,
            defaultPriority: 50,
            allowAutomaticInternalRouting: true,
            allowAutomaticInternalNotifications: true,
            allowAutomaticDraftCreation: true,
            requireExecutiveApprovalForAllExternalExecution: true,
            maximumExecutionTargets: 250,
            maximumExecutionJobs: 5000,
            maximumExecutionSessions: 1000,
            maximumExecutionReceipts: 10000,
            defaultExecutionRetryLimit: 3,
            defaultExecutionRetryDelayMs: 30000,
            defaultExecutionTimeoutMs: 120000,
            preserveExecutionEvidence: true,
            maximumPersistedRules: 250,
            maximumPersistedRuns: 250,
            maximumPersistedApprovals: 250,
            maximumPersistedNotifications: 250,
            maximumPersistedExecutionJobs: 250,
            maximumPersistedExecutionSessions: 100,
            maximumPersistedExecutionReceipts: 250,
            maximumPersistedHistory: 250
        },

        rules: [],
        runs: [],
        approvals: [],
        notifications: [],
        executionTargets: [],
        executionJobs: [],
        executionSessions: [],
        executionReceipts: [],
        executionAdapters: {},
        history: [],
        scannerId: null,
        eventListeners: {},
        persistence: {
            suspended: false,
            reason: null,
            failedAt: null,
            warningIssued: false
        },
        initializedAt: null,

        analytics: {
            totalRules: 0,
            activeRules: 0,
            totalRuns: 0,
            completedRuns: 0,
            failedRuns: 0,
            pendingApprovals: 0,
            registeredExecutionTargets: 0,
            queuedExecutionJobs: 0,
            activeExecutionSessions: 0,
            completedExecutionJobs: 0,
            failedExecutionJobs: 0,
            executionReceipts: 0,
            lastExecutionAt: null,
            lastScanAt: null,
            lastRunAt: null
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
            this.registerDefaultExecutionTargets();
            this.recalculateAnalytics();

            if (
                this.configuration.scannerEnabled &&
                options.startScanner !== false
            ) {
                this.startScanner();
            }

            console.info(
                `[MEOS] ${this.name} v${this.version} ${this.status}. Build ${this.buildId}.`
            );

            this.emit("automation:online", this.getStatus());
            return this.getStatus();
        },

        createRule(input = {}, options = {}) {
            const name = String(
                input.name ||
                input.title ||
                ""
            ).trim();

            if (!name) {
                return {
                    success: false,
                    error: "An automation rule name is required."
                };
            }

            if (
                this.rules.length >=
                this.configuration.maximumRules
            ) {
                return {
                    success: false,
                    error: "The automation rule limit has been reached."
                };
            }

            if (!input.trigger || !input.trigger.type) {
                return {
                    success: false,
                    error: "An automation trigger is required."
                };
            }

            if (
                !Array.isArray(input.actions) ||
                input.actions.length === 0
            ) {
                return {
                    success: false,
                    error: "At least one automation action is required."
                };
            }

            const timestamp = new Date().toISOString();

            const rule = {
                id: this.createId("automation-rule"),
                name,
                description: input.description || "",
                status:
                    input.status ||
                    RULE_STATUSES.DRAFT,
                priority:
                    this.normalizePriority(input.priority),
                trigger:
                    this.normalizeTrigger(input.trigger),
                conditions:
                    Array.isArray(input.conditions)
                        ? input.conditions.map(
                            (condition) =>
                                this.normalizeCondition(condition)
                        )
                        : [],
                actions:
                    input.actions
                        .slice(
                            0,
                            this.configuration.maximumActionsPerRun
                        )
                        .map((action, index) =>
                            this.normalizeAction(action, index)
                        ),
                cooldownMinutes:
                    Math.max(
                        0,
                        Number(input.cooldownMinutes) ||
                        this.configuration.defaultCooldownMinutes
                    ),
                maximumRuns:
                    Number.isFinite(Number(input.maximumRuns))
                        ? Math.max(1, Number(input.maximumRuns))
                        : null,
                runCount: 0,
                lastRunAt: null,
                nextEligibleAt: null,
                requestedBy:
                    input.requestedBy ||
                    options.actor ||
                    "Executive",
                approvedAt: null,
                approvedBy: null,
                createdAt: timestamp,
                updatedAt: timestamp,
                tags: this.uniqueStrings(input.tags),
                topics: this.uniqueStrings([
                    ...(input.topics || []),
                    "executive-automation"
                ]),
                metadata:
                    input.metadata &&
                    typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}
            };

            this.rules.push(rule);
            this.recalculateAnalytics();

            this.logHistory("rule.created", {
                ruleId: rule.id,
                name: rule.name,
                triggerType: rule.trigger.type,
                actionCount: rule.actions.length
            });

            this.persistIfEnabled();
            this.emit("automation:rule-created", this.clone(rule));

            return {
                success: true,
                rule: this.clone(rule)
            };
        },

        approveRule(ruleId, options = {}) {
            const rule = this.getRuleById(ruleId);

            if (!rule) {
                return {
                    success: false,
                    error: "Automation rule was not found."
                };
            }

            const timestamp = new Date().toISOString();

            rule.status = RULE_STATUSES.ACTIVE;
            rule.approvedAt = timestamp;
            rule.approvedBy =
                options.actor ||
                "Executive";
            rule.updatedAt = timestamp;

            this.logHistory("rule.approved", {
                ruleId,
                approvedBy: rule.approvedBy
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("automation:rule-approved", this.clone(rule));

            return {
                success: true,
                rule: this.clone(rule)
            };
        },

        pauseRule(ruleId, options = {}) {
            return this.setRuleStatus(
                ruleId,
                RULE_STATUSES.PAUSED,
                options
            );
        },

        disableRule(ruleId, options = {}) {
            return this.setRuleStatus(
                ruleId,
                RULE_STATUSES.DISABLED,
                options
            );
        },

        setRuleStatus(ruleId, status, options = {}) {
            const rule = this.getRuleById(ruleId);

            if (!rule) {
                return {
                    success: false,
                    error: "Automation rule was not found."
                };
            }

            if (!Object.values(RULE_STATUSES).includes(status)) {
                return {
                    success: false,
                    error: "Automation rule status is invalid."
                };
            }

            rule.status = status;
            rule.updatedAt = new Date().toISOString();
            rule.statusReason = options.reason || "";

            this.logHistory("rule.status-updated", {
                ruleId,
                status,
                actor: options.actor || "Executive"
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();

            return {
                success: true,
                rule: this.clone(rule)
            };
        },

        evaluateRule(ruleOrId, context = {}, options = {}) {
            const rule =
                typeof ruleOrId === "string"
                    ? this.getRuleById(ruleOrId)
                    : ruleOrId;

            if (!rule) {
                return {
                    success: false,
                    matched: false,
                    error: "Automation rule was not found."
                };
            }

            if (
                rule.status !== RULE_STATUSES.ACTIVE &&
                options.overrideStatus !== true
            ) {
                return {
                    success: true,
                    matched: false,
                    reason: "Rule is not active."
                };
            }

            if (
                rule.maximumRuns &&
                rule.runCount >= rule.maximumRuns
            ) {
                return {
                    success: true,
                    matched: false,
                    reason: "Rule maximum run count reached."
                };
            }

            if (
                rule.nextEligibleAt &&
                Date.now() < Date.parse(rule.nextEligibleAt)
            ) {
                return {
                    success: true,
                    matched: false,
                    reason: "Rule is in cooldown."
                };
            }

            const triggerMatch =
                this.evaluateTrigger(rule.trigger, context);

            if (!triggerMatch.matched) {
                return {
                    success: true,
                    matched: false,
                    trigger: triggerMatch
                };
            }

            const conditionResults =
                rule.conditions.map((condition) =>
                    this.evaluateCondition(condition, context)
                );

            const conditionsMet =
                conditionResults.every(
                    (result) => result.matched
                );

            return {
                success: true,
                matched: triggerMatch.matched && conditionsMet,
                trigger: triggerMatch,
                conditions: conditionResults,
                context: this.clone(context)
            };
        },

        runRule(ruleId, context = {}, options = {}) {
            const rule = this.getRuleById(ruleId);

            if (!rule) {
                return {
                    success: false,
                    error: "Automation rule was not found."
                };
            }

            const evaluation =
                this.evaluateRule(rule, context, options);

            if (!evaluation.success || !evaluation.matched) {
                return {
                    success: evaluation.success,
                    executed: false,
                    evaluation,
                    error: evaluation.error
                };
            }

            const run = this.createRun(rule, context);

            run.status = RUN_STATUSES.EVALUATING;
            run.startedAt = new Date().toISOString();

            const actionResults = [];

            for (const action of rule.actions) {
                const approvalRequired =
                    this.actionRequiresApproval(action);

                if (
                    approvalRequired &&
                    options.overrideApproval !== true
                ) {
                    const approval =
                        this.createApproval(run, rule, action);

                    actionResults.push({
                        actionId: action.id,
                        success: false,
                        awaitingApproval: true,
                        approvalId: approval.id
                    });

                    run.status =
                        RUN_STATUSES.AWAITING_APPROVAL;
                    continue;
                }

                const result =
                    this.executeAction(
                        run,
                        rule,
                        action,
                        context,
                        options
                    );

                actionResults.push({
                    actionId: action.id,
                    ...result
                });
            }

            run.actionResults = actionResults;
            run.updatedAt = new Date().toISOString();

            if (
                actionResults.some(
                    (result) => result.awaitingApproval
                )
            ) {
                run.status =
                    RUN_STATUSES.AWAITING_APPROVAL;
            } else if (
                actionResults.every(
                    (result) => result.success
                )
            ) {
                run.status =
                    RUN_STATUSES.COMPLETE;
                run.completedAt =
                    new Date().toISOString();
            } else {
                run.status =
                    RUN_STATUSES.FAILED;
                run.failedAt =
                    new Date().toISOString();
            }

            rule.runCount += 1;
            rule.lastRunAt = new Date().toISOString();
            rule.nextEligibleAt =
                this.addMinutes(
                    rule.lastRunAt,
                    rule.cooldownMinutes
                );
            rule.updatedAt = rule.lastRunAt;

            this.logHistory("rule.run", {
                ruleId: rule.id,
                runId: run.id,
                status: run.status
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("automation:run-complete", this.clone(run));

            return {
                success:
                    run.status === RUN_STATUSES.COMPLETE ||
                    run.status === RUN_STATUSES.AWAITING_APPROVAL,
                run: this.clone(run)
            };
        },

        executeAction(
            run,
            rule,
            action,
            context,
            options = {}
        ) {
            try {
                switch (action.type) {
                    case ACTION_TYPES.CREATE_MISSION:
                        return this.createMissionAction(
                            run,
                            action,
                            context
                        );

                    case ACTION_TYPES.CREATE_PLAN:
                        return this.createPlanAction(
                            run,
                            action,
                            context
                        );

                    case ACTION_TYPES.CREATE_WORKFLOW:
                        return this.createWorkflowAction(
                            run,
                            action,
                            context
                        );

                    case ACTION_TYPES.CREATE_DECISION:
                        return this.createDecisionAction(
                            run,
                            action,
                            context
                        );

                    case ACTION_TYPES.CREATE_COLLABORATION:
                        return this.createCollaborationAction(
                            run,
                            action,
                            context
                        );

                    case ACTION_TYPES.REQUEST_APPROVAL:
                        return this.requestApprovalAction(
                            run,
                            rule,
                            action
                        );

                    case ACTION_TYPES.NOTIFY_EXECUTIVE:
                        return this.notifyExecutiveAction(
                            run,
                            action,
                            context
                        );

                    case ACTION_TYPES.ESCALATE:
                        return this.escalateAction(
                            run,
                            action,
                            context
                        );

                    case ACTION_TYPES.REOPEN_WORK:
                        return this.reopenWorkAction(
                            run,
                            action,
                            context
                        );

                    case ACTION_TYPES.ASSIGN_OFFICE:
                        return this.assignOfficeAction(
                            run,
                            action,
                            context
                        );

                    case ACTION_TYPES.RECORD_KNOWLEDGE:
                        return this.recordKnowledgeAction(
                            run,
                            action,
                            context
                        );

                    default:
                        return {
                            success: false,
                            error:
                                `Unsupported automation action: ${action.type}`
                        };
                }
            } catch (error) {
                console.error(
                    "[MEOS Executive Automation] Action execution failed:",
                    error
                );

                return {
                    success: false,
                    error: error.message
                };
            }
        },

        createMissionAction(run, action, context) {
            const engine = global.MEOSMissionEngine;

            if (!engine?.createMission) {
                return {
                    success: false,
                    error: "Mission Engine is unavailable."
                };
            }

            const mission = engine.createMission(
                this.resolveTemplate(
                    action.payload,
                    context
                )
            );

            return {
                success: true,
                resultType: "mission",
                result: mission
            };
        },

        createPlanAction(run, action, context) {
            const engine = global.ExecutivePlanning;

            if (!engine?.createPlan) {
                return {
                    success: false,
                    error: "Executive Planning Engine is unavailable."
                };
            }

            const plan = engine.createPlan(
                this.resolveTemplate(
                    action.payload,
                    context
                ),
                {
                    actor: this.name
                }
            );

            return {
                success: Boolean(plan?.success),
                resultType: "plan",
                result: plan
            };
        },

        createWorkflowAction(run, action, context) {
            const engine = global.ExecutiveWorkflow;

            if (!engine?.createWorkflow) {
                return {
                    success: false,
                    error: "Executive Workflow Engine is unavailable."
                };
            }

            const workflow = engine.createWorkflow(
                this.resolveTemplate(
                    action.payload,
                    context
                ),
                {
                    actor: this.name
                }
            );

            return {
                success: Boolean(workflow?.success),
                resultType: "workflow",
                result: workflow
            };
        },

        createDecisionAction(run, action, context) {
            const engine = global.ExecutiveDecision;

            if (!engine?.createDecision) {
                return {
                    success: false,
                    error: "Executive Decision Engine is unavailable."
                };
            }

            const decision = engine.createDecision(
                this.resolveTemplate(
                    action.payload,
                    context
                ),
                {
                    actor: this.name
                }
            );

            return {
                success: Boolean(decision?.success),
                resultType: "decision",
                result: decision
            };
        },

        createCollaborationAction(run, action, context) {
            const engine =
                global.ExecutiveCollaboration;

            if (!engine?.createSession) {
                return {
                    success: false,
                    error: "Executive Collaboration Engine is unavailable."
                };
            }

            const session = engine.createSession(
                this.resolveTemplate(
                    action.payload,
                    context
                ),
                {
                    actor: this.name
                }
            );

            return {
                success: Boolean(session?.success),
                resultType: "collaboration",
                result: session
            };
        },

        requestApprovalAction(run, rule, action) {
            const approval =
                this.createApproval(
                    run,
                    rule,
                    action
                );

            return {
                success: true,
                awaitingApproval: true,
                resultType: "approval",
                result: approval
            };
        },

        notifyExecutiveAction(run, action, context) {
            if (
                !this.configuration
                    .allowAutomaticInternalNotifications
            ) {
                return {
                    success: false,
                    error:
                        "Automatic internal notifications are disabled."
                };
            }

            const notification = {
                id: this.createId("automation-notification"),
                runId: run.id,
                type:
                    action.payload?.type ||
                    "automation-notice",
                title:
                    action.payload?.title ||
                    "Executive Automation Notice",
                message:
                    this.resolveStringTemplate(
                        action.payload?.message ||
                        "An automation condition was met.",
                        context
                    ),
                recipient:
                    action.payload?.recipient ||
                    "Executive",
                office:
                    action.payload?.office ||
                    "Maddy",
                status: "unread",
                createdAt:
                    new Date().toISOString(),
                readAt: null
            };

            this.notifications.push(notification);

            return {
                success: true,
                resultType: "notification",
                result: notification
            };
        },

        escalateAction(run, action, context) {
            const workflow = global.ExecutiveWorkflow;

            if (
                workflow?.escalate &&
                context.workflowId
            ) {
                const workflowRecord =
                    workflow.getWorkflowById?.(
                        context.workflowId
                    );

                const step =
                    workflowRecord &&
                    context.stepId
                        ? workflow.getStepById?.(
                            workflowRecord,
                            context.stepId
                        )
                        : null;

                const escalation =
                    workflow.escalate(
                        workflowRecord,
                        step,
                        {
                            level:
                                action.payload?.level ||
                                2,
                            reason:
                                this.resolveStringTemplate(
                                    action.payload?.reason ||
                                    "Automation escalation triggered.",
                                    context
                                )
                        }
                    );

                return {
                    success: Boolean(escalation?.success),
                    resultType: "escalation",
                    result: escalation
                };
            }

            return this.notifyExecutiveAction(
                run,
                {
                    payload: {
                        type: "escalation",
                        title: "Executive Escalation",
                        message:
                            action.payload?.reason ||
                            "Automation escalation triggered.",
                        recipient: "Executive"
                    }
                },
                context
            );
        },

        reopenWorkAction(run, action, context) {
            const workflow = global.ExecutiveWorkflow;

            if (
                workflow &&
                context.workflowId
            ) {
                const record =
                    workflow.getWorkflowById?.(
                        context.workflowId
                    );

                if (record) {
                    record.status = "active";
                    record.updatedAt =
                        new Date().toISOString();

                    return {
                        success: true,
                        resultType: "workflow",
                        result: this.clone(record)
                    };
                }
            }

            return {
                success: false,
                error:
                    "No compatible workflow could be reopened."
            };
        },

        assignOfficeAction(run, action, context) {
            const office =
                action.payload?.office ||
                context.office;

            if (!office) {
                return {
                    success: false,
                    error:
                        "An office is required for assignment."
                };
            }

            return {
                success: true,
                resultType: "office-assignment",
                result: {
                    office,
                    subjectId:
                        context.subjectId ||
                        context.missionId ||
                        context.workflowId ||
                        null,
                    assignedAt:
                        new Date().toISOString()
                }
            };
        },

        recordKnowledgeAction(run, action, context) {
            const engine = global.KnowledgeEngine;

            if (!engine?.createRecord) {
                return {
                    success: false,
                    error: "Knowledge Engine is unavailable."
                };
            }

            const record = engine.createRecord(
                this.resolveTemplate(
                    action.payload,
                    context
                )
            );

            return {
                success: true,
                resultType: "knowledge-record",
                result: record
            };
        },

        actionRequiresApproval(action) {
            if (action.approvalRequired === true) {
                return true;
            }

            const effects =
                action.effects || {};

            if (
                effects.external &&
                this.configuration
                    .requireExecutiveApprovalForExternalEffects
            ) {
                return true;
            }

            if (
                effects.financial &&
                this.configuration
                    .requireExecutiveApprovalForFinancialEffects
            ) {
                return true;
            }

            if (
                effects.policy &&
                this.configuration
                    .requireExecutiveApprovalForPolicyEffects
            ) {
                return true;
            }

            return false;
        },

        createApproval(run, rule, action) {
            const approval = {
                id: this.createId("automation-approval"),
                runId: run.id,
                ruleId: rule.id,
                actionId: action.id,
                title:
                    action.approvalTitle ||
                    `Approve automation action: ${action.type}`,
                status: "pending",
                requestedAt:
                    new Date().toISOString(),
                requestedBy: this.name,
                requiredRole:
                    action.requiredApprovalRole ||
                    "Authorized Executive",
                decidedAt: null,
                decidedBy: null,
                notes: ""
            };

            this.approvals.push(approval);
            run.approvalIds.push(approval.id);

            return approval;
        },

        approveAction(approvalId, options = {}) {
            const approval =
                this.approvals.find(
                    (item) => item.id === approvalId
                );

            if (!approval) {
                return {
                    success: false,
                    error: "Automation approval was not found."
                };
            }

            if (approval.status !== "pending") {
                return {
                    success: false,
                    error:
                        "Automation approval is no longer pending."
                };
            }

            const run =
                this.getRunById(approval.runId);
            const rule =
                this.getRuleById(approval.ruleId);
            const action =
                rule?.actions.find(
                    (item) =>
                        item.id === approval.actionId
                );

            if (!run || !rule || !action) {
                return {
                    success: false,
                    error:
                        "The related automation run, rule, or action was not found."
                };
            }

            approval.status = "approved";
            approval.decidedAt =
                new Date().toISOString();
            approval.decidedBy =
                options.actor ||
                "Executive";
            approval.notes =
                options.notes ||
                "";

            const result =
                this.executeAction(
                    run,
                    rule,
                    action,
                    run.context,
                    {
                        overrideApproval: true
                    }
                );

            run.actionResults.push({
                actionId: action.id,
                approvedExecution: true,
                ...result
            });

            const remainingPending =
                run.approvalIds.some(
                    (id) =>
                        this.approvals.some(
                            (item) =>
                                item.id === id &&
                                item.status === "pending"
                        )
                );

            if (!remainingPending) {
                const failed =
                    run.actionResults.some(
                        (item) =>
                            item.success === false &&
                            !item.awaitingApproval
                    );

                run.status =
                    failed
                        ? RUN_STATUSES.FAILED
                        : RUN_STATUSES.COMPLETE;

                if (!failed) {
                    run.completedAt =
                        new Date().toISOString();
                }
            }

            run.updatedAt =
                new Date().toISOString();

            this.recalculateAnalytics();
            this.persistIfEnabled();

            return {
                success: Boolean(result.success),
                approval:
                    this.clone(approval),
                result,
                run: this.clone(run)
            };
        },

        rejectAction(approvalId, options = {}) {
            const approval =
                this.approvals.find(
                    (item) => item.id === approvalId
                );

            if (!approval) {
                return {
                    success: false,
                    error: "Automation approval was not found."
                };
            }

            approval.status = "rejected";
            approval.decidedAt =
                new Date().toISOString();
            approval.decidedBy =
                options.actor ||
                "Executive";
            approval.notes =
                options.reason ||
                options.notes ||
                "";

            const run =
                this.getRunById(approval.runId);

            if (run) {
                run.status =
                    RUN_STATUSES.CANCELLED;
                run.updatedAt =
                    new Date().toISOString();
            }

            this.recalculateAnalytics();
            this.persistIfEnabled();

            return {
                success: true,
                approval:
                    this.clone(approval),
                run:
                    run
                        ? this.clone(run)
                        : null
            };
        },

        registerExecutionTarget(input = {}, options = {}) {
            const name = String(
                input.name ||
                input.title ||
                ""
            ).trim();

            if (!name) {
                return {
                    success: false,
                    error: "An execution target name is required."
                };
            }

            if (
                this.executionTargets.length >=
                this.configuration.maximumExecutionTargets
            ) {
                return {
                    success: false,
                    error: "The execution target limit has been reached."
                };
            }

            const type =
                Object.values(EXECUTION_TARGET_TYPES).includes(
                    input.type
                )
                    ? input.type
                    : EXECUTION_TARGET_TYPES.GENERIC_WEB;

            const existing =
                this.executionTargets.find(
                    (target) =>
                        target.name === name &&
                        target.type === type
                );

            if (existing) {
                return {
                    success: true,
                    duplicate: true,
                    target: this.clone(existing)
                };
            }

            const capabilities =
                this.uniqueStrings(
                    input.capabilities
                ).filter(
                    (capability) =>
                        Object.values(
                            EXECUTION_CAPABILITIES
                        ).includes(capability)
                );

            const target = {
                id:
                    input.id ||
                    this.createId("execution-target"),
                name,
                type,
                provider:
                    input.provider ||
                    name,
                adapterId:
                    input.adapterId ||
                    null,
                capabilities,
                status:
                    input.status ||
                    "registered",
                requiresAuthentication:
                    input.requiresAuthentication !== false,
                requiresExecutiveApproval:
                    input.requiresExecutiveApproval !== false,
                supportsDrafts:
                    input.supportsDrafts === true,
                supportsResume:
                    input.supportsResume === true,
                supportsEvidenceCapture:
                    input.supportsEvidenceCapture !== false,
                metadata:
                    input.metadata &&
                    typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {},
                registeredAt:
                    new Date().toISOString(),
                registeredBy:
                    options.actor ||
                    "MEOS Executive Automation",
                updatedAt:
                    new Date().toISOString()
            };

            this.executionTargets.push(target);

            this.logHistory("execution-target.registered", {
                targetId: target.id,
                name: target.name,
                type: target.type,
                capabilities:
                    target.capabilities
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit(
                "automation:execution-target-registered",
                this.clone(target)
            );

            return {
                success: true,
                target: this.clone(target)
            };
        },

        registerExecutionAdapter(
            adapterId,
            adapter,
            options = {}
        ) {
            const id =
                String(adapterId || "").trim();

            if (!id) {
                return {
                    success: false,
                    error: "An execution adapter ID is required."
                };
            }

            if (
                !adapter ||
                typeof adapter !== "object"
            ) {
                return {
                    success: false,
                    error: "An execution adapter object is required."
                };
            }

            if (
                typeof adapter.execute !== "function"
            ) {
                return {
                    success: false,
                    error: "Execution adapters must provide execute()."
                };
            }

            this.executionAdapters[id] = {
                id,
                name:
                    adapter.name ||
                    id,
                version:
                    adapter.version ||
                    "1.0.0",
                capabilities:
                    this.uniqueStrings(
                        adapter.capabilities || []
                    ),
                execute:
                    adapter.execute,
                createSession:
                    typeof adapter.createSession === "function"
                        ? adapter.createSession
                        : null,
                resumeSession:
                    typeof adapter.resumeSession === "function"
                        ? adapter.resumeSession
                        : null,
                closeSession:
                    typeof adapter.closeSession === "function"
                        ? adapter.closeSession
                        : null,
                registeredAt:
                    new Date().toISOString(),
                registeredBy:
                    options.actor ||
                    "MEOS Executive Automation"
            };

            this.logHistory("execution-adapter.registered", {
                adapterId: id,
                name:
                    this.executionAdapters[id].name
            });

            return {
                success: true,
                adapter: {
                    id,
                    name:
                        this.executionAdapters[id].name,
                    version:
                        this.executionAdapters[id].version,
                    capabilities:
                        this.clone(
                            this.executionAdapters[id]
                                .capabilities
                        )
                }
            };
        },

        registerDefaultExecutionTargets() {
            const defaults = [
                {
                    id: "execution-target-linkedin",
                    name: "LinkedIn",
                    type: EXECUTION_TARGET_TYPES.LINKEDIN,
                    provider: "LinkedIn",
                    capabilities: [
                        EXECUTION_CAPABILITIES.LOGIN,
                        EXECUTION_CAPABILITIES.NAVIGATE,
                        EXECUTION_CAPABILITIES.POST,
                        EXECUTION_CAPABILITIES.REPLY,
                        EXECUTION_CAPABILITIES.COMMENT,
                        EXECUTION_CAPABILITIES.LIKE,
                        EXECUTION_CAPABILITIES.READ,
                        EXECUTION_CAPABILITIES.SEARCH,
                        EXECUTION_CAPABILITIES.UPLOAD,
                        EXECUTION_CAPABILITIES.CAPTURE_EVIDENCE
                    ],
                    requiresAuthentication: true,
                    requiresExecutiveApproval: true,
                    supportsDrafts: true,
                    supportsResume: true
                },
                {
                    id: "execution-target-grant-portal",
                    name: "Grant Portal",
                    type: EXECUTION_TARGET_TYPES.GRANT_PORTAL,
                    provider: "Universal Grant Portal",
                    capabilities: [
                        EXECUTION_CAPABILITIES.LOGIN,
                        EXECUTION_CAPABILITIES.NAVIGATE,
                        EXECUTION_CAPABILITIES.FILL_FIELD,
                        EXECUTION_CAPABILITIES.CLICK,
                        EXECUTION_CAPABILITIES.UPLOAD,
                        EXECUTION_CAPABILITIES.SAVE_DRAFT,
                        EXECUTION_CAPABILITIES.RESUME,
                        EXECUTION_CAPABILITIES.VALIDATE,
                        EXECUTION_CAPABILITIES.SUBMIT,
                        EXECUTION_CAPABILITIES.CAPTURE_EVIDENCE
                    ],
                    requiresAuthentication: true,
                    requiresExecutiveApproval: true,
                    supportsDrafts: true,
                    supportsResume: true
                },
                {
                    id: "execution-target-facebook",
                    name: "Facebook",
                    type: EXECUTION_TARGET_TYPES.FACEBOOK,
                    provider: "Meta",
                    capabilities: [
                        EXECUTION_CAPABILITIES.LOGIN,
                        EXECUTION_CAPABILITIES.POST,
                        EXECUTION_CAPABILITIES.REPLY,
                        EXECUTION_CAPABILITIES.COMMENT,
                        EXECUTION_CAPABILITIES.READ,
                        EXECUTION_CAPABILITIES.UPLOAD,
                        EXECUTION_CAPABILITIES.CAPTURE_EVIDENCE
                    ],
                    requiresAuthentication: true,
                    requiresExecutiveApproval: true,
                    supportsDrafts: true,
                    supportsResume: true
                },
                {
                    id: "execution-target-instagram",
                    name: "Instagram",
                    type: EXECUTION_TARGET_TYPES.INSTAGRAM,
                    provider: "Meta",
                    capabilities: [
                        EXECUTION_CAPABILITIES.LOGIN,
                        EXECUTION_CAPABILITIES.POST,
                        EXECUTION_CAPABILITIES.REPLY,
                        EXECUTION_CAPABILITIES.COMMENT,
                        EXECUTION_CAPABILITIES.READ,
                        EXECUTION_CAPABILITIES.UPLOAD,
                        EXECUTION_CAPABILITIES.CAPTURE_EVIDENCE
                    ],
                    requiresAuthentication: true,
                    requiresExecutiveApproval: true,
                    supportsDrafts: true,
                    supportsResume: true
                },
                {
                    id: "execution-target-x",
                    name: "X",
                    type: EXECUTION_TARGET_TYPES.X,
                    provider: "X",
                    capabilities: [
                        EXECUTION_CAPABILITIES.LOGIN,
                        EXECUTION_CAPABILITIES.POST,
                        EXECUTION_CAPABILITIES.REPLY,
                        EXECUTION_CAPABILITIES.READ,
                        EXECUTION_CAPABILITIES.UPLOAD,
                        EXECUTION_CAPABILITIES.CAPTURE_EVIDENCE
                    ],
                    requiresAuthentication: true,
                    requiresExecutiveApproval: true,
                    supportsDrafts: true,
                    supportsResume: true
                },
                {
                    id: "execution-target-email",
                    name: "Email",
                    type: EXECUTION_TARGET_TYPES.EMAIL,
                    provider: "Universal Email",
                    capabilities: [
                        EXECUTION_CAPABILITIES.LOGIN,
                        EXECUTION_CAPABILITIES.READ,
                        EXECUTION_CAPABILITIES.SEARCH,
                        EXECUTION_CAPABILITIES.SEND,
                        EXECUTION_CAPABILITIES.REPLY,
                        EXECUTION_CAPABILITIES.CAPTURE_EVIDENCE
                    ],
                    requiresAuthentication: true,
                    requiresExecutiveApproval: true,
                    supportsDrafts: true,
                    supportsResume: true
                }
            ];

            return {
                success: true,
                results:
                    defaults.map(
                        (target) =>
                            this.registerExecutionTarget(
                                target,
                                {
                                    actor:
                                        "MEOS Core"
                                }
                            )
                    )
            };
        },

        createExecutionJob(input = {}, options = {}) {
            if (
                this.executionJobs.length >=
                this.configuration.maximumExecutionJobs
            ) {
                return {
                    success: false,
                    error: "The execution job limit has been reached."
                };
            }

            const target =
                this.getExecutionTargetById(
                    input.targetId
                ) ||
                this.executionTargets.find(
                    (candidate) =>
                        candidate.type ===
                        input.targetType
                );

            if (!target) {
                return {
                    success: false,
                    error: "Execution target was not found."
                };
            }

            const capability =
                String(
                    input.capability ||
                    ""
                ).trim();

            if (
                !target.capabilities.includes(
                    capability
                )
            ) {
                return {
                    success: false,
                    error:
                        `Execution target does not support capability: ${capability}`
                };
            }

            const externalEffect =
                input.effects?.external !== false;

            const approvalRequired =
                input.approvalRequired === true ||
                target.requiresExecutiveApproval === true ||
                (
                    externalEffect &&
                    this.configuration
                        .requireExecutiveApprovalForAllExternalExecution
                );

            const timestamp =
                new Date().toISOString();

            const job = {
                id:
                    input.id ||
                    this.createId("execution-job"),
                name:
                    String(
                        input.name ||
                        `${target.name}: ${capability}`
                    ),
                targetId:
                    target.id,
                targetType:
                    target.type,
                capability,
                adapterId:
                    input.adapterId ||
                    target.adapterId ||
                    null,
                status:
                    approvalRequired
                        ? EXECUTION_JOB_STATUSES.AWAITING_APPROVAL
                        : EXECUTION_JOB_STATUSES.READY,
                payload:
                    input.payload &&
                    typeof input.payload === "object"
                        ? this.clone(
                            input.payload
                        )
                        : {},
                effects: {
                    external: externalEffect,
                    financial:
                        input.effects?.financial === true,
                    policy:
                        input.effects?.policy === true
                },
                approvalRequired,
                approvalId: null,
                approvedAt: null,
                approvedBy: null,
                retryPolicy: {
                    maximumAttempts:
                        Math.max(
                            1,
                            Number(
                                input.retryPolicy
                                    ?.maximumAttempts
                            ) ||
                            this.configuration
                                .defaultExecutionRetryLimit
                        ),
                    delayMs:
                        Math.max(
                            0,
                            Number(
                                input.retryPolicy
                                    ?.delayMs
                            ) ||
                            this.configuration
                                .defaultExecutionRetryDelayMs
                        )
                },
                attempts: 0,
                nextRetryAt: null,
                timeoutMs:
                    Math.max(
                        1000,
                        Number(input.timeoutMs) ||
                        this.configuration
                            .defaultExecutionTimeoutMs
                    ),
                sessionId: null,
                receiptIds: [],
                requestedBy:
                    input.requestedBy ||
                    options.actor ||
                    "Maddy",
                requestedAt:
                    timestamp,
                updatedAt:
                    timestamp,
                startedAt: null,
                completedAt: null,
                failedAt: null,
                pausedAt: null,
                resumedAt: null,
                failure: null,
                metadata:
                    input.metadata &&
                    typeof input.metadata === "object"
                        ? this.clone(
                            input.metadata
                        )
                        : {}
            };

            if (approvalRequired) {
                const approval = {
                    id:
                        this.createId(
                            "execution-approval"
                        ),
                    runId: null,
                    ruleId: null,
                    actionId: null,
                    executionJobId:
                        job.id,
                    title:
                        input.approvalTitle ||
                        `Approve ${capability} on ${target.name}`,
                    status:
                        "pending",
                    requestedAt:
                        timestamp,
                    requestedBy:
                        job.requestedBy,
                    requiredRole:
                        input.requiredApprovalRole ||
                        "Authorized Executive",
                    decidedAt:
                        null,
                    decidedBy:
                        null,
                    notes:
                        ""
                };

                this.approvals.push(
                    approval
                );
                job.approvalId =
                    approval.id;
            }

            this.executionJobs.unshift(
                job
            );

            this.logHistory("execution-job.created", {
                jobId: job.id,
                targetId:
                    job.targetId,
                targetType:
                    job.targetType,
                capability:
                    job.capability,
                approvalRequired:
                    job.approvalRequired
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit(
                "automation:execution-job-created",
                this.clone(job)
            );

            return {
                success: true,
                job:
                    this.clone(job),
                approval:
                    job.approvalId
                        ? this.clone(
                            this.approvals.find(
                                (item) =>
                                    item.id ===
                                    job.approvalId
                            )
                        )
                        : null
            };
        },

        approveExecutionJob(
            approvalId,
            options = {}
        ) {
            const approval =
                this.approvals.find(
                    (item) =>
                        item.id === approvalId
                );

            if (
                !approval ||
                !approval.executionJobId
            ) {
                return {
                    success: false,
                    error:
                        "Execution approval was not found."
                };
            }

            if (
                approval.status !== "pending"
            ) {
                return {
                    success: false,
                    error:
                        "Execution approval is no longer pending."
                };
            }

            const job =
                this.getExecutionJobById(
                    approval.executionJobId
                );

            if (!job) {
                return {
                    success: false,
                    error:
                        "Execution job was not found."
                };
            }

            const actor =
                options.actor ||
                "Executive";

            approval.status =
                "approved";
            approval.decidedAt =
                new Date().toISOString();
            approval.decidedBy =
                actor;
            approval.notes =
                options.notes ||
                "";

            job.status =
                EXECUTION_JOB_STATUSES.READY;
            job.approvedAt =
                approval.decidedAt;
            job.approvedBy =
                actor;
            job.updatedAt =
                approval.decidedAt;

            this.logHistory("execution-job.approved", {
                jobId: job.id,
                approvalId:
                    approval.id,
                approvedBy:
                    actor
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();

            return {
                success: true,
                job:
                    this.clone(job),
                approval:
                    this.clone(approval)
            };
        },

        createExecutionSession(
            job,
            target,
            adapter
        ) {
            const timestamp =
                new Date().toISOString();

            const session = {
                id:
                    this.createId(
                        "execution-session"
                    ),
                jobId:
                    job.id,
                targetId:
                    target.id,
                adapterId:
                    adapter.id,
                status:
                    EXECUTION_SESSION_STATUSES.CREATED,
                externalSessionId:
                    null,
                createdAt:
                    timestamp,
                startedAt:
                    null,
                pausedAt:
                    null,
                resumedAt:
                    null,
                completedAt:
                    null,
                failedAt:
                    null,
                updatedAt:
                    timestamp,
                checkpoint:
                    null,
                evidence:
                    [],
                error:
                    null
            };

            this.executionSessions.unshift(
                session
            );

            return session;
        },

        executeExecutionJob(
            jobId,
            options = {}
        ) {
            const job =
                this.getExecutionJobById(
                    jobId
                );

            if (!job) {
                return {
                    success: false,
                    error:
                        "Execution job was not found."
                };
            }

            if (
                job.status ===
                EXECUTION_JOB_STATUSES.AWAITING_APPROVAL
            ) {
                return {
                    success: false,
                    error:
                        "Execution job requires executive approval.",
                    code:
                        "EXECUTION_APPROVAL_REQUIRED"
                };
            }

            if (
                ![
                    EXECUTION_JOB_STATUSES.READY,
                    EXECUTION_JOB_STATUSES.RETRY_SCHEDULED,
                    EXECUTION_JOB_STATUSES.PAUSED
                ].includes(
                    job.status
                )
            ) {
                return {
                    success: false,
                    error:
                        `Execution job cannot run from status: ${job.status}`
                };
            }

            const target =
                this.getExecutionTargetById(
                    job.targetId
                );

            if (!target) {
                return {
                    success: false,
                    error:
                        "Execution target was not found."
                };
            }

            const adapterId =
                job.adapterId ||
                target.adapterId;

            const adapter =
                this.executionAdapters[
                    adapterId
                ];

            if (!adapter) {
                return {
                    success: false,
                    error:
                        "No execution adapter is registered for this target.",
                    code:
                        "EXECUTION_ADAPTER_REQUIRED"
                };
            }

            let session =
                job.sessionId
                    ? this.getExecutionSessionById(
                        job.sessionId
                    )
                    : null;

            if (!session) {
                session =
                    this.createExecutionSession(
                        job,
                        target,
                        adapter
                    );
                job.sessionId =
                    session.id;
            }

            const timestamp =
                new Date().toISOString();

            job.status =
                EXECUTION_JOB_STATUSES.EXECUTING;
            job.startedAt =
                job.startedAt ||
                timestamp;
            job.updatedAt =
                timestamp;
            job.attempts += 1;

            session.status =
                EXECUTION_SESSION_STATUSES.ACTIVE;
            session.startedAt =
                session.startedAt ||
                timestamp;
            session.updatedAt =
                timestamp;

            let adapterResult;

            try {
                adapterResult =
                    adapter.execute({
                        job:
                            this.clone(job),
                        target:
                            this.clone(target),
                        session:
                            this.clone(session),
                        options:
                            this.clone(options)
                    });
            } catch (error) {
                adapterResult = {
                    success: false,
                    error:
                        error.message
                };
            }

            if (
                adapterResult &&
                typeof adapterResult.then === "function"
            ) {
                return adapterResult.then(
                    (result) =>
                        this.finalizeExecutionAttempt(
                            job,
                            session,
                            target,
                            result || {}
                        )
                );
            }

            return this.finalizeExecutionAttempt(
                job,
                session,
                target,
                adapterResult || {}
            );
        },

        finalizeExecutionAttempt(
            job,
            session,
            target,
            result = {}
        ) {
            const timestamp =
                new Date().toISOString();

            if (
                result.paused === true
            ) {
                job.status =
                    EXECUTION_JOB_STATUSES.PAUSED;
                job.pausedAt =
                    timestamp;
                job.updatedAt =
                    timestamp;

                session.status =
                    EXECUTION_SESSION_STATUSES.PAUSED;
                session.pausedAt =
                    timestamp;
                session.checkpoint =
                    result.checkpoint ||
                    null;
                session.updatedAt =
                    timestamp;

                const receipt =
                    this.createExecutionReceipt(
                        job,
                        session,
                        target,
                        {
                            success: true,
                            status: "paused",
                            evidence:
                                result.evidence || [],
                            details:
                                result.details || {},
                            checkpoint:
                                result.checkpoint || null
                        }
                    );

                return {
                    success: true,
                    paused: true,
                    job:
                        this.clone(job),
                    session:
                        this.clone(session),
                    receipt
                };
            }

            if (
                result.success === true
            ) {
                job.status =
                    EXECUTION_JOB_STATUSES.COMPLETE;
                job.completedAt =
                    timestamp;
                job.updatedAt =
                    timestamp;
                job.failure =
                    null;

                session.status =
                    EXECUTION_SESSION_STATUSES.COMPLETE;
                session.completedAt =
                    timestamp;
                session.updatedAt =
                    timestamp;
                session.evidence =
                    this.clone(
                        result.evidence || []
                    );

                const receipt =
                    this.createExecutionReceipt(
                        job,
                        session,
                        target,
                        {
                            success: true,
                            status: "complete",
                            evidence:
                                result.evidence || [],
                            details:
                                result.details || {},
                            externalReference:
                                result.externalReference ||
                                null
                        }
                    );

                this.analytics.lastExecutionAt =
                    timestamp;
                this.recalculateAnalytics();
                this.persistIfEnabled();

                this.emit(
                    "automation:execution-complete",
                    {
                        job:
                            this.clone(job),
                        receipt
                    }
                );

                return {
                    success: true,
                    job:
                        this.clone(job),
                    session:
                        this.clone(session),
                    receipt
                };
            }

            const canRetry =
                job.attempts <
                job.retryPolicy.maximumAttempts;

            if (canRetry) {
                job.status =
                    EXECUTION_JOB_STATUSES.RETRY_SCHEDULED;
                job.nextRetryAt =
                    new Date(
                        Date.now() +
                        job.retryPolicy.delayMs
                    ).toISOString();
            } else {
                job.status =
                    EXECUTION_JOB_STATUSES.FAILED;
                job.failedAt =
                    timestamp;
            }

            job.updatedAt =
                timestamp;
            job.failure = {
                message:
                    result.error ||
                    "Execution failed.",
                code:
                    result.code ||
                    "EXECUTION_FAILED",
                attempt:
                    job.attempts
            };

            session.status =
                canRetry
                    ? EXECUTION_SESSION_STATUSES.PAUSED
                    : EXECUTION_SESSION_STATUSES.FAILED;
            session.error =
                job.failure;
            session.failedAt =
                canRetry
                    ? null
                    : timestamp;
            session.updatedAt =
                timestamp;

            const receipt =
                this.createExecutionReceipt(
                    job,
                    session,
                    target,
                    {
                        success: false,
                        status:
                            canRetry
                                ? "retry-scheduled"
                                : "failed",
                        evidence:
                            result.evidence || [],
                        details:
                            result.details || {},
                        error:
                            job.failure
                    }
                );

            this.recalculateAnalytics();
            this.persistIfEnabled();

            return {
                success: false,
                retryScheduled:
                    canRetry,
                job:
                    this.clone(job),
                session:
                    this.clone(session),
                receipt
            };
        },

        resumeExecutionJob(
            jobId,
            options = {}
        ) {
            const job =
                this.getExecutionJobById(
                    jobId
                );

            if (!job) {
                return {
                    success: false,
                    error:
                        "Execution job was not found."
                };
            }

            if (
                ![
                    EXECUTION_JOB_STATUSES.PAUSED,
                    EXECUTION_JOB_STATUSES.RETRY_SCHEDULED
                ].includes(
                    job.status
                )
            ) {
                return {
                    success: false,
                    error:
                        "Execution job is not paused or awaiting retry."
                };
            }

            job.status =
                EXECUTION_JOB_STATUSES.READY;
            job.resumedAt =
                new Date().toISOString();
            job.nextRetryAt =
                null;
            job.updatedAt =
                job.resumedAt;

            const session =
                this.getExecutionSessionById(
                    job.sessionId
                );

            if (session) {
                session.status =
                    EXECUTION_SESSION_STATUSES.ACTIVE;
                session.resumedAt =
                    job.resumedAt;
                session.updatedAt =
                    job.resumedAt;
            }

            this.logHistory("execution-job.resumed", {
                jobId:
                    job.id,
                actor:
                    options.actor ||
                    "Maddy"
            });

            this.persistIfEnabled();

            return {
                success: true,
                job:
                    this.clone(job),
                session:
                    session
                        ? this.clone(session)
                        : null
            };
        },

        cancelExecutionJob(
            jobId,
            options = {}
        ) {
            const job =
                this.getExecutionJobById(
                    jobId
                );

            if (!job) {
                return {
                    success: false,
                    error:
                        "Execution job was not found."
                };
            }

            if (
                [
                    EXECUTION_JOB_STATUSES.COMPLETE,
                    EXECUTION_JOB_STATUSES.CANCELLED
                ].includes(job.status)
            ) {
                return {
                    success: false,
                    error:
                        "Execution job cannot be cancelled from its current status."
                };
            }

            job.status =
                EXECUTION_JOB_STATUSES.CANCELLED;
            job.updatedAt =
                new Date().toISOString();
            job.cancelledBy =
                options.actor ||
                "Executive";
            job.cancelReason =
                options.reason ||
                "";

            const session =
                this.getExecutionSessionById(
                    job.sessionId
                );

            if (session) {
                session.status =
                    EXECUTION_SESSION_STATUSES.FAILED;
                session.updatedAt =
                    job.updatedAt;
                session.error = {
                    code:
                        "EXECUTION_CANCELLED",
                    message:
                        job.cancelReason ||
                        "Execution cancelled."
                };
            }

            this.logHistory("execution-job.cancelled", {
                jobId:
                    job.id,
                actor:
                    job.cancelledBy
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();

            return {
                success: true,
                job:
                    this.clone(job)
            };
        },

        createExecutionReceipt(
            job,
            session,
            target,
            input = {}
        ) {
            const receipt = {
                id:
                    this.createId(
                        "execution-receipt"
                    ),
                jobId:
                    job.id,
                sessionId:
                    session.id,
                targetId:
                    target.id,
                targetType:
                    target.type,
                capability:
                    job.capability,
                success:
                    input.success === true,
                status:
                    input.status ||
                    (
                        input.success
                            ? "complete"
                            : "failed"
                    ),
                createdAt:
                    new Date().toISOString(),
                externalReference:
                    input.externalReference ||
                    null,
                checkpoint:
                    input.checkpoint ||
                    null,
                evidence:
                    this.clone(
                        input.evidence || []
                    ),
                details:
                    this.clone(
                        input.details || {}
                    ),
                error:
                    input.error
                        ? this.clone(
                            input.error
                        )
                        : null
            };

            this.executionReceipts.unshift(
                receipt
            );
            job.receiptIds.push(
                receipt.id
            );

            if (
                this.executionReceipts.length >
                this.configuration.maximumExecutionReceipts
            ) {
                this.executionReceipts.length =
                    this.configuration.maximumExecutionReceipts;
            }

            this.logHistory("execution-receipt.created", {
                receiptId:
                    receipt.id,
                jobId:
                    job.id,
                targetType:
                    target.type,
                status:
                    receipt.status
            });

            return this.clone(
                receipt
            );
        },

        getExecutionTargetById(targetId) {
            return (
                this.executionTargets.find(
                    (target) =>
                        target.id === targetId
                ) ||
                null
            );
        },

        getExecutionJobById(jobId) {
            return (
                this.executionJobs.find(
                    (job) =>
                        job.id === jobId
                ) ||
                null
            );
        },

        getExecutionSessionById(
            sessionId
        ) {
            return (
                this.executionSessions.find(
                    (session) =>
                        session.id === sessionId
                ) ||
                null
            );
        },

        getExecutionReceiptById(
            receiptId
        ) {
            return (
                this.executionReceipts.find(
                    (receipt) =>
                        receipt.id === receiptId
                ) ||
                null
            );
        },

        listExecutionTargets(filters = {}) {
            return this.executionTargets
                .filter((target) => {
                    if (
                        filters.type &&
                        target.type !== filters.type
                    ) {
                        return false;
                    }

                    if (
                        filters.capability &&
                        !target.capabilities.includes(
                            filters.capability
                        )
                    ) {
                        return false;
                    }

                    if (
                        filters.status &&
                        target.status !== filters.status
                    ) {
                        return false;
                    }

                    return true;
                })
                .map(
                    (target) =>
                        this.clone(target)
                );
        },

        runUniversalExecutionAcceptanceTest() {
            const originalPersistence =
                this.configuration
                    .automaticPersistence;

            this.configuration
                .automaticPersistence =
                false;

            const suffix =
                this.createId("test");

            try {
                const linkedinTarget =
                    this.executionTargets.find(
                        (target) =>
                            target.type ===
                            EXECUTION_TARGET_TYPES.LINKEDIN
                    ) ||
                    this.registerExecutionTarget({
                        id:
                            `linkedin-${suffix}`,
                        name:
                            "LinkedIn",
                        type:
                            EXECUTION_TARGET_TYPES.LINKEDIN,
                        capabilities: [
                            EXECUTION_CAPABILITIES.POST,
                            EXECUTION_CAPABILITIES.REPLY,
                            EXECUTION_CAPABILITIES.CAPTURE_EVIDENCE
                        ],
                        requiresExecutiveApproval:
                            true,
                        supportsDrafts:
                            true,
                        supportsResume:
                            true
                    }).target;

                const adapterId =
                    `acceptance-adapter-${suffix}`;

                const adapterRegistration =
                    this.registerExecutionAdapter(
                        adapterId,
                        {
                            name:
                                "Acceptance Test Adapter",
                            version:
                                "1.0.0",
                            capabilities: [
                                EXECUTION_CAPABILITIES.POST,
                                EXECUTION_CAPABILITIES.REPLY
                            ],
                            execute:
                                ({ job }) => ({
                                    success: true,
                                    externalReference:
                                        `external-${job.id}`,
                                    evidence: [
                                        {
                                            type:
                                                "screenshot-placeholder",
                                            uri:
                                                `evidence://${job.id}`
                                        }
                                    ],
                                    details: {
                                        published:
                                            true,
                                        targetType:
                                            job.targetType
                                    }
                                })
                        },
                        {
                            actor:
                                "MEOS Acceptance Test"
                        }
                    );

                const liveTarget =
                    this.getExecutionTargetById(
                        linkedinTarget.id
                    );

                liveTarget.adapterId =
                    adapterId;

                const creation =
                    this.createExecutionJob(
                        {
                            name:
                                "LinkedIn Post Acceptance Test",
                            targetId:
                                liveTarget.id,
                            capability:
                                EXECUTION_CAPABILITIES.POST,
                            payload: {
                                text:
                                    "Acceptance test post."
                            },
                            effects: {
                                external:
                                    true
                            },
                            requestedBy:
                                "Maddy"
                        }
                    );

                const blocked =
                    this.executeExecutionJob(
                        creation.job.id
                    );

                const approval =
                    this.approveExecutionJob(
                        creation.approval.id,
                        {
                            actor:
                                "Acceptance Test Executive"
                        }
                    );

                const execution =
                    this.executeExecutionJob(
                        creation.job.id
                    );

                const receipt =
                    execution.receipt;
                const finalJob =
                    this.getExecutionJobById(
                        creation.job.id
                    );
                const finalSession =
                    this.getExecutionSessionById(
                        finalJob.sessionId
                    );

                const checks = [
                    {
                        name:
                            "LinkedIn registered as first-class execution target",
                        passed:
                            liveTarget.type ===
                            EXECUTION_TARGET_TYPES.LINKEDIN &&
                            liveTarget.capabilities.includes(
                                EXECUTION_CAPABILITIES.POST
                            )
                    },
                    {
                        name:
                            "Universal execution adapter registered",
                        passed:
                            adapterRegistration.success ===
                            true
                    },
                    {
                        name:
                            "External execution job created",
                        passed:
                            creation.success === true &&
                            creation.job.targetType ===
                            EXECUTION_TARGET_TYPES.LINKEDIN
                    },
                    {
                        name:
                            "Executive approval gate enforced",
                        passed:
                            blocked.success === false &&
                            blocked.code ===
                            "EXECUTION_APPROVAL_REQUIRED"
                    },
                    {
                        name:
                            "Executive approval recorded",
                        passed:
                            approval.success === true &&
                            approval.job.status ===
                            EXECUTION_JOB_STATUSES.READY
                    },
                    {
                        name:
                            "Execution session created",
                        passed:
                            Boolean(
                                finalSession?.id
                            )
                    },
                    {
                        name:
                            "Adapter executed approved action",
                        passed:
                            execution.success === true &&
                            finalJob.status ===
                            EXECUTION_JOB_STATUSES.COMPLETE
                    },
                    {
                        name:
                            "Execution evidence preserved",
                        passed:
                            Array.isArray(
                                receipt.evidence
                            ) &&
                            receipt.evidence.length ===
                            1
                    },
                    {
                        name:
                            "Execution receipt created",
                        passed:
                            Boolean(
                                receipt.id
                            ) &&
                            receipt.status ===
                            "complete"
                    },
                    {
                        name:
                            "Full audit trail preserved",
                        passed:
                            this.history.some(
                                (entry) =>
                                    entry.action ===
                                    "execution-job.created" &&
                                    entry.details.jobId ===
                                    finalJob.id
                            ) &&
                            this.history.some(
                                (entry) =>
                                    entry.action ===
                                    "execution-receipt.created" &&
                                    entry.details.jobId ===
                                    finalJob.id
                            )
                    }
                ];

                return {
                    success:
                        checks.every(
                            (check) =>
                                check.passed
                        ),
                    passed:
                        checks.filter(
                            (check) =>
                                check.passed
                        ).length,
                    total:
                        checks.length,
                    checks,
                    targetType:
                        liveTarget.type,
                    finalJobStatus:
                        finalJob.status,
                    receiptStatus:
                        receipt.status,
                    evidenceCount:
                        receipt.evidence.length
                };
            } finally {
                this.configuration
                    .automaticPersistence =
                    originalPersistence;
            }
        },

        scan(contextProvider = null) {
            const contexts =
                typeof contextProvider === "function"
                    ? contextProvider()
                    : this.collectSystemContexts();

            const contextList =
                Array.isArray(contexts)
                    ? contexts
                    : [contexts];

            const results = [];

            this.rules
                .filter(
                    (rule) =>
                        rule.status ===
                        RULE_STATUSES.ACTIVE
                )
                .forEach((rule) => {
                    contextList.forEach((context) => {
                        const evaluation =
                            this.evaluateRule(
                                rule,
                                context || {}
                            );

                        if (evaluation.matched) {
                            results.push(
                                this.runRule(
                                    rule.id,
                                    context || {}
                                )
                            );
                        }
                    });
                });

            this.analytics.lastScanAt =
                new Date().toISOString();

            this.recalculateAnalytics();
            this.persistIfEnabled();

            this.emit("automation:scan-complete", {
                resultCount: results.length,
                scannedAt:
                    this.analytics.lastScanAt
            });

            return {
                success: true,
                resultCount: results.length,
                results
            };
        },

        collectSystemContexts() {
            const contexts = [];

            const workflows =
                global.ExecutiveWorkflow?.workflows ||
                [];

            workflows.forEach((workflow) => {
                contexts.push({
                    entityType: "workflow",
                    subjectId: workflow.id,
                    workflowId: workflow.id,
                    status: workflow.status,
                    priority:
                        workflow.priority,
                    office:
                        workflow.executiveOwner,
                    percentComplete:
                        workflow.metrics?.percentComplete ||
                        0,
                    blockedSteps:
                        workflow.metrics?.blockedSteps ||
                        0,
                    pendingApprovals:
                        workflow.metrics?.pendingApprovalCount ||
                        0,
                    targetDate:
                        workflow.targetDate,
                    updatedAt:
                        workflow.updatedAt,
                    raw: workflow
                });

                workflow.steps.forEach((step) => {
                    contexts.push({
                        entityType: "workflow-step",
                        subjectId: step.id,
                        workflowId: workflow.id,
                        stepId: step.id,
                        status: step.status,
                        priority: step.priority,
                        office: step.office,
                        owner: step.owner,
                        targetDate: step.targetDate,
                        blockerCount:
                            step.blockers?.length || 0,
                        escalationLevel:
                            step.escalationLevel || 0,
                        updatedAt: step.updatedAt,
                        raw: step
                    });
                });
            });

            const missions =
                global.MEOSMissionEngine?.missions ||
                global.MEOSMissionEngine?.state?.missions ||
                [];

            missions.forEach((mission) => {
                contexts.push({
                    entityType: "mission",
                    subjectId: mission.id,
                    missionId: mission.id,
                    status: mission.status,
                    priority: mission.priority,
                    office:
                        mission.office ||
                        mission.assignedOffice,
                    targetDate:
                        mission.dueDate ||
                        mission.targetDate,
                    updatedAt:
                        mission.updatedAt,
                    raw: mission
                });
            });

            const decisions =
                global.ExecutiveDecision?.decisions ||
                [];

            decisions.forEach((decision) => {
                contexts.push({
                    entityType: "decision",
                    subjectId: decision.id,
                    decisionId: decision.id,
                    status: decision.status,
                    confidence:
                        decision.recommendation?.confidence ||
                        0,
                    recommendationType:
                        decision.recommendation?.type,
                    selectedOptionId:
                        decision.selectedOptionId,
                    updatedAt:
                        decision.updatedAt,
                    raw: decision
                });
            });

            return contexts;
        },

        evaluateTrigger(trigger, context) {
            const type = trigger.type;

            switch (type) {
                case "entity-status":
                    return {
                        matched:
                            (!trigger.entityType ||
                                context.entityType ===
                                    trigger.entityType) &&
                            context.status === trigger.status
                    };

                case "deadline-within":
                    return this.evaluateDeadlineTrigger(
                        trigger,
                        context
                    );

                case "overdue":
                    return {
                        matched:
                            Boolean(context.targetDate) &&
                            Date.now() >
                                Date.parse(context.targetDate)
                    };

                case "blocked":
                    return {
                        matched:
                            context.status === "blocked" ||
                            Number(context.blockedSteps) > 0 ||
                            Number(context.blockerCount) > 0
                    };

                case "approval-pending":
                    return {
                        matched:
                            context.status ===
                                "awaiting-approval" ||
                            Number(
                                context.pendingApprovals
                            ) > 0
                    };

                case "confidence-below":
                    return {
                        matched:
                            Number(context.confidence) <
                            Number(trigger.threshold)
                    };

                case "manual":
                    return {
                        matched: true
                    };

                default:
                    return {
                        matched: false,
                        reason:
                            `Unsupported trigger type: ${type}`
                    };
            }
        },

        evaluateDeadlineTrigger(trigger, context) {
            if (!context.targetDate) {
                return {
                    matched: false,
                    reason: "Context has no target date."
                };
            }

            const remainingMs =
                Date.parse(context.targetDate) -
                Date.now();

            const thresholdMs =
                Number(trigger.hours || 0) *
                    60 *
                    60 *
                    1000 +
                Number(trigger.days || 0) *
                    24 *
                    60 *
                    60 *
                    1000;

            return {
                matched:
                    remainingMs >= 0 &&
                    remainingMs <= thresholdMs,
                remainingMs,
                thresholdMs
            };
        },

        evaluateCondition(condition, context) {
            const actual =
                this.getByPath(
                    context,
                    condition.field
                );
            const expected =
                condition.value;

            switch (condition.operator) {
                case "equals":
                    return {
                        matched: actual === expected,
                        actual,
                        expected
                    };

                case "not-equals":
                    return {
                        matched: actual !== expected,
                        actual,
                        expected
                    };

                case "greater-than":
                    return {
                        matched:
                            Number(actual) >
                            Number(expected),
                        actual,
                        expected
                    };

                case "less-than":
                    return {
                        matched:
                            Number(actual) <
                            Number(expected),
                        actual,
                        expected
                    };

                case "contains":
                    return {
                        matched:
                            String(actual || "")
                                .toLowerCase()
                                .includes(
                                    String(expected || "")
                                        .toLowerCase()
                                ),
                        actual,
                        expected
                    };

                case "exists":
                    return {
                        matched:
                            actual !== undefined &&
                            actual !== null,
                        actual
                    };

                default:
                    return {
                        matched: false,
                        actual,
                        expected,
                        reason:
                            `Unsupported condition operator: ${condition.operator}`
                    };
            }
        },

        createRun(rule, context) {
            const run = {
                id: this.createId("automation-run"),
                ruleId: rule.id,
                ruleName: rule.name,
                status: RUN_STATUSES.QUEUED,
                context: this.clone(context),
                actionResults: [],
                approvalIds: [],
                createdAt:
                    new Date().toISOString(),
                startedAt: null,
                updatedAt:
                    new Date().toISOString(),
                completedAt: null,
                failedAt: null
            };

            this.runs.unshift(run);

            if (
                this.runs.length >
                this.configuration.maximumRuns
            ) {
                this.runs.length =
                    this.configuration.maximumRuns;
            }

            return run;
        },

        normalizeTrigger(trigger = {}) {
            return {
                type:
                    trigger.type ||
                    "manual",
                entityType:
                    trigger.entityType ||
                    null,
                status:
                    trigger.status ||
                    null,
                threshold:
                    trigger.threshold ??
                    null,
                hours:
                    Number(trigger.hours) || 0,
                days:
                    Number(trigger.days) || 0,
                metadata:
                    trigger.metadata &&
                    typeof trigger.metadata === "object"
                        ? { ...trigger.metadata }
                        : {}
            };
        },

        normalizeCondition(condition = {}) {
            return {
                id:
                    condition.id ||
                    this.createId("automation-condition"),
                field:
                    condition.field ||
                    "",
                operator:
                    condition.operator ||
                    "equals",
                value:
                    condition.value
            };
        },

        normalizeAction(action = {}, index = 0) {
            const type =
                Object.values(ACTION_TYPES).includes(
                    action.type
                )
                    ? action.type
                    : ACTION_TYPES.NOTIFY_EXECUTIVE;

            return {
                id:
                    action.id ||
                    this.createId("automation-action"),
                order: index + 1,
                type,
                payload:
                    action.payload &&
                    typeof action.payload === "object"
                        ? { ...action.payload }
                        : {},
                approvalRequired:
                    action.approvalRequired === true,
                approvalTitle:
                    action.approvalTitle ||
                    null,
                requiredApprovalRole:
                    action.requiredApprovalRole ||
                    null,
                effects: {
                    external:
                        action.effects?.external === true,
                    financial:
                        action.effects?.financial === true,
                    policy:
                        action.effects?.policy === true
                }
            };
        },

        resolveTemplate(value, context) {
            if (Array.isArray(value)) {
                return value.map((item) =>
                    this.resolveTemplate(item, context)
                );
            }

            if (
                value &&
                typeof value === "object"
            ) {
                return Object.fromEntries(
                    Object.entries(value).map(
                        ([key, item]) => [
                            key,
                            this.resolveTemplate(
                                item,
                                context
                            )
                        ]
                    )
                );
            }

            if (typeof value === "string") {
                return this.resolveStringTemplate(
                    value,
                    context
                );
            }

            return value;
        },

        resolveStringTemplate(value, context) {
            return String(value).replace(
                /\{\{\s*([^}]+?)\s*\}\}/g,
                (_, path) => {
                    const resolved =
                        this.getByPath(
                            context,
                            path.trim()
                        );

                    return resolved === undefined ||
                        resolved === null
                        ? ""
                        : String(resolved);
                }
            );
        },

        getByPath(object, path) {
            if (!path) {
                return undefined;
            }

            return String(path)
                .split(".")
                .reduce(
                    (current, key) =>
                        current == null
                            ? undefined
                            : current[key],
                    object
                );
        },

        getRuleById(ruleId) {
            return (
                this.rules.find(
                    (rule) => rule.id === ruleId
                ) || null
            );
        },

        getRunById(runId) {
            return (
                this.runs.find(
                    (run) => run.id === runId
                ) || null
            );
        },

        searchRules(query = "", filters = {}) {
            const normalizedQuery =
                this.normalizeText(query);

            return this.rules
                .filter((rule) => {
                    if (
                        filters.status &&
                        rule.status !== filters.status
                    ) {
                        return false;
                    }

                    if (
                        filters.triggerType &&
                        rule.trigger.type !==
                            filters.triggerType
                    ) {
                        return false;
                    }

                    if (!normalizedQuery) {
                        return true;
                    }

                    const searchable =
                        this.normalizeText(
                            [
                                rule.name,
                                rule.description,
                                rule.trigger.type,
                                ...rule.tags,
                                ...rule.topics,
                                ...rule.actions.map(
                                    (action) => action.type
                                )
                            ].join(" ")
                        );

                    return searchable.includes(
                        normalizedQuery
                    );
                })
                .map((rule) => this.clone(rule));
        },

        startScanner() {
            if (this.scannerId) {
                return {
                    success: true,
                    alreadyRunning: true,
                    intervalMs:
                        this.configuration.scanIntervalMs
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
                        "Automation notification was not found."
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
                "knowledge-system-executive-automation";
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
                    "MEOS Executive Automation Engine",
                summary:
                    "Universal controlled proactive automation with triggers, conditions, approvals, internal actions, monitoring, escalation, and audit history.",
                content:
                    "Executive Automation detects qualifying operational conditions and applies approved automation rules. It does not autonomously approve decisions, spend money, communicate externally, alter policy, or bypass executive authority.",
                tags: [
                    "meos-core",
                    "executive-automation",
                    "system-component"
                ],
                topics: [
                    "automation",
                    "triggers",
                    "conditions",
                    "approvals",
                    "escalation",
                    "proactive-operations"
                ],
                authority: "system",
                confidence: 1,
                sensitivity: "internal",
                officeAccess: ["all"],
                metadata: {
                    componentVersion: this.version,
                    organizationNeutralCore: true,
                    brickBoundary:
                        "Controlled internal automation and approved external execution; no autonomous approval, spending, policy changes, or unapproved external communication."
                },
                createdBy: this.name
            });
        },

        recalculateAnalytics() {
            this.analytics.totalRules =
                this.rules.length;
            this.analytics.activeRules =
                this.rules.filter(
                    (rule) =>
                        rule.status ===
                        RULE_STATUSES.ACTIVE
                ).length;
            this.analytics.totalRuns =
                this.runs.length;
            this.analytics.completedRuns =
                this.runs.filter(
                    (run) =>
                        run.status ===
                        RUN_STATUSES.COMPLETE
                ).length;
            this.analytics.failedRuns =
                this.runs.filter(
                    (run) =>
                        run.status ===
                        RUN_STATUSES.FAILED
                ).length;
            this.analytics.pendingApprovals =
                this.approvals.filter(
                    (approval) =>
                        approval.status === "pending"
                ).length;
            this.analytics.registeredExecutionTargets =
                this.executionTargets.length;
            this.analytics.queuedExecutionJobs =
                this.executionJobs.filter(
                    (job) =>
                        [
                            EXECUTION_JOB_STATUSES.QUEUED,
                            EXECUTION_JOB_STATUSES.AWAITING_APPROVAL,
                            EXECUTION_JOB_STATUSES.READY,
                            EXECUTION_JOB_STATUSES.RETRY_SCHEDULED
                        ].includes(job.status)
                ).length;
            this.analytics.activeExecutionSessions =
                this.executionSessions.filter(
                    (session) =>
                        session.status ===
                        EXECUTION_SESSION_STATUSES.ACTIVE
                ).length;
            this.analytics.completedExecutionJobs =
                this.executionJobs.filter(
                    (job) =>
                        job.status ===
                        EXECUTION_JOB_STATUSES.COMPLETE
                ).length;
            this.analytics.failedExecutionJobs =
                this.executionJobs.filter(
                    (job) =>
                        job.status ===
                        EXECUTION_JOB_STATUSES.FAILED
                ).length;
            this.analytics.executionReceipts =
                this.executionReceipts.length;

            return this.analytics;
        },

        getConnectedSources() {
            return {
                missionEngine:
                    Boolean(global.MEOSMissionEngine),
                missionDispatcher:
                    Boolean(global.MEOSMissionDispatcher),
                executivePlanning:
                    Boolean(global.ExecutivePlanning),
                executiveWorkflow:
                    Boolean(global.ExecutiveWorkflow),
                executiveDecision:
                    Boolean(global.ExecutiveDecision),
                executiveCollaboration:
                    Boolean(global.ExecutiveCollaboration),
                knowledgeEngine:
                    Boolean(global.KnowledgeEngine)
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
                ruleCount:
                    this.rules.length,
                runCount:
                    this.runs.length,
                approvalCount:
                    this.approvals.length,
                notificationCount:
                    this.notifications.length,
                executionTargetCount:
                    this.executionTargets.length,
                executionJobCount:
                    this.executionJobs.length,
                executionSessionCount:
                    this.executionSessions.length,
                executionReceiptCount:
                    this.executionReceipts.length,
                linkedInRegistered:
                    this.executionTargets.some(
                        (target) =>
                            target.type ===
                            EXECUTION_TARGET_TYPES.LINKEDIN
                    ),
                analytics:
                    this.clone(this.analytics),
                initializedAt:
                    this.initializedAt
            };
        },

        exportAutomation(options = {}) {
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
                    rules:
                        this.rules,
                    runs:
                        this.runs,
                    approvals:
                        this.approvals,
                    notifications:
                        this.notifications,
                    executionTargets:
                        this.executionTargets,
                    executionJobs:
                        this.executionJobs,
                    executionSessions:
                        this.executionSessions,
                    executionReceipts:
                        this.executionReceipts,
                    history:
                        options.includeHistory === false
                            ? []
                            : this.history,
                    analytics:
                        this.analytics
                }
            };
        },

        importAutomation(payload, options = {}) {
            let data = payload;

            if (typeof payload === "string") {
                try {
                    data = JSON.parse(payload);
                } catch (error) {
                    return {
                        success: false,
                        error:
                            "The Executive Automation import is not valid JSON."
                    };
                }
            }

            if (!data || data.schema !== SCHEMA) {
                return {
                    success: false,
                    error:
                        "The import is not a MEOS Executive Automation package."
                };
            }

            if (options.replace === true) {
                this.rules = [];
                this.runs = [];
                this.approvals = [];
                this.notifications = [];
                this.history = [];
            }

            this.mergeById(
                this.rules,
                data.rules || []
            );
            this.mergeById(
                this.runs,
                data.runs || []
            );
            this.mergeById(
                this.approvals,
                data.approvals || []
            );
            this.mergeById(
                this.notifications,
                data.notifications || []
            );
            this.mergeById(
                this.executionTargets,
                data.executionTargets || []
            );
            this.mergeById(
                this.executionJobs,
                data.executionJobs || []
            );
            this.mergeById(
                this.executionSessions,
                data.executionSessions || []
            );
            this.mergeById(
                this.executionReceipts,
                data.executionReceipts || []
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

            this.recalculateAnalytics();
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
                if (this.persistence.suspended) {
                    return {
                        success: false,
                        persisted: false,
                        suspended: true,
                        reason: this.persistence.reason
                    };
                }

                return this.persist();
            }

            return {
                success: true,
                persisted: false
            };
        },

        isQuotaExceededError(error) {
            return Boolean(
                error &&
                (
                    error.name === "QuotaExceededError" ||
                    error.code === 22 ||
                    error.code === 1014
                )
            );
        },

        buildPersistenceSnapshot() {
            const limit = (items, maximum) =>
                Array.isArray(items)
                    ? items.slice(-Math.max(0, maximum))
                    : [];

            return {
                schema: SCHEMA,
                version: this.version,
                exportedAt: new Date().toISOString(),
                configuration: this.configuration,
                rules: limit(
                    this.rules,
                    this.configuration.maximumPersistedRules
                ),
                runs: limit(
                    this.runs,
                    this.configuration.maximumPersistedRuns
                ),
                approvals: limit(
                    this.approvals,
                    this.configuration.maximumPersistedApprovals
                ),
                notifications: limit(
                    this.notifications,
                    this.configuration.maximumPersistedNotifications
                ),
                executionTargets: this.executionTargets,
                executionJobs: limit(
                    this.executionJobs,
                    this.configuration.maximumPersistedExecutionJobs
                ),
                executionSessions: limit(
                    this.executionSessions,
                    this.configuration.maximumPersistedExecutionSessions
                ),
                executionReceipts: limit(
                    this.executionReceipts,
                    this.configuration.maximumPersistedExecutionReceipts
                ),
                history: limit(
                    this.history,
                    this.configuration.maximumPersistedHistory
                ),
                analytics: this.analytics
            };
        },

        getPersistenceStatus() {
            return this.clone({
                ...this.persistence,
                enabled: this.configuration.persistenceEnabled,
                automatic: this.configuration.automaticPersistence,
                storageKey: this.configuration.localStorageKey
            });
        },

        retryPersistence() {
            this.persistence.suspended = false;
            this.persistence.reason = null;
            this.persistence.failedAt = null;
            this.persistence.warningIssued = false;
            return this.persist({ force: true });
        },

        persist(options = {}) {
            if (
                !this.configuration.persistenceEnabled
            ) {
                return {
                    success: false,
                    error:
                        "Executive Automation persistence is disabled."
                };
            }

            if (!global.localStorage) {
                return {
                    success: false,
                    error:
                        "Browser local storage is unavailable."
                };
            }

            if (
                this.persistence.suspended &&
                options.force !== true
            ) {
                return {
                    success: false,
                    persisted: false,
                    suspended: true,
                    reason: this.persistence.reason
                };
            }

            try {
                const snapshot =
                    this.buildPersistenceSnapshot();

                global.localStorage.setItem(
                    this.configuration.localStorageKey,
                    JSON.stringify(snapshot)
                );

                this.persistence.suspended = false;
                this.persistence.reason = null;
                this.persistence.failedAt = null;
                this.persistence.warningIssued = false;

                return {
                    success: true,
                    persisted: true,
                    compact: true
                };
            } catch (error) {
                if (this.isQuotaExceededError(error)) {
                    this.persistence.suspended = true;
                    this.persistence.reason =
                        "browser_storage_quota_exceeded";
                    this.persistence.failedAt =
                        new Date().toISOString();

                    if (!this.persistence.warningIssued) {
                        this.persistence.warningIssued = true;
                        console.warn(
                            "[MEOS Executive Automation] Browser persistence suspended after storage quota exhaustion. Automation scanning continues; repeated writes are suppressed until persistence is explicitly retried."
                        );
                    }

                    return {
                        success: false,
                        persisted: false,
                        suspended: true,
                        reason: this.persistence.reason
                    };
                }

                console.error(
                    "[MEOS Executive Automation] Persistence failed:",
                    error
                );

                return {
                    success: false,
                    error: error.message
                };
            }
        },

        runPersistenceAcceptanceTest() {
            const checks = [
                {
                    name: "Automation persistence circuit breaker exists",
                    passed:
                        typeof this.isQuotaExceededError === "function" &&
                        typeof this.retryPersistence === "function"
                },
                {
                    name: "Automatic persistence respects suspension",
                    passed:
                        /this\.persistence\.suspended/.test(
                            this.persistIfEnabled.toString()
                        )
                },
                {
                    name: "Browser snapshot is bounded",
                    passed:
                        typeof this.buildPersistenceSnapshot === "function" &&
                        this.configuration.maximumPersistedHistory === 250 &&
                        this.configuration.maximumPersistedExecutionReceipts === 250
                },
                {
                    name: "Quota exhaustion is recognized",
                    passed:
                        /QuotaExceededError/.test(
                            this.isQuotaExceededError.toString()
                        )
                },
                {
                    name: "Automation scanner remains independent from persistence",
                    passed:
                        typeof this.scan === "function" &&
                        typeof this.startScanner === "function"
                }
            ];

            const passed = checks.every(item => item.passed);
            console.table(checks);
            console.info(
                `[MEOS ${this.version}] Commission 006.016B2 persistence acceptance: ${passed ? "PASS" : "FAIL"}.`
            );

            return {
                commission: "006.016B2",
                version: this.version,
                buildId: this.buildId,
                passed,
                checks,
                persistence: this.getPersistenceStatus()
            };
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
                    this.importAutomation(
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
                    "[MEOS Executive Automation] Stored state could not be restored:",
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
                        "Clearing Executive Automation data requires { confirm: true }."
                };
            }

            this.stopScanner();
            this.rules = [];
            this.runs = [];
            this.approvals = [];
            this.notifications = [];
            this.executionTargets = [];
            this.executionJobs = [];
            this.executionSessions = [];
            this.executionReceipts = [];
            this.executionAdapters = {};
            this.history = [];
            this.analytics = {
                totalRules: 0,
                activeRules: 0,
                totalRuns: 0,
                completedRuns: 0,
                failedRuns: 0,
                pendingApprovals: 0,
                registeredExecutionTargets: 0,
                queuedExecutionJobs: 0,
                activeExecutionSessions: 0,
                completedExecutionJobs: 0,
                failedExecutionJobs: 0,
                executionReceipts: 0,
                lastExecutionAt: null,
                lastScanAt: null,
                lastRunAt: null
            };

            if (global.localStorage) {
                global.localStorage.removeItem(
                    this.configuration.localStorageKey
                );
            }

            this.registerDefaultExecutionTargets();

            if (this.configuration.scannerEnabled) {
                this.startScanner();
            }

            return {
                success: true,
                status: this.getStatus()
            };
        },

        logHistory(action, details = {}) {
            const entry = {
                id: this.createId("automation-history"),
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

            this.analytics.lastRunAt =
                entry.timestamp;

            this.emit(
                "automation:history",
                this.clone(entry)
            );

            return entry;
        },

        normalizePriority(value) {
            const number = Number(value);

            if (!Number.isFinite(number)) {
                return this.configuration.defaultPriority;
            }

            return Math.max(
                0,
                Math.min(
                    100,
                    Math.round(number)
                )
            );
        },

        addMinutes(value, minutes) {
            const date = new Date(value);

            date.setUTCMinutes(
                date.getUTCMinutes() +
                Number(minutes || 0)
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
                        `[MEOS Executive Automation] Event listener failed for "${eventName}":`,
                        error
                    );
                }
            });
        }
    };

    ExecutiveAutomation.RULE_STATUSES =
        RULE_STATUSES;
    ExecutiveAutomation.RUN_STATUSES =
        RUN_STATUSES;
    ExecutiveAutomation.ACTION_TYPES =
        ACTION_TYPES;
    ExecutiveAutomation.EXECUTION_TARGET_TYPES =
        EXECUTION_TARGET_TYPES;
    ExecutiveAutomation.EXECUTION_CAPABILITIES =
        EXECUTION_CAPABILITIES;
    ExecutiveAutomation.EXECUTION_JOB_STATUSES =
        EXECUTION_JOB_STATUSES;
    ExecutiveAutomation.EXECUTION_SESSION_STATUSES =
        EXECUTION_SESSION_STATUSES;

    global.ExecutiveAutomation =
        ExecutiveAutomation;
    ExecutiveAutomation.initialize();
})(window);
