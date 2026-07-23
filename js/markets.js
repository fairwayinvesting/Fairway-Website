// ─────────────────────────────────────────────────────────────────────────────
// Fairway Investing — Market Data
// MONTHLY UPDATE GUIDE:
//   1. Open this file
//   2. Find the market(s) you want to update
//   3. Edit the values listed under "── Monthly update fields ──"
//   4. Save, commit, push to GitHub — all report pages update automatically
//
// Fields to update each month:
//   heroPrice, heroYield, heroVacancy, heroPopulation
//   houseMedian, unitMedian, houseRentRange, unitRentRange
//   houseYieldRange, unitYieldRange
//   vacancyRate, daysOnMarket, clearanceRate, propertiesListed
//   conditions (bar labels + pct values)
//   housePerf / unitPerf (annualised growth figures + bar widths)
//   population[], housePrice[], unitPrice[], yieldHouse[], yieldUnit[]
//   vacancy[], stockVals[]
//
// Source: HtAG Analytics (primary) — LGA and suburb level data via MCP
// Price/yield/DOM/rent/growth: HtAG Analytics
// Historical chart arrays (htMonths series): HtAG Analytics, 12-month rolling
// Population, demographics: ABS / HtAG
// Last updated: July 2026
// ─────────────────────────────────────────────────────────────────────────────

window.MARKETS = {

  // ── GEELONG ──────────────────────────────────────────────────────────────
  geelong: {
    // ── Monthly update fields ── Source: HtAG Analytics VIC215, period ending June 2026
    heroPrice: '~$925k', heroYield: '2.9–3.1%', heroPopulation: '270k', heroVacancy: '1.5%',
    houseMedian: 924894, unitMedian: 730851,
    houseRentRange: '$510–$535', unitRentRange: '$420–$445',
    houseYieldRange: '2.9–3.1%', unitYieldRange: '3.0–3.2%',
    vacancyRate: 1.5, daysOnMarket: 31, clearanceRate: 79, propertiesListed: 365,
    popTotal: 270000, popGrowth: 2.1, medianAge: 37, ownerOccupier: 62, employed: 63, unemployment: 4.1,
    conditions: {
      rentalDemand:  { label: 'Very High', pct: 88 },
      stockOnMarket: { label: 'Low',       pct: 22 },
      buyerComp:     { label: 'High',      pct: 76 },
      infraPipeline: { label: 'Very High', pct: 92 },
      popMomentum:   { label: 'Strong',    pct: 82 },
    },
    housePerf: { yr1:{val:9.8,bar:98}, yr3:{val:0.0,bar:0}, yr5:{val:4.1,bar:41}, yr10:{val:6.6,bar:66} },
    unitPerf:  { yr1:{val:3.2,bar:32}, yr3:{val:-1.8,bar:0}, yr5:{val:-1.2,bar:0}, yr10:{val:4.7,bar:47} },
    population:  [238000,244000,249000,254000,258000,261000,263000,266000,268000,270000],
    popYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    housePrice:  [490000,530000,560000,575000,590000,670000,720000,695000,680000,924894],
    unitPrice:   [320000,345000,360000,368000,380000,415000,450000,435000,425000,730851],
    priceYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    yieldHouse:  [4.8,4.7,4.5,4.3,4.1,3.8,3.9,4.1,4.2,2.9],
    yieldUnit:   [5.5,5.4,5.2,5.0,4.8,4.6,4.8,5.0,5.1,3.1],
    yieldYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    vacancy:     [2.1,1.9,1.6,1.8,1.2,0.7,0.8,0.9,0.8,1.5],
    vacYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    stockMonths: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    stockVals:   [1380,1320,1290,1260,1240,1220,1240,1270,1260,1250,1240,1240],
    htMonths:    ["Jul '25","Aug '25","Sep '25","Oct '25","Nov '25","Dec '25","Jan '26","Feb '26","Mar '26","Apr '26","May '26","Jun '26"],
    htHousePrice:[845722,849204,853492,859681,866688,872518,883720,893307,903020,914018,919455,924894],
    htUnitPrice: [708123,707857,709069,709277,708596,709427,712275,716288,721752,725617,728234,730851],
    htHouseRent: [504,506,508,509,511,513,515,517,519,520,521,522],
    htUnitRent:  [418,420,422,424,426,427,428,429,430,430,430,431],
  },

  // ── BACCHUS MARSH ─────────────────────────────────────────────────────────
  bacchus_marsh: {
    heroPrice: '~$630k', heroYield: '4.0–5.0%', heroPopulation: '42k', heroVacancy: '1.2%', // SQM Research May 2026
    houseMedian: 630000, unitMedian: 395000,  // CoreLogic via propertyvalue.com.au
    houseRentRange: '$475–$505', unitRentRange: '$355–$385',
    houseYieldRange: '3.9–4.2%', unitYieldRange: '4.6–5.1%',
    vacancyRate: 1.2, daysOnMarket: 51, clearanceRate: 65, propertiesListed: 210,
    popTotal: 42000, popGrowth: 3.2, medianAge: 35, ownerOccupier: 72, employed: 67, unemployment: 3.5,
    conditions: {
      rentalDemand:  { label: 'Very High', pct: 92 },
      stockOnMarket: { label: 'Very Low',  pct: 12 },
      buyerComp:     { label: 'High',      pct: 80 },
      infraPipeline: { label: 'Moderate',  pct: 50 },
      popMomentum:   { label: 'Very High', pct: 94 },
    },
    housePerf: { yr1:{val:3.4,bar:34}, yr3:{val:9.5,bar:95}, yr5:{val:10.8,bar:100}, yr10:{val:8.1,bar:81} },
    unitPerf:  { yr1:{val:3.0,bar:30}, yr3:{val:7.2,bar:72}, yr5:{val:8.0,bar:80},  yr10:{val:6.2,bar:62} },
    population:  [30000,31500,33000,34500,36000,37800,39000,40500,41500,42000],
    popYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    housePrice:  [370000,390000,410000,430000,480000,570000,610000,590000,575000,595000],
    unitPrice:   [255000,268000,280000,295000,325000,375000,400000,385000,370000,380000],
    priceYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    yieldHouse:  [5.8,5.7,5.5,5.2,4.9,4.5,4.7,4.9,5.0,5.0],
    yieldUnit:   [6.5,6.4,6.2,5.9,5.6,5.2,5.5,5.8,6.0,6.0],
    yieldYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    vacancy:     [1.8,1.5,1.2,1.0,0.7,0.4,0.5,0.5,0.5,0.5],
    vacYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    stockMonths: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    stockVals:   [265,248,232,218,210,205,212,225,218,210,205,210],
  },

  // ── BENDIGO ───────────────────────────────────────────────────────────────
  bendigo: {
    heroPrice: '~$643k', heroYield: '4.0–4.5%', heroPopulation: '120k', heroVacancy: '1.9%', // SQM Research May 2026
    houseMedian: 643000, unitMedian: 475000,  // house: CoreLogic; unit: PRD Research Q4 2025
    houseRentRange: '$485–$515', unitRentRange: '$370–$400',
    houseYieldRange: '3.9–4.2%', unitYieldRange: '4.0–4.5%',
    vacancyRate: 1.9, daysOnMarket: 84, clearanceRate: 62, propertiesListed: 680,
    popTotal: 120000, popGrowth: 1.8, medianAge: 38, ownerOccupier: 64, employed: 62, unemployment: 4.5,
    conditions: {
      rentalDemand:  { label: 'High',      pct: 78 },
      stockOnMarket: { label: 'Low',       pct: 25 },
      buyerComp:     { label: 'Moderate',  pct: 62 },
      infraPipeline: { label: 'High',      pct: 78 },
      popMomentum:   { label: 'Moderate',  pct: 65 },
    },
    housePerf: { yr1:{val:3.6,bar:36}, yr3:{val:8.5,bar:85}, yr5:{val:9.8,bar:98}, yr10:{val:7.2,bar:72} },
    unitPerf:  { yr1:{val:2.8,bar:28}, yr3:{val:6.8,bar:68}, yr5:{val:7.8,bar:78}, yr10:{val:5.5,bar:55} },
    population:  [101000,103500,106000,108000,110500,112000,114000,116500,118500,120000],
    popYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    housePrice:  [305000,325000,345000,360000,395000,460000,510000,490000,470000,485000],
    unitPrice:   [200000,212000,225000,235000,258000,290000,315000,302000,295000,302000],
    priceYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    yieldHouse:  [6.2,6.0,5.8,5.5,5.2,4.8,5.0,5.3,5.5,5.5],
    yieldUnit:   [7.0,6.8,6.6,6.3,6.0,5.6,5.9,6.2,6.5,6.5],
    yieldYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    vacancy:     [2.5,2.2,1.9,1.6,1.0,0.6,0.7,0.7,0.7,0.7],
    vacYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    stockMonths: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    stockVals:   [820,780,750,720,700,680,695,720,710,695,680,690],
  },

  // ── LARA ──────────────────────────────────────────────────────────────────
  lara: {
    heroPrice: '~$700k', heroYield: '4.3–5.0%', heroPopulation: '23k', heroVacancy: '1.8%', // SQM Research May 2026
    houseMedian: 700000, unitMedian: 450000,  // CoreLogic via propertyvalue.com.au
    houseRentRange: '$560–$590', unitRentRange: '$415–$445',
    houseYieldRange: '4.1–4.5%', unitYieldRange: '4.8–5.2%',
    vacancyRate: 1.8, daysOnMarket: 54, clearanceRate: 66, propertiesListed: 180,
    popTotal: 23000, popGrowth: 2.8, medianAge: 34, ownerOccupier: 74, employed: 66, unemployment: 3.6,
    conditions: {
      rentalDemand:  { label: 'Very High', pct: 90 },
      stockOnMarket: { label: 'Very Low',  pct: 15 },
      buyerComp:     { label: 'High',      pct: 82 },
      infraPipeline: { label: 'High',      pct: 75 },
      popMomentum:   { label: 'Very High', pct: 90 },
    },
    housePerf: { yr1:{val:4.5,bar:45}, yr3:{val:9.0,bar:90}, yr5:{val:10.2,bar:100}, yr10:{val:7.8,bar:78} },
    unitPerf:  { yr1:{val:3.0,bar:30}, yr3:{val:7.0,bar:70}, yr5:{val:7.8,bar:78},   yr10:{val:5.8,bar:58} },
    population:  [16500,17200,18000,18800,19800,20800,21500,22000,22600,23000],
    popYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    housePrice:  [420000,450000,475000,495000,530000,615000,670000,645000,620000,640000],
    unitPrice:   [280000,298000,315000,330000,355000,395000,420000,405000,390000,400000],
    priceYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    yieldHouse:  [5.4,5.2,5.0,4.8,4.5,4.2,4.4,4.6,4.8,4.8],
    yieldUnit:   [6.0,5.9,5.7,5.4,5.1,4.8,5.0,5.3,5.5,5.5],
    yieldYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    vacancy:     [1.9,1.6,1.3,1.1,0.8,0.5,0.6,0.6,0.6,0.6],
    vacYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    stockMonths: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    stockVals:   [220,205,192,180,175,170,178,188,182,176,172,178],
  },

  // ── DUBBO ─────────────────────────────────────────────────────────────────
  dubbo: {
    heroPrice: '~$646k', heroYield: '4.4–5.9%', heroPopulation: '49k', heroVacancy: '1.0%', // SQM Research May 2026
    houseMedian: 646000, unitMedian: 350000,  // house: CoreLogic; unit: derived from SPI search data
    houseRentRange: '$535–$565', unitRentRange: '$385–$415',
    houseYieldRange: '4.3–4.6%', unitYieldRange: '5.7–6.2%',
    vacancyRate: 1.0, daysOnMarket: 29, clearanceRate: 55, propertiesListed: 320,
    popTotal: 49000, popGrowth: 1.4, medianAge: 36, ownerOccupier: 63, employed: 60, unemployment: 5.0,
    conditions: {
      rentalDemand:  { label: 'High',     pct: 78 },
      stockOnMarket: { label: 'Low',      pct: 25 },
      buyerComp:     { label: 'Moderate', pct: 58 },
      infraPipeline: { label: 'Moderate', pct: 55 },
      popMomentum:   { label: 'Moderate', pct: 58 },
    },
    housePerf: { yr1:{val:11.4,bar:100}, yr3:{val:9.2,bar:92}, yr5:{val:10.5,bar:100}, yr10:{val:6.8,bar:68} },
    unitPerf:  { yr1:{val:3.8,bar:38}, yr3:{val:7.5,bar:75}, yr5:{val:8.2,bar:82},   yr10:{val:5.5,bar:55} },
    population:  [43000,43800,44500,45000,45800,46500,47200,47800,48500,49000],
    popYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    housePrice:  [285000,298000,312000,325000,360000,410000,455000,442000,430000,442000],
    unitPrice:   [185000,194000,204000,213000,235000,262000,282000,275000,270000,276000],
    priceYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    yieldHouse:  [7.0,6.8,6.6,6.4,6.0,5.6,5.8,6.0,6.2,6.2],
    yieldUnit:   [7.8,7.6,7.4,7.1,6.7,6.3,6.6,6.9,7.0,7.0],
    yieldYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    vacancy:     [2.2,2.0,1.8,1.5,1.0,0.6,0.7,0.6,0.6,0.6],
    vacYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    stockMonths: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    stockVals:   [380,362,348,332,320,310,322,338,330,318,310,318],
  },

  // ── TOWNSVILLE ────────────────────────────────────────────────────────────
  townsville: {
    heroPrice: '~$695k', heroYield: '4.0–5.4%', heroPopulation: '200k', heroVacancy: '0.6%', // SQM Research May 2026
    houseMedian: 695000, unitMedian: 395000,  // City of Townsville LGA; house: REIQ Dec 2025; unit: REIQ June 2025
    houseRentRange: '$540–$570', unitRentRange: '$380–$415',
    houseYieldRange: '4.0–4.3%', unitYieldRange: '5.0–5.4%',
    vacancyRate: 0.6, daysOnMarket: 18, clearanceRate: 52, propertiesListed: 1050,
    popTotal: 200000, popGrowth: 1.5, medianAge: 35, ownerOccupier: 60, employed: 61, unemployment: 5.2,
    conditions: {
      rentalDemand:  { label: 'High',      pct: 76 },
      stockOnMarket: { label: 'Moderate',  pct: 40 },
      buyerComp:     { label: 'Moderate',  pct: 58 },
      infraPipeline: { label: 'Very High', pct: 88 },
      popMomentum:   { label: 'Moderate',  pct: 62 },
    },
    housePerf: { yr1:{val:23.0,bar:100}, yr3:{val:12.2,bar:100}, yr5:{val:9.5,bar:95}, yr10:{val:5.2,bar:52} },
    unitPerf:  { yr1:{val:7.0,bar:70}, yr3:{val:10.5,bar:100}, yr5:{val:8.0,bar:80}, yr10:{val:4.2,bar:42} },
    population:  [178000,181000,184000,185000,187000,190000,193000,196000,198000,200000],
    popYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    housePrice:  [285000,288000,292000,298000,310000,360000,410000,435000,430000,445000],
    unitPrice:   [185000,186000,188000,192000,200000,238000,270000,285000,280000,290000],
    priceYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    yieldHouse:  [7.8,7.7,7.5,7.3,7.0,6.5,6.8,7.0,7.2,7.2],
    yieldUnit:   [8.5,8.4,8.2,8.0,7.7,7.2,7.5,7.8,8.0,8.0],
    yieldYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    vacancy:     [3.5,3.0,2.5,2.2,1.8,1.2,1.0,0.9,0.9,0.9],
    vacYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    stockMonths: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    stockVals:   [1280,1220,1180,1140,1100,1060,1080,1110,1090,1065,1050,1065],
  },

  // ── MACKAY ────────────────────────────────────────────────────────────────
  mackay: {
    heroPrice: '~$595k', heroYield: '5.3–6.5%', heroPopulation: '83k', heroVacancy: '1.2%', // SQM Research May 2026
    houseMedian: 595000, unitMedian: 400000,  // Mackay Regional LGA; house: Gardian/REA early 2026; unit: Gardian early 2026
    houseRentRange: '$600–$640', unitRentRange: '$465–$500',
    houseYieldRange: '5.3–5.6%', unitYieldRange: '6.0–6.5%',
    vacancyRate: 1.2, daysOnMarket: 32, clearanceRate: 48, propertiesListed: 520,
    popTotal: 83000, popGrowth: 1.0, medianAge: 34, ownerOccupier: 60, employed: 64, unemployment: 4.8,
    conditions: {
      rentalDemand:  { label: 'High',     pct: 74 },
      stockOnMarket: { label: 'Moderate', pct: 38 },
      buyerComp:     { label: 'Moderate', pct: 55 },
      infraPipeline: { label: 'High',     pct: 72 },
      popMomentum:   { label: 'Moderate', pct: 52 },
    },
    housePerf: { yr1:{val:15.1,bar:100}, yr3:{val:13.5,bar:100}, yr5:{val:8.8,bar:88}, yr10:{val:4.5,bar:45} },
    unitPerf:  { yr1:{val:8.0,bar:80}, yr3:{val:12.0,bar:100}, yr5:{val:7.5,bar:75}, yr10:{val:3.8,bar:38} },
    population:  [76000,77000,77800,78200,79000,80000,81000,82000,82800,83000],
    popYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    housePrice:  [272000,268000,265000,268000,278000,330000,390000,410000,400000,415000],
    unitPrice:   [170000,165000,163000,165000,172000,208000,240000,252000,245000,255000],
    priceYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    yieldHouse:  [8.2,8.0,7.8,7.6,7.4,7.0,7.2,7.4,7.5,7.5],
    yieldUnit:   [9.5,9.2,9.0,8.8,8.5,8.0,8.4,8.7,9.0,9.0],
    yieldYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    vacancy:     [4.5,3.8,3.2,2.8,2.2,1.5,1.2,1.0,1.0,1.0],
    vacYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    stockMonths: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    stockVals:   [640,610,585,562,542,522,538,558,545,528,518,528],
  },

  // ── ROCKHAMPTON ───────────────────────────────────────────────────────────
  rockhampton: {
    heroPrice: '~$399k', heroYield: '6.4–6.9%', heroPopulation: '82k', heroVacancy: '1.2%', // SQM Research May 2026
    houseMedian: 399000, unitMedian: 270000,  // CoreLogic via propertyvalue.com.au
    houseRentRange: '$475–$510', unitRentRange: '$345–$375',
    houseYieldRange: '6.2–6.7%', unitYieldRange: '6.6–7.2%',
    vacancyRate: 1.2, daysOnMarket: 25, clearanceRate: 44, propertiesListed: 480,
    popTotal: 82000, popGrowth: 0.9, medianAge: 35, ownerOccupier: 62, employed: 60, unemployment: 5.5,
    conditions: {
      rentalDemand:  { label: 'High',     pct: 72 },
      stockOnMarket: { label: 'Moderate', pct: 42 },
      buyerComp:     { label: 'Moderate', pct: 52 },
      infraPipeline: { label: 'Moderate', pct: 60 },
      popMomentum:   { label: 'Moderate', pct: 50 },
    },
    housePerf: { yr1:{val:9.9,bar:99}, yr3:{val:14.0,bar:100}, yr5:{val:9.0,bar:90}, yr10:{val:4.8,bar:48} },
    unitPerf:  { yr1:{val:9.0,bar:90},   yr3:{val:12.5,bar:100}, yr5:{val:8.0,bar:80}, yr10:{val:4.0,bar:40} },
    population:  [74000,75000,75800,76200,77000,78000,79000,80000,81000,82000],
    popYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    housePrice:  [245000,240000,238000,242000,255000,305000,365000,385000,370000,385000],
    unitPrice:   [150000,147000,145000,148000,156000,190000,222000,232000,220000,228000],
    priceYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    yieldHouse:  [9.0,8.8,8.6,8.4,8.0,7.5,7.8,8.0,8.2,8.2],
    yieldUnit:   [10.2,10.0,9.8,9.5,9.2,8.8,9.0,9.3,9.5,9.5],
    yieldYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    vacancy:     [5.0,4.2,3.5,3.0,2.5,1.8,1.4,1.2,1.1,1.1],
    vacYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    stockMonths: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    stockVals:   [590,562,540,518,500,482,496,515,502,488,478,488],
  },

  // ── NEWCASTLE ─────────────────────────────────────────────────────────────
  newcastle: {
    heroPrice: '~$963k', heroYield: '3.2–4.1%', heroPopulation: '340k', heroVacancy: '1.6%', // SQM Research May 2026
    houseMedian: 963000, unitMedian: 681000,  // Newcastle City Council LGA; house & unit: CoreLogic July 2025
    houseRentRange: '$595–$635', unitRentRange: '$500–$540',
    houseYieldRange: '3.2–3.4%', unitYieldRange: '3.8–4.1%',
    vacancyRate: 1.6, daysOnMarket: 25, clearanceRate: 62, propertiesListed: 1480,
    popTotal: 340000, popGrowth: 1.6, medianAge: 38, ownerOccupier: 61, employed: 63, unemployment: 4.2,
    conditions: {
      rentalDemand:  { label: 'High',      pct: 75 },
      stockOnMarket: { label: 'Moderate',  pct: 38 },
      buyerComp:     { label: 'High',      pct: 72 },
      infraPipeline: { label: 'Very High', pct: 88 },
      popMomentum:   { label: 'Strong',    pct: 70 },
    },
    housePerf: { yr1:{val:14.6,bar:100}, yr3:{val:6.8,bar:68}, yr5:{val:9.0,bar:90}, yr10:{val:8.5,bar:85} },
    unitPerf:  { yr1:{val:2.2,bar:22}, yr3:{val:5.5,bar:55}, yr5:{val:7.2,bar:72}, yr10:{val:6.8,bar:68} },
    population:  [300000,306000,312000,316000,320000,325000,330000,335000,338000,340000],
    popYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    housePrice:  [560000,600000,640000,680000,750000,850000,920000,880000,820000,848000],
    unitPrice:   [385000,412000,440000,468000,510000,580000,630000,605000,560000,578000],
    priceYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    yieldHouse:  [4.8,4.6,4.4,4.2,4.0,3.7,3.9,4.1,4.2,4.2],
    yieldUnit:   [5.5,5.3,5.1,4.9,4.6,4.3,4.5,4.7,4.9,4.9],
    yieldYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    vacancy:     [2.8,2.5,2.2,2.0,1.6,1.1,1.0,1.0,1.0,1.0],
    vacYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    stockMonths: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    stockVals:   [1820,1740,1680,1620,1560,1500,1530,1580,1560,1510,1480,1500],
  },

  // ── LAUNCESTON ────────────────────────────────────────────────────────────
  launceston: {
    heroPrice: '~$623k', heroYield: '4.0–4.4%', heroPopulation: '80k', heroVacancy: '0.6%', // SQM Research May 2026
    houseMedian: 623000, unitMedian: 490000,  // City of Launceston LGA; house: Picki 2026; unit: CoreLogic/YIP 2025
    houseRentRange: '$495–$525', unitRentRange: '$380–$415',
    houseYieldRange: '4.1–4.4%', unitYieldRange: '4.0–4.3%',
    vacancyRate: 0.6, daysOnMarket: 42, clearanceRate: 60, propertiesListed: 420,
    popTotal: 80000, popGrowth: 1.2, medianAge: 40, ownerOccupier: 62, employed: 60, unemployment: 5.0,
    conditions: {
      rentalDemand:  { label: 'Very High', pct: 85 },
      stockOnMarket: { label: 'Low',       pct: 22 },
      buyerComp:     { label: 'High',      pct: 72 },
      infraPipeline: { label: 'Moderate',  pct: 58 },
      popMomentum:   { label: 'Moderate',  pct: 55 },
    },
    housePerf: { yr1:{val:15.7,bar:100}, yr3:{val:7.8,bar:78}, yr5:{val:10.2,bar:100}, yr10:{val:8.8,bar:88} },
    unitPerf:  { yr1:{val:2.8,bar:28}, yr3:{val:6.5,bar:65}, yr5:{val:8.5,bar:85},   yr10:{val:7.2,bar:72} },
    population:  [70000,71000,72000,73000,74000,75500,76800,78000,79200,80000],
    popYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    housePrice:  [310000,335000,360000,380000,425000,490000,530000,515000,490000,505000],
    unitPrice:   [195000,210000,225000,240000,268000,308000,335000,325000,310000,320000],
    priceYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    yieldHouse:  [6.5,6.3,6.1,5.9,5.6,5.2,5.5,5.7,5.8,5.8],
    yieldUnit:   [7.2,7.0,6.8,6.6,6.3,5.9,6.2,6.5,6.7,6.7],
    yieldYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    vacancy:     [2.8,2.4,2.0,1.6,1.2,0.8,0.7,0.7,0.7,0.7],
    vacYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    stockMonths: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    stockVals:   [510,488,468,450,432,415,428,445,436,420,410,420],
  },

  // ── HOBART ────────────────────────────────────────────────────────────────
  hobart: {
    heroPrice: '~$720k', heroYield: '4.2–4.6%', heroPopulation: '243k', heroVacancy: '0.8%', // SQM Research May 2026
    houseMedian: 720000, unitMedian: 610000,  // Greater Hobart LGA; house: PRD/Mixproperty early 2026; unit: REIT Q4 2025
    houseRentRange: '$600–$640', unitRentRange: '$495–$535',
    houseYieldRange: '4.3–4.6%', unitYieldRange: '4.2–4.6%',
    vacancyRate: 0.8, daysOnMarket: 26, clearanceRate: 66, propertiesListed: 820,
    popTotal: 243000, popGrowth: 1.4, medianAge: 40, ownerOccupier: 60, employed: 62, unemployment: 4.0,
    conditions: {
      rentalDemand:  { label: 'Very High', pct: 90 },
      stockOnMarket: { label: 'Very Low',  pct: 14 },
      buyerComp:     { label: 'High',      pct: 78 },
      infraPipeline: { label: 'High',      pct: 76 },
      popMomentum:   { label: 'Moderate',  pct: 60 },
    },
    housePerf: { yr1:{val:9.3,bar:93}, yr3:{val:6.5,bar:65}, yr5:{val:8.8,bar:88}, yr10:{val:10.5,bar:100} },
    unitPerf:  { yr1:{val:2.5,bar:25}, yr3:{val:5.5,bar:55}, yr5:{val:7.2,bar:72}, yr10:{val:9.0,bar:90} },
    population:  [215000,220000,225000,228000,230000,234000,237000,240000,242000,243000],
    popYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    housePrice:  [450000,500000,560000,615000,670000,760000,820000,790000,760000,785000],
    unitPrice:   [305000,340000,380000,415000,450000,515000,560000,538000,510000,528000],
    priceYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    yieldHouse:  [5.5,5.2,4.9,4.6,4.4,4.1,4.2,4.4,4.5,4.5],
    yieldUnit:   [6.2,5.9,5.6,5.3,5.0,4.8,5.0,5.2,5.3,5.3],
    yieldYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    vacancy:     [1.8,1.4,1.0,0.8,0.6,0.4,0.5,0.5,0.5,0.5],
    vacYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    stockMonths: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    stockVals:   [1005,960,920,885,852,820,840,868,855,830,818,830],
  },

  // ── DEVONPORT ─────────────────────────────────────────────────────────────
  devonport: {
    heroPrice: '~$563k', heroYield: '4.5–5.1%', heroPopulation: '26k', heroVacancy: '0.8%', // SQM Research May 2026
    houseMedian: 563000, unitMedian: 370000,  // CoreLogic via propertyvalue.com.au
    houseRentRange: '$475–$505', unitRentRange: '$345–$375',
    houseYieldRange: '4.4–4.6%', unitYieldRange: '4.9–5.3%',
    vacancyRate: 0.8, daysOnMarket: 46, clearanceRate: 55, propertiesListed: 185,
    popTotal: 26000, popGrowth: 0.8, medianAge: 41, ownerOccupier: 61, employed: 58, unemployment: 5.5,
    conditions: {
      rentalDemand:  { label: 'High',     pct: 76 },
      stockOnMarket: { label: 'Low',      pct: 28 },
      buyerComp:     { label: 'Moderate', pct: 58 },
      infraPipeline: { label: 'Moderate', pct: 55 },
      popMomentum:   { label: 'Low',      pct: 38 },
    },
    housePerf: { yr1:{val:16.8,bar:100}, yr3:{val:8.0,bar:80}, yr5:{val:9.5,bar:95}, yr10:{val:7.5,bar:75} },
    unitPerf:  { yr1:{val:3.2,bar:32}, yr3:{val:6.5,bar:65}, yr5:{val:7.8,bar:78}, yr10:{val:6.0,bar:60} },
    population:  [23500,23800,24100,24300,24500,24800,25100,25400,25700,26000],
    popYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    housePrice:  [248000,265000,282000,298000,328000,375000,412000,405000,390000,402000],
    unitPrice:   [152000,162000,173000,184000,203000,232000,255000,250000,240000,248000],
    priceYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    yieldHouse:  [7.8,7.6,7.4,7.2,6.9,6.5,6.8,7.0,7.2,7.2],
    yieldUnit:   [8.8,8.6,8.4,8.1,7.8,7.5,7.8,8.0,8.2,8.2],
    yieldYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    vacancy:     [2.5,2.2,1.9,1.6,1.2,0.9,0.8,0.8,0.8,0.8],
    vacYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    stockMonths: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    stockVals:   [228,218,208,200,192,185,190,198,194,188,182,188],
  },

  // ── MELBOURNE ─────────────────────────────────────────────────────────────
  melbourne: {
    heroPrice: '~$940k', heroYield: '3.0–4.5%', heroPopulation: '5.2M', heroVacancy: '1.9%', // SQM Research May 2026
    houseMedian: 940000, unitMedian: 617000,  // Greater Melbourne metro; house & unit: CoreLogic June 2025
    houseRentRange: '$555–$585', unitRentRange: '$500–$540',
    houseYieldRange: '3.0–3.2%', unitYieldRange: '4.2–4.5%',
    vacancyRate: 1.9, daysOnMarket: 65, clearanceRate: 65, propertiesListed: 12500,
    popTotal: 5200000, popGrowth: 2.2, medianAge: 37, ownerOccupier: 56, employed: 65, unemployment: 4.0,
    conditions: {
      rentalDemand:  { label: 'High',      pct: 75 },
      stockOnMarket: { label: 'Moderate',  pct: 45 },
      buyerComp:     { label: 'High',      pct: 78 },
      infraPipeline: { label: 'Very High', pct: 98 },
      popMomentum:   { label: 'Very High', pct: 88 },
    },
    housePerf: { yr1:{val:4.4,bar:44}, yr3:{val:3.5,bar:35}, yr5:{val:6.2,bar:62}, yr10:{val:7.8,bar:78} },
    unitPerf:  { yr1:{val:3.5,bar:35}, yr3:{val:5.2,bar:52}, yr5:{val:5.8,bar:58}, yr10:{val:5.5,bar:55} },
    population:  [4650000,4750000,4850000,4880000,4920000,5000000,5080000,5140000,5180000,5200000],
    popYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    housePrice:  [820000,870000,900000,880000,920000,1050000,1100000,1020000,980000,1010000],
    unitPrice:   [540000,568000,588000,572000,598000,670000,710000,660000,620000,640000],
    priceYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    yieldHouse:  [3.5,3.4,3.3,3.3,3.2,3.0,3.1,3.2,3.3,3.3],
    yieldUnit:   [4.2,4.1,4.0,4.0,3.9,3.7,3.8,4.0,4.2,4.2],
    yieldYears:  [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    vacancy:     [2.0,2.0,2.2,3.8,4.5,2.8,2.2,2.0,1.8,1.8],
    vacYears:    [2017,2018,2019,2020,2021,2022,2023,2024,2025,2026],
    stockMonths: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    stockVals:   [15200,14500,13900,13400,12900,12400,12700,13100,12900,12500,12200,12400],
  },

};
