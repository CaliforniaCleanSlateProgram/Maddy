/*
 * MEOS Document Ingestion Engine
 * Version: 1.1.0
 *
 * Mission:
 * Discover, catalog, fingerprint, de-duplicate, and queue documents for
 * later classification without hard-coding any organization into MEOS.
 * Accept bounded local-perception evidence while preserving source, content,
 * fingerprint, and investigative lineage for downstream cognition.
 *
 * Brick boundary:
 * This engine catalogs documents. It does not decide what they mean.
 */

(function initializeDocumentIngestion(global) {
    "use strict";

    const STORAGE_KEY = "meos.document-ingestion.v1";
    const SCHEMA = "meos.document-ingestion.package.v1";

    const DocumentIngestion = {
        name: "MEOS Document Ingestion Engine",
        version: "1.1.0",
        status: "initializing",
        operatingMode: "controlled-ingestion",

        configuration: {
            persistenceEnabled: true,
            automaticPersistence: true,
            localStorageKey: STORAGE_KEY,
            organizationNeutralCore: true,
            calculateContentFingerprint: true,
            calculateMetadataFingerprint: true,
            queueNewDocuments: true,
            handoffTextToKnowledgeMemory: false,
            maximumBatchSize: 500,
            maximumTextReadBytes: 5 * 1024 * 1024,
            supportedTextMimeTypes: [
                "text/plain",
                "text/markdown",
                "text/csv",
                "application/json",
                "application/xml",
                "text/xml",
                "text/html",
                "application/javascript",
                "text/javascript"
            ],
            supportedTextExtensions: [
                "txt", "md", "csv", "json", "xml", "html", "htm", "js", "css"
            ]
        },

        catalog: [],
        duplicateGroups: [],
        versionCandidates: [],
        classificationQueue: [],
        batches: [],
        activityLog: [],
        eventListeners: {},
        initializedAt: null,

        initialize(options = {}) {
            this.configuration = {
                ...this.configuration,
                ...(options.configuration || options)
            };

            this.restore();
            this.rebuildDerivedIndexes();

            this.initializedAt = new Date().toISOString();
            this.status = "online";

            this.registerSystemKnowledge();
            this.logActivity("ingestion.initialized", {
                version: this.version,
                restoredDocuments: this.catalog.length,
                queuedDocuments: this.classificationQueue.length
            });

            console.info(
                `[MEOS] ${this.name} v${this.version} ${this.status}.`
            );

            this.emit("ingestion:online", this.getStatus());
            return this.getStatus();
        },

        async ingest(input, options = {}) {
            const entries = this.normalizeBatchInput(input);

            if (entries.length === 0) {
                return {
                    success: false,
                    error: "No documents were provided for ingestion."
                };
            }

            if (entries.length > this.configuration.maximumBatchSize) {
                return {
                    success: false,
                    error:
                        `Batch exceeds the ${this.configuration.maximumBatchSize}-document limit.`
                };
            }

            const batch = this.createBatch(entries.length, options);
            const results = [];

            this.emit("batch:started", {
                batchId: batch.id,
                totalDocuments: entries.length
            });

            for (let index = 0; index < entries.length; index += 1) {
                const entry = entries[index];

                try {
                    const result = await this.ingestOne(entry, {
                        ...options,
                        batchId: batch.id,
                        batchIndex: index
                    });

                    results.push(result);
                    this.updateBatchFromResult(batch, result);
                } catch (error) {
                    const failure = {
                        success: false,
                        error: error.message || "Document ingestion failed.",
                        inputName:
                            entry?.name ||
                            entry?.title ||
                            `Document ${index + 1}`
                    };

                    results.push(failure);
                    batch.failed += 1;

                    this.logActivity("document.failed", {
                        batchId: batch.id,
                        inputName: failure.inputName,
                        error: failure.error
                    });
                }

                batch.processed += 1;
                batch.updatedAt = new Date().toISOString();

                this.emit("batch:progress", {
                    batchId: batch.id,
                    processed: batch.processed,
                    total: batch.total,
                    percentComplete: Math.round(
                        (batch.processed / batch.total) * 100
                    )
                });
            }

            batch.status =
                batch.failed === batch.total ? "failed" : "complete";
            batch.completedAt = new Date().toISOString();
            batch.updatedAt = batch.completedAt;

            this.logActivity("batch.completed", {
                batchId: batch.id,
                total: batch.total,
                added: batch.added,
                duplicates: batch.duplicates,
                versionCandidates: batch.versionCandidates,
                failed: batch.failed
            });

            this.persistIfEnabled();
            this.emit("batch:completed", this.clone(batch));

            return {
                success: batch.status === "complete",
                batch: this.clone(batch),
                results,
                status: this.getStatus()
            };
        },

        async ingestOne(input, options = {}) {
            const normalized = await this.normalizeDocumentInput(input, options);

            if (!normalized.name) {
                return {
                    success: false,
                    error: "A document name is required."
                };
            }

            const existingExact = this.findExactDuplicate(normalized);

            if (existingExact && options.allowDuplicate !== true) {
                this.attachDuplicateReference(existingExact, normalized);

                const result = {
                    success: true,
                    duplicate: true,
                    added: false,
                    document: this.clone(existingExact)
                };

                this.logActivity("document.duplicate-detected", {
                    documentId: existingExact.id,
                    name: normalized.name,
                    fingerprint:
                        normalized.contentFingerprint ||
                        normalized.metadataFingerprint
                });

                this.emit("document:duplicate", result);
                return result;
            }

            const timestamp = new Date().toISOString();
            const document = {
                id:
                    normalized.id ||
                    this.createId("ingested-document"),
                logicalDocumentId:
                    normalized.logicalDocumentId ||
                    this.createLogicalDocumentId(normalized),
                name: normalized.name,
                normalizedName: this.normalizeText(normalized.name),
                baseName: normalized.baseName,
                extension: normalized.extension,
                mimeType: normalized.mimeType,
                sizeBytes: normalized.sizeBytes,
                sourceType: normalized.sourceType,
                sourceLocation: normalized.sourceLocation,
                sourceProvider: normalized.sourceProvider,
                sourceDocumentId: normalized.sourceDocumentId,
                parentPath: normalized.parentPath,
                relativePath: normalized.relativePath,
                webViewUrl: normalized.webViewUrl,
                modifiedAt: normalized.modifiedAt,
                createdAtSource: normalized.createdAtSource,
                discoveredAt: timestamp,
                ingestedAt: timestamp,
                updatedAt: timestamp,
                contentFingerprint: normalized.contentFingerprint,
                metadataFingerprint: normalized.metadataFingerprint,
                fingerprintMethod: normalized.fingerprintMethod,
                textAvailable: Boolean(normalized.text),
                textLength: normalized.text?.length || 0,
                status: "cataloged",
                queueStatus: "not-queued",
                duplicateOfId: null,
                duplicateReferenceCount: 0,
                versionCandidateOfId: null,
                authority: normalized.authority,
                sensitivity: normalized.sensitivity,
                officeAccess: normalized.officeAccess,
                tags: normalized.tags,
                metadata: {
                    ...normalized.metadata,
                    originalLastModified:
                        normalized.lastModified || null,
                    browserFile:
                        normalized.browserFile === true,
                    ingestionBatchId:
                        options.batchId || null,
                    ingestionBatchIndex:
                        options.batchIndex ?? null,
                    extractedText:
                        typeof normalized.text === "string"
                            ? normalized.text
                            : normalized.metadata?.extractedText || null
                }
            };

            const versionMatch = this.findVersionCandidate(document);

            if (versionMatch) {
                document.versionCandidateOfId = versionMatch.id;

                this.versionCandidates.push({
                    id: this.createId("version-candidate"),
                    logicalDocumentId: versionMatch.logicalDocumentId,
                    previousDocumentId: versionMatch.id,
                    candidateDocumentId: document.id,
                    reason: this.explainVersionCandidate(
                        versionMatch,
                        document
                    ),
                    status: "unreviewed",
                    detectedAt: timestamp
                });
            }

            this.catalog.push(document);

            if (
                this.configuration.queueNewDocuments &&
                options.queueForClassification !== false
            ) {
                this.enqueueForClassification(document, options);
            }

            const sourceResult = this.registerKnowledgeSource(document);

            let memoryResult = null;

            if (
                normalized.text &&
                (
                    options.handoffToKnowledgeMemory === true ||
                    this.configuration.handoffTextToKnowledgeMemory
                )
            ) {
                memoryResult = this.handoffToKnowledgeMemory(
                    document,
                    normalized.text,
                    options
                );
            }

            this.rebuildDuplicateGroups();
            this.persistIfEnabled();

            const result = {
                success: true,
                duplicate: false,
                added: true,
                versionCandidate: Boolean(versionMatch),
                document: this.clone(document),
                sourceResult,
                memoryResult
            };

            this.logActivity("document.cataloged", {
                documentId: document.id,
                name: document.name,
                versionCandidate: Boolean(versionMatch),
                queued: document.queueStatus === "queued"
            });

            this.emit("document:cataloged", result);

            if (versionMatch) {
                this.emit("document:version-candidate", {
                    previousDocument: this.clone(versionMatch),
                    candidateDocument: this.clone(document)
                });
            }

            return result;
        },

        async ingestLocalPerceptionEvidence(perception, options = {}) {
            const evidence =
                perception?.evidence &&
                typeof perception.evidence === "object"
                    ? perception.evidence
                    : perception;

            const observations =
                Array.isArray(evidence?.observations)
                    ? evidence.observations
                    : [];

            const investigationId =
                evidence?.investigationId ||
                perception?.investigationId ||
                perception?.intentId ||
                options.investigationId ||
                null;

            if (!investigationId) {
                return {
                    success: false,
                    blocked: true,
                    reason: "local-perception-investigation-lineage-required"
                };
            }

            const observed = observations.filter(
                (observation) =>
                    observation &&
                    observation.observed === true &&
                    (
                        observation.finalUrl ||
                        observation.url ||
                        observation.contentSha256 ||
                        observation.evidenceExcerpt
                    )
            );

            if (observed.length === 0) {
                return {
                    success: true,
                    investigationId,
                    ingested: 0,
                    classified: 0,
                    memoryHandoffs: 0,
                    results: []
                };
            }

            const documents = observed.map((observation, index) => {
                const sourceUrl =
                    observation.finalUrl ||
                    observation.url ||
                    "";
                const title =
                    String(
                        observation.evidenceTitle ||
                        this.deriveNameFromSourceLocation(sourceUrl) ||
                        `Local perception evidence ${index + 1}`
                    ).trim();
                const excerpt =
                    typeof observation.evidenceExcerpt === "string"
                        ? observation.evidenceExcerpt
                        : "";

                return {
                    name: title,
                    sourceType: "local-perception-evidence",
                    sourceProvider: "maddy-local-perception",
                    sourceLocation: sourceUrl,
                    url: sourceUrl,
                    contentFingerprint:
                        observation.contentSha256 || null,
                    checksum:
                        observation.contentSha256 || null,
                    sizeBytes:
                        this.normalizeNumber(
                            observation.bytesObservedLocally
                        ),
                    mimeType:
                        observation.documentType === "pdf"
                            ? "application/pdf"
                            : undefined,
                    extension:
                        observation.documentType === "pdf"
                            ? "pdf"
                            : undefined,
                    extractedText: excerpt || null,
                    authority: "unreviewed",
                    sensitivity:
                        options.sensitivity || "internal",
                    officeAccess:
                        Array.isArray(options.officeAccess)
                            ? options.officeAccess
                            : ["all"],
                    tags: this.uniqueStrings([
                        "local-perception",
                        "investigation-evidence",
                        observation.documentType
                            ? `document-type:${observation.documentType}`
                            : null,
                        ...(Array.isArray(options.tags)
                            ? options.tags
                            : [])
                    ].filter(Boolean)),
                    metadata: {
                        investigationId,
                        localPerceptionSchema:
                            evidence?.schema ||
                            perception?.schema ||
                            "meos.maddy.local-perception-evidence.v1",
                        evidenceTitle:
                            observation.evidenceTitle || null,
                        extractedText: excerpt || null,
                        evidenceExcerpt: excerpt || null,
                        extractionStatus:
                            observation.extractionStatus || null,
                        documentType:
                            observation.documentType || null,
                        pageCount:
                            this.normalizeNullableNumber(
                                observation.pageCount
                            ),
                        changed:
                            observation.changed === true,
                        observed: true,
                        contentSha256:
                            observation.contentSha256 || null,
                        originalUrl:
                            observation.url || null,
                        finalUrl:
                            observation.finalUrl || null,
                        bytesObservedLocally:
                            this.normalizeNumber(
                                observation.bytesObservedLocally
                            ),
                        epistemicStatus:
                            evidence?.epistemicStatus ||
                            "uninterpreted-perception-evidence",
                        institutionalTruthPromoted: false
                    }
                };
            });

            const batchResult = await this.ingest(documents, {
                ...options,
                sourceProvider: "maddy-local-perception",
                handoffToKnowledgeMemory:
                    options.handoffToKnowledgeMemory !== false,
                metadata: {
                    ...(options.metadata || {}),
                    investigationId,
                    source: "maddy-local-perception"
                }
            });

            const downstream = [];

            for (const item of batchResult.results || []) {
                const document = item?.document || null;
                if (!item?.success || !document) {
                    downstream.push({
                        documentId: document?.id || null,
                        classified: false,
                        reason: item?.error || "ingestion-failed"
                    });
                    continue;
                }

                if (
                    options.classify !== false &&
                    global.DocumentClassifier &&
                    typeof global.DocumentClassifier.classifyDocument ===
                        "function"
                ) {
                    const classification =
                        global.DocumentClassifier.classifyDocument(
                            document.id,
                            {
                                actor: this.name,
                                text:
                                    document.metadata?.extractedText ||
                                    "",
                                source: "local-perception-evidence"
                            }
                        );

                    downstream.push({
                        documentId: document.id,
                        classified:
                            classification?.success === true,
                        classification
                    });
                } else {
                    downstream.push({
                        documentId: document.id,
                        classified: false,
                        reason:
                            options.classify === false
                                ? "classification-disabled"
                                : "document-classifier-unavailable"
                    });
                }
            }

            const result = {
                success: batchResult.success,
                investigationId,
                ingested:
                    (batchResult.results || []).filter(
                        (item) =>
                            item?.success === true &&
                            item?.added === true
                    ).length,
                duplicates:
                    (batchResult.results || []).filter(
                        (item) =>
                            item?.success === true &&
                            item?.duplicate === true
                    ).length,
                classified:
                    downstream.filter(
                        (item) => item.classified === true
                    ).length,
                memoryHandoffs:
                    (batchResult.results || []).filter(
                        (item) =>
                            item?.memoryResult?.success === true
                    ).length,
                batch: batchResult.batch,
                results: batchResult.results,
                downstream
            };

            this.logActivity(
                "local-perception.evidence-ingested",
                {
                    investigationId,
                    observed: observed.length,
                    ingested: result.ingested,
                    duplicates: result.duplicates,
                    classified: result.classified,
                    memoryHandoffs: result.memoryHandoffs
                }
            );

            this.emit(
                "local-perception:evidence-ingested",
                this.clone(result)
            );

            return result;
        },

        deriveNameFromSourceLocation(value) {
            const source = String(value || "").trim();
            if (!source) {
                return "";
            }

            try {
                const url = new URL(source);
                const pathName =
                    decodeURIComponent(url.pathname || "")
                        .split("/")
                        .filter(Boolean)
                        .pop();

                return pathName || url.hostname || source;
            } catch (error) {
                return (
                    source
                        .replace(/[?#].*$/, "")
                        .split("/")
                        .filter(Boolean)
                        .pop() ||
                    source
                );
            }
        },

        normalizeBatchInput(input) {
            if (!input) {
                return [];
            }

            if (typeof FileList !== "undefined" && input instanceof FileList) {
                return Array.from(input);
            }

            if (Array.isArray(input)) {
                return input;
            }

            if (
                typeof input[Symbol.iterator] === "function" &&
                typeof input !== "string" &&
                !this.isBrowserFile(input)
            ) {
                return Array.from(input);
            }

            if (Array.isArray(input.documents)) {
                return input.documents;
            }

            if (Array.isArray(input.files)) {
                return input.files;
            }

            return [input];
        },

        async normalizeDocumentInput(input = {}, options = {}) {
            const isFile = this.isBrowserFile(input);
            const name = String(
                input.name ||
                input.title ||
                input.fileName ||
                ""
            ).trim();

            const pathInfo = this.parsePath(
                input.webkitRelativePath ||
                input.relativePath ||
                input.path ||
                name
            );

            const extension =
                String(
                    input.extension ||
                    pathInfo.extension ||
                    ""
                )
                    .replace(/^\./, "")
                    .toLowerCase();

            const mimeType =
                input.type ||
                input.mimeType ||
                this.guessMimeType(extension);

            const sizeBytes =
                this.normalizeNumber(
                    input.size ??
                    input.sizeBytes ??
                    input.metadata?.sizeBytes
                );

            const lastModified =
                this.normalizeDate(
                    input.lastModified ||
                    input.modifiedAt ||
                    input.modifiedTime ||
                    input.updatedAt
                );

            let text =
                typeof input.textContent === "string"
                    ? input.textContent
                    : typeof input.content === "string"
                        ? input.content
                        : typeof input.extractedText === "string"
                            ? input.extractedText
                            : null;

            if (
                !text &&
                isFile &&
                options.readText !== false &&
                this.isTextDocument(mimeType, extension) &&
                sizeBytes <= this.configuration.maximumTextReadBytes
            ) {
                text = await input.text();
            }

            let contentFingerprint =
                input.contentFingerprint ||
                input.checksum ||
                input.md5Checksum ||
                input.sha256 ||
                null;

            let fingerprintMethod =
                contentFingerprint ? "provided" : null;

            if (
                !contentFingerprint &&
                this.configuration.calculateContentFingerprint
            ) {
                if (isFile) {
                    contentFingerprint =
                        await this.hashBrowserFile(input);
                    fingerprintMethod =
                        contentFingerprint
                            ? "sha-256-file"
                            : null;
                } else if (text) {
                    contentFingerprint =
                        await this.hashString(text);
                    fingerprintMethod =
                        contentFingerprint
                            ? "sha-256-text"
                            : null;
                }
            }

            const metadataFingerprint =
                input.metadataFingerprint ||
                (
                    this.configuration.calculateMetadataFingerprint
                        ? await this.hashString(
                            JSON.stringify({
                                name: this.normalizeText(name),
                                sizeBytes,
                                lastModified,
                                mimeType,
                                relativePath: pathInfo.relativePath
                            })
                        )
                        : null
                );

            return {
                id: input.id || null,
                name,
                baseName:
                    input.baseName ||
                    pathInfo.baseName ||
                    name,
                extension,
                mimeType,
                sizeBytes,
                lastModified,
                modifiedAt: lastModified,
                createdAtSource:
                    this.normalizeDate(
                        input.createdAtSource ||
                        input.createdTime ||
                        input.createdAt
                    ),
                sourceType:
                    input.sourceType ||
                    (isFile ? "browser-upload" : "document-record"),
                sourceLocation:
                    input.sourceLocation ||
                    input.location ||
                    input.url ||
                    pathInfo.relativePath ||
                    "",
                sourceProvider:
                    input.sourceProvider ||
                    input.provider ||
                    (isFile ? "local-device" : "unspecified"),
                sourceDocumentId:
                    input.sourceDocumentId ||
                    input.driveFileId ||
                    input.externalId ||
                    null,
                parentPath:
                    input.parentPath ||
                    pathInfo.parentPath ||
                    "",
                relativePath:
                    input.relativePath ||
                    input.webkitRelativePath ||
                    pathInfo.relativePath ||
                    name,
                webViewUrl:
                    input.webViewUrl ||
                    input.url ||
                    "",
                contentFingerprint,
                metadataFingerprint,
                fingerprintMethod:
                    fingerprintMethod ||
                    "metadata-only",
                text,
                browserFile: isFile,
                logicalDocumentId:
                    input.logicalDocumentId || null,
                authority:
                    input.authority || "unreviewed",
                sensitivity:
                    input.sensitivity || "internal",
                officeAccess:
                    Array.isArray(input.officeAccess) &&
                    input.officeAccess.length > 0
                        ? this.uniqueStrings(input.officeAccess)
                        : ["all"],
                tags: this.uniqueStrings(input.tags),
                metadata:
                    input.metadata &&
                    typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}
            };
        },

        findExactDuplicate(candidate) {
            return (
                this.catalog.find((document) => {
                    if (document.status === "archived") {
                        return false;
                    }

                    if (
                        candidate.contentFingerprint &&
                        document.contentFingerprint
                    ) {
                        return (
                            candidate.contentFingerprint ===
                            document.contentFingerprint
                        );
                    }

                    return (
                        candidate.metadataFingerprint &&
                        document.metadataFingerprint &&
                        candidate.metadataFingerprint ===
                            document.metadataFingerprint
                    );
                }) || null
            );
        },

        findVersionCandidate(candidate) {
            const candidateStem =
                this.normalizeVersionStem(
                    candidate.baseName || candidate.name
                );

            const matches = this.catalog
                .filter((document) => {
                    if (
                        document.status === "archived" ||
                        document.contentFingerprint ===
                            candidate.contentFingerprint
                    ) {
                        return false;
                    }

                    const documentStem =
                        this.normalizeVersionStem(
                            document.baseName ||
                            document.name
                        );

                    return (
                        documentStem === candidateStem &&
                        document.extension === candidate.extension
                    );
                })
                .sort((a, b) => {
                    const aDate =
                        Date.parse(a.modifiedAt || a.ingestedAt) || 0;
                    const bDate =
                        Date.parse(b.modifiedAt || b.ingestedAt) || 0;

                    return bDate - aDate;
                });

            return matches[0] || null;
        },

        explainVersionCandidate(previous, candidate) {
            const reasons = [
                "The normalized document names match",
                "The file extensions match",
                "The content fingerprints differ"
            ];

            if (
                previous.sizeBytes !== candidate.sizeBytes
            ) {
                reasons.push("The file sizes differ");
            }

            if (
                previous.modifiedAt &&
                candidate.modifiedAt &&
                previous.modifiedAt !== candidate.modifiedAt
            ) {
                reasons.push("The modified dates differ");
            }

            return `${reasons.join("; ")}.`;
        },

        enqueueForClassification(document, options = {}) {
            const existing = this.classificationQueue.find(
                (item) =>
                    item.documentId === document.id &&
                    !["complete", "cancelled"].includes(item.status)
            );

            if (existing) {
                return {
                    success: true,
                    duplicate: true,
                    queueItem: existing
                };
            }

            const queueItem = {
                id: this.createId("classification-queue"),
                documentId: document.id,
                batchId: options.batchId || null,
                priority:
                    this.normalizePriority(options.priority),
                status: "queued",
                attempts: 0,
                queuedAt: new Date().toISOString(),
                startedAt: null,
                completedAt: null,
                classifierResultId: null,
                error: null
            };

            this.classificationQueue.push(queueItem);
            document.queueStatus = "queued";

            this.emit("classification:queued", {
                document: this.clone(document),
                queueItem: this.clone(queueItem)
            });

            return {
                success: true,
                duplicate: false,
                queueItem
            };
        },

        dequeueNext(options = {}) {
            const office = options.office || null;
            const candidates = this.classificationQueue
                .filter((item) => item.status === "queued")
                .map((item) => ({
                    item,
                    document: this.getDocumentById(item.documentId)
                }))
                .filter(({ document }) => {
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
                })
                .sort((a, b) => {
                    if (a.item.priority !== b.item.priority) {
                        return b.item.priority - a.item.priority;
                    }

                    return (
                        Date.parse(a.item.queuedAt) -
                        Date.parse(b.item.queuedAt)
                    );
                });

            const next = candidates[0];

            if (!next) {
                return {
                    success: true,
                    empty: true,
                    queueItem: null,
                    document: null
                };
            }

            next.item.status = "processing";
            next.item.startedAt = new Date().toISOString();
            next.item.attempts += 1;
            next.document.queueStatus = "processing";

            this.persistIfEnabled();

            return {
                success: true,
                empty: false,
                queueItem: this.clone(next.item),
                document: this.clone(next.document)
            };
        },

        completeQueueItem(queueItemId, result = {}) {
            const item = this.classificationQueue.find(
                (candidate) => candidate.id === queueItemId
            );

            if (!item) {
                return {
                    success: false,
                    error: "Classification queue item was not found."
                };
            }

            const document = this.getDocumentById(item.documentId);

            item.status = "complete";
            item.completedAt = new Date().toISOString();
            item.classifierResultId =
                result.classifierResultId ||
                result.id ||
                null;
            item.error = null;

            if (document) {
                document.queueStatus = "complete";
                document.updatedAt = item.completedAt;
            }

            this.persistIfEnabled();
            this.emit("classification:completed", {
                queueItem: this.clone(item),
                document: this.clone(document),
                result
            });

            return {
                success: true,
                queueItem: this.clone(item),
                document: this.clone(document)
            };
        },

        failQueueItem(queueItemId, error) {
            const item = this.classificationQueue.find(
                (candidate) => candidate.id === queueItemId
            );

            if (!item) {
                return {
                    success: false,
                    error: "Classification queue item was not found."
                };
            }

            const document = this.getDocumentById(item.documentId);

            item.status = "failed";
            item.completedAt = new Date().toISOString();
            item.error =
                typeof error === "string"
                    ? error
                    : error?.message ||
                      "Classification failed.";

            if (document) {
                document.queueStatus = "failed";
                document.updatedAt = item.completedAt;
            }

            this.persistIfEnabled();
            this.emit("classification:failed", {
                queueItem: this.clone(item),
                document: this.clone(document)
            });

            return {
                success: true,
                queueItem: this.clone(item),
                document: this.clone(document)
            };
        },

        retryQueueItem(queueItemId) {
            const item = this.classificationQueue.find(
                (candidate) => candidate.id === queueItemId
            );

            if (!item) {
                return {
                    success: false,
                    error: "Classification queue item was not found."
                };
            }

            const document = this.getDocumentById(item.documentId);

            item.status = "queued";
            item.startedAt = null;
            item.completedAt = null;
            item.error = null;

            if (document) {
                document.queueStatus = "queued";
            }

            this.persistIfEnabled();

            return {
                success: true,
                queueItem: this.clone(item)
            };
        },

        attachDuplicateReference(existing, candidate) {
            existing.duplicateReferenceCount =
                (existing.duplicateReferenceCount || 0) + 1;
            existing.updatedAt = new Date().toISOString();

            existing.metadata = {
                ...existing.metadata,
                duplicateReferences: [
                    ...(existing.metadata?.duplicateReferences || []),
                    {
                        name: candidate.name,
                        sourceLocation: candidate.sourceLocation,
                        relativePath: candidate.relativePath,
                        discoveredAt: new Date().toISOString()
                    }
                ]
            };

            this.rebuildDuplicateGroups();
            this.persistIfEnabled();
        },

        rebuildDerivedIndexes() {
            this.rebuildDuplicateGroups();

            this.versionCandidates =
                this.versionCandidates.filter(
                    (candidate) =>
                        this.getDocumentById(
                            candidate.previousDocumentId
                        ) &&
                        this.getDocumentById(
                            candidate.candidateDocumentId
                        )
                );

            this.classificationQueue =
                this.classificationQueue.filter(
                    (item) =>
                        this.getDocumentById(item.documentId)
                );
        },

        rebuildDuplicateGroups() {
            const fingerprintMap = new Map();

            this.catalog.forEach((document) => {
                const fingerprint =
                    document.contentFingerprint ||
                    document.metadataFingerprint;

                if (!fingerprint) {
                    return;
                }

                if (!fingerprintMap.has(fingerprint)) {
                    fingerprintMap.set(fingerprint, []);
                }

                fingerprintMap.get(fingerprint).push(document.id);
            });

            this.duplicateGroups = Array.from(
                fingerprintMap.entries()
            )
                .filter(([, ids]) => ids.length > 1)
                .map(([fingerprint, documentIds]) => ({
                    id: `duplicate-${fingerprint.slice(0, 16)}`,
                    fingerprint,
                    documentIds,
                    canonicalDocumentId: documentIds[0],
                    duplicateCount: documentIds.length - 1,
                    detectedAt: new Date().toISOString()
                }));
        },

        resolveVersionCandidate(
            candidateId,
            decision,
            options = {}
        ) {
            const candidate = this.versionCandidates.find(
                (item) => item.id === candidateId
            );

            if (!candidate) {
                return {
                    success: false,
                    error: "Version candidate was not found."
                };
            }

            const previous = this.getDocumentById(
                candidate.previousDocumentId
            );
            const current = this.getDocumentById(
                candidate.candidateDocumentId
            );

            if (!previous || !current) {
                return {
                    success: false,
                    error: "One or more version documents are missing."
                };
            }

            const normalizedDecision =
                String(decision || "").toLowerCase();

            if (
                ["confirm", "confirmed", "new-version"].includes(
                    normalizedDecision
                )
            ) {
                current.logicalDocumentId =
                    previous.logicalDocumentId;
                previous.status = "superseded";
                previous.supersededById = current.id;
                previous.updatedAt = new Date().toISOString();
                current.status = "cataloged";
                current.previousVersionId = previous.id;
                current.updatedAt = new Date().toISOString();

                candidate.status = "confirmed";
                candidate.resolvedAt =
                    new Date().toISOString();
                candidate.resolvedBy =
                    options.actor || "Executive";
            } else if (
                ["reject", "rejected", "separate"].includes(
                    normalizedDecision
                )
            ) {
                current.versionCandidateOfId = null;
                candidate.status = "rejected";
                candidate.resolvedAt =
                    new Date().toISOString();
                candidate.resolvedBy =
                    options.actor || "Executive";
            } else {
                return {
                    success: false,
                    error:
                        'Decision must be "confirm" or "reject".'
                };
            }

            this.persistIfEnabled();
            this.emit("version-candidate:resolved", {
                candidate: this.clone(candidate),
                previousDocument: this.clone(previous),
                candidateDocument: this.clone(current)
            });

            return {
                success: true,
                candidate: this.clone(candidate),
                previousDocument: this.clone(previous),
                document: this.clone(current)
            };
        },

        registerKnowledgeSource(document) {
            if (
                !global.KnowledgeEngine ||
                typeof global.KnowledgeEngine.registerSource !==
                    "function"
            ) {
                return {
                    success: false,
                    connected: false,
                    error: "Knowledge Engine is unavailable."
                };
            }

            return global.KnowledgeEngine.registerSource({
                id: `source-ingestion-${document.id}`,
                name: document.name,
                sourceType: "ingested-document",
                authority: document.authority,
                documentId: document.id,
                url: document.webViewUrl,
                checksum:
                    document.contentFingerprint ||
                    document.metadataFingerprint,
                description:
                    "Document cataloged by the MEOS Document Ingestion Engine.",
                metadata: {
                    extension: document.extension,
                    mimeType: document.mimeType,
                    sizeBytes: document.sizeBytes,
                    sensitivity: document.sensitivity,
                    sourceProvider: document.sourceProvider,
                    sourceLocation: document.sourceLocation,
                    logicalDocumentId: document.logicalDocumentId,
                    investigationId:
                        document.metadata?.investigationId || null,
                    contentSha256:
                        document.metadata?.contentSha256 ||
                        document.contentFingerprint ||
                        null,
                    documentType:
                        document.metadata?.documentType || null,
                    pageCount:
                        document.metadata?.pageCount ?? null,
                    extractionStatus:
                        document.metadata?.extractionStatus || null,
                    epistemicStatus:
                        document.metadata?.epistemicStatus || null
                }
            });
        },

        handoffToKnowledgeMemory(document, text, options = {}) {
            if (
                !global.KnowledgeMemory ||
                typeof global.KnowledgeMemory.ingestDocument !==
                    "function"
            ) {
                return {
                    success: false,
                    connected: false,
                    error: "Knowledge Memory is unavailable."
                };
            }

            return global.KnowledgeMemory.ingestDocument(
                {
                    id: `memory-${document.id}`,
                    title: document.name,
                    text,
                    documentType: "unclassified-document",
                    sourceType: "ingested-document",
                    sourceId: `source-ingestion-${document.id}`,
                    logicalDocumentId:
                        document.logicalDocumentId,
                    url: document.webViewUrl,
                    authority: document.authority,
                    sensitivity: document.sensitivity,
                    officeAccess: document.officeAccess,
                    tags: [
                        ...document.tags,
                        "document-ingestion"
                    ],
                    metadata: {
                        ingestionDocumentId: document.id,
                        originalExtension:
                            document.extension,
                        originalMimeType:
                            document.mimeType,
                        originalSizeBytes:
                            document.sizeBytes,
                        classificationPending: true,
                        investigationId:
                            document.metadata?.investigationId || null,
                        contentSha256:
                            document.metadata?.contentSha256 ||
                            document.contentFingerprint ||
                            null,
                        documentType:
                            document.metadata?.documentType || null,
                        pageCount:
                            document.metadata?.pageCount ?? null,
                        extractionStatus:
                            document.metadata?.extractionStatus || null,
                        epistemicStatus:
                            document.metadata?.epistemicStatus ||
                            "uninterpreted-perception-evidence",
                        institutionalTruthPromoted: false
                    }
                },
                {
                    allowDuplicate:
                        options.allowDuplicate === true,
                    createVersion:
                        options.createVersion !== false
                }
            );
        },

        registerSystemKnowledge() {
            if (
                !global.KnowledgeEngine ||
                typeof global.KnowledgeEngine.createRecord !==
                    "function"
            ) {
                return {
                    success: false,
                    connected: false
                };
            }

            const id =
                "knowledge-system-document-ingestion";
            const existing =
                global.KnowledgeEngine.getRecordById?.(id);

            if (existing) {
                return {
                    success: true,
                    duplicate: true,
                    record: existing
                };
            }

            return global.KnowledgeEngine.createRecord({
                id,
                recordType: "system-component",
                title: "MEOS Document Ingestion Engine",
                summary:
                    "Universal document discovery, cataloging, fingerprinting, duplicate detection, version-candidate detection, and classification queue management.",
                content:
                    "The Document Ingestion Engine catalogs documents without assigning organizational meaning. Classification is delegated to a separate engine.",
                tags: [
                    "meos-core",
                    "document-ingestion",
                    "system-component"
                ],
                topics: [
                    "document-catalog",
                    "fingerprints",
                    "duplicates",
                    "version-candidates",
                    "classification-queue"
                ],
                authority: "system",
                confidence: 1,
                sensitivity: "internal",
                officeAccess: ["all"],
                metadata: {
                    componentVersion: this.version,
                    organizationNeutralCore: true,
                    brickBoundary:
                        "Cataloging only; no document classification."
                },
                createdBy:
                    "MEOS Document Ingestion Engine"
            });
        },

        createBatch(total, options = {}) {
            const timestamp = new Date().toISOString();
            const batch = {
                id: this.createId("ingestion-batch"),
                status: "processing",
                total,
                processed: 0,
                added: 0,
                duplicates: 0,
                versionCandidates: 0,
                failed: 0,
                sourceProvider:
                    options.sourceProvider || "mixed",
                startedAt: timestamp,
                updatedAt: timestamp,
                completedAt: null,
                metadata:
                    options.metadata &&
                    typeof options.metadata === "object"
                        ? { ...options.metadata }
                        : {}
            };

            this.batches.push(batch);
            return batch;
        },

        updateBatchFromResult(batch, result) {
            if (!result?.success) {
                batch.failed += 1;
                return;
            }

            if (result.duplicate) {
                batch.duplicates += 1;
                return;
            }

            if (result.added) {
                batch.added += 1;
            }

            if (result.versionCandidate) {
                batch.versionCandidates += 1;
            }
        },

        getDocumentById(documentId) {
            return (
                this.catalog.find(
                    (document) => document.id === documentId
                ) || null
            );
        },

        getDocumentsByLogicalId(logicalDocumentId) {
            return this.catalog
                .filter(
                    (document) =>
                        document.logicalDocumentId ===
                        logicalDocumentId
                )
                .sort((a, b) => {
                    const aDate =
                        Date.parse(a.modifiedAt || a.ingestedAt) || 0;
                    const bDate =
                        Date.parse(b.modifiedAt || b.ingestedAt) || 0;

                    return aDate - bDate;
                })
                .map((document) => this.clone(document));
        },

        searchCatalog(query = "", filters = {}) {
            const normalizedQuery =
                this.normalizeText(query);

            return this.catalog
                .filter((document) => {
                    if (
                        filters.status &&
                        document.status !== filters.status
                    ) {
                        return false;
                    }

                    if (
                        filters.extension &&
                        document.extension !==
                            String(filters.extension)
                                .replace(/^\./, "")
                                .toLowerCase()
                    ) {
                        return false;
                    }

                    if (
                        filters.mimeType &&
                        document.mimeType !== filters.mimeType
                    ) {
                        return false;
                    }

                    if (
                        filters.sourceProvider &&
                        document.sourceProvider !==
                            filters.sourceProvider
                    ) {
                        return false;
                    }

                    if (
                        filters.queueStatus &&
                        document.queueStatus !==
                            filters.queueStatus
                    ) {
                        return false;
                    }

                    if (!normalizedQuery) {
                        return true;
                    }

                    const haystack = this.normalizeText(
                        [
                            document.name,
                            document.relativePath,
                            document.sourceLocation,
                            document.tags.join(" ")
                        ].join(" ")
                    );

                    return haystack.includes(normalizedQuery);
                })
                .map((document) => this.clone(document));
        },

        archiveDocument(
            documentId,
            reason = "",
            actor = "Executive"
        ) {
            const document = this.getDocumentById(documentId);

            if (!document) {
                return {
                    success: false,
                    error: "Document was not found."
                };
            }

            document.status = "archived";
            document.archiveReason = reason;
            document.archivedBy = actor;
            document.archivedAt =
                new Date().toISOString();
            document.updatedAt = document.archivedAt;

            const queueItem =
                this.classificationQueue.find(
                    (item) =>
                        item.documentId === documentId &&
                        !["complete", "cancelled"].includes(
                            item.status
                        )
                );

            if (queueItem) {
                queueItem.status = "cancelled";
                queueItem.completedAt =
                    document.archivedAt;
            }

            this.rebuildDerivedIndexes();
            this.persistIfEnabled();
            this.emit("document:archived", {
                document: this.clone(document)
            });

            return {
                success: true,
                document: this.clone(document)
            };
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
                knowledgeEngineConnected:
                    Boolean(global.KnowledgeEngine),
                knowledgeMemoryConnected:
                    Boolean(global.KnowledgeMemory),
                documentCount: this.catalog.length,
                activeDocumentCount:
                    this.catalog.filter(
                        (document) =>
                            document.status !== "archived"
                    ).length,
                duplicateGroupCount:
                    this.duplicateGroups.length,
                unresolvedVersionCandidateCount:
                    this.versionCandidates.filter(
                        (candidate) =>
                            candidate.status === "unreviewed"
                    ).length,
                queuedClassificationCount:
                    this.classificationQueue.filter(
                        (item) => item.status === "queued"
                    ).length,
                processingClassificationCount:
                    this.classificationQueue.filter(
                        (item) =>
                            item.status === "processing"
                    ).length,
                failedClassificationCount:
                    this.classificationQueue.filter(
                        (item) => item.status === "failed"
                    ).length,
                batchCount: this.batches.length,
                initializedAt: this.initializedAt
            };
        },

        exportCatalog(options = {}) {
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
                    catalog: this.catalog,
                    duplicateGroups:
                        this.duplicateGroups,
                    versionCandidates:
                        this.versionCandidates,
                    classificationQueue:
                        options.includeQueue === false
                            ? []
                            : this.classificationQueue,
                    batches:
                        options.includeBatches === false
                            ? []
                            : this.batches,
                    activityLog:
                        options.includeActivityLog === true
                            ? this.activityLog
                            : []
                }
            };
        },

        importCatalog(payload, options = {}) {
            let data = payload;

            if (typeof payload === "string") {
                try {
                    data = JSON.parse(payload);
                } catch (error) {
                    return {
                        success: false,
                        error:
                            "The ingestion import is not valid JSON."
                    };
                }
            }

            if (!data || data.schema !== SCHEMA) {
                return {
                    success: false,
                    error:
                        "The import is not a MEOS Document Ingestion package."
                };
            }

            if (options.replace === true) {
                this.catalog = [];
                this.duplicateGroups = [];
                this.versionCandidates = [];
                this.classificationQueue = [];
                this.batches = [];
                this.activityLog = [];
            }

            this.mergeById(
                this.catalog,
                data.catalog || []
            );
            this.mergeById(
                this.versionCandidates,
                data.versionCandidates || []
            );
            this.mergeById(
                this.classificationQueue,
                data.classificationQueue || []
            );
            this.mergeById(
                this.batches,
                data.batches || []
            );

            if (
                options.includeActivityLog === true
            ) {
                this.mergeById(
                    this.activityLog,
                    data.activityLog || []
                );
            }

            this.rebuildDerivedIndexes();
            this.persistIfEnabled();

            this.emit("ingestion:imported", {
                importedAt: new Date().toISOString()
            });

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
                        "Document Ingestion persistence is disabled."
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
                        this.exportCatalog({
                            includeActivityLog: false
                        }).data
                    )
                );

                this.emit("ingestion:persisted", {
                    timestamp: new Date().toISOString()
                });

                return {
                    success: true,
                    persisted: true
                };
            } catch (error) {
                console.error(
                    "[MEOS Document Ingestion] Persistence failed:",
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
                const data = JSON.parse(stored);
                const result = this.importCatalog(
                    data,
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
                    "[MEOS Document Ingestion] Stored catalog could not be restored:",
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
                        "Clearing ingestion data requires { confirm: true }."
                };
            }

            this.catalog = [];
            this.duplicateGroups = [];
            this.versionCandidates = [];
            this.classificationQueue = [];
            this.batches = [];
            this.activityLog = [];

            if (global.localStorage) {
                global.localStorage.removeItem(
                    this.configuration.localStorageKey
                );
            }

            this.emit("ingestion:cleared", {
                timestamp: new Date().toISOString()
            });

            return {
                success: true,
                status: this.getStatus()
            };
        },

        isBrowserFile(value) {
            return (
                typeof File !== "undefined" &&
                value instanceof File
            );
        },

        isTextDocument(mimeType, extension) {
            return (
                this.configuration.supportedTextMimeTypes.includes(
                    String(mimeType || "").toLowerCase()
                ) ||
                this.configuration.supportedTextExtensions.includes(
                    String(extension || "").toLowerCase()
                )
            );
        },

        async hashBrowserFile(file) {
            if (
                !file ||
                typeof file.arrayBuffer !== "function"
            ) {
                return null;
            }

            try {
                const buffer = await file.arrayBuffer();
                return await this.hashBuffer(buffer);
            } catch (error) {
                console.warn(
                    `[MEOS Document Ingestion] Could not fingerprint "${file.name}":`,
                    error
                );
                return null;
            }
        },

        async hashString(value) {
            const text = String(value ?? "");

            if (
                global.crypto?.subtle &&
                typeof TextEncoder !== "undefined"
            ) {
                const bytes =
                    new TextEncoder().encode(text);
                return this.hashBuffer(bytes);
            }

            return this.fallbackHash(text);
        },

        async hashBuffer(buffer) {
            if (global.crypto?.subtle) {
                const digest =
                    await global.crypto.subtle.digest(
                        "SHA-256",
                        buffer
                    );

                return Array.from(
                    new Uint8Array(digest)
                )
                    .map((byte) =>
                        byte.toString(16).padStart(2, "0")
                    )
                    .join("");
            }

            const bytes =
                buffer instanceof Uint8Array
                    ? buffer
                    : new Uint8Array(buffer);

            let text = "";
            const limit = Math.min(
                bytes.length,
                250000
            );

            for (let index = 0; index < limit; index += 1) {
                text += String.fromCharCode(bytes[index]);
            }

            return this.fallbackHash(
                `${bytes.length}:${text}`
            );
        },

        fallbackHash(value) {
            const text = String(value ?? "");
            let hashA = 2166136261;
            let hashB = 16777619;

            for (
                let index = 0;
                index < text.length;
                index += 1
            ) {
                const character =
                    text.charCodeAt(index);

                hashA ^= character;
                hashA = Math.imul(
                    hashA,
                    16777619
                );

                hashB += character;
                hashB = Math.imul(
                    hashB,
                    2246822519
                );
            }

            return [
                (hashA >>> 0)
                    .toString(16)
                    .padStart(8, "0"),
                (hashB >>> 0)
                    .toString(16)
                    .padStart(8, "0"),
                text.length
                    .toString(16)
                    .padStart(8, "0")
            ].join("");
        },

        parsePath(value) {
            const normalizedPath =
                String(value || "")
                    .replace(/\\/g, "/")
                    .replace(/^\/+/, "");

            const segments =
                normalizedPath
                    .split("/")
                    .filter(Boolean);

            const name =
                segments[segments.length - 1] ||
                normalizedPath;

            const lastDot = name.lastIndexOf(".");
            const extension =
                lastDot > 0
                    ? name.slice(lastDot + 1)
                        .toLowerCase()
                    : "";
            const baseName =
                lastDot > 0
                    ? name.slice(0, lastDot)
                    : name;

            return {
                relativePath:
                    normalizedPath || name,
                parentPath:
                    segments.length > 1
                        ? segments.slice(0, -1).join("/")
                        : "",
                name,
                baseName,
                extension
            };
        },

        createLogicalDocumentId(document) {
            const stem =
                this.normalizeVersionStem(
                    document.baseName ||
                    document.name
                );

            const provider =
                this.normalizeText(
                    document.sourceProvider ||
                    "unspecified"
                );

            const path =
                this.normalizeText(
                    document.parentPath ||
                    document.sourceLocation ||
                    ""
                );

            return [
                "logical-document",
                this.slugify(provider),
                this.slugify(path),
                this.slugify(stem)
            ]
                .filter(Boolean)
                .join("-");
        },

        normalizeVersionStem(value) {
            return this.normalizeText(value)
                .replace(
                    /\b(copy|final|finalized|draft|revised|revision|rev|version|ver|v)\b[\s._-]*\d*/g,
                    " "
                )
                .replace(
                    /\b(19|20)\d{2}[-_.]?\d{0,2}[-_.]?\d{0,2}\b/g,
                    " "
                )
                .replace(
                    /\(\d+\)$/g,
                    " "
                )
                .replace(/\s+/g, " ")
                .trim();
        },

        normalizeText(value) {
            return String(value ?? "")
                .normalize("NFKD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, " ")
                .replace(/\s+/g, " ")
                .trim();
        },

        slugify(value) {
            return this.normalizeText(value)
                .replace(/\s+/g, "-")
                .slice(0, 80);
        },

        guessMimeType(extension) {
            const mimeTypes = {
                pdf: "application/pdf",
                doc: "application/msword",
                docx:
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                xls: "application/vnd.ms-excel",
                xlsx:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ppt: "application/vnd.ms-powerpoint",
                pptx:
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                txt: "text/plain",
                md: "text/markdown",
                csv: "text/csv",
                json: "application/json",
                xml: "application/xml",
                html: "text/html",
                htm: "text/html",
                png: "image/png",
                jpg: "image/jpeg",
                jpeg: "image/jpeg",
                webp: "image/webp",
                zip: "application/zip"
            };

            return (
                mimeTypes[
                    String(extension || "")
                        .toLowerCase()
                ] ||
                "application/octet-stream"
            );
        },

        normalizeDate(value) {
            if (!value) {
                return null;
            }

            const date =
                value instanceof Date
                    ? value
                    : new Date(value);

            return Number.isNaN(date.getTime())
                ? null
                : date.toISOString();
        },

        normalizeNullableNumber(value) {
            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {
                return null;
            }

            const number = Number(value);
            return Number.isFinite(number)
                ? number
                : null;
        },

        normalizeNumber(value) {
            const number = Number(value);
            return Number.isFinite(number)
                ? number
                : 0;
        },

        normalizePriority(value) {
            const normalized = Number(value);
            if (!Number.isFinite(normalized)) {
                return 50;
            }

            return Math.min(
                100,
                Math.max(0, Math.round(normalized))
            );
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

        logActivity(action, details = {}) {
            const entry = {
                id: this.createId("ingestion-activity"),
                action,
                timestamp: new Date().toISOString(),
                details
            };

            this.activityLog.push(entry);

            if (this.activityLog.length > 1000) {
                this.activityLog.splice(
                    0,
                    this.activityLog.length - 1000
                );
            }

            this.emit("activity:logged", this.clone(entry));
            return entry;
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
                        `[MEOS Document Ingestion] Event listener failed for "${eventName}":`,
                        error
                    );
                }
            });
        }
    };

    global.DocumentIngestion =
        DocumentIngestion;

    DocumentIngestion.initialize();
})(window);
