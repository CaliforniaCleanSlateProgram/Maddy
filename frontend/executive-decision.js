/*
 * MEOS Executive Decision Engine
 * Version: 1.0.0
 *
 * Mission:
 * Compare options using institutional evidence, policy, risk, cost, readiness,
 * dependencies, and executive priorities, then produce an explainable decision
 * recommendation with confidence and approval requirements.
 *
 * Brick boundary:
 * This engine recommends. It does not autonomously approve decisions, spend
 * money, contact external parties, or execute plans and workflows.
 */

(function initializeExecutiveDecision(global) {
    "use strict";

    const STORAGE_KEY = "meos.executive-decision.v1";
    const SCHEMA = "meos.executive-decision.package.v1";

    const DECISION_STATUSES = {
        DRAFT: "draft",
        AWAITING_APPROVAL: "awaiting-approval",
        APPROVED: "approved",
        REJECTED: "rejected",
        SUPERSEDED: "superseded",
        ARCHIVED: "archived"
    };

    const RECOMMENDATION_TYPES = {
        SELECT: "select",
        SELECT_WITH_CONDITIONS: "select-with-conditions",
        HOLD: "hold",
        ESCALATE: "escalate",
        INSUFFICIENT_EVIDENCE: "insufficient-evidence"
    };

    const ExecutiveDecision = {
        name: "MEOS Executive Decision Engine",
        version: "1.0.0",
        status: "initializing",
        operatingMode: "evidence-grounded-decision-support",

        configuration: {
            persistenceEnabled: true,
            automaticPersistence: true,
            localStorageKey: STORAGE_KEY,
            organizationNeutralCore: true,
            requireExecutiveApproval: true,
            requireCitations: true,
            minimumEvidenceConfidence: 0.58,
            minimumSelectionConfidence: 0.68,
            maximumDecisions: 1000,
            maximumOptionsPerDecision: 25,
            maximumHistory: 2000,
            defaultWeights: {
                strategicFit: 0.2,
                expectedBenefit: 0.2,
                costEfficiency: 0.15,
                riskControl: 0.2,
                operationalReadiness: 0.15,
                complianceFit: 0.1
            }
        },

        decisions: [],
        history: [],
        analytics: {
            totalDecisions: 0,
            approvedDecisions: 0,
            rejectedDecisions: 0,
            awaitingApproval: 0,
            insufficientEvidence: 0,
            lastDecisionAt: null
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
            this.recalculateAnalytics();

            console.info(
                `[MEOS] ${this.name} v${this.version} ${this.status}.`
            );

            this.emit("decision:online", this.getStatus());
            return this.getStatus();
        },

        createDecision(input = {}, options = {}) {
            const question = String(
                input.question ||
                input.title ||
                input.objective ||
                ""
            ).trim();

            if (!question) {
                return {
                    success: false,
                    error: "A decision question is required."
                };
            }

            if (this.decisions.length >= this.configuration.maximumDecisions) {
                return {
                    success: false,
                    error: "The decision limit has been reached."
                };
            }

            const optionInputs = Array.isArray(input.options)
                ? input.options
                : [];

            if (optionInputs.length === 0) {
                return {
                    success: false,
                    error: "At least one decision option is required."
                };
            }

            if (
                optionInputs.length >
                this.configuration.maximumOptionsPerDecision
            ) {
                return {
                    success: false,
                    error: "The decision contains too many options."
                };
            }

            const reasoning = this.runReasoning(question, {
                mode: input.reasoningMode || "decision",
                evidenceLimit: input.evidenceLimit || 50
            });

            const recall = this.runRecall(question, {
                mode: "decision",
                limit: input.evidenceLimit || 50
            });

            const timestamp = new Date().toISOString();

            const decision = {
                id: this.createId("executive-decision"),
                title: input.title || question,
                question,
                description: input.description || "",
                status: DECISION_STATUSES.DRAFT,
                requestedBy:
                    input.requestedBy ||
                    options.actor ||
                    "Executive",
                executiveOwner:
                    input.executiveOwner ||
                    "Maddy",
                createdAt: timestamp,
                updatedAt: timestamp,
                approvedAt: null,
                approvedBy: null,
                rejectedAt: null,
                rejectedBy: null,
                rejectionReason: "",
                selectedOptionId: null,
                recommendation: null,
                options: [],
                criteria: this.normalizeCriteria(input.criteria),
                constraints: this.uniqueStrings(input.constraints),
                dependencies: this.uniqueStrings(input.dependencies),
                risks: [],
                conflicts: [],
                citations: [],
                evidenceAssessment: null,
                assumptions: this.uniqueStrings(input.assumptions),
                approvalRequired:
                    this.configuration.requireExecutiveApproval,
                sourcePlanId: input.sourcePlanId || null,
                sourceWorkflowId: input.sourceWorkflowId || null,
                sourceMissionId: input.sourceMissionId || null,
                tags: this.uniqueStrings(input.tags),
                topics: this.uniqueStrings([
                    ...(input.topics || []),
                    "executive-decision"
                ]),
                metadata:
                    input.metadata &&
                    typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}
            };

            decision.options = optionInputs.map((option, index) =>
                this.normalizeOption(decision, option, index)
            );

            decision.risks = this.mergeRisks(
                reasoning?.risks || [],
                input.risks || []
            );

            decision.conflicts = [
                ...(reasoning?.conflicts || []),
                ...(recall?.conflicts || [])
            ];

            decision.citations = this.deduplicateCitations([
                ...(reasoning?.citations || []),
                ...(recall?.citations || [])
            ]);

            decision.evidenceAssessment =
                reasoning?.evidenceAssessment || {
                    score: recall?.confidence || 0,
                    label:
                        recall?.confidence >= 0.75
                            ? "strong"
                            : recall?.confidence >= 0.55
                                ? "moderate"
                                : recall?.confidence >= 0.35
                                    ? "limited"
                                    : "insufficient",
                    issues: []
                };

            const evaluation = this.evaluateOptions(
                decision,
                {
                    reasoning,
                    recall,
                    weights:
                        input.weights ||
                        this.configuration.defaultWeights
                }
            );

            decision.options = evaluation.options;
            decision.recommendation = evaluation.recommendation;
            decision.selectedOptionId =
                evaluation.recommendation.selectedOptionId;
            decision.status =
                DECISION_STATUSES.AWAITING_APPROVAL;
            decision.updatedAt =
                new Date().toISOString();

            this.decisions.push(decision);
            this.recalculateAnalytics();

            this.logHistory("decision.created", {
                decisionId: decision.id,
                question: decision.question,
                optionCount: decision.options.length,
                recommendationType:
                    decision.recommendation.type,
                selectedOptionId:
                    decision.selectedOptionId
            });

            this.persistIfEnabled();
            this.emit("decision:created", this.clone(decision));

            return {
                success: true,
                decision: this.clone(decision),
                reasoning,
                recall
            };
        },

        normalizeCriteria(criteria = []) {
            const defaults = [
                {
                    id: "strategic-fit",
                    name: "Strategic Fit",
                    key: "strategicFit",
                    weight:
                        this.configuration.defaultWeights
                            .strategicFit
                },
                {
                    id: "expected-benefit",
                    name: "Expected Benefit",
                    key: "expectedBenefit",
                    weight:
                        this.configuration.defaultWeights
                            .expectedBenefit
                },
                {
                    id: "cost-efficiency",
                    name: "Cost Efficiency",
                    key: "costEfficiency",
                    weight:
                        this.configuration.defaultWeights
                            .costEfficiency
                },
                {
                    id: "risk-control",
                    name: "Risk Control",
                    key: "riskControl",
                    weight:
                        this.configuration.defaultWeights
                            .riskControl
                },
                {
                    id: "operational-readiness",
                    name: "Operational Readiness",
                    key: "operationalReadiness",
                    weight:
                        this.configuration.defaultWeights
                            .operationalReadiness
                },
                {
                    id: "compliance-fit",
                    name: "Compliance Fit",
                    key: "complianceFit",
                    weight:
                        this.configuration.defaultWeights
                            .complianceFit
                }
            ];

            if (!Array.isArray(criteria) || criteria.length === 0) {
                return defaults;
            }

            return criteria.map((criterion, index) => ({
                id:
                    criterion.id ||
                    this.createId("decision-criterion"),
                name:
                    criterion.name ||
                    `Criterion ${index + 1}`,
                key:
                    criterion.key ||
                    this.normalizeKey(
                        criterion.name ||
                        `criterion-${index + 1}`
                    ),
                weight:
                    Number(criterion.weight) || 0
            }));
        },

        normalizeOption(decision, input = {}, index = 0) {
            return {
                id:
                    input.id ||
                    this.createId("decision-option"),
                decisionId: decision.id,
                order: index + 1,
                title:
                    input.title ||
                    input.name ||
                    `Option ${index + 1}`,
                description:
                    input.description ||
                    "",
                estimatedCost:
                    Number(input.estimatedCost) || 0,
                estimatedBenefit:
                    Number(input.estimatedBenefit) || 0,
                durationDays:
                    Math.max(
                        0,
                        Number(input.durationDays) || 0
                    ),
                office:
                    input.office ||
                    null,
                owner:
                    input.owner ||
                    null,
                scores:
                    input.scores &&
                    typeof input.scores === "object"
                        ? { ...input.scores }
                        : {},
                risks:
                    Array.isArray(input.risks)
                        ? input.risks
                        : [],
                benefits:
                    this.uniqueStrings(input.benefits),
                tradeoffs:
                    this.uniqueStrings(input.tradeoffs),
                dependencies:
                    this.uniqueStrings(input.dependencies),
                constraints:
                    this.uniqueStrings(input.constraints),
                evidence:
                    Array.isArray(input.evidence)
                        ? input.evidence
                        : [],
                citations:
                    Array.isArray(input.citations)
                        ? input.citations
                        : [],
                disqualifiers:
                    this.uniqueStrings(input.disqualifiers),
                weightedScore: 0,
                confidence: 0,
                rank: null,
                recommended: false,
                recommendationReason: "",
                metadata:
                    input.metadata &&
                    typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}
            };
        },

        evaluateOptions(decision, context = {}) {
            const weights = this.normalizeWeights(
                context.weights ||
                this.configuration.defaultWeights,
                decision.criteria
            );

            const evidenceScore =
                Number(
                    decision.evidenceAssessment?.score
                ) || 0;

            const evaluated = decision.options.map((option) => {
                const scores = this.buildOptionScores(
                    option,
                    decision,
                    context
                );

                const weightedScore =
                    decision.criteria.reduce(
                        (total, criterion) => {
                            const value =
                                Number(
                                    scores[criterion.key]
                                ) || 0;

                            const weight =
                                weights[criterion.key] || 0;

                            return (
                                total +
                                value *
                                weight
                            );
                        },
                        0
                    );

                const disqualifierPenalty =
                    Math.min(
                        0.5,
                        option.disqualifiers.length *
                        0.15
                    );

                const conflictPenalty =
                    Math.min(
                        0.3,
                        decision.conflicts.length *
                        0.03
                    );

                const finalScore = Math.max(
                    0,
                    Math.min(
                        1,
                        weightedScore -
                        disqualifierPenalty -
                        conflictPenalty
                    )
                );

                const confidence = Math.max(
                    0,
                    Math.min(
                        0.99,
                        finalScore * 0.6 +
                        evidenceScore * 0.4
                    )
                );

                return {
                    ...option,
                    scores,
                    weightedScore:
                        Number(finalScore.toFixed(4)),
                    confidence:
                        Number(confidence.toFixed(3))
                };
            });

            evaluated.sort((a, b) => {
                if (b.weightedScore !== a.weightedScore) {
                    return b.weightedScore - a.weightedScore;
                }

                return b.confidence - a.confidence;
            });

            evaluated.forEach((option, index) => {
                option.rank = index + 1;
            });

            const best = evaluated[0] || null;
            const second = evaluated[1] || null;

            const recommendation =
                this.buildRecommendation(
                    decision,
                    best,
                    second,
                    evaluated
                );

            if (best && recommendation.selectedOptionId) {
                best.recommended = true;
                best.recommendationReason =
                    recommendation.rationale;
            }

            return {
                options: evaluated,
                recommendation
            };
        },

        buildOptionScores(option, decision, context = {}) {
            const reasoning =
                context.reasoning || {};
            const readiness =
                this.estimateOperationalReadiness(
                    option,
                    decision
                );

            const strategicFit =
                this.normalizeScore(
                    option.scores.strategicFit,
                    this.inferStrategicFit(
                        option,
                        reasoning
                    )
                );

            const expectedBenefit =
                this.normalizeScore(
                    option.scores.expectedBenefit,
                    this.inferExpectedBenefit(option)
                );

            const costEfficiency =
                this.normalizeScore(
                    option.scores.costEfficiency,
                    this.inferCostEfficiency(option)
                );

            const riskControl =
                this.normalizeScore(
                    option.scores.riskControl,
                    this.inferRiskControl(option)
                );

            const operationalReadiness =
                this.normalizeScore(
                    option.scores.operationalReadiness,
                    readiness
                );

            const complianceFit =
                this.normalizeScore(
                    option.scores.complianceFit,
                    this.inferComplianceFit(
                        option,
                        decision
                    )
                );

            return {
                ...option.scores,
                strategicFit,
                expectedBenefit,
                costEfficiency,
                riskControl,
                operationalReadiness,
                complianceFit
            };
        },

        inferStrategicFit(option, reasoning) {
            let score = 0.6;

            const text = this.normalizeText(
                [
                    option.title,
                    option.description,
                    ...option.benefits,
                    reasoning?.executiveSummary?.recommendation,
                    reasoning?.recommendation?.rationale
                ].join(" ")
            );

            if (
                text.includes("strategic") ||
                text.includes("mission") ||
                text.includes("priority")
            ) {
                score += 0.15;
            }

            if (option.disqualifiers.length > 0) {
                score -= 0.2;
            }

            return score;
        },

        inferExpectedBenefit(option) {
            if (
                option.estimatedBenefit > 0 &&
                option.estimatedCost > 0
            ) {
                return Math.min(
                    1,
                    option.estimatedBenefit /
                    Math.max(
                        option.estimatedCost,
                        option.estimatedBenefit
                    )
                );
            }

            if (option.benefits.length >= 3) {
                return 0.85;
            }

            if (option.benefits.length === 2) {
                return 0.72;
            }

            if (option.benefits.length === 1) {
                return 0.6;
            }

            return 0.5;
        },

        inferCostEfficiency(option) {
            if (
                option.estimatedCost <= 0 &&
                option.estimatedBenefit > 0
            ) {
                return 0.9;
            }

            if (
                option.estimatedCost > 0 &&
                option.estimatedBenefit > 0
            ) {
                const ratio =
                    option.estimatedBenefit /
                    option.estimatedCost;

                return Math.max(
                    0.1,
                    Math.min(1, ratio / 3)
                );
            }

            return 0.55;
        },

        inferRiskControl(option) {
            const highRisks =
                option.risks.filter(
                    (risk) =>
                        risk.severity === "high" ||
                        risk.severity === "critical"
                ).length;

            const totalRisks = option.risks.length;

            if (totalRisks === 0) {
                return 0.8;
            }

            return Math.max(
                0.15,
                0.8 -
                highRisks * 0.2 -
                Math.max(0, totalRisks - highRisks) * 0.05
            );
        },

        estimateOperationalReadiness(option, decision) {
            let score = 0.55;

            if (option.owner) {
                score += 0.1;
            }

            if (option.office) {
                score += 0.1;
            }

            if (option.dependencies.length === 0) {
                score += 0.1;
            }

            if (option.durationDays > 0) {
                score += 0.05;
            }

            if (
                decision.sourcePlanId ||
                decision.sourceWorkflowId
            ) {
                score += 0.1;
            }

            return Math.min(1, score);
        },

        inferComplianceFit(option, decision) {
            let score = 0.75;

            if (
                option.disqualifiers.some((item) =>
                    this.normalizeText(item).includes(
                        "compliance"
                    )
                )
            ) {
                score -= 0.5;
            }

            if (decision.conflicts.length > 0) {
                score -= 0.15;
            }

            return Math.max(0, Math.min(1, score));
        },

        buildRecommendation(
            decision,
            best,
            second,
            options
        ) {
            const evidenceScore =
                Number(
                    decision.evidenceAssessment?.score
                ) || 0;

            if (!best) {
                return {
                    type:
                        RECOMMENDATION_TYPES
                            .INSUFFICIENT_EVIDENCE,
                    selectedOptionId: null,
                    confidence: 0,
                    rationale:
                        "No decision options were available.",
                    conditions: [],
                    approvalRequired:
                        this.configuration
                            .requireExecutiveApproval
                };
            }

            if (
                evidenceScore <
                this.configuration
                    .minimumEvidenceConfidence
            ) {
                return {
                    type:
                        RECOMMENDATION_TYPES.HOLD,
                    selectedOptionId: null,
                    confidence:
                        Number(evidenceScore.toFixed(3)),
                    rationale:
                        "The institutional evidence is not strong enough to support a final selection.",
                    conditions: [
                        "Gather or confirm authoritative evidence.",
                        "Resolve material conflicts.",
                        "Re-run the decision analysis."
                    ],
                    approvalRequired: true
                };
            }

            if (best.disqualifiers.length > 0) {
                return {
                    type:
                        RECOMMENDATION_TYPES.ESCALATE,
                    selectedOptionId: null,
                    confidence: best.confidence,
                    rationale:
                        "The highest-scoring option contains disqualifying conditions.",
                    conditions:
                        best.disqualifiers.map(
                            (item) =>
                                `Resolve disqualifier: ${item}`
                        ),
                    approvalRequired: true
                };
            }

            const margin = second
                ? best.weightedScore -
                  second.weightedScore
                : best.weightedScore;

            const materialRisks =
                best.risks.filter(
                    (risk) =>
                        risk.severity === "high" ||
                        risk.severity === "critical"
                );

            const type =
                best.confidence >=
                    this.configuration
                        .minimumSelectionConfidence &&
                materialRisks.length === 0 &&
                decision.conflicts.length === 0
                    ? RECOMMENDATION_TYPES.SELECT
                    : RECOMMENDATION_TYPES
                        .SELECT_WITH_CONDITIONS;

            const conditions = [];

            if (materialRisks.length > 0) {
                conditions.push(
                    "Mitigate high-severity option risks before implementation."
                );
            }

            if (decision.conflicts.length > 0) {
                conditions.push(
                    "Resolve material institutional conflicts before approval."
                );
            }

            if (margin < 0.08 && second) {
                conditions.push(
                    "Review the top two options because their scores are close."
                );
            }

            if (best.dependencies.length > 0) {
                conditions.push(
                    "Confirm all material dependencies."
                );
            }

            return {
                type,
                selectedOptionId: best.id,
                selectedOptionTitle: best.title,
                confidence: best.confidence,
                score: best.weightedScore,
                marginOverSecond:
                    Number(margin.toFixed(4)),
                rationale:
                    `${best.title} produced the strongest evidence-weighted result across the decision criteria.`,
                conditions,
                approvalRequired:
                    this.configuration
                        .requireExecutiveApproval,
                alternatives:
                    options
                        .slice(1, 4)
                        .map((option) => ({
                            optionId: option.id,
                            title: option.title,
                            score: option.weightedScore,
                            confidence: option.confidence
                        }))
            };
        },

        approveDecision(
            decisionId,
            options = {}
        ) {
            const decision =
                this.getDecisionById(decisionId);

            if (!decision) {
                return {
                    success: false,
                    error: "Decision was not found."
                };
            }

            if (
                decision.status !==
                DECISION_STATUSES.AWAITING_APPROVAL &&
                options.overrideStatus !== true
            ) {
                return {
                    success: false,
                    error:
                        "The decision is not awaiting approval."
                };
            }

            if (
                !decision.recommendation
                    ?.selectedOptionId &&
                options.selectedOptionId === undefined
            ) {
                return {
                    success: false,
                    error:
                        "No option is selected for approval."
                };
            }

            const selectedOptionId =
                options.selectedOptionId ||
                decision.recommendation
                    .selectedOptionId;

            const selectedOption =
                decision.options.find(
                    (option) =>
                        option.id === selectedOptionId
                );

            if (!selectedOption) {
                return {
                    success: false,
                    error:
                        "The selected option was not found."
                };
            }

            const timestamp =
                new Date().toISOString();

            decision.status =
                DECISION_STATUSES.APPROVED;
            decision.selectedOptionId =
                selectedOption.id;
            decision.approvedAt = timestamp;
            decision.approvedBy =
                options.actor ||
                "Executive";
            decision.updatedAt = timestamp;
            decision.approvalNotes =
                options.notes ||
                "";

            decision.options.forEach((option) => {
                option.recommended =
                    option.id === selectedOption.id;
            });

            this.writeDecisionToKnowledgeEngine(
                decision,
                selectedOption
            );

            if (options.createPlan === true) {
                this.createPlanFromDecision(decision, {
                    actor: decision.approvedBy
                });
            }

            this.logHistory("decision.approved", {
                decisionId,
                selectedOptionId:
                    selectedOption.id,
                approvedBy:
                    decision.approvedBy
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("decision:approved", this.clone(decision));

            return {
                success: true,
                decision: this.clone(decision),
                selectedOption:
                    this.clone(selectedOption)
            };
        },

        rejectDecision(
            decisionId,
            options = {}
        ) {
            const decision =
                this.getDecisionById(decisionId);

            if (!decision) {
                return {
                    success: false,
                    error: "Decision was not found."
                };
            }

            const timestamp =
                new Date().toISOString();

            decision.status =
                DECISION_STATUSES.REJECTED;
            decision.rejectedAt = timestamp;
            decision.rejectedBy =
                options.actor ||
                "Executive";
            decision.rejectionReason =
                options.reason ||
                "";
            decision.updatedAt = timestamp;

            this.logHistory("decision.rejected", {
                decisionId,
                rejectedBy:
                    decision.rejectedBy,
                reason:
                    decision.rejectionReason
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("decision:rejected", this.clone(decision));

            return {
                success: true,
                decision: this.clone(decision)
            };
        },

        supersedeDecision(
            decisionId,
            replacementDecisionId,
            options = {}
        ) {
            const decision =
                this.getDecisionById(decisionId);

            const replacement =
                this.getDecisionById(
                    replacementDecisionId
                );

            if (!decision || !replacement) {
                return {
                    success: false,
                    error:
                        "The original or replacement decision was not found."
                };
            }

            decision.status =
                DECISION_STATUSES.SUPERSEDED;
            decision.supersededAt =
                new Date().toISOString();
            decision.supersededBy =
                replacementDecisionId;
            decision.supersedeReason =
                options.reason ||
                "";
            decision.updatedAt =
                decision.supersededAt;

            this.persistIfEnabled();

            return {
                success: true,
                decision: this.clone(decision),
                replacement:
                    this.clone(replacement)
            };
        },

        createPlanFromDecision(
            decisionOrId,
            options = {}
        ) {
            const decision =
                typeof decisionOrId === "string"
                    ? this.getDecisionById(
                        decisionOrId
                    )
                    : decisionOrId;

            if (!decision) {
                return {
                    success: false,
                    error: "Decision was not found."
                };
            }

            if (
                decision.status !==
                DECISION_STATUSES.APPROVED &&
                options.overrideApproval !== true
            ) {
                return {
                    success: false,
                    error:
                        "Only approved decisions may create plans."
                };
            }

            const planning =
                global.ExecutivePlanning;

            if (
                !planning ||
                typeof planning.createPlan !==
                    "function"
            ) {
                return {
                    success: false,
                    error:
                        "Executive Planning Engine is unavailable."
                };
            }

            const option =
                decision.options.find(
                    (item) =>
                        item.id ===
                        decision.selectedOptionId
                );

            if (!option) {
                return {
                    success: false,
                    error:
                        "The approved option was not found."
                };
            }

            return planning.createPlan(
                {
                    title:
                        `${decision.title}: ${option.title}`,
                    objective:
                        option.description ||
                        option.title,
                    description:
                        decision.description,
                    priority:
                        decision.metadata?.priority ||
                        50,
                    primaryOffice:
                        option.office ||
                        "Maddy",
                    sourceDecisionId:
                        decision.id,
                    dependencies:
                        option.dependencies,
                    risks:
                        option.risks,
                    tags: [
                        ...decision.tags,
                        "approved-decision",
                        decision.id
                    ],
                    topics:
                        decision.topics,
                    metadata: {
                        decisionId:
                            decision.id,
                        selectedOptionId:
                            option.id,
                        approvedBy:
                            decision.approvedBy,
                        approvalDate:
                            decision.approvedAt
                    }
                },
                {
                    actor:
                        options.actor ||
                        decision.approvedBy ||
                        "Executive"
                }
            );
        },

        writeDecisionToKnowledgeEngine(
            decision,
            selectedOption
        ) {
            const engine =
                global.KnowledgeEngine;

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

            const recordId =
                `decision-${decision.id}`;

            const payload = {
                id: recordId,
                recordType: "decision",
                title: decision.title,
                summary:
                    `Approved decision: ${selectedOption.title}`,
                content: [
                    decision.question,
                    decision.recommendation?.rationale,
                    decision.approvalNotes
                ]
                    .filter(Boolean)
                    .join(" "),
                tags: [
                    ...decision.tags,
                    "executive-decision",
                    "approved"
                ],
                topics: [
                    ...decision.topics,
                    "decision"
                ],
                authority: "approved",
                confidence:
                    decision.recommendation?.confidence ||
                    0.75,
                sensitivity:
                    decision.metadata?.sensitivity ||
                    "internal",
                officeAccess: ["all"],
                metadata: {
                    decisionId: decision.id,
                    selectedOptionId:
                        selectedOption.id,
                    selectedOptionTitle:
                        selectedOption.title,
                    approvedBy:
                        decision.approvedBy,
                    approvedAt:
                        decision.approvedAt,
                    citations:
                        decision.citations
                },
                createdBy: this.name
            };

            const existing =
                engine.getRecordById?.(recordId);

            if (
                existing &&
                typeof engine.updateRecord === "function"
            ) {
                return engine.updateRecord(
                    recordId,
                    payload
                );
            }

            return engine.createRecord(payload);
        },

        runReasoning(question, options = {}) {
            const engine =
                global.InstitutionalReasoning;

            if (
                !engine ||
                typeof engine.analyze !== "function"
            ) {
                return {
                    success: false,
                    risks: [],
                    conflicts: [],
                    citations: [],
                    evidenceAssessment: {
                        score: 0,
                        label: "insufficient",
                        issues: [
                            "Institutional Reasoning Engine is unavailable."
                        ]
                    }
                };
            }

            try {
                return engine.analyze(
                    question,
                    options
                );
            } catch (error) {
                console.warn(
                    "[MEOS Executive Decision] Reasoning failed:",
                    error
                );

                return {
                    success: false,
                    risks: [],
                    conflicts: [],
                    citations: [],
                    evidenceAssessment: {
                        score: 0,
                        label: "insufficient",
                        issues: [error.message]
                    }
                };
            }
        },

        runRecall(question, options = {}) {
            const engine =
                global.ExecutiveRecall;

            if (
                !engine ||
                typeof engine.recall !== "function"
            ) {
                return {
                    success: false,
                    confidence: 0,
                    conflicts: [],
                    citations: []
                };
            }

            try {
                return engine.recall(
                    question,
                    options
                );
            } catch (error) {
                console.warn(
                    "[MEOS Executive Decision] Recall failed:",
                    error
                );

                return {
                    success: false,
                    confidence: 0,
                    conflicts: [],
                    citations: []
                };
            }
        },

        mergeRisks(primary = [], secondary = []) {
            const normalized = [
                ...primary,
                ...secondary
            ].map((risk) => {
                const value =
                    typeof risk === "string"
                        ? {
                            title: risk,
                            description: risk
                        }
                        : risk || {};

                return {
                    id:
                        value.id ||
                        this.createId("decision-risk"),
                    category:
                        value.category ||
                        "general",
                    title:
                        value.title ||
                        "Unnamed risk",
                    severity:
                        value.severity ||
                        "moderate",
                    likelihood:
                        value.likelihood ||
                        "possible",
                    description:
                        value.description ||
                        "",
                    mitigation:
                        value.mitigation ||
                        ""
                };
            });

            return this.deduplicateObjects(
                normalized,
                (risk) =>
                    `${risk.category}:${this.normalizeText(risk.title)}`
            );
        },

        normalizeWeights(weights, criteria) {
            const result = {};
            let total = 0;

            criteria.forEach((criterion) => {
                const weight =
                    Number(
                        weights?.[criterion.key]
                    ) ||
                    Number(criterion.weight) ||
                    0;

                result[criterion.key] =
                    Math.max(0, weight);
                total += result[criterion.key];
            });

            if (total <= 0) {
                const equal =
                    1 /
                    Math.max(1, criteria.length);

                criteria.forEach((criterion) => {
                    result[criterion.key] = equal;
                });

                return result;
            }

            criteria.forEach((criterion) => {
                result[criterion.key] =
                    result[criterion.key] / total;
            });

            return result;
        },

        normalizeScore(value, fallback = 0.5) {
            const number = Number(value);

            if (!Number.isFinite(number)) {
                return Math.max(
                    0,
                    Math.min(1, fallback)
                );
            }

            return Math.max(
                0,
                Math.min(
                    1,
                    number > 1
                        ? number / 100
                        : number
                )
            );
        },

        deduplicateCitations(citations = []) {
            const seen = new Set();

            return citations.filter((citation) => {
                if (!citation) {
                    return false;
                }

                const key =
                    `${citation.sourceType}:${citation.sourceId}`;

                if (seen.has(key)) {
                    return false;
                }

                seen.add(key);
                return true;
            });
        },

        getDecisionById(decisionId) {
            return (
                this.decisions.find(
                    (decision) =>
                        decision.id === decisionId
                ) || null
            );
        },

        searchDecisions(query = "", filters = {}) {
            const normalizedQuery =
                this.normalizeText(query);

            return this.decisions
                .filter((decision) => {
                    if (
                        filters.status &&
                        decision.status !==
                            filters.status
                    ) {
                        return false;
                    }

                    if (
                        filters.selectedOptionId &&
                        decision.selectedOptionId !==
                            filters.selectedOptionId
                    ) {
                        return false;
                    }

                    if (!normalizedQuery) {
                        return true;
                    }

                    const searchable =
                        this.normalizeText(
                            [
                                decision.title,
                                decision.question,
                                decision.description,
                                decision.recommendation
                                    ?.rationale,
                                ...decision.tags,
                                ...decision.topics,
                                ...decision.options.flatMap(
                                    (option) => [
                                        option.title,
                                        option.description,
                                        ...option.benefits,
                                        ...option.tradeoffs,
                                        ...option.dependencies
                                    ]
                                )
                            ].join(" ")
                        );

                    return searchable.includes(
                        normalizedQuery
                    );
                })
                .map((decision) =>
                    this.clone(decision)
                );
        },

        registerSystemKnowledge() {
            const engine =
                global.KnowledgeEngine;

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
                "knowledge-system-executive-decision";
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
                    "MEOS Executive Decision Engine",
                summary:
                    "Universal evidence-grounded option comparison, scoring, recommendation, confidence, approval, and decision-record support.",
                content:
                    "Executive Decision compares options using institutional evidence, risk, cost, readiness, compliance, and strategic fit. It does not autonomously approve, spend, communicate externally, or execute work.",
                tags: [
                    "meos-core",
                    "executive-decision",
                    "system-component"
                ],
                topics: [
                    "decision-support",
                    "option-analysis",
                    "risk",
                    "cost",
                    "confidence",
                    "approval"
                ],
                authority: "system",
                confidence: 1,
                sensitivity: "internal",
                officeAccess: ["all"],
                metadata: {
                    componentVersion: this.version,
                    organizationNeutralCore: true,
                    brickBoundary:
                        "Recommendation and decision-record support only; no autonomous approval or execution."
                },
                createdBy: this.name
            });
        },

        recalculateAnalytics() {
            this.analytics.totalDecisions =
                this.decisions.length;
            this.analytics.approvedDecisions =
                this.decisions.filter(
                    (decision) =>
                        decision.status ===
                        DECISION_STATUSES.APPROVED
                ).length;
            this.analytics.rejectedDecisions =
                this.decisions.filter(
                    (decision) =>
                        decision.status ===
                        DECISION_STATUSES.REJECTED
                ).length;
            this.analytics.awaitingApproval =
                this.decisions.filter(
                    (decision) =>
                        decision.status ===
                        DECISION_STATUSES
                            .AWAITING_APPROVAL
                ).length;
            this.analytics.insufficientEvidence =
                this.decisions.filter(
                    (decision) =>
                        decision.recommendation?.type ===
                        RECOMMENDATION_TYPES
                            .INSUFFICIENT_EVIDENCE ||
                        decision.recommendation?.type ===
                        RECOMMENDATION_TYPES.HOLD
                ).length;

            return this.analytics;
        },

        getConnectedSources() {
            return {
                institutionalReasoning:
                    Boolean(global.InstitutionalReasoning),
                executiveRecall:
                    Boolean(global.ExecutiveRecall),
                executivePlanning:
                    Boolean(global.ExecutivePlanning),
                executiveWorkflow:
                    Boolean(global.ExecutiveWorkflow),
                knowledgeEngine:
                    Boolean(global.KnowledgeEngine),
                missionEngine:
                    Boolean(global.MEOSMissionEngine)
            };
        },

        getStatus() {
            this.recalculateAnalytics();

            return {
                name: this.name,
                version: this.version,
                status: this.status,
                operatingMode: this.operatingMode,
                organizationNeutralCore:
                    this.configuration.organizationNeutralCore,
                connectedSources:
                    this.getConnectedSources(),
                decisionCount:
                    this.decisions.length,
                analytics:
                    this.clone(this.analytics),
                initializedAt:
                    this.initializedAt
            };
        },

        exportDecision(options = {}) {
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
                    decisions:
                        this.decisions,
                    history:
                        options.includeHistory === false
                            ? []
                            : this.history,
                    analytics:
                        this.analytics
                }
            };
        },

        importDecision(payload, options = {}) {
            let data = payload;

            if (typeof payload === "string") {
                try {
                    data = JSON.parse(payload);
                } catch (error) {
                    return {
                        success: false,
                        error:
                            "The Executive Decision import is not valid JSON."
                    };
                }
            }

            if (!data || data.schema !== SCHEMA) {
                return {
                    success: false,
                    error:
                        "The import is not a MEOS Executive Decision package."
                };
            }

            if (options.replace === true) {
                this.decisions = [];
                this.history = [];
            }

            this.mergeById(
                this.decisions,
                data.decisions || []
            );
            this.mergeById(
                this.history,
                data.history || []
            );

            if (data.analytics) {
                this.analytics = {
                    ...this.analytics,
                    ...data.analytics
                };
            }

            this.recalculateAnalytics();
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
                        "Executive Decision persistence is disabled."
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
                        this.exportDecision({
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
                    "[MEOS Executive Decision] Persistence failed:",
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
                const result =
                    this.importDecision(
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
                    "[MEOS Executive Decision] Stored state could not be restored:",
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
                        "Clearing Executive Decision data requires { confirm: true }."
                };
            }

            this.decisions = [];
            this.history = [];
            this.analytics = {
                totalDecisions: 0,
                approvedDecisions: 0,
                rejectedDecisions: 0,
                awaitingApproval: 0,
                insufficientEvidence: 0,
                lastDecisionAt: null
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

        logHistory(action, details = {}) {
            const entry = {
                id: this.createId("decision-history"),
                action,
                timestamp:
                    new Date().toISOString(),
                details
            };

            this.history.unshift(entry);

            if (
                this.history.length >
                this.configuration.maximumHistory
            ) {
                this.history.length =
                    this.configuration.maximumHistory;
            }

            this.analytics.lastDecisionAt =
                entry.timestamp;

            this.emit("decision:history", this.clone(entry));
            return entry;
        },

        normalizeKey(value) {
            return String(value || "")
                .trim()
                .replace(/[^a-zA-Z0-9]+(.)/g, (_, character) =>
                    character.toUpperCase()
                )
                .replace(/^[A-Z]/, (character) =>
                    character.toLowerCase()
                );
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

        deduplicateObjects(items, keyFn) {
            const map = new Map();

            items.forEach((item) => {
                const key = keyFn(item);

                if (!map.has(key)) {
                    map.set(key, item);
                }
            });

            return Array.from(map.values());
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
                        `[MEOS Executive Decision] Event listener failed for "${eventName}":`,
                        error
                    );
                }
            });
        }
    };

    ExecutiveDecision.DECISION_STATUSES =
        DECISION_STATUSES;
    ExecutiveDecision.RECOMMENDATION_TYPES =
        RECOMMENDATION_TYPES;

    global.ExecutiveDecision =
        ExecutiveDecision;
    ExecutiveDecision.initialize();
})(window);
