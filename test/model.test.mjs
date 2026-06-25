import assert from "node:assert/strict";
import { kpxData } from "../src/data.js";
import {
  coalUsdPerMmbtu,
  dispatchScenario,
  observedMarginalFuelShare,
  variableCostKrwPerKwh
} from "../src/model.js";

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

console.log("model checks passed");
