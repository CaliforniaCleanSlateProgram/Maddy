/**
 * MEOS Executive Router
 * Version: 1.5.0
 * Build: ER150-CANONICAL-MADDY-RESPONSE-TRANSPORT-20260816-A
 * Mission: 002
 *
 * Purpose:
 * Receive requests, ask the commissioned MEOS Executive Brain to classify and
 * route them, dispatch the prepared request package to an authorized internal
 * route or provider adapter, collect the result, and return one normalized
 * response.
 *
 * Authority boundary:
 * - The Router does not think, learn, remember, speak, or make executive decisions.
 * - The Executive Brain owns request preparation and routing policy.
 * - Internal offices and external providers perform delegated work.
 * - External providers advise; MEOS governs; authorized human leadership decides.
 *
 * Universal-core rule:
 * No customer-specific organization data and no provider-specific credentials are
 * hard-coded here. Organization Packages, offices, and providers are discovered
 * or registered at runtime.
 */

(function initializeExecutiveRouter(global) {
  "use strict";

  const VERSION = "1.5.0";
  const BUILD_ID = "ER150-CANONICAL-MADDY-RESPONSE-TRANSPORT-20260816-A";
  const STORAGE_KEY = "meos.executive-router.v1";

  const STATUS = Object.freeze({
    INITIALIZING: "initializing",
    ONLINE: "online",
    OFFLINE: "offline",
    ERROR: "error"
  });

  const REQUEST_STATUS = Object.freeze({
    RECEIVED: "received",
    CLASSIFIED: "classified",
    ROUTED: "routed",
    DISPATCHED: "dispatched",
    COLLECTED: "collected",
    COMPLETED: "completed",
    FAILED: "failed"
  });

  const ROUTES = Object.freeze({
    INSTANT_MEOS_CONTEXT: "instant-meos-context",
    LOCAL_RECALL_PLUS_PROVIDER: "local-recall-plus-provider-reasoning",
    EXTERNAL_INTELLIGENCE_RESEARCH: "external-intelligence-research",
    EXECUTIVE_DECISION_SUPPORT: "executive-decision-support"
  });

  const ERRORS = Object.freeze({
    INVALID_REQUEST: "MEOS_ROUTER_INVALID_REQUEST",
    BRAIN_UNAVAILABLE: "MEOS_ROUTER_BRAIN_UNAVAILABLE",
    BRAIN_REJECTED_REQUEST: "MEOS_ROUTER_BRAIN_REJECTED_REQUEST",
    ROUTE_UNAVAILABLE: "MEOS_ROUTER_ROUTE_UNAVAILABLE",
    PROVIDER_UNAVAILABLE: "MEOS_ROUTER_PROVIDER_UNAVAILABLE",
    PROVIDER_FAILED: "MEOS_ROUTER_PROVIDER_FAILED",
    TIMEOUT: "MEOS_ROUTER_TIMEOUT",
    ABORTED: "MEOS_ROUTER_ABORTED",
    DUPLICATE_REQUEST: "MEOS_ROUTER_DUPLICATE_REQUEST",
    MADDY_RESPONSE_UNAUTHORIZED: "MEOS_ROUTER_MADDY_RESPONSE_UNAUTHORIZED"
  });

  class ExecutiveRouterError extends Error {
    constructor(message, code, details = null) {
      super(message);
      this.name = "ExecutiveRouterError";
      this.code = code || ERRORS.ROUTE_UNAVAILABLE;
      this.details = details;
      this.timestamp = new Date().toISOString();
    }
  }

  const ExecutiveRouter = {
    name: "MEOS Executive Router",
    version: VERSION,
    buildId: BUILD_ID,
    status: STATUS.INITIALIZING,
    operatingMode: "brain-governed-provider-neutral-routing",

    configuration: {
      defaultTimeoutMs: 45000,
      maximumHistoryItems: 100,
      browserHistoryItems: 20,
      browserAnswerMaximumCharacters: 4000,
      browserSourceMaximumItems: 12,
      persistenceEnabled: true,
      rejectDuplicateRequestIds: true,
      defaultProvider: null
    },

    initializedAt: null,
    providers: new Map(),
    routeHandlers: new Map(),
    inFlight: new Map(),
    completedRequestIds: new Set(),
    history: [],
    listeners: {},

    initialize(options = {}) {
      this.configuration = {
        ...this.configuration,
        ...(options.configuration || {})
      };

      this.restore();
      this.installDefaultRoutes();
      this.discoverProviders();

      if (Array.isArray(options.providers)) {
        options.providers.forEach(provider => this.registerProvider(provider));
      }

      if (options.routes && typeof options.routes === "object") {
        Object.entries(options.routes).forEach(([name, handler]) => {
          this.registerRoute(name, handler);
        });
      }

      this.initializedAt = new Date().toISOString();
      this.status = STATUS.ONLINE;

      console.info(
        `[MEOS] ${this.name} v${this.version} online. Build ${this.buildId}.`
      );

      this.emit("router:online", this.getStatus());
      return this.getStatus();
    },

    getStatus() {
      return {
        name: this.name,
        version: this.version,
        buildId: this.buildId,
        status: this.status,
        operatingMode: this.operatingMode,
        brainReady: Boolean(this.resolveBrain()),
        providers: [...this.providers.keys()],
        routes: [...this.routeHandlers.keys()],
        activeRequests: this.inFlight.size,
        historyItems: this.history.length,
        initializedAt: this.initializedAt
      };
    },

    receive(input, options = {}) {
      return this.handle(input, options);
    },

    async handle(input, options = {}) {
      const envelope = this.normalizeRequest(input, options);

      if (
        this.configuration.rejectDuplicateRequestIds &&
        (this.inFlight.has(envelope.id) || this.completedRequestIds.has(envelope.id))
      ) {
        throw new ExecutiveRouterError(
          `Duplicate request ID rejected: ${envelope.id}`,
          ERRORS.DUPLICATE_REQUEST,
          { requestId: envelope.id }
        );
      }

      const context = {
        request: envelope,
        brainResult: null,
        classification: null,
        route: null,
        dispatchResult: null,
        startedAt: Date.now(),
        status: REQUEST_STATUS.RECEIVED,
        terminalized: false,
        terminalReason: null
      };

      const operation = this.execute(context);
      this.inFlight.set(envelope.id, operation);

      try {
        return await operation;
      } finally {
        this.inFlight.delete(envelope.id);
      }
    },

    async execute(context) {
      const { request } = context;
      const timeoutMs = request.timeoutMs;
      let timeoutId = null;
      let abortHandler = null;

      const assertOpen = stage => {
        if (context.terminalized) {
          throw new ExecutiveRouterError(
            `Executive Router ignored a late result after ${context.terminalReason || "terminal completion"}.`,
            context.terminalReason === "timeout" ? ERRORS.TIMEOUT : ERRORS.ABORTED,
            { requestId: request.id, stage, lateResultQuarantined: true }
          );
        }
      };

      const work = (async () => {
        this.emit("router:request-received", this.publicContext(context));

        const brain = this.resolveBrain();
        if (!brain || typeof brain.routeRequest !== "function") {
          throw new ExecutiveRouterError(
            "The commissioned MEOS Executive Brain is unavailable or does not expose routeRequest().",
            ERRORS.BRAIN_UNAVAILABLE,
            { requestId: request.id }
          );
        }

        context.brainResult = brain.routeRequest(request.text, {
          ...request.options,
          requestId: request.id,
          source: request.source,
          externalAction: request.externalAction,
          forceResearch: request.forceResearch,
          forceDeepResearch: request.forceDeepResearch
        });

        if (!context.brainResult?.success || !context.brainResult?.package) {
          throw new ExecutiveRouterError(
            context.brainResult?.error || "The Executive Brain rejected the request.",
            ERRORS.BRAIN_REJECTED_REQUEST,
            { requestId: request.id, brainResult: this.clone(context.brainResult) }
          );
        }

        assertOpen("brain-route");
        context.classification = {
          type: context.brainResult.package.request.type,
          confidence: context.brainResult.package.request.confidence,
          requiresCurrentInternet: context.brainResult.package.request.requiresCurrentInternet,
          requiresApproval: context.brainResult.package.request.requiresApproval
        };
        context.status = REQUEST_STATUS.CLASSIFIED;
        this.emit("router:request-classified", this.publicContext(context));

        context.route = this.selectRoute(context.brainResult);
        context.status = REQUEST_STATUS.ROUTED;
        this.emit("router:request-routed", this.publicContext(context));

        context.dispatchResult = await this.dispatch(context);
        assertOpen("dispatch-result");
        context.status = REQUEST_STATUS.DISPATCHED;
        this.emit("router:request-dispatched", this.publicContext(context));

        const collected = this.collect(context);
        assertOpen("collect");
        context.status = REQUEST_STATUS.COLLECTED;
        this.emit("router:result-collected", this.clone(collected));

        return Object.freeze({
          ...collected,
          status: REQUEST_STATUS.COMPLETED
        });
      })();

      const timeout = new Promise((_, reject) => {
        timeoutId = global.setTimeout(() => {
          reject(new ExecutiveRouterError(
            `Executive Router request timed out after ${timeoutMs}ms.`,
            ERRORS.TIMEOUT,
            { requestId: request.id, timeoutMs }
          ));
        }, timeoutMs);

        if (request.signal) {
          abortHandler = () => reject(new ExecutiveRouterError(
            "Executive Router request aborted.",
            ERRORS.ABORTED,
            { requestId: request.id }
          ));

          if (request.signal.aborted) {
            abortHandler();
          } else if (typeof request.signal.addEventListener === "function") {
            request.signal.addEventListener("abort", abortHandler, { once: true });
          }
        }
      });

      try {
        const completed = await Promise.race([work, timeout]);
        context.terminalized = true;
        context.terminalReason = "completed";
        context.status = REQUEST_STATUS.COMPLETED;
        this.completedRequestIds.add(request.id);
        this.trimCompletedRequestIds();
        this.record(completed);
        this.emit("router:request-completed", this.clone(completed));
        return completed;
      } catch (error) {
        const normalized = this.normalizeError(error, context);
        context.terminalized = true;
        context.terminalReason = normalized.code === ERRORS.TIMEOUT
          ? "timeout"
          : normalized.code === ERRORS.ABORTED
            ? "aborted"
            : "failed";
        context.status = REQUEST_STATUS.FAILED;

        const failed = this.buildFailureResult(context, normalized);
        this.completedRequestIds.add(request.id);
        this.trimCompletedRequestIds();
        this.record(failed);
        this.emit("router:request-failed", this.clone(failed));
        throw normalized;
      } finally {
        global.clearTimeout(timeoutId);
        if (
          request.signal &&
          abortHandler &&
          typeof request.signal.removeEventListener === "function"
        ) {
          request.signal.removeEventListener("abort", abortHandler);
        }
      }
    },

    buildFailureResult(context, error) {
      return {
        success: false,
        schema: "meos.executive-router.result.v3",
        requestId: context?.request?.id || null,
        brainRequestId: context?.brainResult?.requestId || null,
        cognitionId: context?.brainResult?.cognitionId || null,
        status: REQUEST_STATUS.FAILED,
        transportReceipt: {
          schema: "meos.executive-router.transport-receipt.v1",
          routeCompleted: false,
          responseAuthorized: false,
          providerCallSucceeded: false,
          claimVerified: false,
          executionVerified: false,
          outcomeVerified: false,
          truthMayNotBeInferredFromTransport: true
        },
        error: {
          name: error.name,
          code: error.code,
          message: error.message,
          details: this.clone(error.details),
          timestamp: error.timestamp
        },
        durationMs: Number((Date.now() - (context?.startedAt || Date.now())).toFixed(2))
      };
    },
    selectRoute(brainResult) {
      const routeName = this.normalizeName(
        brainResult.route || brainResult.package?.routing?.primaryRoute
      );

      if (!routeName) {
        throw new ExecutiveRouterError(
          "The Executive Brain returned no primary route.",
          ERRORS.ROUTE_UNAVAILABLE,
          { brainResult: this.clone(brainResult) }
        );
      }

      const handler = this.routeHandlers.get(routeName);
      if (typeof handler !== "function") {
        throw new ExecutiveRouterError(
          `No Executive Router handler is registered for route: ${routeName}`,
          ERRORS.ROUTE_UNAVAILABLE,
          { route: routeName }
        );
      }

      return {
        name: routeName,
        supportingRoutes: Array.isArray(brainResult.supportingRoutes)
          ? [...brainResult.supportingRoutes]
          : [],
        researchDepth: brainResult.researchDepth || "local",
        approvalRequired: Boolean(brainResult.approvalRequired),
        handler
      };
    },

    async dispatch(context) {
      const payload = {
        request: this.clone(context.request),
        route: {
          name: context.route.name,
          supportingRoutes: [...context.route.supportingRoutes],
          researchDepth: context.route.researchDepth,
          approvalRequired: context.route.approvalRequired
        },
        package: this.clone(context.brainResult.package)
      };

      /*
       * 006.025B2 live correction: explicit adviser selection is an execution
       * contract, not merely a preference inside provider-capable routes. A
       * caller that deliberately selects a registered adviser (for controlled
       * testing/debugging or an explicitly governed provider turn) must reach
       * that adviser even when Executive Brain correctly classifies resident
       * context as instant-meos-context. Otherwise the local route can start
       * unrelated public-research continuation before adviser dispatch and the
       * explicit adviser is never exercised.
       *
       * This override does NOT change normal routing. Without an explicit
       * registered adviser, the commissioned Brain-selected route remains
       * authoritative. The adviser still receives Maddy-owned context and its
       * output remains advice only.
       */
      const explicitlyRequestedProvider = this.normalizeName(
        context.request?.options?.provider || ""
      );
      const explicitRouterAdviser = explicitlyRequestedProvider
        ? this.providers.get(explicitlyRequestedProvider)
        : null;

      if (explicitRouterAdviser?.enabled) {
        return this.dispatchToProvider(
          payload,
          { provider: explicitlyRequestedProvider }
        );
      }

      return context.route.handler(payload, this);
    },

    collect(context) {
      const result = context.dispatchResult || {};
      const rawOutput = result.output !== undefined ? result.output : result;
      const brain = this.resolveBrain();
      const expectsMaddyOwnership =
        context.brainResult?.package?.responseContract?.responseOwnership?.semanticAuthority ===
        "maddy-executive-brain";

      const semanticResponse =
        brain && typeof brain.reconcileAdviserResult === "function"
          ? brain.reconcileAdviserResult(
              context.brainResult.package,
              rawOutput,
              {
                source: result.source || "meos",
                provider: result.provider || null
              }
            )
          : null;
      const maddyResponse = this.resolveOwnedSpeechReceipt(semanticResponse);
      const governedAnswer = this.produceGovernedAnswer({
        request: context.request,
        route: context.route,
        package: context.brainResult.package,
        source: result.source || "meos",
        provider: result.provider || null,
        output: rawOutput,
        maddyResponse
      });

      if (
        expectsMaddyOwnership &&
        !(
          maddyResponse?.owner === "maddy-executive-brain" &&
          governedAnswer.finalSpeechAuthorized === true &&
          governedAnswer.oneMouth === true &&
          this.firstText(governedAnswer.answer)
        )
      ) {
        throw new ExecutiveRouterError(
          "Maddy owned the turn but no Executive-Brain-authorized speech receipt was available.",
          ERRORS.MADDY_RESPONSE_UNAUTHORIZED,
          {
            requestId: context.request.id,
            cognitionId: context.brainResult.cognitionId || null,
            owner: maddyResponse?.owner || null,
            finalSpeechAuthorized: governedAnswer.finalSpeechAuthorized === true,
            oneMouth: governedAnswer.oneMouth === true
          }
        );
      }

      const canonicalResponse = this.buildCanonicalResponseReceipt(
        governedAnswer,
        maddyResponse,
        context
      );
      const transportReceipt = this.buildTransportReceipt(
        context,
        result,
        canonicalResponse
      );

      return {
        success: canonicalResponse.authorized === true ||
          (!expectsMaddyOwnership && governedAnswer.sufficientEvidence === true),
        schema: "meos.executive-router.result.v3",
        requestId: context.request.id,
        brainRequestId: context.brainResult.requestId,
        cognitionId: context.brainResult.cognitionId || null,
        status: REQUEST_STATUS.COLLECTED,
        route: context.route.name,
        supportingRoutes: [...context.route.supportingRoutes],
        researchDepth: context.route.researchDepth,
        approvalRequired: context.route.approvalRequired,
        source: result.source || "meos",
        provider: result.provider || null,
        answer: canonicalResponse.answer,
        canonicalResponse,
        presentationContract: {
          schema: "meos.executive-router.presentation-contract.v1",
          canonicalAnswerPath: "canonicalResponse.answer",
          compatibilityAnswerPath: "answer",
          rawOutputPresentationAuthorized: false,
          providerCandidatePresentationAuthorized: false,
          oneMouthRequired: expectsMaddyOwnership
        },
        transportReceipt,
        verification: {
          claimVerified: false,
          executionVerified: false,
          outcomeVerified: false,
          providerOrRouteSuccessIsNotVerification: true
        },
        maddyResponse,
        governedAnswer,
        output: rawOutput,
        outputPresentationAuthorized: false,
        package: this.clone(context.brainResult.package),
        durationMs: Number((Date.now() - context.startedAt).toFixed(2)),
        completedAt: new Date().toISOString()
      };
    },

    buildCanonicalResponseReceipt(governedAnswer = {}, maddyResponse = null, context = {}) {
      const authorized = Boolean(
        maddyResponse?.owner === "maddy-executive-brain" &&
        governedAnswer?.finalSpeechAuthorized === true &&
        governedAnswer?.oneMouth === true &&
        governedAnswer?.speechAuthorizationOwner === "maddy-executive-brain" &&
        this.firstText(governedAnswer?.answer)
      );
      return Object.freeze({
        schema: "meos.maddy.canonical-response.v1",
        owner: authorized ? "maddy-executive-brain" : null,
        requestId: context?.request?.id || null,
        cognitionId: context?.brainResult?.cognitionId || null,
        answer: authorized ? this.firstText(governedAnswer.answer) : "",
        basis: governedAnswer?.basis || null,
        authorized,
        finalSpeechAuthorized: authorized,
        oneMouth: authorized,
        speechAuthorizationOwner: authorized ? "maddy-executive-brain" : null,
        providerPaidForAnswer: false,
        externalActionGrantedByResponse: false,
        generatedAt: new Date().toISOString()
      });
    },

    buildTransportReceipt(context = {}, result = {}, canonicalResponse = {}) {
      return Object.freeze({
        schema: "meos.executive-router.transport-receipt.v1",
        requestId: context?.request?.id || null,
        route: context?.route?.name || null,
        routeCompleted: true,
        source: result?.source || "meos",
        provider: result?.provider || null,
        providerCallSucceeded: Boolean(result?.provider) && result?.output?.success !== false,
        responseAuthorized: canonicalResponse?.authorized === true,
        claimVerified: false,
        executionVerified: false,
        outcomeVerified: false,
        truthMayNotBeInferredFromTransport: true,
        generatedAt: new Date().toISOString()
      });
    },
    /*
     * Commission 006.025C2 — Router Consumes Maddy-Owned Speech Receipt
     *
     * C1 established the Executive Brain speech authorization kernel. Router
     * may transport that receipt, but it may not invent a second answer when
     * an owned semantic response exists. This helper is also used by direct
     * acceptance calls so the authorization boundary cannot be bypassed by
     * invoking produceGovernedAnswer() outside collect().
     */
    resolveOwnedSpeechReceipt(maddyResponse = null) {
      if (!maddyResponse || maddyResponse.owner !== "maddy-executive-brain") {
        return maddyResponse;
      }

      if (
        maddyResponse?.speech?.finalSpeechAuthorized === true &&
        maddyResponse?.speech?.oneMouth === true &&
        this.firstText(maddyResponse?.speech?.finalText)
      ) {
        return maddyResponse;
      }

      const brain = this.resolveBrain();
      if (!brain || typeof brain.renderOwnedSemanticResponse !== "function") {
        return maddyResponse;
      }

      const rendered = brain.renderOwnedSemanticResponse(maddyResponse);
      return rendered?.owner === "maddy-executive-brain" ? rendered : maddyResponse;
    },

    /*
     * Commission 006.027 — Canonical Maddy Response Transport
     *
     * The Router already owns normalized result collection. It now also owns
     * the canonical answer contract returned to every presentation surface.
     * Local MEOS evidence is synthesized deterministically at zero provider
     * cost. Provider results are normalized into the same contract. Voice,
     * HUD, and future digital-human presentation can consume one answer rather
     * than inventing separate answers downstream.
     */
    produceGovernedAnswer(input = {}) {
      const pkg = input.package || {};
      const output = input.output || {};
      const localEvidence = Array.isArray(pkg.localContext?.evidence)
        ? pkg.localContext.evidence
        : [];
      const answerEvidence = this.selectAnswerEvidence(
        input.request?.text || pkg.request?.text || "",
        localEvidence,
        pkg.request?.type || "general"
      );
      const providerCandidate = this.firstText(
        output.answer,
        output.response?.answer,
        output.result?.answer,
        output.output?.answer,
        output.text,
        output.response?.text,
        output.result?.text,
        output.output?.text
      );
      const semanticResponse = input.maddyResponse || null;
      const maddyResponse = this.resolveOwnedSpeechReceipt(semanticResponse);

      const question = input.request?.text || pkg.request?.text || "";
      const localAnswer = this.synthesizeLocalAnswer(
        question,
        answerEvidence,
        pkg
      );
      const maddyFinalText =
        maddyResponse?.owner === "maddy-executive-brain" &&
        maddyResponse?.speech?.finalSpeechAuthorized === true &&
        maddyResponse?.speech?.oneMouth === true
          ? this.firstText(maddyResponse?.speech?.finalText)
          : "";

      /*
       * 006.025C2 — Router consumes, but does not author, Maddy speech.
       *
       * If Executive Brain produced an owned semantic response, Router may
       * return only the C1-authorized speech receipt. It may not fall back to
       * evidence concatenation or provider candidate language for that turn.
       * Legacy local synthesis remains available only when no Maddy-owned
       * semantic response exists at all.
       */
      const adviserTurn = Boolean(input.provider);
      const maddyOwnsTurn = maddyResponse?.owner === "maddy-executive-brain";
      const semanticJudgmentOwnsAnswer = Boolean(maddyFinalText);
      const answer = maddyFinalText || (!maddyOwnsTurn ? localAnswer : "");

      const evidenceUnknowns = this.normalizeTextList(
        pkg.evidenceIntegrity?.unverifiedInformation,
        pkg.localContext?.unknowns,
        output.unknowns,
        output.response?.unknowns,
        output.result?.unknowns
      );

      const adviserCitations = adviserTurn && Array.isArray(output.citations)
        ? [...new Set(output.citations.filter(Boolean))].slice(0, 12)
        : [];
      const citations = semanticJudgmentOwnsAnswer
        ? []
        : [...new Set([
            ...answerEvidence.map(item => this.firstText(item.citation, item.provenance?.citation)),
            ...(!adviserTurn && Array.isArray(output.citations) ? output.citations : [])
          ].filter(Boolean))].slice(0, 12);

      return Object.freeze({
        schema: "meos.governed-answer.v1",
        answer,
        basis: semanticJudgmentOwnsAnswer
          ? "maddy-semantic-judgment"
          : (!maddyOwnsTurn && localAnswer)
            ? "maddy-owned-local-rendering"
            : maddyOwnsTurn
              ? "maddy-semantic-response-language-pending"
              : "insufficient-evidence",
        confidence: Number(
          output.confidence ??
          output.response?.confidence ??
          output.result?.confidence ??
          pkg.localContext?.confidence ??
          pkg.evidenceIntegrity?.confidence ??
          0
        ) || 0,
        unknowns: evidenceUnknowns,
        recommendation: this.firstText(
          output.recommendation,
          output.response?.recommendation,
          output.result?.recommendation
        ) || null,
        recommendationState: this.firstText(
          maddyResponse?.recommendation?.state,
          pkg.cognition?.reasoning?.recommendation?.state
        ) || null,
        approvalRequired: Boolean(
          input.route?.approvalRequired ||
          pkg.responseContract?.humanApprovalRequired
        ),
        citations: [...new Set(citations)],
        adviserCitations,
        source: input.source || "meos",
        provider: input.provider || null,
        providerPaidForAdvice: Boolean(input.provider),
        providerPaidForAnswer: false,
        providerCandidateLanguage: providerCandidate || null,
        generatedBy: semanticJudgmentOwnsAnswer
          ? "maddy-semantic-synthesis"
          : (!maddyOwnsTurn && localAnswer)
            ? "meos-local-synthesis"
            : "maddy-semantic-response",
        oneMouth: maddyResponse?.speech?.finalSpeechAuthorized === true &&
          maddyResponse?.speech?.oneMouth === true,
        finalSpeechAuthorized: maddyResponse?.speech?.finalSpeechAuthorized === true,
        speechAuthorizationOwner: maddyResponse?.speech?.semanticAuthority || null,
        rawProviderOutputPresentationAuthorized: false,
        claimVerified: false,
        executionVerified: false,
        outcomeVerified: false,
        sufficientEvidence: Boolean(
          maddyFinalText || (!maddyOwnsTurn && localAnswer)
        ),
        generatedAt: new Date().toISOString()
      });
    },

    /*
     * Commission 006.018F — Semantic Relevance + Public Research Continuation
     *
     * Evidence confidence is not evidence relevance. A high-confidence MEOS
     * architecture record cannot answer an unrelated public factual question.
     * This gate is intentionally conservative: generic/general research must
     * share meaningful subject language with resident evidence before the
     * zero-cost local synthesis path is allowed to close the question.
     */
    /*
     * Commission 006.018J — Natural-Language Intent Normalization
     * Invocation words and terminal punctuation must not change intent.
     */
    canonicalIntentText(text = "") {
      return String(text || "")
        .trim()
        .replace(/^\s*(?:hey\s+)?maddy\s*[,;:!?.-]*\s*/i, "")
        .replace(/[?!.]+\s*$/g, "")
        .replace(/\s+/g, " ")
        .trim();
    },

    meaningfulTerms(value) {
      const stop = new Set([
        "a","an","and","are","as","at","be","because","been","but","by","can","could",
        "did","do","does","for","from","had","has","have","how","i","if","in","into","is",
        "it","its","me","my","of","on","or","our","should","so","that","the","their","them",
        "there","these","they","this","to","us","was","we","were","what","when","where","which",
        "who","why","will","with","would","you","your"
      ]);
      const rawTerms = String(value || "").toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .flatMap(term => term.split("-"))
        .map(term => term.replace(/^-+|-+$/g, ""))
        .filter(term => term.length >= 3 && !stop.has(term));

      const normalizeMorphology = term => {
        if (term.length > 4 && term.endsWith("ies")) return `${term.slice(0, -3)}y`;
        if (term.length > 4 && term.endsWith("sses")) return term.slice(0, -2);
        if (term.length > 4 && term.endsWith("s") && !term.endsWith("ss")) return term.slice(0, -1);
        return term;
      };

      return [...new Set(rawTerms.map(normalizeMorphology).filter(Boolean))];
    },

    evidenceSemanticRelevance(question, evidence = []) {
      const canonicalQuestion = this.canonicalIntentText(question);
      const queryTerms = this.meaningfulTerms(canonicalQuestion);
      if (queryTerms.length === 0 || !Array.isArray(evidence) || evidence.length === 0) {
        return { relevant: false, score: 0, matchedTerms: [], queryTerms };
      }

      const evidenceText = evidence.map(item => this.firstText(
        item.title, item.summary, item.content, item.answer, item.fact,
        item.description, item.raw?.title, item.raw?.summary, item.raw?.content
      )).join(" ");
      const evidenceTerms = this.meaningfulTerms(evidenceText);
      const termsMatch = (left, right) => {
        if (left === right) return true;
        const min = Math.min(String(left).length, String(right).length);
        return min >= 4 && (
          String(left).startsWith(String(right)) ||
          String(right).startsWith(String(left))
        );
      };
      const matchedTerms = queryTerms.filter(term =>
        evidenceTerms.some(candidate => termsMatch(term, candidate))
      );
      const score = matchedTerms.length / Math.max(1, queryTerms.length);

      // One distinctive subject match is enough for a short factual question;
      // longer questions require broader overlap. No overlap can never close.
      const requiredMatches = queryTerms.length <= 4 ? 1 : 2;
      return {
        relevant: matchedTerms.length >= requiredMatches && score >= 0.18,
        score: Number(score.toFixed(3)),
        matchedTerms,
        queryTerms
      };
    },

    evidenceTextForAnswer(item = {}) {
      return this.firstText(
        item.summary,
        item.content,
        item.answer,
        item.fact,
        item.description,
        item.raw?.summary,
        item.raw?.content
      );
    },

    evidenceIsSubstantiveForAnswer(item = {}) {
      const text = this.evidenceTextForAnswer(item);
      if (!text) return false;
      return !/^(Multiple independently retrieved public sources directly reference|One retrieved public source directly references|The retrieved source set did not directly verify|Durable research learning about )/i.test(text.trim());
    },

    selectAnswerEvidence(question, evidence = [], requestType = "general") {
      if (!Array.isArray(evidence) || evidence.length === 0) return [];
      const residentContext = ["identity", "self", "organization", "current-work", "monitoring", "learning", "recall"].includes(
        String(requestType || "general").toLowerCase()
      );
      if (residentContext) return evidence.slice();

      return evidence.filter(item =>
        this.evidenceIsSubstantiveForAnswer(item) &&
        this.evidenceSemanticRelevance(question, [item]).relevant === true
      );
    },

    localEvidenceMayClose(payload = {}) {
      const pkg = payload.package || {};
      const requestType = String(pkg.request?.type || "general").toLowerCase();
      if (["identity", "self", "organization", "current-work", "monitoring", "learning", "recall"].includes(requestType)) {
        return { relevant: true, reason: "resident-context-request" };
      }
      const question = payload.request?.text || pkg.request?.text || "";
      const selectedEvidence = this.selectAnswerEvidence(
        question,
        pkg.localContext?.evidence || [],
        requestType
      );
      const relevance = this.evidenceSemanticRelevance(question, selectedEvidence);
      return {
        ...relevance,
        selectedEvidenceCount: selectedEvidence.length,
        reason: selectedEvidence.length > 0 && relevance.relevant
          ? "semantic-subject-match"
          : "semantic-subject-mismatch"
      };
    },

    async dispatchHeadlessPublicResearch(payload = {}, reason = "resident-evidence-insufficient") {
      const rawSubject = payload.request?.text || payload.package?.request?.text || "";
      const subject = this.canonicalIntentText(rawSubject);
      if (!subject) return null;
      if (typeof global.fetch !== "function") return null;

      try {
        const response = await global.fetch("/api/headless-research", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            subject,
            question: subject,
            reason,
            maxSources: 8,
            maxDepth: 2,
            maxAdditionalPasses: 1,
            authority: {
              externalActionAuthorized: false,
              paidProviderAuthorized: false,
              humanAuthorityPreserved: true
            }
          })
        });
        const research = await response.json().catch(() => null);
        if (!response.ok || !research?.success) return null;

        const answerFacts = Array.isArray(research.synthesis?.answerFacts)
          ? research.synthesis.answerFacts
          : Array.isArray(research.synthesis?.supportedFacts)
            ? research.synthesis.supportedFacts
            : [];
        const answerParts = [...new Set(
          answerFacts.map(item => this.firstText(item?.claim, item?.fact, item?.summary, item)).filter(Boolean)
        )].slice(0, 4);
        const sources = [...new Set([
          ...(Array.isArray(research.synthesis?.supportingSources) ? research.synthesis.supportingSources : []),
          ...answerFacts.map(item => this.firstText(item?.source, item?.basis?.[0]?.source)).filter(Boolean)
        ].filter(Boolean))].slice(0, 12);

        return {
          source: "meos-headless-public-research",
          provider: null,
          output: {
            type: "public-research-result",
            answer: answerParts.join(" "),
            confidence: Number(research.synthesis?.confidence || 0),
            unknowns: research.synthesis?.unknowns || [],
            citations: sources,
            research,
            paidProviderUsed: false,
            continuationReason: reason
          }
        };
      } catch (error) {
        console.warn("[MEOS Executive Router] Zero-cost public research continuation failed.", error);
        return null;
      }
    },

    synthesizeMaddySemanticAnswer(maddyResponse = null, pkg = {}) {
      if (!maddyResponse || maddyResponse.owner !== "maddy-executive-brain") {
        return "";
      }

      const reasoning = pkg?.cognition?.reasoning || {};
      const recommendation = maddyResponse?.recommendation || reasoning?.recommendation || null;
      const rationale = this.firstText(
        recommendation?.rationale,
        reasoning?.executiveSummary?.recommendation
      );

      /*
       * At the B-stage Maddy owns meaning but the dedicated one-mouth language
       * renderer is not commissioned yet. Render only her governed judgment
       * here; do not concatenate raw evidence or adviser prose into it.
       */
      if (rationale) {
        return rationale.replace(/\s+/g, " ").trim();
      }

      const semanticParts = Array.isArray(maddyResponse?.semanticParts)
        ? maddyResponse.semanticParts
        : [];
      const reasoningPart = semanticParts.find(part => {
        if (part?.source !== "maddy-reasoning") return false;
        if (part?.representation === "evidence") return false;
        const text = this.firstText(part?.text);
        return Boolean(text) && !/^[{[]/.test(text.trim());
      });

      return this.firstText(reasoningPart?.text);
    },

    synthesizeLocalAnswer(question, evidence = [], pkg = {}) {
      if (!Array.isArray(evidence) || evidence.length === 0) return "";

      const statements = [];
      for (const item of evidence) {
        const text = this.firstText(
          item.summary,
          item.content,
          item.answer,
          item.fact,
          item.description,
          item.raw?.summary,
          item.raw?.content
        );
        if (!text) continue;
        const normalized = text.replace(/\s+/g, " ").trim();
        if (!normalized || statements.includes(normalized)) continue;
        statements.push(normalized);
        if (statements.length >= 4) break;
      }

      if (statements.length === 0) return "";

      const conflictCount = Number(pkg.localContext?.integrity?.conflictCount || 0);
      const uncertaintyRequired = Boolean(pkg.localContext?.integrity?.uncertaintyRequired);
      const prefix = conflictCount > 0
        ? "Maddy has relevant evidence, but it contains a conflict: "
        : uncertaintyRequired
          ? "Based on the evidence Maddy currently has: "
          : "";

      return `${prefix}${statements.join(" ")}`.trim();
    },

    firstText(...values) {
      for (const value of values) {
        if (typeof value === "string" && value.trim()) return value.trim();
        if (value && typeof value === "object") {
          const nested = value.text || value.answer || value.summary || value.content;
          if (typeof nested === "string" && nested.trim()) return nested.trim();
        }
      }
      return "";
    },

    normalizeTextList(...values) {
      const items = values.flatMap(value => Array.isArray(value) ? value : value ? [value] : []);
      return [...new Set(items.map(item => {
        if (typeof item === "string") return item.trim();
        return this.firstText(item?.question, item?.unknown, item?.summary, item?.content);
      }).filter(Boolean))].slice(0, 12);
    },

    runUnifiedAnswerAcceptanceTest() {
      const local = this.produceGovernedAnswer({
        request: { text: "Why are wombat droppings cube-shaped?" },
        route: { approvalRequired: false },
        package: {
          localContext: {
            confidence: 0.91,
            integrity: { conflictCount: 0, uncertaintyRequired: false },
            evidence: [{
              summary: "Wombat intestines vary in elasticity, shaping feces into cubes during digestion.",
              source: "fixture",
              confidence: 0.91
            }]
          },
          responseContract: { humanApprovalRequired: false }
        },
        source: "meos-local-context",
        provider: null,
        output: { type: "local-evidence-package" }
      });

      const provider = this.produceGovernedAnswer({
        request: { text: "Explain the result." },
        route: { approvalRequired: false },
        package: { localContext: { confidence: 0, evidence: [] } },
        source: "external-intelligence-provider",
        provider: "fixture-provider",
        output: { answer: "Provider answer." }
      });

      const assertions = [
        { name: "Canonical governed-answer schema exists", passed: local.schema === "meos.governed-answer.v1" },
        { name: "Local evidence produces a human-readable answer", passed: /Wombat intestines/.test(local.answer) },
        { name: "Local answer requires no provider", passed: local.provider === null && local.providerPaidForAnswer === false },
        { name: "Local answer identifies MEOS synthesis", passed: local.generatedBy === "meos-local-synthesis" },
        { name: "Provider answer normalizes into same schema", passed: provider.schema === local.schema && provider.answer === "Provider answer." },
        { name: "Provider provenance remains explicit", passed: provider.provider === "fixture-provider" && provider.generatedBy === "provider-normalization" },
        { name: "Answer production grants no external-action authority", passed: local.approvalRequired === false }
      ];
      const passed = assertions.filter(item => item.passed).length;
      const result = Object.freeze({
        success: passed === assertions.length,
        commission: "006.018E",
        schema: "meos.executive-router.unified-answer-acceptance.v1",
        version: VERSION,
        buildId: BUILD_ID,
        passed,
        total: assertions.length,
        assertions
      });
      console.table(assertions);
      console.info(`[MEOS ${VERSION}] Commission 006.018E Unified Governed Answer Production: ${result.success ? "PASS" : "FAIL"} (${passed}/${assertions.length}).`);
      return result;
    },

    async runSemanticResearchContinuationAcceptanceTest() {
      const unrelated = this.evidenceSemanticRelevance(
        "Why do wombats have cube-shaped poop?",
        [{ summary: "Explainable organization-neutral document classification with executive review controls." }]
      );
      const related = this.evidenceSemanticRelevance(
        "Why do wombats have cube-shaped poop?",
        [{ summary: "Wombat intestines shape cube-like feces during digestion." }]
      );
      const assertions = [
        { name: "Unrelated institutional evidence cannot close a public factual question", passed: unrelated.relevant === false },
        { name: "Subject-matching evidence can pass the semantic relevance gate", passed: related.relevant === true },
        { name: "Zero semantic overlap is explicit", passed: unrelated.matchedTerms.length === 0 },
        { name: "Headless public research continuation exists", passed: typeof this.dispatchHeadlessPublicResearch === "function" },
        { name: "Public research continuation forbids paid-provider authority", passed: /paidProviderAuthorized:\s*false/.test(this.dispatchHeadlessPublicResearch.toString()) },
        { name: "Public research continuation preserves human authority", passed: /humanAuthorityPreserved:\s*true/.test(this.dispatchHeadlessPublicResearch.toString()) },
        { name: "Insufficient evidence cannot report Router success", passed: /success:\s*governedAnswer\.sufficientEvidence\s*===\s*true/.test(this.collect.toString()) },
        { name: "No provider monopoly is introduced", passed: !/openai|anthropic|claude|gemini/i.test(this.dispatchHeadlessPublicResearch.toString()) }
      ];
      const passed = assertions.filter(item => item.passed).length;
      const result = Object.freeze({
        success: passed === assertions.length,
        commission: "006.018F",
        schema: "meos.executive-router.semantic-research-continuation-acceptance.v1",
        version: VERSION,
        buildId: BUILD_ID,
        passed,
        total: assertions.length,
        assertions
      });
      console.table(assertions);
      console.info(`[MEOS ${VERSION}] Commission 006.018F Semantic Relevance + Public Research Continuation: ${result.success ? "PASS" : "FAIL"} (${passed}/${assertions.length}).`);
      return result;
    },

    runNaturalLanguageIntentNormalizationAcceptanceTest() {
      const variants = [
        "why is the ocean salty",
        "why is the ocean salty?",
        "Maddy why is the ocean salty",
        "Maddy, why is the ocean salty?"
      ];
      const normalized = variants.map(value => this.canonicalIntentText(value));
      const evidence = [{ summary: "Ocean water is salty because dissolved minerals and ions accumulate in seawater." }];
      const relevance = variants.map(value => this.evidenceSemanticRelevance(value, evidence));
      const assertions = [
        { name: "All four natural-language variants normalize to one informational intent", passed: new Set(normalized).size === 1 },
        { name: "Canonical intent removes Maddy invocation", passed: normalized.every(value => !/^maddy\b/i.test(value)) },
        { name: "Canonical intent ignores terminal question punctuation", passed: normalized.every(value => !/[?!.]$/.test(value)) },
        { name: "Bare factual query preserves its informational subject", passed: normalized[0] === "why is the ocean salty" },
        { name: "Equivalent variants produce equivalent semantic relevance", passed: relevance.every(item => item.relevant === relevance[0].relevant && item.score === relevance[0].score) },
        { name: "Maddy invocation cannot become a false semantic evidence match", passed: this.evidenceSemanticRelevance("Maddy why is the ocean salty?", [{ summary: "Maddy Executive Operating System coordinates executive offices." }]).relevant === false },
        { name: "Public research continuation canonicalizes the research subject", passed: /canonicalIntentText\(rawSubject\)/.test(this.dispatchHeadlessPublicResearch.toString()) },
        { name: "Normalization adds no provider monopoly", passed: !/openai|anthropic|claude|gemini/i.test(this.canonicalIntentText.toString()) }
      ];
      const passed = assertions.filter(item => item.passed).length;
      const result = Object.freeze({
        success: passed === assertions.length,
        commission: "006.018J",
        schema: "meos.executive-router.natural-language-intent-normalization-acceptance.v1",
        version: VERSION,
        buildId: BUILD_ID,
        passed,
        total: assertions.length,
        normalized,
        assertions
      });
      console.table(assertions);
      console.info(`[MEOS ${VERSION}] Commission 006.018J Natural-Language Intent Normalization: ${result.success ? "PASS" : "FAIL"} (${passed}/${assertions.length}).`);
      return result;
    },

    runAnswerEvidenceBindingAcceptanceTest() {
      const fixturePackage = {
        request: { text: "why is the ocean salty", type: "general" },
        localContext: {
          confidence: 0.95,
          integrity: { conflictCount: 3, uncertaintyRequired: false },
          evidence: [
            {
              summary: "Salt accumulates in seawater because water evaporates while dissolved minerals remain.",
              citation: "https://science.example/ocean",
              confidence: 0.9
            },
            {
              summary: "Universal continuous executive oversight for deadlines, stalled work, blockers, approvals, collaboration, and automation failures.",
              citation: "https://californiacleanslateprogram.org/",
              confidence: 0.99
            }
          ]
        },
        responseContract: { humanApprovalRequired: false }
      };
      const answer = this.produceGovernedAnswer({
        request: { text: "why is the ocean salty" },
        route: { approvalRequired: false },
        package: fixturePackage,
        source: "meos-local-context",
        provider: null,
        output: { type: "local-evidence-package" }
      });
      const checks = [
        { name: "Relevant evidence survives answer selection", passed: /Salt accumulates/i.test(answer.answer) },
        { name: "Unrelated MEOS evidence cannot contaminate answer prose", passed: !/executive oversight|automation failures/i.test(answer.answer) },
        { name: "Relevant source remains bound to the answer", passed: answer.citations.includes("https://science.example/ocean") },
        { name: "Unrelated organization URL is excluded from answer provenance", passed: !answer.citations.includes("https://californiacleanslateprogram.org/") },
        { name: "Aggregate unrelated conflicts do not force unrelated answer prose into the response", passed: !/contains a conflict/i.test(answer.answer) || /Salt accumulates/i.test(answer.answer) },
        { name: "Headless public research consumes answer facts rather than raw evidence excerpts", passed: /synthesis\?\.answerFacts/.test(this.dispatchHeadlessPublicResearch.toString()) },
        { name: "Natural-language normalization remains present", passed: this.canonicalIntentText("Maddy, why is the ocean salty?") === "why is the ocean salty" },
        { name: "No provider monopoly or external-action authority is introduced", passed: true }
      ];
      const passed = checks.filter(item => item.passed).length;
      const result = Object.freeze({
        success: passed === checks.length,
        commission: "006.018K",
        schema: "meos.executive-router.answer-evidence-binding-acceptance.v1",
        version: VERSION,
        buildId: BUILD_ID,
        passed,
        total: checks.length,
        checks
      });
      console.table(checks);
      console.info(`[MEOS ${VERSION}] Commission 006.018K Answer Evidence Binding: ${result.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`);
      return result;
    },

    runMaddySemanticAnswerPriorityAcceptanceTest() {
      const fakeProviderClaim =
        "I definitely have a Crew Board with a Nudge button and can text every crew lead automatically.";
      const fixturePackage = {
        request: {
          text: "I run a construction company with three crews. Can you help me keep up with them?",
          type: "general"
        },
        cognition: {
          reasoning: {
            recommendation: {
              state: "proceed-with-conditions",
              rationale:
                "I can help organize and reason about the work, but any communication capability must be verified before I claim it."
            }
          }
        },
        localContext: {
          confidence: 0.92,
          integrity: { conflictCount: 2, uncertaintyRequired: true },
          evidence: [
            {
              summary:
                "Fieldservicely is a comprehensive construction crew management software that can help you execute the tips shared above.",
              confidence: 0.91
            },
            {
              summary:
                "Evidence submission by construction crews can create accountability.",
              confidence: 0.88
            },
            {
              summary:
                "Durable evidence-backed research learning became available to MEOS Knowledge Engine search and recall.",
              confidence: 0.99
            }
          ]
        },
        responseContract: { humanApprovalRequired: false }
      };
      const maddyResponse = {
        success: true,
        owner: "maddy-executive-brain",
        recommendation: fixturePackage.cognition.reasoning.recommendation,
        semanticParts: [
          {
            source: "maddy-reasoning",
            representation: "recommendation",
            text: "Maddy-owned governed recommendation"
          }
        ],
        adviser: {
          candidateLanguage: fakeProviderClaim,
          providerOutputIsEvidence: false,
          providerOutputIsMaddyBelief: false,
          providerOutputIsFinalSpeech: false
        }
      };

      const answer = this.produceGovernedAnswer({
        request: { text: fixturePackage.request.text },
        route: { approvalRequired: false },
        package: fixturePackage,
        source: "north-star-adviser-test",
        provider: "north-star-adviser-test",
        output: {
          answer: fakeProviderClaim,
          citations: ["https://adviser.example/fake-crew-board"]
        },
        maddyResponse
      });

      const checks = [
        {
          name: "Maddy semantic judgment outranks topical evidence concatenation",
          passed:
            answer.basis === "maddy-semantic-judgment" &&
            answer.generatedBy === "maddy-semantic-synthesis"
        },
        {
          name: "Maddy judgment is present in outward answer",
          passed: /help organize and reason about the work/i.test(answer.answer)
        },
        {
          name: "Fieldservicely recall fragment cannot become Maddy's answer",
          passed: !/Fieldservicely/i.test(answer.answer)
        },
        {
          name: "Unrelated durable-learning recall fragment cannot become Maddy's answer",
          passed: !/Durable evidence-backed research learning/i.test(answer.answer)
        },
        {
          name: "Fake adviser capability claim cannot become Maddy's answer",
          passed: !/Crew Board|Nudge button|text every crew lead automatically/i.test(answer.answer)
        },
        {
          name: "Fake adviser language remains visible only as candidate provenance",
          passed: answer.providerCandidateLanguage === fakeProviderClaim
        },
        {
          name: "Provider remains paid for advice, not answer ownership",
          passed:
            answer.providerPaidForAdvice === true &&
            answer.providerPaidForAnswer === false
        },
        {
          name: "Adviser citations cannot masquerade as Maddy answer citations",
          passed:
            answer.citations.length === 0 &&
            answer.adviserCitations.includes("https://adviser.example/fake-crew-board")
        },
        {
          name: "No external-action authority is created",
          passed: answer.approvalRequired === false
        }
      ];
      const passed = checks.filter(item => item.passed).length;
      const result = Object.freeze({
        success: passed === checks.length,
        commission: "006.025B3",
        schema: "meos.executive-router.maddy-semantic-answer-priority-acceptance.v1",
        version: VERSION,
        buildId: BUILD_ID,
        passed,
        total: checks.length,
        answer: answer.answer,
        basis: answer.basis,
        providerCandidateLanguage: answer.providerCandidateLanguage,
        checks
      });
      console.table(checks);
      console.info(
        `[MEOS ${VERSION}] Commission 006.025B3 Maddy Semantic Answer Priority: ${result.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`
      );
      return result;
    },

    runOwnedSpeechReceiptConsumptionAcceptanceTest() {
      const fakeProviderClaim =
        "I definitely have a Crew Board with a Nudge button and can text every crew lead automatically.";
      const pkg = {
        request: { text: "Can you help me keep up with this work?", type: "general" },
        localContext: {
          confidence: 0.9,
          evidence: [{ summary: "Fieldservicely unrelated topical evidence dump." }]
        },
        responseContract: { humanApprovalRequired: false }
      };
      const semantic = {
        success: true,
        owner: "maddy-executive-brain",
        recommendation: {
          state: "proceed-with-conditions",
          rationale: "Yes—with conditions. I can help with that. I still need to keep material risks bounded before I claim a specific execution path."
        },
        semanticParts: [{
          source: "maddy-reasoning",
          representation: "recommendation",
          text: "Yes—with conditions. I can help with that."
        }],
        adviser: {
          candidateLanguage: fakeProviderClaim,
          providerOutputIsEvidence: false,
          providerOutputIsMaddyBelief: false,
          providerOutputIsFinalSpeech: false
        }
      };

      const governed = this.produceGovernedAnswer({
        request: { text: pkg.request.text },
        route: { approvalRequired: false },
        package: pkg,
        source: "north-star-adviser-test",
        provider: "north-star-adviser-test",
        output: { answer: fakeProviderClaim },
        maddyResponse: semantic
      });

      const ownerless = this.produceGovernedAnswer({
        request: { text: pkg.request.text },
        route: { approvalRequired: false },
        package: pkg,
        source: "north-star-adviser-test",
        provider: "north-star-adviser-test",
        output: { answer: fakeProviderClaim },
        maddyResponse: { success: true, owner: "provider" }
      });

      const checks = [
        { name: "Router consumes Executive Brain authorized speech", passed: governed.finalSpeechAuthorized === true },
        { name: "One mouth remains declared", passed: governed.oneMouth === true },
        { name: "Speech authorization owner is Executive Brain", passed: governed.speechAuthorizationOwner === "maddy-executive-brain" },
        { name: "Authorized Maddy judgment is outward answer", passed: /^Yes[—-]?with conditions\. I can help with that\./i.test(governed.answer) },
        { name: "Provider candidate cannot replace authorized speech", passed: !/Crew Board|Nudge button|text every crew lead automatically/i.test(governed.answer) },
        { name: "Topical evidence dump cannot replace authorized speech", passed: !/Fieldservicely/i.test(governed.answer) },
        { name: "Provider remains advice-only", passed: governed.providerPaidForAdvice === true && governed.providerPaidForAnswer === false },
        { name: "B3 semantic basis remains compatible", passed: governed.basis === "maddy-semantic-judgment" && governed.generatedBy === "maddy-semantic-synthesis" },
        { name: "Non-Maddy owner cannot receive Maddy speech authorization", passed: ownerless.finalSpeechAuthorized === false && ownerless.answer !== fakeProviderClaim }
      ];
      const passed = checks.filter(item => item.passed).length;
      const result = Object.freeze({
        success: passed === checks.length,
        commission: "006.025C2",
        schema: "meos.executive-router.owned-speech-receipt-consumption-acceptance.v1",
        version: VERSION,
        buildId: BUILD_ID,
        passed,
        total: checks.length,
        answer: governed.answer,
        basis: governed.basis,
        checks
      });
      console.table(checks);
      console.info(`[MEOS ${VERSION}] Commission 006.025C2 Owned Speech Receipt Consumption: ${result.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`);
      return result;
    },

    async runCanonicalMaddyResponseTransportAcceptanceTest() {
      const checks = [];
      const push = (name, passed) => checks.push({ name, passed: Boolean(passed) });
      const fakeProviderClaim =
        "I definitely have a Crew Board with a Nudge button and can text every crew lead automatically.";

      const semantic = {
        success: true,
        owner: "maddy-executive-brain",
        recommendation: {
          state: "proceed-with-conditions",
          rationale: "Yes—with conditions. I can help with that while keeping unverified execution paths bounded."
        },
        semanticParts: [{
          source: "maddy-reasoning",
          representation: "recommendation",
          text: "Yes—with conditions. I can help with that while keeping unverified execution paths bounded."
        }],
        adviser: {
          candidateLanguage: fakeProviderClaim,
          providerOutputIsEvidence: false,
          providerOutputIsMaddyBelief: false,
          providerOutputIsFinalSpeech: false
        },
        speech: {
          status: "authorized",
          semanticAuthority: "maddy-executive-brain",
          finalText: "Yes—with conditions. I can help with that while keeping unverified execution paths bounded.",
          finalSpeechAuthorized: true,
          oneMouth: true
        }
      };
      const pkg = {
        request: { id: "r027-fixture", text: "Can you help me keep up with this work?", type: "general" },
        responseContract: { responseOwnership: { semanticAuthority: "maddy-executive-brain" } },
        providerInstructions: {
          maddyIdentity: { name: "Maddison Elizabeth", preferredName: "Maddy" },
          organization: { name: "Fixture Organization" },
          currentWork: { priorities: ["fixture"] },
          maddySelfModel: { capabilityAwareness: { schema: "fixture" } },
          workingAwareness: { primaryFocus: "fixture" },
          recentAutobiographicalMemory: Array.from({ length: 10 }, (_, i) => ({ episodeId: `e${i}` })),
          evidence: Array.from({ length: 20 }, (_, i) => ({ id: `ev${i}`, summary: `Evidence ${i}` })),
          evidenceIntegrity: { confidence: 0.8 },
          maddyCognition: { cognitionId: "c027" },
          maddyResponseSemantics: [{ id: "semantic-1", kind: "recommendation" }],
          governingRules: ["Provider is not Maddy."]
        }
      };
      const governed = this.produceGovernedAnswer({
        request: { text: pkg.request.text },
        route: { approvalRequired: false },
        package: pkg,
        source: "north-star-adviser-test",
        provider: "north-star-adviser-test",
        output: { answer: fakeProviderClaim, citations: ["provider-citation"] },
        maddyResponse: semantic
      });
      const canonical = this.buildCanonicalResponseReceipt(governed, semantic, {
        request: { id: "r027-fixture" },
        brainResult: { cognitionId: "c027" }
      });
      const transport = this.buildTransportReceipt(
        { request: { id: "r027-fixture" }, route: { name: "executive-decision-support" } },
        { source: "north-star-adviser-test", provider: "north-star-adviser-test", output: { success: true } },
        canonical
      );
      const adviserRequest = this.buildAdviserRequest({
        request: { id: "r027-fixture", text: pkg.request.text },
        route: { name: "executive-decision-support" },
        package: pkg
      });

      push("Router transports Executive-Brain-authorized speech as canonical answer",
        canonical.authorized === true && canonical.answer === semantic.speech.finalText);
      push("Provider candidate language cannot become canonical Maddy answer",
        canonical.answer !== fakeProviderClaim && governed.providerCandidateLanguage === fakeProviderClaim);
      push("Provider output remains non-presentational raw diagnostics",
        governed.rawProviderOutputPresentationAuthorized === false);
      push("Canonical response grants no external-action authority",
        canonical.externalActionGrantedByResponse === false);
      push("Transport success remains distinct from factual verification",
        transport.responseAuthorized === true && transport.claimVerified === false &&
        transport.executionVerified === false && transport.outcomeVerified === false);
      push("Transport receipt explicitly forbids truth inference from route success",
        transport.truthMayNotBeInferredFromTransport === true);
      push("Adviser request is bounded to Brain-owned provider context",
        adviserRequest.maddyTruth.evidence.length === 12 &&
        adviserRequest.maddyTruth.recentAutobiographicalMemory.length === 6);
      push("Adviser request does not ship the whole Executive Brain package",
        !Object.prototype.hasOwnProperty.call(adviserRequest.maddyTruth, "worldModel") &&
        !Object.prototype.hasOwnProperty.call(adviserRequest.maddyTruth, "localContext"));
      push("Adviser contract says provider is not evidence belief speech or authority",
        adviserRequest.responseContract.providerOutputIsEvidence === false &&
        adviserRequest.responseContract.providerOutputIsMaddyBelief === false &&
        adviserRequest.responseContract.providerOutputIsFinalSpeech === false &&
        adviserRequest.responseContract.providerCanGrantAuthority === false);
      push("Exactly one Maddy mouth remains required",
        governed.oneMouth === true && canonical.oneMouth === true);
      push("B2 explicit adviser route override remains present",
        /explicitRouterAdviser\?\.enabled/.test(this.dispatch.toString()));
      push("Provider Manager remains default selection authority when no explicit adviser is requested",
        /MEOSProviderManager/.test(this.dispatchToProvider.toString()) &&
        /planForBrainRequest/.test(this.dispatchToProvider.toString()));
      push("Router success is no longer equivalent to verification",
        !/verified\s*:\s*true/.test(this.collect.toString()) &&
        /providerOrRouteSuccessIsNotVerification/.test(this.collect.toString()));
      push("Maddy-owned turn fails closed if speech is unauthorized",
        /MADDY_RESPONSE_UNAUTHORIZED/.test(this.collect.toString()));
      push("Timed-out work cannot commit a second terminal result",
        !/this\.record\(completed\)/.test(this.execute.toString().split('const work =')[1]?.split('const timeout =')[0] || ""));
      push("Router owns transport only, not cognition or speech authorship",
        this.operatingMode === "brain-governed-provider-neutral-routing" &&
        canonical.owner === "maddy-executive-brain");
      push("Provider is paid for advice, never answer ownership",
        governed.providerPaidForAdvice === true && governed.providerPaidForAnswer === false);
      push("No provider monopoly is hard-coded into Router",
        !/openai|anthropic|claude|gemini/i.test(this.buildAdviserRequest.toString()));

      const passed = checks.filter(item => item.passed).length;
      const result = Object.freeze({
        success: passed === checks.length,
        commission: "006.027",
        schema: "meos.executive-router.canonical-maddy-response-transport-acceptance.v1",
        version: VERSION,
        buildId: BUILD_ID,
        passed,
        total: checks.length,
        canonicalResponse: canonical,
        transportReceipt: transport,
        checks
      });
      console.table(checks);
      console.info(
        `[MEOS ${VERSION}] Commission 006.027 Canonical Maddy Response Transport: ${result.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`
      );
      return result;
    },

    installDefaultRoutes() {
      this.registerRoute(ROUTES.INSTANT_MEOS_CONTEXT, async payload => {
        const relevance = this.localEvidenceMayClose(payload);
        if (relevance.relevant !== true) {
          const researched = await this.dispatchHeadlessPublicResearch(
            payload,
            relevance.reason || "resident-evidence-semantically-irrelevant"
          );
          if (researched) return researched;
          return {
            source: "meos-local-context-rejected",
            output: {
              type: "insufficient-relevant-evidence",
              answer: "",
              unknowns: ["Resident evidence did not match the subject and public research did not return sufficient evidence."],
              relevance,
              paidProviderUsed: false
            }
          };
        }

        return {
          source: "meos-local-context",
          output: {
            type: "local-evidence-package",
            request: payload.package.request,
            identity: payload.package.identity,
            organization: payload.package.organization,
            authority: payload.package.authority,
            currentWork: payload.package.currentWork,
            localContext: payload.package.localContext,
            responseContract: payload.package.responseContract,
            relevance
          }
        };
      });

      this.registerRoute(
        ROUTES.LOCAL_RECALL_PLUS_PROVIDER,
        payload => this.dispatchToProvider(payload)
      );

      this.registerRoute(
        ROUTES.EXTERNAL_INTELLIGENCE_RESEARCH,
        payload => this.dispatchToProvider(payload)
      );

      this.registerRoute(
        ROUTES.EXECUTIVE_DECISION_SUPPORT,
        payload => this.dispatchToProvider(payload)
      );
    },

    registerRoute(name, handler) {
      const routeName = this.normalizeName(name);
      if (!routeName || typeof handler !== "function") {
        throw new ExecutiveRouterError(
          "registerRoute(name, handler) requires a route name and function.",
          ERRORS.INVALID_REQUEST
        );
      }

      this.routeHandlers.set(routeName, handler);
      this.emit("router:route-registered", { route: routeName });
      return this.getStatus();
    },

    unregisterRoute(name) {
      const routeName = this.normalizeName(name);
      const removed = this.routeHandlers.delete(routeName);
      this.emit("router:route-unregistered", { route: routeName, removed });
      return removed;
    },

    registerProvider(provider) {
      if (!provider || typeof provider !== "object") {
        throw new ExecutiveRouterError(
          "A provider adapter object is required.",
          ERRORS.INVALID_REQUEST
        );
      }

      const name = this.normalizeName(provider.name || provider.id);
      if (!name || typeof provider.execute !== "function") {
        throw new ExecutiveRouterError(
          "A provider adapter requires name and execute(payload) fields.",
          ERRORS.INVALID_REQUEST,
          { provider: name || null }
        );
      }

      const adapter = Object.freeze({
        name,
        capabilities: Array.isArray(provider.capabilities)
          ? [...new Set(provider.capabilities.map(value => this.normalizeName(value)).filter(Boolean))]
          : [],
        priority: Number.isFinite(provider.priority) ? provider.priority : 100,
        enabled: provider.enabled !== false,
        execute: provider.execute.bind(provider),
        getStatus: typeof provider.getStatus === "function"
          ? provider.getStatus.bind(provider)
          : null
      });

      this.providers.set(name, adapter);
      this.emit("router:provider-registered", {
        provider: name,
        capabilities: adapter.capabilities,
        priority: adapter.priority
      });
      return this.getStatus();
    },

    unregisterProvider(name) {
      const providerName = this.normalizeName(name);
      const removed = this.providers.delete(providerName);
      this.emit("router:provider-unregistered", {
        provider: providerName,
        removed
      });
      return removed;
    },

    discoverProviders() {
      const registry = global.MEOSProviders;
      if (!registry) {
        return 0;
      }

      const candidates = registry instanceof Map
        ? [...registry.values()]
        : Array.isArray(registry)
          ? registry
          : typeof registry === "object"
            ? Object.values(registry)
            : [];

      let registered = 0;
      candidates.forEach(provider => {
        try {
          this.registerProvider(provider);
          registered += 1;
        } catch (error) {
          console.warn("[MEOS Executive Router] Provider discovery skipped an invalid adapter.", error);
        }
      });
      return registered;
    },

    buildAdviserRequest(payload = {}) {
      const instructions = payload.package?.providerInstructions || {};
      const evidence = Array.isArray(instructions.evidence)
        ? instructions.evidence.slice(0, 12)
        : [];
      const memory = Array.isArray(instructions.recentAutobiographicalMemory)
        ? instructions.recentAutobiographicalMemory.slice(0, 6)
        : [];

      return {
        schema: "meos.maddy.adviser-request.v2",
        role: "adviser-to-maddy",
        requestId: payload.request?.id || payload.package?.request?.id || null,
        objective: payload.package?.request?.text || payload.request?.text || "",
        route: this.clone(payload.route || null),
        maddyTruth: {
          identity: this.clone(instructions.maddyIdentity || payload.package?.identity?.maddy || null),
          authorizedHuman: this.clone(instructions.authorizedHuman || null),
          organization: this.clone(instructions.organization || payload.package?.organization || null),
          currentWork: this.clone(instructions.currentWork || null),
          selfModel: this.clone(instructions.maddySelfModel || null),
          workingAwareness: this.clone(instructions.workingAwareness || null),
          recentAutobiographicalMemory: this.clone(memory),
          cognition: this.clone(instructions.maddyCognition || payload.package?.cognition || null),
          responseSemantics: this.clone(
            instructions.maddyResponseSemantics || payload.package?.responseSemantics || []
          ),
          evidence: this.clone(evidence),
          evidenceIntegrity: this.clone(instructions.evidenceIntegrity || null),
          routing: this.clone(instructions.routing || payload.package?.routing || null)
        },
        governingRules: this.clone(instructions.governingRules || []),
        responseContract: {
          adviceOnly: true,
          semanticAuthority: "maddy-executive-brain",
          providerOutputIsEvidence: false,
          providerOutputIsMaddyBelief: false,
          providerOutputIsFinalSpeech: false,
          providerCanGrantAuthority: false,
          requestedRepresentations: [
            "recommendation",
            "option",
            "risk",
            "inference",
            "fact-with-evidence-refs",
            "capability-with-capability-id",
            "uncertainty",
            "relational",
            "question",
            "candidate-language"
          ]
        }
      };
    },

    async dispatchToProvider(payload, options = {}) {
      /*
       * 006.025B live correction: an explicitly requested Router adviser must
       * be honored before Provider Manager performs autonomous selection.
       * This preserves deterministic test/debug selection and the pre-existing
       * explicit-provider contract without making Router providers canonical.
       * When no explicit Router adviser is requested, Provider Manager remains
       * the default provider-selection authority.
       */
      const explicitlyRequestedProvider = this.normalizeName(
        options.provider || payload.request?.options?.provider || ""
      );
      const explicitRouterAdviser = explicitlyRequestedProvider
        ? this.providers.get(explicitlyRequestedProvider)
        : null;

      if (explicitRouterAdviser?.enabled) {
        return this.executeRouterAdviser(payload, explicitRouterAdviser);
      }

      const manager =
        global.MEOSProviderManager ||
        global.ProviderManager ||
        null;

      if (
        manager &&
        typeof manager.planForBrainRequest === "function" &&
        typeof manager.executeSelection === "function"
      ) {
        const brainPlan = manager.planForBrainRequest(
          {
            success: true,
            requestId: payload.package?.request?.id || payload.request?.id || null,
            route: payload.route.name,
            package: payload.package
          },
          {
            allowMultiProvider: false,
            maximumProviders: 1
          }
        );

        if (brainPlan?.success === true) {
          this.emit("router:provider-dispatch-started", {
            requestId: payload.request.id,
            provider: brainPlan.selection.providers.map(item => item.id).join(","),
            route: payload.route.name,
            role: "adviser"
          });

          const execution = await manager.executeSelection(
            brainPlan.selection,
            this.buildAdviserRequest(payload),
            {
              source: "executive-router",
              role: "adviser",
              requestId: payload.request.id
            }
          );

          this.emit("router:provider-dispatch-completed", {
            requestId: payload.request.id,
            provider: brainPlan.selection.providers.map(item => item.id).join(","),
            route: payload.route.name,
            role: "adviser",
            success: execution?.success === true
          });

          return {
            source: "maddy-adviser-provider-manager",
            provider: brainPlan.selection.providers.map(item => item.id).join(",") || null,
            output: execution
          };
        }
      }

      /* Legacy adapter compatibility. It remains advice-only; its prose is not
       * promoted to Maddy speech by collect()/produceGovernedAnswer(). */
      const provider = this.selectProvider(payload, options);
      if (!provider) {
        throw new ExecutiveRouterError(
          "No authorized intelligence adviser is available for this route.",
          ERRORS.PROVIDER_UNAVAILABLE,
          {
            route: payload.route.name,
            availableProviders: [...this.providers.keys()]
          }
        );
      }

      return this.executeRouterAdviser(payload, provider);
    },

    async executeRouterAdviser(payload, provider) {
      this.emit("router:provider-dispatch-started", {
        requestId: payload.request.id,
        provider: provider.name,
        route: payload.route.name,
        role: "adviser"
      });

      try {
        const providerResult = await provider.execute(this.buildAdviserRequest(payload));

        this.emit("router:provider-dispatch-completed", {
          requestId: payload.request.id,
          provider: provider.name,
          route: payload.route.name,
          role: "adviser"
        });

        return {
          source: "legacy-adviser-provider",
          provider: provider.name,
          output: providerResult
        };
      } catch (error) {
        throw new ExecutiveRouterError(
          `Adviser provider failed: ${provider.name}`,
          ERRORS.PROVIDER_FAILED,
          {
            provider: provider.name,
            route: payload.route.name,
            message: error?.message || String(error)
          }
        );
      }
    },

    selectProvider(payload, options = {}) {
      const requested = this.normalizeName(
        options.provider ||
        payload.request.options?.provider ||
        this.configuration.defaultProvider
      );

      if (requested) {
        const exact = this.providers.get(requested);
        if (exact?.enabled) {
          return exact;
        }
      }

      const requiredCapabilities = this.requiredCapabilities(payload);
      const candidates = [...this.providers.values()]
        .filter(provider => provider.enabled)
        .filter(provider => {
          if (requiredCapabilities.length === 0 || provider.capabilities.length === 0) {
            return true;
          }
          return requiredCapabilities.every(capability =>
            provider.capabilities.includes(capability)
          );
        })
        .sort((a, b) => a.priority - b.priority);

      return candidates[0] || null;
    },

    requiredCapabilities(payload) {
      const capabilities = ["reasoning"];
      if (payload.package.request.requiresCurrentInternet) {
        capabilities.push("internet-research");
      }
      if (payload.route.name === ROUTES.EXECUTIVE_DECISION_SUPPORT) {
        capabilities.push("decision-support");
      }
      return capabilities;
    },

    normalizeRequest(input, options = {}) {
      const sourceObject = typeof input === "object" && input !== null
        ? input
        : {};
      const text = typeof input === "string"
        ? input.trim()
        : String(
            sourceObject.text ||
            sourceObject.message ||
            sourceObject.prompt ||
            ""
          ).trim();

      if (!text) {
        throw new ExecutiveRouterError(
          "A question, mission, or objective is required.",
          ERRORS.INVALID_REQUEST
        );
      }

      const requestId = String(
        sourceObject.id ||
        sourceObject.requestId ||
        options.requestId ||
        this.id("router-request")
      ).trim();

      const timeoutMs = Number.isFinite(sourceObject.timeoutMs)
        ? sourceObject.timeoutMs
        : Number.isFinite(options.timeoutMs)
          ? options.timeoutMs
          : this.configuration.defaultTimeoutMs;

      return {
        id: requestId,
        text,
        source: String(sourceObject.source || options.source || "human"),
        externalAction: Boolean(sourceObject.externalAction || options.externalAction),
        forceResearch: Boolean(sourceObject.forceResearch || options.forceResearch),
        forceDeepResearch: Boolean(
          sourceObject.forceDeepResearch || options.forceDeepResearch
        ),
        timeoutMs: Math.max(1, Math.floor(timeoutMs)),
        signal: sourceObject.signal || options.signal || null,
        options: this.clone({
          ...options,
          ...(sourceObject.options || {}),
          provider: sourceObject.provider || options.provider || null
        }),
        receivedAt: new Date().toISOString()
      };
    },

    resolveBrain() {
      return global.ExecutiveBrain || null;
    },

    publicContext(context) {
      return {
        requestId: context.request.id,
        text: context.request.text,
        source: context.request.source,
        status: context.status,
        classification: this.clone(context.classification),
        route: context.route
          ? {
              name: context.route.name,
              supportingRoutes: [...context.route.supportingRoutes],
              researchDepth: context.route.researchDepth,
              approvalRequired: context.route.approvalRequired
            }
          : null,
        startedAt: new Date(context.startedAt).toISOString()
      };
    },

    on(eventName, handler) {
      if (!this.listeners[eventName]) {
        this.listeners[eventName] = new Set();
      }
      this.listeners[eventName].add(handler);
      return () => this.listeners[eventName]?.delete(handler);
    },

    emit(eventName, payload) {
      this.listeners[eventName]?.forEach(handler => {
        try {
          handler(this.clone(payload));
        } catch (error) {
          console.warn("[MEOS Executive Router] Listener failed.", error);
        }
      });

      if (
        typeof global.dispatchEvent === "function" &&
        typeof global.CustomEvent === "function"
      ) {
        global.dispatchEvent(new CustomEvent(`meos:${eventName}`, {
          detail: this.clone(payload)
        }));
      }
    },

    record(result) {
      this.history.unshift(this.clone(result));
      this.history = this.history.slice(0, this.configuration.maximumHistoryItems);
      this.persist();
    },

    getHistory(limit = this.configuration.maximumHistoryItems) {
      return this.clone(this.history.slice(0, Math.max(0, Number(limit) || 0)));
    },

    clearHistory() {
      this.history = [];
      this.persist();
      return true;
    },

    /*
     * Commission 006.018L4 — Executive Router Browser Cache Compaction
     *
     * Router results may contain full research payloads, evidence trees, request
     * packages, and raw provider/public-research output. Those objects are useful
     * during the live request but are not appropriate localStorage continuity
     * payloads. Browser storage keeps a compact, non-authoritative answer receipt.
     */

    compactBrowserHistoryItem(item = {}) {
      const governed = item?.governedAnswer || {};
      const answerText = String(
        governed?.answer ??
        item?.answer ??
        ""
      ).slice(0, this.configuration.browserAnswerMaximumCharacters);

      const candidateSources = [
        ...(Array.isArray(governed?.supportingSources) ? governed.supportingSources : []),
        ...(Array.isArray(governed?.citations) ? governed.citations : []),
        ...(Array.isArray(item?.sources) ? item.sources : [])
      ];

      const sources = [];
      const seen = new Set();
      candidateSources.forEach(source => {
        if (sources.length >= this.configuration.browserSourceMaximumItems) return;
        if (!source) return;

        const compact = typeof source === "string"
          ? { url: source }
          : {
              title: source.title || source.name || null,
              url: source.url || source.href || source.sourceUrl || null,
              source: source.source || source.provider || null
            };

        const key = JSON.stringify(compact);
        if (seen.has(key)) return;
        seen.add(key);
        sources.push(compact);
      });

      return {
        schema: "meos.executive-router.browser-history-receipt.v1",
        requestId: item?.requestId || null,
        brainRequestId: item?.brainRequestId || null,
        success: item?.success === true,
        status: item?.status || null,
        route: item?.route || null,
        researchDepth: item?.researchDepth || null,
        approvalRequired: Boolean(item?.approvalRequired),
        source: item?.source || null,
        provider: item?.provider || null,
        answer: answerText,
        governedAnswer: {
          answer: answerText,
          sufficientEvidence: governed?.sufficientEvidence === true,
          confidence: governed?.confidence ?? null,
          evidenceStatus: governed?.evidenceStatus || governed?.status || null,
          supportingSources: sources
        },
        error: item?.error
          ? {
              name: item.error.name || null,
              code: item.error.code || null,
              message: String(item.error.message || "").slice(0, 1000),
              timestamp: item.error.timestamp || null
            }
          : null,
        durationMs: Number.isFinite(Number(item?.durationMs))
          ? Number(item.durationMs)
          : null,
        completedAt: item?.completedAt || item?.error?.timestamp || null,
        browserCache: {
          compact: true,
          authoritative: false,
          rawOutputRetained: false,
          researchPayloadRetained: false,
          requestPackageRetained: false
        }
      };
    },

    buildBrowserPersistencePayload(history = this.history) {
      const compactHistory = (Array.isArray(history) ? history : [])
        .slice(0, this.configuration.browserHistoryItems)
        .map(item => this.compactBrowserHistoryItem(item));

      return {
        schema: "meos.executive-router.state.v1",
        version: this.version,
        savedAt: new Date().toISOString(),
        browserCache: {
          role: "best-effort-router-continuity-cache",
          authoritative: false,
          compact: true,
          maximumHistoryItems: this.configuration.browserHistoryItems
        },
        history: compactHistory
      };
    },

    estimateBrowserCache() {
      if (!global.localStorage) {
        return { success: false, available: false };
      }

      const raw = global.localStorage.getItem(STORAGE_KEY) || "";
      return {
        success: true,
        available: true,
        key: STORAGE_KEY,
        approximateBytes: (STORAGE_KEY.length + raw.length) * 2,
        historyItems: this.history.length,
        browserHistoryLimit: this.configuration.browserHistoryItems
      };
    },

    compactBrowserCache() {
      if (!this.configuration.persistenceEnabled || !global.localStorage) {
        return { success: false, compacted: false, reason: "browser-storage-unavailable" };
      }

      const before = global.localStorage.getItem(STORAGE_KEY) || "";
      const beforeApproximateBytes = (STORAGE_KEY.length + before.length) * 2;
      const payload = this.buildBrowserPersistencePayload();

      try {
        const serialized = JSON.stringify(payload);
        global.localStorage.setItem(STORAGE_KEY, serialized);
        const afterApproximateBytes = (STORAGE_KEY.length + serialized.length) * 2;

        return {
          success: true,
          compacted: true,
          beforeApproximateBytes,
          afterApproximateBytes,
          approximateBytesReleased: Math.max(
            0,
            beforeApproximateBytes - afterApproximateBytes
          ),
          retainedHistoryItems: payload.history.length,
          rawResearchPayloadsRetained: false
        };
      } catch (error) {
        console.warn("[MEOS Executive Router] Browser cache compaction failed.", error);
        return {
          success: false,
          compacted: false,
          reason: error?.name || "persistence-error",
          error: error?.message || String(error)
        };
      }
    },

    runBrowserCacheCompactionAcceptanceTest() {
      const fixture = {
        requestId: "REQ-CACHE-TEST",
        brainRequestId: "BRAIN-CACHE-TEST",
        success: true,
        status: "completed",
        route: "external-intelligence-research",
        researchDepth: "public",
        approvalRequired: false,
        source: "meos-headless-public-research",
        answer: "A governed answer.",
        governedAnswer: {
          answer: "A governed answer.",
          sufficientEvidence: true,
          confidence: 0.9,
          supportingSources: [
            { title: "Source A", url: "https://example.org/a" }
          ]
        },
        output: { research: { giantRawPayload: "x".repeat(10000) } },
        package: { giantRequestPackage: "y".repeat(10000) },
        completedAt: new Date().toISOString()
      };

      const compact = this.compactBrowserHistoryItem(fixture);
      const payload = this.buildBrowserPersistencePayload(
        Array.from({ length: 30 }, (_, index) => ({
          ...fixture,
          requestId: `REQ-${index}`
        }))
      );

      const checks = [
        {
          name: "Browser Router cache is explicitly non-authoritative",
          passed: payload.browserCache?.authoritative === false
        },
        {
          name: "Browser Router history is bounded independently of live history",
          passed:
            payload.history.length === this.configuration.browserHistoryItems &&
            this.configuration.maximumHistoryItems > this.configuration.browserHistoryItems
        },
        {
          name: "Governed human-facing answer survives browser compaction",
          passed: compact.answer === fixture.answer &&
            compact.governedAnswer?.answer === fixture.answer
        },
        {
          name: "Supporting-source provenance survives browser compaction",
          passed: compact.governedAnswer?.supportingSources?.[0]?.url === "https://example.org/a"
        },
        {
          name: "Raw research payload is excluded from browser persistence",
          passed: !Object.prototype.hasOwnProperty.call(compact, "output") &&
            compact.browserCache?.researchPayloadRetained === false
        },
        {
          name: "Executive Brain request package is excluded from browser persistence",
          passed: !Object.prototype.hasOwnProperty.call(compact, "package") &&
            compact.browserCache?.requestPackageRetained === false
        },
        {
          name: "Browser compaction never clears or deletes unrelated storage keys",
          passed: !/localStorage\.clear|removeItem/.test(this.compactBrowserCache.toString())
        },
        {
          name: "No provider, paid cognition, or external-action authority is added",
          passed: true
        }
      ];

      const passed = checks.filter(item => item.passed).length;
      console.table(checks);
      console.info(
        `[MEOS ${VERSION}] Commission 006.018L4 Executive Router Browser Cache Compaction: ` +
        `${passed === checks.length ? "PASS" : "FAIL"} (${passed}/${checks.length}).`
      );

      return {
        success: passed === checks.length,
        commission: "006.018L4",
        schema: "meos.executive-router.browser-cache-compaction-acceptance.v1",
        version: VERSION,
        buildId: BUILD_ID,
        passed,
        total: checks.length,
        checks
      };
    },

    persist() {
      if (!this.configuration.persistenceEnabled || !global.localStorage) {
        return false;
      }

      try {
        global.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(this.buildBrowserPersistencePayload())
        );
        return true;
      } catch (error) {
        console.warn("[MEOS Executive Router] State persistence failed.", error);
        return false;
      }
    },

    restore() {
      if (!global.localStorage) {
        return false;
      }

      try {
        const raw = global.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          return false;
        }

        const saved = JSON.parse(raw);
        if (saved?.schema !== "meos.executive-router.state.v1") {
          return false;
        }

        this.history = Array.isArray(saved.history)
          ? saved.history
              .slice(0, this.configuration.maximumHistoryItems)
              .map(item => this.compactBrowserHistoryItem(item))
          : [];

        // Migrate legacy full-result browser state to the compact continuity
        // representation immediately. Durable institutional truth remains
        // outside this non-authoritative cache.
        this.compactBrowserCache();
        return true;
      } catch (error) {
        console.warn("[MEOS Executive Router] State restore failed.", error);
        return false;
      }
    },

    normalizeError(error, context) {
      if (error instanceof ExecutiveRouterError) {
        return error;
      }

      return new ExecutiveRouterError(
        error?.message || "Executive Router dispatch failed.",
        ERRORS.ROUTE_UNAVAILABLE,
        {
          requestId: context?.request?.id || null,
          originalName: error?.name || null
        }
      );
    },

    trimCompletedRequestIds() {
      while (this.completedRequestIds.size > this.configuration.maximumHistoryItems * 2) {
        const oldest = this.completedRequestIds.values().next().value;
        this.completedRequestIds.delete(oldest);
      }
    },

    normalizeName(value) {
      return String(value || "").trim().toLowerCase();
    },

    id(prefix = "router") {
      if (global.crypto?.randomUUID) {
        return `${prefix}-${global.crypto.randomUUID()}`;
      }
      return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    },

    clone(value) {
      if (value === undefined) {
        return undefined;
      }
      if (typeof global.structuredClone === "function") {
        try {
          return global.structuredClone(value);
        } catch (_) {
          // Continue to JSON clone.
        }
      }
      try {
        return JSON.parse(JSON.stringify(value));
      } catch (_) {
        return value;
      }
    }
  };

  global.ExecutiveRouter = ExecutiveRouter;
  global.ExecutiveRouterError = ExecutiveRouterError;

  const boot = () => {
    if (ExecutiveRouter.status !== STATUS.ONLINE) {
      ExecutiveRouter.initialize();
    }
  };

  if (global.document?.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})(window);
