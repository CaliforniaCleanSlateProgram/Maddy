/*
 * Maddy Executive Operating System (MEOS)
 * Executive Resource Acquisition Engine
 *
 * Version: 2.1.0
 * Build: ERAE210-DECISION-QUALITY-20260803-A
 *
 * Mission:
 * Make one authoritative executive decision for every grant or resource
 * opportunity: can CCSP acquire it, does it advance CCSP, is it worth the
 * executive time, when should action occur, and should it reach the
 * Executive Director's desk?
 */

(function initializeExecutiveResourceAcquisitionEngine(global) {
  "use strict";

  const NAME = "MEOS Executive Resource Acquisition Engine";
  const VERSION = "2.1.0";
  const BUILD_ID = "ERAE210-DECISION-QUALITY-20260803-A";
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

  function text(opportunity = {}) {
    return normalize([
      opportunity.title,
      opportunity.description,
      opportunity.statedPurpose,
      opportunity.category,
      opportunity.type,
      opportunity.provider,
      opportunity.agencyName,
      opportunity.geography,
      opportunity.location,
      ...array(opportunity.eligibleApplicants),
      opportunity.additionalEligibilityInformation,
      ...array(opportunity.targetPopulations),
      ...array(opportunity.desiredOutcomes),
      ...array(opportunity.fundingAreas),
      opportunity.fullNotice,
      opportunity.raw
    ].map(value => typeof value === "object" ? JSON.stringify(value) : value).join(" "));
  }

  function getProfile(context = {}) {
    return context.organizationProfile ||
      global.CCSPOrganizationalProfile ||
      global.OrganizationalProfile ||
      null;
  }

  function getStrategy(context = {}) {
    return context.longTermStrategy || global.CCSPLongTermStrategy || null;
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

  function explicitEligibility(opportunity = {}) {
    const t = text(opportunity);
    const title = normalize(opportunity.title);
    const evidence = [];
    const hardExclusions = [];

    const explicitNonprofitPath =
      /\b501 c 3\b|\bnonprofits?\b|\bnonprofit organizations?\b|\bpublic charities?\b|\bcommunity based organizations?\b/.test(t);
    const explicitPartnerPath =
      /\bsubrecipient\b|\bsubaward\b|\bimplementation partner\b|\bcommunity partner\b|\bfunded partner\b/.test(t);

    if (/nonprofits? (?:are )?not eligible|501 c 3 (?:organizations? )?not eligible|for profit entities only|individuals only/.test(t)) {
      hardExclusions.push("The notice explicitly excludes nonprofit applicants.");
    }

    if (
      /\bamerican center\b|\bjefferson center\b|\bu s embassy\b|\bunited states embassy\b|\bpublic diplomacy\b/.test(t) ||
      /\bmandalay\b|\byangon\b|\bmyanmar\b|\bsomalia\b|\buganda\b|\bkenya\b|\bdjibouti\b|\balgeria\b|\bindonesia\b/.test(title) ||
      /activities must (?:be )?(?:conducted|performed) outside the united states/.test(t)
    ) {
      hardExclusions.push("The funded work or beneficiaries are outside CCSP's approved United States operating footprint.");
    }

    const youthOnly =
      /\brunaway and homeless youth\b|\byouth homelessness\b|\byouth only\b|\bchildren only\b|\badolescents only\b|\bages? 12 to 17\b|\bages? 14 to 24\b/.test(t);
    const broadPopulation =
      /\ball ages\b|\badults and families\b|\bgeneral population\b|\bcommunity wide\b/.test(t);

    if (youthOnly && !broadPopulation) {
      hardExclusions.push("The opportunity is restricted to a youth-only population that CCSP is not organized to serve exclusively.");
    }

    if (/\bveterans only\b|\beligible veterans\b|\bveteran households only\b|\bstand down grants\b/.test(t)) {
      hardExclusions.push("The opportunity is restricted to veterans or veteran-serving organizations rather than CCSP's general mission population.");
    }

    if (/\btribal colleges and universities\b|\bfederally recognized tribes only\b|\btribal entities only\b/.test(t) && !explicitPartnerPath) {
      hardExclusions.push("The opportunity is restricted to tribal institutions or entities without a verified funded CCSP partner role.");
    }

    if (/\binstitutions? of higher education only\b|\bresearch institutions? only\b|\buniversity research\b|\bclinical trial\b|\br01\b|\bu01\b|\bu24\b|\br25\b|\bk12\b|\brm1\b|\bdissertation research award\b|\bresearch education program\b|\bresearch centers?\b/.test(t)) {
      hardExclusions.push("The opportunity funds specialized academic, scientific, or clinical research rather than CCSP service delivery or organizational development.");
    }

    const governmentOnly =
      /\bstate governments only\b|\bcounty governments only\b|\bcity governments only\b|\bmunicipalities only\b|\bpublic water systems only\b|\blaw enforcement agencies only\b/.test(t);
    const partnerAllowed =
      /\bnonprofit partners?\b|\bcommunity based organization partners?\b|\bsubrecipient\b|\bsubaward\b/.test(t);

    if (governmentOnly && !partnerAllowed) {
      hardExclusions.push("The applicant pool is restricted to government or public agencies and no funded CCSP partner path is established.");
    }

    const canLead = hardExclusions.length ? false : explicitNonprofitPath ? true : null;
    const canPartner = hardExclusions.length ? false : explicitPartnerPath ? true : null;

    if (canLead === true) evidence.push("Explicit nonprofit applicant path found.");
    if (canPartner === true) evidence.push("Explicit funded partnership path found.");

    return {
      canLead,
      canPartner,
      hardExclusions,
      evidence,
      status: hardExclusions.length ? "ineligible" : (canLead || canPartner ? "plausible" : "research")
    };
  }

  function advancement(opportunity = {}, context = {}) {
    const t = text(opportunity);
    const direct = [];
    const strategic = [];
    const unrelated = [];

    const directRules = [
      ["mobile-hygiene", /\bmobile hygiene\b|\bmobile shower\b|\bshower trailer\b|\bhygiene services\b|\bsanitation services\b|\blaundry services\b/],
      ["general-homelessness-outreach", /\bhomelessness\b|\bunsheltered\b|\bstreet outreach\b|\bencampment outreach\b|\bhousing insecurity\b/],
      ["recovery-treatment-navigation", /\bsubstance use disorder services\b|\baddiction treatment services\b|\brecovery services\b|\bsober living\b|\btreatment navigation\b|\boverdose prevention services\b/],
      ["housing-stabilization", /\bsupportive housing\b|\btransitional housing\b|\bhousing navigation\b|\bcommunity stabilization\b|\brapid rehousing\b/],
      ["employment-self-sufficiency", /\bworkforce development\b|\bjob training\b|\bemployment services\b|\bcareer pathways\b|\beconomic self sufficiency\b/],
      ["watershed-health", /\bsan lorenzo river\b|\bmonterey bay\b|\bwatershed protection\b|\bwater quality improvement\b|\bpollution prevention\b/]
    ];

    const strategicRules = [
      ["general-operating-support", /\bgeneral operating support\b|\bunrestricted operating support\b|\bunrestricted funding\b/],
      ["organizational-capacity", /\bnonprofit capacity building\b|\borganizational development\b|\btechnology capacity\b|\bboard development\b/],
      ["capital-facility", /\bcapital grant\b|\bcapital funding\b|\bfacility acquisition\b|\bbuilding acquisition\b|\bland acquisition\b|\bproperty donation\b|\bfacility renovation\b|\brecovery facility\b/],
      ["vehicle-equipment", /\bvehicle donation\b|\bfleet donation\b|\bequipment donation\b|\bmobile unit\b|\btrailer donation\b|\bcapital equipment\b/],
      ["future-treatment-build", /\btreatment facility\b|\brehabilitation center\b|\brecovery campus\b|\bbehavioral health facility\b|\brecovery facility\b/],
      ["funded-service-path", /\bservice contract\b|\bgovernment contract\b|\bsubrecipient\b|\bimplementation partner\b|\bfunded partner\b/]
    ];

    const unrelatedRules = [
      ["foreign-diplomatic", /\bamerican center\b|\bjefferson center\b|\bpublic diplomacy\b|\bembassy small grants\b/],
      ["natural-resource-management", /\bforest and woodlands\b|\bwildland fire science\b|\brangeland resource\b|\binvasive and noxious plant\b|\babandoned mine lands\b|\boil and gas recovery\b|\bferal swine\b|\bplant conservation and restoration\b|\bregional conservation partnership program\b|\bcoastal program\b/],
      ["scientific-research", /\bdesalination and water purification research\b|\bresearch projects\b|\bresearch center\b|\bresearch infrastructure\b|\bclinical trial\b|\bcausal hypotheses\b|\binformatics technologies for research\b/],
      ["municipal-utility", /\bmunicipal wastewater\b|\bwastewater treatment systems\b|\bpublic water system\b|\belectric grid\b/],
      ["education-program", /\bpersonal responsibility education\b|\bmedical student education\b|\boccupational safety and health education and research centers\b/],
      ["law-enforcement-court", /\bdrug court training\b|\blaw enforcement products\b|\bprosecutor\b|\bcorrectional agency\b/],
      ["disaster-economic-development", /\beda fy25 disaster supplemental\b|\beconomic development administration\b|\bdisaster supplemental\b/]
    ];

    directRules.forEach(([id, rule]) => { if (rule.test(t)) direct.push(id); });
    strategicRules.forEach(([id, rule]) => { if (rule.test(t)) strategic.push(id); });
    unrelatedRules.forEach(([id, rule]) => { if (rule.test(t)) unrelated.push(id); });

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
    const explicitPath =
      direct.length > 0 ||
      strategic.length > 0 ||
      strategyScore >= 75 ||
      portfolioScore >= 75;
    const unrelatedDominant =
      unrelated.length > 0 &&
      direct.length === 0 &&
      strategic.length === 0;

    return {
      advances: explicitPath && !unrelatedDominant,
      direct,
      strategic,
      unrelated,
      strategyResult,
      portfolioResult,
      explanation: unrelatedDominant
        ? "The primary funded work is outside CCSP's mission and approved strategic buildout."
        : explicitPath
          ? "The opportunity has an evidence-supported path to current operations or the approved future organization."
          : "No evidence-supported path to CCSP's current mission or approved future buildout is established."
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
    const eligibility = explicitEligibility(opportunity);
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

    if (eligibility.hardExclusions.length > 0) {
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
      reason = "CCSP has a plausible direct acquisition path and the opportunity advances the organization enough to justify pursuit.";
      nextAction = timingResult.state === "immediate" ? "Place on the Executive Director's immediate-action desk." : "Place on the Executive Director's pursue-now desk.";
    } else if (eligibility.canPartner === true && worthResult.worthPursuing) {
      decision = DECISIONS.PARTNER;
      acquisitionPath = "partner";
      showExecutiveDirector = true;
      strategicTiming = TIMING.NOW;
      reason = "A funded partnership path can move CCSP forward even though direct lead eligibility is not established.";
      nextAction = "Identify the strongest eligible lead and verify CCSP's funded role.";
    } else if (eligibility.status === "research" && advances.advances) {
      decision = DECISIONS.RESEARCH;
      strategicTiming = TIMING.BUILD_NOW_FOR_FUTURE;
      showExecutiveDirector = false;
      reason = "The opportunity may advance CCSP, but the lawful applicant or funded-partner path is not verified.";
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
      reason = "The opportunity advances the approved future organization, but CCSP must build readiness or wait for the correct cycle.";
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
      canAcquire,
      acquisitionPath,
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
        eligibility,
        advancement: advances,
        worth: worthResult
      },
      evidence: [
        ...eligibility.evidence,
        ...advances.direct.map(id => `Direct mission path: ${id}`),
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

    const cases = [
      { name: "Direct operating support reaches desk", opportunity: { id: "good-operating", title: "California Nonprofit General Operating Support", description: "Unrestricted general operating support for California 501(c)(3) nonprofit organizations.", eligibleApplicants: ["501(c)(3) nonprofits"], awardCeiling: 250000, deadline: future(10) }, expected: { show: true, decision: "pursue" } },
      { name: "Mobile unit funding reaches desk", opportunity: { id: "good-mobile", title: "Mobile Hygiene Vehicle and Equipment Grant", description: "Capital equipment and mobile shower vehicle funding for community-based nonprofit organizations.", eligibleApplicants: ["nonprofits"], awardCeiling: 100000, deadline: future(5) }, expected: { show: true, decision: "pursue" } },
      { name: "General street outreach reaches desk", opportunity: { id: "good-outreach", title: "Community Street Outreach Program", description: "Funding for nonprofit organizations providing street outreach to unsheltered adults and families.", eligibleApplicants: ["nonprofit organizations"], awardCeiling: 200000, deadline: future(14) }, expected: { show: true, decision: "pursue" } },
      { name: "Future facility grant reaches prepare or pursue", opportunity: { id: "good-future", title: "Capital Facility Acquisition Grant", description: "Building acquisition and facility renovation for nonprofit behavioral health and recovery organizations.", eligibleApplicants: ["nonprofits"], awardCeiling: 2000000, deadline: future(180) }, expected: { show: true, decisions: ["pursue", "prepare"] } },
      { name: "Youth-only opportunity stays off desk", opportunity: { id: "bad-youth", title: "Youth Homelessness Demonstration", description: "Services exclusively for runaway and homeless youth ages 12 to 17. Nonprofits eligible.", eligibleApplicants: ["nonprofits"], awardCeiling: 1000000, deadline: future(20) }, expected: { show: false, decision: "reject" } },
      { name: "Mandalay diplomatic grant stays off desk", opportunity: { id: "bad-mandalay", title: "Jefferson Center Mandalay Small Grants Competition", description: "U.S. Embassy public diplomacy grants for activities in Mandalay, Myanmar. Nonprofits may apply.", eligibleApplicants: ["nonprofits"], awardCeiling: 50000, deadline: future(7) }, expected: { show: false, decision: "reject" } },
      { name: "Yangon diplomatic grant stays off desk", opportunity: { id: "bad-yangon", title: "American Center Yangon Small Grants Competition", description: "Public diplomacy activities for beneficiaries in Yangon, Myanmar.", eligibleApplicants: ["nonprofits"], awardCeiling: 50000, deadline: future(7) }, expected: { show: false, decision: "reject" } },
      { name: "Wildland research stays off desk", opportunity: { id: "bad-fire", title: "Wildland Fire Science Research Program", description: "University research into wildland fire science and forest management. Nonprofits may apply.", eligibleApplicants: ["nonprofits"], awardCeiling: 500000, deadline: future(30) }, expected: { show: false, decision: "reject" } },
      { name: "Oil and gas technology stays off desk", opportunity: { id: "bad-oil", title: "Improved Oil and Gas Recovery and Produced Water Management Technologies", description: "Research and development for oil and gas recovery technologies. Nonprofits may apply.", eligibleApplicants: ["nonprofits"], awardCeiling: 1000000, deadline: future(36) }, expected: { show: false, decision: "reject" } },
      { name: "Desalination research stays off desk", opportunity: { id: "bad-desalination", title: "Desalination and Water Purification Research Program: Research Projects", description: "Scientific research projects on desalination and water purification.", eligibleApplicants: ["nonprofits"], awardCeiling: 800000, deadline: future(57) }, expected: { show: false, decision: "reject" } },
      { name: "Municipal wastewater program stays off desk", opportunity: { id: "bad-wastewater", title: "Technical Assistance for Rural Municipalities and Wastewater Treatment Systems", description: "Technical assistance to municipal wastewater treatment systems and public utilities.", eligibleApplicants: ["municipalities only"], awardCeiling: 3000000, deadline: future(11) }, expected: { show: false, decision: "reject" } },
      { name: "Veteran-only Stand Down grant stays off desk", opportunity: { id: "bad-veteran", title: "Announcement of Stand Down Grants", description: "Funding for organizations serving eligible veterans through Stand Down events.", eligibleApplicants: ["nonprofits"], awardCeiling: 10000, deadline: future(58) }, expected: { show: false, decision: "reject" } },
      { name: "Clinical research stays off desk", opportunity: { id: "bad-clinical", title: "Substance Use Clinical Trial R01", description: "Clinical trial research for university medical research institutions.", awardCeiling: 1500000, deadline: future(100) }, expected: { show: false, decision: "reject" } },
      { name: "Unknown applicant path stays in research and off desk", opportunity: { id: "research-eligibility", title: "Regional Recovery Facility Capital Opportunity", description: "Capital funding for a regional recovery facility. Applicant types are not stated.", awardCeiling: 2500000, deadline: future(60) }, expected: { show: false, decision: "research" } }
    ];

    const checks = cases.map(testCase => {
      const result = decide(testCase.opportunity, {});
      const expectedDecision = testCase.expected.decisions
        ? testCase.expected.decisions.includes(result.decision)
        : result.decision === testCase.expected.decision;
      return {
        name: testCase.name,
        passed: result.showExecutiveDirector === testCase.expected.show && expectedDecision,
        result
      };
    });

    return {
      success: checks.every(check => check.passed),
      schema: "meos.executive-resource-acquisition.acceptance-test.v2",
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
