import { kpxData } from "./data.js?v=3";
import {
  coalUsdPerMmbtu,
  dispatchScenario,
  explainSwitching,
  observedMarginalFuelShare,
  round,
  sum
} from "./model.js?v=3";

const state = { ...kpxData.defaultScenario };

const formatMw = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const formatOne = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const formatTwo = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

const controls = [
  { id: "hour", label: "Hour", min: 1, max: 24, step: 1, suffix: "h" },
  { id: "loadMw", label: "Load", min: 52000, max: 95000, step: 250, suffix: "MW" },
  { id: "recognizedCoalUsdPerTonne", label: "Recognized Coal", min: 60, max: 170, step: 1, prefix: "$", suffix: "/t" },
  { id: "recognizedLngUsdPerMmbtu", label: "Recognized LNG", min: 5, max: 24, step: 0.1, prefix: "$", suffix: "/mmBtu" },
  { id: "spotCoalUsdPerTonne", label: "Spot Coal", min: 60, max: 190, step: 1, prefix: "$", suffix: "/t" },
  { id: "spotLngUsdPerMmbtu", label: "Spot LNG", min: 5, max: 30, step: 0.1, prefix: "$", suffix: "/mmBtu" },
  { id: "fxKrwPerUsd", label: "USD/KRW", min: 1100, max: 1600, step: 5, suffix: "" },
  { id: "carbonKrwPerTonne", label: "Carbon Cost", min: 0, max: 45000, step: 500, suffix: "KRW/t" },
  { id: "coalCapPct", label: "Coal Availability Cap", min: 45, max: 100, step: 1, suffix: "%" },
  { id: "nuclearAvailablePct", label: "Nuclear Availability", min: 55, max: 100, step: 1, suffix: "%" },
  { id: "renewableOutputPct", label: "Renewable Weather", min: 0, max: 100, step: 1, suffix: "%" }
];

const toggles = [
  { id: "recognizedFuelMode", label: "Use KPX-style recognized fuel costs" },
  { id: "fineDustSeason", label: "Fine-dust / coal restriction season" },
  { id: "transmissionTight", label: "Transmission constraint stress" },
  { id: "reserveScarcityPremium", label: "Apply reserve scarcity premium" }
];

function $(selector) {
  return document.querySelector(selector);
}

function mountControls() {
  const container = $("#controls");
  container.innerHTML = controls.map((control) => `
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

  const toggleContainer = $("#toggles");
  toggleContainer.innerHTML = toggles.map((toggle) => `
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
    Object.assign(state, kpxData.defaultScenario);
    for (const control of controls) document.getElementById(control.id).value = state[control.id];
    for (const toggle of toggles) document.getElementById(toggle.id).checked = state[toggle.id];
    render();
  });
}

function valueLabel(control) {
  const value = state[control.id];
  const numeric = control.step < 1 ? formatOne.format(value) : formatMw.format(value);
  return `${control.prefix || ""}${numeric}${control.suffix ? ` ${control.suffix}` : ""}`;
}

function renderControlValues() {
  for (const control of controls) {
    document.getElementById(`${control.id}-value`).textContent = valueLabel(control);
  }
}

function renderKpis(result) {
  const marginal = result.marginal;
  const observedHourSmp = kpxData.annual2025.mainlandSmpByHourKrwPerKwh[state.hour - 1];
  const latestHourSmp = kpxData.latestKpxSnapshot.mainlandHourlySmpKrwPerKwh[state.hour - 1];
  const kpis = [
    {
      label: "Modeled SMP",
      value: `${formatOne.format(result.smpKrwPerKwh)} KRW/kWh`,
      sub: `${marginal ? marginal.label : "No marginal unit"}`
    },
    {
      label: "Marginal Fuel",
      value: marginal ? fuelLabel(marginal.fuel) : "Shortage",
      sub: `2025 same-hour avg: ${formatOne.format(observedHourSmp)} KRW/kWh`
    },
    {
      label: "Coal Dispatch",
      value: `${formatMw.format(result.generationByFuel.coal || 0)} MW`,
      sub: `${formatOne.format(result.coalSharePct)}% of dispatched supply`
    },
    {
      label: "LNG Dispatch",
      value: `${formatMw.format(result.generationByFuel.lng || 0)} MW`,
      sub: `${formatOne.format(result.lngSharePct)}% of dispatched supply`
    },
    {
      label: "Reserve Margin",
      value: `${formatOne.format(result.reserveMarginPct)}%`,
      sub: `Target ${state.reserveTargetPct}% | latest KPX ${kpxData.latestKpxSnapshot.reserveMarginPct}%`
    },
    {
      label: "Latest KPX SMP",
      value: `${formatOne.format(latestHourSmp)} KRW/kWh`,
      sub: `${kpxData.latestKpxSnapshot.smpDate}, hour ${state.hour}`
    }
  ];

  $("#kpis").innerHTML = kpis.map((kpi) => `
    <article class="kpi">
      <span>${kpi.label}</span>
      <strong>${kpi.value}</strong>
      <small>${kpi.sub}</small>
    </article>
  `).join("");
}

function renderStack(result) {
  const sorted = [...result.stack].sort((a, b) => {
    if (a.dispatchMw > 0 && b.dispatchMw === 0) return -1;
    if (a.dispatchMw === 0 && b.dispatchMw > 0) return 1;
    return a.variableCostKrwPerKwh - b.variableCostKrwPerKwh;
  });
  const maxMw = Math.max(...sorted.map((block) => block.availableMw), 1);
  const maxCost = Math.max(...sorted.map((block) => block.variableCostKrwPerKwh), 1);

  $("#stack").innerHTML = sorted.map((block) => {
    const dispatchedPct = block.availableMw > 0 ? block.dispatchMw / maxMw * 100 : 0;
    const availablePct = block.availableMw / maxMw * 100;
    const costPct = block.variableCostKrwPerKwh / maxCost * 100;
    const isMarginal = result.marginal && block.id === result.marginal.id;
    return `
      <div class="stack-row ${isMarginal ? "is-marginal" : ""}">
        <div class="stack-meta">
          <strong>${block.label}</strong>
          <span>${fuelLabel(block.fuel)} | ${formatOne.format(block.variableCostKrwPerKwh)} KRW/kWh</span>
        </div>
        <div class="bar-wrap" aria-label="${block.label} dispatch bar">
          <div class="bar-available" style="width:${availablePct}%"></div>
          <div class="bar-dispatch" style="width:${dispatchedPct}%; background:${block.color}"></div>
        </div>
        <div class="stack-numbers">
          <span>${formatMw.format(block.dispatchMw)} / ${formatMw.format(block.availableMw)} MW</span>
          <meter min="0" max="100" value="${costPct}"></meter>
        </div>
      </div>
    `;
  }).join("");
}

function renderFuelBars(result) {
  const fuels = [
    ["nuclear", "Nuclear"],
    ["renewable", "Renewable"],
    ["coal", "Coal"],
    ["lng", "LNG"],
    ["pumpedStorage", "PSH"],
    ["oil", "Oil"],
    ["other", "Other"]
  ];
  const total = Math.max(result.dispatchedMw, 1);
  $("#fuel-bars").innerHTML = fuels.map(([fuel, label]) => {
    const mw = result.generationByFuel[fuel] || 0;
    const pct = mw / total * 100;
    return `
      <div class="fuel-row">
        <span>${label}</span>
        <div class="mini-bar"><i style="width:${pct}%; background:${fuelColor(fuel)}"></i></div>
        <strong>${formatMw.format(mw)} MW</strong>
      </div>
    `;
  }).join("");
}

function renderSwitching(explanation) {
  $("#switching").innerHTML = explanation.effects.map((effect) => {
    const coalDirection = effect.coalDeltaMw >= 0 ? "more coal" : "less coal";
    const lngDirection = effect.lngDeltaMw >= 0 ? "more LNG" : "less LNG";
    return `
      <article class="effect">
        <span>${effect.label}</span>
        <strong>${formatMw.format(Math.abs(effect.coalDeltaMw))} MW ${coalDirection}</strong>
        <small>${formatMw.format(Math.abs(effect.lngDeltaMw))} MW ${lngDirection}. ${effect.detail}</small>
      </article>
    `;
  }).join("");
}

function renderObserved() {
  const shares = observedMarginalFuelShare(kpxData.annual2025.marginalPriceSetCountsByFuel);
  const coalMmbtu = coalUsdPerMmbtu(state.recognizedCoalUsdPerTonne, kpxData.assumptions.coalNarKcalPerKg);
  $("#observed").innerHTML = `
    <div class="observed-grid">
      <article>
        <span>2025 SMP Set By LNG</span>
        <strong>${formatOne.format(shares.lngPct)}%</strong>
        <small>${formatMw.format(kpxData.annual2025.marginalPriceSetCountsByFuel.totals.lng)} of ${formatMw.format(kpxData.annual2025.marginalPriceSetCountsByFuel.totals.all)} intervals</small>
      </article>
      <article>
        <span>2025 SMP Set By Coal</span>
        <strong>${formatOne.format(shares.coalPct)}%</strong>
        <small>${formatMw.format(kpxData.annual2025.marginalPriceSetCountsByFuel.totals.coal)} intervals, concentrated overnight and in Q4</small>
      </article>
      <article>
        <span>Recognized Coal Energy</span>
        <strong>$${formatTwo.format(coalMmbtu)}/mmBtu</strong>
        <small>${formatMw.format(kpxData.assumptions.coalNarKcalPerKg)} kcal/kg NAR basis</small>
      </article>
    </div>
    <div class="hour-counts">${renderHourCounts()}</div>
  `;
}

function renderHourCounts() {
  const counts = kpxData.annual2025.marginalPriceSetCountsByFuel.hourly;
  const max = Math.max(...counts.lng, ...counts.coal, 1);
  return Array.from({ length: 24 }, (_, index) => {
    const coal = counts.coal[index];
    const lng = counts.lng[index];
    return `
      <div class="hour-count ${index + 1 === state.hour ? "active" : ""}">
        <span>${index + 1}</span>
        <i class="coal" style="height:${coal / max * 100}%"></i>
        <i class="lng" style="height:${lng / max * 100}%"></i>
      </div>
    `;
  }).join("");
}

function renderSources() {
  const sourceHtml = kpxData.sources.map((source) => `
    <a href="${source.url}" target="_blank" rel="noreferrer">
      <strong>${source.label}</strong>
      <span>${source.usedFor.join(", ")}</span>
    </a>
  `).join("");

  $("#sources").innerHTML = sourceHtml;
  $("#snapshot").innerHTML = `
    <div><span>Latest demand date</span><strong>${kpxData.latestKpxSnapshot.demandDate}</strong></div>
    <div><span>System capacity</span><strong>${formatMw.format(kpxData.latestKpxSnapshot.systemCapacityMw)} MW</strong></div>
    <div><span>Peak load</span><strong>${formatMw.format(kpxData.latestKpxSnapshot.peakLoadMw)} MW at ${kpxData.latestKpxSnapshot.peakHour}h</strong></div>
    <div><span>Reserve</span><strong>${formatMw.format(kpxData.latestKpxSnapshot.operatingReserveMw)} MW</strong></div>
  `;
}

function renderAnnualData() {
  const capacity = kpxData.annual2025.marketRegisteredCapacityMw;
  const volume = kpxData.annual2025.tradingVolumeGwh;
  const totalCap = capacity.total;
  const totalVolume = volume.total;
  const fuels = ["nuclear", "coal", "lng", "renewable", "pumpedStorage", "oil", "other"];
  $("#annual-data").innerHTML = fuels.map((fuel) => `
    <tr>
      <th>${fuelLabel(fuel)}</th>
      <td>${formatMw.format(capacity[fuel])}</td>
      <td>${formatOne.format(capacity[fuel] / totalCap * 100)}%</td>
      <td>${formatMw.format(volume[fuel])}</td>
      <td>${formatOne.format(volume[fuel] / totalVolume * 100)}%</td>
    </tr>
  `).join("");
}

function render() {
  renderControlValues();
  const result = dispatchScenario(state, kpxData.assumptions);
  const explanation = explainSwitching(state, kpxData.assumptions);
  renderKpis(result);
  renderStack(result);
  renderFuelBars(result);
  renderSwitching(explanation);
  renderObserved();
  renderSources();
  renderAnnualData();

  const selectedMode = state.recognizedFuelMode ? "recognized KPX-style costs" : "spot fuel prices";
  $("#model-note").textContent = `Hour ${state.hour} dispatch at ${formatMw.format(state.loadMw)} MW using ${selectedMode}. Modeled SMP is ${formatOne.format(result.smpKrwPerKwh)} KRW/kWh.`;
}

function fuelLabel(fuel) {
  const labels = {
    nuclear: "Nuclear",
    coal: "Coal",
    lng: "LNG",
    oil: "Oil",
    pumpedStorage: "Pumped storage",
    renewable: "Renewable",
    other: "Other"
  };
  return labels[fuel] || fuel;
}

function fuelColor(fuel) {
  const colors = {
    nuclear: "#4f6bed",
    coal: "#9f6b4e",
    lng: "#2f76a3",
    oil: "#b3535b",
    pumpedStorage: "#7c5cc4",
    renewable: "#1f9d72",
    other: "#6d7780"
  };
  return colors[fuel] || "#5b7f56";
}

mountControls();
render();
