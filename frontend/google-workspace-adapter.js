/**
 * MEOS Google Workspace Adapter v1.2.0
 * Commission 006.032D
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
  const VERSION = "1.2.0";
  const BUILD_ID = "GWA120-GOVERNED-WORKSPACE-EXECUTION-BRIDGE-20260817-A";
  const SCHEMA = "meos.google-workspace-adapter.v1";
  const PROVIDER_ID = "google-workspace";

  const ENDPOINTS = Object.freeze({
    status: "/api/google/status",
    authorize: "/auth/google",
    headquarters: "/api/google/drive/headquarters",
    research: "/api/google/workspace/research",
    docs: "/api/google/docs",
    sheets: "/api/google/sheets",
    calendarEvents: "/api/google/calendar/events",
    calendarFreeBusy: "/api/google/calendar/freebusy"
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

    // Advertise only operations that have a commissioned same-origin server route
    // AND a currently granted Google OAuth capability.
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

    if (backend.docsWrite === true) {
      capabilities.push("workspace.document.create");
      capabilities.push("workspace.document.update");
    }

    if (backend.sheetsWrite === true) {
      capabilities.push("workspace.spreadsheet.create");
      capabilities.push("workspace.spreadsheet.update");
    }

    if (backend.calendarRead === true) {
      capabilities.push("workspace.calendar.read");
    }

    if (backend.calendarAvailability === true) {
      capabilities.push("workspace.calendar.availability");
    }

    if (backend.calendarWrite === true) {
      capabilities.push("workspace.calendar.create");
      capabilities.push("workspace.calendar.update");
      capabilities.push("workspace.calendar.delete");
    }

    return [...new Set(capabilities)];
  }

  function hasGovernedWriteCapability(status) {
    const capabilities = capabilitiesFromBackend(status);
    return capabilities.some(capability =>
      capability === "workspace.document.create" ||
      capability === "workspace.document.update" ||
      capability === "workspace.spreadsheet.create" ||
      capability === "workspace.spreadsheet.update" ||
      capability === "workspace.calendar.create" ||
      capability === "workspace.calendar.update" ||
      capability === "workspace.calendar.delete"
    );
  }

  function executionEnvelope(request = {}, payload = {}, context = {}) {
    const autonomous =
      request.autonomous === true ||
      request.machineInitiated === true ||
      payload.autonomous === true ||
      payload.machineInitiated === true ||
      context.autonomous === true ||
      context.machineInitiated === true;

    const humanDirected =
      request.humanDirected === true ||
      payload.humanDirected === true ||
      context.humanDirected === true ||
      !autonomous;

    return {
      autonomous,
      machineInitiated: autonomous,
      humanDirected,
      source: String(
        request.executionSource ||
        payload.executionSource ||
        context.executionSource ||
        (autonomous
          ? "google-workspace-adapter-autonomous"
          : "google-workspace-adapter-human-directed")
      ).trim()
    };
  }

  function normalizeIdempotencyPart(value) {
    return String(value || "")
      .trim()
      .replace(/[^A-Za-z0-9._:-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  function resolveMutationIdempotencyKey(request = {}, payload = {}, context = {}, capability = "") {
    const explicit = String(
      request.idempotencyKey ||
      payload.idempotencyKey ||
      context.idempotencyKey ||
      ""
    ).trim();

    if (explicit) return explicit.slice(0, 200);

    const missionId = normalizeIdempotencyPart(
      request.missionId || payload.missionId || context.missionId
    );
    const operationId = normalizeIdempotencyPart(
      request.operationId || payload.operationId || context.operationId || capability
    );

    if (missionId) {
      return `meos:${missionId}:${operationId || "workspace-mutation"}`.slice(0, 200);
    }

    const error = new Error(
      "Google Workspace mutations require a stable idempotencyKey or missionId before execution."
    );
    error.code = "GOOGLE_WORKSPACE_IDEMPOTENCY_KEY_REQUIRED";
    throw error;
  }

  function requiredText(value, label, code) {
    const text = String(value || "").trim();
    if (text) return text;
    const error = new Error(`${label} is required.`);
    error.code = code;
    throw error;
  }

  async function execute(request = {}, context = {}) {
    const capability = String(
      request.capability ||
      request.requiredCapability ||
      context.capability ||
      ""
    ).trim();

    const payload = request.payload || request;
    const execution = executionEnvelope(request, payload, context);

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

      const limit = Math.max(1, Math.min(100, Number(payload?.limit || 20)));
      const readLimit = Math.max(1, Math.min(20, Number(payload?.readLimit || 8)));

      const excludedFileIds = [...new Set(
        (
          Array.isArray(payload?.excludedFileIds)
            ? payload.excludedFileIds
            : Array.isArray(payload?.excludeFileIds)
              ? payload.excludeFileIds
              : String(payload?.excludedFileIds || payload?.excludeFileIds || "").split(",")
        )
          .map(value => String(value || "").trim())
          .filter(Boolean)
      )].slice(0, 50);

      const params = new URLSearchParams({
        q: question,
        limit: String(limit),
        readLimit: String(readLimit)
      });

      if (excludedFileIds.length) {
        params.set("excludeFileIds", excludedFileIds.join(","));
      }

      const result = await fetchJson(`${ENDPOINTS.research}?${params.toString()}`);
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

    if (capability === "workspace.document.create") {
      const idempotencyKey = resolveMutationIdempotencyKey(request, payload, context, capability);
      const result = await fetchJson(ENDPOINTS.docs, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({
          title: payload?.title || "MEOS Document",
          text: payload?.text || payload?.content || "",
          execution
        })
      });
      return { success: true, schema: `${SCHEMA}.execution.v1`, providerId: PROVIDER_ID, capability, verifiedAt: now(), readOnly: false, idempotencyKey, result };
    }

    if (capability === "workspace.document.update") {
      const documentId = requiredText(payload?.documentId, "Google Docs documentId", "GOOGLE_WORKSPACE_DOCUMENT_ID_REQUIRED");
      const requests = Array.isArray(payload?.requests) ? payload.requests.filter(Boolean) : [];
      if (!requests.length) {
        const error = new Error("Google Docs update requires at least one batchUpdate request.");
        error.code = "GOOGLE_WORKSPACE_DOCS_UPDATE_REQUEST_REQUIRED";
        throw error;
      }
      const idempotencyKey = resolveMutationIdempotencyKey(request, payload, context, capability);
      const result = await fetchJson(`${ENDPOINTS.docs}/${encodeURIComponent(documentId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({ requests, execution })
      });
      return { success: true, schema: `${SCHEMA}.execution.v1`, providerId: PROVIDER_ID, capability, verifiedAt: now(), readOnly: false, idempotencyKey, result };
    }

    if (capability === "workspace.spreadsheet.create") {
      const idempotencyKey = resolveMutationIdempotencyKey(request, payload, context, capability);
      const result = await fetchJson(ENDPOINTS.sheets, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({
          title: payload?.title || "MEOS Spreadsheet",
          sheets: Array.isArray(payload?.sheets) ? payload.sheets : undefined,
          execution
        })
      });
      return { success: true, schema: `${SCHEMA}.execution.v1`, providerId: PROVIDER_ID, capability, verifiedAt: now(), readOnly: false, idempotencyKey, result };
    }

    if (capability === "workspace.spreadsheet.update") {
      const spreadsheetId = requiredText(payload?.spreadsheetId, "Google Sheets spreadsheetId", "GOOGLE_WORKSPACE_SPREADSHEET_ID_REQUIRED");
      const range = requiredText(payload?.range, "Google Sheets range", "GOOGLE_WORKSPACE_SHEETS_RANGE_REQUIRED");
      if (!Array.isArray(payload?.values)) {
        const error = new Error("Google Sheets update requires values as an array of rows.");
        error.code = "GOOGLE_WORKSPACE_SHEETS_VALUES_REQUIRED";
        throw error;
      }
      const idempotencyKey = resolveMutationIdempotencyKey(request, payload, context, capability);
      const result = await fetchJson(`${ENDPOINTS.sheets}/${encodeURIComponent(spreadsheetId)}/values`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({
          range,
          values: payload.values,
          valueInputOption: payload?.valueInputOption || "USER_ENTERED",
          execution
        })
      });
      return { success: true, schema: `${SCHEMA}.execution.v1`, providerId: PROVIDER_ID, capability, verifiedAt: now(), readOnly: false, idempotencyKey, result };
    }

    if (capability === "workspace.calendar.read") {
      const params = new URLSearchParams();
      params.set("calendarId", String(payload?.calendarId || "primary"));
      if (payload?.timeMin) params.set("timeMin", String(payload.timeMin));
      if (payload?.timeMax) params.set("timeMax", String(payload.timeMax));
      if (payload?.maxResults) params.set("maxResults", String(payload.maxResults));
      const result = await fetchJson(`${ENDPOINTS.calendarEvents}?${params.toString()}`);
      return { success: true, schema: `${SCHEMA}.execution.v1`, providerId: PROVIDER_ID, capability, verifiedAt: now(), readOnly: true, result };
    }

    if (capability === "workspace.calendar.availability") {
      const result = await fetchJson(ENDPOINTS.calendarFreeBusy, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeMin: payload?.timeMin,
          timeMax: payload?.timeMax,
          calendarIds: Array.isArray(payload?.calendarIds) && payload.calendarIds.length
            ? payload.calendarIds
            : [payload?.calendarId || "primary"],
          timeZone: payload?.timeZone,
          execution
        })
      });
      return { success: true, schema: `${SCHEMA}.execution.v1`, providerId: PROVIDER_ID, capability, verifiedAt: now(), readOnly: true, result };
    }

    if (capability === "workspace.calendar.create") {
      const idempotencyKey = resolveMutationIdempotencyKey(request, payload, context, capability);
      const result = await fetchJson(ENDPOINTS.calendarEvents, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          calendarId: payload?.calendarId || "primary",
          event: payload?.event || payload?.requestBody || null,
          sendUpdates: payload?.sendUpdates || "none",
          execution
        })
      });
      return { success: true, schema: `${SCHEMA}.execution.v1`, providerId: PROVIDER_ID, capability, verifiedAt: now(), readOnly: false, externalAction: true, idempotencyKey, result };
    }

    if (capability === "workspace.calendar.update") {
      const eventId = requiredText(payload?.eventId, "Google Calendar eventId", "GOOGLE_WORKSPACE_CALENDAR_EVENT_ID_REQUIRED");
      const idempotencyKey = resolveMutationIdempotencyKey(request, payload, context, capability);
      const result = await fetchJson(`${ENDPOINTS.calendarEvents}/${encodeURIComponent(eventId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          calendarId: payload?.calendarId || "primary",
          event: payload?.event || payload?.requestBody || null,
          sendUpdates: payload?.sendUpdates || "none",
          execution
        })
      });
      return { success: true, schema: `${SCHEMA}.execution.v1`, providerId: PROVIDER_ID, capability, verifiedAt: now(), readOnly: false, externalAction: true, idempotencyKey, result };
    }

    if (capability === "workspace.calendar.delete") {
      const eventId = requiredText(payload?.eventId, "Google Calendar eventId", "GOOGLE_WORKSPACE_CALENDAR_EVENT_ID_REQUIRED");
      const idempotencyKey = resolveMutationIdempotencyKey(request, payload, context, capability);
      const result = await fetchJson(`${ENDPOINTS.calendarEvents}/${encodeURIComponent(eventId)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          calendarId: payload?.calendarId || "primary",
          sendUpdates: payload?.sendUpdates || "none",
          execution
        })
      });
      return { success: true, schema: `${SCHEMA}.execution.v1`, providerId: PROVIDER_ID, capability, verifiedAt: now(), readOnly: false, externalAction: true, idempotencyKey, result };
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
        readOnly: !hasGovernedWriteCapability(status),
        governedWrite: hasGovernedWriteCapability(status),
        mutationIdempotencyRequired: true,
        externalActionCapabilities: [
          "workspace.calendar.create",
          "workspace.calendar.update",
          "workspace.calendar.delete"
        ],
        gmailAuthorized: status.capabilities?.gmail === true,
        gmailSendAuthorized: status.capabilities?.gmailSend === true,
        fullDriveWriteAuthorized: status.capabilities?.driveFullWrite === true,
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

  async function createDocument(payload = {}, context = {}) {
    return execute({ ...context, capability: "workspace.document.create", payload }, context);
  }

  async function updateDocument(payload = {}, context = {}) {
    return execute({ ...context, capability: "workspace.document.update", payload }, context);
  }

  async function createSpreadsheet(payload = {}, context = {}) {
    return execute({ ...context, capability: "workspace.spreadsheet.create", payload }, context);
  }

  async function writeSpreadsheetValues(payload = {}, context = {}) {
    return execute({ ...context, capability: "workspace.spreadsheet.update", payload }, context);
  }

  async function listCalendarEvents(payload = {}, context = {}) {
    return execute({ ...context, capability: "workspace.calendar.read", payload }, context);
  }

  async function queryCalendarAvailability(payload = {}, context = {}) {
    return execute({ ...context, capability: "workspace.calendar.availability", payload }, context);
  }

  async function createCalendarEvent(payload = {}, context = {}) {
    return execute({ ...context, capability: "workspace.calendar.create", payload }, context);
  }

  async function updateCalendarEvent(payload = {}, context = {}) {
    return execute({ ...context, capability: "workspace.calendar.update", payload }, context);
  }

  async function deleteCalendarEvent(payload = {}, context = {}) {
    return execute({ ...context, capability: "workspace.calendar.delete", payload }, context);
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
      readOnly: !hasGovernedWriteCapability(state.backendStatus),
      governedWrite: hasGovernedWriteCapability(state.backendStatus),
      mutationIdempotencyRequired: true,
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

    const fullStatus = {
      connected: true,
      capabilities: {
        driveListHeadquarters: true,
        driveSearch: true,
        docsRead: true,
        sheetsRead: true,
        docsWrite: true,
        sheetsWrite: true,
        calendarRead: true,
        calendarAvailability: true,
        calendarWrite: true,
        driveFullWrite: false,
        gmail: false,
        gmailSend: false
      }
    };
    const mapped = capabilitiesFromBackend(fullStatus);

    check("provider identity is Google Workspace", PROVIDER_ID === "google-workspace");
    check("credentials remain off frontend", !/client_secret|refresh_token/i.test(execute.toString()));
    check("runtime status endpoint exists", ENDPOINTS.status === "/api/google/status");
    check("OAuth authorization endpoint exists", ENDPOINTS.authorize === "/auth/google");
    check("workspace office registration is used", typeof workspaceOffice()?.registerWorkspaceProvider === "function");
    check("provider manager is connected", Boolean(providerManager()));
    check("disconnected provider advertises no capabilities", capabilitiesFromBackend({ connected: false, capabilities: { docsWrite: true } }).length === 0);
    check("Docs create capability is runtime-derived", mapped.includes("workspace.document.create"));
    check("Docs update capability is runtime-derived", mapped.includes("workspace.document.update"));
    check("Sheets create capability is runtime-derived", mapped.includes("workspace.spreadsheet.create"));
    check("Sheets update capability is runtime-derived", mapped.includes("workspace.spreadsheet.update"));
    check("Calendar read capability is runtime-derived", mapped.includes("workspace.calendar.read"));
    check("Calendar availability capability is runtime-derived", mapped.includes("workspace.calendar.availability"));
    check("Calendar create/update/delete are runtime-derived", ["workspace.calendar.create", "workspace.calendar.update", "workspace.calendar.delete"].every(cap => mapped.includes(cap)));
    check("Gmail capabilities are not fabricated", !mapped.some(cap => cap.startsWith("workspace.email.")));
    check("full Drive write is not fabricated", !mapped.includes("workspace.file.write"));
    check("governed writes remove read-only adapter status", hasGovernedWriteCapability(fullStatus) === true);
    check("stable mission id derives stable mutation key", resolveMutationIdempotencyKey({ missionId: "mission-123" }, {}, {}, "workspace.document.create") === resolveMutationIdempotencyKey({ missionId: "mission-123" }, {}, {}, "workspace.document.create"));
    let rejectsUnidentifiedMutation = false;
    try { resolveMutationIdempotencyKey({}, {}, {}, "workspace.document.create"); } catch (error) { rejectsUnidentifiedMutation = error?.code === "GOOGLE_WORKSPACE_IDEMPOTENCY_KEY_REQUIRED"; }
    check("unidentified mutations are rejected before fetch", rejectsUnidentifiedMutation);
    check("Docs mutations transport Idempotency-Key", /Idempotency-Key/.test(execute.toString()));
    check("Calendar mutations remain marked external actions", /externalAction: true/.test(execute.toString()));
    check("Workspace research keeps rejected-file exclusion transport", /excludeFileIds/.test(execute.toString()) && /URLSearchParams/.test(execute.toString()));

    const passed = assertions.filter(item => item.passed).length;
    return freeze({
      success: passed === assertions.length,
      schema: `${SCHEMA}.acceptance-test.v1`,
      commission: "006.032D",
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
    createDocument,
    updateDocument,
    createSpreadsheet,
    writeSpreadsheetValues,
    listCalendarEvents,
    queryCalendarAvailability,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    getAuthorizationUrl,
    getStatus,
    runSelfTest,
    addEventListener: (...args) => state.listeners?.addEventListener(...args),
    removeEventListener: (...args) => state.listeners?.removeEventListener(...args)
  });

  global.MEOSGoogleWorkspaceAdapter = api;

  console.info(
    `[MEOS] ${NAME} v${VERSION} online. Build ${BUILD_ID}. ` +
    "Google read/write capabilities are registered only when verified by the server; mutations require durable idempotency and upstream MEOS authority."
  );

  // Discover real backend state after all preceding scripts have registered.
  Promise.resolve().then(() => refresh());
})(window);
