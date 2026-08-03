/*
 * Maddy Executive Operating System (MEOS)
 * CCSP Long-Term Strategy Package
 *
 * Version: 1.0.0
 * Build: CCLTS100-STRATEGIC-NAVIGATION-20260802-A
 *
 * Purpose:
 * - Preserve CCSP's long-term strategy as structured, queryable organizational data.
 * - Give MEOS offices a shared strategic destination beyond current-day programs.
 * - Help offices recognize opportunities that advance CCSP's future capabilities.
 * - Prevent rigid keyword matching from discarding strategically valuable opportunities.
 *
 * Architecture:
 * - This is an Organization Package file, not part of the universal MEOS Core.
 * - It contains CCSP-specific purposes, trajectory, phases, dependencies, and opportunity lenses.
 * - MEOS Core and executive offices may read this package through the public API below.
 *
 * Evidence status:
 * - This file encodes leadership strategy supplied to MEOS.
 * - Timelines, costs, revenue projections, legal interpretations, engineering assumptions,
 *   property descriptions, and regulatory estimates remain planning assertions until
 *   independently verified by qualified professionals and authoritative sources.
 */

(function initializeCCSPLongTermStrategy(global) {
    "use strict";

    const NAME = "CCSP Long-Term Strategy";
    const VERSION = "1.0.0";
    const BUILD_ID = "CCLTS100-STRATEGIC-NAVIGATION-20260802-A";
    const SCHEMA = "meos.organization.long-term-strategy.v1";
    const ORGANIZATION_ID = "california-clean-slate-program";
    const STORAGE_KEY = "meos.ccsp.long-term-strategy.v1";

    const MILESTONE_STATUS = Object.freeze({
        PLANNED: "planned",
        IN_PROGRESS: "in-progress",
        BLOCKED: "blocked",
        COMPLETED: "completed",
        DEFERRED: "deferred"
    });

    const OPPORTUNITY_RELATIONSHIPS = Object.freeze({
        DIRECT_FIT: "direct-fit",
        STRATEGIC_FIT: "strategic-fit",
        ADAPTIVE_FIT: "adaptive-fit",
        MONITOR: "monitor",
        HUMAN_REVIEW: "human-review",
        CONFLICT: "conflict",
        UNKNOWN: "unknown"
    });

    const BASE_STRATEGY = {
        id: "ccsp-long-term-strategy-2026",
        schema: SCHEMA,
        organizationId: ORGANIZATION_ID,
        name: NAME,
        version: VERSION,
        buildId: BUILD_ID,
        status: "active",
        commissionedAt: "2026-08-02T00:00:00.000Z",

        executiveDestination: {
            statement:
                "Build and operate a complete Streets to Sheets continuum that moves people from street-level crisis through hygiene, stabilization, recovery, treatment, housing, work, and durable self-sufficiency.",
            operatingPrinciple:
                "Evaluate opportunities by whether they move CCSP toward its long-term purposes and destination, not only by whether they match today's programs.",
            commitment:
                "Preserve strategically valuable possibilities, surface required adaptations, and return uncertain or transformational opportunities for human review rather than silently discarding them."
        },

        purposes: [
            { id: "purpose-human-dignity", name: "Human dignity and immediate relief", description: "Provide mobile hygiene and street-level services that create trust, safety, and an entry point into care.", weight: 10 },
            { id: "purpose-community-stabilization", name: "Community stabilization", description: "Help people move from crisis toward treatment, housing, employment, and long-term stability.", weight: 10 },
            { id: "purpose-recovery-navigation", name: "Recovery navigation and substance-use recovery", description: "Connect and support people through treatment, peer support, recovery services, and sustained recovery pathways.", weight: 10 },
            { id: "purpose-residential-treatment", name: "Residential substance-use treatment capacity", description: "Develop and operate licensed residential SUD treatment capacity as part of the long-term continuum.", weight: 10, futureCapability: true },
            { id: "purpose-supportive-residential-community", name: "Supportive residential community", description: "Develop transitional, recuperative, sober-living, and supportive residential capacity.", weight: 10, futureCapability: true },
            { id: "purpose-permanent-housing", name: "Permanent housing and self-sufficiency", description: "Create pathways to permanent independent housing and durable self-sufficiency.", weight: 10, futureCapability: true },
            { id: "purpose-workforce-development", name: "Workforce and trade-skills development", description: "Build practical work skills, employment pathways, trade training, and productive work opportunities that support stabilization.", weight: 9, futureCapability: true },
            { id: "purpose-environmental-stewardship", name: "Watershed and environmental stewardship", description: "Reduce encampment-related environmental harm and protect local waterways and the Monterey Bay sanctuary.", weight: 8 },
            { id: "purpose-institutional-sustainability", name: "Institutional sustainability", description: "Develop durable funding, earned revenue, partnerships, infrastructure, and organizational capacity.", weight: 9 }
        ],

        continuum: [
            { order: 1, id: "continuum-outreach", name: "Street outreach and hygiene", status: "current" },
            { order: 2, id: "continuum-stabilization", name: "Community stabilization and navigation", status: "current" },
            { order: 3, id: "continuum-recovery", name: "Treatment and recovery", status: "strategic" },
            { order: 4, id: "continuum-residential", name: "Supportive residential and sober-living environments", status: "strategic" },
            { order: 5, id: "continuum-workforce", name: "Workforce and trade-skills development", status: "strategic" },
            { order: 6, id: "continuum-employment", name: "Employment and earned stability", status: "strategic" },
            { order: 7, id: "continuum-housing", name: "Permanent independent housing and self-sufficiency", status: "strategic" }
        ],

        strategicCapabilities: [
            { id: "capability-land-control", name: "Long-term site control", description: "Secure suitable rural or agricultural property through acquisition, lease, lease-option, partnership, or another viable structure.", priority: 100 },
            { id: "capability-modular-campus", name: "Modular residential campus", description: "Develop modular residential, hygiene, utility, and program infrastructure.", priority: 98 },
            { id: "capability-sud-licensing", name: "Licensed residential SUD treatment", description: "Develop qualified clinical operations and obtain applicable California licensing and credentialing.", priority: 100 },
            { id: "capability-cal-aim", name: "Medi-Cal and CalAIM participation", description: "Build reimbursement and managed-care contracting capacity where applicable.", priority: 95 },
            { id: "capability-workshop", name: "Trade-skills workshop", description: "Operate practical training in welding, equipment, agricultural mechanics, and related workforce skills.", priority: 88 },
            { id: "capability-equine", name: "Equine-assisted programming", description: "Evaluate and develop appropriate equine-assisted recovery or stabilization programming.", priority: 70 },
            { id: "capability-housing", name: "Supportive and permanent housing", description: "Build or partner into transitional, sober-living, recuperative, supportive, and permanent housing pathways.", priority: 100 }
        ],

        phases: [
            { id: "phase-1-foundation-and-control", order: 1, name: "Institutional foundation and site control", objective: "Maintain organizational compliance, secure funding, establish partnerships, and obtain viable land or site control.", status: MILESTONE_STATUS.IN_PROGRESS },
            { id: "phase-2-design-permitting-procurement", order: 2, name: "Design, permitting, and procurement", objective: "Complete verified site feasibility, professional design, permitting, utilities, modular procurement, and regulatory planning.", status: MILESTONE_STATUS.PLANNED },
            { id: "phase-3-site-buildout", order: 3, name: "Site preparation and modular buildout", objective: "Prepare the site, install utilities and foundations, deliver modular units, and establish workshop and program infrastructure.", status: MILESTONE_STATUS.PLANNED },
            { id: "phase-4-licensing-and-contracting", order: 4, name: "Licensing, credentialing, and contracting", objective: "Obtain applicable SUD treatment licensing, build clinical policies, hire qualified staff, and complete payer or managed-care contracting.", status: MILESTONE_STATUS.PLANNED },
            { id: "phase-5-open-and-expand", order: 5, name: "Open, operate, learn, and expand", objective: "Begin services, operate sustainably, measure outcomes, strengthen the continuum, and expand housing, workforce, and treatment capacity.", status: MILESTONE_STATUS.PLANNED }
        ],

        knownDependencies: [
            { id: "dependency-site-control", name: "Site control", type: "property" },
            { id: "dependency-professional-design", name: "Licensed professional design and review", type: "professional" },
            { id: "dependency-local-approvals", name: "Local land-use and environmental approvals", type: "government" },
            { id: "dependency-state-licensing", name: "State licensing and inspections", type: "government" },
            { id: "dependency-capital", name: "Capital and operating funding", type: "financial" },
            { id: "dependency-partners", name: "Strategic and clinical partners", type: "relationship" }
        ],

        sourceDocument: {
            title: "WARP SPEED EXECUTION 5YR PLAN IN 2",
            role: "leadership-supplied-long-term-strategy",
            evidenceClass: "strategic-plan-unverified",
            warning:
                "The source includes projections and assertions that require legal, regulatory, engineering, tax, financial, property, and program verification before reliance or execution."
        }
    };

    const state = {
        status: "initializing",
        initializedAt: null,
        strategy: null
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

    function normalizeText(value) {
        return String(value ?? "")
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function persist() {
        if (!global.localStorage || !state.strategy) {
            return { success: false, persisted: false };
        }

        try {
            global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.strategy));
            return { success: true, persisted: true };
        } catch (error) {
            return { success: false, persisted: false, error: error.message };
        }
    }

    function restore() {
        if (!global.localStorage) return null;

        try {
            const raw = global.localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed?.schema === SCHEMA ? parsed : null;
        } catch (_error) {
            return null;
        }
    }

    function getStrategy() {
        return clone(state.strategy);
    }

    function getCurrentPhase() {
        return clone(
            state.strategy.phases.find(
                phase => phase.status === MILESTONE_STATUS.IN_PROGRESS
            ) || null
        );
    }

    function findStrategicMatches(input = {}) {
        const text = normalizeText(
            [
                input.title,
                input.description,
                input.statedPurpose,
                input.desiredOutcomes,
                input.fundingAreas,
                input.targetPopulations,
                input.geography,
                input.provider
            ]
                .flat(Infinity)
                .filter(Boolean)
                .join(" ")
        );

        const purposeMatches = state.strategy.purposes
            .map(purpose => {
                const terms = normalizeText(
                    `${purpose.name} ${purpose.description}`
                )
                    .split(" ")
                    .filter(term => term.length >= 4);

                const matchedTerms = [...new Set(
                    terms.filter(term => text.includes(term))
                )];

                return {
                    id: purpose.id,
                    name: purpose.name,
                    weight: purpose.weight,
                    futureCapability: Boolean(purpose.futureCapability),
                    matchedTerms,
                    score: Math.min(
                        100,
                        matchedTerms.length * 12 + purpose.weight * 2
                    )
                };
            })
            .filter(match => match.matchedTerms.length > 0)
            .sort((left, right) => right.score - left.score);

        const capabilityMatches = state.strategy.strategicCapabilities
            .map(capability => {
                const terms = normalizeText(
                    `${capability.name} ${capability.description}`
                )
                    .split(" ")
                    .filter(term => term.length >= 4);

                const matchedTerms = [...new Set(
                    terms.filter(term => text.includes(term))
                )];

                return {
                    id: capability.id,
                    name: capability.name,
                    priority: capability.priority,
                    matchedTerms,
                    score: Math.min(
                        100,
                        matchedTerms.length * 12 +
                            Math.round(capability.priority / 5)
                    )
                };
            })
            .filter(match => match.matchedTerms.length > 0)
            .sort((left, right) => right.score - left.score);

        const strategicSignalScore = Math.min(
            100,
            purposeMatches.length * 20 +
                capabilityMatches.length * 25
        );

        return {
            schema: "meos.organization.long-term-strategy.matches.v1",
            strategyId: state.strategy.id,
            evaluatedAt: now(),
            purposeMatches,
            capabilityMatches,
            strategicSignalScore,
            requiresExecutiveReasoning:
                strategicSignalScore > 0 ||
                Number(input.awardAmount || 0) >= 1_000_000
        };
    }

    function recommendOpportunityRelationship(input = {}) {
        const matches = findStrategicMatches(input);
        const lifecycle = String(input.lifecycle || "").toLowerCase();
        const awardAmount = Number(input.awardAmount || 0);
        const isComingSoon = [
            "coming-soon",
            "pre-announcement",
            "forecasted",
            "expected"
        ].includes(lifecycle);
        const isClosed = lifecycle.includes("closed");
        const transformational = awardAmount >= 1_000_000;

        let relationship = OPPORTUNITY_RELATIONSHIPS.UNKNOWN;
        const reasons = [];

        if (isComingSoon || isClosed) {
            relationship = OPPORTUNITY_RELATIONSHIPS.MONITOR;
            reasons.push(
                "The opportunity is not currently actionable but should remain visible and be revisited."
            );
        }

        if (matches.strategicSignalScore >= 65) {
            relationship = OPPORTUNITY_RELATIONSHIPS.STRATEGIC_FIT;
            reasons.push(
                "The opportunity strongly advances CCSP's long-term purposes or strategic capabilities."
            );
        } else if (matches.strategicSignalScore >= 30) {
            relationship = OPPORTUNITY_RELATIONSHIPS.ADAPTIVE_FIT;
            reasons.push(
                "The opportunity may justify adaptation, partnership, licensing, staffing, or capability development."
            );
        }

        if (
            transformational &&
            relationship === OPPORTUNITY_RELATIONSHIPS.UNKNOWN
        ) {
            relationship = OPPORTUNITY_RELATIONSHIPS.HUMAN_REVIEW;
            reasons.push(
                "The scale of the opportunity justifies human strategic review even though automated alignment is uncertain."
            );
        }

        return {
            schema:
                "meos.organization.long-term-strategy.opportunity-relationship.v1",
            strategyId: state.strategy.id,
            evaluatedAt: now(),
            relationship,
            reasons,
            matches,
            preserveForReview:
                relationship !== OPPORTUNITY_RELATIONSHIPS.CONFLICT,
            humanDecisionRequired: [
                OPPORTUNITY_RELATIONSHIPS.ADAPTIVE_FIT,
                OPPORTUNITY_RELATIONSHIPS.HUMAN_REVIEW
            ].includes(relationship)
        };
    }

    function getStatus() {
        return {
            name: NAME,
            version: VERSION,
            buildId: BUILD_ID,
            schema: SCHEMA,
            organizationId: ORGANIZATION_ID,
            status: state.status,
            initializedAt: state.initializedAt,
            strategyId: state.strategy?.id || null,
            purposeCount: state.strategy?.purposes?.length || 0,
            continuumStageCount: state.strategy?.continuum?.length || 0,
            capabilityCount:
                state.strategy?.strategicCapabilities?.length || 0,
            phaseCount: state.strategy?.phases?.length || 0,
            currentPhase: getCurrentPhase(),
            evidenceStatus:
                state.strategy?.sourceDocument?.evidenceClass ||
                "unknown"
        };
    }

    function runSelfTest() {
        const sample = recommendOpportunityRelationship({
            title:
                "Ten million dollars to open a residential substance-use treatment facility in Santa Cruz County",
            description:
                "Capital and startup support for a licensed residential treatment campus serving people experiencing homelessness and substance-use disorders.",
            awardAmount: 10_000_000,
            lifecycle: "open",
            geography: "Santa Cruz County, California"
        });

        const checks = [
            {
                name: "Strategy package loaded",
                passed: Boolean(state.strategy?.id)
            },
            {
                name: "Purposes available",
                passed: state.strategy.purposes.length > 0
            },
            {
                name: "Continuum available",
                passed: state.strategy.continuum.length > 0
            },
            {
                name: "Strategic capabilities available",
                passed:
                    state.strategy.strategicCapabilities.length > 0
            },
            {
                name: "Treatment opportunity preserved strategically",
                passed:
                    sample.relationship !==
                    OPPORTUNITY_RELATIONSHIPS.CONFLICT
            }
        ];

        return {
            success: checks.every(check => check.passed),
            checks,
            sample,
            status: getStatus()
        };
    }

    state.strategy = restore() || clone(BASE_STRATEGY);
    state.strategy.updatedAt = state.strategy.updatedAt || now();
    state.initializedAt = now();
    state.status = "online";
    persist();

    const api = Object.freeze({
        name: NAME,
        version: VERSION,
        buildId: BUILD_ID,
        schema: SCHEMA,
        MILESTONE_STATUS,
        OPPORTUNITY_RELATIONSHIPS,
        getStrategy,
        getCurrentPhase,
        findStrategicMatches,
        recommendOpportunityRelationship,
        getStatus,
        runSelfTest
    });

    global.CCSPLongTermStrategy = api;
    global.MEOSOrganizationLongTermStrategy = api;

    console.info(
        `[MEOS] ${NAME} v${VERSION} online. Build ${BUILD_ID}.`,
        getStatus()
    );
})(window);
