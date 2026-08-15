/*
 * Maddy Executive Operating System (MEOS)
 * Executive Resource Acquisition Engine
 *
 * Version: 3.0.0
 * Build: ERAE300-ORGANIZATION-NEUTRAL-CORE-20260815-A
 *
 * Mission:
 * Make one authoritative executive decision for every grant or resource
 * opportunity: can the active organization acquire it, does it advance the
 * active organization, is it worth the executive time, when should action occur, and should it reach the
 * Executive Director's desk?
 */

(function initializeExecutiveResourceAcquisitionEngine(global) {
  "use strict";

  const NAME = "MEOS Executive Resource Acquisition Engine";
  const VERSION = "3.0.0";
  const BUILD_ID = "ERAE300-ORGANIZATION-NEUTRAL-CORE-20260815-A";
  const SCHEMA = "meos.executive-resource-decision.v2";

  const DECISIONS = Object.freeze({
    PURSUE: "pursue",
    PREPARE: "prepare",
    PARTNER: "partner",
    MONITOR: "monitor",
    RESEARCH: "research",
    REJECT: "reject"
  });

  const TIMING = Object.freeze({
    IMMEDIATE: "immediate",
    NOW: "now",
    BUILD_NOW_FOR_FUTURE: "build-now-for-future",
    FUTURE_CYCLE: "future-cycle",
    MONITOR: "monitor",
    OFF_DESK: "off-desk"
  });

  function now() {
    return new Date().toISOString();
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function array(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (value === null || value === undefined || value === "") return [];
    return [value];
  }

  const DERIVED_DECISION_KEYS = new Set([
    "authoritativeResourceDecision",
    "resourceDecision",
    "resourceDevelopment",
    "executiveQualification",
    "executivePriority",
    "workQueue",
    "qualification",
    "evaluation",
    "executiveBrief",
    "reasoning",
    "recommendation"
  ]);

  function collectSourceText(value, depth = 0, key = "") {
    if (depth > 6 || value === null || value === undefined) return [];

    if (DERIVED_DECISION_KEYS.has(key)) {
      return [];
    }

    if (typeof value === "string" || typeof value === "number") {
      return [String(value)];
    }

    if (Array.isArray(value)) {
      return value.flatMap(item =>
        collectSourceText(item, depth + 1, key)
      );
    }

    if (typeof value === "object") {
      return Object.entries(value).flatMap(([childKey, childValue]) =>
        collectSourceText(childValue, depth + 1, childKey)
      );
    }

    return [];
  }

  function text(opportunity = {}) {
    const explicitSourceFields = {
      title: opportunity.title,
      description: opportunity.description,
      synopsis: opportunity.synopsis,
      summary: opportunity.summary,
      statedPurpose: opportunity.statedPurpose,
      category: opportunity.category,
      type: opportunity.type,
      provider: opportunity.provider,
      agencyName: opportunity.agencyName,
      geography: opportunity.geography,
      location: opportunity.location,
      eligibleApplicants: opportunity.eligibleApplicants,
      additionalEligibilityInformation:
        opportunity.additionalEligibilityInformation,
      targetPopulations: opportunity.targetPopulations,
      desiredOutcomes: opportunity.desiredOutcomes,
      fundingAreas: opportunity.fundingAreas,
      fullNotice: opportunity.fullNotice,
      notice: opportunity.notice,
      details: opportunity.details,
      source: opportunity.source,
      raw: opportunity.raw
    };

    return normalize(
      collectSourceText(explicitSourceFields).join(" ")
    );
  }

  function primaryTitleGate(opportunity = {}) {
    const title = normalize(opportunity.title);

    // Core neutrality rule: a sector, population, geography, or industry is never
    // rejected here merely because it was irrelevant to a previous customer.
    // Those decisions belong to the active Organizational Profile.
    if (/\bcompetition and .*demonstration program grants\b/.test(title)) {
      return {
        status: "research",
        id: "mixed-program-notice",
        reason: "This notice appears to contain distinct program tracks. The applicable track must be resolved against the active organization before executive pursuit."
      };
    }

    return { status: "continue", id: null, reason: null };
  }


  function getProfile(context = {}) {
    return context.organizationProfile ||
      global.OrganizationalProfile ||
      global.ActiveOrganizationalProfile ||
      null;
  }

  function getStrategy(context = {}) {
    return context.longTermStrategy || global.OrganizationalStrategy || null;
  }

  function getPortfolio(context = {}) {
    return context.buildPortfolio || global.ExecutiveBuildPortfolio || null;
  }

  function parseMoney(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function deadline(opportunity = {}) {
    const raw = opportunity.deadline || opportunity.closeDate || opportunity.responseDate || null;
    const timestamp = Date.parse(raw || "");
    if (!Number.isFinite(timestamp)) {
      return { raw, verified: false, daysRemaining: null, state: "unknown", label: "Deadline not verified" };
    }
    const daysRemaining = Math.ceil((timestamp - Date.now()) / 86400000);
    return {
      raw,
      verified: true,
      date: new Date(timestamp).toISOString(),
      daysRemaining,
      state: daysRemaining < 0 ? "closed" : daysRemaining <= 3 ? "immediate" : daysRemaining <= 14 ? "urgent" : "open",
      label: daysRemaining < 0 ? `Closed ${Math.abs(daysRemaining)} days ago` : daysRemaining === 0 ? "Closes today" : `Closes in ${daysRemaining} days`
    };
  }

  function profileText(profile = {}) {
    return normalize(collectSourceText(profile).join(" "));
  }

  function organizationName(profile = {}) {
    return profile?.organization?.legalName ||
      profile?.organization?.name ||
      profile?.legalName ||
      profile?.name ||
      "the active organization";
  }

  function explicitEligibility(opportunity = {}, context = {}) {
    const t = text(opportunity);
    const profile = getProfile(context);
    const p = profileText(profile);
    const evidence = [];
    const hardExclusions = [];
    const unknowns = [];

    if (!profile) {
      return { canLead: null, canPartner: null, hardExclusions, evidence, unknowns: ["Active Organizational Profile is not available."], status: "research" };
    }

    const partnerPath = /\bsubrecipient\b|\bsubaward\b|\bimplementation partner\b|\bcommunity partner\b|\bfunded partner\b|\bsubcontractor\b/.test(t);
    const orgIsNonprofit = /\bnonprofit\b|\b501 c 3\b|\bpublic charity\b/.test(p);
    const orgIsForProfit = /\bfor profit\b|\bbusiness\b|\bcompany\b|\bcorporation\b|\bllc\b/.test(p) && !orgIsNonprofit;
    const orgIsGovernment = /\bgovernment agency\b|\bmunicipality\b|\bcounty government\b|\bcity government\b|\bstate agency\b/.test(p);
    const orgIsTribal = /\btribe\b|\btribal\b/.test(p);
    const orgIsAcademic = /\buniversity\b|\bcollege\b|\binstitution of higher education\b|\bresearch institution\b/.test(p);

    const paths = [];
    if (orgIsNonprofit && /\b501 c 3\b|\bnonprofits?\b|\bpublic charities?\b|\bcommunity based organizations?\b/.test(t)) paths.push("nonprofit");
    if (orgIsForProfit && /\bfor profit\b|\bsmall business\b|\bbusinesses?\b|\bcommercial entities\b/.test(t)) paths.push("for-profit");
    if (orgIsGovernment && /\bstate governments?\b|\bcounty governments?\b|\bcity governments?\b|\bmunicipalit/.test(t)) paths.push("government");
    if (orgIsTribal && /\btribal\b|\btribes?\b/.test(t)) paths.push("tribal");
    if (orgIsAcademic && /\binstitutions? of higher education\b|\buniversit/.test(t)) paths.push("academic");

    if (orgIsNonprofit && /nonprofits? (?:are )?not eligible|501 c 3 (?:organizations? )?not eligible|for profit entities only/.test(t)) hardExclusions.push("The notice explicitly excludes the active organization's verified entity type.");
    if (orgIsForProfit && /for profit (?:entities|organizations|businesses) (?:are )?not eligible|nonprofits? only|501 c 3 only/.test(t)) hardExclusions.push("The notice explicitly excludes the active organization's verified entity type.");

    const canLead = hardExclusions.length ? false : paths.length ? true : null;
    const canPartner = hardExclusions.length ? false : partnerPath ? true : null;
    paths.forEach(path => evidence.push(`Explicit ${path} applicant path matches the active Organizational Profile.`));
    if (partnerPath) evidence.push("Explicit funded partnership path found.");
    if (canLead === null && canPartner === null) unknowns.push("The notice does not yet establish an applicant or funded-partner path for the active organization.");

    return { canLead, canPartner, hardExclusions, evidence, unknowns, status: hardExclusions.length ? "ineligible" : (canLead || canPartner ? "plausible" : "research") };
  }

  function advancement(opportunity = {}, context = {}) {
    const profile = getProfile(context);
    const opportunityText = text(opportunity);
    const pText = profileText(profile);
    const strategy = getStrategy(context);
    const portfolio = getPortfolio(context);
    let strategyResult = null;
    let portfolioResult = null;

    try {
      strategyResult = strategy?.recommendOpportunityRelationship?.(opportunity) || null;
      portfolioResult = portfolio?.matchOpportunity?.(opportunity, { record: false }) || null;
    } catch (_) {}

    const strategyScore = Number(strategyResult?.score || strategyResult?.alignmentScore || 0);
    const portfolioScore = Number(portfolioResult?.score || 0);
    const stop = new Set(["the","and","for","with","from","that","this","into","organization","program","services","service","support","current","future","community","executive","maddy","meos"]);
    const profileTerms = new Set(pText.split(" ").filter(w => w.length >= 5 && !stop.has(w)));
    const oppTerms = new Set(opportunityText.split(" ").filter(w => w.length >= 5 && !stop.has(w)));
    const shared = [...oppTerms].filter(w => profileTerms.has(w));
    const lexicalScore = Math.min(100, shared.length * 8);
    const advances = strategyScore >= 60 || portfolioScore >= 60 || lexicalScore >= 24;

    return {
      advances,
      direct: shared.slice(0, 12),
      strategic: [],
      unrelated: [],
      strategyResult,
      portfolioResult,
      lexicalScore,
      explanation: advances
        ? "The opportunity has an evidence-supported relationship to the active Organizational Profile or approved strategy."
        : "No evidence-supported relationship to the active Organizational Profile or approved strategy is established yet."
    };
  }

  function acquisitionValue(opportunity = {}) {
    const ceiling = parseMoney(opportunity.awardCeiling || opportunity.fundingAmount || opportunity.maximumAward);
    const floor = parseMoney(opportunity.awardFloor || opportunity.minimumAward);
    const estimated = ceiling ?? floor;
    const t = text(opportunity);
    const nonCash = /vehicle donation|equipment donation|property donation|land donation|in kind|in-kind|professional services/.test(t);
    return {
      estimated,
      nonCash,
      meaningful: nonCash || estimated === null || estimated >= 5000,
      label: estimated !== null ? `$${estimated.toLocaleString()}` : nonCash ? "Non-cash resource" : "Value not verified"
    };
  }

  function effort(opportunity = {}) {
    const t = text(opportunity);
    let score = 1;
    const drivers = [];
    if (/cost share|required match/.test(t)) { score += 2; drivers.push("cost share"); }
    if (/mandatory partner|consortium required|coalition required/.test(t)) { score += 2; drivers.push("required partnership"); }
    if (/audited financial|three years of operations|minimum annual budget/.test(t)) { score += 2; drivers.push("institutional history requirements"); }
    return { score, label: score >= 5 ? "high" : score >= 3 ? "medium" : "low", drivers };
  }

  function worth(opportunity, eligibility, advancementResult, timingResult) {
    const value = acquisitionValue(opportunity);
    const effortResult = effort(opportunity);
    const t = text(opportunity);

    const valueMeaningful =
      value.nonCash ||
      value.estimated === null ||
      value.estimated >= 10000;

    const readinessPenalty =
      effortResult.label === "high" &&
      !advancementResult.strategic.includes("capital-facility") &&
      !advancementResult.strategic.includes("future-treatment-build");

    const unclearApplicantPath = eligibility.status === "research";

    const worthPursuing =
      eligibility.hardExclusions.length === 0 &&
      advancementResult.advances &&
      timingResult.state !== "closed" &&
      valueMeaningful &&
      !readinessPenalty &&
      !unclearApplicantPath &&
      !/\bresearch partnerships notice of intent\b/.test(t);

    return {
      worthPursuing,
      value,
      effort: effortResult,
      urgency:
        timingResult.daysRemaining !== null &&
        timingResult.daysRemaining <= 14 &&
        timingResult.daysRemaining >= 0
          ? "urgent"
          : timingResult.state,
      confidence:
        eligibility.hardExclusions.length > 0 || !advancementResult.advances
          ? 0.95
          : worthPursuing
            ? 0.82
            : 0.65,
      explanation:
        worthPursuing
          ? "The expected resource or strategic return justifies executive attention."
          : unclearApplicantPath
            ? "The applicant or funded-partner path must be verified before executive pursuit."
            : "The expected return, readiness, or evidence does not yet justify active executive pursuit."
    };
  }

  function decide(opportunity = {}, context = {}) {
    const evaluatedAt = now();
    const titleGate = primaryTitleGate(opportunity);
    const eligibility = explicitEligibility(opportunity, context);
    const advances = advancement(opportunity, context);
    const timingResult = deadline(opportunity);
    const worthResult = worth(opportunity, eligibility, advances, timingResult);
    const unknowns = [];

    if (eligibility.status === "research") unknowns.push("Direct applicant or funded partner eligibility is not verified.");
    if (!timingResult.verified) unknowns.push("Application deadline is not verified.");
    if (worthResult.value.estimated === null && !worthResult.value.nonCash) unknowns.push("Resource value is not verified.");

    let decision = DECISIONS.REJECT;
    let strategicTiming = TIMING.OFF_DESK;
    let showExecutiveDirector = false;
    let acquisitionPath = "none";
    let reason = "The opportunity does not meet the Executive Resource Acquisition standard.";
    let nextAction = "Keep off the active Executive Director desk and preserve the decision evidence.";

    if (titleGate.status === "reject") {
      reason = titleGate.reason;
    } else if (titleGate.status === "research") {
      decision = DECISIONS.RESEARCH;
      strategicTiming = TIMING.BUILD_NOW_FOR_FUTURE;
      showExecutiveDirector = false;
      acquisitionPath = "unresolved-track";
      reason = titleGate.reason;
      nextAction =
        "Separate the bundled notice into its distinct program tracks and verify the active organization's eligibility for the applicable track.";
    } else if (eligibility.hardExclusions.length > 0) {
      reason = eligibility.hardExclusions[0];
    } else if (!advances.advances) {
      reason = advances.explanation;
    } else if (timingResult.state === "closed") {
      decision = DECISIONS.MONITOR;
      strategicTiming = TIMING.FUTURE_CYCLE;
      reason = "The current cycle is closed, but the opportunity aligns and may recur.";
      nextAction = "Record the next expected cycle and begin proportionate preparation.";
    } else if (eligibility.canLead === true && worthResult.worthPursuing) {
      decision = DECISIONS.PURSUE;
      acquisitionPath = "lead";
      showExecutiveDirector = true;
      strategicTiming = timingResult.state === "immediate" ? TIMING.IMMEDIATE : TIMING.NOW;
      reason = "The active organization has a plausible direct acquisition path and the opportunity advances the organization enough to justify pursuit.";
      nextAction = timingResult.state === "immediate" ? "Place on the Executive Director's immediate-action desk." : "Place on the Executive Director's pursue-now desk.";
    } else if (eligibility.canPartner === true && worthResult.worthPursuing) {
      decision = DECISIONS.PARTNER;
      acquisitionPath = "partner";
      showExecutiveDirector = true;
      strategicTiming = TIMING.NOW;
      reason = "A funded partnership path can move the active organization forward even though direct lead eligibility is not established.";
      nextAction = "Identify the strongest eligible lead and verify the active organization's funded role.";
    } else if (eligibility.status === "research" && advances.advances) {
      decision = DECISIONS.RESEARCH;
      strategicTiming = TIMING.BUILD_NOW_FOR_FUTURE;
      showExecutiveDirector = false;
      reason = "The opportunity may advance the active organization, but the lawful applicant or funded-partner path is not verified.";
      nextAction = "Keep in research and verify eligibility before placing it on the Executive Director's desk.";
    } else if (
      advances.advances &&
      worthResult.value.meaningful &&
      (eligibility.canLead === true || eligibility.canPartner === true)
    ) {
      decision = DECISIONS.PREPARE;
      showExecutiveDirector = true;
      strategicTiming = TIMING.BUILD_NOW_FOR_FUTURE;
      acquisitionPath = eligibility.canLead ? "lead" : eligibility.canPartner ? "partner" : "capacity-build";
      reason = "The opportunity advances the approved future organization, but the active organization must build readiness or wait for the correct cycle.";
      nextAction = "Place on the prepare desk with the exact capability, partnership, or timing requirement.";
    }

    const canAcquire = eligibility.hardExclusions.length > 0
      ? false
      : eligibility.canLead === true || eligibility.canPartner === true
        ? true
        : "research";

    return {
      success: true,
      schema: SCHEMA,
      version: VERSION,
      buildId: BUILD_ID,
      evaluatedAt,
      opportunityId: opportunity.id || opportunity.externalId || null,
      title: opportunity.title || "Untitled opportunity",
      resourceType: opportunity.type || opportunity.category || "resource-opportunity",
      organization: organizationName(getProfile(context)),
      canAcquire,
      acquisitionPath,
      advancesOrganization: advances.advances,
      // Deprecated compatibility alias. Remove after Grant Office consumers migrate.
      advancesCCSP: advances.advances,
      strategicTiming,
      worthPursuing: worthResult.worthPursuing,
      showExecutiveDirector,
      decision,
      recommendation: decision,
      deadline: timingResult,
      resourceValue: worthResult.value,
      effort: worthResult.effort,
      reasoning: {
        reason,
        primaryTitleGate: titleGate,
        eligibility,
        advancement: advances,
        worth: worthResult
      },
      evidence: [
        ...eligibility.evidence,
        ...advances.direct.map(id => `Organizational profile evidence: ${id}`),
        ...advances.strategic.map(id => `Strategic build path: ${id}`)
      ],
      unknowns,
      nextAction,
      executiveBrief: {
        whyOnDesk: showExecutiveDirector ? reason : "This opportunity is not recommended for the active Executive Director desk.",
        recommendation: decision,
        reason,
        nextAction,
        deadline: timingResult.label,
        resource: worthResult.value.label,
        consequenceOfDelay: timingResult.daysRemaining !== null && timingResult.daysRemaining >= 0
          ? "The current opportunity may be lost when the deadline passes."
          : "The consequence of delay is not verified."
      }
    };
  }

  function toGrantOfficeEvaluation(opportunity, resourceDecision) {
    const decisionMap = {
      pursue: "pursue-now",
      prepare: "prepare-for-future",
      partner: "pursue-with-partner",
      monitor: "watch-and-track",
      research: "request-clarification",
      reject: resourceDecision.canAcquire === false ? "skip-not-eligible" : "skip-mission-misalignment"
    };
    return {
      success: true,
      schema: "meos.grant-office.evaluation.v2",
      opportunityId: opportunity.id,
      title: opportunity.title,
      type: opportunity.type,
      authoritativeResourceDecision: resourceDecision,
      recommendation: {
        decision: decisionMap[resourceDecision.decision],
        rationale: resourceDecision.reasoning.reason,
        nextAction: resourceDecision.nextAction
      },
      timing: resourceDecision.deadline,
      missingInformation: resourceDecision.unknowns,
      executiveSummary: resourceDecision.executiveBrief,
      evaluatedAt: resourceDecision.evaluatedAt,
      evaluatedBy: NAME,
      executiveApprovalRequired: resourceDecision.showExecutiveDirector
    };
  }

  function runAcceptanceTest() {
    const future = days => new Date(Date.now() + days * 86400000).toISOString();
    const nonprofit = {
      organization: { legalName: "Example Community Recovery", organizationType: "501(c)(3) nonprofit public charity" },
      purpose: { mission: "Veteran recovery housing outreach employment and community stabilization" },
      legalAndOperationalBoundaries: { doesProvide: ["Veteran support", "Recovery services", "Housing pathways"] }
    };
    const creatorBusiness = {
      organization: { legalName: "Example Creator Studio LLC", organizationType: "for profit LLC business" },
      purpose: { mission: "Digital creator production marketing technology and audience growth" },
      programs: { studio: { purpose: "Creator production equipment and digital media technology" } }
    };
    const veteranOpportunity = {
      id: "neutral-veteran",
      title: "Veteran Recovery and Housing Support",
      description: "Funding for nonprofit organizations serving eligible veterans with recovery housing and employment services.",
      eligibleApplicants: ["nonprofit organizations"],
      awardCeiling: 250000,
      deadline: future(30)
    };
    const businessOpportunity = {
      id: "neutral-business",
      title: "Small Business Digital Creator Technology Grant",
      description: "Capital technology and production equipment funding for eligible for profit small businesses and digital creator companies.",
      eligibleApplicants: ["for profit small businesses"],
      awardCeiling: 50000,
      deadline: future(30)
    };

    const cases = [
      { name: "Veteran opportunity can advance a veteran-serving nonprofit", opportunity: veteranOpportunity, context: { organizationProfile: nonprofit }, expectedLead: true, expectedAdvance: true },
      { name: "For-profit creator opportunity does not inherit nonprofit eligibility", opportunity: businessOpportunity, context: { organizationProfile: nonprofit }, expectedLead: null },
      { name: "For-profit creator opportunity can advance a matching business", opportunity: businessOpportunity, context: { organizationProfile: creatorBusiness }, expectedLead: true, expectedAdvance: true },
      { name: "Missing organization profile fails into research, not a customer assumption", opportunity: businessOpportunity, context: {}, expectedStatus: "research" }
    ];

    const checks = cases.map(testCase => {
      const result = decide(testCase.opportunity, testCase.context);
      const eligibility = result.reasoning.eligibility;
      const passed =
        (testCase.expectedLead === undefined || eligibility.canLead === testCase.expectedLead) &&
        (testCase.expectedAdvance === undefined || result.advancesOrganization === testCase.expectedAdvance) &&
        (testCase.expectedStatus === undefined || eligibility.status === testCase.expectedStatus);
      return { name: testCase.name, passed, result };
    });

    return {
      success: checks.every(check => check.passed),
      schema: "meos.executive-resource-acquisition.acceptance-test.v3",
      version: VERSION,
      buildId: BUILD_ID,
      passed: checks.filter(check => check.passed).length,
      total: checks.length,
      checks
    };
  }

  const api = Object.freeze({
    name: NAME,
    version: VERSION,
    buildId: BUILD_ID,
    schema: SCHEMA,
    decisions: DECISIONS,
    timing: TIMING,
    decide,
    toGrantOfficeEvaluation,
    runAcceptanceTest
  });

  global.ExecutiveResourceAcquisitionEngine = api;
  global.MEOSExecutiveResourceAcquisitionEngine = api;

  console.info(`[MEOS] ${NAME} v${VERSION} online. Build ${BUILD_ID}.`);
})(window);
