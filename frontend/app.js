const DASHBOARD_COMPLETION = 10;

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
  const percent = document.getElementById("progressPercent");
  const fill = document.getElementById("progressFill");
  const track = document.querySelector('[role="progressbar"]');

  percent.textContent = `${DASHBOARD_COMPLETION}%`;
  fill.style.width = `${DASHBOARD_COMPLETION}%`;
  track.setAttribute("aria-valuenow", String(DASHBOARD_COMPLETION));

  document.querySelectorAll("[data-block]").forEach((block) => {
    const number = Number(block.dataset.block);
    block.setAttribute("aria-label", `Block ${number}: ${BLOCKS[number]}`);
  });

  console.table(BLOCKS);
});
