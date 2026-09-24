import fs from 'fs';
import vm from 'vm';
import path from 'path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const root = path.join(repoRoot, 'frontend');
const calls = {
  attendToWorldModelChange: 0,
  scheduleCognitiveReentry: 0,
  runContinuousCognitionCycle: 0,
  providerCall: 0,
  spend: 0,
  missionCreate: 0,
  investigation: 0,
  externalAction: 0,
  brainNeuromorphicEvent: 0,
  brainNeuromorphicSpike: 0
};
const scheduled = [];
let timerSeq = 0;
const context = {
  console,
  structuredClone: globalThis.structuredClone,
  Date,
  Math,
  JSON,
  Map,
  Set,
  Promise,
  URL,
  setTimeout(fn, ms) { const id = ++timerSeq; scheduled.push({id, fn, ms}); return id; },
  clearTimeout() {},
  fetch: async () => { calls.providerCall++; throw new Error('network forbidden in acceptance'); },
};
context.window = context;
context.globalThis = context;
context.document = {
  readyState: 'loading',
  addEventListener() {},
  removeEventListener() {},
  getElementById() { return null; }
};
context.localStorage = {
  getItem() { return null; }, setItem() {}, removeItem() {}
};
context.sessionStorage = context.localStorage;

// Read-only organ fixtures. Intentionally create severe continuity pressure.
context.MEOSMissionEngine = {
  buildId: 'fixture-mission',
  getMissionSummary() { return { totalActive: 3, critical: 1, blocked: 1, pendingApproval: 0 }; },
  getPersistenceStatus() { return { durableAuthority: false, durableAvailable: false, degraded: true, suspended: true, mode: 'fixture-degraded', authoritativeStorage: 'fixture', lastError: 'synthetic continuity disturbance' }; },
  createMission() { calls.missionCreate++; }
};
context.ExecutiveMonitoring = {
  buildId: 'fixture-monitoring',
  getStatus() { return { status: 'online', buildId: 'fixture-monitoring', analytics: { openAlerts: 2, criticalAlerts: 1 } }; },
  scan() { calls.investigation++; }
};
context.MEOSProviderManager = {
  buildId: 'fixture-provider',
  getStatus() { return { operatingMode: 'provider-neutral-fixture', status: 'online', registeredProviders: 2, unavailableProviders: 1, activeExecutions: 0, persistence: {} }; },
  execute() { calls.providerCall++; }
};
context.ExecutiveEvidenceIntegrity = {
  buildId: 'fixture-evidence',
  getStatus() { return { status: 'online', buildId: 'fixture-evidence', schema: 'fixture' }; },
  investigate() { calls.investigation++; }
};

vm.createContext(context);
function load(name) {
  const code = fs.readFileSync(path.join(root, name), 'utf8');
  vm.runInContext(code, context, { filename: name });
}

// Load the actual current Executive Brain source but do not trigger DOM boot.
load('executive-brain.js');
const brain = context.ExecutiveBrain;
if (!brain) throw new Error('ExecutiveBrain failed to expose');
// Do not allow persistence in this acceptance.
brain.configuration.persistenceEnabled = false;
// Fixture ExecutiveBrain status reads are real getStatus(), but we need temporal continuity degraded.
// Sensor sees getStatus(), so override just its status surface while preserving actual neuromorphic method.
const actualGetStatus = brain.getStatus.bind(brain);
brain.getStatus = () => ({ ...actualGetStatus(), status: 'online', temporalContinuityReady: false, totalComponents: 10, availableComponents: 10, onlineComponents: 10 });
context.ExecutiveBrain = brain;

// Instrument every known browser cognition/action wake path.
for (const [method, key] of [
  ['attendToWorldModelChange', 'attendToWorldModelChange'],
  ['scheduleCognitiveReentry', 'scheduleCognitiveReentry'],
  ['runContinuousCognitionCycle', 'runContinuousCognitionCycle']
]) {
  const original = brain[method]?.bind(brain);
  if (original) brain[method] = (...args) => { calls[key]++; return { acceptanceIntercepted: true, args }; };
}
const originalEmit = brain.emit.bind(brain);
brain.emit = (name, payload) => {
  if (name === 'brain:neuromorphic-event') calls.brainNeuromorphicEvent++;
  if (name === 'brain:neuromorphic-spike') calls.brainNeuromorphicSpike++;
  return originalEmit(name, payload);
};

load('maddy-digital-physiology.js');
load('maddy-digital-physiology-sensors.js');
load('maddy-digital-physiology-neuromorphic.js');
load('maddy-digital-physiology-heartbeat.js');

// Heartbeat auto-start schedules but does not sample until timer fires. Use direct single sample.
const physiology = context.MaddyDigitalPhysiology;
const sensors = context.MaddyDigitalPhysiologySensors;
const neuro = context.MaddyDigitalPhysiologyNeuromorphicBridge;
const heartbeat = context.MaddyDigitalPhysiologyHeartbeat;

const sample = heartbeat.sampleOnce({ atMs: Date.now() });
const snapshot = physiology.lastSnapshot;
const integration = neuro.lastIntegration;
const spikeResults = integration?.results?.filter(x => x?.spiked === true) || [];
const forbiddenTotal = calls.attendToWorldModelChange + calls.scheduleCognitiveReentry + calls.runContinuousCognitionCycle + calls.providerCall + calls.spend + calls.missionCreate + calls.investigation + calls.externalAction;

const checks = [
  ['MDP011 registered five real organ senses', sensors.getStatus().lastInstall?.registered?.length === 5],
  ['Heartbeat sampled current registered senses', sample.success === true && sample.sampled === true],
  ['Physiology emitted a multidimensional snapshot', !!snapshot && snapshot.observedDimensionCount >= 4],
  ['Synthetic continuity disturbance crossed candidate threshold', physiology.deriveNeuromorphicEventCandidates(snapshot).some(c => c.channelKey === 'physiology:continuity')],
  ['MDP013 integrated at least one physiology candidate', integration?.integrated >= 1],
  ['Actual ExecutiveBrain neuromorphic integrator emitted a spike', spikeResults.length >= 1 && calls.brainNeuromorphicSpike >= 1],
  ['Spike retained explicit no-wake authority', spikeResults.every(r => r.authority?.cognitiveWakeAuthorized === false)],
  ['No browser cognitive re-entry path fired', calls.attendToWorldModelChange === 0 && calls.scheduleCognitiveReentry === 0 && calls.runContinuousCognitionCycle === 0],
  ['No investigation, mission, provider, spend, or external action fired', forbiddenTotal === 0],
  ['Heartbeat remains non-durable browser observation', heartbeat.getStatus().persistenceAuthority === 'none-browser-derived-observation-only'],
  ['Physiology did not acquire corrective authority', physiology.getStatus().authority?.correctiveActionAuthorized === false],
  ['The real spike is attention state, not automatic work', spikeResults.length >= 1 && forbiddenTotal === 0]
];
const passed = checks.filter(([, ok]) => ok).length;
console.table(checks.map(([name, ok]) => ({ check: name, passed: ok })));
console.log('sample', JSON.stringify(sample, null, 2));
console.log('highestPressure', JSON.stringify(snapshot?.highestPressureDimension, null, 2));
console.log('integration', JSON.stringify(integration, null, 2));
console.log('calls', JSON.stringify(calls, null, 2));
console.log(`MDP015 CONTROLLED PHYSIOLOGY SPIKE ACCEPTANCE: ${passed === checks.length ? 'PASS' : 'FAIL'} (${passed}/${checks.length})`);
process.exitCode = passed === checks.length ? 0 : 1;
