#!/usr/bin/env python3
"""Generate area report HTML files — Batch 2: Dubbo, Townsville, Mackay"""

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

  # ── 4. DUBBO ────────────────────────────────────────────────────────────────
  dict(
    filename='dubbo.html',
    key='dubbo',
    city='Dubbo',
    state_badge='New South Wales',
    subtitle='Regional service hub · 400km northwest of Sydney · Gateway to outback NSW',
    loc_stats=[
      ('400km',        'Sydney CBD'),
      ('~5.5hr',       'By road to Sydney'),
      ('~6hr',         'NSW TrainLink XPT'),
      ('Regional Hub', 'For western NSW'),
    ],
    loc_copy=(
      'Dubbo is the principal regional city of western New South Wales, sitting at the junction '
      'of the Mitchell and Newell Highways, 400km northwest of Sydney. It serves as the '
      'administrative, healthcare, retail and transport hub for a vast catchment extending across '
      'central and western NSW. The city\'s hospital, TAFE, university campus and government '
      'services draw workers and residents from a wide surrounding region, creating a stable and '
      'diversified employment base independent of Sydney\'s economic cycles.'
    ),
    education=[
      'Charles Sturt University (campus)',
      'TAFE NSW Dubbo',
      'Dubbo College Senior Campus',
      'Macquarie Anglican Grammar School',
    ],
    healthcare=[
      'Dubbo Base Hospital (major regional, 300+ beds)',
      'Western NSW Local Health District HQ',
      'Calvary Hospital Dubbo',
      'Comprehensive GP and specialist network',
    ],
    retail=[
      'Orana Mall',
      'Dubbo Square Shopping Centre',
      'Macquarie Street dining precinct',
      'Westpoint shopping centre',
    ],
    transport=[
      'Dubbo Airport (Sydney flights daily)',
      'Mitchell Highway (east to Sydney)',
      'Newell Highway (north–south freight)',
      'NSW TrainLink XPT rail service',
    ],
    infra_total='$900M+',
    infra_cards=[
      dict(
        value='$700M+',
        title='Dubbo Base Hospital Redevelopment',
        desc='A major multi-stage redevelopment of Dubbo Base Hospital — the principal health facility for western NSW — expanding surgical, emergency and specialist capacity across a vast regional catchment. A permanent employment anchor for the region.',
        status='Planning approved',
      ),
      dict(
        value='$45M+',
        title='Dubbo Regional Airport Upgrade',
        desc='Terminal expansion and runway improvements to support growing passenger numbers and new airline route potential, improving business and government workforce connectivity to the region.',
        status='Under construction',
      ),
      dict(
        value='$150M+',
        title='Newell Highway Safety Upgrades',
        desc='Targeted safety and capacity improvements along the key freight corridor connecting Dubbo to Melbourne and Brisbane, supporting the region\'s logistics and agricultural economy.',
        status='Active',
      ),
    ],
    macro_copy=(
      'Dubbo serves a vast catchment population of approximately 120,000 people across the '
      'Orana region, making its ~49,000 city population a relatively small footprint of a '
      'much larger service economy. Healthcare, education, agriculture and government are the '
      'primary employers. The city\'s economy has historically shown resilience through economic '
      'downturns due to its essential services role.'
    ),
    macro_copy_p2=(
      'The Western NSW Local Health District headquarters and Dubbo Base Hospital together '
      'represent a stable, government-funded employment base that underpins consistent rental '
      'demand from healthcare professionals relocating to the region.'
    ),
    comparable_text=(
      'Dubbo\'s essential services hub profile — principal hospital, university campus, '
      'government employment, agricultural centre — shares characteristics with markets such as '
      'Wagga Wagga and Orange at similar stages of their infrastructure investment cycles. '
      'Past performance in those markets is not a guide to future performance in Dubbo.'
    ),
    affordability_text=(
      'At ~$430k median, Dubbo offers one of the strongest gross yield profiles of any market '
      'in this report at this price point. The income case is supported by an employment base '
      'that generates consistent rental demand from healthcare, government and professional '
      'workers — tenants who are stable and long-term by nature.'
    ),
    investment_intro=(
      'Dubbo is a market for investors who understand the difference between yield and speculation. '
      'The income case here is genuine — the hospital, government offices and university create '
      'a renter base of essential workers that is as stable as you\'ll find anywhere in Australia.'
    ),
    tags=[
      'High gross yield from day one',
      'Essential services employment anchor',
      'Regional hub with broad catchment demand',
      'Affordable entry, strong income position',
      'Long-term hold for income-focused investors',
      'Uncorrelated to capital city market cycles',
    ],
    entry_house='$360k–$510k+',
    entry_unit='$230k–$320k+',
    risks=[
      (
        'Distance from capital city',
        'Dubbo is not within commuting distance of Sydney, meaning its market is almost entirely '
        'driven by local employment. Any major employer departure or sustained public service '
        'restructuring could affect demand — though essential services have long-term '
        'Commonwealth and State funding commitments.',
      ),
      (
        'Agricultural and commodity sensitivity',
        'A meaningful portion of the regional economy is agriculture-linked. Prolonged drought or '
        'commodity price weakness can reduce agricultural incomes, affecting spending and population '
        'stability in the broader catchment region.',
      ),
      (
        'Limited market liquidity',
        'As a smaller market, Dubbo has lower transaction volumes than capital city or larger '
        'regional markets. Properties can take longer to sell and price discovery is less '
        'efficient — requiring a longer-term hold mindset and realistic exit planning.',
      ),
    ],
    lukes_p1=(
      'Dubbo is a market I approach with genuine appreciation for the income opportunity. '
      'The hospital, government offices and Western NSW Local Health District headquarters create '
      'a renter base of essential workers that pays rent consistently and stays for extended '
      'periods. That\'s the kind of tenant profile that makes income investing work well.'
    ),
    lukes_p2=(
      'What I focus on here is the quality of the asset relative to that tenant profile — '
      'properties that appeal to healthcare and government professionals, not just the broader '
      'rental market. The right property, in a location that serves that cohort, delivers a '
      'very strong income position from day one, with infrastructure-driven capital growth '
      'playing out over the medium term.'
    ),
    map_center=[-32.240, 148.600],
    map_zoom=12,
    map_pts=[
      dict(latlng=[-32.240, 148.600], label='Dubbo CBD',           color='#bd7a70', perm=True),
      dict(latlng=[-32.238, 148.604], label='Dubbo Base Hospital', color='#cf9b92', perm=False),
      dict(latlng=[-32.218, 148.575], label='Dubbo Airport',       color='#cf9b92', perm=False),
    ],
    map_line=None,
    lga_name='Dubbo Regional LGA',
    heroPrice='~$646k', heroYield='4.4–5.9%', heroPopulation='49k', heroVacancy='1.0%',
    houseMedian=646000, unitMedian=350000,
    houseRentRange='$535–$565', unitRentRange='$385–$415',
    houseYieldRange='4.3–4.6%', unitYieldRange='5.7–6.2%',
    vacancyRate=1.0, daysOnMarket=29, clearanceRate=55, propertiesListed=320,
    popTotal=49000, popGrowth=1.4, medianAge=36, ownerOccupier=63, employed=60, unemployment=5.0,
    conditions=[
      ('Rental demand',              'High',     78),
      ('Stock on market',            'Low',      25),
      ('Buyer competition',          'Moderate', 58),
      ('Infrastructure pipeline',    'Moderate', 55),
      ('Population growth momentum', 'Moderate', 58),
    ],
    housePerf=[('1 year', 11.4, 100), ('3 years', 9.2, 92), ('5 years', 10.5, 100), ('10 years', 6.8, 68)],
    unitPerf= [('1 year', 3.8, 38), ('3 years', 7.5, 75), ('5 years', 8.2,  82), ('10 years', 5.5, 55)],
    data_sources=(
      'ABS Regional Population &amp; Census &nbsp;&middot;&nbsp; Infrastructure Australia Pipeline '
      '&nbsp;&middot;&nbsp; NSW Government Major Projects Register &nbsp;&middot;&nbsp; '
      'SQM Research &nbsp;&middot;&nbsp; CoreLogic / Suburbtrends &nbsp;&middot;&nbsp; '
      'Dubbo Regional Council &nbsp;&middot;&nbsp; Map data &copy; OpenStreetMap contributors'
    ),
  ),

  # ── 5. TOWNSVILLE ───────────────────────────────────────────────────────────
  dict(
    filename='townsville.html',
    key='townsville',
    city='Townsville',
    state_badge='Queensland',
    subtitle="North Queensland's economic capital · 1,400km north of Brisbane · Defence, health &amp; university city",
    loc_stats=[
      ('1,400km',  'Brisbane CBD'),
      ('2hr 20min','By air to Brisbane'),
      ('350km',    'Cairns'),
      ('#1',       'Largest city in NQ'),
    ],
    loc_copy=(
      'Townsville is North Queensland\'s largest city and principal economic hub, sitting on '
      'Cleveland Bay between the Coral Sea and the Atherton Tablelands ranges. It is '
      'fundamentally different from most regional markets — Townsville is not a commuter market '
      'for any capital city. Instead, it is a self-contained economy anchored by Australia\'s '
      'largest defence base, a major public university, the region\'s leading hospital and a '
      'growing logistics and export sector. This makes its property market largely insulated '
      'from southern economic cycles.'
    ),
    education=[
      'James Cook University (20,000+ students)',
      'TAFE Queensland North',
      'Townsville Grammar School',
      "Saint Margaret Mary's College",
    ],
    healthcare=[
      'Townsville University Hospital (850+ beds)',
      'Mater Hospital Townsville',
      'Townsville Private Hospital',
      'North Queensland medical network',
    ],
    retail=[
      'Stockland Townsville',
      'The Strand waterfront precinct',
      'Castletown Shopping World',
      'Palmer Street dining strip',
    ],
    transport=[
      'Townsville Airport (Brisbane/Sydney direct)',
      'Port of Townsville (major freight hub)',
      'Bruce Highway connections',
      'Local transit network',
    ],
    infra_total='$3B+',
    infra_cards=[
      dict(
        value='$1.9B+',
        title='Port of Townsville Expansion',
        desc='Major expansion including channel widening, new berths and terminal upgrades to support growing trade volumes across North Queensland. A significant long-term economic anchor for the city and a driver of industrial and logistics employment.',
        status='Stage 1 operational, Stage 2 active',
      ),
      dict(
        value='$500M+',
        title='Defence Housing &amp; Infrastructure Investment',
        desc='Ongoing Commonwealth investment in defence housing, facilities and infrastructure across Lavarack Barracks (Army) and RAAF Base Townsville — supporting one of Australia\'s largest and most stable employment concentrations in any regional city.',
        status='Ongoing',
      ),
      dict(
        value='$600M+',
        title='Townsville City Deal',
        desc='Comprehensive urban renewal, entertainment, tourism and infrastructure investment across the CBD and waterfront precinct, including Queensland Country Bank Stadium and associated commercial and residential development.',
        status='Active',
      ),
    ],
    macro_copy=(
      "Townsville's workforce is dominated by Defence, James Cook University and Townsville "
      'University Hospital — three major institutions that provide structural employment '
      'stability unlike most regional markets. Defence alone employs approximately 6,000 '
      'military personnel in the region, creating a significant and consistent housing demand '
      'from a workforce that rents professionally and moves on predictable cycles.'
    ),
    macro_copy_p2=(
      'Population growth, while modest by southeast Queensland standards, is steady and '
      'employment-anchored. The city\'s demographic profile is young, with a median age of 35, '
      'reflecting the large ADF and university student populations that generate consistent '
      'rental demand at the entry and mid-market level.'
    ),
    comparable_text=(
      'Townsville\'s profile — defence-anchored employment, major port expansion, university '
      'and hospital as economic pillars — is distinct from most regional markets. The closest '
      'comparable in terms of defence employment concentration would be Darwin, with Townsville '
      'offering materially stronger affordability and yield. Past performance in comparable '
      'markets is not a guide to future performance in Townsville.'
    ),
    affordability_text=(
      'At ~$695k median, Townsville offers strong gross yield relative to its city size, '
      'university and hospital employment base. The defence workforce creates consistent, '
      'high-quality rental demand that is largely independent of economic cycles — a '
      'risk-reduction characteristic that is rare in any regional property market.'
    ),
    investment_intro=(
      'Townsville is a market with a fundamentally different risk profile to most regional '
      'investments. The defence and government employment base creates consistent, professional '
      'rental demand that is largely independent of economic cycles — and the infrastructure '
      'pipeline is among the largest of any regional city in Australia.'
    ),
    tags=[
      'Defence-anchored rental demand (structural, reliable)',
      'High gross yield from strong rents',
      'University and hospital employment stability',
      'Major port expansion underpinning economic growth',
      'Affordable entry relative to size and amenity',
      'Long-term hold for income-focused investors',
    ],
    entry_house='$450k–$660k+',
    entry_unit='$240k–$370k+',
    risks=[
      (
        'Defence base reliance',
        'A significant portion of rental demand comes from ADF personnel and contractors. Any '
        'reduction in Townsville\'s defence presence or restructuring of housing arrangements '
        'could materially affect rental demand — though Lavarack Barracks is one of Australia\'s '
        'largest and most strategically important Army bases.',
      ),
      (
        'Cyclone and weather risk',
        'North Queensland is exposed to tropical weather events. Properties require appropriate '
        'insurance and structural resilience. Significant weather events can temporarily displace '
        'residents and affect rental markets — though the well-funded defence and government '
        'tenant base typically provides continuity.',
      ),
      (
        'Economic concentration',
        'Outside of defence, health and education, Townsville\'s private sector economy is '
        'relatively narrow. Growth in these sectors is largely Government-directed and subject '
        'to funding cycles, though both sectors have long-term Commonwealth and State commitments.',
      ),
    ],
    lukes_p1=(
      'Townsville is the strongest pure-income market in our QLD coverage, and the 0.6% vacancy '
      'rate is not a seasonal blip — it reflects a structural imbalance in a city of 200,000 '
      'people anchored by ADF, a major hospital and JCU. Not relying on one employer or '
      'one industry — relying on a city with genuine economic depth.'
    ),
    lukes_p2=(
      'What I focus on for Townsville stock is proximity to the employment anchors. The ADF '
      'barracks, the hospital precinct and JCU each create their own rental catchment of '
      'tenants who stay longer and maintain properties better than the broader market. In a '
      'city where the vacancy rate is already this tight, that quality of demand compounds '
      'meaningfully over a long hold.'
    ),
    map_center=[-19.260, 146.820],
    map_zoom=11,
    map_pts=[
      dict(latlng=[-19.260, 146.820], label='Townsville CBD',             color='#bd7a70', perm=True),
      dict(latlng=[-19.328, 146.767], label='James Cook University',      color='#cf9b92', perm=False),
      dict(latlng=[-19.314, 146.763], label='Townsville University Hosp', color='#cf9b92', perm=False),
      dict(latlng=[-19.248, 146.825], label='Port of Townsville',         color='#cf9b92', perm=False),
      dict(latlng=[-19.280, 146.790], label='Lavarack Barracks',          color='#cf9b92', perm=False),
    ],
    map_line=None,
    lga_name='Townsville LGA',
    heroPrice='~$695k', heroYield='4.0–5.4%', heroPopulation='200k', heroVacancy='0.6%',
    houseMedian=695000, unitMedian=395000,
    houseRentRange='$540–$570', unitRentRange='$380–$415',
    houseYieldRange='4.0–4.3%', unitYieldRange='5.0–5.4%',
    vacancyRate=0.6, daysOnMarket=18, clearanceRate=52, propertiesListed=1050,
    popTotal=200000, popGrowth=1.5, medianAge=35, ownerOccupier=60, employed=61, unemployment=5.2,
    conditions=[
      ('Rental demand',              'High',      76),
      ('Stock on market',            'Moderate',  40),
      ('Buyer competition',          'Moderate',  58),
      ('Infrastructure pipeline',    'Very High', 88),
      ('Population growth momentum', 'Moderate',  62),
    ],
    housePerf=[('1 year', 23.0, 100), ('3 years', 12.2, 100), ('5 years', 9.5, 95), ('10 years', 5.2, 52)],
    unitPerf= [('1 year', 7.0, 70), ('3 years', 10.5, 100), ('5 years', 8.0, 80), ('10 years', 4.2, 42)],
    data_sources=(
      'ABS Regional Population &amp; Census &nbsp;&middot;&nbsp; Infrastructure Australia Pipeline '
      '&nbsp;&middot;&nbsp; Queensland Government Major Projects Register &nbsp;&middot;&nbsp; '
      'Department of Defence &nbsp;&middot;&nbsp; SQM Research &nbsp;&middot;&nbsp; CoreLogic / '
      'Suburbtrends &nbsp;&middot;&nbsp; Townsville City Council &nbsp;&middot;&nbsp; '
      'Map data &copy; OpenStreetMap contributors'
    ),
  ),

  # ── 6. MACKAY ───────────────────────────────────────────────────────────────
  dict(
    filename='mackay.html',
    key='mackay',
    city='Mackay',
    state_badge='Queensland',
    subtitle="Queensland's coal and sugar capital · 970km north of Brisbane · Bowen Basin gateway city",
    loc_stats=[
      ('970km',       'Brisbane CBD'),
      ('1hr 30min',   'By air to Brisbane'),
      ('180km',       'Bowen Basin mines'),
      ('Resource Hub','For central QLD'),
    ],
    loc_copy=(
      'Mackay is the principal city of Central Queensland\'s coastal strip, 970km north of '
      'Brisbane and positioned as the logistics, services and residential hub for the Bowen '
      'Basin — Australia\'s largest coking coal region. The city serves both a significant '
      'mining workforce (many of whom live in Mackay and fly in/fly out to mine sites) and '
      'a substantial local services economy including retail, healthcare, education and '
      'agriculture. The Pioneer Valley sugarcane region surrounds the city, adding '
      'agricultural diversification to the economic base.'
    ),
    education=[
      'CQUniversity Mackay',
      'Mackay Northern Beaches State High',
      'Mackay Christian College',
      "St Patrick's College",
    ],
    healthcare=[
      'Mackay Base Hospital (350+ beds)',
      'Mater Hospital Mackay',
      'Mackay Private Hospital',
      'Northern Queensland medical network',
    ],
    retail=[
      'Caneland Central Shopping Centre',
      'Mount Pleasant Marketplace',
      'Sydney Street retail precinct',
      'Northern Beaches retail hub',
    ],
    transport=[
      'Mackay Airport (Brisbane direct, charter)',
      'Peak Downs Highway (Bowen Basin)',
      'Bruce Highway (north–south)',
      'Port of Mackay',
    ],
    infra_total='$1.2B+',
    infra_cards=[
      dict(
        value='$650M+',
        title='Mackay Base Hospital Redevelopment',
        desc='Major expansion of North Queensland\'s second-largest public hospital, expanding surgical, emergency and specialist capacity across a large central QLD catchment. A significant long-term healthcare employment anchor for the region.',
        status='Planning approved',
      ),
      dict(
        value='$550M+',
        title='Mackay Ring Road Stage 2',
        desc='Completion of the Mackay ring road reducing freight and commuter pressure through the city centre, improving connectivity to mining access routes and Mackay Airport — a key economic enabler for the FIFO workforce corridor.',
        status='Under construction',
      ),
      dict(
        value='Ongoing',
        title='Port of Mackay Expansion',
        desc='Ongoing investment in bulk export facilities supporting the region\'s coal and agricultural export trade — a fundamental economic driver for the Mackay region and the primary reason for the city\'s long-term economic viability.',
        status='Active',
      ),
    ],
    macro_copy=(
      "Mackay's economy is uniquely dual — a resources sector workforce that creates "
      'high-income rental demand (FIFO workers who maintain Mackay as their residential base), '
      'and a services economy that provides a stable local employment base. This combination '
      'historically produces rental markets with above-average yields and manageable vacancy, '
      'though both are sensitive to commodity price cycles.'
    ),
    macro_copy_p2=(
      'The FIFO workforce is a distinct tenant cohort: high income, property-conscious, '
      'and with strong preferences for quality residential accommodation over camp alternatives. '
      'Properties that appeal to this cohort alongside the services economy tenant base '
      'perform strongly through both upswings and moderate commodity downturns.'
    ),
    comparable_text=(
      "Mackay's resources-and-services dual economy shares characteristics with other "
      'Queensland resource corridor markets such as Gladstone at comparable stages of the '
      'commodity cycle. The key differentiator is Mackay\'s size and service economy depth, '
      'which provides a more resilient rental demand floor than pure resource markets. '
      'Past performance is not a guide to future performance.'
    ),
    affordability_text=(
      'At ~$595k median, Mackay offers strong gross yield driven by a workforce with '
      'above-average incomes from the Bowen Basin resources sector. For investors focused '
      'on income, the combination of resilient rents and a resources-driven tenant base '
      'creates an income position that is difficult to replicate in most east-coast markets.'
    ),
    investment_intro=(
      'Mackay is a genuine high-yield market where the income case is supported by a workforce '
      'with above-average incomes and a strong cultural preference for established residential '
      'living over mining camp accommodation. The yield profile at entry is among the strongest '
      'in this report.'
    ),
    tags=[
      'Very high gross yield from mining-income renters',
      'Resources and services economy diversity',
      'Affordable absolute entry price',
      'Long-term hold through commodity cycles',
      'Airport connectivity for FIFO workforce demand',
      'Strong rental demand from professional tenant base',
    ],
    entry_house='$430k–$620k+',
    entry_unit='$250k–$380k+',
    risks=[
      (
        'Commodity price sensitivity',
        "Mackay's economy is meaningfully correlated with coal and commodity prices. A sustained "
        'downturn in the Bowen Basin can reduce FIFO worker numbers, affecting high-end rental '
        'demand. The services economy tenant base provides a demand floor through commodity '
        'cycles, but investors should plan for periods of softness.',
      ),
      (
        'FIFO accommodation alternatives',
        'Some mining employers provide camp accommodation, reducing residential rental demand '
        'from the FIFO workforce. Diversification across the local services tenant base — '
        'healthcare, retail, education — is important for resilient occupancy.',
      ),
      (
        'Cyclone exposure',
        "Central Queensland's coast is cyclone-exposed. Properties require appropriate insurance "
        'and structural resilience, and major weather events can temporarily affect rental market '
        'dynamics. Insurance costs should be factored into yield calculations.',
      ),
    ],
    lukes_p1=(
      'Mackay is a market I approach with eyes open to the commodity cycle. The yield at '
      'current prices reflects a risk premium — and if you believe coal demand is more '
      'durable than the energy transition narrative suggests, the income position here is '
      'genuinely exceptional. Anyone who bought in 2012 and held through 2016 understands '
      'the downside scenario, and that context matters.'
    ),
    lukes_p2=(
      'The way I manage commodity risk in Mackay is through asset selection. Properties that '
      'appeal to healthcare workers and professionals — not exclusively FIFO accommodation — '
      'hold their rental value through downturns because the services economy keeps running '
      'regardless. The right stock in the right part of Mackay is more resilient than the '
      'headline "mining town" label implies.'
    ),
    map_center=[-21.140, 149.190],
    map_zoom=11,
    map_pts=[
      dict(latlng=[-21.140, 149.190], label='Mackay CBD',          color='#bd7a70', perm=True),
      dict(latlng=[-21.155, 149.196], label='Mackay Base Hospital',color='#cf9b92', perm=False),
      dict(latlng=[-21.170, 149.180], label='Mackay Airport',      color='#cf9b92', perm=False),
      dict(latlng=[-21.108, 149.219], label='Port of Mackay',      color='#cf9b92', perm=False),
      dict(latlng=[-21.138, 149.188], label='Caneland Central',    color='#cf9b92', perm=False),
    ],
    map_line=None,
    lga_name='Mackay Regional LGA',
    heroPrice='~$595k', heroYield='5.3–6.5%', heroPopulation='83k', heroVacancy='1.2%',
    houseMedian=595000, unitMedian=400000,
    houseRentRange='$600–$640', unitRentRange='$465–$500',
    houseYieldRange='5.3–5.6%', unitYieldRange='6.0–6.5%',
    vacancyRate=1.2, daysOnMarket=32, clearanceRate=48, propertiesListed=520,
    popTotal=83000, popGrowth=1.0, medianAge=34, ownerOccupier=60, employed=64, unemployment=4.8,
    conditions=[
      ('Rental demand',              'High',     74),
      ('Stock on market',            'Moderate', 38),
      ('Buyer competition',          'Moderate', 55),
      ('Infrastructure pipeline',    'High',     72),
      ('Population growth momentum', 'Moderate', 52),
    ],
    housePerf=[('1 year', 15.1, 100), ('3 years', 13.5, 100), ('5 years', 8.8, 88), ('10 years', 4.5, 45)],
    unitPerf= [('1 year', 8.0, 80), ('3 years', 12.0, 100), ('5 years', 7.5, 75), ('10 years', 3.8, 38)],
    data_sources=(
      'ABS Regional Population &amp; Census &nbsp;&middot;&nbsp; Infrastructure Australia Pipeline '
      '&nbsp;&middot;&nbsp; Queensland Government Major Projects Register &nbsp;&middot;&nbsp; '
      'SQM Research &nbsp;&middot;&nbsp; CoreLogic / Suburbtrends &nbsp;&middot;&nbsp; '
      'Mackay Regional Council &nbsp;&middot;&nbsp; Map data &copy; OpenStreetMap contributors'
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
