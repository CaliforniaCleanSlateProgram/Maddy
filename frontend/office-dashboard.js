/**
 * Maddy Executive Operations System (MEOS)
 * Modular Executive Dashboard Shell
 *
 * Version: 0.3.0
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

  const DASHBOARD_VERSION = "0.3.0";
  const ROOT_ID = "meosExecutiveDashboard";
  const STYLE_ID = "meosExecutiveDashboardStyles";
  const STORAGE_KEY = "meos.dashboard.build.v0.3.0";

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
      title: "Integrate Maddy into the dashboard command bar",
      status: "active"
    },
    {
      id: "cost-awareness",
      title: "Connect Maddy's live cost and token status",
      status: "pending"
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
    paidSessionActive: false
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
            <h2 class="meos-widget-title">Grant Intelligence</h2>
            <button class="meos-widget-link" type="button">View All</button>
          </div>
          <ul class="meos-list">
            <li><span></span><span><strong>Reentry Support Services Expansion</strong><br><small class="meos-muted">$250,000 · Foundation for Change</small><br><small style="color:var(--meos-green);">Match: 95%</small></span><span class="meos-priority high">Highly Recommended</span></li>
            <li><span></span><span><strong>Workforce Development Initiative</strong><br><small class="meos-muted">$100,000 · State Community Fund</small><br><small style="color:var(--meos-green);">Match: 88%</small></span><span class="meos-priority high">Recommended</span></li>
            <li><span></span><span><strong>Youth Justice Prevention Program</strong><br><small class="meos-muted">$75,000 · Justice Impact Fund</small><br><small style="color:var(--meos-green);">Match: 82%</small></span><span class="meos-priority high">Recommended</span></li>
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

  function createDashboardShell() {
    let root = document.getElementById(ROOT_ID);

    if (root) {
      return root;
    }

    injectStyles();

    root = document.createElement("section");
    root.id = ROOT_ID;

    root.innerHTML = `
      <div class="meos-dashboard-shell">
        <div class="meos-dashboard-topline">
          <div class="meos-dashboard-heading">
            <h1 id="meosGreeting">Good Morning, Executive Director.</h1>
            <p>I'm Up. Here's what's important today.</p>
          </div>
          <button id="meosImUpButton" class="meos-up-button" type="button">⌁ &nbsp; I’m Up</button>
        </div>

        <section id="meosWidgetGrid" class="meos-widget-grid" aria-label="MEOS Executive Dashboard"></section>

        <section class="meos-maddy-bar" aria-label="Maddy Executive Command Bar">
          <div class="meos-maddy-avatar" aria-hidden="true">M</div>

          <div class="meos-maddy-command">
            <strong>
              I’m Up.
              <span id="meosCostStatus" class="meos-cost-status">
                <span class="meos-cost-dot"></span>
                FREE MODE
              </span>
            </strong>
            <span class="meos-muted">How can I help you move the mission forward today?</span>
            <div class="meos-maddy-input-row">
              <input id="meosMaddyInput" class="meos-maddy-input" type="text" placeholder="Ask Maddy anything..." autocomplete="off">
              <button id="meosMaddySend" class="meos-action-button" type="button" aria-label="Send message to Maddy">➤</button>
              <button id="meosMaddyVoice" class="meos-action-button" type="button" aria-label="Start intentional Maddy voice session">◉</button>
            </div>
          </div>

          <div class="meos-maddy-actions">
            <button class="meos-action-button" type="button" data-meos-action="board-packet">Create Board Packet</button>
            <button class="meos-action-button" type="button" data-meos-action="find-grants">Find Grant Opportunities</button>
            <button class="meos-action-button" type="button" data-meos-action="report">Generate Report</button>
            <button class="meos-action-button" type="button" data-meos-action="meeting">Schedule Meeting</button>
            <button class="meos-action-button" type="button" data-meos-action="email">Draft Email</button>
            <button class="meos-action-button" type="button" data-meos-action="tools">More Tools</button>
          </div>
        </section>

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
    const existingTemporaryOffice = document.getElementById("executive-office");

    if (existingTemporaryOffice) {
      existingTemporaryOffice.hidden = true;
    }

    mainContent.appendChild(root);
    bindDashboardEvents();
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

  function bindDashboardEvents() {
    document.getElementById("meosImUpButton")?.addEventListener("click", () => {
      document.getElementById("meosMaddyInput")?.focus();
    });

    document.getElementById("meosMaddySend")?.addEventListener("click", submitMaddyRequest);

    document.getElementById("meosMaddyInput")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        submitMaddyRequest();
      }
    });

    document.getElementById("meosMaddyVoice")?.addEventListener("click", () => {
      dispatchMEOS("meos:maddy-voice-requested", {
        intentional: true,
        costMode: state.costMode
      });
    });

    document.querySelectorAll("[data-meos-action]").forEach((button) => {
      button.addEventListener("click", () => {
        dispatchMEOS("meos:quick-action", {
          action: button.dataset.meosAction
        });
      });
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

    console.info(
      `[MEOS ${DASHBOARD_VERSION}] Modular Executive Dashboard initialized.`
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
    })
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
