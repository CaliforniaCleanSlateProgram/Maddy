/*
 * MEOS Executive Collaboration Engine
 * Version: 1.0.0
 *
 * Mission:
 * Coordinate structured executive-office collaboration around a shared issue,
 * gather office positions, surface agreements and conflicts, and prepare a
 * documented cabinet recommendation for executive review.
 *
 * Brick boundary:
 * This engine coordinates collaboration. It does not fabricate office opinions,
 * autonomously approve decisions, spend money, contact external parties, or
 * bypass executive authority.
 */

(function initializeExecutiveCollaboration(global) {
    "use strict";

    const STORAGE_KEY = "meos.executive-collaboration.v1";
    const SCHEMA = "meos.executive-collaboration.package.v1";

    const SESSION_STATUSES = {
        DRAFT: "draft",
        COLLECTING: "collecting",
        DELIBERATING: "deliberating",
        AWAITING_APPROVAL: "awaiting-approval",
        COMPLETE: "complete",
        PAUSED: "paused",
        CANCELLED: "cancelled",
        ARCHIVED: "archived"
    };

    const POSITION_STANCES = {
        SUPPORT: "support",
        SUPPORT_WITH_CONDITIONS: "support-with-conditions",
        NEUTRAL: "neutral",
        OPPOSE: "oppose",
        ABSTAIN: "abstain",
        INSUFFICIENT_INFORMATION: "insufficient-information"
    };

    const CONSENSUS_LEVELS = {
        NONE: "none",
        LOW: "low",
        MODERATE: "moderate",
        STRONG: "strong",
        UNANIMOUS: "unanimous"
    };

    const ExecutiveCollaboration = {
        name: "MEOS Executive Collaboration Engine",
        version: "1.0.0",
        status: "initializing",
        operatingMode: "structured-cabinet-collaboration",

        configuration: {
            persistenceEnabled: true,
            automaticPersistence: true,
            localStorageKey: STORAGE_KEY,
            organizationNeutralCore: true,
            requireExecutiveApproval: true,
            maximumSessions: 500,
            maximumParticipantsPerSession: 50,
            maximumContributionsPerSession: 1000,
            maximumHistory: 2000,
            minimumQuorum: 2,
            defaultConsensusThreshold: 0.67,
            includeDecisionAnalysis: true,
            includeReasoningContext: true,
            includeRecallContext: true,
            includeActionItems: true,
            includeDissent: true,
            preserveMinorityPositions: true
        },

        sessions: [],
        history: [],
        analytics: {
            totalSessions: 0,
            activeSessions: 0,
            completedSessions: 0,
            awaitingApproval: 0,
            strongConsensusCount: 0,
            unresolvedConflictCount: 0,
            lastSessionAt: null
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

            this.emit("collaboration:online", this.getStatus());
            return this.getStatus();
        },

        createSession(input = {}, options = {}) {
            const subject = String(
                input.subject ||
                input.title ||
                input.question ||
                ""
            ).trim();

            if (!subject) {
                return {
                    success: false,
                    error: "A collaboration subject is required."
                };
            }

            if (
                this.sessions.length >=
                this.configuration.maximumSessions
            ) {
                return {
                    success: false,
                    error: "The collaboration session limit has been reached."
                };
            }

            const participantInputs =
                Array.isArray(input.participants) &&
                input.participants.length > 0
                    ? input.participants
                    : this.deriveParticipants(input);

            if (
                participantInputs.length >
                this.configuration.maximumParticipantsPerSession
            ) {
                return {
                    success: false,
                    error: "The session contains too many participants."
                };
            }

            const timestamp = new Date().toISOString();

            const session = {
                id: this.createId("collaboration-session"),
                title: input.title || subject,
                subject,
                question: input.question || subject,
                description: input.description || "",
                status: SESSION_STATUSES.DRAFT,
                requestedBy:
                    input.requestedBy ||
                    options.actor ||
                    "Executive",
                chair:
                    input.chair ||
                    "Maddy",
                createdAt: timestamp,
                updatedAt: timestamp,
                openedAt: null,
                closedAt: null,
                approvedAt: null,
                approvedBy: null,
                approvalNotes: "",
                sourceDecisionId:
                    input.sourceDecisionId ||
                    null,
                sourcePlanId:
                    input.sourcePlanId ||
                    null,
                sourceWorkflowId:
                    input.sourceWorkflowId ||
                    null,
                participants: participantInputs.map(
                    (participant, index) =>
                        this.normalizeParticipant(
                            participant,
                            index
                        )
                ),
                contributions: [],
                positions: [],
                agreements: [],
                disagreements: [],
                conditions: [],
                risks: [],
                dependencies: [],
                actionItems: [],
                citations: [],
                context: null,
                consensus: {
                    level: CONSENSUS_LEVELS.NONE,
                    score: 0,
                    quorumMet: false,
                    supportingCount: 0,
                    opposingCount: 0,
                    conditionalCount: 0,
                    neutralCount: 0,
                    abstainingCount: 0,
                    insufficientInformationCount: 0
                },
                recommendation: null,
                tags: this.uniqueStrings(input.tags),
                topics: this.uniqueStrings([
                    ...(input.topics || []),
                    "executive-collaboration"
                ]),
                metadata:
                    input.metadata &&
                    typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}
            };

            session.context = this.buildContext(
                session,
                input
            );

            this.sessions.push(session);
            this.recalculateAnalytics();

            this.logHistory("session.created", {
                sessionId: session.id,
                subject: session.subject,
                participantCount:
                    session.participants.length
            });

            this.persistIfEnabled();
            this.emit("collaboration:session-created", this.clone(session));

            return {
                success: true,
                session: this.clone(session)
            };
        },

        deriveParticipants(input = {}) {
            const offices = this.getExecutiveOfficeNames();

            if (offices.length > 0) {
                return offices.map((office) => ({
                    office,
                    name: office,
                    role: "executive-office",
                    voting: true
                }));
            }

            return [
                {
                    office: "Maddy",
                    name: "Maddy",
                    role: "chair",
                    voting: true
                },
                {
                    office: "Archie",
                    name: "Archie",
                    role: "finance",
                    voting: true
                },
                {
                    office: "Justice",
                    name: "Justice",
                    role: "legal-compliance",
                    voting: true
                },
                {
                    office: "Harmony",
                    name: "Harmony",
                    role: "people-operations",
                    voting: true
                },
                {
                    office: "Grant",
                    name: "Grant",
                    role: "grants",
                    voting: true
                },
                {
                    office: "Atlas",
                    name: "Atlas",
                    role: "intelligence",
                    voting: true
                }
            ];
        },

        normalizeParticipant(input, index = 0) {
            const value =
                typeof input === "string"
                    ? {
                        name: input,
                        office: input
                    }
                    : input || {};

            return {
                id:
                    value.id ||
                    this.createId("collaboration-participant"),
                order: index + 1,
                name:
                    value.name ||
                    value.office ||
                    `Participant ${index + 1}`,
                office:
                    value.office ||
                    value.name ||
                    null,
                role:
                    value.role ||
                    "executive-office",
                voting:
                    value.voting !== false,
                required:
                    value.required !== false,
                status:
                    value.status ||
                    "invited",
                joinedAt: null,
                respondedAt: null,
                contributionIds: [],
                positionId: null,
                metadata:
                    value.metadata &&
                    typeof value.metadata === "object"
                        ? { ...value.metadata }
                        : {}
            };
        },

        openSession(sessionId, options = {}) {
            const session = this.getSessionById(sessionId);

            if (!session) {
                return {
                    success: false,
                    error: "Collaboration session was not found."
                };
            }

            if (
                ![
                    SESSION_STATUSES.DRAFT,
                    SESSION_STATUSES.PAUSED
                ].includes(session.status)
            ) {
                return {
                    success: false,
                    error:
                        "Only draft or paused sessions may be opened."
                };
            }

            const timestamp = new Date().toISOString();

            session.status = SESSION_STATUSES.COLLECTING;
            session.openedAt =
                session.openedAt ||
                timestamp;
            session.updatedAt = timestamp;

            session.participants.forEach((participant) => {
                if (participant.status === "invited") {
                    participant.status = "requested";
                }
            });

            this.logHistory("session.opened", {
                sessionId,
                actor:
                    options.actor ||
                    session.chair
            });

            this.persistIfEnabled();
            this.emit("collaboration:session-opened", this.clone(session));

            return {
                success: true,
                session: this.clone(session)
            };
        },

        addContribution(
            sessionId,
            input = {},
            options = {}
        ) {
            const session = this.getSessionById(sessionId);

            if (!session) {
                return {
                    success: false,
                    error: "Collaboration session was not found."
                };
            }

            if (
                ![
                    SESSION_STATUSES.COLLECTING,
                    SESSION_STATUSES.DELIBERATING
                ].includes(session.status)
            ) {
                return {
                    success: false,
                    error:
                        "The session is not accepting contributions."
                };
            }

            if (
                session.contributions.length >=
                this.configuration.maximumContributionsPerSession
            ) {
                return {
                    success: false,
                    error:
                        "The contribution limit has been reached."
                };
            }

            const participant =
                this.resolveParticipant(
                    session,
                    input.participantId ||
                    input.office ||
                    input.participant
                );

            if (!participant) {
                return {
                    success: false,
                    error:
                        "The contributing participant was not found."
                };
            }

            const content = String(
                input.content ||
                input.statement ||
                input.summary ||
                ""
            ).trim();

            if (!content) {
                return {
                    success: false,
                    error:
                        "Contribution content is required."
                };
            }

            const contribution = {
                id: this.createId("collaboration-contribution"),
                sessionId: session.id,
                participantId: participant.id,
                participantName: participant.name,
                office: participant.office,
                type:
                    input.type ||
                    "position-statement",
                content,
                summary:
                    input.summary ||
                    content,
                evidence:
                    Array.isArray(input.evidence)
                        ? input.evidence
                        : [],
                citations:
                    Array.isArray(input.citations)
                        ? input.citations
                        : [],
                risks:
                    Array.isArray(input.risks)
                        ? input.risks
                        : [],
                dependencies:
                    this.uniqueStrings(input.dependencies),
                conditions:
                    this.uniqueStrings(input.conditions),
                proposals:
                    this.uniqueStrings(input.proposals),
                questions:
                    this.uniqueStrings(input.questions),
                createdAt:
                    new Date().toISOString(),
                createdBy:
                    options.actor ||
                    participant.name,
                metadata:
                    input.metadata &&
                    typeof input.metadata === "object"
                        ? { ...input.metadata }
                        : {}
            };

            session.contributions.push(contribution);
            participant.contributionIds.push(
                contribution.id
            );
            participant.respondedAt =
                contribution.createdAt;
            participant.status = "responded";

            session.citations =
                this.deduplicateCitations([
                    ...session.citations,
                    ...contribution.citations
                ]);
            session.risks =
                this.mergeObjects(
                    session.risks,
                    contribution.risks,
                    "risk"
                );
            session.dependencies =
                this.uniqueStrings([
                    ...session.dependencies,
                    ...contribution.dependencies
                ]);
            session.conditions =
                this.uniqueStrings([
                    ...session.conditions,
                    ...contribution.conditions
                ]);
            session.updatedAt =
                contribution.createdAt;

            this.logHistory("contribution.added", {
                sessionId,
                contributionId: contribution.id,
                participantId: participant.id,
                office: participant.office
            });

            this.persistIfEnabled();
            this.emit("collaboration:contribution-added", {
                session: this.clone(session),
                contribution:
                    this.clone(contribution)
            });

            return {
                success: true,
                contribution:
                    this.clone(contribution),
                session: this.clone(session)
            };
        },

        submitPosition(
            sessionId,
            input = {},
            options = {}
        ) {
            const session = this.getSessionById(sessionId);

            if (!session) {
                return {
                    success: false,
                    error: "Collaboration session was not found."
                };
            }

            const participant =
                this.resolveParticipant(
                    session,
                    input.participantId ||
                    input.office ||
                    input.participant
                );

            if (!participant) {
                return {
                    success: false,
                    error:
                        "The participant was not found."
                };
            }

            const stance =
                this.normalizeStance(input.stance);

            const position = {
                id:
                    participant.positionId ||
                    this.createId("collaboration-position"),
                sessionId: session.id,
                participantId: participant.id,
                participantName: participant.name,
                office: participant.office,
                stance,
                confidence:
                    this.normalizeConfidence(
                        input.confidence
                    ),
                rationale:
                    String(
                        input.rationale ||
                        input.reason ||
                        ""
                    ).trim(),
                conditions:
                    this.uniqueStrings(input.conditions),
                objections:
                    this.uniqueStrings(input.objections),
                preferredOptionId:
                    input.preferredOptionId ||
                    null,
                citations:
                    Array.isArray(input.citations)
                        ? input.citations
                        : [],
                submittedAt:
                    new Date().toISOString(),
                submittedBy:
                    options.actor ||
                    participant.name
            };

            const existingIndex =
                session.positions.findIndex(
                    (item) =>
                        item.participantId ===
                        participant.id
                );

            if (existingIndex >= 0) {
                session.positions[existingIndex] =
                    position;
            } else {
                session.positions.push(position);
            }

            participant.positionId = position.id;
            participant.respondedAt =
                position.submittedAt;
            participant.status = "responded";

            session.citations =
                this.deduplicateCitations([
                    ...session.citations,
                    ...position.citations
                ]);
            session.conditions =
                this.uniqueStrings([
                    ...session.conditions,
                    ...position.conditions
                ]);
            session.updatedAt =
                position.submittedAt;

            this.calculateConsensus(session);

            this.logHistory("position.submitted", {
                sessionId,
                participantId: participant.id,
                stance: position.stance,
                confidence: position.confidence
            });

            this.persistIfEnabled();
            this.emit("collaboration:position-submitted", {
                session: this.clone(session),
                position: this.clone(position)
            });

            return {
                success: true,
                position: this.clone(position),
                consensus:
                    this.clone(session.consensus),
                session: this.clone(session)
            };
        },

        beginDeliberation(sessionId, options = {}) {
            const session = this.getSessionById(sessionId);

            if (!session) {
                return {
                    success: false,
                    error: "Collaboration session was not found."
                };
            }

            const quorum =
                this.evaluateQuorum(session);

            if (
                !quorum.met &&
                options.overrideQuorum !== true
            ) {
                return {
                    success: false,
                    error:
                        "The session has not met quorum.",
                    quorum
                };
            }

            session.status =
                SESSION_STATUSES.DELIBERATING;
            session.deliberationStartedAt =
                new Date().toISOString();
            session.updatedAt =
                session.deliberationStartedAt;

            this.calculateConsensus(session);
            this.extractAgreements(session);
            this.extractDisagreements(session);

            this.logHistory("session.deliberation-started", {
                sessionId,
                actor:
                    options.actor ||
                    session.chair
            });

            this.persistIfEnabled();
            this.emit(
                "collaboration:deliberation-started",
                this.clone(session)
            );

            return {
                success: true,
                session: this.clone(session),
                quorum,
                consensus:
                    this.clone(session.consensus)
            };
        },

        finalizeSession(sessionId, options = {}) {
            const session = this.getSessionById(sessionId);

            if (!session) {
                return {
                    success: false,
                    error: "Collaboration session was not found."
                };
            }

            if (
                ![
                    SESSION_STATUSES.COLLECTING,
                    SESSION_STATUSES.DELIBERATING
                ].includes(session.status) &&
                options.overrideStatus !== true
            ) {
                return {
                    success: false,
                    error:
                        "The session is not ready to finalize."
                };
            }

            const quorum =
                this.evaluateQuorum(session);

            if (
                !quorum.met &&
                options.overrideQuorum !== true
            ) {
                return {
                    success: false,
                    error:
                        "The session cannot finalize without quorum.",
                    quorum
                };
            }

            this.calculateConsensus(session);
            this.extractAgreements(session);
            this.extractDisagreements(session);
            this.buildActionItems(session);

            session.recommendation =
                this.buildCabinetRecommendation(
                    session
                );

            session.status =
                this.configuration.requireExecutiveApproval
                    ? SESSION_STATUSES.AWAITING_APPROVAL
                    : SESSION_STATUSES.COMPLETE;

            session.closedAt =
                new Date().toISOString();
            session.updatedAt =
                session.closedAt;

            this.logHistory("session.finalized", {
                sessionId,
                consensusLevel:
                    session.consensus.level,
                consensusScore:
                    session.consensus.score,
                recommendation:
                    session.recommendation?.type
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("collaboration:session-finalized", this.clone(session));

            return {
                success: true,
                session: this.clone(session),
                recommendation:
                    this.clone(session.recommendation)
            };
        },

        approveSession(
            sessionId,
            options = {}
        ) {
            const session = this.getSessionById(sessionId);

            if (!session) {
                return {
                    success: false,
                    error:
                        "Collaboration session was not found."
                };
            }

            if (
                session.status !==
                SESSION_STATUSES.AWAITING_APPROVAL &&
                options.overrideStatus !== true
            ) {
                return {
                    success: false,
                    error:
                        "The session is not awaiting approval."
                };
            }

            const timestamp =
                new Date().toISOString();

            session.status =
                SESSION_STATUSES.COMPLETE;
            session.approvedAt = timestamp;
            session.approvedBy =
                options.actor ||
                "Executive";
            session.approvalNotes =
                options.notes ||
                "";
            session.updatedAt = timestamp;

            if (
                options.createDecision === true
            ) {
                this.createDecisionFromSession(
                    session,
                    {
                        actor:
                            session.approvedBy
                    }
                );
            }

            this.logHistory("session.approved", {
                sessionId,
                approvedBy:
                    session.approvedBy
            });

            this.recalculateAnalytics();
            this.persistIfEnabled();
            this.emit("collaboration:session-approved", this.clone(session));

            return {
                success: true,
                session: this.clone(session)
            };
        },

        pauseSession(sessionId, options = {}) {
            const session = this.getSessionById(sessionId);

            if (!session) {
                return {
                    success: false,
                    error:
                        "Collaboration session was not found."
                };
            }

            session.status =
                SESSION_STATUSES.PAUSED;
            session.pausedAt =
                new Date().toISOString();
            session.pauseReason =
                options.reason ||
                "";
            session.updatedAt =
                session.pausedAt;

            this.persistIfEnabled();

            return {
                success: true,
                session: this.clone(session)
            };
        },

        cancelSession(sessionId, options = {}) {
            const session = this.getSessionById(sessionId);

            if (!session) {
                return {
                    success: false,
                    error:
                        "Collaboration session was not found."
                };
            }

            session.status =
                SESSION_STATUSES.CANCELLED;
            session.cancelledAt =
                new Date().toISOString();
            session.cancelledBy =
                options.actor ||
                "Executive";
            session.cancelReason =
                options.reason ||
                "";
            session.updatedAt =
                session.cancelledAt;

            this.recalculateAnalytics();
            this.persistIfEnabled();

            return {
                success: true,
                session: this.clone(session)
            };
        },

        calculateConsensus(session) {
            const votingParticipants =
                session.participants.filter(
                    (participant) =>
                        participant.voting
                );

            const positions =
                session.positions.filter(
                    (position) =>
                        votingParticipants.some(
                            (participant) =>
                                participant.id ===
                                position.participantId
                        )
                );

            const quorum =
                this.evaluateQuorum(session);

            const counts = {
                support: 0,
                conditional: 0,
                neutral: 0,
                oppose: 0,
                abstain: 0,
                insufficient: 0
            };

            let weightedSupport = 0;
            let weightedTotal = 0;

            positions.forEach((position) => {
                const confidence =
                    position.confidence || 0.5;

                weightedTotal += confidence;

                switch (position.stance) {
                    case POSITION_STANCES.SUPPORT:
                        counts.support += 1;
                        weightedSupport += confidence;
                        break;
                    case POSITION_STANCES.SUPPORT_WITH_CONDITIONS:
                        counts.conditional += 1;
                        weightedSupport +=
                            confidence * 0.75;
                        break;
                    case POSITION_STANCES.NEUTRAL:
                        counts.neutral += 1;
                        weightedSupport +=
                            confidence * 0.5;
                        break;
                    case POSITION_STANCES.OPPOSE:
                        counts.oppose += 1;
                        break;
                    case POSITION_STANCES.ABSTAIN:
                        counts.abstain += 1;
                        break;
                    default:
                        counts.insufficient += 1;
                        weightedSupport +=
                            confidence * 0.25;
                        break;
                }
            });

            const score =
                weightedTotal > 0
                    ? weightedSupport /
                      weightedTotal
                    : 0;

            let level = CONSENSUS_LEVELS.NONE;

            if (
                positions.length > 0 &&
                counts.oppose === 0 &&
                counts.conditional === 0 &&
                counts.neutral === 0 &&
                counts.insufficient === 0 &&
                counts.abstain === 0
            ) {
                level =
                    CONSENSUS_LEVELS.UNANIMOUS;
            } else if (score >= 0.85) {
                level =
                    CONSENSUS_LEVELS.STRONG;
            } else if (
                score >=
                this.configuration.defaultConsensusThreshold
            ) {
                level =
                    CONSENSUS_LEVELS.MODERATE;
            } else if (score > 0) {
                level =
                    CONSENSUS_LEVELS.LOW;
            }

            session.consensus = {
                level,
                score:
                    Number(score.toFixed(3)),
                quorumMet: quorum.met,
                supportingCount:
                    counts.support,
                opposingCount:
                    counts.oppose,
                conditionalCount:
                    counts.conditional,
                neutralCount:
                    counts.neutral,
                abstainingCount:
                    counts.abstain,
                insufficientInformationCount:
                    counts.insufficient
            };

            return session.consensus;
        },

        evaluateQuorum(session) {
            const requiredParticipants =
                session.participants.filter(
                    (participant) =>
                        participant.required &&
                        participant.voting
                );

            const respondingParticipants =
                requiredParticipants.filter(
                    (participant) =>
                        Boolean(
                            participant.positionId ||
                            participant.contributionIds.length
                        )
                );

            const minimum =
                Math.max(
                    this.configuration.minimumQuorum,
                    Math.ceil(
                        requiredParticipants.length *
                        0.5
                    )
                );

            return {
                met:
                    respondingParticipants.length >=
                    minimum,
                requiredCount:
                    requiredParticipants.length,
                respondingCount:
                    respondingParticipants.length,
                minimumRequired:
                    minimum,
                missingParticipants:
                    requiredParticipants
                        .filter(
                            (participant) =>
                                !respondingParticipants.some(
                                    (responding) =>
                                        responding.id ===
                                        participant.id
                                )
                        )
                        .map((participant) => ({
                            id: participant.id,
                            name: participant.name,
                            office: participant.office
                        }))
            };
        },

        extractAgreements(session) {
            const agreements = [];

            const supportingPositions =
                session.positions.filter(
                    (position) =>
                        [
                            POSITION_STANCES.SUPPORT,
                            POSITION_STANCES.SUPPORT_WITH_CONDITIONS
                        ].includes(position.stance)
                );

            if (supportingPositions.length > 0) {
                agreements.push({
                    id: this.createId("collaboration-agreement"),
                    title:
                        "General Support for Proposed Direction",
                    description:
                        `${supportingPositions.length} participating office` +
                        `${supportingPositions.length === 1 ? "" : "s"} support the proposed direction.`,
                    participantIds:
                        supportingPositions.map(
                            (position) =>
                                position.participantId
                        ),
                    confidence:
                        Number(
                            (
                                supportingPositions.reduce(
                                    (sum, position) =>
                                        sum +
                                        position.confidence,
                                    0
                                ) /
                                supportingPositions.length
                            ).toFixed(3)
                        )
                });
            }

            const sharedConditions =
                this.findRepeatedStrings(
                    session.positions.flatMap(
                        (position) =>
                            position.conditions
                    )
                );

            sharedConditions.forEach((condition) => {
                agreements.push({
                    id: this.createId("collaboration-agreement"),
                    title: "Shared Condition",
                    description: condition.value,
                    occurrenceCount:
                        condition.count,
                    confidence:
                        Math.min(
                            1,
                            condition.count /
                            Math.max(
                                1,
                                session.positions.length
                            )
                        )
                });
            });

            session.agreements = agreements;
            return agreements;
        },

        extractDisagreements(session) {
            const disagreements = [];

            session.positions
                .filter(
                    (position) =>
                        position.stance ===
                        POSITION_STANCES.OPPOSE
                )
                .forEach((position) => {
                    disagreements.push({
                        id: this.createId("collaboration-disagreement"),
                        title:
                            `${position.office || position.participantName} opposition`,
                        description:
                            position.rationale ||
                            "The participant opposes the proposed direction.",
                        participantId:
                            position.participantId,
                        office:
                            position.office,
                        objections:
                            position.objections,
                        citations:
                            position.citations,
                        status: "unresolved"
                    });
                });

            const conflictingPreferences = {};
            session.positions.forEach((position) => {
                if (!position.preferredOptionId) {
                    return;
                }

                if (
                    !conflictingPreferences[
                        position.preferredOptionId
                    ]
                ) {
                    conflictingPreferences[
                        position.preferredOptionId
                    ] = [];
                }

                conflictingPreferences[
                    position.preferredOptionId
                ].push(position);
            });

            if (
                Object.keys(
                    conflictingPreferences
                ).length > 1
            ) {
                disagreements.push({
                    id: this.createId("collaboration-disagreement"),
                    title:
                        "Different Preferred Options",
                    description:
                        "Participating offices selected different preferred options.",
                    preferences:
                        conflictingPreferences,
                    status: "unresolved"
                });
            }

            session.disagreements = disagreements;
            return disagreements;
        },

        buildActionItems(session) {
            const actionItems = [];

            session.conditions.forEach((condition) => {
                actionItems.push({
                    id: this.createId("collaboration-action"),
                    sessionId: session.id,
                    title: condition,
                    description:
                        "Resolve a condition identified during cabinet collaboration.",
                    owner: null,
                    office: "Maddy",
                    status: "recommended",
                    priority: 70,
                    targetDate: null,
                    source: "condition"
                });
            });

            session.disagreements.forEach((disagreement) => {
                if (disagreement.status === "unresolved") {
                    actionItems.push({
                        id: this.createId("collaboration-action"),
                        sessionId: session.id,
                        title:
                            `Resolve: ${disagreement.title}`,
                        description:
                            disagreement.description,
                        owner: null,
                        office: "Maddy",
                        status: "recommended",
                        priority: 80,
                        targetDate: null,
                        source: "disagreement"
                    });
                }
            });

            session.dependencies.forEach((dependency) => {
                actionItems.push({
                    id: this.createId("collaboration-action"),
                    sessionId: session.id,
                    title:
                        `Confirm dependency: ${dependency}`,
                    description:
                        "Confirm this dependency before implementation.",
                    owner: null,
                    office: "Maddy",
                    status: "recommended",
                    priority: 70,
                    targetDate: null,
                    source: "dependency"
                });
            });

            session.actionItems =
                this.deduplicateObjects(
                    actionItems,
                    (item) =>
                        this.normalizeText(item.title)
                );

            return session.actionItems;
        },

        buildCabinetRecommendation(session) {
            const consensus =
                session.consensus;

            if (!consensus.quorumMet) {
                return {
                    type: "hold",
                    confidence: 0,
                    rationale:
                        "Cabinet quorum was not met.",
                    conditions: [
                        "Collect responses from the required offices."
                    ],
                    executiveApprovalRequired: true
                };
            }

            if (
                consensus.level ===
                CONSENSUS_LEVELS.NONE
            ) {
                return {
                    type: "escalate",
                    confidence:
                        consensus.score,
                    rationale:
                        "The cabinet did not reach a usable consensus.",
                    conditions: [
                        "Resolve material disagreements.",
                        "Request additional evidence or executive direction."
                    ],
                    executiveApprovalRequired: true
                };
            }

            if (
                consensus.level ===
                    CONSENSUS_LEVELS.LOW ||
                session.disagreements.length > 0
            ) {
                return {
                    type:
                        "proceed-with-conditions",
                    confidence:
                        consensus.score,
                    rationale:
                        "The cabinet supports a conditional path, but material disagreement remains.",
                    conditions:
                        this.uniqueStrings([
                            ...session.conditions,
                            ...session.actionItems.map(
                                (item) =>
                                    item.title
                            )
                        ]),
                    executiveApprovalRequired: true
                };
            }

            return {
                type: "proceed",
                confidence:
                    consensus.score,
                rationale:
                    consensus.level ===
                    CONSENSUS_LEVELS.UNANIMOUS
                        ? "The participating cabinet reached unanimous support."
                        : "The participating cabinet reached strong evidence-supported agreement.",
                conditions:
                    session.conditions,
                executiveApprovalRequired:
                    this.configuration
                        .requireExecutiveApproval
            };
        },

        createDecisionFromSession(
            sessionOrId,
            options = {}
        ) {
            const session =
                typeof sessionOrId === "string"
                    ? this.getSessionById(
                        sessionOrId
                    )
                    : sessionOrId;

            if (!session) {
                return {
                    success: false,
                    error:
                        "Collaboration session was not found."
                };
            }

            if (
                session.status !==
                SESSION_STATUSES.COMPLETE &&
                options.overrideApproval !== true
            ) {
                return {
                    success: false,
                    error:
                        "Only completed collaboration sessions may create decisions."
                };
            }

            const decisionEngine =
                global.ExecutiveDecision;

            if (
                !decisionEngine ||
                typeof decisionEngine.createDecision !==
                    "function"
            ) {
                return {
                    success: false,
                    error:
                        "Executive Decision Engine is unavailable."
                };
            }

            const preferredOptions = {};
            session.positions.forEach((position) => {
                if (!position.preferredOptionId) {
                    return;
                }

                if (!preferredOptions[position.preferredOptionId]) {
                    preferredOptions[position.preferredOptionId] = {
                        id: position.preferredOptionId,
                        title:
                            position.preferredOptionId,
                        supportCount: 0,
                        offices: []
                    };
                }

                preferredOptions[
                    position.preferredOptionId
                ].supportCount += 1;
                preferredOptions[
                    position.preferredOptionId
                ].offices.push(
                    position.office
                );
            });

            let optionsList =
                Object.values(preferredOptions).map(
                    (item) => ({
                        id: item.id,
                        title: item.title,
                        description:
                            `Preferred by ${item.supportCount} participating office` +
                            `${item.supportCount === 1 ? "" : "s"}.`,
                        benefits: [
                            `Supported by: ${item.offices.join(", ")}`
                        ],
                        citations:
                            session.citations
                    })
                );

            if (optionsList.length === 0) {
                optionsList = [
                    {
                        title:
                            "Proceed with Cabinet Recommendation",
                        description:
                            session.recommendation?.rationale ||
                            "Proceed using the cabinet's recommended direction.",
                        benefits:
                            session.agreements.map(
                                (item) =>
                                    item.description
                            ),
                        risks:
                            session.risks,
                        dependencies:
                            session.dependencies,
                        citations:
                            session.citations
                    },
                    {
                        title:
                            "Hold for Additional Review",
                        description:
                            "Pause and gather more evidence or resolve disagreement.",
                        benefits: [
                            "Reduces avoidable governance risk."
                        ],
                        tradeoffs: [
                            "May delay execution."
                        ],
                        citations:
                            session.citations
                    }
                ];
            }

            return decisionEngine.createDecision(
                {
                    title:
                        `Cabinet Decision: ${session.title}`,
                    question:
                        session.question,
                    description:
                        session.description,
                    options:
                        optionsList,
                    constraints:
                        session.conditions,
                    dependencies:
                        session.dependencies,
                    risks:
                        session.risks,
                    sourceWorkflowId:
                        session.sourceWorkflowId,
                    sourcePlanId:
                        session.sourcePlanId,
                    tags: [
                        ...session.tags,
                        "cabinet-collaboration",
                        session.id
                    ],
                    topics:
                        session.topics,
                    metadata: {
                        collaborationSessionId:
                            session.id,
                        consensusLevel:
                            session.consensus.level,
                        consensusScore:
                            session.consensus.score,
                        dissentCount:
                            session.disagreements.length
                    }
                },
                {
                    actor:
                        options.actor ||
                        session.approvedBy ||
                        session.chair
                }
            );
        },

        buildContext(session, input = {}) {
            const context = {
                reasoning: null,
                recall: null,
                decision: null,
                createdAt:
                    new Date().toISOString()
            };

            if (
                this.configuration.includeReasoningContext &&
                global.InstitutionalReasoning?.analyze
            ) {
                try {
                    context.reasoning =
                        global.InstitutionalReasoning.analyze(
                            session.question,
                            {
                                mode:
                                    input.reasoningMode ||
                                    "executive",
                                evidenceLimit:
                                    input.evidenceLimit ||
                                    40
                            }
                        );
                } catch (error) {
                    console.warn(
                        "[MEOS Executive Collaboration] Reasoning context failed:",
                        error
                    );
                }
            }

            if (
                this.configuration.includeRecallContext &&
                global.ExecutiveRecall?.recall
            ) {
                try {
                    context.recall =
                        global.ExecutiveRecall.recall(
                            session.subject,
                            {
                                mode: "executive",
                                limit:
                                    input.evidenceLimit ||
                                    40
                            }
                        );
                } catch (error) {
                    console.warn(
                        "[MEOS Executive Collaboration] Recall context failed:",
                        error
                    );
                }
            }

            if (
                this.configuration.includeDecisionAnalysis &&
                session.sourceDecisionId &&
                global.ExecutiveDecision?.getDecisionById
            ) {
                context.decision =
                    global.ExecutiveDecision.getDecisionById(
                        session.sourceDecisionId
                    );
            }

            const citations = [
                ...(context.reasoning?.citations || []),
                ...(context.recall?.citations || [])
            ];

            session.citations =
                this.deduplicateCitations(citations);

            session.risks =
                this.mergeObjects(
                    session.risks,
                    context.reasoning?.risks || [],
                    "risk"
                );

            session.dependencies =
                this.uniqueStrings([
                    ...session.dependencies,
                    ...(
                        context.reasoning?.dependencies || []
                    ).map((item) =>
                        typeof item === "string"
                            ? item
                            : item.dependency ||
                              item.title
                    )
                ]);

            return context;
        },

        getExecutiveOfficeNames() {
            const system =
                global.MEOSExecutiveOffices ||
                global.ExecutiveOffices ||
                global.MEOS;

            const offices =
                system?.offices ||
                system?.state?.offices ||
                [];

            if (!Array.isArray(offices)) {
                return [];
            }

            return this.uniqueStrings(
                offices.map((office) =>
                    typeof office === "string"
                        ? office
                        : office.name ||
                          office.displayName ||
                          office.id
                )
            );
        },

        resolveParticipant(session, value) {
            if (!value) {
                return null;
            }

            const normalized =
                this.normalizeText(value);

            return (
                session.participants.find(
                    (participant) =>
                        participant.id === value ||
                        this.normalizeText(
                            participant.name
                        ) === normalized ||
                        this.normalizeText(
                            participant.office
                        ) === normalized
                ) || null
            );
        },

        getSessionById(sessionId) {
            return (
                this.sessions.find(
                    (session) =>
                        session.id === sessionId
                ) || null
            );
        },

        searchSessions(query = "", filters = {}) {
            const normalizedQuery =
                this.normalizeText(query);

            return this.sessions
                .filter((session) => {
                    if (
                        filters.status &&
                        session.status !==
                            filters.status
                    ) {
                        return false;
                    }

                    if (
                        filters.office &&
                        !session.participants.some(
                            (participant) =>
                                participant.office ===
                                filters.office
                        )
                    ) {
                        return false;
                    }

                    if (!normalizedQuery) {
                        return true;
                    }

                    const searchable =
                        this.normalizeText(
                            [
                                session.title,
                                session.subject,
                                session.question,
                                session.description,
                                session.recommendation
                                    ?.rationale,
                                ...session.tags,
                                ...session.topics,
                                ...session.participants.flatMap(
                                    (participant) => [
                                        participant.name,
                                        participant.office,
                                        participant.role
                                    ]
                                ),
                                ...session.contributions.map(
                                    (contribution) =>
                                        contribution.content
                                ),
                                ...session.positions.flatMap(
                                    (position) => [
                                        position.stance,
                                        position.rationale,
                                        ...position.conditions,
                                        ...position.objections
                                    ]
                                )
                            ].join(" ")
                        );

                    return searchable.includes(
                        normalizedQuery
                    );
                })
                .map((session) =>
                    this.clone(session)
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
                "knowledge-system-executive-collaboration";
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
                    "MEOS Executive Collaboration Engine",
                summary:
                    "Universal structured cabinet collaboration with participants, positions, evidence, consensus, dissent, conditions, action items, and executive review.",
                content:
                    "Executive Collaboration coordinates documented office input and produces an explainable cabinet recommendation. It does not fabricate office opinions, autonomously approve decisions, spend money, communicate externally, or bypass executive authority.",
                tags: [
                    "meos-core",
                    "executive-collaboration",
                    "system-component"
                ],
                topics: [
                    "collaboration",
                    "cabinet",
                    "consensus",
                    "dissent",
                    "executive-review"
                ],
                authority: "system",
                confidence: 1,
                sensitivity: "internal",
                officeAccess: ["all"],
                metadata: {
                    componentVersion: this.version,
                    organizationNeutralCore: true,
                    brickBoundary:
                        "Structured collaboration only; no fabricated positions, autonomous approval, spending, or external communication."
                },
                createdBy: this.name
            });
        },

        recalculateAnalytics() {
            this.analytics.totalSessions =
                this.sessions.length;
            this.analytics.activeSessions =
                this.sessions.filter(
                    (session) =>
                        [
                            SESSION_STATUSES.COLLECTING,
                            SESSION_STATUSES.DELIBERATING
                        ].includes(session.status)
                ).length;
            this.analytics.completedSessions =
                this.sessions.filter(
                    (session) =>
                        session.status ===
                        SESSION_STATUSES.COMPLETE
                ).length;
            this.analytics.awaitingApproval =
                this.sessions.filter(
                    (session) =>
                        session.status ===
                        SESSION_STATUSES.AWAITING_APPROVAL
                ).length;
            this.analytics.strongConsensusCount =
                this.sessions.filter(
                    (session) =>
                        [
                            CONSENSUS_LEVELS.STRONG,
                            CONSENSUS_LEVELS.UNANIMOUS
                        ].includes(
                            session.consensus.level
                        )
                ).length;
            this.analytics.unresolvedConflictCount =
                this.sessions.reduce(
                    (total, session) =>
                        total +
                        session.disagreements.filter(
                            (item) =>
                                item.status === "unresolved"
                        ).length,
                    0
                );

            return this.analytics;
        },

        getConnectedSources() {
            return {
                executiveOffices:
                    Boolean(
                        global.MEOSExecutiveOffices ||
                        global.ExecutiveOffices ||
                        global.MEOS
                    ),
                institutionalReasoning:
                    Boolean(global.InstitutionalReasoning),
                executiveRecall:
                    Boolean(global.ExecutiveRecall),
                executiveDecision:
                    Boolean(global.ExecutiveDecision),
                executivePlanning:
                    Boolean(global.ExecutivePlanning),
                executiveWorkflow:
                    Boolean(global.ExecutiveWorkflow),
                knowledgeEngine:
                    Boolean(global.KnowledgeEngine)
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
                sessionCount:
                    this.sessions.length,
                analytics:
                    this.clone(this.analytics),
                initializedAt:
                    this.initializedAt
            };
        },

        exportCollaboration(options = {}) {
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
                    sessions:
                        this.sessions,
                    history:
                        options.includeHistory === false
                            ? []
                            : this.history,
                    analytics:
                        this.analytics
                }
            };
        },

        importCollaboration(payload, options = {}) {
            let data = payload;

            if (typeof payload === "string") {
                try {
                    data = JSON.parse(payload);
                } catch (error) {
                    return {
                        success: false,
                        error:
                            "The Executive Collaboration import is not valid JSON."
                    };
                }
            }

            if (!data || data.schema !== SCHEMA) {
                return {
                    success: false,
                    error:
                        "The import is not a MEOS Executive Collaboration package."
                };
            }

            if (options.replace === true) {
                this.sessions = [];
                this.history = [];
            }

            this.mergeById(
                this.sessions,
                data.sessions || []
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
                        "Executive Collaboration persistence is disabled."
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
                        this.exportCollaboration({
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
                    "[MEOS Executive Collaboration] Persistence failed:",
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
                    this.importCollaboration(
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
                    "[MEOS Executive Collaboration] Stored state could not be restored:",
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
                        "Clearing Executive Collaboration data requires { confirm: true }."
                };
            }

            this.sessions = [];
            this.history = [];
            this.analytics = {
                totalSessions: 0,
                activeSessions: 0,
                completedSessions: 0,
                awaitingApproval: 0,
                strongConsensusCount: 0,
                unresolvedConflictCount: 0,
                lastSessionAt: null
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
                id: this.createId("collaboration-history"),
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

            this.analytics.lastSessionAt =
                entry.timestamp;

            this.emit(
                "collaboration:history",
                this.clone(entry)
            );

            return entry;
        },

        normalizeStance(value) {
            const stance =
                String(value || "").toLowerCase();

            return Object.values(
                POSITION_STANCES
            ).includes(stance)
                ? stance
                : POSITION_STANCES
                    .INSUFFICIENT_INFORMATION;
        },

        normalizeConfidence(value) {
            const number = Number(value);

            if (!Number.isFinite(number)) {
                return 0.5;
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

        findRepeatedStrings(values = []) {
            const counts = new Map();

            values
                .map((value) =>
                    String(value || "").trim()
                )
                .filter(Boolean)
                .forEach((value) => {
                    const key =
                        this.normalizeText(value);

                    if (!counts.has(key)) {
                        counts.set(key, {
                            value,
                            count: 0
                        });
                    }

                    counts.get(key).count += 1;
                });

            return Array.from(counts.values())
                .filter((item) => item.count >= 2)
                .sort((a, b) => b.count - a.count);
        },

        mergeObjects(existing = [], incoming = [], prefix = "item") {
            const normalized = incoming.map((item) => {
                if (typeof item === "string") {
                    return {
                        id: this.createId(prefix),
                        title: item,
                        description: item
                    };
                }

                return {
                    id:
                        item.id ||
                        this.createId(prefix),
                    ...item
                };
            });

            return this.deduplicateObjects(
                [...existing, ...normalized],
                (item) =>
                    this.normalizeText(
                        item.title ||
                        item.description ||
                        JSON.stringify(item)
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
                        `[MEOS Executive Collaboration] Event listener failed for "${eventName}":`,
                        error
                    );
                }
            });
        }
    };

    ExecutiveCollaboration.SESSION_STATUSES =
        SESSION_STATUSES;
    ExecutiveCollaboration.POSITION_STANCES =
        POSITION_STANCES;
    ExecutiveCollaboration.CONSENSUS_LEVELS =
        CONSENSUS_LEVELS;

    global.ExecutiveCollaboration =
        ExecutiveCollaboration;
    ExecutiveCollaboration.initialize();
})(window);
