/**
 * MEOS Google Workspace Provider
 *
 * Provider Version: 1.2.0
 * Build ID: GWP120-INSTITUTIONAL-STORAGE-RECON-20260808-A
 * Status: Commission Candidate
 *
 * Purpose:
 * - Provide one secure, reusable Google Workspace connection for MEOS.
 * - Keep Google credentials and OAuth tokens off the frontend.
 * - Preserve broad read access while adding narrowly scoped app-managed write authorization.
 * - Recon the connected organization's real Drive capacity and storage capabilities at runtime.
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

const VERSION = "1.2.0";
const BUILD_ID = "GWP120-INSTITUTIONAL-STORAGE-RECON-20260808-A";
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

const AUTHORIZATION_SCOPES = Object.freeze([
  ...READ_ONLY_SCOPES,
  ...CONTROLLED_WRITE_SCOPES
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
  institutionalStorage: null
};

let oauthClient = null;
let driveClient = null;
let docsClient = null;
let sheetsClient = null;
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
    recommendedNextState:
      controlledWriteAuthorized
        ? "controlled-repository-prototype-ready"
        : "reauthorize-for-drive.file",
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
      writeModel:
        "broad-read-plus-app-managed-write",
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
    authorizationUpgradeRequired:
      !controlledWriteAuthorized,
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
      needsBootstrap:
        !ENV_REFRESH_TOKEN && Boolean(refreshToken),
      refreshToken:
        !ENV_REFRESH_TOKEN && refreshToken
          ? refreshToken
          : null,
      environmentVariable:
        "GOOGLE_WORKSPACE_REFRESH_TOKEN"
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

function getClients() {
  requireConnected();

  return {
    oauth: oauthClient,
    drive: driveClient,
    docs: docsClient,
    sheets: sheetsClient
  };
}

function getStatus() {
  const config = configurationStatus();
  const controlledWriteAuthorized =
    Boolean(
      state.authorizationRecon
        ?.controlledWriteAuthorized
    );

  return {
    provider: PROVIDER_ID,
    version: VERSION,
    buildId: BUILD_ID,
    mode:
      controlledWriteAuthorized
        ? "read-plus-app-managed-write"
        : "read-only",
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
      docsWrite: false,
      sheetsWrite: false,
      gmail: false,
      calendar: false
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
  initialize,
  getStatus,
  getAuthorizationUrl,
  authorizeFromCallback,
  verifyConnection,
  discoverInstitutionalStorage,
  disconnect,
  getClients,
  searchDrive,
  findFoldersByName,
  listFolderChildren,
  locateHeadquarters,
  listHeadquarters,
  readGoogleDocument,
  readSpreadsheet
});

export {
  AUTHORIZATION_SCOPES,
  BUILD_ID,
  CONTROLLED_WRITE_SCOPES,
  PROVIDER_ID,
  READ_ONLY_SCOPES,
  VERSION
};

export default GoogleWorkspaceProvider;
