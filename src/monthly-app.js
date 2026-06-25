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

const infoContent = {
  "coal-curve": {
    title: "How the Coal Burn Curve is Derived",
    body: `
      <p>The grey bar is the 2025 KPX monthly coal baseline. It comes directly from KPX electric energy trading volume by fuel type, not from a price model.</p>
      <ol>
        <li>Start with KPX monthly fuel generation: coal, LNG, nuclear, renewables, oil, pumped storage, other, and total traded energy.</li>
        <li>Apply the scenario shocks to total power demand, nuclear output, and renewable output.</li>
        <li>Calculate fossil residual demand: total demand minus nuclear, renewables, oil, pumped storage, and other generation.</li>
        <li>Limit coal by available coal capacity: registered coal MW times month hours times Coal Availability, with an optional Dec-Mar seasonal restriction derate.</li>
        <li>Keep a sticky coal floor: 2025 baseline coal generation times the Coal Floor percentage.</li>
        <li>Move only the switchable fossil band between coal and LNG when the fuel cost spread changes versus the default reference case.</li>
        <li>Convert coal GWh into Mt using the assumed coal heat rate and coal NAR.</li>
      </ol>
      <p>The brown bar is the scenario result. The right-hand delta is scenario coal burn minus the same month of the 2025 baseline.</p>
    `
  },
  "trader-read": {
    title: "How to Read the Trader Summary",
    body: `
      <p>This panel translates the model into trading units: coal GWh, implied Mt, cargo equivalents, 3-month strip demand, cap room, and switch movement.</p>
      <p>The signal is a screening label, not a forecast call. It compares scenario coal burn with the 2025 month and checks whether coal remains in merit versus LNG after fuel, VOM, FX, heat rate, and recognized carbon.</p>
    `
  },
  "fuel-economics": {
    title: "Fuel Switch Economics",
    body: `
      <p>Coal and LNG are compared on variable cost in KRW/kWh.</p>
      <pre>variable cost = fuel + VOM + recognized carbon</pre>
      <pre>fuel KRW/kWh = fuel price * FX * heat rate / 1000</pre>
      <p>Fuel cost spread is LNG variable cost minus coal variable cost. Positive spread means coal is cheaper than LNG. Coal headroom is the extra USD/t coal can rise before it reaches LNG parity under the selected assumptions.</p>
    `
  },
  "model-notes": {
    title: "Source and Assumption Notes",
    body: `
      <p>The monthly fuel baseline is KPX 2025 market-traded generation by fuel type. It is a power burn proxy, not customs import demand.</p>
      <p>Important assumptions include coal heat rate, LNG heat rate, coal NAR, carbon recognition, coal floor, switchable fossil band, and cargo size. These are model parameters, so use the controls to test sensitivity rather than treating one point estimate as fixed truth.</p>
    `
  },
  "coal-burn-kpi": {
    title: "Coal Burn KPI",
    body: `
      <p>Coal Burn is the selected month's modeled coal generation converted into implied physical coal consumption.</p>
      <pre>coal Mt = coal GWh * 1000 * coal heat rate / MMBtu per tonne / 1,000,000</pre>
      <p>The default heat rate is 9.15 MMBtu/MWh and the default coal quality is 5,500 kcal/kg NAR. Those assumptions control the conversion from power output to tonnes.</p>
    `
  },
  "cargo-kpi": {
    title: "Cargo Equivalent",
    body: `
      <p>Cargo equivalent turns implied coal tonnes into shipment scale.</p>
      <pre>cargoes = coal Mt * 1000 / cargo size kt</pre>
      <p>It is a scale indicator, not a tender forecast. Change Cargo Size if the relevant trade is a smaller handy cargo or a larger Panamax/Capesize parcel.</p>
    `
  },
  "strip-kpi": {
    title: "3-Month Strip",
    body: `
      <p>The strip is the selected month plus the next two months. For August, the strip is August/September/October.</p>
      <p>This is meant to approximate procurement pressure better than a one-month snapshot.</p>
    `
  },
  "headroom-kpi": {
    title: "Coal Headroom",
    body: `
      <p>Coal headroom is the difference between the modeled LNG-parity coal price and the selected coal price.</p>
      <p>Positive headroom means coal remains cheaper than LNG by that USD/t margin. Negative headroom means LNG is cheaper on variable cost before physical floors, caps, and policy constraints.</p>
    `
  },
  "fuel-spread-kpi": {
    title: "Fuel Cost Spread",
    body: `
      <p>Fuel cost spread is LNG variable cost minus coal variable cost, expressed in KRW/kWh.</p>
      <p>A positive number means coal is cheaper than LNG. A negative number means LNG is cheaper and the switchable coal band is at risk.</p>
    `
  },
  "demandDeltaPct": {
    title: "Power Demand vs 2025",
    body: "<p>Scales the selected month's KPX 2025 total traded energy. Higher demand increases fossil residual demand after nuclear, renewables, and fixed other generation.</p>"
  },
  "nuclearDeltaPct": {
    title: "Nuclear Output vs 2025",
    body: "<p>Scales the selected month's KPX 2025 nuclear generation. Lower nuclear output raises residual fossil demand, usually supporting coal and LNG burn.</p>"
  },
  "renewableDeltaPct": {
    title: "Renewables vs 2025",
    body: "<p>Scales the selected month's KPX 2025 renewable generation. Lower renewable output increases fossil residual demand; higher renewable output compresses fossil burn.</p>"
  },
  "coalAvailabilityPct": {
    title: "Coal Availability",
    body: "<p>Sets the modeled coal ceiling: KPX 2025 coal registered capacity times month hours times availability. This is a physical cap, independent of whether coal is cheap.</p>"
  },
  "coalMinRetentionPct": {
    title: "Coal Floor",
    body: "<p>Sets the sticky portion of baseline coal generation that is not easily displaced by LNG. It approximates minimum operation, commitments, maintenance patterns, and physical inflexibility.</p>"
  },
  "switchableFossilPct": {
    title: "Switchable Fossil Band",
    body: "<p>Defines how much of baseline coal plus LNG generation is exposed to economic switching. Only this contestable band moves when relative coal/LNG costs change.</p>"
  },
  "coalNarKcalPerKg": {
    title: "Coal NAR",
    body: "<p>Controls energy per tonne. Higher NAR means fewer tonnes are needed for the same coal GWh; lower NAR means more tonnes.</p>"
  },
  "carbonRecognitionPct": {
    title: "Carbon Recognition",
    body: "<p>Controls how much of the carbon price is reflected in modeled dispatch cost. Because coal has higher CO2 intensity than LNG, higher recognition usually reduces coal's cost advantage.</p>"
  },
  "cargoSizeKt": {
    title: "Cargo Size",
    body: "<p>Converts implied coal Mt into cargo count. The default is 150 kt, but the right setting depends on parcel size and vessel economics.</p>"
  },
  "seasonalRestrictionStress": {
    title: "Dec-Mar Seasonal Restriction Stress",
    body: "<p>When enabled, Dec-Mar coal maximum generation is derated to mimic seasonal fine-dust restriction risk. This caps coal upside even if coal is in merit.</p>"
  }
};

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

function infoButton(id, label) {
  return infoContent[id]
    ? `<button class="info-button mini" type="button" data-info="${id}" aria-label="${label}">i</button>`
    : "";
}

function mountControls() {
  $("#monthly-controls").innerHTML = controls.map((control) => `
    <label class="control-row" for="${control.id}">
      <span>${control.label} ${infoButton(control.id, `Explain ${control.label}`)}</span>
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
      <span>${toggle.label} ${infoButton(toggle.id, `Explain ${toggle.label}`)}</span>
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

function mountInfoModal() {
  const modal = $("#info-modal");
  const title = $("#info-title");
  const body = $("#info-body");

  document.addEventListener("click", (event) => {
    const infoTrigger = event.target.closest("[data-info]");
    if (infoTrigger) {
      event.preventDefault();
      event.stopPropagation();
      const content = infoContent[infoTrigger.dataset.info];
      if (!content) return;
      title.textContent = content.title;
      body.innerHTML = content.body;
      modal.hidden = false;
      modal.querySelector(".info-dialog-heading button").focus();
      return;
    }

    if (event.target.closest("[data-info-close]")) {
      modal.hidden = true;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") modal.hidden = true;
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
      sub: `${signed(result.deltaCoalMt, 2, " Mt")} vs 2025 ${result.base.shortName}`,
      info: "coal-burn-kpi"
    },
    {
      label: "Cargo Equiv.",
      value: `${formatOne.format(result.coalCargoes)} cargoes`,
      sub: `${signed(result.deltaCargoes, 1)} cargoes vs baseline`,
      info: "cargo-kpi"
    },
    {
      label: "3-Month Strip",
      value: `${formatTwo.format(strip.coalMt)} Mt`,
      sub: `${signed(strip.deltaCoalMt, 2, " Mt")} vs same 2025 months`,
      info: "strip-kpi"
    },
    {
      label: "Coal Headroom",
      value: `$${formatOne.format(result.coalPriceHeadroomUsdPerTonne)}/t`,
      sub: `Break-even coal $${formatOne.format(result.breakEvenCoalUsdPerTonne)}/t`,
      info: "headroom-kpi"
    },
    {
      label: "Fuel Cost Spread",
      value: `${signed(spread, 1)} KRW/kWh`,
      sub: spread >= 0 ? "Coal cheaper than LNG" : "LNG cheaper than coal",
      info: "fuel-spread-kpi"
    }
  ];

  $("#monthly-kpis").innerHTML = kpis.map((kpi) => `
    <article class="kpi">
      <span>${kpi.label} ${infoButton(kpi.info, `Explain ${kpi.label}`)}</span>
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
  const fineDustSource = kpxData.sources.find((source) => source.id === "mcee-fine-dust-seasonal");
  const etsSource = kpxData.sources.find((source) => source.id === "icap-kets");
  const sources = [monthlySource, carbonSource, opisSource, fineDustSource, etsSource].filter(Boolean);
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
mountInfoModal();
render();

window.__monthlyModel = {
  state,
  simulate: () => simulateMonthlyScenario(state, kpxData),
  formatMonthlyValue
};
