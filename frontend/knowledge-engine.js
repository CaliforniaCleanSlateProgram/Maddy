/*
 * MEOS Knowledge Engine
 * Version: 1.1.0
 *
 * Purpose:
 * Provide the universal institutional-memory layer for MEOS.
 *
 * Intelligence tells MEOS what happened.
 * Knowledge tells MEOS what the organization knows.
 */

(function initializeKnowledgeEngine(global) {
    "use strict";

    const STORAGE_KEY = "meos.knowledge-engine.v1";
    const EXECUTIVE_MEMORY_COLLECTION = "investigation-history";
    const EXECUTIVE_MEMORY_ENDPOINT = "/api/executive-memory";
    const EXECUTIVE_MEMORY_MANIFEST_ID = "knowledge-engine-manifest-v1";
    const EXECUTIVE_MEMORY_SHARD_TARGET_BYTES = 320000;

    const KnowledgeEngine = {
        name: "MEOS Knowledge Engine",
        version: "1.1.0",
        status: "online",
        operatingMode: "continuous",

        configuration: {
            persistenceEnabled: true,
            automaticPersistence: true,
            localStorageKey: STORAGE_KEY,
            authoritativeStorage: "executive-memory",
            executiveMemoryEndpoint: EXECUTIVE_MEMORY_ENDPOINT,
            executiveMemoryCollection: EXECUTIVE_MEMORY_COLLECTION,
            executiveMemoryManifestId: EXECUTIVE_MEMORY_MANIFEST_ID,
            executiveMemoryShardTargetBytes: EXECUTIVE_MEMORY_SHARD_TARGET_BYTES,
            localStorageRole: "legacy-migration-only",
            persistenceDebounceMs: 350,
            maximumSearchResults: 100,
            duplicateDetectionEnabled: true,
            organizationNeutralCore: true
        },

        records: [],
        entities: [],
        relationships: [],
        sources: [],
        timelines: [],
        collections: [],
        queries: [],
        activityLog: [],
        eventListeners: {},
        persistenceTimer: null,
        persistencePromise: null,
        restorePromise: null,
        lastPersistenceAt: null,
        lastPersistenceError: null,
        restoredFromExecutiveMemory: false,

        initialize() {
            this.restorePromise = this.restore().catch((error) => {
                this.lastPersistenceError = error?.message || String(error);
                console.error(
                    "[MEOS Knowledge Engine] Executive Memory restore failed:",
                    error
                );
                return {
                    success: false,
                    restored: false,
                    error: this.lastPersistenceError
                };
            });

            this.registerSystemSource({
                id: "source-meos-core",
                name: "MEOS Core",
                sourceType: "system",
                authority: "system",
                description: "Universal MEOS platform source."
            });

            this.connectIntelligenceEngine();
            this.connectOrganizationalProfile();

            this.logActivity("engine.initialized", {
                version: this.version,
                restoredRecordCount: this.records.length
            });

            console.info(`[MEOS] ${this.name} v${this.version} online.`);
            this.emit("engine:online", this.getStatus());

            return this.getStatus();
        },

        connectIntelligenceEngine() {
            if (!global.IntelligenceEngine) {
                console.warn(
                    "[MEOS Knowledge Engine] Intelligence Engine is not currently available."
                );
                return false;
            }

            if (typeof global.IntelligenceEngine.on === "function") {
                global.IntelligenceEngine.on(
                    "intelligence:received",
                    (intelligence) => this.captureIntelligence(intelligence)
                );

                global.IntelligenceEngine.on(
                    "document:received",
                    (document) => this.registerDocument(document)
                );

                global.IntelligenceEngine.on(
                    "briefing:prepared",
                    (briefing) => this.captureExecutiveBriefing(briefing)
                );
            }

            console.info(
                "[MEOS Knowledge Engine] Intelligence Engine connected."
            );

            return true;
        },

        connectOrganizationalProfile() {
            if (!global.OrganizationalProfile) {
                console.warn(
                    "[MEOS Knowledge Engine] Organizational Profile is not currently available."
                );
                return false;
            }

            this.registerSystemSource({
                id: "source-organizational-profile",
                name: "Organizational Profile",
                sourceType: "organization-package",
                authority: "authoritative",
                description:
                    "Customer-specific organizational configuration and digital DNA."
            });

            this.captureOrganizationalProfile(global.OrganizationalProfile);

            console.info(
                "[MEOS Knowledge Engine] Organizational Profile connected."
            );

            return true;
        },

        createRecord(input = {}) {
            const normalized = this.normalizeRecordInput(input);

            if (!normalized.title) {
                return {
                    success: false,
                    error: "Knowledge records require a title."
                };
            }

            if (
                this.configuration.duplicateDetectionEnabled &&
                !normalized.allowDuplicate
            ) {
                const duplicate = this.findDuplicateRecord(normalized);

                if (duplicate) {
                    return {
                        success: true,
                        duplicate: true,
                        record: duplicate
                    };
                }
            }

            const timestamp = new Date().toISOString();

            const record = {
                id: normalized.id || this.createId("knowledge"),
                recordType: normalized.recordType,
                title: normalized.title,
                summary: normalized.summary,
                content: normalized.content,
                facts: normalized.facts,
                tags: normalized.tags,
                topics: normalized.topics,
                entityIds: [],
                relationshipIds: [],
                sourceIds: normalized.sourceIds,
                relatedRecordIds: normalized.relatedRecordIds,
                officeAccess: normalized.officeAccess,
                sensitivity: normalized.sensitivity,
                authority: normalized.authority,
                confidence: normalized.confidence,
                status: normalized.status,
                effectiveDate: normalized.effectiveDate,
                expirationDate: normalized.expirationDate,
                createdBy: normalized.createdBy,
                createdAt: timestamp,
                updatedAt: timestamp,
                revision: 1,
                history: [
                    {
                        revision: 1,
                        action: "created",
                        timestamp,
                        actor: normalized.createdBy
                    }
                ],
                metadata: normalized.metadata
            };

            this.records.push(record);

            normalized.entities.forEach((entityInput) => {
                const entityResult = this.upsertEntity(entityInput);

                if (entityResult.success) {
                    this.linkRecordToEntity(record.id, entityResult.entity.id);
                }
            });

            normalized.relationships.forEach((relationshipInput) => {
                this.createRelationship({
                    ...relationshipInput,
                    sourceRecordId:
                        relationshipInput.sourceRecordId || record.id
                });
            });

            if (normalized.timelineEvent) {
                this.addTimelineEvent({
                    ...normalized.timelineEvent,
                    recordIds: [
                        ...(normalized.timelineEvent.recordIds || []),
                        record.id
                    ]
                });
            }

            this.logActivity("record.created", {
                recordId: record.id,
                recordType: record.recordType,
                title: record.title
            });

            this.persistIfEnabled();
            this.emit("record:created", record);

            return {
                success: true,
                duplicate: false,
                record
            };
        },

        updateRecord(recordId, changes = {}, actor = "MEOS") {
            const record = this.getRecordById(recordId);

            if (!record) {
                return {
                    success: false,
                    error: "Knowledge record not found."
                };
            }

            const protectedFields = new Set([
                "id",
                "createdAt",
                "history",
                "revision"
            ]);

            Object.entries(changes).forEach(([key, value]) => {
                if (!protectedFields.has(key) && value !== undefined) {
                    record[key] = value;
                }
            });

            record.revision += 1;
            record.updatedAt = new Date().toISOString();
            record.history.push({
                revision: record.revision,
                action: "updated",
                timestamp: record.updatedAt,
                actor,
                changedFields: Object.keys(changes).filter(
                    (key) => !protectedFields.has(key)
                )
            });

            this.logActivity("record.updated", {
                recordId,
                revision: record.revision
            });

            this.persistIfEnabled();
            this.emit("record:updated", record);

            return {
                success: true,
                record
            };
        },

        archiveRecord(recordId, reason = "", actor = "MEOS") {
            return this.updateRecord(
                recordId,
                {
                    status: "archived",
                    archiveReason: reason
                },
                actor
            );
        },

        normalizeRecordInput(input) {
            return {
                id: input.id || null,
                recordType: input.recordType || "general",
                title: String(input.title || "").trim(),
                summary: String(input.summary || "").trim(),
                content: input.content ?? "",
                facts: Array.isArray(input.facts)
                    ? input.facts.map((fact) => this.normalizeFact(fact))
                    : [],
                tags: this.uniqueStrings(input.tags),
                topics: this.uniqueStrings(input.topics),
                entities: Array.isArray(input.entities) ? input.entities : [],
                relationships: Array.isArray(input.relationships)
                    ? input.relationships
                    : [],
                sourceIds: this.uniqueStrings(input.sourceIds),
                relatedRecordIds: this.uniqueStrings(input.relatedRecordIds),
                officeAccess:
                    Array.isArray(input.officeAccess) &&
                    input.officeAccess.length > 0
                        ? this.uniqueStrings(input.officeAccess)
                        : ["all"],
                sensitivity: input.sensitivity || "internal",
                authority: input.authority || "informational",
                confidence: this.normalizeConfidence(input.confidence),
                status: input.status || "active",
                effectiveDate: input.effectiveDate || null,
                expirationDate: input.expirationDate || null,
                createdBy: input.createdBy || "MEOS",
                metadata:
                    input.metadata && typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {},
                allowDuplicate: input.allowDuplicate === true,
                timelineEvent: input.timelineEvent || null
            };
        },

        normalizeFact(fact) {
            if (typeof fact === "string") {
                return {
                    id: this.createId("fact"),
                    statement: fact,
                    value: null,
                    unit: null,
                    confidence: 0.75,
                    sourceIds: [],
                    createdAt: new Date().toISOString()
                };
            }

            return {
                id: fact.id || this.createId("fact"),
                statement: String(fact.statement || fact.name || "").trim(),
                value: fact.value ?? null,
                unit: fact.unit || null,
                confidence: this.normalizeConfidence(fact.confidence),
                sourceIds: this.uniqueStrings(fact.sourceIds),
                effectiveDate: fact.effectiveDate || null,
                expirationDate: fact.expirationDate || null,
                createdAt: fact.createdAt || new Date().toISOString(),
                metadata:
                    fact.metadata && typeof fact.metadata === "object"
                        ? { ...fact.metadata }
                        : {}
            };
        },

        addFact(recordId, fact, actor = "MEOS") {
            const record = this.getRecordById(recordId);

            if (!record) {
                return {
                    success: false,
                    error: "Knowledge record not found."
                };
            }

            const normalizedFact = this.normalizeFact(fact);
            record.facts.push(normalizedFact);
            this.updateRecord(recordId, { facts: record.facts }, actor);

            this.emit("fact:added", {
                recordId,
                fact: normalizedFact
            });

            return {
                success: true,
                fact: normalizedFact,
                record
            };
        },

        upsertEntity(input = {}) {
            const normalizedName = String(
                input.name || input.label || ""
            ).trim();

            if (!normalizedName) {
                return {
                    success: false,
                    error: "Entities require a name."
                };
            }

            const entityType = input.entityType || input.type || "concept";
            const existing = this.findEntity(normalizedName, entityType);

            if (existing) {
                existing.aliases = this.uniqueStrings([
                    ...existing.aliases,
                    ...(input.aliases || [])
                ]);

                existing.tags = this.uniqueStrings([
                    ...existing.tags,
                    ...(input.tags || [])
                ]);

                existing.metadata = {
                    ...existing.metadata,
                    ...(input.metadata || {})
                };

                existing.updatedAt = new Date().toISOString();
                this.persistIfEnabled();

                return {
                    success: true,
                    created: false,
                    entity: existing
                };
            }

            const timestamp = new Date().toISOString();

            const entity = {
                id: input.id || this.createId("entity"),
                entityType,
                name: normalizedName,
                normalizedName: this.normalizeText(normalizedName),
                aliases: this.uniqueStrings(input.aliases),
                description: input.description || "",
                tags: this.uniqueStrings(input.tags),
                recordIds: [],
                relationshipIds: [],
                sensitivity: input.sensitivity || "internal",
                status: input.status || "active",
                createdAt: timestamp,
                updatedAt: timestamp,
                metadata:
                    input.metadata && typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}
            };

            this.entities.push(entity);

            this.logActivity("entity.created", {
                entityId: entity.id,
                entityType: entity.entityType,
                name: entity.name
            });

            this.persistIfEnabled();
            this.emit("entity:created", entity);

            return {
                success: true,
                created: true,
                entity
            };
        },

        createRelationship(input = {}) {
            const fromId = input.fromId || input.sourceEntityId;
            const toId = input.toId || input.targetEntityId;
            const relationshipType =
                input.relationshipType || input.type || "related-to";

            if (!fromId || !toId) {
                return {
                    success: false,
                    error:
                        "Relationships require both a source and target identifier."
                };
            }

            const duplicate = this.relationships.find(
                (relationship) =>
                    relationship.fromId === fromId &&
                    relationship.toId === toId &&
                    relationship.relationshipType === relationshipType &&
                    relationship.status !== "archived"
            );

            if (duplicate) {
                return {
                    success: true,
                    duplicate: true,
                    relationship: duplicate
                };
            }

            const relationship = {
                id: input.id || this.createId("relationship"),
                fromId,
                toId,
                relationshipType,
                label: input.label || relationshipType,
                description: input.description || "",
                sourceRecordId: input.sourceRecordId || null,
                sourceIds: this.uniqueStrings(input.sourceIds),
                confidence: this.normalizeConfidence(input.confidence),
                directional: input.directional !== false,
                status: input.status || "active",
                createdAt: new Date().toISOString(),
                metadata:
                    input.metadata && typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}
            };

            this.relationships.push(relationship);
            this.attachRelationshipReference(relationship);

            this.logActivity("relationship.created", {
                relationshipId: relationship.id,
                fromId,
                toId,
                relationshipType
            });

            this.persistIfEnabled();
            this.emit("relationship:created", relationship);

            return {
                success: true,
                duplicate: false,
                relationship
            };
        },

        attachRelationshipReference(relationship) {
            [relationship.fromId, relationship.toId].forEach((id) => {
                const entity = this.getEntityById(id);

                if (
                    entity &&
                    !entity.relationshipIds.includes(relationship.id)
                ) {
                    entity.relationshipIds.push(relationship.id);
                }

                const record = this.getRecordById(id);

                if (
                    record &&
                    !record.relationshipIds.includes(relationship.id)
                ) {
                    record.relationshipIds.push(relationship.id);
                }
            });
        },

        linkRecordToEntity(recordId, entityId) {
            const record = this.getRecordById(recordId);
            const entity = this.getEntityById(entityId);

            if (!record || !entity) {
                return {
                    success: false,
                    error: "Record or entity not found."
                };
            }

            if (!record.entityIds.includes(entityId)) {
                record.entityIds.push(entityId);
            }

            if (!entity.recordIds.includes(recordId)) {
                entity.recordIds.push(recordId);
            }

            this.persistIfEnabled();

            return {
                success: true,
                record,
                entity
            };
        },

        registerSource(input = {}) {
            const source = {
                id: input.id || this.createId("source"),
                name: input.name || "Unnamed Source",
                sourceType: input.sourceType || "document",
                authority: input.authority || "informational",
                url: input.url || "",
                documentId: input.documentId || null,
                organization: input.organization || "",
                publishedAt: input.publishedAt || null,
                accessedAt: input.accessedAt || new Date().toISOString(),
                status: input.status || "active",
                checksum: input.checksum || null,
                description: input.description || "",
                metadata:
                    input.metadata && typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {},
                createdAt: new Date().toISOString()
            };

            const existing = this.sources.find(
                (item) =>
                    item.id === source.id ||
                    (source.url && item.url === source.url) ||
                    (source.documentId && item.documentId === source.documentId)
            );

            if (existing) {
                return {
                    success: true,
                    duplicate: true,
                    source: existing
                };
            }

            this.sources.push(source);
            this.logActivity("source.registered", {
                sourceId: source.id,
                name: source.name
            });

            this.persistIfEnabled();
            this.emit("source:registered", source);

            return {
                success: true,
                duplicate: false,
                source
            };
        },

        registerSystemSource(input = {}) {
            return this.registerSource({
                ...input,
                sourceType: input.sourceType || "system",
                authority: input.authority || "authoritative"
            });
        },

        registerDocument(document = {}) {
            if (!document.id && !document.name) {
                return {
                    success: false,
                    error: "Document data is incomplete."
                };
            }

            const sourceResult = this.registerSource({
                id: `source-${document.id || this.createId("document")}`,
                name: document.name || "Uploaded Document",
                sourceType: "uploaded-document",
                authority: "primary",
                documentId: document.id || null,
                description:
                    document.instructions || document.uploadPurpose || "",
                metadata: {
                    mimeType: document.mimeType || null,
                    sizeBytes: document.sizeBytes || null,
                    sensitivity: document.sensitivity || "internal",
                    uploadedBy: document.uploadedBy || null,
                    uploadedAt: document.createdAt || null
                }
            });

            const recordResult = this.createRecord({
                recordType: "document",
                title: document.name || "Uploaded Document",
                summary:
                    document.uploadPurpose ||
                    `${document.documentType || "Document"} received for review.`,
                content: "",
                tags: [
                    document.documentType || "document",
                    document.sensitivity || "internal",
                    ...(document.detectedKeywords || [])
                ],
                topics: document.detectedKeywords || [],
                sourceIds: [sourceResult.source.id],
                sensitivity: document.sensitivity || "internal",
                authority: "primary",
                confidence: 0.7,
                metadata: {
                    documentId: document.id || null,
                    intelligenceId: document.intelligenceId || null,
                    reviewStatus: document.reviewStatus || "received",
                    processingStatus:
                        document.processingStatus || "metadata-recorded",
                    suggestedOffices: document.suggestedOffices || []
                }
            });

            this.emit("document:registered", {
                document,
                source: sourceResult.source,
                record: recordResult.record
            });

            return {
                success: true,
                source: sourceResult.source,
                record: recordResult.record
            };
        },

        captureIntelligence(intelligence = {}) {
            if (!intelligence.id) {
                return {
                    success: false,
                    error: "Intelligence item is missing an identifier."
                };
            }

            return this.createRecord({
                id: `knowledge-${intelligence.id}`,
                recordType: "intelligence",
                title: intelligence.title || "Intelligence Item",
                summary: intelligence.summary || "",
                content: intelligence.details || "",
                tags: [
                    intelligence.intelligenceType || "general",
                    intelligence.detectedPriority || "normal",
                    ...(intelligence.tags || [])
                ],
                topics: intelligence.tags || [],
                relatedRecordIds:
                    intelligence.relatedIntelligenceIds || [],
                officeAccess:
                    intelligence.offices && intelligence.offices.length > 0
                        ? intelligence.offices
                        : ["all"],
                sensitivity: "internal",
                authority: intelligence.verified ? "verified" : "unverified",
                confidence: intelligence.verified ? 0.9 : 0.55,
                effectiveDate: intelligence.createdAt || null,
                metadata: {
                    intelligenceId: intelligence.id,
                    sourceType: intelligence.sourceType || null,
                    priority: intelligence.detectedPriority || null,
                    priorityScore: intelligence.priorityScore || null,
                    missionAlignment: intelligence.missionAlignment || null,
                    deadline: intelligence.deadline || null,
                    requiresExecutiveDecision:
                        intelligence.requiresExecutiveDecision === true
                },
                timelineEvent: {
                    title: intelligence.title || "Intelligence received",
                    eventType: "intelligence",
                    occurredAt:
                        intelligence.createdAt || new Date().toISOString(),
                    description:
                        intelligence.summary || intelligence.details || ""
                }
            });
        },

        captureExecutiveBriefing(briefing = {}) {
            if (!briefing.id) {
                return {
                    success: false,
                    error: "Executive briefing is missing an identifier."
                };
            }

            return this.createRecord({
                id: `knowledge-${briefing.id}`,
                recordType: "executive-briefing",
                title: briefing.title || "Executive Briefing",
                summary: briefing.executiveSummary || "",
                content: {
                    whatChanged: briefing.whatChanged || "",
                    whyItMatters: briefing.whyItMatters || "",
                    findings: briefing.findings || [],
                    recommendations: briefing.recommendations || [],
                    missingInformation: briefing.missingInformation || [],
                    decisionRequired: briefing.decisionRequired === true,
                    executiveDecisionQuestion:
                        briefing.executiveDecisionQuestion || "",
                    recommendedNextActions:
                        briefing.recommendedNextActions || []
                },
                tags: [
                    "executive-briefing",
                    briefing.priority || "normal",
                    briefing.status || "preliminary"
                ],
                relatedRecordIds: briefing.intelligenceId
                    ? [`knowledge-${briefing.intelligenceId}`]
                    : [],
                officeAccess: ["Executive Office"],
                sensitivity: "confidential",
                authority: "executive-analysis",
                confidence:
                    briefing.status === "ready-for-executive-review"
                        ? 0.9
                        : 0.7,
                metadata: {
                    briefingId: briefing.id,
                    intelligenceId: briefing.intelligenceId || null,
                    priorityScore: briefing.priorityScore || null,
                    missionAlignment: briefing.missionAlignment || null,
                    deadline: briefing.deadline || null,
                    preparedAt: briefing.preparedAt || null
                }
            });
        },

        captureOrganizationalProfile(profile = {}) {
            const organization = profile.organization || {};

            if (!organization.legalName && !organization.shortName) {
                return {
                    success: false,
                    error:
                        "The organizational profile does not identify an organization."
                };
            }

            const organizationEntity = this.upsertEntity({
                id: "entity-current-organization",
                entityType: "organization",
                name:
                    organization.legalName ||
                    organization.shortName ||
                    "Current Organization",
                aliases: [organization.shortName].filter(Boolean),
                description: organization.mission || "",
                tags: ["current-organization"],
                metadata: {
                    organizationType: organization.type || null,
                    slogan: organization.slogan || null
                }
            });

            return this.createRecord({
                id: "knowledge-organizational-profile",
                recordType: "organizational-profile",
                title: `${
                    organization.shortName ||
                    organization.legalName ||
                    "Organization"
                } Organizational Profile`,
                summary:
                    organization.mission ||
                    "Customer-specific organization profile.",
                content: this.removeFunctions(profile),
                entities: organizationEntity.success
                    ? [organizationEntity.entity]
                    : [],
                tags: [
                    "organizational-profile",
                    "organization-package",
                    "authoritative"
                ],
                sourceIds: ["source-organizational-profile"],
                officeAccess: ["all"],
                sensitivity: "internal",
                authority: "authoritative",
                confidence: 1,
                metadata: {
                    organizationNeutralCore: false,
                    customerSpecificPackage: true
                }
            });
        },

        addTimelineEvent(input = {}) {
            const event = {
                id: input.id || this.createId("timeline-event"),
                title: input.title || "Untitled Event",
                eventType: input.eventType || "general",
                occurredAt: input.occurredAt || new Date().toISOString(),
                endAt: input.endAt || null,
                description: input.description || "",
                recordIds: this.uniqueStrings(input.recordIds),
                entityIds: this.uniqueStrings(input.entityIds),
                sourceIds: this.uniqueStrings(input.sourceIds),
                status: input.status || "confirmed",
                confidence: this.normalizeConfidence(input.confidence),
                createdAt: new Date().toISOString(),
                metadata:
                    input.metadata && typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}
            };

            this.timelines.push(event);
            this.persistIfEnabled();
            this.emit("timeline:event-added", event);

            return {
                success: true,
                event
            };
        },

        createCollection(input = {}) {
            const collection = {
                id: input.id || this.createId("collection"),
                name: input.name || "Untitled Collection",
                description: input.description || "",
                recordIds: this.uniqueStrings(input.recordIds),
                entityIds: this.uniqueStrings(input.entityIds),
                tags: this.uniqueStrings(input.tags),
                officeAccess:
                    Array.isArray(input.officeAccess) &&
                    input.officeAccess.length > 0
                        ? this.uniqueStrings(input.officeAccess)
                        : ["all"],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metadata:
                    input.metadata && typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}
            };

            this.collections.push(collection);
            this.persistIfEnabled();
            this.emit("collection:created", collection);

            return {
                success: true,
                collection
            };
        },

        search(query, options = {}) {
            const normalizedQuery = this.normalizeText(query);

            if (!normalizedQuery) {
                return {
                    success: false,
                    error: "Search requires a query."
                };
            }

            const request = {
                id: this.createId("query"),
                query: String(query || ""),
                normalizedQuery,
                options: { ...options },
                createdAt: new Date().toISOString()
            };

            const queryTerms = normalizedQuery.split(" ").filter(Boolean);
            const maximumResults =
                Number(options.limit) ||
                this.configuration.maximumSearchResults;

            const recordResults = this.records
                .filter((record) =>
                    this.canOfficeAccessRecord(record, options.office)
                )
                .map((record) => ({
                    resultType: "record",
                    score: this.scoreSearchMatch(record, queryTerms),
                    item: record
                }))
                .filter((result) => result.score > 0);

            const entityResults = this.entities
                .map((entity) => ({
                    resultType: "entity",
                    score: this.scoreSearchMatch(entity, queryTerms),
                    item: entity
                }))
                .filter((result) => result.score > 0);

            const sourceResults = this.sources
                .map((source) => ({
                    resultType: "source",
                    score: this.scoreSearchMatch(source, queryTerms),
                    item: source
                }))
                .filter((result) => result.score > 0);

            const timelineResults = this.timelines
                .map((event) => ({
                    resultType: "timeline-event",
                    score: this.scoreSearchMatch(event, queryTerms),
                    item: event
                }))
                .filter((result) => result.score > 0);

            const results = [
                ...recordResults,
                ...entityResults,
                ...sourceResults,
                ...timelineResults
            ]
                .sort((first, second) => second.score - first.score)
                .slice(0, maximumResults);

            request.resultCount = results.length;
            this.queries.push(request);

            this.emit("search:completed", {
                request,
                results
            });

            return {
                success: true,
                request,
                results
            };
        },

        scoreSearchMatch(item, terms) {
            const title = this.normalizeText(
                item.title || item.name || item.label || ""
            );
            const summary = this.normalizeText(
                item.summary || item.description || ""
            );
            const content = this.normalizeText(
                typeof item.content === "string"
                    ? item.content
                    : JSON.stringify(item.content || {})
            );
            const tags = this.normalizeText(
                [
                    ...(item.tags || []),
                    ...(item.topics || []),
                    ...(item.aliases || [])
                ].join(" ")
            );
            const metadata = this.normalizeText(
                JSON.stringify(item.metadata || {})
            );

            let score = 0;

            terms.forEach((term) => {
                if (title === term) score += 50;
                if (title.includes(term)) score += 20;
                if (tags.includes(term)) score += 12;
                if (summary.includes(term)) score += 8;
                if (content.includes(term)) score += 5;
                if (metadata.includes(term)) score += 2;
            });

            if (
                terms.every(
                    (term) =>
                        title.includes(term) ||
                        summary.includes(term) ||
                        content.includes(term) ||
                        tags.includes(term)
                )
            ) {
                score += 25;
            }

            return score;
        },

        recall(input = {}) {
            const query =
                typeof input === "string" ? input : input.query || "";
            const options =
                typeof input === "string"
                    ? {}
                    : {
                          office: input.office,
                          limit: input.limit || 20
                      };

            const searchResult = this.search(query, options);

            if (!searchResult.success) {
                return searchResult;
            }

            const records = searchResult.results
                .filter((result) => result.resultType === "record")
                .map((result) => result.item);

            const entities = searchResult.results
                .filter((result) => result.resultType === "entity")
                .map((result) => result.item);

            const facts = records.flatMap((record) =>
                record.facts.map((fact) => ({
                    ...fact,
                    recordId: record.id,
                    recordTitle: record.title
                }))
            );

            return {
                success: true,
                query,
                answerStatus:
                    searchResult.results.length > 0
                        ? "knowledge-found"
                        : "no-knowledge-found",
                records,
                entities,
                facts,
                sources: this.resolveSourcesForRecords(records),
                relatedRecords: this.resolveRelatedRecords(records),
                timeline: this.resolveTimelineForRecords(records)
            };
        },

        getKnowledgeContext(input = {}) {
            const recordIds = this.uniqueStrings(input.recordIds);
            const entityIds = this.uniqueStrings(input.entityIds);

            const seedRecords = recordIds
                .map((id) => this.getRecordById(id))
                .filter(Boolean);
            const seedEntities = entityIds
                .map((id) => this.getEntityById(id))
                .filter(Boolean);

            const connectedEntityIds = new Set([
                ...entityIds,
                ...seedRecords.flatMap((record) => record.entityIds)
            ]);
            const connectedRecordIds = new Set([
                ...recordIds,
                ...seedEntities.flatMap((entity) => entity.recordIds)
            ]);

            this.relationships.forEach((relationship) => {
                const touchesSeed =
                    recordIds.includes(relationship.fromId) ||
                    recordIds.includes(relationship.toId) ||
                    entityIds.includes(relationship.fromId) ||
                    entityIds.includes(relationship.toId);

                if (!touchesSeed) return;

                if (this.getEntityById(relationship.fromId)) {
                    connectedEntityIds.add(relationship.fromId);
                }
                if (this.getEntityById(relationship.toId)) {
                    connectedEntityIds.add(relationship.toId);
                }
                if (this.getRecordById(relationship.fromId)) {
                    connectedRecordIds.add(relationship.fromId);
                }
                if (this.getRecordById(relationship.toId)) {
                    connectedRecordIds.add(relationship.toId);
                }
            });

            return {
                records: [...connectedRecordIds]
                    .map((id) => this.getRecordById(id))
                    .filter(Boolean),
                entities: [...connectedEntityIds]
                    .map((id) => this.getEntityById(id))
                    .filter(Boolean),
                relationships: this.relationships.filter(
                    (relationship) =>
                        connectedRecordIds.has(relationship.fromId) ||
                        connectedRecordIds.has(relationship.toId) ||
                        connectedEntityIds.has(relationship.fromId) ||
                        connectedEntityIds.has(relationship.toId)
                )
            };
        },

        findDuplicateRecord(candidate) {
            const normalizedTitle = this.normalizeText(candidate.title);

            return (
                this.records.find((record) => {
                    if (candidate.id && record.id === candidate.id) {
                        return true;
                    }

                    const sameTitle =
                        this.normalizeText(record.title) === normalizedTitle;
                    const sameType =
                        record.recordType === candidate.recordType;
                    const overlappingSources =
                        candidate.sourceIds.length > 0 &&
                        candidate.sourceIds.some((sourceId) =>
                            record.sourceIds.includes(sourceId)
                        );

                    return sameTitle && (sameType || overlappingSources);
                }) || null
            );
        },

        findEntity(name, entityType = null) {
            const normalizedName = this.normalizeText(name);

            return (
                this.entities.find((entity) => {
                    const typeMatches =
                        !entityType || entity.entityType === entityType;
                    const nameMatches =
                        entity.normalizedName === normalizedName ||
                        entity.aliases.some(
                            (alias) =>
                                this.normalizeText(alias) === normalizedName
                        );

                    return typeMatches && nameMatches;
                }) || null
            );
        },

        canOfficeAccessRecord(record, office) {
            if (!office) return true;
            if (record.officeAccess.includes("all")) return true;
            return record.officeAccess.includes(office);
        },

        resolveSourcesForRecords(records) {
            const sourceIds = new Set(
                records.flatMap((record) => record.sourceIds || [])
            );

            return [...sourceIds]
                .map((sourceId) => this.getSourceById(sourceId))
                .filter(Boolean);
        },

        resolveRelatedRecords(records) {
            const relatedIds = new Set(
                records.flatMap((record) => record.relatedRecordIds || [])
            );

            return [...relatedIds]
                .map((recordId) => this.getRecordById(recordId))
                .filter(Boolean);
        },

        resolveTimelineForRecords(records) {
            const recordIds = new Set(records.map((record) => record.id));

            return this.timelines
                .filter((event) =>
                    event.recordIds.some((recordId) => recordIds.has(recordId))
                )
                .sort(
                    (first, second) =>
                        new Date(first.occurredAt).getTime() -
                        new Date(second.occurredAt).getTime()
                );
        },

        getRecordById(recordId) {
            return this.records.find((record) => record.id === recordId) || null;
        },

        getEntityById(entityId) {
            return this.entities.find((entity) => entity.id === entityId) || null;
        },

        getRelationshipById(relationshipId) {
            return (
                this.relationships.find(
                    (relationship) => relationship.id === relationshipId
                ) || null
            );
        },

        getSourceById(sourceId) {
            return this.sources.find((source) => source.id === sourceId) || null;
        },

        getCollectionById(collectionId) {
            return (
                this.collections.find(
                    (collection) => collection.id === collectionId
                ) || null
            );
        },

        getRecordsByType(recordType) {
            return this.records.filter(
                (record) =>
                    record.recordType === recordType &&
                    record.status !== "archived"
            );
        },

        getRecordsForOffice(officeName) {
            return this.records.filter(
                (record) =>
                    record.status !== "archived" &&
                    this.canOfficeAccessRecord(record, officeName)
            );
        },

        exportKnowledge(options = {}) {
            const exportData = {
                schema: "meos-knowledge-engine",
                version: this.version,
                exportedAt: new Date().toISOString(),
                organizationNeutralCore:
                    this.configuration.organizationNeutralCore,
                records: options.records === false ? [] : this.records,
                entities: options.entities === false ? [] : this.entities,
                relationships:
                    options.relationships === false ? [] : this.relationships,
                sources: options.sources === false ? [] : this.sources,
                timelines: options.timelines === false ? [] : this.timelines,
                collections:
                    options.collections === false ? [] : this.collections
            };

            return {
                success: true,
                data: exportData,
                json: JSON.stringify(exportData, null, 2)
            };
        },

        importKnowledge(payload, options = {}) {
            let data = payload;

            if (typeof payload === "string") {
                try {
                    data = JSON.parse(payload);
                } catch (error) {
                    return {
                        success: false,
                        error: "The knowledge import is not valid JSON."
                    };
                }
            }

            if (!data || data.schema !== "meos-knowledge-engine") {
                return {
                    success: false,
                    error: "The import is not a MEOS knowledge package."
                };
            }

            if (options.replace === true) {
                this.records = [];
                this.entities = [];
                this.relationships = [];
                this.sources = [];
                this.timelines = [];
                this.collections = [];
            }

            this.mergeById(this.records, data.records || []);
            this.mergeById(this.entities, data.entities || []);
            this.mergeById(this.relationships, data.relationships || []);
            this.mergeById(this.sources, data.sources || []);
            this.mergeById(this.timelines, data.timelines || []);
            this.mergeById(this.collections, data.collections || []);

            if (options.skipPersistence !== true) {
                this.persistIfEnabled();
            }
            this.emit("knowledge:imported", data);

            return {
                success: true,
                status: this.getStatus()
            };
        },

        mergeById(target, incoming) {
            incoming.forEach((item) => {
                const index = target.findIndex(
                    (existing) => existing.id === item.id
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


        getExecutiveMemoryCollectionUrl(recordId = null) {
            const base = String(
                this.configuration.executiveMemoryEndpoint
            ).replace(/\/+$/, "");

            const collection =
                encodeURIComponent(
                    this.configuration.executiveMemoryCollection
                );

            return recordId
                ? `${base}/${collection}/${encodeURIComponent(recordId)}`
                : `${base}/${collection}`;
        },

        async executiveMemoryRequest(
            method,
            recordId = null,
            body = null
        ) {
            if (typeof global.fetch !== "function") {
                throw new Error(
                    "Executive Memory transport is unavailable."
                );
            }

            const response = await global.fetch(
                this.getExecutiveMemoryCollectionUrl(recordId),
                {
                    method,
                    headers:
                        body === null
                            ? { Accept: "application/json" }
                            : {
                                  Accept: "application/json",
                                  "Content-Type": "application/json"
                              },
                    body:
                        body === null
                            ? undefined
                            : JSON.stringify(body),
                    cache: "no-store",
                    credentials: "same-origin"
                }
            );

            const payload = await response
                .json()
                .catch(() => null);

            if (!response.ok) {
                const error = new Error(
                    payload?.error ||
                        `Executive Memory returned HTTP ${response.status}.`
                );
                error.code =
                    payload?.code ||
                    "EXECUTIVE_MEMORY_HTTP_ERROR";
                error.details = payload?.details || null;
                throw error;
            }

            return payload;
        },

        createPersistenceShards(exportData) {
            const targetBytes = Math.max(
                50000,
                Number(
                    this.configuration
                        .executiveMemoryShardTargetBytes
                ) || EXECUTIVE_MEMORY_SHARD_TARGET_BYTES
            );

            const categories = [
                "records",
                "entities",
                "relationships",
                "sources",
                "timelines",
                "collections"
            ];

            const shards = [];

            categories.forEach((category) => {
                const items = Array.isArray(exportData[category])
                    ? exportData[category]
                    : [];

                let current = [];
                let currentBytes = 2;
                let shardIndex = 0;

                const flush = () => {
                    if (current.length === 0) {
                        return;
                    }

                    shardIndex += 1;
                    const id =
                        `knowledge-engine-${category}-` +
                        String(shardIndex).padStart(4, "0");

                    shards.push({
                        id,
                        schema:
                            "meos.knowledge-engine.shard.v1",
                        type: "knowledge-engine-state-shard",
                        category,
                        shardIndex,
                        items: current,
                        itemCount: current.length,
                        updatedAt: new Date().toISOString()
                    });

                    current = [];
                    currentBytes = 2;
                };

                items.forEach((item) => {
                    const itemBytes =
                        new TextEncoder().encode(
                            JSON.stringify(item)
                        ).length + 1;

                    if (
                        current.length > 0 &&
                        currentBytes + itemBytes > targetBytes
                    ) {
                        flush();
                    }

                    current.push(item);
                    currentBytes += itemBytes;
                });

                flush();
            });

            return shards;
        },

        schedulePersistence() {
            if (this.persistenceTimer) {
                global.clearTimeout(this.persistenceTimer);
            }

            this.persistenceTimer = global.setTimeout(() => {
                this.persistenceTimer = null;
                void this.persist();
            }, this.configuration.persistenceDebounceMs);

            return {
                success: true,
                scheduled: true
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
                success: false,
                scheduled: false,
                error: "Automatic persistence is disabled."
            };
        },

        async persist() {
            if (!this.configuration.persistenceEnabled) {
                return {
                    success: false,
                    error: "Persistence is disabled."
                };
            }

            if (this.persistencePromise) {
                return this.persistencePromise;
            }

            this.persistencePromise = (async () => {
                const data = this.exportKnowledge().data;
                const shards = this.createPersistenceShards(data);
                const previousManifest = await this.executiveMemoryRequest(
                    "GET",
                    this.configuration.executiveMemoryManifestId
                )
                    .then((payload) => payload?.record || null)
                    .catch((error) => {
                        if (
                            error?.code ===
                            "EXECUTIVE_MEMORY_RECORD_NOT_FOUND"
                        ) {
                            return null;
                        }

                        throw error;
                    });

                for (const shard of shards) {
                    await this.executiveMemoryRequest(
                        "PUT",
                        shard.id,
                        shard
                    );
                }

                const manifest = {
                    id:
                        this.configuration
                            .executiveMemoryManifestId,
                    schema:
                        "meos.knowledge-engine.manifest.v1",
                    type: "knowledge-engine-state-manifest",
                    engineVersion: this.version,
                    exportedAt: data.exportedAt,
                    organizationNeutralCore:
                        data.organizationNeutralCore,
                    shardIds: shards.map((shard) => shard.id),
                    counts: {
                        records: data.records.length,
                        entities: data.entities.length,
                        relationships:
                            data.relationships.length,
                        sources: data.sources.length,
                        timelines: data.timelines.length,
                        collections: data.collections.length
                    }
                };

                await this.executiveMemoryRequest(
                    "PUT",
                    manifest.id,
                    manifest
                );

                const previousShardIds = Array.isArray(
                    previousManifest?.shardIds
                )
                    ? previousManifest.shardIds
                    : [];

                const activeShardIds = new Set(
                    manifest.shardIds
                );

                for (const oldShardId of previousShardIds) {
                    if (!activeShardIds.has(oldShardId)) {
                        await this.executiveMemoryRequest(
                            "DELETE",
                            oldShardId
                        ).catch(() => null);
                    }
                }

                this.lastPersistenceAt =
                    new Date().toISOString();
                this.lastPersistenceError = null;

                this.emit("knowledge:persisted", {
                    timestamp: this.lastPersistenceAt,
                    authoritativeStorage:
                        "executive-memory",
                    manifestId: manifest.id,
                    shardCount: shards.length,
                    counts: manifest.counts
                });

                return {
                    success: true,
                    authoritativeStorage:
                        "executive-memory",
                    manifestId: manifest.id,
                    shardCount: shards.length,
                    counts: manifest.counts
                };
            })()
                .catch((error) => {
                    this.lastPersistenceError =
                        error?.message || String(error);

                    console.error(
                        "[MEOS Knowledge Engine] Executive Memory persistence failed:",
                        error
                    );

                    return {
                        success: false,
                        error: this.lastPersistenceError,
                        code: error?.code || null
                    };
                })
                .finally(() => {
                    this.persistencePromise = null;
                });

            return this.persistencePromise;
        },

        async restore() {
            if (!this.configuration.persistenceEnabled) {
                return {
                    success: false,
                    restored: false,
                    error: "Persistence is disabled."
                };
            }

            let manifest = null;

            try {
                const payload =
                    await this.executiveMemoryRequest(
                        "GET",
                        this.configuration
                            .executiveMemoryManifestId
                    );

                manifest = payload?.record || null;
            } catch (error) {
                if (
                    error?.code !==
                    "EXECUTIVE_MEMORY_RECORD_NOT_FOUND"
                ) {
                    throw error;
                }
            }

            if (!manifest) {
                const migration =
                    await this.migrateLegacyLocalStorage();

                return {
                    success: true,
                    restored: migration.migrated,
                    migratedLegacyStorage:
                        migration.migrated
                };
            }

            const restored = {
                schema: "meos-knowledge-engine",
                version:
                    manifest.engineVersion || this.version,
                organizationNeutralCore:
                    manifest.organizationNeutralCore !== false,
                records: [],
                entities: [],
                relationships: [],
                sources: [],
                timelines: [],
                collections: []
            };

            const shardIds = Array.isArray(manifest.shardIds)
                ? manifest.shardIds
                : [];

            for (const shardId of shardIds) {
                const payload =
                    await this.executiveMemoryRequest(
                        "GET",
                        shardId
                    );
                const shard = payload?.record;

                if (
                    !shard ||
                    !Array.isArray(shard.items) ||
                    !Object.prototype.hasOwnProperty.call(
                        restored,
                        shard.category
                    )
                ) {
                    continue;
                }

                restored[shard.category].push(
                    ...shard.items
                );
            }

            const importResult = this.importKnowledge(
                restored,
                {
                    replace: false,
                    skipPersistence: true
                }
            );

            this.restoredFromExecutiveMemory =
                importResult.success;

            this.emit("knowledge:restored", {
                authoritativeStorage:
                    "executive-memory",
                manifestId: manifest.id,
                shardCount: shardIds.length,
                counts: manifest.counts || null
            });

            return {
                ...importResult,
                restored: importResult.success,
                authoritativeStorage:
                    "executive-memory",
                manifestId: manifest.id,
                shardCount: shardIds.length
            };
        },

        async migrateLegacyLocalStorage() {
            if (!global.localStorage) {
                return {
                    success: true,
                    migrated: false
                };
            }

            const stored = global.localStorage.getItem(
                this.configuration.localStorageKey
            );

            if (!stored) {
                return {
                    success: true,
                    migrated: false
                };
            }

            let data;

            try {
                data = JSON.parse(stored);
            } catch (_error) {
                return {
                    success: false,
                    migrated: false,
                    error:
                        "Legacy browser knowledge is invalid JSON."
                };
            }

            const imported = this.importKnowledge(data, {
                replace: false,
                skipPersistence: true
            });

            if (!imported.success) {
                return {
                    ...imported,
                    migrated: false
                };
            }

            const persisted = await this.persist();

            if (persisted.success) {
                global.localStorage.removeItem(
                    this.configuration.localStorageKey
                );
            }

            return {
                success: persisted.success,
                migrated: persisted.success,
                persisted
            };
        },

        clearLocalKnowledge(confirmation) {
            if (confirmation !== "CLEAR MEOS KNOWLEDGE") {
                return {
                    success: false,
                    error:
                        'Confirmation phrase required: "CLEAR MEOS KNOWLEDGE".'
                };
            }

            this.records = [];
            this.entities = [];
            this.relationships = [];
            this.sources = [];
            this.timelines = [];
            this.collections = [];
            this.queries = [];
            this.activityLog = [];

            if (global.localStorage) {
                global.localStorage.removeItem(
                    this.configuration.localStorageKey
                );
            }

            void this.persist();

            this.emit("knowledge:cleared", {
                timestamp: new Date().toISOString()
            });

            return {
                success: true
            };
        },

        logActivity(action, details = {}) {
            const entry = {
                id: this.createId("knowledge-activity"),
                action,
                details,
                timestamp: new Date().toISOString()
            };

            this.activityLog.push(entry);

            if (this.activityLog.length > 1000) {
                this.activityLog = this.activityLog.slice(-1000);
            }

            return entry;
        },

        normalizeConfidence(value) {
            if (value === undefined || value === null) {
                return 0.75;
            }

            const numericValue = Number(value);

            if (Number.isNaN(numericValue)) {
                return 0.75;
            }

            return Math.max(0, Math.min(1, numericValue));
        },

        uniqueStrings(values) {
            return [
                ...new Set(
                    (Array.isArray(values) ? values : [])
                        .map((value) => String(value || "").trim())
                        .filter(Boolean)
                )
            ];
        },

        normalizeText(value) {
            return String(value || "")
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, " ")
                .replace(/\s+/g, " ")
                .trim();
        },

        removeFunctions(value) {
            return JSON.parse(
                JSON.stringify(value, (key, item) =>
                    typeof item === "function" ? undefined : item
                )
            );
        },

        createId(prefix) {
            const randomPart = Math.random()
                .toString(36)
                .slice(2, 10);

            return `${prefix}-${Date.now()}-${randomPart}`;
        },

        on(eventName, callback) {
            if (typeof callback !== "function") {
                return false;
            }

            if (!this.eventListeners[eventName]) {
                this.eventListeners[eventName] = [];
            }

            this.eventListeners[eventName].push(callback);
            return true;
        },

        off(eventName, callback) {
            const listeners = this.eventListeners[eventName];

            if (!listeners) {
                return false;
            }

            this.eventListeners[eventName] = listeners.filter(
                (listener) => listener !== callback
            );

            return true;
        },

        emit(eventName, payload) {
            const listeners = this.eventListeners[eventName] || [];

            listeners.forEach((listener) => {
                try {
                    listener(payload);
                } catch (error) {
                    console.error(
                        `[MEOS Knowledge Engine] Event listener failed for "${eventName}":`,
                        error
                    );
                }
            });
        },

        getStatus() {
            return {
                name: this.name,
                version: this.version,
                status: this.status,
                operatingMode: this.operatingMode,
                organizationNeutralCore:
                    this.configuration.organizationNeutralCore,
                persistenceEnabled:
                    this.configuration.persistenceEnabled,
                authoritativeStorage:
                    this.configuration.authoritativeStorage,
                restoredFromExecutiveMemory:
                    this.restoredFromExecutiveMemory,
                lastPersistenceAt:
                    this.lastPersistenceAt,
                lastPersistenceError:
                    this.lastPersistenceError,
                intelligenceEngineConnected: Boolean(
                    global.IntelligenceEngine
                ),
                organizationalProfileConnected: Boolean(
                    global.OrganizationalProfile
                ),
                recordCount: this.records.length,
                entityCount: this.entities.length,
                relationshipCount: this.relationships.length,
                sourceCount: this.sources.length,
                timelineEventCount: this.timelines.length,
                collectionCount: this.collections.length,
                queryCount: this.queries.length
            };
        }
    };

    global.KnowledgeEngine = KnowledgeEngine;
    KnowledgeEngine.initialize();
})(window);
