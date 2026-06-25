# KPX Cost Stack Lab

An interactive model for Korean thermal coal-to-LNG switching under KPX's cost-based pool.

The model is intentionally built around the Korean dispatch details that a simple coal-vs-JKM spread misses:

- KPX-recognized costs rather than pure spot fuel prices
- day-ahead demand and system constraints
- coal minimum-load and coal cap behavior
- nuclear availability as a major residual-load driver
- renewables reshaping the hourly net load
- observed KPX marginal price-setting evidence from 2025

## Data Used

Primary sources are embedded in `src/data.js`.

- KPX, 2025 Power Market Statistics, published 2026-03-31:
  - 2025 market-registered generation capacity by fuel
  - 2025 annual electric energy trading volume by fuel
  - 2025 mainland SMP by hour and month
  - 2025 system marginal price setting counts by fuel
  - PDF: https://www.kpx.or.kr/boardDownload.es?bid=0045&list_no=77084&seq=4
- KPX mainland SMP page, live table for 2026-06-25:
  - https://www.kpx.or.kr/smpInland.es?mid=a10404080100&device=pc
- KPX daily power supply-demand performance page, live table for 2026-06-24:
  - https://www.kpx.or.kr/powerDemandPerform.es?mid=a10404060000
- KPX market explanation pages:
  - Trading process: https://www.kpx.or.kr/menu.es?mid=a20201000000
  - Price determination: https://www.kpx.or.kr/menu.es?mid=a20203000000
  - Trading system: https://www.kpx.or.kr/menu.es?mid=a20202000000

## Model Shape

The app dispatches representative Korean generation blocks for one selected hour.

1. Build recognized variable costs from fuel prices, heat rates, variable O&M, and carbon cost.
2. Apply physical and policy constraints: coal minimum load, coal cap, nuclear availability, renewable profile, and reserve target.
3. Rank flexible blocks by recognized variable cost.
4. Dispatch until hourly load is met.
5. The final dispatched block is treated as the marginal plant and sets modeled SMP.
6. Run counterfactuals to separate price-driven switching from policy-driven switching.

This is a market-structure model, not a production unit-commitment engine. It is designed to show the mechanics and sensitivities behind Korea-specific switching.

## Run

```bash
npm test
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173
```
