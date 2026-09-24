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

const DEFAULT_PARAMETERS = Object.freeze({
  activatorDiffusion: 0.04, inhibitorDiffusion: 0.18, activatorGain: 0.14,
  activatorLeak: 0.20, inhibitorGain: 0.20, inhibitorLeak: 0.10,
  inhibitorCoupling: 0.36, spikeDrive: 0.68, threshold: 0.55,
  refractoryTicks: 3, spikeReset: 0.12, spikeInhibitorKick: 0.35, steps: 30
});

/*
 * Project Maddy / MEOS
 * MDP017 — Outcome-Conditioned Structural Plasticity Laboratory
 * Build: MDP017-OUTCOME-CONDITIONED-STRUCTURAL-PLASTICITY-20260924-A
 *
 * Mission:
 * Test whether successful experience can make a later related cognitive episode
 * easier/more selective, and whether a later bad outcome can weaken the implicated
 * route without globally reinforcing or globally suppressing the field.
 *
 * This is an isolated laboratory. It does not modify production cognition,
 * production weights, code, policy, missions, providers, or authority.
 */

const BUILD_ID = 'MDP017-OUTCOME-CONDITIONED-STRUCTURAL-PLASTICITY-20260924-A';
const SCHEMA = 'meos.maddy.cognitive-morphogenesis-plasticity-lab.v1';

const clamp = (value, minimum = 0, maximum = 1) =>
  Math.max(minimum, Math.min(maximum, Number.isFinite(Number(value)) ? Number(value) : minimum));

const edgeKey = (from, to) => `${from}->${to}`;
const clone = value => JSON.parse(JSON.stringify(value));

function createPlasticityState() {
  const weights = new Map();
  for (const [from, to, weight] of EDGE_DEFINITIONS) {
    weights.set(edgeKey(from, to), weight);
  }
  return {
    schema: SCHEMA,
    buildId: BUILD_ID,
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

function snapshotWeights(state) {
  return Object.fromEntries([...state.weights.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function buildEpisode(state, options = {}) {
  const parameters = {
    ...DEFAULT_PARAMETERS,
    steps: 30,
    spikeDrive: options.spikeDrive ?? DEFAULT_PARAMETERS.spikeDrive,
    threshold: options.threshold ?? DEFAULT_PARAMETERS.threshold
  };
  const disturbanceStrength = options.disturbanceStrength ?? 0.95;
  const disturbanceTicks = new Set(options.disturbanceTicks || [0, 1, 2]);
  const disabled = new Set(options.disabledNodes || []);

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

  const directedEdges = EDGE_DEFINITIONS.map(([from, to]) => ({
    from,
    to,
    fromIndex: index[from],
    toIndex: index[to],
    weight: state.weights.get(edgeKey(from, to)) ?? 0
  }));
  const diffusionEdges = [];
  for (const edge of directedEdges) {
    diffusionEdges.push(edge, {
      from: edge.to,
      to: edge.from,
      fromIndex: edge.toIndex,
      toIndex: edge.fromIndex,
      weight: edge.weight
    });
  }

  const timeline = [];
  let integratedActivator = 0;

  for (let tick = 0; tick < parameters.steps; tick += 1) {
    const old = nodes.map(node => ({ ...node, spikes: [...node.spikes] }));
    const incomingSpikeDrive = Array(nodes.length).fill(0);

    for (const edge of directedEdges) {
      if (old[edge.fromIndex].disabled || old[edge.toIndex].disabled) continue;
      if (old[edge.fromIndex].spikes.includes(tick - 1)) {
        incomingSpikeDrive[edge.toIndex] += edge.weight * parameters.spikeDrive;
      }
    }

    const activatorLaplacian = Array(nodes.length).fill(0);
    const inhibitorLaplacian = Array(nodes.length).fill(0);
    for (const edge of diffusionEdges) {
      if (old[edge.fromIndex].disabled || old[edge.toIndex].disabled) continue;
      activatorLaplacian[edge.fromIndex] += edge.weight * (old[edge.toIndex].activator - old[edge.fromIndex].activator);
      inhibitorLaplacian[edge.fromIndex] += edge.weight * (old[edge.toIndex].inhibitor - old[edge.fromIndex].inhibitor);
    }

    for (let position = 0; position < nodes.length; position += 1) {
      const prior = old[position];
      const node = nodes[position];
      if (node.disabled) {
        node.activator = 0;
        node.inhibitor = 0;
        node.refractory = 0;
        continue;
      }

      const external = node.id === 'contradiction' && disturbanceTicks.has(tick)
        ? disturbanceStrength
        : 0;
      let activator =
        prior.activator +
        parameters.activatorGain * prior.activator * (1 - prior.activator) -
        parameters.activatorLeak * prior.activator -
        parameters.inhibitorCoupling * prior.inhibitor +
        parameters.activatorDiffusion * activatorLaplacian[position] +
        incomingSpikeDrive[position] +
        external;

      let inhibitor =
        prior.inhibitor +
        parameters.inhibitorGain * prior.activator -
        parameters.inhibitorLeak * prior.inhibitor +
        parameters.inhibitorDiffusion * inhibitorLaplacian[position];

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
    for (const node of nodes) {
      if (node.disabled) continue;
      node.maxActivator = Math.max(node.maxActivator, node.activator);
      integratedActivator += node.activator;
      if (node.refractory === 0 && node.activator >= parameters.threshold) {
        node.spikes.push(tick);
        if (node.firstSpike === null) node.firstSpike = tick;
        node.refractory = parameters.refractoryTicks;
        node.activator = parameters.spikeReset;
        node.inhibitor = clamp(node.inhibitor + parameters.spikeInhibitorKick);
        tickSpikes.push(node.id);
      }
    }

    timeline.push({ tick, spikes: tickSpikes });
  }

  const spiked = nodes.filter(node => node.spikes.length > 0);
  const relevant = nodes.filter(node => node.relevant && !node.disabled);
  const relevantSpiked = spiked.filter(node => node.relevant);
  const irrelevantSpiked = spiked.filter(node => !node.relevant);
  const precision = spiked.length ? relevantSpiked.length / spiked.length : 0;
  const recall = relevant.length ? relevantSpiked.length / relevant.length : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    nodes,
    index,
    directedEdges,
    timeline,
    parameters,
    disturbanceStrength,
    metrics: {
      precision,
      recall,
      f1,
      relevantSpiked: relevantSpiked.length,
      irrelevantSpiked: irrelevantSpiked.length,
      totalSpikes: spiked.reduce((sum, node) => sum + node.spikes.length, 0),
      integratedActivator: Number(integratedActivator.toFixed(6)),
      learningTick: nodes[index.learning].firstSpike,
      experimentTick: nodes[index.experiment].firstSpike,
      hypothesisATick: nodes[index['hypothesis-a']].firstSpike,
      hypothesisBTick: nodes[index['hypothesis-b']].firstSpike
    }
  };
}

function causalEdgesFromEpisode(episode) {
  const firstSpike = Object.fromEntries(episode.nodes.map(node => [node.id, node.firstSpike]));
  return episode.directedEdges
    .filter(edge => {
      const sourceTick = firstSpike[edge.from];
      const targetTick = firstSpike[edge.to];
      return sourceTick !== null && targetTick !== null && targetTick === sourceTick + 1;
    })
    .map(edge => edgeKey(edge.from, edge.to));
}

function applyOutcome(state, episode, outcome = {}) {
  const valence = Number(outcome.valence || 0);
  const magnitude = clamp(Math.abs(valence), 0, 1);
  const causal = new Set(causalEdgesFromEpisode(episode));
  const changed = [];
  const before = snapshotWeights(state);

  if (valence > 0) {
    const successDelta = 0.08 * magnitude;
    const irrelevantDecay = 0.015 * magnitude;
    for (const [from, to] of EDGE_DEFINITIONS) {
      const key = edgeKey(from, to);
      const oldWeight = state.weights.get(key);
      const targetRelevant = NODE_DEFINITIONS.find(([id]) => id === to)?.[1] === true;
      let nextWeight = oldWeight;
      if (causal.has(key) && targetRelevant) {
        nextWeight = clamp(oldWeight + successDelta, state.bounds.minimumWeight, state.bounds.maximumWeight);
      } else if (!targetRelevant && episode.nodes[episode.index[from]]?.firstSpike !== null) {
        nextWeight = clamp(oldWeight - irrelevantDecay, state.bounds.minimumWeight, state.bounds.maximumWeight);
      }
      if (nextWeight !== oldWeight) {
        state.weights.set(key, nextWeight);
        changed.push({ key, from, to, before: oldWeight, after: nextWeight, reason: nextWeight > oldWeight ? 'successful-causal-route' : 'irrelevant-route-decay' });
      }
    }
  } else if (valence < 0) {
    const blamedNodes = new Set(outcome.blameNodes || []);
    const penalty = 0.12 * magnitude;
    for (const [from, to] of EDGE_DEFINITIONS) {
      const key = edgeKey(from, to);
      if (!causal.has(key)) continue;
      if (!(blamedNodes.has(from) || blamedNodes.has(to))) continue;
      const oldWeight = state.weights.get(key);
      const nextWeight = clamp(oldWeight - penalty, state.bounds.minimumWeight, state.bounds.maximumWeight);
      if (nextWeight !== oldWeight) {
        state.weights.set(key, nextWeight);
        changed.push({ key, from, to, before: oldWeight, after: nextWeight, reason: 'negative-outcome-blame' });
      }
    }
  }

  state.revision += 1;
  const after = snapshotWeights(state);
  state.history.push({
    revision: state.revision,
    valence,
    magnitude,
    blameNodes: [...(outcome.blameNodes || [])],
    causalEdges: [...causal],
    changed: clone(changed),
    before,
    after
  });
  return state.history[state.history.length - 1];
}

function totalWeightDrift(before, after) {
  return Number(Object.keys(before).reduce((sum, key) => sum + Math.abs((after[key] ?? 0) - (before[key] ?? 0)), 0).toFixed(6));
}

function runAcceptance() {
  const state = createPlasticityState();
  const originalWeights = snapshotWeights(state);

  // Episode 1: full-strength successful experience establishes an experienced causal route.
  const training = buildEpisode(state);
  const successUpdate = applyOutcome(state, training, { valence: 1 });
  const learnedWeights = snapshotWeights(state);

  // Episode 2: a harder related problem. Lower spike drive represents less cognitive/excitation budget.
  const lowBudgetOptions = { spikeDrive: 0.56, disturbanceStrength: 0.72, disturbanceTicks: [0] };
  const unlearnedState = createPlasticityState();
  const unlearnedLowBudget = buildEpisode(unlearnedState, lowBudgetOptions);
  const learnedLowBudget = buildEpisode(state, lowBudgetOptions);

  // Episode 3: a bad outcome implicates hypothesis-a only. It should weaken that local route,
  // not erase the alternate hypothesis-b route or globally rewrite the graph.
  const badOutcomeUpdate = applyOutcome(state, training, { valence: -1, blameNodes: ['hypothesis-a'] });
  const postBadWeights = snapshotWeights(state);
  const postBad = buildEpisode(state);

  const successChangedKeys = new Set(successUpdate.changed.map(item => item.key));
  const badChangedKeys = new Set(badOutcomeUpdate.changed.map(item => item.key));
  const hAIn = edgeKey('research', 'hypothesis-a');
  const hAOut = edgeKey('hypothesis-a', 'experiment');
  const hBIn = edgeKey('research', 'hypothesis-b');
  const hBOut = edgeKey('hypothesis-b', 'experiment');

  const checks = [
    ['Training episode reaches learning before plasticity', training.metrics.learningTick !== null],
    ['Positive outcome changes only a bounded subset of edges', successUpdate.changed.length > 0 && successUpdate.changed.length < EDGE_DEFINITIONS.length],
    ['Successful causal route is strengthened', learnedWeights[hBIn] > originalWeights[hBIn] && learnedWeights[hBOut] > originalWeights[hBOut]],
    ['Unrelated routes are not positively reinforced', [...successChangedKeys].every(key => !key.endsWith('->payments') && !key.endsWith('->voice') && !key.endsWith('->media') && !key.endsWith('->grants') || learnedWeights[key] <= originalWeights[key])],
    ['Learned field solves the lower-budget related episode', learnedLowBudget.metrics.learningTick !== null],
    ['Learning improves lower-budget capability over the unlearned field', unlearnedLowBudget.metrics.learningTick === null || learnedLowBudget.metrics.learningTick < unlearnedLowBudget.metrics.learningTick || learnedLowBudget.metrics.recall > unlearnedLowBudget.metrics.recall],
    ['Learned lower-budget episode remains selective', learnedLowBudget.metrics.irrelevantSpiked === 0 && learnedLowBudget.metrics.precision === 1],
    ['Bad outcome weakens the specifically blamed hypothesis-a route', postBadWeights[hAIn] < learnedWeights[hAIn] && postBadWeights[hAOut] < learnedWeights[hAOut]],
    ['Bad outcome does not weaken the alternate hypothesis-b route', postBadWeights[hBIn] === learnedWeights[hBIn] && postBadWeights[hBOut] === learnedWeights[hBOut]],
    ['Bad outcome update is local rather than global', badOutcomeUpdate.changed.length > 0 && badOutcomeUpdate.changed.length <= 2 && [...badChangedKeys].every(key => key.includes('hypothesis-a'))],
    ['After negative feedback the alternate route still carries the field to learning', postBad.metrics.learningTick !== null && postBad.metrics.hypothesisBTick !== null],
    ['Plasticity remains bounded inside declared edge limits', Object.values(postBadWeights).every(weight => weight >= state.bounds.minimumWeight && weight <= state.bounds.maximumWeight)],
    ['Structural drift stays small relative to the graph', totalWeightDrift(originalWeights, postBadWeights) < 1.5],
    ['Plasticity state records outcome-conditioned structural history', state.history.length === 2 && state.revision === 2],
    ['Laboratory retains zero production/action/code authority', Object.values(state.authority).every(value => value === false)]
  ];

  const passed = checks.filter(([, ok]) => ok).length;
  console.table(checks.map(([check, ok]) => ({ check, passed: ok })));
  console.log('training metrics', JSON.stringify(training.metrics, null, 2));
  console.log('unlearned low-budget metrics', JSON.stringify(unlearnedLowBudget.metrics, null, 2));
  console.log('learned low-budget metrics', JSON.stringify(learnedLowBudget.metrics, null, 2));
  console.log('success update', JSON.stringify(successUpdate.changed, null, 2));
  console.log('bad outcome update', JSON.stringify(badOutcomeUpdate.changed, null, 2));
  console.log('post-bad metrics', JSON.stringify(postBad.metrics, null, 2));
  console.log('weight drift', totalWeightDrift(originalWeights, postBadWeights));
  console.log(`MDP017 OUTCOME-CONDITIONED STRUCTURAL PLASTICITY LAB: ${passed === checks.length ? 'PASS' : 'FAIL'} (${passed}/${checks.length})`);
  process.exitCode = passed === checks.length ? 0 : 1;
  return { success: passed === checks.length, passed, total: checks.length, checks, training, unlearnedLowBudget, learnedLowBudget, successUpdate, badOutcomeUpdate, postBad, state };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAcceptance();
}

export {
  BUILD_ID,
  SCHEMA,
  createPlasticityState,
  snapshotWeights,
  buildEpisode,
  causalEdgesFromEpisode,
  applyOutcome,
  totalWeightDrift,
  runAcceptance
};
