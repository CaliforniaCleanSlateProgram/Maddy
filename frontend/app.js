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
  initializeExecutiveCabinet();
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
    track.setAttribute(
      "aria-valuenow",
      String(DASHBOARD_COMPLETION)
    );
  }
}

function registerDashboardBlocks() {
  document.querySelectorAll("[data-block]").forEach((block) => {
    const number = Number(block.dataset.block);
    const title = BLOCKS[number] || "Dashboard Block";

    block.setAttribute(
      "aria-label",
      `Block ${number}: ${title}`
    );
  });
}

function activateSidebarNavigation() {
  const navigationLinks =
    document.querySelectorAll(".sidebar nav a");

  navigationLinks.forEach((link) => {
    link.addEventListener("click", () => {
      navigationLinks.forEach((item) => {
        item.classList.remove("active");
      });

      link.classList.add("active");

      console.log(
        `Selected navigation area: ${link.textContent.trim()}`
      );
    });
  });
}

function initializeExecutiveCabinet() {
  const toggle = document.getElementById("cabinetToggle");
  const menu = document.getElementById("cabinetMenu");
  const arrow = document.getElementById("cabinetArrow");

  if (!toggle || !menu) {
    console.warn(
      "Executive Cabinet controls were not found."
    );
    return;
  }

  if (!window.MEOS) {
    console.error(
      "MEOS cabinet data was not loaded."
    );
    return;
  }

  const cabinet = window.MEOS.getCabinet();

  const cabinetMembers = [
    cabinet.maddy,
    ...cabinet.offices
  ];

  menu.innerHTML = "";

  cabinetMembers.forEach((member) => {
    const link = document.createElement("a");

    link.href = `#office-${member.id}`;
    link.className = "cabinet-member";
    link.textContent = member.name;
    link.dataset.officeId = member.id;

    link.addEventListener("click", () => {
      document
        .querySelectorAll(".sidebar nav a")
        .forEach((item) => {
          item.classList.remove("active");
        });

      link.classList.add("active");

      console.log(
        `Selected executive office: ${member.name}`
      );
    });

    menu.appendChild(link);
  });

  toggle.addEventListener("click", () => {
    const isOpen =
      toggle.getAttribute("aria-expanded") === "true";

    toggle.setAttribute(
      "aria-expanded",
      String(!isOpen)
    );

    menu.hidden = isOpen;

    if (arrow) {
      arrow.textContent = isOpen ? "▸" : "▾";
    }
  });

  console.info(
    `Executive Cabinet loaded with ${cabinetMembers.length} members.`
  );
}
