# MEOS Persistence Authority Ledger

**Commission:** 006.017D0 — Persistence Authority Recon

**Status:** Recon authority. No runtime behavior change.

## Non-Negotiable Compass

1. **GitHub is code authority.** Engines, offices, adapters, server code, schemas, tests, versions, and release artifacts remain in GitHub.
2. **MEOS Institutional Repository is durable organizational-state authority.** The Core speaks a provider-neutral repository contract.
3. **Google Workspace is the current CCSP durable-storage provider, not the MEOS architecture.** Another deployment may use another provider without rewriting executive engines.
4. **IndexedDB is local cache/offline continuity only after migration.** It must not remain sole authority for institutional state.
5. **localStorage is legacy or UI-only.** It must not remain authoritative for missions, cognition, learning, decisions, evidence, workflows, automation, office state, or organization strategy.
6. **Render filesystem is not production institutional authority while ephemeral.** It may remain a cache/export/recovery staging layer.
7. **No bulk migration.** One bounded consumer → one commit → one live test → commission → next consumer.
8. **No deletion before verified copy.** Every migration must prove write → read → semantic equality → restart/reload recovery before legacy authority is demoted.
9. **Authority is explicit at runtime.** Every migrated subsystem must expose its active authority, fallback/cache role, last durable write, last durable read, and degraded state.
10. **Failure is fail-visible, not silent.** If durable authority is unavailable, Maddy continues safely in bounded local mode and reports that institutional durability is degraded.

## Verified MAIN Snapshot

- `server.js`: v2.10.13
- Google Workspace Integration: v1.5.4 / `GWI154-INSTITUTIONAL-REPOSITORY-ACCEPTANCE-BRIDGE-20260808-A`
- `google-workspace-provider.js`: v1.3.0 / `GWP130-INSTITUTIONAL-REPOSITORY-PROTOTYPE-20260808-A`
- Commission 006.017C institutional repository server acceptance route is present in MAIN.
- JavaScript files containing direct `localStorage` access: **27**
- JavaScript files containing IndexedDB access: **4**
- JavaScript files referencing Executive Memory: **4**
- JavaScript files containing Institutional Repository provider logic: **2**

## Memory Classes

| Class | Meaning | Durable? | Examples |
|---|---|---:|---|
| ephemeral | Re-creatable UI/runtime state | No | panel state, transient timers |
| working | Short-lived reasoning/search/cache state | Usually no; promote when consequential | search cache, parse buffers |
| operational | Work that must resume correctly | Yes | missions, workflows, monitors, automation definitions |
| institutional | Organizational knowledge/history | Yes | cognition history, learned preferences, strategic context |
| evidentiary | Source/provenance/verification records | Yes + verification | official evidence, submissions, approvals, outcomes |
| constitutional | Governing identity/mission/policy state | Yes + versioned governance | organization strategy, constitutional controls |

## Persistence Migration Ledger

| File / subsystem | Current persistence | Current authority | State class | Required destination / role | Order |
|---|---|---|---|---|---|
| `server.js` | server filesystem JSON under MEOS_DATA_DIR | **ephemeral-fallback on current Render when MEOS_DATA_DIR is not persistent** | institutional/evidentiary | Migrate collection authority behind MEOS Institutional Repository; keep filesystem only as cache/export/recovery staging. | **P1** |
| `google-workspace-provider.js` | Google Drive app-managed MEOS Institutional Repository + local token file/env refresh token | **verified durable-provider primitive** | institutional/evidentiary | Keep as CCSP durable provider adapter; never make Google semantics the MEOS Core contract. | **FOUNDATION** |
| `frontend/knowledge-engine.js` | /api/executive-memory | **executive-memory** | institutional/evidentiary | Move endpoint backing authority to MEOS Institutional Repository without changing Knowledge Engine contract first. | **P2** |
| `frontend/knowledge-memory.js` | /api/executive-memory | **executive-memory** | institutional | Move endpoint backing authority to MEOS Institutional Repository; retain localStorage migration only. | **P2** |
| `frontend/website-intelligence.js` | /api/executive-memory + localStorage temporary cache | **executive-memory** | evidentiary/working | Keep cache local; durable evidence must resolve through repository authority. | **P2** |
| `frontend/mission-engine.js` | IndexedDB; localStorage fallback/migration | **IndexedDB on this laptop** | operational | First production consumer of Repository Authority; IndexedDB becomes cache/offline queue only. | **P3** |
| `frontend/executive-brain.js` | IndexedDB; localStorage fallback/migration | **IndexedDB on this laptop** | institutional cognition/working | Persist bounded institutional cognition through Repository Authority; keep hot cognition in RAM and IndexedDB cache. | **P4** |
| `frontend/provider-manager.js` | IndexedDB; localStorage fallback/migration | **IndexedDB on this laptop** | operational/audit | Persist provider history/config state through Repository Authority; secrets remain environment/provider credential stores. | **P5** |
| `frontend/executive-learning.js` | IndexedDB; localStorage fallback/migration | **IndexedDB on this laptop** | institutional learning | Persist approved learning/trust history through Repository Authority; local IndexedDB cache only. | **P6** |
| `frontend/document-ingestion.js` | localStorage | **browser localStorage** | working/evidentiary metadata | Move durable ingestion state/evidence references behind Repository Authority; transient parse buffers may remain local. | **P7** |
| `frontend/document-classifier.js` | localStorage | **browser localStorage** | working/institutional labels | Persist durable classifications through Repository Authority; cache derived results locally. | **P7** |
| `frontend/institutional-reasoning.js` | localStorage | **browser localStorage** | institutional cognition | Move bounded strategic reasoning state behind Repository Authority. | **P7** |
| `frontend/executive-planning.js` | localStorage | **browser localStorage** | operational | Move active plans and accepted plan state behind Repository Authority. | **P8** |
| `frontend/executive-workflow.js` | localStorage | **browser localStorage** | operational | Move workflow state/checkpoints behind Repository Authority. | **P8** |
| `frontend/executive-decision.js` | localStorage | **browser localStorage** | institutional/audit | Decisions and approval history become durable institutional/audit records. | **P8** |
| `frontend/executive-collaboration.js` | localStorage | **browser localStorage** | operational | Move collaboration work state behind Repository Authority. | **P8** |
| `frontend/executive-monitoring.js` | localStorage | **browser localStorage** | operational | Persist monitors/alerts that must survive device loss; keep transient polling state local. | **P8** |
| `frontend/executive-search.js` | localStorage | **browser localStorage** | working | Search history/cache can remain local unless promoted to institutional evidence or mission context. | **P9** |
| `frontend/executive-recall.js` | localStorage | **browser localStorage** | working/institutional | Recall cache local; durable recalled knowledge remains repository-backed. | **P9** |
| `frontend/executive-router.js` | localStorage | **browser localStorage** | operational/telemetry | Persist only durable routing/audit state; runtime routing tables remain ephemeral. | **P9** |
| `frontend/executive-automation.js` | localStorage with quota circuit breaker | **browser localStorage** | operational | Move automation definitions/run history requiring continuity behind Repository Authority; local queue/cache only. | **P10** |
| `frontend/mission-dispatcher.js` | localStorage | **browser localStorage** | operational | Move dispatcher continuity/run state behind Repository Authority after Mission Engine. | **P10** |
| `frontend/grant-office.js` | localStorage | **browser localStorage** | operational/institutional | Move grant desk durable state behind Repository Authority. | **P11** |
| `frontend/executive-opportunity-office.js` | localStorage | **browser localStorage** | operational/institutional | Move opportunity desk durable state behind Repository Authority. | **P11** |
| `frontend/executive-build-portfolio.js` | localStorage | **browser localStorage** | institutional/project | Persist accepted build portfolio/checkpoints behind Repository Authority or GitHub metadata where code-release specific. | **P12** |
| `frontend/ccsp-long-term-strategy.js` | localStorage | **browser localStorage** | constitutional/organization package | Move organization strategy authority into Organization Package/repository with versioned governance; local cache only. | **P12** |
| `frontend/maddy-identity.js` | localStorage | **browser localStorage** | identity/profile | Separate product identity defaults from organization/user profile state; durable profile through authorized package/repository. | **P12** |
| `frontend/office-dashboard.js` | localStorage | **browser localStorage** | ephemeral/UI preference | Keep UI preferences local unless a setting is explicitly organization-wide. | **KEEP LOCAL** |

## Migration Sequence — Do Not Improvise

**Foundation — already proven:** Google Workspace app-managed repository primitive and live server acceptance bridge.

**P1 — Repository Authority service:** establish the provider-neutral server contract over the existing Google adapter. It owns classification, authority selection, durable write/read/verify semantics, degraded mode, and status.

**P2 — Executive Memory backing store:** move the existing `/api/executive-memory` server collections behind Repository Authority. This immediately upgrades Knowledge Engine, Knowledge Memory, and durable Website Intelligence evidence without rewriting each frontend engine.

**P3 — Mission Engine:** cloud authority + IndexedDB cache/offline queue. Test mission write, reload, cross-session recovery, degraded local operation, and resynchronization.

**P4–P6 — Executive Brain, Provider Manager, Executive Learning:** migrate the current IndexedDB temporary authorities one at a time.

**P7–P12 — legacy localStorage engines:** migrate by consequence, not alphabetically. Operational/evidentiary state moves first; UI-only state remains local.

## Mandatory Acceptance Gate for Every Migration

- Existing commissioned behavior still passes.
- New durable record is written through Repository Authority.
- Durable record can be read back and verified for semantic equality.
- Browser reload/device-local cache clear does not destroy durable institutional truth.
- Local cache can rebuild from durable authority.
- Durable-provider outage produces an explicit degraded state, not data loss or fake success.
- No new external authority is granted merely by persistence.
- Legacy local authority is removed/demoted only after the above passes.
- Runtime status names the actual active authority.

## Stop Conditions

Stop the migration immediately if a proposed commission:

- moves source code into Drive or any customer data store;
- hard-codes MEOS Core to Google semantics;
- introduces a fourth persistence authority;
- deletes local state before durable verification;
- changes more than the bounded subsystem required for the current migration gate;
- cannot explain what survives loss of the browser, laptop, Render instance, or provider connection.

## Current Compass

**Next build after this recon:** 006.017D1 — Provider-Neutral Repository Authority service. Then P2 moves the existing Executive Memory backing store behind it before any additional engine-by-engine migration.

This ledger is the migration compass until explicitly superseded by a later ratified persistence-authority version. Later implementation work must update this ledger's status rather than inventing a new persistence direction.
