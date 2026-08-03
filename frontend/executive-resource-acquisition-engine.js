/*
 * Maddy Executive Operating System (MEOS)
 * Executive Resource Acquisition Engine
 *
 * Version: 2.0.0
 * Build: ERAE200-ONE-AUTHORITY-20260803-A
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
  const VERSION = "2.0.0";
  const BUILD_ID = "ERAE200-ONE-AUTHORITY-20260803-A";
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
    const evidence = [];
    const hardExclusions = [];

    if (/nonprofits? (?:are )?not eligible|501 c 3 (?:organizations? )?not eligible|for profit entities only|individuals only/.test(t)) {
      hardExclusions.push("The notice explicitly excludes nonprofit applicants.");
    }

    if (/foreign entities only|activities must (?:be )?(?:conducted|performed) outside the united states|work (?:in|within) (?:uganda|kenya|somalia|djibouti|myanmar|algeria|indonesia)/.test(t)) {
      hardExclusions.push("The funded work is outside CCSP's approved operating footprint.");
    }

    const youthOnly = /runaway and homeless youth|youth homelessness|youth only|children only|adolescents only/.test(t);
    const broadPopulation = /all ages|adults and families|general population|community wide/.test(t);
    if (youthOnly && !broadPopulation) {
      hardExclusions.push("The opportunity is restricted to a youth-only population that CCSP is not organized to serve exclusively.");
    }

    const researchInstitutionOnly = /institutions? of higher education only|research institutions? only|eligible applicants?[^.]{0,120}(?:universit|medical school)/.test(t);
    const clinicalResearch = /clinical trial|r01|u01|u24|r25|k12|rm1|dissertation research award|research education program/.test(t);
    if (researchInstitutionOnly || clinicalResearch) {
      hardExclusions.push("The opportunity funds specialized academic or clinical research rather than CCSP program delivery or organizational development.");
    }

    const canLead = /nonprofits?|501 c 3|community based organizations?|public charities?/.test(t) ? true : null;
    const canPartner = /subrecipient|subaward|implementation partner|community partner|coalition|consortium/.test(t) ? true : null;
    if (canLead === true) evidence.push("Nonprofit applicant path found.");
    if (canPartner === true) evidence.push("Funded partnership path found.");

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
      ["mobile-hygiene", /mobile hygiene|mobile shower|shower trailer|hygiene services|sanitation services/],
      ["homelessness-outreach", /homelessness|unsheltered|street outreach|encampment outreach/],
      ["recovery-treatment", /substance use disorder|addiction treatment|recovery services|sober living|overdose prevention/],
      ["housing-stabilization", /supportive housing|transitional housing|housing navigation|community stabilization|continuum of care/],
      ["employment-self-sufficiency", /workforce development|job training|employment services|career pathways|economic mobility/],
      ["watershed-health", /san lorenzo river|monterey bay|watershed protection|water quality|pollution prevention/]
    ];
    const strategicRules = [
      ["operating-capacity", /general operating support|unrestricted support|capacity building|organizational development|technology grant/],
      ["capital-facility", /capital grant|facility acquisition|building acquisition|land acquisition|property donation|facility renovation/],
      ["vehicle-equipment", /vehicle donation|fleet donation|equipment donation|mobile unit|trailer donation|capital equipment/],
      ["future-treatment-build", /treatment facility|rehabilitation center|recovery campus|behavioral health facility/],
      ["funded-service-path", /service contract|government contract|subrecipient|implementation partner/]
    ];
    const unrelatedRules = [
      ["natural-resource-sector", /forest and woodlands|wildland fire science|rangeland resource|invasive and noxious plant|abandoned mine lands|oil and gas recovery|desalination and water purification research|plant conservation and restoration/],
      ["academic-research", /clinical trial|research center|research infrastructure|medical student education|scientist development program|dissertation research/],
      ["municipal-utility", /municipal wastewater|water treatment systems|public water system|electric grid/]
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
    const explicitPath = direct.length > 0 || strategic.length > 0 || strategyScore >= 60 || portfolioScore >= 60;
    const unrelatedDominant = unrelated.length > 0 && direct.length === 0 && strategic.length === 0 && strategyScore < 70 && portfolioScore < 70;

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
    const urgent = timingResult.daysRemaining !== null && timingResult.daysRemaining <= 14 && timingResult.daysRemaining >= 0;
    const worthPursuing = eligibility.hardExclusions.length === 0 && advancementResult.advances && value.meaningful;
    return {
      worthPursuing,
      value,
      effort: effortResult,
      urgency: urgent ? "urgent" : timingResult.state,
      explanation: !advancementResult.advances
        ? "The opportunity does not move CCSP forward."
        : !value.meaningful
          ? "The expected return does not justify executive time."
          : "The expected resource value and strategic benefit justify executive attention."
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
    } else if (eligibility.status === "research" && worthResult.worthPursuing) {
      decision = DECISIONS.RESEARCH;
      strategicTiming = TIMING.BUILD_NOW_FOR_FUTURE;
      reason = "The opportunity appears strategically valuable, but acquisition eligibility is not verified.";
      nextAction = "Resolve the specific eligibility and money-flow unknowns before a desk decision.";
    } else if (advances.advances && worthResult.value.meaningful) {
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
      {
        name: "Direct operating support reaches desk",
        opportunity: { id: "good-operating", title: "California Nonprofit General Operating Support", description: "Unrestricted general operating support for California 501(c)(3) nonprofit organizations.", eligibleApplicants: ["501(c)(3) nonprofits"], awardCeiling: 250000, deadline: future(10) },
        expected: { show: true, decision: "pursue" }
      },
      {
        name: "Mobile unit funding reaches desk",
        opportunity: { id: "good-mobile", title: "Mobile Hygiene Vehicle and Equipment Grant", description: "Capital equipment and mobile shower vehicle funding for community-based nonprofit organizations.", eligibleApplicants: ["nonprofits"], awardCeiling: 100000, deadline: future(5) },
        expected: { show: true, decision: "pursue" }
      },
      {
        name: "Future facility grant is prepared",
        opportunity: { id: "good-future", title: "Capital Facility Acquisition Grant", description: "Building acquisition and facility renovation for nonprofit behavioral health and recovery organizations.", eligibleApplicants: ["nonprofits"], awardCeiling: 2000000, deadline: future(180) },
        expected: { show: true, decisions: ["pursue", "prepare"] }
      },
      {
        name: "Youth-only opportunity stays off desk",
        opportunity: { id: "bad-youth", title: "Youth Homelessness Demonstration", description: "Services exclusively for runaway and homeless youth ages 12 to 17. Nonprofits eligible.", eligibleApplicants: ["nonprofits"], awardCeiling: 1000000, deadline: future(20) },
        expected: { show: false, decision: "reject" }
      },
      {
        name: "Wildland research stays off desk",
        opportunity: { id: "bad-fire", title: "Wildland Fire Science Research Program", description: "University research into wildland fire science and forest management. Nonprofits may apply.", eligibleApplicants: ["nonprofits"], awardCeiling: 500000, deadline: future(30) },
        expected: { show: false, decision: "reject" }
      },
      {
        name: "Clinical research stays off desk",
        opportunity: { id: "bad-clinical", title: "Substance Use Clinical Trial R01", description: "Clinical trial research for university medical research institutions.", awardCeiling: 1500000, deadline: future(100) },
        expected: { show: false, decision: "reject" }
      }
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
      schema: "meos.executive-resource-acquisition.acceptance-test.v1",
      version: VERSION,
      buildId: BUILD_ID,
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
