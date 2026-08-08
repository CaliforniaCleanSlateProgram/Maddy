/*
 * MEOS Executive Search Engine
 * Version: 1.0.1
 *
 * Mission:
 * Search across MEOS knowledge, memory, ingested documents, classifications,
 * missions, timelines, and executive context through one universal API.
 *
 * Brick boundary:
 * This engine retrieves, ranks, groups, and cites existing knowledge.
 * It does not create official policy, classify documents, or modify source data.
 */

(function initializeExecutiveSearch(global) {
    "use strict";

    const STORAGE_KEY = "meos.executive-search.v1";
    const SCHEMA = "meos.executive-search.package.v1";

    const SOURCE_TYPES = {
        KNOWLEDGE: "knowledge",
        MEMORY: "memory",
        DOCUMENT: "document",
        CLASSIFICATION: "classification",
        MISSION: "mission",
        TIMELINE: "timeline",
        ENTITY: "entity",
        SYSTEM: "system"
    };

    const ExecutiveSearch = {
        name: "MEOS Executive Search Engine",
        version: "1.0.1",
        status: "initializing",
        operatingMode: "cross-engine-retrieval",

        configuration: {
            persistenceEnabled: true,
            automaticPersistence: true,
            localStorageKey: STORAGE_KEY,
            organizationNeutralCore: true,
            maximumResults: 100,
            defaultLimit: 20,
            maximumHistory: 250,
            minimumScore: 0.08,
            includeRelatedResults: true,
            includeCitations: true,
            includeSnippets: true,
            snippetLength: 260,
            sourceWeights: {
                knowledge: 1.0,
                memory: 1.0,
                document: 0.9,
                classification: 0.75,
                mission: 0.85,
                timeline: 0.8,
                entity: 0.9,
                system: 0.55
            }
        },

        searchHistory: [],
        savedSearches: [],
        analytics: {
            totalSearches: 0,
            zeroResultSearches: 0,
            sourceResultCounts: {},
            queryCounts: {},
            lastSearchAt: null
        },
        eventListeners: {},
        initializedAt: null,

        persistenceRuntime: {
            suspended: false,
            reason: null,
            suspendedAt: null,
            warningEmitted: false
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

            console.info(
                `[MEOS] ${this.name} v${this.version} ${this.status}.`
            );

            this.emit("search:online", this.getStatus());
            return this.getStatus();
        },

        search(query, options = {}) {
            const normalizedQuery = this.normalizeText(query);
            const terms = this.tokenize(query);

            if (!normalizedQuery) {
                return {
                    success: false,
                    error: "A search query is required.",
                    query: ""
                };
            }

            const startedAt = performance?.now?.() ?? Date.now();
            const sourceFilter = this.normalizeSourceFilter(
                options.sources || options.sourceTypes
            );
            const filters = options.filters || {};
            const limit = this.normalizeLimit(options.limit);

            const collected = [
                ...this.searchKnowledge(normalizedQuery, terms, filters),
                ...this.searchMemory(normalizedQuery, terms, filters),
                ...this.searchDocuments(normalizedQuery, terms, filters),
                ...this.searchClassifications(normalizedQuery, terms, filters),
                ...this.searchMissions(normalizedQuery, terms, filters),
                ...this.searchTimelines(normalizedQuery, terms, filters),
                ...this.searchEntities(normalizedQuery, terms, filters)
            ]
                .filter((result) => {
                    if (
                        sourceFilter.length > 0 &&
                        !sourceFilter.includes(result.sourceType)
                    ) {
                        return false;
                    }

                    return result.score >= this.configuration.minimumScore;
                });

            const deduplicated = this.deduplicateResults(collected);
            const ranked = this.rankResults(
                deduplicated,
                normalizedQuery,
                terms,
                options
            );

            const related = this.configuration.includeRelatedResults &&
                options.includeRelated !== false
                ? this.discoverRelatedResults(
                    ranked.slice(0, Math.min(limit, 10)),
                    options
                )
                : [];

            const merged = this.deduplicateResults([
                ...ranked,
                ...related
            ]).slice(0, limit);

            const completedAt = performance?.now?.() ?? Date.now();
            const durationMs = Math.max(
                0,
                Number((completedAt - startedAt).toFixed(2))
            );

            const response = {
                success: true,
                query: String(query),
                normalizedQuery,
                terms,
                totalResults: merged.length,
                resultCountBeforeLimit: ranked.length,
                durationMs,
                results: merged.map((result, index) => ({
                    rank: index + 1,
                    ...result
                })),
                facets: this.buildFacets(merged),
                citations: this.configuration.includeCitations
                    ? this.collectCitations(merged)
                    : [],
                searchedSources: this.getConnectedSources(),
                generatedAt: new Date().toISOString()
            };

            this.recordSearch(response, options);
            this.emit("search:completed", this.clone(response));

            return response;
        },

        executiveQuery(query, options = {}) {
            const searchResult = this.search(query, {
                ...options,
                includeRelated: options.includeRelated !== false,
                limit: options.limit || 25
            });

            if (!searchResult.success) {
                return searchResult;
            }

            const grouped = this.groupResultsForExecutive(
                searchResult.results
            );

            return {
                ...searchResult,
                executiveSummary: this.buildExecutiveSummary(
                    query,
                    searchResult.results,
                    grouped
                ),
                groupedResults: grouped,
                recommendedNextActions: this.buildNextActions(
                    searchResult.results
                )
            };
        },

        searchKnowledge(normalizedQuery, terms, filters = {}) {
            const engine = global.KnowledgeEngine;

            if (!engine) {
                return [];
            }

            let records = [];

            if (typeof engine.search === "function") {
                try {
                    const response = engine.search(normalizedQuery, {
                        limit: this.configuration.maximumResults
                    });

                    records = Array.isArray(response)
                        ? response
                        : response?.results || [];
                } catch (error) {
                    console.warn(
                        "[MEOS Executive Search] Knowledge search failed:",
                        error
                    );
                }
            }

            if (records.length === 0) {
                records = [
                    ...(engine.records || []),
                    ...(engine.state?.records || [])
                ];
            }

            return records
                .filter((record) =>
                    this.matchesFilters(record, filters)
                )
                .map((record) => {
                    const searchable = this.buildSearchableText([
                        record.title,
                        record.summary,
                        record.content,
                        record.recordType,
                        ...(record.tags || []),
                        ...(record.topics || [])
                    ]);

                    const score = this.scoreText(
                        searchable,
                        normalizedQuery,
                        terms
                    );

                    return this.createResult({
                        sourceType: SOURCE_TYPES.KNOWLEDGE,
                        sourceId: record.id,
                        title: record.title || "Knowledge Record",
                        snippet: this.makeSnippet(
                            record.summary || record.content,
                            terms
                        ),
                        score,
                        authority: record.authority,
                        sensitivity: record.sensitivity,
                        office: record.metadata?.office ||
                            record.office ||
                            null,
                        date: record.updatedAt || record.createdAt,
                        tags: record.tags || [],
                        topics: record.topics || [],
                        citation: this.createCitation({
                            sourceType: SOURCE_TYPES.KNOWLEDGE,
                            sourceId: record.id,
                            title: record.title,
                            locator: record.metadata?.sourceLocation ||
                                record.metadata?.url ||
                                ""
                        }),
                        raw: record
                    });
                });
        },

        searchMemory(normalizedQuery, terms, filters = {}) {
            const memory = global.KnowledgeMemory;

            if (!memory) {
                return [];
            }

            let passages = [];

            if (typeof memory.query === "function") {
                try {
                    const response = memory.query(normalizedQuery, {
                        limit: this.configuration.maximumResults
                    });

                    passages = Array.isArray(response)
                        ? response
                        : response?.results ||
                          response?.passages ||
                          [];
                } catch (error) {
                    console.warn(
                        "[MEOS Executive Search] Knowledge Memory query failed:",
                        error
                    );
                }
            }

            if (passages.length === 0) {
                passages = [
                    ...(memory.passages || []),
                    ...(memory.state?.passages || [])
                ];
            }

            return passages
                .filter((passage) =>
                    this.matchesFilters(passage, filters)
                )
                .map((passage) => {
                    const searchable = this.buildSearchableText([
                        passage.title,
                        passage.text,
                        passage.content,
                        passage.sectionTitle,
                        ...(passage.tags || [])
                    ]);

                    const score = this.scoreText(
                        searchable,
                        normalizedQuery,
                        terms
                    );

                    return this.createResult({
                        sourceType: SOURCE_TYPES.MEMORY,
                        sourceId: passage.id,
                        title:
                            passage.title ||
                            passage.documentTitle ||
                            passage.sectionTitle ||
                            "Knowledge Memory Passage",
                        snippet: this.makeSnippet(
                            passage.text || passage.content,
                            terms
                        ),
                        score,
                        authority: passage.authority,
                        sensitivity: passage.sensitivity,
                        office: passage.office || null,
                        date: passage.updatedAt ||
                            passage.createdAt ||
                            passage.ingestedAt,
                        tags: passage.tags || [],
                        topics: passage.topics || [],
                        citation: this.createCitation({
                            sourceType: SOURCE_TYPES.MEMORY,
                            sourceId: passage.id,
                            title:
                                passage.documentTitle ||
                                passage.title,
                            locator:
                                passage.citationLabel ||
                                passage.pageNumber ||
                                passage.sectionTitle ||
                                ""
                        }),
                        raw: passage
                    });
                });
        },

        searchDocuments(normalizedQuery, terms, filters = {}) {
            const ingestion = global.DocumentIngestion;

            if (!ingestion) {
                return [];
            }

            let documents = [];

            if (typeof ingestion.searchCatalog === "function") {
                try {
                    documents = ingestion.searchCatalog(
                        normalizedQuery,
                        filters
                    );
                } catch (error) {
                    console.warn(
                        "[MEOS Executive Search] Document catalog search failed:",
                        error
                    );
                }
            }

            if (documents.length === 0) {
                documents = ingestion.catalog || [];
            }

            return documents
                .filter((document) =>
                    this.matchesFilters(document, filters)
                )
                .map((document) => {
                    const searchable = this.buildSearchableText([
                        document.name,
                        document.relativePath,
                        document.parentPath,
                        document.sourceLocation,
                        document.classification?.type,
                        document.classification?.label,
                        ...(document.tags || [])
                    ]);

                    const score = this.scoreText(
                        searchable,
                        normalizedQuery,
                        terms
                    );

                    return this.createResult({
                        sourceType: SOURCE_TYPES.DOCUMENT,
                        sourceId: document.id,
                        title: document.name || "Document",
                        snippet: this.makeSnippet(
                            [
                                document.relativePath,
                                document.sourceLocation,
                                document.classification?.label
                            ]
                                .filter(Boolean)
                                .join(" — "),
                            terms
                        ),
                        score,
                        authority: document.authority,
                        sensitivity: document.sensitivity,
                        office: document.recommendedOffice || null,
                        date: document.modifiedAt ||
                            document.updatedAt ||
                            document.ingestedAt,
                        tags: document.tags || [],
                        topics: [
                            document.classification?.type
                        ].filter(Boolean),
                        citation: this.createCitation({
                            sourceType: SOURCE_TYPES.DOCUMENT,
                            sourceId: document.id,
                            title: document.name,
                            locator:
                                document.webViewUrl ||
                                document.relativePath ||
                                document.sourceLocation ||
                                ""
                        }),
                        raw: document
                    });
                });
        },

        searchClassifications(normalizedQuery, terms, filters = {}) {
            const classifier = global.DocumentClassifier;

            if (!classifier) {
                return [];
            }

            let classifications = [];

            if (typeof classifier.searchResults === "function") {
                try {
                    classifications = classifier.searchResults(
                        normalizedQuery,
                        filters
                    );
                } catch (error) {
                    console.warn(
                        "[MEOS Executive Search] Classification search failed:",
                        error
                    );
                }
            }

            if (classifications.length === 0) {
                classifications = classifier.results || [];
            }

            return classifications
                .filter((result) =>
                    this.matchesFilters(result, filters)
                )
                .map((result) => {
                    const searchable = this.buildSearchableText([
                        result.documentName,
                        result.type,
                        result.label,
                        result.recommendedOffice,
                        ...(result.evidence || [])
                    ]);

                    const score = this.scoreText(
                        searchable,
                        normalizedQuery,
                        terms
                    );

                    return this.createResult({
                        sourceType: SOURCE_TYPES.CLASSIFICATION,
                        sourceId: result.id,
                        title:
                            `${result.label || result.type}: ` +
                            `${result.documentName || "Document"}`,
                        snippet: this.makeSnippet(
                            (result.evidence || []).join(" "),
                            terms
                        ),
                        score,
                        authority: result.recommendedAuthority,
                        sensitivity: result.recommendedSensitivity,
                        office: result.recommendedOffice || null,
                        date: result.classifiedAt,
                        tags: [
                            result.type,
                            result.status
                        ].filter(Boolean),
                        topics: [
                            "document-classification",
                            result.type
                        ].filter(Boolean),
                        citation: this.createCitation({
                            sourceType: SOURCE_TYPES.CLASSIFICATION,
                            sourceId: result.id,
                            title: result.documentName,
                            locator: result.matchedRuleId || ""
                        }),
                        raw: result
                    });
                });
        },

        searchMissions(normalizedQuery, terms, filters = {}) {
            const engine = global.MEOSMissionEngine;

            if (!engine) {
                return [];
            }

            const missions = [
                ...(engine.missions || []),
                ...(engine.state?.missions || []),
                ...(engine.getAllMissions?.() || [])
            ];

            return this.deduplicateById(missions)
                .filter((mission) =>
                    this.matchesFilters(mission, filters)
                )
                .map((mission) => {
                    const searchable = this.buildSearchableText([
                        mission.title,
                        mission.description,
                        mission.objective,
                        mission.status,
                        mission.office,
                        ...(mission.tags || [])
                    ]);

                    const score = this.scoreText(
                        searchable,
                        normalizedQuery,
                        terms
                    );

                    return this.createResult({
                        sourceType: SOURCE_TYPES.MISSION,
                        sourceId: mission.id,
                        title: mission.title || "Mission",
                        snippet: this.makeSnippet(
                            mission.description || mission.objective,
                            terms
                        ),
                        score,
                        authority: mission.authority || "working",
                        sensitivity: mission.sensitivity || "internal",
                        office: mission.office ||
                            mission.assignedOffice ||
                            null,
                        date: mission.updatedAt || mission.createdAt,
                        tags: mission.tags || [],
                        topics: [
                            mission.status,
                            "mission"
                        ].filter(Boolean),
                        citation: this.createCitation({
                            sourceType: SOURCE_TYPES.MISSION,
                            sourceId: mission.id,
                            title: mission.title,
                            locator: mission.status || ""
                        }),
                        raw: mission
                    });
                });
        },

        searchTimelines(normalizedQuery, terms, filters = {}) {
            const engine = global.KnowledgeEngine;

            if (!engine) {
                return [];
            }

            const events = [
                ...(engine.timeline || []),
                ...(engine.timelines || []),
                ...(engine.state?.timeline || [])
            ];

            return events
                .filter((event) =>
                    this.matchesFilters(event, filters)
                )
                .map((event) => {
                    const searchable = this.buildSearchableText([
                        event.title,
                        event.description,
                        event.eventType,
                        event.date,
                        ...(event.tags || [])
                    ]);

                    const score = this.scoreText(
                        searchable,
                        normalizedQuery,
                        terms
                    );

                    return this.createResult({
                        sourceType: SOURCE_TYPES.TIMELINE,
                        sourceId: event.id,
                        title: event.title || "Timeline Event",
                        snippet: this.makeSnippet(
                            event.description,
                            terms
                        ),
                        score,
                        authority: event.authority,
                        sensitivity: event.sensitivity,
                        office: event.office || null,
                        date: event.date ||
                            event.occurredAt ||
                            event.createdAt,
                        tags: event.tags || [],
                        topics: [
                            event.eventType,
                            "timeline"
                        ].filter(Boolean),
                        citation: this.createCitation({
                            sourceType: SOURCE_TYPES.TIMELINE,
                            sourceId: event.id,
                            title: event.title,
                            locator: event.date || ""
                        }),
                        raw: event
                    });
                });
        },

        searchEntities(normalizedQuery, terms, filters = {}) {
            const engine = global.KnowledgeEngine;

            if (!engine) {
                return [];
            }

            const entities = [
                ...(engine.entities || []),
                ...(engine.state?.entities || [])
            ];

            return entities
                .filter((entity) =>
                    this.matchesFilters(entity, filters)
                )
                .map((entity) => {
                    const searchable = this.buildSearchableText([
                        entity.name,
                        entity.title,
                        entity.description,
                        entity.entityType,
                        ...(entity.aliases || []),
                        ...(entity.tags || [])
                    ]);

                    const score = this.scoreText(
                        searchable,
                        normalizedQuery,
                        terms
                    );

                    return this.createResult({
                        sourceType: SOURCE_TYPES.ENTITY,
                        sourceId: entity.id,
                        title: entity.name ||
                            entity.title ||
                            "Entity",
                        snippet: this.makeSnippet(
                            entity.description,
                            terms
                        ),
                        score,
                        authority: entity.authority,
                        sensitivity: entity.sensitivity,
                        office: entity.office || null,
                        date: entity.updatedAt || entity.createdAt,
                        tags: entity.tags || [],
                        topics: [
                            entity.entityType,
                            "entity"
                        ].filter(Boolean),
                        citation: this.createCitation({
                            sourceType: SOURCE_TYPES.ENTITY,
                            sourceId: entity.id,
                            title: entity.name || entity.title,
                            locator: entity.entityType || ""
                        }),
                        raw: entity
                    });
                });
        },

        discoverRelatedResults(seedResults, options = {}) {
            const related = [];

            seedResults.forEach((seed) => {
                const raw = seed.raw || {};
                const identifiers = this.uniqueStrings([
                    raw.logicalDocumentId,
                    raw.documentId,
                    raw.sourceDocumentId,
                    raw.entityId,
                    raw.projectId,
                    raw.missionId,
                    ...(raw.relatedIds || []),
                    ...(raw.relationships || [])
                        .map((relationship) =>
                            typeof relationship === "string"
                                ? relationship
                                : relationship?.targetId
                        )
                ]);

                identifiers.forEach((identifier) => {
                    related.push(
                        ...this.findByIdentifier(identifier, seed)
                    );
                });
            });

            return related.map((result) => ({
                ...result,
                score: Math.max(
                    this.configuration.minimumScore,
                    result.score * 0.82
                ),
                related: true
            }));
        },

        findByIdentifier(identifier, seed) {
            if (!identifier) {
                return [];
            }

            const normalized = this.normalizeText(identifier);
            const terms = this.tokenize(identifier);

            const sources = [
                ...this.searchKnowledge(normalized, terms),
                ...this.searchMemory(normalized, terms),
                ...this.searchDocuments(normalized, terms),
                ...this.searchClassifications(normalized, terms),
                ...this.searchMissions(normalized, terms),
                ...this.searchTimelines(normalized, terms),
                ...this.searchEntities(normalized, terms)
            ];

            return sources.filter(
                (result) =>
                    !(
                        result.sourceType === seed.sourceType &&
                        result.sourceId === seed.sourceId
                    )
            );
        },

        rankResults(results, normalizedQuery, terms, options = {}) {
            return results
                .map((result) => {
                    const sourceWeight =
                        this.configuration.sourceWeights[
                            result.sourceType
                        ] || 1;

                    const authorityBoost =
                        this.authorityWeight(result.authority);
                    const recencyBoost =
                        this.recencyWeight(result.date);
                    const exactTitleBoost =
                        this.normalizeText(result.title)
                            .includes(normalizedQuery)
                            ? 0.3
                            : 0;
                    const officeBoost =
                        options.office &&
                        result.office === options.office
                            ? 0.2
                            : 0;

                    const finalScore = Math.min(
                        1,
                        result.score *
                            sourceWeight +
                            authorityBoost +
                            recencyBoost +
                            exactTitleBoost +
                            officeBoost
                    );

                    return {
                        ...result,
                        score: Number(finalScore.toFixed(4)),
                        scoreExplanation: {
                            textMatch: result.score,
                            sourceWeight,
                            authorityBoost,
                            recencyBoost,
                            exactTitleBoost,
                            officeBoost
                        }
                    };
                })
                .sort((a, b) => {
                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }

                    return (
                        Date.parse(b.date || 0) -
                        Date.parse(a.date || 0)
                    );
                });
        },

        scoreText(searchable, normalizedQuery, terms) {
            if (!searchable) {
                return 0;
            }

            let score = 0;

            if (searchable.includes(normalizedQuery)) {
                score += 0.62;
            }

            const matchedTerms = terms.filter((term) =>
                searchable.includes(term)
            );

            if (terms.length > 0) {
                score +=
                    (matchedTerms.length / terms.length) * 0.34;
            }

            if (
                matchedTerms.length === terms.length &&
                terms.length > 1
            ) {
                score += 0.08;
            }

            return Number(Math.min(1, score).toFixed(4));
        },

        authorityWeight(authority) {
            const weights = {
                system: 0.08,
                official: 0.12,
                approved: 0.1,
                submitted: 0.07,
                working: 0.04,
                draft: 0,
                historical: -0.01,
                unreviewed: -0.02
            };

            return weights[
                String(authority || "").toLowerCase()
            ] || 0;
        },

        recencyWeight(value) {
            if (!value) {
                return 0;
            }

            const timestamp = Date.parse(value);

            if (!Number.isFinite(timestamp)) {
                return 0;
            }

            const ageDays =
                (Date.now() - timestamp) /
                (1000 * 60 * 60 * 24);

            if (ageDays <= 30) {
                return 0.08;
            }

            if (ageDays <= 180) {
                return 0.05;
            }

            if (ageDays <= 365) {
                return 0.02;
            }

            return 0;
        },

        createResult(input = {}) {
            return {
                id:
                    `${input.sourceType}-${input.sourceId}`,
                sourceType: input.sourceType,
                sourceId: input.sourceId,
                title: input.title || "Untitled",
                snippet: input.snippet || "",
                score: Number(input.score) || 0,
                authority: input.authority || "unreviewed",
                sensitivity: input.sensitivity || "internal",
                office: input.office || null,
                date: input.date || null,
                tags: this.uniqueStrings(input.tags),
                topics: this.uniqueStrings(input.topics),
                citation: input.citation || null,
                related: false,
                raw: input.raw || null
            };
        },

        createCitation(input = {}) {
            return {
                id: this.createId("search-citation"),
                sourceType: input.sourceType,
                sourceId: input.sourceId,
                title: input.title || "Untitled Source",
                locator: String(input.locator || ""),
                label: [
                    input.title || "Untitled Source",
                    input.locator || ""
                ]
                    .filter(Boolean)
                    .join(" — ")
            };
        },

        collectCitations(results) {
            const seen = new Set();

            return results
                .map((result) => result.citation)
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

        buildFacets(results) {
            const facets = {
                sourceTypes: {},
                offices: {},
                authorities: {},
                sensitivities: {},
                topics: {}
            };

            results.forEach((result) => {
                this.incrementFacet(
                    facets.sourceTypes,
                    result.sourceType
                );
                this.incrementFacet(
                    facets.offices,
                    result.office || "Unassigned"
                );
                this.incrementFacet(
                    facets.authorities,
                    result.authority || "unreviewed"
                );
                this.incrementFacet(
                    facets.sensitivities,
                    result.sensitivity || "internal"
                );

                result.topics.forEach((topic) =>
                    this.incrementFacet(
                        facets.topics,
                        topic
                    )
                );
            });

            return facets;
        },

        incrementFacet(bucket, key) {
            if (!key) {
                return;
            }

            bucket[key] = (bucket[key] || 0) + 1;
        },

        groupResultsForExecutive(results) {
            const groups = {};

            results.forEach((result) => {
                const office = result.office || "Unassigned";

                if (!groups[office]) {
                    groups[office] = [];
                }

                groups[office].push(result);
            });

            return groups;
        },

        buildExecutiveSummary(query, results, grouped) {
            const strongest = results.slice(0, 5);
            const sourceTypes = this.uniqueStrings(
                results.map((result) => result.sourceType)
            );
            const offices = Object.keys(grouped);

            if (results.length === 0) {
                return {
                    headline: `No results found for "${query}".`,
                    resultCount: 0,
                    strongestFindings: [],
                    sourceCoverage: [],
                    officeCoverage: []
                };
            }

            return {
                headline:
                    `${results.length} result` +
                    `${results.length === 1 ? "" : "s"} found for "${query}".`,
                resultCount: results.length,
                strongestFindings: strongest.map((result) => ({
                    title: result.title,
                    sourceType: result.sourceType,
                    office: result.office,
                    score: result.score,
                    citation: result.citation
                })),
                sourceCoverage: sourceTypes,
                officeCoverage: offices
            };
        },

        buildNextActions(results) {
            if (results.length === 0) {
                return [
                    "Broaden the search terms.",
                    "Confirm that the relevant documents have been ingested.",
                    "Check whether access restrictions are hiding the source."
                ];
            }

            const actions = [];

            if (
                results.some(
                    (result) =>
                        result.authority === "unreviewed" ||
                        result.authority === "draft"
                )
            ) {
                actions.push(
                    "Review unapproved or draft sources before relying on them for an official decision."
                );
            }

            if (
                results.some(
                    (result) =>
                        result.sensitivity === "restricted" ||
                        result.sensitivity === "highly-restricted"
                )
            ) {
                actions.push(
                    "Confirm access authority before sharing restricted results."
                );
            }

            if (
                results.some(
                    (result) =>
                        result.sourceType === SOURCE_TYPES.CLASSIFICATION
                )
            ) {
                actions.push(
                    "Open the underlying source document before taking action."
                );
            }

            if (actions.length === 0) {
                actions.push(
                    "Open the strongest result and review its citations."
                );
            }

            return actions;
        },

        saveSearch(name, query, options = {}) {
            if (!name || !query) {
                return {
                    success: false,
                    error: "Saved searches require a name and query."
                };
            }

            const saved = {
                id: this.createId("saved-search"),
                name: String(name).trim(),
                query: String(query).trim(),
                options: this.clone(options),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                runCount: 0,
                lastRunAt: null
            };

            this.savedSearches.push(saved);
            this.persistIfEnabled();

            return {
                success: true,
                savedSearch: this.clone(saved)
            };
        },

        runSavedSearch(savedSearchId) {
            const saved = this.savedSearches.find(
                (item) => item.id === savedSearchId
            );

            if (!saved) {
                return {
                    success: false,
                    error: "Saved search was not found."
                };
            }

            saved.runCount += 1;
            saved.lastRunAt = new Date().toISOString();
            saved.updatedAt = saved.lastRunAt;

            const response = this.executiveQuery(
                saved.query,
                saved.options
            );

            this.persistIfEnabled();
            return response;
        },

        recordSearch(response, options = {}) {
            const entry = {
                id: this.createId("search-history"),
                query: response.query,
                normalizedQuery: response.normalizedQuery,
                resultCount: response.totalResults,
                durationMs: response.durationMs,
                sources: response.searchedSources,
                office: options.office || null,
                searchedAt: new Date().toISOString()
            };

            this.searchHistory.unshift(entry);

            if (
                this.searchHistory.length >
                this.configuration.maximumHistory
            ) {
                this.searchHistory.length =
                    this.configuration.maximumHistory;
            }

            this.analytics.totalSearches += 1;
            this.analytics.lastSearchAt = entry.searchedAt;

            if (response.totalResults === 0) {
                this.analytics.zeroResultSearches += 1;
            }

            const queryKey = response.normalizedQuery;
            this.analytics.queryCounts[queryKey] =
                (this.analytics.queryCounts[queryKey] || 0) + 1;

            response.results.forEach((result) => {
                this.analytics.sourceResultCounts[
                    result.sourceType
                ] =
                    (
                        this.analytics.sourceResultCounts[
                            result.sourceType
                        ] || 0
                    ) + 1;
            });

            this.persistIfEnabled();
        },

        getConnectedSources() {
            return {
                knowledge:
                    Boolean(global.KnowledgeEngine),
                memory:
                    Boolean(global.KnowledgeMemory),
                document:
                    Boolean(global.DocumentIngestion),
                classification:
                    Boolean(global.DocumentClassifier),
                mission:
                    Boolean(global.MEOSMissionEngine),
                timeline:
                    Boolean(global.KnowledgeEngine),
                entity:
                    Boolean(global.KnowledgeEngine)
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
                connectedSourceCount: Object.values(
                    connected
                ).filter(Boolean).length,
                searchHistoryCount:
                    this.searchHistory.length,
                savedSearchCount:
                    this.savedSearches.length,
                analytics: this.clone(this.analytics),
                persistence: {
                    configured:
                        this.configuration.persistenceEnabled &&
                        this.configuration.automaticPersistence,
                    suspended: this.persistenceRuntime.suspended,
                    reason: this.persistenceRuntime.reason,
                    suspendedAt: this.persistenceRuntime.suspendedAt
                },
                initializedAt: this.initializedAt
            };
        },

        registerSystemKnowledge() {
            const engine = global.KnowledgeEngine;

            if (
                !engine ||
                typeof engine.createRecord !== "function"
            ) {
                return {
                    success: false,
                    connected: false
                };
            }

            const id =
                "knowledge-system-executive-search";
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
                title: "MEOS Executive Search Engine",
                summary:
                    "Universal cross-engine retrieval, ranking, citations, related-result discovery, and executive query summaries.",
                content:
                    "Executive Search retrieves from existing MEOS systems without changing source data or promoting documents into official knowledge.",
                tags: [
                    "meos-core",
                    "executive-search",
                    "system-component"
                ],
                topics: [
                    "search",
                    "retrieval",
                    "citations",
                    "executive-recall"
                ],
                authority: "system",
                confidence: 1,
                sensitivity: "internal",
                officeAccess: ["all"],
                metadata: {
                    componentVersion: this.version,
                    organizationNeutralCore: true,
                    brickBoundary:
                        "Retrieval and ranking only; no source modification."
                },
                createdBy: this.name
            });
        },

        exportSearch(options = {}) {
            return {
                success: true,
                data: {
                    schema: SCHEMA,
                    version: this.version,
                    exportedAt: new Date().toISOString(),
                    configuration:
                        options.includeConfiguration === false
                            ? {}
                            : this.configuration,
                    savedSearches: this.savedSearches,
                    searchHistory:
                        options.includeHistory === false
                            ? []
                            : this.searchHistory,
                    analytics: this.analytics
                }
            };
        },

        importSearch(payload, options = {}) {
            let data = payload;

            if (typeof payload === "string") {
                try {
                    data = JSON.parse(payload);
                } catch (error) {
                    return {
                        success: false,
                        error:
                            "The Executive Search import is not valid JSON."
                    };
                }
            }

            if (!data || data.schema !== SCHEMA) {
                return {
                    success: false,
                    error:
                        "The import is not a MEOS Executive Search package."
                };
            }

            if (options.replace === true) {
                this.searchHistory = [];
                this.savedSearches = [];
                this.analytics = {
                    totalSearches: 0,
                    zeroResultSearches: 0,
                    sourceResultCounts: {},
                    queryCounts: {},
                    lastSearchAt: null
                };
            }

            this.mergeById(
                this.savedSearches,
                data.savedSearches || []
            );
            this.mergeById(
                this.searchHistory,
                data.searchHistory || []
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
            if (this.persistenceRuntime.suspended) {
                return {
                    success: true,
                    persisted: false,
                    suspended: true,
                    reason: this.persistenceRuntime.reason
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
                (
                    error.name === "QuotaExceededError" ||
                    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
                    error.code === 22 ||
                    error.code === 1014 ||
                    /quota/i.test(String(error.message || ""))
                )
            );
        },

        suspendBrowserPersistence(error) {
            this.persistenceRuntime.suspended = true;
            this.persistenceRuntime.reason =
                "browser-storage-quota-exhausted";
            this.persistenceRuntime.suspendedAt =
                new Date().toISOString();

            if (!this.persistenceRuntime.warningEmitted) {
                this.persistenceRuntime.warningEmitted = true;
                console.warn(
                    "[MEOS Executive Search] Browser persistence suspended after storage quota exhaustion. Runtime search continues; repeated writes are suppressed until persistence is explicitly retried."
                );
            }

            this.emit("search:persistence-suspended", {
                reason: this.persistenceRuntime.reason,
                suspendedAt: this.persistenceRuntime.suspendedAt,
                error: error?.message || String(error || "")
            });

            return {
                success: true,
                persisted: false,
                suspended: true,
                degraded: true,
                reason: this.persistenceRuntime.reason
            };
        },

        retryPersistence() {
            this.persistenceRuntime.suspended = false;
            this.persistenceRuntime.reason = null;
            this.persistenceRuntime.suspendedAt = null;
            this.persistenceRuntime.warningEmitted = false;

            const result = this.persist();

            return {
                ...result,
                retried: true
            };
        },

        persist() {
            if (this.persistenceRuntime.suspended) {
                return {
                    success: true,
                    persisted: false,
                    suspended: true,
                    reason: this.persistenceRuntime.reason
                };
            }

            if (
                !this.configuration.persistenceEnabled
            ) {
                return {
                    success: false,
                    error:
                        "Executive Search persistence is disabled."
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
                        this.exportSearch({
                            includeHistory: true
                        }).data
                    )
                );

                return {
                    success: true,
                    persisted: true
                };
            } catch (error) {
                if (this.isStorageQuotaError(error)) {
                    return this.suspendBrowserPersistence(error);
                }

                console.error(
                    "[MEOS Executive Search] Persistence failed:",
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

            const stored = global.localStorage.getItem(
                this.configuration.localStorageKey
            );

            if (!stored) {
                return {
                    success: true,
                    restored: false
                };
            }

            try {
                const result = this.importSearch(
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
                    "[MEOS Executive Search] Stored state could not be restored:",
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
                        "Clearing Executive Search data requires { confirm: true }."
                };
            }

            this.searchHistory = [];
            this.savedSearches = [];
            this.analytics = {
                totalSearches: 0,
                zeroResultSearches: 0,
                sourceResultCounts: {},
                queryCounts: {},
                lastSearchAt: null
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

        matchesFilters(item, filters = {}) {
            if (!filters || Object.keys(filters).length === 0) {
                return true;
            }

            if (
                filters.authority &&
                item.authority !== filters.authority &&
                item.recommendedAuthority !== filters.authority
            ) {
                return false;
            }

            if (
                filters.sensitivity &&
                item.sensitivity !== filters.sensitivity &&
                item.recommendedSensitivity !== filters.sensitivity
            ) {
                return false;
            }

            if (
                filters.office &&
                item.office !== filters.office &&
                item.recommendedOffice !== filters.office &&
                item.assignedOffice !== filters.office
            ) {
                return false;
            }

            if (
                filters.status &&
                item.status !== filters.status
            ) {
                return false;
            }

            if (
                filters.after &&
                Date.parse(
                    item.updatedAt ||
                    item.createdAt ||
                    item.date ||
                    0
                ) < Date.parse(filters.after)
            ) {
                return false;
            }

            if (
                filters.before &&
                Date.parse(
                    item.updatedAt ||
                    item.createdAt ||
                    item.date ||
                    0
                ) > Date.parse(filters.before)
            ) {
                return false;
            }

            return true;
        },

        normalizeSourceFilter(values) {
            if (!values) {
                return [];
            }

            const list = Array.isArray(values)
                ? values
                : [values];

            return this.uniqueStrings(
                list.map((value) =>
                    String(value).toLowerCase()
                )
            );
        },

        normalizeLimit(value) {
            const limit = Number(value);

            if (!Number.isFinite(limit)) {
                return this.configuration.defaultLimit;
            }

            return Math.max(
                1,
                Math.min(
                    this.configuration.maximumResults,
                    Math.round(limit)
                )
            );
        },

        buildSearchableText(values) {
            return this.normalizeText(
                values
                    .flat(Infinity)
                    .filter(Boolean)
                    .join(" ")
            );
        },

        makeSnippet(value, terms = []) {
            if (!this.configuration.includeSnippets) {
                return "";
            }

            const text = String(value || "")
                .replace(/\s+/g, " ")
                .trim();

            if (!text) {
                return "";
            }

            const normalized = this.normalizeText(text);
            let start = 0;

            for (const term of terms) {
                const index = normalized.indexOf(term);

                if (index >= 0) {
                    start = Math.max(0, index - 70);
                    break;
                }
            }

            const length = this.configuration.snippetLength;
            const snippet = text.slice(start, start + length);

            return (
                `${start > 0 ? "…" : ""}` +
                `${snippet}` +
                `${start + length < text.length ? "…" : ""}`
            );
        },

        tokenize(value) {
            return this.uniqueStrings(
                this.normalizeText(value)
                    .split(" ")
                    .filter((term) => term.length >= 2)
            );
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

        deduplicateResults(results) {
            const map = new Map();

            results.forEach((result) => {
                if (!result) {
                    return;
                }

                const key =
                    `${result.sourceType}:${result.sourceId}`;

                const existing = map.get(key);

                if (!existing || result.score > existing.score) {
                    map.set(key, result);
                }
            });

            return Array.from(map.values());
        },

        mergeById(target, incoming) {
            incoming.forEach((item) => {
                if (!item?.id) {
                    return;
                }

                const existingIndex = target.findIndex(
                    (candidate) => candidate.id === item.id
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
                    (listener) => listener !== callback
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
                        `[MEOS Executive Search] Event listener failed for "${eventName}":`,
                        error
                    );
                }
            });
        }
    };

    ExecutiveSearch.SOURCE_TYPES = SOURCE_TYPES;

    global.ExecutiveSearch = ExecutiveSearch;
    ExecutiveSearch.initialize();
})(window);
