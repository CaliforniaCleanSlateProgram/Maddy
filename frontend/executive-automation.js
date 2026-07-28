/*
 * MEOS Executive Automation Engine
 * Version: 1.0.0
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

    const ExecutiveAutomation = {
        name: "MEOS Executive Automation Engine",
        version: "1.0.0",
        status: "initializing",
        operatingMode: "controlled-proactive-automation",

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
            allowAutomaticDraftCreation: true
        },

        rules: [],
        runs: [],
        approvals: [],
        notifications: [],
        history: [],
        scannerId: null,
        eventListeners: {},
        initializedAt: null,

        analytics: {
            totalRules: 0,
            activeRules: 0,
            totalRuns: 0,
            completedRuns: 0,
            failedRuns: 0,
            pendingApprovals: 0,
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
            this.recalculateAnalytics();

            if (
                this.configuration.scannerEnabled &&
                options.startScanner !== false
            ) {
                this.startScanner();
            }

            console.info(
                `[MEOS] ${this.name} v${this.version} ${this.status}.`
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
                        "Controlled internal automation only; no autonomous approval, spending, policy changes, or external communication."
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

            try {
                global.localStorage.setItem(
                    this.configuration.localStorageKey,
                    JSON.stringify(
                        this.exportAutomation({
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
                    "[MEOS Executive Automation] Persistence failed:",
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
            this.history = [];
            this.analytics = {
                totalRules: 0,
                activeRules: 0,
                totalRuns: 0,
                completedRuns: 0,
                failedRuns: 0,
                pendingApprovals: 0,
                lastScanAt: null,
                lastRunAt: null
            };

            if (global.localStorage) {
                global.localStorage.removeItem(
                    this.configuration.localStorageKey
                );
            }

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

    global.ExecutiveAutomation =
        ExecutiveAutomation;
    ExecutiveAutomation.initialize();
})(window);
