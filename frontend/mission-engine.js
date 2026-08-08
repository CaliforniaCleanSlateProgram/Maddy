/**
 * MEOS Mission Engine
 * Version: 0.1.1
 * Build: ME011-LAPTOP-INDEXEDDB-PERSISTENCE-20260808-A
 *
 * Purpose:
 * The Mission Engine is the central work-management system for MEOS.
 *
 * It creates, assigns, tracks, completes, and preserves missions across
 * all Executive Offices.
 *
 * Operating principles:
 * - MEOS continues working while approvals are pending.
 * - Completed work requiring authority enters the Executive Approval Queue.
 * - Approval queues do not block other missions.
 * - Offices may hold multiple missions.
 * - Every mission keeps a permanent activity history.
 * - Missions may originate from the Executive Director, Executive Intake,
 *   an Executive Office, an email, an uploaded document, or opportunity discovery.
 */

(function initializeMissionEngine(global) {
    "use strict";

    const VERSION = "0.1.1";
    const BUILD_ID = "ME011-LAPTOP-INDEXEDDB-PERSISTENCE-20260808-A";
    const STORAGE_KEY = "meos_mission_engine_v0_1_0";
    const INDEXED_DB_NAME = "meos-local-executive-repository";
    const INDEXED_DB_VERSION = 1;
    const INDEXED_DB_STORE = "engine-state";
    const INDEXED_DB_RECORD_ID = "mission-engine-state";
    const PERSISTENCE_DEBOUNCE_MS = 150;

    const persistence = {
        mode: global.indexedDB ? "indexeddb-local-laptop" : "legacy-localstorage-fallback",
        authoritativeStorage: global.indexedDB ? "indexeddb" : "localstorage",
        indexedDbAvailable: Boolean(global.indexedDB),
        databaseName: INDEXED_DB_NAME,
        storeName: INDEXED_DB_STORE,
        hydrated: false,
        migratedLegacySnapshot: false,
        localStorageReleased: false,
        writeScheduled: false,
        writeInFlight: false,
        suspended: false,
        lastPersistedAt: null,
        lastRestoredAt: null,
        lastError: null
    };

    let persistenceTimer = null;
    let indexedDbPromise = null;
    let writeChain = Promise.resolve();

    const MISSION_STATUS = Object.freeze({
        INTAKE: "intake",
        QUEUED: "queued",
        ASSIGNED: "assigned",
        IN_PROGRESS: "in_progress",
        BLOCKED: "blocked",
        PENDING_APPROVAL: "pending_approval",
        APPROVED: "approved",
        REVISIONS_REQUESTED: "revisions_requested",
        COMPLETED: "completed",
        ARCHIVED: "archived",
        CANCELLED: "cancelled"
    });

    const APPROVAL_STATUS = Object.freeze({
        NOT_REQUIRED: "not_required",
        NOT_SUBMITTED: "not_submitted",
        PENDING: "pending",
        APPROVED: "approved",
        REVISIONS_REQUESTED: "revisions_requested",
        REJECTED: "rejected"
    });

    const PRIORITY = Object.freeze({
        CRITICAL: "critical",
        HIGH: "high",
        NORMAL: "normal",
        LOW: "low"
    });

    const MISSION_SOURCE = Object.freeze({
        EXECUTIVE_DIRECTOR: "executive_director",
        MADDY: "maddy",
        EXECUTIVE_OFFICE: "executive_office",
        EXECUTIVE_INTAKE: "executive_intake",
        FILE_UPLOAD: "file_upload",
        EMAIL: "email",
        CALENDAR: "calendar",
        OPPORTUNITY_DISCOVERY: "opportunity_discovery",
        AUTOMATED_MONITORING: "automated_monitoring",
        SYSTEM: "system"
    });

    const MISSION_TYPE = Object.freeze({
        GENERAL: "general",
        GRANT: "grant",
        FINANCE: "finance",
        BANKING: "banking",
        LEGAL: "legal",
        COMPLIANCE: "compliance",
        OPERATIONS: "operations",
        HUMAN_RESOURCES: "human_resources",
        COMMUNICATIONS: "communications",
        FUNDRAISING: "fundraising",
        PARTNERSHIP: "partnership",
        BOARD_GOVERNANCE: "board_governance",
        REGISTRATION: "registration",
        REPORTING: "reporting",
        RESEARCH: "research",
        TECHNOLOGY: "technology",
        DOCUMENT_REVIEW: "document_review",
        OPPORTUNITY: "opportunity"
    });

    const state = {
        version: VERSION,
        missions: [],
        approvalQueue: [],
        completedMissions: [],
        archivedMissions: [],
        activity: [],
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

    function normalizeArray(value) {
        return Array.isArray(value) ? [...value] : [];
    }

    function isValidStatus(status) {
        return Object.values(MISSION_STATUS).includes(status);
    }

    function isValidApprovalStatus(status) {
        return Object.values(APPROVAL_STATUS).includes(status);
    }

    function isValidPriority(priority) {
        return Object.values(PRIORITY).includes(priority);
    }

    function isValidSource(source) {
        return Object.values(MISSION_SOURCE).includes(source);
    }

    function isValidMissionType(type) {
        return Object.values(MISSION_TYPE).includes(type);
    }

    function priorityWeight(priority) {
        switch (priority) {
            case PRIORITY.CRITICAL:
                return 4;
            case PRIORITY.HIGH:
                return 3;
            case PRIORITY.NORMAL:
                return 2;
            case PRIORITY.LOW:
                return 1;
            default:
                return 0;
        }
    }

    function recordActivity(action, details = {}) {
        const entry = {
            id: createId("ACT"),
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

    function addMissionHistory(mission, action, message, details = {}) {
        const entry = {
            id: createId("HIST"),
            action,
            message,
            details: clone(details),
            timestamp: now()
        };

        mission.history.unshift(entry);
        mission.updatedAt = entry.timestamp;
        state.updatedAt = entry.timestamp;

        return entry;
    }

    function applyStateSnapshot(parsed) {
        if (!parsed || !Array.isArray(parsed.missions)) {
            return false;
        }

        state.missions = parsed.missions || [];
        state.approvalQueue = parsed.approvalQueue || [];
        state.completedMissions = parsed.completedMissions || [];
        state.archivedMissions = parsed.archivedMissions || [];
        state.activity = parsed.activity || [];
        state.initializedAt = parsed.initializedAt || now();
        state.updatedAt = parsed.updatedAt || now();

        sortActiveMissions();
        sortApprovalQueue();

        return true;
    }

    function snapshotState() {
        return clone(state);
    }

    function openIndexedDb() {
        if (!global.indexedDB) {
            return Promise.reject(
                new Error("IndexedDB is unavailable in this browser.")
            );
        }

        if (indexedDbPromise) {
            return indexedDbPromise;
        }

        indexedDbPromise = new Promise((resolve, reject) => {
            const request = global.indexedDB.open(
                INDEXED_DB_NAME,
                INDEXED_DB_VERSION
            );

            request.onupgradeneeded = () => {
                const database = request.result;

                if (!database.objectStoreNames.contains(INDEXED_DB_STORE)) {
                    database.createObjectStore(INDEXED_DB_STORE, {
                        keyPath: "id"
                    });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () =>
                reject(
                    request.error ||
                        new Error("Mission Engine IndexedDB open failed.")
                );
            request.onblocked = () =>
                reject(
                    new Error("Mission Engine IndexedDB upgrade was blocked.")
                );
        });

        return indexedDbPromise;
    }

    async function indexedDbGet(recordId = INDEXED_DB_RECORD_ID) {
        const database = await openIndexedDb();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(
                INDEXED_DB_STORE,
                "readonly"
            );
            const store = transaction.objectStore(INDEXED_DB_STORE);
            const request = store.get(recordId);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () =>
                reject(
                    request.error ||
                        new Error("Mission Engine IndexedDB read failed.")
                );
        });
    }

    async function indexedDbPut(record) {
        const database = await openIndexedDb();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(
                INDEXED_DB_STORE,
                "readwrite"
            );
            const store = transaction.objectStore(INDEXED_DB_STORE);
            const request = store.put(record);

            request.onsuccess = () => resolve(true);
            request.onerror = () =>
                reject(
                    request.error ||
                        new Error("Mission Engine IndexedDB write failed.")
                );
            transaction.onerror = () =>
                reject(
                    transaction.error ||
                        new Error(
                            "Mission Engine IndexedDB transaction failed."
                        )
                );
        });
    }

    async function indexedDbDelete(recordId) {
        const database = await openIndexedDb();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(
                INDEXED_DB_STORE,
                "readwrite"
            );
            const store = transaction.objectStore(INDEXED_DB_STORE);
            const request = store.delete(recordId);

            request.onsuccess = () => resolve(true);
            request.onerror = () =>
                reject(
                    request.error ||
                        new Error("Mission Engine IndexedDB delete failed.")
                );
        });
    }

    function releaseLegacyLocalStorage() {
        try {
            global.localStorage.removeItem(STORAGE_KEY);
            persistence.localStorageReleased = true;
            return true;
        } catch (error) {
            persistence.lastError = error?.message || String(error);
            return false;
        }
    }

    async function persistIndexedDbNow() {
        if (!global.indexedDB || persistence.suspended) {
            return false;
        }

        const snapshot = snapshotState();
        persistence.writeScheduled = false;
        persistence.writeInFlight = true;

        try {
            await indexedDbPut({
                id: INDEXED_DB_RECORD_ID,
                schema: "meos.mission-engine.local-state.v1",
                version: VERSION,
                buildId: BUILD_ID,
                savedAt: now(),
                state: snapshot
            });

            persistence.mode = "indexeddb-local-laptop";
            persistence.authoritativeStorage = "indexeddb";
            persistence.lastPersistedAt = now();
            persistence.lastError = null;
            persistence.suspended = false;

            /*
             * Commission 006.016G1:
             * Once the full Mission Engine snapshot is safely in IndexedDB,
             * remove the old multi-megabyte localStorage record. This releases
             * browser quota without deleting mission history.
             */
            releaseLegacyLocalStorage();

            return true;
        } catch (error) {
            persistence.lastError = error?.message || String(error);
            persistence.suspended = true;

            console.error(
                "[MEOS Mission Engine] IndexedDB persistence failed. Runtime work continues.",
                error
            );

            return false;
        } finally {
            persistence.writeInFlight = false;
        }
    }

    function scheduleIndexedDbPersistence() {
        if (!global.indexedDB || persistence.suspended) {
            return false;
        }

        persistence.writeScheduled = true;

        if (persistenceTimer) {
            global.clearTimeout(persistenceTimer);
        }

        persistenceTimer = global.setTimeout(() => {
            persistenceTimer = null;
            writeChain = writeChain
                .catch(() => undefined)
                .then(() => persistIndexedDbNow());
        }, PERSISTENCE_DEBOUNCE_MS);

        return true;
    }

    function persist() {
        if (global.indexedDB) {
            scheduleIndexedDbPersistence();
            return;
        }

        /*
         * Legacy fallback only. IndexedDB is the temporary laptop authority
         * while cloud storage is pending.
         */
        try {
            global.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(state)
            );
            persistence.mode = "legacy-localstorage-fallback";
            persistence.authoritativeStorage = "localstorage";
            persistence.lastPersistedAt = now();
            persistence.lastError = null;
        } catch (error) {
            persistence.lastError = error?.message || String(error);
            persistence.suspended = true;

            console.warn(
                "MEOS Mission Engine fallback localStorage persistence is full. Runtime work continues.",
                error
            );
        }
    }

    function restoreLegacySnapshot() {
        try {
            const stored = global.localStorage.getItem(STORAGE_KEY);

            if (!stored) {
                return false;
            }

            return applyStateSnapshot(JSON.parse(stored));
        } catch (error) {
            console.warn(
                "MEOS Mission Engine could not restore legacy localStorage missions.",
                error
            );

            return false;
        }
    }

    async function hydrateFromIndexedDb() {
        if (!global.indexedDB) {
            persistence.hydrated = true;
            return {
                success: true,
                restored: false,
                source: "localstorage-fallback"
            };
        }

        try {
            const record = await indexedDbGet(INDEXED_DB_RECORD_ID);

            if (record?.state && applyStateSnapshot(record.state)) {
                persistence.hydrated = true;
                persistence.lastRestoredAt = now();
                persistence.mode = "indexeddb-local-laptop";
                persistence.authoritativeStorage = "indexeddb";
                persistence.lastError = null;
                releaseLegacyLocalStorage();

                global.dispatchEvent(
                    new CustomEvent("meos:mission-engine-hydrated", {
                        detail: {
                            source: "indexeddb",
                            activeMissions: state.missions.length,
                            restoredAt: persistence.lastRestoredAt
                        }
                    })
                );

                return {
                    success: true,
                    restored: true,
                    source: "indexeddb"
                };
            }

            /*
             * First IndexedDB run: the synchronous localStorage snapshot is
             * treated as migration input only. Save it before releasing it.
             */
            const saved = await persistIndexedDbNow();

            persistence.hydrated = true;
            persistence.migratedLegacySnapshot = saved === true;

            return {
                success: saved === true,
                restored: false,
                migratedLegacySnapshot: saved === true,
                source: "legacy-migration"
            };
        } catch (error) {
            persistence.hydrated = true;
            persistence.lastError = error?.message || String(error);

            console.error(
                "[MEOS Mission Engine] IndexedDB hydration failed; keeping runtime state.",
                error
            );

            return {
                success: false,
                restored: false,
                error: persistence.lastError
            };
        }
    }

    async function flushPersistence() {
        if (persistenceTimer) {
            global.clearTimeout(persistenceTimer);
            persistenceTimer = null;
        }

        if (global.indexedDB) {
            writeChain = writeChain
                .catch(() => undefined)
                .then(() => persistIndexedDbNow());

            return writeChain;
        }

        persist();
        return !persistence.suspended;
    }

    function getPersistenceStatus() {
        return clone({
            ...persistence,
            localStorageBytes:
                (() => {
                    try {
                        const value =
                            global.localStorage.getItem(STORAGE_KEY) || "";
                        return new Blob([value]).size;
                    } catch {
                        return null;
                    }
                })()
        });
    }

    async function runLaptopPersistenceAcceptanceTest() {
        const probeId = "mission-engine-acceptance-probe";
        const probeValue = {
            id: probeId,
            schema: "meos.persistence-probe.v1",
            writtenAt: now(),
            nonce: createId("PROBE")
        };

        const checks = [];

        checks.push({
            name: "IndexedDB is available on this laptop browser",
            passed: Boolean(global.indexedDB)
        });

        if (!global.indexedDB) {
            console.table(checks);
            return {
                commission: "006.016G1",
                version: VERSION,
                buildId: BUILD_ID,
                passed: false,
                checks
            };
        }

        try {
            await indexedDbPut(probeValue);
            const restoredProbe = await indexedDbGet(probeId);

            checks.push({
                name: "Laptop repository accepts writes",
                passed:
                    restoredProbe?.nonce === probeValue.nonce
            });

            await indexedDbDelete(probeId);
            const deletedProbe = await indexedDbGet(probeId);

            checks.push({
                name: "Laptop repository can read and delete records",
                passed: deletedProbe === null
            });

            const flushed = await flushPersistence();
            const missionRecord =
                await indexedDbGet(INDEXED_DB_RECORD_ID);

            checks.push({
                name: "Mission Engine snapshot flushes to IndexedDB",
                passed:
                    flushed === true &&
                    Array.isArray(
                        missionRecord?.state?.missions
                    )
            });

            checks.push({
                name: "Mission count survives the repository snapshot",
                passed:
                    missionRecord?.state?.missions?.length ===
                    state.missions.length
            });

            checks.push({
                name: "Legacy Mission Engine localStorage payload is released",
                passed:
                    global.localStorage.getItem(STORAGE_KEY) === null
            });

            checks.push({
                name: "IndexedDB is the temporary laptop authority",
                passed:
                    persistence.authoritativeStorage === "indexeddb" &&
                    persistence.mode === "indexeddb-local-laptop"
            });

            checks.push({
                name: "Mission runtime remains available while persistence is asynchronous",
                passed:
                    typeof createMission === "function" &&
                    typeof getActiveMissions === "function"
            });
        } catch (error) {
            checks.push({
                name: "Laptop repository test completed without error",
                passed: false,
                error: error?.message || String(error)
            });
        }

        const passed = checks.every(item => item.passed);

        console.table(checks);
        console.info(
            `[MEOS ${VERSION}] Commission 006.016G1 laptop persistence acceptance: ${passed ? "PASS" : "FAIL"}.`
        );

        return {
            commission: "006.016G1",
            version: VERSION,
            buildId: BUILD_ID,
            passed,
            checks,
            persistence: getPersistenceStatus()
        };
    }

    function findMissionRecord(missionId) {
        const collections = [
            state.missions,
            state.completedMissions,
            state.archivedMissions
        ];

        for (const collection of collections) {
            const mission = collection.find((item) => item.id === missionId);

            if (mission) {
                return mission;
            }
        }

        return null;
    }

    function requireMission(missionId) {
        const mission = findMissionRecord(missionId);

        if (!mission) {
            throw new Error(`Mission not found: ${missionId}`);
        }

        return mission;
    }

    function removeFromArrayById(collection, id) {
        const index = collection.findIndex((item) => item.id === id);

        if (index >= 0) {
            return collection.splice(index, 1)[0];
        }

        return null;
    }

    function removeApprovalQueueEntry(missionId) {
        const index = state.approvalQueue.findIndex(
            (entry) => entry.missionId === missionId
        );

        if (index >= 0) {
            return state.approvalQueue.splice(index, 1)[0];
        }

        return null;
    }

    function createMission(options = {}) {
        const title = normalizeText(options.title);

        if (!title) {
            throw new Error("A mission title is required.");
        }

        const createdAt = now();
        const approvalRequired = Boolean(options.approvalRequired);

        const mission = {
            id: createId("MIS"),
            title,
            description: normalizeText(options.description),
            objective: normalizeText(options.objective),

            type: isValidMissionType(options.type)
                ? options.type
                : MISSION_TYPE.GENERAL,

            source: isValidSource(options.source)
                ? options.source
                : MISSION_SOURCE.EXECUTIVE_DIRECTOR,

            sourceReference: options.sourceReference || null,

            priority: isValidPriority(options.priority)
                ? options.priority
                : PRIORITY.NORMAL,

            status: MISSION_STATUS.QUEUED,

            approval: {
                required: approvalRequired,
                status: approvalRequired
                    ? APPROVAL_STATUS.NOT_SUBMITTED
                    : APPROVAL_STATUS.NOT_REQUIRED,
                submittedAt: null,
                reviewedAt: null,
                reviewedBy: null,
                decisionNotes: "",
                submissionNotes: ""
            },

            assignedOffices: normalizeArray(options.assignedOffices),

            leadOffice: normalizeText(options.leadOffice) || null,

            collaborators: normalizeArray(options.collaborators),

            documents: normalizeArray(options.documents),

            tasks: normalizeArray(options.tasks),

            deliverables: normalizeArray(options.deliverables),

            recommendations: normalizeArray(options.recommendations),

            dependencies: normalizeArray(options.dependencies),

            tags: normalizeArray(options.tags),

            dueDate: options.dueDate || null,

            estimatedValue:
                typeof options.estimatedValue === "number"
                    ? options.estimatedValue
                    : null,

            revenuePotential:
                typeof options.revenuePotential === "number"
                    ? options.revenuePotential
                    : null,

            riskLevel: normalizeText(options.riskLevel, "normal"),

            progress: 0,

            currentActivity: "Awaiting assignment",

            createdBy: normalizeText(
                options.createdBy,
                "Executive Director"
            ),

            createdAt,
            startedAt: null,
            completedAt: null,
            archivedAt: null,
            updatedAt: createdAt,

            history: []
        };

        addMissionHistory(
            mission,
            "mission_created",
            `Mission created: ${mission.title}`,
            {
                source: mission.source,
                type: mission.type,
                priority: mission.priority
            }
        );

        state.missions.push(mission);

        sortActiveMissions();

        recordActivity("mission_created", {
            missionId: mission.id,
            title: mission.title
        });

        persist();

        return clone(mission);
    }

    function createMissionFromIntake(intake = {}) {
        return createMission({
            title:
                intake.missionTitle ||
                intake.title ||
                "Review newly received item",

            description:
                intake.description ||
                "A new item was received through Executive Intake.",

            objective:
                intake.objective ||
                "Review the received item and determine required action.",

            type: intake.missionType || MISSION_TYPE.DOCUMENT_REVIEW,

            source: intake.source || MISSION_SOURCE.EXECUTIVE_INTAKE,

            sourceReference: intake.intakeId || null,

            priority: intake.priority || PRIORITY.NORMAL,

            approvalRequired:
                intake.approvalRequired !== undefined
                    ? Boolean(intake.approvalRequired)
                    : true,

            assignedOffices: intake.assignedOffices || [],

            leadOffice: intake.leadOffice || null,

            documents: intake.documents || [],

            tags: intake.tags || [],

            dueDate: intake.dueDate || null,

            estimatedValue: intake.estimatedValue,

            revenuePotential: intake.revenuePotential,

            createdBy: intake.createdBy || "Executive Intake"
        });
    }

    function assignMission(missionId, assignment = {}) {
        const mission = requireMission(missionId);
        const offices = normalizeArray(assignment.offices);

        if (offices.length === 0 && !assignment.leadOffice) {
            throw new Error(
                "At least one assigned office or lead office is required."
            );
        }

        mission.assignedOffices = [
            ...new Set([...mission.assignedOffices, ...offices])
        ];

        if (assignment.leadOffice) {
            mission.leadOffice = normalizeText(assignment.leadOffice);

            if (
                mission.leadOffice &&
                !mission.assignedOffices.includes(mission.leadOffice)
            ) {
                mission.assignedOffices.unshift(mission.leadOffice);
            }
        }

        mission.status = MISSION_STATUS.ASSIGNED;
        mission.currentActivity =
            assignment.currentActivity || "Assigned and awaiting execution";

        addMissionHistory(
            mission,
            "mission_assigned",
            "Mission assigned to Executive Offices.",
            {
                leadOffice: mission.leadOffice,
                assignedOffices: mission.assignedOffices
            }
        );

        recordActivity("mission_assigned", {
            missionId,
            leadOffice: mission.leadOffice,
            assignedOffices: mission.assignedOffices
        });

        persist();

        return clone(mission);
    }

    function startMission(missionId, activity) {
        const mission = requireMission(missionId);

        mission.status = MISSION_STATUS.IN_PROGRESS;
        mission.startedAt = mission.startedAt || now();
        mission.currentActivity =
            normalizeText(activity) || "Mission execution in progress";

        addMissionHistory(
            mission,
            "mission_started",
            "Mission execution started.",
            {
                currentActivity: mission.currentActivity
            }
        );

        recordActivity("mission_started", {
            missionId,
            title: mission.title
        });

        persist();

        return clone(mission);
    }

    function updateMission(missionId, updates = {}) {
        const mission = requireMission(missionId);

        const protectedFields = new Set([
            "id",
            "createdAt",
            "history",
            "approval"
        ]);

        Object.entries(updates).forEach(([key, value]) => {
            if (!protectedFields.has(key) && key in mission) {
                mission[key] = clone(value);
            }
        });

        if (
            updates.status &&
            !isValidStatus(updates.status)
        ) {
            throw new Error(`Invalid mission status: ${updates.status}`);
        }

        if (
            updates.priority &&
            !isValidPriority(updates.priority)
        ) {
            throw new Error(`Invalid mission priority: ${updates.priority}`);
        }

        mission.updatedAt = now();

        addMissionHistory(
            mission,
            "mission_updated",
            "Mission information updated.",
            {
                updatedFields: Object.keys(updates)
            }
        );

        sortActiveMissions();

        recordActivity("mission_updated", {
            missionId,
            updatedFields: Object.keys(updates)
        });

        persist();

        return clone(mission);
    }

    function setMissionProgress(missionId, progress, currentActivity) {
        const mission = requireMission(missionId);
        const numericProgress = Number(progress);

        if (
            Number.isNaN(numericProgress) ||
            numericProgress < 0 ||
            numericProgress > 100
        ) {
            throw new Error("Mission progress must be between 0 and 100.");
        }

        mission.progress = numericProgress;

        if (currentActivity) {
            mission.currentActivity = normalizeText(currentActivity);
        }

        if (
            numericProgress > 0 &&
            numericProgress < 100 &&
            mission.status !== MISSION_STATUS.PENDING_APPROVAL
        ) {
            mission.status = MISSION_STATUS.IN_PROGRESS;
            mission.startedAt = mission.startedAt || now();
        }

        addMissionHistory(
            mission,
            "progress_updated",
            `Mission progress updated to ${numericProgress}%.`,
            {
                progress: numericProgress,
                currentActivity: mission.currentActivity
            }
        );

        recordActivity("progress_updated", {
            missionId,
            progress: numericProgress
        });

        persist();

        return clone(mission);
    }

    function addTask(missionId, task = {}) {
        const mission = requireMission(missionId);
        const title = normalizeText(task.title);

        if (!title) {
            throw new Error("A task title is required.");
        }

        const missionTask = {
            id: createId("TSK"),
            title,
            description: normalizeText(task.description),
            assignedOffice: normalizeText(task.assignedOffice) || null,
            assignedTo: normalizeText(task.assignedTo) || null,
            status: normalizeText(task.status, "pending"),
            priority: isValidPriority(task.priority)
                ? task.priority
                : mission.priority,
            dueDate: task.dueDate || null,
            createdAt: now(),
            completedAt: null,
            notes: normalizeText(task.notes)
        };

        mission.tasks.push(missionTask);

        addMissionHistory(
            mission,
            "task_added",
            `Task added: ${missionTask.title}`,
            {
                taskId: missionTask.id,
                assignedOffice: missionTask.assignedOffice
            }
        );

        recordActivity("task_added", {
            missionId,
            taskId: missionTask.id
        });

        persist();

        return clone(missionTask);
    }

    function updateTask(missionId, taskId, updates = {}) {
        const mission = requireMission(missionId);
        const task = mission.tasks.find((item) => item.id === taskId);

        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }

        Object.entries(updates).forEach(([key, value]) => {
            if (key !== "id" && key !== "createdAt" && key in task) {
                task[key] = clone(value);
            }
        });

        if (task.status === "completed" && !task.completedAt) {
            task.completedAt = now();
        }

        addMissionHistory(
            mission,
            "task_updated",
            `Task updated: ${task.title}`,
            {
                taskId,
                updates: Object.keys(updates)
            }
        );

        recordActivity("task_updated", {
            missionId,
            taskId
        });

        persist();

        return clone(task);
    }

    function addDocument(missionId, document = {}) {
        const mission = requireMission(missionId);
        const name = normalizeText(document.name);

        if (!name) {
            throw new Error("A document name is required.");
        }

        const missionDocument = {
            id: document.id || createId("DOC"),
            name,
            type: normalizeText(document.type, "unknown"),
            category: normalizeText(document.category, "general"),
            storageReference: document.storageReference || null,
            source: document.source || MISSION_SOURCE.FILE_UPLOAD,
            uploadedAt: document.uploadedAt || now(),
            uploadedBy: normalizeText(
                document.uploadedBy,
                "Executive Director"
            ),
            authoritative: Boolean(document.authoritative),
            version: normalizeText(document.version, "1.0"),
            notes: normalizeText(document.notes)
        };

        mission.documents.push(missionDocument);

        addMissionHistory(
            mission,
            "document_attached",
            `Document attached: ${missionDocument.name}`,
            {
                documentId: missionDocument.id,
                category: missionDocument.category
            }
        );

        recordActivity("document_attached", {
            missionId,
            documentId: missionDocument.id
        });

        persist();

        return clone(missionDocument);
    }

    function addDeliverable(missionId, deliverable = {}) {
        const mission = requireMission(missionId);
        const title = normalizeText(deliverable.title);

        if (!title) {
            throw new Error("A deliverable title is required.");
        }

        const item = {
            id: createId("DEL"),
            title,
            description: normalizeText(deliverable.description),
            createdByOffice:
                normalizeText(deliverable.createdByOffice) || null,
            status: normalizeText(deliverable.status, "draft"),
            documentId: deliverable.documentId || null,
            createdAt: now(),
            updatedAt: now()
        };

        mission.deliverables.push(item);

        addMissionHistory(
            mission,
            "deliverable_added",
            `Deliverable added: ${item.title}`,
            {
                deliverableId: item.id
            }
        );

        recordActivity("deliverable_added", {
            missionId,
            deliverableId: item.id
        });

        persist();

        return clone(item);
    }

    function addRecommendation(missionId, recommendation = {}) {
        const mission = requireMission(missionId);
        const title = normalizeText(recommendation.title);

        if (!title) {
            throw new Error("A recommendation title is required.");
        }

        const item = {
            id: createId("REC"),
            title,
            summary: normalizeText(recommendation.summary),
            recommendedAction: normalizeText(
                recommendation.recommendedAction
            ),
            submittedByOffice:
                normalizeText(recommendation.submittedByOffice) || null,
            confidence:
                typeof recommendation.confidence === "number"
                    ? recommendation.confidence
                    : null,
            expectedValue:
                typeof recommendation.expectedValue === "number"
                    ? recommendation.expectedValue
                    : null,
            risks: normalizeArray(recommendation.risks),
            status: "submitted",
            createdAt: now()
        };

        mission.recommendations.push(item);

        addMissionHistory(
            mission,
            "recommendation_added",
            `Recommendation submitted: ${item.title}`,
            {
                recommendationId: item.id,
                submittedByOffice: item.submittedByOffice
            }
        );

        recordActivity("recommendation_added", {
            missionId,
            recommendationId: item.id
        });

        persist();

        return clone(item);
    }

    function submitForApproval(missionId, submission = {}) {
        const mission = requireMission(missionId);

        if (!mission.approval.required) {
            mission.approval.required = true;
        }

        mission.approval.status = APPROVAL_STATUS.PENDING;
        mission.approval.submittedAt = now();
        mission.approval.submissionNotes = normalizeText(submission.notes);
        mission.status = MISSION_STATUS.PENDING_APPROVAL;
        mission.progress = Math.max(mission.progress, 100);
        mission.currentActivity =
            "Executive work completed — awaiting human approval";

        removeApprovalQueueEntry(missionId);

        const queueEntry = {
            id: createId("APR"),
            missionId: mission.id,
            title: mission.title,
            priority: mission.priority,
            submittedBy:
                normalizeText(submission.submittedBy, "Maddy"),
            summary:
                normalizeText(submission.summary) ||
                normalizeText(mission.description) ||
                mission.title,
            recommendation:
                normalizeText(submission.recommendation),
            submittedAt: mission.approval.submittedAt,
            status: APPROVAL_STATUS.PENDING
        };

        state.approvalQueue.push(queueEntry);
        sortApprovalQueue();

        addMissionHistory(
            mission,
            "submitted_for_approval",
            "Mission submitted to the Executive Approval Queue.",
            {
                approvalQueueId: queueEntry.id
            }
        );

        recordActivity("submitted_for_approval", {
            missionId,
            approvalQueueId: queueEntry.id
        });

        persist();

        return clone(queueEntry);
    }

    function approveMission(missionId, decision = {}) {
        const mission = requireMission(missionId);

        mission.approval.status = APPROVAL_STATUS.APPROVED;
        mission.approval.reviewedAt = now();
        mission.approval.reviewedBy = normalizeText(
            decision.reviewedBy,
            "Executive Director"
        );
        mission.approval.decisionNotes = normalizeText(decision.notes);
        mission.status = MISSION_STATUS.APPROVED;
        mission.currentActivity = "Approved by Executive Director";

        removeApprovalQueueEntry(missionId);

        addMissionHistory(
            mission,
            "mission_approved",
            "Mission approved by the Executive Director.",
            {
                reviewedBy: mission.approval.reviewedBy
            }
        );

        recordActivity("mission_approved", {
            missionId,
            reviewedBy: mission.approval.reviewedBy
        });

        persist();

        return clone(mission);
    }

    function requestRevisions(missionId, decision = {}) {
        const mission = requireMission(missionId);

        mission.approval.status = APPROVAL_STATUS.REVISIONS_REQUESTED;
        mission.approval.reviewedAt = now();
        mission.approval.reviewedBy = normalizeText(
            decision.reviewedBy,
            "Executive Director"
        );
        mission.approval.decisionNotes = normalizeText(decision.notes);
        mission.status = MISSION_STATUS.REVISIONS_REQUESTED;
        mission.currentActivity = "Executive revisions requested";
        mission.progress = Math.min(mission.progress, 95);

        removeApprovalQueueEntry(missionId);

        addMissionHistory(
            mission,
            "revisions_requested",
            "The Executive Director requested revisions.",
            {
                notes: mission.approval.decisionNotes
            }
        );

        recordActivity("revisions_requested", {
            missionId
        });

        persist();

        return clone(mission);
    }

    function rejectMission(missionId, decision = {}) {
        const mission = requireMission(missionId);

        mission.approval.status = APPROVAL_STATUS.REJECTED;
        mission.approval.reviewedAt = now();
        mission.approval.reviewedBy = normalizeText(
            decision.reviewedBy,
            "Executive Director"
        );
        mission.approval.decisionNotes = normalizeText(decision.notes);
        mission.status = MISSION_STATUS.CANCELLED;
        mission.currentActivity = "Mission rejected by Executive Director";

        removeApprovalQueueEntry(missionId);

        addMissionHistory(
            mission,
            "mission_rejected",
            "Mission rejected by the Executive Director.",
            {
                notes: mission.approval.decisionNotes
            }
        );

        recordActivity("mission_rejected", {
            missionId
        });

        persist();

        return clone(mission);
    }

    function completeMission(missionId, completion = {}) {
        const mission = requireMission(missionId);

        if (
            mission.approval.required &&
            mission.approval.status !== APPROVAL_STATUS.APPROVED
        ) {
            return submitForApproval(missionId, {
                submittedBy: completion.completedBy || "Maddy",
                summary: completion.summary,
                recommendation: completion.recommendation,
                notes:
                    completion.notes ||
                    "Mission work is complete and requires Executive Director approval."
            });
        }

        mission.status = MISSION_STATUS.COMPLETED;
        mission.progress = 100;
        mission.completedAt = now();
        mission.currentActivity = "Mission completed";

        addMissionHistory(
            mission,
            "mission_completed",
            "Mission completed.",
            {
                completedBy:
                    normalizeText(completion.completedBy, "MEOS")
            }
        );

        removeFromArrayById(state.missions, missionId);
        state.completedMissions.unshift(mission);

        recordActivity("mission_completed", {
            missionId,
            title: mission.title
        });

        persist();

        return clone(mission);
    }

    function archiveMission(missionId, archivedBy = "Ledger") {
        const mission = requireMission(missionId);

        removeFromArrayById(state.missions, missionId);
        removeFromArrayById(state.completedMissions, missionId);
        removeApprovalQueueEntry(missionId);

        mission.status = MISSION_STATUS.ARCHIVED;
        mission.archivedAt = now();
        mission.currentActivity = "Archived in organizational records";

        addMissionHistory(
            mission,
            "mission_archived",
            "Mission archived.",
            {
                archivedBy
            }
        );

        state.archivedMissions.unshift(mission);

        recordActivity("mission_archived", {
            missionId,
            archivedBy
        });

        persist();

        return clone(mission);
    }

    function blockMission(missionId, reason) {
        const mission = requireMission(missionId);

        mission.status = MISSION_STATUS.BLOCKED;
        mission.currentActivity =
            normalizeText(reason) || "Mission blocked";

        addMissionHistory(
            mission,
            "mission_blocked",
            "Mission execution is blocked.",
            {
                reason: mission.currentActivity
            }
        );

        recordActivity("mission_blocked", {
            missionId,
            reason: mission.currentActivity
        });

        persist();

        return clone(mission);
    }

    function resumeMission(missionId, activity) {
        const mission = requireMission(missionId);

        mission.status = MISSION_STATUS.IN_PROGRESS;
        mission.currentActivity =
            normalizeText(activity) || "Mission execution resumed";

        addMissionHistory(
            mission,
            "mission_resumed",
            "Mission execution resumed.",
            {
                currentActivity: mission.currentActivity
            }
        );

        recordActivity("mission_resumed", {
            missionId
        });

        persist();

        return clone(mission);
    }

    function sortActiveMissions() {
        state.missions.sort((a, b) => {
            const priorityDifference =
                priorityWeight(b.priority) - priorityWeight(a.priority);

            if (priorityDifference !== 0) {
                return priorityDifference;
            }

            const aDue = a.dueDate
                ? new Date(a.dueDate).getTime()
                : Number.MAX_SAFE_INTEGER;

            const bDue = b.dueDate
                ? new Date(b.dueDate).getTime()
                : Number.MAX_SAFE_INTEGER;

            if (aDue !== bDue) {
                return aDue - bDue;
            }

            return new Date(a.createdAt) - new Date(b.createdAt);
        });
    }

    function sortApprovalQueue() {
        state.approvalQueue.sort((a, b) => {
            const priorityDifference =
                priorityWeight(b.priority) - priorityWeight(a.priority);

            if (priorityDifference !== 0) {
                return priorityDifference;
            }

            return new Date(a.submittedAt) - new Date(b.submittedAt);
        });
    }

    function getMission(missionId) {
        const mission = findMissionRecord(missionId);
        return mission ? clone(mission) : null;
    }

    function getActiveMissions(filters = {}) {
        let missions = [...state.missions];

        if (filters.status) {
            missions = missions.filter(
                (mission) => mission.status === filters.status
            );
        }

        if (filters.type) {
            missions = missions.filter(
                (mission) => mission.type === filters.type
            );
        }

        if (filters.priority) {
            missions = missions.filter(
                (mission) => mission.priority === filters.priority
            );
        }

        if (filters.office) {
            missions = missions.filter(
                (mission) =>
                    mission.leadOffice === filters.office ||
                    mission.assignedOffices.includes(filters.office)
            );
        }

        return clone(missions);
    }

    function getOfficeMissions(officeId, options = {}) {
        const includePendingApproval =
            options.includePendingApproval !== false;

        return clone(
            state.missions.filter((mission) => {
                const assigned =
                    mission.leadOffice === officeId ||
                    mission.assignedOffices.includes(officeId);

                if (!assigned) {
                    return false;
                }

                if (
                    !includePendingApproval &&
                    mission.status === MISSION_STATUS.PENDING_APPROVAL
                ) {
                    return false;
                }

                return true;
            })
        );
    }

    function getNextMissionForOffice(officeId) {
        const availableStatuses = [
            MISSION_STATUS.QUEUED,
            MISSION_STATUS.ASSIGNED,
            MISSION_STATUS.REVISIONS_REQUESTED
        ];

        const candidates = state.missions.filter((mission) => {
            const assigned =
                mission.leadOffice === officeId ||
                mission.assignedOffices.includes(officeId);

            return assigned && availableStatuses.includes(mission.status);
        });

        candidates.sort((a, b) => {
            const priorityDifference =
                priorityWeight(b.priority) - priorityWeight(a.priority);

            if (priorityDifference !== 0) {
                return priorityDifference;
            }

            return new Date(a.createdAt) - new Date(b.createdAt);
        });

        return candidates.length > 0 ? clone(candidates[0]) : null;
    }

    function getApprovalQueue() {
        sortApprovalQueue();
        return clone(state.approvalQueue);
    }

    function getCompletedMissions() {
        return clone(state.completedMissions);
    }

    function getArchivedMissions() {
        return clone(state.archivedMissions);
    }

    function getMissionHistory(missionId) {
        const mission = requireMission(missionId);
        return clone(mission.history);
    }

    function getActivityLog(limit = 100) {
        return clone(state.activity.slice(0, limit));
    }

    function getMissionSummary() {
        const byStatus = {};

        Object.values(MISSION_STATUS).forEach((status) => {
            byStatus[status] = 0;
        });

        state.missions.forEach((mission) => {
            byStatus[mission.status] =
                (byStatus[mission.status] || 0) + 1;
        });

        return {
            version: VERSION,
            totalActive: state.missions.length,
            pendingApproval: state.approvalQueue.length,
            completed: state.completedMissions.length,
            archived: state.archivedMissions.length,

            critical: state.missions.filter(
                (mission) => mission.priority === PRIORITY.CRITICAL
            ).length,

            highPriority: state.missions.filter(
                (mission) => mission.priority === PRIORITY.HIGH
            ).length,

            inProgress: state.missions.filter(
                (mission) =>
                    mission.status === MISSION_STATUS.IN_PROGRESS
            ).length,

            blocked: state.missions.filter(
                (mission) => mission.status === MISSION_STATUS.BLOCKED
            ).length,

            revenuePipeline: state.missions.reduce(
                (total, mission) =>
                    total +
                    (typeof mission.revenuePotential === "number"
                        ? mission.revenuePotential
                        : 0),
                0
            ),

            byStatus,
            initializedAt: state.initializedAt,
            updatedAt: state.updatedAt
        };
    }

    function exportMissionData() {
        return clone(state);
    }

    function clearMissionData(options = {}) {
        if (options.confirm !== true) {
            throw new Error(
                "Mission data was not cleared. Pass { confirm: true } to confirm."
            );
        }

        state.missions = [];
        state.approvalQueue = [];
        state.completedMissions = [];
        state.archivedMissions = [];
        state.activity = [];
        state.initializedAt = now();
        state.updatedAt = now();

        persist();

        console.warn("MEOS Mission Engine data cleared.");

        return true;
    }

    /*
     * Synchronous bootstrap preserves the current working session on the
     * first migration load. IndexedDB then becomes the temporary laptop
     * authority asynchronously.
     */
    const restoredLegacy = restoreLegacySnapshot();

    if (!restoredLegacy) {
        state.initializedAt = now();
        state.updatedAt = state.initializedAt;
    }

    sortActiveMissions();
    sortApprovalQueue();

    const hydrationPromise = hydrateFromIndexedDb();

    const MissionEngine = Object.freeze({
        version: VERSION,
        buildId: BUILD_ID,

        constants: Object.freeze({
            MISSION_STATUS,
            APPROVAL_STATUS,
            PRIORITY,
            MISSION_SOURCE,
            MISSION_TYPE
        }),

        createMission,
        createMissionFromIntake,
        assignMission,
        startMission,
        updateMission,
        setMissionProgress,

        addTask,
        updateTask,
        addDocument,
        addDeliverable,
        addRecommendation,

        submitForApproval,
        approveMission,
        requestRevisions,
        rejectMission,

        completeMission,
        archiveMission,
        blockMission,
        resumeMission,

        getMission,
        getActiveMissions,
        getOfficeMissions,
        getNextMissionForOffice,
        getApprovalQueue,
        getCompletedMissions,
        getArchivedMissions,
        getMissionHistory,
        getActivityLog,
        getMissionSummary,

        exportMissionData,
        clearMissionData,

        getPersistenceStatus,
        flushPersistence,
        whenHydrated: () => hydrationPromise,
        runLaptopPersistenceAcceptanceTest
    });

    global.MEOSMissionEngine = MissionEngine;

    console.log(
        `%cMEOS ${VERSION} Mission Engine initialized. Build ${BUILD_ID}.`,
        "font-weight: bold;"
    );

    console.log(
        `Active missions: ${state.missions.length} | ` +
        `Awaiting approval: ${state.approvalQueue.length} | ` +
        `Completed: ${state.completedMissions.length}`
    );
})(window);
