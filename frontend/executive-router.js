/**
 * MEOS Executive Router
 * Version: 1.0.0
 * Build: ER100-MADDY-20260731-A
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

  const VERSION = "1.0.0";
  const BUILD_ID = "ER100-MADDY-20260731-A";
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
    DUPLICATE_REQUEST: "MEOS_ROUTER_DUPLICATE_REQUEST"
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
        status: REQUEST_STATUS.RECEIVED
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

      const work = (async () => {
        try {
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

          context.classification = {
            type: context.brainResult.package.request.type,
            confidence: context.brainResult.package.request.confidence,
            requiresCurrentInternet:
              context.brainResult.package.request.requiresCurrentInternet,
            requiresApproval:
              context.brainResult.package.request.requiresApproval
          };
          context.status = REQUEST_STATUS.CLASSIFIED;
          this.emit("router:request-classified", this.publicContext(context));

          context.route = this.selectRoute(context.brainResult);
          context.status = REQUEST_STATUS.ROUTED;
          this.emit("router:request-routed", this.publicContext(context));

          context.dispatchResult = await this.dispatch(context);
          context.status = REQUEST_STATUS.DISPATCHED;
          this.emit("router:request-dispatched", this.publicContext(context));

          const collected = this.collect(context);
          context.status = REQUEST_STATUS.COLLECTED;
          this.emit("router:result-collected", this.clone(collected));

          context.status = REQUEST_STATUS.COMPLETED;
          const completed = Object.freeze({
            ...collected,
            status: REQUEST_STATUS.COMPLETED
          });

          this.completedRequestIds.add(request.id);
          this.trimCompletedRequestIds();
          this.record(completed);
          this.emit("router:request-completed", this.clone(completed));

          return completed;
        } catch (error) {
          const normalized = this.normalizeError(error, context);
          context.status = REQUEST_STATUS.FAILED;

          const failed = {
            success: false,
            schema: "meos.executive-router.result.v1",
            requestId: request.id,
            status: REQUEST_STATUS.FAILED,
            error: {
              name: normalized.name,
              code: normalized.code,
              message: normalized.message,
              details: this.clone(normalized.details),
              timestamp: normalized.timestamp
            },
            durationMs: Number((Date.now() - context.startedAt).toFixed(2))
          };

          this.record(failed);
          this.emit("router:request-failed", this.clone(failed));
          throw normalized;
        }
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
        return await Promise.race([work, timeout]);
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
      return context.route.handler({
        request: this.clone(context.request),
        route: {
          name: context.route.name,
          supportingRoutes: [...context.route.supportingRoutes],
          researchDepth: context.route.researchDepth,
          approvalRequired: context.route.approvalRequired
        },
        package: this.clone(context.brainResult.package)
      }, this);
    },

    collect(context) {
      const result = context.dispatchResult || {};

      return {
        success: true,
        schema: "meos.executive-router.result.v1",
        requestId: context.request.id,
        brainRequestId: context.brainResult.requestId,
        status: REQUEST_STATUS.COLLECTED,
        route: context.route.name,
        supportingRoutes: [...context.route.supportingRoutes],
        researchDepth: context.route.researchDepth,
        approvalRequired: context.route.approvalRequired,
        source: result.source || "meos",
        provider: result.provider || null,
        output: result.output !== undefined ? result.output : result,
        package: this.clone(context.brainResult.package),
        durationMs: Number((Date.now() - context.startedAt).toFixed(2)),
        completedAt: new Date().toISOString()
      };
    },

    installDefaultRoutes() {
      this.registerRoute(ROUTES.INSTANT_MEOS_CONTEXT, async payload => ({
        source: "meos-local-context",
        output: {
          type: "local-evidence-package",
          request: payload.package.request,
          identity: payload.package.identity,
          organization: payload.package.organization,
          authority: payload.package.authority,
          currentWork: payload.package.currentWork,
          localContext: payload.package.localContext,
          responseContract: payload.package.responseContract
        }
      }));

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

    async dispatchToProvider(payload, options = {}) {
      const provider = this.selectProvider(payload, options);
      if (!provider) {
        throw new ExecutiveRouterError(
          "No authorized intelligence provider adapter is available for this route.",
          ERRORS.PROVIDER_UNAVAILABLE,
          {
            route: payload.route.name,
            availableProviders: [...this.providers.keys()]
          }
        );
      }

      this.emit("router:provider-dispatch-started", {
        requestId: payload.request.id,
        provider: provider.name,
        route: payload.route.name
      });

      try {
        const providerResult = await provider.execute({
          schema: "meos.executive-router.provider-request.v1",
          requestId: payload.request.id,
          route: payload.route,
          executivePackage: payload.package,
          providerInstructions: payload.package.providerInstructions,
          responseContract: payload.package.responseContract
        });

        this.emit("router:provider-dispatch-completed", {
          requestId: payload.request.id,
          provider: provider.name,
          route: payload.route.name
        });

        return {
          source: "external-intelligence-provider",
          provider: provider.name,
          output: providerResult
        };
      } catch (error) {
        throw new ExecutiveRouterError(
          `Provider adapter failed: ${provider.name}`,
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

    persist() {
      if (!this.configuration.persistenceEnabled || !global.localStorage) {
        return false;
      }

      try {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify({
          schema: "meos.executive-router.state.v1",
          version: this.version,
          savedAt: new Date().toISOString(),
          history: this.history
        }));
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

        this.history = Array.isArray(saved.history) ? saved.history : [];
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
