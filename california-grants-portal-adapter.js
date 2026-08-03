/**
 * MEOS California Grants Portal Adapter
 * Version: 1.0.0
 * Build: CGPA100-STATE-DISCOVERY-20260803-A
 *
 * Uses the California Open Data CKAN datastore API and normalizes source
 * records through the MEOS Resource Discovery Network.
 */

import ResourceDiscoveryNetwork from "./resource-discovery-network.js";

const NAME = "California Grants Portal Adapter";
const VERSION = "1.0.0";
const BUILD_ID = "CGPA100-STATE-DISCOVERY-20260803-A";
const ADAPTER_ID = "california-grants-portal";
const REGION = "california";

const DEFAULT_RESOURCE_ID =
  "111c8c88-21f6-453c-ae2c-b4785a0624f5";

const DEFAULT_API_BASE =
  "https://data.ca.gov/api/3/action/datastore_search";

function clean(value) {
  return String(value ?? "").trim();
}

function first(record, keys, fallback = null) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && clean(value) !== "") {
      return value;
    }
  }

  return fallback;
}

function parseList(value) {
  if (Array.isArray(value)) {
    return value.map(clean).filter(Boolean);
  }

  const text = clean(value);
  if (!text) return [];

  return text
    .split(/\s*[|;,]\s*/)
    .map(clean)
    .filter(Boolean);
}

function buildPortalUrl(record) {
  return clean(
    first(record, [
      "Grant URL",
      "GrantURL",
      "Grant Url",
      "Website",
      "URL",
      "More Information URL",
      "More Information"
    ])
  );
}

function mapRecord(record = {}) {
  const title = clean(
    first(record, [
      "Grant Title",
      "GrantTitle",
      "Title",
      "Opportunity Title",
      "Program Name"
    ], "Untitled California grant")
  );

  const description = clean(
    first(record, [
      "Grant Description",
      "GrantDescription",
      "Description",
      "Purpose",
      "Summary",
      "Details"
    ], "")
  );

  const agencyName = clean(
    first(record, [
      "Agency",
      "Agency Name",
      "Department",
      "Grantmaking Agency",
      "Organization"
    ], "State of California")
  );

  const deadline = first(record, [
    "Application Deadline",
    "ApplicationDeadline",
    "Deadline",
    "Closing Date",
    "Close Date"
  ]);

  const openingDate = first(record, [
    "Open Date",
    "Opening Date",
    "Application Open Date"
  ]);

  const awardFloor = first(record, [
    "Estimated Available Funds",
    "Minimum Award",
    "Award Floor",
    "Minimum Amount"
  ]);

  const awardCeiling = first(record, [
    "Estimated Award Amount",
    "Maximum Award",
    "Award Ceiling",
    "Maximum Amount",
    "Total Estimated Available Funds"
  ]);

  const eligibleApplicants = parseList(
    first(record, [
      "Eligible Applicants",
      "Applicant Type",
      "Applicant Types",
      "Eligibility",
      "Eligible Applicant Type(s)"
    ], "")
  );

  const categories = parseList(
    first(record, [
      "Categories",
      "Category",
      "Grant Categories",
      "Topics"
    ], "")
  );

  const counties = parseList(
    first(record, [
      "Counties",
      "County",
      "Eligible Counties",
      "Geographic Eligibility"
    ], "")
  );

  return {
    id: clean(
      first(record, [
        "_id",
        "Grant ID",
        "GrantID",
        "Opportunity ID",
        "ID"
      ], `${agencyName}:${title}`)
    ),
    title,
    description,
    sourceName: agencyName,
    provider: agencyName,
    resourceType: "grant",
    region: REGION,
    geography:
      counties.length > 0
        ? counties.join(", ")
        : "California",
    eligibleApplicants,
    categories,
    awardFloor,
    awardCeiling,
    deadline,
    openingDate,
    url: buildPortalUrl(record),
    eligibilityVerified: eligibleApplicants.length > 0,
    raw: record
  };
}

function buildApiUrl({
  apiBase = DEFAULT_API_BASE,
  resourceId = DEFAULT_RESOURCE_ID,
  limit = 100,
  offset = 0,
  filters = null,
  query = ""
} = {}) {
  const url = new URL(apiBase);

  url.searchParams.set("resource_id", resourceId);
  url.searchParams.set("limit", String(Math.max(1, Math.min(1000, Number(limit) || 100))));
  url.searchParams.set("offset", String(Math.max(0, Number(offset) || 0)));

  if (filters && typeof filters === "object") {
    url.searchParams.set("filters", JSON.stringify(filters));
  }

  if (clean(query)) {
    url.searchParams.set("q", clean(query));
  }

  return url.toString();
}

async function fetchPage({
  fetchImpl = globalThis.fetch,
  apiBase = DEFAULT_API_BASE,
  resourceId = DEFAULT_RESOURCE_ID,
  limit = 100,
  offset = 0,
  filters = null,
  query = ""
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required.");
  }

  const url = buildApiUrl({
    apiBase,
    resourceId,
    limit,
    offset,
    filters,
    query
  });

  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(
      `California Grants Portal API returned HTTP ${response.status}.`
    );
  }

  const payload = await response.json();

  if (payload?.success !== true || !payload?.result) {
    throw new Error(
      "California Grants Portal API returned an invalid CKAN response."
    );
  }

  return {
    total: Number(payload.result.total || 0),
    records: Array.isArray(payload.result.records)
      ? payload.result.records
      : [],
    url
  };
}

async function discover({
  fetchImpl = globalThis.fetch,
  apiBase = DEFAULT_API_BASE,
  resourceId = DEFAULT_RESOURCE_ID,
  pageSize = 100,
  maxRecords = 500,
  filters = null,
  query = ""
} = {}) {
  const safePageSize = Math.max(
    1,
    Math.min(1000, Number(pageSize) || 100)
  );

  const safeMaxRecords = Math.max(
    1,
    Math.min(5000, Number(maxRecords) || 500)
  );

  const rawRecords = [];
  let offset = 0;
  let total = null;

  while (
    rawRecords.length < safeMaxRecords &&
    (total === null || offset < total)
  ) {
    const page = await fetchPage({
      fetchImpl,
      apiBase,
      resourceId,
      limit: Math.min(
        safePageSize,
        safeMaxRecords - rawRecords.length
      ),
      offset,
      filters,
      query
    });

    if (total === null) {
      total = page.total;
    }

    rawRecords.push(...page.records);

    if (page.records.length === 0) {
      break;
    }

    offset += page.records.length;
  }

  return rawRecords
    .slice(0, safeMaxRecords)
    .map(mapRecord);
}

const adapter = Object.freeze({
  id: ADAPTER_ID,
  name: NAME,
  version: VERSION,
  buildId: BUILD_ID,
  region: REGION,
  resourceTypes: ["grant"],
  discover
});

function register(network = ResourceDiscoveryNetwork) {
  const existing = network
    .listAdapters()
    .find(item => item.id === ADAPTER_ID);

  if (existing) {
    return {
      registered: true,
      alreadyRegistered: true,
      id: ADAPTER_ID
    };
  }

  return network.registerAdapter(adapter);
}

async function runAcceptanceTest() {
  const fixtureRecords = [
    {
      _id: 1,
      "Grant Title": "California Nonprofit Operating Support",
      "Grant Description":
        "General operating support for California nonprofit organizations.",
      Agency: "California State Library",
      "Eligible Applicants": "Nonprofit Organizations|Public Agencies",
      "Maximum Award": "$250,000",
      "Application Deadline": "2026-09-15",
      Counties: "Santa Cruz|Monterey",
      "Grant URL": "https://example.ca.gov/grant-one"
    },
    {
      _id: 2,
      Title: "Mobile Services Equipment Grant",
      Description:
        "Equipment funding for California community organizations.",
      Department: "California Department of Community Services",
      "Applicant Types": "Nonprofit Organizations",
      "Award Ceiling": "100000",
      Deadline: "2026-08-30",
      County: "Statewide"
    }
  ];

  const calls = [];

  const mockFetch = async url => {
    calls.push(url);

    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        result: {
          total: fixtureRecords.length,
          records: fixtureRecords
        }
      })
    };
  };

  ResourceDiscoveryNetwork.clearAdapters();
  register();

  const run = await ResourceDiscoveryNetwork.discoverAll({
    adapterIds: [ADAPTER_ID],
    context: {
      fetchImpl: mockFetch,
      maxRecords: 10
    }
  });

  const operatingSupport = run.records.find(
    record =>
      record.title ===
      "California Nonprofit Operating Support"
  );

  const mobileEquipment = run.records.find(
    record =>
      record.title ===
      "Mobile Services Equipment Grant"
  );

  const checks = [
    {
      name: "Adapter registers with the discovery network",
      passed:
        ResourceDiscoveryNetwork
          .listAdapters()
          .some(item => item.id === ADAPTER_ID)
    },
    {
      name: "Official CKAN API URL is constructed",
      passed:
        calls.length === 1 &&
        calls[0].includes("resource_id=") &&
        calls[0].includes(
          encodeURIComponent(DEFAULT_RESOURCE_ID)
        )
    },
    {
      name: "California records normalize into one schema",
      passed:
        run.total === 2 &&
        run.records.every(
          record =>
            record.schema ===
            "meos.resource-opportunity.v1"
        )
    },
    {
      name: "Applicant eligibility is preserved",
      passed:
        Array.isArray(
          operatingSupport?.original?.eligibleApplicants
        ) &&
        operatingSupport.original.eligibleApplicants.includes(
          "Nonprofit Organizations"
        )
    },
    {
      name: "Award amount and deadline are normalized",
      passed:
        operatingSupport?.resourceValue?.maximum === 250000 &&
        Boolean(operatingSupport?.deadline?.iso)
    },
    {
      name: "All opportunities are classified as California grants",
      passed:
        [operatingSupport, mobileEquipment].every(
          record =>
            record?.region === "california" &&
            record?.resourceType === "grant"
        )
    }
  ];

  ResourceDiscoveryNetwork.clearAdapters();

  return {
    success: checks.every(check => check.passed),
    passed: checks.filter(check => check.passed).length,
    total: checks.length,
    checks
  };
}

const CaliforniaGrantsPortalAdapter = Object.freeze({
  name: NAME,
  version: VERSION,
  buildId: BUILD_ID,
  id: ADAPTER_ID,
  region: REGION,
  resourceId: DEFAULT_RESOURCE_ID,
  apiBase: DEFAULT_API_BASE,
  adapter,
  register,
  mapRecord,
  buildApiUrl,
  fetchPage,
  discover,
  runAcceptanceTest
});

export { CaliforniaGrantsPortalAdapter };
export default CaliforniaGrantsPortalAdapter;
