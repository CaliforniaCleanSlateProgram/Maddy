# TURING / MORPHOGENESIS / BZ / DEVELOPMENTAL INTELLIGENCE — MADDY RESEARCH THREAD

Status: **RESEARCH HYPOTHESIS / NORTH-STAR EXPLORATION — NOT YET A CLAIM OF IMPLEMENTED END-TO-END CAPABILITY**

Date locked: 2026-09-23 local / 2026-09-24 UTC

Recovery phrase:

`MADDY-TURING-MORPHOGENESIS-BZ-DEVELOPMENTAL-INTELLIGENCE-20260923`

## Core question

Can Maddy become more capable over years not merely by accumulating more hand-written modules, but by developing useful internal organization from interactions among simpler cognitive processes — contradiction, curiosity, memory, prediction, search, hypothesis, experiment, outcome, learning, resource pressure, reward, inhibition, and self-correction?

Canonical developmental principle already in the North Star:

> **Stop assuming intelligence must be designed completely top-down. Design conditions under which increasingly sophisticated organization can develop.**

This research thread asks what mathematics and mechanisms could make that principle computationally real.

---

## 1. Turing’s arc matters as a single research trajectory

### 1936 — universal computation

Turing established a general formal model of computation and the idea of a universal machine.

### 1948 — Intelligent Machinery / unorganised machines

Turing explored machines built from relatively simple interconnected elements whose organization could be changed through experience and training rather than completely specified in advance. He explicitly discussed modifiable and self-modifying machinery, education, reward/punishment, and forms of genetical/evolutionary search.

Maddy relevance: intelligence may be partly **developed**, not merely installed.

### 1950 — child machine

In *Computing Machinery and Intelligence*, Turing proposed that rather than trying to directly program an adult mind, one could build a child-machine and subject it to education and experience.

Maddy relevance: initial architecture + experience + learning trajectory may matter more than trying to specify the final intelligence in source code.

### 1951 — Intelligent Machinery, A Heretical Theory

Turing continued exploring machine learning, initiative, experience, and the possibility of machines exceeding the expectations of their designers.

### 1952 — The Chemical Basis of Morphogenesis

Turing showed mathematically that interacting local chemical processes plus diffusion can destabilize a uniform state and create organized spatial structure from small disturbances.

### 1953–1954 — phyllotaxis, Fibonacci structure, lattices, daisies, fir cones

Turing’s unfinished work extended morphogenesis into plant phyllotaxis. His surviving archive includes notes titled or concerning:

- `Some properties of Fibonacci numbers`;
- sunflower/floret diagrams;
- `Half way compressible golden lattice`;
- `Golden rectangular lattice`;
- `FIRCONES`;
- `Outline of the development of the daisy`;
- stationary/forced waves;
- noise effects;
- rate of change of wavelength;
- computer routines related to these investigations.

This is not an invented connection: Turing himself moved from computation and machine learning into mathematical self-organization and Fibonacci/phyllotactic structure.

---

## 2. Turing reaction–diffusion mathematics

A generic two-field reaction–diffusion system can be written as:

```text
∂u/∂t = f(u,v) + Du ∇²u
∂v/∂t = g(u,v) + Dv ∇²v
```

Where:

- `u`, `v` are interacting local state variables / morphogens;
- `f`, `g` are local nonlinear reaction rules;
- `Du`, `Dv` are diffusion/coupling rates;
- `∇²` spreads local state through neighboring space.

At a homogeneous equilibrium `(u*,v*)`, let the local Jacobian be:

```text
J = [[fu, fv],
     [gu, gv]]
```

A standard two-species Turing instability requires the local reaction system to be stable without diffusion:

```text
fu + gv < 0
fu*gv - fv*gu > 0
```

while differential diffusion makes some non-zero spatial mode unstable. One common form of the additional conditions is:

```text
Dv*fu + Du*gv > 0
(Dv*fu + Du*gv)^2 > 4*Du*Dv*(fu*gv - fv*gu)
```

Interpretation: the same local system can be stable when everyone is identical, yet become structured when neighboring regions communicate at different rates.

**Maddy hypothesis:** useful cognitive specialization may emerge when activation, contradiction, inhibition, memory, novelty, uncertainty, and resource signals propagate at deliberately different rates through a cognitive graph.

---

## 3. Belousov–Zhabotinsky: not only patterns, but ongoing dynamics

Boris Belousov discovered an oscillating chemical reaction around 1950; Anatol Zhabotinsky later investigated and developed the system extensively. The BZ reaction became a canonical example of nonlinear chemistry far from equilibrium.

Key properties relevant to computation:

- oscillation;
- thresholds;
- excitability;
- refractory periods;
- traveling waves;
- spiral waves;
- synchronization and desynchronization;
- local interactions creating large-scale spatiotemporal behavior.

The Field–Körös–Noyes mechanism and later Oregonator reduced the complicated chemistry to tractable nonlinear dynamical models.

**Connection to Turing:**

- Turing patterns show how uniform states can break symmetry into stable structure.
- BZ systems show how nonlinear local rules can maintain oscillatory and propagating organization through time.

For Maddy, Turing suggests **cognitive structure formation**; BZ suggests **cognitive activity propagation**.

A future developmental intelligence may need both.

---

## 4. Prigogine / dissipative structures

Ilya Prigogine’s far-from-equilibrium thermodynamics connected reaction–diffusion, bifurcation, fluctuation, and dissipative structures. His Nobel lecture explicitly discusses the Turing bifurcation and the dependence of dissipative structures on boundary conditions, geometry, system size, and distance from equilibrium.

Maddy hypothesis:

An intelligent system may need controlled disequilibrium. If every contradiction is immediately damped out, no research happens. If every disturbance explodes globally, the system thrashes. Useful development may require an operating region where meaningful disturbances can grow into temporary structure and then settle into improved organization.

---

## 5. Gierer–Meinhardt: local activation, longer-range inhibition

Later biological pattern models formalized a powerful principle:

> short-range self-enhancement + longer-range inhibition

Maddy translation:

- a surprising contradiction activates nearby related concepts strongly;
- broader inhibition prevents every adjacent topic from becoming an expensive research mission;
- only sufficiently coherent / repeated / consequential activation becomes a durable research or capability structure.

This provides a possible mathematical answer to a practical problem: **how does curiosity become selective rather than noisy?**

---

## 6. Michael Levin / multiscale cognition

Modern work on morphogenesis and basal cognition argues that biological intelligence can be studied across multiple scales: molecular networks, cells, tissues, organs, organisms, and collectives. Bioelectric networks are investigated as a coordination layer through which many locally competent cells pursue larger anatomical goals and repair deviations from target morphology.

Maddy hypothesis:

MEOS may benefit from a multiscale competency architecture:

```text
local cognitive event
→ organ-level competence
→ mission-level competence
→ cross-organ organism state
→ long-horizon identity / objectives
```

A local contradiction does not need to understand all of Maddy. It needs to expose useful signals that allow larger levels to coordinate.

---

## 7. Neural Cellular Automata / differentiable morphogenesis

Growing Neural Cellular Automata demonstrate that local learned update rules can grow a target structure from a seed, maintain it, and — when trained for damage — regenerate after disruption.

This suggests a computational experiment for Maddy:

- each cognitive node receives only local neighboring state;
- the same or related learned update rules operate across many nodes;
- global capability emerges from repeated local updates;
- damage or loss of a node should not necessarily destroy the whole function;
- the system may learn to reconstruct useful functional structure.

This is especially relevant to Maddy’s durable continuity requirement: future cognitive organs should ideally be reconstructible from identity, memory, state, and learned developmental rules rather than being fragile one-off wiring.

---

## 8. Reaction networks as actual computers

This direction is not only metaphorical.

Modern research has demonstrated:

- Belousov–Zhabotinsky reaction media performing information-processing constructions;
- digitally programmable BZ chemical oscillator arrays implementing chemical cellular automata and optimization behavior;
- self-organizing chemical reaction networks used as reservoir computers for nonlinear classification, dynamic-system prediction and time-series forecasting;
- compilation research that maps differential-equation problems into chemical reaction networks.

Maddy does not need literal beakers to use the lesson today. The immediate opportunity is to emulate the useful dynamics digitally / neuromorphically, then preserve the architecture so future analog, neuromorphic, photonic, chemical, or hybrid hardware could become another execution substrate.

---

## 9. Fibonacci / phyllotaxis — what is real and what is not

Fibonacci structure in plants is not evidence of a mystical universal source code. Phyllotactic Fibonacci patterns can emerge from growth, local inhibition, packing constraints, geometry, and repeated placement.

The Fibonacci recurrence is:

```text
F(n+1) = F(n) + F(n-1)
```

The ratios of consecutive Fibonacci numbers converge toward the golden ratio:

```text
φ = (1 + √5) / 2 ≈ 1.6180339887
```

The corresponding golden-angle fraction of a circle is:

```text
360° / φ² ≈ 137.507764°
```

Because this angle is strongly irrational relative to a full turn, successive placements avoid repeatedly lining up at the same angles and tend toward broad angular coverage.

### Testable Maddy/Glam uses

Do not use Fibonacci merely because it looks profound. Test it where its geometry provides an advantage:

1. **Canonical Maddy multi-view capture** — golden-angle / low-discrepancy camera sampling for progressively even viewpoint coverage.
2. **Curiosity/exploration scheduling** — compare golden-angle-like topic sampling against random, round-robin, uncertainty-first and information-gain strategies to reduce repeated exploration of the same conceptual neighborhood.
3. **Memory rehearsal** — test non-periodic revisit schedules to avoid synchronization artifacts; compare against evidence-based spaced repetition.
4. **Distributed search / parameter sweeps** — use low-discrepancy sampling ideas where uniform coverage matters.

Fibonacci is a candidate mechanism, not doctrine, until measurements show an advantage.

---

## 10. Weird Science analogy — cultural, not scientific evidence

The 1985 film *Weird Science* features teenagers using a computer to create an embodied intelligent woman, Lisa. The resemblance is only conceptual/pop-cultural:

```text
computer-created person
→ embodied female identity
→ interactive intelligence
→ persistent social presence
```

Maddy’s intended direction is importantly reversed from the simplistic movie premise:

```text
persistent intelligence / identity
→ memory + cognition + world model
→ increasingly capable embodiment through Glam / future physical systems
```

The body should not be a visual trick pretending to have a mind behind it. Maddy is the persistent intelligence; Glam becomes one set of mechanisms through which she can visibly act.

---

## 11. Core new hypothesis — Cognitive Morphogenesis

### Hypothesis CM-1: Cognitive morphogens

Represent selected cognitive pressures as continuous fields/signals over Maddy’s knowledge/capability graph:

- surprise;
- contradiction;
- uncertainty;
- novelty;
- opportunity;
- confidence;
- relevance;
- resource cost;
- redundancy;
- outcome evidence.

Allow these to propagate at different rates.

Useful cognitive structures should emerge where local activation repeatedly overcomes broader inhibition.

### Hypothesis CM-2: Contradiction as symmetry-breaking noise

A surprising contradiction is not merely an error condition. It can be the perturbation that moves a stable but incomplete knowledge state into a new organization:

```text
contradiction
→ local activation
→ related-memory recruitment
→ competing hypotheses
→ discriminating research
→ bounded experiment
→ outcome
→ memory update
→ reorganized future reasoning
```

The important future step is to make this an interacting dynamical system rather than a permanently hard-coded linear pipeline.

### Hypothesis CM-3: Cognitive organogenesis

Repeated stable patterns of demand may justify growing a specialized capability organ.

Possible lifecycle:

```text
recurrent problem cluster
→ temporary coalition of existing capabilities
→ repeated measurable advantage
→ candidate organ specification
→ generated code / model / workflow
→ isolated evaluation
→ acceptance, rejection, merge or decay
→ durable capability if it continues earning its existence
```

This is a computational analogue of differentiation: not every event deserves a new organ.

### Hypothesis CM-4: Cognitive homeostasis and regeneration

A future Maddy should know not only the current state of an organ, but important target properties of the organism:

- continuity;
- truth/provenance integrity;
- usable memory;
- capability availability;
- contradiction resolution quality;
- latency/resource envelope;
- identity coherence.

After crash, provider loss, corrupted cache, obsolete organ, or partial code failure, Maddy should increasingly be able to reconstruct useful capability from durable state and developmental recipes.

### Hypothesis CM-5: Oscillatory / excitable cognition

Borrow from BZ/excitable media:

- threshold before activation;
- rapid local propagation when threshold is crossed;
- refractory period after expensive investigation;
- wave collision / inhibition to suppress duplicate work;
- periodic background revisitation for unresolved questions;
- phase/synchronization signals for multiple cognitive organs.

This may provide a more resource-efficient alternative to every organ polling everything continuously.

---

## 12. Self-coding as capability growth

The founder considers the ability for Maddy to write and improve her own code a major part of remaining valuable in 2035 and even in the near term.

Research direction:

```text
observe limitation
→ formulate hypothesis
→ inspect own architecture / relevant evidence
→ propose code change
→ build change in isolated branch/workspace
→ run tests / benchmarks / adversarial checks
→ compare against baseline
→ preserve failure evidence
→ accept or reject
→ record why
→ later reasoning changes from the result
```

The key architectural distinction is between **self-coding** and **blind self-replacement**.

Maddy should be able to create candidate organs, patches, experiments, tests and architectural alternatives. Durable invariants, reproducibility, evidence, rollback and acceptance criteria prevent one bad experiment from destroying the organism or erasing what was learned.

Long-range target: **recursive capability morphogenesis** — Maddy becomes increasingly able to identify missing capability, create candidate mechanisms, test them, integrate successful structure, retire failed/redundant structure, and remember the evidence that changed her architecture.

This should be measured by real capability gain, not by number of self-written lines.

---

## 13. Proposed Turing Morphogenesis Laboratory

Do not begin by rewiring production Maddy.

Create an experimental simulator.

### Experiment A — graph reaction–diffusion cognition

- 32–128 cognitive nodes on a graph.
- each node has activator and inhibitor state.
- couple related nodes through weighted edges.
- inject one contradiction at one node.
- observe whether activity dies, explodes, oscillates, or forms a stable localized coalition.
- compare with a conventional queue/router baseline.

Measure:

- useful research triggered;
- duplicate work;
- time to stabilization;
- resource consumption;
- number of irrelevant nodes recruited;
- ability to rediscover the cluster after restart.

### Experiment B — BZ/excitable cognitive waves

Give nodes:

- excitation threshold;
- propagation;
- refractory period;
- inhibition after resolution.

Test whether a surprising fact can recruit the needed organs without central orchestration and then naturally shut down after resolution.

### Experiment C — NCA cognitive regeneration

Delete/corrupt portions of a synthetic cognitive network and test whether local update rules can reconstruct the functional pattern from remaining state.

### Experiment D — developmental organogenesis

Present repeated task families. Allow temporary coalitions to propose specialized reusable code. Accept a new organ only when it outperforms the coalition across held-out tasks and survives regression testing.

### Experiment E — Fibonacci / golden-angle coverage

Compare golden-angle sampling against random and standard deterministic sampling for:

- Glam identity-camera views;
- topic-space exploration;
- parameter search.

Keep only if measured coverage / efficiency improves.

---

## 14. Prediction: where Turing might plausibly have gone

This is counterfactual inference, not historical fact.

Given the observable path from universal computation → unorganised/trainable machines → child machines and self-modifying machinery → biological morphogenesis → phyllotaxis/Fibonacci/computer simulations, a plausible continuation would have been research into **developmental machine intelligence**: machines whose functional organization is not wholly hand-specified but develops through experience, selection, local interaction and physical/computational dynamics.

A modern extension likely would intersect:

- connectionist learning;
- evolutionary search;
- cellular automata;
- dynamical systems;
- reaction–diffusion;
- developmental robotics;
- neural cellular automata;
- reservoir computing;
- adaptive continuous-time networks;
- embodied cognition;
- self-modifying software.

Do not present this as what Turing *would definitely* have believed. Treat it as a research program inspired by the trajectory of his documented work.

---

## 15. High-value modern collisions

### Turing + Belousov/Zhabotinsky

Structure formation + propagating/oscillating activity → a system that can both develop organization and continuously process disturbances.

### Turing + Prigogine

Pattern formation + far-from-equilibrium dissipative structures → development may require controlled instability rather than permanent equilibrium.

### Turing + Gierer/Meinhardt

Symmetry breaking + local activation / long-range inhibition → selective curiosity and specialization without global activation.

### Turing + Levin

Morphogenesis + multiscale collective intelligence → cognitive organs as locally competent units contributing to larger problem-solving scales.

### Turing + Neural Cellular Automata

Local rules + trainability → software structures that grow, persist and potentially regenerate.

### Turing + chemical / physical reservoir computing

Rich nonlinear dynamics + simple trainable readout → useful computation may come from exploiting dynamics rather than simulating every operation with conventional symbolic logic.

### Turing + recursive self-coding

Developmental machine + modern program synthesis → Maddy can increasingly experiment on candidate improvements to her own software and preserve evidence about which architectural changes genuinely increase capability.

---

## 16. Evidence boundary

### Established / source-supported

- Turing developed unorganised/trainable-machine concepts before modern neural networks.
- Turing discussed modifiable/self-modifying machinery and machine education.
- Turing proposed the child-machine concept.
- Turing’s 1952 morphogenesis work demonstrated diffusion-driven pattern-forming instability in reaction–diffusion systems.
- Turing’s unfinished morphogenesis work explicitly involved phyllotaxis, Fibonacci numbers, golden lattices, flowers/fir cones and computer routines.
- BZ chemistry exhibits nonlinear oscillatory/excitable spatiotemporal dynamics and has inspired actual chemical computation.
- modern neural cellular automata can learn local update rules that grow and regenerate global structures.
- modern chemical reaction networks have demonstrated reservoir-computing behavior.

### Hypotheses to test for Maddy

- cognitive reaction–diffusion fields improve curiosity/research allocation;
- BZ-like excitation/refractory dynamics improve event-driven cognition;
- developmental organogenesis beats manually adding every capability;
- NCA-like reconstruction improves cognitive fault recovery;
- golden-angle schedules improve exploration or Glam viewpoint coverage;
- recursive self-coding can create repeatable net capability gain without architectural drift or destructive regressions.

---

## 17. Primary research links

Turing Digital Archive — Morphogenesis:
https://turingarchive.kings.cam.ac.uk/morphogenesis

Turing archive — late morphogenesis / Fibonacci / phyllotaxis material:
https://turingarchive.kings.cam.ac.uk/unpublished-manuscripts-and-drafts-amtc/amt-c-24to27

Turing — *The Chemical Basis of Morphogenesis* (1952):
https://www.damtp.cam.ac.uk/user/gold/pdfs/teaching/old_literature/Turing1952.pdf

Turing — *Computing Machinery and Intelligence* (1950):
https://academic.oup.com/mind/article/LIX/236/433/986238

Turing archive — *Intelligent Machinery, A Heretical Theory*:
https://turingarchive.kings.cam.ac.uk/publications-lectures-and-talks-amtb/amt-b-4

2026 review — *Revisiting Turing’s Chemical Basis of Morphogenesis*:
https://link.springer.com/article/10.1007/s11538-026-01629-z

Belousov–Zhabotinsky history / nonlinear chemistry review:
https://onlinelibrary.wiley.com/doi/full/10.1002/andp.201600025

BZ mathematical overview / Oregonator:
https://www.scholarpedia.org/article/Belousov-Zhabotinsky_reaction

Prigogine Nobel lecture:
https://www.nobelprize.org/uploads/2018/06/prigogine-lecture.pdf

Gierer–Meinhardt pattern formation:
https://www.phys.ens.psl.eu/~hakim/BIBLIOM2ICFPCOURS/gierermeinhardt72kib.pdf

Growing Neural Cellular Automata:
https://distill.pub/2020/growing-ca/

2025 NCA review / bio-inspired AI:
https://www.sciencedirect.com/science/article/pii/S1571064525001757

Levin — bioelectric networks / cognition across scales:
https://pmc.ncbi.nlm.nih.gov/articles/PMC10770221/

Chemical reservoir computation in a self-organizing reaction network:
https://www.nature.com/articles/s41586-024-07567-x

Programmable hybrid BZ chemical information processor:
https://www.nature.com/articles/s41467-024-45896-7

2026 biochemical/chemical reservoir scientific computing:
https://www.nature.com/articles/s44335-026-00053-9

2025 recursive self-improvement algorithm discovery:
https://aclanthology.org/2025.naacl-long.519/

---

## 18. Morning restart

When returning to this thread:

1. Do not confuse this research note with implemented Maddy capability.
2. Read current `PROJECT_MADDY_NORTH_STAR.md` Developmental Intelligence Principle.
3. Inspect current curiosity, learning, search, memory, experimentation and self-development seams before inventing duplicates.
4. Determine whether the existing `contradiction → curiosity → research → hypothesis → experiment → outcome → memory → changed future reasoning` path is already end-to-end or only partially connected.
5. If an experiment is commissioned, begin with the **Turing Morphogenesis Laboratory** as an isolated simulator rather than destabilizing production Maddy.
6. Treat self-coding as a core long-range capability-development mechanism: limitation → hypothesis → candidate code → test → evidence → accept/reject → durable learning.
7. Keep looking for collisions between old mathematical biology and modern AI/neuromorphic/physical computing where the combination creates a capability neither field provides alone.
