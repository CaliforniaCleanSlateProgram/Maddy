/*
 * MEOS Executive Monitoring Engine
 * Version: 1.0.0
 *
 * Mission:
 * Continuously observe MEOS operational state, detect risks, deadline pressure,
 * stalled work, low-confidence decisions, workload imbalance, duplicate work,
 * repeated automation failures, and unresolved executive conditions.
 *
 * Brick boundary:
 * This engine observes, scores, alerts, and recommends. It does not approve
 * decisions, spend money, contact external parties, alter policy, or execute
 * corrective action without an authorized workflow or approval.
 */

(function initializeExecutiveMonitoring(global) {
    "use strict";

    const STORAGE_KEY = "meos.executive-monitoring.v1";
    const SCHEMA = "meos.executive-monitoring.package.v1";

    const ALERT_STATUSES = {
        OPEN: "open",
        ACKNOWLEDGED: "acknowledged",
        RESOLVED: "resolved",
        DISMISSED: "dismissed",
        ARCHIVED: "archived"
    };

    const SEVERITY = {
        INFO: 1,
        LOW: 2,
        MODERATE: 3,
        HIGH: 4,
        CRITICAL: 5
    };

    const ExecutiveMonitoring = {
        name: "MEOS Executive Monitoring Engine",
        version: "1.0.0",
        status: "initializing",
        operatingMode: "continuous-executive-oversight",

        configuration: {
            persistenceEnabled: true,
            automaticPersistence: true,
            localStorageKey: STORAGE_KEY,
            organizationNeutralCore: true,
            scanIntervalMs: 15000,
            scannerEnabled: true,
            maximumAlerts: 5000,
            maximumHistory: 5000,
            deadlineWarningDays: 10,
            deadlineCriticalDays: 3,
            inactivityWarningHours: 72,
            stalledWorkflowHours: 48,
            lowDecisionConfidenceThreshold: 0.6,
            automationFailureThreshold: 3,
            workloadImbalanceThreshold: 0.45,
            duplicateSimilarityThreshold: 0.86,
            requireExecutiveApprovalForCorrectiveAction: true,
            automaticNotificationEnabled: true,
            automaticAutomationHandoffEnabled: true
        },

        alerts: [],
        snapshots: [],
        history: [],
        eventListeners: {},
        scannerId: null,
        initializedAt: null,

        analytics: {
            totalAlerts: 0,
            openAlerts: 0,
            criticalAlerts: 0,
            highAlerts: 0,
            resolvedAlerts: 0,
            lastScanAt: null,
            lastAlertAt: null,
            monitoredEntityCount: 0
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

            this.emit("monitoring:online", this.getStatus());
            return this.getStatus();
        },

        scan(options = {}) {
            const startedAt = Date.now();
            const snapshot = this.collectSnapshot();

            const detections = [
                ...this.detectDeadlinePressure(snapshot),
                ...this.detectStalledWork(snapshot),
                ...this.detectBlockedWork(snapshot),
                ...this.detectLowConfidenceDecisions(snapshot),
                ...this.detectAutomationFailures(snapshot),
                ...this.detectWorkloadImbalance(snapshot),
                ...this.detectDuplicateWork(snapshot),
                ...this.detectPendingApprovals(snapshot),
                ...this.detectUnresolvedCollaboration(snapshot),
                ...this.detectInactiveOffices(snapshot)
            ];

            const createdAlerts = [];
            const refreshedAlerts = [];

            detections.forEach((detection) => {
                const result = this.upsertAlert(detection);

                if (result.created) {
                    createdAlerts.push(result.alert);
                } else if (result.refreshed) {
                    refreshedAlerts.push(result.alert);
                }
            });

            this.resolveMissingAlerts(detections);

            const completedAt = Date.now();

            const scanRecord = {
                id: this.createId("monitoring-snapshot"),
                scannedAt: new Date().toISOString(),
                durationMs: completedAt - startedAt,
                entityCounts: snapshot.entityCounts,
                detectionCount: detections.length,
                createdAlertCount: createdAlerts.length,
                refreshedAlertCount: refreshedAlerts.length
            };

            this.snapshots.unshift(scanRecord);

            if (this.snapshots.length > 500) {
                this.snapshots.length = 500;
            }

            this.analytics.lastScanAt = scanRecord.scannedAt;
            this.analytics.monitoredEntityCount =
                Object.values(snapshot.entityCounts)
                    .reduce((sum, value) => sum + value, 0);

            this.recalculateAnalytics();
            this.persistIfEnabled();

            this.emit("monitoring:scan-complete", {
                scan: this.clone(scanRecord),
                createdAlerts: this.clone(createdAlerts),
                refreshedAlerts: this.clone(refreshedAlerts)
            });

            if (
                this.configuration.automaticAutomationHandoffEnabled &&
                options.skipAutomationHandoff !== true
            ) {
                createdAlerts.forEach((alert) =>
                    this.handoffAlertToAutomation(alert)
                );
            }

            return {
                success: true,
                scan: scanRecord,
                createdAlerts,
                refreshedAlerts,
                openAlerts: this.getOpenAlerts()
            };
        },

        collectSnapshot() {
            const missions =
                global.MEOSMissionEngine?.missions ||
                global.MEOSMissionEngine?.state?.missions ||
                [];

            const workflows =
                global.ExecutiveWorkflow?.workflows ||
                [];

            const decisions =
                global.ExecutiveDecision?.decisions ||
                [];

            const collaborations =
                global.ExecutiveCollaboration?.sessions ||
                [];

            const automations =
                global.ExecutiveAutomation?.runs ||
                [];

            const plans =
                global.ExecutivePlanning?.plans ||
                [];

            const knowledgeRecords =
                global.KnowledgeEngine?.records ||
                global.KnowledgeEngine?.state?.records ||
                [];

            const offices =
                this.getExecutiveOffices();

            return {
                collectedAt: new Date().toISOString(),
                missions,
                workflows,
                decisions,
                collaborations,
                automations,
                plans,
                knowledgeRecords,
                offices,
                entityCounts: {
                    missions: missions.length,
                    workflows: workflows.length,
                    decisions: decisions.length,
                    collaborations: collaborations.length,
                    automations: automations.length,
                    plans: plans.length,
                    knowledgeRecords: knowledgeRecords.length,
                    offices: offices.length
                }
            };
        },

        detectDeadlinePressure(snapshot) {
            const detections = [];
            const now = Date.now();

            const inspect = (
                items,
                entityType,
                getTitle,
                getDate,
                getStatus
            ) => {
                items.forEach((item) => {
                    const status = String(getStatus(item) || "").toLowerCase();

                    if (
                        [
                            "complete",
                            "completed",
                            "cancelled",
                            "archived",
                            "closed"
                        ].includes(status)
                    ) {
                        return;
                    }

                    const dateValue = getDate(item);

                    if (!dateValue) {
                        return;
                    }

                    const due = Date.parse(dateValue);

                    if (!Number.isFinite(due)) {
                        return;
                    }

                    const daysRemaining =
                        (due - now) / (1000 * 60 * 60 * 24);

                    let severity = null;
                    let category = "deadline-pressure";

                    if (daysRemaining < 0) {
                        severity = SEVERITY.CRITICAL;
                        category = "overdue";
                    } else if (
                        daysRemaining <=
                        this.configuration.deadlineCriticalDays
                    ) {
                        severity = SEVERITY.HIGH;
                    } else if (
                        daysRemaining <=
                        this.configuration.deadlineWarningDays
                    ) {
                        severity = SEVERITY.MODERATE;
                    }

                    if (!severity) {
                        return;
                    }

                    detections.push({
                        key:
                            `${category}:${entityType}:${item.id}`,
                        category,
                        severity,
                        title:
                            daysRemaining < 0
                                ? `${entityType} overdue: ${getTitle(item)}`
                                : `${entityType} deadline approaching: ${getTitle(item)}`,
                        message:
                            daysRemaining < 0
                                ? `${getTitle(item)} is overdue by ${Math.abs(Math.ceil(daysRemaining))} day(s).`
                                : `${getTitle(item)} is due in ${Math.ceil(daysRemaining)} day(s).`,
                        entityType,
                        entityId: item.id,
                        office:
                            item.office ||
                            item.assignedOffice ||
                            item.executiveOwner ||
                            null,
                        dueDate: new Date(due).toISOString(),
                        metricValue:
                            Number(daysRemaining.toFixed(2)),
                        recommendedAction:
                            daysRemaining < 0
                                ? "Escalate immediately, confirm ownership, and create a recovery plan."
                                : "Confirm readiness, ownership, dependencies, and next required action.",
                        metadata: {
                            status,
                            daysRemaining
                        }
                    });
                });
            };

            inspect(
                snapshot.missions,
                "mission",
                (item) => item.title || item.objective || item.id,
                (item) => item.dueDate || item.targetDate,
                (item) => item.status
            );

            inspect(
                snapshot.workflows,
                "workflow",
                (item) => item.title || item.id,
                (item) => item.targetDate,
                (item) => item.status
            );

            inspect(
                snapshot.plans,
                "plan",
                (item) => item.title || item.objective || item.id,
                (item) => item.targetDate,
                (item) => item.status
            );

            return detections;
        },

        detectStalledWork(snapshot) {
            const detections = [];
            const thresholdMs =
                this.configuration.stalledWorkflowHours *
                60 *
                60 *
                1000;
            const now = Date.now();

            snapshot.workflows.forEach((workflow) => {
                if (
                    ![
                        "active",
                        "blocked",
                        "ready",
                        "paused"
                    ].includes(String(workflow.status || "").toLowerCase())
                ) {
                    return;
                }

                const updatedAt =
                    Date.parse(
                        workflow.updatedAt ||
                        workflow.activatedAt ||
                        workflow.createdAt
                    );

                if (!Number.isFinite(updatedAt)) {
                    return;
                }

                const idleMs = now - updatedAt;

                if (idleMs < thresholdMs) {
                    return;
                }

                detections.push({
                    key: `stalled-workflow:${workflow.id}`,
                    category: "stalled-work",
                    severity:
                        idleMs >= thresholdMs * 2
                            ? SEVERITY.HIGH
                            : SEVERITY.MODERATE,
                    title:
                        `Workflow may be stalled: ${workflow.title || workflow.id}`,
                    message:
                        `No material workflow update has been recorded for ${Math.floor(idleMs / (60 * 60 * 1000))} hour(s).`,
                    entityType: "workflow",
                    entityId: workflow.id,
                    office:
                        workflow.executiveOwner ||
                        null,
                    recommendedAction:
                        "Confirm the active owner, review blockers, and either advance, pause, or replan the workflow.",
                    metadata: {
                        idleHours:
                            idleMs / (60 * 60 * 1000),
                        status: workflow.status
                    }
                });
            });

            snapshot.missions.forEach((mission) => {
                if (
                    ![
                        "active",
                        "in-progress",
                        "assigned",
                        "pending"
                    ].includes(String(mission.status || "").toLowerCase())
                ) {
                    return;
                }

                const updatedAt =
                    Date.parse(
                        mission.updatedAt ||
                        mission.createdAt
                    );

                if (!Number.isFinite(updatedAt)) {
                    return;
                }

                const idleMs = now - updatedAt;

                if (idleMs < thresholdMs) {
                    return;
                }

                detections.push({
                    key: `stalled-mission:${mission.id}`,
                    category: "stalled-work",
                    severity: SEVERITY.MODERATE,
                    title:
                        `Mission may be stalled: ${mission.title || mission.id}`,
                    message:
                        `No material mission update has been recorded for ${Math.floor(idleMs / (60 * 60 * 1000))} hour(s).`,
                    entityType: "mission",
                    entityId: mission.id,
                    office:
                        mission.office ||
                        mission.assignedOffice ||
                        null,
                    recommendedAction:
                        "Confirm ownership, current state, blockers, and next action.",
                    metadata: {
                        idleHours:
                            idleMs / (60 * 60 * 1000),
                        status: mission.status
                    }
                });
            });

            return detections;
        },

        detectBlockedWork(snapshot) {
            const detections = [];

            snapshot.workflows.forEach((workflow) => {
                const blockedSteps =
                    workflow.steps?.filter(
                        (step) =>
                            step.status === "blocked"
                    ) || [];

                if (
                    workflow.status !== "blocked" &&
                    blockedSteps.length === 0
                ) {
                    return;
                }

                detections.push({
                    key: `blocked-workflow:${workflow.id}`,
                    category: "blocked-work",
                    severity:
                        blockedSteps.length >= 3
                            ? SEVERITY.HIGH
                            : SEVERITY.MODERATE,
                    title:
                        `Blocked workflow: ${workflow.title || workflow.id}`,
                    message:
                        `${blockedSteps.length} blocked step(s) are preventing progress.`,
                    entityType: "workflow",
                    entityId: workflow.id,
                    office:
                        workflow.executiveOwner ||
                        null,
                    recommendedAction:
                        "Review each blocker, assign an owner, and establish a resolution deadline.",
                    metadata: {
                        blockedStepIds:
                            blockedSteps.map(
                                (step) => step.id
                            )
                    }
                });
            });

            return detections;
        },

        detectLowConfidenceDecisions(snapshot) {
            return snapshot.decisions
                .filter((decision) => {
                    const confidence =
                        Number(
                            decision.recommendation?.confidence
                        ) || 0;

                    return (
                        decision.status === "awaiting-approval" &&
                        confidence <
                            this.configuration
                                .lowDecisionConfidenceThreshold
                    );
                })
                .map((decision) => ({
                    key: `low-confidence-decision:${decision.id}`,
                    category: "low-confidence-decision",
                    severity: SEVERITY.HIGH,
                    title:
                        `Low-confidence decision: ${decision.title || decision.id}`,
                    message:
                        `Decision confidence is ${Math.round((decision.recommendation?.confidence || 0) * 100)}%.`,
                    entityType: "decision",
                    entityId: decision.id,
                    office:
                        decision.executiveOwner ||
                        "Maddy",
                    recommendedAction:
                        "Gather stronger evidence, resolve conflicts, or request executive collaboration before approval.",
                    metadata: {
                        confidence:
                            decision.recommendation?.confidence ||
                            0,
                        recommendationType:
                            decision.recommendation?.type ||
                            null
                    }
                }));
        },

        detectAutomationFailures(snapshot) {
            const grouped = new Map();

            snapshot.automations
                .filter((run) => run.status === "failed")
                .forEach((run) => {
                    const key = run.ruleId || "unknown-rule";

                    if (!grouped.has(key)) {
                        grouped.set(key, []);
                    }

                    grouped.get(key).push(run);
                });

            const detections = [];

            grouped.forEach((runs, ruleId) => {
                if (
                    runs.length <
                    this.configuration.automationFailureThreshold
                ) {
                    return;
                }

                detections.push({
                    key: `automation-failure-pattern:${ruleId}`,
                    category: "automation-failure",
                    severity:
                        runs.length >=
                        this.configuration.automationFailureThreshold * 2
                            ? SEVERITY.CRITICAL
                            : SEVERITY.HIGH,
                    title:
                        `Repeated automation failure: ${ruleId}`,
                    message:
                        `${runs.length} failed automation run(s) were detected for the same rule.`,
                    entityType: "automation-rule",
                    entityId: ruleId,
                    office: "Maddy",
                    recommendedAction:
                        "Pause the rule, inspect the failed actions, correct the configuration, and test before reactivation.",
                    metadata: {
                        failedRunIds:
                            runs.map((run) => run.id)
                    }
                });
            });

            return detections;
        },

        detectWorkloadImbalance(snapshot) {
            const officeCounts = new Map();

            const addWork = (office, weight = 1) => {
                if (!office) {
                    return;
                }

                officeCounts.set(
                    office,
                    (officeCounts.get(office) || 0) + weight
                );
            };

            snapshot.missions.forEach((mission) => {
                if (
                    ![
                        "complete",
                        "completed",
                        "cancelled",
                        "archived"
                    ].includes(String(mission.status || "").toLowerCase())
                ) {
                    addWork(
                        mission.office ||
                        mission.assignedOffice,
                        1
                    );
                }
            });

            snapshot.workflows.forEach((workflow) => {
                workflow.steps?.forEach((step) => {
                    if (
                        ![
                            "complete",
                            "cancelled",
                            "skipped"
                        ].includes(String(step.status || "").toLowerCase())
                    ) {
                        addWork(step.office, 1.25);
                    }
                });
            });

            const counts = Array.from(officeCounts.entries());

            if (counts.length < 2) {
                return [];
            }

            const values = counts.map(([, value]) => value);
            const total = values.reduce((sum, value) => sum + value, 0);
            const average = total / values.length;
            const maxEntry = counts.sort((a, b) => b[1] - a[1])[0];
            const imbalance =
                average > 0
                    ? (maxEntry[1] - average) / average
                    : 0;

            if (
                imbalance <
                this.configuration.workloadImbalanceThreshold
            ) {
                return [];
            }

            return [
                {
                    key: `workload-imbalance:${maxEntry[0]}`,
                    category: "workload-imbalance",
                    severity:
                        imbalance >= 1
                            ? SEVERITY.HIGH
                            : SEVERITY.MODERATE,
                    title:
                        `Executive workload imbalance: ${maxEntry[0]}`,
                    message:
                        `${maxEntry[0]} carries ${maxEntry[1].toFixed(1)} weighted active work item(s), compared with an office average of ${average.toFixed(1)}.`,
                    entityType: "executive-office",
                    entityId: maxEntry[0],
                    office: maxEntry[0],
                    recommendedAction:
                        "Review office capacity and reassign suitable work before bottlenecks form.",
                    metadata: {
                        officeWorkloads:
                            Object.fromEntries(counts),
                        imbalanceRatio: imbalance
                    }
                }
            ];
        },

        detectDuplicateWork(snapshot) {
            const items = [];

            snapshot.missions.forEach((mission) => {
                if (
                    ![
                        "complete",
                        "completed",
                        "cancelled",
                        "archived"
                    ].includes(String(mission.status || "").toLowerCase())
                ) {
                    items.push({
                        id: mission.id,
                        type: "mission",
                        title:
                            mission.title ||
                            mission.objective ||
                            "",
                        office:
                            mission.office ||
                            mission.assignedOffice ||
                            null
                    });
                }
            });

            snapshot.workflows.forEach((workflow) => {
                workflow.steps?.forEach((step) => {
                    if (
                        ![
                            "complete",
                            "cancelled",
                            "skipped"
                        ].includes(String(step.status || "").toLowerCase())
                    ) {
                        items.push({
                            id: step.id,
                            type: "workflow-step",
                            title: step.title || "",
                            office: step.office || null
                        });
                    }
                });
            });

            const detections = [];

            for (let i = 0; i < items.length; i += 1) {
                for (let j = i + 1; j < items.length; j += 1) {
                    const a = items[i];
                    const b = items[j];

                    if (
                        !a.title ||
                        !b.title ||
                        a.id === b.id
                    ) {
                        continue;
                    }

                    const similarity =
                        this.textSimilarity(
                            a.title,
                            b.title
                        );

                    if (
                        similarity <
                        this.configuration
                            .duplicateSimilarityThreshold
                    ) {
                        continue;
                    }

                    const ids = [a.id, b.id].sort();

                    detections.push({
                        key:
                            `duplicate-work:${ids[0]}:${ids[1]}`,
                        category: "duplicate-work",
                        severity: SEVERITY.MODERATE,
                        title:
                            "Possible duplicate executive work",
                        message:
                            `"${a.title}" and "${b.title}" appear substantially similar.`,
                        entityType: "duplicate-work-pair",
                        entityId: ids.join(":"),
                        office:
                            a.office || b.office || null,
                        recommendedAction:
                            "Confirm whether the work overlaps, then merge, coordinate, or deliberately separate the assignments.",
                        metadata: {
                            first: a,
                            second: b,
                            similarity
                        }
                    });
                }
            }

            return detections;
        },

        detectPendingApprovals(snapshot) {
            const detections = [];

            snapshot.decisions
                .filter(
                    (decision) =>
                        decision.status ===
                        "awaiting-approval"
                )
                .forEach((decision) => {
                    detections.push({
                        key: `pending-decision-approval:${decision.id}`,
                        category: "pending-approval",
                        severity: SEVERITY.MODERATE,
                        title:
                            `Decision awaiting approval: ${decision.title || decision.id}`,
                        message:
                            "An executive decision is ready for review.",
                        entityType: "decision",
                        entityId: decision.id,
                        office:
                            decision.executiveOwner ||
                            "Maddy",
                        recommendedAction:
                            "Review the recommendation, evidence, risks, conditions, and selected option.",
                        metadata: {}
                    });
                });

            snapshot.collaborations
                .filter(
                    (session) =>
                        session.status ===
                        "awaiting-approval"
                )
                .forEach((session) => {
                    detections.push({
                        key:
                            `pending-collaboration-approval:${session.id}`,
                        category: "pending-approval",
                        severity: SEVERITY.MODERATE,
                        title:
                            `Cabinet recommendation awaiting approval: ${session.title || session.id}`,
                        message:
                            "A completed collaboration session is awaiting executive review.",
                        entityType: "collaboration-session",
                        entityId: session.id,
                        office: session.chair || "Maddy",
                        recommendedAction:
                            "Review the consensus, dissent, conditions, and cabinet recommendation.",
                        metadata: {
                            consensusLevel:
                                session.consensus?.level ||
                                null
                        }
                    });
                });

            return detections;
        },

        detectUnresolvedCollaboration(snapshot) {
            return snapshot.collaborations
                .filter((session) => {
                    const unresolved =
                        session.disagreements?.filter(
                            (item) =>
                                item.status === "unresolved"
                        ) || [];

                    return (
                        unresolved.length > 0 &&
                        ![
                            "cancelled",
                            "archived"
                        ].includes(session.status)
                    );
                })
                .map((session) => ({
                    key:
                        `unresolved-collaboration:${session.id}`,
                    category: "unresolved-collaboration",
                    severity:
                        session.disagreements.length >= 3
                            ? SEVERITY.HIGH
                            : SEVERITY.MODERATE,
                    title:
                        `Unresolved cabinet disagreement: ${session.title || session.id}`,
                    message:
                        `${session.disagreements.length} unresolved disagreement(s) remain.`,
                    entityType: "collaboration-session",
                    entityId: session.id,
                    office: session.chair || "Maddy",
                    recommendedAction:
                        "Clarify the disputed assumptions, request evidence, and escalate any material deadlock.",
                    metadata: {
                        disagreementIds:
                            session.disagreements.map(
                                (item) => item.id
                            )
                    }
                }));
        },

        detectInactiveOffices(snapshot) {
            const detections = [];
            const now = Date.now();
            const thresholdMs =
                this.configuration.inactivityWarningHours *
                60 *
                60 *
                1000;

            snapshot.offices.forEach((office) => {
                const lastActivity =
                    this.getOfficeLastActivity(
                        office.name || office.id,
                        snapshot
                    );

                if (!lastActivity) {
                    return;
                }

                const idleMs = now - lastActivity;

                if (idleMs < thresholdMs) {
                    return;
                }

                detections.push({
                    key:
                        `inactive-office:${office.name || office.id}`,
                    category: "office-inactivity",
                    severity: SEVERITY.LOW,
                    title:
                        `Executive office inactivity: ${office.name || office.id}`,
                    message:
                        `No material activity has been recorded for ${Math.floor(idleMs / (60 * 60 * 1000))} hour(s).`,
                    entityType: "executive-office",
                    entityId: office.name || office.id,
                    office: office.name || office.id,
                    recommendedAction:
                        "Confirm whether the office is intentionally idle or whether assigned work requires attention.",
                    metadata: {
                        idleHours:
                            idleMs / (60 * 60 * 1000)
                    }
                });
            });

            return detections;
        },

        upsertAlert(detection) {
            const existing = this.alerts.find(
                (alert) =>
                    alert.key === detection.key &&
                    ![
                        ALERT_STATUSES.RESOLVED,
                        ALERT_STATUSES.DISMISSED,
                        ALERT_STATUSES.ARCHIVED
                    ].includes(alert.status)
            );

            const timestamp = new Date().toISOString();

            if (existing) {
                existing.severity = detection.severity;
                existing.title = detection.title;
                existing.message = detection.message;
                existing.recommendedAction =
                    detection.recommendedAction;
                existing.metadata = detection.metadata || {};
                existing.lastDetectedAt = timestamp;
                existing.detectionCount =
                    (existing.detectionCount || 1) + 1;
                existing.updatedAt = timestamp;

                return {
                    created: false,
                    refreshed: true,
                    alert: this.clone(existing)
                };
            }

            const alert = {
                id: this.createId("executive-alert"),
                key: detection.key,
                category: detection.category,
                severity: detection.severity,
                severityLabel:
                    this.getSeverityLabel(detection.severity),
                status: ALERT_STATUSES.OPEN,
                title: detection.title,
                message: detection.message,
                entityType: detection.entityType,
                entityId: detection.entityId,
                office: detection.office || null,
                dueDate: detection.dueDate || null,
                metricValue:
                    detection.metricValue ?? null,
                recommendedAction:
                    detection.recommendedAction || "",
                metadata: detection.metadata || {},
                firstDetectedAt: timestamp,
                lastDetectedAt: timestamp,
                updatedAt: timestamp,
                acknowledgedAt: null,
                acknowledgedBy: null,
                resolvedAt: null,
                resolvedBy: null,
                resolution: "",
                detectionCount: 1,
                automationHandoffId: null
            };

            this.alerts.unshift(alert);

            if (
                this.alerts.length >
                this.configuration.maximumAlerts
            ) {
                this.alerts.length =
                    this.configuration.maximumAlerts;
            }

            this.analytics.lastAlertAt = timestamp;

            this.logHistory("alert.created", {
                alertId: alert.id,
                category: alert.category,
                severity: alert.severityLabel,
                entityType: alert.entityType,
                entityId: alert.entityId
            });

            if (
                this.configuration.automaticNotificationEnabled
            ) {
                this.notifyExecutive(alert);
            }

            this.emit("monitoring:alert-created", this.clone(alert));

            return {
                created: true,
                refreshed: false,
                alert: this.clone(alert)
            };
        },

        resolveMissingAlerts(currentDetections) {
            const activeKeys =
                new Set(
                    currentDetections.map(
                        (item) => item.key
                    )
                );

            this.alerts.forEach((alert) => {
                if (
                    ![
                        ALERT_STATUSES.OPEN,
                        ALERT_STATUSES.ACKNOWLEDGED
                    ].includes(alert.status)
                ) {
                    return;
                }

                if (!activeKeys.has(alert.key)) {
                    alert.status =
                        ALERT_STATUSES.RESOLVED;
                    alert.resolvedAt =
                        new Date().toISOString();
                    alert.resolvedBy =
                        this.name;
                    alert.resolution =
                        "The monitored condition is no longer present.";
                    alert.updatedAt =
                        alert.resolvedAt;
                }
            });
        },

        acknowledgeAlert(alertId, options = {}) {
            const alert = this.getAlertById(alertId);

            if (!alert) {
                return {
                    success: false,
                    error: "Monitoring alert was not found."
                };
            }

            if (
                alert.status !==
                ALERT_STATUSES.OPEN
            ) {
                return {
                    success: false,
                    error: "Only open alerts may be acknowledged."
                };
            }

            alert.status =
                ALERT_STATUSES.ACKNOWLEDGED;
            alert.acknowledgedAt =
                new Date().toISOString();
            alert.acknowledgedBy =
                options.actor ||
                "Executive";
            alert.updatedAt =
                alert.acknowledgedAt;

            this.recalculateAnalytics();
            this.persistIfEnabled();

            return {
                success: true,
                alert: this.clone(alert)
            };
        },

        resolveAlert(alertId, options = {}) {
            const alert = this.getAlertById(alertId);

            if (!alert) {
                return {
                    success: false,
                    error: "Monitoring alert was not found."
                };
            }

            alert.status =
                ALERT_STATUSES.RESOLVED;
            alert.resolvedAt =
                new Date().toISOString();
            alert.resolvedBy =
                options.actor ||
                "Executive";
            alert.resolution =
                options.resolution ||
                "";
            alert.updatedAt =
                alert.resolvedAt;

            this.logHistory("alert.resolved", {
                alertId,
                actor: alert.resolvedBy
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();

            return {
                success: true,
                alert: this.clone(alert)
            };
        },

        dismissAlert(alertId, options = {}) {
            const alert = this.getAlertById(alertId);

            if (!alert) {
                return {
                    success: false,
                    error: "Monitoring alert was not found."
                };
            }

            alert.status =
                ALERT_STATUSES.DISMISSED;
            alert.dismissedAt =
                new Date().toISOString();
            alert.dismissedBy =
                options.actor ||
                "Executive";
            alert.dismissReason =
                options.reason ||
                "";
            alert.updatedAt =
                alert.dismissedAt;

            this.recalculateAnalytics();
            this.persistIfEnabled();

            return {
                success: true,
                alert: this.clone(alert)
            };
        },

        handoffAlertToAutomation(alertOrId) {
            const alert =
                typeof alertOrId === "string"
                    ? this.getAlertById(alertOrId)
                    : alertOrId;

            if (!alert) {
                return {
                    success: false,
                    error: "Monitoring alert was not found."
                };
            }

            const automation =
                global.ExecutiveAutomation;

            if (
                !automation ||
                typeof automation.scan !== "function"
            ) {
                return {
                    success: false,
                    connected: false,
                    error:
                        "Executive Automation Engine is unavailable."
                };
            }

            const context = {
                entityType: "monitoring-alert",
                subjectId: alert.id,
                alertId: alert.id,
                category: alert.category,
                severity: alert.severity,
                severityLabel: alert.severityLabel,
                status: alert.status,
                office: alert.office,
                message: alert.message,
                recommendedAction:
                    alert.recommendedAction,
                raw: alert
            };

            try {
                const result =
                    automation.scan(() => [context]);

                alert.automationHandoffId =
                    result?.results?.[0]?.run?.id ||
                    null;
                alert.updatedAt =
                    new Date().toISOString();

                return {
                    success: true,
                    result
                };
            } catch (error) {
                console.warn(
                    "[MEOS Executive Monitoring] Automation handoff failed:",
                    error
                );

                return {
                    success: false,
                    error: error.message
                };
            }
        },

        notifyExecutive(alert) {
            const automation =
                global.ExecutiveAutomation;

            if (
                automation?.notifications &&
                Array.isArray(automation.notifications)
            ) {
                automation.notifications.push({
                    id: this.createId("monitoring-notification"),
                    type: "monitoring-alert",
                    title: alert.title,
                    message: alert.message,
                    recipient: "Executive",
                    office: alert.office || "Maddy",
                    status: "unread",
                    createdAt:
                        new Date().toISOString(),
                    readAt: null,
                    metadata: {
                        alertId: alert.id,
                        severity: alert.severityLabel,
                        recommendedAction:
                            alert.recommendedAction
                    }
                });

                return {
                    success: true
                };
            }

            return {
                success: false,
                error:
                    "Executive Automation notifications are unavailable."
            };
        },

        getOpenAlerts(filters = {}) {
            return this.alerts
                .filter((alert) => {
                    if (
                        ![
                            ALERT_STATUSES.OPEN,
                            ALERT_STATUSES.ACKNOWLEDGED
                        ].includes(alert.status)
                    ) {
                        return false;
                    }

                    if (
                        filters.minimumSeverity &&
                        alert.severity <
                            filters.minimumSeverity
                    ) {
                        return false;
                    }

                    if (
                        filters.category &&
                        alert.category !==
                            filters.category
                    ) {
                        return false;
                    }

                    if (
                        filters.office &&
                        alert.office !== filters.office
                    ) {
                        return false;
                    }

                    return true;
                })
                .map((alert) => this.clone(alert));
        },

        getAlertById(alertId) {
            return (
                this.alerts.find(
                    (alert) => alert.id === alertId
                ) || null
            );
        },

        searchAlerts(query = "", filters = {}) {
            const normalizedQuery =
                this.normalizeText(query);

            return this.alerts
                .filter((alert) => {
                    if (
                        filters.status &&
                        alert.status !== filters.status
                    ) {
                        return false;
                    }

                    if (
                        filters.category &&
                        alert.category !==
                            filters.category
                    ) {
                        return false;
                    }

                    if (
                        filters.minimumSeverity &&
                        alert.severity <
                            filters.minimumSeverity
                    ) {
                        return false;
                    }

                    if (!normalizedQuery) {
                        return true;
                    }

                    const searchable =
                        this.normalizeText(
                            [
                                alert.title,
                                alert.message,
                                alert.category,
                                alert.entityType,
                                alert.entityId,
                                alert.office,
                                alert.recommendedAction
                            ].join(" ")
                        );

                    return searchable.includes(
                        normalizedQuery
                    );
                })
                .map((alert) => this.clone(alert));
        },

        getExecutiveOffices() {
            const system =
                global.MEOSExecutiveOffices ||
                global.ExecutiveOffices ||
                global.MEOS;

            const offices =
                system?.offices ||
                system?.state?.offices ||
                [];

            if (!Array.isArray(offices)) {
                return [];
            }

            return offices.map((office) =>
                typeof office === "string"
                    ? {
                        id: office,
                        name: office
                    }
                    : {
                        id:
                            office.id ||
                            office.name ||
                            office.displayName,
                        name:
                            office.name ||
                            office.displayName ||
                            office.id,
                        ...office
                    }
            );
        },

        getOfficeLastActivity(officeName, snapshot) {
            const timestamps = [];

            snapshot.missions.forEach((mission) => {
                const office =
                    mission.office ||
                    mission.assignedOffice;

                if (office === officeName) {
                    timestamps.push(
                        Date.parse(
                            mission.updatedAt ||
                            mission.createdAt
                        )
                    );
                }
            });

            snapshot.workflows.forEach((workflow) => {
                workflow.steps?.forEach((step) => {
                    if (step.office === officeName) {
                        timestamps.push(
                            Date.parse(
                                step.updatedAt ||
                                step.createdAt
                            )
                        );
                    }
                });
            });

            const valid =
                timestamps.filter(Number.isFinite);

            return valid.length > 0
                ? Math.max(...valid)
                : null;
        },

        textSimilarity(a, b) {
            const first =
                new Set(
                    this.normalizeText(a)
                        .split(" ")
                        .filter(Boolean)
                );
            const second =
                new Set(
                    this.normalizeText(b)
                        .split(" ")
                        .filter(Boolean)
                );

            if (first.size === 0 || second.size === 0) {
                return 0;
            }

            const intersection =
                [...first].filter((item) =>
                    second.has(item)
                ).length;

            const union =
                new Set([
                    ...first,
                    ...second
                ]).size;

            return intersection / union;
        },

        getSeverityLabel(value) {
            return (
                Object.entries(SEVERITY)
                    .find(([, number]) =>
                        number === value
                    )?.[0]
                    ?.toLowerCase() ||
                "unknown"
            );
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
                "knowledge-system-executive-monitoring";
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
                    "MEOS Executive Monitoring Engine",
                summary:
                    "Universal continuous executive oversight for deadlines, stalled work, blockers, low-confidence decisions, workload imbalance, duplicate work, approvals, collaboration, and automation failures.",
                content:
                    "Executive Monitoring observes MEOS operational state and produces alerts, recommendations, and controlled automation handoffs. It does not approve decisions, spend money, change policy, contact external parties, or execute corrective action without authorization.",
                tags: [
                    "meos-core",
                    "executive-monitoring",
                    "system-component"
                ],
                topics: [
                    "monitoring",
                    "alerts",
                    "deadlines",
                    "risk-detection",
                    "workload",
                    "oversight"
                ],
                authority: "system",
                confidence: 1,
                sensitivity: "internal",
                officeAccess: ["all"],
                metadata: {
                    componentVersion: this.version,
                    organizationNeutralCore: true,
                    brickBoundary:
                        "Observation, alerts, recommendations, and controlled handoff only; no autonomous corrective execution."
                },
                createdBy: this.name
            });
        },

        recalculateAnalytics() {
            this.analytics.totalAlerts =
                this.alerts.length;
            this.analytics.openAlerts =
                this.alerts.filter(
                    (alert) =>
                        [
                            ALERT_STATUSES.OPEN,
                            ALERT_STATUSES.ACKNOWLEDGED
                        ].includes(alert.status)
                ).length;
            this.analytics.criticalAlerts =
                this.alerts.filter(
                    (alert) =>
                        alert.severity ===
                            SEVERITY.CRITICAL &&
                        [
                            ALERT_STATUSES.OPEN,
                            ALERT_STATUSES.ACKNOWLEDGED
                        ].includes(alert.status)
                ).length;
            this.analytics.highAlerts =
                this.alerts.filter(
                    (alert) =>
                        alert.severity ===
                            SEVERITY.HIGH &&
                        [
                            ALERT_STATUSES.OPEN,
                            ALERT_STATUSES.ACKNOWLEDGED
                        ].includes(alert.status)
                ).length;
            this.analytics.resolvedAlerts =
                this.alerts.filter(
                    (alert) =>
                        alert.status ===
                        ALERT_STATUSES.RESOLVED
                ).length;

            return this.analytics;
        },

        getConnectedSources() {
            return {
                missionEngine:
                    Boolean(global.MEOSMissionEngine),
                executivePlanning:
                    Boolean(global.ExecutivePlanning),
                executiveWorkflow:
                    Boolean(global.ExecutiveWorkflow),
                executiveDecision:
                    Boolean(global.ExecutiveDecision),
                executiveCollaboration:
                    Boolean(global.ExecutiveCollaboration),
                executiveAutomation:
                    Boolean(global.ExecutiveAutomation),
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
                alertCount:
                    this.alerts.length,
                snapshotCount:
                    this.snapshots.length,
                analytics:
                    this.clone(this.analytics),
                initializedAt:
                    this.initializedAt
            };
        },

        exportMonitoring(options = {}) {
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
                    alerts:
                        this.alerts,
                    snapshots:
                        options.includeSnapshots === false
                            ? []
                            : this.snapshots,
                    history:
                        options.includeHistory === false
                            ? []
                            : this.history,
                    analytics:
                        this.analytics
                }
            };
        },

        importMonitoring(payload, options = {}) {
            let data = payload;

            if (typeof payload === "string") {
                try {
                    data = JSON.parse(payload);
                } catch (error) {
                    return {
                        success: false,
                        error:
                            "The Executive Monitoring import is not valid JSON."
                    };
                }
            }

            if (!data || data.schema !== SCHEMA) {
                return {
                    success: false,
                    error:
                        "The import is not a MEOS Executive Monitoring package."
                };
            }

            if (options.replace === true) {
                this.alerts = [];
                this.snapshots = [];
                this.history = [];
            }

            this.mergeById(
                this.alerts,
                data.alerts || []
            );
            this.mergeById(
                this.snapshots,
                data.snapshots || []
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
                        "Executive Monitoring persistence is disabled."
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
                        this.exportMonitoring({
                            includeHistory: true,
                            includeSnapshots: true
                        }).data
                    )
                );

                return {
                    success: true,
                    persisted: true
                };
            } catch (error) {
                console.error(
                    "[MEOS Executive Monitoring] Persistence failed:",
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
                    this.importMonitoring(
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
                    "[MEOS Executive Monitoring] Stored state could not be restored:",
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
                        "Clearing Executive Monitoring data requires { confirm: true }."
                };
            }

            this.stopScanner();
            this.alerts = [];
            this.snapshots = [];
            this.history = [];
            this.analytics = {
                totalAlerts: 0,
                openAlerts: 0,
                criticalAlerts: 0,
                highAlerts: 0,
                resolvedAlerts: 0,
                lastScanAt: null,
                lastAlertAt: null,
                monitoredEntityCount: 0
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
                id: this.createId("monitoring-history"),
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

            this.emit("monitoring:history", this.clone(entry));
            return entry;
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

        mergeById(target, incoming) {
            incoming.forEach((item) => {
                if (!item?.id) {
                    return;
                }

                const index =
                    target.findIndex(
                        (candidate) =>
                            candidate.id === item.id
                    );

                if (index >= 0) {
                    target[index] = {
                        ...target[index],
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
                        `[MEOS Executive Monitoring] Event listener failed for "${eventName}":`,
                        error
                    );
                }
            });
        }
    };

    ExecutiveMonitoring.ALERT_STATUSES =
        ALERT_STATUSES;
    ExecutiveMonitoring.SEVERITY =
        SEVERITY;

    global.ExecutiveMonitoring =
        ExecutiveMonitoring;
    ExecutiveMonitoring.initialize();
})(window);
