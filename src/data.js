export const kpxData = {
  meta: {
    title: "KPX Cost Stack Lab",
    asOf: "2026-06-25",
    timezone: "Asia/Singapore",
    notes: [
      "KPX 2025 Power Market Statistics values marked provisional in the source are stored without the source's p suffix.",
      "Market-registered capacity excludes resources outside the KPX market boundary where KPX notes that PPA and other items may not be included.",
      "The cost stack uses representative blocks calibrated to observed KPX capacity, energy, SMP, and marginal fuel counts. It is not a confidential unit-level KPX stack."
    ]
  },
  sources: [
    {
      id: "kpx-2025-market-statistics",
      label: "KPX 2025 Power Market Statistics",
      url: "https://www.kpx.or.kr/boardDownload.es?bid=0045&list_no=77084&seq=4",
      usedFor: [
        "annual market-registered capacity by fuel",
        "annual trading volume by fuel",
        "hourly and monthly SMP",
        "system marginal price setting counts by fuel"
      ]
    },
    {
      id: "kpx-smp-live",
      label: "KPX mainland SMP live table",
      url: "https://www.kpx.or.kr/smpInland.es?mid=a10404080100&device=pc",
      usedFor: ["latest hourly mainland SMP snapshot"]
    },
    {
      id: "kpx-demand-live",
      label: "KPX daily power supply-demand performance",
      url: "https://www.kpx.or.kr/powerDemandPerform.es?mid=a10404060000",
      usedFor: ["latest daily peak load, minimum load, reserve margin, and system capacity snapshot"]
    },
    {
      id: "kpx-market-process",
      label: "KPX electricity market trading process",
      url: "https://www.kpx.or.kr/menu.es?mid=a20201000000",
      usedFor: ["cost-based pool and monthly Generation Cost Assessment Committee context"]
    },
    {
      id: "kpx-price-determination",
      label: "KPX market price determination",
      url: "https://www.kpx.or.kr/menu.es?mid=a20203000000",
      usedFor: ["day-ahead price setting schedule, system constraints, and marginal plant logic"]
    },
    {
      id: "kpx-trading-system",
      label: "KPX electricity market trading system",
      url: "https://www.kpx.or.kr/menu.es?mid=a20202000000",
      usedFor: ["scheduler, SMP/BLMP, and fuel/transmission constraint context"]
    },
    {
      id: "motie-11th-basic-plan",
      label: "MOTIE 11th Basic Plan for Long-term Electricity Supply and Demand",
      url: "https://www.motir.go.kr/kor/article/ATCLc01b2801b/70083/view",
      usedFor: [
        "2030 coal/LNG/nuclear/renewables generation outlook",
        "Korea power-sector average CO2e factors for coal and LNG"
      ]
    },
    {
      id: "marketwatch-opis-kau25",
      label: "MarketWatch/Dow Jones OPIS KAU25 assessment",
      url: "https://www.marketwatch.com/story/south-korea-approves-market-stability-reserve-for-k-ets-opis-31412180",
      usedFor: ["illustrative default KAU25 carbon price input of KRW 16,700/tCO2e"]
    }
  ],
  annual2025: {
    marketRegisteredCapacityMw: {
      nuclear: 26050,
      coal: 41739,
      lng: 48388,
      oil: 531,
      pumpedStorage: 4700,
      renewable: 19457,
      other: 5293,
      total: 146157
    },
    tradingVolumeGwh: {
      nuclear: 175549,
      coal: 164790,
      lng: 159227,
      oil: 160,
      pumpedStorage: 4414,
      renewable: 39697,
      other: 3325,
      total: 547163
    },
    scheduledEnergyGwh: {
      nuclear: 175988,
      coal: 195795,
      lng: 117140,
      oil: 166,
      pumpedStorage: 0,
      renewable: 4088,
      other: 1172,
      total: 494350
    },
    mainlandSmpWeightedAverageKrwPerKwh: 112.73,
    mainlandSmpByHourKrwPerKwh: [
      105.14, 93.42, 89.88, 87.26, 88.31, 92.66, 99.59, 109.62,
      117.8, 124.21, 126.12, 122.57, 115.5, 119.73, 121.28, 123.65,
      121.56, 121.71, 122.99, 122.93, 119.49, 115.1, 113.43, 110.06
    ],
    mainlandSmpMonthlyWeightedAverageKrwPerKwh: [
      117.11, 116.39, 113.12, 124.63, 125.5, 118.02,
      120.39, 117.39, 112.9, 101.53, 94.8, 90.43
    ],
    marginalPriceSetCountsByFuel: {
      monthly: {
        nuclear: [2, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1],
        coal: [123, 70, 112, 33, 45, 33, 29, 74, 216, 214, 182, 282],
        lng: [611, 595, 614, 684, 698, 686, 715, 670, 502, 525, 533, 459],
        oil: [0, 0, 0, 0, 1, 1, 0, 0, 2, 2, 0, 0],
        other: [5, 5, 12, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        total: [741, 671, 739, 718, 744, 720, 744, 744, 720, 742, 715, 743]
      },
      hourly: {
        coal: [
          62, 139, 178, 203, 189, 150, 94, 45, 34, 31, 24, 28,
          24, 28, 29, 26, 21, 10, 8, 5, 11, 21, 21, 32
        ],
        lng: [
          303, 224, 184, 159, 173, 214, 271, 320, 331, 333, 337, 334,
          322, 329, 332, 335, 344, 355, 357, 360, 354, 344, 344, 333
        ],
        nuclear: [
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          4, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        ],
        oil: [
          0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0,
          0, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0
        ],
        other: [
          0, 2, 3, 3, 3, 1, 0, 0, 0, 0, 1, 2,
          3, 1, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0
        ]
      },
      totals: {
        nuclear: 7,
        coal: 1413,
        lng: 7292,
        oil: 6,
        pumpedStorage: 0,
        renewable: 0,
        other: 23,
        all: 8741
      }
    }
  },
  latestKpxSnapshot: {
    smpDate: "2026-06-25",
    mainlandHourlySmpKrwPerKwh: [
      92.93, 89.14, 89.14, 89.14, 89.14, 89.14, 89.14, 89.14,
      99.76, 100.15, 100.11, 100.11, 99.44, 99.75, 99.94, 136.69,
      113.66, 114.72, 115.51, 117.1, 117.1, 136.7, 102.31, 98.23
    ],
    demandDate: "2026-06-24",
    systemCapacityMw: 159396,
    supplyCapabilityMw: 94894,
    peakLoadMw: 72974,
    peakHour: 19,
    minimumLoadMw: 55475,
    minimumHour: 5,
    operatingReserveMw: 21920,
    reserveMarginPct: 30
  },
  defaultScenario: {
    hour: 19,
    loadMw: 72974,
    reserveTargetPct: 12,
    fxKrwPerUsd: 1380,
    recognizedCoalUsdPerTonne: 98,
    spotCoalUsdPerTonne: 105,
    recognizedLngUsdPerMmbtu: 10.8,
    spotLngUsdPerMmbtu: 11.9,
    carbonKrwPerTonne: 16700,
    carbonRecognitionPct: 100,
    recognizedFuelMode: true,
    coalCapPct: 78,
    nuclearAvailablePct: 86,
    renewableOutputPct: 17,
    fineDustSeason: false,
    transmissionTight: false,
    reserveScarcityPremium: true
  },
  assumptions: {
    coalNarKcalPerKg: 5500,
    emissionsTonnePerMwh: {
      coal: 0.8384,
      lng: 0.38,
      oil: 0.74,
      other: 0.55
    },
    renewableHourlyCapacityFactor: [
      0.02, 0.02, 0.02, 0.02, 0.03, 0.05, 0.12, 0.24,
      0.41, 0.55, 0.66, 0.7, 0.68, 0.61, 0.48, 0.32,
      0.18, 0.08, 0.03, 0.02, 0.02, 0.02, 0.02, 0.02
    ],
    representativeBlocks: [
      {
        id: "nuclear",
        label: "Nuclear fleet",
        fuel: "nuclear",
        capacityMw: 26050,
        heatRateMmbtuPerMwh: 0,
        variableOmKrwPerKwh: 8,
        minimumStablePct: 86,
        priority: "must-run",
        color: "#4f6bed"
      },
      {
        id: "renewable",
        label: "Renewables and hydro profile",
        fuel: "renewable",
        capacityMw: 19457,
        heatRateMmbtuPerMwh: 0,
        variableOmKrwPerKwh: 0,
        minimumStablePct: 100,
        priority: "must-take",
        color: "#1f9d72"
      },
      {
        id: "coal-min",
        label: "Coal minimum stable block",
        fuel: "coal",
        capacityMw: 15000,
        heatRateMmbtuPerMwh: 9.15,
        variableOmKrwPerKwh: 5.5,
        minimumStablePct: 100,
        priority: "must-run-thermal",
        color: "#8a5a44"
      },
      {
        id: "coal-efficient",
        label: "Efficient coal merit block",
        fuel: "coal",
        capacityMw: 14500,
        heatRateMmbtuPerMwh: 8.75,
        variableOmKrwPerKwh: 5.8,
        minimumStablePct: 0,
        priority: "economic",
        color: "#9f6b4e"
      },
      {
        id: "coal-older",
        label: "Older coal / constrained block",
        fuel: "coal",
        capacityMw: 12239,
        heatRateMmbtuPerMwh: 9.55,
        variableOmKrwPerKwh: 7.4,
        minimumStablePct: 0,
        priority: "economic",
        color: "#b27a57"
      },
      {
        id: "lng-ccgt-best",
        label: "High-efficiency LNG CCGT",
        fuel: "lng",
        capacityMw: 15000,
        heatRateMmbtuPerMwh: 6.55,
        variableOmKrwPerKwh: 3.8,
        minimumStablePct: 0,
        priority: "economic",
        color: "#3c8dbc"
      },
      {
        id: "lng-ccgt-mid",
        label: "Mid-merit LNG CCGT",
        fuel: "lng",
        capacityMw: 20000,
        heatRateMmbtuPerMwh: 7.1,
        variableOmKrwPerKwh: 4.4,
        minimumStablePct: 0,
        priority: "economic",
        color: "#2f76a3"
      },
      {
        id: "lng-chp-peak",
        label: "LNG CHP / peaking block",
        fuel: "lng",
        capacityMw: 13388,
        heatRateMmbtuPerMwh: 7.75,
        variableOmKrwPerKwh: 5.8,
        minimumStablePct: 0,
        priority: "economic",
        color: "#245f86"
      },
      {
        id: "pumped-storage",
        label: "Pumped storage peak support",
        fuel: "pumpedStorage",
        capacityMw: 4700,
        heatRateMmbtuPerMwh: 0,
        variableOmKrwPerKwh: 118,
        minimumStablePct: 0,
        priority: "economic",
        color: "#7c5cc4"
      },
      {
        id: "oil-emergency",
        label: "Oil and emergency thermal",
        fuel: "oil",
        capacityMw: 531,
        heatRateMmbtuPerMwh: 10.3,
        variableOmKrwPerKwh: 185,
        minimumStablePct: 0,
        priority: "economic",
        color: "#b3535b"
      },
      {
        id: "other-thermal",
        label: "Other thermal and industrial gas",
        fuel: "other",
        capacityMw: 5293,
        heatRateMmbtuPerMwh: 8.25,
        variableOmKrwPerKwh: 85,
        minimumStablePct: 12,
        priority: "system",
        color: "#6d7780"
      }
    ]
  }
};
