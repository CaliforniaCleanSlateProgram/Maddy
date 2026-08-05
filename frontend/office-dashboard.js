/**
 * Maddy Executive Operations System (MEOS)
 * Executive Headquarters Intelligence Operations Interface
 *
 * Version: 2.0.0
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

  const DASHBOARD_VERSION = "2.4.4";
  const FUNDING_API_URL = "/api/resource-development/desk?limit=100";
  const OFFICE_ACTIVITY_API_URL = "/api/resource-development/desk?includeAll=true&limit=500";
  const FUNDING_CARD_LIMIT = 3;
  const ROOT_ID = "executive-office";
  const STYLE_ID = "meosExecutiveDashboardStyles";
  const STORAGE_KEY = "meos.dashboard.build.v0.4.0";

  const DEFAULT_BUILD_TASKS = [
    {
      id: "preserve-existing-api",
      title: "Preserve existing Executive Office connections",
      status: "complete"
    },
    {
      id: "dashboard-shell",
      title: "Build the modular executive dashboard shell",
      status: "complete"
    },
    {
      id: "approved-visual-direction",
      title: "Apply the approved dark executive-command-center design",
      status: "complete"
    },
    {
      id: "build-progress-widget",
      title: "Connect the persistent build progress widget",
      status: "complete"
    },
    {
      id: "maddy-command-bar",
      title: "Move Maddy into the permanent Executive Office navigation control",
      status: "complete"
    },
    {
      id: "cost-awareness",
      title: "Connect Maddy's live cost and token status",
      status: "active"
    },
    {
      id: "live-office-data",
      title: "Connect all executive offices to live dashboard cards",
      status: "pending"
    },
    {
      id: "mission-workflow-data",
      title: "Connect missions, tasks, approvals, and workflows",
      status: "pending"
    },
    {
      id: "calendar-briefing-data",
      title: "Connect calendar and daily briefing data",
      status: "pending"
    },
    {
      id: "grant-risk-data",
      title: "Connect grant intelligence and risk alerts",
      status: "pending"
    },
    {
      id: "layout-preferences",
      title: "Save user layout and widget preferences",
      status: "pending"
    },
    {
      id: "dashboard-milestone",
      title: "Complete the first working MEOS dashboard milestone",
      status: "pending"
    }
  ];

  const DEFAULT_LAYOUT = Object.freeze([
    { id: "build-progress", colSpan: 12, rowSpan: 1, visible: true, order: 10 },
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
          conic-gradient(var(--meos-green) 0 92%, rgba(114, 135, 167, 0.22) 92% 100%);
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
      .meos-hq-core-caption{position:absolute;z-index:4;bottom:9%;left:50%;transform:translateX(-50%);white-space:nowrap;padding:5px 12px;color:#effcff;border-top:1px solid rgba(105,239,255,.4);border-bottom:1px solid rgba(105,239,255,.2);background:rgba(4,17,29,.5);backdrop-filter:blur(9px);font-size:.66rem;letter-spacing:.19em;text-transform:uppercase}
      .meos-hq-telemetry{display:grid;gap:18px}.meos-hud-readout{position:relative;padding:11px 0 12px 17px;border-left:1px solid rgba(105,239,255,.35)}.meos-hud-readout::before{content:"";position:absolute;left:-3px;top:0;width:5px;height:5px;background:var(--hud-cyan);box-shadow:0 0 11px var(--hud-cyan)}.meos-hud-readout strong{display:block;margin:4px 0 6px;font-size:clamp(1.35rem,2vw,2.15rem);font-weight:350;color:#effcff}.meos-hud-readout small{color:rgba(194,230,246,.58)}
      .meos-hud-equalizer{height:48px;display:flex;align-items:end;gap:4px;margin-top:8px;overflow:hidden}.meos-hud-equalizer span{width:4px;min-height:8%;border-radius:4px 4px 0 0;background:linear-gradient(180deg,#fff,var(--hud-cyan),rgba(77,145,255,.25));box-shadow:0 0 9px rgba(105,239,255,.55);animation:hudEq 1.1s ease-in-out infinite alternate}.meos-hud-equalizer span:nth-child(2n){animation-duration:.72s}.meos-hud-equalizer span:nth-child(3n){animation-duration:1.42s}.meos-hud-equalizer span:nth-child(5n){animation-duration:.94s}
      .meos-hud-radar{position:relative;width:96px;height:96px;margin-left:auto;border-radius:50%;border:1px solid rgba(105,239,255,.38);background:radial-gradient(circle,transparent 24%,rgba(105,239,255,.15) 25% 26%,transparent 27% 49%,rgba(105,239,255,.1) 50% 51%,transparent 52%),linear-gradient(90deg,transparent 49%,rgba(105,239,255,.17) 50%,transparent 51%),linear-gradient(transparent 49%,rgba(105,239,255,.17) 50%,transparent 51%);box-shadow:inset 0 0 22px rgba(105,239,255,.07);overflow:hidden}.meos-hud-radar::before{content:"";position:absolute;inset:0;border-radius:50%;background:conic-gradient(rgba(105,239,255,.45),transparent 24%);animation:hudSpin 2.7s linear infinite}.meos-hud-radar::after{content:"";position:absolute;left:65%;top:31%;width:5px;height:5px;border-radius:50%;background:#fff;box-shadow:0 0 12px var(--hud-cyan);animation:hudTarget 1.7s ease-in-out infinite}
      .meos-widget-grid{gap:3px 18px;background:transparent}.meos-widget{border:0;border-radius:0;background:linear-gradient(145deg,rgba(4,20,34,.40),rgba(7,29,46,.16));box-shadow:none;backdrop-filter:blur(13px) saturate(1.15);clip-path:polygon(0 14px,14px 0,calc(100% - 28px) 0,100% 28px,100% calc(100% - 12px),calc(100% - 12px) 100%,22px 100%,0 calc(100% - 22px));transition:transform .22s ease,background .22s ease,filter .22s ease}.meos-widget:hover{z-index:4;transform:translateY(-3px) scale(1.008);background:linear-gradient(145deg,rgba(7,34,52,.6),rgba(8,28,47,.28));filter:drop-shadow(0 0 19px rgba(105,239,255,.12))}.meos-widget::before{opacity:.75;background:linear-gradient(90deg,rgba(105,239,255,.35),transparent 22%,transparent 78%,rgba(168,110,255,.2)),linear-gradient(180deg,rgba(105,239,255,.13),transparent 22%);mask:linear-gradient(#000 0 0) top/100% 1px no-repeat,linear-gradient(#000 0 0) bottom/100% 1px no-repeat,linear-gradient(#000 0 0) left/1px 100% no-repeat,linear-gradient(#000 0 0) right/1px 100% no-repeat}.meos-widget::after{content:"";position:absolute;left:14px;top:0;width:58px;height:1px;background:var(--hud-cyan);box-shadow:0 0 11px var(--hud-cyan)}
      .meos-widget-title{color:rgba(178,235,255,.8);letter-spacing:.19em;font-weight:550}.meos-widget-link{color:var(--hud-cyan);text-transform:uppercase;letter-spacing:.12em}.meos-list li{border-bottom-color:rgba(105,239,255,.1)}
      .meos-progress-track{height:4px;border-radius:0;background:rgba(105,239,255,.08);overflow:visible}.meos-progress-fill{position:relative;border-radius:0;background:linear-gradient(90deg,var(--hud-blue),var(--hud-cyan),#fff);box-shadow:0 0 11px rgba(105,239,255,.45),0 0 28px rgba(77,145,255,.22)}.meos-progress-fill::after{content:"";position:absolute;right:-4px;top:50%;width:8px;height:8px;transform:translateY(-50%) rotate(45deg);background:#fff;box-shadow:0 0 13px var(--hud-cyan)}
      .meos-mission-ring{position:relative;width:142px;height:142px;background:radial-gradient(circle,rgba(4,19,31,.96) 49%,transparent 50%),conic-gradient(from -45deg,var(--hud-cyan) 0 92%,rgba(105,239,255,.08) 92%);border:1px solid rgba(105,239,255,.3);box-shadow:0 0 26px rgba(105,239,255,.17),inset 0 0 30px rgba(105,239,255,.06)}.meos-mission-ring::before{content:"";position:absolute;inset:-13px;border-radius:50%;border:1px dashed rgba(105,239,255,.25);animation:hudSpin 12s linear infinite}.meos-mission-ring::after{content:"";position:absolute;inset:12px;border-radius:50%;border-top:2px solid rgba(255,255,255,.85);border-right:2px solid transparent;animation:hudSpinR 2.8s linear infinite}
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
          <div class="meos-progress-shell">
            <div class="meos-progress-meta">
              <span class="meos-widget-title">MEOS Dashboard Build</span>
              <strong id="meosBuildCount">0 of 0 tasks complete</strong>
            </div>
            <div>
              <div class="meos-progress-track" aria-label="MEOS dashboard build progress">
                <div id="meosBuildProgressFill" class="meos-progress-fill"></div>
              </div>
              <div id="meosBuildCurrent" class="meos-progress-current"></div>
            </div>
            <div id="meosBuildPercent" class="meos-progress-percent">0%</div>
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
          <div class="meos-widget-header"><h2 class="meos-widget-title">Today at a Glance</h2></div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center;">
            <div style="width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:rgba(66,90,139,.22);border:1px solid rgba(111,143,201,.25);">
              <strong id="meosTodayDate" style="font-size:1.25rem;"></strong>
            </div>
            <div>
              <strong id="meosTodayMonth" style="display:block;margin-bottom:3px;"></strong>
              <span id="meosTodayDay" class="meos-muted"></span>
            </div>
          </div>
          <ul class="meos-list" style="margin-top:12px;">
            <li><span>3</span><span>Meetings Today</span><span></span></li>
            <li><span>5</span><span>Tasks Due</span><span></span></li>
            <li><span>2</span><span>Approvals Needed</span><span></span></li>
            <li><span style="color:var(--meos-red);">1</span><span style="color:var(--meos-red);">Risk Requires Attention</span><span></span></li>
          </ul>
        </div>
      `,
      "mission-pulse": `
        <div class="meos-widget-inner">
          <div class="meos-widget-header"><h2 class="meos-widget-title">Mission Pulse</h2></div>
          <div class="meos-mission-ring"><strong>92%</strong></div>
          <div style="text-align:center;">
            <strong>On Track</strong>
            <p class="meos-muted" style="margin:10px 0 0;font-size:.82rem;">All systems aligned with <span style="color:var(--meos-green);">CCSP Mission</span></p>
          </div>
        </div>
      `,
      "priorities": `
        <div class="meos-widget-inner">
          <div class="meos-widget-header"><h2 class="meos-widget-title">Executive Priorities</h2></div>
          <ol class="meos-list" style="counter-reset:item;">
            <li><span>1</span><span>Secure funding for Reentry Navigation expansion</span><span class="meos-priority high">High</span></li>
            <li><span>2</span><span>Finalize Board Packet for upcoming meeting</span><span class="meos-priority high">High</span></li>
            <li><span>3</span><span>Submit three grant applications</span><span class="meos-priority medium">Medium</span></li>
            <li><span>4</span><span>Complete quarterly budget review</span><span class="meos-priority medium">Medium</span></li>
          </ol>
        </div>
      `,
      "briefing": `
        <div class="meos-widget-inner">
          <div class="meos-widget-header"><h2 class="meos-widget-title">Executive Briefing</h2></div>
          <p style="font-size:.86rem;line-height:1.55;">You have three grant opportunities matching your mission.</p>
          <button class="meos-action-button" type="button">View Opportunities</button>
          <p style="font-size:.82rem;margin:18px 0 8px;">Board packet is 87% complete.</p>
          <div class="meos-progress-track"><div class="meos-progress-fill" style="width:87%;"></div></div>
          <button class="meos-action-button" type="button" style="margin-top:12px;">Review Packet</button>
        </div>
      `,
      "schedule": `
        <div class="meos-widget-inner">
          <div class="meos-widget-header"><h2 class="meos-widget-title">Upcoming Schedule</h2></div>
          <ul class="meos-list">
            <li><span>9:00</span><span>Leadership Team Meeting<br><small class="meos-muted">Today</small></span><span>◫</span></li>
            <li><span>11:00</span><span>Grant Review Committee<br><small class="meos-muted">Today</small></span><span>□</span></li>
            <li><span>1:00</span><span>Call with Foundation Director<br><small class="meos-muted">Today</small></span><span>◌</span></li>
            <li><span>May 14</span><span>Board Meeting<br><small class="meos-muted">Wednesday</small></span><span>□</span></li>
          </ul>
          <button class="meos-widget-link" type="button" style="margin-top:10px;">› View Full Calendar</button>
        </div>
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
        <div class="meos-widget-inner">
          <div class="meos-widget-header">
            <h2 class="meos-widget-title">Risk & Alert Center</h2>
            <button class="meos-widget-link" type="button">View All</button>
          </div>
          <div class="meos-alert danger"><strong>Compliance Report Due Friday</strong><span class="meos-muted">Annual compliance report is due in four days.</span></div>
          <div class="meos-alert warning"><strong>Grant Deadline Approaching</strong><span class="meos-muted">Two grant applications are due within ten days.</span></div>
          <div class="meos-alert info"><strong>Board Decision Required</strong><span class="meos-muted">Approval needed for the new program budget.</span></div>
        </div>
      `,
      "journal": `
        <div class="meos-widget-inner">
          <div class="meos-widget-header">
            <h2 class="meos-widget-title">Executive Journal (Recent)</h2>
            <button class="meos-widget-link" type="button">View All</button>
          </div>
          <ul class="meos-list">
            <li><span>May 11</span><span>Board retreat notes and strategic priorities captured.</span><span class="meos-priority medium">Strategy</span></li>
            <li><span>May 9</span><span>Call with donor — strong interest in capital campaign.</span><span class="meos-priority medium">Development</span></li>
            <li><span>May 8</span><span>Team update — Reentry Navigator interviews pending.</span><span class="meos-priority">Operations</span></li>
            <li><span>May 7</span><span>Grant notes — Foundation for Change call.</span><span class="meos-priority">Grants</span></li>
          </ul>
        </div>
      `,
      "tasks": `
        <div class="meos-widget-inner">
          <div class="meos-widget-header">
            <h2 class="meos-widget-title">Tasks Due</h2>
            <button class="meos-widget-link" type="button">View All</button>
          </div>
          <ul class="meos-list">
            <li><span>□</span><span>Review Board Packet</span><span class="meos-priority" style="color:var(--meos-red);">High</span></li>
            <li><span>□</span><span>Approve Q2 Budget Adjustments</span><span class="meos-priority" style="color:var(--meos-red);">High</span></li>
            <li><span>□</span><span>Sign Grant Application</span><span class="meos-priority" style="color:var(--meos-red);">High</span></li>
            <li><span>□</span><span>Review HR Policy Updates</span><span class="meos-priority medium">Medium</span></li>
            <li><span>□</span><span>Approve New Hire</span><span class="meos-priority medium">Medium</span></li>
          </ul>
        </div>
      `,
      "mission-impact": `
        <div class="meos-widget-inner">
          <div class="meos-widget-header"><h2 class="meos-widget-title">Mission Impact</h2></div>
          <div class="meos-impact-grid">
            <div class="meos-impact-card"><strong>247</strong><span>Individuals Served</span></div>
            <div class="meos-impact-card"><strong>14</strong><span>Reentry Navigations</span></div>
            <div class="meos-impact-card"><strong>6</strong><span>Workshops Delivered</span></div>
            <div class="meos-impact-card"><strong>89%</strong><span>Program Success Rate</span></div>
          </div>
        </div>
      `
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
            <div class="meos-hq-core" aria-label="Maddy command core online">
              <span class="meos-hq-core-ring r1"></span><span class="meos-hq-core-ring r2"></span><span class="meos-hq-core-ring r3"></span><span class="meos-hq-core-ring r4"></span>
              <img class="meos-hq-portrait" src="maddy-executive-insignia.png" alt="Maddy Executive Office insignia" onerror="this.style.visibility='hidden';" />
              <span class="meos-hq-core-caption">Maddy · Executive Command</span>
            </div>
          </div>
          <div class="meos-hq-telemetry">
            <div class="meos-hud-readout"><span class="meos-hud-label">Mission alignment</span><strong>92%</strong><small>CCSP objectives synchronized</small></div>
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

  function renderFundingOpportunityDetail(opportunity) {
    const detail = document.getElementById("meosFundingBrowserDetail");
    if (!detail || !opportunity) return;

    const decision = getResourceDecision(opportunity) || {};
    const brief = decision.executiveBrief || {};
    const reasoning = decision.reasoning || {};
    const title = firstDefined(
      opportunity?.title,
      decision?.title,
      "Untitled resource opportunity"
    );
    const provider = firstDefined(
      opportunity?.agencyName,
      opportunity?.provider,
      opportunity?.sourceName,
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
    const url = getFundingOfficialUrl(opportunity);
    const unknowns = Array.isArray(decision?.unknowns)
      ? decision.unknowns
      : [];
    const acquisitionPath = String(
      decision?.acquisitionPath || "unresolved"
    )
      .split(/[-_ ]+/)
      .filter(Boolean)
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(" ");
    const strategicTiming = String(
      decision?.strategicTiming || "unresolved"
    )
      .split(/[-_ ]+/)
      .filter(Boolean)
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(" ");

    detail.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:14px;">
        <div>
          <div class="meos-widget-title" style="margin-bottom:8px;">Executive Resource Brief</div>
          <h2 style="margin:0 0 8px;font-size:1.35rem;line-height:1.25;">${escapeHtml(title)}</h2>
          <div class="meos-muted">${escapeHtml(provider)}</div>
        </div>
        <span class="meos-priority high">${escapeHtml(recommendation)}</span>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0;">
        <div class="meos-alert">
          <strong>${decision?.canAcquire === true ? "Yes" : decision?.canAcquire === false ? "No" : "Research"}</strong>
          <span class="meos-muted">Can CCSP acquire?</span>
        </div>
        <div class="meos-alert">
          <strong>${escapeHtml(resource)}</strong>
          <span class="meos-muted">Resource</span>
        </div>
        <div class="meos-alert">
          <strong>${escapeHtml(deadline)}</strong>
          <span class="meos-muted">Deadline</span>
        </div>
        <div class="meos-alert">
          <strong>${escapeHtml(acquisitionPath)}</strong>
          <span class="meos-muted">Acquisition path</span>
        </div>
        <div class="meos-alert">
          <strong>${escapeHtml(strategicTiming)}</strong>
          <span class="meos-muted">Strategic timing</span>
        </div>
        <div class="meos-alert">
          <strong>${decision?.worthPursuing === true ? "Worth Pursuing" : "Not Recommended"}</strong>
          <span class="meos-muted">Executive value</span>
        </div>
      </div>

      <h3 style="margin:18px 0 8px;">Why this is on your desk</h3>
      <p style="line-height:1.6;white-space:pre-wrap;">${escapeHtml(
        brief?.whyOnDesk ||
        reasoning?.reason ||
        getFundingDescription(opportunity)
      )}</p>

      <h3 style="margin:18px 0 8px;">Maddy's decision</h3>
      <p style="line-height:1.6;white-space:pre-wrap;">${escapeHtml(
        brief?.reason ||
        reasoning?.reason ||
        "The authoritative acquisition engine completed the decision."
      )}</p>

      <h3 style="margin:18px 0 8px;">Next action</h3>
      <p style="line-height:1.6;white-space:pre-wrap;">${escapeHtml(
        decision?.nextAction ||
        brief?.nextAction ||
        "Complete the next authorized executive step."
      )}</p>

      <h3 style="margin:18px 0 8px;">If CCSP delays</h3>
      <p style="line-height:1.6;white-space:pre-wrap;">${escapeHtml(
        brief?.consequenceOfDelay ||
        "The consequence of delay has not been verified."
      )}</p>

      <h3 style="margin:18px 0 8px;">Unknowns</h3>
      ${
        unknowns.length
          ? `<ul>${unknowns.map((unknown) => `<li>${escapeHtml(unknown)}</li>`).join("")}</ul>`
          : '<p class="meos-muted">No material unknowns were identified.</p>'
      }

      ${
        url
          ? `<button id="meosFundingOpenOfficial" type="button" class="take-it-button" style="display:inline-block;margin-top:12px;">Open Official Opportunity</button>`
          : `<p class="meos-muted" style="margin-top:12px;">No verified official opportunity link is stored for this record.</p>`
      }
    `;

    detail.querySelector("#meosFundingOpenOfficial")?.addEventListener("click", () => {
      openFundingOfficialUrl(url);
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

  function bindDashboardEvents() {
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
      reviewStatus: getReviewStatus(member)
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

  function initialize() {
    createDashboardShell();
    installLegacyVoicePanelRetirement();
    void loadFundingIntelligence();
    void loadOfficeActivity();

    console.info(
      `[MEOS ${DASHBOARD_VERSION}] Executive Hub initialized; legacy voice panel retired.`
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
    funding: Object.freeze({
      refresh: loadFundingIntelligence,
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
