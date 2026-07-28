/*
 * MEOS Institutional Reasoning Engine
 * Version: 1.0.0
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
        version: "1.0.0",
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

            this.persistIfEnabled();

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

                return {
                    success: true,
                    persisted: true
                };
            } catch (error) {
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
                        replace: true
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
