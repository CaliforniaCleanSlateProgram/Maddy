const DASHBOARD_COMPLETION = 20;

const BLOCKS = Object.freeze({
  1: "Today at a Glance",
  2: "Mission Pulse",
  3: "Executive Priorities",
  4: "Executive Briefing",
  5: "Upcoming Schedule",
  6: "Grant Intelligence",
  7: "Risk & Alert Center",
  8: "Executive Journal",
  9: "Tasks Due",
  10: "Mission Impact",
  11: "Ask Maddy"
});

document.addEventListener("DOMContentLoaded", () => {
  updateProgress();
  registerDashboardBlocks();
  activateSidebarNavigation();
});

function updateProgress() {
  const percent = document.getElementById("progressPercent");
  const fill = document.getElementById("progressFill");
  const track = document.querySelector('[role="progressbar"]');

  if (percent) {
    percent.textContent = `${DASHBOARD_COMPLETION}%`;
  }

  if (fill) {
    fill.style.width = `${DASHBOARD_COMPLETION}%`;
  }

  if (track) {
    track.setAttribute("aria-valuenow", String(DASHBOARD_COMPLETION));
  }
}

function registerDashboardBlocks() {
  document.querySelectorAll("[data-block]").forEach((block) => {
    const number = Number(block.dataset.block);
    const title = BLOCKS[number] || "Dashboard Block";

    block.setAttribute("aria-label", `Block ${number}: ${title}`);
  });
}

function activateSidebarNavigation() {
  const navigationLinks = document.querySelectorAll(".sidebar nav a");

  navigationLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();

      navigationLinks.forEach((item) => {
        item.classList.remove("active");
      });

      link.classList.add("active");

      console.log(`Selected navigation area: ${link.textContent.trim()}`);
    });
  });
}
