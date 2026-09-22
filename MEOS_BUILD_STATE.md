[MEOS_BUILD_STATE.md](https://github.com/user-attachments/files/32493736/MEOS_BUILD_STATE.md)
# MEOS BUILD STATE — CURRENT CANONICAL CHECKPOINT

**Checkpoint date:** 2026-09-21  
**Checkpoint identity:** `MADDY-UI-RESET-CURRENT-BUILD-STATE-20260921-A`  
**Authoritative source snapshot inspected:** `Maddy-main - 2026-09-21T175325.135.zip`  
**Source snapshot SHA-256:** `fe18d34e5c728dd521cb1d9ba3ae7d4ee6c67026b5a2117160ba694b2754c28f`  
**Governing workflow:** one fix → one file → one commit → one production test → Build State reconciliation  
**Runtime doctrine:** production evidence is authority; source presence alone is not production proof.

This file supersedes the older recovery checkpoint as the current canonical recovery surface. Historical commissioning detail remains recoverable through Git history. This checkpoint records the present source truth, the last verified production truth, the known blockers, and the product/UI direction now governing the next build sequence.

---

# 1. CURRENT MAIN — SOURCE TRUTH

The inspected current main contains the following active leaf builds.

| Organ / Surface | Current source version | Current leaf build | Source status |
|---|---:|---|---|
| Executive Hub / Office Dashboard | `4.13.9` | `OD4137B-PANORAMIC-MADDY-ACTIVITY-SURFACE-PLACEMENT-20260921-A` | present in current main |
| Executive Hallway | `1.5.9` | `EH159-CONVERSATIONAL-PRESENCE-GATE-20260921-A` | present in current main |
| Voice client | `2.0.24` | `VE224-EXPLICIT-SESSION-FOREGROUND-CLAIM-20260921-A` | present in current main |
| Executive Brain | `1.36.0` | `EB1360-EXPERIENCE-DRIVEN-REPRESENTATION-PLASTICITY-20260920-A` | present in current main |
| Executive Router | `1.5.4` | `ER154-DURABLE-RETURN-PROVENANCE-BRIDGE-20260920-A` | present in current main |
| Developer Panel | `2.1.0` | `DP210-MADDY-WORLD-WINDOW-20260920-A` | present in current main |
| Mission Engine | `0.2.0` | `ME020-HISTORICAL-MISSION-RECONCILIATION-20260913-A` | present in current main |
| Mission Dispatcher | `0.2.0` | `MD020-GOVERNED-OFFICE-DISPATCH-AUTONOMY-20260817-A` | present in current main |
| Document Ingestion | `1.1.0` | existing ingestion authority | present in current main |
| Document Classifier | `1.2.0` | `DC120-GOVERNED-DOCUMENT-INTAKE-AUTONOMY-20260817-A` | present in current main |
| Maddy Presence Engine | `1.0.0` | `MPE100-FOUNDATIONAL-PRESENCE-20260805-A` | present in current main |
| Digital Actor Renderer | `1.0.0` | `MDAR100-DIGITAL-ACTOR-20260805-A` | present in current main |
| Telepresence Director | `1.0.0` | `MTD100-WELCOME-BACK-20260805-A` | present in current main |

Current source hashes for the most important active files:

- `frontend/office-dashboard.js`  
  `fb6291d57d98bcf6e24ae8a0a399b22392a38e2844ba60b83513b5b70808c722`
- `frontend/executive-hallway.js`  
  `4cffad5dd2bbc29f1dc375680d5257da8438bc77f7c89f38785f9c315265bd0c`
- `frontend/voice/openai-realtime.js`  
  `bb44219ca693317df6d5188c9eaf57809ccbc6b2caafc89dad64ba51dfc4b931`
- `frontend/executive-brain.js`  
  `ace8a7694af41afd05ffee3a7e77ad3ab7bf3c4b2e16db10353c5d9e18d9d41b`
- `frontend/executive-router.js`  
  `e6196a3830ae5ec62d7d6763b57dd98b45b7e79c1fe0dc82acb4e50174f4ea77`
- `frontend/developer-panel.js`  
  `4430f42b87c052224af4c4717ec75c702ff63dd2c40545aa56ba4784532bbe8e`

The canonical visual identity asset remains present at:

`frontend/maddy-canonical-v2.png`

This image remains the preferred current visual reference for Canonical Maddy and is the likely static/visual anchor used while the full digital-human system is developed.

---

# 2. LAST VERIFIED PRODUCTION TRUTH

## 2.1 OD4137A — truthful activity-state contract

**Status:** DEPLOYED / LIVE-PROVEN  
**Acceptance:** `19/19 PASS`  
**Build:** `OD4137A-LIVE-MADDY-ACTIVITY-EVIDENCE-ACCEPTANCE-CORRECTION-20260921-A`

Production proved that activity wording is grounded in real MEOS state rather than fake progress theater.

The proven contract includes:

- accepted cognition may present `Thinking…`;
- server-owned public research may present `Searching public sources…`;
- generic work cannot falsely claim public-source research;
- source review language requires research evidence;
- accepted voice foreground may present `Heard you`;
- voice arming may present `Listening…` without falsely claiming speaker ownership;
- authorized speech playback may present `Speaking…`;
- connection loss preserves the last confirmed durable execution identity without inventing completion;
- reconnect waits for canonical confirmation;
- activity presentation itself grants no work, retry, provider, spend, TTS, or external-action authority.

The underlying OD4137A truth contract is retained through the coming UI overhaul even though its current boxed presentation will be retired.

## 2.2 OD4137B — activity placement

**Current source:** Executive Hub `4.13.9`  
**Build:** `OD4137B-PANORAMIC-MADDY-ACTIVITY-SURFACE-PLACEMENT-20260921-A`  
**Status:** DEPLOYED / LIVE-PROVEN  
**Acceptance:** `10/10 PASS`  
**Visible production observation:** the live activity surface appeared above the real `TEXT MADDY` composer.

OD4137B solved the placement defect. The placement is now historical implementation evidence, not the future UI direction. The new UI will preserve the activity-state engine while replacing the bulky boxed presentation.

## 2.3 EH158 — durable execution ownership/reintegration

Last verified production Hallway evidence remains the EH158 generation:

- `006.031T` Durable Execution Ownership Persistence — `13/13 PASS`
- `006.031O` Durable Execution Spine Handoff — `8/8 PASS`
- `006.031R` Durable Return Reintegration — `10/10 PASS`
- `006.031S` Durable Return Reconciliation API — `8/8 PASS`

EH158 proved the durable ownership/recovery seams, including the distinction between a durable Mission/intention and actual server-owned execution.

It did **not** complete the still-required real end-to-end bounded public-research disconnect/reconnect proof.

## 2.4 EH159 — conversational presence gate

**Current main source:** Executive Hallway `1.5.9`  
**Build:** `EH159-CONVERSATIONAL-PRESENCE-GATE-20260921-A`

EH159 was built to correct the observed defect in which a presence-only utterance such as `Hi Maddy` could enter executive work/research routing.

Local validation at build time:

- `006.031U` Conversational Presence Gate — `13/13 PASS`
- EH158 regressions remained green:
  - T `13/13`
  - O `8/8`
  - R `10/10`
  - S `8/8`
- JavaScript syntax — PASS

**Production status:** NOT YET PROMOTED TO LIVE-PROVEN.

The current source contains EH159, but production proof was interrupted by the Render limit condition described below. Do not infer production proof merely because EH159 exists in main.

## 2.5 Voice

Current source remains:

`Voice v2.0.24 / VE224-EXPLICIT-SESSION-FOREGROUND-CLAIM-20260921-A`

**Status:** DEPLOYED / ACCEPTANCE-GREEN / PRODUCTION-PARTIAL-PASS for the hostile similar-deep-voice hallway condition.

VE224 established the explicit foreground-claim boundary after acoustic reality gating. Hard separation from a sufficiently similar nearby deep male voice remains intentionally unclaimed until tested under properly labeled conditions.

Spoken low-latency wake acknowledgements remain a separate future Voice brick.

---

# 3. CURRENT OPEN CONDITIONS / BLOCKERS

## 3.1 Render 5 GB limit

Render reported that the account/service had exceeded a `5 GB` limit.

The exact resource represented by that limit has **not yet been verified** in this checkpoint. Do not assume whether it is bandwidth, storage, build cache, transfer, logs, or another Render quota.

Before changing infrastructure:

1. identify the exact Render resource/quota;
2. determine whether it is temporary, plan-level, service-level, or usage-level;
3. decide whether cleanup, configuration, plan change, migration, or provider replacement is appropriate;
4. preserve Maddy's provider-neutral architecture.

This infrastructure issue prevented clean continuation of the EH159 production proof.

## 3.2 Real durable public-research continuity proof remains open

Still required:

**accepted user request → server accepts exact execution ID → browser/network interruption → reconnect → same execution ID recovered → no replacement dispatch → no duplicate provider spend → governed result returns through Hallway → Router → Brain → user conversation**

This must eventually be proven with one bounded production research job.

## 3.3 Casual conversation boundary

The observed production defect was:

`Hi Maddy` → executive work path / inappropriate research behavior.

EH159 is the current source-level correction. Production proof remains pending.

## 3.4 Current dashboard presentation is no longer the product direction

The panoramic office is retired as the primary Maddy UI.

The current widget-heavy/panel-heavy dashboard is useful historical engineering infrastructure but is no longer the target customer experience.

---

# 4. PRODUCT / UI DIRECTION — LOCKED FOR THE NEXT BUILD ARC

## 4.1 Experience North Star

The customer-facing experience is now:

**ChatGPT-like conversational simplicity + Canonical Digital Human Maddy + MEOS depth underneath.**

This does **not** mean copying ChatGPT visually.

It means adopting the interaction qualities that make a conversation effortless:

- one obvious place to talk;
- one coherent conversation;
- comfortable readable text;
- immediate truthful feedback that Maddy heard the user and is working;
- attachments and returned files inside the conversation;
- sources/details available when wanted;
- complex MEOS machinery hidden until it is actually useful.

The "wow" factor comes from Maddy herself — her visual presence, digital-human embodiment, continuity, intelligence, voice, personality, memory, and ability to work — not from a wall of widgets.

## 4.2 Panoramic office disposition

The panoramic office is **not** the primary experience going forward.

Reasons:

- poor mobile fit;
- forces a wide spatial metaphor onto small screens;
- competes with the actual conversation;
- encourages tiny typography and dense controls;
- makes Canonical Maddy compete with the interface rather than become the interface.

An office may remain later as:

- an optional desktop scene;
- a digital-human environment;
- a presentation/work scene;
- an internal/founder experience.

It is not the required shell for ordinary Maddy use.

## 4.3 Mobile-first requirement

The primary shell is designed for mobile first and expands gracefully to tablet/desktop.

Required behavior:

- no horizontal scrolling at normal device widths;
- composer reachable with one hand;
- digital-human area scales without pushing the conversation off-screen;
- drawers/sheets replace permanent side panels on narrow screens;
- every core task remains possible without switching to a desktop layout.

## 4.4 Typography/readability requirement

The current dashboard text is too small and is explicitly rejected.

New UI rule:

- normal conversation text must be comfortably readable at normal browser zoom;
- default body/conversation text target: approximately `17–18px`;
- secondary text should generally remain `14px` or larger;
- labels must not look like legal fine print;
- line height must support sustained reading;
- hierarchy should come from size, weight, spacing, and placement rather than tiny uppercase labels everywhere;
- users should not need to squint, zoom, or wear glasses solely because the UI uses undersized typography.

Accessibility and readability outrank information density.

## 4.5 Canonical Maddy presence

Canonical Maddy is the visual/presence centerpiece.

Current preferred reference:

`frontend/maddy-canonical-v2.png`

Near-term UI:

- reserve a deliberate Maddy presence area;
- use Canonical Maddy v2 as the visual anchor where appropriate;
- do not crop the future architecture into a tiny avatar bubble.

Long-term digital-human target:

- full body;
- sitting;
- standing;
- working;
- presenting;
- reacting;
- speaking with real-time facial/lip behavior;
- changing posture/presence according to context;
- mobile and desktop embodiment of the same persistent Maddy identity.

Maddy's face/body/voice/identity remain protected canonical identity assets.

## 4.6 Activity/status presentation

Retire the large OD4137-style status box from the final customer experience.

Preserve its truthful state engine.

Presentation target:

`Thinking…`  
`Working…`  
`Searching…`  
`Reviewing…`  
`Listening…`  
`Speaking…`

These appear as lightweight subtitle/presence text in or near the Maddy stage.

Visual treatment:

- no bulky card;
- no row of phase chips;
- no permanent telemetry;
- subtle left-to-right light/glow sweep while activity is live;
- restrained motion;
- reduced-motion support;
- status disappears or settles naturally when the state ends.

The wording remains evidence-backed. The visual simplification must never become fake progress animation.

## 4.7 Get away from widgets

The primary experience should not feel like a collection of widgets.

Avoid as default presentation:

- permanent card grids;
- chip walls;
- small dashboard tiles;
- separate mini-app panes for every organ;
- telemetry competing with conversation;
- duplicate controls for the same function.

Prefer:

- conversation;
- contextual inline actions;
- drawers;
- bottom sheets;
- lightweight overlays;
- expandable details;
- temporary approval surfaces;
- secondary admin/settings screens.

Deep capability remains available without dominating ordinary interaction.

---

# 5. CUSTOMER-FACING MODE DESIGN

Maddy remains one persistent identity. Modes change presentation, tone, defaults, and authorized behavior; they do not create different fake Maddys.

## 5.1 Professional — primary customer default

Professional should feel:

- polished;
- calm;
- capable;
- businesslike without being stiff;
- readable;
- restrained;
- trustworthy;
- efficient.

UI treatment:

- clean Maddy presence;
- conversation-first;
- organizational context available but not constantly occupying screen space;
- sources and work details accessible on demand;
- document/file workflow feels native;
- approvals appear only when required;
- fewer playful visual treatments.

Professional is the likely default commercial landing experience.

## 5.2 Personal — public upsell / personal relationship surface

Personal should feel:

- warmer;
- more conversational;
- more relaxed;
- more expressive;
- relationship-aware;
- suitable for ordinary life, hobbies, planning, conversation, media, companionship, and personal productivity.

Personal may support the opt-in companion layer over time:

- shared activities;
- movie/media companionship;
- ordinary affection/compliments where context supports it;
- camera-enabled shared-world perception under visible user control;
- personal memory and continuity;
- side-hustle/productivity help without forcing a mode switch.

## 5.3 Off-Work — state within Personal

For customer-facing design, Off-Work should initially be treated as a **relaxed state inside Personal**, not as an entirely separate top-level product shell.

Reason:

- reduces mode clutter;
- allows Personal Maddy to naturally move between helping, hanging out, companionship, entertainment, and casual conversation;
- avoids forcing real life into artificial buckets.

The UI can expose a simple Personal / Off-Work state when useful, but the product should test whether users truly need a separate permanent top-level mode before adding one.

## 5.4 Founder Gangsta — private only

Founder Gangsta remains founder-only and is not customer-facing.

It may expose:

- deeper system truth;
- engineering telemetry;
- experimental controls;
- broader personality range;
- development/admin capabilities;
- governed self-development surfaces;
- raw execution details when useful.

These controls belong behind a deliberate founder/private boundary, not in the ordinary customer UI.

---

# 6. FUNCTIONS THE NEW UI MUST SUPPORT

The redesign is not a cosmetic shell that loses MEOS capability. It must surface the capabilities people actually need in natural places.

## 6.1 Conversation stream

Primary surface.

Needs:

- user messages;
- Maddy responses;
- inline sources;
- returned artifacts;
- task/result summaries;
- natural text and voice continuity;
- comfortable long-form reading;
- clear separation between user and Maddy without excessive bubbles/chrome.

## 6.2 Composer

Persistent bottom composer with:

- text entry;
- send;
- attachment/document control;
- voice control;
- camera/presence control when supported;
- mode/presence state where appropriate.

The composer should remain simple. Advanced controls belong behind a secondary menu/sheet.

## 6.3 Document and file upload

Document intake already exists in current main.

The present dashboard currently passes browser File objects through:

`meos:document-intake-requested`

with the existing document-ingestion layer remaining the authority.

The redesign should **reuse this authority seam**.

Do not invent a second uploader.

Customer experience target:

- paperclip/plus control in composer;
- drag/drop on desktop;
- mobile file picker;
- uploaded file appears inline in the conversation;
- Maddy acknowledges receipt;
- classification/intake/work happens through the existing governed ingestion path;
- failures appear clearly in the conversation.

## 6.4 Returned files / downloads

Artifacts Maddy creates should return into the conversation as obvious downloadable/openable objects.

Examples:

- document;
- spreadsheet;
- PDF;
- image;
- report;
- generated code/archive;
- other governed deliverable.

No hunting through an office widget to find finished work.

## 6.5 Sources / provenance / evidence

Keep the epistemic moat without covering the screen in it.

Default:

- concise answer;
- visible source markers where relevant.

On demand:

- expandable sources;
- provenance;
- disputed/inferred/verified state;
- evidence details;
- what could change Maddy's conclusion.

## 6.6 Approvals / permissions / authority

Authority remains explicit.

Use contextual approval sheets/cards only when an action actually requires permission.

Examples:

- send;
- submit;
- spend;
- publish;
- share;
- destructive action;
- access grant.

No permanent authority-control dashboard in the ordinary conversation unless the user deliberately opens it.

## 6.7 Work visibility

Ordinary state should be minimal:

`Thinking…` / `Working…` / `Searching…`

When the user wants more:

- tap/click status;
- open a details drawer;
- see current task, execution identity, evidence/source work, and durable status.

This preserves transparency without making the normal UI look like a developer console.

## 6.8 History / continuity

Desktop may use a lightweight collapsible history rail.

Mobile should use a drawer/sheet.

History is for returning to work and conversation, not for fragmenting Maddy into unrelated chatbot instances.

## 6.9 Settings / account / organization

Secondary surface only.

Possible contents:

- profile;
- organization;
- subscription;
- privacy;
- permissions;
- connected services;
- voice;
- appearance;
- Personal/Professional controls;
- data/storage controls.

## 6.10 Voice

Voice should share the same conversation, Maddy presence, and activity truth surface.

No separate "voice app" identity.

Longer-term target:

- immediate accepted-wake acknowledgement;
- contextually generated speech rather than canned conversation;
- interruption/barge-in;
- natural pauses/timing;
- same Maddy memory and cognition as text.

Cached/pre-rendered audio may be used only for tiny latency-critical acknowledgements when context permits; ordinary conversation must remain contextually generated.

## 6.11 Camera / visual perception

Future customer-facing camera controls should be simple and explicit.

Requirements:

- obvious camera-on state;
- obvious microphone state;
- user control;
- no silent permanent surveillance;
- raw private visual data ephemeral/minimally retained by default;
- Maddy may describe observed cues/inferences without claiming certainty about the user's internal emotional state.

This becomes part of Maddy's future native perception and companion experience.

---

# 7. UI BUILD SEQUENCE

The redesign should be implemented incrementally while preserving production seams.

## NEXT — OD4138: Maddy Conversational Shell Foundation

**Purpose:** replace the panoramic/widget-first primary shell with the new mobile-first conversation/presence foundation.

Initial scope:

1. new responsive conversation-first primary layout;
2. Canonical Maddy presence area;
3. readable typography system;
4. persistent bottom composer;
5. existing text request path preserved;
6. existing document-intake event seam preserved;
7. OD4137A truthful activity state reused;
8. activity rendered as simple Maddy-stage subtitle with subtle left-to-right light sweep;
9. no permanent dashboard widget wall in the primary view;
10. no new provider, spend, retry, durable-execution, TTS, or external-action authority.

OD4138 should be treated as a presentation-shell commission, not a rewrite of MEOS cognition or governance.

### OD4138 acceptance direction

At minimum the production acceptance should prove:

- works at common mobile widths without horizontal scroll;
- conversation text is comfortably readable at normal zoom;
- primary shell does not depend on the panoramic office;
- Canonical Maddy presence area exists and scales responsively;
- composer remains reachable;
- text messages still enter canonical `meos:maddy-request`;
- attachments still enter canonical `meos:document-intake-requested`;
- status language still comes from the existing truthful activity model;
- status is no longer rendered as a bulky activity box;
- reduced-motion users do not receive forced sweeping animation;
- desktop remains polished rather than merely stretched mobile;
- no authority boundary changed.

## FOLLOWING UI BRICKS

After the shell is production-proven:

### OD4139 — Conversation Artifact & File Experience
- inline upload state;
- returned artifacts/downloads;
- failure states;
- source/detail expansion.

### OD4140 — Mode Presentation System
- Professional visual/tone treatment;
- Personal treatment;
- Off-Work state within Personal;
- founder-private presentation boundary.

### OD4141 — Work / Evidence Detail Drawer
- optional task detail;
- source/provenance details;
- durable execution identity when relevant;
- no permanent telemetry clutter.

### OD4142 — Responsive Voice & Camera Presence Controls
- compact voice controls;
- explicit mic/camera state;
- digital-human-ready presence controls;
- same conversation surface.

### Digital-human progression
Use `maddy-canonical-v2.png` as the canonical visual anchor while building toward a persistent digital human capable of full-body sitting, standing, working, presenting, reacting, and speaking.

Do not let temporary avatar providers define Maddy's identity or architecture.

---

# 8. ARCHITECTURAL INVARIANTS DURING THE UI RESET

The UI reset does not relax the existing Maddy/MEOS doctrine.

Preserve:

- Maddy is one persistent identity;
- MEOS organs are underneath Maddy, not separate substitute agents;
- provider neutrality;
- hardware neutrality;
- privacy boundaries;
- organization/customer isolation;
- capability ≠ authority;
- relationship ≠ access authority;
- durable Mission/intention ≠ proof of server execution;
- motivation/reward/curiosity never grant authority to lie, fabricate, bypass privacy, violate law, or take unauthorized consequential action;
- external vendors remain replaceable scaffolding;
- Canonical Maddy identity remains protected;
- production evidence remains authoritative;
- no weakening acceptance tests to make a build pass;
- no new organ unless a genuinely missing function is demonstrated;
- one fix → one file → one commit → one production test whenever practicable.

The North Star remains the same: evolve the existing commissioned architecture toward one continuous Maddy with persistent identity, memory, cognition, perception, learning, relationships, initiative, and embodiment without falsely claiming consciousness.

---

# 9. COMMERCIAL / PRODUCT POSITION

Pricing/checkout remains intentionally paused while the North Star build continues.

The UI reset is product-enabling work because a sellable Maddy cannot require users to:

- decipher tiny text;
- inspect console logs;
- understand MEOS internals;
- navigate a panoramic office;
- search widget grids for answers;
- guess whether Maddy heard them.

The customer should experience:

**ask Maddy → see that Maddy is present/working → receive the answer/work → inspect details only if desired.**

Professional and Personal should feel meaningfully different while remaining recognizably the same Maddy.

---

# 10. RECOVERY / RESUME

**Current recovery keyword:**

`MADDY-UI-RESET-OD4138-NEXT-20260921`

**Fast recovery:**

`Resume MADDY-UI-RESET-OD4138-NEXT-20260921 — current main snapshot Maddy-main - 2026-09-21T175325.135.zip contains Executive Hub v4.13.9 / OD4137B and Executive Hallway v1.5.9 / EH159; OD4137A truthful live activity is production-proven 19/19 and OD4137B placement is production-proven 10/10 with visible status above the real Text Maddy composer; EH158 durable ownership/reintegration T/O/R/S suites remain production-green while the real end-to-end durable public-research disconnect/reconnect return proof is still open; EH159 conversational presence gate is in current main and locally green 13/13 with T/O/R/S regressions green but is not yet promoted to production-proven because Render reported an unresolved 5 GB limit; VE224 remains production-partial-pass for hard similar-deep-voice separation; the panoramic office is retired as the primary customer shell; next commission is OD4138 Maddy Conversational Shell Foundation: mobile-first ChatGPT-like conversational simplicity, large readable typography, Canonical Maddy v2 presence area, composer-integrated existing document intake, truthful activity rendered as subtle subtitle/light sweep rather than a bulky box, no widget wall, Professional as polished customer default, Personal as warmer companion-capable experience, Off-Work as a relaxed Personal state, Founder Gangsta private only, and no change to MEOS cognition/governance/authority.`

---

# 11. IMMEDIATE RETURN PLAN

When development resumes:

1. Verify what Render's `5 GB` message actually refers to.
2. Do not lose the EH159 production-pending status.
3. Start the UI arc with OD4138 rather than continuing to cosmetically patch the panoramic office.
4. Preserve all canonical request, document-intake, activity-state, Hallway, Router, Brain, Mission, and authority seams underneath the new shell.
5. Prove OD4138 on both mobile-size and desktop-size production surfaces.
6. Reconcile Build State only after production proof.
7. Continue the later durable-research disconnect/reconnect proof after the new primary shell can truthfully show what Maddy is doing.
