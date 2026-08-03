/*
 * Maddy Executive Operating System (MEOS)
 * Executive Build Portfolio Engine
 *
 * Version: 1.0.0
 * Build: EBP100-TAKE-IT-20260802-A
 *
 * Purpose:
 * - Convert leadership's "Take it" decision into a persistent organizational build.
 * - Track what leadership has decided to build, fund, acquire, launch, or become.
 * - Match new opportunities, assets, grants, partners, and resources to active builds.
 * - Coordinate office contributions without turning the portfolio into a noisy reminder list.
 *
 * Core distinction:
 * - Long-Term Strategy answers: Where are we going?
 * - Executive Build Portfolio answers: What have we decided to build to get there?
 *
 * Governance:
 * - Maddy may discover, analyze, recommend, and prepare a proposed build.
 * - Only human leadership may accept a proposed build into the active portfolio.
 * - "Take it" is the explicit leadership action that activates a build.
 * - External purchases, submissions, commitments, outreach, and expenditures remain
 *   subject to the applicable human approval rules.
 *
 * Persistence:
 * - v1.0 stores a browser cache so the engine is immediately operational.
 * - The engine exposes import/export and persistence-adapter hooks so the same records
 *   can be moved into durable server-side Executive Memory without redesigning the API.
 */

(function initializeExecutiveBuildPortfolio(global) {
    "use strict";

    const NAME = "MEOS Executive Build Portfolio";
    const VERSION = "1.0.0";
    const BUILD_ID = "EBP100-TAKE-IT-20260802-A";
    const SCHEMA = "meos.executive-build-portfolio.v1";
    const STORAGE_KEY = "meos.executive-build-portfolio.v1";

    const BUILD_STATUS = Object.freeze({
        PROPOSED: "proposed",
        ACCEPTED: "accepted",
        PLANNING: "planning",
        FUNDING: "funding",
        BUILDING: "building",
        BLOCKED: "blocked",
        PAUSED: "paused",
        READY: "ready",
        OPERATIONAL: "operational",
        COMPLETED: "completed",
        DECLINED: "declined",
        ARCHIVED: "archived"
    });

    const BUILD_PRIORITY = Object.freeze({
        CRITICAL: "critical",
        HIGH: "high",
        NORMAL: "normal",
        LOW: "low"
    });

    const PORTFOLIO_RELATIONSHIP = Object.freeze({
        DIRECT_RESOURCE: "direct-resource",
        FUNDING_MATCH: "funding-match",
        ASSET_MATCH: "asset-match",
        PARTNERSHIP_MATCH: "partnership-match",
        WORKFORCE_MATCH: "workforce-match",
        PROPERTY_MATCH: "property-match",
        READINESS_MATCH: "readiness-match",
        STRATEGIC_SIGNAL: "strategic-signal",
        NO_MATCH: "no-match"
    });

    const OFFICE_ROLES = Object.freeze({
        EXECUTIVE: "Executive Office",
        FUNDING: "Funding Office",
        OPPORTUNITY: "Opportunity Office",
        GRANT: "Grant Office",
        OPERATIONS: "Operations Office",
        FINANCE: "Finance Office",
        COMMUNITY_RELATIONS: "Community Relations Office",
        COMMUNICATIONS: "Communications Office",
        VOLUNTEER: "Volunteer Office",
        COMPLIANCE: "Compliance Office",
        HUMAN_RESOURCES: "Human Resources Office"
    });

    const DEFAULT_CONFIGURATION = Object.freeze({
        maximumBuilds: 500,
        maximumActivitiesPerBuild: 500,
        maximumMatchesPerBuild: 500,
        quietMonitoringEnabled: true,
        notifyOnlyOnMaterialChange: true,
        browserCacheEnabled: true
    });

    const state = {
        status: "initializing",
        initializedAt: null,
        configuration: { ...DEFAULT_CONFIGURATION },
        builds: [],
        listeners: Object.create(null),
        persistenceAdapter: null
    };

    function now() {
        return new Date().toISOString();
    }

    function clone(value) {
        if (value === undefined) return undefined;

        if (typeof global.structuredClone === "function") {
            try {
                return global.structuredClone(value);
            } catch (_error) {}
        }

        return JSON.parse(JSON.stringify(value));
    }

    function createId(prefix) {
        const random =
            global.crypto?.randomUUID?.() ||
            `${Date.now().toString(36)}-${Math.random()
                .toString(36)
                .slice(2, 10)}`;

        return `${prefix}-${random}`;
    }

    function normalizeText(value) {
        return String(value ?? "")
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9$%:/.,()\-]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function uniqueStrings(values) {
        if (!Array.isArray(values)) return [];

        return [
            ...new Set(
                values
                    .map(value => String(value || "").trim())
                    .filter(Boolean)
            )
        ];
    }

    function numeric(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function emit(eventName, detail) {
        const payload = clone(detail);

        state.listeners[eventName]?.forEach(handler => {
            try {
                handler(payload);
            } catch (error) {
                console.warn(
                    "[MEOS Executive Build Portfolio] Listener failed.",
                    error
                );
            }
        });

        if (
            typeof global.dispatchEvent === "function" &&
            typeof global.CustomEvent === "function"
        ) {
            global.dispatchEvent(
                new CustomEvent(
                    `meos:executive-build-portfolio:${eventName}`,
                    { detail: payload }
                )
            );
        }
    }

    function on(eventName, handler) {
        if (typeof handler !== "function") return () => {};

        if (!state.listeners[eventName]) {
            state.listeners[eventName] = new Set();
        }

        state.listeners[eventName].add(handler);

        return () => state.listeners[eventName]?.delete(handler);
    }

    function getLongTermStrategy() {
        return (
            global.CCSPLongTermStrategy ||
            global.MEOSOrganizationLongTermStrategy ||
            null
        );
    }

    function normalizeOfficeAssignments(input = []) {
        return (Array.isArray(input) ? input : [])
            .map(item => {
                if (typeof item === "string") {
                    return {
                        office: item,
                        role: "contributor",
                        status: "assigned",
                        assignedAt: now()
                    };
                }

                return {
                    office: String(item.office || "").trim(),
                    role: String(item.role || "contributor").trim(),
                    status: String(item.status || "assigned").trim(),
                    assignedAt: item.assignedAt || now(),
                    notes: String(item.notes || "").trim()
                };
            })
            .filter(item => item.office);
    }

    function normalizeMilestones(input = []) {
        return (Array.isArray(input) ? input : [])
            .map((item, index) => ({
                id: item.id || createId("build-milestone"),
                order: numeric(item.order, index + 1),
                name: String(item.name || `Milestone ${index + 1}`).trim(),
                description: String(item.description || "").trim(),
                status: String(item.status || "planned").trim(),
                targetDate: item.targetDate || null,
                completedAt: item.completedAt || null,
                blocking: item.blocking === true,
                dependencies: uniqueStrings(item.dependencies || []),
                evidence: Array.isArray(item.evidence)
                    ? clone(item.evidence)
                    : []
            }))
            .sort((left, right) => left.order - right.order);
    }

    function normalizeBuild(input = {}, existing = null) {
        const timestamp = now();
        const id = String(
            input.id || existing?.id || createId("executive-build")
        ).trim();
        const name = String(input.name || existing?.name || "").trim();

        if (!name) {
            throw new Error("An Executive Build requires a name.");
        }

        const status =
            input.status ||
            existing?.status ||
            BUILD_STATUS.PROPOSED;

        if (!Object.values(BUILD_STATUS).includes(status)) {
            throw new Error(`Unsupported Executive Build status: ${status}`);
        }

        const priority =
            input.priority ||
            existing?.priority ||
            BUILD_PRIORITY.NORMAL;

        if (!Object.values(BUILD_PRIORITY).includes(priority)) {
            throw new Error(`Unsupported Executive Build priority: ${priority}`);
        }

        return {
            ...existing,
            ...input,
            id,
            schema: "meos.executive-build.v1",
            type: "executive-build",
            name,
            description: String(
                input.description || existing?.description || ""
            ).trim(),
            purpose: String(
                input.purpose || existing?.purpose || ""
            ).trim(),
            status,
            priority,
            leadershipDecision:
                input.leadershipDecision ||
                existing?.leadershipDecision ||
                "pending",
            acceptedBy:
                input.acceptedBy || existing?.acceptedBy || null,
            acceptedAt:
                input.acceptedAt || existing?.acceptedAt || null,
            executiveSponsor:
                input.executiveSponsor ||
                existing?.executiveSponsor ||
                "Executive Director",
            strategyIds: uniqueStrings([
                ...(existing?.strategyIds || []),
                ...(input.strategyIds || [])
            ]),
            supportedPurposes: uniqueStrings([
                ...(existing?.supportedPurposes || []),
                ...(input.supportedPurposes || [])
            ]),
            supportedCapabilities: uniqueStrings([
                ...(existing?.supportedCapabilities || []),
                ...(input.supportedCapabilities || [])
            ]),
            geographicScope: uniqueStrings([
                ...(existing?.geographicScope || []),
                ...(input.geographicScope || [])
            ]),
            targetCompletionDate:
                input.targetCompletionDate ||
                existing?.targetCompletionDate ||
                null,
            estimatedCost:
                input.estimatedCost ??
                existing?.estimatedCost ??
                null,
            fundingSecured:
                numeric(
                    input.fundingSecured,
                    numeric(existing?.fundingSecured, 0)
                ),
            fundingNeeded:
                input.fundingNeeded ??
                existing?.fundingNeeded ??
                (
                    input.estimatedCost ??
                    existing?.estimatedCost ??
                    null
                ),
            requiredAssets: uniqueStrings([
                ...(existing?.requiredAssets || []),
                ...(input.requiredAssets || [])
            ]),
            requiredPartners: uniqueStrings([
                ...(existing?.requiredPartners || []),
                ...(input.requiredPartners || [])
            ]),
            requiredCapabilities: uniqueStrings([
                ...(existing?.requiredCapabilities || []),
                ...(input.requiredCapabilities || [])
            ]),
            blockingConditions: uniqueStrings([
                ...(existing?.blockingConditions || []),
                ...(input.blockingConditions || [])
            ]),
            monitoringTerms: uniqueStrings([
                ...(existing?.monitoringTerms || []),
                ...(input.monitoringTerms || []),
                name
            ]),
            offices: normalizeOfficeAssignments(
                input.offices || existing?.offices || []
            ),
            milestones: normalizeMilestones(
                input.milestones || existing?.milestones || []
            ),
            opportunityMatches: Array.isArray(
                input.opportunityMatches
            )
                ? clone(input.opportunityMatches)
                : clone(existing?.opportunityMatches || []),
            activity: Array.isArray(input.activity)
                ? clone(input.activity)
                : clone(existing?.activity || []),
            source: {
                ...(existing?.source || {}),
                ...(input.source || {})
            },
            createdAt: existing?.createdAt || input.createdAt || timestamp,
            updatedAt: timestamp
        };
    }

    function calculateReadiness(build) {
        const milestones = build.milestones || [];
        const completed = milestones.filter(
            milestone => milestone.status === "completed"
        ).length;
        const milestoneScore =
            milestones.length > 0
                ? (completed / milestones.length) * 50
                : 0;

        const blockers = build.blockingConditions || [];
        const blockerPenalty = Math.min(30, blockers.length * 5);

        const fundingTarget = numeric(
            build.estimatedCost ?? build.fundingNeeded,
            0
        );
        const fundingScore =
            fundingTarget > 0
                ? Math.min(
                    30,
                    (numeric(build.fundingSecured, 0) / fundingTarget) * 30
                )
                : 15;

        const assignmentScore = Math.min(
            20,
            (build.offices || []).length * 3
        );

        return Math.max(
            0,
            Math.min(
                100,
                Math.round(
                    milestoneScore +
                    fundingScore +
                    assignmentScore -
                    blockerPenalty
                )
            )
        );
    }

    function addActivity(build, activity) {
        build.activity = Array.isArray(build.activity)
            ? build.activity
            : [];

        build.activity.push({
            id: createId("build-activity"),
            occurredAt: now(),
            type: String(activity.type || "note"),
            office: String(
                activity.office || OFFICE_ROLES.EXECUTIVE
            ),
            summary: String(activity.summary || "").trim(),
            details: clone(activity.details || null),
            material: activity.material === true
        });

        if (
            build.activity.length >
            state.configuration.maximumActivitiesPerBuild
        ) {
            build.activity = build.activity.slice(
                -state.configuration.maximumActivitiesPerBuild
            );
        }
    }

    function proposeBuild(input = {}) {
        const strategy = getLongTermStrategy();
        let strategicContext = null;

        if (
            strategy?.findStrategicMatches &&
            input.opportunity
        ) {
            strategicContext =
                strategy.findStrategicMatches(input.opportunity);
        }

        const build = normalizeBuild({
            ...input,
            status: BUILD_STATUS.PROPOSED,
            leadershipDecision: "pending",
            strategyIds: uniqueStrings([
                ...(input.strategyIds || []),
                strategicContext?.strategyId
            ]),
            supportedPurposes: uniqueStrings([
                ...(input.supportedPurposes || []),
                ...(strategicContext?.purposeMatches || []).map(
                    match => match.id
                )
            ]),
            supportedCapabilities: uniqueStrings([
                ...(input.supportedCapabilities || []),
                ...(strategicContext?.capabilityMatches || []).map(
                    match => match.id
                )
            ]),
            source: {
                ...(input.source || {}),
                proposedAt: now(),
                strategicContext
            }
        });

        addActivity(build, {
            type: "build-proposed",
            summary:
                "Maddy prepared this build for leadership consideration.",
            material: true
        });

        state.builds.push(build);
        trimState();
        persist();
        emit("build-proposed", build);

        return {
            success: true,
            build: clone(withComputedFields(build))
        };
    }

    function acceptBuild(buildId, decision = {}) {
        const build = getBuildRecord(buildId);

        if (!build) {
            return {
                success: false,
                error: "Executive Build not found."
            };
        }

        build.status =
            decision.status || BUILD_STATUS.ACCEPTED;
        build.leadershipDecision = "take-it";
        build.acceptedBy =
            String(
                decision.acceptedBy ||
                decision.leader ||
                "Human Executive Authority"
            ).trim();
        build.acceptedAt = now();
        build.updatedAt = now();

        if (Array.isArray(decision.offices)) {
            build.offices = normalizeOfficeAssignments(
                decision.offices
            );
        }

        addActivity(build, {
            type: "take-it",
            office: OFFICE_ROLES.EXECUTIVE,
            summary:
                `${build.acceptedBy} accepted the challenge: "Take it."`,
            details: {
                command: "take-it",
                notes: decision.notes || ""
            },
            material: true
        });

        persist();
        emit("build-accepted", build);

        return {
            success: true,
            build: clone(withComputedFields(build))
        };
    }

    function createAndAcceptBuild(input = {}, decision = {}) {
        const proposed = proposeBuild(input);

        if (!proposed.success) return proposed;

        return acceptBuild(proposed.build.id, decision);
    }

    function getBuildRecord(buildId) {
        return state.builds.find(build => build.id === buildId) || null;
    }

    function getBuild(buildId) {
        const build = getBuildRecord(buildId);
        return build ? clone(withComputedFields(build)) : null;
    }

    function listBuilds(options = {}) {
        return state.builds
            .filter(
                build =>
                    !options.status ||
                    build.status === options.status
            )
            .filter(
                build =>
                    options.includeArchived ||
                    build.status !== BUILD_STATUS.ARCHIVED
            )
            .sort((left, right) => {
                const priorityOrder = {
                    critical: 4,
                    high: 3,
                    normal: 2,
                    low: 1
                };

                return (
                    (priorityOrder[right.priority] || 0) -
                        (priorityOrder[left.priority] || 0) ||
                    Date.parse(right.updatedAt) -
                        Date.parse(left.updatedAt)
                );
            })
            .map(build => clone(withComputedFields(build)));
    }

    function withComputedFields(build) {
        return {
            ...build,
            readinessScore: calculateReadiness(build),
            active:
                ![
                    BUILD_STATUS.COMPLETED,
                    BUILD_STATUS.DECLINED,
                    BUILD_STATUS.ARCHIVED
                ].includes(build.status),
            materialMatchCount: (build.opportunityMatches || [])
                .filter(match => match.material)
                .length
        };
    }

    function updateBuild(buildId, changes = {}) {
        const build = getBuildRecord(buildId);

        if (!build) {
            return {
                success: false,
                error: "Executive Build not found."
            };
        }

        const updated = normalizeBuild(changes, build);
        const index = state.builds.findIndex(
            item => item.id === buildId
        );

        addActivity(updated, {
            type: "build-updated",
            summary:
                changes.summary ||
                "The Executive Build record was updated.",
            material: changes.material === true
        });

        state.builds[index] = updated;
        persist();
        emit("build-updated", updated);

        return {
            success: true,
            build: clone(withComputedFields(updated))
        };
    }

    function addMilestone(buildId, milestone = {}) {
        const build = getBuildRecord(buildId);

        if (!build) {
            return {
                success: false,
                error: "Executive Build not found."
            };
        }

        const normalized = normalizeMilestones([
            {
                ...milestone,
                order:
                    milestone.order ||
                    build.milestones.length + 1
            }
        ])[0];

        build.milestones.push(normalized);
        build.milestones.sort(
            (left, right) => left.order - right.order
        );
        build.updatedAt = now();

        addActivity(build, {
            type: "milestone-added",
            summary: `Added milestone: ${normalized.name}`,
            details: normalized
        });

        persist();
        emit("milestone-added", {
            buildId,
            milestone: normalized
        });

        return {
            success: true,
            build: clone(withComputedFields(build)),
            milestone: clone(normalized)
        };
    }

    function updateMilestone(buildId, milestoneId, changes = {}) {
        const build = getBuildRecord(buildId);

        if (!build) {
            return {
                success: false,
                error: "Executive Build not found."
            };
        }

        const milestone = build.milestones.find(
            item => item.id === milestoneId
        );

        if (!milestone) {
            return {
                success: false,
                error: "Build milestone not found."
            };
        }

        Object.assign(milestone, changes);

        if (
            changes.status === "completed" &&
            !milestone.completedAt
        ) {
            milestone.completedAt = now();
        }

        build.updatedAt = now();

        addActivity(build, {
            type: "milestone-updated",
            summary:
                `Milestone updated: ${milestone.name}`,
            details: {
                milestoneId,
                changes
            },
            material: changes.status === "completed"
        });

        persist();
        emit("milestone-updated", {
            buildId,
            milestone
        });

        return {
            success: true,
            build: clone(withComputedFields(build)),
            milestone: clone(milestone)
        };
    }

    function assignOffice(buildId, assignment = {}) {
        const build = getBuildRecord(buildId);

        if (!build) {
            return {
                success: false,
                error: "Executive Build not found."
            };
        }

        const office = String(assignment.office || "").trim();

        if (!office) {
            return {
                success: false,
                error: "An office name is required."
            };
        }

        const existing = build.offices.find(
            item => item.office === office
        );

        const normalized = normalizeOfficeAssignments([
            assignment
        ])[0];

        if (existing) {
            Object.assign(existing, normalized);
        } else {
            build.offices.push(normalized);
        }

        build.updatedAt = now();

        addActivity(build, {
            type: "office-assigned",
            summary: `${office} assigned to ${build.name}.`,
            details: normalized,
            material: true
        });

        persist();
        emit("office-assigned", {
            buildId,
            assignment: normalized
        });

        return {
            success: true,
            build: clone(withComputedFields(build))
        };
    }

    function classifyOpportunityRelationship(
        build,
        opportunity = {}
    ) {
        const text = normalizeText(
            [
                opportunity.title,
                opportunity.description,
                opportunity.statedPurpose,
                opportunity.desiredOutcomes,
                opportunity.fundingAreas,
                opportunity.provider,
                opportunity.geography,
                opportunity.assetType,
                opportunity.category,
                opportunity.tags
            ]
                .flat(Infinity)
                .filter(Boolean)
                .join(" ")
        );

        const terms = uniqueStrings([
            build.name,
            build.description,
            build.purpose,
            ...build.monitoringTerms,
            ...build.requiredAssets,
            ...build.requiredPartners,
            ...build.requiredCapabilities,
            ...build.geographicScope
        ])
            .flatMap(value =>
                normalizeText(value)
                    .split(" ")
                    .filter(term => term.length >= 4)
            );

        const matchedTerms = uniqueStrings(
            terms.filter(term => text.includes(term))
        );

        const awardAmount = numeric(
            opportunity.awardAmount ||
            opportunity.price ||
            opportunity.value,
            0
        );

        let relationship = PORTFOLIO_RELATIONSHIP.NO_MATCH;

        if (
            /grant|funding|award|foundation|sponsor/.test(text) &&
            matchedTerms.length > 0
        ) {
            relationship = PORTFOLIO_RELATIONSHIP.FUNDING_MATCH;
        } else if (
            /trailer|vehicle|equipment|shower|container|property|land|building/.test(
                text
            ) &&
            matchedTerms.length > 0
        ) {
            relationship = /property|land|building/.test(text)
                ? PORTFOLIO_RELATIONSHIP.PROPERTY_MATCH
                : PORTFOLIO_RELATIONSHIP.ASSET_MATCH;
        } else if (
            /partner|coalition|collaboration|mou|university|hospital|county/.test(
                text
            ) &&
            matchedTerms.length > 0
        ) {
            relationship =
                PORTFOLIO_RELATIONSHIP.PARTNERSHIP_MATCH;
        } else if (
            /volunteer|staff|workforce|training|instructor|clinician/.test(
                text
            ) &&
            matchedTerms.length > 0
        ) {
            relationship =
                PORTFOLIO_RELATIONSHIP.WORKFORCE_MATCH;
        } else if (matchedTerms.length > 0) {
            relationship =
                PORTFOLIO_RELATIONSHIP.DIRECT_RESOURCE;
        } else if (awardAmount >= 1_000_000) {
            relationship =
                PORTFOLIO_RELATIONSHIP.STRATEGIC_SIGNAL;
        }

        const score = Math.min(
            100,
            matchedTerms.length * 12 +
            (awardAmount >= 1_000_000 ? 20 : 0) +
            (relationship !==
            PORTFOLIO_RELATIONSHIP.NO_MATCH
                ? 20
                : 0)
        );

        return {
            relationship,
            score,
            matchedTerms,
            material:
                score >= 50 ||
                awardAmount >= 1_000_000,
            opportunityValue: awardAmount
        };
    }

    function matchOpportunity(opportunity = {}, options = {}) {
        const activeBuilds = state.builds.filter(build =>
            ![
                BUILD_STATUS.PROPOSED,
                BUILD_STATUS.DECLINED,
                BUILD_STATUS.COMPLETED,
                BUILD_STATUS.ARCHIVED
            ].includes(build.status)
        );

        const matches = activeBuilds
            .map(build => {
                const analysis =
                    classifyOpportunityRelationship(
                        build,
                        opportunity
                    );

                return {
                    id: createId("build-match"),
                    buildId: build.id,
                    buildName: build.name,
                    opportunityId:
                        opportunity.id || null,
                    opportunityTitle:
                        opportunity.title ||
                        opportunity.name ||
                        "Untitled opportunity",
                    matchedAt: now(),
                    ...analysis,
                    source: clone(opportunity.source || null)
                };
            })
            .filter(
                match =>
                    match.relationship !==
                    PORTFOLIO_RELATIONSHIP.NO_MATCH ||
                    options.includeNoMatch
            )
            .sort((left, right) => right.score - left.score);

        if (options.record !== false) {
            matches.forEach(match => {
                const build = getBuildRecord(match.buildId);
                if (!build) return;

                build.opportunityMatches =
                    Array.isArray(build.opportunityMatches)
                        ? build.opportunityMatches
                        : [];

                const duplicate =
                    build.opportunityMatches.find(
                        item =>
                            item.opportunityId &&
                            item.opportunityId ===
                                match.opportunityId
                    );

                if (duplicate) {
                    Object.assign(duplicate, match);
                } else {
                    build.opportunityMatches.push(match);
                }

                if (
                    build.opportunityMatches.length >
                    state.configuration.maximumMatchesPerBuild
                ) {
                    build.opportunityMatches =
                        build.opportunityMatches.slice(
                            -state.configuration.maximumMatchesPerBuild
                        );
                }

                if (match.material) {
                    addActivity(build, {
                        type: "material-opportunity-match",
                        office: OFFICE_ROLES.OPPORTUNITY,
                        summary:
                            `${match.opportunityTitle} may advance ${build.name}.`,
                        details: match,
                        material: true
                    });
                }

                build.updatedAt = now();
            });

            persist();
        }

        emit("opportunity-matched", {
            opportunity,
            matches
        });

        return {
            success: true,
            opportunity: clone(opportunity),
            matches: clone(matches),
            bestMatch: clone(matches[0] || null)
        };
    }

    function getQuietWatchList() {
        return state.builds
            .filter(build =>
                ![
                    BUILD_STATUS.PROPOSED,
                    BUILD_STATUS.DECLINED,
                    BUILD_STATUS.COMPLETED,
                    BUILD_STATUS.ARCHIVED
                ].includes(build.status)
            )
            .map(build => ({
                buildId: build.id,
                buildName: build.name,
                status: build.status,
                monitoringTerms: clone(build.monitoringTerms),
                targetCompletionDate:
                    build.targetCompletionDate,
                readinessScore: calculateReadiness(build),
                notifyOnlyOnMaterialChange:
                    state.configuration
                        .notifyOnlyOnMaterialChange
            }));
    }

    function getExecutiveBriefing() {
        const builds = listBuilds({
            includeArchived: false
        });
        const activeBuilds = builds.filter(
            build => build.active
        );
        const materialMatches = activeBuilds
            .flatMap(build =>
                (build.opportunityMatches || [])
                    .filter(match => match.material)
                    .map(match => ({
                        ...match,
                        buildName: build.name
                    }))
            )
            .sort(
                (left, right) =>
                    Date.parse(right.matchedAt) -
                    Date.parse(left.matchedAt)
            );

        return {
            schema:
                "meos.executive-build-portfolio.briefing.v1",
            generatedAt: now(),
            totals: {
                builds: builds.length,
                activeBuilds: activeBuilds.length,
                proposedBuilds: builds.filter(
                    build =>
                        build.status ===
                        BUILD_STATUS.PROPOSED
                ).length,
                blockedBuilds: builds.filter(
                    build =>
                        build.status ===
                        BUILD_STATUS.BLOCKED
                ).length,
                materialMatches: materialMatches.length
            },
            priorityBuilds: activeBuilds
                .filter(build =>
                    [
                        BUILD_PRIORITY.CRITICAL,
                        BUILD_PRIORITY.HIGH
                    ].includes(build.priority)
                )
                .slice(0, 10),
            recentMaterialMatches:
                materialMatches.slice(0, 20),
            quietMonitoring:
                state.configuration.quietMonitoringEnabled
        };
    }

    function configure(options = {}) {
        state.configuration = {
            ...state.configuration,
            ...options
        };

        persist();

        return getStatus();
    }

    function setPersistenceAdapter(adapter) {
        if (
            adapter !== null &&
            (
                typeof adapter !== "object" ||
                typeof adapter.save !== "function"
            )
        ) {
            throw new TypeError(
                "Persistence adapter requires a save(state) function."
            );
        }

        state.persistenceAdapter = adapter;

        return {
            success: true,
            connected: Boolean(adapter)
        };
    }

    function exportState() {
        return {
            schema: SCHEMA,
            version: VERSION,
            buildId: BUILD_ID,
            exportedAt: now(),
            configuration: clone(state.configuration),
            builds: clone(state.builds)
        };
    }

    async function persist() {
        trimState();

        const payload = exportState();
        let browserCached = false;
        let durablePersisted = false;
        let durableError = null;

        if (
            state.configuration.browserCacheEnabled &&
            global.localStorage
        ) {
            try {
                global.localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(payload)
                );
                browserCached = true;
            } catch (error) {
                console.warn(
                    "[MEOS Executive Build Portfolio] Browser cache failed.",
                    error
                );
            }
        }

        if (state.persistenceAdapter?.save) {
            try {
                await state.persistenceAdapter.save(payload);
                durablePersisted = true;
            } catch (error) {
                durableError = error?.message || String(error);
                console.warn(
                    "[MEOS Executive Build Portfolio] Durable persistence failed.",
                    error
                );
            }
        }

        return {
            success:
                browserCached ||
                durablePersisted,
            browserCached,
            durablePersisted,
            durableError
        };
    }

    function restoreBrowserCache() {
        if (!global.localStorage) {
            return {
                success: false,
                restored: false
            };
        }

        try {
            const raw =
                global.localStorage.getItem(STORAGE_KEY);

            if (!raw) {
                return {
                    success: true,
                    restored: false
                };
            }

            const saved = JSON.parse(raw);

            if (saved?.schema !== SCHEMA) {
                return {
                    success: false,
                    restored: false,
                    error: "Unsupported Executive Build Portfolio schema."
                };
            }

            state.configuration = {
                ...DEFAULT_CONFIGURATION,
                ...(saved.configuration || {})
            };

            state.builds = Array.isArray(saved.builds)
                ? saved.builds.map(build =>
                    normalizeBuild(build, build)
                )
                : [];

            return {
                success: true,
                restored: true,
                buildCount: state.builds.length
            };
        } catch (error) {
            return {
                success: false,
                restored: false,
                error: error.message
            };
        }
    }

    function importState(payload, options = {}) {
        if (payload?.schema !== SCHEMA) {
            return {
                success: false,
                error: "Unsupported Executive Build Portfolio schema."
            };
        }

        const incoming = Array.isArray(payload.builds)
            ? payload.builds
            : [];

        if (options.replace === true) {
            state.builds = [];
        }

        incoming.forEach(build => {
            const existing = getBuildRecord(build.id);
            const normalized = normalizeBuild(build, existing);

            if (existing) {
                const index = state.builds.findIndex(
                    item => item.id === build.id
                );
                state.builds[index] = normalized;
            } else {
                state.builds.push(normalized);
            }
        });

        persist();
        emit("state-imported", {
            importedBuilds: incoming.length
        });

        return {
            success: true,
            importedBuilds: incoming.length,
            totalBuilds: state.builds.length
        };
    }

    function trimState() {
        if (
            state.builds.length >
            state.configuration.maximumBuilds
        ) {
            state.builds = state.builds
                .sort(
                    (left, right) =>
                        Date.parse(right.updatedAt) -
                        Date.parse(left.updatedAt)
                )
                .slice(
                    0,
                    state.configuration.maximumBuilds
                );
        }
    }

    function clearState() {
        state.builds = [];

        if (global.localStorage) {
            global.localStorage.removeItem(STORAGE_KEY);
        }

        emit("state-cleared", {
            clearedAt: now()
        });

        return {
            success: true
        };
    }

    function getStatus() {
        return {
            name: NAME,
            version: VERSION,
            buildId: BUILD_ID,
            schema: SCHEMA,
            status: state.status,
            initializedAt: state.initializedAt,
            buildCount: state.builds.length,
            activeBuildCount: state.builds.filter(build =>
                ![
                    BUILD_STATUS.PROPOSED,
                    BUILD_STATUS.DECLINED,
                    BUILD_STATUS.COMPLETED,
                    BUILD_STATUS.ARCHIVED
                ].includes(build.status)
            ).length,
            proposedBuildCount: state.builds.filter(
                build =>
                    build.status ===
                    BUILD_STATUS.PROPOSED
            ).length,
            strategyConnected: Boolean(
                getLongTermStrategy()
            ),
            durablePersistenceConnected: Boolean(
                state.persistenceAdapter
            ),
            browserCacheEnabled:
                state.configuration.browserCacheEnabled,
            quietMonitoringEnabled:
                state.configuration
                    .quietMonitoringEnabled,
            configuration: clone(state.configuration)
        };
    }

    function runSelfTest() {
        const testName =
            "SELF TEST — Monterey Mobile Hygiene Unit";

        const existing = state.builds.find(
            build => build.name === testName
        );

        if (existing) {
            state.builds = state.builds.filter(
                build => build.id !== existing.id
            );
        }

        const accepted = createAndAcceptBuild(
            {
                name: testName,
                description:
                    "Acquire and commission an additional mobile shower unit for Monterey-area expansion.",
                purpose:
                    "Expand mobile hygiene capacity and regional reach.",
                priority: BUILD_PRIORITY.HIGH,
                estimatedCost: 75000,
                geographicScope: [
                    "Monterey County",
                    "Central Coast"
                ],
                monitoringTerms: [
                    "mobile shower trailer",
                    "shower shuttle",
                    "hygiene trailer",
                    "used shower trailer"
                ],
                requiredAssets: [
                    "mobile shower trailer",
                    "tow vehicle"
                ],
                offices: [
                    OFFICE_ROLES.FUNDING,
                    OFFICE_ROLES.OPERATIONS,
                    OFFICE_ROLES.COMMUNITY_RELATIONS
                ]
            },
            {
                acceptedBy: "Self Test Executive",
                notes: "Take it."
            }
        );

        const match = matchOpportunity(
            {
                id: "self-test-craigslist-shower-trailer",
                title:
                    "Used eight-station mobile shower trailer",
                description:
                    "Operational shower trailer available in Monterey County.",
                category: "equipment",
                price: 42000,
                geography: "Monterey County"
            },
            {
                record: true
            }
        );

        const checks = [
            {
                name: "Build created and accepted",
                passed:
                    accepted.success &&
                    accepted.build.leadershipDecision ===
                        "take-it"
            },
            {
                name: "Active portfolio contains build",
                passed: Boolean(
                    getBuild(accepted.build.id)?.active
                )
            },
            {
                name: "Asset matched to active build",
                passed:
                    match.matches.some(
                        item =>
                            item.buildId ===
                                accepted.build.id &&
                            item.relationship ===
                                PORTFOLIO_RELATIONSHIP.ASSET_MATCH
                    )
            },
            {
                name: "Quiet watch list contains build",
                passed:
                    getQuietWatchList().some(
                        item =>
                            item.buildId ===
                            accepted.build.id
                    )
            }
        ];

        return {
            success: checks.every(check => check.passed),
            checks,
            build: getBuild(accepted.build.id),
            match,
            status: getStatus()
        };
    }

    restoreBrowserCache();

    const api = Object.freeze({
        name: NAME,
        version: VERSION,
        buildId: BUILD_ID,
        schema: SCHEMA,
        BUILD_STATUS,
        BUILD_PRIORITY,
        PORTFOLIO_RELATIONSHIP,
        OFFICE_ROLES,
        configure,
        proposeBuild,
        acceptBuild,
        createAndAcceptBuild,
        updateBuild,
        getBuild,
        listBuilds,
        addMilestone,
        updateMilestone,
        assignOffice,
        matchOpportunity,
        getQuietWatchList,
        getExecutiveBriefing,
        setPersistenceAdapter,
        exportState,
        importState,
        clearState,
        getStatus,
        runSelfTest,
        on
    });

    global.ExecutiveBuildPortfolio = api;
    global.MEOSExecutiveBuildPortfolio = api;

    state.initializedAt = now();
    state.status = "online";

    console.info(
        `[MEOS] ${NAME} v${VERSION} online. Build ${BUILD_ID}.`,
        getStatus()
    );

    emit("online", getStatus());
})(window);
