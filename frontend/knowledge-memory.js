/*
 * MEOS Knowledge Memory
 * Version: 1.1.2
 *
 * Purpose:
 * Upgrade the completed MEOS Knowledge Engine with document memory,
 * passage-level retrieval, citations, version history, cross-references,
 * conflict detection, graph traversal, and executive recall.
 *
 * Architecture:
 * - Does NOT replace KnowledgeEngine.
 * - Uses the KnowledgeEngine public API and universal data model.
 * - Keeps the MEOS core organization-neutral.
 *
 * Required load order:
 *   knowledge-engine.js
 *   knowledge-memory.js
 *
 * Optional later files:
 *   workflow-engine.js
 *   knowledge-integration.js
 */

(function initializeKnowledgeMemory(global) {
    "use strict";

    const STORAGE_KEY = "meos.knowledge-memory.v1";
    const SCHEMA = "meos-knowledge-memory";
    const VERSION = "1.1.2";
    const EXECUTIVE_MEMORY_COLLECTION = "investigation-history";
    const EXECUTIVE_MEMORY_ENDPOINT = "/api/executive-memory";
    const EXECUTIVE_MEMORY_MANIFEST_ID = "knowledge-memory-manifest-v1";
    const EXECUTIVE_MEMORY_SHARD_TARGET_BYTES = 320000;

    const KnowledgeMemory = {
        name: "MEOS Knowledge Memory",
        version: VERSION,
        status: "initializing",
        operatingMode: "continuous",

        configuration: {
            persistenceEnabled: true,
            automaticPersistence: true,
            localStorageKey: STORAGE_KEY,
            authoritativeStorage: "executive-memory",
            executiveMemoryEndpoint: EXECUTIVE_MEMORY_ENDPOINT,
            executiveMemoryCollection: EXECUTIVE_MEMORY_COLLECTION,
            executiveMemoryManifestId: EXECUTIVE_MEMORY_MANIFEST_ID,
            executiveMemoryShardTargetBytes:
                EXECUTIVE_MEMORY_SHARD_TARGET_BYTES,
            localStorageRole: "legacy-migration-only",
            persistenceDebounceMs: 450,
            persistenceMaximumAttempts: 3,
            persistenceRetryDelayMs: 125,

            defaultChunkSize: 1200,
            defaultChunkOverlap: 180,
            minimumChunkSize: 120,
            maximumChunkSize: 2400,

            maximumQueryResults: 30,
            maximumRecallPassages: 12,
            maximumGraphDepth: 4,
            maximumGraphNodes: 250,

            duplicateSimilarityThreshold: 0.96,
            crossReferenceThreshold: 0.34,
            conflictSimilarityThreshold: 0.48,

            autoCrossReference: true,
            autoConflictDetection: true,
            autoVersionDocuments: true,
            organizationNeutralCore: true
        },

        documents: [],
        passages: [],
        citations: [],
        versions: [],
        crossReferences: [],
        conflicts: [],
        queryLog: [],
        activityLog: [],
        eventListeners: {},

        connectedEngine: null,
        initializedAt: null,
        persistenceTimer: null,
        persistencePromise: null,
        restorePromise: null,
        lastPersistenceAt: null,
        lastPersistenceError: null,
        persistenceConvergenceRetryCount: 0,
        persistenceConvergedWriteCount: 0,
        lastPersistenceAttempts: 0,
        restoredFromExecutiveMemory: false,
        executiveMemoryManifestKnownMissing: false,
        executiveMemoryManifestBootstrapAt: null,

        initialize(options = {}) {
            this.configuration = {
                ...this.configuration,
                ...(options.configuration || options)
            };

            this.restorePromise = this.restore().catch(
                (error) => {
                    this.lastPersistenceError =
                        error?.message || String(error);

                    console.error(
                        "[MEOS Knowledge Memory] Executive Memory restore failed:",
                        error
                    );

                    return {
                        success: false,
                        restored: false,
                        error:
                            this.lastPersistenceError
                    };
                }
            );

            const connected = this.connect(global.KnowledgeEngine);

            if (!connected.success) {
                this.status = "waiting-for-knowledge-engine";
                console.warn(
                    "[MEOS Knowledge Memory] Waiting for Knowledge Engine."
                );
            } else {
                this.status = "online";
            }

            this.initializedAt = new Date().toISOString();

            this.registerSystemKnowledge();

            this.logActivity("memory.initialized", {
                version: this.version,
                connected: connected.success,
                restoredDocuments: this.documents.length,
                restoredPassages: this.passages.length
            });

            console.info(
                `[MEOS] ${this.name} v${this.version} ${this.status}.`
            );

            this.emit("memory:online", this.getStatus());

            return this.getStatus();
        },

        connect(engine) {
            if (!engine) {
                return {
                    success: false,
                    error: "Knowledge Engine is unavailable."
                };
            }

            const requiredMethods = [
                "createRecord",
                "updateRecord",
                "getRecordById",
                "registerSource",
                "getSourceById",
                "createRelationship",
                "addTimelineEvent",
                "search",
                "recall",
                "persistIfEnabled"
            ];

            const missing = requiredMethods.filter(
                (methodName) => typeof engine[methodName] !== "function"
            );

            if (missing.length > 0) {
                return {
                    success: false,
                    error: `Knowledge Engine API is incomplete: ${missing.join(
                        ", "
                    )}`
                };
            }

            this.connectedEngine = engine;

            if (typeof engine.on === "function") {
                engine.on("record:created", (record) => {
                    this.handleKnowledgeRecordCreated(record);
                });

                engine.on("record:updated", (record) => {
                    this.handleKnowledgeRecordUpdated(record);
                });

                engine.on("knowledge:imported", () => {
                    this.reconcileWithKnowledgeEngine();
                });
            }

            return {
                success: true,
                engine: engine.name,
                version: engine.version
            };
        },

        ensureConnected() {
            if (this.connectedEngine) {
                return {
                    success: true,
                    engine: this.connectedEngine
                };
            }

            return this.connect(global.KnowledgeEngine);
        },

        registerSystemKnowledge() {
            const connection = this.ensureConnected();

            if (!connection.success) {
                return connection;
            }

            const existing = this.connectedEngine.getRecordById(
                "knowledge-system-knowledge-memory"
            );

            if (existing) {
                return {
                    success: true,
                    duplicate: true,
                    record: existing
                };
            }

            return this.connectedEngine.createRecord({
                id: "knowledge-system-knowledge-memory",
                recordType: "system-component",
                title: "MEOS Knowledge Memory",
                summary:
                    "Passage-level institutional memory, document versioning, citations, cross-references, conflict detection, graph traversal, and executive recall.",
                tags: [
                    "meos-core",
                    "knowledge-memory",
                    "institutional-memory",
                    "system-component"
                ],
                topics: [
                    "document-memory",
                    "citations",
                    "knowledge-graph",
                    "executive-recall"
                ],
                authority: "system",
                confidence: 1,
                sensitivity: "internal",
                officeAccess: ["all"],
                metadata: {
                    componentVersion: this.version,
                    organizationNeutralCore: true
                },
                createdBy: "MEOS Knowledge Memory"
            });
        },

        ingestDocument(input = {}, options = {}) {
            const connection = this.ensureConnected();

            if (!connection.success) {
                return connection;
            }

            const normalized = this.normalizeDocumentInput(input, options);

            if (!normalized.title) {
                return {
                    success: false,
                    error: "Document ingestion requires a title."
                };
            }

            if (!normalized.text) {
                return {
                    success: false,
                    error:
                        "Document ingestion requires extracted text or plain-text content."
                };
            }

            const checksum = this.hashText(
                this.normalizeText(normalized.text)
            );

            const exactDuplicate = this.documents.find(
                (document) =>
                    document.checksum === checksum &&
                    document.status !== "archived"
            );

            if (exactDuplicate && normalized.allowDuplicate !== true) {
                return {
                    success: true,
                    duplicate: true,
                    document: exactDuplicate,
                    record: this.connectedEngine.getRecordById(
                        exactDuplicate.recordId
                    ),
                    passages: this.getPassagesForDocument(exactDuplicate.id)
                };
            }

            const logicalDocument = this.findLogicalDocument(normalized);
            const shouldCreateVersion =
                Boolean(logicalDocument) &&
                this.configuration.autoVersionDocuments &&
                normalized.createVersion !== false;

            if (shouldCreateVersion) {
                return this.createDocumentVersion(logicalDocument.id, {
                    ...input,
                    text: normalized.text,
                    title: normalized.title
                }, options);
            }

            const timestamp = new Date().toISOString();
            const documentId =
                normalized.id || this.createId("memory-document");
            const sourceId =
                normalized.sourceId || `source-${documentId}`;
            const recordId =
                normalized.recordId || `knowledge-${documentId}`;

            const sourceResult = this.connectedEngine.registerSource({
                id: sourceId,
                name: normalized.title,
                sourceType: normalized.sourceType,
                authority: normalized.authority,
                url: normalized.url,
                documentId,
                organization: normalized.organization,
                publishedAt: normalized.publishedAt,
                accessedAt: normalized.accessedAt || timestamp,
                checksum,
                description: normalized.description,
                metadata: {
                    mimeType: normalized.mimeType,
                    fileName: normalized.fileName,
                    sizeBytes: normalized.sizeBytes,
                    pageCount: normalized.pageCount,
                    language: normalized.language,
                    sensitivity: normalized.sensitivity,
                    originalDocumentId: normalized.originalDocumentId,
                    memoryManaged: true
                }
            });

            if (!sourceResult.success) {
                return sourceResult;
            }

            const chunks = this.chunkDocument(normalized.text, {
                chunkSize: normalized.chunkSize,
                overlap: normalized.chunkOverlap,
                sections: normalized.sections,
                pages: normalized.pages
            });

            const document = {
                id: documentId,
                logicalDocumentId:
                    normalized.logicalDocumentId || documentId,
                recordId,
                sourceId: sourceResult.source.id,
                title: normalized.title,
                description: normalized.description,
                documentType: normalized.documentType,
                sourceType: normalized.sourceType,
                authority: normalized.authority,
                sensitivity: normalized.sensitivity,
                officeAccess: normalized.officeAccess,
                tags: normalized.tags,
                topics: normalized.topics,
                language: normalized.language,
                url: normalized.url,
                fileName: normalized.fileName,
                mimeType: normalized.mimeType,
                sizeBytes: normalized.sizeBytes,
                pageCount: normalized.pageCount,
                checksum,
                versionNumber: 1,
                versionLabel: normalized.versionLabel || "1.0",
                previousVersionId: null,
                nextVersionId: null,
                isCurrentVersion: true,
                supersededAt: null,
                supersededByVersionId: null,
                effectiveDate: normalized.effectiveDate,
                expirationDate: normalized.expirationDate,
                publishedAt: normalized.publishedAt,
                ingestedAt: timestamp,
                createdAt: timestamp,
                updatedAt: timestamp,
                status: "active",
                passageIds: [],
                citationIds: [],
                crossReferenceIds: [],
                conflictIds: [],
                metadata: normalized.metadata
            };

            this.documents.push(document);

            const recordResult = this.connectedEngine.createRecord({
                id: recordId,
                recordType: "document-memory",
                title: normalized.title,
                summary:
                    normalized.summary ||
                    this.summarizeText(normalized.text, 360),
                content: {
                    description: normalized.description,
                    documentType: normalized.documentType,
                    language: normalized.language,
                    versionLabel: document.versionLabel,
                    passageCount: chunks.length,
                    checksum
                },
                tags: this.uniqueStrings([
                    "document-memory",
                    normalized.documentType,
                    ...normalized.tags
                ]),
                topics: normalized.topics,
                sourceIds: [sourceResult.source.id],
                relatedRecordIds: normalized.relatedRecordIds,
                officeAccess: normalized.officeAccess,
                sensitivity: normalized.sensitivity,
                authority: normalized.authority,
                confidence: normalized.confidence,
                effectiveDate: normalized.effectiveDate,
                expirationDate: normalized.expirationDate,
                createdBy: normalized.createdBy,
                allowDuplicate: true,
                metadata: {
                    ...normalized.metadata,
                    memoryDocumentId: documentId,
                    logicalDocumentId: document.logicalDocumentId,
                    versionNumber: 1,
                    versionLabel: document.versionLabel,
                    passageCount: chunks.length,
                    checksum,
                    memoryManaged: true,
                    currentVersion: true
                },
                timelineEvent: {
                    title: `${normalized.title} ingested`,
                    eventType: "document-ingested",
                    occurredAt: timestamp,
                    description:
                        "Document entered MEOS institutional memory."
                }
            });

            if (!recordResult.success) {
                this.documents = this.documents.filter(
                    (item) => item.id !== documentId
                );
                this.persistIfEnabled();
                return recordResult;
            }

            const createdPassages = chunks.map((chunk, index) =>
                this.createPassage(document, chunk, index)
            );

            const createdCitations = createdPassages.map((passage) =>
                this.createCitationForPassage(document, passage)
            );

            document.passageIds = createdPassages.map(
                (passage) => passage.id
            );
            document.citationIds = createdCitations.map(
                (citation) => citation.id
            );
            document.updatedAt = new Date().toISOString();

            this.connectedEngine.updateRecord(
                recordId,
                {
                    content: {
                        description: normalized.description,
                        documentType: normalized.documentType,
                        language: normalized.language,
                        versionLabel: document.versionLabel,
                        passageCount: createdPassages.length,
                        checksum,
                        citationIds: document.citationIds
                    },
                    metadata: {
                        ...recordResult.record.metadata,
                        passageCount: createdPassages.length,
                        citationCount: createdCitations.length
                    }
                },
                "MEOS Knowledge Memory"
            );

            this.createVersionEntry(document, {
                changeType: "initial",
                changeSummary: "Initial document ingestion.",
                createdBy: normalized.createdBy
            });

            if (this.configuration.autoCrossReference) {
                this.buildCrossReferences(document.id);
            }

            if (this.configuration.autoConflictDetection) {
                this.detectConflicts({
                    documentId: document.id
                });
            }

            this.logActivity("document.ingested", {
                documentId,
                recordId,
                title: document.title,
                passageCount: createdPassages.length
            });

            this.persistIfEnabled();
            this.emit("document:ingested", {
                document,
                record: recordResult.record,
                passages: createdPassages,
                citations: createdCitations
            });

            return {
                success: true,
                duplicate: false,
                versionCreated: false,
                document,
                record: this.connectedEngine.getRecordById(recordId),
                source: sourceResult.source,
                passages: createdPassages,
                citations: createdCitations
            };
        },

        createDocumentVersion(documentId, input = {}, options = {}) {
            const previous = this.getDocumentById(documentId);

            if (!previous) {
                return {
                    success: false,
                    error: "The document to version was not found."
                };
            }

            const normalized = this.normalizeDocumentInput(
                {
                    ...previous,
                    ...input,
                    logicalDocumentId: previous.logicalDocumentId,
                    relatedRecordIds: this.uniqueStrings([
                        ...(input.relatedRecordIds || []),
                        previous.recordId
                    ])
                },
                {
                    ...options,
                    createVersion: false,
                    allowDuplicate: true
                }
            );

            const checksum = this.hashText(
                this.normalizeText(normalized.text)
            );

            if (checksum === previous.checksum) {
                return {
                    success: true,
                    duplicate: true,
                    unchanged: true,
                    document: previous
                };
            }

            const nextVersionNumber =
                Math.max(
                    ...this.documents
                        .filter(
                            (document) =>
                                document.logicalDocumentId ===
                                previous.logicalDocumentId
                        )
                        .map((document) => document.versionNumber || 1)
                ) + 1;

            const result = this.ingestDocument(
                {
                    ...input,
                    id: input.id || this.createId("memory-document"),
                    title: normalized.title,
                    text: normalized.text,
                    logicalDocumentId: previous.logicalDocumentId,
                    versionLabel:
                        input.versionLabel ||
                        String(nextVersionNumber),
                    originalDocumentId:
                        previous.metadata?.originalDocumentId ||
                        previous.id,
                    metadata: {
                        ...previous.metadata,
                        ...(input.metadata || {}),
                        versionReason:
                            input.versionReason ||
                            options.versionReason ||
                            "Document updated."
                    }
                },
                {
                    ...options,
                    createVersion: false,
                    allowDuplicate: true
                }
            );

            if (!result.success) {
                return result;
            }

            const current = result.document;
            current.versionNumber = nextVersionNumber;
            current.previousVersionId = previous.id;
            current.logicalDocumentId = previous.logicalDocumentId;
            current.versionLabel =
                input.versionLabel || String(nextVersionNumber);

            previous.isCurrentVersion = false;
            previous.nextVersionId = current.id;
            previous.supersededAt = new Date().toISOString();
            previous.supersededByVersionId = current.id;
            previous.status = "superseded";
            previous.updatedAt = previous.supersededAt;

            const previousRecord =
                this.connectedEngine.getRecordById(previous.recordId);
            const currentRecord =
                this.connectedEngine.getRecordById(current.recordId);

            if (previousRecord) {
                this.connectedEngine.updateRecord(
                    previous.recordId,
                    {
                        status: "superseded",
                        metadata: {
                            ...previousRecord.metadata,
                            currentVersion: false,
                            supersededByDocumentId: current.id,
                            supersededAt: previous.supersededAt
                        }
                    },
                    "MEOS Knowledge Memory"
                );
            }

            if (currentRecord) {
                this.connectedEngine.updateRecord(
                    current.recordId,
                    {
                        metadata: {
                            ...currentRecord.metadata,
                            versionNumber: current.versionNumber,
                            versionLabel: current.versionLabel,
                            previousVersionDocumentId: previous.id,
                            currentVersion: true
                        }
                    },
                    "MEOS Knowledge Memory"
                );
            }

            this.connectedEngine.createRelationship({
                fromId: current.recordId,
                toId: previous.recordId,
                relationshipType: "supersedes",
                label: "supersedes",
                description:
                    "The current document version supersedes the previous version.",
                sourceRecordId: current.recordId,
                sourceIds: [current.sourceId],
                confidence: 1
            });

            this.connectedEngine.addTimelineEvent({
                title: `${current.title} version ${current.versionLabel}`,
                eventType: "document-version-created",
                occurredAt: current.createdAt,
                description:
                    input.versionReason ||
                    options.versionReason ||
                    "A new document version was created.",
                recordIds: [previous.recordId, current.recordId],
                sourceIds: [current.sourceId],
                confidence: 1,
                metadata: {
                    previousDocumentId: previous.id,
                    currentDocumentId: current.id,
                    versionNumber: current.versionNumber
                }
            });

            this.createVersionEntry(current, {
                changeType: "revision",
                previousDocumentId: previous.id,
                changeSummary:
                    input.versionReason ||
                    options.versionReason ||
                    "Document revised.",
                createdBy:
                    input.createdBy ||
                    options.createdBy ||
                    "MEOS Knowledge Memory"
            });

            this.persistIfEnabled();
            this.emit("document:version-created", {
                previous,
                current
            });

            return {
                ...result,
                versionCreated: true,
                previousDocument: previous,
                document: current
            };
        },

        chunkDocument(text, options = {}) {
            const normalizedText = String(text || "")
                .replace(/\r\n/g, "\n")
                .replace(/\r/g, "\n")
                .replace(/[ \t]+\n/g, "\n")
                .replace(/\n{3,}/g, "\n\n")
                .trim();

            if (!normalizedText) {
                return [];
            }

            const chunkSize = this.clamp(
                Number(options.chunkSize) ||
                    this.configuration.defaultChunkSize,
                this.configuration.minimumChunkSize,
                this.configuration.maximumChunkSize
            );

            const overlap = this.clamp(
                Number(options.overlap) ||
                    this.configuration.defaultChunkOverlap,
                0,
                Math.floor(chunkSize / 2)
            );

            const sections = this.detectSections(normalizedText);
            const chunks = [];

            sections.forEach((section, sectionIndex) => {
                const sectionChunks = this.chunkSectionText(
                    section.text,
                    chunkSize,
                    overlap
                );

                sectionChunks.forEach((chunk, chunkIndex) => {
                    chunks.push({
                        text: chunk.text,
                        sectionTitle: section.title,
                        sectionIndex,
                        chunkIndex,
                        characterStart:
                            section.characterStart + chunk.characterStart,
                        characterEnd:
                            section.characterStart + chunk.characterEnd,
                        pageNumber: this.resolvePageNumber(
                            section.characterStart + chunk.characterStart,
                            options.pages
                        ),
                        metadata: {
                            detectedHeading: section.title,
                            sectionDepth: section.depth
                        }
                    });
                });
            });

            return chunks;
        },

        detectSections(text) {
            const lines = text.split("\n");
            const sections = [];
            let current = {
                title: "Document",
                depth: 0,
                textParts: [],
                characterStart: 0
            };
            let cursor = 0;

            const flush = () => {
                const sectionText = current.textParts.join("\n").trim();

                if (sectionText) {
                    sections.push({
                        title: current.title,
                        depth: current.depth,
                        text: sectionText,
                        characterStart: current.characterStart
                    });
                }
            };

            lines.forEach((line) => {
                const trimmed = line.trim();
                const heading = this.detectHeading(trimmed);

                if (heading) {
                    flush();
                    current = {
                        title: heading.title,
                        depth: heading.depth,
                        textParts: [],
                        characterStart: cursor + line.length + 1
                    };
                } else {
                    current.textParts.push(line);
                }

                cursor += line.length + 1;
            });

            flush();

            if (sections.length === 0) {
                return [
                    {
                        title: "Document",
                        depth: 0,
                        text,
                        characterStart: 0
                    }
                ];
            }

            return sections;
        },

        detectHeading(line) {
            if (!line || line.length > 140) {
                return null;
            }

            const markdown = line.match(/^(#{1,6})\s+(.+)$/);

            if (markdown) {
                return {
                    depth: markdown[1].length,
                    title: markdown[2].trim()
                };
            }

            const numbered = line.match(
                /^((\d+(\.\d+)*)|([IVXLC]+)|([A-Z]))[.)]?\s+(.{2,100})$/
            );

            if (numbered && !/[.!?]$/.test(line)) {
                return {
                    depth: String(numbered[1]).split(".").length,
                    title: line
                };
            }

            const isUpper =
                line.length >= 3 &&
                line === line.toUpperCase() &&
                /[A-Z]/.test(line) &&
                !/[.!?]$/.test(line);

            if (isUpper) {
                return {
                    depth: 1,
                    title: line
                };
            }

            const titleCaseWords = line
                .split(/\s+/)
                .filter(Boolean);
            const titleCase =
                titleCaseWords.length >= 1 &&
                titleCaseWords.length <= 10 &&
                titleCaseWords.every((word) =>
                    /^[A-Z0-9][A-Za-z0-9/&(),:'’-]*$/.test(word)
                ) &&
                !/[.!?]$/.test(line);

            if (titleCase) {
                return {
                    depth: 2,
                    title: line
                };
            }

            return null;
        },

        chunkSectionText(text, chunkSize, overlap) {
            if (text.length <= chunkSize) {
                return [
                    {
                        text,
                        characterStart: 0,
                        characterEnd: text.length
                    }
                ];
            }

            const chunks = [];
            let start = 0;

            while (start < text.length) {
                let end = Math.min(start + chunkSize, text.length);

                if (end < text.length) {
                    const candidate = text.slice(start, end);
                    const breakPoints = [
                        candidate.lastIndexOf("\n\n"),
                        candidate.lastIndexOf(". "),
                        candidate.lastIndexOf("? "),
                        candidate.lastIndexOf("! "),
                        candidate.lastIndexOf("; "),
                        candidate.lastIndexOf(", ")
                    ].filter((point) => point >= chunkSize * 0.55);

                    if (breakPoints.length > 0) {
                        end = start + Math.max(...breakPoints) + 1;
                    }
                }

                const chunkText = text.slice(start, end).trim();

                if (chunkText) {
                    chunks.push({
                        text: chunkText,
                        characterStart: start,
                        characterEnd: end
                    });
                }

                if (end >= text.length) {
                    break;
                }

                const nextStart = Math.max(end - overlap, start + 1);
                start = nextStart;
            }

            return chunks;
        },

        createPassage(document, chunk, index) {
            const timestamp = new Date().toISOString();
            const passage = {
                id: this.createId("memory-passage"),
                documentId: document.id,
                logicalDocumentId: document.logicalDocumentId,
                recordId: document.recordId,
                sourceId: document.sourceId,
                versionNumber: document.versionNumber,
                sequence: index + 1,
                text: chunk.text,
                normalizedText: this.normalizeText(chunk.text),
                summary: this.summarizeText(chunk.text, 220),
                sectionTitle: chunk.sectionTitle || "Document",
                sectionIndex: chunk.sectionIndex ?? 0,
                chunkIndex: chunk.chunkIndex ?? index,
                pageNumber: chunk.pageNumber || null,
                characterStart: chunk.characterStart ?? null,
                characterEnd: chunk.characterEnd ?? null,
                tokenEstimate: this.estimateTokens(chunk.text),
                keywords: this.extractKeywords(chunk.text, 18),
                entities: this.extractCandidateEntities(chunk.text),
                fingerprint: this.hashText(
                    this.normalizeText(chunk.text)
                ),
                status: "active",
                createdAt: timestamp,
                updatedAt: timestamp,
                metadata: chunk.metadata || {}
            };

            this.passages.push(passage);
            return passage;
        },

        createCitationForPassage(document, passage) {
            const citation = {
                id: this.createId("memory-citation"),
                documentId: document.id,
                passageId: passage.id,
                recordId: document.recordId,
                sourceId: document.sourceId,
                title: document.title,
                versionLabel: document.versionLabel,
                sectionTitle: passage.sectionTitle,
                pageNumber: passage.pageNumber,
                passageSequence: passage.sequence,
                characterStart: passage.characterStart,
                characterEnd: passage.characterEnd,
                url: document.url || "",
                citationLabel: this.formatCitationLabel(
                    document,
                    passage
                ),
                excerpt: this.summarizeText(passage.text, 280),
                createdAt: new Date().toISOString(),
                status: "active"
            };

            this.citations.push(citation);
            return citation;
        },

        formatCitationLabel(document, passage) {
            const location = [];

            if (passage.pageNumber) {
                location.push(`p. ${passage.pageNumber}`);
            }

            if (passage.sectionTitle) {
                location.push(passage.sectionTitle);
            }

            location.push(`passage ${passage.sequence}`);

            return `${document.title} (${document.versionLabel}), ${location.join(
                ", "
            )}`;
        },

        query(input = {}, options = {}) {
            const request =
                typeof input === "string"
                    ? {
                          query: input,
                          ...options
                      }
                    : {
                          ...input
                      };

            const queryText = String(request.query || "").trim();

            if (!queryText) {
                return {
                    success: false,
                    error: "Knowledge Memory query requires text."
                };
            }

            const queryTerms = this.extractQueryTerms(queryText);
            const phrase = this.normalizeText(queryText);
            const limit =
                Number(request.limit) ||
                this.configuration.maximumQueryResults;

            const passageResults = this.passages
                .filter((passage) =>
                    this.canAccessPassage(passage, request.office)
                )
                .filter((passage) =>
                    this.passageMatchesFilters(passage, request)
                )
                .map((passage) => ({
                    resultType: "passage",
                    score: this.scorePassage(
                        passage,
                        queryTerms,
                        phrase,
                        request
                    ),
                    passage,
                    document: this.getDocumentById(
                        passage.documentId
                    ),
                    citation: this.getCitationByPassageId(
                        passage.id
                    )
                }))
                .filter((result) => result.score > 0);

            const coreResult = this.connectedEngine
                ? this.connectedEngine.search(queryText, {
                      office: request.office,
                      limit
                  })
                : {
                      success: false,
                      results: []
                  };

            const recordResults = coreResult.success
                ? coreResult.results.map((result) => ({
                      resultType: result.resultType,
                      score: result.score * 0.72,
                      item: result.item
                  }))
                : [];

            const results = [
                ...passageResults,
                ...recordResults
            ]
                .sort((first, second) => second.score - first.score)
                .slice(0, limit);

            const queryEntry = {
                id: this.createId("memory-query"),
                query: queryText,
                normalizedQuery: phrase,
                terms: queryTerms,
                options: this.safeClone(request),
                resultCount: results.length,
                createdAt: new Date().toISOString()
            };

            this.queryLog.push(queryEntry);

            if (this.queryLog.length > 1000) {
                this.queryLog = this.queryLog.slice(-1000);
            }

            this.persistIfEnabled();
            this.emit("query:completed", {
                request: queryEntry,
                results
            });

            return {
                success: true,
                request: queryEntry,
                results,
                passages: results
                    .filter(
                        (result) =>
                            result.resultType === "passage"
                    )
                    .map((result) => result.passage),
                citations: this.dedupeById(
                    results
                        .filter((result) => result.citation)
                        .map((result) => result.citation)
                )
            };
        },

        executiveRecall(input = {}) {
            const request =
                typeof input === "string"
                    ? {
                          query: input
                      }
                    : {
                          ...input
                      };

            const queryText = String(request.query || "").trim();

            if (!queryText) {
                return {
                    success: false,
                    error: "Executive recall requires a question or topic."
                };
            }

            const queryResult = this.query({
                ...request,
                limit:
                    request.limit ||
                    this.configuration.maximumRecallPassages
            });

            if (!queryResult.success) {
                return queryResult;
            }

            const passageResults = queryResult.results.filter(
                (result) =>
                    result.resultType === "passage" &&
                    result.passage
            );

            const seedRecordIds = this.uniqueStrings([
                ...(request.recordIds || []),
                ...passageResults.map(
                    (result) => result.passage.recordId
                )
            ]);

            const context =
                this.connectedEngine?.getKnowledgeContext?.({
                    recordIds: seedRecordIds,
                    entityIds: request.entityIds || []
                }) || {
                    records: [],
                    entities: [],
                    relationships: []
                };

            const timelines =
                this.connectedEngine?.resolveTimelineForRecords?.(
                    context.records || []
                ) || [];

            const decisions = this.findDecisionRecords(
                queryText,
                request.office
            );

            const blockers = this.findBlockers(
                queryText,
                request.office
            );

            const lessons = this.findLessonsLearned(
                queryText,
                request.office
            );

            const conflicts = this.findRelevantConflicts(
                passageResults.map(
                    (result) => result.passage.id
                )
            );

            const currentDocuments = this.dedupeById(
                passageResults
                    .map((result) => result.document)
                    .filter(
                        (document) =>
                            document &&
                            document.isCurrentVersion
                    )
            );

            const citations = this.dedupeById(
                passageResults
                    .map((result) => result.citation)
                    .filter(Boolean)
            );

            const memoryStrength = this.calculateMemoryStrength({
                passageResults,
                decisions,
                blockers,
                lessons,
                conflicts,
                citations
            });

            const executiveContext = {
                question: queryText,
                answerStatus:
                    passageResults.length > 0 ||
                    context.records.length > 0
                        ? "institutional-memory-found"
                        : "no-institutional-memory-found",
                memoryStrength,
                generatedAt: new Date().toISOString(),

                executiveSummary: this.buildRecallSummary({
                    queryText,
                    passageResults,
                    decisions,
                    blockers,
                    lessons,
                    conflicts
                }),

                whatWeKnow: passageResults.map((result) => ({
                    statement: result.passage.summary,
                    score: result.score,
                    documentId: result.passage.documentId,
                    passageId: result.passage.id,
                    citationId: result.citation?.id || null
                })),

                decisions,
                blockers,
                lessonsLearned: lessons,
                conflicts,
                records: context.records || [],
                entities: context.entities || [],
                relationships: context.relationships || [],
                timeline: timelines,
                documents: currentDocuments,
                passages: passageResults.map(
                    (result) => result.passage
                ),
                citations,

                recommendedFollowUp: this.buildFollowUpQuestions({
                    queryText,
                    passageResults,
                    conflicts,
                    blockers
                })
            };

            this.logActivity("executive.recall", {
                query: queryText,
                passageCount: executiveContext.passages.length,
                recordCount: executiveContext.records.length,
                citationCount: executiveContext.citations.length,
                memoryStrength
            });

            this.emit("executive:recall-completed", executiveContext);

            return {
                success: true,
                ...executiveContext
            };
        },

        buildCrossReferences(documentId, options = {}) {
            const document = this.getDocumentById(documentId);

            if (!document) {
                return {
                    success: false,
                    error: "Document not found."
                };
            }

            const documentPassages =
                this.getPassagesForDocument(documentId);
            const candidateDocuments = this.documents.filter(
                (candidate) =>
                    candidate.id !== documentId &&
                    candidate.status !== "archived" &&
                    candidate.isCurrentVersion
            );

            const created = [];

            candidateDocuments.forEach((candidate) => {
                const candidatePassages =
                    this.getPassagesForDocument(candidate.id);

                const similarity = this.calculateDocumentSimilarity(
                    documentPassages,
                    candidatePassages
                );

                const sharedKeywords = this.intersection(
                    this.uniqueStrings(
                        documentPassages.flatMap(
                            (passage) => passage.keywords
                        )
                    ),
                    this.uniqueStrings(
                        candidatePassages.flatMap(
                            (passage) => passage.keywords
                        )
                    )
                );

                const sharedEntities = this.intersection(
                    this.uniqueStrings(
                        documentPassages.flatMap(
                            (passage) => passage.entities
                        )
                    ),
                    this.uniqueStrings(
                        candidatePassages.flatMap(
                            (passage) => passage.entities
                        )
                    )
                );

                const score =
                    similarity * 0.65 +
                    Math.min(sharedKeywords.length / 12, 1) *
                        0.2 +
                    Math.min(sharedEntities.length / 8, 1) *
                        0.15;

                if (
                    score <
                    (Number(options.threshold) ||
                        this.configuration
                            .crossReferenceThreshold)
                ) {
                    return;
                }

                const existing =
                    this.crossReferences.find(
                        (reference) =>
                            reference.status === "active" &&
                            ((reference.fromDocumentId ===
                                document.id &&
                                reference.toDocumentId ===
                                    candidate.id) ||
                                (reference.fromDocumentId ===
                                    candidate.id &&
                                    reference.toDocumentId ===
                                        document.id))
                    );

                if (existing) {
                    existing.score = Math.max(
                        existing.score,
                        score
                    );
                    existing.sharedKeywords =
                        this.uniqueStrings([
                            ...existing.sharedKeywords,
                            ...sharedKeywords
                        ]);
                    existing.sharedEntities =
                        this.uniqueStrings([
                            ...existing.sharedEntities,
                            ...sharedEntities
                        ]);
                    existing.updatedAt =
                        new Date().toISOString();
                    return;
                }

                const reference = {
                    id: this.createId(
                        "memory-cross-reference"
                    ),
                    fromDocumentId: document.id,
                    toDocumentId: candidate.id,
                    fromRecordId: document.recordId,
                    toRecordId: candidate.recordId,
                    relationshipType:
                        this.inferCrossReferenceType(
                            document,
                            candidate,
                            sharedKeywords,
                            sharedEntities
                        ),
                    score: this.round(score, 4),
                    sharedKeywords,
                    sharedEntities,
                    explanation:
                        this.explainCrossReference(
                            document,
                            candidate,
                            sharedKeywords,
                            sharedEntities
                        ),
                    status: "active",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                this.crossReferences.push(reference);
                document.crossReferenceIds.push(reference.id);
                candidate.crossReferenceIds.push(reference.id);

                this.connectedEngine.createRelationship({
                    fromId: document.recordId,
                    toId: candidate.recordId,
                    relationshipType:
                        reference.relationshipType,
                    label:
                        reference.relationshipType,
                    description: reference.explanation,
                    sourceRecordId: document.recordId,
                    sourceIds: [
                        document.sourceId,
                        candidate.sourceId
                    ],
                    confidence: Math.min(score, 1),
                    directional: false,
                    metadata: {
                        knowledgeMemoryCrossReferenceId:
                            reference.id,
                        sharedKeywords,
                        sharedEntities
                    }
                });

                created.push(reference);
            });

            document.updatedAt = new Date().toISOString();

            this.persistIfEnabled();
            this.emit("cross-references:built", {
                documentId,
                created
            });

            return {
                success: true,
                document,
                created,
                totalCrossReferences:
                    document.crossReferenceIds.length
            };
        },

        detectConflicts(input = {}) {
            const targetDocument = input.documentId
                ? this.getDocumentById(input.documentId)
                : null;

            const targetPassages = targetDocument
                ? this.getPassagesForDocument(
                      targetDocument.id
                  )
                : this.passages.filter(
                      (passage) =>
                          passage.status === "active"
                  );

            const candidatePassages = this.passages.filter(
                (passage) =>
                    passage.status === "active" &&
                    (!targetDocument ||
                        passage.documentId !==
                            targetDocument.id)
            );

            const created = [];

            targetPassages.forEach((left) => {
                candidatePassages.forEach((right) => {
                    if (
                        left.logicalDocumentId ===
                        right.logicalDocumentId
                    ) {
                        return;
                    }

                    if (left.id >= right.id && !targetDocument) {
                        return;
                    }

                    const topicSimilarity =
                        this.jaccardSimilarity(
                            left.keywords,
                            right.keywords
                        );

                    if (
                        topicSimilarity <
                        this.configuration
                            .conflictSimilarityThreshold
                    ) {
                        return;
                    }

                    const contradiction =
                        this.detectContradictionSignals(
                            left.text,
                            right.text
                        );

                    if (!contradiction.isPotentialConflict) {
                        return;
                    }

                    const existing = this.conflicts.find(
                        (conflict) =>
                            conflict.status !== "resolved" &&
                            ((conflict.leftPassageId ===
                                left.id &&
                                conflict.rightPassageId ===
                                    right.id) ||
                                (conflict.leftPassageId ===
                                    right.id &&
                                    conflict.rightPassageId ===
                                        left.id))
                    );

                    if (existing) {
                        return;
                    }

                    const conflict = {
                        id: this.createId(
                            "memory-conflict"
                        ),
                        conflictType:
                            contradiction.conflictType,
                        leftPassageId: left.id,
                        rightPassageId: right.id,
                        leftDocumentId: left.documentId,
                        rightDocumentId:
                            right.documentId,
                        leftRecordId: left.recordId,
                        rightRecordId: right.recordId,
                        topicSimilarity:
                            this.round(
                                topicSimilarity,
                                4
                            ),
                        confidence:
                            contradiction.confidence,
                        explanation:
                            contradiction.explanation,
                        signals: contradiction.signals,
                        status: "open",
                        resolution: null,
                        resolvedAt: null,
                        resolvedBy: null,
                        createdAt:
                            new Date().toISOString(),
                        updatedAt:
                            new Date().toISOString()
                    };

                    this.conflicts.push(conflict);

                    const leftDocument =
                        this.getDocumentById(
                            left.documentId
                        );
                    const rightDocument =
                        this.getDocumentById(
                            right.documentId
                        );

                    leftDocument?.conflictIds.push(
                        conflict.id
                    );
                    rightDocument?.conflictIds.push(
                        conflict.id
                    );

                    created.push(conflict);
                });
            });

            this.persistIfEnabled();

            if (created.length > 0) {
                this.emit("conflicts:detected", {
                    conflicts: created
                });
            }

            return {
                success: true,
                created,
                openConflictCount: this.conflicts.filter(
                    (conflict) =>
                        conflict.status === "open"
                ).length
            };
        },

        resolveConflict(
            conflictId,
            resolution = {},
            actor = "Executive"
        ) {
            const conflict = this.getConflictById(conflictId);

            if (!conflict) {
                return {
                    success: false,
                    error: "Conflict not found."
                };
            }

            conflict.status =
                resolution.status || "resolved";
            conflict.resolution =
                resolution.summary ||
                resolution.resolution ||
                "";
            conflict.authoritativePassageId =
                resolution.authoritativePassageId ||
                null;
            conflict.resolvedAt =
                new Date().toISOString();
            conflict.resolvedBy = actor;
            conflict.updatedAt =
                conflict.resolvedAt;

            if (conflict.authoritativePassageId) {
                const authoritative =
                    this.getPassageById(
                        conflict.authoritativePassageId
                    );
                const other =
                    conflict.leftPassageId ===
                    conflict.authoritativePassageId
                        ? this.getPassageById(
                              conflict.rightPassageId
                          )
                        : this.getPassageById(
                              conflict.leftPassageId
                          );

                if (authoritative && other) {
                    this.connectedEngine.createRelationship({
                        fromId: authoritative.recordId,
                        toId: other.recordId,
                        relationshipType:
                            "takes-precedence-over",
                        label: "takes precedence over",
                        description:
                            conflict.resolution ||
                            "Executive conflict resolution established authority.",
                        sourceRecordId:
                            authoritative.recordId,
                        sourceIds: [
                            authoritative.sourceId
                        ],
                        confidence: 1
                    });
                }
            }

            this.persistIfEnabled();
            this.emit("conflict:resolved", conflict);

            return {
                success: true,
                conflict
            };
        },

        traceKnowledgeGraph(input = {}) {
            const startIds = this.uniqueStrings([
                ...(input.recordIds || []),
                ...(input.entityIds || []),
                ...(input.documentIds || [])
                    .map((documentId) =>
                        this.getDocumentById(documentId)
                    )
                    .filter(Boolean)
                    .map((document) => document.recordId)
            ]);

            if (startIds.length === 0) {
                return {
                    success: false,
                    error:
                        "Graph traversal requires at least one record, entity, or document identifier."
                };
            }

            const maxDepth = this.clamp(
                Number(input.maxDepth) ||
                    this.configuration.maximumGraphDepth,
                1,
                10
            );

            const maxNodes = this.clamp(
                Number(input.maxNodes) ||
                    this.configuration.maximumGraphNodes,
                10,
                2000
            );

            const queue = startIds.map((id) => ({
                id,
                depth: 0,
                path: [id]
            }));
            const visited = new Set();
            const nodes = [];
            const edges = [];
            const paths = [];

            while (
                queue.length > 0 &&
                nodes.length < maxNodes
            ) {
                const current = queue.shift();

                if (visited.has(current.id)) {
                    continue;
                }

                visited.add(current.id);

                const node = this.resolveGraphNode(
                    current.id
                );

                if (!node) {
                    continue;
                }

                nodes.push({
                    id: current.id,
                    nodeType: node.nodeType,
                    item: node.item,
                    depth: current.depth
                });

                paths.push(current.path);

                if (current.depth >= maxDepth) {
                    continue;
                }

                const connectedEdges =
                    this.getGraphEdgesForNode(
                        current.id
                    );

                connectedEdges.forEach((edge) => {
                    const neighborId =
                        edge.fromId === current.id
                            ? edge.toId
                            : edge.fromId;

                    edges.push(edge);

                    if (!visited.has(neighborId)) {
                        queue.push({
                            id: neighborId,
                            depth: current.depth + 1,
                            path: [
                                ...current.path,
                                edge.id,
                                neighborId
                            ]
                        });
                    }
                });
            }

            return {
                success: true,
                startIds,
                maxDepth,
                nodeCount: nodes.length,
                edgeCount: this.dedupeById(edges)
                    .length,
                nodes,
                edges: this.dedupeById(edges),
                paths,
                truncated:
                    queue.length > 0 ||
                    nodes.length >= maxNodes
            };
        },

        getCitations(input = {}) {
            const citationIds =
                this.uniqueStrings(
                    input.citationIds || []
                );
            const passageIds =
                this.uniqueStrings(
                    input.passageIds || []
                );
            const documentIds =
                this.uniqueStrings(
                    input.documentIds || []
                );
            const recordIds =
                this.uniqueStrings(
                    input.recordIds || []
                );

            return this.citations.filter(
                (citation) =>
                    citation.status === "active" &&
                    (citationIds.includes(citation.id) ||
                        passageIds.includes(
                            citation.passageId
                        ) ||
                        documentIds.includes(
                            citation.documentId
                        ) ||
                        recordIds.includes(
                            citation.recordId
                        ))
            );
        },

        getDocumentHistory(documentId) {
            const document = this.getDocumentById(documentId);

            if (!document) {
                return {
                    success: false,
                    error: "Document not found."
                };
            }

            const family = this.documents
                .filter(
                    (item) =>
                        item.logicalDocumentId ===
                        document.logicalDocumentId
                )
                .sort(
                    (first, second) =>
                        first.versionNumber -
                        second.versionNumber
                );

            return {
                success: true,
                logicalDocumentId:
                    document.logicalDocumentId,
                currentVersion:
                    family.find(
                        (item) => item.isCurrentVersion
                    ) || null,
                versions: family,
                versionEntries: this.versions
                    .filter(
                        (entry) =>
                            entry.logicalDocumentId ===
                            document.logicalDocumentId
                    )
                    .sort(
                        (first, second) =>
                            new Date(first.createdAt) -
                            new Date(second.createdAt)
                    )
            };
        },

        reconcileWithKnowledgeEngine() {
            if (!this.connectedEngine) {
                return {
                    success: false,
                    error: "Knowledge Engine is unavailable."
                };
            }

            let repaired = 0;

            this.documents.forEach((document) => {
                const record =
                    this.connectedEngine.getRecordById(
                        document.recordId
                    );

                if (!record) {
                    const result =
                        this.connectedEngine.createRecord({
                            id: document.recordId,
                            recordType: "document-memory",
                            title: document.title,
                            summary:
                                document.description ||
                                "Recovered MEOS document-memory record.",
                            content: {
                                documentType:
                                    document.documentType,
                                versionLabel:
                                    document.versionLabel,
                                passageCount:
                                    document.passageIds.length,
                                checksum:
                                    document.checksum
                            },
                            tags: [
                                "document-memory",
                                document.documentType
                            ],
                            topics: document.topics,
                            sourceIds: [
                                document.sourceId
                            ],
                            officeAccess:
                                document.officeAccess,
                            sensitivity:
                                document.sensitivity,
                            authority:
                                document.authority,
                            confidence: 1,
                            allowDuplicate: true,
                            metadata: {
                                memoryDocumentId:
                                    document.id,
                                logicalDocumentId:
                                    document.logicalDocumentId,
                                memoryManaged: true,
                                recovered: true
                            },
                            createdBy:
                                "MEOS Knowledge Memory"
                        });

                    if (result.success) {
                        repaired += 1;
                    }
                }
            });

            this.logActivity("memory.reconciled", {
                repaired
            });

            return {
                success: true,
                repaired
            };
        },

        handleKnowledgeRecordCreated(record) {
            if (
                !record ||
                record.metadata?.memoryManaged === true ||
                record.id ===
                    "knowledge-system-knowledge-memory"
            ) {
                return;
            }

            if (
                record.recordType === "document" &&
                typeof record.content === "string" &&
                record.content.trim().length >
                    this.configuration.minimumChunkSize
            ) {
                this.ingestDocument(
                    {
                        title: record.title,
                        summary: record.summary,
                        text: record.content,
                        documentType:
                            record.metadata?.documentType ||
                            "document",
                        sourceId:
                            record.sourceIds?.[0] ||
                            null,
                        recordId: record.id,
                        tags: record.tags,
                        topics: record.topics,
                        officeAccess:
                            record.officeAccess,
                        sensitivity:
                            record.sensitivity,
                        authority:
                            record.authority,
                        confidence:
                            record.confidence,
                        effectiveDate:
                            record.effectiveDate,
                        expirationDate:
                            record.expirationDate,
                        createdBy:
                            "Knowledge Engine",
                        metadata: {
                            importedFromKnowledgeRecord:
                                true
                        }
                    },
                    {
                        allowDuplicate: true
                    }
                );
            }
        },

        handleKnowledgeRecordUpdated(record) {
            if (
                !record ||
                record.metadata?.memoryManaged !== true
            ) {
                return;
            }

            const documentId =
                record.metadata?.memoryDocumentId;
            const document =
                this.getDocumentById(documentId);

            if (!document) {
                return;
            }

            document.title =
                record.title || document.title;
            document.description =
                record.summary || document.description;
            document.sensitivity =
                record.sensitivity ||
                document.sensitivity;
            document.officeAccess =
                record.officeAccess ||
                document.officeAccess;
            document.authority =
                record.authority ||
                document.authority;
            document.status =
                record.status ||
                document.status;
            document.updatedAt =
                new Date().toISOString();

            this.persistIfEnabled();
        },

        findLogicalDocument(normalized) {
            if (normalized.logicalDocumentId) {
                return (
                    this.documents.find(
                        (document) =>
                            document.logicalDocumentId ===
                                normalized.logicalDocumentId &&
                            document.isCurrentVersion
                    ) || null
                );
            }

            const normalizedTitle =
                this.normalizeText(normalized.title);

            return (
                this.documents.find(
                    (document) =>
                        document.isCurrentVersion &&
                        this.normalizeText(
                            document.title
                        ) === normalizedTitle &&
                        (document.documentType ===
                            normalized.documentType ||
                            document.fileName ===
                                normalized.fileName)
                ) || null
            );
        },

        createVersionEntry(document, input = {}) {
            const entry = {
                id: this.createId("memory-version"),
                documentId: document.id,
                logicalDocumentId:
                    document.logicalDocumentId,
                recordId: document.recordId,
                versionNumber:
                    document.versionNumber,
                versionLabel:
                    document.versionLabel,
                previousDocumentId:
                    input.previousDocumentId ||
                    document.previousVersionId ||
                    null,
                changeType:
                    input.changeType || "revision",
                changeSummary:
                    input.changeSummary || "",
                checksum: document.checksum,
                createdBy:
                    input.createdBy ||
                    "MEOS Knowledge Memory",
                createdAt:
                    new Date().toISOString()
            };

            this.versions.push(entry);
            return entry;
        },

        findDecisionRecords(query, office) {
            if (!this.connectedEngine) {
                return [];
            }

            const results =
                this.connectedEngine.search(query, {
                    office,
                    limit: 50
                });

            if (!results.success) {
                return [];
            }

            const decisionTypes = new Set([
                "decision",
                "board-decision",
                "executive-approval",
                "resolution",
                "policy",
                "executive-briefing"
            ]);

            return results.results
                .filter(
                    (result) =>
                        result.resultType === "record" &&
                        decisionTypes.has(
                            result.item.recordType
                        )
                )
                .map((result) => ({
                    score: result.score,
                    record: result.item
                }))
                .slice(0, 10);
        },

        findBlockers(query, office) {
            if (!this.connectedEngine) {
                return [];
            }

            const results =
                this.connectedEngine.search(
                    `${query} waiting blocked dependency approval`,
                    {
                        office,
                        limit: 60
                    }
                );

            if (!results.success) {
                return [];
            }

            return results.results
                .filter(
                    (result) =>
                        result.resultType === "record"
                )
                .map((result) => result.item)
                .filter((record) => {
                    const text = this.normalizeText(
                        JSON.stringify({
                            title: record.title,
                            summary: record.summary,
                            content: record.content,
                            metadata: record.metadata,
                            tags: record.tags
                        })
                    );

                    return [
                        "waiting",
                        "blocked",
                        "dependency",
                        "approval needed",
                        "pending approval"
                    ].some((signal) =>
                        text.includes(signal)
                    );
                })
                .slice(0, 10);
        },

        findLessonsLearned(query, office) {
            if (!this.connectedEngine) {
                return [];
            }

            const results =
                this.connectedEngine.search(
                    `${query} lessons learned retrospective outcome`,
                    {
                        office,
                        limit: 50
                    }
                );

            if (!results.success) {
                return [];
            }

            return results.results
                .filter(
                    (result) =>
                        result.resultType === "record" &&
                        [
                            "lessons-learned",
                            "retrospective",
                            "mission-outcome"
                        ].includes(
                            result.item.recordType
                        )
                )
                .map((result) => result.item)
                .slice(0, 10);
        },

        findRelevantConflicts(passageIds) {
            const passageIdSet = new Set(passageIds);

            return this.conflicts.filter(
                (conflict) =>
                    conflict.status === "open" &&
                    (passageIdSet.has(
                        conflict.leftPassageId
                    ) ||
                        passageIdSet.has(
                            conflict.rightPassageId
                        ))
            );
        },

        buildRecallSummary(input) {
            const parts = [];

            if (input.passageResults.length > 0) {
                parts.push(
                    `MEOS found ${input.passageResults.length} relevant institutional-memory passage${
                        input.passageResults.length === 1
                            ? ""
                            : "s"
                    }.`
                );
            } else {
                parts.push(
                    "MEOS did not find a directly relevant document passage."
                );
            }

            if (input.decisions.length > 0) {
                parts.push(
                    `${input.decisions.length} relevant decision or authority record${
                        input.decisions.length === 1
                            ? " was"
                            : "s were"
                    } located.`
                );
            }

            if (input.blockers.length > 0) {
                parts.push(
                    `${input.blockers.length} possible blocker${
                        input.blockers.length === 1
                            ? ""
                            : "s"
                    } may require attention.`
                );
            }

            if (input.lessons.length > 0) {
                parts.push(
                    `${input.lessons.length} lessons-learned record${
                        input.lessons.length === 1
                            ? " is"
                            : "s are"
                    } available.`
                );
            }

            if (input.conflicts.length > 0) {
                parts.push(
                    `${input.conflicts.length} unresolved knowledge conflict${
                        input.conflicts.length === 1
                            ? ""
                            : "s"
                    } should be reviewed before relying on the answer.`
                );
            }

            return parts.join(" ");
        },

        buildFollowUpQuestions(input) {
            const questions = [];

            if (input.passageResults.length === 0) {
                questions.push(
                    "Which document, mission, person, program, or date should MEOS search next?"
                );
            }

            if (input.conflicts.length > 0) {
                questions.push(
                    "Which source should be treated as authoritative?"
                );
            }

            if (input.blockers.length > 0) {
                questions.push(
                    "Should MEOS prepare the next action for the highest-priority blocker?"
                );
            }

            if (input.passageResults.length > 0) {
                questions.push(
                    "Should MEOS trace the related decisions, people, documents, and timeline?"
                );
            }

            return questions.slice(0, 4);
        },

        calculateMemoryStrength(input) {
            const passageScore = Math.min(
                input.passageResults.length / 8,
                1
            );
            const citationScore = Math.min(
                input.citations.length / 6,
                1
            );
            const authorityScore = Math.min(
                input.decisions.length / 3,
                1
            );
            const lessonScore = Math.min(
                input.lessons.length / 3,
                1
            );
            const conflictPenalty = Math.min(
                input.conflicts.length * 0.1,
                0.4
            );

            return this.round(
                Math.max(
                    0,
                    passageScore * 0.45 +
                        citationScore * 0.25 +
                        authorityScore * 0.2 +
                        lessonScore * 0.1 -
                        conflictPenalty
                ),
                3
            );
        },

        scorePassage(
            passage,
            terms,
            phrase,
            request
        ) {
            const text = passage.normalizedText;
            const summary =
                this.normalizeText(passage.summary);
            const section =
                this.normalizeText(
                    passage.sectionTitle
                );
            const keywords =
                this.normalizeText(
                    passage.keywords.join(" ")
                );
            const entities =
                this.normalizeText(
                    passage.entities.join(" ")
                );

            let score = 0;

            if (phrase && text.includes(phrase)) {
                score += 80;
            }

            terms.forEach((term) => {
                if (section === term) score += 32;
                if (section.includes(term)) score += 20;
                if (keywords.includes(term)) score += 15;
                if (entities.includes(term)) score += 14;
                if (summary.includes(term)) score += 10;

                const occurrences =
                    this.countOccurrences(text, term);
                score += Math.min(occurrences * 5, 25);
            });

            const allTermsMatch = terms.every(
                (term) =>
                    text.includes(term) ||
                    summary.includes(term) ||
                    section.includes(term) ||
                    keywords.includes(term) ||
                    entities.includes(term)
            );

            if (allTermsMatch) {
                score += 30;
            }

            const document =
                this.getDocumentById(
                    passage.documentId
                );

            if (document) {
                if (document.isCurrentVersion) {
                    score += 8;
                }

                if (
                    document.authority ===
                        "authoritative" ||
                    document.authority === "primary" ||
                    document.authority === "verified"
                ) {
                    score += 9;
                }

                if (
                    document.status === "superseded"
                ) {
                    score -= 30;
                }

                if (
                    request.documentType &&
                    document.documentType ===
                        request.documentType
                ) {
                    score += 18;
                }

                if (
                    request.sourceId &&
                    document.sourceId ===
                        request.sourceId
                ) {
                    score += 20;
                }
            }

            return Math.max(0, score);
        },

        passageMatchesFilters(passage, request) {
            const document =
                this.getDocumentById(
                    passage.documentId
                );

            if (!document) {
                return false;
            }

            if (
                request.currentVersionOnly !== false &&
                !document.isCurrentVersion
            ) {
                return false;
            }

            if (
                request.documentId &&
                document.id !== request.documentId
            ) {
                return false;
            }

            if (
                request.documentType &&
                document.documentType !==
                    request.documentType
            ) {
                return false;
            }

            if (
                request.sourceId &&
                document.sourceId !==
                    request.sourceId
            ) {
                return false;
            }

            if (
                request.sensitivity &&
                document.sensitivity !==
                    request.sensitivity
            ) {
                return false;
            }

            if (
                request.authority &&
                document.authority !==
                    request.authority
            ) {
                return false;
            }

            if (
                request.fromDate &&
                new Date(
                    document.effectiveDate ||
                        document.publishedAt ||
                        document.createdAt
                ) < new Date(request.fromDate)
            ) {
                return false;
            }

            if (
                request.toDate &&
                new Date(
                    document.effectiveDate ||
                        document.publishedAt ||
                        document.createdAt
                ) > new Date(request.toDate)
            ) {
                return false;
            }

            return true;
        },

        canAccessPassage(passage, office) {
            const document =
                this.getDocumentById(
                    passage.documentId
                );

            if (!document) {
                return false;
            }

            if (!office) {
                return true;
            }

            return (
                document.officeAccess.includes("all") ||
                document.officeAccess.includes(office)
            );
        },

        calculateDocumentSimilarity(
            passagesA,
            passagesB
        ) {
            const keywordsA = this.uniqueStrings(
                passagesA.flatMap(
                    (passage) => passage.keywords
                )
            );
            const keywordsB = this.uniqueStrings(
                passagesB.flatMap(
                    (passage) => passage.keywords
                )
            );
            const entitiesA = this.uniqueStrings(
                passagesA.flatMap(
                    (passage) => passage.entities
                )
            );
            const entitiesB = this.uniqueStrings(
                passagesB.flatMap(
                    (passage) => passage.entities
                )
            );

            return (
                this.jaccardSimilarity(
                    keywordsA,
                    keywordsB
                ) *
                    0.7 +
                this.jaccardSimilarity(
                    entitiesA,
                    entitiesB
                ) *
                    0.3
            );
        },

        inferCrossReferenceType(
            document,
            candidate,
            sharedKeywords,
            sharedEntities
        ) {
            const combined = this.normalizeText(
                [
                    document.documentType,
                    candidate.documentType,
                    ...sharedKeywords,
                    ...sharedEntities
                ].join(" ")
            );

            if (
                combined.includes("policy") &&
                combined.includes("procedure")
            ) {
                return "governs";
            }

            if (
                combined.includes("grant") &&
                combined.includes("budget")
            ) {
                return "financially-supported-by";
            }

            if (
                combined.includes("decision") ||
                combined.includes("resolution") ||
                combined.includes("approval")
            ) {
                return "authorized-by";
            }

            if (
                combined.includes("mission") ||
                combined.includes("project") ||
                combined.includes("program")
            ) {
                return "supports";
            }

            return "contextually-related-to";
        },

        explainCrossReference(
            document,
            candidate,
            sharedKeywords,
            sharedEntities
        ) {
            const details = [];

            if (sharedKeywords.length > 0) {
                details.push(
                    `shared topics: ${sharedKeywords
                        .slice(0, 8)
                        .join(", ")}`
                );
            }

            if (sharedEntities.length > 0) {
                details.push(
                    `shared entities: ${sharedEntities
                        .slice(0, 6)
                        .join(", ")}`
                );
            }

            return `${document.title} is connected to ${
                candidate.title
            } through ${
                details.join("; ") ||
                "overlapping institutional context"
            }.`;
        },

        detectContradictionSignals(textA, textB) {
            const left = this.normalizeText(textA);
            const right = this.normalizeText(textB);
            const signals = [];

            const polarityPairs = [
                ["required", "not required"],
                ["approved", "denied"],
                ["approved", "rejected"],
                ["active", "inactive"],
                ["eligible", "ineligible"],
                ["permitted", "prohibited"],
                ["must", "must not"],
                ["will", "will not"],
                ["can", "cannot"],
                ["included", "excluded"],
                ["increase", "decrease"],
                ["before", "after"]
            ];

            polarityPairs.forEach(([positive, negative]) => {
                const opposing =
                    (left.includes(positive) &&
                        right.includes(negative)) ||
                    (left.includes(negative) &&
                        right.includes(positive));

                if (opposing) {
                    signals.push(
                        `${positive} ↔ ${negative}`
                    );
                }
            });

            const datesA = this.extractDates(textA);
            const datesB = this.extractDates(textB);
            const numbersA = this.extractNumbers(textA);
            const numbersB = this.extractNumbers(textB);

            const dateConflict =
                datesA.length > 0 &&
                datesB.length > 0 &&
                this.intersection(
                    datesA,
                    datesB
                ).length === 0;

            const numberConflict =
                numbersA.length > 0 &&
                numbersB.length > 0 &&
                this.intersection(
                    numbersA,
                    numbersB
                ).length === 0;

            if (dateConflict) {
                signals.push("different dates");
            }

            if (numberConflict) {
                signals.push("different numeric values");
            }

            const isPotentialConflict =
                signals.length > 0;

            return {
                isPotentialConflict,
                conflictType:
                    signals.some(
                        (signal) =>
                            signal === "different dates"
                    )
                        ? "date-conflict"
                        : signals.some(
                              (signal) =>
                                  signal ===
                                  "different numeric values"
                          )
                        ? "value-conflict"
                        : "statement-conflict",
                confidence: this.round(
                    Math.min(
                        0.45 + signals.length * 0.12,
                        0.92
                    ),
                    3
                ),
                signals,
                explanation: isPotentialConflict
                    ? `Potentially conflicting institutional knowledge detected: ${signals.join(
                          ", "
                      )}. Executive or authoritative-source review is required.`
                    : ""
            };
        },

        resolveGraphNode(id) {
            const record =
                this.connectedEngine?.getRecordById?.(id);

            if (record) {
                return {
                    nodeType: "record",
                    item: record
                };
            }

            const entity =
                this.connectedEngine?.getEntityById?.(id);

            if (entity) {
                return {
                    nodeType: "entity",
                    item: entity
                };
            }

            const document = this.getDocumentById(id);

            if (document) {
                return {
                    nodeType: "document",
                    item: document
                };
            }

            return null;
        },

        getGraphEdgesForNode(id) {
            const coreEdges =
                this.connectedEngine?.relationships
                    ?.filter(
                        (relationship) =>
                            relationship.status !==
                                "archived" &&
                            (relationship.fromId === id ||
                                relationship.toId === id)
                    )
                    .map((relationship) => ({
                        ...relationship,
                        edgeType: "core-relationship"
                    })) || [];

            const memoryEdges =
                this.crossReferences
                    .filter(
                        (reference) =>
                            reference.status === "active" &&
                            (reference.fromRecordId === id ||
                                reference.toRecordId === id)
                    )
                    .map((reference) => ({
                        id: reference.id,
                        fromId:
                            reference.fromRecordId,
                        toId: reference.toRecordId,
                        relationshipType:
                            reference.relationshipType,
                        label:
                            reference.relationshipType,
                        confidence:
                            reference.score,
                        edgeType:
                            "memory-cross-reference",
                        metadata: {
                            explanation:
                                reference.explanation
                        }
                    }));

            return [
                ...coreEdges,
                ...memoryEdges
            ];
        },

        normalizeDocumentInput(input, options) {
            const rawText =
                input.text ??
                input.content ??
                input.extractedText ??
                "";

            const text =
                typeof rawText === "string"
                    ? rawText
                    : JSON.stringify(rawText, null, 2);

            return {
                id: input.id || null,
                recordId: input.recordId || null,
                sourceId: input.sourceId || null,
                logicalDocumentId:
                    input.logicalDocumentId || null,
                originalDocumentId:
                    input.originalDocumentId || null,

                title: String(
                    input.title ||
                        input.name ||
                        input.fileName ||
                        ""
                ).trim(),
                summary: String(
                    input.summary || ""
                ).trim(),
                description: String(
                    input.description ||
                        input.uploadPurpose ||
                        input.instructions ||
                        ""
                ).trim(),
                text: text.trim(),

                documentType:
                    input.documentType ||
                    input.type ||
                    "document",
                sourceType:
                    input.sourceType ||
                    "uploaded-document",
                authority:
                    input.authority || "primary",
                confidence:
                    input.confidence ?? 0.82,
                sensitivity:
                    input.sensitivity || "internal",
                officeAccess:
                    Array.isArray(
                        input.officeAccess
                    ) &&
                    input.officeAccess.length > 0
                        ? this.uniqueStrings(
                              input.officeAccess
                          )
                        : ["all"],

                tags: this.uniqueStrings(
                    input.tags
                ),
                topics: this.uniqueStrings(
                    input.topics ||
                        input.detectedKeywords
                ),
                relatedRecordIds:
                    this.uniqueStrings(
                        input.relatedRecordIds
                    ),

                language:
                    input.language || "en",
                url: input.url || "",
                organization:
                    input.organization || "",
                fileName:
                    input.fileName ||
                    input.name ||
                    "",
                mimeType:
                    input.mimeType ||
                    "text/plain",
                sizeBytes:
                    input.sizeBytes ||
                    new Blob([text]).size,
                pageCount:
                    input.pageCount || null,
                pages:
                    Array.isArray(input.pages)
                        ? input.pages
                        : [],
                sections:
                    Array.isArray(input.sections)
                        ? input.sections
                        : [],

                publishedAt:
                    input.publishedAt || null,
                accessedAt:
                    input.accessedAt || null,
                effectiveDate:
                    input.effectiveDate || null,
                expirationDate:
                    input.expirationDate || null,

                versionLabel:
                    input.versionLabel || null,
                createVersion:
                    input.createVersion ??
                    options.createVersion,
                allowDuplicate:
                    input.allowDuplicate === true ||
                    options.allowDuplicate === true,

                chunkSize:
                    input.chunkSize ||
                    options.chunkSize ||
                    this.configuration
                        .defaultChunkSize,
                chunkOverlap:
                    input.chunkOverlap ||
                    options.chunkOverlap ||
                    this.configuration
                        .defaultChunkOverlap,

                createdBy:
                    input.createdBy ||
                    options.createdBy ||
                    "MEOS Knowledge Memory",

                metadata:
                    input.metadata &&
                    typeof input.metadata ===
                        "object"
                        ? this.safeClone(
                              input.metadata
                          )
                        : {}
            };
        },

        resolvePageNumber(characterOffset, pages) {
            if (!Array.isArray(pages)) {
                return null;
            }

            const page = pages.find(
                (item) =>
                    characterOffset >=
                        Number(
                            item.characterStart ||
                                0
                        ) &&
                    characterOffset <=
                        Number(
                            item.characterEnd ||
                                Infinity
                        )
            );

            return page?.pageNumber || null;
        },

        extractKeywords(text, limit = 15) {
            const stopWords = new Set([
                "a",
                "an",
                "and",
                "are",
                "as",
                "at",
                "be",
                "been",
                "but",
                "by",
                "can",
                "for",
                "from",
                "had",
                "has",
                "have",
                "he",
                "her",
                "his",
                "i",
                "if",
                "in",
                "into",
                "is",
                "it",
                "its",
                "may",
                "more",
                "not",
                "of",
                "on",
                "or",
                "our",
                "shall",
                "she",
                "should",
                "so",
                "such",
                "than",
                "that",
                "the",
                "their",
                "them",
                "then",
                "there",
                "these",
                "they",
                "this",
                "to",
                "was",
                "we",
                "were",
                "will",
                "with",
                "would",
                "you",
                "your"
            ]);

            const counts = {};

            this.normalizeText(text)
                .split(/\s+/)
                .filter(
                    (word) =>
                        word.length >= 3 &&
                        !stopWords.has(word)
                )
                .forEach((word) => {
                    counts[word] =
                        (counts[word] || 0) + 1;
                });

            return Object.entries(counts)
                .sort(
                    (first, second) =>
                        second[1] - first[1] ||
                        second[0].length -
                            first[0].length
                )
                .slice(0, limit)
                .map(([word]) => word);
        },

        extractCandidateEntities(text) {
            const matches =
                String(text || "").match(
                    /\b(?:[A-Z][A-Za-z0-9&'-]*)(?:\s+[A-Z][A-Za-z0-9&'-]*){0,5}\b/g
                ) || [];

            return this.uniqueStrings(
                matches
                    .map((match) =>
                        match.trim()
                    )
                    .filter(
                        (match) =>
                            match.length >= 3 &&
                            ![
                                "The",
                                "This",
                                "That",
                                "These",
                                "Those",
                                "Section",
                                "Article"
                            ].includes(match)
                    )
            ).slice(0, 25);
        },

        extractQueryTerms(text) {
            return this.extractKeywords(text, 25);
        },

        extractDates(text) {
            const matches =
                String(text || "").match(
                    /\b(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{2,4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,\s+\d{4})?)\b/gi
                ) || [];

            return this.uniqueStrings(
                matches.map((match) =>
                    this.normalizeText(match)
                )
            );
        },

        extractNumbers(text) {
            const matches =
                String(text || "").match(
                    /(?:\$?\d[\d,]*(?:\.\d+)?%?)/g
                ) || [];

            return this.uniqueStrings(
                matches.map((match) =>
                    match.replace(/,/g, "")
                )
            );
        },

        summarizeText(text, maximumLength) {
            const normalized = String(text || "")
                .replace(/\s+/g, " ")
                .trim();

            if (normalized.length <= maximumLength) {
                return normalized;
            }

            const candidate = normalized.slice(
                0,
                maximumLength
            );
            const boundary = Math.max(
                candidate.lastIndexOf(". "),
                candidate.lastIndexOf("? "),
                candidate.lastIndexOf("! "),
                candidate.lastIndexOf("; "),
                candidate.lastIndexOf(", ")
            );

            const finalText =
                boundary >= maximumLength * 0.55
                    ? candidate.slice(
                          0,
                          boundary + 1
                      )
                    : candidate;

            return `${finalText.trim()}…`;
        },

        estimateTokens(text) {
            return Math.max(
                1,
                Math.ceil(
                    String(text || "").length / 4
                )
            );
        },

        findLogicalDocumentByTitle(title) {
            const normalized =
                this.normalizeText(title);

            return (
                this.documents.find(
                    (document) =>
                        document.isCurrentVersion &&
                        this.normalizeText(
                            document.title
                        ) === normalized
                ) || null
            );
        },

        getDocumentById(documentId) {
            return (
                this.documents.find(
                    (document) =>
                        document.id === documentId
                ) || null
            );
        },

        getPassageById(passageId) {
            return (
                this.passages.find(
                    (passage) =>
                        passage.id === passageId
                ) || null
            );
        },

        getCitationById(citationId) {
            return (
                this.citations.find(
                    (citation) =>
                        citation.id === citationId
                ) || null
            );
        },

        getCitationByPassageId(passageId) {
            return (
                this.citations.find(
                    (citation) =>
                        citation.passageId ===
                            passageId &&
                        citation.status === "active"
                ) || null
            );
        },

        getConflictById(conflictId) {
            return (
                this.conflicts.find(
                    (conflict) =>
                        conflict.id === conflictId
                ) || null
            );
        },

        getPassagesForDocument(documentId) {
            return this.passages
                .filter(
                    (passage) =>
                        passage.documentId ===
                            documentId &&
                        passage.status === "active"
                )
                .sort(
                    (first, second) =>
                        first.sequence -
                        second.sequence
                );
        },

        getCurrentDocumentVersion(
            logicalDocumentId
        ) {
            return (
                this.documents.find(
                    (document) =>
                        document.logicalDocumentId ===
                            logicalDocumentId &&
                        document.isCurrentVersion
                ) || null
            );
        },

        getStatus() {
            return {
                name: this.name,
                version: this.version,
                status: this.status,
                operatingMode:
                    this.operatingMode,
                knowledgeEngineConnected:
                    Boolean(this.connectedEngine),
                organizationNeutralCore:
                    this.configuration
                        .organizationNeutralCore,
                persistenceEnabled:
                    this.configuration
                        .persistenceEnabled,
                authoritativeStorage:
                    this.configuration
                        .authoritativeStorage,
                restoredFromExecutiveMemory:
                    this.restoredFromExecutiveMemory,
                manifestId:
                    this.configuration
                        .executiveMemoryManifestId,
                manifestKnownMissing:
                    this.executiveMemoryManifestKnownMissing,
                manifestBootstrapAt:
                    this.executiveMemoryManifestBootstrapAt,
                lastPersistenceAt:
                    this.lastPersistenceAt,
                lastPersistenceError:
                    this.lastPersistenceError,
                persistenceConvergenceRetryCount:
                    this.persistenceConvergenceRetryCount,
                persistenceConvergedWriteCount:
                    this.persistenceConvergedWriteCount,
                lastPersistenceAttempts:
                    this.lastPersistenceAttempts,
                documentCount:
                    this.documents.length,
                currentDocumentCount:
                    this.documents.filter(
                        (document) =>
                            document.isCurrentVersion
                    ).length,
                passageCount:
                    this.passages.length,
                citationCount:
                    this.citations.length,
                versionEntryCount:
                    this.versions.length,
                crossReferenceCount:
                    this.crossReferences.length,
                openConflictCount:
                    this.conflicts.filter(
                        (conflict) =>
                            conflict.status === "open"
                    ).length,
                queryCount:
                    this.queryLog.length,
                initializedAt:
                    this.initializedAt
            };
        },

        exportMemory(options = {}) {
            const data = {
                schema: SCHEMA,
                version: this.version,
                exportedAt:
                    new Date().toISOString(),
                configuration:
                    options.includeConfiguration ===
                    false
                        ? {}
                        : this.configuration,
                documents:
                    options.documents === false
                        ? []
                        : this.documents,
                passages:
                    options.passages === false
                        ? []
                        : this.passages,
                citations:
                    options.citations === false
                        ? []
                        : this.citations,
                versions:
                    options.versions === false
                        ? []
                        : this.versions,
                crossReferences:
                    options.crossReferences === false
                        ? []
                        : this.crossReferences,
                conflicts:
                    options.conflicts === false
                        ? []
                        : this.conflicts
            };

            return {
                success: true,
                data,
                json: JSON.stringify(
                    data,
                    null,
                    2
                )
            };
        },

        importMemory(payload, options = {}) {
            let data = payload;

            if (typeof payload === "string") {
                try {
                    data = JSON.parse(payload);
                } catch (error) {
                    return {
                        success: false,
                        error:
                            "The memory import is not valid JSON."
                    };
                }
            }

            if (
                !data ||
                data.schema !== SCHEMA
            ) {
                return {
                    success: false,
                    error:
                        "The import is not a MEOS Knowledge Memory package."
                };
            }

            if (options.replace === true) {
                this.documents = [];
                this.passages = [];
                this.citations = [];
                this.versions = [];
                this.crossReferences = [];
                this.conflicts = [];
            }

            this.mergeById(
                this.documents,
                data.documents || []
            );
            this.mergeById(
                this.passages,
                data.passages || []
            );
            this.mergeById(
                this.citations,
                data.citations || []
            );
            this.mergeById(
                this.versions,
                data.versions || []
            );
            this.mergeById(
                this.crossReferences,
                data.crossReferences || []
            );
            this.mergeById(
                this.conflicts,
                data.conflicts || []
            );

            this.reconcileWithKnowledgeEngine();

            if (options.skipPersistence !== true) {
                this.persistIfEnabled();
            }

            this.emit("memory:imported", {
                importedAt:
                    new Date().toISOString()
            });

            return {
                success: true,
                status: this.getStatus()
            };
        },

        getExecutiveMemoryCollectionUrl(
            recordId = null
        ) {
            const base = String(
                this.configuration
                    .executiveMemoryEndpoint
            ).replace(/\/+$/, "");

            const collection =
                encodeURIComponent(
                    this.configuration
                        .executiveMemoryCollection
                );

            return recordId
                ? `${base}/${collection}/${encodeURIComponent(
                      recordId
                  )}`
                : `${base}/${collection}`;
        },

        async executiveMemoryRequest(
            method,
            recordId = null,
            body = null
        ) {
            if (
                typeof global.fetch !== "function"
            ) {
                throw new Error(
                    "Executive Memory transport is unavailable."
                );
            }

            const response = await global.fetch(
                this.getExecutiveMemoryCollectionUrl(
                    recordId
                ),
                {
                    method,
                    headers:
                        body === null
                            ? {
                                  Accept:
                                      "application/json"
                              }
                            : {
                                  Accept:
                                      "application/json",
                                  "Content-Type":
                                      "application/json"
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
                error.details =
                    payload?.details || null;

                throw error;
            }

            return payload;
        },

        async findExecutiveMemoryRecord(recordId) {
            const payload =
                await this.executiveMemoryRequest(
                    "GET",
                    null
                );

            const records =
                Array.isArray(payload?.records)
                    ? payload.records
                    : [];

            return (
                records.find(
                    (record) =>
                        record?.id === recordId
                ) || null
            );
        },

        createPersistenceShards(exportData) {
            const targetBytes = Math.max(
                50000,
                Number(
                    this.configuration
                        .executiveMemoryShardTargetBytes
                ) ||
                    EXECUTIVE_MEMORY_SHARD_TARGET_BYTES
            );

            const categories = [
                "documents",
                "passages",
                "citations",
                "versions",
                "crossReferences",
                "conflicts"
            ];

            const encoder =
                typeof global.TextEncoder ===
                "function"
                    ? new global.TextEncoder()
                    : null;

            const byteLength = (value) =>
                encoder
                    ? encoder.encode(
                          JSON.stringify(value)
                      ).length
                    : JSON.stringify(value).length * 2;

            const shards = [];

            categories.forEach((category) => {
                const items = Array.isArray(
                    exportData[category]
                )
                    ? exportData[category]
                    : [];

                let currentItems = [];
                let currentBytes = 2;
                let shardIndex = 0;

                const flush = () => {
                    if (
                        currentItems.length === 0
                    ) {
                        return;
                    }

                    shardIndex += 1;

                    const id =
                        `knowledge-memory-${category}-` +
                        String(shardIndex).padStart(
                            4,
                            "0"
                        );

                    shards.push({
                        id,
                        schema:
                            "meos.knowledge-memory.shard.v1",
                        type:
                            "knowledge-memory-state-shard",
                        category,
                        shardIndex,
                        items: currentItems,
                        itemCount:
                            currentItems.length,
                        updatedAt:
                            new Date().toISOString()
                    });

                    currentItems = [];
                    currentBytes = 2;
                };

                items.forEach((item) => {
                    const itemBytes =
                        byteLength(item) + 1;

                    if (
                        currentItems.length > 0 &&
                        currentBytes + itemBytes >
                            targetBytes
                    ) {
                        flush();
                    }

                    currentItems.push(item);
                    currentBytes += itemBytes;
                });

                flush();
            });

            return shards;
        },

        schedulePersistence() {
            if (this.persistenceTimer) {
                global.clearTimeout(
                    this.persistenceTimer
                );
            }

            this.persistenceTimer =
                global.setTimeout(() => {
                    this.persistenceTimer = null;
                    void this.persist();
                }, this.configuration.persistenceDebounceMs);

            return {
                success: true,
                persisted: false,
                scheduled: true
            };
        },

        persistIfEnabled() {
            if (
                this.configuration.persistenceEnabled &&
                this.configuration
                    .automaticPersistence
            ) {
                return this.schedulePersistence();
            }

            return {
                success: true,
                persisted: false,
                scheduled: false
            };
        },

        async persist(options = {}) {
            if (
                !this.configuration.persistenceEnabled
            ) {
                return {
                    success: false,
                    error:
                        "Knowledge Memory persistence is disabled."
                };
            }

            if (this.persistencePromise) {
                return this.persistencePromise;
            }

            this.persistencePromise = (async () => {
                const data =
                    this.exportMemory().data;
                const shards =
                    this.createPersistenceShards(
                        data
                    );

                let previousManifest = null;

                if (
                    options.skipManifestLookup !== true &&
                    !this.executiveMemoryManifestKnownMissing
                ) {
                    previousManifest =
                        await this.findExecutiveMemoryRecord(
                            this.configuration
                                .executiveMemoryManifestId
                        );
                }

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
                        "meos.knowledge-memory.manifest.v1",
                    type:
                        "knowledge-memory-state-manifest",
                    memoryVersion: this.version,
                    exportedAt: data.exportedAt,
                    organizationNeutralCore:
                        data.organizationNeutralCore,
                    shardIds: shards.map(
                        (shard) => shard.id
                    ),
                    counts: {
                        documents:
                            data.documents.length,
                        passages:
                            data.passages.length,
                        citations:
                            data.citations.length,
                        versions:
                            data.versions.length,
                        crossReferences:
                            data.crossReferences
                                .length,
                        conflicts:
                            data.conflicts.length
                    }
                };

                const maximumAttempts = Math.max(
                    1,
                    Number(
                        this.configuration
                            .persistenceMaximumAttempts
                    ) || 3
                );
                let manifestWriteAttempts = 0;
                let manifestWriteConverged = false;

                while (
                    manifestWriteAttempts <
                    maximumAttempts
                ) {
                    manifestWriteAttempts += 1;

                    try {
                        await this.executiveMemoryRequest(
                            "PUT",
                            manifest.id,
                            manifest
                        );

                        if (manifestWriteAttempts > 1) {
                            manifestWriteConverged = true;
                            this.persistenceConvergedWriteCount += 1;
                        }

                        break;
                    } catch (error) {
                        const isConcurrencyConflict =
                            error?.code ===
                                "MEOS_REPOSITORY_CONCURRENCY_CONFLICT" ||
                            Number(error?.details?.status) === 409;

                        if (
                            !isConcurrencyConflict ||
                            manifestWriteAttempts >=
                                maximumAttempts
                        ) {
                            throw error;
                        }

                        this.persistenceConvergenceRetryCount += 1;

                        // Re-observe canonical durable authority before retrying.
                        // Knowledge Memory owns this manifest's complete shard set,
                        // so convergence republishes the current complete snapshot
                        // rather than weakening repository compare-and-swap safety.
                        previousManifest =
                            await this.findExecutiveMemoryRecord(
                                manifest.id
                            );

                        const retryDelay = Math.max(
                            0,
                            Number(
                                this.configuration
                                    .persistenceRetryDelayMs
                            ) || 0
                        );

                        if (retryDelay > 0) {
                            await new Promise((resolve) =>
                                global.setTimeout(
                                    resolve,
                                    retryDelay *
                                        manifestWriteAttempts
                                )
                            );
                        }
                    }
                }

                this.lastPersistenceAttempts =
                    manifestWriteAttempts;

                const bootstrapped =
                    this.executiveMemoryManifestKnownMissing;

                this.executiveMemoryManifestKnownMissing =
                    false;

                if (bootstrapped) {
                    this.executiveMemoryManifestBootstrapAt =
                        new Date().toISOString();
                }

                const previousShardIds =
                    Array.isArray(
                        previousManifest?.shardIds
                    )
                        ? previousManifest.shardIds
                        : [];

                const currentShardIds =
                    new Set(manifest.shardIds);

                for (const shardId of previousShardIds) {
                    if (
                        !currentShardIds.has(
                            shardId
                        )
                    ) {
                        await this.executiveMemoryRequest(
                            "DELETE",
                            shardId
                        ).catch(() => null);
                    }
                }

                this.lastPersistenceAt =
                    new Date().toISOString();
                this.lastPersistenceError = null;

                this.emit("memory:persisted", {
                    timestamp:
                        this.lastPersistenceAt,
                    authoritativeStorage:
                        "executive-memory",
                    manifestId: manifest.id,
                    shardCount: shards.length,
                    counts: manifest.counts,
                    bootstrapped,
                    writeAttempts:
                        manifestWriteAttempts,
                    converged:
                        manifestWriteConverged
                });

                return {
                    success: true,
                    persisted: true,
                    authoritativeStorage:
                        "executive-memory",
                    manifestId: manifest.id,
                    shardCount: shards.length,
                    counts: manifest.counts,
                    bootstrapped,
                    writeAttempts:
                        manifestWriteAttempts,
                    converged:
                        manifestWriteConverged
                };
            })()
                .catch((error) => {
                    this.lastPersistenceError =
                        error?.message ||
                        String(error);

                    console.error(
                        "[MEOS Knowledge Memory] Executive Memory persistence failed:",
                        error
                    );

                    return {
                        success: false,
                        persisted: false,
                        error:
                            this.lastPersistenceError,
                        code: error?.code || null
                    };
                })
                .finally(() => {
                    this.persistencePromise = null;
                });

            return this.persistencePromise;
        },

        async restore() {
            if (
                !this.configuration.persistenceEnabled
            ) {
                return {
                    success: false,
                    restored: false,
                    error:
                        "Knowledge Memory persistence is disabled."
                };
            }

            const manifest =
                await this.findExecutiveMemoryRecord(
                    this.configuration
                        .executiveMemoryManifestId
                );

            if (!manifest) {
                this.executiveMemoryManifestKnownMissing =
                    true;

                const migration =
                    await this.migrateLegacyLocalStorage();

                const bootstrap =
                    await this.persist({
                        skipManifestLookup: true
                    });

                if (!bootstrap.success) {
                    return {
                        success: false,
                        restored:
                            migration.migrated,
                        migratedLegacyStorage:
                            migration.migrated,
                        bootstrappedManifest:
                            false,
                        error:
                            bootstrap.error ||
                            "Knowledge Memory could not create its initial Executive Memory manifest."
                    };
                }

                return {
                    success: true,
                    restored:
                        migration.migrated,
                    migratedLegacyStorage:
                        migration.migrated,
                    bootstrappedManifest: true,
                    manifestId:
                        this.configuration
                            .executiveMemoryManifestId,
                    shardCount:
                        bootstrap.shardCount,
                    counts:
                        bootstrap.counts
                };
            }

            this.executiveMemoryManifestKnownMissing =
                false;

            const restored = {
                schema: SCHEMA,
                version:
                    manifest.memoryVersion ||
                    this.version,
                exportedAt:
                    manifest.exportedAt ||
                    new Date().toISOString(),
                organizationNeutralCore:
                    manifest
                        .organizationNeutralCore !==
                    false,
                documents: [],
                passages: [],
                citations: [],
                versions: [],
                crossReferences: [],
                conflicts: []
            };

            const shardIds = Array.isArray(
                manifest.shardIds
            )
                ? manifest.shardIds
                : [];

            for (const shardId of shardIds) {
                const payload =
                    await this.executiveMemoryRequest(
                        "GET",
                        shardId
                    );

                const shard =
                    payload?.record || null;

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

            const result = this.importMemory(
                restored,
                {
                    replace: false,
                    skipPersistence: true
                }
            );

            this.restoredFromExecutiveMemory =
                result.success;

            this.emit("memory:restored", {
                authoritativeStorage:
                    "executive-memory",
                manifestId: manifest.id,
                shardCount: shardIds.length,
                counts:
                    manifest.counts || null
            });

            return {
                ...result,
                restored: result.success,
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

            const stored =
                global.localStorage.getItem(
                    this.configuration
                        .localStorageKey
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
                        "Legacy Knowledge Memory data is invalid JSON."
                };
            }

            const imported =
                this.importMemory(data, {
                    replace: false,
                    skipPersistence: true
                });

            if (!imported.success) {
                return {
                    ...imported,
                    migrated: false
                };
            }

            const persisted =
                await this.persist();

            if (persisted.success) {
                global.localStorage.removeItem(
                    this.configuration
                        .localStorageKey
                );
            }

            return {
                success: persisted.success,
                migrated: persisted.success,
                persisted
            };
        },

        clearMemory(confirmation) {
            if (
                confirmation !==
                "CLEAR MEOS KNOWLEDGE MEMORY"
            ) {
                return {
                    success: false,
                    error:
                        'Confirmation phrase required: "CLEAR MEOS KNOWLEDGE MEMORY".'
                };
            }

            this.documents = [];
            this.passages = [];
            this.citations = [];
            this.versions = [];
            this.crossReferences = [];
            this.conflicts = [];
            this.queryLog = [];
            this.activityLog = [];

            global.localStorage?.removeItem(
                this.configuration.localStorageKey
            );

            void this.persist();

            this.emit("memory:cleared", {
                timestamp:
                    new Date().toISOString()
            });

            return {
                success: true
            };
        },

        mergeById(target, incoming) {
            incoming.forEach((item) => {
                const index = target.findIndex(
                    (existing) =>
                        existing.id === item.id
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

        logActivity(action, details = {}) {
            const entry = {
                id: this.createId(
                    "memory-activity"
                ),
                action,
                details,
                timestamp:
                    new Date().toISOString()
            };

            this.activityLog.push(entry);

            if (this.activityLog.length > 1000) {
                this.activityLog =
                    this.activityLog.slice(-1000);
            }

            return entry;
        },

        normalizeText(value) {
            return String(value || "")
                .toLowerCase()
                .normalize("NFKD")
                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                )
                .replace(
                    /[^a-z0-9\s%$./-]/g,
                    " "
                )
                .replace(/\s+/g, " ")
                .trim();
        },

        hashText(text) {
            let hash = 2166136261;
            const value = String(text || "");

            for (
                let index = 0;
                index < value.length;
                index += 1
            ) {
                hash ^= value.charCodeAt(index);
                hash +=
                    (hash << 1) +
                    (hash << 4) +
                    (hash << 7) +
                    (hash << 8) +
                    (hash << 24);
            }

            return `fnv1a-${(
                hash >>> 0
            ).toString(16)}`;
        },

        jaccardSimilarity(valuesA, valuesB) {
            const setA = new Set(
                (valuesA || []).map((value) =>
                    this.normalizeText(value)
                )
            );
            const setB = new Set(
                (valuesB || []).map((value) =>
                    this.normalizeText(value)
                )
            );

            if (
                setA.size === 0 &&
                setB.size === 0
            ) {
                return 0;
            }

            const intersection =
                [...setA].filter((value) =>
                    setB.has(value)
                ).length;
            const union = new Set([
                ...setA,
                ...setB
            ]).size;

            return union === 0
                ? 0
                : intersection / union;
        },

        intersection(valuesA, valuesB) {
            const setB = new Set(valuesB || []);

            return this.uniqueStrings(
                (valuesA || []).filter((value) =>
                    setB.has(value)
                )
            );
        },

        uniqueStrings(values) {
            return [
                ...new Set(
                    (Array.isArray(values)
                        ? values
                        : []
                    )
                        .map((value) =>
                            String(
                                value || ""
                            ).trim()
                        )
                        .filter(Boolean)
                )
            ];
        },

        dedupeById(items) {
            const seen = new Set();

            return (items || []).filter((item) => {
                if (!item || !item.id) {
                    return false;
                }

                if (seen.has(item.id)) {
                    return false;
                }

                seen.add(item.id);
                return true;
            });
        },

        countOccurrences(text, term) {
            if (!term) {
                return 0;
            }

            let count = 0;
            let position = 0;

            while (
                (position = text.indexOf(
                    term,
                    position
                )) !== -1
            ) {
                count += 1;
                position += term.length;
            }

            return count;
        },

        clamp(value, minimum, maximum) {
            return Math.max(
                minimum,
                Math.min(maximum, value)
            );
        },

        round(value, places = 2) {
            const factor = 10 ** places;
            return (
                Math.round(
                    (value +
                        Number.EPSILON) *
                        factor
                ) / factor
            );
        },

        safeClone(value) {
            try {
                return JSON.parse(
                    JSON.stringify(
                        value,
                        (key, item) =>
                            typeof item ===
                            "function"
                                ? undefined
                                : item
                    )
                );
            } catch (error) {
                return {};
            }
        },

        createId(prefix) {
            const randomPart =
                Math.random()
                    .toString(36)
                    .slice(2, 10);

            return `${prefix}-${Date.now()}-${randomPart}`;
        },

        on(eventName, callback) {
            if (
                typeof callback !== "function"
            ) {
                return false;
            }

            if (
                !this.eventListeners[eventName]
            ) {
                this.eventListeners[eventName] =
                    [];
            }

            this.eventListeners[
                eventName
            ].push(callback);

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
                this.eventListeners[eventName] ||
                [];

            listeners.forEach((listener) => {
                try {
                    listener(payload);
                } catch (error) {
                    console.error(
                        `[MEOS Knowledge Memory] Event listener failed for "${eventName}":`,
                        error
                    );
                }
            });
        }
    };

    global.KnowledgeMemory =
        KnowledgeMemory;

    KnowledgeMemory.initialize();
})(window);
