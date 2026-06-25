import {
  coalUsdPerMmbtu,
  round,
  sum,
  variableCostKrwPerKwh
} from "./model.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mmbtuPerTonne(narKcalPerKg) {
  return 1 / coalUsdPerMmbtu(1, narKcalPerKg);
}

function fuelScenario(scenario) {
  return {
    ...scenario,
    recognizedFuelMode: true,
    recognizedCoalUsdPerTonne: scenario.coalUsdPerTonne,
    recognizedLngUsdPerMmbtu: scenario.lngUsdPerMmbtu
  };
}

function monthlyAssumptions(scenario, assumptions) {
  return {
    ...assumptions,
    coalNarKcalPerKg: scenario.coalNarKcalPerKg || assumptions.coalNarKcalPerKg
  };
}

function fuelCost(fuel, scenario, assumptions) {
  const monthly = assumptions.monthly;
  const block = fuel === "coal"
    ? {
        fuel: "coal",
        heatRateMmbtuPerMwh: monthly.coalHeatRateMmbtuPerMwh,
        variableOmKrwPerKwh: monthly.coalVariableOmKrwPerKwh
      }
    : {
        fuel: "lng",
        heatRateMmbtuPerMwh: monthly.lngHeatRateMmbtuPerMwh,
        variableOmKrwPerKwh: monthly.lngVariableOmKrwPerKwh
      };
  return variableCostKrwPerKwh(block, fuelScenario(scenario), monthlyAssumptions(scenario, assumptions));
}

function monthBaseline(data, monthIndex) {
  const trading = data.monthly2025.tradingVolumeGwh;
  return {
    monthIndex,
    name: data.monthly2025.months[monthIndex],
    shortName: data.monthly2025.monthShort[monthIndex],
    days: data.monthly2025.days[monthIndex],
    smpKrwPerKwh: data.monthly2025.mainlandSmpKrwPerKwh[monthIndex],
    nuclear: trading.nuclear[monthIndex],
    coal: trading.coal[monthIndex],
    lng: trading.lng[monthIndex],
    oil: trading.oil[monthIndex],
    pumpedStorage: trading.pumpedStorage[monthIndex],
    renewable: trading.renewable[monthIndex],
    other: trading.other[monthIndex],
    total: trading.total[monthIndex]
  };
}

function fossilCapacityGwh(capacityMw, days, availabilityPct = 100) {
  return capacityMw * 24 * days * (availabilityPct / 100) / 1000;
}

export function coalMtFromGwh(gwh, scenario, assumptions) {
  const nar = scenario.coalNarKcalPerKg || assumptions.coalNarKcalPerKg;
  const heatRate = assumptions.monthly.coalHeatRateMmbtuPerMwh;
  return gwh * 1000 * heatRate / mmbtuPerTonne(nar) / 1_000_000;
}

export function coalBreakEvenUsdPerTonne(scenario, assumptions) {
  const adjustedAssumptions = monthlyAssumptions(scenario, assumptions);
  const monthly = adjustedAssumptions.monthly;
  const lngCost = fuelCost("lng", scenario, adjustedAssumptions);
  const carbonRecognition = (scenario.carbonRecognitionPct ?? 100) / 100;
  const coalCarbon = (
    (adjustedAssumptions.emissionsTonnePerMwh.coal || 0)
    * scenario.carbonKrwPerTonne
    * carbonRecognition
  ) / 1000;
  const nonFuelCoalCost = monthly.coalVariableOmKrwPerKwh + coalCarbon;
  const allowedFuelCost = lngCost - nonFuelCoalCost;
  const usdPerMmbtu = allowedFuelCost * 1000 / monthly.coalHeatRateMmbtuPerMwh / scenario.fxKrwPerUsd;
  return Math.max(0, usdPerMmbtu * mmbtuPerTonne(adjustedAssumptions.coalNarKcalPerKg));
}

function signalFor(result) {
  const delta = result.deltaCoalMt;
  if (result.coalCostKrwPerKwh > result.lngCostKrwPerKwh && result.switchRiskGwh > 500) {
    return {
      label: "LNG switch risk",
      tone: "risk",
      detail: "Coal is out of merit versus LNG across the modeled contestable band."
    };
  }
  if (delta >= 0.75 && result.coalPriceHeadroomUsdPerTonne > 4) {
    return {
      label: "Strong coal bid",
      tone: "support",
      detail: "Scenario coal burn is materially above the 2025 monthly baseline and coal remains in merit."
    };
  }
  if (delta >= 0.25) {
    return {
      label: "Tender support",
      tone: "support",
      detail: "Incremental burn is enough to matter for prompt cargo timing."
    };
  }
  if (delta <= -0.5) {
    return {
      label: "Soft coal demand",
      tone: "soft",
      detail: "Modeled coal burn is below the 2025 baseline for this month."
    };
  }
  return {
    label: "Balanced",
    tone: "neutral",
    detail: "Scenario burn is close to the 2025 baseline; price and outage shocks matter more than the base month."
  };
}

function simulateSingleMonth(rawScenario, data, monthIndex) {
  const scenario = { ...rawScenario, month: monthIndex + 1 };
  const assumptions = data.assumptions;
  const monthly = assumptions.monthly;
  const base = monthBaseline(data, monthIndex);
  const month = monthIndex + 1;
  const isFineDustSeason = month === 12 || month <= 3;
  const coalCost = fuelCost("coal", scenario, assumptions);
  const lngCost = fuelCost("lng", scenario, assumptions);
  const coalCheaper = coalCost <= lngCost;
  const referenceScenario = {
    ...data.defaultMonthlyScenario,
    month: scenario.month
  };
  const referenceSpread = fuelCost("lng", referenceScenario, assumptions) - fuelCost("coal", referenceScenario, assumptions);
  const currentSpread = lngCost - coalCost;
  const relativeCoalAdvantageShift = currentSpread - referenceSpread;
  const totalGwh = Math.max(0, base.total * (1 + scenario.demandDeltaPct / 100));
  const nuclearGwh = Math.max(0, base.nuclear * (1 + scenario.nuclearDeltaPct / 100));
  const renewableGwh = Math.max(0, base.renewable * (1 + scenario.renewableDeltaPct / 100));
  const fixedOtherGwh = base.oil + base.pumpedStorage + base.other;
  const fossilNeedGwh = Math.max(0, totalGwh - nuclearGwh - renewableGwh - fixedOtherGwh);
  const coalCapacityGwh = fossilCapacityGwh(
    data.annual2025.marketRegisteredCapacityMw.coal,
    base.days,
    scenario.coalAvailabilityPct
  );
  const seasonalDerate = scenario.seasonalRestrictionStress && isFineDustSeason ? 0.86 : 1;
  const coalMaxGwh = coalCapacityGwh * seasonalDerate;
  const lngMaxGwh = fossilCapacityGwh(
    data.annual2025.marketRegisteredCapacityMw.lng,
    base.days,
    monthly.lngAvailabilityPct
  );
  const coalFloorGwh = Math.min(base.coal * (scenario.coalMinRetentionPct / 100), coalMaxGwh);

  let coalGwh = Math.min(base.coal, coalMaxGwh);
  let lngGwh = base.lng + Math.max(0, base.coal - coalGwh);
  let shortageGwh = 0;
  let forcedCoalCapGwh = Math.max(0, base.coal - coalGwh);

  let delta = fossilNeedGwh - coalGwh - lngGwh;
  if (delta > 0) {
    const firstRoom = coalCheaper ? coalMaxGwh - coalGwh : lngMaxGwh - lngGwh;
    const firstAdd = Math.min(delta, Math.max(0, firstRoom));
    if (coalCheaper) coalGwh += firstAdd;
    else lngGwh += firstAdd;
    delta -= firstAdd;

    const secondRoom = coalCheaper ? lngMaxGwh - lngGwh : coalMaxGwh - coalGwh;
    const secondAdd = Math.min(delta, Math.max(0, secondRoom));
    if (coalCheaper) lngGwh += secondAdd;
    else coalGwh += secondAdd;
    delta -= secondAdd;
    shortageGwh = Math.max(0, delta);
  } else if (delta < 0) {
    let reduction = -delta;
    if (coalCheaper) {
      const lngCut = Math.min(reduction, lngGwh);
      lngGwh -= lngCut;
      reduction -= lngCut;
      const coalCut = Math.min(reduction, Math.max(0, coalGwh - coalFloorGwh));
      coalGwh -= coalCut;
    } else {
      const coalCut = Math.min(reduction, Math.max(0, coalGwh - coalFloorGwh));
      coalGwh -= coalCut;
      reduction -= coalCut;
      const lngCut = Math.min(reduction, lngGwh);
      lngGwh -= lngCut;
    }
  }

  const switchFactor = clamp(Math.abs(relativeCoalAdvantageShift) / monthly.fullSwitchSpreadKrwPerKwh, 0, 1);
  const contestableGwh = (base.coal + base.lng) * (scenario.switchableFossilPct / 100) * switchFactor;
  let economicSwitchGwh = 0;
  if (relativeCoalAdvantageShift > 0) {
    economicSwitchGwh = Math.min(contestableGwh, lngGwh, Math.max(0, coalMaxGwh - coalGwh));
    coalGwh += economicSwitchGwh;
    lngGwh -= economicSwitchGwh;
  } else if (relativeCoalAdvantageShift < 0) {
    economicSwitchGwh = Math.min(contestableGwh, Math.max(0, coalGwh - coalFloorGwh), Math.max(0, lngMaxGwh - lngGwh));
    coalGwh -= economicSwitchGwh;
    lngGwh += economicSwitchGwh;
  }

  const coalMt = coalMtFromGwh(coalGwh, scenario, assumptions);
  const baselineCoalMt = coalMtFromGwh(base.coal, scenario, assumptions);
  const coalCargoes = coalMt * 1000 / scenario.cargoSizeKt;
  const baselineCargoes = baselineCoalMt * 1000 / scenario.cargoSizeKt;
  const breakEvenCoal = coalBreakEvenUsdPerTonne(scenario, assumptions);
  const result = {
    scenario,
    base,
    isFineDustSeason,
    totalGwh,
    fossilNeedGwh,
    nuclearGwh,
    renewableGwh,
    coalGwh,
    lngGwh,
    fixedOtherGwh,
    coalMaxGwh,
    coalFloorGwh,
    lngMaxGwh,
    shortageGwh,
    coalCostKrwPerKwh: coalCost,
    lngCostKrwPerKwh: lngCost,
    coalCheaper,
    referenceSpreadKrwPerKwh: referenceSpread,
    currentSpreadKrwPerKwh: currentSpread,
    relativeCoalAdvantageShiftKrwPerKwh: relativeCoalAdvantageShift,
    economicSwitchGwh,
    switchRiskGwh: relativeCoalAdvantageShift < 0 ? economicSwitchGwh : 0,
    forcedCoalCapGwh,
    coalMt,
    baselineCoalMt,
    deltaCoalMt: coalMt - baselineCoalMt,
    coalCargoes,
    baselineCargoes,
    deltaCargoes: coalCargoes - baselineCargoes,
    breakEvenCoalUsdPerTonne: breakEvenCoal,
    coalPriceHeadroomUsdPerTonne: breakEvenCoal - scenario.coalUsdPerTonne,
    coalCapacityFactorPct: coalMaxGwh > 0 ? coalGwh / coalMaxGwh * 100 : 0,
    coalSharePct: totalGwh > 0 ? coalGwh / totalGwh * 100 : 0,
    lngSharePct: totalGwh > 0 ? lngGwh / totalGwh * 100 : 0
  };
  return {
    ...result,
    signal: signalFor(result)
  };
}

export function simulateMonthlyScenario(rawScenario, data) {
  const monthIndex = clamp((rawScenario.month || 1) - 1, 0, 11);
  return simulateSingleMonth(rawScenario, data, monthIndex);
}

export function simulateMonthlyStrip(rawScenario, data) {
  const start = clamp((rawScenario.month || 1) - 1, 0, 11);
  const months = Array.from(
    { length: data.assumptions.monthly.procurementWindowMonths },
    (_, offset) => (start + offset) % 12
  );
  const results = months.map((monthIndex) => simulateSingleMonth(rawScenario, data, monthIndex));
  const coalMt = sum(results.map((result) => result.coalMt));
  const baselineCoalMt = sum(results.map((result) => result.baselineCoalMt));
  return {
    results,
    coalMt,
    baselineCoalMt,
    deltaCoalMt: coalMt - baselineCoalMt,
    cargoes: sum(results.map((result) => result.coalCargoes)),
    baselineCargoes: sum(results.map((result) => result.baselineCargoes))
  };
}

export function simulateMonthlyCurve(rawScenario, data) {
  return data.monthly2025.months.map((_, monthIndex) => simulateSingleMonth(rawScenario, data, monthIndex));
}

export function formatMonthlyValue(value, digits = 1) {
  return round(value, digits);
}
