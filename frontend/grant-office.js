/*
 * MEOS Grant Office
 * Version: 1.0.0
 *
 * Purpose:
 * Discover, evaluate, organize, and prepare grant opportunities
 * for Executive Review.
 *
 * Operating Principle:
 * Adapt to the situation. Stay true to the mission.
 */

(function initializeGrantOffice(global) {
    "use strict";

    const GrantOffice = {
        name: "Grant Office",
        version: "1.0.0",
        status: "online",
        operatingMode: "continuous",
        activeMissions: [],
        opportunities: [],
        executiveReviews: [],

        getOrganizationProfile() {
            if (!global.OrganizationalProfile) {
                console.warn(
                    "[MEOS Grant Office] Organizational Profile is not available."
                );

                return null;
            }

            return global.OrganizationalProfile;
        },

        createMission(request = {}) {
            const profile = this.getOrganizationProfile();

            const mission = {
                id: this.createId("grant-mission"),
                type: "grant",
                title:
                    request.title ||
                    "Find and evaluate mission-aligned grant opportunities",
                objective:
                    request.objective ||
                    "Identify funding opportunities that advance the organization's mission.",
                requestedBy:
                    request.requestedBy ||
                    profile?.organization?.executiveDirector?.preferredName ||
                    "Executive Director",
                targetPrograms: Array.isArray(request.targetPrograms)
                    ? request.targetPrograms
                    : [],
                targetFundingAreas: Array.isArray(request.targetFundingAreas)
                    ? request.targetFundingAreas
                    : [],
                geography:
                    request.geography ||
                    profile?.organization?.serviceArea ||
                    "",
                minimumFunding:
                    Number.isFinite(request.minimumFunding)
                        ? request.minimumFunding
                        : null,
                maximumFunding:
                    Number.isFinite(request.maximumFunding)
                        ? request.maximumFunding
                        : null,
                deadlinePreference:
                    request.deadlinePreference || "Any open deadline",
                status: "received",
                priority: request.priority || "opportunity",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                findings: [],
                missingInformation: [],
                recommendation: null
            };

            this.activeMissions.push(mission);

            console.info(
                `[MEOS Grant Office] Mission received: ${mission.title}`
            );

            return mission;
        },

        addOpportunity(opportunity = {}) {
            const grant = {
                id: this.createId("grant-opportunity"),
                title: opportunity.title || "Untitled Grant Opportunity",
                funder: opportunity.funder || "Unknown Funder",
                sourceUrl: opportunity.sourceUrl || "",
                description: opportunity.description || "",
                fundingAmount:
                    Number.isFinite(opportunity.fundingAmount)
                        ? opportunity.fundingAmount
                        : null,
                fundingRange: opportunity.fundingRange || "",
                deadline: opportunity.deadline || "",
                geography: opportunity.geography || "",
                eligibleApplicants: Array.isArray(
                    opportunity.eligibleApplicants
                )
                    ? opportunity.eligibleApplicants
                    : [],
                fundingAreas: Array.isArray(opportunity.fundingAreas)
                    ? opportunity.fundingAreas
                    : [],
                requiredDocuments: Array.isArray(
                    opportunity.requiredDocuments
                )
                    ? opportunity.requiredDocuments
                    : [],
                restrictions: Array.isArray(opportunity.restrictions)
                    ? opportunity.restrictions
                    : [],
                status: opportunity.status || "discovered",
                verified: opportunity.verified === true,
                discoveredAt: new Date().toISOString(),
                evaluation: null
            };

            this.opportunities.push(grant);

            console.info(
                `[MEOS Grant Office] Opportunity added: ${grant.title}`
            );

            return grant;
        },

        evaluateOpportunity(opportunityId, missionId = null) {
            const opportunity = this.getOpportunityById(opportunityId);

            if (!opportunity) {
                return {
                    success: false,
                    error: "Grant opportunity not found."
                };
            }

            const mission = missionId
                ? this.getMissionById(missionId)
                : null;

            const profile = this.getOrganizationProfile();

            if (!profile) {
                return {
                    success: false,
                    error:
                        "Organizational Profile is required before evaluating grants."
                };
            }

            const missionText = [
                profile.organization?.mission || "",
                profile.organization?.slogan || "",
                ...(profile.programs?.primaryPrograms || []).map(
                    (program) =>
                        `${program.name} ${program.purpose}`
                ),
                ...(mission?.targetPrograms || []),
                ...(mission?.targetFundingAreas || [])
            ]
                .join(" ")
                .toLowerCase();

            const opportunityText = [
                opportunity.title,
                opportunity.description,
                opportunity.geography,
                ...(opportunity.fundingAreas || []),
                ...(opportunity.eligibleApplicants || [])
            ]
                .join(" ")
                .toLowerCase();

            const missionAlignment = this.calculateKeywordAlignment(
                missionText,
                opportunityText
            );

            const eligibilityScore =
                this.evaluateEligibility(opportunity, profile);

            const geographyScore =
                this.evaluateGeography(opportunity, profile);

            const deadlineScore =
                this.evaluateDeadline(opportunity.deadline);

            const fundingScore =
                this.evaluateFundingAmount(
                    opportunity,
                    mission
                );

            const readinessScore =
                this.evaluateDocumentReadiness(opportunity);

            const totalScore = Math.round(
                missionAlignment * 0.35 +
                    eligibilityScore * 0.2 +
                    geographyScore * 0.15 +
                    deadlineScore * 0.1 +
                    fundingScore * 0.1 +
                    readinessScore * 0.1
            );

            const evaluation = {
                totalScore,
                rating: this.getScoreRating(totalScore),
                missionAlignment,
                eligibilityScore,
                geographyScore,
                deadlineScore,
                fundingScore,
                readinessScore,
                strengths: [],
                concerns: [],
                missingInformation: [],
                recommendedAction: "",
                evaluatedAt: new Date().toISOString()
            };

            if (missionAlignment >= 75) {
                evaluation.strengths.push(
                    "Strong alignment with the organization's mission and programs."
                );
            } else if (missionAlignment < 50) {
                evaluation.concerns.push(
                    "Limited evidence of direct mission alignment."
                );
            }

            if (eligibilityScore >= 80) {
                evaluation.strengths.push(
                    "The organization appears to meet the basic applicant eligibility."
                );
            } else {
                evaluation.concerns.push(
                    "Applicant eligibility requires additional verification."
                );
            }

            if (!opportunity.verified) {
                evaluation.missingInformation.push(
                    "The opportunity has not yet been verified against the official funder source."
                );
            }

            if (!opportunity.deadline) {
                evaluation.missingInformation.push(
                    "Application deadline is missing."
                );
            }

            if (
                !opportunity.fundingAmount &&
                !opportunity.fundingRange
            ) {
                evaluation.missingInformation.push(
                    "Funding amount or award range is missing."
                );
            }

            if (!opportunity.sourceUrl) {
                evaluation.missingInformation.push(
                    "Official opportunity URL is missing."
                );
            }

            evaluation.recommendedAction =
                this.buildRecommendedAction(evaluation);

            opportunity.evaluation = evaluation;
            opportunity.status =
                totalScore >= 70
                    ? "recommended"
                    : totalScore >= 50
                      ? "review"
                      : "low-priority";

            if (mission) {
                mission.updatedAt = new Date().toISOString();
                mission.findings.push({
                    opportunityId: opportunity.id,
                    opportunityTitle: opportunity.title,
                    score: totalScore,
                    rating: evaluation.rating,
                    recommendedAction:
                        evaluation.recommendedAction
                });
            }

            console.info(
                `[MEOS Grant Office] Evaluated ${opportunity.title}: ${totalScore}/100`
            );

            return {
                success: true,
                opportunity,
                evaluation
            };
        },

        prepareExecutiveReview(opportunityId, missionId = null) {
            const opportunity = this.getOpportunityById(opportunityId);

            if (!opportunity) {
                return {
                    success: false,
                    error: "Grant opportunity not found."
                };
            }

            if (!opportunity.evaluation) {
                const result = this.evaluateOpportunity(
                    opportunityId,
                    missionId
                );

                if (!result.success) {
                    return result;
                }
            }

            const profile = this.getOrganizationProfile();
            const mission = missionId
                ? this.getMissionById(missionId)
                : null;

            const review = {
                id: this.createId("executive-review"),
                office: this.name,
                organization:
                    profile?.organization?.legalName ||
                    "Organization",
                opportunityId: opportunity.id,
                grantTitle: opportunity.title,
                funder: opportunity.funder,
                whatChanged:
                    "A grant opportunity has been identified and evaluated.",
                whyItMatters:
                    "The opportunity may provide resources that advance the organization's mission and programs.",
                missionImpact:
                    opportunity.evaluation.missionAlignment >= 70
                        ? "Strong potential mission impact."
                        : "Mission impact requires further review.",
                opportunityOrRisk: {
                    opportunity:
                        opportunity.evaluation.recommendedAction,
                    risks:
                        opportunity.evaluation.concerns
                },
                recommendedActions: [
                    "Verify the opportunity using the official funder source.",
                    "Confirm organizational eligibility.",
                    "Review all required documents.",
                    "Confirm the application deadline.",
                    "Assign drafting and budget responsibilities.",
                    "Prepare the complete application for Executive Director approval."
                ],
                leadOffice: "Grant Office",
                supportingOffices: [
                    "Finance Office",
                    "Programs Office",
                    "Compliance Office",
                    "Community Relations Office",
                    "Communications and Marketing Office"
                ],
                executiveDecisionRequired:
                    opportunity.evaluation.totalScore >= 70
                        ? "Approve moving the opportunity into application development."
                        : "Decide whether additional research is justified before proceeding.",
                deadline:
                    opportunity.deadline ||
                    "Deadline not yet verified",
                score: opportunity.evaluation.totalScore,
                rating: opportunity.evaluation.rating,
                missingInformation:
                    opportunity.evaluation.missingInformation,
                status: "ready-for-executive-review",
                callout: "I'm Up.",
                preparedAt: new Date().toISOString()
            };

            this.executiveReviews.push(review);

            if (mission) {
                mission.status = "executive-review";
                mission.recommendation = review;
                mission.updatedAt = new Date().toISOString();
            }

            console.info(
                `[MEOS Grant Office] Executive Review prepared: ${opportunity.title}`
            );

            return {
                success: true,
                review
            };
        },

        buildApplicationChecklist(opportunityId) {
            const opportunity = this.getOpportunityById(opportunityId);

            if (!opportunity) {
                return {
                    success: false,
                    error: "Grant opportunity not found."
                };
            }

            const standardDocuments = [
                "IRS determination letter",
                "Articles of incorporation",
                "Current bylaws",
                "Board of Directors list",
                "Organizational budget",
                "Program budget",
                "Most recent financial statements",
                "Mission statement",
                "Program description",
                "Statement of need",
                "Goals and measurable outcomes",
                "Implementation timeline",
                "Leadership biographies",
                "Letters of support",
                "Required certifications and assurances"
            ];

            const combinedDocuments = [
                ...standardDocuments,
                ...(opportunity.requiredDocuments || [])
            ];

            const uniqueDocuments = [
                ...new Set(combinedDocuments)
            ];

            return {
                success: true,
                opportunityId,
                grantTitle: opportunity.title,
                checklist: uniqueDocuments.map(
                    (documentName, index) => ({
                        id: index + 1,
                        document: documentName,
                        status: "not-confirmed",
                        assignedOffice:
                            this.assignDocumentOffice(documentName),
                        notes: ""
                    })
                )
            };
        },

        identifyMissingInformation(opportunityId) {
            const opportunity = this.getOpportunityById(opportunityId);

            if (!opportunity) {
                return {
                    success: false,
                    error: "Grant opportunity not found."
                };
            }

            const missing = [];

            if (!opportunity.funder) {
                missing.push("Funder name");
            }

            if (!opportunity.description) {
                missing.push("Grant description");
            }

            if (!opportunity.sourceUrl) {
                missing.push("Official grant webpage");
            }

            if (!opportunity.deadline) {
                missing.push("Application deadline");
            }

            if (
                !opportunity.fundingAmount &&
                !opportunity.fundingRange
            ) {
                missing.push("Award amount");
            }

            if (!opportunity.geography) {
                missing.push("Eligible geographic area");
            }

            if (
                opportunity.eligibleApplicants.length === 0
            ) {
                missing.push("Eligible applicant types");
            }

            if (opportunity.fundingAreas.length === 0) {
                missing.push("Funding priorities");
            }

            return {
                success: true,
                opportunityId,
                missingInformation: missing,
                complete: missing.length === 0
            };
        },

        rankOpportunities() {
            return [...this.opportunities]
                .filter((opportunity) => opportunity.evaluation)
                .sort(
                    (first, second) =>
                        second.evaluation.totalScore -
                        first.evaluation.totalScore
                );
        },

        getMissionById(missionId) {
            return (
                this.activeMissions.find(
                    (mission) => mission.id === missionId
                ) || null
            );
        },

        getOpportunityById(opportunityId) {
            return (
                this.opportunities.find(
                    (opportunity) =>
                        opportunity.id === opportunityId
                ) || null
            );
        },

        calculateKeywordAlignment(
            organizationText,
            opportunityText
        ) {
            const missionKeywords = [
                "hygiene",
                "mobile",
                "homeless",
                "homelessness",
                "housing",
                "recovery",
                "substance",
                "stabilization",
                "workforce",
                "employment",
                "environment",
                "watershed",
                "river",
                "ocean",
                "beach",
                "community",
                "outreach",
                "health",
                "dignity",
                "veteran",
                "volunteer",
                "nonprofit",
                "sober living",
                "self-sufficiency"
            ];

            const relevantKeywords = missionKeywords.filter(
                (keyword) =>
                    organizationText.includes(keyword)
            );

            if (relevantKeywords.length === 0) {
                return 50;
            }

            const matchedKeywords = relevantKeywords.filter(
                (keyword) =>
                    opportunityText.includes(keyword)
            );

            const rawScore =
                (matchedKeywords.length /
                    relevantKeywords.length) *
                100;

            return Math.max(
                20,
                Math.min(100, Math.round(rawScore))
            );
        },

        evaluateEligibility(opportunity, profile) {
            if (
                opportunity.eligibleApplicants.length === 0
            ) {
                return 60;
            }

            const applicantText =
                opportunity.eligibleApplicants
                    .join(" ")
                    .toLowerCase();

            const organizationText = [
                profile.organization?.organizationType || "",
                profile.organization?.federalTaxStatus || "",
                profile.organization?.legalName || ""
            ]
                .join(" ")
                .toLowerCase();

            if (
                applicantText.includes("nonprofit") ||
                applicantText.includes("501(c)(3)") ||
                applicantText.includes("public charity")
            ) {
                return 95;
            }

            if (
                applicantText.includes("organization") ||
                applicantText.includes("community")
            ) {
                return 75;
            }

            if (
                applicantText
                    .split(" ")
                    .some((word) =>
                        organizationText.includes(word)
                    )
            ) {
                return 70;
            }

            return 40;
        },

        evaluateGeography(opportunity, profile) {
            if (!opportunity.geography) {
                return 60;
            }

            const grantGeography =
                opportunity.geography.toLowerCase();

            const organizationGeography = (
                profile.organization?.serviceArea || ""
            ).toLowerCase();

            if (
                grantGeography.includes("national") ||
                grantGeography.includes("united states") ||
                grantGeography.includes("california") ||
                grantGeography.includes("santa cruz")
            ) {
                return 95;
            }

            if (
                organizationGeography &&
                grantGeography.includes(
                    organizationGeography
                )
            ) {
                return 100;
            }

            return 45;
        },

        evaluateDeadline(deadline) {
            if (!deadline) {
                return 50;
            }

            const deadlineDate = new Date(deadline);

            if (Number.isNaN(deadlineDate.getTime())) {
                return 50;
            }

            const millisecondsRemaining =
                deadlineDate.getTime() - Date.now();

            const daysRemaining = Math.ceil(
                millisecondsRemaining /
                    (1000 * 60 * 60 * 24)
            );

            if (daysRemaining < 0) {
                return 0;
            }

            if (daysRemaining < 7) {
                return 30;
            }

            if (daysRemaining < 21) {
                return 65;
            }

            if (daysRemaining < 60) {
                return 90;
            }

            return 100;
        },

        evaluateFundingAmount(opportunity, mission) {
            if (!opportunity.fundingAmount) {
                return opportunity.fundingRange ? 75 : 60;
            }

            if (
                mission?.minimumFunding &&
                opportunity.fundingAmount <
                    mission.minimumFunding
            ) {
                return 45;
            }

            if (
                mission?.maximumFunding &&
                opportunity.fundingAmount >
                    mission.maximumFunding
            ) {
                return 75;
            }

            return 90;
        },

        evaluateDocumentReadiness(opportunity) {
            if (
                opportunity.requiredDocuments.length === 0
            ) {
                return 65;
            }

            if (
                opportunity.requiredDocuments.length <= 5
            ) {
                return 85;
            }

            if (
                opportunity.requiredDocuments.length <= 10
            ) {
                return 70;
            }

            return 55;
        },

        getScoreRating(score) {
            if (score >= 85) {
                return "Exceptional Fit";
            }

            if (score >= 70) {
                return "Strong Fit";
            }

            if (score >= 50) {
                return "Possible Fit";
            }

            return "Low Fit";
        },

        buildRecommendedAction(evaluation) {
            if (evaluation.totalScore >= 85) {
                return "Advance immediately to application development and Executive Review.";
            }

            if (evaluation.totalScore >= 70) {
                return "Verify remaining requirements and prepare for Executive Review.";
            }

            if (evaluation.totalScore >= 50) {
                return "Conduct additional research before committing organizational resources.";
            }

            return "Log the opportunity and prioritize stronger mission-aligned funding sources.";
        },

        assignDocumentOffice(documentName) {
            const normalized =
                documentName.toLowerCase();

            if (
                normalized.includes("budget") ||
                normalized.includes("financial")
            ) {
                return "Finance Office";
            }

            if (
                normalized.includes("irs") ||
                normalized.includes("bylaws") ||
                normalized.includes("articles") ||
                normalized.includes("certification")
            ) {
                return "Compliance Office";
            }

            if (
                normalized.includes("program") ||
                normalized.includes("outcome") ||
                normalized.includes("implementation")
            ) {
                return "Programs Office";
            }

            if (
                normalized.includes("letter of support") ||
                normalized.includes("partner")
            ) {
                return "Community Relations Office";
            }

            if (
                normalized.includes("biograph") ||
                normalized.includes("board") ||
                normalized.includes("mission")
            ) {
                return "Executive Office";
            }

            return "Grant Office";
        },

        createId(prefix) {
            const randomPart = Math.random()
                .toString(36)
                .slice(2, 9);

            return `${prefix}-${Date.now()}-${randomPart}`;
        },

        getStatus() {
            return {
                name: this.name,
                version: this.version,
                status: this.status,
                operatingMode: this.operatingMode,
                activeMissionCount:
                    this.activeMissions.length,
                opportunityCount:
                    this.opportunities.length,
                executiveReviewCount:
                    this.executiveReviews.length,
                organizationConnected:
                    Boolean(this.getOrganizationProfile())
            };
        }
    };

    global.GrantOffice = GrantOffice;

    console.info(
        `[MEOS] ${GrantOffice.name} v${GrantOffice.version} online.`
    );

    console.info(
        "[MEOS Grant Office] Organizational Profile connected:",
        Boolean(global.OrganizationalProfile)
    );
})(window);
