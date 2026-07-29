/**
 * MEOS Workflow Engine
 * Version: 1.0.0
 *
 * Mission:
 * Provide a universal, local-first workflow system for MEOS.
 *
 * Design principles:
 * - Organization-neutral
 * - Local-first
 * - No paid API dependency
 * - No cloud dependency
 * - Compatible with nonprofits, businesses, and government
 * - Executive-office ownership
 * - Persistent browser storage
 */

(function initializeWorkflowEngine(global) {
    "use strict";

    const ENGINE_NAME = "MEOS Workflow Engine";
    const ENGINE_VERSION = "1.0.0";
    const STORAGE_KEY = "meos.workflows.v1";

    const WORKFLOW_STATUSES = Object.freeze([
        "draft",
        "queued",
        "active",
        "blocked",
        "review",
        "completed",
        "cancelled",
        "archived"
    ]);

    const WORKFLOW_PRIORITIES = Object.freeze([
        "low",
        "normal",
        "high",
        "urgent",
        "critical"
    ]);

    const DEFAULT_STAGES = Object.freeze([
        "intake",
        "planning",
        "execution",
        "review",
        "completion"
    ]);

    function generateId(prefix = "workflow") {
        const randomPart = Math.random().toString(36).slice(2, 10);
        const timePart = Date.now().toString(36);

        return `${prefix}_${timePart}_${randomPart}`;
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function normalizeText(value, fallback = "") {
        if (typeof value !== "string") {
            return fallback;
        }

        return value.trim();
    }

    function validateStatus(status) {
        return WORKFLOW_STATUSES.includes(status);
    }

    function validatePriority(priority) {
        return WORKFLOW_PRIORITIES.includes(priority);
    }

    function validateStages(stages) {
        return (
            Array.isArray(stages) &&
            stages.length > 0 &&
            stages.every(
                (stage) =>
                    typeof stage === "string" &&
                    stage.trim().length > 0
            )
        );
    }

    function createHistoryEntry(action, details = {}) {
        return {
            id: generateId("history"),
            action,
            details: clone(details),
            timestamp: nowIso()
        };
    }

    function buildWorkflow(input = {}) {
        const title = normalizeText(input.title);

        if (!title) {
            throw new Error("Workflow title is required.");
        }

        const priority = validatePriority(input.priority)
            ? input.priority
            : "normal";

        const status = validateStatus(input.status)
            ? input.status
            : "draft";

        const stages = validateStages(input.stages)
            ? input.stages.map((stage) => stage.trim())
            : [...DEFAULT_STAGES];

        const currentStage = stages.includes(input.currentStage)
            ? input.currentStage
            : stages[0];

        const createdAt = nowIso();

        const workflow = {
            id: input.id || generateId(),
            title,
            description: normalizeText(input.description),
            organizationId: normalizeText(input.organizationId, "default"),
            departmentId: normalizeText(input.departmentId),
            ownerOffice: normalizeText(input.ownerOffice, "unassigned"),
            assignedTo: normalizeText(input.assignedTo),
            requestedBy: normalizeText(input.requestedBy),
            status,
            priority,
            stages,
            currentStage,
            progress: Number.isFinite(input.progress)
                ? Math.max(0, Math.min(100, input.progress))
                : 0,
            dueDate: input.dueDate || null,
            tags: Array.isArray(input.tags)
                ? input.tags
                    .filter((tag) => typeof tag === "string")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                : [],
            dependencies: Array.isArray(input.dependencies)
                ? [...input.dependencies]
                : [],
            blockedReason: normalizeText(input.blockedReason),
            notes: Array.isArray(input.notes)
                ? clone(input.notes)
                : [],
            metadata:
                input.metadata &&
                typeof input.metadata === "object" &&
                !Array.isArray(input.metadata)
                    ? clone(input.metadata)
                    : {},
            createdAt,
            updatedAt: createdAt,
            completedAt: null,
            history: [
                createHistoryEntry("workflow.created", {
                    title,
                    status,
                    priority,
                    currentStage
                })
            ]
        };

        if (status === "completed") {
            workflow.progress = 100;
            workflow.completedAt = createdAt;
        }

        return workflow;
    }

    class WorkflowEngine {
        constructor() {
            this.name = ENGINE_NAME;
            this.version = ENGINE_VERSION;
            this.workflows = [];
            this.listeners = new Set();

            this.load();
        }

        load() {
            try {
                const stored = global.localStorage.getItem(STORAGE_KEY);

                if (!stored) {
                    this.workflows = [];
                    return this.getAll();
                }

                const parsed = JSON.parse(stored);

                if (!Array.isArray(parsed)) {
                    throw new Error("Stored workflow data is invalid.");
                }

                this.workflows = parsed;
                return this.getAll();
            } catch (error) {
                console.error(
                    `[${ENGINE_NAME}] Failed to load workflows:`,
                    error
                );

                this.workflows = [];
                return [];
            }
        }

        save() {
            try {
                global.localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(this.workflows)
                );

                this.emit("workflow.storage.saved", {
                    count: this.workflows.length
                });

                return true;
            } catch (error) {
                console.error(
                    `[${ENGINE_NAME}] Failed to save workflows:`,
                    error
                );

                return false;
            }
        }

        subscribe(listener) {
            if (typeof listener !== "function") {
                throw new TypeError("Workflow listener must be a function.");
            }

            this.listeners.add(listener);

            return () => {
                this.listeners.delete(listener);
            };
        }

        emit(type, payload = {}) {
            const event = {
                type,
                payload: clone(payload),
                timestamp: nowIso(),
                engine: ENGINE_NAME,
                version: ENGINE_VERSION
            };

            this.listeners.forEach((listener) => {
                try {
                    listener(event);
                } catch (error) {
                    console.error(
                        `[${ENGINE_NAME}] Listener error:`,
                        error
                    );
                }
            });

            global.dispatchEvent(
                new CustomEvent("meos:workflow", {
                    detail: event
                })
            );

            return event;
        }

        create(input) {
            const workflow = buildWorkflow(input);

            this.workflows.push(workflow);
            this.save();

            this.emit("workflow.created", {
                workflow: clone(workflow)
            });

            return clone(workflow);
        }

        getById(workflowId) {
            const workflow = this.workflows.find(
                (item) => item.id === workflowId
            );

            return workflow ? clone(workflow) : null;
        }

        getAll(filters = {}) {
            let results = [...this.workflows];

            if (filters.organizationId) {
                results = results.filter(
                    (workflow) =>
                        workflow.organizationId === filters.organizationId
                );
            }

            if (filters.status) {
                results = results.filter(
                    (workflow) => workflow.status === filters.status
                );
            }

            if (filters.priority) {
                results = results.filter(
                    (workflow) => workflow.priority === filters.priority
                );
            }

            if (filters.ownerOffice) {
                results = results.filter(
                    (workflow) =>
                        workflow.ownerOffice === filters.ownerOffice
                );
            }

            if (filters.currentStage) {
                results = results.filter(
                    (workflow) =>
                        workflow.currentStage === filters.currentStage
                );
            }

            if (filters.search) {
                const query = String(filters.search).toLowerCase();

                results = results.filter((workflow) => {
                    const searchable = [
                        workflow.title,
                        workflow.description,
                        workflow.organizationId,
                        workflow.departmentId,
                        workflow.ownerOffice,
                        workflow.assignedTo,
                        workflow.requestedBy,
                        workflow.status,
                        workflow.priority,
                        ...workflow.tags
                    ]
                        .join(" ")
                        .toLowerCase();

                    return searchable.includes(query);
                });
            }

            return clone(results);
        }

        update(workflowId, changes = {}) {
            const index = this.workflows.findIndex(
                (workflow) => workflow.id === workflowId
            );

            if (index === -1) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }

            const existing = this.workflows[index];
            const previous = clone(existing);

            if (
                Object.prototype.hasOwnProperty.call(changes, "status") &&
                !validateStatus(changes.status)
            ) {
                throw new Error(
                    `Invalid workflow status: ${changes.status}`
                );
            }

            if (
                Object.prototype.hasOwnProperty.call(changes, "priority") &&
                !validatePriority(changes.priority)
            ) {
                throw new Error(
                    `Invalid workflow priority: ${changes.priority}`
                );
            }

            if (
                Object.prototype.hasOwnProperty.call(changes, "stages") &&
                !validateStages(changes.stages)
            ) {
                throw new Error("Workflow stages must be a non-empty array.");
            }

            const protectedFields = new Set([
                "id",
                "createdAt",
                "history"
            ]);

            Object.entries(changes).forEach(([key, value]) => {
                if (!protectedFields.has(key)) {
                    existing[key] = clone(value);
                }
            });

            if (
                Array.isArray(existing.stages) &&
                !existing.stages.includes(existing.currentStage)
            ) {
                existing.currentStage = existing.stages[0];
            }

            if (existing.status === "completed") {
                existing.progress = 100;
                existing.completedAt =
                    existing.completedAt || nowIso();
            } else if (previous.status === "completed") {
                existing.completedAt = null;
            }

            existing.updatedAt = nowIso();

            existing.history.push(
                createHistoryEntry("workflow.updated", {
                    changes: clone(changes),
                    previous
                })
            );

            this.workflows[index] = existing;
            this.save();

            this.emit("workflow.updated", {
                workflow: clone(existing),
                previous
            });

            return clone(existing);
        }

        setStatus(workflowId, status, details = {}) {
            if (!validateStatus(status)) {
                throw new Error(`Invalid workflow status: ${status}`);
            }

            const workflow = this.getById(workflowId);

            if (!workflow) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }

            const changes = {
                status
            };

            if (status === "blocked") {
                changes.blockedReason = normalizeText(
                    details.blockedReason,
                    "No reason provided."
                );
            } else if (workflow.status === "blocked") {
                changes.blockedReason = "";
            }

            return this.update(workflowId, changes);
        }

        advanceStage(workflowId) {
            const workflow = this.getById(workflowId);

            if (!workflow) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }

            const stageIndex = workflow.stages.indexOf(
                workflow.currentStage
            );

            if (stageIndex === -1) {
                throw new Error(
                    `Current stage is invalid: ${workflow.currentStage}`
                );
            }

            if (stageIndex >= workflow.stages.length - 1) {
                return this.complete(workflowId);
            }

            const nextStage = workflow.stages[stageIndex + 1];
            const progress = Math.round(
                ((stageIndex + 1) /
                    (workflow.stages.length - 1)) *
                    100
            );

            return this.update(workflowId, {
                currentStage: nextStage,
                status: "active",
                progress
            });
        }

        moveToStage(workflowId, stage) {
            const workflow = this.getById(workflowId);

            if (!workflow) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }

            if (!workflow.stages.includes(stage)) {
                throw new Error(`Unknown workflow stage: ${stage}`);
            }

            const stageIndex = workflow.stages.indexOf(stage);
            const lastIndex = workflow.stages.length - 1;

            const progress =
                lastIndex === 0
                    ? 100
                    : Math.round((stageIndex / lastIndex) * 100);

            return this.update(workflowId, {
                currentStage: stage,
                progress,
                status:
                    stageIndex === lastIndex
                        ? "review"
                        : "active"
            });
        }

        assign(workflowId, assignment = {}) {
            return this.update(workflowId, {
                ownerOffice: normalizeText(
                    assignment.ownerOffice,
                    "unassigned"
                ),
                assignedTo: normalizeText(assignment.assignedTo)
            });
        }

        addNote(workflowId, noteInput = {}) {
            const workflow = this.getById(workflowId);

            if (!workflow) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }

            const content = normalizeText(noteInput.content);

            if (!content) {
                throw new Error("Workflow note content is required.");
            }

            const note = {
                id: generateId("note"),
                content,
                author: normalizeText(
                    noteInput.author,
                    "system"
                ),
                createdAt: nowIso()
            };

            workflow.notes.push(note);

            return this.update(workflowId, {
                notes: workflow.notes
            });
        }

        addDependency(workflowId, dependencyId) {
            if (workflowId === dependencyId) {
                throw new Error(
                    "A workflow cannot depend on itself."
                );
            }

            const workflow = this.getById(workflowId);
            const dependency = this.getById(dependencyId);

            if (!workflow) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }

            if (!dependency) {
                throw new Error(
                    `Dependency workflow not found: ${dependencyId}`
                );
            }

            const dependencies = new Set(workflow.dependencies);
            dependencies.add(dependencyId);

            return this.update(workflowId, {
                dependencies: [...dependencies]
            });
        }

        removeDependency(workflowId, dependencyId) {
            const workflow = this.getById(workflowId);

            if (!workflow) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }

            return this.update(workflowId, {
                dependencies: workflow.dependencies.filter(
                    (id) => id !== dependencyId
                )
            });
        }

        getUnresolvedDependencies(workflowId) {
            const workflow = this.getById(workflowId);

            if (!workflow) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }

            return workflow.dependencies
                .map((dependencyId) =>
                    this.getById(dependencyId)
                )
                .filter(
                    (dependency) =>
                        dependency &&
                        dependency.status !== "completed"
                );
        }

        complete(workflowId) {
            const unresolved =
                this.getUnresolvedDependencies(workflowId);

            if (unresolved.length > 0) {
                throw new Error(
                    "Workflow cannot be completed while dependencies remain unresolved."
                );
            }

            return this.update(workflowId, {
                status: "completed",
                progress: 100,
                completedAt: nowIso()
            });
        }

        cancel(workflowId, reason = "") {
            const workflow = this.getById(workflowId);

            if (!workflow) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }

            const notes = [...workflow.notes];

            if (normalizeText(reason)) {
                notes.push({
                    id: generateId("note"),
                    content: `Cancellation reason: ${reason.trim()}`,
                    author: "system",
                    createdAt: nowIso()
                });
            }

            return this.update(workflowId, {
                status: "cancelled",
                notes
            });
        }

        archive(workflowId) {
            return this.update(workflowId, {
                status: "archived"
            });
        }

        remove(workflowId) {
            const index = this.workflows.findIndex(
                (workflow) => workflow.id === workflowId
            );

            if (index === -1) {
                return false;
            }

            const [removed] = this.workflows.splice(index, 1);
            this.save();

            this.emit("workflow.removed", {
                workflow: clone(removed)
            });

            return true;
        }

        clearAll(options = {}) {
            if (options.confirm !== true) {
                throw new Error(
                    "clearAll requires { confirm: true }."
                );
            }

            const removedCount = this.workflows.length;
            this.workflows = [];
            this.save();

            this.emit("workflow.storage.cleared", {
                removedCount
            });

            return removedCount;
        }

        getSummary(filters = {}) {
            const workflows = this.getAll(filters);

            const summary = {
                total: workflows.length,
                byStatus: {},
                byPriority: {},
                byOwnerOffice: {},
                overdue: 0
            };

            WORKFLOW_STATUSES.forEach((status) => {
                summary.byStatus[status] = 0;
            });

            WORKFLOW_PRIORITIES.forEach((priority) => {
                summary.byPriority[priority] = 0;
            });

            const currentTime = Date.now();

            workflows.forEach((workflow) => {
                summary.byStatus[workflow.status] += 1;
                summary.byPriority[workflow.priority] += 1;

                const owner = workflow.ownerOffice || "unassigned";

                summary.byOwnerOffice[owner] =
                    (summary.byOwnerOffice[owner] || 0) + 1;

                if (
                    workflow.dueDate &&
                    workflow.status !== "completed" &&
                    workflow.status !== "cancelled" &&
                    workflow.status !== "archived"
                ) {
                    const dueTime = new Date(
                        workflow.dueDate
                    ).getTime();

                    if (
                        Number.isFinite(dueTime) &&
                        dueTime < currentTime
                    ) {
                        summary.overdue += 1;
                    }
                }
            });

            return summary;
        }

        exportData() {
            return {
                engine: ENGINE_NAME,
                version: ENGINE_VERSION,
                exportedAt: nowIso(),
                workflows: this.getAll()
            };
        }

        importData(data, options = {}) {
            if (
                !data ||
                typeof data !== "object" ||
                !Array.isArray(data.workflows)
            ) {
                throw new Error(
                    "Invalid workflow import package."
                );
            }

            if (options.replace === true) {
                this.workflows = clone(data.workflows);
            } else {
                const existingIds = new Set(
                    this.workflows.map((workflow) => workflow.id)
                );

                data.workflows.forEach((workflow) => {
                    if (!existingIds.has(workflow.id)) {
                        this.workflows.push(clone(workflow));
                    }
                });
            }

            this.save();

            this.emit("workflow.storage.imported", {
                count: data.workflows.length,
                replace: options.replace === true
            });

            return this.getAll();
        }

        getSystemStatus() {
            return {
                name: this.name,
                version: this.version,
                online: true,
                storage: "localStorage",
                storageKey: STORAGE_KEY,
                workflowCount: this.workflows.length,
                supportedStatuses: [...WORKFLOW_STATUSES],
                supportedPriorities: [...WORKFLOW_PRIORITIES],
                defaultStages: [...DEFAULT_STAGES],
                cloudRequired: false,
                apiRequired: false
            };
        }
    }

    const engine = new WorkflowEngine();

    global.MEOSWorkflowEngine = engine;

    console.log(
        `[MEOS] ${ENGINE_NAME} v${ENGINE_VERSION} online.`
    );
    console.log(
        `[MEOS] ${engine.workflows.length} workflow(s) loaded from local storage.`
    );
})(window);
