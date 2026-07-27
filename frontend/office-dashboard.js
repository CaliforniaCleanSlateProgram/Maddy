/** 
 * Maddy Executive Operations System
 * Executive Office Dashboard Integration
 *
 * Version: 0.2.1
 *
 * Connects the shared Executive Office Dashboard to:
 * - Executive Office Standard
 * - Live office health and success
 * - Operational status
 * - Current work or idle state
 * - Workload
 * - Recommendations
 * - Last activity
 *
 * Preserves the existing dashboard layout and Executive Review card.
 */

(() => {
  "use strict";

  const DASHBOARD_VERSION = "0.2.1";

  function createOfficeDashboard() {
    let dashboard = document.getElementById("officeDashboard");

    if (dashboard) {
      return dashboard;
    }

    dashboard = document.createElement("section");
    dashboard.id = "officeDashboard";
    dashboard.className = "office-dashboard";
    dashboard.hidden = true;

    dashboard.innerHTML = `
      <div class="office-dashboard-header">
        <div>
          <p class="office-dashboard-eyebrow">
            Executive Cabinet Office
          </p>

          <h2 id="officeDashboardName">
            Executive Office
          </h2>

          <p id="officeDashboardTitle">
            Office information
          </p>
        </div>

        <button
          id="closeOfficeDashboard"
          class="office-dashboard-close"
          type="button"
          aria-label="Close executive office"
        >
          ×
        </button>
      </div>

      <div class="office-dashboard-grid">
        <article class="office-panel">
          <span class="office-panel-label">Office</span>
          <strong id="officeDashboardOffice">
            Not selected
          </strong>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Reports To</span>
          <strong id="officeDashboardReportsTo">
            Maddy
          </strong>
        </article>

        <article class="office-panel office-panel-wide">
          <span class="office-panel-label">Core Responsibility</span>
          <p id="officeDashboardResponsibility">
            Select an executive office to view its responsibility.
          </p>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Office Status</span>
          <strong id="officeDashboardStatus">
            Operational
          </strong>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Current Activity</span>
          <strong id="officeDashboardCurrentActivity">
            Idle — Awaiting Assignment
          </strong>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Office Health</span>
          <strong id="officeDashboardHealth">
            100%
          </strong>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Office Success</span>
          <strong id="officeDashboardSuccess">
            0%
          </strong>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Current Load</span>
          <strong id="officeDashboardCurrentLoad">
            0
          </strong>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Pending Tasks</span>
          <strong id="officeDashboardPendingTasks">
            0
          </strong>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Recommendations</span>
          <strong id="officeDashboardRecommendations">
            0
          </strong>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Last Activity</span>
          <strong id="officeDashboardLastActivity">
            No activity recorded
          </strong>
        </article>

        <article class="office-panel office-panel-wide">
          <span class="office-panel-label">Executive Workspace</span>

          <p id="officeDashboardWorkspace">
            Tasks, briefings, records, approvals, and office intelligence
            will appear here as MEOS capabilities come online.
          </p>
        </article>

        <article
          class="office-panel office-panel-wide office-review-panel"
        >
          <span class="office-panel-label review-title">
            EXECUTIVE REVIEW
          </span>

          <div class="office-review-status">
            <div class="maddy-status">
              <div class="status-label">MADDY</div>
              <div class="status-value">I'm Up.</div>
            </div>

            <div class="office-review-recommendation">
              <div class="recommendation-label">
                EXECUTIVE RECOMMENDATION
              </div>

              <div
                id="officeDashboardReviewStatus"
                class="recommendation-value"
              >
                Ready for Executive Approval
              </div>

              <div class="recommendation-source">
                Reviewed by Maddy
              </div>
            </div>
          </div>

          <div class="office-review-actions">
            <button
              id="requestOfficeRevisions"
              class="request-revision-button"
              type="button"
            >
              Request Revisions
            </button>

            <button
              id="takeItButton"
              class="take-it-button"
              type="button"
            >
              TAKE IT
            </button>
          </div>
        </article>
      </div>
    `;

    const mainContent =
      document.querySelector(".main-content") ||
      document.querySelector(".workspace") ||
      document.querySelector("main");

    if (!mainContent) {
      console.error(
        "MEOS could not find the main dashboard workspace."
      );

      return null;
    }

    mainContent.appendChild(dashboard);

    const closeButton = document.getElementById(
      "closeOfficeDashboard"
    );

    closeButton?.addEventListener("click", () => {
      hideOfficeDashboard();
    });

    return dashboard;
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
      .map((word) => {
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
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

    return (
      member.tasks.find((task) => task.status === "active") ||
      null
    );
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
      return ![
        "approved",
        "rejected"
      ].includes(recommendation.status);
    }).length;
  }

  function getReviewStatus(member) {
    const recommendationCount = getRecommendationCount(member);

    if (recommendationCount > 0) {
      return `${recommendationCount} Recommendation${
        recommendationCount === 1 ? "" : "s"
      } Awaiting Review`;
    }

    return "No Recommendation Awaiting Review";
  }

  function getOfficeViewModel(member) {
    const operationalState = member.operationalState || {};
    const workload = member.workload || {};

    return {
      name: member.name || "Executive Office",
      title:
        member.title || "Executive Cabinet Member",
      office:
        member.office || "Office of Executive Operations",
      reportsTo:
        member.id === "maddy"
          ? "Executive Director"
          : "Maddy",
      responsibility:
        member.responsibility ||
        member.role ||
        "Executive coordination and organizational oversight.",
      status: formatStatus(
        operationalState.status || "operational"
      ),
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
    const view = getOfficeViewModel(member);

    setText("officeDashboardName", view.name);
    setText("officeDashboardTitle", view.title);
    setText("officeDashboardOffice", view.office);
    setText("officeDashboardReportsTo", view.reportsTo);

    setText(
      "officeDashboardResponsibility",
      view.responsibility
    );

    setText("officeDashboardStatus", view.status);

    setText(
      "officeDashboardCurrentActivity",
      view.currentActivity
    );

    setText("officeDashboardHealth", view.health);
    setText("officeDashboardSuccess", view.success);

    setText(
      "officeDashboardCurrentLoad",
      String(view.currentLoad)
    );

    setText(
      "officeDashboardPendingTasks",
      String(view.pendingTasks)
    );

    setText(
      "officeDashboardRecommendations",
      String(view.recommendations)
    );

    setText(
      "officeDashboardLastActivity",
      view.lastActivity
    );

    setText(
      "officeDashboardReviewStatus",
      view.reviewStatus
    );
  }

  function showOfficeDashboard(member) {
    if (!member) {
      console.error(
        "MEOS cannot open an executive office without office data."
      );

      return;
    }

    const dashboard = createOfficeDashboard();

    if (!dashboard) {
      return;
    }

    renderOfficeDashboard(member);

    const executiveOffice =
      document.getElementById("executive-office");

    if (executiveOffice) {
      executiveOffice.hidden = true;
    }

    dashboard.hidden = false;

    dashboard.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    console.info(
      `Executive office opened: ${member.name}`
    );
  }

  function hideOfficeDashboard() {
    const dashboard =
      document.getElementById("officeDashboard");

    const executiveOffice =
      document.getElementById("executive-office");

    if (dashboard) {
      dashboard.hidden = true;
    }

    if (executiveOffice) {
      executiveOffice.hidden = false;
    }

    executiveOffice?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  window.MEOSOfficeDashboard = Object.freeze({
    version: DASHBOARD_VERSION,
    show: showOfficeDashboard,
    hide: hideOfficeDashboard,
    refresh: renderOfficeDashboard
  });

  console.info(
    `[MEOS ${DASHBOARD_VERSION}] Executive Office Dashboard initialized.`
  );
})();
