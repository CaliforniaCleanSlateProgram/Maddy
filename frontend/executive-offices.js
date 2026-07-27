/**
 * Maddy Executive Operations System
 * Executive Cabinet Skeleton
 *
 * Version: 0.1.4
 *
 * Establishes:
 * - The Executive Director
 * - Maddy as Chief Executive Operations Officer
 * - Specialized executive offices
 * - The reporting hierarchy
 *
 * No AI execution or task processing is active yet.
 */

(() => {
    "use strict";

    const executiveDirector = {
        id: "executive-director",
        name: "Mandel Coulter",
        title: "Executive Director",
        authority: "final-human-authority"
    };

    const maddy = {
        id: "maddy",
        name: "Maddy",
        title: "Chief Executive Operations Officer",
        reportsTo: executiveDirector.id,
        role:
            "Coordinates the executive offices and reports organizational activity to the Executive Director."
    };

    const executiveOffices = [
        {
            id: "archie",
            name: "Archie",
            title: "Chief Financial Officer",
            office: "Office of Finance",
            reportsTo: maddy.id,
            responsibility:
                "Budgeting, financial reporting, cash flow, grant budgets, and expense analysis."
        },
        {
            id: "atlas",
            name: "Atlas",
            title: "Director of Research and Intelligence",
            office: "Office of Research and Intelligence",
            reportsTo: maddy.id,
            responsibility:
                "Research, grant discovery, regulatory monitoring, and opportunity analysis."
        },
        {
            id: "grant",
            name: "Grant",
            title: "Director of Grant Development",
            office: "Office of Grant Development",
            reportsTo: maddy.id,
            responsibility:
                "Grant writing, application management, deadline tracking, and submission preparation."
        },
        {
            id: "justice",
            name: "Justice",
            title: "Director of Compliance",
            office: "Office of Compliance",
            reportsTo: maddy.id,
            responsibility:
                "Compliance review, governance monitoring, risk identification, and escalation."
        },
        {
            id: "forge",
            name: "Forge",
            title: "Director of Operations",
            office: "Office of Operations",
            reportsTo: maddy.id,
            responsibility:
                "Project coordination, workflows, procedures, task management, and operational improvement."
        },
        {
            id: "harmony",
            name: "Harmony",
            title: "Director of Community Relations",
            office: "Office of Community Relations",
            reportsTo: maddy.id,
            responsibility:
                "Partnerships, volunteers, donors, stakeholders, and community engagement."
        },
        {
            id: "echo",
            name: "Echo",
            title: "Director of Communications",
            office: "Office of Communications",
            reportsTo: maddy.id,
            responsibility:
                "Website content, social media, newsletters, press materials, and organizational messaging."
        },
        {
            id: "sage",
            name: "Sage",
            title: "Director of People and Culture",
            office: "Office of Human Resources",
            reportsTo: maddy.id,
            responsibility:
                "Staff and volunteer onboarding, training, role documentation, and people operations."
        },
        {
            id: "ledger",
            name: "Ledger",
            title: "Director of Records and Institutional Memory",
            office: "Office of Records",
            reportsTo: maddy.id,
            responsibility:
                "Document organization, decision history, records management, and institutional memory."
        },
        {
            id: "compass",
            name: "Compass",
            title: "Director of Strategy and Analytics",
            office: "Office of Strategy and Analytics",
            reportsTo: maddy.id,
            responsibility:
                "Strategic priorities, KPIs, mission alignment, performance analysis, and executive reporting."
        },
        {
            id: "nova",
            name: "Nova",
            title: "Chief Technology Officer",
            office: "Office of Technology",
            reportsTo: maddy.id,
            responsibility:
                "MEOS architecture, integrations, system reliability, technical documentation, and cybersecurity awareness."
        }
    ];

    const cabinet = {
        version: "0.1.4",
        executiveDirector,
        maddy,
        offices: executiveOffices
    };

    window.MEOS = Object.freeze({
        version: cabinet.version,

        getCabinet() {
            return cabinet;
        },

        getOffice(officeId) {
            return executiveOffices.find(
                (office) => office.id === officeId
            ) || null;
        }
    });

    console.info(
        `[MEOS ${window.MEOS.version}] Executive Cabinet initialized.`,
        window.MEOS.getCabinet()
    );
})();
