/**
 * MEOS Google Workspace Provider
 *
 * Provider Version: 1.4.0
 * Build ID: GWP140-GOVERNED-WORKSPACE-WRITE-AUTHORITY-20260817-A
 * Status: Commission Candidate
 *
 * Purpose:
 * - Provide one secure, reusable Google Workspace connection for MEOS.
 * - Keep Google credentials and OAuth tokens off the frontend.
 * - Preserve broad read access while adding governed Docs, Sheets, Calendar, and app-managed Drive write authorization.
 * - Recon the connected organization's real Drive capacity and storage capabilities at runtime.
 * - Provide an app-managed institutional repository primitive over Google Drive.
 * - Keep institutional storage provider-neutral above this Google adapter.
 *
 * Required environment variables:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REDIRECT_URI
 *
 * Optional environment variables:
 * - GOOGLE_WORKSPACE_ROOT_FOLDER_ID
 * - GOOGLE_WORKSPACE_HEADQUARTERS_NAME
 * - MEOS_DATA_DIR
 * - GOOGLE_WORKSPACE_REFRESH_TOKEN (durable free-tier authorization bootstrap)
 */

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const VERSION = "1.4.0";
const BUILD_ID = "GWP140-GOVERNED-WORKSPACE-WRITE-AUTHORITY-20260817-A";
const COMMISSION = "006.032A";
const PROVIDER_ID = "google-workspace";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const DATA_DIRECTORY =
  process.env.MEOS_DATA_DIR ||
  path.join(currentDirectory, "data");

const WORKSPACE_DIRECTORY = path.join(
  DATA_DIRECTORY,
  "google-workspace"
);

const TOKEN_FILE = path.join(
  WORKSPACE_DIRECTORY,
  "oauth-token.json"
);

const CLIENT_ID = String(
  process.env.GOOGLE_CLIENT_ID || ""
).trim();

const CLIENT_SECRET = String(
  process.env.GOOGLE_CLIENT_SECRET || ""
).trim();

const REDIRECT_URI = String(
  process.env.GOOGLE_REDIRECT_URI || ""
).trim();

const CONFIGURED_ROOT_FOLDER_ID = String(
  process.env.GOOGLE_WORKSPACE_ROOT_FOLDER_ID || ""
).trim();

const HEADQUARTERS_NAME = String(
  process.env.GOOGLE_WORKSPACE_HEADQUARTERS_NAME ||
    "CCSP Executive Headquarters"
).trim();

const ENV_REFRESH_TOKEN = String(
  process.env.GOOGLE_WORKSPACE_REFRESH_TOKEN || ""
).trim();

const GOOGLE_FOLDER_MIME_TYPE =
  "application/vnd.google-apps.folder";

const GOOGLE_DOC_MIME_TYPE =
  "application/vnd.google-apps.document";

const GOOGLE_SHEET_MIME_TYPE =
  "application/vnd.google-apps.spreadsheet";

const INSTITUTIONAL_REPOSITORY_NAME =
  "MEOS Institutional Repository";

const INSTITUTIONAL_REPOSITORY_SCHEMA =
  "meos.institutional-repository.record.v1";

const INSTITUTIONAL_REPOSITORY_FOLDER_APP_PROPERTY =
  "meosInstitutionalRepository";

const INSTITUTIONAL_REPOSITORY_RECORD_APP_PROPERTY =
  "meosInstitutionalRecord";

const READ_ONLY_SCOPES = Object.freeze([
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly"
]);

/*
 * Recon Mission G — controlled write authorization.
 *
 * drive.file is intentionally narrower than full Drive write authority:
 * Maddy may create and manage files she creates or files explicitly opened/
 * shared with the app, while broad Workspace reading remains read-only.
 *
 * This is the commercial-safe seam: MEOS Core asks for an institutional
 * repository capability; this Google provider decides what Google authority
 * is actually available at runtime.
 */
const CONTROLLED_WRITE_SCOPES = Object.freeze([
  "https://www.googleapis.com/auth/drive.file"
]);

/*
 * Commission 006.032A — Governed Google Workspace Write Authority
 *
 * These scopes grant technical capability only. They do not grant MEOS standing
 * autonomy, external-action authority, approval, signature, certification, or
 * spending authority. Executive Workspace Office / Maddy Autonomy remains the
 * policy layer above this provider.
 *
 * Full Drive write is intentionally NOT requested. drive.file remains the Drive
 * write seam so MEOS can manage app-created/app-authorized files without asking
 * for unrestricted Drive authority. Docs and Sheets receive their product-level
 * write scopes; Calendar receives event/free-busy scopes. Gmail remains outside
 * this commission because mailbox read/modify scopes carry a materially different
 * authorization/verification profile and deserve their own governed seam.
 */
const WORKSPACE_WRITE_SCOPES = Object.freeze([
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy"
]);

const AUTHORIZATION_SCOPES = Object.freeze([
  ...READ_ONLY_SCOPES,
  ...CONTROLLED_WRITE_SCOPES,
  ...WORKSPACE_WRITE_SCOPES
]);

const FULL_DRIVE_WRITE_SCOPE =
  "https://www.googleapis.com/auth/drive";

const state = {
  initialized: false,
  connected: false,
  tokenLoaded: false,
  tokenSource: null,
  lastInitializedAt: null,
  lastAuthorizedAt: null,
  lastVerifiedAt: null,
  lastError: null,
  account: null,
  headquarters: null,
  grantedScopes: [],
  authorizationRecon: null,
  institutionalStorage: null,
  institutionalRepository: null
};

let oauthClient = null;
let driveClient = null;
let docsClient = null;
let sheetsClient = null;
let calendarClient = null;
let tokenWritePromise = Promise.resolve();

function configurationStatus() {
  const missing = [];

  if (!CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
  if (!CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
  if (!REDIRECT_URI) missing.push("GOOGLE_REDIRECT_URI");

  return {
    configured: missing.length === 0,
    missing
  };
}

function requireConfiguration() {
  const status = configurationStatus();

  if (!status.configured) {
    const error = new Error(
      `Google Workspace is not configured. Missing: ${status.missing.join(", ")}`
    );
    error.code = "GOOGLE_WORKSPACE_NOT_CONFIGURED";
    error.status = 503;
    error.details = status;
    throw error;
  }
}

function normalizeError(error) {
  return {
    message:
      error instanceof Error
        ? error.message
        : String(error || "Unknown Google Workspace error."),
    code:
      error?.code ||
      error?.response?.data?.error ||
      "GOOGLE_WORKSPACE_ERROR",
    status:
      Number(error?.status || error?.response?.status || 500),
    details:
      error?.response?.data ||
      error?.details ||
      null
  };
}

function createSignedState() {
  requireConfiguration();

  const payload = {
    provider: PROVIDER_ID,
    issuedAt: Date.now(),
    nonce: crypto.randomUUID()
  };

  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
    "utf8"
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", CLIENT_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function verifySignedState(value) {
  requireConfiguration();

  const [encodedPayload, suppliedSignature] =
    String(value || "").split(".");

  if (!encodedPayload || !suppliedSignature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", CLIENT_SECRET)
    .update(encodedPayload)
    .digest();

  let suppliedBuffer;

  try {
    suppliedBuffer = Buffer.from(
      suppliedSignature,
      "base64url"
    );
  } catch {
    return false;
  }

  if (
    suppliedBuffer.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(
      suppliedBuffer,
      expectedSignature
    )
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(
        encodedPayload,
        "base64url"
      ).toString("utf8")
    );

    const ageMs = Date.now() - Number(payload.issuedAt || 0);

    return (
      payload.provider === PROVIDER_ID &&
      Number.isFinite(ageMs) &&
      ageMs >= 0 &&
      ageMs <= 10 * 60 * 1000
    );
  } catch {
    return false;
  }
}

async function ensureWorkspaceDirectory() {
  await fs.mkdir(WORKSPACE_DIRECTORY, {
    recursive: true,
    mode: 0o700
  });
}

async function readStoredToken() {
  await ensureWorkspaceDirectory();

  try {
    const raw = await fs.readFile(TOKEN_FILE, "utf8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      throw new Error(
        "Stored Google OAuth token is not a JSON object."
      );
    }

    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    if (error instanceof SyntaxError) {
      const storageError = new Error(
        "Stored Google OAuth token contains invalid JSON."
      );
      storageError.code =
        "GOOGLE_WORKSPACE_TOKEN_STORAGE_CORRUPT";
      storageError.status = 500;
      throw storageError;
    }

    throw error;
  }
}

async function writeStoredToken(tokens) {
  await ensureWorkspaceDirectory();

  tokenWritePromise = tokenWritePromise
    .catch(() => undefined)
    .then(async () => {
      const existing = await readStoredToken();
      const merged = {
        ...(existing || {}),
        ...(tokens || {}),
        updatedAt: new Date().toISOString()
      };

      const temporaryPath =
        `${TOKEN_FILE}.${process.pid}.${Date.now()}.tmp`;

      await fs.writeFile(
        temporaryPath,
        `${JSON.stringify(merged, null, 2)}\n`,
        {
          encoding: "utf8",
          mode: 0o600
        }
      );

      await fs.rename(
        temporaryPath,
        TOKEN_FILE
      );

      return merged;
    });

  return tokenWritePromise;
}

async function deleteStoredToken() {
  try {
    await fs.unlink(TOKEN_FILE);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

function createClients() {
  requireConfiguration();

  oauthClient = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );

  oauthClient.on("tokens", tokens => {
    void writeStoredToken(tokens).catch(error => {
      state.lastError = normalizeError(error);
      console.error(
        "[MEOS Google Workspace Provider] Token persistence failed.",
        state.lastError
      );
    });
  });

  driveClient = google.drive({
    version: "v3",
    auth: oauthClient
  });

  docsClient = google.docs({
    version: "v1",
    auth: oauthClient
  });

  sheetsClient = google.sheets({
    version: "v4",
    auth: oauthClient
  });

  calendarClient = google.calendar({
    version: "v3",
    auth: oauthClient
  });
}

function requireInitialized() {
  if (!state.initialized || !oauthClient) {
    const error = new Error(
      "Google Workspace Provider has not been initialized."
    );
    error.code = "GOOGLE_WORKSPACE_NOT_INITIALIZED";
    error.status = 503;
    throw error;
  }
}

function requireConnected() {
  requireInitialized();

  if (!state.connected) {
    const error = new Error(
      "Google Workspace is not connected. Authorization is required."
    );
    error.code = "GOOGLE_WORKSPACE_NOT_CONNECTED";
    error.status = 401;
    throw error;
  }
}

function escapeDriveQueryValue(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

function calculateStorageNumbers(storageQuota = {}) {
  const parseInteger = value => {
    const raw = String(value ?? "").trim();
    return /^\d+$/.test(raw) ? BigInt(raw) : null;
  };

  const limit = parseInteger(storageQuota.limit);
  const usage = parseInteger(storageQuota.usage);
  const usageInDrive = parseInteger(storageQuota.usageInDrive);
  const usageInDriveTrash = parseInteger(
    storageQuota.usageInDriveTrash
  );

  const remaining =
    limit !== null && usage !== null && limit >= usage
      ? limit - usage
      : null;

  const percentUsed =
    limit !== null && usage !== null && limit > 0n
      ? Number((usage * 10000n) / limit) / 100
      : null;

  return {
    limitBytes: limit === null ? null : limit.toString(),
    usageBytes: usage === null ? null : usage.toString(),
    usageInDriveBytes:
      usageInDrive === null ? null : usageInDrive.toString(),
    usageInDriveTrashBytes:
      usageInDriveTrash === null
        ? null
        : usageInDriveTrash.toString(),
    remainingBytes:
      remaining === null ? null : remaining.toString(),
    percentUsed
  };
}

async function inspectGrantedScopes() {
  requireConnected();

  let accessToken = String(
    oauthClient.credentials?.access_token || ""
  ).trim();

  if (!accessToken) {
    const tokenResponse = await oauthClient.getAccessToken();
    accessToken = String(
      tokenResponse?.token || tokenResponse || ""
    ).trim();
  }

  if (!accessToken) {
    return {
      scopes: [],
      verified: false,
      error: "Google access token was unavailable for scope introspection."
    };
  }

  try {
    const tokenInfo = await oauthClient.getTokenInfo(accessToken);
    const scopes = [...new Set(
      Array.isArray(tokenInfo?.scopes)
        ? tokenInfo.scopes.map(value => String(value || "").trim())
        : []
    )].filter(Boolean);

    return {
      scopes,
      verified: true,
      expiresIn:
        Number(tokenInfo?.expiry_date || 0) > 0
          ? Math.max(
              0,
              Math.floor(
                (Number(tokenInfo.expiry_date) - Date.now()) / 1000
              )
            )
          : null,
      error: null
    };
  } catch (error) {
    return {
      scopes: [],
      verified: false,
      expiresIn: null,
      error: normalizeError(error)
    };
  }
}

async function discoverInstitutionalStorage() {
  requireConnected();

  const aboutResponse = await driveClient.about.get({
    fields:
      "user(displayName,emailAddress,permissionId)," +
      "storageQuota(limit,usage,usageInDrive,usageInDriveTrash)," +
      "canCreateDrives,maxUploadSize,appInstalled"
  });

  const about = aboutResponse.data || {};
  const storage = calculateStorageNumbers(
    about.storageQuota || {}
  );

  const scopeRecon = await inspectGrantedScopes();
  const grantedScopes = scopeRecon.scopes || [];

  const hasScope = scope =>
    grantedScopes.includes(scope);

  const broadReadAuthorized =
    hasScope(
      "https://www.googleapis.com/auth/drive.readonly"
    ) ||
    hasScope(FULL_DRIVE_WRITE_SCOPE);

  const controlledWriteAuthorized =
    hasScope(
      "https://www.googleapis.com/auth/drive.file"
    ) ||
    hasScope(FULL_DRIVE_WRITE_SCOPE);

  const fullDriveWriteAuthorized =
    hasScope(FULL_DRIVE_WRITE_SCOPE);

  const docsWriteAuthorized =
    hasScope("https://www.googleapis.com/auth/documents") ||
    fullDriveWriteAuthorized;

  const sheetsWriteAuthorized =
    hasScope("https://www.googleapis.com/auth/spreadsheets") ||
    fullDriveWriteAuthorized;

  const calendarEventsAuthorized =
    hasScope("https://www.googleapis.com/auth/calendar.events") ||
    hasScope("https://www.googleapis.com/auth/calendar");

  const calendarFreeBusyAuthorized =
    hasScope("https://www.googleapis.com/auth/calendar.freebusy") ||
    hasScope("https://www.googleapis.com/auth/calendar") ||
    calendarEventsAuthorized;

  const governedWorkspaceWriteAuthorized =
    controlledWriteAuthorized &&
    docsWriteAuthorized &&
    sheetsWriteAuthorized &&
    calendarEventsAuthorized;

  let sharedDrives = [];
  let sharedDrivesError = null;

  try {
    const drivesResponse = await driveClient.drives.list({
      pageSize: 100,
      fields:
        "nextPageToken,drives(id,name,createdTime,hidden)"
    });

    sharedDrives = (drivesResponse.data.drives || []).map(
      drive => ({
        id: drive.id || null,
        name: drive.name || null,
        createdTime: drive.createdTime || null,
        hidden: Boolean(drive.hidden)
      })
    );
  } catch (error) {
    sharedDrivesError = normalizeError(error);
  }

  let headquartersCapabilities = null;

  if (state.headquarters?.id) {
    try {
      const headquartersResponse =
        await driveClient.files.get({
          fileId: state.headquarters.id,
          fields:
            "id,name,driveId,ownedByMe,isAppAuthorized," +
            "capabilities(canEdit,canAddChildren,canShare,canMoveItemWithinDrive)",
          supportsAllDrives: true
        });

      headquartersCapabilities = {
        id: headquartersResponse.data.id || null,
        name: headquartersResponse.data.name || null,
        driveId: headquartersResponse.data.driveId || null,
        ownedByMe:
          headquartersResponse.data.ownedByMe ?? null,
        isAppAuthorized:
          headquartersResponse.data.isAppAuthorized ?? null,
        capabilities: {
          canEdit:
            headquartersResponse.data.capabilities?.canEdit ?? null,
          canAddChildren:
            headquartersResponse.data.capabilities?.canAddChildren ?? null,
          canShare:
            headquartersResponse.data.capabilities?.canShare ?? null,
          canMoveItemWithinDrive:
            headquartersResponse.data.capabilities
              ?.canMoveItemWithinDrive ?? null
        }
      };
    } catch (error) {
      headquartersCapabilities = {
        error: normalizeError(error)
      };
    }
  }

  const capacityVisible =
    storage.limitBytes !== null ||
    storage.usageBytes !== null;

  const repositoryAssessment = {
    viableForReadRecon:
      broadReadAuthorized && capacityVisible,
    viableForAppManagedWrites:
      controlledWriteAuthorized,
    fullDriveWriteAuthorized,
    authorizationUpgradeRequired:
      !controlledWriteAuthorized,
    workspaceWriteAuthorizationUpgradeRequired:
      !governedWorkspaceWriteAuthorized,
    recommendedNextState:
      !controlledWriteAuthorized
        ? "reauthorize-for-drive.file"
        : (!governedWorkspaceWriteAuthorized
            ? "reauthorize-for-governed-workspace-write"
            : "governed-workspace-write-ready"),
    preferredAuthority:
      sharedDrives.length > 0
        ? "existing-shared-drive-or-app-managed-folder"
        : "app-managed-drive-folder",
    blockers: [
      ...(
        controlledWriteAuthorized
          ? []
          : [
              "Google OAuth token has not granted drive.file controlled write authority."
            ]
      ),
      ...(
        docsWriteAuthorized
          ? []
          : ["Google OAuth token has not granted Google Docs write authority."]
      ),
      ...(
        sheetsWriteAuthorized
          ? []
          : ["Google OAuth token has not granted Google Sheets write authority."]
      ),
      ...(
        calendarEventsAuthorized
          ? []
          : ["Google OAuth token has not granted Google Calendar event write authority."]
      ),
      ...(
        capacityVisible
          ? []
          : [
              "Google did not report a numeric storage limit or usage value."
            ]
      )
    ]
  };

  const result = {
    schema:
      "meos.google-workspace.institutional-storage-recon.v1",
    provider: PROVIDER_ID,
    version: VERSION,
    buildId: BUILD_ID,
    inspectedAt: new Date().toISOString(),
    account: {
      displayName:
        about.user?.displayName || state.account?.displayName || null,
      emailAddress:
        about.user?.emailAddress || state.account?.emailAddress || null,
      permissionId:
        about.user?.permissionId || state.account?.permissionId || null
    },
    storage: {
      ...storage,
      reportingSemantics:
        "Google Drive API storageQuota; for pooled-storage organizations Google reports organization-level limit/usage.",
      maxUploadSizeBytes:
        about.maxUploadSize || null
    },
    sharedDrives: {
      accessibleCount: sharedDrives.length,
      canCreateSharedDrives:
        Boolean(about.canCreateDrives),
      drives: sharedDrives,
      error: sharedDrivesError
    },
    authorization: {
      verified: scopeRecon.verified,
      grantedScopes,
      requestedScopes: [...AUTHORIZATION_SCOPES],
      broadReadAuthorized,
      controlledWriteAuthorized,
      fullDriveWriteAuthorized,
      docsWriteAuthorized,
      sheetsWriteAuthorized,
      calendarEventsAuthorized,
      calendarFreeBusyAuthorized,
      governedWorkspaceWriteAuthorized,
      writeModel:
        governedWorkspaceWriteAuthorized
          ? "broad-read-plus-governed-workspace-write"
          : "broad-read-plus-app-managed-write",
      controlledWriteScope:
        "https://www.googleapis.com/auth/drive.file",
      fullDriveWriteScope:
        FULL_DRIVE_WRITE_SCOPE,
      scopeInspectionError:
        scopeRecon.error || null
    },
    headquarters:
      headquartersCapabilities,
    institutionalRepository:
      repositoryAssessment
  };

  state.grantedScopes = [...grantedScopes];
  state.authorizationRecon = {
    verified: scopeRecon.verified,
    broadReadAuthorized,
    controlledWriteAuthorized,
    fullDriveWriteAuthorized,
    docsWriteAuthorized,
    sheetsWriteAuthorized,
    calendarEventsAuthorized,
    calendarFreeBusyAuthorized,
    governedWorkspaceWriteAuthorized,
    authorizationUpgradeRequired:
      !governedWorkspaceWriteAuthorized,
    inspectedAt: result.inspectedAt
  };
  state.institutionalStorage = result;

  return result;
}

async function verifyConnection() {
  requireInitialized();

  const response = await driveClient.about.get({
    fields:
      "user(displayName,emailAddress,permissionId)," +
      "storageQuota(limit,usage,usageInDrive,usageInDriveTrash)"
  });

  const account = {
    displayName:
      response.data.user?.displayName || null,
    emailAddress:
      response.data.user?.emailAddress || null,
    permissionId:
      response.data.user?.permissionId || null
  };

  state.connected = true;
  state.lastVerifiedAt = new Date().toISOString();
  state.lastError = null;
  state.account = account;

  let institutionalStorage = null;

  try {
    institutionalStorage =
      await discoverInstitutionalStorage();
  } catch (error) {
    state.institutionalStorage = {
      schema:
        "meos.google-workspace.institutional-storage-recon.v1",
      provider: PROVIDER_ID,
      version: VERSION,
      buildId: BUILD_ID,
      inspectedAt: new Date().toISOString(),
      success: false,
      error: normalizeError(error)
    };
  }

  return {
    connected: true,
    account,
    storageQuota: calculateStorageNumbers(
      response.data.storageQuota || {}
    ),
    institutionalStorage:
      institutionalStorage ||
      state.institutionalStorage
  };
}

async function initialize() {
  const config = configurationStatus();

  state.lastInitializedAt = new Date().toISOString();

  if (!config.configured) {
    state.initialized = false;
    state.connected = false;
    state.lastError = {
      message:
        `Missing Google Workspace environment variables: ${config.missing.join(", ")}`,
      code: "GOOGLE_WORKSPACE_NOT_CONFIGURED",
      status: 503,
      details: config
    };

    return getStatus();
  }

  try {
    createClients();

    const storedToken = await readStoredToken();
    const bootstrapToken =
      storedToken ||
      (ENV_REFRESH_TOKEN
        ? { refresh_token: ENV_REFRESH_TOKEN }
        : null);

    if (bootstrapToken) {
      oauthClient.setCredentials(bootstrapToken);
      state.tokenLoaded = true;
      state.tokenSource = storedToken
        ? "file"
        : "environment";

      try {
        await verifyConnection();
      } catch (error) {
        state.connected = false;
        state.lastError = normalizeError(error);
      }
    } else {
      state.tokenLoaded = false;
      state.tokenSource = null;
    }

    state.initialized = true;

    console.info(
      `[MEOS] Google Workspace Provider v${VERSION} initialized. Build ${BUILD_ID}.`,
      {
        configured: true,
        connected: state.connected,
        mode:
          state.authorizationRecon?.controlledWriteAuthorized
            ? "read-plus-app-managed-write"
            : "read-only",
        tokenLoaded: state.tokenLoaded
      }
    );

    return getStatus();
  } catch (error) {
    state.initialized = false;
    state.connected = false;
    state.lastError = normalizeError(error);
    throw error;
  }
}

function getAuthorizationUrl(options = {}) {
  requireInitialized();

  const signedState =
    options.state ||
    createSignedState();

  return oauthClient.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt:
      options.forceConsent === false
        ? "select_account"
        : "consent",
    scope: AUTHORIZATION_SCOPES,
    state: signedState
  });
}

async function authorizeFromCallback({
  code,
  callbackState
} = {}) {
  requireInitialized();

  if (!code) {
    const error = new Error(
      "Google OAuth callback did not include an authorization code."
    );
    error.code =
      "GOOGLE_WORKSPACE_AUTHORIZATION_CODE_MISSING";
    error.status = 400;
    throw error;
  }

  if (!verifySignedState(callbackState)) {
    const error = new Error(
      "Google OAuth callback state is missing, expired, or invalid."
    );
    error.code =
      "GOOGLE_WORKSPACE_AUTHORIZATION_STATE_INVALID";
    error.status = 400;
    throw error;
  }

  const { tokens } = await oauthClient.getToken(
    String(code)
  );

  oauthClient.setCredentials(tokens);
  await writeStoredToken(tokens);

  state.tokenLoaded = true;
  state.tokenSource = "oauth-callback";
  state.lastAuthorizedAt = new Date().toISOString();

  const connection = await verifyConnection();
  const refreshToken = String(tokens?.refresh_token || "").trim();

  return {
    ...connection,
    durableAuthorization: {
      configured: Boolean(ENV_REFRESH_TOKEN),
      refreshTokenIssued: Boolean(refreshToken),
      needsBootstrap:
        !ENV_REFRESH_TOKEN && Boolean(refreshToken),
      needsRotation:
        Boolean(ENV_REFRESH_TOKEN) && Boolean(refreshToken),
      refreshToken:
        refreshToken || null,
      environmentVariable:
        "GOOGLE_WORKSPACE_REFRESH_TOKEN",
      action:
        refreshToken
          ? (ENV_REFRESH_TOKEN
              ? "replace-environment-refresh-token"
              : "set-environment-refresh-token")
          : "no-refresh-token-issued"
    }
  };
}

async function disconnect({
  revoke = true
} = {}) {
  requireInitialized();

  const credentials = {
    ...(oauthClient.credentials || {})
  };

  if (revoke && credentials.access_token) {
    await oauthClient.revokeToken(
      credentials.access_token
    );
  }

  oauthClient.setCredentials({});
  await deleteStoredToken();

  state.connected = false;
  state.tokenLoaded = false;
  state.account = null;
  state.headquarters = null;
  state.grantedScopes = [];
  state.authorizationRecon = null;
  state.institutionalStorage = null;
  state.institutionalRepository = null;
  state.lastError = null;

  return getStatus();
}

async function searchDrive({
  query = "",
  pageSize = 100,
  pageToken = undefined,
  fields =
    "nextPageToken,files(id,name,mimeType,parents,webViewLink,modifiedTime,createdTime,size,trashed,owners(displayName,emailAddress))",
  orderBy = "folder,name_natural",
  includeItemsFromAllDrives = true,
  supportsAllDrives = true
} = {}) {
  requireConnected();

  const response = await driveClient.files.list({
    q: query || undefined,
    pageSize: Math.max(
      1,
      Math.min(1000, Number(pageSize) || 100)
    ),
    pageToken,
    fields,
    orderBy,
    spaces: "drive",
    includeItemsFromAllDrives,
    supportsAllDrives
  });

  return {
    files: response.data.files || [],
    nextPageToken:
      response.data.nextPageToken || null
  };
}

async function findFoldersByName(name) {
  const normalizedName = String(name || "").trim();

  if (!normalizedName) {
    const error = new Error(
      "A folder name is required."
    );
    error.code =
      "GOOGLE_WORKSPACE_FOLDER_NAME_REQUIRED";
    error.status = 400;
    throw error;
  }

  const escapedName =
    escapeDriveQueryValue(normalizedName);

  const result = await searchDrive({
    query:
      `name = '${escapedName}' and ` +
      `mimeType = '${GOOGLE_FOLDER_MIME_TYPE}' and ` +
      "trashed = false",
    pageSize: 100
  });

  return result.files;
}

async function listFolderChildren(
  folderId,
  {
    pageSize = 1000,
    pageToken = undefined
  } = {}
) {
  const normalizedFolderId =
    String(folderId || "").trim();

  if (!normalizedFolderId) {
    const error = new Error(
      "A Google Drive folder ID is required."
    );
    error.code =
      "GOOGLE_WORKSPACE_FOLDER_ID_REQUIRED";
    error.status = 400;
    throw error;
  }

  const escapedFolderId =
    escapeDriveQueryValue(normalizedFolderId);

  return searchDrive({
    query:
      `'${escapedFolderId}' in parents and ` +
      "trashed = false",
    pageSize,
    pageToken
  });
}

async function locateHeadquarters({
  forceRefresh = false
} = {}) {
  requireConnected();

  if (
    state.headquarters &&
    !forceRefresh
  ) {
    return state.headquarters;
  }

  let headquarters = null;

  if (CONFIGURED_ROOT_FOLDER_ID) {
    const response = await driveClient.files.get({
      fileId: CONFIGURED_ROOT_FOLDER_ID,
      fields:
        "id,name,mimeType,parents,webViewLink,modifiedTime,trashed",
      supportsAllDrives: true
    });

    if (
      response.data.mimeType !==
      GOOGLE_FOLDER_MIME_TYPE
    ) {
      const error = new Error(
        "GOOGLE_WORKSPACE_ROOT_FOLDER_ID does not identify a Google Drive folder."
      );
      error.code =
        "GOOGLE_WORKSPACE_ROOT_NOT_FOLDER";
      error.status = 500;
      throw error;
    }

    headquarters = response.data;
  } else {
    const matches =
      await findFoldersByName(
        HEADQUARTERS_NAME
      );

    if (matches.length === 0) {
      const error = new Error(
        `Google Drive folder "${HEADQUARTERS_NAME}" was not found.`
      );
      error.code =
        "GOOGLE_WORKSPACE_HEADQUARTERS_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (matches.length > 1) {
      const error = new Error(
        `Multiple Google Drive folders are named "${HEADQUARTERS_NAME}". Configure GOOGLE_WORKSPACE_ROOT_FOLDER_ID to select the authoritative folder.`
      );
      error.code =
        "GOOGLE_WORKSPACE_HEADQUARTERS_AMBIGUOUS";
      error.status = 409;
      error.details = {
        matches: matches.map(folder => ({
          id: folder.id,
          name: folder.name,
          parents: folder.parents || [],
          webViewLink:
            folder.webViewLink || null
        }))
      };
      throw error;
    }

    headquarters = matches[0];
  }

  state.headquarters = {
    id: headquarters.id,
    name: headquarters.name,
    mimeType: headquarters.mimeType,
    parents: headquarters.parents || [],
    webViewLink:
      headquarters.webViewLink || null,
    modifiedTime:
      headquarters.modifiedTime || null
  };

  return state.headquarters;
}

async function listHeadquarters({
  pageSize = 1000,
  pageToken = undefined
} = {}) {
  const headquarters =
    await locateHeadquarters();

  const children =
    await listFolderChildren(
      headquarters.id,
      {
        pageSize,
        pageToken
      }
    );

  return {
    headquarters,
    items: children.files,
    nextPageToken:
      children.nextPageToken
  };
}

async function readGoogleDocument(documentId) {
  requireConnected();

  const normalizedId =
    String(documentId || "").trim();

  if (!normalizedId) {
    const error = new Error(
      "A Google Docs document ID is required."
    );
    error.code =
      "GOOGLE_WORKSPACE_DOCUMENT_ID_REQUIRED";
    error.status = 400;
    throw error;
  }

  const response =
    await docsClient.documents.get({
      documentId: normalizedId
    });

  return response.data;
}

async function readSpreadsheet({
  spreadsheetId,
  range
} = {}) {
  requireConnected();

  const normalizedId =
    String(spreadsheetId || "").trim();

  if (!normalizedId) {
    const error = new Error(
      "A Google Sheets spreadsheet ID is required."
    );
    error.code =
      "GOOGLE_WORKSPACE_SPREADSHEET_ID_REQUIRED";
    error.status = 400;
    throw error;
  }

  if (range) {
    const response =
      await sheetsClient.spreadsheets.values.get({
        spreadsheetId: normalizedId,
        range: String(range)
      });

    return response.data;
  }

  const response =
    await sheetsClient.spreadsheets.get({
      spreadsheetId: normalizedId,
      includeGridData: false
    });

  return response.data;
}


function requireControlledWriteAuthorization() {
  requireConnected();

  if (
    !state.authorizationRecon
      ?.controlledWriteAuthorized
  ) {
    const error = new Error(
      "Google Workspace controlled app-managed write authorization is required."
    );
    error.code =
      "GOOGLE_WORKSPACE_CONTROLLED_WRITE_NOT_AUTHORIZED";
    error.status = 403;
    throw error;
  }
}


function requireWorkspaceAuthorization(flag, label, code) {
  requireConnected();

  if (state.authorizationRecon?.[flag] !== true) {
    const error = new Error(
      `Google Workspace ${label} authorization is required. Reauthorize the connected account.`
    );
    error.code = code;
    error.status = 403;
    throw error;
  }
}

function requireDocsWriteAuthorization() {
  requireWorkspaceAuthorization(
    "docsWriteAuthorized",
    "Google Docs write",
    "GOOGLE_WORKSPACE_DOCS_WRITE_NOT_AUTHORIZED"
  );
}

function requireSheetsWriteAuthorization() {
  requireWorkspaceAuthorization(
    "sheetsWriteAuthorized",
    "Google Sheets write",
    "GOOGLE_WORKSPACE_SHEETS_WRITE_NOT_AUTHORIZED"
  );
}

function requireCalendarEventsAuthorization() {
  requireWorkspaceAuthorization(
    "calendarEventsAuthorized",
    "Google Calendar event",
    "GOOGLE_WORKSPACE_CALENDAR_EVENTS_NOT_AUTHORIZED"
  );
}

function requireCalendarFreeBusyAuthorization() {
  requireWorkspaceAuthorization(
    "calendarFreeBusyAuthorized",
    "Google Calendar free/busy",
    "GOOGLE_WORKSPACE_CALENDAR_FREEBUSY_NOT_AUTHORIZED"
  );
}

function normalizeWorkspaceTitle(value, fallback = "Untitled") {
  const title = String(value || "").trim();
  return (title || fallback).slice(0, 240);
}

function normalizeWorkspaceId(value, label) {
  const id = String(value || "").trim();
  if (!id) {
    const error = new Error(`${label} is required.`);
    error.code = "GOOGLE_WORKSPACE_RESOURCE_ID_REQUIRED";
    error.status = 400;
    throw error;
  }
  return id;
}

async function createGoogleDocument({
  title,
  text = ""
} = {}) {
  requireDocsWriteAuthorization();

  const created = await docsClient.documents.create({
    requestBody: {
      title: normalizeWorkspaceTitle(title, "MEOS Document")
    }
  });

  const documentId = created.data?.documentId || null;
  const content = String(text || "");

  if (documentId && content) {
    await docsClient.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{
          insertText: {
            location: { index: 1 },
            text: content
          }
        }]
      }
    });
  }

  return {
    success: true,
    provider: PROVIDER_ID,
    documentId,
    title: created.data?.title || normalizeWorkspaceTitle(title, "MEOS Document"),
    contentInserted: Boolean(content),
    technicalCapability: "workspace.document.create",
    authorityNote: "Provider capability only; MEOS execution authority must be proven upstream."
  };
}

async function updateGoogleDocument({
  documentId,
  requests = []
} = {}) {
  requireDocsWriteAuthorization();
  const normalizedId = normalizeWorkspaceId(documentId, "Google Docs document ID");
  const normalizedRequests = Array.isArray(requests) ? requests.filter(Boolean) : [];

  if (!normalizedRequests.length) {
    const error = new Error("At least one Google Docs batchUpdate request is required.");
    error.code = "GOOGLE_WORKSPACE_DOCS_UPDATE_REQUEST_REQUIRED";
    error.status = 400;
    throw error;
  }

  const response = await docsClient.documents.batchUpdate({
    documentId: normalizedId,
    requestBody: { requests: normalizedRequests }
  });

  return {
    success: true,
    provider: PROVIDER_ID,
    documentId: normalizedId,
    replies: response.data?.replies || [],
    technicalCapability: "workspace.document.update",
    authorityNote: "Provider capability only; MEOS execution authority must be proven upstream."
  };
}

async function createSpreadsheet({
  title,
  sheets = undefined
} = {}) {
  requireSheetsWriteAuthorization();

  const requestBody = {
    properties: {
      title: normalizeWorkspaceTitle(title, "MEOS Spreadsheet")
    }
  };

  if (Array.isArray(sheets) && sheets.length) {
    requestBody.sheets = sheets;
  }

  const response = await sheetsClient.spreadsheets.create({ requestBody });

  return {
    success: true,
    provider: PROVIDER_ID,
    spreadsheetId: response.data?.spreadsheetId || null,
    spreadsheetUrl: response.data?.spreadsheetUrl || null,
    properties: response.data?.properties || null,
    technicalCapability: "workspace.spreadsheet.create",
    authorityNote: "Provider capability only; MEOS execution authority must be proven upstream."
  };
}

async function writeSpreadsheetValues({
  spreadsheetId,
  range,
  values,
  valueInputOption = "USER_ENTERED"
} = {}) {
  requireSheetsWriteAuthorization();
  const normalizedId = normalizeWorkspaceId(spreadsheetId, "Google Sheets spreadsheet ID");
  const normalizedRange = String(range || "").trim();

  if (!normalizedRange) {
    const error = new Error("A Google Sheets range is required.");
    error.code = "GOOGLE_WORKSPACE_SHEETS_RANGE_REQUIRED";
    error.status = 400;
    throw error;
  }

  if (!Array.isArray(values)) {
    const error = new Error("Google Sheets values must be an array of rows.");
    error.code = "GOOGLE_WORKSPACE_SHEETS_VALUES_REQUIRED";
    error.status = 400;
    throw error;
  }

  const response = await sheetsClient.spreadsheets.values.update({
    spreadsheetId: normalizedId,
    range: normalizedRange,
    valueInputOption: String(valueInputOption || "USER_ENTERED"),
    requestBody: { values }
  });

  return {
    success: true,
    provider: PROVIDER_ID,
    spreadsheetId: normalizedId,
    range: normalizedRange,
    updatedRange: response.data?.updatedRange || null,
    updatedRows: response.data?.updatedRows || 0,
    updatedColumns: response.data?.updatedColumns || 0,
    updatedCells: response.data?.updatedCells || 0,
    technicalCapability: "workspace.spreadsheet.update",
    authorityNote: "Provider capability only; MEOS execution authority must be proven upstream."
  };
}

async function listCalendarEvents({
  calendarId = "primary",
  timeMin = new Date().toISOString(),
  timeMax = undefined,
  maxResults = 50,
  singleEvents = true,
  orderBy = "startTime"
} = {}) {
  requireCalendarEventsAuthorization();

  const response = await calendarClient.events.list({
    calendarId: String(calendarId || "primary"),
    timeMin: String(timeMin || new Date().toISOString()),
    ...(timeMax ? { timeMax: String(timeMax) } : {}),
    maxResults: Math.max(1, Math.min(250, Number(maxResults) || 50)),
    singleEvents: singleEvents !== false,
    ...(singleEvents !== false ? { orderBy } : {})
  });

  return response.data;
}

async function queryCalendarFreeBusy({
  timeMin,
  timeMax,
  calendarIds = ["primary"],
  timeZone = undefined
} = {}) {
  requireCalendarFreeBusyAuthorization();

  const start = String(timeMin || "").trim();
  const end = String(timeMax || "").trim();
  if (!start || !end) {
    const error = new Error("Calendar free/busy requires timeMin and timeMax.");
    error.code = "GOOGLE_WORKSPACE_CALENDAR_WINDOW_REQUIRED";
    error.status = 400;
    throw error;
  }

  const response = await calendarClient.freebusy.query({
    requestBody: {
      timeMin: start,
      timeMax: end,
      ...(timeZone ? { timeZone: String(timeZone) } : {}),
      items: (Array.isArray(calendarIds) ? calendarIds : [calendarIds])
        .map(id => ({ id: String(id || "").trim() }))
        .filter(item => item.id)
    }
  });

  return response.data;
}

async function createCalendarEvent({
  calendarId = "primary",
  event,
  sendUpdates = "none"
} = {}) {
  requireCalendarEventsAuthorization();

  if (!event || typeof event !== "object" || Array.isArray(event)) {
    const error = new Error("A Google Calendar event object is required.");
    error.code = "GOOGLE_WORKSPACE_CALENDAR_EVENT_REQUIRED";
    error.status = 400;
    throw error;
  }

  const response = await calendarClient.events.insert({
    calendarId: String(calendarId || "primary"),
    sendUpdates: String(sendUpdates || "none"),
    requestBody: event
  });

  return {
    success: true,
    provider: PROVIDER_ID,
    event: response.data,
    technicalCapability: "workspace.calendar.create",
    externalActionOccurred: true,
    authorityNote: "Provider capability only; MEOS external-action authority must be proven upstream."
  };
}

async function updateCalendarEvent({
  calendarId = "primary",
  eventId,
  event,
  sendUpdates = "none"
} = {}) {
  requireCalendarEventsAuthorization();
  const normalizedEventId = normalizeWorkspaceId(eventId, "Google Calendar event ID");

  if (!event || typeof event !== "object" || Array.isArray(event)) {
    const error = new Error("A Google Calendar event object is required.");
    error.code = "GOOGLE_WORKSPACE_CALENDAR_EVENT_REQUIRED";
    error.status = 400;
    throw error;
  }

  const response = await calendarClient.events.patch({
    calendarId: String(calendarId || "primary"),
    eventId: normalizedEventId,
    sendUpdates: String(sendUpdates || "none"),
    requestBody: event
  });

  return {
    success: true,
    provider: PROVIDER_ID,
    event: response.data,
    technicalCapability: "workspace.calendar.update",
    externalActionOccurred: true,
    authorityNote: "Provider capability only; MEOS external-action authority must be proven upstream."
  };
}

async function deleteCalendarEvent({
  calendarId = "primary",
  eventId,
  sendUpdates = "none"
} = {}) {
  requireCalendarEventsAuthorization();
  const normalizedEventId = normalizeWorkspaceId(eventId, "Google Calendar event ID");

  await calendarClient.events.delete({
    calendarId: String(calendarId || "primary"),
    eventId: normalizedEventId,
    sendUpdates: String(sendUpdates || "none")
  });

  return {
    success: true,
    provider: PROVIDER_ID,
    eventId: normalizedEventId,
    technicalCapability: "workspace.calendar.delete",
    externalActionOccurred: true,
    authorityNote: "Provider capability only; MEOS external-action authority must be proven upstream."
  };
}

function normalizeRepositoryKey(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    const error = new Error(
      "An institutional repository record key is required."
    );
    error.code =
      "GOOGLE_WORKSPACE_REPOSITORY_KEY_REQUIRED";
    error.status = 400;
    throw error;
  }

  return normalized.slice(0, 180);
}

function repositoryRecordName(key) {
  return `${normalizeRepositoryKey(key)}.meos.json`;
}


/*
 * Commission 006.018S — Byte-Safe Institutional Repository Metadata
 *
 * Google Drive limits each custom property key + value pair to 124 UTF-8
 * bytes. MEOS repository identity itself is NOT shortened here: the exact
 * normalized institutional key remains in the JSON envelope and file name.
 *
 * Only the provider-specific indexing hint is compacted when necessary.
 * A deterministic SHA-256 surrogate preserves stable equality without
 * weakening the institutional record's semantic identity.
 */
const GOOGLE_APP_PROPERTY_PAIR_MAX_UTF8_BYTES = 124;

function utf8ByteLength(value) {
  return Buffer.byteLength(String(value ?? ""), "utf8");
}

function compactGoogleAppPropertyValue(propertyKey, value) {
  const key = String(propertyKey || "");
  const raw = String(value ?? "");
  const maximumValueBytes =
    GOOGLE_APP_PROPERTY_PAIR_MAX_UTF8_BYTES -
    utf8ByteLength(key);

  if (maximumValueBytes <= 0) {
    const error = new Error(
      `Google app property key "${key}" leaves no UTF-8 byte budget for a value.`
    );
    error.code =
      "GOOGLE_WORKSPACE_APP_PROPERTY_KEY_TOO_LARGE";
    error.status = 500;
    throw error;
  }

  if (utf8ByteLength(raw) <= maximumValueBytes) {
    return raw;
  }

  const digest =
    `sha256:${crypto
      .createHash("sha256")
      .update(raw, "utf8")
      .digest("hex")}`;

  if (utf8ByteLength(digest) > maximumValueBytes) {
    const error = new Error(
      `Google app property "${key}" cannot fit a deterministic metadata surrogate within the provider byte limit.`
    );
    error.code =
      "GOOGLE_WORKSPACE_APP_PROPERTY_VALUE_UNREPRESENTABLE";
    error.status = 500;
    throw error;
  }

  return digest;
}

function buildInstitutionalRecordAppProperties(
  normalizedKey,
  recordType
) {
  const exactRecordType =
    String(recordType || "state").trim() || "state";

  return {
    [INSTITUTIONAL_REPOSITORY_RECORD_APP_PROPERTY]:
      compactGoogleAppPropertyValue(
        INSTITUTIONAL_REPOSITORY_RECORD_APP_PROPERTY,
        "true"
      ),
    meosRepositoryKey:
      compactGoogleAppPropertyValue(
        "meosRepositoryKey",
        normalizedKey
      ),
    meosRecordType:
      compactGoogleAppPropertyValue(
        "meosRecordType",
        exactRecordType
      )
  };
}

async function locateInstitutionalRepository({
  createIfMissing = false,
  forceRefresh = false
} = {}) {
  requireConnected();

  if (
    state.institutionalRepository?.id &&
    !forceRefresh
  ) {
    return { ...state.institutionalRepository };
  }

  const escapedMarker = escapeDriveQueryValue(
    INSTITUTIONAL_REPOSITORY_FOLDER_APP_PROPERTY
  );

  const result = await searchDrive({
    query:
      `appProperties has { key='${escapedMarker}' and value='true' } and ` +
      `mimeType = '${GOOGLE_FOLDER_MIME_TYPE}' and trashed = false`,
    pageSize: 100,
    fields:
      "nextPageToken,files(id,name,mimeType,parents,webViewLink,modifiedTime,createdTime,trashed,appProperties)"
  });

  if (result.files.length > 1) {
    const error = new Error(
      "Multiple app-managed MEOS institutional repositories were discovered."
    );
    error.code =
      "GOOGLE_WORKSPACE_REPOSITORY_AMBIGUOUS";
    error.status = 409;
    error.details = {
      matches: result.files.map(file => ({
        id: file.id,
        name: file.name,
        parents: file.parents || []
      }))
    };
    throw error;
  }

  let folder = result.files[0] || null;

  if (!folder && createIfMissing) {
    requireControlledWriteAuthorization();

    const createResponse =
      await driveClient.files.create({
        requestBody: {
          name: INSTITUTIONAL_REPOSITORY_NAME,
          mimeType: GOOGLE_FOLDER_MIME_TYPE,
          appProperties: {
            [INSTITUTIONAL_REPOSITORY_FOLDER_APP_PROPERTY]:
              "true",
            meosProvider: PROVIDER_ID,
            meosSchema:
              "meos.institutional-repository.v1"
          }
        },
        fields:
          "id,name,mimeType,parents,webViewLink,modifiedTime,createdTime,appProperties",
        supportsAllDrives: true
      });

    folder = createResponse.data;
  }

  if (!folder) {
    state.institutionalRepository = null;
    return null;
  }

  state.institutionalRepository = {
    schema: "meos.institutional-repository.v1",
    provider: PROVIDER_ID,
    authority: "app-managed-drive-folder",
    id: folder.id,
    name: folder.name,
    mimeType: folder.mimeType,
    parents: folder.parents || [],
    webViewLink: folder.webViewLink || null,
    createdTime: folder.createdTime || null,
    modifiedTime: folder.modifiedTime || null,
    appManaged: true
  };

  return { ...state.institutionalRepository };
}

async function writeInstitutionalRecord({
  key,
  value,
  recordType = "state",
  metadata = {}
} = {}) {
  requireControlledWriteAuthorization();

  const normalizedKey = normalizeRepositoryKey(key);
  const repository =
    await locateInstitutionalRepository({
      createIfMissing: true
    });

  const fileName =
    repositoryRecordName(normalizedKey);
  const escapedRepositoryId =
    escapeDriveQueryValue(repository.id);
  const escapedFileName =
    escapeDriveQueryValue(fileName);

  const existing = await searchDrive({
    query:
      `'${escapedRepositoryId}' in parents and ` +
      `name = '${escapedFileName}' and ` +
      "trashed = false",
    pageSize: 10,
    fields:
      "nextPageToken,files(id,name,mimeType,parents,modifiedTime,createdTime,appProperties)"
  });

  if (existing.files.length > 1) {
    const error = new Error(
      `Institutional repository key "${normalizedKey}" resolves to multiple records.`
    );
    error.code =
      "GOOGLE_WORKSPACE_REPOSITORY_RECORD_AMBIGUOUS";
    error.status = 409;
    throw error;
  }

  const now = new Date().toISOString();
  const envelope = {
    schema: INSTITUTIONAL_REPOSITORY_SCHEMA,
    key: normalizedKey,
    recordType:
      String(recordType || "state").trim() || "state",
    provider: PROVIDER_ID,
    writtenAt: now,
    metadata:
      metadata && typeof metadata === "object"
        ? metadata
        : {},
    value
  };
  const body =
    `${JSON.stringify(envelope, null, 2)}\n`;

  let response;
  let operation;

  if (existing.files[0]?.id) {
    operation = "updated";
    response = await driveClient.files.update({
      fileId: existing.files[0].id,
      media: {
        mimeType: "application/json",
        body
      },
      fields:
        "id,name,mimeType,parents,webViewLink,modifiedTime,createdTime,size,appProperties",
      supportsAllDrives: true
    });
  } else {
    operation = "created";
    response = await driveClient.files.create({
      requestBody: {
        name: fileName,
        parents: [repository.id],
        mimeType: "application/json",
        appProperties:
          buildInstitutionalRecordAppProperties(
            normalizedKey,
            recordType
          )
      },
      media: {
        mimeType: "application/json",
        body
      },
      fields:
        "id,name,mimeType,parents,webViewLink,modifiedTime,createdTime,size,appProperties",
      supportsAllDrives: true
    });
  }

  return {
    schema:
      "meos.institutional-repository.write-result.v1",
    success: true,
    provider: PROVIDER_ID,
    authority: "app-managed-drive-folder",
    operation,
    repository,
    record: {
      id: response.data.id || null,
      key: normalizedKey,
      name: response.data.name || fileName,
      recordType: envelope.recordType,
      modifiedTime:
        response.data.modifiedTime || now,
      createdTime:
        response.data.createdTime || null,
      size: response.data.size || null,
      webViewLink:
        response.data.webViewLink || null
    },
    verified: Boolean(response.data.id)
  };
}

async function readInstitutionalRecord(key) {
  requireConnected();

  const normalizedKey = normalizeRepositoryKey(key);
  const repository =
    await locateInstitutionalRepository();

  if (!repository) {
    return {
      schema:
        "meos.institutional-repository.read-result.v1",
      success: false,
      found: false,
      provider: PROVIDER_ID,
      key: normalizedKey,
      reason: "repository-not-found"
    };
  }

  const escapedRepositoryId =
    escapeDriveQueryValue(repository.id);
  const escapedFileName =
    escapeDriveQueryValue(
      repositoryRecordName(normalizedKey)
    );

  const result = await searchDrive({
    query:
      `'${escapedRepositoryId}' in parents and ` +
      `name = '${escapedFileName}' and ` +
      "trashed = false",
    pageSize: 10,
    fields:
      "nextPageToken,files(id,name,mimeType,parents,webViewLink,modifiedTime,createdTime,size,appProperties)"
  });

  if (result.files.length === 0) {
    return {
      schema:
        "meos.institutional-repository.read-result.v1",
      success: false,
      found: false,
      provider: PROVIDER_ID,
      key: normalizedKey,
      reason: "record-not-found"
    };
  }

  if (result.files.length > 1) {
    const error = new Error(
      `Institutional repository key "${normalizedKey}" resolves to multiple records.`
    );
    error.code =
      "GOOGLE_WORKSPACE_REPOSITORY_RECORD_AMBIGUOUS";
    error.status = 409;
    throw error;
  }

  const file = result.files[0];
  const response = await driveClient.files.get({
    fileId: file.id,
    alt: "media",
    supportsAllDrives: true
  });

  const payload =
    typeof response.data === "string"
      ? JSON.parse(response.data)
      : response.data;

  if (
    !payload ||
    payload.schema !==
      INSTITUTIONAL_REPOSITORY_SCHEMA ||
    payload.key !== normalizedKey
  ) {
    const error = new Error(
      `Institutional repository record "${normalizedKey}" failed envelope verification.`
    );
    error.code =
      "GOOGLE_WORKSPACE_REPOSITORY_RECORD_INVALID";
    error.status = 500;
    throw error;
  }

  return {
    schema:
      "meos.institutional-repository.read-result.v1",
    success: true,
    found: true,
    provider: PROVIDER_ID,
    authority: "app-managed-drive-folder",
    repository,
    record: {
      id: file.id,
      key: normalizedKey,
      name: file.name,
      recordType: payload.recordType || null,
      writtenAt: payload.writtenAt || null,
      metadata: payload.metadata || {},
      modifiedTime: file.modifiedTime || null,
      createdTime: file.createdTime || null,
      size: file.size || null,
      webViewLink: file.webViewLink || null
    },
    value: payload.value
  };
}

async function deleteInstitutionalRecord(key) {
  requireControlledWriteAuthorization();

  const normalizedKey = normalizeRepositoryKey(key);
  const repository =
    await locateInstitutionalRepository();

  if (!repository) {
    return {
      schema:
        "meos.institutional-repository.delete-result.v1",
      success: true,
      deleted: false,
      provider: PROVIDER_ID,
      key: normalizedKey,
      reason: "repository-not-found"
    };
  }

  const escapedRepositoryId =
    escapeDriveQueryValue(repository.id);
  const escapedFileName =
    escapeDriveQueryValue(
      repositoryRecordName(normalizedKey)
    );

  const result = await searchDrive({
    query:
      `'${escapedRepositoryId}' in parents and ` +
      `name = '${escapedFileName}' and ` +
      "trashed = false",
    pageSize: 10,
    fields:
      "nextPageToken,files(id,name)"
  });

  if (result.files.length > 1) {
    const error = new Error(
      `Institutional repository key "${normalizedKey}" resolves to multiple records.`
    );
    error.code =
      "GOOGLE_WORKSPACE_REPOSITORY_RECORD_AMBIGUOUS";
    error.status = 409;
    throw error;
  }

  if (!result.files[0]?.id) {
    return {
      schema:
        "meos.institutional-repository.delete-result.v1",
      success: true,
      deleted: false,
      provider: PROVIDER_ID,
      key: normalizedKey,
      reason: "record-not-found"
    };
  }

  await driveClient.files.delete({
    fileId: result.files[0].id,
    supportsAllDrives: true
  });

  return {
    schema:
      "meos.institutional-repository.delete-result.v1",
    success: true,
    deleted: true,
    provider: PROVIDER_ID,
    key: normalizedKey,
    id: result.files[0].id
  };
}

async function runInstitutionalRepositoryAcceptanceTest() {
  requireControlledWriteAuthorization();

  /*
   * Use a deliberately long repository identity and record type so the live
   * acceptance crosses the exact Google appProperties boundary that rejected
   * real Research Learning. The exact values must survive in the JSON envelope
   * while only provider metadata is compacted.
   */
  const testKey =
    `acceptance-byte-safe-${crypto.randomUUID()}-${"research-learning-".repeat(8)}`;
  const testRecordType =
    `acceptance-research-learning-${"institutional-memory-".repeat(7)}`;
  const sentinel = {
    commission: "006.018S",
    nonce: crypto.randomUUID(),
    testedAt: new Date().toISOString(),
    exactKey: normalizeRepositoryKey(testKey),
    exactRecordType: testRecordType
  };

  const checks = [];
  let writeResult = null;
  let readResult = null;
  let cleanupResult = null;

  try {
    const repository =
      await locateInstitutionalRepository({
        createIfMissing: true,
        forceRefresh: true
      });

    checks.push({
      name:
        "App-managed institutional repository exists",
      passed: Boolean(repository?.id)
    });

    writeResult =
      await writeInstitutionalRecord({
        key: testKey,
        value: sentinel,
        recordType: testRecordType,
        metadata: {
          disposable: true,
          commission: "006.018S"
        }
      });

    checks.push({
      name:
        "Institutional repository accepts controlled writes with over-limit semantic identity",
      passed:
        writeResult.success === true &&
        writeResult.verified === true
    });

    const acceptanceAppProperties =
      buildInstitutionalRecordAppProperties(
        normalizeRepositoryKey(testKey),
        testRecordType
      );

    checks.push({
      name:
        "Every provider appProperty key/value pair is within Google's 124 UTF-8 byte limit",
      passed:
        Object.entries(acceptanceAppProperties)
          .every(([key, value]) =>
            utf8ByteLength(key) +
              utf8ByteLength(value) <=
            GOOGLE_APP_PROPERTY_PAIR_MAX_UTF8_BYTES
          )
    });

    checks.push({
      name:
        "Over-limit provider metadata uses deterministic content-derived surrogates",
      passed:
        acceptanceAppProperties.meosRepositoryKey
          .startsWith("sha256:") &&
        acceptanceAppProperties.meosRecordType
          .startsWith("sha256:") &&
        acceptanceAppProperties.meosRepositoryKey ===
          buildInstitutionalRecordAppProperties(
            normalizeRepositoryKey(testKey),
            testRecordType
          ).meosRepositoryKey
    });

    readResult =
      await readInstitutionalRecord(testKey);

    checks.push({
      name:
        "Institutional repository reads back the written record",
      passed:
        readResult.success === true &&
        readResult.found === true
    });

    checks.push({
      name:
        "Read-after-write preserves the exact institutional payload",
      passed:
        JSON.stringify(readResult.value) ===
        JSON.stringify(sentinel)
    });

    checks.push({
      name:
        "Provider metadata compaction does not change the institutional record key or record type",
      passed:
        readResult?.record?.key ===
          normalizeRepositoryKey(testKey) &&
        readResult?.record?.recordType ===
          testRecordType &&
        readResult?.value?.exactKey ===
          normalizeRepositoryKey(testKey) &&
        readResult?.value?.exactRecordType ===
          testRecordType
    });

    checks.push({
      name:
        "Repository authority remains app-managed rather than full-Drive write",
      passed:
        state.authorizationRecon
          ?.controlledWriteAuthorized === true &&
        state.authorizationRecon
          ?.fullDriveWriteAuthorized !== true
    });
  } finally {
    cleanupResult =
      await deleteInstitutionalRecord(testKey)
        .catch(error => ({
          success: false,
          deleted: false,
          error: normalizeError(error)
        }));

    checks.push({
      name:
        "Acceptance record is removed after verification",
      passed:
        cleanupResult.success === true &&
        cleanupResult.deleted === true
    });
  }

  const passed =
    checks.every(check => check.passed);

  const result = {
    commission: "006.018S",
    schema:
      "meos.google-workspace.institutional-repository.byte-safe-metadata-acceptance.v2",
    version: VERSION,
    buildId: BUILD_ID,
    passed,
    checks,
    repository:
      state.institutionalRepository
        ? { ...state.institutionalRepository }
        : null,
    writeResult,
    readResult,
    cleanupResult
  };

  console.table(checks);
  console.info(
    `[MEOS ${VERSION}] Commission 006.018S byte-safe institutional repository metadata acceptance: ${passed ? "PASS" : "FAIL"}.`
  );

  return result;
}


function runGovernedWorkspaceWriteAcceptanceTest() {
  const source = {
    scopes: AUTHORIZATION_SCOPES,
    methods: {
      createGoogleDocument,
      updateGoogleDocument,
      createSpreadsheet,
      writeSpreadsheetValues,
      listCalendarEvents,
      queryCalendarFreeBusy,
      createCalendarEvent,
      updateCalendarEvent,
      deleteCalendarEvent
    }
  };

  const checks = [
    {
      name: "Full Drive write is not requested by governed Workspace write",
      passed: !source.scopes.includes(FULL_DRIVE_WRITE_SCOPE)
    },
    {
      name: "App-managed Drive write remains requested",
      passed: source.scopes.includes("https://www.googleapis.com/auth/drive.file")
    },
    {
      name: "Google Docs write scope is requested",
      passed: source.scopes.includes("https://www.googleapis.com/auth/documents")
    },
    {
      name: "Google Sheets write scope is requested",
      passed: source.scopes.includes("https://www.googleapis.com/auth/spreadsheets")
    },
    {
      name: "Google Calendar event write scope is requested",
      passed: source.scopes.includes("https://www.googleapis.com/auth/calendar.events")
    },
    {
      name: "Google Calendar free-busy scope is requested",
      passed: source.scopes.includes("https://www.googleapis.com/auth/calendar.freebusy")
    },
    {
      name: "Gmail authority is not silently added",
      passed: !source.scopes.some(scope => /gmail|mail\.google/.test(scope))
    },
    {
      name: "Docs write primitive exists",
      passed: typeof source.methods.createGoogleDocument === "function" &&
        typeof source.methods.updateGoogleDocument === "function"
    },
    {
      name: "Sheets write primitive exists",
      passed: typeof source.methods.createSpreadsheet === "function" &&
        typeof source.methods.writeSpreadsheetValues === "function"
    },
    {
      name: "Calendar read/write primitives exist",
      passed: typeof source.methods.listCalendarEvents === "function" &&
        typeof source.methods.createCalendarEvent === "function" &&
        typeof source.methods.updateCalendarEvent === "function" &&
        typeof source.methods.deleteCalendarEvent === "function"
    },
    {
      name: "OAuth callback can surface a rotated refresh token for durable scope upgrades",
      passed:
        /needsRotation/.test(authorizeFromCallback.toString()) &&
        /replace-environment-refresh-token/.test(authorizeFromCallback.toString())
    },
    {
      name: "Provider methods declare upstream authority boundary",
      passed: /MEOS execution authority must be proven upstream/.test(createGoogleDocument.toString()) &&
        /MEOS external-action authority must be proven upstream/.test(createCalendarEvent.toString())
    }
  ];

  const passed = checks.filter(check => check.passed).length;
  return {
    success: passed === checks.length,
    commission: COMMISSION,
    schema: "meos.google-workspace.governed-write-authority.acceptance.v1",
    version: VERSION,
    buildId: BUILD_ID,
    passed,
    total: checks.length,
    checks
  };
}

function getClients() {
  requireConnected();

  return {
    oauth: oauthClient,
    drive: driveClient,
    docs: docsClient,
    sheets: sheetsClient,
    calendar: calendarClient
  };
}

function getStatus() {
  const config = configurationStatus();
  const controlledWriteAuthorized =
    Boolean(
      state.authorizationRecon
        ?.controlledWriteAuthorized
    );
  const docsWriteAuthorized =
    state.authorizationRecon?.docsWriteAuthorized === true;
  const sheetsWriteAuthorized =
    state.authorizationRecon?.sheetsWriteAuthorized === true;
  const calendarEventsAuthorized =
    state.authorizationRecon?.calendarEventsAuthorized === true;
  const calendarFreeBusyAuthorized =
    state.authorizationRecon?.calendarFreeBusyAuthorized === true;
  const governedWorkspaceWriteAuthorized =
    state.authorizationRecon?.governedWorkspaceWriteAuthorized === true;

  return {
    provider: PROVIDER_ID,
    version: VERSION,
    buildId: BUILD_ID,
    mode:
      governedWorkspaceWriteAuthorized
        ? "read-plus-governed-workspace-write"
        : (controlledWriteAuthorized
            ? "read-plus-app-managed-write"
            : "read-only"),
    initialized: state.initialized,
    configured: config.configured,
    missingConfiguration: config.missing,
    connected: state.connected,
    tokenLoaded: state.tokenLoaded,
    tokenSource: state.tokenSource,
    durableAuthorizationConfigured:
      Boolean(ENV_REFRESH_TOKEN),
    scopes: {
      requested: [...AUTHORIZATION_SCOPES],
      readOnly: [...READ_ONLY_SCOPES],
      controlledWrite:
        [...CONTROLLED_WRITE_SCOPES],
      workspaceWrite:
        [...WORKSPACE_WRITE_SCOPES],
      granted: [...state.grantedScopes]
    },
    authorization:
      state.authorizationRecon
        ? { ...state.authorizationRecon }
        : null,
    redirectUriConfigured:
      Boolean(REDIRECT_URI),
    rootFolderConfigured:
      Boolean(CONFIGURED_ROOT_FOLDER_ID),
    headquartersName:
      HEADQUARTERS_NAME,
    account: state.account
      ? { ...state.account }
      : null,
    headquarters: state.headquarters
      ? { ...state.headquarters }
      : null,
    institutionalRepository:
      state.institutionalRepository
        ? { ...state.institutionalRepository }
        : null,
    institutionalStorage:
      state.institutionalStorage
        ? JSON.parse(
            JSON.stringify(
              state.institutionalStorage
            )
          )
        : null,
    lastInitializedAt:
      state.lastInitializedAt,
    lastAuthorizedAt:
      state.lastAuthorizedAt,
    lastVerifiedAt:
      state.lastVerifiedAt,
    lastError:
      state.lastError
        ? { ...state.lastError }
        : null,
    storage: {
      tokenFile:
        TOKEN_FILE,
      persistentDiskExpected:
        Boolean(process.env.MEOS_DATA_DIR),
      environmentRefreshTokenConfigured:
        Boolean(ENV_REFRESH_TOKEN)
    },
    capabilities: {
      authorize: true,
      refreshTokens: true,
      disconnect: true,
      institutionalStorageRecon: true,
      institutionalRepository: true,
      institutionalRepositoryRead: true,
      institutionalRepositoryWrite:
        controlledWriteAuthorized,
      driveSearch: true,
      driveListFolders: true,
      driveListHeadquarters: true,
      docsRead: true,
      sheetsRead: true,
      driveWrite:
        controlledWriteAuthorized,
      driveAppManagedWrite:
        controlledWriteAuthorized,
      driveFullWrite:
        Boolean(
          state.authorizationRecon
            ?.fullDriveWriteAuthorized
        ),
      docsWrite: docsWriteAuthorized,
      sheetsWrite: sheetsWriteAuthorized,
      calendarRead: calendarEventsAuthorized,
      calendarAvailability: calendarFreeBusyAuthorized,
      calendarWrite: calendarEventsAuthorized,
      gmail: false,
      gmailSend: false
    },
    mimeTypes: {
      folder: GOOGLE_FOLDER_MIME_TYPE,
      document: GOOGLE_DOC_MIME_TYPE,
      spreadsheet: GOOGLE_SHEET_MIME_TYPE
    }
  };
}

const GoogleWorkspaceProvider = Object.freeze({
  id: PROVIDER_ID,
  version: VERSION,
  buildId: BUILD_ID,
  scopes: AUTHORIZATION_SCOPES,
  readOnlyScopes: READ_ONLY_SCOPES,
  controlledWriteScopes:
    CONTROLLED_WRITE_SCOPES,
  workspaceWriteScopes:
    WORKSPACE_WRITE_SCOPES,
  initialize,
  getStatus,
  getAuthorizationUrl,
  authorizeFromCallback,
  verifyConnection,
  discoverInstitutionalStorage,
  locateInstitutionalRepository,
  writeInstitutionalRecord,
  readInstitutionalRecord,
  deleteInstitutionalRecord,
  runInstitutionalRepositoryAcceptanceTest,
  runGovernedWorkspaceWriteAcceptanceTest,
  disconnect,
  getClients,
  searchDrive,
  findFoldersByName,
  listFolderChildren,
  locateHeadquarters,
  listHeadquarters,
  readGoogleDocument,
  readSpreadsheet,
  createGoogleDocument,
  updateGoogleDocument,
  createSpreadsheet,
  writeSpreadsheetValues,
  listCalendarEvents,
  queryCalendarFreeBusy,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
});

export {
  AUTHORIZATION_SCOPES,
  BUILD_ID,
  CONTROLLED_WRITE_SCOPES,
  PROVIDER_ID,
  READ_ONLY_SCOPES,
  WORKSPACE_WRITE_SCOPES,
  VERSION
};

export default GoogleWorkspaceProvider;
