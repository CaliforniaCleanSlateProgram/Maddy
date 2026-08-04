/*
 * MEOS Grant Portal Execution Adapter
 * Version: 1.0.0
 * Build: GPEA100-UNIVERSAL-GRANT-PORTAL-EXECUTION-20260804-A
 *
 * Mission:
 * Provide one governed execution contract between the MEOS Grant Office,
 * Executive Automation Engine, and future provider-specific grant portals.
 *
 * Boundary:
 * This adapter does not contain credentials, bypass authentication, scrape
 * protected systems, or submit an application without executive approval.
 * Provider-specific connectors must supply real portal operations later.
 */

(function initializeGrantPortalExecutionAdapter(global) {
    "use strict";

    const VERSION = "1.0.0";
    const BUILD_ID =
        "GPEA100-UNIVERSAL-GRANT-PORTAL-EXECUTION-20260804-A";
    const ADAPTER_ID =
        "meos-grant-portal-execution-adapter-v1";

    const SESSION_STATES = Object.freeze({
        CREATED: "created",
        AUTHENTICATION_REQUIRED: "authentication-required",
        AUTHENTICATED: "authenticated",
        NAVIGATING: "navigating",
        POPULATING: "populating",
        VALIDATING: "validating",
        DRAFT_SAVED: "draft-saved",
        PAUSED: "paused",
        READY_FOR_EXECUTIVE_REVIEW:
            "ready-for-executive-review",
        READY_FOR_SUBMISSION:
            "ready-for-submission",
        SUBMITTED: "submitted",
        COMPLETE: "complete",
        FAILED: "failed"
    });

    const STEP_TYPES = Object.freeze({
        CREATE_SESSION: "create-session",
        AUTHENTICATE: "authenticate",
        NAVIGATE: "navigate",
        FILL_FIELD: "fill-field",
        UPLOAD_ATTACHMENT: "upload-attachment",
        SAVE_DRAFT: "save-draft",
        RESUME_DRAFT: "resume-draft",
        VALIDATE: "validate",
        CAPTURE_EVIDENCE: "capture-evidence",
        EXECUTIVE_REVIEW: "executive-review",
        SUBMIT: "submit",
        CAPTURE_RECEIPT: "capture-receipt"
    });

    const PROVIDER_TYPES = Object.freeze({
        UNIVERSAL: "universal",
        GRANTS_GOV: "grants-gov",
        SUBMITTABLE: "submittable",
        FOUNDANT: "foundant",
        FLUXX: "fluxx",
        SMARTSIMPLE: "smartsimple",
        BLACKBAUD: "blackbaud",
        GENERIC_WEB_PORTAL: "generic-web-portal",
        PDF_PACKAGE: "pdf-package",
        DOCX_PACKAGE: "docx-package"
    });

    const GrantPortalExecutionAdapter = {
        name: "MEOS Grant Portal Execution Adapter",
        version: VERSION,
        buildId: BUILD_ID,
        adapterId: ADAPTER_ID,
        status: "initializing",
        operatingMode:
            "governed-grant-portal-execution-contract",

        configuration: {
            requireExecutiveApprovalForSubmit: true,
            requireExecutiveApprovalForExternalEffect: true,
            requireAuthenticationEvidence: true,
            preserveEvidence: true,
            maximumFieldsPerJob: 1000,
            maximumAttachmentsPerJob: 100,
            maximumExecutionHistory: 5000,
            defaultProviderType:
                PROVIDER_TYPES.UNIVERSAL
        },

        providers: {},
        sessions: [],
        receipts: [],
        history: [],
        initializedAt: null,

        analytics: {
            providerCount: 0,
            sessionCount: 0,
            activeSessions: 0,
            completedSessions: 0,
            failedSessions: 0,
            receiptCount: 0,
            fieldsPopulated: 0,
            attachmentsMapped: 0,
            draftsSaved: 0,
            submissionsRecorded: 0,
            lastExecutionAt: null
        },

        initialize(options = {}) {
            this.configuration = {
                ...this.configuration,
                ...(options.configuration || options)
            };

            this.registerUniversalProvider();
            const registration =
                this.registerWithExecutiveAutomation();

            this.status = registration.success
                ? "online"
                : "waiting-for-executive-automation";
            this.initializedAt =
                new Date().toISOString();

            this.recalculateAnalytics();

            console.info(
                `[MEOS] ${this.name} v${this.version} ${this.status}. Build ${this.buildId}.`
            );

            return this.getStatus();
        },

        registerUniversalProvider() {
            return this.registerProvider({
                id: "grant-portal-provider-universal",
                name: "Universal Grant Portal",
                type: PROVIDER_TYPES.UNIVERSAL,
                capabilities: [
                    "login",
                    "navigate",
                    "fill-field",
                    "upload",
                    "save-draft",
                    "resume",
                    "validate",
                    "submit",
                    "capture-evidence"
                ],
                requiresAuthentication: true,
                supportsDrafts: true,
                supportsResume: true,
                supportsFinalSubmission: true
            });
        },

        registerProvider(input = {}) {
            const id =
                String(input.id || "").trim();
            const name =
                String(input.name || "").trim();

            if (!id || !name) {
                return {
                    success: false,
                    error:
                        "Grant portal providers require id and name."
                };
            }

            const provider = {
                id,
                name,
                type:
                    Object.values(PROVIDER_TYPES).includes(
                        input.type
                    )
                        ? input.type
                        : PROVIDER_TYPES.GENERIC_WEB_PORTAL,
                capabilities:
                    this.uniqueStrings(
                        input.capabilities || []
                    ),
                requiresAuthentication:
                    input.requiresAuthentication !== false,
                supportsDrafts:
                    input.supportsDrafts === true,
                supportsResume:
                    input.supportsResume === true,
                supportsFinalSubmission:
                    input.supportsFinalSubmission !== false,
                execute:
                    typeof input.execute === "function"
                        ? input.execute
                        : null,
                authenticate:
                    typeof input.authenticate === "function"
                        ? input.authenticate
                        : null,
                registeredAt:
                    new Date().toISOString(),
                metadata:
                    input.metadata &&
                    typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}
            };

            this.providers[id] = provider;
            this.logHistory("provider.registered", {
                providerId: id,
                providerType: provider.type
            });
            this.recalculateAnalytics();

            return {
                success: true,
                provider:
                    this.publicProvider(provider)
            };
        },

        registerWithExecutiveAutomation() {
            const engine =
                global.ExecutiveAutomation;

            if (
                !engine ||
                typeof engine.registerExecutionAdapter !==
                    "function"
            ) {
                return {
                    success: false,
                    error:
                        "Executive Automation Engine v1.1.0 is required."
                };
            }

            const result =
                engine.registerExecutionAdapter(
                    ADAPTER_ID,
                    {
                        name: this.name,
                        version: this.version,
                        capabilities: [
                            "login",
                            "navigate",
                            "fill-field",
                            "upload",
                            "save-draft",
                            "resume",
                            "validate",
                            "submit",
                            "capture-evidence"
                        ],
                        execute:
                            ({ job, target, session, options }) =>
                                this.execute({
                                    job,
                                    target,
                                    automationSession: session,
                                    options
                                })
                    },
                    {
                        actor:
                            "MEOS Grant Portal Execution Adapter"
                    }
                );

            const target =
                engine.executionTargets?.find(
                    (candidate) =>
                        candidate.type ===
                        engine.EXECUTION_TARGET_TYPES
                            ?.GRANT_PORTAL
                );

            if (target) {
                target.adapterId =
                    ADAPTER_ID;
            }

            return result;
        },

        normalizeExecutionPackage(input = {}) {
            const applicationPackage =
                input.applicationPackage ||
                input.executiveApplicationPackage ||
                input.payload?.applicationPackage ||
                null;

            const portalIntelligence =
                input.portalIntelligence ||
                input.submissionPortalIntelligence ||
                input.payload?.portalIntelligence ||
                null;

            const portalSubmissionPackage =
                input.portalSubmissionPackage ||
                input.payload?.portalSubmissionPackage ||
                null;

            if (!applicationPackage) {
                return {
                    success: false,
                    error:
                        "Executive Application Package is required.",
                    code:
                        "GRANT_PORTAL_APPLICATION_PACKAGE_REQUIRED"
                };
            }

            if (!portalIntelligence) {
                return {
                    success: false,
                    error:
                        "Submission Portal Intelligence is required.",
                    code:
                        "GRANT_PORTAL_INTELLIGENCE_REQUIRED"
                };
            }

            const providerType =
                portalIntelligence.portal?.type ||
                portalSubmissionPackage?.portal?.type ||
                PROVIDER_TYPES.UNIVERSAL;

            const provider =
                Object.values(this.providers).find(
                    (candidate) =>
                        candidate.type === providerType
                ) ||
                this.providers[
                    "grant-portal-provider-universal"
                ];

            const fields =
                (
                    portalIntelligence.fields ||
                    portalSubmissionPackage?.fieldMap ||
                    []
                )
                    .slice(
                        0,
                        this.configuration.maximumFieldsPerJob
                    )
                    .map((field, index) =>
                        this.normalizeField(field, index)
                    );

            const attachments =
                (
                    applicationPackage.attachmentIndex ||
                    []
                )
                    .slice(
                        0,
                        this.configuration
                            .maximumAttachmentsPerJob
                    )
                    .map((item, index) =>
                        this.normalizeAttachment(
                            item,
                            index
                        )
                    );

            return {
                success: true,
                package: {
                    schema:
                        "meos.grant-portal.execution-package.v1",
                    version: this.version,
                    buildId: this.buildId,
                    opportunityId:
                        input.opportunityId ||
                        applicationPackage.opportunityId ||
                        null,
                    applicationPackageId:
                        applicationPackage.id ||
                        null,
                    portalIntelligenceId:
                        portalIntelligence.id ||
                        null,
                    portalSubmissionPackageId:
                        portalSubmissionPackage?.id ||
                        null,
                    provider:
                        this.publicProvider(provider),
                    fields,
                    attachments,
                    certifications:
                        this.clone(
                            applicationPackage
                                .certificationPacket ||
                            []
                        ),
                    signatures:
                        this.clone(
                            applicationPackage
                                .signaturePacket ||
                            []
                        ),
                    executiveReviewApproved:
                        applicationPackage
                            .executiveReviewApproved === true ||
                        portalSubmissionPackage
                            ?.executiveAuthorization
                            ?.authorized === true,
                    finalSubmissionAuthorized:
                        input.finalSubmissionAuthorized === true ||
                        portalSubmissionPackage
                            ?.finalSubmitBlocked === false,
                    metadata:
                        input.metadata &&
                        typeof input.metadata === "object"
                            ? this.clone(input.metadata)
                            : {}
                }
            };
        },

        normalizeField(field = {}, index = 0) {
            return {
                id:
                    field.id ||
                    field.portalFieldId ||
                    `grant-portal-field-${index + 1}`,
                label:
                    String(
                        field.label ||
                        field.question ||
                        ""
                    ),
                type:
                    field.type ||
                    "text",
                required:
                    field.required !== false,
                value:
                    field.value ?? null,
                completed:
                    field.completed === true,
                approved:
                    field.approved === true,
                limits:
                    this.clone(
                        field.limits || {}
                    ),
                sourceQuestionId:
                    field.sourceQuestionId ||
                    null,
                validationRules:
                    this.clone(
                        field.validationRules || []
                    )
            };
        },

        normalizeAttachment(item = {}, index = 0) {
            return {
                id:
                    item.id ||
                    `grant-portal-attachment-${index + 1}`,
                name:
                    String(
                        item.name ||
                        item.title ||
                        `Attachment ${index + 1}`
                    ),
                required:
                    item.required !== false,
                documentId:
                    item.documentId ||
                    null,
                verified:
                    item.verified === true,
                current:
                    item.current !== false,
                attached:
                    item.attached === true
            };
        },

        createSession(executionPackage, options = {}) {
            const timestamp =
                new Date().toISOString();

            const session = {
                id:
                    this.createId(
                        "grant-portal-session"
                    ),
                providerId:
                    executionPackage.provider.id,
                providerType:
                    executionPackage.provider.type,
                opportunityId:
                    executionPackage.opportunityId,
                applicationPackageId:
                    executionPackage.applicationPackageId,
                status:
                    executionPackage.provider
                        .requiresAuthentication
                        ? SESSION_STATES
                            .AUTHENTICATION_REQUIRED
                        : SESSION_STATES.CREATED,
                fields:
                    this.clone(
                        executionPackage.fields
                    ),
                attachments:
                    this.clone(
                        executionPackage.attachments
                    ),
                certifications:
                    this.clone(
                        executionPackage.certifications
                    ),
                signatures:
                    this.clone(
                        executionPackage.signatures
                    ),
                executiveReviewApproved:
                    executionPackage
                        .executiveReviewApproved,
                finalSubmissionAuthorized:
                    executionPackage
                        .finalSubmissionAuthorized,
                authentication: {
                    required:
                        executionPackage.provider
                            .requiresAuthentication,
                    authenticated:
                        false,
                    authenticatedAt:
                        null,
                    evidence:
                        []
                },
                validation: null,
                draft: null,
                checkpoint: null,
                evidence: [],
                executionHistory: [],
                createdAt:
                    timestamp,
                updatedAt:
                    timestamp,
                completedAt:
                    null,
                failure:
                    null,
                metadata:
                    this.clone(
                        executionPackage.metadata
                    )
            };

            this.sessions.unshift(session);
            this.recordSessionStep(
                session,
                STEP_TYPES.CREATE_SESSION,
                {
                    success: true,
                    actor:
                        options.actor ||
                        "Maddy"
                }
            );

            this.recalculateAnalytics();

            return {
                success: true,
                session:
                    this.clone(session)
            };
        },

        authenticateSession(
            sessionId,
            input = {}
        ) {
            const session =
                this.getSessionById(
                    sessionId
                );

            if (!session) {
                return {
                    success: false,
                    error:
                        "Grant portal session was not found."
                };
            }

            if (
                !session.authentication.required
            ) {
                session.authentication.authenticated =
                    true;
            } else if (
                input.authenticated !== true
            ) {
                return {
                    success: false,
                    error:
                        "Provider authentication has not been verified.",
                    code:
                        "GRANT_PORTAL_AUTHENTICATION_REQUIRED"
                };
            } else {
                session.authentication.authenticated =
                    true;
            }

            session.authentication.authenticatedAt =
                input.authenticatedAt ||
                new Date().toISOString();
            session.authentication.evidence =
                this.clone(
                    input.evidence || []
                );
            session.status =
                SESSION_STATES.AUTHENTICATED;
            session.updatedAt =
                new Date().toISOString();

            this.recordSessionStep(
                session,
                STEP_TYPES.AUTHENTICATE,
                {
                    success: true,
                    evidence:
                        session.authentication
                            .evidence
                }
            );

            return {
                success: true,
                session:
                    this.clone(session)
            };
        },

        populateSession(sessionId) {
            const session =
                this.getSessionById(sessionId);

            if (!session) {
                return {
                    success: false,
                    error:
                        "Grant portal session was not found."
                };
            }

            if (
                session.authentication.required &&
                !session.authentication.authenticated
            ) {
                return {
                    success: false,
                    error:
                        "Grant portal authentication is required before population.",
                    code:
                        "GRANT_PORTAL_AUTHENTICATION_REQUIRED"
                };
            }

            session.status =
                SESSION_STATES.POPULATING;

            const fieldResults =
                session.fields.map((field) => {
                    const hasValue =
                        field.value !== null &&
                        field.value !== undefined &&
                        String(field.value).trim() !== "";

                    field.completed =
                        hasValue;
                    field.executionStatus =
                        hasValue
                            ? "populated"
                            : "missing-value";

                    return {
                        fieldId:
                            field.id,
                        success:
                            hasValue,
                        status:
                            field.executionStatus
                    };
                });

            const attachmentResults =
                session.attachments.map(
                    (attachment) => {
                        const ready =
                            !attachment.required ||
                            (
                                attachment.documentId &&
                                attachment.verified &&
                                attachment.current
                            );

                        attachment.executionStatus =
                            ready
                                ? "mapped"
                                : "not-ready";

                        return {
                            attachmentId:
                                attachment.id,
                            success:
                                Boolean(ready),
                            status:
                                attachment
                                    .executionStatus
                        };
                    }
                );

            session.updatedAt =
                new Date().toISOString();

            this.analytics.fieldsPopulated +=
                fieldResults.filter(
                    (result) =>
                        result.success
                ).length;
            this.analytics.attachmentsMapped +=
                attachmentResults.filter(
                    (result) =>
                        result.success
                ).length;

            this.recordSessionStep(
                session,
                STEP_TYPES.FILL_FIELD,
                {
                    success:
                        fieldResults.every(
                            (result) =>
                                result.success ||
                                !session.fields.find(
                                    (field) =>
                                        field.id ===
                                        result.fieldId
                                )?.required
                        ),
                    details: {
                        fieldResults,
                        attachmentResults
                    }
                }
            );

            return {
                success: true,
                fieldResults,
                attachmentResults,
                session:
                    this.clone(session)
            };
        },

        validateSession(sessionId) {
            const session =
                this.getSessionById(sessionId);

            if (!session) {
                return {
                    success: false,
                    error:
                        "Grant portal session was not found."
                };
            }

            session.status =
                SESSION_STATES.VALIDATING;

            const missingFieldIds =
                session.fields
                    .filter(
                        (field) =>
                            field.required &&
                            !field.completed
                    )
                    .map(
                        (field) =>
                            field.id
                    );

            const missingAttachmentIds =
                session.attachments
                    .filter(
                        (attachment) =>
                            attachment.required &&
                            (
                                !attachment.documentId ||
                                !attachment.verified ||
                                !attachment.current
                            )
                    )
                    .map(
                        (attachment) =>
                            attachment.id
                    );

            const certificationIds =
                session.certifications
                    .filter(
                        (item) =>
                            item.required &&
                            item.status !==
                                "approved"
                    )
                    .map(
                        (item) =>
                            item.id
                    );

            const signatureIds =
                session.signatures
                    .filter(
                        (item) =>
                            item.required &&
                            item.status !==
                                "signed"
                    )
                    .map(
                        (item) =>
                            item.id
                    );

            session.validation = {
                valid:
                    missingFieldIds.length === 0 &&
                    missingAttachmentIds.length === 0 &&
                    certificationIds.length === 0 &&
                    signatureIds.length === 0,
                missingFieldIds,
                missingAttachmentIds,
                incompleteCertificationIds:
                    certificationIds,
                incompleteSignatureIds:
                    signatureIds,
                validatedAt:
                    new Date().toISOString()
            };

            session.status =
                session.validation.valid
                    ? SESSION_STATES
                        .READY_FOR_EXECUTIVE_REVIEW
                    : SESSION_STATES.PAUSED;
            session.checkpoint =
                session.validation.valid
                    ? "executive-review"
                    : "validation-errors";
            session.updatedAt =
                new Date().toISOString();

            this.recordSessionStep(
                session,
                STEP_TYPES.VALIDATE,
                {
                    success:
                        session.validation.valid,
                    details:
                        session.validation
                }
            );

            return {
                success: true,
                valid:
                    session.validation.valid,
                validation:
                    this.clone(
                        session.validation
                    ),
                session:
                    this.clone(session)
            };
        },

        saveDraft(sessionId, input = {}) {
            const session =
                this.getSessionById(sessionId);

            if (!session) {
                return {
                    success: false,
                    error:
                        "Grant portal session was not found."
                };
            }

            const provider =
                this.providers[
                    session.providerId
                ];

            if (
                provider &&
                provider.supportsDrafts !== true
            ) {
                return {
                    success: false,
                    error:
                        "This provider does not support saved drafts."
                };
            }

            session.draft = {
                saved:
                    true,
                savedAt:
                    input.savedAt ||
                    new Date().toISOString(),
                externalDraftId:
                    input.externalDraftId ||
                    null,
                savedBy:
                    input.savedBy ||
                    "Maddy"
            };
            session.status =
                SESSION_STATES.DRAFT_SAVED;
            session.checkpoint =
                "draft-saved";
            session.updatedAt =
                session.draft.savedAt;

            this.analytics.draftsSaved += 1;

            this.recordSessionStep(
                session,
                STEP_TYPES.SAVE_DRAFT,
                {
                    success: true,
                    details:
                        session.draft
                }
            );

            return {
                success: true,
                session:
                    this.clone(session)
            };
        },

        resumeSession(sessionId, input = {}) {
            const session =
                this.getSessionById(sessionId);

            if (!session) {
                return {
                    success: false,
                    error:
                        "Grant portal session was not found."
                };
            }

            const provider =
                this.providers[
                    session.providerId
                ];

            if (
                provider &&
                provider.supportsResume !== true
            ) {
                return {
                    success: false,
                    error:
                        "This provider does not support resume."
                };
            }

            session.status =
                session.authentication.authenticated
                    ? SESSION_STATES.AUTHENTICATED
                    : SESSION_STATES
                        .AUTHENTICATION_REQUIRED;
            session.checkpoint =
                input.checkpoint ||
                session.checkpoint ||
                "resumed";
            session.updatedAt =
                new Date().toISOString();

            this.recordSessionStep(
                session,
                STEP_TYPES.RESUME_DRAFT,
                {
                    success: true,
                    actor:
                        input.actor ||
                        "Maddy"
                }
            );

            return {
                success: true,
                session:
                    this.clone(session)
            };
        },

        approveExecutiveReview(
            sessionId,
            input = {}
        ) {
            const session =
                this.getSessionById(sessionId);

            if (!session) {
                return {
                    success: false,
                    error:
                        "Grant portal session was not found."
                };
            }

            if (
                !session.validation?.valid
            ) {
                return {
                    success: false,
                    error:
                        "Grant portal session cannot be approved while validation issues remain.",
                    code:
                        "GRANT_PORTAL_VALIDATION_REQUIRED"
                };
            }

            const approvedBy =
                String(
                    input.approvedBy ||
                    ""
                ).trim();

            if (!approvedBy) {
                return {
                    success: false,
                    error:
                        "Executive review approval requires approvedBy."
                };
            }

            session.executiveReviewApproved =
                true;
            session.executiveReview = {
                approvedBy,
                approvedAt:
                    input.approvedAt ||
                    new Date().toISOString(),
                notes:
                    String(
                        input.notes || ""
                    )
            };
            session.status =
                session.finalSubmissionAuthorized
                    ? SESSION_STATES
                        .READY_FOR_SUBMISSION
                    : SESSION_STATES
                        .READY_FOR_EXECUTIVE_REVIEW;
            session.updatedAt =
                session.executiveReview.approvedAt;

            this.recordSessionStep(
                session,
                STEP_TYPES.EXECUTIVE_REVIEW,
                {
                    success: true,
                    actor:
                        approvedBy
                }
            );

            return {
                success: true,
                session:
                    this.clone(session)
            };
        },

        authorizeFinalSubmission(
            sessionId,
            input = {}
        ) {
            const session =
                this.getSessionById(sessionId);

            if (!session) {
                return {
                    success: false,
                    error:
                        "Grant portal session was not found."
                };
            }

            if (
                session.executiveReviewApproved !==
                true
            ) {
                return {
                    success: false,
                    error:
                        "Executive application review must be approved before final submission authorization.",
                    code:
                        "GRANT_PORTAL_EXECUTIVE_REVIEW_REQUIRED"
                };
            }

            const authorizedBy =
                String(
                    input.authorizedBy ||
                    ""
                ).trim();

            if (!authorizedBy) {
                return {
                    success: false,
                    error:
                        "Final submission authorization requires authorizedBy."
                };
            }

            session.finalSubmissionAuthorized =
                true;
            session.finalSubmissionAuthorization = {
                authorizedBy,
                authorizedAt:
                    input.authorizedAt ||
                    new Date().toISOString(),
                scope:
                    "final-grant-submission"
            };
            session.status =
                SESSION_STATES
                    .READY_FOR_SUBMISSION;
            session.updatedAt =
                session.finalSubmissionAuthorization
                    .authorizedAt;

            return {
                success: true,
                session:
                    this.clone(session)
            };
        },

        submitSession(sessionId, input = {}) {
            const session =
                this.getSessionById(sessionId);

            if (!session) {
                return {
                    success: false,
                    error:
                        "Grant portal session was not found."
                };
            }

            if (
                this.configuration
                    .requireExecutiveApprovalForSubmit &&
                session.executiveReviewApproved !==
                    true
            ) {
                return {
                    success: false,
                    error:
                        "Executive review approval is required before submission.",
                    code:
                        "GRANT_PORTAL_EXECUTIVE_REVIEW_REQUIRED"
                };
            }

            if (
                session.finalSubmissionAuthorized !==
                true
            ) {
                return {
                    success: false,
                    error:
                        "Final grant submission is blocked without explicit executive authorization.",
                    code:
                        "GRANT_PORTAL_FINAL_SUBMISSION_BLOCKED"
                };
            }

            if (
                session.validation?.valid !== true
            ) {
                return {
                    success: false,
                    error:
                        "Grant portal validation must pass before submission.",
                    code:
                        "GRANT_PORTAL_VALIDATION_REQUIRED"
                };
            }

            const submittedBy =
                String(
                    input.submittedBy ||
                    session
                        .finalSubmissionAuthorization
                        ?.authorizedBy ||
                    ""
                ).trim();

            const timestamp =
                input.submittedAt ||
                new Date().toISOString();

            session.status =
                SESSION_STATES.SUBMITTED;
            session.updatedAt =
                timestamp;

            const receipt = {
                id:
                    this.createId(
                        "grant-portal-receipt"
                    ),
                sessionId:
                    session.id,
                opportunityId:
                    session.opportunityId,
                providerId:
                    session.providerId,
                providerType:
                    session.providerType,
                submittedAt:
                    timestamp,
                submittedBy,
                confirmationNumber:
                    input.confirmationNumber ||
                    `MEOS-${Date.now()}`,
                receiptDocumentId:
                    input.receiptDocumentId ||
                    null,
                evidence:
                    this.clone(
                        input.evidence || []
                    ),
                status:
                    "submission-recorded",
                createdAt:
                    timestamp
            };

            this.receipts.unshift(
                receipt
            );
            session.receiptId =
                receipt.id;
            session.status =
                SESSION_STATES.COMPLETE;
            session.completedAt =
                timestamp;

            this.analytics.submissionsRecorded +=
                1;
            this.analytics.lastExecutionAt =
                timestamp;

            this.recordSessionStep(
                session,
                STEP_TYPES.SUBMIT,
                {
                    success: true,
                    actor:
                        submittedBy,
                    details: {
                        confirmationNumber:
                            receipt.confirmationNumber
                    }
                }
            );

            this.recordSessionStep(
                session,
                STEP_TYPES.CAPTURE_RECEIPT,
                {
                    success: true,
                    evidence:
                        receipt.evidence,
                    details: {
                        receiptId:
                            receipt.id
                    }
                }
            );

            this.recalculateAnalytics();

            return {
                success: true,
                session:
                    this.clone(session),
                receipt:
                    this.clone(receipt)
            };
        },

        execute(input = {}) {
            const normalized =
                this.normalizeExecutionPackage(
                    input.job?.payload ||
                    input
                );

            if (!normalized.success) {
                return normalized;
            }

            const creation =
                this.createSession(
                    normalized.package,
                    {
                        actor:
                            input.job?.requestedBy ||
                            "Maddy"
                    }
                );

            const session =
                this.getSessionById(
                    creation.session.id
                );

            return {
                success: true,
                paused: true,
                checkpoint:
                    session.status,
                evidence: [],
                details: {
                    grantPortalSessionId:
                        session.id,
                    providerType:
                        session.providerType,
                    nextAction:
                        session.authentication.required
                            ? "authenticate"
                            : "populate"
                }
            };
        },

        recordSessionStep(
            session,
            type,
            input = {}
        ) {
            const step = {
                id:
                    this.createId(
                        "grant-portal-step"
                    ),
                type,
                success:
                    input.success === true,
                actor:
                    input.actor ||
                    "MEOS Grant Portal Execution Adapter",
                timestamp:
                    new Date().toISOString(),
                details:
                    this.clone(
                        input.details || {}
                    ),
                evidence:
                    this.clone(
                        input.evidence || []
                    )
            };

            session.executionHistory.push(
                step
            );

            if (
                input.evidence?.length
            ) {
                session.evidence.push(
                    ...this.clone(
                        input.evidence
                    )
                );
            }

            if (
                session.executionHistory.length >
                this.configuration
                    .maximumExecutionHistory
            ) {
                session.executionHistory =
                    session.executionHistory.slice(
                        -this.configuration
                            .maximumExecutionHistory
                    );
            }

            session.updatedAt =
                step.timestamp;
            this.logHistory(
                `session.${type}`,
                {
                    sessionId:
                        session.id,
                    success:
                        step.success
                }
            );

            return step;
        },

        getSessionById(sessionId) {
            return (
                this.sessions.find(
                    (session) =>
                        session.id ===
                        sessionId
                ) ||
                null
            );
        },

        getReceiptById(receiptId) {
            return (
                this.receipts.find(
                    (receipt) =>
                        receipt.id ===
                        receiptId
                ) ||
                null
            );
        },

        recalculateAnalytics() {
            this.analytics.providerCount =
                Object.keys(
                    this.providers
                ).length;
            this.analytics.sessionCount =
                this.sessions.length;
            this.analytics.activeSessions =
                this.sessions.filter(
                    (session) =>
                        ![
                            SESSION_STATES.COMPLETE,
                            SESSION_STATES.FAILED
                        ].includes(
                            session.status
                        )
                ).length;
            this.analytics.completedSessions =
                this.sessions.filter(
                    (session) =>
                        session.status ===
                        SESSION_STATES.COMPLETE
                ).length;
            this.analytics.failedSessions =
                this.sessions.filter(
                    (session) =>
                        session.status ===
                        SESSION_STATES.FAILED
                ).length;
            this.analytics.receiptCount =
                this.receipts.length;

            return this.analytics;
        },

        getStatus() {
            this.recalculateAnalytics();

            return {
                name: this.name,
                version: this.version,
                buildId: this.buildId,
                adapterId: this.adapterId,
                status: this.status,
                operatingMode:
                    this.operatingMode,
                executiveAutomationConnected:
                    Boolean(
                        global.ExecutiveAutomation
                            ?.executionAdapters?.[
                                ADAPTER_ID
                            ]
                    ),
                providerCount:
                    Object.keys(
                        this.providers
                    ).length,
                sessionCount:
                    this.sessions.length,
                receiptCount:
                    this.receipts.length,
                analytics:
                    this.clone(
                        this.analytics
                    ),
                initializedAt:
                    this.initializedAt
            };
        },

        runAcceptanceTest() {
            const packageResult =
                this.normalizeExecutionPackage({
                    opportunityId:
                        "acceptance-opportunity",
                    applicationPackage: {
                        id:
                            "acceptance-application-package",
                        opportunityId:
                            "acceptance-opportunity",
                        executiveReviewApproved:
                            false,
                        attachmentIndex: [
                            {
                                id:
                                    "irs-letter",
                                name:
                                    "IRS determination letter",
                                required:
                                    true,
                                documentId:
                                    "document-irs-001",
                                verified:
                                    true,
                                current:
                                    true
                            }
                        ],
                        certificationPacket: [
                            {
                                id:
                                    "cert-1",
                                name:
                                    "Authorized certification",
                                required:
                                    true,
                                status:
                                    "approved"
                            }
                        ],
                        signaturePacket: [
                            {
                                id:
                                    "signature-1",
                                name:
                                    "Authorized signature",
                                required:
                                    true,
                                status:
                                    "signed"
                            }
                        ]
                    },
                    portalIntelligence: {
                        id:
                            "acceptance-portal",
                        portal: {
                            type:
                                PROVIDER_TYPES.SUBMITTABLE
                        },
                        fields: [
                            {
                                id:
                                    "field-1",
                                label:
                                    "Describe the project",
                                required:
                                    true,
                                value:
                                    "CCSP will connect direct outreach and watershed protection.",
                                completed:
                                    true,
                                approved:
                                    true
                            }
                        ]
                    },
                    portalSubmissionPackage: {
                        id:
                            "acceptance-portal-package",
                        finalSubmitBlocked:
                            true
                    }
                });

            const providerRegistration =
                this.registerProvider({
                    id:
                        "grant-portal-provider-submittable-test",
                    name:
                        "Submittable Acceptance Provider",
                    type:
                        PROVIDER_TYPES.SUBMITTABLE,
                    capabilities: [
                        "login",
                        "navigate",
                        "fill-field",
                        "upload",
                        "save-draft",
                        "resume",
                        "validate",
                        "submit"
                    ],
                    requiresAuthentication:
                        true,
                    supportsDrafts:
                        true,
                    supportsResume:
                        true,
                    supportsFinalSubmission:
                        true
                });

            const creation =
                this.createSession(
                    {
                        ...packageResult.package,
                        provider:
                            providerRegistration.provider
                    },
                    {
                        actor:
                            "Maddy"
                    }
                );

            const sessionId =
                creation.session.id;

            const blockedPopulation =
                this.populateSession(
                    sessionId
                );

            const authenticated =
                this.authenticateSession(
                    sessionId,
                    {
                        authenticated:
                            true,
                        evidence: [
                            {
                                type:
                                    "authentication-placeholder",
                                verified:
                                    true
                            }
                        ]
                    }
                );

            const populated =
                this.populateSession(
                    sessionId
                );

            const validated =
                this.validateSession(
                    sessionId
                );

            const draft =
                this.saveDraft(
                    sessionId,
                    {
                        externalDraftId:
                            "draft-acceptance-001"
                    }
                );

            const resumed =
                this.resumeSession(
                    sessionId
                );

            const blockedSubmission =
                this.submitSession(
                    sessionId,
                    {
                        submittedBy:
                            "Acceptance Test Executive"
                    }
                );

            const review =
                this.approveExecutiveReview(
                    sessionId,
                    {
                        approvedBy:
                            "Acceptance Test Executive"
                    }
                );

            const authorization =
                this.authorizeFinalSubmission(
                    sessionId,
                    {
                        authorizedBy:
                            "Acceptance Test Executive"
                    }
                );

            const submission =
                this.submitSession(
                    sessionId,
                    {
                        submittedBy:
                            "Acceptance Test Executive",
                        confirmationNumber:
                            "CONF-ACCEPTANCE-001",
                        evidence: [
                            {
                                type:
                                    "receipt-placeholder",
                                uri:
                                    "evidence://acceptance-receipt"
                            }
                        ]
                    }
                );

            const checks = [
                {
                    name:
                        "Adapter registered with Executive Automation",
                    passed:
                        this.getStatus()
                            .executiveAutomationConnected ===
                        true
                },
                {
                    name:
                        "Application and portal packages normalized",
                    passed:
                        packageResult.success ===
                        true &&
                        packageResult.package.fields
                            .length === 1
                },
                {
                    name:
                        "Provider-specific portal registered",
                    passed:
                        providerRegistration.success ===
                        true &&
                        providerRegistration.provider.type ===
                        PROVIDER_TYPES.SUBMITTABLE
                },
                {
                    name:
                        "Grant portal session created",
                    passed:
                        creation.success ===
                        true &&
                        Boolean(sessionId)
                },
                {
                    name:
                        "Authentication gate enforced",
                    passed:
                        blockedPopulation.success ===
                        false &&
                        blockedPopulation.code ===
                        "GRANT_PORTAL_AUTHENTICATION_REQUIRED"
                },
                {
                    name:
                        "Authentication evidence recorded",
                    passed:
                        authenticated.success ===
                        true &&
                        authenticated.session
                            .authentication
                            .evidence.length ===
                        1
                },
                {
                    name:
                        "Fields and attachments populated",
                    passed:
                        populated.success ===
                        true &&
                        populated.fieldResults[0]
                            .success === true &&
                        populated.attachmentResults[0]
                            .success === true
                },
                {
                    name:
                        "Portal validation passed",
                    passed:
                        validated.success ===
                        true &&
                        validated.valid ===
                        true
                },
                {
                    name:
                        "Draft save and resume supported",
                    passed:
                        draft.success ===
                        true &&
                        resumed.success ===
                        true
                },
                {
                    name:
                        "Final submit blocked before approval",
                    passed:
                        blockedSubmission.success ===
                        false &&
                        blockedSubmission.code ===
                        "GRANT_PORTAL_EXECUTIVE_REVIEW_REQUIRED"
                },
                {
                    name:
                        "Executive review and authorization recorded",
                    passed:
                        review.success ===
                        true &&
                        authorization.success ===
                        true
                },
                {
                    name:
                        "Submission receipt generated",
                    passed:
                        submission.success ===
                        true &&
                        submission.receipt
                            .confirmationNumber ===
                        "CONF-ACCEPTANCE-001"
                }
            ];

            return {
                success:
                    checks.every(
                        (check) =>
                            check.passed
                    ),
                passed:
                    checks.filter(
                        (check) =>
                            check.passed
                    ).length,
                total:
                    checks.length,
                checks,
                providerType:
                    submission.session
                        .providerType,
                finalSessionStatus:
                    submission.session
                        .status,
                confirmationNumber:
                    submission.receipt
                        .confirmationNumber,
                historyCount:
                    submission.session
                        .executionHistory.length
            };
        },

        logHistory(action, details = {}) {
            this.history.unshift({
                id:
                    this.createId(
                        "grant-portal-history"
                    ),
                action,
                timestamp:
                    new Date().toISOString(),
                details:
                    this.clone(details)
            });

            if (
                this.history.length >
                this.configuration
                    .maximumExecutionHistory
            ) {
                this.history.length =
                    this.configuration
                        .maximumExecutionHistory;
            }
        },

        publicProvider(provider) {
            return {
                id:
                    provider.id,
                name:
                    provider.name,
                type:
                    provider.type,
                capabilities:
                    this.clone(
                        provider.capabilities
                    ),
                requiresAuthentication:
                    provider.requiresAuthentication,
                supportsDrafts:
                    provider.supportsDrafts,
                supportsResume:
                    provider.supportsResume,
                supportsFinalSubmission:
                    provider.supportsFinalSubmission
            };
        },

        uniqueStrings(values) {
            if (!Array.isArray(values)) {
                return [];
            }

            return Array.from(
                new Set(
                    values
                        .map(
                            (value) =>
                                String(
                                    value || ""
                                ).trim()
                        )
                        .filter(Boolean)
                )
            );
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

            return JSON.parse(
                JSON.stringify(value)
            );
        }
    };

    GrantPortalExecutionAdapter.SESSION_STATES =
        SESSION_STATES;
    GrantPortalExecutionAdapter.STEP_TYPES =
        STEP_TYPES;
    GrantPortalExecutionAdapter.PROVIDER_TYPES =
        PROVIDER_TYPES;

    global.GrantPortalExecutionAdapter =
        GrantPortalExecutionAdapter;

    GrantPortalExecutionAdapter.initialize();
})(window);
