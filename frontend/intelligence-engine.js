/*
 * MEOS Intelligence Engine
 * Version: 1.0.0
 *
 * Purpose:
 * Serve as the central intelligence and routing system for MEOS.
 *
 * The Intelligence Engine receives information from organizational
 * sources, classifies it, removes duplicates, determines priority,
 * routes work to executive offices, and prepares coordinated
 * Executive Reviews for Maddy and the Executive Director.
 *
 * This file also provides the document-intake foundation that the
 * future dashboard upload drop box will use.
 *
 * Core Principle:
 * Adapt to the situation. Stay true to the mission.
 */

(function initializeIntelligenceEngine(global) {
    "use strict";

    const IntelligenceEngine = {
        name: "MEOS Intelligence Engine",
        version: "1.0.0",
        status: "online",
        operatingMode: "continuous",

        intelligenceLog: [],
        documentIntake: [],
        officeAssignments: [],
        executiveBriefings: [],
        sourceRegistry: [],
        eventListeners: {},

        configuration: {
            continuousOperations: true,
            duplicateDetectionEnabled: true,
            executiveEscalationEnabled: true,
            documentIntakeEnabled: true,

            maximumUploadSizeBytes: 25 * 1024 * 1024,

            supportedFileExtensions: [
                "pdf",
                "doc",
                "docx",
                "txt",
                "rtf",
                "csv",
                "xls",
                "xlsx",
                "ppt",
                "pptx",
                "jpg",
                "jpeg",
                "png",
                "webp",
                "html",
                "htm",
                "json",
                "xml",
                "zip"
            ],

            restrictedFileExtensions: [
                "exe",
                "msi",
                "bat",
                "cmd",
                "com",
                "scr",
                "dll",
                "jar",
                "ps1",
                "vbs",
                "sh"
            ],

            sensitiveDocumentTypes: [
                "Personnel record",
                "Medical information",
                "Financial account information",
                "Client information",
                "Donor information",
                "Legal document",
                "Government identification",
                "Background check",
                "Password or credential record"
            ]
        },

        sourceTypes: {
            website: "Organization Website",
            document: "Uploaded Document",
            grant: "Funding Source",
            calendar: "Calendar",
            email: "Executive Inbox",
            government: "Government Source",
            community: "Community Source",
            partner: "Partner Source",
            financial: "Financial Record",
            compliance: "Compliance Source",
            news: "News Source",
            social: "Social Media",
            internal: "Internal MEOS Source",
            manual: "Manual Entry"
        },

        intelligenceTypes: {
            opportunity: "Opportunity",
            risk: "Risk",
            deadline: "Deadline",
            change: "Change",
            conflict: "Conflict",
            missingInformation: "Missing Information",
            decision: "Executive Decision",
            task: "Task",
            document: "Document",
            relationship: "Relationship",
            financial: "Financial Intelligence",
            compliance: "Compliance Intelligence",
            program: "Program Intelligence",
            communication: "Communication Intelligence",
            general: "General Intelligence"
        },

        priorityLevels: {
            critical: {
                score: 100,
                label: "Immediate Executive Attention"
            },

            high: {
                score: 80,
                label: "High Priority"
            },

            opportunity: {
                score: 70,
                label: "Mission or Revenue Opportunity"
            },

            normal: {
                score: 50,
                label: "Standard Review"
            },

            monitor: {
                score: 25,
                label: "Log and Monitor"
            }
        },

        officeDirectory: {
            executive: {
                id: "executive",
                name: "Executive Office"
            },

            operations: {
                id: "operations",
                name: "Operations Office"
            },

            finance: {
                id: "finance",
                name: "Finance Office"
            },

            grants: {
                id: "grants",
                name: "Grant and Philanthropy Office"
            },

            development: {
                id: "development",
                name: "Development Office"
            },

            compliance: {
                id: "compliance",
                name: "Compliance Office"
            },

            communityRelations: {
                id: "community-relations",
                name: "Community Relations Office"
            },

            communications: {
                id: "communications",
                name: "Communications and Marketing Office"
            },

            programs: {
                id: "programs",
                name: "Programs Office"
            },

            humanResources: {
                id: "human-resources",
                name: "Human Resources Office"
            },

            technology: {
                id: "technology",
                name: "Technology Office"
            },

            intelligence: {
                id: "intelligence",
                name: "Executive Intelligence Office"
            },

            strategy: {
                id: "strategy",
                name: "Strategic Planning Office"
            }
        },

        initialize() {
            this.connectOrganizationalProfile();
            this.registerDefaultSources();

            console.info(
                `[MEOS] ${this.name} v${this.version} online.`
            );

            console.info(
                "[MEOS Intelligence Engine] Document intake:",
                this.configuration.documentIntakeEnabled
                    ? "ENABLED"
                    : "DISABLED"
            );

            console.info(
                "[MEOS Intelligence Engine] Continuous operations:",
                this.configuration.continuousOperations
                    ? "ENABLED"
                    : "DISABLED"
            );

            this.emit("engine:online", this.getStatus());

            return this.getStatus();
        },

        connectOrganizationalProfile() {
            if (!global.OrganizationalProfile) {
                console.warn(
                    "[MEOS Intelligence Engine] Organizational Profile is not currently available."
                );

                return false;
            }

            console.info(
                "[MEOS Intelligence Engine] Organizational Profile connected:",
                global.OrganizationalProfile.organization?.shortName ||
                    global.OrganizationalProfile.organization?.legalName ||
                    "Organization"
            );

            return true;
        },

        getOrganizationalProfile() {
            return global.OrganizationalProfile || null;
        },

        registerDefaultSources() {
            const defaultSources = [
                {
                    id: "source-organization-website",
                    name: "Organization Website",
                    type: "website",
                    active: true,
                    monitoringFrequency: "twice-daily"
                },
                {
                    id: "source-document-intake",
                    name: "Executive Document Intake",
                    type: "document",
                    active: true,
                    monitoringFrequency: "continuous"
                },
                {
                    id: "source-executive-inbox",
                    name: "Executive Inbox",
                    type: "email",
                    active: true,
                    monitoringFrequency: "continuous"
                },
                {
                    id: "source-funding-intelligence",
                    name: "Funding Intelligence Sources",
                    type: "grant",
                    active: true,
                    monitoringFrequency: "continuous"
                },
                {
                    id: "source-community-intelligence",
                    name: "Community Intelligence Sources",
                    type: "community",
                    active: true,
                    monitoringFrequency: "continuous"
                },
                {
                    id: "source-government-intelligence",
                    name: "Government and Compliance Sources",
                    type: "government",
                    active: true,
                    monitoringFrequency: "continuous"
                }
            ];

            defaultSources.forEach((source) => {
                if (!this.getSourceById(source.id)) {
                    this.sourceRegistry.push({
                        ...source,
                        createdAt: new Date().toISOString(),
                        lastCheckedAt: null,
                        lastSuccessfulCheckAt: null,
                        errorCount: 0
                    });
                }
            });

            return this.sourceRegistry;
        },

        registerSource(source = {}) {
            const registeredSource = {
                id:
                    source.id ||
                    this.createId("intelligence-source"),

                name:
                    source.name ||
                    "Unnamed Intelligence Source",

                type:
                    source.type ||
                    "manual",

                url:
                    source.url ||
                    "",

                active:
                    source.active !== false,

                monitoringFrequency:
                    source.monitoringFrequency ||
                    "manual",

                owningOffice:
                    source.owningOffice ||
                    "Executive Intelligence Office",

                description:
                    source.description ||
                    "",

                createdAt:
                    new Date().toISOString(),

                lastCheckedAt:
                    null,

                lastSuccessfulCheckAt:
                    null,

                errorCount:
                    0
            };

            this.sourceRegistry.push(registeredSource);

            this.emit(
                "source:registered",
                registeredSource
            );

            return registeredSource;
        },

        updateSourceCheck(
            sourceId,
            successful = true,
            details = {}
        ) {
            const source = this.getSourceById(sourceId);

            if (!source) {
                return {
                    success: false,
                    error: "Intelligence source not found."
                };
            }

            const timestamp = new Date().toISOString();

            source.lastCheckedAt = timestamp;

            if (successful) {
                source.lastSuccessfulCheckAt = timestamp;
                source.errorCount = 0;
            } else {
                source.errorCount += 1;
            }

            source.lastCheckDetails = details;

            return {
                success: true,
                source
            };
        },

        receiveIntelligence(input = {}) {
            const intelligence = {
                id: this.createId("intelligence"),

                title:
                    input.title ||
                    "Untitled Intelligence Item",

                summary:
                    input.summary ||
                    "",

                details:
                    input.details ||
                    "",

                sourceType:
                    input.sourceType ||
                    "manual",

                sourceName:
                    input.sourceName ||
                    this.sourceTypes.manual,

                sourceUrl:
                    input.sourceUrl ||
                    "",

                sourceRecordId:
                    input.sourceRecordId ||
                    null,

                intelligenceType:
                    input.intelligenceType ||
                    "general",

                reportedPriority:
                    input.priority ||
                    null,

                detectedPriority:
                    null,

                priorityScore:
                    0,

                missionAlignment:
                    this.calculateMissionAlignment(input),

                offices:
                    [],

                status:
                    "received",

                verified:
                    input.verified === true,

                requiresExecutiveDecision:
                    input.requiresExecutiveDecision === true,

                executiveDecisionQuestion:
                    input.executiveDecisionQuestion ||
                    "",

                deadline:
                    input.deadline ||
                    null,

                financialValue:
                    Number.isFinite(input.financialValue)
                        ? input.financialValue
                        : null,

                tags:
                    Array.isArray(input.tags)
                        ? [...input.tags]
                        : [],

                attachments:
                    Array.isArray(input.attachments)
                        ? [...input.attachments]
                        : [],

                relatedIntelligenceIds:
                    [],

                duplicateOf:
                    null,

                recommendedActions:
                    Array.isArray(input.recommendedActions)
                        ? [...input.recommendedActions]
                        : [],

                createdAt:
                    new Date().toISOString(),

                updatedAt:
                    new Date().toISOString()
            };

            if (
                this.configuration.duplicateDetectionEnabled
            ) {
                const duplicate =
                    this.findDuplicateIntelligence(
                        intelligence
                    );

                if (duplicate) {
                    intelligence.status = "duplicate";
                    intelligence.duplicateOf =
                        duplicate.id;

                    duplicate.relatedIntelligenceIds.push(
                        intelligence.id
                    );
                }
            }

            const priority =
                this.determinePriority(intelligence);

            intelligence.detectedPriority =
                priority.key;

            intelligence.priorityScore =
                priority.score;

            intelligence.offices =
                this.determineOfficeRouting(
                    intelligence
                );

            this.intelligenceLog.push(intelligence);

            if (
                intelligence.status !== "duplicate"
            ) {
                this.routeIntelligence(intelligence);
            }

            if (
                this.shouldEscalateToExecutive(
                    intelligence
                )
            ) {
                this.escalateToExecutive(intelligence);
            }

            intelligence.status =
                intelligence.status === "duplicate"
                    ? "duplicate"
                    : "routed";

            intelligence.updatedAt =
                new Date().toISOString();

            this.emit(
                "intelligence:received",
                intelligence
            );

            return {
                success: true,
                intelligence,
                duplicate:
                    Boolean(intelligence.duplicateOf)
            };
        },

        determinePriority(intelligence) {
            if (intelligence.reportedPriority) {
                const reported =
                    this.priorityLevels[
                        intelligence.reportedPriority
                    ];

                if (reported) {
                    return {
                        key:
                            intelligence.reportedPriority,

                        score:
                            reported.score,

                        label:
                            reported.label
                    };
                }
            }

            let score = 40;

            const combinedText = [
                intelligence.title,
                intelligence.summary,
                intelligence.details,
                intelligence.intelligenceType,
                ...(intelligence.tags || [])
            ]
                .join(" ")
                .toLowerCase();

            const criticalKeywords = [
                "emergency",
                "immediate",
                "lawsuit",
                "subpoena",
                "breach",
                "fraud",
                "danger",
                "safety",
                "overdue",
                "termination",
                "shutdown",
                "revocation",
                "audit failure",
                "missed deadline"
            ];

            const highKeywords = [
                "urgent",
                "deadline",
                "compliance",
                "contract",
                "board approval",
                "major donor",
                "grant deadline",
                "financial risk",
                "reputational risk"
            ];

            const opportunityKeywords = [
                "grant",
                "funding",
                "donor",
                "donation",
                "sponsor",
                "sponsorship",
                "partnership",
                "revenue",
                "contract opportunity",
                "community opportunity",
                "fundraising",
                "philanthropy"
            ];

            if (
                criticalKeywords.some((keyword) =>
                    combinedText.includes(keyword)
                )
            ) {
                score = 100;
            } else if (
                highKeywords.some((keyword) =>
                    combinedText.includes(keyword)
                )
            ) {
                score = Math.max(score, 80);
            } else if (
                opportunityKeywords.some((keyword) =>
                    combinedText.includes(keyword)
                )
            ) {
                score = Math.max(score, 70);
            }

            if (
                intelligence.requiresExecutiveDecision
            ) {
                score = Math.max(score, 80);
            }

            if (
                intelligence.deadline
            ) {
                const deadlineScore =
                    this.calculateDeadlineUrgency(
                        intelligence.deadline
                    );

                score = Math.max(
                    score,
                    deadlineScore
                );
            }

            if (
                intelligence.missionAlignment >= 80
            ) {
                score += 5;
            }

            score = Math.min(100, score);

            if (score >= 95) {
                return {
                    key: "critical",
                    score,
                    label:
                        this.priorityLevels.critical.label
                };
            }

            if (score >= 80) {
                return {
                    key: "high",
                    score,
                    label:
                        this.priorityLevels.high.label
                };
            }

            if (score >= 65) {
                return {
                    key: "opportunity",
                    score,
                    label:
                        this.priorityLevels.opportunity.label
                };
            }

            if (score >= 40) {
                return {
                    key: "normal",
                    score,
                    label:
                        this.priorityLevels.normal.label
                };
            }

            return {
                key: "monitor",
                score,
                label:
                    this.priorityLevels.monitor.label
            };
        },

        determineOfficeRouting(intelligence) {
            const offices = new Set([
                this.officeDirectory.intelligence.name
            ]);

            const text = [
                intelligence.title,
                intelligence.summary,
                intelligence.details,
                intelligence.intelligenceType,
                ...(intelligence.tags || [])
            ]
                .join(" ")
                .toLowerCase();

            const routingRules = [
                {
                    office:
                        this.officeDirectory.grants.name,

                    keywords: [
                        "grant",
                        "foundation",
                        "philanthropy",
                        "funder",
                        "funding",
                        "donor-advised fund",
                        "community grant"
                    ]
                },
                {
                    office:
                        this.officeDirectory.development.name,

                    keywords: [
                        "donor",
                        "donation",
                        "sponsor",
                        "sponsorship",
                        "fundraising",
                        "revenue",
                        "earned income",
                        "corporate giving",
                        "major gift"
                    ]
                },
                {
                    office:
                        this.officeDirectory.finance.name,

                    keywords: [
                        "budget",
                        "financial",
                        "expense",
                        "invoice",
                        "revenue",
                        "bank",
                        "cash flow",
                        "tax",
                        "accounting",
                        "audit"
                    ]
                },
                {
                    office:
                        this.officeDirectory.compliance.name,

                    keywords: [
                        "compliance",
                        "legal",
                        "regulation",
                        "policy",
                        "license",
                        "permit",
                        "contract",
                        "insurance",
                        "irs",
                        "bylaws",
                        "articles",
                        "audit"
                    ]
                },
                {
                    office:
                        this.officeDirectory.communityRelations.name,

                    keywords: [
                        "community",
                        "partner",
                        "partnership",
                        "stakeholder",
                        "volunteer",
                        "church",
                        "faith",
                        "school",
                        "college",
                        "city council",
                        "county",
                        "business relationship",
                        "letter of support"
                    ]
                },
                {
                    office:
                        this.officeDirectory.communications.name,

                    keywords: [
                        "website",
                        "social media",
                        "press",
                        "media",
                        "announcement",
                        "marketing",
                        "brand",
                        "public message",
                        "newsletter",
                        "campaign"
                    ]
                },
                {
                    office:
                        this.officeDirectory.programs.name,

                    keywords: [
                        "program",
                        "service",
                        "client",
                        "participant",
                        "outreach",
                        "outcome",
                        "impact",
                        "evaluation",
                        "service delivery"
                    ]
                },
                {
                    office:
                        this.officeDirectory.humanResources.name,

                    keywords: [
                        "employee",
                        "personnel",
                        "staff",
                        "volunteer training",
                        "hiring",
                        "termination",
                        "performance",
                        "workplace",
                        "payroll"
                    ]
                },
                {
                    office:
                        this.officeDirectory.technology.name,

                    keywords: [
                        "technology",
                        "software",
                        "website error",
                        "cybersecurity",
                        "password",
                        "data breach",
                        "integration",
                        "database",
                        "server",
                        "api"
                    ]
                },
                {
                    office:
                        this.officeDirectory.operations.name,

                    keywords: [
                        "operations",
                        "workflow",
                        "procedure",
                        "equipment",
                        "vehicle",
                        "facility",
                        "inventory",
                        "logistics",
                        "schedule",
                        "process"
                    ]
                },
                {
                    office:
                        this.officeDirectory.strategy.name,

                    keywords: [
                        "strategy",
                        "expansion",
                        "long-term",
                        "objective",
                        "goal",
                        "market",
                        "competitive",
                        "new program",
                        "organizational change"
                    ]
                }
            ];

            routingRules.forEach((rule) => {
                if (
                    rule.keywords.some((keyword) =>
                        text.includes(keyword)
                    )
                ) {
                    offices.add(rule.office);
                }
            });

            if (
                intelligence.requiresExecutiveDecision ||
                intelligence.detectedPriority === "critical" ||
                intelligence.detectedPriority === "high"
            ) {
                offices.add(
                    this.officeDirectory.executive.name
                );
            }

            if (offices.size === 1) {
                offices.add(
                    this.officeDirectory.executive.name
                );
            }

            return [...offices];
        },

        routeIntelligence(intelligence) {
            intelligence.offices.forEach(
                (officeName) => {
                    const assignment =
                        this.createOfficeAssignment({
                            intelligenceId:
                                intelligence.id,

                            title:
                                intelligence.title,

                            office:
                                officeName,

                            priority:
                                intelligence.detectedPriority,

                            objective:
                                this.buildOfficeObjective(
                                    intelligence,
                                    officeName
                                ),

                            deadline:
                                intelligence.deadline,

                            sourceType:
                                intelligence.sourceType
                        });

                    intelligence.relatedIntelligenceIds =
                        intelligence
                            .relatedIntelligenceIds ||
                        [];

                    this.emit(
                        "assignment:created",
                        assignment
                    );
                }
            );

            return intelligence.offices;
        },

        createOfficeAssignment(input = {}) {
            const assignment = {
                id: this.createId("office-assignment"),

                intelligenceId:
                    input.intelligenceId ||
                    null,

                documentId:
                    input.documentId ||
                    null,

                title:
                    input.title ||
                    "Office Review Assignment",

                office:
                    input.office ||
                    this.officeDirectory.executive.name,

                objective:
                    input.objective ||
                    "Review the information and prepare findings.",

                priority:
                    input.priority ||
                    "normal",

                status:
                    "assigned",

                deadline:
                    input.deadline ||
                    null,

                sourceType:
                    input.sourceType ||
                    "internal",

                findings:
                    [],

                recommendation:
                    null,

                createdAt:
                    new Date().toISOString(),

                updatedAt:
                    new Date().toISOString(),

                completedAt:
                    null
            };

            this.officeAssignments.push(
                assignment
            );

            return assignment;
        },

        completeOfficeAssignment(
            assignmentId,
            result = {}
        ) {
            const assignment =
                this.getAssignmentById(
                    assignmentId
                );

            if (!assignment) {
                return {
                    success: false,
                    error:
                        "Office assignment not found."
                };
            }

            assignment.status = "completed";

            assignment.findings =
                Array.isArray(result.findings)
                    ? [...result.findings]
                    : [];

            assignment.recommendation =
                result.recommendation ||
                null;

            assignment.updatedAt =
                new Date().toISOString();

            assignment.completedAt =
                new Date().toISOString();

            this.emit(
                "assignment:completed",
                assignment
            );

            return {
                success: true,
                assignment
            };
        },

        buildOfficeObjective(
            intelligence,
            officeName
        ) {
            const objectives = {
                "Executive Office":
                    "Determine whether an Executive Director decision, approval, or direction is required.",

                "Operations Office":
                    "Assess operational impact, implementation needs, logistics, and workflow requirements.",

                "Finance Office":
                    "Evaluate financial impact, cost, revenue potential, budget requirements, and financial risk.",

                "Grant and Philanthropy Office":
                    "Evaluate funding eligibility, mission alignment, application requirements, and philanthropic potential.",

                "Development Office":
                    "Evaluate donor, sponsorship, fundraising, partnership, and earned-income potential.",

                "Compliance Office":
                    "Evaluate legal, regulatory, governance, contractual, reporting, and policy implications.",

                "Community Relations Office":
                    "Evaluate community impact, relationships, partners, stakeholders, outreach, and opportunities for collaboration.",

                "Communications and Marketing Office":
                    "Evaluate public messaging, website, media, brand, campaign, and communication implications.",

                "Programs Office":
                    "Evaluate program alignment, service impact, participant needs, outcomes, and implementation requirements.",

                "Human Resources Office":
                    "Evaluate staffing, volunteer, personnel, training, workplace, and human-resource implications.",

                "Technology Office":
                    "Evaluate technical requirements, system risks, integrations, cybersecurity, and data implications.",

                "Executive Intelligence Office":
                    "Verify the information, connect related intelligence, identify risks and opportunities, and coordinate office review.",

                "Strategic Planning Office":
                    "Evaluate alignment with organizational priorities, strategic goals, expansion plans, and long-term mission outcomes."
            };

            return (
                objectives[officeName] ||
                `Review "${intelligence.title}" and provide findings and recommendations.`
            );
        },

        /*
         * DOCUMENT INTAKE
         *
         * The future upload drop box will pass browser File objects
         * into this method.
         *
         * Example:
         *
         * IntelligenceEngine.intakeFiles(fileInput.files, {
         *     uploadedBy: "Mandel",
         *     instructions: "Review these for the upcoming grant."
         * });
         */

        intakeFiles(files, intakeOptions = {}) {
            if (
                !this.configuration.documentIntakeEnabled
            ) {
                return {
                    success: false,
                    error:
                        "Document intake is disabled."
                };
            }

            const fileList = Array.from(
                files || []
            );

            if (fileList.length === 0) {
                return {
                    success: false,
                    error:
                        "No files were provided."
                };
            }

            const results = fileList.map(
                (file) =>
                    this.intakeSingleFile(
                        file,
                        intakeOptions
                    )
            );

            const accepted = results.filter(
                (result) => result.success
            );

            const rejected = results.filter(
                (result) => !result.success
            );

            return {
                success: accepted.length > 0,
                acceptedCount: accepted.length,
                rejectedCount: rejected.length,
                accepted,
                rejected
            };
        },

        intakeSingleFile(
            file,
            intakeOptions = {}
        ) {
            const validation =
                this.validateUploadedFile(file);

            if (!validation.valid) {
                return {
                    success: false,
                    fileName:
                        file?.name ||
                        "Unknown file",

                    errors:
                        validation.errors
                };
            }

            const extension =
                this.getFileExtension(
                    file.name
                );

            const classification =
                this.classifyDocument(
                    file.name,
                    file.type,
                    intakeOptions
                );

            const document = {
                id:
                    this.createId(
                        "document-intake"
                    ),

                name:
                    file.name,

                extension,

                mimeType:
                    file.type ||
                    "application/octet-stream",

                sizeBytes:
                    Number(file.size) || 0,

                sizeLabel:
                    this.formatFileSize(
                        Number(file.size) || 0
                    ),

                lastModified:
                    file.lastModified
                        ? new Date(
                              file.lastModified
                          ).toISOString()
                        : null,

                uploadedBy:
                    intakeOptions.uploadedBy ||
                    "Executive Director",

                uploadPurpose:
                    intakeOptions.purpose ||
                    "Executive office review",

                instructions:
                    intakeOptions.instructions ||
                    "",

                requestedOffice:
                    intakeOptions.office ||
                    null,

                documentType:
                    classification.documentType,

                sensitivity:
                    classification.sensitivity,

                suggestedOffices:
                    classification.offices,

                detectedKeywords:
                    classification.keywords,

                reviewStatus:
                    "received",

                processingStatus:
                    "metadata-recorded",

                contentAvailable:
                    false,

                contentExtracted:
                    false,

                storageReference:
                    intakeOptions.storageReference ||
                    null,

                browserFileReference:
                    file,

                warnings:
                    classification.warnings,

                createdAt:
                    new Date().toISOString(),

                updatedAt:
                    new Date().toISOString()
            };

            this.documentIntake.push(
                document
            );

            const intelligenceResult =
                this.receiveIntelligence({
                    title:
                        `Document received: ${document.name}`,

                    summary:
                        `${document.documentType} uploaded for organizational review.`,

                    details:
                        document.instructions ||
                        document.uploadPurpose,

                    sourceType:
                        "document",

                    sourceName:
                        this.sourceTypes.document,

                    sourceRecordId:
                        document.id,

                    intelligenceType:
                        "document",

                    priority:
                        intakeOptions.priority ||
                        "normal",

                    verified:
                        true,

                    tags: [
                        document.documentType,
                        document.sensitivity,
                        ...document.detectedKeywords
                    ],

                    attachments: [
                        {
                            documentId:
                                document.id,

                            fileName:
                                document.name,

                            fileType:
                                document.mimeType,

                            fileSize:
                                document.sizeBytes
                        }
                    ]
                });

            document.intelligenceId =
                intelligenceResult
                    .intelligence
                    .id;

            this.assignDocumentToOffices(
                document
            );

            document.reviewStatus =
                "assigned";

            document.updatedAt =
                new Date().toISOString();

            this.emit(
                "document:received",
                document
            );

            console.info(
                `[MEOS Document Intake] Received: ${document.name}`
            );

            console.info(
                "[MEOS Document Intake] Routed to:",
                document.suggestedOffices
            );

            return {
                success: true,
                document
            };
        },

        validateUploadedFile(file) {
            const errors = [];

            if (!file) {
                errors.push(
                    "The file is missing."
                );

                return {
                    valid: false,
                    errors
                };
            }

            if (!file.name) {
                errors.push(
                    "The file does not have a valid name."
                );
            }

            const extension =
                this.getFileExtension(
                    file.name || ""
                );

            if (
                this.configuration
                    .restrictedFileExtensions
                    .includes(extension)
            ) {
                errors.push(
                    `Files ending in .${extension} are restricted for security reasons.`
                );
            }

            if (
                extension &&
                !this.configuration
                    .supportedFileExtensions
                    .includes(extension)
            ) {
                errors.push(
                    `The .${extension} file type is not currently supported.`
                );
            }

            if (
                Number(file.size) >
                this.configuration
                    .maximumUploadSizeBytes
            ) {
                errors.push(
                    `The file exceeds the current ${this.formatFileSize(
                        this.configuration
                            .maximumUploadSizeBytes
                    )} upload limit.`
                );
            }

            if (
                Number(file.size) === 0
            ) {
                errors.push(
                    "The file is empty."
                );
            }

            return {
                valid: errors.length === 0,
                errors
            };
        },

        classifyDocument(
            fileName,
            mimeType = "",
            intakeOptions = {}
        ) {
            const text = [
                fileName,
                mimeType,
                intakeOptions.purpose || "",
                intakeOptions.instructions || ""
            ]
                .join(" ")
                .toLowerCase();

            let documentType =
                "General Organizational Document";

            let sensitivity =
                "Internal";

            const offices = new Set([
                this.officeDirectory.intelligence.name
            ]);

            const keywords = [];
            const warnings = [];

            const classifications = [
                {
                    type: "Grant Document",
                    keywords: [
                        "grant",
                        "proposal",
                        "application",
                        "narrative",
                        "funder",
                        "foundation",
                        "award"
                    ],
                    offices: [
                        this.officeDirectory.grants.name,
                        this.officeDirectory.finance.name,
                        this.officeDirectory.programs.name,
                        this.officeDirectory.compliance.name
                    ]
                },
                {
                    type: "Financial Document",
                    keywords: [
                        "budget",
                        "financial",
                        "invoice",
                        "receipt",
                        "bank",
                        "expense",
                        "income",
                        "tax",
                        "accounting",
                        "audit"
                    ],
                    offices: [
                        this.officeDirectory.finance.name,
                        this.officeDirectory.compliance.name
                    ]
                },
                {
                    type: "Legal or Compliance Document",
                    keywords: [
                        "legal",
                        "contract",
                        "agreement",
                        "bylaws",
                        "articles",
                        "irs",
                        "policy",
                        "insurance",
                        "permit",
                        "license",
                        "compliance"
                    ],
                    offices: [
                        this.officeDirectory.compliance.name,
                        this.officeDirectory.executive.name
                    ]
                },
                {
                    type: "Community Relations Document",
                    keywords: [
                        "partner",
                        "partnership",
                        "community",
                        "stakeholder",
                        "volunteer",
                        "sponsor",
                        "letter of support",
                        "outreach"
                    ],
                    offices: [
                        this.officeDirectory.communityRelations.name,
                        this.officeDirectory.development.name
                    ]
                },
                {
                    type: "Program Document",
                    keywords: [
                        "program",
                        "service",
                        "participant",
                        "client",
                        "outcome",
                        "impact",
                        "curriculum",
                        "intake",
                        "assessment"
                    ],
                    offices: [
                        this.officeDirectory.programs.name,
                        this.officeDirectory.operations.name
                    ]
                },
                {
                    type: "Communications Document",
                    keywords: [
                        "website",
                        "press",
                        "media",
                        "marketing",
                        "newsletter",
                        "social",
                        "campaign",
                        "brand",
                        "announcement"
                    ],
                    offices: [
                        this.officeDirectory.communications.name,
                        this.officeDirectory.communityRelations.name
                    ]
                },
                {
                    type: "Personnel Record",
                    keywords: [
                        "employee",
                        "personnel",
                        "resume",
                        "application",
                        "performance",
                        "disciplinary",
                        "payroll",
                        "staff"
                    ],
                    offices: [
                        this.officeDirectory.humanResources.name,
                        this.officeDirectory.compliance.name
                    ],
                    sensitivity: "Restricted"
                },
                {
                    type: "Executive or Governance Document",
                    keywords: [
                        "board",
                        "minutes",
                        "resolution",
                        "executive",
                        "leadership",
                        "governance",
                        "strategic plan"
                    ],
                    offices: [
                        this.officeDirectory.executive.name,
                        this.officeDirectory.strategy.name,
                        this.officeDirectory.compliance.name
                    ],
                    sensitivity: "Confidential"
                },
                {
                    type: "Technology Document",
                    keywords: [
                        "code",
                        "software",
                        "api",
                        "database",
                        "cybersecurity",
                        "server",
                        "integration",
                        "technical"
                    ],
                    offices: [
                        this.officeDirectory.technology.name
                    ]
                }
            ];

            let bestMatch = null;
            let highestMatchCount = 0;

            classifications.forEach(
                (classification) => {
                    const matches =
                        classification.keywords.filter(
                            (keyword) =>
                                text.includes(keyword)
                        );

                    if (
                        matches.length >
                        highestMatchCount
                    ) {
                        highestMatchCount =
                            matches.length;

                        bestMatch = {
                            ...classification,
                            matches
                        };
                    }
                }
            );

            if (bestMatch) {
                documentType =
                    bestMatch.type;

                sensitivity =
                    bestMatch.sensitivity ||
                    sensitivity;

                bestMatch.offices.forEach(
                    (office) =>
                        offices.add(office)
                );

                keywords.push(
                    ...bestMatch.matches
                );
            }

            if (intakeOptions.office) {
                offices.add(
                    intakeOptions.office
                );
            }

            const sensitiveTerms = [
                "medical",
                "diagnosis",
                "social security",
                "ssn",
                "password",
                "credential",
                "background check",
                "bank account",
                "routing number",
                "client record",
                "donor list"
            ];

            const sensitiveMatches =
                sensitiveTerms.filter(
                    (term) =>
                        text.includes(term)
                );

            if (
                sensitiveMatches.length > 0
            ) {
                sensitivity = "Restricted";

                warnings.push(
                    "This document may contain sensitive or personally identifiable information."
                );

                keywords.push(
                    ...sensitiveMatches
                );

                offices.add(
                    this.officeDirectory.compliance.name
                );
            }

            return {
                documentType,
                sensitivity,
                offices: [...offices],
                keywords: [...new Set(keywords)],
                warnings
            };
        },

        assignDocumentToOffices(document) {
            return document.suggestedOffices.map(
                (officeName) =>
                    this.createOfficeAssignment({
                        intelligenceId:
                            document.intelligenceId,

                        documentId:
                            document.id,

                        title:
                            `Review document: ${document.name}`,

                        office:
                            officeName,

                        objective:
                            this.buildDocumentReviewObjective(
                                document,
                                officeName
                            ),

                        priority:
                            document.sensitivity ===
                            "Restricted"
                                ? "high"
                                : "normal",

                        sourceType:
                            "document"
                    })
            );
        },

        buildDocumentReviewObjective(
            document,
            officeName
        ) {
            return [
                `Review the uploaded ${document.documentType.toLowerCase()}.`,
                `Determine what information is relevant to the ${officeName}.`,
                "Identify required actions, deadlines, risks, opportunities, missing information, and Executive Director decisions.",
                document.instructions
                    ? `Executive instructions: ${document.instructions}`
                    : ""
            ]
                .filter(Boolean)
                .join(" ");
        },

        updateDocumentStatus(
            documentId,
            status,
            notes = ""
        ) {
            const document =
                this.getDocumentById(
                    documentId
                );

            if (!document) {
                return {
                    success: false,
                    error:
                        "Document record not found."
                };
            }

            document.reviewStatus =
                status;

            document.reviewNotes =
                notes;

            document.updatedAt =
                new Date().toISOString();

            this.emit(
                "document:updated",
                document
            );

            return {
                success: true,
                document
            };
        },

        prepareExecutiveBriefing(
            intelligenceId
        ) {
            const intelligence =
                this.getIntelligenceById(
                    intelligenceId
                );

            if (!intelligence) {
                return {
                    success: false,
                    error:
                        "Intelligence item not found."
                };
            }

            const relatedAssignments =
                this.officeAssignments.filter(
                    (assignment) =>
                        assignment.intelligenceId ===
                        intelligenceId
                );

            const completedAssignments =
                relatedAssignments.filter(
                    (assignment) =>
                        assignment.status ===
                        "completed"
                );

            const pendingAssignments =
                relatedAssignments.filter(
                    (assignment) =>
                        assignment.status !==
                        "completed"
                );

            const findings =
                completedAssignments.flatMap(
                    (assignment) =>
                        assignment.findings.map(
                            (finding) => ({
                                office:
                                    assignment.office,

                                finding
                            })
                        )
                );

            const recommendations =
                completedAssignments
                    .filter(
                        (assignment) =>
                            assignment.recommendation
                    )
                    .map((assignment) => ({
                        office:
                            assignment.office,

                        recommendation:
                            assignment.recommendation
                    }));

            const briefing = {
                id:
                    this.createId(
                        "executive-briefing"
                    ),

                intelligenceId:
                    intelligence.id,

                title:
                    intelligence.title,

                executiveSummary:
                    intelligence.summary ||
                    intelligence.details ||
                    "Executive review has been prepared.",

                whatChanged:
                    intelligence.details ||
                    intelligence.summary,

                whyItMatters:
                    this.buildWhyItMatters(
                        intelligence
                    ),

                missionAlignment:
                    intelligence.missionAlignment,

                priority:
                    intelligence.detectedPriority,

                priorityScore:
                    intelligence.priorityScore,

                source: {
                    type:
                        intelligence.sourceType,

                    name:
                        intelligence.sourceName,

                    url:
                        intelligence.sourceUrl
                },

                officesAssigned:
                    relatedAssignments.map(
                        (assignment) =>
                            assignment.office
                    ),

                completedOfficeReviews:
                    completedAssignments.length,

                pendingOfficeReviews:
                    pendingAssignments.length,

                findings,

                recommendations,

                missingInformation:
                    this.identifyBriefingGaps(
                        intelligence,
                        relatedAssignments
                    ),

                decisionRequired:
                    intelligence.requiresExecutiveDecision,

                executiveDecisionQuestion:
                    intelligence.executiveDecisionQuestion ||
                    this.buildExecutiveDecisionQuestion(
                        intelligence
                    ),

                deadline:
                    intelligence.deadline,

                recommendedNextActions:
                    this.buildRecommendedNextActions(
                        intelligence,
                        relatedAssignments,
                        recommendations
                    ),

                status:
                    pendingAssignments.length > 0
                        ? "preliminary"
                        : "ready-for-executive-review",

                callout:
                    pendingAssignments.length > 0
                        ? "Office review in progress."
                        : "I'm Up.",

                preparedAt:
                    new Date().toISOString()
            };

            this.executiveBriefings.push(
                briefing
            );

            this.emit(
                "briefing:prepared",
                briefing
            );

            return {
                success: true,
                briefing
            };
        },

        escalateToExecutive(intelligence) {
            intelligence.requiresExecutiveDecision =
                true;

            if (
                !intelligence.offices.includes(
                    this.officeDirectory.executive.name
                )
            ) {
                intelligence.offices.push(
                    this.officeDirectory.executive.name
                );

                this.createOfficeAssignment({
                    intelligenceId:
                        intelligence.id,

                    title:
                        intelligence.title,

                    office:
                        this.officeDirectory.executive.name,

                    objective:
                        "Review the matter immediately and determine the Executive Director decision required.",

                    priority:
                        intelligence.detectedPriority,

                    deadline:
                        intelligence.deadline,

                    sourceType:
                        intelligence.sourceType
                });
            }

            this.emit(
                "intelligence:escalated",
                intelligence
            );

            return intelligence;
        },

        shouldEscalateToExecutive(
            intelligence
        ) {
            if (
                !this.configuration
                    .executiveEscalationEnabled
            ) {
                return false;
            }

            return (
                intelligence.requiresExecutiveDecision ||
                intelligence.detectedPriority ===
                    "critical" ||
                intelligence.detectedPriority ===
                    "high"
            );
        },

        calculateMissionAlignment(input = {}) {
            const profile =
                this.getOrganizationalProfile();

            if (!profile) {
                return 50;
            }

            const missionText = [
                profile.organization?.mission || "",
                profile.organization?.slogan || "",
                ...(profile.programs
                    ?.primaryPrograms || []
                ).map(
                    (program) =>
                        `${program.name} ${program.purpose}`
                )
            ]
                .join(" ")
                .toLowerCase();

            const intelligenceText = [
                input.title || "",
                input.summary || "",
                input.details || "",
                ...(input.tags || [])
            ]
                .join(" ")
                .toLowerCase();

            const missionWords =
                this.extractMeaningfulWords(
                    missionText
                );

            const intelligenceWords =
                new Set(
                    this.extractMeaningfulWords(
                        intelligenceText
                    )
                );

            if (
                missionWords.length === 0
            ) {
                return 50;
            }

            const matchedWords =
                missionWords.filter((word) =>
                    intelligenceWords.has(word)
                );

            const rawScore =
                (matchedWords.length /
                    missionWords.length) *
                100;

            return Math.max(
                20,
                Math.min(
                    100,
                    Math.round(
                        rawScore + 35
                    )
                )
            );
        },

        extractMeaningfulWords(text) {
            const ignoredWords =
                new Set([
                    "the",
                    "and",
                    "for",
                    "with",
                    "that",
                    "this",
                    "from",
                    "into",
                    "through",
                    "provide",
                    "toward",
                    "organization",
                    "program",
                    "office"
                ]);

            return [
                ...new Set(
                    String(text || "")
                        .toLowerCase()
                        .replace(
                            /[^a-z0-9\s-]/g,
                            " "
                        )
                        .split(/\s+/)
                        .filter(
                            (word) =>
                                word.length >= 4 &&
                                !ignoredWords.has(word)
                        )
                )
            ];
        },

        calculateDeadlineUrgency(deadline) {
            const deadlineDate =
                new Date(deadline);

            if (
                Number.isNaN(
                    deadlineDate.getTime()
                )
            ) {
                return 50;
            }

            const daysRemaining =
                Math.ceil(
                    (deadlineDate.getTime() -
                        Date.now()) /
                        (1000 *
                            60 *
                            60 *
                            24)
                );

            if (daysRemaining < 0) {
                return 100;
            }

            if (daysRemaining <= 2) {
                return 100;
            }

            if (daysRemaining <= 7) {
                return 90;
            }

            if (daysRemaining <= 21) {
                return 80;
            }

            if (daysRemaining <= 45) {
                return 65;
            }

            return 50;
        },

        findDuplicateIntelligence(
            candidate
        ) {
            const normalizedCandidate =
                this.normalizeText(
                    `${candidate.title} ${candidate.summary}`
                );

            return (
                this.intelligenceLog.find(
                    (existing) => {
                        const normalizedExisting =
                            this.normalizeText(
                                `${existing.title} ${existing.summary}`
                            );

                        if (
                            normalizedExisting ===
                            normalizedCandidate
                        ) {
                            return true;
                        }

                        if (
                            candidate.sourceRecordId &&
                            existing.sourceRecordId ===
                                candidate.sourceRecordId
                        ) {
                            return true;
                        }

                        return false;
                    }
                ) || null
            );
        },

        buildWhyItMatters(
            intelligence
        ) {
            const reasons = [];

            if (
                intelligence.missionAlignment >= 75
            ) {
                reasons.push(
                    "The matter is strongly aligned with the organization's mission."
                );
            }

            if (
                intelligence.financialValue
            ) {
                reasons.push(
                    "The matter may have a measurable financial impact."
                );
            }

            if (
                intelligence.deadline
            ) {
                reasons.push(
                    "The matter has a time-sensitive deadline."
                );
            }

            if (
                intelligence.requiresExecutiveDecision
            ) {
                reasons.push(
                    "Executive Director direction or approval is required."
                );
            }

            if (
                intelligence.detectedPriority ===
                "critical"
            ) {
                reasons.push(
                    "Delayed action may create serious organizational risk."
                );
            }

            if (
                intelligence.detectedPriority ===
                "opportunity"
            ) {
                reasons.push(
                    "Timely action may create mission, funding, partnership, or revenue value."
                );
            }

            if (reasons.length === 0) {
                reasons.push(
                    "The information may affect organizational operations, planning, or decision-making."
                );
            }

            return reasons.join(" ");
        },

        identifyBriefingGaps(
            intelligence,
            assignments
        ) {
            const gaps = [];

            if (!intelligence.verified) {
                gaps.push(
                    "The underlying information has not been fully verified."
                );
            }

            if (
                assignments.some(
                    (assignment) =>
                        assignment.status !==
                        "completed"
                )
            ) {
                gaps.push(
                    "One or more assigned offices have not completed their review."
                );
            }

            if (
                intelligence.requiresExecutiveDecision &&
                !intelligence.executiveDecisionQuestion
            ) {
                gaps.push(
                    "The precise Executive Director decision should be clarified."
                );
            }

            if (
                intelligence.deadline &&
                Number.isNaN(
                    new Date(
                        intelligence.deadline
                    ).getTime()
                )
            ) {
                gaps.push(
                    "The reported deadline requires verification."
                );
            }

            return gaps;
        },

        buildExecutiveDecisionQuestion(
            intelligence
        ) {
            if (
                intelligence.detectedPriority ===
                "critical"
            ) {
                return "What immediate action does the Executive Director authorize?";
            }

            if (
                intelligence.detectedPriority ===
                "opportunity"
            ) {
                return "Does the Executive Director authorize the organization to advance this opportunity?";
            }

            return "Does the Executive Director approve the recommended next action?";
        },

        buildRecommendedNextActions(
            intelligence,
            assignments,
            recommendations
        ) {
            const actions = [
                ...intelligence.recommendedActions
            ];

            if (!intelligence.verified) {
                actions.push(
                    "Verify the source and all material facts."
                );
            }

            if (
                assignments.some(
                    (assignment) =>
                        assignment.status !==
                        "completed"
                )
            ) {
                actions.push(
                    "Complete all assigned office reviews."
                );
            }

            recommendations.forEach(
                (item) => {
                    actions.push(
                        `${item.office}: ${item.recommendation}`
                    );
                }
            );

            if (
                intelligence.requiresExecutiveDecision
            ) {
                actions.push(
                    "Present the coordinated recommendation to the Executive Director."
                );
            }

            return [...new Set(actions)];
        },

        getIntelligenceById(
            intelligenceId
        ) {
            return (
                this.intelligenceLog.find(
                    (item) =>
                        item.id ===
                        intelligenceId
                ) || null
            );
        },

        getDocumentById(documentId) {
            return (
                this.documentIntake.find(
                    (document) =>
                        document.id ===
                        documentId
                ) || null
            );
        },

        getAssignmentById(
            assignmentId
        ) {
            return (
                this.officeAssignments.find(
                    (assignment) =>
                        assignment.id ===
                        assignmentId
                ) || null
            );
        },

        getSourceById(sourceId) {
            return (
                this.sourceRegistry.find(
                    (source) =>
                        source.id ===
                        sourceId
                ) || null
            );
        },

        getOpenAssignments(
            officeName = null
        ) {
            return this.officeAssignments.filter(
                (assignment) => {
                    const isOpen =
                        assignment.status !==
                        "completed";

                    const matchesOffice =
                        !officeName ||
                        assignment.office ===
                            officeName;

                    return (
                        isOpen &&
                        matchesOffice
                    );
                }
            );
        },

        getPriorityIntelligence() {
            return [...this.intelligenceLog]
                .filter(
                    (item) =>
                        item.status !==
                        "duplicate"
                )
                .sort(
                    (first, second) =>
                        second.priorityScore -
                        first.priorityScore
                );
        },

        getDocumentQueue() {
            return [...this.documentIntake]
                .sort(
                    (first, second) =>
                        new Date(
                            second.createdAt
                        ).getTime() -
                        new Date(
                            first.createdAt
                        ).getTime()
                );
        },

        normalizeText(text) {
            return String(text || "")
                .toLowerCase()
                .replace(
                    /[^a-z0-9\s]/g,
                    " "
                )
                .replace(/\s+/g, " ")
                .trim();
        },

        getFileExtension(fileName) {
            const parts =
                String(fileName || "")
                    .toLowerCase()
                    .split(".");

            return parts.length > 1
                ? parts.pop()
                : "";
        },

        formatFileSize(bytes) {
            const numericBytes =
                Number(bytes) || 0;

            if (numericBytes < 1024) {
                return `${numericBytes} bytes`;
            }

            if (
                numericBytes <
                1024 * 1024
            ) {
                return `${(
                    numericBytes / 1024
                ).toFixed(1)} KB`;
            }

            return `${(
                numericBytes /
                (1024 * 1024)
            ).toFixed(1)} MB`;
        },

        createId(prefix) {
            const randomPart =
                Math.random()
                    .toString(36)
                    .slice(2, 10);

            return `${prefix}-${Date.now()}-${randomPart}`;
        },

        on(eventName, callback) {
            if (
                typeof callback !==
                "function"
            ) {
                return false;
            }

            if (
                !this.eventListeners[
                    eventName
                ]
            ) {
                this.eventListeners[
                    eventName
                ] = [];
            }

            this.eventListeners[
                eventName
            ].push(callback);

            return true;
        },

        off(eventName, callback) {
            const listeners =
                this.eventListeners[
                    eventName
                ];

            if (!listeners) {
                return false;
            }

            this.eventListeners[
                eventName
            ] = listeners.filter(
                (listener) =>
                    listener !== callback
            );

            return true;
        },

        emit(eventName, payload) {
            const listeners =
                this.eventListeners[
                    eventName
                ] || [];

            listeners.forEach(
                (listener) => {
                    try {
                        listener(payload);
                    } catch (error) {
                        console.error(
                            `[MEOS Intelligence Engine] Event listener failed for "${eventName}":`,
                            error
                        );
                    }
                }
            );
        },

        getStatus() {
            return {
                name: this.name,
                version: this.version,
                status: this.status,
                operatingMode:
                    this.operatingMode,

                organizationalProfileConnected:
                    Boolean(
                        this.getOrganizationalProfile()
                    ),

                continuousOperations:
                    this.configuration
                        .continuousOperations,

                documentIntakeEnabled:
                    this.configuration
                        .documentIntakeEnabled,

                intelligenceCount:
                    this.intelligenceLog.length,

                uploadedDocumentCount:
                    this.documentIntake.length,

                openAssignmentCount:
                    this.getOpenAssignments()
                        .length,

                executiveBriefingCount:
                    this.executiveBriefings
                        .length,

                registeredSourceCount:
                    this.sourceRegistry.length
            };
        }
    };

    global.IntelligenceEngine =
        IntelligenceEngine;

    IntelligenceEngine.initialize();
})(window);
