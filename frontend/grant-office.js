/*
 * Maddy Executive Operating System (MEOS)
 * Grant Office
 *
 * Version: 1.12.0
 * Build: GO1120-ORGANIZATION-NEUTRAL-ADAPTIVE-ACQUISITION-20260815-A
 *
 * Mission:
 * Protect executive time by converting large volumes of possible funding
 * and resource opportunities into a small number of defensible,
 * mission-aligned, executable recommendations.
 *
 * Operating rule:
 * Finding an opportunity is not success.
 * Converting the right opportunity into organizational capacity is success.
 *
 * Brick boundary:
 * This office evaluates and organizes opportunities. It does not fabricate
 * eligibility, submit applications without authorization, promise awards,
 * or replace the Executive Director's authority.
 */

(function initializeGrantOffice(global) {
    "use strict";

    const NAME = "MEOS Grant Office";
    const VERSION = "1.12.0";
    const BUILD_ID = "GO1120-ORGANIZATION-NEUTRAL-ADAPTIVE-ACQUISITION-20260815-A";
    const STORAGE_KEY = "meos.grant-office.v1";
    const SCHEMA = "meos.grant-office.opportunity.v1";

    const OPPORTUNITY_TYPES = Object.freeze({
        FEDERAL_GRANT: "federal-grant",
        STATE_GRANT: "state-grant",
        LOCAL_GRANT: "local-grant",
        PRIVATE_FOUNDATION: "private-foundation",
        COMMUNITY_FOUNDATION: "community-foundation",
        CORPORATE_PHILANTHROPY: "corporate-philanthropy",
        INDIVIDUAL_DONOR: "individual-donor",
        SPONSORSHIP: "sponsorship",
        GOVERNMENT_CONTRACT: "government-contract",
        COURT_SETTLEMENT: "court-settlement",
        LEGISLATIVE_SIGNAL: "legislative-signal",
        BUDGET_SIGNAL: "budget-signal",
        TECHNOLOGY_BENEFIT: "technology-benefit",
        IN_KIND_RESOURCE: "in-kind-resource",
        STRATEGIC_PARTNERSHIP: "strategic-partnership",
        CROWDFUNDING: "crowdfunding",
        DIGITAL_REVENUE: "digital-revenue",
        COST_SAVINGS: "cost-savings",
        FUTURE_FUNDING_SIGNAL: "future-funding-signal",
        OTHER: "other"
    });

    const TIMING_STATUSES = Object.freeze({
        SIGNAL: "pre-announcement",
        EXPECTED: "expected",
        OPEN: "open",
        CLOSING_SOON: "closing-soon",
        CLOSED: "closed",
        UNKNOWN: "unknown"
    });

    /*
     * Backward-compatible timing alias.
     *
     * Existing MEOS code may still read opportunity.lifecycle or
     * GrantOffice.LIFECYCLE_STATES. In v1.3.0 lifecycle remains a timing-only
     * field. Pursuit work is represented exclusively by pipelineStage.
     */
    const LIFECYCLE_STATES = TIMING_STATUSES;

    const PIPELINE_STAGES = Object.freeze({
        DISCOVERED: "discovered",
        SCREENED: "screened",
        ON_DESK: "on-desk",
        PREPARING: "preparing",
        SUBMITTED: "submitted",
        AWARD_PENDING: "award-pending",
        AWARDED: "awarded",
        DECLINED: "declined",
        WITHDRAWN: "withdrawn",
        ARCHIVED: "archived"
    });

    const PIPELINE_STAGE_TRANSITIONS = Object.freeze({
        [PIPELINE_STAGES.DISCOVERED]: Object.freeze([
            PIPELINE_STAGES.SCREENED,
            PIPELINE_STAGES.ARCHIVED
        ]),
        [PIPELINE_STAGES.SCREENED]: Object.freeze([
            PIPELINE_STAGES.ON_DESK,
            PIPELINE_STAGES.ARCHIVED
        ]),
        [PIPELINE_STAGES.ON_DESK]: Object.freeze([
            PIPELINE_STAGES.PREPARING,
            PIPELINE_STAGES.ARCHIVED
        ]),
        [PIPELINE_STAGES.PREPARING]: Object.freeze([
            PIPELINE_STAGES.SUBMITTED,
            PIPELINE_STAGES.WITHDRAWN,
            PIPELINE_STAGES.ARCHIVED
        ]),
        [PIPELINE_STAGES.SUBMITTED]: Object.freeze([
            PIPELINE_STAGES.AWARD_PENDING,
            PIPELINE_STAGES.DECLINED,
            PIPELINE_STAGES.WITHDRAWN,
            PIPELINE_STAGES.ARCHIVED
        ]),
        [PIPELINE_STAGES.AWARD_PENDING]: Object.freeze([
            PIPELINE_STAGES.AWARDED,
            PIPELINE_STAGES.DECLINED,
            PIPELINE_STAGES.WITHDRAWN,
            PIPELINE_STAGES.ARCHIVED
        ]),
        [PIPELINE_STAGES.AWARDED]: Object.freeze([
            PIPELINE_STAGES.ARCHIVED
        ]),
        [PIPELINE_STAGES.DECLINED]: Object.freeze([
            PIPELINE_STAGES.ARCHIVED
        ]),
        [PIPELINE_STAGES.WITHDRAWN]: Object.freeze([
            PIPELINE_STAGES.ARCHIVED
        ]),
        [PIPELINE_STAGES.ARCHIVED]: Object.freeze([])
    });

    const APPLICATION_QUESTION_CATEGORIES = Object.freeze({
        ORGANIZATION: "organization",
        PROGRAM: "program",
        NEEDS: "needs-statement",
        ALIGNMENT: "mission-alignment",
        GOALS: "goals-objectives",
        METHODS: "methods-work-plan",
        OUTCOMES: "outcomes-impact",
        EVALUATION: "evaluation",
        SUSTAINABILITY: "sustainability",
        EQUITY: "equity-access",
        PARTNERSHIPS: "partnerships",
        BUDGET: "budget",
        BUDGET_NARRATIVE: "budget-narrative",
        CAPACITY: "organizational-capacity",
        COMPLIANCE: "compliance-certification",
        SIGNATURE: "signature-authorization",
        ATTACHMENT: "attachment",
        OTHER: "other"
    });

    const APPLICATION_REVIEW_STATES = Object.freeze({
        NOT_STARTED: "not-started",
        ANALYZING: "analyzing",
        DRAFTING: "drafting",
        EXECUTIVE_REVIEW: "executive-review",
        REVISION_REQUIRED: "revision-required",
        APPROVED: "approved",
        READY_TO_SUBMIT: "ready-to-submit",
        SUBMITTED: "submitted"
    });

    const APPLICATION_ITEM_STATES = Object.freeze({
        UNANSWERED: "unanswered",
        EXECUTIVE_INPUT_REQUIRED: "executive-input-required",
        DRAFTED: "drafted",
        NEEDS_EVIDENCE: "needs-evidence",
        NEEDS_REVISION: "needs-revision",
        APPROVED: "approved"
    });

    const APPLICATION_ASSEMBLY_STATES = Object.freeze({
        NOT_ASSEMBLED: "not-assembled",
        ASSEMBLING: "assembling",
        EXECUTIVE_ACTION_REQUIRED: "executive-action-required",
        READY_FOR_EXECUTIVE_REVIEW: "ready-for-executive-review",
        READY_FOR_SIGNATURE: "ready-for-signature",
        READY_FOR_SUBMISSION: "ready-for-submission",
        SUBMITTED: "submitted"
    });

    const APPLICATION_PACKAGE_ITEM_TYPES = Object.freeze({
        EXECUTIVE_SUMMARY: "executive-summary",
        NARRATIVE_SECTION: "narrative-section",
        BUDGET_NARRATIVE: "budget-narrative",
        ATTACHMENT: "attachment",
        CERTIFICATION: "certification",
        SIGNATURE: "signature",
        EVIDENCE_INDEX: "evidence-index",
        SUBMISSION_CHECKLIST: "submission-checklist"
    });

    const SUBMISSION_PORTAL_TYPES = Object.freeze({
        GRANTS_GOV: "grants-gov",
        SUBMITTABLE: "submittable",
        FOUNDANT: "foundant",
        SMARTSIMPLE: "smartsimple",
        FLUXX: "fluxx",
        BLACKBAUD: "blackbaud",
        GOOGLE_FORMS: "google-forms",
        MICROSOFT_FORMS: "microsoft-forms",
        PDF_PACKAGE: "pdf-package",
        DOCX_PACKAGE: "docx-package",
        GENERIC_WEB_PORTAL: "generic-web-portal",
        UNKNOWN: "unknown"
    });

    const SUBMISSION_PORTAL_STEP_TYPES = Object.freeze({
        AUTHENTICATION: "authentication",
        ELIGIBILITY: "eligibility",
        PROFILE: "organization-profile",
        APPLICATION: "application",
        ATTACHMENTS: "attachments",
        CERTIFICATIONS: "certifications",
        SIGNATURE: "signature",
        REVIEW: "review",
        SUBMIT: "submit",
        CONFIRMATION: "confirmation"
    });

    const SUBMISSION_FIELD_TYPES = Object.freeze({
        TEXT: "text",
        TEXTAREA: "textarea",
        NUMBER: "number",
        CURRENCY: "currency",
        DATE: "date",
        SELECT: "select",
        MULTISELECT: "multiselect",
        CHECKBOX: "checkbox",
        RADIO: "radio",
        FILE: "file",
        SIGNATURE: "signature",
        CERTIFICATION: "certification",
        UNKNOWN: "unknown"
    });

    const SUBMISSION_PORTAL_STATES = Object.freeze({
        NOT_ANALYZED: "not-analyzed",
        ANALYZED: "analyzed",
        MAPPED: "mapped",
        EXECUTIVE_REVIEW_REQUIRED: "executive-review-required",
        AUTHORIZED: "authorized",
        READY_TO_POPULATE: "ready-to-populate",
        READY_TO_SUBMIT: "ready-to-submit",
        SUBMITTED: "submitted"
    });

    const SUBMISSION_EXECUTION_STATES = Object.freeze({
        NOT_SUBMITTED: "not-submitted",
        AUTHORIZED: "authorized",
        SUBMITTED: "submitted",
        RECEIPT_VERIFIED: "receipt-verified",
        DUPLICATE_BLOCKED: "duplicate-blocked"
    });

    const AWARD_DECISION_STATES = Object.freeze({
        NOT_DECIDED: "not-decided",
        AWARD_PENDING: "award-pending",
        AWARDED: "awarded",
        DECLINED: "declined",
        WITHDRAWN: "withdrawn"
    });

    const FUNDING_RECEIPT_STATES = Object.freeze({
        NOT_RECEIVED: "not-received",
        PARTIALLY_RECEIVED: "partially-received",
        FULLY_RECEIVED: "fully-received",
        OVERDUE: "overdue"
    });





    const RECOMMENDATIONS = Object.freeze({
        PURSUE_NOW: "pursue-now",
        PREPARE_FOR_FUTURE: "prepare-for-future",
        PURSUE_WITH_PARTNER: "pursue-with-partner",
        REQUEST_CLARIFICATION: "request-clarification",
        WATCH_AND_TRACK: "watch-and-track",
        SKIP_NOT_ELIGIBLE: "skip-not-eligible",
        SKIP_LOW_RETURN: "skip-low-return",
        SKIP_MISSION_MISALIGNMENT: "skip-mission-misalignment"
    });

    const DISQUALIFIER_TYPES = Object.freeze({
        ORGANIZATIONAL_AGE: "organizational-age",
        FINANCIAL_HISTORY: "financial-history",
        AUDITED_FINANCIALS: "audited-financials",
        OPERATING_HISTORY: "operating-history",
        PROGRAM_HISTORY: "program-history",
        OUTCOME_HISTORY: "outcome-history",
        MINIMUM_BUDGET: "minimum-budget",
        GEOGRAPHY: "geography",
        POPULATION: "population",
        LICENSE: "license",
        ACCREDITATION: "accreditation",
        FACILITY: "facility",
        STAFFING: "staffing",
        PARTNER_REQUIRED: "partner-required",
        MATCH_REQUIRED: "match-required",
        REIMBURSEMENT_ONLY: "reimbursement-only",
        OTHER: "other"
    });

    const GrantOffice = {
        name: NAME,
        version: VERSION,
        buildId: BUILD_ID,
        schema: SCHEMA,
        status: "initializing",
        operatingMode: "continuous-opportunity-intelligence",

        configuration: {
            organizationNeutralCore: true,
            persistenceEnabled: true,
            automaticPersistence: true,
            localStorageKey: STORAGE_KEY,
            maximumOpportunities: 2000,
            maximumExecutiveReviews: 200,
            executiveDeskLimit: 20,
            minimumDeskScore: 72,
            minimumPursueScore: 82,
            minimumVerifiedConfidence: 0.72,
            requireOfficialSource: true,
            requireEligibilityReview: true,
            requireExecutiveApproval: true,
            rejectKnownDisqualifiers: true,
            protectExecutiveTime: true
        },

        activeMissions: [],
        opportunities: [],
        executiveReviews: [],
        analytics: {
            opportunitiesEvaluated: 0,
            opportunitiesRejected: 0,
            opportunitiesRecommended: 0,
            executiveHoursProtectedEstimate: 0,
            currentPipelineValue: 0,
            futurePipelineValue: 0,
            activePreparations: 0,
            submittedApplications: 0,
            awardPendingApplications: 0,
            awardedApplications: 0,
            declinedApplications: 0,
            alignmentStrategiesBuilt: 0,
            strongAlignmentStrategies: 0,
            unsupportedClaimsBlocked: 0,
            applicationsAnalyzed: 0,
            applicationQuestionsExtracted: 0,
            applicationDraftsCreated: 0,
            applicationDraftVariantsCreated: 0,
            applicationDraftOptimizationRuns: 0,
            applicationDraftWinningVersionsSelected: 0,
            adaptiveFitAnalysesCompleted: 0,
            adaptiveOpportunitiesPreserved: 0,
            adaptiveExecutiveCasesCreated: 0,
            executiveReviewPackagesCreated: 0,
            applicationPackagesAssembled: 0,
            applicationPackageItemsCreated: 0,
            executiveActionChecklistsCreated: 0,
            signatureReadinessBlocksTriggered: 0,
            portalAnalysesCompleted: 0,
            portalFieldsNormalized: 0,
            portalWorkflowStepsMapped: 0,
            portalSubmissionPackagesCreated: 0,
            portalAuthorizationBlocksTriggered: 0,
            submissionExecutionsRecorded: 0,
            duplicateSubmissionsBlocked: 0,
            submissionReceiptsVerified: 0,
            awardDecisionsRecorded: 0,
            awardedValue: 0,
            submittedValue: 0,
            fundsReceivedValue: 0,
            pendingAwardValue: 0,
            submissionBlocksTriggered: 0,
            lastFundsReceivedAt: null,
            lastAwardDecisionAt: null,
            lastSubmissionExecutionAt: null,
            lastPortalIntelligenceAt: null,
            lastApplicationAssemblyAt: null,
            lastApplicationIntelligenceAt: null,
            lastAdaptiveFitAnalysisAt: null,
            lastAlignmentStrategyAt: null,
            lastPipelineTransitionAt: null,
            lastEvaluationAt: null
        },

        initialize(options = {}) {
            this.configuration = {
                ...this.configuration,
                ...(options.configuration || options)
            };

            this.restore();
            this.opportunities.forEach(
                (opportunity) =>
                    this.ensurePipelineRecord(
                        opportunity
                    )
            );
            this.recalculatePipelineAnalytics();
            this.status = "online";

            console.info(
                `[MEOS] ${this.name} v${this.version} online. Build ${this.buildId}.`
            );

            return this.getStatus();
        },

        getOrganizationProfile() {
            return (
                global.MEOSOrganizationalProfile?.profile ||
                global.MEOSOrganizationalProfile ||
                global.OrganizationalProfile?.profile ||
                global.OrganizationalProfile ||
                global.CCSPOrganizationalProfile?.profile || // legacy customer-package compatibility
                global.CCSPOrganizationalProfile ||
                null
            );
        },

        getOrganizationStrategy() {
            return (
                global.MEOSOrganizationLongTermStrategy ||
                global.OrganizationLongTermStrategy ||
                global.MEOSLongTermStrategy ||
                global.CCSPLongTermStrategy || // legacy customer-package compatibility
                null
            );
        },

        createMission(request = {}) {
            const profile = this.getOrganizationProfile();

            const mission = {
                id: this.createId("opportunity-mission"),
                type: "executive-opportunity-intelligence",
                title:
                    request.title ||
                    "Identify and convert high-value organizational opportunities",
                objective:
                    request.objective ||
                    "Increase organizational capacity while protecting executive time.",
                requestedBy:
                    request.requestedBy ||
                    profile?.organization?.executiveDirector?.preferredName ||
                    "Executive Director",
                targetComponents:
                    this.uniqueStrings(
                        request.targetComponents ||
                        request.targetPrograms ||
                        []
                    ),
                targetOutcomes:
                    this.uniqueStrings(
                        request.targetOutcomes ||
                        request.targetFundingAreas ||
                        []
                    ),
                geography:
                    request.geography ||
                    profile?.organization?.serviceArea ||
                    "",
                minimumValue:
                    this.numberOrNull(
                        request.minimumValue ??
                        request.minimumFunding
                    ),
                maximumValue:
                    this.numberOrNull(
                        request.maximumValue ??
                        request.maximumFunding
                    ),
                includeCurrent:
                    request.includeCurrent !== false,
                includeFuture:
                    request.includeFuture !== false,
                status: "received",
                priority: request.priority || "high",
                createdAt: this.now(),
                updatedAt: this.now(),
                findings: [],
                missingInformation: [],
                recommendation: null
            };

            this.activeMissions.push(mission);
            this.persistIfEnabled();

            return this.clone(mission);
        },

        addOpportunity(input = {}) {
            const opportunity = {
                id:
                    input.id ||
                    this.createId("opportunity"),
                schema: SCHEMA,
                type:
                    input.type ||
                    input.opportunityType ||
                    OPPORTUNITY_TYPES.OTHER,
                title:
                    input.title ||
                    "Untitled Opportunity",
                provider:
                    input.provider ||
                    input.funder ||
                    "Unknown Provider",
                sourceUrl:
                    input.sourceUrl ||
                    input.officialUrl ||
                    "",
                sourceType:
                    input.sourceType ||
                    "discovered",
                description:
                    String(input.description || ""),
                statedPurpose:
                    String(
                        input.statedPurpose ||
                        input.funderIntent ||
                        ""
                    ),
                desiredOutcomes:
                    this.uniqueStrings(
                        input.desiredOutcomes ||
                        input.outcomes ||
                        []
                    ),
                targetPopulations:
                    this.uniqueStrings(
                        input.targetPopulations ||
                        []
                    ),
                geography:
                    input.geography ||
                    "",
                eligibleApplicants:
                    this.uniqueStrings(
                        input.eligibleApplicants ||
                        []
                    ),
                fundingAreas:
                    this.uniqueStrings(
                        input.fundingAreas ||
                        []
                    ),
                awardAmount:
                    this.numberOrNull(
                        input.awardAmount ??
                        input.fundingAmount
                    ),
                awardMinimum:
                    this.numberOrNull(input.awardMinimum),
                awardMaximum:
                    this.numberOrNull(input.awardMaximum),
                totalFundingPool:
                    this.numberOrNull(input.totalFundingPool),
                numberOfAwards:
                    this.numberOrNull(input.numberOfAwards),
                restricted:
                    input.restricted !== false,
                advanceOrReimbursement:
                    input.advanceOrReimbursement ||
                    "unknown",
                matchRequired:
                    input.matchRequired === true,
                matchAmount:
                    this.numberOrNull(input.matchAmount),
                indirectCostsAllowed:
                    input.indirectCostsAllowed ?? null,
                allowableCosts:
                    this.uniqueStrings(input.allowableCosts || []),
                openDate:
                    input.openDate || "",
                deadline:
                    input.deadline || "",
                awardDate:
                    input.awardDate || "",
                projectStartDate:
                    input.projectStartDate || "",
                projectEndDate:
                    input.projectEndDate || "",
                renewalCycle:
                    input.renewalCycle || "",
                timingStatus:
                    input.timingStatus ||
                    input.lifecycle ||
                    this.determineLifecycle(input),
                lifecycle:
                    input.timingStatus ||
                    input.lifecycle ||
                    this.determineLifecycle(input),
                requiredDocuments:
                    this.uniqueStrings(input.requiredDocuments || []),
                requirements:
                    this.normalizeRequirements(input.requirements || {}),
                restrictions:
                    this.uniqueStrings(input.restrictions || []),
                partnerRequirements:
                    this.uniqueStrings(input.partnerRequirements || []),
                reportingRequirements:
                    this.uniqueStrings(input.reportingRequirements || []),
                complianceRequirements:
                    this.uniqueStrings(input.complianceRequirements || []),
                historicalRecipients:
                    Array.isArray(input.historicalRecipients)
                        ? this.clone(input.historicalRecipients)
                        : [],
                competition:
                    input.competition || {},
                verified:
                    input.verified === true,
                confidence:
                    this.clamp(input.confidence, input.verified ? 0.9 : 0.5),
                discoveredAt:
                    input.discoveredAt || this.now(),
                updatedAt: this.now(),
                status:
                    input.status ||
                    "discovered",
                pipelineStage:
                    this.normalizePipelineStage(
                        input.pipelineStage ||
                        PIPELINE_STAGES.DISCOVERED
                    ),
                pipelineHistory:
                    this.normalizePipelineHistory(
                        input.pipelineHistory,
                        input.pipelineStage ||
                        PIPELINE_STAGES.DISCOVERED,
                        input.discoveredAt || this.now()
                    ),
                pursuitAuthorization:
                    input.pursuitAuthorization
                        ? this.clone(input.pursuitAuthorization)
                        : null,
                preparation:
                    input.preparation
                        ? this.clone(input.preparation)
                        : null,
                submission:
                    input.submission
                        ? this.clone(input.submission)
                        : null,
                outcome:
                    input.outcome
                        ? this.clone(input.outcome)
                        : null,
                alignmentStrategy:
                    input.alignmentStrategy
                        ? this.clone(input.alignmentStrategy)
                        : null,
                grantNarrativeStrategy:
                    input.grantNarrativeStrategy
                        ? this.clone(input.grantNarrativeStrategy)
                        : null,
                applicationIntelligence:
                    input.applicationIntelligence
                        ? this.clone(input.applicationIntelligence)
                        : null,
                executiveReviewPackage:
                    input.executiveReviewPackage
                        ? this.clone(input.executiveReviewPackage)
                        : null,
                executiveApplicationPackage:
                    input.executiveApplicationPackage
                        ? this.clone(input.executiveApplicationPackage)
                        : null,
                submissionPortalIntelligence:
                    input.submissionPortalIntelligence
                        ? this.clone(input.submissionPortalIntelligence)
                        : null,
                portalSubmissionPackage:
                    input.portalSubmissionPackage
                        ? this.clone(input.portalSubmissionPackage)
                        : null,
                submissionExecution:
                    input.submissionExecution
                        ? this.clone(input.submissionExecution)
                        : null,
                awardTracking:
                    input.awardTracking
                        ? this.clone(input.awardTracking)
                        : null,
                fundingReceipts:
                    Array.isArray(input.fundingReceipts)
                        ? this.clone(input.fundingReceipts)
                        : [],
                evaluation: null,
                tracking: {
                    enabled:
                        input.tracking?.enabled !== false,
                    lastCheckedAt:
                        input.tracking?.lastCheckedAt || null,
                    nextCheckAt:
                        input.tracking?.nextCheckAt || null,
                    changes:
                        Array.isArray(input.tracking?.changes)
                            ? this.clone(input.tracking.changes)
                            : []
                },
                raw:
                    input.raw || null
            };

            this.opportunities.push(opportunity);
            this.enforceOpportunityLimit();
            this.persistIfEnabled();

            return this.clone(opportunity);
        },

        evaluateOpportunity(opportunityId, missionId = null, options = {}) {
            const opportunity = this.getOpportunityById(opportunityId);
            const profile = this.getOrganizationProfile();
            const mission = missionId
                ? this.getMissionById(missionId)
                : null;

            if (!opportunity) {
                return {
                    success: false,
                    error: "Opportunity not found."
                };
            }

            if (!profile) {
                return {
                    success: false,
                    error:
                        "Organizational Profile is required before evaluation."
                };
            }

            const organizationSnapshot =
                this.buildOrganizationSnapshot(profile);

            const understanding =
                this.understandOpportunity(opportunity);

            const organizationalFit =
                this.evaluateOrganizationalFit({
                    opportunity,
                    understanding,
                    organizationSnapshot,
                    mission
                });

            const eligibility =
                this.evaluateEligibility({
                    opportunity,
                    organizationSnapshot
                });

            const moneyReality =
                this.evaluateMoneyReality({
                    opportunity,
                    organizationSnapshot,
                    mission
                });

            const timing =
                this.evaluateTiming(opportunity);

            const competitiveness =
                this.evaluateCompetitiveness({
                    opportunity,
                    organizationSnapshot,
                    organizationalFit,
                    eligibility
                });

            const execution =
                this.evaluateExecution({
                    opportunity,
                    organizationSnapshot,
                    eligibility
                });

            const strategicValue =
                this.evaluateStrategicValue({
                    opportunity,
                    organizationalFit,
                    moneyReality,
                    timing,
                    execution
                });

            const disqualifiers =
                this.identifyDisqualifiers({
                    opportunity,
                    organizationSnapshot,
                    organizationalFit,
                    eligibility,
                    execution,
                    moneyReality
                });

            const score =
                this.calculateExecutiveScore({
                    organizationalFit,
                    eligibility,
                    moneyReality,
                    timing,
                    competitiveness,
                    execution,
                    strategicValue,
                    disqualifiers,
                    opportunity
                });

            const legacyRecommendation =
                this.determineRecommendation({
                    opportunity,
                    score,
                    organizationalFit,
                    eligibility,
                    moneyReality,
                    timing,
                    competitiveness,
                    execution,
                    strategicValue,
                    disqualifiers
                });

            const acquisitionEngine =
                global.ExecutiveResourceAcquisitionEngine;

            if (
                !acquisitionEngine ||
                typeof acquisitionEngine.decide !== "function" ||
                typeof acquisitionEngine.toGrantOfficeEvaluation !== "function"
            ) {
                return {
                    success: false,
                    error:
                        "Executive Resource Acquisition Engine is required before Grant Office evaluation.",
                    code: "EXECUTIVE_RESOURCE_ACQUISITION_ENGINE_REQUIRED"
                };
            }

            const authoritativeResourceDecision =
                acquisitionEngine.decide(opportunity, {
                    profile,
                    mission,
                    organizationSnapshot,
                    evidence: {
                        understanding,
                        organizationalFit,
                        eligibility,
                        moneyReality,
                        timing,
                        competitiveness,
                        execution,
                        strategicValue,
                        disqualifiers,
                        score
                    }
                });

            const authoritativeEvaluation =
                acquisitionEngine.toGrantOfficeEvaluation(
                    opportunity,
                    authoritativeResourceDecision
                );

            const adaptiveFit =
                this.evaluateExecutiveAdaptiveFit({
                    opportunity,
                    understanding,
                    organizationSnapshot,
                    organizationalFit,
                    eligibility,
                    moneyReality,
                    timing,
                    competitiveness,
                    execution,
                    strategicValue,
                    disqualifiers,
                    authoritativeResourceDecision
                });

            let recommendation =
                authoritativeEvaluation.recommendation;
            let recommendationAuthority =
                "executive-resource-acquisition-engine";

            if (
                adaptiveFit.rescueEligible &&
                recommendation.decision ===
                    RECOMMENDATIONS.SKIP_MISSION_MISALIGNMENT
            ) {
                recommendation = {
                    decision:
                        adaptiveFit.preferredPath === "partner"
                            ? RECOMMENDATIONS.PURSUE_WITH_PARTNER
                            : RECOMMENDATIONS.PREPARE_FOR_FUTURE,
                    rationale:
                        adaptiveFit.executiveSummary,
                    nextAction:
                        adaptiveFit.nextAction
                };
                recommendationAuthority =
                    "grant-office-executive-adaptive-reasoning";
            }

            const missingInformation =
                this.uniqueStrings([
                    ...this.identifyMissingInformation({
                        opportunity,
                        organizationalFit,
                        eligibility,
                        moneyReality,
                        timing,
                        competitiveness,
                        execution
                    }),
                    ...(adaptiveFit.unknowns || [])
                ]);

            const evaluation = {
                success: true,
                schema:
                    "meos.grant-office.evaluation.v1",
                opportunityId:
                    opportunity.id,
                title:
                    opportunity.title,
                type:
                    opportunity.type,
                understanding,
                organizationalFit,
                eligibility,
                moneyReality,
                timing,
                competitiveness,
                execution,
                strategicValue,
                disqualifiers,
                score,
                recommendation,
                recommendationAuthority,
                adaptiveFit,
                legacyRecommendation,
                authoritativeResourceDecision,
                missingInformation,
                executiveSummary:
                    authoritativeEvaluation.executiveSummary,
                evaluatedAt:
                    authoritativeEvaluation.evaluatedAt,
                evaluatedBy:
                    authoritativeEvaluation.evaluatedBy,
                executiveApprovalRequired:
                    authoritativeEvaluation.executiveApprovalRequired ||
                    adaptiveFit.requiresExecutiveDecision
            };

            opportunity.evaluation = evaluation;
            opportunity.status =
                this.mapRecommendationToStatus(
                    recommendation.decision
                );
            opportunity.updatedAt = this.now();

            this.synchronizeEvaluationPipeline(
                opportunity,
                recommendation
            );

            if (mission) {
                mission.updatedAt = this.now();
                mission.findings.push({
                    opportunityId: opportunity.id,
                    score: score.total,
                    decision: recommendation.decision
                });
            }

            this.updateAnalytics(opportunity, evaluation);
            this.persistIfEnabled();

            return this.clone(evaluation);
        },

        understandOpportunity(opportunity) {
            return {
                whatItIs:
                    opportunity.type,
                provider:
                    opportunity.provider,
                currentOrFuture:
                    [
                        LIFECYCLE_STATES.SIGNAL,
                        LIFECYCLE_STATES.EXPECTED
                    ].includes(opportunity.timingStatus || opportunity.lifecycle)
                        ? "future"
                        : "current",
                statedPurpose:
                    opportunity.statedPurpose ||
                    opportunity.description,
                desiredOutcomes:
                    opportunity.desiredOutcomes,
                targetPopulations:
                    opportunity.targetPopulations,
                geography:
                    opportunity.geography,
                resourceForm:
                    this.determineResourceForm(opportunity),
                officialSourceAvailable:
                    Boolean(opportunity.sourceUrl),
                verified:
                    opportunity.verified
            };
        },

        buildOrganizationSnapshot(profile) {
            const organization = profile.organization || {};
            const programs =
                profile.programs?.primaryPrograms ||
                profile.programs ||
                [];
            const initiatives =
                profile.initiatives ||
                profile.projects ||
                [];

            const programArray =
                Array.isArray(programs)
                    ? programs
                    : Object.values(programs || {});

            const initiativeArray =
                Array.isArray(initiatives)
                    ? initiatives
                    : Object.values(initiatives || {});

            const components = [
                ...programArray,
                ...initiativeArray
            ].filter(Boolean);

            const capabilityText = [
                organization.mission,
                organization.slogan,
                organization.purpose,
                organization.serviceArea,
                organization.organizationType,
                organization.federalTaxStatus,
                ...components.flatMap((component) => [
                    component.name,
                    component.title,
                    component.purpose,
                    component.mission,
                    component.description,
                    ...(component.outcomes || []),
                    ...(component.capabilities || []),
                    ...(component.fundingDomains || [])
                ])
            ]
                .filter(Boolean)
                .join(" ");

            return {
                legalName:
                    organization.legalName ||
                    organization.name ||
                    "",
                organizationType:
                    organization.organizationType ||
                    "",
                federalTaxStatus:
                    organization.federalTaxStatus ||
                    "",
                serviceArea:
                    organization.serviceArea ||
                    organization.primaryGeography ||
                    organization.geography ||
                    "",
                country:
                    organization.country ||
                    organization.countryCode ||
                    profile.geography?.country ||
                    "",
                state:
                    organization.state ||
                    organization.region ||
                    profile.geography?.state ||
                    profile.geography?.region ||
                    "",
                mission:
                    organization.mission ||
                    "",
                slogan:
                    organization.slogan ||
                    "",
                formedDate:
                    organization.formedDate ||
                    organization.incorporationDate ||
                    null,
                annualBudget:
                    this.numberOrNull(
                        organization.annualBudget
                    ),
                financialYearsAvailable:
                    Number(
                        organization.financialYearsAvailable ||
                        profile.financials?.yearsAvailable ||
                        0
                    ),
                auditedFinancialYears:
                    Number(
                        organization.auditedFinancialYears ||
                        profile.financials?.auditedYears ||
                        0
                    ),
                operatingYears:
                    Number(
                        organization.operatingYears ||
                        profile.history?.operatingYears ||
                        0
                    ),
                programOutcomeYears:
                    Number(
                        profile.outcomes?.yearsAvailable ||
                        0
                    ),
                licenses:
                    this.uniqueStrings(
                        profile.compliance?.licenses || []
                    ),
                accreditations:
                    this.uniqueStrings(
                        profile.compliance?.accreditations || []
                    ),
                facilities:
                    this.uniqueStrings(
                        profile.operations?.facilities || []
                    ),
                staffCapacity:
                    profile.operations?.staffCapacity || null,
                liquidCashAvailable:
                    this.numberOrNull(
                        profile.financials?.liquidCashAvailable
                    ),
                components:
                    components.map((component) => ({
                        name:
                            component.name ||
                            component.title ||
                            "Unnamed Component",
                        type:
                            component.type ||
                            "program",
                        mission:
                            component.mission ||
                            component.purpose ||
                            component.description ||
                            "",
                        outcomes:
                            this.uniqueStrings(
                                component.outcomes || []
                            ),
                        capabilities:
                            this.uniqueStrings(
                                component.capabilities || []
                            ),
                        targetPopulations:
                            this.uniqueStrings(
                                component.targetPopulations || []
                            ),
                        fundingDomains:
                            this.uniqueStrings(
                                component.fundingDomains || []
                            )
                    })),
                capabilityText:
                    this.normalizeText(capabilityText)
            };
        },

        evaluateOrganizationalFit(context) {
            const opportunity = context.opportunity;
            const organization =
                context.organizationSnapshot;

            const opportunityConcepts =
                this.extractConcepts([
                    opportunity.title,
                    opportunity.description,
                    opportunity.statedPurpose,
                    opportunity.geography,
                    ...opportunity.desiredOutcomes,
                    ...opportunity.targetPopulations,
                    ...opportunity.fundingAreas
                ].join(" "));

            const componentScores =
                organization.components.map((component) => {
                    const componentText =
                        this.normalizeText([
                            component.name,
                            component.mission,
                            ...component.outcomes,
                            ...component.capabilities,
                            ...component.targetPopulations,
                            ...component.fundingDomains
                        ].join(" "));

                    const semanticBridge =
                        this.calculateConceptBridge(
                            opportunityConcepts,
                            componentText
                        );

                    return {
                        component:
                            component.name,
                        componentType:
                            component.type,
                        score:
                            semanticBridge.score,
                        directMatches:
                            semanticBridge.directMatches,
                        inferredConnections:
                            semanticBridge.inferredConnections,
                        explanation:
                            semanticBridge.explanation
                    };
                })
                .sort((a, b) => b.score - a.score);

            const best =
                componentScores[0] || {
                    component: null,
                    score: 0,
                    directMatches: [],
                    inferredConnections: [],
                    explanation:
                        "No commissioned organizational component was available."
                };

            const populationConflict =
                this.detectPopulationConflict(
                    opportunity,
                    organization
                );

            return {
                score:
                    populationConflict.hardConflict
                        ? Math.min(best.score, 30)
                        : best.score,
                bestComponent:
                    best.component,
                bestComponentType:
                    best.componentType,
                directMatches:
                    best.directMatches,
                inferredConnections:
                    best.inferredConnections,
                populationConflict,
                canHonestlyPerform:
                    best.score >= 60 &&
                    !populationConflict.hardConflict,
                missionDriftRisk:
                    best.score < 45
                        ? "high"
                        : best.score < 68
                            ? "moderate"
                            : "low",
                alignmentType:
                    best.directMatches.length > 0
                        ? "direct"
                        : best.inferredConnections.length > 0
                            ? "indirect-but-defensible"
                            : "speculative",
                explanation:
                    best.explanation,
                componentScores:
                    componentScores.slice(0, 5)
            };
        },

        calculateConceptBridge(concepts, componentText) {
            const directMatches = [];
            const inferredConnections = [];

            const conceptFamilies = {
                "ocean-health": [
                    "ocean health",
                    "marine health",
                    "marine sanctuary",
                    "coastal resilience",
                    "marine debris",
                    "ocean preservation",
                    "coastal ecosystem"
                ],
                "watershed-intervention": [
                    "watershed",
                    "river",
                    "upstream",
                    "runoff",
                    "riparian",
                    "source interception",
                    "stormwater"
                ],
                "homeless-stabilization": [
                    "homeless",
                    "unhoused",
                    "housing instability",
                    "street outreach",
                    "stabilization",
                    "mobile hygiene",
                    "continuum of care"
                ],
                "substance-use": [
                    "substance use",
                    "sud",
                    "opioid",
                    "opiate",
                    "addiction",
                    "recovery",
                    "overdose"
                ],
                "veteran-response": [
                    "veteran",
                    "first responder",
                    "ptsd",
                    "peer support",
                    "suicide prevention",
                    "crisis support"
                ],
                "workforce": [
                    "workforce",
                    "employment",
                    "job readiness",
                    "trade school",
                    "economic mobility",
                    "self sufficiency"
                ],
                "public-health": [
                    "public health",
                    "hygiene",
                    "sanitation",
                    "health equity",
                    "disease prevention",
                    "community health"
                ],
                "environmental-justice": [
                    "environmental justice",
                    "disproportionate impact",
                    "pollution prevention",
                    "community resilience"
                ]
            };

            const normalizedConcepts =
                this.normalizeText(concepts.join(" "));

            Object.entries(conceptFamilies).forEach(
                ([family, terms]) => {
                    const opportunityHas =
                        terms.some((term) =>
                            normalizedConcepts.includes(
                                this.normalizeText(term)
                            )
                        );

                    const organizationHas =
                        terms.some((term) =>
                            componentText.includes(
                                this.normalizeText(term)
                            )
                        );

                    if (opportunityHas && organizationHas) {
                        directMatches.push(family);
                    }
                }
            );

            const bridges = [
                {
                    opportunity: [
                        "ocean health",
                        "marine debris",
                        "coastal resilience",
                        "ocean preservation"
                    ],
                    organization: [
                        "upstream",
                        "watershed",
                        "river",
                        "runoff",
                        "source interception",
                        "marine sanctuary"
                    ],
                    label:
                        "Upstream watershed intervention can produce downstream ocean-health outcomes."
                },
                {
                    opportunity: [
                        "opioid",
                        "opiate",
                        "overdose",
                        "settlement"
                    ],
                    organization: [
                        "substance use",
                        "sud",
                        "recovery",
                        "stabilization",
                        "outreach"
                    ],
                    label:
                        "Substance-use stabilization may align with opioid-abatement outcomes."
                },
                {
                    opportunity: [
                        "community resilience",
                        "public health",
                        "health equity"
                    ],
                    organization: [
                        "mobile hygiene",
                        "street outreach",
                        "stabilization",
                        "dignity"
                    ],
                    label:
                        "Mobile hygiene and stabilization can advance community-health outcomes."
                },
                {
                    opportunity: [
                        "workforce development",
                        "economic mobility"
                    ],
                    organization: [
                        "employment",
                        "job skills",
                        "self sufficiency",
                        "trade school"
                    ],
                    label:
                        "Employment and skills support can advance workforce-development outcomes."
                }
            ];

            bridges.forEach((bridge) => {
                const opportunityHit =
                    bridge.opportunity.some((term) =>
                        normalizedConcepts.includes(
                            this.normalizeText(term)
                        )
                    );

                const organizationHit =
                    bridge.organization.some((term) =>
                        componentText.includes(
                            this.normalizeText(term)
                        )
                    );

                if (opportunityHit && organizationHit) {
                    inferredConnections.push(
                        bridge.label
                    );
                }
            });

            const titleWords =
                this.extractMeaningfulWords(
                    normalizedConcepts
                );
            const componentWords =
                new Set(
                    this.extractMeaningfulWords(componentText)
                );
            const lexicalMatches =
                titleWords.filter((word) =>
                    componentWords.has(word)
                );

            let score =
                Math.min(100,
                    directMatches.length * 22 +
                    inferredConnections.length * 28 +
                    lexicalMatches.length * 3
                );

            if (
                inferredConnections.length > 0 &&
                score < 68
            ) {
                score = 68;
            }

            return {
                score:
                    Math.round(score),
                directMatches:
                    this.uniqueStrings(directMatches),
                inferredConnections:
                    this.uniqueStrings(inferredConnections),
                explanation:
                    inferredConnections[0] ||
                    (
                        directMatches.length > 0
                            ? `Shared mission domain: ${directMatches.join(", ")}.`
                            : "No defensible mission bridge was established."
                    )
            };
        },

        detectPopulationConflict(opportunity, organization) {
            const opportunityText =
                this.normalizeText([
                    opportunity.title,
                    opportunity.description,
                    ...opportunity.targetPopulations
                ].join(" "));

            const organizationText =
                this.normalizeText([
                    organization.mission,
                    organization.capabilityText,
                    ...organization.components.flatMap(
                        (component) =>
                            component.targetPopulations
                    )
                ].join(" "));

            const exclusivePopulations = [
                {
                    label: "homeless youth",
                    indicators: [
                        "homeless youth",
                        "unaccompanied youth",
                        "ages 12 24",
                        "youth only"
                    ]
                },
                {
                    label: "children only",
                    indicators: [
                        "children only",
                        "pediatric only"
                    ]
                },
                {
                    label: "tribal governments only",
                    indicators: [
                        "tribal governments only",
                        "federally recognized tribes only"
                    ]
                }
            ];

            for (const population of exclusivePopulations) {
                const required =
                    population.indicators.some((indicator) =>
                        opportunityText.includes(
                            this.normalizeText(indicator)
                        )
                    );

                const supported =
                    population.indicators.some((indicator) =>
                        organizationText.includes(
                            this.normalizeText(indicator)
                        )
                    );

                if (required && !supported) {
                    return {
                        hardConflict: true,
                        population:
                            population.label,
                        explanation:
                            `The opportunity is restricted to ${population.label}, which is not supported by the current organizational profile.`
                    };
                }
            }

            return {
                hardConflict: false,
                population: null,
                explanation:
                    "No exclusive target-population conflict was identified."
            };
        },

        evaluateApplicantCompatibility(eligibleApplicants = [], organization = {}) {
            const applicantText =
                this.normalizeText(
                    Array.isArray(eligibleApplicants)
                        ? eligibleApplicants.join(" ")
                        : eligibleApplicants
                );

            if (!applicantText) {
                return {
                    status: "unknown",
                    compatible: null,
                    explanation: "Applicant eligibility language is missing."
                };
            }

            const organizationText =
                this.normalizeText([
                    organization.organizationType,
                    organization.federalTaxStatus,
                    organization.legalName
                ].filter(Boolean).join(" "));

            if (!organizationText) {
                return {
                    status: "unknown",
                    compatible: null,
                    explanation:
                        "The active organizational profile does not yet establish applicant class."
                };
            }

            const classes = [
                {
                    id: "nonprofit",
                    opportunity:
                        /nonprofit|non profit|501 c 3|501c3|public charity|tax exempt/,
                    organization:
                        /nonprofit|non profit|501 c 3|501c3|public charity|tax exempt/
                },
                {
                    id: "for-profit-business",
                    opportunity:
                        /for profit|for-profit|business|commercial entit|corporation|company|llc|limited liability|sole proprietor|sole proprietorship/,
                    organization:
                        /for profit|for-profit|business|commercial|corporation|company|llc|limited liability|sole proprietor|sole proprietorship/
                },
                {
                    id: "government",
                    opportunity:
                        /government|public agency|municipal|municipality|county|city|state agency|local agency/,
                    organization:
                        /government|public agency|municipal|municipality|county|city|state agency|local agency/
                },
                {
                    id: "tribal",
                    opportunity: /tribal|tribe|native nation/,
                    organization: /tribal|tribe|native nation/
                },
                {
                    id: "education",
                    opportunity:
                        /school|school district|college|university|education institution|educational institution/,
                    organization:
                        /school|school district|college|university|education institution|educational institution/
                },
                {
                    id: "individual",
                    opportunity:
                        /individual|person|creator|artist|researcher|student/,
                    organization:
                        /individual|person|creator|artist|researcher|student/
                }
            ];

            const statedClasses =
                classes.filter(item => item.opportunity.test(applicantText));

            if (statedClasses.length) {
                const matching =
                    statedClasses.find(item => item.organization.test(organizationText));

                if (matching) {
                    return {
                        status: "confirmed",
                        compatible: true,
                        applicantClass: matching.id,
                        explanation:
                            `Applicant class "${matching.id}" appears compatible with the active organizational profile.`
                    };
                }

                return {
                    status: "conflict",
                    compatible: false,
                    applicantClass: null,
                    explanation:
                        "The stated applicant classes do not clearly include the active organization."
                };
            }

            const organizationWords =
                new Set(
                    organizationText
                        .split(" ")
                        .filter(word => word.length >= 4)
                );

            const lexicalOverlap =
                applicantText
                    .split(" ")
                    .filter(word => word.length >= 4)
                    .some(word => organizationWords.has(word));

            return lexicalOverlap
                ? {
                    status: "confirmed",
                    compatible: true,
                    applicantClass: "profile-overlap",
                    explanation:
                        "Applicant language overlaps the active organization's documented legal/entity identity."
                }
                : {
                    status: "unknown",
                    compatible: null,
                    applicantClass: null,
                    explanation:
                        "Applicant compatibility is not established from the available organization and opportunity evidence."
                };
        },

        evaluateEligibility(context) {
            const opportunity =
                context.opportunity;
            const organization =
                context.organizationSnapshot;
            const requirements =
                opportunity.requirements;
            const failures = [];
            const conditions = [];
            const confirmed = [];

            const applicantCompatibility =
                this.evaluateApplicantCompatibility(
                    opportunity.eligibleApplicants,
                    organization
                );

            if (applicantCompatibility.compatible === true) {
                confirmed.push(
                    applicantCompatibility.explanation
                );
            } else if (applicantCompatibility.compatible === false) {
                failures.push(
                    applicantCompatibility.explanation
                );
            } else {
                conditions.push(
                    applicantCompatibility.explanation
                );
            }

            this.checkMinimumRequirement(
                failures,
                conditions,
                confirmed,
                "operating years",
                requirements.minimumOperatingYears,
                organization.operatingYears
            );

            this.checkMinimumRequirement(
                failures,
                conditions,
                confirmed,
                "years of financial statements",
                requirements.minimumFinancialYears,
                organization.financialYearsAvailable
            );

            this.checkMinimumRequirement(
                failures,
                conditions,
                confirmed,
                "years of audited financials",
                requirements.minimumAuditedFinancialYears,
                organization.auditedFinancialYears
            );

            this.checkMinimumRequirement(
                failures,
                conditions,
                confirmed,
                "years of program outcomes",
                requirements.minimumOutcomeYears,
                organization.programOutcomeYears
            );

            if (
                requirements.minimumAnnualBudget &&
                organization.annualBudget === null
            ) {
                conditions.push(
                    "Annual budget must be confirmed."
                );
            } else if (
                requirements.minimumAnnualBudget &&
                organization.annualBudget <
                    requirements.minimumAnnualBudget
            ) {
                failures.push(
                    "Organization does not meet the minimum annual-budget requirement."
                );
            }

            if (
                requirements.requiredLicense &&
                !organization.licenses.includes(
                    requirements.requiredLicense
                )
            ) {
                failures.push(
                    `Required license is not documented: ${requirements.requiredLicense}.`
                );
            }

            if (
                requirements.requiredAccreditation &&
                !organization.accreditations.includes(
                    requirements.requiredAccreditation
                )
            ) {
                failures.push(
                    `Required accreditation is not documented: ${requirements.requiredAccreditation}.`
                );
            }

            const geography =
                this.evaluateGeography(
                    opportunity,
                    organization
                );

            if (geography.disqualified) {
                failures.push(
                    geography.explanation
                );
            } else if (!geography.confirmed) {
                conditions.push(
                    geography.explanation
                );
            } else {
                confirmed.push(
                    geography.explanation
                );
            }

            const score =
                failures.length > 0
                    ? 0
                    : Math.max(
                        35,
                        Math.min(
                            100,
                            100 -
                            conditions.length * 12
                        )
                    );

            return {
                score,
                eligible:
                    failures.length === 0 &&
                    conditions.length === 0,
                conditionallyEligible:
                    failures.length === 0 &&
                    conditions.length > 0,
                disqualified:
                    failures.length > 0,
                failures,
                conditions,
                confirmed
            };
        },

        evaluateMoneyReality(context) {
            const opportunity = context.opportunity;
            const organization =
                context.organizationSnapshot;
            const mission = context.mission;

            const value =
                opportunity.awardAmount ||
                opportunity.awardMaximum ||
                opportunity.awardMinimum ||
                0;

            const concerns = [];
            const strengths = [];

            if (
                opportunity.advanceOrReimbursement ===
                "reimbursement"
            ) {
                concerns.push(
                    "Funding is reimbursement-based and may require the organization to front expenses."
                );

                if (
                    organization.liquidCashAvailable !== null &&
                    value > organization.liquidCashAvailable
                ) {
                    concerns.push(
                        "Current documented liquid cash may be insufficient to front the award."
                    );
                }
            }

            if (opportunity.matchRequired) {
                concerns.push(
                    "Matching funds are required."
                );
            }

            if (
                opportunity.indirectCostsAllowed === false
            ) {
                concerns.push(
                    "Administrative or indirect costs are not allowed."
                );
            } else if (
                opportunity.indirectCostsAllowed === true
            ) {
                strengths.push(
                    "Administrative or indirect costs are allowed."
                );
            }

            if (value > 0) {
                strengths.push(
                    `Potential organizational value: ${value}.`
                );
            }

            if (
                mission?.minimumValue &&
                value > 0 &&
                value < mission.minimumValue
            ) {
                concerns.push(
                    "Opportunity value is below the mission's minimum target."
                );
            }

            const pursuitCostEstimate =
                Math.max(
                    250,
                    opportunity.requiredDocuments.length * 175 +
                    opportunity.reportingRequirements.length * 125 +
                    opportunity.partnerRequirements.length * 250
                );

            const valueToEffort =
                value > 0
                    ? Math.min(
                        100,
                        Math.round(
                            (value /
                                Math.max(
                                    1,
                                    pursuitCostEstimate * 25
                                )) *
                            100
                        )
                    )
                    : 50;

            return {
                score:
                    Math.max(
                        0,
                        Math.min(
                            100,
                            valueToEffort -
                            concerns.length * 8 +
                            strengths.length * 4
                        )
                    ),
                estimatedAwardValue: value,
                totalFundingPool:
                    opportunity.totalFundingPool,
                numberOfAwards:
                    opportunity.numberOfAwards,
                restricted:
                    opportunity.restricted,
                paymentModel:
                    opportunity.advanceOrReimbursement,
                matchRequired:
                    opportunity.matchRequired,
                indirectCostsAllowed:
                    opportunity.indirectCostsAllowed,
                pursuitCostEstimate,
                valueToEffort,
                concerns,
                strengths
            };
        },

        evaluateTiming(opportunity) {
            const now = Date.now();
            const open =
                this.parseDate(opportunity.openDate);
            const deadline =
                this.parseDate(opportunity.deadline);
            const daysUntilOpen =
                open === null
                    ? null
                    : Math.ceil(
                        (open - now) /
                        86400000
                    );
            const daysRemaining =
                deadline === null
                    ? null
                    : Math.ceil(
                        (deadline - now) /
                        86400000
                    );

            let score = 60;
            let urgency = "unknown";
            const actions = [];

            if (
                [
                    LIFECYCLE_STATES.SIGNAL,
                    LIFECYCLE_STATES.EXPECTED
                ].includes(opportunity.lifecycle)
            ) {
                score = 85;
                urgency = "prepare";
                actions.push(
                    "Track the funding signal and begin readiness work before applications open."
                );
            } else if (
                daysUntilOpen !== null &&
                daysUntilOpen > 0
            ) {
                score = 90;
                urgency = "prepare";
                actions.push(
                    `Applications are expected to open in ${daysUntilOpen} days.`
                );
            } else if (
                daysRemaining === null
            ) {
                score = 55;
                urgency = "verify";
                actions.push(
                    "Verify the official opening and closing dates."
                );
            } else if (daysRemaining < 0) {
                score = 0;
                urgency = "closed";
                actions.push(
                    "The current cycle is closed; determine whether it recurs."
                );
            } else if (daysRemaining <= 7) {
                score = 35;
                urgency = "critical";
                actions.push(
                    "Deadline is within seven days; pursue only if application readiness is already high."
                );
            } else if (daysRemaining <= 30) {
                score = 80;
                urgency = "high";
                actions.push(
                    "Application work should begin immediately."
                );
            } else if (daysRemaining <= 90) {
                score = 95;
                urgency = "planned";
                actions.push(
                    "Sufficient preparation window exists."
                );
            } else {
                score = 90;
                urgency = "early";
                actions.push(
                    "Use the long lead time to strengthen evidence, partnerships, and required documents."
                );
            }

            return {
                score,
                timingStatus:
                    opportunity.timingStatus || opportunity.lifecycle,
                lifecycle:
                    opportunity.timingStatus || opportunity.lifecycle,
                openDate:
                    opportunity.openDate || null,
                deadline:
                    opportunity.deadline || null,
                daysUntilOpen,
                daysRemaining,
                urgency,
                recurring:
                    Boolean(opportunity.renewalCycle),
                renewalCycle:
                    opportunity.renewalCycle || null,
                actions
            };
        },

        evaluateCompetitiveness(context) {
            const opportunity =
                context.opportunity;
            const competition =
                opportunity.competition || {};
            const concerns = [];
            const advantages = [];

            if (
                opportunity.numberOfAwards === 1
            ) {
                concerns.push(
                    "Only one award is expected."
                );
            }

            if (
                competition.newOrganizationsEncouraged === true
            ) {
                advantages.push(
                    "New organizations are encouraged to apply."
                );
            }

            if (
                competition.establishedGranteesFavored === true
            ) {
                concerns.push(
                    "Historical funding appears concentrated among established grantees."
                );
            }

            if (
                opportunity.historicalRecipients.length > 0
            ) {
                advantages.push(
                    "Historical recipient data is available for competitive analysis."
                );
            }

            const base =
                Number(competition.estimatedWinProbability);

            let probability =
                Number.isFinite(base)
                    ? this.clamp(base, 0.5)
                    : (
                        context.organizationalFit.score * 0.45 +
                        context.eligibility.score * 0.35 +
                        (
                            opportunity.verified
                                ? 90
                                : 55
                        ) * 0.2
                    ) / 100;

            probability =
                Math.max(
                    0,
                    Math.min(
                        0.98,
                        probability -
                        concerns.length * 0.07 +
                        advantages.length * 0.04
                    )
                );

            return {
                score:
                    Math.round(probability * 100),
                estimatedWinProbability:
                    Number(probability.toFixed(3)),
                concerns,
                advantages,
                historicalRecipientCount:
                    opportunity.historicalRecipients.length
            };
        },

        evaluateExecution(context) {
            const opportunity =
                context.opportunity;
            const organization =
                context.organizationSnapshot;
            const blockers = [];
            const conditions = [];
            const strengths = [];

            if (
                opportunity.partnerRequirements.length > 0
            ) {
                conditions.push(
                    "Required partner commitments must be secured."
                );
            }

            if (
                opportunity.requirements.requiredFacility &&
                organization.facilities.length === 0
            ) {
                blockers.push(
                    "A required facility is not documented."
                );
            }

            if (
                opportunity.requirements.minimumStaff &&
                (
                    !organization.staffCapacity ||
                    organization.staffCapacity <
                        opportunity.requirements.minimumStaff
                )
            ) {
                conditions.push(
                    "Staffing capacity must be confirmed or expanded."
                );
            }

            if (
                opportunity.reportingRequirements.length > 8
            ) {
                conditions.push(
                    "Reporting burden is substantial."
                );
            }

            if (
                opportunity.complianceRequirements.length > 0
            ) {
                conditions.push(
                    "Compliance obligations require review before acceptance."
                );
            }

            if (
                opportunity.requiredDocuments.length <= 5
            ) {
                strengths.push(
                    "Required-document burden appears manageable."
                );
            }

            const score =
                blockers.length > 0
                    ? 0
                    : Math.max(
                        30,
                        90 -
                        conditions.length * 10 +
                        strengths.length * 5
                    );

            return {
                score:
                    Math.min(100, score),
                executable:
                    blockers.length === 0,
                blockers,
                conditions,
                strengths,
                requiredDocuments:
                    opportunity.requiredDocuments,
                partnerRequirements:
                    opportunity.partnerRequirements,
                reportingRequirements:
                    opportunity.reportingRequirements,
                complianceRequirements:
                    opportunity.complianceRequirements,
                sustainabilityRisk:
                    opportunity.projectEndDate &&
                    !opportunity.renewalCycle
                        ? "funding-cliff-review-required"
                        : "not-yet-identified"
            };
        },

        evaluateStrategicValue(context) {
            const valueTypes = [];
            const opportunity =
                context.opportunity;

            if (
                context.moneyReality.estimatedAwardValue > 0
            ) {
                valueTypes.push("cash");
            }

            if (
                opportunity.type ===
                OPPORTUNITY_TYPES.TECHNOLOGY_BENEFIT ||
                opportunity.type ===
                OPPORTUNITY_TYPES.COST_SAVINGS
            ) {
                valueTypes.push("cost-savings");
            }

            if (
                opportunity.type ===
                OPPORTUNITY_TYPES.IN_KIND_RESOURCE
            ) {
                valueTypes.push("in-kind-capacity");
            }

            if (
                opportunity.type ===
                OPPORTUNITY_TYPES.STRATEGIC_PARTNERSHIP
            ) {
                valueTypes.push("partnership");
            }

            if (
                [
                    OPPORTUNITY_TYPES.LEGISLATIVE_SIGNAL,
                    OPPORTUNITY_TYPES.BUDGET_SIGNAL,
                    OPPORTUNITY_TYPES.COURT_SETTLEMENT,
                    OPPORTUNITY_TYPES.FUTURE_FUNDING_SIGNAL
                ].includes(opportunity.type)
            ) {
                valueTypes.push("future-positioning");
            }

            const multiplier =
                valueTypes.includes("future-positioning")
                    ? 15
                    : 0;

            const score =
                Math.min(
                    100,
                    context.organizationalFit.score * 0.3 +
                    context.moneyReality.score * 0.25 +
                    context.execution.score * 0.2 +
                    context.timing.score * 0.15 +
                    valueTypes.length * 5 +
                    multiplier
                );

            return {
                score:
                    Math.round(score),
                valueTypes:
                    this.uniqueStrings(valueTypes),
                strengthensCapacity:
                    score >= 65,
                opensFuturePathway:
                    valueTypes.includes(
                        "future-positioning"
                    ),
                explanation:
                    valueTypes.length > 0
                        ? `Potential value includes ${valueTypes.join(", ")}.`
                        : "Strategic value is not yet established."
            };
        },

        identifyDisqualifiers(context) {
            const items = [];

            context.eligibility.failures.forEach(
                (reason) => {
                    items.push({
                        type:
                            this.classifyDisqualifier(reason),
                        reason,
                        hard:
                            true
                    });
                }
            );

            context.execution.blockers.forEach(
                (reason) => {
                    items.push({
                        type:
                            DISQUALIFIER_TYPES.OTHER,
                        reason,
                        hard:
                            true
                    });
                }
            );

            if (
                context.organizationalFit?.populationConflict?.hardConflict
            ) {
                items.push({
                    type:
                        DISQUALIFIER_TYPES.POPULATION,
                    reason:
                        context.organizationalFit.populationConflict.explanation,
                    hard:
                        true
                });
            }

            return items;
        },

        calculateExecutiveScore(context) {
            const weights = {
                missionAlignment: 0.23,
                eligibility: 0.2,
                moneyReality: 0.12,
                timing: 0.1,
                competitiveness: 0.13,
                execution: 0.12,
                strategicValue: 0.1
            };

            let total =
                context.organizationalFit.score *
                    weights.missionAlignment +
                context.eligibility.score *
                    weights.eligibility +
                context.moneyReality.score *
                    weights.moneyReality +
                context.timing.score *
                    weights.timing +
                context.competitiveness.score *
                    weights.competitiveness +
                context.execution.score *
                    weights.execution +
                context.strategicValue.score *
                    weights.strategicValue;

            const hardDisqualifiers =
                context.disqualifiers.filter(
                    (item) => item.hard
                ).length;

            if (hardDisqualifiers > 0) {
                total = Math.min(total, 20);
            }

            if (
                this.configuration.requireOfficialSource &&
                !context.opportunity.sourceUrl
            ) {
                total -= 8;
            }

            if (!context.opportunity.verified) {
                total -= 6;
            }

            total =
                Math.max(
                    0,
                    Math.min(100, Math.round(total))
                );

            return {
                total,
                rating:
                    total >= 90
                        ? "executive-priority"
                        : total >= 82
                            ? "strong-candidate"
                            : total >= 72
                                ? "strategic-opportunity"
                                : total >= 55
                                    ? "watch-list"
                                    : "reject",
                probability:
                    context.competitiveness
                        .estimatedWinProbability,
                components: {
                    missionAlignment:
                        context.organizationalFit.score,
                    eligibility:
                        context.eligibility.score,
                    moneyReality:
                        context.moneyReality.score,
                    timing:
                        context.timing.score,
                    competitiveness:
                        context.competitiveness.score,
                    execution:
                        context.execution.score,
                    strategicValue:
                        context.strategicValue.score
                }
            };
        },

        determineRecommendation(context) {
            let decision =
                RECOMMENDATIONS.WATCH_AND_TRACK;
            let rationale =
                "Continue monitoring while missing information is resolved.";

            if (
                context.disqualifiers.some(
                    (item) => item.hard
                )
            ) {
                decision =
                    RECOMMENDATIONS.SKIP_NOT_ELIGIBLE;
                rationale =
                    "A confirmed eligibility or execution disqualifier prevents pursuit.";
            } else if (
                context.organizationalFit.score < 45 ||
                !context.organizationalFit.canHonestlyPerform
            ) {
                decision =
                    RECOMMENDATIONS.SKIP_MISSION_MISALIGNMENT;
                rationale =
                    "The opportunity is not sufficiently aligned with a current organizational capability.";
            } else if (
                context.moneyReality.valueToEffort < 30 &&
                !context.strategicValue.opensFuturePathway
            ) {
                decision =
                    RECOMMENDATIONS.SKIP_LOW_RETURN;
                rationale =
                    "Likely organizational value does not justify the expected pursuit cost.";
            } else if (
                [
                    LIFECYCLE_STATES.SIGNAL,
                    LIFECYCLE_STATES.EXPECTED
                ].includes(context.opportunity.lifecycle)
            ) {
                decision =
                    RECOMMENDATIONS.PREPARE_FOR_FUTURE;
                rationale =
                    "The opportunity is not open yet, but the organization should prepare before funding becomes available.";
            } else if (
                context.eligibility.conditionallyEligible ||
                context.execution.conditions.some(
                    (condition) =>
                        condition.toLowerCase()
                            .includes("partner")
                )
            ) {
                decision =
                    context.opportunity.partnerRequirements.length > 0
                        ? RECOMMENDATIONS.PURSUE_WITH_PARTNER
                        : RECOMMENDATIONS.REQUEST_CLARIFICATION;
                rationale =
                    "The opportunity appears promising but requires a partner or material eligibility clarification.";
            } else if (
                context.score.total >=
                this.configuration.minimumPursueScore
            ) {
                decision =
                    RECOMMENDATIONS.PURSUE_NOW;
                rationale =
                    "The opportunity earned executive attention through strong fit, eligibility, value, timing, and execution readiness.";
            }

            return {
                decision,
                rationale,
                interruptExecutiveDirector:
                    decision ===
                    RECOMMENDATIONS.PURSUE_NOW,
                executivePriority:
                    context.score.rating,
                immediateAction:
                    this.buildImmediateAction({
                        ...context,
                        decision
                    }),
                owner:
                    "Grant Office",
                approvalRequired:
                    this.configuration.requireExecutiveApproval
            };
        },

        identifyMissingInformation(context) {
            const missing = [];

            if (!context.opportunity.sourceUrl) {
                missing.push(
                    "Official source URL"
                );
            }

            if (!context.opportunity.verified) {
                missing.push(
                    "Official-source verification"
                );
            }

            if (
                context.opportunity.eligibleApplicants.length === 0
            ) {
                missing.push(
                    "Eligible applicant classes"
                );
            }

            if (
                !context.opportunity.openDate &&
                ![
                    LIFECYCLE_STATES.SIGNAL,
                    LIFECYCLE_STATES.EXPECTED
                ].includes(context.opportunity.lifecycle)
            ) {
                missing.push(
                    "Application opening date"
                );
            }

            if (
                !context.opportunity.deadline &&
                context.opportunity.lifecycle ===
                    LIFECYCLE_STATES.OPEN
            ) {
                missing.push(
                    "Application deadline"
                );
            }

            if (
                !context.opportunity.awardAmount &&
                !context.opportunity.awardMinimum &&
                !context.opportunity.awardMaximum
            ) {
                missing.push(
                    "Award amount or range"
                );
            }

            if (
                context.competitiveness
                    .historicalRecipientCount === 0
            ) {
                missing.push(
                    "Historical recipient analysis"
                );
            }

            return this.uniqueStrings(missing);
        },

        buildExecutiveSummary(context) {
            return {
                headline:
                    `${context.recommendation.decision} — score ${context.score.total}/100`,
                whyItFits:
                    context.organizationalFit.explanation,
                organizationalComponent:
                    context.organizationalFit.bestComponent,
                eligibility:
                    context.eligibility.disqualified
                        ? "not eligible"
                        : context.eligibility.conditionallyEligible
                            ? "conditional"
                            : "appears eligible",
                probabilityOfSuccess:
                    context.competitiveness
                        .estimatedWinProbability,
                potentialValue:
                    context.moneyReality
                        .estimatedAwardValue,
                costToPursue:
                    context.moneyReality
                        .pursuitCostEstimate,
                deadline:
                    context.timing.deadline,
                daysRemaining:
                    context.timing.daysRemaining,
                blockers:
                    context.disqualifiers.map(
                        (item) => item.reason
                    ),
                missingRequirements:
                    context.missingInformation,
                immediateAction:
                    context.recommendation
                        .immediateAction,
                executiveTimeProtected:
                    context.recommendation
                        .interruptExecutiveDirector
                        ? false
                        : true
            };
        },

        getExecutiveDesk(options = {}) {
            const limit =
                Math.max(
                    1,
                    Math.min(
                        100,
                        Number(
                            options.limit ||
                            this.configuration.executiveDeskLimit
                        )
                    )
                );

            const evaluated =
                this.opportunities
                    .filter(
                        (item) =>
                            item.evaluation?.success
                    )
                    .filter(
                        (item) =>
                            item.evaluation.score.total >=
                            (
                                options.minimumScore ||
                                this.configuration.minimumDeskScore
                            )
                    )
                    .filter(
                        (item) =>
                            item.evaluation.recommendation.decision !==
                                RECOMMENDATIONS.SKIP_NOT_ELIGIBLE &&
                            item.evaluation.recommendation.decision !==
                                RECOMMENDATIONS.SKIP_LOW_RETURN &&
                            item.evaluation.recommendation.decision !==
                                RECOMMENDATIONS.SKIP_MISSION_MISALIGNMENT
                    )
                    .sort((a, b) => {
                        if (
                            b.evaluation.score.total !==
                            a.evaluation.score.total
                        ) {
                            return (
                                b.evaluation.score.total -
                                a.evaluation.score.total
                            );
                        }

                        return (
                            (
                                b.evaluation.moneyReality
                                    .estimatedAwardValue || 0
                            ) -
                            (
                                a.evaluation.moneyReality
                                    .estimatedAwardValue || 0
                            )
                        );
                    })
                    .slice(0, limit);

            const adaptiveWorkbench =
                this.opportunities
                    .filter(item =>
                        item.evaluation?.adaptiveFit?.rescueEligible &&
                        item.evaluation.adaptiveFit.projectedFitScore >=
                            this.configuration.minimumPursueScore
                    )
                    .filter(item =>
                        !evaluated.includes(item)
                    )
                    .sort((a, b) =>
                        b.evaluation.adaptiveFit.projectedFitScore -
                        a.evaluation.adaptiveFit.projectedFitScore
                    )
                    .slice(0, Math.min(limit, 10));

            return {
                success: true,
                reviewed:
                    this.opportunities.filter(
                        (item) => item.evaluation
                    ).length,
                rejectedBeforeDesk:
                    this.opportunities.filter(
                        (item) =>
                            item.evaluation &&
                            !evaluated.includes(item)
                    ).length,
                deskCount:
                    evaluated.length,
                workbenchCount:
                    adaptiveWorkbench.length,
                executiveWorkbench:
                    adaptiveWorkbench.map(item => ({
                        id: item.id,
                        title: item.title,
                        provider: item.provider,
                        currentFitScore:
                            item.evaluation.adaptiveFit.currentFitScore,
                        projectedFitScore:
                            item.evaluation.adaptiveFit.projectedFitScore,
                        preferredPath:
                            item.evaluation.adaptiveFit.preferredPath,
                        adaptation:
                            item.evaluation.adaptiveFit.selectedAdaptation,
                        nextAction:
                            item.evaluation.adaptiveFit.nextAction,
                        executiveSummary:
                            item.evaluation.adaptiveFit.executiveSummary
                    })),
                executiveDesk:
                    evaluated.map((item) => ({
                        id: item.id,
                        title: item.title,
                        provider: item.provider,
                        type: item.type,
                        score:
                            item.evaluation.score,
                        recommendation:
                            item.evaluation.recommendation,
                        executiveSummary:
                            item.evaluation.executiveSummary
                    }))
            };
        },

        rankOpportunities() {
            return this.opportunities
                .filter((item) => item.evaluation)
                .sort(
                    (a, b) =>
                        b.evaluation.score.total -
                        a.evaluation.score.total
                )
                .map((item) =>
                    this.clone(item)
                );
        },

        trackOpportunity(opportunityId, update = {}) {
            const opportunity =
                this.getOpportunityById(opportunityId);

            if (!opportunity) {
                return {
                    success: false,
                    error:
                        "Opportunity not found."
                };
            }

            const previous = {
                lifecycle:
                    opportunity.lifecycle,
                openDate:
                    opportunity.openDate,
                deadline:
                    opportunity.deadline,
                awardAmount:
                    opportunity.awardAmount
            };

            Object.assign(
                opportunity,
                {
                    ...update,
                    updatedAt:
                        this.now()
                }
            );

            if (
                Object.prototype.hasOwnProperty.call(update, "openDate") ||
                Object.prototype.hasOwnProperty.call(update, "deadline") ||
                Object.prototype.hasOwnProperty.call(update, "futureSignal") ||
                Object.prototype.hasOwnProperty.call(update, "preAnnouncement")
            ) {
                opportunity.timingStatus =
                    this.determineLifecycle(opportunity);
                opportunity.lifecycle =
                    opportunity.timingStatus;
            }

            const current = {
                lifecycle:
                    opportunity.lifecycle,
                openDate:
                    opportunity.openDate,
                deadline:
                    opportunity.deadline,
                awardAmount:
                    opportunity.awardAmount
            };

            opportunity.tracking.changes.push({
                previous,
                current,
                observedAt:
                    this.now()
            });
            opportunity.tracking.lastCheckedAt =
                this.now();

            this.persistIfEnabled();

            return {
                success: true,
                opportunity:
                    this.clone(opportunity)
            };
        },

        determineLifecycle(input) {
            const now = Date.now();
            const open =
                this.parseDate(input.openDate);
            const deadline =
                this.parseDate(input.deadline);

            if (
                input.futureSignal === true ||
                input.preAnnouncement === true
            ) {
                return LIFECYCLE_STATES.SIGNAL;
            }

            if (
                open !== null &&
                open > now
            ) {
                return LIFECYCLE_STATES.EXPECTED;
            }

            if (
                deadline !== null &&
                deadline < now
            ) {
                return LIFECYCLE_STATES.CLOSED;
            }

            if (
                deadline !== null &&
                deadline - now <=
                    14 * 86400000
            ) {
                return LIFECYCLE_STATES.CLOSING_SOON;
            }

            return LIFECYCLE_STATES.OPEN;
        },

        determineResourceForm(opportunity) {
            if (
                opportunity.type ===
                OPPORTUNITY_TYPES.IN_KIND_RESOURCE
            ) {
                return "in-kind";
            }

            if (
                opportunity.type ===
                    OPPORTUNITY_TYPES.TECHNOLOGY_BENEFIT ||
                opportunity.type ===
                    OPPORTUNITY_TYPES.COST_SAVINGS
            ) {
                return "cost-savings";
            }

            if (
                opportunity.type ===
                OPPORTUNITY_TYPES.STRATEGIC_PARTNERSHIP
            ) {
                return "relationship";
            }

            if (
                [
                    OPPORTUNITY_TYPES.LEGISLATIVE_SIGNAL,
                    OPPORTUNITY_TYPES.BUDGET_SIGNAL,
                    OPPORTUNITY_TYPES.FUTURE_FUNDING_SIGNAL,
                    OPPORTUNITY_TYPES.COURT_SETTLEMENT
                ].includes(opportunity.type)
            ) {
                return "future-funding-pathway";
            }

            return "cash-or-contract";
        },

        normalizeRequirements(requirements) {
            return {
                minimumOperatingYears:
                    this.numberOrNull(
                        requirements.minimumOperatingYears
                    ),
                minimumFinancialYears:
                    this.numberOrNull(
                        requirements.minimumFinancialYears
                    ),
                minimumAuditedFinancialYears:
                    this.numberOrNull(
                        requirements.minimumAuditedFinancialYears
                    ),
                minimumOutcomeYears:
                    this.numberOrNull(
                        requirements.minimumOutcomeYears
                    ),
                minimumAnnualBudget:
                    this.numberOrNull(
                        requirements.minimumAnnualBudget
                    ),
                requiredLicense:
                    requirements.requiredLicense ||
                    null,
                requiredAccreditation:
                    requirements.requiredAccreditation ||
                    null,
                requiredFacility:
                    requirements.requiredFacility ||
                    null,
                minimumStaff:
                    this.numberOrNull(
                        requirements.minimumStaff
                    )
            };
        },

        checkMinimumRequirement(
            failures,
            conditions,
            confirmed,
            label,
            required,
            available
        ) {
            if (!required) {
                return;
            }

            if (!available) {
                conditions.push(
                    `Current ${label} must be confirmed; requirement is ${required}.`
                );
                return;
            }

            if (available < required) {
                failures.push(
                    `Requires ${required} ${label}; current documented amount is ${available}.`
                );
                return;
            }

            confirmed.push(
                `${label} requirement appears satisfied.`
            );
        },

        evaluateGeography(opportunity, organization) {
            const opportunityGeography =
                this.normalizeText(
                    opportunity.geography
                );

            const organizationGeography =
                this.normalizeText([
                    organization.serviceArea,
                    organization.state,
                    organization.country
                ].filter(Boolean).join(" "));

            if (!opportunityGeography) {
                return {
                    confirmed: false,
                    disqualified: false,
                    explanation:
                        "Geographic eligibility is not stated."
                };
            }

            if (!organizationGeography) {
                return {
                    confirmed: false,
                    disqualified: false,
                    explanation:
                        "Opportunity geography is stated, but the active organizational profile does not yet establish enough geographic evidence to confirm eligibility."
                };
            }

            const opportunityTerms =
                opportunityGeography
                    .split(" ")
                    .filter(term => term.length >= 4);

            const organizationTerms =
                new Set(
                    organizationGeography
                        .split(" ")
                        .filter(term => term.length >= 4)
                );

            const overlap =
                opportunityTerms.some(
                    term => organizationTerms.has(term)
                );

            if (overlap) {
                return {
                    confirmed: true,
                    disqualified: false,
                    explanation:
                        "Opportunity geography overlaps the active organization's documented service area or jurisdiction."
                };
            }

            const broadOpportunity =
                /national|nationwide|federal|united states|usa|u s /.test(
                    opportunityGeography
                );

            if (broadOpportunity) {
                return {
                    confirmed: false,
                    disqualified: false,
                    explanation:
                        "The opportunity is broad/national. The local service area does not disqualify it; jurisdiction eligibility should be confirmed from authoritative requirements."
                };
            }

            return {
                confirmed: false,
                disqualified: false,
                explanation:
                    "No direct geographic overlap was established. Treat geography as unresolved until authoritative eligibility evidence confirms or excludes the organization."
            };
        },

        classifyDisqualifier(reason) {
            const value =
                this.normalizeText(reason);

            if (
                value.includes("audited financial")
            ) {
                return DISQUALIFIER_TYPES.AUDITED_FINANCIALS;
            }

            if (
                value.includes("financial statement")
            ) {
                return DISQUALIFIER_TYPES.FINANCIAL_HISTORY;
            }

            if (
                value.includes("operating year")
            ) {
                return DISQUALIFIER_TYPES.OPERATING_HISTORY;
            }

            if (
                value.includes("program outcome")
            ) {
                return DISQUALIFIER_TYPES.OUTCOME_HISTORY;
            }

            if (
                value.includes("annual budget")
            ) {
                return DISQUALIFIER_TYPES.MINIMUM_BUDGET;
            }

            if (
                value.includes("geograph")
            ) {
                return DISQUALIFIER_TYPES.GEOGRAPHY;
            }

            if (
                value.includes("license")
            ) {
                return DISQUALIFIER_TYPES.LICENSE;
            }

            if (
                value.includes("accreditation")
            ) {
                return DISQUALIFIER_TYPES.ACCREDITATION;
            }

            return DISQUALIFIER_TYPES.OTHER;
        },

        buildImmediateAction(context) {
            switch (context.decision) {
                case RECOMMENDATIONS.PURSUE_NOW:
                    return "Verify the official notice, open an application mission, and assemble the required documents immediately.";

                case RECOMMENDATIONS.PREPARE_FOR_FUTURE:
                    return "Track the funding source and begin building eligibility, outcome evidence, partnerships, and application materials before opening.";

                case RECOMMENDATIONS.PURSUE_WITH_PARTNER:
                    return "Identify and secure the required or strategically strongest partner before committing application resources.";

                case RECOMMENDATIONS.REQUEST_CLARIFICATION:
                    return "Contact the provider or review the official notice to resolve material eligibility questions.";

                case RECOMMENDATIONS.WATCH_AND_TRACK:
                    return "Keep the opportunity in the monitored pipeline and re-evaluate when material facts change.";

                case RECOMMENDATIONS.SKIP_NOT_ELIGIBLE:
                    return "Do not spend executive time unless eligibility rules materially change.";

                case RECOMMENDATIONS.SKIP_LOW_RETURN:
                    return "Archive the opportunity and prioritize stronger value-to-effort candidates.";

                case RECOMMENDATIONS.SKIP_MISSION_MISALIGNMENT:
                    return "Reject the opportunity to prevent mission drift.";

                default:
                    return "Review the evidence before action.";
            }
        },

        mapRecommendationToStatus(decision) {
            const map = {
                [RECOMMENDATIONS.PURSUE_NOW]:
                    "executive-priority",
                [RECOMMENDATIONS.PREPARE_FOR_FUTURE]:
                    "future-pipeline",
                [RECOMMENDATIONS.PURSUE_WITH_PARTNER]:
                    "partner-required",
                [RECOMMENDATIONS.REQUEST_CLARIFICATION]:
                    "verification-required",
                [RECOMMENDATIONS.WATCH_AND_TRACK]:
                    "watch-list",
                [RECOMMENDATIONS.SKIP_NOT_ELIGIBLE]:
                    "rejected-not-eligible",
                [RECOMMENDATIONS.SKIP_LOW_RETURN]:
                    "rejected-low-return",
                [RECOMMENDATIONS.SKIP_MISSION_MISALIGNMENT]:
                    "rejected-mission-misalignment"
            };

            return map[decision] || "review";
        },

        normalizePipelineStage(value) {
            const stage = String(value || "").trim();

            return Object.values(PIPELINE_STAGES).includes(stage)
                ? stage
                : PIPELINE_STAGES.DISCOVERED;
        },

        normalizePipelineHistory(history, stage, enteredAt) {
            const normalizedStage =
                this.normalizePipelineStage(stage);

            if (Array.isArray(history) && history.length > 0) {
                return history
                    .filter(
                        (entry) =>
                            entry &&
                            typeof entry === "object" &&
                            Object.values(PIPELINE_STAGES)
                                .includes(entry.stage)
                    )
                    .map((entry) => ({
                        stage: entry.stage,
                        enteredAt:
                            entry.enteredAt || this.now(),
                        note:
                            String(entry.note || ""),
                        actor:
                            String(entry.actor || "MEOS"),
                        authority:
                            String(
                                entry.authority ||
                                "system-record"
                            )
                    }));
            }

            return [{
                stage: normalizedStage,
                enteredAt: enteredAt || this.now(),
                note:
                    normalizedStage ===
                    PIPELINE_STAGES.DISCOVERED
                        ? "Opportunity entered the Grant Office."
                        : "Pipeline history restored from a legacy record.",
                actor: "MEOS Grant Office",
                authority: "system-record"
            }];
        },

        ensurePipelineRecord(opportunity) {
            if (!opportunity) {
                return null;
            }

            opportunity.pipelineStage =
                this.normalizePipelineStage(
                    opportunity.pipelineStage
                );

            opportunity.pipelineHistory =
                this.normalizePipelineHistory(
                    opportunity.pipelineHistory,
                    opportunity.pipelineStage,
                    opportunity.discoveredAt ||
                    opportunity.createdAt ||
                    this.now()
                );

            opportunity.timingStatus =
                opportunity.timingStatus ||
                opportunity.lifecycle ||
                this.determineLifecycle(opportunity);

            opportunity.lifecycle =
                opportunity.timingStatus;

            return opportunity;
        },

        getAllowedPipelineTransitions(stage) {
            const normalized =
                this.normalizePipelineStage(stage);

            return [
                ...(PIPELINE_STAGE_TRANSITIONS[normalized] || [])
            ];
        },

        appendPipelineHistory(
            opportunity,
            stage,
            details = {}
        ) {
            this.ensurePipelineRecord(opportunity);

            const entry = {
                stage,
                enteredAt:
                    details.enteredAt || this.now(),
                note:
                    String(details.note || ""),
                actor:
                    String(
                        details.actor ||
                        details.authorizedBy ||
                        "MEOS Grant Office"
                    ),
                authority:
                    String(
                        details.authority ||
                        "grant-office"
                    )
            };

            opportunity.pipelineHistory.push(entry);
            opportunity.updatedAt = entry.enteredAt;
            this.analytics.lastPipelineTransitionAt =
                entry.enteredAt;

            return entry;
        },

        transitionPipelineStage(
            opportunityId,
            nextStage,
            details = {}
        ) {
            const opportunity =
                this.getOpportunityById(opportunityId);

            if (!opportunity) {
                return {
                    success: false,
                    error: "Opportunity not found.",
                    code: "GRANT_PIPELINE_OPPORTUNITY_NOT_FOUND"
                };
            }

            this.ensurePipelineRecord(opportunity);

            const normalizedNext =
                this.normalizePipelineStage(nextStage);
            const currentStage =
                opportunity.pipelineStage;

            if (normalizedNext === currentStage) {
                return {
                    success: true,
                    changed: false,
                    opportunity:
                        this.clone(opportunity),
                    allowedNextStages:
                        this.getAllowedPipelineTransitions(
                            currentStage
                        )
                };
            }

            const allowed =
                this.getAllowedPipelineTransitions(
                    currentStage
                );

            if (!allowed.includes(normalizedNext)) {
                return {
                    success: false,
                    error:
                        `Cannot move from "${currentStage}" to ` +
                        `"${normalizedNext}".`,
                    code: "GRANT_PIPELINE_TRANSITION_INVALID",
                    currentStage,
                    requestedStage: normalizedNext,
                    allowedNextStages: allowed
                };
            }

            opportunity.pipelineStage =
                normalizedNext;

            this.appendPipelineHistory(
                opportunity,
                normalizedNext,
                details
            );

            this.recalculatePipelineAnalytics();
            this.persistIfEnabled();

            return {
                success: true,
                changed: true,
                previousStage: currentStage,
                currentStage: normalizedNext,
                allowedNextStages:
                    this.getAllowedPipelineTransitions(
                        normalizedNext
                    ),
                opportunity:
                    this.clone(opportunity)
            };
        },

        synchronizeEvaluationPipeline(
            opportunity,
            recommendation
        ) {
            this.ensurePipelineRecord(opportunity);

            const decision =
                recommendation?.decision || "";
            let targetStage =
                PIPELINE_STAGES.SCREENED;
            let note =
                "Executive evaluation completed.";

            if (
                [
                    RECOMMENDATIONS.PURSUE_NOW,
                    RECOMMENDATIONS.PREPARE_FOR_FUTURE,
                    RECOMMENDATIONS.PURSUE_WITH_PARTNER
                ].includes(decision)
            ) {
                targetStage =
                    PIPELINE_STAGES.ON_DESK;
                note =
                    "Executive evaluation placed the opportunity on the pursuit desk.";
            } else if (
                [
                    RECOMMENDATIONS.SKIP_NOT_ELIGIBLE,
                    RECOMMENDATIONS.SKIP_LOW_RETURN,
                    RECOMMENDATIONS.SKIP_MISSION_MISALIGNMENT
                ].includes(decision)
            ) {
                targetStage =
                    PIPELINE_STAGES.ARCHIVED;
                note =
                    "Executive evaluation rejected the opportunity before pursuit.";
            }

            const current =
                opportunity.pipelineStage;

            if (
                current === PIPELINE_STAGES.DISCOVERED &&
                targetStage !== PIPELINE_STAGES.SCREENED
            ) {
                opportunity.pipelineStage =
                    PIPELINE_STAGES.SCREENED;
                this.appendPipelineHistory(
                    opportunity,
                    PIPELINE_STAGES.SCREENED,
                    {
                        note:
                            "Executive screening completed.",
                        actor:
                            "Executive Resource Acquisition Engine",
                        authority:
                            "authoritative-evaluation"
                    }
                );
            }

            if (
                opportunity.pipelineStage !== targetStage &&
                this.getAllowedPipelineTransitions(
                    opportunity.pipelineStage
                ).includes(targetStage)
            ) {
                opportunity.pipelineStage =
                    targetStage;
                this.appendPipelineHistory(
                    opportunity,
                    targetStage,
                    {
                        note,
                        actor:
                            "Executive Resource Acquisition Engine",
                        authority:
                            "authoritative-evaluation"
                    }
                );
            }

            this.recalculatePipelineAnalytics();

            return opportunity.pipelineStage;
        },

        buildPreparationChecklist(
            opportunity,
            overrides = {}
        ) {
            const items = [];
            const seen = new Set();

            const add = (
                id,
                label,
                source,
                required = true,
                complete = false
            ) => {
                if (!id || seen.has(id)) {
                    return;
                }

                seen.add(id);
                items.push({
                    id,
                    label,
                    source,
                    required,
                    complete,
                    completedAt: complete
                        ? this.now()
                        : null,
                    completedBy: null,
                    note: ""
                });
            };

            add(
                "executive-authorization",
                "Executive Director pursuit authorization recorded",
                "MEOS governance",
                true,
                Boolean(
                    opportunity.pursuitAuthorization
                        ?.authorizedAt
                )
            );
            add(
                "official-notice",
                "Official opportunity notice verified",
                "official source",
                true,
                Boolean(
                    opportunity.verified &&
                    opportunity.sourceUrl
                )
            );
            add(
                "eligibility-confirmed",
                "Applicant eligibility confirmed",
                "eligibility review",
                true,
                Boolean(
                    opportunity.evaluation &&
                    !opportunity.evaluation
                        ?.eligibility?.disqualified
                )
            );
            add(
                "application-narrative",
                "Application narrative completed",
                "application package"
            );
            add(
                "project-budget",
                "Project budget completed and approved",
                "application package"
            );
            add(
                "submission-method",
                "Submission method and account access verified",
                "funder portal"
            );

            opportunity.requiredDocuments.forEach(
                (documentName, index) => {
                    add(
                        `required-document-${index + 1}`,
                        `Required document: ${documentName}`,
                        "opportunity requirement"
                    );
                }
            );

            opportunity.partnerRequirements.forEach(
                (requirement, index) => {
                    add(
                        `partner-requirement-${index + 1}`,
                        `Partner requirement: ${requirement}`,
                        "partner requirement"
                    );
                }
            );

            opportunity.complianceRequirements.forEach(
                (requirement, index) => {
                    add(
                        `compliance-requirement-${index + 1}`,
                        `Compliance requirement: ${requirement}`,
                        "compliance requirement"
                    );
                }
            );

            if (opportunity.matchRequired) {
                add(
                    "match-funding",
                    "Required match or cost share confirmed",
                    "financial requirement"
                );
            }

            const overrideItems =
                Array.isArray(overrides.items)
                    ? overrides.items
                    : [];

            overrideItems.forEach((item) => {
                const existing =
                    items.find(
                        (candidate) =>
                            candidate.id === item.id
                    );

                if (existing) {
                    Object.assign(existing, {
                        ...item,
                        id: existing.id
                    });
                    return;
                }

                add(
                    item.id ||
                    `custom-${items.length + 1}`,
                    item.label ||
                    "Additional preparation requirement",
                    item.source || "executive",
                    item.required !== false,
                    item.complete === true
                );
            });

            return items;
        },

        authorizePursuit(
            opportunityId,
            authorization = {}
        ) {
            const opportunity =
                this.getOpportunityById(opportunityId);

            if (!opportunity) {
                return {
                    success: false,
                    error: "Opportunity not found.",
                    code: "GRANT_PIPELINE_OPPORTUNITY_NOT_FOUND"
                };
            }

            this.ensurePipelineRecord(opportunity);

            if (
                this.configuration.requireExecutiveApproval &&
                !String(
                    authorization.authorizedBy || ""
                ).trim()
            ) {
                return {
                    success: false,
                    error:
                        "Executive authorization requires authorizedBy.",
                    code:
                        "GRANT_PIPELINE_EXECUTIVE_AUTHORIZATION_REQUIRED"
                };
            }

            opportunity.pursuitAuthorization = {
                authorized: true,
                authorizedBy:
                    String(
                        authorization.authorizedBy ||
                        "Executive Director"
                    ),
                authorizedAt:
                    authorization.authorizedAt ||
                    this.now(),
                note:
                    String(authorization.note || ""),
                scope:
                    authorization.scope ||
                    "prepare-and-submit-with-separate-submission-confirmation"
            };
            opportunity.updatedAt = this.now();

            this.persistIfEnabled();

            return {
                success: true,
                authorization:
                    this.clone(
                        opportunity.pursuitAuthorization
                    ),
                opportunity:
                    this.clone(opportunity)
            };
        },

        beginPreparation(
            opportunityId,
            options = {}
        ) {
            const opportunity =
                this.getOpportunityById(opportunityId);

            if (!opportunity) {
                return {
                    success: false,
                    error: "Opportunity not found.",
                    code: "GRANT_PIPELINE_OPPORTUNITY_NOT_FOUND"
                };
            }

            this.ensurePipelineRecord(opportunity);

            if (
                this.configuration.requireExecutiveApproval &&
                !opportunity.pursuitAuthorization?.authorized
            ) {
                return {
                    success: false,
                    error:
                        "Executive pursuit authorization is required before preparation begins.",
                    code:
                        "GRANT_PIPELINE_EXECUTIVE_AUTHORIZATION_REQUIRED"
                };
            }

            const transition =
                this.transitionPipelineStage(
                    opportunityId,
                    PIPELINE_STAGES.PREPARING,
                    {
                        note:
                            options.note ||
                            "Authorized application preparation began.",
                        actor:
                            options.actor ||
                            opportunity.pursuitAuthorization
                                ?.authorizedBy ||
                            "Executive Director",
                        authority:
                            "executive-authorization"
                    }
                );

            if (!transition.success) {
                return transition;
            }

            opportunity.preparation = {
                schema:
                    "meos.grant-office.preparation.v1",
                startedAt:
                    this.now(),
                startedBy:
                    options.actor ||
                    opportunity.pursuitAuthorization
                        ?.authorizedBy ||
                    "Executive Director",
                planId:
                    options.planId || null,
                documentIds:
                    this.uniqueStrings(
                        options.documentIds || []
                    ),
                checklist:
                    this.buildPreparationChecklist(
                        opportunity,
                        options.checklist || {}
                    ),
                readiness: {
                    ready: false,
                    required: 0,
                    complete: 0,
                    percent: 0,
                    blockers: []
                },
                readyAt: null,
                lastReviewedAt: null
            };

            this.refreshPreparationReadiness(
                opportunity
            );
            this.persistIfEnabled();

            return {
                success: true,
                preparation:
                    this.clone(opportunity.preparation),
                opportunity:
                    this.clone(opportunity)
            };
        },

        refreshPreparationReadiness(
            opportunity
        ) {
            if (!opportunity?.preparation) {
                return {
                    ready: false,
                    required: 0,
                    complete: 0,
                    percent: 0,
                    blockers: [
                        "Preparation workspace does not exist."
                    ]
                };
            }

            const checklist =
                Array.isArray(
                    opportunity.preparation.checklist
                )
                    ? opportunity.preparation.checklist
                    : [];

            const requiredItems =
                checklist.filter(
                    (item) => item.required !== false
                );
            const completeItems =
                requiredItems.filter(
                    (item) => item.complete === true
                );
            const blockers =
                requiredItems
                    .filter(
                        (item) => item.complete !== true
                    )
                    .map((item) => item.label);

            const readiness = {
                ready:
                    requiredItems.length > 0 &&
                    completeItems.length ===
                        requiredItems.length,
                required:
                    requiredItems.length,
                complete:
                    completeItems.length,
                percent:
                    requiredItems.length > 0
                        ? Math.round(
                            (
                                completeItems.length /
                                requiredItems.length
                            ) * 100
                        )
                        : 0,
                blockers
            };

            opportunity.preparation.readiness =
                readiness;
            opportunity.preparation.lastReviewedAt =
                this.now();
            opportunity.preparation.readyAt =
                readiness.ready
                    ? opportunity.preparation.readyAt ||
                      this.now()
                    : null;

            return readiness;
        },

        updatePreparationItem(
            opportunityId,
            itemId,
            update = {}
        ) {
            const opportunity =
                this.getOpportunityById(opportunityId);

            if (
                !opportunity ||
                opportunity.pipelineStage !==
                    PIPELINE_STAGES.PREPARING ||
                !opportunity.preparation
            ) {
                return {
                    success: false,
                    error:
                        "Opportunity is not in active preparation.",
                    code:
                        "GRANT_PIPELINE_PREPARATION_NOT_ACTIVE"
                };
            }

            const item =
                opportunity.preparation.checklist
                    .find(
                        (candidate) =>
                            candidate.id === itemId
                    );

            if (!item) {
                return {
                    success: false,
                    error:
                        "Preparation checklist item not found.",
                    code:
                        "GRANT_PIPELINE_PREPARATION_ITEM_NOT_FOUND"
                };
            }

            Object.assign(item, {
                complete:
                    update.complete === true,
                note:
                    String(
                        update.note ?? item.note ?? ""
                    ),
                completedAt:
                    update.complete === true
                        ? update.completedAt ||
                          item.completedAt ||
                          this.now()
                        : null,
                completedBy:
                    update.complete === true
                        ? String(
                            update.completedBy ||
                            item.completedBy ||
                            "MEOS user"
                        )
                        : null
            });

            opportunity.updatedAt = this.now();

            const readiness =
                this.refreshPreparationReadiness(
                    opportunity
                );

            this.recalculatePipelineAnalytics();
            this.persistIfEnabled();

            return {
                success: true,
                item:
                    this.clone(item),
                readiness:
                    this.clone(readiness),
                opportunity:
                    this.clone(opportunity)
            };
        },

        attachPreparationReferences(
            opportunityId,
            references = {}
        ) {
            const opportunity =
                this.getOpportunityById(opportunityId);

            if (!opportunity?.preparation) {
                return {
                    success: false,
                    error:
                        "Preparation workspace does not exist.",
                    code:
                        "GRANT_PIPELINE_PREPARATION_NOT_ACTIVE"
                };
            }

            if (references.planId !== undefined) {
                opportunity.preparation.planId =
                    references.planId || null;
            }

            opportunity.preparation.documentIds =
                this.uniqueStrings([
                    ...(
                        opportunity.preparation
                            .documentIds || []
                    ),
                    ...(references.documentIds || [])
                ]);

            opportunity.updatedAt = this.now();
            this.persistIfEnabled();

            return {
                success: true,
                preparation:
                    this.clone(opportunity.preparation)
            };
        },

        submitOpportunity(
            opportunityId,
            submission = {}
        ) {
            const opportunity =
                this.getOpportunityById(opportunityId);

            if (!opportunity) {
                return {
                    success: false,
                    error: "Opportunity not found.",
                    code: "GRANT_PIPELINE_OPPORTUNITY_NOT_FOUND"
                };
            }

            if (
                opportunity.pipelineStage !==
                PIPELINE_STAGES.PREPARING ||
                !opportunity.preparation
            ) {
                return {
                    success: false,
                    error:
                        "Opportunity must be in preparing before submission.",
                    code:
                        "GRANT_PIPELINE_SUBMISSION_STAGE_INVALID"
                };
            }

            const readiness =
                this.refreshPreparationReadiness(
                    opportunity
                );

            if (!readiness.ready) {
                return {
                    success: false,
                    error:
                        "Preparation is not complete.",
                    code:
                        "GRANT_PIPELINE_PREPARATION_INCOMPLETE",
                    readiness:
                        this.clone(readiness)
                };
            }

            if (
                !String(
                    submission.submittedBy || ""
                ).trim()
            ) {
                return {
                    success: false,
                    error:
                        "Submission requires submittedBy.",
                    code:
                        "GRANT_PIPELINE_SUBMISSION_ACTOR_REQUIRED"
                };
            }

            if (
                !String(
                    submission.confirmationId ||
                    submission.confirmationUrl ||
                    submission.receiptDocumentId ||
                    ""
                ).trim()
            ) {
                return {
                    success: false,
                    error:
                        "Submission requires a confirmation ID, confirmation URL, or receipt document reference.",
                    code:
                        "GRANT_PIPELINE_SUBMISSION_EVIDENCE_REQUIRED"
                };
            }

            const submittedAt =
                submission.submittedAt ||
                this.now();

            const transition =
                this.transitionPipelineStage(
                    opportunityId,
                    PIPELINE_STAGES.SUBMITTED,
                    {
                        enteredAt: submittedAt,
                        note:
                            submission.note ||
                            "Application submission confirmed.",
                        actor:
                            submission.submittedBy,
                        authority:
                            "human-confirmed-submission"
                    }
                );

            if (!transition.success) {
                return transition;
            }

            opportunity.submission = {
                schema:
                    "meos.grant-office.submission.v1",
                submittedAt,
                submittedBy:
                    String(submission.submittedBy),
                method:
                    String(
                        submission.method || "unknown"
                    ),
                confirmationId:
                    String(
                        submission.confirmationId || ""
                    ),
                confirmationUrl:
                    String(
                        submission.confirmationUrl || ""
                    ),
                receiptDocumentId:
                    String(
                        submission.receiptDocumentId || ""
                    ),
                amountRequested:
                    this.numberOrNull(
                        submission.amountRequested
                    ),
                note:
                    String(submission.note || "")
            };

            opportunity.updatedAt = this.now();
            this.recalculatePipelineAnalytics();
            this.persistIfEnabled();

            return {
                success: true,
                submission:
                    this.clone(opportunity.submission),
                opportunity:
                    this.clone(opportunity)
            };
        },

        markAwardPending(
            opportunityId,
            details = {}
        ) {
            const opportunity =
                this.getOpportunityById(opportunityId);

            if (!opportunity) {
                return {
                    success: false,
                    error: "Opportunity not found.",
                    code: "GRANT_PIPELINE_OPPORTUNITY_NOT_FOUND"
                };
            }

            const transition =
                this.transitionPipelineStage(
                    opportunityId,
                    PIPELINE_STAGES.AWARD_PENDING,
                    {
                        note:
                            details.note ||
                            "Application is awaiting the funder's decision.",
                        actor:
                            details.actor ||
                            "MEOS Grant Office",
                        authority:
                            "submission-monitoring"
                    }
                );

            if (!transition.success) {
                return transition;
            }

            opportunity.awardPending = {
                enteredAt:
                    this.now(),
                expectedDecisionAt:
                    details.expectedDecisionAt ||
                    opportunity.awardDate ||
                    null,
                followUpAt:
                    details.followUpAt || null,
                contact:
                    details.contact || null,
                note:
                    String(details.note || "")
            };

            this.persistIfEnabled();

            return {
                success: true,
                awardPending:
                    this.clone(
                        opportunity.awardPending
                    ),
                opportunity:
                    this.clone(opportunity)
            };
        },

        recordOutcome(
            opportunityId,
            outcome,
            details = {}
        ) {
            const opportunity =
                this.getOpportunityById(opportunityId);

            if (!opportunity) {
                return {
                    success: false,
                    error: "Opportunity not found.",
                    code: "GRANT_PIPELINE_OPPORTUNITY_NOT_FOUND"
                };
            }

            const normalizedOutcome =
                String(outcome || "")
                    .trim()
                    .toLowerCase();

            if (
                ![
                    PIPELINE_STAGES.AWARDED,
                    PIPELINE_STAGES.DECLINED
                ].includes(normalizedOutcome)
            ) {
                return {
                    success: false,
                    error:
                        'Outcome must be "awarded" or "declined".',
                    code:
                        "GRANT_PIPELINE_OUTCOME_INVALID"
                };
            }

            const transition =
                this.transitionPipelineStage(
                    opportunityId,
                    normalizedOutcome,
                    {
                        note:
                            details.note ||
                            `Funder outcome recorded: ${normalizedOutcome}.`,
                        actor:
                            details.recordedBy ||
                            "MEOS user",
                        authority:
                            "human-confirmed-outcome"
                    }
                );

            if (!transition.success) {
                return transition;
            }

            opportunity.outcome = {
                schema:
                    "meos.grant-office.outcome.v1",
                decision:
                    normalizedOutcome,
                decidedAt:
                    details.decidedAt ||
                    this.now(),
                recordedAt:
                    this.now(),
                recordedBy:
                    String(
                        details.recordedBy ||
                        "MEOS user"
                    ),
                awardedAmount:
                    normalizedOutcome ===
                    PIPELINE_STAGES.AWARDED
                        ? this.numberOrNull(
                            details.awardedAmount
                        )
                        : null,
                restrictions:
                    this.uniqueStrings(
                        details.restrictions || []
                    ),
                reportingRequirements:
                    this.uniqueStrings(
                        details.reportingRequirements ||
                        []
                    ),
                note:
                    String(details.note || "")
            };

            this.recalculatePipelineAnalytics();
            this.persistIfEnabled();

            return {
                success: true,
                outcome:
                    this.clone(opportunity.outcome),
                opportunity:
                    this.clone(opportunity)
            };
        },

        withdrawOpportunity(
            opportunityId,
            details = {}
        ) {
            return this.transitionPipelineStage(
                opportunityId,
                PIPELINE_STAGES.WITHDRAWN,
                {
                    note:
                        details.note ||
                        "Opportunity pursuit withdrawn.",
                    actor:
                        details.actor ||
                        "Executive Director",
                    authority:
                        "executive-decision"
                }
            );
        },

        archiveOpportunity(
            opportunityId,
            details = {}
        ) {
            return this.transitionPipelineStage(
                opportunityId,
                PIPELINE_STAGES.ARCHIVED,
                {
                    note:
                        details.note ||
                        "Opportunity archived.",
                    actor:
                        details.actor ||
                        "MEOS Grant Office",
                    authority:
                        details.authority ||
                        "records-management"
                }
            );
        },

        getPipeline(options = {}) {
            const stages =
                Array.isArray(options.stages)
                    ? new Set(
                        options.stages.map(
                            (stage) =>
                                this.normalizePipelineStage(
                                    stage
                                )
                        )
                    )
                    : null;

            const records =
                this.opportunities
                    .map((opportunity) => {
                        this.ensurePipelineRecord(
                            opportunity
                        );
                        return opportunity;
                    })
                    .filter(
                        (opportunity) =>
                            !stages ||
                            stages.has(
                                opportunity.pipelineStage
                            )
                    )
                    .sort((left, right) => {
                        const leftUpdated =
                            Date.parse(
                                left.updatedAt || ""
                            ) || 0;
                        const rightUpdated =
                            Date.parse(
                                right.updatedAt || ""
                            ) || 0;

                        return rightUpdated - leftUpdated;
                    });

            const limit =
                Math.max(
                    1,
                    Math.min(
                        500,
                        Number(options.limit || 100)
                    )
                );

            return {
                success: true,
                schema:
                    "meos.grant-office.pipeline.v1",
                version:
                    this.version,
                buildId:
                    this.buildId,
                total:
                    records.length,
                counts:
                    this.getPipelineCounts(),
                records:
                    records
                        .slice(0, limit)
                        .map((opportunity) =>
                            this.clone(opportunity)
                        )
            };
        },

        getPipelineCounts() {
            const counts =
                Object.fromEntries(
                    Object.values(PIPELINE_STAGES)
                        .map((stage) => [stage, 0])
                );

            this.opportunities.forEach(
                (opportunity) => {
                    this.ensurePipelineRecord(
                        opportunity
                    );
                    counts[
                        opportunity.pipelineStage
                    ] += 1;
                }
            );

            return counts;
        },

        recalculatePipelineAnalytics() {
            const counts =
                this.getPipelineCounts();

            this.analytics.activePreparations =
                counts[PIPELINE_STAGES.PREPARING];
            this.analytics.submittedApplications =
                counts[PIPELINE_STAGES.SUBMITTED];
            this.analytics.awardPendingApplications =
                counts[PIPELINE_STAGES.AWARD_PENDING];
            this.analytics.awardedApplications =
                counts[PIPELINE_STAGES.AWARDED];
            this.analytics.declinedApplications =
                counts[PIPELINE_STAGES.DECLINED];

            return counts;
        },

        normalizeAlignmentCollection(value) {
            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {
                return [];
            }

            if (Array.isArray(value)) {
                return value.flatMap(
                    item =>
                        this.normalizeAlignmentCollection(
                            item
                        )
                );
            }

            if (
                typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean"
            ) {
                const normalized =
                    String(value).trim();

                return normalized
                    ? [normalized]
                    : [];
            }

            if (typeof value !== "object") {
                return [];
            }

            const preferredFields = [
                "title",
                "name",
                "label",
                "programName",
                "serviceName",
                "activity",
                "objective",
                "outcome",
                "summary",
                "description",
                "purpose",
                "mission"
            ];

            const preferredValues =
                preferredFields.flatMap(
                    field =>
                        Object.prototype
                            .hasOwnProperty.call(
                                value,
                                field
                            )
                            ? this.normalizeAlignmentCollection(
                                value[field]
                            )
                            : []
                );

            if (preferredValues.length > 0) {
                return preferredValues;
            }

            return Object.values(value)
                .flatMap(
                    item =>
                        this.normalizeAlignmentCollection(
                            item
                        )
                );
        },

        normalizeAlignmentRecordCollection(value) {
            if (
                value === null ||
                value === undefined
            ) {
                return [];
            }

            if (Array.isArray(value)) {
                return value.flatMap(
                    item =>
                        this.normalizeAlignmentRecordCollection(
                            item
                        )
                );
            }

            if (typeof value === "object") {
                const looksLikeRecord = [
                    "id",
                    "statement",
                    "claim",
                    "summary",
                    "text",
                    "sourceType",
                    "authority",
                    "verified",
                    "confidence",
                    "citation",
                    "url",
                    "sourceId"
                ].some(
                    field =>
                        Object.prototype
                            .hasOwnProperty.call(
                                value,
                                field
                            )
                );

                if (looksLikeRecord) {
                    return [value];
                }

                return Object.values(value)
                    .flatMap(
                        item =>
                            this.normalizeAlignmentRecordCollection(
                                item
                            )
                    );
            }

            return [value];
        },

        roundNumber(value, precision = 3) {
            const number = Number(value);

            if (!Number.isFinite(number)) {
                return 0;
            }

            const factor =
                10 ** Math.max(
                    0,
                    Number(precision) || 0
                );

            return Math.round(number * factor) / factor;
        },

        resolveOrganizationAlignmentContext(input = {}) {
            const profile =
                input.organizationProfile ||
                this.getOrganizationProfile() ||
                {};

            const strategy =
                input.organizationStrategy ||
                this.getOrganizationStrategy() ||
                {};

            const explicitActivities =
                this.uniqueStrings([
                    ...this.normalizeAlignmentCollection(input.activities),
                    ...this.normalizeAlignmentCollection(input.programs),
                    ...this.normalizeAlignmentCollection(profile.programs),
                    ...this.normalizeAlignmentCollection(profile.services),
                    ...this.normalizeAlignmentCollection(profile.activities),
                    ...this.normalizeAlignmentCollection(
                        profile.organization?.programs
                    ),
                    ...this.normalizeAlignmentCollection(
                        profile.organization?.services
                    ),
                    ...this.normalizeAlignmentCollection(strategy.programs),
                    ...this.normalizeAlignmentCollection(strategy.objectives)
                ]);

            const explicitOutcomes =
                this.uniqueStrings([
                    ...this.normalizeAlignmentCollection(input.outcomes),
                    ...this.normalizeAlignmentCollection(profile.outcomes),
                    ...this.normalizeAlignmentCollection(
                        profile.intendedOutcomes
                    ),
                    ...this.normalizeAlignmentCollection(
                        profile.organization?.outcomes
                    ),
                    ...this.normalizeAlignmentCollection(strategy.outcomes),
                    ...this.normalizeAlignmentCollection(
                        strategy.impactObjectives
                    )
                ]);

            const mission =
                this.normalizeAlignmentCollection([
                    input.organizationMission,
                    profile.mission,
                    profile.organization?.mission,
                    strategy.mission
                ])[0] || "";

            const evidence =
                this.normalizeAlignmentEvidence([
                    ...this.normalizeAlignmentRecordCollection(input.evidence),
                    ...this.normalizeAlignmentRecordCollection(profile.evidence),
                    ...this.normalizeAlignmentRecordCollection(
                        profile.organization?.evidence
                    ),
                    ...this.normalizeAlignmentRecordCollection(strategy.evidence)
                ]);

            return {
                organizationId:
                    input.organizationId ||
                    profile.id ||
                    profile.organizationId ||
                    profile.organization?.id ||
                    profile.organization?.organizationId ||
                    "organization",
                organizationName:
                    input.organizationName ||
                    profile.name ||
                    profile.organizationName ||
                    profile.organization?.name ||
                    profile.organization?.organizationName ||
                    "Organization",
                mission,
                activities: explicitActivities,
                outcomes: explicitOutcomes,
                evidence
            };
        },

        normalizeAlignmentEvidence(evidence = []) {
            return this.normalizeAlignmentRecordCollection(evidence)
                .filter(Boolean)
                .map((item, index) => {
                    if (
                        typeof item === "string" ||
                        typeof item === "number" ||
                        typeof item === "boolean"
                    ) {
                        return {
                            id: `evidence-${index + 1}`,
                            statement: String(item).trim(),
                            sourceType: "provided",
                            authority: "unknown",
                            verified: false,
                            confidence: 0.5,
                            citation: null
                        };
                    }

                    return {
                        id:
                            item.id ||
                            `evidence-${index + 1}`,
                        statement:
                            String(
                                item.statement ||
                                item.claim ||
                                item.summary ||
                                item.text ||
                                ""
                            ).trim(),
                        sourceType:
                            item.sourceType ||
                            item.type ||
                            "provided",
                        authority:
                            item.authority ||
                            "unknown",
                        verified:
                            item.verified === true ||
                            item.authority === "authoritative" ||
                            item.authority === "primary",
                        confidence:
                            this.clamp(
                                item.confidence ??
                                (
                                    item.verified === true
                                        ? 0.9
                                        : 0.6
                                )
                            ),
                        citation:
                            item.citation ||
                            item.url ||
                            item.sourceId ||
                            null,
                        metadata:
                            item.metadata &&
                            typeof item.metadata === "object"
                                ? this.clone(item.metadata)
                                : {}
                    };
                })
                .filter(item => item.statement);
        },

        extractAlignmentConcepts(value) {
            const stopWords = new Set([
                "the", "and", "for", "with", "that", "this",
                "from", "into", "their", "they", "our", "your",
                "will", "would", "could", "should", "have",
                "has", "are", "was", "were", "its", "through",
                "using", "use", "support", "program", "project",
                "organization", "community"
            ]);

            return this.uniqueStrings(
                this.normalizeText(value)
                    .split(" ")
                    .filter(
                        word =>
                            word.length >= 3 &&
                            !stopWords.has(word)
                    )
            );
        },

        scoreConceptOverlap(left, right) {
            const leftSet =
                new Set(this.extractAlignmentConcepts(left));
            const rightSet =
                new Set(this.extractAlignmentConcepts(right));

            if (
                leftSet.size === 0 ||
                rightSet.size === 0
            ) {
                return 0;
            }

            const overlap =
                [...leftSet].filter(
                    item => rightSet.has(item)
                ).length;

            return overlap /
                Math.max(
                    1,
                    Math.min(
                        leftSet.size,
                        rightSet.size
                    )
                );
        },

        inferOutcomeBridge(activity, objective, evidence = []) {
            const activityText =
                this.normalizeText(activity);
            const objectiveText =
                this.normalizeText(objective);
            const combined =
                `${activityText} ${objectiveText}`;

            const bridges = [
                {
                    id: "watershed-pollution-aquatic-habitat",
                    activitySignals: [
                        "watershed", "river", "trash", "litter",
                        "cleanup", "sanitation", "encampment",
                        "pollution", "runoff", "water quality"
                    ],
                    objectiveSignals: [
                        "fish", "salmon", "aquatic", "habitat",
                        "stream", "river", "water quality",
                        "species"
                    ],
                    intermediateOutcomes: [
                        "reduced trash and pollutant loading",
                        "cleaner river corridors",
                        "improved watershed conditions",
                        "reduced pressure on aquatic habitat"
                    ],
                    caution:
                        "Do not claim direct target-species or habitat restoration unless the active organization performs or documents that work."
                },
                {
                    id: "hygiene-public-health",
                    activitySignals: [
                        "hygiene", "shower", "sanitation",
                        "outreach", "clean water"
                    ],
                    objectiveSignals: [
                        "public health", "disease", "health",
                        "prevention", "wellness"
                    ],
                    intermediateOutcomes: [
                        "improved access to hygiene",
                        "reduced exposure to preventable health risks",
                        "improved connection to health services"
                    ],
                    caution:
                        "Use measured service and health-referral evidence; do not promise clinical outcomes without data."
                },
                {
                    id: "stabilization-workforce",
                    activitySignals: [
                        "recovery", "stabilization", "housing",
                        "navigation", "treatment", "sober"
                    ],
                    objectiveSignals: [
                        "workforce", "employment", "economic",
                        "job", "self sufficiency", "mobility"
                    ],
                    intermediateOutcomes: [
                        "increased personal stability",
                        "reduced barriers to employment",
                        "improved readiness for training and work"
                    ],
                    caution:
                        "Do not claim job placement or wage gains unless those results are measured."
                }
            ];

            const bridge =
                bridges.find(candidate => {
                    const activityMatch =
                        candidate.activitySignals.some(
                            signal =>
                                activityText.includes(signal)
                        );
                    const objectiveMatch =
                        candidate.objectiveSignals.some(
                            signal =>
                                objectiveText.includes(signal)
                        );

                    return activityMatch && objectiveMatch;
                }) || null;

            if (!bridge) {
                return null;
            }

            const supportingEvidence =
                evidence.filter(item =>
                    this.scoreConceptOverlap(
                        item.statement,
                        [
                            activity,
                            objective,
                            ...bridge.intermediateOutcomes
                        ].join(" ")
                    ) > 0
                );

            return {
                ...bridge,
                supportingEvidenceIds:
                    supportingEvidence.map(
                        item => item.id
                    ),
                evidenceStrength:
                    supportingEvidence.length > 0
                        ? Math.min(
                            1,
                            supportingEvidence.reduce(
                                (total, item) =>
                                    total + item.confidence,
                                0
                            ) /
                            supportingEvidence.length
                        )
                        : 0
            };
        },

        buildAlignmentClaim({
            objective,
            activity,
            directScore,
            bridge,
            evidence
        }) {
            const directEvidence =
                evidence.filter(item =>
                    this.scoreConceptOverlap(
                        item.statement,
                        `${objective} ${activity}`
                    ) >= 0.2
                );

            const evidenceIds =
                this.uniqueStrings([
                    ...directEvidence.map(item => item.id),
                    ...(bridge?.supportingEvidenceIds || [])
                ]);

            const evidenceRecords =
                evidence.filter(
                    item => evidenceIds.includes(item.id)
                );

            const verifiedEvidence =
                evidenceRecords.filter(
                    item => item.verified
                );

            const evidenceStrength =
                evidenceRecords.length > 0
                    ? evidenceRecords.reduce(
                        (total, item) =>
                            total + item.confidence,
                        0
                    ) /
                    evidenceRecords.length
                    : 0;

            const connectionType =
                directScore >= 0.45
                    ? "direct"
                    : bridge
                    ? "indirect-evidence-required"
                    : "unsupported";

            const supported =
                connectionType === "direct"
                    ? evidenceRecords.length > 0
                    : connectionType ===
                      "indirect-evidence-required"
                    ? verifiedEvidence.length > 0
                    : false;

            const confidence =
                connectionType === "direct"
                    ? Math.min(
                        1,
                        0.55 +
                        directScore * 0.25 +
                        evidenceStrength * 0.2
                    )
                    : bridge
                    ? Math.min(
                        0.88,
                        0.35 +
                        bridge.evidenceStrength * 0.35 +
                        evidenceStrength * 0.18
                    )
                    : 0.15;

            let claim = "";
            let framing = "";

            if (
                connectionType ===
                "direct"
            ) {
                framing =
                    "direct organizational contribution";
                claim =
                    `${activity} directly contributes to the funder's objective: ${objective}.`;
            } else if (bridge) {
                framing =
                    "legitimate indirect mission intersection";
                claim =
                    `${activity} can contribute to ${objective} through ${bridge.intermediateOutcomes.join(
                        ", "
                    )}.`;
            } else {
                framing =
                    "no defensible connection established";
                claim =
                    `MEOS has not established a defensible connection between ${activity} and ${objective}.`;
            }

            return {
                objective,
                activity,
                connectionType,
                framing,
                claim,
                supported,
                confidence:
                    this.roundNumber(confidence, 3),
                evidenceIds,
                verifiedEvidenceCount:
                    verifiedEvidence.length,
                intermediateOutcomes:
                    bridge?.intermediateOutcomes || [],
                caution:
                    bridge?.caution ||
                    (
                        supported
                            ? "Use only the verified evidence attached to this claim."
                            : "Do not use this claim in an application until evidence is added."
                    ),
                status:
                    supported
                        ? confidence >= 0.75
                            ? "verified"
                            : "supported-indirect"
                        : "blocked"
            };
        },

        deriveFunderObjectives(opportunity, input = {}) {
            const supplied =
                this.uniqueStrings(
                    input.funderObjectives || []
                );

            if (supplied.length > 0) {
                return supplied;
            }

            return this.uniqueStrings([
                opportunity.statedPurpose,
                opportunity.description,
                opportunity.title,
                ...(opportunity.fundingAreas || []),
                ...(opportunity.requirements || [])
            ])
                .filter(Boolean)
                .slice(0, 8);
        },

        buildExecutiveAlignmentStrategy(
            opportunityId,
            input = {}
        ) {
            const opportunity =
                this.getOpportunityById(opportunityId);

            if (!opportunity) {
                return {
                    success: false,
                    error: "Opportunity not found.",
                    code:
                        "GRANT_ALIGNMENT_OPPORTUNITY_NOT_FOUND"
                };
            }

            const organization =
                this.resolveOrganizationAlignmentContext(
                    input
                );
            const objectives =
                this.deriveFunderObjectives(
                    opportunity,
                    input
                );
            const activities =
                organization.activities;

            if (objectives.length === 0) {
                return {
                    success: false,
                    error:
                        "Funder objectives are required before alignment strategy can be built.",
                    code:
                        "GRANT_ALIGNMENT_FUNDER_OBJECTIVES_REQUIRED"
                };
            }

            if (activities.length === 0) {
                return {
                    success: false,
                    error:
                        "Organization activities or programs are required before alignment strategy can be built.",
                    code:
                        "GRANT_ALIGNMENT_ORGANIZATION_ACTIVITIES_REQUIRED"
                };
            }

            const claims = [];

            objectives.forEach(objective => {
                activities.forEach(activity => {
                    const directScore =
                        this.scoreConceptOverlap(
                            objective,
                            activity
                        );
                    const bridge =
                        this.inferOutcomeBridge(
                            activity,
                            objective,
                            organization.evidence
                        );

                    if (
                        directScore < 0.12 &&
                        !bridge
                    ) {
                        return;
                    }

                    claims.push(
                        this.buildAlignmentClaim({
                            objective,
                            activity,
                            directScore,
                            bridge,
                            evidence:
                                organization.evidence
                        })
                    );
                });
            });

            const supportedClaims =
                claims.filter(
                    claim => claim.supported
                );
            const blockedClaims =
                claims.filter(
                    claim => !claim.supported
                );
            const verifiedClaims =
                supportedClaims.filter(
                    claim =>
                        claim.status === "verified"
                );

            const overallScore =
                claims.length > 0
                    ? Math.round(
                        (
                            claims.reduce(
                                (total, claim) =>
                                    total +
                                    claim.confidence *
                                    (
                                        claim.supported
                                            ? 1
                                            : 0.25
                                    ),
                                0
                            ) /
                            claims.length
                        ) * 100
                    )
                    : 0;

            const evidenceCoverage =
                claims.length > 0
                    ? Math.round(
                        supportedClaims.length /
                        claims.length *
                        100
                    )
                    : 0;

            const strategyStatus =
                supportedClaims.length === 0
                    ? "do-not-write"
                    : overallScore >= 75 &&
                      evidenceCoverage >= 70
                    ? "strong"
                    : overallScore >= 50
                    ? "conditional"
                    : "weak";

            const leadClaims =
                supportedClaims
                    .sort(
                        (left, right) =>
                            right.confidence -
                            left.confidence
                    )
                    .slice(0, 5);

            const narrativeStrategy = {
                positioning:
                    leadClaims.length > 0
                        ? `Lead with ${leadClaims[0].framing}: ${leadClaims[0].activity}.`
                        : "Do not draft a mission-alignment narrative yet.",
                leadClaims:
                    leadClaims.map(
                        claim => claim.claim
                    ),
                claimsToAvoid:
                    blockedClaims.map(
                        claim => claim.claim
                    ),
                evidenceRules: [
                    "Every material claim must cite organizational or authoritative external evidence.",
                    "Indirect outcomes must be described as contributions, not guaranteed impacts.",
                    "Do not claim direct service, expertise, or results the organization does not possess.",
                    "Unknowns must be disclosed or resolved before executive approval."
                ],
                reviewerDefense:
                    leadClaims.map(claim => ({
                        claim: claim.claim,
                        whyCredible:
                            claim.evidenceIds.length > 0
                                ? `Supported by ${claim.evidenceIds.length} evidence record(s).`
                                : "Evidence is incomplete.",
                        confidence:
                            claim.confidence
                    }))
            };

            const alignmentStrategy = {
                schema:
                    "meos.grant-office.executive-alignment-strategy.v1",
                version:
                    this.version,
                buildId:
                    this.buildId,
                opportunityId:
                    opportunity.id,
                organizationId:
                    organization.organizationId,
                organizationName:
                    organization.organizationName,
                createdAt:
                    this.now(),
                status:
                    strategyStatus,
                overallScore,
                evidenceCoverage,
                funderObjectives:
                    objectives,
                organizationMission:
                    organization.mission,
                organizationActivities:
                    activities,
                claims:
                    claims,
                supportedClaims:
                    supportedClaims.length,
                verifiedClaims:
                    verifiedClaims.length,
                blockedClaims:
                    blockedClaims.length,
                unknowns: [
                    ...(
                        organization.evidence.length === 0
                            ? [
                                "No organizational or authoritative evidence was supplied."
                            ]
                            : []
                    ),
                    ...(
                        blockedClaims.length > 0
                            ? [
                                `${blockedClaims.length} possible alignment claim(s) are blocked pending evidence.`
                            ]
                            : []
                    )
                ],
                recommendation:
                    strategyStatus === "strong"
                        ? "Proceed to grant narrative development using only the supported claims."
                        : strategyStatus === "conditional"
                        ? "Resolve evidence gaps before final narrative approval."
                        : "Do not write or submit the alignment narrative until a defensible strategy exists.",
                narrativeStrategy
            };

            opportunity.alignmentStrategy =
                alignmentStrategy;
            opportunity.grantNarrativeStrategy =
                narrativeStrategy;
            opportunity.updatedAt =
                this.now();

            this.analytics.alignmentStrategiesBuilt += 1;
            this.analytics.lastAlignmentStrategyAt =
                alignmentStrategy.createdAt;
            this.analytics.unsupportedClaimsBlocked +=
                blockedClaims.length;

            if (strategyStatus === "strong") {
                this.analytics.strongAlignmentStrategies += 1;
            }

            this.persistIfEnabled();

            return {
                success: true,
                alignmentStrategy:
                    this.clone(alignmentStrategy),
                opportunity:
                    this.clone(opportunity)
            };
        },

        getExecutiveAlignmentStrategy(
            opportunityId
        ) {
            const opportunity =
                this.getOpportunityById(opportunityId);

            if (!opportunity) {
                return {
                    success: false,
                    error: "Opportunity not found."
                };
            }

            return {
                success: true,
                alignmentStrategy:
                    this.clone(
                        opportunity.alignmentStrategy
                    ),
                narrativeStrategy:
                    this.clone(
                        opportunity.grantNarrativeStrategy
                    )
            };
        },

        normalizeApplicationSections(input = {}) {
            const suppliedSections =
                Array.isArray(input.sections)
                    ? input.sections
                    : [];

            const suppliedQuestions =
                Array.isArray(input.questions)
                    ? input.questions
                    : [];

            const sections = suppliedSections
                .map((section, sectionIndex) => ({
                    id:
                        section.id ||
                        `section-${sectionIndex + 1}`,
                    title:
                        String(
                            section.title ||
                            section.name ||
                            `Section ${sectionIndex + 1}`
                        ).trim(),
                    instructions:
                        String(
                            section.instructions ||
                            section.description ||
                            ""
                        ).trim(),
                    order:
                        Number(
                            section.order ??
                            sectionIndex + 1
                        ),
                    questions:
                        (
                            Array.isArray(section.questions)
                                ? section.questions
                                : []
                        ).map(
                            (question, questionIndex) =>
                                this.normalizeApplicationQuestion(
                                    question,
                                    {
                                        sectionId:
                                            section.id ||
                                            `section-${sectionIndex + 1}`,
                                        sectionTitle:
                                            section.title ||
                                            section.name ||
                                            `Section ${sectionIndex + 1}`,
                                        order:
                                            question.order ??
                                            questionIndex + 1
                                    }
                                )
                        )
                }))
                .filter(
                    section =>
                        section.title ||
                        section.questions.length > 0
                );

            if (suppliedQuestions.length > 0) {
                const defaultSection = {
                    id: "section-general",
                    title: "General Application",
                    instructions: "",
                    order: 1,
                    questions:
                        suppliedQuestions.map(
                            (question, index) =>
                                this.normalizeApplicationQuestion(
                                    question,
                                    {
                                        sectionId:
                                            "section-general",
                                        sectionTitle:
                                            "General Application",
                                        order:
                                            question.order ??
                                            index + 1
                                    }
                                )
                        )
                };

                sections.push(defaultSection);
            }

            return sections;
        },

        normalizeApplicationQuestion(
            question,
            defaults = {}
        ) {
            const raw =
                typeof question === "string"
                    ? {
                        text: question
                    }
                    : {
                        ...(question || {})
                    };

            const text =
                String(
                    raw.text ||
                    raw.question ||
                    raw.prompt ||
                    raw.label ||
                    ""
                ).trim();

            const instructions =
                String(
                    raw.instructions ||
                    raw.helpText ||
                    raw.guidance ||
                    ""
                ).trim();

            const category =
                raw.category ||
                this.classifyApplicationQuestion(
                    `${text} ${instructions}`
                );

            const limits =
                this.extractApplicationLimits(
                    `${text} ${instructions}`,
                    raw
                );

            const intent =
                raw.intent ||
                this.inferApplicationQuestionIntent(
                    text,
                    category
                );

            const evidenceRequirements =
                this.determineApplicationEvidenceRequirements(
                    text,
                    category
                );

            const executiveInputRequired =
                raw.executiveInputRequired === true ||
                this.requiresExecutiveInput(
                    text,
                    category
                );

            return {
                id:
                    raw.id ||
                    this.createId("application-question"),
                sectionId:
                    raw.sectionId ||
                    defaults.sectionId ||
                    "section-general",
                sectionTitle:
                    raw.sectionTitle ||
                    defaults.sectionTitle ||
                    "General Application",
                order:
                    Number(
                        raw.order ??
                        defaults.order ??
                        1
                    ),
                text,
                instructions,
                category,
                intent,
                required:
                    raw.required !== false,
                limits,
                scoring:
                    raw.scoring &&
                    typeof raw.scoring === "object"
                        ? this.clone(raw.scoring)
                        : null,
                evidenceRequirements,
                recommendedSources:
                    this.recommendApplicationSources(
                        category
                    ),
                executiveInputRequired,
                risk:
                    this.assessApplicationQuestionRisk(
                        text,
                        category,
                        executiveInputRequired
                    ),
                state:
                    APPLICATION_ITEM_STATES.UNANSWERED,
                draft:
                    null,
                review:
                    {
                        status:
                            APPLICATION_ITEM_STATES.UNANSWERED,
                        approvedBy: null,
                        approvedAt: null,
                        revisionNotes: "",
                        executiveNotes: ""
                    }
            };
        },

        classifyApplicationQuestion(value) {
            const text =
                this.normalizeText(value);

            const rules = [
                {
                    category:
                        APPLICATION_QUESTION_CATEGORIES.BUDGET_NARRATIVE,
                    signals: [
                        "budget narrative",
                        "justify the budget",
                        "explain costs",
                        "cost justification"
                    ]
                },
                {
                    category:
                        APPLICATION_QUESTION_CATEGORIES.BUDGET,
                    signals: [
                        "budget",
                        "amount requested",
                        "cost share",
                        "matching funds",
                        "indirect cost"
                    ]
                },
                {
                    category:
                        APPLICATION_QUESTION_CATEGORIES.EVALUATION,
                    signals: [
                        "evaluate",
                        "evaluation",
                        "measure success",
                        "performance measure",
                        "data collection"
                    ]
                },
                {
                    category:
                        APPLICATION_QUESTION_CATEGORIES.SUSTAINABILITY,
                    signals: [
                        "sustainability",
                        "sustain the project",
                        "after funding",
                        "future funding"
                    ]
                },
                {
                    category:
                        APPLICATION_QUESTION_CATEGORIES.NEEDS,
                    signals: [
                        "need",
                        "problem statement",
                        "community need",
                        "why is this needed"
                    ]
                },
                {
                    category:
                        APPLICATION_QUESTION_CATEGORIES.GOALS,
                    signals: [
                        "goal",
                        "objective",
                        "smart objective",
                        "milestone"
                    ]
                },
                {
                    category:
                        APPLICATION_QUESTION_CATEGORIES.METHODS,
                    signals: [
                        "method",
                        "work plan",
                        "implementation",
                        "activities",
                        "timeline"
                    ]
                },
                {
                    category:
                        APPLICATION_QUESTION_CATEGORIES.OUTCOMES,
                    signals: [
                        "outcome",
                        "impact",
                        "result",
                        "benefit",
                        "change expected"
                    ]
                },
                {
                    category:
                        APPLICATION_QUESTION_CATEGORIES.PARTNERSHIPS,
                    signals: [
                        "partner",
                        "collaboration",
                        "coalition",
                        "letter of support"
                    ]
                },
                {
                    category:
                        APPLICATION_QUESTION_CATEGORIES.CAPACITY,
                    signals: [
                        "capacity",
                        "experience",
                        "track record",
                        "staff qualifications",
                        "organizational readiness"
                    ]
                },
                {
                    category:
                        APPLICATION_QUESTION_CATEGORIES.ALIGNMENT,
                    signals: [
                        "align",
                        "mission fit",
                        "funding priority",
                        "funder priority"
                    ]
                },
                {
                    category:
                        APPLICATION_QUESTION_CATEGORIES.EQUITY,
                    signals: [
                        "equity",
                        "access",
                        "underserved",
                        "disparity",
                        "inclusion"
                    ]
                },
                {
                    category:
                        APPLICATION_QUESTION_CATEGORIES.COMPLIANCE,
                    signals: [
                        "certify",
                        "certification",
                        "compliance",
                        "assurance",
                        "debarment",
                        "lobbying"
                    ]
                },
                {
                    category:
                        APPLICATION_QUESTION_CATEGORIES.SIGNATURE,
                    signals: [
                        "signature",
                        "authorized official",
                        "signatory"
                    ]
                },
                {
                    category:
                        APPLICATION_QUESTION_CATEGORIES.ATTACHMENT,
                    signals: [
                        "attach",
                        "upload",
                        "attachment",
                        "supporting document"
                    ]
                },
                {
                    category:
                        APPLICATION_QUESTION_CATEGORIES.ORGANIZATION,
                    signals: [
                        "organization",
                        "mission",
                        "history",
                        "legal name",
                        "ein",
                        "501 c 3"
                    ]
                },
                {
                    category:
                        APPLICATION_QUESTION_CATEGORIES.PROGRAM,
                    signals: [
                        "describe the program",
                        "project description",
                        "program description",
                        "proposed project"
                    ]
                }
            ];

            const match = rules.find(rule =>
                rule.signals.some(signal =>
                    text.includes(signal)
                )
            );

            return (
                match?.category ||
                APPLICATION_QUESTION_CATEGORIES.OTHER
            );
        },

        inferApplicationQuestionIntent(
            text,
            category
        ) {
            const intents = {
                [APPLICATION_QUESTION_CATEGORIES.ORGANIZATION]:
                    "Establish organizational identity, credibility, legal status, and mission.",
                [APPLICATION_QUESTION_CATEGORIES.PROGRAM]:
                    "Understand what the organization proposes to do and for whom.",
                [APPLICATION_QUESTION_CATEGORIES.NEEDS]:
                    "Verify that a significant, evidence-supported problem exists.",
                [APPLICATION_QUESTION_CATEGORIES.ALIGNMENT]:
                    "Determine whether the proposal advances the funder's stated priorities.",
                [APPLICATION_QUESTION_CATEGORIES.GOALS]:
                    "Assess whether the proposal has specific and measurable objectives.",
                [APPLICATION_QUESTION_CATEGORIES.METHODS]:
                    "Determine whether the implementation plan is realistic and complete.",
                [APPLICATION_QUESTION_CATEGORIES.OUTCOMES]:
                    "Understand the measurable change expected from the funded work.",
                [APPLICATION_QUESTION_CATEGORIES.EVALUATION]:
                    "Determine how performance and outcomes will be measured and reported.",
                [APPLICATION_QUESTION_CATEGORIES.SUSTAINABILITY]:
                    "Assess whether the work can continue after the grant period.",
                [APPLICATION_QUESTION_CATEGORIES.EQUITY]:
                    "Understand who benefits, who may face barriers, and how access is addressed.",
                [APPLICATION_QUESTION_CATEGORIES.PARTNERSHIPS]:
                    "Evaluate the strength and necessity of collaborative relationships.",
                [APPLICATION_QUESTION_CATEGORIES.BUDGET]:
                    "Determine whether requested costs are allowable, reasonable, and aligned with the work plan.",
                [APPLICATION_QUESTION_CATEGORIES.BUDGET_NARRATIVE]:
                    "Understand why each material cost is necessary to achieve the proposed outcomes.",
                [APPLICATION_QUESTION_CATEGORIES.CAPACITY]:
                    "Assess whether the organization has the experience, people, systems, and governance to deliver.",
                [APPLICATION_QUESTION_CATEGORIES.COMPLIANCE]:
                    "Confirm legal, policy, and funding-rule compliance.",
                [APPLICATION_QUESTION_CATEGORIES.SIGNATURE]:
                    "Obtain binding authorization from an approved signatory.",
                [APPLICATION_QUESTION_CATEGORIES.ATTACHMENT]:
                    "Collect required documentary evidence.",
                [APPLICATION_QUESTION_CATEGORIES.OTHER]:
                    "Determine the factual and strategic response required by the funder."
            };

            return intents[category] ||
                `Provide a complete, evidence-supported response to: ${text}`;
        },

        extractApplicationLimits(text, raw = {}) {
            const value =
                String(text || "");

            const wordMatch =
                value.match(
                    /(?:maximum|max|limit(?:ed)? to)?\s*(\d{1,6})\s*words?/i
                );
            const characterMatch =
                value.match(
                    /(?:maximum|max|limit(?:ed)? to)?\s*(\d{1,7})\s*characters?/i
                );
            const pageMatch =
                value.match(
                    /(?:maximum|max|limit(?:ed)? to)?\s*(\d{1,4})\s*pages?/i
                );

            return {
                words:
                    this.numberOrNull(
                        raw.wordLimit ||
                        raw.maxWords ||
                        wordMatch?.[1]
                    ),
                characters:
                    this.numberOrNull(
                        raw.characterLimit ||
                        raw.maxCharacters ||
                        characterMatch?.[1]
                    ),
                pages:
                    this.numberOrNull(
                        raw.pageLimit ||
                        raw.maxPages ||
                        pageMatch?.[1]
                    )
            };
        },

        determineApplicationEvidenceRequirements(
            text,
            category
        ) {
            const requirements = [];

            const add = (
                type,
                description,
                required = true
            ) => {
                requirements.push({
                    type,
                    description,
                    required
                });
            };

            const mapping = {
                [APPLICATION_QUESTION_CATEGORIES.ORGANIZATION]: [
                    [
                        "organizational-profile",
                        "Verified organization identity, mission, history, and legal status."
                    ]
                ],
                [APPLICATION_QUESTION_CATEGORIES.NEEDS]: [
                    [
                        "community-data",
                        "Authoritative data establishing the need or problem."
                    ],
                    [
                        "organizational-observation",
                        "Documented organizational experience relevant to the need."
                    ]
                ],
                [APPLICATION_QUESTION_CATEGORIES.ALIGNMENT]: [
                    [
                        "executive-alignment-strategy",
                        "Evidence-backed mission intersection and funder alignment."
                    ]
                ],
                [APPLICATION_QUESTION_CATEGORIES.GOALS]: [
                    [
                        "program-plan",
                        "Approved program goals, objectives, milestones, and timeline."
                    ]
                ],
                [APPLICATION_QUESTION_CATEGORIES.METHODS]: [
                    [
                        "work-plan",
                        "Operational plan showing activities, owners, dependencies, and schedule."
                    ]
                ],
                [APPLICATION_QUESTION_CATEGORIES.OUTCOMES]: [
                    [
                        "outcome-model",
                        "Defined outputs, outcomes, indicators, and baselines."
                    ]
                ],
                [APPLICATION_QUESTION_CATEGORIES.EVALUATION]: [
                    [
                        "evaluation-plan",
                        "Measurement methods, indicators, collection schedule, and responsible parties."
                    ]
                ],
                [APPLICATION_QUESTION_CATEGORIES.BUDGET]: [
                    [
                        "approved-budget",
                        "Approved line-item budget and funding assumptions."
                    ]
                ],
                [APPLICATION_QUESTION_CATEGORIES.BUDGET_NARRATIVE]: [
                    [
                        "approved-budget",
                        "Approved line-item budget."
                    ],
                    [
                        "cost-basis",
                        "Source or calculation supporting each material cost."
                    ]
                ],
                [APPLICATION_QUESTION_CATEGORIES.CAPACITY]: [
                    [
                        "organizational-capacity",
                        "Verified staff, governance, systems, experience, and delivery capacity."
                    ]
                ],
                [APPLICATION_QUESTION_CATEGORIES.PARTNERSHIPS]: [
                    [
                        "partner-evidence",
                        "Verified partner role, commitment, and documentation."
                    ]
                ],
                [APPLICATION_QUESTION_CATEGORIES.COMPLIANCE]: [
                    [
                        "compliance-record",
                        "Authoritative legal, policy, certification, or assurance record."
                    ]
                ],
                [APPLICATION_QUESTION_CATEGORIES.SIGNATURE]: [
                    [
                        "authorized-signatory",
                        "Verified authorized signer and explicit approval."
                    ]
                ],
                [APPLICATION_QUESTION_CATEGORIES.ATTACHMENT]: [
                    [
                        "required-document",
                        "The specific attachment requested by the funder."
                    ]
                ]
            };

            (mapping[category] || [
                [
                    "supporting-evidence",
                    "Relevant organizational or authoritative evidence."
                ]
            ]).forEach(item =>
                add(item[0], item[1], true)
            );

            if (
                this.normalizeText(text).includes(
                    "data"
                )
            ) {
                add(
                    "quantitative-data",
                    "Source-backed quantitative data.",
                    true
                );
            }

            return requirements;
        },

        recommendApplicationSources(category) {
            const common = [
                "Organizational Profile",
                "Knowledge Memory",
                "Executive Evidence Integrity"
            ];

            const specialized = {
                [APPLICATION_QUESTION_CATEGORIES.ALIGNMENT]: [
                    "Executive Alignment Strategy"
                ],
                [APPLICATION_QUESTION_CATEGORIES.BUDGET]: [
                    "Finance Office",
                    "Approved Budget"
                ],
                [APPLICATION_QUESTION_CATEGORIES.BUDGET_NARRATIVE]: [
                    "Finance Office",
                    "Approved Budget",
                    "Cost Documentation"
                ],
                [APPLICATION_QUESTION_CATEGORIES.EVALUATION]: [
                    "Executive Planning",
                    "Program Measurement Records"
                ],
                [APPLICATION_QUESTION_CATEGORIES.METHODS]: [
                    "Executive Planning",
                    "Workflow Engine"
                ],
                [APPLICATION_QUESTION_CATEGORIES.COMPLIANCE]: [
                    "Compliance Office",
                    "Authoritative Documents"
                ],
                [APPLICATION_QUESTION_CATEGORIES.ATTACHMENT]: [
                    "Document Ingestion",
                    "Google Drive (later)"
                ],
                [APPLICATION_QUESTION_CATEGORIES.SIGNATURE]: [
                    "Executive Authorization"
                ]
            };

            return this.uniqueStrings([
                ...common,
                ...(specialized[category] || [])
            ]);
        },

        requiresExecutiveInput(text, category) {
            const normalized =
                this.normalizeText(text);

            if (
                [
                    APPLICATION_QUESTION_CATEGORIES.SIGNATURE,
                    APPLICATION_QUESTION_CATEGORIES.COMPLIANCE,
                    APPLICATION_QUESTION_CATEGORIES.BUDGET
                ].includes(category)
            ) {
                return true;
            }

            return [
                "certify",
                "authorized official",
                "board approved",
                "amount requested",
                "matching funds",
                "legal attestation",
                "signature"
            ].some(signal =>
                normalized.includes(signal)
            );
        },

        assessApplicationQuestionRisk(
            text,
            category,
            executiveInputRequired
        ) {
            if (
                [
                    APPLICATION_QUESTION_CATEGORIES.SIGNATURE,
                    APPLICATION_QUESTION_CATEGORIES.COMPLIANCE
                ].includes(category)
            ) {
                return "critical";
            }

            if (
                executiveInputRequired ||
                [
                    APPLICATION_QUESTION_CATEGORIES.BUDGET,
                    APPLICATION_QUESTION_CATEGORIES.BUDGET_NARRATIVE,
                    APPLICATION_QUESTION_CATEGORIES.EVALUATION
                ].includes(category)
            ) {
                return "high";
            }

            if (
                [
                    APPLICATION_QUESTION_CATEGORIES.NEEDS,
                    APPLICATION_QUESTION_CATEGORIES.OUTCOMES,
                    APPLICATION_QUESTION_CATEGORIES.ALIGNMENT
                ].includes(category)
            ) {
                return "medium";
            }

            return "standard";
        },

        analyzeFundingApplication(
            opportunityId,
            input = {}
        ) {
            const opportunity =
                this.getOpportunityById(opportunityId);

            if (!opportunity) {
                return {
                    success: false,
                    error: "Opportunity not found.",
                    code:
                        "GRANT_APPLICATION_OPPORTUNITY_NOT_FOUND"
                };
            }

            const sections =
                this.normalizeApplicationSections(
                    input
                );

            const questions =
                sections.flatMap(
                    section => section.questions
                );

            if (questions.length === 0) {
                return {
                    success: false,
                    error:
                        "Application intelligence requires at least one question.",
                    code:
                        "GRANT_APPLICATION_QUESTIONS_REQUIRED"
                };
            }

            const attachments =
                this.normalizeAlignmentCollection(
                    input.attachments ||
                    input.requiredAttachments
                ).map((name, index) => ({
                    id:
                        `attachment-${index + 1}`,
                    name,
                    required: true,
                    documentId: null,
                    status: "missing"
                }));

            const certifications =
                this.normalizeAlignmentCollection(
                    input.certifications
                ).map((name, index) => ({
                    id:
                        `certification-${index + 1}`,
                    name,
                    required: true,
                    status:
                        "executive-review-required"
                }));

            const signatures =
                this.normalizeAlignmentCollection(
                    input.signatures
                ).map((name, index) => ({
                    id:
                        `signature-${index + 1}`,
                    name,
                    required: true,
                    authorizedBy: null,
                    signedAt: null,
                    status:
                        "executive-approval-required"
                }));

            const application = {
                schema:
                    "meos.grant-office.application-intelligence.v1",
                version:
                    this.version,
                buildId:
                    this.buildId,
                id:
                    input.id ||
                    this.createId(
                        "funding-application"
                    ),
                opportunityId:
                    opportunity.id,
                title:
                    String(
                        input.title ||
                        `${opportunity.title} Application`
                    ),
                sourceType:
                    input.sourceType ||
                    "structured-input",
                sourceUrl:
                    input.sourceUrl ||
                    opportunity.sourceUrl ||
                    "",
                acquiredAt:
                    input.acquiredAt ||
                    this.now(),
                analyzedAt:
                    this.now(),
                deadline:
                    input.deadline ||
                    opportunity.deadline ||
                    null,
                submissionMethod:
                    input.submissionMethod ||
                    "unknown",
                instructions:
                    String(
                        input.instructions || ""
                    ),
                sections,
                questions,
                attachments,
                certifications,
                signatures,
                reviewState:
                    APPLICATION_REVIEW_STATES.ANALYZING,
                executiveStrategy:
                    null,
                readiness: null,
                history: [
                    {
                        state:
                            APPLICATION_REVIEW_STATES.ANALYZING,
                        enteredAt:
                            this.now(),
                        actor:
                            "MEOS Grant Office",
                        note:
                            "Funding application analyzed and structured."
                    }
                ]
            };

            application.executiveStrategy =
                this.buildApplicationExecutiveStrategy(
                    opportunity,
                    application
                );

            application.readiness =
                this.calculateApplicationReadiness(
                    application
                );

            opportunity.applicationIntelligence =
                application;
            opportunity.updatedAt =
                this.now();

            this.analytics.applicationsAnalyzed += 1;
            this.analytics.applicationQuestionsExtracted +=
                questions.length;
            this.analytics.lastApplicationIntelligenceAt =
                application.analyzedAt;

            this.persistIfEnabled();

            return {
                success: true,
                application:
                    this.clone(application),
                opportunity:
                    this.clone(opportunity)
            };
        },

        buildApplicationExecutiveStrategy(
            opportunity,
            application
        ) {
            const alignment =
                opportunity.alignmentStrategy ||
                null;

            const byCategory =
                application.questions.reduce(
                    (counts, question) => {
                        counts[question.category] =
                            (
                                counts[
                                    question.category
                                ] || 0
                            ) + 1;
                        return counts;
                    },
                    {}
                );

            const executiveInputQuestions =
                application.questions.filter(
                    question =>
                        question.executiveInputRequired
                );

            const criticalQuestions =
                application.questions.filter(
                    question =>
                        question.risk === "critical"
                );

            return {
                schema:
                    "meos.grant-office.application-executive-strategy.v1",
                createdAt:
                    this.now(),
                opportunityId:
                    opportunity.id,
                applicationId:
                    application.id,
                questionCount:
                    application.questions.length,
                categoryCounts:
                    byCategory,
                executiveInputQuestionIds:
                    executiveInputQuestions.map(
                        question => question.id
                    ),
                criticalQuestionIds:
                    criticalQuestions.map(
                        question => question.id
                    ),
                alignmentStatus:
                    alignment?.status ||
                    "not-built",
                alignmentScore:
                    alignment?.overallScore ??
                    null,
                writingRules: [
                    "Answer the actual reviewer intent, not merely the visible wording.",
                    "Use verified organizational and authoritative evidence for material factual claims.",
                    "State indirect outcomes as contributions, not guaranteed impacts.",
                    "Do not invent metrics, partnerships, budgets, approvals, or outcomes.",
                    "Mark unresolved executive facts as Executive Input Required.",
                    "Keep every answer within the funder's stated limits."
                ],
                recommendation:
                    alignment?.status === "strong"
                        ? "Proceed with evidence-backed drafting."
                        : alignment
                        ? "Draft only after resolving alignment and evidence gaps."
                        : "Build Executive Alignment Strategy before final drafting."
            };
        },

        resolveApplicationEvidence(
            question,
            evidence = []
        ) {
            const normalized =
                this.normalizeAlignmentEvidence(
                    evidence
                );

            const relevant =
                normalized
                    .map(item => ({
                        ...item,
                        relevance:
                            this.scoreConceptOverlap(
                                item.statement,
                                [
                                    question.text,
                                    question.intent,
                                    ...question
                                        .evidenceRequirements
                                        .map(
                                            requirement =>
                                                requirement
                                                    .description
                                        )
                                ].join(" ")
                            )
                    }))
                    .filter(
                        item =>
                            item.relevance > 0
                    )
                    .sort(
                        (left, right) =>
                            right.relevance -
                            left.relevance
                    );

            return relevant;
        },

        draftApplicationQuestion(
            opportunityId,
            questionId,
            input = {}
        ) {
            const opportunity =
                this.getOpportunityById(opportunityId);
            const application =
                opportunity?.applicationIntelligence;

            if (!opportunity || !application) {
                return {
                    success: false,
                    error:
                        "Application intelligence has not been created.",
                    code:
                        "GRANT_APPLICATION_NOT_ANALYZED"
                };
            }

            const question =
                application.questions.find(
                    item => item.id === questionId
                );

            if (!question) {
                return {
                    success: false,
                    error:
                        "Application question not found.",
                    code:
                        "GRANT_APPLICATION_QUESTION_NOT_FOUND"
                };
            }

            const evidence =
                this.resolveApplicationEvidence(
                    question,
                    [
                        ...(input.evidence || []),
                        ...(
                            opportunity.alignmentStrategy
                                ?.claims || []
                        )
                            .filter(
                                claim =>
                                    claim.supported
                            )
                            .map(
                                claim => ({
                                    id:
                                        `alignment-${claim.activity}-${claim.objective}`,
                                    statement:
                                        claim.claim,
                                    authority:
                                        "verified",
                                    verified: true,
                                    confidence:
                                        claim.confidence,
                                    citation:
                                        claim.evidenceIds
                                })
                            )
                    ]
                );

            const verifiedEvidence =
                evidence.filter(
                    item => item.verified
                );

            const suppliedAnswer =
                String(
                    input.answer ||
                    input.draft ||
                    ""
                ).trim();

            const needsExecutiveInput =
                question.executiveInputRequired &&
                !suppliedAnswer;

            const unsupported =
                verifiedEvidence.length === 0 &&
                !suppliedAnswer;

            let status =
                APPLICATION_ITEM_STATES.DRAFTED;
            let draftText =
                suppliedAnswer;

            if (needsExecutiveInput) {
                status =
                    APPLICATION_ITEM_STATES.EXECUTIVE_INPUT_REQUIRED;
                draftText =
                    "Executive Input Required";
            } else if (unsupported) {
                status =
                    APPLICATION_ITEM_STATES.NEEDS_EVIDENCE;
                draftText =
                    "Evidence Required Before Drafting";
            } else if (!draftText) {
                const bestEvidence =
                    verifiedEvidence
                        .slice(0, 3)
                        .map(
                            item => item.statement
                        );

                draftText = [
                    this.buildApplicationDraftOpening(
                        question
                    ),
                    ...bestEvidence,
                    this.buildApplicationDraftClosing(
                        question
                    )
                ]
                    .filter(Boolean)
                    .join(" ");
            }

            const limitCheck =
                this.checkApplicationDraftLimits(
                    draftText,
                    question.limits
                );

            if (!limitCheck.withinLimits) {
                status =
                    APPLICATION_ITEM_STATES.NEEDS_REVISION;
            }

            question.draft = {
                schema:
                    "meos.grant-office.application-draft.v1",
                createdAt:
                    this.now(),
                createdBy:
                    input.createdBy ||
                    "MEOS Grant Office",
                text:
                    draftText,
                status,
                evidenceIds:
                    evidence.map(
                        item => item.id
                    ),
                verifiedEvidenceIds:
                    verifiedEvidence.map(
                        item => item.id
                    ),
                confidence:
                    status ===
                    APPLICATION_ITEM_STATES.DRAFTED
                        ? this.roundNumber(
                            Math.min(
                                1,
                                0.55 +
                                verifiedEvidence.length *
                                0.12
                            ),
                            3
                        )
                        : 0,
                missingInformation:
                    this.identifyApplicationMissingInformation(
                        question,
                        verifiedEvidence,
                        suppliedAnswer
                    ),
                limitCheck,
                executiveNotes:
                    String(
                        input.executiveNotes ||
                        ""
                    )
            };

            question.state =
                status;
            question.review.status =
                status;
            application.reviewState =
                APPLICATION_REVIEW_STATES.DRAFTING;
            application.readiness =
                this.calculateApplicationReadiness(
                    application
                );

            this.analytics.applicationDraftsCreated += 1;
            this.persistIfEnabled();

            return {
                success: true,
                question:
                    this.clone(question),
                draft:
                    this.clone(question.draft),
                readiness:
                    this.clone(
                        application.readiness
                    )
            };
        },

        buildApplicationDraftOpening(question) {
            const openings = {
                [APPLICATION_QUESTION_CATEGORIES.NEEDS]:
                    "The proposed work responds to a documented community need.",
                [APPLICATION_QUESTION_CATEGORIES.ALIGNMENT]:
                    "The proposed work advances the funder's objective through a verified mission intersection.",
                [APPLICATION_QUESTION_CATEGORIES.PROGRAM]:
                    "The organization proposes a focused, evidence-informed program response.",
                [APPLICATION_QUESTION_CATEGORIES.OUTCOMES]:
                    "The project is designed to produce measurable outputs and outcomes.",
                [APPLICATION_QUESTION_CATEGORIES.EVALUATION]:
                    "Performance will be measured through defined indicators and documented review.",
                [APPLICATION_QUESTION_CATEGORIES.CAPACITY]:
                    "The organization will rely on its verified mission, leadership, operational systems, and relevant experience.",
                [APPLICATION_QUESTION_CATEGORIES.SUSTAINABILITY]:
                    "The sustainability strategy combines diversified resources, operational integration, and continued partnership development."
            };

            return (
                openings[question.category] ||
                "The organization provides the following evidence-supported response."
            );
        },

        buildApplicationDraftClosing(question) {
            if (
                question.category ===
                APPLICATION_QUESTION_CATEGORIES.ALIGNMENT
            ) {
                return "The application should avoid claiming direct outcomes beyond the organization's documented work and evidence.";
            }

            if (
                question.category ===
                APPLICATION_QUESTION_CATEGORIES.EVALUATION
            ) {
                return "Final measures, baselines, targets, and reporting responsibilities require executive approval before submission.";
            }

            return "All final facts, figures, commitments, and representations remain subject to executive review and approval.";
        },

        identifyApplicationMissingInformation(
            question,
            evidence,
            suppliedAnswer
        ) {
            const missing = [];

            if (
                question.executiveInputRequired &&
                !suppliedAnswer
            ) {
                missing.push(
                    "Executive decision or authorized factual input."
                );
            }

            if (evidence.length === 0) {
                missing.push(
                    "Verified evidence supporting the response."
                );
            }

            question.evidenceRequirements.forEach(
                requirement => {
                    const matched =
                        evidence.some(item =>
                            this.scoreConceptOverlap(
                                item.statement,
                                requirement.description
                            ) > 0
                        );

                    if (
                        requirement.required &&
                        !matched
                    ) {
                        missing.push(
                            requirement.description
                        );
                    }
                }
            );

            return this.uniqueStrings(missing);
        },

        checkApplicationDraftLimits(
            text,
            limits = {}
        ) {
            const wordCount =
                String(text || "")
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .length;
            const characterCount =
                String(text || "").length;

            const issues = [];

            if (
                limits.words &&
                wordCount > limits.words
            ) {
                issues.push(
                    `Draft exceeds the ${limits.words}-word limit.`
                );
            }

            if (
                limits.characters &&
                characterCount >
                    limits.characters
            ) {
                issues.push(
                    `Draft exceeds the ${limits.characters}-character limit.`
                );
            }

            return {
                withinLimits:
                    issues.length === 0,
                wordCount,
                characterCount,
                limits:
                    this.clone(limits),
                issues
            };
        },

        buildApplicationDraftVariantText(
            question,
            verifiedEvidence = [],
            strategy = "evidence-first"
        ) {
            const statements = verifiedEvidence
                .slice(0, 5)
                .map(item => String(item.statement || "").trim())
                .filter(Boolean);

            const opening = this.buildApplicationDraftOpening(question);
            const closing = this.buildApplicationDraftClosing(question);
            const impactBridge =
                "The response should connect the verified need, the proposed work, and the measurable public benefit without overstating what the evidence proves.";
            const investmentBridge =
                "The request should show the funder how its investment enables a practical, accountable response and how results will be documented.";
            const reviewerBridge =
                `This response directly addresses the reviewer intent: ${question.intent || question.text}`;

            const structures = {
                "evidence-first": [opening, ...statements, reviewerBridge, closing],
                "human-impact": [opening, impactBridge, ...statements, closing],
                "investment-case": [opening, investmentBridge, ...statements, reviewerBridge, closing]
            };

            return (structures[strategy] || structures["evidence-first"])
                .filter(Boolean)
                .join(" ")
                .replace(/\s+/g, " ")
                .trim();
        },

        scoreApplicationDraftCandidate(
            question,
            text,
            verifiedEvidence = []
        ) {
            const limitCheck = this.checkApplicationDraftLimits(
                text,
                question.limits
            );
            const missingInformation =
                this.identifyApplicationMissingInformation(
                    question,
                    verifiedEvidence,
                    String(text || "").trim()
                );

            const normalizedText = this.normalizeText(text);
            const normalizedPrompt = this.normalizeText(
                `${question.text} ${question.intent || ""} ${question.instructions || ""}`
            );
            const promptTerms = this.uniqueStrings(
                normalizedPrompt.split(" ").filter(term => term.length >= 5)
            );
            const matchedPromptTerms = promptTerms.filter(term =>
                normalizedText.includes(term)
            );
            const responsivenessRatio = promptTerms.length
                ? matchedPromptTerms.length / promptTerms.length
                : 1;

            const requiredEvidence = question.evidenceRequirements || [];
            const coveredEvidence = requiredEvidence.filter(requirement =>
                verifiedEvidence.some(item =>
                    this.scoreConceptOverlap(
                        item.statement,
                        requirement.description
                    ) > 0
                )
            );
            const evidenceCoverage = requiredEvidence.length
                ? coveredEvidence.length / requiredEvidence.length
                : verifiedEvidence.length > 0 ? 1 : 0;

            const sentences = String(text || "")
                .split(/[.!?]+/)
                .map(item => item.trim())
                .filter(Boolean);
            const words = String(text || "")
                .trim()
                .split(/\s+/)
                .filter(Boolean);
            const averageSentenceLength = sentences.length
                ? words.length / sentences.length
                : words.length;

            const compliance =
                (limitCheck.withinLimits ? 15 : 0) +
                (String(text || "").trim() ? 5 : 0) +
                (missingInformation.length === 0 ? 5 : 0);
            const evidence = Math.round(
                Math.min(20, evidenceCoverage * 14 + Math.min(6, verifiedEvidence.length * 2))
            );
            const responsiveness = Math.round(
                Math.min(20, 8 + responsivenessRatio * 12)
            );
            const specificity = Math.round(
                Math.min(
                    10,
                    verifiedEvidence.length * 2 +
                    (/\b\d+[\d,.%$]*\b/.test(text) ? 2 : 0)
                )
            );
            const persuasionSignals = [
                "need", "impact", "community", "investment", "outcome",
                "measurable", "accountable", "urgent", "benefit", "solution"
            ].filter(term => normalizedText.includes(term)).length;
            const persuasion = Math.min(15, 5 + persuasionSignals);
            const clarity =
                averageSentenceLength > 0 && averageSentenceLength <= 28
                    ? 10
                    : averageSentenceLength <= 36
                        ? 7
                        : 4;

            const total = Math.max(
                0,
                Math.min(
                    100,
                    compliance + evidence + responsiveness + specificity + persuasion + clarity
                )
            );

            const improvementActions = [];
            if (!limitCheck.withinLimits) {
                improvementActions.push(...limitCheck.issues);
            }
            if (missingInformation.length) {
                improvementActions.push(
                    ...missingInformation.map(item => `Resolve: ${item}`)
                );
            }
            if (evidenceCoverage < 1) {
                improvementActions.push(
                    "Add verified evidence for every required evidence category."
                );
            }
            if (responsivenessRatio < 0.55) {
                improvementActions.push(
                    "Answer the reviewer intent more directly using the funder's own terms."
                );
            }
            if (persuasion < 11) {
                improvementActions.push(
                    "Strengthen the truthful connection between need, solution, investment, and measurable benefit."
                );
            }
            if (clarity < 10) {
                improvementActions.push(
                    "Shorten long sentences and reduce reviewer effort."
                );
            }

            return {
                schema: "meos.grant-office.application-candidate-score.v1",
                total,
                compliancePassed:
                    limitCheck.withinLimits &&
                    missingInformation.length === 0,
                dimensions: {
                    compliance,
                    evidence,
                    responsiveness,
                    specificity,
                    persuasion,
                    clarity
                },
                evidenceCoverage: this.roundNumber(evidenceCoverage, 3),
                responsivenessRatio: this.roundNumber(responsivenessRatio, 3),
                limitCheck,
                missingInformation,
                improvementActions: this.uniqueStrings(improvementActions),
                disposition:
                    limitCheck.withinLimits && missingInformation.length === 0
                        ? "ready-for-executive-review"
                        : "improve-before-deadline"
            };
        },

        generateApplicationDraftVersions(
            opportunityId,
            questionId,
            input = {}
        ) {
            const opportunity = this.getOpportunityById(opportunityId);
            const application = opportunity?.applicationIntelligence;
            const question = application?.questions.find(
                item => item.id === questionId
            );

            if (!opportunity || !application || !question) {
                return {
                    success: false,
                    error: "Application question not found or application intelligence is unavailable.",
                    code: "GRANT_APPLICATION_VERSIONING_NOT_AVAILABLE"
                };
            }

            const evidence = this.resolveApplicationEvidence(
                question,
                [
                    ...(input.evidence || []),
                    ...(opportunity.alignmentStrategy?.claims || [])
                        .filter(claim => claim.supported)
                        .map(claim => ({
                            id: `alignment-${claim.activity}-${claim.objective}`,
                            statement: claim.claim,
                            authority: "verified",
                            verified: true,
                            confidence: claim.confidence,
                            citation: claim.evidenceIds
                        }))
                ]
            );
            const verifiedEvidence = evidence.filter(item => item.verified);

            const suppliedVersions = Array.isArray(input.versions)
                ? input.versions
                : [];
            const strategies = [
                "evidence-first",
                "human-impact",
                "investment-case"
            ];

            const versions = (suppliedVersions.length
                ? suppliedVersions.map((item, index) => ({
                    strategy: item.strategy || `supplied-${index + 1}`,
                    text: String(item.text || item.draft || "").trim()
                }))
                : strategies.map(strategy => ({
                    strategy,
                    text: this.buildApplicationDraftVariantText(
                        question,
                        verifiedEvidence,
                        strategy
                    )
                })))
                .filter(item => item.text)
                .map((item, index) => {
                    const score = this.scoreApplicationDraftCandidate(
                        question,
                        item.text,
                        verifiedEvidence
                    );
                    return {
                        id: this.createId("application-draft-version"),
                        versionNumber: index + 1,
                        strategy: item.strategy,
                        createdAt: this.now(),
                        text: item.text,
                        evidenceIds: evidence.map(record => record.id),
                        verifiedEvidenceIds: verifiedEvidence.map(record => record.id),
                        score,
                        status: score.disposition
                    };
                })
                .sort((left, right) => right.score.total - left.score.total);

            if (!versions.length) {
                return {
                    success: false,
                    error: "No truthful draft version could be produced from the available input and evidence.",
                    code: "GRANT_APPLICATION_VERSIONS_EMPTY"
                };
            }

            const winner = versions[0];
            const runnerUp = versions[1] || null;
            const maximumCycles = Math.max(1, Math.min(20, Number(input.maximumCycles || 8)));
            const optimization = {
                schema: "meos.grant-office.application-draft-optimization.v1",
                createdAt: this.now(),
                objective:
                    "Maximize funding probability before the deadline while preserving 100% administrative compliance and evidence integrity.",
                maximumCycles,
                completedCycles: 1,
                selectedVersionId: winner.id,
                selectedStrategy: winner.strategy,
                selectedScore: winner.score.total,
                runnerUpVersionId: runnerUp?.id || null,
                runnerUpScore: runnerUp?.score.total ?? null,
                decision:
                    winner.score.compliancePassed
                        ? "best-current-version-ready-for-executive-review"
                        : "best-current-version-selected-for-further-improvement",
                discardedVersionIds: [],
                preservedVersionIds: versions.map(version => version.id),
                nextImprovements: winner.score.improvementActions,
                stopReason:
                    winner.score.compliancePassed && winner.score.total >= 98
                        ? "Target quality reached without unresolved compliance defects."
                        : "Continue improving until the deadline, target quality, or diminishing returns."
            };

            question.draftPortfolio = {
                schema: "meos.grant-office.application-draft-portfolio.v1",
                createdAt: this.now(),
                versions,
                optimization
            };

            question.draft = {
                schema: "meos.grant-office.application-draft.v2",
                createdAt: this.now(),
                createdBy: input.createdBy || "MEOS Grant Office",
                selectedFromVersionId: winner.id,
                strategy: winner.strategy,
                text: winner.text,
                status:
                    winner.score.compliancePassed
                        ? APPLICATION_ITEM_STATES.DRAFTED
                        : winner.score.missingInformation.length
                            ? APPLICATION_ITEM_STATES.NEEDS_EVIDENCE
                            : APPLICATION_ITEM_STATES.NEEDS_REVISION,
                evidenceIds: winner.evidenceIds,
                verifiedEvidenceIds: winner.verifiedEvidenceIds,
                confidence: this.roundNumber(winner.score.total / 100, 3),
                qualityScore: winner.score,
                missingInformation: winner.score.missingInformation,
                limitCheck: winner.score.limitCheck,
                executiveNotes: String(input.executiveNotes || "")
            };

            question.state = question.draft.status;
            question.review.status = question.draft.status;
            application.reviewState = APPLICATION_REVIEW_STATES.DRAFTING;
            application.readiness = this.calculateApplicationReadiness(application);

            this.analytics.applicationDraftsCreated += 1;
            this.analytics.applicationDraftVariantsCreated += versions.length;
            this.analytics.applicationDraftOptimizationRuns += 1;
            this.analytics.applicationDraftWinningVersionsSelected += 1;
            this.persistIfEnabled();

            return {
                success: true,
                opportunityId,
                applicationId: application.id,
                questionId,
                versions: this.clone(versions),
                selectedVersion: this.clone(winner),
                optimization: this.clone(optimization),
                readiness: this.clone(application.readiness)
            };
        },

        reviewApplicationQuestion(
            opportunityId,
            questionId,
            review = {}
        ) {
            const opportunity =
                this.getOpportunityById(opportunityId);
            const application =
                opportunity?.applicationIntelligence;
            const question =
                application?.questions.find(
                    item => item.id === questionId
                );

            if (!question) {
                return {
                    success: false,
                    error:
                        "Application question not found."
                };
            }

            const action =
                String(
                    review.action || ""
                )
                    .trim()
                    .toLowerCase();

            if (
                ![
                    "approve",
                    "revise",
                    "reject"
                ].includes(action)
            ) {
                return {
                    success: false,
                    error:
                        "Review action must be approve, revise, or reject."
                };
            }

            if (
                action === "approve" &&
                (
                    !question.draft ||
                    question.draft
                        .missingInformation
                        .length > 0 ||
                    question.draft
                        .limitCheck
                        .withinLimits !== true
                )
            ) {
                return {
                    success: false,
                    error:
                        "Question cannot be approved while evidence, information, or limit issues remain.",
                    code:
                        "GRANT_APPLICATION_QUESTION_NOT_READY"
                };
            }

            if (action === "approve") {
                question.state =
                    APPLICATION_ITEM_STATES.APPROVED;
                question.review.status =
                    APPLICATION_ITEM_STATES.APPROVED;
                question.review.approvedBy =
                    review.reviewedBy ||
                    "Executive Director";
                question.review.approvedAt =
                    this.now();
            } else {
                question.state =
                    APPLICATION_ITEM_STATES.NEEDS_REVISION;
                question.review.status =
                    APPLICATION_ITEM_STATES.NEEDS_REVISION;
                question.review.revisionNotes =
                    String(
                        review.notes || ""
                    );
            }

            question.review.executiveNotes =
                String(
                    review.executiveNotes ||
                    question.review
                        .executiveNotes ||
                    ""
                );

            application.readiness =
                this.calculateApplicationReadiness(
                    application
                );
            this.persistIfEnabled();

            return {
                success: true,
                question:
                    this.clone(question),
                readiness:
                    this.clone(
                        application.readiness
                    )
            };
        },

        calculateApplicationReadiness(application) {
            const questions =
                application.questions || [];
            const requiredQuestions =
                questions.filter(
                    question =>
                        question.required !== false
                );
            const approvedQuestions =
                requiredQuestions.filter(
                    question =>
                        question.state ===
                        APPLICATION_ITEM_STATES.APPROVED
                );
            const blockedQuestions =
                requiredQuestions.filter(
                    question =>
                        [
                            APPLICATION_ITEM_STATES.UNANSWERED,
                            APPLICATION_ITEM_STATES.EXECUTIVE_INPUT_REQUIRED,
                            APPLICATION_ITEM_STATES.NEEDS_EVIDENCE,
                            APPLICATION_ITEM_STATES.NEEDS_REVISION
                        ].includes(
                            question.state
                        )
                );
            const missingAttachments =
                (
                    application.attachments || []
                ).filter(
                    item =>
                        item.required &&
                        item.status !== "attached"
                );
            const unresolvedCertifications =
                (
                    application.certifications || []
                ).filter(
                    item =>
                        item.required &&
                        item.status !== "approved"
                );
            const unsigned =
                (
                    application.signatures || []
                ).filter(
                    item =>
                        item.required &&
                        item.status !== "signed"
                );

            const totalRequired =
                requiredQuestions.length +
                (application.attachments || []).filter(
                    item => item.required
                ).length +
                (application.certifications || []).filter(
                    item => item.required
                ).length +
                (application.signatures || []).filter(
                    item => item.required
                ).length;

            const complete =
                approvedQuestions.length +
                (application.attachments || []).filter(
                    item =>
                        item.required &&
                        item.status === "attached"
                ).length +
                (application.certifications || []).filter(
                    item =>
                        item.required &&
                        item.status === "approved"
                ).length +
                (application.signatures || []).filter(
                    item =>
                        item.required &&
                        item.status === "signed"
                ).length;

            return {
                ready:
                    totalRequired > 0 &&
                    complete === totalRequired,
                percent:
                    totalRequired > 0
                        ? Math.round(
                            complete /
                            totalRequired *
                            100
                        )
                        : 0,
                required:
                    totalRequired,
                complete,
                approvedQuestions:
                    approvedQuestions.length,
                blockedQuestionIds:
                    blockedQuestions.map(
                        question => question.id
                    ),
                missingAttachmentIds:
                    missingAttachments.map(
                        item => item.id
                    ),
                unresolvedCertificationIds:
                    unresolvedCertifications.map(
                        item => item.id
                    ),
                unsignedSignatureIds:
                    unsigned.map(
                        item => item.id
                    )
            };
        },

        createExecutiveApplicationReviewPackage(
            opportunityId
        ) {
            const opportunity =
                this.getOpportunityById(opportunityId);
            const application =
                opportunity?.applicationIntelligence;

            if (!application) {
                return {
                    success: false,
                    error:
                        "Application intelligence has not been created."
                };
            }

            application.readiness =
                this.calculateApplicationReadiness(
                    application
                );
            application.reviewState =
                APPLICATION_REVIEW_STATES.EXECUTIVE_REVIEW;

            const packageRecord = {
                schema:
                    "meos.grant-office.executive-application-review.v1",
                version:
                    this.version,
                buildId:
                    this.buildId,
                id:
                    this.createId(
                        "executive-application-review"
                    ),
                createdAt:
                    this.now(),
                opportunityId:
                    opportunity.id,
                applicationId:
                    application.id,
                title:
                    application.title,
                executiveSummary: {
                    questionCount:
                        application.questions.length,
                    drafted:
                        application.questions.filter(
                            question =>
                                Boolean(
                                    question.draft
                                )
                        ).length,
                    approved:
                        application.questions.filter(
                            question =>
                                question.state ===
                                APPLICATION_ITEM_STATES.APPROVED
                        ).length,
                    executiveInputRequired:
                        application.questions.filter(
                            question =>
                                question.state ===
                                APPLICATION_ITEM_STATES.EXECUTIVE_INPUT_REQUIRED
                        ).length,
                    needsEvidence:
                        application.questions.filter(
                            question =>
                                question.state ===
                                APPLICATION_ITEM_STATES.NEEDS_EVIDENCE
                        ).length,
                    needsRevision:
                        application.questions.filter(
                            question =>
                                question.state ===
                                APPLICATION_ITEM_STATES.NEEDS_REVISION
                        ).length,
                    readiness:
                        this.clone(
                            application.readiness
                        )
                },
                sections:
                    application.sections.map(
                        section => ({
                            id:
                                section.id,
                            title:
                                section.title,
                            questions:
                                section.questions.map(
                                    question =>
                                        this.clone(
                                            question
                                        )
                                )
                        })
                    ),
                outstandingIssues:
                    this.buildApplicationOutstandingIssues(
                        application
                    ),
                approval: {
                    status:
                        "pending-executive-review",
                    approvedBy: null,
                    approvedAt: null,
                    notes: ""
                }
            };

            opportunity.executiveReviewPackage =
                packageRecord;
            opportunity.updatedAt =
                this.now();

            this.analytics.executiveReviewPackagesCreated += 1;
            this.persistIfEnabled();

            return {
                success: true,
                reviewPackage:
                    this.clone(packageRecord)
            };
        },

        buildApplicationOutstandingIssues(application) {
            const issues = [];

            application.questions.forEach(
                question => {
                    if (
                        question.state !==
                        APPLICATION_ITEM_STATES.APPROVED
                    ) {
                        issues.push({
                            type:
                                "question",
                            id:
                                question.id,
                            severity:
                                question.risk,
                            message:
                                `${question.sectionTitle}: ${question.text}`,
                            state:
                                question.state
                        });
                    }
                }
            );

            application.readiness
                .missingAttachmentIds
                .forEach(id =>
                    issues.push({
                        type:
                            "attachment",
                        id,
                        severity:
                            "high",
                        message:
                            "Required attachment is missing."
                    })
                );

            application.readiness
                .unresolvedCertificationIds
                .forEach(id =>
                    issues.push({
                        type:
                            "certification",
                        id,
                        severity:
                            "critical",
                        message:
                            "Required certification has not been approved."
                    })
                );

            application.readiness
                .unsignedSignatureIds
                .forEach(id =>
                    issues.push({
                        type:
                            "signature",
                        id,
                        severity:
                            "critical",
                        message:
                            "Required signature is missing."
                    })
                );

            return issues;
        },

        approveExecutiveApplicationReview(
            opportunityId,
            approval = {}
        ) {
            const opportunity =
                this.getOpportunityById(opportunityId);
            const application =
                opportunity?.applicationIntelligence;
            const reviewPackage =
                opportunity?.executiveReviewPackage;

            if (!application || !reviewPackage) {
                return {
                    success: false,
                    error:
                        "Executive review package does not exist."
                };
            }

            application.readiness =
                this.calculateApplicationReadiness(
                    application
                );

            if (!application.readiness.ready) {
                this.analytics.submissionBlocksTriggered += 1;
                return {
                    success: false,
                    error:
                        "Application is not ready for executive approval.",
                    code:
                        "GRANT_APPLICATION_NOT_READY",
                    readiness:
                        this.clone(
                            application.readiness
                        ),
                    outstandingIssues:
                        this.buildApplicationOutstandingIssues(
                            application
                        )
                };
            }

            if (
                !String(
                    approval.approvedBy || ""
                ).trim()
            ) {
                return {
                    success: false,
                    error:
                        "Executive approval requires approvedBy."
                };
            }

            reviewPackage.approval = {
                status:
                    "approved",
                approvedBy:
                    String(
                        approval.approvedBy
                    ),
                approvedAt:
                    approval.approvedAt ||
                    this.now(),
                notes:
                    String(
                        approval.notes || ""
                    )
            };

            application.reviewState =
                APPLICATION_REVIEW_STATES.APPROVED;

            application.history.push({
                state:
                    APPLICATION_REVIEW_STATES.APPROVED,
                enteredAt:
                    reviewPackage.approval.approvedAt,
                actor:
                    reviewPackage.approval.approvedBy,
                note:
                    "Executive application review approved."
            });

            this.persistIfEnabled();

            return {
                success: true,
                reviewPackage:
                    this.clone(reviewPackage),
                application:
                    this.clone(application)
            };
        },

        markApplicationReadyToSubmit(
            opportunityId,
            details = {}
        ) {
            const opportunity =
                this.getOpportunityById(opportunityId);
            const application =
                opportunity?.applicationIntelligence;
            const reviewPackage =
                opportunity?.executiveReviewPackage;

            if (!application || !reviewPackage) {
                return {
                    success: false,
                    error:
                        "Application review has not been completed."
                };
            }

            application.readiness =
                this.calculateApplicationReadiness(
                    application
                );

            if (
                reviewPackage.approval.status !== "approved" ||
                !application.readiness.ready
            ) {
                this.analytics.submissionBlocksTriggered += 1;
                return {
                    success: false,
                    error:
                        "Submission readiness is blocked until every requirement is complete and executive review is approved.",
                    code:
                        "GRANT_APPLICATION_SUBMISSION_BLOCKED",
                    readiness:
                        this.clone(
                            application.readiness
                        ),
                    approval:
                        this.clone(
                            reviewPackage.approval
                        )
                };
            }

            application.reviewState =
                APPLICATION_REVIEW_STATES.READY_TO_SUBMIT;
            application.history.push({
                state:
                    APPLICATION_REVIEW_STATES.READY_TO_SUBMIT,
                enteredAt:
                    this.now(),
                actor:
                    details.actor ||
                    "MEOS Grant Office",
                note:
                    details.note ||
                    "Application package is ready for authorized submission."
            });

            this.persistIfEnabled();

            return {
                success: true,
                readyToSubmit: true,
                application:
                    this.clone(application)
            };
        },

        normalizeAssemblyDocumentRecord(
            document,
            defaults = {}
        ) {
            const raw =
                typeof document === "string"
                    ? {
                        name: document
                    }
                    : {
                        ...(document || {})
                    };

            const required =
                raw.required !== false &&
                defaults.required !== false;

            const status =
                raw.status ||
                (
                    raw.documentId ||
                    raw.fileId ||
                    raw.url
                        ? "available"
                        : "missing"
                );

            return {
                id:
                    raw.id ||
                    defaults.id ||
                    this.createId(
                        "application-document"
                    ),
                type:
                    raw.type ||
                    defaults.type ||
                    APPLICATION_PACKAGE_ITEM_TYPES.ATTACHMENT,
                name:
                    String(
                        raw.name ||
                        raw.title ||
                        defaults.name ||
                        "Unnamed Document"
                    ).trim(),
                description:
                    String(
                        raw.description ||
                        defaults.description ||
                        ""
                    ).trim(),
                required,
                status,
                documentId:
                    raw.documentId ||
                    raw.fileId ||
                    null,
                source:
                    raw.source ||
                    defaults.source ||
                    null,
                version:
                    raw.version ||
                    null,
                verified:
                    raw.verified === true,
                current:
                    raw.current !== false,
                attached:
                    raw.attached === true ||
                    status === "attached",
                attachedAt:
                    raw.attachedAt ||
                    null,
                attachedBy:
                    raw.attachedBy ||
                    null,
                issues:
                    this.uniqueStrings(
                        raw.issues || []
                    )
            };
        },

        buildApplicationNarrativeSections(
            application
        ) {
            return (
                application.sections || []
            ).map(section => {
                const questions =
                    section.questions || [];

                const responses =
                    questions.map(question => ({
                        questionId:
                            question.id,
                        question:
                            question.text,
                        category:
                            question.category,
                        intent:
                            question.intent,
                        response:
                            question.draft?.text ||
                            "",
                        state:
                            question.state,
                        evidenceIds:
                            question.draft
                                ?.evidenceIds || [],
                        verifiedEvidenceIds:
                            question.draft
                                ?.verifiedEvidenceIds || [],
                        confidence:
                            question.draft
                                ?.confidence || 0,
                        missingInformation:
                            question.draft
                                ?.missingInformation || [],
                        limitCheck:
                            question.draft
                                ?.limitCheck || null
                    }));

                return {
                    id:
                        section.id,
                    title:
                        section.title,
                    instructions:
                        section.instructions || "",
                    order:
                        section.order,
                    responses,
                    complete:
                        responses.length > 0 &&
                        responses.every(
                            item =>
                                item.state ===
                                APPLICATION_ITEM_STATES.APPROVED
                        ),
                    unresolvedQuestionIds:
                        responses
                            .filter(
                                item =>
                                    item.state !==
                                    APPLICATION_ITEM_STATES.APPROVED
                            )
                            .map(
                                item =>
                                    item.questionId
                            )
                };
            });
        },

        buildApplicationEvidenceIndex(
            application
        ) {
            const evidenceMap =
                new Map();

            (application.questions || [])
                .forEach(question => {
                    const draft =
                        question.draft;

                    if (!draft) {
                        return;
                    }

                    (
                        draft.evidenceIds || []
                    ).forEach(evidenceId => {
                        if (
                            !evidenceMap.has(
                                evidenceId
                            )
                        ) {
                            evidenceMap.set(
                                evidenceId,
                                {
                                    id:
                                        evidenceId,
                                    usedByQuestionIds:
                                        [],
                                    verified:
                                        (
                                            draft
                                                .verifiedEvidenceIds ||
                                            []
                                        ).includes(
                                            evidenceId
                                        )
                                }
                            );
                        }

                        evidenceMap
                            .get(evidenceId)
                            .usedByQuestionIds
                            .push(
                                question.id
                            );
                    });
                });

            return [
                ...evidenceMap.values()
            ].map(item => ({
                ...item,
                usedByQuestionIds:
                    this.uniqueStrings(
                        item.usedByQuestionIds
                    )
            }));
        },

        buildApplicationSubmissionChecklist(
            application,
            documents
        ) {
            const items = [];

            const add = (
                id,
                label,
                category,
                complete,
                blocking,
                action
            ) => {
                items.push({
                    id,
                    label,
                    category,
                    complete:
                        complete === true,
                    blocking:
                        blocking === true,
                    action:
                        String(action || ""),
                    completedAt:
                        complete
                            ? this.now()
                            : null
                });
            };

            (application.questions || [])
                .filter(
                    question =>
                        question.required !== false
                )
                .forEach(question => {
                    add(
                        `question-${question.id}`,
                        `Approve response: ${question.text}`,
                        "question",
                        question.state ===
                            APPLICATION_ITEM_STATES.APPROVED,
                        true,
                        question.state ===
                            APPLICATION_ITEM_STATES.APPROVED
                            ? ""
                            : "Resolve evidence, executive input, revision, and approval requirements."
                    );
                });

            documents.forEach(document => {
                let complete = false;
                let action =
                    "Verify the current document and attach it to the application package.";

                if (
                    document.type ===
                    APPLICATION_PACKAGE_ITEM_TYPES.CERTIFICATION
                ) {
                    complete =
                        !document.required ||
                        document.status === "approved" ||
                        document.attached === true;
                    action =
                        complete
                            ? ""
                            : "An authorized executive must approve this certification.";
                } else if (
                    document.type ===
                    APPLICATION_PACKAGE_ITEM_TYPES.SIGNATURE
                ) {
                    complete =
                        !document.required ||
                        document.status === "signed" ||
                        document.attached === true;
                    action =
                        complete
                            ? ""
                            : "An authorized signature is required before submission.";
                } else {
                    complete =
                        !document.required ||
                        (
                            document.verified &&
                            document.current &&
                            document.attached
                        );
                }

                add(
                    `document-${document.id}`,
                    document.name,
                    document.type,
                    complete,
                    document.required,
                    action
                );
            });

            return items;
        },

        calculateApplicationPackageReadiness(
            applicationPackage
        ) {
            const checklist =
                applicationPackage
                    .submissionChecklist || [];

            const required =
                checklist.filter(
                    item =>
                        item.blocking
                );
            const complete =
                required.filter(
                    item =>
                        item.complete
                );
            const blockers =
                required.filter(
                    item =>
                        !item.complete
                );

            const signatures =
                (
                    applicationPackage
                        .signaturePacket || []
                );
            const requiredSignatures =
                signatures.filter(
                    item =>
                        item.required
                );
            const completedSignatures =
                requiredSignatures.filter(
                    item =>
                        item.status === "signed" ||
                        item.attached === true
                );

            const narrativeComplete =
                (
                    applicationPackage
                        .narrativeSections || []
                ).every(
                    section =>
                        section.complete
                );

            const attachmentsComplete =
                (
                    applicationPackage
                        .attachmentIndex || []
                )
                    .filter(
                        item =>
                            item.required
                    )
                    .every(
                        item =>
                            item.verified &&
                            item.current &&
                            item.attached
                    );

            const certificationsComplete =
                (
                    applicationPackage
                        .certificationPacket || []
                )
                    .filter(
                        item =>
                            item.required
                    )
                    .every(
                        item =>
                            item.status === "approved" ||
                            item.attached === true
                    );

            const signatureComplete =
                requiredSignatures.length === 0 ||
                completedSignatures.length ===
                    requiredSignatures.length;

            const percent =
                required.length > 0
                    ? Math.round(
                        complete.length /
                        required.length *
                        100
                    )
                    : 0;

            const readyForExecutiveReview =
                narrativeComplete &&
                blockers.every(
                    blocker =>
                        blocker.category ===
                            APPLICATION_PACKAGE_ITEM_TYPES.SIGNATURE
                );

            const readyForSignature =
                narrativeComplete &&
                attachmentsComplete &&
                certificationsComplete &&
                applicationPackage
                    .executiveReviewApproved === true &&
                !signatureComplete;

            const readyForSubmission =
                narrativeComplete &&
                attachmentsComplete &&
                certificationsComplete &&
                signatureComplete &&
                applicationPackage
                    .executiveReviewApproved === true &&
                blockers.length === 0;

            return {
                percent,
                required:
                    required.length,
                complete:
                    complete.length,
                blockerCount:
                    blockers.length,
                blockerIds:
                    blockers.map(
                        item =>
                            item.id
                    ),
                narrativeComplete,
                attachmentsComplete,
                certificationsComplete,
                signatureComplete,
                readyForExecutiveReview,
                readyForSignature,
                readyForSubmission
            };
        },

        buildExecutiveActionChecklist(
            applicationPackage
        ) {
            const actions = [];
            const add = (
                id,
                priority,
                title,
                reason,
                estimatedMinutes = 2
            ) => {
                actions.push({
                    id,
                    priority,
                    title,
                    reason,
                    estimatedMinutes
                });
            };

            (
                applicationPackage
                    .narrativeSections || []
            ).forEach(section => {
                section.responses
                    .filter(
                        response =>
                            response.state !==
                            APPLICATION_ITEM_STATES.APPROVED
                    )
                    .forEach(response => {
                        add(
                            `review-${response.questionId}`,
                            response
                                .missingInformation
                                .length > 0
                                ? "high"
                                : "medium",
                            `Review: ${response.question}`,
                            response
                                .missingInformation
                                .length > 0
                                ? response
                                    .missingInformation
                                    .join(" ")
                                : "Executive approval is required.",
                            3
                        );
                    });
            });

            (
                applicationPackage
                    .attachmentIndex || []
            )
                .filter(
                    item =>
                        item.required &&
                        (
                            !item.verified ||
                            !item.current ||
                            !item.attached
                        )
                )
                .forEach(item => {
                    add(
                        `attachment-${item.id}`,
                        "high",
                        `Attach ${item.name}`,
                        !item.verified
                            ? "The document has not been verified."
                            : !item.current
                            ? "The document is not current."
                            : "The document has not been attached.",
                        2
                    );
                });

            (
                applicationPackage
                    .certificationPacket || []
            )
                .filter(
                    item =>
                        item.required &&
                        item.status !==
                            "approved"
                )
                .forEach(item => {
                    add(
                        `certification-${item.id}`,
                        "critical",
                        `Approve certification: ${item.name}`,
                        "An authorized executive must approve this certification.",
                        2
                    );
                });

            (
                applicationPackage
                    .signaturePacket || []
            )
                .filter(
                    item =>
                        item.required &&
                        item.status !==
                            "signed"
                )
                .forEach(item => {
                    add(
                        `signature-${item.id}`,
                        "critical",
                        `Sign: ${item.name}`,
                        "An authorized signature is required before submission.",
                        2
                    );
                });

            if (
                applicationPackage
                    .executiveReviewApproved !== true
            ) {
                add(
                    "approve-application-package",
                    "critical",
                    "Approve the complete application package",
                    "Final executive package approval is required before signature or submission.",
                    5
                );
            }

            const priorityWeight = {
                critical: 3,
                high: 2,
                medium: 1,
                standard: 0
            };

            actions.sort(
                (left, right) =>
                    (
                        priorityWeight[
                            right.priority
                        ] || 0
                    ) -
                    (
                        priorityWeight[
                            left.priority
                        ] || 0
                    )
            );

            return {
                createdAt:
                    this.now(),
                count:
                    actions.length,
                estimatedMinutes:
                    actions.reduce(
                        (total, action) =>
                            total +
                            action.estimatedMinutes,
                        0
                    ),
                actions
            };
        },

        determineApplicationAssemblyState(
            applicationPackage
        ) {
            const readiness =
                applicationPackage.readiness;

            if (
                readiness.readyForSubmission
            ) {
                return APPLICATION_ASSEMBLY_STATES.READY_FOR_SUBMISSION;
            }

            if (
                readiness.readyForSignature
            ) {
                return APPLICATION_ASSEMBLY_STATES.READY_FOR_SIGNATURE;
            }

            if (
                readiness.readyForExecutiveReview
            ) {
                return APPLICATION_ASSEMBLY_STATES.READY_FOR_EXECUTIVE_REVIEW;
            }

            return APPLICATION_ASSEMBLY_STATES.EXECUTIVE_ACTION_REQUIRED;
        },

        assembleExecutiveApplicationPackage(
            opportunityId,
            input = {}
        ) {
            const opportunity =
                this.getOpportunityById(
                    opportunityId
                );
            const application =
                opportunity
                    ?.applicationIntelligence;

            if (!opportunity || !application) {
                return {
                    success: false,
                    error:
                        "Funding Application Intelligence must be completed before assembly.",
                    code:
                        "GRANT_APPLICATION_INTELLIGENCE_REQUIRED"
                };
            }

            const narrativeSections =
                this.buildApplicationNarrativeSections(
                    application
                );

            const applicationAttachments =
                (
                    application.attachments || []
                ).map(item =>
                    this.normalizeAssemblyDocumentRecord(
                        item,
                        {
                            type:
                                APPLICATION_PACKAGE_ITEM_TYPES.ATTACHMENT,
                            source:
                                "application-intelligence"
                        }
                    )
                );

            const suppliedDocuments =
                (
                    Array.isArray(
                        input.documents
                    )
                        ? input.documents
                        : []
                ).map(item =>
                    this.normalizeAssemblyDocumentRecord(
                        item,
                        {
                            type:
                                APPLICATION_PACKAGE_ITEM_TYPES.ATTACHMENT,
                            source:
                                "assembly-input"
                        }
                    )
                );

            const documentMap =
                new Map();

            [
                ...applicationAttachments,
                ...suppliedDocuments
            ].forEach(item => {
                const key =
                    this.normalizeText(
                        item.name
                    );

                if (!documentMap.has(key)) {
                    documentMap.set(
                        key,
                        item
                    );
                    return;
                }

                const existing =
                    documentMap.get(key);

                documentMap.set(
                    key,
                    {
                        ...existing,
                        ...item,
                        verified:
                            existing.verified ||
                            item.verified,
                        current:
                            existing.current &&
                            item.current,
                        attached:
                            existing.attached ||
                            item.attached,
                        documentId:
                            item.documentId ||
                            existing.documentId,
                        issues:
                            this.uniqueStrings([
                                ...(existing.issues || []),
                                ...(item.issues || [])
                            ])
                    }
                );
            });

            const attachmentIndex =
                [
                    ...documentMap.values()
                ];

            const certificationPacket =
                (
                    application
                        .certifications || []
                ).map(item => ({
                    ...this.clone(item),
                    type:
                        APPLICATION_PACKAGE_ITEM_TYPES.CERTIFICATION
                }));

            const signaturePacket =
                (
                    application
                        .signatures || []
                ).map(item => ({
                    ...this.clone(item),
                    type:
                        APPLICATION_PACKAGE_ITEM_TYPES.SIGNATURE
                }));

            const executiveSummary = {
                title:
                    application.title,
                opportunityId:
                    opportunity.id,
                applicationId:
                    application.id,
                provider:
                    opportunity.provider,
                deadline:
                    application.deadline,
                submissionMethod:
                    application.submissionMethod,
                alignmentStatus:
                    opportunity
                        .alignmentStrategy
                        ?.status || "not-built",
                alignmentScore:
                    opportunity
                        .alignmentStrategy
                        ?.overallScore ?? null,
                questionCount:
                    application.questions.length,
                approvedQuestionCount:
                    application.questions.filter(
                        question =>
                            question.state ===
                            APPLICATION_ITEM_STATES.APPROVED
                    ).length,
                estimatedAward:
                    opportunity.awardAmount ||
                    opportunity.awardMaximum ||
                    opportunity.awardMinimum ||
                    null
            };

            const applicationPackage = {
                schema:
                    "meos.grant-office.executive-application-package.v1",
                version:
                    this.version,
                buildId:
                    this.buildId,
                id:
                    input.id ||
                    this.createId(
                        "executive-application-package"
                    ),
                opportunityId:
                    opportunity.id,
                applicationId:
                    application.id,
                title:
                    input.title ||
                    application.title,
                createdAt:
                    this.now(),
                updatedAt:
                    this.now(),
                assemblyState:
                    APPLICATION_ASSEMBLY_STATES.ASSEMBLING,
                executiveReviewApproved:
                    input.executiveReviewApproved === true ||
                    opportunity
                        .executiveReviewPackage
                        ?.approval
                        ?.status === "approved",
                executiveSummary,
                narrativeSections,
                budgetNarrative:
                    narrativeSections
                        .flatMap(
                            section =>
                                section.responses
                        )
                        .filter(
                            response =>
                                [
                                    APPLICATION_QUESTION_CATEGORIES.BUDGET,
                                    APPLICATION_QUESTION_CATEGORIES.BUDGET_NARRATIVE
                                ].includes(
                                    response.category
                                )
                        ),
                attachmentIndex,
                certificationPacket,
                signaturePacket,
                evidenceIndex:
                    this.buildApplicationEvidenceIndex(
                        application
                    ),
                submissionChecklist:
                    [],
                executiveActionChecklist:
                    null,
                readiness:
                    null,
                history: [
                    {
                        state:
                            APPLICATION_ASSEMBLY_STATES.ASSEMBLING,
                        enteredAt:
                            this.now(),
                        actor:
                            input.actor ||
                            "MEOS Grant Office",
                        note:
                            "Executive application package assembly started."
                    }
                ]
            };

            applicationPackage
                .submissionChecklist =
                this.buildApplicationSubmissionChecklist(
                    application,
                    [
                        ...attachmentIndex,
                        ...certificationPacket.map(
                            item =>
                                this.normalizeAssemblyDocumentRecord(
                                    item,
                                    {
                                        type:
                                            APPLICATION_PACKAGE_ITEM_TYPES.CERTIFICATION
                                    }
                                )
                        ),
                        ...signaturePacket.map(
                            item =>
                                this.normalizeAssemblyDocumentRecord(
                                    item,
                                    {
                                        type:
                                            APPLICATION_PACKAGE_ITEM_TYPES.SIGNATURE
                                    }
                                )
                        )
                    ]
                );

            applicationPackage.readiness =
                this.calculateApplicationPackageReadiness(
                    applicationPackage
                );

            applicationPackage
                .executiveActionChecklist =
                this.buildExecutiveActionChecklist(
                    applicationPackage
                );

            applicationPackage.assemblyState =
                this.determineApplicationAssemblyState(
                    applicationPackage
                );

            applicationPackage.history.push({
                state:
                    applicationPackage
                        .assemblyState,
                enteredAt:
                    this.now(),
                actor:
                    input.actor ||
                    "MEOS Grant Office",
                note:
                    "Executive application package assembled and readiness evaluated."
            });

            opportunity
                .executiveApplicationPackage =
                applicationPackage;
            opportunity.updatedAt =
                this.now();

            this.analytics
                .applicationPackagesAssembled += 1;
            this.analytics
                .applicationPackageItemsCreated +=
                applicationPackage
                    .submissionChecklist
                    .length;
            this.analytics
                .executiveActionChecklistsCreated += 1;
            this.analytics
                .lastApplicationAssemblyAt =
                applicationPackage.createdAt;

            this.persistIfEnabled();

            return {
                success: true,
                applicationPackage:
                    this.clone(
                        applicationPackage
                    ),
                opportunity:
                    this.clone(
                        opportunity
                    )
            };
        },

        updateApplicationPackageDocument(
            opportunityId,
            documentId,
            update = {}
        ) {
            const opportunity =
                this.getOpportunityById(
                    opportunityId
                );
            const applicationPackage =
                opportunity
                    ?.executiveApplicationPackage;

            if (!applicationPackage) {
                return {
                    success: false,
                    error:
                        "Executive application package has not been assembled."
                };
            }

            const document =
                applicationPackage
                    .attachmentIndex
                    .find(
                        item =>
                            item.id ===
                            documentId
                    );

            if (!document) {
                return {
                    success: false,
                    error:
                        "Application package document not found."
                };
            }

            Object.assign(
                document,
                {
                    ...update
                }
            );

            if (update.attached === true) {
                document.status =
                    "attached";
                document.attachedAt =
                    update.attachedAt ||
                    this.now();
            }

            applicationPackage
                .submissionChecklist =
                this.buildApplicationSubmissionChecklist(
                    opportunity
                        .applicationIntelligence,
                    [
                        ...applicationPackage
                            .attachmentIndex,
                        ...applicationPackage
                            .certificationPacket
                            .map(item =>
                                this.normalizeAssemblyDocumentRecord(
                                    item,
                                    {
                                        type:
                                            APPLICATION_PACKAGE_ITEM_TYPES.CERTIFICATION
                                    }
                                )
                            ),
                        ...applicationPackage
                            .signaturePacket
                            .map(item =>
                                this.normalizeAssemblyDocumentRecord(
                                    item,
                                    {
                                        type:
                                            APPLICATION_PACKAGE_ITEM_TYPES.SIGNATURE
                                    }
                                )
                            )
                    ]
                );

            applicationPackage.readiness =
                this.calculateApplicationPackageReadiness(
                    applicationPackage
                );
            applicationPackage
                .executiveActionChecklist =
                this.buildExecutiveActionChecklist(
                    applicationPackage
                );
            applicationPackage.assemblyState =
                this.determineApplicationAssemblyState(
                    applicationPackage
                );
            applicationPackage.updatedAt =
                this.now();

            this.persistIfEnabled();

            return {
                success: true,
                document:
                    this.clone(
                        document
                    ),
                applicationPackage:
                    this.clone(
                        applicationPackage
                    )
            };
        },

        approveExecutiveApplicationPackage(
            opportunityId,
            approval = {}
        ) {
            const opportunity =
                this.getOpportunityById(
                    opportunityId
                );
            const applicationPackage =
                opportunity
                    ?.executiveApplicationPackage;

            if (!applicationPackage) {
                return {
                    success: false,
                    error:
                        "Executive application package has not been assembled."
                };
            }

            const approvedBy =
                String(
                    approval.approvedBy ||
                    ""
                ).trim();

            if (!approvedBy) {
                return {
                    success: false,
                    error:
                        "Application package approval requires approvedBy."
                };
            }

            const unresolvedNarrative =
                applicationPackage
                    .narrativeSections
                    .some(
                        section =>
                            !section.complete
                    );

            const unresolvedDocuments =
                applicationPackage
                    .attachmentIndex
                    .filter(
                        item =>
                            item.required
                    )
                    .some(
                        item =>
                            !item.verified ||
                            !item.current ||
                            !item.attached
                    );

            const unresolvedCertifications =
                applicationPackage
                    .certificationPacket
                    .filter(
                        item =>
                            item.required
                    )
                    .some(
                        item =>
                            item.status !==
                                "approved"
                    );

            if (
                unresolvedNarrative ||
                unresolvedDocuments ||
                unresolvedCertifications
            ) {
                return {
                    success: false,
                    error:
                        "Application package cannot be approved while narrative, document, or certification requirements remain unresolved.",
                    code:
                        "GRANT_APPLICATION_PACKAGE_NOT_READY",
                    readiness:
                        this.clone(
                            initialPackageSnapshot
                                .readiness
                        ),
                    executiveActions:
                        this.clone(
                            initialPackageSnapshot
                                .executiveActionChecklist
                        )
                };
            }

            applicationPackage
                .executiveReviewApproved =
                true;
            applicationPackage
                .executiveReviewApproval = {
                    approvedBy,
                    approvedAt:
                        approval.approvedAt ||
                        this.now(),
                    notes:
                        String(
                            approval.notes || ""
                        )
                };

            applicationPackage
                .submissionChecklist =
                this.buildApplicationSubmissionChecklist(
                    opportunity
                        .applicationIntelligence,
                    [
                        ...applicationPackage
                            .attachmentIndex,
                        ...applicationPackage
                            .certificationPacket
                            .map(item =>
                                this.normalizeAssemblyDocumentRecord(
                                    item,
                                    {
                                        type:
                                            APPLICATION_PACKAGE_ITEM_TYPES.CERTIFICATION
                                    }
                                )
                            ),
                        ...applicationPackage
                            .signaturePacket
                            .map(item =>
                                this.normalizeAssemblyDocumentRecord(
                                    item,
                                    {
                                        type:
                                            APPLICATION_PACKAGE_ITEM_TYPES.SIGNATURE
                                    }
                                )
                            )
                    ]
                );

            applicationPackage.readiness =
                this.calculateApplicationPackageReadiness(
                    applicationPackage
                );
            applicationPackage
                .executiveActionChecklist =
                this.buildExecutiveActionChecklist(
                    applicationPackage
                );
            applicationPackage.assemblyState =
                this.determineApplicationAssemblyState(
                    applicationPackage
                );
            applicationPackage.updatedAt =
                this.now();

            this.persistIfEnabled();

            return {
                success: true,
                applicationPackage:
                    this.clone(
                        applicationPackage
                    )
            };
        },

        markApplicationPackageSignature(
            opportunityId,
            signatureId,
            signature = {}
        ) {
            const opportunity =
                this.getOpportunityById(
                    opportunityId
                );
            const applicationPackage =
                opportunity
                    ?.executiveApplicationPackage;

            if (!applicationPackage) {
                return {
                    success: false,
                    error:
                        "Executive application package has not been assembled."
                };
            }

            if (
                applicationPackage
                    .executiveReviewApproved !== true
            ) {
                this.analytics
                    .signatureReadinessBlocksTriggered += 1;

                return {
                    success: false,
                    error:
                        "Signature is blocked until the complete application package receives executive approval.",
                    code:
                        "GRANT_APPLICATION_SIGNATURE_BLOCKED"
                };
            }

            const signatureRecord =
                applicationPackage
                    .signaturePacket
                    .find(
                        item =>
                            item.id ===
                            signatureId
                    );

            if (!signatureRecord) {
                return {
                    success: false,
                    error:
                        "Signature requirement not found."
                };
            }

            const signedBy =
                String(
                    signature.signedBy ||
                    ""
                ).trim();

            if (!signedBy) {
                return {
                    success: false,
                    error:
                        "Signature requires signedBy."
                };
            }

            signatureRecord.status =
                "signed";
            signatureRecord.signedBy =
                signedBy;
            signatureRecord.signedAt =
                signature.signedAt ||
                this.now();
            signatureRecord.attached =
                true;

            applicationPackage
                .submissionChecklist =
                this.buildApplicationSubmissionChecklist(
                    opportunity
                        .applicationIntelligence,
                    [
                        ...applicationPackage
                            .attachmentIndex,
                        ...applicationPackage
                            .certificationPacket
                            .map(item =>
                                this.normalizeAssemblyDocumentRecord(
                                    item,
                                    {
                                        type:
                                            APPLICATION_PACKAGE_ITEM_TYPES.CERTIFICATION
                                    }
                                )
                            ),
                        ...applicationPackage
                            .signaturePacket
                            .map(item =>
                                this.normalizeAssemblyDocumentRecord(
                                    item,
                                    {
                                        type:
                                            APPLICATION_PACKAGE_ITEM_TYPES.SIGNATURE
                                    }
                                )
                            )
                    ]
                );
            applicationPackage.readiness =
                this.calculateApplicationPackageReadiness(
                    applicationPackage
                );
            applicationPackage
                .executiveActionChecklist =
                this.buildExecutiveActionChecklist(
                    applicationPackage
                );
            applicationPackage.assemblyState =
                this.determineApplicationAssemblyState(
                    applicationPackage
                );
            applicationPackage.updatedAt =
                this.now();

            this.persistIfEnabled();

            return {
                success: true,
                signature:
                    this.clone(
                        signatureRecord
                    ),
                applicationPackage:
                    this.clone(
                        applicationPackage
                    )
            };
        },

        detectSubmissionPortalType(input = {}) {
            const value =
                this.normalizeText([
                    input.portalType,
                    input.name,
                    input.title,
                    input.url,
                    input.host,
                    input.description,
                    input.sourceType
                ].join(" "));

            const rules = [
                {
                    type:
                        SUBMISSION_PORTAL_TYPES.GRANTS_GOV,
                    signals: [
                        "grants gov",
                        "grants.gov",
                        "workspace"
                    ]
                },
                {
                    type:
                        SUBMISSION_PORTAL_TYPES.SUBMITTABLE,
                    signals: [
                        "submittable"
                    ]
                },
                {
                    type:
                        SUBMISSION_PORTAL_TYPES.FOUNDANT,
                    signals: [
                        "foundant",
                        "grant lifecycle manager",
                        "glms"
                    ]
                },
                {
                    type:
                        SUBMISSION_PORTAL_TYPES.SMARTSIMPLE,
                    signals: [
                        "smartsimple"
                    ]
                },
                {
                    type:
                        SUBMISSION_PORTAL_TYPES.FLUXX,
                    signals: [
                        "fluxx"
                    ]
                },
                {
                    type:
                        SUBMISSION_PORTAL_TYPES.BLACKBAUD,
                    signals: [
                        "blackbaud",
                        "yourcause"
                    ]
                },
                {
                    type:
                        SUBMISSION_PORTAL_TYPES.GOOGLE_FORMS,
                    signals: [
                        "google forms",
                        "docs.google.com/forms"
                    ]
                },
                {
                    type:
                        SUBMISSION_PORTAL_TYPES.MICROSOFT_FORMS,
                    signals: [
                        "microsoft forms",
                        "forms.office.com"
                    ]
                },
                {
                    type:
                        SUBMISSION_PORTAL_TYPES.PDF_PACKAGE,
                    signals: [
                        "pdf application",
                        ".pdf"
                    ]
                },
                {
                    type:
                        SUBMISSION_PORTAL_TYPES.DOCX_PACKAGE,
                    signals: [
                        "docx application",
                        ".docx",
                        "word application"
                    ]
                }
            ];

            const match =
                rules.find(rule =>
                    rule.signals.some(signal =>
                        value.includes(
                            this.normalizeText(
                                signal
                            )
                        )
                    )
                );

            if (match) {
                return {
                    type:
                        match.type,
                    confidence:
                        0.98,
                    basis:
                        "recognized-provider-signal"
                };
            }

            if (
                value.includes("http") ||
                value.includes("portal") ||
                value.includes("online application")
            ) {
                return {
                    type:
                        SUBMISSION_PORTAL_TYPES.GENERIC_WEB_PORTAL,
                    confidence:
                        0.7,
                    basis:
                        "generic-web-workflow"
                };
            }

            return {
                type:
                    SUBMISSION_PORTAL_TYPES.UNKNOWN,
                confidence:
                    0.2,
                basis:
                    "insufficient-evidence"
            };
        },

        normalizeSubmissionField(
            field,
            defaults = {}
        ) {
            const raw =
                typeof field === "string"
                    ? {
                        label:
                            field
                    }
                    : {
                        ...(field || {})
                    };

            const label =
                String(
                    raw.label ||
                    raw.name ||
                    raw.title ||
                    raw.question ||
                    defaults.label ||
                    "Unnamed Field"
                ).trim();

            const instructions =
                String(
                    raw.instructions ||
                    raw.helpText ||
                    raw.guidance ||
                    ""
                ).trim();

            const type =
                raw.type ||
                this.inferSubmissionFieldType(
                    `${label} ${instructions}`,
                    raw
                );

            const limits =
                this.extractApplicationLimits(
                    `${label} ${instructions}`,
                    raw
                );

            const required =
                raw.required !== false;

            const executiveApprovalRequired =
                raw.executiveApprovalRequired === true ||
                [
                    SUBMISSION_FIELD_TYPES.SIGNATURE,
                    SUBMISSION_FIELD_TYPES.CERTIFICATION,
                    SUBMISSION_FIELD_TYPES.CURRENCY
                ].includes(type) ||
                this.requiresExecutiveInput(
                    label,
                    this.classifyApplicationQuestion(
                        `${label} ${instructions}`
                    )
                );

            return {
                id:
                    raw.id ||
                    defaults.id ||
                    this.createId(
                        "portal-field"
                    ),
                stepId:
                    raw.stepId ||
                    defaults.stepId ||
                    "portal-step-application",
                label,
                instructions,
                type,
                required,
                limits,
                options:
                    Array.isArray(
                        raw.options
                    )
                        ? this.clone(
                            raw.options
                        )
                        : [],
                sourceQuestionId:
                    raw.sourceQuestionId ||
                    raw.questionId ||
                    null,
                sourceDocumentId:
                    raw.sourceDocumentId ||
                    raw.documentId ||
                    null,
                value:
                    raw.value ?? null,
                completed:
                    raw.completed === true ||
                    (
                        raw.value !== undefined &&
                        raw.value !== null &&
                        String(raw.value).trim() !== ""
                    ),
                executiveApprovalRequired,
                approved:
                    raw.approved === true,
                validationRules:
                    this.normalizePortalValidationRules(
                        raw.validationRules ||
                        raw.rules ||
                        []
                    ),
                issues:
                    this.uniqueStrings(
                        raw.issues || []
                    )
            };
        },

        inferSubmissionFieldType(
            value,
            raw = {}
        ) {
            const text =
                this.normalizeText(value);

            if (
                raw.accept ||
                raw.fileTypes ||
                text.includes("upload") ||
                text.includes("attach")
            ) {
                return SUBMISSION_FIELD_TYPES.FILE;
            }

            if (
                text.includes("signature") ||
                text.includes("authorized signer")
            ) {
                return SUBMISSION_FIELD_TYPES.SIGNATURE;
            }

            if (
                text.includes("certify") ||
                text.includes("certification") ||
                text.includes("assurance")
            ) {
                return SUBMISSION_FIELD_TYPES.CERTIFICATION;
            }

            if (
                text.includes("amount") ||
                text.includes("budget") ||
                text.includes("currency") ||
                text.includes("dollar")
            ) {
                return SUBMISSION_FIELD_TYPES.CURRENCY;
            }

            if (
                text.includes("date") ||
                raw.inputType === "date"
            ) {
                return SUBMISSION_FIELD_TYPES.DATE;
            }

            if (
                Array.isArray(raw.options) &&
                raw.options.length > 0
            ) {
                if (
                    raw.multiple === true
                ) {
                    return SUBMISSION_FIELD_TYPES.MULTISELECT;
                }

                return SUBMISSION_FIELD_TYPES.SELECT;
            }

            if (
                raw.inputType === "checkbox"
            ) {
                return SUBMISSION_FIELD_TYPES.CHECKBOX;
            }

            if (
                raw.inputType === "radio"
            ) {
                return SUBMISSION_FIELD_TYPES.RADIO;
            }

            if (
                raw.inputType === "number"
            ) {
                return SUBMISSION_FIELD_TYPES.NUMBER;
            }

            if (
                raw.multiline === true ||
                text.includes("describe") ||
                text.includes("explain") ||
                text.includes("narrative")
            ) {
                return SUBMISSION_FIELD_TYPES.TEXTAREA;
            }

            return SUBMISSION_FIELD_TYPES.TEXT;
        },

        normalizePortalValidationRules(
            rules = []
        ) {
            if (!Array.isArray(rules)) {
                return [];
            }

            return rules
                .filter(Boolean)
                .map((rule, index) => {
                    if (
                        typeof rule === "string"
                    ) {
                        return {
                            id:
                                `validation-${index + 1}`,
                            type:
                                "custom",
                            message:
                                rule
                        };
                    }

                    return {
                        id:
                            rule.id ||
                            `validation-${index + 1}`,
                        type:
                            rule.type ||
                            "custom",
                        value:
                            rule.value ?? null,
                        message:
                            String(
                                rule.message ||
                                rule.description ||
                                ""
                            )
                    };
                });
        },

        normalizePortalWorkflowStep(
            step,
            defaults = {}
        ) {
            const raw =
                typeof step === "string"
                    ? {
                        title:
                            step
                    }
                    : {
                        ...(step || {})
                    };

            const title =
                String(
                    raw.title ||
                    raw.name ||
                    defaults.title ||
                    "Portal Step"
                ).trim();

            const type =
                raw.type ||
                this.inferPortalWorkflowStepType(
                    title,
                    raw
                );

            return {
                id:
                    raw.id ||
                    defaults.id ||
                    this.createId(
                        "portal-step"
                    ),
                title,
                type,
                order:
                    Number(
                        raw.order ??
                        defaults.order ??
                        1
                    ),
                required:
                    raw.required !== false,
                completed:
                    raw.completed === true,
                fields:
                    (
                        Array.isArray(
                            raw.fields
                        )
                            ? raw.fields
                            : []
                    ).map(
                        (field, index) =>
                            this.normalizeSubmissionField(
                                field,
                                {
                                    stepId:
                                        raw.id ||
                                        defaults.id ||
                                        `portal-step-${defaults.order || 1}`,
                                    id:
                                        field?.id ||
                                        `portal-field-${defaults.order || 1}-${index + 1}`
                                }
                            )
                    ),
                instructions:
                    String(
                        raw.instructions ||
                        raw.description ||
                        ""
                    ),
                issues:
                    this.uniqueStrings(
                        raw.issues || []
                    )
            };
        },

        inferPortalWorkflowStepType(
            value,
            raw = {}
        ) {
            const text =
                this.normalizeText(value);

            const mapping = [
                {
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.AUTHENTICATION,
                    signals: [
                        "login",
                        "sign in",
                        "account",
                        "authentication"
                    ]
                },
                {
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.ELIGIBILITY,
                    signals: [
                        "eligibility",
                        "screening",
                        "prequalification"
                    ]
                },
                {
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.PROFILE,
                    signals: [
                        "organization profile",
                        "applicant profile",
                        "organization information"
                    ]
                },
                {
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.ATTACHMENTS,
                    signals: [
                        "attachment",
                        "upload",
                        "documents"
                    ]
                },
                {
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.CERTIFICATIONS,
                    signals: [
                        "certification",
                        "assurance"
                    ]
                },
                {
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.SIGNATURE,
                    signals: [
                        "signature",
                        "authorized official"
                    ]
                },
                {
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.REVIEW,
                    signals: [
                        "review",
                        "validation",
                        "summary"
                    ]
                },
                {
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.SUBMIT,
                    signals: [
                        "submit",
                        "final submission"
                    ]
                },
                {
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.CONFIRMATION,
                    signals: [
                        "confirmation",
                        "receipt"
                    ]
                }
            ];

            const match =
                mapping.find(item =>
                    item.signals.some(signal =>
                        text.includes(
                            signal
                        )
                    )
                );

            return (
                match?.type ||
                raw.type ||
                SUBMISSION_PORTAL_STEP_TYPES.APPLICATION
            );
        },

        buildDefaultPortalWorkflow(
            portalType
        ) {
            const common = [
                {
                    id:
                        "portal-step-authentication",
                    title:
                        "Authentication",
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.AUTHENTICATION,
                    order:
                        1,
                    required:
                        portalType !==
                            SUBMISSION_PORTAL_TYPES.PDF_PACKAGE &&
                        portalType !==
                            SUBMISSION_PORTAL_TYPES.DOCX_PACKAGE
                },
                {
                    id:
                        "portal-step-eligibility",
                    title:
                        "Eligibility",
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.ELIGIBILITY,
                    order:
                        2,
                    required:
                        true
                },
                {
                    id:
                        "portal-step-profile",
                    title:
                        "Organization Profile",
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.PROFILE,
                    order:
                        3,
                    required:
                        true
                },
                {
                    id:
                        "portal-step-application",
                    title:
                        "Application",
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.APPLICATION,
                    order:
                        4,
                    required:
                        true
                },
                {
                    id:
                        "portal-step-attachments",
                    title:
                        "Attachments",
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.ATTACHMENTS,
                    order:
                        5,
                    required:
                        true
                },
                {
                    id:
                        "portal-step-certifications",
                    title:
                        "Certifications",
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.CERTIFICATIONS,
                    order:
                        6,
                    required:
                        true
                },
                {
                    id:
                        "portal-step-signature",
                    title:
                        "Signature",
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.SIGNATURE,
                    order:
                        7,
                    required:
                        true
                },
                {
                    id:
                        "portal-step-review",
                    title:
                        "Review",
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.REVIEW,
                    order:
                        8,
                    required:
                        true
                },
                {
                    id:
                        "portal-step-submit",
                    title:
                        "Submit",
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.SUBMIT,
                    order:
                        9,
                    required:
                        true
                },
                {
                    id:
                        "portal-step-confirmation",
                    title:
                        "Confirmation",
                    type:
                        SUBMISSION_PORTAL_STEP_TYPES.CONFIRMATION,
                    order:
                        10,
                    required:
                        true
                }
            ];

            return common;
        },

        analyzeSubmissionPortal(
            opportunityId,
            input = {}
        ) {
            const opportunity =
                this.getOpportunityById(
                    opportunityId
                );
            const applicationPackage =
                opportunity
                    ?.executiveApplicationPackage;

            if (!opportunity || !applicationPackage) {
                return {
                    success: false,
                    error:
                        "Executive Application Assembly must be completed before portal analysis.",
                    code:
                        "GRANT_APPLICATION_PACKAGE_REQUIRED"
                };
            }

            const detection =
                this.detectSubmissionPortalType(
                    input
                );

            const suppliedSteps =
                Array.isArray(
                    input.workflowSteps
                )
                    ? input.workflowSteps
                    : [];

            const workflowSteps =
                (
                    suppliedSteps.length > 0
                        ? suppliedSteps
                        : this.buildDefaultPortalWorkflow(
                            detection.type
                        )
                ).map(
                    (step, index) =>
                        this.normalizePortalWorkflowStep(
                            step,
                            {
                                order:
                                    step.order ??
                                    index + 1
                            }
                        )
                );

            const applicationStep =
                workflowSteps.find(
                    step =>
                        step.type ===
                        SUBMISSION_PORTAL_STEP_TYPES.APPLICATION
                );

            if (applicationStep) {
                const existingIds =
                    new Set(
                        applicationStep
                            .fields
                            .map(
                                field =>
                                    field.id
                            )
                    );

                applicationPackage
                    .narrativeSections
                    .flatMap(
                        section =>
                            section.responses
                    )
                    .forEach(
                        response => {
                            const fieldId =
                                `portal-question-${response.questionId}`;

                            if (
                                existingIds.has(
                                    fieldId
                                )
                            ) {
                                return;
                            }

                            applicationStep
                                .fields
                                .push(
                                    this.normalizeSubmissionField(
                                        {
                                            id:
                                                fieldId,
                                            label:
                                                response.question,
                                            type:
                                                SUBMISSION_FIELD_TYPES.TEXTAREA,
                                            required:
                                                true,
                                            value:
                                                response.response,
                                            completed:
                                                Boolean(
                                                    response.response
                                                ),
                                            approved:
                                                response.state ===
                                                APPLICATION_ITEM_STATES.APPROVED,
                                            sourceQuestionId:
                                                response.questionId,
                                            executiveApprovalRequired:
                                                false,
                                            characterLimit:
                                                response
                                                    .limitCheck
                                                    ?.limits
                                                    ?.characters ||
                                                null,
                                            wordLimit:
                                                response
                                                    .limitCheck
                                                    ?.limits
                                                    ?.words ||
                                                null
                                        },
                                        {
                                            stepId:
                                                applicationStep.id
                                        }
                                    )
                                );
                        }
                    );
            }

            const attachmentStep =
                workflowSteps.find(
                    step =>
                        step.type ===
                        SUBMISSION_PORTAL_STEP_TYPES.ATTACHMENTS
                );

            if (attachmentStep) {
                applicationPackage
                    .attachmentIndex
                    .forEach(item => {
                        attachmentStep.fields.push(
                            this.normalizeSubmissionField(
                                {
                                    id:
                                        `portal-attachment-${item.id}`,
                                    label:
                                        item.name,
                                    type:
                                        SUBMISSION_FIELD_TYPES.FILE,
                                    required:
                                        item.required,
                                    sourceDocumentId:
                                        item.documentId ||
                                        item.id,
                                    completed:
                                        item.attached === true,
                                    approved:
                                        item.verified === true &&
                                        item.current === true
                                },
                                {
                                    stepId:
                                        attachmentStep.id
                                }
                            )
                        );
                    });
            }

            const certificationStep =
                workflowSteps.find(
                    step =>
                        step.type ===
                        SUBMISSION_PORTAL_STEP_TYPES.CERTIFICATIONS
                );

            if (certificationStep) {
                applicationPackage
                    .certificationPacket
                    .forEach(item => {
                        certificationStep.fields.push(
                            this.normalizeSubmissionField(
                                {
                                    id:
                                        `portal-certification-${item.id}`,
                                    label:
                                        item.name,
                                    type:
                                        SUBMISSION_FIELD_TYPES.CERTIFICATION,
                                    required:
                                        item.required,
                                    completed:
                                        item.status ===
                                        "approved",
                                    approved:
                                        item.status ===
                                        "approved",
                                    executiveApprovalRequired:
                                        true
                                },
                                {
                                    stepId:
                                        certificationStep.id
                                }
                            )
                        );
                    });
            }

            const signatureStep =
                workflowSteps.find(
                    step =>
                        step.type ===
                        SUBMISSION_PORTAL_STEP_TYPES.SIGNATURE
                );

            if (signatureStep) {
                applicationPackage
                    .signaturePacket
                    .forEach(item => {
                        signatureStep.fields.push(
                            this.normalizeSubmissionField(
                                {
                                    id:
                                        `portal-signature-${item.id}`,
                                    label:
                                        item.name,
                                    type:
                                        SUBMISSION_FIELD_TYPES.SIGNATURE,
                                    required:
                                        item.required,
                                    completed:
                                        item.status ===
                                        "signed",
                                    approved:
                                        item.status ===
                                        "signed",
                                    executiveApprovalRequired:
                                        true
                                },
                                {
                                    stepId:
                                        signatureStep.id
                                }
                            )
                        );
                    });
            }

            const fields =
                workflowSteps.flatMap(
                    step =>
                        step.fields
                );

            const portalIntelligence = {
                schema:
                    "meos.grant-office.submission-portal-intelligence.v1",
                version:
                    this.version,
                buildId:
                    this.buildId,
                id:
                    input.id ||
                    this.createId(
                        "submission-portal-intelligence"
                    ),
                opportunityId:
                    opportunity.id,
                applicationPackageId:
                    applicationPackage.id,
                portal: {
                    type:
                        detection.type,
                    confidence:
                        detection.confidence,
                    detectionBasis:
                        detection.basis,
                    name:
                        input.name ||
                        input.title ||
                        detection.type,
                    url:
                        input.url ||
                        "",
                    loginRequired:
                        input.loginRequired ??
                        workflowSteps.some(
                            step =>
                                step.type ===
                                SUBMISSION_PORTAL_STEP_TYPES.AUTHENTICATION &&
                                step.required
                        ),
                    accountStatus:
                        input.accountStatus ||
                        "unknown"
                },
                state:
                    SUBMISSION_PORTAL_STATES.MAPPED,
                analyzedAt:
                    this.now(),
                workflowSteps,
                fields,
                validationSummary:
                    this.validatePortalMapping(
                        workflowSteps
                    ),
                authorization: {
                    required:
                        true,
                    authorized:
                        false,
                    authorizedBy:
                        null,
                    authorizedAt:
                        null,
                    scope:
                        "populate-and-submit"
                },
                submissionControl: {
                    finalSubmitBlocked:
                        true,
                    reason:
                        "Explicit executive submission authorization has not been recorded."
                }
            };

            opportunity
                .submissionPortalIntelligence =
                portalIntelligence;
            opportunity.updatedAt =
                this.now();

            this.analytics
                .portalAnalysesCompleted += 1;
            this.analytics
                .portalFieldsNormalized +=
                fields.length;
            this.analytics
                .portalWorkflowStepsMapped +=
                workflowSteps.length;
            this.analytics
                .lastPortalIntelligenceAt =
                portalIntelligence.analyzedAt;

            this.persistIfEnabled();

            return {
                success: true,
                portalIntelligence:
                    this.clone(
                        portalIntelligence
                    )
            };
        },

        validatePortalMapping(
            workflowSteps
        ) {
            const fields =
                workflowSteps.flatMap(
                    step =>
                        step.fields || []
                );

            const requiredFields =
                fields.filter(
                    field =>
                        field.required
                );

            const incompleteFields =
                requiredFields.filter(
                    field =>
                        !field.completed
                );

            const unapprovedFields =
                requiredFields.filter(
                    field =>
                        field.executiveApprovalRequired &&
                        !field.approved
                );

            const validationIssues =
                fields.flatMap(
                    field =>
                        (
                            field.validationRules || []
                        )
                            .filter(
                                rule =>
                                    rule.type === "error"
                            )
                            .map(
                                rule => ({
                                    fieldId:
                                        field.id,
                                    message:
                                        rule.message
                                })
                            )
                );

            return {
                mappedStepCount:
                    workflowSteps.length,
                mappedFieldCount:
                    fields.length,
                requiredFieldCount:
                    requiredFields.length,
                incompleteFieldIds:
                    incompleteFields.map(
                        field =>
                            field.id
                    ),
                unapprovedFieldIds:
                    unapprovedFields.map(
                        field =>
                            field.id
                    ),
                validationIssues,
                valid:
                    incompleteFields.length === 0 &&
                    unapprovedFields.length === 0 &&
                    validationIssues.length === 0
            };
        },

        createPortalSubmissionPackage(
            opportunityId
        ) {
            const opportunity =
                this.getOpportunityById(
                    opportunityId
                );
            const applicationPackage =
                opportunity
                    ?.executiveApplicationPackage;
            const portalIntelligence =
                opportunity
                    ?.submissionPortalIntelligence;

            if (
                !applicationPackage ||
                !portalIntelligence
            ) {
                return {
                    success: false,
                    error:
                        "Application package and portal intelligence are required."
                };
            }

            portalIntelligence
                .validationSummary =
                this.validatePortalMapping(
                    portalIntelligence
                        .workflowSteps
                );

            const portalPackage = {
                schema:
                    "meos.grant-office.portal-submission-package.v1",
                version:
                    this.version,
                buildId:
                    this.buildId,
                id:
                    this.createId(
                        "portal-submission-package"
                    ),
                opportunityId:
                    opportunity.id,
                applicationPackageId:
                    applicationPackage.id,
                portalIntelligenceId:
                    portalIntelligence.id,
                createdAt:
                    this.now(),
                portal:
                    this.clone(
                        portalIntelligence.portal
                    ),
                workflow:
                    this.clone(
                        portalIntelligence.workflowSteps
                    ),
                fieldMap:
                    portalIntelligence
                        .fields
                        .map(field => ({
                            portalFieldId:
                                field.id,
                            sourceQuestionId:
                                field.sourceQuestionId,
                            sourceDocumentId:
                                field.sourceDocumentId,
                            type:
                                field.type,
                            required:
                                field.required,
                            completed:
                                field.completed,
                            approved:
                                field.approved,
                            value:
                                field.value,
                            limits:
                                this.clone(
                                    field.limits
                                )
                        })),
                validation:
                    this.clone(
                        portalIntelligence
                            .validationSummary
                    ),
                executiveAuthorization:
                    this.clone(
                        portalIntelligence
                            .authorization
                    ),
                submissionState:
                    portalIntelligence
                        .authorization
                        .authorized === true &&
                    portalIntelligence
                        .validationSummary
                        .valid === true &&
                    applicationPackage
                        .readiness
                        .readyForSubmission === true
                        ? SUBMISSION_PORTAL_STATES.READY_TO_SUBMIT
                        : SUBMISSION_PORTAL_STATES.EXECUTIVE_REVIEW_REQUIRED,
                finalSubmitBlocked:
                    true,
                finalSubmitBlockReason:
                    "Final submission remains blocked until explicit executive authorization is recorded at the time of submission."
            };

            opportunity
                .portalSubmissionPackage =
                portalPackage;
            opportunity.updatedAt =
                this.now();

            this.analytics
                .portalSubmissionPackagesCreated += 1;
            this.persistIfEnabled();

            return {
                success: true,
                portalSubmissionPackage:
                    this.clone(
                        portalPackage
                    )
            };
        },

        authorizePortalSubmission(
            opportunityId,
            authorization = {}
        ) {
            const opportunity =
                this.getOpportunityById(
                    opportunityId
                );
            const portalIntelligence =
                opportunity
                    ?.submissionPortalIntelligence;
            const applicationPackage =
                opportunity
                    ?.executiveApplicationPackage;

            if (
                !portalIntelligence ||
                !applicationPackage
            ) {
                return {
                    success: false,
                    error:
                        "Portal intelligence and application package are required."
                };
            }

            const authorizedBy =
                String(
                    authorization.authorizedBy ||
                    ""
                ).trim();

            if (!authorizedBy) {
                return {
                    success: false,
                    error:
                        "Portal submission authorization requires authorizedBy."
                };
            }

            portalIntelligence
                .validationSummary =
                this.validatePortalMapping(
                    portalIntelligence
                        .workflowSteps
                );

            if (
                applicationPackage
                    .readiness
                    .readyForSubmission !== true ||
                portalIntelligence
                    .validationSummary
                    .valid !== true
            ) {
                this.analytics
                    .portalAuthorizationBlocksTriggered += 1;

                return {
                    success: false,
                    error:
                        "Portal submission authorization is blocked until the application package and portal mapping are complete.",
                    code:
                        "GRANT_PORTAL_AUTHORIZATION_BLOCKED",
                    packageReadiness:
                        this.clone(
                            applicationPackage
                                .readiness
                        ),
                    portalValidation:
                        this.clone(
                            portalIntelligence
                                .validationSummary
                        )
                };
            }

            portalIntelligence.authorization = {
                required:
                    true,
                authorized:
                    true,
                authorizedBy,
                authorizedAt:
                    authorization.authorizedAt ||
                    this.now(),
                scope:
                    authorization.scope ||
                    "populate-and-submit"
            };
            portalIntelligence.state =
                SUBMISSION_PORTAL_STATES.AUTHORIZED;
            portalIntelligence
                .submissionControl = {
                    finalSubmitBlocked:
                        true,
                    reason:
                        "Execution still requires a separate final submit command from the authorized executive."
                };

            this.persistIfEnabled();

            return {
                success: true,
                portalIntelligence:
                    this.clone(
                        portalIntelligence
                    )
            };
        },

        markPortalFieldComplete(
            opportunityId,
            fieldId,
            update = {}
        ) {
            const opportunity =
                this.getOpportunityById(
                    opportunityId
                );
            const portalIntelligence =
                opportunity
                    ?.submissionPortalIntelligence;

            if (!portalIntelligence) {
                return {
                    success: false,
                    error:
                        "Submission portal intelligence has not been created."
                };
            }

            const field =
                portalIntelligence
                    .fields
                    .find(
                        item =>
                            item.id === fieldId
                    );

            if (!field) {
                return {
                    success: false,
                    error:
                        "Portal field not found."
                };
            }

            if (
                field.executiveApprovalRequired &&
                update.approved !== true &&
                field.approved !== true
            ) {
                return {
                    success: false,
                    error:
                        "This portal field requires executive approval.",
                    code:
                        "GRANT_PORTAL_FIELD_APPROVAL_REQUIRED"
                };
            }

            if (
                Object.prototype.hasOwnProperty.call(
                    update,
                    "value"
                )
            ) {
                field.value =
                    update.value;
            }

            if (
                Object.prototype.hasOwnProperty.call(
                    update,
                    "approved"
                )
            ) {
                field.approved =
                    update.approved === true;
            }

            field.completed =
                update.completed !== false &&
                (
                    field.type ===
                        SUBMISSION_FIELD_TYPES.FILE ||
                    field.type ===
                        SUBMISSION_FIELD_TYPES.SIGNATURE ||
                    field.type ===
                        SUBMISSION_FIELD_TYPES.CERTIFICATION
                        ? update.completed === true ||
                          field.approved === true
                        : field.value !== null &&
                          String(field.value).trim() !== ""
                );

            portalIntelligence
                .validationSummary =
                this.validatePortalMapping(
                    portalIntelligence
                        .workflowSteps
                );

            this.persistIfEnabled();

            return {
                success: true,
                field:
                    this.clone(
                        field
                    ),
                validationSummary:
                    this.clone(
                        portalIntelligence
                            .validationSummary
                    )
            };
        },

        requestFinalPortalSubmission(
            opportunityId,
            command = {}
        ) {
            const opportunity =
                this.getOpportunityById(
                    opportunityId
                );
            const portalIntelligence =
                opportunity
                    ?.submissionPortalIntelligence;
            const portalPackage =
                opportunity
                    ?.portalSubmissionPackage;

            if (
                !portalIntelligence ||
                !portalPackage
            ) {
                return {
                    success: false,
                    error:
                        "Portal submission package has not been created."
                };
            }

            if (
                portalIntelligence
                    .authorization
                    .authorized !== true
            ) {
                this.analytics
                    .portalAuthorizationBlocksTriggered += 1;

                return {
                    success: false,
                    error:
                        "Final portal submission is blocked without explicit executive authorization.",
                    code:
                        "GRANT_PORTAL_FINAL_SUBMISSION_BLOCKED"
                };
            }

            const confirmedBy =
                String(
                    command.confirmedBy ||
                    ""
                ).trim();

            if (
                confirmedBy !==
                portalIntelligence
                    .authorization
                    .authorizedBy
            ) {
                return {
                    success: false,
                    error:
                        "Final submission confirmation must come from the authorized executive.",
                    code:
                        "GRANT_PORTAL_FINAL_CONFIRMATION_REQUIRED"
                };
            }

            portalPackage
                .finalSubmitBlocked =
                false;
            portalPackage
                .finalSubmitBlockReason =
                null;
            portalPackage
                .submissionState =
                SUBMISSION_PORTAL_STATES.READY_TO_SUBMIT;
            portalPackage
                .finalSubmitAuthorization = {
                    confirmedBy,
                    confirmedAt:
                        command.confirmedAt ||
                        this.now(),
                    command:
                        "authorized-final-submit"
                };

            this.persistIfEnabled();

            return {
                success: true,
                readyForExecution:
                    true,
                portalSubmissionPackage:
                    this.clone(
                        portalPackage
                    )
            };
        },

        startEndToEndFundingExecution(
            opportunityId,
            options = {}
        ) {
            const opportunity =
                this.getOpportunityById(
                    opportunityId
                );

            if (!opportunity) {
                return {
                    success: false,
                    error:
                        "Funding opportunity was not found.",
                    code:
                        "GRANT_END_TO_END_OPPORTUNITY_NOT_FOUND"
                };
            }

            const applicationPackage =
                opportunity
                    .executiveApplicationPackage;

            if (!applicationPackage) {
                return {
                    success: false,
                    error:
                        "Executive Application Package must be assembled before portal execution can begin.",
                    code:
                        "GRANT_END_TO_END_APPLICATION_PACKAGE_REQUIRED"
                };
            }

            let portalIntelligence =
                opportunity
                    .submissionPortalIntelligence;

            if (!portalIntelligence) {
                const analysis =
                    this.analyzeSubmissionPortal(
                        opportunityId,
                        options.portal || {}
                    );

                if (!analysis.success) {
                    return analysis;
                }

                portalIntelligence =
                    this.getOpportunityById(
                        opportunityId
                    )
                        .submissionPortalIntelligence;
            }

            let portalSubmissionPackage =
                opportunity
                    .portalSubmissionPackage;

            if (!portalSubmissionPackage) {
                const packaging =
                    this.createPortalSubmissionPackage(
                        opportunityId
                    );

                if (!packaging.success) {
                    return packaging;
                }

                portalSubmissionPackage =
                    this.getOpportunityById(
                        opportunityId
                    )
                        .portalSubmissionPackage;
            }

            const adapter =
                global.GrantPortalExecutionAdapter;

            if (
                !adapter ||
                typeof adapter.execute !==
                    "function"
            ) {
                return {
                    success: false,
                    error:
                        "Grant Portal Execution Adapter is not online.",
                    code:
                        "GRANT_END_TO_END_EXECUTION_ADAPTER_REQUIRED"
                };
            }

            const execution =
                adapter.execute({
                    opportunityId:
                        opportunity.id,
                    applicationPackage:
                        this.clone(
                            applicationPackage
                        ),
                    portalIntelligence:
                        this.clone(
                            portalIntelligence
                        ),
                    portalSubmissionPackage:
                        this.clone(
                            portalSubmissionPackage
                        ),
                    finalSubmissionAuthorized:
                        portalSubmissionPackage
                            .finalSubmitBlocked ===
                        false,
                    metadata: {
                        initiatedBy:
                            options.initiatedBy ||
                            "Maddy",
                        initiatedAt:
                            this.now(),
                        source:
                            "MEOS Grant Office end-to-end funding pipeline",
                        humanApprovalRequired:
                            true
                    }
                });

            if (!execution.success) {
                return execution;
            }

            const timestamp =
                this.now();

            opportunity.endToEndFundingExecution = {
                schema:
                    "meos.grant-office.end-to-end-execution.v1",
                version:
                    this.version,
                buildId:
                    this.buildId,
                opportunityId:
                    opportunity.id,
                applicationPackageId:
                    applicationPackage.id,
                portalSubmissionPackageId:
                    portalSubmissionPackage.id,
                grantPortalSessionId:
                    execution.details
                        ?.grantPortalSessionId ||
                    null,
                providerType:
                    execution.details
                        ?.providerType ||
                    portalIntelligence.portal
                        ?.type ||
                    "unknown",
                state:
                    execution.checkpoint ||
                    "created",
                paused:
                    execution.paused === true,
                nextAction:
                    execution.details
                        ?.nextAction ||
                    "review",
                humanApprovalRequired:
                    true,
                finalSubmissionAuthorized:
                    portalSubmissionPackage
                        .finalSubmitBlocked ===
                    false,
                createdAt:
                    timestamp,
                updatedAt:
                    timestamp,
                history: [
                    {
                        state:
                            execution.checkpoint ||
                            "created",
                        enteredAt:
                            timestamp,
                        actor:
                            options.initiatedBy ||
                            "Maddy",
                        note:
                            "Grant Office handed the approved application package to the governed portal execution layer."
                    }
                ]
            };

            opportunity.updatedAt =
                timestamp;
            this.persistIfEnabled();

            return {
                success: true,
                paused:
                    execution.paused === true,
                checkpoint:
                    execution.checkpoint,
                nextAction:
                    execution.details
                        ?.nextAction ||
                    null,
                grantPortalSessionId:
                    execution.details
                        ?.grantPortalSessionId ||
                    null,
                endToEndFundingExecution:
                    this.clone(
                        opportunity
                            .endToEndFundingExecution
                    )
            };
        },

        refreshEndToEndFundingExecution(
            opportunityId
        ) {
            const opportunity =
                this.getOpportunityById(
                    opportunityId
                );
            const orchestration =
                opportunity
                    ?.endToEndFundingExecution;
            const adapter =
                global.GrantPortalExecutionAdapter;

            if (
                !opportunity ||
                !orchestration ||
                !adapter ||
                typeof adapter.getSessionById !==
                    "function"
            ) {
                return {
                    success: false,
                    error:
                        "End-to-end portal execution session is not available.",
                    code:
                        "GRANT_END_TO_END_SESSION_NOT_FOUND"
                };
            }

            const session =
                adapter.getSessionById(
                    orchestration
                        .grantPortalSessionId
                );

            if (!session) {
                return {
                    success: false,
                    error:
                        "Grant portal execution session was not found.",
                    code:
                        "GRANT_END_TO_END_PORTAL_SESSION_NOT_FOUND"
                };
            }

            const timestamp =
                this.now();
            const stateChanged =
                orchestration.state !==
                session.status;

            orchestration.state =
                session.status;
            orchestration.paused =
                session.status ===
                    "paused" ||
                session.status ===
                    "authentication-required" ||
                session.status ===
                    "ready-for-executive-review" ||
                session.status ===
                    "ready-for-submission";
            orchestration.nextAction =
                session.status ===
                    "authentication-required"
                    ? "authenticate"
                    : session.status ===
                        "ready-for-executive-review"
                        ? "executive-review"
                        : session.status ===
                            "ready-for-submission"
                            ? "final-submit-approval"
                            : session.status ===
                                "submitted" ||
                              session.status ===
                                "complete"
                                ? "capture-and-sync-receipt"
                                : "continue-portal-execution";
            orchestration
                .finalSubmissionAuthorized =
                session
                    .finalSubmissionAuthorized ===
                true;
            orchestration.updatedAt =
                timestamp;

            if (stateChanged) {
                orchestration.history.push({
                    state:
                        session.status,
                    enteredAt:
                        timestamp,
                    actor:
                        "MEOS Grant Office",
                    note:
                        "Grant Office synchronized the governed portal execution session."
                });
            }

            this.persistIfEnabled();

            return {
                success: true,
                session:
                    this.clone(session),
                endToEndFundingExecution:
                    this.clone(
                        orchestration
                    )
            };
        },

        completeEndToEndFundingExecution(
            opportunityId,
            details = {}
        ) {
            const opportunity =
                this.getOpportunityById(
                    opportunityId
                );
            const orchestration =
                opportunity
                    ?.endToEndFundingExecution;
            const adapter =
                global.GrantPortalExecutionAdapter;

            if (
                !opportunity ||
                !orchestration ||
                !adapter
            ) {
                return {
                    success: false,
                    error:
                        "End-to-end funding execution has not been started.",
                    code:
                        "GRANT_END_TO_END_EXECUTION_NOT_STARTED"
                };
            }

            const session =
                adapter.getSessionById?.(
                    orchestration
                        .grantPortalSessionId
                );
            const receipt =
                adapter.receipts?.find(
                    item =>
                        item.sessionId ===
                        orchestration
                            .grantPortalSessionId
                ) || null;

            if (
                !session ||
                ![
                    "submitted",
                    "complete"
                ].includes(
                    session.status
                )
            ) {
                return {
                    success: false,
                    error:
                        "The live portal execution has not reached a submitted state.",
                    code:
                        "GRANT_END_TO_END_SUBMISSION_NOT_COMPLETE"
                };
            }

            const submittedBy =
                String(
                    details.submittedBy ||
                    session
                        .finalSubmissionAuthorization
                        ?.authorizedBy ||
                    ""
                ).trim();

            if (!submittedBy) {
                return {
                    success: false,
                    error:
                        "A verified submitting executive is required.",
                    code:
                        "GRANT_END_TO_END_SUBMITTER_REQUIRED"
                };
            }

            const recorded =
                this.recordAuthorizedSubmission(
                    opportunityId,
                    {
                        submittedBy,
                        submittedAt:
                            receipt?.submittedAt ||
                            details.submittedAt ||
                            this.now(),
                        method:
                            session.providerType ||
                            details.method,
                        confirmationNumber:
                            receipt
                                ?.confirmationNumber ||
                            details
                                .confirmationNumber ||
                            "",
                        receiptDocumentId:
                            details
                                .receiptDocumentId ||
                            null,
                        receiptVerified:
                            Boolean(
                                receipt ||
                                details
                                    .receiptVerified
                            ),
                        requestedAmount:
                            details
                                .requestedAmount,
                        notes:
                            details.notes ||
                            "Submission synchronized from the MEOS Grant Portal Execution Adapter."
                    }
                );

            if (!recorded.success) {
                return recorded;
            }

            orchestration.state =
                "complete";
            orchestration.paused =
                false;
            orchestration.nextAction =
                "monitor-award-and-funding-receipt";
            orchestration.completedAt =
                this.now();
            orchestration.updatedAt =
                orchestration.completedAt;
            orchestration.history.push({
                state:
                    "complete",
                enteredAt:
                    orchestration.completedAt,
                actor:
                    "MEOS Grant Office",
                note:
                    "Verified portal submission was synchronized into award monitoring."
            });

            this.persistIfEnabled();

            return {
                success: true,
                submissionExecution:
                    recorded
                        .submissionExecution,
                awardTracking:
                    recorded.awardTracking,
                pipelineStage:
                    recorded.pipelineStage,
                endToEndFundingExecution:
                    this.clone(
                        orchestration
                    )
            };
        },

        runEndToEndExecutionBridgeAcceptanceTest() {
            const adapter =
                global.GrantPortalExecutionAdapter;

            if (
                !adapter ||
                typeof adapter.execute !==
                    "function"
            ) {
                return {
                    success: false,
                    error:
                        "Grant Portal Execution Adapter is required for this acceptance test."
                };
            }

            const originalPersistence =
                this.configuration
                    .automaticPersistence;
            const testId =
                this.createId(
                    "end-to-end-bridge-test"
                );

            this.configuration
                .automaticPersistence =
                false;

            try {
                this.addOpportunity({
                    id:
                        testId,
                    title:
                        "Community Foundation End-to-End Bridge Test",
                    provider:
                        "Acceptance Test Community Foundation",
                    type:
                        OPPORTUNITY_TYPES
                            .COMMUNITY_FOUNDATION,
                    verified:
                        true,
                    awardAmount:
                        50000,
                    sourceUrl:
                        "https://example.org/apply"
                });

                const opportunity =
                    this.getOpportunityById(
                        testId
                    );

                opportunity
                    .executiveApplicationPackage = {
                        id:
                            "application-package-test",
                        opportunityId:
                            testId,
                        executiveReviewApproved:
                            false,
                        readiness: {
                            readyForSubmission:
                                false
                        },
                        attachmentIndex:
                            [],
                        certificationPacket:
                            [],
                        signaturePacket:
                            []
                    };
                opportunity
                    .submissionPortalIntelligence = {
                        id:
                            "portal-intelligence-test",
                        portal: {
                            type:
                                SUBMISSION_PORTAL_TYPES
                                    .GENERIC_WEB_PORTAL,
                            name:
                                "Acceptance Test Portal",
                            requiresAuthentication:
                                true
                        },
                        workflowSteps:
                            [],
                        fields:
                            [],
                        validationSummary: {
                            valid:
                                false
                        },
                        authorization: {
                            required:
                                true,
                            authorized:
                                false
                        }
                    };

                const packageResult =
                    this.createPortalSubmissionPackage(
                        testId
                    );
                const executionResult =
                    this.startEndToEndFundingExecution(
                        testId,
                        {
                            initiatedBy:
                                "Acceptance Test Maddy"
                        }
                    );
                const stored =
                    this.getOpportunityById(
                        testId
                    );
                const session =
                    adapter.getSessionById?.(
                        executionResult
                            .grantPortalSessionId
                    );

                const checks = [
                    {
                        name:
                            "Portal submission package created",
                        passed:
                            packageResult.success ===
                            true
                    },
                    {
                        name:
                            "Grant Office handed package to portal adapter",
                        passed:
                            executionResult.success ===
                                true &&
                            Boolean(
                                executionResult
                                    .grantPortalSessionId
                            )
                    },
                    {
                        name:
                            "Execution paused at governed checkpoint",
                        passed:
                            executionResult.paused ===
                                true &&
                            session
                                ?.status ===
                                "authentication-required"
                    },
                    {
                        name:
                            "Human approval remains required",
                        passed:
                            stored
                                .endToEndFundingExecution
                                .humanApprovalRequired ===
                                true &&
                            session
                                ?.finalSubmissionAuthorized !==
                                true
                    },
                    {
                        name:
                            "Grant Office preserved execution ownership",
                        passed:
                            stored
                                .endToEndFundingExecution
                                .opportunityId ===
                                testId
                    }
                ];

                return {
                    success:
                        checks.every(
                            check =>
                                check.passed
                        ),
                    schema:
                        "meos.grant-office.end-to-end-execution-bridge-acceptance.v1",
                    version:
                        this.version,
                    buildId:
                        this.buildId,
                    passed:
                        checks.filter(
                            check =>
                                check.passed
                        ).length,
                    total:
                        checks.length,
                    checks
                };
            } finally {
                this.configuration
                    .automaticPersistence =
                    originalPersistence;
                this.opportunities =
                    this.opportunities.filter(
                        item =>
                            item.id !== testId
                    );
            }
        },

        calculateRequestedAmount(opportunity) {
            return (
                opportunity.awardAmount ||
                opportunity.awardMaximum ||
                opportunity.awardMinimum ||
                0
            );
        },

        createSubmissionFingerprint(
            opportunity,
            details = {}
        ) {
            const normalized = [
                opportunity.id,
                details.portalType ||
                    opportunity
                        .submissionPortalIntelligence
                        ?.portal
                        ?.type ||
                    "unknown",
                details.confirmationNumber ||
                    "",
                details.applicationPackageId ||
                    opportunity
                        .executiveApplicationPackage
                        ?.id ||
                    ""
            ]
                .map(value =>
                    this.normalizeText(
                        String(value || "")
                    )
                )
                .join("|");

            let hash = 0;

            for (
                let index = 0;
                index < normalized.length;
                index += 1
            ) {
                hash =
                    (
                        (
                            hash << 5
                        ) -
                        hash
                    ) +
                    normalized.charCodeAt(
                        index
                    );
                hash |= 0;
            }

            return `submission-${Math.abs(hash)}`;
        },

        recordAuthorizedSubmission(
            opportunityId,
            details = {}
        ) {
            const opportunity =
                this.getOpportunityById(
                    opportunityId
                );
            const portalIntelligence =
                opportunity
                    ?.submissionPortalIntelligence;
            const portalPackage =
                opportunity
                    ?.portalSubmissionPackage;
            const applicationPackage =
                opportunity
                    ?.executiveApplicationPackage;

            if (
                !opportunity ||
                !portalIntelligence ||
                !portalPackage ||
                !applicationPackage
            ) {
                return {
                    success: false,
                    error:
                        "Submission requires opportunity, application package, portal intelligence, and portal package.",
                    code:
                        "GRANT_SUBMISSION_PREREQUISITES_MISSING"
                };
            }

            if (
                portalPackage
                    .finalSubmitBlocked !== false ||
                portalIntelligence
                    .authorization
                    .authorized !== true
            ) {
                this.analytics
                    .submissionBlocksTriggered += 1;

                return {
                    success: false,
                    error:
                        "Submission execution is blocked until final executive authorization is complete.",
                    code:
                        "GRANT_SUBMISSION_EXECUTION_BLOCKED"
                };
            }

            const submittedBy =
                String(
                    details.submittedBy ||
                    ""
                ).trim();

            if (!submittedBy) {
                return {
                    success: false,
                    error:
                        "Submission execution requires submittedBy."
                };
            }

            const submittedAt =
                details.submittedAt ||
                this.now();

            const fingerprint =
                this.createSubmissionFingerprint(
                    opportunity,
                    {
                        ...details,
                        submittedAt
                    }
                );

            const existingSubmissionState =
                opportunity
                    .submissionExecution
                    ?.state;

            const completedSubmissionExists =
                [
                    SUBMISSION_EXECUTION_STATES.SUBMITTED,
                    SUBMISSION_EXECUTION_STATES.RECEIPT_VERIFIED
                ].includes(
                    existingSubmissionState
                );

            if (
                opportunity
                    .submissionExecution
                    ?.fingerprint ===
                    fingerprint ||
                (
                    completedSubmissionExists &&
                    details.allowResubmission !== true
                )
            ) {
                this.analytics
                    .duplicateSubmissionsBlocked += 1;

                return {
                    success: false,
                    error:
                        "Duplicate submission blocked.",
                    code:
                        "GRANT_DUPLICATE_SUBMISSION_BLOCKED",
                    existingSubmission:
                        this.clone(
                            opportunity
                                .submissionExecution
                        )
                };
            }

            const requestedAmount =
                this.numberOrNull(
                    details.requestedAmount
                ) ??
                this.calculateRequestedAmount(
                    opportunity
                );

            const execution = {
                schema:
                    "meos.grant-office.submission-execution.v1",
                version:
                    this.version,
                buildId:
                    this.buildId,
                id:
                    this.createId(
                        "submission-execution"
                    ),
                opportunityId:
                    opportunity.id,
                applicationPackageId:
                    applicationPackage.id,
                portalSubmissionPackageId:
                    portalPackage.id,
                state:
                    SUBMISSION_EXECUTION_STATES.SUBMITTED,
                submittedAt,
                submittedBy,
                method:
                    details.method ||
                    portalIntelligence
                        .portal
                        .type ||
                    "unknown",
                portalType:
                    portalIntelligence
                        .portal
                        .type,
                portalName:
                    portalIntelligence
                        .portal
                        .name,
                confirmationNumber:
                    String(
                        details.confirmationNumber ||
                        ""
                    ),
                receiptDocumentId:
                    details.receiptDocumentId ||
                    null,
                receiptVerified:
                    details.receiptVerified === true,
                requestedAmount,
                fingerprint,
                notes:
                    String(
                        details.notes || ""
                    ),
                history: [
                    {
                        state:
                            SUBMISSION_EXECUTION_STATES.SUBMITTED,
                        enteredAt:
                            submittedAt,
                        actor:
                            submittedBy,
                        note:
                            "Authorized application submission recorded."
                    }
                ]
            };

            if (
                execution.receiptVerified
            ) {
                execution.state =
                    SUBMISSION_EXECUTION_STATES.RECEIPT_VERIFIED;
                execution.history.push({
                    state:
                        SUBMISSION_EXECUTION_STATES.RECEIPT_VERIFIED,
                    enteredAt:
                        submittedAt,
                    actor:
                        submittedBy,
                    note:
                        "Submission receipt verified at execution."
                });
                this.analytics
                    .submissionReceiptsVerified += 1;
            }

            opportunity.submissionExecution =
                execution;
            opportunity.status =
                "submitted";
            opportunity.updatedAt =
                this.now();

            this.ensurePipelineRecord(
                opportunity
            );

            if (
                opportunity.pipelineStage ===
                PIPELINE_STAGES.PREPARING
            ) {
                opportunity.pipelineStage =
                    PIPELINE_STAGES.SUBMITTED;
                this.appendPipelineHistory(
                    opportunity,
                    PIPELINE_STAGES.SUBMITTED,
                    {
                        actor:
                            submittedBy,
                        authority:
                            "authorized-submission",
                        note:
                            "Application submission recorded."
                    }
                );
            }

            opportunity.awardTracking = {
                schema:
                    "meos.grant-office.award-tracking.v1",
                version:
                    this.version,
                buildId:
                    this.buildId,
                opportunityId:
                    opportunity.id,
                submissionExecutionId:
                    execution.id,
                decisionState:
                    AWARD_DECISION_STATES.AWARD_PENDING,
                requestedAmount,
                awardedAmount:
                    null,
                decisionAt:
                    null,
                decisionBy:
                    null,
                decisionReference:
                    null,
                conditions:
                    [],
                paymentSchedule:
                    [],
                outstandingRequirements:
                    [],
                receiptState:
                    FUNDING_RECEIPT_STATES.NOT_RECEIVED,
                totalReceived:
                    0,
                balanceRemaining:
                    null,
                history: [
                    {
                        state:
                            AWARD_DECISION_STATES.AWARD_PENDING,
                        enteredAt:
                            submittedAt,
                        actor:
                            "MEOS Grant Office",
                        note:
                            "Award decision monitoring started."
                    }
                ]
            };

            if (
                opportunity.pipelineStage ===
                PIPELINE_STAGES.SUBMITTED
            ) {
                opportunity.pipelineStage =
                    PIPELINE_STAGES.AWARD_PENDING;
                this.appendPipelineHistory(
                    opportunity,
                    PIPELINE_STAGES.AWARD_PENDING,
                    {
                        actor:
                            "MEOS Grant Office",
                        authority:
                            "award-monitoring",
                        note:
                            "Submission moved into award-pending monitoring."
                    }
                );
            }

            this.analytics
                .submissionExecutionsRecorded += 1;
            this.analytics
                .submittedValue +=
                Number(
                    requestedAmount || 0
                );
            this.analytics
                .pendingAwardValue +=
                Number(
                    requestedAmount || 0
                );
            this.analytics
                .lastSubmissionExecutionAt =
                submittedAt;

            this.recalculatePipelineAnalytics();
            this.persistIfEnabled();

            return {
                success: true,
                submissionExecution:
                    this.clone(
                        execution
                    ),
                awardTracking:
                    this.clone(
                        opportunity
                            .awardTracking
                    ),
                pipelineStage:
                    opportunity.pipelineStage
            };
        },

        verifySubmissionReceipt(
            opportunityId,
            details = {}
        ) {
            const opportunity =
                this.getOpportunityById(
                    opportunityId
                );
            const execution =
                opportunity
                    ?.submissionExecution;

            if (!execution) {
                return {
                    success: false,
                    error:
                        "Submission execution record not found."
                };
            }

            execution.receiptVerified =
                true;
            execution.receiptDocumentId =
                details.receiptDocumentId ||
                execution.receiptDocumentId ||
                null;
            execution.confirmationNumber =
                String(
                    details.confirmationNumber ||
                    execution.confirmationNumber ||
                    ""
                );
            execution.state =
                SUBMISSION_EXECUTION_STATES.RECEIPT_VERIFIED;
            execution.history.push({
                state:
                    SUBMISSION_EXECUTION_STATES.RECEIPT_VERIFIED,
                enteredAt:
                    details.verifiedAt ||
                    this.now(),
                actor:
                    details.verifiedBy ||
                    "MEOS Grant Office",
                note:
                    details.note ||
                    "Submission receipt verified."
            });

            this.analytics
                .submissionReceiptsVerified += 1;
            this.persistIfEnabled();

            return {
                success: true,
                submissionExecution:
                    this.clone(
                        execution
                    )
            };
        },

        recordAwardDecision(
            opportunityId,
            decision = {}
        ) {
            const opportunity =
                this.getOpportunityById(
                    opportunityId
                );
            const tracking =
                opportunity
                    ?.awardTracking;

            if (
                !opportunity ||
                !tracking
            ) {
                return {
                    success: false,
                    error:
                        "Award tracking has not started."
                };
            }

            const state =
                String(
                    decision.state ||
                    ""
                ).trim();

            if (
                ![
                    AWARD_DECISION_STATES.AWARDED,
                    AWARD_DECISION_STATES.DECLINED,
                    AWARD_DECISION_STATES.WITHDRAWN
                ].includes(state)
            ) {
                return {
                    success: false,
                    error:
                        "Award decision must be awarded, declined, or withdrawn."
                };
            }

            const decidedAt =
                decision.decidedAt ||
                this.now();

            tracking.decisionState =
                state;
            tracking.decisionAt =
                decidedAt;
            tracking.decisionBy =
                String(
                    decision.decidedBy ||
                    decision.provider ||
                    opportunity.provider ||
                    ""
                );
            tracking.decisionReference =
                decision.reference ||
                decision.referenceNumber ||
                null;
            tracking.conditions =
                this.uniqueStrings(
                    decision.conditions || []
                );
            tracking.outstandingRequirements =
                this.uniqueStrings(
                    decision.outstandingRequirements ||
                    []
                );
            tracking.paymentSchedule =
                Array.isArray(
                    decision.paymentSchedule
                )
                    ? this.clone(
                        decision.paymentSchedule
                    )
                    : [];

            if (
                state ===
                AWARD_DECISION_STATES.AWARDED
            ) {
                const awardedAmount =
                    this.numberOrNull(
                        decision.awardedAmount
                    );

                if (
                    awardedAmount === null ||
                    awardedAmount < 0
                ) {
                    return {
                        success: false,
                        error:
                            "Awarded decisions require a valid awardedAmount."
                    };
                }

                tracking.awardedAmount =
                    awardedAmount;
                tracking.balanceRemaining =
                    awardedAmount -
                    Number(
                        tracking.totalReceived ||
                        0
                    );
                opportunity.status =
                    "awarded";

                this.ensurePipelineRecord(
                    opportunity
                );

                if (
                    opportunity.pipelineStage ===
                    PIPELINE_STAGES.AWARD_PENDING
                ) {
                    opportunity.pipelineStage =
                        PIPELINE_STAGES.AWARDED;
                    this.appendPipelineHistory(
                        opportunity,
                        PIPELINE_STAGES.AWARDED,
                        {
                            actor:
                                tracking.decisionBy ||
                                "Funding Provider",
                            authority:
                                "award-decision",
                            note:
                                `Award recorded for ${awardedAmount}.`
                        }
                    );
                }

                this.analytics
                    .awardedValue +=
                    awardedAmount;
                this.analytics
                    .pendingAwardValue =
                    Math.max(
                        0,
                        this.analytics
                            .pendingAwardValue -
                        Number(
                            tracking.requestedAmount ||
                            0
                        )
                    );
            } else {
                tracking.awardedAmount =
                    0;
                tracking.balanceRemaining =
                    0;
                opportunity.status =
                    state;

                this.ensurePipelineRecord(
                    opportunity
                );

                const targetStage =
                    state ===
                    AWARD_DECISION_STATES.DECLINED
                        ? PIPELINE_STAGES.DECLINED
                        : PIPELINE_STAGES.WITHDRAWN;

                if (
                    opportunity.pipelineStage ===
                    PIPELINE_STAGES.AWARD_PENDING
                ) {
                    opportunity.pipelineStage =
                        targetStage;
                    this.appendPipelineHistory(
                        opportunity,
                        targetStage,
                        {
                            actor:
                                tracking.decisionBy ||
                                "Funding Provider",
                            authority:
                                "award-decision",
                            note:
                                `Award decision recorded: ${state}.`
                        }
                    );
                }

                this.analytics
                    .pendingAwardValue =
                    Math.max(
                        0,
                        this.analytics
                            .pendingAwardValue -
                        Number(
                            tracking.requestedAmount ||
                            0
                        )
                    );
            }

            tracking.history.push({
                state,
                enteredAt:
                    decidedAt,
                actor:
                    tracking.decisionBy ||
                    "Funding Provider",
                note:
                    decision.note ||
                    `Award decision recorded: ${state}.`
            });

            this.analytics
                .awardDecisionsRecorded += 1;
            this.analytics
                .lastAwardDecisionAt =
                decidedAt;

            this.recalculatePipelineAnalytics();
            this.persistIfEnabled();

            return {
                success: true,
                awardTracking:
                    this.clone(
                        tracking
                    ),
                pipelineStage:
                    opportunity.pipelineStage
            };
        },

        recordFundingReceipt(
            opportunityId,
            receipt = {}
        ) {
            const opportunity =
                this.getOpportunityById(
                    opportunityId
                );
            const tracking =
                opportunity
                    ?.awardTracking;

            if (
                !opportunity ||
                !tracking ||
                tracking.decisionState !==
                    AWARD_DECISION_STATES.AWARDED
            ) {
                return {
                    success: false,
                    error:
                        "Funding receipts require an awarded opportunity.",
                    code:
                        "GRANT_FUNDING_RECEIPT_REQUIRES_AWARD"
                };
            }

            const amount =
                this.numberOrNull(
                    receipt.amount
                );

            if (
                amount === null ||
                amount <= 0
            ) {
                return {
                    success: false,
                    error:
                        "Funding receipt amount must be greater than zero."
                };
            }

            const awardedAmount =
                Number(
                    tracking.awardedAmount ||
                    0
                );
            const currentReceived =
                Number(
                    tracking.totalReceived ||
                    0
                );

            if (
                currentReceived + amount >
                awardedAmount
            ) {
                return {
                    success: false,
                    error:
                        "Funding receipt exceeds the recorded award amount.",
                    code:
                        "GRANT_FUNDING_RECEIPT_EXCEEDS_AWARD"
                };
            }

            const record = {
                id:
                    this.createId(
                        "funding-receipt"
                    ),
                opportunityId:
                    opportunity.id,
                amount,
                receivedAt:
                    receipt.receivedAt ||
                    this.now(),
                receivedBy:
                    String(
                        receipt.receivedBy ||
                        "Organization"
                    ),
                method:
                    receipt.method ||
                    "unknown",
                reference:
                    receipt.reference ||
                    receipt.transactionId ||
                    null,
                restricted:
                    receipt.restricted !== false,
                conditions:
                    this.uniqueStrings(
                        receipt.conditions || []
                    ),
                note:
                    String(
                        receipt.note || ""
                    )
            };

            opportunity
                .fundingReceipts
                .push(record);

            tracking.totalReceived =
                currentReceived + amount;
            tracking.balanceRemaining =
                Math.max(
                    0,
                    awardedAmount -
                    tracking.totalReceived
                );

            tracking.receiptState =
                tracking.totalReceived >=
                awardedAmount
                    ? FUNDING_RECEIPT_STATES.FULLY_RECEIVED
                    : FUNDING_RECEIPT_STATES.PARTIALLY_RECEIVED;

            tracking.history.push({
                state:
                    tracking.receiptState,
                enteredAt:
                    record.receivedAt,
                actor:
                    record.receivedBy,
                note:
                    `Funding receipt recorded: ${amount}.`
            });

            this.analytics
                .fundsReceivedValue +=
                amount;
            this.analytics
                .lastFundsReceivedAt =
                record.receivedAt;

            this.persistIfEnabled();

            return {
                success: true,
                fundingReceipt:
                    this.clone(
                        record
                    ),
                awardTracking:
                    this.clone(
                        tracking
                    ),
                moneyReceived:
                    tracking.totalReceived,
                balanceRemaining:
                    tracking.balanceRemaining
            };
        },

        getFundingPerformanceMetrics() {
            const submissions =
                this.opportunities.filter(
                    item =>
                        item.submissionExecution
                );

            const awarded =
                submissions.filter(
                    item =>
                        item.awardTracking
                            ?.decisionState ===
                        AWARD_DECISION_STATES.AWARDED
                );

            const declined =
                submissions.filter(
                    item =>
                        item.awardTracking
                            ?.decisionState ===
                        AWARD_DECISION_STATES.DECLINED
                );

            const pending =
                submissions.filter(
                    item =>
                        item.awardTracking
                            ?.decisionState ===
                        AWARD_DECISION_STATES.AWARD_PENDING
                );

            const submittedValue =
                submissions.reduce(
                    (total, item) =>
                        total +
                        Number(
                            item.submissionExecution
                                ?.requestedAmount ||
                            0
                        ),
                    0
                );

            const awardedValue =
                awarded.reduce(
                    (total, item) =>
                        total +
                        Number(
                            item.awardTracking
                                ?.awardedAmount ||
                            0
                        ),
                    0
                );

            const fundsReceived =
                this.opportunities.reduce(
                    (total, item) =>
                        total +
                        (
                            item.fundingReceipts ||
                            []
                        ).reduce(
                            (sum, receipt) =>
                                sum +
                                Number(
                                    receipt.amount ||
                                    0
                                ),
                            0
                        ),
                    0
                );

            const decisionDurations =
                submissions
                    .filter(
                        item =>
                            item.submissionExecution
                                ?.submittedAt &&
                            item.awardTracking
                                ?.decisionAt
                    )
                    .map(
                        item =>
                            (
                                new Date(
                                    item.awardTracking
                                        .decisionAt
                                ).getTime() -
                                new Date(
                                    item.submissionExecution
                                        .submittedAt
                                ).getTime()
                            ) /
                            86400000
                    )
                    .filter(
                        value =>
                            Number.isFinite(
                                value
                            ) &&
                            value >= 0
                    );

            const awardToCashDurations =
                awarded
                    .filter(
                        item =>
                            item.awardTracking
                                ?.decisionAt &&
                            item.fundingReceipts
                                ?.length > 0
                    )
                    .map(
                        item =>
                            (
                                new Date(
                                    item.fundingReceipts[0]
                                        .receivedAt
                                ).getTime() -
                                new Date(
                                    item.awardTracking
                                        .decisionAt
                                ).getTime()
                            ) /
                            86400000
                    )
                    .filter(
                        value =>
                            Number.isFinite(
                                value
                            ) &&
                            value >= 0
                    );

            const average = values =>
                values.length > 0
                    ? this.roundNumber(
                        values.reduce(
                            (sum, value) =>
                                sum + value,
                            0
                        ) /
                        values.length,
                        2
                    )
                    : null;

            return {
                schema:
                    "meos.grant-office.funding-performance.v1",
                generatedAt:
                    this.now(),
                submissions:
                    submissions.length,
                awarded:
                    awarded.length,
                declined:
                    declined.length,
                pending:
                    pending.length,
                submittedValue,
                awardedValue,
                pendingValue:
                    pending.reduce(
                        (total, item) =>
                            total +
                            Number(
                                item.awardTracking
                                    ?.requestedAmount ||
                                0
                            ),
                        0
                    ),
                fundsReceived,
                outstandingAwardBalance:
                    awarded.reduce(
                        (total, item) =>
                            total +
                            Number(
                                item.awardTracking
                                    ?.balanceRemaining ||
                                0
                            ),
                        0
                    ),
                awardRate:
                    submissions.length > 0
                        ? this.roundNumber(
                            awarded.length /
                            submissions.length,
                            3
                        )
                        : 0,
                averageDaysSubmissionToDecision:
                    average(
                        decisionDurations
                    ),
                averageDaysAwardToFirstReceipt:
                    average(
                        awardToCashDurations
                    )
            };
        },

        runSubmissionAwardTrackingAcceptanceTest() {
            const originalPersistence =
                this.configuration
                    .automaticPersistence;
            const testId =
                this.createId(
                    "submission-award-test"
                );

            this.configuration
                .automaticPersistence =
                false;

            try {
                this.addOpportunity({
                    id:
                        testId,
                    title:
                        "Executive Submission and Award Tracking Test",
                    provider:
                        "Acceptance Test Foundation",
                    awardAmount:
                        100000,
                    verified:
                        true,
                    sourceUrl:
                        "https://example.org/test"
                });

                const opportunity =
                    this.getOpportunityById(
                        testId
                    );

                opportunity.pipelineStage =
                    PIPELINE_STAGES.PREPARING;
                opportunity.pipelineHistory =
                    this.normalizePipelineHistory(
                        [],
                        PIPELINE_STAGES.PREPARING,
                        this.now()
                    );

                opportunity
                    .executiveApplicationPackage = {
                        id:
                            "package-test",
                        readiness: {
                            readyForSubmission:
                                true
                        }
                    };

                opportunity
                    .submissionPortalIntelligence = {
                        portal: {
                            type:
                                SUBMISSION_PORTAL_TYPES.SUBMITTABLE,
                            name:
                                "Submittable"
                        },
                        authorization: {
                            authorized:
                                true,
                            authorizedBy:
                                "Acceptance Test Executive"
                        }
                    };

                opportunity
                    .portalSubmissionPackage = {
                        id:
                            "portal-package-test",
                        finalSubmitBlocked:
                            false
                    };

                const submission =
                    this.recordAuthorizedSubmission(
                        testId,
                        {
                            submittedBy:
                                "Acceptance Test Executive",
                            confirmationNumber:
                                "CONF-001",
                            receiptDocumentId:
                                "receipt-001",
                            receiptVerified:
                                true,
                            requestedAmount:
                                100000
                        }
                    );

                const duplicate =
                    this.recordAuthorizedSubmission(
                        testId,
                        {
                            submittedBy:
                                "Acceptance Test Executive",
                            confirmationNumber:
                                "CONF-001",
                            receiptDocumentId:
                                "receipt-001",
                            receiptVerified:
                                true,
                            requestedAmount:
                                100000
                        }
                    );

                const award =
                    this.recordAwardDecision(
                        testId,
                        {
                            state:
                                AWARD_DECISION_STATES.AWARDED,
                            awardedAmount:
                                80000,
                            decidedBy:
                                "Acceptance Test Foundation",
                            reference:
                                "AWARD-001",
                            conditions: [
                                "Quarterly reporting"
                            ],
                            paymentSchedule: [
                                {
                                    amount:
                                        40000,
                                    due:
                                        "installment-1"
                                },
                                {
                                    amount:
                                        40000,
                                    due:
                                        "installment-2"
                                }
                            ]
                        }
                    );

                const firstReceipt =
                    this.recordFundingReceipt(
                        testId,
                        {
                            amount:
                                40000,
                            receivedBy:
                                "Acceptance Test Organization",
                            reference:
                                "TX-001"
                        }
                    );

                const secondReceipt =
                    this.recordFundingReceipt(
                        testId,
                        {
                            amount:
                                40000,
                            receivedBy:
                                "Acceptance Test Organization",
                            reference:
                                "TX-002"
                        }
                    );

                const metrics =
                    this.getFundingPerformanceMetrics();

                const finalOpportunity =
                    this.getOpportunityById(
                        testId
                    );

                const checks = [
                    {
                        name:
                            "Authorized submission recorded",
                        passed:
                            submission.success === true &&
                            Boolean(
                                submission
                                    .submissionExecution
                                    .id
                            )
                    },
                    {
                        name:
                            "Submission receipt verified",
                        passed:
                            submission
                                .submissionExecution
                                .receiptVerified === true &&
                            submission
                                .submissionExecution
                                .state ===
                                SUBMISSION_EXECUTION_STATES.RECEIPT_VERIFIED
                    },
                    {
                        name:
                            "Pipeline advanced to award pending",
                        passed:
                            submission.pipelineStage ===
                            PIPELINE_STAGES.AWARD_PENDING
                    },
                    {
                        name:
                            "Duplicate submission blocked",
                        passed:
                            duplicate.success === false &&
                            duplicate.code ===
                            "GRANT_DUPLICATE_SUBMISSION_BLOCKED"
                    },
                    {
                        name:
                            "Award decision recorded",
                        passed:
                            award.success === true &&
                            award
                                .awardTracking
                                .decisionState ===
                                AWARD_DECISION_STATES.AWARDED
                    },
                    {
                        name:
                            "Awarded amount tracked",
                        passed:
                            award
                                .awardTracking
                                .awardedAmount ===
                            80000
                    },
                    {
                        name:
                            "Partial funding receipt tracked",
                        passed:
                            firstReceipt.success === true &&
                            firstReceipt
                                .awardTracking
                                .receiptState ===
                                FUNDING_RECEIPT_STATES.PARTIALLY_RECEIVED
                    },
                    {
                        name:
                            "Full funding receipt tracked",
                        passed:
                            secondReceipt.success === true &&
                            secondReceipt
                                .awardTracking
                                .receiptState ===
                                FUNDING_RECEIPT_STATES.FULLY_RECEIVED &&
                            secondReceipt.balanceRemaining ===
                            0
                    },
                    {
                        name:
                            "Money received metric calculated",
                        passed:
                            metrics.fundsReceived ===
                            80000
                    },
                    {
                        name:
                            "Funding performance metrics generated",
                        passed:
                            metrics.submissions === 1 &&
                            metrics.awarded === 1 &&
                            metrics.awardRate === 1 &&
                            metrics.awardedValue === 80000
                    },
                    {
                        name:
                            "Final pipeline stage is awarded",
                        passed:
                            finalOpportunity
                                .pipelineStage ===
                            PIPELINE_STAGES.AWARDED
                    }
                ];

                return {
                    success:
                        checks.every(
                            check =>
                                check.passed
                        ),
                    passed:
                        checks.filter(
                            check =>
                                check.passed
                        ).length,
                    total:
                        checks.length,
                    checks,
                    pipelineStage:
                        finalOpportunity
                            .pipelineStage,
                    receiptState:
                        finalOpportunity
                            .awardTracking
                            .receiptState,
                    moneyReceived:
                        finalOpportunity
                            .awardTracking
                            .totalReceived,
                    blockedDuplicateCode:
                        duplicate.code,
                    metrics
                };
            } finally {
                this.opportunities =
                    this.opportunities.filter(
                        opportunity =>
                            opportunity.id !==
                            testId
                    );
                this.configuration
                    .automaticPersistence =
                    originalPersistence;
            }
        },

        runSubmissionPortalIntelligenceAcceptanceTest() {
            const originalPersistence =
                this.configuration
                    .automaticPersistence;
            const testId =
                this.createId(
                    "portal-intelligence-test"
                );

            this.configuration
                .automaticPersistence =
                false;

            try {
                this.addOpportunity({
                    id:
                        testId,
                    title:
                        "Portal Intelligence Acceptance Test",
                    provider:
                        "Acceptance Test Foundation",
                    verified:
                        true,
                    sourceUrl:
                        "https://apply.submittable.com/test"
                });

                const opportunity =
                    this.getOpportunityById(
                        testId
                    );

                opportunity
                    .executiveApplicationPackage = {
                        id:
                            "application-package-test",
                        title:
                            "Portal Intelligence Application",
                        readiness: {
                            readyForSubmission:
                                true
                        },
                        narrativeSections: [
                            {
                                id:
                                    "narrative-1",
                                title:
                                    "Narrative",
                                complete:
                                    true,
                                responses: [
                                    {
                                        questionId:
                                            "q-1",
                                        question:
                                            "Describe the project in 500 characters.",
                                        response:
                                            "The project connects river corridor outreach and trash removal to improved watershed conditions.",
                                        state:
                                            APPLICATION_ITEM_STATES.APPROVED,
                                        limitCheck: {
                                            limits: {
                                                characters:
                                                    500,
                                                words:
                                                    null
                                            }
                                        }
                                    }
                                ]
                            }
                        ],
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
                                attached:
                                    true,
                                verified:
                                    true,
                                current:
                                    true
                            }
                        ],
                        certificationPacket: [
                            {
                                id:
                                    "org-cert",
                                name:
                                    "Authorized organizational certification",
                                required:
                                    true,
                                status:
                                    "approved"
                            }
                        ],
                        signaturePacket: [
                            {
                                id:
                                    "authorized-signature",
                                name:
                                    "Authorized official signature",
                                required:
                                    true,
                                status:
                                    "signed"
                            }
                        ]
                    };

                const analysis =
                    this.analyzeSubmissionPortal(
                        testId,
                        {
                            name:
                                "Submittable",
                            url:
                                "https://apply.submittable.com/test",
                            loginRequired:
                                true
                        }
                    );

                const portal =
                    this.getOpportunityById(
                        testId
                    )
                        .submissionPortalIntelligence;

                const mappedQuestion =
                    portal.fields.find(
                        field =>
                            field.sourceQuestionId ===
                            "q-1"
                    );

                const mappedAttachment =
                    portal.fields.find(
                        field =>
                            field.sourceDocumentId ===
                            "document-irs-001"
                    );

                const mappedCertification =
                    portal.fields.find(
                        field =>
                            field.type ===
                            SUBMISSION_FIELD_TYPES.CERTIFICATION
                    );

                const mappedSignature =
                    portal.fields.find(
                        field =>
                            field.type ===
                            SUBMISSION_FIELD_TYPES.SIGNATURE
                    );

                const packageResult =
                    this.createPortalSubmissionPackage(
                        testId
                    );

                const blockedFinal =
                    this.requestFinalPortalSubmission(
                        testId,
                        {
                            confirmedBy:
                                "Acceptance Test Executive"
                        }
                    );

                const authorized =
                    this.authorizePortalSubmission(
                        testId,
                        {
                            authorizedBy:
                                "Acceptance Test Executive"
                        }
                    );

                const finalRequest =
                    this.requestFinalPortalSubmission(
                        testId,
                        {
                            confirmedBy:
                                "Acceptance Test Executive"
                        }
                    );

                const portalPackage =
                    this.getOpportunityById(
                        testId
                    )
                        .portalSubmissionPackage;

                const checks = [
                    {
                        name:
                            "Portal detected",
                        passed:
                            analysis.success === true &&
                            portal.portal.type ===
                            SUBMISSION_PORTAL_TYPES.SUBMITTABLE
                    },
                    {
                        name:
                            "Submission workflow mapped",
                        passed:
                            portal.workflowSteps.length === 10 &&
                            portal.workflowSteps.some(
                                step =>
                                    step.type ===
                                    SUBMISSION_PORTAL_STEP_TYPES.SUBMIT
                            )
                    },
                    {
                        name:
                            "Fields normalized",
                        passed:
                            portal.fields.length >= 4 &&
                            portal.fields.every(
                                field =>
                                    Boolean(
                                        field.id
                                    ) &&
                                    Boolean(
                                        field.type
                                    )
                            )
                    },
                    {
                        name:
                            "Character limits detected",
                        passed:
                            mappedQuestion
                                ?.limits
                                ?.characters === 500
                    },
                    {
                        name:
                            "Attachments mapped",
                        passed:
                            mappedAttachment
                                ?.type ===
                                SUBMISSION_FIELD_TYPES.FILE &&
                            mappedAttachment
                                ?.completed === true
                    },
                    {
                        name:
                            "Certifications mapped",
                        passed:
                            mappedCertification
                                ?.completed === true &&
                            mappedCertification
                                ?.approved === true
                    },
                    {
                        name:
                            "Signature requirements mapped",
                        passed:
                            mappedSignature
                                ?.completed === true &&
                            mappedSignature
                                ?.approved === true
                    },
                    {
                        name:
                            "Executive approval gate preserved",
                        passed:
                            blockedFinal.success === false &&
                            blockedFinal.code ===
                            "GRANT_PORTAL_FINAL_SUBMISSION_BLOCKED"
                    },
                    {
                        name:
                            "Submission authorization recorded",
                        passed:
                            authorized.success === true &&
                            portal.authorization.authorized === true
                    },
                    {
                        name:
                            "Universal portal package generated",
                        passed:
                            packageResult.success === true &&
                            finalRequest.success === true &&
                            portalPackage.finalSubmitBlocked === false &&
                            finalRequest.readyForExecution === true
                    }
                ];

                return {
                    success:
                        checks.every(
                            check =>
                                check.passed
                        ),
                    passed:
                        checks.filter(
                            check =>
                                check.passed
                        ).length,
                    total:
                        checks.length,
                    checks,
                    portalType:
                        portal.portal.type,
                    mappedSteps:
                        portal.workflowSteps.length,
                    mappedFields:
                        portal.fields.length,
                    blockedFinalCode:
                        blockedFinal.code,
                    finalState:
                        portalPackage.submissionState,
                    readyForExecution:
                        finalRequest.readyForExecution
                };
            } finally {
                this.opportunities =
                    this.opportunities.filter(
                        opportunity =>
                            opportunity.id !==
                            testId
                    );
                this.configuration
                    .automaticPersistence =
                    originalPersistence;
            }
        },

        runApplicationAssemblyAcceptanceTest() {
            const originalPersistence =
                this.configuration
                    .automaticPersistence;
            const testId =
                this.createId(
                    "application-assembly-test"
                );

            this.configuration
                .automaticPersistence =
                false;

            try {
                this.addOpportunity({
                    id:
                        testId,
                    title:
                        "Watershed Protection Application Assembly Test",
                    provider:
                        "Acceptance Test Foundation",
                    awardAmount:
                        75000,
                    verified:
                        true,
                    sourceUrl:
                        "https://example.org/application"
                });

                const opportunity =
                    this.getOpportunityById(
                        testId
                    );

                opportunity
                    .applicationIntelligence = {
                        id:
                            "application-test",
                        title:
                            "Watershed Protection Application",
                        deadline:
                            new Date(
                                Date.now() +
                                30 * 86400000
                            ).toISOString(),
                        submissionMethod:
                            "online portal",
                        questions: [
                            {
                                id:
                                    "q-1",
                                text:
                                    "Describe the project.",
                                required:
                                    true,
                                state:
                                    APPLICATION_ITEM_STATES.APPROVED,
                                draft: {
                                    text:
                                        "The project connects river corridor outreach and trash removal to improved watershed conditions.",
                                    evidenceIds: [
                                        "org-river-work",
                                        "watershed-research"
                                    ],
                                    verifiedEvidenceIds: [
                                        "org-river-work",
                                        "watershed-research"
                                    ],
                                    confidence:
                                        0.91,
                                    missingInformation:
                                        [],
                                    limitCheck: {
                                        withinLimits:
                                            true
                                    }
                                }
                            },
                            {
                                id:
                                    "q-2",
                                text:
                                    "Explain the project budget.",
                                required:
                                    true,
                                state:
                                    APPLICATION_ITEM_STATES.APPROVED,
                                draft: {
                                    text:
                                        "The approved budget supports direct project activities and required administration.",
                                    evidenceIds: [
                                        "approved-budget"
                                    ],
                                    verifiedEvidenceIds: [
                                        "approved-budget"
                                    ],
                                    confidence:
                                        0.9,
                                    missingInformation:
                                        [],
                                    limitCheck: {
                                        withinLimits:
                                            true
                                    }
                                }
                            }
                        ],
                        sections: [
                            {
                                id:
                                    "section-1",
                                title:
                                    "Narrative",
                                instructions:
                                    "",
                                order:
                                    1,
                                questions: []
                            }
                        ],
                        attachments: [
                            {
                                id:
                                    "irs-letter",
                                name:
                                    "IRS determination letter",
                                required:
                                    true,
                                status:
                                    "missing"
                            }
                        ],
                        certifications: [
                            {
                                id:
                                    "org-cert",
                                name:
                                    "Authorized organizational certification",
                                required:
                                    true,
                                status:
                                    "approved"
                            }
                        ],
                        signatures: [
                            {
                                id:
                                    "authorized-signature",
                                name:
                                    "Authorized official signature",
                                required:
                                    true,
                                status:
                                    "executive-approval-required"
                            }
                        ]
                    };

                opportunity
                    .applicationIntelligence
                    .sections[0]
                    .questions =
                    opportunity
                        .applicationIntelligence
                        .questions;

                const assembled =
                    this.assembleExecutiveApplicationPackage(
                        testId,
                        {
                            documents: [
                                {
                                    id:
                                        "irs-letter",
                                    name:
                                        "IRS determination letter",
                                    documentId:
                                        "document-irs-001",
                                    verified:
                                        true,
                                    current:
                                        true,
                                    attached:
                                        true
                                }
                            ]
                        }
                    );

                const applicationPackage =
                    this.getOpportunityById(
                        testId
                    )
                        .executiveApplicationPackage;

                const initialPackageSnapshot =
                    this.clone(
                        applicationPackage
                    );

                const blockedSignature =
                    this.markApplicationPackageSignature(
                        testId,
                        "authorized-signature",
                        {
                            signedBy:
                                "Acceptance Test Executive"
                        }
                    );

                const approvedPackage =
                    this.approveExecutiveApplicationPackage(
                        testId,
                        {
                            approvedBy:
                                "Acceptance Test Executive"
                        }
                    );

                const signed =
                    this.markApplicationPackageSignature(
                        testId,
                        "authorized-signature",
                        {
                            signedBy:
                                "Acceptance Test Executive"
                        }
                    );

                const finalPackage =
                    this.getOpportunityById(
                        testId
                    )
                        .executiveApplicationPackage;

                const checks = [
                    {
                        name:
                            "Executive application package created",
                        passed:
                            assembled.success === true &&
                            Boolean(
                                applicationPackage
                                    ?.id
                            )
                    },
                    {
                        name:
                            "Narrative sections assembled",
                        passed:
                            initialPackageSnapshot
                                .narrativeSections
                                .length === 1 &&
                            applicationPackage
                                .narrativeSections[0]
                                .responses
                                .length === 2
                    },
                    {
                        name:
                            "Attachment inventory created",
                        passed:
                            initialPackageSnapshot
                                .attachmentIndex
                                .some(
                                    item =>
                                        item.name ===
                                            "IRS determination letter" &&
                                        item.verified &&
                                        item.current &&
                                        item.attached
                                )
                    },
                    {
                        name:
                            "Required documents tracked",
                        passed:
                            initialPackageSnapshot
                                .submissionChecklist
                                .some(
                                    item =>
                                        item.category ===
                                            APPLICATION_PACKAGE_ITEM_TYPES.ATTACHMENT &&
                                        item.complete === true
                                )
                    },
                    {
                        name:
                            "Readiness score calculated",
                        passed:
                            Number.isFinite(
                                initialPackageSnapshot
                                    .readiness
                                    .percent
                            ) &&
                            initialPackageSnapshot
                                .readiness
                                .percent > 0
                    },
                    {
                        name:
                            "Outstanding executive actions generated",
                        passed:
                            initialPackageSnapshot
                                .executiveActionChecklist
                                .actions
                                .some(
                                    action =>
                                        action.id ===
                                            "approve-application-package"
                                ) &&
                            initialPackageSnapshot
                                .executiveActionChecklist
                                .actions
                                .some(
                                    action =>
                                        action.id ===
                                            "signature-authorized-signature"
                                )
                    },
                    {
                        name:
                            "Signature blocked before package approval",
                        passed:
                            blockedSignature
                                .success === false &&
                            blockedSignature
                                .code ===
                                "GRANT_APPLICATION_SIGNATURE_BLOCKED"
                    },
                    {
                        name:
                            "Package approval enables signature readiness",
                        passed:
                            approvedPackage
                                .success === true &&
                            approvedPackage
                                .applicationPackage
                                .assemblyState ===
                                APPLICATION_ASSEMBLY_STATES.READY_FOR_SIGNATURE
                    },
                    {
                        name:
                            "Completed signature produces submission readiness",
                        passed:
                            signed.success === true &&
                            finalPackage
                                .assemblyState ===
                                APPLICATION_ASSEMBLY_STATES.READY_FOR_SUBMISSION &&
                            finalPackage
                                .readiness
                                .readyForSubmission === true
                    }
                ];

                return {
                    success:
                        checks.every(
                            check =>
                                check.passed
                        ),
                    passed:
                        checks.filter(
                            check =>
                                check.passed
                        ).length,
                    total:
                        checks.length,
                    checks,
                    assemblyState:
                        finalPackage
                            .assemblyState,
                    readiness:
                        this.clone(
                            finalPackage
                                .readiness
                        ),
                    executiveActions:
                        this.clone(
                            finalPackage
                                .executiveActionChecklist
                        ),
                    blockedSignatureCode:
                        blockedSignature.code
                };
            } finally {
                this.opportunities =
                    this.opportunities.filter(
                        opportunity =>
                            opportunity.id !==
                            testId
                    );
                this.configuration
                    .automaticPersistence =
                    originalPersistence;
            }
        },

        runApplicationIntelligenceAcceptanceTest() {
            const originalPersistence =
                this.configuration.automaticPersistence;
            const testId =
                this.createId(
                    "application-intelligence-test"
                );

            this.configuration.automaticPersistence =
                false;

            try {
                this.addOpportunity({
                    id:
                        testId,
                    title:
                        "Watershed and Native Salmon Protection Grant",
                    statedPurpose:
                        "Protect native salmon habitat by reducing pollution and improving watershed conditions.",
                    verified:
                        true,
                    sourceUrl:
                        "https://example.org/application"
                });

                const opportunity =
                    this.getOpportunityById(
                        testId
                    );

                opportunity.alignmentStrategy = {
                    status:
                        "strong",
                    overallScore:
                        88,
                    claims: [
                        {
                            activity:
                                "River corridor outreach and trash removal",
                            objective:
                                "Protect native salmon habitat",
                            claim:
                                "River corridor outreach and trash removal can contribute to healthier aquatic habitat through reduced trash and pollutant loading.",
                            supported:
                                true,
                            confidence:
                                0.88,
                            evidenceIds: [
                                "org-river-work",
                                "watershed-research"
                            ]
                        }
                    ]
                };

                const analysis =
                    this.analyzeFundingApplication(
                        testId,
                        {
                            title:
                                "Watershed and Native Salmon Protection Application",
                            deadline:
                                new Date(
                                    Date.now() +
                                    30 * 86400000
                                ).toISOString(),
                            attachments: [
                                "IRS determination letter"
                            ],
                            certifications: [
                                "Authorized organizational certification"
                            ],
                            signatures: [
                                "Authorized official signature"
                            ],
                            sections: [
                                {
                                    title:
                                        "Program Narrative",
                                    questions: [
                                        {
                                            id:
                                                "q-need",
                                            text:
                                                "Describe the community and watershed need in 150 words."
                                        },
                                        {
                                            id:
                                                "q-alignment",
                                            text:
                                                "Explain how your land-based work contributes to protecting native salmon habitat. Maximum 250 words."
                                        },
                                        {
                                            id:
                                                "q-budget",
                                            text:
                                                "State the amount requested and explain the project budget."
                                        }
                                    ]
                                }
                            ]
                        }
                    );

                const application =
                    this.getOpportunityById(
                        testId
                    ).applicationIntelligence;

                const evidence = [
                    {
                        id:
                            "org-river-work",
                        statement:
                            "The organization performs river corridor outreach and removes trash from encampment areas near the watershed.",
                        authority:
                            "primary",
                        verified:
                            true,
                        confidence:
                            0.95
                    },
                    {
                        id:
                            "watershed-research",
                        statement:
                            "Reducing trash and pollutant loading supports cleaner river corridors and healthier aquatic habitat.",
                        authority:
                            "authoritative",
                        verified:
                            true,
                        confidence:
                            0.9
                    }
                ];

                const needDraft =
                    this.draftApplicationQuestion(
                        testId,
                        "q-need",
                        {
                            evidence
                        }
                    );

                const alignmentDraft =
                    this.draftApplicationQuestion(
                        testId,
                        "q-alignment",
                        {
                            evidence
                        }
                    );

                const budgetDraft =
                    this.draftApplicationQuestion(
                        testId,
                        "q-budget",
                        {}
                    );

                const reviewPackage =
                    this.createExecutiveApplicationReviewPackage(
                        testId
                    );

                const blockedApproval =
                    this.approveExecutiveApplicationReview(
                        testId,
                        {
                            approvedBy:
                                "Acceptance Test Executive"
                        }
                    );

                const blockedSubmission =
                    this.markApplicationReadyToSubmit(
                        testId
                    );

                const checks = [
                    {
                        name:
                            "Application model created",
                        passed:
                            analysis.success === true &&
                            application?.questions?.length === 3
                    },
                    {
                        name:
                            "Questions classified by intent",
                        passed:
                            application.questions.every(
                                question =>
                                    Boolean(
                                        question.category
                                    ) &&
                                    Boolean(
                                        question.intent
                                    )
                            )
                    },
                    {
                        name:
                            "Evidence requirements identified",
                        passed:
                            application.questions.every(
                                question =>
                                    question
                                        .evidenceRequirements
                                        .length > 0
                            )
                    },
                    {
                        name:
                            "Executive strategy created",
                        passed:
                            Boolean(
                                application
                                    .executiveStrategy
                                    ?.writingRules
                                    ?.length
                            )
                    },
                    {
                        name:
                            "Evidence-backed drafts created",
                        passed:
                            needDraft.success === true &&
                            alignmentDraft.success === true &&
                            needDraft.draft.status ===
                                APPLICATION_ITEM_STATES.DRAFTED &&
                            alignmentDraft.draft.status ===
                                APPLICATION_ITEM_STATES.DRAFTED
                    },
                    {
                        name:
                            "Executive input is required instead of guessed",
                        passed:
                            budgetDraft.success === true &&
                            budgetDraft.draft.status ===
                                APPLICATION_ITEM_STATES.EXECUTIVE_INPUT_REQUIRED &&
                            budgetDraft.draft.text ===
                                "Executive Input Required"
                    },
                    {
                        name:
                            "Executive review package produced",
                        passed:
                            reviewPackage.success === true &&
                            reviewPackage
                                .reviewPackage
                                .sections
                                .length === 1
                    },
                    {
                        name:
                            "Submission blocked until complete approval",
                        passed:
                            blockedApproval.success === false &&
                            blockedApproval.code ===
                                "GRANT_APPLICATION_NOT_READY" &&
                            blockedSubmission.success === false &&
                            blockedSubmission.code ===
                                "GRANT_APPLICATION_SUBMISSION_BLOCKED"
                    }
                ];

                return {
                    success:
                        checks.every(
                            check => check.passed
                        ),
                    passed:
                        checks.filter(
                            check => check.passed
                        ).length,
                    total:
                        checks.length,
                    checks,
                    questionCount:
                        application.questions.length,
                    reviewState:
                        application.reviewState,
                    readiness:
                        this.clone(
                            application.readiness
                        ),
                    blockedApprovalCode:
                        blockedApproval.code,
                    blockedSubmissionCode:
                        blockedSubmission.code
                };
            } finally {
                this.opportunities =
                    this.opportunities.filter(
                        opportunity =>
                            opportunity.id !== testId
                    );
                this.configuration.automaticPersistence =
                    originalPersistence;
            }
        },

        runAlignmentStrategyAcceptanceTest() {
            const originalPersistence =
                this.configuration.automaticPersistence;
            const testId =
                this.createId(
                    "alignment-acceptance-test"
                );

            this.configuration.automaticPersistence =
                false;

            try {
                this.addOpportunity({
                    id: testId,
                    title:
                        "Protect Native Salmon Habitat",
                    statedPurpose:
                        "Improve watershed conditions and protect native salmon habitat.",
                    description:
                        "Reduce pollution and habitat pressure in a river watershed.",
                    verified: true,
                    sourceUrl:
                        "https://example.org/salmon"
                });

                const result =
                    this.buildExecutiveAlignmentStrategy(
                        testId,
                        {
                            organizationId:
                                "acceptance-test-organization",
                            organizationName:
                                "Acceptance Test Organization",
                            organizationMission:
                                "Improve human dignity and watershed health.",
                            activities: {
                                riverCorridor: {
                                    name:
                                        "River corridor outreach and encampment trash removal",
                                    description:
                                        "Land-based cleanup and stabilization work near watershed areas."
                                },
                                hygiene:
                                    "Mobile hygiene and sanitation services near watershed areas"
                            },
                            evidence: {
                                organizational: {
                                    id:
                                        "org-river-work",
                                    statement:
                                        "The organization performs river corridor outreach and removes trash from encampment areas near the watershed.",
                                    authority:
                                        "primary",
                                    verified: true,
                                    confidence: 0.95
                                },
                                watershedResearch: {
                                    id:
                                        "watershed-evidence",
                                    statement:
                                        "Reducing trash and pollutant loading supports cleaner river corridors and healthier aquatic habitat.",
                                    authority:
                                        "authoritative",
                                    verified: true,
                                    confidence: 0.9
                                }
                            },
                            funderObjectives: [
                                "Protect native salmon habitat by improving watershed water quality and reducing pollution."
                            ]
                        }
                    );

                const strategy =
                    result.alignmentStrategy;
                const indirectClaim =
                    strategy?.claims?.find(
                        claim =>
                            claim.connectionType ===
                            "indirect-evidence-required" &&
                            claim.supported
                    );
                const directFishClaim =
                    strategy?.claims?.find(
                        claim =>
                            claim.claim
                                .toLowerCase()
                                .includes(
                                    "direct fish restoration"
                                )
                    );

                const checks = [
                    {
                        name:
                            "Object-shaped organization profile normalized",
                        passed:
                            strategy
                                ?.organizationActivities
                                ?.some(
                                    activity =>
                                        activity.includes(
                                            "River corridor outreach"
                                        )
                                ) &&
                            strategy?.claims?.length > 0
                    },
                    {
                        name:
                            "Funder objective identified",
                        passed:
                            strategy?.funderObjectives
                                ?.length === 1
                    },
                    {
                        name:
                            "Land-based work connected to aquatic outcome",
                        passed:
                            Boolean(indirectClaim)
                    },
                    {
                        name:
                            "Indirect connection is evidence-gated",
                        passed:
                            indirectClaim
                                ?.verifiedEvidenceCount >= 1 &&
                            indirectClaim
                                ?.evidenceIds?.length >= 1
                    },
                    {
                        name:
                            "Overstatement warning preserved",
                        passed:
                            strategy?.claims?.some(
                                claim =>
                                    claim.caution
                                        ?.toLowerCase()
                                        .includes(
                                            "do not claim direct fish restoration"
                                        )
                            )
                    },
                    {
                        name:
                            "Narrative strategy produced",
                        passed:
                            Boolean(
                                strategy
                                    ?.narrativeStrategy
                                    ?.positioning
                            )
                    },
                    {
                        name:
                            "Unsupported claims are blocked",
                        passed:
                            strategy?.claims?.every(
                                claim =>
                                    claim.supported ||
                                    claim.status ===
                                        "blocked"
                            )
                    }
                ];

                return {
                    success:
                        result.success === true &&
                        checks.every(
                            check => check.passed
                        ),
                    passed:
                        checks.filter(
                            check => check.passed
                        ).length,
                    total:
                        checks.length,
                    checks,
                    status:
                        strategy?.status,
                    overallScore:
                        strategy?.overallScore,
                    evidenceCoverage:
                        strategy?.evidenceCoverage,
                    leadClaim:
                        strategy
                            ?.narrativeStrategy
                            ?.leadClaims?.[0] ||
                        null,
                    caution:
                        indirectClaim?.caution ||
                        null
                };
            } finally {
                this.opportunities =
                    this.opportunities.filter(
                        opportunity =>
                            opportunity.id !== testId
                    );
                this.configuration.automaticPersistence =
                    originalPersistence;
            }
        },

        evaluateExecutiveAdaptiveFit(context = {}) {
            const opportunity = context.opportunity || {};
            const organizationalFit = context.organizationalFit || {};
            const eligibility = context.eligibility || {};
            const disqualifiers = context.disqualifiers || [];
            const organization = context.organizationSnapshot || {};
            const currentFitScore = Math.round(
                Number(organizationalFit.score || 0)
            );

            const hardBlockers = this.identifyAdaptiveHardBlockers({
                opportunity,
                eligibility,
                disqualifiers,
                organizationalFit
            });

            const objectives = this.deriveFunderObjectives(opportunity, {
                funderObjectives: opportunity.desiredOutcomes || []
            });
            const organizationContext =
                this.resolveOrganizationAlignmentContext({});
            const activities = organizationContext.activities.length
                ? organizationContext.activities
                : (organization.components || []).map(component =>
                    [
                        component.name,
                        component.mission,
                        ...(component.outcomes || []),
                        ...(component.capabilities || [])
                    ].filter(Boolean).join(" — ")
                );

            const candidates = this.buildAdaptiveProgramCandidates({
                opportunity,
                objectives,
                activities,
                organization,
                currentFitScore
            });

            const selectedAdaptation = candidates[0] || null;
            const projectedFitScore = selectedAdaptation
                ? selectedAdaptation.projectedFitScore
                : currentFitScore;
            const preferredPath = selectedAdaptation?.preferredPath ||
                (hardBlockers.length ? "reject" : "monitor");
            const feasible = Boolean(
                selectedAdaptation &&
                selectedAdaptation.feasibility.score >= 65
            );
            const missionHonest = Boolean(
                selectedAdaptation &&
                selectedAdaptation.missionIntegrity !== "distortion"
            );
            const rescueEligible =
                hardBlockers.length === 0 &&
                currentFitScore < this.configuration.minimumPursueScore &&
                projectedFitScore >= this.configuration.minimumPursueScore &&
                feasible &&
                missionHonest;

            const institutionalReasoning =
                this.runAdaptiveInstitutionalReasoning({
                    opportunity,
                    objectives,
                    currentFitScore,
                    selectedAdaptation,
                    hardBlockers
                });

            const unknowns = this.uniqueStrings([
                ...(selectedAdaptation?.unknowns || []),
                ...(institutionalReasoning?.openLoops || []).map(loop =>
                    loop.title || loop.description || loop
                )
            ]);

            const requiresExecutiveDecision = Boolean(
                rescueEligible &&
                selectedAdaptation?.organizationalChangeRequired
            );

            const executiveSummary = hardBlockers.length
                ? `Adaptive analysis stopped because a hard eligibility, geography, population, or compliance barrier remains: ${hardBlockers[0]}`
                : rescueEligible
                    ? `This opportunity does not fit strongly enough in its current form (${currentFitScore}%), but MEOS identified a truthful and feasible adaptation that could raise strategic fit to approximately ${projectedFitScore}%. It should be preserved as an executive growth case rather than discarded.`
                    : selectedAdaptation
                        ? `MEOS identified an adaptation path, but it is not yet strong or feasible enough for promotion. Preserve it for research and capability development.`
                        : `No defensible adaptation path has been established. Preserve only if new evidence, a partner, or a changed program design becomes available.`;

            const nextAction = hardBlockers.length
                ? "Keep off the active pursuit desk and resolve or confirm the hard blocker before further work."
                : rescueEligible
                    ? selectedAdaptation.nextAction
                    : selectedAdaptation
                        ? "Continue researching the adaptation, evidence, cost, partners, and implementation requirements before executive promotion."
                        : "Monitor for a better-aligned cycle or new evidence; do not manufacture a mission connection.";

            this.analytics.adaptiveFitAnalysesCompleted += 1;
            if (rescueEligible) {
                this.analytics.adaptiveOpportunitiesPreserved += 1;
                if (requiresExecutiveDecision) {
                    this.analytics.adaptiveExecutiveCasesCreated += 1;
                }
            }
            this.analytics.lastAdaptiveFitAnalysisAt = this.now();

            return {
                success: true,
                schema: "meos.grant-office.executive-adaptive-fit.v1",
                currentFitScore,
                projectedFitScore,
                fitGain: Math.max(0, projectedFitScore - currentFitScore),
                hardBlockers,
                objectives,
                candidateCount: candidates.length,
                candidates,
                selectedAdaptation,
                preferredPath,
                feasible,
                missionHonest,
                rescueEligible,
                requiresExecutiveDecision,
                deskPlacement: rescueEligible
                    ? "executive-workbench"
                    : hardBlockers.length
                        ? "off-desk"
                        : "internal-research",
                institutionalReasoning,
                unknowns,
                executiveSummary,
                nextAction
            };
        },

        identifyAdaptiveHardBlockers(context = {}) {
            const blockers = [];
            const eligibility = context.eligibility || {};
            const organizationalFit = context.organizationalFit || {};
            const disqualifiers = context.disqualifiers || [];

            if (eligibility.eligible === false || eligibility.status === "ineligible") {
                blockers.push("The organization is not eligible under the stated applicant rules.");
            }
            if (organizationalFit.populationConflict?.hardConflict) {
                blockers.push("The required beneficiary population conflicts with the organization's lawful or commissioned scope.");
            }

            disqualifiers.forEach(item => {
                const type = item.type || item.code;
                if ([
                    DISQUALIFIER_TYPES.GEOGRAPHY,
                    DISQUALIFIER_TYPES.LICENSE,
                    DISQUALIFIER_TYPES.ACCREDITATION
                ].includes(type)) {
                    blockers.push(item.reason || item.explanation || `Hard blocker: ${type}`);
                }
            });

            return this.uniqueStrings(blockers);
        },

        buildAdaptiveProgramCandidates(context = {}) {
            const opportunity = context.opportunity || {};
            const objectives = context.objectives || [];
            const activities = context.activities || [];
            const currentFitScore = Number(context.currentFitScore || 0);
            const sourceText = this.normalizeText([
                opportunity.title,
                opportunity.description,
                opportunity.statedPurpose,
                ...objectives,
                ...(opportunity.targetPopulations || []),
                ...(opportunity.fundingAreas || [])
            ].filter(Boolean).join(" "));

            const patterns = [
                {
                    id: "hands-on-workforce-recovery",
                    activity: /bicycle|bike repair|mechanic|mechanical|fabrication|construction|carpentry|culinary|gardening|horticulture|repair workshop|skilled trades/,
                    outcome: /veteran|workforce|employment|job training|mental health|recovery|peer support|wellness|purpose/,
                    title: "Hands-On Workforce and Recovery Skills Program",
                    intermediateOutcomes: [
                        "structured purposeful activity",
                        "practical job skills",
                        "peer connection and reduced isolation",
                        "recovery-supportive routine",
                        "employment readiness"
                    ],
                    baseGain: 24,
                    cost: "moderate",
                    timelineDays: 60,
                    preferredPath: "adapt"
                },
                {
                    id: "environmental-stewardship-workforce",
                    activity: /beach cleanup|coastal cleanup|watershed|river cleanup|marine debris|restoration|conservation/,
                    outcome: /workforce|employment|homeless|unhoused|recovery|community|environment|public health/,
                    title: "Environmental Stewardship and Workforce Initiative",
                    intermediateOutcomes: [
                        "paid or volunteer work experience",
                        "environmental restoration",
                        "community integration",
                        "public-health and watershed benefit"
                    ],
                    baseGain: 22,
                    cost: "low-to-moderate",
                    timelineDays: 45,
                    preferredPath: "adapt"
                },
                {
                    id: "therapeutic-enterprise",
                    activity: /art|music|garden|agriculture|food|kitchen|craft|maker|recycling|upcycling/,
                    outcome: /mental health|recovery|workforce|employment|community|wellness|veteran|homeless|unhoused/,
                    title: "Therapeutic Social Enterprise Program",
                    intermediateOutcomes: [
                        "structured therapeutic activity",
                        "marketable skills",
                        "social connection",
                        "earned-income or employment pathways"
                    ],
                    baseGain: 18,
                    cost: "moderate",
                    timelineDays: 90,
                    preferredPath: "adapt"
                }
            ];

            const candidates = [];

            patterns.forEach(pattern => {
                if (!pattern.activity.test(sourceText) || !pattern.outcome.test(sourceText)) {
                    return;
                }

                const overlap = activities.reduce((best, activity) =>
                    Math.max(best, this.scoreConceptOverlap(sourceText, activity)), 0
                );
                const capabilityScore = Math.round(Math.min(100, overlap * 180 + 45));
                const partnerNeeded = capabilityScore < 65;
                const feasibilityScore = Math.max(50, Math.min(94,
                    capabilityScore + (partnerNeeded ? 5 : 15) -
                    (pattern.cost === "moderate" ? 5 : 0)
                ));
                const projectedFitScore = Math.min(96, Math.round(
                    currentFitScore + pattern.baseGain +
                    Math.max(0, (capabilityScore - 50) * 0.18)
                ));

                candidates.push({
                    id: pattern.id,
                    title: pattern.title,
                    preferredPath: partnerNeeded ? "partner" : pattern.preferredPath,
                    currentFitScore,
                    projectedFitScore,
                    expectedFitGain: projectedFitScore - currentFitScore,
                    underlyingFunderOutcomes: objectives.slice(0, 6),
                    intermediateOutcomes: pattern.intermediateOutcomes,
                    existingCapabilityScore: capabilityScore,
                    organizationalChangeRequired: true,
                    missionIntegrity: "defensible-extension",
                    feasibility: {
                        score: feasibilityScore,
                        cost: pattern.cost,
                        estimatedLaunchDays: pattern.timelineDays,
                        partnerNeeded,
                        explanation: partnerNeeded
                            ? "The concept is plausible, but an experienced delivery partner should close the current capability gap."
                            : "Existing organizational capabilities provide a credible base for a limited, governed program expansion."
                    },
                    evidenceStandard: "Every causal, population, outcome, and capability claim must be supported before application use.",
                    unknowns: this.uniqueStrings([
                        "Program budget and unit economics are not yet verified.",
                        "Staffing, supervision, insurance, and facility requirements must be verified.",
                        partnerNeeded ? "A qualified funded partner has not yet been confirmed." : null,
                        "Outcome evidence and measurement design must be completed."
                    ]),
                    nextAction: partnerNeeded
                        ? `Open an executive adaptation case for ${pattern.title}; identify a qualified delivery partner, verify the program model, budget, evidence, and funder eligibility before drafting.`
                        : `Open an executive adaptation case for ${pattern.title}; build the program design, budget, evidence plan, implementation timeline, and approval package before drafting.`
                });
            });

            // Preserve a general reasoning path when no named pattern applies but
            // the funder's outcomes overlap with commissioned organizational work.
            if (candidates.length === 0) {
                let bestBridge = null;
                objectives.forEach(objective => {
                    activities.forEach(activity => {
                        const directScore = this.scoreConceptOverlap(objective, activity);
                        const bridge = this.inferOutcomeBridge(
                            activity,
                            objective,
                            context.organization?.evidence || []
                        );
                        const score = bridge ? 0.62 : directScore;
                        if (score >= 0.35 && (!bestBridge || score > bestBridge.score)) {
                            bestBridge = { objective, activity, bridge, score };
                        }
                    });
                });

                if (bestBridge) {
                    const gain = bestBridge.bridge ? 17 : 12;
                    candidates.push({
                        id: "evidence-grounded-adaptive-bridge",
                        title: "Evidence-Grounded Program Adaptation",
                        preferredPath: "prepare",
                        currentFitScore,
                        projectedFitScore: Math.min(90, currentFitScore + gain),
                        expectedFitGain: gain,
                        underlyingFunderOutcomes: [bestBridge.objective],
                        intermediateOutcomes: bestBridge.bridge?.intermediateOutcomes || [],
                        existingCapabilityScore: Math.round(bestBridge.score * 100),
                        organizationalChangeRequired: true,
                        missionIntegrity: "requires-verification",
                        feasibility: {
                            score: 64,
                            cost: "unknown",
                            estimatedLaunchDays: null,
                            partnerNeeded: true,
                            explanation: "A possible bridge exists, but evidence, operating design, and partner capacity are not yet sufficient for executive promotion."
                        },
                        evidenceStandard: "No adaptation claim may enter an application until supported by commissioned records or verified external evidence.",
                        unknowns: [
                            "The program model is not yet defined.",
                            "Cost, staffing, timeline, risk, and measurable outcomes are not verified."
                        ],
                        nextAction: "Research the underlying funder outcome and build a verified adaptation feasibility case."
                    });
                }
            }

            return candidates.sort((a, b) =>
                b.projectedFitScore - a.projectedFitScore ||
                b.feasibility.score - a.feasibility.score
            );
        },

        runAdaptiveInstitutionalReasoning(context = {}) {
            const engine = global.InstitutionalReasoning;
            if (!engine || typeof engine.analyze !== "function") {
                return {
                    success: false,
                    status: "reasoning-engine-unavailable",
                    recommendation: null,
                    findings: [],
                    risks: [],
                    options: [],
                    openLoops: []
                };
            }

            const adaptation = context.selectedAdaptation;
            const question = [
                `Evaluate whether ${context.opportunity?.title || "this opportunity"} can become a truthful, feasible organizational opportunity rather than being rejected for weak current fit.`,
                `Current fit: ${context.currentFitScore}%.`,
                `Funder outcomes: ${(context.objectives || []).join("; ") || "not verified"}.`,
                adaptation
                    ? `Proposed adaptation: ${adaptation.title}; projected fit ${adaptation.projectedFitScore}%; intermediate outcomes: ${adaptation.intermediateOutcomes.join(", ")}.`
                    : "No proposed adaptation has been established.",
                `Hard blockers: ${(context.hardBlockers || []).join("; ") || "none identified"}.`,
                "Assess mission integrity, eligibility, evidence, feasibility, cost, staffing, partners, risk, timeline, and the next executive action. Do not invent facts."
            ].join(" ");

            try {
                return engine.analyze(question, {
                    mode: "strategy",
                    includeRisks: true,
                    includeAlternatives: true,
                    includeImplementation: true,
                    evidenceLimit: 20
                });
            } catch (error) {
                return {
                    success: false,
                    status: "reasoning-engine-error",
                    error: error?.message || String(error),
                    recommendation: null,
                    findings: [],
                    risks: [],
                    options: [],
                    openLoops: []
                };
            }
        },

        runExecutiveAdaptiveReasoningAcceptanceTest() {
            const originalOpportunities = this.clone(this.opportunities);
            const originalAnalytics = this.clone(this.analytics);
            const originalPersistence = this.configuration.automaticPersistence;
            this.configuration.automaticPersistence = false;

            try {
                const opportunity = this.addOpportunity({
                    id: "adaptive-veteran-bicycle-test",
                    title: "Veteran Bicycle Repair, Education, and Employment Initiative",
                    type: OPPORTUNITY_TYPES.PRIVATE_FOUNDATION,
                    provider: "Acceptance Test Foundation",
                    description: "Support organizations that educate veterans through bicycle repair and mechanical skills to improve mental health, recovery, peer connection, and employment readiness.",
                    statedPurpose: "Improve veteran wellness and employment through hands-on bicycle education.",
                    desiredOutcomes: [
                        "veteran mental health",
                        "recovery skills",
                        "job training",
                        "employment readiness"
                    ],
                    targetPopulations: ["veterans"],
                    fundingAreas: ["workforce development", "mental health"],
                    eligibleApplicants: ["501(c)(3) nonprofit organizations"],
                    awardCeiling: 150000,
                    verified: true,
                    deadline: new Date(Date.now() + 45 * 86400000).toISOString()
                });

                const context = {
                    opportunity,
                    understanding: this.understandOpportunity(opportunity),
                    organizationSnapshot: this.buildOrganizationSnapshot(this.getOrganizationProfile() || {
                        organization: {
                            legalName: "California Clean Slate Program",
                            mission: "Provide recovery navigation, workforce development, community stabilization, and pathways to independence."
                        },
                        programs: [{
                            name: "Recovery and Workforce Navigation",
                            mission: "Support adults and veterans through recovery, job readiness, practical skills, peer support, and employment pathways.",
                            outcomes: ["recovery stability", "employment readiness"],
                            capabilities: ["peer support", "job readiness", "hands-on fabrication leadership"],
                            targetPopulations: ["adults", "veterans"]
                        }]
                    }),
                    organizationalFit: {
                        score: 68,
                        populationConflict: { hardConflict: false }
                    },
                    eligibility: { eligible: true, status: "eligible" },
                    moneyReality: {}, timing: {}, competitiveness: {}, execution: {}, strategicValue: {},
                    disqualifiers: [], authoritativeResourceDecision: { decision: "reject" }
                };

                const result = this.evaluateExecutiveAdaptiveFit(context);
                const checks = [
                    { name: "Low current fit was not treated as final rejection", passed: result.currentFitScore === 68 && result.candidateCount > 0 },
                    { name: "Underlying funder outcomes were preserved", passed: result.objectives.some(item => /veteran|mental health|employment/i.test(item)) },
                    { name: "Truthful program adaptation was generated", passed: result.selectedAdaptation?.missionIntegrity === "defensible-extension" },
                    { name: "Projected fit crossed executive workbench threshold", passed: result.projectedFitScore >= 82 },
                    { name: "Feasibility and unknowns were explicitly evaluated", passed: result.selectedAdaptation?.feasibility?.score >= 65 && result.unknowns.length > 0 },
                    { name: "Opportunity was preserved for executive adaptation", passed: result.rescueEligible === true && result.deskPlacement === "executive-workbench" },
                    { name: "No application submission was authorized", passed: result.nextAction.toLowerCase().includes("case") && result.requiresExecutiveDecision === true }
                ];

                return {
                    success: checks.every(check => check.passed),
                    schema: "meos.grant-office.executive-adaptive-reasoning-acceptance.v1",
                    version: this.version,
                    buildId: this.buildId,
                    passed: checks.filter(check => check.passed).length,
                    total: checks.length,
                    checks,
                    result
                };
            } finally {
                this.opportunities = originalOpportunities;
                this.analytics = originalAnalytics;
                this.configuration.automaticPersistence = originalPersistence;
            }
        },

        runGrantVersionOptimizationAcceptanceTest() {
            const originalPersistence = this.configuration.automaticPersistence;
            const testId = this.createId("grant-version-optimization-test");
            this.configuration.automaticPersistence = false;

            try {
                const opportunity = this.addOpportunity({
                    id: testId,
                    title: "Community Mobile Hygiene Investment",
                    provider: "MEOS Test Community Foundation",
                    verified: true,
                    deadline: new Date(Date.now() + 21 * 86400000).toISOString(),
                    eligibleApplicants: ["501(c)(3) nonprofits"]
                });

                this.analyzeFundingApplication(opportunity.id, {
                    title: "Community Mobile Hygiene Investment Application",
                    sections: [{
                        title: "Narrative",
                        questions: [{
                            id: "need-question",
                            text: "Describe the documented community need, the proposed solution, and the measurable benefit of the funder's investment.",
                            category: APPLICATION_QUESTION_CATEGORIES.NEEDS,
                            required: true,
                            wordLimit: 250
                        }]
                    }]
                });

                const result = this.generateApplicationDraftVersions(
                    opportunity.id,
                    "need-question",
                    {
                        evidence: [
                            {
                                id: "verified-need",
                                statement: "Verified local records document unmet hygiene access among people experiencing homelessness.",
                                verified: true,
                                authority: "authoritative-record"
                            },
                            {
                                id: "verified-solution",
                                statement: "CCSP's approved program model uses mobile hygiene access as an engagement point for services and stabilization.",
                                verified: true,
                                authority: "organizational-record"
                            },
                            {
                                id: "verified-measurement",
                                statement: "The implementation plan requires service counts, referrals, follow-up activity, and documented outcomes.",
                                verified: true,
                                authority: "approved-plan"
                            }
                        ],
                        maximumCycles: 8
                    }
                );

                const checks = [
                    {
                        name: "Multiple truthful draft versions generated",
                        passed: result.success === true && result.versions?.length >= 3
                    },
                    {
                        name: "Every version receives a funder-readiness score",
                        passed: result.versions?.every(version =>
                            Number.isFinite(version.score?.total) &&
                            version.score?.dimensions?.compliance !== undefined
                        ) === true
                    },
                    {
                        name: "Best current version selected",
                        passed:
                            Boolean(result.selectedVersion?.id) &&
                            result.optimization?.selectedVersionId === result.selectedVersion?.id
                    },
                    {
                        name: "Non-winning versions preserved rather than discarded",
                        passed:
                            result.optimization?.discardedVersionIds?.length === 0 &&
                            result.optimization?.preservedVersionIds?.length === result.versions?.length
                    },
                    {
                        name: "Compliance remains a hard submission objective",
                        passed:
                            result.selectedVersion?.score?.limitCheck?.withinLimits === true &&
                            result.optimization?.objective?.includes("100% administrative compliance")
                    },
                    {
                        name: "Improvable drafts remain active",
                        passed: [
                            "best-current-version-ready-for-executive-review",
                            "best-current-version-selected-for-further-improvement"
                        ].includes(result.optimization?.decision)
                    }
                ];

                return {
                    success: checks.every(check => check.passed),
                    schema: "meos.grant-office.version-optimization-acceptance.v1",
                    version: this.version,
                    buildId: this.buildId,
                    passed: checks.filter(check => check.passed).length,
                    total: checks.length,
                    checks,
                    selectedStrategy: result.selectedVersion?.strategy || null,
                    selectedScore: result.selectedVersion?.score?.total ?? null,
                    optimizationDecision: result.optimization?.decision || null
                };
            } finally {
                this.opportunities = this.opportunities.filter(
                    opportunity => opportunity.id !== testId
                );
                this.configuration.automaticPersistence = originalPersistence;
            }
        },

        runPipelineAcceptanceTest() {
            const originalPersistence =
                this.configuration.automaticPersistence;
            const testId =
                this.createId(
                    "pipeline-acceptance-test"
                );

            this.configuration.automaticPersistence =
                false;

            try {
                const opportunity =
                    this.addOpportunity({
                        id: testId,
                        title:
                            "MEOS Grant Pipeline Acceptance Test",
                        provider:
                            "MEOS Test Funder",
                        sourceUrl:
                            "https://example.org/test",
                        verified: true,
                        deadline:
                            new Date(
                                Date.now() +
                                30 * 86400000
                            ).toISOString(),
                        eligibleApplicants: [
                            "501(c)(3) nonprofits"
                        ],
                        requiredDocuments: [
                            "IRS determination letter"
                        ]
                    });

                const stored =
                    this.getOpportunityById(
                        opportunity.id
                    );

                stored.pipelineStage =
                    PIPELINE_STAGES.ON_DESK;
                stored.pipelineHistory =
                    this.normalizePipelineHistory(
                        null,
                        PIPELINE_STAGES.ON_DESK,
                        this.now()
                    );

                const authorized =
                    this.authorizePursuit(
                        opportunity.id,
                        {
                            authorizedBy:
                                "Acceptance Test Executive"
                        }
                    );

                const preparing =
                    this.beginPreparation(
                        opportunity.id,
                        {
                            actor:
                                "Acceptance Test Executive"
                        }
                    );

                const checklist =
                    this.getOpportunityById(
                        opportunity.id
                    ).preparation.checklist;

                checklist.forEach((item) => {
                    this.updatePreparationItem(
                        opportunity.id,
                        item.id,
                        {
                            complete: true,
                            completedBy:
                                "Acceptance Test"
                        }
                    );
                });

                const submitted =
                    this.submitOpportunity(
                        opportunity.id,
                        {
                            submittedBy:
                                "Acceptance Test Executive",
                            confirmationId:
                                "MEOS-TEST-CONFIRMATION"
                        }
                    );

                const pending =
                    this.markAwardPending(
                        opportunity.id
                    );

                const awarded =
                    this.recordOutcome(
                        opportunity.id,
                        PIPELINE_STAGES.AWARDED,
                        {
                            recordedBy:
                                "Acceptance Test Executive",
                            awardedAmount:
                                100000
                        }
                    );

                const finalRecord =
                    this.getOpportunityById(
                        opportunity.id
                    );

                const checks = [
                    {
                        name:
                            "Executive pursuit authorization required and recorded",
                        passed:
                            authorized.success === true &&
                            Boolean(
                                finalRecord
                                    .pursuitAuthorization
                                    ?.authorizedAt
                            )
                    },
                    {
                        name:
                            "Preparing workspace created from real requirements",
                        passed:
                            preparing.success === true &&
                            finalRecord
                                .preparation
                                ?.checklist
                                ?.length >= 7
                    },
                    {
                        name:
                            "Submission gated by completed readiness checklist",
                        passed:
                            submitted.success === true &&
                            Boolean(
                                finalRecord
                                    .submission
                                    ?.confirmationId
                            )
                    },
                    {
                        name:
                            "Award-pending stage is operational",
                        passed:
                            pending.success === true &&
                            finalRecord
                                .pipelineHistory
                                .some(
                                    (entry) =>
                                        entry.stage ===
                                        PIPELINE_STAGES
                                            .AWARD_PENDING
                                )
                    },
                    {
                        name:
                            "Award outcome and amount recorded",
                        passed:
                            awarded.success === true &&
                            finalRecord.pipelineStage ===
                                PIPELINE_STAGES.AWARDED &&
                            finalRecord.outcome
                                ?.awardedAmount ===
                                100000
                    },
                    {
                        name:
                            "Every transition is preserved in order",
                        passed:
                            [
                                PIPELINE_STAGES.ON_DESK,
                                PIPELINE_STAGES.PREPARING,
                                PIPELINE_STAGES.SUBMITTED,
                                PIPELINE_STAGES.AWARD_PENDING,
                                PIPELINE_STAGES.AWARDED
                            ].every(
                                (stage) =>
                                    finalRecord
                                        .pipelineHistory
                                        .some(
                                            (entry) =>
                                                entry.stage ===
                                                stage
                                        )
                            )
                    }
                ];

                return {
                    success:
                        checks.every(
                            (check) => check.passed
                        ),
                    passed:
                        checks.filter(
                            (check) => check.passed
                        ).length,
                    total:
                        checks.length,
                    checks,
                    finalStage:
                        finalRecord.pipelineStage,
                    history:
                        this.clone(
                            finalRecord.pipelineHistory
                        )
                };
            } finally {
                this.opportunities =
                    this.opportunities.filter(
                        (opportunity) =>
                            opportunity.id !== testId
                    );
                this.configuration.automaticPersistence =
                    originalPersistence;
                this.recalculatePipelineAnalytics();
            }
        },

        updateAnalytics(opportunity, evaluation) {
            this.analytics.opportunitiesEvaluated += 1;
            this.analytics.lastEvaluationAt =
                evaluation.evaluatedAt;

            const decision =
                evaluation.recommendation.decision;

            if (
                decision.startsWith("skip-")
            ) {
                this.analytics.opportunitiesRejected += 1;
                this.analytics.executiveHoursProtectedEstimate =
                    Number(
                        (
                            this.analytics.executiveHoursProtectedEstimate +
                            2.5
                        ).toFixed(1)
                    );
            } else if (
                decision ===
                RECOMMENDATIONS.PURSUE_NOW
            ) {
                this.analytics.opportunitiesRecommended += 1;
            }

            const value =
                evaluation.moneyReality
                    .estimatedAwardValue || 0;

            if (
                evaluation.understanding
                    .currentOrFuture === "future"
            ) {
                this.analytics.futurePipelineValue += value;
            } else {
                this.analytics.currentPipelineValue += value;
            }
        },

        getMissionById(id) {
            return (
                this.activeMissions.find(
                    (item) => item.id === id
                ) || null
            );
        },

        getOpportunityById(id) {
            return (
                this.opportunities.find(
                    (item) => item.id === id
                ) || null
            );
        },

        enforceOpportunityLimit() {
            if (
                this.opportunities.length >
                this.configuration.maximumOpportunities
            ) {
                this.opportunities =
                    this.opportunities.slice(
                        -this.configuration.maximumOpportunities
                    );
            }
        },

        getStatus() {
            return {
                name: this.name,
                version: this.version,
                buildId: this.buildId,
                status: this.status,
                operatingMode: this.operatingMode,
                organizationConnected:
                    Boolean(
                        this.getOrganizationProfile()
                    ),
                activeMissionCount:
                    this.activeMissions.length,
                opportunityCount:
                    this.opportunities.length,
                evaluatedOpportunityCount:
                    this.opportunities.filter(
                        (item) => item.evaluation
                    ).length,
                executiveDeskCount:
                    this.getExecutiveDesk().deskCount,
                alignmentStrategyCount:
                    this.opportunities.filter(
                        item => item.alignmentStrategy
                    ).length,
                applicationIntelligenceCount:
                    this.opportunities.filter(
                        item => item.applicationIntelligence
                    ).length,
                executiveReviewPackageCount:
                    this.opportunities.filter(
                        item => item.executiveReviewPackage
                    ).length,
                executiveApplicationPackageCount:
                    this.opportunities.filter(
                        item => item.executiveApplicationPackage
                    ).length,
                submissionPortalIntelligenceCount:
                    this.opportunities.filter(
                        item => item.submissionPortalIntelligence
                    ).length,
                portalSubmissionPackageCount:
                    this.opportunities.filter(
                        item => item.portalSubmissionPackage
                    ).length,
                submissionExecutionCount:
                    this.opportunities.filter(
                        item => item.submissionExecution
                    ).length,
                awardTrackingCount:
                    this.opportunities.filter(
                        item => item.awardTracking
                    ).length,
                fundingPerformance:
                    this.getFundingPerformanceMetrics(),
                pipelineCounts:
                    this.getPipelineCounts(),
                analytics:
                    this.clone(this.analytics)
            };
        },

        exportState() {
            return {
                schema:
                    "meos.grant-office.state.v2",
                version:
                    this.version,
                buildId:
                    this.buildId,
                exportedAt:
                    this.now(),
                activeMissions:
                    this.activeMissions,
                opportunities:
                    this.opportunities,
                executiveReviews:
                    this.executiveReviews,
                analytics:
                    this.analytics
            };
        },

        persistIfEnabled() {
            if (
                !this.configuration.persistenceEnabled ||
                !this.configuration.automaticPersistence
            ) {
                return {
                    success: true,
                    persisted: false
                };
            }

            return this.persist();
        },

        persist() {
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
                        this.exportState()
                    )
                );

                return {
                    success: true,
                    persisted: true
                };
            } catch (error) {
                console.warn(
                    "[MEOS Grant Office] State persistence failed:",
                    error
                );

                return {
                    success: false,
                    persisted: false,
                    error:
                        error.message
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
                const data =
                    JSON.parse(stored);

                if (
                    ![
                        "meos.grant-office.state.v1",
                        "meos.grant-office.state.v2"
                    ].includes(data.schema)
                ) {
                    return {
                        success: false,
                        restored: false,
                        error:
                            "Stored Grant Office data uses an unsupported schema."
                    };
                }

                this.activeMissions =
                    data.activeMissions || [];
                this.opportunities =
                    (data.opportunities || [])
                        .map((opportunity) => {
                            this.ensurePipelineRecord(
                                opportunity
                            );
                            return opportunity;
                        });
                this.executiveReviews =
                    data.executiveReviews || [];
                this.analytics = {
                    ...this.analytics,
                    ...(data.analytics || {})
                };

                this.recalculatePipelineAnalytics();

                return {
                    success: true,
                    restored: true
                };
            } catch (error) {
                return {
                    success: false,
                    restored: false,
                    error:
                        error.message
                };
            }
        },

        runOrganizationNeutralityAcceptanceTest() {
            const nonprofit = {
                legalName: "Community Aid Foundation",
                organizationType: "501(c)(3) nonprofit public charity",
                federalTaxStatus: "501(c)(3)",
                serviceArea: "Santa Cruz County, California",
                state: "California",
                country: "United States"
            };

            const creatorBusiness = {
                legalName: "Independent Creator Studios LLC",
                organizationType: "For-profit limited liability company",
                federalTaxStatus: "",
                serviceArea: "United States",
                country: "United States"
            };

            const veteranNonprofit = {
                legalName: "Veterans Recovery Alliance",
                organizationType: "501(c)(3) nonprofit public charity",
                federalTaxStatus: "501(c)(3)",
                serviceArea: "United States",
                country: "United States"
            };

            const checks = [
                {
                    name: "Nonprofit opportunity confirms nonprofit organization",
                    passed:
                        this.evaluateApplicantCompatibility(
                            ["501(c)(3) nonprofit organizations"],
                            nonprofit
                        ).compatible === true
                },
                {
                    name: "Nonprofit opportunity does not falsely confirm for-profit organization",
                    passed:
                        this.evaluateApplicantCompatibility(
                            ["501(c)(3) nonprofit organizations"],
                            creatorBusiness
                        ).compatible === false
                },
                {
                    name: "For-profit opportunity confirms matching creator business",
                    passed:
                        this.evaluateApplicantCompatibility(
                            ["for-profit businesses", "limited liability companies"],
                            creatorBusiness
                        ).compatible === true
                },
                {
                    name: "Veteran-serving organization is not rejected merely because the population is veterans",
                    passed:
                        this.evaluateApplicantCompatibility(
                            ["501(c)(3) nonprofit organizations"],
                            veteranNonprofit
                        ).compatible === true
                },
                {
                    name: "Federal opportunity remains open for a locally described organization",
                    passed: (() => {
                        const result =
                            this.evaluateGeography(
                                { geography: "United States national federal program" },
                                nonprofit
                            );
                        return result.disqualified === false;
                    })()
                },
                {
                    name: "Missing organization identity remains unresolved rather than silently becoming CCSP",
                    passed:
                        this.evaluateApplicantCompatibility(
                            ["for-profit businesses"],
                            {}
                        ).compatible === null
                }
            ];

            return {
                success:
                    checks.every(check => check.passed),
                commission:
                    "006.023C",
                version:
                    VERSION,
                buildId:
                    BUILD_ID,
                passed:
                    checks.filter(check => check.passed).length,
                total:
                    checks.length,
                checks
            };
        },

        extractConcepts(value) {
            return this.uniqueStrings(
                this.normalizeText(value)
                    .split(" ")
                    .filter(
                        (word) =>
                            word.length >= 4
                    )
            );
        },

        extractMeaningfulWords(value) {
            const stop = new Set([
                "that",
                "this",
                "with",
                "from",
                "into",
                "through",
                "their",
                "there",
                "where",
                "which",
                "would",
                "could",
                "should",
                "program",
                "grant",
                "funding",
                "support",
                "services",
                "community"
            ]);

            return this.normalizeText(value)
                .split(" ")
                .filter(
                    (word) =>
                        word.length >= 4 &&
                        !stop.has(word)
                );
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
                                String(value || "").trim()
                        )
                        .filter(Boolean)
                )
            );
        },

        numberOrNull(value) {
            const number =
                Number(value);

            return Number.isFinite(number)
                ? number
                : null;
        },

        clamp(value, fallback = 0.5) {
            const number =
                Number(value);

            if (!Number.isFinite(number)) {
                return fallback;
            }

            return Math.max(
                0,
                Math.min(1, number)
            );
        },

        parseDate(value) {
            if (!value) {
                return null;
            }

            const timestamp =
                Date.parse(value);

            return Number.isFinite(timestamp)
                ? timestamp
                : null;
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

        createId(prefix = "item") {
            const random =
                global.crypto?.randomUUID
                    ? global.crypto.randomUUID()
                    : `${Date.now().toString(36)}-${Math.random()
                        .toString(36)
                        .slice(2, 10)}`;

            return `${prefix}-${random}`;
        },

        now() {
            return new Date().toISOString();
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

    GrantOffice.OPPORTUNITY_TYPES =
        OPPORTUNITY_TYPES;
    GrantOffice.TIMING_STATUSES =
        TIMING_STATUSES;
    GrantOffice.LIFECYCLE_STATES =
        LIFECYCLE_STATES;
    GrantOffice.PIPELINE_STAGES =
        PIPELINE_STAGES;
    GrantOffice.PIPELINE_STAGE_TRANSITIONS =
        PIPELINE_STAGE_TRANSITIONS;
    GrantOffice.APPLICATION_QUESTION_CATEGORIES =
        APPLICATION_QUESTION_CATEGORIES;
    GrantOffice.APPLICATION_REVIEW_STATES =
        APPLICATION_REVIEW_STATES;
    GrantOffice.APPLICATION_ITEM_STATES =
        APPLICATION_ITEM_STATES;
    GrantOffice.APPLICATION_ASSEMBLY_STATES =
        APPLICATION_ASSEMBLY_STATES;
    GrantOffice.APPLICATION_PACKAGE_ITEM_TYPES =
        APPLICATION_PACKAGE_ITEM_TYPES;
    GrantOffice.SUBMISSION_PORTAL_TYPES =
        SUBMISSION_PORTAL_TYPES;
    GrantOffice.SUBMISSION_PORTAL_STEP_TYPES =
        SUBMISSION_PORTAL_STEP_TYPES;
    GrantOffice.SUBMISSION_FIELD_TYPES =
        SUBMISSION_FIELD_TYPES;
    GrantOffice.SUBMISSION_PORTAL_STATES =
        SUBMISSION_PORTAL_STATES;
    GrantOffice.SUBMISSION_EXECUTION_STATES =
        SUBMISSION_EXECUTION_STATES;
    GrantOffice.AWARD_DECISION_STATES =
        AWARD_DECISION_STATES;
    GrantOffice.FUNDING_RECEIPT_STATES =
        FUNDING_RECEIPT_STATES;
    GrantOffice.RECOMMENDATIONS =
        RECOMMENDATIONS;
    GrantOffice.DISQUALIFIER_TYPES =
        DISQUALIFIER_TYPES;

    global.GrantOffice = GrantOffice;
    GrantOffice.initialize();
})(window);
