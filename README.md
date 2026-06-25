# KPX Cost Stack Lab

An interactive model for Korean thermal coal-to-LNG switching under KPX's cost-based pool.

Course guide: [`course/KPX_Cost_Stack_Lab_Course.docx`](course/KPX_Cost_Stack_Lab_Course.docx)

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
- MOTIE, 11th Basic Plan for Long-term Electricity Supply and Demand:
  - Korea-specific average 2020-2022 emissions factors used in the app: coal `0.8384 tCO2e/MWh`; LNG `0.3800 tCO2e/MWh`
  - https://www.motir.go.kr/kor/article/ATCLc01b2801b/70083/view
- MarketWatch/Dow Jones OPIS, South Korea Approves Market Stability Reserve for K-ETS:
  - illustrative KAU25 default carbon price input of `KRW 16,700/tCO2e`
  - https://www.marketwatch.com/story/south-korea-approves-market-stability-reserve-for-k-ets-opis-31412180

## Model Shape

The app dispatches representative Korean generation blocks for one selected hour.

1. Build recognized variable costs from fuel prices, heat rates, variable O&M, and carbon cost.
2. Apply physical and policy constraints: coal minimum load, coal cap, nuclear availability, renewable profile, and reserve target.
3. Rank flexible blocks by recognized variable cost.
4. Dispatch until hourly load is met.
5. The final dispatched block is treated as the marginal plant and sets modeled SMP.
6. Run counterfactuals to separate price-driven switching from policy-driven switching.

This is a market-structure model, not a production unit-commitment engine. It is designed to show the mechanics and sensitivities behind Korea-specific switching.

The carbon-cost control is intentionally split into a carbon price and a carbon-recognition percentage. This avoids implying that every tonne of K-ETS cost is automatically reflected one-for-one in the KPX dispatch cost stack under all policy designs.

## Run

```bash
npm test
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173
```
