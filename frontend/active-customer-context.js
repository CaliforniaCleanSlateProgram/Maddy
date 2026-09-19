/**
 * MEOS Active Customer Context Bootstrap
 * Version: 1.0.0
 * Build: ACCB100-STATIC-JSON-BOOTSTRAP-20260919-A
 *
 * Security boundary:
 * - This is static trusted frontend code.
 * - Customer/organization/representative state arrives as JSON data only.
 * - No executable JavaScript is generated from customer context.
 * - No eval, Function constructor, dynamic source execution, or remote script body is used.
 */
(function initializeMEOSActiveCustomerContext(global) {
  "use strict";

  const VERSION = "1.0.0";
  const BUILD_ID = "ACCB100-STATIC-JSON-BOOTSTRAP-20260919-A";
  const ENDPOINT = "/api/active-customer-context";

  function freezeRecord(value) {
    return value && typeof value === "object"
      ? Object.freeze({ ...value })
      : Object.freeze({});
  }

  function clearDeploymentSpecificOrganizationState() {
    global.CCSPOrganizationalProfile = undefined;
    global.CCSPLongTermStrategy = undefined;
    global.MEOSOrganizationLongTermStrategy = undefined;
    global.ActiveOrganization = undefined;
    global.MEOSOrganizationProfile = undefined;
    global.OrganizationalProfile = undefined;
  }

  function installAuthorizedHuman(context) {
    const human = context?.authorizedHuman;
    if (!human) {
      global.UserProfile = undefined;
      return;
    }

    global.UserProfile = Object.freeze({
      name: human.displayName || null,
      displayName: human.displayName || null,
      role: human.role || null,
      authority: "authorized-human",
      accountId: human.accountId || null,
      founderAuthority: human.founderAuthority === true
    });
  }

  function installGenericOrganization(context) {
    const organization = context?.organization;
    if (!organization || organization.profileId === "ccsp-organizational-profile") {
      return;
    }

    const profile = Object.freeze({
      metadata: Object.freeze({
        id: "active-customer-organization",
        version: VERSION,
        source: organization.source || "active-customer-context"
      }),
      organization: Object.freeze({
        legalName: organization.name || null,
        name: organization.name || null,
        abbreviation: organization.abbreviation || null,
        organizationId: organization.id || null,
        organizationType: null
      }),
      purpose: Object.freeze({
        mission: null,
        operatingPurpose: null,
        longTermPurpose: null
      }),
      leadership: Object.freeze([]),
      boundaries: Object.freeze([])
    });

    global.ActiveOrganization = profile;
    global.MEOSOrganizationProfile = profile;
    global.OrganizationalProfile = profile;
  }

  function installContext(context) {
    const active = context && typeof context === "object" ? context : {};

    clearDeploymentSpecificOrganizationState();

    global.MEOSActiveCustomerContext = Object.freeze({ ...active });
    global.MEOSCognitionIdentity = freezeRecord(active.cognitionIdentity);
    global.MEOSCustomerRepresentative = freezeRecord(active.representative);

    installAuthorizedHuman(active);
    installGenericOrganization(active);

    console.info("[MEOS] Active customer context loaded:", {
      customer: active.customer?.displayName || null,
      organization: active.organization?.name || null,
      representative: active.representative?.displayName || "Maddy",
      cognition: active.cognitionIdentity?.preferredName || "Maddy",
      version: VERSION,
      buildId: BUILD_ID,
      transport: "static-bootstrap-json-data"
    });

    return global.MEOSActiveCustomerContext;
  }

  function loadContextSynchronously() {
    const request = new XMLHttpRequest();
    request.open("GET", ENDPOINT, false);
    request.setRequestHeader("Accept", "application/json");
    request.send(null);

    if (request.status < 200 || request.status >= 300) {
      throw new Error(
        `Active customer context request failed with HTTP ${request.status}.`
      );
    }

    const payload = JSON.parse(request.responseText || "{}");
    if (!payload?.success || !payload.context) {
      throw new Error("Active customer context response was incomplete.");
    }

    return payload.context;
  }

  try {
    installContext(loadContextSynchronously());
    global.MEOSActiveCustomerContextBootstrap = Object.freeze({
      version: VERSION,
      buildId: BUILD_ID,
      ready: true,
      transport: "json"
    });
  } catch (error) {
    clearDeploymentSpecificOrganizationState();
    global.MEOSActiveCustomerContext = null;
    global.MEOSCognitionIdentity = Object.freeze({});
    global.MEOSCustomerRepresentative = Object.freeze({});
    global.MEOSActiveCustomerContextLoadError = Object.freeze({
      message: error?.message || String(error),
      version: VERSION,
      buildId: BUILD_ID
    });
    global.MEOSActiveCustomerContextBootstrap = Object.freeze({
      version: VERSION,
      buildId: BUILD_ID,
      ready: false,
      transport: "json"
    });
    console.error(
      "[MEOS] Active customer context bootstrap failed; organization-specific context was not activated.",
      error
    );
  }
})(window);
