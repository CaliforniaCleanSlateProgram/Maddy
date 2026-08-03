/**
 * MEOS Resource Discovery Network
 * Version: 1.0.0
 * Build: RDN100-LOCAL-FIRST-20260803-A
 *
 * Mission:
 * Normalize grants and non-grant resources from independent discovery adapters
 * into one authoritative opportunity schema.
 *
 * This file is intentionally standalone. It does not fetch sources itself.
 * Adapters register with this network and return source-native records.
 * The network normalizes, validates, deduplicates, and orders them.
 */

const NAME = "MEOS Resource Discovery Network";
const VERSION = "1.0.0";
const BUILD_ID = "RDN100-LOCAL-FIRST-20260803-A";
const SCHEMA = "meos.resource-discovery-network.v1";

const adapterRegistry = new Map();

const REGION_PRIORITY = Object.freeze({
  local: 1,
  regional: 2,
  california: 3,
  federal: 4,
  national: 5,
  international: 99
});

const RESOURCE_TYPES = Object.freeze([
  "grant",
  "contract",
  "sponsorship",
  "donation",
  "vehicle",
  "equipment",
  "property",
  "facility",
  "land",
  "professional-service",
  "volunteer",
  "partnership",
  "in-kind",
  "other"
]);

function now() {
  return new Date().toISOString();
}

function cleanString(value) {
  return String(value ?? "").trim();
}

function normalizeRegion(value) {
  const normalized = cleanString(value).toLowerCase();

  if (["local", "santa cruz", "santa cruz county"].includes(normalized)) {
    return "local";
  }

  if (
    [
      "regional",
      "monterey bay",
      "central coast",
      "santa cruz regional"
    ].includes(normalized)
  ) {
    return "regional";
  }

  if (["california", "state", "ca"].includes(normalized)) {
    return "california";
  }

  if (["federal", "usa federal", "united states federal"].includes(normalized)) {
    return "federal";
  }

  if (["national", "united states", "usa", "us"].includes(normalized)) {
    return "national";
  }

  if (["international", "global", "foreign"].includes(normalized)) {
    return "international";
  }

  return "national";
}

function normalizeResourceType(value) {
  const normalized = cleanString(value).toLowerCase();

  if (RESOURCE_TYPES.includes(normalized)) {
    return normalized;
  }

  if (/grant|award|funding/.test(normalized)) return "grant";
  if (/contract|rfp|procurement/.test(normalized)) return "contract";
  if (/sponsor/.test(normalized)) return "sponsorship";
  if (/vehicle|truck|van|trailer/.test(normalized)) return "vehicle";
  if (/equipment|technology|hardware/.test(normalized)) return "equipment";
  if (/property|building|facility/.test(normalized)) return "property";
  if (/land/.test(normalized)) return "land";
  if (/service|consulting|legal|accounting/.test(normalized)) {
    return "professional-service";
  }
  if (/volunteer/.test(normalized)) return "volunteer";
  if (/partner/.test(normalized)) return "partnership";
  if (/in kind|in-kind/.test(normalized)) return "in-kind";
  if (/donation|donor/.test(normalized)) return "donation";

  return "other";
}

function parseAmount(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const numeric = Number(
    String(value)
      .replace(/[$,\s]/g, "")
      .match(/-?\d+(?:\.\d+)?/)?.[0]
  );

  return Number.isFinite(numeric) ? numeric : null;
}

function parseDeadline(value) {
  if (!value) {
    return {
      raw: null,
      iso: null,
      verified: false
    };
  }

  const timestamp = Date.parse(value);

  return {
    raw: value,
    iso: Number.isFinite(timestamp)
      ? new Date(timestamp).toISOString()
      : null,
    verified: Number.isFinite(timestamp)
  };
}

function buildFingerprint(record) {
  const title = cleanString(record.title).toLowerCase();
  const source = cleanString(record.source?.name).toLowerCase();
  const deadline = cleanString(record.deadline?.iso);
  const amount = cleanString(record.resourceValue?.maximum);

  return [title, source, deadline, amount].join("|");
}

function normalizeOpportunity(raw = {}, adapter = {}) {
  const sourceName = cleanString(
    raw.sourceName ||
      raw.provider ||
      raw.agencyName ||
      adapter.name ||
      adapter.id ||
      "Unknown source"
  );

  const region = normalizeRegion(
    raw.region ||
      raw.scope ||
      raw.geography ||
      adapter.region ||
      "national"
  );

  const resourceType = normalizeResourceType(
    raw.resourceType ||
      raw.type ||
      raw.channel ||
      raw.category ||
      "other"
  );

  const title = cleanString(
    raw.title ||
      raw.name ||
      raw.opportunityTitle ||
      "Untitled opportunity"
  );

  const description = cleanString(
    raw.description ||
      raw.summary ||
      raw.synopsis ||
      raw.details ||
      ""
  );

  const deadline = parseDeadline(
    raw.deadline ||
      raw.closeDate ||
      raw.closingDate ||
      raw.applicationDeadline
  );

  const minimum = parseAmount(
    raw.awardFloor ||
      raw.minimumAmount ||
      raw.minimum ||
      raw.resourceValue?.minimum
  );

  const maximum = parseAmount(
    raw.awardCeiling ||
      raw.maximumAmount ||
      raw.maximum ||
      raw.amount ||
      raw.resourceValue?.maximum
  );

  const normalized = {
    schema: "meos.resource-opportunity.v1",
    normalizedAt: now(),
    id: cleanString(
      raw.id ||
        raw.opportunityId ||
        raw.noticeId ||
        raw.url ||
        `${adapter.id || "source"}:${title}`
    ),
    title,
    description,
    resourceType,
    region,
    regionPriority: REGION_PRIORITY[region],
    source: {
      adapterId: cleanString(adapter.id || "unregistered"),
      name: sourceName,
      url: cleanString(raw.url || raw.sourceUrl || raw.link || "")
    },
    resourceValue: {
      minimum,
      maximum,
      currency: cleanString(
        raw.currency ||
          raw.resourceValue?.currency ||
          "USD"
      ),
      nonCash: !["grant", "contract", "sponsorship", "donation"].includes(
        resourceType
      )
    },
    deadline,
    eligibility: {
      raw: raw.eligibleApplicants || raw.eligibility || null,
      verified: Boolean(
        raw.eligibilityVerified ||
          raw.eligibleApplicantsVerified
      )
    },
    geography: cleanString(raw.geography || raw.location || region),
    original: raw
  };

  return {
    ...normalized,
    fingerprint: buildFingerprint(normalized)
  };
}

function validateAdapter(adapter = {}) {
  if (!adapter || typeof adapter !== "object") {
    throw new TypeError("Adapter must be an object.");
  }

  if (!cleanString(adapter.id)) {
    throw new Error("Adapter id is required.");
  }

  if (!cleanString(adapter.name)) {
    throw new Error("Adapter name is required.");
  }

  if (typeof adapter.discover !== "function") {
    throw new Error("Adapter discover() function is required.");
  }

  return {
    ...adapter,
    id: cleanString(adapter.id),
    name: cleanString(adapter.name),
    region: normalizeRegion(adapter.region || "national"),
    resourceTypes: Array.isArray(adapter.resourceTypes)
      ? adapter.resourceTypes.map(normalizeResourceType)
      : ["other"]
  };
}

function registerAdapter(adapter) {
  const valid = validateAdapter(adapter);

  if (adapterRegistry.has(valid.id)) {
    throw new Error(`Adapter already registered: ${valid.id}`);
  }

  adapterRegistry.set(valid.id, Object.freeze(valid));

  return {
    registered: true,
    id: valid.id,
    name: valid.name,
    region: valid.region
  };
}

function unregisterAdapter(adapterId) {
  return adapterRegistry.delete(cleanString(adapterId));
}

function listAdapters() {
  return [...adapterRegistry.values()]
    .map(adapter => ({
      id: adapter.id,
      name: adapter.name,
      region: adapter.region,
      resourceTypes: [...adapter.resourceTypes]
    }))
    .sort(
      (left, right) =>
        REGION_PRIORITY[left.region] -
          REGION_PRIORITY[right.region] ||
        left.name.localeCompare(right.name)
    );
}

function deduplicate(records = []) {
  const seen = new Set();
  const unique = [];

  for (const record of records) {
    if (!record?.fingerprint || seen.has(record.fingerprint)) {
      continue;
    }

    seen.add(record.fingerprint);
    unique.push(record);
  }

  return unique;
}

function sortOpportunities(records = []) {
  return [...records].sort((left, right) => {
    const regionDifference =
      Number(left.regionPriority || 99) -
      Number(right.regionPriority || 99);

    if (regionDifference !== 0) {
      return regionDifference;
    }

    const leftDeadline = left.deadline?.iso
      ? Date.parse(left.deadline.iso)
      : Number.MAX_SAFE_INTEGER;

    const rightDeadline = right.deadline?.iso
      ? Date.parse(right.deadline.iso)
      : Number.MAX_SAFE_INTEGER;

    if (leftDeadline !== rightDeadline) {
      return leftDeadline - rightDeadline;
    }

    const leftValue = Number(left.resourceValue?.maximum || 0);
    const rightValue = Number(right.resourceValue?.maximum || 0);

    return rightValue - leftValue;
  });
}

async function runAdapter(adapter, context = {}) {
  const result = await adapter.discover({
    ...context,
    adapter: {
      id: adapter.id,
      name: adapter.name,
      region: adapter.region
    }
  });

  const rawRecords = Array.isArray(result)
    ? result
    : Array.isArray(result?.records)
      ? result.records
      : [];

  return {
    adapter: {
      id: adapter.id,
      name: adapter.name,
      region: adapter.region
    },
    records: rawRecords.map(record =>
      normalizeOpportunity(record, adapter)
    )
  };
}

async function discoverAll(options = {}) {
  const allowInternational = options.allowInternational === true;
  const adapterIds = Array.isArray(options.adapterIds)
    ? new Set(options.adapterIds.map(cleanString))
    : null;

  const selected = [...adapterRegistry.values()].filter(adapter => {
    if (adapterIds && !adapterIds.has(adapter.id)) {
      return false;
    }

    if (
      adapter.region === "international" &&
      !allowInternational
    ) {
      return false;
    }

    return true;
  });

  const runs = [];
  const failures = [];

  for (const adapter of selected) {
    try {
      runs.push(await runAdapter(adapter, options.context || {}));
    } catch (error) {
      failures.push({
        adapterId: adapter.id,
        message: error?.message || String(error)
      });
    }
  }

  const records = sortOpportunities(
    deduplicate(runs.flatMap(run => run.records))
  );

  return {
    schema: "meos.resource-discovery-run.v1",
    version: VERSION,
    buildId: BUILD_ID,
    completedAt: now(),
    adapterCount: selected.length,
    successfulAdapters: runs.length,
    failedAdapters: failures.length,
    failures,
    total: records.length,
    records
  };
}

function clearAdapters() {
  adapterRegistry.clear();
}

async function runAcceptanceTest() {
  clearAdapters();

  registerAdapter({
    id: "local-santa-cruz-foundation",
    name: "Santa Cruz Community Foundation",
    region: "local",
    resourceTypes: ["grant"],
    discover: async () => [
      {
        id: "local-1",
        title: "Santa Cruz Nonprofit Operating Support",
        description:
          "General operating support for Santa Cruz County nonprofit organizations.",
        resourceType: "grant",
        amount: 50000,
        deadline: "2026-09-01",
        eligibleApplicants: ["501(c)(3) nonprofits"]
      }
    ]
  });

  registerAdapter({
    id: "california-equipment",
    name: "California Equipment Donation Network",
    region: "california",
    resourceTypes: ["equipment", "vehicle"],
    discover: async () => [
      {
        id: "ca-1",
        title: "Mobile Service Vehicle Donation",
        description:
          "Vehicle donation for California community organizations.",
        resourceType: "vehicle",
        deadline: "2026-10-01"
      }
    ]
  });

  registerAdapter({
    id: "federal-grants",
    name: "Federal Grants",
    region: "federal",
    resourceTypes: ["grant"],
    discover: async () => [
      {
        id: "fed-1",
        title: "Federal Community Services Grant",
        description:
          "Federal funding for community service organizations.",
        resourceType: "grant",
        amount: 250000,
        deadline: "2026-08-20"
      }
    ]
  });

  registerAdapter({
    id: "international-test",
    name: "International Test Source",
    region: "international",
    resourceTypes: ["grant"],
    discover: async () => [
      {
        id: "intl-1",
        title: "International Program",
        resourceType: "grant",
        amount: 1000000
      }
    ]
  });

  const defaultRun = await discoverAll();
  const internationalRun = await discoverAll({
    allowInternational: true
  });

  const checks = [
    {
      name: "Local source is prioritized first",
      passed: defaultRun.records[0]?.region === "local"
    },
    {
      name: "Grants and non-cash resources normalize together",
      passed:
        defaultRun.records.some(
          record => record.resourceType === "grant"
        ) &&
        defaultRun.records.some(
          record => record.resourceType === "vehicle"
        )
    },
    {
      name: "International source is excluded by default",
      passed:
        !defaultRun.records.some(
          record => record.region === "international"
        )
    },
    {
      name: "International source can be explicitly enabled",
      passed:
        internationalRun.records.some(
          record => record.region === "international"
        )
    },
    {
      name: "Every result uses one opportunity schema",
      passed: defaultRun.records.every(
        record =>
          record.schema === "meos.resource-opportunity.v1"
      )
    }
  ];

  clearAdapters();

  return {
    success: checks.every(check => check.passed),
    passed: checks.filter(check => check.passed).length,
    total: checks.length,
    checks
  };
}

const ResourceDiscoveryNetwork = Object.freeze({
  name: NAME,
  version: VERSION,
  buildId: BUILD_ID,
  schema: SCHEMA,
  regionPriority: REGION_PRIORITY,
  resourceTypes: RESOURCE_TYPES,
  registerAdapter,
  unregisterAdapter,
  listAdapters,
  normalizeOpportunity,
  discoverAll,
  clearAdapters,
  runAcceptanceTest
});

export { ResourceDiscoveryNetwork };
export default ResourceDiscoveryNetwork;
