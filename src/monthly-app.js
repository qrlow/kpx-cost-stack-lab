import { kpxData } from "./data.js?v=5";
import {
  formatMonthlyValue,
  simulateMonthlyCurve,
  simulateMonthlyScenario,
  simulateMonthlyStrip
} from "./monthly-model.js?v=5";

const state = { ...kpxData.defaultMonthlyScenario };

const formatWhole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const formatOne = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const formatTwo = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

const controls = [
  { id: "month", label: "Delivery Month", min: 1, max: 12, step: 1, value: monthLabel },
  { id: "demandDeltaPct", label: "Power Demand vs 2025", min: -10, max: 12, step: 0.5, suffix: "%" },
  { id: "nuclearDeltaPct", label: "Nuclear Output vs 2025", min: -25, max: 15, step: 0.5, suffix: "%" },
  { id: "renewableDeltaPct", label: "Renewables vs 2025", min: -30, max: 60, step: 1, suffix: "%" },
  { id: "coalAvailabilityPct", label: "Coal Availability", min: 50, max: 110, step: 1, suffix: "%" },
  { id: "coalMinRetentionPct", label: "Coal Floor", min: 30, max: 95, step: 1, suffix: "%" },
  { id: "switchableFossilPct", label: "Switchable Fossil Band", min: 0, max: 35, step: 1, suffix: "%" },
  { id: "coalUsdPerTonne", label: "Coal Price", min: 55, max: 180, step: 1, prefix: "$", suffix: "/t" },
  { id: "coalNarKcalPerKg", label: "Coal NAR", min: 4600, max: 6200, step: 50, suffix: "kcal/kg" },
  { id: "lngUsdPerMmbtu", label: "LNG Price", min: 5, max: 30, step: 0.1, prefix: "$", suffix: "/mmBtu" },
  { id: "fxKrwPerUsd", label: "USD/KRW", min: 1100, max: 1600, step: 5 },
  { id: "carbonKrwPerTonne", label: "Carbon Cost", min: 0, max: 45000, step: 500, suffix: "KRW/t" },
  { id: "carbonRecognitionPct", label: "Carbon Recognition", min: 0, max: 100, step: 5, suffix: "%" },
  { id: "cargoSizeKt", label: "Cargo Size", min: 70, max: 180, step: 5, suffix: "kt" }
];

const toggles = [
  { id: "seasonalRestrictionStress", label: "Stress Dec-Mar coal restrictions" }
];

function $(selector) {
  return document.querySelector(selector);
}

function monthLabel(value = state.month) {
  return kpxData.monthly2025.monthShort[value - 1];
}

function signed(value, digits = 1, suffix = "") {
  const abs = digits === 0 ? formatWhole.format(Math.abs(value)) : formatOne.format(Math.abs(value));
  if (Math.abs(value) < 0.0001) return `0${suffix}`;
  return `${value > 0 ? "+" : "-"}${abs}${suffix}`;
}

function controlValue(control) {
  if (control.value) return control.value(state[control.id]);
  const value = state[control.id];
  const numeric = control.step < 1 ? formatOne.format(value) : formatWhole.format(value);
  return `${control.prefix || ""}${numeric}${control.suffix ? ` ${control.suffix}` : ""}`;
}

function mountControls() {
  $("#monthly-controls").innerHTML = controls.map((control) => `
    <label class="control-row" for="${control.id}">
      <span>${control.label}</span>
      <output id="${control.id}-value"></output>
      <input
        id="${control.id}"
        type="range"
        min="${control.min}"
        max="${control.max}"
        step="${control.step}"
        value="${state[control.id]}"
      />
    </label>
  `).join("");

  for (const control of controls) {
    const input = document.getElementById(control.id);
    input.addEventListener("input", () => {
      state[control.id] = Number(input.value);
      render();
    });
  }

  $("#monthly-toggles").innerHTML = toggles.map((toggle) => `
    <label class="toggle-row" for="${toggle.id}">
      <input id="${toggle.id}" type="checkbox" ${state[toggle.id] ? "checked" : ""} />
      <span>${toggle.label}</span>
    </label>
  `).join("");

  for (const toggle of toggles) {
    const input = document.getElementById(toggle.id);
    input.addEventListener("change", () => {
      state[toggle.id] = input.checked;
      render();
    });
  }

  $("#reset-button").addEventListener("click", () => {
    Object.assign(state, kpxData.defaultMonthlyScenario);
    for (const control of controls) document.getElementById(control.id).value = state[control.id];
    for (const toggle of toggles) document.getElementById(toggle.id).checked = state[toggle.id];
    render();
  });
}

function renderControlValues() {
  for (const control of controls) {
    document.getElementById(`${control.id}-value`).textContent = controlValue(control);
  }
}

function renderKpis(result, strip) {
  const spread = result.lngCostKrwPerKwh - result.coalCostKrwPerKwh;
  const kpis = [
    {
      label: "Trader Signal",
      value: result.signal.label,
      sub: result.signal.detail
    },
    {
      label: "Coal Burn",
      value: `${formatTwo.format(result.coalMt)} Mt`,
      sub: `${signed(result.deltaCoalMt, 2, " Mt")} vs 2025 ${result.base.shortName}`
    },
    {
      label: "Cargo Equiv.",
      value: `${formatOne.format(result.coalCargoes)} cargoes`,
      sub: `${signed(result.deltaCargoes, 1)} cargoes vs baseline`
    },
    {
      label: "3-Month Strip",
      value: `${formatTwo.format(strip.coalMt)} Mt`,
      sub: `${signed(strip.deltaCoalMt, 2, " Mt")} vs same 2025 months`
    },
    {
      label: "Coal Headroom",
      value: `$${formatOne.format(result.coalPriceHeadroomUsdPerTonne)}/t`,
      sub: `Break-even coal $${formatOne.format(result.breakEvenCoalUsdPerTonne)}/t`
    },
    {
      label: "Fuel Cost Spread",
      value: `${signed(spread, 1)} KRW/kWh`,
      sub: spread >= 0 ? "Coal cheaper than LNG" : "LNG cheaper than coal"
    }
  ];

  $("#monthly-kpis").innerHTML = kpis.map((kpi) => `
    <article class="kpi">
      <span>${kpi.label}</span>
      <strong>${kpi.value}</strong>
      <small>${kpi.sub}</small>
    </article>
  `).join("");
}

function renderCurve(curve) {
  const maxMt = Math.max(...curve.flatMap((result) => [result.coalMt, result.baselineCoalMt]), 1);
  $("#monthly-curve").innerHTML = curve.map((result) => {
    const baselinePct = result.baselineCoalMt / maxMt * 100;
    const scenarioPct = result.coalMt / maxMt * 100;
    const active = result.scenario.month === state.month;
    return `
      <div class="month-row ${active ? "active" : ""}">
        <span>${result.base.shortName}</span>
        <div class="month-bars">
          <i class="baseline" style="width:${baselinePct}%"></i>
          <i class="scenario" style="width:${scenarioPct}%"></i>
        </div>
        <strong>${formatTwo.format(result.coalMt)} Mt</strong>
        <em>${signed(result.deltaCoalMt, 2, " Mt")}</em>
      </div>
    `;
  }).join("");
}

function renderTraderRead(result, strip) {
  const capRoom = Math.max(0, result.coalMaxGwh - result.coalGwh);
  const stripMonths = strip.results.map((item) => item.base.shortName).join("/");
  $("#trader-read").innerHTML = `
    <article class="signal-card ${result.signal.tone}">
      <span>${result.base.name}</span>
      <strong>${result.signal.label}</strong>
      <small>${result.signal.detail}</small>
    </article>
    <div class="read-grid">
      <div>
        <span>Coal generation</span>
        <strong>${formatWhole.format(result.coalGwh)} GWh</strong>
        <small>${formatOne.format(result.coalSharePct)}% of modeled monthly power</small>
      </div>
      <div>
        <span>LNG generation</span>
        <strong>${formatWhole.format(result.lngGwh)} GWh</strong>
        <small>${formatOne.format(result.lngSharePct)}% of modeled monthly power</small>
      </div>
      <div>
        <span>Coal cap room</span>
        <strong>${formatWhole.format(capRoom)} GWh</strong>
        <small>${formatOne.format(result.coalCapacityFactorPct)}% of modeled available coal energy used</small>
      </div>
      <div>
        <span>Switch movement</span>
        <strong>${formatWhole.format(result.economicSwitchGwh)} GWh</strong>
        <small>${result.relativeCoalAdvantageShiftKrwPerKwh >= 0 ? "LNG displaced by coal" : "Coal displaced by LNG"}</small>
      </div>
      <div>
        <span>3-month strip</span>
        <strong>${stripMonths}</strong>
        <small>${formatOne.format(strip.cargoes)} scenario cargoes vs ${formatOne.format(strip.baselineCargoes)} baseline</small>
      </div>
      <div>
        <span>Fine-dust flag</span>
        <strong>${result.isFineDustSeason ? "Seasonal month" : "Non-seasonal"}</strong>
        <small>${state.seasonalRestrictionStress ? "Stress cap applied in Dec-Mar" : "No extra seasonal stress"}</small>
      </div>
    </div>
  `;
}

function renderFuelEconomics(result) {
  const rows = [
    ["Coal variable cost", `${formatOne.format(result.coalCostKrwPerKwh)} KRW/kWh`, "Fuel + VOM + recognized carbon"],
    ["LNG variable cost", `${formatOne.format(result.lngCostKrwPerKwh)} KRW/kWh`, "Fuel + VOM + recognized carbon"],
    ["Coal advantage shift", `${signed(result.relativeCoalAdvantageShiftKrwPerKwh, 1)} KRW/kWh`, "Positive means coal improved versus default monthly reference"],
    ["Coal break-even", `$${formatOne.format(result.breakEvenCoalUsdPerTonne)}/t`, "Coal price where modeled coal equals LNG cost"],
    ["Coal price headroom", `$${formatOne.format(result.coalPriceHeadroomUsdPerTonne)}/t`, "Positive means coal is still in merit versus LNG"],
    ["Baseline SMP", `${formatOne.format(result.base.smpKrwPerKwh)} KRW/kWh`, "KPX 2025 mainland monthly weighted average"]
  ];

  $("#fuel-economics").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
          <th>Use</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${row[0]}</td>
            <td>${row[1]}</td>
            <td>${row[2]}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderSources() {
  const monthlySource = kpxData.sources.find((source) => source.id === "kpx-2025-market-statistics");
  const carbonSource = kpxData.sources.find((source) => source.id === "motie-11th-basic-plan");
  const opisSource = kpxData.sources.find((source) => source.id === "marketwatch-opis-kau25");
  const sources = [monthlySource, carbonSource, opisSource].filter(Boolean);
  $("#monthly-sources").innerHTML = `
    ${kpxData.monthly2025.notes.map((note) => `
      <div class="source-note">${note}</div>
    `).join("")}
    ${sources.map((source) => `
      <a href="${source.url}" target="_blank" rel="noreferrer">
        <strong>${source.label}</strong>
        <span>${source.usedFor.join("; ")}</span>
      </a>
    `).join("")}
  `;
}

function render() {
  const result = simulateMonthlyScenario(state, kpxData);
  const strip = simulateMonthlyStrip(state, kpxData);
  const curve = simulateMonthlyCurve(state, kpxData);
  $("#monthly-note").textContent = "Monthly trader model: coal burn, cargo equivalents, and LNG switch risk from KPX 2025 fuel baselines.";
  renderControlValues();
  renderKpis(result, strip);
  renderCurve(curve);
  renderTraderRead(result, strip);
  renderFuelEconomics(result);
  renderSources();
}

mountControls();
render();

window.__monthlyModel = {
  state,
  simulate: () => simulateMonthlyScenario(state, kpxData),
  formatMonthlyValue
};
