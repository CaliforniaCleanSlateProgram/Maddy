/**
 * MEOS Local Resource Discovery Adapter
 * Version: 1.0.0
 * Build: LRDA100-LOCAL-OUTWARD-20260803-A
 *
 * Mission:
 * Discover local grants and resource channels using the organization's current
 * operating geography, while preserving planned outward expansion for later
 * prioritization.
 *
 * This adapter is not limited to grants. It supports philanthropy, government
 * funding, corporate giving, sponsorships, donated assets, professional
 * services, volunteers, and partnerships.
 */

import ResourceDiscoveryNetwork from "./resource-discovery-network.js";

const NAME = "MEOS Local Resource Discovery Adapter";
const VERSION = "1.0.1";
const BUILD_ID = "LRDA101-COUNTY-CONTAINMENT-20260807-A";
const ADAPTER_ID = "local-resource-discovery";
const REGION = "local";

const DEFAULT_GEOGRAPHY = Object.freeze({
  currentOperatingAreas: ["Santa Cruz County, California"],
  expansionStrategy: {
    direction: [
      "North along the California coast toward Oregon",
      "South along the California coast toward San Diego"
    ],
    activateExpansionAreasOnlyWhenAuthorized: true
  }
});

const DEFAULT_SOURCE_CATALOG = Object.freeze([
  {
    id: "community-foundation-santa-cruz-county",
    name: "Community Foundation Santa Cruz County",
    sourceType: "community-foundation",
    resourceTypes: ["grant", "philanthropy", "donation", "partnership"],
    geography: ["Santa Cruz County, California"],
    opportunityUrl: "https://www.cfscc.org/grant-opportunities",
    organizationUrl: "https://www.cfscc.org/",
    evidence:
      "Local community foundation grant opportunities and nonprofit resources."
  },
  {
    id: "city-of-santa-cruz-childrens-fund",
    name: "City of Santa Cruz Children's Fund",
    sourceType: "local-government",
    resourceTypes: ["grant"],
    geography: ["City of Santa Cruz, California"],
    opportunityUrl:
      "https://www.cityofsantacruz.com/government/city-departments/parks-recreation/youth-programs/children-s-fund",
    organizationUrl: "https://www.cityofsantacruz.com/",
    evidence:
      "Local municipal funding channel. Program-specific eligibility must be verified before pursuit."
  },
  {
    id: "santa-cruz-county-government-funding",
    name: "County of Santa Cruz Funding Opportunities",
    sourceType: "county-government",
    resourceTypes: ["grant", "contract", "partnership"],
    geography: ["Santa Cruz County, California"],
    opportunityUrl: "https://www.santacruzcountyca.gov/",
    organizationUrl: "https://www.santacruzcountyca.gov/",
    evidence:
      "County funding, procurement, partnership, and public-benefit opportunities."
  },
  {
    id: "local-business-community-giving",
    name: "Santa Cruz County Business and Community Giving",
    sourceType: "local-business",
    resourceTypes: [
      "sponsorship",
      "donation",
      "vehicle",
      "equipment",
      "professional-service",
      "volunteer",
      "partnership",
      "in-kind"
    ],
    geography: ["Santa Cruz County, California"],
    opportunityUrl: null,
    organizationUrl: null,
    evidence:
      "Local business, civic, faith, healthcare, education, and community resource channel."
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

function geographyPriority(source = {}, geographyProfile = {}) {
  const active = geographyProfile.currentOperatingAreas || [];
  const sourceAreas = source.geography || [];

  const isCurrent = sourceAreas.some(area =>
    active.some(activeArea => {
      const sourceArea = clean(area).toLowerCase();
      const operatingArea = clean(activeArea).toLowerCase();

      if (
        sourceArea.includes(operatingArea) ||
        operatingArea.includes(sourceArea)
      ) {
        return true;
      }

      // A named city inside the commissioned county service area is local.
      // Example: "City of Santa Cruz, California" belongs to the active
      // "Santa Cruz County, California" operating footprint.
      const countyMatch = operatingArea.match(
        /^(.+?)\s+county(?:,|$)/
      );
      if (countyMatch) {
        const countyBase = countyMatch[1].trim();
        const sourceLocality = sourceArea
          .replace(/^(?:city|town|village)\s+of\s+/, "")
          .split(",")[0]
          .trim();
        if (sourceLocality === countyBase) return true;
      }

      return false;
    })
  );

  return isCurrent ? "current-local" : "future-expansion";
}

function sourceToOpportunity(source, geographyProfile) {
  const priority = geographyPriority(source, geographyProfile);
  const resourceTypes = Array.isArray(source.resourceTypes)
    ? source.resourceTypes
    : ["other"];

  return {
    id: `local-source:${source.id}`,
    title: source.name,
    description: source.evidence,
    sourceName: source.name,
    provider: source.name,
    resourceType:
      resourceTypes.length === 1
        ? resourceTypes[0]
        : "partnership",
    resourceChannels: resourceTypes,
    region: REGION,
    geography: source.geography?.join(", ") || "Local",
    url: source.opportunityUrl || source.organizationUrl || "",
    sourceType: source.sourceType,
    localPriority: priority,
    eligibilityVerified: false,
    discoveryStatus: "source-identified",
    nextDiscoveryAction:
      source.opportunityUrl
        ? "Investigate the official opportunity page for current cycles, eligibility, deadlines, and application requirements."
        : "Identify the current local organizations and contacts within this acquisition channel.",
    raw: {
      source,
      geographyProfile
    }
  };
}

function selectSources({
  sourceCatalog = DEFAULT_SOURCE_CATALOG,
  geographyProfile = DEFAULT_GEOGRAPHY,
  includeFutureExpansion = false
} = {}) {
  const profile = normalizeGeography(geographyProfile);

  return sourceCatalog
    .map(source => ({
      ...source,
      localPriority: geographyPriority(source, profile)
    }))
    .filter(
      source =>
        includeFutureExpansion ||
        source.localPriority === "current-local"
    )
    .sort((left, right) => {
      const leftPriority =
        left.localPriority === "current-local" ? 1 : 2;
      const rightPriority =
        right.localPriority === "current-local" ? 1 : 2;

      return (
        leftPriority - rightPriority ||
        clean(left.name).localeCompare(clean(right.name))
      );
    });
}

async function discover({
  geographyProfile = DEFAULT_GEOGRAPHY,
  sourceCatalog = DEFAULT_SOURCE_CATALOG,
  includeFutureExpansion = false
} = {}) {
  const profile = normalizeGeography(geographyProfile);

  return selectSources({
    sourceCatalog,
    geographyProfile: profile,
    includeFutureExpansion
  }).map(source => sourceToOpportunity(source, profile));
}

const adapter = Object.freeze({
  id: ADAPTER_ID,
  name: NAME,
  version: VERSION,
  buildId: BUILD_ID,
  region: REGION,
  resourceTypes: [
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
    "in-kind"
  ],
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
  ResourceDiscoveryNetwork.clearAdapters();
  register();

  const run = await ResourceDiscoveryNetwork.discoverAll({
    adapterIds: [ADAPTER_ID],
    context: {
      geographyProfile: DEFAULT_GEOGRAPHY
    }
  });

  const records = run.records || [];
  const foundation = records.find(record =>
    record.title.includes(
      "Community Foundation Santa Cruz County"
    )
  );
  const businessChannel = records.find(record =>
    record.title.includes(
      "Business and Community Giving"
    )
  );
  const cityChildrensFund = records.find(record =>
    record.title.includes(
      "City of Santa Cruz Children's Fund"
    )
  );

  const checks = [
    {
      name: "Adapter registers with Resource Discovery Network",
      passed:
        ResourceDiscoveryNetwork
          .listAdapters()
          .some(item => item.id === ADAPTER_ID)
    },
    {
      name: "Current operating area is Santa Cruz County",
      passed:
        DEFAULT_GEOGRAPHY.currentOperatingAreas.includes(
          "Santa Cruz County, California"
        )
    },
    {
      name: "North and south coastal expansion is preserved",
      passed:
        DEFAULT_GEOGRAPHY.expansionStrategy.direction.some(
          value => value.includes("Oregon")
        ) &&
        DEFAULT_GEOGRAPHY.expansionStrategy.direction.some(
          value => value.includes("San Diego")
        )
    },
    {
      name: "Community foundation channel is discovered",
      passed:
        Boolean(foundation) &&
        foundation.region === "local"
    },
    {
      name: "City of Santa Cruz is treated as inside the active Santa Cruz County service area",
      passed:
        Boolean(cityChildrensFund) &&
        cityChildrensFund.original?.localPriority ===
          "current-local"
    },
    {
      name: "Discovery is broader than grants",
      passed:
        Boolean(businessChannel) &&
        Array.isArray(
          businessChannel.original?.resourceChannels
        ) &&
        businessChannel.original.resourceChannels.includes(
          "vehicle"
        ) &&
        businessChannel.original.resourceChannels.includes(
          "professional-service"
        )
    },
    {
      name: "Every source is normalized into one opportunity schema",
      passed:
        records.length > 0 &&
        records.every(
          record =>
            record.schema ===
            "meos.resource-opportunity.v1"
        )
    },
    {
      name: "Future expansion remains inactive by default",
      passed:
        records.every(
          record =>
            record.original?.localPriority ===
            "current-local"
        )
    }
  ];

  ResourceDiscoveryNetwork.clearAdapters();

  return {
    success: checks.every(check => check.passed),
    passed: checks.filter(check => check.passed).length,
    total: checks.length,
    checks,
    geography: DEFAULT_GEOGRAPHY,
    discoveredSources: records.length,
    testedAt: now()
  };
}

const LocalResourceDiscoveryAdapter = Object.freeze({
  name: NAME,
  version: VERSION,
  buildId: BUILD_ID,
  id: ADAPTER_ID,
  region: REGION,
  defaultGeography: DEFAULT_GEOGRAPHY,
  defaultSourceCatalog: DEFAULT_SOURCE_CATALOG,
  adapter,
  register,
  normalizeGeography,
  selectSources,
  discover,
  runAcceptanceTest
});

export { LocalResourceDiscoveryAdapter };
export default LocalResourceDiscoveryAdapter;
