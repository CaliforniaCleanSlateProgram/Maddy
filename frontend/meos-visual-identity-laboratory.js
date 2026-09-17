/**
 * Maddy Executive Operating System (MEOS)
 * Visual Identity Laboratory
 *
 * Commission: VISUAL.002 — Canonical Identity Preservation Laboratory
 * Version: 1.0.0
 * Build: MVIL100-CANONICAL-IDENTITY-PRESERVATION-LABORATORY-20260917-A
 *
 * Purpose:
 * - Turn VISUAL.001 identity authority into a repeatable empirical experiment.
 * - Define the first five-view Canonical Maddy identity-preservation challenge.
 * - Keep every candidate directly anchored to Canonical V2 rather than to a
 *   previous generated descendant.
 * - Record renderer provenance and explicit human canonical judgments without
 *   pretending MEOS already possesses biometric identity-equivalence vision.
 * - Gate novel-view progression on evidence from the complete five-view set.
 *
 * This organ does not generate images. A renderer may be local, rented,
 * open-source, commercial, or future MEOS-native machinery. The renderer does
 * not own Maddy and its output never becomes canonical merely by being recent.
 */

(function initializeMEOSVisualIdentityLaboratory(global) {
  "use strict";

  const NAME = "MEOS Visual Identity Laboratory";
  const VERSION = "1.0.0";
  const BUILD_ID = "MVIL100-CANONICAL-IDENTITY-PRESERVATION-LABORATORY-20260917-A";
  const SCHEMA = "meos.visual-identity-laboratory.v1";
  const EXPERIMENT_SCHEMA = "meos.visual-identity.experiment.v1";
  const OBSERVATION_SCHEMA = "meos.visual-identity.observation.v1";
  const REPORT_SCHEMA = "meos.visual-identity.experiment-report.v1";

  const root = typeof global !== "undefined" ? global : globalThis;
  root.MEOS = root.MEOS || {};

  const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const freeze = (value) => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(freeze);
    return value;
  };
  const normalizeText = (value) => String(value ?? "").trim();
  const nowIso = () => new Date().toISOString();

  function resolveAuthority() {
    const authority = root.MEOS?.VisualIdentityAuthority || root.MEOSVisualIdentityAuthority;
    if (!authority || typeof authority.getCanonicalMaddy !== "function" ||
        typeof authority.buildCanonicalRenderRequest !== "function" ||
        typeof authority.validateCandidateEvidence !== "function") {
      throw new Error(`${NAME}: VISUAL.001 MEOS Visual Identity Authority is required before the laboratory can operate.`);
    }
    return authority;
  }

  const FIVE_VIEW_PROTOCOL = freeze([
    {
      trialId: "maddy-view-01-front",
      label: "Straight-on executive portrait",
      challengeClass: "baseline-front",
      presentation: {
        hairstyle: "canonical-reference",
        wardrobe: "executive",
        expression: "confident-neutral",
        pose: "portrait-straight-on",
        camera: "front",
        lighting: "clean-neutral",
        background: "neutral"
      }
    },
    {
      trialId: "maddy-view-02-three-quarter-left",
      label: "Three-quarter left with changed hair and wardrobe",
      challengeClass: "presentation-variation",
      presentation: {
        hairstyle: "straightened",
        wardrobe: "modern-business",
        expression: "warm-neutral",
        pose: "three-quarter-left",
        camera: "three-quarter-left",
        lighting: "soft-daylight",
        background: "transparent"
      }
    },
    {
      trialId: "maddy-view-03-profile",
      label: "Full side profile",
      challengeClass: "geometry-stress",
      presentation: {
        hairstyle: "low-bun",
        wardrobe: "executive-casual",
        expression: "neutral",
        pose: "left-profile",
        camera: "left-profile",
        lighting: "neutral-profile",
        background: "neutral"
      }
    },
    {
      trialId: "maddy-view-04-three-quarter-right",
      label: "Three-quarter right with changed styling",
      challengeClass: "presentation-variation",
      presentation: {
        hairstyle: "loose-slight-curl",
        wardrobe: "contemporary-professional",
        expression: "subtle-smile",
        pose: "three-quarter-right",
        camera: "three-quarter-right",
        lighting: "warm-interior",
        background: "transparent"
      }
    },
    {
      trialId: "maddy-view-05-full-body",
      label: "Full-body standing identity challenge",
      challengeClass: "body-context-stress",
      presentation: {
        hairstyle: "ponytail",
        wardrobe: "executive-full-body",
        expression: "confident-neutral",
        pose: "standing-presenter",
        camera: "full-body-front",
        lighting: "presentation-stage-neutral",
        background: "transparent"
      }
    }
  ]);

  const IDENTITY_REVIEW_QUESTION = "Did Maddy remain Maddy?";
  const REVIEW_CRITERIA = freeze([
    "recognizable facial identity",
    "identity-defining facial geometry and proportions",
    "eyes and their characteristic relationship",
    "nose shape and relationship to the face",
    "mouth and lip relationship",
    "jaw and lower-face structure",
    "overall identity continuity despite authorized presentation changes"
  ]);

  function buildFiveViewExperiment(options = {}) {
    const authority = resolveAuthority();
    const canonical = authority.getCanonicalMaddy();
    const renderer = normalizeText(options.renderer || "unassigned");
    const experimentId = normalizeText(options.experimentId) || `maddy-five-view-${Date.now()}`;

    const trials = FIVE_VIEW_PROTOCOL.map((protocol) => {
      const candidateId = `${experimentId}:${protocol.trialId}`;
      return {
        ...clone(protocol),
        candidateId,
        renderRequest: authority.buildCanonicalRenderRequest({
          candidateId,
          renderer,
          purpose: `VISUAL.002 five-view identity preservation — ${protocol.label}`,
          presentation: protocol.presentation
        }),
        requiredComparison: {
          directCanonicalAssetId: canonical.anchors.primary.assetId,
          directCanonicalSha256: canonical.anchors.primary.sha256,
          supportingLineageAssetIds: canonical.anchors.supporting.map((item) => item.assetId),
          knownNegativeControlAssetIds: canonical.anchors.negativeControls.map((item) => item.assetId),
          previousGeneratedCandidateIsSoleAnchor: false
        }
      };
    });

    return {
      schema: EXPERIMENT_SCHEMA,
      experimentId,
      createdAt: nowIso(),
      commission: "VISUAL.002",
      identityId: canonical.identityId,
      visualIdentityVersion: canonical.visualIdentityVersion,
      renderer,
      canonicalAnchor: clone(canonical.anchors.primary),
      supportingLineage: clone(canonical.anchors.supporting),
      negativeControls: clone(canonical.anchors.negativeControls),
      reviewQuestion: IDENTITY_REVIEW_QUESTION,
      reviewCriteria: clone(REVIEW_CRITERIA),
      antiDriftDoctrine: {
        compareEveryCandidateDirectlyToCanonical: true,
        previousCandidateMayBeSoleIdentityReference: false,
        generatedCandidateMayBecomeCanonicalByRecency: false,
        similarityAloneIsSufficient: false
      },
      progressionGate: {
        requiredAcceptedTrials: FIVE_VIEW_PROTOCOL.length,
        totalTrials: FIVE_VIEW_PROTOCOL.length,
        novelViewUnlockedOnlyAfterCompletePass: true
      },
      trials
    };
  }

  function findTrial(experiment, trialId) {
    if (!experiment || experiment.schema !== EXPERIMENT_SCHEMA || !Array.isArray(experiment.trials)) {
      throw new Error(`${NAME}: a valid VISUAL.002 experiment is required.`);
    }
    const normalizedTrialId = normalizeText(trialId);
    const trial = experiment.trials.find((item) => item.trialId === normalizedTrialId);
    if (!trial) throw new Error(`${NAME}: unknown trial '${normalizedTrialId}'.`);
    return trial;
  }

  function recordObservation(experiment, input = {}) {
    const authority = resolveAuthority();
    const trial = findTrial(experiment, input.trialId);
    const artifact = normalizeText(input.artifact);
    const renderer = normalizeText(input.renderer || experiment.renderer || trial.renderRequest.renderer);
    const judgment = normalizeText(input.humanCanonicalJudgment).toLowerCase();
    const reviewer = normalizeText(input.reviewer || "human-canonical-reviewer");
    const notes = normalizeText(input.notes);
    const comparedToCanonical = input.comparedToCanonical === true;

    if (!artifact) throw new Error(`${NAME}: observation requires an artifact reference.`);
    if (!renderer) throw new Error(`${NAME}: observation requires renderer provenance.`);
    if (!new Set(["pass", "fail"]).has(judgment)) {
      throw new Error(`${NAME}: humanCanonicalJudgment must be explicit 'pass' or 'fail'.`);
    }

    const validation = authority.validateCandidateEvidence({
      identityId: experiment.identityId,
      candidateId: trial.candidateId,
      renderer,
      artifact,
      canonicalAnchorSha256: trial.requiredComparison.directCanonicalSha256,
      comparedToCanonical,
      humanCanonicalJudgment: judgment
    });

    return {
      schema: OBSERVATION_SCHEMA,
      experimentId: experiment.experimentId,
      trialId: trial.trialId,
      candidateId: trial.candidateId,
      observedAt: nowIso(),
      artifact,
      renderer,
      reviewer,
      reviewQuestion: experiment.reviewQuestion,
      humanCanonicalJudgment: judgment,
      comparedToCanonical,
      notes: notes || null,
      presentation: clone(trial.presentation),
      canonicalAnchorSha256: trial.requiredComparison.directCanonicalSha256,
      validation,
      acceptedAsCanonicalMaddyRender: validation.identityAccepted === true,
      canonicalAuthorityChanged: false
    };
  }

  function buildExperimentReport(experiment, observations = []) {
    if (!Array.isArray(observations)) throw new TypeError(`${NAME}: observations must be an array.`);
    const trialIds = new Set(experiment.trials.map((trial) => trial.trialId));
    const latest = new Map();

    observations.forEach((observation) => {
      if (!observation || observation.schema !== OBSERVATION_SCHEMA) return;
      if (observation.experimentId !== experiment.experimentId) return;
      if (!trialIds.has(observation.trialId)) return;
      latest.set(observation.trialId, observation);
    });

    const results = experiment.trials.map((trial) => {
      const observation = latest.get(trial.trialId) || null;
      return {
        trialId: trial.trialId,
        label: trial.label,
        challengeClass: trial.challengeClass,
        candidateId: trial.candidateId,
        observed: Boolean(observation),
        accepted: observation?.acceptedAsCanonicalMaddyRender === true,
        observation: clone(observation)
      };
    });

    const observed = results.filter((result) => result.observed).length;
    const accepted = results.filter((result) => result.accepted).length;
    const rejected = results.filter((result) => result.observed && !result.accepted).length;
    const pending = results.length - observed;
    const completePass = accepted === results.length && pending === 0 && rejected === 0;

    return {
      schema: REPORT_SCHEMA,
      experimentId: experiment.experimentId,
      reportedAt: nowIso(),
      identityId: experiment.identityId,
      canonicalAnchorSha256: experiment.canonicalAnchor.sha256,
      totalTrials: results.length,
      observedTrials: observed,
      acceptedTrials: accepted,
      rejectedTrials: rejected,
      pendingTrials: pending,
      completePass,
      novelViewUnlocked: completePass,
      disposition: completePass
        ? "five-view-identity-preservation-proven-by-recorded-human-canonical-judgments"
        : rejected > 0
          ? "identity-preservation-failed-or-incomplete-do-not-advance"
          : "experiment-incomplete-do-not-advance",
      canonicalAuthorityChanged: false,
      results,
      boundedClaim: completePass
        ? "All five prescribed candidates have complete provenance and explicit direct-to-canonical human pass judgments. This is empirical experiment evidence, not an independent biometric-equivalence claim."
        : "The five-view identity-preservation gate is not proven. No novel-view progression is authorized by this laboratory report."
    };
  }

  function buildNovelViewChallenge(experiment, report, options = {}) {
    const authority = resolveAuthority();
    if (!report || report.schema !== REPORT_SCHEMA || report.experimentId !== experiment.experimentId || report.completePass !== true) {
      throw new Error(`${NAME}: novel-view challenge remains locked until the complete five-view experiment passes.`);
    }
    const candidateId = normalizeText(options.candidateId) || `${experiment.experimentId}:novel-view-06`;
    const camera = normalizeText(options.camera || "high-three-quarter-rear-turning-toward-camera");
    return {
      schema: EXPERIMENT_SCHEMA,
      experimentId: `${experiment.experimentId}:novel-06`,
      parentExperimentId: experiment.experimentId,
      challengeClass: "unseen-novel-view",
      reviewQuestion: IDENTITY_REVIEW_QUESTION,
      renderRequest: authority.buildCanonicalRenderRequest({
        candidateId,
        renderer: normalizeText(options.renderer || experiment.renderer || "unassigned"),
        purpose: "VISUAL.002 novel-view identity preservation after five-view gate",
        presentation: {
          hairstyle: normalizeText(options.hairstyle || "loose-slight-curl"),
          wardrobe: normalizeText(options.wardrobe || "modern-business"),
          expression: normalizeText(options.expression || "attentive-neutral"),
          pose: normalizeText(options.pose || "turning-toward-camera"),
          camera,
          lighting: normalizeText(options.lighting || "natural-window-light"),
          background: normalizeText(options.background || "transparent")
        }
      }),
      authority: {
        unlockedByFiveViewEvidence: true,
        generatedCandidateOnly: true,
        mayRedefineCanonical: false,
        mustCompareDirectlyToCanonical: true
      }
    };
  }

  function getContract() {
    const authority = resolveAuthority();
    const canonical = authority.getCanonicalMaddy();
    return {
      schema: SCHEMA,
      laboratory: NAME,
      version: VERSION,
      buildId: BUILD_ID,
      commission: "VISUAL.002",
      identityId: canonical.identityId,
      canonicalAnchorAssetId: canonical.anchors.primary.assetId,
      reviewQuestion: IDENTITY_REVIEW_QUESTION,
      fiveViewTrialCount: FIVE_VIEW_PROTOCOL.length,
      reviewCriteria: clone(REVIEW_CRITERIA),
      capabilities: {
        imageGeneration: false,
        biometricIdentityValidation: false,
        empiricalExperimentPlanning: true,
        candidateObservationRecording: true,
        directCanonicalValidationGate: true,
        fiveViewProgressionGate: true,
        novelViewChallengeAfterPass: true
      }
    };
  }

  function runAcceptanceTest() {
    const authority = resolveAuthority();
    const canonical = authority.getCanonicalMaddy();
    const experiment = buildFiveViewExperiment({
      experimentId: "visual-002-acceptance",
      renderer: "acceptance-renderer"
    });

    const passObservations = experiment.trials.map((trial) => recordObservation(experiment, {
      trialId: trial.trialId,
      artifact: `acceptance://${trial.trialId}.png`,
      renderer: "acceptance-renderer",
      comparedToCanonical: true,
      humanCanonicalJudgment: "pass",
      reviewer: "acceptance-reviewer"
    }));
    const passReport = buildExperimentReport(experiment, passObservations);

    const failedObservation = recordObservation(experiment, {
      trialId: experiment.trials[0].trialId,
      artifact: canonical.anchors.negativeControls[0].path,
      renderer: "acceptance-renderer",
      comparedToCanonical: true,
      humanCanonicalJudgment: "fail",
      reviewer: "acceptance-reviewer"
    });
    const failReport = buildExperimentReport(experiment, [failedObservation, ...passObservations.slice(1)]);

    const unanchoredObservation = recordObservation(experiment, {
      trialId: experiment.trials[0].trialId,
      artifact: "acceptance://not-directly-compared.png",
      renderer: "acceptance-renderer",
      comparedToCanonical: false,
      humanCanonicalJudgment: "pass",
      reviewer: "acceptance-reviewer"
    });

    let prematureNovelViewRejected = false;
    try { buildNovelViewChallenge(experiment, failReport); } catch (_error) { prematureNovelViewRejected = true; }
    const novel = buildNovelViewChallenge(experiment, passReport);

    const allRequestsDirect = experiment.trials.every((trial) =>
      trial.renderRequest.authority.mustValidateAgainstCanonical === true &&
      trial.renderRequest.authority.previousCandidateMayServeAsSoleAnchor === false &&
      trial.renderRequest.identity.primaryAnchorSha256 === canonical.anchors.primary.sha256
    );
    const allCandidateIdsUnique = new Set(experiment.trials.map((trial) => trial.candidateId)).size === experiment.trials.length;
    const hasProfileStress = experiment.trials.some((trial) => trial.challengeClass === "geometry-stress" && trial.presentation.camera === "left-profile");
    const hasFullBodyStress = experiment.trials.some((trial) => trial.challengeClass === "body-context-stress");
    const hasTransparentChallenges = experiment.trials.filter((trial) => trial.presentation.background === "transparent").length >= 2;
    const hasPresentationVariation = new Set(experiment.trials.map((trial) => trial.presentation.hairstyle)).size >= 4 &&
      new Set(experiment.trials.map((trial) => trial.presentation.wardrobe)).size >= 4;

    const checks = [
      ["Laboratory exposes version 1.0.0", VERSION === "1.0.0"],
      ["VISUAL.001 authority is resolved", Boolean(authority)],
      ["Experiment targets Canonical Maddy", experiment.identityId === "meos:maddy:canonical"],
      ["Experiment anchors directly to Canonical V2", experiment.canonicalAnchor.assetId === "maddy-canonical-v2"],
      ["Experiment carries exact Canonical V2 hash", experiment.canonicalAnchor.sha256 === canonical.anchors.primary.sha256],
      ["Supporting V1 lineage remains visible", experiment.supportingLineage[0]?.assetId === "maddy-canonical-v1"],
      ["Holographic Maddy remains negative control", experiment.negativeControls[0]?.assetId === "maddy-holographic-presence-v1"],
      ["Review asks whether Maddy remained Maddy", experiment.reviewQuestion === IDENTITY_REVIEW_QUESTION],
      ["Five prescribed trials exist", experiment.trials.length === 5],
      ["All candidate IDs are unique", allCandidateIdsUnique],
      ["Every render request is directly canonical anchored", allRequestsDirect],
      ["Previous candidate cannot be sole identity anchor", experiment.antiDriftDoctrine.previousCandidateMayBeSoleIdentityReference === false],
      ["Generated recency cannot create canonical authority", experiment.antiDriftDoctrine.generatedCandidateMayBecomeCanonicalByRecency === false],
      ["Similarity alone remains insufficient", experiment.antiDriftDoctrine.similarityAloneIsSufficient === false],
      ["Protocol includes profile geometry stress", hasProfileStress],
      ["Protocol includes full-body identity stress", hasFullBodyStress],
      ["Protocol includes transparent-background challenges", hasTransparentChallenges],
      ["Protocol varies hair and wardrobe", hasPresentationVariation],
      ["Observation records renderer provenance", passObservations[0].renderer === "acceptance-renderer"],
      ["Observation records direct canonical comparison", passObservations[0].comparedToCanonical === true],
      ["Observation cannot change canonical authority", passObservations[0].canonicalAuthorityChanged === false],
      ["Complete evidence can accept a candidate render", passObservations[0].acceptedAsCanonicalMaddyRender === true],
      ["Known drift control can be explicitly rejected", failedObservation.acceptedAsCanonicalMaddyRender === false],
      ["Pass without direct canonical comparison is rejected", unanchoredObservation.acceptedAsCanonicalMaddyRender === false],
      ["Five accepted observations produce complete pass", passReport.completePass === true],
      ["Complete pass counts all five accepted trials", passReport.acceptedTrials === 5 && passReport.pendingTrials === 0],
      ["One failed identity trial blocks complete pass", failReport.completePass === false],
      ["One failed identity trial is counted", failReport.rejectedTrials === 1],
      ["Failed experiment locks novel-view progression", failReport.novelViewUnlocked === false],
      ["Premature novel-view request is rejected", prematureNovelViewRejected],
      ["Complete five-view pass unlocks novel view", passReport.novelViewUnlocked === true],
      ["Novel-view request remains Canonical V2 anchored", novel.renderRequest.identity.primaryAnchorSha256 === canonical.anchors.primary.sha256],
      ["Novel-view candidate cannot redefine canonical", novel.renderRequest.authority.mayRedefineCanonical === false],
      ["Novel-view challenge records five-view evidence unlock", novel.authority.unlockedByFiveViewEvidence === true],
      ["Laboratory does not claim image generation", getContract().capabilities.imageGeneration === false],
      ["Laboratory does not claim biometric identity validation", getContract().capabilities.biometricIdentityValidation === false]
    ].map(([name, passed]) => ({ name, passed: Boolean(passed) }));

    const passed = checks.filter((check) => check.passed).length;
    return {
      schema: "meos.visual-identity-laboratory.acceptance.v1",
      commission: "VISUAL.002",
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      success: passed === checks.length,
      checks,
      boundedClaim:
        "MEOS can now define and govern a repeatable five-view Canonical Maddy identity-preservation experiment, record direct-to-canonical human evidence, reject known drift, and gate novel-view progression. No actual renderer output has been generated by this acceptance test and no biometric identity-equivalence capability is claimed."
    };
  }

  const api = freeze({
    schema: SCHEMA,
    getContract,
    buildFiveViewExperiment,
    recordObservation,
    buildExperimentReport,
    buildNovelViewChallenge,
    runAcceptanceTest
  });

  root.MEOS.VisualIdentityLaboratory = api;
  root.MEOSVisualIdentityLaboratory = api;

  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
