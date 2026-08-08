/**
 * MEOS Institutional Repository Authority
 *
 * Version: 1.0.0
 * Commission: 006.017D1
 * Build: IRA100-PROVIDER-NEUTRAL-MEMORY-FABRIC-20260808-A
 *
 * Purpose:
 * - Give MEOS one provider-neutral authority for durable organizational state.
 * - Classify state by consequence instead of treating every byte as equal.
 * - Select a qualified durable provider from runtime capabilities.
 * - Perform write -> read -> semantic verification before reporting success.
 * - Make degraded durability explicit rather than silently pretending a local
 *   cache is institutional truth.
 *
 * This module contains NO Google, Microsoft, AWS, Render, browser, or customer-
 * specific storage semantics. Providers register runtime capabilities through
 * a small contract. MEOS Core reasons about authority, durability, evidence,
 * classification, verification, and continuity.
 */

import crypto from "crypto";

const VERSION = "1.0.0";
const COMMISSION = "006.017D1";
const BUILD_ID =
  "IRA100-PROVIDER-NEUTRAL-MEMORY-FABRIC-20260808-A";

const SCHEMA = Object.freeze({
  status: "meos.institutional-repository-authority.status.v1",
  record: "meos.institutional-repository-authority.record.v1",
  writeResult: "meos.institutional-repository-authority.write-result.v1",
  readResult: "meos.institutional-repository-authority.read-result.v1",
  deleteResult: "meos.institutional-repository-authority.delete-result.v1",
  acceptance:
    "meos.institutional-repository-authority.acceptance.v1"
});

const MEMORY_CLASSES = Object.freeze({
  EPHEMERAL: "ephemeral",
  WORKING: "working",
  OPERATIONAL: "operational",
  INSTITUTIONAL: "institutional",
  EVIDENTIARY: "evidentiary",
  CONSTITUTIONAL: "constitutional"
});

const MEMORY_CLASS_POLICY = Object.freeze({
  [MEMORY_CLASSES.EPHEMERAL]: Object.freeze({
    durableRequired: false,
    verificationRequired: false,
    immutableEvidence: false,
    cacheAllowed: true,
    defaultRetention: "session"
  }),
  [MEMORY_CLASSES.WORKING]: Object.freeze({
    durableRequired: false,
    verificationRequired: false,
    immutableEvidence: false,
    cacheAllowed: true,
    defaultRetention: "bounded"
  }),
  [MEMORY_CLASSES.OPERATIONAL]: Object.freeze({
    durableRequired: true,
    verificationRequired: true,
    immutableEvidence: false,
    cacheAllowed: true,
    defaultRetention: "until-terminal-plus-history"
  }),
  [MEMORY_CLASSES.INSTITUTIONAL]: Object.freeze({
    durableRequired: true,
    verificationRequired: true,
    immutableEvidence: false,
    cacheAllowed: true,
    defaultRetention: "institutional"
  }),
  [MEMORY_CLASSES.EVIDENTIARY]: Object.freeze({
    durableRequired: true,
    verificationRequired: true,
    immutableEvidence: true,
    cacheAllowed: true,
    defaultRetention: "evidentiary"
  }),
  [MEMORY_CLASSES.CONSTITUTIONAL]: Object.freeze({
    durableRequired: true,
    verificationRequired: true,
    immutableEvidence: true,
    cacheAllowed: true,
    defaultRetention: "constitutional-versioned"
  })
});

const CAPABILITY = Object.freeze({
  DURABLE_READ: "durable-read",
  DURABLE_WRITE: "durable-write",
  DURABLE_DELETE: "durable-delete",
  READ_AFTER_WRITE: "read-after-write",
  ORGANIZATION_OWNED: "organization-owned",
  VERSIONED: "versioned",
  IMMUTABLE: "immutable"
});

function nowIso() {
  return new Date().toISOString();
}

function stableNormalize(value) {
  if (value === null || typeof value !== "object") {
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "undefined") return null;
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(stableNormalize);
  }

  return Object.keys(value)
    .sort()
    .reduce((accumulator, key) => {
      accumulator[key] = stableNormalize(value[key]);
      return accumulator;
    }, {});
}

function stableStringify(value) {
  return JSON.stringify(stableNormalize(value));
}

function fingerprint(value) {
  return crypto
    .createHash("sha256")
    .update(stableStringify(value))
    .digest("hex");
}

function normalizeIdentifier(value, label) {
  const normalized = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    const error = new Error(`${label} is required.`);
    error.code = "MEOS_REPOSITORY_IDENTIFIER_REQUIRED";
    error.status = 400;
    throw error;
  }

  return normalized.slice(0, 180);
}

function normalizeClassification(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!Object.values(MEMORY_CLASSES).includes(normalized)) {
    const error = new Error(
      `Unsupported MEOS memory classification "${normalized || value}".`
    );
    error.code = "MEOS_REPOSITORY_CLASSIFICATION_INVALID";
    error.status = 400;
    error.details = {
      allowed: Object.values(MEMORY_CLASSES)
    };
    throw error;
  }

  return normalized;
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function normalizeCapabilities(value) {
  const capabilities = Array.isArray(value)
    ? value
    : value instanceof Set
      ? [...value]
      : [];

  return [...new Set(
    capabilities
      .map(item => String(item || "").trim())
      .filter(Boolean)
  )];
}

function validateProvider(provider = {}) {
  const id = normalizeIdentifier(provider.id, "Repository provider id");
  const capabilities = normalizeCapabilities(provider.capabilities);

  if (typeof provider.read !== "function") {
    throw new TypeError(`Repository provider "${id}" must implement read().`);
  }

  if (typeof provider.write !== "function") {
    throw new TypeError(`Repository provider "${id}" must implement write().`);
  }

  return {
    id,
    name: String(provider.name || id).trim() || id,
    priority: Number.isFinite(Number(provider.priority))
      ? Number(provider.priority)
      : 0,
    capabilities,
    health:
      typeof provider.health === "function"
        ? provider.health
        : async () => ({
            available: true,
            durable:
              capabilities.includes(CAPABILITY.DURABLE_READ) &&
              capabilities.includes(CAPABILITY.DURABLE_WRITE)
          }),
    read: provider.read,
    write: provider.write,
    delete:
      typeof provider.delete === "function"
        ? provider.delete
        : null,
    metadata:
      provider.metadata &&
      typeof provider.metadata === "object"
        ? clone(provider.metadata)
        : {}
  };
}

function requiredCapabilitiesFor(classification, operation) {
  const policy = MEMORY_CLASS_POLICY[classification];
  const required = [];

  if (operation === "read" && policy.durableRequired) {
    required.push(CAPABILITY.DURABLE_READ);
  }

  if (operation === "write" && policy.durableRequired) {
    required.push(
      CAPABILITY.DURABLE_READ,
      CAPABILITY.DURABLE_WRITE,
      CAPABILITY.READ_AFTER_WRITE
    );
  }

  if (
    operation === "delete" &&
    policy.durableRequired
  ) {
    required.push(
      CAPABILITY.DURABLE_READ,
      CAPABILITY.DURABLE_DELETE
    );
  }

  if (
    classification === MEMORY_CLASSES.EVIDENTIARY ||
    classification === MEMORY_CLASSES.CONSTITUTIONAL
  ) {
    required.push(CAPABILITY.ORGANIZATION_OWNED);
  }

  return [...new Set(required)];
}

function hasCapabilities(provider, required = []) {
  return required.every(capability =>
    provider.capabilities.includes(capability)
  );
}

class InstitutionalRepositoryAuthority {
  constructor() {
    this.providers = new Map();
    this.events = [];
    this.maximumEvents = 250;
    this.startedAt = nowIso();
    this.lastProviderSelection = null;
    this.lastDurableWriteAt = null;
    this.lastDurableReadAt = null;
    this.lastError = null;
  }

  recordEvent(type, details = {}) {
    this.events.push({
      schema:
        "meos.institutional-repository-authority.event.v1",
      id: `repository-event-${crypto.randomUUID()}`,
      type,
      occurredAt: nowIso(),
      details: clone(details)
    });

    if (this.events.length > this.maximumEvents) {
      this.events.splice(
        0,
        this.events.length - this.maximumEvents
      );
    }
  }

  registerProvider(provider) {
    const normalized = validateProvider(provider);
    this.providers.set(normalized.id, normalized);

    this.recordEvent("provider-registered", {
      providerId: normalized.id,
      priority: normalized.priority,
      capabilities: normalized.capabilities
    });

    return {
      success: true,
      providerId: normalized.id,
      registered: true
    };
  }

  unregisterProvider(providerId) {
    const id = normalizeIdentifier(
      providerId,
      "Repository provider id"
    );
    const removed = this.providers.delete(id);

    if (removed) {
      this.recordEvent("provider-unregistered", {
        providerId: id
      });
    }

    return {
      success: true,
      providerId: id,
      removed
    };
  }

  listProviders() {
    return [...this.providers.values()]
      .map(provider => ({
        id: provider.id,
        name: provider.name,
        priority: provider.priority,
        capabilities: [...provider.capabilities],
        metadata: clone(provider.metadata)
      }))
      .sort((a, b) =>
        b.priority - a.priority ||
        a.id.localeCompare(b.id)
      );
  }

  async inspectProvider(provider) {
    try {
      const health =
        await provider.health();

      return {
        provider,
        health: {
          available:
            health?.available !== false,
          durable:
            health?.durable === true,
          reason:
            health?.reason || null,
          details:
            health?.details || null
        }
      };
    } catch (error) {
      return {
        provider,
        health: {
          available: false,
          durable: false,
          reason:
            error?.message || String(error),
          details: null
        }
      };
    }
  }

  async selectProvider({
    classification,
    operation = "read"
  } = {}) {
    const normalizedClass =
      normalizeClassification(classification);
    const policy =
      MEMORY_CLASS_POLICY[normalizedClass];
    const required =
      requiredCapabilitiesFor(
        normalizedClass,
        operation
      );

    const candidates = [];

    for (const provider of this.providers.values()) {
      if (!hasCapabilities(provider, required)) continue;

      const inspected =
        await this.inspectProvider(provider);

      if (!inspected.health.available) continue;

      if (
        policy.durableRequired &&
        !inspected.health.durable
      ) {
        continue;
      }

      candidates.push(inspected);
    }

    candidates.sort((a, b) =>
      b.provider.priority - a.provider.priority ||
      a.provider.id.localeCompare(b.provider.id)
    );

    const selected = candidates[0] || null;

    this.lastProviderSelection = {
      selectedAt: nowIso(),
      classification: normalizedClass,
      operation,
      requiredCapabilities: required,
      providerId:
        selected?.provider?.id || null,
      candidateCount: candidates.length
    };

    if (!selected) {
      const error = new Error(
        policy.durableRequired
          ? `No healthy durable repository provider satisfies ${normalizedClass} ${operation} authority.`
          : `No repository provider satisfies ${normalizedClass} ${operation}.`
      );
      error.code =
        policy.durableRequired
          ? "MEOS_DURABLE_REPOSITORY_UNAVAILABLE"
          : "MEOS_REPOSITORY_PROVIDER_UNAVAILABLE";
      error.status = 503;
      error.details = {
        classification: normalizedClass,
        operation,
        requiredCapabilities: required,
        registeredProviders: this.listProviders()
      };
      throw error;
    }

    return selected.provider;
  }

  buildRecord({
    namespace,
    key,
    classification,
    value,
    metadata = {},
    revision = 1,
    previousFingerprint = null
  }) {
    const normalizedNamespace =
      normalizeIdentifier(namespace, "Repository namespace");
    const normalizedKey =
      normalizeIdentifier(key, "Repository key");
    const normalizedClass =
      normalizeClassification(classification);
    const policy =
      MEMORY_CLASS_POLICY[normalizedClass];

    const payloadFingerprint =
      fingerprint(value);

    return {
      schema: SCHEMA.record,
      namespace: normalizedNamespace,
      key: normalizedKey,
      classification: normalizedClass,
      policy: {
        durableRequired: policy.durableRequired,
        verificationRequired:
          policy.verificationRequired,
        immutableEvidence:
          policy.immutableEvidence,
        defaultRetention:
          policy.defaultRetention
      },
      revision:
        Math.max(1, Number(revision) || 1),
      previousFingerprint:
        previousFingerprint || null,
      payloadFingerprint,
      recordedAt: nowIso(),
      metadata:
        metadata &&
        typeof metadata === "object"
          ? clone(metadata)
          : {},
      value: clone(value)
    };
  }

  providerKey(namespace, key) {
    return `${normalizeIdentifier(
      namespace,
      "Repository namespace"
    )}:${normalizeIdentifier(
      key,
      "Repository key"
    )}`;
  }

  async read({
    namespace,
    key,
    classification =
      MEMORY_CLASSES.INSTITUTIONAL
  } = {}) {
    const normalizedClass =
      normalizeClassification(classification);
    const provider =
      await this.selectProvider({
        classification: normalizedClass,
        operation: "read"
      });
    const providerKey =
      this.providerKey(namespace, key);

    try {
      const result =
        await provider.read(providerKey);

      if (!result?.found) {
        return {
          schema: SCHEMA.readResult,
          success: true,
          found: false,
          namespace:
            normalizeIdentifier(
              namespace,
              "Repository namespace"
            ),
          key:
            normalizeIdentifier(
              key,
              "Repository key"
            ),
          classification: normalizedClass,
          providerId: provider.id,
          authority:
            MEMORY_CLASS_POLICY[normalizedClass]
              .durableRequired
              ? "durable-institutional-repository"
              : "repository-provider",
          reason:
            result?.reason || "record-not-found"
        };
      }

      const record = result.value;

      if (
        !record ||
        record.schema !== SCHEMA.record
      ) {
        const error = new Error(
          "Repository provider returned an invalid MEOS authority envelope."
        );
        error.code =
          "MEOS_REPOSITORY_ENVELOPE_INVALID";
        error.status = 500;
        throw error;
      }

      const actualFingerprint =
        fingerprint(record.value);

      if (
        actualFingerprint !==
        record.payloadFingerprint
      ) {
        const error = new Error(
          "Repository payload fingerprint verification failed."
        );
        error.code =
          "MEOS_REPOSITORY_FINGERPRINT_MISMATCH";
        error.status = 500;
        error.details = {
          expected:
            record.payloadFingerprint,
          actual:
            actualFingerprint
        };
        throw error;
      }

      if (
        record.classification !==
        normalizedClass
      ) {
        const error = new Error(
          "Repository memory classification mismatch."
        );
        error.code =
          "MEOS_REPOSITORY_CLASSIFICATION_MISMATCH";
        error.status = 409;
        error.details = {
          requested: normalizedClass,
          stored: record.classification
        };
        throw error;
      }

      this.lastDurableReadAt =
        MEMORY_CLASS_POLICY[normalizedClass]
          .durableRequired
          ? nowIso()
          : this.lastDurableReadAt;

      this.lastError = null;
      this.recordEvent("record-read", {
        namespace: record.namespace,
        key: record.key,
        classification: record.classification,
        providerId: provider.id,
        revision: record.revision,
        payloadFingerprint:
          record.payloadFingerprint
      });

      return {
        schema: SCHEMA.readResult,
        success: true,
        found: true,
        providerId: provider.id,
        authority:
          MEMORY_CLASS_POLICY[normalizedClass]
            .durableRequired
            ? "durable-institutional-repository"
            : "repository-provider",
        record: clone(record),
        value: clone(record.value),
        verified: true
      };
    } catch (error) {
      this.lastError = {
        at: nowIso(),
        operation: "read",
        providerId: provider.id,
        code:
          error?.code || "MEOS_REPOSITORY_READ_FAILED",
        message:
          error?.message || String(error)
      };
      throw error;
    }
  }

  async write({
    namespace,
    key,
    classification =
      MEMORY_CLASSES.INSTITUTIONAL,
    value,
    metadata = {},
    expectedPreviousFingerprint = undefined
  } = {}) {
    const normalizedClass =
      normalizeClassification(classification);
    const policy =
      MEMORY_CLASS_POLICY[normalizedClass];
    const provider =
      await this.selectProvider({
        classification: normalizedClass,
        operation: "write"
      });
    const providerKey =
      this.providerKey(namespace, key);

    let previous = null;

    try {
      const previousResult =
        await provider.read(providerKey);

      if (previousResult?.found) {
        previous = previousResult.value;

        if (
          !previous ||
          previous.schema !== SCHEMA.record
        ) {
          const error = new Error(
            "Existing repository record is not a valid MEOS authority envelope."
          );
          error.code =
            "MEOS_REPOSITORY_EXISTING_ENVELOPE_INVALID";
          error.status = 409;
          throw error;
        }

        const previousActualFingerprint =
          fingerprint(previous.value);

        if (
          previousActualFingerprint !==
          previous.payloadFingerprint
        ) {
          const error = new Error(
            "Existing repository record failed fingerprint verification."
          );
          error.code =
            "MEOS_REPOSITORY_EXISTING_FINGERPRINT_MISMATCH";
          error.status = 409;
          throw error;
        }
      }

      if (
        expectedPreviousFingerprint !== undefined &&
        (previous?.payloadFingerprint || null) !==
          (expectedPreviousFingerprint || null)
      ) {
        const error = new Error(
          "Repository write rejected because the durable record changed since the caller last observed it."
        );
        error.code =
          "MEOS_REPOSITORY_CONCURRENCY_CONFLICT";
        error.status = 409;
        error.details = {
          expectedPreviousFingerprint:
            expectedPreviousFingerprint || null,
          actualPreviousFingerprint:
            previous?.payloadFingerprint || null
        };
        throw error;
      }

      /*
       * Evidentiary and constitutional state is never silently replaced.
       * The new record keeps a fingerprint link to the previous accepted
       * durable state so later providers can promote this into full version
       * chains or immutable ledgers without changing the Core API.
       */
      const record =
        this.buildRecord({
          namespace,
          key,
          classification: normalizedClass,
          value,
          metadata,
          revision:
            Number(previous?.revision || 0) + 1,
          previousFingerprint:
            previous?.payloadFingerprint || null
        });

      const writeResult =
        await provider.write(
          providerKey,
          clone(record),
          {
            classification: normalizedClass,
            verificationRequired:
              policy.verificationRequired,
            immutableEvidence:
              policy.immutableEvidence,
            previousFingerprint:
              record.previousFingerprint
          }
        );

      if (writeResult?.success === false) {
        const error = new Error(
          writeResult?.error ||
          "Repository provider reported write failure."
        );
        error.code =
          writeResult?.code ||
          "MEOS_REPOSITORY_PROVIDER_WRITE_FAILED";
        error.status =
          Number(writeResult?.status || 500);
        throw error;
      }

      let verification = {
        required:
          policy.verificationRequired,
        verified: !policy.verificationRequired,
        fingerprint:
          record.payloadFingerprint
      };

      if (policy.verificationRequired) {
        const readBack =
          await provider.read(providerKey);

        const stored =
          readBack?.found
            ? readBack.value
            : null;

        const verified =
          Boolean(stored) &&
          stored.schema === SCHEMA.record &&
          stored.payloadFingerprint ===
            record.payloadFingerprint &&
          fingerprint(stored.value) ===
            record.payloadFingerprint &&
          stableStringify(stored.value) ===
            stableStringify(record.value);

        verification = {
          required: true,
          verified,
          fingerprint:
            record.payloadFingerprint
        };

        if (!verified) {
          const error = new Error(
            "Durable repository write failed read-after-write semantic verification."
          );
          error.code =
            "MEOS_REPOSITORY_DURABLE_VERIFICATION_FAILED";
          error.status = 500;
          error.details = {
            namespace: record.namespace,
            key: record.key,
            providerId: provider.id,
            payloadFingerprint:
              record.payloadFingerprint
          };
          throw error;
        }
      }

      if (policy.durableRequired) {
        this.lastDurableWriteAt = nowIso();
      }

      this.lastError = null;
      this.recordEvent("record-written", {
        namespace: record.namespace,
        key: record.key,
        classification: record.classification,
        providerId: provider.id,
        revision: record.revision,
        previousFingerprint:
          record.previousFingerprint,
        payloadFingerprint:
          record.payloadFingerprint,
        verified:
          verification.verified
      });

      return {
        schema: SCHEMA.writeResult,
        success: true,
        providerId: provider.id,
        authority:
          policy.durableRequired
            ? "durable-institutional-repository"
            : "repository-provider",
        record: clone(record),
        verification,
        providerResult:
          writeResult
            ? clone(writeResult)
            : null
      };
    } catch (error) {
      this.lastError = {
        at: nowIso(),
        operation: "write",
        providerId: provider.id,
        code:
          error?.code ||
          "MEOS_REPOSITORY_WRITE_FAILED",
        message:
          error?.message || String(error)
      };
      throw error;
    }
  }

  async delete({
    namespace,
    key,
    classification =
      MEMORY_CLASSES.WORKING
  } = {}) {
    const normalizedClass =
      normalizeClassification(classification);
    const policy =
      MEMORY_CLASS_POLICY[normalizedClass];

    if (policy.immutableEvidence) {
      const error = new Error(
        `${normalizedClass} records cannot be deleted through ordinary repository authority.`
      );
      error.code =
        "MEOS_REPOSITORY_PROTECTED_RECORD";
      error.status = 409;
      throw error;
    }

    const provider =
      await this.selectProvider({
        classification: normalizedClass,
        operation: "delete"
      });

    if (!provider.delete) {
      const error = new Error(
        `Repository provider "${provider.id}" does not support delete authority.`
      );
      error.code =
        "MEOS_REPOSITORY_DELETE_UNAVAILABLE";
      error.status = 501;
      throw error;
    }

    const providerKey =
      this.providerKey(namespace, key);

    const result =
      await provider.delete(providerKey);

    this.recordEvent("record-deleted", {
      namespace:
        normalizeIdentifier(
          namespace,
          "Repository namespace"
        ),
      key:
        normalizeIdentifier(
          key,
          "Repository key"
        ),
      classification: normalizedClass,
      providerId: provider.id,
      deleted:
        result?.deleted !== false
    });

    return {
      schema: SCHEMA.deleteResult,
      success: result?.success !== false,
      deleted: result?.deleted !== false,
      providerId: provider.id,
      result: clone(result)
    };
  }

  getStatus() {
    const durableProviders =
      this.listProviders().filter(provider =>
        provider.capabilities.includes(
          CAPABILITY.DURABLE_READ
        ) &&
        provider.capabilities.includes(
          CAPABILITY.DURABLE_WRITE
        )
      );

    return {
      schema: SCHEMA.status,
      name:
        "MEOS Institutional Repository Authority",
      version: VERSION,
      commission: COMMISSION,
      buildId: BUILD_ID,
      status:
        durableProviders.length > 0
          ? "provider-registered"
          : "awaiting-durable-provider",
      architecture:
        "provider-neutral-memory-fabric",
      codeAuthority: "github",
      durableStateAuthority:
        "meos-institutional-repository",
      localStorageRole: "legacy-or-ui-only",
      indexedDbRole:
        "cache-offline-continuity-after-migration",
      providerCount: this.providers.size,
      durableProviderCount:
        durableProviders.length,
      providers: this.listProviders(),
      memoryClasses:
        clone(MEMORY_CLASS_POLICY),
      lastProviderSelection:
        clone(this.lastProviderSelection),
      lastDurableWriteAt:
        this.lastDurableWriteAt,
      lastDurableReadAt:
        this.lastDurableReadAt,
      lastError: clone(this.lastError),
      eventCount: this.events.length,
      startedAt: this.startedAt
    };
  }

  listEvents() {
    return clone(this.events);
  }

  async runAcceptanceTest() {
    /*
     * Self-test is isolated. It never registers a production provider and never
     * touches external storage. The mock provider proves Core semantics only.
     */
    const testAuthority =
      new InstitutionalRepositoryAuthority();
    const memory = new Map();

    testAuthority.registerProvider({
      id: "acceptance-durable-provider",
      name: "Acceptance Durable Provider",
      priority: 100,
      capabilities: [
        CAPABILITY.DURABLE_READ,
        CAPABILITY.DURABLE_WRITE,
        CAPABILITY.DURABLE_DELETE,
        CAPABILITY.READ_AFTER_WRITE,
        CAPABILITY.ORGANIZATION_OWNED
      ],
      health: async () => ({
        available: true,
        durable: true
      }),
      read: async key => ({
        success: true,
        found: memory.has(key),
        value:
          memory.has(key)
            ? clone(memory.get(key))
            : null
      }),
      write: async (key, value) => {
        memory.set(key, clone(value));
        return {
          success: true,
          durable: true
        };
      },
      delete: async key => ({
        success: true,
        deleted: memory.delete(key)
      })
    });

    const checks = [];
    const sentinel = {
      mission: "spooky-persistence",
      nested: {
        z: 3,
        a: 1
      },
      values: [3, 2, 1]
    };

    const write =
      await testAuthority.write({
        namespace: "acceptance",
        key: "institutional-state",
        classification:
          MEMORY_CLASSES.INSTITUTIONAL,
        value: sentinel,
        metadata: {
          commission: COMMISSION
        }
      });

    checks.push({
      name:
        "Institutional state selects a durable provider",
      passed:
        write.providerId ===
        "acceptance-durable-provider"
    });

    checks.push({
      name:
        "Durable write requires and passes read-after-write verification",
      passed:
        write.verification.required === true &&
        write.verification.verified === true
    });

    const read =
      await testAuthority.read({
        namespace: "acceptance",
        key: "institutional-state",
        classification:
          MEMORY_CLASSES.INSTITUTIONAL
      });

    checks.push({
      name:
        "Durable read returns semantically identical state",
      passed:
        read.found === true &&
        stableStringify(read.value) ===
          stableStringify(sentinel)
    });

    const firstFingerprint =
      write.record.payloadFingerprint;

    const updated =
      await testAuthority.write({
        namespace: "acceptance",
        key: "institutional-state",
        classification:
          MEMORY_CLASSES.INSTITUTIONAL,
        value: {
          ...sentinel,
          revisionMarker: 2
        },
        expectedPreviousFingerprint:
          firstFingerprint
      });

    checks.push({
      name:
        "Durable updates create a fingerprint-linked revision chain",
      passed:
        updated.record.revision === 2 &&
        updated.record.previousFingerprint ===
          firstFingerprint
    });

    let concurrencyProtected = false;

    try {
      await testAuthority.write({
        namespace: "acceptance",
        key: "institutional-state",
        classification:
          MEMORY_CLASSES.INSTITUTIONAL,
        value: { invalidOverwrite: true },
        expectedPreviousFingerprint:
          "stale-fingerprint"
      });
    } catch (error) {
      concurrencyProtected =
        error?.code ===
        "MEOS_REPOSITORY_CONCURRENCY_CONFLICT";
    }

    checks.push({
      name:
        "Stale writers cannot silently overwrite newer institutional truth",
      passed: concurrencyProtected
    });

    const evidenceWrite =
      await testAuthority.write({
        namespace: "acceptance",
        key: "evidence",
        classification:
          MEMORY_CLASSES.EVIDENTIARY,
        value: {
          source: "official",
          verified: true
        }
      });

    let evidenceProtected = false;

    try {
      await testAuthority.delete({
        namespace: "acceptance",
        key: "evidence",
        classification:
          MEMORY_CLASSES.EVIDENTIARY
      });
    } catch (error) {
      evidenceProtected =
        error?.code ===
        "MEOS_REPOSITORY_PROTECTED_RECORD";
    }

    checks.push({
      name:
        "Evidentiary memory is protected from ordinary deletion",
      passed:
        evidenceWrite.success === true &&
        evidenceProtected
    });

    const noProviderAuthority =
      new InstitutionalRepositoryAuthority();

    let failVisible = false;

    try {
      await noProviderAuthority.write({
        namespace: "acceptance",
        key: "must-not-fake-durability",
        classification:
          MEMORY_CLASSES.OPERATIONAL,
        value: { important: true }
      });
    } catch (error) {
      failVisible =
        error?.code ===
        "MEOS_DURABLE_REPOSITORY_UNAVAILABLE";
    }

    checks.push({
      name:
        "Missing durable authority fails visibly instead of faking success",
      passed: failVisible
    });

    checks.push({
      name:
        "Core repository authority contains no provider-specific storage semantics",
      passed:
        !stableStringify(
          testAuthority.getStatus()
        ).toLowerCase().includes(
          "google"
        ) &&
        !stableStringify(
          testAuthority.getStatus()
        ).toLowerCase().includes(
          "microsoft"
        )
    });

    const passed =
      checks.every(check => check.passed);

    return {
      commission: COMMISSION,
      schema: SCHEMA.acceptance,
      version: VERSION,
      buildId: BUILD_ID,
      passed,
      checks,
      status:
        testAuthority.getStatus()
    };
  }
}

const InstitutionalRepository =
  new InstitutionalRepositoryAuthority();

const API = Object.freeze({
  name:
    "MEOS Institutional Repository Authority",
  version: VERSION,
  commission: COMMISSION,
  buildId: BUILD_ID,
  memoryClasses: MEMORY_CLASSES,
  memoryClassPolicy: MEMORY_CLASS_POLICY,
  capabilities: CAPABILITY,
  registerProvider:
    InstitutionalRepository
      .registerProvider
      .bind(InstitutionalRepository),
  unregisterProvider:
    InstitutionalRepository
      .unregisterProvider
      .bind(InstitutionalRepository),
  listProviders:
    InstitutionalRepository
      .listProviders
      .bind(InstitutionalRepository),
  selectProvider:
    InstitutionalRepository
      .selectProvider
      .bind(InstitutionalRepository),
  write:
    InstitutionalRepository
      .write
      .bind(InstitutionalRepository),
  read:
    InstitutionalRepository
      .read
      .bind(InstitutionalRepository),
  delete:
    InstitutionalRepository
      .delete
      .bind(InstitutionalRepository),
  getStatus:
    InstitutionalRepository
      .getStatus
      .bind(InstitutionalRepository),
  listEvents:
    InstitutionalRepository
      .listEvents
      .bind(InstitutionalRepository),
  runAcceptanceTest:
    InstitutionalRepository
      .runAcceptanceTest
      .bind(InstitutionalRepository)
});

export {
  BUILD_ID,
  CAPABILITY,
  COMMISSION,
  InstitutionalRepositoryAuthority,
  MEMORY_CLASSES,
  MEMORY_CLASS_POLICY,
  VERSION
};

export default API;
