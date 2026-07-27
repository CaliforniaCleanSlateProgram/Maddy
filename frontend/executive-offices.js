/**
 * Maddy Executive Operations System
 * Executive Office Standard
 *
 * Version: 0.2.0
 *
 * Establishes:
 * - The Executive Director as final human authority
 * - Maddy as Chief Executive Operations Officer
 * - The shared Executive Office Standard
 * - Specialized executive offices
 * - Common task, recommendation, reporting, and history structures
 * - Independent office operational states
 *
 * No AI execution, voice, automation, or Seven Gates processing is active yet.
 */

(() => {
    "use strict";

    const SYSTEM_VERSION = "0.2.0";

    const OFFICE_STATUS = Object.freeze({
        OPERATIONAL: "operational",
        DEGRADED: "degraded",
        MAINTENANCE: "maintenance",
        OFFLINE: "offline"
    });

    const TASK_STATUS = Object.freeze({
        PENDING: "pending",
        ACTIVE: "active",
        BLOCKED: "blocked",
        COMPLETED: "completed",
        CANCELLED: "cancelled"
    });

    const RECOMMENDATION_STATUS = Object.freeze({
        DRAFT: "draft",
        READY_FOR_MADDY: "ready-for-maddy",
        UNDER_REVIEW: "under-review",
        READY_FOR_DIRECTOR: "ready-for-director",
        APPROVED: "approved",
        REJECTED: "rejected",
        RETURNED: "returned"
    });

    const APPROVAL_STATUS = Object.freeze({
        NOT_REQUIRED: "not-required",
        PENDING_MADDY: "pending-maddy",
        PENDING_DIRECTOR: "pending-director",
        APPROVED: "approved",
        REJECTED: "rejected"
    });

    const executiveDirector = Object.freeze({
        id: "executive-director",
        name: "Mandel Coulter",
        title: "Executive Director",
        authority: "final-human-authority"
    });

    const maddy = {
        id: "maddy",
        name: "Maddy",
        title: "Chief Executive Operations Officer",
        reportsTo: executiveDirector.id,
        role:
            "Coordinates the executive offices, evaluates recommendations, balances workloads, and reports organizational activity to the Executive Director.",
        authority: {
            mayCoordinateOffices: true,
            mayDelegateWork: true,
            mayReviewRecommendations: true,
            mayPrepareExecutiveBriefs: true,
            finalAuthority: false,
            finalAuthorityHolder: executiveDirector.id
        },
        operatingState: {
            status: OFFICE_STATUS.OPERATIONAL,
            lastActivityAt: null
        },
        inbox: [],
        executiveBriefs: [],
        activityLog: []
    };

    function createId(prefix) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).slice(2, 8);

        return `${prefix}-${timestamp}-${random}`;
    }

    function createTimestamp() {
        return new Date().toISOString();
    }

    function clampScore(value) {
        const numericValue = Number(value);

        if (!Number.isFinite(numericValue)) {
            return 0;
        }

        return Math.min(100, Math.max(0, Math.round(numericValue)));
    }

    function clone(value) {
        if (typeof structuredClone === "function") {
            return structuredClone(value);
        }

        return JSON.parse(JSON.stringify(value));
    }

    function createExecutiveOffice({
        id,
        name,
        title,
        office,
        responsibility,
        successMetrics = []
    }) {
        if (!id || !name || !title || !office || !responsibility) {
            throw new Error(
                "Executive Office Standard requires id, name, title, office, and responsibility."
            );
        }

        const officeState = {
            id,
            name,
            title,
            office,
            reportsTo: maddy.id,
            responsibility,

            standard: {
                name: "MEOS Executive Office Standard",
                version: SYSTEM_VERSION
            },

            operationalState: {
                status: OFFICE_STATUS.OPERATIONAL,
                health: 100,
                success: 0,
                maintenanceMode: false,
                failureIsolated: true,
                lastHeartbeatAt: null,
                lastActivityAt: null,
                lastError: null
            },

            workload: {
                currentLoad: 0,
                active: 0,
                pending: 0,
                blocked: 0,
                delayed: 0,
                completedToday: 0,
                assisting: []
            },

            tasks: [],

            recommendations: [],

            reports: {
                messagesToMaddy: [],
                executiveBriefItems: []
            },

            approvals: [],

            delegations: {
                received: [],
                assigned: []
            },

            performance: {
                successMetrics: [...successMetrics],
                history: []
            },

            history: {
                activity: [],
                statusChanges: [],
                errors: []
            }
        };

        return officeState;
    }

    const executiveOffices = [
        createExecutiveOffice({
            id: "archie",
            name: "Archie",
            title: "Chief Financial Officer",
            office: "Office of Finance",
            responsibility:
                "Budgeting, financial reporting, cash flow, grant budgets, and expense analysis.",
            successMetrics: [
                "Budget accuracy",
                "Financial reporting quality",
                "Cash flow visibility",
                "Grant budget readiness"
            ]
        }),

        createExecutiveOffice({
            id: "atlas",
            name: "Atlas",
            title: "Director of Research and Intelligence",
            office: "Office of Research and Intelligence",
            responsibility:
                "Research, grant discovery, regulatory monitoring, and opportunity analysis.",
            successMetrics: [
                "Research accuracy",
                "Opportunity relevance",
                "Monitoring coverage",
                "Decision usefulness"
            ]
        }),

        createExecutiveOffice({
            id: "grant",
            name: "Grant",
            title: "Director of Grant Development",
            office: "Office of Grant Development",
            responsibility:
                "Grant writing, application management, deadline tracking, and submission preparation.",
            successMetrics: [
                "Application quality",
                "Deadline performance",
                "Submission readiness",
                "Funding success"
            ]
        }),

        createExecutiveOffice({
            id: "justice",
            name: "Justice",
            title: "Director of Compliance",
            office: "Office of Compliance",
            responsibility:
                "Compliance review, governance monitoring, risk identification, and escalation.",
            successMetrics: [
                "Compliance accuracy",
                "Risk detection",
                "Review timeliness",
                "Issue resolution"
            ]
        }),

        createExecutiveOffice({
            id: "forge",
            name: "Forge",
            title: "Director of Operations",
            office: "Office of Operations",
            responsibility:
                "Project coordination, workflows, procedures, task management, and operational improvement.",
            successMetrics: [
                "Workflow reliability",
                "Task completion",
                "Process improvement",
                "Operational efficiency"
            ]
        }),

        createExecutiveOffice({
            id: "harmony",
            name: "Harmony",
            title: "Director of Community Relations",
            office: "Office of Community Relations",
            responsibility:
                "Partnerships, volunteers, donors, stakeholders, and community engagement.",
            successMetrics: [
                "Partnership growth",
                "Stakeholder engagement",
                "Volunteer participation",
                "Community trust"
            ]
        }),

        createExecutiveOffice({
            id: "echo",
            name: "Echo",
            title: "Director of Communications",
            office: "Office of Communications",
            responsibility:
                "Website content, social media, newsletters, press materials, and organizational messaging.",
            successMetrics: [
                "Message quality",
                "Audience engagement",
                "Campaign performance",
                "Brand consistency"
            ]
        }),

        createExecutiveOffice({
            id: "sage",
            name: "Sage",
            title: "Director of People and Culture",
            office: "Office of Human Resources",
            responsibility:
                "Staff and volunteer onboarding, training, role documentation, and people operations.",
            successMetrics: [
                "Onboarding quality",
                "Training completion",
                "Role clarity",
                "Team support"
            ]
        }),

        createExecutiveOffice({
            id: "ledger",
            name: "Ledger",
            title: "Director of Records and Institutional Memory",
            office: "Office of Records",
            responsibility:
                "Document organization, decision history, records management, and institutional memory.",
            successMetrics: [
                "Record completeness",
                "Retrieval reliability",
                "Documentation quality",
                "Decision traceability"
            ]
        }),

        createExecutiveOffice({
            id: "compass",
            name: "Compass",
            title: "Director of Strategy and Analytics",
            office: "Office of Strategy and Analytics",
            responsibility:
                "Strategic priorities, KPIs, mission alignment, performance analysis, and executive reporting.",
            successMetrics: [
                "Strategic alignment",
                "KPI usefulness",
                "Analysis quality",
                "Executive clarity"
            ]
        }),

        createExecutiveOffice({
            id: "nova",
            name: "Nova",
            title: "Chief Technology Officer",
            office: "Office of Technology",
            responsibility:
                "MEOS architecture, integrations, system reliability, technical documentation, and cybersecurity awareness.",
            successMetrics: [
                "System reliability",
                "Integration stability",
                "Technical documentation",
                "Security awareness"
            ]
        })
    ];

    function getOfficeReference(officeId) {
        return executiveOffices.find(
            (office) => office.id === officeId
        ) || null;
    }

    function requireOffice(officeId) {
        const office = getOfficeReference(officeId);

        if (!office) {
            throw new Error(`Executive office "${officeId}" was not found.`);
        }

        return office;
    }

    function updateWorkload(office) {
        office.workload.active = office.tasks.filter(
            (task) => task.status === TASK_STATUS.ACTIVE
        ).length;

        office.workload.pending = office.tasks.filter(
            (task) => task.status === TASK_STATUS.PENDING
        ).length;

        office.workload.blocked = office.tasks.filter(
            (task) => task.status === TASK_STATUS.BLOCKED
        ).length;

        office.workload.currentLoad =
            office.workload.active +
            office.workload.pending +
            office.workload.blocked;
    }

    function recordOfficeActivity(office, type, message, details = {}) {
        const activity = {
            id: createId("activity"),
            officeId: office.id,
            type,
            message,
            details: clone(details),
            createdAt: createTimestamp()
        };

        office.history.activity.unshift(activity);
        office.operationalState.lastActivityAt = activity.createdAt;

        return activity;
    }

    function createTask(officeId, taskData = {}) {
        const office = requireOffice(officeId);

        const task = {
            id: taskData.id || createId("task"),
            officeId: office.id,
            title: taskData.title || "Untitled Task",
            description: taskData.description || "",
            status: taskData.status || TASK_STATUS.PENDING,
            priority: taskData.priority || "normal",
            assignedBy: taskData.assignedBy || maddy.id,
            owner: office.id,
            approvalStatus:
                taskData.approvalStatus || APPROVAL_STATUS.NOT_REQUIRED,
            dueAt: taskData.dueAt || null,
            createdAt: createTimestamp(),
            updatedAt: createTimestamp(),
            completedAt: null,
            metadata: clone(taskData.metadata || {})
        };

        office.tasks.push(task);
        updateWorkload(office);

        recordOfficeActivity(
            office,
            "task-created",
            `Task created: ${task.title}`,
            { taskId: task.id }
        );

        return clone(task);
    }

    function updateTaskStatus(officeId, taskId, status) {
        const office = requireOffice(officeId);
        const task = office.tasks.find((item) => item.id === taskId);

        if (!task) {
            throw new Error(
                `Task "${taskId}" was not found in office "${officeId}".`
            );
        }

        if (!Object.values(TASK_STATUS).includes(status)) {
            throw new Error(`Invalid task status "${status}".`);
        }

        const previousStatus = task.status;

        task.status = status;
        task.updatedAt = createTimestamp();

        if (
            status === TASK_STATUS.COMPLETED &&
            previousStatus !== TASK_STATUS.COMPLETED
        ) {
            task.completedAt = task.updatedAt;
            office.workload.completedToday += 1;
        }

        updateWorkload(office);

        recordOfficeActivity(
            office,
            "task-status-changed",
            `Task status changed from ${previousStatus} to ${status}.`,
            {
                taskId: task.id,
                previousStatus,
                status
            }
        );

        return clone(task);
    }

    function createRecommendation(officeId, recommendationData = {}) {
        const office = requireOffice(officeId);

        const recommendation = {
            id: recommendationData.id || createId("recommendation"),
            officeId: office.id,
            title:
                recommendationData.title ||
                "Untitled Executive Recommendation",
            summary: recommendationData.summary || "",
            rationale: recommendationData.rationale || "",
            expectedOutcome:
                recommendationData.expectedOutcome || "",
            risk: recommendationData.risk || "",
            priority: recommendationData.priority || "normal",
            status:
                recommendationData.status ||
                RECOMMENDATION_STATUS.DRAFT,
            approvalStatus:
                recommendationData.approvalStatus ||
                APPROVAL_STATUS.PENDING_MADDY,
            createdAt: createTimestamp(),
            updatedAt: createTimestamp(),
            submittedToMaddyAt: null,
            submittedToDirectorAt: null,
            decidedAt: null,
            metadata: clone(recommendationData.metadata || {})
        };

        office.recommendations.push(recommendation);

        recordOfficeActivity(
            office,
            "recommendation-created",
            `Recommendation created: ${recommendation.title}`,
            { recommendationId: recommendation.id }
        );

        return clone(recommendation);
    }

    function submitRecommendationToMaddy(
        officeId,
        recommendationId
    ) {
        const office = requireOffice(officeId);
        const recommendation = office.recommendations.find(
            (item) => item.id === recommendationId
        );

        if (!recommendation) {
            throw new Error(
                `Recommendation "${recommendationId}" was not found in office "${officeId}".`
            );
        }

        recommendation.status =
            RECOMMENDATION_STATUS.READY_FOR_MADDY;
        recommendation.approvalStatus =
            APPROVAL_STATUS.PENDING_MADDY;
        recommendation.submittedToMaddyAt = createTimestamp();
        recommendation.updatedAt =
            recommendation.submittedToMaddyAt;

        const message = {
            id: createId("message"),
            from: office.id,
            to: maddy.id,
            type: "executive-recommendation",
            subject: recommendation.title,
            recommendationId: recommendation.id,
            createdAt: createTimestamp()
        };

        office.reports.messagesToMaddy.unshift(message);
        maddy.inbox.unshift(clone(message));
        maddy.operatingState.lastActivityAt = message.createdAt;

        recordOfficeActivity(
            office,
            "recommendation-submitted",
            `Recommendation submitted to Maddy: ${recommendation.title}`,
            { recommendationId: recommendation.id }
        );

        return clone(recommendation);
    }

    function setOfficeHealth(officeId, health, reason = "") {
        const office = requireOffice(officeId);
        const previousHealth = office.operationalState.health;

        office.operationalState.health = clampScore(health);

        office.performance.history.unshift({
            id: createId("performance"),
            type: "health",
            previousValue: previousHealth,
            value: office.operationalState.health,
            reason,
            createdAt: createTimestamp()
        });

        return clone(office.operationalState);
    }

    function setOfficeSuccess(officeId, success, reason = "") {
        const office = requireOffice(officeId);
        const previousSuccess = office.operationalState.success;

        office.operationalState.success = clampScore(success);

        office.performance.history.unshift({
            id: createId("performance"),
            type: "success",
            previousValue: previousSuccess,
            value: office.operationalState.success,
            reason,
            createdAt: createTimestamp()
        });

        return clone(office.operationalState);
    }

    function setOfficeStatus(officeId, status, reason = "") {
        const office = requireOffice(officeId);

        if (!Object.values(OFFICE_STATUS).includes(status)) {
            throw new Error(`Invalid office status "${status}".`);
        }

        const previousStatus =
            office.operationalState.status;

        office.operationalState.status = status;
        office.operationalState.maintenanceMode =
            status === OFFICE_STATUS.MAINTENANCE;

        office.history.statusChanges.unshift({
            id: createId("status"),
            previousStatus,
            status,
            reason,
            createdAt: createTimestamp()
        });

        recordOfficeActivity(
            office,
            "office-status-changed",
            `Office status changed from ${previousStatus} to ${status}.`,
            { previousStatus, status, reason }
        );

        return clone(office.operationalState);
    }

    function recordOfficeFailure(officeId, error) {
        const office = requireOffice(officeId);

        const failure = {
            id: createId("error"),
            officeId,
            message:
                error instanceof Error
                    ? error.message
                    : String(error),
            createdAt: createTimestamp(),
            isolated: true
        };

        office.operationalState.status =
            OFFICE_STATUS.DEGRADED;
        office.operationalState.lastError = failure;
        office.history.errors.unshift(failure);

        recordOfficeActivity(
            office,
            "office-failure",
            `An isolated office failure was recorded.`,
            failure
        );

        return clone(failure);
    }

    function heartbeat(officeId) {
        const office = requireOffice(officeId);
        const timestamp = createTimestamp();

        office.operationalState.lastHeartbeatAt = timestamp;

        return {
            officeId,
            status: office.operationalState.status,
            heartbeatAt: timestamp
        };
    }

    function getOfficeScorecard(officeId) {
        const office = requireOffice(officeId);

        return clone({
            id: office.id,
            name: office.name,
            office: office.office,
            status: office.operationalState.status,
            health: office.operationalState.health,
            success: office.operationalState.success,
            currentLoad: office.workload.currentLoad,
            tasksCompleted: office.workload.completedToday,
            pending: office.workload.pending,
            delayed: office.workload.delayed,
            assisting: office.workload.assisting,
            lastActivity:
                office.operationalState.lastActivityAt
        });
    }

    const cabinet = {
        version: SYSTEM_VERSION,
        executiveDirector,
        maddy,
        offices: executiveOffices
    };

    window.MEOS = Object.freeze({
        version: cabinet.version,

        constants: Object.freeze({
            OFFICE_STATUS,
            TASK_STATUS,
            RECOMMENDATION_STATUS,
            APPROVAL_STATUS
        }),

        getCabinet() {
            return cabinet;
        },

        getOffice(officeId) {
            return getOfficeReference(officeId);
        },

        getOfficeScorecard,

        createTask,

        updateTaskStatus,

        createRecommendation,

        submitRecommendationToMaddy,

        setOfficeHealth,

        setOfficeSuccess,

        setOfficeStatus,

        recordOfficeFailure,

        heartbeat
    });

    console.info(
        `[MEOS ${window.MEOS.version}] Executive Office Standard initialized.`,
        window.MEOS.getCabinet()
    );
})();
