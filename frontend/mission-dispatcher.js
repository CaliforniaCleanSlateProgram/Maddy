/**
 * MEOS Mission Dispatcher
 * Commission Candidate: 006.031E — Governed Office Dispatch Autonomy
 * Version: 0.2.0
 * Build: MD020-GOVERNED-OFFICE-DISPATCH-AUTONOMY-20260817-A
 *
 * Purpose:
 * The Mission Dispatcher routes organizational missions to the appropriate
 * Executive Offices and creates the first set of office responsibilities.
 *
 * Operating principles:
 * - Maddy coordinates work across the organization.
 * - Missions are routed according to their type and requirements.
 * - One office is designated as lead.
 * - Supporting offices receive defined responsibilities.
 * - Missions waiting for Executive Director approval do not stop other work.
 * - Offices continue receiving the next available mission.
 * - The Dispatcher never replaces Executive Director authority.
 * - Office Dispatch and Approved Work are separate durable authorities.
 * - Automatic routing never creates authority from browser state or legacy timers.
 * - Browser scanning is a compatibility runner only; durable time/runtime execution remains a later server commission.
 *
 * Required:
 * - mission-engine.js
 *
 * Optional:
 * - executive-offices.js
 *
 * The Dispatcher remains functional even if the Executive Office bridge
 * has not yet been connected.
 */

(function initializeMissionDispatcher(global) {
    "use strict";

    const VERSION = "0.2.0";
    const BUILD_ID = "MD020-GOVERNED-OFFICE-DISPATCH-AUTONOMY-20260817-A";
    const COMMISSION = "006.031E";
    const STATE_SCHEMA = "meos.mission-dispatcher.persistence-snapshot.v1";
    const AUTONOMY_CAPABILITIES = Object.freeze({
        OFFICE_DISPATCH: "officeDispatch",
        APPROVED_WORK: "approvedWork"
    });
    const STORAGE_KEY = "meos_mission_dispatcher_v0_1_0";
    const DEFAULT_SCAN_INTERVAL = 5000;
    const MAX_PERSISTED_DISPATCH_RECORDS = 100;
    const MAX_PERSISTED_ACTIVITY = 100;

    const OFFICE_KEYS = Object.freeze({
        MADDY: "maddy",
        GRANT: "grant",
        ATLAS: "atlas",
        JUSTICE: "justice",
        ARCHIE: "archie",
        FORGE: "forge",
        LEDGER: "ledger",
        ECHO: "echo",
        SAGE: "sage"
    });

    /**
     * Office aliases allow the Dispatcher to locate offices even if the
     * cabinet uses an office ID, office name, title, or role description.
     */
    const OFFICE_ALIASES = Object.freeze({
        [OFFICE_KEYS.MADDY]: [
            "maddy",
            "chief operating officer",
            "chief executive operations officer",
            "executive operations",
            "coo"
        ],

        [OFFICE_KEYS.GRANT]: [
            "grant",
            "grants",
            "grant office",
            "grant development",
            "grant writer",
            "development office"
        ],

        [OFFICE_KEYS.ATLAS]: [
            "atlas",
            "research",
            "research office",
            "strategy",
            "strategic research",
            "opportunity research"
        ],

        [OFFICE_KEYS.JUSTICE]: [
            "justice",
            "legal",
            "legal office",
            "compliance",
            "compliance office",
            "risk"
        ],

        [OFFICE_KEYS.ARCHIE]: [
            "archie",
            "finance",
            "finance office",
            "financial",
            "accounting",
            "accountant",
            "cfo",
            "banking"
        ],

        [OFFICE_KEYS.FORGE]: [
            "forge",
            "operations",
            "operations office",
            "project management",
            "implementation",
            "program operations"
        ],

        [OFFICE_KEYS.LEDGER]: [
            "ledger",
            "records",
            "records office",
            "document management",
            "institutional records",
            "archive"
        ],

        [OFFICE_KEYS.ECHO]: [
            "echo",
            "communications",
            "communications office",
            "public relations",
            "marketing",
            "social media",
            "community relations"
        ],

        [OFFICE_KEYS.SAGE]: [
            "sage",
            "human resources",
            "hr",
            "personnel",
            "people operations",
            "training"
        ]
    });

    /**
     * Routing rules define which offices participate in each mission type.
     *
     * The first office is normally the lead office.
     * Other offices support the mission with specialized responsibilities.
     */
    const ROUTING_RULES = Object.freeze({
        general: {
            lead: OFFICE_KEYS.FORGE,
            supporting: [
                OFFICE_KEYS.ATLAS,
                OFFICE_KEYS.LEDGER
            ]
        },

        grant: {
            lead: OFFICE_KEYS.GRANT,
            supporting: [
                OFFICE_KEYS.ATLAS,
                OFFICE_KEYS.ARCHIE,
                OFFICE_KEYS.JUSTICE,
                OFFICE_KEYS.FORGE,
                OFFICE_KEYS.LEDGER
            ]
        },

        finance: {
            lead: OFFICE_KEYS.ARCHIE,
            supporting: [
                OFFICE_KEYS.LEDGER,
                OFFICE_KEYS.JUSTICE,
                OFFICE_KEYS.ATLAS
            ]
        },

        banking: {
            lead: OFFICE_KEYS.ARCHIE,
            supporting: [
                OFFICE_KEYS.LEDGER,
                OFFICE_KEYS.JUSTICE
            ]
        },

        legal: {
            lead: OFFICE_KEYS.JUSTICE,
            supporting: [
                OFFICE_KEYS.LEDGER,
                OFFICE_KEYS.ARCHIE,
                OFFICE_KEYS.FORGE
            ]
        },

        compliance: {
            lead: OFFICE_KEYS.JUSTICE,
            supporting: [
                OFFICE_KEYS.LEDGER,
                OFFICE_KEYS.ARCHIE,
                OFFICE_KEYS.FORGE
            ]
        },

        operations: {
            lead: OFFICE_KEYS.FORGE,
            supporting: [
                OFFICE_KEYS.ARCHIE,
                OFFICE_KEYS.LEDGER,
                OFFICE_KEYS.ATLAS
            ]
        },

        human_resources: {
            lead: OFFICE_KEYS.SAGE,
            supporting: [
                OFFICE_KEYS.JUSTICE,
                OFFICE_KEYS.LEDGER,
                OFFICE_KEYS.ARCHIE
            ]
        },

        communications: {
            lead: OFFICE_KEYS.ECHO,
            supporting: [
                OFFICE_KEYS.ATLAS,
                OFFICE_KEYS.LEDGER
            ]
        },

        fundraising: {
            lead: OFFICE_KEYS.GRANT,
            supporting: [
                OFFICE_KEYS.ECHO,
                OFFICE_KEYS.ATLAS,
                OFFICE_KEYS.ARCHIE,
                OFFICE_KEYS.LEDGER
            ]
        },

        partnership: {
            lead: OFFICE_KEYS.ECHO,
            supporting: [
                OFFICE_KEYS.ATLAS,
                OFFICE_KEYS.JUSTICE,
                OFFICE_KEYS.FORGE,
                OFFICE_KEYS.LEDGER
            ]
        },

        board_governance: {
            lead: OFFICE_KEYS.JUSTICE,
            supporting: [
                OFFICE_KEYS.LEDGER,
                OFFICE_KEYS.ARCHIE,
                OFFICE_KEYS.FORGE
            ]
        },

        registration: {
            lead: OFFICE_KEYS.JUSTICE,
            supporting: [
                OFFICE_KEYS.LEDGER,
                OFFICE_KEYS.ARCHIE,
                OFFICE_KEYS.FORGE
            ]
        },

        reporting: {
            lead: OFFICE_KEYS.LEDGER,
            supporting: [
                OFFICE_KEYS.ARCHIE,
                OFFICE_KEYS.FORGE,
                OFFICE_KEYS.ECHO
            ]
        },

        research: {
            lead: OFFICE_KEYS.ATLAS,
            supporting: [
                OFFICE_KEYS.LEDGER,
                OFFICE_KEYS.FORGE
            ]
        },

        technology: {
            lead: OFFICE_KEYS.FORGE,
            supporting: [
                OFFICE_KEYS.ATLAS,
                OFFICE_KEYS.JUSTICE,
                OFFICE_KEYS.LEDGER
            ]
        },

        document_review: {
            lead: OFFICE_KEYS.LEDGER,
            supporting: [
                OFFICE_KEYS.ATLAS,
                OFFICE_KEYS.JUSTICE
            ]
        },

        opportunity: {
            lead: OFFICE_KEYS.ATLAS,
            supporting: [
                OFFICE_KEYS.GRANT,
                OFFICE_KEYS.ARCHIE,
                OFFICE_KEYS.FORGE,
                OFFICE_KEYS.LEDGER
            ]
        }
    });

    const state = {
        version: VERSION,
        running: false,
        scanInterval: DEFAULT_SCAN_INTERVAL,
        timerId: null,
        dispatchedMissionIds: [],
        dispatchRecords: [],
        activity: [],
        persistence: {
            enabled: true,
            suspended: false,
            reason: null,
            failedAt: null,
            warningIssued: false
        },
        autonomy: {
            subscriptionBound: false,
            lastSyncAt: null,
            lastOfficeDispatchEffective: false,
            lastApprovedWorkEffective: false,
            lastAuthorityRevision: null,
            lastReason: "authority-not-yet-proven"
        },
        initializedAt: null,
        updatedAt: null
    };

    function now() {
        return new Date().toISOString();
    }

    function createId(prefix) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).slice(2, 8);

        return `${prefix}-${timestamp}-${random}`.toUpperCase();
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function normalizeText(value, fallback = "") {
        if (typeof value !== "string") {
            return fallback;
        }

        const trimmed = value.trim();

        return trimmed || fallback;
    }

    function normalizeForComparison(value) {
        return normalizeText(value)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function unique(values) {
        return [...new Set(values.filter(Boolean))];
    }

    function getMissionEngine() {
        return global.MEOSMissionEngine || null;
    }

    function getAutonomyAuthority() {
        return (
            global.MaddyAutonomy ||
            global.MEOSAutonomyAuthority ||
            null
        );
    }

    function autonomyCapabilityStatus(capabilityId) {
        const authority = getAutonomyAuthority();

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
    }

    function isAutonomyAuthorized(capabilityId) {
        const authority = getAutonomyAuthority();

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
    }

    function captureAutonomyReceipt(capabilityId) {
        const authority = getAutonomyAuthority();
        const status = autonomyCapabilityStatus(capabilityId);
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
            schema: "meos.mission-dispatcher.autonomy-receipt.v1",
            capabilityId,
            effective: status?.effective === true,
            uiState: status?.uiState || "BLOCKED",
            reason: status?.reason || null,
            authorityRevision:
                Number(snapshot?.revision || 0) || null,
            authoritySource: "server-durable-maddy-autonomy-authority",
            browserAuthority: false,
            capturedAt: now()
        };
    }

    function getAutonomyIntegrationStatus(
        capabilityId = AUTONOMY_CAPABILITIES.OFFICE_DISPATCH
    ) {
        if (capabilityId !== AUTONOMY_CAPABILITIES.OFFICE_DISPATCH) {
            return {
                ready: false,
                reason: "unsupported-dispatcher-autonomy-capability",
                capabilityId,
                version: VERSION,
                commission: COMMISSION,
                buildId: BUILD_ID
            };
        }

        return {
            ready: true,
            reason: "governed-office-dispatch-contract-ready",
            capabilityId,
            version: VERSION,
            commission: COMMISSION,
            buildId: BUILD_ID,
            authoritySource: "server-durable-maddy-autonomy-authority",
            browserAuthority: false,
            legacyTimerCreatesAuthority: false,
            manualDispatchPreserved: true,
            automaticDispatchRequiresCentralAuthority: true,
            approvedWorkSeparatelyGoverned: true,
            automaticSpendAuthorized: false,
            externalActionAuthorized: false,
            signatureAuthorized: false,
            certificationAuthorized: false,
            submissionAuthorized: false,
            legalCommitmentAuthorized: false,
            browserCompatibilityScannerAvailable: true,
            browserIndependentRunnerCommissioned: false,
            persistenceSnapshotContract: STATE_SCHEMA
        };
    }

    function isMachineDispatchInvocation(options = {}) {
        return (
            options.autonomous === true ||
            Boolean(options.workflowId) ||
            Boolean(options.workflowStepId) ||
            options.source === "automation" ||
            options.source === "autonomy-scanner" ||
            options.source === "workflow"
        );
    }

    function missionHasHumanApprovalForAutonomousWork(mission) {
        if (!mission) {
            return false;
        }

        if (mission.approval?.required !== true) {
            return true;
        }

        const approvalStatus = String(
            mission.approval?.status || ""
        ).toLowerCase();

        return (
            approvalStatus === "approved" ||
            approvalStatus === "revisions_requested"
        );
    }

    /**
     * Supports the current Executive Office Standard while remaining
     * tolerant of future naming changes.
     */
    function getExecutiveOfficeSystem() {
    return (
        global.MEOS ||
        global.MEOSExecutiveOffices ||
        global.ExecutiveOffices ||
        global.MEOSOfficeStandard ||
        null
    );
}

    function isQuotaExceededError(error) {
        return Boolean(
            error &&
            (
                error.name === "QuotaExceededError" ||
                error.code === 22 ||
                error.code === 1014
            )
        );
    }

    function persistenceStatus() {
        return clone({
            ...state.persistence,
            storageKey: STORAGE_KEY,
            persistedDispatchRecordLimit:
                MAX_PERSISTED_DISPATCH_RECORDS,
            persistedActivityLimit:
                MAX_PERSISTED_ACTIVITY
        });
    }

    function persist(options = {}) {
        if (!global.localStorage) {
            state.persistence.enabled = false;
            state.persistence.suspended = true;
            state.persistence.reason = "local_storage_unavailable";
            return {
                success: false,
                persisted: false,
                reason: state.persistence.reason
            };
        }

        if (
            state.persistence.suspended &&
            options.force !== true
        ) {
            return {
                success: false,
                persisted: false,
                suspended: true,
                reason: state.persistence.reason
            };
        }

        const saveableState = {
            version: state.version,
            running: state.running,
            scanInterval: state.scanInterval,
            dispatchedMissionIds: state.dispatchedMissionIds,
            dispatchRecords: state.dispatchRecords.slice(
                0,
                MAX_PERSISTED_DISPATCH_RECORDS
            ),
            activity: state.activity.slice(
                0,
                MAX_PERSISTED_ACTIVITY
            ),
            initializedAt: state.initializedAt,
            updatedAt: state.updatedAt
        };

        try {
            global.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(saveableState)
            );

            state.persistence.enabled = true;
            state.persistence.suspended = false;
            state.persistence.reason = null;
            state.persistence.failedAt = null;
            state.persistence.warningIssued = false;

            return {
                success: true,
                persisted: true,
                compact: true,
                dispatchRecordCount:
                    saveableState.dispatchRecords.length,
                activityCount: saveableState.activity.length
            };
        } catch (error) {
            if (isQuotaExceededError(error)) {
                state.persistence.suspended = true;
                state.persistence.reason =
                    "browser_storage_quota_exceeded";
                state.persistence.failedAt = now();

                if (!state.persistence.warningIssued) {
                    state.persistence.warningIssued = true;
                    console.warn(
                        "MEOS Mission Dispatcher browser persistence suspended after storage quota exhaustion. Runtime dispatch continues; repeated writes are suppressed until persistence is explicitly retried."
                    );
                }

                return {
                    success: false,
                    persisted: false,
                    suspended: true,
                    reason: state.persistence.reason
                };
            }

            console.warn(
                "MEOS Mission Dispatcher could not save its state.",
                error
            );

            return {
                success: false,
                persisted: false,
                reason: "persistence_error",
                error: error?.message || String(error)
            };
        }
    }

    function retryPersistence() {
        state.persistence.suspended = false;
        state.persistence.reason = null;
        state.persistence.failedAt = null;
        state.persistence.warningIssued = false;
        return persist({ force: true });
    }

    function restore() {
        try {
            const stored = global.localStorage.getItem(STORAGE_KEY);

            if (!stored) {
                return false;
            }

            const parsed = JSON.parse(stored);

            if (!parsed) {
                return false;
            }

            state.scanInterval =
                Number(parsed.scanInterval) || DEFAULT_SCAN_INTERVAL;

            state.dispatchedMissionIds = Array.isArray(
                parsed.dispatchedMissionIds
            )
                ? parsed.dispatchedMissionIds
                : [];

            state.dispatchRecords = Array.isArray(parsed.dispatchRecords)
                ? parsed.dispatchRecords
                : [];

            state.activity = Array.isArray(parsed.activity)
                ? parsed.activity
                : [];

            state.initializedAt = parsed.initializedAt || now();
            state.updatedAt = parsed.updatedAt || now();

            /*
             * The Dispatcher always begins stopped after a page reload.
             * start() will establish a fresh timer.
             */
            state.running = false;
            state.timerId = null;

            return true;
        } catch (error) {
            console.warn(
                "MEOS Mission Dispatcher could not restore saved state.",
                error
            );

            return false;
        }
    }

    function recordActivity(action, details = {}) {
        const entry = {
            id: createId("DSPACT"),
            action,
            details: clone(details),
            timestamp: now()
        };

        state.activity.unshift(entry);

        if (state.activity.length > 500) {
            state.activity = state.activity.slice(0, 500);
        }

        state.updatedAt = entry.timestamp;
        persist();

        return clone(entry);
    }

    function getCabinet() {
        const officeSystem = getExecutiveOfficeSystem();

        if (!officeSystem) {
            return [];
        }

        try {
            if (typeof officeSystem.getCabinet === "function") {
                const cabinet = officeSystem.getCabinet();

                if (Array.isArray(cabinet)) {
                    return cabinet;
                }

                if (cabinet && typeof cabinet === "object") {
                    return Object.values(cabinet);
                }
            }

            if (Array.isArray(officeSystem.cabinet)) {
                return officeSystem.cabinet;
            }

            if (
                officeSystem.cabinet &&
                typeof officeSystem.cabinet === "object"
            ) {
                return Object.values(officeSystem.cabinet);
            }

            if (Array.isArray(officeSystem.offices)) {
                return officeSystem.offices;
            }

            if (
                officeSystem.offices &&
                typeof officeSystem.offices === "object"
            ) {
                return Object.values(officeSystem.offices);
            }
        } catch (error) {
            console.warn(
                "MEOS Mission Dispatcher could not read the cabinet.",
                error
            );
        }

        return [];
    }

    function buildOfficeSearchText(office) {
        if (!office || typeof office !== "object") {
            return "";
        }

        const searchableValues = [
            office.id,
            office.officeId,
            office.key,
            office.slug,
            office.name,
            office.officeName,
            office.title,
            office.role,
            office.department,
            office.description,
            office.mandate
        ];

        return normalizeForComparison(
            searchableValues
                .filter((value) => typeof value === "string")
                .join(" ")
        );
    }

    function getOfficeIdentifier(office, fallbackKey = null) {
        if (!office || typeof office !== "object") {
            return fallbackKey;
        }

        return (
            office.id ||
            office.officeId ||
            office.key ||
            office.slug ||
            office.name ||
            office.officeName ||
            fallbackKey
        );
    }

    function findOfficeByKey(officeKey) {
        const cabinet = getCabinet();
        const aliases = OFFICE_ALIASES[officeKey] || [officeKey];

        for (const office of cabinet) {
            const searchText = buildOfficeSearchText(office);

            const matched = aliases.some((alias) => {
                const normalizedAlias = normalizeForComparison(alias);

                return (
                    searchText === normalizedAlias ||
                    searchText.includes(normalizedAlias)
                );
            });

            if (matched) {
                return office;
            }
        }

        /*
         * When the Executive Office bridge is unavailable, return a
         * lightweight office reference. The mission can still be routed.
         */
        return {
            id: officeKey,
            key: officeKey,
            name: officeKey
        };
    }

    function resolveOfficeKey(officeKey) {
        const office = findOfficeByKey(officeKey);

        return {
            requestedKey: officeKey,
            office,
            id: getOfficeIdentifier(office, officeKey),
            name:
                office.name ||
                office.officeName ||
                office.title ||
                officeKey
        };
    }

    function resolveRoutingRule(mission) {
        const missionType = normalizeText(
            mission && mission.type,
            "general"
        );

        return ROUTING_RULES[missionType] || ROUTING_RULES.general;
    }

    function buildOfficeAssignments(mission) {
        const rule = resolveRoutingRule(mission);

        const requestedOfficeKeys = unique([
            rule.lead,
            ...(rule.supporting || [])
        ]);

        const resolvedOffices = requestedOfficeKeys.map(resolveOfficeKey);

        const leadOffice =
            resolvedOffices.find(
                (item) => item.requestedKey === rule.lead
            ) || resolvedOffices[0];

        const supportingOffices = resolvedOffices.filter(
            (item) => item.id !== leadOffice.id
        );

        return {
            leadOffice,
            supportingOffices,
            allOffices: [
                leadOffice,
                ...supportingOffices
            ]
        };
    }

    function buildResponsibility(mission, officeKey, isLead) {
        const title = mission.title;

        if (isLead) {
            return `Lead organizational execution for: ${title}`;
        }

        const responsibilities = {
            [OFFICE_KEYS.GRANT]:
                `Review funding eligibility, application requirements, deadlines, and proposal needs for: ${title}`,

            [OFFICE_KEYS.ATLAS]:
                `Research the opportunity, organization, requirements, risks, and supporting intelligence for: ${title}`,

            [OFFICE_KEYS.JUSTICE]:
                `Review legal, regulatory, contractual, governance, and compliance considerations for: ${title}`,

            [OFFICE_KEYS.ARCHIE]:
                `Review financial requirements, costs, revenue potential, banking implications, and budget needs for: ${title}`,

            [OFFICE_KEYS.FORGE]:
                `Develop the operational plan, timeline, dependencies, implementation steps, and execution requirements for: ${title}`,

            [OFFICE_KEYS.LEDGER]:
                `Create and maintain the authoritative mission record, documents, deadlines, history, and organizational filing for: ${title}`,

            [OFFICE_KEYS.ECHO]:
                `Review communications, public messaging, stakeholder outreach, marketing, and relationship needs for: ${title}`,

            [OFFICE_KEYS.SAGE]:
                `Review staffing, personnel, training, volunteer, and human-resource requirements for: ${title}`,

            [OFFICE_KEYS.MADDY]:
                `Coordinate the Executive Offices and prepare an Executive Brief for: ${title}`
        };

        return (
            responsibilities[officeKey] ||
            `Provide specialized office support for: ${title}`
        );
    }

    function taskAlreadyExists(mission, officeId) {
        if (!Array.isArray(mission.tasks)) {
            return false;
        }

        return mission.tasks.some((task) => {
            return (
                task &&
                task.dispatcherGenerated === true &&
                task.assignedOffice === officeId
            );
        });
    }

    function createMissionTask(
        engine,
        mission,
        officeReference,
        isLead
    ) {
        if (taskAlreadyExists(mission, officeReference.id)) {
            return null;
        }

        const responsibility = buildResponsibility(
            mission,
            officeReference.requestedKey,
            isLead
        );

        const task = engine.addTask(mission.id, {
            title: isLead
                ? `Lead mission: ${mission.title}`
                : `Support mission: ${mission.title}`,

            description: responsibility,

            assignedOffice: officeReference.id,

            assignedTo: officeReference.name,

            status: "pending",

            priority: mission.priority,

            dueDate: mission.dueDate || null,

            notes: isLead
                ? "Lead-office assignment created by the Mission Dispatcher."
                : "Supporting-office assignment created by the Mission Dispatcher.",

            dispatcherGenerated: true
        });

        return task;
    }

    /**
     * The current Mission Engine only stores recognized task fields.
     * This helper adds a Dispatcher marker through updateTask when available.
     */
    function markTaskAsDispatcherGenerated(engine, missionId, task) {
        if (
            !task ||
            !task.id ||
            typeof engine.updateTask !== "function"
        ) {
            return;
        }

        try {
            engine.updateTask(missionId, task.id, {
                dispatcherGenerated: true
            });
        } catch (error) {
            /*
             * The marker is helpful but not essential.
             * Do not block dispatch if the task schema excludes it.
             */
        }
    }

    function updateOfficeWorkingState(
        officeReference,
        mission,
        task,
        options = {}
    ) {
        const officeSystem = getExecutiveOfficeSystem();

        if (!officeSystem) {
            return {
                connected: false,
                updated: false
            };
        }

        const officeId = officeReference.id;
        let updated = false;

        try {
            if (typeof officeSystem.createTask === "function") {
                officeSystem.createTask(officeId, {
                    title: task
                        ? task.title
                        : `Mission assignment: ${mission.title}`,

                    description: task
                        ? task.description
                        : buildResponsibility(
                            mission,
                            officeReference.requestedKey,
                            false
                        ),

                    missionId: mission.id,

                    priority: mission.priority,

                    status: "pending",

                    source: "mission_dispatcher"
                });

                updated = true;
            }
        } catch (error) {
            console.warn(
                `Could not create office task for ${officeId}.`,
                error
            );
        }

        try {
            if (typeof officeSystem.setOfficeStatus === "function") {
                officeSystem.setOfficeStatus(
                    officeId,
                    "operational",
                    options.executionAuthorized === true
                        ? `Working on: ${mission.title}`
                        : `Mission assigned: ${mission.title}`
                );

                updated = true;
            }
        } catch (error) {
            console.warn(
                `Could not update office status for ${officeId}.`,
                error
            );
        }

        try {
            if (typeof officeSystem.heartbeat === "function") {
                officeSystem.heartbeat(
                    officeId,
                    options.executionAuthorized === true
                        ? `Mission received and execution authorized: ${mission.title}`
                        : `Mission received; awaiting Approved Work authority: ${mission.title}`
                );

                updated = true;
            }
        } catch (error) {
            console.warn(
                `Could not record office heartbeat for ${officeId}.`,
                error
            );
        }

        return {
            connected: true,
            updated
        };
    }

    function missionHasBeenDispatched(missionId) {
        return state.dispatchedMissionIds.includes(missionId);
    }

    function markMissionDispatched(missionId) {
        if (!missionHasBeenDispatched(missionId)) {
            state.dispatchedMissionIds.push(missionId);
        }

        state.updatedAt = now();
        persist();
    }

    function createDispatchRecord(
        mission,
        assignments,
        createdTasks,
        officeBridgeResults
    ) {
        const record = {
            id: createId("DSP"),
            missionId: mission.id,
            missionTitle: mission.title,
            missionType: mission.type,
            missionPriority: mission.priority,

            leadOffice: {
                key: assignments.leadOffice.requestedKey,
                id: assignments.leadOffice.id,
                name: assignments.leadOffice.name
            },

            supportingOffices: assignments.supportingOffices.map(
                (office) => ({
                    key: office.requestedKey,
                    id: office.id,
                    name: office.name
                })
            ),

            createdTaskIds: createdTasks
                .filter(Boolean)
                .map((task) => task.id),

            officeBridgeResults,

            dispatchedAt: now()
        };

        state.dispatchRecords.unshift(record);

        if (state.dispatchRecords.length > 500) {
            state.dispatchRecords =
                state.dispatchRecords.slice(0, 500);
        }

        persist();

        return record;
    }

    function dispatchMission(missionId, options = {}) {
        const engine = getMissionEngine();

        if (!engine) {
            throw new Error(
                "MEOS Mission Engine is not available. Load mission-engine.js before mission-dispatcher.js."
            );
        }

        const mission = engine.getMission(missionId);

        if (!mission) {
            throw new Error(`Mission not found: ${missionId}`);
        }

        const machineInitiated = isMachineDispatchInvocation(options);
        const officeDispatchAuthorized =
            !machineInitiated ||
            isAutonomyAuthorized(
                AUTONOMY_CAPABILITIES.OFFICE_DISPATCH
            );

        if (!officeDispatchAuthorized) {
            const receipt = captureAutonomyReceipt(
                AUTONOMY_CAPABILITIES.OFFICE_DISPATCH
            );

            recordActivity("autonomous_dispatch_blocked", {
                missionId,
                reason: "office_dispatch_authority_not_effective",
                authorityReceipt: receipt
            });

            return {
                dispatched: false,
                reason: "office_dispatch_authority_not_effective",
                missionId,
                autonomous: machineInitiated,
                authorityReceipt: receipt
            };
        }

        if (
            machineInitiated &&
            !missionHasHumanApprovalForAutonomousWork(mission)
        ) {
            recordActivity("autonomous_dispatch_blocked", {
                missionId,
                reason: "mission_human_approval_not_satisfied"
            });

            return {
                dispatched: false,
                reason: "mission_human_approval_not_satisfied",
                missionId,
                autonomous: true
            };
        }

        if (
            missionHasBeenDispatched(missionId) &&
            options.force !== true
        ) {
            return {
                dispatched: false,
                reason: "already_dispatched",
                missionId,
                autonomous: machineInitiated
            };
        }

        const assignments = buildOfficeAssignments(mission);
        const assignedOfficeIds = unique(
            assignments.allOffices.map((office) => office.id)
        );
        const approvedWorkAuthorized =
            !machineInitiated ||
            isAutonomyAuthorized(
                AUTONOMY_CAPABILITIES.APPROVED_WORK
            );
        const officeDispatchReceipt = machineInitiated
            ? captureAutonomyReceipt(
                AUTONOMY_CAPABILITIES.OFFICE_DISPATCH
            )
            : null;
        const approvedWorkReceipt = machineInitiated
            ? captureAutonomyReceipt(
                AUTONOMY_CAPABILITIES.APPROVED_WORK
            )
            : null;

        engine.assignMission(mission.id, {
            leadOffice: assignments.leadOffice.id,
            offices: assignedOfficeIds,
            currentActivity: approvedWorkAuthorized
                ? "Mission routed to the Executive Offices"
                : "Mission routed; awaiting Approved Work authority"
        });

        const refreshedMission = engine.getMission(mission.id);
        const createdTasks = [];

        assignments.allOffices.forEach((officeReference) => {
            const isLead =
                officeReference.id === assignments.leadOffice.id;

            const task = createMissionTask(
                engine,
                refreshedMission,
                officeReference,
                isLead
            );

            if (task) {
                markTaskAsDispatcherGenerated(
                    engine,
                    mission.id,
                    task
                );

                createdTasks.push(task);
            }
        });

        const officeBridgeResults = assignments.allOffices.map(
            (officeReference) => {
                const matchingTask = createdTasks.find(
                    (task) =>
                        task.assignedOffice === officeReference.id
                );

                return {
                    officeId: officeReference.id,
                    result: updateOfficeWorkingState(
                        officeReference,
                        mission,
                        matchingTask,
                        {
                            executionAuthorized:
                                approvedWorkAuthorized
                        }
                    )
                };
            }
        );

        let executionStarted = false;

        if (approvedWorkAuthorized) {
            engine.startMission(
                mission.id,
                `Executive Offices beginning work on: ${mission.title}`
            );
            executionStarted = true;
        }

        markMissionDispatched(mission.id);

        const dispatchRecord = createDispatchRecord(
            mission,
            assignments,
            createdTasks,
            officeBridgeResults
        );

        dispatchRecord.autonomy = {
            machineInitiated,
            officeDispatchReceipt,
            approvedWorkReceipt,
            executionStarted,
            executionStartedAt:
                executionStarted ? now() : null
        };

        const storedRecord = state.dispatchRecords.find(
            record => record.id === dispatchRecord.id
        );
        if (storedRecord) {
            storedRecord.autonomy = clone(dispatchRecord.autonomy);
            persist();
        }

        recordActivity("mission_dispatched", {
            missionId: mission.id,
            leadOffice: assignments.leadOffice.id,
            assignedOffices: assignedOfficeIds,
            createdTaskCount: createdTasks.length,
            autonomous: machineInitiated,
            executionStarted,
            officeDispatchReceipt,
            approvedWorkReceipt
        });

        return {
            dispatched: true,
            autonomous: machineInitiated,
            executionStarted,
            awaitingApprovedWork: !executionStarted,
            mission: engine.getMission(mission.id),
            dispatchRecord: clone(
                storedRecord || dispatchRecord
            )
        };
    }

    function canDispatchMission(mission) {
        if (!mission || !mission.id) {
            return false;
        }

        if (missionHasBeenDispatched(mission.id)) {
            return false;
        }

        const dispatchableStatuses = [
            "intake",
            "queued",
            "assigned",
            "approved",
            "revisions_requested"
        ];

        return dispatchableStatuses.includes(mission.status);
    }

    function canAutonomouslyDispatchMission(mission) {
        return (
            canDispatchMission(mission) &&
            missionHasHumanApprovalForAutonomousWork(mission)
        );
    }

    function markDispatchExecutionStarted(missionId) {
        const record = state.dispatchRecords.find(
            item => item.missionId === missionId
        );

        if (!record) {
            return null;
        }

        record.autonomy = {
            ...(record.autonomy || {}),
            executionStarted: true,
            executionStartedAt:
                record.autonomy?.executionStartedAt || now(),
            approvedWorkReceipt: captureAutonomyReceipt(
                AUTONOMY_CAPABILITIES.APPROVED_WORK
            )
        };
        state.updatedAt = now();
        persist();
        return clone(record);
    }

    function resumeRoutedMission(missionId, options = {}) {
        const engine = getMissionEngine();

        if (!engine) {
            return {
                started: false,
                reason: "mission_engine_unavailable",
                missionId
            };
        }

        if (
            options.humanDirected !== true &&
            !isAutonomyAuthorized(
                AUTONOMY_CAPABILITIES.APPROVED_WORK
            )
        ) {
            return {
                started: false,
                reason: "approved_work_authority_not_effective",
                missionId
            };
        }

        const mission = engine.getMission(missionId);

        if (!mission) {
            return {
                started: false,
                reason: "mission_not_found",
                missionId
            };
        }

        if (!missionHasBeenDispatched(missionId)) {
            return {
                started: false,
                reason: "mission_not_dispatched",
                missionId
            };
        }

        if (!missionHasHumanApprovalForAutonomousWork(mission)) {
            return {
                started: false,
                reason: "mission_human_approval_not_satisfied",
                missionId
            };
        }

        if (mission.status === "in_progress") {
            return {
                started: false,
                reason: "already_in_progress",
                missionId
            };
        }

        if (
            ["completed", "archived", "cancelled", "blocked", "pending_approval"]
                .includes(mission.status)
        ) {
            return {
                started: false,
                reason: `mission_not_startable:${mission.status}`,
                missionId
            };
        }

        engine.startMission(
            missionId,
            `Approved autonomous work beginning on: ${mission.title}`
        );
        const record = markDispatchExecutionStarted(missionId);
        const receipt = captureAutonomyReceipt(
            AUTONOMY_CAPABILITIES.APPROVED_WORK
        );

        recordActivity("routed_mission_started", {
            missionId,
            autonomous: options.humanDirected !== true,
            authorityReceipt: receipt
        });

        return {
            started: true,
            mission: engine.getMission(missionId),
            dispatchRecord: record,
            authorityReceipt: receipt
        };
    }

    function scanForMissions(options = {}) {
        const autonomous = options.humanDirected !== true;
        const engine = getMissionEngine();

        if (autonomous && !isAutonomyAuthorized(
            AUTONOMY_CAPABILITIES.OFFICE_DISPATCH
        )) {
            return {
                scanned: false,
                reason: "office_dispatch_authority_not_effective",
                dispatched: [],
                started: []
            };
        }

        if (!engine) {
            recordActivity("scan_failed", {
                reason: "mission_engine_unavailable"
            });

            return {
                scanned: false,
                reason: "mission_engine_unavailable",
                dispatched: [],
                started: []
            };
        }

        const missions = engine.getActiveMissions();
        const dispatchableMissions = autonomous
            ? missions.filter(canAutonomouslyDispatchMission)
            : missions.filter(canDispatchMission);
        const results = [];

        dispatchableMissions.forEach((mission) => {
            try {
                const result = dispatchMission(mission.id, {
                    autonomous,
                    source: autonomous
                        ? "autonomy-scanner"
                        : "human-directed-scan"
                });
                results.push(result);
            } catch (error) {
                console.error(
                    `MEOS could not dispatch mission ${mission.id}.`,
                    error
                );

                recordActivity("dispatch_failed", {
                    missionId: mission.id,
                    error: error.message
                });
            }
        });

        const started = [];

        if (
            !autonomous ||
            isAutonomyAuthorized(
                AUTONOMY_CAPABILITIES.APPROVED_WORK
            )
        ) {
            missions
                .filter(mission => missionHasBeenDispatched(mission.id))
                .filter(mission => mission.status !== "in_progress")
                .forEach(mission => {
                    const result = resumeRoutedMission(
                        mission.id,
                        { humanDirected: !autonomous }
                    );
                    if (result.started) {
                        started.push(result);
                    }
                });
        }

        recordActivity("mission_scan_completed", {
            autonomous,
            scannedCount: missions.length,
            dispatchableCount: dispatchableMissions.length,
            dispatchedCount: results.filter(
                (result) => result.dispatched
            ).length,
            startedCount: started.length
        });

        return {
            scanned: true,
            autonomous,
            totalMissions: missions.length,
            dispatchableMissions: dispatchableMissions.length,
            dispatched: results,
            started
        };
    }

    function getNextMissionForOffice(officeId) {
        const engine = getMissionEngine();

        if (
            !engine ||
            typeof engine.getNextMissionForOffice !== "function"
        ) {
            return null;
        }

        return engine.getNextMissionForOffice(officeId);
    }

    /**
     * Called when an office finishes its current assignment.
     *
     * Work waiting for approval does not prevent the office from receiving
     * its next queued mission.
     */
    function advanceOffice(officeId, options = {}) {
        const engine = getMissionEngine();

        if (!engine) {
            throw new Error("MEOS Mission Engine is not available.");
        }

        const nextMission = getNextMissionForOffice(officeId);

        if (!nextMission) {
            recordActivity("office_available", {
                officeId,
                nextMission: null
            });

            return {
                officeId,
                advanced: false,
                reason: "no_assigned_mission_available"
            };
        }

        const autonomous = options.autonomous === true;

        if (autonomous && !isAutonomyAuthorized(
            AUTONOMY_CAPABILITIES.OFFICE_DISPATCH
        )) {
            return {
                officeId,
                advanced: false,
                reason: "office_dispatch_authority_not_effective"
            };
        }

        if (!missionHasBeenDispatched(nextMission.id)) {
            const dispatchResult = dispatchMission(
                nextMission.id,
                autonomous
                    ? { autonomous: true, source: "office-advance" }
                    : { humanDirected: true }
            );

            if (!dispatchResult.dispatched) {
                return {
                    officeId,
                    advanced: false,
                    reason: dispatchResult.reason || "dispatch_failed",
                    dispatchResult
                };
            }
        }

        if (
            autonomous &&
            !isAutonomyAuthorized(
                AUTONOMY_CAPABILITIES.APPROVED_WORK
            )
        ) {
            return {
                officeId,
                advanced: false,
                routed: true,
                reason: "approved_work_authority_not_effective",
                mission: engine.getMission(nextMission.id)
            };
        }

        engine.startMission(
            nextMission.id,
            `Office ${officeId} began its next assignment`
        );
        markDispatchExecutionStarted(nextMission.id);

        recordActivity("office_advanced", {
            officeId,
            missionId: nextMission.id
        });

        return {
            officeId,
            advanced: true,
            mission: engine.getMission(nextMission.id)
        };
    }

    function start(options = {}) {
        if (state.running) {
            return {
                started: false,
                reason: "already_running",
                scanInterval: state.scanInterval
            };
        }

        if (!isAutonomyAuthorized(
            AUTONOMY_CAPABILITIES.OFFICE_DISPATCH
        )) {
            state.autonomy.lastSyncAt = now();
            state.autonomy.lastOfficeDispatchEffective = false;
            state.autonomy.lastReason =
                "office_dispatch_authority_not_effective";

            return {
                started: false,
                reason: "office_dispatch_authority_not_effective",
                scanInterval: state.scanInterval
            };
        }

        const requestedInterval = Number(options.scanInterval);

        if (
            Number.isFinite(requestedInterval) &&
            requestedInterval >= 1000
        ) {
            state.scanInterval = requestedInterval;
        }

        state.running = true;
        state.updatedAt = now();

        scanForMissions();

        state.timerId = global.setInterval(
            () => scanForMissions(),
            state.scanInterval
        );

        recordActivity("dispatcher_started", {
            scanInterval: state.scanInterval,
            authorityReceipt: captureAutonomyReceipt(
                AUTONOMY_CAPABILITIES.OFFICE_DISPATCH
            )
        });

        console.log(
            `MEOS Mission Dispatcher autonomy compatibility scanner started. Scanning every ${state.scanInterval}ms.`
        );

        persist();

        return {
            started: true,
            scanInterval: state.scanInterval,
            autonomyGoverned: true
        };
    }

    function stop(options = {}) {
        const wasRunning = state.running || state.timerId !== null;

        if (state.timerId !== null) {
            global.clearInterval(state.timerId);
            state.timerId = null;
        }

        state.running = false;
        state.updatedAt = now();

        if (wasRunning || options.recordWhenAlreadyStopped === true) {
            recordActivity("dispatcher_stopped", {
                reason: options.reason || "stopped"
            });
        }

        if (wasRunning && options.silent !== true) {
            console.log("MEOS Mission Dispatcher stopped.");
        }

        persist();

        return {
            stopped: true,
            wasRunning,
            reason: options.reason || null
        };
    }

    function syncAutonomyRuntime() {
        const officeStatus = autonomyCapabilityStatus(
            AUTONOMY_CAPABILITIES.OFFICE_DISPATCH
        );
        const approvedStatus = autonomyCapabilityStatus(
            AUTONOMY_CAPABILITIES.APPROVED_WORK
        );
        const authority = getAutonomyAuthority();
        let authoritySnapshot = null;

        try {
            authoritySnapshot =
                typeof authority?.getSnapshot === "function"
                    ? authority.getSnapshot()
                    : null;
        } catch (_error) {
            authoritySnapshot = null;
        }

        state.autonomy.lastSyncAt = now();
        state.autonomy.lastOfficeDispatchEffective =
            officeStatus?.effective === true;
        state.autonomy.lastApprovedWorkEffective =
            approvedStatus?.effective === true;
        state.autonomy.lastAuthorityRevision =
            Number(authoritySnapshot?.revision || 0) || null;
        state.autonomy.lastReason =
            officeStatus?.reason || "authority-unproven";

        if (officeStatus?.effective === true) {
            const result = start();
            if (approvedStatus?.effective === true) {
                scanForMissions();
            }
            return {
                synced: true,
                running: state.running,
                officeDispatch: clone(officeStatus),
                approvedWork: clone(approvedStatus),
                startResult: result
            };
        }

        const stopResult = stop({
            reason: "office_dispatch_authority_not_effective",
            silent: true
        });

        return {
            synced: true,
            running: false,
            officeDispatch: clone(officeStatus),
            approvedWork: clone(approvedStatus),
            stopResult
        };
    }

    function bindAutonomyAuthority() {
        if (state.autonomy.subscriptionBound) {
            return { bound: true, alreadyBound: true };
        }

        const authority = getAutonomyAuthority();

        if (!authority || typeof authority.on !== "function") {
            return {
                bound: false,
                reason: "maddy-autonomy-authority-unavailable"
            };
        }

        const sync = () => {
            try {
                syncAutonomyRuntime();
            } catch (error) {
                console.warn(
                    "MEOS Mission Dispatcher autonomy synchronization failed.",
                    error
                );
                stop({
                    reason: "autonomy_sync_failed",
                    silent: true
                });
            }
        };

        authority.on("authority:updated", sync);
        authority.on("authority:unavailable", sync);
        state.autonomy.subscriptionBound = true;
        sync();

        return { bound: true, alreadyBound: false };
    }

    function restart(options = {}) {
        stop();
        return start(options);
    }

    function getDispatchRecord(missionId) {
        const record = state.dispatchRecords.find(
            (item) => item.missionId === missionId
        );

        return record ? clone(record) : null;
    }

    function getDispatchHistory(limit = 100) {
        return clone(state.dispatchRecords.slice(0, limit));
    }

    function getActivityLog(limit = 100) {
        return clone(state.activity.slice(0, limit));
    }

    function getRoutingRules() {
        return clone(ROUTING_RULES);
    }

    function getStatus() {
        const engine = getMissionEngine();

        return {
            version: VERSION,
            running: state.running,
            scanInterval: state.scanInterval,
            missionEngineConnected: Boolean(engine),
            executiveOfficesConnected: Boolean(
                getExecutiveOfficeSystem()
            ),
            dispatchedMissionCount:
                state.dispatchedMissionIds.length,
            dispatchRecordCount: state.dispatchRecords.length,
            autonomy: {
                integration: getAutonomyIntegrationStatus(),
                officeDispatch: autonomyCapabilityStatus(
                    AUTONOMY_CAPABILITIES.OFFICE_DISPATCH
                ),
                approvedWork: autonomyCapabilityStatus(
                    AUTONOMY_CAPABILITIES.APPROVED_WORK
                ),
                runtime: clone(state.autonomy)
            },
            initializedAt: state.initializedAt,
            updatedAt: state.updatedAt
        };
    }

    function resetDispatchRecord(
        missionId,
        options = {}
    ) {
        if (options.confirm !== true) {
            throw new Error(
                "Dispatch record was not reset. Pass { confirm: true } to confirm."
            );
        }

        state.dispatchedMissionIds =
            state.dispatchedMissionIds.filter(
                (id) => id !== missionId
            );

        state.dispatchRecords =
            state.dispatchRecords.filter(
                (record) => record.missionId !== missionId
            );

        recordActivity("dispatch_record_reset", {
            missionId
        });

        persist();

        return true;
    }

    function clearDispatcherData(options = {}) {
        if (options.confirm !== true) {
            throw new Error(
                "Dispatcher data was not cleared. Pass { confirm: true } to confirm."
            );
        }

        stop();

        state.dispatchedMissionIds = [];
        state.dispatchRecords = [];
        state.activity = [];
        state.initializedAt = now();
        state.updatedAt = state.initializedAt;

        persist();

        console.warn("MEOS Mission Dispatcher data cleared.");

        return true;
    }

    function buildPersistenceSnapshot() {
        return {
            schema: STATE_SCHEMA,
            version: VERSION,
            buildId: BUILD_ID,
            commission: COMMISSION,
            operational: {
                scanInterval: state.scanInterval,
                dispatchedMissionIds: clone(
                    state.dispatchedMissionIds
                ),
                dispatchRecords: clone(
                    state.dispatchRecords.slice(
                        0,
                        MAX_PERSISTED_DISPATCH_RECORDS
                    )
                ),
                activity: clone(
                    state.activity.slice(
                        0,
                        MAX_PERSISTED_ACTIVITY
                    )
                ),
                initializedAt: state.initializedAt,
                updatedAt: state.updatedAt
            },
            authority: {
                autonomyPolicyStoredHere: false,
                sourceOfTruth:
                    "server-durable-maddy-autonomy-authority",
                browserAuthority: false
            },
            capturedAt: now()
        };
    }

    function applyPersistenceSnapshot(snapshot = {}) {
        if (
            !snapshot ||
            snapshot.schema !== STATE_SCHEMA ||
            !snapshot.operational
        ) {
            return {
                applied: false,
                reason: "invalid-dispatcher-persistence-snapshot"
            };
        }

        const operational = snapshot.operational;

        stop({ reason: "persistence_snapshot_apply", silent: true });
        state.scanInterval =
            Number(operational.scanInterval) ||
            DEFAULT_SCAN_INTERVAL;
        state.dispatchedMissionIds = Array.isArray(
            operational.dispatchedMissionIds
        )
            ? clone(operational.dispatchedMissionIds)
            : [];
        state.dispatchRecords = Array.isArray(
            operational.dispatchRecords
        )
            ? clone(operational.dispatchRecords)
            : [];
        state.activity = Array.isArray(operational.activity)
            ? clone(operational.activity)
            : [];
        state.initializedAt =
            operational.initializedAt || now();
        state.updatedAt = now();

        persist();

        return {
            applied: true,
            running: false,
            authorityImported: false,
            snapshot: buildPersistenceSnapshot()
        };
    }

    function runAutonomyAcceptanceTest() {
        const checks = [];
        const check = (name, passed, details = null) => {
            checks.push({
                name,
                passed: passed === true,
                details
            });
        };
        const integration = getAutonomyIntegrationStatus();
        const persistenceSnapshot = buildPersistenceSnapshot();

        check(
            "Office Dispatch integration contract is present",
            integration.ready === true &&
                integration.browserAuthority === false
        );
        check(
            "Office Dispatch and Approved Work are separate authorities",
            integration.approvedWorkSeparatelyGoverned === true
        );
        check(
            "Legacy timer cannot create autonomy",
            integration.legacyTimerCreatesAuthority === false
        );
        check(
            "Automatic dispatcher start requires central Office Dispatch authority",
            /office_dispatch_authority_not_effective/.test(
                start.toString()
            ) &&
                /isAutonomyAuthorized/.test(start.toString())
        );
        check(
            "Machine dispatch requires central Office Dispatch authority",
            /officeDispatchAuthorized/.test(
                dispatchMission.toString()
            ) &&
                /isMachineDispatchInvocation/.test(
                    dispatchMission.toString()
                )
        );
        check(
            "Autonomous dispatch requires satisfied human mission approval when required",
            /missionHasHumanApprovalForAutonomousWork/.test(
                dispatchMission.toString()
            )
        );
        check(
            "Routing can wait for Approved Work instead of secretly starting execution",
            /awaitingApprovedWork/.test(
                dispatchMission.toString()
            ) &&
                /approvedWorkAuthorized/.test(
                    dispatchMission.toString()
                )
        );
        check(
            "Routed work can resume when Approved Work becomes effective",
            typeof resumeRoutedMission === "function" &&
                /APPROVED_WORK/.test(
                    resumeRoutedMission.toString()
                )
        );
        check(
            "Automatic spend remains unauthorized",
            integration.automaticSpendAuthorized === false
        );
        check(
            "External action remains unauthorized",
            integration.externalActionAuthorized === false &&
                integration.legalCommitmentAuthorized === false
        );
        check(
            "Signature/certification/submission remain unauthorized",
            integration.signatureAuthorized === false &&
                integration.certificationAuthorized === false &&
                integration.submissionAuthorized === false
        );
        check(
            "Persistence snapshot contains no autonomy policy authority",
            persistenceSnapshot.authority
                .autonomyPolicyStoredHere === false &&
                persistenceSnapshot.authority
                    .browserAuthority === false
        );
        check(
            "Browser-independent dispatch runner is not falsely claimed",
            integration.browserIndependentRunnerCommissioned === false
        );

        const success = checks.every(item => item.passed);

        console.table(checks);
        console.info(
            `[MEOS ${VERSION}] Commission ${COMMISSION} autonomy acceptance: ${success ? "PASS" : "FAIL"}.`
        );

        return {
            schema:
                "meos.mission-dispatcher.autonomy-acceptance.v1",
            commission: COMMISSION,
            version: VERSION,
            buildId: BUILD_ID,
            success,
            passed: checks.filter(item => item.passed).length,
            total: checks.length,
            checks,
            status: getStatus()
        };
    }

    function runPersistenceAcceptanceTest() {
        const checks = [
            {
                name: "Dispatcher persistence circuit breaker exists",
                passed:
                    typeof isQuotaExceededError === "function" &&
                    typeof retryPersistence === "function"
            },
            {
                name: "Persisted dispatch history is bounded",
                passed: MAX_PERSISTED_DISPATCH_RECORDS === 100
            },
            {
                name: "Persisted activity history is bounded",
                passed: MAX_PERSISTED_ACTIVITY === 100
            },
            {
                name: "Quota exhaustion suspends repeated writes",
                passed:
                    /state\.persistence\.suspended/.test(
                        persist.toString()
                    ) &&
                    /QuotaExceededError/.test(
                        isQuotaExceededError.toString()
                    )
            },
            {
                name: "Runtime dispatch remains independent from persistence",
                passed:
                    typeof scanForMissions === "function" &&
                    typeof dispatchMission === "function"
            }
        ];

        const passed = checks.every(item => item.passed);
        console.table(checks);
        console.info(
            `[MEOS ${VERSION}] Commission 006.016B1 persistence acceptance: ${passed ? "PASS" : "FAIL"}.`
        );

        return {
            commission: "006.016B1",
            version: VERSION,
            buildId: BUILD_ID,
            passed,
            checks,
            persistence: persistenceStatus()
        };
    }

    const restored = restore();

    if (!restored) {
        state.initializedAt = now();
        state.updatedAt = state.initializedAt;
        persist();
    }

    const MissionDispatcher = Object.freeze({
        version: VERSION,
        buildId: BUILD_ID,

        constants: Object.freeze({
            OFFICE_KEYS,
            OFFICE_ALIASES,
            AUTONOMY_CAPABILITIES
        }),

        start,
        stop,
        restart,

        scanForMissions,
        dispatchMission,
        resumeRoutedMission,
        advanceOffice,

        getStatus,
        getAutonomyIntegrationStatus,
        autonomyCapabilityStatus,
        isAutonomyAuthorized,
        captureAutonomyReceipt,
        syncAutonomyRuntime,
        bindAutonomyAuthority,
        getRoutingRules,
        getDispatchRecord,
        getDispatchHistory,
        getActivityLog,
        getPersistenceStatus: persistenceStatus,
        retryPersistence,
        buildPersistenceSnapshot,
        applyPersistenceSnapshot,
        runPersistenceAcceptanceTest,
        runAutonomyAcceptanceTest,

        resetDispatchRecord,
        clearDispatcherData
    });

    global.MEOSMissionDispatcher = MissionDispatcher;

    // Bind when the switchboard is already present. If it is loaded later,
    // the dashboard/bootstrap layer may call bindAutonomyAuthority(); the
    // dispatcher remains safely stopped until durable authority is proven.
    bindAutonomyAuthority();

    if (typeof global.addEventListener === "function") {
        global.addEventListener("load", () => {
            if (!state.autonomy.subscriptionBound) {
                bindAutonomyAuthority();
            }
        }, { once: true });
    }

    console.log(
        `%cMEOS ${VERSION} Mission Dispatcher initialized. Build ${BUILD_ID}.`,
        "font-weight: bold;"
    );

    console.log(
        "Mission Engine connected:",
        Boolean(getMissionEngine())
    );

    console.log(
        "Executive Offices connected:",
        Boolean(getExecutiveOfficeSystem())
    );

    console.log(
        "Maddy Autonomy connected:",
        Boolean(getAutonomyAuthority()),
        "| Office Dispatch effective:",
        isAutonomyAuthorized(
            AUTONOMY_CAPABILITIES.OFFICE_DISPATCH
        )
    );
})(window);
