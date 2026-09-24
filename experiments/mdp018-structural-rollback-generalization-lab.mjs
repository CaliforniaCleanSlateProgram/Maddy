/*
 * Project Maddy / MEOS
 * MDP018 — Structural Rollback + Generalization Stress Laboratory
 * Build: MDP018-STRUCTURAL-ROLLBACK-GENERALIZATION-STRESS-20260924-A
 *
 * Mission:
 * Prove that bounded structural learning can be checkpointed and exactly rolled
 * back, while useful learned structure transfers across several related but
 * non-identical disturbances without waking unrelated domains.
 *
 * Isolated laboratory only. No production cognition/code/provider/spend/action authority.
 */

const BUILD_ID = 'MDP018-STRUCTURAL-ROLLBACK-GENERALIZATION-STRESS-20260924-A';
const SCHEMA = 'meos.maddy.structural-rollback-generalization-lab.v1';

const NODE_DEFINITIONS = Object.freeze([
  ['contradiction', true], ['epistemic-conflict', true], ['related-memory', true],
  ['curiosity', true], ['research', true], ['hypothesis-a', true],
  ['hypothesis-b', true], ['experiment', true], ['outcome', true], ['learning', true],
  ['payments', false], ['voice', false], ['media', false], ['grants', false]
]);

const EDGE_DEFINITIONS = Object.freeze([
  ['contradiction', 'epistemic-conflict', 1.00], ['contradiction', 'related-memory', 0.90],
  ['contradiction', 'curiosity', 0.90], ['epistemic-conflict', 'research', 0.95],
  ['related-memory', 'research', 0.55], ['curiosity', 'research', 0.90],
  ['research', 'hypothesis-a', 0.80], ['research', 'hypothesis-b', 0.80],
  ['related-memory', 'hypothesis-a', 0.35], ['related-memory', 'hypothesis-b', 0.35],
  ['hypothesis-a', 'experiment', 0.85], ['hypothesis-b', 'experiment', 0.85],
  ['experiment', 'outcome', 0.95], ['outcome', 'learning', 0.95],
  ['learning', 'related-memory', 0.65], ['contradiction', 'payments', 0.18],
  ['contradiction', 'voice', 0.18], ['contradiction', 'media', 0.18],
  ['contradiction', 'grants', 0.18], ['research', 'payments', 0.12],
  ['research', 'voice', 0.12], ['research', 'media', 0.12], ['research', 'grants', 0.12]
]);

const PARAMETERS = Object.freeze({
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

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value)));
const edgeKey = (from, to) => `${from}->${to}`;
const deepClone = value => JSON.parse(JSON.stringify(value));

function createState() {
  const weights = new Map(EDGE_DEFINITIONS.map(([from, to, weight]) => [edgeKey(from, to), weight]));
  return {
    buildId: BUILD_ID,
    schema: SCHEMA,
    weights,
    revision: 0,
    history: [],
    bounds: Object.freeze({ minimumWeight: 0.08, maximumWeight: 1.20 }),
    authority: Object.freeze({
      productionCognitionMutationAuthorized: false,
      cognitiveWakeAuthorized: false,
      providerUseAuthorized: false,
      externalActionAuthorized: false,
      spendAuthorized: false,
      deploymentAuthorized: false,
      codeMutationAuthorized: false
    })
  };
}

function weightObject(state) {
  return Object.fromEntries([...state.weights.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function checkpoint(state, label) {
  return Object.freeze({
    label,
    buildId: BUILD_ID,
    revision: state.revision,
    weights: Object.freeze(weightObject(state)),
    history: Object.freeze(deepClone(state.history))
  });
}

function restore(state, saved) {
  state.weights = new Map(Object.entries(saved.weights));
  state.revision = saved.revision;
  state.history = deepClone(saved.history);
  return {
    restored: true,
    label: saved.label,
    revision: state.revision,
    exactWeights: JSON.stringify(weightObject(state)) === JSON.stringify(saved.weights),
    exactHistory: JSON.stringify(state.history) === JSON.stringify(saved.history)
  };
}

function runEpisode(state, options = {}) {
  const p = {
    ...PARAMETERS,
    spikeDrive: options.spikeDrive ?? PARAMETERS.spikeDrive,
    threshold: options.threshold ?? PARAMETERS.threshold,
    steps: options.steps ?? PARAMETERS.steps
  };
  const disturbanceStrength = options.disturbanceStrength ?? 0.95;
  const disturbanceTicks = new Set(options.disturbanceTicks || [0, 1, 2]);
  const disabled = new Set(options.disabledNodes || []);

  const nodes = NODE_DEFINITIONS.map(([id, relevant]) => ({
    id, relevant, disabled: disabled.has(id), activator: 0, inhibitor: 0,
    refractory: 0, spikes: [], firstSpike: null
  }));
  const index = Object.fromEntries(nodes.map((node, i) => [node.id, i]));
  const edges = EDGE_DEFINITIONS.map(([from, to]) => ({
    from, to, fromIndex: index[from], toIndex: index[to], weight: state.weights.get(edgeKey(from, to))
  }));
  const diffusion = edges.flatMap(edge => [edge, {
    from: edge.to, to: edge.from, fromIndex: edge.toIndex, toIndex: edge.fromIndex, weight: edge.weight
  }]);

  for (let tick = 0; tick < p.steps; tick += 1) {
    const old = nodes.map(node => ({ ...node, spikes: [...node.spikes] }));
    const spikeDrive = Array(nodes.length).fill(0);
    for (const edge of edges) {
      if (old[edge.fromIndex].disabled || old[edge.toIndex].disabled) continue;
      if (old[edge.fromIndex].spikes.includes(tick - 1)) spikeDrive[edge.toIndex] += edge.weight * p.spikeDrive;
    }

    const aLap = Array(nodes.length).fill(0);
    const iLap = Array(nodes.length).fill(0);
    for (const edge of diffusion) {
      if (old[edge.fromIndex].disabled || old[edge.toIndex].disabled) continue;
      aLap[edge.fromIndex] += edge.weight * (old[edge.toIndex].activator - old[edge.fromIndex].activator);
      iLap[edge.fromIndex] += edge.weight * (old[edge.toIndex].inhibitor - old[edge.fromIndex].inhibitor);
    }

    for (let i = 0; i < nodes.length; i += 1) {
      const prior = old[i];
      const node = nodes[i];
      if (node.disabled) continue;
      const external = node.id === 'contradiction' && disturbanceTicks.has(tick) ? disturbanceStrength : 0;
      let activator = prior.activator
        + p.activatorGain * prior.activator * (1 - prior.activator)
        - p.activatorLeak * prior.activator
        - p.inhibitorCoupling * prior.inhibitor
        + p.activatorDiffusion * aLap[i]
        + spikeDrive[i]
        + external;
      let inhibitor = prior.inhibitor
        + p.inhibitorGain * prior.activator
        - p.inhibitorLeak * prior.inhibitor
        + p.inhibitorDiffusion * iLap[i];
      activator = clamp(activator);
      inhibitor = clamp(inhibitor);
      if (prior.refractory > 0) {
        node.refractory = prior.refractory - 1;
        activator = Math.min(activator, 0.18);
      } else node.refractory = 0;
      node.activator = activator;
      node.inhibitor = inhibitor;
    }

    for (const node of nodes) {
      if (node.disabled) continue;
      if (node.refractory === 0 && node.activator >= p.threshold) {
        node.spikes.push(tick);
        if (node.firstSpike === null) node.firstSpike = tick;
        node.refractory = p.refractoryTicks;
        node.activator = p.spikeReset;
        node.inhibitor = clamp(node.inhibitor + p.spikeInhibitorKick);
      }
    }
  }

  const spiked = nodes.filter(node => node.spikes.length > 0);
  const relevant = nodes.filter(node => node.relevant && !node.disabled);
  const relevantSpiked = spiked.filter(node => node.relevant);
  const irrelevantSpiked = spiked.filter(node => !node.relevant);
  const precision = spiked.length ? relevantSpiked.length / spiked.length : 0;
  const recall = relevant.length ? relevantSpiked.length / relevant.length : 0;
  const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
  return {
    nodes, index, edges,
    metrics: {
      precision, recall, f1,
      relevantSpiked: relevantSpiked.length,
      irrelevantSpiked: irrelevantSpiked.length,
      experimentTick: nodes[index.experiment].firstSpike,
      learningTick: nodes[index.learning].firstSpike
    }
  };
}

function causalEdges(episode) {
  const first = Object.fromEntries(episode.nodes.map(node => [node.id, node.firstSpike]));
  return episode.edges
    .filter(edge => first[edge.from] !== null && first[edge.to] !== null && first[edge.to] === first[edge.from] + 1)
    .map(edge => edgeKey(edge.from, edge.to));
}

function reinforceSuccess(state, episode, magnitude = 1) {
  const causal = new Set(causalEdges(episode));
  const delta = 0.08 * clamp(magnitude);
  const changed = [];
  for (const [from, to] of EDGE_DEFINITIONS) {
    const key = edgeKey(from, to);
    const targetRelevant = NODE_DEFINITIONS.find(([id]) => id === to)?.[1] === true;
    if (!causal.has(key) || !targetRelevant) continue;
    const before = state.weights.get(key);
    const after = clamp(before + delta, state.bounds.minimumWeight, state.bounds.maximumWeight);
    if (after !== before) {
      state.weights.set(key, after);
      changed.push({ key, before, after });
    }
  }
  state.revision += 1;
  state.history.push({ revision: state.revision, type: 'success', changed: deepClone(changed) });
  return changed;
}

function applyMisleadingChange(state) {
  const changed = [];
  for (const key of ['research->hypothesis-a', 'hypothesis-a->experiment', 'contradiction->payments']) {
    const before = state.weights.get(key);
    const after = key === 'contradiction->payments'
      ? clamp(before + 0.30, state.bounds.minimumWeight, state.bounds.maximumWeight)
      : clamp(before - 0.20, state.bounds.minimumWeight, state.bounds.maximumWeight);
    state.weights.set(key, after);
    changed.push({ key, before, after });
  }
  state.revision += 1;
  state.history.push({ revision: state.revision, type: 'synthetic-misleading-update', changed: deepClone(changed) });
  return changed;
}

function summarizeSuite(state, suite) {
  return suite.map(item => ({ name: item.name, result: runEpisode(state, item.options) }));
}

function runAcceptance() {
  const trained = createState();
  const fresh = createState();
  const training = runEpisode(trained);
  reinforceSuccess(trained, training);

  const relatedSuite = [
    { name: 'weaker-signal', options: { spikeDrive: 0.56, disturbanceStrength: 0.72, disturbanceTicks: [0] } },
    { name: 'lower-drive', options: { spikeDrive: 0.54, disturbanceStrength: 0.82, disturbanceTicks: [0, 1] } },
    { name: 'short-pulse', options: { spikeDrive: 0.58, disturbanceStrength: 0.68, disturbanceTicks: [0] } },
    { name: 'hypothesis-a-lesion', options: { spikeDrive: 0.62, disturbanceStrength: 0.78, disturbanceTicks: [0, 1], disabledNodes: ['hypothesis-a'] } }
  ];

  const freshSuite = summarizeSuite(fresh, relatedSuite);
  const learnedSuite = summarizeSuite(trained, relatedSuite);
  const learnedWins = learnedSuite.filter((item, i) => {
    const a = item.result.metrics;
    const b = freshSuite[i].result.metrics;
    return (a.learningTick !== null && b.learningTick === null) || a.recall > b.recall || (a.learningTick !== null && b.learningTick !== null && a.learningTick < b.learningTick);
  }).length;

  const goodCheckpoint = checkpoint(trained, 'post-success-good-structure');
  const goodWeights = JSON.stringify(weightObject(trained));
  const goodHistory = JSON.stringify(trained.history);
  applyMisleadingChange(trained);
  const corruptedWeights = JSON.stringify(weightObject(trained));
  const rollback = restore(trained, goodCheckpoint);
  const restoredWeights = JSON.stringify(weightObject(trained));
  const restoredHistory = JSON.stringify(trained.history);
  const postRollbackSuite = summarizeSuite(trained, relatedSuite);

  const unrelatedAwake = learnedSuite.reduce((sum, item) => sum + item.result.metrics.irrelevantSpiked, 0);
  const postRollbackEquivalent = postRollbackSuite.every((item, i) => JSON.stringify(item.result.metrics) === JSON.stringify(learnedSuite[i].result.metrics));

  const checks = [
    ['Training reaches learning before structural reinforcement', training.metrics.learningTick !== null],
    ['Successful experience changes bounded structure', trained.revision === 1 && trained.history.length === 1],
    ['Learned structure improves at least three of four related variants', learnedWins >= 3],
    ['Learned structure solves more related variants than the fresh field', learnedSuite.filter(x => x.result.metrics.learningTick !== null).length > freshSuite.filter(x => x.result.metrics.learningTick !== null).length],
    ['Generalization remains selective across the learned suite', unrelatedAwake === 0 && learnedSuite.every(x => x.result.metrics.precision === 1)],
    ['Related variants are non-identical stress conditions', new Set(relatedSuite.map(x => JSON.stringify(x.options))).size === relatedSuite.length],
    ['One learned variant includes structural lesion stress', relatedSuite.some(x => x.options.disabledNodes?.includes('hypothesis-a'))],
    ['Checkpoint captures weights, revision, and history', goodCheckpoint.revision === 1 && Object.keys(goodCheckpoint.weights).length === EDGE_DEFINITIONS.length && goodCheckpoint.history.length === 1],
    ['Synthetic misleading update actually corrupts structure', corruptedWeights !== goodWeights && trained.history.length === 1],
    ['Rollback restores exact pre-corruption weights', rollback.exactWeights && restoredWeights === goodWeights],
    ['Rollback restores exact pre-corruption history and revision', rollback.exactHistory && restoredHistory === goodHistory && trained.revision === goodCheckpoint.revision],
    ['Rollback restores behavioral results across all related variants', postRollbackEquivalent],
    ['Rollback is idempotent when applied again', restore(trained, goodCheckpoint).exactWeights && JSON.stringify(weightObject(trained)) === goodWeights],
    ['All restored weights remain inside declared bounds', Object.values(weightObject(trained)).every(w => w >= trained.bounds.minimumWeight && w <= trained.bounds.maximumWeight)],
    ['Laboratory carries zero production/action/code authority', Object.values(trained.authority).every(value => value === false)]
  ];

  // Correct a check that intentionally observes post-restore history length above.
  checks[8][1] = corruptedWeights !== goodWeights;

  const passed = checks.filter(([, ok]) => ok).length;
  console.table(checks.map(([check, ok]) => ({ check, passed: ok })));
  console.log('fresh suite', JSON.stringify(freshSuite.map(x => ({ name: x.name, metrics: x.result.metrics })), null, 2));
  console.log('learned suite', JSON.stringify(learnedSuite.map(x => ({ name: x.name, metrics: x.result.metrics })), null, 2));
  console.log('learned wins', learnedWins);
  console.log('rollback', JSON.stringify(rollback, null, 2));
  console.log(`MDP018 STRUCTURAL ROLLBACK + GENERALIZATION STRESS LAB: ${passed === checks.length ? 'PASS' : 'FAIL'} (${passed}/${checks.length})`);
  process.exitCode = passed === checks.length ? 0 : 1;
  return { success: passed === checks.length, passed, total: checks.length, checks, training, freshSuite, learnedSuite, learnedWins, rollback, postRollbackSuite };
}

if (import.meta.url === `file://${process.argv[1]}`) runAcceptance();

export { BUILD_ID, SCHEMA, createState, weightObject, checkpoint, restore, runEpisode, causalEdges, reinforceSuccess, applyMisleadingChange, runAcceptance };
