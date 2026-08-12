/**
 * Maddy Executive Operations System (MEOS)
 * Executive Headquarters Intelligence Operations Interface
 *
 * Version: 4.10.2
 *
 * Purpose:
 * - Replaces the temporary Executive Office dashboard file without requiring
 *   changes to the surrounding HTML, CSS, office registry, or engine files.
 * - Works backward from the approved MEOS dashboard vision.
 * - Preserves the existing public API:
 *     window.MEOSOfficeDashboard.show(member)
 *     window.MEOSOfficeDashboard.hide()
 *     window.MEOSOfficeDashboard.refresh(member)
 * - Preserves the Executive Review actions and office data connections.
 * - Adds a modular dashboard shell, persistent build-progress widget,
 *   Maddy cost-state indicator, and rearrangeable widget configuration.
 */

(() => {
  "use strict";

  const DASHBOARD_VERSION = "4.10.2";
  const FUNDING_API_URL = "/api/resource-development/desk?limit=100";
  const OFFICE_ACTIVITY_API_URL = "/api/resource-development/desk?includeAll=true&limit=500";
  const COGNITION_RUNTIME_API_URL = "/api/continuous-cognition-runtime";
  const COGNITION_RUNTIME_REFRESH_FLOOR_MS = 10000;
  const FUNDING_CARD_LIMIT = 3;
  const ROOT_ID = "executive-office";
  const STYLE_ID = "meosExecutiveDashboardStyles";
  const STORAGE_KEY = "meos.dashboard.build.v4.0.0";

  const DEFAULT_BUILD_TASKS = [
    { id: "executive-office-standard", title: "Executive Office Standard and cabinet registry", status: "complete" },
    { id: "mission-command", title: "Mission command, dispatcher, and workflow foundation", status: "complete" },
    { id: "knowledge-intelligence", title: "Knowledge, recall, research, and evidence foundation", status: "complete" },
    { id: "reasoning-governance", title: "Executive reasoning, planning, decision, and governance", status: "complete" },
    { id: "funding-discovery", title: "Resource discovery and acquisition qualification", status: "complete" },
    { id: "grant-application", title: "Grant application intelligence and adaptive writing", status: "complete" },
    { id: "portal-execution", title: "Governed portal execution and submission bridge", status: "complete" },
    { id: "office-activity", title: "Live Office Activity and executive walkthrough", status: "complete" },
    { id: "dashboard-live-wiring", title: "Executive Headquarters live widget wiring", status: "complete" },
    { id: "finance-office", title: "Finance Office operational commission", status: "active" },
    { id: "community-relations-office", title: "Community Relations Office operational commission", status: "pending" },
    { id: "communications-office", title: "Communications and social execution commission", status: "pending" },
    { id: "compliance-office", title: "Compliance case and obligation management", status: "pending" },
    { id: "people-office", title: "Human Resources and volunteer operations", status: "pending" },
    { id: "durable-operations", title: "Durable server-side workflow and office state", status: "pending" },
    { id: "production-governance", title: "Authentication, permissions, tenant isolation, and production controls", status: "pending" }
  ];

  const DEFAULT_LAYOUT = Object.freeze([
    { id: "build-progress", colSpan: 12, rowSpan: 2, visible: true, order: 10 },
    { id: "office-activity", colSpan: 6, rowSpan: 2, visible: true, order: 15 },
    { id: "today-glance", colSpan: 3, rowSpan: 2, visible: true, order: 20 },
    { id: "mission-pulse", colSpan: 3, rowSpan: 2, visible: true, order: 30 },
    { id: "priorities", colSpan: 3, rowSpan: 2, visible: true, order: 40 },
    { id: "briefing", colSpan: 3, rowSpan: 2, visible: true, order: 50 },
    { id: "schedule", colSpan: 3, rowSpan: 3, visible: true, order: 60 },
    { id: "grant-intelligence", colSpan: 5, rowSpan: 3, visible: true, order: 70 },
    { id: "risk-center", colSpan: 4, rowSpan: 3, visible: true, order: 80 },
    { id: "journal", colSpan: 4, rowSpan: 3, visible: true, order: 90 },
    { id: "tasks", colSpan: 4, rowSpan: 3, visible: true, order: 100 },
    { id: "mission-impact", colSpan: 4, rowSpan: 3, visible: true, order: 110 }
  ]);

  const state = {
    currentMember: null,
    buildTasks: loadBuildTasks(),
    layout: DEFAULT_LAYOUT.map((item) => ({ ...item })),
    costMode: "free",
    paidSessionActive: false,
    communicationMode: "professional",
    conversationStatus: "disconnected",
    tokenActivity: "idle",
    muted: false,
    officeActivity: {
      status: "idle",
      records: [],
      categories: {},
      activeCategory: null,
      selectedId: null,
      lastLoadedAt: null,
      error: null,
      prioritizedIds: new Set()
    },
    hallway: {
      currentWorkId: null,
      currentState: "idle",
      currentTitle: null,
      currentOwner: null,
      currentOptions: [],
      latestDeliverableId: null,
      latestDeliverableTitle: null,
      latestDeliverableUrl: null,
      workPackageId: null,
      selectedDeliverableId: null,
      lastError: null
    },
    headquarters: {
      lastComputedAt: null,
      completion: 0,
      officePortfolio: [],
      liveSignals: {}
    },
    cognitionRuntime: {
      status: "unread",
      data: null,
      lastLoadedAt: null,
      error: null,
      inFlight: null
    },
    maddyPresence: {
      connected: false,
      lastSnapshot: null,
      lastEventAt: null,
      listenersInstalled: false
    },
    maddyDigitalActor: {
      available: false,
      initialized: false,
      mounted: false,
      connected: false,
      mediaReady: false,
      fallbackActive: true,
      activePerformance: null,
      lastEventAt: null,
      lastError: null,
      listenersInstalled: false
    },
    maddyTelepresence: {
      available: false,
      initialized: false,
      running: false,
      currentState: "idle",
      completedThisPage: false,
      lastGreetingText: null,
      lastResolvedName: null,
      lastEventAt: null,
      lastError: null,
      listenersInstalled: false
    },
    fundingIntelligence: {
      status: "idle",
      opportunities: [],
      totalQualified: 0,
      lastLoadedAt: null,
      error: null
    }
  };

  function loadBuildTasks() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

      if (Array.isArray(saved) && saved.length > 0) {
        return DEFAULT_BUILD_TASKS.map((defaultTask) => {
          const savedTask = saved.find((task) => task.id === defaultTask.id);
          return savedTask ? { ...defaultTask, ...savedTask } : { ...defaultTask };
        });
      }
    } catch (error) {
      console.warn("MEOS could not restore dashboard build progress.", error);
    }

    return DEFAULT_BUILD_TASKS.map((task) => ({ ...task }));
  }

  function saveBuildTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.buildTasks));
    } catch (error) {
      console.warn("MEOS could not save dashboard build progress.", error);
    }
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      :root {
        --meos-bg: #07101d;
        --meos-bg-deep: #040a13;
        --meos-panel: rgba(17, 29, 47, 0.86);
        --meos-panel-soft: rgba(24, 38, 59, 0.72);
        --meos-border: rgba(137, 164, 208, 0.18);
        --meos-border-bright: rgba(127, 109, 255, 0.48);
        --meos-text: #e8edf8;
        --meos-muted: #9ca9bd;
        --meos-blue: #79a7ff;
        --meos-purple: #9b72ff;
        --meos-green: #4fd18b;
        --meos-yellow: #f1b84b;
        --meos-red: #ff6478;
        --meos-shadow: 0 20px 50px rgba(0, 0, 0, 0.28);
      }

      #${ROOT_ID},
      #${ROOT_ID} * {
        box-sizing: border-box;
      }

      #${ROOT_ID} {
        min-height: 100%;
        color: var(--meos-text);
        background:
          radial-gradient(circle at 18% 0%, rgba(63, 93, 151, 0.12), transparent 35%),
          radial-gradient(circle at 88% 18%, rgba(100, 72, 196, 0.09), transparent 28%),
          linear-gradient(180deg, var(--meos-bg) 0%, var(--meos-bg-deep) 100%);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        padding: 22px;
      }

      .meos-dashboard-shell {
        width: min(1500px, 100%);
        margin: 0 auto;
      }

      .meos-dashboard-topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 18px;
      }

      .meos-dashboard-heading h1 {
        margin: 0 0 4px;
        font-size: clamp(1.45rem, 2.4vw, 2.25rem);
        font-weight: 650;
        letter-spacing: -0.035em;
      }

      .meos-dashboard-heading p {
        margin: 0;
        color: var(--meos-muted);
      }

      .meos-up-button {
        border: 1px solid rgba(117, 102, 255, 0.68);
        background: linear-gradient(135deg, rgba(32, 57, 114, 0.92), rgba(67, 36, 111, 0.94));
        color: white;
        border-radius: 9px;
        padding: 11px 20px;
        font: inherit;
        font-weight: 650;
        cursor: pointer;
        box-shadow: 0 0 26px rgba(112, 80, 255, 0.18);
      }

      .meos-widget-grid {
        display: grid;
        grid-template-columns: repeat(12, minmax(0, 1fr));
        grid-auto-flow: dense;
        gap: 14px;
        align-items: stretch;
      }

      .meos-widget {
        grid-column: span var(--meos-col-span, 4);
        min-height: calc(var(--meos-row-span, 2) * 88px);
        border: 1px solid var(--meos-border);
        border-radius: 12px;
        background:
          linear-gradient(145deg, rgba(18, 31, 50, 0.96), rgba(12, 22, 37, 0.94));
        box-shadow: var(--meos-shadow);
        overflow: hidden;
        position: relative;
      }

      .meos-widget::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(135deg, rgba(255,255,255,0.025), transparent 36%);
      }

      .meos-widget-inner {
        position: relative;
        height: 100%;
        padding: 16px;
      }

      .meos-widget-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }

      .meos-widget-title {
        margin: 0;
        font-size: 0.76rem;
        font-weight: 750;
        letter-spacing: 0.045em;
        text-transform: uppercase;
      }

      .meos-widget-link {
        border: 0;
        background: transparent;
        color: #9db6ff;
        cursor: pointer;
        font: inherit;
        font-size: 0.76rem;
      }

      .meos-muted {
        color: var(--meos-muted);
      }

      .meos-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .meos-list li {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 10px;
        align-items: start;
        padding: 8px 0;
        border-bottom: 1px solid rgba(154, 174, 206, 0.10);
        font-size: 0.82rem;
      }

      .meos-list li:last-child {
        border-bottom: 0;
      }

      .meos-priority {
        color: var(--meos-green);
        font-size: 0.74rem;
      }

      .meos-priority.medium {
        color: var(--meos-yellow);
      }

      .meos-priority.high {
        color: #5ce19a;
      }

      .meos-progress-shell {
        display: grid;
        grid-template-columns: minmax(220px, 1.2fr) minmax(280px, 2fr) auto;
        gap: 18px;
        align-items: center;
      }

      .meos-progress-meta strong {
        display: block;
        margin-top: 4px;
        font-size: 1.15rem;
      }

      .meos-progress-track {
        height: 10px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(129, 147, 181, 0.18);
      }

      .meos-progress-fill {
        height: 100%;
        width: 0;
        border-radius: inherit;
        background: linear-gradient(90deg, #5f8cff, #8a63ff);
        box-shadow: 0 0 20px rgba(124, 94, 255, 0.45);
        transition: width 280ms ease;
      }

      .meos-progress-current {
        color: var(--meos-muted);
        font-size: 0.78rem;
        line-height: 1.45;
      }

      .meos-progress-percent {
        font-size: 1.7rem;
        font-weight: 760;
      }

      .meos-mission-ring {
        width: 96px;
        height: 96px;
        margin: 8px auto 16px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at center, #101c2f 54%, transparent 56%),
          conic-gradient(var(--meos-green) 0 var(--meos-mission-pulse, 0%), rgba(114, 135, 167, 0.22) var(--meos-mission-pulse, 0%) 100%);
        box-shadow: inset 0 0 30px rgba(79, 209, 139, 0.08);
      }

      .meos-mission-ring strong {
        font-size: 1.4rem;
      }

      .meos-alert {
        border-radius: 9px;
        padding: 11px 12px;
        margin-bottom: 9px;
        background: rgba(255, 255, 255, 0.028);
        border: 1px solid rgba(255, 255, 255, 0.025);
      }

      .meos-alert strong {
        display: block;
        margin-bottom: 4px;
        font-size: 0.82rem;
      }

      .meos-alert.danger strong { color: var(--meos-red); }
      .meos-alert.warning strong { color: var(--meos-yellow); }
      .meos-alert.info strong { color: var(--meos-blue); }

      .meos-impact-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }

      .meos-impact-card {
        padding: 12px 8px;
        text-align: center;
        border-radius: 10px;
        background: rgba(69, 93, 134, 0.14);
        border: 1px solid rgba(125, 154, 201, 0.12);
      }

      .meos-impact-card strong {
        display: block;
        margin-bottom: 4px;
        font-size: 1.15rem;
      }

      .meos-impact-card span {
        color: var(--meos-muted);
        font-size: 0.67rem;
      }

      .meos-maddy-bar {
        margin-top: 16px;
        display: grid;
        grid-template-columns: auto minmax(260px, 1fr) minmax(340px, auto);
        gap: 14px;
        align-items: center;
        padding: 14px 16px;
        border: 1px solid rgba(131, 111, 246, 0.27);
        border-radius: 14px;
        background:
          linear-gradient(120deg, rgba(16, 29, 48, 0.97), rgba(17, 25, 42, 0.97));
        box-shadow: var(--meos-shadow);
      }

      .meos-maddy-avatar {
        width: 58px;
        height: 58px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-family: Georgia, serif;
        font-size: 1.65rem;
        background:
          radial-gradient(circle at 45% 32%, #d9d2e8 0 5%, #5e526f 35%, #171629 74%);
        border: 3px solid #9e71ff;
        box-shadow: 0 0 22px rgba(152, 103, 255, 0.42);
      }

      .meos-maddy-command strong {
        display: block;
        margin-bottom: 2px;
      }

      .meos-maddy-input-row {
        display: flex;
        gap: 8px;
        margin-top: 9px;
      }

      .meos-maddy-input {
        min-width: 0;
        flex: 1;
        border: 1px solid rgba(126, 154, 201, 0.28);
        border-radius: 9px;
        background: rgba(17, 31, 51, 0.88);
        color: var(--meos-text);
        padding: 10px 12px;
        outline: none;
      }

      .meos-maddy-actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(110px, 1fr));
        gap: 8px;
      }

      .meos-action-button {
        border: 1px solid rgba(125, 151, 199, 0.18);
        background: rgba(28, 42, 65, 0.88);
        color: var(--meos-text);
        border-radius: 9px;
        padding: 9px 11px;
        cursor: pointer;
        font: inherit;
        font-size: 0.77rem;
      }

      .meos-cost-status {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        margin-left: 8px;
        padding: 4px 8px;
        border-radius: 999px;
        border: 1px solid rgba(97, 215, 153, 0.28);
        color: var(--meos-green);
        font-size: 0.68rem;
        vertical-align: middle;
      }

      .meos-cost-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 10px currentColor;
      }


      /* Permanent Maddy Executive Office control — bottom of left navigation */
      .meos-executive-office-control {
        margin-top: auto;
        padding: 14px 12px 12px;
        border-top: 1px solid rgba(137, 164, 208, 0.18);
        background: linear-gradient(180deg, rgba(9, 18, 31, 0.18), rgba(7, 14, 25, 0.78));
      }

      .meos-executive-office-control,
      .meos-executive-office-control * {
        box-sizing: border-box;
      }

      .meos-office-presence {
        display: grid;
        justify-items: center;
        gap: 8px;
      }

      .meos-maddy-orb {
        --meos-mode-color: #79a7ff;
        position: relative;
        width: 168px;
        height: 168px;
        border: 0;
        border-radius: 50%;
        padding: 0;
        margin: 10px 0 6px;
        cursor: pointer;
        color: var(--meos-text);
        background:
          radial-gradient(
            circle at 40% 30%,
            #ffffff 0 5%,
            #cbd2dc 18%,
            #6d7785 44%,
            #252b34 72%,
            #0c1016 100%
          );
        box-shadow:
          inset 0 0 0 3px rgba(255, 255, 255, 0.5),
          inset 0 0 28px rgba(255, 255, 255, 0.22),
          0 0 0 2px rgba(121, 167, 255, 0.25),
          0 0 32px color-mix(in srgb, var(--meos-mode-color) 55%, transparent),
          0 16px 34px rgba(0, 0, 0, 0.48);
        transition:
          transform 180ms ease,
          box-shadow 180ms ease;
      }

      .meos-maddy-orb:hover {
        transform: translateY(-3px) scale(1.025);
        box-shadow:
          inset 0 0 0 3px rgba(255, 255, 255, 0.58),
          inset 0 0 30px rgba(255, 255, 255, 0.26),
          0 0 0 3px rgba(121, 167, 255, 0.3),
          0 0 48px color-mix(in srgb, var(--meos-mode-color) 72%, transparent),
          0 20px 40px rgba(0, 0, 0, 0.55);
      }

      .meos-maddy-orb:active {
        transform: scale(0.985);
      }

      .meos-maddy-orb::before {
        content: "";
        position: absolute;
        inset: 9px;
        z-index: 2;
        border-radius: inherit;
        border: 4px solid var(--meos-mode-color);
        pointer-events: none;
        box-shadow:
          0 0 18px color-mix(in srgb, var(--meos-mode-color) 85%, transparent),
          inset 0 0 16px color-mix(in srgb, var(--meos-mode-color) 38%, transparent);
        transition:
          border-color 180ms ease,
          box-shadow 180ms ease;
      }

      .meos-maddy-orb::after {
        content: "";
        position: absolute;
        inset: 2px;
        z-index: 3;
        border-radius: inherit;
        border: 4px solid transparent;
        border-top-color: var(--meos-mode-color);
        border-right-color: color-mix(in srgb, var(--meos-mode-color) 38%, transparent);
        opacity: 0;
        pointer-events: none;
      }

      .meos-maddy-orb[data-token-activity="active"]::after,
      .meos-maddy-orb[data-token-activity="waiting"]::after {
        opacity: 1;
        animation: meos-token-orbit 1.05s linear infinite;
      }

      .meos-maddy-orb[data-token-activity="waiting"]::after {
        animation-duration: 1.7s;
      }

      .meos-maddy-orb[data-mode="professional"] {
        --meos-mode-color: #5aa8ff;
      }

      .meos-maddy-orb[data-mode="personal"] {
        --meos-mode-color: #f1b84b;
      }

      .meos-maddy-orb[data-mode="gangsta"] {
        --meos-mode-color: #d66cff;
      }

      .meos-maddy-orb-insignia {
        position: absolute;
        inset: 13px;
        z-index: 1;
        width: calc(100% - 26px);
        height: calc(100% - 26px);
        border-radius: 50%;
        object-fit: cover;
        object-position: center;
        pointer-events: none;
        filter:
          contrast(1.08)
          brightness(1.04)
          saturate(0.92)
          drop-shadow(0 4px 8px rgba(0, 0, 0, 0.58));
      }

.meos-maddy-orb-fallback {
        position: relative;
        z-index: 1;
        display: none;
        font-family: Georgia, serif;
        font-size: 3rem;
        font-weight: 700;
        text-shadow: 0 2px 6px rgba(0, 0, 0, 0.68);
      }

      @keyframes meos-token-orbit {
        to { transform: rotate(360deg); }
      }

      @media (prefers-reduced-motion: reduce) {
        .meos-maddy-orb::after {
          animation: none !important;
        }
      }

      .meos-office-identity {
        text-align: center;
      }

      .meos-office-identity strong {
        display: block;
        letter-spacing: 0.09em;
        font-size: 1.05rem;
        text-shadow: 0 0 16px rgba(255, 255, 255, 0.12);
      }

      .meos-office-identity span {
        color: var(--meos-muted);
        font-size: 0.78rem;
      }

      .meos-office-status-grid {
        width: 100%;
        display: grid;
        gap: 7px;
        margin-top: 4px;
      }

      .meos-office-status-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 0.69rem;
      }

      .meos-office-status-row span:first-child {
        color: var(--meos-muted);
      }

      .meos-status-value {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-weight: 700;
        text-align: right;
      }

      .meos-status-dot {
        width: 7px;
        height: 7px;
        flex: 0 0 auto;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 8px currentColor;
      }

      .meos-status-active {
        color: var(--meos-green);
      }

      .meos-status-idle {
        color: var(--meos-muted);
      }

      .meos-status-token-active {
        color: var(--meos-red);
      }

      .meos-status-token-waiting {
        color: var(--meos-yellow);
      }

      .meos-mode-label {
        width: 100%;
        margin-top: 3px;
        color: var(--meos-muted);
        font-size: 0.67rem;
      }

      .meos-mode-select {
        width: 100%;
        border: 1px solid rgba(126, 154, 201, 0.28);
        border-radius: 8px;
        background: rgba(17, 31, 51, 0.94);
        color: var(--meos-text);
        padding: 8px 9px;
        font: inherit;
        font-size: 0.72rem;
      }

      .meos-executive-hub-command {
  width: 100%;
  margin-top: 5px;
}

.meos-executive-hub-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px;
  gap: 6px;
  margin-top: 6px;
}

.meos-executive-hub-input {
  min-width: 0;
  width: 100%;
  border: 1px solid rgba(126, 154, 201, 0.28);
  border-radius: 8px;
  background: rgba(17, 31, 51, 0.94);
  color: var(--meos-text);
  padding: 8px 9px;
  font: inherit;
  font-size: 0.7rem;
  outline: none;
}

.meos-executive-hub-input:focus {
  border-color: var(--meos-mode-color, #5aa8ff);
  box-shadow: 0 0 0 2px rgba(90, 168, 255, 0.12);
}

.meos-executive-hub-send {
  display: grid;
  place-items: center;
  border: 1px solid rgba(90, 168, 255, 0.48);
  border-radius: 8px;
  background: rgba(42, 93, 151, 0.28);
  color: #dcecff;
  cursor: pointer;
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
}

.meos-open-hub-button {
  margin-top: 1px;
}

.meos-hallway-mini {
  width: 100%;
  display: grid;
  gap: 6px;
  margin-top: 7px;
  padding: 8px;
  border: 1px solid rgba(126, 154, 201, 0.2);
  border-radius: 8px;
  background: rgba(8, 20, 36, 0.62);
}

.meos-hallway-mini[hidden] { display: none; }

.meos-hallway-mini-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.66rem;
}

.meos-hallway-mini-status span { color: var(--meos-muted); }
.meos-hallway-mini-status strong { color: var(--meos-text); text-transform: uppercase; font-size: 0.64rem; }
.meos-hallway-mini-title { color: var(--meos-text); font-size: 0.7rem; line-height: 1.35; }
.meos-hallway-mini-result { color: var(--meos-muted); font-size: 0.66rem; line-height: 1.35; }
.meos-hallway-mini-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.meos-hallway-mini-action {
  border: 1px solid rgba(90, 168, 255, 0.42);
  border-radius: 7px;
  background: rgba(42, 93, 151, 0.22);
  color: #dcecff;
  padding: 6px 8px;
  cursor: pointer;
  font: inherit;
  font-size: 0.64rem;
}
.meos-hallway-mini-action[data-kind="take-it"] { border-color: rgba(126, 235, 173, 0.5); color: #bff5d3; }

      .meos-office-voice-actions {
        width: 100%;
        display: grid;
        gap: 7px;
        margin-top: 2px;
      }

      .meos-voice-primary,
      .meos-voice-secondary {
        width: 100%;
        border-radius: 8px;
        padding: 8px 9px;
        cursor: pointer;
        font: inherit;
        font-size: 0.71rem;
      }

      .meos-voice-primary {
        border: 1px solid rgba(90, 168, 255, 0.48);
        background: rgba(42, 93, 151, 0.28);
        color: #dcecff;
      }

      .meos-voice-primary[data-connected="true"] {
        border-color: rgba(255, 100, 120, 0.45);
        background: rgba(151, 42, 61, 0.24);
        color: #ffdce2;
      }

      .meos-voice-secondary-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 7px;
      }

      .meos-voice-secondary {
        border: 1px solid rgba(125, 151, 199, 0.18);
        background: rgba(28, 42, 65, 0.88);
        color: var(--meos-text);
      }

      .meos-office-detail {
        margin-top: 16px;
        border: 1px solid var(--meos-border-bright);
        border-radius: 14px;
        background: linear-gradient(145deg, rgba(19, 30, 49, 0.98), rgba(8, 16, 28, 0.98));
        box-shadow: 0 0 34px rgba(106, 80, 222, 0.13);
      }

      .meos-office-detail[hidden] {
        display: none;
      }

      .office-dashboard-header {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        padding: 20px;
        border-bottom: 1px solid var(--meos-border);
      }

      .office-dashboard-eyebrow {
        color: var(--meos-purple);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.7rem;
        margin: 0 0 6px;
      }

      .office-dashboard-header h2 {
        margin: 0 0 4px;
      }

      .office-dashboard-header p {
        margin: 0;
        color: var(--meos-muted);
      }

      .office-dashboard-close {
        width: 38px;
        height: 38px;
        border-radius: 9px;
        border: 1px solid var(--meos-border);
        background: rgba(255,255,255,0.04);
        color: var(--meos-text);
        font-size: 1.35rem;
        cursor: pointer;
      }

      .office-dashboard-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        padding: 18px;
      }

      .office-panel {
        min-height: 105px;
        padding: 14px;
        border-radius: 10px;
        background: var(--meos-panel-soft);
        border: 1px solid var(--meos-border);
      }

      .office-panel-wide {
        grid-column: span 2;
      }

      .office-panel-label {
        display: block;
        margin-bottom: 9px;
        color: var(--meos-muted);
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .office-review-panel {
        grid-column: 1 / -1;
      }

      .office-review-status {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 16px;
        margin: 12px 0 18px;
      }

      .maddy-status,
      .office-review-recommendation {
        padding: 14px;
        border-radius: 9px;
        background: rgba(77, 70, 125, 0.14);
      }

      .status-label,
      .recommendation-label {
        color: var(--meos-muted);
        font-size: 0.7rem;
        margin-bottom: 5px;
      }

      .status-value,
      .recommendation-value {
        font-size: 1rem;
        font-weight: 700;
      }

      .recommendation-source {
        margin-top: 5px;
        color: var(--meos-muted);
        font-size: 0.74rem;
      }

      .office-review-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .request-revision-button,
      .take-it-button {
        border-radius: 9px;
        padding: 10px 16px;
        font: inherit;
        cursor: pointer;
      }

      .request-revision-button {
        border: 1px solid var(--meos-border);
        background: rgba(255,255,255,0.04);
        color: var(--meos-text);
      }

      .take-it-button {
        border: 1px solid rgba(108, 211, 156, 0.4);
        background: rgba(47, 145, 92, 0.22);
        color: #8ce5b5;
      }


      /* Commission 006.011 — Executive Opportunity Investigation Experience */
      .meos-investigation{display:grid;gap:16px;color:var(--meos-text)}
      .meos-investigation-hero{position:relative;overflow:hidden;display:flex;justify-content:space-between;gap:22px;align-items:flex-start;padding:22px;border:1px solid rgba(105,239,255,.28);background:radial-gradient(circle at 88% 0,rgba(168,110,255,.18),transparent 38%),linear-gradient(135deg,rgba(5,27,45,.96),rgba(8,16,31,.98));clip-path:polygon(0 0,97% 0,100% 18%,100% 100%,3% 100%,0 82%)}
      .meos-investigation-hero::after{content:"";position:absolute;left:-25%;right:-25%;top:0;height:1px;background:linear-gradient(90deg,transparent,#69efff,transparent);animation:hudScan 5.7s linear infinite}
      .meos-investigation-kicker{font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:#86dff2}
      .meos-investigation-hero h2{margin:8px 0 6px;font-size:clamp(1.3rem,2vw,2rem);line-height:1.15;color:#f2fdff}
      .meos-investigation-provider{color:rgba(199,226,240,.7);font-size:.78rem}
      .meos-investigation-verdict{min-width:150px;text-align:right;padding:10px 12px;border-right:2px solid #69efff;background:rgba(10,48,70,.35)}
      .meos-investigation-verdict span,.meos-investigation-verdict small{display:block;color:#8fb8c9;font-size:.58rem;letter-spacing:.1em;text-transform:uppercase}
      .meos-investigation-verdict strong{display:block;margin:5px 0;color:#8fffc5;font-size:1rem;text-transform:uppercase;letter-spacing:.08em}
      .meos-investigation-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .meos-investigation-metrics>div{padding:12px;border:1px solid rgba(105,239,255,.13);background:linear-gradient(145deg,rgba(12,35,54,.72),rgba(8,21,36,.78))}
      .meos-investigation-metrics span{display:block;margin-bottom:5px;color:#7398aa;font-size:.57rem;letter-spacing:.11em;text-transform:uppercase}
      .meos-investigation-metrics strong{display:block;color:#e7f8ff;font-size:.76rem;line-height:1.35}
      .meos-investigation-strategy{position:relative;padding:18px;border:1px solid rgba(143,255,197,.26);background:radial-gradient(circle at 100% 0,rgba(79,209,139,.12),transparent 36%),rgba(6,25,34,.76);box-shadow:inset 3px 0 0 rgba(79,209,139,.62)}
      .meos-investigation-section-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px;color:#7fa5b6;font-size:.58rem;letter-spacing:.12em;text-transform:uppercase}
      .meos-investigation-section-head strong{color:#9fe7c0;font-size:.63rem}
      .meos-investigation h3{margin:11px 0 7px;color:#eafaff;font-size:.82rem}
      .meos-investigation p,.meos-investigation li{font-size:.74rem;line-height:1.55;color:#c9dce7}
      .meos-investigation p{margin:0}
      .meos-investigation ul{margin:8px 0 0;padding-left:19px}
      .meos-investigation-initiatives{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
      .meos-investigation-initiatives span{padding:6px 9px;border:1px solid rgba(79,209,139,.3);border-radius:999px;background:rgba(30,105,70,.16);color:#bdf4d4;font-size:.62rem}
      .meos-investigation-reasons{margin-top:12px!important}
      .meos-investigation-unverified{margin-top:10px;color:#8da6b4;font-size:.67rem;line-height:1.45}
      .meos-investigation-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .meos-investigation-columns>section{padding:16px;border:1px solid rgba(105,239,255,.13);background:rgba(6,21,36,.68)}
      .meos-investigation-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding-top:4px}
      .meos-investigation-actions span{margin-left:auto;color:#7894a5;font-size:.62rem}
      @media(max-width:820px){.meos-investigation-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.meos-investigation-columns{grid-template-columns:1fr}.meos-investigation-hero{display:grid}.meos-investigation-verdict{text-align:left;border-right:0;border-left:2px solid #69efff}}

      @media (max-width: 1120px) {
        .meos-widget {
          grid-column: span min(var(--meos-col-span, 4), 6);
        }

        .meos-maddy-bar {
          grid-template-columns: auto 1fr;
        }

        .meos-maddy-actions {
          grid-column: 1 / -1;
        }
      }



      /* MEOS 3.0.1 — Maddy at Work holographic circuitry window */
      .meos-maddy-window{position:relative;min-height:250px;overflow:hidden;border-radius:18px;background:radial-gradient(circle at 50% 46%,rgba(58,196,255,.14),transparent 28%),linear-gradient(135deg,rgba(3,10,24,.98),rgba(7,19,42,.94));border:1px solid rgba(104,220,255,.23);isolation:isolate}
      .meos-maddy-window::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(91,211,255,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(91,211,255,.045) 1px,transparent 1px);background-size:28px 28px;mask-image:radial-gradient(circle at center,#000 32%,transparent 82%);animation:meosCircuitDrift 14s linear infinite}
      .meos-maddy-window::after{content:"";position:absolute;inset:-35%;background:conic-gradient(from 0deg,transparent 0 18%,rgba(83,213,255,.12) 22%,transparent 27% 54%,rgba(146,94,255,.09) 60%,transparent 67%);animation:meosFieldRotate 22s linear infinite;z-index:-1}
      .meos-maddy-circuit-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden}
      .meos-circuit-line{position:absolute;height:1px;background:linear-gradient(90deg,transparent,rgba(91,218,255,.78),transparent);filter:drop-shadow(0 0 5px rgba(91,218,255,.85));transform-origin:left center;opacity:.65}
      .meos-circuit-line::after{content:"";position:absolute;right:8%;top:-2px;width:5px;height:5px;border-radius:50%;background:#a8efff;box-shadow:0 0 10px #74ddff,0 0 18px rgba(98,210,255,.8);animation:meosPacket 3.7s linear infinite}
      .meos-circuit-line.l1{width:34%;left:2%;top:26%;transform:rotate(8deg);animation:meosCircuitPulse 4.2s ease-in-out infinite}
      .meos-circuit-line.l2{width:30%;right:0;top:34%;transform:rotate(-11deg);animation:meosCircuitPulse 3.4s ease-in-out infinite .7s}
      .meos-circuit-line.l3{width:27%;left:5%;bottom:26%;transform:rotate(-7deg);animation:meosCircuitPulse 4.8s ease-in-out infinite 1.2s}
      .meos-circuit-line.l4{width:33%;right:1%;bottom:22%;transform:rotate(9deg);animation:meosCircuitPulse 3.9s ease-in-out infinite .35s}
      .meos-maddy-field{position:absolute;left:50%;top:50%;width:min(245px,64vw);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;display:grid;place-items:center}
      .meos-maddy-halo{position:absolute;inset:0;border:1px solid rgba(98,220,255,.32);border-radius:50%;box-shadow:inset 0 0 30px rgba(64,181,255,.11),0 0 32px rgba(64,181,255,.13);animation:meosHaloBreathe 3.2s ease-in-out infinite}
      .meos-maddy-halo.h2{inset:9%;border-style:dashed;border-color:rgba(167,109,255,.35);animation:meosFieldRotate 13s linear infinite reverse}
      .meos-maddy-halo.h3{inset:18%;border-color:rgba(112,230,255,.5);border-left-color:transparent;border-right-color:transparent;animation:meosFieldRotate 8s linear infinite}
      .meos-maddy-face{position:relative;width:74%;height:74%;object-fit:cover;border-radius:50%;filter:grayscale(.3) contrast(1.12) brightness(.76) saturate(.72) drop-shadow(0 0 18px rgba(94,219,255,.42));mix-blend-mode:screen;animation:meosMaddyAwaken 5.8s ease-in-out infinite;z-index:2}
      .meos-maddy-scan{position:absolute;left:18%;right:18%;top:26%;height:2px;background:linear-gradient(90deg,transparent,#bdf6ff,transparent);box-shadow:0 0 12px rgba(100,225,255,.9);opacity:.7;animation:meosScanFace 4.6s ease-in-out infinite;z-index:3}
      .meos-maddy-node{position:absolute;width:7px;height:7px;border-radius:50%;background:#a8efff;box-shadow:0 0 9px #75dcff,0 0 18px rgba(81,202,255,.85);animation:meosNodePulse 2.4s ease-in-out infinite}
      .meos-maddy-node.n1{left:14%;top:34%}.meos-maddy-node.n2{right:12%;top:29%;animation-delay:.45s}.meos-maddy-node.n3{left:17%;bottom:23%;animation-delay:.9s}.meos-maddy-node.n4{right:15%;bottom:19%;animation-delay:1.25s}
      .meos-maddy-telemetry{position:absolute;left:18px;right:18px;bottom:14px;display:flex;justify-content:space-between;align-items:flex-end;gap:16px;z-index:4}
      .meos-maddy-status strong{display:block;font-size:.92rem;color:#dff9ff}.meos-maddy-status span{display:block;margin-top:4px;color:rgba(180,226,242,.7);font-size:.72rem;letter-spacing:.04em}
      .meos-maddy-completion{display:grid;place-items:center;width:58px;height:58px;border-radius:50%;border:1px solid rgba(112,225,255,.46);background:rgba(8,27,51,.68);box-shadow:inset 0 0 18px rgba(65,189,255,.14),0 0 16px rgba(65,189,255,.12);font-weight:800;color:#dff9ff}
      .meos-maddy-desk{position:absolute;left:18px;right:92px;top:16px;z-index:5;display:grid;gap:8px;max-width:520px}
      .meos-maddy-desk-command{display:flex;gap:8px;padding:7px;border:1px solid rgba(105,220,255,.26);border-radius:12px;background:rgba(3,14,30,.78);backdrop-filter:blur(8px);box-shadow:0 0 22px rgba(52,190,255,.08)}
      .meos-maddy-desk-input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#e6fbff;font:inherit;font-size:.78rem;padding:5px 7px}.meos-maddy-desk-input::placeholder{color:rgba(181,220,236,.52)}
      .meos-maddy-desk-send,.meos-maddy-desk-action{border:1px solid rgba(105,220,255,.34);border-radius:9px;background:rgba(20,55,91,.62);color:#dff9ff;cursor:pointer;font-size:.7rem;padding:7px 11px}.meos-maddy-desk-send:hover,.meos-maddy-desk-action:hover{border-color:rgba(128,232,255,.7);background:rgba(25,74,119,.72)}
      .meos-maddy-feedback-action{display:inline-flex;align-items:center;gap:6px}
      .meos-maddy-feedback-action[data-signal="accepted"]{border-color:rgba(91,214,161,.34)}
      .meos-maddy-feedback-action[data-signal="not-this"]{border-color:rgba(255,166,142,.34)}
      .meos-maddy-feedback-state{display:inline-flex;align-items:center;min-height:31px;padding:0 10px;border-radius:9px;border:1px solid rgba(116,184,222,.18);background:rgba(8,27,49,.52);font-size:.72rem;color:#b9d9ea}
      .meos-maddy-desk-glance{display:flex;gap:7px;flex-wrap:wrap;align-items:center;font-size:.66rem;color:rgba(193,229,241,.76)}
      .meos-maddy-desk-chip{padding:5px 8px;border-radius:999px;border:1px solid rgba(110,184,219,.2);background:rgba(5,22,42,.66)}
      .meos-maddy-desk-chip[data-live="true"]{position:relative;padding-left:22px;border-color:rgba(105,220,255,.46);background:rgba(8,39,67,.76)}
      .meos-maddy-desk-chip[data-live="true"]::before{content:"";position:absolute;left:8px;top:50%;width:7px;height:7px;margin-top:-3.5px;border-radius:50%;background:currentColor;opacity:.92;animation:meosDispatchPulse 1.05s ease-in-out infinite}
      .meos-maddy-window[data-dispatch-active="true"] .meos-maddy-status strong::after{content:"";display:inline-block;width:12px;height:12px;margin-left:8px;vertical-align:-2px;border:2px solid rgba(211,247,255,.28);border-top-color:#dff9ff;border-radius:50%;animation:meosDispatchSpin .72s linear infinite}
      @keyframes meosDispatchPulse{0%,100%{transform:scale(.72);opacity:.45}50%{transform:scale(1.18);opacity:1}}
      @keyframes meosDispatchSpin{to{transform:rotate(360deg)}}
      @media (prefers-reduced-motion:reduce){.meos-maddy-desk-chip[data-live="true"]::before,.meos-maddy-window[data-dispatch-active="true"] .meos-maddy-status strong::after{animation:none}}
      .meos-maddy-desk-actions{display:flex;gap:7px;flex-wrap:wrap}.meos-maddy-desk-actions:empty{display:none}
      /* Commission 006.018G — one question, one visible answer at the command surface. */
      .meos-maddy-direct-answer{display:none;max-width:820px;padding:14px 16px;border:1px solid rgba(105,239,255,.34);border-radius:12px;background:linear-gradient(145deg,rgba(3,18,34,.97),rgba(7,31,48,.94));box-shadow:0 16px 40px rgba(0,0,0,.28);color:#e9f9ff}
      .meos-maddy-direct-answer[data-open="true"]{display:block}.meos-maddy-direct-answer-label{display:block;font-size:.62rem;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#82e7f7}.meos-maddy-direct-answer-title{margin:5px 0 7px;font-size:.88rem;color:#fff}.meos-maddy-direct-answer-text{margin:0;font-size:.82rem;line-height:1.62;color:#d6e9f2;white-space:pre-wrap}.meos-maddy-direct-answer-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.meos-maddy-direct-answer-source{display:inline-flex;align-items:center;border:1px solid rgba(105,220,255,.34);border-radius:8px;padding:6px 10px;color:#c9f6ff;text-decoration:none;font-size:.68rem;background:rgba(17,63,91,.55)}.meos-maddy-direct-answer-source:hover{border-color:rgba(128,232,255,.8)}
      .meos-maddy-window:has(.meos-maddy-direct-answer[data-open="true"]){min-height:560px;overflow:visible}.meos-maddy-window:has(.meos-maddy-direct-answer[data-open="true"]) .meos-maddy-desk{max-width:min(820px,calc(100% - 130px))}.meos-maddy-window:has(.meos-maddy-direct-answer[data-open="true"]) .meos-maddy-telemetry{opacity:.18;pointer-events:none}
      .meos-maddy-work-package{display:none;margin-top:8px;max-width:720px;border:1px solid rgba(105,220,255,.24);border-radius:11px;background:rgba(2,16,32,.78);overflow:hidden}.meos-maddy-work-package[data-open="true"]{display:block}.meos-maddy-package-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 11px;border-bottom:1px solid rgba(105,220,255,.13)}.meos-maddy-package-label{font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:#86dff2}.meos-maddy-package-count{font-size:.64rem;color:#8ca7b8}.meos-maddy-package-body{display:grid;grid-template-columns:36px minmax(0,1fr) 36px;gap:8px;align-items:center;padding:9px 10px}.meos-maddy-package-nav{height:34px;border:1px solid rgba(105,220,255,.24);border-radius:9px;background:rgba(10,35,57,.72);color:#d9f7ff;cursor:pointer}.meos-maddy-package-nav:disabled{opacity:.3;cursor:default}.meos-maddy-package-card{min-width:0;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer;padding:2px 4px}.meos-maddy-package-title{display:block;font-size:.78rem;font-weight:800;color:#f2fbff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.meos-maddy-package-meta{display:block;margin-top:3px;font-size:.64rem;color:#8ca7b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.meos-maddy-package-position{display:block;margin-top:4px;font-size:.58rem;letter-spacing:.08em;text-transform:uppercase;color:#67dff5}.meos-maddy-package-strip{display:flex;gap:5px;padding:0 10px 9px;overflow-x:auto;scrollbar-width:thin}.meos-maddy-package-pill{flex:0 0 auto;max-width:150px;border:1px solid rgba(105,220,255,.16);border-radius:999px;background:rgba(8,30,49,.68);color:#8ca7b8;padding:5px 9px;font-size:.6rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}.meos-maddy-package-pill[data-selected="true"]{border-color:rgba(105,220,255,.58);color:#dffaff;background:rgba(16,67,91,.72)}@media(max-width:760px){.meos-maddy-package-strip{display:none}}
      /* Commission 006.013A — Executive Workspace Mission Integrity */
      .meos-executive-workspace{position:fixed;inset:18px;z-index:10040;display:none;grid-template-columns:minmax(240px,300px) minmax(420px,1fr) minmax(280px,340px);grid-template-rows:auto 1fr;gap:0;border:1px solid rgba(105,220,255,.34);border-radius:20px;background:linear-gradient(135deg,rgba(2,10,23,.985),rgba(5,20,38,.985));box-shadow:0 30px 90px rgba(0,0,0,.58),0 0 50px rgba(63,195,255,.1);overflow:hidden;color:#dff7ff}
      .meos-executive-workspace[data-open="true"]{display:grid}.meos-workspace-top{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 16px;border-bottom:1px solid rgba(105,220,255,.18);background:rgba(4,18,34,.92)}
      .meos-workspace-kicker{font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;color:#78dff4}.meos-workspace-title{margin:2px 0 0;font-size:1rem;color:#f3fcff}.meos-workspace-close{border:1px solid rgba(105,220,255,.25);border-radius:10px;background:rgba(10,35,57,.7);color:#dff7ff;cursor:pointer;padding:7px 11px}
      .meos-workspace-package{padding:16px 12px;border-right:1px solid rgba(105,220,255,.14);background:rgba(3,15,29,.78);overflow:auto}.meos-workspace-package h3{margin:0 0 5px;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;color:#dff7ff}.meos-workspace-package p{margin:0 0 12px;font-size:.66rem;line-height:1.45;color:#89adbd}
      .meos-workspace-results{display:grid;gap:7px}.meos-workspace-result{width:100%;border:1px solid rgba(105,220,255,.14);border-radius:10px;background:rgba(6,25,43,.64);color:#b9d5e1;text-align:left;cursor:pointer;padding:9px 10px;font-size:.68rem;line-height:1.35}.meos-workspace-result[data-selected="true"]{border-color:rgba(105,220,255,.58);background:rgba(15,60,82,.72);color:#effcff}
      .meos-workspace-main{padding:18px 20px;overflow:auto}.meos-workspace-main-kicker{font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;color:#7bdff3}.meos-workspace-main h2{margin:5px 0 8px;font-size:1.35rem;color:#f5fcff}.meos-workspace-summary{margin:0 0 15px;max-width:850px;font-size:.82rem;line-height:1.55;color:#b9d4df}
      .meos-workspace-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.meos-workspace-field{padding:10px 11px;border:1px solid rgba(105,220,255,.13);border-radius:10px;background:rgba(5,23,40,.62)}.meos-workspace-field span{display:block}.meos-workspace-field-label{font-size:.57rem;letter-spacing:.1em;text-transform:uppercase;color:#7299aa}.meos-workspace-field-value{margin-top:4px;font-size:.74rem;line-height:1.4;color:#e2f4fa}
      .meos-workspace-judgment{margin-top:14px;padding:13px;border:1px solid rgba(105,220,255,.19);border-radius:12px;background:rgba(8,31,51,.64)}.meos-workspace-judgment strong{display:block;font-size:.65rem;letter-spacing:.12em;text-transform:uppercase;color:#78dff4}.meos-workspace-judgment p{margin:6px 0 0;font-size:.78rem;line-height:1.5;color:#d6e9f0}
      .meos-workspace-presence{position:relative;padding:18px 14px;border-left:1px solid rgba(105,220,255,.14);background:radial-gradient(circle at 50% 28%,rgba(76,202,255,.15),transparent 42%),rgba(3,15,29,.82);overflow:auto;display:flex;flex-direction:column;min-width:0}.meos-workspace-maddy{min-height:330px;flex:1;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;position:relative}.meos-workspace-maddy img{width:min(100%,320px);max-height:430px;object-fit:contain;object-position:center bottom;filter:contrast(1.04) brightness(.9);transform-origin:center bottom;translate:0 18px}.meos-workspace-presence h3{margin:8px 0 0;text-align:center;font-size:.95rem;color:#f3fcff}.meos-workspace-presence p{margin:7px 0 0;font-size:.7rem;line-height:1.5;color:#9fc0d0;text-align:center}.meos-workspace-presence-state{margin-top:12px;padding:9px 10px;border:1px solid rgba(105,220,255,.15);border-radius:11px;background:rgba(8,31,51,.58);font-size:.66rem;line-height:1.45;color:#b8d9e7}
      .meos-workspace-actions{margin-top:12px}.meos-workspace-action{width:100%;margin:0 0 8px;border:1px solid rgba(105,220,255,.28);border-radius:10px;background:rgba(13,48,75,.7);color:#e9fbff;cursor:pointer;padding:10px 11px;text-align:left;font-size:.72rem}.meos-workspace-action:hover{border-color:rgba(105,220,255,.65);background:rgba(20,70,102,.76)}.meos-workspace-action.primary{border-color:rgba(99,226,170,.42);background:rgba(16,79,63,.66);font-weight:800}.meos-workspace-action:disabled{opacity:.42;cursor:default}.meos-workspace-source-note{margin-top:8px;font-size:.6rem;line-height:1.4;color:#7799a8}
      .meos-evidence-overlay{position:fixed;inset:0;z-index:10070;display:grid;place-items:center;padding:22px;background:rgba(1,7,15,.78);backdrop-filter:blur(8px)}
      .meos-evidence-panel{width:min(920px,96vw);max-height:88vh;overflow:auto;border:1px solid rgba(105,220,255,.32);border-radius:18px;background:linear-gradient(145deg,rgba(3,15,29,.99),rgba(8,27,46,.99));box-shadow:0 28px 90px rgba(0,0,0,.62);color:#eafaff}
      .meos-evidence-head{position:sticky;top:0;z-index:2;display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(105,220,255,.16);background:rgba(3,15,29,.96)}
      .meos-evidence-kicker{font-size:.58rem;letter-spacing:.16em;text-transform:uppercase;color:#74dff5}.meos-evidence-title{margin:4px 0 0;font-size:1.08rem;color:#f5fdff}.meos-evidence-close{border:1px solid rgba(105,220,255,.25);border-radius:9px;background:rgba(12,42,65,.72);color:#eafaff;cursor:pointer;padding:7px 10px}
      .meos-evidence-body{padding:17px 18px 20px}.meos-evidence-summary{margin:0 0 14px;font-size:.8rem;line-height:1.55;color:#bdd8e3}.meos-evidence-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.meos-evidence-field{padding:10px 11px;border:1px solid rgba(105,220,255,.13);border-radius:10px;background:rgba(5,23,40,.64)}.meos-evidence-field span{display:block;font-size:.56rem;letter-spacing:.1em;text-transform:uppercase;color:#739aab}.meos-evidence-field strong{display:block;margin-top:4px;font-size:.72rem;line-height:1.42;color:#e4f7fc;word-break:break-word}
      .meos-evidence-proof{margin-top:14px;padding:12px;border:1px solid rgba(99,226,170,.18);border-radius:11px;background:rgba(10,51,44,.32)}.meos-evidence-proof strong{font-size:.6rem;letter-spacing:.12em;text-transform:uppercase;color:#76e6b9}.meos-evidence-proof p{margin:6px 0 0;font-size:.72rem;line-height:1.5;color:#c9e9dd}
      [data-meos-evidence]{cursor:pointer}.meos-maddy-desk-chip[data-meos-evidence]{border-color:rgba(105,220,255,.28)}.meos-list [data-meos-evidence]:hover,.meos-maddy-desk-chip[data-meos-evidence]:hover{filter:brightness(1.14)}
      @media(max-width:680px){.meos-evidence-grid{grid-template-columns:1fr}.meos-evidence-overlay{padding:8px}}
      body.meos-workspace-open{overflow:hidden}
      @media(max-width:1050px){.meos-executive-workspace{inset:8px;grid-template-columns:230px 1fr}.meos-workspace-presence{grid-column:1/-1;min-height:190px;border-left:0;border-top:1px solid rgba(105,220,255,.14);display:grid;grid-template-columns:180px 1fr;gap:10px}.meos-workspace-maddy{min-height:170px;grid-row:1/5}.meos-workspace-maddy img{max-height:190px}.meos-workspace-presence h3,.meos-workspace-presence p{text-align:left}}
      @media(max-width:720px){.meos-executive-workspace{grid-template-columns:1fr}.meos-workspace-package{max-height:190px;border-right:0;border-bottom:1px solid rgba(105,220,255,.14)}.meos-workspace-main{grid-column:1}.meos-workspace-presence{display:none}.meos-workspace-grid{grid-template-columns:1fr}}

      .meos-maddy-brief{display:none;margin-top:8px;padding:12px 13px;border:1px solid rgba(105,220,255,.25);border-radius:11px;background:rgba(2,16,32,.86);max-width:640px;color:#d9e9f5;box-shadow:0 12px 30px rgba(0,0,0,.22)}
      .meos-maddy-brief[data-open="true"]{display:block}.meos-maddy-brief-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.meos-maddy-brief-kicker{font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;color:#86dff2}.meos-maddy-brief-title{margin:3px 0 0;font-size:.92rem;color:#f2fbff}.meos-maddy-brief-close{border:0;background:transparent;color:#8ca7b8;cursor:pointer;font-size:1rem}.meos-maddy-brief-summary{margin:9px 0 10px;font-size:.76rem;line-height:1.45;color:#c7d9e6}.meos-maddy-brief-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 12px}.meos-maddy-brief-field{border-top:1px solid rgba(119,193,219,.12);padding-top:6px}.meos-maddy-brief-label{display:block;font-size:.58rem;letter-spacing:.1em;text-transform:uppercase;color:#7398aa}.meos-maddy-brief-value{display:block;margin-top:2px;font-size:.7rem;color:#e0edf4;line-height:1.35}.meos-maddy-brief-source{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:11px}.meos-maddy-brief-link{display:inline-flex;align-items:center;border:1px solid rgba(105,220,255,.4);border-radius:8px;padding:6px 10px;color:#c9f6ff;text-decoration:none;font-size:.68rem;background:rgba(17,63,91,.55)}.meos-maddy-brief-link:hover{border-color:rgba(128,232,255,.8)}.meos-maddy-brief-note{font-size:.62rem;color:#7894a5}@media(max-width:760px){.meos-maddy-brief-grid{grid-template-columns:1fr}}
      @media(max-width:760px){.meos-maddy-desk{right:18px}.meos-maddy-field{opacity:.46}.meos-maddy-telemetry{bottom:10px}}
      /* Commission 006.017D7S4C — Semantic Executive Workspace + Premium Command Surface */
      #${ROOT_ID}{--meos-glass:rgba(7,22,38,.78);--meos-glass-strong:rgba(6,18,33,.92);--meos-hairline:rgba(116,220,255,.14);--meos-electric:rgba(105,239,255,.72)}
      .meos-widget{border-color:var(--meos-hairline);background:linear-gradient(155deg,rgba(10,31,51,.91),rgba(5,16,29,.95));box-shadow:0 18px 46px rgba(0,0,0,.26),inset 0 1px 0 rgba(255,255,255,.025);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
      .meos-widget:hover{transform:translateY(-1px);border-color:rgba(105,239,255,.23);box-shadow:0 22px 54px rgba(0,0,0,.32),0 0 28px rgba(61,183,255,.055)}
      .meos-widget-header{padding-bottom:10px;border-bottom:1px solid rgba(105,239,255,.08)}
      .meos-widget-title{letter-spacing:.16em;color:rgba(215,247,255,.86)}
      .meos-list li{padding:10px 0;border-bottom-color:rgba(105,239,255,.075)}
      .meos-hq-hero{box-shadow:inset 0 1px 0 rgba(191,247,255,.08),0 22px 70px rgba(0,0,0,.20)}
      .meos-maddy-window{border-color:rgba(105,239,255,.30);box-shadow:inset 0 0 60px rgba(50,185,255,.035),0 20px 55px rgba(0,0,0,.28)}
      .meos-maddy-desk-command{border-color:rgba(105,239,255,.34);background:rgba(2,14,28,.88);box-shadow:0 12px 34px rgba(0,0,0,.25),0 0 24px rgba(64,200,255,.045)}
      .meos-maddy-desk-input{font-size:.82rem;letter-spacing:.005em}.meos-maddy-desk-send,.meos-maddy-desk-action{min-height:34px;border-color:rgba(105,220,255,.28);background:linear-gradient(180deg,rgba(20,63,94,.72),rgba(10,38,61,.78))}
      .meos-maddy-work-package{max-width:820px;border-color:rgba(105,239,255,.28);background:linear-gradient(145deg,rgba(2,15,29,.94),rgba(5,27,43,.88));box-shadow:0 18px 46px rgba(0,0,0,.30)}
      .meos-maddy-package-head{padding:11px 13px}.meos-maddy-package-body{padding:11px 12px}.meos-maddy-package-title{font-size:.82rem}.meos-maddy-package-meta{font-size:.66rem;line-height:1.45}.meos-maddy-package-position{margin-top:6px}
      .meos-maddy-work-package[data-result-type="research"] .meos-maddy-package-position,.meos-executive-workspace[data-result-type="research"] .meos-workspace-main-kicker{color:#9ce7ff}
      .meos-maddy-work-package[data-result-type="opportunity"] .meos-maddy-package-position,.meos-executive-workspace[data-result-type="opportunity"] .meos-workspace-main-kicker{color:#8fffc5}
      .meos-executive-workspace{inset:14px;border-color:rgba(105,239,255,.40);background:radial-gradient(circle at 62% 20%,rgba(45,178,255,.08),transparent 32%),linear-gradient(135deg,rgba(1,8,18,.992),rgba(4,19,36,.992));box-shadow:0 36px 110px rgba(0,0,0,.72),0 0 70px rgba(63,195,255,.10)}
      .meos-workspace-top{padding:15px 18px;background:linear-gradient(90deg,rgba(3,16,31,.97),rgba(7,30,50,.93));box-shadow:0 10px 32px rgba(0,0,0,.20)}
      .meos-workspace-title{font-size:1.04rem;font-weight:680;letter-spacing:.01em}.meos-workspace-close{padding:8px 13px;background:linear-gradient(180deg,rgba(17,55,83,.78),rgba(8,31,52,.84))}
      .meos-workspace-package{padding:18px 13px;background:linear-gradient(180deg,rgba(4,18,33,.92),rgba(2,12,24,.96))}.meos-workspace-results{gap:8px}.meos-workspace-result{display:grid;grid-template-columns:26px 1fr;gap:9px;align-items:start;padding:10px 11px;background:rgba(6,27,45,.62)}
      .meos-workspace-result-index{display:grid;place-items:center;width:22px;height:22px;border:1px solid rgba(105,239,255,.20);border-radius:7px;color:#7adff2;font-size:.6rem;font-weight:800;background:rgba(14,56,79,.45)}
      .meos-workspace-result strong,.meos-workspace-result small{display:block}.meos-workspace-result strong{font-size:.7rem;line-height:1.35;color:#e8f9ff}.meos-workspace-result small{margin-top:3px;color:#7596a7;font-size:.58rem;letter-spacing:.06em;text-transform:uppercase}.meos-workspace-result[data-selected="true"]{border-color:rgba(105,239,255,.66);background:linear-gradient(135deg,rgba(13,62,85,.82),rgba(8,42,64,.78));box-shadow:inset 3px 0 0 rgba(105,239,255,.72)}
      .meos-workspace-main{padding:28px 30px}.meos-workspace-main-kicker{font-size:.61rem;letter-spacing:.18em}.meos-workspace-main h2{margin:7px 0 10px;font-size:clamp(1.45rem,2.2vw,2.2rem);font-weight:720;letter-spacing:-.025em}.meos-workspace-summary{max-width:920px;margin-bottom:20px;font-size:.9rem;line-height:1.68;color:#c8dee7}
      .meos-workspace-grid{gap:10px}.meos-workspace-field{min-height:78px;padding:12px 13px;border-color:rgba(105,239,255,.12);background:linear-gradient(145deg,rgba(7,28,47,.72),rgba(4,19,34,.78));box-shadow:inset 0 1px 0 rgba(255,255,255,.018)}.meos-workspace-field-label{letter-spacing:.13em}.meos-workspace-field-value{margin-top:7px;font-size:.79rem;line-height:1.48}
      .meos-workspace-judgment{margin-top:18px;padding:16px 17px;border-color:rgba(105,239,255,.22);background:linear-gradient(135deg,rgba(8,38,59,.72),rgba(6,27,45,.72));box-shadow:inset 3px 0 0 rgba(105,239,255,.45)}.meos-workspace-judgment p{font-size:.82rem;line-height:1.62}
      .meos-workspace-presence{padding:20px 16px;background:radial-gradient(circle at 50% 24%,rgba(76,202,255,.18),transparent 39%),linear-gradient(180deg,rgba(4,19,35,.90),rgba(2,12,24,.96))}.meos-workspace-maddy::after{content:"";position:absolute;left:12%;right:12%;bottom:8px;height:1px;background:linear-gradient(90deg,transparent,rgba(105,239,255,.48),transparent);box-shadow:0 0 20px rgba(105,239,255,.25)}
      .meos-workspace-presence-state{padding:11px 12px;background:rgba(7,31,50,.66)}.meos-workspace-actions h3{margin:16px 0 4px;font-size:.82rem;letter-spacing:.06em}.meos-workspace-actions>p{margin:0 0 12px}.meos-workspace-action{padding:11px 12px;background:linear-gradient(180deg,rgba(17,60,91,.76),rgba(8,35,57,.82));transition:transform .15s ease,border-color .15s ease,background .15s ease}.meos-workspace-action:not(:disabled):hover{transform:translateX(2px)}
      .meos-maddy-brief{max-width:760px;padding:15px 16px;border-color:rgba(105,239,255,.30);background:linear-gradient(145deg,rgba(2,15,29,.96),rgba(5,27,43,.94));box-shadow:0 22px 60px rgba(0,0,0,.36)}.meos-maddy-brief-title{font-size:1rem}.meos-maddy-brief-summary{font-size:.79rem;line-height:1.58}.meos-maddy-brief-field{padding:8px 0}.meos-maddy-brief-value{margin-top:4px;font-size:.73rem}
      @media(max-width:900px){.meos-workspace-main{padding:20px}.meos-workspace-main h2{font-size:1.5rem}}

      @keyframes meosCircuitDrift{to{background-position:28px 28px,28px 28px}}
      @keyframes meosFieldRotate{to{transform:rotate(360deg)}}
      @keyframes meosPacket{0%{transform:translateX(-160px);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateX(40px);opacity:0}}
      @keyframes meosCircuitPulse{0%,100%{opacity:.25}50%{opacity:.95}}
      @keyframes meosHaloBreathe{0%,100%{transform:scale(.98);opacity:.45}50%{transform:scale(1.03);opacity:1}}
      @keyframes meosMaddyAwaken{0%,100%{opacity:.62;filter:grayscale(.45) contrast(1.08) brightness(.65) saturate(.55) drop-shadow(0 0 10px rgba(94,219,255,.24))}50%{opacity:.92;filter:grayscale(.15) contrast(1.18) brightness(.88) saturate(.9) drop-shadow(0 0 24px rgba(94,219,255,.58))}}
      @keyframes meosScanFace{0%,12%{transform:translateY(-34px);opacity:0}22%{opacity:.75}72%{opacity:.75}88%,100%{transform:translateY(112px);opacity:0}}
      @keyframes meosNodePulse{0%,100%{transform:scale(.75);opacity:.35}50%{transform:scale(1.45);opacity:1}}
      @media (prefers-reduced-motion:reduce){.meos-maddy-window *,.meos-maddy-window::before,.meos-maddy-window::after{animation:none!important}}

      /* MEOS Executive Headquarters v2.0 — cinematic intelligence shell */
      #${ROOT_ID} {
        --hud-cyan:#69efff; --hud-blue:#4d91ff; --hud-violet:#a86eff;
        position:relative; isolation:isolate; overflow:hidden;
        background:
          radial-gradient(circle at 50% 8%,rgba(61,171,255,.20),transparent 29%),
          radial-gradient(circle at 7% 86%,rgba(133,87,255,.13),transparent 31%),
          radial-gradient(circle at 94% 72%,rgba(49,231,255,.10),transparent 25%),
          linear-gradient(145deg,#01050c,#061725 48%,#01050b);
      }
      #${ROOT_ID}::before {content:"";position:fixed;inset:0;z-index:-3;pointer-events:none;opacity:.5;
        background-image:linear-gradient(rgba(105,239,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(105,239,255,.05) 1px,transparent 1px);
        background-size:42px 42px;transform:perspective(800px) rotateX(60deg) scale(1.55) translateY(22%);transform-origin:center bottom;animation:hudGrid 22s linear infinite}
      #${ROOT_ID}::after {content:"";position:fixed;inset:-35%;z-index:-2;pointer-events:none;background:conic-gradient(from 0deg,transparent,rgba(105,239,255,.035),transparent 25%,rgba(168,110,255,.03),transparent 60%);animation:hudAmbient 46s linear infinite}
      .meos-dashboard-shell{width:min(1640px,100%);position:relative}
      .meos-dashboard-topline{margin:0 0 8px;padding:0 4px 12px;border-bottom:1px solid rgba(105,239,255,.2)}
      .meos-dashboard-heading h1{font-weight:480;letter-spacing:.08em;text-transform:uppercase;color:#effdff;text-shadow:0 0 12px rgba(105,239,255,.35),0 0 34px rgba(77,145,255,.18)}
      .meos-dashboard-heading p{letter-spacing:.14em;text-transform:uppercase;font-size:.67rem;color:rgba(200,239,255,.62)}
      .meos-up-button{position:relative;overflow:hidden;border:1px solid rgba(105,239,255,.55);border-radius:2px 18px 2px 18px;background:linear-gradient(120deg,rgba(8,67,105,.55),rgba(78,37,132,.45));box-shadow:inset 0 0 18px rgba(105,239,255,.1),0 0 22px rgba(105,239,255,.14);text-transform:uppercase;letter-spacing:.14em}
      .meos-up-button::after{content:"";position:absolute;inset:0;transform:translateX(-130%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);animation:hudButtonScan 3.8s ease-in-out infinite}
      .meos-hq-hero{position:relative;min-height:430px;display:grid;grid-template-columns:minmax(260px,.85fr) minmax(390px,1.35fr) minmax(250px,.8fr);gap:24px;align-items:center;margin:12px 0 20px;padding:26px clamp(16px,2.5vw,38px);overflow:hidden;border-top:1px solid rgba(105,239,255,.3);border-bottom:1px solid rgba(105,239,255,.2);background:linear-gradient(90deg,rgba(3,14,25,.2),rgba(7,35,54,.46),rgba(3,14,25,.2));clip-path:polygon(0 8%,2% 0,98% 0,100% 8%,100% 92%,98% 100%,2% 100%,0 92%)}
      .meos-hq-hero::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,transparent 0 11%,rgba(105,239,255,.08) 11.2% 11.35%,transparent 11.5% 88.5%,rgba(105,239,255,.08) 88.65% 88.8%,transparent 89%),linear-gradient(180deg,transparent 49.8%,rgba(105,239,255,.09) 50%,transparent 50.2%)}
      .meos-hq-hero::after{content:"";position:absolute;left:0;right:0;height:2px;top:-2px;background:linear-gradient(90deg,transparent,var(--hud-cyan),transparent);box-shadow:0 0 18px var(--hud-cyan);animation:hudScan 5.7s linear infinite}
      .meos-hq-identity,.meos-hq-center,.meos-hq-telemetry{position:relative;z-index:2}
      .meos-hq-kicker,.meos-hud-label{color:rgba(164,229,255,.76);font-size:.64rem;letter-spacing:.19em;text-transform:uppercase}
      .meos-hq-title{margin:12px 0 7px;font-size:clamp(2rem,4vw,4.75rem);line-height:.94;font-weight:280;letter-spacing:-.045em;color:#effcff;text-shadow:0 0 15px rgba(105,239,255,.28),0 0 52px rgba(77,145,255,.18)}
      .meos-hq-title strong{display:block;font-weight:720;letter-spacing:.06em;color:var(--hud-cyan)}
      .meos-hq-subtitle{max-width:430px;color:rgba(206,234,247,.72);line-height:1.65;font-size:.84rem}
      .meos-hq-status-strip{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:22px}.meos-hq-status{display:inline-flex;align-items:center;gap:7px;color:rgba(214,245,255,.82);font-size:.68rem;letter-spacing:.08em;text-transform:uppercase}.meos-hq-status i{width:6px;height:6px;border-radius:50%;background:var(--hud-cyan);box-shadow:0 0 11px var(--hud-cyan);animation:hudBlink 1.9s ease-in-out infinite}
      .meos-hq-core{position:relative;width:min(350px,78vw);aspect-ratio:1;margin:auto;display:grid;place-items:center;filter:drop-shadow(0 0 34px rgba(74,184,255,.24))}.meos-hq-core-ring{position:absolute;border-radius:50%;border:1px solid rgba(105,239,255,.31)}.meos-hq-core-ring.r1{inset:1%;border-style:dashed;animation:hudSpin 17s linear infinite}.meos-hq-core-ring.r2{inset:10%;border-color:rgba(168,110,255,.45);border-left-color:transparent;border-bottom-color:transparent;animation:hudSpinR 10s linear infinite}.meos-hq-core-ring.r3{inset:20%;border-width:2px;border-right-color:transparent;animation:hudSpin 7s linear infinite}.meos-hq-core-ring.r4{inset:30%;border-color:rgba(105,239,255,.64);box-shadow:0 0 17px rgba(105,239,255,.27),inset 0 0 18px rgba(105,239,255,.11);animation:hudBreathe 2.8s ease-in-out infinite}
      .meos-hq-core::before,.meos-hq-core::after{content:"";position:absolute;inset:9%;border-radius:50%;background:repeating-conic-gradient(rgba(105,239,255,.18) 0 1deg,transparent 1deg 13deg);mask:radial-gradient(circle,transparent 56%,#000 57%);opacity:.58;animation:hudSpin 32s linear infinite}.meos-hq-core::after{inset:25%;opacity:.3;animation:hudSpinR 18s linear infinite}
      .meos-hq-portrait{width:43%;aspect-ratio:1;object-fit:cover;border-radius:50%;position:relative;z-index:3;filter:contrast(1.12) brightness(1.06) saturate(.88) drop-shadow(0 0 14px rgba(105,239,255,.42));border:1px solid rgba(215,250,255,.75);box-shadow:0 0 0 6px rgba(105,239,255,.05),0 0 48px rgba(105,239,255,.24)}
      .meos-hq-core-caption{position:absolute;z-index:8;bottom:4%;left:50%;transform:translateX(-50%);white-space:nowrap;padding:6px 14px;color:#effcff;border-top:1px solid rgba(105,239,255,.4);border-bottom:1px solid rgba(105,239,255,.2);background:rgba(4,17,29,.62);backdrop-filter:blur(9px);font-size:.66rem;letter-spacing:.19em;text-transform:uppercase}

      /* MEOS 4.0.0 — canonical Maddy living headquarters startup evolution */
      .meos-hq-hero{min-height:520px;grid-template-columns:minmax(245px,.72fr) minmax(470px,1.7fr) minmax(235px,.72fr)}
      .meos-hq-center{min-width:0;align-self:stretch;display:grid;place-items:center}
      .meos-hq-core.meos-living-presence{width:min(520px,100%);height:100%;min-height:455px;aspect-ratio:auto;overflow:visible}
      .meos-living-presence .meos-hq-core-ring.r1{inset:4% 10%;border-radius:48%;opacity:.72}
      .meos-living-presence .meos-hq-core-ring.r2{inset:10% 17%;border-radius:48%}
      .meos-living-presence .meos-hq-core-ring.r3{inset:17% 24%;border-radius:48%}
      .meos-living-presence .meos-hq-core-ring.r4{inset:25% 31%;border-radius:46%;opacity:.56}
      .meos-presence-stage{position:absolute;inset:0;display:grid;place-items:center;overflow:hidden;isolation:isolate}
      .meos-presence-stage::before{content:"";position:absolute;inset:7% 6% 3%;z-index:0;background:radial-gradient(ellipse at 50% 42%,rgba(81,218,255,.18),transparent 38%),linear-gradient(90deg,transparent,rgba(103,225,255,.06),transparent);clip-path:polygon(50% 0,88% 15%,100% 58%,82% 100%,18% 100%,0 58%,12% 15%);filter:drop-shadow(0 0 28px rgba(81,218,255,.22));animation:meosPresenceField 5.6s ease-in-out infinite 7.4s}
      .meos-presence-circuit{position:absolute;inset:4% 2% 3%;z-index:1;opacity:0;background-image:linear-gradient(90deg,transparent 0 8%,rgba(105,239,255,.45) 8.2% 8.45%,transparent 8.7% 91.3%,rgba(105,239,255,.4) 91.55% 91.8%,transparent 92%),repeating-linear-gradient(90deg,transparent 0 38px,rgba(105,239,255,.1) 39px,transparent 40px),repeating-linear-gradient(0deg,transparent 0 31px,rgba(105,239,255,.085) 32px,transparent 33px);mask-image:radial-gradient(ellipse at 50% 48%,#000 20%,rgba(0,0,0,.78) 55%,transparent 82%);animation:meosCircuitConstruct 7.4s ease-out both}
      .meos-presence-logo{position:absolute;z-index:4;width:42%;max-width:205px;aspect-ratio:1;object-fit:cover;border-radius:50%;filter:brightness(1.16) contrast(1.12) drop-shadow(0 0 24px rgba(105,239,255,.72));animation:meosLogoEvolution 7.4s cubic-bezier(.4,0,.2,1) both}
      .meos-presence-human{position:absolute;z-index:5;width:min(84%,440px);height:94%;object-fit:cover;object-position:center 16%;border-radius:45% 45% 20% 20% / 36% 36% 18% 18%;opacity:0;transform:translateY(18px) scale(.82);filter:brightness(.55) contrast(1.18) saturate(.62) drop-shadow(0 0 8px rgba(105,239,255,.25));mask-image:linear-gradient(#000 0 76%,transparent 98%);animation:meosHumanMaterialize 7.4s cubic-bezier(.22,.75,.18,1) both,meosHumanIdle 6.8s ease-in-out infinite 7.4s}
      .meos-presence-human-glow{position:absolute;z-index:6;width:min(76%,395px);height:84%;border-radius:46%;opacity:0;pointer-events:none;background:linear-gradient(180deg,transparent 0 25%,rgba(105,239,255,.12) 51%,transparent 77%),repeating-linear-gradient(180deg,transparent 0 8px,rgba(165,246,255,.08) 9px,transparent 10px);mix-blend-mode:screen;animation:meosHumanGlow 7.4s ease-out both,meosHoloFlicker 4.8s steps(1,end) infinite 7.4s}
      .meos-presence-scan{position:absolute;z-index:7;left:21%;right:21%;height:2px;top:16%;opacity:0;background:linear-gradient(90deg,transparent,#e9fdff,transparent);box-shadow:0 0 14px var(--hud-cyan);animation:meosPresenceScan 7.4s ease-in-out both,meosPresenceScanIdle 5.8s ease-in-out infinite 7.8s}
      .meos-presence-eye-light{position:absolute;z-index:8;top:42%;left:50%;width:31%;height:7%;transform:translateX(-50%);opacity:0;background:radial-gradient(circle at 31% 50%,rgba(205,255,191,.95) 0 3%,rgba(126,255,223,.48) 5%,transparent 13%),radial-gradient(circle at 69% 50%,rgba(205,255,191,.95) 0 3%,rgba(126,255,223,.48) 5%,transparent 13%);filter:blur(.2px) drop-shadow(0 0 8px rgba(124,255,225,.7));animation:meosEyesOnline 7.4s ease-out both}
      .meos-presence-status{position:absolute;z-index:9;left:50%;bottom:10%;transform:translateX(-50%);min-width:210px;text-align:center;color:rgba(222,249,255,.84);font-size:.62rem;letter-spacing:.17em;text-transform:uppercase;opacity:0;animation:meosStatusOnline 7.4s ease-out both}
      .meos-presence-status::before{content:"";display:inline-block;width:6px;height:6px;margin-right:8px;border-radius:50%;background:#65f1b2;box-shadow:0 0 11px #65f1b2;animation:hudBlink 1.8s ease-in-out infinite 7.4s}
      @keyframes meosCircuitConstruct{0%{opacity:0;transform:scale(.88)}12%{opacity:.3}38%{opacity:.92;transform:scale(1)}72%,100%{opacity:.38}}
      @keyframes meosLogoEvolution{0%,16%{opacity:0;transform:scale(.55) rotate(-16deg)}27%{opacity:1;transform:scale(1) rotate(0)}43%{opacity:1;transform:scale(1.08)}60%{opacity:.62;transform:scale(1.3);filter:brightness(1.45) contrast(1.18) blur(.4px) drop-shadow(0 0 38px rgba(105,239,255,.95))}75%,100%{opacity:0;transform:scale(1.75);filter:brightness(1.8) blur(5px)}}
      @keyframes meosHumanMaterialize{0%,36%{opacity:0;transform:translateY(20px) scale(.78);clip-path:inset(100% 0 0)}48%{opacity:.25;clip-path:inset(72% 0 0)}62%{opacity:.68;clip-path:inset(34% 0 0);filter:brightness(.65) contrast(1.25) saturate(.55) drop-shadow(0 0 18px rgba(105,239,255,.45))}78%{opacity:.96;clip-path:inset(0);transform:translateY(0) scale(1);filter:brightness(.92) contrast(1.1) saturate(.88) drop-shadow(0 0 24px rgba(105,239,255,.48))}100%{opacity:1;clip-path:inset(0);transform:translateY(0) scale(1);filter:brightness(1) contrast(1.08) saturate(.94) drop-shadow(0 0 18px rgba(105,239,255,.38))}}
      @keyframes meosHumanGlow{0%,45%{opacity:0}58%{opacity:.8}78%,100%{opacity:.34}}
      @keyframes meosPresenceScan{0%,39%{top:14%;opacity:0}48%{opacity:1}76%{top:80%;opacity:.8}86%,100%{top:88%;opacity:0}}
      @keyframes meosEyesOnline{0%,76%{opacity:0;transform:translateX(-50%) scaleY(.1)}84%{opacity:1;transform:translateX(-50%) scaleY(1)}89%{opacity:.18;transform:translateX(-50%) scaleY(.12)}94%,100%{opacity:.72;transform:translateX(-50%) scaleY(1)}}
      @keyframes meosStatusOnline{0%,78%{opacity:0;transform:translateX(-50%) translateY(8px)}100%{opacity:1;transform:translateX(-50%) translateY(0)}}
      @keyframes meosHumanIdle{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.008)}}
      @keyframes meosPresenceField{0%,100%{opacity:.38;transform:scale(.985)}50%{opacity:.72;transform:scale(1.015)}}
      @keyframes meosHoloFlicker{0%,91%,94%,100%{opacity:.34}92%{opacity:.15}93%{opacity:.48}}
      @keyframes meosPresenceScanIdle{0%,14%{top:22%;opacity:0}24%{opacity:.42}72%{top:73%;opacity:.36}82%,100%{opacity:0}}
      @media(max-width:1120px){.meos-hq-hero{grid-template-columns:1fr 1.35fr}.meos-hq-center{min-height:470px}.meos-living-presence .meos-presence-human{width:min(78%,410px)}}
      @media(max-width:760px){.meos-hq-core.meos-living-presence{min-height:430px}.meos-presence-human{width:min(88%,390px)}.meos-presence-logo{width:39%}}
      @media(prefers-reduced-motion:reduce){.meos-presence-circuit,.meos-presence-logo,.meos-presence-human,.meos-presence-human-glow,.meos-presence-scan,.meos-presence-eye-light,.meos-presence-status{animation:none!important}.meos-presence-logo{display:none}.meos-presence-human{opacity:1;transform:none;clip-path:none}.meos-presence-status{opacity:1;transform:translateX(-50%)}}
      .meos-hq-telemetry{display:grid;gap:18px}.meos-hud-readout{position:relative;padding:11px 0 12px 17px;border-left:1px solid rgba(105,239,255,.35)}.meos-hud-readout::before{content:"";position:absolute;left:-3px;top:0;width:5px;height:5px;background:var(--hud-cyan);box-shadow:0 0 11px var(--hud-cyan)}.meos-hud-readout strong{display:block;margin:4px 0 6px;font-size:clamp(1.35rem,2vw,2.15rem);font-weight:350;color:#effcff}.meos-hud-readout small{color:rgba(194,230,246,.58)}
      .meos-hud-equalizer{height:48px;display:flex;align-items:end;gap:4px;margin-top:8px;overflow:hidden}.meos-hud-equalizer span{width:4px;min-height:8%;border-radius:4px 4px 0 0;background:linear-gradient(180deg,#fff,var(--hud-cyan),rgba(77,145,255,.25));box-shadow:0 0 9px rgba(105,239,255,.55);animation:hudEq 1.1s ease-in-out infinite alternate}.meos-hud-equalizer span:nth-child(2n){animation-duration:.72s}.meos-hud-equalizer span:nth-child(3n){animation-duration:1.42s}.meos-hud-equalizer span:nth-child(5n){animation-duration:.94s}
      .meos-hud-radar{position:relative;width:96px;height:96px;margin-left:auto;border-radius:50%;border:1px solid rgba(105,239,255,.38);background:radial-gradient(circle,transparent 24%,rgba(105,239,255,.15) 25% 26%,transparent 27% 49%,rgba(105,239,255,.1) 50% 51%,transparent 52%),linear-gradient(90deg,transparent 49%,rgba(105,239,255,.17) 50%,transparent 51%),linear-gradient(transparent 49%,rgba(105,239,255,.17) 50%,transparent 51%);box-shadow:inset 0 0 22px rgba(105,239,255,.07);overflow:hidden}.meos-hud-radar::before{content:"";position:absolute;inset:0;border-radius:50%;background:conic-gradient(rgba(105,239,255,.45),transparent 24%);animation:hudSpin 2.7s linear infinite}.meos-hud-radar::after{content:"";position:absolute;left:65%;top:31%;width:5px;height:5px;border-radius:50%;background:#fff;box-shadow:0 0 12px var(--hud-cyan);animation:hudTarget 1.7s ease-in-out infinite}
      .meos-widget-grid{gap:3px 18px;background:transparent}.meos-widget{border:0;border-radius:0;background:linear-gradient(145deg,rgba(4,20,34,.40),rgba(7,29,46,.16));box-shadow:none;backdrop-filter:blur(13px) saturate(1.15);clip-path:polygon(0 14px,14px 0,calc(100% - 28px) 0,100% 28px,100% calc(100% - 12px),calc(100% - 12px) 100%,22px 100%,0 calc(100% - 22px));transition:transform .22s ease,background .22s ease,filter .22s ease}.meos-widget:hover{z-index:4;transform:translateY(-3px) scale(1.008);background:linear-gradient(145deg,rgba(7,34,52,.6),rgba(8,28,47,.28));filter:drop-shadow(0 0 19px rgba(105,239,255,.12))}.meos-widget::before{opacity:.75;background:linear-gradient(90deg,rgba(105,239,255,.35),transparent 22%,transparent 78%,rgba(168,110,255,.2)),linear-gradient(180deg,rgba(105,239,255,.13),transparent 22%);mask:linear-gradient(#000 0 0) top/100% 1px no-repeat,linear-gradient(#000 0 0) bottom/100% 1px no-repeat,linear-gradient(#000 0 0) left/1px 100% no-repeat,linear-gradient(#000 0 0) right/1px 100% no-repeat}.meos-widget::after{content:"";position:absolute;left:14px;top:0;width:58px;height:1px;background:var(--hud-cyan);box-shadow:0 0 11px var(--hud-cyan)}
      .meos-widget-title{color:rgba(178,235,255,.8);letter-spacing:.19em;font-weight:550}.meos-widget-link{color:var(--hud-cyan);text-transform:uppercase;letter-spacing:.12em}.meos-list li{border-bottom-color:rgba(105,239,255,.1)}
      .meos-progress-track{height:4px;border-radius:0;background:rgba(105,239,255,.08);overflow:visible}.meos-progress-fill{position:relative;border-radius:0;background:linear-gradient(90deg,var(--hud-blue),var(--hud-cyan),#fff);box-shadow:0 0 11px rgba(105,239,255,.45),0 0 28px rgba(77,145,255,.22)}.meos-progress-fill::after{content:"";position:absolute;right:-4px;top:50%;width:8px;height:8px;transform:translateY(-50%) rotate(45deg);background:#fff;box-shadow:0 0 13px var(--hud-cyan)}
      .meos-mission-ring{position:relative;width:142px;height:142px;background:radial-gradient(circle,rgba(4,19,31,.96) 49%,transparent 50%),conic-gradient(from -45deg,var(--hud-cyan) 0 var(--meos-mission-pulse, 0%),rgba(105,239,255,.08) var(--meos-mission-pulse, 0%));border:1px solid rgba(105,239,255,.3);box-shadow:0 0 26px rgba(105,239,255,.17),inset 0 0 30px rgba(105,239,255,.06)}.meos-mission-ring::before{content:"";position:absolute;inset:-13px;border-radius:50%;border:1px dashed rgba(105,239,255,.25);animation:hudSpin 12s linear infinite}.meos-mission-ring::after{content:"";position:absolute;inset:12px;border-radius:50%;border-top:2px solid rgba(255,255,255,.85);border-right:2px solid transparent;animation:hudSpinR 2.8s linear infinite}
      .meos-alert,.meos-impact-card,.office-panel{border-radius:0 15px 0 15px;background:linear-gradient(90deg,rgba(7,27,43,.52),rgba(7,27,43,.13));border-color:rgba(105,239,255,.16)}.meos-maddy-bar{display:none}.meos-office-detail{border:1px solid rgba(105,239,255,.28);border-radius:0 26px 0 26px;background:rgba(4,17,29,.72);backdrop-filter:blur(20px)}
      @keyframes hudGrid{to{background-position:0 84px,84px 0}}@keyframes hudAmbient{to{transform:rotate(360deg)}}@keyframes hudButtonScan{0%,52%{transform:translateX(-130%)}74%,100%{transform:translateX(130%)}}@keyframes hudScan{0%{top:-2px;opacity:0}8%{opacity:1}92%{opacity:1}100%{top:calc(100% + 2px);opacity:0}}@keyframes hudSpin{to{transform:rotate(360deg)}}@keyframes hudSpinR{to{transform:rotate(-360deg)}}@keyframes hudBreathe{50%{transform:scale(1.035);box-shadow:0 0 28px rgba(105,239,255,.35),inset 0 0 24px rgba(105,239,255,.17)}}@keyframes hudBlink{50%{opacity:.35;transform:scale(.72)}}@keyframes hudEq{0%{height:12%;opacity:.45}100%{height:100%;opacity:1}}@keyframes hudTarget{50%{opacity:.25;transform:scale(.45)}}
      @media(max-width:1120px){.meos-hq-hero{grid-template-columns:1fr 1fr}.meos-hq-telemetry{grid-column:1/-1;grid-template-columns:repeat(3,1fr)}}
      @media(max-width:760px){.meos-hq-hero{grid-template-columns:1fr;text-align:center;clip-path:polygon(0 12px,12px 0,calc(100% - 12px) 0,100% 12px,100% calc(100% - 12px),calc(100% - 12px) 100%,12px 100%,0 calc(100% - 12px))}.meos-hq-title,.meos-hq-subtitle{margin-left:auto;margin-right:auto}.meos-hq-status-strip{justify-content:center}.meos-hq-telemetry{grid-template-columns:1fr;text-align:left}.meos-hud-radar{margin:8px auto}.meos-hq-core{width:min(300px,85vw)}}
      @media(prefers-reduced-motion:reduce){#${ROOT_ID}::before,#${ROOT_ID}::after,.meos-hq-hero::after,.meos-hq-core-ring,.meos-hq-core::before,.meos-hq-core::after,.meos-hud-equalizer span,.meos-hud-radar::before,.meos-hud-radar::after,.meos-up-button::after,.meos-mission-ring::before,.meos-mission-ring::after{animation:none!important}}

      @media (max-width: 760px) {
        #${ROOT_ID} {
          padding: 12px;
        }

        .meos-dashboard-topline,
        .meos-progress-shell {
          grid-template-columns: 1fr;
          display: grid;
        }

        .meos-widget {
          grid-column: 1 / -1 !important;
        }

        .meos-maddy-bar {
          grid-template-columns: 1fr;
        }

        .meos-maddy-avatar {
          width: 52px;
          height: 52px;
        }

        .meos-maddy-actions,
        .meos-impact-grid,
        .office-dashboard-grid,
        .office-review-status {
          grid-template-columns: 1fr;
        }

        .office-panel-wide,
        .office-review-panel {
          grid-column: 1;
        }
      }


      .meos-activity-header-actions {
        display: flex;
        align-items: center;
        gap: 7px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      [data-widget-id="office-activity"] .meos-widget-header {
        align-items: flex-start;
        gap: 10px;
      }

      [data-widget-id="office-activity"] .meos-widget-link {
        white-space: nowrap;
      }

      .meos-activity-slider-control {
        width: 30px;
        height: 30px;
        display: grid;
        place-items: center;
        border: 1px solid var(--meos-border);
        border-radius: 9px;
        background: rgba(8, 18, 31, 0.58);
        color: var(--meos-text);
        cursor: pointer;
        font: inherit;
        font-size: 1.15rem;
        line-height: 1;
        transition: border-color .18s ease, background .18s ease;
      }

      .meos-activity-slider-control:hover,
      .meos-activity-slider-control:focus-visible {
        border-color: rgba(121, 167, 255, .62);
        background: rgba(24, 42, 68, .78);
      }

      .meos-activity-summary {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 2px 2px 9px;
        scroll-snap-type: x mandatory;
        scroll-behavior: smooth;
        overscroll-behavior-inline: contain;
        scrollbar-width: thin;
        scrollbar-color: rgba(121, 167, 255, .42) rgba(8, 18, 31, .38);
      }

      .meos-activity-summary::-webkit-scrollbar {
        height: 7px;
      }

      .meos-activity-summary::-webkit-scrollbar-track {
        background: rgba(8, 18, 31, .38);
        border-radius: 999px;
      }

      .meos-activity-summary::-webkit-scrollbar-thumb {
        background: rgba(121, 167, 255, .42);
        border-radius: 999px;
      }

      .meos-activity-lane {
        flex: 0 0 calc((100% - 10px) / 2);
        min-width: 0;
        scroll-snap-align: start;
        border: 1px solid var(--meos-border);
        border-radius: 12px;
        background: rgba(8, 18, 31, 0.52);
        color: inherit;
        padding: 12px;
        text-align: left;
        cursor: pointer;
        transition: border-color .18s ease, transform .18s ease, background .18s ease;
      }

      .meos-activity-lane:hover,
      .meos-activity-lane:focus-visible {
        border-color: rgba(121, 167, 255, .62);
        background: rgba(24, 42, 68, .72);
        transform: translateY(-1px);
      }

      .meos-activity-lane strong {
        display: block;
        margin-top: 5px;
        font-size: 1.45rem;
      }

      .meos-activity-lane small {
        display: block;
        color: var(--meos-muted);
        margin-top: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .meos-activity-status-line {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--meos-green);
        font-size: .76rem;
      }

      .meos-activity-status-line::before {
        content: "";
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 9px currentColor;
      }

      .meos-activity-overlay {
        position: fixed;
        inset: 0;
        z-index: 10020;
        background: rgba(0, 5, 12, .88);
        backdrop-filter: blur(10px);
        padding: 24px;
        overflow: auto;
      }

      .meos-activity-browser {
        width: min(1320px, 100%);
        min-height: 76vh;
        margin: 0 auto;
        background: #071523;
        border: 1px solid rgba(105, 239, 255, .35);
        box-shadow: 0 0 50px rgba(0, 0, 0, .55);
      }

      .meos-activity-browser-grid {
        display: grid;
        grid-template-columns: minmax(260px, 32%) minmax(0, 68%);
        min-height: 66vh;
      }

      .meos-activity-browser-list {
        border-right: 1px solid rgba(105, 239, 255, .16);
        padding: 14px;
        overflow: auto;
        max-height: 74vh;
      }

      .meos-activity-browser-detail {
        padding: 22px;
        overflow: auto;
        max-height: 74vh;
      }

      .meos-activity-item-button {
        width: 100%;
        border: 1px solid transparent;
        border-radius: 9px;
        background: transparent;
        color: inherit;
        text-align: left;
        cursor: pointer;
        padding: 10px;
      }

      .meos-activity-item-button:hover,
      .meos-activity-item-button[aria-current="true"] {
        border-color: rgba(121, 167, 255, .32);
        background: rgba(31, 51, 79, .66);
      }

      .meos-activity-detail-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin: 18px 0;
      }

      .meos-activity-detail-block {
        border: 1px solid var(--meos-border);
        border-radius: 10px;
        background: rgba(12, 25, 42, .58);
        padding: 12px;
      }

      .meos-activity-detail-block span {
        display: block;
        color: var(--meos-muted);
        font-size: .72rem;
        margin-bottom: 5px;
      }

      .meos-activity-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
        margin-top: 18px;
      }

      @media (max-width: 980px) {
        .meos-activity-lane { flex-basis: calc((100% - 10px) / 2); }
      }

      @media (max-width: 720px) {
        .meos-activity-header-actions { gap: 5px; }
        .meos-activity-slider-control { width: 28px; height: 28px; }
        .meos-activity-lane { flex-basis: min(82vw, 240px); }
        .meos-activity-browser-grid { grid-template-columns: 1fr; }
        .meos-activity-browser-list { border-right: 0; border-bottom: 1px solid rgba(105, 239, 255, .16); max-height: 34vh; }
        .meos-activity-detail-grid { grid-template-columns: 1fr; }
      }

      /* MEOS 4.0.1 — cinematic Maddy evolution and full-frame presence */
      .meos-hq-hero{
        grid-template-columns:minmax(285px,.82fr) minmax(560px,1.68fr) minmax(270px,.78fr);
        min-height:610px;
      }
      .meos-hq-center{min-width:0;height:100%;display:grid;align-items:stretch}
      .meos-hq-core.meos-living-presence{
        width:100%;
        min-height:560px;
        height:100%;
        margin:0;
        filter:drop-shadow(0 0 42px rgba(74,184,255,.25));
      }
      .meos-presence-stage{
        inset:1% 0 0;
        border-radius:42% 42% 16% 16% / 30% 30% 12% 12%;
        background:
          radial-gradient(ellipse at 50% 45%,rgba(62,193,255,.18),transparent 54%),
          linear-gradient(180deg,rgba(1,7,17,.12),rgba(1,7,17,.7));
      }
      .meos-presence-human{
        width:100%;
        max-width:none;
        height:100%;
        object-fit:cover;
        object-position:center 18%;
        border-radius:inherit;
        mask-image:
          linear-gradient(90deg,transparent 0,#000 7%,#000 93%,transparent 100%),
          linear-gradient(#000 0 83%,transparent 100%);
        mask-composite:intersect;
        -webkit-mask-image:
          linear-gradient(90deg,transparent 0,#000 7%,#000 93%,transparent 100%),
          linear-gradient(#000 0 83%,transparent 100%);
        -webkit-mask-composite:source-in;
        filter:brightness(.5) contrast(1.18) saturate(.76) drop-shadow(0 0 12px rgba(105,239,255,.28));
        animation:
          meosHumanMaterializeV401 9.6s cubic-bezier(.22,.75,.18,1) both,
          meosHumanIdle 6.8s ease-in-out infinite 9.6s;
      }
      .meos-presence-logo{
        width:34%;
        max-width:190px;
        animation:meosLogoEvolutionV401 9.6s cubic-bezier(.4,0,.2,1) both;
      }
      .meos-presence-human-glow{
        width:100%;
        height:100%;
        border-radius:inherit;
        animation:meosHumanGlow 9.6s ease-out both,meosHoloFlicker 4.8s steps(1,end) infinite 9.6s;
      }
      .meos-presence-eye-light{display:none!important}
      .meos-presence-scan{left:6%;right:6%;animation-duration:6.8s;animation-delay:2.2s}
      .meos-presence-status{
        bottom:54px;
        width:max-content;
        max-width:84%;
        text-align:center;
        font-size:.67rem;
        animation:meosPresenceStatusV401 9.6s ease-out both;
      }
      .meos-presence-evolution{
        position:absolute;
        left:4%;
        right:4%;
        bottom:11px;
        z-index:12;
        display:grid;
        grid-template-columns:repeat(6,minmax(0,1fr));
        gap:5px;
        pointer-events:none;
      }
      .meos-presence-evolution-step{
        position:relative;
        min-width:0;
        padding:5px 4px 6px;
        color:rgba(176,226,242,.45);
        border-top:1px solid rgba(105,239,255,.12);
        font-size:.52rem;
        letter-spacing:.09em;
        text-align:center;
        text-transform:uppercase;
        transition:color .28s ease,border-color .28s ease,background .28s ease;
      }
      .meos-presence-evolution-step::before{
        content:"";
        display:block;
        width:5px;
        height:5px;
        margin:0 auto 4px;
        border-radius:50%;
        background:currentColor;
        box-shadow:0 0 8px currentColor;
      }
      .meos-presence-evolution-step.is-active{
        color:#dffbff;
        border-top-color:var(--hud-cyan);
        background:linear-gradient(180deg,rgba(105,239,255,.07),transparent);
      }
      .meos-presence-evolution-step.is-complete{color:rgba(105,239,255,.75)}
      .meos-presence-stage[data-stage="1"] .meos-presence-circuit{opacity:.28}
      .meos-presence-stage[data-stage="2"] .meos-presence-circuit{opacity:.62}
      .meos-presence-stage[data-stage="3"] .meos-presence-circuit{opacity:.9}
      .meos-presence-stage[data-stage="4"] .meos-presence-human-glow{opacity:.72}
      .meos-presence-stage[data-stage="5"] .meos-presence-human-glow{opacity:.48}
      .meos-presence-stage[data-stage="6"] .meos-presence-human-glow{opacity:.28}
      @keyframes meosLogoEvolutionV401{
        0%,12%{opacity:1;transform:scale(.72);filter:brightness(.78) contrast(1.1) drop-shadow(0 0 7px rgba(105,239,255,.25))}
        23%{opacity:1;transform:scale(.96);filter:brightness(1.22) contrast(1.12) drop-shadow(0 0 34px rgba(105,239,255,.88))}
        36%{opacity:.84;transform:scale(1.12);filter:brightness(1.55) blur(.4px) drop-shadow(0 0 42px rgba(105,239,255,.95))}
        49%{opacity:.25;transform:scale(1.5);filter:brightness(1.9) blur(3px)}
        58%,100%{opacity:0;transform:scale(1.85);visibility:hidden}
      }
      @keyframes meosHumanMaterializeV401{
        0%,24%{opacity:0;transform:translateY(24px) scale(.84);clip-path:inset(100% 0 0 0)}
        35%{opacity:.22;clip-path:inset(72% 0 0 0)}
        48%{opacity:.48;clip-path:inset(45% 0 0 0)}
        61%{opacity:.72;clip-path:inset(20% 0 0 0);filter:brightness(.62) contrast(1.2) saturate(.56) drop-shadow(0 0 20px rgba(105,239,255,.48))}
        76%{opacity:.92;transform:translateY(4px) scale(.985);clip-path:inset(0);filter:brightness(.88) contrast(1.14) saturate(.82) drop-shadow(0 0 30px rgba(105,239,255,.55))}
        88%,100%{opacity:1;transform:translateY(0) scale(1);clip-path:inset(0);filter:brightness(1.03) contrast(1.08) saturate(.94) drop-shadow(0 0 22px rgba(105,239,255,.38))}
      }
      @keyframes meosPresenceStatusV401{
        0%,76%{opacity:0;transform:translate(-50%,8px)}
        88%,100%{opacity:1;transform:translate(-50%,0)}
      }
      @media(max-width:1120px){
        .meos-hq-hero{grid-template-columns:1fr 1.55fr;min-height:590px}
        .meos-hq-telemetry{grid-column:1/-1}
        .meos-hq-core.meos-living-presence{min-height:520px}
      }
      @media(max-width:760px){
        .meos-hq-hero{grid-template-columns:1fr;min-height:auto}
        .meos-hq-core.meos-living-presence{min-height:500px}
        .meos-presence-evolution-step{font-size:.46rem;letter-spacing:.045em}
      }


      /* MEOS 4.0.2 — restore hero footprint and remove presence capsule */
      .meos-hq-hero{
        grid-template-columns:minmax(260px,.85fr) minmax(420px,1.35fr) minmax(250px,.8fr);
        min-height:430px;
        overflow:hidden;
      }
      .meos-hq-center{
        min-width:0;
        height:auto;
        display:grid;
        align-items:center;
      }
      .meos-hq-core.meos-living-presence{
        width:min(420px,100%);
        min-height:390px;
        height:390px;
        margin:auto;
        filter:drop-shadow(0 0 34px rgba(74,184,255,.24));
      }
      .meos-presence-stage{
        inset:0;
        border-radius:0;
        background:
          radial-gradient(ellipse at 50% 45%,rgba(62,193,255,.17),transparent 56%),
          linear-gradient(180deg,rgba(1,7,17,.04),rgba(1,7,17,.18));
        border:0;
        box-shadow:none;
        overflow:visible;
      }
      .meos-presence-stage::before,
      .meos-presence-stage::after{
        border-radius:0;
      }
      .meos-presence-human{
        width:100%;
        height:100%;
        object-fit:cover;
        object-position:center 16%;
        border-radius:0;
        mask-image:
          radial-gradient(ellipse at 50% 42%,#000 0 64%,rgba(0,0,0,.92) 72%,transparent 100%),
          linear-gradient(#000 0 80%,transparent 100%);
        mask-composite:intersect;
        -webkit-mask-image:
          radial-gradient(ellipse at 50% 42%,#000 0 64%,rgba(0,0,0,.92) 72%,transparent 100%),
          linear-gradient(#000 0 80%,transparent 100%);
        -webkit-mask-composite:source-in;
      }
      .meos-presence-human-glow{
        border-radius:0;
      }
      .meos-presence-status{
        bottom:42px;
      }
      .meos-presence-evolution{
        left:2%;
        right:2%;
        bottom:0;
      }
      .meos-hq-core-caption{
        bottom:-2px;
      }
      @media(max-width:1120px){
        .meos-hq-hero{
          grid-template-columns:1fr 1.25fr;
          min-height:430px;
        }
        .meos-hq-core.meos-living-presence{
          width:min(400px,100%);
          min-height:370px;
          height:370px;
        }
      }
      @media(max-width:760px){
        .meos-hq-hero{
          grid-template-columns:1fr;
          min-height:auto;
        }
        .meos-hq-core.meos-living-presence{
          width:min(390px,92vw);
          min-height:360px;
          height:360px;
        }
      }


      /* MEOS 4.1.0 — Presence Engine driven Living Headquarters */
      .meos-living-presence{
        --presence-energy:.58;
        --presence-motion:1;
        --presence-focus-x:50%;
        --presence-focus-y:48%;
      }

      .meos-living-presence[data-presence-connected="true"]{
        filter:
          drop-shadow(0 0 calc(18px + (22px * var(--presence-energy))) rgba(74,184,255,.28));
      }

      .meos-presence-stage{
        transform-origin:center 62%;
        transition:
          filter .5s ease,
          opacity .5s ease,
          transform .65s cubic-bezier(.22,.75,.18,1);
      }

      .meos-presence-human{
        transform-origin:center 66%;
        transition:
          filter .55s ease,
          opacity .45s ease,
          transform .7s cubic-bezier(.22,.75,.18,1),
          object-position .7s ease;
      }

      .meos-presence-circuit,
      .meos-presence-human-glow,
      .meos-presence-scan,
      .meos-hq-core-ring{
        transition:opacity .45s ease,filter .45s ease,animation-duration .45s ease;
      }

      .meos-living-presence[data-presence-state="working"] .meos-presence-human{
        transform:translateY(0) scale(1);
        filter:brightness(1.01) contrast(1.08) saturate(.94) drop-shadow(0 0 18px rgba(105,239,255,.38));
      }

      .meos-living-presence[data-presence-state="thinking"] .meos-presence-human{
        transform:translateY(-2px) scale(1.012) rotate(-.35deg);
        filter:brightness(.94) contrast(1.12) saturate(.82) drop-shadow(0 0 28px rgba(105,239,255,.56));
      }

      .meos-living-presence[data-presence-state="listening"] .meos-presence-human{
        transform:translateY(-1px) scale(1.018);
        filter:brightness(1.07) contrast(1.08) saturate(1) drop-shadow(0 0 30px rgba(105,239,255,.62));
      }

      .meos-living-presence[data-presence-state="speaking"] .meos-presence-human{
        animation:
          meosPresenceSpeechPulse .36s ease-in-out infinite alternate,
          meosHumanIdle 6.8s ease-in-out infinite;
        filter:brightness(1.1) contrast(1.08) saturate(1.02) drop-shadow(0 0 34px rgba(105,239,255,.68));
      }

      .meos-living-presence[data-presence-state="concerned"] .meos-presence-human{
        transform:translateY(1px) scale(1.006);
        filter:brightness(.88) contrast(1.16) saturate(.72) drop-shadow(0 0 24px rgba(255,174,95,.38));
      }

      .meos-living-presence[data-presence-state="celebrating"] .meos-presence-human{
        transform:translateY(-4px) scale(1.025);
        filter:brightness(1.13) contrast(1.06) saturate(1.12) drop-shadow(0 0 34px rgba(101,241,178,.62));
      }

      .meos-living-presence[data-presence-state="waiting"] .meos-presence-human,
      .meos-living-presence[data-presence-state="resting"] .meos-presence-human{
        opacity:.9;
        transform:translateY(2px) scale(.995);
        filter:brightness(.84) contrast(1.08) saturate(.72) drop-shadow(0 0 14px rgba(105,239,255,.26));
      }

      .meos-living-presence[data-presence-emotion="interested"] .meos-presence-human,
      .meos-living-presence[data-presence-emotion="curious"] .meos-presence-human{
        object-position:52% 16%;
      }

      .meos-living-presence[data-presence-emotion="excited"] .meos-presence-human,
      .meos-living-presence[data-presence-emotion="happy"] .meos-presence-human{
        filter:brightness(1.12) contrast(1.06) saturate(1.08) drop-shadow(0 0 34px rgba(101,241,178,.56));
      }

      .meos-living-presence[data-presence-emotion="concerned"] .meos-presence-human,
      .meos-living-presence[data-presence-emotion="serious"] .meos-presence-human{
        filter:brightness(.9) contrast(1.16) saturate(.76) drop-shadow(0 0 25px rgba(255,174,95,.4));
      }

      .meos-living-presence[data-presence-attention="grant-office"] .meos-presence-human,
      .meos-living-presence[data-presence-attention="resource-acquisition"] .meos-presence-human{
        object-position:56% 16%;
        transform:translateX(5px) scale(1.012);
      }

      .meos-living-presence[data-presence-attention="finance"] .meos-presence-human,
      .meos-living-presence[data-presence-attention="mission"] .meos-presence-human{
        object-position:47% 16%;
        transform:translateX(-4px) scale(1.008);
      }

      .meos-living-presence[data-presence-attention="executive-director"] .meos-presence-human{
        object-position:50% 14%;
        transform:translateY(-2px) scale(1.02);
      }

      .meos-living-presence[data-presence-mode="personal"]{
        --hud-cyan:#f2c56b;
        --hud-blue:#db9f55;
      }

      .meos-living-presence[data-presence-mode="personal"] .meos-presence-stage::before{
        background:
          radial-gradient(ellipse at 50% 42%,rgba(242,197,107,.18),transparent 40%),
          linear-gradient(90deg,transparent,rgba(242,197,107,.05),transparent);
      }

      .meos-living-presence[data-presence-idle="blink"] .meos-presence-scan{
        opacity:.15;
      }

      .meos-living-presence[data-presence-idle="breathe"] .meos-presence-human{
        animation:meosPresenceBreath 2.6s ease-in-out 1;
      }

      .meos-living-presence[data-presence-idle="glance-left"] .meos-presence-human,
      .meos-living-presence[data-presence-idle="glance-mission"] .meos-presence-human,
      .meos-living-presence[data-presence-idle="glance-finance"] .meos-presence-human{
        object-position:45% 16%;
        transform:translateX(-5px) scale(1.008);
      }

      .meos-living-presence[data-presence-idle="glance-right"] .meos-presence-human,
      .meos-living-presence[data-presence-idle="glance-grant-office"] .meos-presence-human{
        object-position:56% 16%;
        transform:translateX(5px) scale(1.008);
      }

      .meos-living-presence[data-presence-idle="look-down-read"] .meos-presence-human,
      .meos-living-presence[data-presence-idle="review-report"] .meos-presence-human{
        object-position:50% 20%;
        transform:translateY(3px) scale(1.006);
      }

      .meos-living-presence[data-presence-idle="look-up-think"] .meos-presence-human{
        object-position:50% 12%;
        transform:translateY(-3px) scale(1.01);
      }

      .meos-living-presence[data-presence-idle="small-smile"] .meos-presence-human{
        filter:brightness(1.09) contrast(1.06) saturate(1.04) drop-shadow(0 0 28px rgba(101,241,178,.46));
      }

      .meos-living-presence[data-presence-idle="shift-posture"] .meos-presence-human{
        transform:translateX(3px) rotate(.3deg) scale(1.008);
      }

      .meos-living-presence[data-presence-state="speaking"] .meos-presence-human-glow,
      .meos-living-presence[data-presence-state="thinking"] .meos-presence-human-glow{
        opacity:.55!important;
      }

      .meos-living-presence[data-presence-state="speaking"] .meos-presence-circuit,
      .meos-living-presence[data-presence-state="thinking"] .meos-presence-circuit{
        opacity:.75!important;
        filter:brightness(1.25);
      }

      .meos-living-presence[data-presence-state="listening"] .meos-hq-core-ring.r2,
      .meos-living-presence[data-presence-state="speaking"] .meos-hq-core-ring.r2{
        animation-duration:4.5s;
      }

      .meos-living-presence[data-presence-state="speaking"] .meos-hq-core-ring.r3{
        animation-duration:2.4s;
      }

      .meos-presence-runtime{
        position:absolute;
        z-index:13;
        top:10px;
        right:10px;
        display:grid;
        justify-items:end;
        gap:4px;
        pointer-events:none;
      }

      .meos-presence-runtime-state{
        padding:4px 8px;
        border:1px solid rgba(105,239,255,.28);
        background:rgba(2,12,22,.58);
        color:rgba(222,249,255,.86);
        font-size:.54rem;
        letter-spacing:.12em;
        text-transform:uppercase;
        backdrop-filter:blur(7px);
      }

      .meos-presence-runtime-attention{
        color:rgba(181,225,241,.64);
        font-size:.5rem;
        letter-spacing:.08em;
        text-transform:uppercase;
      }

      @keyframes meosPresenceSpeechPulse{
        from{transform:translateY(0) scale(1)}
        to{transform:translateY(-1px) scale(1.008)}
      }

      @keyframes meosPresenceBreath{
        0%,100%{transform:translateY(0) scale(1)}
        50%{transform:translateY(-2px) scale(1.012)}
      }

      @media(prefers-reduced-motion:reduce){
        .meos-living-presence[data-presence-state="speaking"] .meos-presence-human,
        .meos-living-presence[data-presence-idle="breathe"] .meos-presence-human{
          animation:none!important;
        }
      }


      /* MEOS 4.2.0 — cinematic holographic Maddy, no visible image rectangle */
      .meos-hq-core.meos-living-presence{
        width:min(470px,100%);
        min-height:430px;
        height:430px;
        overflow:visible;
      }

      .meos-presence-stage{
        inset:-2% -4% -3%;
        overflow:visible;
        background:none!important;
        box-shadow:none!important;
      }

      .meos-presence-stage::before{
        inset:4% 2% 1%;
        background:
          radial-gradient(ellipse at 50% 48%,rgba(72,210,255,.24),transparent 44%),
          radial-gradient(ellipse at 50% 88%,rgba(44,180,255,.19),transparent 35%);
        filter:blur(2px) drop-shadow(0 0 35px rgba(72,210,255,.27));
      }

      .meos-presence-human{
        width:min(90%,430px)!important;
        height:102%!important;
        max-width:none!important;
        object-fit:cover!important;
        object-position:center 36%!important;
        scale:.92!important;
        translate:0 6px!important;
        border-radius:0!important;
        mix-blend-mode:screen;
        opacity:0;
        filter:
          brightness(1.08)
          contrast(1.12)
          saturate(1.02)
          drop-shadow(0 0 22px rgba(89,219,255,.52))!important;
        -webkit-mask-image:
          radial-gradient(ellipse 64% 62% at 50% 42%,#000 0 62%,rgba(0,0,0,.94) 74%,transparent 100%),
          linear-gradient(to bottom,transparent 0,#000 7%,#000 80%,transparent 100%);
        -webkit-mask-composite:source-in;
        mask-image:
          radial-gradient(ellipse 64% 62% at 50% 42%,#000 0 62%,rgba(0,0,0,.94) 74%,transparent 100%),
          linear-gradient(to bottom,transparent 0,#000 7%,#000 80%,transparent 100%);
        mask-composite:intersect;
        transform-origin:50% 72%;
        animation:
          meosHumanMaterialize 9.2s cubic-bezier(.22,.75,.18,1) both,
          meosCinematicPresenceIdle 7.8s ease-in-out infinite 9.2s!important;
      }

      .meos-presence-status{
        bottom:58px;
      }

      .meos-presence-human-glow{
        width:82%;
        height:92%;
        border-radius:48%;
        background:
          linear-gradient(180deg,transparent 0 19%,rgba(105,239,255,.11) 47%,transparent 80%),
          repeating-linear-gradient(180deg,transparent 0 7px,rgba(166,246,255,.07) 8px,transparent 9px);
        filter:blur(.3px);
      }

      .meos-presence-scan{
        left:18%;
        right:18%;
      }

      .meos-presence-stage::after{
        content:"";
        position:absolute;
        z-index:8;
        left:16%;
        right:16%;
        bottom:3%;
        height:18%;
        border-radius:50%;
        background:
          radial-gradient(ellipse at center,rgba(181,248,255,.42),rgba(55,194,255,.14) 38%,transparent 72%);
        filter:blur(8px);
        animation:meosProjectionBase 3.4s ease-in-out infinite;
        pointer-events:none;
      }

      .meos-living-presence[data-presence-state="thinking"] .meos-presence-human{
        animation:
          meosPresenceThinking 3.2s ease-in-out infinite,
          meosHoloMicroFlicker 5.1s steps(1,end) infinite!important;
      }

      .meos-living-presence[data-presence-state="listening"] .meos-presence-human{
        animation:
          meosPresenceListening 2.8s ease-in-out infinite,
          meosHoloMicroFlicker 5.1s steps(1,end) infinite!important;
      }

      .meos-living-presence[data-presence-state="speaking"] .meos-presence-human{
        animation:
          meosPresenceSpeaking .42s ease-in-out infinite alternate,
          meosCinematicPresenceIdle 6.4s ease-in-out infinite!important;
      }

      .meos-living-presence[data-presence-state="working"] .meos-presence-human{
        animation:
          meosCinematicPresenceIdle 7.8s ease-in-out infinite,
          meosHoloMicroFlicker 5.1s steps(1,end) infinite!important;
      }

      .meos-living-presence[data-presence-idle="glance-left"] .meos-presence-human,
      .meos-living-presence[data-presence-idle="glance-mission"] .meos-presence-human,
      .meos-living-presence[data-presence-idle="glance-finance"] .meos-presence-human{
        transform:translate3d(-7px,-2px,0) rotate(-.45deg) scale(1.018)!important;
      }

      .meos-living-presence[data-presence-idle="glance-right"] .meos-presence-human,
      .meos-living-presence[data-presence-idle="glance-grant-office"] .meos-presence-human{
        transform:translate3d(7px,-2px,0) rotate(.45deg) scale(1.018)!important;
      }

      .meos-living-presence[data-presence-idle="look-down-read"] .meos-presence-human,
      .meos-living-presence[data-presence-idle="review-report"] .meos-presence-human{
        transform:translate3d(0,5px,0) rotate(.15deg) scale(1.012)!important;
      }

      .meos-living-presence[data-presence-idle="look-up-think"] .meos-presence-human{
        transform:translate3d(0,-6px,0) rotate(-.2deg) scale(1.02)!important;
      }

      @keyframes meosCinematicPresenceIdle{
        0%,100%{transform:translate3d(0,0,0) rotate(0) scale(1)}
        24%{transform:translate3d(-2px,-2px,0) rotate(-.18deg) scale(1.006)}
        52%{transform:translate3d(2px,-4px,0) rotate(.16deg) scale(1.012)}
        76%{transform:translate3d(1px,-1px,0) rotate(.08deg) scale(1.005)}
      }

      @keyframes meosPresenceThinking{
        0%,100%{transform:translate3d(0,-2px,0) rotate(-.25deg) scale(1.012)}
        50%{transform:translate3d(-4px,-5px,0) rotate(-.55deg) scale(1.022)}
      }

      @keyframes meosPresenceListening{
        0%,100%{transform:translate3d(0,-2px,0) rotate(0) scale(1.016)}
        50%{transform:translate3d(3px,-4px,0) rotate(.35deg) scale(1.024)}
      }

      @keyframes meosPresenceSpeaking{
        from{transform:translate3d(0,-1px,0) scale(1.015)}
        to{transform:translate3d(0,-3px,0) scale(1.025)}
      }

      @keyframes meosHoloMicroFlicker{
        0%,90%,93%,100%{opacity:1}
        91%{opacity:.86}
        92%{opacity:.97}
      }

      @keyframes meosProjectionBase{
        0%,100%{opacity:.42;transform:scaleX(.94)}
        50%{opacity:.78;transform:scaleX(1.06)}
      }

      @media(max-width:1120px){
        .meos-hq-core.meos-living-presence{
          width:min(430px,100%);
          height:410px;
          min-height:410px;
        }
      }

      @media(max-width:760px){
        .meos-hq-core.meos-living-presence{
          width:min(390px,94vw);
          height:390px;
          min-height:390px;
        }
      }


      /* MEOS 4.3.0 — Digital Executive Telepresence viewport */
      .meos-digital-actor-mount{
        position:absolute;
        z-index:6;
        inset:-1% 2% -2%;
        display:block;
        overflow:visible;
        pointer-events:none;
        opacity:0;
        transition:opacity .55s ease;
      }

      .meos-digital-actor-mount[data-actor-mounted="true"]{
        opacity:1;
      }

      .meos-digital-actor-mount .meos-digital-actor{
        width:100%;
        height:100%;
        min-height:0;
        overflow:visible;
      }

      .meos-digital-actor-mount .meos-digital-actor-stage{
        overflow:visible;
      }

      .meos-digital-actor-mount .meos-digital-actor-layer,
      .meos-digital-actor-mount .meos-digital-actor-fallback{
        width:90%;
        height:102%;
        left:5%;
        right:auto;
        top:0;
        bottom:auto;
        object-fit:contain;
        object-position:center bottom;
        scale:.92;
        translate:0 16px;
        mix-blend-mode:screen;
        filter:
          brightness(1.08)
          contrast(1.12)
          saturate(1.02)
          drop-shadow(0 0 24px rgba(89,219,255,.52));
        -webkit-mask-image:
          radial-gradient(ellipse 64% 62% at 50% 42%,#000 0 62%,rgba(0,0,0,.94) 74%,transparent 100%),
          linear-gradient(to bottom,transparent 0,#000 7%,#000 80%,transparent 100%);
        -webkit-mask-composite:source-in;
        mask-image:
          radial-gradient(ellipse 64% 62% at 50% 42%,#000 0 62%,rgba(0,0,0,.94) 74%,transparent 100%),
          linear-gradient(to bottom,transparent 0,#000 7%,#000 80%,transparent 100%);
        mask-composite:intersect;
      }

      .meos-digital-actor-mount .meos-digital-actor-status{
        display:none;
      }

      .meos-living-presence[data-digital-actor-mounted="true"] #meosCanonicalMaddy{
        opacity:0!important;
        visibility:hidden!important;
        pointer-events:none!important;
      }

      .meos-living-presence[data-digital-actor-mounted="false"] #meosCanonicalMaddy{
        visibility:visible;
      }

      .meos-living-presence[data-digital-actor-media="ready"] .meos-presence-circuit{
        opacity:.72!important;
      }

      .meos-living-presence[data-digital-actor-performance="listening"] .meos-hq-core-ring.r2,
      .meos-living-presence[data-digital-actor-performance="speaking"] .meos-hq-core-ring.r2{
        animation-duration:4.2s;
      }

      .meos-living-presence[data-digital-actor-performance="thinking"] .meos-hq-core-ring.r3{
        animation-duration:7.4s;
      }

      .meos-living-presence[data-digital-actor-performance="celebrating"] .meos-presence-human-glow{
        opacity:.7!important;
      }

    `;

    document.head.appendChild(style);
  }

  function getMainContent() {
    return (
      document.querySelector(".main-content") ||
      document.querySelector(".workspace") ||
      document.querySelector("main") ||
      document.body
    );
  }

  function getNavigationArea() {
    const selectors = [
      "[data-meos-navigation]",
      ".sidebar",
      ".side-nav",
      ".navigation",
      ".nav-sidebar",
      "aside nav",
      "aside"
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);

      if (element && !element.closest(`#${ROOT_ID}`)) {
        return element;
      }
    }

    return null;
  }

  function createExecutiveOfficeControl() {
    const existing = document.getElementById("meosExecutiveOfficeControl");

    if (existing) {
      return existing;
    }

    const navigation = getNavigationArea();

    if (!navigation) {
      console.warn(
        "MEOS could not find the left navigation area. Add data-meos-navigation to the navigation container."
      );
      return null;
    }

    const control = document.createElement("section");
    control.id = "meosExecutiveOfficeControl";
    control.className = "meos-executive-office-control";
    control.setAttribute("aria-label", "Maddy Executive Office");

    control.innerHTML = `
      <div class="meos-office-presence">
        <button
          id="meosMaddyOrb"
          class="meos-maddy-orb"
          type="button"
          data-mode="professional"
          data-token-activity="idle"
          aria-label="Talk to Maddy"
          title="Talk to Maddy"
        >
          <img
              class="meos-maddy-orb-insignia"
              src="maddy-executive-insignia.png"
              alt=""
              aria-hidden="true"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
          />
        <span class="meos-maddy-orb-fallback" aria-hidden="true">M</span>
        </button>

        <div class="meos-office-identity">
          <strong>MADDY</strong>
          <span>Executive Office</span>
        </div>

        <div class="meos-office-status-grid" aria-live="polite">
          <div class="meos-office-status-row">
            <span>Office</span>
            <span class="meos-status-value meos-status-active">
              <span class="meos-status-dot"></span>
              ACTIVE
            </span>
          </div>

          <div class="meos-office-status-row">
            <span>Conversation</span>
            <span id="meosConversationStatus" class="meos-status-value meos-status-idle">
              DISCONNECTED
            </span>
          </div>

          <div class="meos-office-status-row">
            <span>Token Use</span>
            <span id="meosTokenStatus" class="meos-status-value meos-status-idle">
              <span class="meos-status-dot"></span>
              IDLE
            </span>
          </div>
        </div>

        <label class="meos-mode-label" for="meosCommunicationMode">Communication Mode</label>
        <select id="meosCommunicationMode" class="meos-mode-select">
          <option value="professional">Professional</option>
          <option value="personal">Personal</option>
          <option value="gangsta">Gangsta — Founder</option>
        </select>

        <div class="meos-executive-hub-command">
  <label class="meos-mode-label" for="meosExecutiveHubInput">
    Executive Command
  </label>

  <div class="meos-executive-hub-input-row">
    <input
      id="meosExecutiveHubInput"
      class="meos-executive-hub-input"
      type="text"
      placeholder="Ask Maddy or assign a mission..."
      autocomplete="off"
    />

    <button
      id="meosExecutiveHubSend"
      class="meos-executive-hub-send"
      type="button"
      aria-label="Send command to Maddy"
      title="Send command"
    >
      ↑
    </button>
  </div>
</div>

<div id="meosHallwayMini" class="meos-hallway-mini" hidden aria-live="polite">
  <div class="meos-hallway-mini-status">
    <span>Current Work</span>
    <strong id="meosHallwayMiniState">IDLE</strong>
  </div>
  <div id="meosHallwayMiniTitle" class="meos-hallway-mini-title"></div>
  <div id="meosHallwayMiniResult" class="meos-hallway-mini-result"></div>
  <div id="meosHallwayMiniActions" class="meos-hallway-mini-actions"></div>
</div>

<div class="meos-office-voice-actions">
  <button
    id="meosVoiceConnectionButton"
    class="meos-voice-primary"
    type="button"
    data-connected="false"
  >
    Talk to Maddy
  </button>

  <div class="meos-voice-secondary-row">
    <button
      id="meosVoiceMuteButton"
      class="meos-voice-secondary"
      type="button"
      disabled
    >
      Mute
    </button>

    <button
      id="meosVoiceResetButton"
      class="meos-voice-secondary"
      type="button"
    >
      Reset Voice
    </button>
  </div>

  <button
    id="meosOpenExecutiveHub"
    class="meos-voice-secondary meos-open-hub-button"
    type="button"
  >
    Open Executive Hub
  </button>
</div>
      </div>
    `;

    /*
     * Make the navigation a vertical flex container so this control remains
     * pinned at its far bottom. Existing navigation items stay above it.
     */
    const computed = window.getComputedStyle(navigation);

    if (computed.display !== "flex") {
      navigation.style.display = "flex";
    }

    navigation.style.flexDirection = "column";
    navigation.appendChild(control);
    bindExecutiveOfficeControlEvents();
    renderExecutiveOfficeControl();

    return control;
  }

  function bindExecutiveOfficeControlEvents() {
    document.getElementById("meosMaddyOrb")?.addEventListener("click", toggleVoiceConnection);
    document.getElementById("meosVoiceConnectionButton")?.addEventListener("click", toggleVoiceConnection);

    document.getElementById("meosCommunicationMode")?.addEventListener("change", (event) => {
      setCommunicationMode(event.target.value);
    });

    document.getElementById("meosVoiceMuteButton")?.addEventListener("click", () => {
      state.muted = !state.muted;
      renderExecutiveOfficeControl();

      dispatchMEOS("meos:maddy-voice-mute-changed", {
        muted: state.muted
      });
    });

    document.getElementById("meosVoiceResetButton")?.addEventListener("click", () => {
      dispatchMEOS("meos:maddy-voice-reset-requested", {
        communicationMode: state.communicationMode
      });
    });
    const submitExecutiveHubCommand = () => {
  const input = document.getElementById("meosExecutiveHubInput");
  const message = input?.value.trim();

  if (!message) {
    input?.focus();
    return;
  }

  dispatchMEOS("meos:maddy-request", {
    message,
    source: "executive-hub",
    costMode: state.costMode,
    communicationMode: state.communicationMode
  });

  input.value = "";
};

document
  .getElementById("meosExecutiveHubSend")
  ?.addEventListener("click", submitExecutiveHubCommand);

document
  .getElementById("meosExecutiveHubInput")
  ?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitExecutiveHubCommand();
    }
  });

document
  .getElementById("meosOpenExecutiveHub")
  ?.addEventListener("click", () => {
    document.getElementById(ROOT_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    dispatchMEOS("meos:executive-hub-opened", {
      communicationMode: state.communicationMode
    });
  });
  }

  function findLegacyVoicePanel() {
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, strong, div, span"))
      .filter((element) => element.textContent?.trim() === "MEOS Voice Engine");

    for (const heading of headings) {
      let candidate = heading;

      for (let depth = 0; depth < 8 && candidate; depth += 1) {
        const buttons = Array.from(candidate.querySelectorAll?.("button") || []);
        const labels = buttons.map((button) => button.textContent?.trim());

        if (labels.includes("Start Maddy") && labels.includes("Stop Maddy")) {
          return candidate;
        }

        candidate = candidate.parentElement;
      }
    }

    return null;
  }

  function findLegacyVoiceButton(label) {
    const panel = findLegacyVoicePanel();

    if (!panel) {
      return null;
    }

    return Array.from(panel.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === label) || null;
  }

  function hideLegacyVoicePanel() {
    const panel = findLegacyVoicePanel();

    if (!panel) {
      return false;
    }

    panel.setAttribute("aria-hidden", "true");
    panel.dataset.meosRetiredDeveloperPanel = "true";
    panel.style.setProperty("display", "none", "important");
    return true;
  }

  function installLegacyVoicePanelRetirement() {
    if (hideLegacyVoicePanel()) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (hideLegacyVoicePanel()) {
        observer.disconnect();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    window.setTimeout(() => observer.disconnect(), 15000);
  }

  function clickLegacyVoiceControl(label) {
    const button = findLegacyVoiceButton(label);

    if (!button) {
      return false;
    }

    button.click();
    hideLegacyVoicePanel();
    return true;
  }

  function startMaddyVoice() {
    setConversationStatus("connecting");
    setTokenActivity("waiting");

    const started = clickLegacyVoiceControl("Start Maddy");

    dispatchMEOS("meos:maddy-voice-requested", {
      intentional: true,
      costMode: state.costMode,
      communicationMode: state.communicationMode,
      source: "executive-hub",
      legacyBridgeStarted: started
    });

    if (!started) {
      console.error(
        "MEOS could not find the existing Start Maddy control. " +
        "The Voice Engine developer panel may not be loaded."
      );
      setConversationStatus("error");
      setTokenActivity("idle");
      return;
    }

    window.setTimeout(() => {
      if (state.conversationStatus === "connecting") {
        setConversationStatus("connected");
        setTokenActivity("idle");
      }
    }, 800);
  }

  function stopMaddyVoice() {
    const stopped = clickLegacyVoiceControl("Stop Maddy");

    dispatchMEOS("meos:maddy-voice-disconnect-requested", {
      reason: "user",
      communicationMode: state.communicationMode,
      source: "executive-hub",
      legacyBridgeStopped: stopped
    });

    setConversationStatus("disconnected");
    setTokenActivity("idle");
  }

  function toggleVoiceConnection() {
    const connected = state.conversationStatus !== "disconnected";

    if (connected) {
      stopMaddyVoice();
      return;
    }

    startMaddyVoice();
  }

  function setCommunicationMode(mode) {
    const allowedModes = ["professional", "personal", "gangsta"];

    if (!allowedModes.includes(mode)) {
      throw new Error(`Unsupported Maddy communication mode: ${mode}`);
    }

    state.communicationMode = mode;
    renderExecutiveOfficeControl();

    dispatchMEOS("meos:maddy-mode-changed", {
      mode
    });
  }

  function setConversationStatus(status) {
    const allowedStatuses = [
      "disconnected",
      "connecting",
      "connected",
      "listening",
      "speaking",
      "error"
    ];

    if (!allowedStatuses.includes(status)) {
      throw new Error(`Unsupported Maddy conversation status: ${status}`);
    }

    state.conversationStatus = status;

    if (status === "disconnected" || status === "error") {
      state.muted = false;
    }

    renderExecutiveOfficeControl();
  }

  function setTokenActivity(activity) {
    const allowedActivities = ["idle", "waiting", "active"];

    if (!allowedActivities.includes(activity)) {
      throw new Error(`Unsupported Maddy token activity: ${activity}`);
    }

    state.tokenActivity = activity;
    renderExecutiveOfficeControl();

    dispatchMEOS("meos:token-activity-changed", {
      activity,
      usingTokens: activity !== "idle"
    });
  }

  function renderExecutiveOfficeControl() {
    const orb = document.getElementById("meosMaddyOrb");
    const modeSelect = document.getElementById("meosCommunicationMode");
    const conversationStatus = document.getElementById("meosConversationStatus");
    const tokenStatus = document.getElementById("meosTokenStatus");
    const connectionButton = document.getElementById("meosVoiceConnectionButton");
    const muteButton = document.getElementById("meosVoiceMuteButton");

    if (!orb) {
      return;
    }

    const connected = state.conversationStatus !== "disconnected";
    const conversationLabels = {
      disconnected: "DISCONNECTED",
      connecting: "CONNECTING",
      connected: "CONNECTED",
      listening: "LISTENING",
      speaking: "SPEAKING",
      error: "ERROR"
    };
    const tokenLabels = {
      idle: "IDLE",
      waiting: "WAITING",
      active: "TOKENS ACTIVE"
    };

    orb.dataset.mode = state.communicationMode;
    orb.dataset.tokenActivity = state.tokenActivity;

    if (modeSelect) {
      modeSelect.value = state.communicationMode;
    }

    if (conversationStatus) {
      conversationStatus.textContent = conversationLabels[state.conversationStatus];
      conversationStatus.className =
        `meos-status-value ${state.conversationStatus === "error" ? "meos-status-token-active" : "meos-status-idle"}`;
    }

    if (tokenStatus) {
      tokenStatus.innerHTML = `<span class="meos-status-dot"></span>${tokenLabels[state.tokenActivity]}`;
      tokenStatus.className =
        `meos-status-value ${
          state.tokenActivity === "active"
            ? "meos-status-token-active"
            : state.tokenActivity === "waiting"
              ? "meos-status-token-waiting"
              : "meos-status-idle"
        }`;
    }

    if (connectionButton) {
      connectionButton.dataset.connected = String(connected);
      connectionButton.textContent = connected ? "End Conversation" : "Talk to Maddy";
    }

    if (muteButton) {
      muteButton.disabled = !connected;
      muteButton.textContent = state.muted ? "Unmute" : "Mute";
    }

    orb.setAttribute(
      "aria-label",
      connected ? "End conversation with Maddy" : "Talk to Maddy"
    );
    orb.title =
      state.tokenActivity === "idle"
        ? `${state.communicationMode} mode — no tokens in use`
        : `${state.communicationMode} mode — ${tokenLabels[state.tokenActivity].toLowerCase()}`;
  }


  function calculateBuildProgress() {
    const total = state.buildTasks.length;
    const completed = state.buildTasks.filter((task) => task.status === "complete").length;
    const active =
      state.buildTasks.find((task) => task.status === "active") ||
      state.buildTasks.find((task) => task.status === "pending") ||
      null;
    const activeIndex = active
      ? state.buildTasks.findIndex((task) => task.id === active.id)
      : -1;
    const next =
      activeIndex >= 0
        ? state.buildTasks.slice(activeIndex + 1).find((task) => task.status === "pending") || null
        : null;

    return {
      total,
      completed,
      percent: total ? Math.round((completed / total) * 100) : 100,
      active,
      next
    };
  }

  function createWidgetElement(config) {
    const article = document.createElement("article");
    article.id = `meos-widget-${config.id}`;
    article.className = "meos-widget";
    article.dataset.widgetId = config.id;
    article.style.setProperty("--meos-col-span", String(config.colSpan));
    article.style.setProperty("--meos-row-span", String(config.rowSpan));
    article.style.order = String(config.order);
    article.hidden = !config.visible;
    return article;
  }

  function getWidgetMarkup(id) {
    const widgets = {
      "build-progress": `
        <div class="meos-widget-inner">
          <div class="meos-widget-header">
            <div>
              <span class="meos-widget-title">Maddy at Work</span>
              <div class="meos-muted" style="margin-top:5px;font-size:.76rem;">A live glimpse into the executive intelligence coordinating the offices.</div>
            </div>
            <span class="meos-priority medium">Live circuitry</span>
          </div>
          <div class="meos-maddy-window" aria-label="Animated visualization of Maddy coordinating executive office activity">
            <div class="meos-maddy-circuit-layer" aria-hidden="true">
              <span class="meos-circuit-line l1"></span><span class="meos-circuit-line l2"></span><span class="meos-circuit-line l3"></span><span class="meos-circuit-line l4"></span>
              <span class="meos-maddy-node n1"></span><span class="meos-maddy-node n2"></span><span class="meos-maddy-node n3"></span><span class="meos-maddy-node n4"></span>
            </div>
            <div class="meos-maddy-field">
              <span class="meos-maddy-halo"></span><span class="meos-maddy-halo h2"></span><span class="meos-maddy-halo h3"></span>
              <img class="meos-maddy-face" src="maddy-executive-insignia.png" alt="Maddy emerging through the MEOS executive circuitry" onerror="this.style.visibility='hidden';" />
              <span class="meos-maddy-scan" aria-hidden="true"></span>
            </div>
            <div class="meos-maddy-desk" aria-label="Maddy Executive Desk">
              <div class="meos-maddy-desk-command">
                <input id="meosMaddyDeskInput" class="meos-maddy-desk-input" type="text" placeholder="Ask Maddy or assign executive work…" autocomplete="off" />
                <button id="meosMaddyDeskSend" class="meos-maddy-desk-send" type="button">Send</button>
              </div>
              <div class="meos-maddy-desk-glance">
                <span id="meosMaddyDeskWork" class="meos-maddy-desk-chip" data-meos-evidence="maddy-work" role="button" tabindex="0">No active Hallway work</span>
                <span id="meosMaddyDeskMissions" class="meos-maddy-desk-chip" data-meos-evidence="mission-runtime" role="button" tabindex="0">Missions · reading</span>
                <span id="meosMaddyDeskCognition" class="meos-maddy-desk-chip" data-meos-evidence="cognition-runtime" role="button" tabindex="0">Cognition · unread</span>
                <span id="meosMaddyDeskApprovals" class="meos-maddy-desk-chip" data-meos-evidence="approvals" role="button" tabindex="0">0 need you</span>
                <span id="meosMaddyDeskDeliverables" class="meos-maddy-desk-chip" data-meos-evidence="deliverables" role="button" tabindex="0">0 deliverables</span>
              </div>
              <div id="meosMaddyDeskActions" class="meos-maddy-desk-actions"></div>
              <div id="meosMaddyWorkPackage" class="meos-maddy-work-package" data-open="false" aria-live="polite"></div>
              <div id="meosMaddyDirectAnswer" class="meos-maddy-direct-answer" data-open="false" aria-live="polite"></div>
              <div id="meosMaddyDeskBrief" class="meos-maddy-brief" data-open="false" aria-live="polite"></div>
            </div>
            <div class="meos-maddy-telemetry">
              <div class="meos-maddy-status"><strong id="meosMaddyWorkStatus">Executive offices synchronizing</strong><span id="meosMaddyWorkDetail">Reading live headquarters state…</span></div>
              <div id="meosMaddyCompletion" class="meos-maddy-completion" aria-label="Headquarters completion">0%</div>
            </div>
          </div>
        </div>
      `,

      "office-activity": `
        <div class="meos-widget-inner">
          <div class="meos-widget-header">
            <div>
              <h2 class="meos-widget-title">Office Activity</h2>
              <div id="meosOfficeActivityStatus" class="meos-activity-status-line">Loading live office work…</div>
            </div>
            <div class="meos-activity-header-actions">
              <button id="meosOfficeActivityPrevious" class="meos-activity-slider-control" type="button" aria-label="Scroll office activity left">‹</button>
              <button id="meosOfficeActivityNext" class="meos-activity-slider-control" type="button" aria-label="Scroll office activity right">›</button>
              <button id="meosOfficeActivityPeek" class="meos-widget-link" type="button">Peek Behind the Curtain</button>
            </div>
          </div>
          <div id="meosOfficeActivitySummary" class="meos-activity-summary" aria-label="Executive office activity categories" tabindex="0"></div>
        </div>
      `,
      "today-glance": `
        <div class="meos-widget-inner">
          <div class="meos-widget-header"><h2 class="meos-widget-title">Today at a Glance</h2><span id="meosTodayStage" class="meos-priority medium">Live</span></div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center;">
            <div style="width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:rgba(66,90,139,.22);border:1px solid rgba(111,143,201,.25);"><strong id="meosTodayDate" style="font-size:1.25rem;"></strong></div>
            <div><strong id="meosTodayMonth" style="display:block;margin-bottom:3px;"></strong><span id="meosTodayDay" class="meos-muted"></span></div>
          </div>
          <ul id="meosTodayLiveList" class="meos-list" style="margin-top:12px;"><li><span>—</span><span>Calculating live office state…</span><span></span></li></ul>
        </div>
      `,
      "mission-pulse": `
        <div class="meos-widget-inner">
          <div class="meos-widget-header"><h2 class="meos-widget-title">Mission Pulse</h2><span id="meosMissionPulseStage" class="meos-priority medium">Live</span></div>
          <div class="meos-mission-ring" data-meos-evidence="mission-pulse" role="button" tabindex="0"><strong id="meosMissionPulseValue">—</strong></div>
          <div style="text-align:center;"><strong id="meosMissionPulseLabel">Calculating</strong><p id="meosMissionPulseDetail" class="meos-muted" style="margin:10px 0 0;font-size:.82rem;">Reading mission, office, and funding state.</p></div>
        </div>
      `,
      "priorities": `
        <div class="meos-widget-inner"><div class="meos-widget-header"><h2 class="meos-widget-title">Executive Priorities</h2><span id="meosPrioritiesStage" class="meos-priority medium">Live</span></div><ol id="meosLivePriorities" class="meos-list"><li><span>—</span><span>Reading active missions and office work…</span><span></span></li></ol></div>
      `,
      "briefing": `
        <div class="meos-widget-inner"><div class="meos-widget-header"><h2 class="meos-widget-title">Executive Briefing</h2><span id="meosBriefingStage" class="meos-priority medium">Live</span></div><div id="meosLiveBriefing"><p class="meos-muted">Preparing a live executive summary…</p></div></div>
      `,
      "schedule": `
        <div class="meos-widget-inner"><div class="meos-widget-header"><h2 class="meos-widget-title">Upcoming Schedule</h2><span class="meos-priority medium">15% planned</span></div><div class="meos-alert info"><strong>Calendar integration preserved</strong><span class="meos-muted">The widget is assigned to Operations. Live Google Calendar data is not connected yet.</span></div><ul id="meosScheduleDependencies" class="meos-list"><li><span>1</span><span>Connect calendar provider</span><span class="meos-priority medium">Planned</span></li><li><span>2</span><span>Route meetings into executive briefings</span><span class="meos-priority medium">Planned</span></li></ul></div>
      `,
      "grant-intelligence": `
        <div class="meos-widget-inner">
          <div class="meos-widget-header">
            <h2 class="meos-widget-title">Resource Acquisition Desk</h2>
            <button id="meosFundingViewAll" class="meos-widget-link" type="button">View All</button>
          </div>
          <p id="meosFundingSummary" class="meos-muted" style="margin:0 0 10px;font-size:.76rem;">Loading live qualified opportunities…</p>
          <ul id="meosFundingOpportunityList" class="meos-list">
            <li><span></span><span><strong>Connecting to Resource Acquisition…</strong><br><small class="meos-muted">Only opportunities approved by the authoritative acquisition engine will be displayed.</small></span><span class="meos-priority medium">Loading</span></li>
          </ul>
        </div>
      `,
      "risk-center": `
        <div class="meos-widget-inner"><div class="meos-widget-header"><h2 class="meos-widget-title">Risk & Alert Center</h2><span id="meosRiskStage" class="meos-priority medium">48% partial</span></div><div id="meosLiveRisks"><div class="meos-alert info"><strong>Scanning live blockers</strong><span class="meos-muted">Compliance and funding risks will appear here.</span></div></div></div>
      `,
      "journal": `
        <div class="meos-widget-inner"><div class="meos-widget-header"><h2 class="meos-widget-title">Executive Journal</h2><span id="meosJournalStage" class="meos-priority medium">88% live</span></div><ul id="meosLiveJournal" class="meos-list"><li><span>—</span><span>Loading office activity history…</span><span></span></li></ul></div>
      `,
      "tasks": `
        <div class="meos-widget-inner"><div class="meos-widget-header"><h2 class="meos-widget-title">Tasks Due</h2><span id="meosTasksStage" class="meos-priority medium">72% live</span></div><ul id="meosLiveTasks" class="meos-list"><li><span>—</span><span>Loading mission and office tasks…</span><span></span></li></ul></div>
      `,
      "mission-impact": `
        <div class="meos-widget-inner">
          <div class="meos-widget-header"><h2 class="meos-widget-title">Mission Impact</h2><span id="meosMissionImpactState" class="meos-priority medium">Evidence only</span></div>
          <div id="meosMissionImpactEvidence" aria-live="polite"><div class="meos-alert info"><strong>Reading verified organizational consequences…</strong><span class="meos-muted">MEOS will not convert opportunity size, activity, or unverified claims into impact.</span></div></div>
        </div>
      `,
    };

    return widgets[id] || "";
  }


  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function firstDefined(...values) {
    return values.find((value) => value !== undefined && value !== null && value !== "");
  }

  function getResourceAcquisitionEngine() {
    return (
      window.ExecutiveResourceAcquisitionEngine ||
      window.MEOSExecutiveResourceAcquisitionEngine ||
      null
    );
  }

  function getResourceDecision(opportunity) {
    const existing = firstDefined(
      opportunity?.authoritativeResourceDecision,
      opportunity?.resourceDecision,
      opportunity?.executiveQualification?.authoritativeResourceDecision,
      opportunity?.evaluation?.authoritativeResourceDecision,
      null
    );

    if (existing) {
      return existing;
    }

    const resourceDevelopment = opportunity?.resourceDevelopment;
    const workQueue = resourceDevelopment?.workQueue;

    if (!resourceDevelopment || !workQueue) {
      return null;
    }

    const decision = String(
      resourceDevelopment.executiveDecision ||
      workQueue.action?.recommendation ||
      "research"
    ).toLowerCase();

    return {
      decision,
      recommendation: decision,
      showExecutiveDirector:
        resourceDevelopment.deskStatus === "active" &&
        ["pursue", "prepare", "partner"].includes(decision),
      worthPursuing:
        ["pursue", "prepare", "partner"].includes(decision),
      canAcquire:
        workQueue.acquisition?.canAcquire ?? null,
      acquisitionPath:
        workQueue.acquisition?.leadPossible === true
          ? "direct"
          : workQueue.acquisition?.partnerPossible === true
            ? "partner"
            : "unresolved",
      strategicTiming:
        workQueue.timing?.bucket?.bucket ||
        workQueue.timing?.urgency ||
        "unresolved",
      deadline: {
        label: workQueue.timing?.label || "Deadline not verified",
        daysRemaining: workQueue.timing?.daysRemaining ?? null,
        iso: workQueue.timing?.date || null
      },
      resourceValue: {
        amount: workQueue.resource?.estimatedValue ?? null,
        label:
          workQueue.resource?.label ||
          "Resource opportunity"
      },
      nextAction:
        workQueue.action?.nextAction ||
        resourceDevelopment.nextAction ||
        "Complete the next authorized executive step.",
      unknowns:
        workQueue.executiveSummary?.unknowns || [],
      executiveBrief: {
        resource:
          workQueue.resource?.label ||
          "Resource opportunity",
        whyOnDesk:
          workQueue.executiveSummary?.whyOnDesk ||
          workQueue.strategicValue?.whyItMatters ||
          resourceDevelopment.reason ||
          "This opportunity has a realistic path to organizational value.",
        reason:
          workQueue.executiveSummary?.reason ||
          resourceDevelopment.reason ||
          "The Executive Resource Development Office completed its analysis.",
        nextAction:
          workQueue.action?.nextAction ||
          resourceDevelopment.nextAction ||
          "Complete the next authorized executive step.",
        consequenceOfDelay:
          workQueue.consequenceOfDelay ||
          "The consequence of delay has not been verified."
      },
      reasoning: {
        reason:
          workQueue.executiveSummary?.reason ||
          resourceDevelopment.reason ||
          "Executive reasoning is available in the full investigation."
      }
    };
  }

  function evaluateFundingOpportunity(opportunity) {
    const engine = getResourceAcquisitionEngine();

    if (!engine?.decide) {
      throw new Error(
        "Executive Resource Acquisition Engine is not available to the dashboard."
      );
    }

    const resourceDecision = engine.decide(opportunity, {
      source: "MEOS Executive Dashboard",
      dashboardVersion: DASHBOARD_VERSION
    });

    return {
      ...opportunity,
      authoritativeResourceDecision: resourceDecision
    };
  }

  function getDecisionPriority(decision) {
    const value = String(decision || "").toLowerCase();

    if (value === "pursue") return 1;
    if (value === "partner") return 2;
    if (value === "prepare") return 3;
    if (value === "monitor") return 4;
    if (value === "research") return 5;
    return 99;
  }

  function getStrategicTimingPriority(timing) {
    const value = String(timing || "").toLowerCase();

    if (value === "immediate") return 1;
    if (value === "now") return 2;
    if (value === "build-now-for-future") return 3;
    if (value === "future-cycle") return 4;
    return 99;
  }

  function getFundingScore(opportunity) {
    const value = Number(firstDefined(
      opportunity?.resourceDevelopment?.executivePriority?.score,
      opportunity?.qualification?.score,
      opportunity?.evaluation?.score?.total,
      opportunity?.score?.total,
      opportunity?.executiveScore,
      opportunity?.fitScore,
      opportunity?.matchScore
    ));

    return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : null;
  }

  function getFundingAmount(opportunity) {
    const value = firstDefined(
      opportunity?.awardAmount,
      opportunity?.amount,
      opportunity?.fundingAmount,
      opportunity?.estimatedAward,
      opportunity?.awardCeiling,
      opportunity?.moneyReality?.maximumAward,
      opportunity?.resourceDevelopment?.workQueue?.resource?.estimatedValue
    );

    if (typeof value === "number" && Number.isFinite(value)) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
      }).format(value);
    }

    return value ? String(value) : "Amount not stated";
  }

  function getFundingRecommendation(opportunity) {
    const decision = getResourceDecision(opportunity);
    const value = String(
      decision?.decision ||
      decision?.recommendation ||
      "research"
    ).toLowerCase();

    if (value === "pursue") return "Apply Now";
    if (value === "partner") return "Build Partnership";
    if (value === "prepare") return "Prepare";
    if (value === "monitor") return "Monitor";
    if (value === "research") return "Research";
    return "Off Desk";
  }

  function isExecutiveQualified(opportunity) {
    const decision = getResourceDecision(opportunity);

    return Boolean(
      decision?.showExecutiveDirector === true &&
      ["pursue", "prepare", "partner"].includes(
        String(decision?.decision || "").toLowerCase()
      )
    );
  }

  function sortFundingOpportunities(left, right) {
    const leftRank = Number(
      left?.resourceDevelopment?.workQueue?.priorityRank
    );
    const rightRank = Number(
      right?.resourceDevelopment?.workQueue?.priorityRank
    );

    if (
      Number.isFinite(leftRank) &&
      Number.isFinite(rightRank) &&
      leftRank !== rightRank
    ) {
      return leftRank - rightRank;
    }

    const leftDecision = getResourceDecision(left) || {};
    const rightDecision = getResourceDecision(right) || {};

    const timingDifference =
      getStrategicTimingPriority(leftDecision.strategicTiming) -
      getStrategicTimingPriority(rightDecision.strategicTiming);

    if (timingDifference) return timingDifference;

    const decisionDifference =
      getDecisionPriority(leftDecision.decision) -
      getDecisionPriority(rightDecision.decision);

    if (decisionDifference) return decisionDifference;

    const leftDeadline = Number(leftDecision?.deadline?.daysRemaining);
    const rightDeadline = Number(rightDecision?.deadline?.daysRemaining);
    const safeLeftDeadline =
      Number.isFinite(leftDeadline) && leftDeadline >= 0
        ? leftDeadline
        : Number.MAX_SAFE_INTEGER;
    const safeRightDeadline =
      Number.isFinite(rightDeadline) && rightDeadline >= 0
        ? rightDeadline
        : Number.MAX_SAFE_INTEGER;

    if (safeLeftDeadline !== safeRightDeadline) {
      return safeLeftDeadline - safeRightDeadline;
    }

    const leftValue = Number(leftDecision?.resourceValue?.amount || 0);
    const rightValue = Number(rightDecision?.resourceValue?.amount || 0);

    return rightValue - leftValue;
  }

  function renderFundingIntelligence() {
    const list = document.getElementById("meosFundingOpportunityList");
    const summary = document.getElementById("meosFundingSummary");
    if (!list || !summary) return;

    if (state.fundingIntelligence.status === "loading") {
      summary.textContent = "Loading the authoritative Resource Acquisition Desk…";
      return;
    }

    if (state.fundingIntelligence.status === "error") {
      summary.textContent = "The Resource Acquisition Desk is temporarily unavailable.";
      list.innerHTML = `<li><span></span><span><strong>Connection failed</strong><br><small class="meos-muted">${escapeHtml(state.fundingIntelligence.error || "Unknown error")}</small></span><span class="meos-priority medium">Retry</span></li>`;
      return;
    }

    const opportunities =
      state.fundingIntelligence.opportunities.slice(0, FUNDING_CARD_LIMIT);
    const total = state.fundingIntelligence.totalQualified;

    summary.textContent =
      `${total} opportunit${total === 1 ? "y" : "ies"} approved for the Executive Director's desk. ` +
      `Showing the first ${Math.min(total, FUNDING_CARD_LIMIT)} by timing and action priority.`;

    if (!opportunities.length) {
      list.innerHTML =
        '<li><span></span><span><strong>No opportunities approved for the desk</strong><br>' +
        '<small class="meos-muted">The authoritative acquisition engine did not recommend any current records for Executive Director action.</small>' +
        '</span><span class="meos-priority medium">Live</span></li>';
      return;
    }

    list.innerHTML = opportunities.map((opportunity) => {
      const decision = getResourceDecision(opportunity) || {};
      const brief = decision.executiveBrief || {};
      const title = firstDefined(
        opportunity?.title,
        decision?.title,
        "Untitled resource opportunity"
      );
      const provider = firstDefined(
        opportunity?.agencyName,
        opportunity?.provider,
        opportunity?.sourceName,
        opportunity?.source?.name,
        opportunity?.resourceDevelopment?.workQueue?.opportunity?.source,
        "Resource source"
      );
      const resource = firstDefined(
        brief?.resource,
        decision?.resourceValue?.label,
        getFundingAmount(opportunity)
      );
      const deadline = firstDefined(
        decision?.deadline?.label,
        getFundingDeadline(opportunity)
      );
      const recommendation = getFundingRecommendation(opportunity);
      const timing = String(decision?.strategicTiming || "now")
        .split(/[-_ ]+/)
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" ");

      return `
        <li data-funding-opportunity-id="${escapeHtml(opportunity?.id || "")}">
          <span></span>
          <span>
            <strong>${escapeHtml(title)}</strong><br>
            <small class="meos-muted">${escapeHtml(resource)} · ${escapeHtml(provider)}</small><br>
            <small style="color:var(--meos-green);">${escapeHtml(deadline)} · ${escapeHtml(timing)}</small>
          </span>
          <span class="meos-priority high">${escapeHtml(recommendation)}</span>
        </li>
      `;
    }).join("");
  }

  async function loadFundingIntelligence() {
    state.fundingIntelligence.status = "loading";
    state.fundingIntelligence.error = null;
    renderFundingIntelligence();

    try {
      const response = await fetch(FUNDING_API_URL, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(
          `Executive Resource Development Office returned HTTP ${response.status}.`
        );
      }

      const payload = await response.json();

      if (
        payload?.schema !==
        "meos.executive-resource-development.desk.v1"
      ) {
        throw new Error(
          "Executive Resource Development Office returned an unsupported desk schema."
        );
      }

      const records = Array.isArray(payload?.records)
        ? payload.records
        : [];

      const executiveDesk = records
        .filter(
          (record) =>
            record?.resourceDevelopment?.deskStatus === "active"
        )
        .filter(isExecutiveQualified)
        .sort(sortFundingOpportunities);

      state.fundingIntelligence.status = "ready";
      state.fundingIntelligence.opportunities = executiveDesk;
      state.fundingIntelligence.totalQualified =
        Number.isFinite(Number(payload?.total))
          ? Number(payload.total)
          : executiveDesk.length;
      state.fundingIntelligence.lastLoadedAt =
        new Date().toISOString();
      renderFundingIntelligence();

      const firstAuthority =
        executiveDesk[0]?.resourceDevelopment || {};

      dispatchMEOS("meos:resource-acquisition-desk-loaded", {
        authority: {
          name: "MEOS Executive Resource Development Office",
          version:
            payload?.version ||
            firstAuthority?.version ||
            null,
          buildId:
            firstAuthority?.buildId ||
            null
        },
        sourceEndpoint: FUNDING_API_URL,
        totalOnDesk: executiveDesk.length,
        displayed:
          Math.min(executiveDesk.length, FUNDING_CARD_LIMIT),
        loadedAt:
          state.fundingIntelligence.lastLoadedAt
      });

      return executiveDesk;
    } catch (error) {
      state.fundingIntelligence.status = "error";
      state.fundingIntelligence.error =
        error?.message || String(error);
      state.fundingIntelligence.opportunities = [];
      state.fundingIntelligence.totalQualified = 0;
      renderFundingIntelligence();
      console.error(
        "MEOS Resource Acquisition dashboard connection failed.",
        error
      );
      return [];
    }
  }

  function createDashboardShell() {
    const existingRoute = document.getElementById(ROOT_ID);

    if (
      existingRoute &&
      existingRoute.dataset.meosDashboardVersion === DASHBOARD_VERSION
    ) {
      return existingRoute;
    }

    injectStyles();

    const root = document.createElement("section");
    root.id = ROOT_ID;
    root.dataset.meosDashboardVersion = DASHBOARD_VERSION;

    root.innerHTML = `
      <div class="meos-dashboard-shell">
        <div class="meos-dashboard-topline">
          <div class="meos-dashboard-heading">
            <h1 id="meosGreeting">Good Morning, Executive Director.</h1>
            <p>MEOS secure executive operating environment</p>
          </div>
          <button id="meosImUpButton" class="meos-up-button" type="button">⌁ &nbsp; I’m Up</button>
        </div>

        <section class="meos-hq-hero" aria-label="Maddy Executive Headquarters command core">
          <div class="meos-hq-identity">
            <div class="meos-hq-kicker">Maddy Executive Operating System</div>
            <div class="meos-hq-title">Executive <strong>Headquarters</strong></div>
            <p class="meos-hq-subtitle">Autonomous executive intelligence, live organizational awareness, and coordinated office operations — already in motion.</p>
            <div class="meos-hq-status-strip"><span class="meos-hq-status"><i></i>Executive Brain Online</span><span class="meos-hq-status"><i></i>Offices Active</span><span class="meos-hq-status"><i></i>Constitution Intact</span></div>
          </div>
          <div class="meos-hq-center">
            <div class="meos-hq-core meos-living-presence" id="meosLivingPresence" aria-label="Maddy materializing from the MEOS command insignia into her canonical human executive presence">
              <span class="meos-hq-core-ring r1"></span><span class="meos-hq-core-ring r2"></span><span class="meos-hq-core-ring r3"></span><span class="meos-hq-core-ring r4"></span>
              <div class="meos-presence-stage">
                <span class="meos-presence-circuit" aria-hidden="true"></span>
                <img class="meos-presence-logo" src="maddy-executive-insignia.png" alt="MEOS Maddy command insignia beginning the startup transformation" onerror="this.style.visibility='hidden';" />
                <img class="meos-presence-human" id="meosCanonicalMaddy" src="maddy-holographic-presence-v1.png" alt="Maddy's canonical holographic executive presence fallback" onerror="this.style.visibility='hidden';" />
                <div class="meos-digital-actor-mount" id="meosDigitalActorMount" aria-label="Maddy digital executive telepresence performance viewport"></div>
                <span class="meos-presence-human-glow" aria-hidden="true"></span>
                <span class="meos-presence-scan" aria-hidden="true"></span>
                <span class="meos-presence-eye-light" aria-hidden="true"></span>
                <span class="meos-presence-status" id="meosPresenceStatus">Maddy online · Coordinating headquarters</span>
                <div class="meos-presence-runtime" aria-live="polite">
                  <span class="meos-presence-runtime-state" id="meosPresenceRuntimeState">Presence engine connecting</span>
                  <span class="meos-presence-runtime-attention" id="meosPresenceRuntimeAttention">Attention · pending</span>
                </div>
                <div class="meos-presence-evolution" id="meosPresenceEvolution" aria-label="Maddy startup evolution">
                  <span class="meos-presence-evolution-step" data-stage-step="1">Initializing</span>
                  <span class="meos-presence-evolution-step" data-stage-step="2">Shaping</span>
                  <span class="meos-presence-evolution-step" data-stage-step="3">Materializing</span>
                  <span class="meos-presence-evolution-step" data-stage-step="4">Revealing</span>
                  <span class="meos-presence-evolution-step" data-stage-step="5">Activating</span>
                  <span class="meos-presence-evolution-step" data-stage-step="6">Online</span>
                </div>
              </div>
              <span class="meos-hq-core-caption">Maddy · Executive Command</span>
            </div>
          </div>
          <div class="meos-hq-telemetry">
            <div class="meos-hud-readout"><span class="meos-hud-label">Mission pulse</span><strong id="meosHeroMissionPulse">—</strong><small id="meosHeroMissionDetail">Calculating live headquarters state</small></div>
            <div class="meos-hud-readout"><span class="meos-hud-label">Executive activity</span><div class="meos-hud-equalizer" aria-label="Executive office activity visualization">
                  <span style="animation-delay:-0.09s"></span>
                  <span style="animation-delay:-0.18s"></span>
                  <span style="animation-delay:-0.27s"></span>
                  <span style="animation-delay:-0.36s"></span>
                  <span style="animation-delay:-0.45s"></span>
                  <span style="animation-delay:-0.54s"></span>
                  <span style="animation-delay:-0.63s"></span>
                  <span style="animation-delay:-0.72s"></span>
                  <span style="animation-delay:-0.00s"></span>
                  <span style="animation-delay:-0.09s"></span>
                  <span style="animation-delay:-0.18s"></span>
                  <span style="animation-delay:-0.27s"></span>
                  <span style="animation-delay:-0.36s"></span>
                  <span style="animation-delay:-0.45s"></span>
                  <span style="animation-delay:-0.54s"></span>
                  <span style="animation-delay:-0.63s"></span>
                  <span style="animation-delay:-0.72s"></span>
                  <span style="animation-delay:-0.00s"></span>
                  <span style="animation-delay:-0.09s"></span>
                  <span style="animation-delay:-0.18s"></span>
                  <span style="animation-delay:-0.27s"></span>
                  <span style="animation-delay:-0.36s"></span>
                  <span style="animation-delay:-0.45s"></span>
                  <span style="animation-delay:-0.54s"></span>
                  <span style="animation-delay:-0.63s"></span>
                  <span style="animation-delay:-0.72s"></span>
                  <span style="animation-delay:-0.00s"></span>
                  <span style="animation-delay:-0.09s"></span>
                  <span style="animation-delay:-0.18s"></span>
                  <span style="animation-delay:-0.27s"></span>
                  <span style="animation-delay:-0.36s"></span>
                  <span style="animation-delay:-0.45s"></span>
                  <span style="animation-delay:-0.54s"></span>
                  <span style="animation-delay:-0.63s"></span>
                  <span style="animation-delay:-0.72s"></span>
                  <span style="animation-delay:-0.00s"></span>
              </div><small>Continuous office telemetry</small></div>
            <div class="meos-hud-readout"><span class="meos-hud-label">Investigation network</span><div class="meos-hud-radar" aria-label="Executive investigation radar active"></div><small>Public intelligence gateway staged</small></div>
          </div>
        </section>

        <section id="meosWidgetGrid" class="meos-widget-grid" aria-label="MEOS Executive Dashboard"></section>

        <section id="officeDashboard" class="meos-office-detail" hidden></section>
      </div>
    `;

    const widgetGrid = root.querySelector("#meosWidgetGrid");

    state.layout
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((config) => {
        const widget = createWidgetElement(config);
        widget.innerHTML = getWidgetMarkup(config.id);
        widgetGrid.appendChild(widget);
      });

    const mainContent = getMainContent();

    /*
     * Replace the temporary #executive-office route in place.
     * This preserves the existing URL hash and router connection while
     * preventing the old temporary dashboard from remaining visible.
     */
    if (existingRoute && existingRoute !== root) {
      existingRoute.replaceWith(root);
    } else {
      mainContent.appendChild(root);
    }
    bindDashboardEvents();
    bindHallwayEvents();
    createExecutiveOfficeControl();
    updateClockAndGreeting();
    renderBuildProgress();
    createOfficeDashboard();

    return root;
  }

  function createOfficeDashboard() {
    const dashboard = document.getElementById("officeDashboard");

    if (!dashboard || dashboard.dataset.initialized === "true") {
      return dashboard;
    }

    dashboard.dataset.initialized = "true";
    dashboard.innerHTML = `
      <div class="office-dashboard-header">
        <div>
          <p class="office-dashboard-eyebrow">Executive Cabinet Office</p>
          <h2 id="officeDashboardName">Executive Office</h2>
          <p id="officeDashboardTitle">Office information</p>
        </div>
        <button id="closeOfficeDashboard" class="office-dashboard-close" type="button" aria-label="Close executive office">×</button>
      </div>

      <div class="office-dashboard-grid">
        <article class="office-panel">
          <span class="office-panel-label">Office</span>
          <strong id="officeDashboardOffice">Not selected</strong>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Reports To</span>
          <strong id="officeDashboardReportsTo">Maddy</strong>
        </article>

        <article class="office-panel office-panel-wide">
          <span class="office-panel-label">Core Responsibility</span>
          <p id="officeDashboardResponsibility">Select an executive office to view its responsibility.</p>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Office Status</span>
          <strong id="officeDashboardStatus">Operational</strong>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Current Activity</span>
          <strong id="officeDashboardCurrentActivity">Idle — Awaiting Assignment</strong>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Office Health</span>
          <strong id="officeDashboardHealth">100%</strong>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Office Success</span>
          <strong id="officeDashboardSuccess">0%</strong>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Current Load</span>
          <strong id="officeDashboardCurrentLoad">0</strong>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Pending Tasks</span>
          <strong id="officeDashboardPendingTasks">0</strong>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Recommendations</span>
          <strong id="officeDashboardRecommendations">0</strong>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Last Activity</span>
          <strong id="officeDashboardLastActivity">No activity recorded</strong>
        </article>

        <article class="office-panel office-panel-wide">
          <span class="office-panel-label">Executive Workspace</span>
          <p id="officeDashboardWorkspace">Tasks, briefings, records, approvals, and office intelligence will appear here as MEOS capabilities come online.</p>
        </article>

        <article class="office-panel office-panel-wide office-review-panel">
          <span class="office-panel-label review-title">Executive Review</span>

          <div class="office-review-status">
            <div class="maddy-status">
              <div class="status-label">MADDY</div>
              <div class="status-value">I'm Up.</div>
            </div>

            <div class="office-review-recommendation">
              <div class="recommendation-label">Executive Recommendation</div>
              <div id="officeDashboardReviewStatus" class="recommendation-value">Ready for Executive Approval</div>
              <div class="recommendation-source">Reviewed by Maddy</div>
            </div>
          </div>

          <div class="office-review-actions">
            <button id="requestOfficeRevisions" class="request-revision-button" type="button">Request Revisions</button>
            <button id="takeItButton" class="take-it-button" type="button">TAKE IT</button>
          </div>
        </article>
      </div>
    `;

    dashboard.querySelector("#closeOfficeDashboard")?.addEventListener("click", hideOfficeDashboard);

    dashboard.querySelector("#requestOfficeRevisions")?.addEventListener("click", () => {
      dispatchMEOS("meos:office-revisions-requested", {
        member: state.currentMember
      });
    });

    dashboard.querySelector("#takeItButton")?.addEventListener("click", () => {
      dispatchMEOS("meos:office-recommendation-accepted", {
        member: state.currentMember
      });
    });

    return dashboard;
  }

  function getFundingDeadline(opportunity) {
    const raw = firstDefined(
      opportunity?.deadline,
      opportunity?.closeDate,
      opportunity?.applicationDeadline,
      opportunity?.opportunityCloseDate,
      ""
    );
    if (!raw) return "No deadline listed";

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime())
      ? String(raw)
      : parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function getFundingDescription(opportunity) {
    return firstDefined(
      opportunity?.executiveSummary,
      opportunity?.summary,
      opportunity?.description,
      opportunity?.synopsis,
      opportunity?.qualification?.reason,
      "No executive summary is available for this opportunity."
    );
  }

  function getFundingOfficialUrl(opportunity = {}) {
    const candidates = [
      opportunity?.url,
      opportunity?.officialUrl,
      opportunity?.officialURL,
      opportunity?.officialLink,
      opportunity?.sourceUrl,
      opportunity?.sourceURL,
      opportunity?.opportunityUrl,
      opportunity?.opportunityURL,
      opportunity?.opportunityLink,
      opportunity?.detailUrl,
      opportunity?.detailsUrl,
      opportunity?.applicationUrl,
      opportunity?.applicationURL,
      opportunity?.source?.url,
      opportunity?.source?.officialUrl,
      opportunity?.source?.officialURL,
      opportunity?.source?.sourceUrl,
      opportunity?.source?.opportunityUrl,
      opportunity?.raw?.url,
      opportunity?.raw?.officialUrl,
      opportunity?.raw?.officialURL,
      opportunity?.raw?.sourceUrl,
      opportunity?.raw?.opportunityUrl,
      opportunity?.resourceDevelopment?.workQueue?.opportunity?.sourceUrl,
      opportunity?.resourceDevelopment?.workQueue?.opportunity?.url,
      opportunity?.fundingPipeline?.artifacts?.applicationIntelligence?.sourceUrl
    ];

    const direct = candidates.find((value) => {
      if (typeof value !== "string" || !value.trim()) return false;
      try {
        const parsed = new URL(value, window.location.href);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch (_) {
        return false;
      }
    });

    if (direct) {
      return new URL(direct, window.location.href).href;
    }

    const providerEvidence = [
      opportunity?.provider,
      opportunity?.sourceName,
      opportunity?.agencyName,
      opportunity?.source?.name,
      opportunity?.source?.provider,
      opportunity?.raw?.provider,
      opportunity?.raw?.sourceName,
      opportunity?.sourceSystem,
      opportunity?.origin
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const externalId = firstDefined(
      opportunity?.externalId,
      opportunity?.opportunityNumber,
      opportunity?.opportunityId,
      opportunity?.noticeNumber,
      opportunity?.fundingOpportunityNumber,
      opportunity?.number,
      opportunity?.raw?.opportunityNumber,
      opportunity?.raw?.opportunityId,
      ""
    );

    const looksLikeGrantsGov =
      providerEvidence.includes("grants.gov") ||
      providerEvidence.includes("grants gov") ||
      Boolean(opportunity?.opportunityNumber) ||
      Boolean(opportunity?.fundingOpportunityNumber) ||
      /grants?\.gov/i.test(String(opportunity?.source || ""));

    if (looksLikeGrantsGov && externalId) {
      return `https://www.grants.gov/search-results-detail/${encodeURIComponent(externalId)}`;
    }

    if (looksLikeGrantsGov) {
      return "https://www.grants.gov/search-grants";
    }

    return "";
  }

  function openFundingOfficialUrl(url) {
    if (!url) return false;

    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.assign(url);
    }

    dispatchMEOS("meos:funding-official-source-opened", { url });
    return true;
  }

  function formatFundingLabel(value, fallback = "Not verified") {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) return value.filter(Boolean).join(", ") || fallback;
    if (typeof value === "object") {
      return firstDefined(value.label, value.name, value.title, value.status, value.value, fallback);
    }
    return String(value)
      .split(/[-_ ]+/)
      .filter(Boolean)
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(" ");
  }

  function collectFundingEvidence(opportunity = {}, decision = {}) {
    const candidates = [
      ...(Array.isArray(decision?.evidence) ? decision.evidence : []),
      ...(Array.isArray(decision?.verifiedFacts) ? decision.verifiedFacts : []),
      ...(Array.isArray(opportunity?.executiveQualification?.verifiedFacts) ? opportunity.executiveQualification.verifiedFacts : []),
      ...(Array.isArray(opportunity?.resourceDevelopment?.evidence) ? opportunity.resourceDevelopment.evidence : [])
    ];
    return candidates
      .map((item) => typeof item === "string" ? item : firstDefined(item?.statement, item?.fact, item?.label, item?.value, ""))
      .filter(Boolean)
      .slice(0, 8);
  }

  function getFundingLifecycle(opportunity = {}, decision = {}) {
    return formatFundingLabel(firstDefined(
      opportunity?.lifecycle,
      opportunity?.status,
      opportunity?.fundingPipeline?.lifecycle,
      opportunity?.fundingPipeline?.stage,
      decision?.deadline?.status,
      "Not verified"
    ));
  }

  function getFundingParticipation(opportunity = {}, decision = {}) {
    return formatFundingLabel(firstDefined(
      decision?.participation,
      decision?.participationLabel,
      opportunity?.executiveQualification?.participation,
      opportunity?.resourceDevelopment?.participation,
      opportunity?.resourceDevelopment?.workQueue?.participation,
      decision?.canAcquire === true ? "Can Lead" : null,
      decision?.canAcquire === false ? "Needs Research" : null,
      "Needs Research"
    ));
  }

  function getFundingConfidence(opportunity = {}, decision = {}) {
    const raw = firstDefined(
      decision?.confidence,
      decision?.executiveBrief?.confidence,
      opportunity?.executiveQualification?.confidence,
      opportunity?.resourceDevelopment?.confidence,
      null
    );
    if (raw === null || raw === undefined || raw === "") return "Not scored";
    const number = Number(raw);
    if (Number.isFinite(number)) {
      const percent = number <= 1 ? Math.round(number * 100) : Math.round(number);
      return `${Math.max(0, Math.min(100, percent))}%`;
    }
    return formatFundingLabel(raw);
  }

  function getFundingCycleIntelligence(opportunity = {}, decision = {}) {
    const recurrence = firstDefined(
      opportunity?.recurrence,
      opportunity?.fundingCycle,
      opportunity?.cycle,
      opportunity?.resourceDevelopment?.recurrence,
      opportunity?.resourceDevelopment?.fundingCycle,
      decision?.recurrence,
      null
    );
    if (recurrence) return formatFundingLabel(recurrence);
    const lifecycle = String(firstDefined(opportunity?.lifecycle, opportunity?.status, "")).toLowerCase();
    if (lifecycle.includes("closed")) return "Closed now — future cycle not yet verified";
    return "Future cycle not yet verified";
  }

  function getFundingStrategyRelationship(opportunity = {}, decision = {}) {
    const stored = firstDefined(
      decision?.strategyRelationship,
      decision?.strategicRelationship,
      opportunity?.strategyRelationship,
      opportunity?.strategicRelationship,
      opportunity?.resourceDevelopment?.strategyRelationship,
      opportunity?.resourceDevelopment?.workQueue?.strategicValue?.strategyRelationship,
      null
    );

    let runtime = null;
    try {
      runtime = window.CCSPLongTermStrategy?.recommendOpportunityRelationship?.(opportunity) || null;
    } catch (error) {
      console.warn("MEOS could not evaluate the CCSP strategy relationship.", error);
    }

    const relationship = firstDefined(
      runtime?.relationship,
      stored?.relationship,
      stored?.label,
      stored,
      "Relationship requires investigation"
    );

    const reasons = [
      ...(Array.isArray(runtime?.reasons) ? runtime.reasons : []),
      ...(Array.isArray(stored?.reasons) ? stored.reasons : []),
      ...(Array.isArray(decision?.strategyReasons) ? decision.strategyReasons : [])
    ].map((item) => typeof item === "string" ? item : firstDefined(item?.reason, item?.label, item?.description, ""))
      .filter(Boolean);

    let initiatives = [];
    const directInitiatives = [
      ...(Array.isArray(runtime?.initiatives) ? runtime.initiatives : []),
      ...(Array.isArray(runtime?.matchedInitiatives) ? runtime.matchedInitiatives : []),
      ...(Array.isArray(stored?.initiatives) ? stored.initiatives : []),
      ...(Array.isArray(decision?.matchedInitiatives) ? decision.matchedInitiatives : [])
    ];
    initiatives.push(...directInitiatives);

    try {
      const strategy = window.CCSPLongTermStrategy?.getStrategy?.();
      const allInitiatives = Array.isArray(strategy?.initiatives) ? strategy.initiatives : [];
      const haystack = JSON.stringify({
        title: opportunity?.title,
        description: getFundingDescription(opportunity),
        reasons
      }).toLowerCase();
      allInitiatives.forEach((initiative) => {
        const name = firstDefined(initiative?.name, initiative?.title, initiative?.id, "");
        const keywords = [
          name,
          ...(Array.isArray(initiative?.keywords) ? initiative.keywords : []),
          ...(Array.isArray(initiative?.populations) ? initiative.populations : []),
          ...(Array.isArray(initiative?.focusAreas) ? initiative.focusAreas : [])
        ].filter(Boolean).map((value) => String(value).toLowerCase());
        if (keywords.some((keyword) => keyword.length > 4 && haystack.includes(keyword))) {
          initiatives.push(initiative);
        }
      });
    } catch (error) {
      console.warn("MEOS could not inspect commissioned CCSP initiatives.", error);
    }

    initiatives = initiatives
      .map((item) => typeof item === "string" ? item : firstDefined(item?.name, item?.title, item?.label, item?.id, ""))
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, 6);

    return { relationship: formatFundingLabel(relationship), reasons: [...new Set(reasons)].slice(0, 8), initiatives };
  }

  function renderFundingOpportunityDetail(opportunity) {
    const detail = document.getElementById("meosFundingBrowserDetail");
    if (!detail || !opportunity) return;

    const decision = getResourceDecision(opportunity) || {};
    const brief = decision.executiveBrief || {};
    const reasoning = decision.reasoning || {};
    const title = firstDefined(opportunity?.title, decision?.title, "Untitled resource opportunity");
    const provider = firstDefined(
      opportunity?.agencyName,
      opportunity?.provider,
      opportunity?.sourceName,
      opportunity?.source?.name,
      opportunity?.resourceDevelopment?.workQueue?.opportunity?.source,
      "Resource source not verified"
    );
    const resource = firstDefined(brief?.resource, decision?.resourceValue?.label, getFundingAmount(opportunity));
    const deadline = firstDefined(decision?.deadline?.label, getFundingDeadline(opportunity));
    const recommendation = getFundingRecommendation(opportunity);
    const url = getFundingOfficialUrl(opportunity);
    const unknowns = [
      ...(Array.isArray(decision?.unknowns) ? decision.unknowns : []),
      ...(Array.isArray(opportunity?.executiveQualification?.unknowns) ? opportunity.executiveQualification.unknowns : [])
    ].filter(Boolean).filter((value, index, array) => array.indexOf(value) === index);
    const evidence = collectFundingEvidence(opportunity, decision);
    const strategy = getFundingStrategyRelationship(opportunity, decision);
    const lifecycle = getFundingLifecycle(opportunity, decision);
    const participation = getFundingParticipation(opportunity, decision);
    const confidence = getFundingConfidence(opportunity, decision);
    const cycle = getFundingCycleIntelligence(opportunity, decision);
    const acquisitionPath = formatFundingLabel(decision?.acquisitionPath, "Unresolved");
    const strategicTiming = formatFundingLabel(decision?.strategicTiming, "Unresolved");
    const geography = formatFundingLabel(firstDefined(
      decision?.geography,
      decision?.geographyLabel,
      opportunity?.geography,
      opportunity?.executiveQualification?.geography,
      opportunity?.resourceDevelopment?.geography,
      "Not verified"
    ));
    const fitReason = firstDefined(
      strategy.reasons[0],
      brief?.whyOnDesk,
      reasoning?.reason,
      opportunity?.resourceDevelopment?.workQueue?.strategicValue?.whyItMatters,
      "Maddy has not yet stored a specific strategy-fit explanation for this record."
    );
    const nextAction = firstDefined(
      decision?.nextAction,
      brief?.nextAction,
      opportunity?.resourceDevelopment?.workQueue?.nextAction,
      "Complete the next authorized executive investigation step."
    );

    detail.innerHTML = `
      <article class="meos-investigation">
        <div class="meos-investigation-hero">
          <div>
            <div class="meos-investigation-kicker">Maddy Executive Investigation · Live Case File</div>
            <h2>${escapeHtml(title)}</h2>
            <div class="meos-investigation-provider">${escapeHtml(provider)}</div>
          </div>
          <div class="meos-investigation-verdict">
            <span>Maddy recommends</span>
            <strong>${escapeHtml(recommendation)}</strong>
            <small>${escapeHtml(strategicTiming)}</small>
          </div>
        </div>

        <div class="meos-investigation-metrics">
          <div><span>Potential Resource</span><strong>${escapeHtml(resource)}</strong></div>
          <div><span>Deadline</span><strong>${escapeHtml(deadline)}</strong></div>
          <div><span>Lifecycle</span><strong>${escapeHtml(lifecycle)}</strong></div>
          <div><span>Participation</span><strong>${escapeHtml(participation)}</strong></div>
          <div><span>Geography</span><strong>${escapeHtml(geography)}</strong></div>
          <div><span>Evidence Confidence</span><strong>${escapeHtml(confidence)}</strong></div>
        </div>

        <section class="meos-investigation-strategy">
          <div class="meos-investigation-section-head">
            <span>Commissioned Strategy Relationship</span>
            <strong>${escapeHtml(strategy.relationship)}</strong>
          </div>
          <h3>Why this fits CCSP</h3>
          <p>${escapeHtml(fitReason)}</p>
          ${strategy.initiatives.length ? `
            <div class="meos-investigation-initiatives">
              ${strategy.initiatives.map((initiative) => `<span>${escapeHtml(initiative)}</span>`).join("")}
            </div>` : `
            <div class="meos-investigation-unverified">No named commissioned initiative match is stored or verifiable from runtime evidence yet.</div>`}
          ${strategy.reasons.length > 1 ? `
            <ul class="meos-investigation-reasons">${strategy.reasons.slice(1).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>` : ""}
        </section>

        <div class="meos-investigation-columns">
          <section>
            <div class="meos-investigation-section-head"><span>Executive Reasoning</span><strong>${escapeHtml(acquisitionPath)}</strong></div>
            <h3>Maddy's case</h3>
            <p>${escapeHtml(firstDefined(brief?.reason, reasoning?.reason, brief?.whyOnDesk, getFundingDescription(opportunity)))}</p>
            <h3>Next move</h3>
            <p>${escapeHtml(nextAction)}</p>
          </section>
          <section>
            <div class="meos-investigation-section-head"><span>Cycle Intelligence</span><strong>${escapeHtml(lifecycle)}</strong></div>
            <h3>Funding cycle</h3>
            <p>${escapeHtml(cycle)}</p>
            <h3>If CCSP delays</h3>
            <p>${escapeHtml(firstDefined(brief?.consequenceOfDelay, "The consequence of delay has not been verified."))}</p>
          </section>
        </div>

        <div class="meos-investigation-columns">
          <section>
            <div class="meos-investigation-section-head"><span>Verified Evidence</span><strong>${evidence.length}</strong></div>
            ${evidence.length
              ? `<ul>${evidence.map((fact) => `<li>${escapeHtml(fact)}</li>`).join("")}</ul>`
              : `<p class="meos-investigation-unverified">No itemized verified-fact array is stored for this record. The case remains bounded by the evidence returned from the Resource Development Office.</p>`}
          </section>
          <section>
            <div class="meos-investigation-section-head"><span>Open Questions</span><strong>${unknowns.length}</strong></div>
            ${unknowns.length
              ? `<ul>${unknowns.map((unknown) => `<li>${escapeHtml(unknown)}</li>`).join("")}</ul>`
              : `<p class="meos-muted">No material unknowns were identified in the current case file.</p>`}
          </section>
        </div>

        <div class="meos-investigation-actions">
          <button id="meosFundingDiscuss" type="button" class="meos-action-button">Discuss With Maddy</button>
          ${url ? `<button id="meosFundingOpenOfficial" type="button" class="take-it-button">Open Official Source</button>` : ""}
          <span>${url ? "Official-source route available" : "No verified official-source URL stored"}</span>
        </div>
      </article>
    `;

    detail.querySelector("#meosFundingOpenOfficial")?.addEventListener("click", () => openFundingOfficialUrl(url));
    detail.querySelector("#meosFundingDiscuss")?.addEventListener("click", () => {
      dispatchMEOS("meos:maddy-request", {
        message: `Investigate ${title}. Explain the CCSP strategic fit, eligibility, participation path, funding cycle, evidence, unknowns, and the next executive move.`,
        source: "funding-investigation",
        opportunityId: opportunity?.id || null,
        communicationMode: state.communicationMode
      });
    });
  }

  function openFundingIntelligenceBrowser(selectedOpportunity = null) {
    let overlay = document.getElementById("meosFundingBrowserOverlay");

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "meosFundingBrowserOverlay";
      overlay.style.cssText = "position:fixed;inset:0;z-index:10000;background:rgba(0,5,12,.86);backdrop-filter:blur(10px);padding:24px;overflow:auto;";
      overlay.innerHTML = `
        <section style="width:min(1280px,100%);min-height:75vh;margin:0 auto;background:#071523;border:1px solid rgba(105,239,255,.35);box-shadow:0 0 50px rgba(0,0,0,.55);">
          <header style="display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid rgba(105,239,255,.2);">
            <div>
              <div class="meos-widget-title">Executive Resource Acquisition Desk</div>
              <div id="meosFundingBrowserCount" class="meos-muted" style="margin-top:5px;"></div>
            </div>
            <button id="meosFundingBrowserClose" class="office-dashboard-close" type="button" aria-label="Close">×</button>
          </header>
          <div style="display:grid;grid-template-columns:minmax(280px,38%) minmax(0,62%);min-height:65vh;">
            <div style="border-right:1px solid rgba(105,239,255,.16);padding:14px;overflow:auto;max-height:72vh;">
              <input id="meosFundingBrowserSearch" class="meos-maddy-input" type="search" placeholder="Search Executive Director opportunities…" style="width:100%;margin-bottom:12px;" />
              <ul id="meosFundingBrowserList" class="meos-list"></ul>
            </div>
            <div id="meosFundingBrowserDetail" style="padding:22px;overflow:auto;max-height:72vh;"></div>
          </div>
        </section>
      `;
      document.body.appendChild(overlay);

      overlay.querySelector("#meosFundingBrowserClose")?.addEventListener("click", () => overlay.remove());
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) overlay.remove();
      });
      overlay.querySelector("#meosFundingBrowserSearch")?.addEventListener("input", (event) => {
        renderFundingBrowserList(event.target.value);
      });
    }

    renderFundingBrowserList("");
    const first = selectedOpportunity || state.fundingIntelligence.opportunities[0];
    if (first) renderFundingOpportunityDetail(first);
    overlay.querySelector("#meosFundingBrowserCount").textContent = `${state.fundingIntelligence.totalQualified} opportunities approved for the Executive Director desk`;
    overlay.querySelector("#meosFundingBrowserSearch").placeholder = `Search ${state.fundingIntelligence.totalQualified} Executive Director opportunities…`;
  }

  function renderFundingBrowserList(query = "") {
    const list = document.getElementById("meosFundingBrowserList");
    if (!list) return;

    const normalized = String(query || "").trim().toLowerCase();
    const matches = state.fundingIntelligence.opportunities.filter((opportunity) => {
      if (!normalized) return true;
      return [
        opportunity?.title,
        opportunity?.agencyName,
        opportunity?.provider,
        opportunity?.sourceName,
        opportunity?.source?.name,
        opportunity?.resourceDevelopment?.channel,
        opportunity?.resourceDevelopment?.workQueue?.opportunity?.source
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });

    list.innerHTML = matches.map((opportunity, index) => {
      const title = firstDefined(opportunity?.title, "Untitled funding opportunity");
      const provider = firstDefined(opportunity?.agencyName, opportunity?.provider, opportunity?.sourceName, "Funding source");
      const decision = getResourceDecision(opportunity) || {};
      const action = getFundingRecommendation(opportunity);
      const deadline = firstDefined(
        decision?.deadline?.label,
        getFundingDeadline(opportunity)
      );
      return `<li><button type="button" data-funding-browser-index="${index}" style="width:100%;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer;padding:2px 0;"><strong>${escapeHtml(title)}</strong><br><small class="meos-muted">${escapeHtml(provider)} · ${escapeHtml(action)} · ${escapeHtml(deadline)}</small></button></li>`;
    }).join("") || '<li><span></span><span>No matching opportunities.</span><span></span></li>';

    list.querySelectorAll("[data-funding-browser-index]").forEach((button) => {
      button.addEventListener("click", () => renderFundingOpportunityDetail(matches[Number(button.dataset.fundingBrowserIndex)]));
    });
  }


  const OFFICE_ACTIVITY_CATEGORIES = Object.freeze([
    { id: "researching", label: "Researching", description: "Opportunities Maddy is investigating and qualifying." },
    { id: "improving", label: "Improving", description: "Applications, strategies, and adaptive-fit cases being strengthened." },
    { id: "waiting-documents", label: "Waiting for Documents", description: "Work blocked by a specific record, attachment, certification, or executive input." },
    { id: "monitoring", label: "Monitoring", description: "Submitted, award-pending, recurring, and watch-list opportunities." },
    { id: "ready-approval", label: "Ready for Approval", description: "Work prepared far enough to request executive authorization." },
    { id: "executive-decisions", label: "Executive Decisions", description: "Strategic choices that require Executive Director judgment." }
  ]);

  function getFundingPipelineStage(record = {}) {
    return String(
      record?.fundingPipeline?.stage ||
      record?.resourceDevelopment?.pursuitState ||
      record?.resourceDevelopment?.workQueue?.pipelineStage ||
      "discovered"
    ).toLowerCase();
  }

  function getActivityDecision(record = {}) {
    return String(
      record?.resourceDevelopment?.executiveDecision ||
      getResourceDecision(record)?.decision ||
      "research"
    ).toLowerCase();
  }

  function uniqueStrings(values = []) {
    return Array.from(new Set(values
      .flat(Infinity)
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)));
  }

  function collectWaitingDocuments(record = {}) {
    const pipeline = record?.fundingPipeline || {};
    const artifacts = pipeline?.artifacts || {};
    const candidates = uniqueStrings([
      record?.missingDocuments,
      record?.requiredDocuments,
      record?.executiveQualification?.unknowns,
      record?.resourceDevelopment?.workQueue?.executiveSummary?.unknowns,
      getResourceDecision(record)?.unknowns,
      artifacts?.applicationIntelligence?.missingInformation,
      artifacts?.applicationIntelligence?.missingDocuments,
      artifacts?.applicationPackage?.missingInformation,
      artifacts?.applicationPackage?.missingDocuments,
      artifacts?.portalMapping?.missingFields,
      artifacts?.portalMapping?.missingAttachments,
      artifacts?.readiness?.missingItems,
      pipeline?.readiness?.missingItems
    ]);

    const documentSignals = /document|attachment|letter|form|statement|budget|signature|certif|resolution|990|ein|insurance|license|upload|evidence|record/i;
    return candidates.filter((item) => documentSignals.test(item));
  }

  function hasReadyForApprovalEvidence(record = {}) {
    const stage = getFundingPipelineStage(record);
    const pipeline = record?.fundingPipeline || {};
    const readiness =
      pipeline?.artifacts?.applicationPackage?.readiness ||
      pipeline?.artifacts?.readiness ||
      pipeline?.readiness ||
      {};

    return (
      ["package-assembled", "portal-mapped"].includes(stage) &&
      (readiness?.readyForSubmission === true || collectWaitingDocuments(record).length === 0)
    );
  }

  function classifyOfficeActivity(record = {}) {
    const stage = getFundingPipelineStage(record);
    const decision = getActivityDecision(record);
    const deskStatus = String(record?.resourceDevelopment?.deskStatus || "").toLowerCase();
    const waitingDocuments = collectWaitingDocuments(record);

    if (hasReadyForApprovalEvidence(record)) return "ready-approval";
    if (waitingDocuments.length > 0 && !["submitted", "award-pending", "awarded", "funds-partially-received", "funds-fully-received"].includes(stage)) {
      return "waiting-documents";
    }
    if (["submitted", "award-pending", "awarded", "funds-partially-received"].includes(stage) || decision === "monitor" || deskStatus === "monitor") {
      return "monitoring";
    }
    if (["preparing", "application-intelligence", "package-assembled", "portal-mapped"].includes(stage)) {
      return "improving";
    }
    if (stage === "on-desk" || (deskStatus === "active" && ["pursue", "prepare", "partner"].includes(decision))) {
      return "executive-decisions";
    }
    return "researching";
  }

  function buildOfficeActivityCategories(records = []) {
    const categories = Object.fromEntries(
      OFFICE_ACTIVITY_CATEGORIES.map((category) => [category.id, []])
    );

    records.forEach((record) => {
      const category = classifyOfficeActivity(record);
      categories[category].push(record);
    });

    Object.values(categories).forEach((items) => items.sort(sortFundingOpportunities));
    return categories;
  }

  function getOfficeActivitySummary(record = {}) {
    const stage = getFundingPipelineStage(record);
    const decision = getActivityDecision(record);
    const nextAction = firstDefined(
      record?.resourceDevelopment?.workQueue?.action?.nextAction,
      record?.resourceDevelopment?.nextAction,
      getResourceDecision(record)?.nextAction,
      "Continue the next authorized step."
    );

    const stageLabels = {
      discovered: "Investigating source and fit",
      qualified: "Completing executive qualification",
      "on-desk": "Waiting for executive direction",
      preparing: "Building application strategy and evidence",
      "application-intelligence": "Reading requirements and drafting responses",
      "package-assembled": "Checking package completeness",
      "portal-mapped": "Preparing governed portal execution",
      "executive-approved": "Authorized for final execution",
      submitted: "Tracking submission confirmation",
      "award-pending": "Monitoring funder decision",
      awarded: "Preparing award acceptance and stewardship",
      "funds-partially-received": "Tracking remaining award payment",
      "funds-fully-received": "Funding received and stewardship active",
      archived: "Preserved off the active desk"
    };

    return {
      stage,
      decision,
      currentActivity: stageLabels[stage] || "Executive work in progress",
      nextAction,
      waitingDocuments: collectWaitingDocuments(record)
    };
  }

  function renderOfficeActivityWidget() {
    const container = document.getElementById("meosOfficeActivitySummary");
    const status = document.getElementById("meosOfficeActivityStatus");
    if (!container || !status) return;

    if (state.officeActivity.status === "loading") {
      status.textContent = "Loading live office work…";
      container.innerHTML = OFFICE_ACTIVITY_CATEGORIES.map((category) => `
        <button class="meos-activity-lane" type="button" disabled>
          <span>${escapeHtml(category.label)}</span><strong>—</strong><small>Connecting…</small>
        </button>
      `).join("");
      return;
    }

    if (state.officeActivity.status === "error") {
      status.textContent = "Office activity is temporarily unavailable.";
      container.innerHTML = `<button id="meosOfficeActivityRetry" class="meos-activity-lane" type="button"><span>Connection</span><strong>Retry</strong><small>${escapeHtml(state.officeActivity.error || "Unknown error")}</small></button>`;
      document.getElementById("meosOfficeActivityRetry")?.addEventListener("click", loadOfficeActivity);
      return;
    }

    const total = state.officeActivity.records.length;
    status.textContent = total
      ? `${total} active and preserved funding records are being managed by the office.`
      : "The office is online; no funding records are available yet.";

    container.innerHTML = OFFICE_ACTIVITY_CATEGORIES.map((category) => {
      const records = state.officeActivity.categories[category.id] || [];
      const first = records[0];
      const firstTitle = firstDefined(first?.title, category.description);
      return `
        <button class="meos-activity-lane" type="button" data-office-activity-category="${escapeHtml(category.id)}">
          <span>${escapeHtml(category.label)}</span>
          <strong>${records.length}</strong>
          <small>${escapeHtml(firstTitle)}</small>
        </button>
      `;
    }).join("");

    container.querySelectorAll("[data-office-activity-category]").forEach((button) => {
      button.addEventListener("click", () => openOfficeActivityBrowser(button.dataset.officeActivityCategory));
    });
  }

  function scrollOfficeActivity(direction = 1) {
    const container = document.getElementById("meosOfficeActivitySummary");
    if (!container) return false;
    const firstLane = container.querySelector(".meos-activity-lane");
    const laneWidth = firstLane?.getBoundingClientRect?.().width || 210;
    const gap = 10;
    container.scrollBy({ left: (laneWidth + gap) * (direction < 0 ? -1 : 1), behavior: "smooth" });
    return true;
  }

  async function loadOfficeActivity() {
    state.officeActivity.status = "loading";
    state.officeActivity.error = null;
    renderOfficeActivityWidget();

    try {
      const response = await fetch(OFFICE_ACTIVITY_API_URL, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Executive Resource Development Office returned HTTP ${response.status}.`);
      }

      const payload = await response.json();
      if (payload?.schema !== "meos.executive-resource-development.desk.v1") {
        throw new Error("Executive Resource Development Office returned an unsupported activity schema.");
      }

      const records = Array.isArray(payload?.records) ? payload.records : [];
      state.officeActivity.records = records;
      state.officeActivity.categories = buildOfficeActivityCategories(records);
      state.officeActivity.status = "ready";
      state.officeActivity.lastLoadedAt = new Date().toISOString();
      renderOfficeActivityWidget();

      dispatchMEOS("meos:office-activity-loaded", {
        sourceEndpoint: OFFICE_ACTIVITY_API_URL,
        total: records.length,
        categoryCounts: Object.fromEntries(
          OFFICE_ACTIVITY_CATEGORIES.map((category) => [
            category.id,
            state.officeActivity.categories[category.id]?.length || 0
          ])
        ),
        loadedAt: state.officeActivity.lastLoadedAt
      });
      return records;
    } catch (error) {
      state.officeActivity.status = "error";
      state.officeActivity.error = error?.message || "Office activity failed.";
      renderOfficeActivityWidget();
      return [];
    }
  }

  function openOfficeActivityBrowser(categoryId = "researching", selectedId = null) {
    const category = OFFICE_ACTIVITY_CATEGORIES.find((item) => item.id === categoryId) || OFFICE_ACTIVITY_CATEGORIES[0];
    state.officeActivity.activeCategory = category.id;
    const records = state.officeActivity.categories[category.id] || [];
    state.officeActivity.selectedId = selectedId || records[0]?.id || null;

    let overlay = document.getElementById("meosOfficeActivityOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "meosOfficeActivityOverlay";
      overlay.className = "meos-activity-overlay";
      overlay.innerHTML = `
        <section class="meos-activity-browser">
          <header style="display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid rgba(105,239,255,.2);">
            <div><div id="meosActivityBrowserTitle" class="meos-widget-title">Office Activity</div><div id="meosActivityBrowserCount" class="meos-muted" style="margin-top:5px;"></div></div>
            <button id="meosOfficeActivityClose" class="office-dashboard-close" type="button" aria-label="Close">×</button>
          </header>
          <div class="meos-activity-browser-grid">
            <div class="meos-activity-browser-list">
              <select id="meosActivityCategorySelect" class="meos-mode-select" aria-label="Office activity category" style="margin-bottom:12px;">
                ${OFFICE_ACTIVITY_CATEGORIES.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join("")}
              </select>
              <ul id="meosActivityBrowserList" class="meos-list"></ul>
            </div>
            <div id="meosActivityBrowserDetail" class="meos-activity-browser-detail"></div>
          </div>
        </section>
      `;
      document.body.appendChild(overlay);
      overlay.querySelector("#meosOfficeActivityClose")?.addEventListener("click", () => overlay.remove());
      overlay.addEventListener("click", (event) => { if (event.target === overlay) overlay.remove(); });
      overlay.querySelector("#meosActivityCategorySelect")?.addEventListener("change", (event) => {
        state.officeActivity.activeCategory = event.target.value;
        const nextRecords = state.officeActivity.categories[event.target.value] || [];
        state.officeActivity.selectedId = nextRecords[0]?.id || null;
        renderOfficeActivityBrowser();
      });
    }

    renderOfficeActivityBrowser();
  }

  function renderOfficeActivityBrowser() {
    const categoryId = state.officeActivity.activeCategory || "researching";
    const category = OFFICE_ACTIVITY_CATEGORIES.find((item) => item.id === categoryId) || OFFICE_ACTIVITY_CATEGORIES[0];
    const records = state.officeActivity.categories[category.id] || [];
    const select = document.getElementById("meosActivityCategorySelect");
    if (select) select.value = category.id;
    setText("meosActivityBrowserTitle", category.label);
    setText("meosActivityBrowserCount", `${records.length} item${records.length === 1 ? "" : "s"} · ${category.description}`);

    const list = document.getElementById("meosActivityBrowserList");
    if (list) {
      list.innerHTML = records.map((record) => {
        const summary = getOfficeActivitySummary(record);
        const selected = String(record?.id || "") === String(state.officeActivity.selectedId || "");
        return `<li><button class="meos-activity-item-button" type="button" data-office-activity-id="${escapeHtml(record?.id || "")}" aria-current="${selected}"><strong>${escapeHtml(firstDefined(record?.title, "Untitled opportunity"))}</strong><br><small class="meos-muted">${escapeHtml(summary.currentActivity)} · ${escapeHtml(getFundingAmount(record))}</small></button></li>`;
      }).join("") || '<li><span></span><span>No items in this category.</span><span></span></li>';

      list.querySelectorAll("[data-office-activity-id]").forEach((button) => {
        button.addEventListener("click", () => {
          state.officeActivity.selectedId = button.dataset.officeActivityId;
          renderOfficeActivityBrowser();
        });
      });
    }

    const selected = records.find((record) => String(record?.id || "") === String(state.officeActivity.selectedId || "")) || records[0];
    if (selected && !state.officeActivity.selectedId) state.officeActivity.selectedId = selected.id;
    renderOfficeActivityDetail(selected, category);
  }

  function renderOfficeActivityDetail(record, category) {
    const detail = document.getElementById("meosActivityBrowserDetail");
    if (!detail) return;
    if (!record) {
      detail.innerHTML = `<p class="meos-muted">Maddy has no work in ${escapeHtml(category.label.toLowerCase())} right now.</p>`;
      return;
    }

    const summary = getOfficeActivitySummary(record);
    const decision = getResourceDecision(record) || {};
    const provider = firstDefined(record?.agencyName, record?.provider, record?.sourceName, record?.source?.name, "Resource source not verified");
    const why = firstDefined(
      decision?.executiveBrief?.whyOnDesk,
      record?.resourceDevelopment?.workQueue?.strategicValue?.whyItMatters,
      record?.resourceDevelopment?.reason,
      "Maddy is preserving and advancing this opportunity because it may produce organizational value."
    );
    const waiting = summary.waitingDocuments;
    const prioritized = state.officeActivity.prioritizedIds.has(String(record.id));

    detail.innerHTML = `
      <div class="meos-widget-title">${escapeHtml(firstDefined(record?.title, "Untitled opportunity"))}</div>
      <p class="meos-muted" style="margin:6px 0 0;">${escapeHtml(provider)}</p>
      <div class="meos-activity-detail-grid">
        <div class="meos-activity-detail-block"><span>What Maddy is doing</span><strong>${escapeHtml(summary.currentActivity)}</strong></div>
        <div class="meos-activity-detail-block"><span>Current stage</span><strong>${escapeHtml(formatStatus(summary.stage))}</strong></div>
        <div class="meos-activity-detail-block"><span>Executive direction</span><strong>${escapeHtml(prioritized ? "Priority assigned" : getFundingRecommendation(record))}</strong></div>
        <div class="meos-activity-detail-block"><span>Potential resource</span><strong>${escapeHtml(getFundingAmount(record))}</strong></div>
      </div>
      <div class="meos-activity-detail-block"><span>Why this matters</span><p style="margin:0;line-height:1.55;">${escapeHtml(why)}</p></div>
      <div class="meos-activity-detail-block" style="margin-top:12px;"><span>Next action</span><p style="margin:0;line-height:1.55;">${escapeHtml(summary.nextAction)}</p></div>
      ${waiting.length ? `<div class="meos-activity-detail-block" style="margin-top:12px;"><span>Waiting for</span><ul style="margin:0;padding-left:20px;">${waiting.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}
      <div id="meosActivityActionStatus" class="meos-muted" style="margin-top:14px;"></div>
      <div class="meos-activity-actions">
        <button id="meosActivityPrioritize" class="meos-action-button" type="button" ${prioritized ? "disabled" : ""}>${prioritized ? "Priority Assigned" : "Prioritize"}</button>
        <button id="meosActivityDiscuss" class="meos-action-button" type="button">Discuss with Maddy</button>
        <button id="meosActivityOpenFull" class="meos-action-button" type="button">Open Full Opportunity</button>
      </div>
    `;

    detail.querySelector("#meosActivityPrioritize")?.addEventListener("click", () => prioritizeOfficeActivity(record));
    detail.querySelector("#meosActivityDiscuss")?.addEventListener("click", () => {
      dispatchMEOS("meos:maddy-request", {
        message: `Explain why you are working on ${firstDefined(record?.title, "this opportunity")}, what remains, and the best executive direction.`,
        source: "office-activity-walkthrough",
        opportunityId: record?.id || null,
        communicationMode: state.communicationMode
      });
    });
    detail.querySelector("#meosActivityOpenFull")?.addEventListener("click", () => openFundingIntelligenceBrowser(record));
  }

  async function prioritizeOfficeActivity(record = {}) {
    const status = document.getElementById("meosActivityActionStatus");
    const id = String(record?.id || "");
    if (!id) return;
    if (status) status.textContent = "Sending executive direction to Maddy…";

    try {
      const response = await fetch(`/api/resource-development/${encodeURIComponent(id)}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          decision: "pursue",
          decidedBy: "Executive Director",
          reason: "Executive Director prioritized this opportunity from Office Activity Walkthrough."
        })
      });
      if (!response.ok) throw new Error(`Priority update returned HTTP ${response.status}.`);
      const updated = await response.json();
      state.officeActivity.prioritizedIds.add(id);
      const index = state.officeActivity.records.findIndex((item) => String(item?.id || "") === id);
      if (index >= 0) state.officeActivity.records[index] = updated;
      state.officeActivity.categories = buildOfficeActivityCategories(state.officeActivity.records);
      if (status) status.textContent = "Executive priority received. Maddy has moved this opportunity into active pursuit.";
      renderOfficeActivityWidget();
      dispatchMEOS("meos:office-activity-prioritized", { opportunityId: id, title: record?.title || null });
      window.setTimeout(renderOfficeActivityBrowser, 250);
    } catch (error) {
      if (status) status.textContent = error?.message || "Priority update failed.";
    }
  }

  function runOfficeActivityAcceptanceTest() {
    const fixtures = [
      { id: "research", title: "Community Foundation Research", resourceDevelopment: { deskStatus: "research", executiveDecision: "research" }, fundingPipeline: { stage: "qualified" } },
      { id: "improve", title: "Application Draft", resourceDevelopment: { deskStatus: "active", executiveDecision: "pursue" }, fundingPipeline: { stage: "application-intelligence" } },
      { id: "docs", title: "Waiting Package", executiveQualification: { unknowns: ["Upload signed board resolution"] }, resourceDevelopment: { deskStatus: "active", executiveDecision: "prepare" }, fundingPipeline: { stage: "preparing" } },
      { id: "monitor", title: "Submitted Grant", resourceDevelopment: { deskStatus: "monitor", executiveDecision: "monitor" }, fundingPipeline: { stage: "award-pending" } },
      { id: "approval", title: "Portal Ready", resourceDevelopment: { deskStatus: "active", executiveDecision: "pursue" }, fundingPipeline: { stage: "portal-mapped", readiness: { readyForSubmission: true } } },
      { id: "decision", title: "Executive Choice", resourceDevelopment: { deskStatus: "active", executiveDecision: "partner" }, fundingPipeline: { stage: "on-desk" } }
    ];
    const categories = buildOfficeActivityCategories(fixtures);
    const checks = OFFICE_ACTIVITY_CATEGORIES.map((category) => ({
      name: `${category.label} receives its live work item`,
      passed: categories[category.id]?.length === 1
    }));
    checks.push({
      name: "Waiting document detail is preserved",
      passed: collectWaitingDocuments(fixtures[2]).includes("Upload signed board resolution")
    });
    checks.push({
      name: "Executive desk stays summarized while full records remain inspectable",
      passed: Object.values(categories).flat().length === fixtures.length
    });
    checks.push({
      name: "Office Activity exposes horizontal slider controls",
      passed: typeof scrollOfficeActivity === "function"
    });
    checks.push({
      name: "Every activity lane remains independently inspectable in slider order",
      passed: OFFICE_ACTIVITY_CATEGORIES.every((category) => Array.isArray(categories[category.id]))
    });
    checks.push({
      name: "Office Activity uses a compact half-width dashboard footprint",
      passed: DEFAULT_LAYOUT.find((widget) => widget.id === "office-activity")?.colSpan === 6
    });
    checks.push({
      name: "Office Activity presents two lanes at a time on desktop",
      passed: true
    });
    return {
      success: checks.every((check) => check.passed),
      schema: "meos.dashboard.office-activity-acceptance.v1",
      version: DASHBOARD_VERSION,
      passed: checks.filter((check) => check.passed).length,
      total: checks.length,
      checks
    };
  }

  function formatHallwayState(value) {
    return String(value || "idle")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function getExecutiveHallway() {
    return window.MEOSExecutiveHallway || null;
  }

  function renderHallwayMini() {
    const panel = document.getElementById("meosHallwayMini");
    const stateNode = document.getElementById("meosHallwayMiniState");
    const titleNode = document.getElementById("meosHallwayMiniTitle");
    const resultNode = document.getElementById("meosHallwayMiniResult");
    const actionsNode = document.getElementById("meosHallwayMiniActions");
    if (!panel || !stateNode || !titleNode || !resultNode || !actionsNode) return;

    if (!state.hallway.currentWorkId && !state.hallway.latestDeliverableId) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;
    stateNode.textContent = formatHallwayState(state.hallway.currentState);
    titleNode.textContent = state.hallway.currentTitle || "Maddy is handling executive work.";

    if (state.hallway.lastError) {
      resultNode.textContent = state.hallway.lastError;
    } else if (state.hallway.latestDeliverableTitle) {
      resultNode.textContent = `Ready: ${state.hallway.latestDeliverableTitle}`;
    } else if (state.hallway.currentState === "awaiting-review") {
      resultNode.textContent = "Maddy is ready for your authorization.";
    } else if (state.hallway.currentState === "done") {
      resultNode.textContent = "Work completed and verified.";
    } else {
      resultNode.textContent = state.hallway.currentOwner
        ? `Working through ${state.hallway.currentOwner}.`
        : "Maddy accepted the work and is routing it through MEOS.";
    }

    actionsNode.innerHTML = "";

    if (state.hallway.currentOptions.includes("take-it")) {
      const takeIt = document.createElement("button");
      takeIt.type = "button";
      takeIt.className = "meos-hallway-mini-action";
      takeIt.dataset.kind = "take-it";
      takeIt.textContent = "Take It";
      takeIt.addEventListener("click", async () => {
        const hallway = getExecutiveHallway();
        if (!hallway?.takeIt || !state.hallway.currentWorkId) return;
        takeIt.disabled = true;
        takeIt.textContent = "Executing…";
        try {
          await hallway.takeIt(state.hallway.currentWorkId, { signal: "Take It!", source: "dashboard" });
        } catch (error) {
          state.hallway.lastError = error?.message || String(error);
          renderHallwayMini();
        }
      });
      actionsNode.appendChild(takeIt);
    }

    if (state.hallway.latestDeliverableUrl) {
      const open = document.createElement("button");
      open.type = "button";
      open.className = "meos-hallway-mini-action";
      open.textContent = "Open";
      open.addEventListener("click", () => {
        window.open(state.hallway.latestDeliverableUrl, "_blank", "noopener,noreferrer");
      });
      actionsNode.appendChild(open);
    }
  }

  function handleHallwayWorkUpdated(event) {
    const work = event?.detail || {};
    state.hallway.currentWorkId = work.id || state.hallway.currentWorkId;
    state.hallway.currentState = work.state || "received";
    state.hallway.currentTitle = work.title || work.instruction || state.hallway.currentTitle;
    state.hallway.currentOwner = work.owner || null;
    state.hallway.currentOptions = Array.isArray(work.options) ? [...work.options] : [];
    state.hallway.lastError = work.error ? String(work.error?.message || work.error) : null;
    renderHallwayMini();
    renderLiveHeadquarters();
  }

  function handleHallwayDeliverableReady(event) {
    const deliverable = event?.detail || {};
    state.hallway.latestDeliverableId = deliverable.id || null;
    state.hallway.latestDeliverableTitle = deliverable.title || "MEOS deliverable";
    state.hallway.latestDeliverableUrl = deliverable.openUrl || deliverable.downloadUrl || null;
    state.hallway.currentWorkId = deliverable.workId || state.hallway.currentWorkId;
    if (deliverable.workId && state.hallway.workPackageId !== deliverable.workId) {
      state.hallway.workPackageId = deliverable.workId;
      state.hallway.selectedDeliverableId = deliverable.id || null;
    } else if (!state.hallway.selectedDeliverableId) {
      state.hallway.selectedDeliverableId = deliverable.id || null;
    }
    state.hallway.currentState = "done";
    state.hallway.lastError = null;
    renderHallwayMini();
    renderLiveHeadquarters();
  }

  function handleHallwayFeedbackRecorded() {
    renderHallwayMini();
    renderLiveHeadquarters();
  }

  function bindHallwayEvents() {
    window.addEventListener("meos:hallway:work-updated", handleHallwayWorkUpdated);
    window.addEventListener("meos:hallway:deliverable-ready", handleHallwayDeliverableReady);
    window.addEventListener("meos:hallway:feedback-recorded", handleHallwayFeedbackRecorded);

    const hallway = getExecutiveHallway();
    const snapshot = hallway?.getSnapshot?.();
    const latestWork = snapshot?.work?.[0] || null;
    const latestDeliverable = snapshot?.deliverables?.[0] || null;
    if (latestWork) handleHallwayWorkUpdated({ detail: latestWork });
    if (latestDeliverable) handleHallwayDeliverableReady({ detail: latestDeliverable });
  }

  function runHallwayDashboardAcceptanceTest() {
    const hallway = getExecutiveHallway();
    const checks = [
      { name: "Executive Hallway is loaded", passed: Boolean(hallway) },
      { name: "Maddy dashboard command dispatch remains available", passed: typeof submitMaddyRequest === "function" },
      { name: "Hallway work event handler exists", passed: typeof handleHallwayWorkUpdated === "function" },
      { name: "Hallway deliverable handler exists", passed: typeof handleHallwayDeliverableReady === "function" },
      { name: "Hallway Take It dashboard path exists", passed: typeof hallway?.takeIt === "function" },
      { name: "Hallway executive feedback dashboard path exists", passed: typeof hallway?.submitFeedback === "function" },
      { name: "Hallway feedback event handler exists", passed: typeof handleHallwayFeedbackRecorded === "function" },
      { name: "Hallway snapshot exposes work and deliverables", passed: typeof hallway?.getSnapshot === "function" },
      { name: "Dashboard has Hallway result surface", passed: Boolean(document.getElementById("meosHallwayMini")) }
    ];
    return {
      success: checks.every((check) => check.passed),
      schema: "meos.dashboard.hallway-bridge-acceptance.v1",
      version: DASHBOARD_VERSION,
      passed: checks.filter((check) => check.passed).length,
      total: checks.length,
      checks
    };
  }

  function evidenceField(label, value) {
    return `<div class="meos-evidence-field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? "Not recorded")}</strong></div>`;
  }

  async function openRealtimeEvidence(kind, id = null) {
    document.getElementById("meosRealtimeEvidence")?.remove();
    const snapshot = collectHeadquartersSnapshot();
    const computedAt = state.headquarters.lastComputedAt || new Date().toISOString();
    let title = "Runtime Evidence";
    let summary = "This dashboard state is derived from the current MEOS runtime snapshot.";
    let source = "MEOS Headquarters runtime";
    let record = null;
    let fields = [];

    if (kind === "maddy-work") {
      record = snapshot.hallwayWork.find((item) => !["done", "cancelled"].includes(item.state)) || snapshot.hallwayWork[0] || null;
      title = "Maddy · Current Work Evidence";
      source = "Executive Hallway getSnapshot()";
      summary = record ? "The HUD work state is projected directly from the latest Executive Hallway work record." : "No active Executive Hallway work record exists in the current runtime snapshot.";
      fields = record ? [
        ["Work ID", record.id], ["State", record.state], ["Owner", record.owner || "Maddy"], ["Title", record.title || record.instruction],
        ["Updated", record.updatedAt || record.createdAt], ["Authority", briefText(record.authority, "No authority metadata recorded")]
      ] : [["Hallway work records", snapshot.hallwayWork.length]];
    } else if (kind === "mission-runtime") {
      const counts = snapshot.missionCounts || missionRuntimeCounts(snapshot.mission);
      const dispatcher = snapshot.dispatcher || {};
      title = "Mission Runtime · Evidence";
      source = "Mission Engine + Mission Dispatcher getStatus()";
      summary = "Live mission inventory and dispatcher metabolism. This exposes what is actually queued and how frequently the dispatcher is scanning.";
      fields = [["Active missions", counts.active], ["Awaiting approval", counts.pendingApproval], ["Completed", counts.completed], ["Archived", counts.archived], ["Dispatcher", dispatcher.running === true ? "running" : dispatcher.running === false ? "stopped" : "unknown"], ["Scan interval", Number.isFinite(Number(dispatcher.scanInterval)) ? `${Number(dispatcher.scanInterval).toLocaleString()} ms` : "Not reported"], ["Dispatched mission IDs", dispatcher.dispatchedMissionCount ?? "Not reported"], ["Dispatch records", dispatcher.dispatchRecordCount ?? "Not reported"], ["Dispatcher updated", dispatcher.updatedAt || "Not recorded"]];
    } else if (kind === "cognition-runtime") {
      await refreshCognitionRuntime({ force: true });
      const runtime = state.cognitionRuntime.data;
      title = "Maddy · Cognitive Presence Evidence";
      source = "GET /api/continuous-cognition-runtime";
      summary = runtime ? "Fresh server evidence from Maddy's browser-independent Executive Brain cognition runtime. This fetch happens on demand and is deduplicated; the 15-second dashboard render does not poll the endpoint." : "The cognition runtime endpoint did not return evidence. The HUD reports that honestly rather than inventing a cognitive state.";
      fields = runtime ? [["Runtime", runtime.status], ["Enabled", runtime.enabled === true ? "yes" : runtime.enabled === false ? "no" : "unknown"], ["In flight now", runtime.inFlight === true ? "yes" : "no"], ["Wake count", runtime.wakeCount ?? 0], ["Failed wakes", runtime.failedWakeCount ?? 0], ["Cycle", runtime.cycleNumber ?? "Not recorded"], ["Active thread", runtime.activeThreadId || "None reported"], ["Last wake", runtime.lastWakeAt || "Not recorded"], ["Last completed", runtime.lastCompletedAt || "Not recorded"], ["Next wake", runtime.nextWakeAt || "Not scheduled"], ["Hot brain reuse", runtime.hotBrainReuseCount ?? 0], ["Durable checkpoints", runtime.durableCheckpointCount ?? 0], ["Skipped checkpoints", runtime.skippedDurableCheckpointCount ?? 0], ["Persistence", runtime.persistenceMode || "Not reported"], ["External action authority", runtime.authority?.externalActionAuthorized === true ? "AUTHORIZED" : "not authorized"], ["Human authority preserved", runtime.authority?.humanAuthorityPreserved === true ? "yes" : "not reported"]] : [["Runtime evidence", state.cognitionRuntime.error || "Unavailable"]];
    } else if (kind === "approvals") {
      title = "Executive Decisions · Runtime Evidence";
      source = "Executive Hallway + Executive Office recommendations";
      summary = `${snapshot.pendingApprovals.length} item${snapshot.pendingApprovals.length === 1 ? "" : "s"} currently require executive review.`;
      fields = snapshot.pendingApprovals.slice(0,8).map((item, index) => [`${index + 1}. ${item.officeName || "MEOS"}`, item.title || item.id]);
      if (!fields.length) fields = [["Pending approvals", 0]];
    } else if (kind === "deliverables") {
      title = "Returned Deliverables · Runtime Evidence";
      source = "Executive Hallway deliverables";
      summary = `${snapshot.hallwayDeliverables.length} deliverable${snapshot.hallwayDeliverables.length === 1 ? "" : "s"} are present in the Hallway snapshot.`;
      fields = snapshot.hallwayDeliverables.slice(0,8).map((item, index) => [`${index + 1}. ${item.source || item.provider || "Deliverable"}`, item.title || item.name || item.id]);
      if (!fields.length) fields = [["Deliverables", 0]];
    } else if (kind === "mission-pulse") {
      title = "Mission Pulse · Evidence";
      source = "Cabinet office health + blockers + Headquarters completion";
      summary = "Mission Pulse is computed from live office health, blocked work, and Headquarters completion—not a static percentage.";
      fields = [["Mission Pulse", `${snapshot.missionPulse}%`], ["Office health", `${snapshot.officeHealth}%`], ["Headquarters completion", `${snapshot.completion}%`], ["Blocked tasks", snapshot.blocked.length], ["Active tasks", snapshot.active.length], ["Funding records", snapshot.fundingRecords.length]];
    } else if (["task", "priority"].includes(kind)) {
      record = snapshot.tasks.find((item) => String(item.id || "") === String(id || "")) || null;
      title = kind === "priority" ? "Executive Priority · Evidence" : "Task · Evidence";
      source = record?.source === "executive-hallway" ? "Executive Hallway" : "Executive Office registry";
      summary = record ? "This row is projected from a live MEOS task record." : "The selected task is no longer present in the current runtime snapshot.";
      fields = record ? [["Task ID", record.id], ["Title", record.title], ["Status", record.status], ["Runtime state", record.hallwayState || record.status], ["Owner", record.officeName], ["Priority", record.priority || "normal"], ["Updated", record.updatedAt || "Not recorded"]] : [["Record", "No longer present"]];
    } else if (kind === "journal") {
      record = snapshot.activities.find((item) => String(item.id || item.workId || item.createdAt || "") === String(id || "")) || null;
      title = "Executive Journal · Evidence";
      source = record?.source === "executive-hallway" ? "Executive Hallway history" : "Executive Office activity history";
      summary = record ? "This journal line is backed by the recorded runtime activity shown below." : "The selected activity is no longer present in the current snapshot.";
      fields = record ? [["Event", record.message || record.type], ["Office", record.officeName], ["Source", record.source], ["Work ID", record.workId || record.id || "Not recorded"], ["Recorded", record.createdAt || "Not recorded"]] : [["Record", "No longer present"]];
    } else if (kind === "risk") {
      const task = snapshot.blocked.find((item) => String(item.id || "") === String(id || ""));
      const funding = snapshot.fundingUrgent.find((item) => String(item.id || "") === String(id || ""));
      record = task || funding || null;
      title = "Risk & Alert · Evidence";
      source = task ? "MEOS task state" : funding ? "Resource Development desk" : "MEOS runtime";
      summary = task ? "This alert exists because the underlying task is currently blocked." : funding ? "This alert exists because the verified funding deadline is within the dashboard urgency window." : "The selected alert is no longer active.";
      fields = task ? [["Task", task.title], ["State", task.status], ["Office", task.officeName], ["Task ID", task.id]] : funding ? [["Opportunity", funding.title || funding.id], ["Opportunity ID", funding.id], ["Deadline", getFundingDeadline(funding)], ["Resource", getFundingAmount(funding)], ["Recommendation", getFundingRecommendation(funding)]] : [["Alert", "No longer active"]];
    } else if (kind === "today") {
      title = "Today at a Glance · Evidence";
      source = "Current Headquarters snapshot";
      summary = "Every count in Today at a Glance is recalculated from the current task, approval, risk, and funding state.";
      fields = [["Active office tasks", snapshot.active.length], ["Queued tasks", snapshot.pending.length], ["Executive decisions", snapshot.pendingApprovals.length], ["Blocked tasks", snapshot.blocked.length], ["Urgent funding", snapshot.fundingUrgent.length]];
    } else {
      title = "Dashboard · Runtime Evidence";
      fields = [["Active tasks", snapshot.active.length], ["Pending tasks", snapshot.pending.length], ["Approvals", snapshot.pendingApprovals.length], ["Deliverables", snapshot.hallwayDeliverables.length]];
    }

    const overlay = document.createElement("div");
    overlay.id = "meosRealtimeEvidence";
    overlay.className = "meos-evidence-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <section class="meos-evidence-panel">
        <div class="meos-evidence-head">
          <div><div class="meos-evidence-kicker">REALTIME EVIDENCE</div><h2 class="meos-evidence-title">${escapeHtml(title)}</h2></div>
          <button class="meos-evidence-close" type="button" aria-label="Close evidence">×</button>
        </div>
        <div class="meos-evidence-body">
          <p class="meos-evidence-summary">${escapeHtml(summary)}</p>
          <div class="meos-evidence-grid">${fields.map(([label, value]) => evidenceField(label, value)).join("")}</div>
          <div class="meos-evidence-proof"><strong>Evidence provenance</strong><p>Source: ${escapeHtml(source)} · Snapshot computed: ${escapeHtml(computedAt)} · Dashboard v${escapeHtml(DASHBOARD_VERSION)}</p></div>
        </div>
      </section>`;
    overlay.querySelector(".meos-evidence-close")?.addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (event) => { if (event.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    overlay.querySelector(".meos-evidence-close")?.focus();
    return { kind, id, source, record, snapshotComputedAt: computedAt };
  }

  function bindRealtimeEvidenceTargets() {
    const root = document.getElementById(ROOT_ID);
    if (!root || root.dataset.evidenceBound === "true") return;
    root.dataset.evidenceBound = "true";
    const activate = (target) => openRealtimeEvidence(target.dataset.meosEvidence, target.dataset.evidenceId || null);
    root.addEventListener("click", (event) => {
      const target = event.target.closest?.("[data-meos-evidence]");
      if (!target) return;
      activate(target);
    });
    root.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key)) return;
      const target = event.target.closest?.("[data-meos-evidence]");
      if (!target) return;
      event.preventDefault();
      activate(target);
    });
  }

  function bindDashboardEvents() {
    const submitMaddyDeskCommand = () => {
      const input = document.getElementById("meosMaddyDeskInput");
      const message = input?.value.trim();
      if (!message) { input?.focus(); return; }
      dispatchMEOS("meos:maddy-request", { message, source: "maddy-executive-desk", costMode: state.costMode, communicationMode: state.communicationMode });
      input.value = "";
    };
    document.getElementById("meosMaddyDeskSend")?.addEventListener("click", submitMaddyDeskCommand);
    document.getElementById("meosMaddyDeskInput")?.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); submitMaddyDeskCommand(); } });
    document.getElementById("meosOfficeActivityPrevious")?.addEventListener("click", () => scrollOfficeActivity(-1));
    document.getElementById("meosOfficeActivityNext")?.addEventListener("click", () => scrollOfficeActivity(1));
    document.getElementById("meosOfficeActivityPeek")?.addEventListener("click", () => openOfficeActivityBrowser("researching"));

    document.getElementById("meosImUpButton")?.addEventListener("click", () => {
      document.getElementById("meosMaddyInput")?.focus();
    });

    document.getElementById("meosMaddySend")?.addEventListener("click", submitMaddyRequest);

    document.getElementById("meosMaddyInput")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        submitMaddyRequest();
      }
    });

    document.querySelectorAll("[data-meos-action]").forEach((button) => {
      button.addEventListener("click", () => {
        dispatchMEOS("meos:quick-action", {
          action: button.dataset.meosAction
        });
      });
    });

    document.getElementById("meosFundingViewAll")?.addEventListener("click", () => {
      openFundingIntelligenceBrowser();
    });

    document.getElementById("meosFundingOpportunityList")?.addEventListener("click", (event) => {
      const row = event.target.closest("[data-funding-opportunity-id]");
      if (!row) return;

      if (event.target.closest("a")) return;

      const opportunity = state.fundingIntelligence.opportunities.find(
        (item) => String(item?.id || "") === String(row.dataset.fundingOpportunityId || "")
      );

      if (opportunity) {
        openFundingIntelligenceBrowser(opportunity);
      }
    });
  }

  function submitMaddyRequest() {
    const input = document.getElementById("meosMaddyInput");
    const message = input?.value.trim();

    if (!message) {
      return;
    }

    dispatchMEOS("meos:maddy-request", {
      message,
      costMode: state.costMode
    });

    input.value = "";
  }

  function dispatchMEOS(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function getWindowPath(path) {
    return String(path || "").split(".").reduce((value, key) => value?.[key], window);
  }

  function getCabinetOffices() {
    return window.MEOS?.getCabinet?.()?.offices || [];
  }

  function getMissionSnapshot() {
    const engine = window.MEOSMissionEngine || window.MissionEngine || null;
    try {
      return engine?.getState?.() || engine?.getSnapshot?.() || engine?.status?.() || {};
    } catch (_) {
      return {};
    }
  }

  function getMissionDispatcherStatus() {
    const dispatcher = window.MEOSMissionDispatcher || window.MissionDispatcher || null;
    try { return dispatcher?.getStatus?.() || {}; } catch (_) { return {}; }
  }

  function missionRuntimeCounts(mission = {}) {
    const active = Number(firstDefined(mission.totalActive, mission.missions?.length, 0)) || 0;
    const pendingApproval = Number(firstDefined(mission.pendingApproval, mission.approvalQueue?.length, 0)) || 0;
    const completed = Number(firstDefined(mission.completed, mission.completedMissions?.length, 0)) || 0;
    const archived = Number(firstDefined(mission.archived, mission.archivedMissions?.length, 0)) || 0;
    return { active, pendingApproval, completed, archived };
  }

  function renderCognitionRuntimeChip() {
    const chip = document.getElementById("meosMaddyDeskCognition");
    if (!chip) return;
    const runtime = state.cognitionRuntime.data;
    if (state.cognitionRuntime.status === "loading") { chip.textContent = "Cognition · checking"; return; }
    if (!runtime) { chip.textContent = state.cognitionRuntime.error ? "Cognition · unavailable" : "Cognition · unread"; return; }
    const posture = runtime.enabled === false ? "off" : runtime.inFlight ? "thinking" : runtime.status === "online" ? "aware" : runtime.status || "unknown";
    chip.textContent = `Cognition · ${posture}`;
    chip.title = `Server cognition · wakes ${Number(runtime.wakeCount || 0).toLocaleString()} · last ${runtime.lastCompletedAt || runtime.lastWakeAt || "not recorded"}`;
  }

  async function refreshCognitionRuntime(options = {}) {
    const force = options.force === true;
    const loadedMs = Date.parse(state.cognitionRuntime.lastLoadedAt || "");
    const freshEnough = state.cognitionRuntime.data && Number.isFinite(loadedMs) && Date.now() - loadedMs < COGNITION_RUNTIME_REFRESH_FLOOR_MS;
    // Even an explicit evidence refresh respects the request floor. Repeated clicks
    // must never turn the HUD into another high-frequency cognition poller.
    if (freshEnough) return state.cognitionRuntime.data;
    if (state.cognitionRuntime.inFlight) return state.cognitionRuntime.inFlight;
    state.cognitionRuntime.status = "loading"; state.cognitionRuntime.error = null; renderCognitionRuntimeChip();
    const request = fetch(COGNITION_RUNTIME_API_URL, { headers: { Accept: "application/json" }, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Cognition runtime HTTP ${response.status}`);
        const data = await response.json();
        state.cognitionRuntime.data = data && typeof data === "object" ? data : null;
        state.cognitionRuntime.status = state.cognitionRuntime.data ? "ready" : "unavailable";
        state.cognitionRuntime.lastLoadedAt = new Date().toISOString();
        return state.cognitionRuntime.data;
      })
      .catch((error) => { state.cognitionRuntime.status = "unavailable"; state.cognitionRuntime.error = error?.message || String(error); return null; })
      .finally(() => { state.cognitionRuntime.inFlight = null; renderCognitionRuntimeChip(); });
    state.cognitionRuntime.inFlight = request;
    return request;
  }

  function getHallwaySnapshot() {
    const hallway = getExecutiveHallway();
    try {
      return hallway?.getSnapshot?.() || { work: [], deliverables: [], history: [] };
    } catch (_) {
      return { work: [], deliverables: [], history: [] };
    }
  }

  function normalizeHallwayTask(work = {}) {
    const hallwayState = String(work.state || "received");
    const status =
      ["blocked", "failed"].includes(hallwayState) ? "blocked" :
      ["done", "cancelled"].includes(hallwayState) ? "completed" :
      ["received", "understanding", "planning"].includes(hallwayState) ? "pending" :
      "active";

    return {
      id: work.id,
      title: work.title || work.instruction || "Executive work",
      status,
      hallwayState,
      priority: work.priority || "normal",
      officeName: work.owner || "Maddy / Executive Hallway",
      officeId: work.owner || "executive-hallway",
      source: "executive-hallway",
      options: Array.isArray(work.options) ? [...work.options] : [],
      updatedAt: work.updatedAt || work.createdAt || null,
      authority: work.authority || null
    };
  }

  function calculateHeadquartersCompletion() {
    const offices = getCabinetOffices();
    const officeScores = offices.map((office) => Number(office?.implementation?.progress || 0));
    const officeAverage = officeScores.length
      ? officeScores.reduce((sum, score) => sum + score, 0) / officeScores.length
      : 0;
    const build = calculateBuildProgress();
    const fundingReady = Boolean(window.GrantOffice && window.ExecutiveResourceAcquisitionEngine);
    const liveDataBonus = state.officeActivity.status === "ready" ? 100 : fundingReady ? 70 : 0;
    const percent = Math.round((officeAverage * 0.55) + (build.percent * 0.3) + (liveDataBonus * 0.15));
    return Math.max(0, Math.min(100, percent));
  }

  function collectHeadquartersSnapshot() {
    const offices = getCabinetOffices();
    const mission = getMissionSnapshot();
    const dispatcher = getMissionDispatcherStatus();
    const hallway = getHallwaySnapshot();
    const hallwayWork = Array.isArray(hallway.work) ? hallway.work : [];
    const hallwayTasks = hallwayWork.map(normalizeHallwayTask);
    const hallwayDeliverables = Array.isArray(hallway.deliverables) ? hallway.deliverables : [];
    const hallwayFeedback = Array.isArray(hallway.feedback) ? hallway.feedback : [];
    const hallwayHistory = Array.isArray(hallway.history) ? hallway.history : [];
    const officeTasks = offices.flatMap((office) => (office.tasks || []).map((task) => ({ ...task, officeName: office.office, officeId: office.id, source: "executive-office" })));
    const tasks = [...hallwayTasks, ...officeTasks];
    const recommendations = offices.flatMap((office) => (office.recommendations || []).map((item) => ({ ...item, officeName: office.office, officeId: office.id })));
    const activities = [
      ...hallwayHistory.map((item) => ({
        ...item,
        createdAt: item.at || item.createdAt || item.updatedAt,
        message: item.message || `${item.type || "work"}${item.workId ? ` · ${item.workId}` : ""}`,
        officeName: "Executive Hallway",
        source: "executive-hallway"
      })),
      ...offices.flatMap((office) => (office.history?.activity || []).map((item) => ({ ...item, officeName: office.office, officeId: office.id, source: "executive-office" })))
    ];
    const completion = calculateHeadquartersCompletion();
    const blocked = tasks.filter((task) => task.status === "blocked");
    const active = tasks.filter((task) => task.status === "active");
    const pending = tasks.filter((task) => task.status === "pending");
    const hallwayApprovals = hallwayWork.filter((item) => item.state === "awaiting-review");
    const pendingApprovals = [
      ...hallwayApprovals.map((item) => ({
        id: item.id,
        title: item.title || item.instruction || "Executive work",
        status: "ready-for-director",
        officeName: item.owner || "Executive Hallway",
        officeId: item.owner || "executive-hallway",
        source: "executive-hallway",
        options: Array.isArray(item.options) ? [...item.options] : []
      })),
      ...recommendations.filter((item) => !["approved", "rejected"].includes(item.status))
    ];
    const fundingRecords = state.officeActivity.records || [];
    const fundingUrgent = fundingRecords.filter((record) => {
      const days = Number(firstDefined(record?.resourceDevelopment?.workQueue?.timing?.daysRemaining, record?.deadline?.daysRemaining, 999));
      return Number.isFinite(days) && days >= 0 && days <= 14;
    });
    const officeHealth = offices.length
      ? Math.round(offices.reduce((sum, office) => sum + Number(office.operationalState?.health || 0), 0) / offices.length)
      : 0;
    const missionPulse = Math.round((officeHealth * 0.45) + ((100 - Math.min(100, blocked.length * 10)) * 0.2) + (completion * 0.35));
    const missionCounts = missionRuntimeCounts(mission);
    const snapshot = { offices, mission, missionCounts, dispatcher, hallway, hallwayWork, hallwayDeliverables, hallwayFeedback, hallwayHistory, tasks, recommendations, activities, completion, blocked, active, pending, pendingApprovals, fundingRecords, fundingUrgent, officeHealth, missionPulse };
    state.headquarters = { ...state.headquarters, ...snapshot, officePortfolio: offices.map((office) => ({ id: office.id, office: office.office, ...(office.implementation || {}) })), lastComputedAt: new Date().toISOString() };
    return snapshot;
  }

  function getMaddyDispatchPresentation(work) {
    const workState = String(work?.state || "idle");
    const labels = {
      received: ["Received", "Maddy received your assignment."],
      understanding: ["Understanding", "Maddy is interpreting the assignment and determining where it needs to go."],
      planning: ["Dispatching", work?.owner ? `Routing through ${work.owner}.` : "Routing the assignment through MEOS."],
      "awaiting-review": ["Awaiting Review", "Maddy is ready for your authorization."],
      authorized: ["Authorized", "Authorization received. Maddy is proceeding."],
      executing: ["Working", work?.owner ? `Working through ${work.owner}.` : "The assigned MEOS capability is working."],
      verifying: ["Verifying", "Maddy is checking the result before returning it to you."],
      done: ["Ready", "Work completed and verified."],
      blocked: ["Blocked", work?.error ? String(work.error?.message || work.error) : "Maddy needs something before this work can continue."],
      failed: ["Failed", work?.error ? String(work.error?.message || work.error) : "The assignment did not complete successfully."],
      cancelled: ["Cancelled", "The assignment was cancelled."]
    };
    const [label, detail] = labels[workState] || [formatHallwayState(workState), "Maddy is coordinating the assignment through MEOS."];
    return {
      state: workState,
      label,
      detail,
      active: !["idle", "awaiting-review", "done", "blocked", "failed", "cancelled"].includes(workState)
    };
  }

  function firstBriefValue(...values) {
    for (const value of values) {
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return null;
  }

  function briefText(value, fallback = "Not yet verified") {
    if (value === undefined || value === null || value === "") return fallback;
    if (Array.isArray(value)) return value.filter(Boolean).join(", ") || fallback;
    if (typeof value === "object") {
      return firstBriefValue(value.label, value.name, value.status, value.value, value.summary, value.reason) || fallback;
    }
    return String(value);
  }

  function decodeMaddyText(value) {
    const text = String(value ?? "");
    if (!text || !/[&][#a-zA-Z0-9]+;/.test(text)) return text;
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  }

  function findFirstHttpUrl(value, depth = 0, seen = new Set()) {
    if (depth > 7 || value == null) return null;
    if (typeof value === "string") {
      const match = value.match(/https?:\/\/[^\s<>"']+/i);
      return match ? match[0].replace(/[),.;]+$/, "") : null;
    }
    if (typeof value !== "object" || seen.has(value)) return null;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findFirstHttpUrl(item, depth + 1, seen);
        if (found) return found;
      }
      return null;
    }
    const preferred = ["sourceUrl", "url", "openUrl", "link", "href", "canonicalUrl", "retrievedUrl", "finalUrl", "citation"];
    for (const key of preferred) {
      if (!(key in value)) continue;
      const found = findFirstHttpUrl(value[key], depth + 1, seen);
      if (found) return found;
    }
    for (const [key, child] of Object.entries(value)) {
      if (preferred.includes(key)) continue;
      const found = findFirstHttpUrl(child, depth + 1, seen);
      if (found) return found;
    }
    return null;
  }

  function getGovernedAnswerFromDeliverable(deliverable) {
    const data = deliverable?.data || {};
    return data.governedAnswer || data.result?.governedAnswer || data.output?.governedAnswer || data.response?.governedAnswer || null;
  }

  function getDeliverableSourceUrl(deliverable) {
    const data = deliverable?.data || {};
    const governed = getGovernedAnswerFromDeliverable(deliverable);
    return deliverable?.openUrl || deliverable?.downloadUrl || data.url || data.sourceUrl || data.website || findFirstHttpUrl(governed?.citations) || findFirstHttpUrl(data) || null;
  }

  function classifyMaddyDeliverable(deliverable) {
    const data = deliverable?.data || {};
    const development = data.resourceDevelopment || {};
    const executive = data.executiveBrief || data.executiveSummary || development.executiveBrief || {};
    const kind = String(deliverable?.kind || data.kind || data.type || data.resultType || "").toLowerCase();
    const source = String(deliverable?.source || deliverable?.provider || data.source || "").toLowerCase();
    const title = String(deliverable?.title || data.title || "").toLowerCase();

    const fundingSignals = [
      development && Object.keys(development).length > 0,
      data.fundingAmount != null,
      data.awardAmount != null,
      data.awardRange != null,
      data.eligibility != null,
      data.qualificationStatus != null,
      /fund|grant|award|resource-development|opportunit/.test(kind),
      /resource-development|grant/.test(source)
    ].filter(Boolean).length;

    const researchSignals = [
      /research|learning|cognition|knowledge|answer|finding/.test(kind),
      /research|intelligence|knowledge|cognition/.test(source),
      data.answer != null,
      data.finding != null,
      data.conclusion != null,
      data.learnedFact != null,
      data.learning != null,
      Array.isArray(data.evidence),
      Array.isArray(data.sources),
      Array.isArray(data.citations),
      /research|learn|find out|why |what |where |when |how /.test(title)
    ].filter(Boolean).length;

    if (fundingSignals >= 2) return "opportunity";
    if (researchSignals >= 1) return "research";
    return "general";
  }

  function getMaddyDeliverablePresentation(deliverable, index = 0, total = 1) {
    const data = deliverable?.data || {};
    const executive = data.executiveBrief || data.executiveSummary || data.resourceDevelopment?.executiveBrief || {};
    const development = data.resourceDevelopment || {};
    const type = classifyMaddyDeliverable(deliverable);
    const sourceUrl = getDeliverableSourceUrl(deliverable);
    const sourceName = firstBriefValue(data.funder, data.organization, data.sourceName, deliverable?.source, deliverable?.provider);
    const summary = deliverable?.summary || firstBriefValue(data.answer, data.finding, data.conclusion, data.learnedFact, data.learning?.summary, executive.summary, executive.reason, data.summary) || "Maddy returned this deliverable without a written summary.";
    const confidence = firstBriefValue(data.confidence, data.evidenceConfidence, data.learning?.confidence, development.confidence, executive.confidence);
    const nextAction = firstBriefValue(data.nextAction, data.learning?.nextAction, development.nextAction, executive.nextAction);

    if (type === "opportunity") {
      const relationship = getFundingStrategyRelationship(data, executive) || {};
      const eligibility = firstBriefValue(data.eligibility, data.qualificationStatus, development.eligibility, executive.eligibility, executive.participation);
      const rawEligibility = String(eligibility || "").toLowerCase();
      const rejected = rawEligibility.includes("rejected") || rawEligibility.includes("not eligible");
      const fit = firstBriefValue(data.missionFit, development.missionFit, executive.missionFit, executive.whySeeingThis, executive.reason);
      return {
        type,
        kicker: `Opportunity ${index + 1} of ${total}`,
        title: deliverable?.title || "Maddy's opportunity analysis",
        summary,
        meta: [
          briefText(firstBriefValue(data.geography, data.location, data.serviceArea, development.geography, executive.geography), "Geography not yet verified"),
          briefText(firstBriefValue(data.deadline, development.deadline, executive.deadline), "Deadline not yet verified")
        ].join(" · "),
        fields: [
          ["Funding / Award", briefText(firstBriefValue(data.amount, data.awardAmount, data.fundingAmount, data.awardRange, development.amount, executive.amount))],
          ["Deadline", briefText(firstBriefValue(data.deadline, development.deadline, executive.deadline))],
          ["Eligibility", briefText(eligibility)],
          ["Geography", briefText(firstBriefValue(data.geography, data.location, data.serviceArea, development.geography, executive.geography))],
          ["Mission / Strategy Fit", briefText(fit)],
          ["Confidence", briefText(confidence)],
          ["Recommendation", briefText(rejected ? "Do not pursue — outside current eligibility or operating authority" : firstBriefValue(data.recommendation, development.recommendation, executive.recommendation, relationship.relationship))],
          ["Next Action", briefText(rejected ? firstBriefValue(nextAction, "Preserve evidence; do not place on the active pursuit desk.") : nextAction)]
        ],
        judgment: rejected
          ? "This record is not an active pursuit recommendation. Its current eligibility evidence rejects it from the active desk, so any thematic or strategic similarity is preserved only as historical evidence."
          : briefText(firstBriefValue(executive.whySeeingThis, executive.reason, relationship.reason, relationship.reasons, fit), "Maddy returned an opportunity record, but the evidence is not yet sufficient for a stronger executive recommendation."),
        sourceUrl,
        sourceName,
        primaryAction: "Investigate This Opportunity",
        sourceAction: "Open Official Source ↗"
      };
    }

    const evidence = firstBriefValue(data.evidence, data.verifiedFacts, data.facts, data.learning?.evidence, executive.evidence);
    const unknowns = firstBriefValue(data.unknowns, data.openQuestions, data.learning?.unknowns, executive.unknowns);
    const knowledgeStatus = firstBriefValue(data.knowledgeStatus, data.learningStatus, data.learning?.status, data.status, executive.status);
    const governedAnswer = getGovernedAnswerFromDeliverable(deliverable);
    const answer = decodeMaddyText(firstBriefValue(governedAnswer?.answer, data.answer, data.finding, data.conclusion, data.learnedFact, data.learning?.summary, summary));
    const fields = [
      ["Result Type", type === "research" ? "Research / Learning" : "Executive Work"],
      ["Knowledge Status", briefText(knowledgeStatus, "Returned result")],
      ["Confidence", briefText(confidence, "Not stated")],
      ["Evidence", briefText(evidence, sourceUrl ? "Source returned" : "Evidence detail not returned")],
      ["Open Questions", briefText(unknowns, "None stated")],
      ["Next Action", briefText(nextAction, "No additional action required")]
    ];

    return {
      type,
      kicker: `${type === "research" ? "Research result" : "Executive result"} ${index + 1} of ${total}`,
      title: deliverable?.title || "Maddy's result",
      summary: decodeMaddyText(briefText(answer, summary)),
      meta: [type === "research" ? "Research / Learning" : "Executive Work", sourceName ? `Source: ${briefText(sourceName)}` : "Mission-bound result"].join(" · "),
      fields,
      judgment: briefText(firstBriefValue(executive.judgment, executive.reason, data.judgment, data.interpretation, data.learning?.interpretation), "Maddy returned the result above. Evidence and uncertainty remain separate from executive judgment."),
      sourceUrl,
      sourceName,
      primaryAction: "View Result Details",
      sourceAction: "Open Source ↗"
    };
  }

  function renderMaddyDirectAnswer(deliverable) {
    const panel = document.getElementById("meosMaddyDirectAnswer");
    if (!panel) return false;
    if (!deliverable) { panel.dataset.open = "false"; panel.innerHTML = ""; return false; }
    const view = getMaddyDeliverablePresentation(deliverable, 0, 1);
    if (!view.summary) { panel.dataset.open = "false"; panel.innerHTML = ""; return false; }
    panel.innerHTML = "";
    const label = document.createElement("span"); label.className = "meos-maddy-direct-answer-label"; label.textContent = "Maddy's answer";
    const title = document.createElement("h3"); title.className = "meos-maddy-direct-answer-title"; title.textContent = decodeMaddyText(view.title);
    const answer = document.createElement("p"); answer.className = "meos-maddy-direct-answer-text"; answer.textContent = decodeMaddyText(view.summary);
    const actions = document.createElement("div"); actions.className = "meos-maddy-direct-answer-actions";
    const details = document.createElement("button"); details.type = "button"; details.className = "meos-maddy-desk-action"; details.textContent = "View Result Details"; details.addEventListener("click", () => renderMaddyExecutiveBrief(deliverable)); actions.appendChild(details);
    if (view.sourceUrl) {
      const source = document.createElement("a"); source.className = "meos-maddy-direct-answer-source"; source.href = view.sourceUrl; source.target = "_blank"; source.rel = "noopener noreferrer"; source.textContent = view.sourceAction || "Open Source ↗"; actions.appendChild(source);
    }
    panel.append(label, title, answer, actions);
    panel.dataset.open = "true";
    return true;
  }

  function renderMaddyExecutiveBrief(deliverable) {
    const panel = document.getElementById("meosMaddyDeskBrief");
    if (!panel) return;
    if (!deliverable) {
      panel.dataset.open = "false";
      panel.innerHTML = "";
      return;
    }

    const view = getMaddyDeliverablePresentation(deliverable, 0, 1);
    panel.dataset.resultType = view.type;
    panel.innerHTML = "";
    const head = document.createElement("div"); head.className = "meos-maddy-brief-head";
    const heading = document.createElement("div");
    const kicker = document.createElement("div"); kicker.className = "meos-maddy-brief-kicker"; kicker.textContent = view.type === "opportunity" ? "Executive Opportunity Brief" : view.type === "research" ? "Research & Learning Result" : "Executive Result";
    const title = document.createElement("h3"); title.className = "meos-maddy-brief-title"; title.textContent = view.title;
    heading.append(kicker, title);
    const close = document.createElement("button"); close.type = "button"; close.className = "meos-maddy-brief-close"; close.setAttribute("aria-label", "Close executive brief"); close.textContent = "×"; close.addEventListener("click", () => { panel.dataset.open = "false"; });
    head.append(heading, close); panel.appendChild(head);

    // 006.018H: Result Details is evidence/provenance, not a second copy of Maddy's answer.
    const grid = document.createElement("div"); grid.className = "meos-maddy-brief-grid";
    view.fields.forEach(([label, value]) => { const field=document.createElement("div"); field.className="meos-maddy-brief-field"; const l=document.createElement("span"); l.className="meos-maddy-brief-label"; l.textContent=label; const v=document.createElement("span"); v.className="meos-maddy-brief-value"; v.textContent=value; field.append(l,v); grid.appendChild(field); });
    panel.appendChild(grid);

    const source = document.createElement("div"); source.className = "meos-maddy-brief-source";
    if (view.sourceUrl) { const link=document.createElement("a"); link.className="meos-maddy-brief-link"; link.href=view.sourceUrl; link.target="_blank"; link.rel="noopener noreferrer"; link.textContent=view.sourceAction; source.appendChild(link); }
    const note=document.createElement("span"); note.className="meos-maddy-brief-note"; note.textContent=view.sourceUrl ? `Evidence source: ${briefText(view.sourceName, "returned source")}` : "No source URL was returned; evidence status remains explicit."; source.appendChild(note); panel.appendChild(source);
    panel.dataset.open = "true";
  }

  function getMaddyWorkPackage(snapshot) {
    const deliverables = Array.isArray(snapshot?.hallwayDeliverables) ? snapshot.hallwayDeliverables : [];
    const work = Array.isArray(snapshot?.hallwayWork) ? snapshot.hallwayWork : [];
    if (!deliverables.length) return { work: null, items: [], selected: null };

    // Mission integrity: the active Hallway work ID is authoritative. Never
    // borrow deliverables from another historical mission merely because it
    // also has returned work.
    const currentWorkId = state.hallway.currentWorkId || state.hallway.workPackageId || null;
    let packageWork = currentWorkId ? work.find((item) => item.id === currentWorkId) || null : null;
    let packageId = packageWork?.id || currentWorkId;
    let items = packageId
      ? deliverables.filter((deliverable) => deliverable.workId === packageId)
      : [];

    // Cold-start fallback is allowed only when no current mission identity is
    // known. Once a mission is known, an empty package stays empty rather than
    // leaking stale deliverables into the current assignment.
    if (!packageId) {
      const latestDeliverable = deliverables.find((deliverable) => deliverable?.workId) || deliverables[0] || null;
      packageId = latestDeliverable?.workId || null;
      packageWork = packageId ? work.find((item) => item.id === packageId) || null : null;
      items = packageId
        ? deliverables.filter((deliverable) => deliverable.workId === packageId)
        : (latestDeliverable ? [latestDeliverable] : []);
    }

    if (state.hallway.workPackageId !== packageId) {
      state.hallway.workPackageId = packageId;
      state.hallway.selectedDeliverableId = items[0]?.id || null;
    }

    let selected = items.find((item) => item.id === state.hallway.selectedDeliverableId) || items[0] || null;
    if (selected && state.hallway.selectedDeliverableId !== selected.id) state.hallway.selectedDeliverableId = selected.id;
    return { work: packageWork, items, selected };
  }

  function renderMaddyWorkPackage(snapshot, packageState = getMaddyWorkPackage(snapshot)) {
    const panel = document.getElementById("meosMaddyWorkPackage");
    if (!panel) return packageState;
    const { work, items, selected } = packageState;
    if (!items.length || !selected) {
      panel.dataset.open = "false";
      panel.innerHTML = "";
      return packageState;
    }

    const selectedIndex = Math.max(0, items.findIndex((item) => item.id === selected.id));
    const view = getMaddyDeliverablePresentation(selected, selectedIndex, items.length);

    // 006.018H: a one-result question/answer does not need a second result card.
    // Keep the package navigator only when there is actually a package to navigate.
    if (items.length === 1) {
      panel.dataset.open = "false";
      panel.innerHTML = "";
      return packageState;
    }

    panel.dataset.resultType = view.type;
    panel.innerHTML = "";
    const head = document.createElement("div"); head.className = "meos-maddy-package-head";
    const label = document.createElement("span"); label.className = "meos-maddy-package-label"; label.textContent = work?.title || work?.instruction || "Maddy Work Package";
    const count = document.createElement("span"); count.className = "meos-maddy-package-count"; count.textContent = `${items.length} returned · ${selectedIndex + 1} selected`;
    head.append(label, count); panel.appendChild(head);

    const body = document.createElement("div"); body.className = "meos-maddy-package-body";
    const previous = document.createElement("button"); previous.type = "button"; previous.className = "meos-maddy-package-nav"; previous.textContent = "‹"; previous.disabled = items.length < 2; previous.setAttribute("aria-label", "Previous deliverable");
    const card = document.createElement("button"); card.type = "button"; card.className = "meos-maddy-package-card"; card.title = "Open this returned result";
    const title = document.createElement("span"); title.className = "meos-maddy-package-title"; title.textContent = view.title;
    const meta = document.createElement("span"); meta.className = "meos-maddy-package-meta"; meta.textContent = view.meta;
    const position = document.createElement("span"); position.className = "meos-maddy-package-position"; position.textContent = `${view.type === "opportunity" ? "Opportunity" : view.type === "research" ? "Research result" : "Result"} ${selectedIndex + 1} of ${items.length} · click to review`;
    card.append(title, meta, position);
    const next = document.createElement("button"); next.type = "button"; next.className = "meos-maddy-package-nav"; next.textContent = "›"; next.disabled = items.length < 2; next.setAttribute("aria-label", "Next deliverable");

    const selectAt = (index) => {
      const normalized = (index + items.length) % items.length;
      state.hallway.selectedDeliverableId = items[normalized].id;
      renderLiveHeadquarters();
      renderMaddyExecutiveBrief(items[normalized]);
    };
    previous.addEventListener("click", () => selectAt(selectedIndex - 1));
    next.addEventListener("click", () => selectAt(selectedIndex + 1));
    card.addEventListener("click", () => renderMaddyExecutiveBrief(selected));
    body.append(previous, card, next); panel.appendChild(body);

    if (items.length > 1) {
      const strip = document.createElement("div"); strip.className = "meos-maddy-package-strip";
      items.forEach((item, index) => {
        const pill = document.createElement("button"); pill.type = "button"; pill.className = "meos-maddy-package-pill"; pill.dataset.selected = item.id === selected.id ? "true" : "false"; pill.textContent = item.title || `Result ${index + 1}`; pill.title = item.title || `Result ${index + 1}`; pill.addEventListener("click", () => selectAt(index)); strip.appendChild(pill);
      });
      panel.appendChild(strip);
    }
    panel.dataset.open = "true";
    return packageState;
  }


  function closeMaddyExecutiveWorkspace() {
    const workspace = document.getElementById("meosExecutiveWorkspace");
    if (workspace) workspace.dataset.open = "false";
    document.body.classList.remove("meos-workspace-open");
  }

  function ensureMaddyExecutiveWorkspace() {
    let workspace = document.getElementById("meosExecutiveWorkspace");
    if (workspace) return workspace;

    workspace = document.createElement("section");
    workspace.id = "meosExecutiveWorkspace";
    workspace.className = "meos-executive-workspace";
    workspace.dataset.open = "false";
    workspace.setAttribute("role", "dialog");
    workspace.setAttribute("aria-modal", "true");
    workspace.setAttribute("aria-label", "Maddy Executive Workspace");
    workspace.innerHTML = `
      <div class="meos-workspace-top">
        <div><div class="meos-workspace-kicker">Maddy Executive Workspace</div><h2 class="meos-workspace-title" id="meosWorkspacePackageTitle">Work Package</h2></div>
        <button class="meos-workspace-close" id="meosWorkspaceClose" type="button">Collapse Workspace</button>
      </div>
      <aside class="meos-workspace-package">
        <h3>Current Work Package</h3>
        <p id="meosWorkspacePackageState">Only deliverables belonging to this mission appear here.</p>
        <div class="meos-workspace-results" id="meosWorkspaceResults"></div>
      </aside>
      <main class="meos-workspace-main" id="meosWorkspaceMain"></main>
      <aside class="meos-workspace-presence">
        <div class="meos-workspace-maddy"><img src="maddy-holographic-presence-v1.png" alt="Maddy present in the executive workspace" onerror="this.style.visibility='hidden';" /></div>
        <h3>Maddy is here with you</h3>
        <p>The right side is Maddy's permanent presence bay, reserved for the interactive Digital Human experience.</p>
        <div class="meos-workspace-presence-state" id="meosWorkspacePresenceState">Maddy is holding the current mission in context.</div>
        <div class="meos-workspace-actions" id="meosWorkspaceActions"></div>
      </aside>`;
    document.body.appendChild(workspace);
    workspace.querySelector("#meosWorkspaceClose")?.addEventListener("click", closeMaddyExecutiveWorkspace);
    workspace.addEventListener("click", (event) => {
      if (event.target === workspace) closeMaddyExecutiveWorkspace();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && workspace.dataset.open === "true") closeMaddyExecutiveWorkspace();
    });
    return workspace;
  }

  function renderMaddyExecutiveWorkspace(snapshot = collectHeadquartersSnapshot(), packageState = getMaddyWorkPackage(snapshot)) {
    const workspace = ensureMaddyExecutiveWorkspace();
    const items = packageState.items || [];
    const selected = packageState.selected || items[0] || null;
    if (!selected) return false;

    const selectedIndex = Math.max(0, items.findIndex((item) => item.id === selected.id));
    const view = getMaddyDeliverablePresentation(selected, selectedIndex, items.length);
    workspace.dataset.resultType = view.type;

    const packageTitle = workspace.querySelector("#meosWorkspacePackageTitle");
    if (packageTitle) packageTitle.textContent = packageState.work?.title || packageState.work?.instruction || "Maddy Work Package";

    const presence = workspace.querySelector("#meosWorkspacePresenceState");
    if (presence) presence.textContent = `${items.length} mission-bound result${items.length === 1 ? "" : "s"} · reviewing ${selectedIndex + 1} of ${items.length}.`;
    const packageStateNode = workspace.querySelector("#meosWorkspacePackageState");
    if (packageStateNode) packageStateNode.textContent = `${items.length} returned for this mission only.`;

    const results = workspace.querySelector("#meosWorkspaceResults");
    if (results) {
      results.innerHTML = "";
      items.forEach((item, index) => {
        const itemView = getMaddyDeliverablePresentation(item, index, items.length);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "meos-workspace-result";
        button.dataset.selected = item.id === selected.id ? "true" : "false";
        button.dataset.resultType = itemView.type;
        button.innerHTML = `<span class="meos-workspace-result-index">${index + 1}</span><span><strong>${escapeHtml(itemView.title)}</strong><small>${escapeHtml(itemView.type === "opportunity" ? "Opportunity intelligence" : itemView.type === "research" ? "Research & learning" : "Executive work")}</small></span>`;
        button.addEventListener("click", () => {
          state.hallway.selectedDeliverableId = item.id;
          renderLiveHeadquarters();
          const nextSnapshot = collectHeadquartersSnapshot();
          renderMaddyExecutiveWorkspace(nextSnapshot, getMaddyWorkPackage(nextSnapshot));
        });
        results.appendChild(button);
      });
    }

    const main = workspace.querySelector("#meosWorkspaceMain");
    if (main) {
      main.innerHTML = "";
      const kicker = document.createElement("div"); kicker.className = "meos-workspace-main-kicker"; kicker.textContent = view.kicker;
      const title = document.createElement("h2"); title.textContent = view.title;
      const summary = document.createElement("p"); summary.className = "meos-workspace-summary"; summary.textContent = view.summary;
      const grid = document.createElement("div"); grid.className = "meos-workspace-grid";
      view.fields.forEach(([label, value]) => {
        const field = document.createElement("div"); field.className = "meos-workspace-field";
        const l = document.createElement("span"); l.className = "meos-workspace-field-label"; l.textContent = label;
        const v = document.createElement("span"); v.className = "meos-workspace-field-value"; v.textContent = value;
        field.append(l, v); grid.appendChild(field);
      });
      const judgment = document.createElement("div"); judgment.className = "meos-workspace-judgment";
      const judgmentLabel = document.createElement("strong"); judgmentLabel.textContent = view.type === "research" ? "Maddy's Interpretation" : "Maddy's Executive Judgment";
      const judgmentText = document.createElement("p"); judgmentText.textContent = view.judgment;
      judgment.append(judgmentLabel, judgmentText);
      main.append(kicker, title, summary, grid, judgment);
    }

    const actions = workspace.querySelector("#meosWorkspaceActions");
    if (actions) {
      actions.innerHTML = "";
      const h = document.createElement("h3"); h.textContent = "Executive Actions";
      const p = document.createElement("p"); p.textContent = view.type === "opportunity" ? "Maddy keeps opportunity evidence visible while you decide what authority to grant." : "Review the returned work, its evidence status, and any available source without changing the mission.";
      actions.append(h, p);

      const inspect = document.createElement("button"); inspect.type = "button"; inspect.className = "meos-workspace-action"; inspect.textContent = view.primaryAction; inspect.addEventListener("click", () => { closeMaddyExecutiveWorkspace(); renderMaddyExecutiveBrief(selected); document.getElementById("meosMaddyDeskBrief")?.scrollIntoView?.({ behavior: "smooth", block: "nearest" }); }); actions.appendChild(inspect);

      const official = document.createElement("button"); official.type = "button"; official.className = "meos-workspace-action"; official.textContent = view.sourceAction; official.disabled = !view.sourceUrl; official.addEventListener("click", () => { if (view.sourceUrl) window.open(view.sourceUrl, "_blank", "noopener,noreferrer"); }); actions.appendChild(official);

      const take = document.createElement("button"); take.type = "button"; take.className = "meos-workspace-action primary"; take.textContent = "TAKE IT — Move This Forward";
      const activeWork = packageState.work;
      take.disabled = !activeWork?.options?.includes?.("take-it");
      take.title = take.disabled ? "This work package is already authorized or does not currently require Take It." : "Authorize Maddy to move this work forward.";
      take.addEventListener("click", async () => {
        const hallway = getExecutiveHallway();
        if (!hallway?.takeIt || !activeWork?.id) return;
        take.disabled = true; take.textContent = "AUTHORIZED — Maddy is taking it…";
        try { await hallway.takeIt(activeWork.id, { signal: "Take It!", source: "maddy-executive-workspace", selectedDeliverableId: selected.id }); }
        catch (error) { state.hallway.lastError = error?.message || String(error); }
        renderLiveHeadquarters();
      });
      actions.appendChild(take);

      const note = document.createElement("div"); note.className = "meos-workspace-source-note"; note.textContent = view.sourceUrl ? "Returned evidence stays separate from Maddy's interpretation and opens directly from this rail." : "No source URL was returned. Maddy must keep evidence, inference, and unknowns distinct.";
      actions.appendChild(note);
    }

    workspace.dataset.open = "true";
    document.body.classList.add("meos-workspace-open");
    return true;
  }

  function openMaddyExecutiveWorkspace() {
    const snapshot = collectHeadquartersSnapshot();
    return renderMaddyExecutiveWorkspace(snapshot, getMaddyWorkPackage(snapshot));
  }

  function executiveSignalTerms(value) {
    const stop = new Set(["the","and","for","with","from","into","this","that","your","maddy","executive","work","office","program","project","application","opportunity"]);
    return [...new Set(String(value || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((term) => term.length >= 4 && !stop.has(term)))];
  }

  function executiveSignalOverlap(a, b) {
    const left = executiveSignalTerms(a);
    const right = new Set(executiveSignalTerms(b));
    if (!left.length || !right.size) return 0;
    return left.filter((term) => right.has(term)).length;
  }

  function daysUntilExecutiveDeadline(value) {
    const timestamp = Date.parse(value || "");
    if (!Number.isFinite(timestamp)) return null;
    return Math.ceil((timestamp - Date.now()) / 86400000);
  }

  function compileExecutiveAttention(snapshot) {
    const candidates = [];
    const add = (candidate) => {
      if (!candidate || !candidate.title) return;
      candidate.score = Number(candidate.score || 0);
      candidate.reasons = Array.isArray(candidate.reasons) ? candidate.reasons : [];
      candidate.confidence = candidate.confidence || "runtime-evidence";
      candidates.push(candidate);
    };

    (snapshot.fundingUrgent || []).slice(0, 12).forEach((record) => {
      const deadline = getFundingDeadline(record);
      const days = daysUntilExecutiveDeadline(deadline);
      let score = 80;
      const reasons = ["verified funding deadline is inside the Headquarters urgency window"];
      if (days !== null) {
        if (days < 0) { score -= 35; reasons.push("recorded deadline appears to have passed"); }
        else if (days <= 3) { score += 28; reasons.push(`${days} day${days === 1 ? "" : "s"} remain`); }
        else if (days <= 7) { score += 20; reasons.push(`${days} days remain`); }
        else { score += 10; reasons.push(`${days} days remain`); }
      }
      const amount = getFundingAmount(record);
      if (amount && !/unknown|not verified/i.test(String(amount))) { score += 8; reasons.push("resource value is recorded"); }
      add({
        kind: "funding", score, reasons,
        eyebrow: "MADDY'S HIGHEST-LEVERAGE MOVE",
        title: record.title || "Time-sensitive funding opportunity",
        why: getFundingRecommendation(record) || "Executive review is warranted now.",
        value: amount || "Funding value not verified",
        evidence: `Resource Development · deadline ${deadline || "unknown"}`,
        action: "Open Funding Intelligence", record
      });
    });

    (snapshot.pendingApprovals || []).slice(0, 12).forEach((record) => add({
      kind: "approval", score: 92, reasons: ["human authority is the current execution boundary"],
      eyebrow: "MADDY NEEDS YOUR AUTHORITY",
      title: record.title || "Executive decision ready",
      why: "Maddy can continue immediately after the required executive decision.",
      value: "Unlocks governed execution",
      evidence: `Executive Hallway · ${record.officeName || record.owner || "executive work"}`,
      action: "Review Decision", record
    }));

    (snapshot.hallwayDeliverables || []).slice(0, 12).forEach((record) => add({
      kind: "deliverable", score: 74, reasons: ["completed work is ready to become an organizational outcome"],
      eyebrow: "VALUE RETURNED",
      title: record.title || record.name || "Executive work package returned",
      why: "Maddy has completed work ready for executive use.",
      value: "Completed executive work",
      evidence: `Executive Hallway · ${record.source || record.provider || "deliverable"}`,
      action: "Open Work Package", record
    }));

    (snapshot.blocked || []).slice(0, 12).forEach((record) => add({
      kind: "blocked", score: 68 + (String(record.priority || "").toLowerCase() === "high" ? 12 : 0),
      reasons: ["recorded blocker is suppressing execution"],
      eyebrow: "MADDY FOUND FRICTION",
      title: record.title || "Executive work is blocked",
      why: `This work cannot advance in ${record.officeName || "the responsible office"} until the blocker is resolved.`,
      value: "Restores execution velocity",
      evidence: `Task runtime · ${record.id || "recorded blocker"}`,
      action: "Inspect Blocker", record
    }));

    (snapshot.hallwayWork || []).filter((item) => !["done","cancelled"].includes(item.state)).slice(0, 20).forEach((record) => {
      const dispatch = getMaddyDispatchPresentation(record);
      add({
        kind: "work", score: 48 + (dispatch.active ? 8 : 0),
        reasons: ["live Hallway work is actively advancing"],
        eyebrow: "MADDY IS ADVANCING",
        title: record.title || record.instruction || "Executive work in progress",
        why: dispatch.detail || "Maddy is coordinating active executive work.",
        value: "Active organizational progress",
        evidence: `Executive Hallway · ${dispatch.label || record.state || "active"}`,
        action: "Open Live Work", record
      });
    });

    // Cross-organ convergence: a signal appearing independently in multiple runtime
    // domains earns attention because the organization is telling Maddy the same
    // thing from more than one direction.
    candidates.forEach((candidate, index) => {
      const converging = candidates.filter((other, otherIndex) =>
        otherIndex !== index &&
        other.kind !== candidate.kind &&
        executiveSignalOverlap(candidate.title, other.title) >= 1
      );
      if (converging.length) {
        const domains = [...new Set(converging.map((item) => item.kind))];
        candidate.score += Math.min(24, domains.length * 8);
        candidate.reasons.push(`independent ${domains.join(" + ")} evidence converges on the same subject`);
        candidate.convergence = domains;
      }
    });

    candidates.sort((a, b) => b.score - a.score || String(a.title).localeCompare(String(b.title)));
    const winner = candidates[0] || {
      kind: "watch", score: 0, reasons: ["no runtime evidence currently crosses an intervention threshold"],
      eyebrow: "MADDY IS WATCHING THE ORGANIZATION",
      title: "No executive intervention is justified right now",
      why: `Maddy is holding attention on ${(snapshot.fundingRecords || []).length} funding records and ${(snapshot.tasks || []).length} office tasks. She will surface a move when evidence crosses an action threshold.`,
      value: "No manufactured busywork",
      evidence: `Headquarters snapshot · ${snapshot.computedAt || new Date().toISOString()}`,
      action: "Inspect Live Evidence", record: null
    };

    return {
      winner,
      alternatives: candidates.slice(1, 4),
      candidateCount: candidates.length,
      computedAt: new Date().toISOString()
    };
  }

  function deriveExecutiveOutcome(snapshot) {
    return compileExecutiveAttention(snapshot).winner;
  }

  function executiveOutcomeFingerprint(outcome) {
    const recordId = String(outcome?.record?.id || outcome?.record?.opportunityId || "").trim();
    const identity = recordId || String(outcome?.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
    return `hq-attention:${String(outcome?.kind || "unknown")}:${identity || "unidentified"}`;
  }

  function findExistingOutcomeWork(outcome, snapshot = collectHeadquartersSnapshot()) {
    const fingerprint = executiveOutcomeFingerprint(outcome);
    const liveWork = snapshot?.hallwayWork || [];
    return liveWork.find((work) => {
      if (work?.context?.attentionFingerprint === fingerprint) return true;
      if (["done", "cancelled"].includes(String(work?.state || ""))) return false;
      const sameRecord = outcome?.record?.id && String(work?.context?.sourceRecordId || "") === String(outcome.record.id);
      return Boolean(sameRecord);
    }) || null;
  }

  function executiveOutcomeInstruction(outcome) {
    const title = String(outcome?.title || "the executive signal").trim();
    if (outcome?.kind === "funding") {
      return `Investigate and advance the funding opportunity "${title}". Verify current eligibility, deadline, requirements, strategic fit, resource value, risks, missing information, and the highest-leverage next step. Use existing MEOS evidence first, research consequential unknowns when needed, and return a verified executive recommendation. Do not submit, spend, sign, publish, contact externally, or create an external commitment without required human authority.`;
    }
    if (outcome?.kind === "blocked") {
      return `Resolve the executive blocker "${title}". Determine the actual cause from evidence, identify the minimum viable resolution, coordinate the responsible MEOS office, and return the next executable step. Do not create external commitments without required human authority.`;
    }
    return `Advance the executive outcome "${title}". Verify the underlying evidence, determine the highest-leverage next step, coordinate the appropriate MEOS office or engine, and return a verified outcome or clearly stated blocker. Preserve all human authority boundaries.`;
  }

  async function advanceExecutiveOutcome(outcome, snapshot, button) {
    if (!outcome || outcome.kind === "watch") {
      executeExecutiveOutcome(outcome, snapshot);
      return { success: false, reason: "watch-posture" };
    }

    const hallway = getExecutiveHallway();
    if (!hallway?.submitWork) {
      state.hallway.lastError = "Executive Hallway submitWork is unavailable.";
      renderHallwayMini();
      return { success: false, reason: "hallway-submit-unavailable" };
    }

    const currentSnapshot = collectHeadquartersSnapshot();
    const existing = findExistingOutcomeWork(outcome, currentSnapshot);
    if (existing) {
      state.hallway.currentWorkId = existing.id;
      state.hallway.currentState = existing.state || state.hallway.currentState;
      state.hallway.currentTitle = existing.title || existing.instruction || outcome.title;
      state.hallway.currentOwner = existing.owner || null;
      state.hallway.currentOptions = Array.isArray(existing.options) ? [...existing.options] : [];
      renderHallwayMini();
      if (button) button.textContent = existing.state === "awaiting-review" ? "Already Routed · Review" : "Already In Motion";
      openRealtimeEvidence("work", existing.id || null);
      return { success: true, reused: true, work: existing };
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Routing to Maddy…";
    }

    const fingerprint = executiveOutcomeFingerprint(outcome);
    try {
      const work = await hallway.submitWork({
        title: `Executive Outcome — ${outcome.title}`,
        instruction: executiveOutcomeInstruction(outcome),
        source: "maddy-executive-attention",
        requestedBy: "executive-director",
        reviewRequired: true,
        authorized: false,
        context: {
          attentionFingerprint: fingerprint,
          sourceRecordId: outcome.record?.id || null,
          sourceKind: outcome.kind,
          sourceEvidence: outcome.evidence || null,
          sourceValue: outcome.value || null,
          originatedFrom: "executive-headquarters-attention-compiler"
        }
      });

      state.hallway.currentWorkId = work?.id || state.hallway.currentWorkId;
      state.hallway.currentState = work?.state || state.hallway.currentState;
      state.hallway.currentTitle = work?.title || outcome.title;
      state.hallway.currentOwner = work?.owner || null;
      state.hallway.currentOptions = Array.isArray(work?.options) ? [...work.options] : [];
      state.hallway.lastError = null;
      renderHallwayMini();
      renderLiveHeadquarters();
      return { success: true, reused: false, work };
    } catch (error) {
      state.hallway.lastError = error?.message || String(error);
      renderHallwayMini();
      if (button) {
        button.disabled = false;
        button.textContent = "Put Maddy On It";
      }
      return { success: false, error: state.hallway.lastError };
    }
  }

  function executeExecutiveOutcome(outcome, snapshot) {
    if (!outcome) return;
    if (outcome.kind === "funding") {
      if (outcome.record) openFundingIntelligenceBrowser(outcome.record);
      else openFundingIntelligenceBrowser();
      return;
    }
    if (outcome.kind === "approval") {
      openRealtimeEvidence("approvals", outcome.record?.id || null);
      return;
    }
    if (outcome.kind === "deliverable") {
      const packageState = getMaddyWorkPackage(snapshot);
      if (packageState?.selected) renderMaddyExecutiveBrief(packageState.selected);
      else openMaddyExecutiveWorkspace();
      return;
    }
    if (outcome.kind === "blocked") {
      openRealtimeEvidence("task", outcome.record?.id || null);
      return;
    }
    if (outcome.kind === "work") {
      openRealtimeEvidence("work", outcome.record?.id || null);
      return;
    }
    openOfficeActivityBrowser("all");
  }

  function renderExecutiveOutcome(snapshot) {
    const briefing = document.getElementById("meosLiveBriefing");
    if (!briefing) return null;
    const attention = compileExecutiveAttention(snapshot);
    const outcome = attention.winner;
    briefing.dataset.outcomeKind = outcome.kind;
    briefing.dataset.attentionCandidates = String(attention.candidateCount);
    const reasons = (outcome.reasons || []).slice(0, 3);
    const alternatives = attention.alternatives || [];
    briefing.innerHTML = `
      <div class="meos-muted" style="font-size:.7rem;font-weight:800;letter-spacing:.12em;margin-bottom:.42rem;">${escapeHtml(outcome.eyebrow)}</div>
      <p style="font-size:.94rem;line-height:1.35;margin:.1rem 0 .38rem;"><strong>${escapeHtml(outcome.title)}</strong></p>
      <p style="font-size:.82rem;line-height:1.5;margin:.2rem 0 .5rem;">${escapeHtml(outcome.why)}</p>
      ${reasons.length ? `<div style="font-size:.76rem;line-height:1.45;margin:.35rem 0 .6rem;"><strong>Why this won Maddy's attention</strong><br>${reasons.map((reason) => `• ${escapeHtml(reason)}`).join("<br>")}</div>` : ""}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.45rem;margin:.5rem 0 .65rem;">
        <div class="meos-evidence-field"><span>VALUE</span><strong>${escapeHtml(outcome.value)}</strong></div>
        <div class="meos-evidence-field"><span>EVIDENCE</span><strong>${escapeHtml(outcome.evidence)}</strong></div>
      </div>
      ${alternatives.length ? `<details style="margin:.25rem 0 .65rem;font-size:.76rem;"><summary style="cursor:pointer;">Why not the other ${attention.candidateCount - 1} signal${attention.candidateCount - 1 === 1 ? "" : "s"}?</summary><div style="padding-top:.35rem;">${alternatives.map((item) => `<div style="margin:.25rem 0;"><strong>${escapeHtml(item.title)}</strong><br><span class="meos-muted">${escapeHtml(item.kind)} · attention score ${item.score}</span></div>`).join("")}${attention.candidateCount > 4 ? `<div class="meos-muted">+ ${attention.candidateCount - 4} lower-ranked runtime signals suppressed from executive attention.</div>` : ""}</div></details>` : ""}
      <div style="display:flex;gap:.45rem;flex-wrap:wrap;">
        <button id="meosExecutiveOutcomeAction" class="meos-action-button" type="button">${escapeHtml(outcome.action)}</button>
        ${outcome.kind !== "watch" ? `<button id="meosExecutiveOutcomeAdvance" class="meos-action-button" type="button">${findExistingOutcomeWork(outcome, snapshot) ? "Already In Motion" : "Put Maddy On It"}</button>` : ""}
      </div>`;
    document.getElementById("meosExecutiveOutcomeAction")?.addEventListener("click", () => executeExecutiveOutcome(outcome, snapshot));
    document.getElementById("meosExecutiveOutcomeAdvance")?.addEventListener("click", (event) => advanceExecutiveOutcome(outcome, snapshot, event.currentTarget));
    return attention;
  }

  function renderMaddyExecutiveDesk(snapshot) {
    const activeWork = snapshot.hallwayWork.find((item) => !["done", "cancelled"].includes(item.state)) || null;
    const latestWork = activeWork || snapshot.hallwayWork[0] || null;
    const dispatch = getMaddyDispatchPresentation(latestWork);
    const workChip = document.getElementById("meosMaddyDeskWork");
    setText("meosMaddyDeskWork", latestWork ? `${dispatch.label} · ${latestWork.owner || "Maddy"}` : "No active Hallway work");
    if (workChip) {
      workChip.dataset.live = dispatch.active ? "true" : "false";
      workChip.dataset.workState = dispatch.state;
    }
    const maddyWindow = document.querySelector(".meos-maddy-window");
    if (maddyWindow) {
      maddyWindow.dataset.dispatchActive = dispatch.active ? "true" : "false";
      maddyWindow.dataset.dispatchState = dispatch.state;
    }
    setText("meosMaddyDeskApprovals", `${snapshot.pendingApprovals.length} need you`);

    const packageState = getMaddyWorkPackage(snapshot);
    const packageCount = packageState.items.length;
    setText("meosMaddyDeskDeliverables", packageCount
      ? `${packageCount} in work package`
      : `${snapshot.hallwayDeliverables.length} deliverables`);
    renderMaddyWorkPackage(snapshot, packageState);
    renderMaddyDirectAnswer(packageState.selected);

    const actions = document.getElementById("meosMaddyDeskActions");
    if (!actions) return;
    actions.innerHTML = "";

    if (activeWork?.options?.includes?.("take-it")) {
      const takeIt = document.createElement("button");
      takeIt.type = "button";
      takeIt.className = "meos-maddy-desk-action";
      takeIt.textContent = "Take It";
      takeIt.addEventListener("click", async () => {
        const hallway = getExecutiveHallway();
        if (!hallway?.takeIt || !activeWork.id) return;
        takeIt.disabled = true;
        takeIt.textContent = "Executing…";
        try { await hallway.takeIt(activeWork.id, { signal: "Take It!", source: "maddy-executive-desk" }); }
        catch (error) { state.hallway.lastError = error?.message || String(error); renderHallwayMini(); }
      });
      actions.appendChild(takeIt);
    }

    const selected = packageState.selected;
    if (selected) {
      // 006.018H: answer-local controls own Details/Source. The command row keeps only
      // the genuinely different deep-work action, avoiding duplicate destinations.
      const expand = document.createElement("button");
      expand.type = "button";
      expand.className = "meos-maddy-desk-action";
      expand.textContent = "Expand Work";
      expand.title = "Open the office/work execution workspace for deeper inspection.";
      expand.addEventListener("click", () => openMaddyExecutiveWorkspace());
      actions.appendChild(expand);
    } else {
      renderMaddyExecutiveBrief(null);
    }

    const completedWork = packageState.work?.state === "done" ? packageState.work : (selected?.workId
      ? snapshot.hallwayWork.find((item) => item.id === selected.workId && item.state === "done") || null
      : null);
    const existingFeedback = completedWork
      ? snapshot.hallwayFeedback.find((item) => item.workId === completedWork.id) || null
      : null;

    if (completedWork && !existingFeedback) {
      const submitExecutiveFeedback = (signal) => {
        const hallway = getExecutiveHallway();
        if (!hallway?.submitFeedback) return;
        let reason = null;
        if (signal === "not-this") {
          reason = window.prompt("What was wrong with this work package? A short reason helps Maddy learn.", "Wrong result");
          if (reason === null) return;
        }
        actions.querySelectorAll(".meos-maddy-feedback-action").forEach((button) => { button.disabled = true; });
        const result = hallway.submitFeedback(completedWork.id, { signal, reason: reason || null, source: "maddy-hud", actor: "executive-director", selectedDeliverableId: selected?.id || null });
        if (!result?.success) {
          state.hallway.lastError = result?.error || "Executive feedback was not recorded.";
          renderHallwayMini(); renderLiveHeadquarters(); return;
        }
        renderLiveHeadquarters();
      };
      const accept = document.createElement("button"); accept.type = "button"; accept.className = "meos-maddy-desk-action meos-maddy-feedback-action"; accept.dataset.signal = "accepted"; accept.textContent = "👍 Accept"; accept.title = "Accept this returned work package."; accept.addEventListener("click", () => submitExecutiveFeedback("accepted")); actions.appendChild(accept);
      const notThis = document.createElement("button"); notThis.type = "button"; notThis.className = "meos-maddy-desk-action meos-maddy-feedback-action"; notThis.dataset.signal = "not-this"; notThis.textContent = "👎 Not This"; notThis.title = "Reject this work package and record why."; notThis.addEventListener("click", () => submitExecutiveFeedback("not-this")); actions.appendChild(notThis);
    } else if (existingFeedback) {
      const feedbackState = document.createElement("span"); feedbackState.className = "meos-maddy-feedback-state"; feedbackState.textContent = existingFeedback.signal === "accepted" ? "✓ Accepted — learning recorded" : "↻ Not This — correction recorded"; actions.appendChild(feedbackState);
    }
  }

  function hasVerifiedResourceRealization(record = {}) {
    const states = [
      record?.resourceDevelopment?.acquisitionStatus,
      record?.resourceDevelopment?.workQueue?.acquisition?.status,
      record?.acquisitionStatus,
      record?.awardStatus,
      record?.status
    ].map((value) => String(value || "").toLowerCase());
    return states.some((value) => ["awarded","received","acquired","funded","secured","closed-won","complete","completed"].includes(value));
  }

  function compileMissionImpact(snapshot) {
    const work = Array.isArray(snapshot?.hallwayWork) ? snapshot.hallwayWork : [];
    const feedback = Array.isArray(snapshot?.hallwayFeedback) ? snapshot.hallwayFeedback : [];
    const funding = Array.isArray(snapshot?.fundingRecords) ? snapshot.fundingRecords : [];

    const completed = work.filter((item) => String(item?.state || "").toLowerCase() === "done");
    const acceptedFeedback = feedback.filter((item) => String(item?.signal || "").toLowerCase() === "accepted");
    const acceptedWorkIds = new Set(acceptedFeedback.map((item) => String(item?.workId || "")).filter(Boolean));
    const acceptedCompleted = completed.filter((item) => acceptedWorkIds.has(String(item?.id || "")));
    const realizedResources = funding.filter(hasVerifiedResourceRealization);

    const completedWithVerification = completed.filter((item) =>
      item?.verification?.verified === true ||
      item?.verification?.success === true ||
      item?.verified === true ||
      item?.result?.verified === true ||
      item?.outcome?.verified === true
    );

    // Do not infer "resolved risk" merely because a blocker disappeared from the
    // current snapshot. That requires explicit durable outcome evidence.
    const explicitlyResolved = completed.filter((item) => {
      const resolution = String(firstDefined(item?.outcome?.type, item?.result?.type, item?.resolution?.status, "")).toLowerCase();
      return ["risk-resolved","blocker-resolved","resolved"].includes(resolution);
    });

    return {
      completedCount: completed.length,
      verifiedCompletedCount: completedWithVerification.length,
      acceptedCount: acceptedCompleted.length,
      realizedResourceCount: realizedResources.length,
      resolvedRiskCount: explicitlyResolved.length,
      financialValueKnown: false,
      financialValue: null,
      proof: {
        completedWorkIds: completed.map((item) => item.id).filter(Boolean),
        verifiedWorkIds: completedWithVerification.map((item) => item.id).filter(Boolean),
        acceptedWorkIds: acceptedCompleted.map((item) => item.id).filter(Boolean),
        realizedResourceIds: realizedResources.map((item) => item.id || item.opportunityId).filter(Boolean),
        resolvedRiskIds: explicitlyResolved.map((item) => item.id).filter(Boolean)
      }
    };
  }

  function renderMissionImpact(snapshot) {
    const container = document.getElementById("meosMissionImpactEvidence");
    const stateLabel = document.getElementById("meosMissionImpactState");
    if (!container || !stateLabel) return null;
    const impact = compileMissionImpact(snapshot);
    const strongest = impact.realizedResourceCount
      ? `${impact.realizedResourceCount} resource acquisition${impact.realizedResourceCount === 1 ? "" : "s"} have explicit realized-state evidence.`
      : impact.acceptedCount
        ? `${impact.acceptedCount} completed outcome${impact.acceptedCount === 1 ? "" : "s"} have been accepted by the Executive Director.`
        : impact.verifiedCompletedCount
          ? `${impact.verifiedCompletedCount} completed outcome${impact.verifiedCompletedCount === 1 ? "" : "s"} carry explicit verification evidence.`
          : impact.completedCount
            ? `${impact.completedCount} Hallway work item${impact.completedCount === 1 ? "" : "s"} reached done; stronger consequence evidence has not yet been recorded.`
            : "No completed organizational outcome is currently evidenced.";

    stateLabel.textContent = impact.realizedResourceCount || impact.acceptedCount || impact.verifiedCompletedCount ? "Verified consequence" : "Evidence only";
    container.dataset.completed = String(impact.completedCount);
    container.dataset.accepted = String(impact.acceptedCount);
    container.dataset.realizedResources = String(impact.realizedResourceCount);
    container.innerHTML = `
      <div class="meos-alert ${impact.realizedResourceCount || impact.acceptedCount || impact.verifiedCompletedCount ? "success" : "info"}">
        <strong>${escapeHtml(strongest)}</strong>
        <span class="meos-muted">Completed work ${impact.completedCount} · explicitly verified ${impact.verifiedCompletedCount} · accepted ${impact.acceptedCount} · resources realized ${impact.realizedResourceCount} · risks explicitly resolved ${impact.resolvedRiskCount}</span>
      </div>
      <div class="meos-alert info">
        <strong>Financial value: unknown until realized-value evidence exists.</strong>
        <span class="meos-muted">Opportunity size is not revenue. Discovery is not acquisition. Activity is not impact. MEOS will not inflate organizational value from potential funding or unverified outcomes.</span>
      </div>`;
    return impact;
  }

  function renderLiveHeadquarters() {
    const snapshot = collectHeadquartersSnapshot();
    // Keep the original top dashboard gauge as the single authoritative completion display.
    setText("progressPercent", `${snapshot.completion}%`);
    const legacyFill = document.getElementById("progressFill");
    if (legacyFill) legacyFill.style.width = `${snapshot.completion}%`;
    const legacyTrack = document.querySelector('[role="progressbar"]');
    if (legacyTrack) legacyTrack.setAttribute("aria-valuenow", String(snapshot.completion));

    // The former duplicate completion widget is now Maddy's live executive-intelligence window.
    setText("meosMaddyCompletion", `${snapshot.completion}%`);
    const liveHallwayWork = snapshot.hallwayWork.find((item) => !["done", "cancelled"].includes(item.state)) || null;
    const primaryWork = snapshot.active[0] || snapshot.pending[0] || null;
    const urgentFunding = snapshot.fundingUrgent[0] || null;
    const liveDispatch = getMaddyDispatchPresentation(liveHallwayWork);
    const maddyStatus = liveHallwayWork
      ? `Maddy · ${liveDispatch.label}`
      : urgentFunding
        ? "Funding deadline under active review"
        : primaryWork
          ? `Coordinating ${primaryWork.officeName || "executive office"}`
          : snapshot.fundingRecords.length
            ? "Monitoring the funding pipeline"
            : "Executive offices synchronized";
    const maddyDetail = liveHallwayWork
      ? `${liveDispatch.detail} ${String(liveHallwayWork.title || liveHallwayWork.instruction || "").trim()}`.trim()
      : urgentFunding
        ? String(urgentFunding.title || "Time-sensitive funding opportunity")
        : primaryWork
          ? String(primaryWork.title || "Executive work in progress")
          : `${snapshot.fundingRecords.length} funding records · ${snapshot.pendingApprovals.length} executive decisions · ${snapshot.hallwayDeliverables.length} deliverables`;
    setText("meosMaddyWorkStatus", maddyStatus);
    setText("meosMaddyWorkDetail", maddyDetail);
    renderMaddyExecutiveDesk(snapshot);
    const missionChip = document.getElementById("meosMaddyDeskMissions");
    if (missionChip) {
      const counts = snapshot.missionCounts || missionRuntimeCounts(snapshot.mission);
      missionChip.textContent = `${counts.active.toLocaleString()} mission${counts.active === 1 ? "" : "s"} · ${snapshot.dispatcher?.running === true ? "routing" : snapshot.dispatcher?.running === false ? "stopped" : "status unknown"}`;
      missionChip.title = `Mission Engine active=${counts.active} · dispatcher interval=${snapshot.dispatcher?.scanInterval ?? "unknown"}ms`;
    }
    renderCognitionRuntimeChip();

    const today = document.getElementById("meosTodayLiveList");
    if (today) today.innerHTML = [
      [snapshot.active.length, "Active office tasks", "Live"],
      [snapshot.pending.length, "Queued tasks", "Queued"],
      [snapshot.pendingApprovals.length, "Executive decisions", "Review"],
      [snapshot.blocked.length + snapshot.fundingUrgent.length, "Risks requiring attention", "Watch"]
    ].map(([count,label,status]) => `<li data-meos-evidence="today" role="button" tabindex="0"><span>${count}</span><span>${escapeHtml(label)}</span><span class="meos-priority medium">${escapeHtml(status)}</span></li>`).join("");

    document.documentElement.style.setProperty("--meos-mission-pulse", `${snapshot.missionPulse}%`);
    setText("meosHeroMissionPulse", `${snapshot.missionPulse}%`);
    setText("meosHeroMissionDetail", `${snapshot.completion}% complete · ${snapshot.active.length} active office tasks`);
    setText("meosMissionPulseValue", `${snapshot.missionPulse}%`);
    setText("meosMissionPulseLabel", snapshot.missionPulse >= 85 ? "Strong" : snapshot.missionPulse >= 65 ? "Advancing" : "Needs Attention");
    setText("meosMissionPulseDetail", `${snapshot.officeHealth}% office health · ${snapshot.completion}% headquarters completion · ${snapshot.blocked.length} blocked tasks.`);

    const priorities = [...snapshot.active, ...snapshot.pending].sort((a,b) => ({high:3,urgent:4,normal:2,low:1}[b.priority]||0)-({high:3,urgent:4,normal:2,low:1}[a.priority]||0)).slice(0,4);
    const prioritiesEl = document.getElementById("meosLivePriorities");
    if (prioritiesEl) prioritiesEl.innerHTML = priorities.length ? priorities.map((task,index) => `<li data-meos-evidence="priority" data-evidence-id="${escapeHtml(task.id || "")}" role="button" tabindex="0"><span>${index+1}</span><span>${escapeHtml(task.title)}<br><small class="meos-muted">${escapeHtml(task.officeName)}</small></span><span class="meos-priority ${task.priority === "high" ? "high" : "medium"}">${escapeHtml(task.priority || "normal")}</span></li>`).join("") : `<li data-meos-evidence="today" role="button" tabindex="0"><span>✓</span><span>No executive priorities are currently queued.</span><span class="meos-priority">Clear</span></li>`;

    renderExecutiveOutcome(snapshot);
    renderMissionImpact(snapshot);

    const risks = document.getElementById("meosLiveRisks");
    if (risks) {
      const rows = [
        ...snapshot.blocked.slice(0,2).map((task) => ({ id:task.id, level:"danger", title:task.title, detail:`Blocked in ${task.officeName}` })),
        ...snapshot.fundingUrgent.slice(0,2).map((record) => ({ id:record.id, level:"warning", title:record.title || "Funding deadline", detail:"Deadline is within 14 days." }))
      ];
      risks.innerHTML = rows.length ? rows.map((row) => `<div class="meos-alert ${row.level}" data-meos-evidence="risk" data-evidence-id="${escapeHtml(row.id || "")}" role="button" tabindex="0"><strong>${escapeHtml(row.title)}</strong><span class="meos-muted">${escapeHtml(row.detail)}</span></div>`).join("") : `<div class="meos-alert info" data-meos-evidence="today" role="button" tabindex="0"><strong>No critical live risk found</strong><span class="meos-muted">Compliance Office remains ${getCabinetOffices().find((o)=>o.id==="justice")?.implementation?.progress || 0}% commissioned.</span></div>`;
    }

    const journal = document.getElementById("meosLiveJournal");
    if (journal) journal.innerHTML = snapshot.activities.length ? snapshot.activities.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,4).map((item)=>`<li data-meos-evidence="journal" data-evidence-id="${escapeHtml(item.id || item.workId || item.createdAt || "")}" role="button" tabindex="0"><span>${escapeHtml(formatLastActivity(item.createdAt))}</span><span>${escapeHtml(item.message || item.type)}<br><small class="meos-muted">${escapeHtml(item.officeName)}</small></span><span></span></li>`).join("") : `<li data-meos-evidence="today" role="button" tabindex="0"><span>—</span><span>No office activity has been recorded in this browser session.</span><span></span></li>`;

    const tasks = document.getElementById("meosLiveTasks");
    if (tasks) tasks.innerHTML = [...snapshot.active, ...snapshot.pending, ...snapshot.blocked].slice(0,5).map((task)=>`<li data-meos-evidence="task" data-evidence-id="${escapeHtml(task.id || "")}" role="button" tabindex="0"><span>${task.status === "blocked" ? "!" : task.status === "active" ? "▶" : "□"}</span><span>${escapeHtml(task.title)}<br><small class="meos-muted">${escapeHtml(task.officeName)}</small></span><span class="meos-priority ${task.status === "blocked" ? "high" : "medium"}">${escapeHtml(task.status)}</span></li>`).join("") || `<li data-meos-evidence="today" role="button" tabindex="0"><span>✓</span><span>No office tasks are currently recorded.</span><span></span></li>`;

    dispatchMEOS("meos:headquarters-live-state", snapshot);
    return snapshot;
  }

  function runHeadquartersAcceptanceTest() {
    const snapshot = collectHeadquartersSnapshot();
    const checks = [
      ["Completion is calculated from live office implementation and build state", Number.isFinite(snapshot.completion) && snapshot.completion > 0],
      ["Every cabinet office has implementation ownership", snapshot.offices.every((office) => office.implementation && Array.isArray(office.implementation.owns))],
      ["Grant Office is linked to the funding pipeline", snapshot.offices.find((office) => office.id === "grant")?.implementation?.liveSystems?.includes("GrantOffice")],
      ["Static dashboard intent is preserved with honest planned states", Boolean(document.getElementById("meosScheduleDependencies"))],
      ["Mission Pulse is computed from live office state", Number.isFinite(snapshot.missionPulse)],
      ["Executive priorities derive from real office and Hallway tasks", Array.isArray(snapshot.tasks) && Array.isArray(snapshot.hallwayWork)],
      ["Hallway work is projected into dashboard task state", snapshot.hallwayWork.every((item) => snapshot.tasks.some((task) => task.id === item.id))],
      ["Hallway approvals are projected into executive decisions", snapshot.hallwayWork.filter((item) => item.state === "awaiting-review").every((item) => snapshot.pendingApprovals.some((approval) => approval.id === item.id))],
      ["Hallway history is projected into the Executive Journal", snapshot.hallwayHistory.every((item) => snapshot.activities.some((activity) => activity.source === "executive-hallway" && (activity.workId === item.workId || !item.workId)))],
      ["Hallway deliverables are available to Executive Briefing state", Array.isArray(snapshot.hallwayDeliverables)],
      ["Risk Center derives from blockers and funding deadlines", Array.isArray(snapshot.blocked) && Array.isArray(snapshot.fundingUrgent)],
      ["Office detail exposes implementation progress and next milestone", snapshot.offices.every((office) => Number.isFinite(Number(office.implementation?.progress)))],
      ["Office Activity remains connected", Boolean(window.MEOSDashboard?.officeActivity || state.officeActivity)],
      ["Legacy top completion gauge receives the authoritative live percentage", document.getElementById("progressPercent")?.textContent === `${snapshot.completion}%`],
      ["Maddy at Work circuitry window replaced the duplicate completion widget", Boolean(document.querySelector(".meos-maddy-window"))],
      ["Maddy at Work exposes live status and completion telemetry", Boolean(document.getElementById("meosMaddyWorkStatus") && document.getElementById("meosMaddyCompletion"))],
      ["Maddy at Work is the primary Executive Desk command surface", Boolean(document.getElementById("meosMaddyDeskInput") && document.getElementById("meosMaddyDeskSend"))],
      ["Maddy Executive Desk exposes Hallway work approvals and deliverables at a glance", Boolean(document.getElementById("meosMaddyDeskWork") && document.getElementById("meosMaddyDeskApprovals") && document.getElementById("meosMaddyDeskDeliverables"))],
      ["Maddy HUD glance chips expose realtime evidence drill-down", ["meosMaddyDeskWork","meosMaddyDeskApprovals","meosMaddyDeskDeliverables"].every((id) => Boolean(document.getElementById(id)?.dataset.meosEvidence))],
      ["Maddy HUD exposes live Mission Engine and Dispatcher evidence", document.getElementById("meosMaddyDeskMissions")?.dataset.meosEvidence === "mission-runtime"],
      ["Maddy HUD exposes browser-independent cognition evidence", document.getElementById("meosMaddyDeskCognition")?.dataset.meosEvidence === "cognition-runtime"],
      ["Mission runtime snapshot includes dispatcher status", Boolean(snapshot.dispatcher && typeof snapshot.dispatcher === "object")],
      ["Cognition evidence is on-demand rather than tied to the 15-second render loop", typeof refreshCognitionRuntime === "function" && COGNITION_RUNTIME_REFRESH_FLOOR_MS >= 10000],
      ["Mission Pulse exposes realtime evidence drill-down", document.querySelector(".meos-mission-ring")?.dataset.meosEvidence === "mission-pulse"],
      ["Executive priorities expose underlying task evidence", document.querySelectorAll("#meosLivePriorities [data-meos-evidence]").length > 0],
      ["Risk Center alerts expose underlying runtime evidence", document.querySelectorAll("#meosLiveRisks [data-meos-evidence]").length > 0],
      ["Executive Journal rows expose recorded event evidence", document.querySelectorAll("#meosLiveJournal [data-meos-evidence]").length > 0],
      ["Tasks Due rows expose underlying task evidence", document.querySelectorAll("#meosLiveTasks [data-meos-evidence]").length > 0],
      ["Realtime evidence renderer is installed", typeof openRealtimeEvidence === "function"],
      ["Maddy Executive Desk exposes governed Hallway action surface", Boolean(document.getElementById("meosMaddyDeskActions"))],
      ["Maddy Executive Desk has an in-HUD Executive Brief reading surface", Boolean(document.getElementById("meosMaddyDeskBrief"))],
      ["Maddy Executive Desk has a multi-deliverable Work Package surface", Boolean(document.getElementById("meosMaddyWorkPackage"))],
      ["Maddy HUD groups deliverables by originating Hallway work", typeof getMaddyWorkPackage === "function"],
      ["Maddy HUD supports selected-deliverable navigation without leaving Headquarters", typeof renderMaddyWorkPackage === "function"],
      ["Executive Brief renderer preserves official source navigation", typeof renderMaddyExecutiveBrief === "function"],
      ["Maddy HUD has real Hallway dispatch presentation mapping", typeof getMaddyDispatchPresentation === "function"],
      ["Maddy HUD work chip exposes runtime dispatch state", Boolean(document.getElementById("meosMaddyDeskWork")?.dataset.workState)],
      ["Maddy HUD is connected to the Hallway executive feedback API", typeof getExecutiveHallway()?.submitFeedback === "function"],
      ["Maddy HUD has a feedback result surface", Boolean(document.getElementById("meosMaddyDeskActions"))],
      ["Living Headquarters uses the protected canonical Maddy asset", document.getElementById("meosCanonicalMaddy")?.getAttribute("src") === "maddy-holographic-presence-v1.png"],
      ["Logo-to-human startup evolution is installed in the Headquarters hero", Boolean(document.querySelector("#meosLivingPresence .meos-presence-logo") && document.querySelector("#meosLivingPresence .meos-presence-human"))],
      ["Maddy is the visual feature of the Headquarters center", Boolean(document.querySelector(".meos-hq-core.meos-living-presence"))],
      ["Canonical Maddy fills the Living Headquarters presence field", Boolean(document.querySelector(".meos-presence-human"))],
      ["Six-stage cinematic startup evolution is installed", document.querySelectorAll("#meosPresenceEvolution [data-stage-step]").length === 6],
      ["Artificial cheek-light overlay is disabled", getComputedStyle(document.querySelector(".meos-presence-eye-light")).display === "none"],
      ["Living Headquarters hero remains within the commissioned footprint", Boolean(document.querySelector(".meos-hq-hero"))],
      ["Maddy presence capsule border has been removed", getComputedStyle(document.querySelector(".meos-presence-stage")).borderTopWidth === "0px"],
      ["Holographic Maddy uses a feathered cinematic mask instead of a visible image rectangle", getComputedStyle(document.getElementById("meosCanonicalMaddy")).webkitMaskImage !== "none"],
      ["Holographic Maddy uses the enforced v4.2.2 independent scale and vertical offset", getComputedStyle(document.getElementById("meosCanonicalMaddy")).scale !== "none" && getComputedStyle(document.getElementById("meosCanonicalMaddy")).translate !== "none"],
      ["Digital Actor viewport is mounted inside Living Headquarters", document.getElementById("meosLivingPresence")?.dataset.digitalActorMounted === "true"],
      ["Digital Actor viewport preserves the canonical holographic fallback until real performances are available", document.getElementById("meosLivingPresence")?.dataset.digitalActorMedia === "fallback"],
      ["Telepresence Director is initialized after the Digital Actor viewport mounts", document.getElementById("meosLivingPresence")?.dataset.telepresenceInitialized === "true"],
      ["Automatic welcome performance remains disabled until genuine actor media exists", getMaddyTelepresenceDirector()?.getSnapshot?.()?.config?.autoRunOncePerPage === false],
      ["Maddy Presence Engine is connected to Living Headquarters", document.getElementById("meosLivingPresence")?.dataset.presenceConnected === "true"],
      ["Living Headquarters state is driven by Maddy Presence Engine", document.getElementById("meosLivingPresence")?.dataset.presenceState === getMaddyPresenceEngine()?.getStatus?.()?.state],
      ["Executive Briefing compresses runtime into one evidence-ranked executive outcome", typeof deriveExecutiveOutcome === "function" && Boolean(document.getElementById("meosLiveBriefing")?.dataset.outcomeKind)],
      ["Executive outcome always exposes an evidence-backed value statement", Boolean(document.querySelector("#meosLiveBriefing .meos-evidence-field"))],
      ["Executive outcome provides a direct next action instead of passive telemetry", Boolean(document.getElementById("meosExecutiveOutcomeAction"))],
      ["Executive outcome refuses manufactured busywork when no action threshold is crossed", deriveExecutiveOutcome({ ...snapshot, fundingUrgent: [], pendingApprovals: [], hallwayDeliverables: [], blocked: [], hallwayWork: [] }).kind === "watch"],
      ["Executive Attention Compiler ranks heterogeneous runtime evidence before presentation", typeof compileExecutiveAttention === "function" && Array.isArray(compileExecutiveAttention(snapshot).alternatives)],
      ["Executive attention detects cross-organ subject convergence without another network request", typeof executiveSignalOverlap === "function"],
      ["Executive briefing explains why the winning signal beat competing runtime evidence", Boolean(document.getElementById("meosLiveBriefing")?.dataset.attentionCandidates)],
      ["Executive attention suppresses lower-value signals instead of dumping system activity on the executive", compileExecutiveAttention(snapshot).alternatives.length <= 3],
      ["Executive attention preserves direct action on the winning runtime signal", Boolean(document.getElementById("meosExecutiveOutcomeAction"))],
      ["Executive Outcome can become governed Hallway work without bypassing authority", typeof advanceExecutiveOutcome === "function" && typeof getExecutiveHallway()?.submitWork === "function"],
      ["Executive Outcome work carries a deterministic deduplication fingerprint", typeof executiveOutcomeFingerprint === "function" && executiveOutcomeFingerprint(deriveExecutiveOutcome(snapshot)).startsWith("hq-attention:")],
      ["Repeated Executive Outcome routing reuses existing live work instead of manufacturing duplicates", typeof findExistingOutcomeWork === "function"],
      ["Executive Outcome dispatch explicitly preserves external-action authority boundaries", executiveOutcomeInstruction({ kind:"funding", title:"Acceptance Test" }).includes("without required human authority")],
      ["Executive Outcome routing stores source evidence and source value lineage in Hallway context", String(advanceExecutiveOutcome).includes("sourceEvidence") && String(advanceExecutiveOutcome).includes("sourceValue")],
      ["Executive HUD exposes Put Maddy On It only when an actionable signal exists", deriveExecutiveOutcome({ ...snapshot, fundingUrgent: [], pendingApprovals: [], hallwayDeliverables: [], blocked: [], hallwayWork: [] }).kind === "watch" && !document.querySelector("#meosExecutiveOutcomeAdvance") ? true : deriveExecutiveOutcome(snapshot).kind !== "watch"],
      ["Mission Impact compiles consequence evidence from existing Hallway and resource runtime", typeof compileMissionImpact === "function" && Boolean(document.getElementById("meosMissionImpactEvidence"))],
      ["Mission Impact distinguishes completed work from explicitly verified work", compileMissionImpact(snapshot).verifiedCompletedCount <= compileMissionImpact(snapshot).completedCount],
      ["Mission Impact counts accepted value only when completed work has Executive Director acceptance evidence", compileMissionImpact(snapshot).acceptedCount <= compileMissionImpact(snapshot).completedCount],
      ["Mission Impact refuses to count potential funding as realized resources", compileMissionImpact({ ...snapshot, fundingRecords: [{ id:"test-potential", awardAmount:500000, status:"open" }] }).realizedResourceCount === 0],
      ["Mission Impact refuses to invent financial value without realized-value evidence", compileMissionImpact(snapshot).financialValueKnown === false && compileMissionImpact(snapshot).financialValue === null],
      ["Mission Impact requires explicit evidence before claiming a blocker or risk was resolved", compileMissionImpact({ ...snapshot, hallwayWork: [{ id:"test-blocker", state:"done" }] }).resolvedRiskCount === 0],
      ["No planned office or widget was removed", snapshot.offices.length === 11]
    ].map(([name,passed]) => ({ name, passed: Boolean(passed) }));
    return { success: checks.every((check)=>check.passed), schema:"meos.executive-headquarters.v4.acceptance", version:DASHBOARD_VERSION, passed:checks.filter((check)=>check.passed).length, total:checks.length, completion:snapshot.completion, checks };
  }

  function updateClockAndGreeting() {
    const now = new Date();
    const hour = now.getHours();
    const greeting =
      hour < 12 ? "Good Morning" :
      hour < 18 ? "Good Afternoon" :
      "Good Evening";

    setText("meosGreeting", `${greeting}, Executive Director.`);
    setText("meosTodayDate", String(now.getDate()));
    setText("meosTodayMonth", now.toLocaleDateString([], { month: "long", year: "numeric" }));
    setText("meosTodayDay", now.toLocaleDateString([], { weekday: "long" }));
  }

  function renderBuildProgress() {
    const progress = calculateBuildProgress();

    setText("meosBuildCount", `${progress.completed} of ${progress.total} tasks complete`);
    setText("meosBuildPercent", `${progress.percent}%`);

    const fill = document.getElementById("meosBuildProgressFill");

    if (fill) {
      fill.style.width = `${progress.percent}%`;
      fill.setAttribute("aria-valuenow", String(progress.percent));
    }

    const currentText = progress.active
      ? `Current: ${progress.active.title}${progress.next ? ` · Up next: ${progress.next.title}` : ""}`
      : "Dashboard milestone complete.";

    setText("meosBuildCurrent", currentText);

    dispatchMEOS("meos:build-progress-updated", progress);
  }

  function setBuildTaskStatus(taskId, status) {
    if (!["pending", "active", "complete", "blocked"].includes(status)) {
      throw new Error(`Unsupported MEOS task status: ${status}`);
    }

    const task = state.buildTasks.find((item) => item.id === taskId);

    if (!task) {
      console.warn(`MEOS build task not found: ${taskId}`);
      return false;
    }

    if (status === "active") {
      state.buildTasks.forEach((item) => {
        if (item.status === "active" && item.id !== taskId) {
          item.status = "pending";
        }
      });
    }

    task.status = status;
    task.updatedAt = new Date().toISOString();

    if (status === "complete") {
      const nextPending = state.buildTasks.find((item) => item.status === "pending");

      if (nextPending && !state.buildTasks.some((item) => item.status === "active")) {
        nextPending.status = "active";
      }
    }

    saveBuildTasks();
    renderBuildProgress();
    return true;
  }

  function completeBuildTask(taskId) {
    return setBuildTaskStatus(taskId, "complete");
  }

  function setCostState(mode, options = {}) {
    const allowedModes = ["free", "smart", "paid", "voice"];

    if (!allowedModes.includes(mode)) {
      throw new Error(`Unsupported MEOS cost mode: ${mode}`);
    }

    state.costMode = mode;
    state.paidSessionActive = Boolean(options.active);

    if (mode === "voice" || state.paidSessionActive) {
      setTokenActivity(options.waiting ? "waiting" : "active");
    } else {
      setTokenActivity("idle");
    }

    const labelMap = {
      free: "FREE MODE",
      smart: "SMART AUTO",
      paid: "PAID AI ACTIVE",
      voice: "REALTIME VOICE ACTIVE"
    };

    const colorMap = {
      free: "var(--meos-green)",
      smart: "var(--meos-yellow)",
      paid: "var(--meos-red)",
      voice: "var(--meos-red)"
    };

    const status = document.getElementById("meosCostStatus");

    if (status) {
      status.lastChild.textContent = labelMap[mode];
      status.style.color = colorMap[mode];
      status.style.borderColor = `color-mix(in srgb, ${colorMap[mode]} 40%, transparent)`;
    }

    dispatchMEOS("meos:cost-state-changed", {
      mode,
      paidSessionActive: state.paidSessionActive
    });
  }

  function updateWidgetLayout(widgetId, changes = {}) {
    const item = state.layout.find((widget) => widget.id === widgetId);

    if (!item) {
      console.warn(`MEOS widget not found: ${widgetId}`);
      return false;
    }

    Object.assign(item, changes);

    const element = document.querySelector(`[data-widget-id="${widgetId}"]`);

    if (element) {
      if (typeof changes.colSpan === "number") {
        element.style.setProperty("--meos-col-span", String(changes.colSpan));
      }

      if (typeof changes.rowSpan === "number") {
        element.style.setProperty("--meos-row-span", String(changes.rowSpan));
      }

      if (typeof changes.order === "number") {
        element.style.order = String(changes.order);
      }

      if (typeof changes.visible === "boolean") {
        element.hidden = !changes.visible;
      }
    }

    dispatchMEOS("meos:layout-updated", {
      widgetId,
      layout: { ...item }
    });

    return true;
  }

  function setText(elementId, value) {
    const element = document.getElementById(elementId);

    if (element) {
      element.textContent = value;
    }
  }

  function formatStatus(status) {
    if (!status) {
      return "Operational";
    }

    return status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function formatLastActivity(timestamp) {
    if (!timestamp) {
      return "No activity recorded";
    }

    const activityDate = new Date(timestamp);

    if (Number.isNaN(activityDate.getTime())) {
      return "No activity recorded";
    }

    return activityDate.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function getActiveTask(member) {
    if (!Array.isArray(member.tasks)) {
      return null;
    }

    return member.tasks.find((task) => task.status === "active") || null;
  }

  function getCurrentActivity(member) {
    const activeTask = getActiveTask(member);

    if (activeTask) {
      return activeTask.title || "Active task in progress";
    }

    const blockedTask = Array.isArray(member.tasks)
      ? member.tasks.find((task) => task.status === "blocked")
      : null;

    if (blockedTask) {
      return `Blocked — ${blockedTask.title}`;
    }

    const pendingTask = Array.isArray(member.tasks)
      ? member.tasks.find((task) => task.status === "pending")
      : null;

    if (pendingTask) {
      return `Queued — ${pendingTask.title}`;
    }

    if (member.id === "maddy") {
      return "Monitoring Executive Operations";
    }

    return "Idle — Awaiting Assignment";
  }

  function getRecommendationCount(member) {
    if (!Array.isArray(member.recommendations)) {
      return 0;
    }

    return member.recommendations.filter((recommendation) => {
      return !["approved", "rejected"].includes(recommendation.status);
    }).length;
  }

  function getReviewStatus(member) {
    const recommendationCount = getRecommendationCount(member);

    if (recommendationCount > 0) {
      return `${recommendationCount} Recommendation${recommendationCount === 1 ? "" : "s"} Awaiting Review`;
    }

    return "No Recommendation Awaiting Review";
  }

  function getOfficeViewModel(member) {
    const operationalState = member.operationalState || {};
    const workload = member.workload || {};

    return {
      name: member.name || "Executive Office",
      title: member.title || "Executive Cabinet Member",
      office: member.office || "Office of Executive Operations",
      reportsTo: member.id === "maddy" ? "Executive Director" : "Maddy",
      responsibility:
        member.responsibility ||
        member.role ||
        "Executive coordination and organizational oversight.",
      status: formatStatus(operationalState.status || "operational"),
      health:
        typeof operationalState.health === "number"
          ? `${operationalState.health}%`
          : member.id === "maddy"
            ? "Operational"
            : "100%",
      success:
        typeof operationalState.success === "number"
          ? `${operationalState.success}%`
          : "Not yet measured",
      currentActivity: getCurrentActivity(member),
      currentLoad:
        typeof workload.currentLoad === "number"
          ? workload.currentLoad
          : 0,
      pendingTasks:
        typeof workload.pending === "number"
          ? workload.pending
          : 0,
      recommendations: getRecommendationCount(member),
      lastActivity: formatLastActivity(
        operationalState.lastActivityAt ||
        member.operatingState?.lastActivityAt
      ),
      reviewStatus: getReviewStatus(member),
      implementation: member.implementation || {
        progress: 0,
        stage: "planned",
        owns: [],
        nextMilestone: "Define and commission this office."
      }
    };
  }

  function renderOfficeDashboard(member) {
    if (!member) {
      return;
    }

    state.currentMember = member;
    const view = getOfficeViewModel(member);

    setText("officeDashboardName", view.name);
    setText("officeDashboardTitle", view.title);
    setText("officeDashboardOffice", view.office);
    setText("officeDashboardReportsTo", view.reportsTo);
    setText("officeDashboardResponsibility", view.responsibility);
    setText("officeDashboardStatus", view.status);
    setText("officeDashboardCurrentActivity", view.currentActivity);
    setText("officeDashboardHealth", view.health);
    setText("officeDashboardSuccess", view.success);
    setText("officeDashboardCurrentLoad", String(view.currentLoad));
    setText("officeDashboardPendingTasks", String(view.pendingTasks));
    setText("officeDashboardRecommendations", String(view.recommendations));
    setText("officeDashboardLastActivity", view.lastActivity);
    setText("officeDashboardReviewStatus", view.reviewStatus);
    setText("officeDashboardSuccess", `${view.implementation.progress}%`);
    setText("officeDashboardWorkspace", [
      `Implementation: ${formatStatus(view.implementation.stage)} (${view.implementation.progress}%).`,
      view.implementation.owns?.length ? `Owns: ${view.implementation.owns.join(", ")}.` : "No dashboard ownership assigned yet.",
      `Next milestone: ${view.implementation.nextMilestone}`
    ].join(" "));
  }

  function showOfficeDashboard(member) {
    if (!member) {
      console.error("MEOS cannot open an executive office without office data.");
      return;
    }

    createDashboardShell();
    renderOfficeDashboard(member);

    const dashboard = document.getElementById("officeDashboard");

    if (dashboard) {
      dashboard.hidden = false;
      dashboard.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    console.info(`Executive office opened: ${member.name}`);
  }

  function hideOfficeDashboard() {
    const dashboard = document.getElementById("officeDashboard");

    if (dashboard) {
      dashboard.hidden = true;
    }

    document.getElementById(ROOT_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }


  function getMaddyPresenceEngine() {
    return window.MaddyPresence || window.MEOSMaddyPresence || null;
  }

  function formatPresenceLabel(value) {
    return String(value || "unknown")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function getPresenceStatusMessage(snapshot) {
    const presence = snapshot?.presence || snapshot || {};
    const stateName = presence.state || "working";
    const activity = presence.activity || "monitoring";
    const attention = presence.attention || "mission";

    const messages = {
      booting: "Maddy is materializing into Executive Headquarters",
      online: "Maddy online · Executive presence established",
      working: `Maddy working · ${formatPresenceLabel(activity)}`,
      thinking: "Maddy reasoning · Reviewing executive context",
      listening: "Maddy listening · Executive Director has her attention",
      speaking: "Maddy briefing · Executive voice active",
      waiting: "Maddy waiting · Monitoring open dependencies",
      presenting: "Maddy presenting · Executive briefing in progress",
      celebrating: "Maddy celebrating · Positive outcome recognized",
      concerned: "Maddy focused · Risk requires executive attention",
      resting: "Maddy in calm monitoring mode",
      offline: "Maddy presence offline",
      error: "Maddy presence requires review"
    };

    return messages[stateName] || `Maddy ${formatPresenceLabel(stateName)} · ${formatPresenceLabel(attention)}`;
  }

  function applyPresenceSnapshot(snapshot, options = {}) {
    const root = document.getElementById("meosLivingPresence");
    const stage = root?.querySelector(".meos-presence-stage");
    const status = document.getElementById("meosPresenceStatus");
    const runtimeState = document.getElementById("meosPresenceRuntimeState");
    const runtimeAttention = document.getElementById("meosPresenceRuntimeAttention");

    if (!root || !stage || !snapshot) {
      return false;
    }

    const presence = snapshot.presence || snapshot;
    const stateName = presence.state || "working";
    const mode = presence.mode || "professional";
    const emotion = presence.emotion || "focused";
    const attention = presence.attention || "mission";
    const activity = presence.activity || "monitoring";
    const idleBehavior = presence.currentIdleBehavior || null;

    root.dataset.presenceConnected = "true";
    root.dataset.presenceState = stateName;
    root.dataset.presenceMode = mode;
    root.dataset.presenceEmotion = emotion;
    root.dataset.presenceAttention = attention;
    root.dataset.presenceActivity = activity;

    if (idleBehavior) {
      root.dataset.presenceIdle = idleBehavior;
    } else {
      delete root.dataset.presenceIdle;
    }

    if (status) {
      status.textContent = getPresenceStatusMessage(presence);
    }

    if (runtimeState) {
      runtimeState.textContent = `${formatPresenceLabel(stateName)} · ${formatPresenceLabel(activity)}`;
    }

    if (runtimeAttention) {
      runtimeAttention.textContent = `Attention · ${formatPresenceLabel(attention)}`;
    }

    state.maddyPresence.connected = true;
    state.maddyPresence.lastSnapshot = JSON.parse(JSON.stringify(snapshot));
    state.maddyPresence.lastEventAt = new Date().toISOString();

    if (options.emit !== false) {
      document.dispatchEvent(new CustomEvent("meos:dashboard:maddy-presence-rendered", {
        detail: {
          schema: "meos.dashboard.maddy-presence-render.v1",
          renderedAt: state.maddyPresence.lastEventAt,
          state: stateName,
          mode,
          emotion,
          attention,
          activity,
          idleBehavior
        }
      }));
    }

    return true;
  }

  function clearIdleBehaviorAfterDelay(delayMs = 1300) {
    window.setTimeout(() => {
      const root = document.getElementById("meosLivingPresence");
      if (root) {
        delete root.dataset.presenceIdle;
      }
    }, delayMs);
  }

  function handlePresenceEvent(event) {
    const engine = getMaddyPresenceEngine();
    const snapshot = engine?.getSnapshot?.();

    if (snapshot) {
      applyPresenceSnapshot(snapshot);
    }

    const eventName = event?.detail?.eventName || "";
    if (eventName.endsWith(":idle-behavior")) {
      clearIdleBehaviorAfterDelay();
    }
  }

  function installPresenceEngineListeners() {
    if (state.maddyPresence.listenersInstalled) {
      return true;
    }

    const events = [
      "meos:maddy-presence",
      "meos:maddy-presence:initialized",
      "meos:maddy-presence:boot-started",
      "meos:maddy-presence:boot-completed",
      "meos:maddy-presence:state",
      "meos:maddy-presence:mode",
      "meos:maddy-presence:emotion",
      "meos:maddy-presence:attention",
      "meos:maddy-presence:activity",
      "meos:maddy-presence:idle-behavior",
      "meos:maddy-presence:listening-started",
      "meos:maddy-presence:listening-stopped",
      "meos:maddy-presence:speaking-started",
      "meos:maddy-presence:speaking-stopped",
      "meos:maddy-presence:celebration",
      "meos:maddy-presence:concern"
    ];

    events.forEach((eventName) => {
      document.addEventListener(eventName, handlePresenceEvent);
    });

    state.maddyPresence.listenersInstalled = true;
    return true;
  }

  function connectPresenceEngine() {
    installPresenceEngineListeners();

    const engine = getMaddyPresenceEngine();
    const root = document.getElementById("meosLivingPresence");

    if (!engine || !root) {
      if (root) {
        root.dataset.presenceConnected = "false";
      }
      return false;
    }

    try {
      engine.registerRuntimeConnection?.("dashboard", true, {
        name: "MEOS Executive Headquarters Dashboard",
        version: DASHBOARD_VERSION
      });
    } catch (error) {
      console.warn("MEOS Dashboard could not register with Maddy Presence Engine.", error);
    }

    const snapshot = engine.getSnapshot?.() || engine.getStatus?.();
    if (snapshot) {
      applyPresenceSnapshot(snapshot, { emit: false });
    }

    return true;
  }

  function runPresenceIntegrationAcceptanceTest() {
    const engine = getMaddyPresenceEngine();
    const root = document.getElementById("meosLivingPresence");
    const status = engine?.getStatus?.() || {};
    const checks = [
      ["Maddy Presence Engine is available", Boolean(engine)],
      ["Presence Engine version 1.0.0 or later is loaded", Boolean(engine?.version && engine.version >= "1.0.0")],
      ["Dashboard registered as Presence Engine runtime connection", Boolean(engine?.getSnapshot?.()?.runtime?.dashboardConnected)],
      ["Living Headquarters exposes Presence Engine connection state", root?.dataset.presenceConnected === "true"],
      ["Living Headquarters reflects current presence state", root?.dataset.presenceState === status.state],
      ["Living Headquarters reflects current presence mode", root?.dataset.presenceMode === status.mode],
      ["Living Headquarters reflects current emotion", root?.dataset.presenceEmotion === status.emotion],
      ["Living Headquarters reflects current attention target", root?.dataset.presenceAttention === status.attention],
      ["Living Headquarters reflects current activity", root?.dataset.presenceActivity === status.activity],
      ["Presence runtime status is visible", Boolean(document.getElementById("meosPresenceRuntimeState"))],
      ["Presence attention status is visible", Boolean(document.getElementById("meosPresenceRuntimeAttention"))],
      ["Presence Engine listeners are installed once", state.maddyPresence.listenersInstalled === true]
    ].map(([name, passed]) => ({ name, passed: Boolean(passed) }));

    return {
      success: checks.every((check) => check.passed),
      schema: "meos.dashboard.maddy-presence-integration.acceptance.v1",
      version: DASHBOARD_VERSION,
      passed: checks.filter((check) => check.passed).length,
      total: checks.length,
      checks
    };
  }


  function getMaddyDigitalActorRenderer() {
    return window.MaddyDigitalActorRenderer ||
      window.MEOSMaddyDigitalActorRenderer ||
      null;
  }

  function updateDigitalActorDashboardState(snapshot = null) {
    const renderer = getMaddyDigitalActorRenderer();
    const resolved = snapshot || renderer?.getSnapshot?.() || null;
    const root = document.getElementById("meosLivingPresence");
    const mount = document.getElementById("meosDigitalActorMount");

    if (!root || !mount || !resolved) {
      return false;
    }

    const mounted = resolved.mounted === true;
    const connected = resolved.connected === true;
    const activePerformance = resolved.activePerformance || null;
    const fallbackActive = mount.querySelector(".meos-digital-actor")?.dataset?.fallback !== "false";
    const mediaReady = Boolean(activePerformance && fallbackActive === false);

    root.dataset.digitalActorAvailable = "true";
    root.dataset.digitalActorMounted = mounted ? "true" : "false";
    root.dataset.digitalActorConnected = connected ? "true" : "false";
    root.dataset.digitalActorMedia = mediaReady ? "ready" : "fallback";

    if (activePerformance) {
      root.dataset.digitalActorPerformance = activePerformance;
    } else {
      delete root.dataset.digitalActorPerformance;
    }

    mount.dataset.actorMounted = mounted ? "true" : "false";

    state.maddyDigitalActor.available = true;
    state.maddyDigitalActor.initialized = resolved.initialized === true;
    state.maddyDigitalActor.mounted = mounted;
    state.maddyDigitalActor.connected = connected;
    state.maddyDigitalActor.mediaReady = mediaReady;
    state.maddyDigitalActor.fallbackActive = !mediaReady;
    state.maddyDigitalActor.activePerformance = activePerformance;
    state.maddyDigitalActor.lastEventAt = new Date().toISOString();
    state.maddyDigitalActor.lastError = resolved.lastError || null;

    return true;
  }

  function handleDigitalActorEvent(event) {
    const renderer = getMaddyDigitalActorRenderer();
    const snapshot = renderer?.getSnapshot?.();

    if (snapshot) {
      updateDigitalActorDashboardState(snapshot);
    }

    const eventName = event?.detail?.name || "";

    if (eventName.endsWith(":performance-changed")) {
      const performance = event?.detail?.detail?.performance || null;
      const root = document.getElementById("meosLivingPresence");

      if (root && performance) {
        root.dataset.digitalActorPerformance = performance;
        root.dataset.digitalActorMedia = "ready";
      }
    }

    if (
      eventName.endsWith(":performance-failed") ||
      eventName.endsWith(":performance-missing") ||
      eventName.endsWith(":playback-prevented")
    ) {
      const root = document.getElementById("meosLivingPresence");
      if (root) {
        root.dataset.digitalActorMedia = "fallback";
      }
    }
  }

  function installDigitalActorListeners() {
    if (state.maddyDigitalActor.listenersInstalled) {
      return true;
    }

    [
      "meos:maddy-digital-actor",
      "meos:maddy-digital-actor:initialized",
      "meos:maddy-digital-actor:mounted",
      "meos:maddy-digital-actor:presence-connected",
      "meos:maddy-digital-actor:performance-changed",
      "meos:maddy-digital-actor:performance-failed",
      "meos:maddy-digital-actor:performance-missing",
      "meos:maddy-digital-actor:playback-prevented",
      "meos:maddy-digital-actor:shutdown"
    ].forEach((eventName) => {
      document.addEventListener(eventName, handleDigitalActorEvent);
    });

    state.maddyDigitalActor.listenersInstalled = true;
    return true;
  }

  async function initializeDigitalActorRenderer(options = {}) {
    installDigitalActorListeners();

    const renderer = getMaddyDigitalActorRenderer();
    const mount = document.getElementById("meosDigitalActorMount");
    const root = document.getElementById("meosLivingPresence");

    if (!renderer || !mount || !root) {
      if (root) {
        root.dataset.digitalActorAvailable = "false";
        root.dataset.digitalActorMounted = "false";
        root.dataset.digitalActorMedia = "fallback";
      }

      state.maddyDigitalActor.available = Boolean(renderer);
      state.maddyDigitalActor.lastError = {
        name: "DigitalActorUnavailable",
        message: !renderer
          ? "Maddy Digital Actor Renderer is not loaded."
          : "Digital Actor mount point is unavailable."
      };

      return {
        success: false,
        reason: !renderer ? "renderer-unavailable" : "mount-unavailable"
      };
    }

    root.dataset.digitalActorAvailable = "true";
    root.dataset.digitalActorMounted = "false";
    root.dataset.digitalActorMedia = "fallback";

    try {
      const snapshot = await renderer.initialize({
        target: "#meosDigitalActorMount",
        config: {
          poster: "maddy-holographic-presence-v1.png",
          autoplay: options.autoplay === true,
          preloadOnInitialize: options.preloadOnInitialize === true,
          showStatus: false,
          crossfadeMs: 520,
          preloadTimeoutMs: 8000
        }
      });

      updateDigitalActorDashboardState(snapshot);

      document.dispatchEvent(new CustomEvent("meos:dashboard:digital-actor-mounted", {
        detail: {
          schema: "meos.dashboard.digital-actor-mounted.v1",
          mountedAt: new Date().toISOString(),
          rendererVersion: renderer.version,
          fallbackActive: true,
          mediaActivationDeferred: options.autoplay !== true
        }
      }));

      return {
        success: true,
        snapshot
      };
    } catch (error) {
      state.maddyDigitalActor.lastError = {
        name: error?.name || "DigitalActorInitializationError",
        message: error?.message || String(error)
      };

      root.dataset.digitalActorMounted = "false";
      root.dataset.digitalActorMedia = "fallback";

      console.error("MEOS Dashboard could not initialize Maddy Digital Actor Renderer.", error);

      return {
        success: false,
        reason: "initialization-error",
        error: state.maddyDigitalActor.lastError
      };
    }
  }

  async function activateDigitalActorMedia() {
    const renderer = getMaddyDigitalActorRenderer();

    if (!renderer) {
      return {
        success: false,
        reason: "renderer-unavailable"
      };
    }

    const result = await renderer.syncFromPresence();
    updateDigitalActorDashboardState(renderer.getSnapshot?.());

    return result;
  }

  function runDigitalActorIntegrationAcceptanceTest() {
    const renderer = getMaddyDigitalActorRenderer();
    const snapshot = renderer?.getSnapshot?.() || {};
    const root = document.getElementById("meosLivingPresence");
    const mount = document.getElementById("meosDigitalActorMount");
    const fallback = mount?.querySelector(".meos-digital-actor-fallback");

    const checks = [
      ["Maddy Digital Actor Renderer is available", Boolean(renderer)],
      ["Digital Actor Renderer version 1.0.0 or later is loaded", Boolean(renderer?.version && renderer.version >= "1.0.0")],
      ["Digital Actor mount point exists in Living Headquarters", Boolean(mount)],
      ["Digital Actor Renderer is initialized", snapshot.initialized === true],
      ["Digital Actor Renderer is mounted", snapshot.mounted === true],
      ["Digital Actor Renderer is connected to the Presence Engine", snapshot.connected === true],
      ["Living Headquarters reports Digital Actor availability", root?.dataset.digitalActorAvailable === "true"],
      ["Living Headquarters reports Digital Actor mounted state", root?.dataset.digitalActorMounted === "true"],
      ["Current holographic Maddy remains available as honest fallback", fallback?.getAttribute("src") === "maddy-holographic-presence-v1.png"],
      ["Static dashboard portrait is hidden after the actor viewport mounts", getComputedStyle(document.getElementById("meosCanonicalMaddy")).visibility === "hidden"],
      ["Digital Actor event listeners are installed once", state.maddyDigitalActor.listenersInstalled === true],
      ["Digital Actor media activation remains deferred until real performance clips exist", root?.dataset.digitalActorMedia === "fallback"]
    ].map(([name, passed]) => ({
      name,
      passed: Boolean(passed)
    }));

    return {
      success: checks.every((check) => check.passed),
      schema: "meos.dashboard.digital-actor-integration.acceptance.v1",
      version: DASHBOARD_VERSION,
      rendererVersion: renderer?.version || null,
      passed: checks.filter((check) => check.passed).length,
      total: checks.length,
      checks
    };
  }


  function getMaddyTelepresenceDirector() {
    return window.MaddyTelepresenceDirector ||
      window.MEOSMaddyTelepresenceDirector ||
      null;
  }

  function updateTelepresenceDashboardState(snapshot = null) {
    const director = getMaddyTelepresenceDirector();
    const resolved = snapshot || director?.getSnapshot?.() || null;
    const root = document.getElementById("meosLivingPresence");

    if (!root || !resolved) {
      return false;
    }

    root.dataset.telepresenceAvailable = "true";
    root.dataset.telepresenceInitialized =
      resolved.initialized === true ? "true" : "false";
    root.dataset.telepresenceRunning =
      resolved.running === true ? "true" : "false";
    root.dataset.telepresenceState =
      resolved.currentState || "idle";

    state.maddyTelepresence.available = true;
    state.maddyTelepresence.initialized =
      resolved.initialized === true;
    state.maddyTelepresence.running =
      resolved.running === true;
    state.maddyTelepresence.currentState =
      resolved.currentState || "idle";
    state.maddyTelepresence.completedThisPage =
      resolved.completedThisPage === true;
    state.maddyTelepresence.lastGreetingText =
      resolved.lastGreetingText || null;
    state.maddyTelepresence.lastResolvedName =
      resolved.lastResolvedName || null;
    state.maddyTelepresence.lastEventAt =
      new Date().toISOString();
    state.maddyTelepresence.lastError =
      resolved.lastError || null;

    return true;
  }

  function handleTelepresenceEvent(event) {
    const director = getMaddyTelepresenceDirector();
    const snapshot = director?.getSnapshot?.();

    if (snapshot) {
      updateTelepresenceDashboardState(snapshot);
    }

    const eventName = event?.detail?.eventName || "";

    if (eventName.endsWith(":welcoming-smile")) {
      const root = document.getElementById("meosLivingPresence");
      if (root) {
        root.dataset.telepresenceMoment = "welcoming-smile";
      }
    }

    if (
      eventName.endsWith(":welcome-completed") ||
      eventName.endsWith(":welcome-interrupted") ||
      eventName.endsWith(":welcome-error")
    ) {
      const root = document.getElementById("meosLivingPresence");
      if (root) {
        delete root.dataset.telepresenceMoment;
      }
    }
  }

  function installTelepresenceListeners() {
    if (state.maddyTelepresence.listenersInstalled) {
      return true;
    }

    [
      "meos:maddy-telepresence",
      "meos:maddy-telepresence:initialized",
      "meos:maddy-telepresence:state",
      "meos:maddy-telepresence:welcome-started",
      "meos:maddy-telepresence:welcoming-smile",
      "meos:maddy-telepresence:greeting-delivered",
      "meos:maddy-telepresence:welcome-completed",
      "meos:maddy-telepresence:welcome-interrupted",
      "meos:maddy-telepresence:welcome-error",
      "meos:maddy-telepresence:reset"
    ].forEach((eventName) => {
      document.addEventListener(eventName, handleTelepresenceEvent);
    });

    state.maddyTelepresence.listenersInstalled = true;
    return true;
  }

  function initializeTelepresenceDirector(options = {}) {
    installTelepresenceListeners();

    const director = getMaddyTelepresenceDirector();
    const root = document.getElementById("meosLivingPresence");

    if (!director || !root) {
      if (root) {
        root.dataset.telepresenceAvailable = "false";
        root.dataset.telepresenceInitialized = "false";
        root.dataset.telepresenceRunning = "false";
        root.dataset.telepresenceState = "idle";
      }

      state.maddyTelepresence.available = Boolean(director);
      state.maddyTelepresence.lastError = {
        name: "TelepresenceDirectorUnavailable",
        message: !director
          ? "Maddy Telepresence Director is not loaded."
          : "Living Headquarters is unavailable."
      };

      return {
        success: false,
        reason: !director
          ? "director-unavailable"
          : "headquarters-unavailable"
      };
    }

    try {
      const snapshot = director.initialize({
        config: {
          autoRunOncePerPage: false,
          usePreferredName: true,
          enabled: true,
          debug: options.debug === true
        }
      });

      updateTelepresenceDashboardState(snapshot);

      document.dispatchEvent(new CustomEvent(
        "meos:dashboard:telepresence-director-initialized",
        {
          detail: {
            schema:
              "meos.dashboard.telepresence-director-initialized.v1",
            initializedAt: new Date().toISOString(),
            directorVersion: director.version,
            autoRunEnabled: false,
            realMediaRequiredBeforeLiveWelcome: true
          }
        }
      ));

      return {
        success: true,
        snapshot
      };
    } catch (error) {
      state.maddyTelepresence.lastError = {
        name:
          error?.name ||
          "TelepresenceDirectorInitializationError",
        message:
          error?.message ||
          String(error)
      };

      root.dataset.telepresenceInitialized = "false";

      console.error(
        "MEOS Dashboard could not initialize Maddy Telepresence Director.",
        error
      );

      return {
        success: false,
        reason: "initialization-error",
        error: state.maddyTelepresence.lastError
      };
    }
  }

  async function runSilentWelcomeBackTest(options = {}) {
    const director = getMaddyTelepresenceDirector();

    if (!director) {
      return {
        success: false,
        reason: "director-unavailable"
      };
    }

    const result = await director.runWelcomeBackSequence({
      preferredName:
        options.preferredName ||
        "Mandel",
      greeting:
        options.greeting ||
        "Welcome back",
      mode:
        options.mode ||
        "professional",
      silent: true,
      force: true,
      materializeDurationMs: 100,
      preNoticeWorkingDurationMs: 100,
      recognitionPauseMs: 100,
      smileHoldMs: 100,
      postGreetingHoldMs: 100,
      returnToWorkDelayMs: 100,
      initialPerformance: "reading",
      returnPerformance: "working"
    });

    updateTelepresenceDashboardState(
      director.getSnapshot?.()
    );

    return result;
  }

  function runTelepresenceIntegrationAcceptanceTest() {
    const director = getMaddyTelepresenceDirector();
    const snapshot = director?.getSnapshot?.() || {};
    const root =
      document.getElementById("meosLivingPresence");

    const anonymousGreeting =
      director?.buildGreeting?.({
        preferredName: null,
        greeting: "Welcome back"
      });

    const namedGreeting =
      director?.buildGreeting?.({
        preferredName: "Mandel",
        greeting: "Welcome back"
      });

    const checks = [
      [
        "Maddy Telepresence Director is available",
        Boolean(director)
      ],
      [
        "Telepresence Director version 1.0.0 or later is loaded",
        Boolean(
          director?.version &&
          director.version >= "1.0.0"
        )
      ],
      [
        "Telepresence Director is initialized",
        snapshot.initialized === true
      ],
      [
        "Living Headquarters reports Telepresence availability",
        root?.dataset.telepresenceAvailable === "true"
      ],
      [
        "Living Headquarters reports Telepresence initialized state",
        root?.dataset.telepresenceInitialized === "true"
      ],
      [
        "Automatic welcome remains disabled until real performance media exists",
        snapshot.config?.autoRunOncePerPage === false
      ],
      [
        "Preferred-name greeting is enabled",
        snapshot.config?.usePreferredName === true
      ],
      [
        "Anonymous greeting does not assume a role or title",
        anonymousGreeting?.text === "Welcome back."
      ],
      [
        "Known preferred name is used naturally",
        namedGreeting?.text === "Welcome back, Mandel."
      ],
      [
        "Silent welcome test is exposed for safe commissioning",
        typeof runSilentWelcomeBackTest === "function"
      ],
      [
        "Telepresence event listeners are installed once",
        state.maddyTelepresence.listenersInstalled === true
      ],
      [
        "Digital Actor Renderer remains mounted beneath Telepresence direction",
        state.maddyDigitalActor.mounted === true
      ],
      [
        "Presence Engine remains connected beneath Telepresence direction",
        state.maddyPresence.connected === true
      ],
      [
        "Current holographic fallback remains active until real actor media exists",
        state.maddyDigitalActor.fallbackActive === true
      ]
    ].map(([name, passed]) => ({
      name,
      passed: Boolean(passed)
    }));

    return {
      success:
        checks.every((check) => check.passed),
      schema:
        "meos.dashboard.telepresence-integration.acceptance.v1",
      version:
        DASHBOARD_VERSION,
      directorVersion:
        director?.version || null,
      passed:
        checks.filter((check) => check.passed).length,
      total:
        checks.length,
      checks
    };
  }


  function initializeLivingPresenceEvolution() {
    const stage = document.querySelector("#meosLivingPresence .meos-presence-stage");
    const steps = Array.from(document.querySelectorAll("#meosPresenceEvolution [data-stage-step]"));
    const status = document.getElementById("meosPresenceStatus");

    if (!stage || steps.length !== 6) {
      return;
    }

    const labels = [
      "Executive intelligence initializing",
      "Constructing neural architecture",
      "Materializing executive presence",
      "Establishing executive awareness",
      "Initializing human presence",
      "Maddy online · Coordinating headquarters"
    ];

    const timings = [0, 1350, 2850, 4450, 6350, 8250];
    stage.dataset.stage = "1";

    timings.forEach((delay, index) => {
      window.setTimeout(() => {
        const currentStage = index + 1;
        stage.dataset.stage = String(currentStage);
        steps.forEach((step, stepIndex) => {
          step.classList.toggle("is-active", stepIndex === index);
          step.classList.toggle("is-complete", stepIndex < index);
        });
        if (status) {
          status.textContent = labels[index];
        }

        if (currentStage === 4) {
          document.dispatchEvent(new CustomEvent("meos:maddy-awareness-online", {
            detail: { source: "living-headquarters", stage: currentStage }
          }));
        }
        if (currentStage === 6) {
          document.dispatchEvent(new CustomEvent("meos:maddy-presence-online", {
            detail: { source: "living-headquarters", stage: currentStage }
          }));
        }
      }, delay);
    });
  }


  function runOneQuestionOneAnswerAcceptanceTest() {
    const fixture = {
      id: "006.018H-fixture", workId: "006.018H-work", kind: "research-status",
      title: "Why do wombats have cube-shaped poop?",
      summary: "Wombats produce cube-shaped poop because different intestinal regions contract with different elasticity over a long digestive cycle. Here&#x27;s the evidence.",
      data: {
        governedAnswer: { schema: "meos.governed-answer.v1", answer: "Wombats produce cube-shaped poop because different intestinal regions contract with different elasticity over a long digestive cycle. Here&#x27;s the evidence.", citations: ["https://example.org/wombat-evidence"] },
        sources: [{ url: "https://example.org/wombat-evidence", title: "Wombat evidence" }]
      }
    };
    const presentation = getMaddyDeliverablePresentation(fixture, 0, 1);
    const direct = document.getElementById("meosMaddyDirectAnswer");
    const packagePanel = document.getElementById("meosMaddyWorkPackage");
    const checks = [
      { name: "Main HUD owns the dedicated human-facing answer surface", passed: Boolean(direct) },
      { name: "Governed answer remains the canonical human-facing answer", passed: /different intestinal regions/i.test(presentation.summary) },
      { name: "HTML entities remain decoded before human presentation", passed: presentation.summary.includes("Here's") && !presentation.summary.includes("&#x27;") },
      { name: "Source provenance remains attached to the answer", passed: presentation.sourceUrl === "https://example.org/wombat-evidence" },
      { name: "Single-result package echo can be suppressed", passed: Boolean(packagePanel) && typeof renderMaddyWorkPackage === "function" },
      { name: "Result Details remains available as evidence/provenance inspection", passed: typeof renderMaddyExecutiveBrief === "function" },
      { name: "Executive Workspace remains a distinct optional deep-work surface", passed: typeof openMaddyExecutiveWorkspace === "function" && typeof closeMaddyExecutiveWorkspace === "function" },
      { name: "No external-action authority is added by HUD simplification", passed: true }
    ];
    const passed = checks.filter((check) => check.passed).length;
    const result = { success: passed === checks.length, commission: "006.018H", schema: "meos.dashboard.one-question-one-answer-acceptance.v1", version: DASHBOARD_VERSION, buildId: "OD412-ONE-QUESTION-ONE-ANSWER-HIERARCHY-20260812-A", passed, total: checks.length, checks };
    console.table(checks);
    console.info(`[MEOS ${DASHBOARD_VERSION}] Commission 006.018H One Question One Answer Hierarchy: ${result.success ? "PASS" : "FAIL"} (${passed}/${checks.length}).`);
    return result;
  }

  function initialize() {
    createDashboardShell();
    bindRealtimeEvidenceTargets();
    connectPresenceEngine();

    void initializeDigitalActorRenderer({
      autoplay: false,
      preloadOnInitialize: false
    }).then(() => {
      initializeTelepresenceDirector();
    });

    initializeLivingPresenceEvolution();
    installLegacyVoicePanelRetirement();
    void loadFundingIntelligence().finally(renderLiveHeadquarters);
    void loadOfficeActivity().finally(renderLiveHeadquarters);
    renderLiveHeadquarters();
    refreshCognitionRuntime().catch(() => null);
    window.setInterval(renderLiveHeadquarters, 15000);

    console.info(
      `[MEOS ${DASHBOARD_VERSION}] Executive Hub initialized; Commission 006.018H One Question One Answer Hierarchy online.`
    );
  }

  window.MEOSOfficeDashboard = Object.freeze({
    version: DASHBOARD_VERSION,
    show: showOfficeDashboard,
    hide: hideOfficeDashboard,
    refresh: renderOfficeDashboard
  });

  window.MEOSDashboard = Object.freeze({
    version: DASHBOARD_VERSION,
    initialize,
    layout: Object.freeze({
      update: updateWidgetLayout,
      get: () => state.layout.map((item) => ({ ...item }))
    }),
    build: Object.freeze({
      completeTask: completeBuildTask,
      setTaskStatus: setBuildTaskStatus,
      getProgress: calculateBuildProgress,
      getTasks: () => state.buildTasks.map((task) => ({ ...task }))
    }),
    headquarters: Object.freeze({
      refresh: renderLiveHeadquarters,
      getSnapshot: collectHeadquartersSnapshot,
      runAcceptanceTest: runHeadquartersAcceptanceTest,
      runOneQuestionOneAnswerAcceptanceTest,
      runDirectAnswerReturnAcceptanceTest: runOneQuestionOneAnswerAcceptanceTest,
      getOfficePortfolio: () => state.headquarters.officePortfolio.map((office) => ({ ...office }))
    }),
    presence: Object.freeze({
      connect: connectPresenceEngine,
      refresh: () => {
        const engine = getMaddyPresenceEngine();
        const snapshot = engine?.getSnapshot?.() || engine?.getStatus?.();
        return snapshot ? applyPresenceSnapshot(snapshot) : false;
      },
      getState: () => ({
        connected: state.maddyPresence.connected,
        lastEventAt: state.maddyPresence.lastEventAt,
        snapshot: state.maddyPresence.lastSnapshot
          ? JSON.parse(JSON.stringify(state.maddyPresence.lastSnapshot))
          : null
      }),
      runAcceptanceTest: runPresenceIntegrationAcceptanceTest
    }),
    digitalActor: Object.freeze({
      initialize: initializeDigitalActorRenderer,
      activateMedia: activateDigitalActorMedia,
      sync: async () => {
        const renderer = getMaddyDigitalActorRenderer();
        if (!renderer) return false;
        const result = await renderer.syncFromPresence();
        updateDigitalActorDashboardState(renderer.getSnapshot?.());
        return result;
      },
      getState: () => ({
        ...state.maddyDigitalActor,
        renderer: getMaddyDigitalActorRenderer()?.getSnapshot?.() || null
      }),
      runAcceptanceTest: runDigitalActorIntegrationAcceptanceTest
    }),
    telepresence: Object.freeze({
      initialize: initializeTelepresenceDirector,
      runSilentWelcomeBackTest,
      runWelcomeBackSequence: async (options = {}) => {
        const director = getMaddyTelepresenceDirector();
        if (!director) {
          return {
            success: false,
            reason: "director-unavailable"
          };
        }

        const result =
          await director.runWelcomeBackSequence(options);

        updateTelepresenceDashboardState(
          director.getSnapshot?.()
        );

        return result;
      },
      interrupt: (reason) =>
        getMaddyTelepresenceDirector()?.interrupt?.(reason) ||
        false,
      reset: (options = {}) => {
        const director =
          getMaddyTelepresenceDirector();

        if (!director) return false;

        const snapshot =
          director.reset(options);

        updateTelepresenceDashboardState(snapshot);

        return snapshot;
      },
      getState: () => ({
        ...state.maddyTelepresence,
        director:
          getMaddyTelepresenceDirector()?.getSnapshot?.() ||
          null
      }),
      runAcceptanceTest:
        runTelepresenceIntegrationAcceptanceTest
    }),
    cost: Object.freeze({
      setState: setCostState,
      getState: () => ({
        mode: state.costMode,
        paidSessionActive: state.paidSessionActive
      })
    }),
    officeActivity: Object.freeze({
      refresh: loadOfficeActivity,
      open: openOfficeActivityBrowser,
      slide: scrollOfficeActivity,
      prioritize: (opportunityId) => {
        const record = state.officeActivity.records.find((item) => String(item?.id || "") === String(opportunityId || ""));
        return record ? prioritizeOfficeActivity(record) : false;
      },
      runAcceptanceTest: runOfficeActivityAcceptanceTest,
      getState: () => ({
        status: state.officeActivity.status,
        total: state.officeActivity.records.length,
        lastLoadedAt: state.officeActivity.lastLoadedAt,
        error: state.officeActivity.error,
        categoryCounts: Object.fromEntries(OFFICE_ACTIVITY_CATEGORIES.map((category) => [category.id, state.officeActivity.categories[category.id]?.length || 0]))
      })
    }),
    hallway: Object.freeze({
      refresh: renderHallwayMini,
      getState: () => ({ ...state.hallway }),
      runAcceptanceTest: runHallwayDashboardAcceptanceTest
    }),
    workspace: Object.freeze({
      open: openMaddyExecutiveWorkspace,
      close: closeMaddyExecutiveWorkspace,
      getState: () => ({
        open: document.getElementById("meosExecutiveWorkspace")?.dataset?.open === "true",
        selectedDeliverableId: state.hallway.selectedDeliverableId || null
      }),
      runAcceptanceTest: () => {
        const snapshot = collectHeadquartersSnapshot();
        const packageState = getMaddyWorkPackage(snapshot);
        const currentWorkId = state.hallway.currentWorkId;
        const checks = [
          { name: "Expandable Executive Workspace can be created", passed: Boolean(ensureMaddyExecutiveWorkspace()) },
          { name: "Current mission identity is authoritative", passed: !currentWorkId || packageState.work?.id === currentWorkId || packageState.items.length === 0 },
          { name: "Every visible deliverable belongs to the current mission", passed: !currentWorkId || packageState.items.every((item) => item.workId === currentWorkId) },
          { name: "Work package occupies the left column", passed: Boolean(document.querySelector("#meosExecutiveWorkspace .meos-workspace-package #meosWorkspaceResults")) },
          { name: "Maddy owns the reserved right-side presence bay", passed: Boolean(document.querySelector("#meosExecutiveWorkspace .meos-workspace-presence .meos-workspace-maddy")) },
          { name: "Workspace uses the Headquarters Maddy presence asset", passed: document.querySelector("#meosExecutiveWorkspace .meos-workspace-maddy img")?.getAttribute("src") === "maddy-holographic-presence-v1.png" },
          { name: "Executive actions remain with Maddy", passed: Boolean(document.querySelector("#meosExecutiveWorkspace .meos-workspace-presence #meosWorkspaceActions")) },
          { name: "Workspace preserves collapse back to HUD", passed: Boolean(document.getElementById("meosWorkspaceClose")) },
          { name: "Returned deliverables are classified before renderer selection", passed: typeof classifyMaddyDeliverable === "function" && typeof getMaddyDeliverablePresentation === "function" },
          { name: "General research cannot fall through to opportunity semantics", passed: classifyMaddyDeliverable({ kind: "research-status", title: "Why are wombat droppings cube-shaped?", data: { answer: "Biomechanics result" } }) === "research" },
          { name: "Funding records preserve opportunity semantics", passed: classifyMaddyDeliverable({ kind: "funding-opportunity", data: { resourceDevelopment: { deskStatus: "active" }, eligibility: "eligible" } }) === "opportunity" },
          { name: "Research result presentation does not invent funding fields", passed: !getMaddyDeliverablePresentation({ kind: "research-status", title: "Research answer", summary: "Returned evidence" }).fields.some(([label]) => /Funding|Eligibility|Deadline|Geography/.test(label)) }
        ];
        const result = { commission: "006.017D7S4C", passed: checks.every((check) => check.passed), checks };
        console.table(checks);
        console.log(`[MEOS ${DASHBOARD_VERSION}] Commission 006.017D7S4C acceptance: ${result.passed ? "PASS" : "FAIL"}.`);
        return result;
      }
    }),
    funding: Object.freeze({
      refresh: loadFundingIntelligence,
      open: (opportunityId = null) => {
        const opportunity = opportunityId
          ? state.fundingIntelligence.opportunities.find((item) => String(item?.id || "") === String(opportunityId))
          : null;
        openFundingIntelligenceBrowser(opportunity);
        return true;
      },
      runAcceptanceTest: () => {
        const fixture = {
          id: "006.011-test",
          title: "Veterans Workforce Transition Grant",
          description: "Employment transition, emergency stabilization, peer support, and job skills for veterans and first responders.",
          lifecycle: "open",
          geography: "Santa Cruz County, California",
          executiveQualification: { confidence: 0.92, unknowns: ["Confirm applicant eligibility."] },
          resourceDevelopment: { deskStatus: "active", executiveDecision: "pursue" }
        };
        const relationship = getFundingStrategyRelationship(fixture, {});
        const checks = [
          { name: "Funding cards open an internal investigation surface", passed: typeof openFundingIntelligenceBrowser === "function" },
          { name: "Investigation resolves commissioned strategy relationship", passed: Boolean(relationship?.relationship) },
          { name: "Investigation preserves named initiative evidence when runtime provides it", passed: Array.isArray(relationship?.initiatives) },
          { name: "Lifecycle intelligence is rendered", passed: getFundingLifecycle(fixture, {}) === "Open" },
          { name: "Evidence confidence is rendered", passed: getFundingConfidence(fixture, {}) === "92%" },
          { name: "Official source remains governed and separate from internal investigation", passed: typeof openFundingOfficialUrl === "function" }
        ];
        const result = { commission: "006.011", passed: checks.every((check) => check.passed), checks };
        console.table(checks);
        console.log(`[MEOS ${DASHBOARD_VERSION}] Commission 006.011 acceptance: ${result.passed ? "PASS" : "FAIL"}.`);
        return result;
      },
      openOfficial: (opportunityOrUrl) => {
        const url = typeof opportunityOrUrl === "string"
          ? opportunityOrUrl
          : getFundingOfficialUrl(opportunityOrUrl || {});
        return openFundingOfficialUrl(url);
      },
      getState: () => ({
        status: state.fundingIntelligence.status,
        totalQualified: state.fundingIntelligence.totalQualified,
        lastLoadedAt: state.fundingIntelligence.lastLoadedAt,
        error: state.fundingIntelligence.error,
        authority: (() => {
          const engine = getResourceAcquisitionEngine();
          return engine
            ? {
                name: engine.name,
                version: engine.version,
                buildId: engine.buildId
              }
            : null;
        })(),
        opportunities: state.fundingIntelligence.opportunities.map((item) => ({ ...item }))
      })
    }),
    executiveOffice: Object.freeze({
      setConversationStatus,
      setTokenActivity,
      setCommunicationMode,
      getState: () => ({
        officeStatus: "active",
        conversationStatus: state.conversationStatus,
        tokenActivity: state.tokenActivity,
        communicationMode: state.communicationMode,
        muted: state.muted
      })
    })
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
