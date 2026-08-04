/*
 * Maddy Executive Operating System (MEOS)
 * Grant Office
 *
 * Version: 1.4.1
 * Build: GO141-SCHEMA-TOLERANT-ALIGNMENT-20260804-A
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
    const VERSION = "1.4.1";
    const BUILD_ID = "GO141-SCHEMA-TOLERANT-ALIGNMENT-20260804-A";
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
                global.OrganizationalProfile ||
                global.CCSPOrganizationalProfile ||
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

            const recommendation =
                authoritativeEvaluation.recommendation;

            const missingInformation =
                this.identifyMissingInformation({
                    opportunity,
                    organizationalFit,
                    eligibility,
                    moneyReality,
                    timing,
                    competitiveness,
                    execution
                });

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
                legacyRecommendation,
                authoritativeResourceDecision,
                missingInformation:
                    authoritativeEvaluation.missingInformation,
                executiveSummary:
                    authoritativeEvaluation.executiveSummary,
                evaluatedAt:
                    authoritativeEvaluation.evaluatedAt,
                evaluatedBy:
                    authoritativeEvaluation.evaluatedBy,
                executiveApprovalRequired:
                    authoritativeEvaluation.executiveApprovalRequired
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

            const applicantText =
                this.normalizeText(
                    opportunity.eligibleApplicants.join(" ")
                );
            const organizationText =
                this.normalizeText([
                    organization.organizationType,
                    organization.federalTaxStatus,
                    organization.legalName
                ].join(" "));

            if (!applicantText) {
                conditions.push(
                    "Applicant eligibility language is missing."
                );
            } else if (
                applicantText.includes("nonprofit") ||
                applicantText.includes("501 c 3") ||
                applicantText.includes("public charity")
            ) {
                confirmed.push(
                    "Nonprofit/public-charity applicant class appears permitted."
                );
            } else if (
                !applicantText
                    .split(" ")
                    .some((word) =>
                        organizationText.includes(word)
                    )
            ) {
                failures.push(
                    "Applicant class does not clearly include the organization."
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
            const grant =
                this.normalizeText(
                    opportunity.geography
                );
            const service =
                this.normalizeText(
                    organization.serviceArea
                );

            if (!grant) {
                return {
                    confirmed: false,
                    disqualified: false,
                    explanation:
                        "Geographic eligibility is not stated."
                };
            }

            if (
                [
                    "national",
                    "united states",
                    "california",
                    "statewide"
                ].some((term) =>
                    grant.includes(term)
                )
            ) {
                return {
                    confirmed: true,
                    disqualified: false,
                    explanation:
                        "Geography appears compatible with the service area."
                };
            }

            const serviceTerms =
                service
                    .split(" ")
                    .filter(
                        (term) =>
                            term.length >= 4
                    );

            const overlap =
                serviceTerms.some(
                    (term) =>
                        grant.includes(term)
                );

            if (overlap) {
                return {
                    confirmed: true,
                    disqualified: false,
                    explanation:
                        "Opportunity geography overlaps the organizational service area."
                };
            }

            return {
                confirmed: false,
                disqualified: true,
                explanation:
                    "Opportunity geography does not appear to include the organizational service area."
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
                global.CCSPLongTermStrategy ||
                global.MEOSLongTermStrategy ||
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
                        "Do not claim direct fish restoration unless CCSP performs or documents direct habitat work."
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
    GrantOffice.RECOMMENDATIONS =
        RECOMMENDATIONS;
    GrantOffice.DISQUALIFIER_TYPES =
        DISQUALIFIER_TYPES;

    global.GrantOffice = GrantOffice;
    GrantOffice.initialize();
})(window);
