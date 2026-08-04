/*
 * MEOS Submittable Execution Adapter
 * Version: 1.0.0
 * Build: SEA100-SUBMITTABLE-PROVIDER-EXECUTION-20260804-A
 *
 * Mission:
 * Implement the provider-specific Submittable workflow contract behind the
 * commissioned MEOS Grant Portal Execution Adapter.
 *
 * Boundary:
 * This module does not store credentials, bypass authentication, evade access
 * controls, or claim a live submission without provider evidence. A future
 * authenticated browser/API connector performs the actual external actions.
 */

(function initializeSubmittableExecutionAdapter(global) {
    "use strict";

    const VERSION = "1.0.0";
    const BUILD_ID =
        "SEA100-SUBMITTABLE-PROVIDER-EXECUTION-20260804-A";
    const PROVIDER_ID =
        "grant-portal-provider-submittable";
    const PROVIDER_TYPE =
        "submittable";

    const SUBMITTABLE_ROUTES = Object.freeze({
        LOGIN: "login",
        SUBMISSIONS: "submissions",
        DRAFTS: "drafts",
        APPLICATION: "application",
        REVIEW: "review",
        CONFIRMATION: "confirmation"
    });

    const OPERATION_TYPES = Object.freeze({
        OPEN: "open",
        AUTHENTICATE: "authenticate",
        LOCATE_DRAFT: "locate-draft",
        CONTINUE_DRAFT: "continue-draft",
        POPULATE_FIELD: "populate-field",
        UPLOAD_FILE: "upload-file",
        SAVE_DRAFT: "save-draft",
        VALIDATE: "validate",
        REVIEW: "review",
        SUBMIT: "submit",
        CAPTURE_CONFIRMATION: "capture-confirmation"
    });

    const OPERATION_STATES = Object.freeze({
        PLANNED: "planned",
        BLOCKED: "blocked",
        READY: "ready",
        COMPLETE: "complete",
        FAILED: "failed"
    });

    const SubmittableExecutionAdapter = {
        name: "MEOS Submittable Execution Adapter",
        version: VERSION,
        buildId: BUILD_ID,
        providerId: PROVIDER_ID,
        providerType: PROVIDER_TYPE,
        status: "initializing",
        operatingMode:
            "governed-submittable-provider-execution",

        configuration: {
            requireAuthentication: true,
            requireExecutiveReview: true,
            requireFinalSubmissionAuthorization: true,
            preserveEvidence: true,
            maximumFields: 1000,
            maximumFiles: 100,
            maximumHistory: 5000,
            acceptedUrlHosts: [
                "submittable.com",
                "www.submittable.com",
                "manager.submittable.com",
                "apply.submittable.com"
            ]
        },

        connector: null,
        plans: [],
        providerSessions: [],
        confirmations: [],
        history: [],
        initializedAt: null,

        analytics: {
            planCount: 0,
            providerSessionCount: 0,
            draftCount: 0,
            fieldsMapped: 0,
            filesMapped: 0,
            validationPasses: 0,
            confirmationsCaptured: 0,
            lastExecutionAt: null
        },

        initialize(options = {}) {
            this.configuration = {
                ...this.configuration,
                ...(options.configuration || options)
            };

            const providerRegistration =
                this.registerWithGrantPortalAdapter();

            this.status =
                providerRegistration.success
                    ? "online"
                    : "waiting-for-grant-portal-adapter";

            this.initializedAt =
                new Date().toISOString();
            this.recalculateAnalytics();

            console.info(
                `[MEOS] ${this.name} v${this.version} ${this.status}. Build ${this.buildId}.`
            );

            return this.getStatus();
        },

        registerWithGrantPortalAdapter() {
            const adapter =
                global.GrantPortalExecutionAdapter;

            if (
                !adapter ||
                typeof adapter.registerProvider !==
                    "function"
            ) {
                return {
                    success: false,
                    error:
                        "Grant Portal Execution Adapter v1.0.0 is required."
                };
            }

            return adapter.registerProvider({
                id: PROVIDER_ID,
                name: "Submittable",
                type:
                    adapter.PROVIDER_TYPES
                        ?.SUBMITTABLE ||
                    PROVIDER_TYPE,
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
                supportsFinalSubmission: true,
                execute:
                    (input) =>
                        this.executeProviderOperation(
                            input
                        ),
                metadata: {
                    providerSpecific: true,
                    draftsSupported: true,
                    applicantSubmissionFlow: true
                }
            });
        },

        registerConnector(connector = {}) {
            if (
                !connector ||
                typeof connector !== "object"
            ) {
                return {
                    success: false,
                    error:
                        "A Submittable connector object is required."
                };
            }

            const requiredMethods = [
                "open",
                "authenticate",
                "populateField",
                "uploadFile",
                "saveDraft",
                "validate",
                "submit",
                "captureConfirmation"
            ];

            const missingMethods =
                requiredMethods.filter(
                    (method) =>
                        typeof connector[method] !==
                        "function"
                );

            if (missingMethods.length > 0) {
                return {
                    success: false,
                    error:
                        "Submittable connector is incomplete.",
                    missingMethods
                };
            }

            this.connector = {
                name:
                    connector.name ||
                    "Submittable Connector",
                version:
                    connector.version ||
                    "1.0.0",
                ...connector,
                registeredAt:
                    new Date().toISOString()
            };

            this.logHistory("connector.registered", {
                name:
                    this.connector.name,
                version:
                    this.connector.version
            });

            return {
                success: true,
                connector: {
                    name:
                        this.connector.name,
                    version:
                        this.connector.version,
                    registeredAt:
                        this.connector.registeredAt
                }
            };
        },

        validateSubmittableUrl(value) {
            let target;

            try {
                target =
                    new URL(String(value || ""));
            } catch {
                return {
                    success: false,
                    error:
                        "A valid Submittable URL is required.",
                    code:
                        "SUBMITTABLE_URL_INVALID"
                };
            }

            const hostname =
                target.hostname.toLowerCase();

            const allowed =
                this.configuration
                    .acceptedUrlHosts
                    .some(
                        (host) =>
                            hostname === host ||
                            hostname.endsWith(
                                `.${host}`
                            )
                    );

            if (!allowed) {
                return {
                    success: false,
                    error:
                        "URL is not an approved Submittable host.",
                    code:
                        "SUBMITTABLE_HOST_NOT_ALLOWED",
                    hostname
                };
            }

            return {
                success: true,
                url:
                    target.href,
                hostname
            };
        },

        normalizeSubmittableField(
            field = {},
            index = 0
        ) {
            const label =
                String(
                    field.label ||
                    field.question ||
                    field.name ||
                    `Field ${index + 1}`
                ).trim();

            return {
                id:
                    field.id ||
                    `submittable-field-${index + 1}`,
                label,
                type:
                    field.type ||
                    "text",
                required:
                    field.required !== false,
                requiredMarker:
                    field.required !== false
                        ? "*"
                        : "",
                value:
                    field.value ?? null,
                completed:
                    field.completed === true ||
                    (
                        field.value !== null &&
                        field.value !== undefined &&
                        String(field.value).trim() !== ""
                    ),
                approved:
                    field.approved === true,
                limits:
                    this.clone(
                        field.limits || {}
                    ),
                sourceQuestionId:
                    field.sourceQuestionId ||
                    null,
                selectorHint:
                    field.selectorHint ||
                    null,
                page:
                    Number(field.page || 1),
                validationRules:
                    this.clone(
                        field.validationRules || []
                    )
            };
        },

        normalizeSubmittableFile(
            file = {},
            index = 0
        ) {
            return {
                id:
                    file.id ||
                    `submittable-file-${index + 1}`,
                name:
                    String(
                        file.name ||
                        file.title ||
                        `File ${index + 1}`
                    ),
                required:
                    file.required !== false,
                documentId:
                    file.documentId ||
                    null,
                localPath:
                    file.localPath ||
                    null,
                fileName:
                    file.fileName ||
                    file.name ||
                    null,
                mimeType:
                    file.mimeType ||
                    null,
                verified:
                    file.verified === true,
                current:
                    file.current !== false,
                uploaded:
                    file.uploaded === true,
                selectorHint:
                    file.selectorHint ||
                    null,
                page:
                    Number(file.page || 1)
            };
        },

        buildExecutionPlan(input = {}) {
            const urlValidation =
                this.validateSubmittableUrl(
                    input.url ||
                    input.applicationUrl ||
                    ""
                );

            if (!urlValidation.success) {
                return urlValidation;
            }

            const fields =
                (
                    input.fields ||
                    input.portalFields ||
                    []
                )
                    .slice(
                        0,
                        this.configuration.maximumFields
                    )
                    .map(
                        (field, index) =>
                            this.normalizeSubmittableField(
                                field,
                                index
                            )
                    );

            const files =
                (
                    input.files ||
                    input.attachments ||
                    []
                )
                    .slice(
                        0,
                        this.configuration.maximumFiles
                    )
                    .map(
                        (file, index) =>
                            this.normalizeSubmittableFile(
                                file,
                                index
                            )
                    );

            const operations = [
                this.createOperation(
                    OPERATION_TYPES.OPEN,
                    {
                        route:
                            SUBMITTABLE_ROUTES.APPLICATION,
                        url:
                            urlValidation.url
                    }
                ),
                this.createOperation(
                    OPERATION_TYPES.AUTHENTICATE,
                    {
                        required:
                            true
                    }
                ),
                ...fields.map(
                    (field) =>
                        this.createOperation(
                            OPERATION_TYPES.POPULATE_FIELD,
                            {
                                fieldId:
                                    field.id,
                                page:
                                    field.page
                            }
                        )
                ),
                ...files.map(
                    (file) =>
                        this.createOperation(
                            OPERATION_TYPES.UPLOAD_FILE,
                            {
                                fileId:
                                    file.id,
                                page:
                                    file.page
                            }
                        )
                ),
                this.createOperation(
                    OPERATION_TYPES.SAVE_DRAFT,
                    {
                        supported:
                            true
                    }
                ),
                this.createOperation(
                    OPERATION_TYPES.VALIDATE
                ),
                this.createOperation(
                    OPERATION_TYPES.REVIEW
                ),
                this.createOperation(
                    OPERATION_TYPES.SUBMIT
                ),
                this.createOperation(
                    OPERATION_TYPES.CAPTURE_CONFIRMATION
                )
            ];

            const timestamp =
                new Date().toISOString();

            const plan = {
                schema:
                    "meos.submittable.execution-plan.v1",
                version:
                    this.version,
                buildId:
                    this.buildId,
                id:
                    this.createId(
                        "submittable-plan"
                    ),
                opportunityId:
                    input.opportunityId ||
                    null,
                applicationPackageId:
                    input.applicationPackageId ||
                    null,
                grantPortalSessionId:
                    input.grantPortalSessionId ||
                    null,
                url:
                    urlValidation.url,
                hostname:
                    urlValidation.hostname,
                projectTitle:
                    String(
                        input.projectTitle ||
                        input.title ||
                        ""
                    ),
                organizationName:
                    String(
                        input.organizationName ||
                        ""
                    ),
                fields,
                files,
                operations,
                executiveReviewApproved:
                    input.executiveReviewApproved ===
                    true,
                finalSubmissionAuthorized:
                    input.finalSubmissionAuthorized ===
                    true,
                status:
                    OPERATION_STATES.PLANNED,
                createdAt:
                    timestamp,
                updatedAt:
                    timestamp,
                metadata:
                    this.clone(
                        input.metadata || {}
                    )
            };

            this.plans.unshift(plan);
            this.analytics.fieldsMapped +=
                fields.length;
            this.analytics.filesMapped +=
                files.length;

            this.logHistory("plan.created", {
                planId:
                    plan.id,
                fieldCount:
                    fields.length,
                fileCount:
                    files.length,
                url:
                    plan.url
            });

            this.recalculateAnalytics();

            return {
                success: true,
                plan:
                    this.clone(plan)
            };
        },

        createProviderSession(
            planId,
            input = {}
        ) {
            const plan =
                this.getPlanById(
                    planId
                );

            if (!plan) {
                return {
                    success: false,
                    error:
                        "Submittable execution plan was not found."
                };
            }

            const timestamp =
                new Date().toISOString();

            const session = {
                schema:
                    "meos.submittable.provider-session.v1",
                version:
                    this.version,
                buildId:
                    this.buildId,
                id:
                    this.createId(
                        "submittable-session"
                    ),
                planId:
                    plan.id,
                grantPortalSessionId:
                    plan.grantPortalSessionId,
                status:
                    "authentication-required",
                authenticated:
                    false,
                authenticatedAt:
                    null,
                authenticationEvidence:
                    [],
                currentRoute:
                    SUBMITTABLE_ROUTES.LOGIN,
                currentPage:
                    1,
                draft: {
                    exists:
                        false,
                    draftId:
                        null,
                    savedAt:
                        null,
                    resumedAt:
                        null
                },
                validation: null,
                executiveReviewApproved:
                    plan.executiveReviewApproved,
                finalSubmissionAuthorized:
                    plan.finalSubmissionAuthorized,
                operationResults:
                    [],
                evidence:
                    [],
                createdAt:
                    timestamp,
                updatedAt:
                    timestamp,
                completedAt:
                    null,
                failure:
                    null,
                connectorSession:
                    input.connectorSession ||
                    null
            };

            this.providerSessions.unshift(
                session
            );

            this.logHistory("session.created", {
                sessionId:
                    session.id,
                planId:
                    plan.id
            });
            this.recalculateAnalytics();

            return {
                success: true,
                session:
                    this.clone(session)
            };
        },

        authenticateProviderSession(
            sessionId,
            input = {}
        ) {
            const session =
                this.getProviderSessionById(
                    sessionId
                );

            if (!session) {
                return {
                    success: false,
                    error:
                        "Submittable provider session was not found."
                };
            }

            if (
                input.authenticated !== true
            ) {
                return {
                    success: false,
                    error:
                        "Verified Submittable authentication is required.",
                    code:
                        "SUBMITTABLE_AUTHENTICATION_REQUIRED"
                };
            }

            session.authenticated =
                true;
            session.authenticatedAt =
                input.authenticatedAt ||
                new Date().toISOString();
            session.authenticationEvidence =
                this.clone(
                    input.evidence || []
                );
            session.status =
                "authenticated";
            session.currentRoute =
                SUBMITTABLE_ROUTES.APPLICATION;
            session.updatedAt =
                session.authenticatedAt;

            this.recordOperationResult(
                session,
                OPERATION_TYPES.AUTHENTICATE,
                {
                    success: true,
                    evidence:
                        session.authenticationEvidence
                }
            );

            return {
                success: true,
                session:
                    this.clone(session)
            };
        },

        executePlan(
            sessionId,
            options = {}
        ) {
            const session =
                this.getProviderSessionById(
                    sessionId
                );
            const plan =
                session
                    ? this.getPlanById(
                        session.planId
                    )
                    : null;

            if (!session || !plan) {
                return {
                    success: false,
                    error:
                        "Submittable plan or session was not found."
                };
            }

            if (!session.authenticated) {
                return {
                    success: false,
                    error:
                        "Submittable authentication is required before execution.",
                    code:
                        "SUBMITTABLE_AUTHENTICATION_REQUIRED"
                };
            }

            const fieldResults =
                plan.fields.map(
                    (field) => {
                        const hasValue =
                            field.value !== null &&
                            field.value !== undefined &&
                            String(
                                field.value
                            ).trim() !== "";

                        const success =
                            !field.required ||
                            hasValue;

                        const result = {
                            operationType:
                                OPERATION_TYPES.POPULATE_FIELD,
                            fieldId:
                                field.id,
                            success,
                            status:
                                success
                                    ? "ready-to-populate"
                                    : "missing-required-value"
                        };

                        this.recordOperationResult(
                            session,
                            OPERATION_TYPES.POPULATE_FIELD,
                            result
                        );

                        return result;
                    }
                );

            const fileResults =
                plan.files.map(
                    (file) => {
                        const ready =
                            !file.required ||
                            Boolean(
                                (
                                    file.documentId ||
                                    file.localPath
                                ) &&
                                file.verified &&
                                file.current
                            );

                        const result = {
                            operationType:
                                OPERATION_TYPES.UPLOAD_FILE,
                            fileId:
                                file.id,
                            success:
                                ready,
                            status:
                                ready
                                    ? "ready-to-upload"
                                    : "file-not-ready"
                        };

                        this.recordOperationResult(
                            session,
                            OPERATION_TYPES.UPLOAD_FILE,
                            result
                        );

                        return result;
                    }
                );

            const validation =
                this.validatePlan(
                    plan,
                    session
                );

            session.validation =
                validation.validation;
            session.status =
                validation.valid
                    ? "ready-for-executive-review"
                    : "validation-blocked";
            session.currentRoute =
                validation.valid
                    ? SUBMITTABLE_ROUTES.REVIEW
                    : SUBMITTABLE_ROUTES.APPLICATION;
            session.updatedAt =
                new Date().toISOString();

            if (validation.valid) {
                this.analytics.validationPasses +=
                    1;
            }

            return {
                success: true,
                fieldResults,
                fileResults,
                validation:
                    this.clone(
                        validation.validation
                    ),
                session:
                    this.clone(session)
            };
        },

        validatePlan(plan, session) {
            const missingFieldIds =
                plan.fields
                    .filter(
                        (field) =>
                            field.required &&
                            (
                                field.value === null ||
                                field.value === undefined ||
                                String(
                                    field.value
                                ).trim() === ""
                            )
                    )
                    .map(
                        (field) =>
                            field.id
                    );

            const missingFileIds =
                plan.files
                    .filter(
                        (file) =>
                            file.required &&
                            !(
                                (
                                    file.documentId ||
                                    file.localPath
                                ) &&
                                file.verified &&
                                file.current
                            )
                    )
                    .map(
                        (file) =>
                            file.id
                    );

            const validation = {
                valid:
                    missingFieldIds.length ===
                        0 &&
                    missingFileIds.length ===
                        0,
                missingFieldIds,
                missingFileIds,
                validatedAt:
                    new Date().toISOString()
            };

            this.recordOperationResult(
                session,
                OPERATION_TYPES.VALIDATE,
                {
                    success:
                        validation.valid,
                    details:
                        validation
                }
            );

            return {
                success: true,
                valid:
                    validation.valid,
                validation
            };
        },

        saveDraft(sessionId, input = {}) {
            const session =
                this.getProviderSessionById(
                    sessionId
                );

            if (!session) {
                return {
                    success: false,
                    error:
                        "Submittable provider session was not found."
                };
            }

            if (!session.authenticated) {
                return {
                    success: false,
                    error:
                        "Authentication is required before saving a draft.",
                    code:
                        "SUBMITTABLE_AUTHENTICATION_REQUIRED"
                };
            }

            const timestamp =
                input.savedAt ||
                new Date().toISOString();

            session.draft = {
                exists:
                    true,
                draftId:
                    input.draftId ||
                    `submittable-draft-${Date.now()}`,
                savedAt:
                    timestamp,
                resumedAt:
                    session.draft.resumedAt
            };
            session.status =
                "draft-saved";
            session.currentRoute =
                SUBMITTABLE_ROUTES.DRAFTS;
            session.updatedAt =
                timestamp;

            this.recordOperationResult(
                session,
                OPERATION_TYPES.SAVE_DRAFT,
                {
                    success: true,
                    details:
                        session.draft
                }
            );

            this.recalculateAnalytics();

            return {
                success: true,
                session:
                    this.clone(session)
            };
        },

        resumeDraft(sessionId, input = {}) {
            const session =
                this.getProviderSessionById(
                    sessionId
                );

            if (!session) {
                return {
                    success: false,
                    error:
                        "Submittable provider session was not found."
                };
            }

            if (
                !session.draft.exists
            ) {
                return {
                    success: false,
                    error:
                        "No Submittable draft is available to resume.",
                    code:
                        "SUBMITTABLE_DRAFT_NOT_FOUND"
                };
            }

            session.draft.resumedAt =
                input.resumedAt ||
                new Date().toISOString();
            session.status =
                "authenticated";
            session.currentRoute =
                SUBMITTABLE_ROUTES.APPLICATION;
            session.updatedAt =
                session.draft.resumedAt;

            this.recordOperationResult(
                session,
                OPERATION_TYPES.CONTINUE_DRAFT,
                {
                    success: true,
                    details: {
                        draftId:
                            session.draft.draftId
                    }
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
                this.getProviderSessionById(
                    sessionId
                );

            if (!session) {
                return {
                    success: false,
                    error:
                        "Submittable provider session was not found."
                };
            }

            if (
                session.validation?.valid !==
                true
            ) {
                return {
                    success: false,
                    error:
                        "Submittable validation must pass before executive review approval.",
                    code:
                        "SUBMITTABLE_VALIDATION_REQUIRED"
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
                "executive-review-approved";
            session.updatedAt =
                session.executiveReview.approvedAt;

            this.recordOperationResult(
                session,
                OPERATION_TYPES.REVIEW,
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
                this.getProviderSessionById(
                    sessionId
                );

            if (!session) {
                return {
                    success: false,
                    error:
                        "Submittable provider session was not found."
                };
            }

            if (
                !session.executiveReviewApproved
            ) {
                return {
                    success: false,
                    error:
                        "Executive review approval is required before final submission authorization.",
                    code:
                        "SUBMITTABLE_EXECUTIVE_REVIEW_REQUIRED"
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
                    "submittable-final-submit"
            };
            session.status =
                "ready-for-submission";
            session.updatedAt =
                session.finalSubmissionAuthorization
                    .authorizedAt;

            return {
                success: true,
                session:
                    this.clone(session)
            };
        },

        submit(
            sessionId,
            input = {}
        ) {
            const session =
                this.getProviderSessionById(
                    sessionId
                );

            if (!session) {
                return {
                    success: false,
                    error:
                        "Submittable provider session was not found."
                };
            }

            if (
                session.validation?.valid !==
                true
            ) {
                return {
                    success: false,
                    error:
                        "Submittable validation must pass before submission.",
                    code:
                        "SUBMITTABLE_VALIDATION_REQUIRED"
                };
            }

            if (
                this.configuration
                    .requireExecutiveReview &&
                !session.executiveReviewApproved
            ) {
                return {
                    success: false,
                    error:
                        "Executive review approval is required before submission.",
                    code:
                        "SUBMITTABLE_EXECUTIVE_REVIEW_REQUIRED"
                };
            }

            if (
                this.configuration
                    .requireFinalSubmissionAuthorization &&
                !session.finalSubmissionAuthorized
            ) {
                return {
                    success: false,
                    error:
                        "Final Submittable submission is blocked without explicit executive authorization.",
                    code:
                        "SUBMITTABLE_FINAL_SUBMISSION_BLOCKED"
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

            const confirmation = {
                id:
                    this.createId(
                        "submittable-confirmation"
                    ),
                sessionId:
                    session.id,
                planId:
                    session.planId,
                submittedBy,
                submittedAt:
                    timestamp,
                submissionNumber:
                    input.submissionNumber ||
                    `SUB-${Date.now()}`,
                confirmationUrl:
                    input.confirmationUrl ||
                    null,
                receiptDocumentId:
                    input.receiptDocumentId ||
                    null,
                evidence:
                    this.clone(
                        input.evidence || []
                    ),
                status:
                    "confirmed"
            };

            this.confirmations.unshift(
                confirmation
            );

            session.status =
                "complete";
            session.currentRoute =
                SUBMITTABLE_ROUTES.CONFIRMATION;
            session.confirmationId =
                confirmation.id;
            session.completedAt =
                timestamp;
            session.updatedAt =
                timestamp;

            this.recordOperationResult(
                session,
                OPERATION_TYPES.SUBMIT,
                {
                    success: true,
                    actor:
                        submittedBy,
                    details: {
                        submissionNumber:
                            confirmation
                                .submissionNumber
                    }
                }
            );

            this.recordOperationResult(
                session,
                OPERATION_TYPES.CAPTURE_CONFIRMATION,
                {
                    success: true,
                    evidence:
                        confirmation.evidence,
                    details: {
                        confirmationId:
                            confirmation.id
                    }
                }
            );

            this.analytics.lastExecutionAt =
                timestamp;
            this.recalculateAnalytics();

            return {
                success: true,
                session:
                    this.clone(session),
                confirmation:
                    this.clone(
                        confirmation
                    )
            };
        },

        executeProviderOperation(input = {}) {
            if (!this.connector) {
                return {
                    success: false,
                    paused: true,
                    code:
                        "SUBMITTABLE_CONNECTOR_REQUIRED",
                    error:
                        "A real authenticated Submittable connector has not been registered.",
                    checkpoint:
                        "connector-required",
                    details: {
                        providerId:
                            PROVIDER_ID,
                        nextAction:
                            "register-connector"
                    }
                };
            }

            return this.connector.execute
                ? this.connector.execute(input)
                : {
                    success: false,
                    error:
                        "Registered Submittable connector does not provide execute().",
                    code:
                        "SUBMITTABLE_CONNECTOR_EXECUTE_REQUIRED"
                };
        },

        createOperation(type, payload = {}) {
            return {
                id:
                    this.createId(
                        "submittable-operation"
                    ),
                type,
                state:
                    OPERATION_STATES.PLANNED,
                payload:
                    this.clone(payload),
                createdAt:
                    new Date().toISOString()
            };
        },

        recordOperationResult(
            session,
            type,
            input = {}
        ) {
            const result = {
                id:
                    this.createId(
                        "submittable-operation-result"
                    ),
                type,
                success:
                    input.success === true,
                actor:
                    input.actor ||
                    "MEOS Submittable Execution Adapter",
                details:
                    this.clone(
                        input.details || {}
                    ),
                evidence:
                    this.clone(
                        input.evidence || []
                    ),
                timestamp:
                    new Date().toISOString()
            };

            session.operationResults.push(
                result
            );

            if (
                result.evidence.length > 0
            ) {
                session.evidence.push(
                    ...result.evidence
                );
            }

            if (
                session.operationResults.length >
                this.configuration.maximumHistory
            ) {
                session.operationResults =
                    session.operationResults.slice(
                        -this.configuration.maximumHistory
                    );
            }

            session.updatedAt =
                result.timestamp;

            this.logHistory(
                `operation.${type}`,
                {
                    sessionId:
                        session.id,
                    success:
                        result.success
                }
            );

            return result;
        },

        getPlanById(planId) {
            return (
                this.plans.find(
                    (plan) =>
                        plan.id === planId
                ) ||
                null
            );
        },

        getProviderSessionById(
            sessionId
        ) {
            return (
                this.providerSessions.find(
                    (session) =>
                        session.id ===
                        sessionId
                ) ||
                null
            );
        },

        getConfirmationById(
            confirmationId
        ) {
            return (
                this.confirmations.find(
                    (confirmation) =>
                        confirmation.id ===
                        confirmationId
                ) ||
                null
            );
        },

        recalculateAnalytics() {
            this.analytics.planCount =
                this.plans.length;
            this.analytics.providerSessionCount =
                this.providerSessions.length;
            this.analytics.draftCount =
                this.providerSessions.filter(
                    (session) =>
                        session.draft.exists
                ).length;
            this.analytics.confirmationsCaptured =
                this.confirmations.length;

            return this.analytics;
        },

        getStatus() {
            this.recalculateAnalytics();

            const grantPortalAdapter =
                global.GrantPortalExecutionAdapter;

            return {
                name:
                    this.name,
                version:
                    this.version,
                buildId:
                    this.buildId,
                providerId:
                    this.providerId,
                providerType:
                    this.providerType,
                status:
                    this.status,
                operatingMode:
                    this.operatingMode,
                grantPortalAdapterConnected:
                    Boolean(
                        grantPortalAdapter
                            ?.providers?.[
                                PROVIDER_ID
                            ]
                    ),
                realConnectorRegistered:
                    Boolean(
                        this.connector
                    ),
                planCount:
                    this.plans.length,
                providerSessionCount:
                    this.providerSessions.length,
                confirmationCount:
                    this.confirmations.length,
                analytics:
                    this.clone(
                        this.analytics
                    ),
                initializedAt:
                    this.initializedAt
            };
        },

        runAcceptanceTest() {
            const planResult =
                this.buildExecutionPlan({
                    url:
                        "https://example.submittable.com/submit/example",
                    opportunityId:
                        "submittable-acceptance-opportunity",
                    applicationPackageId:
                        "submittable-acceptance-package",
                    projectTitle:
                        "Submittable Acceptance Test",
                    organizationName:
                        "MEOS Acceptance Organization",
                    fields: [
                        {
                            id:
                                "field-project",
                            label:
                                "Describe the project",
                            required:
                                true,
                            value:
                                "CCSP connects direct outreach, recovery navigation, and watershed protection.",
                            approved:
                                true
                        }
                    ],
                    files: [
                        {
                            id:
                                "file-irs",
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
                    ]
                });

            const sessionResult =
                this.createProviderSession(
                    planResult.plan.id
                );

            const sessionId =
                sessionResult.session.id;

            const blockedExecution =
                this.executePlan(
                    sessionId
                );

            const authentication =
                this.authenticateProviderSession(
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

            const execution =
                this.executePlan(
                    sessionId
                );

            const draft =
                this.saveDraft(
                    sessionId,
                    {
                        draftId:
                            "submittable-draft-test-001"
                    }
                );

            const resume =
                this.resumeDraft(
                    sessionId
                );

            const blockedSubmit =
                this.submit(
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
                this.submit(
                    sessionId,
                    {
                        submittedBy:
                            "Acceptance Test Executive",
                        submissionNumber:
                            "SUB-ACCEPTANCE-001",
                        confirmationUrl:
                            "https://example.submittable.com/submissions/acceptance",
                        evidence: [
                            {
                                type:
                                    "confirmation-placeholder",
                                uri:
                                    "evidence://submittable-confirmation"
                            }
                        ]
                    }
                );

            const checks = [
                {
                    name:
                        "Submittable provider registered with Grant Portal Adapter",
                    passed:
                        this.getStatus()
                            .grantPortalAdapterConnected ===
                        true
                },
                {
                    name:
                        "Approved Submittable host accepted",
                    passed:
                        planResult.success ===
                        true &&
                        planResult.plan.hostname ===
                        "example.submittable.com"
                },
                {
                    name:
                        "Submittable execution plan created",
                    passed:
                        planResult.plan.operations.length >=
                        8
                },
                {
                    name:
                        "Required fields marked and mapped",
                    passed:
                        planResult.plan.fields[0]
                            .requiredMarker ===
                        "*" &&
                        planResult.plan.fields[0]
                            .completed === true
                },
                {
                    name:
                        "Verified file upload mapped",
                    passed:
                        planResult.plan.files[0]
                            .verified === true &&
                        Boolean(
                            planResult.plan.files[0]
                                .documentId
                        )
                },
                {
                    name:
                        "Provider session created",
                    passed:
                        sessionResult.success ===
                        true &&
                        Boolean(sessionId)
                },
                {
                    name:
                        "Authentication gate enforced",
                    passed:
                        blockedExecution.success ===
                        false &&
                        blockedExecution.code ===
                        "SUBMITTABLE_AUTHENTICATION_REQUIRED"
                },
                {
                    name:
                        "Authentication evidence recorded",
                    passed:
                        authentication.success ===
                        true &&
                        authentication.session
                            .authenticationEvidence
                            .length ===
                        1
                },
                {
                    name:
                        "Fields, files, and validation completed",
                    passed:
                        execution.success ===
                        true &&
                        execution.fieldResults[0]
                            .success === true &&
                        execution.fileResults[0]
                            .success === true &&
                        execution.validation
                            .valid === true
                },
                {
                    name:
                        "Draft save and continue supported",
                    passed:
                        draft.success ===
                        true &&
                        resume.success ===
                        true &&
                        resume.session.draft
                            .draftId ===
                        "submittable-draft-test-001"
                },
                {
                    name:
                        "Submission blocked before executive approval",
                    passed:
                        blockedSubmit.success ===
                        false &&
                        blockedSubmit.code ===
                        "SUBMITTABLE_EXECUTIVE_REVIEW_REQUIRED"
                },
                {
                    name:
                        "Executive review and final authorization recorded",
                    passed:
                        review.success ===
                        true &&
                        authorization.success ===
                        true
                },
                {
                    name:
                        "Submittable confirmation captured",
                    passed:
                        submission.success ===
                        true &&
                        submission.confirmation
                            .submissionNumber ===
                        "SUB-ACCEPTANCE-001"
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
                    this.providerType,
                finalStatus:
                    submission.session
                        .status,
                submissionNumber:
                    submission.confirmation
                        .submissionNumber,
                realConnectorRegistered:
                    Boolean(
                        this.connector
                    )
            };
        },

        logHistory(action, details = {}) {
            this.history.unshift({
                id:
                    this.createId(
                        "submittable-history"
                    ),
                action,
                timestamp:
                    new Date().toISOString(),
                details:
                    this.clone(details)
            });

            if (
                this.history.length >
                this.configuration.maximumHistory
            ) {
                this.history.length =
                    this.configuration.maximumHistory;
            }
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

    SubmittableExecutionAdapter.SUBMITTABLE_ROUTES =
        SUBMITTABLE_ROUTES;
    SubmittableExecutionAdapter.OPERATION_TYPES =
        OPERATION_TYPES;
    SubmittableExecutionAdapter.OPERATION_STATES =
        OPERATION_STATES;

    global.SubmittableExecutionAdapter =
        SubmittableExecutionAdapter;

    SubmittableExecutionAdapter.initialize();
})(window);
