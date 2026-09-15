/*
 * MEOS Organism Regression Harness
 * Commission 006.033D1
 *
 * External, on-demand behavioral proof for the production Maddy organism.
 * This file is deliberately NOT part of Executive Brain and is not loaded by
 * the normal application boot path. It exercises existing production seams,
 * restores pre-test Brain/Learning state, makes no provider calls, and grants
 * no execution authority.
 */
(function initializeMEOSOrganismRegression(global) {
  "use strict";

  const VERSION = "0.1.1";
  const BUILD_ID = "ORH011-EXTERNAL-CAUSAL-INFLUENCE-DIAGNOSTIC-20260915-A";
  const SCHEMA = "meos.organism-regression.behavioral-continuity.v1";

  const Harness = {
    version: VERSION,
    buildId: BUILD_ID,
    schema: SCHEMA,

    getStatus() {
      return {
        version: VERSION,
        buildId: BUILD_ID,
        schema: SCHEMA,
        loadedOnDemand: true,
        productionOrganModifiedByHarness: false,
        providerCallsRequired: 0,
        externalAuthorityAdded: false
      };
    },

    runBehavioralContinuityProof() {
      const brain = global.ExecutiveBrain;
      const learning = global.ExecutiveLearning;

      if (
        !brain ||
        typeof brain.buildPersistenceSnapshot !== "function" ||
        typeof brain.applyPersistenceSnapshot !== "function" ||
        typeof brain.closeVerifiedConsequenceIntoLearning !== "function" ||
        typeof brain.formAutobiographicalEpisode !== "function" ||
        typeof brain.applyExecutiveHomeostasis !== "function"
      ) {
        return {
          success: false,
          commission: "006.033D1",
          schema: SCHEMA,
          version: VERSION,
          buildId: BUILD_ID,
          error: "Executive Brain production seams are required."
        };
      }

      if (
        !learning ||
        typeof learning.observe !== "function" ||
        typeof learning.buildPersistenceSnapshot !== "function" ||
        typeof learning.importLearning !== "function"
      ) {
        return {
          success: false,
          commission: "006.033D1",
          schema: SCHEMA,
          version: VERSION,
          buildId: BUILD_ID,
          error: "Executive Learning production persistence seams are required."
        };
      }

      const originalBrain = brain.buildPersistenceSnapshot();
      const originalLearning = learning.buildPersistenceSnapshot();
      const originalLearningAutomaticPersistence =
        learning.configuration?.automaticPersistence;
      const originalBrainAutomaticPersistence =
        brain.configuration?.automaticPersistence;

      const subject = "waypoint organism eligibility signal";
      const demand = {
        id: "006.033D1-later-demand",
        subject,
        origin: "world-model-unknown",
        reason: "A waypoint organism eligibility signal may deserve renewed investigation.",
        missionConsequence: 0.45,
        urgency: 0.3,
        leverage: 0.5,
        informationValue: 0.5
      };
      const work = {
        id: "006.033D1-verified-work",
        title: subject,
        state: "done",
        route: "external-organism-behavioral-proof",
        context: {
          cognitionSubject: subject,
          cognitiveMove: "preserve waypoint organism eligibility signal practice",
          expectedResult:
            "The waypoint organism eligibility signal produces a useful verified result.",
          cognitiveReentryLineageId: "006.033D1-lineage"
        },
        outcome: {
          verified: true,
          success: true,
          summary:
            "The waypoint organism eligibility signal produced a useful verified result.",
          confidence: 0.95,
          citations: [{
            sourceType: "acceptance-fixture",
            sourceId: "006.033D1-observed-consequence",
            title: "Observed verified consequence"
          }]
        }
      };
      const intention = {
        intentionId: "006.033D1-intention",
        subject,
        objective:
          "Learn whether the waypoint organism eligibility signal is worth future attention.",
        expectedResult: work.context.expectedResult
      };

      try {
        if (learning.configuration) {
          learning.configuration.automaticPersistence = false;
        }
        if (brain.configuration) {
          brain.configuration.automaticPersistence = false;
        }

        // Isolate the proof from existing learning while exercising the real
        // production Learning organ. The full original snapshot is restored
        // in finally, even when a check fails.
        learning.observations = [];
        learning.lessons = [];
        if (Array.isArray(learning.feedback)) learning.feedback = [];
        if (Array.isArray(learning.calibrations)) learning.calibrations = [];

        const before = brain.applyExecutiveHomeostasis(
          [demand],
          { persist: false }
        ).demands?.[0];

        const unverified = brain.closeVerifiedConsequenceIntoLearning({
          ...brain.clone(work),
          id: "006.033D1-unverified-work",
          outcome: { ...brain.clone(work.outcome), verified: false }
        }, intention, { persist: false });

        const learned = brain.closeVerifiedConsequenceIntoLearning(
          work,
          intention,
          { persist: false }
        );

        const learnedObservationId = learned?.observation?.id || null;
        const learnedEpisodeId = learned?.episode?.episodeId || null;
        const learnedLessonIds = (learned?.lessons || [])
          .map(item => item?.id)
          .filter(Boolean);

        const afterLearningBrainSnapshot = brain.buildPersistenceSnapshot();
        const afterLearningSnapshot = learning.buildPersistenceSnapshot();

        // Simulate in-memory loss before calling the production restore seams.
        brain.autobiographicalMemory = [];
        brain.autobiographicalEpisodeCount = 0;
        learning.observations = [];
        learning.lessons = [];

        const brainRestored =
          brain.applyPersistenceSnapshot(afterLearningBrainSnapshot);
        const learningRestored =
          learning.importLearning(afterLearningSnapshot, { replace: true });

        const after = brain.applyExecutiveHomeostasis(
          [demand],
          { persist: false }
        ).demands?.[0];

        const continuity = brain.buildCognitionContinuityContext({
          request: { text: subject },
          autobiographicalMemory: brain.getAutobiographicalMemory(8),
          selfModel: brain.selfModel,
          workingAwareness: brain.workingAwareness,
          temporalContinuity: brain.temporalContinuity,
          worldModel: brain.worldModel
        });

        const recalledEpisode =
          (continuity?.relevantAutobiographicalExperience || [])
            .find(item => item?.episodeId === learnedEpisodeId);
        const restoredLesson = (learning.lessons || [])
          .find(item => learnedLessonIds.includes(item?.id));
        const restoredObservation = (learning.observations || [])
          .find(item => item?.id === learnedObservationId);

        // 006.033D1.1 — capture the production influence inputs while the
        // isolated fixture still exists, before finally restores original state.
        const relevantExperience =
          brain.clone(after?.homeostasis?.relevantExperience || []);
        const causalInfluenceDiagnostic = relevantExperience.map(experience => {
          const relevance = Number(experience?.relevance || 0);
          const confidence = Number(experience?.confidence || 0);
          const evidenceCount = Number(experience?.evidenceCount || 0);
          const evidenceWeight = Math.min(1, evidenceCount / 3);
          const direction = Number(experience?.direction || 0);
          const rawInfluence =
            direction * relevance * confidence * evidenceWeight;
          const sourceObservationIds =
            Array.isArray(experience?.sourceObservationIds)
              ? experience.sourceObservationIds.filter(Boolean)
              : [];
          const sourceObservations = (learning.observations || [])
            .filter(observation =>
              sourceObservationIds.includes(observation?.id))
            .map(observation => ({
              id: observation?.id || null,
              sourceType: observation?.sourceType || null,
              outcomeType: observation?.outcomeType || null,
              verified: observation?.metadata?.verified === true
            }));

          return {
            experienceId: experience?.id || null,
            title: experience?.title || null,
            relevance,
            confidence,
            evidenceCount,
            evidenceWeight: Number(evidenceWeight.toFixed(6)),
            direction,
            directionBasis: experience?.directionBasis || null,
            sourceObservationIds,
            sourceObservations,
            rawInfluence: Number(rawInfluence.toFixed(6)),
            expectedBoundedInfluenceAtCurrentCoefficient:
              Number((rawInfluence * 0.12).toFixed(6))
          };
        });

        const checks = [
          {
            name: "Unverified consequence is refused as learning",
            passed: unverified?.learned === false &&
              unverified?.reason === "consequence-not-verified"
          },
          {
            name: "Verified consequence enters the real Executive Learning organ",
            passed: learned?.success === true &&
              learned?.learned === true &&
              Boolean(learnedObservationId)
          },
          {
            name: "Verified experience derives at least one governed lesson",
            passed: learnedLessonIds.length > 0
          },
          {
            name: "The same verified consequence becomes autobiographical experience",
            passed: Boolean(learnedEpisodeId) &&
              learned?.episode?.eventType === "verified-consequence-learning"
          },
          {
            name: "Brain persistence snapshot carries the learned autobiographical episode",
            passed: (afterLearningBrainSnapshot?.autobiographicalMemory || [])
              .some(item => item?.episodeId === learnedEpisodeId)
          },
          {
            name: "Executive Learning persistence snapshot carries the same consequence lineage",
            passed: (afterLearningSnapshot?.observations || [])
              .some(item => item?.id === learnedObservationId) &&
              (afterLearningSnapshot?.lessons || [])
                .some(item => learnedLessonIds.includes(item?.id))
          },
          {
            name: "Production Brain and Learning restore seams rehydrate the experience",
            passed: brainRestored === true &&
              learningRestored?.success === true &&
              Boolean(restoredObservation) &&
              Boolean(restoredLesson)
          },
          {
            name: "Restored autobiographical experience re-enters later cognition as continuity, not evidence",
            passed: Boolean(recalledEpisode) &&
              continuity?.contextClass === "maddy-continuity-context-not-evidence" &&
              continuity?.boundaries?.continuityContextIsEvidence === false
          },
          {
            name: "The same later demand receives different judgment after verified experience survives restore",
            passed:
              Number(after?.__homeostasisScore) >
                Number(before?.__homeostasisScore) &&
              Number(after?.homeostasis?.learningInfluence) > 0
          },
          {
            name: "Changed judgment exposes the relevant restored experience instead of a hidden override",
            passed: Array.isArray(after?.homeostasis?.relevantExperience) &&
              after.homeostasis.relevantExperience.some(item =>
                learnedLessonIds.includes(item?.id)
              )
          },
          {
            name: "Learning and continuity do not grant execution authority",
            passed:
              continuity?.boundaries?.intentionCreatesExecutionPermission === false &&
              continuity?.boundaries?.attentionCreatesAuthority === false &&
              continuity?.boundaries?.externalAuthorityUnchanged === true
          },
          {
            name: "External harness exercises existing Brain, Learning, persistence, autobiography, and homeostasis seams without a second Maddy",
            passed:
              global.ExecutiveBrain === brain &&
              global.ExecutiveLearning === learning &&
              typeof brain.closeVerifiedConsequenceIntoLearning === "function" &&
              typeof brain.formAutobiographicalEpisode === "function" &&
              typeof brain.applyPersistenceSnapshot === "function" &&
              typeof brain.applyExecutiveHomeostasis === "function"
          }
        ].map(item => ({ ...item, passed: item.passed === true }));

        const passed = checks.filter(item => item.passed).length;
        const result = {
          success: passed === checks.length,
          commission: "006.033D1",
          schema: SCHEMA,
          version: VERSION,
          buildId: BUILD_ID,
          productionBrainVersion: brain.version,
          productionBrainBuildId: brain.buildId,
          passed,
          total: checks.length,
          checks,
          lineage: {
            subject,
            observationId: learnedObservationId,
            lessonIds: learnedLessonIds,
            episodeId: learnedEpisodeId
          },
          before: {
            score: Number(before?.__homeostasisScore ?? 0),
            learningInfluence:
              Number(before?.homeostasis?.learningInfluence ?? 0)
          },
          afterRestore: {
            score: Number(after?.__homeostasisScore ?? 0),
            learningInfluence:
              Number(after?.homeostasis?.learningInfluence ?? 0),
            relevantExperience:
              brain.clone(after?.homeostasis?.relevantExperience || [])
          },
          causalInfluenceDiagnostic:
            brain.clone(causalInfluenceDiagnostic),
          diagnostic: {
            behavioralChangeObserved:
              checks[8]?.passed === true,
            relevantExperienceExposed:
              checks[9]?.passed === true,
            interpretation:
              checks[8]?.passed === true
                ? "Verified restored experience measurably changed later executive judgment."
                : "Verified experience survived and was exposed to homeostasis, but the later executive score did not measurably change. Treat this as production evidence; do not weaken the assertion."
          },
          providerCallsRequired: 0,
          externalAuthorityAdded: false,
          stateRestoredAfterRun: true
        };

        console.table(checks);
        console.info(
          `[MEOS Organism Regression ${VERSION}] 006.033D1: ` +
          `${result.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`
        );
        return result;
      } finally {
        brain.applyPersistenceSnapshot(originalBrain);
        learning.importLearning(originalLearning, { replace: true });

        if (learning.configuration) {
          learning.configuration.automaticPersistence =
            originalLearningAutomaticPersistence;
        }
        if (brain.configuration) {
          brain.configuration.automaticPersistence =
            originalBrainAutomaticPersistence;
        }
        brain.requestCache?.clear?.();
        brain.startupCache = null;
        brain.startupCachedAt = 0;
      }
    }
  };

  global.MEOSOrganismRegression = Object.freeze(Harness);

  console.info(
    `[MEOS Organism Regression ${VERSION}] External harness loaded on demand. ` +
    `Build ${BUILD_ID}. Production Brain is unchanged.`
  );
})(window);
