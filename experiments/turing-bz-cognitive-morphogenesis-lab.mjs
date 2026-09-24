import fs from 'fs';

/*
 * Project Maddy / MEOS
 * MDP016 — Turing/BZ Cognitive Morphogenesis Laboratory
 * Build: MDP016-TURING-BZ-COGNITIVE-MORPHOGENESIS-LAB-20260924-A
 *
 * Purpose:
 * Test whether a small informational disturbance can recruit a localized,
 * temporary cognitive coalition using local activation, faster inhibition,
 * thresholded excitation, and refractory behavior — without touching production
 * cognition or granting any authority.
 *
 * This is an isolated synthetic laboratory. It is NOT a production cognition
 * engine and makes no claim of biological equivalence.
 *
 * Turing-inspired graph field (discrete approximation):
 *   du_i/dt = R_u(u_i,v_i) + D_u Σ_j w_ij(u_j-u_i) + I_i(t) + spike_input_i
 *   dv_i/dt = R_v(u_i,v_i) + D_v Σ_j w_ij(v_j-v_i)
 * with D_v > D_u so inhibition spreads faster than excitation.
 *
 * BZ/excitable-media-inspired rule:
 *   if u_i >= threshold and node is not refractory => spike, reset u_i,
 *   raise inhibitor v_i, then enter a bounded refractory interval.
 */

const BUILD_ID = 'MDP016-TURING-BZ-COGNITIVE-MORPHOGENESIS-LAB-20260924-A';
const SCHEMA = 'meos.maddy.cognitive-morphogenesis-lab.v1';

const clamp = (value, minimum = 0, maximum = 1) =>
  Math.max(minimum, Math.min(maximum, Number.isFinite(Number(value)) ? Number(value) : minimum));

const NODE_DEFINITIONS = Object.freeze([
  ['contradiction', true],
  ['epistemic-conflict', true],
  ['related-memory', true],
  ['curiosity', true],
  ['research', true],
  ['hypothesis-a', true],
  ['hypothesis-b', true],
  ['experiment', true],
  ['outcome', true],
  ['learning', true],
  ['payments', false],
  ['voice', false],
  ['media', false],
  ['grants', false]
]);

const EDGE_DEFINITIONS = Object.freeze([
  ['contradiction', 'epistemic-conflict', 1.00],
  ['contradiction', 'related-memory', 0.90],
  ['contradiction', 'curiosity', 0.90],
  ['epistemic-conflict', 'research', 0.95],
  ['related-memory', 'research', 0.55],
  ['curiosity', 'research', 0.90],
  ['research', 'hypothesis-a', 0.80],
  ['research', 'hypothesis-b', 0.80],
  ['related-memory', 'hypothesis-a', 0.35],
  ['related-memory', 'hypothesis-b', 0.35],
  ['hypothesis-a', 'experiment', 0.85],
  ['hypothesis-b', 'experiment', 0.85],
  ['experiment', 'outcome', 0.95],
  ['outcome', 'learning', 0.95],
  ['learning', 'related-memory', 0.65],
  ['contradiction', 'payments', 0.18],
  ['contradiction', 'voice', 0.18],
  ['contradiction', 'media', 0.18],
  ['contradiction', 'grants', 0.18],
  ['research', 'payments', 0.12],
  ['research', 'voice', 0.12],
  ['research', 'media', 0.12],
  ['research', 'grants', 0.12]
]);

const DEFAULT_PARAMETERS = Object.freeze({
  activatorDiffusion: 0.04,
  inhibitorDiffusion: 0.18,
  activatorGain: 0.14,
  activatorLeak: 0.20,
  inhibitorGain: 0.20,
  inhibitorLeak: 0.10,
  inhibitorCoupling: 0.36,
  spikeDrive: 0.68,
  threshold: 0.55,
  refractoryTicks: 3,
  spikeReset: 0.12,
  spikeInhibitorKick: 0.35,
  steps: 30
});

function buildLab(options = {}) {
  const disabled = new Set(options.disabledNodes || []);
  const parameters = { ...DEFAULT_PARAMETERS, ...(options.parameters || {}) };
  const nodes = NODE_DEFINITIONS.map(([id, relevant]) => ({
    id,
    relevant,
    disabled: disabled.has(id),
    activator: 0,
    inhibitor: 0,
    refractory: 0,
    spikes: [],
    firstSpike: null,
    maxActivator: 0
  }));
  const index = Object.fromEntries(nodes.map((node, position) => [node.id, position]));
  const directedEdges = EDGE_DEFINITIONS.map(([from, to, weight]) => ({
    from: index[from],
    to: index[to],
    weight
  }));
  const diffusionEdges = [];
  for (const edge of directedEdges) {
    diffusionEdges.push(edge, { from: edge.to, to: edge.from, weight: edge.weight });
  }

  return {
    schema: SCHEMA,
    buildId: BUILD_ID,
    parameters,
    nodes,
    index,
    directedEdges,
    diffusionEdges,
    timeline: [],
    authority: Object.freeze({
      productionCognitionMutationAuthorized: false,
      cognitiveWakeAuthorized: false,
      providerUseAuthorized: false,
      externalActionAuthorized: false,
      spendAuthorized: false,
      deploymentAuthorized: false
    })
  };
}

function disturbanceAt(nodeId, tick, schedule = null) {
  const activeSchedule = schedule || {
    contradiction: new Set([0, 1, 2])
  };
  return activeSchedule[nodeId]?.has?.(tick) ? 0.95 : 0;
}

function runLab(options = {}) {
  const lab = buildLab(options);
  const p = lab.parameters;
  const schedule = options.disturbanceSchedule || null;

  for (let tick = 0; tick < p.steps; tick += 1) {
    const old = lab.nodes.map(node => ({ ...node, spikes: [...node.spikes] }));
    const incomingSpikeDrive = Array(lab.nodes.length).fill(0);

    for (const edge of lab.directedEdges) {
      if (old[edge.from].disabled || old[edge.to].disabled) continue;
      if (old[edge.from].spikes.includes(tick - 1)) {
        incomingSpikeDrive[edge.to] += edge.weight * p.spikeDrive;
      }
    }

    const activatorLaplacian = Array(lab.nodes.length).fill(0);
    const inhibitorLaplacian = Array(lab.nodes.length).fill(0);
    for (const edge of lab.diffusionEdges) {
      if (old[edge.from].disabled || old[edge.to].disabled) continue;
      activatorLaplacian[edge.from] += edge.weight * (old[edge.to].activator - old[edge.from].activator);
      inhibitorLaplacian[edge.from] += edge.weight * (old[edge.to].inhibitor - old[edge.from].inhibitor);
    }

    for (let position = 0; position < lab.nodes.length; position += 1) {
      const prior = old[position];
      const node = lab.nodes[position];
      if (node.disabled) {
        node.activator = 0;
        node.inhibitor = 0;
        node.refractory = 0;
        continue;
      }

      const external = disturbanceAt(node.id, tick, schedule);
      let activator =
        prior.activator +
        p.activatorGain * prior.activator * (1 - prior.activator) -
        p.activatorLeak * prior.activator -
        p.inhibitorCoupling * prior.inhibitor +
        p.activatorDiffusion * activatorLaplacian[position] +
        incomingSpikeDrive[position] +
        external;

      let inhibitor =
        prior.inhibitor +
        p.inhibitorGain * prior.activator -
        p.inhibitorLeak * prior.inhibitor +
        p.inhibitorDiffusion * inhibitorLaplacian[position];

      activator = clamp(activator);
      inhibitor = clamp(inhibitor);

      if (prior.refractory > 0) {
        node.refractory = prior.refractory - 1;
        activator = Math.min(activator, 0.18);
      } else {
        node.refractory = 0;
      }

      node.activator = activator;
      node.inhibitor = inhibitor;
    }

    const tickSpikes = [];
    for (const node of lab.nodes) {
      if (node.disabled) continue;
      node.maxActivator = Math.max(node.maxActivator, node.activator);
      if (node.refractory === 0 && node.activator >= p.threshold) {
        node.spikes.push(tick);
        if (node.firstSpike === null) node.firstSpike = tick;
        node.refractory = p.refractoryTicks;
        node.activator = p.spikeReset;
        node.inhibitor = clamp(node.inhibitor + p.spikeInhibitorKick);
        tickSpikes.push(node.id);
      }
    }

    lab.timeline.push({
      tick,
      spikes: tickSpikes,
      activator: Object.fromEntries(lab.nodes.map(node => [node.id, Number(node.activator.toFixed(6))])),
      inhibitor: Object.fromEntries(lab.nodes.map(node => [node.id, Number(node.inhibitor.toFixed(6))]))
    });
  }

  const spiked = lab.nodes.filter(node => node.spikes.length > 0);
  const relevant = lab.nodes.filter(node => node.relevant && !node.disabled);
  const relevantSpiked = spiked.filter(node => node.relevant);
  const irrelevantSpiked = spiked.filter(node => !node.relevant);
  const precision = spiked.length ? relevantSpiked.length / spiked.length : 0;
  const recall = relevant.length ? relevantSpiked.length / relevant.length : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    ...lab,
    metrics: {
      spikedCount: spiked.length,
      relevantSpiked: relevantSpiked.length,
      irrelevantSpiked: irrelevantSpiked.length,
      precision,
      recall,
      f1
    }
  };
}

function naiveFloodBaseline() {
  const adjacency = new Map();
  for (const [from, to] of EDGE_DEFINITIONS) {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push(to);
  }
  const visited = new Set(['contradiction']);
  const queue = ['contradiction'];
  while (queue.length) {
    const current = queue.shift();
    for (const next of adjacency.get(current) || []) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  const relevant = new Set(NODE_DEFINITIONS.filter(([, isRelevant]) => isRelevant).map(([id]) => id));
  const selected = [...visited];
  const relevantSelected = selected.filter(id => relevant.has(id)).length;
  const precision = relevantSelected / selected.length;
  const recall = relevantSelected / relevant.size;
  return { selected, precision, recall, f1: (2 * precision * recall) / (precision + recall) };
}

function deterministicRandomBaseline(count, seed = 0x4d414444) {
  let state = seed >>> 0;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
  const ids = NODE_DEFINITIONS.map(([id]) => id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const selected = ids.slice(0, count);
  const relevant = new Set(NODE_DEFINITIONS.filter(([, isRelevant]) => isRelevant).map(([id]) => id));
  const relevantSelected = selected.filter(id => relevant.has(id)).length;
  const precision = selected.length ? relevantSelected / selected.length : 0;
  const recall = relevantSelected / relevant.size;
  return { selected, precision, recall, f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0 };
}

function runAcceptance() {
  const normal = runLab();
  const lesion = runLab({ disabledNodes: ['hypothesis-a'] });
  const flood = naiveFloodBaseline();
  const random = deterministicRandomBaseline(normal.metrics.spikedCount);
  const first = id => normal.nodes[normal.index[id]].firstSpike;
  const contradiction = normal.nodes[normal.index.contradiction];
  const lesionLearning = lesion.nodes[lesion.index.learning];
  const lesionExperiment = lesion.nodes[lesion.index.experiment];

  const checks = [
    ['Single contradiction recruits every relevant node in the intact lab', normal.metrics.recall === 1],
    ['No unrelated domain crosses the spike threshold', normal.metrics.irrelevantSpiked === 0],
    ['The coalition is perfectly localized in this deterministic fixture', normal.metrics.precision === 1 && normal.metrics.f1 === 1],
    ['Temporal organization progresses from contradiction toward research', first('contradiction') < first('research')],
    ['Research precedes hypotheses and hypotheses precede experiment', first('research') < first('hypothesis-a') && first('hypothesis-a') < first('experiment')],
    ['Experiment precedes outcome and outcome precedes learning', first('experiment') < first('outcome') && first('outcome') < first('learning')],
    ['BZ-like refractory behavior suppresses repeated initial disturbance spikes', contradiction.spikes.filter(tick => tick <= 2).length === 1],
    ['Turing-style differential inhibition is configured faster than activation', normal.parameters.inhibitorDiffusion > normal.parameters.activatorDiffusion],
    ['One-hypothesis lesion still reaches experiment', lesionExperiment.firstSpike !== null],
    ['One-hypothesis lesion still reaches learning', lesionLearning.firstSpike !== null],
    ['Localized dynamics beat naive flood precision', normal.metrics.precision > flood.precision],
    ['Localized dynamics beat deterministic random F1 at the same selection size', normal.metrics.f1 > random.f1],
    ['Laboratory carries no cognition/action/deployment authority', Object.values(normal.authority).every(value => value === false)],
    ['Laboratory does not import production Maddy runtime modules', !/^\s*import\s+.*['\"]\.\.\/frontend\//m.test(fs.readFileSync(new URL(import.meta.url), 'utf8'))]
  ];

  const passed = checks.filter(([, ok]) => ok).length;
  console.table(checks.map(([check, ok]) => ({ check, passed: ok })));
  console.table(normal.nodes.map(node => ({
    node: node.id,
    relevant: node.relevant,
    disabled: node.disabled,
    firstSpike: node.firstSpike,
    spikes: node.spikes.join(','),
    maxActivator: Number(node.maxActivator.toFixed(3))
  })));
  console.log('morphogenesis metrics', JSON.stringify(normal.metrics, null, 2));
  console.log('naive flood baseline', JSON.stringify(flood, null, 2));
  console.log('deterministic random baseline', JSON.stringify(random, null, 2));
  console.log('lesion metrics', JSON.stringify(lesion.metrics, null, 2));
  console.log(`MDP016 TURING/BZ COGNITIVE MORPHOGENESIS LAB: ${passed === checks.length ? 'PASS' : 'FAIL'} (${passed}/${checks.length})`);
  return { success: passed === checks.length, passed, total: checks.length, checks, normal, lesion, flood, random };
}

export {
  BUILD_ID,
  SCHEMA,
  DEFAULT_PARAMETERS,
  NODE_DEFINITIONS,
  EDGE_DEFINITIONS,
  buildLab,
  runLab,
  runAcceptance,
  naiveFloodBaseline,
  deterministicRandomBaseline
};

if (process.argv[1] && new URL(import.meta.url).pathname === pathResolve(process.argv[1])) {
  const result = runAcceptance();
  process.exitCode = result.success ? 0 : 1;
}

function pathResolve(value) {
  const normalized = value.startsWith('/') ? value : `${process.cwd()}/${value}`;
  return new URL(`file://${normalized}`).pathname;
}
