const GJ_PER_MMBTU = 1.05505585262;
const KJ_PER_KCAL = 4.1868;

export function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

export function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function coalUsdPerMmbtu(usdPerTonne, narKcalPerKg) {
  const gjPerTonne = (narKcalPerKg * 1000 * KJ_PER_KCAL) / 1_000_000;
  const mmbtuPerTonne = gjPerTonne / GJ_PER_MMBTU;
  return usdPerTonne / mmbtuPerTonne;
}

export function fuelPriceKrwPerMmbtu(fuel, scenario, assumptions) {
  if (fuel === "coal") {
    const usdPerTonne = scenario.recognizedFuelMode
      ? scenario.recognizedCoalUsdPerTonne
      : scenario.spotCoalUsdPerTonne;
    return coalUsdPerMmbtu(usdPerTonne, assumptions.coalNarKcalPerKg) * scenario.fxKrwPerUsd;
  }

  if (fuel === "lng") {
    const usdPerMmbtu = scenario.recognizedFuelMode
      ? scenario.recognizedLngUsdPerMmbtu
      : scenario.spotLngUsdPerMmbtu;
    return usdPerMmbtu * scenario.fxKrwPerUsd;
  }

  return 0;
}

export function variableCostKrwPerKwh(block, scenario, assumptions) {
  if (block.fuel === "renewable") return 0;
  if (block.fuel === "nuclear") return block.variableOmKrwPerKwh;
  if (block.fuel === "pumpedStorage") return block.variableOmKrwPerKwh;
  const carbonRecognition = (scenario.carbonRecognitionPct ?? 100) / 100;

  if (block.fuel === "oil" || block.fuel === "other") {
    const carbon = ((assumptions.emissionsTonnePerMwh[block.fuel] || 0) * scenario.carbonKrwPerTonne * carbonRecognition) / 1000;
    return block.variableOmKrwPerKwh + carbon;
  }

  const fuel = fuelPriceKrwPerMmbtu(block.fuel, scenario, assumptions);
  const fuelKrwPerKwh = (fuel * block.heatRateMmbtuPerMwh) / 1000;
  const carbon = ((assumptions.emissionsTonnePerMwh[block.fuel] || 0) * scenario.carbonKrwPerTonne * carbonRecognition) / 1000;
  return fuelKrwPerKwh + block.variableOmKrwPerKwh + carbon;
}

function availableCapacity(block, scenario, assumptions) {
  if (block.fuel === "nuclear") {
    return block.capacityMw * (scenario.nuclearAvailablePct / 100);
  }

  if (block.fuel === "renewable") {
    const index = Math.max(0, Math.min(23, scenario.hour - 1));
    const profile = assumptions.renewableHourlyCapacityFactor[index];
    return block.capacityMw * profile * (scenario.renewableOutputPct / 100) * 5;
  }

  if (block.fuel === "coal") {
    const fineDustPenalty = scenario.fineDustSeason ? 0.86 : 1;
    return block.capacityMw * (scenario.coalCapPct / 100) * fineDustPenalty;
  }

  if (block.fuel === "lng" && scenario.transmissionTight) {
    return block.capacityMw * 0.94;
  }

  return block.capacityMw;
}

function blockMinimum(block, availableMw) {
  return Math.min(availableMw, availableMw * (block.minimumStablePct / 100));
}

function makeDispatchBlocks(scenario, assumptions) {
  return assumptions.representativeBlocks.map((block) => {
    const availableMw = availableCapacity(block, scenario, assumptions);
    const minimumMw = blockMinimum(block, availableMw);
    const variableCost = variableCostKrwPerKwh(block, scenario, assumptions);
    return {
      ...block,
      availableMw,
      minimumMw,
      flexibleMw: Math.max(0, availableMw - minimumMw),
      variableCostKrwPerKwh: variableCost
    };
  });
}

export function dispatchScenario(rawScenario, assumptions) {
  const scenario = {
    ...rawScenario,
    coalCapPct: rawScenario.fineDustSeason
      ? Math.min(rawScenario.coalCapPct, 72)
      : rawScenario.coalCapPct
  };
  const blocks = makeDispatchBlocks(scenario, assumptions);
  const dispatchById = new Map();
  let remainingLoadMw = scenario.loadMw;
  let mandatoryMw = 0;
  let marginal = null;

  for (const block of blocks) {
    if (block.minimumMw > 0) {
      const dispatchMw = Math.min(block.minimumMw, remainingLoadMw);
      mandatoryMw += dispatchMw;
      remainingLoadMw -= dispatchMw;
      dispatchById.set(block.id, dispatchMw);
      if (dispatchMw > 0) marginal = { ...block, dispatchMw, segment: "mandatory" };
    }
  }

  const flexibleBlocks = blocks
    .filter((block) => block.flexibleMw > 0)
    .sort((a, b) => a.variableCostKrwPerKwh - b.variableCostKrwPerKwh);

  for (const block of flexibleBlocks) {
    const dispatchMw = Math.max(0, Math.min(block.flexibleMw, remainingLoadMw));
    remainingLoadMw -= dispatchMw;
    dispatchById.set(block.id, (dispatchById.get(block.id) || 0) + dispatchMw);
    if (dispatchMw > 0) marginal = { ...block, dispatchMw, segment: "economic" };
    if (remainingLoadMw <= 0.0001) break;
  }

  const stack = blocks.map((block) => ({
    ...block,
    dispatchMw: dispatchById.get(block.id) || 0,
    segment: block.id === marginal?.id ? marginal.segment : block.priority
  }));
  const dispatched = stack.filter((block) => block.dispatchMw > 0);
  const availableMw = sum(blocks.map((block) => block.availableMw));
  const dispatchedMw = sum(dispatched.map((block) => block.dispatchMw));
  const reserveMw = Math.max(0, availableMw - scenario.loadMw);
  const reserveMarginPct = scenario.loadMw > 0 ? (reserveMw / scenario.loadMw) * 100 : 0;
  const reserveShortPct = Math.max(0, scenario.reserveTargetPct - reserveMarginPct);
  const scarcityPremium = scenario.reserveScarcityPremium ? reserveShortPct * 2.4 : 0;
  const smpKrwPerKwh = marginal
    ? marginal.variableCostKrwPerKwh + scarcityPremium
    : 0;

  return {
    scenario,
    stack,
    dispatched,
    marginal,
    shortageMw: Math.max(0, remainingLoadMw),
    mandatoryMw,
    availableMw,
    dispatchedMw,
    reserveMw,
    reserveMarginPct,
    scarcityPremium,
    smpKrwPerKwh,
    generationByFuel: groupDispatchByFuel(stack),
    costByFuel: weightedCostByFuel(stack),
    coalSharePct: dispatchedMw > 0 ? (groupDispatchByFuel(stack).coal || 0) / dispatchedMw * 100 : 0,
    lngSharePct: dispatchedMw > 0 ? (groupDispatchByFuel(stack).lng || 0) / dispatchedMw * 100 : 0
  };
}

export function groupDispatchByFuel(stack) {
  return stack.reduce((groups, block) => {
    groups[block.fuel] = (groups[block.fuel] || 0) + block.dispatchMw;
    return groups;
  }, {});
}

export function weightedCostByFuel(stack) {
  const grouped = {};
  for (const block of stack) {
    if (block.dispatchMw <= 0) continue;
    const current = grouped[block.fuel] || { mw: 0, weightedCost: 0 };
    current.mw += block.dispatchMw;
    current.weightedCost += block.dispatchMw * block.variableCostKrwPerKwh;
    grouped[block.fuel] = current;
  }

  return Object.fromEntries(
    Object.entries(grouped).map(([fuel, value]) => [
      fuel,
      value.mw > 0 ? value.weightedCost / value.mw : 0
    ])
  );
}

export function explainSwitching(scenario, assumptions) {
  const base = dispatchScenario(scenario, assumptions);
  const noPolicy = dispatchScenario({
    ...scenario,
    fineDustSeason: false,
    coalCapPct: 100
  }, assumptions);
  const spot = dispatchScenario({
    ...scenario,
    recognizedFuelMode: false
  }, assumptions);
  const nuclearTight = dispatchScenario({
    ...scenario,
    nuclearAvailablePct: Math.max(50, scenario.nuclearAvailablePct - 12)
  }, assumptions);

  const baseCoal = base.generationByFuel.coal || 0;
  const baseLng = base.generationByFuel.lng || 0;

  return {
    base,
    noPolicy,
    spot,
    nuclearTight,
    effects: [
      {
        id: "policy",
        label: "Coal policy/cap effect",
        coalDeltaMw: baseCoal - (noPolicy.generationByFuel.coal || 0),
        lngDeltaMw: baseLng - (noPolicy.generationByFuel.lng || 0),
        detail: "Negative coal means the modeled cap is holding coal below unconstrained economic dispatch."
      },
      {
        id: "spot",
        label: "Spot-vs-recognized fuel effect",
        coalDeltaMw: (spot.generationByFuel.coal || 0) - baseCoal,
        lngDeltaMw: (spot.generationByFuel.lng || 0) - baseLng,
        detail: "Shows what would change if spot fuel prices immediately replaced recognized KPX-style costs."
      },
      {
        id: "nuclear",
        label: "Nuclear outage sensitivity",
        coalDeltaMw: (nuclearTight.generationByFuel.coal || 0) - baseCoal,
        lngDeltaMw: (nuclearTight.generationByFuel.lng || 0) - baseLng,
        detail: "Shows residual-load pressure when nuclear availability falls by 12 percentage points."
      }
    ]
  };
}

export function observedMarginalFuelShare(counts) {
  const total = counts.totals.all;
  return {
    coalPct: counts.totals.coal / total * 100,
    lngPct: counts.totals.lng / total * 100,
    otherPct: (total - counts.totals.coal - counts.totals.lng) / total * 100
  };
}
