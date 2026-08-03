/**
 * MEOS Local CSR Discovery Adapter
 * Version: 1.0.0
 * Build: LCSR100-LOCAL-CORPORATE-RESOURCE-20260803-A
 *
 * Mission:
 * Discover local Corporate Social Responsibility and community-investment
 * acquisition channels without reducing CSR to corporate grants alone.
 *
 * Supported resources include:
 * - corporate and foundation grants;
 * - sponsorships;
 * - employee matching gifts;
 * - payroll giving;
 * - employee volunteer programs;
 * - skilled and pro bono services;
 * - donated vehicles, equipment, technology, supplies, facilities, and space;
 * - workforce and community partnerships;
 * - cause-marketing and community-investment opportunities.
 */

import ResourceDiscoveryNetwork from "./resource-discovery-network.js";

const NAME = "MEOS Local CSR Discovery Adapter";
const VERSION = "1.0.0";
const BUILD_ID = "LCSR100-LOCAL-CORPORATE-RESOURCE-20260803-A";
const ADAPTER_ID = "local-csr-discovery";
const REGION = "local";

const CSR_CHANNELS = Object.freeze([
  "corporate-grant",
  "corporate-foundation",
  "community-investment",
  "sponsorship",
  "matching-gift",
  "payroll-giving",
  "employee-volunteer",
  "skilled-volunteer",
  "pro-bono-service",
  "cause-marketing",
  "vehicle-donation",
  "equipment-donation",
  "technology-donation",
  "supply-donation",
  "facility-space",
  "workforce-partnership",
  "institutional-partnership",
  "other-in-kind"
]);

const DEFAULT_GEOGRAPHY = Object.freeze({
  currentOperatingAreas: ["Santa Cruz County, California"],
  includeRegionalEmployers: true,
  expansionStrategy: {
    direction: [
      "North along the California coast toward Oregon",
      "South along the California coast toward San Diego"
    ],
    activateExpansionAreasOnlyWhenAuthorized: true
  }
});

const DEFAULT_SECTOR_CATALOG = Object.freeze([
  {
    id: "healthcare-community-benefit",
    name: "Local Healthcare Community Benefit and CSR",
    sector: "healthcare",
    csrChannels: [
      "community-investment",
      "corporate-grant",
      "employee-volunteer",
      "supply-donation",
      "workforce-partnership",
      "institutional-partnership"
    ],
    resourceTypes: [
      "grant",
      "donation",
      "volunteer",
      "partnership",
      "in-kind"
    ],
    rationale:
      "Healthcare systems may support community health, outreach, prevention, recovery, workforce, and in-kind service capacity."
  },
  {
    id: "financial-institution-community-reinvestment",
    name: "Local Financial Institution Community Investment",
    sector: "financial-services",
    csrChannels: [
      "community-investment",
      "corporate-grant",
      "matching-gift",
      "payroll-giving",
      "employee-volunteer",
      "financial-literacy-partnership",
      "sponsorship"
    ],
    resourceTypes: [
      "grant",
      "sponsorship",
      "donation",
      "volunteer",
      "partnership"
    ],
    rationale:
      "Banks and credit unions may provide community investment, sponsorships, employee giving, volunteer support, and financial-capability partnerships."
  },
  {
    id: "utility-and-infrastructure-community-programs",
    name: "Local Utility and Infrastructure CSR",
    sector: "utilities-infrastructure",
    csrChannels: [
      "community-investment",
      "corporate-grant",
      "equipment-donation",
      "technology-donation",
      "employee-volunteer",
      "sponsorship",
      "other-in-kind"
    ],
    resourceTypes: [
      "grant",
      "equipment",
      "technology",
      "volunteer",
      "sponsorship",
      "in-kind"
    ],
    rationale:
      "Utilities and infrastructure companies may support resilience, equipment, technology, community safety, environmental protection, and volunteer initiatives."
  },
  {
    id: "retail-grocery-hospitality-giving",
    name: "Local Retail, Grocery, and Hospitality Giving",
    sector: "retail-hospitality",
    csrChannels: [
      "sponsorship",
      "cause-marketing",
      "matching-gift",
      "payroll-giving",
      "employee-volunteer",
      "supply-donation",
      "facility-space",
      "other-in-kind"
    ],
    resourceTypes: [
      "sponsorship",
      "donation",
      "volunteer",
      "facility",
      "in-kind",
      "partnership"
    ],
    rationale:
      "Retail, grocery, food-service, lodging, and hospitality employers may provide sponsorships, supplies, space, employee giving, and cause-marketing support."
  },
  {
    id: "technology-and-professional-services",
    name: "Local Technology and Professional Services CSR",
    sector: "technology-professional-services",
    csrChannels: [
      "technology-donation",
      "pro-bono-service",
      "skilled-volunteer",
      "matching-gift",
      "employee-volunteer",
      "community-investment",
      "institutional-partnership"
    ],
    resourceTypes: [
      "technology",
      "professional-service",
      "volunteer",
      "donation",
      "partnership",
      "in-kind"
    ],
    rationale:
      "Technology, legal, accounting, communications, engineering, and other professional firms may provide software, hardware, skilled volunteers, and pro bono services."
  },
  {
    id: "construction-automotive-logistics",
    name: "Local Construction, Automotive, and Logistics CSR",
    sector: "construction-automotive-logistics",
    csrChannels: [
      "vehicle-donation",
      "equipment-donation",
      "supply-donation",
      "pro-bono-service",
      "skilled-volunteer",
      "sponsorship",
      "workforce-partnership"
    ],
    resourceTypes: [
      "vehicle",
      "equipment",
      "donation",
      "professional-service",
      "volunteer",
      "sponsorship",
      "partnership",
      "in-kind"
    ],
    rationale:
      "Construction, automotive, transportation, and logistics firms may provide vehicles, equipment, materials, repairs, skilled labor, and workforce partnerships."
  },
  {
    id: "major-local-employer-csr",
    name: "Major Local Employer CSR and Employee Engagement",
    sector: "cross-sector-employers",
    csrChannels: [
      "corporate-grant",
      "community-investment",
      "matching-gift",
      "payroll-giving",
      "employee-volunteer",
      "skilled-volunteer",
      "sponsorship",
      "cause-marketing"
    ],
    resourceTypes: [
      "grant",
      "donation",
      "volunteer",
      "sponsorship",
      "professional-service",
      "partnership"
    ],
    rationale:
      "Major employers may support local nonprofits through formal CSR programs, employee engagement, matching gifts, sponsorships, and community investment."
  }
]);

function now() {
  return new Date().toISOString();
}

function clean(value) {
  return String(value ?? "").trim();
}

function uniqueStrings(values = []) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function normalizeGeography(profile = {}) {
  const currentOperatingAreas = uniqueStrings(
    profile.currentOperatingAreas ||
      profile.activeServiceAreas ||
      DEFAULT_GEOGRAPHY.currentOperatingAreas
  );

  const expansion = profile.expansionStrategy || {};

  return {
    currentOperatingAreas,
    includeRegionalEmployers:
      profile.includeRegionalEmployers !== false,
    expansionStrategy: {
      direction: uniqueStrings(
        expansion.direction ||
          DEFAULT_GEOGRAPHY.expansionStrategy.direction
      ),
      activateExpansionAreasOnlyWhenAuthorized:
        expansion.activateExpansionAreasOnlyWhenAuthorized !== false
    }
  };
}

function normalizeOrganizationRecord(record = {}) {
  const csrChannels = uniqueStrings(
    record.csrChannels ||
      record.channels ||
      []
  );

  const resourceTypes = uniqueStrings(
    record.resourceTypes ||
      record.resources ||
      []
  );

  return {
    id: clean(
      record.id ||
        record.organizationId ||
        record.name
    ),
    name: clean(
      record.name ||
        record.organizationName ||
        "Unnamed corporate prospect"
    ),
    sector: clean(record.sector || "cross-sector"),
    geography: uniqueStrings(
      record.geography ||
        record.serviceAreas ||
        []
    ),
    csrChannels,
    resourceTypes,
    programUrl: clean(
      record.programUrl ||
        record.csrUrl ||
        record.communityGivingUrl ||
        ""
    ),
    contactUrl: clean(
      record.contactUrl ||
        record.organizationUrl ||
        ""
    ),
    eligibilityNotes: clean(
      record.eligibilityNotes ||
        record.notes ||
        ""
    ),
    evidence: clean(
      record.evidence ||
        record.rationale ||
        ""
    )
  };
}

function sectorToOpportunity(
  sector,
  geographyProfile
) {
  const channels = uniqueStrings(
    sector.csrChannels || []
  );

  const resourceTypes = uniqueStrings(
    sector.resourceTypes || []
  );

  return {
    id: `local-csr-sector:${sector.id}`,
    title: sector.name,
    description: sector.rationale,
    sourceName: sector.name,
    provider: sector.name,
    resourceType:
      resourceTypes.length === 1
        ? resourceTypes[0]
        : "partnership",
    resourceChannels: resourceTypes,
    csrChannels: channels,
    region: REGION,
    geography:
      geographyProfile.currentOperatingAreas.join(", "),
    sourceType: "csr-sector-channel",
    discoveryStatus: "prospect-sector-identified",
    eligibilityVerified: false,
    nextDiscoveryAction:
      "Identify local and regional organizations in this sector, verify active CSR or community-investment programs, and capture official evidence, contacts, deadlines, and application paths.",
    raw: {
      sector,
      geographyProfile
    }
  };
}

function organizationToOpportunity(
  record,
  geographyProfile
) {
  const organization =
    normalizeOrganizationRecord(record);

  return {
    id: `local-csr-org:${organization.id}`,
    title: organization.name,
    description:
      organization.evidence ||
      organization.eligibilityNotes ||
      "Corporate social responsibility or community-investment prospect.",
    sourceName: organization.name,
    provider: organization.name,
    resourceType:
      organization.resourceTypes.length === 1
        ? organization.resourceTypes[0]
        : "partnership",
    resourceChannels:
      organization.resourceTypes,
    csrChannels:
      organization.csrChannels,
    region: REGION,
    geography:
      organization.geography.length
        ? organization.geography.join(", ")
        : geographyProfile.currentOperatingAreas.join(", "),
    sourceType: "csr-organization-prospect",
    url:
      organization.programUrl ||
      organization.contactUrl,
    discoveryStatus:
      organization.programUrl
        ? "official-program-identified"
        : "organization-prospect-identified",
    eligibilityVerified: false,
    nextDiscoveryAction:
      organization.programUrl
        ? "Review the official CSR or community-investment program, verify nonprofit eligibility, local geographic fit, resource types, cycle, deadline, and contact path."
        : "Locate and verify the organization's official CSR, community-investment, employee-giving, sponsorship, or in-kind program.",
    raw: {
      organization,
      geographyProfile
    }
  };
}

async function discover({
  geographyProfile = DEFAULT_GEOGRAPHY,
  sectorCatalog = DEFAULT_SECTOR_CATALOG,
  organizationRecords = []
} = {}) {
  const profile =
    normalizeGeography(geographyProfile);

  const sectorOpportunities =
    sectorCatalog.map(sector =>
      sectorToOpportunity(sector, profile)
    );

  const organizationOpportunities =
    organizationRecords.map(record =>
      organizationToOpportunity(
        record,
        profile
      )
    );

  return [
    ...organizationOpportunities,
    ...sectorOpportunities
  ];
}

const adapter = Object.freeze({
  id: ADAPTER_ID,
  name: NAME,
  version: VERSION,
  buildId: BUILD_ID,
  region: REGION,
  resourceTypes: [
    "grant",
    "sponsorship",
    "donation",
    "vehicle",
    "equipment",
    "technology",
    "facility",
    "professional-service",
    "volunteer",
    "partnership",
    "in-kind"
  ],
  discover
});

function register(
  network = ResourceDiscoveryNetwork
) {
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
  ResourceDiscoveryNetwork.clearAdapters();
  register();

  const fixtureOrganizations = [
    {
      id: "fixture-local-company",
      name: "Fixture Local Company",
      sector: "technology",
      geography: [
        "Santa Cruz County, California"
      ],
      csrChannels: [
        "matching-gift",
        "employee-volunteer",
        "technology-donation",
        "pro-bono-service"
      ],
      resourceTypes: [
        "technology",
        "professional-service",
        "volunteer"
      ],
      programUrl:
        "https://example.org/community-impact",
      evidence:
        "Fixture official CSR program."
    }
  ];

  const run =
    await ResourceDiscoveryNetwork.discoverAll({
      adapterIds: [ADAPTER_ID],
      context: {
        geographyProfile:
          DEFAULT_GEOGRAPHY,
        organizationRecords:
          fixtureOrganizations
      }
    });

  const records = run.records || [];

  const fixture = records.find(record =>
    record.title ===
      "Fixture Local Company"
  );

  const automotive = records.find(record =>
    record.title.includes(
      "Construction, Automotive"
    )
  );

  const healthcare = records.find(record =>
    record.title.includes(
      "Healthcare Community Benefit"
    )
  );

  const checks = [
    {
      name:
        "Adapter registers with Resource Discovery Network",
      passed:
        ResourceDiscoveryNetwork
          .listAdapters()
          .some(
            item =>
              item.id === ADAPTER_ID
          )
    },
    {
      name:
        "Current operating geography is preserved",
      passed:
        DEFAULT_GEOGRAPHY
          .currentOperatingAreas
          .includes(
            "Santa Cruz County, California"
          )
    },
    {
      name:
        "CSR includes more than corporate grants",
      passed:
        CSR_CHANNELS.includes(
          "matching-gift"
        ) &&
        CSR_CHANNELS.includes(
          "employee-volunteer"
        ) &&
        CSR_CHANNELS.includes(
          "vehicle-donation"
        ) &&
        CSR_CHANNELS.includes(
          "pro-bono-service"
        )
    },
    {
      name:
        "Corporate organization records normalize",
      passed:
        Boolean(fixture) &&
        fixture.schema ===
          "meos.resource-opportunity.v1"
    },
    {
      name:
        "Official CSR program URL is preserved",
      passed:
        fixture?.source?.url ===
          "https://example.org/community-impact"
    },
    {
      name:
        "Vehicle and equipment channels are represented",
      passed:
        Boolean(automotive) &&
        automotive.original
          ?.resourceChannels
          ?.includes("vehicle") &&
        automotive.original
          ?.resourceChannels
          ?.includes("equipment")
    },
    {
      name:
        "Healthcare community-benefit channel is represented",
      passed:
        Boolean(healthcare) &&
        healthcare.original
          ?.csrChannels
          ?.includes(
            "community-investment"
          )
    },
    {
      name:
        "All records remain local and normalized",
      passed:
        records.length > 0 &&
        records.every(
          record =>
            record.region === "local" &&
            record.schema ===
              "meos.resource-opportunity.v1"
        )
    }
  ];

  ResourceDiscoveryNetwork.clearAdapters();

  return {
    success:
      checks.every(check => check.passed),
    passed:
      checks.filter(check => check.passed)
        .length,
    total: checks.length,
    checks,
    geography: DEFAULT_GEOGRAPHY,
    sectors:
      DEFAULT_SECTOR_CATALOG.length,
    testedAt: now()
  };
}

const LocalCSRDiscoveryAdapter =
  Object.freeze({
    name: NAME,
    version: VERSION,
    buildId: BUILD_ID,
    id: ADAPTER_ID,
    region: REGION,
    csrChannels: CSR_CHANNELS,
    defaultGeography:
      DEFAULT_GEOGRAPHY,
    defaultSectorCatalog:
      DEFAULT_SECTOR_CATALOG,
    adapter,
    register,
    normalizeGeography,
    normalizeOrganizationRecord,
    discover,
    runAcceptanceTest
  });

export { LocalCSRDiscoveryAdapter };
export default LocalCSRDiscoveryAdapter;
