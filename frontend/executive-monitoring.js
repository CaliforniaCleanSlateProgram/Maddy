/*
 * MEOS Executive Monitoring Engine
 * Commission Candidate: 006.031H — Governed Monitoring & Follow-up Autonomy
 * Version: 1.1.0
 * Build: EM110-GOVERNED-MONITORING-FOLLOWUP-AUTONOMY-20260817-A
 *
 * Mission:
 * Continuously observe MEOS operational state, detect risks, deadline pressure,
 * stalled work, low-confidence decisions, workload imbalance, duplicate work,
 * repeated automation failures, and unresolved executive conditions while
 * preserving Durable Maddy Autonomy as the only standing autonomy authority.
 *
 * Authority boundary:
 * - Monitoring & Follow-up authority governs self-initiated monitoring scans.
 * - Human-directed monitoring remains available while standing autonomy is OFF.
 * - Browser scanning is compatibility execution only; browser timers create no authority.
 * - Durable temporal wake is not claimed by this browser organ.
 * - This engine observes, scores, alerts, recommends, and may make governed internal
 *   handoffs. It does not approve decisions, spend money, contact external parties,
 *   alter policy, sign, certify, submit, or execute corrective action without authority.
 */

(function initializeExecutiveMonitoring(global) {
    "use strict";

    const STORAGE_KEY = "meos.executive-monitoring.v1";
    const SCHEMA = "meos.executive-monitoring.package.v1";
    const STATE_SCHEMA = "meos.executive-monitoring.persistence-snapshot.v1";
    const COMMISSION = "006.031H";
    const AUTONOMY_CAPABILITY = "monitoring";

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
        version: "1.1.0",
        buildId: "EM110-GOVERNED-MONITORING-FOLLOWUP-AUTONOMY-20260817-A",
        commission: COMMISSION,
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
            browserCacheMaximumAlerts: 100,
            browserCacheMaximumSnapshots: 50,
            browserCacheMaximumHistory: 100,
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
            automaticAutomationHandoffEnabled: true,
            autonomyAuthorityRequired: true,
            browserCompatibilityScannerOnly: true,
            durableTemporalWakeCommissioned: false
        },

        alerts: [],
        snapshots: [],
        history: [],
        eventListeners: {},
        scannerId: null,
        autonomyAuthorityUnsubscribers: [],
        deferredAutonomyBindingInstalled: false,
        autonomy: {
            lastSyncAt: null,
            lastAuthorityRevision: null,
            monitoringEffective: false,
            lastReason: "authority-unproven",
            scannerAuthority: null
        },
        initializedAt: null,

        // Browser persistence is a best-effort continuity cache only.
        // Monitoring remains operational in memory when this cache is unavailable.
        persistenceState: {
            role: "best-effort-browser-monitoring-continuity-cache",
            authority: "live-runtime-and-durable-institutional-state",
            suspended: false,
            reason: null,
            suspendedAt: null,
            failureCount: 0,
            suppressedWriteCount: 0,
            lastFailure: null
        },

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
            this.compactBrowserContinuityCache({
                reason: "startup-quota-hygiene",
                persist: true
            });
            this.initializedAt = new Date().toISOString();
            this.status = "online";

            this.registerSystemKnowledge();
            this.recalculateAnalytics();
            this.bindAutonomyAuthorityEvents();
            this.installDeferredAutonomyBinding();

            if (options.startScanner !== false) {
                this.syncAutonomyRuntime({ reason: "initialize" });
            } else {
                this.stopScanner({
                    reason: "initialize-start-scanner-disabled",
                    silent: true
                });
            }

            console.info(
                `[MEOS] ${this.name} v${this.version} ${this.status}. Build ${this.buildId}.`
            );

            this.emit("monitoring:online", this.getStatus());
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
                    reason: "unsupported-monitoring-autonomy-capability",
                    capabilityId,
                    version: this.version,
                    commission: this.commission,
                    buildId: this.buildId
                };
            }

            return {
                ready: true,
                reason: "governed-monitoring-followup-contract-ready",
                capabilityId,
                version: this.version,
                commission: this.commission,
                buildId: this.buildId,
                authoritySource: "server-durable-maddy-autonomy-authority",
                browserAuthority: false,
                legacyScannerCreatesAuthority: false,
                humanDirectedMonitoringPreserved: true,
                browserCompatibilityScannerAvailable: true,
                browserIndependentRunnerCommissioned: false,
                durableTemporalWakeCommissioned: false,
                automaticSpendAuthorized: false,
                externalActionAuthorized: false,
                signatureAuthorized: false,
                certificationAuthorized: false,
                submissionAuthorized: false,
                legalCommitmentAuthorized: false,
                correctiveActionAuthorized: false,
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
                    reason: "monitoring-autonomy-status-unavailable"
                };
            } catch (error) {
                return {
                    id: AUTONOMY_CAPABILITY,
                    effective: false,
                    uiState: "BLOCKED",
                    reason: "monitoring-autonomy-probe-failed",
                    error: error?.message || String(error)
                };
            }
        },

        isAutonomyAuthorized() {
            const authority = this.getAutonomyAuthority();
            if (
                !authority ||
                typeof authority.isAuthorized !== "function"
            ) {
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
                schema: "meos.executive-monitoring.autonomy-receipt.v1",
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
                        "[MEOS Executive Monitoring] Autonomy synchronization failed.",
                        error
                    );
                    this.stopScanner({
                        reason: "autonomy-sync-failed",
                        silent: true
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
                this.syncAutonomyRuntime({ reason: "window-load" });
            });
            return true;
        },

        syncAutonomyRuntime(options = {}) {
            const monitoring = this.autonomyCapabilityStatus();
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
            this.autonomy.monitoringEffective =
                monitoring?.effective === true;
            this.autonomy.lastReason =
                options.reason ||
                monitoring?.reason ||
                "authority-unproven";

            const scannerAuthorized =
                this.configuration.scannerEnabled === true &&
                this.autonomy.monitoringEffective;

            this.autonomy.scannerAuthority = scannerAuthorized
                ? "central-autonomy-authority"
                : null;

            if (scannerAuthorized) {
                return {
                    synced: true,
                    scannerAuthorized: true,
                    monitoring: this.clone(monitoring),
                    scanner: this.startScanner({
                        authoritySync: true
                    })
                };
            }

            return {
                synced: true,
                scannerAuthorized: false,
                monitoring: this.clone(monitoring),
                scanner: this.stopScanner({
                    reason: "monitoring-autonomy-not-effective",
                    silent: true
                })
            };
        },

        scan(options = {}) {
            const autonomous = options.humanDirected !== true;
            let authorityReceipt = null;

            if (autonomous) {
                if (!this.isAutonomyAuthorized()) {
                    return {
                        success: false,
                        blockedByAutonomy: true,
                        reason: "monitoring-autonomy-not-authorized",
                        monitoring: this.autonomyCapabilityStatus()
                    };
                }
                authorityReceipt = this.captureAutonomyReceipt();
            }

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
                const result = this.upsertAlert(detection, {
                    autonomous,
                    humanDirected: !autonomous,
                    source: options.source || (autonomous
                        ? "autonomy-monitoring-scanner"
                        : "human-directed-monitoring"),
                    authorityReceipt
                });

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
                refreshedAlertCount: refreshedAlerts.length,
                autonomous,
                humanDirected: !autonomous,
                source: options.source || (autonomous
                    ? "autonomy-monitoring-scanner"
                    : "human-directed-monitoring"),
                authorityReceipt: autonomous
                    ? authorityReceipt
                    : null
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
                    this.handoffAlertToAutomation(alert, {
                        autonomous,
                        humanDirected: !autonomous,
                        source: autonomous
                            ? "executive-monitoring-autonomous-handoff"
                            : "executive-monitoring-human-handoff",
                        authorityReceipt
                    })
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

        upsertAlert(detection, options = {}) {
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
                automationHandoffId: null,
                provenance: {
                    autonomous: options.autonomous === true,
                    humanDirected: options.humanDirected === true,
                    source: options.source || null,
                    authorityReceipt: options.autonomous === true
                        ? this.clone(options.authorityReceipt || null)
                        : null
                }
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

        handoffAlertToAutomation(alertOrId, options = {}) {
            const alert =
                typeof alertOrId === "string"
                    ? this.getAlertById(alertOrId)
                    : this.getAlertById(alertOrId?.id) || alertOrId;

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
                    automation.scan(() => [context], {
                        humanDirected: options.humanDirected !== false &&
                            options.autonomous !== true,
                        autonomous: options.autonomous === true,
                        machineInitiated: options.autonomous === true,
                        source: options.source || (options.autonomous === true
                            ? "executive-monitoring-autonomous-handoff"
                            : "executive-monitoring-human-handoff")
                    });

                alert.automationHandoffId =
                    result?.results?.[0]?.run?.id ||
                    null;
                alert.updatedAt =
                    new Date().toISOString();
                alert.automationHandoff = {
                    at: alert.updatedAt,
                    autonomous: options.autonomous === true,
                    humanDirected: options.humanDirected !== false &&
                        options.autonomous !== true,
                    source: options.source || null,
                    authorityReceipt: options.autonomous === true
                        ? this.clone(options.authorityReceipt || null)
                        : null
                };

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

        startScanner(options = {}) {
            if (this.scannerId) {
                return {
                    success: true,
                    alreadyRunning: true,
                    intervalMs:
                        this.configuration.scanIntervalMs,
                    autonomyGoverned: true
                };
            }

            if (this.configuration.scannerEnabled !== true) {
                return {
                    success: false,
                    started: false,
                    reason: "monitoring-scanner-disabled"
                };
            }

            if (!this.isAutonomyAuthorized()) {
                this.autonomy.scannerAuthority = null;
                return {
                    success: false,
                    started: false,
                    reason: "monitoring-scanner-autonomy-not-authorized",
                    monitoring: this.autonomyCapabilityStatus()
                };
            }

            this.autonomy.scannerAuthority =
                "central-autonomy-authority";

            if (options.scanImmediately === true) {
                this.scan({
                    autonomous: true,
                    source: "autonomy-monitoring-scanner"
                });
            }

            this.scannerId = global.setInterval(
                () => this.scan({
                    autonomous: true,
                    source: "autonomy-monitoring-scanner"
                }),
                this.configuration.scanIntervalMs
            );

            return {
                success: true,
                started: true,
                intervalMs:
                    this.configuration.scanIntervalMs,
                autonomyGoverned: true,
                browserCompatibilityScanner: true,
                durableTemporalWakeCommissioned: false
            };
        },

        stopScanner(options = {}) {
            this.autonomy.scannerAuthority = null;

            if (!this.scannerId) {
                return {
                    success: true,
                    running: false,
                    reason: options.reason || null
                };
            }

            global.clearInterval(this.scannerId);
            this.scannerId = null;

            return {
                success: true,
                running: false,
                reason: options.reason || null
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
                    "Executive Monitoring observes MEOS operational state and produces alerts, recommendations, and governed internal automation handoffs. Standing self-initiated monitoring requires Durable Maddy Autonomy Monitoring & Follow-up authority. Human-directed monitoring remains available while standing autonomy is off. Browser scanning is compatibility execution only and does not create authority or durable temporal wake. The engine does not approve decisions, spend money, change policy, contact external parties, sign, certify, submit, or execute corrective action without authorization.",
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
                        "Observation, alerts, recommendations, and governed internal handoff only; no autonomous corrective execution.",
                    autonomyAuthority: "server-durable-maddy-autonomy-authority",
                    monitoringCapabilityId: AUTONOMY_CAPABILITY,
                    browserAuthority: false,
                    durableTemporalWakeCommissioned: false
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
                maddyAutonomyAuthority:
                    Boolean(this.getAutonomyAuthority()),
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
                buildId: this.buildId,
                commission: this.commission,
                status: this.status,
                operatingMode: this.operatingMode,
                organizationNeutralCore:
                    this.configuration.organizationNeutralCore,
                scannerRunning:
                    Boolean(this.scannerId),
                scanIntervalMs:
                    this.configuration.scanIntervalMs,
                autonomy: {
                    integration: this.getAutonomyIntegrationStatus(),
                    capability: this.autonomyCapabilityStatus(),
                    runtime: this.clone(this.autonomy),
                    authorityAvailable: Boolean(this.getAutonomyAuthority()),
                    browserAuthority: false,
                    durableTemporalWakeCommissioned: false
                },
                connectedSources:
                    this.getConnectedSources(),
                alertCount:
                    this.alerts.length,
                snapshotCount:
                    this.snapshots.length,
                analytics:
                    this.clone(this.analytics),
                persistence: this.clone(this.persistenceState),
                persistenceAuthority: {
                    authoritative: "live-runtime-and-durable-institutional-state",
                    browserRole: "best-effort-monitoring-continuity-cache",
                    browserAuthoritative: false,
                    degradationExpandsAuthority: false
                },
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
                        this.analytics,
                    authority: {
                        source: "server-durable-maddy-autonomy-authority",
                        browserAuthority: false,
                        autonomyPolicyStoredHere: false,
                        browserTimerCreatesAuthority: false,
                        durableTemporalWakeCommissioned: false
                    }
                }
            };
        },

        buildRunnerPersistenceSnapshot() {
            const limit = (items, maximum) =>
                Array.isArray(items)
                    ? items.slice(0, Math.max(0, maximum))
                    : [];

            return {
                schema: STATE_SCHEMA,
                version: this.version,
                buildId: this.buildId,
                commission: this.commission,
                capturedAt: new Date().toISOString(),
                operationalConfiguration: {
                    scanIntervalMs: this.configuration.scanIntervalMs,
                    deadlineWarningDays: this.configuration.deadlineWarningDays,
                    deadlineCriticalDays: this.configuration.deadlineCriticalDays,
                    inactivityWarningHours: this.configuration.inactivityWarningHours,
                    stalledWorkflowHours: this.configuration.stalledWorkflowHours,
                    lowDecisionConfidenceThreshold:
                        this.configuration.lowDecisionConfidenceThreshold,
                    automationFailureThreshold:
                        this.configuration.automationFailureThreshold,
                    workloadImbalanceThreshold:
                        this.configuration.workloadImbalanceThreshold,
                    duplicateSimilarityThreshold:
                        this.configuration.duplicateSimilarityThreshold
                },
                alerts: limit(
                    this.alerts,
                    this.configuration.maximumAlerts
                ),
                snapshots: limit(this.snapshots, 500),
                history: limit(
                    this.history,
                    this.configuration.maximumHistory
                ),
                analytics: this.clone(this.analytics),
                authority: {
                    source: "server-durable-maddy-autonomy-authority",
                    browserAuthority: false,
                    autonomyPolicyStoredHere: false,
                    browserTimerCreatesAuthority: false,
                    durableTemporalWakeCommissioned: false
                }
            };
        },

        applyRunnerPersistenceSnapshot(snapshot, options = {}) {
            if (!snapshot || snapshot.schema !== STATE_SCHEMA) {
                return {
                    success: false,
                    applied: false,
                    error: "Executive Monitoring runner persistence snapshot is invalid."
                };
            }

            if (options.replace !== false) {
                this.alerts = [];
                this.snapshots = [];
                this.history = [];
            }

            this.mergeById(this.alerts, snapshot.alerts || []);
            this.mergeById(this.snapshots, snapshot.snapshots || []);
            this.mergeById(this.history, snapshot.history || []);

            if (snapshot.analytics) {
                this.analytics = {
                    ...this.analytics,
                    ...snapshot.analytics
                };
            }

            this.recalculateAnalytics();

            if (options.persistBrowserCache === true) {
                this.persistIfEnabled();
            }

            return {
                success: true,
                applied: true,
                authorityImported: false,
                status: this.getStatus()
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
            if (this.persistenceState.suspended) {
                this.persistenceState.suppressedWriteCount += 1;
                return {
                    success: true,
                    persisted: false,
                    suppressed: true,
                    reason: this.persistenceState.reason
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
                (error.name === "QuotaExceededError" ||
                    error.code === 22 ||
                    error.code === 1014 ||
                    /quota/i.test(String(error.message || "")))
            );
        },

        suspendBrowserPersistence(error) {
            this.persistenceState.suspended = true;
            this.persistenceState.reason = "storage-quota-exhausted";
            this.persistenceState.suspendedAt = new Date().toISOString();
            this.persistenceState.failureCount += 1;
            this.persistenceState.lastFailure = {
                name: error?.name || "Error",
                message: error?.message || String(error || "Unknown persistence failure")
            };

            console.warn(
                "[MEOS Executive Monitoring] Browser monitoring continuity-cache persistence suspended after storage quota exhaustion. Monitoring and scanning remain operational; live runtime plus durable institutional state remain authoritative, and repeated browser writes are suppressed until persistence is explicitly retried."
            );
        },

        retryBrowserPersistence() {
            this.persistenceState.suspended = false;
            this.persistenceState.reason = null;
            this.persistenceState.suspendedAt = null;
            const result = this.persist();
            return {
                ...result,
                persistenceState: this.clone(this.persistenceState)
            };
        },

        buildBrowserContinuityCachePayload() {
            const exported = this.exportMonitoring({
                includeHistory: true,
                includeSnapshots: true
            }).data || {};

            return {
                ...exported,
                alerts: Array.isArray(exported.alerts)
                    ? exported.alerts.slice(0, this.configuration.browserCacheMaximumAlerts)
                    : [],
                snapshots: Array.isArray(exported.snapshots)
                    ? exported.snapshots.slice(0, this.configuration.browserCacheMaximumSnapshots)
                    : [],
                history: Array.isArray(exported.history)
                    ? exported.history.slice(0, this.configuration.browserCacheMaximumHistory)
                    : [],
                browserCache: {
                    role: "best-effort-monitoring-continuity-cache",
                    authoritative: false,
                    compact: true,
                    limits: {
                        alerts: this.configuration.browserCacheMaximumAlerts,
                        snapshots: this.configuration.browserCacheMaximumSnapshots,
                        history: this.configuration.browserCacheMaximumHistory
                    },
                    generatedAt: new Date().toISOString()
                }
            };
        },

        estimateBrowserStorage() {
            const rows = [];
            let totalBytes = 0;

            if (!global.localStorage) {
                return {
                    success: false,
                    available: false,
                    totalApproximateBytes: 0,
                    entries: []
                };
            }

            for (let index = 0; index < global.localStorage.length; index += 1) {
                const key = global.localStorage.key(index);
                const value = key ? global.localStorage.getItem(key) : "";
                const approximateBytes =
                    (String(key || "").length + String(value || "").length) * 2;
                totalBytes += approximateBytes;
                rows.push({
                    key,
                    approximateBytes,
                    meosOwned: /^meos[._-]/i.test(String(key || ""))
                });
            }

            rows.sort((a, b) => b.approximateBytes - a.approximateBytes);

            return {
                success: true,
                available: true,
                totalApproximateBytes: totalBytes,
                entries: rows
            };
        },

        compactBrowserContinuityCache(options = {}) {
            if (!global.localStorage) {
                return {
                    success: false,
                    compacted: false,
                    reason: "browser-local-storage-unavailable"
                };
            }

            const beforeRaw =
                global.localStorage.getItem(this.configuration.localStorageKey) || "";
            const beforeApproximateBytes =
                (this.configuration.localStorageKey.length + beforeRaw.length) * 2;

            const payload = this.buildBrowserContinuityCachePayload();
            const serialized = JSON.stringify(payload);

            try {
                if (options.persist !== false) {
                    global.localStorage.setItem(
                        this.configuration.localStorageKey,
                        serialized
                    );
                }

                const afterApproximateBytes =
                    (this.configuration.localStorageKey.length + serialized.length) * 2;

                this.persistenceState.suspended = false;
                this.persistenceState.reason = null;
                this.persistenceState.suspendedAt = null;
                this.persistenceState.lastFailure = null;

                return {
                    success: true,
                    compacted: true,
                    reason: options.reason || "manual-quota-hygiene",
                    beforeApproximateBytes,
                    afterApproximateBytes,
                    approximateBytesReleased:
                        Math.max(0, beforeApproximateBytes - afterApproximateBytes),
                    storage: this.estimateBrowserStorage()
                };
            } catch (error) {
                if (this.isStorageQuotaError(error)) {
                    this.suspendBrowserPersistence(error);
                    return {
                        success: false,
                        compacted: false,
                        suspended: true,
                        reason: "storage-quota-exhausted",
                        beforeApproximateBytes
                    };
                }

                return {
                    success: false,
                    compacted: false,
                    reason: "persistence-error",
                    error: error?.message || String(error)
                };
            }
        },

        runBrowserQuotaHygieneAcceptanceTest() {
            const payload = this.buildBrowserContinuityCachePayload();
            const checks = [
                ["Browser monitoring cache is explicitly non-authoritative",
                    payload.browserCache?.authoritative === false],
                ["Browser cache alert retention is bounded",
                    Array.isArray(payload.alerts) &&
                    payload.alerts.length <= this.configuration.browserCacheMaximumAlerts],
                ["Browser cache snapshot retention is bounded",
                    Array.isArray(payload.snapshots) &&
                    payload.snapshots.length <= this.configuration.browserCacheMaximumSnapshots],
                ["Browser cache history retention is bounded",
                    Array.isArray(payload.history) &&
                    payload.history.length <= this.configuration.browserCacheMaximumHistory],
                ["Full live monitoring limits remain unchanged",
                    this.configuration.maximumAlerts === 5000 &&
                    this.configuration.maximumHistory === 5000],
                ["Storage inspection is MEOS-owned and read-only",
                    typeof this.estimateBrowserStorage === "function" &&
                    !/removeItem|clear\(/.test(this.estimateBrowserStorage.toString())],
                ["Quota hygiene never deletes unrelated browser keys",
                    !/localStorage\\.clear|removeItem/.test(this.compactBrowserContinuityCache.toString())],
                ["No provider, paid cognition, corrective-action, or external authority is added",
                    this.configuration.requireExecutiveApprovalForCorrectiveAction === true]
            ];

            const rows = checks.map(([name, passed]) => ({
                name,
                passed: Boolean(passed)
            }));
            console.table(rows);
            const passed = rows.every(row => row.passed);
            console.info(
                `[MEOS 1.0.2] Commission 006.018L3 Browser Persistence Recovery + Quota Hygiene: ${passed ? "PASS" : "FAIL"} (${rows.filter(row => row.passed).length}/${rows.length}).`
            );

            return {
                success: passed,
                commission: "006.018L3",
                schema: "meos.executive-monitoring.browser-quota-hygiene-acceptance.v1",
                version: "1.0.2",
                buildId: "EM102-BROWSER-PERSISTENCE-RECOVERY-QUOTA-HYGIENE-20260812-A",
                passed: rows.filter(row => row.passed).length,
                total: rows.length,
                checks: rows
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
                        this.buildBrowserContinuityCachePayload()
                    )
                );

                return {
                    success: true,
                    persisted: true
                };
            } catch (error) {
                if (this.isStorageQuotaError(error)) {
                    this.suspendBrowserPersistence(error);
                    return {
                        success: false,
                        persisted: false,
                        suspended: true,
                        error: error.message
                    };
                }

                this.persistenceState.failureCount += 1;
                this.persistenceState.lastFailure = {
                    name: error?.name || "Error",
                    message: error?.message || String(error)
                };

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

            this.stopScanner({
                reason: "monitoring-clear",
                silent: true
            });
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
                this.syncAutonomyRuntime({
                    reason: "monitoring-clear-complete"
                });
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

        runPersistenceAuthorityAcceptanceTest() {
            const originalSuspended = this.persistenceState.suspended;
            const originalReason = this.persistenceState.reason;
            const originalSuppressed = this.persistenceState.suppressedWriteCount;

            this.persistenceState.suspended = true;
            this.persistenceState.reason = "acceptance-test";
            const before = this.persistenceState.suppressedWriteCount;
            const suppressedResult = this.persistIfEnabled();
            const after = this.persistenceState.suppressedWriteCount;

            const status = this.getStatus();
            const checks = [
                ["Executive Monitoring declares live runtime plus durable institutional state as authority",
                    status.persistenceAuthority?.authoritative === "live-runtime-and-durable-institutional-state"],
                ["Browser persistence is explicitly a best-effort monitoring continuity cache",
                    status.persistenceAuthority?.browserRole === "best-effort-monitoring-continuity-cache" &&
                    status.persistenceAuthority?.browserAuthoritative === false],
                ["Quota exhaustion circuit breaker is installed and fail-visible",
                    typeof this.isStorageQuotaError === "function" &&
                    typeof this.suspendBrowserPersistence === "function" &&
                    this.isStorageQuotaError({ name: "QuotaExceededError", message: "quota" })],
                ["Repeated monitoring-cache writes are suppressed while persistence is suspended",
                    suppressedResult?.suppressed === true && after === before + 1],
                ["Executive Monitoring scanner remains operational independently of browser cache persistence",
                    this.status === "online" &&
                    this.configuration.scannerEnabled === true &&
                    typeof this.scan === "function"],
                ["Alerts, snapshots, and monitoring history remain available in active memory",
                    Array.isArray(this.alerts) && Array.isArray(this.snapshots) && Array.isArray(this.history)],
                ["Persistence degradation does not grant corrective-action or external execution authority",
                    this.configuration.requireExecutiveApprovalForCorrectiveAction === true &&
                    status.persistenceAuthority?.degradationExpandsAuthority === false]
            ];

            this.persistenceState.suspended = originalSuspended;
            this.persistenceState.reason = originalReason;
            this.persistenceState.suppressedWriteCount = originalSuppressed;

            const rows = checks.map(([name, passed]) => ({ name, passed: Boolean(passed) }));
            console.table(rows);
            const passed = rows.every((row) => row.passed);
            console.info(
                `[MEOS 1.0.1] Commission 006.017D4H2D Executive Monitoring persistence authority convergence: ${passed ? "PASS" : "FAIL"}.`
            );
            return {
                commission: "006.017D4H2D",
                version: "1.0.1",
                buildId: "EM101-MONITORING-PERSISTENCE-AUTHORITY-CONVERGENCE-20260808-A",
                passed,
                checks: rows,
                persistence: this.clone(this.persistenceState)
            };
        },

        runGovernedMonitoringAutonomyAcceptanceTest() {
            const originalMaddyAutonomy = global.MaddyAutonomy;
            const originalAuthorityAlias = global.MEOSAutonomyAuthority;
            const originalMissionEngine = global.MEOSMissionEngine;
            const originalAutomation = global.ExecutiveAutomation;
            const originalAlerts = this.clone(this.alerts);
            const originalSnapshots = this.clone(this.snapshots);
            const originalHistory = this.clone(this.history);
            const originalAnalytics = this.clone(this.analytics);
            const originalAutomaticPersistence =
                this.configuration.automaticPersistence;
            const originalAutomaticNotification =
                this.configuration.automaticNotificationEnabled;
            const originalAutomaticHandoff =
                this.configuration.automaticAutomationHandoffEnabled;
            const scannerWasRunning = Boolean(this.scannerId);

            const authorityState = {
                monitoring: false,
                revision: 4101
            };
            let handoffInvocation = null;

            const fakeAuthority = {
                capabilityStatus: (capabilityId) => ({
                    id: capabilityId,
                    effective:
                        capabilityId === AUTONOMY_CAPABILITY &&
                        authorityState.monitoring === true,
                    uiState:
                        capabilityId === AUTONOMY_CAPABILITY &&
                        authorityState.monitoring === true
                            ? "ON"
                            : "OFF",
                    reason:
                        capabilityId === AUTONOMY_CAPABILITY &&
                        authorityState.monitoring === true
                            ? "authorized-and-effective"
                            : "not-authorized"
                }),
                isAuthorized: (capabilityId) =>
                    capabilityId === AUTONOMY_CAPABILITY &&
                    authorityState.monitoring === true,
                getSnapshot: () => ({
                    revision: authorityState.revision,
                    policy: {
                        revision: authorityState.revision
                    }
                })
            };

            const checks = [];
            const check = (name, passed, evidence = null) => {
                checks.push({
                    name,
                    passed: passed === true,
                    evidence: this.clone(evidence)
                });
            };

            try {
                this.stopScanner({
                    reason: "acceptance-test-start",
                    silent: true
                });
                this.configuration.automaticPersistence = false;
                this.configuration.automaticNotificationEnabled = false;
                this.configuration.automaticAutomationHandoffEnabled = true;
                this.alerts = [];
                this.snapshots = [];
                this.history = [];
                this.recalculateAnalytics();

                global.MaddyAutonomy = fakeAuthority;
                global.MEOSAutonomyAuthority = fakeAuthority;
                global.MEOSMissionEngine = {
                    missions: [
                        {
                            id: "acceptance-monitoring-mission",
                            title: "Acceptance monitoring mission",
                            status: "active",
                            dueDate: new Date(
                                Date.now() + 24 * 60 * 60 * 1000
                            ).toISOString(),
                            office: "Acceptance Office"
                        }
                    ]
                };
                global.ExecutiveAutomation = {
                    runs: [],
                    notifications: [],
                    scan: (_provider, options = {}) => {
                        handoffInvocation = this.clone(options);
                        return {
                            success: true,
                            results: [
                                {
                                    run: {
                                        id: "acceptance-automation-run"
                                    }
                                }
                            ]
                        };
                    }
                };

                const integration =
                    this.getAutonomyIntegrationStatus();
                const scannerClosed = this.startScanner();
                const autonomousBlocked = this.scan({
                    autonomous: true,
                    source: "acceptance-autonomous-off"
                });
                const humanDirected = this.scan({
                    humanDirected: true,
                    source: "acceptance-human"
                });

                this.alerts = [];
                this.snapshots = [];
                this.history = [];
                handoffInvocation = null;

                authorityState.monitoring = true;
                authorityState.revision += 1;
                this.syncAutonomyRuntime({
                    reason: "acceptance-authority-on"
                });

                const governedScan = this.scan({
                    autonomous: true,
                    source: "acceptance-autonomous-on"
                });
                const governedAlert = governedScan?.createdAlerts?.[0] || null;
                const runnerSnapshot =
                    this.buildRunnerPersistenceSnapshot();
                const scannerRunningWithAuthority =
                    Boolean(this.scannerId);
                const scannerAuthorityWithAuthority =
                    this.autonomy.scannerAuthority;

                authorityState.monitoring = false;
                authorityState.revision += 1;
                const authorityLoss = this.syncAutonomyRuntime({
                    reason: "acceptance-authority-loss"
                });

                check(
                    "Monitoring autonomy integration contract is first-class",
                    integration?.ready === true &&
                    integration?.capabilityId === AUTONOMY_CAPABILITY &&
                    integration?.browserAuthority === false &&
                    integration?.durableTemporalWakeCommissioned === false,
                    integration
                );
                check(
                    "Browser scanner fails closed while Monitoring authority is OFF",
                    scannerClosed?.started === false &&
                    scannerClosed?.reason ===
                        "monitoring-scanner-autonomy-not-authorized",
                    scannerClosed
                );
                check(
                    "Direct autonomous monitoring cannot bypass central authority",
                    autonomousBlocked?.blockedByAutonomy === true &&
                    autonomousBlocked?.reason ===
                        "monitoring-autonomy-not-authorized",
                    autonomousBlocked
                );
                check(
                    "Human-directed monitoring remains available with standing autonomy OFF",
                    humanDirected?.success === true &&
                    humanDirected?.scan?.humanDirected === true &&
                    humanDirected?.scan?.autonomous === false,
                    humanDirected?.scan
                );
                check(
                    "Monitoring authority permits governed self-initiated scanning",
                    governedScan?.success === true &&
                    governedScan?.scan?.autonomous === true &&
                    governedScan?.scan?.authorityReceipt?.effective === true,
                    governedScan?.scan
                );
                check(
                    "Autonomous alerts retain the durable authority revision receipt",
                    governedAlert?.provenance?.autonomous === true &&
                    governedAlert?.provenance?.authorityReceipt
                        ?.authorityRevision === authorityState.revision - 1 &&
                    governedAlert?.provenance?.authorityReceipt
                        ?.browserAuthority === false,
                    governedAlert?.provenance
                );
                check(
                    "Autonomous Monitoring handoff is marked machine-initiated for downstream Automation governance",
                    handoffInvocation?.autonomous === true &&
                    handoffInvocation?.machineInitiated === true &&
                    handoffInvocation?.humanDirected === false,
                    handoffInvocation
                );
                check(
                    "Central Monitoring authority can start the compatibility scanner",
                    scannerRunningWithAuthority === true &&
                    scannerAuthorityWithAuthority ===
                        "central-autonomy-authority",
                    {
                        scannerWasRunningWithAuthority:
                            scannerRunningWithAuthority,
                        scannerAuthorityWithAuthority,
                        scannerAuthorityAfterLoss:
                            this.autonomy.scannerAuthority
                    }
                );
                check(
                    "Removing Monitoring authority stops autonomous scanning without erasing work",
                    authorityLoss?.scannerAuthorized === false &&
                    Boolean(this.scannerId) === false &&
                    Array.isArray(this.alerts) &&
                    this.alerts.length > 0,
                    authorityLoss
                );
                check(
                    "Runner persistence snapshot carries operational state but no autonomy policy",
                    runnerSnapshot?.schema === STATE_SCHEMA &&
                    runnerSnapshot?.authority
                        ?.autonomyPolicyStoredHere === false &&
                    runnerSnapshot?.authority?.browserAuthority === false &&
                    runnerSnapshot?.authority
                        ?.browserTimerCreatesAuthority === false &&
                    runnerSnapshot?.authority
                        ?.durableTemporalWakeCommissioned === false &&
                    !Object.prototype.hasOwnProperty.call(
                        runnerSnapshot,
                        "autonomy"
                    ),
                    runnerSnapshot?.authority
                );
                check(
                    "Legacy browser configuration cannot manufacture autonomy",
                    this.configuration.scannerEnabled === true &&
                    authorityState.monitoring === false &&
                    this.startScanner()?.started === false,
                    this.autonomyCapabilityStatus()
                );
                check(
                    "Economic, external, signature, certification, submission, legal, and corrective authority remain closed",
                    integration?.automaticSpendAuthorized === false &&
                    integration?.externalActionAuthorized === false &&
                    integration?.signatureAuthorized === false &&
                    integration?.certificationAuthorized === false &&
                    integration?.submissionAuthorized === false &&
                    integration?.legalCommitmentAuthorized === false &&
                    integration?.correctiveActionAuthorized === false,
                    integration
                );
            } finally {
                this.stopScanner({
                    reason: "acceptance-test-cleanup",
                    silent: true
                });
                this.alerts = originalAlerts;
                this.snapshots = originalSnapshots;
                this.history = originalHistory;
                this.analytics = originalAnalytics;
                this.configuration.automaticPersistence =
                    originalAutomaticPersistence;
                this.configuration.automaticNotificationEnabled =
                    originalAutomaticNotification;
                this.configuration.automaticAutomationHandoffEnabled =
                    originalAutomaticHandoff;

                if (originalMaddyAutonomy === undefined) {
                    delete global.MaddyAutonomy;
                } else {
                    global.MaddyAutonomy = originalMaddyAutonomy;
                }

                if (originalAuthorityAlias === undefined) {
                    delete global.MEOSAutonomyAuthority;
                } else {
                    global.MEOSAutonomyAuthority =
                        originalAuthorityAlias;
                }

                if (originalMissionEngine === undefined) {
                    delete global.MEOSMissionEngine;
                } else {
                    global.MEOSMissionEngine = originalMissionEngine;
                }

                if (originalAutomation === undefined) {
                    delete global.ExecutiveAutomation;
                } else {
                    global.ExecutiveAutomation = originalAutomation;
                }

                if (scannerWasRunning) {
                    this.syncAutonomyRuntime({
                        reason: "acceptance-test-restore"
                    });
                }
            }

            const passed = checks.filter((item) => item.passed).length;
            const success = passed === checks.length;
            console.table(checks);
            console.info(
                `[MEOS ${this.version}] Commission ${this.commission} Governed Monitoring & Follow-up Autonomy: ${success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`
            );

            return {
                schema: "meos.executive-monitoring.governed-autonomy-acceptance.v1",
                commission: this.commission,
                version: this.version,
                buildId: this.buildId,
                success,
                passed,
                total: checks.length,
                checks
            };
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
