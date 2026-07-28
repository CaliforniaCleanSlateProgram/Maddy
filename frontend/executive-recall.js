/*
 * MEOS Executive Recall Engine
 * Version: 1.0.0
 *
 * Mission:
 * Reconstruct executive context from MEOS knowledge, memory, search results,
 * missions, decisions, timelines, and related organizational evidence.
 *
 * Brick boundary:
 * This engine recalls and organizes existing context. It does not invent facts,
 * silently approve policy, alter source records, or replace executive judgment.
 */

(function initializeExecutiveRecall(global) {
    "use strict";

    const STORAGE_KEY = "meos.executive-recall.v1";
    const SCHEMA = "meos.executive-recall.package.v1";

    const RECALL_MODES = {
        TOPIC: "topic",
        DECISION: "decision",
        PROJECT: "project",
        PERSON: "person",
        MISSION: "mission",
        DOCUMENT: "document",
        TIMELINE: "timeline",
        EXECUTIVE: "executive"
    };

    const ExecutiveRecall = {
        name: "MEOS Executive Recall Engine",
        version: "1.0.0",
        status: "initializing",
        operatingMode: "context-reconstruction",

        configuration: {
            persistenceEnabled: true,
            automaticPersistence: true,
            localStorageKey: STORAGE_KEY,
            organizationNeutralCore: true,
            defaultMode: RECALL_MODES.EXECUTIVE,
            defaultLimit: 30,
            maximumLimit: 100,
            maximumHistory: 200,
            minimumConfidence: 0.18,
            includeCitations: true,
            includeTimeline: true,
            includeRelatedContext: true,
            includeOpenLoops: true,
            includeConflicts: true,
            includeRecommendations: true,
            requireSourceSupport: true,
            recentContextDays: 365
        },

        recallHistory: [],
        savedRecalls: [],
        analytics: {
            totalRecalls: 0,
            zeroEvidenceRecalls: 0,
            modeCounts: {},
            lastRecallAt: null
        },
        eventListeners: {},
        initializedAt: null,

        initialize(options = {}) {
            this.configuration = {
                ...this.configuration,
                ...(options.configuration || options)
            };

            this.restore();
            this.initializedAt = new Date().toISOString();
            this.status = "online";

            this.registerSystemKnowledge();

            console.info(
                `[MEOS] ${this.name} v${this.version} ${this.status}.`
            );

            this.emit("recall:online", this.getStatus());
            return this.getStatus();
        },

        recall(subject, options = {}) {
            const normalizedSubject = this.normalizeText(subject);

            if (!normalizedSubject) {
                return {
                    success: false,
                    error: "A recall subject is required."
                };
            }

            const mode = this.normalizeMode(options.mode);
            const limit = this.normalizeLimit(options.limit);
            const startedAt = performance?.now?.() ?? Date.now();

            const searchResponse = this.runExecutiveSearch(
                subject,
                {
                    ...options,
                    limit,
                    includeRelated:
                        options.includeRelated !== false
                }
            );

            const searchResults = searchResponse.success
                ? searchResponse.results || []
                : [];

            const directContext = this.collectDirectContext(
                subject,
                mode,
                options
            );

            const evidence = this.mergeEvidence(
                searchResults,
                directContext
            )
                .filter((item) =>
                    item.confidence >=
                    this.configuration.minimumConfidence
                )
                .slice(0, limit);

            const timeline = this.configuration.includeTimeline &&
                options.includeTimeline !== false
                ? this.buildTimeline(evidence)
                : [];

            const decisions = this.extractDecisions(evidence);
            const openLoops = this.configuration.includeOpenLoops &&
                options.includeOpenLoops !== false
                ? this.extractOpenLoops(evidence)
                : [];
            const dependencies = this.extractDependencies(evidence);
            const conflicts = this.configuration.includeConflicts &&
                options.includeConflicts !== false
                ? this.detectConflicts(evidence)
                : [];
            const citations = this.configuration.includeCitations &&
                options.includeCitations !== false
                ? this.collectCitations(evidence)
                : [];

            const confidence = this.calculateRecallConfidence(
                evidence,
                citations,
                conflicts
            );

            const completedAt = performance?.now?.() ?? Date.now();

            const response = {
                success: true,
                subject: String(subject),
                normalizedSubject,
                mode,
                confidence,
                confidenceLabel: this.confidenceLabel(confidence),
                evidenceCount: evidence.length,
                summary: this.buildRecallSummary(
                    subject,
                    mode,
                    evidence,
                    decisions,
                    openLoops,
                    dependencies,
                    conflicts
                ),
                executiveBrief: this.buildExecutiveBrief(
                    subject,
                    evidence,
                    decisions,
                    openLoops,
                    dependencies,
                    conflicts,
                    citations
                ),
                evidence,
                decisions,
                timeline,
                openLoops,
                dependencies,
                conflicts,
                citations,
                recommendations:
                    this.configuration.includeRecommendations &&
                    options.includeRecommendations !== false
                        ? this.buildRecommendations({
                            subject,
                            mode,
                            evidence,
                            decisions,
                            openLoops,
                            dependencies,
                            conflicts,
                            confidence
                        })
                        : [],
                searchedSources:
                    searchResponse.searchedSources ||
                    this.getConnectedSources(),
                durationMs: Math.max(
                    0,
                    Number((completedAt - startedAt).toFixed(2))
                ),
                generatedAt: new Date().toISOString()
            };

            this.recordRecall(response);
            this.emit("recall:completed", this.clone(response));

            return response;
        },

        recallDecision(subject, options = {}) {
            return this.recall(subject, {
                ...options,
                mode: RECALL_MODES.DECISION
            });
        },

        recallProject(subject, options = {}) {
            return this.recall(subject, {
                ...options,
                mode: RECALL_MODES.PROJECT
            });
        },

        recallPerson(subject, options = {}) {
            return this.recall(subject, {
                ...options,
                mode: RECALL_MODES.PERSON
            });
        },

        recallMission(subject, options = {}) {
            return this.recall(subject, {
                ...options,
                mode: RECALL_MODES.MISSION
            });
        },

        recallDocument(subject, options = {}) {
            return this.recall(subject, {
                ...options,
                mode: RECALL_MODES.DOCUMENT
            });
        },

        runExecutiveSearch(subject, options = {}) {
            const search = global.ExecutiveSearch;

            if (
                !search ||
                typeof search.executiveQuery !== "function"
            ) {
                return {
                    success: false,
                    results: [],
                    searchedSources: this.getConnectedSources(),
                    error: "Executive Search Engine is unavailable."
                };
            }

            try {
                return search.executiveQuery(subject, {
                    limit:
                        options.limit ||
                        this.configuration.defaultLimit,
                    office: options.office || null,
                    filters: options.filters || {},
                    includeRelated:
                        options.includeRelated !== false
                });
            } catch (error) {
                console.warn(
                    "[MEOS Executive Recall] Executive Search failed:",
                    error
                );

                return {
                    success: false,
                    results: [],
                    searchedSources: this.getConnectedSources(),
                    error: error.message
                };
            }
        },

        collectDirectContext(subject, mode, options = {}) {
            return [
                ...this.collectKnowledgeRecall(subject, mode, options),
                ...this.collectMemoryRecall(subject, mode, options),
                ...this.collectMissionRecall(subject, mode, options),
                ...this.collectTimelineRecall(subject, mode, options),
                ...this.collectDocumentRecall(subject, mode, options)
            ];
        },

        collectKnowledgeRecall(subject, mode, options = {}) {
            const engine = global.KnowledgeEngine;

            if (!engine) {
                return [];
            }

            let records = [];

            if (typeof engine.recall === "function") {
                try {
                    const response = engine.recall(subject, {
                        limit:
                            options.limit ||
                            this.configuration.defaultLimit,
                        mode
                    });

                    records = Array.isArray(response)
                        ? response
                        : response?.results ||
                          response?.records ||
                          [];
                } catch (error) {
                    console.warn(
                        "[MEOS Executive Recall] Knowledge recall failed:",
                        error
                    );
                }
            }

            if (records.length === 0) {
                records = [
                    ...(engine.records || []),
                    ...(engine.state?.records || [])
                ].filter((record) =>
                    this.itemMatchesSubject(record, subject)
                );
            }

            return records.map((record) =>
                this.createEvidence({
                    sourceType: "knowledge",
                    sourceId: record.id,
                    title: record.title || "Knowledge Record",
                    summary:
                        record.summary ||
                        record.content ||
                        "",
                    content:
                        record.content ||
                        record.summary ||
                        "",
                    date:
                        record.updatedAt ||
                        record.createdAt ||
                        null,
                    authority:
                        record.authority ||
                        "unreviewed",
                    sensitivity:
                        record.sensitivity ||
                        "internal",
                    office:
                        record.office ||
                        record.metadata?.office ||
                        null,
                    topics: record.topics || [],
                    tags: record.tags || [],
                    confidence:
                        Number(record.confidence) ||
                        this.estimateItemConfidence(record),
                    citation: this.createCitation({
                        sourceType: "knowledge",
                        sourceId: record.id,
                        title: record.title,
                        locator:
                            record.metadata?.sourceLocation ||
                            record.metadata?.url ||
                            ""
                    }),
                    raw: record
                })
            );
        },

        collectMemoryRecall(subject, mode, options = {}) {
            const memory = global.KnowledgeMemory;

            if (!memory) {
                return [];
            }

            let response = null;

            if (
                typeof memory.executiveRecall === "function"
            ) {
                try {
                    response = memory.executiveRecall(subject, {
                        limit:
                            options.limit ||
                            this.configuration.defaultLimit,
                        mode
                    });
                } catch (error) {
                    console.warn(
                        "[MEOS Executive Recall] Knowledge Memory executive recall failed:",
                        error
                    );
                }
            }

            let items = [];

            if (Array.isArray(response)) {
                items = response;
            } else if (response) {
                items = [
                    ...(response.results || []),
                    ...(response.passages || []),
                    ...(response.context || [])
                ];
            }

            if (
                items.length === 0 &&
                typeof memory.query === "function"
            ) {
                try {
                    const queryResponse = memory.query(subject, {
                        limit:
                            options.limit ||
                            this.configuration.defaultLimit
                    });

                    items = Array.isArray(queryResponse)
                        ? queryResponse
                        : queryResponse?.results ||
                          queryResponse?.passages ||
                          [];
                } catch (error) {
                    console.warn(
                        "[MEOS Executive Recall] Knowledge Memory query failed:",
                        error
                    );
                }
            }

            return items.map((item) =>
                this.createEvidence({
                    sourceType: "memory",
                    sourceId: item.id,
                    title:
                        item.title ||
                        item.documentTitle ||
                        item.sectionTitle ||
                        "Memory Passage",
                    summary:
                        item.summary ||
                        item.text ||
                        item.content ||
                        "",
                    content:
                        item.text ||
                        item.content ||
                        item.summary ||
                        "",
                    date:
                        item.updatedAt ||
                        item.createdAt ||
                        item.ingestedAt ||
                        null,
                    authority:
                        item.authority ||
                        "unreviewed",
                    sensitivity:
                        item.sensitivity ||
                        "internal",
                    office:
                        item.office ||
                        null,
                    topics: item.topics || [],
                    tags: item.tags || [],
                    confidence:
                        Number(item.confidence) ||
                        this.estimateItemConfidence(item),
                    citation: this.createCitation({
                        sourceType: "memory",
                        sourceId: item.id,
                        title:
                            item.documentTitle ||
                            item.title,
                        locator:
                            item.citationLabel ||
                            item.pageNumber ||
                            item.sectionTitle ||
                            ""
                    }),
                    raw: item
                })
            );
        },

        collectMissionRecall(subject, mode, options = {}) {
            const engine = global.MEOSMissionEngine;

            if (!engine) {
                return [];
            }

            const missions = this.deduplicateById([
                ...(engine.missions || []),
                ...(engine.state?.missions || []),
                ...(engine.getAllMissions?.() || [])
            ]).filter((mission) =>
                this.itemMatchesSubject(mission, subject)
            );

            return missions.map((mission) =>
                this.createEvidence({
                    sourceType: "mission",
                    sourceId: mission.id,
                    title: mission.title || "Mission",
                    summary:
                        mission.description ||
                        mission.objective ||
                        "",
                    content:
                        mission.description ||
                        mission.objective ||
                        "",
                    date:
                        mission.updatedAt ||
                        mission.createdAt ||
                        null,
                    authority:
                        mission.authority ||
                        "working",
                    sensitivity:
                        mission.sensitivity ||
                        "internal",
                    office:
                        mission.office ||
                        mission.assignedOffice ||
                        null,
                    topics: [
                        mission.status,
                        mission.priority,
                        "mission"
                    ].filter(Boolean),
                    tags: mission.tags || [],
                    confidence: 0.82,
                    citation: this.createCitation({
                        sourceType: "mission",
                        sourceId: mission.id,
                        title: mission.title,
                        locator:
                            mission.status ||
                            ""
                    }),
                    raw: mission
                })
            );
        },

        collectTimelineRecall(subject, mode, options = {}) {
            const engine = global.KnowledgeEngine;

            if (!engine) {
                return [];
            }

            const events = [
                ...(engine.timeline || []),
                ...(engine.timelines || []),
                ...(engine.state?.timeline || [])
            ].filter((event) =>
                this.itemMatchesSubject(event, subject)
            );

            return events.map((event) =>
                this.createEvidence({
                    sourceType: "timeline",
                    sourceId: event.id,
                    title:
                        event.title ||
                        event.eventType ||
                        "Timeline Event",
                    summary:
                        event.description ||
                        "",
                    content:
                        event.description ||
                        "",
                    date:
                        event.date ||
                        event.occurredAt ||
                        event.createdAt ||
                        null,
                    authority:
                        event.authority ||
                        "working",
                    sensitivity:
                        event.sensitivity ||
                        "internal",
                    office:
                        event.office ||
                        null,
                    topics: [
                        event.eventType,
                        "timeline"
                    ].filter(Boolean),
                    tags: event.tags || [],
                    confidence: 0.76,
                    citation: this.createCitation({
                        sourceType: "timeline",
                        sourceId: event.id,
                        title: event.title,
                        locator:
                            event.date ||
                            event.occurredAt ||
                            ""
                    }),
                    raw: event
                })
            );
        },

        collectDocumentRecall(subject, mode, options = {}) {
            const ingestion = global.DocumentIngestion;

            if (!ingestion) {
                return [];
            }

            const documents =
                typeof ingestion.searchCatalog === "function"
                    ? ingestion.searchCatalog(
                        subject,
                        options.filters || {}
                    )
                    : (ingestion.catalog || []).filter(
                        (document) =>
                            this.itemMatchesSubject(
                                document,
                                subject
                            )
                    );

            return documents.map((document) =>
                this.createEvidence({
                    sourceType: "document",
                    sourceId: document.id,
                    title:
                        document.name ||
                        "Document",
                    summary: [
                        document.classification?.label,
                        document.relativePath,
                        document.sourceLocation
                    ]
                        .filter(Boolean)
                        .join(" — "),
                    content:
                        document.metadata?.extractedText ||
                        "",
                    date:
                        document.modifiedAt ||
                        document.updatedAt ||
                        document.ingestedAt ||
                        null,
                    authority:
                        document.authority ||
                        "unreviewed",
                    sensitivity:
                        document.sensitivity ||
                        "internal",
                    office:
                        document.recommendedOffice ||
                        null,
                    topics: [
                        document.classification?.type,
                        document.classification?.label
                    ].filter(Boolean),
                    tags: document.tags || [],
                    confidence:
                        document.classification?.confidence ||
                        0.68,
                    citation: this.createCitation({
                        sourceType: "document",
                        sourceId: document.id,
                        title: document.name,
                        locator:
                            document.webViewUrl ||
                            document.relativePath ||
                            document.sourceLocation ||
                            ""
                    }),
                    raw: document
                })
            );
        },

        mergeEvidence(searchResults, directContext) {
            const merged = [];

            searchResults.forEach((result) => {
                merged.push(
                    this.createEvidence({
                        sourceType: result.sourceType,
                        sourceId: result.sourceId,
                        title: result.title,
                        summary: result.snippet || "",
                        content:
                            result.raw?.content ||
                            result.raw?.text ||
                            result.snippet ||
                            "",
                        date: result.date,
                        authority: result.authority,
                        sensitivity: result.sensitivity,
                        office: result.office,
                        topics: result.topics || [],
                        tags: result.tags || [],
                        confidence:
                            Number(result.score) || 0.5,
                        citation: result.citation,
                        raw: result.raw || result
                    })
                );
            });

            merged.push(...directContext);

            const map = new Map();

            merged.forEach((item) => {
                const key =
                    `${item.sourceType}:${item.sourceId}`;

                const existing = map.get(key);

                if (!existing) {
                    map.set(key, item);
                    return;
                }

                map.set(key, {
                    ...existing,
                    ...item,
                    confidence: Math.max(
                        existing.confidence,
                        item.confidence
                    ),
                    topics: this.uniqueStrings([
                        ...existing.topics,
                        ...item.topics
                    ]),
                    tags: this.uniqueStrings([
                        ...existing.tags,
                        ...item.tags
                    ])
                });
            });

            return Array.from(map.values())
                .sort((a, b) => {
                    if (b.confidence !== a.confidence) {
                        return b.confidence - a.confidence;
                    }

                    return (
                        Date.parse(b.date || 0) -
                        Date.parse(a.date || 0)
                    );
                });
        },

        createEvidence(input = {}) {
            return {
                id:
                    `${input.sourceType}-${input.sourceId}`,
                sourceType:
                    input.sourceType ||
                    "unknown",
                sourceId:
                    input.sourceId ||
                    this.createId("evidence"),
                title:
                    input.title ||
                    "Untitled Evidence",
                summary:
                    String(input.summary || ""),
                content:
                    String(input.content || ""),
                date:
                    input.date ||
                    null,
                authority:
                    input.authority ||
                    "unreviewed",
                sensitivity:
                    input.sensitivity ||
                    "internal",
                office:
                    input.office ||
                    null,
                topics:
                    this.uniqueStrings(input.topics),
                tags:
                    this.uniqueStrings(input.tags),
                confidence: Number(
                    Math.min(
                        1,
                        Math.max(
                            0,
                            Number(input.confidence) || 0
                        )
                    ).toFixed(3)
                ),
                citation:
                    input.citation ||
                    null,
                raw:
                    input.raw ||
                    null
            };
        },

        extractDecisions(evidence) {
            const decisions = [];

            evidence.forEach((item) => {
                const raw = item.raw || {};
                const searchable = this.normalizeText(
                    [
                        item.title,
                        item.summary,
                        item.content,
                        raw.decision,
                        raw.outcome,
                        raw.resolution,
                        raw.status,
                        ...(item.topics || []),
                        ...(item.tags || [])
                    ].join(" ")
                );

                const decisionLike =
                    searchable.includes("decision") ||
                    searchable.includes("approved") ||
                    searchable.includes("resolved") ||
                    searchable.includes("motion carried") ||
                    searchable.includes("selected") ||
                    searchable.includes("adopted") ||
                    searchable.includes("rejected") ||
                    raw.recordType === "decision" ||
                    raw.eventType === "decision";

                if (!decisionLike) {
                    return;
                }

                decisions.push({
                    id: this.createId("recalled-decision"),
                    title: item.title,
                    decision:
                        raw.decision ||
                        raw.outcome ||
                        raw.resolution ||
                        item.summary,
                    date: item.date,
                    authority: item.authority,
                    office: item.office,
                    confidence: item.confidence,
                    citation: item.citation,
                    sourceType: item.sourceType,
                    sourceId: item.sourceId
                });
            });

            return decisions
                .sort((a, b) =>
                    Date.parse(b.date || 0) -
                    Date.parse(a.date || 0)
                )
                .slice(0, 25);
        },

        extractOpenLoops(evidence) {
            const openLoops = [];

            evidence.forEach((item) => {
                const raw = item.raw || {};
                const status = this.normalizeText(
                    raw.status ||
                    raw.queueStatus ||
                    ""
                );
                const searchable = this.normalizeText(
                    [
                        item.summary,
                        item.content,
                        raw.nextSteps,
                        raw.followUp,
                        raw.actionItems,
                        raw.pendingReason,
                        status
                    ].join(" ")
                );

                const isOpen =
                    [
                        "pending",
                        "open",
                        "active",
                        "awaiting approval",
                        "awaiting",
                        "in progress",
                        "queued",
                        "processing",
                        "unreviewed",
                        "suggested",
                        "uncertain"
                    ].some((term) =>
                        searchable.includes(term)
                    );

                if (!isOpen) {
                    return;
                }

                openLoops.push({
                    id: this.createId("open-loop"),
                    title: item.title,
                    status:
                        raw.status ||
                        raw.queueStatus ||
                        "open",
                    nextStep:
                        raw.nextSteps ||
                        raw.followUp ||
                        raw.actionItems ||
                        item.summary,
                    office: item.office,
                    date: item.date,
                    confidence: item.confidence,
                    citation: item.citation,
                    sourceType: item.sourceType,
                    sourceId: item.sourceId
                });
            });

            return openLoops.slice(0, 25);
        },

        extractDependencies(evidence) {
            const dependencies = [];

            evidence.forEach((item) => {
                const raw = item.raw || {};
                const candidates = [
                    ...(raw.dependencies || []),
                    ...(raw.dependsOn || []),
                    ...(raw.relatedIds || []),
                    ...(raw.relationships || [])
                        .map((relationship) =>
                            typeof relationship === "string"
                                ? relationship
                                : relationship?.targetId ||
                                  relationship?.label
                        )
                ].filter(Boolean);

                candidates.forEach((dependency) => {
                    dependencies.push({
                        id: this.createId("dependency"),
                        sourceTitle: item.title,
                        dependency:
                            typeof dependency === "string"
                                ? dependency
                                : JSON.stringify(dependency),
                        sourceType: item.sourceType,
                        sourceId: item.sourceId,
                        citation: item.citation
                    });
                });
            });

            return this.deduplicateObjects(
                dependencies,
                (item) =>
                    `${item.sourceId}:${item.dependency}`
            ).slice(0, 50);
        },

        detectConflicts(evidence) {
            const conflicts = [];
            const grouped = {};

            evidence.forEach((item) => {
                const topicKeys = item.topics.length > 0
                    ? item.topics
                    : [this.normalizeText(item.title)];

                topicKeys.forEach((topic) => {
                    const key = this.normalizeText(topic);

                    if (!key) {
                        return;
                    }

                    if (!grouped[key]) {
                        grouped[key] = [];
                    }

                    grouped[key].push(item);
                });
            });

            Object.entries(grouped).forEach(
                ([topic, items]) => {
                    if (items.length < 2) {
                        return;
                    }

                    const officialItems = items.filter(
                        (item) =>
                            [
                                "official",
                                "approved",
                                "submitted"
                            ].includes(item.authority)
                    );

                    const draftItems = items.filter(
                        (item) =>
                            [
                                "draft",
                                "working",
                                "unreviewed"
                            ].includes(item.authority)
                    );

                    if (
                        officialItems.length > 0 &&
                        draftItems.length > 0
                    ) {
                        conflicts.push({
                            id: this.createId("recall-conflict"),
                            topic,
                            type: "authority-mismatch",
                            description:
                                "Official and non-official sources address the same topic.",
                            officialSources:
                                officialItems.map((item) => ({
                                    title: item.title,
                                    sourceType: item.sourceType,
                                    sourceId: item.sourceId,
                                    citation: item.citation
                                })),
                            nonOfficialSources:
                                draftItems.map((item) => ({
                                    title: item.title,
                                    sourceType: item.sourceType,
                                    sourceId: item.sourceId,
                                    citation: item.citation
                                })),
                            requiresReview: true
                        });
                    }

                    const uniqueSummaries =
                        this.uniqueStrings(
                            items
                                .map((item) =>
                                    this.normalizeText(
                                        item.summary ||
                                        item.content
                                    )
                                )
                                .filter(Boolean)
                        );

                    if (
                        uniqueSummaries.length > 1 &&
                        officialItems.length > 1
                    ) {
                        conflicts.push({
                            id: this.createId("recall-conflict"),
                            topic,
                            type: "possible-content-conflict",
                            description:
                                "Multiple authoritative sources may contain different guidance.",
                            sources: items.map((item) => ({
                                title: item.title,
                                authority: item.authority,
                                sourceType: item.sourceType,
                                sourceId: item.sourceId,
                                citation: item.citation
                            })),
                            requiresReview: true
                        });
                    }
                }
            );

            return conflicts.slice(0, 25);
        },

        buildTimeline(evidence) {
            return evidence
                .filter((item) => item.date)
                .map((item) => ({
                    id: this.createId("recall-timeline"),
                    date: item.date,
                    title: item.title,
                    summary: item.summary,
                    sourceType: item.sourceType,
                    sourceId: item.sourceId,
                    authority: item.authority,
                    office: item.office,
                    citation: item.citation
                }))
                .sort((a, b) =>
                    Date.parse(a.date) -
                    Date.parse(b.date)
                );
        },

        collectCitations(evidence) {
            const seen = new Set();

            return evidence
                .map((item) => item.citation)
                .filter(Boolean)
                .filter((citation) => {
                    const key =
                        `${citation.sourceType}:${citation.sourceId}`;

                    if (seen.has(key)) {
                        return false;
                    }

                    seen.add(key);
                    return true;
                });
        },

        buildRecallSummary(
            subject,
            mode,
            evidence,
            decisions,
            openLoops,
            dependencies,
            conflicts
        ) {
            if (evidence.length === 0) {
                return {
                    headline:
                        `No supported institutional context was found for "${subject}".`,
                    mode,
                    evidenceCount: 0,
                    decisionCount: 0,
                    openLoopCount: 0,
                    dependencyCount: 0,
                    conflictCount: 0
                };
            }

            return {
                headline:
                    `${evidence.length} supported context item` +
                    `${evidence.length === 1 ? "" : "s"} recalled for "${subject}".`,
                mode,
                evidenceCount: evidence.length,
                decisionCount: decisions.length,
                openLoopCount: openLoops.length,
                dependencyCount: dependencies.length,
                conflictCount: conflicts.length,
                strongestSources: evidence
                    .slice(0, 5)
                    .map((item) => ({
                        title: item.title,
                        sourceType: item.sourceType,
                        confidence: item.confidence,
                        authority: item.authority
                    }))
            };
        },

        buildExecutiveBrief(
            subject,
            evidence,
            decisions,
            openLoops,
            dependencies,
            conflicts,
            citations
        ) {
            const officialEvidence = evidence.filter(
                (item) =>
                    [
                        "official",
                        "approved",
                        "system"
                    ].includes(item.authority)
            );

            const recentEvidence = evidence.filter(
                (item) => {
                    if (!item.date) {
                        return false;
                    }

                    const ageDays =
                        (Date.now() -
                            Date.parse(item.date)) /
                        (1000 * 60 * 60 * 24);

                    return (
                        Number.isFinite(ageDays) &&
                        ageDays <=
                            this.configuration.recentContextDays
                    );
                }
            );

            return {
                subject,
                institutionalPosition:
                    officialEvidence.length > 0
                        ? officialEvidence
                            .slice(0, 3)
                            .map((item) => ({
                                title: item.title,
                                summary: item.summary,
                                authority: item.authority,
                                citation: item.citation
                            }))
                        : [],
                priorDecisions: decisions.slice(0, 10),
                currentOpenLoops: openLoops.slice(0, 10),
                materialDependencies: dependencies.slice(0, 10),
                materialConflicts: conflicts.slice(0, 10),
                recentContext: recentEvidence
                    .slice(0, 10)
                    .map((item) => ({
                        title: item.title,
                        date: item.date,
                        summary: item.summary,
                        citation: item.citation
                    })),
                citationCount: citations.length
            };
        },

        buildRecommendations(context) {
            const recommendations = [];

            if (context.evidence.length === 0) {
                recommendations.push(
                    "Ingest or create authoritative source material for this subject before making an institutional decision."
                );
                return recommendations;
            }

            if (
                context.confidence < 0.55
            ) {
                recommendations.push(
                    "Treat this recall as incomplete and confirm the strongest source documents."
                );
            }

            if (
                context.conflicts.length > 0
            ) {
                recommendations.push(
                    "Resolve conflicting or differently authorized sources before relying on this context."
                );
            }

            if (
                context.openLoops.length > 0
            ) {
                recommendations.push(
                    "Review the open actions and assign owners, deadlines, and approval requirements."
                );
            }

            if (
                context.decisions.length === 0
            ) {
                recommendations.push(
                    "No clear prior decision was identified; record the next approved decision in institutional memory."
                );
            }

            if (
                context.dependencies.length > 0
            ) {
                recommendations.push(
                    "Review material dependencies before changing the current plan."
                );
            }

            if (
                recommendations.length === 0
            ) {
                recommendations.push(
                    "Review the cited evidence and proceed within existing authority."
                );
            }

            return recommendations;
        },

        calculateRecallConfidence(
            evidence,
            citations,
            conflicts
        ) {
            if (evidence.length === 0) {
                return 0;
            }

            const averageEvidenceConfidence =
                evidence.reduce(
                    (total, item) =>
                        total + item.confidence,
                    0
                ) / evidence.length;

            const authoritativeCount = evidence.filter(
                (item) =>
                    [
                        "system",
                        "official",
                        "approved"
                    ].includes(item.authority)
            ).length;

            const authorityCoverage =
                Math.min(
                    1,
                    authoritativeCount /
                    Math.max(1, evidence.length)
                );

            const citationCoverage =
                Math.min(
                    1,
                    citations.length /
                    Math.max(1, evidence.length)
                );

            const conflictPenalty =
                Math.min(0.3, conflicts.length * 0.05);

            const confidence =
                averageEvidenceConfidence * 0.6 +
                authorityCoverage * 0.2 +
                citationCoverage * 0.2 -
                conflictPenalty;

            return Number(
                Math.min(
                    0.99,
                    Math.max(0, confidence)
                ).toFixed(3)
            );
        },

        confidenceLabel(confidence) {
            if (confidence >= 0.85) {
                return "high";
            }

            if (confidence >= 0.65) {
                return "moderate";
            }

            if (confidence >= 0.4) {
                return "limited";
            }

            return "insufficient";
        },

        saveRecall(name, subject, options = {}) {
            if (!name || !subject) {
                return {
                    success: false,
                    error:
                        "Saved recalls require a name and subject."
                };
            }

            const saved = {
                id: this.createId("saved-recall"),
                name: String(name).trim(),
                subject: String(subject).trim(),
                options: this.clone(options),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                runCount: 0,
                lastRunAt: null
            };

            this.savedRecalls.push(saved);
            this.persistIfEnabled();

            return {
                success: true,
                savedRecall: this.clone(saved)
            };
        },

        runSavedRecall(savedRecallId) {
            const saved = this.savedRecalls.find(
                (item) => item.id === savedRecallId
            );

            if (!saved) {
                return {
                    success: false,
                    error: "Saved recall was not found."
                };
            }

            saved.runCount += 1;
            saved.lastRunAt = new Date().toISOString();
            saved.updatedAt = saved.lastRunAt;

            const response = this.recall(
                saved.subject,
                saved.options
            );

            this.persistIfEnabled();
            return response;
        },

        recordRecall(response) {
            const entry = {
                id: this.createId("recall-history"),
                subject: response.subject,
                normalizedSubject:
                    response.normalizedSubject,
                mode: response.mode,
                confidence: response.confidence,
                evidenceCount: response.evidenceCount,
                decisionCount: response.decisions.length,
                openLoopCount: response.openLoops.length,
                conflictCount: response.conflicts.length,
                durationMs: response.durationMs,
                recalledAt: new Date().toISOString()
            };

            this.recallHistory.unshift(entry);

            if (
                this.recallHistory.length >
                this.configuration.maximumHistory
            ) {
                this.recallHistory.length =
                    this.configuration.maximumHistory;
            }

            this.analytics.totalRecalls += 1;
            this.analytics.lastRecallAt =
                entry.recalledAt;
            this.analytics.modeCounts[
                response.mode
            ] =
                (
                    this.analytics.modeCounts[
                        response.mode
                    ] || 0
                ) + 1;

            if (response.evidenceCount === 0) {
                this.analytics.zeroEvidenceRecalls += 1;
            }

            this.persistIfEnabled();
        },

        registerSystemKnowledge() {
            const engine = global.KnowledgeEngine;

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
                "knowledge-system-executive-recall";
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
                title: "MEOS Executive Recall Engine",
                summary:
                    "Universal executive context reconstruction across knowledge, memory, search, missions, timelines, documents, decisions, dependencies, and open loops.",
                content:
                    "Executive Recall organizes existing evidence into a supported executive context package. It does not invent facts, approve policy, or alter source records.",
                tags: [
                    "meos-core",
                    "executive-recall",
                    "system-component"
                ],
                topics: [
                    "recall",
                    "institutional-memory",
                    "decisions",
                    "dependencies",
                    "executive-context"
                ],
                authority: "system",
                confidence: 1,
                sensitivity: "internal",
                officeAccess: ["all"],
                metadata: {
                    componentVersion: this.version,
                    organizationNeutralCore: true,
                    brickBoundary:
                        "Context reconstruction only; no source modification or silent decision-making."
                },
                createdBy: this.name
            });
        },

        getConnectedSources() {
            return {
                executiveSearch:
                    Boolean(global.ExecutiveSearch),
                knowledgeEngine:
                    Boolean(global.KnowledgeEngine),
                knowledgeMemory:
                    Boolean(global.KnowledgeMemory),
                documentIngestion:
                    Boolean(global.DocumentIngestion),
                documentClassifier:
                    Boolean(global.DocumentClassifier),
                missionEngine:
                    Boolean(global.MEOSMissionEngine)
            };
        },

        getStatus() {
            const connected = this.getConnectedSources();

            return {
                name: this.name,
                version: this.version,
                status: this.status,
                operatingMode: this.operatingMode,
                organizationNeutralCore:
                    this.configuration.organizationNeutralCore,
                connectedSources: connected,
                connectedSourceCount:
                    Object.values(connected)
                        .filter(Boolean).length,
                recallHistoryCount:
                    this.recallHistory.length,
                savedRecallCount:
                    this.savedRecalls.length,
                analytics:
                    this.clone(this.analytics),
                initializedAt:
                    this.initializedAt
            };
        },

        exportRecall(options = {}) {
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
                    savedRecalls:
                        this.savedRecalls,
                    recallHistory:
                        options.includeHistory === false
                            ? []
                            : this.recallHistory,
                    analytics:
                        this.analytics
                }
            };
        },

        importRecall(payload, options = {}) {
            let data = payload;

            if (typeof payload === "string") {
                try {
                    data = JSON.parse(payload);
                } catch (error) {
                    return {
                        success: false,
                        error:
                            "The Executive Recall import is not valid JSON."
                    };
                }
            }

            if (!data || data.schema !== SCHEMA) {
                return {
                    success: false,
                    error:
                        "The import is not a MEOS Executive Recall package."
                };
            }

            if (options.replace === true) {
                this.recallHistory = [];
                this.savedRecalls = [];
                this.analytics = {
                    totalRecalls: 0,
                    zeroEvidenceRecalls: 0,
                    modeCounts: {},
                    lastRecallAt: null
                };
            }

            this.mergeById(
                this.savedRecalls,
                data.savedRecalls || []
            );
            this.mergeById(
                this.recallHistory,
                data.recallHistory || []
            );

            if (data.analytics) {
                this.analytics = {
                    ...this.analytics,
                    ...data.analytics
                };
            }

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
                        "Executive Recall persistence is disabled."
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
                        this.exportRecall({
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
                    "[MEOS Executive Recall] Persistence failed:",
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
                const result = this.importRecall(
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
                    "[MEOS Executive Recall] Stored state could not be restored:",
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
                        "Clearing Executive Recall data requires { confirm: true }."
                };
            }

            this.recallHistory = [];
            this.savedRecalls = [];
            this.analytics = {
                totalRecalls: 0,
                zeroEvidenceRecalls: 0,
                modeCounts: {},
                lastRecallAt: null
            };

            if (global.localStorage) {
                global.localStorage.removeItem(
                    this.configuration.localStorageKey
                );
            }

            return {
                success: true,
                status: this.getStatus()
            };
        },

        normalizeMode(mode) {
            const value =
                String(
                    mode ||
                    this.configuration.defaultMode
                ).toLowerCase();

            return Object.values(RECALL_MODES).includes(value)
                ? value
                : this.configuration.defaultMode;
        },

        normalizeLimit(value) {
            const number = Number(value);

            if (!Number.isFinite(number)) {
                return this.configuration.defaultLimit;
            }

            return Math.max(
                1,
                Math.min(
                    this.configuration.maximumLimit,
                    Math.round(number)
                )
            );
        },

        itemMatchesSubject(item, subject) {
            const normalizedSubject =
                this.normalizeText(subject);
            const terms =
                normalizedSubject
                    .split(" ")
                    .filter((term) => term.length >= 2);

            const searchable =
                this.normalizeText(
                    [
                        item.title,
                        item.name,
                        item.summary,
                        item.content,
                        item.description,
                        item.objective,
                        item.relativePath,
                        item.sourceLocation,
                        item.status,
                        item.recordType,
                        item.eventType,
                        ...(item.tags || []),
                        ...(item.topics || []),
                        ...(item.aliases || [])
                    ].join(" ")
                );

            if (searchable.includes(normalizedSubject)) {
                return true;
            }

            return (
                terms.length > 0 &&
                terms.filter((term) =>
                    searchable.includes(term)
                ).length /
                    terms.length >=
                    0.6
            );
        },

        estimateItemConfidence(item) {
            if (
                [
                    "system",
                    "official",
                    "approved"
                ].includes(item.authority)
            ) {
                return 0.9;
            }

            if (
                item.authority === "submitted"
            ) {
                return 0.82;
            }

            if (
                item.authority === "working"
            ) {
                return 0.68;
            }

            if (
                item.authority === "draft"
            ) {
                return 0.5;
            }

            return 0.58;
        },

        createCitation(input = {}) {
            return {
                id: this.createId("recall-citation"),
                sourceType: input.sourceType,
                sourceId: input.sourceId,
                title:
                    input.title ||
                    "Untitled Source",
                locator:
                    String(input.locator || ""),
                label: [
                    input.title || "Untitled Source",
                    input.locator || ""
                ]
                    .filter(Boolean)
                    .join(" — ")
            };
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

        deduplicateById(items) {
            const seen = new Set();

            return items.filter((item) => {
                if (!item) {
                    return false;
                }

                const key =
                    item.id ||
                    JSON.stringify(item);

                if (seen.has(key)) {
                    return false;
                }

                seen.add(key);
                return true;
            });
        },

        deduplicateObjects(items, keyFn) {
            const map = new Map();

            items.forEach((item) => {
                const key = keyFn(item);

                if (!map.has(key)) {
                    map.set(key, item);
                }
            });

            return Array.from(map.values());
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
                        `[MEOS Executive Recall] Event listener failed for "${eventName}":`,
                        error
                    );
                }
            });
        }
    };

    ExecutiveRecall.RECALL_MODES = RECALL_MODES;

    global.ExecutiveRecall = ExecutiveRecall;
    ExecutiveRecall.initialize();
})(window);
