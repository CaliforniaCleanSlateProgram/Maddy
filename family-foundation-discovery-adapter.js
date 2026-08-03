/**
 * MEOS Family Foundation Discovery Adapter
 * Version: 1.0.0
 * Build: FFDA100-LOCAL-FAMILY-FOUNDATION-20260803-A
 *
 * Mission:
 * Discover and normalize local and regional family/private foundation
 * acquisition channels, beginning with the organization's current operating
 * geography and expanding outward only when authorized.
 *
 * The adapter supports:
 * - open and invitation-only opportunities;
 * - letters of inquiry;
 * - relationship-based philanthropy;
 * - general operating support;
 * - capital and equipment support;
 * - vehicle and facility support;
 * - program grants;
 * - capacity building;
 * - human-services and recovery funding;
 * - watershed, beachfront, ocean, and coastal stewardship support.
 */

import ResourceDiscoveryNetwork from "./resource-discovery-network.js";

const NAME = "MEOS Family Foundation Discovery Adapter";
const VERSION = "1.0.0";
const BUILD_ID = "FFDA100-LOCAL-FAMILY-FOUNDATION-20260803-A";
const ADAPTER_ID = "family-foundation-discovery";
const REGION = "local";

const FOUNDATION_CHANNELS = Object.freeze([
  "open-application",
  "invitation-only",
  "letter-of-inquiry",
  "relationship-development",
  "general-operating-support",
  "program-support",
  "capital-support",
  "equipment-support",
  "vehicle-support",
  "facility-support",
  "capacity-building",
  "matching-support",
  "challenge-grant",
  "technical-assistance",
  "other-in-kind"
]);

const MISSION_DOMAINS = Object.freeze([
  "mobile-hygiene",
  "human-dignity",
  "homelessness-outreach",
  "community-stabilization",
  "recovery-navigation",
  "sober-living",
  "employment-self-sufficiency",
  "watershed-protection",
  "beachfront-stewardship",
  "ocean-stewardship",
  "coastal-stewardship"
]);

const DEFAULT_GEOGRAPHY = Object.freeze({
  currentOperatingAreas: ["Santa Cruz County, California"],
  regionalPriorityAreas: [
    "Monterey County, California",
    "San Benito County, California",
    "Santa Clara County, California",
    "San Mateo County, California"
  ],
  expansionStrategy: {
    direction: [
      "North along the California coast toward Oregon",
      "South along the California coast toward San Diego"
    ],
    activateExpansionAreasOnlyWhenAuthorized: true
  }
});

const DEFAULT_DISCOVERY_CATALOG = Object.freeze([
  {
    id: "local-family-foundation-prospecting",
    name: "Santa Cruz County Family Foundation Prospecting",
    foundationType: "family-foundation",
    geography: ["Santa Cruz County, California"],
    foundationChannels: [
      "open-application",
      "invitation-only",
      "letter-of-inquiry",
      "relationship-development",
      "general-operating-support",
      "program-support",
      "capital-support",
      "equipment-support",
      "vehicle-support",
      "facility-support",
      "capacity-building"
    ],
    resourceTypes: [
      "grant",
      "donation",
      "vehicle",
      "equipment",
      "facility",
      "professional-service",
      "partnership",
      "in-kind"
    ],
    missionDomains: [...MISSION_DOMAINS],
    evidence:
      "Mandatory local prospecting channel for family and private foundations serving Santa Cruz County.",
    discoveryStatus: "prospecting-required"
  },
  {
    id: "regional-family-foundation-prospecting",
    name: "Monterey Bay and Adjacent Counties Family Foundation Prospecting",
    foundationType: "family-foundation",
    geography: [
      "Monterey County, California",
      "San Benito County, California",
      "Santa Clara County, California",
      "San Mateo County, California"
    ],
    foundationChannels: [
      "open-application",
      "invitation-only",
      "letter-of-inquiry",
      "relationship-development",
      "program-support",
      "capital-support",
      "capacity-building"
    ],
    resourceTypes: [
      "grant",
      "donation",
      "equipment",
      "professional-service",
      "partnership",
      "in-kind"
    ],
    missionDomains: [...MISSION_DOMAINS],
    evidence:
      "Regional family and private foundation prospecting channel for adjacent counties.",
    discoveryStatus: "prospecting-required"
  }
]);

function now() {
  return new Date().toISOString();
}

function clean(value) {
  return String(value ?? "").trim();
}

function uniqueStrings(values = []) {
  return [...new Set((values || []).map(clean).filter(Boolean))];
}

function normalizeGeography(profile = {}) {
  const currentOperatingAreas = uniqueStrings(
    profile.currentOperatingAreas ||
      profile.activeServiceAreas ||
      DEFAULT_GEOGRAPHY.currentOperatingAreas
  );

  const regionalPriorityAreas = uniqueStrings(
    profile.regionalPriorityAreas ||
      DEFAULT_GEOGRAPHY.regionalPriorityAreas
  );

  const expansion = profile.expansionStrategy || {};

  return {
    currentOperatingAreas,
    regionalPriorityAreas,
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

function normalizeFoundation(record = {}) {
  return {
    id: clean(record.id || record.foundationId || record.name),
    name: clean(
      record.name ||
        record.foundationName ||
        "Unnamed family foundation"
    ),
    foundationType: clean(
      record.foundationType ||
        record.type ||
        "family-foundation"
    ),
    geography: uniqueStrings(
      record.geography ||
        record.serviceAreas ||
        []
    ),
    foundationChannels: uniqueStrings(
      record.foundationChannels ||
        record.channels ||
        []
    ),
    resourceTypes: uniqueStrings(
      record.resourceTypes ||
        record.resources ||
        ["grant"]
    ),
    missionDomains: uniqueStrings(
      record.missionDomains ||
        record.focusAreas ||
        []
    ),
    organizationUrl: clean(
      record.organizationUrl ||
        record.website ||
        ""
    ),
    opportunityUrl: clean(
      record.opportunityUrl ||
        record.applicationUrl ||
        record.grantsUrl ||
        ""
    ),
    contactUrl: clean(
      record.contactUrl ||
        ""
    ),
    applicationMethod: clean(
      record.applicationMethod ||
        record.accessMethod ||
        ""
    ),
    nonprofitAgeRequirement: clean(
      record.nonprofitAgeRequirement ||
        ""
    ),
    financialHistoryRequirement: clean(
      record.financialHistoryRequirement ||
        ""
    ),
    invitationOnly:
      record.invitationOnly === true ||
      uniqueStrings(
        record.foundationChannels ||
          record.channels ||
          []
      ).includes("invitation-only"),
    eligibilityNotes: clean(
      record.eligibilityNotes ||
        record.notes ||
        ""
    ),
    evidence: clean(
      record.evidence ||
        record.description ||
        ""
    ),
    discoveryStatus: clean(
      record.discoveryStatus ||
        "foundation-prospect-identified"
    )
  };
}

function determinePriority(
  foundation,
  geographyProfile
) {
  const sourceAreas = foundation.geography || [];
  const current = geographyProfile.currentOperatingAreas || [];
  const regional = geographyProfile.regionalPriorityAreas || [];

  const matches = (areas) =>
    sourceAreas.some(sourceArea =>
      areas.some(area => {
        const left = clean(sourceArea).toLowerCase();
        const right = clean(area).toLowerCase();

        return left.includes(right) || right.includes(left);
      })
    );

  if (matches(current)) return "current-local";
  if (matches(regional)) return "nearby-regional";
  return "future-expansion";
}

function determineNextAction(foundation) {
  if (foundation.invitationOnly) {
    return "Identify trustees, staff, advisors, grantees, local connectors, and relationship pathways before requesting an introduction or invitation.";
  }

  if (foundation.opportunityUrl) {
    return "Review the official opportunity page and verify current cycle, geography, nonprofit age, financial history, mission fit, award range, deadline, and application method.";
  }

  if (foundation.organizationUrl) {
    return "Investigate the official foundation website, giving history, IRS filings, current grantees, geographic focus, contact path, and whether a letter of inquiry is accepted.";
  }

  return "Identify specific family and private foundations in this geography, verify official evidence and giving history, and record relationship or application paths.";
}

function foundationToOpportunity(
  record,
  geographyProfile
) {
  const foundation = normalizeFoundation(record);
  const priority = determinePriority(
    foundation,
    geographyProfile
  );

  return {
    id: `family-foundation:${foundation.id}`,
    title: foundation.name,
    description:
      foundation.evidence ||
      "Family or private foundation acquisition channel.",
    sourceName: foundation.name,
    provider: foundation.name,
    resourceType:
      foundation.resourceTypes.length === 1
        ? foundation.resourceTypes[0]
        : "partnership",
    resourceChannels: foundation.resourceTypes,
    foundationChannels:
      foundation.foundationChannels,
    missionDomains: foundation.missionDomains,
    region: REGION,
    geography:
      foundation.geography.length
        ? foundation.geography.join(", ")
        : geographyProfile.currentOperatingAreas.join(", "),
    sourceType: foundation.foundationType,
    url:
      foundation.opportunityUrl ||
      foundation.organizationUrl ||
      foundation.contactUrl,
    localPriority: priority,
    invitationOnly: foundation.invitationOnly,
    applicationMethod: foundation.applicationMethod,
    nonprofitAgeRequirement:
      foundation.nonprofitAgeRequirement,
    financialHistoryRequirement:
      foundation.financialHistoryRequirement,
    discoveryStatus: foundation.discoveryStatus,
    eligibilityVerified: false,
    nextDiscoveryAction:
      determineNextAction(foundation),
    raw: {
      foundation,
      geographyProfile
    }
  };
}

function selectFoundations({
  foundationCatalog = DEFAULT_DISCOVERY_CATALOG,
  foundationRecords = [],
  geographyProfile = DEFAULT_GEOGRAPHY,
  includeRegional = true,
  includeFutureExpansion = false
} = {}) {
  const profile = normalizeGeography(geographyProfile);

  return [
    ...foundationRecords,
    ...foundationCatalog
  ]
    .map(normalizeFoundation)
    .map(foundation => ({
      ...foundation,
      localPriority:
        determinePriority(foundation, profile)
    }))
    .filter(foundation => {
      if (foundation.localPriority === "current-local") {
        return true;
      }

      if (
        foundation.localPriority === "nearby-regional" &&
        includeRegional
      ) {
        return true;
      }

      return includeFutureExpansion;
    })
    .sort((left, right) => {
      const rank = {
        "current-local": 1,
        "nearby-regional": 2,
        "future-expansion": 3
      };

      return (
        rank[left.localPriority] -
          rank[right.localPriority] ||
        clean(left.name).localeCompare(clean(right.name))
      );
    });
}

async function discover({
  geographyProfile = DEFAULT_GEOGRAPHY,
  foundationCatalog = DEFAULT_DISCOVERY_CATALOG,
  foundationRecords = [],
  includeRegional = true,
  includeFutureExpansion = false
} = {}) {
  const profile = normalizeGeography(geographyProfile);

  return selectFoundations({
    foundationCatalog,
    foundationRecords,
    geographyProfile: profile,
    includeRegional,
    includeFutureExpansion
  }).map(record =>
    foundationToOpportunity(record, profile)
  );
}

const adapter = Object.freeze({
  id: ADAPTER_ID,
  name: NAME,
  version: VERSION,
  buildId: BUILD_ID,
  region: REGION,
  resourceTypes: [
    "grant",
    "donation",
    "vehicle",
    "equipment",
    "facility",
    "professional-service",
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

  const fixtureRecords = [
    {
      id: "fixture-local-family-foundation",
      name: "Fixture Local Family Foundation",
      foundationType: "family-foundation",
      geography: ["Santa Cruz County, California"],
      foundationChannels: [
        "invitation-only",
        "relationship-development",
        "general-operating-support",
        "vehicle-support"
      ],
      resourceTypes: [
        "grant",
        "vehicle",
        "partnership"
      ],
      missionDomains: [
        "mobile-hygiene",
        "human-dignity",
        "coastal-stewardship"
      ],
      organizationUrl:
        "https://example.org/foundation",
      invitationOnly: true,
      evidence:
        "Fixture family foundation supporting local services."
    },
    {
      id: "fixture-regional-family-foundation",
      name: "Fixture Regional Family Foundation",
      foundationType: "private-foundation",
      geography: ["Monterey County, California"],
      foundationChannels: [
        "letter-of-inquiry",
        "program-support"
      ],
      resourceTypes: ["grant"],
      missionDomains: [
        "recovery-navigation"
      ]
    },
    {
      id: "fixture-future-foundation",
      name: "Fixture Future Expansion Foundation",
      geography: ["San Diego County, California"],
      foundationChannels: ["open-application"],
      resourceTypes: ["grant"],
      missionDomains: ["coastal-stewardship"]
    }
  ];

  const run =
    await ResourceDiscoveryNetwork.discoverAll({
      adapterIds: [ADAPTER_ID],
      context: {
        geographyProfile: DEFAULT_GEOGRAPHY,
        foundationRecords: fixtureRecords,
        includeRegional: true,
        includeFutureExpansion: false
      }
    });

  const records = run.records || [];

  const local = records.find(
    record =>
      record.title ===
      "Fixture Local Family Foundation"
  );

  const regional = records.find(
    record =>
      record.title ===
      "Fixture Regional Family Foundation"
  );

  const future = records.find(
    record =>
      record.title ===
      "Fixture Future Expansion Foundation"
  );

  const checks = [
    {
      name:
        "Adapter registers with Resource Discovery Network",
      passed:
        ResourceDiscoveryNetwork
          .listAdapters()
          .some(item => item.id === ADAPTER_ID)
    },
    {
      name:
        "Santa Cruz County is current-local priority",
      passed:
        local?.original?.localPriority ===
        "current-local"
    },
    {
      name:
        "Nearby counties are regional priority",
      passed:
        regional?.original?.localPriority ===
        "nearby-regional"
    },
    {
      name:
        "Future expansion remains inactive by default",
      passed: !future
    },
    {
      name:
        "Invitation-only foundations are preserved",
      passed:
        local?.original?.invitationOnly === true &&
        local?.original?.foundationChannels?.includes(
          "invitation-only"
        )
    },
    {
      name:
        "Relationship-based next action is assigned",
      passed:
        local?.original?.nextDiscoveryAction
          ?.includes("trustees")
    },
    {
      name:
        "Vehicle and non-grant support are preserved",
      passed:
        local?.original?.resourceChannels?.includes(
          "vehicle"
        ) &&
        local?.original?.resourceChannels?.includes(
          "partnership"
        )
    },
    {
      name:
        "Human services and coastal domains coexist",
      passed:
        local?.original?.missionDomains?.includes(
          "human-dignity"
        ) &&
        local?.original?.missionDomains?.includes(
          "coastal-stewardship"
        )
    },
    {
      name:
        "All records normalize into one opportunity schema",
      passed:
        records.length > 0 &&
        records.every(
          record =>
            record.schema ===
              "meos.resource-opportunity.v1" &&
            record.region === "local"
        )
    },
    {
      name:
        "Local records rank before regional records",
      passed:
        records.findIndex(
          record =>
            record.title ===
            "Fixture Local Family Foundation"
        ) <
        records.findIndex(
          record =>
            record.title ===
            "Fixture Regional Family Foundation"
        )
    }
  ];

  ResourceDiscoveryNetwork.clearAdapters();

  return {
    success:
      checks.every(check => check.passed),
    passed:
      checks.filter(check => check.passed).length,
    total: checks.length,
    checks,
    geography: DEFAULT_GEOGRAPHY,
    foundationChannels:
      FOUNDATION_CHANNELS,
    missionDomains: MISSION_DOMAINS,
    testedAt: now()
  };
}

const FamilyFoundationDiscoveryAdapter =
  Object.freeze({
    name: NAME,
    version: VERSION,
    buildId: BUILD_ID,
    id: ADAPTER_ID,
    region: REGION,
    foundationChannels:
      FOUNDATION_CHANNELS,
    missionDomains:
      MISSION_DOMAINS,
    defaultGeography:
      DEFAULT_GEOGRAPHY,
    defaultDiscoveryCatalog:
      DEFAULT_DISCOVERY_CATALOG,
    adapter,
    register,
    normalizeGeography,
    normalizeFoundation,
    selectFoundations,
    discover,
    runAcceptanceTest
  });

export {
  FamilyFoundationDiscoveryAdapter
};

export default
  FamilyFoundationDiscoveryAdapter;
