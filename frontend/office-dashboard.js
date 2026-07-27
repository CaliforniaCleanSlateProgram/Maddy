/**
 * Maddy Executive Operations System
 * Executive Office Dashboard
 *
 * Version: 0.1.6
 *
 * Creates the shared dashboard view used by Maddy
 * and every specialized executive office.
 */

(() => {
  "use strict";

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
          <strong>Foundation Active</strong>
        </article>

        <article class="office-panel">
          <span class="office-panel-label">Current Activity</span>
          <strong>Standing By</strong>
        </article>

        <article class="office-panel office-panel-wide">
          <span class="office-panel-label">Executive Workspace</span>
          <p>
            Tasks, briefings, records, approvals, and office intelligence
            will appear here in future MEOS missions.
          </p>
        </article>
                <article class="office-panel office-panel-wide office-review-panel">
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

    <div class="recommendation-value">
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

    const closeButton =
      document.getElementById("closeOfficeDashboard");

    closeButton?.addEventListener("click", () => {
      hideOfficeDashboard();
    });

    return dashboard;
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

    const name =
      document.getElementById("officeDashboardName");

    const title =
      document.getElementById("officeDashboardTitle");

    const office =
      document.getElementById("officeDashboardOffice");

    const reportsTo =
      document.getElementById("officeDashboardReportsTo");

    const responsibility =
      document.getElementById(
        "officeDashboardResponsibility"
      );

    if (name) {
      name.textContent = member.name;
    }

    if (title) {
      title.textContent =
        member.title || "Executive Cabinet Member";
    }

    if (office) {
      office.textContent =
        member.office || "Office of Executive Operations";
    }

    if (reportsTo) {
      reportsTo.textContent =
        member.id === "maddy"
          ? "Executive Director"
          : "Maddy";
    }

    if (responsibility) {
      responsibility.textContent =
        member.responsibility ||
        member.role ||
        "Executive coordination and organizational oversight.";
    }

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
    show: showOfficeDashboard,
    hide: hideOfficeDashboard
  });

  console.info(
    "[MEOS 0.1.6] Executive Office Dashboard initialized."
  );
})();
