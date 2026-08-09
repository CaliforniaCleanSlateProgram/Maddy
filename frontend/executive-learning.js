/*
 * MEOS Executive Learning Engine
 * Version: 1.1.0
 *
 * Mission:
 * Convert completed work, outcomes, feedback, decisions, alerts, and executive
 * review into reusable institutional lessons that improve future planning,
 * decision support, workflows, monitoring, and automation.
 *
 * Brick boundary:
 * This engine learns from authorized records and feedback. It does not rewrite
 * policy, change organizational authority, autonomously approve decisions,
 * spend money, contact external parties, or alter source records.
 */

(function initializeExecutiveLearning(global) {
    "use strict";

    const STORAGE_KEY = "meos.executive-learning.v1";
    const SCHEMA = "meos.executive-learning.package.v1";
    const VERSION = "1.1.0";
    const BUILD_ID = "EL110-DURABLE-AUTHORITY-FLIP-20260808-A";

    const INDEXED_DB_NAME = "meos-local-executive-repository";
    const INDEXED_DB_VERSION = 1;
    const INDEXED_DB_STORE = "engine-state";
    const INDEXED_DB_RECORD_ID = "executive-learning-state";
    const DURABLE_STATE_ENDPOINT = "/api/executive-learning-state";
    const PERSISTENCE_DEBOUNCE_MS = 200;

    const persistence = {
        mode: "institutional-repository-authority",
        authoritativeStorage: "meos-institutional-repository",
        cacheRole: global.indexedDB
            ? "bounded-recovery-cache"
            : "unavailable",
        indexedDbAvailable: Boolean(global.indexedDB),
        databaseName: INDEXED_DB_NAME,
        storeName: INDEXED_DB_STORE,
        recordId: INDEXED_DB_RECORD_ID,
        durableEndpoint: DURABLE_STATE_ENDPOINT,
        hydrated: false,
        durableAuthorityReady: false,
        degraded: false,
        degradedReason: null,
        migratedLegacySnapshot: false,
        localStorageReleased: false,
        writeScheduled: false,
        writeInFlight: false,
        suspended: false,
        lastPersistedAt: null,
        lastRestoredAt: null,
        lastCachePersistedAt: null,
        lastDurableProviderId: null,
        lastError: null
    };

    let persistenceTimer = null;
    let indexedDbPromise = null;
    let writeChain = Promise.resolve();

    async function executiveLearningStateRequest(
        method = "GET",
        body = undefined
    ) {
        const options = {
            method,
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        };

        if (body !== undefined) {
            options.headers["Content-Type"] =
                "application/json";
            options.body = JSON.stringify(body);
        }

        const response = await global.fetch(
            DURABLE_STATE_ENDPOINT,
            options
        );

        let payload = null;

        try {
            payload = await response.json();
        } catch (_error) {
            payload = null;
        }

        if (response.status === 404 && method === "GET") {
            return {
                found: false,
                authority:
                    "meos-institutional-repository"
            };
        }

        if (!response.ok) {
            const error = new Error(
                payload?.error ||
                    `Executive Learning durable authority returned HTTP ${response.status}.`
            );
            error.status = response.status;
            error.code =
                payload?.code ||
                "EXECUTIVE_LEARNING_DURABLE_REQUEST_FAILED";
            error.details = payload?.details || null;
            throw error;
        }

        return payload || {};
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
                    database.createObjectStore(
                        INDEXED_DB_STORE,
                        { keyPath: "id" }
                    );
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () =>
                reject(
                    request.error ||
                        new Error(
                            "Executive Learning IndexedDB open failed."
                        )
                );
            request.onblocked = () =>
                reject(
                    new Error(
                        "Executive Learning IndexedDB upgrade was blocked."
                    )
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

            request.onsuccess = () =>
                resolve(request.result || null);
            request.onerror = () =>
                reject(
                    request.error ||
                        new Error(
                            "Executive Learning IndexedDB read failed."
                        )
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
                        new Error(
                            "Executive Learning IndexedDB write failed."
                        )
                );
            transaction.onerror = () =>
                reject(
                    transaction.error ||
                        new Error(
                            "Executive Learning IndexedDB transaction failed."
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
                        new Error(
                            "Executive Learning IndexedDB delete failed."
                        )
                );
        });
    }

    const LESSON_STATUSES = {
        DRAFT: "draft",
        VALIDATED: "validated",
        ACTIVE: "active",
        REJECTED: "rejected",
        SUPERSEDED: "superseded",
        ARCHIVED: "archived"
    };

    const OUTCOME_TYPES = {
        SUCCESS: "success",
        PARTIAL_SUCCESS: "partial-success",
        FAILURE: "failure",
        CANCELLED: "cancelled",
        UNKNOWN: "unknown"
    };

    const FEEDBACK_TYPES = {
        POSITIVE: "positive",
        NEGATIVE: "negative",
        CORRECTION: "correction",
        PREFERENCE: "preference",
        OBSERVATION: "observation"
    };

    const ExecutiveLearning = {
        name: "MEOS Executive Learning Engine",
        version: VERSION,
        buildId: BUILD_ID,
        status: "initializing",
        operatingMode: "controlled-institutional-learning",

        configuration: {
            persistenceEnabled: true,
            automaticPersistence: true,
            localStorageKey: STORAGE_KEY,
            organizationNeutralCore: true,
            requireExecutiveValidation: true,
            minimumConfidenceToActivate: 0.7,
            minimumEvidenceCount: 1,
            maximumLessons: 5000,
            maximumObservations: 10000,
            maximumFeedbackRecords: 5000,
            maximumHistory: 5000,
            duplicateSimilarityThreshold: 0.88,
            defaultConfidence: 0.5,
            autoScanEnabled: true,
            scanIntervalMs: 30000,
            autoCreateDraftLessons: true,
            writeValidatedLessonsToKnowledge: true,
            preserveRejectedLessons: true
        },

        observations: [],
        lessons: [],
        feedback: [],
        history: [],
        eventListeners: {},
        scannerId: null,
        initializedAt: null,

        analytics: {
            totalObservations: 0,
            totalLessons: 0,
            activeLessons: 0,
            validatedLessons: 0,
            rejectedLessons: 0,
            totalFeedback: 0,
            lastScanAt: null,
            lastLessonAt: null
        },

        initialize(options = {}) {
            this.configuration = {
                ...this.configuration,
                ...(options.configuration || options)
            };

            this.hydrationPromise =
                this.hydrateFromDurableAuthority();
            this.initializedAt = new Date().toISOString();
            this.status = "online";

            this.registerSystemKnowledge();
            this.recalculateAnalytics();

            if (
                this.configuration.autoScanEnabled &&
                options.startScanner !== false
            ) {
                this.startScanner();
            }

            console.info(
                `[MEOS] ${this.name} v${this.version} ${this.status}. Build ${this.buildId}.`
            );

            this.emit("learning:online", this.getStatus());
            return this.getStatus();
        },

        observe(input = {}, options = {}) {
            const sourceType = String(
                input.sourceType ||
                input.entityType ||
                ""
            ).trim();

            const sourceId = String(
                input.sourceId ||
                input.entityId ||
                ""
            ).trim();

            if (!sourceType || !sourceId) {
                return {
                    success: false,
                    error:
                        "A source type and source ID are required."
                };
            }

            const timestamp = new Date().toISOString();

            const observation = {
                id: this.createId("learning-observation"),
                sourceType,
                sourceId,
                sourceTitle:
                    input.sourceTitle ||
                    input.title ||
                    "",
                outcomeType:
                    this.normalizeOutcomeType(
                        input.outcomeType ||
                        input.outcome
                    ),
                summary:
                    input.summary ||
                    "",
                objective:
                    input.objective ||
                    "",
                result:
                    input.result ||
                    "",
                expectedResult:
                    input.expectedResult ||
                    "",
                successCriteria:
                    this.uniqueStrings(
                        input.successCriteria
                    ),
                completedCriteria:
                    this.uniqueStrings(
                        input.completedCriteria
                    ),
                failedCriteria:
                    this.uniqueStrings(
                        input.failedCriteria
                    ),
                contributingFactors:
                    this.uniqueStrings(
                        input.contributingFactors
                    ),
                blockingFactors:
                    this.uniqueStrings(
                        input.blockingFactors
                    ),
                decisions:
                    this.uniqueStrings(input.decisions),
                actions:
                    this.uniqueStrings(input.actions),
                risks:
                    Array.isArray(input.risks)
                        ? input.risks
                        : [],
                citations:
                    Array.isArray(input.citations)
                        ? input.citations
                        : [],
                confidence:
                    this.normalizeConfidence(
                        input.confidence
                    ),
                office:
                    input.office ||
                    null,
                owner:
                    input.owner ||
                    null,
                createdAt: timestamp,
                observedBy:
                    options.actor ||
                    input.observedBy ||
                    this.name,
                processedAt: null,
                lessonIds: [],
                metadata:
                    input.metadata &&
                    typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}
            };

            const duplicate = this.observations.find(
                (item) =>
                    item.sourceType === observation.sourceType &&
                    item.sourceId === observation.sourceId &&
                    item.outcomeType === observation.outcomeType &&
                    this.textSimilarity(
                        item.summary,
                        observation.summary
                    ) >=
                        this.configuration
                            .duplicateSimilarityThreshold
            );

            if (duplicate) {
                return {
                    success: true,
                    duplicate: true,
                    observation:
                        this.clone(duplicate)
                };
            }

            this.observations.unshift(observation);

            if (
                this.observations.length >
                this.configuration.maximumObservations
            ) {
                this.observations.length =
                    this.configuration.maximumObservations;
            }

            this.logHistory("observation.created", {
                observationId: observation.id,
                sourceType,
                sourceId,
                outcomeType:
                    observation.outcomeType
            });

            let lessons = [];

            if (
                this.configuration.autoCreateDraftLessons &&
                options.skipLessonCreation !== true
            ) {
                lessons =
                    this.deriveLessonsFromObservation(
                        observation,
                        options
                    );
            }

            observation.processedAt =
                new Date().toISOString();
            observation.lessonIds =
                lessons.map((lesson) => lesson.id);

            this.recalculateAnalytics();
            this.persistIfEnabled();

            this.emit("learning:observation-created", {
                observation:
                    this.clone(observation),
                lessons:
                    this.clone(lessons)
            });

            return {
                success: true,
                observation:
                    this.clone(observation),
                lessons:
                    this.clone(lessons)
            };
        },

        deriveLessonsFromObservation(
            observation,
            options = {}
        ) {
            const candidates = [];

            const addCandidate = (
                title,
                statement,
                lessonType,
                confidenceAdjustment = 0
            ) => {
                if (!statement) {
                    return;
                }

                candidates.push({
                    title,
                    statement,
                    lessonType,
                    confidence:
                        this.normalizeConfidence(
                            observation.confidence +
                            confidenceAdjustment
                        )
                });
            };

            if (
                observation.outcomeType ===
                OUTCOME_TYPES.SUCCESS
            ) {
                observation.contributingFactors.forEach(
                    (factor) =>
                        addCandidate(
                            `Successful practice: ${factor}`,
                            `When handling work similar to "${observation.sourceTitle || observation.sourceId}", preserve the practice: ${factor}.`,
                            "successful-practice",
                            0.1
                        )
                );

                if (
                    observation.actions.length > 0 &&
                    observation.contributingFactors.length === 0
                ) {
                    addCandidate(
                        "Successful execution pattern",
                        `The following actions contributed to a successful outcome: ${observation.actions.join("; ")}.`,
                        "successful-practice",
                        0.05
                    );
                }
            }

            if (
                observation.outcomeType ===
                    OUTCOME_TYPES.FAILURE ||
                observation.outcomeType ===
                    OUTCOME_TYPES.PARTIAL_SUCCESS
            ) {
                observation.blockingFactors.forEach(
                    (factor) =>
                        addCandidate(
                            `Avoidable failure pattern: ${factor}`,
                            `Future work similar to "${observation.sourceTitle || observation.sourceId}" should identify and mitigate this blocking factor early: ${factor}.`,
                            "failure-prevention",
                            0.05
                        )
                );

                observation.failedCriteria.forEach(
                    (criterion) =>
                        addCandidate(
                            `Unmet success criterion: ${criterion}`,
                            `Future planning should explicitly protect the success criterion "${criterion}" before execution begins.`,
                            "planning-improvement",
                            0
                        )
                );
            }

            if (observation.decisions.length > 0) {
                addCandidate(
                    "Decision outcome lesson",
                    `Review the relationship between these decisions and the observed outcome: ${observation.decisions.join("; ")}.`,
                    "decision-learning",
                    0
                );
            }

            if (
                observation.risks.length > 0
            ) {
                addCandidate(
                    "Risk-control lesson",
                    `Future work should review these observed risks earlier: ${observation.risks
                        .map((risk) =>
                            typeof risk === "string"
                                ? risk
                                : risk.title ||
                                  risk.description
                        )
                        .filter(Boolean)
                        .join("; ")}.`,
                    "risk-learning",
                    0
                );
            }

            return candidates
                .map((candidate) =>
                    this.createLesson(
                        {
                            ...candidate,
                            sourceObservationIds: [
                                observation.id
                            ],
                            sourceType:
                                observation.sourceType,
                            sourceId:
                                observation.sourceId,
                            office:
                                observation.office,
                            citations:
                                observation.citations,
                            tags: [
                                "institutional-learning",
                                observation.outcomeType
                            ]
                        },
                        {
                            actor:
                                options.actor ||
                                this.name
                        }
                    )
                )
                .filter((result) => result.success)
                .map((result) => result.lesson);
        },

        createLesson(input = {}, options = {}) {
            const statement = String(
                input.statement ||
                input.lesson ||
                ""
            ).trim();

            if (!statement) {
                return {
                    success: false,
                    error:
                        "A lesson statement is required."
                };
            }

            if (
                this.lessons.length >=
                this.configuration.maximumLessons
            ) {
                return {
                    success: false,
                    error:
                        "The institutional lesson limit has been reached."
                };
            }

            const duplicate =
                this.findSimilarLesson(statement);

            if (duplicate) {
                duplicate.sourceObservationIds =
                    this.uniqueStrings([
                        ...duplicate.sourceObservationIds,
                        ...(input.sourceObservationIds || [])
                    ]);
                duplicate.evidenceCount =
                    duplicate.sourceObservationIds.length;
                duplicate.confidence =
                    this.recalculateLessonConfidence(
                        duplicate
                    );
                duplicate.updatedAt =
                    new Date().toISOString();

                this.persistIfEnabled();

                return {
                    success: true,
                    duplicate: true,
                    lesson:
                        this.clone(duplicate)
                };
            }

            const timestamp =
                new Date().toISOString();

            const lesson = {
                id: this.createId("institutional-lesson"),
                title:
                    input.title ||
                    "Institutional Lesson",
                statement,
                lessonType:
                    input.lessonType ||
                    "general",
                status:
                    input.status ||
                    LESSON_STATUSES.DRAFT,
                confidence:
                    this.normalizeConfidence(
                        input.confidence
                    ),
                evidenceCount:
                    Array.isArray(
                        input.sourceObservationIds
                    )
                        ? input.sourceObservationIds.length
                        : 0,
                sourceObservationIds:
                    this.uniqueStrings(
                        input.sourceObservationIds
                    ),
                sourceType:
                    input.sourceType ||
                    null,
                sourceId:
                    input.sourceId ||
                    null,
                office:
                    input.office ||
                    null,
                applicability:
                    this.uniqueStrings(
                        input.applicability
                    ),
                conditions:
                    this.uniqueStrings(
                        input.conditions
                    ),
                exceptions:
                    this.uniqueStrings(
                        input.exceptions
                    ),
                recommendedChanges:
                    this.uniqueStrings(
                        input.recommendedChanges
                    ),
                citations:
                    Array.isArray(input.citations)
                        ? input.citations
                        : [],
                tags:
                    this.uniqueStrings(input.tags),
                createdAt: timestamp,
                updatedAt: timestamp,
                createdBy:
                    options.actor ||
                    this.name,
                validatedAt: null,
                validatedBy: null,
                activatedAt: null,
                rejectedAt: null,
                rejectedBy: null,
                rejectionReason: "",
                supersededAt: null,
                supersededBy: null,
                knowledgeRecordId: null,
                metadata:
                    input.metadata &&
                    typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}
            };

            this.lessons.unshift(lesson);
            this.analytics.lastLessonAt =
                timestamp;

            this.logHistory("lesson.created", {
                lessonId: lesson.id,
                lessonType:
                    lesson.lessonType,
                confidence:
                    lesson.confidence
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("learning:lesson-created", this.clone(lesson));

            return {
                success: true,
                lesson:
                    this.clone(lesson)
            };
        },

        validateLesson(lessonId, options = {}) {
            const lesson =
                this.getLessonById(lessonId);

            if (!lesson) {
                return {
                    success: false,
                    error:
                        "Institutional lesson was not found."
                };
            }

            const evidenceCount =
                lesson.sourceObservationIds.length;

            if (
                evidenceCount <
                    this.configuration.minimumEvidenceCount &&
                options.overrideEvidence !== true
            ) {
                return {
                    success: false,
                    error:
                        "The lesson does not have enough supporting evidence."
                };
            }

            const timestamp =
                new Date().toISOString();

            lesson.status =
                LESSON_STATUSES.VALIDATED;
            lesson.validatedAt = timestamp;
            lesson.validatedBy =
                options.actor ||
                "Executive";
            lesson.validationNotes =
                options.notes ||
                "";
            lesson.updatedAt = timestamp;
            lesson.confidence =
                this.recalculateLessonConfidence(
                    lesson
                );

            if (
                lesson.confidence >=
                    this.configuration
                        .minimumConfidenceToActivate &&
                options.activate !== false
            ) {
                lesson.status =
                    LESSON_STATUSES.ACTIVE;
                lesson.activatedAt = timestamp;

                if (
                    this.configuration
                        .writeValidatedLessonsToKnowledge
                ) {
                    this.writeLessonToKnowledge(
                        lesson
                    );
                }
            }

            this.logHistory("lesson.validated", {
                lessonId,
                status: lesson.status,
                confidence:
                    lesson.confidence,
                validatedBy:
                    lesson.validatedBy
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("learning:lesson-validated", this.clone(lesson));

            return {
                success: true,
                lesson:
                    this.clone(lesson)
            };
        },

        rejectLesson(lessonId, options = {}) {
            const lesson =
                this.getLessonById(lessonId);

            if (!lesson) {
                return {
                    success: false,
                    error:
                        "Institutional lesson was not found."
                };
            }

            const timestamp =
                new Date().toISOString();

            lesson.status =
                LESSON_STATUSES.REJECTED;
            lesson.rejectedAt = timestamp;
            lesson.rejectedBy =
                options.actor ||
                "Executive";
            lesson.rejectionReason =
                options.reason ||
                "";
            lesson.updatedAt = timestamp;

            if (
                !this.configuration.preserveRejectedLessons
            ) {
                this.lessons =
                    this.lessons.filter(
                        (item) =>
                            item.id !== lesson.id
                    );
            }

            this.logHistory("lesson.rejected", {
                lessonId,
                rejectedBy:
                    lesson.rejectedBy,
                reason:
                    lesson.rejectionReason
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();

            return {
                success: true,
                lesson:
                    this.clone(lesson)
            };
        },

        supersedeLesson(
            lessonId,
            replacementLessonId,
            options = {}
        ) {
            const lesson =
                this.getLessonById(lessonId);
            const replacement =
                this.getLessonById(
                    replacementLessonId
                );

            if (!lesson || !replacement) {
                return {
                    success: false,
                    error:
                        "The original or replacement lesson was not found."
                };
            }

            const timestamp =
                new Date().toISOString();

            lesson.status =
                LESSON_STATUSES.SUPERSEDED;
            lesson.supersededAt = timestamp;
            lesson.supersededBy =
                replacement.id;
            lesson.supersedeReason =
                options.reason ||
                "";
            lesson.updatedAt = timestamp;

            this.persistIfEnabled();

            return {
                success: true,
                lesson:
                    this.clone(lesson),
                replacement:
                    this.clone(replacement)
            };
        },

        addFeedback(input = {}, options = {}) {
            const message = String(
                input.message ||
                input.feedback ||
                ""
            ).trim();

            if (!message) {
                return {
                    success: false,
                    error:
                        "Feedback content is required."
                };
            }

            if (
                this.feedback.length >=
                this.configuration.maximumFeedbackRecords
            ) {
                return {
                    success: false,
                    error:
                        "The feedback limit has been reached."
                };
            }

            const feedback = {
                id: this.createId("learning-feedback"),
                feedbackType:
                    this.normalizeFeedbackType(
                        input.feedbackType ||
                        input.type
                    ),
                message,
                subjectType:
                    input.subjectType ||
                    null,
                subjectId:
                    input.subjectId ||
                    null,
                office:
                    input.office ||
                    null,
                preferenceKey:
                    input.preferenceKey ||
                    null,
                preferenceValue:
                    input.preferenceValue ??
                    null,
                confidence:
                    this.normalizeConfidence(
                        input.confidence ?? 0.8
                    ),
                createdAt:
                    new Date().toISOString(),
                createdBy:
                    options.actor ||
                    input.createdBy ||
                    "Executive",
                processedAt: null,
                lessonId: null,
                metadata:
                    input.metadata &&
                    typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}
            };

            this.feedback.unshift(feedback);

            const lessonResult =
                this.createLessonFromFeedback(
                    feedback,
                    options
                );

            if (lessonResult.success) {
                feedback.lessonId =
                    lessonResult.lesson.id;
            }

            feedback.processedAt =
                new Date().toISOString();

            this.logHistory("feedback.added", {
                feedbackId: feedback.id,
                feedbackType:
                    feedback.feedbackType,
                lessonId:
                    feedback.lessonId
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();

            return {
                success: true,
                feedback:
                    this.clone(feedback),
                lesson:
                    lessonResult.success
                        ? lessonResult.lesson
                        : null
            };
        },

        createLessonFromFeedback(
            feedback,
            options = {}
        ) {
            let title =
                "Executive Feedback Lesson";
            let lessonType =
                "feedback-learning";
            let statement =
                feedback.message;

            if (
                feedback.feedbackType ===
                FEEDBACK_TYPES.PREFERENCE
            ) {
                title =
                    "Executive Preference";
                lessonType =
                    "executive-preference";

                if (feedback.preferenceKey) {
                    statement =
                        `Executive preference for "${feedback.preferenceKey}": ${String(feedback.preferenceValue ?? feedback.message)}.`;
                }
            } else if (
                feedback.feedbackType ===
                FEEDBACK_TYPES.CORRECTION
            ) {
                title =
                    "Executive Correction";
                lessonType =
                    "correction";
                statement =
                    `Correction to preserve in future work: ${feedback.message}`;
            } else if (
                feedback.feedbackType ===
                FEEDBACK_TYPES.NEGATIVE
            ) {
                title =
                    "Avoid Repeating This Outcome";
                lessonType =
                    "failure-prevention";
            } else if (
                feedback.feedbackType ===
                FEEDBACK_TYPES.POSITIVE
            ) {
                title =
                    "Preferred Successful Practice";
                lessonType =
                    "successful-practice";
            }

            return this.createLesson(
                {
                    title,
                    statement,
                    lessonType,
                    confidence:
                        feedback.confidence,
                    sourceType:
                        feedback.subjectType ||
                        "feedback",
                    sourceId:
                        feedback.subjectId ||
                        feedback.id,
                    office:
                        feedback.office,
                    tags: [
                        "executive-feedback",
                        feedback.feedbackType
                    ],
                    metadata: {
                        feedbackId:
                            feedback.id,
                        preferenceKey:
                            feedback.preferenceKey
                    }
                },
                {
                    actor:
                        options.actor ||
                        feedback.createdBy
                }
            );
        },

        scan() {
            const observations = [];

            observations.push(
                ...this.scanCompletedWorkflows()
            );
            observations.push(
                ...this.scanCompletedPlans()
            );
            observations.push(
                ...this.scanApprovedDecisions()
            );
            observations.push(
                ...this.scanResolvedAlerts()
            );
            observations.push(
                ...this.scanAutomationRuns()
            );
            observations.push(
                ...this.scanCompletedCollaborations()
            );

            const results = observations.map(
                (observation) =>
                    this.observe(
                        observation,
                        {
                            actor: this.name
                        }
                    )
            );

            this.analytics.lastScanAt =
                new Date().toISOString();

            this.recalculateAnalytics();
            this.persistIfEnabled();

            this.emit("learning:scan-complete", {
                observationCount:
                    observations.length,
                resultCount:
                    results.length,
                scannedAt:
                    this.analytics.lastScanAt
            });

            return {
                success: true,
                observationCount:
                    observations.length,
                results
            };
        },

        scanCompletedWorkflows() {
            const workflows =
                global.ExecutiveWorkflow?.workflows ||
                [];

            return workflows
                .filter(
                    (workflow) =>
                        workflow.status === "complete" &&
                        !this.hasObservation(
                            "workflow",
                            workflow.id
                        )
                )
                .map((workflow) => ({
                    sourceType: "workflow",
                    sourceId: workflow.id,
                    sourceTitle:
                        workflow.title ||
                        workflow.id,
                    outcomeType:
                        OUTCOME_TYPES.SUCCESS,
                    summary:
                        `Workflow completed with ${workflow.metrics?.completedSteps || 0} completed step(s).`,
                    objective:
                        workflow.objective ||
                        "",
                    result:
                        "Workflow completed.",
                    contributingFactors:
                        workflow.steps
                            ?.filter(
                                (step) =>
                                    step.status === "complete"
                            )
                            .map(
                                (step) =>
                                    `${step.office || "Assigned office"} completed ${step.title}`
                            ) || [],
                    blockingFactors:
                        workflow.steps
                            ?.flatMap(
                                (step) =>
                                    step.blockers || []
                            ) || [],
                    actions:
                        workflow.steps
                            ?.map((step) => step.title)
                            .filter(Boolean) || [],
                    office:
                        workflow.executiveOwner ||
                        null,
                    confidence: 0.85,
                    metadata: {
                        workflowStatus:
                            workflow.status,
                        percentComplete:
                            workflow.metrics?.percentComplete ||
                            100
                    }
                }));
        },

        scanCompletedPlans() {
            const plans =
                global.ExecutivePlanning?.plans ||
                [];

            return plans
                .filter(
                    (plan) =>
                        plan.status === "complete" &&
                        !this.hasObservation(
                            "plan",
                            plan.id
                        )
                )
                .map((plan) => ({
                    sourceType: "plan",
                    sourceId: plan.id,
                    sourceTitle:
                        plan.title ||
                        plan.id,
                    outcomeType:
                        plan.metrics?.percentComplete === 100
                            ? OUTCOME_TYPES.SUCCESS
                            : OUTCOME_TYPES.PARTIAL_SUCCESS,
                    summary:
                        `Executive plan reached ${plan.metrics?.percentComplete || 0}% completion.`,
                    objective:
                        plan.objective ||
                        "",
                    result:
                        `Plan status: ${plan.status}`,
                    successCriteria:
                        plan.milestones
                            ?.map(
                                (milestone) =>
                                    milestone.title
                            )
                            .filter(Boolean) || [],
                    completedCriteria:
                        plan.milestones
                            ?.filter(
                                (milestone) =>
                                    milestone.status ===
                                    "achieved"
                            )
                            .map(
                                (milestone) =>
                                    milestone.title
                            ) || [],
                    failedCriteria:
                        plan.milestones
                            ?.filter(
                                (milestone) =>
                                    milestone.status !==
                                    "achieved"
                            )
                            .map(
                                (milestone) =>
                                    milestone.title
                            ) || [],
                    risks:
                        plan.risks || [],
                    confidence: 0.8,
                    metadata: {
                        planStatus:
                            plan.status,
                        percentComplete:
                            plan.metrics?.percentComplete ||
                            0
                    }
                }));
        },

        scanApprovedDecisions() {
            const decisions =
                global.ExecutiveDecision?.decisions ||
                [];

            return decisions
                .filter(
                    (decision) =>
                        decision.status === "approved" &&
                        !this.hasObservation(
                            "decision",
                            decision.id
                        )
                )
                .map((decision) => {
                    const option =
                        decision.options?.find(
                            (item) =>
                                item.id ===
                                decision.selectedOptionId
                        );

                    return {
                        sourceType: "decision",
                        sourceId: decision.id,
                        sourceTitle:
                            decision.title ||
                            decision.id,
                        outcomeType:
                            OUTCOME_TYPES.UNKNOWN,
                        summary:
                            `Executive decision approved: ${option?.title || decision.selectedOptionId || "selected option"}.`,
                        objective:
                            decision.question ||
                            "",
                        result:
                            option?.description ||
                            option?.title ||
                            "",
                        decisions: [
                            option?.title ||
                            decision.selectedOptionId
                        ].filter(Boolean),
                        contributingFactors: [
                            decision.recommendation
                                ?.rationale
                        ].filter(Boolean),
                        blockingFactors:
                            decision.recommendation
                                ?.conditions || [],
                        citations:
                            decision.citations || [],
                        confidence:
                            decision.recommendation
                                ?.confidence || 0.7,
                        metadata: {
                            selectedOptionId:
                                decision.selectedOptionId,
                            approvedBy:
                                decision.approvedBy
                        }
                    };
                });
        },

        scanResolvedAlerts() {
            const alerts =
                global.ExecutiveMonitoring?.alerts ||
                [];

            return alerts
                .filter(
                    (alert) =>
                        alert.status === "resolved" &&
                        !this.hasObservation(
                            "monitoring-alert",
                            alert.id
                        )
                )
                .map((alert) => ({
                    sourceType:
                        "monitoring-alert",
                    sourceId: alert.id,
                    sourceTitle:
                        alert.title ||
                        alert.id,
                    outcomeType:
                        OUTCOME_TYPES.SUCCESS,
                    summary:
                        `Monitoring condition resolved: ${alert.message}`,
                    result:
                        alert.resolution ||
                        "The monitored condition is no longer present.",
                    contributingFactors: [
                        alert.resolution
                    ].filter(Boolean),
                    blockingFactors: [
                        alert.message
                    ].filter(Boolean),
                    actions: [
                        alert.recommendedAction
                    ].filter(Boolean),
                    office:
                        alert.office ||
                        null,
                    confidence: 0.75,
                    metadata: {
                        category:
                            alert.category,
                        severity:
                            alert.severityLabel
                    }
                }));
        },

        scanAutomationRuns() {
            const runs =
                global.ExecutiveAutomation?.runs ||
                [];

            return runs
                .filter(
                    (run) =>
                        [
                            "complete",
                            "failed"
                        ].includes(run.status) &&
                        !this.hasObservation(
                            "automation-run",
                            run.id
                        )
                )
                .map((run) => ({
                    sourceType:
                        "automation-run",
                    sourceId: run.id,
                    sourceTitle:
                        run.ruleName ||
                        run.id,
                    outcomeType:
                        run.status === "complete"
                            ? OUTCOME_TYPES.SUCCESS
                            : OUTCOME_TYPES.FAILURE,
                    summary:
                        `Automation run ${run.status}.`,
                    result:
                        run.status,
                    contributingFactors:
                        run.actionResults
                            ?.filter(
                                (item) =>
                                    item.success
                            )
                            .map(
                                (item) =>
                                    `Action succeeded: ${item.actionId}`
                            ) || [],
                    blockingFactors:
                        run.actionResults
                            ?.filter(
                                (item) =>
                                    item.success === false
                            )
                            .map(
                                (item) =>
                                    item.error ||
                                    `Action failed: ${item.actionId}`
                            ) || [],
                    confidence:
                        run.status === "complete"
                            ? 0.8
                            : 0.75,
                    metadata: {
                        ruleId:
                            run.ruleId,
                        runStatus:
                            run.status
                    }
                }));
        },

        scanCompletedCollaborations() {
            const sessions =
                global.ExecutiveCollaboration?.sessions ||
                [];

            return sessions
                .filter(
                    (session) =>
                        session.status === "complete" &&
                        !this.hasObservation(
                            "collaboration-session",
                            session.id
                        )
                )
                .map((session) => ({
                    sourceType:
                        "collaboration-session",
                    sourceId: session.id,
                    sourceTitle:
                        session.title ||
                        session.id,
                    outcomeType:
                        session.consensus?.level ===
                            "none"
                            ? OUTCOME_TYPES.FAILURE
                            : session.consensus?.level ===
                                "low"
                                ? OUTCOME_TYPES.PARTIAL_SUCCESS
                                : OUTCOME_TYPES.SUCCESS,
                    summary:
                        `Cabinet collaboration completed with ${session.consensus?.level || "unknown"} consensus.`,
                    result:
                        session.recommendation
                            ?.rationale ||
                        "",
                    contributingFactors:
                        session.agreements
                            ?.map(
                                (item) =>
                                    item.description
                            ) || [],
                    blockingFactors:
                        session.disagreements
                            ?.map(
                                (item) =>
                                    item.description
                            ) || [],
                    actions:
                        session.actionItems
                            ?.map(
                                (item) =>
                                    item.title
                            ) || [],
                    citations:
                        session.citations || [],
                    office:
                        session.chair ||
                        "Maddy",
                    confidence:
                        session.consensus?.score ||
                        0.5,
                    metadata: {
                        consensusLevel:
                            session.consensus?.level,
                        disagreementCount:
                            session.disagreements?.length ||
                            0
                    }
                }));
        },

        applyLessons(query, options = {}) {
            const normalized =
                this.normalizeText(query);

            const minimumConfidence =
                Number(
                    options.minimumConfidence
                ) ||
                this.configuration
                    .minimumConfidenceToActivate;

            return this.lessons
                .filter(
                    (lesson) =>
                        lesson.status ===
                            LESSON_STATUSES.ACTIVE &&
                        lesson.confidence >=
                            minimumConfidence
                )
                .map((lesson) => {
                    const searchable =
                        this.normalizeText(
                            [
                                lesson.title,
                                lesson.statement,
                                lesson.lessonType,
                                lesson.office,
                                ...lesson.applicability,
                                ...lesson.conditions,
                                ...lesson.tags
                            ].join(" ")
                        );

                    const similarity =
                        normalized
                            ? this.textSimilarity(
                                normalized,
                                searchable
                            )
                            : 1;

                    return {
                        lesson,
                        relevance:
                            similarity * 0.65 +
                            lesson.confidence * 0.35
                    };
                })
                .filter(
                    (item) =>
                        !normalized ||
                        item.relevance >=
                            (options.minimumRelevance || 0.15)
                )
                .sort(
                    (a, b) =>
                        b.relevance -
                        a.relevance
                )
                .slice(
                    0,
                    options.limit || 20
                )
                .map((item) => ({
                    ...this.clone(item.lesson),
                    relevance:
                        Number(
                            item.relevance.toFixed(3)
                        )
                }));
        },

        writeLessonToKnowledge(lesson) {
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

            const recordId =
                `institutional-lesson-${lesson.id}`;

            const payload = {
                id: recordId,
                recordType:
                    "institutional-lesson",
                title:
                    lesson.title,
                summary:
                    lesson.statement,
                content:
                    [
                        lesson.statement,
                        ...lesson.conditions,
                        ...lesson.exceptions,
                        ...lesson.recommendedChanges
                    ]
                        .filter(Boolean)
                        .join(" "),
                tags: [
                    ...lesson.tags,
                    "executive-learning",
                    lesson.lessonType,
                    lesson.status
                ],
                topics: [
                    "institutional-learning",
                    lesson.lessonType
                ],
                authority:
                    lesson.status ===
                    LESSON_STATUSES.ACTIVE
                        ? "validated"
                        : "draft",
                confidence:
                    lesson.confidence,
                sensitivity:
                    lesson.metadata?.sensitivity ||
                    "internal",
                officeAccess:
                    lesson.office
                        ? [lesson.office, "Maddy"]
                        : ["all"],
                metadata: {
                    lessonId:
                        lesson.id,
                    sourceObservationIds:
                        lesson.sourceObservationIds,
                    evidenceCount:
                        lesson.evidenceCount,
                    validatedAt:
                        lesson.validatedAt,
                    validatedBy:
                        lesson.validatedBy,
                    citations:
                        lesson.citations
                },
                createdBy: this.name
            };

            const existing =
                engine.getRecordById?.(recordId);

            let result;

            if (
                existing &&
                typeof engine.updateRecord ===
                    "function"
            ) {
                result =
                    engine.updateRecord(
                        recordId,
                        payload
                    );
            } else {
                result =
                    engine.createRecord(payload);
            }

            lesson.knowledgeRecordId =
                result?.id ||
                result?.record?.id ||
                recordId;

            return result;
        },

        recalculateLessonConfidence(lesson) {
            const evidenceFactor =
                Math.min(
                    0.25,
                    lesson.sourceObservationIds.length *
                    0.05
                );

            const validationFactor =
                lesson.validatedAt
                    ? 0.15
                    : 0;

            const citationFactor =
                Math.min(
                    0.1,
                    lesson.citations.length *
                    0.02
                );

            return this.normalizeConfidence(
                Math.max(
                    lesson.confidence,
                    this.configuration.defaultConfidence
                ) +
                evidenceFactor +
                validationFactor +
                citationFactor
            );
        },

        findSimilarLesson(statement) {
            return (
                this.lessons.find(
                    (lesson) =>
                        this.textSimilarity(
                            lesson.statement,
                            statement
                        ) >=
                        this.configuration
                            .duplicateSimilarityThreshold
                ) || null
            );
        },

        hasObservation(sourceType, sourceId) {
            return this.observations.some(
                (observation) =>
                    observation.sourceType ===
                        sourceType &&
                    observation.sourceId ===
                        sourceId
            );
        },

        getLessonById(lessonId) {
            return (
                this.lessons.find(
                    (lesson) =>
                        lesson.id === lessonId
                ) || null
            );
        },

        searchLessons(query = "", filters = {}) {
            const normalized =
                this.normalizeText(query);

            return this.lessons
                .filter((lesson) => {
                    if (
                        filters.status &&
                        lesson.status !==
                            filters.status
                    ) {
                        return false;
                    }

                    if (
                        filters.lessonType &&
                        lesson.lessonType !==
                            filters.lessonType
                    ) {
                        return false;
                    }

                    if (
                        filters.office &&
                        lesson.office !==
                            filters.office
                    ) {
                        return false;
                    }

                    if (
                        filters.minimumConfidence &&
                        lesson.confidence <
                            filters.minimumConfidence
                    ) {
                        return false;
                    }

                    if (!normalized) {
                        return true;
                    }

                    const searchable =
                        this.normalizeText(
                            [
                                lesson.title,
                                lesson.statement,
                                lesson.lessonType,
                                lesson.office,
                                ...lesson.applicability,
                                ...lesson.conditions,
                                ...lesson.exceptions,
                                ...lesson.recommendedChanges,
                                ...lesson.tags
                            ].join(" ")
                        );

                    return searchable.includes(
                        normalized
                    );
                })
                .map((lesson) =>
                    this.clone(lesson)
                );
        },

        normalizeOutcomeType(value) {
            const normalized =
                String(value || "").toLowerCase();

            return Object.values(
                OUTCOME_TYPES
            ).includes(normalized)
                ? normalized
                : OUTCOME_TYPES.UNKNOWN;
        },

        normalizeFeedbackType(value) {
            const normalized =
                String(value || "").toLowerCase();

            return Object.values(
                FEEDBACK_TYPES
            ).includes(normalized)
                ? normalized
                : FEEDBACK_TYPES.OBSERVATION;
        },

        normalizeConfidence(value) {
            const number =
                Number(value);

            if (!Number.isFinite(number)) {
                return this.configuration.defaultConfidence;
            }

            return Math.max(
                0,
                Math.min(
                    1,
                    number > 1
                        ? number / 100
                        : number
                )
            );
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

            if (
                first.size === 0 ||
                second.size === 0
            ) {
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

        startScanner() {
            if (this.scannerId) {
                return {
                    success: true,
                    alreadyRunning: true,
                    intervalMs:
                        this.configuration.scanIntervalMs
                };
            }

            this.scannerId =
                global.setInterval(
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

            global.clearInterval(
                this.scannerId
            );
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
                "knowledge-system-executive-learning";

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
                recordType:
                    "system-component",
                title:
                    "MEOS Executive Learning Engine",
                summary:
                    "Universal controlled institutional learning from outcomes, feedback, decisions, workflows, alerts, collaboration, and automation.",
                content:
                    "Executive Learning converts authorized outcomes and feedback into reusable institutional lessons. It does not rewrite policy, change authority, autonomously approve decisions, spend money, communicate externally, or alter source records.",
                tags: [
                    "meos-core",
                    "executive-learning",
                    "system-component"
                ],
                topics: [
                    "learning",
                    "lessons-learned",
                    "continuous-improvement",
                    "feedback",
                    "outcomes",
                    "institutional-memory"
                ],
                authority: "system",
                confidence: 1,
                sensitivity: "internal",
                officeAccess: ["all"],
                metadata: {
                    componentVersion:
                        this.version,
                    organizationNeutralCore:
                        true,
                    brickBoundary:
                        "Authorized learning and lesson management only; no autonomous policy or authority changes."
                },
                createdBy: this.name
            });
        },

        recalculateAnalytics() {
            this.analytics.totalObservations =
                this.observations.length;
            this.analytics.totalLessons =
                this.lessons.length;
            this.analytics.activeLessons =
                this.lessons.filter(
                    (lesson) =>
                        lesson.status ===
                        LESSON_STATUSES.ACTIVE
                ).length;
            this.analytics.validatedLessons =
                this.lessons.filter(
                    (lesson) =>
                        lesson.status ===
                            LESSON_STATUSES.VALIDATED ||
                        lesson.status ===
                            LESSON_STATUSES.ACTIVE
                ).length;
            this.analytics.rejectedLessons =
                this.lessons.filter(
                    (lesson) =>
                        lesson.status ===
                        LESSON_STATUSES.REJECTED
                ).length;
            this.analytics.totalFeedback =
                this.feedback.length;

            return this.analytics;
        },

        getConnectedSources() {
            return {
                knowledgeEngine:
                    Boolean(global.KnowledgeEngine),
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
                executiveMonitoring:
                    Boolean(global.ExecutiveMonitoring)
            };
        },

        getStatus() {
            this.recalculateAnalytics();

            return {
                name: this.name,
                version: this.version,
                status: this.status,
                operatingMode:
                    this.operatingMode,
                organizationNeutralCore:
                    this.configuration
                        .organizationNeutralCore,
                scannerRunning:
                    Boolean(this.scannerId),
                scanIntervalMs:
                    this.configuration.scanIntervalMs,
                connectedSources:
                    this.getConnectedSources(),
                observationCount:
                    this.observations.length,
                lessonCount:
                    this.lessons.length,
                feedbackCount:
                    this.feedback.length,
                analytics:
                    this.clone(this.analytics),
                initializedAt:
                    this.initializedAt
            };
        },

        exportLearning(options = {}) {
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
                    observations:
                        this.observations,
                    lessons:
                        this.lessons,
                    feedback:
                        this.feedback,
                    history:
                        options.includeHistory === false
                            ? []
                            : this.history,
                    analytics:
                        this.analytics
                }
            };
        },

        importLearning(payload, options = {}) {
            let data = payload;

            if (typeof payload === "string") {
                try {
                    data = JSON.parse(payload);
                } catch (error) {
                    return {
                        success: false,
                        error:
                            "The Executive Learning import is not valid JSON."
                    };
                }
            }

            if (!data || data.schema !== SCHEMA) {
                return {
                    success: false,
                    error:
                        "The import is not a MEOS Executive Learning package."
                };
            }

            if (options.replace === true) {
                this.observations = [];
                this.lessons = [];
                this.feedback = [];
                this.history = [];
            }

            this.mergeById(
                this.observations,
                data.observations || []
            );
            this.mergeById(
                this.lessons,
                data.lessons || []
            );
            this.mergeById(
                this.feedback,
                data.feedback || []
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
                return this.schedulePersistence();
            }

            return {
                success: true,
                persisted: false,
                scheduled: false
            };
        },

        buildPersistenceSnapshot() {
            return this.exportLearning({
                includeHistory: true
            }).data;
        },

        releaseLegacyLocalStorage() {
            try {
                global.localStorage?.removeItem(
                    this.configuration.localStorageKey
                );
                persistence.localStorageReleased = true;
                return true;
            } catch (error) {
                persistence.lastError =
                    error?.message || String(error);
                return false;
            }
        },

        async persistIndexedDbCacheNow() {
            if (
                !this.configuration.persistenceEnabled ||
                !global.indexedDB ||
                persistence.suspended
            ) {
                return false;
            }

            persistence.writeScheduled = false;
            persistence.writeInFlight = true;

            try {
                const snapshot =
                    this.buildPersistenceSnapshot();

                await indexedDbPut({
                    id: INDEXED_DB_RECORD_ID,
                    schema:
                        "meos.executive-learning.local-state.v1",
                    version: this.version,
                    buildId: this.buildId,
                    savedAt:
                        new Date().toISOString(),
                    state: snapshot
                });

                persistence.cacheRole =
                    "bounded-recovery-cache";
                persistence.lastCachePersistedAt =
                    new Date().toISOString();
                persistence.lastError = null;
                persistence.suspended = false;

                this.releaseLegacyLocalStorage();

                return true;
            } catch (error) {
                persistence.lastError =
                    error?.message || String(error);
                persistence.suspended = true;

                console.error(
                    "[MEOS Executive Learning] IndexedDB recovery-cache write failed. Durable Repository Authority remains primary.",
                    error
                );

                return false;
            } finally {
                persistence.writeInFlight = false;
            }
        },

        async persistDurableNow() {
            if (
                !this.configuration.persistenceEnabled ||
                persistence.suspended
            ) {
                return false;
            }

            persistence.writeScheduled = false;
            persistence.writeInFlight = true;

            try {
                const snapshot =
                    this.buildPersistenceSnapshot();

                const result =
                    await executiveLearningStateRequest(
                        "PUT",
                        {
                            version: this.version,
                            buildId: this.buildId,
                            state: snapshot
                        }
                    );

                if (
                    result?.success !== true ||
                    result?.authority !==
                        "durable-institutional-repository"
                ) {
                    throw new Error(
                        "Executive Learning durable write was not verified by MEOS Repository Authority."
                    );
                }

                persistence.mode =
                    "institutional-repository-authority";
                persistence.authoritativeStorage =
                    "meos-institutional-repository";
                persistence.durableAuthorityReady = true;
                persistence.degraded = false;
                persistence.degradedReason = null;
                persistence.lastDurableProviderId =
                    result.providerId || null;
                persistence.lastPersistedAt =
                    new Date().toISOString();
                persistence.lastError = null;
                persistence.suspended = false;

                this.releaseLegacyLocalStorage();

                if (global.indexedDB) {
                    await this.persistIndexedDbCacheNow();
                }

                return true;
            } catch (error) {
                persistence.lastError =
                    error?.message || String(error);
                persistence.degraded = true;
                persistence.degradedReason =
                    "durable-authority-unavailable";

                /*
                 * Do not promote browser storage to authority during a
                 * provider outage. Keep a bounded recovery cache only.
                 */
                if (global.indexedDB) {
                    try {
                        await this.persistIndexedDbCacheNow();
                    } catch (_cacheError) {}
                }

                return false;
            } finally {
                persistence.writeInFlight = false;
            }
        },

        schedulePersistence() {
            if (
                !this.configuration.persistenceEnabled
            ) {
                return {
                    success: false,
                    persisted: false,
                    scheduled: false,
                    error:
                        "Executive Learning persistence is disabled."
                };
            }

            if (persistence.suspended) {
                return {
                    success: false,
                    persisted: false,
                    scheduled: false,
                    suspended: true,
                    error:
                        persistence.lastError ||
                        "Executive Learning persistence is suspended."
                };
            }

            persistence.writeScheduled = true;

            if (persistenceTimer) {
                global.clearTimeout(
                    persistenceTimer
                );
            }

            persistenceTimer =
                global.setTimeout(() => {
                    persistenceTimer = null;
                    writeChain = writeChain
                        .catch(() => undefined)
                        .then(() =>
                            this.persistDurableNow()
                        );
                }, PERSISTENCE_DEBOUNCE_MS);

            return {
                success: true,
                persisted: false,
                scheduled: true
            };
        },

        persist() {
            return this.flushPersistence();
        },

        persistLegacyFallback() {
            if (
                !this.configuration.persistenceEnabled
            ) {
                return {
                    success: false,
                    persisted: false,
                    error:
                        "Executive Learning persistence is disabled."
                };
            }

            if (!global.localStorage) {
                return {
                    success: false,
                    persisted: false,
                    error:
                        "Browser local storage is unavailable."
                };
            }

            try {
                global.localStorage.setItem(
                    this.configuration.localStorageKey,
                    JSON.stringify(
                        this.buildPersistenceSnapshot()
                    )
                );

                persistence.lastError = null;

                return {
                    success: true,
                    persisted: true,
                    storage: "localstorage"
                };
            } catch (error) {
                persistence.lastError =
                    error?.message || String(error);
                persistence.suspended = true;

                console.warn(
                    "[MEOS Executive Learning] Fallback localStorage persistence is full. Learning runtime continues.",
                    error
                );

                return {
                    success: false,
                    persisted: false,
                    error:
                        persistence.lastError
                };
            }
        },

        restoreLegacySnapshot() {
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
                    this.importLearning(
                        JSON.parse(stored),
                        {
                            replace: true
                        }
                    );

                return {
                    ...result,
                    restored: result.success,
                    source:
                        "legacy-localstorage"
                };
            } catch (error) {
                console.warn(
                    "[MEOS Executive Learning] Legacy stored state could not be restored:",
                    error
                );

                return {
                    success: false,
                    restored: false,
                    error:
                        error?.message ||
                        String(error)
                };
            }
        },

        async hydrateFromDurableAuthority() {
            try {
                const durable =
                    await executiveLearningStateRequest(
                        "GET"
                    );

                if (
                    durable?.found === true &&
                    durable?.value?.state?.schema ===
                        SCHEMA
                ) {
                    const result =
                        this.importLearning(
                            durable.value.state,
                            {
                                replace: true
                            }
                        );

                    if (!result.success) {
                        throw new Error(
                            "Executive Learning durable state could not be imported."
                        );
                    }

                    persistence.hydrated = true;
                    persistence.durableAuthorityReady = true;
                    persistence.degraded = false;
                    persistence.degradedReason = null;
                    persistence.lastRestoredAt =
                        new Date().toISOString();
                    persistence.lastDurableProviderId =
                        durable.providerId || null;
                    persistence.mode =
                        "institutional-repository-authority";
                    persistence.authoritativeStorage =
                        "meos-institutional-repository";
                    persistence.lastError = null;
                    this.releaseLegacyLocalStorage();

                    if (global.indexedDB) {
                        await this.persistIndexedDbCacheNow();
                    }

                    this.emit(
                        "learning:persistence-hydrated",
                        {
                            source:
                                "meos-institutional-repository",
                            restoredAt:
                                persistence.lastRestoredAt,
                            observations:
                                this.observations.length,
                            lessons:
                                this.lessons.length,
                            feedback:
                                this.feedback.length,
                            history:
                                this.history.length
                        }
                    );

                    return {
                        success: true,
                        restored: true,
                        source:
                            "meos-institutional-repository",
                        authority:
                            "meos-institutional-repository"
                    };
                }

                /*
                 * First durable boot: recover the existing laptop snapshot,
                 * then migrate it forward into MEOS Repository Authority.
                 */
                let recoveredFromCache = false;

                if (global.indexedDB) {
                    const record =
                        await indexedDbGet();

                    if (
                        record?.state &&
                        record.state.schema === SCHEMA
                    ) {
                        const result =
                            this.importLearning(
                                record.state,
                                { replace: true }
                            );
                        recoveredFromCache =
                            result.success === true;
                    }
                }

                if (!recoveredFromCache) {
                    this.restoreLegacySnapshot();
                }

                const migrated =
                    await this.persistDurableNow();

                persistence.hydrated = true;
                persistence.migratedLegacySnapshot =
                    migrated === true;

                return {
                    success: migrated === true,
                    restored: recoveredFromCache,
                    migratedLegacySnapshot:
                        migrated === true,
                    source:
                        recoveredFromCache
                            ? "indexeddb-recovery-migrated"
                            : "initial-durable-state",
                    authority:
                        "meos-institutional-repository"
                };
            } catch (error) {
                /*
                 * Provider outage does not transfer authority to the laptop.
                 * Recover cache for continuity only and mark degraded.
                 */
                let recovered = false;

                if (global.indexedDB) {
                    try {
                        const record =
                            await indexedDbGet();

                        if (
                            record?.state &&
                            record.state.schema === SCHEMA
                        ) {
                            const result =
                                this.importLearning(
                                    record.state,
                                    { replace: true }
                                );
                            recovered =
                                result.success === true;
                        }
                    } catch (_cacheError) {}
                }

                persistence.hydrated = true;
                persistence.durableAuthorityReady = false;
                persistence.degraded = true;
                persistence.degradedReason =
                    "durable-authority-unavailable";
                persistence.lastError =
                    error?.message || String(error);
                persistence.mode =
                    "institutional-repository-authority";
                persistence.authoritativeStorage =
                    "meos-institutional-repository";

                return {
                    success: recovered,
                    restored: recovered,
                    source: recovered
                        ? "indexeddb-recovery-cache"
                        : "runtime-only",
                    authority:
                        "meos-institutional-repository",
                    degraded: true,
                    error:
                        persistence.lastError
                };
            }
        },

        async flushPersistence() {
            if (persistenceTimer) {
                global.clearTimeout(
                    persistenceTimer
                );
                persistenceTimer = null;
            }

            writeChain = writeChain
                .catch(() => undefined)
                .then(() =>
                    this.persistDurableNow()
                );

            return writeChain;
        },

        getPersistenceStatus() {
            let localStorageBytes = null;

            try {
                localStorageBytes =
                    new Blob([
                        global.localStorage?.getItem(
                            this.configuration.localStorageKey
                        ) || ""
                    ]).size;
            } catch (_error) {
                localStorageBytes = null;
            }

            return this.clone({
                ...persistence,
                localStorageBytes
            });
        },

        whenHydrated() {
            return (
                this.hydrationPromise ||
                Promise.resolve({
                    success: true,
                    restored: false
                })
            );
        },

        async runDurableAuthorityAcceptanceTest() {
            const checks = [];

            await this.whenHydrated();

            checks.push({
                name:
                    "Executive Learning authority is MEOS Institutional Repository",
                passed:
                    persistence.authoritativeStorage ===
                        "meos-institutional-repository" &&
                    persistence.mode ===
                        "institutional-repository-authority"
            });

            const snapshot =
                this.buildPersistenceSnapshot();

            const durableWrite =
                await this.persistDurableNow();

            checks.push({
                name:
                    "Executive Learning writes current learning through durable Repository Authority",
                passed:
                    durableWrite === true &&
                    persistence.durableAuthorityReady ===
                        true &&
                    persistence.degraded === false
            });

            const durableRead =
                await executiveLearningStateRequest(
                    "GET"
                );

            checks.push({
                name:
                    "Durable Executive Learning reads back from MEOS authority",
                passed:
                    durableRead?.found === true &&
                    durableRead?.authority ===
                        "durable-institutional-repository" &&
                    durableRead?.value?.state?.schema ===
                        SCHEMA
            });

            checks.push({
                name:
                    "Durable round trip preserves learning semantics",
                passed:
                    durableRead?.value?.state?.observations?.length ===
                        snapshot.observations.length &&
                    durableRead?.value?.state?.lessons?.length ===
                        snapshot.lessons.length &&
                    durableRead?.value?.state?.feedback?.length ===
                        snapshot.feedback.length &&
                    durableRead?.value?.state?.history?.length ===
                        snapshot.history.length
            });

            let cachePassed = true;

            if (global.indexedDB) {
                await this.persistIndexedDbCacheNow();
                const cache =
                    await indexedDbGet();
                cachePassed =
                    cache?.state?.schema === SCHEMA;
            }

            checks.push({
                name:
                    "IndexedDB is bounded recovery cache, not Executive Learning authority",
                passed:
                    cachePassed &&
                    persistence.authoritativeStorage ===
                        "meos-institutional-repository" &&
                    persistence.cacheRole ===
                        (global.indexedDB
                            ? "bounded-recovery-cache"
                            : "unavailable")
            });

            checks.push({
                name:
                    "Legacy localStorage is released from institutional authority",
                passed:
                    global.localStorage?.getItem(
                        this.configuration.localStorageKey
                    ) === null
            });

            checks.push({
                name:
                    "Executive Learning governance remains intact after authority flip",
                passed:
                    this.status === "online" &&
                    typeof this.observe ===
                        "function" &&
                    typeof this.addFeedback ===
                        "function" &&
                    typeof this.validateLesson ===
                        "function" &&
                    typeof this.rejectLesson ===
                        "function" &&
                    typeof this.scan ===
                        "function"
            });

            const passed =
                checks.every(
                    item => item.passed
                );

            console.table(checks);
            console.info(
                `[MEOS ${this.version}] Commission 006.017D6B Executive Learning durable authority flip: ${passed ? "PASS" : "FAIL"}.`
            );

            return {
                commission:
                    "006.017D6B",
                version:
                    this.version,
                buildId:
                    this.buildId,
                passed,
                checks,
                persistence:
                    this.getPersistenceStatus()
            };
        },

        async runLaptopPersistenceAcceptanceTest() {
            return this.runDurableAuthorityAcceptanceTest();
        },

        clear(options = {}) {
            if (options.confirm !== true) {
                return {
                    success: false,
                    error:
                        "Clearing Executive Learning data requires { confirm: true }."
                };
            }

            this.stopScanner();
            this.observations = [];
            this.lessons = [];
            this.feedback = [];
            this.history = [];
            this.analytics = {
                totalObservations: 0,
                totalLessons: 0,
                activeLessons: 0,
                validatedLessons: 0,
                rejectedLessons: 0,
                totalFeedback: 0,
                lastScanAt: null,
                lastLessonAt: null
            };

            if (global.localStorage) {
                global.localStorage.removeItem(
                    this.configuration.localStorageKey
                );
            }

            if (global.indexedDB) {
                void indexedDbDelete(
                    INDEXED_DB_RECORD_ID
                ).catch(() => null);
            }

            if (
                this.configuration.autoScanEnabled
            ) {
                this.startScanner();
            }

            return {
                success: true,
                status: this.getStatus()
            };
        },

        logHistory(action, details = {}) {
            const entry = {
                id: this.createId("learning-history"),
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

            this.emit("learning:history", this.clone(entry));
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
                        `[MEOS Executive Learning] Event listener failed for "${eventName}":`,
                        error
                    );
                }
            });
        }
    };

    ExecutiveLearning.LESSON_STATUSES =
        LESSON_STATUSES;
    ExecutiveLearning.OUTCOME_TYPES =
        OUTCOME_TYPES;
    ExecutiveLearning.FEEDBACK_TYPES =
        FEEDBACK_TYPES;

    global.ExecutiveLearning =
        ExecutiveLearning;
    ExecutiveLearning.initialize();
})(window);
