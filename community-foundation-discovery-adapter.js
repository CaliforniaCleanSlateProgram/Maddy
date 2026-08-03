/**
 * MEOS Community Foundation Discovery Adapter
 * Version: 1.0.0
 * Build: CFDA100-LOCAL-FOUNDATION-20260803-A
 *
 * Mission:
 * Discover and normalize community-foundation acquisition channels beginning
 * with the organization's current operating geography and expanding outward
 * only as authorized.
 *
 * Community foundations are treated as more than grantmakers. The adapter
 * supports grants, donor-advised fund pathways, giving circles, capacity
 * building, nonprofit training, technical assistance, convenings, sponsorship,
 * fiscal sponsorship/incubation, and other mission-relevant support.
 *
 * CCSP mission domains include:
 * - human dignity and mobile hygiene;
 * - homelessness outreach and stabilization;
 * - recovery navigation and sober living;
 * - employment and self-sufficiency;
 * - watershed protection;
 * - beachfront, ocean, and coastal stewardship.
 */

import ResourceDiscoveryNetwork from "./resource-discovery-network.js";

const NAME = "MEOS Community Foundation Discovery Adapter";
const VERSION = "1.0.0";
const BUILD_ID = "CFDA100-LOCAL-FOUNDATION-20260803-A";
const ADAPTER_ID = "community-foundation-discovery";
const REGION = "local";

const FOUNDATION_CHANNELS = Object.freeze([
  "competitive-grant",
  "general-operating-support",
  "capacity-building",
  "capital-support",
  "donor-advised-fund",
  "giving-circle",
  "community-initiative",
  "sponsorship",
  "technical-assistance",
  "nonprofit-training",
  "convening",
  "fiscal-sponsorship",
  "incubation",
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
  expansionStrategy: {
    direction: [
      "North along the California coast toward Oregon",
      "South along the California coast toward San Diego"
    ],
    activateExpansionAreasOnlyWhenAuthorized: true
  }
});

const DEFAULT_FOUNDATION_CATALOG = Object.freeze([
  {
    id: "community-foundation-santa-cruz-county",
    name: "Community Foundation Santa Cruz County",
    foundationType: "community-foundation",
    geography: ["Santa Cruz County, California"],
    channels: [
      "competitive-grant",
      "general-operating-support",
      "capacity-building",
      "donor-advised-fund",
      "giving-circle",
      "community-initiative",
      "technical-assistance",
      "nonprofit-training",
      "convening"
    ],
    resourceTypes: [
      "grant",
      "donation",
      "partnership",
      "professional-service",
      "in-kind"
    ],
    missionDomains: [
      "human-dignity",
      "homelessness-outreach",
      "community-stabilization",
      "employment-self-sufficiency",
      "watershed-protection",
      "beachfront-stewardship",
      "ocean-stewardship",
      "coastal-stewardship"
    ],
    organizationUrl: "https://www.cfscc.org/",
    opportunityUrl: "https://www.cfscc.org/grant-opportunities",
    evidence:
      "Primary local community foundation channel for Santa Cruz County nonprofit funding, donor-advised philanthropy, capacity building, and community initiatives."
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

function normalizeFoundation(record = {}) {
  return {
    id: clean(
      record.id ||
        record.foundationId ||
        record.name
    ),
    name: clean(
      record.name ||
        record.foundationName ||
        "Unnamed community foundation"
    ),
    foundationType: clean(
      record.foundationType ||
        "community-foundation"
    ),
    geography: uniqueStrings(
      record.geography ||
        record.serviceAreas ||
        []
    ),
    channels: uniqueStrings(
      record.channels ||
        record.foundationChannels ||
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
        record.grantsUrl ||
        record.applicationUrl ||
        ""
    ),
    eligibilityNotes: clean(
      record.eligibilityNotes ||
        record.notes ||
        ""
    ),
    evidence: clean(
      record.evidence ||
        record.description ||
        ""
    )
  };
}

function geographyPriority(
  foundation,
  geographyProfile
) {
  const active =
    geographyProfile.currentOperatingAreas || [];

  const sourceAreas =
    foundation.geography || [];

  const current = sourceAreas.some(area =>
    active.some(activeArea => {
      const left = clean(area).toLowerCase();
      const right = clean(activeArea).toLowerCase();

      return (
        left.includes(right) ||
        right.includes(left)
      );
    })
  );

  return current
    ? "current-local"
    : "future-expansion";
}

function foundationToOpportunity(
  record,
  geographyProfile
) {
  const foundation =
    normalizeFoundation(record);

  const localPriority =
    geographyPriority(
      foundation,
      geographyProfile
    );

  const sourceUrl =
    foundation.opportunityUrl ||
    foundation.organizationUrl;

  return {
    id:
      `community-foundation:${foundation.id}`,
    title: foundation.name,
    description:
      foundation.evidence ||
      "Community foundation acquisition channel.",
    sourceName: foundation.name,
    provider: foundation.name,
    resourceType:
      foundation.resourceTypes.length === 1
        ? foundation.resourceTypes[0]
        : "partnership",
    resourceChannels:
      foundation.resourceTypes,
    foundationChannels:
      foundation.channels,
    missionDomains:
      foundation.missionDomains,
    region: REGION,
    geography:
      foundation.geography.length
        ? foundation.geography.join(", ")
        : geographyProfile
            .currentOperatingAreas
            .join(", "),
    sourceType:
      foundation.foundationType,
    url: sourceUrl,
    localPriority,
    discoveryStatus:
      foundation.opportunityUrl
        ? "official-opportunity-page-identified"
        : "foundation-source-identified",
    eligibilityVerified: false,
    nextDiscoveryAction:
      foundation.opportunityUrl
        ? "Review the official foundation opportunity page, verify current cycles, geographic eligibility, nonprofit age requirements, financial-history requirements, mission fit, deadlines, contacts, and application path."
        : "Locate and verify the foundation's official grants, donor-advised fund, giving-circle, capacity-building, and community-initiative programs.",
    raw: {
      foundation,
      geographyProfile
    }
  };
}

function selectFoundations({
  foundationCatalog =
    DEFAULT_FOUNDATION_CATALOG,
  geographyProfile =
    DEFAULT_GEOGRAPHY,
  includeFutureExpansion = false
} = {}) {
  const profile =
    normalizeGeography(geographyProfile);

  return foundationCatalog
    .map(normalizeFoundation)
    .map(foundation => ({
      ...foundation,
      localPriority:
        geographyPriority(
          foundation,
          profile
        )
    }))
    .filter(foundation =>
      includeFutureExpansion ||
      foundation.localPriority ===
        "current-local"
    )
    .sort((left, right) => {
      const leftPriority =
        left.localPriority ===
        "current-local"
          ? 1
          : 2;

      const rightPriority =
        right.localPriority ===
        "current-local"
          ? 1
          : 2;

      return (
        leftPriority - rightPriority ||
        clean(left.name).localeCompare(
          clean(right.name)
        )
      );
    });
}

async function discover({
  geographyProfile =
    DEFAULT_GEOGRAPHY,
  foundationCatalog =
    DEFAULT_FOUNDATION_CATALOG,
  foundationRecords = [],
  includeFutureExpansion = false
} = {}) {
  const profile =
    normalizeGeography(geographyProfile);

  const selected =
    selectFoundations({
      foundationCatalog: [
        ...foundationRecords,
        ...foundationCatalog
      ],
      geographyProfile: profile,
      includeFutureExpansion
    });

  return selected.map(record =>
    foundationToOpportunity(
      record,
      profile
    )
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
    "partnership",
    "professional-service",
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
      id: "fixture-coastal-community-foundation",
      name: "Fixture Coastal Community Foundation",
      foundationType: "community-foundation",
      geography: [
        "Santa Cruz County, California"
      ],
      channels: [
        "competitive-grant",
        "donor-advised-fund",
        "giving-circle",
        "capacity-building"
      ],
      resourceTypes: [
        "grant",
        "donation",
        "professional-service"
      ],
      missionDomains: [
        "human-dignity",
        "ocean-stewardship",
        "coastal-stewardship"
      ],
      opportunityUrl:
        "https://example.org/grants",
      evidence:
        "Fixture local coastal community foundation."
    },
    {
      id: "fixture-future-county-foundation",
      name: "Fixture Future County Foundation",
      foundationType: "community-foundation",
      geography: [
        "Future Coastal County, California"
      ],
      channels: [
        "competitive-grant"
      ],
      resourceTypes: ["grant"],
      missionDomains: [
        "coastal-stewardship"
      ]
    }
  ];

  const run =
    await ResourceDiscoveryNetwork
      .discoverAll({
        adapterIds: [ADAPTER_ID],
        context: {
          geographyProfile:
            DEFAULT_GEOGRAPHY,
          foundationRecords:
            fixtureRecords
        }
      });

  const records = run.records || [];

  const localFoundation =
    records.find(record =>
      record.title ===
        "Fixture Coastal Community Foundation"
    );

  const santaCruzFoundation =
    records.find(record =>
      record.title ===
        "Community Foundation Santa Cruz County"
    );

  const futureFoundation =
    records.find(record =>
      record.title ===
        "Fixture Future County Foundation"
    );

  const checks = [
    {
      name:
        "Adapter registers with Resource Discovery Network",
      passed:
        ResourceDiscoveryNetwork
          .listAdapters()
          .some(item =>
            item.id === ADAPTER_ID
          )
    },
    {
      name:
        "Santa Cruz County is the current operating geography",
      passed:
        DEFAULT_GEOGRAPHY
          .currentOperatingAreas
          .includes(
            "Santa Cruz County, California"
          )
    },
    {
      name:
        "Community foundations are mandatory local discovery",
      passed:
        Boolean(
          santaCruzFoundation
        )
    },
    {
      name:
        "Community foundation support extends beyond grants",
      passed:
        FOUNDATION_CHANNELS.includes(
          "donor-advised-fund"
        ) &&
        FOUNDATION_CHANNELS.includes(
          "giving-circle"
        ) &&
        FOUNDATION_CHANNELS.includes(
          "capacity-building"
        ) &&
        FOUNDATION_CHANNELS.includes(
          "technical-assistance"
        )
    },
    {
      name:
        "Ocean and coastal stewardship are preserved mission domains",
      passed:
        MISSION_DOMAINS.includes(
          "ocean-stewardship"
        ) &&
        MISSION_DOMAINS.includes(
          "coastal-stewardship"
        ) &&
        MISSION_DOMAINS.includes(
          "beachfront-stewardship"
        )
    },
    {
      name:
        "Official opportunity URL is preserved",
      passed:
        localFoundation?.source?.url ===
          "https://example.org/grants"
    },
    {
      name:
        "Local foundation records normalize into one schema",
      passed:
        Boolean(localFoundation) &&
        localFoundation.schema ===
          "meos.resource-opportunity.v1" &&
        localFoundation.region === "local"
    },
    {
      name:
        "Future expansion foundations stay inactive by default",
      passed:
        !futureFoundation
    },
    {
      name:
        "Every discovered record remains current-local by default",
      passed:
        records.length > 0 &&
        records.every(record =>
          record.original
            ?.localPriority ===
              "current-local"
        )
    }
  ];

  ResourceDiscoveryNetwork.clearAdapters();

  return {
    success:
      checks.every(check =>
        check.passed
      ),
    passed:
      checks.filter(check =>
        check.passed
      ).length,
    total: checks.length,
    checks,
    geography:
      DEFAULT_GEOGRAPHY,
    missionDomains:
      MISSION_DOMAINS,
    foundationChannels:
      FOUNDATION_CHANNELS,
    testedAt: now()
  };
}

const CommunityFoundationDiscoveryAdapter =
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
    defaultFoundationCatalog:
      DEFAULT_FOUNDATION_CATALOG,
    adapter,
    register,
    normalizeGeography,
    normalizeFoundation,
    selectFoundations,
    discover,
    runAcceptanceTest
  });

export {
  CommunityFoundationDiscoveryAdapter
};

export default
  CommunityFoundationDiscoveryAdapter;
