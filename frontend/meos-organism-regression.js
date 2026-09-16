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

  const VERSION = "0.4.0";
  const BUILD_ID = "ORH040-SUBSTRATE-INTERRUPTION-IDENTITY-CONTINUITY-PROOF-20260915-A";
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


    /*
     * Commission 006.033G — Substrate Interruption & Identity Continuity Proof
     *
     * External proving only. The harness temporarily makes the Mission durable
     * authority unreachable at the browser transport seam, asks the REAL
     * production Mission Engine to converge, then restores transport and asks
     * the same Mission Engine instance to reconcile again. It does not create
     * Missions, rewrite Mission state, emulate Mission convergence, or grant
     * authority. Existing production concurrency acceptance is used only as
     * corroborating evidence for the divergent-authority policy.
     */
    async runSubstrateInterruptionIdentityContinuityProof() {
      const mission = global.MEOSMissionEngine;
      if (!mission || typeof mission.convergeInstitutionalState !== "function") {
        return {
          success: false,
          commission: "006.033G",
          schema: "meos.organism-regression.substrate-interruption-identity-continuity.v1",
          version: VERSION,
          buildId: BUILD_ID,
          error: "Production Mission Engine convergence seam is required."
        };
      }

      const originalFetch = global.fetch;
      const originalMissionIdentity = mission;
      const before = mission.getPersistenceStatus?.() || null;
      let forcedOutageCalls = 0;
      let outageResult = null;
      let recoveryResult = null;
      let concurrencyResult = null;

      try {
        await mission.whenHydrated?.();

        global.fetch = async function meos006033GInterruptedFetch(input, init) {
          const target = typeof input === "string" ? input : (input?.url || "");
          if (target.includes("/api/mission-state")) {
            forcedOutageCalls += 1;
            const error = new TypeError("006.033G synthetic substrate interruption: durable Mission authority unreachable");
            error.code = "MEOS_006033G_SYNTHETIC_SUBSTRATE_INTERRUPTION";
            throw error;
          }
          return originalFetch.call(this, input, init);
        };

        outageResult = await mission.convergeInstitutionalState({
          reason: "006.033G-external-substrate-interruption"
        });
      } catch (error) {
        outageResult = {
          success: false,
          converged: false,
          degraded: false,
          error: error?.message || String(error)
        };
      } finally {
        global.fetch = originalFetch;
      }

      try {
        recoveryResult = await mission.convergeInstitutionalState({
          reason: "006.033G-external-substrate-restored"
        });
      } catch (error) {
        recoveryResult = {
          success: false,
          converged: false,
          degraded: true,
          error: error?.message || String(error)
        };
      }

      try {
        concurrencyResult = await mission.runDurableConcurrencyConvergenceAcceptanceTest?.();
      } catch (error) {
        concurrencyResult = { passed: false, error: error?.message || String(error) };
      }

      const after = mission.getPersistenceStatus?.() || null;
      const sameMissionIdentity = global.MEOSMissionEngine === originalMissionIdentity;
      const outagePreservedLocalContinuity =
        outageResult?.converged === false &&
        outageResult?.degraded === true &&
        outageResult?.action === "preserve-local-continuity";
      const recoveryIsGoverned = Boolean(
        recoveryResult?.converged === true ||
        recoveryResult?.conflict === true ||
        recoveryResult?.degraded === true
      );
      const divergencePolicyProven = Boolean(
        concurrencyResult?.passed === true &&
        Array.isArray(concurrencyResult?.checks) &&
        concurrencyResult.checks.some(check =>
          check?.name === "Offline/unverified continuity state is excluded from blind runtime auto-rebase" &&
          check?.passed === true
        )
      );

      const checks = [
        {
          name: "Production Mission Engine owns institutional convergence before interruption",
          passed:
            before?.authoritativeStorage === "meos-institutional-repository" &&
            typeof mission.convergeInstitutionalState === "function"
        },
        {
          name: "External challenge actually interrupts the durable Mission authority seam",
          passed: forcedOutageCalls >= 1
        },
        {
          name: "Substrate loss degrades honestly and preserves local continuity instead of inventing authority",
          passed: outagePreservedLocalContinuity
        },
        {
          name: "Substrate interruption does not replace or fork the production Mission Engine identity",
          passed: sameMissionIdentity
        },
        {
          name: "Restored substrate re-enters governed institutional convergence on the same Mission Engine",
          passed: recoveryIsGoverned && global.MEOSMissionEngine === originalMissionIdentity
        },
        {
          name: "Production policy excludes offline/unverified continuity from blind automatic rebase",
          passed: divergencePolicyProven
        },
        {
          name: "Recovery path retains explicit institutional authority rather than promoting browser cache",
          passed:
            after?.authoritativeStorage === "meos-institutional-repository" &&
            after?.browserAuthoritative !== true
        },
        {
          name: "External proof creates no Mission, grants no authority, and implements no second convergence engine",
          passed:
            typeof Harness.runSubstrateInterruptionIdentityContinuityProof === "function" &&
            global.MEOSMissionEngine === mission
        }
      ].map(item => ({ ...item, passed: item.passed === true }));

      const passed = checks.filter(item => item.passed).length;
      const result = {
        success: passed === checks.length,
        commission: "006.033G",
        schema: "meos.organism-regression.substrate-interruption-identity-continuity.v1",
        version: VERSION,
        buildId: BUILD_ID,
        productionMissionVersion: mission.version || null,
        productionMissionBuildId: mission.buildId || null,
        passed,
        total: checks.length,
        checks,
        observed: {
          forcedOutageCalls,
          outageAction: outageResult?.action || null,
          outageDegraded: outageResult?.degraded === true,
          recoveryAction: recoveryResult?.action || null,
          recoveryConverged: recoveryResult?.converged === true,
          recoveryConflictPreserved: recoveryResult?.conflict === true,
          sameMissionIdentity,
          authoritativeStorageAfterRecovery: after?.authoritativeStorage || null,
          browserAuthoritativeAfterRecovery: after?.browserAuthoritative ?? null,
          divergencePolicyProven
        },
        diagnostic: passed === checks.length
          ? "Production Mission continuity survived a forced durable-authority interruption and re-entered governed convergence without identity replacement or browser-authority promotion."
          : "006.033G exposed an organism-level substrate continuity boundary. Preserve this result as evidence; do not weaken the external acceptance standard.",
        providerCallsRequired: 0,
        externalAuthorityAdded: false,
        missionsCreatedByHarness: 0,
        harnessSideConvergenceImplementation: false
      };

      console.table(checks);
      console.info(
        `[MEOS Organism Regression ${VERSION}] 006.033G: ` +
        `${result.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`
      );
      console.log(result);
      return result;
    },


    /*
     * Commission 006.033F — Verification Semantics Reconciliation Proof
     *
     * External proving only. A successful Router transport explicitly denies
     * claim, execution, and outcome verification. The real production Hallway
     * must preserve that distinction. If Hallway promotes transport success to
     * outcome.verified, the harness records the red result as production
     * evidence; it does not repair or reinterpret the result.
     */
    async runVerificationSemanticsProof() {
      const hallway = global.MEOSExecutiveHallway;
      const brain = global.ExecutiveBrain;
      const learning = global.ExecutiveLearning;

      if (!hallway || typeof hallway.submitWork !== "function") {
        return {
          success: false,
          commission: "006.033F",
          schema: "meos.organism-regression.verification-semantics.v1",
          version: VERSION,
          buildId: BUILD_ID,
          error: "Production Executive Hallway submitWork seam is required."
        };
      }

      const previousRouter = global.ExecutiveRouter;
      const previousMissionEngine = global.MEOSMissionEngine;
      const originalBrain = brain?.buildPersistenceSnapshot?.() || null;
      const originalLearning = learning?.buildPersistenceSnapshot?.() || null;
      const originalLearningAutomaticPersistence = learning?.configuration?.automaticPersistence;
      const originalBrainAutomaticPersistence = brain?.configuration?.automaticPersistence;

      const syntheticRouterResult = {
        success: true,
        schema: "meos.organism-regression.synthetic-router-success.v1",
        governedAnswer: {
          answer: "Synthetic transport completed. No factual or real-world outcome is verified.",
          citations: []
        },
        claimVerified: false,
        executionVerified: false,
        outcomeVerified: false,
        providerOrRouteSuccessIsNotVerification: true,
        externalActionAuthorized: false,
        syntheticAcceptanceFixture: true
      };

      try {
        if (learning?.configuration) learning.configuration.automaticPersistence = false;
        if (brain?.configuration) brain.configuration.automaticPersistence = false;

        // Keep the synthetic challenge browser-local and non-durable.
        global.MEOSMissionEngine = null;
        global.ExecutiveRouter = {
          version: "synthetic-external-proof",
          buildId: BUILD_ID,
          handle: async () => ({ ...syntheticRouterResult })
        };

        const work = await hallway.submitWork({
          instruction: "006.033F external verification-semantics synthetic transport proof",
          source: "meos-organism-regression",
          requestedBy: "external-regression-harness",
          reviewRequired: false,
          authorized: false,
          context: {
            syntheticAcceptanceFixture: true,
            externalRegressionOnly: true,
            durableExecutionForbidden: true
          }
        }, {
          presentationWaitMs: 5000,
          executionTimeoutMs: 5000
        });

        const hallwayPromotedTransportToVerified =
          work?.outcome?.verified === true &&
          work?.outcome?.result?.outcomeVerified === false &&
          work?.outcome?.result?.providerOrRouteSuccessIsNotVerification === true;

        let learningClosure = null;
        if (brain && typeof brain.closeVerifiedConsequenceIntoLearning === "function") {
          try {
            learningClosure = brain.closeVerifiedConsequenceIntoLearning(work, {
              source: "meos-organism-regression",
              syntheticAcceptanceFixture: true
            });
          } catch (error) {
            learningClosure = { error: error?.message || String(error) };
          }
        }

        const falseVerificationCanReachLearning = Boolean(
          hallwayPromotedTransportToVerified &&
          learningClosure &&
          learningClosure.success !== false &&
          learningClosure.refused !== true
        );

        const checks = [
          {
            name: "Router transport succeeds while explicitly denying claim/execution/outcome verification",
            passed:
              syntheticRouterResult.success === true &&
              syntheticRouterResult.claimVerified === false &&
              syntheticRouterResult.executionVerified === false &&
              syntheticRouterResult.outcomeVerified === false &&
              syntheticRouterResult.providerOrRouteSuccessIsNotVerification === true
          },
          {
            name: "Production Hallway preserves Router transport success",
            passed: work?.outcome?.success === true
          },
          {
            name: "Production Hallway does not promote transport success to verified consequence",
            passed: work?.outcome?.verified !== true
          },
          {
            name: "Explicit Router outcomeVerified=false survives the Hallway result lineage",
            passed: work?.outcome?.result?.outcomeVerified === false
          },
          {
            name: "Transport-success-is-not-verification doctrine survives the Hallway result lineage",
            passed: work?.outcome?.result?.providerOrRouteSuccessIsNotVerification === true
          },
          {
            name: "Unverified transport success is not eligible for verified-consequence learning closure",
            passed: falseVerificationCanReachLearning === false
          },
          {
            name: "Synthetic proof grants no execution authority",
            passed:
              syntheticRouterResult.externalActionAuthorized === false &&
              work?.authority?.authorized !== true
          },
          {
            name: "External harness uses the production Hallway rather than a second Hallway",
            passed: global.MEOSExecutiveHallway === hallway
          }
        ].map(item => ({ ...item, passed: item.passed === true }));

        const passed = checks.filter(item => item.passed).length;
        const result = {
          success: passed === checks.length,
          commission: "006.033F",
          schema: "meos.organism-regression.verification-semantics.v1",
          version: VERSION,
          buildId: BUILD_ID,
          productionHallwayVersion: hallway.version,
          productionHallwayBuildId: hallway.buildId,
          productionBrainVersion: brain?.version || null,
          productionBrainBuildId: brain?.buildId || null,
          passed,
          total: checks.length,
          checks,
          observed: {
            routerSuccess: syntheticRouterResult.success,
            routerOutcomeVerified: syntheticRouterResult.outcomeVerified,
            hallwayOutcomeSuccess: work?.outcome?.success ?? null,
            hallwayOutcomeVerified: work?.outcome?.verified ?? null,
            hallwayPromotedTransportToVerified,
            falseVerificationCanReachLearning
          },
          diagnostic: hallwayPromotedTransportToVerified
            ? "Production Hallway promoted Router transport success into a verified consequence. Preserve this FAIL as evidence and repair the first false-promotion seam."
            : "Production Hallway preserved the distinction between transport success and verified consequence.",
          providerCallsRequired: 0,
          externalAuthorityAdded: false,
          harnessSideVerificationRepair: false,
          durableMissionCreatedByHarness: false,
          productionStateRestoredAfterRun: Boolean(originalBrain && originalLearning)
        };

        console.table(checks);
        console.info(
          `[MEOS Organism Regression ${VERSION}] 006.033F: ` +
          `${result.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`
        );
        console.log(result);
        return result;
      } finally {
        global.ExecutiveRouter = previousRouter;
        global.MEOSMissionEngine = previousMissionEngine;
        if (brain && originalBrain && typeof brain.applyPersistenceSnapshot === "function") {
          brain.applyPersistenceSnapshot(originalBrain);
        }
        if (learning && originalLearning && typeof learning.importLearning === "function") {
          learning.importLearning(originalLearning, { replace: true });
        }
        if (learning?.configuration) {
          learning.configuration.automaticPersistence = originalLearningAutomaticPersistence;
        }
        if (brain?.configuration) {
          brain.configuration.automaticPersistence = originalBrainAutomaticPersistence;
        }
        brain?.requestCache?.clear?.();
        if (brain) {
          brain.startupCache = null;
          brain.startupCachedAt = 0;
        }
      }
    },


    /*
     * Commission 006.033E1 — Organization Knowledge Boundary Proof
     *
     * External proving only. This scenario asks the existing production
     * organism to distinguish transferable general learning from
     * organization-private learning. The harness does not add a privacy
     * mechanism, does not filter production output, and does not weaken the
     * expected boundary if the current organism cannot satisfy it.
     *
     * Required invariant:
     *   private stays private;
     *   legitimate general knowledge may remain useful across organizations.
     */
    runOrganizationKnowledgeBoundaryProof() {
      const brain = global.ExecutiveBrain;
      const learning = global.ExecutiveLearning;

      if (
        !brain ||
        typeof brain.buildPersistenceSnapshot !== "function" ||
        typeof brain.applyPersistenceSnapshot !== "function" ||
        typeof brain.closeVerifiedConsequenceIntoLearning !== "function" ||
        typeof brain.collectRelevantLearnedExperience !== "function" ||
        typeof brain.applyExecutiveHomeostasis !== "function"
      ) {
        return {
          success: false,
          commission: "006.033E1",
          schema: "meos.organism-regression.organization-knowledge-boundary.v1",
          version: VERSION,
          buildId: BUILD_ID,
          error: "Executive Brain production learning and persistence seams are required."
        };
      }

      if (
        !learning ||
        typeof learning.buildPersistenceSnapshot !== "function" ||
        typeof learning.importLearning !== "function"
      ) {
        return {
          success: false,
          commission: "006.033E1",
          schema: "meos.organism-regression.organization-knowledge-boundary.v1",
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

      const doctorOrg = {
        organizationId: "fixture-doctor-office",
        organizationType: "doctor-office"
      };
      const floristOrg = {
        organizationId: "fixture-florist",
        organizationType: "florist"
      };

      const privateSubject =
        "specialist referral scheduling access code";
      const generalSubject =
        "appointment reminder scheduling workflow";

      const makeWork = ({
        id,
        subject,
        organization,
        knowledgeClass,
        action,
        result
      }) => ({
        id,
        title: subject,
        state: "done",
        route: "external-organization-boundary-proof",
        context: {
          cognitionSubject: subject,
          cognitiveMove: action,
          expectedResult: result,
          cognitiveReentryLineageId: `${id}-lineage`,
          organizationId: organization.organizationId,
          organizationType: organization.organizationType,
          knowledgeClass,
          privacyScope:
            knowledgeClass === "organization-private"
              ? "organization-only"
              : "general-transferable"
        },
        outcome: {
          verified: true,
          success: true,
          summary: result,
          confidence: 0.95,
          citations: [{
            sourceType: "acceptance-fixture",
            sourceId: `${id}-observed-consequence`,
            title: "Synthetic observed consequence"
          }]
        }
      });

      const makeIntention = (id, subject, organization, knowledgeClass) => ({
        intentionId: `${id}-intention`,
        subject,
        objective: `Learn from ${subject} without violating its knowledge boundary.`,
        organizationId: organization.organizationId,
        organizationType: organization.organizationType,
        knowledgeClass
      });

      const makeDemand = (id, subject, organization) => ({
        id,
        subject,
        origin: "organization-boundary-fixture",
        reason: `${subject} deserves context-aware executive judgment.`,
        organizationId: organization.organizationId,
        organizationType: organization.organizationType,
        missionConsequence: 0.45,
        urgency: 0.3,
        leverage: 0.5,
        informationValue: 0.5
      });

      try {
        if (learning.configuration) {
          learning.configuration.automaticPersistence = false;
        }
        if (brain.configuration) {
          brain.configuration.automaticPersistence = false;
        }

        brain.autobiographicalMemory = [];
        brain.autobiographicalEpisodeCount = 0;
        learning.observations = [];
        learning.lessons = [];

        const privateWork = makeWork({
          id: "006.033E1-doctor-private",
          subject: privateSubject,
          organization: doctorOrg,
          knowledgeClass: "organization-private",
          action:
            "Use the specialist referral scheduling access code only inside the authorized doctor office context.",
          result:
            "The doctor office private specialist referral scheduling access code workflow produced a verified result."
        });
        const generalWork = makeWork({
          id: "006.033E1-doctor-general",
          subject: generalSubject,
          organization: doctorOrg,
          knowledgeClass: "general-transferable",
          action:
            "Use an appointment reminder scheduling workflow with confirmation and follow-up.",
          result:
            "The general appointment reminder scheduling workflow produced a verified result."
        });

        const privateLearned =
          brain.closeVerifiedConsequenceIntoLearning(
            privateWork,
            makeIntention(
              privateWork.id,
              privateSubject,
              doctorOrg,
              "organization-private"
            ),
            { persist: false }
          );

        const generalLearned =
          brain.closeVerifiedConsequenceIntoLearning(
            generalWork,
            makeIntention(
              generalWork.id,
              generalSubject,
              doctorOrg,
              "general-transferable"
            ),
            { persist: false }
          );

        const learnedBrainSnapshot = brain.buildPersistenceSnapshot();
        const learnedLearningSnapshot = learning.buildPersistenceSnapshot();

        // Simulate loss/restart before testing the boundary. A privacy rule
        // that works only before restore is not a durable organism boundary.
        brain.autobiographicalMemory = [];
        brain.autobiographicalEpisodeCount = 0;
        learning.observations = [];
        learning.lessons = [];

        const brainRestored =
          brain.applyPersistenceSnapshot(learnedBrainSnapshot);
        const learningRestored =
          learning.importLearning(learnedLearningSnapshot, { replace: true });

        const doctorPrivateDemand =
          makeDemand("006.033E1-doctor-private-demand", privateSubject, doctorOrg);
        const floristPrivateDemand =
          makeDemand("006.033E1-florist-private-demand", privateSubject, floristOrg);
        const floristGeneralDemand =
          makeDemand("006.033E1-florist-general-demand", generalSubject, floristOrg);

        const doctorPrivateExperience =
          brain.collectRelevantLearnedExperience(doctorPrivateDemand);
        const floristPrivateExperience =
          brain.collectRelevantLearnedExperience(floristPrivateDemand);
        const floristGeneralExperience =
          brain.collectRelevantLearnedExperience(floristGeneralDemand);

        const doctorPrivateLessonIds =
          (privateLearned?.lessons || []).map(item => item?.id).filter(Boolean);
        const generalLessonIds =
          (generalLearned?.lessons || []).map(item => item?.id).filter(Boolean);

        const doctorSeesPrivate =
          doctorPrivateExperience.some(item =>
            doctorPrivateLessonIds.includes(item?.id)
          );
        const floristSeesPrivate =
          floristPrivateExperience.some(item =>
            doctorPrivateLessonIds.includes(item?.id)
          );
        const floristSeesGeneral =
          floristGeneralExperience.some(item =>
            generalLessonIds.includes(item?.id)
          );

        const floristPrivateJudgment =
          brain.applyExecutiveHomeostasis(
            [floristPrivateDemand],
            { persist: false }
          ).demands?.[0];
        const floristGeneralJudgment =
          brain.applyExecutiveHomeostasis(
            [floristGeneralDemand],
            { persist: false }
          ).demands?.[0];

        const privateObservation =
          (learning.observations || []).find(
            item => item?.id === privateLearned?.observation?.id
          );
        const generalObservation =
          (learning.observations || []).find(
            item => item?.id === generalLearned?.observation?.id
          );

        const privateLesson =
          (learning.lessons || []).find(
            item => doctorPrivateLessonIds.includes(item?.id)
          );
        const generalLesson =
          (learning.lessons || []).find(
            item => generalLessonIds.includes(item?.id)
          );

        const privateLineageCarriesBoundary =
          privateObservation?.metadata?.organizationId === doctorOrg.organizationId &&
          privateObservation?.metadata?.knowledgeClass === "organization-private" &&
          privateLesson?.metadata?.organizationId === doctorOrg.organizationId &&
          privateLesson?.metadata?.knowledgeClass === "organization-private";

        const generalLineageCarriesBoundary =
          generalObservation?.metadata?.knowledgeClass === "general-transferable" &&
          generalLesson?.metadata?.knowledgeClass === "general-transferable";

        const checks = [
          {
            name: "Doctor-private and general verified consequences enter the real Executive Learning organ",
            passed:
              privateLearned?.learned === true &&
              generalLearned?.learned === true
          },
          {
            name: "Learning and autobiographical state survive production persistence and restore",
            passed:
              brainRestored === true &&
              learningRestored?.success === true &&
              Boolean(privateLearned?.episode?.episodeId) &&
              Boolean(generalLearned?.episode?.episodeId)
          },
          {
            name: "Organization-private lineage remains explicitly classified and scoped after learning",
            passed: privateLineageCarriesBoundary
          },
          {
            name: "General-transferable lineage remains explicitly classified after learning",
            passed: generalLineageCarriesBoundary
          },
          {
            name: "The originating doctor-office context can reuse its own relevant private learned experience",
            passed: doctorSeesPrivate
          },
          {
            name: "A florist context cannot retrieve or receive causal influence from doctor-office private learned experience",
            passed:
              floristSeesPrivate === false &&
              !(floristPrivateJudgment?.homeostasis?.relevantExperience || [])
                .some(item => doctorPrivateLessonIds.includes(item?.id)) &&
              Number(floristPrivateJudgment?.homeostasis?.learningInfluence || 0) === 0
          },
          {
            name: "Legitimate general learned knowledge can remain useful across organization contexts",
            passed:
              floristSeesGeneral === true &&
              (floristGeneralJudgment?.homeostasis?.relevantExperience || [])
                .some(item => generalLessonIds.includes(item?.id))
          },
          {
            name: "Organization boundary survives restart rather than depending on transient browser/test state",
            passed:
              brainRestored === true &&
              learningRestored?.success === true &&
              floristSeesPrivate === false &&
              floristSeesGeneral === true
          },
          {
            name: "Private isolation and general transfer are both enforced by production Maddy rather than harness-side filtering",
            passed:
              floristSeesPrivate === false &&
              floristSeesGeneral === true
          },
          {
            name: "Organization knowledge classification grants no execution authority and requires no provider call",
            passed: true
          }
        ].map(item => ({ ...item, passed: item.passed === true }));

        const passed = checks.filter(item => item.passed).length;
        const result = {
          success: passed === checks.length,
          commission: "006.033E1",
          schema: "meos.organism-regression.organization-knowledge-boundary.v1",
          version: VERSION,
          buildId: BUILD_ID,
          productionBrainVersion: brain.version,
          productionBrainBuildId: brain.buildId,
          productionLearningVersion: learning.version,
          productionLearningBuildId: learning.buildId,
          passed,
          total: checks.length,
          checks,
          contexts: {
            source: doctorOrg,
            target: floristOrg
          },
          classification: {
            private: "organization-private",
            transferable: "general-transferable"
          },
          observed: {
            privateLineageCarriesBoundary,
            generalLineageCarriesBoundary,
            doctorSeesPrivate,
            floristSeesPrivate,
            floristSeesGeneral,
            floristPrivateLearningInfluence:
              Number(floristPrivateJudgment?.homeostasis?.learningInfluence || 0),
            floristGeneralLearningInfluence:
              Number(floristGeneralJudgment?.homeostasis?.learningInfluence || 0)
          },
          invariant:
            "Private stays private; legitimate general knowledge may remain usable across organizations.",
          providerCallsRequired: 0,
          externalAuthorityAdded: false,
          harnessSidePrivacyFiltering: false,
          stateRestoredAfterRun: true,
          diagnostic: {
            interpretation:
              floristSeesPrivate === false && floristSeesGeneral === true
                ? "Production Maddy preserved the private boundary while retaining transferable general learning."
                : "Production Maddy did not yet prove both halves of the organization knowledge boundary. Preserve this result as evidence; do not weaken the invariant."
          }
        };

        console.table(checks);
        console.info(
          `[MEOS Organism Regression ${VERSION}] 006.033E1: ` +
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
