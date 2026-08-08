/**
 * MEOS Mission Dispatcher
 * Version: 0.1.1
 * Build: MD011-PERSISTENCE-CIRCUIT-BREAKER-20260808-A
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

    const VERSION = "0.1.1";
    const BUILD_ID = "MD011-PERSISTENCE-CIRCUIT-BREAKER-20260808-A";
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
        task
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
                    `Working on: ${mission.title}`
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
                    `Mission received: ${mission.title}`
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

        if (
            missionHasBeenDispatched(missionId) &&
            options.force !== true
        ) {
            return {
                dispatched: false,
                reason: "already_dispatched",
                missionId
            };
        }

        const assignments = buildOfficeAssignments(mission);

        const assignedOfficeIds = unique(
            assignments.allOffices.map((office) => office.id)
        );

        engine.assignMission(mission.id, {
            leadOffice: assignments.leadOffice.id,
            offices: assignedOfficeIds,
            currentActivity:
                "Mission routed to the Executive Offices"
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
                        matchingTask
                    )
                };
            }
        );

        engine.startMission(
            mission.id,
            `Executive Offices beginning work on: ${mission.title}`
        );

        markMissionDispatched(mission.id);

        const dispatchRecord = createDispatchRecord(
            mission,
            assignments,
            createdTasks,
            officeBridgeResults
        );

        recordActivity("mission_dispatched", {
            missionId: mission.id,
            leadOffice: assignments.leadOffice.id,
            assignedOffices: assignedOfficeIds,
            createdTaskCount: createdTasks.length
        });

        return {
            dispatched: true,
            mission: engine.getMission(mission.id),
            dispatchRecord: clone(dispatchRecord)
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
            "revisions_requested"
        ];

        return dispatchableStatuses.includes(mission.status);
    }

    function scanForMissions() {
        const engine = getMissionEngine();

        if (!engine) {
            recordActivity("scan_failed", {
                reason: "mission_engine_unavailable"
            });

            return {
                scanned: false,
                reason: "mission_engine_unavailable",
                dispatched: []
            };
        }

        const missions = engine.getActiveMissions();
        const dispatchableMissions = missions.filter(canDispatchMission);
        const results = [];

        dispatchableMissions.forEach((mission) => {
            try {
                const result = dispatchMission(mission.id);
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

        recordActivity("mission_scan_completed", {
            scannedCount: missions.length,
            dispatchableCount: dispatchableMissions.length,
            dispatchedCount: results.filter(
                (result) => result.dispatched
            ).length
        });

        return {
            scanned: true,
            totalMissions: missions.length,
            dispatchableMissions: dispatchableMissions.length,
            dispatched: results
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
    function advanceOffice(officeId) {
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

        if (!missionHasBeenDispatched(nextMission.id)) {
            dispatchMission(nextMission.id);
        }

        engine.startMission(
            nextMission.id,
            `Office ${officeId} began its next assignment`
        );

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
            scanForMissions,
            state.scanInterval
        );

        recordActivity("dispatcher_started", {
            scanInterval: state.scanInterval
        });

        console.log(
            `MEOS Mission Dispatcher started. Scanning every ${state.scanInterval}ms.`
        );

        persist();

        return {
            started: true,
            scanInterval: state.scanInterval
        };
    }

    function stop() {
        if (state.timerId !== null) {
            global.clearInterval(state.timerId);
            state.timerId = null;
        }

        state.running = false;
        state.updatedAt = now();

        recordActivity("dispatcher_stopped");

        console.log("MEOS Mission Dispatcher stopped.");

        persist();

        return {
            stopped: true
        };
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
            OFFICE_ALIASES
        }),

        start,
        stop,
        restart,

        scanForMissions,
        dispatchMission,
        advanceOffice,

        getStatus,
        getRoutingRules,
        getDispatchRecord,
        getDispatchHistory,
        getActivityLog,
        getPersistenceStatus: persistenceStatus,
        retryPersistence,
        runPersistenceAcceptanceTest,

        resetDispatchRecord,
        clearDispatcherData
    });

    global.MEOSMissionDispatcher = MissionDispatcher;

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
})(window);
