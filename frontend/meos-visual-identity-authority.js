/**
 * Maddy Executive Operating System (MEOS)
 * Visual Identity Authority
 *
 * Commission: VISUAL.001 — Canonical Visual Identity Foundation
 * Version: 1.0.0
 * Build: MVIA100-CANONICAL-VISUAL-IDENTITY-FOUNDATION-20260917-A
 *
 * Purpose:
 * - Establish a machine-readable authority for who is being rendered.
 * - Anchor Canonical Maddy to immutable, versioned source evidence.
 * - Separate identity invariants from changeable presentation state.
 * - Prevent generated descendants from silently redefining identity.
 * - Preserve future plug-in seams for separately governed MEOS identities
 *   without making those identities Maddy.
 *
 * This organ does not generate images or claim that visual identity has been
 * preserved by a renderer. It defines the contract that future renderers and
 * validators must satisfy, and it reports provenance honestly.
 */

(function initializeMEOSVisualIdentityAuthority(global) {
  "use strict";

  const NAME = "MEOS Visual Identity Authority";
  const VERSION = "1.0.0";
  const BUILD_ID = "MVIA100-CANONICAL-VISUAL-IDENTITY-FOUNDATION-20260917-A";
  const SCHEMA = "meos.visual-identity-authority.v1";
  const CONTRACT_SCHEMA = "meos.visual-identity.contract.v1";
  const RENDER_REQUEST_SCHEMA = "meos.visual-identity.render-request.v1";
  const VALIDATION_SCHEMA = "meos.visual-identity.validation.v1";

  const root = typeof global !== "undefined" ? global : globalThis;
  root.MEOS = root.MEOS || {};

  const clone = (value) =>
    value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const nowIso = () => new Date().toISOString();
  const normalizeText = (value) => String(value ?? "").trim();
  const freeze = (value) => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(freeze);
    return value;
  };

  const AUTHORITY_CLASSES = freeze({
    CANONICAL: "canonical",
    SUPPORTING: "supporting-lineage",
    NEGATIVE_CONTROL: "negative-control",
    GENERATED: "generated-candidate"
  });

  const IDENTITY_TYPES = freeze({
    MADDY_CANONICAL: "maddy-canonical",
    MEOS_PRESENTER: "meos-presenter",
    CUSTOMER_SYNTHETIC: "customer-synthetic",
    AUTHORIZED_LIKENESS: "authorized-likeness"
  });

  const CANONICAL_MADDY = freeze({
    schema: CONTRACT_SCHEMA,
    identityId: "meos:maddy:canonical",
    identityType: IDENTITY_TYPES.MADDY_CANONICAL,
    displayName: "Maddy",
    owner: "MEOS",
    status: "canonical",
    visualIdentityVersion: "1.0.0",
    doctrine: "Maddy stays Maddy. MEOS can have different faces.",
    authority: {
      transferable: false,
      customerImpersonation: "prohibited",
      customerCharacterDerivation: "prohibited",
      canonicalMutation: "governed-versioned-only",
      generatedOutputMayRedefineCanonical: false,
      presentationMayCreateIdentityAuthority: false
    },
    anchors: {
      primary: {
        assetId: "maddy-canonical-v2",
        path: "maddy-canonical-v2.png",
        repositoryPath: "frontend/maddy-canonical-v2.png",
        sha256: "c799aa6f4228d42dee67a47d47c3daaa704c5648406f7658ba5b91e963a3d5aa",
        authorityClass: AUTHORITY_CLASSES.CANONICAL,
        role: "immutable-primary-likeness-anchor",
        interpretation:
          "Primary visual evidence for Canonical Maddy. Every generated candidate must remain accountable to canonical identity rather than merely resembling the immediately preceding render."
      },
      supporting: [
        {
          assetId: "maddy-canonical-v1",
          path: "maddy-canonical-v1.png",
          repositoryPath: "frontend/maddy-canonical-v1.png",
          sha256: "2361aa21cbb4253b8fb9852d4c3ae93e71860d9df7ffa5a03d663ca97717cc79",
          authorityClass: AUTHORITY_CLASSES.SUPPORTING,
          role: "supporting-likeness-lineage",
          interpretation:
            "Supporting evidence of the same intended Maddy identity; it cannot supersede the primary anchor by recency or renderer output."
        }
      ],
      negativeControls: [
        {
          assetId: "maddy-holographic-presence-v1",
          path: "maddy-holographic-presence-v1.png",
          repositoryPath: "frontend/maddy-holographic-presence-v1.png",
          sha256: "3eda2f8589a0eac63499194af50f98b0168b55c113f41876b202e7a8d7be09d5",
          authorityClass: AUTHORITY_CLASSES.NEGATIVE_CONTROL,
          role: "known-identity-drift-control",
          interpretation:
            "Recognizably related to Maddy but outside acceptable canonical likeness. It is evidence that resemblance alone is insufficient for identity continuity."
        }
      ]
    },
    invariants: {
      principle:
        "Identity-defining characteristics remain accountable to Canonical Maddy across every presentation and generation.",
      protected: [
        "recognizable facial identity",
        "identity-defining facial geometry and proportions",
        "characteristic eye relationship and placement",
        "characteristic nose structure",
        "characteristic mouth and lip structure",
        "characteristic jaw and facial silhouette",
        "canonical identity provenance"
      ],
      note:
        "The protected list is a semantic contract, not a claim that MEOS can yet measure every characteristic numerically. Future validators may add measurable representations without replacing canonical source evidence."
    },
    presentation: {
      principle: "Same Maddy, different Tuesday.",
      mutable: [
        "hairstyle",
        "hair arrangement",
        "wardrobe",
        "shoes",
        "jewelry and accessories",
        "makeup",
        "expression",
        "pose",
        "camera viewpoint",
        "lighting",
        "environment",
        "background transparency",
        "apparent-age presentation"
      ],
      temporalSeparation: {
        chronologicalHistoryIsIdentity: false,
        experientialHistoryIsApparentAge: false,
        apparentAgeMayBePresentationState: true,
        intentionalPersistentEvolutionRequiresGovernedVersion: true
      }
    },
    antiDrift: {
      rule:
        "No generated image of Maddy becomes the definition of Maddy merely because it was generated most recently.",
      canonicalComparisonRequired: true,
      previousGenerationAloneIsInsufficient: true,
      recursiveDescendantAuthority: false,
      similarityAloneIsInsufficient: true,
      acceptanceQuestion: "Did Maddy remain Maddy?",
      failureMeaning:
        "A candidate may resemble Maddy and still fail canonical identity continuity. Failed candidates remain evidence, never identity authority."
    },
    rendererNeutrality: {
      rendererOwnsIdentity: false,
      providerOwnsIdentity: false,
      modelOwnsIdentity: false,
      externalRenderingPermitted: true,
      rule:
        "Rendering horsepower may be replaceable or external; identity authority remains MEOS-owned."
    }
  });

  function buildDefaultPresentation() {
    return {
      hairstyle: "canonical-reference",
      wardrobe: "canonical-reference",
      expression: "canonical-reference",
      pose: "canonical-reference",
      camera: "canonical-reference",
      lighting: "canonical-reference",
      environment: "transparent-or-explicit",
      background: "explicit",
      apparentAge: "canonical-reference"
    };
  }

  function mergePresentation(overrides = {}) {
    const allowed = new Set(CANONICAL_MADDY.presentation.mutable);
    const aliases = {
      hairstyle: "hairstyle",
      hair: "hairstyle",
      hairArrangement: "hair arrangement",
      wardrobe: "wardrobe",
      shoes: "shoes",
      jewelry: "jewelry and accessories",
      accessories: "jewelry and accessories",
      makeup: "makeup",
      expression: "expression",
      pose: "pose",
      camera: "camera viewpoint",
      cameraViewpoint: "camera viewpoint",
      lighting: "lighting",
      environment: "environment",
      background: "background transparency",
      transparentBackground: "background transparency",
      apparentAge: "apparent-age presentation"
    };

    const presentation = buildDefaultPresentation();
    Object.entries(overrides || {}).forEach(([key, value]) => {
      const semantic = aliases[key];
      if (!semantic || !allowed.has(semantic)) {
        throw new Error(`${NAME}: presentation field '${key}' is not authorized by the canonical mutable-presentation contract.`);
      }
      presentation[key] = clone(value);
    });
    return presentation;
  }

  function buildCanonicalRenderRequest(options = {}) {
    const renderer = normalizeText(options.renderer || "unassigned");
    const purpose = normalizeText(options.purpose || "canonical-identity-preservation-test");
    const candidateId = normalizeText(options.candidateId || "") ||
      `maddy-visual-candidate-${Date.now()}`;

    return {
      schema: RENDER_REQUEST_SCHEMA,
      requestedAt: nowIso(),
      candidateId,
      identity: {
        identityId: CANONICAL_MADDY.identityId,
        visualIdentityVersion: CANONICAL_MADDY.visualIdentityVersion,
        primaryAnchorAssetId: CANONICAL_MADDY.anchors.primary.assetId,
        primaryAnchorSha256: CANONICAL_MADDY.anchors.primary.sha256
      },
      purpose,
      renderer,
      presentation: mergePresentation(options.presentation || {}),
      authority: {
        generatedCandidateOnly: true,
        mayRedefineCanonical: false,
        mustValidateAgainstCanonical: true,
        previousCandidateMayServeAsSoleAnchor: false
      },
      provenance: {
        parentIdentityId: CANONICAL_MADDY.identityId,
        canonicalAnchor: CANONICAL_MADDY.anchors.primary.assetId,
        rendererEvidenceRequired: true,
        validationEvidenceRequiredBeforeAcceptance: true
      }
    };
  }

  function validateCandidateEvidence(candidate = {}) {
    const identityId = normalizeText(candidate.identityId);
    const anchorSha256 = normalizeText(candidate.canonicalAnchorSha256).toLowerCase();
    const candidateId = normalizeText(candidate.candidateId);
    const renderer = normalizeText(candidate.renderer);
    const artifact = normalizeText(candidate.artifact);
    const comparedToCanonical = candidate.comparedToCanonical === true;
    const humanCanonicalJudgment = normalizeText(candidate.humanCanonicalJudgment).toLowerCase();
    const acceptedJudgments = new Set(["pass", "fail"]);

    const checks = [
      ["Candidate has an identity ID", Boolean(identityId)],
      ["Candidate claims Canonical Maddy identity", identityId === CANONICAL_MADDY.identityId],
      ["Candidate has an ID", Boolean(candidateId)],
      ["Candidate records renderer provenance", Boolean(renderer)],
      ["Candidate records an artifact reference", Boolean(artifact)],
      ["Candidate anchors to canonical V2 hash", anchorSha256 === CANONICAL_MADDY.anchors.primary.sha256],
      ["Candidate was compared directly to canonical", comparedToCanonical],
      ["Canonical judgment is explicit pass/fail", acceptedJudgments.has(humanCanonicalJudgment)]
    ].map(([name, passed]) => ({ name, passed: Boolean(passed) }));

    const evidenceComplete = checks.every((check) => check.passed);
    const identityAccepted = evidenceComplete && humanCanonicalJudgment === "pass";

    return {
      schema: VALIDATION_SCHEMA,
      validatedAt: nowIso(),
      candidateId: candidateId || null,
      identityId: identityId || null,
      evidenceComplete,
      identityAccepted,
      canonicalAuthorityChanged: false,
      disposition: identityAccepted ? "accepted-render" : "not-accepted-as-canonical-maddy-render",
      checks,
      boundedClaim: identityAccepted
        ? "Required provenance and direct canonical judgment are present for this candidate. This authority records acceptance evidence; it does not independently prove biometric identity equivalence."
        : "Candidate is not accepted as a Canonical Maddy render within this authority boundary.",
      canonicalAnchorRemains: CANONICAL_MADDY.anchors.primary.assetId
    };
  }

  function registerIdentityContract(contract = {}) {
    if (!contract || typeof contract !== "object") {
      throw new TypeError(`${NAME}: identity contract must be an object.`);
    }
    const identityId = normalizeText(contract.identityId);
    const identityType = normalizeText(contract.identityType);
    const owner = normalizeText(contract.owner);
    if (!identityId || !identityType || !owner) {
      throw new Error(`${NAME}: identityId, identityType, and owner are required.`);
    }
    if (identityId === CANONICAL_MADDY.identityId) {
      throw new Error(`${NAME}: Canonical Maddy cannot be replaced through the plug-in identity seam.`);
    }
    if (identityType === IDENTITY_TYPES.MADDY_CANONICAL) {
      throw new Error(`${NAME}: no plug-in identity may claim the Canonical Maddy identity type.`);
    }

    return {
      schema: CONTRACT_SCHEMA,
      identityId,
      identityType,
      displayName: normalizeText(contract.displayName || identityId),
      owner,
      status: "registered-contract",
      canonicalMaddy: false,
      inheritsMaddyIdentity: false,
      maddyDerivationAuthorized: false,
      contract: clone(contract)
    };
  }

  function getCanonicalMaddy() {
    return clone(CANONICAL_MADDY);
  }

  function getContract() {
    return {
      schema: SCHEMA,
      authority: NAME,
      version: VERSION,
      buildId: BUILD_ID,
      canonicalMaddy: getCanonicalMaddy(),
      identityTypes: clone(IDENTITY_TYPES),
      authorityClasses: clone(AUTHORITY_CLASSES),
      capabilities: {
        imageGeneration: false,
        videoGeneration: false,
        biometricIdentityValidation: false,
        canonicalIdentityAuthority: true,
        renderRequestContract: true,
        provenanceGate: true,
        antiDriftContract: true,
        futureIdentityPluginSeam: true
      }
    };
  }

  function runAcceptanceTest() {
    const canonical = getCanonicalMaddy();
    const request = buildCanonicalRenderRequest({
      candidateId: "acceptance-candidate",
      renderer: "acceptance-renderer",
      presentation: {
        hairstyle: "bun",
        wardrobe: "executive",
        camera: "three-quarter-left",
        background: "transparent"
      }
    });
    const positive = validateCandidateEvidence({
      identityId: canonical.identityId,
      candidateId: request.candidateId,
      renderer: request.renderer,
      artifact: "acceptance://candidate.png",
      canonicalAnchorSha256: canonical.anchors.primary.sha256,
      comparedToCanonical: true,
      humanCanonicalJudgment: "pass"
    });
    const drift = validateCandidateEvidence({
      identityId: canonical.identityId,
      candidateId: "known-drift",
      renderer: "acceptance-renderer",
      artifact: canonical.anchors.negativeControls[0].path,
      canonicalAnchorSha256: canonical.anchors.primary.sha256,
      comparedToCanonical: true,
      humanCanonicalJudgment: "fail"
    });

    let protectedFaceOverrideRejected = false;
    try {
      buildCanonicalRenderRequest({
        presentation: { face: "different-person" }
      });
    } catch (_error) {
      protectedFaceOverrideRejected = true;
    }

    const noCanonicalComparison = validateCandidateEvidence({
      identityId: canonical.identityId,
      candidateId: "unanchored-comparison",
      renderer: "acceptance-renderer",
      artifact: "acceptance://unanchored.png",
      canonicalAnchorSha256: canonical.anchors.primary.sha256,
      comparedToCanonical: false,
      humanCanonicalJudgment: "pass"
    });

    let maddyPluginRejected = false;
    try {
      registerIdentityContract({
        identityId: canonical.identityId,
        identityType: IDENTITY_TYPES.MEOS_PRESENTER,
        owner: "customer"
      });
    } catch (_error) {
      maddyPluginRejected = true;
    }

    let fakeCanonicalTypeRejected = false;
    try {
      registerIdentityContract({
        identityId: "customer:fake-maddy",
        identityType: IDENTITY_TYPES.MADDY_CANONICAL,
        owner: "customer"
      });
    } catch (_error) {
      fakeCanonicalTypeRejected = true;
    }

    const futureFace = registerIdentityContract({
      identityId: "meos:presenter:acceptance-example",
      identityType: IDENTITY_TYPES.MEOS_PRESENTER,
      owner: "MEOS"
    });

    const checks = [
      ["Authority exposes version 1.0.0", VERSION === "1.0.0"],
      ["Canonical Maddy has a stable identity ID", canonical.identityId === "meos:maddy:canonical"],
      ["Canonical V2 is the primary likeness anchor", canonical.anchors.primary.assetId === "maddy-canonical-v2"],
      ["Canonical V2 repository path is explicit", canonical.anchors.primary.repositoryPath === "frontend/maddy-canonical-v2.png"],
      ["Canonical V2 bytes are SHA-256 anchored", /^[a-f0-9]{64}$/.test(canonical.anchors.primary.sha256)],
      ["Canonical V1 is supporting lineage", canonical.anchors.supporting[0]?.assetId === "maddy-canonical-v1"],
      ["Holographic Maddy is a negative drift control", canonical.anchors.negativeControls[0]?.assetId === "maddy-holographic-presence-v1"],
      ["Negative control cannot carry canonical authority", canonical.anchors.negativeControls[0]?.authorityClass === AUTHORITY_CLASSES.NEGATIVE_CONTROL],
      ["Generated output cannot redefine Canonical Maddy", canonical.authority.generatedOutputMayRedefineCanonical === false],
      ["Direct canonical comparison is required", canonical.antiDrift.canonicalComparisonRequired === true],
      ["Previous-generation-only comparison is rejected", canonical.antiDrift.previousGenerationAloneIsInsufficient === true],
      ["Similarity alone is insufficient", canonical.antiDrift.similarityAloneIsInsufficient === true],
      ["Presentation is distinct from identity", canonical.presentation.mutable.includes("hairstyle") && canonical.presentation.mutable.includes("wardrobe")],
      ["Apparent age is separated from experiential history", canonical.presentation.temporalSeparation.experientialHistoryIsApparentAge === false],
      ["Renderer cannot own Maddy identity", canonical.rendererNeutrality.rendererOwnsIdentity === false],
      ["Render request stays anchored to Canonical V2", request.identity.primaryAnchorSha256 === canonical.anchors.primary.sha256],
      ["Render request forbids candidate self-canonization", request.authority.mayRedefineCanonical === false],
      ["Authorized presentation variation survives contract creation", request.presentation.hairstyle === "bun" && request.presentation.wardrobe === "executive"],
      ["Complete pass evidence can accept a render without changing canonical authority", positive.identityAccepted === true && positive.canonicalAuthorityChanged === false],
      ["Known drift evidence remains rejected", drift.identityAccepted === false && drift.canonicalAuthorityChanged === false],
      ["Protected face cannot be overridden as presentation state", protectedFaceOverrideRejected],
      ["Candidate cannot pass without direct canonical comparison", noCanonicalComparison.identityAccepted === false],
      ["Plug-in seam cannot replace Canonical Maddy", maddyPluginRejected],
      ["Plug-in seam cannot manufacture another canonical Maddy", fakeCanonicalTypeRejected],
      ["Future MEOS face can register without becoming Maddy", futureFace.canonicalMaddy === false && futureFace.inheritsMaddyIdentity === false],
      ["Authority makes no false image-generation claim", getContract().capabilities.imageGeneration === false],
      ["Authority makes no false biometric-validation claim", getContract().capabilities.biometricIdentityValidation === false]
    ].map(([name, passed]) => ({ name, passed: Boolean(passed) }));

    const passed = checks.filter((check) => check.passed).length;
    return {
      success: passed === checks.length,
      schema: "meos.visual-identity-authority.acceptance.v1",
      commission: "VISUAL.001",
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: checks.length,
      checks,
      boundedClaim:
        "MEOS now has a provider-neutral canonical visual identity authority contract anchored to Maddy V2, with V1 supporting lineage, holographic Maddy as a known drift control, explicit presentation mutability, anti-generational-drift rules, provenance-gated candidate acceptance, and a protected future identity plug-in seam. No image/video generation or biometric identity equivalence is claimed."
    };
  }

  const api = freeze({
    name: NAME,
    version: VERSION,
    buildId: BUILD_ID,
    schema: SCHEMA,
    getContract,
    getCanonicalMaddy,
    buildCanonicalRenderRequest,
    validateCandidateEvidence,
    registerIdentityContract,
    runAcceptanceTest
  });

  root.MEOS.VisualIdentityAuthority = api;
  root.MEOSVisualIdentityAuthority = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
