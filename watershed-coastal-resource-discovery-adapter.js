/**
 * MEOS Watershed & Coastal Resource Discovery Adapter
 * Version: 1.0.0
 * Build: WCRDA100-HUMAN-RESTORATION-SANCTUARY-PRESERVATION-20260803-A
 *
 * Governing model:
 * "Human Restoration. Sanctuary Preservation."
 *
 * Mission:
 * Discover grants and non-grant resources that support upstream human-centered
 * intervention, mobile hygiene, stabilization, waste reduction at the source,
 * watershed preservation, waterway protection, coastal stewardship, wildlife
 * protection, marine-life protection, and marine-sanctuary preservation.
 *
 * Important:
 * This adapter does not classify the organization as primarily a trash-pickup,
 * wildlife-rescue, scientific-research, or habitat-restoration organization.
 * It preserves the causal operating model:
 *
 * Human restoration and mobile hygiene
 *   -> reduced riparian encampment impact
 *   -> reduced waste, plastics, and debris entering waterways
 *   -> improved downstream water quality
 *   -> protection of riverbeds, rivers, waterways, estuaries, harbors,
 *      beaches, wildlife, marine life, and marine sanctuaries.
 */

import ResourceDiscoveryNetwork from "./resource-discovery-network.js";

const NAME = "MEOS Watershed & Coastal Resource Discovery Adapter";
const VERSION = "1.0.0";
const BUILD_ID =
  "WCRDA100-HUMAN-RESTORATION-SANCTUARY-PRESERVATION-20260803-A";
const ADAPTER_ID = "watershed-coastal-resource-discovery";
const REGION = "local";

const GOVERNING_PRINCIPLE =
  "Human Restoration. Sanctuary Preservation.";

const OPERATING_MODEL = Object.freeze({
  intervention:
    "Deploy human-centered mobile hygiene and stabilization resources at upstream source corridors.",
  mechanism:
    "Build trusted engagement and connect participants into a continuum of care.",
  environmentalEffect:
    "Reduce accumulated waste, plastics, debris, and environmental impact before material travels downstream.",
  downstreamProtection: [
    "riverbeds",
    "rivers",
    "creeks",
    "streams",
    "urban waterways",
    "riparian corridors",
    "floodplains",
    "wetlands",
    "estuaries",
    "harbors",
    "beaches",
    "coastlines",
    "ocean",
    "wildlife",
    "marine life",
    "marine sanctuaries"
  ],
  prohibitedMisclassification:
    "Do not characterize the organization as primarily a trash-pickup, wildlife-rescue, scientific-research, or habitat-restoration organization."
});

const MISSION_DOMAINS = Object.freeze([
  "human-restoration",
  "mobile-hygiene",
  "community-stabilization",
  "upstream-source-interception",
  "riparian-encampment-impact-reduction",
  "waste-reduction-at-source",
  "plastic-reduction-at-source",
  "debris-reduction-at-source",
  "environmental-impact-reduction",
  "watershed-preservation",
  "watershed-defense",
  "river-stewardship",
  "riverbed-stewardship",
  "creek-stewardship",
  "stream-stewardship",
  "urban-waterway-stewardship",
  "waterway-protection",
  "riparian-corridor-protection",
  "floodplain-stewardship",
  "wetland-stewardship",
  "estuary-protection",
  "harbor-protection",
  "beachfront-stewardship",
  "coastal-stewardship",
  "ocean-stewardship",
  "water-quality-protection",
  "wildlife-protection",
  "marine-life-protection",
  "marine-sanctuary-preservation",
  "sanctuary-preservation"
]);

const RESOURCE_CHANNELS = Object.freeze([
  "grant",
  "contract",
  "sponsorship",
  "donation",
  "vehicle",
  "mobile-unit",
  "trailer",
  "equipment",
  "technology",
  "professional-service",
  "engineering",
  "environmental-consulting",
  "gis-support",
  "legal-service",
  "communications-service",
  "volunteer",
  "university-partnership",
  "government-partnership",
  "foundation-partnership",
  "corporate-csr",
  "community-partnership",
  "in-kind"
]);

const DEFAULT_GEOGRAPHY = Object.freeze({
  currentOperatingAreas: [
    "Santa Cruz County, California",
    "San Lorenzo River corridors",
    "Adjacent Santa Cruz urban waterways",
    "Santa Cruz Harbor",
    "Monterey Bay National Marine Sanctuary"
  ],
  regionalPriorityAreas: [
    "Monterey Bay watershed",
    "Central California coast"
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
    id: "upstream-human-restoration-resources",
    name: "Upstream Human Restoration and Mobile Hygiene Resources",
    sourceType: "cross-sector-resource-channel",
    geography: [
      "Santa Cruz County, California",
      "San Lorenzo River corridors"
    ],
    missionDomains: [
      "human-restoration",
      "mobile-hygiene",
      "community-stabilization",
      "upstream-source-interception",
      "riparian-encampment-impact-reduction",
      "waste-reduction-at-source",
      "watershed-preservation",
      "water-quality-protection"
    ],
    resourceChannels: [
      "grant",
      "contract",
      "vehicle",
      "mobile-unit",
      "trailer",
      "equipment",
      "professional-service",
      "government-partnership",
      "foundation-partnership",
      "corporate-csr",
      "in-kind"
    ],
    evidence:
      "Resources that fund or support human-centered upstream intervention, mobile hygiene deployment, stabilization, and source-level environmental impact reduction."
  },
  {
    id: "riverbed-waterway-protection-resources",
    name: "Riverbed, River, Creek, Stream, and Waterway Protection Resources",
    sourceType: "watershed-resource-channel",
    geography: [
      "San Lorenzo River corridors",
      "Adjacent Santa Cruz urban waterways",
      "Monterey Bay watershed"
    ],
    missionDomains: [
      "watershed-defense",
      "river-stewardship",
      "riverbed-stewardship",
      "creek-stewardship",
      "stream-stewardship",
      "urban-waterway-stewardship",
      "waterway-protection",
      "riparian-corridor-protection",
      "water-quality-protection"
    ],
    resourceChannels: [
      "grant",
      "contract",
      "equipment",
      "technology",
      "engineering",
      "environmental-consulting",
      "gis-support",
      "volunteer",
      "university-partnership",
      "government-partnership",
      "community-partnership"
    ],
    evidence:
      "Resources supporting upstream protection of riverbeds, rivers, creeks, streams, riparian corridors, and adjacent urban waterways."
  },
  {
    id: "coastal-sanctuary-protection-resources",
    name: "Coastal, Harbor, Ocean, and Marine Sanctuary Protection Resources",
    sourceType: "coastal-resource-channel",
    geography: [
      "Santa Cruz Harbor",
      "Monterey Bay National Marine Sanctuary",
      "Central California coast"
    ],
    missionDomains: [
      "estuary-protection",
      "harbor-protection",
      "beachfront-stewardship",
      "coastal-stewardship",
      "ocean-stewardship",
      "marine-life-protection",
      "wildlife-protection",
      "marine-sanctuary-preservation",
      "sanctuary-preservation"
    ],
    resourceChannels: [
      "grant",
      "sponsorship",
      "donation",
      "equipment",
      "technology",
      "professional-service",
      "environmental-consulting",
      "volunteer",
      "university-partnership",
      "foundation-partnership",
      "corporate-csr",
      "community-partnership",
      "in-kind"
    ],
    evidence:
      "Resources that support downstream protection of beaches, harbors, coastal waters, wildlife, marine life, and protected marine sanctuaries."
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
  const expansion = profile.expansionStrategy || {};

  return {
    currentOperatingAreas: uniqueStrings(
      profile.currentOperatingAreas ||
        DEFAULT_GEOGRAPHY.currentOperatingAreas
    ),
    regionalPriorityAreas: uniqueStrings(
      profile.regionalPriorityAreas ||
        DEFAULT_GEOGRAPHY.regionalPriorityAreas
    ),
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

function normalizeSource(record = {}) {
  return {
    id: clean(record.id || record.sourceId || record.name),
    name: clean(
      record.name ||
        record.sourceName ||
        "Unnamed watershed and coastal resource source"
    ),
    sourceType: clean(
      record.sourceType ||
        "watershed-coastal-resource-channel"
    ),
    geography: uniqueStrings(
      record.geography ||
        record.serviceAreas ||
        []
    ),
    missionDomains: uniqueStrings(
      record.missionDomains ||
        record.focusAreas ||
        []
    ),
    resourceChannels: uniqueStrings(
      record.resourceChannels ||
        record.resources ||
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
        ""
    ),
    evidence: clean(
      record.evidence ||
        record.description ||
        ""
    ),
    eligibilityNotes: clean(
      record.eligibilityNotes ||
        record.notes ||
        ""
    ),
    discoveryStatus: clean(
      record.discoveryStatus ||
        "resource-channel-identified"
    )
  };
}

function determinePriority(source, geographyProfile) {
  const sourceAreas = source.geography || [];

  const matches = areas =>
    sourceAreas.some(sourceArea =>
      (areas || []).some(area => {
        const left = clean(sourceArea).toLowerCase();
        const right = clean(area).toLowerCase();

        return left.includes(right) || right.includes(left);
      })
    );

  if (matches(geographyProfile.currentOperatingAreas)) {
    return "current-local";
  }

  if (matches(geographyProfile.regionalPriorityAreas)) {
    return "nearby-regional";
  }

  return "future-expansion";
}

function determineNextAction(source) {
  if (source.opportunityUrl) {
    return "Review the official opportunity page and verify resource type, current cycle, eligibility, geography, organizational readiness, deadline, contacts, and whether the opportunity supports upstream human-centered intervention and downstream sanctuary protection.";
  }

  if (source.organizationUrl) {
    return "Investigate the official organization website, active funding or resource programs, geographic focus, current partners, contacts, and alignment with upstream source interception and downstream environmental protection.";
  }

  return "Identify verified local and regional organizations, programs, funders, agencies, businesses, universities, and in-kind partners operating in this resource channel.";
}

function sourceToOpportunity(record, geographyProfile) {
  const source = normalizeSource(record);
  const localPriority = determinePriority(
    source,
    geographyProfile
  );

  return {
    id: `watershed-coastal:${source.id}`,
    title: source.name,
    description:
      source.evidence ||
      "Watershed and coastal resource acquisition channel.",
    sourceName: source.name,
    provider: source.name,
    resourceType:
      source.resourceChannels.length === 1
        ? source.resourceChannels[0]
        : "partnership",
    resourceChannels: source.resourceChannels,
    missionDomains: source.missionDomains,
    governingPrinciple: GOVERNING_PRINCIPLE,
    operatingModel: OPERATING_MODEL,
    region: REGION,
    geography:
      source.geography.length
        ? source.geography.join(", ")
        : geographyProfile.currentOperatingAreas.join(", "),
    sourceType: source.sourceType,
    url:
      source.opportunityUrl ||
      source.organizationUrl,
    localPriority,
    discoveryStatus: source.discoveryStatus,
    eligibilityVerified: false,
    prohibitedMisclassification:
      OPERATING_MODEL.prohibitedMisclassification,
    nextDiscoveryAction:
      determineNextAction(source),
    raw: {
      source,
      geographyProfile,
      governingPrinciple:
        GOVERNING_PRINCIPLE,
      operatingModel:
        OPERATING_MODEL
    }
  };
}

function selectSources({
  sourceCatalog = DEFAULT_DISCOVERY_CATALOG,
  sourceRecords = [],
  geographyProfile = DEFAULT_GEOGRAPHY,
  includeRegional = true,
  includeFutureExpansion = false
} = {}) {
  const profile = normalizeGeography(geographyProfile);

  return [...sourceRecords, ...sourceCatalog]
    .map(normalizeSource)
    .map(source => ({
      ...source,
      localPriority:
        determinePriority(source, profile)
    }))
    .filter(source => {
      if (source.localPriority === "current-local") {
        return true;
      }

      if (
        source.localPriority === "nearby-regional" &&
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
  sourceCatalog = DEFAULT_DISCOVERY_CATALOG,
  sourceRecords = [],
  includeRegional = true,
  includeFutureExpansion = false
} = {}) {
  const profile = normalizeGeography(geographyProfile);

  return selectSources({
    sourceCatalog,
    sourceRecords,
    geographyProfile: profile,
    includeRegional,
    includeFutureExpansion
  }).map(record =>
    sourceToOpportunity(record, profile)
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
    "contract",
    "sponsorship",
    "donation",
    "vehicle",
    "equipment",
    "technology",
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

  const fixtureRecords = [
    {
      id: "fixture-upstream-program",
      name: "Fixture Upstream Human Restoration Program",
      sourceType: "foundation-program",
      geography: [
        "Santa Cruz County, California",
        "San Lorenzo River corridors"
      ],
      missionDomains: [
        "human-restoration",
        "mobile-hygiene",
        "upstream-source-interception",
        "waste-reduction-at-source",
        "water-quality-protection",
        "marine-life-protection"
      ],
      resourceChannels: [
        "grant",
        "vehicle",
        "equipment",
        "professional-service",
        "partnership"
      ],
      opportunityUrl:
        "https://example.org/upstream-program",
      evidence:
        "Fixture program funding upstream human-centered intervention."
    },
    {
      id: "fixture-regional-waterway",
      name: "Fixture Monterey Bay Waterway Partnership",
      sourceType: "regional-partnership",
      geography: [
        "Monterey Bay watershed"
      ],
      missionDomains: [
        "riverbed-stewardship",
        "urban-waterway-stewardship",
        "coastal-stewardship",
        "wildlife-protection"
      ],
      resourceChannels: [
        "grant",
        "environmental-consulting",
        "university-partnership"
      ]
    },
    {
      id: "fixture-future-coast",
      name: "Fixture Future Coastal Program",
      geography: [
        "San Diego County, California"
      ],
      missionDomains: [
        "coastal-stewardship"
      ],
      resourceChannels: ["grant"]
    }
  ];

  const run =
    await ResourceDiscoveryNetwork.discoverAll({
      adapterIds: [ADAPTER_ID],
      context: {
        geographyProfile: DEFAULT_GEOGRAPHY,
        sourceRecords: fixtureRecords,
        includeRegional: true,
        includeFutureExpansion: false
      }
    });

  const records = run.records || [];

  const upstream = records.find(
    record =>
      record.title ===
      "Fixture Upstream Human Restoration Program"
  );

  const regional = records.find(
    record =>
      record.title ===
      "Fixture Monterey Bay Waterway Partnership"
  );

  const future = records.find(
    record =>
      record.title ===
      "Fixture Future Coastal Program"
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
        "Governing principle is preserved",
      passed:
        upstream?.original?.governingPrinciple ===
        "Human Restoration. Sanctuary Preservation."
    },
    {
      name:
        "Human restoration is the upstream intervention",
      passed:
        upstream?.original?.missionDomains?.includes(
          "human-restoration"
        ) &&
        upstream?.original?.missionDomains?.includes(
          "upstream-source-interception"
        )
    },
    {
      name:
        "Waste reduction is framed at the source",
      passed:
        upstream?.original?.missionDomains?.includes(
          "waste-reduction-at-source"
        )
    },
    {
      name:
        "Riverbeds and waterways are explicit domains",
      passed:
        MISSION_DOMAINS.includes(
          "riverbed-stewardship"
        ) &&
        MISSION_DOMAINS.includes(
          "urban-waterway-stewardship"
        ) &&
        MISSION_DOMAINS.includes(
          "waterway-protection"
        )
    },
    {
      name:
        "Wildlife and marine-life protection are preserved outcomes",
      passed:
        MISSION_DOMAINS.includes(
          "wildlife-protection"
        ) &&
        MISSION_DOMAINS.includes(
          "marine-life-protection"
        )
    },
    {
      name:
        "Trash-pickup misclassification is prohibited",
      passed:
        upstream?.original
          ?.prohibitedMisclassification
          ?.includes("trash-pickup")
    },
    {
      name:
        "Local upstream resources rank current-local",
      passed:
        upstream?.original?.localPriority ===
        "current-local"
    },
    {
      name:
        "Monterey Bay resources rank nearby-regional",
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
        "Grants and non-grant resources coexist",
      passed:
        upstream?.original?.resourceChannels?.includes(
          "grant"
        ) &&
        upstream?.original?.resourceChannels?.includes(
          "vehicle"
        ) &&
        upstream?.original?.resourceChannels?.includes(
          "professional-service"
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
    governingPrinciple:
      GOVERNING_PRINCIPLE,
    operatingModel:
      OPERATING_MODEL,
    missionDomains:
      MISSION_DOMAINS,
    resourceChannels:
      RESOURCE_CHANNELS,
    geography:
      DEFAULT_GEOGRAPHY,
    testedAt: now()
  };
}

const WatershedCoastalResourceDiscoveryAdapter =
  Object.freeze({
    name: NAME,
    version: VERSION,
    buildId: BUILD_ID,
    id: ADAPTER_ID,
    region: REGION,
    governingPrinciple:
      GOVERNING_PRINCIPLE,
    operatingModel:
      OPERATING_MODEL,
    missionDomains:
      MISSION_DOMAINS,
    resourceChannels:
      RESOURCE_CHANNELS,
    defaultGeography:
      DEFAULT_GEOGRAPHY,
    defaultDiscoveryCatalog:
      DEFAULT_DISCOVERY_CATALOG,
    adapter,
    register,
    normalizeGeography,
    normalizeSource,
    selectSources,
    discover,
    runAcceptanceTest
  });

export {
  WatershedCoastalResourceDiscoveryAdapter
};

export default
  WatershedCoastalResourceDiscoveryAdapter;
