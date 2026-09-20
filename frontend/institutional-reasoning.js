/*
 * MEOS Institutional Reasoning Engine
 * Version: 1.3.2
 * Build: IR132-RECONSTRUCTIVE-REASONING-CONTINUITY-20260919-A
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
    const EPISTEMIC_CONTINUITY_SCHEMA = "meos.maddy.epistemic-continuity.v1";

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
        version: "1.3.2",
        buildId: "IR132-RECONSTRUCTIVE-REASONING-CONTINUITY-20260919-A",
        status: "initializing",
        operatingMode: "evidence-grounded-reasoning",

        configuration: {
            persistenceEnabled: false,
            automaticPersistence: false,
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
            reasoningModel: "reconstructive-institutional-reasoning",
            browserRole: "optional-disposable-reasoning-workspace",
            browserAuthority: false,
            automaticBrowserHydration: false,
            sourceReconstructionEnabled: true,
            sessionStateDurability: "ephemeral-until-governed-durable-scope",
            durableSavedAnalysisScopeRequired: true,
            reconstructionCount: 0,
            lastReconstructionAt: null,
            lastEvidenceLineageFingerprint: null,
            lastEpistemicLineageFingerprint: null,
            lastReasoningBasisFingerprint: null,
            legacySnapshotObserved: false,
            legacySnapshotBytes: 0,
            legacySnapshotSchema: null,
            legacySnapshotVersion: null,
            legacySnapshotImported: false,
            browserPersistenceSuspended: false,
            suspensionReason: null,
            suspendedAt: null,
            lastPersistedAt: null,
            lastRestoreAt: null,
            lastPersistenceError: null,
            failureCount: 0
        },

        initialize(options = {}) {
            this.configuration = {
                ...this.configuration,
                ...(options.configuration || options)
            };

            this.observeLegacyBrowserSnapshot();
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

            /*
             * QDPA Commission 5A — Cross-Maddy Epistemic Integration / Reasoning Bridge
             *
             * Recall/search evidence historically entered Institutional Reasoning as a
             * flat evidence array. That meant the richer Epistemic Identity, Reality
             * Reconstruction, and Counterparty Intelligence structures created by the
             * existing Executive Evidence Integrity organ could disappear at the
             * reasoning boundary. Preserve one bounded epistemic continuity envelope
             * here and place it inside evidenceAssessment, a field already retained by
             * Executive Planning and Executive Decision. No new truth engine or
             * persistence authority is created.
             */
            const epistemicContinuity =
                this.prepareEpistemicContinuity(
                    question,
                    evidence,
                    {
                        ...options,
                        recall
                    }
                );

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

            evidenceAssessment.epistemicContinuity =
                this.clone(epistemicContinuity);

            /*
             * IR132 — Reconstructive Reasoning Continuity
             *
             * A reasoning result is not durable because a browser snapshot remembers it.
             * It is reconstructible because the current question, source evidence, and
             * epistemic conditions that produced it remain inspectable. Carry a compact
             * deterministic lineage fingerprint through evidenceAssessment so downstream
             * Planning/Decision can retain the basis of the judgment without treating
             * browser state as truth authority.
             */
            const reasoningContinuity =
                this.buildReasoningContinuity({
                    question,
                    mode,
                    evidence,
                    epistemicContinuity,
                    recall
                });

            evidenceAssessment.reasoningContinuity =
                this.clone(reasoningContinuity);

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
                epistemicContinuity:
                    this.clone(epistemicContinuity),
                reasoningContinuity:
                    this.clone(reasoningContinuity),
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

            /*
             * Commission 006.018E1 — Positioning Target Acquisition Guard
             *
             * Counterfactual positioning is opportunity-specific cognition. A
             * generic salience sentence (for example "Monitoring evidence
             * changed") must never fall through to the first Opportunity Case
             * returned by recall. That behavior silently substituted an
             * unrelated target and allowed unchanged reality to manufacture new
             * investigate/monitor Missions.
             *
             * Require a positively resolved Opportunity Case, or a direct raw
             * Opportunity Case object supplied by the caller. Unknown target =
             * no positioning, no Plan, no Hallway work.
             */
            const directCaseContent =
                this.extractDirectOpportunityCaseContent(subject);

            if (!recalledCase && !directCaseContent) {
                return {
                    success: false,
                    status: "positioning-target-unresolved",
                    error:
                        "Counterfactual positioning requires a positively identified Executive Opportunity Case; generic cognitive salience cannot select an arbitrary opportunity.",
                    subject: query,
                    targetResolved: false
                };
            }

            const caseContent =
                recalledCase?.content ||
                directCaseContent ||
                {};

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

        extractDirectOpportunityCaseContent(subject) {
            if (!subject || typeof subject !== "object") {
                return null;
            }

            const content =
                subject?.content &&
                typeof subject.content === "object"
                    ? subject.content
                    : subject;

            const recordType =
                String(subject?.recordType || "")
                    .trim()
                    .toLowerCase();
            const schema =
                String(content?.schema || subject?.schema || "")
                    .trim()
                    .toLowerCase();

            const explicitlyOpportunityCase =
                recordType === "executive-opportunity-case" ||
                schema === "meos.executive-opportunity-case.v1";

            const structurallyOpportunityCase =
                Boolean(content?.source) &&
                Boolean(content?.opportunityIntelligence) &&
                (
                    Boolean(content?.disposition) ||
                    Array.isArray(content?.unknowns) ||
                    Boolean(content?.evidence)
                );

            return explicitlyOpportunityCase || structurallyOpportunityCase
                ? content
                : null;
        },

        isOpportunityCaseRecord(record) {
            if (!record || typeof record !== "object") {
                return false;
            }

            return (
                String(record.recordType || "")
                    .trim()
                    .toLowerCase() ===
                    "executive-opportunity-case" ||
                String(record?.content?.schema || record?.schema || "")
                    .trim()
                    .toLowerCase() ===
                    "meos.executive-opportunity-case.v1"
            );
        },

        opportunityCaseMatchesSubject(record, subject) {
            if (!this.isOpportunityCaseRecord(record)) {
                return false;
            }

            const directId =
                typeof subject === "object"
                    ? subject?.id ||
                      subject?.recordId ||
                      subject?.source?.id ||
                      null
                    : null;

            if (
                directId &&
                [
                    record?.id,
                    record?.recordId,
                    record?.metadata?.opportunitySourceId,
                    record?.content?.source?.id
                ]
                    .filter(Boolean)
                    .some(value =>
                        String(value) === String(directId)
                    )
            ) {
                return true;
            }

            const query =
                this.normalizeText(
                    typeof subject === "string"
                        ? subject
                        : subject?.source?.title ||
                          subject?.title ||
                          subject?.summary ||
                          ""
                );

            if (!query) {
                return false;
            }

            const identities = [
                record?.id,
                record?.recordId,
                record?.metadata?.opportunitySourceId,
                record?.title
                    ?.replace(
                        /^Executive Opportunity Case\s*[—-]\s*/i,
                        ""
                    ),
                record?.content?.source?.title,
                record?.content?.source?.id,
                record?.content?.source?.url
            ]
                .map(value => this.normalizeText(value))
                .filter(value => value.length >= 8);

            return identities.some(identity =>
                query === identity ||
                (query.length >= 12 && identity.includes(query)) ||
                (identity.length >= 12 && query.includes(identity))
            );
        },

        findOpportunityCaseInRecall(base, subject) {
            const directId =
                typeof subject === "object"
                    ? subject?.id ||
                      subject?.recordId ||
                      subject?.source?.id
                    : null;

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

                if (
                    direct &&
                    this.isOpportunityCaseRecord(direct)
                ) {
                    return direct;
                }
            }

            const candidates = [
                ...(base?.sourceRecall?.records || []),
                ...(base?.evidence || []),
                ...(base?.findings || []),
                ...(Array.isArray(knowledge?.records)
                    ? knowledge.records
                    : [])
            ]
                .filter(item =>
                    this.isOpportunityCaseRecord(item)
                );

            const seen = new Set();
            const unique = candidates.filter(item => {
                const key =
                    item?.id ||
                    item?.recordId ||
                    item?.content?.source?.id ||
                    item?.content?.source?.title ||
                    item?.title ||
                    null;
                if (!key) return true;
                const normalizedKey = String(key);
                if (seen.has(normalizedKey)) return false;
                seen.add(normalizedKey);
                return true;
            });

            return unique.find(item =>
                this.opportunityCaseMatchesSubject(
                    item,
                    subject
                )
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

        runPositioningTargetAcquisitionAcceptanceTest() {
            const originalKnowledge =
                global.MEOSKnowledgeEngine;
            const originalAnalyzeStrategy =
                this.analyzeStrategy;
            const originalRecordAnalysis =
                this.recordAnalysis;
            const originalEmit =
                this.emit;

            const caseA = {
                id: "opportunity-case-a",
                recordType: "executive-opportunity-case",
                title:
                    "Executive Opportunity Case — Community Foundation Santa Cruz County",
                metadata: {
                    opportunitySourceId: "cf-santa-cruz"
                },
                content: {
                    schema:
                        "meos.executive-opportunity-case.v1",
                    source: {
                        id: "cf-santa-cruz",
                        title:
                            "Community Foundation Santa Cruz County",
                        url:
                            "https://example.test/community-foundation"
                    },
                    opportunityIntelligence: {
                        cycle: {
                            status: "current-cycle-complete",
                            explicitlyOpen: false
                        }
                    },
                    evidence: { checks: {} },
                    unknowns: [
                        "Explicit applicant eligibility"
                    ],
                    disposition: {
                        disposition: "monitor-next-cycle"
                    }
                }
            };

            const caseB = {
                id: "opportunity-case-b",
                recordType: "executive-opportunity-case",
                title:
                    "Executive Opportunity Case — Monterey Bay Future Fund",
                metadata: {
                    opportunitySourceId: "monterey-future-fund"
                },
                content: {
                    schema:
                        "meos.executive-opportunity-case.v1",
                    source: {
                        id: "monterey-future-fund",
                        title: "Monterey Bay Future Fund"
                    },
                    opportunityIntelligence: {
                        cycle: {
                            status: "future-cycle",
                            explicitlyOpen: false
                        }
                    },
                    evidence: { checks: {} },
                    unknowns: [],
                    disposition: {
                        disposition: "watching"
                    }
                }
            };

            const base = {
                sourceRecall: {
                    records: [caseA, caseB]
                },
                evidence: [],
                findings: []
            };

            try {
                global.MEOSKnowledgeEngine = {
                    records: [caseA, caseB],
                    getRecordById(id) {
                        return [caseA, caseB].find(
                            item => item.id === id
                        ) || null;
                    }
                };

                this.analyzeStrategy = () =>
                    this.clone(base);
                this.recordAnalysis = () => true;
                this.emit = () => true;

                const generic =
                    this.findOpportunityCaseInRecall(
                        base,
                        "Monitoring evidence changed."
                    );
                const exact =
                    this.findOpportunityCaseInRecall(
                        base,
                        "Community Foundation Santa Cruz County"
                    );
                const second =
                    this.findOpportunityCaseInRecall(
                        base,
                        "Monterey Bay Future Fund"
                    );
                const directId =
                    this.findOpportunityCaseInRecall(
                        base,
                        {
                            recordId: "opportunity-case-a"
                        }
                    );
                const unresolved =
                    this.analyzePositioning(
                        "Monitoring evidence changed.",
                        { evidenceLimit: 10 }
                    );
                const resolved =
                    this.analyzePositioning(
                        "Community Foundation Santa Cruz County",
                        { evidenceLimit: 10 }
                    );
                const rawDirect =
                    this.extractDirectOpportunityCaseContent(
                        caseB.content
                    );

                const checks = [
                    {
                        name:
                            "Generic salience cannot bind the first recalled Opportunity Case",
                        passed: generic === null
                    },
                    {
                        name:
                            "Exact opportunity title resolves the intended Opportunity Case",
                        passed: exact?.id === caseA.id
                    },
                    {
                        name:
                            "Multiple recalled cases do not cross-target one another",
                        passed: second?.id === caseB.id
                    },
                    {
                        name:
                            "Direct durable Opportunity Case identity resolves deterministically",
                        passed: directId?.id === caseA.id
                    },
                    {
                        name:
                            "Unresolved target hard-stops positioning before work can be produced",
                        passed:
                            unresolved?.success === false &&
                            unresolved?.status ===
                                "positioning-target-unresolved"
                    },
                    {
                        name:
                            "Verified target still reaches counterfactual positioning cognition",
                        passed:
                            resolved?.success === true &&
                            resolved?.opportunity?.recordId ===
                                caseA.id
                    },
                    {
                        name:
                            "Direct raw Opportunity Case content remains a valid governed target",
                        passed:
                            rawDirect?.source?.title ===
                            caseB.content.source.title
                    }
                ];

                const passed =
                    checks.every(item => item.passed);

                console.table(checks);
                console.info(
                    `[MEOS ${this.version}] Commission 006.018E1 Positioning Target Acquisition Guard: ${passed ? "PASS" : "FAIL"}.`
                );

                return {
                    commission: "006.018E1",
                    version: this.version,
                    buildId: this.buildId,
                    passed,
                    checks
                };
            } finally {
                this.analyzeStrategy =
                    originalAnalyzeStrategy;
                this.recordAnalysis =
                    originalRecordAnalysis;
                this.emit = originalEmit;
                if (originalKnowledge === undefined) {
                    delete global.MEOSKnowledgeEngine;
                } else {
                    global.MEOSKnowledgeEngine =
                        originalKnowledge;
                }
            }
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

        prepareEpistemicContinuity(question, evidence = [], options = {}) {
            const integrity = global.ExecutiveEvidenceIntegrity;
            const sourceEvidence = Array.isArray(evidence)
                ? evidence
                : [];

            const unavailable = {
                schema: EPISTEMIC_CONTINUITY_SCHEMA,
                available: false,
                preserved: false,
                subject: String(question || ""),
                sourceEvidenceCount: sourceEvidence.length,
                governedEvidenceCount: 0,
                integrityVersion: null,
                integrityBuildId: null,
                packageConfidence: null,
                epistemicClaims: [],
                realityReconstruction: null,
                counterpartyIntelligence: null,
                priorExperience: [],
                experienceInfluence: {
                    present: false,
                    count: 0,
                    role: "challengeable-prior-experience",
                    rule: "Prior Maddy experience may inform future judgment but never becomes truth authority."
                },
                conflicts: [],
                preservationRule:
                    "Epistemic structure must remain attached across cognition; unavailable evidence governance is reported rather than silently fabricated.",
                generatedAt: new Date().toISOString()
            };

            if (!integrity || typeof integrity.prepare !== "function") {
                return unavailable;
            }

            try {
                /*
                 * QDPA Commission 5D — Recalled Experience → Future Cognition
                 *
                 * A recalled institutional lesson is not merely a fresh source. It is
                 * Maddy's prior experience: a consequence-linked record that may carry
                 * the epistemic conditions under which it was learned. Preserve that
                 * lineage separately so future cognition can be changed by experience
                 * without promoting memory into unquestionable truth.
                 */
                const priorExperience =
                    this.extractRecalledEpistemicExperience(sourceEvidence);

                const prepared = integrity.prepare(
                    {
                        subject: String(question || ""),
                        evidence: sourceEvidence,
                        hypotheses:
                            Array.isArray(options.hypotheses)
                                ? options.hypotheses
                                : [],
                        discriminatingEvidence:
                            Array.isArray(options.discriminatingEvidence)
                                ? options.discriminatingEvidence
                                : [],
                        counterparties:
                            options.counterparties || {}
                    },
                    {
                        subject: String(question || ""),
                        hypotheses:
                            Array.isArray(options.hypotheses)
                                ? options.hypotheses
                                : [],
                        discriminatingEvidence:
                            Array.isArray(options.discriminatingEvidence)
                                ? options.discriminatingEvidence
                                : [],
                        counterparties:
                            options.counterparties || {}
                    }
                );

                if (prepared?.success !== true) {
                    return {
                        ...unavailable,
                        error:
                            prepared?.error ||
                            "Executive Evidence Integrity did not produce an epistemic package."
                    };
                }

                return {
                    schema: EPISTEMIC_CONTINUITY_SCHEMA,
                    available: true,
                    preserved: true,
                    subject: String(question || ""),
                    sourceEvidenceCount: sourceEvidence.length,
                    governedEvidenceCount:
                        Array.isArray(prepared.allEvidence)
                            ? prepared.allEvidence.length
                            : 0,
                    integrityVersion:
                        prepared.engine?.version || null,
                    integrityBuildId:
                        prepared.engine?.buildId || null,
                    packageConfidence:
                        prepared.confidence ?? null,
                    epistemicClaims:
                        this.clone(prepared.epistemicClaims || []),
                    realityReconstruction:
                        this.clone(
                            prepared.realityReconstruction || null
                        ),
                    counterpartyIntelligence:
                        this.clone(
                            prepared.counterpartyIntelligence || null
                        ),
                    priorExperience:
                        this.clone(priorExperience),
                    experienceInfluence: {
                        present: priorExperience.length > 0,
                        count: priorExperience.length,
                        role: "challengeable-prior-experience",
                        rule: "Prior Maddy experience may change future judgment through the existing evidence path, but remains evidence with provenance, uncertainty, and falsifiers—not truth authority."
                    },
                    conflicts:
                        this.clone(prepared.conflicts || []),
                    preservationRule:
                        "Search/Recall evidence may be summarized for executive reasoning, but provenance, independence, contradiction, uncertainty, competing explanations, counterparty context, and falsifiers must remain machine-readable across the handoff.",
                    generatedAt:
                        prepared.generatedAt ||
                        new Date().toISOString()
                };
            } catch (error) {
                return {
                    ...unavailable,
                    error:
                        error?.message ||
                        "Epistemic continuity preparation failed."
                };
            }
        },

        extractRecalledEpistemicExperience(evidence = []) {
            const experiences = [];
            const seen = new Set();

            for (const item of Array.isArray(evidence) ? evidence : []) {
                const candidates = [
                    item?.epistemicContinuity,
                    item?.metadata?.epistemicContinuity,
                    item?.raw?.epistemicContinuity,
                    item?.raw?.metadata?.epistemicContinuity
                ].filter(Boolean);

                for (const continuity of candidates) {
                    if (
                        continuity?.schema !== EPISTEMIC_CONTINUITY_SCHEMA ||
                        continuity?.preserved !== true
                    ) {
                        continue;
                    }

                    const lineage =
                        item?.raw?.metadata?.learningLineage ||
                        item?.metadata?.learningLineage ||
                        item?.raw?.learningLineage ||
                        null;
                    const key = String(
                        lineage?.lessonId ||
                        item?.sourceId ||
                        item?.id ||
                        `${continuity.subject || "experience"}:${continuity.generatedAt || "unknown"}`
                    );

                    if (seen.has(key)) {
                        continue;
                    }
                    seen.add(key);

                    experiences.push({
                        experienceId: key,
                        sourceType: item?.sourceType || null,
                        sourceId: item?.sourceId || item?.id || null,
                        title: item?.title || null,
                        confidence: Number(item?.confidence) || 0,
                        authority: item?.authority || "unreviewed",
                        learnedAt:
                            lineage?.learnedAt ||
                            item?.raw?.updatedAt ||
                            item?.date ||
                            null,
                        learningLineage: this.clone(lineage),
                        epistemicContinuity: this.clone(continuity),
                        challengeable: true,
                        truthAuthority: false,
                        falsifiers: this.clone(
                            continuity?.epistemicClaims?.flatMap(
                                (claim) => claim?.falsifiers || []
                            ) || []
                        ),
                        discriminatingEvidence: this.clone(
                            continuity?.realityReconstruction?.discriminatingEvidence || []
                        )
                    });
                }
            }

            return experiences;
        },

        runRecalledExperienceFutureCognitionAcceptanceTest() {
            const recall = global.ExecutiveRecall;
            if (!recall?.recall) {
                return {
                    success: false,
                    commission: "MADDY-CROSS-MADDY-EPISTEMIC-INTEGRATION-RECALLED-EXPERIENCE-FUTURE-COGNITION",
                    error: "Executive Recall is required for the acceptance test."
                };
            }

            const originalRecall = recall.recall;
            const originalPersistence = this.configuration.automaticPersistence;
            const now = new Date().toISOString();
            const continuity = {
                schema: EPISTEMIC_CONTINUITY_SCHEMA,
                available: true,
                preserved: true,
                subject: "Prior vendor delivery experience",
                sourceEvidenceCount: 3,
                governedEvidenceCount: 3,
                packageConfidence: 0.81,
                epistemicClaims: [{
                    claim: "The vendor delivered late after promising the target date.",
                    falsifiers: ["A source-of-record delivery receipt proving on-time delivery"]
                }],
                realityReconstruction: {
                    status: "unresolved-competing-explanations",
                    leadingHypothesis: null,
                    discriminatingEvidence: ["Carrier source-of-record scan history"]
                },
                counterpartyIntelligence: {
                    counterparties: [{ actorId: "vendor-fixture", contextualReliability: "mixed" }]
                },
                conflicts: [],
                generatedAt: now
            };
            const fresh = {
                id: "fresh-claim",
                sourceType: "search",
                sourceId: "fresh-claim",
                title: "Fresh unreviewed vendor claim",
                summary: "Vendor says the new delivery will be on time.",
                content: "Vendor says the new delivery will be on time.",
                confidence: 0.4,
                authority: "unreviewed",
                date: null,
                citation: null
            };
            const learned = {
                id: "learned-experience",
                sourceType: "knowledge",
                sourceId: "learned-experience",
                title: "Prior observed delivery outcome",
                summary: "Prior delivery was late after an on-time promise.",
                content: "Prior delivery was late after an on-time promise.",
                confidence: 1,
                authority: "official",
                date: now,
                citation: { sourceType: "knowledge", sourceId: "learned-experience", title: "Prior observed delivery outcome" },
                raw: {
                    id: "learned-experience",
                    updatedAt: now,
                    metadata: {
                        epistemicContinuity: continuity,
                        learningLineage: {
                            lessonId: "lesson-vendor-delivery",
                            learnedAt: now,
                            origin: "executive-learning"
                        }
                    }
                }
            };

            const makeRecall = (items) => ({
                success: true,
                subject: "Should we rely on the vendor's new delivery promise?",
                confidence: items.length > 1 ? 0.8 : 0.4,
                evidence: items,
                citations: items.map((item) => item.citation).filter(Boolean),
                decisions: [], openLoops: [], dependencies: [], conflicts: []
            });

            try {
                this.configuration.automaticPersistence = false;
                recall.recall = () => makeRecall([fresh]);
                const withoutExperience = this.analyze("Should we rely on the vendor's new delivery promise?");

                recall.recall = () => makeRecall([fresh, learned]);
                const withExperience = this.analyze("Should we rely on the vendor's new delivery promise?");
                const envelope = withExperience?.evidenceAssessment?.epistemicContinuity;
                const prior = envelope?.priorExperience?.[0];

                const checks = [
                    ["Future cognition recognizes recalled learned knowledge as prior Maddy experience", envelope?.experienceInfluence?.present === true && envelope?.priorExperience?.length === 1],
                    ["Prior experience retains its original epistemic continuity instead of becoming a naked fact", prior?.epistemicContinuity?.schema === EPISTEMIC_CONTINUITY_SCHEMA && prior?.epistemicContinuity?.preserved === true],
                    ["Unresolved competing explanations survive re-entry into future cognition", prior?.epistemicContinuity?.realityReconstruction?.leadingHypothesis === null],
                    ["Falsifying and discriminating evidence remain available to challenge Maddy's own memory", prior?.falsifiers?.length === 1 && prior?.discriminatingEvidence?.length === 1],
                    ["Counterparty context survives the complete consequence-memory-cognition loop", prior?.epistemicContinuity?.counterpartyIntelligence?.counterparties?.[0]?.actorId === "vendor-fixture"],
                    ["Prior experience changes future evidence-grounded judgment through existing reasoning rather than a hidden override", withoutExperience?.recommendation?.state === RECOMMENDATION_STATES.HOLD && withExperience?.recommendation?.state !== withoutExperience?.recommendation?.state && withExperience?.evidenceAssessment?.score > withoutExperience?.evidenceAssessment?.score],
                    ["Maddy's prior experience remains challengeable rather than becoming truth authority", prior?.challengeable === true && prior?.truthAuthority === false && envelope?.experienceInfluence?.role === "challengeable-prior-experience"],
                    ["Experience changes judgment without granting execution or approval authority", withExperience?.recommendation?.executiveApprovalRequired === true && !envelope?.authorityGranted && !prior?.authorityGranted]
                ].map(([name, passed]) => ({ name, passed: passed === true }));

                const passed = checks.filter((check) => check.passed).length;
                console.table(checks);
                console.info(`[MEOS ${this.version}] Recalled Experience → Future Cognition: ${passed === checks.length ? "PASS" : "FAIL"} (${passed}/${checks.length}).`);
                return {
                    success: passed === checks.length,
                    commission: "MADDY-CROSS-MADDY-EPISTEMIC-INTEGRATION-RECALLED-EXPERIENCE-FUTURE-COGNITION",
                    schema: "meos.institutional-reasoning.recalled-experience-future-cognition-acceptance.v1",
                    version: this.version,
                    buildId: this.buildId,
                    passed,
                    total: checks.length,
                    checks,
                    before: { recommendation: withoutExperience?.recommendation?.state, evidenceScore: withoutExperience?.evidenceAssessment?.score },
                    after: { recommendation: withExperience?.recommendation?.state, evidenceScore: withExperience?.evidenceAssessment?.score },
                    priorExperience: this.clone(prior || null),
                    completedAt: new Date().toISOString()
                };
            } finally {
                recall.recall = originalRecall;
                this.configuration.automaticPersistence = originalPersistence;
            }
        },

        runCrossMaddyEpistemicIntegrationAcceptanceTest() {
            const recall = global.ExecutiveRecall;
            const planning = global.ExecutivePlanning;
            const decision = global.ExecutiveDecision;

            if (!recall?.recall) {
                return {
                    success: false,
                    commission:
                        "MADDY-CROSS-MADDY-EPISTEMIC-INTEGRATION-REASONING-BRIDGE",
                    version: this.version,
                    buildId: this.buildId,
                    error:
                        "Executive Recall is required for this acceptance test."
                };
            }

            const originalRecall = recall.recall;
            const savedPlans = Array.isArray(planning?.plans)
                ? this.clone(planning.plans)
                : null;
            const savedDecisions = Array.isArray(decision?.decisions)
                ? this.clone(decision.decisions)
                : null;
            const planningPersistence =
                planning?.configuration?.automaticPersistence;
            const decisionPersistence =
                decision?.configuration?.automaticPersistence;

            const evidence = [
                {
                    id: "fixture-bear-original",
                    title: "Bear family account",
                    content:
                        "The family reports that a visitor entered the house while they were away.",
                    sourceType: "witness-account",
                    sourceId: "bear-family",
                    authority: "reported",
                    confidence: 0.82,
                    actor: {
                        id: "bear-family",
                        name: "Bear family",
                        type: "human"
                    },
                    propositionId: "entry-event",
                    stance: "supports",
                    hypothesisIds: ["intentional-entry"],
                    sourceLineage: [
                        {
                            sourceId: "bear-family-original",
                            relation: "original"
                        }
                    ],
                    citation: {
                        sourceType: "witness-account",
                        sourceId: "bear-family",
                        title: "Bear family account"
                    }
                },
                {
                    id: "fixture-bear-repeat",
                    title: "Newspaper retelling",
                    content:
                        "A newspaper repeats the bear family's account.",
                    sourceType: "news-report",
                    sourceId: "newspaper-repeat",
                    authority: "reported",
                    confidence: 0.78,
                    actor: {
                        id: "newspaper",
                        name: "Newspaper",
                        type: "human"
                    },
                    propositionId: "entry-event",
                    stance: "supports",
                    hypothesisIds: ["intentional-entry"],
                    sourceLineage: [
                        {
                            sourceId: "bear-family-original",
                            relation: "repeats"
                        }
                    ],
                    citation: {
                        sourceType: "news-report",
                        sourceId: "newspaper-repeat",
                        title: "Newspaper retelling"
                    }
                },
                {
                    id: "fixture-goldilocks",
                    title: "Goldilocks account",
                    content:
                        "Goldilocks says she believed the house was abandoned and entered seeking help.",
                    sourceType: "witness-account",
                    sourceId: "goldilocks",
                    authority: "reported",
                    confidence: 0.74,
                    actor: {
                        id: "goldilocks",
                        name: "Goldilocks",
                        type: "human"
                    },
                    propositionId: "entry-event",
                    stance: "supports",
                    hypothesisIds: ["seeking-help"],
                    sourceLineage: [
                        {
                            sourceId: "goldilocks-original",
                            relation: "original"
                        }
                    ],
                    citation: {
                        sourceType: "witness-account",
                        sourceId: "goldilocks",
                        title: "Goldilocks account"
                    }
                }
            ];

            recall.recall = () => ({
                success: true,
                subject: "Three Bears fixture",
                confidence: 0.77,
                evidence: this.clone(evidence),
                citations: evidence.map((item) =>
                    this.clone(item.citation)
                ),
                decisions: [],
                openLoops: [],
                dependencies: [],
                conflicts: []
            });

            if (planning?.configuration) {
                planning.configuration.automaticPersistence = false;
            }
            if (decision?.configuration) {
                decision.configuration.automaticPersistence = false;
            }

            try {
                const hypotheses = [
                    {
                        id: "intentional-entry",
                        title: "Intentional entry",
                        description:
                            "The visitor knowingly entered an occupied private home."
                    },
                    {
                        id: "seeking-help",
                        title: "Seeking help",
                        description:
                            "The visitor reasonably believed the home was abandoned and entered seeking help."
                    }
                ];

                const reasoning = this.analyze(
                    "What most likely happened in the Three Bears fixture?",
                    {
                        hypotheses,
                        discriminatingEvidence: [
                            "Evidence showing whether Goldilocks knew the house was occupied before entry."
                        ],
                        includeImplementation: false
                    }
                );

                const continuity =
                    reasoning?.evidenceAssessment
                        ?.epistemicContinuity;

                const planResult = planning?.createPlan
                    ? planning.createPlan(
                        {
                            objective:
                                "Investigate the Three Bears fixture",
                            reasoningMode: "strategic"
                        },
                        {
                            skipReasoning: false,
                            actor: "Maddy acceptance fixture"
                        }
                    )
                    : null;

                const decisionResult = decision?.createDecision
                    ? decision.createDecision(
                        {
                            question:
                                "Which Three Bears explanation is best supported?",
                            options: [
                                {
                                    id: "intentional-entry",
                                    title: "Intentional entry"
                                },
                                {
                                    id: "seeking-help",
                                    title: "Seeking help"
                                }
                            ],
                            reasoningMode: "decision"
                        },
                        {
                            actor: "Maddy acceptance fixture"
                        }
                    )
                    : null;

                const planContinuity =
                    planResult?.plan?.reasoningContext
                        ?.evidenceAssessment
                        ?.epistemicContinuity;
                const decisionContinuity =
                    decisionResult?.decision
                        ?.evidenceAssessment
                        ?.epistemicContinuity;

                const reconstruction =
                    continuity?.realityReconstruction;

                const checks = [
                    {
                        name: "Institutional Reasoning preserves a machine-readable epistemic continuity envelope",
                        passed:
                            continuity?.schema ===
                                EPISTEMIC_CONTINUITY_SCHEMA &&
                            continuity?.preserved === true
                    },
                    {
                        name: "The continuity envelope comes from the commissioned Executive Evidence Integrity organ",
                        passed:
                            continuity?.integrityVersion ===
                                global.ExecutiveEvidenceIntegrity
                                    ?.getStatus?.().version &&
                            Boolean(continuity?.integrityBuildId)
                    },
                    {
                        name: "Repeated tellings sharing one origin remain collapsed rather than becoming false corroboration",
                        passed:
                            reconstruction
                                ?.independentEvidenceChains === 2 &&
                            reconstruction
                                ?.collapsedDependentSources === 1
                    },
                    {
                        name: "Competing explanations and uncertainty survive the reasoning boundary",
                        passed:
                            Array.isArray(
                                reconstruction?.hypotheses
                            ) &&
                            reconstruction.hypotheses.length === 2 &&
                            reconstruction.leadingHypothesis === null &&
                            reconstruction.uncertaintyPreserved === true
                    },
                    {
                        name: "Discriminating evidence capable of changing the conclusion remains machine-readable",
                        passed:
                            Array.isArray(
                                reconstruction
                                    ?.discriminatingEvidence
                            ) &&
                            reconstruction.discriminatingEvidence
                                .join(" ")
                                .includes("knew the house was occupied")
                    },
                    {
                        name: "Executive Planning retains the epistemic continuity envelope through its existing reasoningContext seam",
                        passed:
                            planContinuity?.schema ===
                                EPISTEMIC_CONTINUITY_SCHEMA &&
                            planContinuity?.preserved === true
                    },
                    {
                        name: "Executive Decision retains the epistemic continuity envelope through its existing evidenceAssessment seam",
                        passed:
                            decisionContinuity?.schema ===
                                EPISTEMIC_CONTINUITY_SCHEMA &&
                            decisionContinuity?.preserved === true
                    },
                    {
                        name: "The bridge preserves epistemic structure without granting execution or truth authority",
                        passed:
                            continuity?.preservationRule
                                ?.includes("must remain machine-readable") ===
                                true &&
                            reasoning?.approvalRequired === true
                    }
                ];

                const passed = checks.filter(
                    (check) => check.passed
                ).length;

                return {
                    success: passed === checks.length,
                    commission:
                        "MADDY-CROSS-MADDY-EPISTEMIC-INTEGRATION-REASONING-BRIDGE",
                    schema:
                        "meos.institutional-reasoning.cross-maddy-epistemic-integration-acceptance.v1",
                    version: this.version,
                    buildId: this.buildId,
                    passed,
                    total: checks.length,
                    checks,
                    epistemicContinuity:
                        this.clone(continuity),
                    planningContinuity:
                        this.clone(planContinuity),
                    decisionContinuity:
                        this.clone(decisionContinuity),
                    completedAt: new Date().toISOString()
                };
            } finally {
                recall.recall = originalRecall;
                if (planning && savedPlans) {
                    planning.plans = savedPlans;
                }
                if (decision && savedDecisions) {
                    decision.decisions = savedDecisions;
                }
                if (planning?.configuration) {
                    planning.configuration.automaticPersistence =
                        planningPersistence;
                }
                if (decision?.configuration) {
                    decision.configuration.automaticPersistence =
                        decisionPersistence;
                }
            }
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
                lastRunAt: null,
                continuityRole: "reasoning-lens",
                durability: this.configuration.persistenceEnabled
                    ? "explicit-browser-cache-only"
                    : "session-only-until-governed-durable-scope"
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
                evidenceLineageFingerprint:
                    response.reasoningContinuity?.evidenceLineageFingerprint || null,
                epistemicLineageFingerprint:
                    response.reasoningContinuity?.epistemicLineageFingerprint || null,
                reasoningBasisFingerprint:
                    response.reasoningContinuity?.reasoningBasisFingerprint || null,
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

        /*
         * Commission 006.032D — Growth Strategy & Sales Psychology
         *
         * Institutional Reasoning is the existing strategy/cognition seam. This
         * bridge reads Executive Learning's commissioned commercial truth snapshot
         * and turns market/product evidence into an explainable commercial
         * hypothesis. It creates no second truth store and grants no execution,
         * spend, publication, outreach, or policy authority.
         */
        analyzeCommercialStrategy(input = {}, options = {}) {
            const organizationId = String(
                input.organizationId || options.organizationId || ""
            ).trim();
            if (!organizationId) {
                return { success: false, error: "organizationId is required." };
            }

            const learning = global.ExecutiveLearning;
            const snapshot = learning?.getCommercialSnapshot?.(organizationId) || {
                schema: "meos.maddy.commercial-truth-snapshot.v1",
                organizationId,
                records: [],
                economics: {}
            };
            const records = Array.isArray(snapshot.records) ? snapshot.records : [];
            const evidence = Array.isArray(input.evidence) ? input.evidence : [];
            const text = value => String(value ?? "").trim();
            const list = value => (Array.isArray(value) ? value : value ? [value] : [])
                .map(item => typeof item === "string" ? item.trim() : item)
                .filter(Boolean);
            const evidenceIds = Array.from(new Set([
                ...list(input.sourceIds),
                ...evidence.map(item => item?.id || item?.sourceId).filter(Boolean),
                ...records.flatMap(record => list(record?.epistemic?.sourceIds || record?.sourceIds))
            ]));
            const explicit = (value, unknownReason) => text(value)
                ? { status: "supported-input", value: text(value), sourceIds: evidenceIds }
                : { status: "unknown", value: null, sourceIds: [], unknownReason };
            const recordOfType = type => records.find(record => record?.recordType === type) || null;
            const campaign = recordOfType("campaign");
            const audienceRecord = recordOfType("audience");
            const offerRecord = recordOfType("offer");
            const hypothesisRecord = recordOfType("hypothesis");

            const market = explicit(input.market || input.marketContext,
                "Market evidence has not been supplied yet.");
            const product = explicit(input.product || input.productContext,
                "Product/service evidence has not been supplied yet.");
            const buyer = explicit(input.buyer || input.audience || audienceRecord?.title || audienceRecord?.name,
                "Buyer/audience evidence has not been supplied yet.");
            const pain = explicit(input.pain || input.problem,
                "High-value buyer pain has not been evidenced yet.");
            const desiredOutcome = explicit(input.desiredOutcome || input.outcome,
                "The buyer's desired outcome has not been evidenced yet.");
            const positioning = explicit(input.positioning || campaign?.positioning,
                "Positioning remains a hypothesis until supported by market evidence.");
            const offer = explicit(input.offer || offerRecord?.title || offerRecord?.name,
                "No evidence-backed offer has been supplied yet.");
            const objections = list(input.objections).map(value => ({
                objection: typeof value === "string" ? value : value?.objection,
                status: "hypothesis",
                sourceIds: typeof value === "object" ? list(value.sourceIds) : evidenceIds
            })).filter(item => item.objection);
            const proof = list(input.proof || input.trustProof).map(value => ({
                proof: typeof value === "string" ? value : value?.proof,
                status: typeof value === "object" && value.status ? value.status : "claimed-input",
                sourceIds: typeof value === "object" ? list(value.sourceIds) : evidenceIds
            })).filter(item => item.proof);
            const psychology = list(input.psychologyHypotheses || input.salesPsychology).map(value => ({
                hypothesis: typeof value === "string" ? value : value?.hypothesis,
                status: "hypothesis",
                sourceIds: typeof value === "object" ? list(value.sourceIds) : evidenceIds,
                ethicalBoundary: "No deception, coercion, fabricated scarcity, or exploitation of vulnerability."
            })).filter(item => item.hypothesis);
            const channels = list(input.channels).map(value => {
                const channel = typeof value === "string" ? { name: value } : value;
                return {
                    name: text(channel?.name || channel?.channel),
                    classification: text(channel?.classification || "unknown"),
                    costStatus: text(channel?.costStatus || "unknown"),
                    fit: text(channel?.fit || "hypothesis"),
                    sourceIds: list(channel?.sourceIds)
                };
            }).filter(item => item.name);
            const freeFirst = channels.filter(item =>
                ["organic", "free", "owned", "earned", "low-cost"].includes(item.classification) ||
                ["free", "low-cost"].includes(item.costStatus)
            );
            const paid = channels.filter(item => item.classification === "paid" || item.costStatus === "paid");
            const economics = snapshot.economics || {};
            const economicConstraints = {
                cashConstraint: explicit(input.cashConstraint || input.authorizedBudget,
                    "No commercial cash constraint or authorized budget was supplied."),
                knownEconomics: this.clone(economics),
                rule: "Unknown economics remain unknown; budget existence does not authorize spend."
            };
            const hypothesisText = text(
                input.campaignHypothesis || hypothesisRecord?.hypothesis || hypothesisRecord?.title
            );
            const campaignHypothesis = hypothesisText ? {
                status: "hypothesis",
                statement: hypothesisText,
                sourceIds: evidenceIds,
                falsifiers: list(input.falsifiers),
                successCriteria: list(input.successCriteria),
                prediction: input.prediction ? this.clone(input.prediction) : null
            } : {
                status: "unknown",
                statement: null,
                sourceIds: [],
                falsifiers: [],
                successCriteria: [],
                prediction: null,
                unknownReason: "A falsifiable campaign hypothesis has not been formed yet."
            };
            const unknowns = [market, product, buyer, pain, desiredOutcome, positioning, offer]
                .filter(item => item.status === "unknown")
                .map(item => item.unknownReason);
            if (channels.length === 0) unknowns.push("Channel fit has not been evidenced yet.");
            if (proof.length === 0) unknowns.push("Trust/proof evidence has not been supplied yet.");
            if (campaignHypothesis.status === "unknown") unknowns.push(campaignHypothesis.unknownReason);

            const lowerCostValidationAvailable = freeFirst.length > 0;
            const paidGrowthGate = {
                lowerCostValidationAvailable,
                paidAmplificationEligible: paid.length > 0 && input.evidenceBackedForPaid === true,
                spendAuthorized: false,
                rule: "Do not spend merely to discover whether an idea works when a reasonable lower-cost validation path exists."
            };
            const readinessChecks = {
                marketKnown: market.status !== "unknown",
                productKnown: product.status !== "unknown",
                buyerKnown: buyer.status !== "unknown",
                painKnown: pain.status !== "unknown",
                offerKnown: offer.status !== "unknown",
                channelFitKnown: channels.some(item => item.fit !== "unknown"),
                hypothesisFalsifiable: campaignHypothesis.status === "hypothesis" &&
                    (campaignHypothesis.falsifiers.length > 0 || campaignHypothesis.successCriteria.length > 0),
                proofPresent: proof.length > 0
            };
            const readyToPropose = Object.values(readinessChecks).every(Boolean);

            return {
                success: true,
                schema: "meos.institutional-reasoning.commercial-strategy.v1",
                commission: "006.032D",
                version: this.version,
                buildId: this.buildId,
                organizationId,
                commercialTruthSchema: snapshot.schema || null,
                evidence: { sourceIds: evidenceIds, recordCount: records.length },
                understanding: { market, product, buyer, pain, desiredOutcome },
                strategy: { positioning, offer, objections, proof, psychology, channels },
                economics: economicConstraints,
                capitalEfficiency: {
                    freeFirstChannels: this.clone(freeFirst),
                    paidChannels: this.clone(paid),
                    preferredValidationPath: lowerCostValidationAvailable ? "free-or-low-cost-first" : "insufficient-evidence",
                    paidGrowthGate
                },
                campaignHypothesis,
                readiness: { readyToPropose, checks: readinessChecks, unknowns: Array.from(new Set(unknowns)) },
                authority: {
                    executionAuthorized: false,
                    spendAuthorized: false,
                    publicationAuthorized: false,
                    outreachAuthorized: false,
                    policyAuthorityChanged: false,
                    rule: "Commercial strategy is decision support. Human authorization remains required for external action."
                },
                privacy: {
                    organizationId,
                    scope: "organization-isolated",
                    transferableRule: "Only generalized evidence-grounded commercial learning may transfer; organization-private facts remain isolated."
                },
                nextRecommendation: readyToPropose
                    ? "Prepare the evidence-backed campaign proposal for governed creative production and human review."
                    : "Resolve the listed commercial unknowns with the lowest-cost discriminating evidence before campaign production or paid amplification.",
                generatedAt: new Date().toISOString()
            };
        },

        runGrowthStrategySalesPsychologyAcceptanceTest() {
            const originalLearning = global.ExecutiveLearning;
            global.ExecutiveLearning = {
                getCommercialSnapshot: organizationId => ({
                    schema: "meos.maddy.commercial-truth-snapshot.v1",
                    organizationId,
                    records: [{
                        id: "audience-1", recordType: "audience", title: "Small nonprofit executive directors",
                        epistemic: { sourceIds: ["source-audience-1"] }
                    }],
                    economics: { cac: [{ status: "unknown", value: null }] }
                })
            };
            let result;
            try {
                result = this.analyzeCommercialStrategy({
                    organizationId: "acceptance-org-a",
                    market: "Small organizations lacking dedicated executive intelligence capacity",
                    product: "Maddy governed opportunity intelligence",
                    pain: "Important opportunities are missed because research and follow-through are fragmented",
                    desiredOutcome: "Find and act on qualified opportunities with evidence and continuity",
                    positioning: "Organization-aware opportunity operator candidate",
                    offer: "Evidence-grounded opportunity intelligence pilot",
                    objections: [{ objection: "Can we trust the output?", sourceIds: ["source-objection-1"] }],
                    proof: [{ proof: "Durable research loop live-proven", status: "measured", sourceIds: ["source-proof-1"] }],
                    psychologyHypotheses: ["Reducing uncertainty may increase willingness to engage"],
                    channels: [
                        { name: "Owned website", classification: "owned", costStatus: "free", fit: "supported-input" },
                        { name: "Paid social", classification: "paid", costStatus: "paid", fit: "hypothesis" }
                    ],
                    cashConstraint: "$100 validation ceiling",
                    campaignHypothesis: "If evidence-bound opportunity intelligence is demonstrated, qualified small-organization leaders will request a pilot.",
                    falsifiers: ["No qualified pilot requests after the defined validation sample"],
                    successCriteria: ["At least one qualified pilot request"],
                    prediction: { metric: "qualified-pilot-request", expected: 1 },
                    evidenceBackedForPaid: false,
                    sourceIds: ["source-market-1"]
                });
            } finally {
                global.ExecutiveLearning = originalLearning;
            }
            const unknownResult = this.analyzeCommercialStrategy({ organizationId: "acceptance-org-unknown" });
            const checks = [
                ["Commercial strategy schema is explicit and versioned", result.schema === "meos.institutional-reasoning.commercial-strategy.v1"],
                ["Strategy is organization-bound", result.organizationId === "acceptance-org-a"],
                ["Existing Executive Learning commercial truth is consumed", result.commercialTruthSchema === "meos.maddy.commercial-truth-snapshot.v1"],
                ["Market understanding remains evidence-addressable", result.understanding.market.sourceIds.includes("source-market-1")],
                ["Buyer model can come from commercial audience truth", result.understanding.buyer.value === "Small nonprofit executive directors"],
                ["High-value pain is explicit", result.understanding.pain.status === "supported-input"],
                ["Positioning remains explicit rather than silently becoming fact", result.strategy.positioning.status === "supported-input"],
                ["Offer is explicit", result.strategy.offer.value === "Evidence-grounded opportunity intelligence pilot"],
                ["Objections preserve evidence lineage", result.strategy.objections[0].sourceIds.includes("source-objection-1")],
                ["Trust/proof preserves its supplied evidentiary status", result.strategy.proof[0].status === "measured"],
                ["Sales psychology is labeled hypothesis with ethical boundary", result.strategy.psychology[0].status === "hypothesis" && /No deception/.test(result.strategy.psychology[0].ethicalBoundary)],
                ["Channel fit is represented without fabricated certainty", result.strategy.channels.some(item => item.fit === "hypothesis")],
                ["Free/low-cost validation is preferred when available", result.capitalEfficiency.preferredValidationPath === "free-or-low-cost-first"],
                ["Paid Growth Gate blocks evidence-free amplification", result.capitalEfficiency.paidGrowthGate.paidAmplificationEligible === false],
                ["Commercial strategy never grants spend authority", result.authority.spendAuthorized === false],
                ["Commercial strategy never grants execution/publication/outreach authority", result.authority.executionAuthorized === false && result.authority.publicationAuthorized === false && result.authority.outreachAuthorized === false],
                ["Campaign hypothesis is falsifiable", result.campaignHypothesis.falsifiers.length > 0 && result.campaignHypothesis.successCriteria.length > 0],
                ["Unknown commercial inputs remain unknown rather than fabricated", unknownResult.understanding.market.status === "unknown" && unknownResult.readiness.unknowns.length > 0],
                ["Organization-private strategy remains isolated", result.privacy.scope === "organization-isolated"],
                ["Ready strategy advances to governed proposal, not autonomous execution", result.readiness.readyToPropose === true && /human review/.test(result.nextRecommendation)]
            ].map(([name, passed]) => ({ name, passed: Boolean(passed) }));
            const passed = checks.filter(check => check.passed).length;
            const acceptance = {
                success: passed === checks.length,
                commission: "006.032D",
                schema: "meos.institutional-reasoning.growth-strategy-sales-psychology-acceptance.v1",
                version: this.version,
                buildId: this.buildId,
                checks,
                passed,
                total: checks.length,
                sample: this.clone(result),
                completedAt: new Date().toISOString()
            };
            console.table(checks);
            console.info(`[MEOS ${this.version}] Commission 006.032D Growth Strategy & Sales Psychology: ${acceptance.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`);
            return acceptance;
        },

        canonicalizeFingerprintValue(value) {
            if (Array.isArray(value)) {
                return value.map((item) =>
                    this.canonicalizeFingerprintValue(item)
                );
            }

            if (
                value &&
                typeof value === "object"
            ) {
                return Object.keys(value)
                    .sort()
                    .reduce((result, key) => {
                        const candidate = value[key];
                        if (
                            candidate !== undefined &&
                            typeof candidate !== "function"
                        ) {
                            result[key] =
                                this.canonicalizeFingerprintValue(candidate);
                        }
                        return result;
                    }, {});
            }

            return value ?? null;
        },

        fingerprintValue(value, itemCount = null) {
            const canonical = JSON.stringify(
                this.canonicalizeFingerprintValue(value)
            );

            let hash = 2166136261;
            for (let index = 0; index < canonical.length; index += 1) {
                hash ^= canonical.charCodeAt(index);
                hash = Math.imul(hash, 16777619);
            }

            const suffix = Number.isFinite(itemCount)
                ? `:${itemCount}`
                : "";

            return `fnv1a32:${(hash >>> 0)
                .toString(16)
                .padStart(8, "0")}${suffix}`;
        },

        buildEvidenceLineageFingerprint(evidence = []) {
            const lineage = (Array.isArray(evidence) ? evidence : [])
                .map((item) => ({
                    id:
                        item?.id ||
                        item?.recordId ||
                        item?.sourceId ||
                        null,
                    sourceType:
                        item?.sourceType ||
                        item?.source ||
                        null,
                    title: item?.title || null,
                    summary: item?.summary || null,
                    content: item?.content || null,
                    date:
                        item?.date ||
                        item?.updatedAt ||
                        item?.createdAt ||
                        null,
                    authority: item?.authority || null,
                    confidence:
                        Number(item?.confidence || 0),
                    citation: item?.citation || null,
                    organizationId:
                        item?.organizationId ||
                        item?.raw?.organizationId ||
                        null,
                    knowledgeClass:
                        item?.knowledgeClass ||
                        item?.raw?.knowledgeClass ||
                        null
                }))
                .sort((a, b) =>
                    JSON.stringify(a).localeCompare(JSON.stringify(b))
                );

            return this.fingerprintValue(
                lineage,
                lineage.length
            );
        },

        buildEpistemicLineageFingerprint(epistemicContinuity = {}) {
            return this.fingerprintValue({
                schema: epistemicContinuity?.schema || null,
                preserved:
                    epistemicContinuity?.preserved === true,
                subject:
                    epistemicContinuity?.subject || null,
                epistemicClaims:
                    epistemicContinuity?.epistemicClaims || [],
                realityReconstruction:
                    epistemicContinuity?.realityReconstruction || null,
                counterpartyIntelligence:
                    epistemicContinuity?.counterpartyIntelligence || null,
                recalledExperience:
                    epistemicContinuity?.recalledExperience || null,
                limitations:
                    epistemicContinuity?.limitations || [],
                falsifiers:
                    epistemicContinuity?.falsifiers || []
            });
        },

        buildReasoningContinuity(context = {}) {
            const evidence = Array.isArray(context.evidence)
                ? context.evidence
                : [];
            const evidenceLineageFingerprint =
                this.buildEvidenceLineageFingerprint(evidence);
            const epistemicLineageFingerprint =
                this.buildEpistemicLineageFingerprint(
                    context.epistemicContinuity || {}
                );
            const reasoningBasisFingerprint =
                this.fingerprintValue({
                    question:
                        this.normalizeText(context.question),
                    mode:
                        this.normalizeMode(context.mode),
                    evidenceLineageFingerprint,
                    epistemicLineageFingerprint
                });

            this.persistenceState.reconstructionCount += 1;
            this.persistenceState.lastReconstructionAt =
                new Date().toISOString();
            this.persistenceState.lastEvidenceLineageFingerprint =
                evidenceLineageFingerprint;
            this.persistenceState.lastEpistemicLineageFingerprint =
                epistemicLineageFingerprint;
            this.persistenceState.lastReasoningBasisFingerprint =
                reasoningBasisFingerprint;

            return {
                schema:
                    "meos.institutional-reasoning.continuity.v1",
                reasoningModel:
                    this.persistenceState.reasoningModel,
                authority:
                    this.persistenceState.authority,
                browserAuthority: false,
                automaticBrowserHydration: false,
                reconstructedFromCurrentEvidence: true,
                sourceRecallSucceeded:
                    context.recall?.success === true,
                evidenceCount: evidence.length,
                evidenceLineageFingerprint,
                epistemicLineageFingerprint,
                reasoningBasisFingerprint,
                localWorkspaceRole:
                    this.persistenceState.browserRole,
                localWorkspaceDurable: false,
                savedAnalysisLensesDurable:
                    this.configuration.persistenceEnabled === true,
                sessionStateDurability:
                    this.persistenceState.sessionStateDurability,
                durableSavedAnalysisScopeRequired:
                    this.persistenceState.durableSavedAnalysisScopeRequired
            };
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

        observeLegacyBrowserSnapshot() {
            this.persistenceState.legacySnapshotObserved = false;
            this.persistenceState.legacySnapshotBytes = 0;
            this.persistenceState.legacySnapshotSchema = null;
            this.persistenceState.legacySnapshotVersion = null;
            this.persistenceState.legacySnapshotImported = false;

            if (!global.localStorage) {
                return {
                    success: true,
                    observed: false,
                    browserStorageAvailable: false
                };
            }

            try {
                const stored = global.localStorage.getItem(
                    this.configuration.localStorageKey
                );

                if (!stored) {
                    return {
                        success: true,
                        observed: false,
                        browserStorageAvailable: true
                    };
                }

                this.persistenceState.legacySnapshotObserved = true;
                this.persistenceState.legacySnapshotBytes =
                    typeof Blob === "function"
                        ? new Blob([stored]).size
                        : stored.length;

                try {
                    const parsed = JSON.parse(stored);
                    this.persistenceState.legacySnapshotSchema =
                        parsed?.schema || null;
                    this.persistenceState.legacySnapshotVersion =
                        parsed?.version || null;
                } catch {}

                return {
                    success: true,
                    observed: true,
                    imported: false,
                    authorityClaimed: false,
                    bytes: this.persistenceState.legacySnapshotBytes
                };
            } catch (error) {
                return {
                    success: false,
                    observed: false,
                    error: error?.message || String(error)
                };
            }
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
                    "[MEOS Institutional Reasoning] Optional browser reasoning workspace persistence suspended after storage quota exhaustion. Evidence-grounded reconstructive reasoning remains operational from current source evidence; browser state is not reasoning authority."
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

        restore(options = {}) {
            if (options.allowBrowserCacheImport !== true) {
                return {
                    success: true,
                    restored: false,
                    blocked: true,
                    reason: "browser-cache-not-authority",
                    authority: this.persistenceState.authority,
                    browserRole: this.persistenceState.browserRole
                };
            }

            if (!global.localStorage) {
                return {
                    success: false,
                    restored: false,
                    error: "Browser local storage is unavailable."
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
                const result = this.importReasoning(
                    JSON.parse(stored),
                    {
                        replace: true,
                        skipPersistence: true
                    }
                );

                if (result.success) {
                    this.persistenceState.lastRestoreAt =
                        new Date().toISOString();
                    this.persistenceState.legacySnapshotImported = true;
                }

                return {
                    ...result,
                    restored: result.success,
                    explicitLegacyImport: true,
                    authority: this.persistenceState.authority,
                    browserRole: this.persistenceState.browserRole
                };
            } catch (error) {
                console.warn(
                    "[MEOS Institutional Reasoning] Explicit browser-cache import failed:",
                    error
                );

                return {
                    success: false,
                    restored: false,
                    error: error.message
                };
            }
        },

        runBrowserIndependenceAcceptanceTest() {
            const checks = [];
            const originalConfiguration = this.clone(this.configuration);
            const originalPersistenceState = this.clone(this.persistenceState);
            const originalHistory = this.clone(this.reasoningHistory);
            const originalSavedAnalyses = this.clone(this.savedAnalyses);
            const originalAnalytics = this.clone(this.analytics);

            try {
                checks.push({
                    name: "Automatic browser persistence is disabled by default",
                    passed:
                        this.configuration.persistenceEnabled === false &&
                        this.configuration.automaticPersistence === false
                });

                checks.push({
                    name: "Current evidence sources plus durable Executive cognition remain reasoning authority",
                    passed:
                        this.persistenceState.authority ===
                            "evidence-sources-plus-durable-executive-cognition" &&
                        this.persistenceState.browserAuthority === false
                });

                checks.push({
                    name: "Institutional Reasoning uses reconstructive reasoning rather than browser snapshot authority",
                    passed:
                        this.persistenceState.reasoningModel ===
                            "reconstructive-institutional-reasoning" &&
                        this.persistenceState.sourceReconstructionEnabled === true
                });

                const blockedRestore = this.restore();
                checks.push({
                    name: "Legacy browser reasoning state is never hydrated automatically",
                    passed:
                        blockedRestore?.blocked === true &&
                        blockedRestore?.reason ===
                            "browser-cache-not-authority"
                });

                const evidenceA = [{
                    id: "acceptance-evidence-a",
                    sourceType: "official",
                    title: "Acceptance Evidence",
                    content: "Current authoritative fact A",
                    date: "2026-09-19T00:00:00.000Z",
                    authority: "official",
                    confidence: 1,
                    citation: "acceptance://evidence-a"
                }];
                const epistemicA = {
                    schema: EPISTEMIC_CONTINUITY_SCHEMA,
                    preserved: true,
                    subject: "browser-independent reasoning",
                    epistemicClaims: [{
                        id: "claim-a",
                        status: "verified",
                        confidence: 1
                    }],
                    realityReconstruction: {
                        leadingHypothesis: "A",
                        competingHypotheses: []
                    }
                };

                const beforeCount =
                    this.persistenceState.reconstructionCount;
                const continuityA1 = this.buildReasoningContinuity({
                    question: "What does the current evidence support?",
                    mode: REASONING_MODES.EXECUTIVE,
                    evidence: evidenceA,
                    epistemicContinuity: epistemicA,
                    recall: { success: true }
                });
                const continuityA2 = this.buildReasoningContinuity({
                    question: "What does the current evidence support?",
                    mode: REASONING_MODES.EXECUTIVE,
                    evidence: this.clone(evidenceA),
                    epistemicContinuity: this.clone(epistemicA),
                    recall: { success: true }
                });
                const continuityB = this.buildReasoningContinuity({
                    question: "What does the current evidence support?",
                    mode: REASONING_MODES.EXECUTIVE,
                    evidence: [{
                        ...evidenceA[0],
                        content: "Current authoritative fact B",
                        date: "2026-09-19T01:00:00.000Z"
                    }],
                    epistemicContinuity: epistemicA,
                    recall: { success: true }
                });

                checks.push({
                    name: "Reasoning reconstruction emits evidence, epistemic, and combined basis lineage telemetry",
                    passed:
                        continuityA1?.evidenceLineageFingerprint?.startsWith("fnv1a32:") &&
                        continuityA1?.epistemicLineageFingerprint?.startsWith("fnv1a32:") &&
                        continuityA1?.reasoningBasisFingerprint?.startsWith("fnv1a32:") &&
                        this.persistenceState.reconstructionCount ===
                            beforeCount + 3
                });

                checks.push({
                    name: "The same reasoning basis is deterministic while materially changed evidence changes the basis fingerprint",
                    passed:
                        continuityA1.reasoningBasisFingerprint ===
                            continuityA2.reasoningBasisFingerprint &&
                        continuityA1.reasoningBasisFingerprint !==
                            continuityB.reasoningBasisFingerprint
                });

                const persistenceResult = this.persistIfEnabled();
                checks.push({
                    name: "Normal reasoning activity cannot trigger browser writes",
                    passed:
                        persistenceResult?.persisted === false &&
                        this.configuration.automaticPersistence === false
                });

                const saved = this.saveAnalysis(
                    "acceptance lens",
                    "browser-independent reasoning",
                    { mode: REASONING_MODES.EXECUTIVE }
                );
                checks.push({
                    name: "Saved analysis lenses are honest about session durability until governed durable scope exists",
                    passed:
                        saved?.success === true &&
                        saved?.savedAnalysis?.durability ===
                            "session-only-until-governed-durable-scope"
                });

                checks.push({
                    name: "Reconstructive continuity is designed to remain machine-readable through evidenceAssessment",
                    passed:
                        continuityA1?.schema ===
                            "meos.institutional-reasoning.continuity.v1" &&
                        continuityA1?.browserAuthority === false &&
                        continuityA1?.localWorkspaceDurable === false &&
                        continuityA1?.durableSavedAnalysisScopeRequired === true
                });

                checks.push({
                    name: "Browser independence grants no approval, execution, spend, or cross-customer durability authority",
                    passed:
                        this.configuration.organizationNeutralCore === true &&
                        this.configuration.requireExecutiveApproval === true &&
                        this.operatingMode === "evidence-grounded-reasoning" &&
                        continuityA1?.browserAuthority === false &&
                        continuityA1?.savedAnalysisLensesDurable === false
                });

                const passed = checks.every((check) => check.passed);
                console.table(checks);
                console.info(
                    `[MEOS ${this.version}] Institutional Reasoning reconstructive browser-independence acceptance: ${passed ? "PASS" : "FAIL"}.`
                );

                return {
                    commission: "REBUILD-REASONING-01",
                    version: this.version,
                    buildId: this.buildId,
                    schema:
                        "meos.institutional-reasoning.browser-independence.acceptance.v1",
                    passed,
                    checks,
                    status: this.getStatus()
                };
            } finally {
                this.configuration = originalConfiguration;
                this.persistenceState = originalPersistenceState;
                this.reasoningHistory = originalHistory;
                this.savedAnalyses = originalSavedAnalyses;
                this.analytics = originalAnalytics;
            }
        },

        runPersistenceAuthorityAcceptanceTest() {
            return this.runBrowserIndependenceAcceptanceTest();
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
