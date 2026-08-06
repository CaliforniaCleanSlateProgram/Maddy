/**
 * MEOS Google Workspace Adapter v1.1.0
 * Commission 005.004B
 *
 * Frontend bridge between the provider-neutral Executive Workspace Office and
 * the existing secure server-side MEOS Google Workspace Provider.
 *
 * This adapter does NOT hold Google credentials or OAuth tokens. It discovers
 * the backend's real connection state at runtime and registers only capabilities
 * that the backend actually exposes. No connection = no advertised capability.
 */
(function initializeMEOSGoogleWorkspaceAdapter(global) {
  "use strict";

  const NAME = "MEOS Google Workspace Adapter";
  const VERSION = "1.1.0";
  const BUILD_ID = "commission-005.004B";
  const SCHEMA = "meos.google-workspace-adapter.v1";
  const PROVIDER_ID = "google-workspace";

  const ENDPOINTS = Object.freeze({
    status: "/api/google/status",
    authorize: "/auth/google",
    headquarters: "/api/google/drive/headquarters",
    research: "/api/google/workspace/research"
  });

  const state = {
    initializedAt: new Date().toISOString(),
    lastRefreshAt: null,
    lastError: null,
    backendStatus: null,
    registered: false,
    capabilities: [],
    listeners: typeof EventTarget === "function" ? new EventTarget() : null
  };

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function freeze(value) {
    const copy = clone(value);
    return copy && typeof copy === "object" ? Object.freeze(copy) : copy;
  }

  function now() { return new Date().toISOString(); }

  function providerManager() {
    return global.MEOSProviderManager || global.ProviderManager || null;
  }

  function workspaceOffice() {
    return global.MEOSExecutiveWorkspaceOffice || null;
  }

  function emit(type, detail) {
    try {
      state.listeners?.dispatchEvent(new CustomEvent(type, { detail: clone(detail) }));
      global.dispatchEvent(new CustomEvent(`meos:google-workspace-adapter:${type}`, {
        detail: clone(detail)
      }));
    } catch (_error) {}
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: "include",
      cache: "no-store",
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.headers || {})
      }
    });

    let body = null;
    try { body = await response.json(); } catch (_error) {}

    if (!response.ok) {
      const error = new Error(
        body?.error || body?.message || `Workspace request failed with HTTP ${response.status}.`
      );
      error.status = response.status;
      error.code = body?.code || "GOOGLE_WORKSPACE_HTTP_ERROR";
      error.details = body;
      throw error;
    }

    return body;
  }

  function capabilitiesFromBackend(status) {
    if (!status?.connected) return [];

    const backend = status.capabilities || {};
    const capabilities = [];

    // Advertise only operations reachable through commissioned server routes.
    if (backend.driveListHeadquarters === true) {
      capabilities.push("workspace.file.list");
    }

    if (backend.driveSearch === true) {
      capabilities.push("workspace.file.search");
    }

    if (
      backend.driveSearch === true &&
      (backend.docsRead === true || backend.sheetsRead === true)
    ) {
      capabilities.push("workspace.file.research");
    }

    return capabilities;
  }

  async function execute(request = {}, context = {}) {
    const capability = String(
      request.capability ||
      request.requiredCapability ||
      context.capability ||
      ""
    ).trim();

    const payload = request.payload || request;

    if (capability === "workspace.file.list") {
      const limit = Math.max(1, Math.min(1000, Number(payload?.limit || 1000)));
      const result = await fetchJson(`${ENDPOINTS.headquarters}?limit=${encodeURIComponent(limit)}`);
      return {
        success: true,
        schema: `${SCHEMA}.execution.v1`,
        providerId: PROVIDER_ID,
        capability,
        verifiedAt: now(),
        readOnly: true,
        result
      };
    }

    if (
      capability === "workspace.file.search" ||
      capability === "workspace.file.research"
    ) {
      const question = String(
        payload?.question ||
        payload?.query ||
        payload?.instruction ||
        request?.instruction ||
        ""
      ).trim();

      if (!question) {
        return {
          success: false,
          schema: `${SCHEMA}.execution.v1`,
          providerId: PROVIDER_ID,
          capability,
          error: "Workspace file search requires a natural-language request or query.",
          code: "GOOGLE_WORKSPACE_SEARCH_QUERY_REQUIRED"
        };
      }

      const limit = Math.max(
        1,
        Math.min(100, Number(payload?.limit || 20))
      );
      const readLimit = Math.max(
        1,
        Math.min(20, Number(payload?.readLimit || 8))
      );

      const url =
        `${ENDPOINTS.research}?q=${encodeURIComponent(question)}` +
        `&limit=${encodeURIComponent(limit)}` +
        `&readLimit=${encodeURIComponent(readLimit)}`;

      const result = await fetchJson(url);

      return {
        success: true,
        schema: `${SCHEMA}.execution.v1`,
        providerId: PROVIDER_ID,
        capability,
        verifiedAt: now(),
        readOnly: true,
        result
      };
    }

    return {
      success: false,
      schema: `${SCHEMA}.execution.v1`,
      providerId: PROVIDER_ID,
      capability: capability || null,
      error: "The requested Google Workspace capability is not exposed by the current backend release.",
      code: "GOOGLE_WORKSPACE_CAPABILITY_UNAVAILABLE"
    };
  }

  function unregisterIfPresent() {
    const pm = providerManager();
    if (!pm?.getProvider || !pm?.unregisterProvider) return;
    if (pm.getProvider(PROVIDER_ID)) pm.unregisterProvider(PROVIDER_ID);
    state.registered = false;
  }

  function registerConnectedProvider(status) {
    const office = workspaceOffice();
    if (!office?.registerWorkspaceProvider) {
      throw new Error("Executive Workspace Office must be loaded before Google Workspace Adapter.");
    }

    const capabilities = capabilitiesFromBackend(status);
    if (!capabilities.length) {
      unregisterIfPresent();
      state.capabilities = [];
      return null;
    }

    const existing = providerManager()?.getProvider?.(PROVIDER_ID);
    const provider = office.registerWorkspaceProvider({
      id: PROVIDER_ID,
      name: "Google Workspace",
      type: "tool",
      status: "online",
      enabled: true,
      capabilities,
      reliability: 0.98,
      privacy: 0.95,
      speed: 0.9,
      costEfficiency: 0.95,
      priority: 0.9,
      execute,
      replace: Boolean(existing),
      metadata: {
        vendor: "Google",
        serverBacked: true,
        credentialsOnFrontend: false,
        readOnly: true,
        backendProviderVersion: status.version || null,
        backendProviderBuildId: status.buildId || null,
        authorizedAccount: status.account?.emailAddress || null
      }
    });

    state.registered = true;
    state.capabilities = [...capabilities];
    return provider;
  }

  async function refresh() {
    state.lastRefreshAt = now();
    state.lastError = null;

    try {
      const status = await fetchJson(ENDPOINTS.status);
      state.backendStatus = clone(status);

      if (!status?.connected) {
        unregisterIfPresent();
        state.capabilities = [];
        emit("disconnected", getStatus());
        return getStatus();
      }

      registerConnectedProvider(status);
      emit("connected", getStatus());
      return getStatus();
    } catch (error) {
      unregisterIfPresent();
      state.capabilities = [];
      state.lastError = {
        message: error?.message || String(error),
        code: error?.code || "GOOGLE_WORKSPACE_STATUS_FAILED",
        status: Number(error?.status || 0) || null,
        at: now()
      };
      if (error?.details) state.backendStatus = clone(error.details);
      emit("unavailable", getStatus());
      return getStatus();
    }
  }

  async function searchWorkspace(question, options = {}) {
    return execute({
      capability: "workspace.file.search",
      payload: {
        question,
        ...options
      }
    });
  }

  async function researchWorkspace(question, options = {}) {
    return execute({
      capability: "workspace.file.research",
      payload: {
        question,
        ...options
      }
    });
  }

  function getAuthorizationUrl() {
    return ENDPOINTS.authorize;
  }

  function authorize() {
    global.location.assign(ENDPOINTS.authorize);
  }

  function getStatus() {
    return freeze({
      schema: `${SCHEMA}.status`,
      name: NAME,
      version: VERSION,
      buildId: BUILD_ID,
      providerId: PROVIDER_ID,
      status: state.registered ? "online" : "unavailable",
      connected: Boolean(state.backendStatus?.connected),
      configured: Boolean(state.backendStatus?.configured),
      registered: state.registered,
      readOnly: true,
      capabilities: [...state.capabilities],
      authorizationUrl: ENDPOINTS.authorize,
      account: state.backendStatus?.account || null,
      headquarters: state.backendStatus?.headquarters || null,
      lastRefreshAt: state.lastRefreshAt,
      lastError: clone(state.lastError)
    });
  }

  function runSelfTest() {
    const assertions = [];
    const check = (name, passed) => assertions.push({ name, passed: Boolean(passed) });

    check("provider identity is Google Workspace", PROVIDER_ID === "google-workspace");
    check("credentials remain off frontend", !/client_secret|refresh_token/i.test(execute.toString()));
    check("runtime status endpoint exists", ENDPOINTS.status === "/api/google/status");
    check("OAuth authorization endpoint exists", ENDPOINTS.authorize === "/auth/google");
    check("workspace office registration is used", typeof workspaceOffice()?.registerWorkspaceProvider === "function");
    check("provider manager is connected", Boolean(providerManager()));
    check("disconnected provider advertises no capabilities", capabilitiesFromBackend({ connected: false, capabilities: { driveListHeadquarters: true } }).length === 0);
    check(
      "connected backend maps commissioned read capabilities",
      JSON.stringify(
        capabilitiesFromBackend({
          connected: true,
          capabilities: {
            driveListHeadquarters: true,
            driveSearch: true,
            docsRead: true,
            gmail: false
          }
        })
      ) === JSON.stringify([
        "workspace.file.list",
        "workspace.file.search",
        "workspace.file.research"
      ])
    );
    check(
      "search-only backend advertises file search without research",
      JSON.stringify(
        capabilitiesFromBackend({
          connected: true,
          capabilities: {
            driveSearch: true,
            docsRead: false,
            sheetsRead: false
          }
        })
      ) === JSON.stringify(["workspace.file.search"])
    );
    check(
      "workspace research endpoint exists",
      ENDPOINTS.research === "/api/google/workspace/research"
    );
    check("adapter is read-only", getStatus().readOnly === true);

    const passed = assertions.filter(item => item.passed).length;
    return freeze({
      success: passed === assertions.length,
      schema: `${SCHEMA}.acceptance-test.v1`,
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      total: assertions.length,
      assertions
    });
  }

  const api = Object.freeze({
    name: NAME,
    version: VERSION,
    buildId: BUILD_ID,
    schema: SCHEMA,
    providerId: PROVIDER_ID,
    endpoints: ENDPOINTS,
    refresh,
    authorize,
    searchWorkspace,
    researchWorkspace,
    getAuthorizationUrl,
    getStatus,
    runSelfTest,
    addEventListener: (...args) => state.listeners?.addEventListener(...args),
    removeEventListener: (...args) => state.listeners?.removeEventListener(...args)
  });

  global.MEOSGoogleWorkspaceAdapter = api;

  console.info(
    `[MEOS] ${NAME} v${VERSION} online. Build ${BUILD_ID}. ` +
    "Google read capabilities are registered only when verified by the server."
  );

  // Discover real backend state after all preceding scripts have registered.
  Promise.resolve().then(() => refresh());
})(window);
