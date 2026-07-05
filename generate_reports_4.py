#!/usr/bin/env python3
"""Generate area report HTML files — Batch 4: Hobart, Devonport, Melbourne"""

import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from generate_reports_1 import (
    CSS, JS_CHARTS_AND_MAP,
    infra_status_class, pop_counter_attrs, map_pts_js, map_line_js,
    build_loc_stat_panels, build_amenity_card, build_infra_cards,
    build_conditions, build_perf_rows, build_tags, build_risks,
    generate_html, OUT_DIR,
)

MARKETS = [

  # ── 10. HOBART ──────────────────────────────────────────────────────────────
  dict(
    filename='hobart.html',
    key='hobart',
    city='Hobart',
    state_badge='Tasmania',
    subtitle="Australia's second-oldest city · Capital of Tasmania · Southern lifestyle destination",
    loc_stats=[
      ('1,160km',    'Melbourne'),
      ('1hr 20min',  'By air to Melbourne'),
      ('200km',      'Launceston'),
      ('Capital City','of Tasmania'),
    ],
    loc_copy=(
      'Hobart is Australia\'s second-oldest capital city, sitting at the foot of '
      'kunanyi/Mount Wellington on the Derwent River estuary. Tasmania\'s capital has '
      'undergone a remarkable transformation since the early 2010s, driven by the MONA effect, '
      'sustained lifestyle migration from mainland Australia and a growing reputation as a food, '
      'wine and outdoor recreation destination. Greater Hobart\'s property market has been one '
      'of Australia\'s strongest performers over the past decade — driven by genuine structural '
      'undersupply in a market with permanently constrained land.'
    ),
    education=[
      'University of Tasmania (Hobart main campus)',
      'TAFE Tasmania',
      'Hutchins School',
      "St Michael's Collegiate",
    ],
    healthcare=[
      'Royal Hobart Hospital (600+ beds, recently expanded)',
      "St Vincent's Private Hospital",
      'New Hobart Private Hospital',
      'Southern Tasmania health network',
    ],
    retail=[
      'Myer Centre Hobart',
      'Cat and Fiddle Arcade',
      'Salamanca Market (weekend)',
      'Battery Point &amp; Salamanca Place dining',
    ],
    transport=[
      'Hobart Airport (Melbourne/Sydney/Brisbane direct)',
      'Southern Outlet / Brooker Highway',
      'Metro Tasmania local network',
      'Bruny Island ferry connections',
    ],
    infra_total='$2.8B+',
    infra_cards=[
      dict(
        value='$700M+',
        title='Royal Hobart Hospital Stage 2',
        desc='Completion of the major redevelopment of Tasmania\'s principal hospital, significantly expanding specialist services and cementing Hobart as the state\'s medical centre. A permanent, government-funded employment anchor for the city.',
        status='Active',
      ),
      dict(
        value='$577M',
        title='Bridgewater Bridge Replacement',
        desc='Replacement of the aging Bridgewater Bridge across the Derwent River — a critical link between Hobart and the northern corridor. Improves connectivity and supports urban growth in the Derwent Valley.',
        status='Under construction',
      ),
      dict(
        value='$1.5B+',
        title='Macquarie Point Development',
        desc='Major transformation of the Macquarie Point precinct adjacent to the CBD into a world-class innovation, arts and residential hub, including the proposed AFL stadium site and associated commercial and residential development.',
        status='Planning approved',
      ),
    ],
    macro_copy=(
      'Greater Hobart has consistently recorded Australia\'s lowest rental vacancy rates, '
      'driven by a combination of constrained land supply (hills, water and heritage listings '
      'limit development), strong lifestyle migration and an undersupplied rental stock. '
      'The University of Tasmania and Royal Hobart Hospital are the city\'s two largest '
      'employers, providing a structural employment base alongside the growing tourism and '
      'hospitality sector.'
    ),
    macro_copy_p2=(
      'ABS projections indicate Greater Hobart\'s population will continue growing steadily '
      'despite the physical constraints on housing supply — creating a persistent structural '
      'imbalance between dwelling demand and the capacity to build new stock. This supply '
      'dynamic is the key driver of both yield and long-term capital growth.'
    ),
    comparable_text=(
      "Hobart's decade of performance — driven by structural undersupply, lifestyle migration "
      'and constrained land — has few true comparables in Australia. The closest international '
      'analogues are supply-constrained island or heritage cities where development is '
      'permanently limited by geography and planning. The structural conditions that drove '
      'past performance remain largely intact. Past performance is not a guide to future performance.'
    ),
    affordability_text=(
      'At ~$720k median, Hobart is no longer the affordable Tasmanian market it was in 2013. '
      'However, relative to mainland capitals with comparable liveability credentials — '
      'Melbourne, Brisbane — it remains meaningfully discounted, particularly given the '
      'physical supply constraints that are permanent rather than cyclical.'
    ),
    investment_intro=(
      'Hobart is not a market you buy for the highest yield — you buy for the combination of '
      'structural rental undersupply, one of Australia\'s most permanently constrained land '
      'supplies, and a lifestyle appeal that continues to attract mainland migrants at a '
      'rate that housing supply cannot match.'
    ),
    tags=[
      "Australia's lowest sustained vacancy rates",
      'Structurally constrained land supply',
      'Lifestyle appeal driving sustained migration',
      'Hospital and university structural rental demand',
      'Major CBD precinct urban renewal underway',
      'Long-term capital growth in a supply-constrained market',
    ],
    entry_house='$680k–$950k+',
    entry_unit='$530k–$720k+',
    risks=[
      (
        'Higher entry, lower yield',
        "Hobart's success has repriced it. Yields are lower than Queensland or regional NSW "
        'markets. The investment case here is capital growth and structural scarcity, not income '
        'maximisation — investors focused primarily on yield should consider Launceston or '
        'Devonport for Tasmanian exposure.',
      ),
      (
        'Lifestyle migration moderation',
        'A portion of the past decade\'s growth was driven by mainland lifestyle migration '
        'accelerated by remote work adoption. If this trend normalises, demand from this cohort '
        'may moderate — though structural undersupply and the student/healthcare population '
        'provide a demand floor.',
      ),
      (
        'Infrastructure delivery risk',
        'Several of Hobart\'s major projects — Macquarie Point, proposed stadium — have '
        'significant political and funding dependencies. Timeline slippage is a risk, though '
        'the Bridgewater Bridge and Royal Hobart Hospital are firmly committed and underway.',
      ),
    ],
    lukes_p1=(
      'Hobart is one of the few markets in Australia where the structural supply constraint is '
      'physical and permanent — hills, water, heritage overlays and a topography that genuinely '
      'limits where you can build. That means the supply-demand dynamic that has driven a '
      'decade of exceptional performance isn\'t going to resolve itself through a development '
      'pipeline the way it does on the mainland.'
    ),
    lukes_p2=(
      'The case here is long-term. Investors who held Hobart property through the 2013–2016 '
      'flat period and into the 2017–2022 boom were extraordinarily well rewarded. The market '
      'is now more fairly priced, but the structural scarcity and lifestyle appeal that drove '
      'that performance remain intact. This is a market for patient, conviction-driven investors.'
    ),
    map_center=[-42.880, 147.330],
    map_zoom=12,
    map_pts=[
      dict(latlng=[-42.880, 147.330], label='Hobart CBD',           color='#bd7a70', perm=True),
      dict(latlng=[-42.875, 147.335], label='Royal Hobart Hospital', color='#cf9b92', perm=False),
      dict(latlng=[-42.904, 147.328], label='UTAS Hobart',           color='#cf9b92', perm=False),
      dict(latlng=[-42.876, 147.332], label='Macquarie Point',       color='#cf9b92', perm=False),
      dict(latlng=[-42.836, 147.503], label='Hobart Airport',        color='#cf9b92', perm=False),
    ],
    map_line=None,
    lga_name='Greater Hobart',
    heroPrice='~$720k', heroYield='4.2–4.6%', heroPopulation='243k', heroVacancy='0.8%',
    houseMedian=720000, unitMedian=610000,
    houseRentRange='$600–$640', unitRentRange='$495–$535',
    houseYieldRange='4.3–4.6%', unitYieldRange='4.2–4.6%',
    vacancyRate=0.8, daysOnMarket=26, clearanceRate=66, propertiesListed=820,
    popTotal=243000, popGrowth=1.4, medianAge=40, ownerOccupier=60, employed=62, unemployment=4.0,
    conditions=[
      ('Rental demand',              'Very High', 90),
      ('Stock on market',            'Very Low',  14),
      ('Buyer competition',          'High',      78),
      ('Infrastructure pipeline',    'High',      76),
      ('Population growth momentum', 'Moderate',  60),
    ],
    housePerf=[('1 year', 9.3, 93), ('3 years', 6.5, 65), ('5 years', 8.8, 88), ('10 years', 10.5, 100)],
    unitPerf= [('1 year', 2.5, 25), ('3 years', 5.5, 55), ('5 years', 7.2, 72), ('10 years',  9.0, 90)],
    data_sources=(
      'ABS Regional Population &amp; Census &nbsp;&middot;&nbsp; Infrastructure Australia Pipeline '
      '&nbsp;&middot;&nbsp; Tasmanian Government Major Projects Register &nbsp;&middot;&nbsp; '
      'SQM Research &nbsp;&middot;&nbsp; CoreLogic / Suburbtrends &nbsp;&middot;&nbsp; '
      'City of Hobart &nbsp;&middot;&nbsp; Map data &copy; OpenStreetMap contributors'
    ),
  ),

  # ── 11. DEVONPORT ───────────────────────────────────────────────────────────
  dict(
    filename='devonport.html',
    key='devonport',
    city='Devonport',
    state_badge='Tasmania',
    subtitle="Tasmania's gateway city · 100km west of Launceston · Bass Strait ferry terminal",
    loc_stats=[
      ('100km',     'Launceston'),
      ('1hr 20min', 'By air to Melbourne'),
      ('287km',     'Hobart'),
      ('Gateway',   'Spirit of Tasmania'),
    ],
    loc_copy=(
      'Devonport is positioned on Tasmania\'s north coast at the mouth of the Mersey River, '
      '100km west of Launceston and 287km north of Hobart. As the home port of the Spirit of '
      'Tasmania ferries, Devonport serves as the island\'s primary gateway for vehicle and '
      'passenger transport from Victoria. The city is the commercial centre for the '
      'Devonport-Latrobe corridor and serves a significant agricultural and manufacturing '
      'hinterland. North West Regional Hospital is the city\'s largest employer and an anchor '
      'of the local health economy.'
    ),
    education=[
      'TasTAFE Devonport',
      'Devonport High School',
      "St Joseph's Catholic College",
      'Reece High School',
    ],
    healthcare=[
      'North West Regional Hospital (240+ beds)',
      'North West Private Hospital',
      'Mersey Community Hospital (Latrobe)',
      'North-west Tasmanian health network',
    ],
    retail=[
      'Devonport Shopping Centre',
      'Rooke Street Mall',
      'Best Street precinct',
      'Bluff retail area',
    ],
    transport=[
      'Devonport Airport (Melbourne direct)',
      'Spirit of Tasmania ferry terminal',
      'Bass Highway (east/west)',
      'Tas Link regional bus network',
    ],
    infra_total='$1.1B+',
    infra_cards=[
      dict(
        value='$250M+',
        title='North West Regional Hospital Expansion',
        desc='Significant expansion of Devonport\'s principal hospital, expanding emergency, surgical and specialist services for the broader north-west Tasmanian population — a committed, government-funded employment anchor.',
        status='Committed',
      ),
      dict(
        value='$700M+',
        title='Spirit of Tasmania New Vessels',
        desc='Acquisition of two new, larger Spirit of Tasmania vessels with expanded vehicle and passenger capacity, fundamentally improving Tasmania\'s freight and visitor connectivity and supporting regional economic growth across the north-west coast.',
        status='Active',
      ),
      dict(
        value='$200M+',
        title='Devonport Living City Project',
        desc='Major urban renewal of Devonport\'s waterfront and city centre, including new library, civic space, hotel and mixed-use development, positioning the city as a destination beyond its gateway function.',
        status='Substantially complete',
      ),
    ],
    macro_copy=(
      "Devonport's economy is anchored by healthcare, the Spirit of Tasmania operations and "
      'surrounding agriculture and food manufacturing — a stable, non-cyclical base that '
      'supports consistent rental demand. As Tasmania\'s affordability advantage over mainland '
      'markets has grown, Devonport has attracted lifestyle migrants seeking the Tasmanian '
      'quality of life at the state\'s most affordable entry price point.'
    ),
    macro_copy_p2=(
      'The north-west coast\'s food and agricultural economy — cheese, salmon, berries, '
      'vegetables — provides a diversified economic base that is less dependent on government '
      'funding than many comparable regional markets. This agricultural resilience, combined '
      'with the healthcare anchor, creates a relatively stable employment foundation.'
    ),
    comparable_text=(
      'Devonport\'s position — Tasmania\'s most affordable market with direct Melbourne flights '
      'and ferry access — shares some characteristics with Burnie, but with materially stronger '
      'infrastructure investment and a clearer economic anchor in the Spirit of Tasmania '
      'operations. The structural Tasmanian supply dynamics that have driven Hobart and '
      'Launceston performance apply equally here. Past performance is not a guide to future performance.'
    ),
    affordability_text=(
      'At ~$390k median, Devonport is the lowest entry point for Tasmanian exposure in this '
      'report. The gross yield profile at this price level is strong, and the structural '
      'Tasmanian supply dynamics that have driven performance in Hobart and Launceston '
      'apply equally in Devonport — with potentially more room to run from a lower base.'
    ),
    investment_intro=(
      "Devonport is Tasmania's most affordable entry point — offering the state's lifestyle "
      'appeal and structural rental dynamics at a price point that maximises yield and '
      'lowers the barrier to entry. The Spirit of Tasmania investment and Living City urban '
      'renewal have materially changed the city\'s identity and liveability offer.'
    ),
    tags=[
      "Tasmania's most affordable entry point",
      'High gross yield relative to entry price',
      'Spirit of Tasmania — economic and tourism anchor',
      'Hospital and healthcare employment stability',
      'Lifestyle migration to an affordable TAS market',
      'Long-term hold with Tasmanian structural dynamics',
    ],
    entry_house='$300k–$470k+',
    entry_unit='$200k–$310k+',
    risks=[
      (
        'Smaller market liquidity',
        "Devonport is Tasmania's third city by population. Lower transaction volumes mean "
        'properties can take longer to sell and price movements can be more volatile in both '
        'directions. A long-term hold mindset is essential, with realistic exit planning '
        'from the outset.',
      ),
      (
        'Limited employment diversification',
        'Outside healthcare and the Spirit of Tasmania operations, Devonport\'s local '
        'employment base is relatively narrow. Major employer disruption could have an outsized '
        'impact on the local rental market — though both are government-backed and long-term.',
      ),
      (
        'Lifestyle migration sustainability',
        'Like all Tasmanian markets, a portion of recent demand has been driven by mainland '
        'lifestyle migration. Devonport is more exposed to a slowdown in this trend than Hobart '
        'or Launceston given its smaller local employment base, though the North West hospital '
        'expansion will add a significant new professional renter cohort.',
      ),
    ],
    lukes_p1=(
      'Devonport is the market I\'d point to for investors who want to access the Tasmanian '
      'structural story at the most affordable price point. The yield at entry is strong, the '
      'healthcare employment base is stable and government-backed, and the city has meaningfully '
      'invested in its own urban renewal over the past decade — changing the narrative from '
      'transit stop to destination.'
    ),
    lukes_p2=(
      'The Spirit of Tasmania investment and the Living City project have materially changed '
      'Devonport\'s identity. That narrative shift, combined with the structural Tasmanian '
      'supply constraints, creates a patient investor\'s opportunity. This is a market where '
      'you\'re buying the yield today and holding for the story to play out over time.'
    ),
    map_center=[-41.180, 146.350],
    map_zoom=12,
    map_pts=[
      dict(latlng=[-41.178, 146.352], label='Devonport CBD',           color='#bd7a70', perm=True),
      dict(latlng=[-41.183, 146.336], label='NW Regional Hospital',    color='#cf9b92', perm=False),
      dict(latlng=[-41.178, 146.359], label='Spirit of Tasmania',      color='#cf9b92', perm=False),
      dict(latlng=[-41.167, 146.430], label='Devonport Airport',       color='#cf9b92', perm=False),
      dict(latlng=[-41.440, 147.140], label='Launceston',              color='#cf9b92', perm=False),
    ],
    map_line=None,
    lga_name='Devonport City',
    heroPrice='~$563k', heroYield='4.5–5.1%', heroPopulation='26k', heroVacancy='0.8%',
    houseMedian=563000, unitMedian=370000,
    houseRentRange='$475–$505', unitRentRange='$345–$375',
    houseYieldRange='4.4–4.6%', unitYieldRange='4.9–5.3%',
    vacancyRate=0.8, daysOnMarket=46, clearanceRate=55, propertiesListed=185,
    popTotal=26000, popGrowth=0.8, medianAge=41, ownerOccupier=61, employed=58, unemployment=5.5,
    conditions=[
      ('Rental demand',              'High',     76),
      ('Stock on market',            'Low',      28),
      ('Buyer competition',          'Moderate', 58),
      ('Infrastructure pipeline',    'Moderate', 55),
      ('Population growth momentum', 'Low',      38),
    ],
    housePerf=[('1 year', 16.8, 100), ('3 years', 8.0, 80), ('5 years', 9.5, 95), ('10 years', 7.5, 75)],
    unitPerf= [('1 year', 3.2, 32), ('3 years', 6.5, 65), ('5 years', 7.8, 78), ('10 years', 6.0, 60)],
    data_sources=(
      'ABS Regional Population &amp; Census &nbsp;&middot;&nbsp; Infrastructure Australia Pipeline '
      '&nbsp;&middot;&nbsp; Tasmanian Government Major Projects Register &nbsp;&middot;&nbsp; '
      'TT-Line (Spirit of Tasmania) &nbsp;&middot;&nbsp; SQM Research &nbsp;&middot;&nbsp; '
      'CoreLogic / Suburbtrends &nbsp;&middot;&nbsp; Devonport City Council &nbsp;&middot;&nbsp; '
      'Map data &copy; OpenStreetMap contributors'
    ),
  ),

  # ── 12. MELBOURNE ───────────────────────────────────────────────────────────
  dict(
    filename='melbourne.html',
    key='melbourne',
    city='Melbourne',
    state_badge='Victoria',
    subtitle="Australia's cultural capital · Victoria's economic engine · Population 5.2 million",
    loc_stats=[
      ('5.2M',       'Population'),
      ('3rd',        'Most liveable city globally'),
      ('22',         'Local government areas'),
      ('Capital City','of Victoria'),
    ],
    loc_copy=(
      'Melbourne is Australia\'s second-largest city and consistently rated among the world\'s '
      'most liveable. As Victoria\'s economic capital, Melbourne supports a deeply diversified '
      'economy spanning financial services, education, healthcare, technology, manufacturing, '
      'creative industries and one of Australia\'s strongest international tourism and events '
      'sectors. Unlike regional markets, investing in Melbourne requires careful precinct-level '
      'analysis — the city encompasses dramatically different market dynamics across its '
      '22 local government areas.'
    ),
    education=[
      'University of Melbourne, Monash, RMIT + 8 more',
      'Extensive private school network (60+ schools)',
      'TAFE and vocational training network',
      'International student population 200,000+',
    ],
    healthcare=[
      'Royal Melbourne Hospital',
      'Alfred Hospital (major trauma)',
      'Austin Health',
      'Monash Health',
    ],
    retail=[
      'CBD retail precinct and Bourke Street Mall',
      'Chadstone (southern hemisphere\'s largest)',
      'Doncaster and Highpoint shopping centres',
      'Brunswick, Fitzroy &amp; Richmond lifestyle precincts',
    ],
    transport=[
      'Metropolitan train, tram and bus network',
      'Tullamarine Airport (15km from CBD)',
      'West Gate and CityLink freeways',
      'Metro Tunnel (opening 2025)',
    ],
    infra_total='$60B+',
    infra_cards=[
      dict(
        value='$12.6B',
        title='Melbourne Metro Tunnel',
        desc='Transformational cross-city rail tunnel connecting the Cranbourne-Pakenham and Sunbury lines through new underground stations. Opens new growth corridors along the alignment and significantly increases the network\'s peak-hour capacity.',
        status='Opening 2025',
      ),
      dict(
        value='$10.7B+',
        title='West Gate Tunnel',
        desc='New freeway tunnel under the Maribyrnong River linking the Port of Melbourne to the Western Ring Road, reducing truck and commuter pressure on the West Gate Bridge and improving connectivity for Melbourne\'s inner-west precincts.',
        status='Under construction',
      ),
      dict(
        value='$34.5B+',
        title='Suburban Rail Loop (Stage 1)',
        desc="Australia's largest infrastructure project: a new rail loop connecting Melbourne's middle suburbs from Cheltenham to Werribee, serving major employment centres without requiring travel through the CBD — permanently reshaping suburban accessibility.",
        status='Stage 1 under construction',
      ),
    ],
    macro_copy=(
      'Greater Melbourne has one of the world\'s strongest long-term population growth profiles '
      'for a developed-world city, driven by both international and interstate migration. '
      'The University of Melbourne and Monash University alone generate tens of thousands of '
      'international students, creating consistent inner-city rental demand. Melbourne\'s labour '
      'market is diversified across services, knowledge economy, healthcare and education '
      '— providing resilience through economic cycles.'
    ),
    macro_copy_p2=(
      'ABS projections place Greater Melbourne\'s population at 6.5 million by 2036 — '
      'growth that will be partly absorbed by the Suburban Rail Loop\'s corridor development '
      'and partly by continued densification of the inner and middle rings. The infrastructure '
      'pipeline is the single most significant factor in determining which precincts '
      'will outperform over the next decade.'
    ),
    comparable_text=(
      'Melbourne is one of a small group of global cities — comparable in profile to Toronto, '
      'Vienna and Auckland — that combines top-tier liveability, sustained population growth '
      'and significant committed infrastructure investment. Unlike most regional markets in '
      'this report, Melbourne\'s price trajectory is partly benchmarked to global comparable '
      'cities rather than domestic regional comparisons. Past performance is not a guide to future performance.'
    ),
    affordability_text=(
      'At ~$940k median for houses, Melbourne remains materially below Sydney\'s median (~$1.5M) '
      'for a city with comparable global liveability credentials. Interstate migration from '
      'Sydney has historically supported Melbourne\'s demand floor during Sydney market upturns, '
      'and the relative value proposition continues to drive tenant and buyer migration '
      'from the more expensive Sydney market.'
    ),
    investment_intro=(
      'Melbourne is a capital city market with some of the world\'s most significant committed '
      'infrastructure investment. The case here is long-term capital growth and diversification '
      '— not high yield. The right property, in the right precinct, benefits from generational '
      'infrastructure that permanently improves connectivity and liveability for decades.'
    ),
    tags=[
      'Capital city depth and market liquidity',
      'World-class infrastructure investment ($60B+ committed)',
      'International and interstate migration demand',
      'University and hospital structural rental anchors',
      'Long-term capital growth in established precincts',
      'Lifestyle and liveability premium — globally recognised',
    ],
    entry_house='$750k–$1.3M+',
    entry_unit='$480k–$800k+',
    risks=[
      (
        'Lower gross yield',
        "Melbourne's scale and desirability have priced yield down materially. At current "
        'prices, gross yields are among the lowest in this report. This is a capital growth '
        'market, not an income market — investors seeking strong yield should look to other '
        'markets in this report first.',
      ),
      (
        'Entry price and serviceability',
        "Melbourne's median price requires significant equity or borrowing capacity. Rate "
        'sensitivity is higher at this entry point, and periods of rate-driven market softness '
        'can be more pronounced than in lower-priced markets. Financial resilience is important.',
      ),
      (
        'Suburb selection is critical',
        "Melbourne's market is highly heterogeneous. Poor suburb or property selection can "
        'result in underperformance that doesn\'t reflect the broader city trajectory. '
        'Professional guidance is more important in this market than any other in this report '
        '— the infrastructure premium is precinct-specific, not city-wide.',
      ),
    ],
    lukes_p1=(
      'Melbourne is a market where I focus on the long-term infrastructure theme above all else. '
      'The Metro Tunnel, the Suburban Rail Loop and the West Gate Tunnel are not short-term '
      'catalysts — they are generational investments that will reshape which parts of Melbourne '
      'are accessible, and therefore desirable, over the next 20 years. Buying in the right '
      'precinct today means buying ahead of that repricing.'
    ),
    lukes_p2=(
      'The selectivity question in Melbourne is more complex than any other market in this '
      'report. Suburb, street, property type, proximity to the infrastructure corridors — '
      'each of these decisions has a compounding effect over a long hold. This is where '
      'Fairway\'s research adds the most value: identifying the specific pockets where the '
      'price-to-infrastructure-benefit ratio is still compelling, before the market fully '
      'prices in what\'s coming.'
    ),
    map_center=[-37.820, 144.970],
    map_zoom=10,
    map_pts=[
      dict(latlng=[-37.814, 144.963], label='Melbourne CBD',      color='#bd7a70', perm=True),
      dict(latlng=[-37.910, 145.134], label='Monash University',  color='#cf9b92', perm=False),
      dict(latlng=[-37.799, 144.959], label='Royal Melbourne Hosp',color='#cf9b92', perm=False),
      dict(latlng=[-37.668, 144.843], label='Tullamarine Airport',color='#cf9b92', perm=False),
      dict(latlng=[-38.147, 144.360], label='Geelong',            color='#cf9b92', perm=False),
    ],
    map_line=None,
    lga_name='Greater Melbourne',
    heroPrice='~$940k', heroYield='3.0–4.5%', heroPopulation='5.2M', heroVacancy='1.9%',
    houseMedian=940000, unitMedian=617000,
    houseRentRange='$555–$585', unitRentRange='$500–$540',
    houseYieldRange='3.0–3.2%', unitYieldRange='4.2–4.5%',
    vacancyRate=1.9, daysOnMarket=65, clearanceRate=65, propertiesListed=12500,
    popTotal=5200000, popGrowth=2.2, medianAge=37, ownerOccupier=56, employed=65, unemployment=4.0,
    conditions=[
      ('Rental demand',              'High',      75),
      ('Stock on market',            'Moderate',  45),
      ('Buyer competition',          'High',      78),
      ('Infrastructure pipeline',    'Very High', 98),
      ('Population growth momentum', 'Very High', 88),
    ],
    housePerf=[('1 year', 4.4, 44), ('3 years', 3.5, 35), ('5 years', 6.2, 62), ('10 years', 7.8, 78)],
    unitPerf= [('1 year', 3.5, 35), ('3 years', 5.2, 52), ('5 years', 5.8, 58), ('10 years', 5.5, 55)],
    data_sources=(
      'ABS Regional Population &amp; Census &nbsp;&middot;&nbsp; Infrastructure Australia Pipeline '
      '&nbsp;&middot;&nbsp; Victorian Government Major Projects Register &nbsp;&middot;&nbsp; '
      'SQM Research &nbsp;&middot;&nbsp; CoreLogic / Suburbtrends &nbsp;&middot;&nbsp; '
      'City of Melbourne &nbsp;&middot;&nbsp; Map data &copy; OpenStreetMap contributors'
    ),
  ),

]

if __name__ == '__main__':
    os.makedirs(OUT_DIR, exist_ok=True)
    for m in MARKETS:
        html = generate_html(m)
        path = os.path.join(OUT_DIR, m['filename'])
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f'  Generated: reports/{m["filename"]}')
    print(f'\nDone. {len(MARKETS)} files written.')
