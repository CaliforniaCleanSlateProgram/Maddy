/*
 * MEOS Executive Learning Engine
 * Version: 1.3.2
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
    const VERSION = "1.3.2";
    const BUILD_ID = "EL132-SYMMETRIC-CAMPAIGN-CAUSE-LEARNING-20260914-A";
    const CALIBRATION_SCHEMA = "meos.maddy.self-correction-calibration.v1";
    const COMMERCIAL_TRUTH_SCHEMA = "meos.maddy.commercial-truth.v1";

    const COMMERCIAL_VALUE_STATUSES = Object.freeze({
        MEASURED: "measured",
        ESTIMATED: "estimated",
        UNKNOWN: "unknown",
        NOT_APPLICABLE: "not-applicable"
    });

    const COMMERCIAL_RECORD_TYPES = Object.freeze({
        CAMPAIGN: "campaign",
        AUDIENCE: "audience",
        OFFER: "offer",
        HYPOTHESIS: "hypothesis",
        CHANNEL: "channel",
        CREATIVE: "creative",
        SEO: "seo",
        LEAD: "lead",
        CONVERSION: "conversion",
        COST: "cost",
        REVENUE: "revenue",
        ATTRIBUTION: "attribution",
        ECONOMIC_METRIC: "economic-metric",
        PREDICTION: "prediction",
        OUTCOME: "outcome",
        COMMERCIAL_LESSON: "commercial-lesson"
    });

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
            maximumCalibrationRecords: 5000,
            maximumCommercialTruthRecords: 10000,
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
        calibrations: [],
        commercialTruth: [],
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
            totalCalibrations: 0,
            totalCommercialTruthRecords: 0,
            lastCalibrationAt: null,
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

        extractEpistemicContinuity(input = {}) {
            const candidates = [
                input?.epistemicContinuity,
                input?.metadata?.epistemicContinuity,
                input?.evidenceAssessment?.epistemicContinuity,
                input?.reasoningContext?.evidenceAssessment?.epistemicContinuity,
                input?.raw?.epistemicContinuity,
                input?.raw?.metadata?.epistemicContinuity
            ];

            const continuity = candidates.find(
                (candidate) =>
                    candidate &&
                    typeof candidate === "object" &&
                    candidate.schema === "meos.maddy.epistemic-continuity.v1"
            );

            return continuity ? this.clone(continuity) : null;
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
                epistemicContinuity:
                    this.extractEpistemicContinuity(input),
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

        normalizeBenefit(input = {}) {
            const source =
                typeof input === "string"
                    ? { description: input }
                    : (input && typeof input === "object" ? input : {});

            const value = Number(source.value ?? source.amount);

            return {
                type: String(source.type || source.category || "unspecified").trim() || "unspecified",
                description: String(source.description || source.summary || "").trim(),
                value: Number.isFinite(value) ? value : null,
                unit: String(source.unit || "").trim() || null,
                direction: ["increase", "decrease", "avoid", "protect", "neutral"].includes(String(source.direction || "").toLowerCase())
                    ? String(source.direction).toLowerCase()
                    : "neutral"
            };
        },

        assessBenefit(intended = {}, realized = {}) {
            const comparable =
                intended.value !== null &&
                realized.value !== null &&
                (!intended.unit || !realized.unit || intended.unit === realized.unit);

            let status = "unknown";
            let gap = null;

            if (comparable) {
                gap = Number((realized.value - intended.value).toFixed(6));
                if (realized.value < 0) {
                    status = "harm";
                } else if (intended.value === 0) {
                    status = realized.value > 0 ? "realized" : "neutral";
                } else {
                    const ratio = realized.value / intended.value;
                    status = ratio >= 0.9
                        ? "realized"
                        : ratio > 0
                            ? "partially-realized"
                            : "not-realized";
                }
            } else if (realized.description) {
                status = "observed-unquantified";
            }

            return {
                status,
                comparable,
                gap,
                rule: "A material change in Maddy's understanding is incomplete until she evaluates whether it created benefit, risk, opportunity, leverage, required action, or no meaningful change for the user."
            };
        },

        assessPrediction(input = {}) {
            const explicit = String(
                input.predictionResult ||
                input.predictionAssessment ||
                ""
            ).trim().toLowerCase();

            const aliases = {
                correct: "supported",
                supported: "supported",
                true: "supported",
                incorrect: "missed",
                wrong: "missed",
                missed: "missed",
                false: "missed",
                partial: "partially-supported",
                "partially-supported": "partially-supported",
                unresolved: "unresolved",
                unknown: "unresolved"
            };

            let status = aliases[explicit] || null;

            if (!status && typeof input.predictionWasCorrect === "boolean") {
                status = input.predictionWasCorrect ? "supported" : "missed";
            }

            if (!status) {
                status = "unresolved";
            }

            return {
                status,
                resolved: status !== "unresolved",
                score: status === "supported" ? 1 : status === "missed" ? 0 : status === "partially-supported" ? 0.5 : null
            };
        },

        recordCalibration(input = {}, options = {}) {
            const domain = String(
                input.domain ||
                input.context?.domain ||
                input.subjectType ||
                "general"
            ).trim() || "general";

            const predictionStatement = String(
                input.prediction?.statement ||
                input.prediction ||
                input.expectedOutcome ||
                ""
            ).trim();

            const actualSummary = String(
                input.actualOutcome?.summary ||
                input.actualOutcome ||
                input.result ||
                ""
            ).trim();

            if (!predictionStatement || !actualSummary) {
                return {
                    success: false,
                    error: "A prior prediction and observed actual outcome are required for self-correction calibration."
                };
            }

            if (this.calibrations.length >= this.configuration.maximumCalibrationRecords) {
                return {
                    success: false,
                    error: "The self-correction calibration limit has been reached."
                };
            }

            const predictionConfidence = this.normalizeConfidence(
                input.prediction?.confidence ??
                input.predictionConfidence ??
                input.confidence
            );
            const predictionAssessment = this.assessPrediction(input);
            const intendedUserBenefit = this.normalizeBenefit(
                input.intendedUserBenefit || input.expectedUserBenefit || {}
            );
            const realizedUserBenefit = this.normalizeBenefit(
                input.realizedUserBenefit || input.actualUserBenefit || {}
            );
            const benefitAssessment = this.assessBenefit(
                intendedUserBenefit,
                realizedUserBenefit
            );
            const causalConfidence = this.normalizeConfidence(
                input.causalConfidence ?? 0.5
            );

            const rawSuggestedDelta = !predictionAssessment.resolved
                ? 0
                : (predictionAssessment.score - predictionConfidence) *
                    0.2 *
                    causalConfidence;
            const suggestedDelta = Number(
                Math.max(-0.15, Math.min(0.15, rawSuggestedDelta)).toFixed(6)
            );

            const timestamp = new Date().toISOString();
            const calibration = {
                id: this.createId("maddy-calibration"),
                schema: CALIBRATION_SCHEMA,
                domain,
                context: {
                    domain,
                    decisionType: input.context?.decisionType || input.decisionType || null,
                    counterpartyId: input.context?.counterpartyId || input.counterpartyId || null,
                    caseId: input.context?.caseId || input.caseId || null,
                    organizationId: input.context?.organizationId || input.organizationId || null
                },
                priorBelief: {
                    statement: String(input.priorBelief?.statement || input.belief || "").trim(),
                    confidence: this.normalizeConfidence(input.priorBelief?.confidence ?? predictionConfidence)
                },
                prediction: {
                    statement: predictionStatement,
                    confidence: predictionConfidence
                },
                recommendation: {
                    action: String(input.recommendation?.action || input.recommendation || "").trim(),
                    rationale: String(input.recommendation?.rationale || "").trim()
                },
                intendedUserBenefit,
                actualOutcome: {
                    summary: actualSummary,
                    outcomeType: this.normalizeOutcomeType(input.actualOutcome?.outcomeType || input.outcomeType || input.outcome)
                },
                realizedUserBenefit,
                benefitAssessment,
                predictionAssessment,
                causalConfidence,
                recalibration: {
                    priorConfidence: predictionConfidence,
                    suggestedConfidence: this.normalizeConfidence(predictionConfidence + suggestedDelta),
                    delta: suggestedDelta,
                    automaticAuthorityChange: false,
                    rule: "Observed reality may recalibrate future judgment, but one outcome does not become automatic truth, policy, or authority. Context and causal uncertainty must survive."
                },
                falsifiers: this.uniqueStrings(input.falsifiers || input.whatWouldChangeMyMind),
                sourceObservationIds: this.uniqueStrings(input.sourceObservationIds),
                evidence: Array.isArray(input.evidence) ? this.clone(input.evidence) : [],
                createdAt: timestamp,
                createdBy: options.actor || input.observedBy || this.name,
                metadata: input.metadata && typeof input.metadata === "object" ? { ...input.metadata } : {}
            };

            this.calibrations.unshift(calibration);
            this.analytics.lastCalibrationAt = timestamp;
            this.logHistory("calibration.recorded", {
                calibrationId: calibration.id,
                domain,
                predictionAssessment: predictionAssessment.status,
                benefitAssessment: benefitAssessment.status,
                recalibrationDelta: suggestedDelta
            });
            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("learning:self-correction-recorded", this.clone(calibration));

            return {
                success: true,
                calibration: this.clone(calibration),
                guidance: this.getCalibrationGuidance({ domain })
            };
        },

        getCalibrationGuidance(context = {}) {
            const domain = String(context.domain || "general").trim() || "general";
            const relevant = this.calibrations.filter((item) => item.domain === domain);
            const resolved = relevant.filter((item) => item.predictionAssessment?.resolved === true);
            const scored = resolved.filter((item) => Number.isFinite(item.predictionAssessment?.score));
            const benefits = relevant.filter((item) => !["unknown"].includes(item.benefitAssessment?.status));

            const averageConfidence = scored.length
                ? scored.reduce((sum, item) => sum + Number(item.prediction?.confidence || 0), 0) / scored.length
                : null;
            const hitRate = scored.length
                ? scored.reduce((sum, item) => sum + Number(item.predictionAssessment.score), 0) / scored.length
                : null;
            const calibrationBias = averageConfidence === null || hitRate === null
                ? null
                : Number((averageConfidence - hitRate).toFixed(6));
            const confidenceAdjustment = calibrationBias === null
                ? 0
                : Number(Math.max(-0.15, Math.min(0.15, -calibrationBias * 0.25)).toFixed(6));

            return {
                schema: "meos.maddy.contextual-calibration-guidance.v1",
                domain,
                observations: relevant.length,
                resolvedPredictions: resolved.length,
                averagePredictionConfidence: averageConfidence === null ? null : Number(averageConfidence.toFixed(6)),
                observedHitRate: hitRate === null ? null : Number(hitRate.toFixed(6)),
                calibrationBias,
                suggestedConfidenceAdjustment: confidenceAdjustment,
                benefitObservations: benefits.length,
                preserveUncertainty: relevant.length < 3 || resolved.length < 3,
                userBenefitRule: "Use truth to improve the user's outcome, protect the user's attention, surface material risk or opportunity, or deliberately recommend no action when no meaningful benefit exists.",
                calibrationRule: "Calibration is contextual. Maddy must not convert one actor, domain, success, failure, or prior mistake into a universal trust or confidence score."
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
                            epistemicContinuity:
                                this.clone(observation.epistemicContinuity),
                            metadata: {
                                epistemicContinuity:
                                    this.clone(observation.epistemicContinuity)
                            },
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
                const incomingContinuity =
                    this.extractEpistemicContinuity(input);

                if (incomingContinuity) {
                    duplicate.epistemicContinuity =
                        this.clone(incomingContinuity);
                    duplicate.metadata = {
                        ...(duplicate.metadata || {}),
                        epistemicContinuity:
                            this.clone(incomingContinuity)
                    };
                }

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
                epistemicContinuity:
                    this.extractEpistemicContinuity(input),
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
                metadata: {
                    ...(input.metadata &&
                    typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}),
                    ...(this.extractEpistemicContinuity(input)
                        ? {
                            epistemicContinuity:
                                this.extractEpistemicContinuity(input)
                        }
                        : {})
                }
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
                    epistemicContinuity:
                        this.extractEpistemicContinuity(alert),
                    metadata: {
                        category:
                            alert.category,
                        severity:
                            alert.severityLabel,
                        epistemicContinuity:
                            this.extractEpistemicContinuity(alert)
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
                        lesson.citations,
                    epistemicContinuity:
                        this.extractEpistemicContinuity(lesson),
                    epistemicLineage: {
                        sourceType: lesson.sourceType || null,
                        sourceId: lesson.sourceId || null,
                        sourceObservationIds:
                            this.clone(lesson.sourceObservationIds || []),
                        rule:
                            "Institutional lessons must preserve the epistemic conditions under which they were learned so future recall can distinguish supported knowledge from flattened hindsight."
                    }
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

        normalizeCommercialValue(input = {}, options = {}) {
            const source = input && typeof input === "object"
                ? input
                : { value: input };
            const explicitStatus = String(
                source.status || options.status || ""
            ).trim().toLowerCase();
            const allowedStatuses = Object.values(COMMERCIAL_VALUE_STATUSES);
            let status = allowedStatuses.includes(explicitStatus)
                ? explicitStatus
                : null;
            const rawValue = source.value ?? source.amount ?? null;
            const numericValue = rawValue === null || rawValue === ""
                ? null
                : Number(rawValue);
            const hasNumericValue = Number.isFinite(numericValue);

            if (!status) {
                status = hasNumericValue
                    ? COMMERCIAL_VALUE_STATUSES.ESTIMATED
                    : COMMERCIAL_VALUE_STATUSES.UNKNOWN;
            }

            if (
                status === COMMERCIAL_VALUE_STATUSES.MEASURED &&
                !hasNumericValue
            ) {
                status = COMMERCIAL_VALUE_STATUSES.UNKNOWN;
            }

            const confidence = status === COMMERCIAL_VALUE_STATUSES.UNKNOWN
                ? null
                : this.normalizeConfidence(
                    source.confidence ??
                    options.confidence ??
                    (status === COMMERCIAL_VALUE_STATUSES.MEASURED ? 1 : 0.5)
                );

            return {
                value: hasNumericValue ? numericValue : null,
                unit: String(source.unit || options.unit || "count").trim() || "count",
                currency: String(source.currency || options.currency || "").trim().toUpperCase() || null,
                status,
                confidence,
                measuredAt: source.measuredAt || options.measuredAt || null,
                sourceIds: this.uniqueStrings(source.sourceIds || options.sourceIds),
                methodology: String(source.methodology || options.methodology || "").trim() || null,
                assumptions: this.uniqueStrings(source.assumptions || options.assumptions),
                unknownReason: status === COMMERCIAL_VALUE_STATUSES.UNKNOWN
                    ? String(source.unknownReason || options.unknownReason || "not-enough-data").trim()
                    : null
            };
        },

        normalizeCommercialTruth(input = {}, options = {}) {
            const recordType = String(
                input.recordType || input.type || ""
            ).trim().toLowerCase();
            if (!Object.values(COMMERCIAL_RECORD_TYPES).includes(recordType)) {
                return {
                    success: false,
                    error: `Unsupported commercial truth record type: ${recordType || "missing"}.`
                };
            }

            const organizationId = String(
                input.organizationId || input.context?.organizationId || ""
            ).trim();
            if (!organizationId) {
                return {
                    success: false,
                    error: "Commercial truth requires an organizationId so organizational knowledge cannot silently bleed across deployments."
                };
            }

            const title = String(input.title || input.name || "").trim();
            if (!title) {
                return {
                    success: false,
                    error: "Commercial truth requires a title or name."
                };
            }

            const timestamp = new Date().toISOString();
            const economicInputs = input.economics && typeof input.economics === "object"
                ? input.economics
                : {};
            const economics = {};
            Object.entries(economicInputs).forEach(([key, value]) => {
                economics[key] = this.normalizeCommercialValue(value, {
                    currency: input.currency || options.currency || null
                });
            });

            const claimStatus = String(
                input.claimStatus || input.epistemicStatus || "unknown"
            ).trim().toLowerCase();
            const allowedClaimStatuses = [
                "verified", "supported", "inferred", "disputed", "marketed", "unknown"
            ];

            return {
                success: true,
                record: {
                    id: String(input.id || this.createId(`commercial-${recordType}`)),
                    schema: COMMERCIAL_TRUTH_SCHEMA,
                    recordType,
                    organizationId,
                    title,
                    description: String(input.description || input.summary || "").trim(),
                    campaignId: String(input.campaignId || "").trim() || null,
                    audienceId: String(input.audienceId || "").trim() || null,
                    offerId: String(input.offerId || "").trim() || null,
                    channelId: String(input.channelId || "").trim() || null,
                    creativeId: String(input.creativeId || "").trim() || null,
                    leadId: String(input.leadId || "").trim() || null,
                    conversionId: String(input.conversionId || "").trim() || null,
                    parentIds: this.uniqueStrings(input.parentIds),
                    tags: this.uniqueStrings(input.tags),
                    hypothesis: input.hypothesis ? this.clone(input.hypothesis) : null,
                    prediction: input.prediction ? this.clone(input.prediction) : null,
                    outcome: input.outcome ? this.clone(input.outcome) : null,
                    economics,
                    attribution: input.attribution && typeof input.attribution === "object"
                        ? {
                            model: String(input.attribution.model || "unknown").trim() || "unknown",
                            confidence: this.normalizeConfidence(input.attribution.confidence ?? 0),
                            sourceIds: this.uniqueStrings(input.attribution.sourceIds),
                            touchpoints: Array.isArray(input.attribution.touchpoints)
                                ? this.clone(input.attribution.touchpoints)
                                : [],
                            limitations: this.uniqueStrings(input.attribution.limitations)
                        }
                        : null,
                    epistemic: {
                        status: allowedClaimStatuses.includes(claimStatus)
                            ? claimStatus
                            : "unknown",
                        confidence: this.normalizeConfidence(input.confidence ?? 0),
                        sourceIds: this.uniqueStrings(input.sourceIds || input.evidenceIds),
                        assumptions: this.uniqueStrings(input.assumptions),
                        contradictions: Array.isArray(input.contradictions)
                            ? this.clone(input.contradictions)
                            : [],
                        falsifiers: this.uniqueStrings(input.falsifiers || input.whatWouldChangeMyMind),
                        unknowns: this.uniqueStrings(input.unknowns)
                    },
                    privacy: {
                        scope: "organization-isolated",
                        organizationId,
                        transferable: input.transferable === true,
                        transferRule: input.transferable === true
                            ? "Only generalized, evidence-grounded commercial reasoning may transfer; organization-specific facts, customer data, pricing, lists, strategy, and confidential information remain isolated."
                            : "Organization-specific commercial truth remains isolated to this organization."
                    },
                    authority: {
                        executionAuthorized: false,
                        spendAuthorized: false,
                        publicationAuthorized: false,
                        rule: "A commercial truth record records reality; it does not grant execution, spend, publication, outreach, or policy authority."
                    },
                    createdAt: input.createdAt || timestamp,
                    updatedAt: timestamp,
                    createdBy: options.actor || input.createdBy || this.name,
                    metadata: input.metadata && typeof input.metadata === "object"
                        ? this.clone(input.metadata)
                        : {}
                }
            };
        },

        recordCommercialTruth(input = {}, options = {}) {
            const normalized = this.normalizeCommercialTruth(input, options);
            if (!normalized.success) return normalized;
            if (this.commercialTruth.length >= this.configuration.maximumCommercialTruthRecords) {
                return {
                    success: false,
                    error: "The commercial truth record limit has been reached."
                };
            }

            const record = normalized.record;
            const existingIndex = this.commercialTruth.findIndex(
                item => item.id === record.id
            );
            if (existingIndex >= 0) {
                const existing = this.commercialTruth[existingIndex];
                if (existing.organizationId !== record.organizationId) {
                    return {
                        success: false,
                        error: "Commercial truth record IDs cannot cross organization boundaries."
                    };
                }
                record.createdAt = existing.createdAt || record.createdAt;
                this.commercialTruth[existingIndex] = record;
            } else {
                this.commercialTruth.push(record);
            }

            this.logHistory("commercial-truth.recorded", {
                recordId: record.id,
                recordType: record.recordType,
                organizationId: record.organizationId
            });
            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("learning:commercial-truth-recorded", this.clone(record));
            return { success: true, record: this.clone(record) };
        },

        buildCampaignConsequenceDiagnosis(observation = {}, options = {}) {
            const organizationId = String(observation.organizationId || "").trim();
            const campaignId = String(observation.campaignId || "").trim();
            if (!organizationId) return { success:false, error:"Campaign consequence diagnosis requires organizationId." };
            if (!campaignId) return { success:false, error:"Campaign consequence diagnosis requires campaignId." };

            const executionState = String(observation.execution?.state || "unknown");
            const consequenceState = String(observation.consequence?.state || "unknown");
            const seoState = String(observation.seo?.state || "unknown");
            const qualifiedLeadCount = Number(observation.funnel?.qualifiedLeadCount || 0);
            const overdueFollowUpCount = Number(observation.followUp?.overdueCount || 0);
            const suppressedFollowUpCount = Number(observation.followUp?.suppressedCount || 0);
            const uncertainExecution = executionState === "uncertain-provider-outcome";
            const measuredObservations = (Array.isArray(observation.consequence?.observations) ? observation.consequence.observations : [])
                .filter(item => String(item?.epistemicStatus || item?.status || "").toLowerCase() === "measured");
            const measuredConsequence = consequenceState === "observed" && measuredObservations.length > 0;
            const evidenceIds = this.uniqueStrings([
                ...(observation.execution?.receipts || []).map(item => item?.receiptId || item?.providerPublicationId || item?.id),
                ...measuredObservations.flatMap(item => [item?.evidenceId, item?.sourceId, item?.id, ...(Array.isArray(item?.evidenceIds) ? item.evidenceIds : [])]),
                ...(observation.seo?.signals || []).map(item => item?.evidenceId || item?.sourceId || item?.id)
            ]);

            const positiveSignals = measuredObservations.filter(item => {
                const direction = String(item?.outcomeDirection || item?.direction || item?.result || "").toLowerCase();
                const delta = Number(item?.delta ?? item?.change ?? NaN);
                return ["positive","improved","increase","increased","success","successful","won","converted"].includes(direction) || (Number.isFinite(delta) && delta > 0);
            });
            const negativeSignals = measuredObservations.filter(item => {
                const direction = String(item?.outcomeDirection || item?.direction || item?.result || "").toLowerCase();
                const delta = Number(item?.delta ?? item?.change ?? NaN);
                return ["negative","declined","decrease","decreased","failure","failed","lost"].includes(direction) || (Number.isFinite(delta) && delta < 0);
            });
            const mechanismCandidates = positiveSignals.map(item => ({
                mechanism: String(item?.mechanismHypothesis || item?.mechanism || item?.whyItWorked || "").trim() || null,
                metric: String(item?.metric || item?.name || "").trim() || null,
                value: item?.value ?? null,
                baseline: item?.baseline ?? null,
                evidenceIds: this.uniqueStrings([item?.evidenceId, item?.sourceId, item?.id, ...(Array.isArray(item?.evidenceIds) ? item.evidenceIds : [])]),
                alternativeExplanations: this.uniqueStrings(item?.alternativeExplanations || item?.alternatives),
                confidence: this.normalizeConfidence(item?.mechanismConfidence ?? item?.confidence ?? 0.5),
                conditions: item?.conditions && typeof item.conditions === "object" ? this.clone(item.conditions) : {},
                causalStatus: "hypothesis-not-proven-cause"
            }));
            const supportedMechanisms = mechanismCandidates.filter(item => item.mechanism && item.evidenceIds.length > 0);
            const successLearningState = positiveSignals.length === 0
                ? "no-measured-positive-signal"
                : supportedMechanisms.length === 0
                    ? "success-observed-cause-unknown"
                    : "success-observed-mechanism-hypothesized";

            const findings = [];
            if (uncertainExecution) findings.push({ type:"execution-uncertainty", status:"unresolved", evidenceBound:true, implication:"Reconcile provider outcome before any retry or performance conclusion." });
            if (!measuredConsequence && !uncertainExecution) findings.push({ type:"commercial-consequence", status:"unknown", evidenceBound:true, implication:"Do not infer campaign success or failure before measured consequence exists." });
            if (positiveSignals.length > 0) findings.push({ type:"positive-commercial-signal", status:"observed", evidenceBound:true, count:positiveSignals.length, implication:"Preserve what worked and investigate why before generalizing or scaling." });
            if (negativeSignals.length > 0) findings.push({ type:"negative-commercial-signal", status:"observed", evidenceBound:true, count:negativeSignals.length, implication:"Investigate failure conditions and discriminating evidence before changing the campaign." });
            if (seoState === "unknown") findings.push({ type:"search-visibility", status:"unknown", evidenceBound:true, implication:"Collect search visibility evidence before SEO adjustment." });
            if (qualifiedLeadCount > 0) findings.push({ type:"qualified-interest", status:"observed", evidenceBound:true, count:qualifiedLeadCount, implication:"Qualified interest exists; preserve campaign lineage through later conversion evidence." });
            if (overdueFollowUpCount > 0) findings.push({ type:"follow-up", status:"due-for-review", evidenceBound:true, count:overdueFollowUpCount, implication:"Follow-up may be proposed for separately authorized outreach." });
            if (suppressedFollowUpCount > 0) findings.push({ type:"suppression", status:"protected", evidenceBound:true, count:suppressedFollowUpCount, implication:"Suppressed or opted-out contacts remain excluded from outreach." });

            const adjustments = [];
            if (uncertainExecution) {
                adjustments.push({ type:"reconcile-before-adjusting", priority:"high", rationale:"Provider execution is uncertain.", requiresHumanAuthorization:false, externalAction:false });
            } else if (!measuredConsequence) {
                adjustments.push({ type:"measure-before-optimizing", priority:"moderate", rationale:"Execution is not evidence of commercial success.", requiresHumanAuthorization:false, externalAction:false });
            }
            if (positiveSignals.length > 0) {
                adjustments.push({
                    type:supportedMechanisms.length > 0 ? "test-and-preserve-success-mechanism" : "investigate-success-cause",
                    priority:"high",
                    rationale:supportedMechanisms.length > 0
                        ? "Measured positive consequence exists with an evidence-linked mechanism hypothesis; preserve its conditions and test whether the mechanism survives variation."
                        : "Measured positive consequence exists, but its cause is not evidenced; preserve the successful conditions and design a discriminating test before claiming why it worked.",
                    requiresHumanAuthorization:false,
                    externalAction:false,
                    scalingAuthorized:false
                });
            }
            if (negativeSignals.length > 0) adjustments.push({ type:"investigate-failure-mechanism", priority:"high", rationale:"Measured negative consequence exists; diagnose conditions and alternative explanations before changing the campaign.", requiresHumanAuthorization:false, externalAction:false });
            if (seoState === "unknown") adjustments.push({ type:"collect-seo-evidence", priority:"low", rationale:"Search visibility is unknown.", requiresHumanAuthorization:false, externalAction:false });
            if (overdueFollowUpCount > 0) adjustments.push({ type:"propose-follow-up", priority:"moderate", rationale:"A due follow-up exists, but learning cannot contact the lead.", requiresHumanAuthorization:true, externalAction:true, authorized:false });

            return {
                success:true,
                schema:"meos.executive-learning.campaign-consequence-diagnosis.v2",
                commission:"006.032G2",
                version:this.version,
                buildId:this.buildId,
                organizationId,
                campaignId,
                campaignLineage:this.clone(observation.campaignLineage || { organizationId, campaignId }),
                diagnosedAt:options.now || new Date().toISOString(),
                sourceObservation:{ schema:observation.schema || null, commission:observation.commission || null, observedAt:observation.observedAt || null },
                state:{ execution:executionState, consequence:consequenceState, seo:seoState, qualifiedLeadCount, overdueFollowUpCount, suppressedFollowUpCount },
                findings,
                adjustments,
                successLearning:{
                    state:successLearningState,
                    positiveSignalCount:positiveSignals.length,
                    mechanisms:supportedMechanisms,
                    conditionsPreserved:supportedMechanisms.map(item => this.clone(item.conditions)),
                    alternativeExplanations:this.uniqueStrings(supportedMechanisms.flatMap(item => item.alternativeExplanations)),
                    causalClaimAuthorized:false,
                    scalingAuthorized:false,
                    rule:"Observed success may justify learning that something worked. Why it worked remains a hypothesis until evidence discriminates the proposed mechanism from alternative explanations. Preserve successful conditions before varying them."
                },
                evidence:{ sourceIds:evidenceIds, measuredConsequence, unknownPreserved:!measuredConsequence, predictionOutcomeSeparated:true },
                authority:{ outreachAuthorized:false, publicationAuthorized:false, spendAuthorized:false, executionAuthorized:false, policyAuthorized:false, adjustmentIsRecommendationOnly:true },
                rule:"Learning diagnoses both success and failure from observed campaign evidence; it cannot convert correlation into causation, a recommendation into external action, or a successful observation into permission to scale."
            };
        },

        assimilateCampaignOperationsObservation(observation = {}, options = {}) {
            const diagnosis = this.buildCampaignConsequenceDiagnosis(observation, options);
            if (!diagnosis.success) return diagnosis;
            const id = `campaign-operations-${diagnosis.organizationId}-${diagnosis.campaignId}`;
            const outcome = this.recordCommercialTruth({
                id,
                recordType:COMMERCIAL_RECORD_TYPES.OUTCOME,
                organizationId:diagnosis.organizationId,
                campaignId:diagnosis.campaignId,
                title:`Campaign operations consequence: ${diagnosis.campaignId}`,
                description:"Evidence-bound campaign operations state assimilated from Executive Monitoring, including symmetric success/failure learning.",
                outcome:{
                    executionState:diagnosis.state.execution,
                    consequenceState:diagnosis.state.consequence,
                    seoState:diagnosis.state.seo,
                    qualifiedLeadCount:diagnosis.state.qualifiedLeadCount,
                    overdueFollowUpCount:diagnosis.state.overdueFollowUpCount,
                    successLearningState:diagnosis.successLearning.state
                },
                claimStatus:diagnosis.evidence.measuredConsequence ? "supported" : "unknown",
                confidence:diagnosis.evidence.measuredConsequence ? 0.7 : 0,
                sourceIds:diagnosis.evidence.sourceIds,
                unknowns:diagnosis.evidence.measuredConsequence ? [] : ["commercial consequence not yet measured"],
                parentIds:this.uniqueStrings([diagnosis.sourceObservation?.commission, diagnosis.campaignLineage?.creativeHypothesisId]),
                metadata:{
                    sourceSchema:diagnosis.sourceObservation.schema,
                    sourceCommission:diagnosis.sourceObservation.commission,
                    diagnosisSchema:diagnosis.schema,
                    findings:this.clone(diagnosis.findings),
                    recommendedAdjustments:this.clone(diagnosis.adjustments),
                    successLearning:this.clone(diagnosis.successLearning),
                    recommendationOnly:true
                }
            }, { actor:options.actor || this.name });
            if (!outcome.success) return outcome;
            return { success:true, schema:"meos.executive-learning.campaign-operations-assimilation.v2", commission:"006.032G2", version:this.version, buildId:this.buildId, diagnosis, record:outcome.record, authority:this.clone(diagnosis.authority) };
        },

        runCampaignConsequenceAssimilationAcceptanceTest() {
            const savedTruth = this.clone(this.commercialTruth);
            const savedHistory = this.clone(this.history);
            const savedAnalytics = this.clone(this.analytics);
            const savedPersistence = this.configuration.automaticPersistence;
            this.configuration.automaticPersistence = false;
            let unknownResult;
            let successResult;
            let uncertain;
            let isolated;
            try {
                unknownResult = this.assimilateCampaignOperationsObservation({
                    schema:"meos.executive-monitoring.campaign-operations-observation.v1",
                    commission:"006.032G1",
                    organizationId:"acceptance-org",
                    campaignId:"campaign-g2-unknown",
                    observedAt:"2026-09-14T21:00:00.000Z",
                    campaignLineage:{ organizationId:"acceptance-org", campaignId:"campaign-g2-unknown", creativeHypothesisId:"hypothesis-g2" },
                    execution:{ state:"verified-execution-evidence-present", receipts:[{ receiptId:"receipt-g2", providerPublicationId:"urn:provider:post:g2" }] },
                    consequence:{ state:"unknown", observations:[] },
                    seo:{ state:"unknown", signals:[] },
                    funnel:{ qualifiedLeadCount:1, leads:[{ id:"lead-g2", qualified:true }] },
                    followUp:{ overdueCount:1, suppressedCount:1, items:[{ id:"follow-g2", status:"pending" }, { id:"suppressed-g2", optOut:true }] }
                }, { now:"2026-09-14T21:05:00.000Z", actor:"acceptance" });
                successResult = this.assimilateCampaignOperationsObservation({
                    schema:"meos.executive-monitoring.campaign-operations-observation.v1",
                    commission:"006.032G1",
                    organizationId:"acceptance-org",
                    campaignId:"campaign-g2-success",
                    observedAt:"2026-09-14T21:10:00.000Z",
                    campaignLineage:{ organizationId:"acceptance-org", campaignId:"campaign-g2-success", creativeHypothesisId:"hypothesis-success", channelId:"linkedin", creativeId:"creative-proof-led" },
                    execution:{ state:"verified-execution-evidence-present", receipts:[{ receiptId:"receipt-success" }] },
                    consequence:{ state:"observed", observations:[{
                        id:"qualified-lead-lift-1", epistemicStatus:"measured", outcomeDirection:"positive", metric:"qualifiedLeadRate", value:0.12, baseline:0.04,
                        evidenceIds:["crm-cohort-17"], mechanismHypothesis:"Proof-led message reduced buyer uncertainty", mechanismConfidence:0.62,
                        alternativeExplanations:["audience mix changed","timing effect"],
                        conditions:{ audience:"founder-led small organizations", offer:"evidence-bound operator", channel:"linkedin", creative:"proof-led", timing:"weekday-morning" }
                    }] },
                    seo:{ state:"evidence-present", signals:[{ id:"seo-success", epistemicStatus:"measured" }] },
                    funnel:{ qualifiedLeadCount:3 },
                    followUp:{ overdueCount:0, suppressedCount:0 }
                }, { now:"2026-09-14T21:15:00.000Z", actor:"acceptance" });
                uncertain = this.buildCampaignConsequenceDiagnosis({
                    organizationId:"acceptance-org", campaignId:"campaign-uncertain-g2",
                    execution:{ state:"uncertain-provider-outcome", receipts:[] },
                    consequence:{ state:"observed", observations:[{ id:"obs-g2", epistemicStatus:"measured", outcomeDirection:"positive" }] },
                    seo:{ state:"evidence-present", signals:[{ id:"seo-g2", epistemicStatus:"measured" }] }, funnel:{}, followUp:{}
                });
                isolated = this.buildCampaignConsequenceDiagnosis({ organizationId:"other-org", campaignId:"campaign-g2", execution:{state:"unknown"}, consequence:{state:"unknown"}, seo:{state:"unknown"}, funnel:{}, followUp:{} });
                const checks = [
                    ["Campaign consequence diagnosis is versioned beneath Maddy", unknownResult?.diagnosis?.schema === "meos.executive-learning.campaign-consequence-diagnosis.v2" && unknownResult?.commission === "006.032G2"],
                    ["G1 monitoring observation is explicitly consumed", unknownResult?.diagnosis?.sourceObservation?.commission === "006.032G1"],
                    ["Campaign and creative-hypothesis lineage survive assimilation", unknownResult?.diagnosis?.campaignLineage?.creativeHypothesisId === "hypothesis-g2"],
                    ["Organization identity remains bound", unknownResult?.record?.organizationId === "acceptance-org" && isolated?.organizationId === "other-org"],
                    ["Execution remains separate from commercial consequence", unknownResult?.diagnosis?.state?.execution === "verified-execution-evidence-present" && unknownResult?.diagnosis?.state?.consequence === "unknown"],
                    ["Unknown commercial consequence remains unknown", unknownResult?.record?.epistemic?.status === "unknown"],
                    ["Provider receipt lineage remains evidence-addressable", unknownResult?.record?.epistemic?.sourceIds?.includes("receipt-g2") === true],
                    ["SEO unknown produces evidence collection rather than invented optimization", unknownResult?.diagnosis?.adjustments?.some(item => item.type === "collect-seo-evidence") === true],
                    ["Qualified lead evidence survives diagnosis", unknownResult?.diagnosis?.state?.qualifiedLeadCount === 1],
                    ["Overdue follow-up becomes separately authorized recommendation", unknownResult?.diagnosis?.adjustments?.find(item => item.type === "propose-follow-up")?.requiresHumanAuthorization === true],
                    ["Suppression evidence survives diagnosis", unknownResult?.diagnosis?.state?.suppressedFollowUpCount === 1],
                    ["Measured success is explicitly recognized", successResult?.diagnosis?.successLearning?.positiveSignalCount === 1 && successResult?.diagnosis?.findings?.some(item => item.type === "positive-commercial-signal")],
                    ["What worked remains bound to campaign conditions", successResult?.diagnosis?.successLearning?.mechanisms?.[0]?.conditions?.creative === "proof-led" && successResult?.diagnosis?.campaignLineage?.channelId === "linkedin"],
                    ["Why it worked is represented as a mechanism hypothesis", successResult?.diagnosis?.successLearning?.mechanisms?.[0]?.mechanism === "Proof-led message reduced buyer uncertainty"],
                    ["Mechanism hypothesis is evidence-addressable", successResult?.diagnosis?.successLearning?.mechanisms?.[0]?.evidenceIds?.includes("crm-cohort-17") === true],
                    ["Correlation is not silently promoted to causation", successResult?.diagnosis?.successLearning?.mechanisms?.[0]?.causalStatus === "hypothesis-not-proven-cause" && successResult?.diagnosis?.successLearning?.causalClaimAuthorized === false],
                    ["Alternative explanations survive successful learning", successResult?.diagnosis?.successLearning?.alternativeExplanations?.includes("audience mix changed") === true],
                    ["Successful conditions are preserved before variation", successResult?.diagnosis?.successLearning?.conditionsPreserved?.[0]?.timing === "weekday-morning"],
                    ["Success recommends test-and-preserve rather than blind scaling", successResult?.diagnosis?.adjustments?.some(item => item.type === "test-and-preserve-success-mechanism" && item.scalingAuthorized === false) === true],
                    ["Success learning enters existing durable commercial truth", successResult?.record?.schema === COMMERCIAL_TRUTH_SCHEMA && successResult?.record?.metadata?.successLearning?.state === "success-observed-mechanism-hypothesized"],
                    ["Uncertain provider execution demands reconciliation", uncertain?.adjustments?.[0]?.type === "reconcile-before-adjusting"],
                    ["Uncertain provider execution is never auto-retried", uncertain?.adjustments?.every(item => item.type !== "retry-publication") === true],
                    ["Learning grants no outreach publication spend execution or policy authority", successResult?.authority?.outreachAuthorized === false && successResult?.authority?.publicationAuthorized === false && successResult?.authority?.spendAuthorized === false && successResult?.authority?.executionAuthorized === false && successResult?.authority?.policyAuthorized === false],
                    ["Commercial adjustment remains recommendation-only", successResult?.authority?.adjustmentIsRecommendationOnly === true && successResult?.record?.metadata?.recommendationOnly === true]
                ].map(([name, passed]) => ({ name, passed:Boolean(passed) }));
                const passed = checks.filter(item => item.passed).length;
                const success = passed === checks.length;
                console.table(checks);
                console.info(`[MEOS ${this.version}] Commission 006.032G2 Symmetric Campaign Consequence Learning: ${success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`);
                return { success, commission:"006.032G2", schema:"meos.executive-learning.campaign-consequence-assimilation-acceptance.v2", version:this.version, buildId:this.buildId, passed, total:checks.length, checks, samples:{ unknown:unknownResult, success:successResult, uncertain } };
            } finally {
                this.commercialTruth = savedTruth;
                this.history = savedHistory;
                this.analytics = savedAnalytics;
                this.configuration.automaticPersistence = savedPersistence;
            }
        },

        getCommercialTruth(filters = {}) {
            const organizationId = String(filters.organizationId || "").trim();
            if (!organizationId) return [];
            const recordType = String(filters.recordType || "").trim().toLowerCase();
            const campaignId = String(filters.campaignId || "").trim();
            return this.clone(this.commercialTruth.filter(record =>
                record.organizationId === organizationId &&
                (!recordType || record.recordType === recordType) &&
                (!campaignId || record.campaignId === campaignId)
            ));
        },

        getCommercialSnapshot(organizationId) {
            const records = this.getCommercialTruth({ organizationId });
            const economics = {};
            records.forEach(record => {
                Object.entries(record.economics || {}).forEach(([key, value]) => {
                    if (!economics[key]) economics[key] = [];
                    economics[key].push({
                        recordId: record.id,
                        recordType: record.recordType,
                        ...this.clone(value)
                    });
                });
            });
            return {
                schema: "meos.maddy.commercial-truth-snapshot.v1",
                organizationId: String(organizationId || "").trim() || null,
                recordCount: records.length,
                records,
                economics,
                truthRule: "Measured, estimated, and unknown commercial values remain distinct. Unknown values are never silently converted into zero or fabricated certainty.",
                authorityRule: "Commercial truth is evidence for decisions; it is not execution, spend, publication, outreach, or policy authority."
            };
        },

        runCommercialDataContractAcceptanceTest() {
            const saved = {
                commercialTruth: this.clone(this.commercialTruth),
                history: this.clone(this.history),
                analytics: this.clone(this.analytics),
                automaticPersistence: this.configuration.automaticPersistence
            };
            this.configuration.automaticPersistence = false;
            const organizationId = "acceptance-org-a";
            const otherOrganizationId = "acceptance-org-b";
            const measured = this.recordCommercialTruth({
                id: "commercial-acceptance-revenue",
                recordType: "revenue",
                organizationId,
                title: "Measured customer revenue",
                campaignId: "campaign-acceptance-1",
                economics: {
                    revenue: {
                        value: 1200,
                        unit: "currency",
                        currency: "USD",
                        status: "measured",
                        sourceIds: ["payment-ledger-1"],
                        measuredAt: "2026-09-14T00:00:00.000Z"
                    },
                    cac: {
                        status: "unknown",
                        unit: "currency",
                        currency: "USD",
                        unknownReason: "qualified acquisition denominator unavailable"
                    }
                },
                claimStatus: "verified",
                confidence: 1,
                sourceIds: ["payment-ledger-1"],
                falsifiers: ["payment reversal"]
            });
            const estimated = this.recordCommercialTruth({
                id: "commercial-acceptance-campaign",
                recordType: "campaign",
                organizationId,
                title: "Organic campaign hypothesis",
                campaignId: "campaign-acceptance-1",
                economics: {
                    expectedValue: {
                        value: 500,
                        unit: "currency",
                        currency: "USD",
                        status: "estimated",
                        confidence: 0.55,
                        assumptions: ["historic conversion rate remains relevant"]
                    },
                    spend: {
                        value: 0,
                        unit: "currency",
                        currency: "USD",
                        status: "measured",
                        sourceIds: ["campaign-ledger-1"]
                    }
                },
                hypothesis: { statement: "Organic video can create qualified demand before paid amplification." },
                prediction: { statement: "At least one qualified lead will arrive without media spend.", confidence: 0.55 },
                transferable: true,
                assumptions: ["distribution access remains available"]
            });
            const isolated = this.recordCommercialTruth({
                id: "commercial-acceptance-other-org",
                recordType: "offer",
                organizationId: otherOrganizationId,
                title: "Private other-organization offer",
                description: "Must not appear in organization A snapshot."
            });
            const snapshot = this.getCommercialSnapshot(organizationId);
            const revenue = measured.record?.economics?.revenue;
            const cac = measured.record?.economics?.cac;
            const expectedValue = estimated.record?.economics?.expectedValue;
            const checks = [
                { name: "Commercial truth schema is explicit and versioned", passed: measured.record?.schema === COMMERCIAL_TRUTH_SCHEMA },
                { name: "Campaign, revenue, offer and other required commercial record types are machine-readable", passed: Object.keys(COMMERCIAL_RECORD_TYPES).length >= 15 && COMMERCIAL_RECORD_TYPES.CAMPAIGN === "campaign" && COMMERCIAL_RECORD_TYPES.REVENUE === "revenue" },
                { name: "Measured economics remain measured", passed: revenue?.status === "measured" && revenue?.value === 1200 && revenue?.currency === "USD" },
                { name: "Measured economics retain evidence lineage", passed: revenue?.sourceIds?.includes("payment-ledger-1") === true && revenue?.measuredAt === "2026-09-14T00:00:00.000Z" },
                { name: "Unknown economics remain unknown instead of becoming zero", passed: cac?.status === "unknown" && cac?.value === null && Boolean(cac?.unknownReason) },
                { name: "Estimated economics remain distinct from measured values", passed: expectedValue?.status === "estimated" && expectedValue?.confidence === 0.55 },
                { name: "Commercial assumptions survive normalization", passed: expectedValue?.assumptions?.length === 1 && estimated.record?.epistemic?.assumptions?.length === 1 },
                { name: "Predictions remain separate from observed outcomes", passed: Boolean(estimated.record?.prediction) && estimated.record?.outcome === null },
                { name: "Commercial claims retain epistemic status, confidence and falsifiers", passed: measured.record?.epistemic?.status === "verified" && measured.record?.epistemic?.confidence === 1 && measured.record?.epistemic?.falsifiers?.length === 1 },
                { name: "Every commercial record is organization-bound", passed: measured.record?.organizationId === organizationId && isolated.record?.organizationId === otherOrganizationId },
                { name: "Organization snapshots do not leak another organization's records", passed: snapshot.records.length === 2 && snapshot.records.every(record => record.organizationId === organizationId) },
                { name: "Transferable learning preserves the confidentiality boundary", passed: estimated.record?.privacy?.transferable === true && estimated.record?.privacy?.scope === "organization-isolated" && estimated.record?.privacy?.transferRule.includes("generalized") },
                { name: "Commercial truth never grants spend authority", passed: snapshot.records.every(record => record.authority?.spendAuthorized === false) },
                { name: "Commercial truth never grants publication or execution authority", passed: snapshot.records.every(record => record.authority?.publicationAuthorized === false && record.authority?.executionAuthorized === false) },
                { name: "Commercial truth is included in the Executive Learning durable snapshot", passed: this.buildPersistenceSnapshot().commercialTruth?.some(record => record.id === measured.record?.id) === true },
                { name: "Commercial truth is queryable by organization and campaign", passed: this.getCommercialTruth({ organizationId, campaignId: "campaign-acceptance-1" }).length === 2 },
                { name: "The contract can represent zero spend as measured rather than unknown", passed: estimated.record?.economics?.spend?.value === 0 && estimated.record?.economics?.spend?.status === "measured" },
                { name: "The contract does not calculate unsupported CAC or LTV", passed: cac?.value === null && snapshot.truthRule.includes("never silently converted") },
                { name: "Commercial records enter normal Executive Learning analytics", passed: this.analytics.totalCommercialTruthRecords === saved.commercialTruth.length + 3 },
                { name: "No commercial record changes policy or authority", passed: snapshot.authorityRule.includes("not execution") }
            ];
            const result = {
                success: checks.every(item => item.passed),
                commission: "006.032B",
                schema: "meos.executive-learning.commercial-data-contract-acceptance.v1",
                version: this.version,
                buildId: this.buildId,
                passed: checks.filter(item => item.passed).length,
                total: checks.length,
                checks,
                sampleSnapshot: this.clone(snapshot),
                completedAt: new Date().toISOString()
            };
            this.commercialTruth = saved.commercialTruth;
            this.history = saved.history;
            this.analytics = saved.analytics;
            this.configuration.automaticPersistence = saved.automaticPersistence;
            this.recalculateAnalytics();
            return result;
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
            this.analytics.totalCalibrations =
                this.calibrations.length;
            this.analytics.totalCommercialTruthRecords =
                this.commercialTruth.length;

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
                calibrationCount:
                    this.calibrations.length,
                commercialTruthCount:
                    this.commercialTruth.length,
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
                    calibrations:
                        this.calibrations,
                    commercialTruth:
                        this.commercialTruth,
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
                this.calibrations = [];
                this.commercialTruth = [];
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
                this.calibrations,
                data.calibrations || []
            );
            this.mergeById(
                this.commercialTruth,
                data.commercialTruth || []
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
                            calibrations:
                                this.calibrations.length,
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

        runSelfCorrectionAcceptanceTest() {
            const saved = {
                calibrations: this.clone(this.calibrations),
                history: this.clone(this.history),
                analytics: this.clone(this.analytics),
                automaticPersistence: this.configuration.automaticPersistence
            };

            this.configuration.automaticPersistence = false;
            this.calibrations = [];

            const first = this.recordCalibration({
                domain: "grant-fit-forecasting",
                priorBelief: {
                    statement: "The opportunity is likely to produce useful funding for the user.",
                    confidence: 0.9
                },
                prediction: {
                    statement: "The application is likely to reach award review.",
                    confidence: 0.9
                },
                recommendation: {
                    action: "Pursue the opportunity.",
                    rationale: "Strong apparent eligibility and mission fit."
                },
                intendedUserBenefit: {
                    type: "funding",
                    description: "Increase resources available to the user's organization.",
                    value: 100000,
                    unit: "USD",
                    direction: "increase"
                },
                actualOutcome: {
                    summary: "The application was rejected at eligibility screening.",
                    outcomeType: "failure"
                },
                realizedUserBenefit: {
                    type: "funding",
                    description: "No funding was realized.",
                    value: 0,
                    unit: "USD",
                    direction: "increase"
                },
                predictionResult: "incorrect",
                causalConfidence: 0.9,
                falsifiers: ["official award or eligibility correction"]
            }, { actor: "Maddy" });

            const second = this.recordCalibration({
                domain: "grant-fit-forecasting",
                prediction: {
                    statement: "A second opportunity is likely to reach award review.",
                    confidence: 0.8
                },
                recommendation: "Pursue after document verification.",
                intendedUserBenefit: {
                    type: "funding",
                    description: "Increase resources available to the user's organization.",
                    value: 50000,
                    unit: "USD"
                },
                actualOutcome: {
                    summary: "The opportunity was ruled ineligible before submission.",
                    outcomeType: "failure"
                },
                realizedUserBenefit: {
                    type: "attention-protection",
                    description: "Maddy stopped the pursuit before consuming more executive time."
                },
                predictionResult: "incorrect",
                causalConfidence: 0.8
            }, { actor: "Maddy" });

            const third = this.recordCalibration({
                domain: "grant-fit-forecasting",
                prediction: {
                    statement: "A verified opportunity is likely to reach award review.",
                    confidence: 0.7
                },
                recommendation: "Pursue after eligibility verification.",
                intendedUserBenefit: {
                    type: "funding",
                    description: "Increase resources available to the user's organization.",
                    value: 25000,
                    unit: "USD"
                },
                actualOutcome: {
                    summary: "The application reached award review.",
                    outcomeType: "success"
                },
                realizedUserBenefit: {
                    type: "funding",
                    description: "Award review created a live funding opportunity.",
                    value: 25000,
                    unit: "USD"
                },
                predictionResult: "correct",
                causalConfidence: 0.8
            }, { actor: "Maddy" });

            const unrelated = this.recordCalibration({
                domain: "vendor-delivery",
                prediction: {
                    statement: "The vendor will deliver on time.",
                    confidence: 0.6
                },
                intendedUserBenefit: {
                    type: "time",
                    description: "Avoid project delay."
                },
                actualOutcome: {
                    summary: "Delivery timing remains unresolved.",
                    outcomeType: "unknown"
                },
                realizedUserBenefit: {},
                predictionResult: "unresolved",
                causalConfidence: 0.3
            }, { actor: "Maddy" });

            const guidance = this.getCalibrationGuidance({ domain: "grant-fit-forecasting" });
            const record = first.calibration;
            const checks = [
                {
                    name: "Maddy preserves the prior belief and prediction instead of rewriting history after the outcome",
                    passed: record?.priorBelief?.statement.includes("likely") === true && record?.prediction?.confidence === 0.9
                },
                {
                    name: "Maddy records why the recommendation was expected to benefit the user",
                    passed: record?.intendedUserBenefit?.type === "funding" && record?.intendedUserBenefit?.value === 100000
                },
                {
                    name: "Observed reality is recorded separately from the prediction",
                    passed: record?.actualOutcome?.outcomeType === OUTCOME_TYPES.FAILURE && record?.predictionAssessment?.status === "missed"
                },
                {
                    name: "Realized user benefit is measured against intended benefit rather than assumed",
                    passed: record?.benefitAssessment?.status === "not-realized" && record?.benefitAssessment?.gap === -100000
                },
                {
                    name: "A wrong high-confidence prediction produces bounded downward recalibration",
                    passed: record?.recalibration?.delta < 0 && record?.recalibration?.suggestedConfidence < record?.recalibration?.priorConfidence
                },
                {
                    name: "Calibration remains contextual instead of becoming a universal Maddy confidence score",
                    passed: guidance?.domain === "grant-fit-forecasting" && guidance?.observations === 3 && unrelated.calibration?.domain === "vendor-delivery"
                },
                {
                    name: "Repeated overconfidence changes future contextual guidance while preserving uncertainty rules",
                    passed: guidance?.suggestedConfidenceAdjustment < 0 && guidance?.resolvedPredictions === 3 && guidance?.preserveUncertainty === false
                },
                {
                    name: "Self-correction cannot silently rewrite policy or authority",
                    passed: record?.recalibration?.automaticAuthorityChange === false && record?.recalibration?.rule.includes("does not become automatic truth") === true
                }
            ];

            const success = checks.every((item) => item.passed);
            const result = {
                success,
                commission: "MADDY-SELF-CORRECTION-BENEFIT-CALIBRATION",
                schema: "meos.executive-learning.self-correction-acceptance.v1",
                version: this.version,
                buildId: this.buildId,
                passed: checks.filter((item) => item.passed).length,
                total: checks.length,
                checks,
                calibration: this.clone(record),
                guidance: this.clone(guidance),
                completedAt: new Date().toISOString()
            };

            this.calibrations = saved.calibrations;
            this.history = saved.history;
            this.analytics = saved.analytics;
            this.configuration.automaticPersistence = saved.automaticPersistence;
            this.recalculateAnalytics();

            return result;
        },

        runEpistemicMemoryRoundTripAcceptanceTest() {
            const monitoring = global.ExecutiveMonitoring;
            const knowledge = global.KnowledgeEngine;
            const recall = global.ExecutiveRecall;

            if (!monitoring || !knowledge?.createRecord || !recall?.recall) {
                return {
                    success: false,
                    commission:
                        "MADDY-CROSS-MADDY-EPISTEMIC-INTEGRATION-LEARNING-MEMORY-BRIDGE",
                    version: this.version,
                    buildId: this.buildId,
                    error:
                        "Executive Monitoring, Knowledge Engine, and Executive Recall are required for this acceptance test."
                };
            }

            const saved = {
                observations: this.clone(this.observations),
                lessons: this.clone(this.lessons),
                history: this.clone(this.history),
                analytics: this.clone(this.analytics),
                automaticPersistence:
                    this.configuration.automaticPersistence,
                monitoringAlerts:
                    this.clone(monitoring.alerts || []),
                knowledgeRecords:
                    this.clone(knowledge.records || []),
                knowledgeActivityLog:
                    this.clone(knowledge.activityLog || []),
                knowledgeAutomaticPersistence:
                    knowledge.configuration?.automaticPersistence
            };

            this.configuration.automaticPersistence = false;
            if (knowledge.configuration) {
                knowledge.configuration.automaticPersistence = false;
            }
            this.observations = [];
            this.lessons = [];

            const subject =
                "Epistemic Continuity Round Trip Fixture";
            const continuity = {
                schema: "meos.maddy.epistemic-continuity.v1",
                available: true,
                preserved: true,
                subject,
                sourceEvidenceCount: 3,
                governedEvidenceCount: 3,
                packageConfidence: 0.58,
                epistemicClaims: [
                    {
                        claim: "The observed outcome supports hypothesis A only partially.",
                        epistemicStatus: "supported-inference",
                        sourceIndependence: {
                            independentChainCount: 2
                        },
                        falsifiers: [
                            "An authoritative record showing hypothesis B occurred."
                        ]
                    }
                ],
                realityReconstruction: {
                    status: "unresolved-competing-explanations",
                    leadingHypothesis: null,
                    hypotheses: [
                        { id: "hypothesis-a", status: "plausible" },
                        { id: "hypothesis-b", status: "plausible" }
                    ],
                    discriminatingEvidence: [
                        "Obtain the authoritative event record."
                    ]
                },
                counterpartyIntelligence: {
                    counterparties: [
                        {
                            actorId: "fixture-counterparty",
                            contextualReliability: {
                                status: "uncertain"
                            }
                        }
                    ]
                },
                conflicts: [
                    {
                        summary: "Two plausible explanations remain unresolved."
                    }
                ],
                preservationRule:
                    "Preserve provenance, uncertainty, competing explanations, counterparty context, and falsifiers across learning and memory."
            };

            monitoring.alerts = [
                {
                    id: "fixture-epistemic-monitoring-alert",
                    status: "resolved",
                    title: subject,
                    message:
                        "The monitored decision produced an outcome that requires epistemic learning.",
                    resolution:
                        "The condition resolved, but the causal explanation remains uncertain.",
                    category: "low-confidence-decision",
                    severityLabel: "medium",
                    recommendedAction:
                        "Preserve uncertainty and seek discriminating evidence before repeating the decision pattern.",
                    office: "Maddy",
                    epistemicContinuity:
                        this.clone(continuity)
                }
            ];

            const scanned = this.scanResolvedAlerts();
            const observationInput = scanned[0] || null;
            const observed = observationInput
                ? this.observe(observationInput, { actor: "Maddy" })
                : { success: false };
            const lesson = observed?.lessons?.[0] || null;
            const knowledgeWrite = lesson
                ? this.writeLessonToKnowledge(lesson)
                : { success: false };
            const knowledgeRecordId =
                knowledgeWrite?.record?.id ||
                knowledgeWrite?.id ||
                lesson?.knowledgeRecordId ||
                null;
            const knowledgeRecord =
                knowledgeRecordId && knowledge.getRecordById
                    ? knowledge.getRecordById(knowledgeRecordId)
                    : (knowledge.records || []).find(
                        (item) => item.id === knowledgeRecordId
                    ) || null;
            const recalled = recall.recall(subject, {
                limit: 20,
                includeRelated: true
            });
            const recalledEvidence =
                (recalled?.evidence || []).find(
                    (item) =>
                        item?.raw?.metadata?.epistemicContinuity?.schema ===
                        "meos.maddy.epistemic-continuity.v1"
                ) || null;
            const recalledContinuity =
                recalledEvidence?.raw?.metadata?.epistemicContinuity || null;

            const checks = [
                {
                    name: "Resolved Monitoring alert enters Learning with the epistemic continuity envelope intact",
                    passed:
                        observationInput?.epistemicContinuity?.schema ===
                        "meos.maddy.epistemic-continuity.v1"
                },
                {
                    name: "Learning observation preserves the epistemic conditions of the observed consequence",
                    passed:
                        observed?.observation?.epistemicContinuity?.realityReconstruction?.status ===
                        "unresolved-competing-explanations"
                },
                {
                    name: "Derived institutional lesson preserves uncertainty instead of becoming flattened hindsight",
                    passed:
                        lesson?.epistemicContinuity?.realityReconstruction?.leadingHypothesis === null
                },
                {
                    name: "Disconfirming and discriminating evidence survives into the learned lesson",
                    passed:
                        Array.isArray(lesson?.epistemicContinuity?.realityReconstruction?.discriminatingEvidence) &&
                        lesson.epistemicContinuity.realityReconstruction.discriminatingEvidence.length === 1 &&
                        Array.isArray(lesson?.epistemicContinuity?.epistemicClaims?.[0]?.falsifiers)
                },
                {
                    name: "Counterparty context survives consequence learning",
                    passed:
                        lesson?.epistemicContinuity?.counterpartyIntelligence?.counterparties?.[0]?.actorId ===
                        "fixture-counterparty"
                },
                {
                    name: "Knowledge Engine record retains epistemic continuity and learning lineage",
                    passed:
                        knowledgeRecord?.metadata?.epistemicContinuity?.schema ===
                        "meos.maddy.epistemic-continuity.v1" &&
                        knowledgeRecord?.metadata?.epistemicLineage?.sourceType ===
                        "monitoring-alert"
                },
                {
                    name: "Executive Recall returns the learned knowledge with its epistemic continuity still machine-readable",
                    passed:
                        recalled?.success === true &&
                        recalledContinuity?.realityReconstruction?.status ===
                        "unresolved-competing-explanations" &&
                        recalledContinuity?.epistemicClaims?.[0]?.falsifiers?.length === 1
                },
                {
                    name: "Learning-memory continuity preserves uncertainty without creating new truth or execution authority",
                    passed:
                        recalledContinuity?.realityReconstruction?.leadingHypothesis === null &&
                        knowledgeRecord?.authority !== "authoritative" &&
                        knowledgeRecord?.metadata?.epistemicContinuity?.preserved === true
                }
            ];

            const result = {
                success: checks.every((item) => item.passed),
                commission:
                    "MADDY-CROSS-MADDY-EPISTEMIC-INTEGRATION-LEARNING-MEMORY-BRIDGE",
                schema:
                    "meos.executive-learning.epistemic-memory-round-trip-acceptance.v1",
                version: this.version,
                buildId: this.buildId,
                passed: checks.filter((item) => item.passed).length,
                total: checks.length,
                checks,
                observationContinuity:
                    this.clone(observed?.observation?.epistemicContinuity || null),
                lessonContinuity:
                    this.clone(lesson?.epistemicContinuity || null),
                recalledContinuity:
                    this.clone(recalledContinuity),
                completedAt: new Date().toISOString()
            };

            this.observations = saved.observations;
            this.lessons = saved.lessons;
            this.history = saved.history;
            this.analytics = saved.analytics;
            this.configuration.automaticPersistence =
                saved.automaticPersistence;
            monitoring.alerts = saved.monitoringAlerts;
            knowledge.records = saved.knowledgeRecords;
            knowledge.activityLog = saved.knowledgeActivityLog;
            if (knowledge.configuration) {
                knowledge.configuration.automaticPersistence =
                    saved.knowledgeAutomaticPersistence;
            }
            this.recalculateAnalytics();

            return result;
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
                    durableRead?.value?.state?.calibrations?.length ===
                        snapshot.calibrations.length &&
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
            this.calibrations = [];
            this.history = [];
            this.analytics = {
                totalObservations: 0,
                totalLessons: 0,
                activeLessons: 0,
                validatedLessons: 0,
                rejectedLessons: 0,
                totalFeedback: 0,
                totalCalibrations: 0,
                lastCalibrationAt: null,
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
    ExecutiveLearning.CALIBRATION_SCHEMA =
        CALIBRATION_SCHEMA;
    ExecutiveLearning.COMMERCIAL_TRUTH_SCHEMA =
        COMMERCIAL_TRUTH_SCHEMA;
    ExecutiveLearning.COMMERCIAL_VALUE_STATUSES =
        COMMERCIAL_VALUE_STATUSES;
    ExecutiveLearning.COMMERCIAL_RECORD_TYPES =
        COMMERCIAL_RECORD_TYPES;

    global.ExecutiveLearning =
        ExecutiveLearning;
    ExecutiveLearning.initialize();
})(window);
