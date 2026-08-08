/**
 * MEOS Provider Manager
 * Version: 1.0.2
 * Build: PM102-ISOLATED-SELF-TEST-20260808-A
 * Status: Commissioned Candidate
 *
 * Purpose:
 * - Maintain a provider-neutral registry of authorized intelligence resources.
 * - Match MEOS capability requirements to available provider adapters.
 * - Rank providers by mission fit, reliability, privacy, speed, and cost.
 * - Support single-provider and coordinated multi-provider selection.
 * - Execute standardized provider requests and return normalized results.
 * - Fail honestly when a required capability is unavailable.
 *
 * Governance boundaries:
 * - The Provider Manager does not think, learn, remember, speak, or make
 *   executive decisions.
 * - The Executive Brain determines what the mission requires and validates
 *   returned intelligence.
 * - External providers remain advisory resources.
 * - Authorized human leadership remains final authority.
 */

(function initializeMEOSProviderManager(global) {
  "use strict";

  const NAME = "MEOS Provider Manager";
  const VERSION = "1.0.2";
  const BUILD_ID = "PM102-ISOLATED-SELF-TEST-20260808-A";
  const SCHEMA = "meos.provider-manager.v1";
  const STORAGE_KEY = "meos.provider-manager.history.v1";
  const MAX_HISTORY_ITEMS = 250;

  /*
   * Commission 006.016G3 — Provider Manager Laptop Persistence
   *
   * Temporary authority while MEOS awaits its long-term cloud repository.
   * Mission Engine and Executive Brain already use this shared IndexedDB
   * database. Provider Manager receives its own record inside the same
   * provider-neutral local repository.
   */
  const INDEXED_DB_NAME = "meos-local-executive-repository";
  const INDEXED_DB_VERSION = 1;
  const INDEXED_DB_STORE = "engine-state";
  const INDEXED_DB_RECORD_ID = "provider-manager-state";
  const PERSISTENCE_DEBOUNCE_MS = 150;

  const persistence = {
    mode: global.indexedDB
      ? "indexeddb-local-laptop"
      : "legacy-localstorage-fallback",
    authoritativeStorage: global.indexedDB
      ? "indexeddb"
      : "localstorage",
    indexedDbAvailable: Boolean(global.indexedDB),
    databaseName: INDEXED_DB_NAME,
    storeName: INDEXED_DB_STORE,
    recordId: INDEXED_DB_RECORD_ID,
    hydrated: false,
    migratedLegacySnapshot: false,
    localStorageReleased: false,
    writeScheduled: false,
    writeInFlight: false,
    suspended: false,
    lastPersistedAt: null,
    lastRestoredAt: null,
    lastError: null
  };

  let persistenceTimer = null;
  let indexedDbPromise = null;
  let writeChain = Promise.resolve();

  const PROVIDER_TYPES = Object.freeze([
    "language-model",
    "local-model",
    "internet-research",
    "government-api",
    "executive-office",
    "database",
    "specialized-agent",
    "tool"
  ]);

  const PROVIDER_STATUSES = Object.freeze([
    "online",
    "degraded",
    "offline",
    "unavailable",
    "disabled"
  ]);

  const CAPABILITY_CATALOG = Object.freeze({
    "general-reasoning": "General analysis and reasoning",
    "language-generation": "Natural-language generation",
    "long-document-analysis": "Long-document reading and analysis",
    coding: "Software analysis and code generation",
    vision: "Image and visual analysis",
    translation: "Language translation",
    "current-web-research": "Current public-web research",
    "website-crawling": "Website discovery and crawling",
    "website-change-detection": "Website version and change detection",
    "government-grant-data": "Government grant opportunity data",
    "government-regulation-data": "Government regulation and rule data",
    "structured-data-retrieval": "Structured database or API retrieval",
    "eligibility-analysis": "Eligibility and qualification analysis",
    "financial-analysis": "Financial analysis",
    "compliance-analysis": "Compliance and governance analysis",
    "operations-analysis": "Operational analysis",
    "executive-office-work": "Specialized Executive Office work",
    "private-local-reasoning": "Private local-model reasoning",
    "source-verification": "Independent source verification",
    synthesis: "Cross-source synthesis"
  });

  /**
   * These are architectural targets, not connected providers. Their presence
   * documents the permanent MEOS provider topology without pretending that an
   * adapter, account, credential, or live connection exists.
   */
  const ARCHITECTURE_TARGETS = Object.freeze([
    Object.freeze({ id: "openai", label: "OpenAI", type: "language-model" }),
    Object.freeze({ id: "claude", label: "Claude", type: "language-model" }),
    Object.freeze({ id: "gemini", label: "Gemini", type: "language-model" }),
    Object.freeze({ id: "local-model", label: "Local Model", type: "local-model" }),
    Object.freeze({ id: "internet-research", label: "Internet Research", type: "internet-research" }),
    Object.freeze({ id: "government-apis", label: "Government APIs", type: "government-api" }),
    Object.freeze({ id: "executive-offices", label: "Executive Offices", type: "executive-office" })
  ]);

  const DEFAULT_POLICY = Object.freeze({
    weights: Object.freeze({
      capabilityFit: 0.38,
      reliability: 0.20,
      privacy: 0.15,
      speed: 0.12,
      cost: 0.10,
      priority: 0.05
    }),
    minimumReliability: 0.5,
    minimumCapabilityCoverage: 1,
    preferLocalWhenEquivalent: true,
    allowDegradedProviders: true,
    allowMultiProvider: true,
    maximumProviders: 3,
    requireAllCapabilities: true
  });

  const state = {
    initializedAt: new Date().toISOString(),
    providers: new Map(),
    history: [],
    activeExecutions: new Map(),
    policy: clone(DEFAULT_POLICY),
    eventTarget: typeof EventTarget === "function" ? new EventTarget() : null
  };

  function clone(value) {
    if (value === undefined) {
      return undefined;
    }

    if (typeof structuredClone === "function") {
      try {
        return structuredClone(value);
      } catch (_error) {
        // Fall through to JSON cloning for plain serializable data.
      }
    }

    return JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }

    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  function normalizeId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeCapability(value) {
    return normalizeId(value);
  }

  function asFiniteNumber(value, fallback, minimum = 0, maximum = 1) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return Math.min(maximum, Math.max(minimum, number));
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function createId(prefix) {
    const random =
      global.crypto && typeof global.crypto.randomUUID === "function"
        ? global.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return `${prefix}-${random}`;
  }

  function nowMs() {
    return global.performance && typeof global.performance.now === "function"
      ? global.performance.now()
      : Date.now();
  }

  function emit(type, detail) {
    const safeDetail = clone(detail);

    if (state.eventTarget && typeof CustomEvent === "function") {
      state.eventTarget.dispatchEvent(new CustomEvent(type, { detail: safeDetail }));
    }

    if (typeof global.dispatchEvent === "function" && typeof CustomEvent === "function") {
      global.dispatchEvent(
        new CustomEvent(`meos:provider-manager:${type}`, {
          detail: safeDetail
        })
      );
    }
  }

  function applyHistorySnapshot(history) {
    if (!Array.isArray(history)) {
      return false;
    }

    state.history = history.slice(-MAX_HISTORY_ITEMS);
    return true;
  }

  function loadLegacyHistory() {
    try {
      if (!global.localStorage) {
        return false;
      }

      const stored = global.localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];

      return applyHistorySnapshot(parsed);
    } catch (error) {
      persistence.lastError = error?.message || String(error);
      console.warn(`[MEOS] ${NAME} could not load legacy history.`, error);
      return false;
    }
  }

  function openIndexedDb() {
    if (!global.indexedDB) {
      return Promise.reject(
        new Error("IndexedDB is unavailable in this browser.")
      );
    }

    if (indexedDbPromise) {
      return indexedDbPromise;
    }

    indexedDbPromise = new Promise((resolve, reject) => {
      const request = global.indexedDB.open(
        INDEXED_DB_NAME,
        INDEXED_DB_VERSION
      );

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(INDEXED_DB_STORE)) {
          database.createObjectStore(INDEXED_DB_STORE, {
            keyPath: "id"
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(
          request.error ||
            new Error("Provider Manager IndexedDB open failed.")
        );
      request.onblocked = () =>
        reject(
          new Error("Provider Manager IndexedDB upgrade was blocked.")
        );
    });

    return indexedDbPromise;
  }

  async function indexedDbGet(recordId = INDEXED_DB_RECORD_ID) {
    const database = await openIndexedDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        INDEXED_DB_STORE,
        "readonly"
      );
      const store = transaction.objectStore(INDEXED_DB_STORE);
      const request = store.get(recordId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () =>
        reject(
          request.error ||
            new Error("Provider Manager IndexedDB read failed.")
        );
    });
  }

  async function indexedDbPut(record) {
    const database = await openIndexedDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        INDEXED_DB_STORE,
        "readwrite"
      );
      const store = transaction.objectStore(INDEXED_DB_STORE);
      const request = store.put(record);

      request.onsuccess = () => resolve(true);
      request.onerror = () =>
        reject(
          request.error ||
            new Error("Provider Manager IndexedDB write failed.")
        );
      transaction.onerror = () =>
        reject(
          transaction.error ||
            new Error(
              "Provider Manager IndexedDB transaction failed."
            )
        );
    });
  }

  async function indexedDbDelete(recordId) {
    const database = await openIndexedDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        INDEXED_DB_STORE,
        "readwrite"
      );
      const store = transaction.objectStore(INDEXED_DB_STORE);
      const request = store.delete(recordId);

      request.onsuccess = () => resolve(true);
      request.onerror = () =>
        reject(
          request.error ||
            new Error("Provider Manager IndexedDB delete failed.")
        );
    });
  }

  function releaseLegacyLocalStorage() {
    try {
      global.localStorage?.removeItem(STORAGE_KEY);
      persistence.localStorageReleased = true;
      return true;
    } catch (error) {
      persistence.lastError = error?.message || String(error);
      return false;
    }
  }

  function buildPersistenceSnapshot() {
    return {
      schema: "meos.provider-manager.state.v1",
      version: VERSION,
      buildId: BUILD_ID,
      savedAt: new Date().toISOString(),
      history: state.history.slice(-MAX_HISTORY_ITEMS)
    };
  }

  async function persistIndexedDbNow() {
    if (!global.indexedDB || persistence.suspended) {
      return false;
    }

    persistence.writeScheduled = false;
    persistence.writeInFlight = true;

    try {
      const snapshot = buildPersistenceSnapshot();

      await indexedDbPut({
        id: INDEXED_DB_RECORD_ID,
        schema: "meos.provider-manager.local-state.v1",
        version: VERSION,
        buildId: BUILD_ID,
        savedAt: snapshot.savedAt,
        state: snapshot
      });

      persistence.mode = "indexeddb-local-laptop";
      persistence.authoritativeStorage = "indexeddb";
      persistence.lastPersistedAt = new Date().toISOString();
      persistence.lastError = null;
      persistence.suspended = false;

      /*
       * Only release localStorage after the complete bounded history has
       * successfully reached IndexedDB.
       */
      releaseLegacyLocalStorage();

      return true;
    } catch (error) {
      persistence.lastError = error?.message || String(error);
      persistence.suspended = true;

      console.error(
        `[MEOS] ${NAME} IndexedDB persistence failed. Provider execution continues.`,
        error
      );

      return false;
    } finally {
      persistence.writeInFlight = false;
    }
  }

  function scheduleIndexedDbPersistence() {
    if (!global.indexedDB || persistence.suspended) {
      return false;
    }

    persistence.writeScheduled = true;

    if (persistenceTimer) {
      global.clearTimeout(persistenceTimer);
    }

    persistenceTimer = global.setTimeout(() => {
      persistenceTimer = null;
      writeChain = writeChain
        .catch(() => undefined)
        .then(() => persistIndexedDbNow());
    }, PERSISTENCE_DEBOUNCE_MS);

    return true;
  }

  function persistHistory() {
    if (global.indexedDB) {
      scheduleIndexedDbPersistence();
      return;
    }

    try {
      if (global.localStorage) {
        global.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(state.history)
        );
      }

      persistence.mode = "legacy-localstorage-fallback";
      persistence.authoritativeStorage = "localstorage";
      persistence.lastPersistedAt = new Date().toISOString();
      persistence.lastError = null;
    } catch (error) {
      persistence.lastError = error?.message || String(error);
      persistence.suspended = true;

      console.warn(
        `[MEOS] ${NAME} fallback localStorage persistence is full. Provider execution continues.`,
        error
      );
    }
  }

  async function hydrateFromIndexedDb() {
    if (!global.indexedDB) {
      persistence.hydrated = true;
      return {
        success: true,
        restored: false,
        source: "localstorage-fallback"
      };
    }

    try {
      const record = await indexedDbGet();

      if (
        record?.state?.schema === "meos.provider-manager.state.v1" &&
        applyHistorySnapshot(record.state.history)
      ) {
        persistence.hydrated = true;
        persistence.lastRestoredAt = new Date().toISOString();
        persistence.mode = "indexeddb-local-laptop";
        persistence.authoritativeStorage = "indexeddb";
        persistence.lastError = null;
        releaseLegacyLocalStorage();

        emit("persistence-hydrated", {
          source: "indexeddb",
          historyItems: state.history.length,
          restoredAt: persistence.lastRestoredAt
        });

        return {
          success: true,
          restored: true,
          source: "indexeddb",
          historyItems: state.history.length
        };
      }

      /*
       * First migration load: state.history was synchronously populated from
       * legacy localStorage before the API was exposed. Persist that history
       * first, then release the old payload.
       */
      const saved = await persistIndexedDbNow();

      persistence.hydrated = true;
      persistence.migratedLegacySnapshot = saved === true;

      return {
        success: saved === true,
        restored: false,
        migratedLegacySnapshot: saved === true,
        source: "legacy-migration",
        historyItems: state.history.length
      };
    } catch (error) {
      persistence.hydrated = true;
      persistence.lastError = error?.message || String(error);

      console.error(
        `[MEOS] ${NAME} IndexedDB hydration failed; keeping runtime provider history.`,
        error
      );

      return {
        success: false,
        restored: false,
        error: persistence.lastError
      };
    }
  }

  async function flushPersistence() {
    if (persistenceTimer) {
      global.clearTimeout(persistenceTimer);
      persistenceTimer = null;
    }

    if (global.indexedDB) {
      writeChain = writeChain
        .catch(() => undefined)
        .then(() => persistIndexedDbNow());

      return writeChain;
    }

    persistHistory();
    return !persistence.suspended;
  }

  function getPersistenceStatus() {
    let localStorageBytes = null;

    try {
      localStorageBytes = new Blob([
        global.localStorage?.getItem(STORAGE_KEY) || ""
      ]).size;
    } catch (_error) {
      localStorageBytes = null;
    }

    return deepFreeze(
      clone({
        ...persistence,
        localStorageBytes
      })
    );
  }

  async function runLaptopPersistenceAcceptanceTest() {
    const probeId = "provider-manager-acceptance-probe";
    const probeValue = {
      id: probeId,
      schema: "meos.persistence-probe.v1",
      writtenAt: new Date().toISOString(),
      nonce: createId("probe")
    };

    const checks = [
      {
        name: "IndexedDB is available on this laptop browser",
        passed: Boolean(global.indexedDB)
      }
    ];

    if (!global.indexedDB) {
      console.table(checks);

      return {
        commission: "006.016G3",
        version: VERSION,
        buildId: BUILD_ID,
        passed: false,
        checks
      };
    }

    try {
      await indexedDbPut(probeValue);
      const restoredProbe = await indexedDbGet(probeId);

      checks.push({
        name: "Laptop repository accepts Provider Manager writes",
        passed: restoredProbe?.nonce === probeValue.nonce
      });

      await indexedDbDelete(probeId);
      const deletedProbe = await indexedDbGet(probeId);

      checks.push({
        name: "Laptop repository can read and delete Provider Manager records",
        passed: deletedProbe === null
      });

      const expectedHistory = Math.min(
        state.history.length,
        MAX_HISTORY_ITEMS
      );

      const flushed = await flushPersistence();
      const record = await indexedDbGet();

      checks.push({
        name: "Provider Manager history snapshot flushes to IndexedDB",
        passed:
          flushed === true &&
          record?.state?.schema === "meos.provider-manager.state.v1"
      });

      checks.push({
        name: "Bounded provider history survives the repository snapshot",
        passed:
          Array.isArray(record?.state?.history) &&
          record.state.history.length === expectedHistory
      });

      checks.push({
        name: "Legacy Provider Manager localStorage payload is released",
        passed: global.localStorage?.getItem(STORAGE_KEY) === null
      });

      checks.push({
        name: "IndexedDB is the temporary Provider Manager laptop authority",
        passed:
          persistence.authoritativeStorage === "indexeddb" &&
          persistence.mode === "indexeddb-local-laptop"
      });

      checks.push({
        name: "Provider Manager runtime remains operational while persistence is asynchronous",
        passed:
          typeof request === "function" &&
          typeof selectProviders === "function" &&
          typeof runSelfTest === "function"
      });
    } catch (error) {
      checks.push({
        name: "Laptop repository test completed without error",
        passed: false,
        error: error?.message || String(error)
      });
    }

    const passed = checks.every(item => item.passed);

    console.table(checks);
    console.info(
      `[MEOS ${VERSION}] Commission 006.016G3 Provider Manager laptop persistence acceptance: ${passed ? "PASS" : "FAIL"}.`
    );

    return {
      commission: "006.016G3",
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      checks,
      persistence: getPersistenceStatus()
    };
  }

  function record(event, data = {}) {
    const entry = {
      id: createId("provider-history"),
      event,
      at: new Date().toISOString(),
      ...clone(data)
    };

    state.history.push(entry);

    if (state.history.length > MAX_HISTORY_ITEMS) {
      state.history.splice(0, state.history.length - MAX_HISTORY_ITEMS);
    }

    persistHistory();
    emit("history", entry);
    return clone(entry);
  }

  function normalizeCapabilities(capabilities) {
    const source = Array.isArray(capabilities)
      ? capabilities
      : capabilities && typeof capabilities === "object"
        ? Object.keys(capabilities).filter(key => capabilities[key])
        : [];

    return unique(source.map(normalizeCapability));
  }

  function validateProviderDefinition(definition) {
    if (!definition || typeof definition !== "object") {
      throw new TypeError("Provider registration requires a definition object.");
    }

    const id = normalizeId(definition.id || definition.name);

    if (!id) {
      throw new TypeError("Provider id must be a non-empty string.");
    }

    const type = normalizeId(definition.type || "tool");

    if (!PROVIDER_TYPES.includes(type)) {
      throw new RangeError(`Unsupported provider type: ${type}.`);
    }

    const capabilities = normalizeCapabilities(definition.capabilities);

    if (capabilities.length === 0) {
      throw new TypeError("A provider must declare at least one capability.");
    }

    const status = normalizeId(definition.status || "unavailable");

    if (!PROVIDER_STATUSES.includes(status)) {
      throw new RangeError(`Unsupported provider status: ${status}.`);
    }

    if (
      status === "online" &&
      typeof definition.execute !== "function"
    ) {
      throw new TypeError(
        "An online provider must expose an async-compatible execute(request, context) function."
      );
    }

    return {
      id,
      name: String(definition.name || id).trim(),
      type,
      status,
      capabilities,
      description: String(definition.description || "").trim(),
      providerGroup: normalizeId(definition.providerGroup || type),
      priority: asFiniteNumber(definition.priority, 0.5),
      reliability: asFiniteNumber(definition.reliability, 0.75),
      privacy: asFiniteNumber(definition.privacy, type === "local-model" ? 1 : 0.5),
      speed: asFiniteNumber(definition.speed, 0.5),
      costEfficiency: asFiniteNumber(definition.costEfficiency, 0.5),
      enabled: definition.enabled !== false,
      metadata: clone(definition.metadata || {}),
      execute: typeof definition.execute === "function" ? definition.execute : null,
      healthCheck:
        typeof definition.healthCheck === "function"
          ? definition.healthCheck
          : null,
      registeredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastHealthCheckAt: null,
      lastHealth: null,
      metrics: {
        requests: 0,
        successes: 0,
        failures: 0,
        averageDurationMs: 0,
        lastDurationMs: null,
        lastUsedAt: null
      }
    };
  }

  function publicProvider(provider) {
    if (!provider) {
      return null;
    }

    const {
      execute: _execute,
      healthCheck: _healthCheck,
      ...safe
    } = provider;

    return clone(safe);
  }

  function registerProvider(definition, options = {}) {
    const provider = validateProviderDefinition(definition);
    const existing = state.providers.get(provider.id);

    if (existing && options.replace !== true) {
      throw new Error(
        `Provider "${provider.id}" is already registered. Use replace: true to replace it.`
      );
    }

    if (existing) {
      provider.registeredAt = existing.registeredAt;
      provider.metrics = clone(existing.metrics);
    }

    state.providers.set(provider.id, provider);

    record(existing ? "provider.replaced" : "provider.registered", {
      providerId: provider.id,
      type: provider.type,
      status: provider.status,
      capabilities: provider.capabilities
    });

    emit("provider-registered", publicProvider(provider));
    return publicProvider(provider);
  }

  function unregisterProvider(providerId) {
    const id = normalizeId(providerId);
    const provider = state.providers.get(id);

    if (!provider) {
      return {
        success: false,
        providerId: id,
        error: "Provider is not registered."
      };
    }

    state.providers.delete(id);
    record("provider.unregistered", { providerId: id });
    emit("provider-unregistered", { providerId: id });

    return {
      success: true,
      provider: publicProvider(provider)
    };
  }

  function updateProvider(providerId, patch = {}) {
    const id = normalizeId(providerId);
    const provider = state.providers.get(id);

    if (!provider) {
      throw new Error(`Provider "${id}" is not registered.`);
    }

    const merged = {
      ...provider,
      ...patch,
      id,
      name: patch.name || provider.name,
      capabilities:
        patch.capabilities !== undefined
          ? patch.capabilities
          : provider.capabilities,
      execute:
        patch.execute !== undefined
          ? patch.execute
          : provider.execute,
      healthCheck:
        patch.healthCheck !== undefined
          ? patch.healthCheck
          : provider.healthCheck,
      metadata: {
        ...provider.metadata,
        ...(patch.metadata || {})
      }
    };

    const validated = validateProviderDefinition(merged);
    validated.registeredAt = provider.registeredAt;
    validated.updatedAt = new Date().toISOString();
    validated.metrics = clone(provider.metrics);
    validated.lastHealth = provider.lastHealth;
    validated.lastHealthCheckAt = provider.lastHealthCheckAt;

    state.providers.set(id, validated);
    record("provider.updated", { providerId: id });
    emit("provider-updated", publicProvider(validated));

    return publicProvider(validated);
  }

  function setProviderStatus(providerId, status) {
    return updateProvider(providerId, { status });
  }

  function getProvider(providerId) {
    return publicProvider(state.providers.get(normalizeId(providerId)));
  }

  function listProviders(filters = {}) {
    let providers = [...state.providers.values()];

    if (filters.status) {
      const statuses = unique(
        (Array.isArray(filters.status) ? filters.status : [filters.status]).map(normalizeId)
      );
      providers = providers.filter(provider => statuses.includes(provider.status));
    }

    if (filters.type) {
      const types = unique(
        (Array.isArray(filters.type) ? filters.type : [filters.type]).map(normalizeId)
      );
      providers = providers.filter(provider => types.includes(provider.type));
    }

    if (filters.capability) {
      const capability = normalizeCapability(filters.capability);
      providers = providers.filter(provider => provider.capabilities.includes(capability));
    }

    return providers.map(publicProvider);
  }

  function listCapabilities() {
    const providers = [...state.providers.values()];

    return Object.entries(CAPABILITY_CATALOG).map(([id, description]) => {
      const matching = providers.filter(provider => provider.capabilities.includes(id));
      const available = matching.filter(isProviderSelectable);

      return {
        id,
        description,
        registeredProviders: matching.map(provider => provider.id),
        availableProviders: available.map(provider => provider.id),
        available: available.length > 0
      };
    });
  }

  function isProviderSelectable(provider) {
    return Boolean(
      provider &&
      provider.enabled &&
      (provider.status === "online" ||
        (provider.status === "degraded" && state.policy.allowDegradedProviders)) &&
      typeof provider.execute === "function" &&
      provider.reliability >= state.policy.minimumReliability
    );
  }

  function normalizeRequirements(requirements) {
    if (typeof requirements === "string") {
      return {
        capabilities: [normalizeCapability(requirements)]
      };
    }

    if (Array.isArray(requirements)) {
      return {
        capabilities: normalizeCapabilities(requirements)
      };
    }

    if (!requirements || typeof requirements !== "object") {
      throw new TypeError("Provider selection requires capability requirements.");
    }

    const capabilities = normalizeCapabilities(
      requirements.capabilities || requirements.requiredCapabilities
    );

    if (capabilities.length === 0) {
      throw new TypeError("At least one required capability is necessary.");
    }

    return {
      capabilities,
      preferredTypes: unique(
        (requirements.preferredTypes || []).map(normalizeId)
      ),
      excludedProviders: unique(
        (requirements.excludedProviders || []).map(normalizeId)
      ),
      preferredProviders: unique(
        (requirements.preferredProviders || []).map(normalizeId)
      ),
      maximumCost:
        requirements.maximumCost === undefined
          ? null
          : Number(requirements.maximumCost),
      minimumPrivacy: asFiniteNumber(requirements.minimumPrivacy, 0),
      minimumReliability: asFiniteNumber(
        requirements.minimumReliability,
        state.policy.minimumReliability
      ),
      requireAllCapabilities:
        requirements.requireAllCapabilities !== undefined
          ? Boolean(requirements.requireAllCapabilities)
          : state.policy.requireAllCapabilities,
      allowMultiProvider:
        requirements.allowMultiProvider !== undefined
          ? Boolean(requirements.allowMultiProvider)
          : state.policy.allowMultiProvider,
      maximumProviders: Math.max(
        1,
        Math.min(
          10,
          Number(requirements.maximumProviders || state.policy.maximumProviders)
        )
      ),
      missionCritical: Boolean(requirements.missionCritical),
      privacySensitive: Boolean(requirements.privacySensitive),
      sourceDiversity: Math.max(1, Number(requirements.sourceDiversity || 1))
    };
  }

  function coverageFor(provider, capabilities) {
    const covered = capabilities.filter(capability =>
      provider.capabilities.includes(capability)
    );

    return {
      covered,
      missing: capabilities.filter(capability => !covered.includes(capability)),
      ratio: capabilities.length > 0 ? covered.length / capabilities.length : 0
    };
  }

  function scoreProvider(provider, requirements) {
    const coverage = coverageFor(provider, requirements.capabilities);
    const weights = state.policy.weights;
    const typeBoost = requirements.preferredTypes.includes(provider.type) ? 0.08 : 0;
    const providerBoost = requirements.preferredProviders.includes(provider.id) ? 0.1 : 0;
    const localBoost =
      state.policy.preferLocalWhenEquivalent && provider.type === "local-model"
        ? 0.03
        : 0;
    const privacyPenalty = provider.privacy < requirements.minimumPrivacy ? 1 : 0;
    const reliabilityPenalty = provider.reliability < requirements.minimumReliability ? 1 : 0;

    const score =
      coverage.ratio * weights.capabilityFit +
      provider.reliability * weights.reliability +
      provider.privacy * weights.privacy +
      provider.speed * weights.speed +
      provider.costEfficiency * weights.cost +
      provider.priority * weights.priority +
      typeBoost +
      providerBoost +
      localBoost -
      privacyPenalty -
      reliabilityPenalty;

    return {
      providerId: provider.id,
      score: Number(score.toFixed(4)),
      coverage,
      metrics: {
        reliability: provider.reliability,
        privacy: provider.privacy,
        speed: provider.speed,
        costEfficiency: provider.costEfficiency,
        priority: provider.priority
      }
    };
  }

  function selectProviders(requirementsInput, options = {}) {
    const requirements = normalizeRequirements(requirementsInput);
    const selectionId = createId("provider-selection");
    const started = nowMs();

    const candidates = [...state.providers.values()]
      .filter(isProviderSelectable)
      .filter(provider => !requirements.excludedProviders.includes(provider.id))
      .filter(provider => provider.privacy >= requirements.minimumPrivacy)
      .filter(provider => provider.reliability >= requirements.minimumReliability)
      .map(provider => ({
        provider,
        evaluation: scoreProvider(provider, requirements)
      }))
      .filter(candidate => candidate.evaluation.coverage.ratio > 0)
      .sort((a, b) => b.evaluation.score - a.evaluation.score);

    let selected = [];
    let uncovered = [...requirements.capabilities];

    const completeCandidate = candidates.find(candidate =>
      candidate.evaluation.coverage.missing.length === 0
    );

    if (completeCandidate) {
      selected = [completeCandidate];
      uncovered = [];
    } else if (requirements.allowMultiProvider) {
      const remaining = [...candidates];

      while (
        uncovered.length > 0 &&
        remaining.length > 0 &&
        selected.length < requirements.maximumProviders
      ) {
        const ranked = remaining
          .map(candidate => {
            const newCoverage = uncovered.filter(capability =>
              candidate.provider.capabilities.includes(capability)
            );

            return {
              candidate,
              newCoverage,
              utility:
                newCoverage.length * 10 + candidate.evaluation.score
            };
          })
          .filter(item => item.newCoverage.length > 0)
          .sort((a, b) => b.utility - a.utility);

        if (ranked.length === 0) {
          break;
        }

        const chosen = ranked[0].candidate;
        selected.push(chosen);
        uncovered = uncovered.filter(
          capability => !chosen.provider.capabilities.includes(capability)
        );
        remaining.splice(remaining.indexOf(chosen), 1);
      }
    }

    const selectedProviders = selected.map(item => publicProvider(item.provider));
    const success =
      selectedProviders.length > 0 &&
      (!requirements.requireAllCapabilities || uncovered.length === 0) &&
      selectedProviders.length >= requirements.sourceDiversity;

    const result = {
      success,
      schema: "meos.provider-manager.selection.v1",
      selectionId,
      status: success ? "selected" : "unavailable",
      requirements,
      providers: selectedProviders,
      evaluations: selected.map(item => clone(item.evaluation)),
      uncoveredCapabilities: uncovered,
      availableCandidateCount: candidates.length,
      reason: success
        ? selectedProviders.length === 1
          ? "One authorized provider satisfies the request."
          : "A coordinated provider group satisfies the request."
        : buildUnavailableReason(requirements, candidates, uncovered),
      durationMs: Number((nowMs() - started).toFixed(2)),
      selectedAt: new Date().toISOString()
    };

    record("selection.completed", {
      selectionId,
      success,
      capabilities: requirements.capabilities,
      providers: selectedProviders.map(provider => provider.id),
      uncoveredCapabilities: uncovered
    });

    emit("selection-completed", result);
    return deepFreeze(clone(result));
  }

  function buildUnavailableReason(requirements, candidates, uncovered) {
    if (state.providers.size === 0) {
      return "No provider adapters are registered.";
    }

    if (candidates.length === 0) {
      return "No registered provider is online, enabled, and eligible for the required capabilities.";
    }

    if (uncovered.length > 0) {
      return `No authorized provider combination covers: ${uncovered.join(", ")}.`;
    }

    if (candidates.length < requirements.sourceDiversity) {
      return `The mission requires ${requirements.sourceDiversity} independent sources, but fewer are available.`;
    }

    return "The Provider Manager could not form an authorized provider plan.";
  }

  function capabilitiesForBrainRoute(brainResult) {
    const route =
      brainResult?.route ||
      brainResult?.package?.routing?.primaryRoute ||
      null;
    const requestType = brainResult?.package?.request?.type || "general";
    const capabilities = [];

    if (route === "external-intelligence-research") {
      capabilities.push("current-web-research", "source-verification", "synthesis");
    }

    if (route === "local-recall-plus-provider-reasoning") {
      capabilities.push("general-reasoning", "language-generation");
    }

    if (route === "executive-decision-support") {
      capabilities.push("general-reasoning", "synthesis");
    }

    if (requestType === "research") {
      capabilities.push("current-web-research");
    }

    if (requestType === "decision") {
      capabilities.push("general-reasoning", "synthesis");
    }

    return unique(capabilities.length > 0 ? capabilities : ["general-reasoning"]);
  }

  function planForBrainRequest(brainResult, options = {}) {
    if (!brainResult || brainResult.success !== true) {
      return deepFreeze({
        success: false,
        schema: "meos.provider-manager.brain-plan.v1",
        error: "A successful Executive Brain routing result is required."
      });
    }

    const capabilities = normalizeCapabilities(
      options.capabilities || capabilitiesForBrainRoute(brainResult)
    );

    const requirements = {
      capabilities,
      preferredTypes: options.preferredTypes || [],
      excludedProviders: options.excludedProviders || [],
      preferredProviders: options.preferredProviders || [],
      minimumPrivacy: options.minimumPrivacy || 0,
      minimumReliability:
        options.minimumReliability || state.policy.minimumReliability,
      allowMultiProvider:
        options.allowMultiProvider !== undefined
          ? options.allowMultiProvider
          : true,
      maximumProviders: options.maximumProviders || state.policy.maximumProviders,
      requireAllCapabilities:
        options.requireAllCapabilities !== undefined
          ? options.requireAllCapabilities
          : true,
      sourceDiversity: options.sourceDiversity || 1,
      missionCritical: options.missionCritical || false,
      privacySensitive: options.privacySensitive || false
    };

    const selection = selectProviders(requirements, options);

    return deepFreeze({
      success: selection.success,
      schema: "meos.provider-manager.brain-plan.v1",
      brainRequestId:
        brainResult.requestId || brainResult.package?.request?.id || null,
      route:
        brainResult.route || brainResult.package?.routing?.primaryRoute || null,
      capabilities,
      selection
    });
  }

  function normalizeProviderResult(provider, rawResult, executionId, durationMs) {
    const resultObject =
      rawResult && typeof rawResult === "object"
        ? clone(rawResult)
        : { output: rawResult };

    return {
      success: resultObject.success !== false,
      schema: "meos.provider-manager.provider-result.v1",
      executionId,
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type
      },
      output:
        resultObject.output !== undefined
          ? resultObject.output
          : resultObject.result !== undefined
            ? resultObject.result
            : resultObject,
      evidence: Array.isArray(resultObject.evidence)
        ? resultObject.evidence
        : [],
      citations: Array.isArray(resultObject.citations)
        ? resultObject.citations
        : [],
      confidence:
        resultObject.confidence === undefined
          ? null
          : asFiniteNumber(resultObject.confidence, null),
      unknowns: Array.isArray(resultObject.unknowns)
        ? resultObject.unknowns
        : [],
      metadata: clone(resultObject.metadata || {}),
      durationMs,
      completedAt: new Date().toISOString()
    };
  }

  function updateMetrics(provider, success, durationMs) {
    const metrics = provider.metrics;
    metrics.requests += 1;
    metrics.successes += success ? 1 : 0;
    metrics.failures += success ? 0 : 1;
    metrics.lastDurationMs = durationMs;
    metrics.lastUsedAt = new Date().toISOString();
    metrics.averageDurationMs = Number(
      (
        (metrics.averageDurationMs * (metrics.requests - 1) + durationMs) /
        metrics.requests
      ).toFixed(2)
    );
  }

  async function executeProvider(provider, payload, context, parentExecutionId) {
    const executionId = createId("provider-execution");
    const started = nowMs();

    state.activeExecutions.set(executionId, {
      executionId,
      parentExecutionId,
      providerId: provider.id,
      startedAt: new Date().toISOString()
    });

    try {
      const rawResult = await provider.execute(clone(payload), {
        ...clone(context),
        executionId,
        parentExecutionId,
        provider: publicProvider(provider)
      });
      const durationMs = Number((nowMs() - started).toFixed(2));
      const normalized = normalizeProviderResult(
        provider,
        rawResult,
        executionId,
        durationMs
      );

      updateMetrics(provider, normalized.success, durationMs);
      record("execution.provider-completed", {
        executionId,
        parentExecutionId,
        providerId: provider.id,
        success: normalized.success,
        durationMs
      });

      return normalized;
    } catch (error) {
      const durationMs = Number((nowMs() - started).toFixed(2));
      updateMetrics(provider, false, durationMs);

      const failure = {
        success: false,
        schema: "meos.provider-manager.provider-result.v1",
        executionId,
        provider: {
          id: provider.id,
          name: provider.name,
          type: provider.type
        },
        error: {
          name: error?.name || "Error",
          message: error?.message || String(error)
        },
        evidence: [],
        citations: [],
        confidence: null,
        unknowns: [],
        durationMs,
        completedAt: new Date().toISOString()
      };

      record("execution.provider-failed", {
        executionId,
        parentExecutionId,
        providerId: provider.id,
        message: failure.error.message,
        durationMs
      });

      return failure;
    } finally {
      state.activeExecutions.delete(executionId);
    }
  }

  async function executeSelection(selection, payload, context = {}) {
    if (!selection || selection.success !== true) {
      return deepFreeze({
        success: false,
        schema: "meos.provider-manager.execution.v1",
        status: "not-executed",
        error:
          selection?.reason ||
          "A successful provider selection is required before execution.",
        selection: clone(selection || null)
      });
    }

    const executionId = createId("provider-group-execution");
    const started = nowMs();
    const providers = selection.providers
      .map(item => state.providers.get(item.id))
      .filter(Boolean);

    state.activeExecutions.set(executionId, {
      executionId,
      providerIds: providers.map(provider => provider.id),
      startedAt: new Date().toISOString()
    });

    record("execution.started", {
      executionId,
      selectionId: selection.selectionId,
      providers: providers.map(provider => provider.id)
    });

    try {
      const results = await Promise.all(
        providers.map(provider =>
          executeProvider(provider, payload, context, executionId)
        )
      );
      const successful = results.filter(result => result.success);
      const durationMs = Number((nowMs() - started).toFixed(2));

      const result = {
        success: successful.length > 0,
        schema: "meos.provider-manager.execution.v1",
        executionId,
        selectionId: selection.selectionId,
        status:
          successful.length === results.length
            ? "completed"
            : successful.length > 0
              ? "partially-completed"
              : "failed",
        results,
        summary: {
          providerCount: results.length,
          successCount: successful.length,
          failureCount: results.length - successful.length
        },
        durationMs,
        completedAt: new Date().toISOString()
      };

      record("execution.completed", {
        executionId,
        selectionId: selection.selectionId,
        status: result.status,
        durationMs
      });

      emit("execution-completed", result);
      return deepFreeze(clone(result));
    } finally {
      state.activeExecutions.delete(executionId);
    }
  }

  async function request(requirements, payload, context = {}) {
    const selection = selectProviders(requirements);

    if (!selection.success) {
      return deepFreeze({
        success: false,
        schema: "meos.provider-manager.request.v1",
        selection,
        execution: null
      });
    }

    const execution = await executeSelection(selection, payload, context);

    return deepFreeze({
      success: execution.success,
      schema: "meos.provider-manager.request.v1",
      selection,
      execution
    });
  }

  async function healthCheck(providerId = null) {
    const providers = providerId
      ? [state.providers.get(normalizeId(providerId))].filter(Boolean)
      : [...state.providers.values()];

    const reports = [];

    for (const provider of providers) {
      const checkedAt = new Date().toISOString();
      let health;

      try {
        if (typeof provider.healthCheck === "function") {
          const response = await provider.healthCheck(publicProvider(provider));
          health = {
            success: response?.success !== false,
            status: normalizeId(response?.status || provider.status),
            details: clone(response?.details || {})
          };
        } else {
          health = {
            success: isProviderSelectable(provider),
            status: provider.status,
            details: {
              method: "registry-status",
              executeAvailable: typeof provider.execute === "function"
            }
          };
        }
      } catch (error) {
        health = {
          success: false,
          status: "offline",
          details: {
            error: error?.message || String(error)
          }
        };
      }

      provider.lastHealth = clone(health);
      provider.lastHealthCheckAt = checkedAt;

      if (PROVIDER_STATUSES.includes(health.status)) {
        provider.status = health.status;
      }

      reports.push({
        providerId: provider.id,
        checkedAt,
        ...health
      });
    }

    record("health.checked", {
      providers: reports.map(report => report.providerId)
    });

    return deepFreeze(clone(reports));
  }

  function setPolicy(patch = {}) {
    const next = {
      ...state.policy,
      ...clone(patch),
      weights: {
        ...state.policy.weights,
        ...(patch.weights || {})
      }
    };

    const weightTotal = Object.values(next.weights).reduce(
      (sum, value) => sum + Number(value || 0),
      0
    );

    if (weightTotal <= 0) {
      throw new RangeError("Provider selection weights must total more than zero.");
    }

    Object.keys(next.weights).forEach(key => {
      next.weights[key] = Number(next.weights[key]) / weightTotal;
    });

    next.minimumReliability = asFiniteNumber(next.minimumReliability, 0.5);
    next.maximumProviders = Math.max(1, Math.min(10, Number(next.maximumProviders || 3)));

    state.policy = next;
    record("policy.updated", { policy: clone(next) });
    emit("policy-updated", next);
    return deepFreeze(clone(next));
  }

  function getPolicy() {
    return deepFreeze(clone(state.policy));
  }

  function getHistory(limit = 50) {
    const safeLimit = Math.max(1, Math.min(MAX_HISTORY_ITEMS, Number(limit || 50)));
    return deepFreeze(clone(state.history.slice(-safeLimit)));
  }

  function clearHistory() {
    state.history = [];
    persistHistory();
    emit("history-cleared", {});
    return { success: true };
  }

  function getStatus() {
    const providers = [...state.providers.values()];
    const selectable = providers.filter(isProviderSelectable);
    const capabilities = listCapabilities();

    return deepFreeze({
      name: NAME,
      version: VERSION,
      buildId: BUILD_ID,
      schema: SCHEMA,
      status: "online",
      operatingMode: "brain-governed-provider-neutral-orchestration",
      organizationNeutralCore: true,
      providerIndependent: true,
      registeredProviders: providers.length,
      availableProviders: selectable.length,
      unavailableProviders: providers.length - selectable.length,
      availableCapabilities: capabilities.filter(item => item.available).map(item => item.id),
      architectureTargets: ARCHITECTURE_TARGETS.map(target => ({
        ...target,
        registered: state.providers.has(target.id),
        status: state.providers.get(target.id)?.status || "not-connected"
      })),
      activeExecutions: state.activeExecutions.size,
      historyItems: state.history.length,
      persistence: getPersistenceStatus(),
      initializedAt: state.initializedAt
    });
  }

  function addEventListener(type, listener, options) {
    if (!state.eventTarget) {
      return;
    }
    state.eventTarget.addEventListener(type, listener, options);
  }

  function removeEventListener(type, listener, options) {
    if (!state.eventTarget) {
      return;
    }
    state.eventTarget.removeEventListener(type, listener, options);
  }

  async function runSelfTest(options = {}) {
    const testPrefix = `self-test-${Date.now()}`;
    const registeredIds = [];
    const assertions = [];

    /*
     * Commission 006.016G3A:
     * The Provider Manager self-test must be deterministic even when real
     * providers are already registered at runtime. Capture those provider IDs
     * before adding test fixtures, then exclude them from fixture selections.
     * This prevents a newly commissioned real capability from making an old
     * "unavailable" assertion fail or collapsing a two-fixture selection into
     * one real provider.
     */
    const preExistingProviderIds = [...state.providers.keys()];

    function assert(name, condition, details = {}) {
      assertions.push({
        name,
        passed: Boolean(condition),
        details: clone(details)
      });
    }

    try {
      const reasonerId = `${testPrefix}-reasoner`;
      const researchId = `${testPrefix}-research`;
      const verifierId = `${testPrefix}-verifier`;

      registerProvider({
        id: reasonerId,
        name: "Self-Test Reasoner",
        type: "local-model",
        status: "online",
        capabilities: ["general-reasoning", "language-generation", "synthesis"],
        reliability: 0.96,
        privacy: 1,
        speed: 0.85,
        costEfficiency: 1,
        priority: 0.75,
        execute: async payload => ({
          success: true,
          output: { echoed: payload?.text || null },
          confidence: 0.95
        })
      });
      registeredIds.push(reasonerId);

      registerProvider({
        id: researchId,
        name: "Self-Test Research",
        type: "internet-research",
        status: "online",
        capabilities: ["current-web-research", "website-crawling"],
        reliability: 0.9,
        privacy: 0.65,
        speed: 0.7,
        costEfficiency: 0.9,
        priority: 0.7,
        execute: async payload => ({
          success: true,
          output: { query: payload?.query || null },
          evidence: [{ source: "self-test", verified: true }],
          confidence: 0.9
        })
      });
      registeredIds.push(researchId);

      registerProvider({
        id: verifierId,
        name: "Self-Test Verifier",
        type: "government-api",
        status: "online",
        capabilities: ["source-verification", "government-grant-data"],
        reliability: 0.99,
        privacy: 0.8,
        speed: 0.65,
        costEfficiency: 1,
        priority: 0.8,
        execute: async payload => ({
          success: true,
          output: { verified: Boolean(payload) },
          confidence: 0.99
        })
      });
      registeredIds.push(verifierId);

      const singleSelection = selectProviders({
        capabilities: ["general-reasoning", "language-generation"],
        preferredTypes: ["local-model"],
        excludedProviders: preExistingProviderIds
      });

      assert(
        "Single-provider capability selection",
        singleSelection.success &&
          singleSelection.providers.length === 1 &&
          singleSelection.providers[0].id === reasonerId,
        singleSelection
      );

      const multiSelection = selectProviders({
        capabilities: ["current-web-research", "source-verification"],
        allowMultiProvider: true,
        maximumProviders: 2,
        excludedProviders: preExistingProviderIds
      });

      assert(
        "Multi-provider coordinated selection",
        multiSelection.success &&
          multiSelection.providers.length === 2 &&
          multiSelection.providers.some(provider => provider.id === researchId) &&
          multiSelection.providers.some(provider => provider.id === verifierId),
        multiSelection
      );

      const execution = await executeSelection(
        multiSelection,
        { query: "self-test opportunity" },
        { source: "provider-manager-self-test" }
      );

      assert(
        "Standardized multi-provider execution",
        execution.success && execution.summary.successCount === 2,
        execution
      );

      const unavailable = selectProviders({
        capabilities: ["website-change-detection"],
        requireAllCapabilities: true,
        excludedProviders: preExistingProviderIds
      });

      assert(
        "Honest unavailable-capability result",
        unavailable.success === false &&
          unavailable.uncoveredCapabilities.includes("website-change-detection"),
        unavailable
      );

      const mockBrainResult = {
        success: true,
        requestId: "brain-self-test",
        route: "external-intelligence-research",
        package: {
          request: { id: "brain-self-test", type: "research" },
          routing: { primaryRoute: "external-intelligence-research" }
        }
      };

      const brainPlan = planForBrainRequest(mockBrainResult, {
        capabilities: ["current-web-research", "source-verification"],
        maximumProviders: 2,
        excludedProviders: preExistingProviderIds
      });

      assert(
        "Executive Brain request planning compatibility",
        brainPlan.success &&
          brainPlan.selection.providers.length === 2 &&
          brainPlan.selection.providers.some(provider => provider.id === researchId) &&
          brainPlan.selection.providers.some(provider => provider.id === verifierId),
        brainPlan
      );
    } catch (error) {
      assert("Unexpected self-test exception", false, {
        name: error?.name || "Error",
        message: error?.message || String(error)
      });
    } finally {
      registeredIds.forEach(id => unregisterProvider(id));
    }

    const passed = assertions.filter(item => item.passed).length;
    const result = {
      success: passed === assertions.length,
      schema: "meos.provider-manager.self-test.v1",
      name: NAME,
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      failed: assertions.length - passed,
      total: assertions.length,
      assertions,
      completedAt: new Date().toISOString()
    };

    if (options.render === true) {
      renderSelfTest(result);
    }

    record("self-test.completed", {
      success: result.success,
      passed: result.passed,
      failed: result.failed
    });

    return deepFreeze(clone(result));
  }

  function renderSelfTest(result) {
    if (!global.document) {
      return;
    }

    const existing = global.document.getElementById("meos-provider-manager-test");
    if (existing) {
      existing.remove();
    }

    const panel = global.document.createElement("section");
    panel.id = "meos-provider-manager-test";
    panel.setAttribute("role", "status");
    panel.style.cssText = [
      "position:fixed",
      "inset:20px",
      "z-index:2147483647",
      "overflow:auto",
      "padding:24px",
      "border:1px solid #334155",
      "border-radius:14px",
      "background:#0f172a",
      "color:#e2e8f0",
      "font-family:Arial,sans-serif",
      "box-shadow:0 20px 50px rgba(0,0,0,.45)"
    ].join(";");

    const title = global.document.createElement("h1");
    title.textContent = `MEOS Provider Manager ${result.success ? "PASS" : "FAIL"}`;
    title.style.color = result.success ? "#86efac" : "#fca5a5";
    panel.appendChild(title);

    const summary = global.document.createElement("p");
    summary.textContent = `${result.passed}/${result.total} tests passed — v${VERSION}`;
    panel.appendChild(summary);

    result.assertions.forEach(assertion => {
      const card = global.document.createElement("article");
      card.style.cssText = "margin:14px 0;padding:14px;border:1px solid #334155;border-radius:10px;background:#111827";

      const heading = global.document.createElement("h2");
      heading.textContent = `${assertion.passed ? "PASS" : "FAIL"} — ${assertion.name}`;
      heading.style.color = assertion.passed ? "#86efac" : "#fca5a5";
      card.appendChild(heading);

      const pre = global.document.createElement("pre");
      pre.textContent = JSON.stringify(assertion.details, null, 2);
      pre.style.cssText = "white-space:pre-wrap;word-break:break-word;background:#020617;padding:12px;border-radius:8px";
      card.appendChild(pre);
      panel.appendChild(card);
    });

    const close = global.document.createElement("button");
    close.textContent = "Close Test";
    close.style.cssText = "padding:10px 16px;font-size:16px;cursor:pointer";
    close.addEventListener("click", () => panel.remove());
    panel.appendChild(close);

    global.document.body.appendChild(panel);
  }

  function maybeRunVisibleSelfTest() {
    if (!global.location || !global.document) {
      return;
    }

    const hash = String(global.location.hash || "").toLowerCase();
    const query = String(global.location.search || "").toLowerCase();

    if (
      hash === "#provider-manager-test" ||
      query.includes("provider-manager-test=1")
    ) {
      const start = () => {
        void runSelfTest({ render: true });
      };

      if (global.document.readyState === "loading") {
        global.document.addEventListener("DOMContentLoaded", start, { once: true });
      } else {
        start();
      }
    }
  }

  /*
   * Preserve synchronous startup continuity from the legacy snapshot on the
   * first migration load. IndexedDB then hydrates asynchronously and becomes
   * the temporary laptop authority.
   */
  loadLegacyHistory();
  const hydrationPromise = hydrateFromIndexedDb();

  const api = {
    name: NAME,
    version: VERSION,
    buildId: BUILD_ID,
    schema: SCHEMA,
    providerTypes: PROVIDER_TYPES,
    providerStatuses: PROVIDER_STATUSES,
    capabilityCatalog: CAPABILITY_CATALOG,
    architectureTargets: ARCHITECTURE_TARGETS,

    registerProvider,
    unregisterProvider,
    updateProvider,
    setProviderStatus,
    getProvider,
    listProviders,
    listCapabilities,
    selectProviders,
    planForBrainRequest,
    executeSelection,
    request,
    healthCheck,
    setPolicy,
    getPolicy,
    getHistory,
    clearHistory,
    getStatus,
    getPersistenceStatus,
    flushPersistence,
    whenHydrated: () => hydrationPromise,
    runLaptopPersistenceAcceptanceTest,
    runSelfTest,
    addEventListener,
    removeEventListener
  };

  global.ProviderManager = Object.freeze(api);
  global.MEOSProviderManager = global.ProviderManager;

  console.log(
    `[MEOS] ${NAME} v${VERSION} online. Build ${BUILD_ID}. No external providers are connected until real adapters register.`
  );

  emit("online", getStatus());
  maybeRunVisibleSelfTest();
})(window);
