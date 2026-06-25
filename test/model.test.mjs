import assert from "node:assert/strict";
import { kpxData } from "../src/data.js";
import {
  coalUsdPerMmbtu,
  dispatchScenario,
  observedMarginalFuelShare,
  variableCostKrwPerKwh
} from "../src/model.js";
import {
  simulateMonthlyScenario,
  simulateMonthlyStrip
} from "../src/monthly-model.js";

const assumptions = kpxData.assumptions;
const scenario = { ...kpxData.defaultScenario };

const coalMmbtu = coalUsdPerMmbtu(100, 5500);
assert.ok(coalMmbtu > 4.4 && coalMmbtu < 4.8, `coal conversion was ${coalMmbtu}`);

const coalBlock = assumptions.representativeBlocks.find((block) => block.id === "coal-efficient");
const lngBlock = assumptions.representativeBlocks.find((block) => block.id === "lng-ccgt-mid");
const coalCost = variableCostKrwPerKwh(coalBlock, scenario, assumptions);
const lngCost = variableCostKrwPerKwh(lngBlock, scenario, assumptions);
assert.ok(coalCost < lngCost, `expected recognized coal cost ${coalCost} below LNG ${lngCost}`);

const result = dispatchScenario(scenario, assumptions);
assert.equal(result.shortageMw, 0);
assert.ok(result.dispatchedMw >= scenario.loadMw - 1);
assert.ok(result.marginal);
assert.ok(result.smpKrwPerKwh > 0);

const noCarbonRecognition = dispatchScenario({ ...scenario, carbonRecognitionPct: 0 }, assumptions);
assert.ok(noCarbonRecognition.smpKrwPerKwh < result.smpKrwPerKwh);

const totalHourlyCoal = kpxData.annual2025.marginalPriceSetCountsByFuel.hourly.coal.reduce((a, b) => a + b, 0);
const totalHourlyLng = kpxData.annual2025.marginalPriceSetCountsByFuel.hourly.lng.reduce((a, b) => a + b, 0);
assert.equal(totalHourlyCoal, kpxData.annual2025.marginalPriceSetCountsByFuel.totals.coal);
assert.equal(totalHourlyLng, kpxData.annual2025.marginalPriceSetCountsByFuel.totals.lng);

const shares = observedMarginalFuelShare(kpxData.annual2025.marginalPriceSetCountsByFuel);
assert.ok(shares.lngPct > 80);
assert.ok(shares.coalPct > 15);

const capped = dispatchScenario({ ...scenario, coalCapPct: 55, fineDustSeason: true }, assumptions);
assert.ok((capped.generationByFuel.coal || 0) < (result.generationByFuel.coal || 0));

const monthly = simulateMonthlyScenario(kpxData.defaultMonthlyScenario, kpxData);
assert.equal(monthly.base.shortName, "Aug");
assert.ok(Math.abs(monthly.coalGwh - monthly.base.coal) < 1);
assert.ok(Math.abs(monthly.lngGwh - monthly.base.lng) < 1);
assert.ok(monthly.coalMt > 8);
assert.ok(monthly.breakEvenCoalUsdPerTonne > kpxData.defaultMonthlyScenario.coalUsdPerTonne);

const nuclearDown = simulateMonthlyScenario({
  ...kpxData.defaultMonthlyScenario,
  nuclearDeltaPct: -15
}, kpxData);
assert.ok(nuclearDown.coalGwh + nuclearDown.lngGwh > monthly.coalGwh + monthly.lngGwh);

const coalOutOfMerit = simulateMonthlyScenario({
  ...kpxData.defaultMonthlyScenario,
  coalUsdPerTonne: 170,
  lngUsdPerMmbtu: 7
}, kpxData);
assert.ok(coalOutOfMerit.lngGwh > monthly.lngGwh);
assert.ok(coalOutOfMerit.coalPriceHeadroomUsdPerTonne < 0);

const strip = simulateMonthlyStrip(kpxData.defaultMonthlyScenario, kpxData);
assert.equal(strip.results.length, kpxData.assumptions.monthly.procurementWindowMonths);
assert.ok(strip.coalMt > monthly.coalMt);

const monthlyCoalTotal = kpxData.monthly2025.tradingVolumeGwh.coal.reduce((total, value) => total + value, 0);
const monthlyLngTotal = kpxData.monthly2025.tradingVolumeGwh.lng.reduce((total, value) => total + value, 0);
assert.equal(monthlyCoalTotal, kpxData.annual2025.tradingVolumeGwh.coal);
assert.ok(Math.abs(monthlyLngTotal - kpxData.annual2025.tradingVolumeGwh.lng) <= 1);

console.log("model checks passed");
