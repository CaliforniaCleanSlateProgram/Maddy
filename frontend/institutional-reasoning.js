/*
 * MEOS Institutional Reasoning Engine
 * Version: 1.1.1
 * Build: IR111-REASONING-PERSISTENCE-AUTHORITY-CONVERGENCE-20260808-A
 *
 * Mission:
 * Turn supported institutional evidence into explainable executive analysis,
 * options, risks, dependencies, and recommendations.
 *
 * Brick boundary:
 * This engine reasons over existing MEOS evidence. It does not invent facts,
 * approve policy, execute missions, or alter source records without authorization.
 */

(function initializeInstitutionalReasoning(global) {
    "use strict";

    const STORAGE_KEY = "meos.institutional-reasoning.v1";
    const SCHEMA = "meos.institutional-reasoning.package.v1";

    const REASONING_MODES = {
        EXECUTIVE: "executive",
        DECISION: "decision",
        RISK: "risk",
        COMPLIANCE: "compliance",
        OPERATIONAL: "operational",
        STRATEGIC: "strategic",
        FINANCIAL: "financial",
        GRANT: "grant",
        POLICY: "policy"
    };

    const RECOMMENDATION_STATES = {
        PROCEED: "proceed",
        PROCEED_WITH_CONDITIONS: "proceed-with-conditions",
        HOLD: "hold",
        ESCALATE: "escalate",
        INSUFFICIENT_EVIDENCE: "insufficient-evidence"
    };

    const InstitutionalReasoning = {
        name: "MEOS Institutional Reasoning Engine",
        version: "1.1.1",
        buildId: "IR111-REASONING-PERSISTENCE-AUTHORITY-CONVERGENCE-20260808-A",
        status: "initializing",
        operatingMode: "evidence-grounded-reasoning",

        configuration: {
            persistenceEnabled: true,
            automaticPersistence: true,
            localStorageKey: STORAGE_KEY,
            organizationNeutralCore: true,
            defaultMode: REASONING_MODES.EXECUTIVE,
            defaultEvidenceLimit: 40,
            maximumEvidenceLimit: 100,
            maximumHistory: 200,
            minimumRecommendationConfidence: 0.58,
            minimumProceedConfidence: 0.72,
            requireCitations: true,
            requireExecutiveApproval: true,
            includeAlternatives: true,
            includeRiskAnalysis: true,
            includeDependencies: true,
            includeOpenLoops: true,
            includeConflicts: true,
            includeImplementationSteps: true
        },

        reasoningHistory: [],
        savedAnalyses: [],
        analytics: {
            totalAnalyses: 0,
            insufficientEvidenceCount: 0,
            recommendationCounts: {},
            modeCounts: {},
            lastAnalysisAt: null
        },
        eventListeners: {},
        initializedAt: null,
        persistenceState: {
            authority: "evidence-sources-plus-durable-executive-cognition",
            browserRole: "best-effort-reasoning-continuity-cache",
            browserPersistenceSuspended: false,
            suspensionReason: null,
            suspendedAt: null,
            lastPersistedAt: null,
            lastPersistenceError: null,
            failureCount: 0
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
                `[MEOS] ${this.name} v${this.version} ${this.status}. Build ${this.buildId}.`
            );

            this.emit("reasoning:online", this.getStatus());
            return this.getStatus();
        },

        analyze(question, options = {}) {
            const normalizedQuestion = this.normalizeText(question);

            if (!normalizedQuestion) {
                return {
                    success: false,
                    error: "A reasoning question is required."
                };
            }

            const mode = this.normalizeMode(options.mode);
            const startedAt = performance?.now?.() ?? Date.now();

            const recall = this.runRecall(question, {
                ...options,
                mode: this.mapReasoningModeToRecallMode(mode),
                limit:
                    options.evidenceLimit ||
                    this.configuration.defaultEvidenceLimit
            });

            const evidence = recall.success
                ? recall.evidence || []
                : [];

            const citations = recall.success
                ? recall.citations || []
                : [];

            const decisions = recall.success
                ? recall.decisions || []
                : [];

            const openLoops = recall.success
                ? recall.openLoops || []
                : [];

            const dependencies = recall.success
                ? recall.dependencies || []
                : [];

            const conflicts = recall.success
                ? recall.conflicts || []
                : [];

            const evidenceAssessment =
                this.assessEvidenceQuality({
                    evidence,
                    citations,
                    conflicts,
                    recallConfidence:
                        recall.confidence || 0
                });

            const findings = this.buildFindings({
                question,
                mode,
                evidence,
                decisions,
                openLoops,
                dependencies,
                conflicts
            });

            const risks = this.configuration.includeRiskAnalysis &&
                options.includeRisks !== false
                ? this.buildRiskAnalysis({
                    question,
                    mode,
                    evidence,
                    decisions,
                    openLoops,
                    dependencies,
                    conflicts
                })
                : [];

            const optionsList = this.configuration.includeAlternatives &&
                options.includeAlternatives !== false
                ? this.buildOptions({
                    question,
                    mode,
                    evidence,
                    findings,
                    risks,
                    dependencies,
                    conflicts
                })
                : [];

            const recommendation =
                this.buildRecommendation({
                    question,
                    mode,
                    evidence,
                    evidenceAssessment,
                    findings,
                    risks,
                    options: optionsList,
                    decisions,
                    openLoops,
                    dependencies,
                    conflicts
                });

            const implementation =
                this.configuration.includeImplementationSteps &&
                options.includeImplementation !== false
                    ? this.buildImplementationPlan({
                        recommendation,
                        openLoops,
                        dependencies,
                        risks,
                        options: optionsList
                    })
                    : [];

            const completedAt = performance?.now?.() ?? Date.now();

            const response = {
                success: true,
                question: String(question),
                normalizedQuestion,
                mode,
                recommendation,
                executiveSummary:
                    this.buildExecutiveSummary({
                        question,
                        mode,
                        recommendation,
                        evidenceAssessment,
                        findings,
                        risks,
                        dependencies,
                        conflicts
                    }),
                evidenceAssessment,
                findings,
                options: optionsList,
                risks,
                dependencies:
                    this.configuration.includeDependencies
                        ? dependencies
                        : [],
                openLoops:
                    this.configuration.includeOpenLoops
                        ? openLoops
                        : [],
                conflicts:
                    this.configuration.includeConflicts
                        ? conflicts
                        : [],
                priorDecisions: decisions,
                implementationPlan: implementation,
                citations:
                    this.configuration.requireCitations
                        ? citations
                        : [],
                sourceRecall: {
                    subject: recall.subject || question,
                    confidence: recall.confidence || 0,
                    evidenceCount: evidence.length,
                    citationCount: citations.length
                },
                approvalRequired:
                    this.configuration.requireExecutiveApproval,
                durationMs: Math.max(
                    0,
                    Number((completedAt - startedAt).toFixed(2))
                ),
                generatedAt: new Date().toISOString()
            };

            this.recordAnalysis(response);
            this.emit("reasoning:completed", this.clone(response));

            return response;
        },


        /*
         * Commission 006.016D — Counterfactual Positioning Cognition
         *
         * Future opportunities are not reminders. They are strategic time.
         * This cognition asks what must become true before an opportunity is
         * actionable, distinguishes legitimate adaptation from fabrication,
         * identifies unknowns that require investigation, and creates
         * evidence-grounded positioning moves without claiming eligibility
         * that the institutional record does not support.
         */
        analyzePositioning(subject, options = {}) {
            const query =
                typeof subject === "string"
                    ? subject
                    : subject?.source?.title ||
                      subject?.title ||
                      subject?.summary ||
                      "";

            if (!this.normalizeText(query)) {
                return {
                    success: false,
                    error:
                        "Counterfactual positioning requires an opportunity subject."
                };
            }

            const recallQuestion =
                [
                    query,
                    "opportunity eligibility funded activities restrictions deadline application",
                    "organization mission strategy current capabilities assets dependencies prior decisions",
                    "what must become true before this opportunity becomes actionable"
                ].join(" ");

            const base = this.analyzeStrategy(
                recallQuestion,
                {
                    ...options,
                    evidenceLimit:
                        options.evidenceLimit || 100,
                    includeImplementation: true
                }
            );

            const recalledCase =
                this.findOpportunityCaseInRecall(
                    base,
                    subject
                );

            const caseContent =
                recalledCase?.content ||
                (
                    typeof subject === "object"
                        ? subject
                        : {}
                );

            const opportunity =
                this.extractOpportunityPositioningState(
                    caseContent,
                    recalledCase
                );

            const organization =
                this.extractOrganizationPositioningState(
                    base
                );

            const counterfactuals =
                this.buildPositioningCounterfactuals({
                    opportunity,
                    organization,
                    base
                });

            const alignment =
                this.buildLegitimateAlignmentAnalysis({
                    opportunity,
                    organization,
                    base
                });

            const investigations =
                this.buildPositioningInvestigations({
                    opportunity,
                    counterfactuals
                });

            const moves =
                this.buildPositioningMoves({
                    opportunity,
                    organization,
                    counterfactuals,
                    alignment,
                    investigations
                });

            const futureStates =
                this.simulatePositioningFutures({
                    opportunity,
                    moves,
                    investigations
                });

            const readiness =
                this.assessPositioningReadiness({
                    opportunity,
                    counterfactuals,
                    investigations,
                    alignment
                });

            const response = {
                success: true,
                schema:
                    "meos.institutional-reasoning.positioning-cognition.v1",
                mode: "counterfactual-positioning",
                subject: query,
                opportunity,
                organizationContext: organization,
                whatMustBecomeTrue:
                    counterfactuals,
                legitimateAlignment: alignment,
                consequentialUnknowns:
                    investigations,
                positioningMoves: moves,
                futureStates,
                readiness,
                guardrails: {
                    adaptationAllowed: true,
                    fabricationAllowed: false,
                    unsupportedEligibilityClaimsAllowed:
                        false,
                    missionMutationRequired: false,
                    principle:
                        "Adapt real organizational activity only where it truthfully advances the organization's purposes and the opportunity's verified outcomes."
                },
                sourceReasoning: base,
                generatedAt:
                    new Date().toISOString()
            };

            this.recordAnalysis({
                ...base,
                question:
                    `Counterfactual positioning: ${query}`,
                normalizedQuestion:
                    this.normalizeText(
                        `counterfactual positioning ${query}`
                    ),
                mode: "strategic",
                recommendation:
                    base.recommendation,
                executiveSummary:
                    base.executiveSummary,
                positioningCognition:
                    this.clone(response)
            });

            this.emit(
                "reasoning:positioning-completed",
                this.clone(response)
            );

            return response;
        },

        findOpportunityCaseInRecall(base, subject) {
            const directId =
                typeof subject === "object"
                    ? subject?.id ||
                      subject?.recordId ||
                      subject?.source?.id
                    : null;

            const candidates = [
                ...(base?.sourceRecall?.records || []),
                ...(base?.evidence || []),
                ...(base?.findings || [])
            ];

            const knowledge =
                global.MEOSKnowledgeEngine ||
                global.KnowledgeEngine;

            if (
                directId &&
                knowledge &&
                typeof knowledge.getRecordById ===
                    "function"
            ) {
                const direct =
                    knowledge.getRecordById(directId);

                if (direct) {
                    return direct;
                }
            }

            if (
                knowledge &&
                Array.isArray(knowledge.records)
            ) {
                const normalized =
                    this.normalizeText(
                        typeof subject === "string"
                            ? subject
                            : subject?.source?.title ||
                              subject?.title ||
                              ""
                    );

                const match =
                    knowledge.records.find((record) => {
                        if (
                            record.recordType !==
                            "executive-opportunity-case"
                        ) {
                            return false;
                        }

                        const haystack =
                            this.normalizeText(
                                [
                                    record.title,
                                    record.summary,
                                    record.metadata
                                        ?.opportunitySourceId,
                                    record.content?.source
                                        ?.title
                                ].join(" ")
                            );

                        return (
                            normalized &&
                            (
                                haystack.includes(
                                    normalized
                                ) ||
                                normalized.includes(
                                    haystack
                                )
                            )
                        );
                    });

                if (match) {
                    return match;
                }
            }

            return candidates.find(
                (item) =>
                    item?.recordType ===
                        "executive-opportunity-case" ||
                    item?.metadata?.evidenceClass ===
                        "working-executive-analysis"
            ) || null;
        },

        extractOpportunityPositioningState(
            opportunityCase = {},
            record = null
        ) {
            const intelligence =
                opportunityCase
                    .opportunityIntelligence || {};
            const cycle =
                intelligence.cycle || {};
            const evidence =
                opportunityCase.evidence || {};
            const unknowns =
                Array.isArray(
                    opportunityCase.unknowns
                )
                    ? opportunityCase.unknowns
                    : Array.isArray(
                          record?.metadata?.unknowns
                      )
                        ? record.metadata.unknowns
                        : [];

            return {
                recordId: record?.id || null,
                source:
                    this.clone(
                        opportunityCase.source || {}
                    ),
                cycle:
                    this.clone(cycle),
                moneyEvidence:
                    this.clone(
                        intelligence.moneyEvidence || []
                    ),
                eligibilityEvidence:
                    this.clone(
                        intelligence
                            .eligibilityEvidence || []
                    ),
                fundedActivityEvidence:
                    this.clone(
                        intelligence
                            .fundedActivityEvidence || []
                    ),
                restrictionEvidence:
                    this.clone(
                        intelligence
                            .restrictionEvidence || []
                    ),
                deadlineEvidence:
                    this.clone(
                        intelligence
                            .deadlineEvidence || []
                    ),
                applicationEvidence:
                    this.clone(
                        intelligence
                            .applicationEvidence || []
                    ),
                evidence:
                    this.clone(evidence),
                unknowns:
                    this.clone(unknowns),
                disposition:
                    this.clone(
                        opportunityCase.disposition ||
                        {}
                    ),
                nextAction:
                    opportunityCase.nextAction ||
                    record?.metadata?.nextAction ||
                    null
            };
        },

        extractOrganizationPositioningState(base) {
            const evidence = [
                ...(base?.findings || [])
            ];

            const profile =
                global.CCSPOrganizationalProfile ||
                global.MEOSOrganizationalProfile ||
                global.OrganizationalProfile ||
                null;

            const strategy =
                global.CCSPLongTermStrategy ||
                global.MEOSLongTermStrategy ||
                global.LongTermStrategy ||
                null;

            return {
                profileAvailable:
                    Boolean(profile),
                strategyAvailable:
                    Boolean(strategy),
                profile:
                    profile
                        ? this.clone(
                              profile.profile ||
                              profile.organization ||
                              profile
                          )
                        : null,
                strategy:
                    strategy
                        ? this.clone(
                              strategy.strategy ||
                              strategy
                          )
                        : null,
                recalledInstitutionalEvidence:
                    evidence.slice(0, 20)
            };
        },

        buildPositioningCounterfactuals(context) {
            const opportunity =
                context.opportunity;
            const conditions = [];

            const add = (
                category,
                statement,
                state,
                evidenceBasis,
                blocking = false
            ) => {
                conditions.push({
                    id:
                        this.createId(
                            "positioning-condition"
                        ),
                    category,
                    statement,
                    state,
                    blocking,
                    evidenceBasis
                });
            };

            if (
                opportunity.unknowns.length > 0
            ) {
                opportunity.unknowns.forEach(
                    (unknown) => {
                        add(
                            "unknown",
                            `Verify ${String(
                                unknown
                            ).replace(/\.$/, "")}.`,
                            "unverified",
                            "Executive Opportunity Case unknown",
                            true
                        );
                    }
                );
            }

            if (
                opportunity.evidence?.checks
                    ?.eligibilityVerified !== true
            ) {
                add(
                    "eligibility",
                    "Explicit applicant eligibility must be verified before Maddy can claim the organization qualifies.",
                    "must-become-known",
                    "Eligibility is not verified in the Opportunity Case.",
                    true
                );
            }

            if (
                opportunity.cycle
                    ?.explicitlyOpen !== true
            ) {
                add(
                    "timing",
                    "The next actionable application window must open or be confirmed.",
                    "future-condition",
                    opportunity.cycle?.status ||
                        "No verified open cycle.",
                    true
                );
            }

            if (
                opportunity.deadlineEvidence
                    .length === 0
            ) {
                add(
                    "timing",
                    "A controlling deadline or next-cycle publication date must be verified.",
                    "must-become-known",
                    "No deadline evidence is currently stored.",
                    false
                );
            }

            if (
                opportunity.applicationEvidence
                    .length === 0
            ) {
                add(
                    "execution",
                    "The application path and submission mechanism must be verified.",
                    "must-become-known",
                    "No application-path evidence is currently stored.",
                    false
                );
            }

            if (
                opportunity.fundedActivityEvidence
                    .length > 0
            ) {
                add(
                    "strategic-fit",
                    "The organization must be able to truthfully demonstrate that proposed work produces one or more verified funded outcomes.",
                    "positionable",
                    opportunity
                        .fundedActivityEvidence
                        .slice(0, 6),
                    false
                );
            }

            if (conditions.length === 0) {
                add(
                    "readiness",
                    "Preserve verified readiness and watch for material changes before submission.",
                    "maintain",
                    "No material positioning gap was identified from current evidence.",
                    false
                );
            }

            return conditions;
        },

        buildLegitimateAlignmentAnalysis(context) {
            const funded =
                context.opportunity
                    .fundedActivityEvidence || [];
            const profileText =
                JSON.stringify(
                    context.organization.profile ||
                    {}
                ).toLowerCase();
            const strategyText =
                JSON.stringify(
                    context.organization.strategy ||
                    {}
                ).toLowerCase();

            const alignments = funded
                .map((activity) => {
                    const words =
                        String(activity)
                            .toLowerCase()
                            .match(/[a-z]{4,}/g) || [];
                    const matches =
                        [...new Set(words)]
                            .filter(
                                (word) =>
                                    profileText.includes(
                                        word
                                    ) ||
                                    strategyText.includes(
                                        word
                                    )
                            )
                            .slice(0, 8);

                    return {
                        fundedOutcome: activity,
                        evidenceOfExistingAlignment:
                            matches,
                        state:
                            matches.length > 0
                                ? "adjacent-alignment-candidate"
                                : "not-yet-supported",
                        rule:
                            matches.length > 0
                                ? "Investigate whether existing or planned real work can truthfully produce this funded outcome."
                                : "Do not manufacture alignment. Treat as unsupported until real organizational evidence exists."
                    };
                });

            return {
                candidates: alignments,
                hasAdjacentCandidates:
                    alignments.some(
                        (item) =>
                            item.state ===
                            "adjacent-alignment-candidate"
                    ),
                requiresVerification:
                    alignments.length > 0,
                prohibited:
                    "Changing labels, descriptions, or claims without corresponding real organizational activity."
            };
        },

        buildPositioningInvestigations(context) {
            const investigations =
                context.opportunity.unknowns.map(
                    (unknown, index) => ({
                        id:
                            this.createId(
                                "positioning-investigation"
                            ),
                        priority:
                            index === 0
                                ? "high"
                                : "normal",
                        question:
                            String(unknown),
                        purpose:
                            "Resolve a consequential unknown before the opportunity becomes actionable.",
                        owner: "Maddy",
                        status:
                            "investigation-required"
                    })
                );

            if (
                context.opportunity.evidence
                    ?.checks
                    ?.eligibilityVerified !== true &&
                !investigations.some((item) =>
                    /eligib/i.test(item.question)
                )
            ) {
                investigations.unshift({
                    id:
                        this.createId(
                            "positioning-investigation"
                        ),
                    priority: "high",
                    question:
                        "What are the controlling applicant eligibility requirements for the next cycle?",
                    purpose:
                        "Prevent unsupported qualification claims and identify requirements early enough to act.",
                    owner: "Maddy",
                    status:
                        "investigation-required"
                });
            }

            return investigations;
        },

        buildPositioningMoves(context) {
            const moves = [];
            let order = 1;

            context.investigations.forEach(
                (investigation) => {
                    moves.push({
                        order: order++,
                        type: "investigate",
                        action:
                            investigation.question,
                        whyNow:
                            investigation.purpose,
                        owner: "Maddy",
                        authority:
                            "within-existing-research-authority",
                        status: "proposed"
                    });
                }
            );

            context.alignment.candidates
                .filter(
                    (candidate) =>
                        candidate.state ===
                        "adjacent-alignment-candidate"
                )
                .slice(0, 5)
                .forEach((candidate) => {
                    moves.push({
                        order: order++,
                        type:
                            "strategic-positioning",
                        action:
                            `Test a truthful program pathway connecting existing or planned organizational work to the verified funded outcome: ${candidate.fundedOutcome}`,
                        whyNow:
                            "Early discovery creates time to build real capability and evidence before the funding window opens.",
                        owner: "Maddy",
                        authority:
                            "recommend-and-prepare",
                        status: "proposed",
                        guardrail:
                            "No mission fabrication or unsupported eligibility claim."
                    });
                });

            if (
                context.opportunity.cycle
                    ?.explicitlyOpen !== true
            ) {
                moves.push({
                    order: order++,
                    type: "monitor",
                    action:
                        "Monitor authoritative source material for the next-cycle opening, eligibility changes, deadlines, and application instructions.",
                    whyNow:
                        "Positioning work must continue before the application window rather than begin when the deadline appears.",
                    owner:
                        "Executive Monitoring",
                    authority:
                        "within-existing-monitoring-authority",
                    status: "proposed"
                });
            }

            return moves;
        },

        simulatePositioningFutures(context) {
            const blocking =
                context.investigations.length;
            const moves =
                context.moves.length;

            return [
                {
                    scenario:
                        "do-nothing-until-open",
                    projectedState:
                        blocking > 0
                            ? "high-risk-late-discovery"
                            : "readiness-uncertain",
                    causalReason:
                        `${blocking} consequential unknown(s) remain unresolved; waiting consumes positioning time.`
                },
                {
                    scenario:
                        "investigate-only",
                    projectedState:
                        "better-informed",
                    causalReason:
                        "Unknowns can be reduced, but organizational readiness may not improve unless findings become real positioning work."
                },
                {
                    scenario:
                        "position-now-and-monitor",
                    projectedState:
                        moves > 0
                            ? "increasing-readiness"
                            : "maintain-readiness",
                    causalReason:
                        "Early investigation, legitimate capability building, and monitoring preserve optionality before the next cycle."
                }
            ];
        },

        assessPositioningReadiness(context) {
            const blockers =
                context.counterfactuals.filter(
                    (item) => item.blocking
                ).length;
            const unknowns =
                context.investigations.length;

            const score =
                Math.max(
                    0,
                    Math.min(
                        100,
                        100 -
                        blockers * 18 -
                        unknowns * 8
                    )
                );

            return {
                score,
                state:
                    score >= 80
                        ? "positioned"
                        : score >= 55
                            ? "positioning"
                            : "not-yet-positioned",
                blockingConditionCount:
                    blockers,
                consequentialUnknownCount:
                    unknowns,
                interpretation:
                    blockers > 0
                        ? "The opportunity is strategically useful now, but Maddy must resolve blocking conditions before claiming readiness."
                        : "No blocking condition is currently established; continue monitoring for evidence changes."
            };
        },

        runCounterfactualPositioningAcceptanceTest() {
            const fixture = {
                schema:
                    "meos.executive-opportunity-case.v1",
                source: {
                    title:
                        "Commission 006.016D Future Opportunity",
                    geography:
                        "Santa Cruz County, California"
                },
                opportunityIntelligence: {
                    cycle: {
                        status:
                            "current-cycle-complete",
                        explicitlyOpen: false
                    },
                    fundedActivityEvidence: [
                        "environmental restoration and human services"
                    ],
                    deadlineEvidence: [],
                    applicationEvidence: [
                        "Future application portal"
                    ]
                },
                evidence: {
                    checks: {
                        eligibilityVerified: false
                    }
                },
                unknowns: [
                    "Explicit applicant eligibility",
                    "Next application deadline"
                ],
                disposition: {
                    disposition:
                        "monitor-next-cycle"
                }
            };

            const opportunity =
                this.extractOpportunityPositioningState(
                    fixture
                );
            const organization = {
                profileAvailable: true,
                strategyAvailable: true,
                profile: {
                    mission:
                        "human services and environmental protection"
                },
                strategy: {
                    programs:
                        "watershed restoration"
                },
                recalledInstitutionalEvidence: []
            };
            const counterfactuals =
                this.buildPositioningCounterfactuals({
                    opportunity,
                    organization,
                    base: {}
                });
            const alignment =
                this.buildLegitimateAlignmentAnalysis({
                    opportunity,
                    organization,
                    base: {}
                });
            const investigations =
                this.buildPositioningInvestigations({
                    opportunity,
                    counterfactuals
                });
            const moves =
                this.buildPositioningMoves({
                    opportunity,
                    organization,
                    counterfactuals,
                    alignment,
                    investigations
                });
            const futures =
                this.simulatePositioningFutures({
                    opportunity,
                    moves,
                    investigations
                });

            const checks = [
                {
                    name:
                        "Future opportunity is preserved as strategic work",
                    passed:
                        counterfactuals.length > 0
                },
                {
                    name:
                        "Unverified eligibility remains an explicit blocker",
                    passed:
                        counterfactuals.some(
                            (item) =>
                                item.category ===
                                    "eligibility" &&
                                item.blocking === true
                        )
                },
                {
                    name:
                        "Consequential unknowns become investigations",
                    passed:
                        investigations.length >= 2
                },
                {
                    name:
                        "Adjacent alignment is detected without declaring qualification",
                    passed:
                        alignment
                            .hasAdjacentCandidates ===
                            true &&
                        alignment.candidates.every(
                            (item) =>
                                item.state !==
                                "qualified"
                        )
                },
                {
                    name:
                        "Mission fabrication is explicitly prohibited",
                    passed:
                        /do not manufacture/i.test(
                            alignment.candidates
                                .find(
                                    (item) =>
                                        item.state ===
                                        "not-yet-supported"
                                )?.rule || ""
                        ) ||
                        alignment.prohibited
                            .toLowerCase()
                            .includes(
                                "without corresponding real organizational activity"
                            )
                },
                {
                    name:
                        "Positioning produces work now rather than a reminder",
                    passed:
                        moves.some(
                            (item) =>
                                item.type ===
                                "investigate"
                        ) &&
                        moves.some(
                            (item) =>
                                item.type ===
                                "strategic-positioning"
                        )
                },
                {
                    name:
                        "Future simulation compares inaction with positioning",
                    passed:
                        futures.some(
                            (item) =>
                                item.scenario ===
                                "do-nothing-until-open"
                        ) &&
                        futures.some(
                            (item) =>
                                item.scenario ===
                                "position-now-and-monitor"
                        )
                },
                {
                    name:
                        "Counterfactual cognition remains evidence-grounded and non-executing",
                    passed:
                        this.operatingMode ===
                            "evidence-grounded-reasoning" &&
                        this.configuration
                            .requireExecutiveApproval ===
                            true
                }
            ];

            const passed =
                checks.every((item) => item.passed);

            console.table(checks);
            console.info(
                `[MEOS ${this.version}] Commission 006.016D counterfactual positioning acceptance: ${passed ? "PASS" : "FAIL"}.`
            );

            return {
                commission: "006.016D",
                version: this.version,
                buildId: this.buildId,
                passed,
                checks
            };
        },

        analyzeDecision(question, options = {}) {
            return this.analyze(question, {
                ...options,
                mode: REASONING_MODES.DECISION
            });
        },

        analyzeRisk(question, options = {}) {
            return this.analyze(question, {
                ...options,
                mode: REASONING_MODES.RISK
            });
        },

        analyzeCompliance(question, options = {}) {
            return this.analyze(question, {
                ...options,
                mode: REASONING_MODES.COMPLIANCE
            });
        },

        analyzeOperations(question, options = {}) {
            return this.analyze(question, {
                ...options,
                mode: REASONING_MODES.OPERATIONAL
            });
        },

        analyzeStrategy(question, options = {}) {
            return this.analyze(question, {
                ...options,
                mode: REASONING_MODES.STRATEGIC
            });
        },

        runRecall(question, options = {}) {
            const recall = global.ExecutiveRecall;

            if (
                !recall ||
                typeof recall.recall !== "function"
            ) {
                return {
                    success: false,
                    evidence: [],
                    citations: [],
                    decisions: [],
                    openLoops: [],
                    dependencies: [],
                    conflicts: [],
                    confidence: 0,
                    error: "Executive Recall Engine is unavailable."
                };
            }

            try {
                return recall.recall(question, options);
            } catch (error) {
                console.warn(
                    "[MEOS Institutional Reasoning] Recall failed:",
                    error
                );

                return {
                    success: false,
                    evidence: [],
                    citations: [],
                    decisions: [],
                    openLoops: [],
                    dependencies: [],
                    conflicts: [],
                    confidence: 0,
                    error: error.message
                };
            }
        },

        assessEvidenceQuality(context) {
            const evidence = context.evidence || [];
            const citations = context.citations || [];
            const conflicts = context.conflicts || [];

            if (evidence.length === 0) {
                return {
                    score: 0,
                    label: "insufficient",
                    evidenceCount: 0,
                    citationCoverage: 0,
                    authorityCoverage: 0,
                    recencyCoverage: 0,
                    conflictPenalty: 0,
                    issues: [
                        "No supported evidence was recalled."
                    ]
                };
            }

            const authoritative = evidence.filter(
                (item) =>
                    [
                        "system",
                        "official",
                        "approved"
                    ].includes(item.authority)
            ).length;

            const recent = evidence.filter(
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
                        ageDays <= 365
                    );
                }
            ).length;

            const citationCoverage =
                Math.min(
                    1,
                    citations.length /
                    Math.max(1, evidence.length)
                );

            const authorityCoverage =
                authoritative /
                Math.max(1, evidence.length);

            const recencyCoverage =
                recent /
                Math.max(1, evidence.length);

            const conflictPenalty =
                Math.min(0.35, conflicts.length * 0.06);

            const averageConfidence =
                evidence.reduce(
                    (sum, item) =>
                        sum +
                        (Number(item.confidence) || 0),
                    0
                ) / evidence.length;

            const score =
                averageConfidence * 0.45 +
                citationCoverage * 0.2 +
                authorityCoverage * 0.2 +
                recencyCoverage * 0.15 -
                conflictPenalty;

            const normalizedScore =
                Number(
                    Math.min(
                        0.99,
                        Math.max(0, score)
                    ).toFixed(3)
                );

            const issues = [];

            if (citationCoverage < 0.6) {
                issues.push(
                    "Citation coverage is incomplete."
                );
            }

            if (authorityCoverage < 0.35) {
                issues.push(
                    "Most evidence is not yet authoritative."
                );
            }

            if (conflicts.length > 0) {
                issues.push(
                    "Material conflicts require review."
                );
            }

            if (recencyCoverage < 0.25) {
                issues.push(
                    "Most evidence may be outdated."
                );
            }

            return {
                score: normalizedScore,
                label:
                    normalizedScore >= 0.8
                        ? "strong"
                        : normalizedScore >= 0.6
                            ? "moderate"
                            : normalizedScore >= 0.4
                                ? "limited"
                                : "insufficient",
                evidenceCount: evidence.length,
                citationCoverage:
                    Number(citationCoverage.toFixed(3)),
                authorityCoverage:
                    Number(authorityCoverage.toFixed(3)),
                recencyCoverage:
                    Number(recencyCoverage.toFixed(3)),
                conflictPenalty:
                    Number(conflictPenalty.toFixed(3)),
                issues
            };
        },

        buildFindings(context) {
            const findings = [];

            context.evidence
                .slice(0, 12)
                .forEach((item) => {
                    findings.push({
                        id: this.createId("reasoning-finding"),
                        title: item.title,
                        finding:
                            item.summary ||
                            item.content ||
                            "Relevant institutional evidence exists.",
                        sourceType: item.sourceType,
                        sourceId: item.sourceId,
                        authority: item.authority,
                        confidence: item.confidence,
                        office: item.office,
                        citation: item.citation
                    });
                });

            if (context.decisions.length > 0) {
                findings.push({
                    id: this.createId("reasoning-finding"),
                    title: "Prior Decisions Identified",
                    finding:
                        `${context.decisions.length} prior decision` +
                        `${context.decisions.length === 1 ? "" : "s"} may affect the current analysis.`,
                    sourceType: "derived",
                    sourceId: "prior-decisions",
                    authority: "working",
                    confidence: 0.82,
                    office: null,
                    citation: null
                });
            }

            if (context.openLoops.length > 0) {
                findings.push({
                    id: this.createId("reasoning-finding"),
                    title: "Open Work Remains",
                    finding:
                        `${context.openLoops.length} unresolved action` +
                        `${context.openLoops.length === 1 ? "" : "s"} may affect execution.`,
                    sourceType: "derived",
                    sourceId: "open-loops",
                    authority: "working",
                    confidence: 0.78,
                    office: null,
                    citation: null
                });
            }

            return findings;
        },

        buildRiskAnalysis(context) {
            const risks = [];

            if (context.conflicts.length > 0) {
                risks.push({
                    id: this.createId("reasoning-risk"),
                    category: "governance",
                    title: "Conflicting Institutional Sources",
                    severity: "high",
                    likelihood: "possible",
                    description:
                        "Different source records may provide inconsistent guidance.",
                    mitigation:
                        "Resolve the conflicting sources and identify the controlling authority before acting.",
                    evidence: context.conflicts
                });
            }

            if (context.openLoops.length > 0) {
                risks.push({
                    id: this.createId("reasoning-risk"),
                    category: "execution",
                    title: "Unresolved Work",
                    severity:
                        context.openLoops.length >= 5
                            ? "high"
                            : "moderate",
                    likelihood: "likely",
                    description:
                        "Open actions may delay or weaken execution.",
                    mitigation:
                        "Assign owners, deadlines, dependencies, and approval requirements.",
                    evidence:
                        context.openLoops.slice(0, 10)
                });
            }

            if (context.dependencies.length > 0) {
                risks.push({
                    id: this.createId("reasoning-risk"),
                    category: "dependency",
                    title: "Material Dependencies",
                    severity: "moderate",
                    likelihood: "possible",
                    description:
                        "The decision may rely on unresolved internal or external dependencies.",
                    mitigation:
                        "Confirm each dependency before implementation.",
                    evidence:
                        context.dependencies.slice(0, 10)
                });
            }

            const restrictedEvidence =
                context.evidence.filter(
                    (item) =>
                        [
                            "restricted",
                            "highly-restricted"
                        ].includes(item.sensitivity)
                );

            if (restrictedEvidence.length > 0) {
                risks.push({
                    id: this.createId("reasoning-risk"),
                    category: "information-security",
                    title: "Restricted Information",
                    severity: "moderate",
                    likelihood: "possible",
                    description:
                        "The analysis includes restricted institutional material.",
                    mitigation:
                        "Limit access and sharing to authorized personnel.",
                    evidence:
                        restrictedEvidence
                            .slice(0, 10)
                            .map((item) => ({
                                title: item.title,
                                sourceType: item.sourceType,
                                sourceId: item.sourceId,
                                sensitivity: item.sensitivity
                            }))
                });
            }

            const draftEvidence =
                context.evidence.filter(
                    (item) =>
                        [
                            "draft",
                            "working",
                            "unreviewed"
                        ].includes(item.authority)
                );

            if (
                draftEvidence.length >
                context.evidence.length / 2
            ) {
                risks.push({
                    id: this.createId("reasoning-risk"),
                    category: "evidence-quality",
                    title: "Non-Authoritative Evidence Dominates",
                    severity: "high",
                    likelihood: "likely",
                    description:
                        "Most supporting evidence has not been formally approved.",
                    mitigation:
                        "Confirm the controlling official sources before final approval.",
                    evidence:
                        draftEvidence
                            .slice(0, 10)
                            .map((item) => ({
                                title: item.title,
                                authority: item.authority,
                                citation: item.citation
                            }))
                });
            }

            return risks;
        },

        buildOptions(context) {
            const options = [];

            options.push({
                id: this.createId("reasoning-option"),
                title: "Proceed Under Existing Authority",
                description:
                    "Move forward using the strongest supported institutional position.",
                conditions: [
                    "Evidence quality meets the minimum threshold.",
                    "No unresolved high-severity conflict controls the issue.",
                    "Required approvals are obtained."
                ],
                benefits: [
                    "Maintains momentum.",
                    "Uses existing organizational knowledge.",
                    "Avoids unnecessary delay."
                ],
                tradeoffs: [
                    "May require later adjustment if new evidence appears."
                ],
                suitability:
                    context.conflicts.length === 0 &&
                    context.risks.filter(
                        (risk) => risk.severity === "high"
                    ).length === 0
                        ? "strong"
                        : "limited"
            });

            options.push({
                id: this.createId("reasoning-option"),
                title: "Proceed With Conditions",
                description:
                    "Advance only after named safeguards, approvals, or dependencies are satisfied.",
                conditions: [
                    "Resolve material conflicts.",
                    "Confirm critical dependencies.",
                    "Assign owners for open actions."
                ],
                benefits: [
                    "Balances progress with risk control.",
                    "Preserves executive oversight."
                ],
                tradeoffs: [
                    "Requires additional coordination before execution."
                ],
                suitability: "strong"
            });

            options.push({
                id: this.createId("reasoning-option"),
                title: "Hold and Gather Evidence",
                description:
                    "Pause the decision until the institutional record is complete enough to support action.",
                conditions: [
                    "Identify missing authoritative sources.",
                    "Resolve uncertainty or conflicts.",
                    "Document the final decision."
                ],
                benefits: [
                    "Reduces avoidable governance and compliance risk."
                ],
                tradeoffs: [
                    "Delays execution.",
                    "May affect deadlines or opportunities."
                ],
                suitability:
                    context.evidence.length === 0 ||
                    context.conflicts.length > 0
                        ? "strong"
                        : "moderate"
            });

            return options;
        },

        buildRecommendation(context) {
            const evidenceScore =
                context.evidenceAssessment.score;
            const highRisks =
                context.risks.filter(
                    (risk) => risk.severity === "high"
                );
            const materialConflicts =
                context.conflicts.filter(
                    (conflict) =>
                        conflict.requiresReview !== false
                );

            let state;
            let rationale;

            if (context.evidence.length === 0) {
                state =
                    RECOMMENDATION_STATES
                        .INSUFFICIENT_EVIDENCE;
                rationale =
                    "No supported evidence was available for an institutional recommendation.";
            } else if (
                evidenceScore <
                this.configuration
                    .minimumRecommendationConfidence
            ) {
                state =
                    RECOMMENDATION_STATES.HOLD;
                rationale =
                    "Evidence quality is below the minimum recommendation threshold.";
            } else if (
                materialConflicts.length > 0 ||
                highRisks.length > 0
            ) {
                state =
                    RECOMMENDATION_STATES
                        .PROCEED_WITH_CONDITIONS;
                rationale =
                    "The institutional record supports movement, but material conflicts or risks must be controlled first.";
            } else if (
                evidenceScore >=
                this.configuration.minimumProceedConfidence
            ) {
                state =
                    RECOMMENDATION_STATES.PROCEED;
                rationale =
                    "The available institutional evidence is sufficiently supported for executive consideration.";
            } else {
                state =
                    RECOMMENDATION_STATES
                        .PROCEED_WITH_CONDITIONS;
                rationale =
                    "The evidence supports a conditional path while remaining uncertainties are addressed.";
            }

            const confidence =
                Number(
                    Math.max(
                        0,
                        Math.min(
                            0.99,
                            evidenceScore -
                            highRisks.length * 0.04 -
                            materialConflicts.length * 0.03
                        )
                    ).toFixed(3)
                );

            return {
                state,
                confidence,
                confidenceLabel:
                    confidence >= 0.8
                        ? "high"
                        : confidence >= 0.6
                            ? "moderate"
                            : confidence >= 0.4
                                ? "limited"
                                : "insufficient",
                rationale,
                conditions:
                    state ===
                    RECOMMENDATION_STATES
                        .PROCEED_WITH_CONDITIONS
                        ? this.buildConditions(context)
                        : [],
                executiveApprovalRequired:
                    this.configuration.requireExecutiveApproval,
                generatedBy: this.name,
                generatedAt: new Date().toISOString()
            };
        },

        buildConditions(context) {
            const conditions = [];

            if (context.conflicts.length > 0) {
                conditions.push(
                    "Resolve material source conflicts and identify the controlling authority."
                );
            }

            if (
                context.risks.some(
                    (risk) => risk.severity === "high"
                )
            ) {
                conditions.push(
                    "Mitigate all high-severity risks before execution."
                );
            }

            if (context.openLoops.length > 0) {
                conditions.push(
                    "Assign owners and deadlines for unresolved actions."
                );
            }

            if (context.dependencies.length > 0) {
                conditions.push(
                    "Confirm all critical dependencies."
                );
            }

            if (
                context.evidenceAssessment.authorityCoverage <
                0.5
            ) {
                conditions.push(
                    "Confirm the strongest official or approved source records."
                );
            }

            return conditions;
        },

        buildImplementationPlan(context) {
            const steps = [];

            if (
                context.recommendation.state ===
                RECOMMENDATION_STATES
                    .INSUFFICIENT_EVIDENCE
            ) {
                return [
                    {
                        order: 1,
                        action:
                            "Identify and ingest the missing authoritative source documents.",
                        owner: "Maddy",
                        status: "recommended"
                    },
                    {
                        order: 2,
                        action:
                            "Re-run Executive Recall and Institutional Reasoning.",
                        owner: "Maddy",
                        status: "recommended"
                    }
                ];
            }

            let order = 1;

            context.recommendation.conditions.forEach(
                (condition) => {
                    steps.push({
                        order,
                        action: condition,
                        owner: "Executive Review",
                        status: "required"
                    });
                    order += 1;
                }
            );

            if (context.openLoops.length > 0) {
                steps.push({
                    order,
                    action:
                        "Convert unresolved actions into assigned missions with deadlines.",
                    owner: "Mission Dispatcher",
                    status: "recommended"
                });
                order += 1;
            }

            steps.push({
                order,
                action:
                    "Present the recommendation, evidence, risks, and citations for executive approval.",
                owner: "Maddy",
                status: "required"
            });
            order += 1;

            steps.push({
                order,
                action:
                    "Record the approved decision and rationale in institutional memory.",
                owner: "Knowledge Memory",
                status: "required-after-approval"
            });

            return steps;
        },

        buildExecutiveSummary(context) {
            return {
                headline:
                    `${context.recommendation.state.replace(/-/g, " ")} — ` +
                    `${context.recommendation.confidenceLabel} confidence`,
                recommendation:
                    context.recommendation.rationale,
                evidenceQuality:
                    context.evidenceAssessment.label,
                strongestFindings:
                    context.findings.slice(0, 5),
                highSeverityRisks:
                    context.risks.filter(
                        (risk) => risk.severity === "high"
                    ),
                materialDependencyCount:
                    context.dependencies.length,
                materialConflictCount:
                    context.conflicts.length,
                approvalRequired:
                    context.recommendation
                        .executiveApprovalRequired
            };
        },

        saveAnalysis(name, question, options = {}) {
            if (!name || !question) {
                return {
                    success: false,
                    error:
                        "Saved analyses require a name and question."
                };
            }

            const saved = {
                id: this.createId("saved-analysis"),
                name: String(name).trim(),
                question: String(question).trim(),
                options: this.clone(options),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                runCount: 0,
                lastRunAt: null
            };

            this.savedAnalyses.push(saved);
            this.persistIfEnabled();

            return {
                success: true,
                savedAnalysis: this.clone(saved)
            };
        },

        runSavedAnalysis(savedAnalysisId) {
            const saved = this.savedAnalyses.find(
                (item) => item.id === savedAnalysisId
            );

            if (!saved) {
                return {
                    success: false,
                    error: "Saved analysis was not found."
                };
            }

            saved.runCount += 1;
            saved.lastRunAt = new Date().toISOString();
            saved.updatedAt = saved.lastRunAt;

            const response = this.analyze(
                saved.question,
                saved.options
            );

            this.persistIfEnabled();
            return response;
        },

        recordAnalysis(response) {
            const entry = {
                id: this.createId("reasoning-history"),
                question: response.question,
                normalizedQuestion:
                    response.normalizedQuestion,
                mode: response.mode,
                recommendationState:
                    response.recommendation.state,
                confidence:
                    response.recommendation.confidence,
                evidenceQuality:
                    response.evidenceAssessment.label,
                findingCount:
                    response.findings.length,
                riskCount:
                    response.risks.length,
                conflictCount:
                    response.conflicts.length,
                durationMs:
                    response.durationMs,
                analyzedAt:
                    new Date().toISOString()
            };

            this.reasoningHistory.unshift(entry);

            if (
                this.reasoningHistory.length >
                this.configuration.maximumHistory
            ) {
                this.reasoningHistory.length =
                    this.configuration.maximumHistory;
            }

            this.analytics.totalAnalyses += 1;
            this.analytics.lastAnalysisAt =
                entry.analyzedAt;
            this.analytics.modeCounts[
                response.mode
            ] =
                (
                    this.analytics.modeCounts[
                        response.mode
                    ] || 0
                ) + 1;
            this.analytics.recommendationCounts[
                response.recommendation.state
            ] =
                (
                    this.analytics.recommendationCounts[
                        response.recommendation.state
                    ] || 0
                ) + 1;

            if (
                response.recommendation.state ===
                RECOMMENDATION_STATES
                    .INSUFFICIENT_EVIDENCE
            ) {
                this.analytics
                    .insufficientEvidenceCount += 1;
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
                "knowledge-system-institutional-reasoning";
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
                title:
                    "MEOS Institutional Reasoning Engine",
                summary:
                    "Universal evidence-grounded executive analysis, option generation, risk assessment, dependency review, and recommendation support.",
                content:
                    "Institutional Reasoning analyzes recalled evidence and produces explainable executive recommendations. It does not invent facts, approve policy, execute missions, or alter source records.",
                tags: [
                    "meos-core",
                    "institutional-reasoning",
                    "system-component"
                ],
                topics: [
                    "reasoning",
                    "decision-support",
                    "risk",
                    "dependencies",
                    "recommendations"
                ],
                authority: "system",
                confidence: 1,
                sensitivity: "internal",
                officeAccess: ["all"],
                metadata: {
                    componentVersion: this.version,
                    organizationNeutralCore: true,
                    brickBoundary:
                        "Evidence-grounded decision support only; no autonomous approval or execution."
                },
                createdBy: this.name
            });
        },

        getConnectedSources() {
            return {
                executiveRecall:
                    Boolean(global.ExecutiveRecall),
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
                buildId: this.buildId,
                status: this.status,
                operatingMode: this.operatingMode,
                organizationNeutralCore:
                    this.configuration.organizationNeutralCore,
                connectedSources: connected,
                connectedSourceCount:
                    Object.values(connected)
                        .filter(Boolean).length,
                reasoningHistoryCount:
                    this.reasoningHistory.length,
                savedAnalysisCount:
                    this.savedAnalyses.length,
                analytics:
                    this.clone(this.analytics),
                persistence: this.clone(this.persistenceState),
                initializedAt:
                    this.initializedAt
            };
        },

        exportReasoning(options = {}) {
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
                    savedAnalyses:
                        this.savedAnalyses,
                    reasoningHistory:
                        options.includeHistory === false
                            ? []
                            : this.reasoningHistory,
                    analytics:
                        this.analytics
                }
            };
        },

        importReasoning(payload, options = {}) {
            let data = payload;

            if (typeof payload === "string") {
                try {
                    data = JSON.parse(payload);
                } catch (error) {
                    return {
                        success: false,
                        error:
                            "The Institutional Reasoning import is not valid JSON."
                    };
                }
            }

            if (!data || data.schema !== SCHEMA) {
                return {
                    success: false,
                    error:
                        "The import is not a MEOS Institutional Reasoning package."
                };
            }

            if (options.replace === true) {
                this.reasoningHistory = [];
                this.savedAnalyses = [];
                this.analytics = {
                    totalAnalyses: 0,
                    insufficientEvidenceCount: 0,
                    recommendationCounts: {},
                    modeCounts: {},
                    lastAnalysisAt: null
                };
            }

            this.mergeById(
                this.savedAnalyses,
                data.savedAnalyses || []
            );
            this.mergeById(
                this.reasoningHistory,
                data.reasoningHistory || []
            );

            if (data.analytics) {
                this.analytics = {
                    ...this.analytics,
                    ...data.analytics
                };
            }

            if (options.skipPersistence !== true) {
                this.persistIfEnabled();
            }

            return {
                success: true,
                status: this.getStatus()
            };
        },

        isQuotaExceededError(error) {
            return Boolean(
                error &&
                (
                    error.name === "QuotaExceededError" ||
                    error.code === 22 ||
                    error.code === 1014 ||
                    /quota/i.test(String(error.message || ""))
                )
            );
        },

        suspendBrowserPersistence(error, reason = "storage-quota-exhausted") {
            const alreadySuspended =
                this.persistenceState.browserPersistenceSuspended === true;

            this.persistenceState.browserPersistenceSuspended = true;
            this.persistenceState.suspensionReason = reason;
            this.persistenceState.suspendedAt =
                this.persistenceState.suspendedAt || new Date().toISOString();
            this.persistenceState.lastPersistenceError =
                error?.message || String(error || reason);
            this.persistenceState.failureCount += 1;

            if (!alreadySuspended) {
                console.warn(
                    "[MEOS Institutional Reasoning] Browser reasoning continuity-cache persistence suspended after storage quota exhaustion. Evidence-grounded reasoning and durable Executive Brain cognition remain operational; repeated local writes are suppressed until persistence is explicitly retried."
                );
            }

            return this.clone(this.persistenceState);
        },

        retryBrowserPersistence() {
            this.persistenceState.browserPersistenceSuspended = false;
            this.persistenceState.suspensionReason = null;
            this.persistenceState.suspendedAt = null;
            this.persistenceState.lastPersistenceError = null;
            return this.persist({ force: true });
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

        persist(options = {}) {
            if (
                this.persistenceState.browserPersistenceSuspended === true &&
                options.force !== true
            ) {
                return {
                    success: true,
                    persisted: false,
                    suspended: true,
                    authority: this.persistenceState.authority,
                    browserRole: this.persistenceState.browserRole
                };
            }

            if (
                !this.configuration.persistenceEnabled
            ) {
                return {
                    success: false,
                    error:
                        "Institutional Reasoning persistence is disabled."
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
                        this.exportReasoning({
                            includeHistory: true
                        }).data
                    )
                );

                this.persistenceState.lastPersistedAt =
                    new Date().toISOString();
                this.persistenceState.lastPersistenceError = null;

                return {
                    success: true,
                    persisted: true,
                    authority: this.persistenceState.authority,
                    browserRole: this.persistenceState.browserRole
                };
            } catch (error) {
                if (this.isQuotaExceededError(error)) {
                    this.suspendBrowserPersistence(error);
                    return {
                        success: false,
                        persisted: false,
                        suspended: true,
                        error: error.message,
                        authority: this.persistenceState.authority,
                        browserRole: this.persistenceState.browserRole
                    };
                }

                this.persistenceState.lastPersistenceError = error.message;
                this.persistenceState.failureCount += 1;
                console.error(
                    "[MEOS Institutional Reasoning] Persistence failed:",
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
                const result = this.importReasoning(
                    JSON.parse(stored),
                    {
                        replace: true,
                        skipPersistence: true
                    }
                );

                return {
                    ...result,
                    restored: result.success
                };
            } catch (error) {
                console.warn(
                    "[MEOS Institutional Reasoning] Stored state could not be restored:",
                    error
                );

                return {
                    success: false,
                    restored: false,
                    error: error.message
                };
            }
        },

        runPersistenceAuthorityAcceptanceTest() {
            const originalSuspended =
                this.persistenceState.browserPersistenceSuspended;
            const originalReason = this.persistenceState.suspensionReason;
            const originalSuspendedAt = this.persistenceState.suspendedAt;
            const originalError = this.persistenceState.lastPersistenceError;
            const originalFailureCount = this.persistenceState.failureCount;

            const simulatedQuotaError = new Error(
                "Simulated browser storage quota exhaustion"
            );
            simulatedQuotaError.name = "QuotaExceededError";

            this.suspendBrowserPersistence(
                simulatedQuotaError,
                "acceptance-test-quota-exhaustion"
            );

            const suppressed = this.persist();
            const checks = [
                {
                    name: "Institutional Reasoning declares evidence sources plus durable Executive Brain cognition as authority",
                    passed:
                        this.persistenceState.authority ===
                        "evidence-sources-plus-durable-executive-cognition"
                },
                {
                    name: "Browser persistence is explicitly a best-effort reasoning continuity cache rather than institutional authority",
                    passed:
                        this.persistenceState.browserRole ===
                        "best-effort-reasoning-continuity-cache"
                },
                {
                    name: "Quota exhaustion trips a fail-visible browser persistence circuit breaker",
                    passed:
                        this.persistenceState.browserPersistenceSuspended === true &&
                        this.persistenceState.suspensionReason ===
                        "acceptance-test-quota-exhaustion"
                },
                {
                    name: "Repeated reasoning-cache writes are suppressed after the first quota failure",
                    passed:
                        suppressed?.persisted === false &&
                        suppressed?.suspended === true
                },
                {
                    name: "Institutional Reasoning remains online while its browser continuity cache is suspended",
                    passed: this.status === "online"
                },
                {
                    name: "Reasoning history and saved analyses remain in memory when browser persistence degrades",
                    passed:
                        Array.isArray(this.reasoningHistory) &&
                        Array.isArray(this.savedAnalyses)
                },
                {
                    name: "Persistence degradation grants no approval or execution authority",
                    passed:
                        this.configuration.requireExecutiveApproval === true &&
                        this.operatingMode === "evidence-grounded-reasoning"
                }
            ];

            this.persistenceState.browserPersistenceSuspended = originalSuspended;
            this.persistenceState.suspensionReason = originalReason;
            this.persistenceState.suspendedAt = originalSuspendedAt;
            this.persistenceState.lastPersistenceError = originalError;
            this.persistenceState.failureCount = originalFailureCount;

            const result = {
                commission: "006.017D4H2B",
                version: this.version,
                buildId: this.buildId,
                passed: checks.every((check) => check.passed),
                checks
            };

            console.table(checks);
            console.info(
                `[MEOS ${this.version}] Commission 006.017D4H2B Institutional Reasoning persistence authority convergence: ${result.passed ? "PASS" : "FAIL"}.`
            );
            return result;
        },

        clear(options = {}) {
            if (options.confirm !== true) {
                return {
                    success: false,
                    error:
                        "Clearing Institutional Reasoning data requires { confirm: true }."
                };
            }

            this.reasoningHistory = [];
            this.savedAnalyses = [];
            this.analytics = {
                totalAnalyses: 0,
                insufficientEvidenceCount: 0,
                recommendationCounts: {},
                modeCounts: {},
                lastAnalysisAt: null
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

            return Object.values(
                REASONING_MODES
            ).includes(value)
                ? value
                : this.configuration.defaultMode;
        },

        mapReasoningModeToRecallMode(mode) {
            const map = {
                executive: "executive",
                decision: "decision",
                risk: "executive",
                compliance: "document",
                operational: "mission",
                strategic: "project",
                financial: "document",
                grant: "document",
                policy: "decision"
            };

            return map[mode] || "executive";
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
                        `[MEOS Institutional Reasoning] Event listener failed for "${eventName}":`,
                        error
                    );
                }
            });
        }
    };

    InstitutionalReasoning.REASONING_MODES =
        REASONING_MODES;
    InstitutionalReasoning.RECOMMENDATION_STATES =
        RECOMMENDATION_STATES;

    global.InstitutionalReasoning =
        InstitutionalReasoning;
    InstitutionalReasoning.initialize();
})(window);
