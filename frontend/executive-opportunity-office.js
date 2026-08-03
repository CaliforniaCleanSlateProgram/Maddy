/*
 * Maddy Executive Operating System (MEOS)
 * Executive Opportunity Office
 *
 * Version: 2.0.0
 * Build: EOO200-EXECUTIVE-REASONING-20260802-A
 *
 * Purpose:
 * - Maintain an approved registry of public opportunity sources.
 * - Scan those sources through the existing Website Intelligence transport.
 * - Detect current and future funding/resource opportunities.
 * - Normalize, deduplicate, track, and hand discoveries to GrantOffice.
 * - Return only evaluated opportunities that survive executive filtering.
 *
 * Governance:
 * - No source is scanned unless explicitly registered and enabled.
 * - No opportunity is presented as verified unless its source was collected.
 * - No application, outreach, or commitment occurs without human authority.
 * - This office discovers and monitors. GrantOffice evaluates.
 *
 * Current connector boundary:
 * - v1.0.0 supports public HTML and text sources readable by WebsiteIntelligence.
 * - PDF, authenticated, JavaScript-only, and structured API connectors require
 *   separate verified adapters and are never claimed as supported here.
 */

(function initializeExecutiveOpportunityOffice(global) {
    "use strict";

    const NAME = "MEOS Executive Opportunity Office";
    const VERSION = "2.0.0";
    const BUILD_ID = "EOO200-EXECUTIVE-REASONING-20260802-A";
    const SCHEMA = "meos.executive-opportunity-office.v1";
    const STORAGE_KEY = "meos.executive-opportunity-office.v1";

    const SOURCE_TYPES = Object.freeze({
        FEDERAL: "federal",
        STATE: "state",
        COUNTY: "county",
        CITY: "city",
        FOUNDATION: "foundation",
        CORPORATE: "corporate",
        PHILANTHROPY: "philanthropy",
        COMMUNITY: "community",
        LEGISLATION: "legislation",
        SETTLEMENT: "settlement",
        NONPROFIT_BENEFIT: "nonprofit-benefit",
        PARTNERSHIP: "partnership",
        MEDIA_REVENUE: "media-revenue",
        OTHER: "other"
    });

    const DISCOVERY_STATES = Object.freeze({
        NEW: "new",
        CHANGED: "changed",
        UNCHANGED: "unchanged",
        REMOVED: "removed",
        REJECTED: "rejected",
        EVALUATED: "evaluated"
    });

    const EXECUTIVE_RECOMMENDATIONS = Object.freeze({
        PURSUE: "pursue",
        PREPARE: "prepare",
        MONITOR: "monitor",
        PARTNER: "partner",
        HUMAN_REVIEW: "human-review",
        DECLINE: "decline"
    });

    const DEFAULT_CONFIGURATION = Object.freeze({
        automaticScanning: false,
        scanIntervalMinutes: 60,
        minimumScanIntervalMinutes: 15,
        maximumSourcesPerRun: 25,
        maximumPagesPerSource: 20,
        maximumDepthPerSource: 2,
        maximumCandidatesPerPage: 20,
        maximumStoredDiscoveries: 5000,
        minimumOpportunitySignalScore: 4,
        evaluateImmediately: true,
        retainRejectedDiscoveries: true,
        persistenceEnabled: true
    });

    const FUNDING_TERMS = Object.freeze([
        "grant",
        "funding",
        "fund",
        "award",
        "request for proposals",
        "request for applications",
        "notice of funding opportunity",
        "notice of funding availability",
        "funding opportunity",
        "solicitation",
        "application",
        "apply",
        "philanthropy",
        "foundation",
        "donation",
        "sponsorship",
        "settlement fund",
        "appropriation",
        "budget allocation",
        "contract opportunity",
        "nonprofit program",
        "in kind",
        "technology credit",
        "advertising grant",
        "matching gift"
    ]);

    const FUTURE_SIGNAL_TERMS = Object.freeze([
        "proposed",
        "pending",
        "introduced",
        "passed",
        "approved",
        "appropriated",
        "authorized",
        "anticipated",
        "expected",
        "forthcoming",
        "coming soon",
        "pre announcement",
        "notice of intent",
        "public comment",
        "implementation plan",
        "settlement allocation",
        "budget proposal"
    ]);

    const OPEN_SIGNAL_TERMS = Object.freeze([
        "applications open",
        "now accepting applications",
        "apply now",
        "request for proposals",
        "request for applications",
        "deadline",
        "due date",
        "submission deadline"
    ]);

    const REJECTION_TERMS = Object.freeze([
        "award announcement",
        "award recipients",
        "winners announced",
        "press release",
        "news release",
        "annual report",
        "meeting minutes"
    ]);

    const state = {
        status: "initializing",
        initializedAt: null,
        configuration: { ...DEFAULT_CONFIGURATION },
        sources: [],
        discoveries: [],
        scanRuns: [],
        timerId: null,
        activeRun: null,
        listeners: Object.create(null)
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
            `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
        return [...new Set(values.map(v => String(v || "").trim()).filter(Boolean))];
    }

    function safeUrl(value) {
        try {
            const url = new URL(String(value || ""));
            if (!["http:", "https:"].includes(url.protocol)) return null;
            url.hash = "";
            return url.href;
        } catch (_error) {
            return null;
        }
    }

    function emit(eventName, detail) {
        const payload = clone(detail);

        state.listeners[eventName]?.forEach(handler => {
            try {
                handler(payload);
            } catch (error) {
                console.warn("[MEOS Opportunity Office] Listener failed.", error);
            }
        });

        if (
            typeof global.dispatchEvent === "function" &&
            typeof global.CustomEvent === "function"
        ) {
            global.dispatchEvent(
                new CustomEvent(`meos:opportunity-office:${eventName}`, {
                    detail: payload
                })
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

    function getWebsiteIntelligence() {
        return (
            global.WebsiteIntelligence ||
            global.MEOSWebsiteIntelligence ||
            null
        );
    }

    function getGrantOffice() {
        return global.GrantOffice || null;
    }

    function getLongTermStrategy() {
        return (
            global.CCSPLongTermStrategy ||
            global.MEOSOrganizationLongTermStrategy ||
            null
        );
    }

    function getBuildPortfolio() {
        return (
            global.ExecutiveBuildPortfolio ||
            global.MEOSExecutiveBuildPortfolio ||
            null
        );
    }

    function calculateCurrentReadiness(opportunity = {}) {
        let score = 35;
        const applicants = opportunity.eligibleApplicants || [];
        const requirements = opportunity.requirements || {};
        const geography = normalizeText(opportunity.geography || "");

        if (
            applicants.length === 0 ||
            applicants.some(item =>
                normalizeText(item).includes("501 c 3") ||
                normalizeText(item).includes("nonprofit")
            )
        ) score += 20;

        if (
            !geography ||
            geography.includes("california") ||
            geography.includes("santa cruz") ||
            geography.includes("monterey")
        ) score += 15;

        if (!requirements.requiredLicense) score += 10;
        if (!requirements.requiredFacility) score += 10;
        if (!requirements.requiredAccreditation) score += 5;
        if (!requirements.minimumOperatingYears) score += 5;

        return Math.max(0, Math.min(100, score));
    }

    function determineExecutiveRecommendation(opportunity, strategyResult, portfolioResult) {
        const lifecycle = String(opportunity.lifecycle || "").toLowerCase();
        const currentReadiness = calculateCurrentReadiness(opportunity);
        const strategyScore =
            Number(strategyResult?.matches?.strategicSignalScore || 0);
        const bestBuildMatch = portfolioResult?.bestMatch || null;
        const awardAmount = Number(opportunity.awardAmount || 0);
        const reasons = [];
        const requiredActions = [];

        let recommendation = EXECUTIVE_RECOMMENDATIONS.HUMAN_REVIEW;

        if (
            lifecycle === "pre-announcement" ||
            lifecycle === "expected" ||
            lifecycle === "coming-soon" ||
            lifecycle === "closed"
        ) {
            recommendation = EXECUTIVE_RECOMMENDATIONS.MONITOR;
            reasons.push("The opportunity is not currently actionable and must remain scheduled for future review.");
            requiredActions.push("Set a proportionate recheck date and prepare only when the opportunity approaches actionability.");
        }

        if (bestBuildMatch?.material) {
            recommendation =
                currentReadiness >= 70
                    ? EXECUTIVE_RECOMMENDATIONS.PURSUE
                    : EXECUTIVE_RECOMMENDATIONS.PREPARE;
            reasons.push(
                `The opportunity advances the approved Executive Build "${bestBuildMatch.buildName}".`
            );
            requiredActions.push("Link the opportunity to the active build and assign the relevant offices.");
        } else if (strategyScore >= 65) {
            recommendation =
                currentReadiness >= 70
                    ? EXECUTIVE_RECOMMENDATIONS.PURSUE
                    : EXECUTIVE_RECOMMENDATIONS.PREPARE;
            reasons.push("The opportunity strongly advances CCSP's long-term strategy.");
        } else if (strategyScore >= 30) {
            recommendation = EXECUTIVE_RECOMMENDATIONS.HUMAN_REVIEW;
            reasons.push("The opportunity has adaptive or strategic potential that deserves human judgment.");
        }

        if (
            /partner|collaboration|coalition|mou/.test(
                normalizeText(`${opportunity.title} ${opportunity.description}`)
            ) &&
            recommendation !== EXECUTIVE_RECOMMENDATIONS.PURSUE
        ) {
            recommendation = EXECUTIVE_RECOMMENDATIONS.PARTNER;
            reasons.push("A partnership path may make the opportunity viable.");
        }

        if (
            awardAmount >= 1_000_000 &&
            recommendation === EXECUTIVE_RECOMMENDATIONS.DECLINE
        ) {
            recommendation = EXECUTIVE_RECOMMENDATIONS.HUMAN_REVIEW;
            reasons.push("The scale of the opportunity requires executive review before any decline.");
        }

        if (reasons.length === 0) {
            reasons.push("Automated evidence is insufficient for a confident executive decision.");
        }

        return {
            schema: "meos.executive-qualification-report.v1",
            generatedAt: now(),
            recommendation,
            currentOperationalReadiness: currentReadiness,
            purposeAndStrategyAlignment: strategyScore,
            executiveBuildMatch: bestBuildMatch,
            strategyAnalysis: strategyResult || null,
            portfolioAnalysis: portfolioResult || null,
            reasons,
            requiredActions,
            confidence: Math.min(
                0.98,
                0.55 +
                strategyScore / 250 +
                (bestBuildMatch?.score || 0) / 300
            )
        };
    }

    function evaluateExecutiveOpportunity(opportunity = {}) {
        const strategy = getLongTermStrategy();
        const portfolio = getBuildPortfolio();

        const strategyResult =
            strategy?.recommendOpportunityRelationship
                ? strategy.recommendOpportunityRelationship(opportunity)
                : null;

        const portfolioResult =
            portfolio?.matchOpportunity
                ? portfolio.matchOpportunity(opportunity, { record: true })
                : null;

        return determineExecutiveRecommendation(
            opportunity,
            strategyResult,
            portfolioResult
        );
    }

    function configure(options = {}) {
        const requestedInterval = Number(
            options.scanIntervalMinutes ?? state.configuration.scanIntervalMinutes
        );

        state.configuration = {
            ...state.configuration,
            ...options,
            scanIntervalMinutes: Math.max(
                state.configuration.minimumScanIntervalMinutes,
                Number.isFinite(requestedInterval)
                    ? requestedInterval
                    : state.configuration.scanIntervalMinutes
            )
        };

        persist();

        if (state.configuration.automaticScanning) {
            startContinuousScanning();
        } else {
            stopContinuousScanning();
        }

        return getStatus();
    }

    function registerSource(input = {}) {
        const url = safeUrl(input.url || input.website);

        if (!url) {
            return {
                success: false,
                error: "A valid public HTTP or HTTPS source URL is required."
            };
        }

        const existing = state.sources.find(source => source.url === url);

        const source = {
            id: existing?.id || input.id || createId("opportunity-source"),
            name: String(input.name || new URL(url).hostname),
            url,
            type: input.type || SOURCE_TYPES.OTHER,
            enabled: input.enabled !== false,
            authority: input.authority || "public-source",
            jurisdiction: input.jurisdiction || "",
            tags: uniqueStrings(input.tags || []),
            includePatterns: uniqueStrings(input.includePatterns || []),
            excludePatterns: uniqueStrings(input.excludePatterns || []),
            maximumPages: Math.max(
                1,
                Math.min(
                    100,
                    Number(input.maximumPages || state.configuration.maximumPagesPerSource)
                )
            ),
            maximumDepth: Math.max(
                0,
                Math.min(
                    5,
                    Number(input.maximumDepth ?? state.configuration.maximumDepthPerSource)
                )
            ),
            scanIntervalMinutes: Math.max(
                state.configuration.minimumScanIntervalMinutes,
                Number(
                    input.scanIntervalMinutes ||
                    state.configuration.scanIntervalMinutes
                )
            ),
            lastScannedAt: existing?.lastScannedAt || null,
            lastSuccessfulScanAt: existing?.lastSuccessfulScanAt || null,
            lastFailure: existing?.lastFailure || null,
            createdAt: existing?.createdAt || now(),
            updatedAt: now()
        };

        if (existing) {
            Object.assign(existing, source);
        } else {
            state.sources.push(source);
        }

        persist();
        emit("source-registered", source);

        return {
            success: true,
            source: clone(source)
        };
    }

    function removeSource(sourceId) {
        const index = state.sources.findIndex(source => source.id === sourceId);

        if (index < 0) {
            return {
                success: false,
                error: "Source not found."
            };
        }

        const [removed] = state.sources.splice(index, 1);
        persist();
        emit("source-removed", removed);

        return {
            success: true,
            source: clone(removed)
        };
    }

    function listSources(options = {}) {
        return state.sources
            .filter(source => options.includeDisabled || source.enabled)
            .map(clone);
    }

    function sourceIsDue(source, referenceTime = Date.now()) {
        if (!source.enabled) return false;
        if (!source.lastScannedAt) return true;

        const last = Date.parse(source.lastScannedAt);
        if (!Number.isFinite(last)) return true;

        return (
            referenceTime - last >=
            source.scanIntervalMinutes * 60 * 1000
        );
    }

    function pageAllowed(page, source) {
        const haystack = normalizeText(
            [page.url, page.title, ...(page.headings || [])].join(" ")
        );

        if (
            source.includePatterns.length > 0 &&
            !source.includePatterns.some(pattern =>
                haystack.includes(normalizeText(pattern))
            )
        ) {
            return false;
        }

        if (
            source.excludePatterns.some(pattern =>
                haystack.includes(normalizeText(pattern))
            )
        ) {
            return false;
        }

        return true;
    }

    function splitPageIntoCandidates(page, source) {
        const headings = Array.isArray(page.headings) ? page.headings : [];
        const text = String(page.text || "").trim();
        const candidates = [];

        headings.forEach(heading => {
            const normalizedHeading = normalizeText(heading);
            const position = normalizeText(text).indexOf(normalizedHeading);
            const excerpt =
                position >= 0
                    ? text.slice(Math.max(0, position), position + 1800)
                    : text.slice(0, 1800);

            candidates.push({
                title: heading,
                excerpt,
                page
            });
        });

        if (candidates.length === 0 && text) {
            const chunks = text
                .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
                .reduce((groups, sentence) => {
                    const last = groups[groups.length - 1];
                    if (!last || last.length > 1400) {
                        groups.push(sentence);
                    } else {
                        groups[groups.length - 1] += ` ${sentence}`;
                    }
                    return groups;
                }, [])
                .slice(0, state.configuration.maximumCandidatesPerPage);

            chunks.forEach((chunk, index) => {
                candidates.push({
                    title: index === 0 ? page.title : `${page.title} — section ${index + 1}`,
                    excerpt: chunk,
                    page
                });
            });
        }

        return candidates.slice(0, state.configuration.maximumCandidatesPerPage);
    }

    function calculateSignal(candidate, source) {
        const text = normalizeText(
            `${candidate.title} ${candidate.excerpt}`
        );

        const fundingMatches = FUNDING_TERMS.filter(term =>
            text.includes(normalizeText(term))
        );

        const futureMatches = FUTURE_SIGNAL_TERMS.filter(term =>
            text.includes(normalizeText(term))
        );

        const openMatches = OPEN_SIGNAL_TERMS.filter(term =>
            text.includes(normalizeText(term))
        );

        const rejectionMatches = REJECTION_TERMS.filter(term =>
            text.includes(normalizeText(term))
        );

        let score =
            fundingMatches.length * 2 +
            futureMatches.length +
            openMatches.length * 2 -
            rejectionMatches.length * 2;

        if (extractMoney(candidate.excerpt).amount !== null) score += 1;
        if (extractDates(candidate.excerpt).deadline) score += 1;
        if (source.type === SOURCE_TYPES.LEGISLATION && futureMatches.length) score += 2;
        if (source.type === SOURCE_TYPES.SETTLEMENT && fundingMatches.length) score += 2;

        return {
            score,
            fundingMatches,
            futureMatches,
            openMatches,
            rejectionMatches,
            qualifies:
                score >= state.configuration.minimumOpportunitySignalScore &&
                fundingMatches.length > 0
        };
    }

    function extractMoney(value) {
        const text = String(value || "");
        const patterns = [
            /\$\s?([\d,.]+)\s?(billion|million|thousand|b|m|k)?/i,
            /([\d,.]+)\s?(billion|million|thousand)\s+dollars/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (!match) continue;

            const base = Number(String(match[1]).replace(/,/g, ""));
            if (!Number.isFinite(base)) continue;

            const unit = String(match[2] || "").toLowerCase();
            const multiplier =
                unit === "billion" || unit === "b"
                    ? 1_000_000_000
                    : unit === "million" || unit === "m"
                        ? 1_000_000
                        : unit === "thousand" || unit === "k"
                            ? 1_000
                            : 1;

            return {
                amount: base * multiplier,
                raw: match[0]
            };
        }

        return {
            amount: null,
            raw: null
        };
    }

    function extractDates(value) {
        const text = String(value || "");
        const result = {
            openDate: null,
            deadline: null,
            datesFound: []
        };

        const datePatterns = [
            /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/gi,
            /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
            /\b\d{4}-\d{2}-\d{2}\b/g
        ];

        datePatterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            result.datesFound.push(...matches);
        });

        result.datesFound = uniqueStrings(result.datesFound);

        const deadlineMatch = text.match(
            /(?:deadline|due|closes?|close date|applications? due|submit(?:ted)? by)[^.\n]{0,80}?((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/i
        );

        const openMatch = text.match(
            /(?:opens?|opening|available beginning|applications? open)[^.\n]{0,80}?((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/i
        );

        result.deadline = normalizeDate(deadlineMatch?.[1]);
        result.openDate = normalizeDate(openMatch?.[1]);

        return result;
    }

    function normalizeDate(value) {
        if (!value) return null;
        const timestamp = Date.parse(value);
        if (!Number.isFinite(timestamp)) return null;
        return new Date(timestamp).toISOString().slice(0, 10);
    }

    function extractApplicantClasses(value) {
        const text = normalizeText(value);
        const classes = [];

        const mappings = [
            ["501(c)(3) nonprofit organizations", ["501 c 3", "501c3", "nonprofit organization"]],
            ["local governments", ["local government", "city government", "county government"]],
            ["state governments", ["state government", "state agencies"]],
            ["tribal governments", ["tribal government", "federally recognized tribe"]],
            ["educational institutions", ["school district", "university", "college", "educational institution"]],
            ["small businesses", ["small business"]],
            ["individual applicants", ["individual applicant", "individuals may apply"]]
        ];

        mappings.forEach(([label, indicators]) => {
            if (indicators.some(indicator => text.includes(indicator))) {
                classes.push(label);
            }
        });

        return uniqueStrings(classes);
    }

    function extractRequirements(value) {
        const text = normalizeText(value);

        function yearsBefore(phrase) {
            const pattern = new RegExp(`(\\d+)\\s*(?:to|-)??\\s*(?:\\d+)?\\s*years?[^.]{0,80}${phrase}`);
            const match = text.match(pattern);
            return match ? Number(match[1]) : null;
        }

        return {
            minimumOperatingYears:
                yearsBefore("operating") ||
                yearsBefore("organizational experience"),
            minimumFinancialYears:
                yearsBefore("financial statements") ||
                yearsBefore("financial history"),
            minimumAuditedFinancialYears:
                yearsBefore("audited financial"),
            minimumOutcomeYears:
                yearsBefore("outcome") ||
                yearsBefore("performance data"),
            minimumAnnualBudget: extractMinimumBudget(text),
            requiredLicense:
                text.includes("license required") ? "unspecified-required-license" : null,
            requiredAccreditation:
                text.includes("accreditation required") ? "unspecified-required-accreditation" : null,
            requiredFacility:
                text.includes("existing facility required") ? "existing-facility" : null,
            minimumStaff: null
        };
    }

    function extractMinimumBudget(text) {
        const match = text.match(
            /(?:minimum annual budget|annual budget of at least|minimum operating budget)[^$]{0,40}\$\s?([\d,.]+)\s?(million|thousand|m|k)?/
        );
        if (!match) return null;

        const base = Number(match[1].replace(/,/g, ""));
        if (!Number.isFinite(base)) return null;

        const unit = String(match[2] || "").toLowerCase();
        return base * (
            unit === "million" || unit === "m"
                ? 1_000_000
                : unit === "thousand" || unit === "k"
                    ? 1_000
                    : 1
        );
    }

    function classifyOpportunityType(source, candidate) {
        const text = normalizeText(`${candidate.title} ${candidate.excerpt}`);

        if (source.type === SOURCE_TYPES.LEGISLATION) return "legislative-signal";
        if (source.type === SOURCE_TYPES.SETTLEMENT) return "court-settlement";
        if (source.type === SOURCE_TYPES.CORPORATE) return "corporate-philanthropy";
        if (source.type === SOURCE_TYPES.FOUNDATION) return "private-foundation";
        if (source.type === SOURCE_TYPES.COMMUNITY) return "community-foundation";
        if (source.type === SOURCE_TYPES.NONPROFIT_BENEFIT) return "technology-benefit";
        if (source.type === SOURCE_TYPES.PARTNERSHIP) return "strategic-partnership";
        if (source.type === SOURCE_TYPES.MEDIA_REVENUE) return "digital-revenue";
        if (text.includes("contract")) return "government-contract";
        if (source.type === SOURCE_TYPES.FEDERAL) return "federal-grant";
        if (source.type === SOURCE_TYPES.STATE) return "state-grant";
        if ([SOURCE_TYPES.COUNTY, SOURCE_TYPES.CITY].includes(source.type)) return "local-grant";
        return "other";
    }

    function determineLifecycle(signal, dates) {
        if (signal.futureMatches.length > 0 && signal.openMatches.length === 0) {
            return "pre-announcement";
        }

        if (dates.openDate) {
            const open = Date.parse(dates.openDate);
            if (Number.isFinite(open) && open > Date.now()) {
                return "expected";
            }
        }

        if (dates.deadline) {
            const deadline = Date.parse(dates.deadline);
            if (Number.isFinite(deadline) && deadline < Date.now()) {
                return "closed";
            }
            if (
                Number.isFinite(deadline) &&
                deadline - Date.now() <= 14 * 86400000
            ) {
                return "closing-soon";
            }
        }

        return "open";
    }

    function discoveryKey(source, page, title) {
        return normalizeText(
            `${source.id}|${page.url}|${title}`
        );
    }

    function findExistingDiscovery(key) {
        return state.discoveries.find(item => item.key === key) || null;
    }

    function buildOpportunityInput(source, candidate, signal) {
        const dates = extractDates(candidate.excerpt);
        const money = extractMoney(candidate.excerpt);
        const requirements = extractRequirements(candidate.excerpt);
        const applicants = extractApplicantClasses(candidate.excerpt);

        return {
            type: classifyOpportunityType(source, candidate),
            title: candidate.title || candidate.page.title,
            provider: source.name,
            sourceUrl: candidate.page.url,
            sourceType: source.type,
            description: candidate.excerpt.slice(0, 5000),
            statedPurpose: candidate.excerpt.slice(0, 2000),
            desiredOutcomes: uniqueStrings([
                ...signal.fundingMatches,
                ...signal.futureMatches
            ]),
            targetPopulations: [],
            geography: source.jurisdiction,
            eligibleApplicants: applicants,
            fundingAreas: source.tags,
            awardAmount: money.amount,
            openDate: dates.openDate || "",
            deadline: dates.deadline || "",
            lifecycle: determineLifecycle(signal, dates),
            requirements,
            verified: true,
            confidence: Math.min(0.98, 0.65 + signal.score * 0.03),
            raw: {
                discoveryOffice: NAME,
                discoveryBuild: BUILD_ID,
                sourceId: source.id,
                sourceName: source.name,
                pageTitle: candidate.page.title,
                contentHash: candidate.page.contentHash,
                signal,
                extractedDates: dates,
                extractedMoney: money
            }
        };
    }

    function recordDiscovery(source, candidate, signal, opportunity, evaluation) {
        const key = discoveryKey(source, candidate.page, candidate.title);
        const existing = findExistingDiscovery(key);
        const contentHash = candidate.page.contentHash || null;
        const changed =
            existing &&
            contentHash &&
            existing.contentHash &&
            contentHash !== existing.contentHash;

        const record = {
            id: existing?.id || createId("opportunity-discovery"),
            key,
            sourceId: source.id,
            sourceName: source.name,
            sourceUrl: source.url,
            pageUrl: candidate.page.url,
            pageTitle: candidate.page.title,
            title: candidate.title,
            excerpt: candidate.excerpt.slice(0, 5000),
            signal,
            opportunityId: opportunity?.id || existing?.opportunityId || null,
            evaluation: evaluation || existing?.evaluation || null,
            contentHash,
            state:
                evaluation
                    ? DISCOVERY_STATES.EVALUATED
                    : changed
                        ? DISCOVERY_STATES.CHANGED
                        : existing
                            ? DISCOVERY_STATES.UNCHANGED
                            : DISCOVERY_STATES.NEW,
            firstDiscoveredAt: existing?.firstDiscoveredAt || now(),
            lastSeenAt: now(),
            updatedAt: now()
        };

        if (existing) {
            Object.assign(existing, record);
        } else {
            state.discoveries.push(record);
        }

        return record;
    }

    async function processCandidate(source, candidate, signal) {
        const grantOffice = getGrantOffice();

        if (!grantOffice) {
            throw new Error("GrantOffice is unavailable.");
        }

        const opportunityInput = buildOpportunityInput(source, candidate, signal);
        const executiveQualification =
            evaluateExecutiveOpportunity(opportunityInput);

        const opportunity = grantOffice.addOpportunity({
            ...opportunityInput,
            executiveQualification
        });

        let grantEvaluation = null;
        if (state.configuration.evaluateImmediately) {
            grantEvaluation = grantOffice.evaluateOpportunity(opportunity.id);
        }

        const evaluation = {
            executiveQualification,
            grantEvaluation
        };

        return recordDiscovery(
            source,
            candidate,
            signal,
            opportunity,
            evaluation
        );
    }

    async function scanSource(sourceId, options = {}) {
        const source = state.sources.find(item => item.id === sourceId);

        if (!source) {
            return {
                success: false,
                error: "Source not found."
            };
        }

        if (!source.enabled && !options.force) {
            return {
                success: false,
                error: "Source is disabled."
            };
        }

        const websiteIntelligence = getWebsiteIntelligence();
        const grantOffice = getGrantOffice();

        if (!websiteIntelligence?.crawl) {
            return {
                success: false,
                error: "WebsiteIntelligence.crawl is unavailable."
            };
        }

        if (!grantOffice?.addOpportunity || !grantOffice?.evaluateOpportunity) {
            return {
                success: false,
                error: "GrantOffice evaluation API is unavailable."
            };
        }

        source.lastScannedAt = now();
        source.updatedAt = now();
        source.lastFailure = null;

        emit("source-scan-started", source);

        try {
            const crawl = await websiteIntelligence.crawl({
                website: source.url,
                configuration: {
                    maximumPages: source.maximumPages,
                    maximumDepth: source.maximumDepth,
                    sameOriginOnly: true
                }
            });

            const qualified = [];
            const rejected = [];

            for (const page of crawl.snapshot.pages) {
                if (!pageAllowed(page, source)) continue;

                const candidates = splitPageIntoCandidates(page, source);

                for (const candidate of candidates) {
                    const signal = calculateSignal(candidate, source);

                    if (!signal.qualifies) {
                        rejected.push({
                            pageUrl: page.url,
                            title: candidate.title,
                            score: signal.score
                        });
                        continue;
                    }

                    const discovery = await processCandidate(
                        source,
                        candidate,
                        signal
                    );
                    qualified.push(discovery);
                }
            }

            source.lastSuccessfulScanAt = now();

            const result = {
                success: true,
                sourceId: source.id,
                sourceName: source.name,
                crawlId: crawl.crawlId,
                pagesCollected: crawl.snapshot.pages.length,
                failures: crawl.snapshot.failures.length,
                qualifiedDiscoveries: qualified.length,
                rejectedCandidates: rejected.length,
                discoveries: qualified.map(clone),
                changes: crawl.changes,
                completedAt: now()
            };

            trimState();
            persist();
            emit("source-scan-completed", result);
            return result;
        } catch (error) {
            source.lastFailure = {
                message: error?.message || String(error),
                code: error?.code || "OPPORTUNITY_SOURCE_SCAN_FAILED",
                occurredAt: now()
            };
            persist();

            const result = {
                success: false,
                sourceId: source.id,
                sourceName: source.name,
                error: source.lastFailure
            };

            emit("source-scan-failed", result);
            return result;
        }
    }

    async function scanAll(options = {}) {
        if (state.activeRun) {
            return {
                success: false,
                error: "An opportunity scan is already running.",
                activeRun: clone(state.activeRun)
            };
        }

        const force = options.force === true;
        const dueSources = state.sources
            .filter(source => source.enabled)
            .filter(source => force || sourceIsDue(source))
            .slice(0, state.configuration.maximumSourcesPerRun);

        const run = {
            id: createId("opportunity-scan"),
            startedAt: now(),
            sourceCount: dueSources.length,
            results: []
        };

        state.activeRun = run;
        emit("scan-started", run);

        try {
            for (const source of dueSources) {
                const result = await scanSource(source.id, { force });
                run.results.push(result);
            }

            run.completedAt = now();
            run.successfulSources = run.results.filter(result => result.success).length;
            run.failedSources = run.results.filter(result => !result.success).length;
            run.qualifiedDiscoveries = run.results.reduce(
                (sum, result) => sum + Number(result.qualifiedDiscoveries || 0),
                0
            );

            state.scanRuns.push(clone(run));
            trimState();
            persist();
            emit("scan-completed", run);

            return {
                success: run.failedSources === 0,
                ...clone(run),
                executiveDesk: getExecutiveDesk()
            };
        } finally {
            state.activeRun = null;
        }
    }

    function getExecutiveDesk(options = {}) {
        const grantOffice = getGrantOffice();
        if (!grantOffice?.getExecutiveDesk) {
            return {
                success: false,
                error: "GrantOffice executive desk is unavailable."
            };
        }
        return grantOffice.getExecutiveDesk(options);
    }

    function getDiscoveries(options = {}) {
        return state.discoveries
            .filter(item => !options.sourceId || item.sourceId === options.sourceId)
            .filter(item => !options.state || item.state === options.state)
            .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
            .slice(0, Number(options.limit || 200))
            .map(clone);
    }

    function getSourceStatus() {
        return state.sources.map(source => ({
            ...clone(source),
            due: sourceIsDue(source)
        }));
    }

    function startContinuousScanning() {
        stopContinuousScanning();

        const intervalMs =
            state.configuration.scanIntervalMinutes * 60 * 1000;

        state.timerId = global.setInterval(() => {
            scanAll().catch(error => {
                console.warn("[MEOS Opportunity Office] Scheduled scan failed.", error);
            });
        }, intervalMs);

        state.configuration.automaticScanning = true;
        persist();

        return {
            success: true,
            automaticScanning: true,
            intervalMinutes: state.configuration.scanIntervalMinutes
        };
    }

    function stopContinuousScanning() {
        if (state.timerId) {
            global.clearInterval(state.timerId);
            state.timerId = null;
        }

        state.configuration.automaticScanning = false;
        persist();

        return {
            success: true,
            automaticScanning: false
        };
    }

    function trimState() {
        if (state.discoveries.length > state.configuration.maximumStoredDiscoveries) {
            state.discoveries = state.discoveries
                .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
                .slice(0, state.configuration.maximumStoredDiscoveries);
        }

        if (state.scanRuns.length > 100) {
            state.scanRuns = state.scanRuns.slice(-100);
        }
    }

    function exportState() {
        return {
            schema: "meos.executive-opportunity-office.state.v1",
            version: VERSION,
            buildId: BUILD_ID,
            exportedAt: now(),
            configuration: state.configuration,
            sources: state.sources,
            discoveries: state.discoveries,
            scanRuns: state.scanRuns
        };
    }

    function persist() {
        if (
            !state.configuration.persistenceEnabled ||
            !global.localStorage
        ) {
            return {
                success: false,
                persisted: false
            };
        }

        try {
            global.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(exportState())
            );
            return {
                success: true,
                persisted: true
            };
        } catch (error) {
            console.warn(
                "[MEOS Opportunity Office] State persistence failed.",
                error
            );
            return {
                success: false,
                persisted: false,
                error: error.message
            };
        }
    }

    function restore() {
        if (!global.localStorage) {
            return {
                success: false,
                restored: false
            };
        }

        try {
            const raw = global.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return {
                    success: true,
                    restored: false
                };
            }

            const saved = JSON.parse(raw);
            if (
                saved.schema !==
                "meos.executive-opportunity-office.state.v1"
            ) {
                return {
                    success: false,
                    restored: false,
                    error: "Unsupported stored Opportunity Office schema."
                };
            }

            state.configuration = {
                ...DEFAULT_CONFIGURATION,
                ...(saved.configuration || {})
            };
            state.sources = Array.isArray(saved.sources) ? saved.sources : [];
            state.discoveries = Array.isArray(saved.discoveries)
                ? saved.discoveries
                : [];
            state.scanRuns = Array.isArray(saved.scanRuns)
                ? saved.scanRuns
                : [];

            return {
                success: true,
                restored: true
            };
        } catch (error) {
            return {
                success: false,
                restored: false,
                error: error.message
            };
        }
    }

    function clearState(options = {}) {
        state.discoveries = [];
        state.scanRuns = [];

        if (options.includeSources) {
            state.sources = [];
        }

        persist();

        return {
            success: true,
            sourcesRetained: !options.includeSources
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
            websiteIntelligenceConnected: Boolean(getWebsiteIntelligence()?.crawl),
            grantOfficeConnected: Boolean(
                getGrantOffice()?.addOpportunity &&
                getGrantOffice()?.evaluateOpportunity
            ),
            longTermStrategyConnected: Boolean(
                getLongTermStrategy()?.recommendOpportunityRelationship
            ),
            buildPortfolioConnected: Boolean(
                getBuildPortfolio()?.matchOpportunity
            ),
            automaticScanning: Boolean(state.timerId),
            sourceCount: state.sources.length,
            enabledSourceCount: state.sources.filter(source => source.enabled).length,
            dueSourceCount: state.sources.filter(source => sourceIsDue(source)).length,
            discoveryCount: state.discoveries.length,
            evaluatedDiscoveryCount: state.discoveries.filter(
                item => item.state === DISCOVERY_STATES.EVALUATED
            ).length,
            activeRun: clone(state.activeRun),
            connectorBoundary: {
                htmlAndText: true,
                pdf: false,
                authenticatedSources: false,
                javascriptOnlySources: false,
                structuredApis: false
            },
            configuration: clone(state.configuration)
        };
    }

    async function runSelfTest() {
        const website = getWebsiteIntelligence();
        const grants = getGrantOffice();

        const checks = [
            {
                name: "Website Intelligence connected",
                passed: Boolean(website?.crawl)
            },
            {
                name: "Grant Office connected",
                passed: Boolean(
                    grants?.addOpportunity &&
                    grants?.evaluateOpportunity &&
                    grants?.getExecutiveDesk
                )
            },
            {
                name: "Source registry available",
                passed:
                    typeof registerSource === "function" &&
                    typeof listSources === "function"
            },
            {
                name: "Discovery pipeline available",
                passed:
                    typeof scanSource === "function" &&
                    typeof scanAll === "function"
            }
        ];

        return {
            success: checks.every(check => check.passed),
            checks,
            status: getStatus()
        };
    }

    restore();

    const api = Object.freeze({
        name: NAME,
        version: VERSION,
        buildId: BUILD_ID,
        schema: SCHEMA,
        SOURCE_TYPES,
        DISCOVERY_STATES,
        EXECUTIVE_RECOMMENDATIONS,
        configure,
        registerSource,
        removeSource,
        listSources,
        getSourceStatus,
        scanSource,
        scanAll,
        getDiscoveries,
        evaluateExecutiveOpportunity,
        getExecutiveDesk,
        startContinuousScanning,
        stopContinuousScanning,
        exportState,
        clearState,
        getStatus,
        runSelfTest,
        on
    });

    global.ExecutiveOpportunityOffice = api;
    global.MEOSExecutiveOpportunityOffice = api;

    state.initializedAt = now();
    state.status =
        getWebsiteIntelligence()?.crawl &&
        getGrantOffice()?.addOpportunity
            ? "online"
            : "degraded";

    if (state.configuration.automaticScanning) {
        startContinuousScanning();
    }

    console.info(
        `[MEOS] ${NAME} v${VERSION} ${state.status}. Build ${BUILD_ID}.`,
        getStatus()
    );

    emit("online", getStatus());
})(window);
