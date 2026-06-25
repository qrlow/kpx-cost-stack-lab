# Monthly Burn

Interactive monthly model for Korean thermal coal burn and coal-to-LNG switching under KPX's cost-based pool.

Reference documents:

- Korea Power Stack Primer: [`course/Korea_Power_Stack_Primer.docx`](course/Korea_Power_Stack_Primer.docx)
- Model Walkthrough: [`course/Model_Walkthrough.docx`](course/Model_Walkthrough.docx)

Model:

- Monthly Burn: [`index.html`](index.html)

The model is intentionally built around the Korean dispatch details that a simple coal-vs-JKM spread misses:

- KPX-recognized costs rather than pure spot fuel prices
- day-ahead demand and system constraints
- coal minimum-load and coal cap behavior
- nuclear availability as a major residual-load driver
- renewables reshaping the hourly net load
- observed KPX marginal price-setting evidence from 2025
- monthly fuel-burn seasonality and implied coal cargo pressure

## Data Used

Primary sources are embedded in `src/data.js`.

- KPX, 2025 Power Market Statistics, published 2026-03-31:
  - 2025 market-registered generation capacity by fuel
  - 2025 annual electric energy trading volume by fuel
  - 2025 monthly electric energy trading volume by fuel
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

Monthly Burn is built for a thermal coal trader rather than a power dispatcher.

It starts from actual 2025 KPX monthly traded generation by fuel, then shocks power demand, nuclear output, renewables, coal availability, seasonal coal restrictions, coal price, LNG price, FX, and carbon recognition. The outputs are:

- monthly coal burn in GWh and implied million tonnes
- cargo equivalents using a user-selected cargo size
- three-month strip coal demand versus the same 2025 months
- coal/LNG variable-cost spread
- break-even coal price versus LNG
- a signal label for tender support, soft demand, or LNG switch risk

This is still a teaching and screening model. It is not customs import data, inventory accounting, plant-level procurement, or a full KPX production-cost model.

## Run

```bash
npm test
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173
```
