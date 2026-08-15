/**
 * Maddy Executive Operations System
 * Executive Office Standard
 *
 * Version: 0.5.0
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

    const SYSTEM_VERSION = "0.5.0";

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


    /*
     * Commission 006.022A — Lean Executive Cabinet / Tokenomics
     *
     * Maddy is the conversational executive relationship. Executive offices are
     * operational functions: durable responsibility, records, tasks, tools and
     * accountability. They do not receive an always-on conversational AI loop.
     * Paid cognition is invoked only when work actually requires it.
     */
    const OFFICE_EXECUTION_POLICY = Object.freeze({
        conversational: false,
        defaultAttentionState: "idle",
        wakeOn: Object.freeze([
            "assigned-work",
            "scheduled-obligation",
            "meaningful-state-change",
            "explicit-refresh",
            "maddy-delegation"
        ]),
        localFirst: true,
        paidProviderPolicy: "only-when-work-requires-it",
        continuousPaidMonitoring: false,
        accountabilityRequired: true
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



    const OFFICE_IMPLEMENTATION_PROFILES = Object.freeze({
        archie: Object.freeze({
            progress: 58,
            stage: "commissioned-local",
            owns: [
                "Financial Position",
                "Income & Expenses",
                "Budgets & Obligations",
                "Reserve & Deployable Capital",
                "Financial Records & Recall",
                "MEOS Tokenomics",
                "ROI & Capital Allocation"
            ],
            liveSystems: ["GrantOffice", "MEOSFinance"],
            nextMilestone: "Connect governed receipt ingestion and approved monthly accounting export/sync."
        }),
        atlas: Object.freeze({
            progress: 82,
            stage: "live-partial",
            owns: ["Research", "Opportunity Discovery", "External Intelligence"],
            liveSystems: ["MEOSIntelligenceEngine", "MEOSExecutiveSearchEngine", "MEOSWebsiteIntelligence"],
            nextMilestone: "Expand live local, philanthropic, family-foundation, and corporate prospecting coverage."
        }),
        grant: Object.freeze({
            progress: 94,
            stage: "live-partial",
            owns: ["Resource Acquisition Desk", "Applications", "Portal Execution", "Award Tracking"],
            liveSystems: ["GrantOffice", "ExecutiveResourceAcquisitionEngine", "GrantPortalExecutionAdapter", "SubmittableExecutionAdapter"],
            nextMilestone: "Verify one real authenticated application from discovery through external submission and receipt."
        }),
        justice: Object.freeze({
            progress: 48,
            stage: "partial",
            owns: ["Risk & Alert Center", "Compliance Reviews", "Governance Escalation"],
            liveSystems: ["MEOSExecutiveEvidenceIntegrity", "MEOSExecutiveDecision"],
            nextMilestone: "Create durable compliance obligations, deadlines, corrective actions, and evidence records."
        }),
        forge: Object.freeze({
            progress: 72,
            stage: "live-partial",
            owns: ["Tasks", "Missions", "Workflows", "Office Activity"],
            liveSystems: ["MEOSExecutiveWorkflow", "MEOSExecutiveAutomation", "MEOSExecutiveMonitoring", "MEOSMissionDispatcher"],
            nextMilestone: "Move browser-only workflow state into the durable server and verify unattended execution."
        }),
        harmony: Object.freeze({
            progress: 28,
            stage: "planned",
            owns: ["Community Relations", "Partners", "Donors", "Stakeholder Engagement"],
            liveSystems: [],
            nextMilestone: "Commission relationship intelligence, contact history, follow-up, and engagement workflows."
        }),
        echo: Object.freeze({
            progress: 22,
            stage: "planned",
            owns: ["Communications", "Social Media", "Campaigns", "Public Messaging"],
            liveSystems: ["MEOSExecutiveAutomation"],
            nextMilestone: "Connect governed social publishing, comment engagement, campaigns, and performance learning."
        }),
        sage: Object.freeze({
            progress: 16,
            stage: "planned",
            owns: ["Human Resources", "Volunteer Onboarding", "Training", "Role Management"],
            liveSystems: [],
            nextMilestone: "Commission people records, onboarding, training, role assignments, and volunteer operations."
        }),
        ledger: Object.freeze({
            progress: 88,
            stage: "live-partial",
            owns: ["Executive Journal", "Documents", "Institutional Memory", "Decision History"],
            liveSystems: ["MEOSKnowledgeEngine", "MEOSKnowledgeMemory", "MEOSDocumentIngestion", "MEOSDocumentClassifier", "MEOSExecutiveRecall"],
            nextMilestone: "Complete durable organization-wide records and cross-office evidence retrieval."
        }),
        compass: Object.freeze({
            progress: 84,
            stage: "live-partial",
            owns: ["Mission Pulse", "Executive Priorities", "Completion", "Strategic Reporting"],
            liveSystems: ["CCSPLongTermStrategy", "MEOSExecutivePlanning", "MEOSExecutiveDecision", "MEOSExecutiveLearning"],
            nextMilestone: "Connect live KPIs, outcomes, financial impact, and strategic portfolio performance."
        }),
        nova: Object.freeze({
            progress: 86,
            stage: "live-partial",
            owns: ["System Health", "Providers", "Integrations", "Technical Reliability"],
            liveSystems: ["MEOSProviderManager", "MEOSExecutiveBrain", "MEOSExecutiveRouter", "MEOSWebsiteKnowledgeIntegration"],
            nextMilestone: "Complete authentication, tenant isolation, durable database migration, and production observability."
        })
    });

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
            organizationalClass: "executive-office",
            cabinetVisible: true,
            executionPolicy: OFFICE_EXECUTION_POLICY,

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

            implementation: OFFICE_IMPLEMENTATION_PROFILES[id] || Object.freeze({
                progress: 0,
                stage: "planned",
                owns: [],
                liveSystems: [],
                nextMilestone: "Define and commission this office."
            }),

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

    const legacyOfficeRoster = [
        createExecutiveOffice({
            id: "archie",
            name: "Archie",
            title: "Chief Financial Officer",
            office: "Office of Finance",
            responsibility:
                "Protect, account for, deploy, and grow organizational capital. Own financial truth, budgets, income, expenses, obligations, reserves, financial records, MEOS economic stewardship, ROI, and evidence-backed capital allocation.",
            successMetrics: [
                "Financial record integrity",
                "Cash and obligation visibility",
                "Budget accuracy",
                "Reserve coverage",
                "Realized return on deployed capital",
                "MEOS outcome per dollar",
                "Waste and duplicate spend prevented"
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


    const CABINET_OFFICE_IDS = Object.freeze([
        "archie",   // Finance
        "grant",    // Grant Development
        "justice",  // Compliance
        "forge",    // Operations
        "harmony",  // Community Relations
        "echo",     // Communications
        "sage"      // Human Resources
    ]);

    const CAPABILITY_RESTRUCTURE = Object.freeze({
        atlas: Object.freeze({
            id: "research-intelligence",
            name: "Research & Intelligence",
            inheritedFrom: "atlas",
            responsibility: "Shared research, opportunity discovery, external intelligence, and regulatory research available to Maddy and every operating office.",
            primarySteward: "maddy",
            availableTo: Object.freeze(["maddy", "archie", "grant", "justice", "forge", "harmony", "echo", "sage"]),
            executionPolicy: OFFICE_EXECUTION_POLICY
        }),
        ledger: Object.freeze({
            id: "records-memory",
            name: "Records, Recall & Institutional Memory",
            inheritedFrom: "ledger",
            responsibility: "Organization-wide document records, evidence, decision history, retrieval, recall, and institutional memory shared by every office.",
            primarySteward: "maddy",
            availableTo: Object.freeze(["maddy", "archie", "grant", "justice", "forge", "harmony", "echo", "sage"]),
            executionPolicy: OFFICE_EXECUTION_POLICY
        }),
        compass: Object.freeze({
            id: "strategy-analytics",
            name: "Strategy & Analytics",
            inheritedFrom: "compass",
            responsibility: "Shared strategic priorities, KPI interpretation, mission alignment, portfolio reasoning, and executive reporting coordinated by Maddy.",
            primarySteward: "maddy",
            availableTo: Object.freeze(["maddy", "archie", "grant", "justice", "forge", "harmony", "echo", "sage"]),
            executionPolicy: OFFICE_EXECUTION_POLICY
        }),
        nova: Object.freeze({
            id: "meos-platform",
            name: "MEOS Platform & Reliability",
            inheritedFrom: "nova",
            responsibility: "Platform architecture, integrations, provider health, reliability, production security, and technical observability. This is infrastructure, not a customer-facing executive office.",
            primarySteward: "meos-core",
            availableTo: Object.freeze(["maddy"]),
            executionPolicy: OFFICE_EXECUTION_POLICY
        })
    });

    const executiveOffices = legacyOfficeRoster.filter((office) =>
        CABINET_OFFICE_IDS.includes(office.id)
    );

    const retiredOfficeCompatibility = Object.freeze(
        legacyOfficeRoster
            .filter((office) => !CABINET_OFFICE_IDS.includes(office.id))
            .reduce((registry, office) => {
                const capability = CAPABILITY_RESTRUCTURE[office.id];
                registry[office.id] = Object.freeze({
                    ...office,
                    organizationalClass: "shared-capability",
                    cabinetVisible: false,
                    retiredAsOffice: true,
                    capabilityId: capability?.id || office.id,
                    responsibility: capability?.responsibility || office.responsibility,
                    executionPolicy: OFFICE_EXECUTION_POLICY
                });
                return registry;
            }, {})
    );

    const institutionalCapabilities = Object.freeze(
        Object.values(CAPABILITY_RESTRUCTURE)
    );



    function getOfficeReference(officeId) {
        return executiveOffices.find(
            (office) => office.id === officeId
        ) || retiredOfficeCompatibility[officeId] || null;
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


    /*
     * Commission 006.022B — Archie Finance + ROI / Tokenomics
     *
     * Finance is deterministic and local-first. Arithmetic, status, aggregation,
     * health, ROI and recall do not invoke an AI provider. Maddy may use paid
     * cognition only when judgment adds value; Archie owns the economic record.
     */
    const FINANCE_STORAGE_KEY = "meos.finance.archie.v1";

    const FINANCIAL_EVIDENCE_STATE = Object.freeze({
        REPORTED: "reported",
        RECORDED: "recorded",
        SUPPORTED: "supported",
        RECONCILED: "reconciled"
    });

    const FINANCIAL_VALUE_STATE = Object.freeze({
        LANDED: "landed",
        EXPECTED: "expected",
        COMMITTED: "committed",
        ESTIMATED: "estimated",
        REALIZED: "realized"
    });

    const CAPITAL_PURPOSE = Object.freeze({
        OPERATING: "operating",
        PROTECTIVE: "protective",
        INVESTMENT: "investment",
        WASTE: "waste",
        UNKNOWN: "unknown"
    });

    function money(value) {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? Math.round((numeric + Number.EPSILON) * 100) / 100 : 0;
    }

    function sumMoney(items, selector) {
        return money(items.reduce((total, item) => total + money(selector(item)), 0));
    }

    function loadFinanceState() {
        const empty = {
            version: 1,
            currency: "USD",
            transactions: [],
            obligations: [],
            budgets: [],
            capitalEvents: [],
            meosSpend: [],
            periods: [],
            updatedAt: null
        };
        try {
            const raw = window.localStorage?.getItem(FINANCE_STORAGE_KEY);
            if (!raw) return empty;
            const parsed = JSON.parse(raw);
            return { ...empty, ...parsed };
        } catch (error) {
            console.warn("[MEOS Finance] Local recovery failed; starting from empty local ledger.", error);
            return empty;
        }
    }

    const financeState = loadFinanceState();

    function persistFinanceState() {
        financeState.updatedAt = createTimestamp();
        try {
            window.localStorage?.setItem(FINANCE_STORAGE_KEY, JSON.stringify(financeState));
            return true;
        } catch (error) {
            console.warn("[MEOS Finance] Local persistence failed.", error);
            return false;
        }
    }

    function addFinancialTransaction(input = {}) {
        const amount = money(input.amount);
        if (!(amount > 0)) throw new Error("Finance transaction requires a positive amount.");
        const direction = input.direction === "in" ? "in" : input.direction === "out" ? "out" : null;
        if (!direction) throw new Error('Finance transaction direction must be "in" or "out".');

        const transaction = {
            id: input.id || createId("fin"),
            direction,
            amount,
            date: input.date || createTimestamp(),
            merchant: String(input.merchant || input.source || "").trim(),
            category: String(input.category || "uncategorized").trim(),
            purpose: String(input.purpose || "").trim(),
            project: String(input.project || "").trim(),
            paymentMethod: String(input.paymentMethod || "").trim(),
            evidenceState: Object.values(FINANCIAL_EVIDENCE_STATE).includes(input.evidenceState)
                ? input.evidenceState
                : FINANCIAL_EVIDENCE_STATE.REPORTED,
            valueState: Object.values(FINANCIAL_VALUE_STATE).includes(input.valueState)
                ? input.valueState
                : (direction === "in" ? FINANCIAL_VALUE_STATE.LANDED : FINANCIAL_VALUE_STATE.REALIZED),
            restricted: Boolean(input.restricted),
            evidenceRefs: Array.isArray(input.evidenceRefs) ? [...input.evidenceRefs] : [],
            notes: String(input.notes || "").trim(),
            createdAt: createTimestamp()
        };
        financeState.transactions.push(transaction);
        persistFinanceState();
        return clone(transaction);
    }

    function addObligation(input = {}) {
        const amount = money(input.amount);
        if (!(amount > 0)) throw new Error("Finance obligation requires a positive amount.");
        const obligation = {
            id: input.id || createId("obl"),
            name: String(input.name || input.vendor || "Financial obligation").trim(),
            amount,
            dueAt: input.dueAt || null,
            recurring: Boolean(input.recurring),
            autopay: Boolean(input.autopay),
            reserved: input.reserved !== false,
            status: String(input.status || "open"),
            category: String(input.category || "operating").trim(),
            createdAt: createTimestamp()
        };
        financeState.obligations.push(obligation);
        persistFinanceState();
        return clone(obligation);
    }

    function addBudget(input = {}) {
        const limit = money(input.limit);
        if (!(limit >= 0)) throw new Error("Finance budget requires a non-negative limit.");
        const budget = {
            id: input.id || createId("budget"),
            name: String(input.name || "Budget").trim(),
            category: String(input.category || "").trim(),
            project: String(input.project || "").trim(),
            limit,
            reserveTarget: money(input.reserveTarget),
            startsAt: input.startsAt || null,
            endsAt: input.endsAt || null,
            createdAt: createTimestamp()
        };
        financeState.budgets.push(budget);
        persistFinanceState();
        return clone(budget);
    }

    function recordCapitalEvent(input = {}) {
        const deployed = money(input.deployed);
        const realizedReturn = money(input.realizedReturn);
        const pipelineValue = money(input.pipelineValue);
        const event = {
            id: input.id || createId("roi"),
            missionId: input.missionId || null,
            customerId: input.customerId || null,
            officeId: input.officeId || null,
            description: String(input.description || "Capital deployment").trim(),
            purpose: Object.values(CAPITAL_PURPOSE).includes(input.purpose) ? input.purpose : CAPITAL_PURPOSE.UNKNOWN,
            deployed,
            realizedReturn,
            pipelineValue,
            laborHoursAvoided: Math.max(0, Number(input.laborHoursAvoided) || 0),
            estimatedLaborValue: money(input.estimatedLaborValue),
            expectedValueAtDecision: money(input.expectedValueAtDecision),
            outcomeState: realizedReturn > 0 ? "realized" : pipelineValue > 0 ? "pipeline" : "pending",
            createdAt: createTimestamp()
        };
        financeState.capitalEvents.push(event);
        persistFinanceState();
        return clone(event);
    }

    function recordMEOSSpend(input = {}) {
        const cost = money(input.cost);
        if (!(cost >= 0)) throw new Error("MEOS spend requires a non-negative cost.");
        const record = {
            id: input.id || createId("meos-cost"),
            provider: String(input.provider || "unknown").trim(),
            capability: String(input.capability || "").trim(),
            missionId: input.missionId || null,
            customerId: input.customerId || null,
            officeId: input.officeId || null,
            cost,
            avoidedCost: money(input.avoidedCost),
            outcomeId: input.outcomeId || null,
            reason: String(input.reason || "").trim(),
            createdAt: createTimestamp()
        };
        financeState.meosSpend.push(record);
        persistFinanceState();
        return clone(record);
    }

    function getFinancePosition() {
        const tx = financeState.transactions;
        const landed = sumMoney(tx.filter(x => x.direction === "in" && x.valueState === FINANCIAL_VALUE_STATE.LANDED), x => x.amount);
        const expected = sumMoney(tx.filter(x => x.direction === "in" && x.valueState === FINANCIAL_VALUE_STATE.EXPECTED), x => x.amount);
        const spent = sumMoney(tx.filter(x => x.direction === "out"), x => x.amount);
        const openObligations = financeState.obligations.filter(x => !["paid", "cancelled"].includes(x.status));
        const committed = sumMoney(openObligations, x => x.amount);
        const reservedForObligations = sumMoney(openObligations.filter(x => x.reserved), x => x.amount);
        const cashPosition = money(landed - spent);
        const availableAfterCommitments = money(cashPosition - reservedForObligations);

        return {
            landed,
            expected,
            spent,
            committed,
            reservedForObligations,
            cashPosition,
            availableAfterCommitments,
            transactionCount: tx.length,
            openObligationCount: openObligations.length,
            unreconciledCount: tx.filter(x => x.evidenceState !== FINANCIAL_EVIDENCE_STATE.RECONCILED).length,
            unsupportedExpenseCount: tx.filter(x => x.direction === "out" && ![FINANCIAL_EVIDENCE_STATE.SUPPORTED, FINANCIAL_EVIDENCE_STATE.RECONCILED].includes(x.evidenceState)).length,
            updatedAt: financeState.updatedAt
        };
    }

    function getBudgetPerformance() {
        return financeState.budgets.map(budget => {
            const actual = sumMoney(
                financeState.transactions.filter(tx =>
                    tx.direction === "out" &&
                    (!budget.category || tx.category === budget.category) &&
                    (!budget.project || tx.project === budget.project)
                ),
                tx => tx.amount
            );
            const remaining = money(budget.limit - actual);
            const variancePct = budget.limit > 0 ? Math.round(((actual - budget.limit) / budget.limit) * 1000) / 10 : 0;
            return { ...clone(budget), actual, remaining, variancePct, overBudget: actual > budget.limit };
        });
    }

    function getROI() {
        const deployed = sumMoney(financeState.capitalEvents, x => x.deployed);
        const realizedReturn = sumMoney(financeState.capitalEvents, x => x.realizedReturn);
        const pipelineValue = sumMoney(financeState.capitalEvents, x => x.pipelineValue);
        const meosCost = sumMoney(financeState.meosSpend, x => x.cost);
        const avoidedCost = sumMoney(financeState.meosSpend, x => x.avoidedCost);
        const laborHoursAvoided = financeState.capitalEvents.reduce((sum, x) => sum + (Number(x.laborHoursAvoided) || 0), 0);
        const estimatedLaborValue = sumMoney(financeState.capitalEvents, x => x.estimatedLaborValue);
        const realizedROI = deployed > 0 ? Math.round(((realizedReturn - deployed) / deployed) * 1000) / 10 : null;
        const realizedMultiple = deployed > 0 ? Math.round((realizedReturn / deployed) * 100) / 100 : null;
        return {
            capitalDeployed: deployed,
            realizedReturn,
            pipelineValue,
            realizedROI,
            realizedMultiple,
            meosOperatingCost: meosCost,
            providerSpendAvoided: avoidedCost,
            laborHoursAvoided: Math.round(laborHoursAvoided * 10) / 10,
            estimatedLaborValue
        };
    }

    function getFinancialHealth(options = {}) {
        const position = getFinancePosition();
        const monthlyEssentialSpend = Math.max(0, money(options.monthlyEssentialSpend));
        const reserveTargetMonths = Math.max(0, Number(options.reserveTargetMonths) || 3);
        const reserveTarget = money(monthlyEssentialSpend * reserveTargetMonths);
        const reserveCoverage = reserveTarget > 0 ? Math.max(0, position.availableAfterCommitments / reserveTarget) : null;

        const budgets = getBudgetPerformance();
        const budgetScore = budgets.length
            ? Math.max(0, 100 - Math.round(budgets.reduce((sum, b) => sum + Math.max(0, b.variancePct), 0) / budgets.length))
            : 100;
        const documentationScore = position.transactionCount
            ? Math.round(((position.transactionCount - position.unsupportedExpenseCount) / position.transactionCount) * 100)
            : 100;
        const obligationScore = position.cashPosition >= position.reservedForObligations ? 100 : 0;
        const reserveScore = reserveCoverage === null ? 100 : Math.min(100, Math.round(reserveCoverage * 100));
        const score = clampScore(
            obligationScore * 0.35 +
            reserveScore * 0.30 +
            budgetScore * 0.20 +
            documentationScore * 0.15
        );

        let label = "building";
        if (position.cashPosition < 0) label = "critical";
        else if (score >= 85) label = "strong";
        else if (score >= 70) label = "healthy";
        else if (score >= 50) label = "watch";
        else if (position.cashPosition > 0) label = "strained";

        return {
            score,
            label,
            obligationCoverage: position.cashPosition >= position.reservedForObligations,
            reserveTarget,
            reserveCoverageMonths: monthlyEssentialSpend > 0
                ? Math.round((Math.max(0, position.availableAfterCommitments) / monthlyEssentialSpend) * 10) / 10
                : null,
            components: {
                obligations: obligationScore,
                reserve: reserveScore,
                budget: budgetScore,
                documentation: documentationScore
            },
            position
        };
    }

    function recallFinance(query) {
        const terms = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
        if (!terms.length) return [];
        const scoreText = text => {
            const haystack = String(text || "").toLowerCase();
            return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
        };
        return financeState.transactions
            .map(tx => ({
                transaction: tx,
                score: scoreText([
                    tx.merchant, tx.category, tx.purpose, tx.project,
                    tx.paymentMethod, tx.notes, tx.amount, tx.date
                ].join(" "))
            }))
            .filter(result => result.score > 0)
            .sort((a, b) => b.score - a.score || String(b.transaction.date).localeCompare(String(a.transaction.date)))
            .slice(0, 25)
            .map(result => clone(result.transaction));
    }

    function getFinanceOfficeCard(options = {}) {
        const health = getFinancialHealth(options);
        const roi = getROI();
        return {
            officeId: "archie",
            office: "Office of Finance",
            headline: "Financial Position",
            financialHealth: health,
            moneyIn: {
                landed: health.position.landed,
                expected: health.position.expected
            },
            moneyOut: {
                spent: health.position.spent,
                transactionCount: health.position.transactionCount
            },
            committed: {
                amount: health.position.committed,
                reserved: health.position.reservedForObligations,
                obligations: health.position.openObligationCount
            },
            available: health.position.availableAfterCommitments,
            needsAttention: {
                unsupportedExpenses: health.position.unsupportedExpenseCount,
                unreconciledTransactions: health.position.unreconciledCount,
                overBudget: getBudgetPerformance().filter(x => x.overBudget).length
            },
            tokenomics: roi,
            lastVerifiedAt: health.position.updatedAt,
            refreshPolicy: "local-first-on-demand"
        };
    }

    function exportFinancePeriod({ startsAt = null, endsAt = null } = {}) {
        const within = value => {
            const t = new Date(value).getTime();
            if (!Number.isFinite(t)) return false;
            if (startsAt && t < new Date(startsAt).getTime()) return false;
            if (endsAt && t > new Date(endsAt).getTime()) return false;
            return true;
        };
        return clone({
            generatedAt: createTimestamp(),
            currency: financeState.currency,
            transactions: financeState.transactions.filter(tx => within(tx.date)),
            obligations: financeState.obligations,
            budgets: getBudgetPerformance(),
            position: getFinancePosition(),
            roi: getROI()
        });
    }

    const financeOffice = Object.freeze({
        version: "1.0.0",
        commission: "006.022B",
        policy: Object.freeze({
            conversational: false,
            arithmeticUsesPaidAI: false,
            localFirst: true,
            continuousPaidMonitoring: false,
            principle: "Every dollar leaves with a job; Archie optimizes ROI, not minimum spend.",
            economicGate: "Spend more when evidence-supported expected return justifies it; stop when marginal value no longer justifies cost."
        }),
        evidenceStates: FINANCIAL_EVIDENCE_STATE,
        valueStates: FINANCIAL_VALUE_STATE,
        capitalPurposes: CAPITAL_PURPOSE,
        addTransaction: addFinancialTransaction,
        addObligation,
        addBudget,
        recordCapitalEvent,
        recordMEOSSpend,
        getPosition: getFinancePosition,
        getBudgetPerformance,
        getROI,
        getFinancialHealth,
        recall: recallFinance,
        getOfficeCard: getFinanceOfficeCard,
        exportPeriod: exportFinancePeriod,
        getState() { return clone(financeState); }
    });

    const cabinet = {
        version: SYSTEM_VERSION,
        executiveDirector,
        maddy,
        offices: executiveOffices,
        capabilities: institutionalCapabilities,
        restructuring: Object.freeze({
            commission: "006.022B",
            principle: "Maddy is conversational; offices are operational. Archie owns financial truth, Tokenomics, and ROI.",
            retiredOfficeIds: Object.freeze(Object.keys(retiredOfficeCompatibility)),
            cabinetOfficeIds: CABINET_OFFICE_IDS
        })
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

        finance: financeOffice,

        getOffice(officeId) {
            return getOfficeReference(officeId);
        },

        getCabinetOffices() {
            return clone(executiveOffices);
        },

        getInstitutionalCapabilities() {
            return clone(institutionalCapabilities);
        },

        getOrganizationalStructure() {
            return clone({
                principle: "Maddy is conversational; offices are operational. Archie owns financial truth, Tokenomics, and ROI.",
                offices: executiveOffices.map((office) => ({
                    id: office.id, name: office.name, title: office.title, office: office.office,
                    responsibility: office.responsibility, executionPolicy: office.executionPolicy
                })),
                capabilities: institutionalCapabilities
            });
        },

        getOfficeScorecard,

        getOfficeImplementation(officeId) {
            const office = requireOffice(officeId);
            return clone(office.implementation);
        },

        getImplementationPortfolio() {
            return clone(executiveOffices.map((office) => ({
                id: office.id,
                name: office.name,
                office: office.office,
                ...office.implementation
            })));
        },

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
        `[MEOS ${window.MEOS.version}] Lean Executive Cabinet initialized — 7 offices + shared capabilities.`,
        window.MEOS.getCabinet()
    );
})();
