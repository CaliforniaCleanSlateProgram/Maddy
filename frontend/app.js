const DASHBOARD_COMPLETION = 20;

const DIGITAL_PHYSIOLOGY_SCRIPTS = Object.freeze([
  Object.freeze({ id: "maddy-digital-physiology-core", src: "maddy-digital-physiology.js" }),
  Object.freeze({ id: "maddy-digital-physiology-sensors", src: "maddy-digital-physiology-sensors.js" }),
  Object.freeze({ id: "maddy-digital-physiology-neuromorphic", src: "maddy-digital-physiology-neuromorphic.js" })
]);

function loadMaddyRuntimeScript({ id, src }) {
  if (document.getElementById(id)) {
    return Promise.resolve({ id, src, reused: true });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = false;
    script.dataset.meosRole = "digital-physiology";
    script.addEventListener("load", () => resolve({ id, src, reused: false }), { once: true });
    script.addEventListener("error", () => reject(new Error(`Unable to load ${src}`)), { once: true });
    (document.head || document.body || document.documentElement).appendChild(script);
  });
}

async function initializeMaddyDigitalPhysiology() {
  try {
    for (const descriptor of DIGITAL_PHYSIOLOGY_SCRIPTS) {
      await loadMaddyRuntimeScript(descriptor);
    }

    const physiology = window.MaddyDigitalPhysiology;
    const sensors = window.MaddyDigitalPhysiologySensors;
    const neuromorphic = window.MaddyDigitalPhysiologyNeuromorphicBridge;
    if (!physiology || !sensors || !neuromorphic) {
      throw new Error("Digital Physiology loaded without exposing its expected runtime contracts.");
    }

    console.info(
      `[MEOS] Digital Physiology available. ${physiology.name} v${physiology.version}; ${sensors.name} v${sensors.version}; ${neuromorphic.name} v${neuromorphic.version}. Observation-only sensing; automatic sampling is off; physiology cannot authorize cognition or action.`
    );

    return {
      success: true,
      physiology: physiology.getStatus?.() || null,
      sensors: sensors.getStatus?.() || null,
      neuromorphic: neuromorphic.getStatus?.() || null
    };
  } catch (error) {
    console.warn(
      "[MEOS] Digital Physiology did not load. Existing Maddy runtime remains unchanged.",
      error
    );
    return { success: false, error: error?.message || String(error) };
  }
}

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
  initializeMaddyDigitalPhysiology();
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

    link.addEventListener("click", (event) => {
  event.preventDefault();

  document
    .querySelectorAll(".sidebar nav a")
    .forEach((item) => {
      item.classList.remove("active");
    });

  link.classList.add("active");

  if (
    window.MEOSOfficeDashboard &&
    typeof window.MEOSOfficeDashboard.show === "function"
  ) {
    window.MEOSOfficeDashboard.show(member);
  } else {
    console.error(
      "Executive Office Dashboard is not available."
    );
  }

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
